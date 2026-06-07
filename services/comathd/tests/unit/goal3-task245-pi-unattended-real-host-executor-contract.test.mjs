import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createComathServer,
  executeProfileAgentRun,
  getComathdStatus,
  initProject,
  orchestratePiCodexLifecycleAutomaticRealPiExecution,
  readAuditEvents,
  recordPiCodexLifecycleOperatorServiceTransportContinuity,
  recordPiCodexLifecycleUnattendedRealHostExecutionReadiness,
  recordPiCodexLifecycleUnattendedRealHostExecutorContract,
  recordPiCodexLifecycleUnattendedRealHostOperatorApproval,
  reviewPiCodexLifecycleUnattendedRealHostHandoff,
  spawnWorkstream
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task245-executor-contract-"));
const previousAllowedPrograms = process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS;
const secretTerms = /COMATH_CODEX_API_KEY|OPENAI_API_KEY|Authorization:\s*Bearer|api_key|token=|plain-token|sk-/i;
const privilegedPublicTerms =
  /clean_replay_passed|completed_formal_proof|formally_checked|proven|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|kernel_checked|proof_success/i;
const transportOverclaimTerms =
  /long[- ]lived\s+(?:websocket|sse)|indefinite\s+sse|terminal transport recovered live|durable transport provided|live transport open/i;
const unattendedOverclaimTerms =
  /production unattended executor|operator-free execution completed|unattended real-host execution completed|operator confirmation bypassed|service-owned evidence created|handoff can execute|unattended execution authorized|operator approval recorded/i;

function sha256Text(text) {
  return createHash("sha256").update(text).digest("hex");
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeRuntimeProbeFixture() {
  const dir = join(projectRoot, ".tmp", "task245-fixtures");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "real-pi-runtime-probe-fixture.mjs");
  writeFileSync(
    path,
    [
      "const step = process.argv[2] ?? 'unknown';",
      "if (!['install', 'runtime_registration', 'host_confirmation'].includes(step)) process.exit(2);",
      "process.stdout.write(JSON.stringify({ step, imported: true, registered: true, host_confirmation: true, token: 'plain-token' }));",
      ""
    ].join("\n"),
    "utf8"
  );
  return path;
}

function writeAgentRunAdapterFixture() {
  const dir = join(projectRoot, ".tmp", "task245-fixtures");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "executor-contract-agent-run-adapter.mjs");
  writeFileSync(
    path,
    [
      "process.stdout.write('task245 stdout before executor contract\\n');",
      "process.stderr.write('task245 stderr before executor contract\\n');",
      "process.stdout.write('# Agent Report\\n\\n## Input Context\\nTask245 executor contract fixture.\\n\\n## Claims Proposed\\nproof_authority: none\\n\\n## Evidence Produced\\nRuntime logs only.\\n\\n## Graph Patch\\nNo trusted mutation.\\n\\n## Blockers\\nNo unattended execution and no durable transport.\\n');",
      ""
    ].join("\n"),
    "utf8"
  );
  return path;
}

async function createServiceOwnedAgentRunRoute(suffix) {
  const campaignDigits = suffix.replace(/\D/g, "").padEnd(4, "0");
  const workstream = spawnWorkstream(projectRoot, {
    project_id: projectId,
    kind: "proof_route",
    goal: `Task245 service-owned executor contract fixture ${suffix}.`,
    created_by: "goal3-task245"
  });
  const agentRun = await executeProfileAgentRun(projectRoot, {
    project_id: projectId,
    campaign_id: `CAM-${campaignDigits}`,
    workstream_id: workstream.workstream_id,
    profile_id: "reviewer",
    program: process.execPath,
    adapter_args: [writeAgentRunAdapterFixture()],
    goal: `Run Task245 executor contract fixture ${suffix}.`,
    context_path: `.comath/workstreams/${workstream.workstream_id}/spec.yaml`,
    actor: `goal3-task245-agent-run-${suffix}`
  });
  return { agentRun, route: `/agent/run/${agentRun.run.id}/log-session` };
}

function publicAlias(id, filename) {
  return `service-owned-pi-lifecycle/${id}/${filename}`;
}

