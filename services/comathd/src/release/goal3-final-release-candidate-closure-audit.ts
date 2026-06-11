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

type BoundaryReviewBody = {
  schema_version?: unknown;
  certification_boundary_review_id?: unknown;
  project_id?: unknown;
  ok?: unknown;
  certification_boundary_review_status?: unknown;
  certification_boundary_review_path?: unknown;
  final_release_signoff_id?: unknown;
  final_release_signoff_path?: unknown;
  final_release_signoff_artifact?: unknown;
  final_release_signoff_current?: unknown;
  final_release_signoff_status?: unknown;
  ga_release_signoff_ready?: unknown;
  ga_certificate_consumption_review_id?: unknown;
  ga_certificate_consumption_review_artifact?: unknown;
  ga_certificate_consumption_current?: unknown;
  consumed_ga_certificate_can_certify_ga?: unknown;
  durable_transport_signoff_verification_id?: unknown;
  durable_transport_signoff_verification_path?: unknown;
  durable_transport_signoff_verification_artifact?: unknown;
  durable_transport_signoff_verification_current?: unknown;
  durable_transport_signoff_verification_status?: unknown;
  external_durable_transport_evidence_id?: unknown;
  external_durable_transport_evidence_artifact?: unknown;
  external_durable_transport_evidence_current?: unknown;
  external_durable_transport_primitive_bound?: unknown;
  durable_transport_provided?: unknown;
  live_transport_open?: unknown;
  source_release_os_immutability_attestation_id?: unknown;
  source_release_os_immutability_attestation_path?: unknown;
  source_release_os_immutability_attestation_artifact?: unknown;
  source_release_os_immutability_attestation_current?: unknown;
  source_archive_artifact?: unknown;
  source_archive_current?: unknown;
  operator_evidence_artifact?: unknown;
  operator_evidence_current?: unknown;
  proof_authority?: unknown;
  can_promote_claim?: unknown;
  can_certify_ga?: unknown;
  boundary_review_is_certificate?: unknown;
  ga_certificate_issued?: unknown;
  claim_promotion_requires_ordinary_gate?: unknown;
};

type FinalReleaseSignoffBody = {
  schema_version?: unknown;
  final_release_signoff_id?: unknown;
  project_id?: unknown;
  ok?: unknown;
  final_release_signoff_status?: unknown;
  final_release_signoff_path?: unknown;
  blocker_reasons?: unknown;
  ga_certificate_consumption_available?: unknown;
  ga_certificate_consumption_review_id?: unknown;
  ga_certificate_consumption_review_artifact?: unknown;
  ga_certificate_consumption_current?: unknown;
  ga_certificate_available?: unknown;
  durable_transport_signoff_verification_available?: unknown;
  durable_transport_signoff_verification_id?: unknown;
  durable_transport_signoff_verification_path?: unknown;
  durable_transport_signoff_verification_artifact?: unknown;
  durable_transport_signoff_verification_current?: unknown;
  durable_transport_signoff_verification_status?: unknown;
  source_release_os_immutability_attestation_id?: unknown;
  source_release_os_immutability_attestation_path?: unknown;
  source_release_os_immutability_attestation_artifact?: unknown;
  source_release_os_immutability_attestation_current?: unknown;
  source_archive_artifact?: unknown;
  source_archive_current?: unknown;
  operator_evidence_artifact?: unknown;
  operator_evidence_current?: unknown;
  external_durable_transport_evidence_bound?: unknown;
  external_durable_transport_primitive_bound?: unknown;
  service_transport_primitive?: unknown;
  client_transport_primitive?: unknown;
  durable_transport_provided?: unknown;
  live_transport_open?: unknown;
  ga_release_signoff_ready?: unknown;
  proof_authority?: unknown;
  can_promote_claim?: unknown;
  can_certify_ga?: unknown;
};

type CertificateConsumptionBody = {
  schema_version?: unknown;
  ga_certificate_consumption_review_id?: unknown;
  project_id?: unknown;
  ok?: unknown;
  release_closure_status?: unknown;
  ga_certificate_consumption_review_path?: unknown;
  ga_certificate_current?: unknown;
  ga_certificate_consumed?: unknown;
  final_ga_audit_current?: unknown;
  final_ga_audit_passed?: unknown;
  proof_breadth_complete?: unknown;
  operational_readiness_review_current?: unknown;
  operational_readiness_status?: unknown;
  ga_certificate_available?: unknown;
  proof_authority?: unknown;
  can_promote_claim?: unknown;
  can_certify_ga?: unknown;
  claim_promotion_requires_ordinary_gate?: unknown;
};

type DurableTransportVerificationBody = {
  schema_version?: unknown;
  durable_transport_signoff_verification_id?: unknown;
  project_id?: unknown;
  ok?: unknown;
  durable_transport_signoff_verification_status?: unknown;
  blocker_reasons?: unknown;
  durable_transport_signoff_verification_path?: unknown;
  durable_transport_signoff_prerequisite_id?: unknown;
  durable_transport_signoff_prerequisite_path?: unknown;
  durable_transport_signoff_prerequisite_artifact?: unknown;
  durable_transport_signoff_prerequisite_current?: unknown;
  durable_transport_signoff_status?: unknown;
  operational_readiness_review_artifact?: unknown;
  operational_readiness_review_current?: unknown;
  transport_closure_review_artifact?: unknown;
  transport_closure_review_current?: unknown;
  terminal_completion_certificate_artifact?: unknown;
  terminal_completion_certificate_current?: unknown;
  durable_transport_contract_artifact?: unknown;
  durable_transport_contract_current?: unknown;
  transport_continuity_artifact?: unknown;
  transport_continuity_current?: unknown;
  transport_contract_artifact?: unknown;
  transport_contract_current?: unknown;
  external_durable_transport_evidence_bound?: unknown;
  external_durable_transport_evidence_id?: unknown;
  external_durable_transport_evidence_artifact?: unknown;
  external_durable_transport_evidence_current?: unknown;
  external_durable_transport_primitive_bound?: unknown;
  provider_kind?: unknown;
  transport_primitive?: unknown;
  service_route?: unknown;
  fresh_until?: unknown;
  freshness_window_seconds?: unknown;
  service_transport_primitive?: unknown;
  client_transport_primitive?: unknown;
  durable_transport_provided?: unknown;
  live_transport_open?: unknown;
  co_math_transport_stack_built?: unknown;
  co_math_websocket_stack_built?: unknown;
  custom_transport_implementation?: unknown;
  indefinite_stream_open?: unknown;
  long_lived_websocket_provided?: unknown;
  long_lived_sse_provided?: unknown;
  pi_direct_write_allowed?: unknown;
  direct_trusted_state_mutation?: unknown;
  ga_release_signoff_ready?: unknown;
  proof_authority?: unknown;
  can_promote_claim?: unknown;
  can_certify_ga?: unknown;
};

