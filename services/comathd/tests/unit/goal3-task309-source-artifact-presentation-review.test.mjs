import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import * as comath from "../../dist/index.js";

const {
  createComathServer,
  getComathdStatus,
  initProject,
  readAuditEvents,
  recordGoal3SourceArtifactPresentationReview
} = comath;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task309-source-presentation-"));
const init = initProject({
  name: "Goal 3 Task309 source artifact presentation review",
  root_path: projectRoot
});
const projectId = init.project.project_id;
const secretTerms = /Authorization:\s*Bearer|api_key|token=|plain-token|\bsk-[A-Za-z0-9_-]+/i;
const privilegedPublicTerms =
  /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|proven|verified_final_authority_evidence|GA certified|can_certify_ga\s*[:=]\s*(?:true|1))\b/i;

function repoFile(relativePath) {
  const here = dirname(fileURLToPath(import.meta.url));
  return readFileSync(join(here, "../../../..", relativePath), "utf8");
}

function sha256Text(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function sha256Buffer(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function writeText(relativePath, text) {
  const absolutePath = join(projectRoot, relativePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, text, "utf8");
}

function writeBuffer(relativePath, bytes) {
  const absolutePath = join(projectRoot, relativePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, bytes);
}

function writeJson(relativePath, value) {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  writeText(relativePath, text);
  return {
    path: relativePath,
    sha256: sha256Text(text),
    size_bytes: Buffer.byteLength(text, "utf8"),
    body: value
  };
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(projectRoot, relativePath), "utf8"));
}

function sourceArtifactManifestPath(artifactId) {
  return `.comath/release/goal3-source-only-open-source-review-artifact/${artifactId}/source-artifact.json`;
}

function sourceArtifactArchivePath(artifactId) {
  return `.comath/release/goal3-source-only-open-source-review-artifact/${artifactId}/source.tar`;
}

function presentationReviewPath(reviewId) {
  return `.comath/release/goal3-source-artifact-presentation-review/${reviewId}/presentation.json`;
}

function artifact(kind, path, fill = "a", size = 1024) {
  return {
    kind,
    path,
    sha256: fill.repeat(64),
    size_bytes: size
  };
}

function writeTask308SourceArtifact(artifactId, overrides = {}) {
  const archivePath = sourceArtifactArchivePath(artifactId);
  const archiveBytes = Buffer.from(`source tar for ${artifactId}\n`);
  writeBuffer(archivePath, archiveBytes);
  const manifestPath = sourceArtifactManifestPath(artifactId);
  return writeJson(manifestPath, {
    schema_version: "comath.goal3_source_only_open_source_review_artifact.v1",
    source_review_artifact_id: artifactId,
    project_id: projectId,
    actor: "goal3-task308 fixture",
    created_at: "2026-06-10T00:00:00.000Z",
    ok: true,
    source_review_artifact_status: "source_only_open_source_review_artifact_ready",
    source_review_artifact_path: manifestPath,
    release_package_id: `GOAL3-SOURCE-BOUND-RELEASE-PACKAGE-${artifactId}`,
    release_package_path: `.comath/release/goal3-source-bound-release-package/GOAL3-SOURCE-BOUND-RELEASE-PACKAGE-${artifactId}/package.json`,
    release_package_artifact: artifact(
      "goal3_source_bound_release_package",
      `.comath/release/goal3-source-bound-release-package/GOAL3-SOURCE-BOUND-RELEASE-PACKAGE-${artifactId}/package.json`,
      "b"
    ),
    release_package_current: true,
    source_bound_release_chain_current: true,
    source_review_public_archive_manifest_path:
      `.comath/release/source-review/public-archive/GOAL3-SOURCE-BOUND-PUBLIC-ARCHIVE-${artifactId}/manifest.json`,
    source_review_public_archive_manifest_sha256: "c".repeat(64),
    source_archive: {
      generated_by: "git_archive",
      archive_format: "tar",
      archive_path: archivePath,
      archive_sha256: sha256Buffer(archiveBytes),
      size_bytes: archiveBytes.byteLength,
      git_commit: "d".repeat(40),
      git_tree: "e".repeat(40),
      entry_count: 4,
      entries_sha256: "f".repeat(64),
      forbidden_entry_count: 0,
      dirty_worktree: false,
      source_only: true,
      includes_runtime_state: false,
      includes_git_dir: false,
      includes_node_modules: false
    },
    public_archive_review_id: `GOAL3-SOURCE-ONLY-OPEN-SOURCE-REVIEW-${artifactId}`,
    public_archive_review_path:
      `.comath/release/public-archive-review/GOAL3-SOURCE-ONLY-OPEN-SOURCE-REVIEW-${artifactId}/review.json`,
    public_archive_review_ok: true,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    source_artifact_is_proof_authority: false,
    claim_promotion_requires_ordinary_gate: true,
    ...overrides
  });
}

