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

function runnerResultHash(result) {
  return sha256Text(
    canonicalJson({
      ok: result.ok === true,
      runner_id: result.runner_id,
      runner_version: result.runner_version,
      exactness: typeof result.exactness === "string" ? result.exactness : "not_applicable",
      supports_status: typeof result.supports_status === "string" ? result.supports_status : "none",
      result: result.result ?? null,
      vetoes: Array.isArray(result.vetoes) ? result.vetoes.filter((item) => typeof item === "string") : [],
      warnings: Array.isArray(result.warnings) ? result.warnings.filter((item) => typeof item === "string") : []
    })
  );
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

function findRunnerEntry(snapshot, runnerId) {
  const manifest = readJson(snapshot.manifest_path);
  const entry = manifest.entries.find((candidate) => {
    if (!candidate.relative_path.includes("/runners/RUN-")) {
      return false;
    }
    const report = readJson(join(snapshot.snapshot_root, candidate.snapshot_path));
    return report.runner_id === runnerId;
  });
  assert.ok(entry);
  return { manifest, entry, report_path: join(snapshot.snapshot_root, entry.snapshot_path) };
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

  return { projectRoot, project, claim, sageReportPath: sage.report_path };
}

const privilegedReplayTerms =
  /completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence/i;

const { projectRoot, project, claim, sageReportPath } = await createPopulatedProject();
const restoreRoot = mkdtempSync(join(tmpdir(), "comath-snapshot-restore-"));
const secretRoot = mkdtempSync(join(tmpdir(), "comath-snapshot-secret-"));

try {
  const poisonedRunnerReport = readJson(sageReportPath);
  poisonedRunnerReport.result.exactness = "lean_kernel_clean_replay";
  poisonedRunnerReport.result.supports_status = "formally_checked";
  poisonedRunnerReport.result.result_sha256 = runnerResultHash(poisonedRunnerReport.result);
  writeJson(sageReportPath, poisonedRunnerReport);

  const secretClean = scanForSecrets(join(projectRoot, ".comath", "project.json"));
  assert.equal(secretClean.status, "clean");
  assert.equal(secretClean.blocks_export, false);

  const first = await exportSnapshot(projectRoot, { project_id: project.project_id, actor: "phase16-test" });
  assert.equal(first.manifest.schema_version, 1);
  assert.equal(first.manifest.project_id, project.project_id);
  assert.equal(first.manifest.snapshot_kind, "public_download");
  assert.equal(first.manifest.can_restore, false);
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
  assert.doesNotMatch(
    JSON.stringify(first.manifest.replay),
    privilegedReplayTerms,
    "snapshot manifest replay read-model must not expose proof-authority vocabulary from runner reports"
  );
  assert.doesNotMatch(
    JSON.stringify(readJson(first.replay_manifest_path)),
    privilegedReplayTerms,
    "replay_manifest.json must not expose proof-authority vocabulary from runner reports"
  );
  assertNoAbsolutePaths(first.manifest);
  assert.equal(JSON.stringify(first.manifest).includes("native_id"), false);
  assert.deepEqual(
    first.manifest.entries.map((entry) => entry.relative_path),
    first.manifest.entries.map((entry) => entry.relative_path).sort()
  );

  const verified = await verifySnapshot(first.manifest_path);
  assert.equal(verified.ok, true);
  assert.equal(verified.vetoes.length, 0);
  assert.doesNotMatch(
    JSON.stringify(verified.manifest.replay),
    privilegedReplayTerms,
    "snapshot verification read-model must preserve sanitized replay vocabulary"
  );

  const server = createComathServer();
  try {
    const routeExport = await server.inject({
      method: "POST",
      path: "/snapshot/export",
      body: { project_root: projectRoot, project_id: project.project_id, actor: "phase16-route-test" }
    });
    assert.equal(routeExport.status, 200);
    assert.equal(routeExport.body.manifest.project_id, project.project_id);
    assert.equal(routeExport.body.manifest.snapshot_kind, "public_download");
    assert.equal(routeExport.body.manifest.can_restore, false);
    assert.doesNotMatch(
      JSON.stringify(routeExport.body.manifest.replay),
      privilegedReplayTerms,
      "snapshot export route must not expose proof-authority vocabulary from runner reports"
    );

    const routeVerify = await server.inject({
      method: "POST",
      path: "/snapshot/verify",
      body: { manifest_path: routeExport.body.manifest_path }
    });
    assert.equal(routeVerify.status, 200);
    assert.equal(routeVerify.body.ok, true);
    assert.equal(routeVerify.body.vetoes.length, 0);
    assert.doesNotMatch(
      JSON.stringify(routeVerify.body.manifest.replay),
      privilegedReplayTerms,
      "snapshot verify route must not expose proof-authority vocabulary from runner reports"
    );

    const routeReplay = await server.inject({
      method: "POST",
      path: "/replay/verify-manifest",
      body: { manifest_path: routeExport.body.manifest_path }
    });
    assert.equal(routeReplay.status, 200);
    assert.equal(routeReplay.body.ok, true);
    assert.equal(routeReplay.body.replay.runs.length >= 2, true);
    assert.doesNotMatch(
      JSON.stringify(routeReplay.body.replay),
      privilegedReplayTerms,
      "replay verify route must not expose proof-authority vocabulary from runner reports"
    );
    assert.equal(routeReplay.body.runner_reexecution.some((run) => run.runner_id === "sympy-exact" && run.ok), true);
    assert.equal(
      routeReplay.body.runner_reexecution.some((run) => run.runner_id === "counterexample-search" && run.ok),
      true
    );
    assert.equal(
      routeReplay.body.runner_reexecution.some(
        (run) =>
          run.runner_id === "sage-placeholder" &&
          run.skipped === true &&
          run.reason === "placeholder_runner_has_no_executable_replay"
      ),
      true
    );

    const routeRestoreRoot = mkdtempSync(join(tmpdir(), "comath-snapshot-route-restore-"));
    try {
      const routeRestore = await server.inject({
        method: "POST",
        path: "/snapshot/restore",
        body: { manifest_path: routeExport.body.manifest_path, target_root: routeRestoreRoot, actor: "phase16-route-test" }
      });
      assert.equal(routeRestore.status, 400);
      assert.equal(routeRestore.body.code, "SNAPSHOT_PUBLIC_DOWNLOAD_NOT_RESTORABLE");
    } finally {
      rmSync(routeRestoreRoot, { recursive: true, force: true });
    }
  } finally {
    await server.close();
  }

  await assert.rejects(
    () => restoreSnapshot(first.manifest_path, restoreRoot, { actor: "phase16-test" }),
    /public snapshot downloads cannot be restored/
  );
  const internalRestoreSnapshot = await exportSnapshot(projectRoot, {
    project_id: project.project_id,
    actor: "phase16-test",
    audience: "internal_restore"
  });
  assert.equal(internalRestoreSnapshot.manifest.snapshot_kind, "internal_restore");
  assert.equal(internalRestoreSnapshot.manifest.can_restore, true);
  const manifestBeforeRestore = readFileSync(internalRestoreSnapshot.manifest_path, "utf8");
  const restored = await restoreSnapshot(internalRestoreSnapshot.manifest_path, restoreRoot, { actor: "phase16-test" });
  assert.equal(restored.restored_entries, internalRestoreSnapshot.manifest.entries.length);
  assert.equal(readFileSync(internalRestoreSnapshot.manifest_path, "utf8"), manifestBeforeRestore, "restore must not mutate source snapshot");
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

  const replayBindingDrift = await exportSnapshot(projectRoot, { project_id: project.project_id, actor: "phase16-test" });
  const {
    manifest: replayBindingDriftManifest,
    entry: replayBindingDriftEntry
  } = findRunnerEntry(replayBindingDrift, "sympy-exact");
  const replayBindingRun = replayBindingDriftManifest.replay.runs.find(
    (run) => run.report_relative_path === replayBindingDriftEntry.relative_path
  );
  assert.ok(replayBindingRun);
  replayBindingRun.input_sha256 = "0".repeat(64);
  replayBindingDriftManifest.replay.integrity.runs_sha256 = sha256Text(
    canonicalJson(replayBindingDriftManifest.replay.runs)
  );
  replayBindingDriftManifest.integrity.replay_manifest_sha256 = sha256Text(
    canonicalJson(replayBindingDriftManifest.replay)
  );
  replayBindingDriftManifest.integrity.manifest_sha256 = sha256Text(
    canonicalJson(materialForIntegrity(replayBindingDriftManifest))
  );
  writeJson(replayBindingDrift.manifest_path, replayBindingDriftManifest);
  writeJson(join(replayBindingDrift.snapshot_root, "replay_manifest.json"), replayBindingDriftManifest.replay);
  const replayBindingDriftCheck = await server.inject({
    method: "POST",
    path: "/replay/verify-manifest",
    body: { manifest_path: replayBindingDrift.manifest_path }
  });
  assert.equal(replayBindingDriftCheck.status, 200);
  assert.equal(replayBindingDriftCheck.body.ok, false);
  assert.equal(replayBindingDriftCheck.body.vetoes.includes("replay_run_report_mismatch"), true);
  assert.equal(replayBindingDriftCheck.body.runner_reexecution.length, 0);

  const invalidManifestNoExec = await exportSnapshot(projectRoot, { project_id: project.project_id, actor: "phase16-test" });
  const { report_path: invalidManifestNoExecReportPath } = findRunnerEntry(invalidManifestNoExec, "sympy-exact");
  const invalidManifestNoExecReport = readJson(invalidManifestNoExecReportPath);
  invalidManifestNoExecReport.result.metadata.script_sha256 = "0".repeat(64);
  writeJson(invalidManifestNoExecReportPath, invalidManifestNoExecReport);
  const invalidManifestNoExecReplay = await server.inject({
    method: "POST",
    path: "/replay/verify-manifest",
    body: { manifest_path: invalidManifestNoExec.manifest_path }
  });
  assert.equal(invalidManifestNoExecReplay.status, 200);
  assert.equal(invalidManifestNoExecReplay.body.ok, false);
  assert.equal(invalidManifestNoExecReplay.body.vetoes.includes("entry_hash_mismatch"), true);
  assert.equal(invalidManifestNoExecReplay.body.vetoes.includes("runner_reexecution_script_hash_mismatch"), false);
  assert.equal(invalidManifestNoExecReplay.body.runner_reexecution.length, 0);

  const scriptDrift = await exportSnapshot(projectRoot, { project_id: project.project_id, actor: "phase16-test" });
  const {
    manifest: scriptDriftManifest,
    entry: scriptDriftEntry,
    report_path: scriptDriftReportPath
  } = findRunnerEntry(scriptDrift, "sympy-exact");
  const scriptDriftReport = readJson(scriptDriftReportPath);
  scriptDriftReport.result.metadata.script_sha256 = "0".repeat(64);
  scriptDriftReport.result.metadata.dependency_lock.script_sha256 = "0".repeat(64);
  const scriptDriftRun = scriptDriftManifest.replay.runs.find(
    (run) => run.report_relative_path === scriptDriftEntry.relative_path
  );
  assert.ok(scriptDriftRun);
  scriptDriftRun.script_sha256 = "0".repeat(64);
  scriptDriftRun.dependency_lock.script_sha256 = "0".repeat(64);
  scriptDriftManifest.replay.integrity.runs_sha256 = sha256Text(canonicalJson(scriptDriftManifest.replay.runs));
  writeJson(scriptDriftReportPath, scriptDriftReport);
  writeJson(scriptDrift.manifest_path, recomputeSnapshotManifest(scriptDriftManifest, scriptDrift.snapshot_root));
  writeJson(join(scriptDrift.snapshot_root, "replay_manifest.json"), readJson(scriptDrift.manifest_path).replay);
  const scriptDriftReplay = await server.inject({
    method: "POST",
    path: "/replay/verify-manifest",
    body: { manifest_path: scriptDrift.manifest_path }
  });
  assert.equal(scriptDriftReplay.status, 200);
  assert.equal(scriptDriftReplay.body.ok, false);
  assert.equal(scriptDriftReplay.body.vetoes.includes("runner_reexecution_script_hash_mismatch"), true);
  assert.equal(
    scriptDriftReplay.body.runner_reexecution.some(
      (run) => run.runner_id === "sympy-exact" && run.vetoes.includes("runner_reexecution_script_hash_mismatch")
    ),
    true
  );

  const inputDrift = await exportSnapshot(projectRoot, { project_id: project.project_id, actor: "phase16-test" });
  const {
    manifest: inputDriftManifest,
    report_path: inputDriftReportPath
  } = findRunnerEntry(inputDrift, "sympy-exact");
  const inputDriftReport = readJson(inputDriftReportPath);
  inputDriftReport.result.metadata.replay_input_json = inputDriftReport.result.metadata.replay_input_json.replace(
    '"expected":"0"',
    '"expected":"1"'
  );
  writeJson(inputDriftReportPath, inputDriftReport);
  writeJson(inputDrift.manifest_path, recomputeSnapshotManifest(inputDriftManifest, inputDrift.snapshot_root));
  const inputDriftReplay = await server.inject({
    method: "POST",
    path: "/replay/verify-manifest",
    body: { manifest_path: inputDrift.manifest_path }
  });
  assert.equal(inputDriftReplay.status, 200);
  assert.equal(inputDriftReplay.body.ok, false);
  assert.equal(inputDriftReplay.body.vetoes.includes("runner_reexecution_input_hash_mismatch"), true);

  const timeoutDrift = await exportSnapshot(projectRoot, { project_id: project.project_id, actor: "phase16-test" });
  const {
    manifest: timeoutDriftManifest,
    entry: timeoutDriftEntry,
    report_path: timeoutDriftReportPath
  } = findRunnerEntry(timeoutDrift, "sympy-exact");
  const timeoutDriftReport = readJson(timeoutDriftReportPath);
  timeoutDriftReport.result.metadata.timeout_ms = 3_600_000;
  const timeoutDriftRun = timeoutDriftManifest.replay.runs.find(
    (run) => run.report_relative_path === timeoutDriftEntry.relative_path
  );
  assert.ok(timeoutDriftRun);
  timeoutDriftRun.timeout_ms = timeoutDriftReport.result.metadata.timeout_ms;
  timeoutDriftManifest.replay.integrity.runs_sha256 = sha256Text(canonicalJson(timeoutDriftManifest.replay.runs));
  writeJson(timeoutDriftReportPath, timeoutDriftReport);
  writeJson(timeoutDrift.manifest_path, recomputeSnapshotManifest(timeoutDriftManifest, timeoutDrift.snapshot_root));
  writeJson(join(timeoutDrift.snapshot_root, "replay_manifest.json"), readJson(timeoutDrift.manifest_path).replay);
  const timeoutDriftReplay = await server.inject({
    method: "POST",
    path: "/replay/verify-manifest",
    body: { manifest_path: timeoutDrift.manifest_path }
  });
  assert.equal(timeoutDriftReplay.status, 200);
  assert.equal(timeoutDriftReplay.body.ok, false);
  assert.equal(timeoutDriftReplay.body.vetoes.includes("runner_reexecution_timeout_untrusted"), true);
  assert.equal(
    timeoutDriftReplay.body.runner_reexecution.some(
      (run) => run.runner_id === "sympy-exact" && run.vetoes.includes("runner_reexecution_timeout_untrusted")
    ),
    true
  );

  const stdoutMetadataDrift = await exportSnapshot(projectRoot, { project_id: project.project_id, actor: "phase16-test" });
  const {
    manifest: stdoutMetadataDriftManifest,
    entry: stdoutMetadataDriftEntry,
    report_path: stdoutMetadataDriftReportPath
  } = findRunnerEntry(stdoutMetadataDrift, "sympy-exact");
  const stdoutMetadataDriftReport = readJson(stdoutMetadataDriftReportPath);
  stdoutMetadataDriftReport.result.metadata.stdout_sha256 = "0".repeat(64);
  const stdoutMetadataDriftRun = stdoutMetadataDriftManifest.replay.runs.find(
    (run) => run.report_relative_path === stdoutMetadataDriftEntry.relative_path
  );
  assert.ok(stdoutMetadataDriftRun);
  stdoutMetadataDriftRun.stdout_sha256 = stdoutMetadataDriftReport.result.metadata.stdout_sha256;
  stdoutMetadataDriftManifest.replay.integrity.runs_sha256 = sha256Text(
    canonicalJson(stdoutMetadataDriftManifest.replay.runs)
  );
  writeJson(stdoutMetadataDriftReportPath, stdoutMetadataDriftReport);
  writeJson(
    stdoutMetadataDrift.manifest_path,
    recomputeSnapshotManifest(stdoutMetadataDriftManifest, stdoutMetadataDrift.snapshot_root)
  );
  writeJson(join(stdoutMetadataDrift.snapshot_root, "replay_manifest.json"), readJson(stdoutMetadataDrift.manifest_path).replay);
  const stdoutMetadataDriftReplay = await server.inject({
    method: "POST",
    path: "/replay/verify-manifest",
    body: { manifest_path: stdoutMetadataDrift.manifest_path }
  });
  assert.equal(stdoutMetadataDriftReplay.status, 200);
  assert.equal(stdoutMetadataDriftReplay.body.ok, false);
  assert.equal(stdoutMetadataDriftReplay.body.vetoes.includes("runner_stdout_hash_mismatch"), true);
  assert.equal(stdoutMetadataDriftReplay.body.runner_reexecution.length, 0);

  const untrustedArgv = await exportSnapshot(projectRoot, { project_id: project.project_id, actor: "phase16-test" });
  const {
    manifest: untrustedArgvManifest,
    entry: untrustedArgvEntry,
    report_path: untrustedArgvReportPath
  } = findRunnerEntry(untrustedArgv, "sympy-exact");
  const untrustedArgvReport = readJson(untrustedArgvReportPath);
  untrustedArgvReport.result.metadata.replay_argv = ["python", "../evil.py", "--input-json", "<canonical-json>"];
  const untrustedArgvRun = untrustedArgvManifest.replay.runs.find(
    (run) => run.report_relative_path === untrustedArgvEntry.relative_path
  );
  assert.ok(untrustedArgvRun);
  untrustedArgvRun.replay_argv = untrustedArgvReport.result.metadata.replay_argv;
  untrustedArgvManifest.replay.integrity.runs_sha256 = sha256Text(canonicalJson(untrustedArgvManifest.replay.runs));
  writeJson(untrustedArgvReportPath, untrustedArgvReport);
  writeJson(untrustedArgv.manifest_path, recomputeSnapshotManifest(untrustedArgvManifest, untrustedArgv.snapshot_root));
  writeJson(join(untrustedArgv.snapshot_root, "replay_manifest.json"), readJson(untrustedArgv.manifest_path).replay);
  const untrustedArgvReplay = await server.inject({
    method: "POST",
    path: "/replay/verify-manifest",
    body: { manifest_path: untrustedArgv.manifest_path }
  });
  assert.equal(untrustedArgvReplay.status, 200);
  assert.equal(untrustedArgvReplay.body.ok, false);
  assert.equal(untrustedArgvReplay.body.vetoes.includes("runner_reexecution_argv_untrusted"), true);

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
  writeFileSync(secretPath, "OPENAI_API_KEY=sk-proj-abcdefghijklmnopqrstuvwxyz123456\n", "utf8");
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
