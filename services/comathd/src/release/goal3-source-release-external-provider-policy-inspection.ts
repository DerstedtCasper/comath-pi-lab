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

type EvidenceKind = "external_notarization" | "os_immutable_storage";

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

type Task313VerificationBody = {
  schema_version?: unknown;
  verification_id?: unknown;
  project_id?: unknown;
  ok?: unknown;
  external_provider_verification_status?: unknown;
  verification_path?: unknown;
  binding_id?: unknown;
  binding_path?: unknown;
  binding_sha256?: unknown;
  binding_artifact?: unknown;
  binding_current?: unknown;
  source_archive?: unknown;
  source_archive_current?: unknown;
  evidence_kind?: unknown;
  operator_evidence_artifact?: unknown;
  operator_evidence_current?: unknown;
  provider_id?: unknown;
  provider_terms_url?: unknown;
  provider_request_sha256?: unknown;
  provider_response_status?: unknown;
  provider_response_content_type?: unknown;
  provider_response_body_sha256?: unknown;
  provider_response_sha256?: unknown;
  provider_checked_at?: unknown;
  external_verification_performed?: unknown;
  external_verification_result?: unknown;
  proof_authority?: unknown;
  can_restore?: unknown;
  can_promote_claim?: unknown;
  can_certify_ga?: unknown;
  verification_is_proof_authority?: unknown;
  provider_result_is_proof_authority?: unknown;
  result_can_be_used_as_proof?: unknown;
  verification_is_os_immutability_proof?: unknown;
  requires_separate_lean_authority?: unknown;
  requires_separate_os_policy_inspection?: unknown;
  public_archive_review_id?: unknown;
  public_archive_review_path?: unknown;
  public_archive_review_ok?: unknown;
};

type OperatorEvidenceBody = {
  schema_version?: unknown;
  evidence_id?: unknown;
  project_id?: unknown;
  evidence_kind?: unknown;
  binding_target_kind?: unknown;
  binding_target_id?: unknown;
  binding_target_path?: unknown;
  binding_target_sha256?: unknown;
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
  evidence_uri?: unknown;
};

type ProviderPolicyInspectionResponseBody = {
  schema_version?: unknown;
  provider_id?: unknown;
  evidence_kind?: unknown;
  verification_id?: unknown;
  verification_sha256?: unknown;
  binding_id?: unknown;
  binding_sha256?: unknown;
  source_archive_sha256?: unknown;
  source_archive_size_bytes?: unknown;
  evidence_sha256?: unknown;
  receipt_id?: unknown;
  provider_verification_request_sha256?: unknown;
  provider_verification_response_body_sha256?: unknown;
  provider_verification_response_sha256?: unknown;
  policy_status?: unknown;
  daemon_identity_sha256?: unknown;
  policy_document_sha256?: unknown;
  checked_at?: unknown;
  proof_authority?: unknown;
  can_restore?: unknown;
  can_promote_claim?: unknown;
  can_certify_ga?: unknown;
  provider_policy_is_proof_authority?: unknown;
  policy_result_is_proof_authority?: unknown;
  result_can_be_used_as_proof?: unknown;
  policy_inspection_is_os_immutability_proof?: unknown;
  os_immutability_enforced?: unknown;
  requires_separate_os_immutability_attestation?: unknown;
};

