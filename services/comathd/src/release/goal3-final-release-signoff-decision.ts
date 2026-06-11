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
  terminal_completion_certificate_current?: unknown;
  durable_transport_contract_current?: unknown;
  transport_continuity_current?: unknown;
  transport_contract_current?: unknown;
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

type SourceArchiveReference = {
  archive_path: string;
  archive_sha256: string;
  size_bytes: number;
  source_only: true;
  includes_runtime_state: false;
  includes_git_dir: false;
  includes_node_modules: false;
};

export type Goal3FinalReleaseSignoffDecisionInput = {
  project_id: string;
  final_release_signoff_id?: string;
  actor?: string;
  durable_transport_signoff_prerequisite_id: string;
  durable_transport_signoff_prerequisite_path: string;
  durable_transport_signoff_prerequisite_sha256: string;
  source_release_os_immutability_attestation_id: string;
  source_release_os_immutability_attestation_path: string;
  source_release_os_immutability_attestation_sha256: string;
  durable_transport_signoff_verification_id?: string;
  durable_transport_signoff_verification_path?: string;
  durable_transport_signoff_verification_sha256?: string;
  ga_certificate_consumption_review_id?: string;
  ga_certificate_consumption_review_path?: string;
  ga_certificate_consumption_review_sha256?: string;
  requested_signoff_mode?: "open_formal_workbench_final_release_signoff_decision";
};

export type Goal3FinalReleaseSignoffDecision = {
  schema_version: "comath.goal3_final_release_signoff_decision.v1";
  final_release_signoff_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  ok: boolean;
  final_release_signoff_status:
    | "blocked_final_ga_release_signoff_prerequisites"
    | "ready_for_open_formal_workbench_final_release_signoff";
  final_release_signoff_path: string;
  requested_signoff_mode: "open_formal_workbench_final_release_signoff_decision";
  blocker_reasons: string[];
  durable_transport_signoff_prerequisite_id: string;
  durable_transport_signoff_prerequisite_path: string;
  durable_transport_signoff_prerequisite_artifact: ArtifactReference;
  durable_transport_signoff_prerequisite_current: true;
  durable_transport_signoff_status: "blocked_durable_long_lived_transport_not_provided";
  durable_transport_signoff_verification_available: boolean;
  durable_transport_signoff_verification_id?: string;
  durable_transport_signoff_verification_path?: string;
  durable_transport_signoff_verification_artifact?: ArtifactReference;
  durable_transport_signoff_verification_current?: true;
  durable_transport_signoff_verification_status?:
    | "blocked_external_durable_transport_evidence_not_bound"
    | "verified_external_durable_transport_primitive_bound";
  source_release_os_immutability_attestation_id: string;
  source_release_os_immutability_attestation_path: string;
  source_release_os_immutability_attestation_artifact: ArtifactReference;
  source_release_os_immutability_attestation_current: true;
  source_release_os_immutability_attested: true;
  source_archive_artifact: ArtifactReference;
  source_archive_current: true;
  operator_evidence_artifact: ArtifactReference;
  operator_evidence_current: true;
  provider_os_immutability_attestation_bound: true;
  co_math_os_immutability_enforced: false;
  ga_certificate_consumption_available: boolean;
  ga_certificate_consumption_review_id?: string;
  ga_certificate_consumption_review_artifact?: ArtifactReference;
  ga_certificate_consumption_current?: true;
  ga_certificate_available: boolean;
  external_durable_transport_evidence_bound: boolean;
  external_durable_transport_primitive_bound: boolean;
  service_transport_primitive: "node_http_agent_run_log_session_route";
  client_transport_primitive: "pi_fetch_get_text";
  durable_transport_provided: boolean;
  live_transport_open: boolean;
  ga_release_signoff_ready: boolean;
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
  final_release_signoff_artifact: ArtifactReference;
};

const invalidCode = "GOAL3_FINAL_RELEASE_SIGNOFF_DECISION_INVALID";
const staleCode = "GOAL3_FINAL_RELEASE_SIGNOFF_DECISION_STALE";
const secretTerms = /Authorization:\s*Bearer|api[_-]?key(?:=\S+)?|token=\S+|sk-[A-Za-z0-9_-]+/iu;
const privilegedPublicTerms =
  /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|kernel_checked|lean_kernel_clean_replay|proof_success|proven|verified_final_authority_evidence|GA certified|ga_release_signoff_ready\s*[:=]\s*(?:true|1)|can_certify_ga\s*[:=]\s*(?:true|1)|can_promote_claim\s*[:=]\s*(?:true|1))\b/iu;
const transportPublicTerms =
  /\b(?:long[- ]lived\s+(?:websocket|sse)|indefinite\s+sse|terminal transport recovered live|durable transport provided|live transport open)\b/iu;

const allowedInputKeys = new Set([
  "project_id",
  "final_release_signoff_id",
  "actor",
  "durable_transport_signoff_prerequisite_id",
  "durable_transport_signoff_prerequisite_path",
  "durable_transport_signoff_prerequisite_sha256",
  "source_release_os_immutability_attestation_id",
  "source_release_os_immutability_attestation_path",
  "source_release_os_immutability_attestation_sha256",
  "durable_transport_signoff_verification_id",
  "durable_transport_signoff_verification_path",
  "durable_transport_signoff_verification_sha256",
  "ga_certificate_consumption_review_id",
  "ga_certificate_consumption_review_path",
  "ga_certificate_consumption_review_sha256",
  "requested_signoff_mode"
]);

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function signoffPath(signoffId: string): string {
  return normalizeRelativePath(join(".comath", "release", "goal3-final-release-signoff", signoffId, "signoff.json"));
}

