import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
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

type Goal3SourceBoundReleasePackageBody = {
  schema_version?: unknown;
  release_package_id?: unknown;
  project_id?: unknown;
  ok?: unknown;
  release_package_status?: unknown;
  release_package_path?: unknown;
  ga_certificate_consumption_review_current?: unknown;
  source_bound_release_chain_current?: unknown;
  source_review_public_archive_id?: unknown;
  source_review_public_archive_manifest_path?: unknown;
  source_review_public_archive_manifest_sha256?: unknown;
  public_archive_review_ok?: unknown;
  proof_authority?: unknown;
  can_promote_claim?: unknown;
  can_certify_ga?: unknown;
  package_is_proof_authority?: unknown;
  claim_promotion_requires_ordinary_gate?: unknown;
};

export type Goal3SourceOnlyOpenSourceReviewArtifactInput = {
  project_id: string;
  source_review_artifact_id?: string;
  actor?: string;
  release_package_id: string;
  release_package_path: string;
  release_package_sha256: string;
};

export type Goal3SourceOnlyOpenSourceArchive = {
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

export type Goal3SourceOnlyOpenSourceReviewArtifact = {
  schema_version: "comath.goal3_source_only_open_source_review_artifact.v1";
  source_review_artifact_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  ok: true;
  source_review_artifact_status: "source_only_open_source_review_artifact_ready";
  source_review_artifact_path: string;
  release_package_id: string;
  release_package_path: string;
  release_package_artifact: ArtifactReference;
  release_package_current: true;
  source_bound_release_chain_current: true;
  source_review_public_archive_manifest_path: string;
  source_review_public_archive_manifest_sha256: string;
  source_archive: Goal3SourceOnlyOpenSourceArchive;
  public_archive_review_id: string;
  public_archive_review_path: string;
  public_archive_review_ok: true;
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
  source_artifact_is_proof_authority: false;
  claim_promotion_requires_ordinary_gate: true;
  source_review_artifact: ArtifactReference;
};

type Goal3SourceOnlyOpenSourceReviewArtifactBody = Omit<
  Goal3SourceOnlyOpenSourceReviewArtifact,
  "source_review_artifact"
>;

const sourcePackageStatus = "source_bound_public_diagnostic_package_ready";
const forbiddenSourceEntryPatterns = [
  /^\.comath(?:\/|$)/u,
  /^\.git(?:\/|$)/u,
  /^\.tmp(?:\/|$)/u,
  /^\.worktrees(?:\/|$)/u,
  /^\.cache(?:\/|$)/u,
  /^\.next(?:\/|$)/u,
  /^\.pnpm-store(?:\/|$)/u,
  /^\.turbo(?:\/|$)/u,
  /^node_modules(?:\/|$)/u,
  /(?:^|\/)node_modules(?:\/|$)/u,
  /^build(?:\/|$)/u,
  /(?:^|\/)build(?:\/|$)/u,
  /^dist(?:\/|$)/u,
  /(?:^|\/)dist(?:\/|$)/u,
  /^out(?:\/|$)/u,
  /(?:^|\/)out(?:\/|$)/u,
  /^coverage(?:\/|$)/u,
  /(?:^|\/)coverage(?:\/|$)/u,
  /^target(?:\/|$)/u,
  /(?:^|\/)target(?:\/|$)/u,
  /^__pycache__(?:\/|$)/u,
  /(?:^|\/)__pycache__(?:\/|$)/u,
  /^\.env(?:\.|$)/u,
  /(?:^|\/)\.env(?:\.|$)/u,
  /\.tsbuildinfo$/u,
  /\.log$/u,
  /\.(?:7z|gz|rar|tar|tgz|zip)$/iu
];

type SourceTreeEntry = {
  mode: string;
  type: string;
  object: string;
  path: string;
};

type BoundPublicArchive = {
  sourceReviewPublicArchiveId: string;
  sourceReviewPublicArchiveManifestPath: string;
  sourceReviewPublicArchiveManifestSha256: string;
};

type PreparedSourceArchive = {
  archive: Goal3SourceOnlyOpenSourceArchive;
  absoluteArchivePath: string;
  absoluteTempArchivePath: string;
};

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

function sourceArchiveTempPath(artifactId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "goal3-source-only-open-source-review-artifact", artifactId, "source.tar.tmp")
  );
}