type ExternalDurableTransportEvidenceBody = {
  schema_version?: unknown;
  external_durable_transport_evidence_id?: unknown;
  project_id?: unknown;
  ok?: unknown;
  evidence_status?: unknown;
  evidence_path?: unknown;
  provider_id?: unknown;
  provider_kind?: unknown;
  transport_primitive?: unknown;
  maintenance_source?: unknown;
  service_route?: unknown;
  service_transport_primitive?: unknown;
  client_transport_primitive?: unknown;
  fresh_until?: unknown;
  freshness_window_seconds?: unknown;
  reconnect_policy?: unknown;
  external_durable_transport_primitive_bound?: unknown;
  durable_transport_provided?: unknown;
  live_transport_open?: unknown;
  co_math_transport_stack_built?: unknown;
  co_math_websocket_stack_built?: unknown;
  custom_transport_implementation?: unknown;
  indefinite_stream_open?: unknown;
  long_lived_websocket_provided?: unknown;
  long_lived_sse_provided?: unknown;
  pi_direct_write_allowed?: unknown;
  direct_trusted_state_mutation?: unknown;
  proof_authority?: unknown;
  can_promote_claim?: unknown;
  can_certify_ga?: unknown;
};

type SourceReleaseOsAttestationBody = {
  schema_version?: unknown;
  attestation_id?: unknown;
  project_id?: unknown;
  ok?: unknown;
  os_immutability_attestation_status?: unknown;
  attestation_path?: unknown;
  policy_inspection_id?: unknown;
  policy_inspection_path?: unknown;
  policy_inspection_sha256?: unknown;
  policy_inspection_artifact?: unknown;
  policy_inspection_current?: unknown;
  verification_id?: unknown;
  verification_sha256?: unknown;
  source_archive?: unknown;
  source_archive_current?: unknown;
  evidence_kind?: unknown;
  operator_evidence_artifact?: unknown;
  operator_evidence_current?: unknown;
  provider_os_immutability_attestation_bound?: unknown;
  co_math_os_immutability_enforced?: unknown;
  proof_authority?: unknown;
  can_restore?: unknown;
  can_promote_claim?: unknown;
  can_certify_ga?: unknown;
  storage_is_proof_authority?: unknown;
  attestation_is_proof_authority?: unknown;
  attestation_is_restore_source?: unknown;
  result_can_be_used_as_proof?: unknown;
  requires_separate_lean_authority?: unknown;
  public_archive_review_ok?: unknown;
};

type OperatorEvidenceBody = {
  schema_version?: unknown;
  project_id?: unknown;
  ok?: unknown;
  evidence_kind?: unknown;
  source_archive?: unknown;
  source_archive_current?: unknown;
  proof_authority?: unknown;
  can_promote_claim?: unknown;
  can_certify_ga?: unknown;
};

export type Goal3FinalReleaseCandidateClosureAuditInput = {
  project_id: string;
  final_release_candidate_closure_audit_id?: string;
  actor?: string;
  certification_boundary_review_id: string;
  certification_boundary_review_path: string;
  certification_boundary_review_sha256: string;
  requested_audit_mode?: "open_formal_workbench_final_release_candidate_closure_audit";
};

export type Goal3FinalReleaseCandidateClosureAudit = {
  schema_version: "comath.goal3_final_release_candidate_closure_audit.v1";
  final_release_candidate_closure_audit_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  ok: true;
  final_release_candidate_closure_status: "audited_final_release_candidate_boundary_current";
  final_release_candidate_closure_audit_path: string;
  requested_audit_mode: "open_formal_workbench_final_release_candidate_closure_audit";
  certification_boundary_review_id: string;
  certification_boundary_review_path: string;
  certification_boundary_review_artifact: ArtifactReference;
  certification_boundary_review_current: true;
  certification_boundary_review_status: "reviewed_final_release_signoff_certification_boundary";
  final_release_signoff_id: string;
  final_release_signoff_path: string;
  final_release_signoff_artifact: ArtifactReference;
  final_release_signoff_current: true;
  final_release_signoff_status: "ready_for_open_formal_workbench_final_release_signoff";
  ga_release_signoff_ready: true;
  ga_certificate_consumption_review_id: string;
  ga_certificate_consumption_review_artifact: ArtifactReference;
  ga_certificate_consumption_current: true;
  consumed_ga_certificate_can_certify_ga: true;
  durable_transport_signoff_verification_id: string;
  durable_transport_signoff_verification_path: string;
  durable_transport_signoff_verification_artifact: ArtifactReference;
  durable_transport_signoff_verification_current: true;
  durable_transport_signoff_verification_status: "verified_external_durable_transport_primitive_bound";
  external_durable_transport_evidence_id: string;
  external_durable_transport_evidence_artifact: ArtifactReference;
  external_durable_transport_evidence_current: true;
  external_durable_transport_primitive_bound: true;
  durable_transport_provided: true;
  live_transport_open: true;
  source_release_os_immutability_attestation_id: string;
  source_release_os_immutability_attestation_path: string;
  source_release_os_immutability_attestation_artifact: ArtifactReference;
  source_release_os_immutability_attestation_current: true;
  source_archive_artifact: ArtifactReference;
  source_archive_current: true;
  operator_evidence_artifact: ArtifactReference;
  operator_evidence_current: true;
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
  release_candidate_closure_audit_is_certificate: false;
  ga_certificate_issued: false;
  claim_promotion_requires_ordinary_gate: true;
  final_release_candidate_closure_audit_artifact: ArtifactReference;
};

const invalidCode = "GOAL3_FINAL_RELEASE_CANDIDATE_CLOSURE_AUDIT_INVALID";
const staleCode = "GOAL3_FINAL_RELEASE_CANDIDATE_CLOSURE_AUDIT_STALE";

const allowedInputKeys = new Set([
  "project_id",
  "final_release_candidate_closure_audit_id",
  "actor",
  "certification_boundary_review_id",
  "certification_boundary_review_path",
  "certification_boundary_review_sha256",
  "requested_audit_mode"
]);

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function closureAuditPath(auditId: string): string {
  return normalizeRelativePath(join(".comath", "release", "goal3-final-release-candidate-closure-audit", auditId, "audit.json"));
}

