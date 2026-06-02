import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createComathServer,
  getComathdStatus,
  initProject,
  openPiCodexLifecycleOperatorTransportLease,
  persistPiCodexLifecycleOperatorSession,
  readAuditEvents,
  recoverPiCodexLifecycleOperatorTransport
} from "../../dist/index.js";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task162-operator-transport-lease-"));
const privilegedPublicTerms =
  /clean_replay_passed|completed_formal_proof|formally_checked|proven|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence/i;
const secretTerms = /COMATH_CODEX_API_KEY|OPENAI_API_KEY|Authorization:\s*Bearer|api_key|token=|plain-token|sk-/i;
const transportOverclaimTerms =
  /long-lived\s+(?:websocket|sse)|indefinite\s+sse|terminal transport recovered live|durable transport provided/i;

try {
  const init = initProject({ name: "Goal3 Task162 Operator Transport Lease Project", root_path: projectRoot });
  const projectId = init.project.project_id;
  const artifactInputPath = ".comath/release/pi-codex-lifecycle/task162-input/runtime-registration.json";
  const artifactAbsolutePath = join(projectRoot, artifactInputPath);
  mkdirSync(join(projectRoot, ".comath/release/pi-codex-lifecycle/task162-input"), { recursive: true });
  writeFileSync(artifactAbsolutePath, '{"registered":true}\n', "utf8");

  assert.equal(
    typeof openPiCodexLifecycleOperatorTransportLease,
    "function",
    "Task162 must export a service-owned bounded operator transport lease opener"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("pi_codex_lifecycle_operator_transport_lease"),
    true,
    "Task162 service capability ledger must advertise bounded operator transport leases"
  );

  const session = persistPiCodexLifecycleOperatorSession(projectRoot, {
    project_id: projectId,
    session_id: "LIFE-OP-SESSION-0162",
    actor: "goal3-task162-session-test",
    pi_host_label: "pi-host-lab-01",
    session_status: "recoverable_operator_session",
    session_kind: "real_pi_host_manual_install",
    operator_cursor: "stdout:0/stderr:0",
    completed_steps: ["real_pi_install_runtime_probe"],
    artifact_paths: [{ kind: "runtime_registration_snapshot", path: artifactInputPath }],
    last_result_summary: { summary: "session ready for bounded live operator transport lease" }
  });

  const recovery = recoverPiCodexLifecycleOperatorTransport(projectRoot, {
    project_id: projectId,
    session_id: "LIFE-OP-SESSION-0162",
    transport_recovery_id: "LIFE-TRANSPORT-0162",
    actor: "goal3-task162-recovery-test",
    session_manifest_path: session.session_manifest_path,
    transport_kind: "bounded_sse_snapshot",
    observed_route: "/agent/run/RUN-0162/log-session",
    requested_cursor: {
      operator_event_cursor: "event:7",
      stdout_cursor: "stdout:256",
      stderr_cursor: "stderr:0"
    },
    client_epoch: 3,
    last_seen_event_id: "evt-7",
    reconnect_reason: "bounded checkpoint exists before live lease"
  });

  const sessionBeforeLease = readJson(join(projectRoot, session.session_manifest_path));
  const recoveryBeforeLease = readJson(join(projectRoot, recovery.transport_recovery_path));

  const lease = openPiCodexLifecycleOperatorTransportLease(projectRoot, {
    project_id: projectId,
    session_id: "LIFE-OP-SESSION-0162",
    transport_recovery_id: "LIFE-TRANSPORT-0162",
    transport_lease_id: "LIFE-TRANSPORT-LEASE-0162",
    actor: `goal3-task162-test ${projectRoot}\\actor-secret.txt OPENAI_API_KEY=plain-token formal_proof_verified long-lived SSE`,
    session_manifest_path: session.session_manifest_path,
    transport_recovery_path: recovery.transport_recovery_path,
    transport_kind: "bounded_live_polling_lease",
    lease_route: `/agent/run/RUN-0162/log-session ${projectRoot}\\route-secret.txt token=plain-token terminal transport recovered live`,
    requested_cursor: {
      operator_event_cursor: "event:8 Authorization: Bearer plain-token",
      stdout_cursor: "stdout:320 sk-task162-secret long-lived websocket",
      stderr_cursor: "stderr:4 clean_replay_passed durable transport provided"
    },
    client_epoch: 4,
    heartbeat_interval_ms: 15_000,
    lease_ttl_ms: 60_000,
    last_seen_event_id: "evt-8 api_key=plain-token formal_replay_passed indefinite SSE",
    open_reason: `operator requested bounded live lease from ${projectRoot}\\terminal.txt`
  });

  assert.equal(lease.schema_version, "comath.pi_codex_lifecycle_operator_transport_lease.v1");
  assert.equal(lease.transport_lease_id, "LIFE-TRANSPORT-LEASE-0162");
  assert.equal(lease.transport_recovery_id, "LIFE-TRANSPORT-0162");
  assert.equal(lease.project_id, projectId);
  assert.equal(lease.session_id, "LIFE-OP-SESSION-0162");
  assert.equal(lease.lease_status, "bounded_operator_transport_lease_open");
  assert.equal(lease.transport_kind, "bounded_live_polling_lease");
  assert.equal(lease.session_manifest_artifact.sha256, session.session_manifest_artifact.sha256);
  assert.equal(lease.transport_recovery_artifact.sha256, recovery.transport_recovery_artifact.sha256);
  assert.equal(lease.transport_lease_path, ".comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-LEASE-0162/operator-transport-lease.json");
  assert.equal(lease.transport_lease_artifact.kind, "operator_transport_lease");
  assert.equal(lease.transport_lease_artifact.path, lease.transport_lease_path);
  assert.equal(lease.transport_lease_artifact.sha256.length, 64);
  assert.equal(lease.transport_lease_artifact.size_bytes > 0, true);
  assert.equal(lease.lease_ttl_ms, 60_000);
  assert.equal(lease.heartbeat_interval_ms, 15_000);
  assert.equal(lease.heartbeat_required, true);
  assert.equal(Date.parse(lease.lease_expires_at) > Date.parse(lease.lease_started_at), true);
  assert.equal(lease.durable_recovery_checkpoint_required, true);
  assert.equal(lease.bounded_live_transport_lease_provided, true);
  assert.equal(lease.durable_transport_provided, false);
  assert.equal(lease.live_transport_open, true);
  assert.equal(lease.indefinite_stream_open, false);
  assert.equal(lease.long_lived_websocket_provided, false);
  assert.equal(lease.long_lived_sse_provided, false);
  assert.equal(lease.pi_direct_write_allowed, false);
  assert.equal(lease.direct_trusted_state_mutation, false);
  assert.equal(lease.proof_authority, "none");
  assert.equal(lease.can_promote_claim, false);
  assert.equal(lease.can_certify_ga, false);
  assert.equal(JSON.stringify(lease).includes(projectRoot), false, "lease result must not expose host paths");
  assert.doesNotMatch(JSON.stringify(lease), secretTerms, "lease result must not expose API secrets");
  assert.doesNotMatch(JSON.stringify(lease), privilegedPublicTerms, "lease result must not overclaim proof authority");
  assert.doesNotMatch(
    JSON.stringify(lease),
    transportOverclaimTerms,
    "lease result must scrub long-lived/durable transport overclaims from free text"
  );

  const persistedPath = join(projectRoot, lease.transport_lease_path);
  assert.equal(existsSync(persistedPath), true, "bounded operator transport lease must persist a service-owned artifact");
  const persisted = readJson(persistedPath);
  assert.equal(persisted.schema_version, lease.schema_version);
  assert.equal(persisted.transport_lease_id, lease.transport_lease_id);
  assert.equal(persisted.session_manifest_artifact.sha256, session.session_manifest_artifact.sha256);
  assert.equal(persisted.transport_recovery_artifact.sha256, recovery.transport_recovery_artifact.sha256);
  assert.equal(persisted.proof_authority, "none");
  assert.equal(persisted.can_certify_ga, false);
  assert.equal(persisted.bounded_live_transport_lease_provided, true);
  assert.equal(persisted.durable_transport_provided, false);
  assert.equal(persisted.live_transport_open, true);
  assert.equal(persisted.indefinite_stream_open, false);
  assert.equal(persisted.long_lived_websocket_provided, false);
  assert.equal(persisted.long_lived_sse_provided, false);
  assert.equal(JSON.stringify(persisted).includes(projectRoot), false, "persisted lease must scrub host paths");
  assert.doesNotMatch(JSON.stringify(persisted), secretTerms, "persisted lease must scrub secrets");
  assert.doesNotMatch(JSON.stringify(persisted), privilegedPublicTerms, "persisted lease must scrub proof-success vocabulary");
  assert.doesNotMatch(
    JSON.stringify(persisted),
    transportOverclaimTerms,
    "persisted lease must scrub long-lived/durable transport overclaims from free text"
  );

  const persistedBeforeDuplicate = readFileSync(persistedPath, "utf8");
  assert.throws(
    () =>
      openPiCodexLifecycleOperatorTransportLease(projectRoot, {
        project_id: projectId,
        session_id: "LIFE-OP-SESSION-0162",
        transport_recovery_id: "LIFE-TRANSPORT-0162",
        transport_lease_id: "LIFE-TRANSPORT-LEASE-0162",
        actor: "goal3-task162-duplicate-test",
        session_manifest_path: session.session_manifest_path,
        transport_recovery_path: recovery.transport_recovery_path,
        transport_kind: "bounded_live_sse_lease",
        lease_route: "/agent/run/RUN-0162/log-session?duplicate=true",
        requested_cursor: {
          operator_event_cursor: "event:99",
          stdout_cursor: "stdout:999",
          stderr_cursor: "stderr:999"
        },
        client_epoch: 4,
        heartbeat_interval_ms: 5_000,
        lease_ttl_ms: 30_000,
        last_seen_event_id: "evt-99",
        open_reason: "duplicate lease should not overwrite the original service artifact"
      }),
    { code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_LEASE_ALREADY_EXISTS" },
    "bounded transport leases must be append-only by lease id and fail closed instead of overwriting"
  );
  assert.equal(
    readFileSync(persistedPath, "utf8"),
    persistedBeforeDuplicate,
    "duplicate lease attempts must not rewrite the existing service-owned lease artifact"
  );

  assert.deepEqual(
    readJson(join(projectRoot, session.session_manifest_path)).completed_steps,
    sessionBeforeLease.completed_steps,
    "opening a bounded transport lease must not mutate trusted operator-session completed steps"
  );
  assert.deepEqual(
    readJson(join(projectRoot, recovery.transport_recovery_path)).requested_cursor,
    recoveryBeforeLease.requested_cursor,
    "opening a bounded transport lease must not rewrite the recovery checkpoint"
  );

  assert.throws(
    () =>
      openPiCodexLifecycleOperatorTransportLease(projectRoot, {
        project_id: projectId,
        session_id: "LIFE-OP-SESSION-0162",
        transport_recovery_id: "LIFE-TRANSPORT-0162-MISSING",
        transport_lease_id: "LIFE-TRANSPORT-LEASE-0162-MISSING",
        actor: "goal3-task162-test",
        session_manifest_path: session.session_manifest_path,
        transport_kind: "bounded_live_polling_lease"
      }),
    { code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_LEASE_RECOVERY_MISSING" },
    "bounded transport leases must fail closed without a Task159 recovery checkpoint"
  );
  assert.equal(
    existsSync(join(projectRoot, ".comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-LEASE-0162-MISSING/operator-transport-lease.json")),
    false,
    "missing recovery checkpoints must not leave partial lease artifacts"
  );

  const poisonedRecoveryPath = join(projectRoot, recovery.transport_recovery_path);
  writeFileSync(
    poisonedRecoveryPath,
    JSON.stringify(
      {
        ...recoveryBeforeLease,
        durable_transport_provided: true,
        long_lived_sse_provided: true,
        can_certify_ga: true,
        proof_authority: "lean_kernel_clean_replay"
      },
      null,
      2
    ),
    "utf8"
  );
  assert.throws(
    () =>
      openPiCodexLifecycleOperatorTransportLease(projectRoot, {
        project_id: projectId,
        session_id: "LIFE-OP-SESSION-0162",
        transport_recovery_id: "LIFE-TRANSPORT-0162",
        transport_lease_id: "LIFE-TRANSPORT-LEASE-0162-POISONED",
        actor: "goal3-task162-test",
        session_manifest_path: session.session_manifest_path,
        transport_recovery_path: recovery.transport_recovery_path,
        transport_kind: "bounded_live_polling_lease"
      }),
    { code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_LEASE_RECOVERY_INVALID_BOUNDARY" },
    "bounded transport leases must reject poisoned recovery checkpoints that overclaim authority or durable transport"
  );
  assert.equal(
    existsSync(join(projectRoot, ".comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-LEASE-0162-POISONED/operator-transport-lease.json")),
    false,
    "poisoned recovery checkpoints must not leave partial lease artifacts"
  );
  writeFileSync(poisonedRecoveryPath, JSON.stringify(recoveryBeforeLease, null, 2), "utf8");

  assert.throws(
    () =>
      openPiCodexLifecycleOperatorTransportLease(projectRoot, {
        project_id: projectId,
        session_id: "LIFE-OP-SESSION-0162",
        transport_recovery_id: "LIFE-TRANSPORT-0162",
        transport_lease_id: "..",
        actor: "goal3-task162-test",
        transport_kind: "bounded_live_polling_lease"
      }),
    { code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_LEASE_INVALID_ID" },
    "bounded transport lease ids must not collapse or escape the lease namespace"
  );

  assert.throws(
    () =>
      openPiCodexLifecycleOperatorTransportLease(projectRoot, {
        project_id: projectId,
        session_id: "LIFE-OP-SESSION-0162",
        transport_recovery_id: "LIFE-TRANSPORT-0162",
        transport_lease_id: "LIFE-TRANSPORT-LEASE-0162-ESCAPE",
        actor: "goal3-task162-test",
        transport_recovery_path: "../escape/operator-transport-recovery.json",
        transport_kind: "bounded_live_polling_lease"
      }),
    /path escapes project root/,
    "bounded transport leases must reject escaped recovery paths before persistence"
  );
  assert.equal(
    existsSync(join(projectRoot, ".comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-LEASE-0162-ESCAPE/operator-transport-lease.json")),
    false,
    "escaped recovery paths must not leave partial lease artifacts"
  );

  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/pi-codex-lifecycle/operator-transport-lease",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      session_id: "LIFE-OP-SESSION-0162",
      transport_recovery_id: "LIFE-TRANSPORT-0162",
      transport_lease_id: "LIFE-TRANSPORT-LEASE-0162-ROUTE",
      actor: "goal3-task162-route-test",
      session_manifest_path: session.session_manifest_path,
      transport_recovery_path: recovery.transport_recovery_path,
      transport_kind: "bounded_live_polling_lease",
      lease_route: "/agent/run/RUN-0162/log-session",
      requested_cursor: {
        operator_event_cursor: "event:16",
        stdout_cursor: "stdout:640",
        stderr_cursor: "stderr:8"
      },
      client_epoch: 5,
      heartbeat_interval_ms: 10_000,
      lease_ttl_ms: 30_000,
      last_seen_event_id: "evt-16",
      open_reason: "route smoke"
    }
  });
  assert.equal(routeResponse.status, 200, JSON.stringify(routeResponse.body));
  assert.equal(routeResponse.body.lease.transport_lease_id, "LIFE-TRANSPORT-LEASE-0162-ROUTE");
  assert.equal(routeResponse.body.lease.live_transport_open, true);
  assert.equal(routeResponse.body.lease.can_certify_ga, false);
  assert.equal(routeResponse.body.lease.long_lived_sse_provided, false);
  assert.equal(JSON.stringify(routeResponse.body).includes(projectRoot), false, "route response must not echo host paths");

  const events = readAuditEvents(projectRoot);
  assert.equal(JSON.stringify(events).includes(projectRoot), false, "operator transport lease audit events must scrub host paths");
  assert.doesNotMatch(JSON.stringify(events), secretTerms, "operator transport lease audit events must scrub secrets");
  assert.doesNotMatch(JSON.stringify(events), privilegedPublicTerms, "operator transport lease audit events must scrub proof-success vocabulary");
  assert.doesNotMatch(
    JSON.stringify(events),
    transportOverclaimTerms,
    "operator transport lease audit events must scrub long-lived/durable transport overclaims"
  );
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "release.pi_codex_lifecycle_operator_transport_lease_opened" &&
        event.payload.transport_lease_id === "LIFE-TRANSPORT-LEASE-0162" &&
        event.payload.transport_recovery_id === "LIFE-TRANSPORT-0162" &&
        event.payload.session_id === "LIFE-OP-SESSION-0162" &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false &&
        event.payload.bounded_live_transport_lease_provided === true &&
        event.payload.durable_transport_provided === false &&
        event.payload.live_transport_open === true &&
        event.payload.indefinite_stream_open === false &&
        event.payload.long_lived_websocket_provided === false &&
        event.payload.long_lived_sse_provided === false &&
        event.payload.pi_direct_write_allowed === false &&
        event.payload.direct_trusted_state_mutation === false
    ),
    true,
    "bounded operator transport leases must be audit-visible and non-authoritative"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task162 Pi/Codex operator transport lease tests passed.");
