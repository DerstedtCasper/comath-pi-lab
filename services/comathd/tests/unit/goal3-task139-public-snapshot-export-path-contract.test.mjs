import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { createComathServer, exportSnapshot, initProject } from "../../dist/index.js";

function hostPathVariants(path) {
  const resolved = resolve(path);
  return Array.from(new Set([resolved, resolved.replace(/\\/g, "/"), resolved.replace(/\\/g, "\\\\")]));
}

function assertNoHostPathEcho(value, paths) {
  const text = JSON.stringify(value);
  for (const path of paths) {
    for (const variant of hostPathVariants(path)) {
      assert.equal(text.includes(variant), false, `public route response echoed host path ${variant}`);
    }
  }
  assert.equal(/[A-Za-z]:\\\\|[A-Za-z]:\//.test(text), false, "public route response must not expose Windows absolute paths");
  assert.equal(text.includes("\\\\?\\") || text.includes("\\\\"), false, "public route response must not expose device or UNC paths");
}

function assertRelativeSnapshotPath(path, suffix) {
  assert.equal(isAbsolute(path), false, `${suffix} must be project-relative`);
  assert.equal(path.startsWith(".comath/snapshots/"), true, `${suffix} must stay under .comath/snapshots`);
  assert.equal(path.includes(".."), false, `${suffix} must not contain traversal`);
}

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task139-snapshot-export-"));
const routeRestoreRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task139-route-restore-"));
const server = createComathServer();

try {
  const { project } = initProject({ name: "Task 139 snapshot export", root_path: projectRoot });
  const directSnapshot = await exportSnapshot(projectRoot, {
    project_id: project.project_id,
    actor: "goal3-task139-direct",
    audience: "internal_restore"
  });
  assert.equal(isAbsolute(directSnapshot.manifest_path), true, "direct internal snapshot API keeps absolute manifest path");
  assert.equal(isAbsolute(directSnapshot.snapshot_root), true, "direct internal snapshot API keeps absolute snapshot root");

  const routeExport = await server.inject({
    method: "POST",
    path: "/snapshot/export",
    body: {
      project_root: projectRoot,
      project_id: project.project_id,
      actor: "goal3-task139-route",
      audience: "internal_restore"
    }
  });
  assert.equal(routeExport.status, 200, JSON.stringify(routeExport.body));
  assert.equal(routeExport.body.manifest.snapshot_kind, "public_download");
  assert.equal(routeExport.body.manifest.can_restore, false);
  assert.equal(routeExport.body.public_archive_contract.proof_authority, "none");
  assert.equal(routeExport.body.public_archive_contract.can_restore, false);
  assert.equal(routeExport.body.public_archive_contract.exposes_host_paths, false);
  assertRelativeSnapshotPath(routeExport.body.snapshot_root, "snapshot_root");
  assertRelativeSnapshotPath(routeExport.body.manifest_path, "manifest_path");
  assertRelativeSnapshotPath(routeExport.body.replay_manifest_path, "replay_manifest_path");
  assertNoHostPathEcho(routeExport.body, [
    projectRoot,
    directSnapshot.snapshot_root,
    directSnapshot.manifest_path,
    directSnapshot.replay_manifest_path
  ]);

  const routeVerify = await server.inject({
    method: "POST",
    path: "/snapshot/verify",
    body: {
      project_root: projectRoot,
      manifest_path: routeExport.body.manifest_path
    }
  });
  assert.equal(routeVerify.status, 200, JSON.stringify(routeVerify.body));
  assert.equal(routeVerify.body.ok, true);
  assertNoHostPathEcho(routeVerify.body, [projectRoot, routeExport.body.manifest_path]);

  const routeReplay = await server.inject({
    method: "POST",
    path: "/replay/verify-manifest",
    body: {
      project_root: projectRoot,
      manifest_path: routeExport.body.manifest_path
    }
  });
  assert.equal(routeReplay.status, 200, JSON.stringify(routeReplay.body));
  assert.equal(routeReplay.body.ok, true);
  assertNoHostPathEcho(routeReplay.body, [projectRoot, routeExport.body.manifest_path]);

  const routeRestore = await server.inject({
    method: "POST",
    path: "/snapshot/restore",
    body: {
      project_root: projectRoot,
      manifest_path: routeExport.body.manifest_path,
      target_root: routeRestoreRoot,
      actor: "goal3-task139-route"
    }
  });
  assert.equal(routeRestore.status, 400, JSON.stringify(routeRestore.body));
  assert.equal(routeRestore.body.code, "SNAPSHOT_PUBLIC_DOWNLOAD_NOT_RESTORABLE");
  assertNoHostPathEcho(routeRestore.body, [projectRoot, routeRestoreRoot]);
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
  rmSync(routeRestoreRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 139 public snapshot export path contract test passed.");