function releasePackagePath(packageId: string): string {
  return normalizeRelativePath(join(".comath", "release", "goal3-source-bound-release-package", packageId, "package.json"));
}

function sourceReviewPublicArchiveManifestPath(archiveId: string): string {
  return normalizeRelativePath(join(".comath", "release", "source-review", "public-archive", archiveId, "manifest.json"));
}

function sourceReviewPublicArchiveRoot(archiveId: string): string {
  return normalizeRelativePath(join(".comath", "release", "source-review", "public-archive", archiveId));
}

function publicArchiveReviewPath(reviewId: string): string {
  return normalizeRelativePath(join(".comath", "release", "public-archive-review", reviewId, "review.json"));
}

function assertSafeId(value: string | undefined, label: string): string {
  const id = typeof value === "string" ? value.trim() : "";
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,150}$/u.test(id)) {
    throw new ComathError(`${label} is invalid`, {
      statusCode: 400,
      code: "GOAL3_SOURCE_ONLY_REVIEW_ARTIFACT_INVALID"
    });
  }
  return id;
}

function assertSha256(value: string | undefined): string {
  const sha256 = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-f0-9]{64}$/u.test(sha256)) {
    throw new ComathError("Goal 3 source-only review artifact referenced package hash is stale", {
      statusCode: 400,
      code: "GOAL3_SOURCE_ONLY_REVIEW_ARTIFACT_STALE"
    });
  }
  return sha256;
}

function sanitizeActor(value: string | undefined): string {
  return (value ?? "goal3-source-only-open-source-review-artifact")
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

function sha256File(path: string): string {
  return sha256Bytes(readFileSync(path));
}

function artifactReference(path: string, kind: string, sha256: string, sizeBytes: number): ArtifactReference {
  return {
    kind,
    path,
    sha256,
    size_bytes: sizeBytes
  };
}

function runGitRaw(projectRoot: string, args: string[], errorCode: string): string {
  const result = spawnSync("git", args, {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
    windowsHide: true
  });
  if (result.status !== 0) {
    throw new ComathError("Goal 3 source-only review artifact git operation failed", {
      statusCode: 400,
      code: errorCode
    });
  }
  return result.stdout ?? "";
}

function runGit(projectRoot: string, args: string[], errorCode: string): string {
  return runGitRaw(projectRoot, args, errorCode).trim();
}

function assertGitRoot(projectRoot: string): void {
  const expectedRoot = resolve(projectRoot).toLowerCase();
  const observedRoot = resolve(runGit(projectRoot, ["rev-parse", "--show-toplevel"], "GOAL3_SOURCE_ONLY_REVIEW_ARTIFACT_INVALID")).toLowerCase();
  if (observedRoot !== expectedRoot) {
    throw new ComathError("Goal 3 source-only review artifact must be generated from the project Git root", {
      statusCode: 400,
      code: "GOAL3_SOURCE_ONLY_REVIEW_ARTIFACT_INVALID"
    });
  }
}

function assertCleanGitStatus(projectRoot: string): void {
  const status = runGit(
    projectRoot,
    ["status", "--porcelain", "--untracked-files=all", "--ignored=no"],
    "GOAL3_SOURCE_ONLY_REVIEW_ARTIFACT_INVALID"
  );
  if (status.trim()) {
    throw new ComathError("Goal 3 source-only review artifact requires a clean source worktree", {
      statusCode: 400,
      code: "GOAL3_SOURCE_ONLY_REVIEW_ARTIFACT_DIRTY_WORKTREE"
    });
  }
}

function trackedSourceEntries(projectRoot: string): SourceTreeEntry[] {
  const output = runGitRaw(projectRoot, ["ls-tree", "-r", "-z", "HEAD"], "GOAL3_SOURCE_ONLY_REVIEW_ARTIFACT_INVALID");
  return output
    .split("\0")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry): SourceTreeEntry => {
      const match = /^([0-7]{6}) ([a-z]+) ([0-9a-f]{40,64})\t(.+)$/u.exec(entry);
      if (!match) {
        throw new ComathError("Goal 3 source-only review artifact source tree metadata is invalid", {
          statusCode: 400,
          code: "GOAL3_SOURCE_ONLY_REVIEW_ARTIFACT_FORBIDDEN_ENTRY"
        });
      }
      return {
        mode: match[1],
        type: match[2],
        object: match[3],
        path: normalizeRelativePath(match[4])
      };
    })
    .sort((left, right) => left.path.localeCompare(right.path));
}

