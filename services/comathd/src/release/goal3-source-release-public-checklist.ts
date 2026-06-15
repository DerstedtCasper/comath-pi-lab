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

type Task309SourceArchive = {
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

type Task309DownloadDescriptor = {
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

type Task309PresentationReviewBody = {
  schema_version?: unknown;
  presentation_review_id?: unknown;
  project_id?: unknown;
  ok?: unknown;
  presentation_status?: unknown;
  presentation_review_path?: unknown;
  source_review_artifact_id?: unknown;
  source_review_artifact_path?: unknown;
  source_review_artifact?: unknown;
  source_review_artifact_current?: unknown;
  source_archive?: unknown;
  source_archive_current?: unknown;
  download_descriptor?: unknown;
  public_archive_review_id?: unknown;
  public_archive_review_path?: unknown;
  public_archive_review_ok?: unknown;
  proof_authority?: unknown;
  can_promote_claim?: unknown;
  can_certify_ga?: unknown;
  presentation_is_proof_authority?: unknown;
  source_artifact_is_proof_authority?: unknown;
  claim_promotion_requires_ordinary_gate?: unknown;
};

type Task309PublicArchiveReviewBody = {
  schema_version?: unknown;
  review_id?: unknown;
  project_id?: unknown;
  ok?: unknown;
  proof_authority?: unknown;
  can_promote_claim?: unknown;
  review_is_proof_authority?: unknown;
  vetoes?: unknown;
};

export type Goal3SourceReleasePublicChecklistInput = {
  project_id: string;
  checklist_id?: string;
  actor?: string;
  presentation_review_id: string;
  presentation_review_path: string;
  presentation_review_sha256: string;
};

export type Goal3SourceReleaseChecklistArchive = {
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

export type Goal3SourceReleaseChecklistDownloadDescriptor = {
  schema_version: "comath.goal3_source_artifact_download_descriptor.v1";
  source_review_artifact_id: string;
  source_archive_path: string;
  source_archive_sha256: string;
  size_bytes: number;
  content_type: "application/x-tar";
  filename: string;
  source_only: true;
  can_restore: false;
  restore_source: false;
  exposes_host_paths: false;
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
  download_is_public_diagnostic: true;
};

export type Goal3SourceReleaseChecklistItem = {
  item_id: string;
  status: "passed";
  evidence_path?: string;
  evidence_sha256?: string;
  policy_status?: "not_configured";
};

export type Goal3SourceReleasePublicChecklist = {
  schema_version: "comath.goal3_source_release_public_checklist.v1";
  checklist_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  ok: true;
  release_checklist_status: "source_release_public_checklist_ready";
  checklist_path: string;
  presentation_review_id: string;
  presentation_review_path: string;
  presentation_review_artifact: ArtifactReference;
  presentation_review_current: true;
  source_review_artifact_id: string;
  source_archive: Goal3SourceReleaseChecklistArchive;
  source_archive_current: true;
  download_descriptor: Goal3SourceReleaseChecklistDownloadDescriptor;
  download_descriptor_current: true;
  presentation_public_archive_review_id: string;
  presentation_public_archive_review_path: string;
  presentation_public_archive_review_artifact: ArtifactReference;
  presentation_public_archive_review_ok: true;
  public_archive_review_id: string;
  public_archive_review_path: string;
  public_archive_review_ok: true;
  checklist_items: Goal3SourceReleaseChecklistItem[];
  public_source_review_ready: true;
  external_notarization_status: "not_configured";
  os_immutable_storage_status: "not_configured";
  proof_authority: "none";
  can_restore: false;
  can_promote_claim: false;
  can_certify_ga: false;
  checklist_is_proof_authority: false;
  presentation_is_proof_authority: false;
  source_artifact_is_proof_authority: false;
  claim_promotion_requires_ordinary_gate: true;
  checklist_artifact: ArtifactReference;
};

type Goal3SourceReleasePublicChecklistBody = Omit<Goal3SourceReleasePublicChecklist, "checklist_artifact">;

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function presentationReviewPath(reviewId: string): string {
  return normalizeRelativePath(join(".comath", "release", "goal3-source-artifact-presentation-review", reviewId, "presentation.json"));
}

function checklistPath(checklistId: string): string {
  return normalizeRelativePath(join(".comath", "release", "goal3-source-release-public-checklist", checklistId, "checklist.json"));
}

function publicArchiveReviewPath(reviewId: string): string {
  return normalizeRelativePath(join(".comath", "release", "public-archive-review", reviewId, "review.json"));
}

function assertSafeId(value: string | undefined, label: string): string {
  const id = typeof value === "string" ? value.trim() : "";
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,160}$/u.test(id)) {
    throw new ComathError(`${label} is invalid`, {
      statusCode: 400,
      code: "GOAL3_SOURCE_RELEASE_PUBLIC_CHECKLIST_INVALID"
    });
  }
  return id;
}

function assertSha256(value: string | undefined): string {
  const sha256 = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-f0-9]{64}$/u.test(sha256)) {
    throw new ComathError("Goal 3 source release public checklist referenced material is stale", {
      statusCode: 400,
      code: "GOAL3_SOURCE_RELEASE_PUBLIC_CHECKLIST_STALE"
    });
  }
  return sha256;
}

