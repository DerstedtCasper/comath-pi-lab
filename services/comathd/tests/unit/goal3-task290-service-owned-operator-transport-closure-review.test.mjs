import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
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
  recordPiCodexLifecycleUnattendedRealHostExecutorContract,
  recordPiCodexLifecycleUnattendedRealHostOperatorApproval,
  recordPiCodexLifecycleUnattendedRealHostTerminalCompletionCertificate,
  recordPiCodexLifecycleUnattendedRealHostTerminalCompletionCertificateDesign,
  reviewPiCodexLifecycleUnattendedRealHostHandoff,
  spawnWorkstream
} = comath;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task290-transport-closure-review-"));
const previousAllowedPrograms = process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS;
const init = initProject({ name: "Goal 3 Task290 operator transport closure review", root_path: projectRoot });
const projectId = init.project.project_id;
const secretTerms = /COMATH_CODEX_API_KEY|OPENAI_API_KEY|Authorization:\s*Bearer|api_key|token=|plain-token|sk-/i;
const proofAuthorityTerms =
  /clean_replay_passed|completed_formal_proof|formally_checked|proven|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|kernel_checked|proof_success/i;
const gaOverclaimTerms = /GA certified|can_certify_ga\s*[:=]\s*(?:true|1)/i;
const transportOverclaimTerms =
  /long[- ]lived\s+(?:websocket|sse)|indefinite\s+sse|terminal transport recovered live|durable transport provided|live transport open/i;

function sha256Text(text) {
  return createHash("sha256").update(text).digest("hex");
}

function writeJson(path, value) {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text, "utf8");
  return {
    text,
    sha256: sha256Text(text),
    size_bytes: Buffer.byteLength(text, "utf8")
  };
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function publicAlias(id, filename) {
  return `service-owned-pi-lifecycle/${id}/${filename}`;
}

function writeRuntimeProbeFixture() {
  const dir = join(projectRoot, ".tmp", "task290-fixtures");
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

function writeAgentRunAdapterFixture(suffix) {
  const dir = join(projectRoot, ".tmp", "task290-fixtures");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `operator-service-transport-closure-${suffix}.mjs`);
  writeFileSync(
    path,
    [
      "process.stdout.write('task290 stdout before closure review\\n');",
      "process.stderr.write('task290 stderr before closure review\\n');",
      "process.stdout.write('# Agent Report\\n\\n## Input Context\\nTask290 service-owned transport closure fixture.\\n\\n## Claims Proposed\\nproof_authority: none\\n\\n## Evidence Produced\\nRuntime logs only.\\n\\n## Graph Patch\\nNo trusted mutation.\\n\\n## Blockers\\nNo durable transport and no live transport.\\n');",
      ""
    ].join("\n"),
    "utf8"
  );
  return path;
}

async function createServiceOwnedAgentRunRoute(suffix) {
  const campaignDigits = suffix.replace(/\D/g, "").padEnd(4, "0").slice(0, 8);
  const workstream = spawnWorkstream(projectRoot, {
    project_id: projectId,
    kind: "proof_route",
    goal: `Task290 service-owned operator transport closure fixture ${suffix}.`,
    created_by: "goal3-task290"
  });
  const agentRun = await executeProfileAgentRun(projectRoot, {
    project_id: projectId,
    campaign_id: `CAM-${campaignDigits}`,
    workstream_id: workstream.workstream_id,
    profile_id: "reviewer",
    program: process.execPath,
    adapter_args: [writeAgentRunAdapterFixture(suffix)],
    goal: `Run Task290 closure fixture ${suffix}.`,
    context_path: `.comath/workstreams/${workstream.workstream_id}/spec.yaml`,
    actor: `goal3-task290-agent-run-${suffix}`
  });
  return { agentRun, route: `/agent/run/${agentRun.run.id}/log-session` };
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
    durableTransportContractId: `LIFE-DURABLE-TRANSPORT-CONTRACT-${suffix}`
  };
}

