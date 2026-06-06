import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
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
  recordPiCodexLifecycleOperatorServiceTransportContinuity,
  recordPiCodexLifecycleOperatorServiceTransportContract,
  recoverPiCodexLifecycleOperatorTransport,
  reviewPiCodexLifecycleTerminalExecution,
  spawnWorkstream
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task229-operator-service-continuity-"));
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
  const dir = join(projectRoot, ".tmp", "task229-fixtures");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "operator-service-continuity-adapter.mjs");
  writeFileSync(
    path,
    [
      "process.stdout.write('task229 stdout before continuity\\n');",
      "process.stderr.write('task229 stderr before continuity\\n');",
      "process.stdout.write('# Agent Report\\n\\n## Input Context\\nTask229 maintained transport continuity fixture.\\n\\n## Actions Taken\\nEmitted bounded logs.\\n\\n## Claims Proposed\\nproof_authority: none\\n\\n## Evidence Produced\\nRuntime logs only.\\n\\n## Graph Patch\\nNo trusted mutation.\\n\\n## Blockers\\nNone.\\n\\n## Failed Routes\\nNone.\\n\\n## Self-Review\\nNo durable transport.\\n\\n## Next Actions\\nRecord maintained primitive continuity.\\n');",
      ""
    ].join("\n"),
    "utf8"
  );
  return path;
}

