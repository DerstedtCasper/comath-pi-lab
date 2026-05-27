import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import {
  createReplayManifest,
  initProject,
  registerClaim,
  runSympyExact,
  verifyRunnerReportReplayIntegrity
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-runner-provenance-"));

try {
  const { project } = initProject({ name: "Runner Replay Provenance", root_path: projectRoot });
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: "For every integer n, n + 0 = n.",
    assumptions: ["n is an integer"],
    domain: "algebra",
    actor: "phase36-test"
  });

  const exact = await runSympyExact(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    actor: "phase36-test",
    timeout_ms: 5_000,
    input: { expression: "n + 0 - n", variables: ["n"], expected: "0" }
  });

  const report = JSON.parse(readFileSync(exact.report_path, "utf8"));
  const metadata = report.result.metadata;
  assert.equal(metadata.sandbox_policy.shell, false);
  assert.equal(metadata.sandbox_policy.network, "denied_by_contract");
  assert.equal(metadata.sandbox_policy.cwd_policy, "project_root");
  assert.deepEqual(metadata.sandbox_policy.allowed_executables, ["python"]);
  assert.equal(metadata.dependency_lock.runner_id, "sympy-exact");
  assert.equal(metadata.dependency_lock.runner_version, report.result.runner_version);
  assert.equal(metadata.dependency_lock.script_sha256, metadata.script_sha256);
  assert.equal(metadata.dependency_lock.python_packages.sympy, "present");

  const okIntegrity = verifyRunnerReportReplayIntegrity(report);
  assert.equal(okIntegrity.ok, true);

  const missingSandbox = JSON.parse(JSON.stringify(report));
  delete missingSandbox.result.metadata.sandbox_policy;
  const missingSandboxIntegrity = verifyRunnerReportReplayIntegrity(missingSandbox);
  assert.equal(missingSandboxIntegrity.ok, false);
  assert.equal(missingSandboxIntegrity.vetoes.includes("runner_sandbox_policy_missing"), true);

  const missingLock = JSON.parse(JSON.stringify(report));
  delete missingLock.result.metadata.dependency_lock;
  const missingLockIntegrity = verifyRunnerReportReplayIntegrity(missingLock);
  assert.equal(missingLockIntegrity.ok, false);
  assert.equal(missingLockIntegrity.vetoes.includes("runner_dependency_lock_missing"), true);

  const reportRel = relative(projectRoot, exact.report_path).replace(/\\/g, "/");
  const manifest = createReplayManifest(projectRoot, project.project_id, [reportRel]);
  assert.equal(manifest.runs.length, 1);
  assert.deepEqual(manifest.runs[0].sandbox_policy, metadata.sandbox_policy);
  assert.deepEqual(manifest.runs[0].dependency_lock, metadata.dependency_lock);
  assert.equal(existsSync(exact.report_path), true);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 36 runner replay provenance tests passed.");
