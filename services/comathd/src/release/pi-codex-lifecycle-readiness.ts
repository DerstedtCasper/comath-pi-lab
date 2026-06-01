import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { assertPathAllowed } from "../security/path-policy.js";
import { canonicalJson } from "../verification/runner-contracts.js";

export type PiCodexLifecycleInstallSessionEvidence = {
  session_kind:
    | "phase45_local_fake_pi_http_e2e"
    | "real_pi_host_manual_install"
    | "real_pi_host_automated_install"
    | "unknown";
  pi_host_kind: "fake_pi_host" | "real_pi_host" | "unknown";
  runtime_entrypoint_imported: boolean;
  runtime_registered: boolean;
  host_confirmation_observed: boolean;
  comathd_server_kind: "ephemeral_test_http_server" | "durable_service" | "manual_shell" | "unknown";
  service_start_observed: boolean;
  service_stop_observed: boolean;
  service_restart_observed: boolean;
};

export type PiCodexLifecycleCodexEvidence = {
  installed_cli_validation_ok: boolean;
  installed_cli_probe_source: "service_owned_process" | "injected_fake_cli" | "not_run";
  codex_api_account_network_validation: "passed" | "not_run" | "injected_fake" | "blocked_missing_credentials";
};

export type PiCodexLifecycleReadinessInput = {
  project_id: string;
  review_id?: string;
  actor: string;
  install_session_evidence?: PiCodexLifecycleInstallSessionEvidence;
  codex_evidence?: PiCodexLifecycleCodexEvidence;
};

export type PiCodexLifecycleReadinessCheck = {
  ok: boolean;
  required: true;
  observed: string;
};

export type PiCodexLifecycleReadinessVeto = {
  code: string;
  message: string;
};

export type PiCodexLifecycleReadinessReview = {
  schema_version: "comath.pi_codex_lifecycle_readiness.v1";
  review_id: string;
  project_id: string;
  created_at: string;
  ok: boolean;
  readiness_status: "ready_for_real_host_lifecycle_release_review" | "blocked_missing_real_host_lifecycle_validation";
  review_path: string;
  inputs: {
    install_session_evidence: PiCodexLifecycleInstallSessionEvidence;
    codex_evidence: PiCodexLifecycleCodexEvidence;
  };
  checks: {
    real_pi_host_runtime: PiCodexLifecycleReadinessCheck;
    durable_comathd_service_lifecycle: PiCodexLifecycleReadinessCheck;
    production_codex_validation: PiCodexLifecycleReadinessCheck;
  };
  vetoes: PiCodexLifecycleReadinessVeto[];
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
};

export type PiCodexLifecycleEvidenceArtifactKind =
  | "pi_install_transcript"
  | "runtime_registration_snapshot"
  | "durable_service_lifecycle_log"
  | "codex_validation_report";

export type PiCodexLifecycleEvidenceArtifact = {
  kind: PiCodexLifecycleEvidenceArtifactKind;
  path: string;
  sha256: string;
  size_bytes: number;
};

export type PiCodexLifecycleEvidenceInput = {
  project_id: string;
  evidence_id?: string;
  actor: string;
  install_session_evidence: PiCodexLifecycleInstallSessionEvidence;
  codex_evidence: PiCodexLifecycleCodexEvidence;
  artifact_paths: {
    pi_install_transcript_path: string;
    runtime_registration_snapshot_path: string;
    service_lifecycle_log_path: string;
    codex_validation_report_path: string;
  };
};

export type PiCodexLifecycleEvidenceBundle = {
  schema_version: "comath.pi_codex_lifecycle_evidence.v1";
  evidence_id: string;
  project_id: string;
  created_at: string;
  collection_status: "evidence_ready_for_readiness_review" | "blocked_missing_real_host_lifecycle_evidence";
  evidence_path: string;
  artifacts: PiCodexLifecycleEvidenceArtifact[];
  readiness_input: {
    project_id: string;
    install_session_evidence: PiCodexLifecycleInstallSessionEvidence;
    codex_evidence: PiCodexLifecycleCodexEvidence;
  };
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
};

const defaultInstallSessionEvidence: PiCodexLifecycleInstallSessionEvidence = {
  session_kind: "unknown",
  pi_host_kind: "unknown",
  runtime_entrypoint_imported: false,
  runtime_registered: false,
  host_confirmation_observed: false,
  comathd_server_kind: "unknown",
  service_start_observed: false,
  service_stop_observed: false,
  service_restart_observed: false
};

const defaultCodexEvidence: PiCodexLifecycleCodexEvidence = {
  installed_cli_validation_ok: false,
  installed_cli_probe_source: "not_run",
  codex_api_account_network_validation: "not_run"
};

