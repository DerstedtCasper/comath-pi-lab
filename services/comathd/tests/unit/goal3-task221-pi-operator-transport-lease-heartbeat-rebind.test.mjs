import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createComathServer,
  createAgentRun,
  executeProfileAgentRun,
  formatAgentRunLogSseSession,
  getComathdStatus,
  heartbeatPiCodexLifecycleOperatorTransportLease,
  initProject,
  openPiCodexLifecycleOperatorTransportLease,
  persistPiCodexLifecycleOperatorSession,
  readAuditEvents,
  recoverPiCodexLifecycleOperatorTransport,
  spawnWorkstream,
  startAgentRun
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task221-operator-lease-heartbeat-"));
const secretTerms = /COMATH_CODEX_API_KEY|OPENAI_API_KEY|Authorization:\s*Bearer|api_key|token=|plain-token|sk-/i;
const overclaimTerms = /long-lived\s+(?:websocket|sse)|indefinite\s+sse|durable transport provided|formal_replay_passed|lean_kernel_clean_replay/i;

function sha256Text(text) {
  return createHash("sha256").update(text).digest("hex");
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let boundLeaseCounter = 2210;

function writeAdapterFixture() {
  const dir = join(projectRoot, ".tmp", "task221-fixtures");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "operator-lease-heartbeat-adapter.mjs");
  writeFileSync(
    path,
    [
      "process.stdout.write('task221 stdout one\\n');",
      "process.stderr.write('task221 stderr one\\n');",
      "process.stdout.write('# Agent Report\\n\\n## Input Context\\nTask221 heartbeat rebind.\\n\\n## Actions Taken\\nEmitted bounded logs.\\n\\n## Claims Proposed\\nproof_authority: none\\n\\n## Evidence Produced\\nRuntime logs only.\\n\\n## Graph Patch\\nNo trusted mutation.\\n\\n## Blockers\\nNone.\\n\\n## Failed Routes\\nNone.\\n\\n## Self-Review\\nNo proof authority.\\n\\n## Next Actions\\nContinue via bounded heartbeat checkpoints.\\n');",
      ""
    ].join("\n"),
    "utf8"
  );
  return path;
}

async function createBoundLease({ leaseId, leaseTtlMs = 60_000 } = {}) {
  const workstream = spawnWorkstream(projectRoot, {
    project_id: projectId,
    kind: "proof_route",
    goal: "Produce logs for a bounded operator transport heartbeat.",
    created_by: "goal3-task221"
  });
  const execution = await executeProfileAgentRun(projectRoot, {
    project_id: projectId,
    campaign_id: `CAM-${boundLeaseCounter++}`,
    workstream_id: workstream.workstream_id,
    profile_id: "reviewer",
    program: process.execPath,
    adapter_args: [writeAdapterFixture()],
    goal: "Run Task221 log session fixture.",
    context_path: `.comath/workstreams/${workstream.workstream_id}/spec.yaml`,
    actor: "goal3-task221-agent-run"
  });
  const route = `/agent/run/${execution.run.id}/log-session`;
  const artifactInputPath = `.comath/release/pi-codex-lifecycle/task221-input-${leaseId}/runtime-registration.json`;
  mkdirSync(join(projectRoot, `.comath/release/pi-codex-lifecycle/task221-input-${leaseId}`), { recursive: true });
  writeFileSync(join(projectRoot, artifactInputPath), '{"registered":true}\n', "utf8");
  const sessionId = `LIFE-OP-SESSION-${leaseId}`;
  const recoveryId = `LIFE-TRANSPORT-${leaseId}`;
  const session = persistPiCodexLifecycleOperatorSession(projectRoot, {
    project_id: projectId,
    session_id: sessionId,
    actor: "goal3-task221-session",
    pi_host_label: "pi-host-task221",
    session_status: "recoverable_operator_session",
    session_kind: "real_pi_host_manual_install",
    operator_cursor: "stdout:0/stderr:0",
    completed_steps: ["real_pi_install_runtime_probe"],
    artifact_paths: [{ kind: "runtime_registration_snapshot", path: artifactInputPath }],
    last_result_summary: { summary: "session ready for bounded AgentRun log-session heartbeat" }
  });
  const recovery = recoverPiCodexLifecycleOperatorTransport(projectRoot, {
    project_id: projectId,
    session_id: sessionId,
    transport_recovery_id: recoveryId,
    actor: "goal3-task221-recovery",
    session_manifest_path: session.session_manifest_path,
    transport_kind: "bounded_sse_snapshot",
    observed_route: route,
    requested_cursor: {
      operator_event_cursor: "event:0",
      stdout_cursor: "stdout:0",
      stderr_cursor: "stderr:0"
    },
    client_epoch: 1,
    last_seen_event_id: "evt-0",
    reconnect_reason: "bind heartbeat to real AgentRun log session"
  });
  const lease = openPiCodexLifecycleOperatorTransportLease(projectRoot, {
    project_id: projectId,
    session_id: sessionId,
    transport_recovery_id: recoveryId,
    transport_lease_id: `LIFE-TRANSPORT-LEASE-${leaseId}`,
    actor: "goal3-task221-lease token=plain-token",
    session_manifest_path: session.session_manifest_path,
    transport_recovery_path: recovery.transport_recovery_path,
    transport_kind: "bounded_live_sse_lease",
    lease_route: `${route} Authorization: Bearer plain-token long-lived SSE`,
    requested_cursor: {
      operator_event_cursor: "event:1",
      stdout_cursor: "stdout:0",
      stderr_cursor: "stderr:0"
    },
    client_epoch: 2,
    heartbeat_interval_ms: Math.min(10_000, leaseTtlMs),
    lease_ttl_ms: leaseTtlMs,
    last_seen_event_id: "evt-1",
    open_reason: "operator requested heartbeat-capable AgentRun log-session lease"
  });
  return { execution, route, session, recovery, lease };
}

