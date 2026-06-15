import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { appendAuditEvent, readAuditEvents } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { sanitizePublicFormalAuthorityVocabulary } from "../proof-kernel/campaign/external-terminal-vocabulary.js";
import { assertPathAllowed } from "../security/path-policy.js";
import { canonicalJson, sha256Text } from "../verification/runner-contracts.js";
import { reviewGoal3PublicArchiveSurfaces } from "./public-archive-review.js";

type ArtifactReference = {
  kind: string;
  path: string;
  sha256: string;
  size_bytes: number;
};

type SourceArchiveBody = {
  generated_by?: unknown;
  archive_format?: unknown;
  archive_path?: unknown;
  archive_sha256?: unknown;
  size_bytes?: unknown;
  git_commit?: unknown;
  git_tree?: unknown;
  entry_count?: unknown;
  entries_sha256?: unknown;
  forbidden_entry_count?: unknown;
  dirty_worktree?: unknown;
  source_only?: unknown;
  includes_runtime_state?: unknown;
  includes_git_dir?: unknown;
  includes_node_modules?: unknown;
};

type Task314PolicyInspectionBody = {
  schema_version?: unknown;
  inspection_id?: unknown;
  project_id?: unknown;
  ok?: unknown;
  provider_policy_inspection_status?: unknown;
  inspection_path?: unknown;
  verification_id?: unknown;
  verification_path?: unknown;
  verification_sha256?: unknown;
  verification_artifact?: unknown;
  verification_current?: unknown;
  binding_id?: unknown;
  binding_sha256?: unknown;
  source_archive?: unknown;
  source_archive_current?: unknown;
  evidence_kind?: unknown;
  operator_evidence_artifact?: unknown;
  operator_evidence_current?: unknown;
  provider_id?: unknown;
  provider_terms_url?: unknown;
  receipt_id?: unknown;
  provider_verification_request_sha256?: unknown;
  provider_verification_response_body_sha256?: unknown;
  provider_verification_response_sha256?: unknown;
  provider_policy_request_sha256?: unknown;
  provider_policy_response_status?: unknown;
  provider_policy_response_body_sha256?: unknown;
  provider_policy_response_sha256?: unknown;
  provider_policy_checked_at?: unknown;
  daemon_identity_sha256?: unknown;
  policy_document_sha256?: unknown;
  provider_policy_inspection_performed?: unknown;
  provider_policy_result?: unknown;
  proof_authority?: unknown;
  can_restore?: unknown;
  can_promote_claim?: unknown;
  can_certify_ga?: unknown;
  policy_inspection_is_proof_authority?: unknown;
  provider_policy_is_proof_authority?: unknown;
  policy_result_is_proof_authority?: unknown;
  result_can_be_used_as_proof?: unknown;
  policy_inspection_is_os_immutability_proof?: unknown;
  os_immutability_enforced?: unknown;
  requires_separate_lean_authority?: unknown;
  requires_separate_os_immutability_attestation?: unknown;
  public_archive_review_id?: unknown;
  public_archive_review_path?: unknown;
  public_archive_review_ok?: unknown;
};

type OperatorEvidenceBody = {
  schema_version?: unknown;
  evidence_id?: unknown;
  project_id?: unknown;
  evidence_kind?: unknown;
  source_archive_path?: unknown;
  source_archive_sha256?: unknown;
  source_archive_size_bytes?: unknown;
  operator_attestation?: unknown;
  external_verification_performed?: unknown;
  proof_authority?: unknown;
  can_restore?: unknown;
  can_promote_claim?: unknown;
  can_certify_ga?: unknown;
  evidence_is_proof_authority?: unknown;
};

type OperatorEvidenceAttestation = {
  provider_name?: unknown;
  receipt_id?: unknown;
};

type OsImmutabilityAttestationResponseBody = {
  schema_version?: unknown;
  provider_id?: unknown;
  evidence_kind?: unknown;
  policy_inspection_id?: unknown;
  policy_inspection_sha256?: unknown;
  verification_id?: unknown;
  verification_sha256?: unknown;
  binding_id?: unknown;
  binding_sha256?: unknown;
  source_archive_sha256?: unknown;
  source_archive_size_bytes?: unknown;
  evidence_sha256?: unknown;
  receipt_id?: unknown;
  provider_policy_request_sha256?: unknown;
  provider_policy_response_body_sha256?: unknown;
  provider_policy_response_sha256?: unknown;
  daemon_identity_sha256?: unknown;
  policy_document_sha256?: unknown;
  attestation_status?: unknown;
  immutable_store_identity_sha256?: unknown;
  immutability_policy_sha256?: unknown;
  attestation_document_sha256?: unknown;
  checked_at?: unknown;
  proof_authority?: unknown;
  can_restore?: unknown;
  can_promote_claim?: unknown;
  can_certify_ga?: unknown;
  storage_is_proof_authority?: unknown;
  attestation_is_proof_authority?: unknown;
  attestation_is_restore_source?: unknown;
  result_can_be_used_as_proof?: unknown;
  requires_separate_lean_authority?: unknown;
};

type Goal3SourceReleaseOsImmutabilityAttestationSourceArchive = {
  generated_by: "git_archive";
  archive_format: "tar";
  archive_path: string;
  archive_sha256: string;
  size_bytes: number;
  git_commit: string;
  git_tree: string;
  entry_count: number;
  entries_sha256: string;
  forbidden_entry_count: 0;
  dirty_worktree: false;
  source_only: true;
  includes_runtime_state: false;
  includes_git_dir: false;
  includes_node_modules: false;
};

type OsImmutabilityAttestationRequest = {
  schema_version: "comath.goal3_os_immutability_attestation_request.v1";
  provider_id: string;
  evidence_kind: "os_immutable_storage";
  policy_inspection_id: string;
  policy_inspection_sha256: string;
  verification_id: string;
  verification_sha256: string;
  binding_id: string;
  binding_sha256: string;
  source_archive_sha256: string;
  source_archive_size_bytes: number;
  evidence_sha256: string;
  receipt_id: string;
  provider_policy_request_sha256: string;
  provider_policy_response_body_sha256: string;
  provider_policy_response_sha256: string;
  daemon_identity_sha256: string;
  policy_document_sha256: string;
  attestation_purpose: "os_immutable_storage_attestation_only";
  proof_authority: "none";
  can_restore: false;
  can_promote_claim: false;
  can_certify_ga: false;
};

