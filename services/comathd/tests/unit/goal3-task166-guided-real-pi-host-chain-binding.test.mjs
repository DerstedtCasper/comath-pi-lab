import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  executeProfileAgentRun,
  initProject,
  openPiCodexLifecycleOperatorTransportLease,
  persistPiCodexLifecycleOperatorSession,
  probePiCodexRealPiInstallRuntimeRegistration,
  recordPiCodexLifecycleGuidedRealPiExecution,
  recoverPiCodexLifecycleOperatorTransport,
  spawnWorkstream
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task166-guided-host-chain-"));
const previousAllowedPrograms = process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS;

function writeAgentRunAdapterFixture() {
  const dir = join(projectRoot, ".tmp", "task166-fixtures");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "guided-host-chain-adapter.mjs");
  writeFileSync(
    path,
    [
      "process.stdout.write('task166 stdout\\n');",
      "process.stderr.write('task166 stderr\\n');",
      "process.stdout.write('# Agent Report\\n\\n## Input Context\\nTask166 host-chain fixture.\\n\\n## Actions Taken\\nEmitted bounded logs.\\n\\n## Claims Proposed\\nproof_authority: none\\n\\n## Evidence Produced\\nRuntime logs only.\\n\\n## Graph Patch\\nNone.\\n\\n## Blockers\\nNone.\\n\\n## Failed Routes\\nNone.\\n\\n## Self-Review\\nNo authority.\\n\\n## Next Actions\\nContinue.\\n');",
      ""
    ].join("\n"),
    "utf8"
  );
  return path;
}