type Goal3SourceReleaseExternalProviderPolicyInspectionSourceArchive = {
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

type ProviderPolicyInspectionRequest = {
  schema_version: "comath.goal3_external_provider_policy_inspection_request.v1";
  provider_id: string;
  evidence_kind: EvidenceKind;
  verification_id: string;
  verification_sha256: string;
  binding_id: string;
  binding_sha256: string;
  source_archive_sha256: string;
  source_archive_size_bytes: number;
  evidence_sha256: string;
  receipt_id: string;
  provider_verification_request_sha256: string;
  provider_verification_response_body_sha256: string;
  provider_verification_response_sha256: string;
  policy_inspection_purpose: "provider_policy_currentness_only";
  proof_authority: "none";
  can_restore: false;
  can_promote_claim: false;
  can_certify_ga: false;
};

export type Goal3SourceReleaseExternalProviderPolicyInspectionInput = {
  project_id: string;
  inspection_id?: string;
  actor?: string;
  verification_id: string;
  verification_path: string;
  verification_sha256: string;
  provider_id: string;
  provider_policy_url: string;
  provider_terms_url?: string;
};

export type Goal3SourceReleaseExternalProviderPolicyInspection = {
  schema_version: "comath.goal3_source_release_external_provider_policy_inspection.v1";
  inspection_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  ok: true;
  provider_policy_inspection_status: "provider_policy_inspected";
  inspection_path: string;
  verification_id: string;
  verification_path: string;
  verification_sha256: string;
  verification_artifact: ArtifactReference;
  verification_current: true;
  binding_id: string;
  binding_sha256: string;
  source_archive: Goal3SourceReleaseExternalProviderPolicyInspectionSourceArchive;
  source_archive_current: true;
  evidence_kind: EvidenceKind;
  operator_evidence_artifact: ArtifactReference;
  operator_evidence_current: true;
  provider_id: string;
  provider_terms_url: string | null;
  receipt_id: string;
  provider_verification_request_sha256: string;
  provider_verification_response_body_sha256: string;
  provider_verification_response_sha256: string;
  provider_policy_request_sha256: string;
  provider_policy_response_status: number;
  provider_policy_response_content_type: string;
  provider_policy_response_body_sha256: string;
  provider_policy_response_sha256: string;
  provider_policy_checked_at: string;
  daemon_identity_sha256: string;
  policy_document_sha256: string;
  provider_policy_inspection_performed: true;
  provider_policy_result: "provider_policy_current";
  proof_authority: "none";
  can_restore: false;
  can_promote_claim: false;
  can_certify_ga: false;
  policy_inspection_is_proof_authority: false;
  provider_policy_is_proof_authority: false;
  policy_result_is_proof_authority: false;
  result_can_be_used_as_proof: false;
  policy_inspection_is_os_immutability_proof: false;
  os_immutability_enforced: false;
  requires_separate_lean_authority: true;
  requires_separate_os_immutability_attestation: true;
  public_archive_review_id: string;
  public_archive_review_path: string;
  public_archive_review_ok: true;
  inspection_artifact: ArtifactReference;
};

type Goal3SourceReleaseExternalProviderPolicyInspectionBody = Omit<
  Goal3SourceReleaseExternalProviderPolicyInspection,
  "inspection_artifact"
>;

const invalidCode = "GOAL3_SOURCE_RELEASE_EXTERNAL_PROVIDER_POLICY_INSPECTION_INVALID";
const staleCode = "GOAL3_SOURCE_RELEASE_EXTERNAL_PROVIDER_POLICY_INSPECTION_STALE";
const alreadyExistsCode = "GOAL3_SOURCE_RELEASE_EXTERNAL_PROVIDER_POLICY_INSPECTION_ALREADY_EXISTS";

const secretTerms = /Authorization:\s*Bearer|api[_-]?key(?:=\S+)?|token=\S+|sk-[A-Za-z0-9_-]+/iu;
const privilegedPublicTerms =
  /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|kernel_checked|lean_kernel_clean_replay|proof_success|proven|verified_final_authority_evidence|GA certified|can_certify_ga\s*[:=]\s*(?:true|1)|can_promote_claim\s*[:=]\s*(?:true|1))\b/iu;
const allowedProviderPolicyResponseKeys = new Set([
  "schema_version",
  "provider_id",
  "evidence_kind",
  "verification_id",
  "verification_sha256",
  "binding_id",
  "binding_sha256",
  "source_archive_sha256",
  "source_archive_size_bytes",
  "evidence_sha256",
  "receipt_id",
  "provider_verification_request_sha256",
  "provider_verification_response_body_sha256",
  "provider_verification_response_sha256",
  "policy_status",
  "daemon_identity_sha256",
  "policy_document_sha256",
  "checked_at",
  "proof_authority",
  "can_restore",
  "can_promote_claim",
  "can_certify_ga",
  "provider_policy_is_proof_authority",
  "policy_result_is_proof_authority",
  "result_can_be_used_as_proof",
  "policy_inspection_is_os_immutability_proof",
  "os_immutability_enforced",
  "requires_separate_os_immutability_attestation"
]);

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function inspectionPath(inspectionId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "goal3-source-release-external-provider-policy-inspection", inspectionId, "policy-inspection.json")
  );
}

function verificationPath(verificationId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "goal3-source-release-external-provider-verification", verificationId, "provider-verification.json")
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
    stale("Goal 3 source release external provider policy inspection referenced material is stale");
  }
  return sha256;
}

function sanitizeActor(value: string | undefined): string {
  return (value ?? "goal3-source-release-external-provider-policy-inspection")
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
    invalid(`Goal 3 source release external provider policy inspection ${label} is not project-relative`);
  }
  return normalized;
}

function asNonNegativeInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    invalid(`Goal 3 source release external provider policy inspection ${label} is invalid`);
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
    invalid(`Goal 3 source release external provider policy inspection ${label} contains public hazard text`);
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
        normalizedKey === "result_can_be_used_as_proof" ||
        normalizedKey === "os_immutability_enforced" ||
        normalizedKey === "policy_inspection_is_os_immutability_proof" ||
        normalizedKey === "verification_is_os_immutability_proof" ||
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

function containsUnknownProviderPolicyResponseKey(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((entry) => containsUnknownProviderPolicyResponseKey(entry));
  }
  if (!value || typeof value !== "object") {
    return false;
  }
  return Object.keys(value as Record<string, unknown>).some((key) => !allowedProviderPolicyResponseKeys.has(key));
}

function assertProviderUrl(value: string, label: string): string {
  if (secretTerms.test(value) || privilegedPublicTerms.test(value)) {
    invalid(`Goal 3 source release external provider policy inspection ${label} is unsafe`);
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    invalid(`Goal 3 source release external provider policy inspection ${label} is invalid`);
  }
  if ((parsed.protocol !== "http:" && parsed.protocol !== "https:") || parsed.username || parsed.password) {
    invalid(`Goal 3 source release external provider policy inspection ${label} is unsupported`);
  }
  return parsed.toString();
}

function sanitizeJsonContentType(projectRoot: string, value: string | null): string {
  const raw = (value ?? "unknown").trim();
  if (!raw || raw === "unknown") {
    return "unknown";
  }
  assertNoPublicHazards(projectRoot, raw, "provider policy response content type");
  const parts = raw.split(";").map((part) => part.trim().toLowerCase()).filter(Boolean);
  const mediaType = parts.shift();
  if (mediaType !== "application/json") {
    invalid("Goal 3 source release external provider policy inspection provider response content type is unsupported");
  }
  const parameters = new Set(parts);
  if (parameters.size === 0) {
    return "application/json";
  }
  if (parameters.size === 1 && parameters.has("charset=utf-8")) {
    return "application/json; charset=utf-8";
  }
  invalid("Goal 3 source release external provider policy inspection provider response content type is unsafe");
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
    stale("Goal 3 source release external provider policy inspection referenced artifact is stale");
  }
  const bytes = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(bytes);
  if (actualSha256 !== expectedSha256) {
    stale("Goal 3 source release external provider policy inspection referenced artifact hash is stale");
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
    invalid("Goal 3 source release external provider policy inspection referenced artifact JSON is invalid");
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
    invalid(`Goal 3 source release external provider policy inspection ${label} is invalid`);
  }
  return artifactReference(path, expectedKind, sha256, sizeBytes);
}

function assertArtifactBytesCurrent(projectRoot: string, artifact: ArtifactReference, label: string): void {
  const absolutePath = assertPathAllowed(projectRoot, artifact.path, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    stale(`Goal 3 source release external provider policy inspection ${label} is stale`);
  }
  const bytes = readFileSync(absolutePath);
  if (sha256Bytes(bytes) !== artifact.sha256 || bytes.byteLength !== artifact.size_bytes) {
    stale(`Goal 3 source release external provider policy inspection ${label} bytes are stale`);
  }
}

function assertSourceArchive(value: unknown): Goal3SourceReleaseExternalProviderPolicyInspectionSourceArchive {
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
    invalid("Goal 3 source release external provider policy inspection source archive metadata is invalid");
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
  archive: Goal3SourceReleaseExternalProviderPolicyInspectionSourceArchive
): void {
  const absoluteArchivePath = assertPathAllowed(projectRoot, archive.archive_path, {
    purpose: "read",
    resolveRealpath: true
  });
  if (!existsSync(absoluteArchivePath) || !statSync(absoluteArchivePath).isFile()) {
    stale("Goal 3 source release external provider policy inspection source archive is stale");
  }
  const bytes = readFileSync(absoluteArchivePath);
  if (sha256Bytes(bytes) !== archive.archive_sha256 || bytes.byteLength !== archive.size_bytes) {
    stale("Goal 3 source release external provider policy inspection source archive bytes are stale");
  }
}

