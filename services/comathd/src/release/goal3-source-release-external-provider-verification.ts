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

type SourceArchive = {
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

type Task311BindingBody = {
  schema_version?: unknown;
  binding_id?: unknown;
  project_id?: unknown;
  ok?: unknown;
  external_evidence_binding_status?: unknown;
  binding_path?: unknown;
  checklist_id?: unknown;
  checklist_path?: unknown;
  checklist_sha256?: unknown;
  checklist_artifact?: unknown;
  checklist_current?: unknown;
  checklist_public_archive_review_artifact?: unknown;
  checklist_public_archive_review_current?: unknown;
  source_archive?: unknown;
  source_archive_current?: unknown;
  external_notarization_evidence_artifact?: unknown;
  os_immutable_storage_evidence_artifact?: unknown;
  external_notarization_status?: unknown;
  os_immutable_storage_status?: unknown;
  external_verification_performed?: unknown;
  requires_future_external_verification?: unknown;
  proof_authority?: unknown;
  can_restore?: unknown;
  can_promote_claim?: unknown;
  can_certify_ga?: unknown;
  binding_is_proof_authority?: unknown;
  evidence_is_proof_authority?: unknown;
  claim_promotion_requires_ordinary_gate?: unknown;
  public_archive_review_id?: unknown;
  public_archive_review_path?: unknown;
  public_archive_review_ok?: unknown;
};

type PublicArchiveReviewBody = {
  schema_version?: unknown;
  review_id?: unknown;
  project_id?: unknown;
  ok?: unknown;
  proof_authority?: unknown;
  can_promote_claim?: unknown;
  review_is_proof_authority?: unknown;
  vetoes?: unknown;
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
  issued_at?: unknown;
  verification_instructions?: unknown;
};

type VerifiedOperatorEvidenceAttestation = {
  provider_name: string;
  receipt_id: string;
  evidence_uri: string;
};

type ProviderVerificationResponseBody = {
  schema_version?: unknown;
  provider_id?: unknown;
  evidence_kind?: unknown;
  binding_id?: unknown;
  binding_sha256?: unknown;
  source_archive_sha256?: unknown;
  source_archive_size_bytes?: unknown;
  evidence_sha256?: unknown;
  receipt_id?: unknown;
  verified?: unknown;
  checked_at?: unknown;
  proof_authority?: unknown;
  can_restore?: unknown;
  can_promote_claim?: unknown;
  can_certify_ga?: unknown;
  restore_source?: unknown;
  verification_is_proof_authority?: unknown;
  provider_result_is_proof_authority?: unknown;
  result_can_be_used_as_proof?: unknown;
  verification_is_os_immutability_proof?: unknown;
};

type EvidenceKind = "external_notarization" | "os_immutable_storage";

type ProviderVerificationRequest = {
  schema_version: "comath.goal3_external_provider_verification_request.v1";
  provider_id: string;
  evidence_kind: EvidenceKind;
  binding_id: string;
  binding_sha256: string;
  source_archive_sha256: string;
  source_archive_size_bytes: number;
  evidence_sha256: string;
  receipt_id: string;
  evidence_uri: string;
  proof_authority: "none";
  can_restore: false;
  can_promote_claim: false;
  can_certify_ga: false;
};

export type Goal3SourceReleaseExternalProviderVerificationInput = {
  project_id: string;
  verification_id?: string;
  actor?: string;
  binding_id: string;
  binding_path: string;
  binding_sha256: string;
  evidence_kind: EvidenceKind;
  provider_id: string;
  provider_verify_url: string;
  provider_terms_url?: string;
};

export type Goal3SourceReleaseExternalProviderVerificationSourceArchive = {
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

export type Goal3SourceReleaseExternalProviderVerification = {
  schema_version: "comath.goal3_source_release_external_provider_verification.v1";
  verification_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  ok: true;
  external_provider_verification_status: "provider_response_verified";
  verification_path: string;
  binding_id: string;
  binding_path: string;
  binding_sha256: string;
  binding_artifact: ArtifactReference;
  binding_current: true;
  source_archive: Goal3SourceReleaseExternalProviderVerificationSourceArchive;
  source_archive_current: true;
  evidence_kind: EvidenceKind;
  operator_evidence_artifact: ArtifactReference;
  operator_evidence_current: true;
  provider_id: string;
  provider_terms_url: string | null;
  provider_request_sha256: string;
  provider_response_status: number;
  provider_response_content_type: string;
  provider_response_body_sha256: string;
  provider_response_sha256: string;
  provider_checked_at: string;
  external_verification_performed: true;
  external_verification_result: "provider_verified";
  proof_authority: "none";
  can_restore: false;
  can_promote_claim: false;
  can_certify_ga: false;
  verification_is_proof_authority: false;
  provider_result_is_proof_authority: false;
  result_can_be_used_as_proof: false;
  verification_is_os_immutability_proof: false;
  requires_separate_lean_authority: true;
  requires_separate_os_policy_inspection: true;
  public_archive_review_id: string;
  public_archive_review_path: string;
  public_archive_review_ok: true;
  verification_artifact: ArtifactReference;
};

type Goal3SourceReleaseExternalProviderVerificationBody = Omit<
  Goal3SourceReleaseExternalProviderVerification,
  "verification_artifact"
>;

const invalidCode = "GOAL3_SOURCE_RELEASE_EXTERNAL_PROVIDER_VERIFICATION_INVALID";
const staleCode = "GOAL3_SOURCE_RELEASE_EXTERNAL_PROVIDER_VERIFICATION_STALE";
const alreadyExistsCode = "GOAL3_SOURCE_RELEASE_EXTERNAL_PROVIDER_VERIFICATION_ALREADY_EXISTS";

const secretTerms = /Authorization:\s*Bearer|api[_-]?key(?:=\S+)?|token=\S+|sk-[A-Za-z0-9_-]+/iu;
const privilegedPublicTerms =
  /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|kernel_checked|lean_kernel_clean_replay|proof_success|proven|verified_final_authority_evidence|GA certified|can_certify_ga\s*[:=]\s*(?:true|1)|can_promote_claim\s*[:=]\s*(?:true|1))\b/iu;

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function verificationPath(verificationId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "goal3-source-release-external-provider-verification", verificationId, "provider-verification.json")
  );
}