function orchestrationInput(ids, route, runtimeFixture) {
  return {
    project_id: projectId,
    orchestration_id: ids.orchestrationId,
    actor: `goal3-task290-orchestrator ${projectRoot}\\secret.txt Authorization: Bearer plain-token proof_success durable transport provided long-lived websocket`,
    runtime_probe: {
      probe_id: ids.probeId,
      pi_host_label: `pi-host-task290-${ids.suffix}`,
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
        summary: "automatic checkpoint chain ready for Task290 closure review",
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
      reconnect_reason: "automatic lifecycle checkpoint recovery before Task290 closure review"
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
      open_reason: "bounded lease before Task290 closure review"
    },
    transport_heartbeat: {
      transport_heartbeat_id: ids.heartbeatId,
      requested_cursor: { operator_event_cursor: "event:9", stdout_cursor: "stdout:0", stderr_cursor: "stderr:0" },
      client_epoch: 9,
      last_seen_event_id: "evt-9",
      heartbeat_reason: "bounded heartbeat before Task290 closure review"
    },
    guided_execution: {
      execution_id: ids.executionId,
      observed_routes: [
        "/cm:release lifecycle-operator-transport-heartbeat",
        "/cm:release lifecycle-guided-real-pi-execution"
      ],
      operator_command_summary: "automatic orchestrator recorded service-owned checkpoint chain",
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
    actor: `goal3-task290-review ${projectRoot}\\secret.txt Authorization: Bearer plain-token proof_success durable transport provided long-lived websocket handoff can execute`,
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
    actor: `goal3-task290-approval ${projectRoot}\\secret.txt Authorization: Bearer plain-token proof_success durable transport provided live transport open operator approval recorded`,
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
    actor: `goal3-task290-executor ${projectRoot}\\secret.txt Authorization: Bearer plain-token proof_success durable transport provided live transport open production unattended executor`,
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
  const continuityCheckpoint = handoffReview.prepared_checkpoints.find(
    (checkpoint) => checkpoint.checkpoint_id === "transport_continuity"
  );
  return {
    project_id: projectId,
    durable_transport_contract_id: ids.durableTransportContractId,
    actor: `goal3-task290-durable-transport ${projectRoot}\\secret.txt Authorization: Bearer plain-token proof_success durable transport provided live transport open`,
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
    transport_prerequisite_state: "contract_recorded_transport_not_opened",
    ...overrides
  };
}

async function createDurableTransportChain(suffix) {
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
    actor: `goal3-task290-continuity ${projectRoot}\\secret.txt Authorization: Bearer plain-token durable transport provided`,
    transport_contract_id: ids.contractId,
    transport_contract_path: orchestration.transport_contract_path,
    transport_contract_sha256: orchestration.transport_contract_artifact.sha256,
    requested_cursor: { operator_event_cursor: "event:11", stdout_cursor: "stdout:512", stderr_cursor: "stderr:0" },
    client_epoch: 11,
    continuity_reason: "prepared handoff continuity before Task290 closure review"
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
  return { ids, orchestration, continuity, handoffReview, approval, executorContract, durableTransportContract };
}

function attemptReviewPath(id) {
  return `.comath/release/pi-codex-lifecycle/${id}/unattended-real-host-execution-attempt-review.json`;
}

function prerequisitePath(id) {
  return `.comath/release/pi-codex-lifecycle/${id}/unattended-real-host-completion-certification-prerequisite.json`;
}

function writeAttemptReviewFixture(suffix, chain, overrides = {}) {
  const attemptReviewId = `LIFE-UNATTENDED-COMPLETION-REVIEW-${suffix}`;
  const attemptId = `LIFE-UNATTENDED-EXEC-ATTEMPT-${suffix}`;
  const attemptPath = `.comath/release/pi-codex-lifecycle/${attemptId}/unattended-real-host-execution-attempt.json`;
  const resultPath = `.comath/release/pi-codex-lifecycle/${attemptId}/unattended-real-host-execution-attempt-result.json`;
  const path = attemptReviewPath(attemptReviewId);
  const resultArtifact = writeJson(join(projectRoot, resultPath), {
    schema_version: "comath.pi_codex_unattended_real_host_execution_attempt_result.v1",
    attempt_id: attemptId,
    ok: true,
    exit_code: 0,
    stdout: "SHOULD_NOT_LEAK_TASK290_STDOUT",
    stderr: "SHOULD_NOT_LEAK_TASK290_STDERR"
  });
  const durable = chain.durableTransportContract;
  const review = {
    schema_version: "comath.pi_codex_unattended_real_host_execution_attempt_review.v1",
    attempt_review_id: attemptReviewId,
    project_id: projectId,
    actor: `goal3-task290-review-${suffix} token=plain-token proof_success terminal unattended completion certified`,
    created_at: "2026-06-09T00:00:00.000Z",
    attempt_review_status: "blocked_terminal_unattended_completion_review_required",
    terminal_goal_state: "blocked_with_replayable_certificate",
    attempt_review_path: path,
    requested_review_mode: "terminal_unattended_real_host_execution",
    blocker_reasons: ["terminal_unattended_completion_evidence_missing"],
    attempt_id: attemptId,
    attempt_status: "unattended_real_host_execution_attempt_recorded",
    attempt_path: attemptPath,
    attempt_artifact: {
      kind: "unattended_real_host_execution_attempt",
      path: attemptPath,
      sha256: "a".repeat(64),
      size_bytes: 1200
    },
    attempt_current: true,
    readiness_id: `LIFE-UNATTENDED-EXEC-READINESS-${suffix}`,
    readiness_status: "unattended_real_host_execution_prerequisites_recorded",
    readiness_path: `.comath/release/pi-codex-lifecycle/LIFE-UNATTENDED-EXEC-READINESS-${suffix}/unattended-real-host-execution-readiness.json`,
    readiness_artifact: {
      kind: "unattended_real_host_execution_readiness",
      path: `.comath/release/pi-codex-lifecycle/LIFE-UNATTENDED-EXEC-READINESS-${suffix}/unattended-real-host-execution-readiness.json`,
      sha256: "b".repeat(64),
      size_bytes: 1300
    },
    readiness_current: true,
    handoff_review_id: chain.handoffReview.handoff_review_id,
    handoff_review_path: chain.handoffReview.handoff_review_path,
    handoff_review_artifact: chain.handoffReview.handoff_review_artifact,
    handoff_review_current: true,
    operator_approval_id: chain.approval.approval_id,
    operator_approval_path: chain.approval.approval_path,
    operator_approval_artifact: chain.approval.operator_approval_artifact,
    operator_approval_artifact_current: true,
    unattended_executor_contract_id: chain.executorContract.executor_contract_id,
    unattended_executor_contract_path: chain.executorContract.executor_contract_path,
    unattended_executor_contract_artifact: chain.executorContract.executor_contract_artifact,
    unattended_executor_contract_current: true,
    durable_transport_contract_id: durable.durable_transport_contract_id,
    durable_transport_contract_path: durable.durable_transport_contract_path,
    durable_transport_contract_artifact: durable.durable_transport_contract_artifact,
    durable_transport_contract_current: true,
    service_owned_checkpoint_chain_reviewed: true,
    service_owned_attempt_review_completed: true,
    terminal_unattended_completion_certified: false,
    service_owned_unattended_executor_configured: true,
    service_owned_durable_transport_prerequisite_configured: true,
    execution_attempt_manifest_persisted: true,
    execution_attempt_command: {
      program_label: "goal3-task290-fixture",
      program_path_sha256: "1".repeat(64),
      args_count: 1,
      args_sha256: "2".repeat(64),
      expected_exit_code: 0,
      timeout_ms: 1000,
      shell: false,
      network: false
    },
    execution_attempt_result: {
      exit_code: 0,
      signal: null,
      timed_out: false,
      ok: true,
      stdout: "SHOULD_NOT_LEAK_TASK290_STDOUT",
      stderr: "SHOULD_NOT_LEAK_TASK290_STDERR",
      duration_ms: 12
    },
    execution_attempt_result_path: resultPath,
    execution_attempt_result_artifact: {
      kind: "unattended_real_host_execution_attempt_result",
      path: resultPath,
      sha256: resultArtifact.sha256,
      size_bytes: resultArtifact.size_bytes
    },
    execution_attempt_result_artifact_current: true,
    executor_invoked: true,
    execution_attempted: true,
    execution_attempt_succeeded: true,
    execution_attempt_exit_code: 0,
    real_pi_runtime_probe_id: durable.real_pi_runtime_probe_id,
    session_id: durable.session_id,
    transport_recovery_id: durable.transport_recovery_id,
    transport_lease_id: durable.transport_lease_id,
    transport_heartbeat_id: durable.transport_heartbeat_id,
    execution_id: durable.execution_id,
    terminal_review_id: durable.terminal_review_id,
    transport_contract_id: durable.transport_contract_id,
    automatic_orchestration_id: durable.automatic_orchestration_id,
    transport_continuity_id: durable.transport_continuity_id,
    agent_run_id: durable.agent_run_id,
    service_route: durable.service_route,
    service_transport_primitive: "node_http_agent_run_log_session_route",
    client_transport_primitive: "pi_fetch_get_text",
    operator_approved: false,
    handoff_can_execute: false,
    unattended_execution_authorized: false,
    unattended_real_host_execution_completed: false,
    operator_confirmation_bypassed: false,
    durable_transport_provided: false,
    live_transport_open: false,
    indefinite_stream_open: false,
    long_lived_websocket_provided: false,
    long_lived_sse_provided: false,
    pi_direct_write_allowed: false,
    direct_trusted_state_mutation: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    ...overrides
  };
  const persisted = writeJson(join(projectRoot, path), review);
  return {
    review,
    attemptReviewId,
    attemptId,
    path,
    sha256: persisted.sha256,
    absolutePath: join(projectRoot, path)
  };
}

function writeCompletionPrerequisiteFixture(id, reviewFixture, overrides = {}) {
  const path = prerequisitePath(id);
  const body = {
    schema_version: "comath.pi_codex_unattended_real_host_completion_certification_prerequisite.v1",
    completion_certification_prerequisite_id: id,
    project_id: projectId,
    actor:
      "goal3-task290 prerequisite token=plain-token proof_success completion certificate available terminal unattended completion certified",
    created_at: "2026-06-09T00:00:00.000Z",
    completion_certification_prerequisite_status: "blocked_terminal_unattended_completion_certification_required",
    terminal_goal_state: "blocked_with_replayable_certificate",
    completion_certification_prerequisite_path: path,
    requested_completion_mode: "production_unattended_real_host_completion",
    blocker_reasons: [
      "terminal_unattended_completion_evidence_missing",
      "terminal_unattended_completion_certificate_missing"
    ],
    completion_certificate_available: false,
    attempt_review_id: reviewFixture.attemptReviewId,
    attempt_review_status: "blocked_terminal_unattended_completion_review_required",
    attempt_review_path: reviewFixture.path,
    attempt_review_artifact: {
      kind: "unattended_real_host_execution_attempt_review",
      path: reviewFixture.path,
      sha256: reviewFixture.sha256,
      size_bytes: Buffer.byteLength(readFileSync(reviewFixture.absolutePath, "utf8"), "utf8")
    },
    attempt_review_current: true,
    attempt_id: reviewFixture.attemptId,
    attempt_status: "unattended_real_host_execution_attempt_recorded",
    attempt_path: reviewFixture.review.attempt_path,
    attempt_artifact: reviewFixture.review.attempt_artifact,
    attempt_current: true,
    readiness_id: reviewFixture.review.readiness_id,
    readiness_status: reviewFixture.review.readiness_status,
    readiness_path: reviewFixture.review.readiness_path,
    readiness_artifact: reviewFixture.review.readiness_artifact,
    readiness_current: true,
    handoff_review_id: reviewFixture.review.handoff_review_id,
    handoff_review_path: reviewFixture.review.handoff_review_path,
    handoff_review_artifact: reviewFixture.review.handoff_review_artifact,
    handoff_review_current: true,
    operator_approval_id: reviewFixture.review.operator_approval_id,
    operator_approval_path: reviewFixture.review.operator_approval_path,
    operator_approval_artifact: reviewFixture.review.operator_approval_artifact,
    operator_approval_artifact_current: true,
    unattended_executor_contract_id: reviewFixture.review.unattended_executor_contract_id,
    unattended_executor_contract_path: reviewFixture.review.unattended_executor_contract_path,
    unattended_executor_contract_artifact: reviewFixture.review.unattended_executor_contract_artifact,
    unattended_executor_contract_current: true,
    durable_transport_contract_id: reviewFixture.review.durable_transport_contract_id,
    durable_transport_contract_path: reviewFixture.review.durable_transport_contract_path,
    durable_transport_contract_artifact: reviewFixture.review.durable_transport_contract_artifact,
    durable_transport_contract_current: true,
    service_owned_checkpoint_chain_reviewed: true,
    service_owned_attempt_review_completed: true,
    terminal_unattended_completion_certified: false,
    service_owned_unattended_executor_configured: true,
    service_owned_durable_transport_prerequisite_configured: true,
    execution_attempt_manifest_persisted: true,
    execution_attempted: true,
    execution_attempt_succeeded: true,
    execution_attempt_exit_code: 0,
    real_pi_runtime_probe_id: reviewFixture.review.real_pi_runtime_probe_id,
    session_id: reviewFixture.review.session_id,
    transport_recovery_id: reviewFixture.review.transport_recovery_id,
    transport_lease_id: reviewFixture.review.transport_lease_id,
    transport_heartbeat_id: reviewFixture.review.transport_heartbeat_id,
    execution_id: reviewFixture.review.execution_id,
    terminal_review_id: reviewFixture.review.terminal_review_id,
    transport_contract_id: reviewFixture.review.transport_contract_id,
    automatic_orchestration_id: reviewFixture.review.automatic_orchestration_id,
    transport_continuity_id: reviewFixture.review.transport_continuity_id,
    agent_run_id: reviewFixture.review.agent_run_id,
    service_route: reviewFixture.review.service_route,
    service_transport_primitive: "node_http_agent_run_log_session_route",
    client_transport_primitive: "pi_fetch_get_text",
    operator_approved: false,
    handoff_can_execute: false,
    unattended_execution_authorized: false,
    unattended_real_host_execution_completed: false,
    operator_confirmation_bypassed: false,
    durable_transport_provided: false,
    live_transport_open: false,
    indefinite_stream_open: false,
    long_lived_websocket_provided: false,
    long_lived_sse_provided: false,
    pi_direct_write_allowed: false,
    direct_trusted_state_mutation: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    ...overrides
  };
  const persisted = writeJson(join(projectRoot, path), body);
  return {
    id,
    path,
    sha256: persisted.sha256,
    size_bytes: persisted.size_bytes,
    absolutePath: join(projectRoot, path),
    body
  };
}

function designInput(prerequisite, overrides = {}) {
  const suffix = prerequisite.id.replace(/^LIFE-COMPLETION-CERTIFICATION-PREREQ-/u, "");
  return {
    project_id: projectId,
    actor:
      "goal3-task290 design token=plain-token proof_success completion certificate available terminal unattended completion certified",
    terminal_completion_certificate_design_id: `LIFE-TERMINAL-COMPLETION-CERT-DESIGN-${suffix}`,
    completion_certification_prerequisite_id: prerequisite.id,
    completion_certification_prerequisite_path: prerequisite.path,
    completion_certification_prerequisite_sha256: prerequisite.sha256,
    ...overrides
  };
}

function certificateInput(design, overrides = {}) {
  const suffix = design.terminal_completion_certificate_design_id.replace(
    /^LIFE-TERMINAL-COMPLETION-CERT-DESIGN-/u,
    ""
  );
  return {
    project_id: projectId,
    actor:
      "goal3-task290 certificate token=plain-token proof_success clean_replay_passed GA certified SHOULD_NOT_LEAK_TASK290_STDOUT",
    terminal_completion_certificate_id: `LIFE-TERMINAL-COMPLETION-CERT-${suffix}`,
    terminal_completion_certificate_design_id: design.terminal_completion_certificate_design_id,
    terminal_completion_certificate_design_path: design.terminal_completion_certificate_design_path,
    terminal_completion_certificate_design_sha256: design.terminal_completion_certificate_design_artifact.sha256,
    ...overrides
  };
}

async function createTerminalCertificateChain(suffix) {
  const durableChain = await createDurableTransportChain(suffix);
  const review = writeAttemptReviewFixture(suffix, durableChain);
  const prerequisite = writeCompletionPrerequisiteFixture(`LIFE-COMPLETION-CERTIFICATION-PREREQ-${suffix}`, review);
  const design = recordPiCodexLifecycleUnattendedRealHostTerminalCompletionCertificateDesign(
    projectRoot,
    designInput(prerequisite)
  );
  const certificate = recordPiCodexLifecycleUnattendedRealHostTerminalCompletionCertificate(
    projectRoot,
    certificateInput(design)
  );
  return { durableChain, review, prerequisite, design, certificate };
}

function closureReviewInput(suffix, certificate, overrides = {}) {
  return {
    project_id: projectId,
    actor: `goal3-task290 closure review ${suffix} token=plain-token proof_success clean_replay_passed GA certified`,
    transport_closure_review_id: `LIFE-TRANSPORT-CLOSURE-REVIEW-${suffix}`,
    terminal_completion_certificate_id: certificate.terminal_completion_certificate_id,
    terminal_completion_certificate_path: certificate.terminal_completion_certificate_path,
    terminal_completion_certificate_sha256: certificate.terminal_completion_certificate_artifact.sha256,
    requested_transport_closure_mode: "maintained_operator_service_transport_closure_review",
    ...overrides
  };
}

process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS = JSON.stringify([process.execPath]);

try {
  assert.equal(
    typeof comath.recordPiCodexLifecycleOperatorServiceTransportClosureReview,
    "function",
    "Task290 must export a service-owned operator/service transport closure review gate"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("pi_codex_operator_service_transport_closure_review_gate"),
    true,
    "Task290 capability ledger must advertise the service-owned operator/service transport closure review gate"
  );

  const terminal = await createTerminalCertificateChain("0290");
  const closureReview = comath.recordPiCodexLifecycleOperatorServiceTransportClosureReview(
    projectRoot,
    closureReviewInput("0290", terminal.certificate)
  );

  assert.equal(closureReview.schema_version, "comath.pi_codex_operator_service_transport_closure_review.v1");
  assert.equal(closureReview.transport_closure_review_status, "maintained_operator_service_transport_closure_reviewed");
  assert.equal(closureReview.durable_transport_closure_status, "maintained_operator_service_transport_closure_reviewed");
  assert.equal(closureReview.terminal_completion_certificate_current, true);
  assert.equal(closureReview.durable_transport_contract_current, true);
  assert.equal(closureReview.transport_continuity_current, true);
  assert.equal(closureReview.transport_contract_current, true);
  assert.equal(closureReview.maintained_transport_primitive_bound, true);
  assert.equal(closureReview.completion_certificate_available, true);
  assert.equal(closureReview.terminal_unattended_completion_certified, true);
  assert.equal(closureReview.unattended_real_host_execution_completed, true);
  assert.equal(
    closureReview.terminal_completion_certificate_artifact.sha256,
    terminal.certificate.terminal_completion_certificate_artifact.sha256
  );
  assert.equal(
    closureReview.durable_transport_contract_artifact.sha256,
    terminal.durableChain.durableTransportContract.durable_transport_contract_artifact.sha256
  );
  assert.equal(
    closureReview.transport_continuity_artifact.sha256,
    terminal.durableChain.continuity.continuity_artifact.sha256
  );
  assert.equal(
    closureReview.transport_contract_artifact.sha256,
    terminal.durableChain.orchestration.transport_contract_artifact.sha256
  );
  assert.equal(closureReview.service_transport_primitive, "node_http_agent_run_log_session_route");
  assert.equal(closureReview.client_transport_primitive, "pi_fetch_get_text");
  assert.equal(closureReview.agent_run_id, terminal.durableChain.durableTransportContract.agent_run_id);
  assert.equal(closureReview.service_route, terminal.durableChain.durableTransportContract.service_route);
  assert.equal(closureReview.durable_transport_provided, false);
  assert.equal(closureReview.live_transport_open, false);
  assert.equal(closureReview.indefinite_stream_open, false);
  assert.equal(closureReview.long_lived_websocket_provided, false);
  assert.equal(closureReview.long_lived_sse_provided, false);
  assert.equal(closureReview.pi_direct_write_allowed, false);
  assert.equal(closureReview.direct_trusted_state_mutation, false);
  assert.equal(closureReview.proof_authority, "none");
  assert.equal(closureReview.can_promote_claim, false);
  assert.equal(closureReview.can_certify_ga, false);
  assert.equal(closureReview.ga_certification_gate_separate, true);
  assert.equal(JSON.stringify(closureReview).includes(projectRoot), false);
  assert.doesNotMatch(JSON.stringify(closureReview), secretTerms);
  assert.doesNotMatch(JSON.stringify(closureReview), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(closureReview), gaOverclaimTerms);
  assert.doesNotMatch(JSON.stringify(closureReview), transportOverclaimTerms);

  const persistedPath = join(projectRoot, closureReview.transport_closure_review_path);
  assert.equal(existsSync(persistedPath), true, "closure review must persist append-only evidence");
  const persisted = readJson(persistedPath);
  assert.equal(
    persisted.transport_closure_review_artifact,
    undefined,
    "persisted closure review must not self-hash recursively"
  );
  assert.equal(persisted.terminal_completion_certificate_current, true);
  assert.equal(persisted.durable_transport_contract_current, true);
  assert.equal(persisted.transport_continuity_current, true);
  assert.equal(persisted.transport_contract_current, true);
  assert.equal(persisted.durable_transport_provided, false);
  assert.equal(persisted.live_transport_open, false);
  assert.equal(persisted.proof_authority, "none");
  assert.equal(persisted.can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(persisted), secretTerms);
  assert.doesNotMatch(JSON.stringify(persisted), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(persisted), gaOverclaimTerms);
  assert.doesNotMatch(JSON.stringify(persisted), transportOverclaimTerms);

  assert.throws(
    () =>
      comath.recordPiCodexLifecycleOperatorServiceTransportClosureReview(
        projectRoot,
        closureReviewInput("0290", terminal.certificate)
      ),
    { code: "PI_CODEX_OPERATOR_SERVICE_TRANSPORT_CLOSURE_REVIEW_ALREADY_EXISTS" },
    "closure review records must be append-only by review id"
  );

  assert.throws(
    () =>
      comath.recordPiCodexLifecycleOperatorServiceTransportClosureReview(
        projectRoot,
        closureReviewInput("0290-ABSOLUTE-CERT", terminal.certificate, {
          terminal_completion_certificate_path: join(projectRoot, terminal.certificate.terminal_completion_certificate_path)
        })
      ),
    { code: "PI_CODEX_OPERATOR_SERVICE_TRANSPORT_CLOSURE_REVIEW_INVALID" },
    "closure review must reject non-canonical absolute terminal completion certificate paths"
  );

  assert.throws(
    () =>
      comath.recordPiCodexLifecycleOperatorServiceTransportClosureReview(
        projectRoot,
        closureReviewInput("0290-STALE-CERT", terminal.certificate, {
          terminal_completion_certificate_sha256: "0".repeat(64)
        })
      ),
    { code: "PI_CODEX_OPERATOR_SERVICE_TRANSPORT_CLOSURE_REVIEW_TERMINAL_COMPLETION_CERTIFICATE_STALE" },
    "closure review must reject stale terminal completion certificate hashes"
  );

  const tamperedDurable = await createTerminalCertificateChain("0290-DURABLE-TAMPER");
  const durablePath = join(
    projectRoot,
    tamperedDurable.durableChain.durableTransportContract.durable_transport_contract_path
  );
  const durableBody = readJson(durablePath);
  durableBody.live_transport_open = true;
  writeJson(durablePath, durableBody);
  assert.throws(
    () =>
      comath.recordPiCodexLifecycleOperatorServiceTransportClosureReview(
        projectRoot,
        closureReviewInput("0290-DURABLE-TAMPER", tamperedDurable.certificate)
      ),
    { code: "PI_CODEX_OPERATOR_SERVICE_TRANSPORT_CLOSURE_REVIEW_DURABLE_TRANSPORT_CONTRACT_STALE" },
    "closure review must reject durable transport contracts changed after terminal certificate"
  );

  const tamperedContinuity = await createTerminalCertificateChain("0290-CONTINUITY-TAMPER");
  const continuityPath = join(projectRoot, tamperedContinuity.durableChain.continuity.continuity_path);
  const continuityBody = readJson(continuityPath);
  continuityBody.live_transport_open = true;
  writeJson(continuityPath, continuityBody);
  assert.throws(
    () =>
      comath.recordPiCodexLifecycleOperatorServiceTransportClosureReview(
        projectRoot,
        closureReviewInput("0290-CONTINUITY-TAMPER", tamperedContinuity.certificate)
      ),
    { code: "PI_CODEX_OPERATOR_SERVICE_TRANSPORT_CLOSURE_REVIEW_TRANSPORT_CONTINUITY_STALE" },
    "closure review must reject continuity artifacts changed after durable transport contract"
  );

  const server = createComathServer();
  const routeTerminal = await createTerminalCertificateChain("0290-ROUTE");
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/pi-codex-lifecycle/operator-service-transport-closure-review",
    body: {
      project_root: projectRoot,
      ...closureReviewInput("0290-ROUTE", routeTerminal.certificate)
    }
  });
  assert.equal(routeResponse.status, 200, JSON.stringify(routeResponse.body));
  assert.equal(routeResponse.body.transport_closure_review.proof_authority, "none");
  assert.equal(routeResponse.body.transport_closure_review.completion_certificate_available, true);
  assert.equal(routeResponse.body.transport_closure_review.terminal_unattended_completion_certified, true);
  assert.equal(routeResponse.body.transport_closure_review.durable_transport_provided, false);
  assert.equal(routeResponse.body.transport_closure_review.live_transport_open, false);
  assert.equal(routeResponse.body.transport_closure_review.can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), secretTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), gaOverclaimTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), transportOverclaimTerms);

  const events = readAuditEvents(projectRoot);
  const event = events.find(
    (entry) =>
      entry.event_type === "release.pi_codex_operator_service_transport_closure_review_recorded" &&
      entry.payload.transport_closure_review_id === closureReview.transport_closure_review_id
  );
  assert.ok(event, "Task290 closure review must append an audit event");
  assert.equal(
    event.payload.terminal_completion_certificate_artifact_sha256,
    terminal.certificate.terminal_completion_certificate_artifact.sha256
  );
  assert.equal(
    event.payload.durable_transport_contract_artifact_sha256,
    terminal.durableChain.durableTransportContract.durable_transport_contract_artifact.sha256
  );
  assert.equal(event.payload.transport_continuity_artifact_sha256, terminal.durableChain.continuity.continuity_artifact.sha256);
  assert.equal(event.payload.transport_contract_artifact_sha256, terminal.durableChain.orchestration.transport_contract_artifact.sha256);
  assert.equal(event.payload.completion_certificate_available, true);
  assert.equal(event.payload.terminal_unattended_completion_certified, true);
  assert.equal(event.payload.unattended_real_host_execution_completed, true);
  assert.equal(event.payload.durable_transport_provided, false);
  assert.equal(event.payload.live_transport_open, false);
  assert.equal(event.payload.proof_authority, "none");
  assert.equal(event.payload.can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(events), secretTerms);
  assert.doesNotMatch(JSON.stringify(events), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(events), gaOverclaimTerms);
  assert.doesNotMatch(JSON.stringify(events), transportOverclaimTerms);
} finally {
  if (previousAllowedPrograms === undefined) {
    delete process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS;
  } else {
    process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS = previousAllowedPrograms;
  }
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task290 service-owned operator transport closure review tests passed.");