export type Goal3SourceReleaseOsImmutabilityAttestationInput = {
  project_id: string;
  attestation_id?: string;
  actor?: string;
  policy_inspection_id: string;
  policy_inspection_path: string;
  policy_inspection_sha256: string;
  provider_id: string;
  os_attestation_url: string;
  provider_terms_url?: string;
};

export type Goal3SourceReleaseOsImmutabilityAttestation = {
  schema_version: "comath.goal3_source_release_os_immutability_attestation.v1";
  attestation_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  ok: true;
  os_immutability_attestation_status: "os_immutability_attested";
  attestation_path: string;
  policy_inspection_id: string;
  policy_inspection_path: string;
  policy_inspection_sha256: string;
  policy_inspection_artifact: ArtifactReference;
  policy_inspection_current: true;
  verification_id: string;
  verification_sha256: string;
  binding_id: string;
  binding_sha256: string;
  source_archive: Goal3SourceReleaseOsImmutabilityAttestationSourceArchive;
  source_archive_current: true;
  evidence_kind: "os_immutable_storage";
  operator_evidence_artifact: ArtifactReference;
  operator_evidence_current: true;
  provider_id: string;
  provider_terms_url: string | null;
  receipt_id: string;
  provider_policy_request_sha256: string;
  provider_policy_response_body_sha256: string;
  provider_policy_response_sha256: string;
  provider_policy_checked_at: string;
  daemon_identity_sha256: string;
  policy_document_sha256: string;
  os_attestation_request_sha256: string;
  os_attestation_response_status: number;
  os_attestation_response_content_type: string;
  os_attestation_response_body_sha256: string;
  os_attestation_response_sha256: string;
  os_attestation_checked_at: string;
  immutable_store_identity_sha256: string;
  immutability_policy_sha256: string;
  attestation_document_sha256: string;
  os_immutability_attestation_performed: true;
  os_immutability_result: "provider_attested";
  provider_os_immutability_attestation_bound: true;
  co_math_os_immutability_enforced: false;
  proof_authority: "none";
  can_restore: false;
  can_promote_claim: false;
  can_certify_ga: false;
  storage_is_proof_authority: false;
  attestation_is_proof_authority: false;
  attestation_is_restore_source: false;
  result_can_be_used_as_proof: false;
  requires_separate_lean_authority: true;
  public_archive_review_id: string;
  public_archive_review_path: string;
  public_archive_review_ok: true;
  attestation_artifact: ArtifactReference;
};

type Goal3SourceReleaseOsImmutabilityAttestationBody = Omit<
  Goal3SourceReleaseOsImmutabilityAttestation,
  "attestation_artifact"
>;

const invalidCode = "GOAL3_SOURCE_RELEASE_OS_IMMUTABILITY_ATTESTATION_INVALID";
const staleCode = "GOAL3_SOURCE_RELEASE_OS_IMMUTABILITY_ATTESTATION_STALE";
const alreadyExistsCode = "GOAL3_SOURCE_RELEASE_OS_IMMUTABILITY_ATTESTATION_ALREADY_EXISTS";

const secretTerms = /Authorization:\s*Bearer|api[_-]?key(?:=\S+)?|token=\S+|sk-[A-Za-z0-9_-]+/iu;
const privilegedPublicTerms =
  /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|kernel_checked|lean_kernel_clean_replay|proof_success|proven|verified_final_authority_evidence|GA certified|can_certify_ga\s*[:=]\s*(?:true|1)|can_promote_claim\s*[:=]\s*(?:true|1))\b/iu;

const allowedAttestationResponseKeys = new Set([
  "schema_version",
  "provider_id",
  "evidence_kind",
  "policy_inspection_id",
  "policy_inspection_sha256",
  "verification_id",
  "verification_sha256",
  "binding_id",
  "binding_sha256",
  "source_archive_sha256",
  "source_archive_size_bytes",
  "evidence_sha256",
  "receipt_id",
  "provider_policy_request_sha256",
  "provider_policy_response_body_sha256",
  "provider_policy_response_sha256",
  "daemon_identity_sha256",
  "policy_document_sha256",
  "attestation_status",
  "immutable_store_identity_sha256",
  "immutability_policy_sha256",
  "attestation_document_sha256",
  "checked_at",
  "proof_authority",
  "can_restore",
  "can_promote_claim",
  "can_certify_ga",
  "storage_is_proof_authority",
  "attestation_is_proof_authority",
  "attestation_is_restore_source",
  "result_can_be_used_as_proof",
  "requires_separate_lean_authority"
]);

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function attestationPath(attestationId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "goal3-source-release-os-immutability-attestation", attestationId, "os-immutability-attestation.json")
  );
}

function policyInspectionPath(inspectionId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "goal3-source-release-external-provider-policy-inspection", inspectionId, "policy-inspection.json")
  );
}

function publicArchiveReviewPath(reviewId: string): string {
  return normalizeRelativePath(join(".comath", "release", "public-archive-review", reviewId, "review.json"));
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
    stale("Goal 3 source release OS immutability attestation referenced material is stale");
  }
  return sha256;
}

function sanitizeActor(value: string | undefined): string {
  return (value ?? "goal3-source-release-os-immutability-attestation")
    .replace(/(?:[A-Za-z]:[\\/][^\s"']+|\\\\[^\s"']+)/gu, "[redacted-path]")
    .replace(/Authorization:\s*Bearer|api[_-]?key(?:=\S+)?|token=\S+|sk-[A-Za-z0-9_-]+/giu, "[redacted-secret]")
    .replace(
      /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|kernel_checked|lean_kernel_clean_replay|proof_success|proven|verified_final_authority_evidence|GA certified|can_certify_ga\s*[:=]\s*(?:true|1)|can_promote_claim\s*[:=]\s*(?:true|1))\b/giu,
      "[redacted-authority-claim]"
    )
    .slice(0, 400);
}

function sha256Bytes(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function artifactReference(path: string, kind: string, sha256: string, sizeBytes: number): ArtifactReference {
  return {
    kind,
    path,
    sha256,
    size_bytes: sizeBytes
  };
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
    invalid(`Goal 3 source release OS immutability attestation ${label} is not project-relative`);
  }
  return normalized;
}

function asNonNegativeInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    invalid(`Goal 3 source release OS immutability attestation ${label} is invalid`);
  }
  return value;
}