function bindingPath(bindingId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "goal3-source-release-external-evidence-binding", bindingId, "external-evidence-binding.json")
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
    stale("Goal 3 source release external provider verification referenced material is stale");
  }
  return sha256;
}

function sanitizeActor(value: string | undefined): string {
  return (value ?? "goal3-source-release-external-provider-verification")
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
    invalid(`Goal 3 source release external provider verification ${label} is not project-relative`);
  }
  return normalized;
}

function asNonNegativeInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    invalid(`Goal 3 source release external provider verification ${label} is invalid`);
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
    invalid(`Goal 3 source release external provider verification ${label} contains public hazard text`);
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

function assertProviderUrl(value: string, label: string): string {
  if (secretTerms.test(value) || privilegedPublicTerms.test(value)) {
    invalid(`Goal 3 source release external provider verification ${label} is unsafe`);
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    invalid(`Goal 3 source release external provider verification ${label} is invalid`);
  }
  if ((parsed.protocol !== "http:" && parsed.protocol !== "https:") || parsed.username || parsed.password) {
    invalid(`Goal 3 source release external provider verification ${label} is unsupported`);
  }
  return parsed.toString();
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
    stale("Goal 3 source release external provider verification referenced artifact is stale");
  }
  const bytes = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(bytes);
  if (actualSha256 !== expectedSha256) {
    stale("Goal 3 source release external provider verification referenced artifact hash is stale");
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
    invalid("Goal 3 source release external provider verification referenced artifact JSON is invalid");
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
    invalid(`Goal 3 source release external provider verification ${label} is invalid`);
  }
  return artifactReference(path, expectedKind, sha256, sizeBytes);
}

function assertArtifactBytesCurrent(projectRoot: string, artifact: ArtifactReference, label: string): void {
  const absolutePath = assertPathAllowed(projectRoot, artifact.path, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    stale(`Goal 3 source release external provider verification ${label} is stale`);
  }
  const bytes = readFileSync(absolutePath);
  if (sha256Bytes(bytes) !== artifact.sha256 || bytes.byteLength !== artifact.size_bytes) {
    stale(`Goal 3 source release external provider verification ${label} bytes are stale`);
  }
}

