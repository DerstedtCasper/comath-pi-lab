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

type Goal3FinalReleaseSignoffDecisionBody = {
  schema_version?: unknown;
  final_release_signoff_id?: unknown;
  project_id?: unknown;
  ok?: unknown;
  final_release_signoff_status?: unknown;
  final_release_signoff_path?: unknown;
  requested_signoff_mode?: unknown;
  blocker_reasons?: unknown;
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
  ga_certificate_consumption_available?: unknown;
  ga_certificate_consumption_review_id?: unknown;
  ga_certificate_consumption_review_artifact?: unknown;
  ga_certificate_consumption_current?: unknown;
  ga_certificate_available?: unknown;
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

type GaCertificateConsumptionBody = {
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
  requested_verification_mode?: unknown;
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
  provider_id?: unknown;
  provider_kind?: unknown;
  transport_primitive?: unknown;
  daemon_identity_sha256?: unknown;
  daemon_policy_sha256?: unknown;
  session_policy_sha256?: unknown;
  provider_attestation_sha256?: unknown;
  operator_session_id?: unknown;
  agent_run_id?: unknown;
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

type DurableTransportPrerequisiteBody = {
  schema_version?: unknown;
  durable_transport_signoff_prerequisite_id?: unknown;
  project_id?: unknown;
  ok?: unknown;
  durable_transport_signoff_status?: unknown;
  blocker_reasons?: unknown;
  durable_transport_signoff_prerequisite_path?: unknown;
  requested_review_mode?: unknown;
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
  terminal_unattended_completion_certified?: unknown;
  completion_certificate_available?: unknown;
  unattended_real_host_execution_completed?: unknown;
  maintained_transport_primitive_bound?: unknown;
  service_route_bound?: unknown;
  client_fetch_contract_bound?: unknown;
  service_transport_primitive?: unknown;
  client_transport_primitive?: unknown;
  durable_transport_provided?: unknown;
  live_transport_open?: unknown;
  indefinite_stream_open?: unknown;
  long_lived_websocket_provided?: unknown;
  long_lived_sse_provided?: unknown;
  pi_direct_write_allowed?: unknown;
  direct_trusted_state_mutation?: unknown;
  proof_authority?: unknown;
  can_promote_claim?: unknown;
  can_certify_ga?: unknown;
  ga_certification_gate_separate?: unknown;
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
  daemon_identity_sha256?: unknown;
  daemon_policy_sha256?: unknown;
  session_policy_sha256?: unknown;
  provider_attestation_sha256?: unknown;
  operator_session_id?: unknown;
  agent_run_id?: unknown;
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
  provider_id?: unknown;
  receipt_id?: unknown;
  os_immutability_attestation_performed?: unknown;
  os_immutability_result?: unknown;
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

type PolicyInspectionBody = {
  schema_version?: unknown;
  inspection_id?: unknown;
  verification_id?: unknown;
  verification_sha256?: unknown;
  verification_artifact?: unknown;
  project_id?: unknown;
  ok?: unknown;
  evidence_kind?: unknown;
  operator_evidence_artifact?: unknown;
  operator_evidence_current?: unknown;
  source_archive?: unknown;
  source_archive_current?: unknown;
  provider_id?: unknown;
  receipt_id?: unknown;
  proof_authority?: unknown;
  can_promote_claim?: unknown;
  can_certify_ga?: unknown;
};

type OperatorEvidenceBody = {
  schema_version?: unknown;
  verification_id?: unknown;
  project_id?: unknown;
  ok?: unknown;
  evidence_kind?: unknown;
  source_archive?: unknown;
  source_archive_current?: unknown;
  provider_id?: unknown;
  receipt_id?: unknown;
  proof_authority?: unknown;
  can_promote_claim?: unknown;
  can_certify_ga?: unknown;
};

export type Goal3FinalReleaseSignoffCertificationBoundaryReviewInput = {
  project_id: string;
  certification_boundary_review_id?: string;
  actor?: string;
  final_release_signoff_id: string;
  final_release_signoff_path: string;
  final_release_signoff_sha256: string;
  requested_review_mode?: "open_formal_workbench_final_release_signoff_certification_boundary_review";
};

export type Goal3FinalReleaseSignoffCertificationBoundaryReview = {
  schema_version: "comath.goal3_final_release_signoff_certification_boundary_review.v1";
  certification_boundary_review_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  ok: true;
  certification_boundary_review_status: "reviewed_final_release_signoff_certification_boundary";
  certification_boundary_review_path: string;
  requested_review_mode: "open_formal_workbench_final_release_signoff_certification_boundary_review";
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
  boundary_review_is_certificate: false;
  ga_certificate_issued: false;
  claim_promotion_requires_ordinary_gate: true;
  final_release_signoff_certification_boundary_review_artifact: ArtifactReference;
};

const invalidCode = "GOAL3_FINAL_RELEASE_SIGNOFF_CERTIFICATION_BOUNDARY_REVIEW_INVALID";
const staleCode = "GOAL3_FINAL_RELEASE_SIGNOFF_CERTIFICATION_BOUNDARY_REVIEW_STALE";
const allowedInputKeys = new Set([
  "project_id",
  "certification_boundary_review_id",
  "actor",
  "final_release_signoff_id",
  "final_release_signoff_path",
  "final_release_signoff_sha256",
  "requested_review_mode"
]);

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function reviewPath(reviewId: string): string {
  return normalizeRelativePath(
    join(
      ".comath",
      "release",
      "goal3-final-release-signoff-certification-boundary-review",
      reviewId,
      "review.json"
    )
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
    join(
      ".comath",
      "release",
      "goal3-durable-transport-release-signoff-verification",
      verificationId,
      "verification.json"
    )
  );
}

function durableTransportPrerequisitePath(prerequisiteId: string): string {
  return normalizeRelativePath(
    join(
      ".comath",
      "release",
      "goal3-durable-transport-release-signoff-prerequisite",
      prerequisiteId,
      "prerequisite.json"
    )
  );
}

function externalDurableTransportEvidencePath(evidenceId: string): string {
  return normalizeRelativePath(
    join(
      ".comath",
      "release",
      "goal3-external-durable-transport-evidence",
      evidenceId,
      "external-durable-transport-evidence.json"
    )
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
  throw new ComathError(message, {
    statusCode: 400,
    code: invalidCode
  });
}

function stale(message: string): never {
  throw new ComathError(message, {
    statusCode: 400,
    code: staleCode
  });
}

function assertNoUnexpectedInputKeys(input: Goal3FinalReleaseSignoffCertificationBoundaryReviewInput): void {
  for (const key of Object.keys(input as Record<string, unknown>)) {
    if (!allowedInputKeys.has(key)) {
      invalid(`Goal 3 final release signoff certification boundary review input field is not allowed: ${key}`);
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
    stale("Goal 3 final release signoff certification boundary review referenced material is stale");
  }
  return sha256;
}

function sanitizeActor(value: string | undefined): string {
  return (value ?? "goal3-final-release-signoff-certification-boundary-review")
    .replace(/(?:[A-Za-z]:[\\/][^\s"']+|\\\\[^\s"']+)/gu, "[redacted-path]")
    .replace(/(?:Authorization:\s*Bearer\s+\S+|api_key=\S+|token=\S+|sk-[A-Za-z0-9_-]+)/giu, "[redacted-secret]")
    .replace(
      /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|kernel_checked|proof_success|GA certified|ga_release_signoff_ready\s*[:=]\s*(?:true|1)|can_certify_ga\s*[:=]\s*(?:true|1)|can_promote_claim\s*[:=]\s*(?:true|1))\b/giu,
      "[redacted-authority-claim]"
    )
    .replace(
      /\b(?:long[- ]lived\s+(?:websocket|sse)|indefinite\s+sse|terminal transport recovered live|durable transport provided|live transport open)\b/giu,
      "[redacted-transport-claim]"
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
    invalid(`Goal 3 final release signoff certification boundary review ${label} is not project-relative`);
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
    invalid(`Goal 3 final release signoff certification boundary review ${label} reference is invalid`);
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
  const path = assertProjectRelativePath(canonicalPath, "artifact path");
  const absolutePath = assertPathAllowed(projectRoot, path, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    stale("Goal 3 final release signoff certification boundary review referenced artifact is stale");
  }
  const content = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(content);
  if (actualSha256 !== assertSha256(expectedSha256)) {
    stale("Goal 3 final release signoff certification boundary review referenced artifact hash is stale");
  }
  if (expectedSizeBytes !== undefined && content.byteLength !== expectedSizeBytes) {
    stale("Goal 3 final release signoff certification boundary review referenced artifact size is stale");
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
    invalid("Goal 3 final release signoff certification boundary review referenced JSON is invalid");
  }
}

function readArtifactBytes(projectRoot: string, artifact: ArtifactReference, label: string): Buffer {
  const absolutePath = assertPathAllowed(projectRoot, artifact.path, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    stale(`Goal 3 final release signoff certification boundary review ${label} is stale`);
  }
  const bytes = readFileSync(absolutePath);
  if (sha256Bytes(bytes) !== artifact.sha256 || bytes.byteLength !== artifact.size_bytes) {
    stale(`Goal 3 final release signoff certification boundary review ${label} bytes are stale`);
  }
  return bytes;
}

function assertJsonArtifactBody<T extends Record<string, unknown>>(projectRoot: string, artifact: ArtifactReference, label: string): T {
  const bytes = readArtifactBytes(projectRoot, artifact, label);
  try {
    const body = JSON.parse(bytes.toString("utf8")) as unknown;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      invalid(`Goal 3 final release signoff certification boundary review ${label} JSON is invalid`);
    }
    return body as T;
  } catch {
    invalid(`Goal 3 final release signoff certification boundary review ${label} JSON is invalid`);
  }
}

function assertSha256String(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/u.test(value)) {
    invalid(`Goal 3 final release signoff certification boundary review ${label} hash is invalid`);
  }
  return value;
}

function assertFreshTransportEvidence(freshUntilValue: unknown, freshnessWindowValue: unknown, label: string): void {
  const freshUntil = typeof freshUntilValue === "string" ? freshUntilValue.trim() : "";
  const freshnessWindowSeconds = freshnessWindowValue;
  const freshUntilMs = Date.parse(freshUntil);
  if (
    !freshUntil ||
    !Number.isFinite(freshUntilMs) ||
    typeof freshnessWindowSeconds !== "number" ||
    !Number.isSafeInteger(freshnessWindowSeconds) ||
    freshnessWindowSeconds <= 0 ||
    freshnessWindowSeconds > 30 * 24 * 60 * 60
  ) {
    invalid(`Goal 3 final release signoff certification boundary review ${label} freshness metadata is invalid`);
  }
  const now = Date.now();
  if (freshUntilMs <= now) {
    stale(`Goal 3 final release signoff certification boundary review ${label} has expired`);
  }
  if (freshUntilMs > now + freshnessWindowSeconds * 1000) {
    invalid(`Goal 3 final release signoff certification boundary review ${label} exceeds its declared freshness window`);
  }
}

function sourceArchiveReference(value: unknown): ArtifactReference {
  const archive = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const archivePath = typeof archive.archive_path === "string" ? assertProjectRelativePath(archive.archive_path, "source archive path") : "";
  const archiveSha256 = typeof archive.archive_sha256 === "string" ? archive.archive_sha256.trim().toLowerCase() : "";
  const sizeBytes = archive.size_bytes;
  if (
    !archivePath ||
    !/^[a-f0-9]{64}$/u.test(archiveSha256) ||
    typeof sizeBytes !== "number" ||
    !Number.isSafeInteger(sizeBytes) ||
    sizeBytes <= 0
  ) {
    invalid("Goal 3 final release signoff certification boundary review source archive reference is invalid");
  }
  return {
    kind: "goal3_source_release_source_archive",
    path: archivePath,
    sha256: archiveSha256,
    size_bytes: sizeBytes
  };
}

function assertReadyFinalReleaseSignoff(
  body: Goal3FinalReleaseSignoffDecisionBody,
  projectId: string,
  signoffId: string,
  artifact: ArtifactReference
): void {
  const blockers = Array.isArray(body.blocker_reasons) ? body.blocker_reasons : [];
  if (
    body.schema_version !== "comath.goal3_final_release_signoff_decision.v1" ||
    body.final_release_signoff_id !== signoffId ||
    body.project_id !== projectId ||
    body.ok !== true ||
    body.final_release_signoff_status !== "ready_for_open_formal_workbench_final_release_signoff" ||
    body.final_release_signoff_path !== artifact.path ||
    body.requested_signoff_mode !== "open_formal_workbench_final_release_signoff_decision" ||
    blockers.length !== 0 ||
    body.durable_transport_signoff_verification_available !== true ||
    body.durable_transport_signoff_verification_current !== true ||
    body.durable_transport_signoff_verification_status !== "verified_external_durable_transport_primitive_bound" ||
    body.source_release_os_immutability_attestation_current !== true ||
    body.source_archive_current !== true ||
    body.operator_evidence_current !== true ||
    body.ga_certificate_consumption_available !== true ||
    body.ga_certificate_consumption_current !== true ||
    body.ga_certificate_available !== true ||
    body.external_durable_transport_evidence_bound !== true ||
    body.external_durable_transport_primitive_bound !== true ||
    body.service_transport_primitive !== "node_http_agent_run_log_session_route" ||
    body.client_transport_primitive !== "pi_fetch_get_text" ||
    body.durable_transport_provided !== true ||
    body.live_transport_open !== true ||
    body.ga_release_signoff_ready !== true ||
    body.proof_authority !== "none" ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false
  ) {
    invalid("Goal 3 final release signoff certification boundary review requires a ready non-authoritative Task320 final signoff decision");
  }
}

function assertGaCertificateConsumption(
  projectRoot: string,
  artifact: ArtifactReference,
  projectId: string,
  expectedReviewId: string
): ArtifactReference {
  const canonicalPath = certificateConsumptionPath(expectedReviewId);
  if (artifact.path !== canonicalPath) {
    invalid("Goal 3 final release signoff certification boundary review GA certificate consumption path is not canonical");
  }
  const read = readJsonArtifact<GaCertificateConsumptionBody>(
    projectRoot,
    canonicalPath,
    artifact.sha256,
    artifact.kind,
    artifact.size_bytes
  );
  if (
    read.artifact.kind !== "goal3_ga_certificate_consumption_review" ||
    read.body.schema_version !== "comath.goal3_ga_certificate_consumption_review.v1" ||
    read.body.ga_certificate_consumption_review_id !== expectedReviewId ||
    read.body.project_id !== projectId ||
    read.body.ok !== true ||
    read.body.release_closure_status !== "publishable_workbench_release_candidate_source_bound" ||
    read.body.ga_certificate_consumption_review_path !== canonicalPath ||
    read.body.ga_certificate_current !== true ||
    read.body.ga_certificate_consumed !== true ||
    read.body.final_ga_audit_current !== true ||
    read.body.final_ga_audit_passed !== true ||
    read.body.proof_breadth_complete !== true ||
    read.body.operational_readiness_review_current !== true ||
    read.body.operational_readiness_status !== "ready_for_ga_release_candidate_review" ||
    read.body.ga_certificate_available !== true ||
    read.body.proof_authority !== "lean_kernel_clean_replay" ||
    read.body.can_promote_claim !== false ||
    read.body.can_certify_ga !== true ||
    read.body.claim_promotion_requires_ordinary_gate !== true
  ) {
    invalid("Goal 3 final release signoff certification boundary review GA certificate consumption violates boundaries");
  }
  return read.artifact;
}

function assertTransportNoAuthority(value: Record<string, unknown>, label: string): void {
  if (
    value.proof_authority !== "none" ||
    value.can_promote_claim !== false ||
    value.can_certify_ga !== false ||
    value.durable_transport_provided !== false ||
    value.live_transport_open !== false ||
    (value.indefinite_stream_open !== undefined && value.indefinite_stream_open !== false) ||
    (value.long_lived_websocket_provided !== undefined && value.long_lived_websocket_provided !== false) ||
    (value.long_lived_sse_provided !== undefined && value.long_lived_sse_provided !== false) ||
    (value.pi_direct_write_allowed !== undefined && value.pi_direct_write_allowed !== false) ||
    (value.direct_trusted_state_mutation !== undefined && value.direct_trusted_state_mutation !== false)
  ) {
    invalid(`Goal 3 final release signoff certification boundary review ${label} violates Task317 transport boundaries`);
  }
}

function closureServiceRoute(body: Record<string, unknown>): string {
  const serviceRoute = typeof body.service_route === "string" ? body.service_route.trim() : "";
  if (!/^\/agent\/run\/[A-Za-z0-9._-]+\/log-session$/u.test(serviceRoute)) {
    invalid("Goal 3 final release signoff certification boundary review transport closure route is invalid");
  }
  return serviceRoute;
}

function assertTask317PrerequisiteCurrent(
  projectRoot: string,
  artifact: ArtifactReference,
  projectId: string,
  expectedPrerequisiteId: string
): {
  prerequisiteArtifact: ArtifactReference;
  operational: ArtifactReference;
  closure: ArtifactReference;
  terminalCertificate: ArtifactReference;
  durableContract: ArtifactReference;
  continuity: ArtifactReference;
  contract: ArtifactReference;
  serviceRoute: string;
} {
  const canonicalPath = durableTransportPrerequisitePath(expectedPrerequisiteId);
  if (artifact.path !== canonicalPath) {
    invalid("Goal 3 final release signoff certification boundary review durable transport prerequisite path is not canonical");
  }
  const prerequisite = readJsonArtifact<DurableTransportPrerequisiteBody>(
    projectRoot,
    canonicalPath,
    artifact.sha256,
    artifact.kind,
    artifact.size_bytes
  );
  const blockers = Array.isArray(prerequisite.body.blocker_reasons) ? prerequisite.body.blocker_reasons : [];
  if (
    prerequisite.artifact.kind !== "goal3_durable_transport_release_signoff_prerequisite" ||
    prerequisite.body.schema_version !== "comath.goal3_durable_transport_release_signoff_prerequisite.v1" ||
    prerequisite.body.durable_transport_signoff_prerequisite_id !== expectedPrerequisiteId ||
    prerequisite.body.project_id !== projectId ||
    prerequisite.body.ok !== false ||
    prerequisite.body.durable_transport_signoff_status !== "blocked_durable_long_lived_transport_not_provided" ||
    !blockers.includes("durable_long_lived_transport_not_provided") ||
    prerequisite.body.durable_transport_signoff_prerequisite_path !== canonicalPath ||
    prerequisite.body.requested_review_mode !== "open_formal_workbench_durable_transport_release_signoff_prerequisite" ||
    prerequisite.body.operational_readiness_review_current !== true ||
    prerequisite.body.transport_closure_review_current !== true ||
    prerequisite.body.terminal_completion_certificate_current !== true ||
    prerequisite.body.durable_transport_contract_current !== true ||
    prerequisite.body.transport_continuity_current !== true ||
    prerequisite.body.transport_contract_current !== true ||
    prerequisite.body.terminal_unattended_completion_certified !== true ||
    prerequisite.body.completion_certificate_available !== true ||
    prerequisite.body.unattended_real_host_execution_completed !== true ||
    prerequisite.body.maintained_transport_primitive_bound !== true ||
    prerequisite.body.service_route_bound !== true ||
    prerequisite.body.client_fetch_contract_bound !== true ||
    prerequisite.body.service_transport_primitive !== "node_http_agent_run_log_session_route" ||
    prerequisite.body.client_transport_primitive !== "pi_fetch_get_text" ||
    prerequisite.body.ga_certification_gate_separate !== true
  ) {
    invalid("Goal 3 final release signoff certification boundary review Task317 prerequisite violates boundaries");
  }
  assertTransportNoAuthority(prerequisite.body as Record<string, unknown>, "Task317 prerequisite");
  const refs = {
    operational: artifactReference(
      prerequisite.body.operational_readiness_review_artifact,
      "operational readiness",
      "goal3_ga_operational_readiness_review"
    ),
    closure: artifactReference(
      prerequisite.body.transport_closure_review_artifact,
      "transport closure",
      "operator_service_transport_closure_review"
    ),
    terminalCertificate: artifactReference(
      prerequisite.body.terminal_completion_certificate_artifact,
      "terminal completion certificate",
      "unattended_real_host_terminal_completion_certificate"
    ),
    durableContract: artifactReference(
      prerequisite.body.durable_transport_contract_artifact,
      "durable transport contract",
      "unattended_real_host_durable_transport_contract"
    ),
    continuity: artifactReference(
      prerequisite.body.transport_continuity_artifact,
      "transport continuity",
      "operator_service_transport_continuity"
    ),
    contract: artifactReference(
      prerequisite.body.transport_contract_artifact,
      "transport contract",
      "operator_service_transport_contract"
    )
  };
  const operational = assertJsonArtifactBody<Record<string, unknown>>(projectRoot, refs.operational, "operational readiness");
  const closure = assertJsonArtifactBody<Record<string, unknown>>(projectRoot, refs.closure, "transport closure");
  const terminalCertificate = assertJsonArtifactBody<Record<string, unknown>>(
    projectRoot,
    refs.terminalCertificate,
    "terminal completion certificate"
  );
  const durableContract = assertJsonArtifactBody<Record<string, unknown>>(projectRoot, refs.durableContract, "durable transport contract");
  const continuity = assertJsonArtifactBody<Record<string, unknown>>(projectRoot, refs.continuity, "transport continuity");
  const contract = assertJsonArtifactBody<Record<string, unknown>>(projectRoot, refs.contract, "transport contract");
  assertTransportNoAuthority(operational, "operational readiness");
  assertTransportNoAuthority(closure, "transport closure");
  assertTransportNoAuthority(terminalCertificate, "terminal completion certificate");
  assertTransportNoAuthority(durableContract, "durable transport contract");
  assertTransportNoAuthority(continuity, "transport continuity");
  assertTransportNoAuthority(contract, "transport contract");
  return {
    prerequisiteArtifact: prerequisite.artifact,
    ...refs,
    serviceRoute: closureServiceRoute(closure)
  };
}

function assertExternalDurableTransportEvidence(
  projectRoot: string,
  artifact: ArtifactReference,
  body: DurableTransportVerificationBody,
  projectId: string,
  expectedServiceRoute: string
): ArtifactReference {
  const evidenceId = assertSafeId(
    typeof body.external_durable_transport_evidence_id === "string"
      ? body.external_durable_transport_evidence_id
      : undefined,
    "external_durable_transport_evidence_id"
  );
  const canonicalPath = externalDurableTransportEvidencePath(evidenceId);
  if (artifact.path !== canonicalPath) {
    invalid("Goal 3 final release signoff certification boundary review external durable transport evidence path is not canonical");
  }
  const evidence = readJsonArtifact<ExternalDurableTransportEvidenceBody>(
    projectRoot,
    canonicalPath,
    artifact.sha256,
    artifact.kind,
    artifact.size_bytes
  );
  const providerId = typeof evidence.body.provider_id === "string" ? evidence.body.provider_id.trim() : "";
  const operatorSessionId =
    typeof evidence.body.operator_session_id === "string" ? evidence.body.operator_session_id.trim() : "";
  const agentRunId = typeof evidence.body.agent_run_id === "string" ? evidence.body.agent_run_id.trim() : "";
  const serviceRoute = typeof evidence.body.service_route === "string" ? evidence.body.service_route.trim() : "";
  assertFreshTransportEvidence(evidence.body.fresh_until, evidence.body.freshness_window_seconds, "external durable transport evidence");
  if (
    evidence.artifact.kind !== "goal3_external_durable_transport_evidence" ||
    evidence.body.schema_version !== "comath.goal3_external_durable_transport_evidence.v1" ||
    evidence.body.external_durable_transport_evidence_id !== body.external_durable_transport_evidence_id ||
    evidence.body.project_id !== projectId ||
    evidence.body.ok !== true ||
    evidence.body.evidence_status !== "external_durable_transport_primitive_available" ||
    evidence.body.evidence_path !== artifact.path ||
    evidence.body.provider_id !== body.provider_id ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]{2,120}$/u.test(providerId) ||
    /(?:comath|custom|ad[-_ ]?hoc)/iu.test(providerId) ||
    evidence.body.provider_kind !== "maintained_external_operator_transport" ||
    evidence.body.transport_primitive !== "external_reconnectable_operator_session" ||
    evidence.body.maintenance_source !== "external_maintained_primitive" ||
    evidence.body.daemon_identity_sha256 !== body.daemon_identity_sha256 ||
    evidence.body.daemon_policy_sha256 !== body.daemon_policy_sha256 ||
    evidence.body.session_policy_sha256 !== body.session_policy_sha256 ||
    evidence.body.provider_attestation_sha256 !== body.provider_attestation_sha256 ||
    evidence.body.operator_session_id !== body.operator_session_id ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{2,140}$/u.test(operatorSessionId) ||
    evidence.body.agent_run_id !== body.agent_run_id ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{2,140}$/u.test(agentRunId) ||
    evidence.body.service_route !== body.service_route ||
    serviceRoute !== `/agent/run/${agentRunId}/log-session` ||
    evidence.body.service_route !== expectedServiceRoute ||
    evidence.body.service_transport_primitive !== "node_http_agent_run_log_session_route" ||
    evidence.body.client_transport_primitive !== "pi_fetch_get_text" ||
    evidence.body.fresh_until !== body.fresh_until ||
    evidence.body.freshness_window_seconds !== body.freshness_window_seconds ||
    evidence.body.reconnect_policy !== "external_provider_reconnect_required" ||
    evidence.body.external_durable_transport_primitive_bound !== true ||
    evidence.body.durable_transport_provided !== true ||
    evidence.body.live_transport_open !== true ||
    evidence.body.co_math_transport_stack_built !== false ||
    evidence.body.co_math_websocket_stack_built !== false ||
    evidence.body.custom_transport_implementation !== false ||
    evidence.body.indefinite_stream_open !== false ||
    evidence.body.long_lived_websocket_provided !== false ||
    evidence.body.long_lived_sse_provided !== false ||
    evidence.body.pi_direct_write_allowed !== false ||
    evidence.body.direct_trusted_state_mutation !== false ||
    evidence.body.proof_authority !== "none" ||
    evidence.body.can_promote_claim !== false ||
    evidence.body.can_certify_ga !== false
  ) {
    invalid("Goal 3 final release signoff certification boundary review external durable transport evidence violates boundaries");
  }
  return evidence.artifact;
}

function assertDurableTransportVerification(
  projectRoot: string,
  artifact: ArtifactReference,
  projectId: string,
  expectedVerificationId: string
): { verificationArtifact: ArtifactReference; externalEvidenceArtifact: ArtifactReference } {
  const canonicalPath = durableTransportVerificationPath(expectedVerificationId);
  if (artifact.path !== canonicalPath) {
    invalid("Goal 3 final release signoff certification boundary review durable transport verification path is not canonical");
  }
  const read = readJsonArtifact<DurableTransportVerificationBody>(
    projectRoot,
    canonicalPath,
    artifact.sha256,
    artifact.kind,
    artifact.size_bytes
  );
  const blockers = Array.isArray(read.body.blocker_reasons) ? read.body.blocker_reasons : [];
  const prerequisiteId = assertSafeId(
    typeof read.body.durable_transport_signoff_prerequisite_id === "string"
      ? read.body.durable_transport_signoff_prerequisite_id
      : undefined,
    "durable_transport_signoff_prerequisite_id"
  );
  if (read.body.durable_transport_signoff_prerequisite_path !== durableTransportPrerequisitePath(prerequisiteId)) {
    invalid("Goal 3 final release signoff certification boundary review durable transport prerequisite path is not canonical");
  }
  const prerequisiteChain = assertTask317PrerequisiteCurrent(
    projectRoot,
    artifactReference(
      read.body.durable_transport_signoff_prerequisite_artifact,
      "durable transport prerequisite",
      "goal3_durable_transport_release_signoff_prerequisite"
    ),
    projectId,
    prerequisiteId
  );
  if (
    read.artifact.kind !== "goal3_durable_transport_release_signoff_verification" ||
    read.body.schema_version !== "comath.goal3_durable_transport_release_signoff_verification.v1" ||
    read.body.durable_transport_signoff_verification_id !== expectedVerificationId ||
    read.body.project_id !== projectId ||
    read.body.ok !== true ||
    read.body.durable_transport_signoff_verification_status !== "verified_external_durable_transport_primitive_bound" ||
    blockers.length !== 0 ||
    read.body.durable_transport_signoff_verification_path !== canonicalPath ||
    read.body.requested_verification_mode !== "open_formal_workbench_durable_transport_release_signoff_verification" ||
    read.body.durable_transport_signoff_prerequisite_current !== true ||
    read.body.durable_transport_signoff_status !== "blocked_durable_long_lived_transport_not_provided" ||
    read.body.operational_readiness_review_current !== true ||
    read.body.transport_closure_review_current !== true ||
    read.body.terminal_completion_certificate_current !== true ||
    read.body.durable_transport_contract_current !== true ||
    read.body.transport_continuity_current !== true ||
    read.body.transport_contract_current !== true ||
    read.body.external_durable_transport_evidence_bound !== true ||
    read.body.external_durable_transport_evidence_current !== true ||
    read.body.external_durable_transport_primitive_bound !== true ||
    read.body.provider_kind !== "maintained_external_operator_transport" ||
    read.body.transport_primitive !== "external_reconnectable_operator_session" ||
    read.body.service_transport_primitive !== "node_http_agent_run_log_session_route" ||
    read.body.client_transport_primitive !== "pi_fetch_get_text" ||
    read.body.durable_transport_provided !== true ||
    read.body.live_transport_open !== true ||
    read.body.co_math_transport_stack_built !== false ||
    read.body.co_math_websocket_stack_built !== false ||
    read.body.custom_transport_implementation !== false ||
    read.body.indefinite_stream_open !== false ||
    read.body.long_lived_websocket_provided !== false ||
    read.body.long_lived_sse_provided !== false ||
    read.body.pi_direct_write_allowed !== false ||
    read.body.direct_trusted_state_mutation !== false ||
    read.body.ga_release_signoff_ready !== false ||
    read.body.proof_authority !== "none" ||
    read.body.can_promote_claim !== false ||
    read.body.can_certify_ga !== false
  ) {
    invalid("Goal 3 final release signoff certification boundary review durable transport verification violates boundaries");
  }
  for (const [value, label, expected] of [
    [read.body.operational_readiness_review_artifact, "operational readiness", prerequisiteChain.operational],
    [read.body.transport_closure_review_artifact, "transport closure", prerequisiteChain.closure],
    [read.body.terminal_completion_certificate_artifact, "terminal completion certificate", prerequisiteChain.terminalCertificate],
    [read.body.durable_transport_contract_artifact, "durable transport contract", prerequisiteChain.durableContract],
    [read.body.transport_continuity_artifact, "transport continuity", prerequisiteChain.continuity],
    [read.body.transport_contract_artifact, "transport contract", prerequisiteChain.contract]
  ] as const) {
    const actual = artifactReference(value, label, expected.kind, expected.path);
    if (actual.sha256 !== expected.sha256 || actual.size_bytes !== expected.size_bytes) {
      invalid(`Goal 3 final release signoff certification boundary review ${label} does not match Task317 prerequisite`);
    }
  }
  if (read.body.service_route !== prerequisiteChain.serviceRoute) {
    invalid("Goal 3 final release signoff certification boundary review durable transport route does not match Task317 closure");
  }
  assertFreshTransportEvidence(read.body.fresh_until, read.body.freshness_window_seconds, "durable transport verification");
  assertSha256String(read.body.daemon_identity_sha256, "durable transport daemon identity");
  assertSha256String(read.body.daemon_policy_sha256, "durable transport daemon policy");
  assertSha256String(read.body.session_policy_sha256, "durable transport session policy");
  assertSha256String(read.body.provider_attestation_sha256, "durable transport provider attestation");
  const evidenceArtifact = artifactReference(
    read.body.external_durable_transport_evidence_artifact,
    "external durable transport evidence",
    "goal3_external_durable_transport_evidence"
  );
  return {
    verificationArtifact: read.artifact,
    externalEvidenceArtifact: assertExternalDurableTransportEvidence(
      projectRoot,
      evidenceArtifact,
      read.body,
      projectId,
      prerequisiteChain.serviceRoute
    )
  };
}

function assertSourceReleaseOsAttestation(
  projectRoot: string,
  artifact: ArtifactReference,
  projectId: string,
  expectedAttestationId: string,
  expectedSourceArchive: ArtifactReference,
  expectedOperatorEvidence: ArtifactReference
): { attestationArtifact: ArtifactReference; sourceArchiveArtifact: ArtifactReference; operatorEvidenceArtifact: ArtifactReference } {
  const canonicalPath = sourceReleaseOsAttestationPath(expectedAttestationId);
  if (artifact.path !== canonicalPath) {
    invalid("Goal 3 final release signoff certification boundary review source-release OS attestation path is not canonical");
  }
  const read = readJsonArtifact<SourceReleaseOsAttestationBody>(
    projectRoot,
    canonicalPath,
    artifact.sha256,
    artifact.kind,
    artifact.size_bytes
  );
  const attestationSourceArchive = sourceArchiveReference(read.body.source_archive);
  const policyInspection = artifactReference(
    read.body.policy_inspection_artifact,
    "policy inspection",
    "goal3_source_release_external_provider_policy_inspection"
  );
  const policyInspectionBody = assertJsonArtifactBody<PolicyInspectionBody>(projectRoot, policyInspection, "policy inspection");
  const operatorEvidence = artifactReference(
    read.body.operator_evidence_artifact,
    "operator evidence",
    "goal3_source_release_external_provider_verification",
    expectedOperatorEvidence.path
  );
  if (
    read.artifact.kind !== "goal3_source_release_os_immutability_attestation" ||
    read.body.schema_version !== "comath.goal3_source_release_os_immutability_attestation.v1" ||
    read.body.attestation_id !== expectedAttestationId ||
    read.body.project_id !== projectId ||
    read.body.ok !== true ||
    read.body.os_immutability_attestation_status !== "os_immutability_attested" ||
    read.body.attestation_path !== canonicalPath ||
    read.body.policy_inspection_current !== true ||
    read.body.source_archive_current !== true ||
    read.body.evidence_kind !== "os_immutable_storage" ||
    read.body.operator_evidence_current !== true ||
    read.body.os_immutability_attestation_performed !== true ||
    read.body.os_immutability_result !== "provider_attested" ||
    read.body.provider_os_immutability_attestation_bound !== true ||
    read.body.co_math_os_immutability_enforced !== false ||
    read.body.proof_authority !== "none" ||
    read.body.can_restore !== false ||
    read.body.can_promote_claim !== false ||
    read.body.can_certify_ga !== false ||
    read.body.storage_is_proof_authority !== false ||
    read.body.attestation_is_proof_authority !== false ||
    read.body.attestation_is_restore_source !== false ||
    read.body.result_can_be_used_as_proof !== false ||
    read.body.requires_separate_lean_authority !== true ||
    read.body.public_archive_review_ok !== true ||
    read.body.policy_inspection_id !== policyInspectionBody.inspection_id ||
    read.body.policy_inspection_path !== policyInspection.path ||
    String(read.body.policy_inspection_sha256 ?? "").trim().toLowerCase() !== policyInspection.sha256 ||
    read.body.verification_id !== policyInspectionBody.verification_id ||
    String(read.body.verification_sha256 ?? "").trim().toLowerCase() !== operatorEvidence.sha256 ||
    policyInspectionBody.verification_sha256 !== operatorEvidence.sha256 ||
    policyInspectionBody.project_id !== projectId ||
    policyInspectionBody.ok !== true ||
    policyInspectionBody.evidence_kind !== "os_immutable_storage" ||
    policyInspectionBody.operator_evidence_current !== true ||
    policyInspectionBody.source_archive_current !== true ||
    policyInspectionBody.provider_id !== read.body.provider_id ||
    policyInspectionBody.receipt_id !== read.body.receipt_id ||
    policyInspectionBody.proof_authority !== "none" ||
    policyInspectionBody.can_promote_claim !== false ||
    policyInspectionBody.can_certify_ga !== false ||
    attestationSourceArchive.path !== expectedSourceArchive.path ||
    attestationSourceArchive.sha256 !== expectedSourceArchive.sha256 ||
    attestationSourceArchive.size_bytes !== expectedSourceArchive.size_bytes ||
    operatorEvidence.sha256 !== expectedOperatorEvidence.sha256 ||
    operatorEvidence.size_bytes !== expectedOperatorEvidence.size_bytes
  ) {
    invalid("Goal 3 final release signoff certification boundary review source-release OS attestation violates boundaries");
  }
  const policyOperatorEvidence = artifactReference(
    policyInspectionBody.operator_evidence_artifact,
    "policy operator evidence",
    "goal3_source_release_external_provider_verification",
    operatorEvidence.path
  );
  const policyVerification = artifactReference(
    policyInspectionBody.verification_artifact,
    "policy verification",
    "goal3_source_release_external_provider_verification",
    operatorEvidence.path
  );
  const policySourceArchive = sourceArchiveReference(policyInspectionBody.source_archive);
  if (
    policyOperatorEvidence.sha256 !== operatorEvidence.sha256 ||
    policyOperatorEvidence.size_bytes !== operatorEvidence.size_bytes ||
    policyVerification.sha256 !== operatorEvidence.sha256 ||
    policyVerification.size_bytes !== operatorEvidence.size_bytes ||
    policySourceArchive.path !== expectedSourceArchive.path ||
    policySourceArchive.sha256 !== expectedSourceArchive.sha256 ||
    policySourceArchive.size_bytes !== expectedSourceArchive.size_bytes
  ) {
    invalid("Goal 3 final release signoff certification boundary review policy inspection chain is inconsistent");
  }
  readArtifactBytes(projectRoot, expectedSourceArchive, "source archive");
  const operatorEvidenceBody = assertJsonArtifactBody<OperatorEvidenceBody>(projectRoot, operatorEvidence, "operator evidence");
  const operatorSourceArchive = sourceArchiveReference(operatorEvidenceBody.source_archive);
  if (
    operatorEvidenceBody.schema_version !== "comath.goal3_source_release_external_provider_verification.v1" ||
    operatorEvidenceBody.project_id !== projectId ||
    operatorEvidenceBody.ok !== true ||
    operatorEvidenceBody.evidence_kind !== "os_immutable_storage" ||
    operatorEvidenceBody.source_archive_current !== true ||
    operatorEvidenceBody.provider_id !== read.body.provider_id ||
    operatorEvidenceBody.receipt_id !== read.body.receipt_id ||
    operatorEvidenceBody.proof_authority !== "none" ||
    operatorEvidenceBody.can_promote_claim !== false ||
    operatorEvidenceBody.can_certify_ga !== false ||
    operatorSourceArchive.path !== expectedSourceArchive.path ||
    operatorSourceArchive.sha256 !== expectedSourceArchive.sha256 ||
    operatorSourceArchive.size_bytes !== expectedSourceArchive.size_bytes
  ) {
    invalid("Goal 3 final release signoff certification boundary review operator evidence violates boundaries");
  }
  return {
    attestationArtifact: read.artifact,
    sourceArchiveArtifact: expectedSourceArchive,
    operatorEvidenceArtifact: operatorEvidence
  };
}

export function recordGoal3FinalReleaseSignoffCertificationBoundaryReview(
  projectRoot: string,
  input: Goal3FinalReleaseSignoffCertificationBoundaryReviewInput
): Goal3FinalReleaseSignoffCertificationBoundaryReview {
  assertNoUnexpectedInputKeys(input);
  const projectId = assertSafeId(input.project_id, "project_id");
  const reviewId = assertSafeId(input.certification_boundary_review_id, "certification_boundary_review_id");
  const requestedMode =
    input.requested_review_mode ?? "open_formal_workbench_final_release_signoff_certification_boundary_review";
  if (requestedMode !== "open_formal_workbench_final_release_signoff_certification_boundary_review") {
    invalid("Goal 3 final release signoff certification boundary review mode is invalid");
  }
  const outputPath = reviewPath(reviewId);
  const absoluteOutputPath = assertPathAllowed(projectRoot, outputPath, { purpose: "runtime-write" });
  if (existsSync(absoluteOutputPath)) {
    throw new ComathError("Goal 3 final release signoff certification boundary review already exists", {
      statusCode: 409,
      code: "GOAL3_FINAL_RELEASE_SIGNOFF_CERTIFICATION_BOUNDARY_REVIEW_ALREADY_EXISTS"
    });
  }

  const signoffId = assertSafeId(input.final_release_signoff_id, "final_release_signoff_id");
  const canonicalSignoffPath = signoffPath(signoffId);
  if (normalizeRelativePath(input.final_release_signoff_path) !== canonicalSignoffPath) {
    invalid("Goal 3 final release signoff certification boundary review final signoff path is not canonical");
  }
  const signoff = readJsonArtifact<Goal3FinalReleaseSignoffDecisionBody>(
    projectRoot,
    canonicalSignoffPath,
    input.final_release_signoff_sha256,
    "goal3_final_release_signoff_decision"
  );
  assertReadyFinalReleaseSignoff(signoff.body, projectId, signoffId, signoff.artifact);

  const certificateReviewId = assertSafeId(
    typeof signoff.body.ga_certificate_consumption_review_id === "string"
      ? signoff.body.ga_certificate_consumption_review_id
      : undefined,
    "ga_certificate_consumption_review_id"
  );
  const certificateArtifact = assertGaCertificateConsumption(
    projectRoot,
    artifactReference(
      signoff.body.ga_certificate_consumption_review_artifact,
      "GA certificate consumption",
      "goal3_ga_certificate_consumption_review"
    ),
    projectId,
    certificateReviewId
  );

  const verificationId = assertSafeId(
    typeof signoff.body.durable_transport_signoff_verification_id === "string"
      ? signoff.body.durable_transport_signoff_verification_id
      : undefined,
    "durable_transport_signoff_verification_id"
  );
  if (signoff.body.durable_transport_signoff_verification_path !== durableTransportVerificationPath(verificationId)) {
    invalid("Goal 3 final release signoff certification boundary review durable transport verification path is not canonical");
  }
  const verification = assertDurableTransportVerification(
    projectRoot,
    artifactReference(
      signoff.body.durable_transport_signoff_verification_artifact,
      "durable transport verification",
      "goal3_durable_transport_release_signoff_verification"
    ),
    projectId,
    verificationId
  );

  const attestationId = assertSafeId(
    typeof signoff.body.source_release_os_immutability_attestation_id === "string"
      ? signoff.body.source_release_os_immutability_attestation_id
      : undefined,
    "source_release_os_immutability_attestation_id"
  );
  if (signoff.body.source_release_os_immutability_attestation_path !== sourceReleaseOsAttestationPath(attestationId)) {
    invalid("Goal 3 final release signoff certification boundary review source-release OS attestation path is not canonical");
  }
  const sourceArchive = artifactReference(
    signoff.body.source_archive_artifact,
    "source archive",
    "goal3_source_release_source_archive"
  );
  const operatorEvidence = artifactReference(
    signoff.body.operator_evidence_artifact,
    "operator evidence",
    "goal3_source_release_external_provider_verification"
  );
  const sourceRelease = assertSourceReleaseOsAttestation(
    projectRoot,
    artifactReference(
      signoff.body.source_release_os_immutability_attestation_artifact,
      "source-release OS attestation",
      "goal3_source_release_os_immutability_attestation"
    ),
    projectId,
    attestationId,
    sourceArchive,
    operatorEvidence
  );

  const actor = sanitizeActor(input.actor);
  const body = {
    schema_version: "comath.goal3_final_release_signoff_certification_boundary_review.v1",
    certification_boundary_review_id: reviewId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    ok: true,
    certification_boundary_review_status: "reviewed_final_release_signoff_certification_boundary",
    certification_boundary_review_path: outputPath,
    requested_review_mode: "open_formal_workbench_final_release_signoff_certification_boundary_review",
    final_release_signoff_id: signoffId,
    final_release_signoff_path: signoff.artifact.path,
    final_release_signoff_artifact: signoff.artifact,
    final_release_signoff_current: true,
    final_release_signoff_status: "ready_for_open_formal_workbench_final_release_signoff",
    ga_release_signoff_ready: true,
    ga_certificate_consumption_review_id: certificateReviewId,
    ga_certificate_consumption_review_artifact: certificateArtifact,
    ga_certificate_consumption_current: true,
    consumed_ga_certificate_can_certify_ga: true,
    durable_transport_signoff_verification_id: verificationId,
    durable_transport_signoff_verification_path: verification.verificationArtifact.path,
    durable_transport_signoff_verification_artifact: verification.verificationArtifact,
    durable_transport_signoff_verification_current: true,
    durable_transport_signoff_verification_status: "verified_external_durable_transport_primitive_bound",
    external_durable_transport_evidence_id:
      (assertJsonArtifactBody<ExternalDurableTransportEvidenceBody>(
        projectRoot,
        verification.externalEvidenceArtifact,
        "external durable transport evidence"
      ).external_durable_transport_evidence_id as string),
    external_durable_transport_evidence_artifact: verification.externalEvidenceArtifact,
    external_durable_transport_evidence_current: true,
    external_durable_transport_primitive_bound: true,
    durable_transport_provided: true,
    live_transport_open: true,
    source_release_os_immutability_attestation_id: attestationId,
    source_release_os_immutability_attestation_path: sourceRelease.attestationArtifact.path,
    source_release_os_immutability_attestation_artifact: sourceRelease.attestationArtifact,
    source_release_os_immutability_attestation_current: true,
    source_archive_artifact: sourceRelease.sourceArchiveArtifact,
    source_archive_current: true,
    operator_evidence_artifact: sourceRelease.operatorEvidenceArtifact,
    operator_evidence_current: true,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    boundary_review_is_certificate: false,
    ga_certificate_issued: false,
    claim_promotion_requires_ordinary_gate: true
  } satisfies Omit<
    Goal3FinalReleaseSignoffCertificationBoundaryReview,
    "final_release_signoff_certification_boundary_review_artifact"
  >;

  const reviewText = `${JSON.stringify(body, null, 2)}\n`;
  mkdirSync(dirname(absoluteOutputPath), { recursive: true });
  writeFileSync(absoluteOutputPath, reviewText, "utf8");
  const result: Goal3FinalReleaseSignoffCertificationBoundaryReview = {
    ...body,
    final_release_signoff_certification_boundary_review_artifact: {
      kind: "goal3_final_release_signoff_certification_boundary_review",
      path: outputPath,
      sha256: sha256Text(reviewText),
      size_bytes: Buffer.byteLength(reviewText, "utf8")
    }
  };

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.goal3_final_release_signoff_certification_boundary_review_recorded",
    actor,
    target_id: projectId,
    payload: {
      certification_boundary_review_id: reviewId,
      certification_boundary_review_path: outputPath,
      certification_boundary_review_artifact_sha256:
        result.final_release_signoff_certification_boundary_review_artifact.sha256,
      final_release_signoff_id: signoffId,
      final_release_signoff_artifact_sha256: signoff.artifact.sha256,
      final_release_signoff_current: true,
      ga_release_signoff_ready: true,
      ga_certificate_consumption_review_id: certificateReviewId,
      ga_certificate_consumption_artifact_sha256: certificateArtifact.sha256,
      ga_certificate_consumption_current: true,
      durable_transport_signoff_verification_id: verificationId,
      durable_transport_signoff_verification_artifact_sha256: verification.verificationArtifact.sha256,
      durable_transport_signoff_verification_current: true,
      external_durable_transport_evidence_artifact_sha256: verification.externalEvidenceArtifact.sha256,
      external_durable_transport_evidence_current: true,
      source_release_os_immutability_attestation_id: attestationId,
      source_release_os_immutability_attestation_artifact_sha256: sourceRelease.attestationArtifact.sha256,
      source_release_os_immutability_attestation_current: true,
      source_archive_artifact_sha256: sourceRelease.sourceArchiveArtifact.sha256,
      source_archive_current: true,
      operator_evidence_artifact_sha256: sourceRelease.operatorEvidenceArtifact.sha256,
      operator_evidence_current: true,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false,
      boundary_review_is_certificate: false,
      ga_certificate_issued: false
    }
  });
  return result;
}
