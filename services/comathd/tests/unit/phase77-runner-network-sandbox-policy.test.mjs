import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import {
  createReplayManifest,
  initProject,
  registerClaim,
  runSympyExact,
  verifyRunnerReportReexecution,
  verifyRunnerReportReplayIntegrity
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-phase77-runner-network-sandbox-"));

try {
  const { project } = initProject({ name: "Phase 77 Runner Network Sandbox", root_path: projectRoot });
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: "For every integer n, n + 0 = n.",
    assumptions: ["n is an integer"],
    domain: "algebra",
    actor: "phase77-test"
  });

  const exact = await runSympyExact(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    actor: "phase77-test",
    timeout_ms: 5_000,
    input: { expression: "n + 0 - n", variables: ["n"], expected: "0" }
  });

  const report = JSON.parse(readFileSync(exact.report_path, "utf8"));
  const policy = report.result.metadata.sandbox_policy;
  assert.equal(policy.network, "denied_by_contract");
  assert.deepEqual(policy.network_denial, {
    mode: "service_process_env",
    env_var: "COMATH_RUNNER_NETWORK",
    env_value: "disabled",
    enforcement: "contractual_process_boundary"
  });
  assert.equal(report.result.metadata.runner_env.COMATH_RUNNER_NETWORK, "disabled");

  const manifest = createReplayManifest(projectRoot, project.project_id, [relative(projectRoot, exact.report_path).replace(/\\/g, "/")]);
  assert.deepEqual(manifest.runs[0].sandbox_policy.network_denial, policy.network_denial);

  const okIntegrity = verifyRunnerReportReplayIntegrity(report);
  assert.equal(okIntegrity.ok, true);

  const missingNetworkDenial = JSON.parse(JSON.stringify(report));
  delete missingNetworkDenial.result.metadata.sandbox_policy.network_denial;
  delete missingNetworkDenial.result.metadata.runner_env;
  const integrity = verifyRunnerReportReplayIntegrity(missingNetworkDenial);
  assert.equal(integrity.ok, false);
  assert.equal(integrity.vetoes.includes("runner_network_denial_policy_missing"), true);

  const reexecution = await verifyRunnerReportReexecution(missingNetworkDenial, { cwd: projectRoot });
  assert.equal(reexecution.ok, false);
  assert.equal(reexecution.vetoes.includes("runner_network_denial_policy_missing"), true);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 77 runner network sandbox policy tests passed.");