function assertSourceArchive(value: unknown): Goal3SourceReleaseExternalProviderVerificationSourceArchive {
  const archive = value && typeof value === "object" && !Array.isArray(value) ? (value as SourceArchive) : {};
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
    !archivePath.startsWith(".comath/release/goal3-source-only-open-source-review-artifact/") ||
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
    invalid("Goal 3 source release external provider verification source archive metadata is invalid");
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

function publicArchiveReviewArtifactFromAudit(projectRoot: string, reviewId: string, reviewPath: string): ArtifactReference {
  const event = readAuditEvents(projectRoot).find((entry) => {
    const payload = entry.payload as Record<string, unknown>;
    return (
      entry.event_type === "goal3.public_archive_review_completed" &&
      payload.review_id === reviewId &&
      normalizeRelativePath(String(payload.manifest_path ?? "")) === reviewPath
    );
  });
  const payload = event?.payload as Record<string, unknown> | undefined;
  const sha256 = typeof payload?.manifest_sha256 === "string" ? payload.manifest_sha256.trim().toLowerCase() : "";
  const sizeBytes = payload?.manifest_size_bytes;
  if (!/^[a-f0-9]{64}$/u.test(sha256) || typeof sizeBytes !== "number" || !Number.isSafeInteger(sizeBytes) || sizeBytes < 0) {
    stale("Goal 3 source release external provider verification public archive review provenance is stale");
  }
  return artifactReference(reviewPath, "goal3_public_archive_review", sha256, sizeBytes);
}

function assertPublicArchiveReviewCurrent(projectRoot: string, projectId: string, reviewId: string, reviewPath: string): void {
  const canonicalPath = publicArchiveReviewPath(reviewId);
  if (reviewPath !== canonicalPath) {
    invalid("Goal 3 source release external provider verification public archive review path is not canonical");
  }
  const expectedArtifact = publicArchiveReviewArtifactFromAudit(projectRoot, reviewId, canonicalPath);
  assertArtifactBytesCurrent(projectRoot, expectedArtifact, "public archive review");
  const absolutePath = assertPathAllowed(projectRoot, canonicalPath, { purpose: "read", resolveRealpath: true });
  const body = JSON.parse(readFileSync(absolutePath, "utf8")) as PublicArchiveReviewBody;
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
    invalid("Goal 3 source release external provider verification public archive review is not current non-authoritative material");
  }
}

function assertArchiveBytesCurrent(projectRoot: string, archive: Goal3SourceReleaseExternalProviderVerificationSourceArchive): void {
  const absoluteArchivePath = assertPathAllowed(projectRoot, archive.archive_path, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absoluteArchivePath) || !statSync(absoluteArchivePath).isFile()) {
    stale("Goal 3 source release external provider verification source archive is stale");
  }
  const bytes = readFileSync(absoluteArchivePath);
  if (sha256Bytes(bytes) !== archive.archive_sha256 || bytes.byteLength !== archive.size_bytes) {
    stale("Goal 3 source release external provider verification source archive bytes are stale");
  }
}