function assertPublicArchiveReviewCurrent(projectRoot: string, projectId: string, reviewId: string, reviewPath: string): void {
  const canonicalPath = publicArchiveReviewPath(reviewId);
  if (reviewPath !== canonicalPath) {
    invalid("Goal 3 source release external provider policy inspection public archive review path is not canonical");
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
    stale("Goal 3 source release external provider policy inspection public archive review provenance is stale");
  }
  const absolutePath = assertPathAllowed(projectRoot, canonicalPath, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    stale("Goal 3 source release external provider policy inspection public archive review is stale");
  }
  const bytes = readFileSync(absolutePath);
  if (sha256Bytes(bytes) !== sha256 || bytes.byteLength !== sizeBytes) {
    stale("Goal 3 source release external provider policy inspection public archive review bytes are stale");
  }
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(bytes.toString("utf8")) as Record<string, unknown>;
  } catch {
    invalid("Goal 3 source release external provider policy inspection public archive review JSON is invalid");
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
    invalid("Goal 3 source release external provider policy inspection public archive review is invalid");
  }
}

function expectedEvidenceSchema(kind: EvidenceKind): string {
  return kind === "external_notarization"
    ? "comath.goal3_external_notarization_operator_evidence.v1"
    : "comath.goal3_os_immutable_storage_operator_evidence.v1";
}

function readOperatorEvidence(
  projectRoot: string,
  kind: EvidenceKind,
  projectId: string,
  verification: {
    providerId: string;
    sourceArchive: Goal3SourceReleaseExternalProviderPolicyInspectionSourceArchive;
    operatorEvidenceArtifact: ArtifactReference;
  }
): string {
  const absolutePath = assertPathAllowed(projectRoot, verification.operatorEvidenceArtifact.path, {
    purpose: "read",
    resolveRealpath: true
  });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    stale("Goal 3 source release external provider policy inspection operator evidence is stale");
  }
  const bytes = readFileSync(absolutePath);
  if (
    sha256Bytes(bytes) !== verification.operatorEvidenceArtifact.sha256 ||
    bytes.byteLength !== verification.operatorEvidenceArtifact.size_bytes
  ) {
    stale("Goal 3 source release external provider policy inspection operator evidence bytes are stale");
  }
  const text = bytes.toString("utf8");
  assertNoPublicHazards(projectRoot, text, "operator evidence");
  let body: OperatorEvidenceBody;
  try {
    body = JSON.parse(text) as OperatorEvidenceBody;
  } catch {
    invalid("Goal 3 source release external provider policy inspection operator evidence JSON is invalid");
  }
  const attestation =
    body.operator_attestation && typeof body.operator_attestation === "object" && !Array.isArray(body.operator_attestation)
      ? (body.operator_attestation as OperatorEvidenceAttestation)
      : {};
  const providerName = typeof attestation.provider_name === "string" ? attestation.provider_name.trim() : "";
  const receiptId = typeof attestation.receipt_id === "string" ? attestation.receipt_id.trim() : "";
  if (
    body.schema_version !== expectedEvidenceSchema(kind) ||
    body.project_id !== projectId ||
    body.evidence_kind !== kind ||
    normalizeRelativePath(String(body.source_archive_path ?? "")) !== verification.sourceArchive.archive_path ||
    String(body.source_archive_sha256 ?? "").trim().toLowerCase() !== verification.sourceArchive.archive_sha256 ||
    body.source_archive_size_bytes !== verification.sourceArchive.size_bytes ||
    body.external_verification_performed !== false ||
    body.proof_authority !== "none" ||
    body.can_restore !== false ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    body.evidence_is_proof_authority !== false ||
    providerName !== verification.providerId ||
    !receiptId
  ) {
    invalid("Goal 3 source release external provider policy inspection operator evidence is invalid");
  }
  return receiptId;
}

