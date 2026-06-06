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
  recordPiCodexLifecycleUnattendedRealHostOperatorApproval,
  reviewPiCodexLifecycleUnattendedRealHostHandoff,
  spawnWorkstream
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task243-operator-approval-"));
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
  const dir = join(projectRoot, ".tmp", "task243-fixtures");
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
  const dir = join(projectRoot, ".tmp", "task243-fixtures");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "operator-approval-agent-run-adapter.mjs");
  writeFileSync(
    path,
    [
      "process.stdout.write('task243 stdout before operator approval contract\\n');",
      "process.stderr.write('task243 stderr before operator approval contract\\n');",
      "process.stdout.write('# Agent Report\\n\\n## Input Context\\nTask243 operator approval fixture.\\n\\n## Claims Proposed\\nproof_authority: none\\n\\n## Evidence Produced\\nRuntime logs only.\\n\\n## Graph Patch\\nNo trusted mutation.\\n\\n## Blockers\\nNo unattended execution and no durable transport.\\n');",
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
    goal: `Task243 service-owned operator approval fixture ${suffix}.`,
    created_by: "goal3-task243"
  });
  const agentRun = await executeProfileAgentRun(projectRoot, {
    project_id: projectId,
    campaign_id: `CAM-${campaignDigits}`,
    workstream_id: workstream.workstream_id,
    profile_id: "reviewer",
    program: process.execPath,
    adapter_args: [writeAgentRunAdapterFixture()],
    goal: `Run Task243 operator approval fixture ${suffix}.`,
    context_path: `.comath/workstreams/${workstream.workstream_id}/spec.yaml`,
    actor: `goal3-task243-agent-run-${suffix}`
  });
  return { agentRun, route: `/agent/run/${agentRun.run.id}/log-session` };
}

