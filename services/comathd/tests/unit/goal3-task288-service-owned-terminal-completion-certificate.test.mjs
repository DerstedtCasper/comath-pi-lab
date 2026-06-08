import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import * as comath from "../../dist/index.js";

const {
  createComathServer,
  getComathdStatus,
  readAuditEvents,
  recordPiCodexLifecycleUnattendedRealHostTerminalCompletionCertificate,
  recordPiCodexLifecycleUnattendedRealHostTerminalCompletionCertificateDesign
} = comath;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task288-terminal-completion-certificate-"));
const projectId = "PRJ-3288";
const secretTerms = /OPENAI_API_KEY|COMATH_CODEX_API_KEY|Authorization:\s*Bearer|token=|plain-token|sk-/i;
const proofAuthorityTerms =
  /clean_replay_passed|completed_formal_proof|formally_checked|proof_success|formal_replay_passed|lean_kernel_clean_replay|kernel_checked/i;
const gaOverclaimTerms = /GA certified|can_certify_ga\s*[:=]\s*(?:true|1)/i;
const executorLeakTerms =
  /execution_attempt_command|execution_attempt_result\b|SHOULD_NOT_LEAK_EXECUTOR_STDOUT|stdout|stderr/i;

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

function attemptReviewPath(id) {
  return `.comath/release/pi-codex-lifecycle/${id}/unattended-real-host-execution-attempt-review.json`;
}

function prerequisitePath(id) {
  return `.comath/release/pi-codex-lifecycle/${id}/unattended-real-host-completion-certification-prerequisite.json`;
}

