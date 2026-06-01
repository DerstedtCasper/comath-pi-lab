import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  appendAuditEvent,
  createComathServer,
  exportSnapshot,
  importArtifact,
  initProject,
  restoreSnapshot,
  spawnWorkstream,
  writeWorkstreamReport
} from "../../dist/index.js";

const privilegedPublicTerms =
  /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence)\b/i;

function readSnapshotText(snapshot, relativePath) {
  const normalized = relativePath.replace(/\\/g, "/");
  const entry = snapshot.manifest.entries.find((item) => item.relative_path === normalized);
  assert.ok(entry, `missing snapshot entry ${normalized}`);
  return readFileSync(join(snapshot.snapshot_root, entry.snapshot_path), "utf8");
}

function assertPublicSnapshotText(snapshot, relativePath) {
  assert.doesNotMatch(
    readSnapshotText(snapshot, relativePath),
    privilegedPublicTerms,
    `${relativePath} must be public-sanitized in the default snapshot download`
  );
}

function assertInternalSnapshotText(snapshot, relativePath) {
  assert.match(
    readSnapshotText(snapshot, relativePath),
    privilegedPublicTerms,
    `${relativePath} must preserve byte-for-byte internal restore material`
  );
}

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task133-snapshot-contract-"));
const restoreRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task133-restore-"));
const server = createComathServer();

try {
  const { project } = initProject({ name: "Task 133 snapshot contract", root_path: projectRoot });
  const workstream = spawnWorkstream(projectRoot, {
    project_id: project.project_id,
    kind: "proof_route",
    goal: "Public downloads must not expose clean_replay_passed or lean_kernel_clean_replay.",
    created_by: "goal3-task133"
  });
  writeWorkstreamReport(projectRoot, {
    project_id: project.project_id,
    workstream_id: workstream.workstream_id,
    report_markdown: "Raw report says formal_replay_passed with verified_final_authority_evidence.",
    status: "running",
    actor: "goal3-task133"
  });
  appendAuditEvent(projectRoot, {
    project_id: project.project_id,
    event_type: "goal3.task133.poisoned_public_download_fixture",
    actor: "goal3-task133",
    target_id: workstream.workstream_id,
    payload: {
      message: "audit log says completed_formal_proof and formally_checked"
    }
  });
  const artifactSource = join(projectRoot, "task133-artifact.txt");
  writeFileSync(artifactSource, "artifact blob says lean_kernel_clean_replay and formal_proof_verified\n", "utf8");
  const artifact = await importArtifact({
    projectRoot,
    project_id: project.project_id,
    source_path: artifactSource,
    kind: "log",
    actor: "goal3-task133"
  });

  const publicSnapshot = await exportSnapshot(projectRoot, { project_id: project.project_id, actor: "goal3-task133" });
  assert.equal(publicSnapshot.manifest.snapshot_kind, "public_download");
  assert.equal(publicSnapshot.manifest.can_restore, false);
  assertPublicSnapshotText(publicSnapshot, ".comath/audit/events.jsonl");
  assertPublicSnapshotText(publicSnapshot, `.comath/workstreams/${workstream.workstream_id}/status.json`);
  assertPublicSnapshotText(publicSnapshot, `.comath/workstreams/${workstream.workstream_id}/spec.yaml`);
  assertPublicSnapshotText(publicSnapshot, `.comath/workstreams/${workstream.workstream_id}/report.md`);
  assertPublicSnapshotText(publicSnapshot, `.comath/workstreams/${workstream.workstream_id}/graph_patch.json`);
  assertPublicSnapshotText(publicSnapshot, artifact.path);
  await assert.rejects(
    () => restoreSnapshot(publicSnapshot.manifest_path, restoreRoot, { actor: "goal3-task133" }),
    /public snapshot downloads cannot be restored/
  );

  const internalSnapshot = await exportSnapshot(projectRoot, {
    project_id: project.project_id,
    actor: "goal3-task133",
    audience: "internal_restore"
  });
  assert.equal(internalSnapshot.manifest.snapshot_kind, "internal_restore");
  assert.equal(internalSnapshot.manifest.can_restore, true);
  assertInternalSnapshotText(internalSnapshot, ".comath/audit/events.jsonl");
  assertInternalSnapshotText(internalSnapshot, `.comath/workstreams/${workstream.workstream_id}/report.md`);
  assertInternalSnapshotText(internalSnapshot, artifact.path);
  const restored = await restoreSnapshot(internalSnapshot.manifest_path, restoreRoot, { actor: "goal3-task133" });
  assert.equal(restored.restored_entries, internalSnapshot.manifest.entries.length);
  assert.match(
    readFileSync(join(restoreRoot, `.comath/workstreams/${workstream.workstream_id}/report.md`), "utf8"),
    privilegedPublicTerms,
    "internal restore must preserve original workstream material"
  );

  const routeExport = await server.inject({
    method: "POST",
    path: "/snapshot/export",
    body: { project_root: projectRoot, project_id: project.project_id, actor: "goal3-task133-route" }
  });
  assert.equal(routeExport.status, 200, JSON.stringify(routeExport.body));
  assert.equal(routeExport.body.manifest.snapshot_kind, "public_download");
  assert.equal(routeExport.body.manifest.can_restore, false);
  assert.doesNotMatch(JSON.stringify(routeExport.body.manifest), privilegedPublicTerms);

  const routeRestore = await server.inject({
    method: "POST",
    path: "/snapshot/restore",
    body: {
      manifest_path: routeExport.body.manifest_path,
      target_root: join(dirname(restoreRoot), "comath-goal3-task133-route-restore"),
      actor: "goal3-task133-route"
    }
  });
  assert.equal(routeRestore.status, 400);
  assert.equal(routeRestore.body.code, "SNAPSHOT_PUBLIC_DOWNLOAD_NOT_RESTORABLE");
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
  rmSync(restoreRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 133 public snapshot restore contract tests passed.");