function readBinding(
  projectRoot: string,
  input: Goal3SourceReleaseExternalProviderVerificationInput,
  bindingId: string,
  projectId: string
): {
  body: Task311BindingBody;
  artifact: ArtifactReference;
  archive: Goal3SourceReleaseExternalProviderVerificationSourceArchive;
  evidenceArtifact: ArtifactReference;
} {
  const canonicalPath = bindingPath(bindingId);
  if (normalizeRelativePath(input.binding_path) !== canonicalPath) {
    invalid("Goal 3 source release external provider verification binding path is not canonical");
  }
  const read = readJsonArtifact(
    projectRoot,
    canonicalPath,
    input.binding_sha256,
    "goal3_source_release_external_evidence_binding"
  );
  assertNoPublicHazards(projectRoot, read.text, "binding");
  const body = read.body && typeof read.body === "object" && !Array.isArray(read.body) ? (read.body as Task311BindingBody) : {};
  if (
    body.schema_version !== "comath.goal3_source_release_external_evidence_binding.v1" ||
    body.binding_id !== bindingId ||
    body.project_id !== projectId ||
    body.ok !== true ||
    body.external_evidence_binding_status !== "source_release_external_evidence_bound" ||
    normalizeRelativePath(String(body.binding_path ?? "")) !== read.artifact.path ||
    body.checklist_current !== true ||
    body.checklist_public_archive_review_current !== true ||
    body.source_archive_current !== true ||
    body.external_notarization_status !== "operator_evidence_bound" ||
    body.os_immutable_storage_status !== "operator_evidence_bound" ||
    body.external_verification_performed !== false ||
    body.requires_future_external_verification !== true ||
    body.proof_authority !== "none" ||
    body.can_restore !== false ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    body.binding_is_proof_authority !== false ||
    body.evidence_is_proof_authority !== false ||
    body.claim_promotion_requires_ordinary_gate !== true ||
    typeof body.public_archive_review_id !== "string" ||
    typeof body.public_archive_review_path !== "string" ||
    body.public_archive_review_ok !== true
  ) {
    invalid("Goal 3 source release external provider verification binding is not current non-authoritative material");
  }
  const archive = assertSourceArchive(body.source_archive);
  const checklistArtifact = parseArtifactReference(body.checklist_artifact, "goal3_source_release_public_checklist", "checklist artifact");
  const checklistPublicReviewArtifact = parseArtifactReference(
    body.checklist_public_archive_review_artifact,
    "goal3_public_archive_review",
    "checklist public archive review artifact"
  );
  const externalNotarizationArtifact = parseArtifactReference(
    body.external_notarization_evidence_artifact,
    "goal3_external_notarization_operator_evidence",
    "external notarization evidence artifact"
  );
  const osImmutableStorageArtifact = parseArtifactReference(
    body.os_immutable_storage_evidence_artifact,
    "goal3_os_immutable_storage_operator_evidence",
    "OS immutable storage evidence artifact"
  );
  if (
    typeof body.checklist_id !== "string" ||
    !body.checklist_id.trim() ||
    normalizeRelativePath(String(body.checklist_path ?? "")) !== checklistArtifact.path ||
    String(body.checklist_sha256 ?? "").trim().toLowerCase() !== checklistArtifact.sha256
  ) {
    invalid("Goal 3 source release external provider verification binding checklist target drifted");
  }
  assertArtifactBytesCurrent(projectRoot, checklistArtifact, "checklist artifact");
  assertArtifactBytesCurrent(projectRoot, checklistPublicReviewArtifact, "checklist public archive review artifact");
  assertPublicArchiveReviewCurrent(
    projectRoot,
    projectId,
    body.public_archive_review_id,
    normalizeRelativePath(body.public_archive_review_path)
  );
  const evidenceArtifact = input.evidence_kind === "external_notarization" ? externalNotarizationArtifact : osImmutableStorageArtifact;
  return { body, artifact: read.artifact, archive, evidenceArtifact };
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
  binding: { body: Task311BindingBody; evidenceArtifact: ArtifactReference; archive: Goal3SourceReleaseExternalProviderVerificationSourceArchive }
): { body: OperatorEvidenceBody; attestation: VerifiedOperatorEvidenceAttestation } {
  const absolutePath = assertPathAllowed(projectRoot, binding.evidenceArtifact.path, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    stale("Goal 3 source release external provider verification operator evidence is stale");
  }
  const bytes = readFileSync(absolutePath);
  if (sha256Bytes(bytes) !== binding.evidenceArtifact.sha256 || bytes.byteLength !== binding.evidenceArtifact.size_bytes) {
    stale("Goal 3 source release external provider verification operator evidence bytes are stale");
  }
  const text = bytes.toString("utf8");
  assertNoPublicHazards(projectRoot, text, "operator evidence");
  let body: OperatorEvidenceBody;
  try {
    body = JSON.parse(text) as OperatorEvidenceBody;
  } catch {
    invalid("Goal 3 source release external provider verification operator evidence JSON is invalid");
  }
  const attestation =
    body.operator_attestation && typeof body.operator_attestation === "object" && !Array.isArray(body.operator_attestation)
      ? (body.operator_attestation as OperatorEvidenceAttestation)
      : {};
  const providerName = typeof attestation.provider_name === "string" ? attestation.provider_name.trim() : "";
  const receiptId = typeof attestation.receipt_id === "string" ? attestation.receipt_id.trim() : "";
  const evidenceUri = typeof attestation.evidence_uri === "string" ? attestation.evidence_uri.trim() : "";
  if (
    body.schema_version !== expectedEvidenceSchema(kind) ||
    body.project_id !== projectId ||
    body.evidence_kind !== kind ||
    body.binding_target_kind !== "goal3_source_release_public_checklist" ||
    body.binding_target_id !== binding.body.checklist_id ||
    normalizeRelativePath(String(body.binding_target_path ?? "")) !== normalizeRelativePath(String(binding.body.checklist_path ?? "")) ||
    String(body.binding_target_sha256 ?? "").trim().toLowerCase() !==
      parseArtifactReference(binding.body.checklist_artifact, "goal3_source_release_public_checklist", "checklist artifact").sha256 ||
    normalizeRelativePath(String(body.source_archive_path ?? "")) !== binding.archive.archive_path ||
    String(body.source_archive_sha256 ?? "").trim().toLowerCase() !== binding.archive.archive_sha256 ||
    body.source_archive_size_bytes !== binding.archive.size_bytes ||
    body.external_verification_performed !== false ||
    body.proof_authority !== "none" ||
    body.can_restore !== false ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    body.evidence_is_proof_authority !== false ||
    !providerName ||
    !receiptId ||
    !evidenceUri
  ) {
    invalid("Goal 3 source release external provider verification operator evidence is invalid");
  }
  return {
    body,
    attestation: {
      provider_name: providerName,
      receipt_id: receiptId,
      evidence_uri: evidenceUri
    }
  };
}

