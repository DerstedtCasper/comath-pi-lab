import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createComathServer,
  executeProfileAgentRun,
  formatAgentRunLogSseSession,
  getComathdStatus,
  heartbeatPiCodexLifecycleOperatorTransportLease,
  initProject,
  openPiCodexLifecycleOperatorTransportLease,
  persistPiCodexLifecycleOperatorSession,
  probePiCodexRealPiInstallRuntimeRegistration,
  readAuditEvents,
  recordPiCodexLifecycleGuidedRealPiExecution,
  recordPiCodexLifecycleOperatorServiceTransportContract,
  recoverPiCodexLifecycleOperatorTransport,
  reviewPiCodexLifecycleTerminalExecution,
  spawnWorkstream
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task225-operator-service-transport-"));
const previousAllowedPrograms = process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS;
const secretTerms = /COMATH_CODEX_API_KEY|OPENAI_API_KEY|Authorization:\s*Bearer|api_key|token=|plain-token|sk-/i;
const privilegedPublicTerms =
  /clean_replay_passed|completed_formal_proof|formally_checked|proven|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|kernel_checked|proof_success/i;
const transportOverclaimTerms =
  /long[- ]lived\s+(?:websocket|sse)|indefinite\s+sse|terminal transport recovered live|durable transport provided/i;

function sha256Text(text) {
  return createHash("sha256").update(text).digest("hex");
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeAgentRunAdapterFixture() {
  const dir = join(projectRoot, ".tmp", "task225-fixtures");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "operator-service-transport-adapter.mjs");
  writeFileSync(
    path,
    [
      "process.stdout.write('task225 stdout before heartbeat\\n');",
      "process.stderr.write('task225 stderr before heartbeat\\n');",
      "process.stdout.write('# Agent Report\\n\\n## Input Context\\nTask225 maintained transport contract fixture.\\n\\n## Actions Taken\\nEmitted bounded logs.\\n\\n## Claims Proposed\\nproof_authority: none\\n\\n## Evidence Produced\\nRuntime logs only.\\n\\n## Graph Patch\\nNo trusted mutation.\\n\\n## Blockers\\nNone.\\n\\n## Failed Routes\\nNone.\\n\\n## Self-Review\\nNo durable transport.\\n\\n## Next Actions\\nRecord maintained primitive contract.\\n');",
      ""
    ].join("\n"),
    "utf8"
  );
  return path;
}

