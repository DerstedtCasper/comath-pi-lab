import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  executeProfileAgentRun,
  formatAgentRunLogSseSession,
  getComathdStatus,
  initProject,
  openPiCodexLifecycleOperatorTransportLease,
  persistPiCodexLifecycleOperatorSession,
  readAuditEvents,
  recoverPiCodexLifecycleOperatorTransport,
  spawnWorkstream
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task220-operator-lease-log-session-"));
const secretTerms = /COMATH_CODEX_API_KEY|OPENAI_API_KEY|Authorization:\s*Bearer|api_key|token=|plain-token|sk-/i;
const overclaimTerms = /long-lived\s+(?:websocket|sse)|indefinite\s+sse|durable transport provided|formal_replay_passed|lean_kernel_clean_replay/i;

function sha256Text(text) {
  return createHash("sha256").update(text).digest("hex");
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeAdapterFixture() {
  const dir = join(projectRoot, ".tmp", "task220-fixtures");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "operator-lease-log-session-adapter.mjs");
  writeFileSync(
    path,
    [
      "process.stdout.write('task220 stdout one\\n');",
      "process.stderr.write('task220 stderr one\\n');",
      "process.stdout.write('# Agent Report\\n\\n## Input Context\\nTask220 AgentRun log-session binding.\\n\\n## Actions Taken\\nEmitted bounded logs.\\n\\n## Claims Proposed\\nproof_authority: none\\n\\n## Evidence Produced\\nRuntime logs only.\\n\\n## Graph Patch\\nNo trusted mutation.\\n\\n## Blockers\\nNone.\\n\\n## Failed Routes\\nNone.\\n\\n## Self-Review\\nNo proof authority.\\n\\n## Next Actions\\nContinue via release gates.\\n');",
      ""
    ].join("\n"),
    "utf8"
  );
  return path;
}

