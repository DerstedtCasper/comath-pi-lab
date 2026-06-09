import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { assertPathAllowed } from "../security/path-policy.js";

type ArtifactReference = {
  kind: string;
  path: string;
  sha256: string;
  size_bytes: number;
};

type GaCertificateBody = {
  schema_version?: unknown;
  ga_certificate_id?: unknown;
  project_id?: unknown;
  ok?: unknown;
  ga_certification_status?: unknown;
  ga_certificate_path?: unknown;
  ga_certificate_artifact?: unknown;
  requested_certificate_mode?: unknown;
  ga_certification_review_id?: unknown;
  ga_certification_review_path?: unknown;
  ga_certification_review_artifact?: unknown;
  ga_certification_review_current?: unknown;
  final_ga_audit_id?: unknown;
  final_ga_audit_path?: unknown;
  final_ga_audit_artifact?: unknown;
  final_ga_audit_current?: unknown;
  final_ga_audit_passed?: unknown;
  ga_certificate_available?: unknown;
  proof_authority?: unknown;
  can_promote_claim?: unknown;
  can_certify_ga?: unknown;
  claim_promotion_requires_ordinary_gate?: unknown;
};

type CertificationReviewBody = {
  schema_version?: unknown;
  ga_certification_review_id?: unknown;
  project_id?: unknown;
  ok?: unknown;
  ga_certification_status?: unknown;
  ga_certification_review_path?: unknown;
  ga_certification_review_artifact?: unknown;
  requested_review_mode?: unknown;
  blocker_reasons?: unknown;
  operational_readiness_review_id?: unknown;
  operational_readiness_review_path?: unknown;
  operational_readiness_review_artifact?: unknown;
  operational_readiness_review_current?: unknown;
  operational_readiness_status?: unknown;
  final_ga_audit_available?: unknown;
  final_ga_audit_id?: unknown;
  final_ga_audit_path?: unknown;
  final_ga_audit_artifact?: unknown;
  final_ga_audit_current?: unknown;
  final_ga_audit_passed?: unknown;
  ga_certificate_available?: unknown;
  proof_authority?: unknown;
  can_promote_claim?: unknown;
  can_certify_ga?: unknown;
  ga_certification_gate_separate?: unknown;
};

type FinalGaAuditBody = {
  schema_version?: unknown;
  final_ga_audit_id?: unknown;
  project_id?: unknown;
  ok?: unknown;
  final_ga_audit_status?: unknown;
  final_ga_audit_path?: unknown;
  final_ga_audit_artifact?: unknown;
  requested_audit_mode?: unknown;
  blocker_reasons?: unknown;
  operational_readiness_review_id?: unknown;
  operational_readiness_review_path?: unknown;
  operational_readiness_review_artifact?: unknown;
  operational_readiness_review_current?: unknown;
  proof_breadth_status?: unknown;
  proof_breadth_blocker_code?: unknown;
  proof_breadth_closure_id?: unknown;
  proof_breadth_closure_path?: unknown;
  proof_breadth_closure_artifact?: unknown;
  proof_breadth_closure_current?: unknown;
  final_ga_audit_available?: unknown;
  final_ga_audit_passed?: unknown;
  ga_certificate_available?: unknown;
  proof_authority?: unknown;
  can_promote_claim?: unknown;
  can_certify_ga?: unknown;
  ga_certification_gate_separate?: unknown;
};

type ProofBreadthClosureBody = {
  schema_version?: unknown;
  proof_breadth_closure_id?: unknown;
  project_id?: unknown;
  ok?: unknown;
  proof_breadth_status?: unknown;
  proof_breadth_closure_path?: unknown;
  proof_breadth_closure_artifact?: unknown;
  requested_closure_mode?: unknown;
  blocker_reasons?: unknown;
  total_required_tasks?: unknown;
  task_manifest_count?: unknown;
  verified_task_count?: unknown;
  missing_task_count?: unknown;
  blocked_task_count?: unknown;
  missing_task_ids?: unknown;
  blocked_task_ids?: unknown;
  packaging_report_artifacts?: unknown;
  proof_breadth_complete?: unknown;
  final_ga_audit_unblocked?: unknown;
  proof_authority?: unknown;
  can_promote_claim?: unknown;
  can_certify_ga?: unknown;
  ga_certification_gate_separate?: unknown;
};

