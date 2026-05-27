import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import {
  canonicalJson,
  createComathServer,
  exportSnapshot,
  initProject,
  registerClaim,
  runSympyExact,
  sha256Text
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-phase55-cross-machine-replay-"));

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function materialForIntegrity(manifest) {
  const { integrity: _integrity, ...rest } = manifest;
  return rest;
}

function recomputeSnapshotManifest(manifest) {
  const next = {
    ...manifest,
    integrity: {
      ...manifest.integrity,
      replay_manifest_sha256: sha256Text(canonicalJson(manifest.replay)),
      manifest_sha256: ""
    }
  };
  next.integrity.manifest_sha256 = sha256Text(canonicalJson(materialForIntegrity(next)));
  return next;
}

try {
  const { project } = initProject({ name: "Phase 55 Cross Machine Replay", root_path: projectRoot });
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: "For every integer n, n + 0 = n.",
    assumptions: ["n is an integer"],
    domain: "algebra",
    actor: "phase55-test"
  });

  const run = await runSympyExact(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    actor: "phase55-test",
    timeout_ms: 5_000,
    input: { expression: "n + 0 - n", variables: ["n"], expected: "0" }
  });
  const reportRel = relative(projectRoot, run.report_path).replace(/\\/g, "/");
  const snapshot = await exportSnapshot(projectRoot, { project_id: project.project_id, actor: "phase55-test" });
  const manifest = readJson(snapshot.manifest_path);
  const replayRun = manifest.replay.runs.find((entry) => entry.report_relative_path === reportRel);
  assert.ok(replayRun, "snapshot replay manifest includes the runner report");
  replayRun.environment.platform = "phase55-different-platform";
  manifest.replay.integrity.runs_sha256 = sha256Text(canonicalJson(manifest.replay.runs));
  writeJson(snapshot.manifest_path, recomputeSnapshotManifest(manifest));
  writeJson(join(snapshot.snapshot_root, "replay_manifest.json"), readJson(snapshot.manifest_path).replay);

  const server = createComathServer();
  const response = await server.inject({
    method: "POST",
    path: "/replay/verify-manifest",
    body: { manifest_path: snapshot.manifest_path }
  });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(response.body.ok, false);
  assert.equal(response.body.vetoes.includes("runner_reexecution_environment_mismatch"), true);
  assert.equal(response.body.runner_reexecution.length, 0, "environment mismatch must block re-execution before launch");
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 55 runner cross-machine replay tests passed.");
