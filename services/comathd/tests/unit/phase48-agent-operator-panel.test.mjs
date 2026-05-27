import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createComathServer,
  executeProfileAgentRun,
  initProject,
  readAgentRunOperatorPanel,
  readAuditEvents,
  spawnWorkstream
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-phase48-agent-operator-panel-"));

function report() {
  return [
    "# Agent Report",
    "",
    "## Input Context",
    "Phase 48 operator panel fixture.",
    "",
    "## Actions Taken",
    "Emitted deterministic stdout and stderr markers for operator control read models.",
    "",
    "## Claims Proposed",
    "proof_authority: none",
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
    "No proof route certified by operator panels.",
    "",
    "## Self-Review",
    "No proof authority claimed.",
    "",
    "## Next Actions",
    "Continue via proof-kernel gates.",
    ""
  ].join("\n");
}

function writeAdapterFixture() {
  const dir = join(projectRoot, ".tmp", "phase48-fixtures");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "operator-panel-adapter.mjs");
  writeFileSync(
    path,
    [
      `process.stdout.write("phase48-stdout-a\\n");`,
      `process.stderr.write("phase48-stderr-a\\n");`,
      `process.stdout.write("phase48-stdout-b\\n");`,
      `process.stderr.write("phase48-stderr-b\\n");`,
      `process.stdout.write(${JSON.stringify(report())});`,
      ""
    ].join("\n"),
    "utf8"
  );
  return path;
}

try {
  assert.equal(typeof readAgentRunOperatorPanel, "function", "Phase 48 must export readAgentRunOperatorPanel");
  const init = initProject({ name: "Phase 48 Agent Operator Panel Project", root_path: projectRoot });
  const projectId = init.project.project_id;
  const workstream = spawnWorkstream(projectRoot, {
    project_id: projectId,
    kind: "proof_route",
    goal: "Generate operator-panel AgentRun state.",
    created_by: "phase48-test"
  });
  const adapterScript = writeAdapterFixture();
  const execution = await executeProfileAgentRun(projectRoot, {
    project_id: projectId,
    campaign_id: "CAM-0048",
    workstream_id: workstream.workstream_id,
    profile_id: "reviewer",
    program: process.execPath,
    adapter_args: [adapterScript],
    goal: "Run operator panel adapter.",
    context_path: `.comath/workstreams/${workstream.workstream_id}/spec.yaml`,
    actor: "phase48-test"
  });

  const panel = readAgentRunOperatorPanel(projectRoot, {
    project_id: projectId,
    run_id: execution.run.id,
    cursor: { stdout: 0, stderr: 0 },
    max_bytes: 32,
    actor: "phase48-test"
  });
  assert.equal(panel.project_id, projectId);
  assert.equal(panel.run.id, execution.run.id);
  assert.equal(panel.run.status, "succeeded");
  assert.equal(panel.proof_authority, "none");
  assert.equal(panel.log_stream.proof_authority, "none");
  assert.equal(panel.log_subscription.content_type, "text/event-stream; charset=utf-8");
  assert.equal(panel.actions.read_logs.enabled, true);
  assert.equal(panel.actions.stream_logs.enabled, true);
  assert.equal(panel.actions.subscribe_logs.enabled, true);
  assert.equal(panel.actions.cancel.enabled, false);
  assert.match(panel.actions.cancel.reason, /terminal|scheduler registry/i);
  assert.equal(panel.endpoints.logs.endsWith(`/agent/run/${execution.run.id}/logs`), true);
  assert.equal(panel.endpoints.log_stream.endsWith(`/agent/run/${execution.run.id}/log-stream`), true);
  assert.equal(panel.endpoints.log_subscription.endsWith(`/agent/run/${execution.run.id}/log-subscription`), true);
  assert.match(panel.log_stream.chunks.stdout, /phase48-stdout-a/);

  const routeServer = createComathServer();
  const route = await routeServer.inject({
    method: "GET",
    path: `/agent/run/${execution.run.id}/operator-panel?project_root=${encodeURIComponent(projectRoot)}&project_id=${projectId}&stdout_cursor=0&stderr_cursor=0&max_bytes=32&actor=phase48-route`
  });
  assert.equal(route.status, 200, JSON.stringify(route.body));
  assert.equal(route.body.panel.run.id, execution.run.id);
  assert.equal(route.body.panel.proof_authority, "none");
  assert.equal(route.body.panel.actions.cancel.enabled, false);

  const events = readAuditEvents(projectRoot);
  assert.equal(events.some((event) => event.event_type === "agent_run.operator_panel_read"), true);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 48 AgentRun operator panel tests passed.");
