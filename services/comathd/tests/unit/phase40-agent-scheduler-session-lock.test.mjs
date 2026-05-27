import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  acquireProjectSessionLock,
  createAgentRun,
  createAgentRunScheduler,
  getAgentRun,
  initProject,
  readAuditEvents,
  readProjectSessionLock,
  releaseProjectSessionLock,
  spawnWorkstream
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-phase40-agent-lock-"));

function validReport(extra = "") {
  return [
    "# Agent Report",
    "",
    "## Input Context",
    "Scheduler-launched fixture.",
    "",
    "## Actions Taken",
    "Executed a real child process.",
    "",
    "## Claims Proposed",
    "No trusted claim promotion.",
    "",
    "## Evidence Produced",
    "Only process logs and report text.",
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
    "Review scheduler output.",
    extra,
    ""
  ].join("\n");
}

function writeFixtureScript(name, source) {
  const dir = join(projectRoot, ".tmp", "phase40-fixtures");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, name);
  writeFileSync(path, source, "utf8");
  return path;
}

function successScript(name) {
  return writeFixtureScript(
    name,
    [
      `process.stdout.write(${JSON.stringify(validReport(`Fixture ${name} completed.`))});`,
      ""
    ].join("\n")
  );
}

function createRun(projectId, workstreamId) {
  return createAgentRun(projectRoot, {
    project_id: projectId,
    campaign_id: "CAM-0001",
    workstream_id: workstreamId,
    role: "proof_route",
    model: "node-fixture",
    tool_profile: "phase40-lock-fixture",
    actor: "phase40-test"
  });
}

try {
  const init = initProject({ name: "Phase 40 Scheduler Lock Project", root_path: projectRoot });
  const projectId = init.project.project_id;
  const workstream = spawnWorkstream(projectRoot, {
    project_id: projectId,
    kind: "proof_route",
    goal: "Verify AgentRun scheduler respects project writer session locks.",
    created_by: "phase40-test"
  });

  const scheduler = createAgentRunScheduler({
    max_concurrent: 1,
    rpm: 4,
    allowed_programs: [process.execPath]
  });

  const external = acquireProjectSessionLock(projectRoot, {
    owner: "phase40-external-writer",
    staleAfterMs: 60_000,
    now: () => "2026-05-28T01:00:00.000Z"
  });
  assert.equal(external.acquired, true);

  const blockedRun = createRun(projectId, workstream.workstream_id);
  await assert.rejects(
    () =>
      scheduler.launch(projectRoot, {
        project_id: projectId,
        run_id: blockedRun.id,
        command: { program: process.execPath, args: [successScript("blocked-should-not-run.mjs")] },
        timeout_ms: 2_000,
        actor: "phase40-test"
      }),
    /active writer session lock exists/
  );
  assert.equal(getAgentRun(projectRoot, projectId, blockedRun.id).status, "queued");
  assert.equal(existsSync(join(projectRoot, ".tmp", "comath", blockedRun.id, "logs", "stdout.log")), false);

  releaseProjectSessionLock(projectRoot, {
    sessionId: external.lock.session_id,
    token: external.lock.token,
    now: () => "2026-05-28T01:00:01.000Z"
  });

  const allowedRun = createRun(projectId, workstream.workstream_id);
  const result = await scheduler.launch(projectRoot, {
    project_id: projectId,
    run_id: allowedRun.id,
    command: { program: process.execPath, args: [successScript("allowed.mjs")] },
    timeout_ms: 2_000,
    actor: "phase40-test"
  });
  assert.equal(result.status, "succeeded");
  assert.equal(getAgentRun(projectRoot, projectId, allowedRun.id).status, "succeeded");
  assert.equal(Boolean(readProjectSessionLock(projectRoot)?.released_at), true);

  const events = readAuditEvents(projectRoot);
  assert.equal(events.some((event) => event.event_type === "agent_run.writer_lock_blocked"), true);
  assert.equal(events.some((event) => event.event_type === "agent_run.writer_lock_acquired"), true);
  assert.equal(events.some((event) => event.event_type === "agent_run.writer_lock_released"), true);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 40 AgentRun scheduler session-lock tests passed.");