function durableTransportPrerequisitePath(prerequisiteId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "goal3-durable-transport-release-signoff-prerequisite", prerequisiteId, "prerequisite.json")
  );
}

function osAttestationPath(attestationId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "goal3-source-release-os-immutability-attestation", attestationId, "os-immutability-attestation.json")
  );
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

function assertNoUnexpectedInputKeys(input: Goal3FinalReleaseSignoffDecisionInput): void {
  for (const key of Object.keys(input as Record<string, unknown>)) {
    if (!allowedInputKeys.has(key)) {
      invalid(`Goal 3 final release signoff input field is not allowed: ${key}`);
    }
  }
}

function containsFinalSignoffOverclaim(value: unknown): boolean {
  if (typeof value === "string") {
    return secretTerms.test(value) || privilegedPublicTerms.test(value) || transportPublicTerms.test(value);
  }
  if (Array.isArray(value)) {
    return value.some((entry) => containsFinalSignoffOverclaim(entry));
  }
  if (!value || typeof value !== "object") {
    return false;
  }
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const normalizedKey = key.toLowerCase();
    if (normalizedKey === "proof_authority" && entry !== "none") {
      return true;
    }
    if (
      (normalizedKey === "can_restore" ||
        normalizedKey === "restore_source" ||
        normalizedKey === "can_promote_claim" ||
        normalizedKey === "can_certify_ga" ||
        normalizedKey === "ga_certified" ||
        normalizedKey === "ga_release_signoff_ready" ||
        normalizedKey === "final_release_signoff_ready" ||
        normalizedKey === "durable_transport_provided" ||
        normalizedKey === "live_transport_open" ||
        normalizedKey === "indefinite_stream_open" ||
        normalizedKey === "long_lived_websocket_provided" ||
        normalizedKey === "long_lived_sse_provided" ||
        normalizedKey === "result_can_be_used_as_proof" ||
        normalizedKey === "attestation_is_restore_source" ||
        normalizedKey === "storage_is_proof_authority" ||
        normalizedKey === "attestation_is_proof_authority" ||
        normalizedKey === "os_immutability_enforced" ||
        normalizedKey === "co_math_os_immutability_enforced" ||
        normalizedKey.endsWith("_is_proof_authority")) &&
      entry === true
    ) {
      return true;
    }
    if (containsFinalSignoffOverclaim(entry)) {
      return true;
    }
  }
  return false;
}

function assertNoFinalSignoffOverclaims(value: unknown, label: string): void {
  if (containsFinalSignoffOverclaim(value)) {
    invalid(`Goal 3 final release signoff ${label} contains proof, GA, transport, restore, or secret overclaims`);
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
    stale("Goal 3 final release signoff referenced material is stale");
  }
  return sha256;
}

function sanitizeActor(value: string | undefined): string {
  return (value ?? "goal3-final-release-signoff-decision")
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
    invalid(`Goal 3 final release signoff ${label} is not project-relative`);
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
    invalid(`Goal 3 final release signoff ${label} reference is invalid`);
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
    stale("Goal 3 final release signoff referenced artifact is stale");
  }
  const content = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(content);
  if (actualSha256 !== assertSha256(expectedSha256)) {
    stale("Goal 3 final release signoff referenced artifact hash is stale");
  }
  if (expectedSizeBytes !== undefined && content.byteLength !== expectedSizeBytes) {
    stale("Goal 3 final release signoff referenced artifact size is stale");
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
    invalid("Goal 3 final release signoff referenced JSON is invalid");
  }
}

function readCurrentArtifactBytes(projectRoot: string, artifact: ArtifactReference, label: string): Buffer {
  const absolutePath = assertPathAllowed(projectRoot, artifact.path, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    stale(`Goal 3 final release signoff ${label} is stale`);
  }
  const bytes = readFileSync(absolutePath);
  if (sha256Bytes(bytes) !== artifact.sha256 || bytes.byteLength !== artifact.size_bytes) {
    stale(`Goal 3 final release signoff ${label} bytes are stale`);
  }
  return bytes;
}

function assertArtifactBytesCurrent(projectRoot: string, artifact: ArtifactReference, label: string): void {
  readCurrentArtifactBytes(projectRoot, artifact, label);
}

function readJsonArtifactBodyCurrent(projectRoot: string, artifact: ArtifactReference, label: string): Record<string, unknown> {
  const bytes = readCurrentArtifactBytes(projectRoot, artifact, label);
  try {
    const body = JSON.parse(bytes.toString("utf8")) as unknown;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      invalid(`Goal 3 final release signoff ${label} JSON is invalid`);
    }
    assertNoFinalSignoffOverclaims(body, label);
    return body as Record<string, unknown>;
  } catch (error) {
    if (error instanceof ComathError) {
      throw error;
    }
    invalid(`Goal 3 final release signoff ${label} JSON is invalid`);
  }
}

