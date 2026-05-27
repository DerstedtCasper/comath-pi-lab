import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createComathServer,
  executeProfileAgentRun,
  formatAgentRunLogSseSession,
  initProject,
  readAuditEvents,
  spawnWorkstream
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-phase50-agent-log-session-"));

function report() {
  return [
    "# Agent Report",
    "",
    "## Input Context",
    "Phase 50 multi-event log session fixture.",
    "",
    "## Actions Taken",
    "Emitted deterministic stdout and stderr markers for bounded SSE sessions.",
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
    "No proof route certified by log sessions.",
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
  const dir = join(projectRoot, ".tmp", "phase50-fixtures");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "log-session-adapter.mjs");
  writeFileSync(
    path,
    [
      `process.stdout.write("phase50-stdout-a\\n");`,
      `process.stdout.write("phase50-stdout-b\\n");`,
      `process.stdout.write("phase50-stdout-c\\n");`,
      `process.stderr.write("phase50-stderr-a\\n");`,
      `process.stderr.write("phase50-stderr-b\\n");`,
      `process.stdout.write(${JSON.stringify(report())});`,
      ""
    ].join("\n"),
    "utf8"
  );
  return path;
}

function eventCount(body) {
  return body.split("\n").filter((line) => line === "event: agent_run.log_chunk").length;
}

try {
  assert.equal(typeof formatAgentRunLogSseSession, "function", "Phase 50 must export formatAgentRunLogSseSession");
  const init = initProject({ name: "Phase 50 Agent Log Session Project", root_path: projectRoot });
  const projectId = init.project.project_id;
  const workstream = spawnWorkstream(projectRoot, {
    project_id: projectId,
    kind: "proof_route",
    goal: "Generate multi-event AgentRun logs.",
    created_by: "phase50-test"
  });
  const execution = await executeProfileAgentRun(projectRoot, {
    project_id: projectId,
    campaign_id: "CAM-0050",
    workstream_id: workstream.workstream_id,
    profile_id: "reviewer",
    program: process.execPath,
    adapter_args: [writeAdapterFixture()],
    goal: "Run multi-event adapter.",
    context_path: `.comath/workstreams/${workstream.workstream_id}/spec.yaml`,
    actor: "phase50-test"
  });

  const session = formatAgentRunLogSseSession(projectRoot, {
    project_id: projectId,
    run_id: execution.run.id,
    cursor: { stdout: 0, stderr: 0 },
    max_bytes: 18,
    max_events: 3,
    retry_ms: 500,
    actor: "phase50-test"
  });
  assert.equal(session.content_type, "text/event-stream; charset=utf-8");
  assert.equal(session.proof_authority, "none");
  assert.equal(session.events.length, 3);
  assert.equal(eventCount(session.body), 3);
  assert.equal(session.complete, false);
  assert.match(session.body, /^retry: 500/m);
  assert.match(session.body, /phase50-stdout-a/);
  assert.match(session.body, /"proof_authority":"none"/);
  assert.ok(session.next_cursor.stdout > 0);

  const tail = formatAgentRunLogSseSession(projectRoot, {
    project_id: projectId,
    run_id: execution.run.id,
    cursor: session.next_cursor,
    max_bytes: 128 * 1024,
    max_events: 5,
    actor: "phase50-test"
  });
  assert.equal(tail.complete, true);
  assert.equal(tail.events.at(-1).complete, true);

  const server = createComathServer();
  const route = await server.inject({
    method: "GET",
    path: `/agent/run/${execution.run.id}/log-session?project_root=${encodeURIComponent(projectRoot)}&project_id=${projectId}&stdout_cursor=0&stderr_cursor=0&max_bytes=18&max_events=3&retry_ms=500&actor=phase50-route`
  });
  assert.equal(route.status, 200, JSON.stringify(route.body));
  assert.equal(route.headers["content-type"], "text/event-stream; charset=utf-8");
  assert.equal(eventCount(route.body), 3);

  const events = readAuditEvents(projectRoot);
  assert.equal(events.some((event) => event.event_type === "agent_run.logs_sse_session"), true);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 50 AgentRun log session tests passed.");