function boundaryReviewPath(reviewId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "goal3-final-release-signoff-certification-boundary-review", reviewId, "review.json")
  );
}

function signoffPath(signoffId: string): string {
  return normalizeRelativePath(join(".comath", "release", "goal3-final-release-signoff", signoffId, "signoff.json"));
}

function certificateConsumptionPath(reviewId: string): string {
  return normalizeRelativePath(join(".comath", "release", "goal3-ga-certificate-consumption", reviewId, "consumption-review.json"));
}

function durableTransportVerificationPath(verificationId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "goal3-durable-transport-release-signoff-verification", verificationId, "verification.json")
  );
}

function externalDurableTransportEvidencePath(evidenceId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "goal3-external-durable-transport-evidence", evidenceId, "external-durable-transport-evidence.json")
  );
}

function sourceReleaseOsAttestationPath(attestationId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "goal3-source-release-os-immutability-attestation", attestationId, "os-immutability-attestation.json")
  );
}

function sha256Bytes(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function sha256Text(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function invalid(message: string): never {
  throw new ComathError(message, { statusCode: 400, code: invalidCode });
}

function stale(message: string): never {
  throw new ComathError(message, { statusCode: 400, code: staleCode });
}

function assertNoUnexpectedInputKeys(input: Goal3FinalReleaseCandidateClosureAuditInput): void {
  for (const key of Object.keys(input as Record<string, unknown>)) {
    if (!allowedInputKeys.has(key)) {
      invalid(`Goal 3 final release-candidate closure audit input field is not allowed: ${key}`);
    }
  }
}

function assertSafeId(value: string | undefined, label: string): string {
  const id = typeof value === "string" ? value.trim() : "";
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,180}$/u.test(id)) {
    invalid(`${label} is invalid`);
  }
  return id;
}

function assertSha256(value: string | undefined): string {
  const sha256 = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-f0-9]{64}$/u.test(sha256)) {
    stale("Goal 3 final release-candidate closure audit referenced material is stale");
  }
  return sha256;
}