function containsTask319ConsumptionOverclaim(value: unknown): boolean {
  if (typeof value === "string") {
    return secretTerms.test(value) || privilegedPublicTerms.test(value);
  }
  if (Array.isArray(value)) {
    return value.some((entry) => containsTask319ConsumptionOverclaim(entry));
  }
  if (!value || typeof value !== "object") {
    return false;
  }
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const normalizedKey = key.toLowerCase();
    if (normalizedKey === "proof_authority" && entry !== "none") {
      return true;
    }
    if (
      (normalizedKey === "can_restore" ||
        normalizedKey === "restore_source" ||
        normalizedKey === "can_promote_claim" ||
        normalizedKey === "can_certify_ga" ||
        normalizedKey === "ga_certified" ||
        normalizedKey === "ga_release_signoff_ready" ||
        normalizedKey === "final_release_signoff_ready" ||
        normalizedKey === "indefinite_stream_open" ||
        normalizedKey === "long_lived_websocket_provided" ||
        normalizedKey === "long_lived_sse_provided" ||
        normalizedKey === "co_math_transport_stack_built" ||
        normalizedKey === "co_math_websocket_stack_built" ||
        normalizedKey === "custom_transport_implementation" ||
        normalizedKey === "pi_direct_write_allowed" ||
        normalizedKey === "direct_trusted_state_mutation" ||
        normalizedKey === "result_can_be_used_as_proof" ||
        normalizedKey.endsWith("_is_proof_authority")) &&
      entry === true
    ) {
      return true;
    }
    if (containsTask319ConsumptionOverclaim(entry)) {
      return true;
    }
  }
  return false;
}

function assertNoTask319ConsumptionOverclaims(value: unknown, label: string): void {
  if (containsTask319ConsumptionOverclaim(value)) {
    invalid(`Goal 3 final release signoff ${label} contains proof, GA, custom-transport, restore, or secret overclaims`);
  }
}

function readTask319JsonArtifactBodyCurrent(
  projectRoot: string,
  artifact: ArtifactReference,
  label: string
): Record<string, unknown> {
  const bytes = readCurrentArtifactBytes(projectRoot, artifact, label);
  try {
    const body = JSON.parse(bytes.toString("utf8")) as unknown;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      invalid(`Goal 3 final release signoff ${label} JSON is invalid`);
    }
    assertNoTask319ConsumptionOverclaims(body, label);
    return body as Record<string, unknown>;
  } catch (error) {
    if (error instanceof ComathError) {
      throw error;
    }
    invalid(`Goal 3 final release signoff ${label} JSON is invalid`);
  }
}

function assertSha256String(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/u.test(value)) {
    invalid(`Goal 3 final release signoff ${label} hash is invalid`);
  }
  return value;
}

function assertFreshTransportEvidence(freshUntilValue: unknown, freshnessWindowValue: unknown, label: string): {
  freshUntil: string;
  freshnessWindowSeconds: number;
} {
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
    invalid(`Goal 3 final release signoff ${label} freshness metadata is invalid`);
  }
  const now = Date.now();
  if (freshUntilMs <= now) {
    stale(`Goal 3 final release signoff ${label} has expired`);
  }
  if (freshUntilMs > now + freshnessWindowSeconds * 1000) {
    invalid(`Goal 3 final release signoff ${label} exceeds its declared freshness window`);
  }
  return { freshUntil, freshnessWindowSeconds };
}

function assertSourceArchive(projectRoot: string, value: unknown): ArtifactReference {
  const archive = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const archivePath = typeof archive.archive_path === "string" ? assertProjectRelativePath(archive.archive_path, "source archive path") : "";
  const archiveSha256 = typeof archive.archive_sha256 === "string" ? archive.archive_sha256.trim().toLowerCase() : "";
  const sizeBytes = archive.size_bytes;
  if (
    archive.generated_by !== "git_archive" ||
    archive.archive_format !== "tar" ||
    !archivePath ||
    !/^[a-f0-9]{64}$/u.test(archiveSha256) ||
    typeof sizeBytes !== "number" ||
    !Number.isSafeInteger(sizeBytes) ||
    sizeBytes <= 0 ||
    archive.forbidden_entry_count !== 0 ||
    archive.dirty_worktree !== false ||
    archive.source_only !== true ||
    archive.includes_runtime_state !== false ||
    archive.includes_git_dir !== false ||
    archive.includes_node_modules !== false
  ) {
    invalid("Goal 3 final release signoff source archive reference is invalid");
  }
  const reference = {
    kind: "goal3_source_release_source_archive",
    path: archivePath,
    sha256: archiveSha256,
    size_bytes: sizeBytes
  };
  assertArtifactBytesCurrent(projectRoot, reference, "source archive");
  return reference;
}