async function callProvider(
  projectRoot: string,
  providerUrl: string,
  requestPayload: ProviderVerificationRequest
): Promise<{
  status: number;
  contentType: string;
  bodyText: string;
  body: ProviderVerificationResponseBody;
  responseSha256: string;
  bodySha256: string;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  let response: Response;
  let bodyText: string;
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
  } catch {
    invalid("Goal 3 source release external provider verification provider request failed");
  } finally {
    clearTimeout(timeout);
  }
  assertNoPublicHazards(projectRoot, bodyText, "provider response");
  let body: ProviderVerificationResponseBody;
  try {
    body = JSON.parse(bodyText) as ProviderVerificationResponseBody;
  } catch {
    invalid("Goal 3 source release external provider verification provider response JSON is invalid");
  }
  return {
    status: response.status,
    contentType: response.headers.get("content-type") ?? "unknown",
    bodyText,
    body,
    responseSha256: sha256Text(canonicalJson({ status: response.status, headers: { "content-type": response.headers.get("content-type") ?? "unknown" }, body })),
    bodySha256: sha256Text(bodyText)
  };
}

function assertProviderResponse(
  response: Awaited<ReturnType<typeof callProvider>>,
  input: Goal3SourceReleaseExternalProviderVerificationInput,
  binding: { artifact: ArtifactReference; archive: Goal3SourceReleaseExternalProviderVerificationSourceArchive; evidenceArtifact: ArtifactReference },
  attestation: VerifiedOperatorEvidenceAttestation
): string {
  const body = response.body;
  const checkedAt = typeof body.checked_at === "string" ? body.checked_at.trim() : "";
  if (
    response.status < 200 ||
    response.status >= 300 ||
    body.schema_version !== "comath.goal3_external_provider_verification_response.v1" ||
    body.provider_id !== input.provider_id ||
    body.evidence_kind !== input.evidence_kind ||
    body.binding_id !== input.binding_id ||
    String(body.binding_sha256 ?? "").trim().toLowerCase() !== binding.artifact.sha256 ||
    String(body.source_archive_sha256 ?? "").trim().toLowerCase() !== binding.archive.archive_sha256 ||
    body.source_archive_size_bytes !== binding.archive.size_bytes ||
    String(body.evidence_sha256 ?? "").trim().toLowerCase() !== binding.evidenceArtifact.sha256 ||
    body.receipt_id !== attestation.receipt_id ||
    body.verified !== true ||
    !checkedAt ||
    Number.isNaN(Date.parse(checkedAt)) ||
    body.proof_authority !== "none" ||
    body.can_restore !== false ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    containsProviderAuthorityOverclaim(body)
  ) {
    invalid("Goal 3 source release external provider verification provider response is invalid");
  }
  return checkedAt;
}

