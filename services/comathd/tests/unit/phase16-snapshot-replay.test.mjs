import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  appendAuditEvent,
  appendEvidenceRecord,
  canonicalJson,
  createComathServer,
  exportSnapshot,
  getClaim,
  importArtifact,
  initProject,
  registerClaim,
  restoreSnapshot,
  runCounterexampleSearch,
  runSagePlaceholder,
  runSympyExact,
  scanForSecrets,
  sha256Text,
  verifySnapshot
} from "../../dist/index.js";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sha256FileSync(path) {
  return {
    sha256: createHash("sha256").update(readFileSync(path)).digest("hex"),
    size_bytes: statSync(path).size
  };
}

function materialForIntegrity(manifest) {
  const { integrity: _integrity, ...rest } = manifest;
  return rest;
}

function recomputeSnapshotManifest(manifest, snapshotRoot) {
  const entries = manifest.entries.map((entry) => {
    const hash = sha256FileSync(join(snapshotRoot, entry.snapshot_path));
    return { ...entry, sha256: hash.sha256, size_bytes: hash.size_bytes };
  });
  const next = {
    ...manifest,
    entries,
    integrity: {
      entries_sha256: sha256Text(canonicalJson(entries)),
      replay_manifest_sha256: sha256Text(canonicalJson(manifest.replay)),
      manifest_sha256: ""
    }
  };
  next.integrity.manifest_sha256 = sha256Text(canonicalJson(materialForIntegrity(next)));
  return next;
}

function assertNoAbsolutePaths(value) {
  const text = JSON.stringify(value);
  assert.equal(/[A-Za-z]:\\\\|[A-Za-z]:\//.test(text), false, "snapshot manifest must not leak Windows absolute paths");
  assert.equal(text.includes("\\\\?\\") || text.includes("\\\\"), false, "snapshot manifest must not leak device/UNC paths");
}

async function createPopulatedProject() {
  const projectRoot = mkdtempSync(join(tmpdir(), "comath-snapshot-"));
  const { project } = initProject({ name: "Snapshot Project", root_path: projectRoot });
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: "For every integer n, n + 0 = n.",
    assumptions: ["n is an integer"],
    domain: "algebra",
    actor: "phase16-test"
  });

  const notePath = join(projectRoot, "safe-note.txt");
  writeFileSync(notePath, "safe artifact\n", "utf8");
  const artifact = await importArtifact({
    projectRoot,
    project_id: project.project_id,
    source_path: notePath,
    kind: "log",
    actor: "phase16-test"
  });
  appendEvidenceRecord(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    kind: "audit",
    summary: "safe note imported for snapshot test",
    artifact_ids: [artifact.id]
  });

  const exact = await runSympyExact(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    actor: "phase16-test",
    timeout_ms: 5_000,
    input: { expression: "n + 0 - n", variables: ["n"], expected: "0" }
  });
  const search = await runCounterexampleSearch(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    actor: "phase16-test",
    timeout_ms: 5_000,
    seed: 2605,
    input: { expression: "n*n >= 0", variables: ["n"], integer_range: [-2, 2] }
  });
  const sage = await runSagePlaceholder(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    actor: "phase16-test",
    timeout_ms: 5_000,
    input: { task: "placeholder replay integrity" }
  });
  appendAuditEvent(projectRoot, {
    project_id: project.project_id,
    event_type: "phase16.fixture_ready",
    actor: "phase16-test",
    target_id: claim.id,
    payload: { exact_artifact: exact.artifact.id, search_artifact: search.artifact.id, sage_artifact: sage.artifact.id }
  });

  return { projectRoot, project, claim };
}

const { projectRoot, project, claim } = await createPopulatedProject();
const restoreRoot = mkdtempSync(join(tmpdir(), "comath-snapshot-restore-"));
const secretRoot = mkdtempSync(join(tmpdir(), "comath-snapshot-secret-"));