async function createReviewedTransportContract(ids) {
  const workstream = spawnWorkstream(projectRoot, {
    project_id: projectId,
    kind: "proof_route",
    goal: "Task229 maintained operator/service transport continuity fixture.",
    created_by: "goal3-task229"
  });
  const agentRun = await executeProfileAgentRun(projectRoot, {
    project_id: projectId,
    campaign_id: `CAM-${ids.suffix}`,
    workstream_id: workstream.workstream_id,
    profile_id: "reviewer",
    program: process.execPath,
    adapter_args: [writeAgentRunAdapterFixture()],
    goal: "Run Task229 maintained continuity fixture.",
    context_path: `.comath/workstreams/${workstream.workstream_id}/spec.yaml`,
    actor: "goal3-task229-agent-run"
  });
  const route = `/agent/run/${agentRun.run.id}/log-session`;

  const realPiProbe = probePiCodexRealPiInstallRuntimeRegistration(
    projectRoot,
    {
      project_id: projectId,
      probe_id: ids.probeId,
      actor: "goal3-task229-real-pi-probe",
      pi_host_label: "pi-host-task229",
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
    actor: "goal3-task229-session",
    pi_host_label: "pi-host-task229",
    session_status: "recoverable_operator_session",
    session_kind: "real_pi_host_automated_install",
    operator_cursor: "stdout:0/stderr:0",
    completed_steps: ["real_pi_install_runtime_probe"],
    artifact_paths: [{ kind: "runtime_registration_snapshot", path: realPiProbe.runtime_registration_snapshot_path }],
    last_result_summary: { summary: "session ready for maintained transport continuity" }
  });

  const recovery = recoverPiCodexLifecycleOperatorTransport(projectRoot, {
    project_id: projectId,
    session_id: ids.sessionId,
    transport_recovery_id: ids.recoveryId,
    actor: "goal3-task229-recovery",
    session_manifest_path: session.session_manifest_path,
    transport_kind: "bounded_sse_snapshot",
    observed_route: route,
    requested_cursor: { operator_event_cursor: "event:4", stdout_cursor: "stdout:0", stderr_cursor: "stderr:0" },
    client_epoch: 4,
    last_seen_event_id: "evt-4",
    reconnect_reason: "maintained transport continuity recovery checkpoint"
  });

  const lease = openPiCodexLifecycleOperatorTransportLease(projectRoot, {
    project_id: projectId,
    session_id: ids.sessionId,
    transport_recovery_id: ids.recoveryId,
    transport_lease_id: ids.leaseId,
    actor: "goal3-task229-lease token=plain-token",
    session_manifest_path: session.session_manifest_path,
    transport_recovery_path: recovery.transport_recovery_path,
    transport_kind: "bounded_live_sse_lease",
    lease_route: `${route} Authorization: Bearer plain-token durable transport provided`,
    requested_cursor: { operator_event_cursor: "event:5", stdout_cursor: "stdout:0", stderr_cursor: "stderr:0" },
    client_epoch: 5,
    heartbeat_interval_ms: 10_000,
    lease_ttl_ms: 60_000,
    last_seen_event_id: "evt-5",
    open_reason: "bounded lease before maintained transport continuity"
  });

  const heartbeat = heartbeatPiCodexLifecycleOperatorTransportLease(projectRoot, {
    project_id: projectId,
    session_id: ids.sessionId,
    transport_recovery_id: ids.recoveryId,
    transport_lease_id: ids.leaseId,
    transport_heartbeat_id: ids.heartbeatId,
    actor: "goal3-task229-heartbeat proof_success token=plain-token",
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
    heartbeat_reason: "heartbeat before maintained transport continuity"
  });

  const execution = recordPiCodexLifecycleGuidedRealPiExecution(projectRoot, {
    project_id: projectId,
    execution_id: ids.executionId,
    actor: "goal3-task229-guided kernel_checked long-lived SSE",
    real_pi_runtime_probe_id: ids.probeId,
    pi_install_transcript_path: realPiProbe.pi_install_transcript_path,
    runtime_registration_snapshot_path: realPiProbe.runtime_registration_snapshot_path,
    session_id: ids.sessionId,
    session_manifest_path: session.session_manifest_path,
    transport_recovery_id: ids.recoveryId,
    transport_recovery_path: recovery.transport_recovery_path,
    transport_lease_id: ids.leaseId,
    transport_lease_path: lease.transport_lease_path,
    pi_host_label: "pi-host-task229",
    observed_routes: ["/cm:release lifecycle-operator-transport-heartbeat", "/cm:release lifecycle-guided-real-pi-execution"],
    operator_command_summary: "operator recorded guided lifecycle before maintained transport continuity",
    final_operator_cursor: { operator_event_cursor: "event:8", stdout_cursor: "stdout:256", stderr_cursor: "stderr:0" },
    execution_outcome: "operator_guided_run_observed",
    next_recommended_route: "/release/pi-codex-lifecycle/terminal-execution-review"
  });

  const review = reviewPiCodexLifecycleTerminalExecution(projectRoot, {
    project_id: projectId,
    review_id: ids.reviewId,
    actor: "goal3-task229-terminal-review",
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

  const contract = recordPiCodexLifecycleOperatorServiceTransportContract(projectRoot, {
    project_id: projectId,
    transport_contract_id: ids.contractId,
    actor: "goal3-task229-contract durable transport provided proof_success",
    terminal_review_id: ids.reviewId,
    terminal_review_path: review.review_path,
    max_bytes: 4096,
    max_events: 2,
    retry_ms: 750,
    client_transport_primitive: "pi_fetch_get_text",
    service_transport_primitive: "node_http_agent_run_log_session_route"
  });

  return { agentRun, realPiProbe, session, recovery, lease, heartbeat, execution, review, contract };
}

const init = initProject({ name: "Goal3 Task229 Operator Service Transport Continuity", root_path: projectRoot });
const projectId = init.project.project_id;

try {
  process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS = JSON.stringify([process.execPath]);
  assert.equal(
    typeof recordPiCodexLifecycleOperatorServiceTransportContinuity,
    "function",
    "Task229 must export a service-owned maintained operator/service transport continuity recorder"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("pi_codex_operator_service_transport_continuity"),
    true,
    "Task229 capability ledger must advertise maintained transport continuity evidence"
  );

  const chain = await createReviewedTransportContract({
    suffix: "0229",
    probeId: "LIFE-PI-RUNTIME-0229",
    sessionId: "LIFE-OP-SESSION-0229",
    recoveryId: "LIFE-TRANSPORT-0229",
    leaseId: "LIFE-TRANSPORT-LEASE-0229",
    heartbeatId: "LIFE-TRANSPORT-HEARTBEAT-0229",
    executionId: "LIFE-GUIDED-EXEC-0229",
    reviewId: "LIFE-TERMINAL-REVIEW-0229",
    contractId: "LIFE-TRANSPORT-CONTRACT-0229"
  });
  appendFileSync(
    join(projectRoot, ".tmp", "comath", chain.agentRun.run.id, "logs", "stdout.log"),
    "task229 stdout after contract for continuity resume\n",
    "utf8"
  );
  const expectedSession = formatAgentRunLogSseSession(projectRoot, {
    project_id: projectId,
    run_id: chain.agentRun.run.id,
    cursor: chain.contract.log_session_next_cursor,
    max_bytes: 2048,
    max_events: 2,
    retry_ms: 600,
    actor: "goal3-task229-expected-continuity"
  });

  const continuity = recordPiCodexLifecycleOperatorServiceTransportContinuity(projectRoot, {
    project_id: projectId,
    continuity_id: "LIFE-TRANSPORT-CONTINUITY-0229",
    actor: `goal3-task229-continuity ${projectRoot}\\secret.txt Authorization: Bearer plain-token proof_success durable transport provided long-lived websocket`,
    transport_contract_id: chain.contract.transport_contract_id,
    transport_contract_path: chain.contract.transport_contract_path,
    transport_contract_sha256: chain.contract.transport_contract_artifact.sha256,
    max_bytes: 2048,
    max_events: 2,
    retry_ms: 600,
    client_transport_primitive: "pi_fetch_get_text",
    service_transport_primitive: "node_http_agent_run_log_session_route"
  });

  assert.equal(continuity.schema_version, "comath.pi_codex_operator_service_transport_continuity.v1");
  assert.equal(continuity.continuity_status, "maintained_bounded_transport_continuity_recorded");
  assert.equal(continuity.project_id, projectId);
  assert.equal(continuity.continuity_id, "LIFE-TRANSPORT-CONTINUITY-0229");
  assert.equal(continuity.transport_contract_id, chain.contract.transport_contract_id);
  assert.equal(continuity.transport_contract_artifact.sha256, chain.contract.transport_contract_artifact.sha256);
  assert.equal(continuity.agent_run_id, chain.agentRun.run.id);
  assert.equal(continuity.service_route, chain.contract.service_route);
  assert.equal(continuity.service_transport_primitive, "node_http_agent_run_log_session_route");
  assert.equal(continuity.client_transport_primitive, "pi_fetch_get_text");
  assert.equal(continuity.http_method, "GET");
  assert.equal(continuity.content_type, "text/event-stream; charset=utf-8");
  assert.deepEqual(continuity.previous_cursor, chain.contract.log_session_next_cursor);
  assert.equal(continuity.previous_log_session_body_sha256, chain.contract.log_session_body_sha256);
  assert.equal(continuity.log_session_body_sha256, sha256Text(expectedSession.body));
  assert.equal(continuity.log_session_event_count, expectedSession.events.length);
  assert.deepEqual(continuity.log_session_next_cursor, expectedSession.next_cursor);
  assert.deepEqual(continuity.bounded_limits, { max_bytes: 2048, max_events: 2, retry_ms: 600 });
  assert.equal(continuity.maintained_transport_primitive_bound, true);
  assert.equal(continuity.service_route_bound, true);
  assert.equal(continuity.client_fetch_contract_bound, true);
  assert.equal(continuity.transport_contract_bound, true);
  assert.equal(continuity.durable_resume_checkpoint_recorded, true);
  assert.equal(continuity.durable_transport_provided, false);
  assert.equal(continuity.live_transport_open, false);
  assert.equal(continuity.indefinite_stream_open, false);
  assert.equal(continuity.long_lived_websocket_provided, false);
  assert.equal(continuity.long_lived_sse_provided, false);
  assert.equal(continuity.pi_direct_write_allowed, false);
  assert.equal(continuity.direct_trusted_state_mutation, false);
  assert.equal(continuity.proof_authority, "none");
  assert.equal(continuity.can_promote_claim, false);
  assert.equal(continuity.can_certify_ga, false);
  assert.equal(JSON.stringify(continuity).includes(projectRoot), false, "continuity result must not expose host paths");
  assert.doesNotMatch(JSON.stringify(continuity), secretTerms);
  assert.doesNotMatch(JSON.stringify(continuity), privilegedPublicTerms);
  assert.doesNotMatch(JSON.stringify(continuity), transportOverclaimTerms);

  const persistedPath = join(projectRoot, continuity.continuity_path);
  assert.equal(existsSync(persistedPath), true, "maintained continuity checkpoint must persist append-only evidence");
  const persisted = readJson(persistedPath);
  assert.equal(persisted.continuity_artifact, undefined, "persisted continuity must not self-hash recursively");
  assert.equal(persisted.proof_authority, "none");
  assert.equal(persisted.can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(persisted), secretTerms);
  assert.doesNotMatch(JSON.stringify(persisted), privilegedPublicTerms);
  assert.doesNotMatch(JSON.stringify(persisted), transportOverclaimTerms);

  const contractPath = join(projectRoot, chain.contract.transport_contract_path);
  const contractBeforePoison = readFileSync(contractPath, "utf8");
  const poisonedContract = readJson(contractPath);
  poisonedContract.log_session_body_sha256 = "e".repeat(64);
  writeJson(contractPath, poisonedContract);
  assert.throws(
    () =>
      recordPiCodexLifecycleOperatorServiceTransportContinuity(projectRoot, {
        project_id: projectId,
        continuity_id: "LIFE-TRANSPORT-CONTINUITY-0229-STALE",
        actor: "goal3-task229-stale-contract",
        transport_contract_id: chain.contract.transport_contract_id,
        transport_contract_path: chain.contract.transport_contract_path,
        transport_contract_sha256: chain.contract.transport_contract_artifact.sha256
      }),
    { code: "PI_CODEX_OPERATOR_SERVICE_TRANSPORT_CONTINUITY_CONTRACT_STALE" },
    "maintained continuity must reject stale or tampered transport contract artifacts"
  );
  writeFileSync(contractPath, contractBeforePoison, "utf8");

  const forgedContractDir = join(projectRoot, ".comath", "release", "pi-codex-lifecycle", "task229-forged");
  mkdirSync(forgedContractDir, { recursive: true });
  const forgedContractPath = ".comath/release/pi-codex-lifecycle/task229-forged/operator-service-transport-contract.json";
  const forgedContract = {
    ...readJson(contractPath),
    transport_contract_path: forgedContractPath,
    log_session_body_sha256: "f".repeat(64)
  };
  writeJson(join(projectRoot, forgedContractPath), forgedContract);
  assert.throws(
    () =>
      recordPiCodexLifecycleOperatorServiceTransportContinuity(projectRoot, {
        project_id: projectId,
        continuity_id: "LIFE-TRANSPORT-CONTINUITY-0229-FORGED",
        actor: "goal3-task229-forged-contract-no-hash",
        transport_contract_id: chain.contract.transport_contract_id,
        transport_contract_path: forgedContractPath
      }),
    { code: "PI_CODEX_OPERATOR_SERVICE_TRANSPORT_CONTINUITY_CONTRACT_NON_CANONICAL" },
    "maintained continuity must reject caller-selected non-canonical contract artifacts even when no hash is supplied"
  );
  assert.throws(
    () =>
      recordPiCodexLifecycleOperatorServiceTransportContinuity(projectRoot, {
        project_id: projectId,
        continuity_id: "LIFE-TRANSPORT-CONTINUITY-0229-NO-HASH",
        actor: "goal3-task229-canonical-contract-no-hash",
        transport_contract_id: chain.contract.transport_contract_id,
        transport_contract_path: chain.contract.transport_contract_path
      }),
    { code: "PI_CODEX_OPERATOR_SERVICE_TRANSPORT_CONTINUITY_CONTRACT_HASH_REQUIRED" },
    "maintained continuity must require a caller-supplied contract artifact hash even for canonical contract paths"
  );
  assert.equal(
    existsSync(
      join(
        projectRoot,
        ".comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-CONTINUITY-0229-STALE/operator-service-transport-continuity.json"
      )
    ),
    false,
    "stale contract must not leave partial continuity artifacts"
  );
  assert.equal(
    existsSync(
      join(
        projectRoot,
        ".comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-CONTINUITY-0229-FORGED/operator-service-transport-continuity.json"
      )
    ),
    false,
    "non-canonical forged contract paths must not leave partial continuity artifacts"
  );
  assert.equal(
    existsSync(
      join(
        projectRoot,
        ".comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-CONTINUITY-0229-NO-HASH/operator-service-transport-continuity.json"
      )
    ),
    false,
    "missing contract hash must not leave partial continuity artifacts"
  );

  appendFileSync(
    join(projectRoot, ".tmp", "comath", chain.agentRun.run.id, "logs", "stderr.log"),
    "task229 stderr after direct continuity for route resume\n",
    "utf8"
  );
  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/pi-codex-lifecycle/operator-service-transport-continuity",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      continuity_id: "LIFE-TRANSPORT-CONTINUITY-0229-ROUTE",
      actor: "goal3-task229-route token=plain-token durable transport provided long-lived SSE",
      transport_contract_id: chain.contract.transport_contract_id,
      transport_contract_path: chain.contract.transport_contract_path,
      transport_contract_sha256: chain.contract.transport_contract_artifact.sha256,
      max_bytes: 1024,
      max_events: 1,
      retry_ms: 500,
      durable_transport_provided: true,
      proof_authority: "lean_kernel_clean_replay"
    }
  });
  assert.equal(routeResponse.status, 200, JSON.stringify(routeResponse.body));
  assert.equal(routeResponse.body.continuity.service_transport_primitive, "node_http_agent_run_log_session_route");
  assert.equal(routeResponse.body.continuity.client_transport_primitive, "pi_fetch_get_text");
  assert.equal(routeResponse.body.continuity.durable_resume_checkpoint_recorded, true);
  assert.equal(routeResponse.body.continuity.durable_transport_provided, false);
  assert.equal(routeResponse.body.continuity.proof_authority, "none");
  assert.equal(routeResponse.body.continuity.can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), secretTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), privilegedPublicTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), transportOverclaimTerms);

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "release.pi_codex_operator_service_transport_continuity_recorded" &&
        event.payload.continuity_id === "LIFE-TRANSPORT-CONTINUITY-0229" &&
        event.payload.transport_contract_id === chain.contract.transport_contract_id &&
        event.payload.service_transport_primitive === "node_http_agent_run_log_session_route" &&
        event.payload.client_transport_primitive === "pi_fetch_get_text" &&
        event.payload.durable_resume_checkpoint_recorded === true &&
        event.payload.durable_transport_provided === false &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "maintained continuity audit event must bind primitives without durable/proof overclaim"
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

console.log("Goal 3 Task229 Pi operator/service maintained transport continuity tests passed.");