async function createReviewedTerminalChain(ids) {
  const workstream = spawnWorkstream(projectRoot, {
    project_id: projectId,
    kind: "proof_route",
    goal: "Task225 maintained operator/service transport fixture.",
    created_by: "goal3-task225"
  });
  const agentRun = await executeProfileAgentRun(projectRoot, {
    project_id: projectId,
    campaign_id: `CAM-${ids.suffix}`,
    workstream_id: workstream.workstream_id,
    profile_id: "reviewer",
    program: process.execPath,
    adapter_args: [writeAgentRunAdapterFixture()],
    goal: "Run Task225 maintained transport fixture.",
    context_path: `.comath/workstreams/${workstream.workstream_id}/spec.yaml`,
    actor: "goal3-task225-agent-run"
  });
  const route = `/agent/run/${agentRun.run.id}/log-session`;

  const realPiProbe = probePiCodexRealPiInstallRuntimeRegistration(
    projectRoot,
    {
      project_id: projectId,
      probe_id: ids.probeId,
      actor: "goal3-task225-real-pi-probe",
      pi_host_label: "pi-host-task225",
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
        stdout: JSON.stringify({ step, imported: true, registered: true, host_confirmation: true }),
        stderr: ""
      })
    }
  );

  const session = persistPiCodexLifecycleOperatorSession(projectRoot, {
    project_id: projectId,
    session_id: ids.sessionId,
    actor: "goal3-task225-session",
    pi_host_label: "pi-host-task225",
    session_status: "recoverable_operator_session",
    session_kind: "real_pi_host_automated_install",
    operator_cursor: "stdout:0/stderr:0",
    completed_steps: ["real_pi_install_runtime_probe"],
    artifact_paths: [{ kind: "runtime_registration_snapshot", path: realPiProbe.runtime_registration_snapshot_path }],
    last_result_summary: { summary: "session ready for maintained transport contract" }
  });

  const recovery = recoverPiCodexLifecycleOperatorTransport(projectRoot, {
    project_id: projectId,
    session_id: ids.sessionId,
    transport_recovery_id: ids.recoveryId,
    actor: "goal3-task225-recovery",
    session_manifest_path: session.session_manifest_path,
    transport_kind: "bounded_sse_snapshot",
    observed_route: route,
    requested_cursor: { operator_event_cursor: "event:4", stdout_cursor: "stdout:0", stderr_cursor: "stderr:0" },
    client_epoch: 4,
    last_seen_event_id: "evt-4",
    reconnect_reason: "maintained transport contract recovery checkpoint"
  });

  const lease = openPiCodexLifecycleOperatorTransportLease(projectRoot, {
    project_id: projectId,
    session_id: ids.sessionId,
    transport_recovery_id: ids.recoveryId,
    transport_lease_id: ids.leaseId,
    actor: "goal3-task225-lease token=plain-token",
    session_manifest_path: session.session_manifest_path,
    transport_recovery_path: recovery.transport_recovery_path,
    transport_kind: "bounded_live_sse_lease",
    lease_route: `${route} Authorization: Bearer plain-token durable transport provided`,
    requested_cursor: { operator_event_cursor: "event:5", stdout_cursor: "stdout:0", stderr_cursor: "stderr:0" },
    client_epoch: 5,
    heartbeat_interval_ms: 10_000,
    lease_ttl_ms: 60_000,
    last_seen_event_id: "evt-5",
    open_reason: "bounded lease before maintained transport contract"
  });

  const heartbeat = heartbeatPiCodexLifecycleOperatorTransportLease(projectRoot, {
    project_id: projectId,
    session_id: ids.sessionId,
    transport_recovery_id: ids.recoveryId,
    transport_lease_id: ids.leaseId,
    transport_heartbeat_id: ids.heartbeatId,
    actor: "goal3-task225-heartbeat proof_success token=plain-token",
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
    heartbeat_reason: "heartbeat before maintained transport contract"
  });

  const execution = recordPiCodexLifecycleGuidedRealPiExecution(projectRoot, {
    project_id: projectId,
    execution_id: ids.executionId,
    actor: "goal3-task225-guided kernel_checked long-lived SSE",
    real_pi_runtime_probe_id: ids.probeId,
    pi_install_transcript_path: realPiProbe.pi_install_transcript_path,
    runtime_registration_snapshot_path: realPiProbe.runtime_registration_snapshot_path,
    session_id: ids.sessionId,
    session_manifest_path: session.session_manifest_path,
    transport_recovery_id: ids.recoveryId,
    transport_recovery_path: recovery.transport_recovery_path,
    transport_lease_id: ids.leaseId,
    transport_lease_path: lease.transport_lease_path,
    pi_host_label: "pi-host-task225",
    observed_routes: ["/cm:release lifecycle-operator-transport-heartbeat", "/cm:release lifecycle-guided-real-pi-execution"],
    operator_command_summary: "operator recorded guided lifecycle before maintained transport contract",
    final_operator_cursor: { operator_event_cursor: "event:8", stdout_cursor: "stdout:256", stderr_cursor: "stderr:0" },
    execution_outcome: "operator_guided_run_observed",
    next_recommended_route: "/release/pi-codex-lifecycle/terminal-execution-review"
  });

  const review = reviewPiCodexLifecycleTerminalExecution(projectRoot, {
    project_id: projectId,
    review_id: ids.reviewId,
    actor: "goal3-task225-terminal-review",
    real_pi_runtime_probe_id: ids.probeId,
    pi_install_transcript_path: realPiProbe.pi_install_transcript_path,
    runtime_registration_snapshot_path: realPiProbe.runtime_registration_snapshot_path,
    session_id: ids.sessionId,
    session_manifest_path: session.session_manifest_path,
    transport_recovery_id: ids.recoveryId,
    transport_recovery_path: recovery.transport_recovery_path,
    transport_lease_id: ids.leaseId,
    transport_lease_path: lease.transport_lease_path,
    transport_heartbeat_id: ids.heartbeatId,
    transport_heartbeat_path: heartbeat.transport_heartbeat_path,
    execution_id: ids.executionId,
    guided_execution_path: execution.guided_execution_path
  });

  return { agentRun, realPiProbe, session, recovery, lease, heartbeat, execution, review };
}

const init = initProject({ name: "Goal3 Task225 Operator Service Transport Contract", root_path: projectRoot });
const projectId = init.project.project_id;