function assertNoPublicHazards(projectRoot: string, text: string, label: string): void {
  if (
    text.includes(projectRoot) ||
    /(?:(?:^|[^A-Za-z])[A-Za-z]:[\\/][^\s"']+|\\\\[^\s"']+)/u.test(text) ||
    secretTerms.test(text) ||
    privilegedPublicTerms.test(text)
  ) {
    invalid(`Goal 3 source release OS immutability attestation ${label} contains public hazard text`);
  }
}

function containsProviderAuthorityOverclaim(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((entry) => containsProviderAuthorityOverclaim(entry));
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
        normalizedKey === "result_can_be_used_as_proof" ||
        normalizedKey === "attestation_is_restore_source" ||
        normalizedKey === "os_immutability_enforced" ||
        normalizedKey === "co_math_os_immutability_enforced" ||
        normalizedKey.endsWith("_is_proof_authority")) &&
      entry === true
    ) {
      return true;
    }
    if (containsProviderAuthorityOverclaim(entry)) {
      return true;
    }
  }
  return false;
}

function containsUnknownAttestationResponseKey(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((entry) => containsUnknownAttestationResponseKey(entry));
  }
  if (!value || typeof value !== "object") {
    return false;
  }
  return Object.keys(value as Record<string, unknown>).some((key) => !allowedAttestationResponseKeys.has(key));
}

function assertProviderUrl(value: string, label: string): string {
  if (secretTerms.test(value) || privilegedPublicTerms.test(value)) {
    invalid(`Goal 3 source release OS immutability attestation ${label} is unsafe`);
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    invalid(`Goal 3 source release OS immutability attestation ${label} is invalid`);
  }
  if ((parsed.protocol !== "http:" && parsed.protocol !== "https:") || parsed.username || parsed.password) {
    invalid(`Goal 3 source release OS immutability attestation ${label} is unsupported`);
  }
  return parsed.toString();
}

function sanitizeJsonContentType(projectRoot: string, value: string | null): string {
  const raw = (value ?? "unknown").trim();
  if (!raw || raw === "unknown") {
    return "unknown";
  }
  assertNoPublicHazards(projectRoot, raw, "provider attestation response content type");
  const parts = raw.split(";").map((part) => part.trim().toLowerCase()).filter(Boolean);
  const mediaType = parts.shift();
  if (mediaType !== "application/json") {
    invalid("Goal 3 source release OS immutability attestation provider response content type is unsupported");
  }
  const parameters = new Set(parts);
  if (parameters.size === 0) {
    return "application/json";
  }
  if (parameters.size === 1 && parameters.has("charset=utf-8")) {
    return "application/json; charset=utf-8";
  }
  invalid("Goal 3 source release OS immutability attestation provider response content type is unsafe");
}

function assertProviderTermsUrl(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  return assertProviderUrl(value, "provider terms URL");
}

function readJsonArtifact(
  projectRoot: string,
  inputPath: string,
  inputSha256: string,
  expectedKind: string
): { body: unknown; artifact: ArtifactReference; text: string; bytes: Buffer } {
  const path = assertProjectRelativePath(inputPath, "artifact path");
  const expectedSha256 = assertSha256(inputSha256);
  const absolutePath = assertPathAllowed(projectRoot, path, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    stale("Goal 3 source release OS immutability attestation referenced artifact is stale");
  }
  const bytes = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(bytes);
  if (actualSha256 !== expectedSha256) {
    stale("Goal 3 source release OS immutability attestation referenced artifact hash is stale");
  }
  const text = bytes.toString("utf8");
  try {
    return {
      body: JSON.parse(text) as unknown,
      artifact: artifactReference(path, expectedKind, actualSha256, bytes.byteLength),
      text,
      bytes
    };
  } catch {
    invalid("Goal 3 source release OS immutability attestation referenced artifact JSON is invalid");
  }
}

function parseArtifactReference(value: unknown, expectedKind: string, label: string): ArtifactReference {
  const artifact = value && typeof value === "object" && !Array.isArray(value) ? (value as Partial<ArtifactReference>) : {};
  const path = typeof artifact.path === "string" ? assertProjectRelativePath(artifact.path, `${label} path`) : "";
  const sha256 = typeof artifact.sha256 === "string" ? artifact.sha256.trim().toLowerCase() : "";
  const sizeBytes = artifact.size_bytes;
  if (
    artifact.kind !== expectedKind ||
    !path ||
    !/^[a-f0-9]{64}$/u.test(sha256) ||
    typeof sizeBytes !== "number" ||
    !Number.isSafeInteger(sizeBytes) ||
    sizeBytes < 0
  ) {
    invalid(`Goal 3 source release OS immutability attestation ${label} is invalid`);
  }
  return artifactReference(path, expectedKind, sha256, sizeBytes);
}

function assertArtifactBytesCurrent(projectRoot: string, artifact: ArtifactReference, label: string): void {
  const absolutePath = assertPathAllowed(projectRoot, artifact.path, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    stale(`Goal 3 source release OS immutability attestation ${label} is stale`);
  }
  const bytes = readFileSync(absolutePath);
  if (sha256Bytes(bytes) !== artifact.sha256 || bytes.byteLength !== artifact.size_bytes) {
    stale(`Goal 3 source release OS immutability attestation ${label} bytes are stale`);
  }
}