function normalizeRelativePath(value: string): string {
  return value.replace(/\\/g, "/");
}

function sha256Bytes(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function assertReviewId(value: string | undefined): string {
  const reviewId = value ?? `LIFE-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
  if (!/^[A-Za-z0-9._-]+$/.test(reviewId)) {
    throw new ComathError("invalid Pi/Codex lifecycle review id", {
      statusCode: 400,
      code: "PI_CODEX_LIFECYCLE_REVIEW_INVALID_ID"
    });
  }
  return reviewId;
}

function assertEvidenceId(value: string | undefined): string {
  const evidenceId = value ?? `LIFE-EVID-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
  if (!/^[A-Za-z0-9._-]+$/.test(evidenceId)) {
    throw new ComathError("invalid Pi/Codex lifecycle evidence id", {
      statusCode: 400,
      code: "PI_CODEX_LIFECYCLE_EVIDENCE_INVALID_ID"
    });
  }
  return evidenceId;
}

function projectRelativePath(projectRoot: string, absolutePath: string): string {
  return normalizeRelativePath(relative(resolve(projectRoot), absolutePath));
}

function readLifecycleArtifact(
  projectRoot: string,
  kind: PiCodexLifecycleEvidenceArtifactKind,
  path: string
): PiCodexLifecycleEvidenceArtifact {
  const absolutePath = assertPathAllowed(projectRoot, path, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath)) {
    throw new ComathError("PI_CODEX_LIFECYCLE_EVIDENCE_ARTIFACT_MISSING", {
      statusCode: 400,
      code: "PI_CODEX_LIFECYCLE_EVIDENCE_ARTIFACT_MISSING"
    });
  }
  if (!statSync(absolutePath).isFile()) {
    throw new ComathError("PI_CODEX_LIFECYCLE_EVIDENCE_ARTIFACT_NOT_FILE", {
      statusCode: 400,
      code: "PI_CODEX_LIFECYCLE_EVIDENCE_ARTIFACT_NOT_FILE"
    });
  }
  const content = readFileSync(absolutePath);
  return {
    kind,
    path: projectRelativePath(projectRoot, absolutePath),
    sha256: sha256Bytes(content),
    size_bytes: content.byteLength
  };
}

function pushVeto(vetoes: PiCodexLifecycleReadinessVeto[], code: string, message: string): void {
  vetoes.push({ code, message });
}

function buildChecks(
  installSession: PiCodexLifecycleInstallSessionEvidence,
  codex: PiCodexLifecycleCodexEvidence
): PiCodexLifecycleReadinessReview["checks"] {
  const realPiHostRuntime =
    installSession.pi_host_kind === "real_pi_host" &&
    installSession.runtime_entrypoint_imported &&
    installSession.runtime_registered &&
    installSession.host_confirmation_observed;
  const durableLifecycle =
    installSession.comathd_server_kind === "durable_service" &&
    installSession.service_start_observed &&
    installSession.service_stop_observed &&
    installSession.service_restart_observed;
  const productionCodexValidation =
    codex.installed_cli_validation_ok &&
    codex.installed_cli_probe_source === "service_owned_process" &&
    codex.codex_api_account_network_validation === "passed";

  return {
    real_pi_host_runtime: {
      ok: realPiHostRuntime,
      required: true,
      observed: installSession.pi_host_kind
    },
    durable_comathd_service_lifecycle: {
      ok: durableLifecycle,
      required: true,
      observed: installSession.comathd_server_kind
    },
    production_codex_validation: {
      ok: productionCodexValidation,
      required: true,
      observed: codex.codex_api_account_network_validation
    }
  };
}

function buildVetoes(
  checks: PiCodexLifecycleReadinessReview["checks"],
  codex: PiCodexLifecycleCodexEvidence
): PiCodexLifecycleReadinessVeto[] {
  const vetoes: PiCodexLifecycleReadinessVeto[] = [];
  if (!checks.real_pi_host_runtime.ok) {
    pushVeto(
      vetoes,
      "real_pi_host_validation_missing",
      "Phase45 fake-host install-session evidence is not real Pi host validation."
    );
  }
  if (!checks.durable_comathd_service_lifecycle.ok) {
    pushVeto(
      vetoes,
      "durable_comathd_service_lifecycle_missing",
      "Ephemeral HTTP install sessions do not prove durable comathd service start, stop, and restart lifecycle readiness."
    );
  }
  if (!codex.installed_cli_validation_ok || codex.installed_cli_probe_source !== "service_owned_process") {
    pushVeto(
      vetoes,
      "installed_codex_cli_service_probe_missing",
      "Installed Codex CLI readiness requires a service-owned non-injected validation probe."
    );
  }
  if (!checks.production_codex_validation.ok) {
    pushVeto(
      vetoes,
      "production_codex_account_network_validation_missing",
      "Production Codex account and network validation has not passed."
    );
  }
  return vetoes;
}