function sanitizeActor(value: string | undefined): string {
  return (value ?? "goal3-final-release-candidate-closure-audit")
    .replace(/(?:[A-Za-z]:[\\/][^\s"']+|\\\\[^\s"']+)/gu, "[redacted-path]")
    .replace(/(?:Authorization:\s*Bearer\s+\S+|api_key=\S+|token=\S+|sk-[A-Za-z0-9_-]+)/giu, "[redacted-secret]")
    .replace(
      /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|kernel_checked|proof_success|GA certified|can_certify_ga\s*[:=]\s*(?:true|1)|can_promote_claim\s*[:=]\s*(?:true|1))\b/giu,
      "[redacted-authority-claim]"
    )
    .slice(0, 400);
}

function assertProjectRelativePath(path: string, label: string): string {
  const normalized = normalizeRelativePath(path);
  if (
    !normalized.startsWith(".comath/") ||
    normalized.startsWith("/") ||
    normalized.startsWith("../") ||
    normalized.includes("/../") ||
    /^[A-Za-z]:\//u.test(normalized) ||
    normalized.includes("//")
  ) {
    invalid(`Goal 3 final release-candidate closure audit ${label} is not project-relative`);
  }
  return normalized;
}

function artifactReference(value: unknown, label: string, expectedKind: string, expectedPath?: string): ArtifactReference {
  const record = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const path = typeof record.path === "string" ? normalizeRelativePath(record.path) : "";
  const sizeBytes = record.size_bytes;
  if (
    record.kind !== expectedKind ||
    (expectedPath !== undefined && path !== normalizeRelativePath(expectedPath)) ||
    !path.startsWith(".comath/") ||
    typeof record.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(record.sha256) ||
    typeof sizeBytes !== "number" ||
    !Number.isSafeInteger(sizeBytes) ||
    sizeBytes <= 0
  ) {
    invalid(`Goal 3 final release-candidate closure audit ${label} reference is invalid`);
  }
  return {
    kind: record.kind,
    path,
    sha256: record.sha256,
    size_bytes: sizeBytes
  };
}

function sameArtifact(a: ArtifactReference, b: ArtifactReference): boolean {
  return a.kind === b.kind && a.path === b.path && a.sha256 === b.sha256 && a.size_bytes === b.size_bytes;
}

function sourceArchiveReference(value: unknown): ArtifactReference {
  const record = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const path = typeof record.archive_path === "string" ? normalizeRelativePath(record.archive_path) : "";
  const sha256 = typeof record.archive_sha256 === "string" ? record.archive_sha256 : "";
  const sizeBytes = record.size_bytes;
  if (
    !path.startsWith(".comath/") ||
    !/^[a-f0-9]{64}$/u.test(sha256) ||
    typeof sizeBytes !== "number" ||
    !Number.isSafeInteger(sizeBytes) ||
    sizeBytes <= 0 ||
    record.source_only !== true ||
    record.includes_runtime_state !== false ||
    record.includes_git_dir !== false ||
    record.includes_node_modules !== false
  ) {
    invalid("Goal 3 final release-candidate closure audit source archive reference is invalid");
  }
  return {
    kind: "goal3_source_release_source_archive",
    path,
    sha256,
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
  const path = assertProjectRelativePath(canonicalPath, "artifact path");
  const absolutePath = assertPathAllowed(projectRoot, path, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    stale("Goal 3 final release-candidate closure audit referenced artifact is stale");
  }
  const content = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(content);
  if (actualSha256 !== assertSha256(expectedSha256)) {
    stale("Goal 3 final release-candidate closure audit referenced artifact hash is stale");
  }
  if (expectedSizeBytes !== undefined && content.byteLength !== expectedSizeBytes) {
    stale("Goal 3 final release-candidate closure audit referenced artifact size is stale");
  }
  try {
    return {
      body: JSON.parse(content.toString("utf8")) as T,
      artifact: {
        kind,
        path,
        sha256: actualSha256,
        size_bytes: content.byteLength
      }
    };
  } catch {
    invalid("Goal 3 final release-candidate closure audit referenced JSON is invalid");
  }
}

function readArtifactBytes(projectRoot: string, artifact: ArtifactReference, label: string): void {
  const path = assertProjectRelativePath(artifact.path, `${label} path`);
  const absolutePath = assertPathAllowed(projectRoot, path, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    stale(`Goal 3 final release-candidate closure audit ${label} is stale`);
  }
  const content = readFileSync(absolutePath);
  if (sha256Bytes(content) !== artifact.sha256 || content.byteLength !== artifact.size_bytes) {
    stale(`Goal 3 final release-candidate closure audit ${label} bytes are stale`);
  }
}

function assertArtifactCurrent(projectRoot: string, artifact: ArtifactReference, label: string): void {
  readJsonArtifact<Record<string, unknown>>(
    projectRoot,
    artifact.path,
    artifact.sha256,
    artifact.kind,
    artifact.size_bytes
  );
  void label;
}

function assertFreshTransportEvidence(freshUntilValue: unknown, freshnessWindowValue: unknown): void {
  const freshUntil = typeof freshUntilValue === "string" ? Date.parse(freshUntilValue) : Number.NaN;
  if (!Number.isFinite(freshUntil) || freshUntil <= Date.now()) {
    stale("Goal 3 final release-candidate closure audit external durable transport evidence is stale");
  }
  if (
    typeof freshnessWindowValue !== "number" ||
    !Number.isSafeInteger(freshnessWindowValue) ||
    freshnessWindowValue <= 0 ||
    freshnessWindowValue > 7 * 24 * 60 * 60
  ) {
    invalid("Goal 3 final release-candidate closure audit durable transport freshness window is invalid");
  }
}

function assertBoundaryReview(
  body: BoundaryReviewBody,
  projectId: string,
  reviewId: string,
  artifact: ArtifactReference
): {
  signoffId: string;
  signoffArtifact: ArtifactReference;
  certificateConsumptionId: string;
  certificateConsumptionArtifact: ArtifactReference;
  verificationId: string;
  verificationArtifact: ArtifactReference;
  externalEvidenceId: string;
  externalEvidenceArtifact: ArtifactReference;
  attestationId: string;
  attestationArtifact: ArtifactReference;
  sourceArchiveArtifact: ArtifactReference;
  operatorEvidenceArtifact: ArtifactReference;
} {
  if (
    body.schema_version !== "comath.goal3_final_release_signoff_certification_boundary_review.v1" ||
    body.certification_boundary_review_id !== reviewId ||
    body.project_id !== projectId ||
    body.ok !== true ||
    body.certification_boundary_review_status !== "reviewed_final_release_signoff_certification_boundary" ||
    body.certification_boundary_review_path !== artifact.path ||
    body.final_release_signoff_current !== true ||
    body.final_release_signoff_status !== "ready_for_open_formal_workbench_final_release_signoff" ||
    body.ga_release_signoff_ready !== true ||
    body.ga_certificate_consumption_current !== true ||
    body.consumed_ga_certificate_can_certify_ga !== true ||
    body.durable_transport_signoff_verification_current !== true ||
    body.durable_transport_signoff_verification_status !== "verified_external_durable_transport_primitive_bound" ||
    body.external_durable_transport_evidence_current !== true ||
    body.external_durable_transport_primitive_bound !== true ||
    body.durable_transport_provided !== true ||
    body.live_transport_open !== true ||
    body.source_release_os_immutability_attestation_current !== true ||
    body.source_archive_current !== true ||
    body.operator_evidence_current !== true ||
    body.proof_authority !== "none" ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    body.boundary_review_is_certificate !== false ||
    body.ga_certificate_issued !== false ||
    body.claim_promotion_requires_ordinary_gate !== true
  ) {
    invalid("Goal 3 final release-candidate closure audit boundary review violates release boundaries");
  }
  const signoffId = assertSafeId(
    typeof body.final_release_signoff_id === "string" ? body.final_release_signoff_id : undefined,
    "final_release_signoff_id"
  );
  const certificateConsumptionId = assertSafeId(
    typeof body.ga_certificate_consumption_review_id === "string"
      ? body.ga_certificate_consumption_review_id
      : undefined,
    "ga_certificate_consumption_review_id"
  );
  const verificationId = assertSafeId(
    typeof body.durable_transport_signoff_verification_id === "string"
      ? body.durable_transport_signoff_verification_id
      : undefined,
    "durable_transport_signoff_verification_id"
  );
  const externalEvidenceId = assertSafeId(
    typeof body.external_durable_transport_evidence_id === "string"
      ? body.external_durable_transport_evidence_id
      : undefined,
    "external_durable_transport_evidence_id"
  );
  const attestationId = assertSafeId(
    typeof body.source_release_os_immutability_attestation_id === "string"
      ? body.source_release_os_immutability_attestation_id
      : undefined,
    "source_release_os_immutability_attestation_id"
  );
  const canonicalSignoffPath = signoffPath(signoffId);
  const canonicalCertificatePath = certificateConsumptionPath(certificateConsumptionId);
  const canonicalVerificationPath = durableTransportVerificationPath(verificationId);
  const canonicalExternalPath = externalDurableTransportEvidencePath(externalEvidenceId);
  const canonicalAttestationPath = sourceReleaseOsAttestationPath(attestationId);
  if (
    body.final_release_signoff_path !== canonicalSignoffPath ||
    body.durable_transport_signoff_verification_path !== canonicalVerificationPath ||
    body.source_release_os_immutability_attestation_path !== canonicalAttestationPath
  ) {
    invalid("Goal 3 final release-candidate closure audit boundary review path is not canonical");
  }
  return {
    signoffId,
    signoffArtifact: artifactReference(
      body.final_release_signoff_artifact,
      "final signoff",
      "goal3_final_release_signoff_decision",
      canonicalSignoffPath
    ),
    certificateConsumptionId,
    certificateConsumptionArtifact: artifactReference(
      body.ga_certificate_consumption_review_artifact,
      "GA certificate consumption",
      "goal3_ga_certificate_consumption_review",
      canonicalCertificatePath
    ),
    verificationId,
    verificationArtifact: artifactReference(
      body.durable_transport_signoff_verification_artifact,
      "durable transport verification",
      "goal3_durable_transport_release_signoff_verification",
      canonicalVerificationPath
    ),
    externalEvidenceId,
    externalEvidenceArtifact: artifactReference(
      body.external_durable_transport_evidence_artifact,
      "external durable transport evidence",
      "goal3_external_durable_transport_evidence",
      canonicalExternalPath
    ),
    attestationId,
    attestationArtifact: artifactReference(
      body.source_release_os_immutability_attestation_artifact,
      "source-release OS attestation",
      "goal3_source_release_os_immutability_attestation",
      canonicalAttestationPath
    ),
    sourceArchiveArtifact: artifactReference(
      body.source_archive_artifact,
      "source archive",
      "goal3_source_release_source_archive"
    ),
    operatorEvidenceArtifact: artifactReference(
      body.operator_evidence_artifact,
      "operator evidence",
      "goal3_source_release_external_provider_verification"
    )
  };
}

function assertCertificateConsumption(body: CertificateConsumptionBody, projectId: string, reviewId: string, artifact: ArtifactReference): void {
  if (
    body.schema_version !== "comath.goal3_ga_certificate_consumption_review.v1" ||
    body.ga_certificate_consumption_review_id !== reviewId ||
    body.project_id !== projectId ||
    body.ok !== true ||
    body.release_closure_status !== "publishable_workbench_release_candidate_source_bound" ||
    body.ga_certificate_consumption_review_path !== artifact.path ||
    body.ga_certificate_current !== true ||
    body.ga_certificate_consumed !== true ||
    body.final_ga_audit_current !== true ||
    body.final_ga_audit_passed !== true ||
    body.proof_breadth_complete !== true ||
    body.operational_readiness_review_current !== true ||
    body.operational_readiness_status !== "ready_for_ga_release_candidate_review" ||
    body.ga_certificate_available !== true ||
    body.proof_authority !== "lean_kernel_clean_replay" ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== true ||
    body.claim_promotion_requires_ordinary_gate !== true
  ) {
    invalid("Goal 3 final release-candidate closure audit GA certificate consumption violates boundaries");
  }
}

function assertExternalEvidence(
  body: ExternalDurableTransportEvidenceBody,
  projectId: string,
  evidenceId: string,
  artifact: ArtifactReference,
  expectedServiceRoute: unknown
): void {
  assertFreshTransportEvidence(body.fresh_until, body.freshness_window_seconds);
  if (
    body.schema_version !== "comath.goal3_external_durable_transport_evidence.v1" ||
    body.external_durable_transport_evidence_id !== evidenceId ||
    body.project_id !== projectId ||
    body.ok !== true ||
    body.evidence_status !== "external_durable_transport_primitive_available" ||
    body.evidence_path !== artifact.path ||
    body.provider_kind !== "maintained_external_operator_transport" ||
    body.transport_primitive !== "external_reconnectable_operator_session" ||
    body.maintenance_source !== "external_maintained_primitive" ||
    body.service_route !== expectedServiceRoute ||
    body.service_transport_primitive !== "node_http_agent_run_log_session_route" ||
    body.client_transport_primitive !== "pi_fetch_get_text" ||
    body.reconnect_policy !== "external_provider_reconnect_required" ||
    body.external_durable_transport_primitive_bound !== true ||
    body.durable_transport_provided !== true ||
    body.live_transport_open !== true ||
    body.co_math_transport_stack_built !== false ||
    body.co_math_websocket_stack_built !== false ||
    body.custom_transport_implementation !== false ||
    body.indefinite_stream_open !== false ||
    body.long_lived_websocket_provided !== false ||
    body.long_lived_sse_provided !== false ||
    body.pi_direct_write_allowed !== false ||
    body.direct_trusted_state_mutation !== false ||
    body.proof_authority !== "none" ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false
  ) {
    invalid("Goal 3 final release-candidate closure audit external durable transport evidence violates boundaries");
  }
}

function assertDurableTransportVerification(
  projectRoot: string,
  body: DurableTransportVerificationBody,
  projectId: string,
  verificationId: string,
  artifact: ArtifactReference,
  externalEvidence: ArtifactReference
): void {
  const blockers = Array.isArray(body.blocker_reasons) ? body.blocker_reasons : [];
  assertFreshTransportEvidence(body.fresh_until, body.freshness_window_seconds);
  const prerequisite = artifactReference(
    body.durable_transport_signoff_prerequisite_artifact,
    "verification durable transport prerequisite",
    "goal3_durable_transport_release_signoff_prerequisite"
  );
  const referencedEvidence = artifactReference(
    body.external_durable_transport_evidence_artifact,
    "verification external durable transport evidence",
    "goal3_external_durable_transport_evidence",
    externalEvidence.path
  );
  if (
    body.schema_version !== "comath.goal3_durable_transport_release_signoff_verification.v1" ||
    body.durable_transport_signoff_verification_id !== verificationId ||
    body.project_id !== projectId ||
    body.ok !== true ||
    body.durable_transport_signoff_verification_status !== "verified_external_durable_transport_primitive_bound" ||
    blockers.length !== 0 ||
    body.durable_transport_signoff_verification_path !== artifact.path ||
    body.durable_transport_signoff_prerequisite_current !== true ||
    body.durable_transport_signoff_status !== "blocked_durable_long_lived_transport_not_provided" ||
    body.operational_readiness_review_current !== true ||
    body.transport_closure_review_current !== true ||
    body.terminal_completion_certificate_current !== true ||
    body.durable_transport_contract_current !== true ||
    body.transport_continuity_current !== true ||
    body.transport_contract_current !== true ||
    body.external_durable_transport_evidence_bound !== true ||
    body.external_durable_transport_evidence_current !== true ||
    body.external_durable_transport_primitive_bound !== true ||
    body.provider_kind !== "maintained_external_operator_transport" ||
    body.transport_primitive !== "external_reconnectable_operator_session" ||
    body.service_transport_primitive !== "node_http_agent_run_log_session_route" ||
    body.client_transport_primitive !== "pi_fetch_get_text" ||
    body.durable_transport_provided !== true ||
    body.live_transport_open !== true ||
    body.co_math_transport_stack_built !== false ||
    body.co_math_websocket_stack_built !== false ||
    body.custom_transport_implementation !== false ||
    body.indefinite_stream_open !== false ||
    body.long_lived_websocket_provided !== false ||
    body.long_lived_sse_provided !== false ||
    body.pi_direct_write_allowed !== false ||
    body.direct_trusted_state_mutation !== false ||
    body.ga_release_signoff_ready !== false ||
    body.proof_authority !== "none" ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    referencedEvidence.sha256 !== externalEvidence.sha256 ||
    referencedEvidence.size_bytes !== externalEvidence.size_bytes
  ) {
    invalid("Goal 3 final release-candidate closure audit durable transport verification violates boundaries");
  }
  for (const [value, label, kind] of [
    [prerequisite, "durable transport prerequisite", "goal3_durable_transport_release_signoff_prerequisite"],
    [body.operational_readiness_review_artifact, "operational readiness", "goal3_ga_operational_readiness_review"],
    [body.transport_closure_review_artifact, "transport closure", "operator_service_transport_closure_review"],
    [
      body.terminal_completion_certificate_artifact,
      "terminal completion certificate",
      "unattended_real_host_terminal_completion_certificate"
    ],
    [
      body.durable_transport_contract_artifact,
      "durable transport contract",
      "unattended_real_host_durable_transport_contract"
    ],
    [body.transport_continuity_artifact, "transport continuity", "operator_service_transport_continuity"],
    [body.transport_contract_artifact, "transport contract", "operator_service_transport_contract"]
  ] as const) {
    const ref =
      typeof value === "object" && value !== null && "kind" in value
        ? (value as ArtifactReference)
        : artifactReference(value, label, kind);
    assertArtifactCurrent(projectRoot, ref, label);
  }
}

function assertSourceReleaseOsAttestation(
  projectRoot: string,
  body: SourceReleaseOsAttestationBody,
  projectId: string,
  attestationId: string,
  artifact: ArtifactReference,
  expectedSourceArchive: ArtifactReference,
  expectedOperatorEvidence: ArtifactReference
): void {
  const sourceArchive = sourceArchiveReference(body.source_archive);
  const operatorEvidence = artifactReference(
    body.operator_evidence_artifact,
    "attestation operator evidence",
    "goal3_source_release_external_provider_verification",
    expectedOperatorEvidence.path
  );
  const policyInspection = artifactReference(
    body.policy_inspection_artifact,
    "policy inspection",
    "goal3_source_release_external_provider_policy_inspection"
  );
  if (
    body.schema_version !== "comath.goal3_source_release_os_immutability_attestation.v1" ||
    body.attestation_id !== attestationId ||
    body.project_id !== projectId ||
    body.ok !== true ||
    body.os_immutability_attestation_status !== "os_immutability_attested" ||
    body.attestation_path !== artifact.path ||
    typeof body.policy_inspection_id !== "string" ||
    body.policy_inspection_path !== policyInspection.path ||
    body.policy_inspection_sha256 !== policyInspection.sha256 ||
    body.policy_inspection_current !== true ||
    typeof body.verification_id !== "string" ||
    body.verification_sha256 !== expectedOperatorEvidence.sha256 ||
    body.source_archive_current !== true ||
    body.evidence_kind !== "os_immutable_storage" ||
    body.operator_evidence_current !== true ||
    body.provider_os_immutability_attestation_bound !== true ||
    body.co_math_os_immutability_enforced !== false ||
    body.proof_authority !== "none" ||
    body.can_restore !== false ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    body.storage_is_proof_authority !== false ||
    body.attestation_is_proof_authority !== false ||
    body.attestation_is_restore_source !== false ||
    body.result_can_be_used_as_proof !== false ||
    body.requires_separate_lean_authority !== true ||
    body.public_archive_review_ok !== true ||
    !sameArtifact(sourceArchive, expectedSourceArchive) ||
    operatorEvidence.sha256 !== expectedOperatorEvidence.sha256 ||
    operatorEvidence.size_bytes !== expectedOperatorEvidence.size_bytes
  ) {
    invalid("Goal 3 final release-candidate closure audit source-release OS attestation violates boundaries");
  }
  assertArtifactCurrent(projectRoot, policyInspection, "policy inspection");
}

function assertOperatorEvidence(
  body: OperatorEvidenceBody,
  projectId: string,
  expectedSourceArchive: ArtifactReference
): void {
  const sourceArchive = sourceArchiveReference(body.source_archive);
  if (
    body.schema_version !== "comath.goal3_source_release_external_provider_verification.v1" ||
    body.project_id !== projectId ||
    body.ok !== true ||
    body.evidence_kind !== "os_immutable_storage" ||
    body.source_archive_current !== true ||
    body.proof_authority !== "none" ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    !sameArtifact(sourceArchive, expectedSourceArchive)
  ) {
    invalid("Goal 3 final release-candidate closure audit operator evidence violates boundaries");
  }
}

function assertFinalReleaseSignoff(
  body: FinalReleaseSignoffBody,
  projectId: string,
  signoffId: string,
  artifact: ArtifactReference,
  boundaryRefs: ReturnType<typeof assertBoundaryReview>
): void {
  const blockers = Array.isArray(body.blocker_reasons) ? body.blocker_reasons : [];
  const certificateArtifact = artifactReference(
    body.ga_certificate_consumption_review_artifact,
    "signoff GA certificate consumption",
    "goal3_ga_certificate_consumption_review",
    boundaryRefs.certificateConsumptionArtifact.path
  );
  const verificationArtifact = artifactReference(
    body.durable_transport_signoff_verification_artifact,
    "signoff durable transport verification",
    "goal3_durable_transport_release_signoff_verification",
    boundaryRefs.verificationArtifact.path
  );
  const attestationArtifact = artifactReference(
    body.source_release_os_immutability_attestation_artifact,
    "signoff source-release OS attestation",
    "goal3_source_release_os_immutability_attestation",
    boundaryRefs.attestationArtifact.path
  );
  const sourceArchive = artifactReference(
    body.source_archive_artifact,
    "signoff source archive",
    "goal3_source_release_source_archive",
    boundaryRefs.sourceArchiveArtifact.path
  );
  const operatorEvidence = artifactReference(
    body.operator_evidence_artifact,
    "signoff operator evidence",
    "goal3_source_release_external_provider_verification",
    boundaryRefs.operatorEvidenceArtifact.path
  );
  if (
    body.schema_version !== "comath.goal3_final_release_signoff_decision.v1" ||
    body.final_release_signoff_id !== signoffId ||
    body.project_id !== projectId ||
    body.ok !== true ||
    body.final_release_signoff_status !== "ready_for_open_formal_workbench_final_release_signoff" ||
    body.final_release_signoff_path !== artifact.path ||
    blockers.length !== 0 ||
    body.ga_certificate_consumption_available !== true ||
    body.ga_certificate_consumption_review_id !== boundaryRefs.certificateConsumptionId ||
    body.ga_certificate_consumption_current !== true ||
    body.ga_certificate_available !== true ||
    body.durable_transport_signoff_verification_available !== true ||
    body.durable_transport_signoff_verification_id !== boundaryRefs.verificationId ||
    body.durable_transport_signoff_verification_path !== boundaryRefs.verificationArtifact.path ||
    body.durable_transport_signoff_verification_current !== true ||
    body.durable_transport_signoff_verification_status !== "verified_external_durable_transport_primitive_bound" ||
    body.source_release_os_immutability_attestation_id !== boundaryRefs.attestationId ||
    body.source_release_os_immutability_attestation_path !== boundaryRefs.attestationArtifact.path ||
    body.source_release_os_immutability_attestation_current !== true ||
    body.source_archive_current !== true ||
    body.operator_evidence_current !== true ||
    body.external_durable_transport_evidence_bound !== true ||
    body.external_durable_transport_primitive_bound !== true ||
    body.service_transport_primitive !== "node_http_agent_run_log_session_route" ||
    body.client_transport_primitive !== "pi_fetch_get_text" ||
    body.durable_transport_provided !== true ||
    body.live_transport_open !== true ||
    body.ga_release_signoff_ready !== true ||
    body.proof_authority !== "none" ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    certificateArtifact.sha256 !== boundaryRefs.certificateConsumptionArtifact.sha256 ||
    certificateArtifact.size_bytes !== boundaryRefs.certificateConsumptionArtifact.size_bytes ||
    verificationArtifact.sha256 !== boundaryRefs.verificationArtifact.sha256 ||
    verificationArtifact.size_bytes !== boundaryRefs.verificationArtifact.size_bytes ||
    attestationArtifact.sha256 !== boundaryRefs.attestationArtifact.sha256 ||
    attestationArtifact.size_bytes !== boundaryRefs.attestationArtifact.size_bytes ||
    sourceArchive.sha256 !== boundaryRefs.sourceArchiveArtifact.sha256 ||
    sourceArchive.size_bytes !== boundaryRefs.sourceArchiveArtifact.size_bytes ||
    operatorEvidence.sha256 !== boundaryRefs.operatorEvidenceArtifact.sha256 ||
    operatorEvidence.size_bytes !== boundaryRefs.operatorEvidenceArtifact.size_bytes
  ) {
    invalid("Goal 3 final release-candidate closure audit final signoff violates boundaries");
  }
}

export function recordGoal3FinalReleaseCandidateClosureAudit(
  projectRoot: string,
  input: Goal3FinalReleaseCandidateClosureAuditInput
): Goal3FinalReleaseCandidateClosureAudit {
  assertNoUnexpectedInputKeys(input);
  const projectId = assertSafeId(input.project_id, "project_id");
  const auditId = assertSafeId(input.final_release_candidate_closure_audit_id, "final_release_candidate_closure_audit_id");
  const requestedMode =
    input.requested_audit_mode ?? "open_formal_workbench_final_release_candidate_closure_audit";
  if (requestedMode !== "open_formal_workbench_final_release_candidate_closure_audit") {
    invalid("Goal 3 final release-candidate closure audit mode is invalid");
  }

  const auditPath = closureAuditPath(auditId);
  const absoluteAuditPath = assertPathAllowed(projectRoot, auditPath, { purpose: "runtime-write" });
  if (existsSync(absoluteAuditPath)) {
    throw new ComathError("Goal 3 final release-candidate closure audit already exists", {
      statusCode: 409,
      code: "GOAL3_FINAL_RELEASE_CANDIDATE_CLOSURE_AUDIT_ALREADY_EXISTS"
    });
  }

  const boundaryReviewId = assertSafeId(input.certification_boundary_review_id, "certification_boundary_review_id");
  const canonicalBoundaryReviewPath = boundaryReviewPath(boundaryReviewId);
  if (normalizeRelativePath(input.certification_boundary_review_path) !== canonicalBoundaryReviewPath) {
    invalid("Goal 3 final release-candidate closure audit boundary review path is not canonical");
  }
  const boundaryReview = readJsonArtifact<BoundaryReviewBody>(
    projectRoot,
    canonicalBoundaryReviewPath,
    input.certification_boundary_review_sha256,
    "goal3_final_release_signoff_certification_boundary_review"
  );
  const boundaryRefs = assertBoundaryReview(boundaryReview.body, projectId, boundaryReviewId, boundaryReview.artifact);

  const signoff = readJsonArtifact<FinalReleaseSignoffBody>(
    projectRoot,
    boundaryRefs.signoffArtifact.path,
    boundaryRefs.signoffArtifact.sha256,
    boundaryRefs.signoffArtifact.kind,
    boundaryRefs.signoffArtifact.size_bytes
  );
  assertFinalReleaseSignoff(signoff.body, projectId, boundaryRefs.signoffId, signoff.artifact, boundaryRefs);

  const certificateConsumption = readJsonArtifact<CertificateConsumptionBody>(
    projectRoot,
    boundaryRefs.certificateConsumptionArtifact.path,
    boundaryRefs.certificateConsumptionArtifact.sha256,
    boundaryRefs.certificateConsumptionArtifact.kind,
    boundaryRefs.certificateConsumptionArtifact.size_bytes
  );
  assertCertificateConsumption(
    certificateConsumption.body,
    projectId,
    boundaryRefs.certificateConsumptionId,
    certificateConsumption.artifact
  );

  const verification = readJsonArtifact<DurableTransportVerificationBody>(
    projectRoot,
    boundaryRefs.verificationArtifact.path,
    boundaryRefs.verificationArtifact.sha256,
    boundaryRefs.verificationArtifact.kind,
    boundaryRefs.verificationArtifact.size_bytes
  );
  assertDurableTransportVerification(
    projectRoot,
    verification.body,
    projectId,
    boundaryRefs.verificationId,
    verification.artifact,
    boundaryRefs.externalEvidenceArtifact
  );

  const externalEvidence = readJsonArtifact<ExternalDurableTransportEvidenceBody>(
    projectRoot,
    boundaryRefs.externalEvidenceArtifact.path,
    boundaryRefs.externalEvidenceArtifact.sha256,
    boundaryRefs.externalEvidenceArtifact.kind,
    boundaryRefs.externalEvidenceArtifact.size_bytes
  );
  assertExternalEvidence(
    externalEvidence.body,
    projectId,
    boundaryRefs.externalEvidenceId,
    externalEvidence.artifact,
    verification.body.service_route
  );

  const sourceAttestation = readJsonArtifact<SourceReleaseOsAttestationBody>(
    projectRoot,
    boundaryRefs.attestationArtifact.path,
    boundaryRefs.attestationArtifact.sha256,
    boundaryRefs.attestationArtifact.kind,
    boundaryRefs.attestationArtifact.size_bytes
  );
  assertSourceReleaseOsAttestation(
    projectRoot,
    sourceAttestation.body,
    projectId,
    boundaryRefs.attestationId,
    sourceAttestation.artifact,
    boundaryRefs.sourceArchiveArtifact,
    boundaryRefs.operatorEvidenceArtifact
  );
  readArtifactBytes(projectRoot, boundaryRefs.sourceArchiveArtifact, "source archive");

  const operatorEvidence = readJsonArtifact<OperatorEvidenceBody>(
    projectRoot,
    boundaryRefs.operatorEvidenceArtifact.path,
    boundaryRefs.operatorEvidenceArtifact.sha256,
    boundaryRefs.operatorEvidenceArtifact.kind,
    boundaryRefs.operatorEvidenceArtifact.size_bytes
  );
  assertOperatorEvidence(operatorEvidence.body, projectId, boundaryRefs.sourceArchiveArtifact);

  const actor = sanitizeActor(input.actor);
  const body = {
    schema_version: "comath.goal3_final_release_candidate_closure_audit.v1",
    final_release_candidate_closure_audit_id: auditId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    ok: true,
    final_release_candidate_closure_status: "audited_final_release_candidate_boundary_current",
    final_release_candidate_closure_audit_path: auditPath,
    requested_audit_mode: "open_formal_workbench_final_release_candidate_closure_audit",
    certification_boundary_review_id: boundaryReviewId,
    certification_boundary_review_path: boundaryReview.artifact.path,
    certification_boundary_review_artifact: boundaryReview.artifact,
    certification_boundary_review_current: true,
    certification_boundary_review_status: "reviewed_final_release_signoff_certification_boundary",
    final_release_signoff_id: boundaryRefs.signoffId,
    final_release_signoff_path: signoff.artifact.path,
    final_release_signoff_artifact: signoff.artifact,
    final_release_signoff_current: true,
    final_release_signoff_status: "ready_for_open_formal_workbench_final_release_signoff",
    ga_release_signoff_ready: true,
    ga_certificate_consumption_review_id: boundaryRefs.certificateConsumptionId,
    ga_certificate_consumption_review_artifact: certificateConsumption.artifact,
    ga_certificate_consumption_current: true,
    consumed_ga_certificate_can_certify_ga: true,
    durable_transport_signoff_verification_id: boundaryRefs.verificationId,
    durable_transport_signoff_verification_path: verification.artifact.path,
    durable_transport_signoff_verification_artifact: verification.artifact,
    durable_transport_signoff_verification_current: true,
    durable_transport_signoff_verification_status: "verified_external_durable_transport_primitive_bound",
    external_durable_transport_evidence_id: boundaryRefs.externalEvidenceId,
    external_durable_transport_evidence_artifact: externalEvidence.artifact,
    external_durable_transport_evidence_current: true,
    external_durable_transport_primitive_bound: true,
    durable_transport_provided: true,
    live_transport_open: true,
    source_release_os_immutability_attestation_id: boundaryRefs.attestationId,
    source_release_os_immutability_attestation_path: sourceAttestation.artifact.path,
    source_release_os_immutability_attestation_artifact: sourceAttestation.artifact,
    source_release_os_immutability_attestation_current: true,
    source_archive_artifact: boundaryRefs.sourceArchiveArtifact,
    source_archive_current: true,
    operator_evidence_artifact: operatorEvidence.artifact,
    operator_evidence_current: true,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    release_candidate_closure_audit_is_certificate: false,
    ga_certificate_issued: false,
    claim_promotion_requires_ordinary_gate: true
  } satisfies Omit<
    Goal3FinalReleaseCandidateClosureAudit,
    "final_release_candidate_closure_audit_artifact"
  >;

  const auditText = `${JSON.stringify(body, null, 2)}\n`;
  mkdirSync(dirname(absoluteAuditPath), { recursive: true });
  writeFileSync(absoluteAuditPath, auditText, "utf8");
  const result: Goal3FinalReleaseCandidateClosureAudit = {
    ...body,
    final_release_candidate_closure_audit_artifact: {
      kind: "goal3_final_release_candidate_closure_audit",
      path: auditPath,
      sha256: sha256Text(auditText),
      size_bytes: Buffer.byteLength(auditText, "utf8")
    }
  };

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.goal3_final_release_candidate_closure_audit_recorded",
    actor,
    target_id: projectId,
    payload: {
      final_release_candidate_closure_audit_id: auditId,
      final_release_candidate_closure_status: result.final_release_candidate_closure_status,
      final_release_candidate_closure_audit_path: auditPath,
      final_release_candidate_closure_audit_artifact_sha256:
        result.final_release_candidate_closure_audit_artifact.sha256,
      certification_boundary_review_id: boundaryReviewId,
      certification_boundary_review_artifact_sha256: boundaryReview.artifact.sha256,
      certification_boundary_review_current: true,
      final_release_signoff_id: boundaryRefs.signoffId,
      final_release_signoff_artifact_sha256: signoff.artifact.sha256,
      final_release_signoff_current: true,
      ga_release_signoff_ready: true,
      ga_certificate_consumption_review_id: boundaryRefs.certificateConsumptionId,
      ga_certificate_consumption_artifact_sha256: certificateConsumption.artifact.sha256,
      ga_certificate_consumption_current: true,
      durable_transport_signoff_verification_id: boundaryRefs.verificationId,
      durable_transport_signoff_verification_artifact_sha256: verification.artifact.sha256,
      durable_transport_signoff_verification_current: true,
      external_durable_transport_evidence_artifact_sha256: externalEvidence.artifact.sha256,
      external_durable_transport_evidence_current: true,
      source_release_os_immutability_attestation_id: boundaryRefs.attestationId,
      source_release_os_immutability_attestation_artifact_sha256: sourceAttestation.artifact.sha256,
      source_release_os_immutability_attestation_current: true,
      source_archive_artifact_sha256: boundaryRefs.sourceArchiveArtifact.sha256,
      source_archive_current: true,
      operator_evidence_artifact_sha256: operatorEvidence.artifact.sha256,
      operator_evidence_current: true,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false,
      release_candidate_closure_audit_is_certificate: false,
      ga_certificate_issued: false
    }
  });
  return result;
}