function orchestrationInput(ids, route, runtimeFixture) {
  return {
    project_id: projectId,
    orchestration_id: ids.orchestrationId,
    actor: `goal3-task245-orchestrator ${projectRoot}\\secret.txt Authorization: Bearer plain-token proof_success durable transport provided long-lived websocket`,
    runtime_probe: {
      probe_id: ids.probeId,
      pi_host_label: `pi-host-task245-${ids.suffix}`,
      session_kind: "real_pi_host_automated_install",
      timeout_ms: 5000,
      commands: {
        install: { program: process.execPath, args: [runtimeFixture, "install"] },
        runtime_registration: { program: process.execPath, args: [runtimeFixture, "runtime_registration"] },
        host_confirmation: { program: process.execPath, args: [runtimeFixture, "host_confirmation"] }
      }
    },
    operator_session: {
      session_id: ids.sessionId,
      session_status: "recoverable_operator_session",
      operator_cursor: "stdout:0/stderr:0",
      completed_steps: ["real_pi_install_runtime_probe"],
      last_result_summary: {
        summary: "automatic checkpoint chain ready for bounded executor contract",
        injected_claim: "formal_replay_passed durable transport provided token=plain-token"
      }
    },
    transport_recovery: {
      transport_recovery_id: ids.recoveryId,
      transport_kind: "bounded_sse_snapshot",
      observed_route: `${route} Authorization: Bearer plain-token durable transport provided`,
      requested_cursor: { operator_event_cursor: "event:7", stdout_cursor: "stdout:0", stderr_cursor: "stderr:0" },
      client_epoch: 7,
      last_seen_event_id: "evt-7",
      reconnect_reason: "automatic real-Pi lifecycle checkpoint recovery before executor contract"
    },
    transport_lease: {
      transport_lease_id: ids.leaseId,
      transport_kind: "bounded_live_sse_lease",
      lease_route: `${route} token=plain-token long-lived SSE`,
      requested_cursor: { operator_event_cursor: "event:8", stdout_cursor: "stdout:0", stderr_cursor: "stderr:0" },
      client_epoch: 8,
      heartbeat_interval_ms: 10_000,
      lease_ttl_ms: 60_000,
      last_seen_event_id: "evt-8",
      open_reason: "bounded lease before executor contract"
    },
    transport_heartbeat: {
      transport_heartbeat_id: ids.heartbeatId,
      requested_cursor: { operator_event_cursor: "event:9", stdout_cursor: "stdout:0", stderr_cursor: "stderr:0" },
      client_epoch: 9,
      last_seen_event_id: "evt-9",
      heartbeat_reason: "bounded heartbeat before executor contract"
    },
    guided_execution: {
      execution_id: ids.executionId,
      observed_routes: [
        "/cm:release lifecycle-operator-transport-heartbeat",
        "/cm:release lifecycle-guided-real-pi-execution"
      ],
      operator_command_summary: "automatic orchestrator recorded service-owned real-Pi checkpoint chain",
      final_operator_cursor: { operator_event_cursor: "event:10", stdout_cursor: "stdout:512", stderr_cursor: "stderr:0" },
      execution_outcome: "operator_guided_run_observed",
      next_recommended_route: "/release/pi-codex-lifecycle/terminal-execution-review"
    },
    terminal_review: {
      review_id: ids.reviewId
    },
    transport_contract: {
      transport_contract_id: ids.contractId,
      max_bytes: 4096,
      max_events: 2,
      retry_ms: 750,
      service_transport_primitive: "node_http_agent_run_log_session_route",
      client_transport_primitive: "pi_fetch_get_text"
    }
  };
}