function assertDurableTransportPrerequisite(
  body: DurableTransportPrerequisiteBody,
  projectId: string,
  prerequisiteId: string,
  artifact: ArtifactReference
): void {
  const blockers = Array.isArray(body.blocker_reasons) ? body.blocker_reasons : [];
  if (
    body.schema_version !== "comath.goal3_durable_transport_release_signoff_prerequisite.v1" ||
    body.durable_transport_signoff_prerequisite_id !== prerequisiteId ||
    body.project_id !== projectId ||
    body.ok !== false ||
    body.durable_transport_signoff_status !== "blocked_durable_long_lived_transport_not_provided" ||
    !blockers.includes("durable_long_lived_transport_not_provided") ||
    body.durable_transport_signoff_prerequisite_path !== artifact.path ||
    body.requested_review_mode !== "open_formal_workbench_durable_transport_release_signoff_prerequisite" ||
    body.operational_readiness_review_current !== true ||
    body.transport_closure_review_current !== true ||
    body.terminal_completion_certificate_current !== true ||
    body.durable_transport_contract_current !== true ||
    body.transport_continuity_current !== true ||
    body.transport_contract_current !== true ||
    body.maintained_transport_primitive_bound !== true ||
    body.service_route_bound !== true ||
    body.client_fetch_contract_bound !== true ||
    body.service_transport_primitive !== "node_http_agent_run_log_session_route" ||
    body.client_transport_primitive !== "pi_fetch_get_text" ||
    body.durable_transport_provided !== false ||
    body.live_transport_open !== false ||
    body.indefinite_stream_open !== false ||
    body.long_lived_websocket_provided !== false ||
    body.long_lived_sse_provided !== false ||
    body.pi_direct_write_allowed !== false ||
    body.direct_trusted_state_mutation !== false ||
    body.proof_authority !== "none" ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    body.ga_certification_gate_separate !== true
  ) {
    invalid("Goal 3 final release signoff durable transport prerequisite violates boundaries");
  }
  artifactReference(body.operational_readiness_review_artifact, "operational-readiness", "goal3_ga_operational_readiness_review");
  artifactReference(body.transport_closure_review_artifact, "transport-closure", "operator_service_transport_closure_review");
}

function assertSourceReleaseOsAttestation(
  projectRoot: string,
  body: SourceReleaseOsAttestationBody,
  projectId: string,
  attestationId: string,
  artifact: ArtifactReference
): { sourceArchive: ArtifactReference; operatorEvidence: ArtifactReference } {
  if (
    body.schema_version !== "comath.goal3_source_release_os_immutability_attestation.v1" ||
    body.attestation_id !== attestationId ||
    body.project_id !== projectId ||
    body.ok !== true ||
    body.os_immutability_attestation_status !== "os_immutability_attested" ||
    body.attestation_path !== artifact.path ||
    body.policy_inspection_current !== true ||
    body.source_archive_current !== true ||
    body.evidence_kind !== "os_immutable_storage" ||
    body.operator_evidence_current !== true ||
    body.os_immutability_attestation_performed !== true ||
    body.os_immutability_result !== "provider_attested" ||
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
    body.public_archive_review_ok !== true
  ) {
    invalid("Goal 3 final release signoff source-release OS attestation violates boundaries");
  }
  const policyInspection = artifactReference(
    body.policy_inspection_artifact,
    "policy-inspection",
    "goal3_source_release_external_provider_policy_inspection"
  );
  const policyInspectionBody = readJsonArtifactBodyCurrent(projectRoot, policyInspection, "policy inspection");
  const operatorEvidence = artifactReference(
    body.operator_evidence_artifact,
    "operator evidence",
    "goal3_source_release_external_provider_verification"
  );
  const operatorEvidenceBody = readJsonArtifactBodyCurrent(projectRoot, operatorEvidence, "operator evidence");
  const sourceArchive = assertSourceArchive(projectRoot, body.source_archive);
  const policyOperatorEvidence = artifactReference(
    policyInspectionBody.operator_evidence_artifact,
    "policy operator evidence",
    "goal3_source_release_external_provider_verification",
    operatorEvidence.path
  );
  const policyVerificationArtifact = artifactReference(
    policyInspectionBody.verification_artifact,
    "policy verification",
    "goal3_source_release_external_provider_verification",
    operatorEvidence.path
  );
  const policySourceArchive =
    policyInspectionBody.source_archive && typeof policyInspectionBody.source_archive === "object" && !Array.isArray(policyInspectionBody.source_archive)
      ? (policyInspectionBody.source_archive as Record<string, unknown>)
      : {};
  const evidenceSourceArchive =
    operatorEvidenceBody.source_archive && typeof operatorEvidenceBody.source_archive === "object" && !Array.isArray(operatorEvidenceBody.source_archive)
      ? (operatorEvidenceBody.source_archive as Record<string, unknown>)
      : {};
  if (
    body.policy_inspection_id !== policyInspectionBody.inspection_id ||
    body.policy_inspection_path !== policyInspection.path ||
    String(body.policy_inspection_sha256 ?? "").trim().toLowerCase() !== policyInspection.sha256 ||
    body.verification_id !== policyInspectionBody.verification_id ||
    String(body.verification_sha256 ?? "").trim().toLowerCase() !== operatorEvidence.sha256 ||
    policyInspectionBody.verification_sha256 !== operatorEvidence.sha256 ||
    policyOperatorEvidence.sha256 !== operatorEvidence.sha256 ||
    policyOperatorEvidence.size_bytes !== operatorEvidence.size_bytes ||
    policyVerificationArtifact.sha256 !== operatorEvidence.sha256 ||
    policyVerificationArtifact.size_bytes !== operatorEvidence.size_bytes ||
    policyInspectionBody.project_id !== projectId ||
    policyInspectionBody.ok !== true ||
    policyInspectionBody.evidence_kind !== "os_immutable_storage" ||
    policyInspectionBody.operator_evidence_current !== true ||
    policyInspectionBody.source_archive_current !== true ||
    policyInspectionBody.provider_id !== body.provider_id ||
    policyInspectionBody.receipt_id !== body.receipt_id ||
    policySourceArchive.archive_path !== sourceArchive.path ||
    policySourceArchive.archive_sha256 !== sourceArchive.sha256 ||
    policySourceArchive.size_bytes !== sourceArchive.size_bytes ||
    operatorEvidenceBody.schema_version !== "comath.goal3_source_release_external_provider_verification.v1" ||
    operatorEvidenceBody.verification_id !== body.verification_id ||
    operatorEvidenceBody.project_id !== projectId ||
    operatorEvidenceBody.ok !== true ||
    operatorEvidenceBody.evidence_kind !== "os_immutable_storage" ||
    operatorEvidenceBody.source_archive_current !== true ||
    operatorEvidenceBody.provider_id !== body.provider_id ||
    operatorEvidenceBody.receipt_id !== body.receipt_id ||
    evidenceSourceArchive.archive_path !== sourceArchive.path ||
    evidenceSourceArchive.archive_sha256 !== sourceArchive.sha256 ||
    evidenceSourceArchive.size_bytes !== sourceArchive.size_bytes
  ) {
    invalid("Goal 3 final release signoff source-release OS attestation chain is inconsistent");
  }
  return {
    sourceArchive,
    operatorEvidence
  };
}

