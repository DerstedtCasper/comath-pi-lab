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
  recordPiCodexLifecycleUnattendedRealHostExecutionReadiness,
  recordPiCodexLifecycleUnattendedRealHostExecutorContract,
  recordPiCodexLifecycleUnattendedRealHostOperatorApproval,
  reviewPiCodexLifecycleUnattendedRealHostHandoff,
  spawnWorkstream
} = comath;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task247-durable-transport-contract-"));
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
  const dir = join(projectRoot, ".tmp", "task247-fixtures");
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
  const dir = join(projectRoot, ".tmp", "task247-fixtures");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "durable-transport-contract-agent-run-adapter.mjs");
  writeFileSync(
    path,
    [
      "process.stdout.write('task247 stdout before durable transport contract\\n');",
      "process.stderr.write('task247 stderr before durable transport contract\\n');",
      "process.stdout.write('# Agent Report\\n\\n## Input Context\\nTask247 durable transport prerequisite fixture.\\n\\n## Claims Proposed\\nproof_authority: none\\n\\n## Evidence Produced\\nRuntime logs only.\\n\\n## Graph Patch\\nNo trusted mutation.\\n\\n## Blockers\\nNo unattended execution and no live transport.\\n');",
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
    goal: `Task247 service-owned durable transport prerequisite fixture ${suffix}.`,
    created_by: "goal3-task247"
  });
  const agentRun = await executeProfileAgentRun(projectRoot, {
    project_id: projectId,
    campaign_id: `CAM-${campaignDigits}`,
    workstream_id: workstream.workstream_id,
    profile_id: "reviewer",
    program: process.execPath,
    adapter_args: [writeAgentRunAdapterFixture()],
    goal: `Run Task247 durable transport prerequisite fixture ${suffix}.`,
    context_path: `.comath/workstreams/${workstream.workstream_id}/spec.yaml`,
    actor: `goal3-task247-agent-run-${suffix}`
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
    readinessId: `LIFE-UNATTENDED-EXEC-READINESS-${suffix}`
  };
}

function orchestrationInput(ids, route, runtimeFixture) {
  return {
    project_id: projectId,
    orchestration_id: ids.orchestrationId,
    actor: `goal3-task247-orchestrator ${projectRoot}\\secret.txt Authorization: Bearer plain-token proof_success durable transport provided long-lived websocket`,
    runtime_probe: {
      probe_id: ids.probeId,
      pi_host_label: `pi-host-task247-${ids.suffix}`,
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
        summary: "automatic checkpoint chain ready for durable transport prerequisite contract",
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
      reconnect_reason: "automatic real-Pi lifecycle checkpoint recovery before durable transport contract"
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
      open_reason: "bounded lease before durable transport contract"
    },
    transport_heartbeat: {
      transport_heartbeat_id: ids.heartbeatId,
      requested_cursor: { operator_event_cursor: "event:9", stdout_cursor: "stdout:0", stderr_cursor: "stderr:0" },
      client_epoch: 9,
      last_seen_event_id: "evt-9",
      heartbeat_reason: "bounded heartbeat before durable transport contract"
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
    actor: `goal3-task247-review ${projectRoot}\\secret.txt Authorization: Bearer plain-token proof_success durable transport provided long-lived websocket handoff can execute`,
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
    actor: `goal3-task247-approval ${projectRoot}\\secret.txt Authorization: Bearer plain-token proof_success durable transport provided live transport open operator approval recorded`,
    handoff_review_id: ids.handoffReviewId,
    handoff_review_path: handoffReview.handoff_review_path,
    handoff_review_sha256: handoffReview.handoff_review_artifact.sha256,
    operator_approval_mode: "manual_operator_approval",
    approval_note: "Operator reviewed the prepared checkpoint chain; execution remains blocked until executor and durable transport prerequisites exist.",
    ...overrides
  };
}

function executorContractInput(ids, handoffReview, overrides = {}) {
  return {
    project_id: projectId,
    executor_contract_id: ids.executorContractId,
    actor: `goal3-task247-executor ${projectRoot}\\secret.txt Authorization: Bearer plain-token proof_success durable transport provided live transport open production unattended executor`,
    handoff_review_id: ids.handoffReviewId,
    handoff_review_path: handoffReview.handoff_review_path,
    handoff_review_sha256: handoffReview.handoff_review_artifact.sha256,
    requested_execution_mode: "production_unattended_real_host",
    executor_contract_kind: "service_owned_unattended_real_host_executor_contract",
    executor_configuration_state: "contract_recorded_executor_not_invoked",
    ...overrides
  };
}

function durableTransportContractInput(ids, handoffReview, approval, executorContract, overrides = {}) {
  return {
    project_id: projectId,
    durable_transport_contract_id: ids.durableTransportContractId,
    actor: `goal3-task247-durable-transport ${projectRoot}\\secret.txt Authorization: Bearer plain-token proof_success durable transport provided live transport open`,
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
    transport_continuity_path: handoffReview.prepared_checkpoints.find(
      (checkpoint) => checkpoint.checkpoint_id === "transport_continuity"
    ).canonical_path,
    transport_continuity_sha256: handoffReview.prepared_checkpoints.find(
      (checkpoint) => checkpoint.checkpoint_id === "transport_continuity"
    ).sha256,
    durability_contract_kind: "service_owned_external_durable_transport_prerequisite_contract",
    transport_prerequisite_state: "contract_recorded_transport_not_opened",
    ...overrides
  };
}

function readinessInput(ids, handoffReview, approval, executorContract, durableTransportContract, overrides = {}) {
  return {
    project_id: projectId,
    readiness_id: ids.readinessId,
    actor: `goal3-task247-readiness ${projectRoot}\\secret.txt Authorization: Bearer plain-token proof_success durable transport provided live transport open operator approval recorded`,
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
    durable_transport_contract_sha256: durableTransportContract.durable_transport_contract_artifact.sha256,
    ...overrides
  };
}

const init = initProject({ name: "Goal 3 Task247 unattended real-host durable transport contract", root_path: projectRoot });
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
    actor: `goal3-task247-continuity ${projectRoot}\\secret.txt Authorization: Bearer plain-token durable transport provided`,
    transport_contract_id: ids.contractId,
    transport_contract_path: orchestration.transport_contract_path,
    transport_contract_sha256: orchestration.transport_contract_artifact.sha256,
    requested_cursor: { operator_event_cursor: "event:11", stdout_cursor: "stdout:512", stderr_cursor: "stderr:0" },
    client_epoch: 11,
    continuity_reason: "prepared handoff continuity before durable transport contract"
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
  return { ids, handoffReview, approval, executorContract };
}