function sanitizeActor(value: string | undefined): string {
  return (value ?? "goal3-source-release-public-checklist")
    .replace(/(?:[A-Za-z]:[\\/][^\s"']+|\\\\[^\s"']+)/gu, "[redacted-path]")
    .replace(
      /(?:Authorization:\s*Bearer\s+\S+|api[_-]?key(?:=\S+)?|token=\S+|sk-[A-Za-z0-9_-]+)/giu,
      "[redacted-secret]"
    )
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

function asNonNegativeInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new ComathError(`Goal 3 source release public checklist ${label} is invalid`, {
      statusCode: 400,
      code: "GOAL3_SOURCE_RELEASE_PUBLIC_CHECKLIST_INVALID"
    });
  }
  return value;
}

function assertArtifactReference(value: unknown, expectedKind: string): ArtifactReference {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ComathError("Goal 3 source release public checklist artifact reference is invalid", {
      statusCode: 400,
      code: "GOAL3_SOURCE_RELEASE_PUBLIC_CHECKLIST_INVALID"
    });
  }
  const record = value as { kind?: unknown; path?: unknown; sha256?: unknown; size_bytes?: unknown };
  const path = typeof record.path === "string" ? normalizeRelativePath(record.path) : "";
  const sha256 = typeof record.sha256 === "string" ? record.sha256.trim().toLowerCase() : "";
  const sizeBytes = asNonNegativeInteger(record.size_bytes, "artifact size");
  if (
    record.kind !== expectedKind ||
    !path ||
    path.startsWith("/") ||
    path.startsWith("../") ||
    path.includes("/../") ||
    /^[A-Za-z]:\//u.test(path) ||
    !/^[a-f0-9]{64}$/u.test(sha256) ||
    sizeBytes <= 0
  ) {
    throw new ComathError("Goal 3 source release public checklist artifact reference is invalid", {
      statusCode: 400,
      code: "GOAL3_SOURCE_RELEASE_PUBLIC_CHECKLIST_INVALID"
    });
  }
  return {
    kind: expectedKind,
    path,
    sha256,
    size_bytes: sizeBytes
  };
}

function readPresentationReview(
  projectRoot: string,
  input: Goal3SourceReleasePublicChecklistInput,
  reviewId: string
): { body: Task309PresentationReviewBody; artifact: ArtifactReference } {
  const canonicalPath = presentationReviewPath(reviewId);
  if (normalizeRelativePath(input.presentation_review_path) !== canonicalPath) {
    throw new ComathError("Goal 3 source release public checklist presentation path is not canonical", {
      statusCode: 400,
      code: "GOAL3_SOURCE_RELEASE_PUBLIC_CHECKLIST_INVALID"
    });
  }
  const absolutePath = assertPathAllowed(projectRoot, canonicalPath, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new ComathError("Goal 3 source release public checklist referenced presentation is stale", {
      statusCode: 400,
      code: "GOAL3_SOURCE_RELEASE_PUBLIC_CHECKLIST_STALE"
    });
  }
  const bytes = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(bytes);
  if (actualSha256 !== assertSha256(input.presentation_review_sha256)) {
    throw new ComathError("Goal 3 source release public checklist referenced presentation hash is stale", {
      statusCode: 400,
      code: "GOAL3_SOURCE_RELEASE_PUBLIC_CHECKLIST_STALE"
    });
  }
  try {
    return {
      body: JSON.parse(bytes.toString("utf8")) as Task309PresentationReviewBody,
      artifact: artifactReference(canonicalPath, "goal3_source_artifact_presentation_review", actualSha256, bytes.byteLength)
    };
  } catch {
    throw new ComathError("Goal 3 source release public checklist presentation JSON is invalid", {
      statusCode: 400,
      code: "GOAL3_SOURCE_RELEASE_PUBLIC_CHECKLIST_INVALID"
    });
  }
}

function assertTask309SourceArchive(value: unknown): Goal3SourceReleaseChecklistArchive {
  const archive = value && typeof value === "object" && !Array.isArray(value) ? (value as Task309SourceArchive) : {};
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
    throw new ComathError("Goal 3 source release public checklist source archive metadata is invalid", {
      statusCode: 400,
      code: "GOAL3_SOURCE_RELEASE_PUBLIC_CHECKLIST_INVALID"
    });
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

function assertTask309DownloadDescriptor(
  value: unknown,
  sourceReviewArtifactId: string,
  archive: Goal3SourceReleaseChecklistArchive
): Goal3SourceReleaseChecklistDownloadDescriptor {
  const descriptor = value && typeof value === "object" && !Array.isArray(value) ? (value as Task309DownloadDescriptor) : {};
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
    throw new ComathError("Goal 3 source release public checklist download descriptor is not current non-restorable material", {
      statusCode: 400,
      code: "GOAL3_SOURCE_RELEASE_PUBLIC_CHECKLIST_INVALID"
    });
  }
  return {
    schema_version: "comath.goal3_source_artifact_download_descriptor.v1",
    source_review_artifact_id: sourceReviewArtifactId,
    source_archive_path: sourceArchivePath,
    source_archive_sha256: sourceArchiveSha256,
    size_bytes: archive.size_bytes,
    content_type: "application/x-tar",
    filename: descriptor.filename,
    source_only: true,
    can_restore: false,
    restore_source: false,
    exposes_host_paths: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    download_is_public_diagnostic: true
  };
}

function readPublicArchiveReview(
  projectRoot: string,
  projectId: string,
  reviewId: string,
  reviewPath: string
): ArtifactReference {
  const canonicalPath = publicArchiveReviewPath(reviewId);
  if (reviewPath !== canonicalPath) {
    throw new ComathError("Goal 3 source release public checklist public archive review path is not canonical", {
      statusCode: 400,
      code: "GOAL3_SOURCE_RELEASE_PUBLIC_CHECKLIST_INVALID"
    });
  }
  const absolutePath = assertPathAllowed(projectRoot, canonicalPath, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new ComathError("Goal 3 source release public checklist public archive review is stale", {
      statusCode: 400,
      code: "GOAL3_SOURCE_RELEASE_PUBLIC_CHECKLIST_STALE"
    });
  }
  const bytes = readFileSync(absolutePath);
  let body: Task309PublicArchiveReviewBody;
  try {
    body = JSON.parse(bytes.toString("utf8")) as Task309PublicArchiveReviewBody;
  } catch {
    throw new ComathError("Goal 3 source release public checklist public archive review JSON is invalid", {
      statusCode: 400,
      code: "GOAL3_SOURCE_RELEASE_PUBLIC_CHECKLIST_INVALID"
    });
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
    throw new ComathError("Goal 3 source release public checklist public archive review is not a passing non-authoritative review", {
      statusCode: 400,
      code: "GOAL3_SOURCE_RELEASE_PUBLIC_CHECKLIST_INVALID"
    });
  }
  return artifactReference(canonicalPath, "goal3_public_archive_review", sha256Bytes(bytes), bytes.byteLength);
}

function assertTask309PresentationCurrent(
  projectRoot: string,
  body: Task309PresentationReviewBody,
  projectId: string,
  reviewId: string,
  artifact: ArtifactReference
): {
  sourceReviewArtifact: ArtifactReference;
  sourceArchive: Goal3SourceReleaseChecklistArchive;
  downloadDescriptor: Goal3SourceReleaseChecklistDownloadDescriptor;
  publicArchiveReview: ArtifactReference;
} {
  if (
    body.schema_version !== "comath.goal3_source_artifact_presentation_review.v1" ||
    body.presentation_review_id !== reviewId ||
    body.project_id !== projectId ||
    body.ok !== true ||
    body.presentation_status !== "source_artifact_presentation_ready" ||
    normalizeRelativePath(String(body.presentation_review_path ?? "")) !== artifact.path ||
    body.source_review_artifact_current !== true ||
    body.source_archive_current !== true ||
    body.public_archive_review_ok !== true ||
    body.proof_authority !== "none" ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    body.presentation_is_proof_authority !== false ||
    body.source_artifact_is_proof_authority !== false ||
    body.claim_promotion_requires_ordinary_gate !== true ||
    typeof body.source_review_artifact_id !== "string" ||
    typeof body.public_archive_review_id !== "string" ||
    typeof body.public_archive_review_path !== "string"
  ) {
    throw new ComathError("Goal 3 source release public checklist presentation is not current non-authoritative material", {
      statusCode: 400,
      code: "GOAL3_SOURCE_RELEASE_PUBLIC_CHECKLIST_INVALID"
    });
  }
  const sourceReviewArtifact = assertArtifactReference(
    body.source_review_artifact,
    "goal3_source_available_review_artifact"
  );
  if (normalizeRelativePath(String(body.source_review_artifact_path ?? "")) !== sourceReviewArtifact.path) {
    throw new ComathError("Goal 3 source release public checklist source artifact path binding is invalid", {
      statusCode: 400,
      code: "GOAL3_SOURCE_RELEASE_PUBLIC_CHECKLIST_INVALID"
    });
  }
  const sourceArchive = assertTask309SourceArchive(body.source_archive);
  const downloadDescriptor = assertTask309DownloadDescriptor(body.download_descriptor, body.source_review_artifact_id, sourceArchive);
  const publicArchiveReview = readPublicArchiveReview(
    projectRoot,
    projectId,
    body.public_archive_review_id,
    normalizeRelativePath(body.public_archive_review_path)
  );
  return {
    sourceReviewArtifact,
    sourceArchive,
    downloadDescriptor,
    publicArchiveReview
  };
}

function assertArchiveBytesCurrent(projectRoot: string, archive: Goal3SourceReleaseChecklistArchive): void {
  const absoluteArchivePath = assertPathAllowed(projectRoot, archive.archive_path, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absoluteArchivePath) || !statSync(absoluteArchivePath).isFile()) {
    throw new ComathError("Goal 3 source release public checklist source archive is stale", {
      statusCode: 400,
      code: "GOAL3_SOURCE_RELEASE_PUBLIC_CHECKLIST_STALE"
    });
  }
  const bytes = readFileSync(absoluteArchivePath);
  if (sha256Bytes(bytes) !== archive.archive_sha256 || bytes.byteLength !== archive.size_bytes) {
    throw new ComathError("Goal 3 source release public checklist source archive bytes are stale", {
      statusCode: 400,
      code: "GOAL3_SOURCE_RELEASE_PUBLIC_CHECKLIST_STALE"
    });
  }
}