function preparedReviewInput(ids, orchestration, continuity, overrides = {}) {
  return {
    project_id: projectId,
    handoff_review_id: ids.handoffReviewId,
    actor: `goal3-task245-review ${projectRoot}\\secret.txt Authorization: Bearer plain-token proof_success durable transport provided long-lived websocket handoff can execute`,
    real_pi_runtime_probe_id: ids.probeId,
    session_id: ids.sessionId,
    transport_recovery_id: ids.recoveryId,
    transport_lease_id: ids.leaseId,
    transport_heartbeat_id: ids.heartbeatId,
    execution_id: ids.executionId,
    terminal_review_id: ids.reviewId,
    transport_contract_id: ids.contractId,
    automatic_orchestration_id: ids.orchestrationId,
    transport_continuity_id: ids.continuityId,
    runtime_probe_path: publicAlias(ids.probeId, "real-pi-runtime-probe.json"),
    runtime_probe_sha256: orchestration.runtime_registration_artifact.sha256,
    operator_session_path: publicAlias(ids.sessionId, "operator-session-manifest.json"),
    operator_session_sha256: orchestration.session_manifest_artifact.sha256,
    transport_recovery_path: publicAlias(ids.recoveryId, "operator-transport-recovery.json"),
    transport_recovery_sha256: orchestration.transport_recovery_artifact.sha256,
    transport_lease_path: publicAlias(ids.leaseId, "operator-transport-lease.json"),
    transport_lease_sha256: orchestration.transport_lease_artifact.sha256,
    transport_heartbeat_path: publicAlias(ids.heartbeatId, "operator-transport-heartbeat.json"),
    transport_heartbeat_sha256: orchestration.transport_heartbeat_artifact.sha256,
    guided_execution_path: publicAlias(ids.executionId, "guided-real-pi-execution.json"),
    guided_execution_sha256: orchestration.guided_execution_artifact.sha256,
    terminal_review_path: publicAlias(ids.reviewId, "terminal-execution-review.json"),
    terminal_review_sha256: orchestration.terminal_review_artifact.sha256,
    transport_contract_path: publicAlias(ids.contractId, "operator-service-transport-contract.json"),
    transport_contract_sha256: orchestration.transport_contract_artifact.sha256,
    automatic_orchestration_path: publicAlias(ids.orchestrationId, "automatic-real-pi-execution.json"),
    automatic_orchestration_sha256: orchestration.orchestration_artifact.sha256,
    transport_continuity_path: publicAlias(ids.continuityId, "operator-service-transport-continuity.json"),
    transport_continuity_sha256: continuity.continuity_artifact.sha256,
    operator_approved: true,
    handoff_can_execute: true,
    unattended_execution_authorized: true,
    durable_transport_provided: true,
    proof_authority: "lean_kernel_clean_replay",
    can_certify_ga: true,
    ...overrides
  };
}

function approvalInput(ids, handoffReview, overrides = {}) {
  return {
    project_id: projectId,
    approval_id: ids.approvalId,
    actor: `goal3-task245-approval ${projectRoot}\\secret.txt Authorization: Bearer plain-token proof_success durable transport provided live transport open operator approval recorded`,
    handoff_review_id: ids.handoffReviewId,
    handoff_review_path: handoffReview.handoff_review_path,
    handoff_review_sha256: handoffReview.handoff_review_artifact.sha256,
    operator_approval_mode: "manual_operator_approval",
    approval_note: "Operator reviewed the prepared checkpoint chain; execution remains blocked until executor and durable transport prerequisites exist.",
    operator_approved: true,
    handoff_can_execute: true,
    unattended_execution_authorized: true,
    unattended_real_host_execution_completed: true,
    durable_transport_provided: true,
    live_transport_open: true,
    proof_authority: "lean_kernel_clean_replay",
    can_certify_ga: true,
    ...overrides
  };
}

function executorContractInput(ids, handoffReview, overrides = {}) {
  return {
    project_id: projectId,
    executor_contract_id: ids.executorContractId,
    actor: `goal3-task245-executor ${projectRoot}\\secret.txt Authorization: Bearer plain-token proof_success durable transport provided live transport open production unattended executor`,
    handoff_review_id: ids.handoffReviewId,
    handoff_review_path: handoffReview.handoff_review_path,
    handoff_review_sha256: handoffReview.handoff_review_artifact.sha256,
    requested_execution_mode: "production_unattended_real_host",
    executor_contract_kind: "service_owned_unattended_real_host_executor_contract",
    executor_configuration_state: "contract_recorded_executor_not_invoked",
    operator_approved: true,
    handoff_can_execute: true,
    unattended_execution_authorized: true,
    unattended_real_host_execution_completed: true,
    durable_transport_provided: true,
    live_transport_open: true,
    proof_authority: "lean_kernel_clean_replay",
    can_certify_ga: true,
    ...overrides
  };
}

function readinessInput(ids, handoffReview, overrides = {}) {
  return {
    project_id: projectId,
    readiness_id: ids.readinessId,
    actor: `goal3-task245-readiness ${projectRoot}\\secret.txt Authorization: Bearer plain-token proof_success durable transport provided live transport open operator approval recorded`,
    handoff_review_id: ids.handoffReviewId,
    handoff_review_path: handoffReview.handoff_review_path,
    handoff_review_sha256: handoffReview.handoff_review_artifact.sha256,
    requested_execution_mode: "production_unattended_real_host",
    operator_approved: true,
    handoff_can_execute: true,
    unattended_execution_authorized: true,
    unattended_real_host_execution_completed: true,
    durable_transport_provided: true,
    proof_authority: "lean_kernel_clean_replay",
    can_certify_ga: true,
    ...overrides
  };
}

