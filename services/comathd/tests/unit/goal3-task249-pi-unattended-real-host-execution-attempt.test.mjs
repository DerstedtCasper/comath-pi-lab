import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as comath from "../../dist/index.js";

const {
  createComathServer,
  executeProfileAgentRun,
  getComathdStatus,
  initProject,
  orchestratePiCodexLifecycleAutomaticRealPiExecution,
  readAuditEvents,
  recordPiCodexLifecycleOperatorServiceTransportContinuity,
  recordPiCodexLifecycleUnattendedRealHostDurableTransportContract,
  recordPiCodexLifecycleUnattendedRealHostExecutionAttempt,
  recordPiCodexLifecycleUnattendedRealHostExecutionReadiness,
  recordPiCodexLifecycleUnattendedRealHostExecutorContract,
  recordPiCodexLifecycleUnattendedRealHostOperatorApproval,
  reviewPiCodexLifecycleUnattendedRealHostHandoff,
  spawnWorkstream
} = comath;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task249-unattended-execution-attempt-"));
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
  const dir = join(projectRoot, ".tmp", "task249-fixtures");
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
  const dir = join(projectRoot, ".tmp", "task249-fixtures");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "execution-attempt-agent-run-adapter.mjs");
  writeFileSync(
    path,
    [
      "process.stdout.write('task249 stdout before execution attempt gate\\n');",
      "process.stderr.write('task249 stderr before execution attempt gate\\n');",
      "process.stdout.write('# Agent Report\\n\\n## Input Context\\nTask249 attempt gate fixture.\\n\\n## Claims Proposed\\nproof_authority: none\\n\\n## Evidence Produced\\nRuntime logs only.\\n\\n## Graph Patch\\nNo trusted mutation.\\n\\n## Blockers\\nNo terminal unattended completion.\\n');",
      ""
    ].join("\n"),
    "utf8"
  );
  return path;
}

function writeExecutionAttemptFixture() {
  const dir = join(projectRoot, ".tmp", "task249-fixtures");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "unattended-execution-attempt-fixture.mjs");
  writeFileSync(
    path,
    [
      "process.stdout.write('attempt fixture ran without terminal proof authority token=plain-token proof_success\\n');",
      "process.stderr.write('attempt fixture stderr says durable transport provided but must be sanitized\\n');",
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
    goal: `Task249 service-owned execution attempt fixture ${suffix}.`,
    created_by: "goal3-task249"
  });
  const agentRun = await executeProfileAgentRun(projectRoot, {
    project_id: projectId,
    campaign_id: `CAM-${campaignDigits}`,
    workstream_id: workstream.workstream_id,
    profile_id: "reviewer",
    program: process.execPath,
    adapter_args: [writeAgentRunAdapterFixture()],
    goal: `Run Task249 execution attempt gate fixture ${suffix}.`,
    context_path: `.comath/workstreams/${workstream.workstream_id}/spec.yaml`,
    actor: `goal3-task249-agent-run-${suffix}`
  });
  return { agentRun, route: `/agent/run/${agentRun.run.id}/log-session` };
}

function publicAlias(id, filename) {
  return `service-owned-pi-lifecycle/${id}/${filename}`;
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
    durableTransportContractId: `LIFE-DURABLE-TRANSPORT-CONTRACT-${suffix}`,
    readinessId: `LIFE-UNATTENDED-EXEC-READINESS-${suffix}`,
    attemptId: `LIFE-UNATTENDED-EXEC-ATTEMPT-${suffix}`
  };
}