function readOptionalCertificateConsumption(
  projectRoot: string,
  input: Goal3FinalReleaseSignoffDecisionInput,
  projectId: string
): { artifact: ArtifactReference; reviewId: string } | null {
  const hasAny =
    input.ga_certificate_consumption_review_id !== undefined ||
    input.ga_certificate_consumption_review_path !== undefined ||
    input.ga_certificate_consumption_review_sha256 !== undefined;
  if (!hasAny) {
    return null;
  }
  const reviewId = assertSafeId(input.ga_certificate_consumption_review_id, "ga_certificate_consumption_review_id");
  const canonicalPath = certificateConsumptionPath(reviewId);
  if (normalizeRelativePath(input.ga_certificate_consumption_review_path ?? "") !== canonicalPath) {
    invalid("Goal 3 final release signoff GA certificate consumption path is not canonical");
  }
  const read = readJsonArtifact<GaCertificateConsumptionBody>(
    projectRoot,
    canonicalPath,
    input.ga_certificate_consumption_review_sha256 ?? "",
    "goal3_ga_certificate_consumption_review"
  );
  if (
    read.body.schema_version !== "comath.goal3_ga_certificate_consumption_review.v1" ||
    read.body.ga_certificate_consumption_review_id !== reviewId ||
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
    invalid("Goal 3 final release signoff GA certificate consumption violates boundaries");
  }
  return { artifact: read.artifact, reviewId };
}

type DurableTransportVerificationConsumption = {
  artifact: ArtifactReference;
  verificationId: string;
  status:
    | "blocked_external_durable_transport_evidence_not_bound"
    | "verified_external_durable_transport_primitive_bound";
  verified: boolean;
  externalEvidenceBound: boolean;
  externalPrimitiveBound: boolean;
  serviceRoute?: string;
};

function assertExternalDurableTransportEvidenceCurrent(
  projectRoot: string,
  artifact: ArtifactReference,
  body: DurableTransportVerificationBody,
  projectId: string
): void {
  const evidenceId = assertSafeId(
    typeof body.external_durable_transport_evidence_id === "string"
      ? body.external_durable_transport_evidence_id
      : undefined,
    "external_durable_transport_evidence_id"
  );
  if (artifact.path !== externalDurableTransportEvidencePath(evidenceId)) {
    invalid("Goal 3 final release signoff external durable transport evidence path is not canonical");
  }
  const evidenceBody = readTask319JsonArtifactBodyCurrent(
    projectRoot,
    artifact,
    "external durable transport evidence"
  ) as ExternalDurableTransportEvidenceBody;
  const evidenceFreshness = assertFreshTransportEvidence(
    evidenceBody.fresh_until,
    evidenceBody.freshness_window_seconds,
    "external durable transport evidence"
  );
  if (
    evidenceBody.schema_version !== "comath.goal3_external_durable_transport_evidence.v1" ||
    evidenceBody.external_durable_transport_evidence_id !== body.external_durable_transport_evidence_id ||
    evidenceBody.project_id !== projectId ||
    evidenceBody.ok !== true ||
    evidenceBody.evidence_status !== "external_durable_transport_primitive_available" ||
    evidenceBody.evidence_path !== artifact.path ||
    evidenceBody.provider_id !== body.provider_id ||
    evidenceBody.provider_kind !== "maintained_external_operator_transport" ||
    evidenceBody.transport_primitive !== "external_reconnectable_operator_session" ||
    evidenceBody.maintenance_source !== "external_maintained_primitive" ||
    evidenceBody.daemon_identity_sha256 !== body.daemon_identity_sha256 ||
    evidenceBody.daemon_policy_sha256 !== body.daemon_policy_sha256 ||
    evidenceBody.session_policy_sha256 !== body.session_policy_sha256 ||
    evidenceBody.provider_attestation_sha256 !== body.provider_attestation_sha256 ||
    evidenceBody.operator_session_id !== body.operator_session_id ||
    evidenceBody.agent_run_id !== body.agent_run_id ||
    evidenceBody.service_route !== body.service_route ||
    evidenceBody.service_transport_primitive !== "node_http_agent_run_log_session_route" ||
    evidenceBody.client_transport_primitive !== "pi_fetch_get_text" ||
    evidenceBody.fresh_until !== body.fresh_until ||
    evidenceBody.freshness_window_seconds !== body.freshness_window_seconds ||
    evidenceBody.reconnect_policy !== "external_provider_reconnect_required" ||
    evidenceBody.external_durable_transport_primitive_bound !== true ||
    evidenceBody.durable_transport_provided !== true ||
    evidenceBody.live_transport_open !== true ||
    evidenceBody.co_math_transport_stack_built !== false ||
    evidenceBody.co_math_websocket_stack_built !== false ||
    evidenceBody.custom_transport_implementation !== false ||
    evidenceBody.indefinite_stream_open !== false ||
    evidenceBody.long_lived_websocket_provided !== false ||
    evidenceBody.long_lived_sse_provided !== false ||
    evidenceBody.pi_direct_write_allowed !== false ||
    evidenceBody.direct_trusted_state_mutation !== false ||
    evidenceBody.proof_authority !== "none" ||
    evidenceBody.can_promote_claim !== false ||
    evidenceBody.can_certify_ga !== false ||
    evidenceFreshness.freshUntil !== body.fresh_until ||
    evidenceFreshness.freshnessWindowSeconds !== body.freshness_window_seconds
  ) {
    invalid("Goal 3 final release signoff external durable transport evidence violates boundaries");
  }
  assertSha256String(evidenceBody.daemon_identity_sha256, "external durable transport daemon identity");
  assertSha256String(evidenceBody.daemon_policy_sha256, "external durable transport daemon policy");
  assertSha256String(evidenceBody.session_policy_sha256, "external durable transport session policy");
  assertSha256String(evidenceBody.provider_attestation_sha256, "external durable transport provider attestation");
}

