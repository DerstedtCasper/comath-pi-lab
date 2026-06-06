import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createComathServer,
  executeProfileAgentRun,
  getComathdStatus,
  heartbeatPiCodexLifecycleOperatorTransportLease,
  initProject,
  openPiCodexLifecycleOperatorTransportLease,
  persistPiCodexLifecycleOperatorSession,
  probePiCodexRealPiInstallRuntimeRegistration,
  readAuditEvents,
  recordPiCodexLifecycleGuidedRealPiExecution,
  recoverPiCodexLifecycleOperatorTransport,
  reviewPiCodexLifecycleTerminalExecution,
  spawnWorkstream
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task224-terminal-chain-review-"));
const secretTerms = /COMATH_CODEX_API_KEY|OPENAI_API_KEY|Authorization:\s*Bearer|api_key|token=|plain-token|sk-/i;
const privilegedPublicTerms =
  /clean_replay_passed|completed_formal_proof|formally_checked|proven|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|kernel_checked|proof_success/i;
const transportOverclaimTerms =
  /long[- ]lived\s+(?:websocket|sse)|indefinite\s+sse|terminal transport recovered live|durable transport provided/i;
const previousAllowedPrograms = process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS;

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeAgentRunAdapterFixture() {
  const dir = join(projectRoot, ".tmp", "task224-fixtures");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "terminal-chain-adapter.mjs");
  writeFileSync(
    path,
    [
      "process.stdout.write('task224 stdout before heartbeat\\n');",
      "process.stderr.write('task224 stderr before heartbeat\\n');",
      "process.stdout.write('# Agent Report\\n\\n## Input Context\\nTask224 terminal chain review fixture.\\n\\n## Actions Taken\\nEmitted bounded logs.\\n\\n## Claims Proposed\\nproof_authority: none\\n\\n## Evidence Produced\\nRuntime logs only.\\n\\n## Graph Patch\\nNo trusted mutation.\\n\\n## Blockers\\nNone.\\n\\n## Failed Routes\\nNone.\\n\\n## Self-Review\\nNo Lean authority and no durable transport.\\n\\n## Next Actions\\nReview service-owned terminal chain.\\n');",
      ""
    ].join("\n"),
    "utf8"
  );
  return path;
}

