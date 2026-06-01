import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
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
