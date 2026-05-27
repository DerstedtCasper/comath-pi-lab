import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createComathServer,
  executeProfileAgentRun,
  getAgentRun,
  initProject,
  readAuditEvents,
  spawnWorkstream
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-phase41-live-agent-"));

function validReport(extra = "") {
  return [
    "# Agent Report",
    "",
    "## Input Context",
    "Live adapter fixture received a profile-bound launch.",
    "",
    "## Actions Taken",
    "Executed a real allowlisted child-agent adapter process.",
    "",
    "## Claims Proposed",
    "No trusted claim promotion.",
    "",
    "## Evidence Produced",
    "Adapter stdout/report only.",
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
    "Review the adapter output through an independent reviewer.",
    extra,
    ""
  ].join("\n");
}

function writeAdapterFixture(name) {
  const dir = join(projectRoot, ".tmp", "phase41-fixtures");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, name);
  writeFileSync(
    path,
    [
      `const args = process.argv.slice(2);`,
      `if (!args.includes("--profile") || !args.includes("--goal") || !args.includes("--context")) process.exit(11);`,
      `if (process.env.COMATH_PROOF_AUTHORITY !== "none") process.exit(12);`,
      `if (!process.env.COMATH_AGENT_PROFILE_ID) process.exit(13);`,
      `process.stdout.write(${JSON.stringify(validReport("adapter_profile="))} + process.env.COMATH_AGENT_PROFILE_ID + "\\n");`,
      ""
    ].join("\n"),
    "utf8"
  );
  return path;
}

try {
  assert.equal(typeof executeProfileAgentRun, "function", "Phase 41 must export executeProfileAgentRun");
  const init = initProject({ name: "Phase 41 Live Agent Adapter Project", root_path: projectRoot });
  const projectId = init.project.project_id;
  const workstream = spawnWorkstream(projectRoot, {
    project_id: projectId,
    kind: "proof_route",
    goal: "Execute a live profile-backed adapter process.",
    created_by: "phase41-test"
  });
  const adapterProgram = process.execPath;
  const adapterScript = writeAdapterFixture("adapter-fixture.mjs");
  const contextPath = `.comath/workstreams/${workstream.workstream_id}/spec.yaml`;

  const execution = await executeProfileAgentRun(projectRoot, {
    project_id: projectId,
    campaign_id: "CAM-0001",
    workstream_id: workstream.workstream_id,
    profile_id: "proof-route",
    program: adapterProgram,
    adapter_args: [adapterScript],
    goal: "Run the proof-route adapter on the current workstream.",
    context_path: contextPath,
    actor: "phase41-test"
  });

  assert.equal(execution.profile.id, "proof-route");
  assert.equal(
    readFileSync(join(projectRoot, execution.result.stderr_path), "utf8"),
    "",
    "adapter stderr should be empty before success assertions"
  );
  assert.equal(execution.run.status, "succeeded");
  assert.equal(execution.result.status, "succeeded");
  assert.equal(execution.launch.launch_input.command.program, adapterProgram);
  assert.equal(execution.launch.launch_input.command.args[0], adapterScript);
  assert.equal(execution.launch.launch_input.command.args.includes("--profile"), true);
  assert.equal(execution.launch.launch_input.command.args.includes("proof-route"), true);
  assert.equal(execution.launch.launch_input.command.env.COMATH_PROOF_AUTHORITY, "none");
  assert.equal(getAgentRun(projectRoot, projectId, execution.run.id).status, "succeeded");
  assert.equal(existsSync(join(projectRoot, ".tmp", "comath", execution.run.id, "logs", "stdout.log")), true);
  const report = readFileSync(join(projectRoot, getAgentRun(projectRoot, projectId, execution.run.id).report_path), "utf8");
  assert.match(report, /proof_authority: none/);
  assert.match(report, /child_stdout_untrusted: true/);
  assert.match(report, /adapter_profile=\s*proof-route/);

  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/agent/run/profile/execute",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      campaign_id: "CAM-0002",
      workstream_id: workstream.workstream_id,
      profile_id: "reviewer",
      program: adapterProgram,
      adapter_args: [adapterScript],
      goal: "Run the reviewer adapter.",
      context_path: contextPath,
      actor: "phase41-route-test"
    }
  });
  assert.equal(routeResponse.status, 200);
  assert.equal(routeResponse.body.execution.profile.id, "reviewer");
  assert.equal(routeResponse.body.execution.result.status, "succeeded");

  const badProgramResponse = await server.inject({
    method: "POST",
    path: "/agent/run/profile/execute",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      workstream_id: workstream.workstream_id,
      profile_id: "reviewer",
      program: "node",
      adapter_args: [adapterScript],
      goal: "Rejected relative adapter.",
      context_path: contextPath,
      actor: "phase41-route-test"
    }
  });
  assert.equal(badProgramResponse.status, 400);

  const events = readAuditEvents(projectRoot);
  assert.equal(events.some((event) => event.event_type === "agent_run.profile_executed"), true);
  assert.equal(events.some((event) => event.event_type === "agent_run.process_started"), true);
  assert.equal(events.some((event) => event.event_type === "agent_run.writer_lock_acquired"), true);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 41 live agent adapter execution tests passed.");