function checklistItems(
  presentationArtifact: ArtifactReference,
  archive: Goal3SourceReleaseChecklistArchive,
  publicReview: ArtifactReference
): Goal3SourceReleaseChecklistItem[] {
  return [
    {
      item_id: "presentation_manifest_hash_bound",
      status: "passed",
      evidence_path: presentationArtifact.path,
      evidence_sha256: presentationArtifact.sha256
    },
    {
      item_id: "source_archive_bytes_hash_bound",
      status: "passed",
      evidence_path: archive.archive_path,
      evidence_sha256: archive.archive_sha256
    },
    {
      item_id: "download_descriptor_non_restorable",
      status: "passed",
      evidence_path: presentationArtifact.path,
      evidence_sha256: presentationArtifact.sha256
    },
    {
      item_id: "public_archive_review_passed",
      status: "passed",
      evidence_path: publicReview.path,
      evidence_sha256: publicReview.sha256
    },
    {
      item_id: "external_notarization_not_configured",
      status: "passed",
      policy_status: "not_configured"
    },
    {
      item_id: "os_immutable_storage_not_configured",
      status: "passed",
      policy_status: "not_configured"
    },
    {
      item_id: "proof_authority_not_claimed",
      status: "passed",
      evidence_path: presentationArtifact.path,
      evidence_sha256: presentationArtifact.sha256
    }
  ];
}