type OperationalReadinessReviewBody = {
  schema_version?: unknown;
  operational_readiness_review_id?: unknown;
  project_id?: unknown;
  ok?: unknown;
  operational_readiness_status?: unknown;
  operational_readiness_review_path?: unknown;
  operational_readiness_review_artifact?: unknown;
  requested_review_mode?: unknown;
  blocker_reasons?: unknown;
  transport_closure_review_id?: unknown;
  transport_closure_review_status?: unknown;
  transport_closure_review_path?: unknown;
  transport_closure_review_artifact?: unknown;
  transport_closure_review_current?: unknown;
  terminal_unattended_completion_certified?: unknown;
  completion_certificate_available?: unknown;
  unattended_real_host_execution_completed?: unknown;
  maintained_transport_primitive_bound?: unknown;
  service_transport_primitive?: unknown;
  client_transport_primitive?: unknown;
  durable_transport_provided?: unknown;
  live_transport_open?: unknown;
  adapter_os_isolation_review_id?: unknown;
  adapter_os_isolation_review_path?: unknown;
  adapter_os_isolation_review_artifact?: unknown;
  adapter_os_isolation_review_current?: unknown;
  adapter_id?: unknown;
  adapter_backend?: unknown;
  adapter_os_isolation_status?: unknown;
  adapter_os_enforced?: unknown;
  adapter_os_isolation_required_for_ga?: unknown;
  adapter_production_helper_source_bound?: unknown;
  adapter_helper_profile_source?: unknown;
  adapter_production_helper_configured?: unknown;
  adapter_bundled_protocol_asset?: unknown;
  proof_authority?: unknown;
  can_promote_claim?: unknown;
  can_certify_ga?: unknown;
  ga_certification_gate_separate?: unknown;
};

export type Goal3GaCertificateConsumptionReviewInput = {
  project_id: string;
  ga_certificate_consumption_review_id?: string;
  actor?: string;
  ga_certificate_id: string;
  ga_certificate_path: string;
  ga_certificate_sha256: string;
  requested_consumption_mode?: "open_formal_workbench_ga_certificate_source_bound_consumption";
};

export type Goal3GaCertificateConsumptionReview = {
  schema_version: "comath.goal3_ga_certificate_consumption_review.v1";
  ga_certificate_consumption_review_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  ok: true;
  release_closure_status: "publishable_workbench_release_candidate_source_bound";
  ga_certificate_consumption_review_path: string;
  requested_consumption_mode: "open_formal_workbench_ga_certificate_source_bound_consumption";
  ga_certificate_id: string;
  ga_certificate_path: string;
  ga_certificate_artifact: ArtifactReference;
  ga_certificate_current: true;
  ga_certificate_consumed: true;
  ga_certification_review_id: string;
  ga_certification_review_path: string;
  ga_certification_review_artifact: ArtifactReference;
  ga_certification_review_current: true;
  final_ga_audit_id: string;
  final_ga_audit_path: string;
  final_ga_audit_artifact: ArtifactReference;
  final_ga_audit_current: true;
  final_ga_audit_passed: true;
  proof_breadth_closure_id: string;
  proof_breadth_closure_path: string;
  proof_breadth_closure_artifact: ArtifactReference;
  proof_breadth_closure_current: true;
  proof_breadth_complete: true;
  operational_readiness_review_id: string;
  operational_readiness_review_path: string;
  operational_readiness_review_artifact: ArtifactReference;
  operational_readiness_review_current: true;
  operational_readiness_status: "ready_for_ga_release_candidate_review";
  adapter_production_helper_source_bound: true;
  adapter_helper_profile_source: "operator_configured_provider_helper";
  adapter_production_helper_configured: true;
  adapter_bundled_protocol_asset: false;
  ga_certificate_available: true;
  proof_authority: "lean_kernel_clean_replay";
  can_promote_claim: false;
  can_certify_ga: true;
  claim_promotion_requires_ordinary_gate: true;
  ga_certificate_consumption_review_artifact: ArtifactReference;
};

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function consumptionReviewPath(reviewId: string): string {
  return normalizeRelativePath(join(".comath", "release", "goal3-ga-certificate-consumption", reviewId, "consumption-review.json"));
}

function certificatePath(certificateId: string): string {
  return normalizeRelativePath(join(".comath", "release", "goal3-ga-certificate", certificateId, "certificate.json"));
}

function certificationReviewPath(reviewId: string): string {
  return normalizeRelativePath(join(".comath", "release", "goal3-ga-certification", reviewId, "review.json"));
}