function assertSourceArchive(value: unknown): Goal3SourceReleaseOsImmutabilityAttestationSourceArchive {
  const archive = value && typeof value === "object" && !Array.isArray(value) ? (value as SourceArchiveBody) : {};
  const archivePath = typeof archive.archive_path === "string" ? assertProjectRelativePath(archive.archive_path, "source archive path") : "";
  const archiveSha256 = typeof archive.archive_sha256 === "string" ? archive.archive_sha256.trim().toLowerCase() : "";
  const gitCommit = typeof archive.git_commit === "string" ? archive.git_commit.trim().toLowerCase() : "";
  const gitTree = typeof archive.git_tree === "string" ? archive.git_tree.trim().toLowerCase() : "";
  const entriesSha256 = typeof archive.entries_sha256 === "string" ? archive.entries_sha256.trim().toLowerCase() : "";
  const sizeBytes = asNonNegativeInteger(archive.size_bytes, "archive size");
  const entryCount = asNonNegativeInteger(archive.entry_count, "archive entry count");
  if (
    archive.generated_by !== "git_archive" ||
    archive.archive_format !== "tar" ||
    !archivePath.startsWith(".comath/release/goal3-source-available-review-artifact/") ||
    !archivePath.endsWith("/source.tar") ||
    !/^[a-f0-9]{64}$/u.test(archiveSha256) ||
    sizeBytes <= 0 ||
    !/^[a-f0-9]{40,64}$/u.test(gitCommit) ||
    !/^[a-f0-9]{40,64}$/u.test(gitTree) ||
    !/^[a-f0-9]{64}$/u.test(entriesSha256) ||
    entryCount <= 0 ||
    archive.forbidden_entry_count !== 0 ||
    archive.dirty_worktree !== false ||
    archive.source_only !== true ||
    archive.includes_runtime_state !== false ||
    archive.includes_git_dir !== false ||
    archive.includes_node_modules !== false
  ) {
    invalid("Goal 3 source release OS immutability attestation source archive metadata is invalid");
  }
  return {
    generated_by: "git_archive",
    archive_format: "tar",
    archive_path: archivePath,
    archive_sha256: archiveSha256,
    size_bytes: sizeBytes,
    git_commit: gitCommit,
    git_tree: gitTree,
    entry_count: entryCount,
    entries_sha256: entriesSha256,
    forbidden_entry_count: 0,
    dirty_worktree: false,
    source_only: true,
    includes_runtime_state: false,
    includes_git_dir: false,
    includes_node_modules: false
  };
}

function assertArchiveBytesCurrent(
  projectRoot: string,
  archive: Goal3SourceReleaseOsImmutabilityAttestationSourceArchive
): void {
  const absoluteArchivePath = assertPathAllowed(projectRoot, archive.archive_path, {
    purpose: "read",
    resolveRealpath: true
  });
  if (!existsSync(absoluteArchivePath) || !statSync(absoluteArchivePath).isFile()) {
    stale("Goal 3 source release OS immutability attestation source archive is stale");
  }
  const bytes = readFileSync(absoluteArchivePath);
  if (sha256Bytes(bytes) !== archive.archive_sha256 || bytes.byteLength !== archive.size_bytes) {
    stale("Goal 3 source release OS immutability attestation source archive bytes are stale");
  }
}

function assertPublicArchiveReviewCurrent(projectRoot: string, projectId: string, reviewId: string, reviewPath: string): void {
  const canonicalPath = publicArchiveReviewPath(reviewId);
  if (reviewPath !== canonicalPath) {
    invalid("Goal 3 source release OS immutability attestation public archive review path is not canonical");
  }
  const event = readAuditEvents(projectRoot).find((entry) => {
    const payload = entry.payload as Record<string, unknown>;
    return (
      entry.event_type === "goal3.public_archive_review_completed" &&
      payload.review_id === reviewId &&
      normalizeRelativePath(String(payload.manifest_path ?? "")) === canonicalPath
    );
  });
  const payload = event?.payload as Record<string, unknown> | undefined;
  const sha256 = typeof payload?.manifest_sha256 === "string" ? payload.manifest_sha256.trim().toLowerCase() : "";
  const sizeBytes = payload?.manifest_size_bytes;
  if (!/^[a-f0-9]{64}$/u.test(sha256) || typeof sizeBytes !== "number" || !Number.isSafeInteger(sizeBytes) || sizeBytes < 0) {
    stale("Goal 3 source release OS immutability attestation public archive review provenance is stale");
  }
  const absolutePath = assertPathAllowed(projectRoot, canonicalPath, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    stale("Goal 3 source release OS immutability attestation public archive review is stale");
  }
  const bytes = readFileSync(absolutePath);
  if (sha256Bytes(bytes) !== sha256 || bytes.byteLength !== sizeBytes) {
    stale("Goal 3 source release OS immutability attestation public archive review bytes are stale");
  }
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(bytes.toString("utf8")) as Record<string, unknown>;
  } catch {
    invalid("Goal 3 source release OS immutability attestation public archive review JSON is invalid");
  }
  if (
    body.schema_version !== "comath.goal3_public_archive_review.v1" ||
    body.review_id !== reviewId ||
    body.project_id !== projectId ||
    body.ok !== true ||
    body.proof_authority !== "none" ||
    body.can_promote_claim !== false ||
    body.review_is_proof_authority !== false ||
    !Array.isArray(body.vetoes) ||
    body.vetoes.length !== 0
  ) {
    invalid("Goal 3 source release OS immutability attestation public archive review is invalid");
  }
}