export async function recordGoal3SourceReleaseExternalProviderVerification(
  projectRoot: string,
  input: Goal3SourceReleaseExternalProviderVerificationInput
): Promise<Goal3SourceReleaseExternalProviderVerification> {
  const projectId = assertSafeId(input.project_id, "project_id");
  const verificationId = assertSafeId(input.verification_id, "verification_id");
  const bindingId = assertSafeId(input.binding_id, "binding_id");
  const providerId = assertSafeId(input.provider_id, "provider_id");
  if (input.evidence_kind !== "external_notarization" && input.evidence_kind !== "os_immutable_storage") {
    invalid("Goal 3 source release external provider verification evidence kind is invalid");
  }
  const providerVerifyUrl = assertProviderUrl(input.provider_verify_url, "provider verification URL");
  const providerTermsUrl = assertProviderTermsUrl(input.provider_terms_url);
  const outputPath = verificationPath(verificationId);
  const publicReviewId = `GOAL3-SOURCE-RELEASE-EXTERNAL-PROVIDER-VERIFICATION-${verificationId}`;
  const publicReviewPath = publicArchiveReviewPath(publicReviewId);
  const absoluteOutputPath = assertPathAllowed(projectRoot, outputPath, { purpose: "runtime-write" });
  const absolutePublicReviewPath = assertPathAllowed(projectRoot, publicReviewPath, { purpose: "runtime-write" });
  if (existsSync(absoluteOutputPath) || existsSync(absolutePublicReviewPath)) {
    throw new ComathError("Goal 3 source release external provider verification already exists", {
      statusCode: 409,
      code: alreadyExistsCode
    });
  }

  const binding = readBinding(projectRoot, input, bindingId, projectId);
  assertArchiveBytesCurrent(projectRoot, binding.archive);
  const operatorEvidence = readOperatorEvidence(projectRoot, input.evidence_kind, projectId, binding);
  if (operatorEvidence.attestation.provider_name !== providerId) {
    invalid("Goal 3 source release external provider verification provider id does not match operator evidence");
  }

  const requestPayload: ProviderVerificationRequest = {
    schema_version: "comath.goal3_external_provider_verification_request.v1",
    provider_id: providerId,
    evidence_kind: input.evidence_kind,
    binding_id: bindingId,
    binding_sha256: binding.artifact.sha256,
    source_archive_sha256: binding.archive.archive_sha256,
    source_archive_size_bytes: binding.archive.size_bytes,
    evidence_sha256: binding.evidenceArtifact.sha256,
    receipt_id: operatorEvidence.attestation.receipt_id,
    evidence_uri: operatorEvidence.attestation.evidence_uri,
    proof_authority: "none",
    can_restore: false,
    can_promote_claim: false,
    can_certify_ga: false
  };
  const providerResponse = await callProvider(projectRoot, providerVerifyUrl, requestPayload);
  const providerCheckedAt = assertProviderResponse(providerResponse, input, binding, operatorEvidence.attestation);
  const actor = sanitizeActor(input.actor);
  const providerRequestSha256 = sha256Text(canonicalJson(requestPayload));

  const body: Goal3SourceReleaseExternalProviderVerificationBody = {
    schema_version: "comath.goal3_source_release_external_provider_verification.v1",
    verification_id: verificationId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    ok: true,
    external_provider_verification_status: "provider_response_verified",
    verification_path: outputPath,
    binding_id: bindingId,
    binding_path: binding.artifact.path,
    binding_sha256: binding.artifact.sha256,
    binding_artifact: binding.artifact,
    binding_current: true,
    source_archive: binding.archive,
    source_archive_current: true,
    evidence_kind: input.evidence_kind,
    operator_evidence_artifact: binding.evidenceArtifact,
    operator_evidence_current: true,
    provider_id: providerId,
    provider_terms_url: providerTermsUrl,
    provider_request_sha256: providerRequestSha256,
    provider_response_status: providerResponse.status,
    provider_response_content_type: providerResponse.contentType,
    provider_response_body_sha256: providerResponse.bodySha256,
    provider_response_sha256: providerResponse.responseSha256,
    provider_checked_at: providerCheckedAt,
    external_verification_performed: true,
    external_verification_result: "provider_verified",
    proof_authority: "none",
    can_restore: false,
    can_promote_claim: false,
    can_certify_ga: false,
    verification_is_proof_authority: false,
    provider_result_is_proof_authority: false,
    result_can_be_used_as_proof: false,
    verification_is_os_immutability_proof: false,
    requires_separate_lean_authority: true,
    requires_separate_os_policy_inspection: true,
    public_archive_review_id: publicReviewId,
    public_archive_review_path: publicReviewPath,
    public_archive_review_ok: true
  };

  const publicPayload = sanitizePublicFormalAuthorityVocabulary({
    schema_version: "comath.goal3_source_release_external_provider_verification_route_payload.v1",
    verification_id: verificationId,
    binding_id: bindingId,
    binding_sha256: binding.artifact.sha256,
    evidence_kind: input.evidence_kind,
    operator_evidence_sha256: binding.evidenceArtifact.sha256,
    source_archive_sha256: binding.archive.archive_sha256,
    source_archive_size_bytes: binding.archive.size_bytes,
    provider_id: providerId,
    provider_request_sha256: providerRequestSha256,
    provider_response_body_sha256: providerResponse.bodySha256,
    external_verification_performed: true,
    external_verification_result: "provider_verified",
    proof_authority: "none",
    can_restore: false,
    can_promote_claim: false,
    can_certify_ga: false,
    verification_is_proof_authority: false,
    provider_result_is_proof_authority: false,
    result_can_be_used_as_proof: false,
    verification_is_os_immutability_proof: false,
    requires_separate_lean_authority: true,
    requires_separate_os_policy_inspection: true
  });

  const archiveReview = reviewGoal3PublicArchiveSurfaces(projectRoot, {
    project_id: projectId,
    actor,
    review_id: publicReviewId,
    persist_failed_review: false,
    surfaces: [
      {
        surface_id: `source-release-external-provider-verification-route:${verificationId}`,
        surface_kind: "public_route_payload",
        payload: publicPayload
      },
      {
        surface_id: `source-release-external-provider-verification-manifest:${verificationId}`,
        surface_kind: "public_review_manifest",
        payload: body
      }
    ]
  });
  if (!archiveReview.ok) {
    invalid(
      `Goal 3 source release external provider verification public archive review failed: ${archiveReview.vetoes.join(",")}`
    );
  }

  const bodyText = canonicalJson(body);
  mkdirSync(dirname(absoluteOutputPath), { recursive: true });
  writeFileSync(absoluteOutputPath, bodyText, "utf8");
  const result: Goal3SourceReleaseExternalProviderVerification = {
    ...body,
    verification_artifact: artifactReference(
      outputPath,
      "goal3_source_release_external_provider_verification",
      sha256Text(bodyText),
      Buffer.byteLength(bodyText, "utf8")
    )
  };

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.goal3_source_release_external_provider_verification_recorded",
    actor,
    target_id: projectId,
    payload: {
      verification_id: verificationId,
      verification_path: outputPath,
      verification_sha256: result.verification_artifact.sha256,
      binding_id: bindingId,
      binding_path: binding.artifact.path,
      binding_sha256: binding.artifact.sha256,
      evidence_kind: input.evidence_kind,
      operator_evidence_path: binding.evidenceArtifact.path,
      operator_evidence_sha256: binding.evidenceArtifact.sha256,
      source_archive_path: binding.archive.archive_path,
      source_archive_sha256: binding.archive.archive_sha256,
      source_archive_size_bytes: binding.archive.size_bytes,
      provider_id: providerId,
      provider_request_sha256: providerRequestSha256,
      provider_response_body_sha256: providerResponse.bodySha256,
      provider_response_sha256: providerResponse.responseSha256,
      provider_response_status: providerResponse.status,
      public_archive_review_id: archiveReview.review_id,
      public_archive_review_path: archiveReview.manifest_path,
      public_archive_review_ok: true,
      external_verification_performed: true,
      external_verification_result: "provider_verified",
      proof_authority: "none",
      can_restore: false,
      can_promote_claim: false,
      can_certify_ga: false,
      verification_is_proof_authority: false,
      provider_result_is_proof_authority: false,
      result_can_be_used_as_proof: false,
      verification_is_os_immutability_proof: false,
      requires_separate_lean_authority: true,
      requires_separate_os_policy_inspection: true
    }
  });

  return result;
}