function finalGaAuditPath(auditId: string): string {
  return normalizeRelativePath(join(".comath", "release", "goal3-final-ga-audit", auditId, "audit.json"));
}

function proofBreadthClosurePath(closureId: string): string {
  return normalizeRelativePath(join(".comath", "release", "goal3-proof-breadth-closure", closureId, "closure.json"));
}

function operationalReadinessReviewPath(reviewId: string): string {
  return normalizeRelativePath(join(".comath", "release", "goal3-ga-operational-readiness", reviewId, "review.json"));
}

function transportClosureReviewPath(reviewId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "pi-codex-lifecycle", reviewId, "operator-service-transport-closure-review.json")
  );
}

function adapterOsIsolationReviewPath(reviewId: string): string {
  return normalizeRelativePath(join(".comath", "release", "agent-adapter-os-isolation", reviewId, "review.json"));
}

function sha256Bytes(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function sha256Text(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function assertSafeId(value: string | undefined, label: string): string {
  const id = typeof value === "string" ? value.trim() : "";
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,120}$/u.test(id)) {
    throw new ComathError(`${label} is invalid`, {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATE_CONSUMPTION_INVALID_ID"
    });
  }
  return id;
}

function assertSha256(value: string | undefined): string {
  const sha256 = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-f0-9]{64}$/u.test(sha256)) {
    throw new ComathError("Goal 3 GA certificate consumption referenced artifact hash is stale", {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATE_CONSUMPTION_STALE"
    });
  }
  return sha256;
}