function readOperatorEvidence(
  projectRoot: string,
  projectId: string,
  providerId: string,
  sourceArchive: Goal3SourceReleaseOsImmutabilityAttestationSourceArchive,
  operatorEvidenceArtifact: ArtifactReference,
  expectedReceiptId: string
): void {
  assertArtifactBytesCurrent(projectRoot, operatorEvidenceArtifact, "operator evidence");
  const absolutePath = assertPathAllowed(projectRoot, operatorEvidenceArtifact.path, {
    purpose: "read",
    resolveRealpath: true
  });
  const text = readFileSync(absolutePath, "utf8");
  assertNoPublicHazards(projectRoot, text, "operator evidence");
  let body: OperatorEvidenceBody;
  try {
    body = JSON.parse(text) as OperatorEvidenceBody;
  } catch {
    invalid("Goal 3 source release OS immutability attestation operator evidence JSON is invalid");
  }
  const attestation =
    body.operator_attestation && typeof body.operator_attestation === "object" && !Array.isArray(body.operator_attestation)
      ? (body.operator_attestation as OperatorEvidenceAttestation)
      : {};
  const providerName = typeof attestation.provider_name === "string" ? attestation.provider_name.trim() : "";
  const receiptId = typeof attestation.receipt_id === "string" ? attestation.receipt_id.trim() : "";
  if (
    body.schema_version !== "comath.goal3_os_immutable_storage_operator_evidence.v1" ||
    body.project_id !== projectId ||
    body.evidence_kind !== "os_immutable_storage" ||
    normalizeRelativePath(String(body.source_archive_path ?? "")) !== sourceArchive.archive_path ||
    String(body.source_archive_sha256 ?? "").trim().toLowerCase() !== sourceArchive.archive_sha256 ||
    body.source_archive_size_bytes !== sourceArchive.size_bytes ||
    body.external_verification_performed !== false ||
    body.proof_authority !== "none" ||
    body.can_restore !== false ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    body.evidence_is_proof_authority !== false ||
    providerName !== providerId ||
    receiptId !== expectedReceiptId
  ) {
    invalid("Goal 3 source release OS immutability attestation operator evidence is invalid");
  }
}

function readTask314PolicyInspection(
  projectRoot: string,
  input: Goal3SourceReleaseOsImmutabilityAttestationInput,
  inspectionId: string,
  projectId: string,
  providerId: string
): {
  body: Task314PolicyInspectionBody;
  artifact: ArtifactReference;
  sourceArchive: Goal3SourceReleaseOsImmutabilityAttestationSourceArchive;
  operatorEvidenceArtifact: ArtifactReference;
  verificationArtifact: ArtifactReference;
  receiptId: string;
  verificationId: string;
  verificationSha256: string;
  bindingId: string;
  bindingSha256: string;
  providerPolicyRequestSha256: string;
  providerPolicyResponseBodySha256: string;
  providerPolicyResponseSha256: string;
  providerPolicyCheckedAt: string;
  daemonIdentitySha256: string;
  policyDocumentSha256: string;
} {
  const canonicalPath = policyInspectionPath(inspectionId);
  if (normalizeRelativePath(input.policy_inspection_path) !== canonicalPath) {
    invalid("Goal 3 source release OS immutability attestation policy inspection path is not canonical");
  }
  const read = readJsonArtifact(
    projectRoot,
    canonicalPath,
    input.policy_inspection_sha256,
    "goal3_source_release_external_provider_policy_inspection"
  );
  assertNoPublicHazards(projectRoot, read.text, "policy inspection");
  const body =
    read.body && typeof read.body === "object" && !Array.isArray(read.body) ? (read.body as Task314PolicyInspectionBody) : {};
  const sourceArchive = assertSourceArchive(body.source_archive);
  const operatorEvidenceArtifact = parseArtifactReference(
    body.operator_evidence_artifact,
    "goal3_os_immutable_storage_operator_evidence",
    "operator evidence artifact"
  );
  const verificationArtifact = parseArtifactReference(
    body.verification_artifact,
    "goal3_source_release_external_provider_verification",
    "verification artifact"
  );
  const verificationId = typeof body.verification_id === "string" ? body.verification_id.trim() : "";
  const verificationSha256 = typeof body.verification_sha256 === "string" ? body.verification_sha256.trim().toLowerCase() : "";
  const bindingId = typeof body.binding_id === "string" ? body.binding_id.trim() : "";
  const bindingSha256 = typeof body.binding_sha256 === "string" ? body.binding_sha256.trim().toLowerCase() : "";
  const receiptId = typeof body.receipt_id === "string" ? body.receipt_id.trim() : "";
  const providerPolicyRequestSha256 =
    typeof body.provider_policy_request_sha256 === "string" ? body.provider_policy_request_sha256.trim().toLowerCase() : "";
  const providerPolicyResponseBodySha256 =
    typeof body.provider_policy_response_body_sha256 === "string"
      ? body.provider_policy_response_body_sha256.trim().toLowerCase()
      : "";
  const providerPolicyResponseSha256 =
    typeof body.provider_policy_response_sha256 === "string" ? body.provider_policy_response_sha256.trim().toLowerCase() : "";
  const providerPolicyCheckedAt = typeof body.provider_policy_checked_at === "string" ? body.provider_policy_checked_at.trim() : "";
  const daemonIdentitySha256 =
    typeof body.daemon_identity_sha256 === "string" ? body.daemon_identity_sha256.trim().toLowerCase() : "";
  const policyDocumentSha256 =
    typeof body.policy_document_sha256 === "string" ? body.policy_document_sha256.trim().toLowerCase() : "";
  if (
    body.schema_version !== "comath.goal3_source_release_external_provider_policy_inspection.v1" ||
    body.inspection_id !== inspectionId ||
    body.project_id !== projectId ||
    body.ok !== true ||
    body.provider_policy_inspection_status !== "provider_policy_inspected" ||
    normalizeRelativePath(String(body.inspection_path ?? "")) !== read.artifact.path ||
    body.verification_path !== verificationArtifact.path ||
    verificationSha256 !== verificationArtifact.sha256 ||
    body.verification_current !== true ||
    !bindingId ||
    !/^[a-f0-9]{64}$/u.test(bindingSha256) ||
    body.source_archive_current !== true ||
    body.evidence_kind !== "os_immutable_storage" ||
    body.operator_evidence_current !== true ||
    body.provider_id !== providerId ||
    !receiptId ||
    !/^[a-f0-9]{64}$/u.test(providerPolicyRequestSha256) ||
    body.provider_policy_response_status !== 200 ||
    !/^[a-f0-9]{64}$/u.test(providerPolicyResponseBodySha256) ||
    !/^[a-f0-9]{64}$/u.test(providerPolicyResponseSha256) ||
    !providerPolicyCheckedAt ||
    Number.isNaN(Date.parse(providerPolicyCheckedAt)) ||
    !/^[a-f0-9]{64}$/u.test(daemonIdentitySha256) ||
    !/^[a-f0-9]{64}$/u.test(policyDocumentSha256) ||
    body.provider_policy_inspection_performed !== true ||
    body.provider_policy_result !== "provider_policy_current" ||
    body.proof_authority !== "none" ||
    body.can_restore !== false ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    body.policy_inspection_is_proof_authority !== false ||
    body.provider_policy_is_proof_authority !== false ||
    body.policy_result_is_proof_authority !== false ||
    body.result_can_be_used_as_proof !== false ||
    body.policy_inspection_is_os_immutability_proof !== false ||
    body.os_immutability_enforced !== false ||
    body.requires_separate_lean_authority !== true ||
    body.requires_separate_os_immutability_attestation !== true ||
    typeof body.public_archive_review_id !== "string" ||
    typeof body.public_archive_review_path !== "string" ||
    body.public_archive_review_ok !== true
  ) {
    invalid("Goal 3 source release OS immutability attestation Task314 policy inspection is not current OS attestation material");
  }
  assertArtifactBytesCurrent(projectRoot, verificationArtifact, "verification artifact");
  assertArchiveBytesCurrent(projectRoot, sourceArchive);
  readOperatorEvidence(projectRoot, projectId, providerId, sourceArchive, operatorEvidenceArtifact, receiptId);
  assertPublicArchiveReviewCurrent(
    projectRoot,
    projectId,
    body.public_archive_review_id,
    normalizeRelativePath(body.public_archive_review_path)
  );
  return {
    body,
    artifact: read.artifact,
    sourceArchive,
    operatorEvidenceArtifact,
    verificationArtifact,
    receiptId,
    verificationId,
    verificationSha256,
    bindingId,
    bindingSha256,
    providerPolicyRequestSha256,
    providerPolicyResponseBodySha256,
    providerPolicyResponseSha256,
    providerPolicyCheckedAt,
    daemonIdentitySha256,
    policyDocumentSha256
  };
}