try {
  const secretClean = scanForSecrets(join(projectRoot, ".comath", "project.json"));
  assert.equal(secretClean.status, "clean");
  assert.equal(secretClean.blocks_export, false);

  const first = await exportSnapshot(projectRoot, { project_id: project.project_id, actor: "phase16-test" });
  assert.equal(first.manifest.schema_version, 1);
  assert.equal(first.manifest.project_id, project.project_id);
  assert.equal(first.manifest.can_restore, true);
  assert.equal(first.manifest.secret_scan.status, "clean");
  assert.equal(first.manifest.entries.length > 5, true);
  assert.equal(first.manifest.entries.some((entry) => entry.relative_path === ".comath/project.json"), true);
  assert.equal(first.manifest.entries.some((entry) => entry.relative_path === ".comath/claims/claims.jsonl"), true);
  assert.equal(first.manifest.entries.some((entry) => entry.relative_path === ".comath/evidence/evidence.jsonl"), true);
  assert.equal(first.manifest.entries.some((entry) => entry.relative_path === ".comath/audit/events.jsonl"), true);
  assert.equal(first.manifest.entries.some((entry) => entry.relative_path.includes("/runners/RUN-")), true);
  assert.equal(first.manifest.entries.some((entry) => entry.category === "artifact_blob"), true);
  assert.equal(first.manifest.replay.runs.length >= 2, true);
  assert.equal(first.manifest.replay.runs.some((run) => run.runner_id === "counterexample-search" && run.seed === 2605), true);
  assert.equal(
    first.manifest.replay.runs.some(
      (run) =>
        run.runner_id === "sage-placeholder" &&
        run.status === "unreplayable" &&
        run.unreplayable_reason === "placeholder_runner_has_no_executable_replay"
    ),
    true
  );
  assert.equal(first.manifest.replay.runs.every((run) => run.status === "replayable" || run.unreplayable_reason), true);
  assert.equal(first.manifest.integrity.entries_sha256.length, 64);
  assert.equal(first.manifest.integrity.replay_manifest_sha256.length, 64);
  assert.equal(first.manifest.integrity.manifest_sha256.length, 64);
  assertNoAbsolutePaths(first.manifest);
  assert.equal(JSON.stringify(first.manifest).includes("native_id"), false);
  assert.deepEqual(
    first.manifest.entries.map((entry) => entry.relative_path),
    first.manifest.entries.map((entry) => entry.relative_path).sort()
  );

  const verified = await verifySnapshot(first.manifest_path);
  assert.equal(verified.ok, true);
  assert.equal(verified.vetoes.length, 0);

  const server = createComathServer();
  try {
    const routeExport = await server.inject({
      method: "POST",
      path: "/snapshot/export",
      body: { project_root: projectRoot, project_id: project.project_id, actor: "phase16-route-test" }
    });
    assert.equal(routeExport.status, 200);
    assert.equal(routeExport.body.manifest.project_id, project.project_id);
    assert.equal(routeExport.body.manifest.can_restore, true);

    const routeVerify = await server.inject({
      method: "POST",
      path: "/snapshot/verify",
      body: { manifest_path: routeExport.body.manifest_path }
    });
    assert.equal(routeVerify.status, 200);
    assert.equal(routeVerify.body.ok, true);
    assert.equal(routeVerify.body.vetoes.length, 0);

    const routeReplay = await server.inject({
      method: "POST",
      path: "/replay/verify-manifest",
      body: { manifest_path: routeExport.body.manifest_path }
    });
    assert.equal(routeReplay.status, 200);
    assert.equal(routeReplay.body.ok, true);
    assert.equal(routeReplay.body.replay.runs.length >= 2, true);

    const routeRestoreRoot = mkdtempSync(join(tmpdir(), "comath-snapshot-route-restore-"));
    try {
      const routeRestore = await server.inject({
        method: "POST",
        path: "/snapshot/restore",
        body: { manifest_path: routeExport.body.manifest_path, target_root: routeRestoreRoot, actor: "phase16-route-test" }
      });
      assert.equal(routeRestore.status, 200);
      assert.equal(routeRestore.body.restored_entries, routeExport.body.manifest.entries.length);
      assert.equal(existsSync(join(routeRestoreRoot, ".comath", "project.json")), true);
    } finally {
      rmSync(routeRestoreRoot, { recursive: true, force: true });
    }
  } finally {
    await server.close();
  }

  const manifestBeforeRestore = readFileSync(first.manifest_path, "utf8");
  const restored = await restoreSnapshot(first.manifest_path, restoreRoot, { actor: "phase16-test" });
  assert.equal(restored.restored_entries, first.manifest.entries.length);
  assert.equal(readFileSync(first.manifest_path, "utf8"), manifestBeforeRestore, "restore must not mutate source snapshot");
  assert.equal(existsSync(join(restoreRoot, ".comath", "project.json")), true);
  assert.equal(getClaim(restoreRoot, project.project_id, claim.id)?.statement, claim.statement);

  const tamperedHash = await exportSnapshot(projectRoot, { project_id: project.project_id, actor: "phase16-test" });
  const tamperedHashManifest = readJson(tamperedHash.manifest_path);
  tamperedHashManifest.entries[0].sha256 = "0".repeat(64);
  writeJson(tamperedHash.manifest_path, tamperedHashManifest);
  const tamperedHashCheck = await verifySnapshot(tamperedHash.manifest_path);
  assert.equal(tamperedHashCheck.ok, false);
  assert.equal(tamperedHashCheck.vetoes.includes("manifest_integrity_hash_mismatch"), true);
  assert.equal(tamperedHashCheck.vetoes.includes("entry_hash_mismatch"), true);

  const missingArtifact = await exportSnapshot(projectRoot, { project_id: project.project_id, actor: "phase16-test" });
  const missingEntry = missingArtifact.manifest.entries.find((entry) => entry.category === "artifact_blob");
  assert.ok(missingEntry);
  unlinkSync(join(missingArtifact.snapshot_root, missingEntry.snapshot_path));
  const missingCheck = await verifySnapshot(missingArtifact.manifest_path);
  assert.equal(missingCheck.ok, false);
  assert.equal(missingCheck.vetoes.includes("snapshot_entry_missing"), true);

  const traversal = await exportSnapshot(projectRoot, { project_id: project.project_id, actor: "phase16-test" });
  const traversalManifest = readJson(traversal.manifest_path);
  traversalManifest.entries[0].snapshot_path = "../escape.txt";
  writeJson(traversal.manifest_path, traversalManifest);
  const traversalCheck = await verifySnapshot(traversal.manifest_path);
  assert.equal(traversalCheck.ok, false);
  assert.equal(traversalCheck.vetoes.includes("snapshot_path_traversal"), true);

  const staleReplay = await exportSnapshot(projectRoot, { project_id: project.project_id, actor: "phase16-test" });
  const runnerEntry = staleReplay.manifest.entries.find((entry) => entry.relative_path.includes("/runners/RUN-"));
  assert.ok(runnerEntry);
  const runnerReportPath = join(staleReplay.snapshot_root, runnerEntry.snapshot_path);
  const runnerReport = readJson(runnerReportPath);
  runnerReport.result.result_sha256 = "1".repeat(64);
  writeJson(runnerReportPath, runnerReport);
  const staleReplayCheck = await verifySnapshot(staleReplay.manifest_path);
  assert.equal(staleReplayCheck.ok, false);
  assert.equal(staleReplayCheck.vetoes.includes("stale_runner_output"), true);

  const hostPathLeak = await exportSnapshot(projectRoot, { project_id: project.project_id, actor: "phase16-test" });
  const hostPathManifest = readJson(hostPathLeak.manifest_path);
  const hostPathRunnerEntry = hostPathManifest.entries.find((entry) => entry.relative_path.includes("/runners/RUN-"));
  assert.ok(hostPathRunnerEntry);
  const hostPathRunnerReportPath = join(hostPathLeak.snapshot_root, hostPathRunnerEntry.snapshot_path);
  const hostPathRunnerReport = readJson(hostPathRunnerReportPath);
  hostPathRunnerReport.result.stderr = "Traceback from D:\\MATH _Studio\\comath-pi-lab\\python\\exact_compute.py";
  hostPathRunnerReport.result.metadata.replay_argv = ["python", "D:\\MATH _Studio\\comath-pi-lab\\python\\exact_compute.py"];
  writeJson(hostPathRunnerReportPath, hostPathRunnerReport);
  writeJson(hostPathLeak.manifest_path, recomputeSnapshotManifest(hostPathManifest, hostPathLeak.snapshot_root));
  const hostPathLeakCheck = await verifySnapshot(hostPathLeak.manifest_path);
  assert.equal(hostPathLeakCheck.ok, false);
  assert.equal(hostPathLeakCheck.vetoes.includes("runner_metadata_host_path_leak"), true);

  const replayRunsTamper = await exportSnapshot(projectRoot, { project_id: project.project_id, actor: "phase16-test" });
  const replayRunsManifest = readJson(replayRunsTamper.manifest_path);
  replayRunsManifest.replay.runs[0].status = "unreplayable";
  replayRunsManifest.integrity.entries_sha256 = sha256Text(canonicalJson(replayRunsManifest.entries));
  replayRunsManifest.integrity.replay_manifest_sha256 = sha256Text(canonicalJson(replayRunsManifest.replay));
  replayRunsManifest.integrity.manifest_sha256 = sha256Text(canonicalJson(materialForIntegrity(replayRunsManifest)));
  writeJson(replayRunsTamper.manifest_path, replayRunsManifest);
  writeJson(join(replayRunsTamper.snapshot_root, "replay_manifest.json"), replayRunsManifest.replay);
  const replayRunsCheck = await verifySnapshot(replayRunsTamper.manifest_path);
  assert.equal(replayRunsCheck.ok, false);
  assert.equal(replayRunsCheck.vetoes.includes("replay_runs_hash_mismatch"), true);

  const linkedRoot = mkdtempSync(join(tmpdir(), "comath-snapshot-linked-"));
  const { project: linkedProject } = initProject({ name: "Linked Snapshot Project", root_path: linkedRoot });
  const outsideRuntime = join(linkedRoot, "outside-runtime");
  mkdirSync(outsideRuntime, { recursive: true });
  writeFileSync(join(outsideRuntime, "external.txt"), "outside .comath but inside project\n", "utf8");
  const linkPath = join(linkedRoot, ".comath", "evidence", "linked-outside");
  let linkCreated = false;
  try {
    symlinkSync(outsideRuntime, linkPath, "junction");
    linkCreated = true;
  } catch {
    linkCreated = false;
  }
  if (linkCreated) {
    await assert.rejects(
      () => exportSnapshot(linkedRoot, { project_id: linkedProject.project_id, actor: "phase16-test" }),
      /snapshot source contains unsafe link/
    );
  }
  rmSync(linkedRoot, { recursive: true, force: true });

  const { project: secretProject } = initProject({ name: "Secret Snapshot Project", root_path: secretRoot });
  const secretPath = join(secretRoot, ".comath", "evidence", "secret.env");
  mkdirSync(dirname(secretPath), { recursive: true });
  writeFileSync(secretPath, "SECRET=this-is-a-placeholder-not-a-real-credential\n", "utf8");
  const secretScan = scanForSecrets(secretPath);
  assert.equal(secretScan.status, "blocked");
  assert.equal(secretScan.blocks_export, true);
  await assert.rejects(
    () => exportSnapshot(secretRoot, { project_id: secretProject.project_id, actor: "phase16-test" }),
    /secret scan blocked snapshot export/
  );
  const secretServer = createComathServer();
  try {
    const secretRouteExport = await secretServer.inject({
      method: "POST",
      path: "/snapshot/export",
      body: { project_root: secretRoot, project_id: secretProject.project_id, actor: "phase16-route-test" }
    });
    assert.equal(secretRouteExport.status, 400);
    assert.equal(secretRouteExport.body.code, "SNAPSHOT_SECRET_SCAN_BLOCKED");
  } finally {
    await secretServer.close();
  }
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
  rmSync(restoreRoot, { recursive: true, force: true });
  rmSync(secretRoot, { recursive: true, force: true });
}

console.log("Phase 16 snapshot/replay tests passed.");