function writeAttemptReviewFixture(suffix, overrides = {}) {
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
    stdout: "SHOULD_NOT_LEAK_EXECUTOR_STDOUT",
    stderr: "SHOULD_NOT_LEAK_EXECUTOR_STDERR"
  });
  const review = {
    schema_version: "comath.pi_codex_unattended_real_host_execution_attempt_review.v1",
    attempt_review_id: attemptReviewId,
    project_id: projectId,
    actor: `goal3-task288-review-${suffix} token=plain-token proof_success terminal unattended completion certified`,
    created_at: "2026-06-08T00:00:00.000Z",
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
    handoff_review_id: `LIFE-HANDOFF-REVIEW-${suffix}`,
    handoff_review_path: `.comath/release/pi-codex-lifecycle/LIFE-HANDOFF-REVIEW-${suffix}/unattended-real-host-handoff-review.json`,
    handoff_review_artifact: {
      kind: "unattended_real_host_handoff_review",
      path: `.comath/release/pi-codex-lifecycle/LIFE-HANDOFF-REVIEW-${suffix}/unattended-real-host-handoff-review.json`,
      sha256: "c".repeat(64),
      size_bytes: 1400
    },
    handoff_review_current: true,
    operator_approval_id: `LIFE-OPERATOR-APPROVAL-${suffix}`,
    operator_approval_path: `.comath/release/pi-codex-lifecycle/LIFE-OPERATOR-APPROVAL-${suffix}/unattended-real-host-operator-approval.json`,
    operator_approval_artifact: {
      kind: "unattended_real_host_operator_approval",
      path: `.comath/release/pi-codex-lifecycle/LIFE-OPERATOR-APPROVAL-${suffix}/unattended-real-host-operator-approval.json`,
      sha256: "d".repeat(64),
      size_bytes: 1500
    },
    operator_approval_artifact_current: true,
    unattended_executor_contract_id: `LIFE-UNATTENDED-EXECUTOR-CONTRACT-${suffix}`,
    unattended_executor_contract_path: `.comath/release/pi-codex-lifecycle/LIFE-UNATTENDED-EXECUTOR-CONTRACT-${suffix}/unattended-real-host-executor-contract.json`,
    unattended_executor_contract_artifact: {
      kind: "unattended_real_host_executor_contract",
      path: `.comath/release/pi-codex-lifecycle/LIFE-UNATTENDED-EXECUTOR-CONTRACT-${suffix}/unattended-real-host-executor-contract.json`,
      sha256: "e".repeat(64),
      size_bytes: 1600
    },
    unattended_executor_contract_current: true,
    durable_transport_contract_id: `LIFE-DURABLE-TRANSPORT-CONTRACT-${suffix}`,
    durable_transport_contract_path: `.comath/release/pi-codex-lifecycle/LIFE-DURABLE-TRANSPORT-CONTRACT-${suffix}/unattended-real-host-durable-transport-contract.json`,
    durable_transport_contract_artifact: {
      kind: "unattended_real_host_durable_transport_contract",
      path: `.comath/release/pi-codex-lifecycle/LIFE-DURABLE-TRANSPORT-CONTRACT-${suffix}/unattended-real-host-durable-transport-contract.json`,
      sha256: "f".repeat(64),
      size_bytes: 1700
    },
    durable_transport_contract_current: true,
    service_owned_checkpoint_chain_reviewed: true,
    service_owned_attempt_review_completed: true,
    terminal_unattended_completion_certified: false,
    service_owned_unattended_executor_configured: true,
    service_owned_durable_transport_prerequisite_configured: true,
    execution_attempt_manifest_persisted: true,
    execution_attempt_command: {
      program_label: "goal3-task288-fixture",
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
      stdout: "SHOULD_NOT_LEAK_EXECUTOR_STDOUT",
      stderr: "SHOULD_NOT_LEAK_EXECUTOR_STDERR",
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
    real_pi_runtime_probe_id: `LIFE-PI-RUNTIME-${suffix}`,
    session_id: `LIFE-SESSION-${suffix}`,
    transport_recovery_id: `LIFE-TRANSPORT-RECOVERY-${suffix}`,
    transport_lease_id: `LIFE-TRANSPORT-LEASE-${suffix}`,
    transport_heartbeat_id: `LIFE-TRANSPORT-HEARTBEAT-${suffix}`,
    execution_id: `LIFE-GUIDED-EXECUTION-${suffix}`,
    terminal_review_id: `LIFE-TERMINAL-REVIEW-${suffix}`,
    transport_contract_id: `LIFE-TRANSPORT-CONTRACT-${suffix}`,
    automatic_orchestration_id: `LIFE-AUTOMATIC-ORCHESTRATION-${suffix}`,
    transport_continuity_id: `LIFE-TRANSPORT-CONTINUITY-${suffix}`,
    agent_run_id: `LIFE-AGENT-RUN-${suffix}`,
    service_route: `/agent/run/LIFE-AGENT-RUN-${suffix}/log-session`,
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
      "goal3-task288 prerequisite token=plain-token proof_success completion certificate available terminal unattended completion certified",
    created_at: "2026-06-08T00:00:00.000Z",
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
  return {
    project_id: projectId,
    actor:
      "goal3-task288 design token=plain-token proof_success completion certificate available terminal unattended completion certified",
    terminal_completion_certificate_design_id: `LIFE-TERMINAL-COMPLETION-CERT-DESIGN-${prerequisite.id.split("-").at(-1)}`,
    completion_certification_prerequisite_id: prerequisite.id,
    completion_certification_prerequisite_path: prerequisite.path,
    completion_certification_prerequisite_sha256: prerequisite.sha256,
    ...overrides
  };
}

function certificateInput(design, overrides = {}) {
  return {
    project_id: projectId,
    actor:
      "goal3-task288 certificate token=plain-token proof_success clean_replay_passed GA certified SHOULD_NOT_LEAK_EXECUTOR_STDOUT",
    terminal_completion_certificate_id: `LIFE-TERMINAL-COMPLETION-CERT-${design.terminal_completion_certificate_design_id.split("-").at(-1)}`,
    terminal_completion_certificate_design_id: design.terminal_completion_certificate_design_id,
    terminal_completion_certificate_design_path: design.terminal_completion_certificate_design_path,
    terminal_completion_certificate_design_sha256: design.terminal_completion_certificate_design_artifact.sha256,
    ...overrides
  };
}

try {
  assert.equal(
    typeof recordPiCodexLifecycleUnattendedRealHostTerminalCompletionCertificate,
    "function",
    "Task288 must export a service-owned terminal completion certificate evidence gate"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("pi_codex_unattended_real_host_terminal_completion_certificate_gate"),
    true,
    "Task288 capability ledger must advertise the terminal completion certificate evidence gate"
  );

  const review = writeAttemptReviewFixture("0288");
  const prerequisite = writeCompletionPrerequisiteFixture("LIFE-COMPLETION-CERTIFICATION-PREREQ-0288", review);
  const design = recordPiCodexLifecycleUnattendedRealHostTerminalCompletionCertificateDesign(
    projectRoot,
    designInput(prerequisite)
  );
  const certificate = recordPiCodexLifecycleUnattendedRealHostTerminalCompletionCertificate(
    projectRoot,
    certificateInput(design)
  );

  assert.equal(
    certificate.schema_version,
    "comath.pi_codex_unattended_real_host_terminal_completion_certificate.v1"
  );
  assert.equal(certificate.terminal_completion_certificate_status, "terminal_unattended_completion_certified");
  assert.equal(certificate.terminal_goal_state, "terminal_unattended_completion_certified");
  assert.equal(certificate.completion_certificate_available, true);
  assert.equal(certificate.terminal_unattended_completion_certified, true);
  assert.equal(certificate.unattended_real_host_execution_completed, true);
  assert.equal(certificate.terminal_completion_certificate_design_id, design.terminal_completion_certificate_design_id);
  assert.equal(certificate.terminal_completion_certificate_design_artifact.sha256, design.terminal_completion_certificate_design_artifact.sha256);
  assert.equal(certificate.terminal_completion_certificate_design_current, true);
  assert.equal(certificate.completion_certification_prerequisite_artifact.sha256, prerequisite.sha256);
  assert.equal(certificate.completion_certification_prerequisite_current, true);
  assert.equal(certificate.attempt_review_artifact.sha256, review.sha256);
  assert.equal(certificate.attempt_review_current, true);
  assert.equal(certificate.attempt_result_evidence_artifact.sha256, review.review.execution_attempt_result_artifact.sha256);
  assert.equal(certificate.attempt_result_evidence_current, true);
  assert.deepEqual(certificate.terminal_certificate_evidence_checked, [
    "service_owned_terminal_completion_certificate_artifact",
    "current_task253_completion_certification_prerequisite",
    "operator_verified_terminal_attempt_result_chain",
    "durable_transport_and_execution_evidence_current",
    "public_executor_output_redacted",
    "ga_certification_gate_still_separate"
  ]);
  assert.equal(certificate.proof_authority, "none");
  assert.equal(certificate.can_promote_claim, false);
  assert.equal(certificate.can_certify_ga, false);
  assert.equal(certificate.ga_certification_gate_separate, true);
  assert.equal(JSON.stringify(certificate).includes(projectRoot), false, "certificate result must not echo host paths");
  assert.doesNotMatch(JSON.stringify(certificate), secretTerms);
  assert.doesNotMatch(JSON.stringify(certificate), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(certificate), gaOverclaimTerms);
  assert.doesNotMatch(JSON.stringify(certificate), executorLeakTerms);

  const persistedPath = join(projectRoot, certificate.terminal_completion_certificate_path);
  assert.equal(existsSync(persistedPath), true, "terminal completion certificate must persist append-only evidence");
  const persisted = readJson(persistedPath);
  assert.equal(
    persisted.terminal_completion_certificate_artifact,
    undefined,
    "persisted terminal completion certificate must not self-hash recursively"
  );
  assert.equal(persisted.completion_certificate_available, true);
  assert.equal(persisted.terminal_unattended_completion_certified, true);
  assert.equal(persisted.proof_authority, "none");
  assert.equal(persisted.can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(persisted), secretTerms);
  assert.doesNotMatch(JSON.stringify(persisted), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(persisted), gaOverclaimTerms);
  assert.doesNotMatch(JSON.stringify(persisted), executorLeakTerms);

  assert.throws(
    () =>
      recordPiCodexLifecycleUnattendedRealHostTerminalCompletionCertificate(
        projectRoot,
        certificateInput(design)
      ),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_TERMINAL_COMPLETION_CERTIFICATE_ALREADY_EXISTS" },
    "terminal completion certificate records must be append-only by certificate id"
  );

  assert.throws(
    () =>
      recordPiCodexLifecycleUnattendedRealHostTerminalCompletionCertificate(
        projectRoot,
        certificateInput(design, {
          terminal_completion_certificate_id: "LIFE-TERMINAL-COMPLETION-CERT-STALE-DESIGN",
          terminal_completion_certificate_design_sha256: "0".repeat(64)
        })
      ),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_TERMINAL_COMPLETION_CERTIFICATE_DESIGN_STALE" },
    "terminal completion certificate must reject stale design hashes"
  );

  assert.throws(
    () =>
      recordPiCodexLifecycleUnattendedRealHostTerminalCompletionCertificate(
        projectRoot,
        certificateInput(design, {
          terminal_completion_certificate_id: "LIFE-TERMINAL-COMPLETION-CERT-NONCANONICAL",
          terminal_completion_certificate_design_path:
            ".comath/release/pi-codex-lifecycle/noncanonical/terminal-completion-certificate-design.json"
        })
      ),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_TERMINAL_COMPLETION_CERTIFICATE_DESIGN_INVALID" },
    "terminal completion certificate must reject non-canonical design paths"
  );

  const tamperedReview = writeAttemptReviewFixture("0288-TAMPERED");
  const tamperedPrerequisite = writeCompletionPrerequisiteFixture(
    "LIFE-COMPLETION-CERTIFICATION-PREREQ-0288-TAMPERED",
    tamperedReview
  );
  const tamperedDesign = recordPiCodexLifecycleUnattendedRealHostTerminalCompletionCertificateDesign(
    projectRoot,
    designInput(tamperedPrerequisite, {
      terminal_completion_certificate_design_id: "LIFE-TERMINAL-COMPLETION-CERT-DESIGN-TAMPERED"
    })
  );
  const tamperedReviewBody = readJson(tamperedReview.absolutePath);
  tamperedReviewBody.execution_attempt_result_artifact_current = false;
  const tamperedPersisted = writeJson(tamperedReview.absolutePath, tamperedReviewBody);
  const tamperedPrerequisiteBody = readJson(tamperedPrerequisite.absolutePath);
  tamperedPrerequisiteBody.attempt_review_artifact.sha256 = tamperedPersisted.sha256;
  const tamperedPrerequisitePersisted = writeJson(tamperedPrerequisite.absolutePath, tamperedPrerequisiteBody);
  const tamperedDesignBody = readJson(join(projectRoot, tamperedDesign.terminal_completion_certificate_design_path));
  tamperedDesignBody.attempt_review_artifact.sha256 = tamperedPersisted.sha256;
  tamperedDesignBody.completion_certification_prerequisite_artifact.sha256 = tamperedPrerequisitePersisted.sha256;
  tamperedDesignBody.terminal_completion_certificate_design_artifact = undefined;
  const tamperedDesignPersisted = writeJson(
    join(projectRoot, tamperedDesign.terminal_completion_certificate_design_path),
    Object.fromEntries(Object.entries(tamperedDesignBody).filter(([, value]) => value !== undefined))
  );
  assert.throws(
    () =>
      recordPiCodexLifecycleUnattendedRealHostTerminalCompletionCertificate(
        projectRoot,
        certificateInput(tamperedDesign, {
          terminal_completion_certificate_id: "LIFE-TERMINAL-COMPLETION-CERT-TAMPERED",
          terminal_completion_certificate_design_sha256: tamperedDesignPersisted.sha256
        })
      ),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_TERMINAL_COMPLETION_CERTIFICATE_ATTEMPT_REVIEW_INVALID" },
    "terminal completion certificate must reject current-hash attempt reviews that drop result-artifact currency"
  );

  const staleResultReview = writeAttemptReviewFixture("0288-STALE-RESULT");
  const staleResultPrerequisite = writeCompletionPrerequisiteFixture(
    "LIFE-COMPLETION-CERTIFICATION-PREREQ-0288-STALE-RESULT",
    staleResultReview
  );
  const staleResultDesign = recordPiCodexLifecycleUnattendedRealHostTerminalCompletionCertificateDesign(
    projectRoot,
    designInput(staleResultPrerequisite, {
      terminal_completion_certificate_design_id: "LIFE-TERMINAL-COMPLETION-CERT-DESIGN-STALE-RESULT"
    })
  );
  writeJson(join(projectRoot, staleResultReview.review.execution_attempt_result_path), {
    schema_version: "comath.pi_codex_unattended_real_host_execution_attempt_result.v1",
    attempt_id: staleResultReview.attemptId,
    ok: true,
    exit_code: 0,
    stdout: "tampered stdout must not be trusted",
    stderr: "tampered stderr must not be trusted"
  });
  assert.throws(
    () =>
      recordPiCodexLifecycleUnattendedRealHostTerminalCompletionCertificate(
        projectRoot,
        certificateInput(staleResultDesign, {
          terminal_completion_certificate_id: "LIFE-TERMINAL-COMPLETION-CERT-STALE-RESULT"
        })
      ),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_TERMINAL_COMPLETION_CERTIFICATE_ATTEMPT_REVIEW_INVALID" },
    "terminal completion certificate must reject stale attempt-result artifact bytes"
  );

  const server = createComathServer();
  const routeReview = writeAttemptReviewFixture("0288-ROUTE");
  const routePrerequisite = writeCompletionPrerequisiteFixture(
    "LIFE-COMPLETION-CERTIFICATION-PREREQ-0288-ROUTE",
    routeReview
  );
  const routeDesign = recordPiCodexLifecycleUnattendedRealHostTerminalCompletionCertificateDesign(
    projectRoot,
    designInput(routePrerequisite, {
      terminal_completion_certificate_design_id: "LIFE-TERMINAL-COMPLETION-CERT-DESIGN-ROUTE"
    })
  );
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/pi-codex-lifecycle/unattended-real-host-terminal-completion-certificate",
    body: {
      project_root: projectRoot,
      ...certificateInput(routeDesign, {
        terminal_completion_certificate_id: "LIFE-TERMINAL-COMPLETION-CERT-ROUTE",
        actor:
          "goal3-task288-route token=plain-token proof_success clean_replay_passed GA certified SHOULD_NOT_LEAK_EXECUTOR_STDOUT"
      })
    }
  });
  assert.equal(routeResponse.status, 200, JSON.stringify(routeResponse.body));
  assert.equal(routeResponse.body.terminal_completion_certificate.proof_authority, "none");
  assert.equal(routeResponse.body.terminal_completion_certificate.completion_certificate_available, true);
  assert.equal(routeResponse.body.terminal_completion_certificate.terminal_unattended_completion_certified, true);
  assert.equal(routeResponse.body.terminal_completion_certificate.can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), secretTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), gaOverclaimTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), executorLeakTerms);

  const events = readAuditEvents(projectRoot);
  const event = events.find(
    (entry) =>
      entry.event_type === "release.pi_codex_unattended_real_host_terminal_completion_certificate_recorded" &&
      entry.payload.terminal_completion_certificate_id === certificate.terminal_completion_certificate_id
  );
  assert.ok(event, "Task288 terminal completion certificate must append an audit event");
  assert.equal(event.payload.terminal_completion_certificate_design_id, design.terminal_completion_certificate_design_id);
  assert.equal(event.payload.terminal_completion_certificate_design_artifact_sha256, design.terminal_completion_certificate_design_artifact.sha256);
  assert.equal(event.payload.completion_certificate_available, true);
  assert.equal(event.payload.terminal_unattended_completion_certified, true);
  assert.equal(event.payload.unattended_real_host_execution_completed, true);
  assert.equal(event.payload.proof_authority, "none");
  assert.equal(event.payload.can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(events), secretTerms);
  assert.doesNotMatch(JSON.stringify(events), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(events), gaOverclaimTerms);
  assert.doesNotMatch(JSON.stringify(events), executorLeakTerms);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task288 service-owned terminal completion certificate tests passed.");