async function createTerminalChain(ids) {
  const workstream = spawnWorkstream(projectRoot, {
    project_id: projectId,
    kind: "proof_route",
    goal: "Task224 guided real-Pi terminal chain fixture.",
    created_by: "goal3-task224"
  });
  const agentRun = await executeProfileAgentRun(projectRoot, {
    project_id: projectId,
    campaign_id: `CAM-${ids.suffix}`,
    workstream_id: workstream.workstream_id,
    profile_id: "reviewer",
    program: process.execPath,
    adapter_args: [writeAgentRunAdapterFixture()],
    goal: "Run Task224 guided execution terminal chain fixture.",
    context_path: `.comath/workstreams/${workstream.workstream_id}/spec.yaml`,
    actor: "goal3-task224-agent-run"
  });
  const agentRunLogSessionRoute = `/agent/run/${agentRun.run.id}/log-session`;

  const realPiProbe = probePiCodexRealPiInstallRuntimeRegistration(
    projectRoot,
    {
      project_id: projectId,
      probe_id: ids.probeId,
      actor: "goal3-task224-real-pi-probe-test",
      pi_host_label: "pi-host-task224",
      session_kind: "real_pi_host_automated_install",
      timeout_ms: 5000,
      commands: {
        install: { program: process.execPath, args: ["pi-fixture.mjs", "install"] },
        runtime_registration: { program: process.execPath, args: ["pi-fixture.mjs", "runtime-registration"] },
        host_confirmation: { program: process.execPath, args: ["pi-fixture.mjs", "host-confirmation"] }
      }
    },
    {
      runner: (_command, step) => ({
        exit_code: 0,
        signal: null,
        timed_out: false,
        stdout: JSON.stringify({
          step,
          imported: true,
          registered: true,
          host_confirmation: true,
          leaked_path: `${projectRoot}\\secret.txt`,
          token: "plain-token"
        }),
        stderr: ""
      })
    }
  );

  const session = persistPiCodexLifecycleOperatorSession(projectRoot, {
    project_id: projectId,
    session_id: ids.sessionId,
    actor: "goal3-task224-session-test",
    pi_host_label: "pi-host-task224",
    session_status: "recoverable_operator_session",
    session_kind: "real_pi_host_automated_install",
    operator_cursor: "stdout:0/stderr:0",
    completed_steps: ["real_pi_install_runtime_probe"],
    artifact_paths: [{ kind: "runtime_registration_snapshot", path: realPiProbe.runtime_registration_snapshot_path }],
    last_result_summary: { summary: "real Pi runtime probe observed; ready for terminal chain review" }
  });

  const recovery = recoverPiCodexLifecycleOperatorTransport(projectRoot, {
    project_id: projectId,
    session_id: ids.sessionId,
    transport_recovery_id: ids.recoveryId,
    actor: "goal3-task224-recovery-test",
    session_manifest_path: session.session_manifest_path,
    transport_kind: "bounded_sse_snapshot",
    observed_route: agentRunLogSessionRoute,
    requested_cursor: {
      operator_event_cursor: "event:4",
      stdout_cursor: "stdout:0",
      stderr_cursor: "stderr:0"
    },
    client_epoch: 4,
    last_seen_event_id: "evt-4",
    reconnect_reason: "terminal chain review checkpoint before bounded lease"
  });

  const lease = openPiCodexLifecycleOperatorTransportLease(projectRoot, {
    project_id: projectId,
    session_id: ids.sessionId,
    transport_recovery_id: ids.recoveryId,
    transport_lease_id: ids.leaseId,
    actor: "goal3-task224-lease-test token=plain-token",
    session_manifest_path: session.session_manifest_path,
    transport_recovery_path: recovery.transport_recovery_path,
    transport_kind: "bounded_live_sse_lease",
    lease_route: `${agentRunLogSessionRoute} Authorization: Bearer plain-token long-lived SSE`,
    requested_cursor: {
      operator_event_cursor: "event:5",
      stdout_cursor: "stdout:0",
      stderr_cursor: "stderr:0"
    },
    client_epoch: 5,
    heartbeat_interval_ms: 10_000,
    lease_ttl_ms: 60_000,
    last_seen_event_id: "evt-5",
    open_reason: "terminal chain review bounded lease"
  });

  const heartbeat = heartbeatPiCodexLifecycleOperatorTransportLease(projectRoot, {
    project_id: projectId,
    session_id: ids.sessionId,
    transport_recovery_id: ids.recoveryId,
    transport_lease_id: ids.leaseId,
    transport_heartbeat_id: ids.heartbeatId,
    actor: "goal3-task224-heartbeat-test proof_success token=plain-token",
    session_manifest_path: session.session_manifest_path,
    transport_recovery_path: recovery.transport_recovery_path,
    transport_lease_path: lease.transport_lease_path,
    requested_cursor: {
      operator_event_cursor: "event:6",
      stdout_cursor: `stdout:${lease.agent_run_log_session_binding.next_cursor.stdout}`,
      stderr_cursor: `stderr:${lease.agent_run_log_session_binding.next_cursor.stderr}`
    },
    client_epoch: 6,
    last_seen_event_id: "evt-6",
    heartbeat_reason: "terminal chain review heartbeat before guided execution"
  });

  const execution = recordPiCodexLifecycleGuidedRealPiExecution(projectRoot, {
    project_id: projectId,
    execution_id: ids.executionId,
    actor: `goal3-task224-guided ${projectRoot}\\actor-secret.txt OPENAI_API_KEY=plain-token kernel_checked durable transport provided`,
    real_pi_runtime_probe_id: ids.probeId,
    pi_install_transcript_path: realPiProbe.pi_install_transcript_path,
    runtime_registration_snapshot_path: realPiProbe.runtime_registration_snapshot_path,
    session_id: ids.sessionId,
    session_manifest_path: session.session_manifest_path,
    transport_recovery_id: ids.recoveryId,
    transport_recovery_path: recovery.transport_recovery_path,
    transport_lease_id: ids.leaseId,
    transport_lease_path: lease.transport_lease_path,
    pi_host_label: "pi-host-task224",
    observed_routes: [
      "/cm:release real-pi-runtime-probe",
      "/cm:release lifecycle-operator-session",
      "/cm:release lifecycle-operator-transport-recovery",
      "/cm:release lifecycle-operator-transport-lease",
      "/cm:release lifecycle-operator-transport-heartbeat long-lived websocket",
      "/cm:release lifecycle-guided-real-pi-execution"
    ],
    operator_command_summary: `guided terminal chain at ${projectRoot}\\terminal.txt formal_replay_passed sk-task224`,
    final_operator_cursor: {
      operator_event_cursor: "event:8",
      stdout_cursor: "stdout:256 kernel_checked",
      stderr_cursor: "stderr:0 proof_success"
    },
    execution_outcome: "operator_guided_run_observed",
    next_recommended_route: "/release/pi-codex-lifecycle/terminal-execution-review"
  });

  return { agentRun, realPiProbe, session, recovery, lease, heartbeat, execution };
}