process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS = process.execPath;

try {
  process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS = JSON.stringify([process.execPath]);

  assert.equal(
    typeof comath.recordPiCodexLifecycleUnattendedRealHostDurableTransportContract,
    "function",
    "Task247 must export a service-owned unattended real-host durable transport prerequisite recorder"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("pi_codex_unattended_real_host_durable_transport_contract"),
    true,
    "Task247 capability ledger must advertise durable transport prerequisite evidence"
  );

  const { ids, handoffReview, approval, executorContract } = await createReviewedChain("0247");
  const durableTransportContract = comath.recordPiCodexLifecycleUnattendedRealHostDurableTransportContract(
    projectRoot,
    durableTransportContractInput(ids, handoffReview, approval, executorContract)
  );
  assert.equal(
    durableTransportContract.schema_version,
    "comath.pi_codex_unattended_real_host_durable_transport_contract.v1"
  );
  assert.equal(
    durableTransportContract.durable_transport_contract_status,
    "durable_transport_prerequisite_contract_recorded"
  );
  assert.equal(
    durableTransportContract.durability_contract_kind,
    "service_owned_external_durable_transport_prerequisite_contract"
  );
  assert.equal(durableTransportContract.transport_prerequisite_state, "contract_recorded_transport_not_opened");
  assert.equal(durableTransportContract.handoff_review_id, ids.handoffReviewId);
  assert.equal(durableTransportContract.operator_approval_artifact.sha256, approval.operator_approval_artifact.sha256);
  assert.equal(
    durableTransportContract.unattended_executor_contract_artifact.sha256,
    executorContract.executor_contract_artifact.sha256
  );
  assert.equal(durableTransportContract.transport_continuity_id, ids.continuityId);
  assert.equal(durableTransportContract.service_transport_primitive, "node_http_agent_run_log_session_route");
  assert.equal(durableTransportContract.client_transport_primitive, "pi_fetch_get_text");
  assert.equal(durableTransportContract.durable_transport_contract_current, true);
  assert.equal(durableTransportContract.service_owned_durable_transport_prerequisite_configured, true);
  assert.equal(durableTransportContract.durable_transport_provided, false);
  assert.equal(durableTransportContract.live_transport_open, false);
  assert.equal(durableTransportContract.unattended_execution_authorized, false);
  assert.equal(durableTransportContract.unattended_real_host_execution_completed, false);
  assert.equal(durableTransportContract.proof_authority, "none");
  assert.equal(durableTransportContract.can_certify_ga, false);
  assert.equal(JSON.stringify(durableTransportContract).includes(projectRoot), false);
  assert.doesNotMatch(JSON.stringify(durableTransportContract), secretTerms);
  assert.doesNotMatch(JSON.stringify(durableTransportContract), privilegedPublicTerms);
  assert.doesNotMatch(JSON.stringify(durableTransportContract), transportOverclaimTerms);
  assert.doesNotMatch(JSON.stringify(durableTransportContract), unattendedOverclaimTerms);

  const persistedPath = join(projectRoot, durableTransportContract.durable_transport_contract_path);
  const durableContractPath = persistedPath;
  assert.equal(existsSync(persistedPath), true, "durable transport contract must persist append-only evidence");
  const persistedContract = readJson(persistedPath);
  assert.equal(
    persistedContract.durable_transport_contract_artifact,
    undefined,
    "persisted durable transport contract must not self-hash recursively"
  );

  assert.throws(
    () =>
      comath.recordPiCodexLifecycleUnattendedRealHostDurableTransportContract(
        projectRoot,
        durableTransportContractInput(ids, handoffReview, approval, executorContract)
      ),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_DURABLE_TRANSPORT_CONTRACT_ALREADY_EXISTS" },
    "durable transport contract manifests must be append-only by contract id"
  );
  assert.throws(
    () =>
      comath.recordPiCodexLifecycleUnattendedRealHostDurableTransportContract(
        projectRoot,
        durableTransportContractInput(ids, handoffReview, approval, executorContract, {
          durable_transport_contract_id: "LIFE-DURABLE-TRANSPORT-CONTRACT-0247-BAD-KIND",
          durability_contract_kind: "comath_owned_websocket_transport_stack"
        })
      ),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_DURABLE_TRANSPORT_CONTRACT_INVALID_KIND" },
    "durable transport contract must reject CoMath-owned transport stack contracts"
  );
  assert.throws(
    () =>
      comath.recordPiCodexLifecycleUnattendedRealHostDurableTransportContract(
        projectRoot,
        durableTransportContractInput(ids, handoffReview, approval, executorContract, {
          durable_transport_contract_id: "LIFE-DURABLE-TRANSPORT-CONTRACT-0247-BAD-CONTINUITY-PATH",
          transport_continuity_path: handoffReview.handoff_review_path
        })
      ),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_DURABLE_TRANSPORT_CONTRACT_INVALID_CONTINUITY" },
    "durable transport contract must reject non-canonical continuity artifact paths"
  );

  const drift = await createReviewedChain("0247-DRIFT");
  const driftContinuity = drift.handoffReview.prepared_checkpoints.find(
    (checkpoint) => checkpoint.checkpoint_id === "transport_continuity"
  );
  assert.throws(
    () =>
      comath.recordPiCodexLifecycleUnattendedRealHostDurableTransportContract(
        projectRoot,
        durableTransportContractInput(ids, handoffReview, approval, executorContract, {
          durable_transport_contract_id: "LIFE-DURABLE-TRANSPORT-CONTRACT-0247-DRIFT",
          transport_continuity_id: drift.ids.continuityId,
          transport_continuity_path: driftContinuity.canonical_path,
          transport_continuity_sha256: driftContinuity.sha256
        })
      ),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_DURABLE_TRANSPORT_CONTRACT_INVALID" },
    "durable transport contract must reject continuity artifacts from a different handoff chain"
  );
  assert.throws(
    () =>
      recordPiCodexLifecycleUnattendedRealHostExecutionReadiness(
        projectRoot,
        readinessInput(ids, handoffReview, approval, executorContract, durableTransportContract, {
          readiness_id: "LIFE-UNATTENDED-EXEC-READINESS-0247-INCOMPLETE-DURABLE",
          durable_transport_contract_sha256: undefined
        })
      ),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_DURABLE_TRANSPORT_CONTRACT_INVALID" },
    "readiness must reject incomplete durable transport contract bindings"
  );

  const readiness = recordPiCodexLifecycleUnattendedRealHostExecutionReadiness(
    projectRoot,
    readinessInput(ids, handoffReview, approval, executorContract, durableTransportContract)
  );
  assert.equal(readiness.readiness_status, "unattended_real_host_execution_prerequisites_recorded");
  assert.deepEqual(readiness.blocker_reasons, []);
  assert.equal(readiness.operator_approval_artifact_current, true);
  assert.equal(readiness.unattended_executor_contract_current, true);
  assert.equal(readiness.durable_transport_contract_id, ids.durableTransportContractId);
  assert.equal(
    readiness.durable_transport_contract_artifact.sha256,
    durableTransportContract.durable_transport_contract_artifact.sha256
  );
  assert.equal(readiness.durable_transport_contract_current, true);
  assert.equal(readiness.service_owned_durable_transport_prerequisite_configured, true);
  assert.equal(readiness.operator_approved, false);
  assert.equal(readiness.handoff_can_execute, false);
  assert.equal(readiness.unattended_execution_authorized, false);
  assert.equal(readiness.unattended_real_host_execution_completed, false);
  assert.equal(readiness.durable_transport_provided, false);
  assert.equal(readiness.live_transport_open, false);
  assert.equal(readiness.proof_authority, "none");
  assert.equal(readiness.can_certify_ga, false);

  assert.throws(
    () =>
      recordPiCodexLifecycleUnattendedRealHostExecutionReadiness(
        projectRoot,
        readinessInput(ids, handoffReview, approval, executorContract, durableTransportContract, {
          readiness_id: "LIFE-UNATTENDED-EXEC-READINESS-0247-STALE-DURABLE",
          durable_transport_contract_sha256: "c".repeat(64)
        })
      ),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_DURABLE_TRANSPORT_CONTRACT_STALE" },
    "readiness must reject stale durable transport contract hashes"
  );

  const durableBeforePoison = readFileSync(durableContractPath, "utf8");
  const missingContinuityArtifact = readJson(durableContractPath);
  delete missingContinuityArtifact.transport_continuity_artifact;
  writeJson(durableContractPath, missingContinuityArtifact);
  assert.throws(
    () =>
      recordPiCodexLifecycleUnattendedRealHostExecutionReadiness(
        projectRoot,
        readinessInput(ids, handoffReview, approval, executorContract, durableTransportContract, {
          readiness_id: "LIFE-UNATTENDED-EXEC-READINESS-0247-MISSING-CONTINUITY-ARTIFACT",
          durable_transport_contract_sha256: sha256Text(readFileSync(durableContractPath, "utf8"))
        })
      ),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_DURABLE_TRANSPORT_CONTRACT_INVALID" },
    "readiness must reject malformed durable contracts instead of leaking a raw TypeError"
  );
  writeFileSync(durableContractPath, durableBeforePoison, "utf8");

  const badNestedApprovalArtifact = readJson(durableContractPath);
  badNestedApprovalArtifact.operator_approval_artifact = {
    ...badNestedApprovalArtifact.operator_approval_artifact,
    size_bytes: badNestedApprovalArtifact.operator_approval_artifact.size_bytes + 1
  };
  writeJson(durableContractPath, badNestedApprovalArtifact);
  assert.throws(
    () =>
      recordPiCodexLifecycleUnattendedRealHostExecutionReadiness(
        projectRoot,
        readinessInput(ids, handoffReview, approval, executorContract, durableTransportContract, {
          readiness_id: "LIFE-UNATTENDED-EXEC-READINESS-0247-BAD-APPROVAL-ARTIFACT",
          durable_transport_contract_sha256: sha256Text(readFileSync(durableContractPath, "utf8"))
        })
      ),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_DURABLE_TRANSPORT_CONTRACT_INVALID" },
    "readiness must reject durable contracts with nested approval artifact metadata drift"
  );
  writeFileSync(durableContractPath, durableBeforePoison, "utf8");

  const badNestedContinuityArtifact = readJson(durableContractPath);
  badNestedContinuityArtifact.transport_continuity_artifact = {
    ...badNestedContinuityArtifact.transport_continuity_artifact,
    kind: "operator_service_transport_contract"
  };
  writeJson(durableContractPath, badNestedContinuityArtifact);
  assert.throws(
    () =>
      recordPiCodexLifecycleUnattendedRealHostExecutionReadiness(
        projectRoot,
        readinessInput(ids, handoffReview, approval, executorContract, durableTransportContract, {
          readiness_id: "LIFE-UNATTENDED-EXEC-READINESS-0247-BAD-CONTINUITY-ARTIFACT",
          durable_transport_contract_sha256: sha256Text(readFileSync(durableContractPath, "utf8"))
        })
      ),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_DURABLE_TRANSPORT_CONTRACT_INVALID" },
    "readiness must reject durable contracts with nested continuity artifact metadata drift"
  );
  writeFileSync(durableContractPath, durableBeforePoison, "utf8");

  const poisonedDurable = readJson(durableContractPath);
  poisonedDurable.durable_transport_provided = true;
  poisonedDurable.live_transport_open = true;
  poisonedDurable.handoff_can_execute = true;
  poisonedDurable.proof_authority = "lean_kernel_clean_replay";
  writeJson(durableContractPath, poisonedDurable);
  const poisonedDurableSha256 = sha256Text(readFileSync(durableContractPath, "utf8"));
  assert.throws(
    () =>
      recordPiCodexLifecycleUnattendedRealHostExecutionReadiness(
        projectRoot,
        readinessInput(ids, handoffReview, approval, executorContract, durableTransportContract, {
          readiness_id: "LIFE-UNATTENDED-EXEC-READINESS-0247-POISONED-DURABLE",
          durable_transport_contract_sha256: poisonedDurableSha256
        })
      ),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_DURABLE_TRANSPORT_CONTRACT_INVALID" },
    "readiness must reject promotional or live-transport durable contracts even when the hash is current"
  );
  writeFileSync(durableContractPath, durableBeforePoison, "utf8");

  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/pi-codex-lifecycle/unattended-real-host-durable-transport-contract",
    body: durableTransportContractInput(ids, handoffReview, approval, executorContract, {
      project_root: projectRoot,
      durable_transport_contract_id: "LIFE-DURABLE-TRANSPORT-CONTRACT-0247-ROUTE",
      actor: "goal3-task247-route token=plain-token proof_success durable transport provided live transport open"
    })
  });
  assert.equal(routeResponse.status, 200, JSON.stringify(routeResponse.body));
  assert.equal(routeResponse.body.durable_transport_contract.proof_authority, "none");
  assert.equal(routeResponse.body.durable_transport_contract.durable_transport_provided, false);
  assert.equal(routeResponse.body.durable_transport_contract.live_transport_open, false);
  assert.equal(routeResponse.body.durable_transport_contract.can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), secretTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), privilegedPublicTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), transportOverclaimTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), unattendedOverclaimTerms);

  const events = readAuditEvents(projectRoot);
  const durableAuditEvent = events.find(
    (event) =>
      event.event_type === "release.pi_codex_unattended_real_host_durable_transport_contract_recorded" &&
      event.payload.durable_transport_contract_id === ids.durableTransportContractId
  );
  assert.ok(durableAuditEvent, "durable transport contract audit event must be appended");
  assert.equal(durableAuditEvent.payload.handoff_review_id, ids.handoffReviewId);
  assert.equal(
    durableAuditEvent.payload.durable_transport_contract_artifact_sha256,
    durableTransportContract.durable_transport_contract_artifact.sha256
  );
  assert.equal(durableAuditEvent.payload.durable_transport_provided, false);
  assert.equal(durableAuditEvent.payload.live_transport_open, false);
  assert.equal(durableAuditEvent.payload.indefinite_stream_open, false);
  assert.equal(durableAuditEvent.payload.long_lived_websocket_provided, false);
  assert.equal(durableAuditEvent.payload.long_lived_sse_provided, false);
  assert.equal(durableAuditEvent.payload.pi_direct_write_allowed, false);
  assert.equal(durableAuditEvent.payload.direct_trusted_state_mutation, false);
  assert.equal(durableAuditEvent.payload.proof_authority, "none");
  assert.equal(durableAuditEvent.payload.can_promote_claim, false);
  assert.equal(durableAuditEvent.payload.can_certify_ga, false);

  const readinessAuditEvent = events.find(
    (event) =>
      event.event_type === "release.pi_codex_unattended_real_host_execution_readiness_prerequisites_recorded" &&
      event.payload.readiness_id === ids.readinessId
  );
  assert.ok(readinessAuditEvent, "readiness prerequisite audit event must be appended");
  assert.deepEqual(readinessAuditEvent.payload.blocker_reasons, []);
  assert.equal(readinessAuditEvent.payload.durable_transport_contract_id, ids.durableTransportContractId);
  assert.equal(readinessAuditEvent.payload.durable_transport_contract_current, true);
  assert.equal(readinessAuditEvent.payload.service_owned_durable_transport_prerequisite_configured, true);
  assert.equal(readinessAuditEvent.payload.unattended_execution_authorized, false);
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

console.log("Goal 3 Task247 unattended real-host durable transport contract tests passed.");
