import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildAgentProfileLaunch,
  createComathServer,
  createAgentRunForProfile,
  initProject,
  listAgentProfiles,
  readAuditEvents,
  spawnWorkstream,
  validateAgentProfiles
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-phase29-agent-profiles-"));

try {
  const profiles = listAgentProfiles();
  assert.equal(profiles.length, 9);
  assert.deepEqual(
    profiles.map((profile) => profile.id).sort(),
    [
      "computation",
      "coordinator",
      "formalization",
      "graph-builder",
      "librarian",
      "math-integrity-auditor",
      "proof-route",
      "reviewer",
      "security-auditor"
    ].sort()
  );

  for (const profile of profiles) {
    assert.equal(profile.may_mutate_trusted_state, false);
    assert.equal(profile.proof_authority, "none");
    assert.equal(profile.scheduler.max_concurrent, 1);
    assert.equal(profile.scheduler.rpm <= 4, true);
    assert.equal(profile.write_scope_templates.includes(".comath/workstreams/${WS_ID}/"), true);
    assert.equal(profile.write_scope_templates.includes(".tmp/comath/${ARUN_ID}/"), true);
    assert.equal(profile.forbidden_tools.includes("claim.promote.direct"), true);
    assert.equal(profile.forbidden_tools.includes("graph_patch.apply.direct"), true);
    assert.equal(profile.forbidden_tools.includes("trusted_db.write.direct"), true);
    assert.equal(profile.allowed_tools.includes("agent_run.report.submit"), true);
    assert.match(profile.model_profile, /strong|lean|retrieval|symbolic|adversarial|auditor|coordinator/);
  }

  const validation = validateAgentProfiles(profiles, { global_rpm: 4 });
  assert.equal(validation.ok, true);
  assert.deepEqual(validation.vetoes, []);
  assert.equal(validation.warnings.length, 0);

  const badRpm = structuredClone(profiles);
  badRpm[0].scheduler.rpm = 5;
  assert.equal(validateAgentProfiles(badRpm, { global_rpm: 4 }).vetoes.some((veto) => veto.code === "profile_rpm_exceeds_global"), true);

  const badAuthority = structuredClone(profiles);
  badAuthority[0].proof_authority = "trusted";
  assert.equal(validateAgentProfiles(badAuthority, { global_rpm: 4 }).vetoes.some((veto) => veto.code === "profile_claims_proof_authority"), true);

  const badTool = structuredClone(profiles);
  badTool[0].allowed_tools.push("claim.promote.direct");
  assert.equal(validateAgentProfiles(badTool, { global_rpm: 4 }).vetoes.some((veto) => veto.code === "profile_allows_forbidden_tool"), true);

  const init = initProject({ name: "Phase 29 Agent Profile Project", root_path: projectRoot });
  const projectId = init.project.project_id;
  const workstream = spawnWorkstream(projectRoot, {
    project_id: projectId,
    kind: "proof_route",
    goal: "Create a profile-backed AgentRun.",
    created_by: "phase29-test"
  });
  const run = createAgentRunForProfile(projectRoot, {
    project_id: projectId,
    campaign_id: "CAM-0001",
    workstream_id: workstream.workstream_id,
    profile_id: "proof-route",
    actor: "phase29-test"
  });
  assert.equal(run.role, "proof_route");
  assert.equal(run.model, "strongest_lean");
  assert.equal(run.tool_profile, "profile:proof-route");
  assert.deepEqual(run.write_scope, [`.comath/workstreams/${workstream.workstream_id}/`, `.tmp/comath/${run.id}/`]);

  const launch = buildAgentProfileLaunch(projectRoot, {
    project_id: projectId,
    run_id: run.id,
    profile_id: "proof-route",
    program: process.execPath,
    goal: "Prove the locked theorem route.",
    context_path: `.comath/workstreams/${workstream.workstream_id}/spec.yaml`,
    actor: "phase29-test"
  });
  assert.equal(launch.scheduler_options.max_concurrent, 1);
  assert.equal(launch.scheduler_options.rpm, 4);
  assert.deepEqual(launch.scheduler_options.allowed_programs, [process.execPath]);
  assert.equal(launch.launch_input.command.program, process.execPath);
  assert.equal(launch.launch_input.command.env.COMATH_AGENT_PROFILE_ID, "proof-route");
  assert.equal(launch.launch_input.command.env.COMATH_AGENT_MODEL_PROFILE, "strongest_lean");
  assert.equal(launch.launch_input.command.env.COMATH_PROOF_AUTHORITY, "none");
  assert.equal(Object.keys(launch.launch_input.command.env).some((key) => /KEY|TOKEN|SECRET/i.test(key)), false);
  assert.equal(launch.launch_input.command.args.includes("--profile"), true);
  assert.equal(launch.launch_input.command.args.includes("proof-route"), true);
  assert.equal(launch.launch_input.timeout_ms, 600_000);

  const events = readAuditEvents(projectRoot);
  assert.equal(events.some((event) => event.event_type === "agent_run.profile_bound"), true);
  assert.equal(events.some((event) => event.event_type === "agent_run.profile_launch_prepared"), true);

  const server = createComathServer();
  const profileListResponse = await server.inject({
    method: "GET",
    path: `/agent/profile/list?global_rpm=4`
  });
  assert.equal(profileListResponse.status, 200);
  assert.equal(profileListResponse.body.validation.ok, true);
  assert.equal(profileListResponse.body.profiles.some((profile) => profile.id === "proof-route"), true);

  const profileGetResponse = await server.inject({
    method: "GET",
    path: "/agent/profile/proof-route"
  });
  assert.equal(profileGetResponse.status, 200);
  assert.equal(profileGetResponse.body.profile.role, "proof_route");
  assert.equal(profileGetResponse.body.profile.proof_authority, "none");

  const profileRunResponse = await server.inject({
    method: "POST",
    path: "/agent/run/profile",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      campaign_id: "CAM-0001",
      workstream_id: workstream.workstream_id,
      profile_id: "formalization",
      actor: "phase29-route-test"
    }
  });
  assert.equal(profileRunResponse.status, 200);
  assert.equal(profileRunResponse.body.run.role, "formalization");
  assert.equal(profileRunResponse.body.run.tool_profile, "profile:formalization");
  assert.equal(profileRunResponse.body.profile.id, "formalization");

  const launchPrepareResponse = await server.inject({
    method: "POST",
    path: "/agent/run/profile/prepare-launch",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      run_id: profileRunResponse.body.run.id,
      profile_id: "formalization",
      program: process.execPath,
      goal: "Write a scoped Lean file for the current obligation.",
      context_path: `.comath/workstreams/${workstream.workstream_id}/spec.yaml`,
      actor: "phase29-route-test"
    }
  });
  assert.equal(launchPrepareResponse.status, 200);
  assert.equal(launchPrepareResponse.body.launch.scheduler_options.rpm, 4);
  assert.equal(launchPrepareResponse.body.launch.launch_input.command.env.COMATH_AGENT_PROFILE_ID, "formalization");
  assert.equal(
    Object.keys(launchPrepareResponse.body.launch.launch_input.command.env).some((key) =>
      /KEY|TOKEN|SECRET/i.test(key)
    ),
    false
  );

  const badProfileResponse = await server.inject({
    method: "POST",
    path: "/agent/run/profile",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      workstream_id: workstream.workstream_id,
      profile_id: "unknown-agent",
      actor: "phase29-route-test"
    }
  });
  assert.equal(badProfileResponse.status, 400);
  assert.equal(badProfileResponse.body.code, "AGENT_PROFILE_UNKNOWN");

  const healthResponse = await server.inject({
    method: "GET",
    path: "/health"
  });
  assert.equal(healthResponse.status, 200);
  assert.equal(healthResponse.body.capabilities.includes("agent_profile_service_api"), true);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 29 Agent profile integration tests passed.");