try {
  process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS = JSON.stringify([process.execPath]);
  assert.equal(
    typeof recordPiCodexLifecycleOperatorServiceTransportContract,
    "function",
    "Task225 must export a service-owned maintained operator/service transport contract recorder"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("pi_codex_operator_service_transport_contract"),
    true,
    "Task225 capability ledger must advertise maintained transport contract evidence"
  );

  const chain = await createReviewedTerminalChain({
    suffix: "0225",
    probeId: "LIFE-PI-RUNTIME-0225",
    sessionId: "LIFE-OP-SESSION-0225",
    recoveryId: "LIFE-TRANSPORT-0225",
    leaseId: "LIFE-TRANSPORT-LEASE-0225",
    heartbeatId: "LIFE-TRANSPORT-HEARTBEAT-0225",
    executionId: "LIFE-GUIDED-EXEC-0225",
    reviewId: "LIFE-TERMINAL-REVIEW-0225"
  });
  const expectedSession = formatAgentRunLogSseSession(projectRoot, {
    project_id: projectId,
    run_id: chain.agentRun.run.id,
    cursor: chain.heartbeat.agent_run_log_session_binding.next_cursor,
    max_bytes: 4096,
    max_events: 2,
    retry_ms: 750,
    actor: "goal3-task225-expected-transport-contract"
  });

  const contract = recordPiCodexLifecycleOperatorServiceTransportContract(projectRoot, {
    project_id: projectId,
    transport_contract_id: "LIFE-TRANSPORT-CONTRACT-0225",
    actor: `goal3-task225-contract ${projectRoot}\\secret.txt Authorization: Bearer plain-token proof_success durable transport provided`,
    terminal_review_id: "LIFE-TERMINAL-REVIEW-0225",
    terminal_review_path: chain.review.review_path,
    max_bytes: 4096,
    max_events: 2,
    retry_ms: 750,
    client_transport_primitive: "pi_fetch_get_text",
    service_transport_primitive: "node_http_agent_run_log_session_route"
  });

  assert.equal(contract.schema_version, "comath.pi_codex_operator_service_transport_contract.v1");
  assert.equal(contract.contract_status, "maintained_bounded_transport_contract_recorded");
  assert.equal(contract.project_id, projectId);
  assert.equal(contract.transport_contract_id, "LIFE-TRANSPORT-CONTRACT-0225");
  assert.equal(contract.terminal_review_id, chain.review.review_id);
  assert.equal(contract.terminal_review_artifact.sha256, sha256Text(readFileSync(join(projectRoot, chain.review.review_path), "utf8")));
  assert.equal(contract.transport_heartbeat_id, chain.heartbeat.transport_heartbeat_id);
  assert.equal(contract.transport_heartbeat_artifact.sha256, chain.heartbeat.transport_heartbeat_artifact.sha256);
  assert.equal(contract.guided_execution_artifact.sha256, chain.execution.guided_execution_artifact.sha256);
  assert.equal(contract.service_transport_primitive, "node_http_agent_run_log_session_route");
  assert.equal(contract.client_transport_primitive, "pi_fetch_get_text");
  assert.equal(contract.http_method, "GET");
  assert.equal(contract.service_route, chain.heartbeat.agent_run_log_session_binding.route);
  assert.equal(contract.content_type, "text/event-stream; charset=utf-8");
  assert.deepEqual(contract.resume_cursor, chain.heartbeat.agent_run_log_session_binding.next_cursor);
  assert.equal(contract.bounded_limits.max_bytes, 4096);
  assert.equal(contract.bounded_limits.max_events, 2);
  assert.equal(contract.bounded_limits.retry_ms, 750);
  assert.equal(contract.log_session_body_sha256, sha256Text(expectedSession.body));
  assert.equal(contract.log_session_event_count, expectedSession.events.length);
  assert.equal(contract.log_session_next_cursor.stdout, expectedSession.next_cursor.stdout);
  assert.equal(contract.log_session_next_cursor.stderr, expectedSession.next_cursor.stderr);
  assert.equal(contract.maintained_transport_primitive_bound, true);
  assert.equal(contract.terminal_review_bound, true);
  assert.equal(contract.heartbeat_bound, true);
  assert.equal(contract.durable_transport_provided, false);
  assert.equal(contract.live_transport_open, false);
  assert.equal(contract.indefinite_stream_open, false);
  assert.equal(contract.long_lived_websocket_provided, false);
  assert.equal(contract.long_lived_sse_provided, false);
  assert.equal(contract.pi_direct_write_allowed, false);
  assert.equal(contract.direct_trusted_state_mutation, false);
  assert.equal(contract.proof_authority, "none");
  assert.equal(contract.can_promote_claim, false);
  assert.equal(contract.can_certify_ga, false);
  assert.equal(JSON.stringify(contract).includes(projectRoot), false, "contract result must not expose host paths");
  assert.doesNotMatch(JSON.stringify(contract), secretTerms);
  assert.doesNotMatch(JSON.stringify(contract), privilegedPublicTerms);
  assert.doesNotMatch(JSON.stringify(contract), transportOverclaimTerms);

  const persistedPath = join(projectRoot, contract.transport_contract_path);
  assert.equal(existsSync(persistedPath), true, "maintained transport contract must persist append-only evidence");
  const persisted = readJson(persistedPath);
  assert.equal(persisted.transport_contract_artifact, undefined, "persisted contract must not self-hash recursively");
  assert.equal(persisted.proof_authority, "none");
  assert.equal(persisted.can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(persisted), secretTerms);
  assert.doesNotMatch(JSON.stringify(persisted), privilegedPublicTerms);
  assert.doesNotMatch(JSON.stringify(persisted), transportOverclaimTerms);

  assert.throws(
    () =>
      recordPiCodexLifecycleOperatorServiceTransportContract(projectRoot, {
        project_id: projectId,
        transport_contract_id: "LIFE-TRANSPORT-CONTRACT-0225-MISSING",
        actor: "goal3-task225-missing-review",
        terminal_review_id: "LIFE-TERMINAL-REVIEW-0225-MISSING",
        terminal_review_path:
          ".comath/release/pi-codex-lifecycle/LIFE-TERMINAL-REVIEW-0225-MISSING/terminal-execution-review.json"
      }),
    { code: "PI_CODEX_OPERATOR_SERVICE_TRANSPORT_CONTRACT_TERMINAL_REVIEW_MISSING" },
    "maintained transport contract must fail closed without a terminal review artifact"
  );
  assert.equal(
    existsSync(
      join(
        projectRoot,
        ".comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-CONTRACT-0225-MISSING/operator-service-transport-contract.json"
      )
    ),
    false,
    "missing terminal review must not leave a partial transport contract"
  );

  const heartbeatPath = join(projectRoot, chain.heartbeat.transport_heartbeat_path);
  const heartbeatBeforePoison = readFileSync(heartbeatPath, "utf8");
  const poisonedHeartbeat = readJson(heartbeatPath);
  poisonedHeartbeat.agent_run_log_session_binding.body_sha256 = "d".repeat(64);
  writeJson(heartbeatPath, poisonedHeartbeat);
  assert.throws(
    () =>
      recordPiCodexLifecycleOperatorServiceTransportContract(projectRoot, {
        project_id: projectId,
        transport_contract_id: "LIFE-TRANSPORT-CONTRACT-0225-STALE-HEARTBEAT",
        actor: "goal3-task225-stale-heartbeat",
        terminal_review_id: chain.review.review_id,
        terminal_review_path: chain.review.review_path
      }),
    { code: "PI_CODEX_OPERATOR_SERVICE_TRANSPORT_CONTRACT_HEARTBEAT_STALE" },
    "maintained transport contract must reject terminal reviews whose heartbeat artifact has changed"
  );
  writeFileSync(heartbeatPath, heartbeatBeforePoison, "utf8");

  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/pi-codex-lifecycle/operator-service-transport-contract",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      transport_contract_id: "LIFE-TRANSPORT-CONTRACT-0225-ROUTE",
      actor: "goal3-task225-route token=plain-token long-lived websocket",
      terminal_review_id: chain.review.review_id,
      terminal_review_path: chain.review.review_path,
      max_bytes: 1024,
      max_events: 1,
      retry_ms: 500,
      durable_transport_provided: true,
      proof_authority: "lean_kernel_clean_replay"
    }
  });
  assert.equal(routeResponse.status, 200, JSON.stringify(routeResponse.body));
  assert.equal(routeResponse.body.contract.service_transport_primitive, "node_http_agent_run_log_session_route");
  assert.equal(routeResponse.body.contract.client_transport_primitive, "pi_fetch_get_text");
  assert.equal(routeResponse.body.contract.durable_transport_provided, false);
  assert.equal(routeResponse.body.contract.proof_authority, "none");
  assert.equal(routeResponse.body.contract.can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), secretTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), privilegedPublicTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), transportOverclaimTerms);

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "release.pi_codex_operator_service_transport_contract_recorded" &&
        event.payload.transport_contract_id === "LIFE-TRANSPORT-CONTRACT-0225" &&
        event.payload.terminal_review_id === chain.review.review_id &&
        event.payload.transport_heartbeat_id === chain.heartbeat.transport_heartbeat_id &&
        event.payload.service_transport_primitive === "node_http_agent_run_log_session_route" &&
        event.payload.client_transport_primitive === "pi_fetch_get_text" &&
        event.payload.durable_transport_provided === false &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "maintained transport contract audit event must bind primitives without durable/proof overclaim"
  );
  assert.doesNotMatch(JSON.stringify(events), secretTerms);
  assert.doesNotMatch(JSON.stringify(events), privilegedPublicTerms);
  assert.doesNotMatch(JSON.stringify(events), transportOverclaimTerms);
} finally {
  if (previousAllowedPrograms === undefined) {
    delete process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS;
  } else {
    process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS = previousAllowedPrograms;
  }
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task225 Pi operator/service maintained transport contract tests passed.");