function readOptionalDurableTransportVerification(
  projectRoot: string,
  input: Goal3FinalReleaseSignoffDecisionInput,
  projectId: string,
  prerequisiteId: string,
  prerequisiteArtifact: ArtifactReference
): DurableTransportVerificationConsumption | null {
  const hasAny =
    input.durable_transport_signoff_verification_id !== undefined ||
    input.durable_transport_signoff_verification_path !== undefined ||
    input.durable_transport_signoff_verification_sha256 !== undefined;
  if (!hasAny) {
    return null;
  }
  const verificationId = assertSafeId(
    input.durable_transport_signoff_verification_id,
    "durable_transport_signoff_verification_id"
  );
  const canonicalPath = durableTransportVerificationPath(verificationId);
  if (normalizeRelativePath(input.durable_transport_signoff_verification_path ?? "") !== canonicalPath) {
    invalid("Goal 3 final release signoff durable transport verification path is not canonical");
  }
  const read = readJsonArtifact<DurableTransportVerificationBody>(
    projectRoot,
    canonicalPath,
    input.durable_transport_signoff_verification_sha256 ?? "",
    "goal3_durable_transport_release_signoff_verification"
  );
  assertNoTask319ConsumptionOverclaims(read.body, "durable transport verification");
  const body = read.body;
  const blockers = Array.isArray(body.blocker_reasons) ? body.blocker_reasons : [];
  const referencedPrerequisite = artifactReference(
    body.durable_transport_signoff_prerequisite_artifact,
    "durable transport verification prerequisite",
    "goal3_durable_transport_release_signoff_prerequisite",
    prerequisiteArtifact.path
  );
  if (
    body.schema_version !== "comath.goal3_durable_transport_release_signoff_verification.v1" ||
    body.durable_transport_signoff_verification_id !== verificationId ||
    body.project_id !== projectId ||
    body.durable_transport_signoff_verification_path !== read.artifact.path ||
    body.requested_verification_mode !==
      "open_formal_workbench_durable_transport_release_signoff_verification" ||
    body.durable_transport_signoff_prerequisite_id !== prerequisiteId ||
    body.durable_transport_signoff_prerequisite_path !== prerequisiteArtifact.path ||
    referencedPrerequisite.sha256 !== prerequisiteArtifact.sha256 ||
    referencedPrerequisite.size_bytes !== prerequisiteArtifact.size_bytes ||
    body.durable_transport_signoff_prerequisite_current !== true ||
    body.durable_transport_signoff_status !== "blocked_durable_long_lived_transport_not_provided" ||
    body.service_transport_primitive !== "node_http_agent_run_log_session_route" ||
    body.client_transport_primitive !== "pi_fetch_get_text" ||
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
    body.can_certify_ga !== false
  ) {
    invalid("Goal 3 final release signoff durable transport verification violates boundaries");
  }

  if (body.ok === false) {
    if (
      body.durable_transport_signoff_verification_status !==
        "blocked_external_durable_transport_evidence_not_bound" ||
      !blockers.includes("external_durable_transport_evidence_not_bound") ||
      body.external_durable_transport_evidence_bound !== false ||
      body.external_durable_transport_primitive_bound !== false ||
      body.durable_transport_provided !== false ||
      body.live_transport_open !== false
    ) {
      invalid("Goal 3 final release signoff blocked durable transport verification violates boundaries");
    }
    return {
      artifact: read.artifact,
      verificationId,
      status: "blocked_external_durable_transport_evidence_not_bound",
      verified: false,
      externalEvidenceBound: false,
      externalPrimitiveBound: false
    };
  }

  if (
    body.ok !== true ||
    body.durable_transport_signoff_verification_status !==
      "verified_external_durable_transport_primitive_bound" ||
    blockers.length !== 0 ||
    body.external_durable_transport_evidence_bound !== true ||
    body.external_durable_transport_evidence_current !== true ||
    body.external_durable_transport_primitive_bound !== true ||
    body.provider_kind !== "maintained_external_operator_transport" ||
    body.transport_primitive !== "external_reconnectable_operator_session" ||
    body.durable_transport_provided !== true ||
    body.live_transport_open !== true
  ) {
    invalid("Goal 3 final release signoff verified durable transport verification violates boundaries");
  }
  assertFreshTransportEvidence(body.fresh_until, body.freshness_window_seconds, "durable transport verification");
  assertSha256String(body.daemon_identity_sha256, "durable transport daemon identity");
  assertSha256String(body.daemon_policy_sha256, "durable transport daemon policy");
  assertSha256String(body.session_policy_sha256, "durable transport session policy");
  assertSha256String(body.provider_attestation_sha256, "durable transport provider attestation");
  const evidenceArtifact = artifactReference(
    body.external_durable_transport_evidence_artifact,
    "external durable transport evidence",
    "goal3_external_durable_transport_evidence"
  );
  assertExternalDurableTransportEvidenceCurrent(projectRoot, evidenceArtifact, body, projectId);
  return {
    artifact: read.artifact,
    verificationId,
    status: "verified_external_durable_transport_primitive_bound",
    verified: true,
    externalEvidenceBound: true,
    externalPrimitiveBound: true,
    serviceRoute: typeof body.service_route === "string" ? body.service_route : undefined
  };
}