function readTask313Verification(
  projectRoot: string,
  input: Goal3SourceReleaseExternalProviderPolicyInspectionInput,
  verificationId: string,
  projectId: string,
  providerId: string
): {
  body: Task313VerificationBody;
  artifact: ArtifactReference;
  sourceArchive: Goal3SourceReleaseExternalProviderPolicyInspectionSourceArchive;
  operatorEvidenceArtifact: ArtifactReference;
  receiptId: string;
  evidenceKind: EvidenceKind;
  providerRequestSha256: string;
  providerResponseBodySha256: string;
  providerResponseSha256: string;
} {
  const canonicalPath = verificationPath(verificationId);
  if (normalizeRelativePath(input.verification_path) !== canonicalPath) {
    invalid("Goal 3 source release external provider policy inspection verification path is not canonical");
  }
  const read = readJsonArtifact(
    projectRoot,
    canonicalPath,
    input.verification_sha256,
    "goal3_source_release_external_provider_verification"
  );
  assertNoPublicHazards(projectRoot, read.text, "verification");
  const body = read.body && typeof read.body === "object" && !Array.isArray(read.body) ? (read.body as Task313VerificationBody) : {};
  const evidenceKind = body.evidence_kind;
  if (evidenceKind !== "external_notarization" && evidenceKind !== "os_immutable_storage") {
    invalid("Goal 3 source release external provider policy inspection evidence kind is invalid");
  }
  const bindingArtifact = parseArtifactReference(body.binding_artifact, "goal3_source_release_external_evidence_binding", "binding artifact");
  const operatorEvidenceArtifact = parseArtifactReference(
    body.operator_evidence_artifact,
    evidenceKind === "external_notarization"
      ? "goal3_external_notarization_operator_evidence"
      : "goal3_os_immutable_storage_operator_evidence",
    "operator evidence artifact"
  );
  const sourceArchive = assertSourceArchive(body.source_archive);
  const providerRequestSha256 = typeof body.provider_request_sha256 === "string" ? body.provider_request_sha256.trim().toLowerCase() : "";
  const providerResponseBodySha256 =
    typeof body.provider_response_body_sha256 === "string" ? body.provider_response_body_sha256.trim().toLowerCase() : "";
  const providerResponseSha256 =
    typeof body.provider_response_sha256 === "string" ? body.provider_response_sha256.trim().toLowerCase() : "";
  const providerCheckedAt = typeof body.provider_checked_at === "string" ? body.provider_checked_at.trim() : "";
  if (
    body.schema_version !== "comath.goal3_source_release_external_provider_verification.v1" ||
    body.verification_id !== verificationId ||
    body.project_id !== projectId ||
    body.ok !== true ||
    body.external_provider_verification_status !== "provider_response_verified" ||
    normalizeRelativePath(String(body.verification_path ?? "")) !== read.artifact.path ||
    body.binding_id !== String(body.binding_id ?? "").trim() ||
    body.binding_path !== bindingArtifact.path ||
    body.binding_sha256 !== bindingArtifact.sha256 ||
    body.binding_current !== true ||
    body.source_archive_current !== true ||
    body.operator_evidence_current !== true ||
    body.provider_id !== providerId ||
    body.provider_response_status !== 200 ||
    !/^[a-f0-9]{64}$/u.test(providerRequestSha256) ||
    !/^[a-f0-9]{64}$/u.test(providerResponseBodySha256) ||
    !/^[a-f0-9]{64}$/u.test(providerResponseSha256) ||
    !providerCheckedAt ||
    Number.isNaN(Date.parse(providerCheckedAt)) ||
    body.external_verification_performed !== true ||
    body.external_verification_result !== "provider_verified" ||
    body.proof_authority !== "none" ||
    body.can_restore !== false ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    body.verification_is_proof_authority !== false ||
    body.provider_result_is_proof_authority !== false ||
    body.result_can_be_used_as_proof !== false ||
    body.verification_is_os_immutability_proof !== false ||
    body.requires_separate_lean_authority !== true ||
    body.requires_separate_os_policy_inspection !== true ||
    typeof body.public_archive_review_id !== "string" ||
    typeof body.public_archive_review_path !== "string" ||
    body.public_archive_review_ok !== true
  ) {
    invalid("Goal 3 source release external provider policy inspection Task313 verification is not current non-authoritative material");
  }
  assertArtifactBytesCurrent(projectRoot, bindingArtifact, "binding artifact");
  assertArchiveBytesCurrent(projectRoot, sourceArchive);
  assertPublicArchiveReviewCurrent(
    projectRoot,
    projectId,
    body.public_archive_review_id,
    normalizeRelativePath(body.public_archive_review_path)
  );
  const receiptId = readOperatorEvidence(projectRoot, evidenceKind, projectId, {
    providerId,
    sourceArchive,
    operatorEvidenceArtifact
  });
  return {
    body,
    artifact: read.artifact,
    sourceArchive,
    operatorEvidenceArtifact,
    receiptId,
    evidenceKind,
    providerRequestSha256,
    providerResponseBodySha256,
    providerResponseSha256
  };
}

async function callProviderPolicy(
  projectRoot: string,
  providerUrl: string,
  requestPayload: ProviderPolicyInspectionRequest
): Promise<{
  status: number;
  contentType: string;
  bodyText: string;
  body: ProviderPolicyInspectionResponseBody;
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
    invalid("Goal 3 source release external provider policy inspection provider request failed");
  } finally {
    clearTimeout(timeout);
  }
  assertNoPublicHazards(projectRoot, bodyText, "provider policy response");
  let body: ProviderPolicyInspectionResponseBody;
  try {
    body = JSON.parse(bodyText) as ProviderPolicyInspectionResponseBody;
  } catch {
    invalid("Goal 3 source release external provider policy inspection provider response JSON is invalid");
  }
  return {
    status: response.status,
    contentType: response.headers.get("content-type") ?? "unknown",
    bodyText,
    body,
    responseSha256: sha256Text(canonicalJson({ status: response.status, headers: { "content-type": contentType }, body })),
    bodySha256: sha256Text(bodyText)
  };
}

