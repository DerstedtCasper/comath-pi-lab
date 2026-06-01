import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  createComathServer,
  exportSnapshot,
  initProject,
  restoreSnapshot,
  spawnWorkstream,
  writeWorkstreamReport
} from "../../dist/index.js";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

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

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task138-snapshot-routes-"));
const directRestoreRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task138-direct-restore-"));
const routeRestoreRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task138-route-restore-"));
const server = createComathServer();

try {
  const { project } = initProject({ name: "Task 138 snapshot routes", root_path: projectRoot });
  const workstream = spawnWorkstream(projectRoot, {
    project_id: project.project_id,
    kind: "proof_route",
    goal: "Internal restore material must remain byte-for-byte while public routes avoid host path echoes.",
    created_by: "goal3-task138"
  });
  writeWorkstreamReport(projectRoot, {
    project_id: project.project_id,
    workstream_id: workstream.workstream_id,
    report_markdown: "Internal restore copy should preserve formal_replay_passed text byte-for-byte.",
    status: "running",
    actor: "goal3-task138"
  });

  const internalSnapshot = await exportSnapshot(projectRoot, {
    project_id: project.project_id,
    actor: "goal3-task138",
    audience: "internal_restore"
  });
  const directRestore = await restoreSnapshot(internalSnapshot.manifest_path, directRestoreRoot, {
    actor: "goal3-task138-direct"
  });
  assert.equal(directRestore.target_root, resolve(directRestoreRoot));
  assert.match(
    readFileSync(join(directRestoreRoot, `.comath/workstreams/${workstream.workstream_id}/report.md`), "utf8"),
    /formal_replay_passed/,
    "direct internal_restore must preserve internal bytes"
  );

  const routeRestore = await server.inject({
    method: "POST",
    path: "/snapshot/restore",
    body: {
      manifest_path: internalSnapshot.manifest_path,
      target_root: routeRestoreRoot,
      actor: "goal3-task138-route"
    }
  });
  assert.equal(routeRestore.status, 200, JSON.stringify(routeRestore.body));
  assert.equal(routeRestore.body.restored_entries, internalSnapshot.manifest.entries.length);
  assert.equal(routeRestore.body.project_id, project.project_id);
  assertNoHostPathEcho(routeRestore.body, [internalSnapshot.manifest_path, internalSnapshot.snapshot_root, routeRestoreRoot]);

  const tampered = await exportSnapshot(projectRoot, { project_id: project.project_id, actor: "goal3-task138" });
  const manifest = readJson(tampered.manifest_path);
  const callerAbsolutePath = join(projectRoot, "caller-supplied-absolute-path.txt");
  manifest.entries[0].relative_path = callerAbsolutePath;
  manifest.entries[0].snapshot_path = callerAbsolutePath;
  manifest.replay.runs.push({
    report_relative_path: callerAbsolutePath,
    runner_id: "goal3-task138-tampered-runner",
    status: "unreplayable",
    unreplayable_reason: callerAbsolutePath,
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch
    },
    replay_argv: [callerAbsolutePath]
  });
  writeJson(tampered.manifest_path, manifest);
  writeJson(join(tampered.snapshot_root, "replay_manifest.json"), manifest.replay);

  const routeVerify = await server.inject({
    method: "POST",
    path: "/snapshot/verify",
    body: { manifest_path: tampered.manifest_path }
  });
  assert.equal(routeVerify.status, 200, JSON.stringify(routeVerify.body));
  assert.equal(routeVerify.body.ok, false);
  assert.equal(routeVerify.body.vetoes.includes("snapshot_path_traversal"), true);
  assertNoHostPathEcho(routeVerify.body, [
    callerAbsolutePath,
    projectRoot,
    tampered.manifest_path,
    tampered.snapshot_root
  ]);

  const routeReplay = await server.inject({
    method: "POST",
    path: "/replay/verify-manifest",
    body: { manifest_path: tampered.manifest_path }
  });
  assert.equal(routeReplay.status, 200, JSON.stringify(routeReplay.body));
  assert.equal(routeReplay.body.ok, false);
  assert.equal(routeReplay.body.vetoes.includes("snapshot_path_traversal"), true);
  assertNoHostPathEcho(routeReplay.body, [
    callerAbsolutePath,
    projectRoot,
    tampered.manifest_path,
    tampered.snapshot_root
  ]);
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
  rmSync(directRestoreRoot, { recursive: true, force: true });
  rmSync(routeRestoreRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 138 snapshot route public contract tests passed.");