function orchestrationInput(ids, route, runtimeFixture) {
  return {
    project_id: projectId,
    orchestration_id: ids.orchestrationId,
    actor: `goal3-task243-orchestrator ${projectRoot}\\secret.txt Authorization: Bearer plain-token proof_success durable transport provided long-lived websocket`,
    runtime_probe: {
      probe_id: ids.probeId,
      pi_host_label: `pi-host-task243-${ids.suffix}`,
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
        summary: "automatic checkpoint chain ready for bounded operator approval prerequisite",
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
      reconnect_reason: "automatic real-Pi lifecycle checkpoint recovery before operator approval"
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
      open_reason: "bounded lease before operator approval"
    },
    transport_heartbeat: {
      transport_heartbeat_id: ids.heartbeatId,
      requested_cursor: { operator_event_cursor: "event:9", stdout_cursor: "stdout:0", stderr_cursor: "stderr:0" },
      client_epoch: 9,
      last_seen_event_id: "evt-9",
      heartbeat_reason: "bounded heartbeat before operator approval"
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

function publicAlias(id, filename) {
  return `service-owned-pi-lifecycle/${id}/${filename}`;
}

function preparedReviewInput(ids, orchestration, continuity, overrides = {}) {
  return {
    project_id: projectId,
    handoff_review_id: ids.handoffReviewId,
    actor: `goal3-task243-review ${projectRoot}\\secret.txt Authorization: Bearer plain-token proof_success durable transport provided long-lived websocket handoff can execute`,
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
    actor: `goal3-task243-approval ${projectRoot}\\secret.txt Authorization: Bearer plain-token proof_success durable transport provided live transport open operator approval recorded`,
    handoff_review_id: ids.handoffReviewId,
    handoff_review_path: handoffReview.handoff_review_path,
    handoff_review_sha256: handoffReview.handoff_review_artifact.sha256,
    operator_approval_mode: "manual_operator_approval",
    approval_note: "Operator has reviewed the prepared checkpoint chain, but execution remains blocked until executor and durable transport prerequisites exist.",
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
    actor: `goal3-task243-readiness ${projectRoot}\\secret.txt Authorization: Bearer plain-token proof_success durable transport provided live transport open operator approval recorded`,
    handoff_review_id: ids.handoffReviewId,
    handoff_review_path: handoffReview.handoff_review_path,
    handoff_review_sha256: handoffReview.handoff_review_artifact.sha256,
    requested_execution_mode: "production_unattended_real_host",
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

const init = initProject({ name: "Goal3 Task243 Unattended Operator Approval", root_path: projectRoot });
const projectId = init.project.project_id;

try {
  process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS = JSON.stringify([process.execPath]);
  assert.equal(
    typeof recordPiCodexLifecycleUnattendedRealHostOperatorApproval,
    "function",
    "Task243 must export a service-owned unattended real-host operator approval contract"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("pi_codex_unattended_real_host_operator_approval_contract"),
    true,
    "Task243 capability ledger must advertise bounded operator approval artifacts"
  );

  const runtimeFixture = writeRuntimeProbeFixture();
  const { route } = await createServiceOwnedAgentRunRoute("0243");
  const ids = {
    suffix: "0243",
    orchestrationId: "LIFE-AUTOMATIC-REAL-PI-0243",
    probeId: "LIFE-PI-RUNTIME-0243",
    sessionId: "LIFE-OP-SESSION-0243",
    recoveryId: "LIFE-TRANSPORT-0243",
    leaseId: "LIFE-TRANSPORT-LEASE-0243",
    heartbeatId: "LIFE-TRANSPORT-HEARTBEAT-0243",
    executionId: "LIFE-GUIDED-EXEC-0243",
    reviewId: "LIFE-TERMINAL-REVIEW-0243",
    contractId: "LIFE-TRANSPORT-CONTRACT-0243",
    continuityId: "LIFE-TRANSPORT-CONTINUITY-0243",
    handoffReviewId: "LIFE-HANDOFF-REVIEW-0243",
    approvalId: "LIFE-OPERATOR-APPROVAL-0243",
    readinessId: "LIFE-UNATTENDED-EXEC-READINESS-0243"
  };
  const orchestration = orchestratePiCodexLifecycleAutomaticRealPiExecution(
    projectRoot,
    orchestrationInput(ids, route, runtimeFixture)
  );
  const continuity = recordPiCodexLifecycleOperatorServiceTransportContinuity(projectRoot, {
    project_id: projectId,
    continuity_id: ids.continuityId,
    actor: "goal3-task243-continuity proof_success durable transport provided",
    transport_contract_id: ids.contractId,
    transport_contract_path: orchestration.transport_contract_path,
    transport_contract_sha256: orchestration.transport_contract_artifact.sha256,
    max_bytes: 2048,
    max_events: 2,
    retry_ms: 600,
    client_transport_primitive: "pi_fetch_get_text",
    service_transport_primitive: "node_http_agent_run_log_session_route"
  });
  const handoffReview = reviewPiCodexLifecycleUnattendedRealHostHandoff(
    projectRoot,
    preparedReviewInput(ids, orchestration, continuity)
  );

  const approval = recordPiCodexLifecycleUnattendedRealHostOperatorApproval(
    projectRoot,
    approvalInput(ids, handoffReview)
  );
  assert.equal(approval.schema_version, "comath.pi_codex_unattended_real_host_operator_approval.v1");
  assert.equal(approval.approval_status, "operator_approval_artifact_recorded");
  assert.equal(approval.operator_approval_mode, "manual_operator_approval");
  assert.equal(approval.operator_approval_artifact_current, true);
  assert.equal(approval.handoff_review_current, true);
  assert.equal(approval.service_owned_checkpoint_chain_reviewed, true);
  assert.equal(approval.approval_manifest_persisted, true);
  assert.equal(approval.project_id, projectId);
  assert.equal(approval.handoff_review_id, ids.handoffReviewId);
  assert.equal(approval.handoff_review_artifact.sha256, handoffReview.handoff_review_artifact.sha256);
  assert.equal(approval.operator_approved, false);
  assert.equal(approval.handoff_can_execute, false);
  assert.equal(approval.unattended_execution_authorized, false);
  assert.equal(approval.unattended_real_host_execution_completed, false);
  assert.equal(approval.operator_confirmation_bypassed, false);
  assert.equal(approval.durable_transport_provided, false);
  assert.equal(approval.live_transport_open, false);
  assert.equal(approval.proof_authority, "none");
  assert.equal(approval.can_promote_claim, false);
  assert.equal(approval.can_certify_ga, false);
  assert.equal(JSON.stringify(approval).includes(projectRoot), false, "approval result must not expose host paths");
  assert.doesNotMatch(JSON.stringify(approval), secretTerms);
  assert.doesNotMatch(JSON.stringify(approval), privilegedPublicTerms);
  assert.doesNotMatch(JSON.stringify(approval), transportOverclaimTerms);
  assert.doesNotMatch(JSON.stringify(approval), unattendedOverclaimTerms);

  const persistedApprovalPath = join(projectRoot, approval.approval_path);
  assert.equal(existsSync(persistedApprovalPath), true, "operator approval must persist append-only evidence");
  const persistedApproval = readJson(persistedApprovalPath);
  assert.equal(persistedApproval.operator_approval_artifact, undefined, "persisted approval must not self-hash recursively");
  assert.equal(persistedApproval.operator_approval_artifact_current, true);
  assert.equal(persistedApproval.proof_authority, "none");
  assert.equal(persistedApproval.can_certify_ga, false);

  assert.throws(
    () => recordPiCodexLifecycleUnattendedRealHostOperatorApproval(projectRoot, approvalInput(ids, handoffReview)),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_OPERATOR_APPROVAL_ALREADY_EXISTS" },
    "operator approval manifests must be append-only by approval id"
  );

  assert.throws(
    () =>
      recordPiCodexLifecycleUnattendedRealHostOperatorApproval(
        projectRoot,
        approvalInput(ids, handoffReview, {
          approval_id: "LIFE-OPERATOR-APPROVAL-0243-STALE",
          handoff_review_sha256: "a".repeat(64)
        })
      ),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_OPERATOR_APPROVAL_HANDOFF_REVIEW_STALE" },
    "operator approval must reject stale caller-supplied handoff review hashes"
  );

  const readinessWithoutApproval = recordPiCodexLifecycleUnattendedRealHostExecutionReadiness(
    projectRoot,
    readinessInput(ids, handoffReview, {
      readiness_id: "LIFE-UNATTENDED-EXEC-READINESS-0243-NO-APPROVAL"
    })
  );
  assert.deepEqual(readinessWithoutApproval.blocker_reasons, [
    "operator_approval_artifact_missing",
    "service_owned_unattended_executor_not_configured",
    "durable_transport_not_provided"
  ]);
  assert.equal(readinessWithoutApproval.operator_approval_artifact_current, false);

  const readiness = recordPiCodexLifecycleUnattendedRealHostExecutionReadiness(
    projectRoot,
    readinessInput(ids, handoffReview, {
      operator_approval_id: ids.approvalId,
      operator_approval_path: approval.approval_path,
      operator_approval_sha256: approval.operator_approval_artifact.sha256
    })
  );
  assert.equal(readiness.schema_version, "comath.pi_codex_unattended_real_host_execution_readiness.v1");
  assert.deepEqual(readiness.blocker_reasons, [
    "service_owned_unattended_executor_not_configured",
    "durable_transport_not_provided"
  ]);
  assert.equal(readiness.operator_approval_id, ids.approvalId);
  assert.equal(readiness.operator_approval_artifact.sha256, approval.operator_approval_artifact.sha256);
  assert.equal(readiness.operator_approval_artifact_current, true);
  assert.equal(readiness.operator_approved, false);
  assert.equal(readiness.handoff_can_execute, false);
  assert.equal(readiness.unattended_execution_authorized, false);
  assert.equal(readiness.unattended_real_host_execution_completed, false);
  assert.equal(readiness.durable_transport_provided, false);
  assert.equal(readiness.proof_authority, "none");
  assert.equal(readiness.can_certify_ga, false);

  const approvalPath = join(projectRoot, approval.approval_path);
  const approvalBeforePoison = readFileSync(approvalPath, "utf8");
  const poisonedApproval = readJson(approvalPath);
  poisonedApproval.handoff_can_execute = true;
  poisonedApproval.unattended_execution_authorized = true;
  poisonedApproval.proof_authority = "lean_kernel_clean_replay";
  writeJson(approvalPath, poisonedApproval);
  const poisonedApprovalSha256 = sha256Text(readFileSync(approvalPath, "utf8"));
  assert.throws(
    () =>
      recordPiCodexLifecycleUnattendedRealHostExecutionReadiness(
        projectRoot,
        readinessInput(ids, handoffReview, {
          readiness_id: "LIFE-UNATTENDED-EXEC-READINESS-0243-POISONED-APPROVAL",
          operator_approval_id: ids.approvalId,
          operator_approval_path: approval.approval_path,
          operator_approval_sha256: poisonedApprovalSha256
        })
      ),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_OPERATOR_APPROVAL_INVALID" },
    "readiness must reject promotional or execution-shaped approval artifacts even when the hash is current"
  );
  writeFileSync(approvalPath, approvalBeforePoison, "utf8");

  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/pi-codex-lifecycle/unattended-real-host-operator-approval",
    body: approvalInput(ids, handoffReview, {
      project_root: projectRoot,
      approval_id: "LIFE-OPERATOR-APPROVAL-0243-ROUTE",
      actor: "goal3-task243-route token=plain-token proof_success durable transport provided live transport open operator approval recorded"
    })
  });
  assert.equal(routeResponse.status, 200, JSON.stringify(routeResponse.body));
  assert.equal(routeResponse.body.approval.proof_authority, "none");
  assert.equal(routeResponse.body.approval.operator_approved, false);
  assert.equal(routeResponse.body.approval.handoff_can_execute, false);
  assert.equal(routeResponse.body.approval.can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), secretTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), privilegedPublicTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), transportOverclaimTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), unattendedOverclaimTerms);

  const events = readAuditEvents(projectRoot);
  const approvalAuditEvent = events.find(
    (event) =>
      event.event_type === "release.pi_codex_unattended_real_host_operator_approval_recorded" &&
      event.payload.approval_id === ids.approvalId
  );
  assert.ok(approvalAuditEvent, "operator approval audit event must be appended");
  assert.equal(approvalAuditEvent.payload.handoff_review_id, ids.handoffReviewId);
  assert.equal(approvalAuditEvent.payload.operator_approval_artifact_current, true);
  assert.equal(approvalAuditEvent.payload.handoff_can_execute, false);
  assert.equal(approvalAuditEvent.payload.unattended_execution_authorized, false);
  assert.equal(approvalAuditEvent.payload.proof_authority, "none");
  assert.equal(approvalAuditEvent.payload.can_certify_ga, false);

  const readinessAuditEvent = events.find(
    (event) =>
      event.event_type === "release.pi_codex_unattended_real_host_execution_readiness_blocked" &&
      event.payload.readiness_id === ids.readinessId
  );
  assert.ok(readinessAuditEvent, "readiness audit event must be appended");
  assert.deepEqual(readinessAuditEvent.payload.blocker_reasons, readiness.blocker_reasons);
  assert.equal(readinessAuditEvent.payload.operator_approval_id, ids.approvalId);
  assert.equal(readinessAuditEvent.payload.operator_approval_artifact_current, true);
  assert.equal(readinessAuditEvent.payload.operator_approved, false);
  assert.equal(readinessAuditEvent.payload.unattended_execution_authorized, false);
  assert.equal(readinessAuditEvent.payload.can_certify_ga, false);
} finally {
  if (previousAllowedPrograms === undefined) {
    delete process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS;
  } else {
    process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS = previousAllowedPrograms;
  }
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task243 unattended real-host operator approval contract tests passed.");
