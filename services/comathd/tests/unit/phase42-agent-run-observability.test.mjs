import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createComathServer,
  executeProfileAgentRun,
  initProject,
  probeAgentAdapterHealth,
  readAgentRunLogs,
  readAuditEvents,
  spawnWorkstream
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-phase42-agent-observability-"));

function report(extra = "") {
  return [
    "# Agent Report",
    "",
    "## Input Context",
    "Phase 42 observability fixture.",
    "",
    "## Actions Taken",
    "Emitted stdout and stderr for log read-model tests.",
    "",
    "## Claims Proposed",
    "No trusted claim promotion.",
    "",
    "## Evidence Produced",
    "Runtime logs only.",
    "",
    "## Graph Patch",
    "No GraphPatch authority.",
    "",
    "## Blockers",
    "None.",
    "",
    "## Failed Routes",
    "None.",
    "",
    "## Self-Review",
    "No proof authority claimed.",
    "",
    "## Next Actions",
    "Inspect logs independently.",
    extra,
    ""
  ].join("\n");
}

function writeAdapterFixture() {
  const dir = join(projectRoot, ".tmp", "phase42-fixtures");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "observable-adapter.mjs");
  writeFileSync(
    path,
    [
      `if (process.argv.includes("--health")) {`,
      `  process.stdout.write(JSON.stringify({ ok: true, version: "phase42-fixture", capabilities: ["logs", "health"] }) + "\\n");`,
      `  process.exit(0);`,
      `}`,
      `process.stderr.write("phase42 stderr diagnostic\\n");`,
      `process.stdout.write(${JSON.stringify(report("phase42_stdout_marker"))});`,
      ""
    ].join("\n"),
    "utf8"
  );
  return path;
}

try {
  assert.equal(typeof readAgentRunLogs, "function", "Phase 42 must export readAgentRunLogs");
  assert.equal(typeof probeAgentAdapterHealth, "function", "Phase 42 must export probeAgentAdapterHealth");

  const init = initProject({ name: "Phase 42 Agent Observability Project", root_path: projectRoot });
  const projectId = init.project.project_id;
  const workstream = spawnWorkstream(projectRoot, {
    project_id: projectId,
    kind: "proof_route",
    goal: "Generate observable AgentRun logs.",
    created_by: "phase42-test"
  });
  const adapterScript = writeAdapterFixture();
  const contextPath = `.comath/workstreams/${workstream.workstream_id}/spec.yaml`;
  const execution = await executeProfileAgentRun(projectRoot, {
    project_id: projectId,
    campaign_id: "CAM-0042",
    workstream_id: workstream.workstream_id,
    profile_id: "reviewer",
    program: process.execPath,
    adapter_args: [adapterScript],
    goal: "Run observable adapter.",
    context_path: contextPath,
    actor: "phase42-test"
  });

  const logs = readAgentRunLogs(projectRoot, {
    project_id: projectId,
    run_id: execution.run.id,
    max_bytes: 32
  });
  assert.equal(logs.run_id, execution.run.id);
  assert.equal(logs.project_id, projectId);
  assert.equal(logs.status, "succeeded");
  assert.equal(logs.proof_authority, "none");
  assert.equal(logs.stdout_path, `.tmp/comath/${execution.run.id}/logs/stdout.log`);
  assert.equal(logs.stderr_path, `.tmp/comath/${execution.run.id}/logs/stderr.log`);
  assert.equal(logs.stdout.includes("# Agent Report"), true);
  assert.equal(logs.stderr.includes("phase42 stderr diagnostic"), true);
  assert.equal(logs.stdout_truncated, true);
  assert.equal(logs.stderr_truncated, false);
  assert.equal(readFileSync(join(projectRoot, logs.report_path), "utf8").includes("proof_authority: none"), true);

  const health = probeAgentAdapterHealth(projectRoot, {
    project_id: projectId,
    profile_id: "reviewer",
    program: process.execPath,
    adapter_args: [adapterScript],
    actor: "phase42-test"
  });
  assert.equal(health.ok, true);
  assert.equal(health.profile_id, "reviewer");
  assert.equal(health.version, "phase42-fixture");
  assert.deepEqual(health.capabilities, ["logs", "health"]);
  assert.equal(health.proof_authority, "none");
  assert.equal(health.exit_code, 0);

  const server = createComathServer();
  const logResponse = await server.inject({
    method: "GET",
    path: `/agent/run/${execution.run.id}/logs?project_root=${encodeURIComponent(projectRoot)}&project_id=${projectId}&max_bytes=64`
  });
  assert.equal(logResponse.status, 200);
  assert.equal(logResponse.body.logs.run_id, execution.run.id);
  assert.equal(logResponse.body.logs.stdout.includes("# Agent Report"), true);

  const healthResponse = await server.inject({
    method: "POST",
    path: "/agent/adapter/health",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      profile_id: "reviewer",
      program: process.execPath,
      adapter_args: [adapterScript],
      actor: "phase42-route-test"
    }
  });
  assert.equal(healthResponse.status, 200);
  assert.equal(healthResponse.body.health.ok, true);
  assert.equal(healthResponse.body.health.proof_authority, "none");

  const blockedHealth = await server.inject({
    method: "POST",
    path: "/agent/adapter/health",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      profile_id: "reviewer",
      program: "node",
      actor: "phase42-route-test"
    }
  });
  assert.equal(blockedHealth.status, 400);

  const events = readAuditEvents(projectRoot);
  assert.equal(events.some((event) => event.event_type === "agent_run.logs_read"), true);
  assert.equal(events.some((event) => event.event_type === "agent_adapter.health_probed"), true);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 42 AgentRun observability tests passed.");