function idsFor(suffix) {
  return {
    suffix,
    probeId: `LIFE-REAL-PI-PROBE-${suffix}`,
    sessionId: `LIFE-OPERATOR-SESSION-${suffix}`,
    recoveryId: `LIFE-TRANSPORT-RECOVERY-${suffix}`,
    leaseId: `LIFE-TRANSPORT-LEASE-${suffix}`,
    heartbeatId: `LIFE-TRANSPORT-HEARTBEAT-${suffix}`,
    executionId: `LIFE-GUIDED-EXECUTION-${suffix}`,
    reviewId: `LIFE-TERMINAL-REVIEW-${suffix}`,
    contractId: `LIFE-TRANSPORT-CONTRACT-${suffix}`,
    orchestrationId: `LIFE-AUTOMATIC-ORCH-${suffix}`,
    continuityId: `LIFE-TRANSPORT-CONTINUITY-${suffix}`,
    handoffReviewId: `LIFE-HANDOFF-REVIEW-${suffix}`,
    approvalId: `LIFE-OPERATOR-APPROVAL-${suffix}`,
    executorContractId: `LIFE-UNATTENDED-EXECUTOR-CONTRACT-${suffix}`,
    readinessId: `LIFE-UNATTENDED-EXEC-READINESS-${suffix}`
  };
}

const init = initProject({ name: "Goal 3 Task245 unattended real-host executor contract", root_path: projectRoot });
const projectId = init.project.project_id;

async function createReviewedChain(suffix) {
  const ids = idsFor(suffix);
  const runtimeFixture = writeRuntimeProbeFixture();
  const { route } = await createServiceOwnedAgentRunRoute(suffix);
  const orchestration = orchestratePiCodexLifecycleAutomaticRealPiExecution(
    projectRoot,
    orchestrationInput(ids, route, runtimeFixture)
  );
  const continuity = recordPiCodexLifecycleOperatorServiceTransportContinuity(projectRoot, {
    project_id: projectId,
    continuity_id: ids.continuityId,
    actor: `goal3-task245-continuity ${projectRoot}\\secret.txt Authorization: Bearer plain-token durable transport provided`,
    transport_contract_id: ids.contractId,
    transport_contract_path: orchestration.transport_contract_path,
    transport_contract_sha256: orchestration.transport_contract_artifact.sha256,
    requested_cursor: { operator_event_cursor: "event:11", stdout_cursor: "stdout:512", stderr_cursor: "stderr:0" },
    client_epoch: 11,
    continuity_reason: "prepared handoff continuity before executor contract"
  });
  const handoffReview = reviewPiCodexLifecycleUnattendedRealHostHandoff(
    projectRoot,
    preparedReviewInput(ids, orchestration, continuity)
  );
  return { ids, handoffReview };
}

process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS = process.execPath;