const init = initProject({ name: "Goal3 Task224 Pi Guided Execution Terminal Chain Review", root_path: projectRoot });
const projectId = init.project.project_id;

try {
  process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS = JSON.stringify([process.execPath]);
  assert.equal(
    typeof reviewPiCodexLifecycleTerminalExecution,
    "function",
    "Task224 must export a service-owned terminal chain review gate"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("pi_codex_guided_execution_terminal_chain_review"),
    true,
    "Task224 capability ledger must advertise the guided execution terminal chain review"
  );

  const chain = await createTerminalChain({
    suffix: "0224",
    probeId: "LIFE-PI-RUNTIME-0224",
    sessionId: "LIFE-OP-SESSION-0224",
    recoveryId: "LIFE-TRANSPORT-0224",
    leaseId: "LIFE-TRANSPORT-LEASE-0224",
    heartbeatId: "LIFE-TRANSPORT-HEARTBEAT-0224",
    executionId: "LIFE-GUIDED-EXEC-0224"
  });

  const review = reviewPiCodexLifecycleTerminalExecution(projectRoot, {
    project_id: projectId,
    review_id: "LIFE-TERMINAL-REVIEW-0224",
    actor: `goal3-task224-reviewer ${projectRoot}\\review-secret.txt Authorization: Bearer plain-token proof_success long-lived SSE`,
    real_pi_runtime_probe_id: "LIFE-PI-RUNTIME-0224",
    pi_install_transcript_path: chain.realPiProbe.pi_install_transcript_path,
    runtime_registration_snapshot_path: chain.realPiProbe.runtime_registration_snapshot_path,
    session_id: "LIFE-OP-SESSION-0224",
    session_manifest_path: chain.session.session_manifest_path,
    transport_recovery_id: "LIFE-TRANSPORT-0224",
    transport_recovery_path: chain.recovery.transport_recovery_path,
    transport_lease_id: "LIFE-TRANSPORT-LEASE-0224",
    transport_lease_path: chain.lease.transport_lease_path,
    transport_heartbeat_id: "LIFE-TRANSPORT-HEARTBEAT-0224",
    transport_heartbeat_path: chain.heartbeat.transport_heartbeat_path,
    execution_id: "LIFE-GUIDED-EXEC-0224",
    guided_execution_path: chain.execution.guided_execution_path
  });

  assert.equal(review.schema_version, "comath.pi_codex_guided_execution_terminal_chain_review.v1");
  assert.equal(review.ok, true);
  assert.equal(review.review_status, "guided_real_pi_terminal_chain_ready_for_release_review");
  assert.equal(review.terminal_chain_bound, true);
  assert.deepEqual(review.vetoes, []);
  assert.deepEqual(review.ordered_steps, [
    "real_pi_runtime_probe",
    "operator_session_manifest",
    "operator_transport_recovery_checkpoint",
    "bounded_operator_transport_lease",
    "operator_transport_heartbeat_rebind",
    "guided_real_pi_execution"
  ]);
  assert.equal(review.real_pi_runtime_probe_id, "LIFE-PI-RUNTIME-0224");
  assert.equal(review.session_id, "LIFE-OP-SESSION-0224");
  assert.equal(review.transport_recovery_id, "LIFE-TRANSPORT-0224");
  assert.equal(review.transport_lease_id, "LIFE-TRANSPORT-LEASE-0224");
  assert.equal(review.transport_heartbeat_id, "LIFE-TRANSPORT-HEARTBEAT-0224");
  assert.equal(review.execution_id, "LIFE-GUIDED-EXEC-0224");
  assert.equal(review.transport_heartbeat_artifact.sha256, chain.heartbeat.transport_heartbeat_artifact.sha256);
  assert.equal(review.guided_execution_artifact.sha256, chain.execution.guided_execution_artifact.sha256);
  assert.equal(review.heartbeat_consumed_by_review, true);
  assert.equal(review.guided_execution_consumed_by_review, true);
  assert.equal(review.agent_run_log_session_binding.run_id, chain.agentRun.run.id);
  assert.equal(
    review.agent_run_log_session_binding.body_sha256,
    chain.heartbeat.agent_run_log_session_binding.body_sha256
  );
  assert.equal(review.proof_authority, "none");
  assert.equal(review.can_promote_claim, false);
  assert.equal(review.can_certify_ga, false);
  assert.equal(review.durable_transport_provided, false);
  assert.equal(review.live_transport_open, false);
  assert.equal(review.indefinite_stream_open, false);
  assert.equal(review.long_lived_websocket_provided, false);
  assert.equal(review.long_lived_sse_provided, false);
  assert.equal(review.pi_direct_write_allowed, false);
  assert.equal(review.direct_trusted_state_mutation, false);
  assert.equal(JSON.stringify(review).includes(projectRoot), false, "review result must not expose host paths");
  assert.doesNotMatch(JSON.stringify(review), secretTerms, "review result must scrub secrets");
  assert.doesNotMatch(JSON.stringify(review), privilegedPublicTerms, "review result must not overclaim proof success");
  assert.doesNotMatch(
    JSON.stringify(review),
    transportOverclaimTerms,
    "review result must scrub long-lived/durable transport overclaims"
  );

  const persistedPath = join(projectRoot, review.review_path);
  assert.equal(existsSync(persistedPath), true, "terminal chain review must persist a service-owned artifact");
  const persisted = readJson(persistedPath);
  assert.equal(persisted.schema_version, review.schema_version);
  assert.equal(persisted.review_id, review.review_id);
  assert.equal(persisted.transport_heartbeat_artifact.sha256, chain.heartbeat.transport_heartbeat_artifact.sha256);
  assert.equal(persisted.guided_execution_artifact.sha256, chain.execution.guided_execution_artifact.sha256);
  assert.equal(persisted.proof_authority, "none");
  assert.equal(persisted.can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(persisted), secretTerms);
  assert.doesNotMatch(JSON.stringify(persisted), privilegedPublicTerms);
  assert.doesNotMatch(JSON.stringify(persisted), transportOverclaimTerms);

  assert.throws(
    () =>
      reviewPiCodexLifecycleTerminalExecution(projectRoot, {
        project_id: projectId,
        review_id: "LIFE-TERMINAL-REVIEW-0224-DUP",
        actor: "goal3-task224-reviewer",
        real_pi_runtime_probe_id: "LIFE-PI-RUNTIME-0224",
        pi_install_transcript_path: chain.realPiProbe.pi_install_transcript_path,
        runtime_registration_snapshot_path: chain.realPiProbe.runtime_registration_snapshot_path,
        session_id: "LIFE-OP-SESSION-0224",
        session_manifest_path: chain.session.session_manifest_path,
        transport_recovery_id: "LIFE-TRANSPORT-0224",
        transport_recovery_path: chain.recovery.transport_recovery_path,
        transport_lease_id: "LIFE-TRANSPORT-LEASE-0224",
        transport_lease_path: chain.lease.transport_lease_path,
        transport_heartbeat_id: "LIFE-TRANSPORT-HEARTBEAT-0224-MISSING",
        transport_heartbeat_path:
          ".comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-HEARTBEAT-0224-MISSING/operator-transport-heartbeat.json",
        execution_id: "LIFE-GUIDED-EXEC-0224",
        guided_execution_path: chain.execution.guided_execution_path
      }),
    { code: "PI_CODEX_GUIDED_EXECUTION_TERMINAL_CHAIN_HEARTBEAT_MISSING" },
    "terminal chain review must fail closed without the Task221 heartbeat artifact"
  );
  assert.equal(
    existsSync(join(projectRoot, ".comath/release/pi-codex-lifecycle/LIFE-TERMINAL-REVIEW-0224-DUP/terminal-execution-review.json")),
    false,
    "missing heartbeat reviews must not leave partial artifacts"
  );

  const heartbeatPath = join(projectRoot, chain.heartbeat.transport_heartbeat_path);
  const heartbeatBeforePoison = readFileSync(heartbeatPath, "utf8");
  const poisonedHeartbeat = readJson(heartbeatPath);
  poisonedHeartbeat.lease_artifact.sha256 = "c".repeat(64);
  poisonedHeartbeat.proof_authority = "lean_kernel_clean_replay";
  poisonedHeartbeat.can_certify_ga = true;
  writeJson(heartbeatPath, poisonedHeartbeat);
  assert.throws(
    () =>
      reviewPiCodexLifecycleTerminalExecution(projectRoot, {
        project_id: projectId,
        review_id: "LIFE-TERMINAL-REVIEW-0224-POISONED",
        actor: "goal3-task224-reviewer",
        real_pi_runtime_probe_id: "LIFE-PI-RUNTIME-0224",
        pi_install_transcript_path: chain.realPiProbe.pi_install_transcript_path,
        runtime_registration_snapshot_path: chain.realPiProbe.runtime_registration_snapshot_path,
        session_id: "LIFE-OP-SESSION-0224",
        session_manifest_path: chain.session.session_manifest_path,
        transport_recovery_id: "LIFE-TRANSPORT-0224",
        transport_recovery_path: chain.recovery.transport_recovery_path,
        transport_lease_id: "LIFE-TRANSPORT-LEASE-0224",
        transport_lease_path: chain.lease.transport_lease_path,
        transport_heartbeat_id: "LIFE-TRANSPORT-HEARTBEAT-0224",
        transport_heartbeat_path: chain.heartbeat.transport_heartbeat_path,
        execution_id: "LIFE-GUIDED-EXEC-0224",
        guided_execution_path: chain.execution.guided_execution_path
      }),
    { code: "PI_CODEX_GUIDED_EXECUTION_TERMINAL_CHAIN_HEARTBEAT_INVALID" },
    "terminal chain review must reject poisoned or hash-mismatched heartbeat artifacts"
  );
  writeFileSync(heartbeatPath, heartbeatBeforePoison, "utf8");

  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/pi-codex-lifecycle/terminal-execution-review",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      review_id: "LIFE-TERMINAL-REVIEW-0224-ROUTE",
      actor: "goal3-task224-route token=plain-token",
      real_pi_runtime_probe_id: "LIFE-PI-RUNTIME-0224",
      pi_install_transcript_path: chain.realPiProbe.pi_install_transcript_path,
      runtime_registration_snapshot_path: chain.realPiProbe.runtime_registration_snapshot_path,
      session_id: "LIFE-OP-SESSION-0224",
      session_manifest_path: chain.session.session_manifest_path,
      transport_recovery_id: "LIFE-TRANSPORT-0224",
      transport_recovery_path: chain.recovery.transport_recovery_path,
      transport_lease_id: "LIFE-TRANSPORT-LEASE-0224",
      transport_lease_path: chain.lease.transport_lease_path,
      transport_heartbeat_id: "LIFE-TRANSPORT-HEARTBEAT-0224",
      transport_heartbeat_path: chain.heartbeat.transport_heartbeat_path,
      execution_id: "LIFE-GUIDED-EXEC-0224",
      guided_execution_path: chain.execution.guided_execution_path
    }
  });
  assert.equal(routeResponse.status, 200, JSON.stringify(routeResponse.body));
  assert.equal(routeResponse.body.review.ok, true);
  assert.equal(routeResponse.body.review.terminal_chain_bound, true);
  assert.equal(routeResponse.body.review.proof_authority, "none");
  assert.equal(routeResponse.body.review.can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), secretTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), privilegedPublicTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), transportOverclaimTerms);

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "release.pi_codex_guided_execution_terminal_chain_reviewed" &&
        event.payload.review_id === "LIFE-TERMINAL-REVIEW-0224" &&
        event.payload.transport_heartbeat_id === "LIFE-TRANSPORT-HEARTBEAT-0224" &&
        event.payload.execution_id === "LIFE-GUIDED-EXEC-0224" &&
        event.payload.terminal_chain_bound === true &&
        event.payload.proof_authority === "none" &&
        event.payload.durable_transport_provided === false &&
        event.payload.can_certify_ga === false
    ),
    true,
    "terminal chain review audit event must bind heartbeat plus guided execution without proof or durable-transport overclaim"
  );
  assert.doesNotMatch(JSON.stringify(events), secretTerms);
  assert.doesNotMatch(JSON.stringify(events), privilegedPublicTerms);
  assert.doesNotMatch(JSON.stringify(events), transportOverclaimTerms);
  assert.equal(sha256File(join(projectRoot, chain.session.session_manifest_path)), chain.session.session_manifest_artifact.sha256);
  assert.equal(sha256File(join(projectRoot, chain.recovery.transport_recovery_path)), chain.recovery.transport_recovery_artifact.sha256);
  assert.equal(sha256File(join(projectRoot, chain.lease.transport_lease_path)), chain.lease.transport_lease_artifact.sha256);
} finally {
  if (previousAllowedPrograms === undefined) {
    delete process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS;
  } else {
    process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS = previousAllowedPrograms;
  }
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task224 Pi guided execution terminal chain review tests passed.");