async function callOsAttestationProvider(
  projectRoot: string,
  providerUrl: string,
  requestPayload: OsImmutabilityAttestationRequest
): Promise<{
  status: number;
  contentType: string;
  bodyText: string;
  body: OsImmutabilityAttestationResponseBody;
  responseSha256: string;
  bodySha256: string;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  let response: Response;
  let bodyText: string;
  let contentType: string;
  try {
    response = await fetch(providerUrl, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json"
      },
      body: canonicalJson(requestPayload),
      signal: controller.signal
    });
    bodyText = await response.text();
    contentType = sanitizeJsonContentType(projectRoot, response.headers.get("content-type"));
  } catch {
    invalid("Goal 3 source release OS immutability attestation provider request failed");
  } finally {
    clearTimeout(timeout);
  }
  assertNoPublicHazards(projectRoot, bodyText, "provider attestation response");
  let body: OsImmutabilityAttestationResponseBody;
  try {
    body = JSON.parse(bodyText) as OsImmutabilityAttestationResponseBody;
  } catch {
    invalid("Goal 3 source release OS immutability attestation provider response JSON is invalid");
  }
  return {
    status: response.status,
    contentType,
    bodyText,
    body,
    responseSha256: sha256Text(canonicalJson({ status: response.status, headers: { "content-type": contentType }, body })),
    bodySha256: sha256Text(bodyText)
  };
}

function assertAttestationProviderResponse(
  response: Awaited<ReturnType<typeof callOsAttestationProvider>>,
  request: OsImmutabilityAttestationRequest
): {
  checkedAt: string;
  immutableStoreIdentitySha256: string;
  immutabilityPolicySha256: string;
  attestationDocumentSha256: string;
} {
  const body = response.body;
  const checkedAt = typeof body.checked_at === "string" ? body.checked_at.trim() : "";
  const immutableStoreIdentitySha256 =
    typeof body.immutable_store_identity_sha256 === "string" ? body.immutable_store_identity_sha256.trim().toLowerCase() : "";
  const immutabilityPolicySha256 =
    typeof body.immutability_policy_sha256 === "string" ? body.immutability_policy_sha256.trim().toLowerCase() : "";
  const attestationDocumentSha256 =
    typeof body.attestation_document_sha256 === "string" ? body.attestation_document_sha256.trim().toLowerCase() : "";
  if (
    response.status < 200 ||
    response.status >= 300 ||
    body.schema_version !== "comath.goal3_os_immutability_attestation_response.v1" ||
    body.provider_id !== request.provider_id ||
    body.evidence_kind !== "os_immutable_storage" ||
    body.policy_inspection_id !== request.policy_inspection_id ||
    String(body.policy_inspection_sha256 ?? "").trim().toLowerCase() !== request.policy_inspection_sha256 ||
    body.verification_id !== request.verification_id ||
    String(body.verification_sha256 ?? "").trim().toLowerCase() !== request.verification_sha256 ||
    body.binding_id !== request.binding_id ||
    String(body.binding_sha256 ?? "").trim().toLowerCase() !== request.binding_sha256 ||
    String(body.source_archive_sha256 ?? "").trim().toLowerCase() !== request.source_archive_sha256 ||
    body.source_archive_size_bytes !== request.source_archive_size_bytes ||
    String(body.evidence_sha256 ?? "").trim().toLowerCase() !== request.evidence_sha256 ||
    body.receipt_id !== request.receipt_id ||
    String(body.provider_policy_request_sha256 ?? "").trim().toLowerCase() !== request.provider_policy_request_sha256 ||
    String(body.provider_policy_response_body_sha256 ?? "").trim().toLowerCase() !==
      request.provider_policy_response_body_sha256 ||
    String(body.provider_policy_response_sha256 ?? "").trim().toLowerCase() !== request.provider_policy_response_sha256 ||
    String(body.daemon_identity_sha256 ?? "").trim().toLowerCase() !== request.daemon_identity_sha256 ||
    String(body.policy_document_sha256 ?? "").trim().toLowerCase() !== request.policy_document_sha256 ||
    body.attestation_status !== "os_immutability_attested" ||
    !/^[a-f0-9]{64}$/u.test(immutableStoreIdentitySha256) ||
    !/^[a-f0-9]{64}$/u.test(immutabilityPolicySha256) ||
    !/^[a-f0-9]{64}$/u.test(attestationDocumentSha256) ||
    !checkedAt ||
    Number.isNaN(Date.parse(checkedAt)) ||
    body.proof_authority !== "none" ||
    body.can_restore !== false ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    body.storage_is_proof_authority !== false ||
    body.attestation_is_proof_authority !== false ||
    body.attestation_is_restore_source !== false ||
    body.result_can_be_used_as_proof !== false ||
    body.requires_separate_lean_authority !== true ||
    containsProviderAuthorityOverclaim(body) ||
    containsUnknownAttestationResponseKey(body)
  ) {
    invalid("Goal 3 source release OS immutability attestation provider response is invalid");
  }
  return { checkedAt, immutableStoreIdentitySha256, immutabilityPolicySha256, attestationDocumentSha256 };
}