function assertProjectRelative(path, label) {
  assert.equal(typeof path, "string", `${label} must be a string`);
  assert.equal(path.startsWith(".comath/"), true, `${label} must stay under .comath`);
  assert.equal(path.includes(".."), false, `${label} must not contain traversal`);
  assert.equal(/[A-Za-z]:[\\/]/.test(path), false, `${label} must not expose a Windows absolute path`);
  assert.equal(path.includes("\\\\"), false, `${label} must not expose UNC/device syntax`);
}

function assertNoPublicLeak(value, label) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  assert.equal(text.includes(projectRoot), false, `${label} exposed project root`);
  assert.doesNotMatch(text, secretTerms, `${label} exposed secret-looking text`);
  assert.doesNotMatch(text, privilegedPublicTerms, `${label} exposed proof-authority wording`);
}

try {
  assert.equal(
    typeof recordGoal3SourceArtifactPresentationReview,
    "function",
    "Task309 must export a service-owned source artifact presentation review gate"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("goal3_source_artifact_presentation_review_gate"),
    true,
    "Task309 capability ledger must advertise the source artifact presentation review gate"
  );
  for (const [path, pattern] of [
    ["README.md", /Task309.*source artifact presentation review/s],
    ["TODO.md", /Task309.*source artifact presentation review/s],
    ["REVIEW.md", /Goal 3 Task 309/s],
    ["AGENTS.md", /Task309.*source artifact presentation review/s],
    ["docs/architecture/ga-release-criteria.md", /Task309.*source artifact presentation review/s],
    ["docs/architecture/threat-model.md", /Task309.*source artifact presentation review/s],
    ["docs/architecture/evidence-pack-policy.md", /Task309.*source artifact presentation review/s],
    ["docs/architecture/acceptance-matrix.md", /Task309.*source artifact presentation review/s]
  ]) {
    assert.match(repoFile(path), pattern, `${path} must document Task309 source artifact presentation review`);
  }
  assert.equal(
    repoFile("scripts/phase0-smoke.mjs").includes("goal3-task309-source-artifact-presentation-review.test.mjs"),
    true,
    "phase0 smoke must discover the Task309 focused suite"
  );

  const staleArtifact = writeTask308SourceArtifact("0309-STALE");
  assert.throws(
    () =>
      recordGoal3SourceArtifactPresentationReview(projectRoot, {
        project_id: projectId,
        presentation_review_id: "GOAL3-SOURCE-PRESENTATION-0309-STALE",
        actor: "goal3-task309 stale token=plain-token",
        source_review_artifact_id: staleArtifact.body.source_review_artifact_id,
        source_review_artifact_path: staleArtifact.path,
        source_review_artifact_sha256: "0".repeat(64)
      }),
    { code: "GOAL3_SOURCE_ARTIFACT_PRESENTATION_REVIEW_STALE" },
    "Task309 must reject stale Task308 manifest hashes before writing presentation material"
  );
  assert.equal(
    existsSync(join(projectRoot, presentationReviewPath("GOAL3-SOURCE-PRESENTATION-0309-STALE"))),
    false,
    "Task309 must not write partial presentation material after stale manifest input"
  );

  const staleArchive = writeTask308SourceArtifact("0309-STALE-ARCHIVE");
  writeText(staleArchive.body.source_archive.archive_path, "tampered source tar bytes\n");
  assert.throws(
    () =>
      recordGoal3SourceArtifactPresentationReview(projectRoot, {
        project_id: projectId,
        presentation_review_id: "GOAL3-SOURCE-PRESENTATION-0309-STALE-ARCHIVE",
        actor: "goal3-task309 stale archive",
        source_review_artifact_id: staleArchive.body.source_review_artifact_id,
        source_review_artifact_path: staleArchive.path,
        source_review_artifact_sha256: staleArchive.sha256
      }),
    { code: "GOAL3_SOURCE_ARTIFACT_PRESENTATION_REVIEW_STALE" },
    "Task309 must re-read source.tar and reject archive bytes that no longer match the Task308 manifest"
  );
  assert.equal(
    existsSync(join(projectRoot, presentationReviewPath("GOAL3-SOURCE-PRESENTATION-0309-STALE-ARCHIVE"))),
    false,
    "Task309 must not write partial presentation material after stale source.tar bytes"
  );

  const promotionalArtifact = writeTask308SourceArtifact("0309-PROMOTIONAL", {
    proof_authority: "lean_kernel_clean_replay",
    source_artifact_is_proof_authority: true
  });
  assert.throws(
    () =>
      recordGoal3SourceArtifactPresentationReview(projectRoot, {
        project_id: projectId,
        presentation_review_id: "GOAL3-SOURCE-PRESENTATION-0309-PROMOTIONAL",
        actor: "goal3-task309 promotional",
        source_review_artifact_id: promotionalArtifact.body.source_review_artifact_id,
        source_review_artifact_path: promotionalArtifact.path,
        source_review_artifact_sha256: promotionalArtifact.sha256
      }),
    { code: "GOAL3_SOURCE_ARTIFACT_PRESENTATION_REVIEW_INVALID" },
    "Task309 must reject Task308 manifests that claim proof or GA authority"
  );

  const readyArtifact = writeTask308SourceArtifact("0309-READY");
  const presentation = recordGoal3SourceArtifactPresentationReview(projectRoot, {
    project_id: projectId,
    presentation_review_id: "GOAL3-SOURCE-PRESENTATION-0309-READY",
    actor: `goal3-task309 ${projectRoot} token=plain-token formally_checked can_promote_claim=true GA certified can_certify_ga=true`,
    source_review_artifact_id: readyArtifact.body.source_review_artifact_id,
    source_review_artifact_path: readyArtifact.path,
    source_review_artifact_sha256: readyArtifact.sha256
  });

  assert.equal(presentation.schema_version, "comath.goal3_source_artifact_presentation_review.v1");
  assert.equal(presentation.ok, true);
  assert.equal(presentation.presentation_status, "source_artifact_presentation_ready");
  assert.equal(presentation.source_review_artifact_current, true);
  assert.equal(presentation.source_archive_current, true);
  assert.equal(presentation.source_archive.archive_sha256, readyArtifact.body.source_archive.archive_sha256);
  assert.equal(presentation.download_descriptor.content_type, "application/x-tar");
  assert.equal(presentation.download_descriptor.can_restore, false);
  assert.equal(presentation.download_descriptor.proof_authority, "none");
  assert.equal(presentation.download_descriptor.can_promote_claim, false);
  assert.equal(presentation.download_descriptor.can_certify_ga, false);
  assert.equal(presentation.proof_authority, "none");
  assert.equal(presentation.can_promote_claim, false);
  assert.equal(presentation.can_certify_ga, false);
  assert.equal(presentation.presentation_is_proof_authority, false);
  assert.equal(presentation.source_artifact_is_proof_authority, false);
  assertProjectRelative(presentation.presentation_review_path, "presentation_review_path");
  assertProjectRelative(presentation.source_review_artifact.path, "source_review_artifact.path");
  assertProjectRelative(presentation.source_archive.archive_path, "source_archive.archive_path");
  assertNoPublicLeak(presentation, "Task309 source artifact presentation review result");

  const persisted = readJson(presentation.presentation_review_path);
  assert.equal(persisted.presentation_review_artifact, undefined);
  assert.equal(persisted.source_archive.archive_sha256, readyArtifact.body.source_archive.archive_sha256);
  assert.equal(persisted.download_descriptor.can_restore, false);

  const server = createComathServer();
  const routeArtifact = writeTask308SourceArtifact("0309-ROUTE");
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/goal3/source-artifact-presentation-review",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      presentation_review_id: "GOAL3-SOURCE-PRESENTATION-0309-ROUTE",
      actor: "goal3-task309 route token=plain-token formally_checked GA certified can_certify_ga=true",
      source_review_artifact_id: routeArtifact.body.source_review_artifact_id,
      source_review_artifact_path: routeArtifact.path,
      source_review_artifact_sha256: routeArtifact.sha256
    }
  });
  assert.equal(routeResponse.status, 200);
  assert.equal(routeResponse.body.source_artifact_presentation_review.proof_authority, "none");
  assert.equal(routeResponse.body.source_artifact_presentation_review.can_promote_claim, false);
  assert.equal(routeResponse.body.source_artifact_presentation_review.download_descriptor.can_restore, false);
  assertNoPublicLeak(routeResponse.body, "Task309 public route response");

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (entry) =>
        entry.event_type === "release.goal3_source_artifact_presentation_review_recorded" &&
        entry.payload.presentation_review_id === "GOAL3-SOURCE-PRESENTATION-0309-ROUTE" &&
        entry.payload.source_review_artifact_sha256 === routeArtifact.sha256 &&
        entry.payload.source_archive_sha256 === routeArtifact.body.source_archive.archive_sha256 &&
        entry.payload.proof_authority === "none" &&
        entry.payload.can_promote_claim === false &&
        entry.payload.can_certify_ga === false
    ),
    true,
    "Task309 gate must emit source artifact presentation provenance"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task309 source artifact presentation review tests passed.");
