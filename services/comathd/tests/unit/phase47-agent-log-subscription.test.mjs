import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createComathServer,
  executeProfileAgentRun,
  formatAgentRunLogSseSnapshot,
  initProject,
  readAuditEvents,
  spawnWorkstream
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-phase47-agent-log-subscription-"));

function report() {
  return [
    "# Agent Report",
    "",
    "## Input Context",
    "Phase 47 log subscription fixture.",
    "",
    "## Actions Taken",
    "Emitted deterministic stdout and stderr markers for SSE-style subscription frames.",
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
    "No proof route certified by subscription logs.",
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
  const dir = join(projectRoot, ".tmp", "phase47-fixtures");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "subscription-adapter.mjs");
  writeFileSync(
    path,
    [
      `process.stdout.write("phase47-stdout-a\\n");`,
      `process.stderr.write("phase47-stderr-a\\n");`,
      `process.stdout.write("phase47-stdout-b\\n");`,
      `process.stderr.write("phase47-stderr-b\\n");`,
      `process.stdout.write(${JSON.stringify(report())});`,
      ""
    ].join("\n"),
    "utf8"
  );
  return path;
}

try {
  assert.equal(typeof formatAgentRunLogSseSnapshot, "function", "Phase 47 must export formatAgentRunLogSseSnapshot");
  const init = initProject({ name: "Phase 47 Agent Log Subscription Project", root_path: projectRoot });
  const projectId = init.project.project_id;
  const workstream = spawnWorkstream(projectRoot, {
    project_id: projectId,
    kind: "proof_route",
    goal: "Generate subscribable AgentRun logs.",
    created_by: "phase47-test"
  });
  const adapterScript = writeAdapterFixture();
  const execution = await executeProfileAgentRun(projectRoot, {
    project_id: projectId,
    campaign_id: "CAM-0047",
    workstream_id: workstream.workstream_id,
    profile_id: "reviewer",
    program: process.execPath,
    adapter_args: [adapterScript],
    goal: "Run subscribable adapter.",
    context_path: `.comath/workstreams/${workstream.workstream_id}/spec.yaml`,
    actor: "phase47-test"
  });

  const snapshot = formatAgentRunLogSseSnapshot(projectRoot, {
    project_id: projectId,
    run_id: execution.run.id,
    cursor: { stdout: 0, stderr: 0 },
    max_bytes: 32,
    retry_ms: 750,
    actor: "phase47-test"
  });
  assert.equal(snapshot.content_type, "text/event-stream; charset=utf-8");
  assert.equal(snapshot.proof_authority, "none");
  assert.match(snapshot.body, /^retry: 750/m);
  assert.match(snapshot.body, /^event: agent_run\.log_chunk/m);
  assert.match(snapshot.body, /^id: ARUN-\d{4}:/m);
  assert.match(snapshot.body, /^data: /m);
  assert.match(snapshot.body, /"proof_authority":"none"/);
  assert.match(snapshot.body, /"next_cursor"/);
  assert.match(snapshot.body, /phase47-stdout-a/);

  const routeServer = createComathServer();
  const route = await routeServer.inject({
    method: "GET",
    path: `/agent/run/${execution.run.id}/log-subscription?project_root=${encodeURIComponent(projectRoot)}&project_id=${projectId}&stdout_cursor=0&stderr_cursor=0&max_bytes=32&retry_ms=750&actor=phase47-route`
  });
  assert.equal(route.status, 200, JSON.stringify(route.body));
  assert.equal(route.headers["content-type"], "text/event-stream; charset=utf-8");
  assert.match(route.body, /^event: agent_run\.log_chunk/m);
  assert.match(route.body, /"complete":false|"complete":true/);

  const events = readAuditEvents(projectRoot);
  assert.equal(events.some((event) => event.event_type === "agent_run.logs_sse_snapshot"), true);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 47 AgentRun log subscription tests passed.");