export function recordGoal3SourceReleasePublicChecklist(
  projectRoot: string,
  input: Goal3SourceReleasePublicChecklistInput
): Goal3SourceReleasePublicChecklist {
  const projectId = assertSafeId(input.project_id, "project_id");
  const checklistId = assertSafeId(input.checklist_id, "checklist_id");
  const presentationReviewId = assertSafeId(input.presentation_review_id, "presentation_review_id");
  const outputPath = checklistPath(checklistId);
  const publicReviewId = `GOAL3-SOURCE-RELEASE-PUBLIC-CHECKLIST-${checklistId}`;
  const publicReviewPath = publicArchiveReviewPath(publicReviewId);
  const absoluteOutputPath = assertPathAllowed(projectRoot, outputPath, { purpose: "runtime-write" });
  const absolutePublicReviewPath = assertPathAllowed(projectRoot, publicReviewPath, { purpose: "runtime-write" });
  if (existsSync(absoluteOutputPath) || existsSync(absolutePublicReviewPath)) {
    throw new ComathError("Goal 3 source release public checklist already exists", {
      statusCode: 409,
      code: "GOAL3_SOURCE_RELEASE_PUBLIC_CHECKLIST_ALREADY_EXISTS"
    });
  }

  const presentation = readPresentationReview(projectRoot, input, presentationReviewId);
  const current = assertTask309PresentationCurrent(
    projectRoot,
    presentation.body,
    projectId,
    presentationReviewId,
    presentation.artifact
  );
  assertArchiveBytesCurrent(projectRoot, current.sourceArchive);

  const actor = sanitizeActor(input.actor);
  const items = checklistItems(presentation.artifact, current.sourceArchive, current.publicArchiveReview);
  const presentationPublicArchiveReviewId = String(presentation.body.public_archive_review_id);
  const presentationPublicArchiveReviewPath = normalizeRelativePath(String(presentation.body.public_archive_review_path));
  const body: Goal3SourceReleasePublicChecklistBody = {
    schema_version: "comath.goal3_source_release_public_checklist.v1",
    checklist_id: checklistId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    ok: true,
    release_checklist_status: "source_release_public_checklist_ready",
    checklist_path: outputPath,
    presentation_review_id: presentationReviewId,
    presentation_review_path: presentation.artifact.path,
    presentation_review_artifact: presentation.artifact,
    presentation_review_current: true,
    source_review_artifact_id: current.downloadDescriptor.source_review_artifact_id,
    source_archive: current.sourceArchive,
    source_archive_current: true,
    download_descriptor: current.downloadDescriptor,
    download_descriptor_current: true,
    presentation_public_archive_review_id: presentationPublicArchiveReviewId,
    presentation_public_archive_review_path: presentationPublicArchiveReviewPath,
    presentation_public_archive_review_artifact: current.publicArchiveReview,
    presentation_public_archive_review_ok: true,
    public_archive_review_id: publicReviewId,
    public_archive_review_path: publicReviewPath,
    public_archive_review_ok: true,
    checklist_items: items,
    public_source_review_ready: true,
    external_notarization_status: "not_configured",
    os_immutable_storage_status: "not_configured",
    proof_authority: "none",
    can_restore: false,
    can_promote_claim: false,
    can_certify_ga: false,
    checklist_is_proof_authority: false,
    presentation_is_proof_authority: false,
    source_artifact_is_proof_authority: false,
    claim_promotion_requires_ordinary_gate: true
  };

  const publicPayload = sanitizePublicFormalAuthorityVocabulary({
    schema_version: "comath.goal3_source_release_public_checklist_route_payload.v1",
    checklist_id: checklistId,
    presentation_review_id: presentationReviewId,
    presentation_review_sha256: presentation.artifact.sha256,
    source_archive_sha256: current.sourceArchive.archive_sha256,
    source_archive_size_bytes: current.sourceArchive.size_bytes,
    public_source_review_ready: true,
    external_notarization_status: "not_configured",
    os_immutable_storage_status: "not_configured",
    proof_authority: "none",
    can_restore: false,
    can_promote_claim: false,
    can_certify_ga: false,
    checklist_is_proof_authority: false
  });

  const archiveReview = reviewGoal3PublicArchiveSurfaces(projectRoot, {
    project_id: projectId,
    actor,
    review_id: publicReviewId,
    surfaces: [
      {
        surface_id: `source-release-public-checklist-route:${checklistId}`,
        surface_kind: "public_route_payload",
        payload: publicPayload
      },
      {
        surface_id: `source-release-public-checklist-manifest:${checklistId}`,
        surface_kind: "public_review_manifest",
        payload: body
      }
    ]
  });
  if (!archiveReview.ok) {
    throw new ComathError("Goal 3 source release public checklist public archive review failed", {
      statusCode: 400,
      code: "GOAL3_SOURCE_RELEASE_PUBLIC_CHECKLIST_INVALID"
    });
  }

  const bodyText = canonicalJson(body);
  mkdirSync(dirname(absoluteOutputPath), { recursive: true });
  writeFileSync(absoluteOutputPath, bodyText, "utf8");
  const result: Goal3SourceReleasePublicChecklist = {
    ...body,
    checklist_artifact: artifactReference(
      outputPath,
      "goal3_source_release_public_checklist",
      sha256Text(bodyText),
      Buffer.byteLength(bodyText, "utf8")
    )
  };

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.goal3_source_release_public_checklist_recorded",
    actor,
    target_id: projectId,
    payload: {
      checklist_id: checklistId,
      checklist_path: outputPath,
      checklist_sha256: result.checklist_artifact.sha256,
      presentation_review_id: presentationReviewId,
      presentation_review_path: presentation.artifact.path,
      presentation_review_sha256: presentation.artifact.sha256,
      source_archive_path: current.sourceArchive.archive_path,
      source_archive_sha256: current.sourceArchive.archive_sha256,
      source_archive_size_bytes: current.sourceArchive.size_bytes,
      presentation_public_archive_review_id: presentationPublicArchiveReviewId,
      presentation_public_archive_review_path: current.publicArchiveReview.path,
      presentation_public_archive_review_sha256: current.publicArchiveReview.sha256,
      public_archive_review_id: archiveReview.review_id,
      public_archive_review_path: archiveReview.manifest_path,
      public_archive_review_ok: true,
      public_source_review_ready: true,
      external_notarization_status: "not_configured",
      os_immutable_storage_status: "not_configured",
      proof_authority: "none",
      can_restore: false,
      can_promote_claim: false,
      can_certify_ga: false,
      checklist_is_proof_authority: false,
      presentation_is_proof_authority: false,
      source_artifact_is_proof_authority: false
    }
  });

  return result;
}