export function collectPiCodexLifecycleEvidence(
  projectRoot: string,
  input: PiCodexLifecycleEvidenceInput
): PiCodexLifecycleEvidenceBundle {
  const evidenceId = assertEvidenceId(input.evidence_id);
  const artifacts: PiCodexLifecycleEvidenceArtifact[] = [
    readLifecycleArtifact(projectRoot, "pi_install_transcript", input.artifact_paths.pi_install_transcript_path),
    readLifecycleArtifact(
      projectRoot,
      "runtime_registration_snapshot",
      input.artifact_paths.runtime_registration_snapshot_path
    ),
    readLifecycleArtifact(projectRoot, "durable_service_lifecycle_log", input.artifact_paths.service_lifecycle_log_path),
    readLifecycleArtifact(projectRoot, "codex_validation_report", input.artifact_paths.codex_validation_report_path)
  ];
  const checks = buildChecks(input.install_session_evidence, input.codex_evidence);
  const collectionStatus =
    checks.real_pi_host_runtime.ok && checks.durable_comathd_service_lifecycle.ok && checks.production_codex_validation.ok
      ? "evidence_ready_for_readiness_review"
      : "blocked_missing_real_host_lifecycle_evidence";
  const evidencePath = normalizeRelativePath(join(".comath", "release", "pi-codex-lifecycle", evidenceId, "evidence.json"));
  const bundle: PiCodexLifecycleEvidenceBundle = {
    schema_version: "comath.pi_codex_lifecycle_evidence.v1",
    evidence_id: evidenceId,
    project_id: input.project_id,
    created_at: new Date().toISOString(),
    collection_status: collectionStatus,
    evidence_path: evidencePath,
    artifacts,
    readiness_input: {
      project_id: input.project_id,
      install_session_evidence: input.install_session_evidence,
      codex_evidence: input.codex_evidence
    },
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  };

  const absoluteEvidencePath = assertPathAllowed(projectRoot, evidencePath, { purpose: "runtime-write" });
  mkdirSync(dirname(absoluteEvidencePath), { recursive: true });
  writeFileSync(absoluteEvidencePath, canonicalJson(bundle), "utf8");
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "release.pi_codex_lifecycle_evidence_collected",
    actor: input.actor,
    target_id: input.project_id,
    payload: {
      evidence_id: evidenceId,
      collection_status: collectionStatus,
      evidence_path: evidencePath,
      artifact_kinds: artifacts.map((artifact) => artifact.kind),
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  });
  return bundle;
}

export function reviewPiCodexLifecycleReadiness(
  projectRoot: string,
  input: PiCodexLifecycleReadinessInput
): PiCodexLifecycleReadinessReview {
  const reviewId = assertReviewId(input.review_id);
  const installSession = {
    ...defaultInstallSessionEvidence,
    ...(input.install_session_evidence ?? {})
  };
  const codex = {
    ...defaultCodexEvidence,
    ...(input.codex_evidence ?? {})
  };
  const checks = buildChecks(installSession, codex);
  const vetoes = buildVetoes(checks, codex);
  const ok = vetoes.length === 0;
  const reviewPath = normalizeRelativePath(join(".comath", "release", "pi-codex-lifecycle", reviewId, "review.json"));
  const review: PiCodexLifecycleReadinessReview = {
    schema_version: "comath.pi_codex_lifecycle_readiness.v1",
    review_id: reviewId,
    project_id: input.project_id,
    created_at: new Date().toISOString(),
    ok,
    readiness_status: ok
      ? "ready_for_real_host_lifecycle_release_review"
      : "blocked_missing_real_host_lifecycle_validation",
    review_path: reviewPath,
    inputs: {
      install_session_evidence: installSession,
      codex_evidence: codex
    },
    checks,
    vetoes,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  };

  const absoluteReviewPath = assertPathAllowed(projectRoot, reviewPath, { purpose: "runtime-write" });
  mkdirSync(dirname(absoluteReviewPath), { recursive: true });
  writeFileSync(absoluteReviewPath, canonicalJson(review), "utf8");
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "release.pi_codex_lifecycle_readiness_reviewed",
    actor: input.actor,
    target_id: input.project_id,
    payload: {
      review_id: reviewId,
      ok,
      readiness_status: review.readiness_status,
      veto_codes: vetoes.map((veto) => veto.code),
      review_path: reviewPath,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  });
  return review;
}