try {
  process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS = JSON.stringify([process.execPath]);
  const init = initProject({ name: "Goal3 Task166 Guided Host Chain Project", root_path: projectRoot });
  const projectId = init.project.project_id;
  const workstream = spawnWorkstream(projectRoot, {
    project_id: projectId,
    kind: "proof_route",
    goal: "Task166 guided host-chain bounded lease logs.",
    created_by: "goal3-task166"
  });
  const agentRun = await executeProfileAgentRun(projectRoot, {
    project_id: projectId,
    campaign_id: "CAM-0166",
    workstream_id: workstream.workstream_id,
    profile_id: "reviewer",
    program: process.execPath,
    adapter_args: [writeAgentRunAdapterFixture()],
    goal: "Run Task166 host-chain fixture.",
    context_path: `.comath/workstreams/${workstream.workstream_id}/spec.yaml`,
    actor: "goal3-task166-agent-run"
  });
  const agentRunLogSessionRoute = `/agent/run/${agentRun.run.id}/log-session`;

  const realPiProbe = probePiCodexRealPiInstallRuntimeRegistration(
    projectRoot,
    {
      project_id: projectId,
      probe_id: "LIFE-PI-RUNTIME-0166",
      actor: "goal3-task166-real-pi-probe-test",
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
      runner: () => ({
        exit_code: 0,
        signal: null,
        timed_out: false,
        stdout: "{}",
        stderr: ""
      })
    }
  );

  const session = persistPiCodexLifecycleOperatorSession(projectRoot, {
    project_id: projectId,
    session_id: "LIFE-OP-SESSION-0166",
    actor: "goal3-task166-session-test",
    pi_host_label: "pi-host-lab-02",
    session_status: "recoverable_operator_session",
    session_kind: "real_pi_host_automated_install",
    operator_cursor: "stdout:0/stderr:0",
    completed_steps: ["real_pi_install_runtime_probe"],
    artifact_paths: [{ kind: "runtime_registration_snapshot", path: realPiProbe.runtime_registration_snapshot_path }],
    last_result_summary: { summary: "host label mismatch must not become guided execution evidence" }
  });

  const recovery = recoverPiCodexLifecycleOperatorTransport(projectRoot, {
    project_id: projectId,
    session_id: "LIFE-OP-SESSION-0166",
    transport_recovery_id: "LIFE-TRANSPORT-0166",
    actor: "goal3-task166-recovery-test",
    session_manifest_path: session.session_manifest_path,
    transport_kind: "bounded_sse_snapshot",
    observed_route: agentRunLogSessionRoute,
    requested_cursor: {
      operator_event_cursor: "event:2",
      stdout_cursor: "stdout:64",
      stderr_cursor: "stderr:0"
    },
    client_epoch: 2,
    last_seen_event_id: "evt-2",
    reconnect_reason: "host-chain mismatch regression setup"
  });

  const lease = openPiCodexLifecycleOperatorTransportLease(projectRoot, {
    project_id: projectId,
    session_id: "LIFE-OP-SESSION-0166",
    transport_recovery_id: "LIFE-TRANSPORT-0166",
    transport_lease_id: "LIFE-TRANSPORT-LEASE-0166",
    actor: "goal3-task166-lease-test",
    session_manifest_path: session.session_manifest_path,
    transport_recovery_path: recovery.transport_recovery_path,
    transport_kind: "bounded_live_polling_lease",
    lease_route: agentRunLogSessionRoute,
    requested_cursor: {
      operator_event_cursor: "event:3",
      stdout_cursor: "stdout:96",
      stderr_cursor: "stderr:0"
    },
    client_epoch: 3,
    heartbeat_interval_ms: 10_000,
    lease_ttl_ms: 60_000,
    last_seen_event_id: "evt-3",
    open_reason: "host-chain mismatch regression setup"
  });

  assert.throws(
    () =>
      recordPiCodexLifecycleGuidedRealPiExecution(projectRoot, {
        project_id: projectId,
        execution_id: "LIFE-GUIDED-EXEC-0166-HOST-MISMATCH",
        actor: "goal3-task166-guided-execution-test",
        real_pi_runtime_probe_id: "LIFE-PI-RUNTIME-0166",
        pi_install_transcript_path: realPiProbe.pi_install_transcript_path,
        runtime_registration_snapshot_path: realPiProbe.runtime_registration_snapshot_path,
        session_id: "LIFE-OP-SESSION-0166",
        session_manifest_path: session.session_manifest_path,
        transport_recovery_id: "LIFE-TRANSPORT-0166",
        transport_recovery_path: recovery.transport_recovery_path,
        transport_lease_id: "LIFE-TRANSPORT-LEASE-0166",
        transport_lease_path: lease.transport_lease_path,
        pi_host_label: "pi-host-lab-02",
        observed_routes: ["/cm:release lifecycle-guided-real-pi-execution"],
        operator_command_summary: "host labels must bind a single real Pi host",
        execution_outcome: "operator_guided_run_observed"
      }),
    { code: "PI_CODEX_GUIDED_REAL_PI_EXECUTION_ARTIFACT_CHAIN_MISMATCH" },
    "guided real-Pi execution must fail closed when runtime and operator-session host labels diverge"
  );
  assert.equal(
    existsSync(
      join(
        projectRoot,
        ".comath/release/pi-codex-lifecycle/LIFE-GUIDED-EXEC-0166-HOST-MISMATCH/guided-real-pi-execution.json"
      )
    ),
    false,
    "host-chain mismatches must not leave guided execution artifacts"
  );

  const alignedSession = persistPiCodexLifecycleOperatorSession(projectRoot, {
    project_id: projectId,
    session_id: "LIFE-OP-SESSION-0166-ALIGNED",
    actor: "goal3-task166-aligned-session-test",
    pi_host_label: "pi-host-lab-01",
    session_status: "recoverable_operator_session",
    session_kind: "real_pi_host_automated_install",
    operator_cursor: "stdout:0/stderr:0",
    completed_steps: ["real_pi_install_runtime_probe"],
    artifact_paths: [{ kind: "runtime_registration_snapshot", path: realPiProbe.runtime_registration_snapshot_path }],
    last_result_summary: { summary: "aligned host label setup for input-spoof regression" }
  });
  const alignedRecovery = recoverPiCodexLifecycleOperatorTransport(projectRoot, {
    project_id: projectId,
    session_id: "LIFE-OP-SESSION-0166-ALIGNED",
    transport_recovery_id: "LIFE-TRANSPORT-0166-ALIGNED",
    actor: "goal3-task166-aligned-recovery-test",
    session_manifest_path: alignedSession.session_manifest_path,
    transport_kind: "bounded_sse_snapshot",
    observed_route: agentRunLogSessionRoute,
    requested_cursor: {
      operator_event_cursor: "event:4",
      stdout_cursor: "stdout:128",
      stderr_cursor: "stderr:0"
    },
    client_epoch: 4,
    last_seen_event_id: "evt-4",
    reconnect_reason: "aligned setup for input-spoof regression"
  });
  const alignedLease = openPiCodexLifecycleOperatorTransportLease(projectRoot, {
    project_id: projectId,
    session_id: "LIFE-OP-SESSION-0166-ALIGNED",
    transport_recovery_id: "LIFE-TRANSPORT-0166-ALIGNED",
    transport_lease_id: "LIFE-TRANSPORT-LEASE-0166-ALIGNED",
    actor: "goal3-task166-aligned-lease-test",
    session_manifest_path: alignedSession.session_manifest_path,
    transport_recovery_path: alignedRecovery.transport_recovery_path,
    transport_kind: "bounded_live_polling_lease",
    lease_route: agentRunLogSessionRoute,
    requested_cursor: {
      operator_event_cursor: "event:5",
      stdout_cursor: "stdout:160",
      stderr_cursor: "stderr:0"
    },
    client_epoch: 5,
    heartbeat_interval_ms: 10_000,
    lease_ttl_ms: 60_000,
    last_seen_event_id: "evt-5",
    open_reason: "aligned setup for input-spoof regression"
  });
  assert.throws(
    () =>
      recordPiCodexLifecycleGuidedRealPiExecution(projectRoot, {
        project_id: projectId,
        execution_id: "LIFE-GUIDED-EXEC-0166-INPUT-HOST-SPOOF",
        actor: "goal3-task166-guided-input-spoof-test",
        real_pi_runtime_probe_id: "LIFE-PI-RUNTIME-0166",
        pi_install_transcript_path: realPiProbe.pi_install_transcript_path,
        runtime_registration_snapshot_path: realPiProbe.runtime_registration_snapshot_path,
        session_id: "LIFE-OP-SESSION-0166-ALIGNED",
        session_manifest_path: alignedSession.session_manifest_path,
        transport_recovery_id: "LIFE-TRANSPORT-0166-ALIGNED",
        transport_recovery_path: alignedRecovery.transport_recovery_path,
        transport_lease_id: "LIFE-TRANSPORT-LEASE-0166-ALIGNED",
        transport_lease_path: alignedLease.transport_lease_path,
        pi_host_label: "pi-host-lab-02",
        observed_routes: ["/cm:release lifecycle-guided-real-pi-execution"],
        operator_command_summary: "input host labels must not override runtime/session evidence",
        execution_outcome: "operator_guided_run_observed"
      }),
    { code: "PI_CODEX_GUIDED_REAL_PI_EXECUTION_ARTIFACT_CHAIN_MISMATCH" },
    "guided real-Pi execution must reject input host labels that contradict bound artifacts"
  );
  assert.equal(
    existsSync(
      join(
        projectRoot,
        ".comath/release/pi-codex-lifecycle/LIFE-GUIDED-EXEC-0166-INPUT-HOST-SPOOF/guided-real-pi-execution.json"
      )
    ),
    false,
    "input host-label spoofing must not leave guided execution artifacts"
  );
} finally {
  if (previousAllowedPrograms === undefined) {
    delete process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS;
  } else {
    process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS = previousAllowedPrograms;
  }
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task166 guided real-Pi host chain binding tests passed.");
