import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildAgentAdapterPackageLaunch,
  createComathServer,
  executeAgentAdapterPackage,
  getAgentRun,
  initProject,
  listAgentAdapterPackages,
  probeAgentAdapterHealth,
  readAuditEvents,
  spawnWorkstream
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-phase43-adapter-package-"));

try {
  assert.equal(typeof listAgentAdapterPackages, "function", "Phase 43 must export listAgentAdapterPackages");
  assert.equal(typeof buildAgentAdapterPackageLaunch, "function", "Phase 43 must export buildAgentAdapterPackageLaunch");
  assert.equal(typeof executeAgentAdapterPackage, "function", "Phase 43 must export executeAgentAdapterPackage");

  const packages = listAgentAdapterPackages();
  const codexPackage = packages.find((entry) => entry.id === "codex-cli");
  assert.ok(codexPackage, "codex-cli adapter package is registered");
  assert.equal(codexPackage.kind, "codex_cli");
  assert.equal(codexPackage.proof_authority, "none");
  assert.equal(codexPackage.program, process.execPath);
  assert.equal(existsSync(codexPackage.adapter_script), true, "bundled adapter script must exist");
  assert.equal(codexPackage.default_rpm, 4);
  assert.deepEqual(codexPackage.supported_profiles.includes("proof-route"), true);

  const init = initProject({ name: "Phase 43 Adapter Package Project", root_path: projectRoot });
  const projectId = init.project.project_id;
  const workstream = spawnWorkstream(projectRoot, {
    project_id: projectId,
    kind: "proof_route",
    goal: "Run packaged Codex adapter.",
    created_by: "phase43-test"
  });
  const contextPath = `.comath/workstreams/${workstream.workstream_id}/spec.yaml`;

  const health = probeAgentAdapterHealth(projectRoot, {
    project_id: projectId,
    profile_id: "proof-route",
    program: codexPackage.program,
    adapter_args: [codexPackage.adapter_script, "--adapter-package", "codex-cli"],
    actor: "phase43-test"
  });
  assert.equal(health.ok, true);
  assert.equal(health.version, "phase44-codex-adapter-v2");
  assert.equal(health.capabilities.includes("agent-report"), true);

  const prepared = buildAgentAdapterPackageLaunch(projectRoot, {
    project_id: projectId,
    run_id: "ARUN-9999",
    profile_id: "proof-route",
    adapter_id: "codex-cli",
    goal: "Produce a proof route report.",
    context_path: contextPath,
    actor: "phase43-test"
  });
  assert.equal(prepared.package.id, "codex-cli");
  assert.equal(prepared.launch.launch_input.command.program, process.execPath);
  assert.deepEqual(prepared.launch.launch_input.command.args.slice(0, 3), [
    codexPackage.adapter_script,
    "--adapter-package",
    "codex-cli"
  ]);
  assert.equal(prepared.launch.launch_input.command.args.includes("--profile"), true);
  assert.equal(prepared.launch.launch_input.command.env.COMATH_ADAPTER_PACKAGE_ID, "codex-cli");
  assert.equal(prepared.launch.launch_input.command.env.COMATH_PROOF_AUTHORITY, "none");
  assert.equal(prepared.launch.scheduler_options.rpm, 4);

  const execution = await executeAgentAdapterPackage(projectRoot, {
    project_id: projectId,
    campaign_id: "CAM-0043",
    workstream_id: workstream.workstream_id,
    profile_id: "proof-route",
    adapter_id: "codex-cli",
    goal: "Produce a packaged proof route report.",
    context_path: contextPath,
    actor: "phase43-test"
  });
  assert.equal(execution.package.id, "codex-cli");
  assert.equal(execution.result.status, "succeeded");
  const run = getAgentRun(projectRoot, projectId, execution.run.id);
  assert.equal(run.status, "succeeded");
  const report = readFileSync(join(projectRoot, run.report_path), "utf8");
  assert.match(report, /proof_authority: none/);
  assert.match(report, /adapter_package: codex-cli/);

  const server = createComathServer();
  const listResponse = await server.inject({ method: "GET", path: "/agent/adapter/package/list" });
  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.body.packages.some((entry) => entry.id === "codex-cli"), true);

  const prepareResponse = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/prepare-launch",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      run_id: "ARUN-9998",
      profile_id: "proof-route",
      adapter_id: "codex-cli",
      goal: "Prepare packaged launch.",
      context_path: contextPath,
      actor: "phase43-route-test"
    }
  });
  assert.equal(prepareResponse.status, 200);
  assert.equal(prepareResponse.body.prepared.package.id, "codex-cli");

  const executeResponse = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/execute",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      campaign_id: "CAM-0044",
      workstream_id: workstream.workstream_id,
      profile_id: "reviewer",
      adapter_id: "codex-cli",
      goal: "Execute packaged reviewer adapter.",
      context_path: contextPath,
      actor: "phase43-route-test"
    }
  });
  assert.equal(executeResponse.status, 200, JSON.stringify(executeResponse.body));
  assert.equal(executeResponse.body.execution.package.id, "codex-cli");
  assert.equal(executeResponse.body.execution.result.status, "succeeded");

  const rejectedResponse = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/prepare-launch",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      run_id: "ARUN-9997",
      profile_id: "proof-route",
      adapter_id: "unknown-adapter",
      goal: "Rejected package.",
      context_path: contextPath,
      actor: "phase43-route-test"
    }
  });
  assert.equal(rejectedResponse.status, 400);

  const events = readAuditEvents(projectRoot);
  assert.equal(events.some((event) => event.event_type === "agent_adapter.package_launch_prepared"), true);
  assert.equal(events.some((event) => event.event_type === "agent_adapter.package_executed"), true);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 43 Agent adapter package tests passed.");