function createRunningBoundLease({ leaseId, leaseTtlMs = 60_000 } = {}) {
  const workstream = spawnWorkstream(projectRoot, {
    project_id: projectId,
    kind: "proof_route",
    goal: "Keep a running service-owned AgentRun log session open for heartbeat growth.",
    created_by: "goal3-task221"
  });
  const queuedRun = createAgentRun(projectRoot, {
    project_id: projectId,
    campaign_id: `CAM-${boundLeaseCounter++}`,
    workstream_id: workstream.workstream_id,
    role: "reviewer",
    model: "task221-live-fixture",
    tool_profile: "proof_route_read_write_own_scope",
    actor: "goal3-task221-live-agent-run"
  });
  const runningRun = startAgentRun(projectRoot, {
    project_id: projectId,
    run_id: queuedRun.id,
    actor: "goal3-task221-live-agent-run"
  });
  const route = `/agent/run/${runningRun.id}/log-session`;
  const artifactInputPath = `.comath/release/pi-codex-lifecycle/task221-input-${leaseId}/runtime-registration.json`;
  mkdirSync(join(projectRoot, `.comath/release/pi-codex-lifecycle/task221-input-${leaseId}`), { recursive: true });
  writeFileSync(join(projectRoot, artifactInputPath), '{"registered":true}\n', "utf8");
  const sessionId = `LIFE-OP-SESSION-${leaseId}`;
  const recoveryId = `LIFE-TRANSPORT-${leaseId}`;
  const session = persistPiCodexLifecycleOperatorSession(projectRoot, {
    project_id: projectId,
    session_id: sessionId,
    actor: "goal3-task221-live-session",
    pi_host_label: "pi-host-task221-live",
    session_status: "recoverable_operator_session",
    session_kind: "real_pi_host_manual_install",
    operator_cursor: "stdout:0/stderr:0",
    completed_steps: ["real_pi_install_runtime_probe"],
    artifact_paths: [{ kind: "runtime_registration_snapshot", path: artifactInputPath }],
    last_result_summary: { summary: "running session ready for bounded live heartbeat" }
  });
  const recovery = recoverPiCodexLifecycleOperatorTransport(projectRoot, {
    project_id: projectId,
    session_id: sessionId,
    transport_recovery_id: recoveryId,
    actor: "goal3-task221-live-recovery",
    session_manifest_path: session.session_manifest_path,
    transport_kind: "bounded_sse_snapshot",
    observed_route: route,
    requested_cursor: {
      operator_event_cursor: "event:0",
      stdout_cursor: "stdout:0",
      stderr_cursor: "stderr:0"
    },
    client_epoch: 1,
    last_seen_event_id: "evt-0",
    reconnect_reason: "bind heartbeat to running AgentRun log session"
  });
  const lease = openPiCodexLifecycleOperatorTransportLease(projectRoot, {
    project_id: projectId,
    session_id: sessionId,
    transport_recovery_id: recoveryId,
    transport_lease_id: `LIFE-TRANSPORT-LEASE-${leaseId}`,
    actor: "goal3-task221-live-lease",
    session_manifest_path: session.session_manifest_path,
    transport_recovery_path: recovery.transport_recovery_path,
    transport_kind: "bounded_live_sse_lease",
    lease_route: route,
    requested_cursor: {
      operator_event_cursor: "event:1",
      stdout_cursor: "stdout:0",
      stderr_cursor: "stderr:0"
    },
    client_epoch: 2,
    heartbeat_interval_ms: Math.min(10_000, leaseTtlMs),
    lease_ttl_ms: leaseTtlMs,
    last_seen_event_id: "evt-1",
    open_reason: "operator requested heartbeat-capable running AgentRun log-session lease"
  });
  return { run: runningRun, route, session, recovery, lease };
}

