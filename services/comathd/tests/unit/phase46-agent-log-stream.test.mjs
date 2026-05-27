import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createComathServer,
  executeProfileAgentRun,
  initProject,
  readAuditEvents,
  spawnWorkstream,
  streamAgentRunLogs
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-phase46-agent-log-stream-"));

function report() {
  return [
    "# Agent Report",
    "",
    "## Input Context",
    "Phase 46 log stream fixture.",
    "",
    "## Actions Taken",
    "Emitted deterministic stdout and stderr markers for cursor streaming.",
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
    "No proof route certified by logs.",
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
  const dir = join(projectRoot, ".tmp", "phase46-fixtures");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "streaming-adapter.mjs");
  writeFileSync(
    path,
    [
      `process.stdout.write("alpha-stdout\\n");`,
      `process.stderr.write("alpha-stderr\\n");`,
      `process.stdout.write("beta-stdout\\n");`,
      `process.stderr.write("beta-stderr\\n");`,
      `process.stdout.write(${JSON.stringify(report())});`,
      ""
    ].join("\n"),
    "utf8"
  );
  return path;
}

try {
  assert.equal(typeof streamAgentRunLogs, "function", "Phase 46 must export streamAgentRunLogs");
  const init = initProject({ name: "Phase 46 Agent Log Stream Project", root_path: projectRoot });
  const projectId = init.project.project_id;
  const workstream = spawnWorkstream(projectRoot, {
    project_id: projectId,
    kind: "proof_route",
    goal: "Generate streamable AgentRun logs.",
    created_by: "phase46-test"
  });
  const adapterScript = writeAdapterFixture();
  const execution = await executeProfileAgentRun(projectRoot, {
    project_id: projectId,
    campaign_id: "CAM-0046",
    workstream_id: workstream.workstream_id,
    profile_id: "reviewer",
    program: process.execPath,
    adapter_args: [adapterScript],
    goal: "Run streamable adapter.",
    context_path: `.comath/workstreams/${workstream.workstream_id}/spec.yaml`,
    actor: "phase46-test"
  });

  const first = streamAgentRunLogs(projectRoot, {
    project_id: projectId,
    run_id: execution.run.id,
    cursor: { stdout: 0, stderr: 0 },
    max_bytes: 24,
    actor: "phase46-test"
  });
  assert.equal(first.run_id, execution.run.id);
  assert.equal(first.project_id, projectId);
  assert.equal(first.status, "succeeded");
  assert.equal(first.proof_authority, "none");
  assert.equal(first.complete, false, "first small stream read should have more bytes available");
  assert.equal(first.chunks.stdout.includes("alpha-stdout"), true);
  assert.equal(first.chunks.stderr.includes("alpha-stderr"), true);
  assert.equal(first.cursor.stdout, 0);
  assert.equal(first.cursor.stderr, 0);
  assert.ok(first.next_cursor.stdout > first.cursor.stdout);
  assert.ok(first.next_cursor.stderr > first.cursor.stderr);
  assert.equal(first.truncated.stdout, true);
  assert.equal(first.truncated.stderr, true);

  const second = streamAgentRunLogs(projectRoot, {
    project_id: projectId,
    run_id: execution.run.id,
    cursor: first.next_cursor,
    max_bytes: 128 * 1024,
    actor: "phase46-test"
  });
  assert.equal(second.cursor.stdout, first.next_cursor.stdout);
  const stdoutCombined = `${first.chunks.stdout}${second.chunks.stdout}`;
  assert.equal(stdoutCombined.includes("beta-stdout"), true);
  assert.equal(stdoutCombined.includes("# Agent Report"), true);
  assert.equal(second.complete, true, "terminal run with consumed logs should report complete stream");
  assert.equal(second.truncated.stdout, false);

  const routeServer = createComathServer();
  const route = await routeServer.inject({
    method: "GET",
    path: `/agent/run/${execution.run.id}/log-stream?project_root=${encodeURIComponent(projectRoot)}&project_id=${projectId}&stdout_cursor=0&stderr_cursor=0&max_bytes=32&actor=phase46-route`
  });
  assert.equal(route.status, 200, JSON.stringify(route.body));
  assert.equal(route.body.stream.run_id, execution.run.id);
  assert.equal(route.body.stream.proof_authority, "none");
  assert.equal(route.body.stream.chunks.stdout.includes("alpha-stdout"), true);

  assert.throws(
    () =>
      streamAgentRunLogs(projectRoot, {
        project_id: projectId,
        run_id: execution.run.id,
        cursor: { stdout: -1, stderr: 0 },
        max_bytes: 32,
        actor: "phase46-test"
      }),
    /cursor\.stdout must be a non-negative integer/
  );

  const events = readAuditEvents(projectRoot);
  assert.equal(events.some((event) => event.event_type === "agent_run.logs_streamed"), true);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 46 AgentRun log stream tests passed.");
