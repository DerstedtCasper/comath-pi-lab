import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
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

type Task310SourceArchive = {
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

type Task310DownloadDescriptor = {
  schema_version?: unknown;
  source_review_artifact_id?: unknown;
  source_archive_path?: unknown;
  source_archive_sha256?: unknown;
  size_bytes?: unknown;
  content_type?: unknown;
  filename?: unknown;
  source_only?: unknown;
  can_restore?: unknown;
  restore_source?: unknown;
  exposes_host_paths?: unknown;
  proof_authority?: unknown;
  can_promote_claim?: unknown;
  can_certify_ga?: unknown;
  download_is_public_diagnostic?: unknown;
};

type Task310ChecklistBody = {
  schema_version?: unknown;
  checklist_id?: unknown;
  project_id?: unknown;
  ok?: unknown;
  release_checklist_status?: unknown;
  checklist_path?: unknown;
  presentation_review_current?: unknown;
  source_review_artifact_id?: unknown;
  source_archive?: unknown;
  source_archive_current?: unknown;
  download_descriptor?: unknown;
  download_descriptor_current?: unknown;
  public_archive_review_ok?: unknown;
  checklist_items?: unknown;
  public_source_review_ready?: unknown;
  external_notarization_status?: unknown;
  os_immutable_storage_status?: unknown;
  proof_authority?: unknown;
  can_restore?: unknown;
  can_promote_claim?: unknown;
  can_certify_ga?: unknown;
  checklist_is_proof_authority?: unknown;
  presentation_is_proof_authority?: unknown;
  source_artifact_is_proof_authority?: unknown;
  claim_promotion_requires_ordinary_gate?: unknown;
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

type OperatorEvidenceKind = "external_notarization" | "os_immutable_storage";

export type Goal3SourceReleaseExternalEvidenceBindingInput = {
  project_id: string;
  binding_id?: string;
  actor?: string;
  checklist_id: string;
  checklist_path: string;
  checklist_sha256: string;
  external_notarization_evidence_path: string;
  external_notarization_evidence_sha256: string;
  os_immutable_storage_evidence_path: string;
  os_immutable_storage_evidence_sha256: string;
};

export type Goal3SourceReleaseExternalEvidenceArchive = {
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

export type Goal3SourceReleaseExternalEvidenceBinding = {
  schema_version: "comath.goal3_source_release_external_evidence_binding.v1";
  binding_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  ok: true;
  external_evidence_binding_status: "source_release_external_evidence_bound";
  binding_path: string;
  checklist_id: string;
  checklist_path: string;
  checklist_sha256: string;
  checklist_artifact: ArtifactReference;
  checklist_current: true;
  source_archive: Goal3SourceReleaseExternalEvidenceArchive;
  source_archive_current: true;
  external_notarization_evidence_artifact: ArtifactReference;
  os_immutable_storage_evidence_artifact: ArtifactReference;
  external_notarization_status: "operator_evidence_bound";
  os_immutable_storage_status: "operator_evidence_bound";
  external_verification_performed: false;
  requires_future_external_verification: true;
  proof_authority: "none";
  can_restore: false;
  can_promote_claim: false;
  can_certify_ga: false;
  binding_is_proof_authority: false;
  evidence_is_proof_authority: false;
  claim_promotion_requires_ordinary_gate: true;
  public_archive_review_id: string;
  public_archive_review_path: string;
  public_archive_review_ok: true;
  binding_artifact: ArtifactReference;
};

type Goal3SourceReleaseExternalEvidenceBindingBody = Omit<
  Goal3SourceReleaseExternalEvidenceBinding,
  "binding_artifact"
>;

const invalidCode = "GOAL3_SOURCE_RELEASE_EXTERNAL_EVIDENCE_BINDING_INVALID";
const staleCode = "GOAL3_SOURCE_RELEASE_EXTERNAL_EVIDENCE_BINDING_STALE";
const alreadyExistsCode = "GOAL3_SOURCE_RELEASE_EXTERNAL_EVIDENCE_BINDING_ALREADY_EXISTS";

const secretTerms = /Authorization:\s*Bearer|api[_-]?key(?:=\S+)?|token=\S+|sk-[A-Za-z0-9_-]+/iu;
const privilegedPublicTerms =
  /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|kernel_checked|lean_kernel_clean_replay|proof_success|proven|verified_final_authority_evidence|GA certified|can_certify_ga\s*[:=]\s*(?:true|1)|can_promote_claim\s*[:=]\s*(?:true|1))\b/iu;

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function checklistPath(checklistId: string): string {
  return normalizeRelativePath(join(".comath", "release", "goal3-source-release-public-checklist", checklistId, "checklist.json"));
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
    stale("Goal 3 source release external evidence binding referenced material is stale");
  }
  return sha256;
}

function sanitizeActor(value: string | undefined): string {
  return (value ?? "goal3-source-release-external-evidence-binding")
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
    invalid(`Goal 3 source release external evidence binding ${label} is not project-relative`);
  }
  return normalized;
}

function asNonNegativeInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    invalid(`Goal 3 source release external evidence binding ${label} is invalid`);
  }
  return value;
}

function readJsonArtifact(
  projectRoot: string,
  inputPath: string,
  inputSha256: string,
  expectedKind: string
): { body: unknown; artifact: ArtifactReference; text: string } {
  const path = assertProjectRelativePath(inputPath, "artifact path");
  const expectedSha256 = assertSha256(inputSha256);
  const absolutePath = assertPathAllowed(projectRoot, path, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    stale("Goal 3 source release external evidence binding referenced artifact is stale");
  }
  const bytes = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(bytes);
  if (actualSha256 !== expectedSha256) {
    stale("Goal 3 source release external evidence binding referenced artifact hash is stale");
  }
  const text = bytes.toString("utf8");
  try {
    return {
      body: JSON.parse(text) as unknown,
      artifact: artifactReference(path, expectedKind, actualSha256, bytes.byteLength),
      text
    };
  } catch {
    invalid("Goal 3 source release external evidence binding referenced artifact JSON is invalid");
  }
}

function assertTask310SourceArchive(value: unknown): Goal3SourceReleaseExternalEvidenceArchive {
  const archive = value && typeof value === "object" && !Array.isArray(value) ? (value as Task310SourceArchive) : {};
  const archivePath = typeof archive.archive_path === "string" ? normalizeRelativePath(archive.archive_path) : "";
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
    invalid("Goal 3 source release external evidence binding source archive metadata is invalid");
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

function assertTask310DownloadDescriptor(value: unknown, sourceReviewArtifactId: string, archive: Goal3SourceReleaseExternalEvidenceArchive): void {
  const descriptor = value && typeof value === "object" && !Array.isArray(value) ? (value as Task310DownloadDescriptor) : {};
  const sourceArchivePath = typeof descriptor.source_archive_path === "string" ? normalizeRelativePath(descriptor.source_archive_path) : "";
  const sourceArchiveSha256 =
    typeof descriptor.source_archive_sha256 === "string" ? descriptor.source_archive_sha256.trim().toLowerCase() : "";
  if (
    descriptor.schema_version !== "comath.goal3_source_artifact_download_descriptor.v1" ||
    descriptor.source_review_artifact_id !== sourceReviewArtifactId ||
    sourceArchivePath !== archive.archive_path ||
    sourceArchiveSha256 !== archive.archive_sha256 ||
    descriptor.size_bytes !== archive.size_bytes ||
    descriptor.content_type !== "application/x-tar" ||
    typeof descriptor.filename !== "string" ||
    !/^[A-Za-z0-9._-]+\.source\.tar$/u.test(descriptor.filename) ||
    descriptor.source_only !== true ||
    descriptor.can_restore !== false ||
    descriptor.restore_source !== false ||
    descriptor.exposes_host_paths !== false ||
    descriptor.proof_authority !== "none" ||
    descriptor.can_promote_claim !== false ||
    descriptor.can_certify_ga !== false ||
    descriptor.download_is_public_diagnostic !== true
  ) {
    invalid("Goal 3 source release external evidence binding download descriptor is not current non-restorable material");
  }
}

function assertChecklistItems(value: unknown): void {
  if (!Array.isArray(value)) {
    invalid("Goal 3 source release external evidence binding checklist items are invalid");
  }
  const expected = new Map([
    ["external_notarization_not_configured", "not_configured"],
    ["os_immutable_storage_not_configured", "not_configured"],
    ["source_archive_bytes_hash_bound", undefined]
  ]);
  for (const [itemId, policyStatus] of expected) {
    const item = value.find(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        !Array.isArray(entry) &&
        (entry as { item_id?: unknown }).item_id === itemId &&
        (entry as { status?: unknown }).status === "passed" &&
        (policyStatus === undefined || (entry as { policy_status?: unknown }).policy_status === policyStatus)
    );
    if (!item) {
      invalid(`Goal 3 source release external evidence binding checklist item ${itemId} is missing`);
    }
  }
}

function readChecklist(
  projectRoot: string,
  input: Goal3SourceReleaseExternalEvidenceBindingInput,
  checklistId: string,
  projectId: string
): { body: Task310ChecklistBody; artifact: ArtifactReference; archive: Goal3SourceReleaseExternalEvidenceArchive } {
  const canonicalPath = checklistPath(checklistId);
  if (normalizeRelativePath(input.checklist_path) !== canonicalPath) {
    invalid("Goal 3 source release external evidence binding checklist path is not canonical");
  }
  const read = readJsonArtifact(projectRoot, canonicalPath, input.checklist_sha256, "goal3_source_release_public_checklist");
  const body = read.body && typeof read.body === "object" && !Array.isArray(read.body) ? (read.body as Task310ChecklistBody) : {};
  if (
    body.schema_version !== "comath.goal3_source_release_public_checklist.v1" ||
    body.checklist_id !== checklistId ||
    body.project_id !== projectId ||
    body.ok !== true ||
    body.release_checklist_status !== "source_release_public_checklist_ready" ||
    normalizeRelativePath(String(body.checklist_path ?? "")) !== read.artifact.path ||
    body.presentation_review_current !== true ||
    body.source_archive_current !== true ||
    body.download_descriptor_current !== true ||
    body.public_archive_review_ok !== true ||
    body.public_source_review_ready !== true ||
    body.external_notarization_status !== "not_configured" ||
    body.os_immutable_storage_status !== "not_configured" ||
    body.proof_authority !== "none" ||
    body.can_restore !== false ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    body.checklist_is_proof_authority !== false ||
    body.presentation_is_proof_authority !== false ||
    body.source_artifact_is_proof_authority !== false ||
    body.claim_promotion_requires_ordinary_gate !== true ||
    typeof body.source_review_artifact_id !== "string"
  ) {
    invalid("Goal 3 source release external evidence binding checklist is not current non-authoritative material");
  }
  const archive = assertTask310SourceArchive(body.source_archive);
  assertTask310DownloadDescriptor(body.download_descriptor, body.source_review_artifact_id, archive);
  assertChecklistItems(body.checklist_items);
  return { body, artifact: read.artifact, archive };
}

function assertArchiveBytesCurrent(projectRoot: string, archive: Goal3SourceReleaseExternalEvidenceArchive): void {
  const absoluteArchivePath = assertPathAllowed(projectRoot, archive.archive_path, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absoluteArchivePath) || !statSync(absoluteArchivePath).isFile()) {
    stale("Goal 3 source release external evidence binding source archive is stale");
  }
  const bytes = readFileSync(absoluteArchivePath);
  if (sha256Bytes(bytes) !== archive.archive_sha256 || bytes.byteLength !== archive.size_bytes) {
    stale("Goal 3 source release external evidence binding source archive bytes are stale");
  }
}