const init = initProject({ name: "Goal3 Task221 Operator Lease Heartbeat Rebind", root_path: projectRoot });
const projectId = init.project.project_id;

try {
  assert.equal(
    getComathdStatus().capabilities.includes("pi_codex_operator_transport_lease_heartbeat_rebind"),
    true,
    "Task221 capability ledger must advertise bounded operator transport heartbeat/rebind without claiming durable transport"
  );

  const { execution, session, recovery, lease } = await createBoundLease({ leaseId: "0221" });
  const sessionPath = join(projectRoot, session.session_manifest_path);
  const recoveryPath = join(projectRoot, recovery.transport_recovery_path);
  const leasePath = join(projectRoot, lease.transport_lease_path);
  const originalSessionSha = sha256File(sessionPath);
  const originalRecoverySha = sha256File(recoveryPath);
  const originalLeaseSha = sha256File(leasePath);
  const heartbeatCursor = {
    operator_event_cursor: "event:2",
    stdout_cursor: `stdout:${lease.agent_run_log_session_binding.next_cursor.stdout}`,
    stderr_cursor: `stderr:${lease.agent_run_log_session_binding.next_cursor.stderr}`
  };
  const expectedHeartbeatSession = formatAgentRunLogSseSession(projectRoot, {
    project_id: projectId,
    run_id: execution.run.id,
    cursor: lease.agent_run_log_session_binding.next_cursor,
    max_bytes: 1024,
    max_events: 3,
    retry_ms: 500,
    actor: "goal3-task221-expected-heartbeat"
  });

  const heartbeat = heartbeatPiCodexLifecycleOperatorTransportLease(projectRoot, {
    project_id: projectId,
    session_id: session.session_id,
    transport_recovery_id: recovery.transport_recovery_id,
    transport_lease_id: lease.transport_lease_id,
    transport_heartbeat_id: "LIFE-TRANSPORT-HEARTBEAT-0221",
    actor: "goal3-task221-heartbeat token=plain-token",
    session_manifest_path: session.session_manifest_path,
    transport_recovery_path: recovery.transport_recovery_path,
    transport_lease_path: lease.transport_lease_path,
    requested_cursor: heartbeatCursor,
    client_epoch: 3,
    last_seen_event_id: "evt-2",
    heartbeat_reason: "operator heartbeat for bounded AgentRun log-session rebind"
  });

  assert.equal(heartbeat.schema_version, "comath.pi_codex_lifecycle_operator_transport_heartbeat.v1");
  assert.equal(heartbeat.heartbeat_status, "operator_transport_heartbeat_rebound");
  assert.equal(heartbeat.transport_heartbeat_id, "LIFE-TRANSPORT-HEARTBEAT-0221");
  assert.equal(heartbeat.transport_lease_id, lease.transport_lease_id);
  assert.equal(heartbeat.transport_recovery_id, recovery.transport_recovery_id);
  assert.equal(heartbeat.session_id, session.session_id);
  assert.equal(heartbeat.operator_transport_log_session_rebound, true);
  assert.equal(heartbeat.operator_transport_lease_bound, true);
  assert.equal(heartbeat.lease_still_valid, true);
  assert.equal(heartbeat.agent_run_log_session_binding.binding_source, "service_owned_agent_run_log_session");
  assert.equal(heartbeat.agent_run_log_session_binding.project_id, projectId);
  assert.equal(heartbeat.agent_run_log_session_binding.run_id, execution.run.id);
  assert.equal(heartbeat.agent_run_log_session_binding.route, lease.lease_route);
  assert.deepEqual(heartbeat.agent_run_log_session_binding.cursor, lease.agent_run_log_session_binding.next_cursor);
  assert.equal(heartbeat.agent_run_log_session_binding.event_count, expectedHeartbeatSession.events.length);
  assert.equal(heartbeat.agent_run_log_session_binding.body_sha256, sha256Text(expectedHeartbeatSession.body));
  assert.equal(heartbeat.lease_artifact.sha256, originalLeaseSha);
  assert.equal(heartbeat.session_manifest_artifact.sha256, originalSessionSha);
  assert.equal(heartbeat.transport_recovery_artifact.sha256, originalRecoverySha);
  assert.equal(heartbeat.bounded_heartbeat_checkpoint_provided, true);
  assert.equal(heartbeat.durable_transport_provided, false);
  assert.equal(heartbeat.live_transport_open, false);
  assert.equal(heartbeat.indefinite_stream_open, false);
  assert.equal(heartbeat.long_lived_websocket_provided, false);
  assert.equal(heartbeat.long_lived_sse_provided, false);
  assert.equal(heartbeat.pi_direct_write_allowed, false);
  assert.equal(heartbeat.direct_trusted_state_mutation, false);
  assert.equal(heartbeat.proof_authority, "none");
  assert.equal(heartbeat.can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(heartbeat), secretTerms);
  assert.doesNotMatch(JSON.stringify(heartbeat), overclaimTerms);
  assert.equal(sha256File(sessionPath), originalSessionSha, "heartbeat must not mutate the operator session manifest");
  assert.equal(sha256File(recoveryPath), originalRecoverySha, "heartbeat must not mutate the recovery checkpoint");
  assert.equal(sha256File(leasePath), originalLeaseSha, "heartbeat must not mutate the transport lease");
  assert.equal(existsSync(join(projectRoot, heartbeat.transport_heartbeat_path)), true);

  const persisted = readJson(join(projectRoot, heartbeat.transport_heartbeat_path));
  assert.equal(persisted.operator_transport_log_session_rebound, true);
  assert.equal(persisted.agent_run_log_session_binding.body_sha256, sha256Text(expectedHeartbeatSession.body));
  assert.equal(persisted.lease_artifact.sha256, originalLeaseSha);
  assert.equal(persisted.proof_authority, "none");
  assert.equal(persisted.can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(persisted), secretTerms);
  assert.doesNotMatch(JSON.stringify(persisted), overclaimTerms);

  const server = createComathServer();
  const routeResult = await server.inject({
    method: "POST",
    path: "/release/pi-codex-lifecycle/operator-transport-heartbeat",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      session_id: session.session_id,
      transport_recovery_id: recovery.transport_recovery_id,
      transport_lease_id: lease.transport_lease_id,
      transport_heartbeat_id: "LIFE-TRANSPORT-HEARTBEAT-0221-ROUTE",
      actor: "goal3-task221-route token=plain-token",
      session_manifest_path: session.session_manifest_path,
      transport_recovery_path: recovery.transport_recovery_path,
      transport_lease_path: lease.transport_lease_path,
      requested_cursor: heartbeatCursor,
      client_epoch: 4,
      last_seen_event_id: "evt-3",
      heartbeat_reason: "route heartbeat for bounded rebind"
    }
  });
  assert.equal(routeResult.status, 200, JSON.stringify(routeResult.body));
  assert.equal(routeResult.body.heartbeat.operator_transport_log_session_rebound, true);
  assert.equal(routeResult.body.heartbeat.proof_authority, "none");
  assert.equal(routeResult.body.heartbeat.can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(routeResult.body), secretTerms);
  assert.doesNotMatch(JSON.stringify(routeResult.body), overclaimTerms);

  assert.throws(
    () =>
      heartbeatPiCodexLifecycleOperatorTransportLease(projectRoot, {
        project_id: projectId,
        session_id: session.session_id,
        transport_recovery_id: recovery.transport_recovery_id,
        transport_lease_id: lease.transport_lease_id,
        transport_heartbeat_id: "LIFE-TRANSPORT-HEARTBEAT-0221",
        actor: "goal3-task221-duplicate",
        session_manifest_path: session.session_manifest_path,
        transport_recovery_path: recovery.transport_recovery_path,
        transport_lease_path: lease.transport_lease_path,
        client_epoch: 4
      }),
    { code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_HEARTBEAT_ALREADY_EXISTS" },
    "Task221 heartbeat ids must be append-only and must not overwrite existing checkpoints"
  );

  assert.throws(
    () =>
      heartbeatPiCodexLifecycleOperatorTransportLease(projectRoot, {
        project_id: projectId,
        session_id: session.session_id,
        transport_recovery_id: recovery.transport_recovery_id,
        transport_lease_id: lease.transport_lease_id,
        transport_heartbeat_id: "LIFE-TRANSPORT-HEARTBEAT-0221-STALE-EPOCH",
        actor: "goal3-task221-stale-epoch",
        session_manifest_path: session.session_manifest_path,
        transport_recovery_path: recovery.transport_recovery_path,
        transport_lease_path: lease.transport_lease_path,
        client_epoch: 1
      }),
    { code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_HEARTBEAT_CHAIN_MISMATCH" },
    "Task221 heartbeat must fail closed when the client epoch is behind the bounded lease"
  );

  const live = createRunningBoundLease({ leaseId: "0221-LIVE" });
  const liveLogsDir = join(projectRoot, ".tmp", "comath", live.run.id, "logs");
  mkdirSync(liveLogsDir, { recursive: true });
  appendFileSync(join(liveLogsDir, "stdout.log"), "task221 live stdout after lease\n", "utf8");
  const liveExpectedSession = formatAgentRunLogSseSession(projectRoot, {
    project_id: projectId,
    run_id: live.run.id,
    cursor: live.lease.agent_run_log_session_binding.next_cursor,
    max_bytes: 1024,
    max_events: 3,
    retry_ms: 500,
    actor: "goal3-task221-live-expected-heartbeat"
  });
  const liveHeartbeat = heartbeatPiCodexLifecycleOperatorTransportLease(projectRoot, {
    project_id: projectId,
    session_id: live.session.session_id,
    transport_recovery_id: live.recovery.transport_recovery_id,
    transport_lease_id: live.lease.transport_lease_id,
    transport_heartbeat_id: "LIFE-TRANSPORT-HEARTBEAT-0221-LIVE",
    actor: "goal3-task221-live-heartbeat",
    session_manifest_path: live.session.session_manifest_path,
    transport_recovery_path: live.recovery.transport_recovery_path,
    transport_lease_path: live.lease.transport_lease_path,
    client_epoch: 3,
    last_seen_event_id: "evt-live-2",
    heartbeat_reason: "operator heartbeat after live AgentRun log growth"
  });
  assert.equal(liveHeartbeat.agent_run_log_session_binding.run_id, live.run.id);
  assert.equal(liveHeartbeat.agent_run_log_session_binding.body_sha256, sha256Text(liveExpectedSession.body));
  assert.notEqual(
    liveHeartbeat.agent_run_log_session_binding.body_sha256,
    live.lease.agent_run_log_session_binding.body_sha256,
    "live heartbeat must allow same-run logs to advance beyond the original lease snapshot"
  );
  assert.equal(liveHeartbeat.lease_artifact.sha256, sha256File(join(projectRoot, live.lease.transport_lease_path)));
  assert.equal(liveHeartbeat.proof_authority, "none");
  assert.equal(liveHeartbeat.can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(liveHeartbeat), secretTerms);
  assert.doesNotMatch(JSON.stringify(liveHeartbeat), overclaimTerms);

  const tampered = await createBoundLease({ leaseId: "0221-TAMPERED" });
  const tamperedLeasePath = join(projectRoot, tampered.lease.transport_lease_path);
  const tamperedLease = readJson(tamperedLeasePath);
  tamperedLease.agent_run_log_session_binding.body_sha256 = "b".repeat(64);
  writeJson(tamperedLeasePath, tamperedLease);
  assert.throws(
    () =>
      heartbeatPiCodexLifecycleOperatorTransportLease(projectRoot, {
        project_id: projectId,
        session_id: tampered.session.session_id,
        transport_recovery_id: tampered.recovery.transport_recovery_id,
        transport_lease_id: tampered.lease.transport_lease_id,
        transport_heartbeat_id: "LIFE-TRANSPORT-HEARTBEAT-0221-TAMPERED",
        actor: "goal3-task221-tampered",
        session_manifest_path: tampered.session.session_manifest_path,
        transport_recovery_path: tampered.recovery.transport_recovery_path,
        transport_lease_path: tampered.lease.transport_lease_path,
        client_epoch: 3
      }),
    { code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_HEARTBEAT_LEASE_INVALID" },
    "Task221 heartbeat must reject tampered lease log-session body hashes"
  );
  assert.equal(
    existsSync(
      join(
        projectRoot,
        ".comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-HEARTBEAT-0221-TAMPERED/operator-transport-heartbeat.json"
      )
    ),
    false,
    "tampered leases must not leave partial heartbeat artifacts"
  );

  const expired = await createBoundLease({ leaseId: "0221-EXPIRED", leaseTtlMs: 1 });
  await sleep(20);
  assert.throws(
    () =>
      heartbeatPiCodexLifecycleOperatorTransportLease(projectRoot, {
        project_id: projectId,
        session_id: expired.session.session_id,
        transport_recovery_id: expired.recovery.transport_recovery_id,
        transport_lease_id: expired.lease.transport_lease_id,
        transport_heartbeat_id: "LIFE-TRANSPORT-HEARTBEAT-0221-EXPIRED",
        actor: "goal3-task221-expired",
        session_manifest_path: expired.session.session_manifest_path,
        transport_recovery_path: expired.recovery.transport_recovery_path,
        transport_lease_path: expired.lease.transport_lease_path,
        client_epoch: 3
      }),
    { code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_HEARTBEAT_LEASE_INVALID" },
    "Task221 heartbeat must reject expired leases rather than silently extending them"
  );

  assert.throws(
    () =>
      heartbeatPiCodexLifecycleOperatorTransportLease(projectRoot, {
        project_id: "PROJ-9999",
        session_id: session.session_id,
        transport_recovery_id: recovery.transport_recovery_id,
        transport_lease_id: lease.transport_lease_id,
        transport_heartbeat_id: "LIFE-TRANSPORT-HEARTBEAT-0221-WRONG-PROJECT",
        actor: "goal3-task221-wrong-project",
        session_manifest_path: session.session_manifest_path,
        transport_recovery_path: recovery.transport_recovery_path,
        transport_lease_path: lease.transport_lease_path,
        client_epoch: 3
      }),
    { code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_HEARTBEAT_SESSION_INVALID" },
    "Task221 heartbeat must reject wrong-project lifecycle chains before writing a checkpoint"
  );

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "release.pi_codex_lifecycle_operator_transport_heartbeat_recorded" &&
        event.payload.transport_heartbeat_id === "LIFE-TRANSPORT-HEARTBEAT-0221" &&
        event.payload.transport_lease_id === lease.transport_lease_id &&
        event.payload.operator_transport_log_session_rebound === true &&
        event.payload.agent_run_id === execution.run.id &&
        event.payload.agent_run_log_session_body_sha256 === sha256Text(expectedHeartbeatSession.body) &&
        event.payload.bounded_heartbeat_checkpoint_provided === true &&
        event.payload.proof_authority === "none" &&
        event.payload.durable_transport_provided === false &&
        event.payload.can_certify_ga === false
    ),
    true,
    "Task221 heartbeat audit event must bind the service-owned AgentRun log-session without proof or durable-transport overclaim"
  );
  assert.doesNotMatch(JSON.stringify(events), secretTerms);
  assert.doesNotMatch(JSON.stringify(events), overclaimTerms);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task221 Pi operator transport lease heartbeat/rebind tests passed.");
