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

type Task308SourceArchive = {
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

type Task308SourceReviewArtifactBody = {
  schema_version?: unknown;
  source_review_artifact_id?: unknown;
  project_id?: unknown;
  ok?: unknown;
  source_review_artifact_status?: unknown;
  source_review_artifact_path?: unknown;
  release_package_current?: unknown;
  source_bound_release_chain_current?: unknown;
  source_archive?: unknown;
  public_archive_review_ok?: unknown;
  proof_authority?: unknown;
  can_promote_claim?: unknown;
  can_certify_ga?: unknown;
  source_artifact_is_proof_authority?: unknown;
  claim_promotion_requires_ordinary_gate?: unknown;
};

export type Goal3SourceArtifactPresentationReviewInput = {
  project_id: string;
  presentation_review_id?: string;
  actor?: string;
  source_review_artifact_id: string;
  source_review_artifact_path: string;
  source_review_artifact_sha256: string;
};

export type Goal3SourceArtifactPresentationArchive = {
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

export type Goal3SourceArtifactDownloadDescriptor = {
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

export type Goal3SourceArtifactPresentationReview = {
  schema_version: "comath.goal3_source_artifact_presentation_review.v1";
  presentation_review_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  ok: true;
  presentation_status: "source_artifact_presentation_ready";
  presentation_review_path: string;
  source_review_artifact_id: string;
  source_review_artifact_path: string;
  source_review_artifact: ArtifactReference;
  source_review_artifact_current: true;
  source_archive: Goal3SourceArtifactPresentationArchive;
  source_archive_current: true;
  download_descriptor: Goal3SourceArtifactDownloadDescriptor;
  public_archive_review_id: string;
  public_archive_review_path: string;
  public_archive_review_ok: true;
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
  presentation_is_proof_authority: false;
  source_artifact_is_proof_authority: false;
  claim_promotion_requires_ordinary_gate: true;
  presentation_review_artifact: ArtifactReference;
};

type Goal3SourceArtifactPresentationReviewBody = Omit<
  Goal3SourceArtifactPresentationReview,
  "presentation_review_artifact"
>;

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function sourceReviewArtifactPath(artifactId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "goal3-source-only-open-source-review-artifact", artifactId, "source-artifact.json")
  );
}

function sourceArchivePath(artifactId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "goal3-source-only-open-source-review-artifact", artifactId, "source.tar")
  );
}

function presentationReviewPath(reviewId: string): string {
  return normalizeRelativePath(join(".comath", "release", "goal3-source-artifact-presentation-review", reviewId, "presentation.json"));
}

function publicArchiveReviewPath(reviewId: string): string {
  return normalizeRelativePath(join(".comath", "release", "public-archive-review", reviewId, "review.json"));
}

function assertSafeId(value: string | undefined, label: string): string {
  const id = typeof value === "string" ? value.trim() : "";
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,160}$/u.test(id)) {
    throw new ComathError(`${label} is invalid`, {
      statusCode: 400,
      code: "GOAL3_SOURCE_ARTIFACT_PRESENTATION_REVIEW_INVALID"
    });
  }
  return id;
}

function assertSha256(value: string | undefined): string {
  const sha256 = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-f0-9]{64}$/u.test(sha256)) {
    throw new ComathError("Goal 3 source artifact presentation review referenced material is stale", {
      statusCode: 400,
      code: "GOAL3_SOURCE_ARTIFACT_PRESENTATION_REVIEW_STALE"
    });
  }
  return sha256;
}

function sanitizeActor(value: string | undefined): string {
  return (value ?? "goal3-source-artifact-presentation-review")
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

function readSourceReviewArtifact(
  projectRoot: string,
  input: Goal3SourceArtifactPresentationReviewInput,
  artifactId: string
): { body: Task308SourceReviewArtifactBody; artifact: ArtifactReference } {
  const canonicalPath = sourceReviewArtifactPath(artifactId);
  if (normalizeRelativePath(input.source_review_artifact_path) !== canonicalPath) {
    throw new ComathError("Goal 3 source artifact presentation review source artifact path is not canonical", {
      statusCode: 400,
      code: "GOAL3_SOURCE_ARTIFACT_PRESENTATION_REVIEW_INVALID"
    });
  }
  const absolutePath = assertPathAllowed(projectRoot, canonicalPath, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new ComathError("Goal 3 source artifact presentation review referenced source artifact is stale", {
      statusCode: 400,
      code: "GOAL3_SOURCE_ARTIFACT_PRESENTATION_REVIEW_STALE"
    });
  }
  const bytes = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(bytes);
  if (actualSha256 !== assertSha256(input.source_review_artifact_sha256)) {
    throw new ComathError("Goal 3 source artifact presentation review referenced source artifact hash is stale", {
      statusCode: 400,
      code: "GOAL3_SOURCE_ARTIFACT_PRESENTATION_REVIEW_STALE"
    });
  }
  try {
    return {
      body: JSON.parse(bytes.toString("utf8")) as Task308SourceReviewArtifactBody,
      artifact: artifactReference(canonicalPath, "goal3_source_only_open_source_review_artifact", actualSha256, bytes.byteLength)
    };
  } catch {
    throw new ComathError("Goal 3 source artifact presentation review source artifact JSON is invalid", {
      statusCode: 400,
      code: "GOAL3_SOURCE_ARTIFACT_PRESENTATION_REVIEW_INVALID"
    });
  }
}

function asNonNegativeInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new ComathError(`Goal 3 source artifact presentation review ${label} is invalid`, {
      statusCode: 400,
      code: "GOAL3_SOURCE_ARTIFACT_PRESENTATION_REVIEW_INVALID"
    });
  }
  return value;
}