function orchestrationInput(ids, route, runtimeFixture) {
  return {
    project_id: projectId,
    orchestration_id: ids.orchestrationId,
    actor: `goal3-task249-orchestrator ${projectRoot}\\secret.txt Authorization: Bearer plain-token proof_success durable transport provided long-lived websocket`,
    runtime_probe: {
      probe_id: ids.probeId,
      pi_host_label: `pi-host-task249-${ids.suffix}`,
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
        summary: "automatic checkpoint chain ready for execution attempt gate",
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
      reconnect_reason: "automatic real-Pi lifecycle checkpoint recovery before execution attempt"
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
      open_reason: "bounded lease before execution attempt"
    },
    transport_heartbeat: {
      transport_heartbeat_id: ids.heartbeatId,
      requested_cursor: { operator_event_cursor: "event:9", stdout_cursor: "stdout:0", stderr_cursor: "stderr:0" },
      client_epoch: 9,
      last_seen_event_id: "evt-9",
      heartbeat_reason: "bounded heartbeat before execution attempt"
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

function preparedReviewInput(ids, orchestration, continuity) {
  return {
    project_id: projectId,
    handoff_review_id: ids.handoffReviewId,
    actor: `goal3-task249-review ${projectRoot}\\secret.txt Authorization: Bearer plain-token proof_success durable transport provided long-lived websocket handoff can execute`,
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
    transport_continuity_sha256: continuity.continuity_artifact.sha256
  };
}

function approvalInput(ids, handoffReview) {
  return {
    project_id: projectId,
    approval_id: ids.approvalId,
    actor: `goal3-task249-approval ${projectRoot}\\secret.txt Authorization: Bearer plain-token proof_success durable transport provided live transport open operator approval recorded`,
    handoff_review_id: ids.handoffReviewId,
    handoff_review_path: handoffReview.handoff_review_path,
    handoff_review_sha256: handoffReview.handoff_review_artifact.sha256,
    operator_approval_mode: "manual_operator_approval",
    approval_note: "Operator reviewed the prepared checkpoint chain; execution remains attempt-gated."
  };
}

function executorContractInput(ids, handoffReview) {
  return {
    project_id: projectId,
    executor_contract_id: ids.executorContractId,
    actor: `goal3-task249-executor ${projectRoot}\\secret.txt Authorization: Bearer plain-token proof_success durable transport provided live transport open production unattended executor`,
    handoff_review_id: ids.handoffReviewId,
    handoff_review_path: handoffReview.handoff_review_path,
    handoff_review_sha256: handoffReview.handoff_review_artifact.sha256,
    requested_execution_mode: "production_unattended_real_host",
    executor_contract_kind: "service_owned_unattended_real_host_executor_contract",
    executor_configuration_state: "contract_recorded_executor_not_invoked"
  };
}

function durableTransportContractInput(ids, handoffReview, approval, executorContract) {
  const continuityCheckpoint = handoffReview.prepared_checkpoints.find(
    (checkpoint) => checkpoint.checkpoint_id === "transport_continuity"
  );
  return {
    project_id: projectId,
    durable_transport_contract_id: ids.durableTransportContractId,
    actor: `goal3-task249-durable-transport ${projectRoot}\\secret.txt Authorization: Bearer plain-token proof_success durable transport provided live transport open`,
    handoff_review_id: ids.handoffReviewId,
    handoff_review_path: handoffReview.handoff_review_path,
    handoff_review_sha256: handoffReview.handoff_review_artifact.sha256,
    operator_approval_id: ids.approvalId,
    operator_approval_path: approval.approval_path,
    operator_approval_sha256: approval.operator_approval_artifact.sha256,
    unattended_executor_contract_id: ids.executorContractId,
    unattended_executor_contract_path: executorContract.executor_contract_path,
    unattended_executor_contract_sha256: executorContract.executor_contract_artifact.sha256,
    transport_continuity_id: ids.continuityId,
    transport_continuity_path: continuityCheckpoint.canonical_path,
    transport_continuity_sha256: continuityCheckpoint.sha256,
    durability_contract_kind: "service_owned_external_durable_transport_prerequisite_contract",
    transport_prerequisite_state: "contract_recorded_transport_not_opened"
  };
}

function readinessInput(ids, handoffReview, approval, executorContract, durableTransportContract) {
  return {
    project_id: projectId,
    readiness_id: ids.readinessId,
    actor: `goal3-task249-readiness ${projectRoot}\\secret.txt Authorization: Bearer plain-token proof_success durable transport provided live transport open operator approval recorded`,
    handoff_review_id: ids.handoffReviewId,
    handoff_review_path: handoffReview.handoff_review_path,
    handoff_review_sha256: handoffReview.handoff_review_artifact.sha256,
    requested_execution_mode: "production_unattended_real_host",
    operator_approval_id: ids.approvalId,
    operator_approval_path: approval.approval_path,
    operator_approval_sha256: approval.operator_approval_artifact.sha256,
    unattended_executor_contract_id: ids.executorContractId,
    unattended_executor_contract_path: executorContract.executor_contract_path,
    unattended_executor_contract_sha256: executorContract.executor_contract_artifact.sha256,
    durable_transport_contract_id: ids.durableTransportContractId,
    durable_transport_contract_path: durableTransportContract.durable_transport_contract_path,
    durable_transport_contract_sha256: durableTransportContract.durable_transport_contract_artifact.sha256
  };
}

function executionAttemptInput(ids, readiness, overrides = {}) {
  return {
    project_id: projectId,
    attempt_id: ids.attemptId,
    actor: `goal3-task249-attempt ${projectRoot}\\secret.txt Authorization: Bearer plain-token proof_success durable transport provided live transport open unattended real-host execution completed`,
    readiness_id: ids.readinessId,
    readiness_path: readiness.readiness_path,
    readiness_sha256: readiness.readiness_artifact.sha256,
    requested_execution_mode: "production_unattended_real_host",
    ...overrides
  };
}

const init = initProject({ name: "Goal 3 Task249 unattended real-host execution attempt", root_path: projectRoot });
const projectId = init.project.project_id;

async function createReadyChain(suffix) {
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
    actor: `goal3-task249-continuity ${projectRoot}\\secret.txt Authorization: Bearer plain-token durable transport provided`,
    transport_contract_id: ids.contractId,
    transport_contract_path: orchestration.transport_contract_path,
    transport_contract_sha256: orchestration.transport_contract_artifact.sha256,
    requested_cursor: { operator_event_cursor: "event:11", stdout_cursor: "stdout:512", stderr_cursor: "stderr:0" },
    client_epoch: 11,
    continuity_reason: "prepared handoff continuity before execution attempt gate"
  });
  const handoffReview = reviewPiCodexLifecycleUnattendedRealHostHandoff(
    projectRoot,
    preparedReviewInput(ids, orchestration, continuity)
  );
  const approval = recordPiCodexLifecycleUnattendedRealHostOperatorApproval(
    projectRoot,
    approvalInput(ids, handoffReview)
  );
  const executorContract = recordPiCodexLifecycleUnattendedRealHostExecutorContract(
    projectRoot,
    executorContractInput(ids, handoffReview)
  );
  const durableTransportContract = recordPiCodexLifecycleUnattendedRealHostDurableTransportContract(
    projectRoot,
    durableTransportContractInput(ids, handoffReview, approval, executorContract)
  );
  const readiness = recordPiCodexLifecycleUnattendedRealHostExecutionReadiness(
    projectRoot,
    readinessInput(ids, handoffReview, approval, executorContract, durableTransportContract)
  );
  return { ids, handoffReview, approval, executorContract, durableTransportContract, readiness };
}

process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS = process.execPath;

try {
  process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS = JSON.stringify([process.execPath]);

  assert.equal(
    typeof recordPiCodexLifecycleUnattendedRealHostExecutionAttempt,
    "function",
    "Task249 must export a service-owned unattended real-host execution attempt gate"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("pi_codex_unattended_real_host_execution_attempt_gate"),
    true,
    "Task249 capability ledger must advertise the unattended real-host execution attempt gate"
  );

  const { ids, readiness } = await createReadyChain("0249");
  const blockedAttempt = recordPiCodexLifecycleUnattendedRealHostExecutionAttempt(
    projectRoot,
    executionAttemptInput(ids, readiness)
  );
  assert.equal(blockedAttempt.schema_version, "comath.pi_codex_unattended_real_host_execution_attempt.v1");
  assert.equal(blockedAttempt.attempt_status, "blocked_unattended_real_host_executor_unavailable");
  assert.deepEqual(blockedAttempt.blocker_reasons, ["service_owned_unattended_executor_unavailable"]);
  assert.equal(blockedAttempt.readiness_status, "unattended_real_host_execution_prerequisites_recorded");
  assert.equal(blockedAttempt.readiness_artifact.sha256, readiness.readiness_artifact.sha256);
  assert.equal(blockedAttempt.readiness_current, true);
  assert.equal(blockedAttempt.operator_approval_artifact_current, true);
  assert.equal(blockedAttempt.unattended_executor_contract_current, true);
  assert.equal(blockedAttempt.durable_transport_contract_current, true);
  assert.equal(blockedAttempt.service_owned_unattended_executor_configured, false);
  assert.equal(blockedAttempt.executor_invoked, false);
  assert.equal(blockedAttempt.execution_attempted, false);
  assert.equal(blockedAttempt.execution_attempt_succeeded, false);
  assert.equal(blockedAttempt.execution_attempt_exit_code, null);
  assert.equal(blockedAttempt.operator_approved, false);
  assert.equal(blockedAttempt.handoff_can_execute, false);
  assert.equal(blockedAttempt.unattended_execution_authorized, false);
  assert.equal(blockedAttempt.unattended_real_host_execution_completed, false);
  assert.equal(blockedAttempt.operator_confirmation_bypassed, false);
  assert.equal(blockedAttempt.durable_transport_provided, false);
  assert.equal(blockedAttempt.live_transport_open, false);
  assert.equal(blockedAttempt.proof_authority, "none");
  assert.equal(blockedAttempt.can_promote_claim, false);
  assert.equal(blockedAttempt.can_certify_ga, false);
  assert.equal(JSON.stringify(blockedAttempt).includes(projectRoot), false);
  assert.doesNotMatch(JSON.stringify(blockedAttempt), secretTerms);
  assert.doesNotMatch(JSON.stringify(blockedAttempt), privilegedPublicTerms);
  assert.doesNotMatch(JSON.stringify(blockedAttempt), transportOverclaimTerms);
  assert.doesNotMatch(JSON.stringify(blockedAttempt), unattendedOverclaimTerms);

  const persistedAttemptPath = join(projectRoot, blockedAttempt.attempt_path);
  assert.equal(existsSync(persistedAttemptPath), true, "execution attempt gate must persist append-only evidence");
  const persistedAttempt = readJson(persistedAttemptPath);
  assert.equal(persistedAttempt.attempt_artifact, undefined, "persisted attempt must not self-hash recursively");
  assert.equal(persistedAttempt.proof_authority, "none");
  assert.equal(persistedAttempt.can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(persistedAttempt), secretTerms);
  assert.doesNotMatch(JSON.stringify(persistedAttempt), privilegedPublicTerms);
  assert.doesNotMatch(JSON.stringify(persistedAttempt), transportOverclaimTerms);
  assert.doesNotMatch(JSON.stringify(persistedAttempt), unattendedOverclaimTerms);

  assert.throws(
    () =>
      recordPiCodexLifecycleUnattendedRealHostExecutionAttempt(
        projectRoot,
        executionAttemptInput(ids, readiness)
      ),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_ATTEMPT_ALREADY_EXISTS" },
    "execution attempt manifests must be append-only by attempt id"
  );
  assert.throws(
    () =>
      recordPiCodexLifecycleUnattendedRealHostExecutionAttempt(
        projectRoot,
        executionAttemptInput(ids, readiness, {
          attempt_id: "LIFE-UNATTENDED-EXEC-ATTEMPT-0249-STALE",
          readiness_sha256: "d".repeat(64)
        })
      ),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_ATTEMPT_READINESS_STALE" },
    "execution attempt gate must reject stale readiness hashes"
  );

  const readinessPath = join(projectRoot, readiness.readiness_path);
  const readinessBeforePoison = readFileSync(readinessPath, "utf8");
  const blockedReadiness = readJson(readinessPath);
  blockedReadiness.readiness_status = "blocked_unattended_real_host_execution_not_authorized";
  blockedReadiness.blocker_reasons = ["durable_transport_not_provided"];
  writeJson(readinessPath, blockedReadiness);
  assert.throws(
    () =>
      recordPiCodexLifecycleUnattendedRealHostExecutionAttempt(
        projectRoot,
        executionAttemptInput(ids, readiness, {
          attempt_id: "LIFE-UNATTENDED-EXEC-ATTEMPT-0249-BLOCKED-READINESS",
          readiness_sha256: sha256Text(readFileSync(readinessPath, "utf8"))
        })
      ),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_ATTEMPT_READINESS_INVALID" },
    "execution attempt gate must reject blocked readiness artifacts"
  );
  writeFileSync(readinessPath, readinessBeforePoison, "utf8");

  const promotionalReadiness = readJson(readinessPath);
  promotionalReadiness.operator_approved = true;
  promotionalReadiness.handoff_can_execute = true;
  promotionalReadiness.unattended_execution_authorized = true;
  promotionalReadiness.proof_authority = "lean_kernel_clean_replay";
  promotionalReadiness.can_certify_ga = true;
  writeJson(readinessPath, promotionalReadiness);
  assert.throws(
    () =>
      recordPiCodexLifecycleUnattendedRealHostExecutionAttempt(
        projectRoot,
        executionAttemptInput(ids, readiness, {
          attempt_id: "LIFE-UNATTENDED-EXEC-ATTEMPT-0249-POISONED-READINESS",
          readiness_sha256: sha256Text(readFileSync(readinessPath, "utf8"))
        })
      ),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_ATTEMPT_READINESS_INVALID" },
    "execution attempt gate must reject promotional readiness artifacts even when the hash is current"
  );
  writeFileSync(readinessPath, readinessBeforePoison, "utf8");

  const executorChain = await createReadyChain("0249-RUN");
  const executorFixture = writeExecutionAttemptFixture();
  const attempted = recordPiCodexLifecycleUnattendedRealHostExecutionAttempt(
    projectRoot,
    executionAttemptInput(executorChain.ids, executorChain.readiness, {
      executor_command: {
        program: process.execPath,
        args: [executorFixture],
        expected_exit_code: 0,
        timeout_ms: 5000
      }
    })
  );
  assert.equal(attempted.attempt_status, "unattended_real_host_execution_attempt_recorded");
  assert.deepEqual(attempted.blocker_reasons, []);
  assert.equal(attempted.service_owned_unattended_executor_configured, true);
  assert.equal(attempted.executor_invoked, true);
  assert.equal(attempted.execution_attempted, true);
  assert.equal(attempted.execution_attempt_succeeded, true);
  assert.equal(attempted.execution_attempt_exit_code, 0);
  assert.equal(attempted.execution_attempt_command.shell, false);
  assert.equal(attempted.execution_attempt_command.network, false);
  assert.equal(attempted.execution_attempt_result_artifact.kind, "unattended_real_host_execution_attempt_result");
  assert.equal(attempted.unattended_real_host_execution_completed, false);
  assert.equal(attempted.unattended_execution_authorized, false);
  assert.equal(attempted.proof_authority, "none");
  assert.equal(attempted.can_certify_ga, false);
  assert.equal(JSON.stringify(attempted).includes(projectRoot), false);
  assert.doesNotMatch(JSON.stringify(attempted), secretTerms);
  assert.doesNotMatch(JSON.stringify(attempted), privilegedPublicTerms);
  assert.doesNotMatch(JSON.stringify(attempted), transportOverclaimTerms);
  assert.doesNotMatch(JSON.stringify(attempted), unattendedOverclaimTerms);

  const failedChain = await createReadyChain("0249-FAIL");
  const failedAttempt = recordPiCodexLifecycleUnattendedRealHostExecutionAttempt(
    projectRoot,
    executionAttemptInput(failedChain.ids, failedChain.readiness, {
      executor_command: {
        program: process.execPath,
        args: [executorFixture],
        expected_exit_code: 1,
        timeout_ms: 5000
      }
    })
  );
  assert.equal(failedAttempt.attempt_status, "blocked_unattended_real_host_execution_attempt_failed");
  assert.deepEqual(failedAttempt.blocker_reasons, ["service_owned_unattended_executor_failed"]);
  assert.equal(failedAttempt.executor_invoked, true);
  assert.equal(failedAttempt.execution_attempted, true);
  assert.equal(failedAttempt.execution_attempt_succeeded, false);
  assert.equal(failedAttempt.execution_attempt_exit_code, 0);
  assert.equal(failedAttempt.unattended_real_host_execution_completed, false);
  assert.equal(failedAttempt.proof_authority, "none");
  assert.equal(failedAttempt.can_certify_ga, false);

  const server = createComathServer();
  const routeChain = await createReadyChain("0249-ROUTE");
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/pi-codex-lifecycle/unattended-real-host-execution-attempt",
    body: executionAttemptInput(routeChain.ids, routeChain.readiness, {
      project_root: projectRoot,
      actor: "goal3-task249-route token=plain-token proof_success durable transport provided live transport open unattended real-host execution completed"
    })
  });
  assert.equal(routeResponse.status, 200, JSON.stringify(routeResponse.body));
  assert.equal(routeResponse.body.execution_attempt.proof_authority, "none");
  assert.equal(routeResponse.body.execution_attempt.executor_invoked, false);
  assert.equal(routeResponse.body.execution_attempt.unattended_real_host_execution_completed, false);
  assert.equal(routeResponse.body.execution_attempt.can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), secretTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), privilegedPublicTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), transportOverclaimTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), unattendedOverclaimTerms);

  const events = readAuditEvents(projectRoot);
  const blockedAuditEvent = events.find(
    (event) =>
      event.event_type === "release.pi_codex_unattended_real_host_execution_attempt_blocked" &&
      event.payload.attempt_id === ids.attemptId
  );
  assert.ok(blockedAuditEvent, "blocked execution attempt audit event must be appended");
  assert.equal(blockedAuditEvent.payload.readiness_id, ids.readinessId);
  assert.equal(blockedAuditEvent.payload.readiness_artifact_sha256, readiness.readiness_artifact.sha256);
  assert.equal(blockedAuditEvent.payload.executor_invoked, false);
  assert.equal(blockedAuditEvent.payload.unattended_real_host_execution_completed, false);
  assert.equal(blockedAuditEvent.payload.proof_authority, "none");
  assert.equal(blockedAuditEvent.payload.can_certify_ga, false);

  const attemptedAuditEvent = events.find(
    (event) =>
      event.event_type === "release.pi_codex_unattended_real_host_execution_attempt_recorded" &&
      event.payload.attempt_id === executorChain.ids.attemptId
  );
  assert.ok(attemptedAuditEvent, "recorded execution attempt audit event must be appended");
  assert.equal(attemptedAuditEvent.payload.executor_invoked, true);
  assert.equal(attemptedAuditEvent.payload.execution_attempt_succeeded, true);
  assert.equal(attemptedAuditEvent.payload.unattended_real_host_execution_completed, false);
  assert.equal(attemptedAuditEvent.payload.proof_authority, "none");
  assert.equal(attemptedAuditEvent.payload.can_certify_ga, false);
  const failedAuditEvent = events.find(
    (event) =>
      event.event_type === "release.pi_codex_unattended_real_host_execution_attempt_blocked" &&
      event.payload.attempt_id === failedChain.ids.attemptId
  );
  assert.ok(failedAuditEvent, "failed executor attempts must append blocked audit events");
  assert.equal(failedAuditEvent.payload.executor_invoked, true);
  assert.equal(failedAuditEvent.payload.execution_attempt_succeeded, false);
  assert.equal(failedAuditEvent.payload.unattended_real_host_execution_completed, false);
  assert.equal(failedAuditEvent.payload.proof_authority, "none");
  assert.equal(failedAuditEvent.payload.can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(events), secretTerms);
  assert.doesNotMatch(JSON.stringify(events), privilegedPublicTerms);
  assert.doesNotMatch(JSON.stringify(events), transportOverclaimTerms);
  assert.doesNotMatch(JSON.stringify(events), unattendedOverclaimTerms);
} finally {
  if (previousAllowedPrograms === undefined) {
    delete process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS;
  } else {
    process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS = previousAllowedPrograms;
  }
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task249 unattended real-host execution attempt tests passed.");