function forbiddenSourceEntries(entries: SourceTreeEntry[]): SourceTreeEntry[] {
  return entries.filter((entry) => {
    const allowedFileMode = entry.type === "blob" && (entry.mode === "100644" || entry.mode === "100755");
    return !allowedFileMode || forbiddenSourceEntryPatterns.some((pattern) => pattern.test(entry.path));
  });
}

function readReleasePackage(
  projectRoot: string,
  input: Goal3SourceOnlyOpenSourceReviewArtifactInput,
  packageId: string
): { body: Goal3SourceBoundReleasePackageBody; artifact: ArtifactReference } {
  const canonicalPath = releasePackagePath(packageId);
  if (normalizeRelativePath(input.release_package_path) !== canonicalPath) {
    throw new ComathError("Goal 3 source-only review artifact release-package path is not canonical", {
      statusCode: 400,
      code: "GOAL3_SOURCE_ONLY_REVIEW_ARTIFACT_INVALID"
    });
  }
  const absolutePath = assertPathAllowed(projectRoot, canonicalPath, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new ComathError("Goal 3 source-only review artifact referenced package is stale", {
      statusCode: 400,
      code: "GOAL3_SOURCE_ONLY_REVIEW_ARTIFACT_STALE"
    });
  }
  const content = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(content);
  if (actualSha256 !== assertSha256(input.release_package_sha256)) {
    throw new ComathError("Goal 3 source-only review artifact referenced package hash is stale", {
      statusCode: 400,
      code: "GOAL3_SOURCE_ONLY_REVIEW_ARTIFACT_STALE"
    });
  }
  try {
    return {
      body: JSON.parse(content.toString("utf8")) as Goal3SourceBoundReleasePackageBody,
      artifact: artifactReference(canonicalPath, "goal3_source_bound_release_package", actualSha256, content.byteLength)
    };
  } catch {
    throw new ComathError("Goal 3 source-only review artifact package JSON is invalid", {
      statusCode: 400,
      code: "GOAL3_SOURCE_ONLY_REVIEW_ARTIFACT_INVALID"
    });
  }
}

function assertReleasePackageCurrent(
  body: Goal3SourceBoundReleasePackageBody,
  projectId: string,
  packageId: string,
  artifact: ArtifactReference
): BoundPublicArchive {
  const sourceReviewPublicArchiveId =
    typeof body.source_review_public_archive_id === "string" ? body.source_review_public_archive_id.trim() : "";
  const boundManifestPath =
    typeof body.source_review_public_archive_manifest_path === "string"
      ? normalizeRelativePath(body.source_review_public_archive_manifest_path)
      : "";
  if (
    body.schema_version !== "comath.goal3_source_bound_release_package.v1" ||
    body.release_package_id !== packageId ||
    body.project_id !== projectId ||
    body.ok !== true ||
    body.release_package_status !== sourcePackageStatus ||
    normalizeRelativePath(String(body.release_package_path ?? "")) !== artifact.path ||
    body.ga_certificate_consumption_review_current !== true ||
    body.source_bound_release_chain_current !== true ||
    body.public_archive_review_ok !== true ||
    body.proof_authority !== "none" ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    body.package_is_proof_authority !== false ||
    body.claim_promotion_requires_ordinary_gate !== true ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{2,180}$/u.test(sourceReviewPublicArchiveId) ||
    boundManifestPath !== sourceReviewPublicArchiveManifestPath(sourceReviewPublicArchiveId) ||
    typeof body.source_review_public_archive_manifest_sha256 !== "string"
  ) {
    throw new ComathError("Goal 3 source-only review artifact package is not current source-bound material", {
      statusCode: 400,
      code: "GOAL3_SOURCE_ONLY_REVIEW_ARTIFACT_INVALID"
    });
  }
  return {
    sourceReviewPublicArchiveId,
    sourceReviewPublicArchiveManifestPath: boundManifestPath,
    sourceReviewPublicArchiveManifestSha256: body.source_review_public_archive_manifest_sha256
  };
}