function assertProviderPolicyResponse(
  response: Awaited<ReturnType<typeof callProviderPolicy>>,
  request: ProviderPolicyInspectionRequest
): { checkedAt: string; daemonIdentitySha256: string; policyDocumentSha256: string } {
  const body = response.body;
  const checkedAt = typeof body.checked_at === "string" ? body.checked_at.trim() : "";
  const daemonIdentitySha256 =
    typeof body.daemon_identity_sha256 === "string" ? body.daemon_identity_sha256.trim().toLowerCase() : "";
  const policyDocumentSha256 =
    typeof body.policy_document_sha256 === "string" ? body.policy_document_sha256.trim().toLowerCase() : "";
  if (
    response.status < 200 ||
    response.status >= 300 ||
    body.schema_version !== "comath.goal3_external_provider_policy_inspection_response.v1" ||
    body.provider_id !== request.provider_id ||
    body.evidence_kind !== request.evidence_kind ||
    body.verification_id !== request.verification_id ||
    String(body.verification_sha256 ?? "").trim().toLowerCase() !== request.verification_sha256 ||
    body.binding_id !== request.binding_id ||
    String(body.binding_sha256 ?? "").trim().toLowerCase() !== request.binding_sha256 ||
    String(body.source_archive_sha256 ?? "").trim().toLowerCase() !== request.source_archive_sha256 ||
    body.source_archive_size_bytes !== request.source_archive_size_bytes ||
    String(body.evidence_sha256 ?? "").trim().toLowerCase() !== request.evidence_sha256 ||
    body.receipt_id !== request.receipt_id ||
    String(body.provider_verification_request_sha256 ?? "").trim().toLowerCase() !==
      request.provider_verification_request_sha256 ||
    String(body.provider_verification_response_body_sha256 ?? "").trim().toLowerCase() !==
      request.provider_verification_response_body_sha256 ||
    String(body.provider_verification_response_sha256 ?? "").trim().toLowerCase() !==
      request.provider_verification_response_sha256 ||
    body.policy_status !== "policy_current" ||
    !/^[a-f0-9]{64}$/u.test(daemonIdentitySha256) ||
    !/^[a-f0-9]{64}$/u.test(policyDocumentSha256) ||
    !checkedAt ||
    Number.isNaN(Date.parse(checkedAt)) ||
    body.proof_authority !== "none" ||
    body.can_restore !== false ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    body.provider_policy_is_proof_authority !== false ||
    body.policy_result_is_proof_authority !== false ||
    body.result_can_be_used_as_proof !== false ||
    body.policy_inspection_is_os_immutability_proof !== false ||
    body.os_immutability_enforced !== false ||
    body.requires_separate_os_immutability_attestation !== true ||
    containsProviderAuthorityOverclaim(body) ||
    containsUnknownProviderPolicyResponseKey(body)
  ) {
    invalid("Goal 3 source release external provider policy inspection provider response is invalid");
  }
  return { checkedAt, daemonIdentitySha256, policyDocumentSha256 };
}