try {
  const init = initProject({ name: "Goal3 Task220 Operator Lease Log Session Binding", root_path: projectRoot });
  const projectId = init.project.project_id;
  const workstream = spawnWorkstream(projectRoot, {
    project_id: projectId,
    kind: "proof_route",
    goal: "Produce logs for a bounded operator transport lease.",
    created_by: "goal3-task220"
  });
  const execution = await executeProfileAgentRun(projectRoot, {
    project_id: projectId,
    campaign_id: "CAM-0220",
    workstream_id: workstream.workstream_id,
    profile_id: "reviewer",
    program: process.execPath,
    adapter_args: [writeAdapterFixture()],
    goal: "Run Task220 log session fixture.",
    context_path: `.comath/workstreams/${workstream.workstream_id}/spec.yaml`,
    actor: "goal3-task220-agent-run"
  });
  const route = `/agent/run/${execution.run.id}/log-session`;
  const expectedSession = formatAgentRunLogSseSession(projectRoot, {
    project_id: projectId,
    run_id: execution.run.id,
    cursor: { stdout: 0, stderr: 0 },
    max_bytes: 1024,
    max_events: 3,
    retry_ms: 500,
    actor: "goal3-task220-preflight"
  });

  const artifactInputPath = ".comath/release/pi-codex-lifecycle/task220-input/runtime-registration.json";
  mkdirSync(join(projectRoot, ".comath/release/pi-codex-lifecycle/task220-input"), { recursive: true });
  writeFileSync(join(projectRoot, artifactInputPath), '{"registered":true}\n', "utf8");
  const session = persistPiCodexLifecycleOperatorSession(projectRoot, {
    project_id: projectId,
    session_id: "LIFE-OP-SESSION-0220",
    actor: "goal3-task220-session",
    pi_host_label: "pi-host-task220",
    session_status: "recoverable_operator_session",
    session_kind: "real_pi_host_manual_install",
    operator_cursor: "stdout:0/stderr:0",
    completed_steps: ["real_pi_install_runtime_probe"],
    artifact_paths: [{ kind: "runtime_registration_snapshot", path: artifactInputPath }],
    last_result_summary: { summary: "session ready for bounded AgentRun log-session lease" }
  });
  const recovery = recoverPiCodexLifecycleOperatorTransport(projectRoot, {
    project_id: projectId,
    session_id: "LIFE-OP-SESSION-0220",
    transport_recovery_id: "LIFE-TRANSPORT-0220",
    actor: "goal3-task220-recovery",
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
    reconnect_reason: "bind lease to real AgentRun log session"
  });
  const unboundRecovery = recoverPiCodexLifecycleOperatorTransport(projectRoot, {
    project_id: projectId,
    session_id: "LIFE-OP-SESSION-0220",
    transport_recovery_id: "LIFE-TRANSPORT-0220-UNBOUND",
    actor: "goal3-task220-unbound-recovery",
    session_manifest_path: session.session_manifest_path,
    transport_kind: "bounded_sse_snapshot",
    observed_route: "/agent/run/RUN-DOES-NOT-EXIST/log-session token=plain-token durable transport provided",
    requested_cursor: {
      operator_event_cursor: "event:0",
      stdout_cursor: "stdout:0",
      stderr_cursor: "stderr:0"
    },
    client_epoch: 1,
    last_seen_event_id: "evt-0",
    reconnect_reason: "negative unbound AgentRun log session"
  });

  assert.throws(
    () =>
      openPiCodexLifecycleOperatorTransportLease(projectRoot, {
        project_id: projectId,
        session_id: "LIFE-OP-SESSION-0220",
        transport_recovery_id: "LIFE-TRANSPORT-0220-UNBOUND",
        transport_lease_id: "LIFE-TRANSPORT-LEASE-0220-UNBOUND",
        actor: "goal3-task220-unbound OPENAI_API_KEY=plain-token",
        session_manifest_path: session.session_manifest_path,
        transport_recovery_path: unboundRecovery.transport_recovery_path,
        transport_kind: "bounded_live_sse_lease",
        requested_cursor: {
          operator_event_cursor: "event:1",
          stdout_cursor: "stdout:0",
          stderr_cursor: "stderr:0"
        },
        client_epoch: 2,
        heartbeat_interval_ms: 10_000,
        lease_ttl_ms: 60_000
      }),
    { code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_LEASE_ROUTE_UNBOUND" },
    "Task220 must reject bounded lease routes that are not backed by a service-owned AgentRun log-session"
  );
  assert.equal(
    existsSync(
      join(projectRoot, ".comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-LEASE-0220-UNBOUND/operator-transport-lease.json")
    ),
    false,
    "unbound AgentRun log-session routes must not leave partial lease artifacts"
  );

  const unrelatedExecution = await executeProfileAgentRun(projectRoot, {
    project_id: projectId,
    campaign_id: "CAM-1220",
    workstream_id: workstream.workstream_id,
    profile_id: "reviewer",
    program: process.execPath,
    adapter_args: [writeAdapterFixture()],
    goal: "Run unrelated Task220 log-session fixture.",
    context_path: `.comath/workstreams/${workstream.workstream_id}/spec.yaml`,
    actor: "goal3-task220-unrelated-agent-run"
  });
  const unrelatedRoute = `/agent/run/${unrelatedExecution.run.id}/log-session`;
  assert.throws(
    () =>
      openPiCodexLifecycleOperatorTransportLease(projectRoot, {
        project_id: projectId,
        session_id: "LIFE-OP-SESSION-0220",
        transport_recovery_id: "LIFE-TRANSPORT-0220",
        transport_lease_id: "LIFE-TRANSPORT-LEASE-0220-WRONG-RECOVERY",
        actor: "goal3-task220-wrong-recovery",
        session_manifest_path: session.session_manifest_path,
        transport_recovery_path: recovery.transport_recovery_path,
        transport_kind: "bounded_live_sse_lease",
        lease_route: unrelatedRoute,
        requested_cursor: {
          operator_event_cursor: "event:1",
          stdout_cursor: "stdout:0",
          stderr_cursor: "stderr:0"
        },
        client_epoch: 2,
        heartbeat_interval_ms: 10_000,
        lease_ttl_ms: 60_000
      }),
    { code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_LEASE_ROUTE_UNBOUND" },
    "Task220 must reject valid AgentRun log-session routes that do not match the recovery checkpoint route"
  );
  assert.equal(
    existsSync(
      join(
        projectRoot,
        ".comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-LEASE-0220-WRONG-RECOVERY/operator-transport-lease.json"
      )
    ),
    false,
    "wrong-recovery AgentRun log-session routes must not leave partial lease artifacts"
  );

  const lease = openPiCodexLifecycleOperatorTransportLease(projectRoot, {
    project_id: projectId,
    session_id: "LIFE-OP-SESSION-0220",
    transport_recovery_id: "LIFE-TRANSPORT-0220",
    transport_lease_id: "LIFE-TRANSPORT-LEASE-0220",
    actor: "goal3-task220-valid token=plain-token",
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
    heartbeat_interval_ms: 10_000,
    lease_ttl_ms: 60_000,
    last_seen_event_id: "evt-1",
    open_reason: "operator requested real AgentRun log-session binding"
  });
  assert.equal(lease.operator_transport_log_session_bound, true);
  assert.equal(lease.agent_run_log_session_binding.binding_source, "service_owned_agent_run_log_session");
  assert.equal(lease.agent_run_log_session_binding.project_id, projectId);
  assert.equal(lease.agent_run_log_session_binding.run_id, execution.run.id);
  assert.equal(lease.agent_run_log_session_binding.route, route);
  assert.equal(lease.agent_run_log_session_binding.content_type, "text/event-stream; charset=utf-8");
  assert.equal(lease.agent_run_log_session_binding.event_count, expectedSession.events.length);
  assert.deepEqual(lease.agent_run_log_session_binding.cursor, { stdout: 0, stderr: 0 });
  assert.equal(lease.agent_run_log_session_binding.body_sha256, sha256Text(expectedSession.body));
  assert.equal(lease.agent_run_log_session_binding.proof_authority, "none");
  assert.equal(lease.durable_transport_provided, false);
  assert.equal(lease.long_lived_sse_provided, false);
  assert.equal(lease.can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(lease), secretTerms);
  assert.doesNotMatch(JSON.stringify(lease), overclaimTerms);

  const persisted = readJson(join(projectRoot, lease.transport_lease_path));
  assert.equal(persisted.operator_transport_log_session_bound, true);
  assert.equal(persisted.agent_run_log_session_binding.body_sha256, sha256Text(expectedSession.body));
  assert.equal(persisted.agent_run_log_session_binding.proof_authority, "none");
  assert.doesNotMatch(JSON.stringify(persisted), secretTerms);
  assert.doesNotMatch(JSON.stringify(persisted), overclaimTerms);

  assert.equal(
    getComathdStatus().capabilities.includes("pi_codex_operator_transport_lease_agentrun_log_session_binding"),
    true,
    "Task220 capability ledger must advertise bounded lease AgentRun log-session binding without claiming durable transport"
  );
  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "release.pi_codex_lifecycle_operator_transport_lease_opened" &&
        event.payload.transport_lease_id === "LIFE-TRANSPORT-LEASE-0220" &&
        event.payload.operator_transport_log_session_bound === true &&
        event.payload.agent_run_id === execution.run.id &&
        event.payload.agent_run_log_session_body_sha256 === sha256Text(expectedSession.body) &&
        event.payload.proof_authority === "none" &&
        event.payload.durable_transport_provided === false
    ),
    true,
    "Task220 audit event must bind the service-owned AgentRun log-session without proof or durable-transport overclaim"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task220 Pi operator transport lease AgentRun log-session binding tests passed.");