function assertBoundPublicArchiveManifest(
  projectRoot: string,
  projectId: string,
  archiveId: string,
  manifestPath: string,
  expectedSha256: string
): void {
  const absolutePath = assertPathAllowed(projectRoot, manifestPath, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new ComathError("Goal 3 source-only review artifact source-review archive is stale", {
      statusCode: 400,
      code: "GOAL3_SOURCE_ONLY_REVIEW_ARTIFACT_STALE"
    });
  }
  const actualSha256 = sha256File(absolutePath);
  if (actualSha256 !== assertSha256(expectedSha256)) {
    throw new ComathError("Goal 3 source-only review artifact source-review archive hash is stale", {
      statusCode: 400,
      code: "GOAL3_SOURCE_ONLY_REVIEW_ARTIFACT_STALE"
    });
  }
  let manifest: Record<string, unknown>;
  try {
    const parsed = JSON.parse(readFileSync(absolutePath, "utf8")) as unknown;
    manifest = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    throw new ComathError("Goal 3 source-only review artifact source-review archive JSON is invalid", {
      statusCode: 400,
      code: "GOAL3_SOURCE_ONLY_REVIEW_ARTIFACT_INVALID"
    });
  }
  const archiveRoot = sourceReviewPublicArchiveRoot(archiveId);
  if (
    manifest.schema_version !== "comath.source_review_public_archive.v1" ||
    manifest.archive_kind !== "source_review_public_diagnostic" ||
    manifest.project_id !== projectId ||
    manifest.archive_id !== archiveId ||
    normalizeRelativePath(String(manifest.archive_root ?? "")) !== archiveRoot ||
    normalizeRelativePath(String(manifest.manifest_path ?? "")) !== manifestPath ||
    normalizeRelativePath(String(manifest.notarization_manifest_path ?? "")) !==
      normalizeRelativePath(join(archiveRoot, "notarization-policy.json")) ||
    manifest.proof_authority !== "none" ||
    manifest.can_promote_claim !== false ||
    manifest.can_restore !== false ||
    manifest.restore_source !== false ||
    manifest.public_archive_is_proof_authority !== false ||
    manifest.exposes_host_paths !== false ||
    !Array.isArray(manifest.reports) ||
    manifest.reports.length === 0
  ) {
    throw new ComathError("Goal 3 source-only review artifact source-review archive manifest is invalid", {
      statusCode: 400,
      code: "GOAL3_SOURCE_ONLY_REVIEW_ARTIFACT_INVALID"
    });
  }
}

function prepareGitSourceArchive(
  projectRoot: string,
  artifactId: string
): PreparedSourceArchive {
  assertGitRoot(projectRoot);
  assertCleanGitStatus(projectRoot);
  const entries = trackedSourceEntries(projectRoot);
  const forbidden = forbiddenSourceEntries(entries);
  if (forbidden.length) {
    throw new ComathError("Goal 3 source-only review artifact source tree contains forbidden release entries", {
      statusCode: 400,
      code: "GOAL3_SOURCE_ONLY_REVIEW_ARTIFACT_FORBIDDEN_ENTRY"
    });
  }

  const archivePath = sourceArchivePath(artifactId);
  const tempArchivePath = sourceArchiveTempPath(artifactId);
  const absoluteArchivePath = assertPathAllowed(projectRoot, archivePath, { purpose: "runtime-write" });
  const absoluteTempArchivePath = assertPathAllowed(projectRoot, tempArchivePath, { purpose: "runtime-write" });
  mkdirSync(dirname(absoluteTempArchivePath), { recursive: true });
  runGit(projectRoot, ["archive", "--format=tar", `--output=${tempArchivePath}`, "HEAD"], "GOAL3_SOURCE_ONLY_REVIEW_ARTIFACT_INVALID");
  if (!existsSync(absoluteTempArchivePath) || !statSync(absoluteTempArchivePath).isFile()) {
    throw new ComathError("Goal 3 source-only review artifact git archive was not written", {
      statusCode: 500,
      code: "GOAL3_SOURCE_ONLY_REVIEW_ARTIFACT_INVALID"
    });
  }
  return {
    archive: {
      generated_by: "git_archive",
      archive_format: "tar",
      archive_path: archivePath,
      archive_sha256: sha256File(absoluteTempArchivePath),
      size_bytes: statSync(absoluteTempArchivePath).size,
      git_commit: runGit(projectRoot, ["rev-parse", "HEAD"], "GOAL3_SOURCE_ONLY_REVIEW_ARTIFACT_INVALID"),
      git_tree: runGit(projectRoot, ["rev-parse", "HEAD^{tree}"], "GOAL3_SOURCE_ONLY_REVIEW_ARTIFACT_INVALID"),
      entry_count: entries.length,
      entries_sha256: sha256Text(`${entries.map((entry) => `${entry.mode} ${entry.type} ${entry.path}`).join("\n")}\n`),
      forbidden_entry_count: 0,
      dirty_worktree: false,
      source_only: true,
      includes_runtime_state: false,
      includes_git_dir: false,
      includes_node_modules: false
    },
    absoluteArchivePath,
    absoluteTempArchivePath
  };
}