try {
  process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS = JSON.stringify([process.execPath]);

  assert.equal(
    typeof recordPiCodexLifecycleUnattendedRealHostExecutorContract,
    "function",
    "Task245 must export a service-owned unattended real-host executor contract recorder"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("pi_codex_unattended_real_host_executor_contract"),
    true,
    "Task245 capability ledger must advertise unattended executor contract evidence"
  );

  const { ids, handoffReview } = await createReviewedChain("0245");
  const executorContract = recordPiCodexLifecycleUnattendedRealHostExecutorContract(
    projectRoot,
    executorContractInput(ids, handoffReview)
  );
  assert.equal(executorContract.schema_version, "comath.pi_codex_unattended_real_host_executor_contract.v1");
  assert.equal(executorContract.executor_contract_status, "executor_contract_recorded");
  assert.equal(executorContract.executor_configuration_state, "contract_recorded_executor_not_invoked");
  assert.equal(executorContract.handoff_review_id, ids.handoffReviewId);
  assert.equal(executorContract.handoff_review_artifact.sha256, handoffReview.handoff_review_artifact.sha256);
  assert.equal(executorContract.executor_invoked, false);
  assert.equal(executorContract.unattended_execution_authorized, false);
  assert.equal(executorContract.unattended_real_host_execution_completed, false);
  assert.equal(executorContract.durable_transport_provided, false);
  assert.equal(executorContract.live_transport_open, false);
  assert.equal(executorContract.pi_direct_write_allowed, false);
  assert.equal(executorContract.direct_trusted_state_mutation, false);
  assert.equal(executorContract.proof_authority, "none");
  assert.equal(executorContract.can_certify_ga, false);
  assert.equal(JSON.stringify(executorContract).includes(projectRoot), false);
  assert.doesNotMatch(JSON.stringify(executorContract), secretTerms);
  assert.doesNotMatch(JSON.stringify(executorContract), privilegedPublicTerms);
  assert.doesNotMatch(JSON.stringify(executorContract), transportOverclaimTerms);
  assert.doesNotMatch(JSON.stringify(executorContract), unattendedOverclaimTerms);

  const persistedPath = join(projectRoot, executorContract.executor_contract_path);
  assert.equal(existsSync(persistedPath), true, "executor contract must persist append-only evidence");
  const persistedContract = readJson(persistedPath);
  assert.equal(persistedContract.executor_contract_artifact, undefined, "persisted executor contract must not self-hash recursively");

  assert.throws(
    () => recordPiCodexLifecycleUnattendedRealHostExecutorContract(projectRoot, executorContractInput(ids, handoffReview)),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTOR_CONTRACT_ALREADY_EXISTS" },
    "executor contract manifests must be append-only by contract id"
  );
  assert.throws(
    () =>
      recordPiCodexLifecycleUnattendedRealHostExecutorContract(
        projectRoot,
        executorContractInput(ids, handoffReview, {
          executor_contract_id: "LIFE-UNATTENDED-EXECUTOR-CONTRACT-0245-STALE",
          handoff_review_sha256: "a".repeat(64)
        })
      ),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTOR_CONTRACT_HANDOFF_REVIEW_STALE" },
    "executor contract must reject stale caller-supplied handoff review hashes"
  );
  assert.throws(
    () =>
      recordPiCodexLifecycleUnattendedRealHostExecutorContract(
        projectRoot,
        executorContractInput(ids, handoffReview, {
          executor_contract_id: "LIFE-UNATTENDED-EXECUTOR-CONTRACT-0245-BAD-MODE",
          requested_execution_mode: "production_unattended_real_host_execute_now"
        })
      ),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTOR_CONTRACT_INVALID_MODE" },
    "executor contract must reject execution-shaped modes"
  );
  assert.throws(
    () =>
      recordPiCodexLifecycleUnattendedRealHostExecutorContract(
        projectRoot,
        executorContractInput(ids, handoffReview, {
          executor_contract_id: "LIFE-UNATTENDED-EXECUTOR-CONTRACT-0245-BAD-KIND",
          executor_contract_kind: "service_owned_unattended_real_host_executor"
        })
      ),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTOR_CONTRACT_INVALID_KIND" },
    "executor contract must reject non-contract executor kinds"
  );
  assert.throws(
    () =>
      recordPiCodexLifecycleUnattendedRealHostExecutorContract(
        projectRoot,
        executorContractInput(ids, handoffReview, {
          executor_contract_id: "LIFE-UNATTENDED-EXECUTOR-CONTRACT-0245-BAD-STATE",
          executor_configuration_state: "executor_invoked"
        })
      ),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTOR_CONTRACT_INVALID_STATE" },
    "executor contract must reject invoked/completed executor states"
  );

  const approval = recordPiCodexLifecycleUnattendedRealHostOperatorApproval(
    projectRoot,
    approvalInput(ids, handoffReview)
  );
  assert.throws(
    () =>
      recordPiCodexLifecycleUnattendedRealHostExecutionReadiness(
        projectRoot,
        readinessInput(ids, handoffReview, {
          readiness_id: "LIFE-UNATTENDED-EXEC-READINESS-0245-INCOMPLETE-EXECUTOR",
          operator_approval_id: ids.approvalId,
          operator_approval_path: approval.approval_path,
          operator_approval_sha256: approval.operator_approval_artifact.sha256,
          unattended_executor_contract_id: ids.executorContractId
        })
      ),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_EXECUTOR_CONTRACT_INVALID" },
    "readiness must reject incomplete executor contract bindings"
  );
  const readinessWithoutExecutor = recordPiCodexLifecycleUnattendedRealHostExecutionReadiness(
    projectRoot,
    readinessInput(ids, handoffReview, {
      readiness_id: "LIFE-UNATTENDED-EXEC-READINESS-0245-NO-EXECUTOR",
      operator_approval_id: ids.approvalId,
      operator_approval_path: approval.approval_path,
      operator_approval_sha256: approval.operator_approval_artifact.sha256
    })
  );
  assert.deepEqual(readinessWithoutExecutor.blocker_reasons, [
    "service_owned_unattended_executor_not_configured",
    "durable_transport_not_provided"
  ]);
  assert.equal(readinessWithoutExecutor.unattended_executor_contract_current, false);

  const readiness = recordPiCodexLifecycleUnattendedRealHostExecutionReadiness(
    projectRoot,
    readinessInput(ids, handoffReview, {
      operator_approval_id: ids.approvalId,
      operator_approval_path: approval.approval_path,
      operator_approval_sha256: approval.operator_approval_artifact.sha256,
      unattended_executor_contract_id: ids.executorContractId,
      unattended_executor_contract_path: executorContract.executor_contract_path,
      unattended_executor_contract_sha256: executorContract.executor_contract_artifact.sha256
    })
  );
  assert.deepEqual(readiness.blocker_reasons, ["durable_transport_not_provided"]);
  assert.equal(readiness.operator_approval_artifact_current, true);
  assert.equal(readiness.unattended_executor_contract_id, ids.executorContractId);
  assert.equal(readiness.unattended_executor_contract_artifact.sha256, executorContract.executor_contract_artifact.sha256);
  assert.equal(readiness.unattended_executor_contract_current, true);
  assert.equal(readiness.service_owned_unattended_executor_configured, true);
  assert.equal(readiness.unattended_execution_authorized, false);
  assert.equal(readiness.unattended_real_host_execution_completed, false);
  assert.equal(readiness.durable_transport_provided, false);
  assert.equal(readiness.proof_authority, "none");
  assert.equal(readiness.can_certify_ga, false);
  assert.throws(
    () =>
      recordPiCodexLifecycleUnattendedRealHostExecutionReadiness(
        projectRoot,
        readinessInput(ids, handoffReview, {
          readiness_id: "LIFE-UNATTENDED-EXEC-READINESS-0245-STALE-EXECUTOR",
          operator_approval_id: ids.approvalId,
          operator_approval_path: approval.approval_path,
          operator_approval_sha256: approval.operator_approval_artifact.sha256,
          unattended_executor_contract_id: ids.executorContractId,
          unattended_executor_contract_path: executorContract.executor_contract_path,
          unattended_executor_contract_sha256: "b".repeat(64)
        })
      ),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_EXECUTOR_CONTRACT_STALE" },
    "readiness must reject stale executor contract hashes"
  );
  assert.throws(
    () =>
      recordPiCodexLifecycleUnattendedRealHostExecutionReadiness(
        projectRoot,
        readinessInput(ids, handoffReview, {
          readiness_id: "LIFE-UNATTENDED-EXEC-READINESS-0245-NONCANONICAL-EXECUTOR-PATH",
          operator_approval_id: ids.approvalId,
          operator_approval_path: approval.approval_path,
          operator_approval_sha256: approval.operator_approval_artifact.sha256,
          unattended_executor_contract_id: ids.executorContractId,
          unattended_executor_contract_path: handoffReview.handoff_review_path,
          unattended_executor_contract_sha256: executorContract.executor_contract_artifact.sha256
        })
      ),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_EXECUTOR_CONTRACT_INVALID" },
    "readiness must reject noncanonical executor contract paths"
  );
  const { ids: otherIds, handoffReview: otherHandoffReview } = await createReviewedChain("1245");
  assert.throws(
    () =>
      recordPiCodexLifecycleUnattendedRealHostExecutionReadiness(
        projectRoot,
        readinessInput(otherIds, otherHandoffReview, {
          readiness_id: "LIFE-UNATTENDED-EXEC-READINESS-1245-WRONG-HANDOFF",
          unattended_executor_contract_id: ids.executorContractId,
          unattended_executor_contract_path: executorContract.executor_contract_path,
          unattended_executor_contract_sha256: executorContract.executor_contract_artifact.sha256
        })
      ),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_EXECUTOR_CONTRACT_INVALID" },
    "readiness must reject executor contracts bound to a different handoff review"
  );

  const executorContractPath = join(projectRoot, executorContract.executor_contract_path);
  const executorBeforePoison = readFileSync(executorContractPath, "utf8");
  const poisonedExecutor = readJson(executorContractPath);
  poisonedExecutor.handoff_can_execute = true;
  poisonedExecutor.unattended_execution_authorized = true;
  poisonedExecutor.durable_transport_provided = true;
  poisonedExecutor.proof_authority = "lean_kernel_clean_replay";
  writeJson(executorContractPath, poisonedExecutor);
  const poisonedExecutorSha256 = sha256Text(readFileSync(executorContractPath, "utf8"));
  assert.throws(
    () =>
      recordPiCodexLifecycleUnattendedRealHostExecutionReadiness(
        projectRoot,
        readinessInput(ids, handoffReview, {
          readiness_id: "LIFE-UNATTENDED-EXEC-READINESS-0245-POISONED-EXECUTOR",
          operator_approval_id: ids.approvalId,
          operator_approval_path: approval.approval_path,
          operator_approval_sha256: approval.operator_approval_artifact.sha256,
          unattended_executor_contract_id: ids.executorContractId,
          unattended_executor_contract_path: executorContract.executor_contract_path,
          unattended_executor_contract_sha256: poisonedExecutorSha256
        })
      ),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_EXECUTOR_CONTRACT_INVALID" },
    "readiness must reject promotional or execution-shaped executor contracts even when the hash is current"
  );
  writeFileSync(executorContractPath, executorBeforePoison, "utf8");

  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/pi-codex-lifecycle/unattended-real-host-executor-contract",
    body: executorContractInput(ids, handoffReview, {
      project_root: projectRoot,
      executor_contract_id: "LIFE-UNATTENDED-EXECUTOR-CONTRACT-0245-ROUTE",
      actor: "goal3-task245-route token=plain-token proof_success durable transport provided live transport open production unattended executor"
    })
  });
  assert.equal(routeResponse.status, 200, JSON.stringify(routeResponse.body));
  assert.equal(routeResponse.body.executor_contract.proof_authority, "none");
  assert.equal(routeResponse.body.executor_contract.executor_invoked, false);
  assert.equal(routeResponse.body.executor_contract.unattended_execution_authorized, false);
  assert.equal(routeResponse.body.executor_contract.durable_transport_provided, false);
  assert.equal(routeResponse.body.executor_contract.can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), secretTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), privilegedPublicTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), transportOverclaimTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), unattendedOverclaimTerms);

  const events = readAuditEvents(projectRoot);
  const executorAuditEvent = events.find(
    (event) =>
      event.event_type === "release.pi_codex_unattended_real_host_executor_contract_recorded" &&
      event.payload.executor_contract_id === ids.executorContractId
  );
  assert.ok(executorAuditEvent, "executor contract audit event must be appended");
  assert.equal(executorAuditEvent.payload.handoff_review_id, ids.handoffReviewId);
  assert.equal(executorAuditEvent.payload.executor_contract_artifact_sha256, executorContract.executor_contract_artifact.sha256);
  assert.equal(executorAuditEvent.payload.executor_invoked, false);
  assert.equal(executorAuditEvent.payload.unattended_execution_authorized, false);
  assert.equal(executorAuditEvent.payload.durable_transport_provided, false);
  assert.equal(executorAuditEvent.payload.proof_authority, "none");
  assert.equal(executorAuditEvent.payload.can_certify_ga, false);

  const readinessAuditEvent = events.find(
    (event) =>
      event.event_type === "release.pi_codex_unattended_real_host_execution_readiness_blocked" &&
      event.payload.readiness_id === ids.readinessId
  );
  assert.ok(readinessAuditEvent, "readiness audit event must be appended");
  assert.deepEqual(readinessAuditEvent.payload.blocker_reasons, ["durable_transport_not_provided"]);
  assert.equal(readinessAuditEvent.payload.unattended_executor_contract_id, ids.executorContractId);
  assert.equal(readinessAuditEvent.payload.unattended_executor_contract_current, true);
  assert.equal(readinessAuditEvent.payload.service_owned_unattended_executor_configured, true);
  assert.equal(readinessAuditEvent.payload.durable_transport_provided, false);
  assert.equal(readinessAuditEvent.payload.can_certify_ga, false);
} finally {
  if (previousAllowedPrograms === undefined) {
    delete process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS;
  } else {
    process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS = previousAllowedPrograms;
  }
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task245 unattended real-host executor contract tests passed.");
