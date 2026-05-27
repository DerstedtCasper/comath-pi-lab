import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  cancelAgentRunFromOperator,
  createComathServer,
  executeProfileAgentRun,
  getAgentRun,
  initProject,
  readAgentRunOperatorPanel,
  readAuditEvents,
  spawnWorkstream
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-phase49-agent-operator-cancel-"));

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForRunStatus(projectId, runId, status) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const run = getAgentRun(projectRoot, projectId, runId);
    if (run.status === status) {
      return run;
    }
    await sleep(50);
  }
  throw new Error(`AgentRun ${runId} did not reach ${status}`);
}

function writeLongRunningAdapter() {
  const dir = join(projectRoot, ".tmp", "phase49-fixtures");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "long-running-adapter.mjs");
  writeFileSync(
    path,
    [
      `process.stdout.write("phase49-started\\n");`,
      `setInterval(() => process.stdout.write("phase49-heartbeat\\n"), 250);`,
      `setTimeout(() => { process.stdout.write("phase49-should-have-been-cancelled\\n"); process.exit(0); }, 30000);`,
      ""
    ].join("\n"),
    "utf8"
  );
  return path;
}

try {
  assert.equal(typeof cancelAgentRunFromOperator, "function", "Phase 49 must export cancelAgentRunFromOperator");
  const init = initProject({ name: "Phase 49 Agent Operator Cancel Project", root_path: projectRoot });
  const projectId = init.project.project_id;
  const workstream = spawnWorkstream(projectRoot, {
    project_id: projectId,
    kind: "proof_route",
    goal: "Exercise scheduler-backed operator cancellation.",
    created_by: "phase49-test"
  });
  const adapterScript = writeLongRunningAdapter();

  const executionPromise = executeProfileAgentRun(projectRoot, {
    project_id: projectId,
    campaign_id: "CAM-0049",
    workstream_id: workstream.workstream_id,
    profile_id: "reviewer",
    program: process.execPath,
    adapter_args: [adapterScript],
    goal: "Run until operator cancellation.",
    context_path: `.comath/workstreams/${workstream.workstream_id}/spec.yaml`,
    actor: "phase49-test"
  });

  await sleep(100);
  const runId = readAuditEvents(projectRoot).find((event) => event.event_type === "agent_run.created")?.target_id;
  assert.match(runId, /^ARUN-\d{4}$/);
  await waitForRunStatus(projectId, runId, "running");

  const panel = readAgentRunOperatorPanel(projectRoot, {
    project_id: projectId,
    run_id: runId,
    cursor: { stdout: 0, stderr: 0 },
    max_bytes: 256,
    actor: "phase49-test"
  });
  assert.equal(panel.actions.cancel.enabled, true);
  assert.equal(panel.actions.cancel.endpoint.endsWith(`/agent/run/${runId}/cancel`), true);

  const server = createComathServer();
  const cancelResponse = await server.inject({
    method: "POST",
    path: `/agent/run/${runId}/cancel`,
    body: {
      project_root: projectRoot,
      project_id: projectId,
      actor: "phase49-operator"
    }
  });
  assert.equal(cancelResponse.status, 200, JSON.stringify(cancelResponse.body));
  assert.equal(cancelResponse.body.cancellation.cancelled, true);
  assert.equal(cancelResponse.body.cancellation.proof_authority, "none");

  const execution = await executionPromise;
  assert.equal(execution.result.status, "cancelled");
  assert.equal(getAgentRun(projectRoot, projectId, runId).status, "cancelled");

  const afterCancelPanel = readAgentRunOperatorPanel(projectRoot, {
    project_id: projectId,
    run_id: runId,
    actor: "phase49-test"
  });
  assert.equal(afterCancelPanel.actions.cancel.enabled, false);
  assert.match(afterCancelPanel.actions.cancel.reason, /terminal/i);

  const events = readAuditEvents(projectRoot);
  assert.equal(events.some((event) => event.event_type === "agent_run.operator_cancel_requested"), true);
  assert.equal(events.some((event) => event.event_type === "agent_run.process_cancelled"), true);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 49 AgentRun operator cancellation tests passed.");