function sanitizeActor(value: string | undefined): string {
  return (value ?? "goal3-ga-certificate-consumption")
    .replace(/(?:[A-Za-z]:[\\/][^\s"']+|\\\\[^\s"']+)/gu, "[redacted-path]")
    .replace(/(?:Authorization:\s*Bearer\s+\S+|api_key=\S+|token=\S+|sk-[A-Za-z0-9_-]+)/giu, "[redacted-secret]")
    .replace(
      /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|kernel_checked|proof_success|can_promote_claim\s*[:=]\s*(?:true|1))\b/giu,
      "[redacted-authority-claim]"
    )
    .slice(0, 400);
}

function artifactReference(value: unknown, label: string, expectedKind: string, expectedPath: unknown): ArtifactReference {
  const record = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const path = typeof record.path === "string" ? normalizeRelativePath(record.path) : "";
  const sizeBytes = record.size_bytes;
  if (
    record.kind !== expectedKind ||
    path !== (typeof expectedPath === "string" ? normalizeRelativePath(expectedPath) : "") ||
    !path.startsWith(".comath/") ||
    typeof record.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(record.sha256) ||
    typeof sizeBytes !== "number" ||
    !Number.isSafeInteger(sizeBytes) ||
    sizeBytes <= 0
  ) {
    throw new ComathError(`Goal 3 GA certificate consumption ${label} reference is invalid`, {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATE_CONSUMPTION_INVALID"
    });
  }
  return {
    kind: record.kind,
    path,
    sha256: record.sha256,
    size_bytes: sizeBytes
  };
}

function readJsonArtifact<T>(
  projectRoot: string,
  canonicalPath: string,
  expectedSha256: string,
  kind: string,
  expectedSizeBytes?: number
): { body: T; artifact: ArtifactReference } {
  const absolutePath = assertPathAllowed(projectRoot, canonicalPath, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new ComathError("Goal 3 GA certificate consumption referenced artifact is stale", {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATE_CONSUMPTION_STALE"
    });
  }
  const content = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(content);
  if (actualSha256 !== assertSha256(expectedSha256)) {
    throw new ComathError("Goal 3 GA certificate consumption referenced artifact hash is stale", {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATE_CONSUMPTION_STALE"
    });
  }
  if (expectedSizeBytes !== undefined && content.byteLength !== expectedSizeBytes) {
    throw new ComathError("Goal 3 GA certificate consumption referenced artifact size is stale", {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATE_CONSUMPTION_STALE"
    });
  }
  try {
    return {
      body: JSON.parse(content.toString("utf8")) as T,
      artifact: {
        kind,
        path: canonicalPath,
        sha256: actualSha256,
        size_bytes: content.byteLength
      }
    };
  } catch {
    throw new ComathError("Goal 3 GA certificate consumption referenced JSON is invalid", {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATE_CONSUMPTION_INVALID"
    });
  }
}

function assertGaCertificate(
  body: GaCertificateBody,
  projectId: string,
  certificateId: string,
  canonicalPath: string
): { reviewId: string; reviewArtifact: ArtifactReference; finalAuditId: string; finalAuditArtifact: ArtifactReference } {
  if (
    body.schema_version !== "comath.goal3_ga_certificate.v1" ||
    body.ga_certificate_id !== certificateId ||
    body.project_id !== projectId ||
    body.ga_certificate_path !== canonicalPath ||
    body.ga_certificate_artifact !== undefined ||
    body.requested_certificate_mode !== "open_formal_workbench_ga_certificate" ||
    body.ok !== true ||
    body.ga_certification_status !== "ga_release_candidate_certified" ||
    body.ga_certification_review_current !== true ||
    typeof body.ga_certification_review_id !== "string" ||
    typeof body.ga_certification_review_path !== "string" ||
    body.final_ga_audit_current !== true ||
    typeof body.final_ga_audit_id !== "string" ||
    typeof body.final_ga_audit_path !== "string" ||
    body.final_ga_audit_passed !== true ||
    body.ga_certificate_available !== true ||
    body.proof_authority !== "lean_kernel_clean_replay" ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== true ||
    body.claim_promotion_requires_ordinary_gate !== true
  ) {
    throw new ComathError("Goal 3 GA certificate consumption certificate is not consumable", {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATE_CONSUMPTION_INVALID"
    });
  }
  const reviewId = assertSafeId(body.ga_certification_review_id, "ga_certification_review_id");
  const canonicalReviewPath = certificationReviewPath(reviewId);
  if (normalizeRelativePath(body.ga_certification_review_path) !== canonicalReviewPath) {
    throw new ComathError("Goal 3 GA certificate consumption certification-review path is not canonical", {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATE_CONSUMPTION_INVALID"
    });
  }
  const finalAuditId = assertSafeId(body.final_ga_audit_id, "final_ga_audit_id");
  const canonicalFinalAuditPath = finalGaAuditPath(finalAuditId);
  if (normalizeRelativePath(body.final_ga_audit_path) !== canonicalFinalAuditPath) {
    throw new ComathError("Goal 3 GA certificate consumption final-audit path is not canonical", {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATE_CONSUMPTION_INVALID"
    });
  }
  return {
    reviewId,
    reviewArtifact: artifactReference(
      body.ga_certification_review_artifact,
      "certification-review",
      "goal3_ga_certification_review",
      canonicalReviewPath
    ),
    finalAuditId,
    finalAuditArtifact: artifactReference(
      body.final_ga_audit_artifact,
      "final-audit",
      "goal3_final_ga_audit",
      canonicalFinalAuditPath
    )
  };
}

function assertCertificationReview(
  body: CertificationReviewBody,
  projectId: string,
  reviewId: string,
  artifact: ArtifactReference,
  finalAuditId: string,
  finalAuditArtifact: ArtifactReference
): { operationalId: string; operationalArtifact: ArtifactReference } {
  const blockers = Array.isArray(body.blocker_reasons) ? body.blocker_reasons : [];
  if (
    body.schema_version !== "comath.goal3_ga_certification_review.v1" ||
    body.ga_certification_review_id !== reviewId ||
    body.project_id !== projectId ||
    body.ga_certification_review_path !== artifact.path ||
    body.ga_certification_review_artifact !== undefined ||
    body.requested_review_mode !== "open_formal_workbench_ga_certification" ||
    body.ok !== true ||
    body.ga_certification_status !== "ready_for_ga_certificate_gate" ||
    blockers.length !== 0 ||
    body.operational_readiness_review_current !== true ||
    typeof body.operational_readiness_review_id !== "string" ||
    typeof body.operational_readiness_review_path !== "string" ||
    body.operational_readiness_status !== "ready_for_ga_release_candidate_review" ||
    body.final_ga_audit_available !== true ||
    body.final_ga_audit_id !== finalAuditId ||
    body.final_ga_audit_path !== finalAuditArtifact.path ||
    body.final_ga_audit_current !== true ||
    body.final_ga_audit_passed !== true ||
    body.ga_certificate_available !== false ||
    body.proof_authority !== "lean_kernel_clean_replay" ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    body.ga_certification_gate_separate !== true
  ) {
    throw new ComathError("Goal 3 GA certificate consumption certification review is not source-bound", {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATE_CONSUMPTION_INVALID"
    });
  }
  const reviewFinalAuditArtifact = artifactReference(
    body.final_ga_audit_artifact,
    "review final-audit",
    "goal3_final_ga_audit",
    finalAuditArtifact.path
  );
  if (
    reviewFinalAuditArtifact.sha256 !== finalAuditArtifact.sha256 ||
    reviewFinalAuditArtifact.size_bytes !== finalAuditArtifact.size_bytes
  ) {
    throw new ComathError("Goal 3 GA certificate consumption final-audit reference is mixed", {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATE_CONSUMPTION_INVALID"
    });
  }
  const operationalId = assertSafeId(body.operational_readiness_review_id, "operational_readiness_review_id");
  const canonicalOperationalPath = operationalReadinessReviewPath(operationalId);
  if (normalizeRelativePath(body.operational_readiness_review_path) !== canonicalOperationalPath) {
    throw new ComathError("Goal 3 GA certificate consumption operational-readiness path is not canonical", {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATE_CONSUMPTION_INVALID"
    });
  }
  return {
    operationalId,
    operationalArtifact: artifactReference(
      body.operational_readiness_review_artifact,
      "operational-readiness",
      "goal3_ga_operational_readiness_review",
      canonicalOperationalPath
    )
  };
}

function assertFinalGaAudit(
  body: FinalGaAuditBody,
  projectId: string,
  auditId: string,
  artifact: ArtifactReference,
  operationalId: string,
  operationalArtifact: ArtifactReference
): { closureId: string; closureArtifact: ArtifactReference } {
  const blockers = Array.isArray(body.blocker_reasons) ? body.blocker_reasons : [];
  if (
    body.schema_version !== "comath.goal3_final_ga_audit.v1" ||
    body.final_ga_audit_id !== auditId ||
    body.project_id !== projectId ||
    body.final_ga_audit_path !== artifact.path ||
    body.final_ga_audit_artifact !== undefined ||
    body.requested_audit_mode !== "open_formal_workbench_final_ga_audit" ||
    body.ok !== true ||
    body.final_ga_audit_status !== "passed_release_candidate_final_ga_audit" ||
    blockers.length !== 0 ||
    body.operational_readiness_review_current !== true ||
    body.operational_readiness_review_id !== operationalId ||
    body.operational_readiness_review_path !== operationalArtifact.path ||
    body.proof_breadth_status !== "complete_release_candidate_proof_breadth" ||
    body.proof_breadth_blocker_code !== "" ||
    typeof body.proof_breadth_closure_id !== "string" ||
    typeof body.proof_breadth_closure_path !== "string" ||
    body.proof_breadth_closure_current !== true ||
    body.final_ga_audit_available !== true ||
    body.final_ga_audit_passed !== true ||
    body.ga_certificate_available !== false ||
    body.proof_authority !== "lean_kernel_clean_replay" ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    body.ga_certification_gate_separate !== true
  ) {
    throw new ComathError("Goal 3 GA certificate consumption final audit is not source-bound", {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATE_CONSUMPTION_INVALID"
    });
  }
  const auditOperationalArtifact = artifactReference(
    body.operational_readiness_review_artifact,
    "audit operational-readiness",
    "goal3_ga_operational_readiness_review",
    operationalArtifact.path
  );
  if (
    auditOperationalArtifact.sha256 !== operationalArtifact.sha256 ||
    auditOperationalArtifact.size_bytes !== operationalArtifact.size_bytes
  ) {
    throw new ComathError("Goal 3 GA certificate consumption operational-readiness reference is mixed", {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATE_CONSUMPTION_INVALID"
    });
  }
  const closureId = assertSafeId(body.proof_breadth_closure_id, "proof_breadth_closure_id");
  const canonicalClosurePath = proofBreadthClosurePath(closureId);
  if (normalizeRelativePath(body.proof_breadth_closure_path) !== canonicalClosurePath) {
    throw new ComathError("Goal 3 GA certificate consumption proof-breadth closure path is not canonical", {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATE_CONSUMPTION_INVALID"
    });
  }
  return {
    closureId,
    closureArtifact: artifactReference(
      body.proof_breadth_closure_artifact,
      "proof-breadth closure",
      "goal3_release_candidate_proof_breadth_closure",
      canonicalClosurePath
    )
  };
}

function assertProofBreadthClosure(
  body: ProofBreadthClosureBody,
  projectId: string,
  closureId: string,
  artifact: ArtifactReference
): void {
  const blockers = Array.isArray(body.blocker_reasons) ? body.blocker_reasons : [];
  const missing = Array.isArray(body.missing_task_ids) ? body.missing_task_ids : [];
  const blocked = Array.isArray(body.blocked_task_ids) ? body.blocked_task_ids : [];
  const packaging = Array.isArray(body.packaging_report_artifacts) ? body.packaging_report_artifacts : [];
  if (
    body.schema_version !== "comath.goal3_release_candidate_proof_breadth_closure.v1" ||
    body.proof_breadth_closure_id !== closureId ||
    body.project_id !== projectId ||
    body.proof_breadth_closure_path !== artifact.path ||
    body.proof_breadth_closure_artifact !== undefined ||
    body.requested_closure_mode !== "open_formal_workbench_release_candidate_proof_breadth_closure" ||
    body.ok !== true ||
    body.proof_breadth_status !== "complete_release_candidate_proof_breadth" ||
    blockers.length !== 0 ||
    body.total_required_tasks !== 100 ||
    body.task_manifest_count !== 100 ||
    body.verified_task_count !== 100 ||
    body.missing_task_count !== 0 ||
    body.blocked_task_count !== 0 ||
    missing.length !== 0 ||
    blocked.length !== 0 ||
    packaging.length !== 100 ||
    body.proof_breadth_complete !== true ||
    body.final_ga_audit_unblocked !== true ||
    body.proof_authority !== "lean_kernel_clean_replay" ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    body.ga_certification_gate_separate !== true
  ) {
    throw new ComathError("Goal 3 GA certificate consumption proof-breadth closure is not complete", {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATE_CONSUMPTION_INVALID"
    });
  }
}

function assertOperationalReadiness(
  body: OperationalReadinessReviewBody,
  projectId: string,
  operationalId: string,
  artifact: ArtifactReference
): void {
  const blockers = Array.isArray(body.blocker_reasons) ? body.blocker_reasons : null;
  const transportId = typeof body.transport_closure_review_id === "string" ? body.transport_closure_review_id : undefined;
  const adapterOsReviewId =
    typeof body.adapter_os_isolation_review_id === "string" ? body.adapter_os_isolation_review_id : undefined;
  const canonicalTransportPath = transportId ? transportClosureReviewPath(assertSafeId(transportId, "transport_closure_review_id")) : "";
  const canonicalAdapterOsReviewPath = adapterOsReviewId
    ? adapterOsIsolationReviewPath(assertSafeId(adapterOsReviewId, "adapter_os_isolation_review_id"))
    : "";
  if (
    body.schema_version !== "comath.goal3_ga_operational_readiness_review.v1" ||
    body.operational_readiness_review_id !== operationalId ||
    body.project_id !== projectId ||
    body.operational_readiness_review_path !== artifact.path ||
    body.operational_readiness_review_artifact !== undefined ||
    body.requested_review_mode !== "open_formal_workbench_ga_operational_readiness" ||
    body.ok !== true ||
    body.operational_readiness_status !== "ready_for_ga_release_candidate_review" ||
    blockers === null ||
    blockers.length !== 0 ||
    body.transport_closure_review_status !== "maintained_operator_service_transport_closure_reviewed" ||
    normalizeRelativePath(String(body.transport_closure_review_path ?? "")) !== canonicalTransportPath ||
    body.transport_closure_review_current !== true ||
    body.terminal_unattended_completion_certified !== true ||
    body.completion_certificate_available !== true ||
    body.unattended_real_host_execution_completed !== true ||
    body.maintained_transport_primitive_bound !== true ||
    body.service_transport_primitive !== "node_http_agent_run_log_session_route" ||
    body.client_transport_primitive !== "pi_fetch_get_text" ||
    body.durable_transport_provided !== false ||
    body.live_transport_open !== false ||
    normalizeRelativePath(String(body.adapter_os_isolation_review_path ?? "")) !== canonicalAdapterOsReviewPath ||
    body.adapter_os_isolation_review_current !== true ||
    typeof body.adapter_id !== "string" ||
    body.adapter_id.trim() === "" ||
    typeof body.adapter_backend !== "string" ||
    body.adapter_backend.trim() === "" ||
    body.adapter_os_isolation_status !== "ready_for_os_isolation_release_review" ||
    body.adapter_os_enforced !== true ||
    body.adapter_os_isolation_required_for_ga !== true ||
    body.adapter_production_helper_source_bound !== true ||
    body.adapter_helper_profile_source !== "operator_configured_provider_helper" ||
    body.adapter_production_helper_configured !== true ||
    body.adapter_bundled_protocol_asset !== false ||
    body.proof_authority !== "none" ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    body.ga_certification_gate_separate !== true
  ) {
    throw new ComathError("Goal 3 GA certificate consumption operational readiness is not source-bound", {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATE_CONSUMPTION_INVALID"
    });
  }
  artifactReference(
    body.transport_closure_review_artifact,
    "transport-closure",
    "operator_service_transport_closure_review",
    canonicalTransportPath
  );
  artifactReference(
    body.adapter_os_isolation_review_artifact,
    "adapter OS-isolation",
    "agent_adapter_os_isolation_readiness",
    canonicalAdapterOsReviewPath
  );
}

export function recordGoal3GaCertificateConsumptionReview(
  projectRoot: string,
  input: Goal3GaCertificateConsumptionReviewInput
): Goal3GaCertificateConsumptionReview {
  const projectId = assertSafeId(input.project_id, "project_id");
  const consumptionId = assertSafeId(
    input.ga_certificate_consumption_review_id,
    "ga_certificate_consumption_review_id"
  );
  const requestedMode =
    input.requested_consumption_mode ?? "open_formal_workbench_ga_certificate_source_bound_consumption";
  if (requestedMode !== "open_formal_workbench_ga_certificate_source_bound_consumption") {
    throw new ComathError("Goal 3 GA certificate consumption mode is invalid", {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATE_CONSUMPTION_INVALID_MODE"
    });
  }

  const consumptionPath = consumptionReviewPath(consumptionId);
  const absoluteConsumptionPath = assertPathAllowed(projectRoot, consumptionPath, { purpose: "runtime-write" });
  if (existsSync(absoluteConsumptionPath)) {
    throw new ComathError("Goal 3 GA certificate consumption review already exists", {
      statusCode: 409,
      code: "GOAL3_GA_CERTIFICATE_CONSUMPTION_ALREADY_EXISTS"
    });
  }

  const certificateId = assertSafeId(input.ga_certificate_id, "ga_certificate_id");
  const canonicalCertificatePath = certificatePath(certificateId);
  if (normalizeRelativePath(input.ga_certificate_path) !== canonicalCertificatePath) {
    throw new ComathError("Goal 3 GA certificate consumption certificate path is not canonical", {
      statusCode: 400,
      code: "GOAL3_GA_CERTIFICATE_CONSUMPTION_INVALID"
    });
  }
  const certificate = readJsonArtifact<GaCertificateBody>(
    projectRoot,
    canonicalCertificatePath,
    input.ga_certificate_sha256,
    "goal3_ga_certificate"
  );
  const certificateRefs = assertGaCertificate(certificate.body, projectId, certificateId, canonicalCertificatePath);

  const certification = readJsonArtifact<CertificationReviewBody>(
    projectRoot,
    certificateRefs.reviewArtifact.path,
    certificateRefs.reviewArtifact.sha256,
    certificateRefs.reviewArtifact.kind,
    certificateRefs.reviewArtifact.size_bytes
  );
  const certificationRefs = assertCertificationReview(
    certification.body,
    projectId,
    certificateRefs.reviewId,
    certification.artifact,
    certificateRefs.finalAuditId,
    certificateRefs.finalAuditArtifact
  );

  const finalAudit = readJsonArtifact<FinalGaAuditBody>(
    projectRoot,
    certificateRefs.finalAuditArtifact.path,
    certificateRefs.finalAuditArtifact.sha256,
    certificateRefs.finalAuditArtifact.kind,
    certificateRefs.finalAuditArtifact.size_bytes
  );
  const finalAuditRefs = assertFinalGaAudit(
    finalAudit.body,
    projectId,
    certificateRefs.finalAuditId,
    finalAudit.artifact,
    certificationRefs.operationalId,
    certificationRefs.operationalArtifact
  );

  const closure = readJsonArtifact<ProofBreadthClosureBody>(
    projectRoot,
    finalAuditRefs.closureArtifact.path,
    finalAuditRefs.closureArtifact.sha256,
    finalAuditRefs.closureArtifact.kind,
    finalAuditRefs.closureArtifact.size_bytes
  );
  assertProofBreadthClosure(closure.body, projectId, finalAuditRefs.closureId, closure.artifact);

  const operational = readJsonArtifact<OperationalReadinessReviewBody>(
    projectRoot,
    certificationRefs.operationalArtifact.path,
    certificationRefs.operationalArtifact.sha256,
    certificationRefs.operationalArtifact.kind,
    certificationRefs.operationalArtifact.size_bytes
  );
  assertOperationalReadiness(operational.body, projectId, certificationRefs.operationalId, operational.artifact);

  const actor = sanitizeActor(input.actor);
  const body = {
    schema_version: "comath.goal3_ga_certificate_consumption_review.v1",
    ga_certificate_consumption_review_id: consumptionId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    ok: true,
    release_closure_status: "publishable_workbench_release_candidate_source_bound",
    ga_certificate_consumption_review_path: consumptionPath,
    requested_consumption_mode: "open_formal_workbench_ga_certificate_source_bound_consumption",
    ga_certificate_id: certificateId,
    ga_certificate_path: certificate.artifact.path,
    ga_certificate_artifact: certificate.artifact,
    ga_certificate_current: true,
    ga_certificate_consumed: true,
    ga_certification_review_id: certificateRefs.reviewId,
    ga_certification_review_path: certification.artifact.path,
    ga_certification_review_artifact: certification.artifact,
    ga_certification_review_current: true,
    final_ga_audit_id: certificateRefs.finalAuditId,
    final_ga_audit_path: finalAudit.artifact.path,
    final_ga_audit_artifact: finalAudit.artifact,
    final_ga_audit_current: true,
    final_ga_audit_passed: true,
    proof_breadth_closure_id: finalAuditRefs.closureId,
    proof_breadth_closure_path: closure.artifact.path,
    proof_breadth_closure_artifact: closure.artifact,
    proof_breadth_closure_current: true,
    proof_breadth_complete: true,
    operational_readiness_review_id: certificationRefs.operationalId,
    operational_readiness_review_path: operational.artifact.path,
    operational_readiness_review_artifact: operational.artifact,
    operational_readiness_review_current: true,
    operational_readiness_status: "ready_for_ga_release_candidate_review",
    adapter_production_helper_source_bound: true,
    adapter_helper_profile_source: "operator_configured_provider_helper",
    adapter_production_helper_configured: true,
    adapter_bundled_protocol_asset: false,
    ga_certificate_available: true,
    proof_authority: "lean_kernel_clean_replay",
    can_promote_claim: false,
    can_certify_ga: true,
    claim_promotion_requires_ordinary_gate: true
  } satisfies Omit<Goal3GaCertificateConsumptionReview, "ga_certificate_consumption_review_artifact">;

  const reviewText = `${JSON.stringify(body, null, 2)}\n`;
  mkdirSync(dirname(absoluteConsumptionPath), { recursive: true });
  writeFileSync(absoluteConsumptionPath, reviewText, "utf8");
  const result: Goal3GaCertificateConsumptionReview = {
    ...body,
    ga_certificate_consumption_review_artifact: {
      kind: "goal3_ga_certificate_consumption_review",
      path: consumptionPath,
      sha256: sha256Text(reviewText),
      size_bytes: Buffer.byteLength(reviewText, "utf8")
    }
  };

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.goal3_ga_certificate_consumption_recorded",
    actor,
    target_id: projectId,
    payload: {
      ga_certificate_consumption_review_id: consumptionId,
      release_closure_status: result.release_closure_status,
      ga_certificate_consumption_review_path: consumptionPath,
      ga_certificate_consumption_review_artifact_sha256: result.ga_certificate_consumption_review_artifact.sha256,
      ga_certificate_id: certificateId,
      ga_certificate_artifact_sha256: certificate.artifact.sha256,
      ga_certification_review_id: certificateRefs.reviewId,
      ga_certification_review_artifact_sha256: certification.artifact.sha256,
      final_ga_audit_id: certificateRefs.finalAuditId,
      final_ga_audit_artifact_sha256: finalAudit.artifact.sha256,
      proof_breadth_closure_id: finalAuditRefs.closureId,
      proof_breadth_closure_artifact_sha256: closure.artifact.sha256,
      operational_readiness_review_id: certificationRefs.operationalId,
      operational_readiness_review_artifact_sha256: operational.artifact.sha256,
      adapter_production_helper_source_bound: true,
      adapter_helper_profile_source: "operator_configured_provider_helper",
      adapter_production_helper_configured: true,
      adapter_bundled_protocol_asset: false,
      proof_authority: "lean_kernel_clean_replay",
      can_promote_claim: false,
      can_certify_ga: true,
      claim_promotion_requires_ordinary_gate: true
    }
  });
  return result;
}