export function recordGoal3FinalReleaseSignoffDecision(
  projectRoot: string,
  input: Goal3FinalReleaseSignoffDecisionInput
): Goal3FinalReleaseSignoffDecision {
  assertNoUnexpectedInputKeys(input);
  const projectId = assertSafeId(input.project_id, "project_id");
  const signoffId = assertSafeId(input.final_release_signoff_id, "final_release_signoff_id");
  const requestedMode = input.requested_signoff_mode ?? "open_formal_workbench_final_release_signoff_decision";
  if (requestedMode !== "open_formal_workbench_final_release_signoff_decision") {
    invalid("Goal 3 final release signoff mode is invalid");
  }
  const outputPath = signoffPath(signoffId);
  const absoluteOutputPath = assertPathAllowed(projectRoot, outputPath, { purpose: "runtime-write" });
  if (existsSync(absoluteOutputPath)) {
    throw new ComathError("Goal 3 final release signoff decision already exists", {
      statusCode: 409,
      code: "GOAL3_FINAL_RELEASE_SIGNOFF_DECISION_ALREADY_EXISTS"
    });
  }

  const prerequisiteId = assertSafeId(
    input.durable_transport_signoff_prerequisite_id,
    "durable_transport_signoff_prerequisite_id"
  );
  const prerequisitePath = durableTransportPrerequisitePath(prerequisiteId);
  if (normalizeRelativePath(input.durable_transport_signoff_prerequisite_path) !== prerequisitePath) {
    invalid("Goal 3 final release signoff durable transport prerequisite path is not canonical");
  }
  const prerequisite = readJsonArtifact<DurableTransportPrerequisiteBody>(
    projectRoot,
    prerequisitePath,
    input.durable_transport_signoff_prerequisite_sha256,
    "goal3_durable_transport_release_signoff_prerequisite"
  );
  assertNoFinalSignoffOverclaims(prerequisite.body, "durable transport prerequisite");
  assertDurableTransportPrerequisite(prerequisite.body, projectId, prerequisiteId, prerequisite.artifact);
  const durableTransportVerification = readOptionalDurableTransportVerification(
    projectRoot,
    input,
    projectId,
    prerequisiteId,
    prerequisite.artifact
  );

  const attestationId = assertSafeId(
    input.source_release_os_immutability_attestation_id,
    "source_release_os_immutability_attestation_id"
  );
  const attestationPathValue = osAttestationPath(attestationId);
  if (normalizeRelativePath(input.source_release_os_immutability_attestation_path) !== attestationPathValue) {
    invalid("Goal 3 final release signoff source-release OS attestation path is not canonical");
  }
  const attestation = readJsonArtifact<SourceReleaseOsAttestationBody>(
    projectRoot,
    attestationPathValue,
    input.source_release_os_immutability_attestation_sha256,
    "goal3_source_release_os_immutability_attestation"
  );
  assertNoFinalSignoffOverclaims(attestation.body, "source-release OS attestation");
  const attestationRefs = assertSourceReleaseOsAttestation(
    projectRoot,
    attestation.body,
    projectId,
    attestationId,
    attestation.artifact
  );

  const certificateConsumption = readOptionalCertificateConsumption(projectRoot, input, projectId);
  const durableTransportVerified = durableTransportVerification?.verified === true;
  const blockerReasons = [
    ...(durableTransportVerified ? [] : ["durable_long_lived_transport_not_provided"]),
    ...(certificateConsumption === null ? ["final_ga_certificate_not_bound"] : [])
  ];
  const signoffReady = blockerReasons.length === 0;
  const actor = sanitizeActor(input.actor);
  const body = {
    schema_version: "comath.goal3_final_release_signoff_decision.v1",
    final_release_signoff_id: signoffId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    ok: signoffReady,
    final_release_signoff_status: signoffReady
      ? "ready_for_open_formal_workbench_final_release_signoff"
      : "blocked_final_ga_release_signoff_prerequisites",
    final_release_signoff_path: outputPath,
    requested_signoff_mode: "open_formal_workbench_final_release_signoff_decision",
    blocker_reasons: blockerReasons,
    durable_transport_signoff_prerequisite_id: prerequisiteId,
    durable_transport_signoff_prerequisite_path: prerequisite.artifact.path,
    durable_transport_signoff_prerequisite_artifact: prerequisite.artifact,
    durable_transport_signoff_prerequisite_current: true,
    durable_transport_signoff_status: "blocked_durable_long_lived_transport_not_provided",
    durable_transport_signoff_verification_available: durableTransportVerification !== null,
    ...(durableTransportVerification !== null
      ? {
          durable_transport_signoff_verification_id: durableTransportVerification.verificationId,
          durable_transport_signoff_verification_path: durableTransportVerification.artifact.path,
          durable_transport_signoff_verification_artifact: durableTransportVerification.artifact,
          durable_transport_signoff_verification_current: true as const,
          durable_transport_signoff_verification_status: durableTransportVerification.status
        }
      : {}),
    source_release_os_immutability_attestation_id: attestationId,
    source_release_os_immutability_attestation_path: attestation.artifact.path,
    source_release_os_immutability_attestation_artifact: attestation.artifact,
    source_release_os_immutability_attestation_current: true,
    source_release_os_immutability_attested: true,
    source_archive_artifact: attestationRefs.sourceArchive,
    source_archive_current: true,
    operator_evidence_artifact: attestationRefs.operatorEvidence,
    operator_evidence_current: true,
    provider_os_immutability_attestation_bound: true,
    co_math_os_immutability_enforced: false,
    ga_certificate_consumption_available: certificateConsumption !== null,
    ...(certificateConsumption !== null
      ? {
          ga_certificate_consumption_review_id: certificateConsumption.reviewId,
          ga_certificate_consumption_review_artifact: certificateConsumption.artifact,
          ga_certificate_consumption_current: true as const
        }
      : {}),
    ga_certificate_available: certificateConsumption !== null,
    external_durable_transport_evidence_bound: durableTransportVerification?.externalEvidenceBound ?? false,
    external_durable_transport_primitive_bound: durableTransportVerification?.externalPrimitiveBound ?? false,
    service_transport_primitive: "node_http_agent_run_log_session_route",
    client_transport_primitive: "pi_fetch_get_text",
    durable_transport_provided: durableTransportVerified,
    live_transport_open: durableTransportVerified,
    ga_release_signoff_ready: signoffReady,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  } satisfies Omit<Goal3FinalReleaseSignoffDecision, "final_release_signoff_artifact">;

  const signoffText = `${JSON.stringify(body, null, 2)}\n`;
  mkdirSync(dirname(absoluteOutputPath), { recursive: true });
  writeFileSync(absoluteOutputPath, signoffText, "utf8");
  const result: Goal3FinalReleaseSignoffDecision = {
    ...body,
    final_release_signoff_artifact: {
      kind: "goal3_final_release_signoff_decision",
      path: outputPath,
      sha256: sha256Text(signoffText),
      size_bytes: Buffer.byteLength(signoffText, "utf8")
    }
  };

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.goal3_final_release_signoff_decision_recorded",
    actor,
    target_id: projectId,
    payload: {
      final_release_signoff_id: signoffId,
      final_release_signoff_status: result.final_release_signoff_status,
      final_release_signoff_path: outputPath,
      final_release_signoff_artifact_sha256: result.final_release_signoff_artifact.sha256,
      durable_transport_signoff_prerequisite_id: prerequisiteId,
      durable_transport_signoff_prerequisite_artifact_sha256: prerequisite.artifact.sha256,
      durable_transport_signoff_prerequisite_current: true,
      source_release_os_immutability_attestation_id: attestationId,
      source_release_os_immutability_attestation_artifact_sha256: attestation.artifact.sha256,
      source_release_os_immutability_attestation_current: true,
      source_archive_artifact_sha256: attestationRefs.sourceArchive.sha256,
      operator_evidence_artifact_sha256: attestationRefs.operatorEvidence.sha256,
      ga_certificate_consumption_available: certificateConsumption !== null,
      ...(durableTransportVerification !== null
        ? {
            durable_transport_signoff_verification_id: durableTransportVerification.verificationId,
            durable_transport_signoff_verification_artifact_sha256: durableTransportVerification.artifact.sha256,
            durable_transport_signoff_verification_current: true,
            durable_transport_signoff_verification_status: durableTransportVerification.status,
            external_durable_transport_evidence_bound: durableTransportVerification.externalEvidenceBound,
            external_durable_transport_primitive_bound: durableTransportVerification.externalPrimitiveBound
          }
        : {
            durable_transport_signoff_verification_current: false,
            external_durable_transport_evidence_bound: false,
            external_durable_transport_primitive_bound: false
          }),
      blocker_reasons: blockerReasons,
      durable_transport_provided: durableTransportVerified,
      live_transport_open: durableTransportVerified,
      ga_release_signoff_ready: signoffReady,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  });
  return result;
}