export async function recordGoal3SourceReleaseExternalProviderPolicyInspection(
  projectRoot: string,
  input: Goal3SourceReleaseExternalProviderPolicyInspectionInput
): Promise<Goal3SourceReleaseExternalProviderPolicyInspection> {
  const projectId = assertSafeId(input.project_id, "project_id");
  const inspectionId = assertSafeId(input.inspection_id, "inspection_id");
  const verificationId = assertSafeId(input.verification_id, "verification_id");
  const providerId = assertSafeId(input.provider_id, "provider_id");
  const providerPolicyUrl = assertProviderUrl(input.provider_policy_url, "provider policy URL");
  const providerTermsUrl = assertProviderTermsUrl(input.provider_terms_url);
  const outputPath = inspectionPath(inspectionId);
  const publicReviewId = `GOAL3-SOURCE-RELEASE-PROVIDER-POLICY-INSPECTION-${inspectionId}`;
  const publicReviewPath = publicArchiveReviewPath(publicReviewId);
  const absoluteOutputPath = assertPathAllowed(projectRoot, outputPath, { purpose: "runtime-write" });
  const absolutePublicReviewPath = assertPathAllowed(projectRoot, publicReviewPath, { purpose: "runtime-write" });
  if (existsSync(absoluteOutputPath) || existsSync(absolutePublicReviewPath)) {
    throw new ComathError("Goal 3 source release external provider policy inspection already exists", {
      statusCode: 409,
      code: alreadyExistsCode
    });
  }

  const verification = readTask313Verification(projectRoot, input, verificationId, projectId, providerId);
  const bindingId = String(verification.body.binding_id);
  const requestPayload: ProviderPolicyInspectionRequest = {
    schema_version: "comath.goal3_external_provider_policy_inspection_request.v1",
    provider_id: providerId,
    evidence_kind: verification.evidenceKind,
    verification_id: verificationId,
    verification_sha256: verification.artifact.sha256,
    binding_id: bindingId,
    binding_sha256: String(verification.body.binding_sha256),
    source_archive_sha256: verification.sourceArchive.archive_sha256,
    source_archive_size_bytes: verification.sourceArchive.size_bytes,
    evidence_sha256: verification.operatorEvidenceArtifact.sha256,
    receipt_id: verification.receiptId,
    provider_verification_request_sha256: verification.providerRequestSha256,
    provider_verification_response_body_sha256: verification.providerResponseBodySha256,
    provider_verification_response_sha256: verification.providerResponseSha256,
    policy_inspection_purpose: "provider_policy_currentness_only",
    proof_authority: "none",
    can_restore: false,
    can_promote_claim: false,
    can_certify_ga: false
  };
  const providerPolicyResponse = await callProviderPolicy(projectRoot, providerPolicyUrl, requestPayload);
  const policy = assertProviderPolicyResponse(providerPolicyResponse, requestPayload);
  const actor = sanitizeActor(input.actor);
  const providerPolicyRequestSha256 = sha256Text(canonicalJson(requestPayload));

  const body: Goal3SourceReleaseExternalProviderPolicyInspectionBody = {
    schema_version: "comath.goal3_source_release_external_provider_policy_inspection.v1",
    inspection_id: inspectionId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    ok: true,
    provider_policy_inspection_status: "provider_policy_inspected",
    inspection_path: outputPath,
    verification_id: verificationId,
    verification_path: verification.artifact.path,
    verification_sha256: verification.artifact.sha256,
    verification_artifact: verification.artifact,
    verification_current: true,
    binding_id: bindingId,
    binding_sha256: String(verification.body.binding_sha256),
    source_archive: verification.sourceArchive,
    source_archive_current: true,
    evidence_kind: verification.evidenceKind,
    operator_evidence_artifact: verification.operatorEvidenceArtifact,
    operator_evidence_current: true,
    provider_id: providerId,
    provider_terms_url: providerTermsUrl,
    receipt_id: verification.receiptId,
    provider_verification_request_sha256: verification.providerRequestSha256,
    provider_verification_response_body_sha256: verification.providerResponseBodySha256,
    provider_verification_response_sha256: verification.providerResponseSha256,
    provider_policy_request_sha256: providerPolicyRequestSha256,
    provider_policy_response_status: providerPolicyResponse.status,
    provider_policy_response_content_type: providerPolicyResponse.contentType,
    provider_policy_response_body_sha256: providerPolicyResponse.bodySha256,
    provider_policy_response_sha256: providerPolicyResponse.responseSha256,
    provider_policy_checked_at: policy.checkedAt,
    daemon_identity_sha256: policy.daemonIdentitySha256,
    policy_document_sha256: policy.policyDocumentSha256,
    provider_policy_inspection_performed: true,
    provider_policy_result: "provider_policy_current",
    proof_authority: "none",
    can_restore: false,
    can_promote_claim: false,
    can_certify_ga: false,
    policy_inspection_is_proof_authority: false,
    provider_policy_is_proof_authority: false,
    policy_result_is_proof_authority: false,
    result_can_be_used_as_proof: false,
    policy_inspection_is_os_immutability_proof: false,
    os_immutability_enforced: false,
    requires_separate_lean_authority: true,
    requires_separate_os_immutability_attestation: true,
    public_archive_review_id: publicReviewId,
    public_archive_review_path: publicReviewPath,
    public_archive_review_ok: true
  };

  const publicPayload = sanitizePublicFormalAuthorityVocabulary({
    schema_version: "comath.goal3_source_release_external_provider_policy_inspection_route_payload.v1",
    inspection_id: inspectionId,
    verification_id: verificationId,
    verification_sha256: verification.artifact.sha256,
    binding_id: bindingId,
    binding_sha256: String(verification.body.binding_sha256),
    evidence_kind: verification.evidenceKind,
    operator_evidence_sha256: verification.operatorEvidenceArtifact.sha256,
    source_archive_sha256: verification.sourceArchive.archive_sha256,
    source_archive_size_bytes: verification.sourceArchive.size_bytes,
    provider_id: providerId,
    provider_policy_request_sha256: providerPolicyRequestSha256,
    provider_policy_response_body_sha256: providerPolicyResponse.bodySha256,
    provider_policy_inspection_performed: true,
    provider_policy_result: "provider_policy_current",
    proof_authority: "none",
    can_restore: false,
    can_promote_claim: false,
    can_certify_ga: false,
    policy_inspection_is_proof_authority: false,
    provider_policy_is_proof_authority: false,
    policy_result_is_proof_authority: false,
    result_can_be_used_as_proof: false,
    policy_inspection_is_os_immutability_proof: false,
    os_immutability_enforced: false,
    requires_separate_lean_authority: true,
    requires_separate_os_immutability_attestation: true
  });

  const archiveReview = reviewGoal3PublicArchiveSurfaces(projectRoot, {
    project_id: projectId,
    actor,
    review_id: publicReviewId,
    persist_failed_review: false,
    surfaces: [
      {
        surface_id: `source-release-external-provider-policy-inspection-route:${inspectionId}`,
        surface_kind: "public_route_payload",
        payload: publicPayload
      },
      {
        surface_id: `source-release-external-provider-policy-inspection-manifest:${inspectionId}`,
        surface_kind: "public_review_manifest",
        payload: body
      }
    ]
  });
  if (!archiveReview.ok) {
    invalid(
      `Goal 3 source release external provider policy inspection public archive review failed: ${archiveReview.vetoes.join(",")}`
    );
  }

  const bodyText = canonicalJson(body);
  mkdirSync(dirname(absoluteOutputPath), { recursive: true });
  writeFileSync(absoluteOutputPath, bodyText, "utf8");
  const result: Goal3SourceReleaseExternalProviderPolicyInspection = {
    ...body,
    inspection_artifact: artifactReference(
      outputPath,
      "goal3_source_release_external_provider_policy_inspection",
      sha256Text(bodyText),
      Buffer.byteLength(bodyText, "utf8")
    )
  };

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.goal3_source_release_external_provider_policy_inspection_recorded",
    actor,
    target_id: projectId,
    payload: {
      inspection_id: inspectionId,
      inspection_path: outputPath,
      inspection_sha256: result.inspection_artifact.sha256,
      verification_id: verificationId,
      verification_path: verification.artifact.path,
      verification_sha256: verification.artifact.sha256,
      binding_id: bindingId,
      binding_sha256: String(verification.body.binding_sha256),
      evidence_kind: verification.evidenceKind,
      operator_evidence_path: verification.operatorEvidenceArtifact.path,
      operator_evidence_sha256: verification.operatorEvidenceArtifact.sha256,
      source_archive_path: verification.sourceArchive.archive_path,
      source_archive_sha256: verification.sourceArchive.archive_sha256,
      source_archive_size_bytes: verification.sourceArchive.size_bytes,
      provider_id: providerId,
      provider_verification_response_sha256: verification.providerResponseSha256,
      provider_policy_request_sha256: providerPolicyRequestSha256,
      provider_policy_response_body_sha256: providerPolicyResponse.bodySha256,
      provider_policy_response_sha256: providerPolicyResponse.responseSha256,
      provider_policy_response_status: providerPolicyResponse.status,
      daemon_identity_sha256: policy.daemonIdentitySha256,
      policy_document_sha256: policy.policyDocumentSha256,
      public_archive_review_id: archiveReview.review_id,
      public_archive_review_path: archiveReview.manifest_path,
      public_archive_review_ok: true,
      provider_policy_inspection_performed: true,
      provider_policy_result: "provider_policy_current",
      proof_authority: "none",
      can_restore: false,
      can_promote_claim: false,
      can_certify_ga: false,
      policy_inspection_is_proof_authority: false,
      provider_policy_is_proof_authority: false,
      policy_result_is_proof_authority: false,
      result_can_be_used_as_proof: false,
      policy_inspection_is_os_immutability_proof: false,
      os_immutability_enforced: false,
      requires_separate_lean_authority: true,
      requires_separate_os_immutability_attestation: true
    }
  });

  return result;
}
