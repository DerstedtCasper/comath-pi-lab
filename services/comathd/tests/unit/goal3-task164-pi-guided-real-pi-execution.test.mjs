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
  probePiCodexRealPiInstallRuntimeRegistration,
  readAuditEvents,
  recordPiCodexLifecycleGuidedRealPiExecution,
  recoverPiCodexLifecycleOperatorTransport
} from "../../dist/index.js";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task164-guided-real-pi-execution-"));
const previousAllowedPrograms = process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS;
const privilegedPublicTerms =
  /clean_replay_passed|completed_formal_proof|formally_checked|proven|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence/i;
const secretTerms = /COMATH_CODEX_API_KEY|OPENAI_API_KEY|Authorization:\s*Bearer|api_key|token=|plain-token|sk-/i;
const transportOverclaimTerms =
  /long[- ]lived\s+(?:websocket|sse)|indefinite\s+sse|terminal transport recovered live|durable transport provided/i;

try {
  process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS = JSON.stringify([process.execPath]);
  const init = initProject({ name: "Goal3 Task164 Guided Real Pi Execution Project", root_path: projectRoot });
  const projectId = init.project.project_id;

  assert.equal(
    typeof recordPiCodexLifecycleGuidedRealPiExecution,
    "function",
    "Task164 must export a service-owned guided real-Pi execution evidence recorder"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("pi_codex_lifecycle_guided_real_pi_execution"),
    true,
    "Task164 service capability ledger must advertise guided real-Pi execution evidence"
  );

  const realPiProbe = probePiCodexRealPiInstallRuntimeRegistration(
    projectRoot,
    {
      project_id: projectId,
      probe_id: "LIFE-PI-RUNTIME-0164",
      actor: "goal3-task164-real-pi-probe-test",
      pi_host_label: "pi-host-lab-01",
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
    session_id: "LIFE-OP-SESSION-0164",
    actor: "goal3-task164-session-test",
    pi_host_label: "pi-host-lab-01",
    session_status: "recoverable_operator_session",
    session_kind: "real_pi_host_automated_install",
    operator_cursor: "stdout:0/stderr:0",
    completed_steps: ["real_pi_install_runtime_probe"],
    artifact_paths: [{ kind: "runtime_registration_snapshot", path: realPiProbe.runtime_registration_snapshot_path }],
    last_result_summary: { summary: "real Pi runtime probe observed; ready for guided lifecycle execution" }
  });

  const recovery = recoverPiCodexLifecycleOperatorTransport(projectRoot, {
    project_id: projectId,
    session_id: "LIFE-OP-SESSION-0164",
    transport_recovery_id: "LIFE-TRANSPORT-0164",
    actor: "goal3-task164-recovery-test",
    session_manifest_path: session.session_manifest_path,
    transport_kind: "bounded_sse_snapshot",
    observed_route: "/agent/run/RUN-0164/log-session",
    requested_cursor: {
      operator_event_cursor: "event:4",
      stdout_cursor: "stdout:128",
      stderr_cursor: "stderr:0"
    },
    client_epoch: 4,
    last_seen_event_id: "evt-4",
    reconnect_reason: "guided execution checkpoint before bounded lease"
  });

  const lease = openPiCodexLifecycleOperatorTransportLease(projectRoot, {
    project_id: projectId,
    session_id: "LIFE-OP-SESSION-0164",
    transport_recovery_id: "LIFE-TRANSPORT-0164",
    transport_lease_id: "LIFE-TRANSPORT-LEASE-0164",
    actor: "goal3-task164-lease-test",
    session_manifest_path: session.session_manifest_path,
    transport_recovery_path: recovery.transport_recovery_path,
    transport_kind: "bounded_live_polling_lease",
    lease_route: "/agent/run/RUN-0164/log-session",
    requested_cursor: {
      operator_event_cursor: "event:5",
      stdout_cursor: "stdout:160",
      stderr_cursor: "stderr:0"
    },
    client_epoch: 5,
    heartbeat_interval_ms: 10_000,
    lease_ttl_ms: 60_000,
    last_seen_event_id: "evt-5",
    open_reason: "guided execution bounded transport lease"
  });

  const sessionBeforeExecution = readJson(join(projectRoot, session.session_manifest_path));
  const recoveryBeforeExecution = readJson(join(projectRoot, recovery.transport_recovery_path));
  const leaseBeforeExecution = readJson(join(projectRoot, lease.transport_lease_path));

  const execution = recordPiCodexLifecycleGuidedRealPiExecution(projectRoot, {
    project_id: projectId,
    execution_id: "LIFE-GUIDED-EXEC-0164",
    actor: `goal3-task164-test ${projectRoot}\\actor-secret.txt OPENAI_API_KEY=plain-token formal_proof_verified long-lived SSE`,
    real_pi_runtime_probe_id: "LIFE-PI-RUNTIME-0164",
    pi_install_transcript_path: realPiProbe.pi_install_transcript_path,
    runtime_registration_snapshot_path: realPiProbe.runtime_registration_snapshot_path,
    session_id: "LIFE-OP-SESSION-0164",
    session_manifest_path: session.session_manifest_path,
    transport_recovery_id: "LIFE-TRANSPORT-0164",
    transport_recovery_path: recovery.transport_recovery_path,
    transport_lease_id: "LIFE-TRANSPORT-LEASE-0164",
    transport_lease_path: lease.transport_lease_path,
    pi_host_label: "pi-host-lab-01",
    observed_routes: [
      `/cm:release real-pi-runtime-probe ${projectRoot}\\route-secret.txt token=plain-token`,
      "/cm:release lifecycle-operator-session",
      "/cm:release lifecycle-operator-transport-recovery",
      "/cm:release lifecycle-operator-transport-lease terminal transport recovered live"
    ],
    operator_command_summary: `operator completed guided real Pi lifecycle at ${projectRoot}\\terminal.txt sk-task164 clean_replay_passed durable transport provided`,
    final_operator_cursor: {
      operator_event_cursor: "event:8 Authorization: Bearer plain-token",
      stdout_cursor: "stdout:256 long-lived websocket",
      stderr_cursor: "stderr:0 formal_replay_passed indefinite SSE"
    },
    execution_outcome: "replayable_release_blocker_recorded",
    next_recommended_route: "/release/pi-codex-lifecycle/review"
  });

  assert.equal(execution.schema_version, "comath.pi_codex_guided_real_pi_execution.v1");
  assert.equal(execution.execution_id, "LIFE-GUIDED-EXEC-0164");
  assert.equal(execution.project_id, projectId);
  assert.equal(execution.real_pi_runtime_probe_id, "LIFE-PI-RUNTIME-0164");
  assert.equal(execution.session_id, "LIFE-OP-SESSION-0164");
  assert.equal(execution.transport_recovery_id, "LIFE-TRANSPORT-0164");
  assert.equal(execution.transport_lease_id, "LIFE-TRANSPORT-LEASE-0164");
  assert.equal(execution.pi_host_label, "pi-host-lab-01");
  assert.equal(execution.execution_status, "guided_real_pi_execution_recorded");
  assert.equal(execution.execution_outcome, "replayable_release_blocker_recorded");
  assert.equal(execution.guided_real_pi_execution_observed, true);
  assert.equal(execution.real_pi_runtime_probe_bound, true);
  assert.equal(execution.operator_session_manifest_bound, true);
  assert.equal(execution.operator_transport_recovery_bound, true);
  assert.equal(execution.operator_transport_lease_bound, true);
  assert.equal(execution.pi_install_artifact.sha256, realPiProbe.pi_install_artifact.sha256);
  assert.equal(execution.runtime_registration_artifact.sha256, realPiProbe.runtime_registration_artifact.sha256);
  assert.equal(execution.session_manifest_artifact.sha256, session.session_manifest_artifact.sha256);
  assert.equal(execution.transport_recovery_artifact.sha256, recovery.transport_recovery_artifact.sha256);
  assert.equal(execution.transport_lease_artifact.sha256, lease.transport_lease_artifact.sha256);
  assert.equal(execution.guided_execution_artifact.kind, "guided_real_pi_execution");
  assert.equal(
    execution.guided_execution_path,
    ".comath/release/pi-codex-lifecycle/LIFE-GUIDED-EXEC-0164/guided-real-pi-execution.json"
  );
  assert.deepEqual(execution.required_preconditions, [
    "real_pi_runtime_probe_observed",
    "operator_session_manifest_bound",
    "operator_transport_recovery_checkpoint_bound",
    "bounded_operator_transport_lease_bound"
  ]);
  assert.equal(execution.pi_direct_write_allowed, false);
  assert.equal(execution.direct_trusted_state_mutation, false);
  assert.equal(execution.durable_transport_provided, false);
  assert.equal(execution.indefinite_stream_open, false);
  assert.equal(execution.long_lived_websocket_provided, false);
  assert.equal(execution.long_lived_sse_provided, false);
  assert.equal(execution.proof_authority, "none");
  assert.equal(execution.can_promote_claim, false);
  assert.equal(execution.can_certify_ga, false);
  assert.equal(JSON.stringify(execution).includes(projectRoot), false, "guided execution result must not expose host paths");
  assert.doesNotMatch(JSON.stringify(execution), secretTerms, "guided execution result must not expose API secrets");
  assert.doesNotMatch(JSON.stringify(execution), privilegedPublicTerms, "guided execution result must not overclaim proof authority");
  assert.doesNotMatch(
    JSON.stringify(execution),
    transportOverclaimTerms,
    "guided execution result must scrub long-lived/durable transport overclaims"
  );

  const persistedPath = join(projectRoot, execution.guided_execution_path);
  assert.equal(existsSync(persistedPath), true, "guided real-Pi execution must persist a service-owned artifact");
  const persisted = readJson(persistedPath);
  assert.equal(persisted.schema_version, execution.schema_version);
  assert.equal(persisted.execution_id, execution.execution_id);
  assert.equal(persisted.guided_execution_artifact, undefined, "persisted body must not self-hash recursively");
  assert.equal(persisted.runtime_registration_artifact.sha256, realPiProbe.runtime_registration_artifact.sha256);
  assert.equal(persisted.transport_lease_artifact.sha256, lease.transport_lease_artifact.sha256);
  assert.equal(persisted.proof_authority, "none");
  assert.equal(persisted.can_certify_ga, false);
  assert.equal(persisted.durable_transport_provided, false);
  assert.equal(persisted.long_lived_sse_provided, false);
  assert.equal(JSON.stringify(persisted).includes(projectRoot), false, "persisted execution must scrub host paths");
  assert.doesNotMatch(JSON.stringify(persisted), secretTerms, "persisted execution must scrub secrets");
  assert.doesNotMatch(JSON.stringify(persisted), privilegedPublicTerms, "persisted execution must scrub proof-success vocabulary");
  assert.doesNotMatch(
    JSON.stringify(persisted),
    transportOverclaimTerms,
    "persisted execution must scrub long-lived/durable transport overclaims"
  );

  const persistedBeforeDuplicate = readFileSync(persistedPath, "utf8");
  assert.throws(
    () =>
      recordPiCodexLifecycleGuidedRealPiExecution(projectRoot, {
        project_id: projectId,
        execution_id: "LIFE-GUIDED-EXEC-0164",
        actor: "goal3-task164-duplicate-test",
        real_pi_runtime_probe_id: "LIFE-PI-RUNTIME-0164",
        pi_install_transcript_path: realPiProbe.pi_install_transcript_path,
        runtime_registration_snapshot_path: realPiProbe.runtime_registration_snapshot_path,
        session_id: "LIFE-OP-SESSION-0164",
        session_manifest_path: session.session_manifest_path,
        transport_recovery_id: "LIFE-TRANSPORT-0164",
        transport_recovery_path: recovery.transport_recovery_path,
        transport_lease_id: "LIFE-TRANSPORT-LEASE-0164",
        transport_lease_path: lease.transport_lease_path,
        execution_outcome: "operator_guided_run_observed"
      }),
    { code: "PI_CODEX_GUIDED_REAL_PI_EXECUTION_ALREADY_EXISTS" },
    "guided execution artifacts must be append-only by execution id"
  );
  assert.equal(
    readFileSync(persistedPath, "utf8"),
    persistedBeforeDuplicate,
    "duplicate guided execution attempts must not rewrite the existing artifact"
  );

  assert.deepEqual(
    readJson(join(projectRoot, session.session_manifest_path)),
    sessionBeforeExecution,
    "guided execution recording must not mutate the operator-session manifest"
  );
  assert.deepEqual(
    readJson(join(projectRoot, recovery.transport_recovery_path)),
    recoveryBeforeExecution,
    "guided execution recording must not mutate the recovery checkpoint"
  );
  assert.deepEqual(
    readJson(join(projectRoot, lease.transport_lease_path)),
    leaseBeforeExecution,
    "guided execution recording must not mutate the bounded transport lease"
  );

  assert.throws(
    () =>
      recordPiCodexLifecycleGuidedRealPiExecution(projectRoot, {
        project_id: projectId,
        execution_id: "LIFE-GUIDED-EXEC-0164-MISSING-RUNTIME",
        actor: "goal3-task164-test",
        real_pi_runtime_probe_id: "LIFE-PI-RUNTIME-0164-MISSING",
        pi_install_transcript_path: ".comath/release/pi-codex-lifecycle/missing/pi-install-transcript.md",
        runtime_registration_snapshot_path: ".comath/release/pi-codex-lifecycle/missing/runtime-registration-snapshot.json",
        session_id: "LIFE-OP-SESSION-0164",
        session_manifest_path: session.session_manifest_path,
        transport_recovery_id: "LIFE-TRANSPORT-0164",
        transport_recovery_path: recovery.transport_recovery_path,
        transport_lease_id: "LIFE-TRANSPORT-LEASE-0164",
        transport_lease_path: lease.transport_lease_path,
        execution_outcome: "operator_guided_run_observed"
      }),
    { code: "PI_CODEX_GUIDED_REAL_PI_EXECUTION_RUNTIME_MISSING" },
    "guided execution must fail closed without Task152 real-Pi runtime evidence"
  );

  const runtimeSnapshotPath = join(projectRoot, realPiProbe.runtime_registration_snapshot_path);
  const runtimeSnapshotBeforePoison = readFileSync(runtimeSnapshotPath, "utf8");
  writeFileSync(
    runtimeSnapshotPath,
    JSON.stringify(
      {
        ...readJson(runtimeSnapshotPath),
        pi_host_kind: "fake_pi_host",
        runtime_registered: false,
        host_confirmation_observed: false,
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
      recordPiCodexLifecycleGuidedRealPiExecution(projectRoot, {
        project_id: projectId,
        execution_id: "LIFE-GUIDED-EXEC-0164-POISONED-RUNTIME",
        actor: "goal3-task164-test",
        real_pi_runtime_probe_id: "LIFE-PI-RUNTIME-0164",
        pi_install_transcript_path: realPiProbe.pi_install_transcript_path,
        runtime_registration_snapshot_path: realPiProbe.runtime_registration_snapshot_path,
        session_id: "LIFE-OP-SESSION-0164",
        session_manifest_path: session.session_manifest_path,
        transport_recovery_id: "LIFE-TRANSPORT-0164",
        transport_recovery_path: recovery.transport_recovery_path,
        transport_lease_id: "LIFE-TRANSPORT-LEASE-0164",
        transport_lease_path: lease.transport_lease_path,
        execution_outcome: "operator_guided_run_observed"
      }),
    { code: "PI_CODEX_GUIDED_REAL_PI_EXECUTION_RUNTIME_INVALID_BOUNDARY" },
    "guided execution must reject fake or poisoned real-Pi runtime evidence"
  );
  writeFileSync(runtimeSnapshotPath, runtimeSnapshotBeforePoison, "utf8");

  const leasePath = join(projectRoot, lease.transport_lease_path);
  const leaseBeforePoison = readFileSync(leasePath, "utf8");
  writeFileSync(
    leasePath,
    JSON.stringify(
      {
        ...readJson(leasePath),
        durable_transport_provided: true,
        indefinite_stream_open: true,
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
      recordPiCodexLifecycleGuidedRealPiExecution(projectRoot, {
        project_id: projectId,
        execution_id: "LIFE-GUIDED-EXEC-0164-POISONED-LEASE",
        actor: "goal3-task164-test",
        real_pi_runtime_probe_id: "LIFE-PI-RUNTIME-0164",
        pi_install_transcript_path: realPiProbe.pi_install_transcript_path,
        runtime_registration_snapshot_path: realPiProbe.runtime_registration_snapshot_path,
        session_id: "LIFE-OP-SESSION-0164",
        session_manifest_path: session.session_manifest_path,
        transport_recovery_id: "LIFE-TRANSPORT-0164",
        transport_recovery_path: recovery.transport_recovery_path,
        transport_lease_id: "LIFE-TRANSPORT-LEASE-0164",
        transport_lease_path: lease.transport_lease_path,
        execution_outcome: "operator_guided_run_observed"
      }),
    { code: "PI_CODEX_GUIDED_REAL_PI_EXECUTION_LEASE_INVALID_BOUNDARY" },
    "guided execution must reject poisoned bounded transport lease artifacts"
  );
  writeFileSync(leasePath, leaseBeforePoison, "utf8");

  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/pi-codex-lifecycle/guided-real-pi-execution",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      execution_id: "LIFE-GUIDED-EXEC-0164-ROUTE",
      actor: "goal3-task164-route-test",
      real_pi_runtime_probe_id: "LIFE-PI-RUNTIME-0164",
      pi_install_transcript_path: realPiProbe.pi_install_transcript_path,
      runtime_registration_snapshot_path: realPiProbe.runtime_registration_snapshot_path,
      session_id: "LIFE-OP-SESSION-0164",
      session_manifest_path: session.session_manifest_path,
      transport_recovery_id: "LIFE-TRANSPORT-0164",
      transport_recovery_path: recovery.transport_recovery_path,
      transport_lease_id: "LIFE-TRANSPORT-LEASE-0164",
      transport_lease_path: lease.transport_lease_path,
      pi_host_label: "pi-host-lab-01",
      observed_routes: ["/cm:release lifecycle-operator-transport-lease"],
      operator_command_summary: "route smoke guided execution evidence",
      final_operator_cursor: {
        operator_event_cursor: "event:9",
        stdout_cursor: "stdout:288",
        stderr_cursor: "stderr:0"
      },
      execution_outcome: "operator_guided_run_observed",
      next_recommended_route: "/release/pi-codex-lifecycle/review"
    }
  });
  assert.equal(routeResponse.status, 200, JSON.stringify(routeResponse.body));
  assert.equal(routeResponse.body.execution.execution_id, "LIFE-GUIDED-EXEC-0164-ROUTE");
  assert.equal(routeResponse.body.execution.guided_real_pi_execution_observed, true);
  assert.equal(routeResponse.body.execution.can_certify_ga, false);
  assert.equal(routeResponse.body.execution.proof_authority, "none");
  assert.equal(JSON.stringify(routeResponse.body).includes(projectRoot), false, "route response must not echo host paths");

  const events = readAuditEvents(projectRoot);
  assert.equal(JSON.stringify(events).includes(projectRoot), false, "guided execution audit events must scrub host paths");
  assert.doesNotMatch(JSON.stringify(events), secretTerms, "guided execution audit events must scrub secrets");
  assert.doesNotMatch(JSON.stringify(events), privilegedPublicTerms, "guided execution audit events must scrub proof-success vocabulary");
  assert.doesNotMatch(
    JSON.stringify(events),
    transportOverclaimTerms,
    "guided execution audit events must scrub long-lived/durable transport overclaims"
  );
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "release.pi_codex_lifecycle_guided_real_pi_execution_recorded" &&
        event.payload.execution_id === "LIFE-GUIDED-EXEC-0164" &&
        event.payload.real_pi_runtime_probe_id === "LIFE-PI-RUNTIME-0164" &&
        event.payload.session_id === "LIFE-OP-SESSION-0164" &&
        event.payload.transport_recovery_id === "LIFE-TRANSPORT-0164" &&
        event.payload.transport_lease_id === "LIFE-TRANSPORT-LEASE-0164" &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false &&
        event.payload.guided_real_pi_execution_observed === true &&
        event.payload.pi_direct_write_allowed === false &&
        event.payload.direct_trusted_state_mutation === false
    ),
    true,
    "guided real-Pi execution must be audit-visible and non-authoritative"
  );
} finally {
  if (previousAllowedPrograms === undefined) {
    delete process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS;
  } else {
    process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS = previousAllowedPrograms;
  }
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task164 Pi guided real-Pi execution tests passed.");