export async function recordGoal3SourceReleaseOsImmutabilityAttestation(
  projectRoot: string,
  input: Goal3SourceReleaseOsImmutabilityAttestationInput
): Promise<Goal3SourceReleaseOsImmutabilityAttestation> {
  const projectId = assertSafeId(input.project_id, "project_id");
  const attestationId = assertSafeId(input.attestation_id, "attestation_id");
  const policyInspectionId = assertSafeId(input.policy_inspection_id, "policy_inspection_id");
  const providerId = assertSafeId(input.provider_id, "provider_id");
  const osAttestationUrl = assertProviderUrl(input.os_attestation_url, "OS attestation URL");
  const providerTermsUrl = assertProviderTermsUrl(input.provider_terms_url);
  const outputPath = attestationPath(attestationId);
  const publicReviewId = `GOAL3-SOURCE-RELEASE-OS-IMMUTABILITY-ATTESTATION-${attestationId}`;
  const publicReviewPath = publicArchiveReviewPath(publicReviewId);
  const absoluteOutputPath = assertPathAllowed(projectRoot, outputPath, { purpose: "runtime-write" });
  const absolutePublicReviewPath = assertPathAllowed(projectRoot, publicReviewPath, { purpose: "runtime-write" });
  if (existsSync(absoluteOutputPath) || existsSync(absolutePublicReviewPath)) {
    throw new ComathError("Goal 3 source release OS immutability attestation already exists", {
      statusCode: 409,
      code: alreadyExistsCode
    });
  }

  const policyInspection = readTask314PolicyInspection(projectRoot, input, policyInspectionId, projectId, providerId);
  const requestPayload: OsImmutabilityAttestationRequest = {
    schema_version: "comath.goal3_os_immutability_attestation_request.v1",
    provider_id: providerId,
    evidence_kind: "os_immutable_storage",
    policy_inspection_id: policyInspectionId,
    policy_inspection_sha256: policyInspection.artifact.sha256,
    verification_id: policyInspection.verificationId,
    verification_sha256: policyInspection.verificationSha256,
    binding_id: policyInspection.bindingId,
    binding_sha256: policyInspection.bindingSha256,
    source_archive_sha256: policyInspection.sourceArchive.archive_sha256,
    source_archive_size_bytes: policyInspection.sourceArchive.size_bytes,
    evidence_sha256: policyInspection.operatorEvidenceArtifact.sha256,
    receipt_id: policyInspection.receiptId,
    provider_policy_request_sha256: policyInspection.providerPolicyRequestSha256,
    provider_policy_response_body_sha256: policyInspection.providerPolicyResponseBodySha256,
    provider_policy_response_sha256: policyInspection.providerPolicyResponseSha256,
    daemon_identity_sha256: policyInspection.daemonIdentitySha256,
    policy_document_sha256: policyInspection.policyDocumentSha256,
    attestation_purpose: "os_immutable_storage_attestation_only",
    proof_authority: "none",
    can_restore: false,
    can_promote_claim: false,
    can_certify_ga: false
  };
  const providerResponse = await callOsAttestationProvider(projectRoot, osAttestationUrl, requestPayload);
  const attestation = assertAttestationProviderResponse(providerResponse, requestPayload);
  const actor = sanitizeActor(input.actor);
  const osAttestationRequestSha256 = sha256Text(canonicalJson(requestPayload));

  const body: Goal3SourceReleaseOsImmutabilityAttestationBody = {
    schema_version: "comath.goal3_source_release_os_immutability_attestation.v1",
    attestation_id: attestationId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    ok: true,
    os_immutability_attestation_status: "os_immutability_attested",
    attestation_path: outputPath,
    policy_inspection_id: policyInspectionId,
    policy_inspection_path: policyInspection.artifact.path,
    policy_inspection_sha256: policyInspection.artifact.sha256,
    policy_inspection_artifact: policyInspection.artifact,
    policy_inspection_current: true,
    verification_id: policyInspection.verificationId,
    verification_sha256: policyInspection.verificationSha256,
    binding_id: policyInspection.bindingId,
    binding_sha256: policyInspection.bindingSha256,
    source_archive: policyInspection.sourceArchive,
    source_archive_current: true,
    evidence_kind: "os_immutable_storage",
    operator_evidence_artifact: policyInspection.operatorEvidenceArtifact,
    operator_evidence_current: true,
    provider_id: providerId,
    provider_terms_url: providerTermsUrl,
    receipt_id: policyInspection.receiptId,
    provider_policy_request_sha256: policyInspection.providerPolicyRequestSha256,
    provider_policy_response_body_sha256: policyInspection.providerPolicyResponseBodySha256,
    provider_policy_response_sha256: policyInspection.providerPolicyResponseSha256,
    provider_policy_checked_at: policyInspection.providerPolicyCheckedAt,
    daemon_identity_sha256: policyInspection.daemonIdentitySha256,
    policy_document_sha256: policyInspection.policyDocumentSha256,
    os_attestation_request_sha256: osAttestationRequestSha256,
    os_attestation_response_status: providerResponse.status,
    os_attestation_response_content_type: providerResponse.contentType,
    os_attestation_response_body_sha256: providerResponse.bodySha256,
    os_attestation_response_sha256: providerResponse.responseSha256,
    os_attestation_checked_at: attestation.checkedAt,
    immutable_store_identity_sha256: attestation.immutableStoreIdentitySha256,
    immutability_policy_sha256: attestation.immutabilityPolicySha256,
    attestation_document_sha256: attestation.attestationDocumentSha256,
    os_immutability_attestation_performed: true,
    os_immutability_result: "provider_attested",
    provider_os_immutability_attestation_bound: true,
    co_math_os_immutability_enforced: false,
    proof_authority: "none",
    can_restore: false,
    can_promote_claim: false,
    can_certify_ga: false,
    storage_is_proof_authority: false,
    attestation_is_proof_authority: false,
    attestation_is_restore_source: false,
    result_can_be_used_as_proof: false,
    requires_separate_lean_authority: true,
    public_archive_review_id: publicReviewId,
    public_archive_review_path: publicReviewPath,
    public_archive_review_ok: true
  };

  const publicPayload = sanitizePublicFormalAuthorityVocabulary({
    schema_version: "comath.goal3_source_release_os_immutability_attestation_route_payload.v1",
    attestation_id: attestationId,
    policy_inspection_id: policyInspectionId,
    policy_inspection_sha256: policyInspection.artifact.sha256,
    verification_id: policyInspection.verificationId,
    verification_sha256: policyInspection.verificationSha256,
    binding_id: policyInspection.bindingId,
    binding_sha256: policyInspection.bindingSha256,
    evidence_kind: "os_immutable_storage",
    operator_evidence_sha256: policyInspection.operatorEvidenceArtifact.sha256,
    source_archive_sha256: policyInspection.sourceArchive.archive_sha256,
    source_archive_size_bytes: policyInspection.sourceArchive.size_bytes,
    provider_id: providerId,
    os_attestation_request_sha256: osAttestationRequestSha256,
    os_attestation_response_body_sha256: providerResponse.bodySha256,
    os_immutability_attestation_performed: true,
    os_immutability_result: "provider_attested",
    provider_os_immutability_attestation_bound: true,
    co_math_os_immutability_enforced: false,
    proof_authority: "none",
    can_restore: false,
    can_promote_claim: false,
    can_certify_ga: false,
    storage_is_proof_authority: false,
    attestation_is_proof_authority: false,
    attestation_is_restore_source: false,
    result_can_be_used_as_proof: false,
    requires_separate_lean_authority: true
  });

  const archiveReview = reviewGoal3PublicArchiveSurfaces(projectRoot, {
    project_id: projectId,
    actor,
    review_id: publicReviewId,
    persist_failed_review: false,
    surfaces: [
      {
        surface_id: `source-release-os-immutability-attestation-route:${attestationId}`,
        surface_kind: "public_route_payload",
        payload: publicPayload
      },
      {
        surface_id: `source-release-os-immutability-attestation-manifest:${attestationId}`,
        surface_kind: "public_review_manifest",
        payload: body
      }
    ]
  });
  if (!archiveReview.ok) {
    invalid(`Goal 3 source release OS immutability attestation public archive review failed: ${archiveReview.vetoes.join(",")}`);
  }

  const bodyText = canonicalJson(body);
  mkdirSync(dirname(absoluteOutputPath), { recursive: true });
  writeFileSync(absoluteOutputPath, bodyText, "utf8");
  const result: Goal3SourceReleaseOsImmutabilityAttestation = {
    ...body,
    attestation_artifact: artifactReference(
      outputPath,
      "goal3_source_release_os_immutability_attestation",
      sha256Text(bodyText),
      Buffer.byteLength(bodyText, "utf8")
    )
  };

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.goal3_source_release_os_immutability_attestation_recorded",
    actor,
    target_id: projectId,
    payload: {
      attestation_id: attestationId,
      attestation_path: outputPath,
      attestation_sha256: result.attestation_artifact.sha256,
      policy_inspection_id: policyInspectionId,
      policy_inspection_path: policyInspection.artifact.path,
      policy_inspection_sha256: policyInspection.artifact.sha256,
      verification_id: policyInspection.verificationId,
      verification_sha256: policyInspection.verificationSha256,
      binding_id: policyInspection.bindingId,
      binding_sha256: policyInspection.bindingSha256,
      evidence_kind: "os_immutable_storage",
      operator_evidence_path: policyInspection.operatorEvidenceArtifact.path,
      operator_evidence_sha256: policyInspection.operatorEvidenceArtifact.sha256,
      source_archive_path: policyInspection.sourceArchive.archive_path,
      source_archive_sha256: policyInspection.sourceArchive.archive_sha256,
      source_archive_size_bytes: policyInspection.sourceArchive.size_bytes,
      provider_id: providerId,
      provider_policy_response_sha256: policyInspection.providerPolicyResponseSha256,
      os_attestation_request_sha256: osAttestationRequestSha256,
      os_attestation_response_body_sha256: providerResponse.bodySha256,
      os_attestation_response_sha256: providerResponse.responseSha256,
      os_attestation_response_status: providerResponse.status,
      immutable_store_identity_sha256: attestation.immutableStoreIdentitySha256,
      immutability_policy_sha256: attestation.immutabilityPolicySha256,
      attestation_document_sha256: attestation.attestationDocumentSha256,
      public_archive_review_id: archiveReview.review_id,
      public_archive_review_path: archiveReview.manifest_path,
      public_archive_review_ok: true,
      os_immutability_attestation_performed: true,
      os_immutability_result: "provider_attested",
      provider_os_immutability_attestation_bound: true,
      co_math_os_immutability_enforced: false,
      proof_authority: "none",
      can_restore: false,
      can_promote_claim: false,
      can_certify_ga: false,
      storage_is_proof_authority: false,
      attestation_is_proof_authority: false,
      attestation_is_restore_source: false,
      result_can_be_used_as_proof: false,
      requires_separate_lean_authority: true
    }
  });

  return result;
}
