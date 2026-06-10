import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import * as comath from "../../dist/index.js";

const {
  createComathServer,
  getComathdStatus,
  initProject,
  readAuditEvents,
  recordGoal3SourceArtifactPresentationReview,
  recordGoal3SourceReleasePublicChecklist
} = comath;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task310-source-checklist-"));
const init = initProject({
  name: "Goal 3 Task310 source release public checklist",
  root_path: projectRoot
});
const projectId = init.project.project_id;
const secretTerms = /Authorization:\s*Bearer|api_key|token=|plain-token|\bsk-[A-Za-z0-9_-]+/i;
const privilegedPublicTerms =
  /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|proven|verified_final_authority_evidence|GA certified|can_certify_ga\s*[:=]\s*(?:true|1)|can_promote_claim\s*[:=]\s*(?:true|1))\b/i;

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

function checklistPath(checklistId) {
  return `.comath/release/goal3-source-release-public-checklist/${checklistId}/checklist.json`;
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

function createPresentation(presentationId, artifactId, overrides = {}) {
  const sourceArtifact = writeTask308SourceArtifact(artifactId, overrides);
  return {
    sourceArtifact,
    presentation: recordGoal3SourceArtifactPresentationReview(projectRoot, {
      project_id: projectId,
      presentation_review_id: presentationId,
      actor: "goal3-task310 fixture",
      source_review_artifact_id: sourceArtifact.body.source_review_artifact_id,
      source_review_artifact_path: sourceArtifact.path,
      source_review_artifact_sha256: sourceArtifact.sha256
    })
  };
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
    typeof recordGoal3SourceReleasePublicChecklist,
    "function",
    "Task310 must export a service-owned source release public checklist gate"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("goal3_source_release_public_checklist_gate"),
    true,
    "Task310 capability ledger must advertise the source release public checklist gate"
  );
  for (const [path, pattern] of [
    ["README.md", /Task310.*source release public checklist/s],
    ["TODO.md", /Task310.*source release public checklist/s],
    ["REVIEW.md", /Goal 3 Task 310/s],
    ["AGENTS.md", /Task310.*source release public checklist/s],
    ["docs/architecture/ga-release-criteria.md", /Task310.*source release public checklist/s],
    ["docs/architecture/threat-model.md", /Task310.*source release public checklist/s],
    ["docs/architecture/evidence-pack-policy.md", /Task310.*source release public checklist/s],
    ["docs/architecture/acceptance-matrix.md", /Task310.*source release public checklist/s]
  ]) {
    assert.match(repoFile(path), pattern, `${path} must document Task310 source release public checklist`);
  }
  assert.equal(
    repoFile("scripts/phase0-smoke.mjs").includes("goal3-task310-source-release-public-checklist.test.mjs"),
    true,
    "phase0 smoke must discover the Task310 focused suite"
  );

  const stalePresentation = createPresentation("GOAL3-SOURCE-PRESENTATION-0310-STALE", "0310-STALE");
  assert.throws(
    () =>
      recordGoal3SourceReleasePublicChecklist(projectRoot, {
        project_id: projectId,
        checklist_id: "GOAL3-SOURCE-RELEASE-CHECKLIST-0310-STALE",
        actor: "goal3-task310 stale token=plain-token",
        presentation_review_id: stalePresentation.presentation.presentation_review_id,
        presentation_review_path: stalePresentation.presentation.presentation_review_path,
        presentation_review_sha256: "0".repeat(64)
      }),
    { code: "GOAL3_SOURCE_RELEASE_PUBLIC_CHECKLIST_STALE" },
    "Task310 must reject stale Task309 presentation hashes before writing checklist material"
  );
  assert.equal(
    existsSync(join(projectRoot, checklistPath("GOAL3-SOURCE-RELEASE-CHECKLIST-0310-STALE"))),
    false,
    "Task310 must not write partial checklist material after stale presentation input"
  );

  const staleArchive = createPresentation("GOAL3-SOURCE-PRESENTATION-0310-STALE-ARCHIVE", "0310-STALE-ARCHIVE");
  writeText(staleArchive.presentation.source_archive.archive_path, "tampered source tar bytes\n");
  assert.throws(
    () =>
      recordGoal3SourceReleasePublicChecklist(projectRoot, {
        project_id: projectId,
        checklist_id: "GOAL3-SOURCE-RELEASE-CHECKLIST-0310-STALE-ARCHIVE",
        actor: "goal3-task310 stale archive",
        presentation_review_id: staleArchive.presentation.presentation_review_id,
        presentation_review_path: staleArchive.presentation.presentation_review_path,
        presentation_review_sha256: staleArchive.presentation.presentation_review_artifact.sha256
      }),
    { code: "GOAL3_SOURCE_RELEASE_PUBLIC_CHECKLIST_STALE" },
    "Task310 must re-read source.tar and reject archive bytes that no longer match the Task309 presentation"
  );

  const forgedRestore = createPresentation("GOAL3-SOURCE-PRESENTATION-0310-RESTORE", "0310-RESTORE");
  const forgedBody = readJson(forgedRestore.presentation.presentation_review_path);
  forgedBody.download_descriptor.can_restore = true;
  const forgedArtifact = writeJson(forgedRestore.presentation.presentation_review_path, forgedBody);
  assert.throws(
    () =>
      recordGoal3SourceReleasePublicChecklist(projectRoot, {
        project_id: projectId,
        checklist_id: "GOAL3-SOURCE-RELEASE-CHECKLIST-0310-RESTORE",
        actor: "goal3-task310 forged restore",
        presentation_review_id: forgedRestore.presentation.presentation_review_id,
        presentation_review_path: forgedArtifact.path,
        presentation_review_sha256: forgedArtifact.sha256
      }),
    { code: "GOAL3_SOURCE_RELEASE_PUBLIC_CHECKLIST_INVALID" },
    "Task310 must reject Task309 presentation material that implies public source archives are restorable"
  );

  const ready = createPresentation("GOAL3-SOURCE-PRESENTATION-0310-READY", "0310-READY");
  const checklist = recordGoal3SourceReleasePublicChecklist(projectRoot, {
    project_id: projectId,
    checklist_id: "GOAL3-SOURCE-RELEASE-CHECKLIST-0310-READY",
    actor: `goal3-task310 ${projectRoot} token=plain-token formally_checked can_promote_claim=true GA certified can_certify_ga=true`,
    presentation_review_id: ready.presentation.presentation_review_id,
    presentation_review_path: ready.presentation.presentation_review_path,
    presentation_review_sha256: ready.presentation.presentation_review_artifact.sha256
  });

  assert.equal(checklist.schema_version, "comath.goal3_source_release_public_checklist.v1");
  assert.equal(checklist.ok, true);
  assert.equal(checklist.release_checklist_status, "source_release_public_checklist_ready");
  assert.equal(checklist.presentation_review_current, true);
  assert.equal(checklist.source_archive_current, true);
  assert.equal(checklist.download_descriptor_current, true);
  assert.equal(checklist.public_source_review_ready, true);
  assert.equal(checklist.external_notarization_status, "not_configured");
  assert.equal(checklist.os_immutable_storage_status, "not_configured");
  assert.equal(checklist.proof_authority, "none");
  assert.equal(checklist.can_restore, false);
  assert.equal(checklist.can_promote_claim, false);
  assert.equal(checklist.can_certify_ga, false);
  assert.equal(checklist.checklist_is_proof_authority, false);
  assert.equal(checklist.presentation_is_proof_authority, false);
  assert.equal(checklist.source_artifact_is_proof_authority, false);
  assert.equal(checklist.claim_promotion_requires_ordinary_gate, true);
  for (const itemId of [
    "presentation_manifest_hash_bound",
    "source_archive_bytes_hash_bound",
    "download_descriptor_non_restorable",
    "public_archive_review_passed",
    "external_notarization_not_configured",
    "os_immutable_storage_not_configured",
    "proof_authority_not_claimed"
  ]) {
    assert.equal(
      checklist.checklist_items.some((item) => item.item_id === itemId && item.status === "passed"),
      true,
      `Task310 checklist must include passed item ${itemId}`
    );
  }
  assertProjectRelative(checklist.checklist_path, "checklist_path");
  assertProjectRelative(checklist.presentation_review_artifact.path, "presentation_review_artifact.path");
  assertProjectRelative(checklist.source_archive.archive_path, "source_archive.archive_path");
  assertNoPublicLeak(checklist, "Task310 source release public checklist result");

  const persisted = readJson(checklist.checklist_path);
  assert.equal(persisted.checklist_artifact, undefined);
  assert.equal(persisted.source_archive.archive_sha256, ready.presentation.source_archive.archive_sha256);
  assert.equal(persisted.can_restore, false);

  const server = createComathServer();
  const routeReady = createPresentation("GOAL3-SOURCE-PRESENTATION-0310-ROUTE", "0310-ROUTE");
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/goal3/source-release-public-checklist",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      checklist_id: "GOAL3-SOURCE-RELEASE-CHECKLIST-0310-ROUTE",
      actor: "goal3-task310 route token=plain-token formally_checked GA certified can_certify_ga=true",
      presentation_review_id: routeReady.presentation.presentation_review_id,
      presentation_review_path: routeReady.presentation.presentation_review_path,
      presentation_review_sha256: routeReady.presentation.presentation_review_artifact.sha256
    }
  });
  assert.equal(routeResponse.status, 200);
  assert.equal(routeResponse.body.source_release_public_checklist.proof_authority, "none");
  assert.equal(routeResponse.body.source_release_public_checklist.can_restore, false);
  assert.equal(routeResponse.body.source_release_public_checklist.can_promote_claim, false);
  assert.equal(routeResponse.body.source_release_public_checklist.external_notarization_status, "not_configured");
  assertNoPublicLeak(routeResponse.body, "Task310 public route response");

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (entry) =>
        entry.event_type === "release.goal3_source_release_public_checklist_recorded" &&
        entry.payload.checklist_id === "GOAL3-SOURCE-RELEASE-CHECKLIST-0310-ROUTE" &&
        entry.payload.presentation_review_sha256 === routeReady.presentation.presentation_review_artifact.sha256 &&
        entry.payload.source_archive_sha256 === routeReady.presentation.source_archive.archive_sha256 &&
        entry.payload.external_notarization_status === "not_configured" &&
        entry.payload.os_immutable_storage_status === "not_configured" &&
        entry.payload.proof_authority === "none" &&
        entry.payload.can_restore === false &&
        entry.payload.can_promote_claim === false &&
        entry.payload.can_certify_ga === false
    ),
    true,
    "Task310 gate must emit source release public checklist provenance"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task310 source release public checklist tests passed.");