function assertTask308SourceArchive(value: unknown, artifactId: string): Goal3SourceArtifactPresentationArchive {
  const archive = value && typeof value === "object" && !Array.isArray(value) ? (value as Task308SourceArchive) : {};
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
    archivePath !== sourceArchivePath(artifactId) ||
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
    throw new ComathError("Goal 3 source artifact presentation review source archive metadata is invalid", {
      statusCode: 400,
      code: "GOAL3_SOURCE_ARTIFACT_PRESENTATION_REVIEW_INVALID"
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

function assertTask308ArtifactCurrent(
  body: Task308SourceReviewArtifactBody,
  projectId: string,
  artifactId: string,
  artifact: ArtifactReference
): Goal3SourceArtifactPresentationArchive {
  if (
    body.schema_version !== "comath.goal3_source_only_open_source_review_artifact.v1" ||
    body.source_review_artifact_id !== artifactId ||
    body.project_id !== projectId ||
    body.ok !== true ||
    body.source_review_artifact_status !== "source_only_open_source_review_artifact_ready" ||
    normalizeRelativePath(String(body.source_review_artifact_path ?? "")) !== artifact.path ||
    body.release_package_current !== true ||
    body.source_bound_release_chain_current !== true ||
    body.public_archive_review_ok !== true ||
    body.proof_authority !== "none" ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    body.source_artifact_is_proof_authority !== false ||
    body.claim_promotion_requires_ordinary_gate !== true
  ) {
    throw new ComathError("Goal 3 source artifact presentation review source artifact is not current non-authoritative material", {
      statusCode: 400,
      code: "GOAL3_SOURCE_ARTIFACT_PRESENTATION_REVIEW_INVALID"
    });
  }
  return assertTask308SourceArchive(body.source_archive, artifactId);
}

function assertArchiveBytesCurrent(
  projectRoot: string,
  archive: Goal3SourceArtifactPresentationArchive
): void {
  const absoluteArchivePath = assertPathAllowed(projectRoot, archive.archive_path, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absoluteArchivePath) || !statSync(absoluteArchivePath).isFile()) {
    throw new ComathError("Goal 3 source artifact presentation review source archive is stale", {
      statusCode: 400,
      code: "GOAL3_SOURCE_ARTIFACT_PRESENTATION_REVIEW_STALE"
    });
  }
  const bytes = readFileSync(absoluteArchivePath);
  if (sha256Bytes(bytes) !== archive.archive_sha256 || bytes.byteLength !== archive.size_bytes) {
    throw new ComathError("Goal 3 source artifact presentation review source archive bytes are stale", {
      statusCode: 400,
      code: "GOAL3_SOURCE_ARTIFACT_PRESENTATION_REVIEW_STALE"
    });
  }
}

function downloadDescriptor(
  artifactId: string,
  archive: Goal3SourceArtifactPresentationArchive
): Goal3SourceArtifactDownloadDescriptor {
  return {
    schema_version: "comath.goal3_source_artifact_download_descriptor.v1",
    source_review_artifact_id: artifactId,
    source_archive_path: archive.archive_path,
    source_archive_sha256: archive.archive_sha256,
    size_bytes: archive.size_bytes,
    content_type: "application/x-tar",
    filename: `${artifactId}.source.tar`,
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

export function recordGoal3SourceArtifactPresentationReview(
  projectRoot: string,
  input: Goal3SourceArtifactPresentationReviewInput
): Goal3SourceArtifactPresentationReview {
  const projectId = assertSafeId(input.project_id, "project_id");
  const reviewId = assertSafeId(input.presentation_review_id, "presentation_review_id");
  const sourceArtifactId = assertSafeId(input.source_review_artifact_id, "source_review_artifact_id");
  const reviewPath = presentationReviewPath(reviewId);
  const publicReviewId = `GOAL3-SOURCE-ARTIFACT-PRESENTATION-REVIEW-${reviewId}`;
  const publicReviewPath = publicArchiveReviewPath(publicReviewId);
  const absoluteReviewPath = assertPathAllowed(projectRoot, reviewPath, { purpose: "runtime-write" });
  const absolutePublicReviewPath = assertPathAllowed(projectRoot, publicReviewPath, { purpose: "runtime-write" });
  if (existsSync(absoluteReviewPath) || existsSync(absolutePublicReviewPath)) {
    throw new ComathError("Goal 3 source artifact presentation review already exists", {
      statusCode: 409,
      code: "GOAL3_SOURCE_ARTIFACT_PRESENTATION_REVIEW_ALREADY_EXISTS"
    });
  }

  const sourceArtifact = readSourceReviewArtifact(projectRoot, input, sourceArtifactId);
  const sourceArchive = assertTask308ArtifactCurrent(sourceArtifact.body, projectId, sourceArtifactId, sourceArtifact.artifact);
  assertArchiveBytesCurrent(projectRoot, sourceArchive);

  const actor = sanitizeActor(input.actor);
  const descriptor = downloadDescriptor(sourceArtifactId, sourceArchive);
  const body: Goal3SourceArtifactPresentationReviewBody = {
    schema_version: "comath.goal3_source_artifact_presentation_review.v1",
    presentation_review_id: reviewId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    ok: true,
    presentation_status: "source_artifact_presentation_ready",
    presentation_review_path: reviewPath,
    source_review_artifact_id: sourceArtifactId,
    source_review_artifact_path: sourceArtifact.artifact.path,
    source_review_artifact: sourceArtifact.artifact,
    source_review_artifact_current: true,
    source_archive: sourceArchive,
    source_archive_current: true,
    download_descriptor: descriptor,
    public_archive_review_id: publicReviewId,
    public_archive_review_path: publicReviewPath,
    public_archive_review_ok: true,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    presentation_is_proof_authority: false,
    source_artifact_is_proof_authority: false,
    claim_promotion_requires_ordinary_gate: true
  };

  const publicPayload = sanitizePublicFormalAuthorityVocabulary({
    schema_version: "comath.goal3_source_artifact_presentation_route_payload.v1",
    presentation_review_id: reviewId,
    source_review_artifact_id: sourceArtifactId,
    source_review_artifact_sha256: sourceArtifact.artifact.sha256,
    source_archive_sha256: sourceArchive.archive_sha256,
    source_archive_size_bytes: sourceArchive.size_bytes,
    download_descriptor: descriptor,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    presentation_is_proof_authority: false
  });

  const archiveReview = reviewGoal3PublicArchiveSurfaces(projectRoot, {
    project_id: projectId,
    actor,
    review_id: publicReviewId,
    surfaces: [
      {
        surface_id: `source-artifact-presentation-route:${reviewId}`,
        surface_kind: "public_route_payload",
        payload: publicPayload
      },
      {
        surface_id: `source-artifact-presentation-manifest:${reviewId}`,
        surface_kind: "public_review_manifest",
        payload: body
      }
    ]
  });
  if (!archiveReview.ok) {
    throw new ComathError("Goal 3 source artifact presentation public archive review failed", {
      statusCode: 400,
      code: "GOAL3_SOURCE_ARTIFACT_PRESENTATION_REVIEW_INVALID"
    });
  }

  const bodyText = canonicalJson(body);
  mkdirSync(dirname(absoluteReviewPath), { recursive: true });
  writeFileSync(absoluteReviewPath, bodyText, "utf8");
  const result: Goal3SourceArtifactPresentationReview = {
    ...body,
    presentation_review_artifact: artifactReference(
      reviewPath,
      "goal3_source_artifact_presentation_review",
      sha256Text(bodyText),
      Buffer.byteLength(bodyText, "utf8")
    )
  };

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.goal3_source_artifact_presentation_review_recorded",
    actor,
    target_id: projectId,
    payload: {
      presentation_review_id: reviewId,
      presentation_review_path: reviewPath,
      presentation_review_sha256: result.presentation_review_artifact.sha256,
      source_review_artifact_id: sourceArtifactId,
      source_review_artifact_sha256: sourceArtifact.artifact.sha256,
      source_archive_path: sourceArchive.archive_path,
      source_archive_sha256: sourceArchive.archive_sha256,
      source_archive_size_bytes: sourceArchive.size_bytes,
      download_descriptor_content_type: descriptor.content_type,
      public_archive_review_id: archiveReview.review_id,
      public_archive_review_path: archiveReview.manifest_path,
      public_archive_review_ok: true,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false,
      presentation_is_proof_authority: false,
      source_artifact_is_proof_authority: false
    }
  });

  return result;
}