function discardPreparedSourceArchive(prepared: PreparedSourceArchive): void {
  rmSync(prepared.absoluteTempArchivePath, { force: true });
}

function commitPreparedSourceArchive(prepared: PreparedSourceArchive): void {
  renameSync(prepared.absoluteTempArchivePath, prepared.absoluteArchivePath);
}

export function recordGoal3SourceOnlyOpenSourceReviewArtifact(
  projectRoot: string,
  input: Goal3SourceOnlyOpenSourceReviewArtifactInput
): Goal3SourceOnlyOpenSourceReviewArtifact {
  const projectId = assertSafeId(input.project_id, "project_id");
  const artifactId = assertSafeId(input.source_review_artifact_id, "source_review_artifact_id");
  const packageId = assertSafeId(input.release_package_id, "release_package_id");
  const manifestPath = sourceReviewArtifactPath(artifactId);
  const archivePath = sourceArchivePath(artifactId);
  const tempArchivePath = sourceArchiveTempPath(artifactId);
  const publicArchiveReviewId = `GOAL3-SOURCE-ONLY-OPEN-SOURCE-REVIEW-${artifactId}`;
  const publicArchiveReviewManifestPath = publicArchiveReviewPath(publicArchiveReviewId);
  const absoluteManifestPath = assertPathAllowed(projectRoot, manifestPath, { purpose: "runtime-write" });
  const absoluteArchivePath = assertPathAllowed(projectRoot, archivePath, { purpose: "runtime-write" });
  const absoluteTempArchivePath = assertPathAllowed(projectRoot, tempArchivePath, { purpose: "runtime-write" });
  const absolutePublicArchiveReviewManifestPath = assertPathAllowed(projectRoot, publicArchiveReviewManifestPath, {
    purpose: "runtime-write"
  });
  if (
    existsSync(absoluteManifestPath) ||
    existsSync(absoluteArchivePath) ||
    existsSync(absoluteTempArchivePath) ||
    existsSync(absolutePublicArchiveReviewManifestPath)
  ) {
    throw new ComathError("Goal 3 source-only review artifact already exists", {
      statusCode: 409,
      code: "GOAL3_SOURCE_ONLY_REVIEW_ARTIFACT_ALREADY_EXISTS"
    });
  }

  const releasePackage = readReleasePackage(projectRoot, input, packageId);
  const packageArchive = assertReleasePackageCurrent(releasePackage.body, projectId, packageId, releasePackage.artifact);
  assertBoundPublicArchiveManifest(
    projectRoot,
    projectId,
    packageArchive.sourceReviewPublicArchiveId,
    packageArchive.sourceReviewPublicArchiveManifestPath,
    packageArchive.sourceReviewPublicArchiveManifestSha256
  );

  const actor = sanitizeActor(input.actor);
  const preparedSourceArchive = prepareGitSourceArchive(projectRoot, artifactId);
  const sourceArchive = preparedSourceArchive.archive;
  const body: Goal3SourceOnlyOpenSourceReviewArtifactBody = {
    schema_version: "comath.goal3_source_only_open_source_review_artifact.v1",
    source_review_artifact_id: artifactId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    ok: true,
    source_review_artifact_status: "source_only_open_source_review_artifact_ready",
    source_review_artifact_path: manifestPath,
    release_package_id: packageId,
    release_package_path: releasePackage.artifact.path,
    release_package_artifact: releasePackage.artifact,
    release_package_current: true,
    source_bound_release_chain_current: true,
    source_review_public_archive_manifest_path: packageArchive.sourceReviewPublicArchiveManifestPath,
    source_review_public_archive_manifest_sha256: packageArchive.sourceReviewPublicArchiveManifestSha256,
    source_archive: sourceArchive,
    public_archive_review_id: publicArchiveReviewId,
    public_archive_review_path: publicArchiveReviewManifestPath,
    public_archive_review_ok: true,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    source_artifact_is_proof_authority: false,
    claim_promotion_requires_ordinary_gate: true
  };
  const publicPayload = sanitizePublicFormalAuthorityVocabulary({
    schema_version: "comath.goal3_source_only_open_source_review_artifact_route_payload.v1",
    source_review_artifact_id: artifactId,
    release_package_sha256: releasePackage.artifact.sha256,
    source_archive_sha256: sourceArchive.archive_sha256,
    source_archive_generated_by: "git_archive",
    source_only: true,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    source_artifact_is_proof_authority: false
  });
  let archiveReview: ReturnType<typeof reviewGoal3PublicArchiveSurfaces>;
  try {
    archiveReview = reviewGoal3PublicArchiveSurfaces(projectRoot, {
      project_id: projectId,
      actor,
      review_id: publicArchiveReviewId,
      surfaces: [
        {
          surface_id: `task307-source-review-public-archive:${packageId}`,
          surface_kind: "source_review_public_archive",
          manifest_path: packageArchive.sourceReviewPublicArchiveManifestPath
        },
        {
          surface_id: `source-only-open-source-route:${artifactId}`,
          surface_kind: "public_route_payload",
          payload: publicPayload
        },
        {
          surface_id: `source-only-open-source-manifest:${artifactId}`,
          surface_kind: "public_review_manifest",
          payload: body
        }
      ]
    });
    if (!archiveReview.ok) {
      throw new ComathError("Goal 3 source-only review artifact public archive review failed", {
        statusCode: 400,
        code: "GOAL3_SOURCE_ONLY_REVIEW_ARTIFACT_INVALID"
      });
    }
    commitPreparedSourceArchive(preparedSourceArchive);
  } catch (error) {
    discardPreparedSourceArchive(preparedSourceArchive);
    throw error;
  }

  const manifestText = canonicalJson(body);
  mkdirSync(dirname(absoluteManifestPath), { recursive: true });
  writeFileSync(absoluteManifestPath, manifestText, "utf8");
  const result: Goal3SourceOnlyOpenSourceReviewArtifact = {
    ...body,
    source_review_artifact: artifactReference(
      manifestPath,
      "goal3_source_only_open_source_review_artifact",
      sha256Text(manifestText),
      Buffer.byteLength(manifestText, "utf8")
    )
  };

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.goal3_source_only_open_source_review_artifact_recorded",
    actor,
    target_id: projectId,
    payload: {
      source_review_artifact_id: artifactId,
      source_review_artifact_path: manifestPath,
      source_review_artifact_sha256: result.source_review_artifact.sha256,
      release_package_id: packageId,
      release_package_artifact_sha256: releasePackage.artifact.sha256,
      source_archive_path: sourceArchive.archive_path,
      source_archive_sha256: sourceArchive.archive_sha256,
      source_archive_generated_by: "git_archive",
      source_archive_entry_count: sourceArchive.entry_count,
      git_commit: sourceArchive.git_commit,
      git_tree: sourceArchive.git_tree,
      source_only: true,
      public_archive_review_id: archiveReview.review_id,
      public_archive_review_path: archiveReview.manifest_path,
      public_archive_review_ok: true,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false,
      source_artifact_is_proof_authority: false
    }
  });
  return result;
}