function expectedEvidenceSchema(kind: OperatorEvidenceKind): string {
  return kind === "external_notarization"
    ? "comath.goal3_external_notarization_operator_evidence.v1"
    : "comath.goal3_os_immutable_storage_operator_evidence.v1";
}

function assertOperatorEvidenceAttestation(value: unknown): void {
  const attestation = value && typeof value === "object" && !Array.isArray(value) ? (value as OperatorEvidenceAttestation) : {};
  const providerName = typeof attestation.provider_name === "string" ? attestation.provider_name.trim() : "";
  const receiptId = typeof attestation.receipt_id === "string" ? attestation.receipt_id.trim() : "";
  const evidenceUri = typeof attestation.evidence_uri === "string" ? attestation.evidence_uri.trim() : "";
  const issuedAt = typeof attestation.issued_at === "string" ? attestation.issued_at.trim() : "";
  if (!providerName || (!receiptId && !evidenceUri) || !issuedAt || Number.isNaN(Date.parse(issuedAt))) {
    invalid("Goal 3 source release external evidence binding operator attestation is invalid");
  }
}

function assertNoEvidencePublicHazards(projectRoot: string, text: string): void {
  if (
    text.includes(projectRoot) ||
    /(?:(?:^|[^A-Za-z])[A-Za-z]:[\\/][^\s"']+|\\\\[^\s"']+)/u.test(text) ||
    secretTerms.test(text) ||
    privilegedPublicTerms.test(text)
  ) {
    invalid("Goal 3 source release external evidence binding operator evidence contains public hazard text");
  }
}

function readOperatorEvidence(
  projectRoot: string,
  kind: OperatorEvidenceKind,
  path: string,
  sha256: string,
  projectId: string,
  checklistId: string,
  checklistArtifact: ArtifactReference,
  archive: Goal3SourceReleaseExternalEvidenceArchive
): ArtifactReference {
  const read = readJsonArtifact(
    projectRoot,
    path,
    sha256,
    kind === "external_notarization" ? "goal3_external_notarization_operator_evidence" : "goal3_os_immutable_storage_operator_evidence"
  );
  assertNoEvidencePublicHazards(projectRoot, read.text);
  const body = read.body && typeof read.body === "object" && !Array.isArray(read.body) ? (read.body as OperatorEvidenceBody) : {};
  const evidenceId = assertSafeId(typeof body.evidence_id === "string" ? body.evidence_id : undefined, "evidence_id");
  const expectedPathPrefix = `.comath/release/goal3-source-release-external-evidence/${evidenceId}/`;
  if (
    body.schema_version !== expectedEvidenceSchema(kind) ||
    body.project_id !== projectId ||
    body.evidence_kind !== kind ||
    body.binding_target_kind !== "goal3_source_release_public_checklist" ||
    body.binding_target_id !== checklistId ||
    normalizeRelativePath(String(body.binding_target_path ?? "")) !== checklistArtifact.path ||
    String(body.binding_target_sha256 ?? "").trim().toLowerCase() !== checklistArtifact.sha256 ||
    normalizeRelativePath(String(body.source_archive_path ?? "")) !== archive.archive_path ||
    String(body.source_archive_sha256 ?? "").trim().toLowerCase() !== archive.archive_sha256 ||
    body.source_archive_size_bytes !== archive.size_bytes ||
    body.external_verification_performed !== false ||
    body.proof_authority !== "none" ||
    body.can_restore !== false ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    body.evidence_is_proof_authority !== false ||
    !read.artifact.path.startsWith(expectedPathPrefix) ||
    !read.artifact.path.endsWith(`/${kind}.json`)
  ) {
    invalid("Goal 3 source release external evidence binding operator evidence is invalid");
  }
  assertOperatorEvidenceAttestation(body.operator_attestation);
  return read.artifact;
}

export function recordGoal3SourceReleaseExternalEvidenceBinding(
  projectRoot: string,
  input: Goal3SourceReleaseExternalEvidenceBindingInput
): Goal3SourceReleaseExternalEvidenceBinding {
  const projectId = assertSafeId(input.project_id, "project_id");
  const bindingId = assertSafeId(input.binding_id, "binding_id");
  const checklistId = assertSafeId(input.checklist_id, "checklist_id");
  const outputPath = bindingPath(bindingId);
  const publicReviewId = `GOAL3-SOURCE-RELEASE-EXTERNAL-EVIDENCE-BINDING-${bindingId}`;
  const publicReviewPath = publicArchiveReviewPath(publicReviewId);
  const absoluteOutputPath = assertPathAllowed(projectRoot, outputPath, { purpose: "runtime-write" });
  const absolutePublicReviewPath = assertPathAllowed(projectRoot, publicReviewPath, { purpose: "runtime-write" });
  if (existsSync(absoluteOutputPath) || existsSync(absolutePublicReviewPath)) {
    throw new ComathError("Goal 3 source release external evidence binding already exists", {
      statusCode: 409,
      code: alreadyExistsCode
    });
  }

  const checklist = readChecklist(projectRoot, input, checklistId, projectId);
  assertArchiveBytesCurrent(projectRoot, checklist.archive);
  const externalNotarizationEvidence = readOperatorEvidence(
    projectRoot,
    "external_notarization",
    input.external_notarization_evidence_path,
    input.external_notarization_evidence_sha256,
    projectId,
    checklistId,
    checklist.artifact,
    checklist.archive
  );
  const osImmutableStorageEvidence = readOperatorEvidence(
    projectRoot,
    "os_immutable_storage",
    input.os_immutable_storage_evidence_path,
    input.os_immutable_storage_evidence_sha256,
    projectId,
    checklistId,
    checklist.artifact,
    checklist.archive
  );
  const actor = sanitizeActor(input.actor);
  const body: Goal3SourceReleaseExternalEvidenceBindingBody = {
    schema_version: "comath.goal3_source_release_external_evidence_binding.v1",
    binding_id: bindingId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    ok: true,
    external_evidence_binding_status: "source_release_external_evidence_bound",
    binding_path: outputPath,
    checklist_id: checklistId,
    checklist_path: checklist.artifact.path,
    checklist_sha256: checklist.artifact.sha256,
    checklist_artifact: checklist.artifact,
    checklist_current: true,
    source_archive: checklist.archive,
    source_archive_current: true,
    external_notarization_evidence_artifact: externalNotarizationEvidence,
    os_immutable_storage_evidence_artifact: osImmutableStorageEvidence,
    external_notarization_status: "operator_evidence_bound",
    os_immutable_storage_status: "operator_evidence_bound",
    external_verification_performed: false,
    requires_future_external_verification: true,
    proof_authority: "none",
    can_restore: false,
    can_promote_claim: false,
    can_certify_ga: false,
    binding_is_proof_authority: false,
    evidence_is_proof_authority: false,
    claim_promotion_requires_ordinary_gate: true,
    public_archive_review_id: publicReviewId,
    public_archive_review_path: publicReviewPath,
    public_archive_review_ok: true
  };

  const publicPayload = sanitizePublicFormalAuthorityVocabulary({
    schema_version: "comath.goal3_source_release_external_evidence_binding_route_payload.v1",
    binding_id: bindingId,
    checklist_id: checklistId,
    checklist_sha256: checklist.artifact.sha256,
    source_archive_sha256: checklist.archive.archive_sha256,
    source_archive_size_bytes: checklist.archive.size_bytes,
    external_notarization_evidence_sha256: externalNotarizationEvidence.sha256,
    os_immutable_storage_evidence_sha256: osImmutableStorageEvidence.sha256,
    external_notarization_status: "operator_evidence_bound",
    os_immutable_storage_status: "operator_evidence_bound",
    external_verification_performed: false,
    requires_future_external_verification: true,
    proof_authority: "none",
    can_restore: false,
    can_promote_claim: false,
    can_certify_ga: false,
    binding_is_proof_authority: false,
    evidence_is_proof_authority: false
  });

  const archiveReview = reviewGoal3PublicArchiveSurfaces(projectRoot, {
    project_id: projectId,
    actor,
    review_id: publicReviewId,
    surfaces: [
      {
        surface_id: `source-release-external-evidence-binding-route:${bindingId}`,
        surface_kind: "public_route_payload",
        payload: publicPayload
      },
      {
        surface_id: `source-release-external-evidence-binding-manifest:${bindingId}`,
        surface_kind: "public_review_manifest",
        payload: body
      }
    ]
  });
  if (!archiveReview.ok) {
    invalid("Goal 3 source release external evidence binding public archive review failed");
  }

  const bodyText = canonicalJson(body);
  mkdirSync(dirname(absoluteOutputPath), { recursive: true });
  writeFileSync(absoluteOutputPath, bodyText, "utf8");
  const result: Goal3SourceReleaseExternalEvidenceBinding = {
    ...body,
    binding_artifact: artifactReference(
      outputPath,
      "goal3_source_release_external_evidence_binding",
      sha256Text(bodyText),
      Buffer.byteLength(bodyText, "utf8")
    )
  };

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.goal3_source_release_external_evidence_binding_recorded",
    actor,
    target_id: projectId,
    payload: {
      binding_id: bindingId,
      binding_path: outputPath,
      binding_sha256: result.binding_artifact.sha256,
      checklist_id: checklistId,
      checklist_path: checklist.artifact.path,
      checklist_sha256: checklist.artifact.sha256,
      source_archive_path: checklist.archive.archive_path,
      source_archive_sha256: checklist.archive.archive_sha256,
      source_archive_size_bytes: checklist.archive.size_bytes,
      external_notarization_evidence_path: externalNotarizationEvidence.path,
      external_notarization_evidence_sha256: externalNotarizationEvidence.sha256,
      os_immutable_storage_evidence_path: osImmutableStorageEvidence.path,
      os_immutable_storage_evidence_sha256: osImmutableStorageEvidence.sha256,
      public_archive_review_id: archiveReview.review_id,
      public_archive_review_path: archiveReview.manifest_path,
      public_archive_review_ok: true,
      external_notarization_status: "operator_evidence_bound",
      os_immutable_storage_status: "operator_evidence_bound",
      external_verification_performed: false,
      requires_future_external_verification: true,
      proof_authority: "none",
      can_restore: false,
      can_promote_claim: false,
      can_certify_ga: false,
      binding_is_proof_authority: false,
      evidence_is_proof_authority: false
    }
  });

  return result;
}
