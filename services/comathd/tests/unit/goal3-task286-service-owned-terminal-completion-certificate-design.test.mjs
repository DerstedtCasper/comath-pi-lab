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
  recordPiCodexLifecycleUnattendedRealHostTerminalCompletionCertificateDesign
} = comath;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task286-terminal-certificate-design-"));
const projectId = "PRJ-3286";
const secretTerms = /OPENAI_API_KEY|COMATH_CODEX_API_KEY|Authorization:\s*Bearer|token=|plain-token|sk-/i;
const privilegedTerms =
  /clean_replay_passed|completed_formal_proof|formally_checked|proven|proof_success|terminal unattended completion certified|terminal_unattended_completion_certified\s*[:=]\s*(?:true|1)|completion certificate available|completion_certificate_available\s*[:=]\s*(?:true|1)|unattended real-host execution completed|durable transport provided|live transport open|GA certified/i;
const executorLeakTerms =
  /execution_attempt_command|execution_attempt_result|execution_attempt_result_path|execution_attempt_result_artifact|SHOULD_NOT_LEAK_EXECUTOR/i;

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

function prerequisitePath(id) {
  return `.comath/release/pi-codex-lifecycle/${id}/unattended-real-host-completion-certification-prerequisite.json`;
}

function writeCompletionPrerequisiteFixture(id, overrides = {}, pathOverride) {
  const path = pathOverride ?? prerequisitePath(id);
  const body = {
    schema_version: "comath.pi_codex_unattended_real_host_completion_certification_prerequisite.v1",
    completion_certification_prerequisite_id: id,
    project_id: projectId,
    actor:
      "goal3-task286 fixture token=plain-token proof_success durable transport provided terminal unattended completion certified",
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
    attempt_review_id: `LIFE-UNATTENDED-COMPLETION-REVIEW-${id}`,
    attempt_review_status: "blocked_terminal_unattended_completion_review_required",
    attempt_review_path: `.comath/release/pi-codex-lifecycle/LIFE-UNATTENDED-COMPLETION-REVIEW-${id}/unattended-real-host-execution-attempt-review.json`,
    attempt_review_artifact: {
      kind: "unattended_real_host_execution_attempt_review",
      path: `.comath/release/pi-codex-lifecycle/LIFE-UNATTENDED-COMPLETION-REVIEW-${id}/unattended-real-host-execution-attempt-review.json`,
      sha256: "a".repeat(64),
      size_bytes: 1200
    },
    attempt_review_current: true,
    attempt_id: `LIFE-UNATTENDED-EXEC-ATTEMPT-${id}`,
    attempt_status: "unattended_real_host_execution_attempt_recorded",
    attempt_path: `.comath/release/pi-codex-lifecycle/LIFE-UNATTENDED-EXEC-ATTEMPT-${id}/unattended-real-host-execution-attempt.json`,
    attempt_artifact: {
      kind: "unattended_real_host_execution_attempt",
      path: `.comath/release/pi-codex-lifecycle/LIFE-UNATTENDED-EXEC-ATTEMPT-${id}/unattended-real-host-execution-attempt.json`,
      sha256: "b".repeat(64),
      size_bytes: 1300
    },
    attempt_current: true,
    readiness_id: `LIFE-UNATTENDED-EXEC-READINESS-${id}`,
    readiness_status: "unattended_real_host_execution_prerequisites_recorded",
    readiness_path: `.comath/release/pi-codex-lifecycle/LIFE-UNATTENDED-EXEC-READINESS-${id}/unattended-real-host-execution-readiness.json`,
    readiness_artifact: {
      kind: "unattended_real_host_execution_readiness",
      path: `.comath/release/pi-codex-lifecycle/LIFE-UNATTENDED-EXEC-READINESS-${id}/unattended-real-host-execution-readiness.json`,
      sha256: "c".repeat(64),
      size_bytes: 1400
    },
    readiness_current: true,
    handoff_review_id: `LIFE-HANDOFF-REVIEW-${id}`,
    handoff_review_path: `.comath/release/pi-codex-lifecycle/LIFE-HANDOFF-REVIEW-${id}/unattended-real-host-handoff-review.json`,
    handoff_review_artifact: {
      kind: "unattended_real_host_handoff_review",
      path: `.comath/release/pi-codex-lifecycle/LIFE-HANDOFF-REVIEW-${id}/unattended-real-host-handoff-review.json`,
      sha256: "d".repeat(64),
      size_bytes: 1500
    },
    handoff_review_current: true,
    operator_approval_id: `LIFE-OPERATOR-APPROVAL-${id}`,
    operator_approval_path: `.comath/release/pi-codex-lifecycle/LIFE-OPERATOR-APPROVAL-${id}/unattended-real-host-operator-approval.json`,
    operator_approval_artifact: {
      kind: "unattended_real_host_operator_approval",
      path: `.comath/release/pi-codex-lifecycle/LIFE-OPERATOR-APPROVAL-${id}/unattended-real-host-operator-approval.json`,
      sha256: "e".repeat(64),
      size_bytes: 1600
    },
    operator_approval_artifact_current: true,
    unattended_executor_contract_id: `LIFE-UNATTENDED-EXECUTOR-CONTRACT-${id}`,
    unattended_executor_contract_path: `.comath/release/pi-codex-lifecycle/LIFE-UNATTENDED-EXECUTOR-CONTRACT-${id}/unattended-real-host-executor-contract.json`,
    unattended_executor_contract_artifact: {
      kind: "unattended_real_host_executor_contract",
      path: `.comath/release/pi-codex-lifecycle/LIFE-UNATTENDED-EXECUTOR-CONTRACT-${id}/unattended-real-host-executor-contract.json`,
      sha256: "f".repeat(64),
      size_bytes: 1700
    },
    unattended_executor_contract_current: true,
    durable_transport_contract_id: `LIFE-DURABLE-TRANSPORT-CONTRACT-${id}`,
    durable_transport_contract_path: `.comath/release/pi-codex-lifecycle/LIFE-DURABLE-TRANSPORT-CONTRACT-${id}/unattended-real-host-durable-transport-contract.json`,
    durable_transport_contract_artifact: {
      kind: "unattended_real_host_durable_transport_contract",
      path: `.comath/release/pi-codex-lifecycle/LIFE-DURABLE-TRANSPORT-CONTRACT-${id}/unattended-real-host-durable-transport-contract.json`,
      sha256: "1".repeat(64),
      size_bytes: 1800
    },
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
    real_pi_runtime_probe_id: `LIFE-PI-RUNTIME-${id}`,
    session_id: `LIFE-SESSION-${id}`,
    transport_recovery_id: `LIFE-TRANSPORT-RECOVERY-${id}`,
    transport_lease_id: `LIFE-TRANSPORT-LEASE-${id}`,
    transport_heartbeat_id: `LIFE-TRANSPORT-HEARTBEAT-${id}`,
    execution_id: `LIFE-GUIDED-EXECUTION-${id}`,
    terminal_review_id: `LIFE-TERMINAL-REVIEW-${id}`,
    transport_contract_id: `LIFE-TRANSPORT-CONTRACT-${id}`,
    automatic_orchestration_id: `LIFE-AUTOMATIC-ORCHESTRATION-${id}`,
    transport_continuity_id: `LIFE-TRANSPORT-CONTINUITY-${id}`,
    agent_run_id: `LIFE-AGENT-RUN-${id}`,
    service_route: `/agent/run/LIFE-AGENT-RUN-${id}/log-session`,
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
      "goal3-task286 token=plain-token proof_success durable transport provided completion certificate available terminal unattended completion certified",
    terminal_completion_certificate_design_id: `LIFE-TERMINAL-COMPLETION-CERT-DESIGN-${prerequisite.id.split("-").at(-1)}`,
    completion_certification_prerequisite_id: prerequisite.id,
    completion_certification_prerequisite_path: prerequisite.path,
    completion_certification_prerequisite_sha256: prerequisite.sha256,
    ...overrides
  };
}

try {
  assert.equal(
    typeof recordPiCodexLifecycleUnattendedRealHostTerminalCompletionCertificateDesign,
    "function",
    "Task286 must export a service-owned terminal completion certificate design gate"
  );
  assert.equal(
    getComathdStatus().capabilities.includes(
      "pi_codex_unattended_real_host_terminal_completion_certificate_design_gate"
    ),
    true,
    "Task286 capability ledger must advertise the terminal completion certificate design gate"
  );

  const prerequisite = writeCompletionPrerequisiteFixture("LIFE-COMPLETION-CERTIFICATION-PREREQ-0286");
  const design = recordPiCodexLifecycleUnattendedRealHostTerminalCompletionCertificateDesign(
    projectRoot,
    designInput(prerequisite)
  );

  assert.equal(
    design.schema_version,
    "comath.pi_codex_unattended_real_host_terminal_completion_certificate_design.v1"
  );
  assert.equal(
    design.terminal_completion_certificate_design_status,
    "blocked_terminal_unattended_completion_certificate_evidence_missing"
  );
  assert.equal(design.terminal_goal_state, "blocked_with_replayable_certificate");
  assert.equal(design.completion_certificate_available, false);
  assert.equal(design.terminal_unattended_completion_certified, false);
  assert.equal(design.unattended_real_host_execution_completed, false);
  assert.equal(design.proof_authority, "none");
  assert.equal(design.can_promote_claim, false);
  assert.equal(design.can_certify_ga, false);
  assert.equal(design.completion_certification_prerequisite_id, prerequisite.id);
  assert.equal(design.completion_certification_prerequisite_artifact.sha256, prerequisite.sha256);
  assert.equal(design.completion_certification_prerequisite_current, true);
  assert.deepEqual(design.required_terminal_certificate_evidence, [
    "service_owned_terminal_completion_certificate_artifact",
    "current_task253_completion_certification_prerequisite",
    "operator_verified_terminal_attempt_result_chain",
    "durable_transport_and_execution_evidence_current",
    "public_executor_output_redacted",
    "ga_certification_gate_still_separate"
  ]);
  assert.deepEqual(design.blocker_reasons, [
    "terminal_unattended_completion_evidence_missing",
    "terminal_unattended_completion_certificate_missing",
    "service_owned_terminal_completion_certificate_artifact_missing"
  ]);
  assert.equal(JSON.stringify(design).includes(projectRoot), false, "design result must not echo host paths");
  assert.doesNotMatch(JSON.stringify(design), secretTerms);
  assert.doesNotMatch(JSON.stringify(design), privilegedTerms);
  assert.doesNotMatch(JSON.stringify(design), executorLeakTerms);

  const persistedPath = join(projectRoot, design.terminal_completion_certificate_design_path);
  assert.equal(existsSync(persistedPath), true, "terminal certificate design must persist append-only evidence");
  const persisted = readJson(persistedPath);
  assert.equal(
    persisted.terminal_completion_certificate_design_artifact,
    undefined,
    "persisted terminal certificate design must not self-hash recursively"
  );
  assert.equal(persisted.completion_certificate_available, false);
  assert.equal(persisted.terminal_unattended_completion_certified, false);
  assert.equal(persisted.can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(persisted), secretTerms);
  assert.doesNotMatch(JSON.stringify(persisted), privilegedTerms);
  assert.doesNotMatch(JSON.stringify(persisted), executorLeakTerms);

  assert.throws(
    () =>
      recordPiCodexLifecycleUnattendedRealHostTerminalCompletionCertificateDesign(
        projectRoot,
        designInput(prerequisite)
      ),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_TERMINAL_COMPLETION_CERTIFICATE_DESIGN_ALREADY_EXISTS" },
    "terminal completion certificate design records must be append-only by design id"
  );

  assert.throws(
    () =>
      recordPiCodexLifecycleUnattendedRealHostTerminalCompletionCertificateDesign(
        projectRoot,
        designInput(prerequisite, {
          terminal_completion_certificate_design_id: "LIFE-TERMINAL-COMPLETION-CERT-DESIGN-STALE",
          completion_certification_prerequisite_sha256: "0".repeat(64)
        })
      ),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_TERMINAL_COMPLETION_CERTIFICATE_DESIGN_PREREQUISITE_STALE" },
    "terminal completion certificate design must reject stale prerequisite hashes"
  );

  const poisoned = writeCompletionPrerequisiteFixture("LIFE-COMPLETION-CERTIFICATION-PREREQ-0286-POISONED", {
    proof_authority: "lean_kernel_clean_replay",
    can_certify_ga: true,
    completion_certificate_available: true,
    terminal_unattended_completion_certified: true,
    unattended_real_host_execution_completed: true
  });
  assert.throws(
    () =>
      recordPiCodexLifecycleUnattendedRealHostTerminalCompletionCertificateDesign(
        projectRoot,
        designInput(poisoned, {
          terminal_completion_certificate_design_id: "LIFE-TERMINAL-COMPLETION-CERT-DESIGN-POISONED"
        })
      ),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_TERMINAL_COMPLETION_CERTIFICATE_DESIGN_PREREQUISITE_INVALID" },
    "terminal completion certificate design must reject promotional prerequisite artifacts"
  );

  const unknownBlocker = writeCompletionPrerequisiteFixture(
    "LIFE-COMPLETION-CERTIFICATION-PREREQ-0286-UNKNOWN-BLOCKER",
    {
      blocker_reasons: [
        "terminal_unattended_completion_evidence_missing",
        "terminal_unattended_completion_certificate_missing",
        "caller_supplied_completion_certificate_available"
      ]
    }
  );
  assert.throws(
    () =>
      recordPiCodexLifecycleUnattendedRealHostTerminalCompletionCertificateDesign(
        projectRoot,
        designInput(unknownBlocker, {
          terminal_completion_certificate_design_id: "LIFE-TERMINAL-COMPLETION-CERT-DESIGN-UNKNOWN-BLOCKER"
        })
      ),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_TERMINAL_COMPLETION_CERTIFICATE_DESIGN_PREREQUISITE_INVALID" },
    "terminal completion certificate design must reject prerequisite artifacts with unknown blocker semantics"
  );

  const noncanonical = writeCompletionPrerequisiteFixture(
    "LIFE-COMPLETION-CERTIFICATION-PREREQ-0286-NONCANONICAL",
    {},
    ".comath/release/pi-codex-lifecycle/noncanonical/terminal-completion-certificate-design-input.json"
  );
  assert.throws(
    () =>
      recordPiCodexLifecycleUnattendedRealHostTerminalCompletionCertificateDesign(
        projectRoot,
        designInput(noncanonical, {
          terminal_completion_certificate_design_id: "LIFE-TERMINAL-COMPLETION-CERT-DESIGN-NONCANONICAL"
        })
      ),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_TERMINAL_COMPLETION_CERTIFICATE_DESIGN_PREREQUISITE_INVALID" },
    "terminal completion certificate design must reject non-canonical prerequisite paths"
  );

  const server = createComathServer();
  const routePrerequisite = writeCompletionPrerequisiteFixture("LIFE-COMPLETION-CERTIFICATION-PREREQ-0286-ROUTE");
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/pi-codex-lifecycle/unattended-real-host-terminal-completion-certificate-design",
    body: {
      project_root: projectRoot,
      ...designInput(routePrerequisite, {
        terminal_completion_certificate_design_id: "LIFE-TERMINAL-COMPLETION-CERT-DESIGN-ROUTE",
        actor:
          "goal3-task286-route token=plain-token proof_success durable transport provided completion certificate available terminal unattended completion certified"
      })
    }
  });
  assert.equal(routeResponse.status, 200, JSON.stringify(routeResponse.body));
  assert.equal(routeResponse.body.terminal_completion_certificate_design.proof_authority, "none");
  assert.equal(routeResponse.body.terminal_completion_certificate_design.completion_certificate_available, false);
  assert.equal(routeResponse.body.terminal_completion_certificate_design.terminal_unattended_completion_certified, false);
  assert.equal(routeResponse.body.terminal_completion_certificate_design.can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), secretTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), privilegedTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), executorLeakTerms);

  const events = readAuditEvents(projectRoot);
  const event = events.find(
    (entry) =>
      entry.event_type === "release.pi_codex_unattended_real_host_terminal_completion_certificate_design_recorded" &&
      entry.payload.terminal_completion_certificate_design_id ===
        design.terminal_completion_certificate_design_id
  );
  assert.ok(event, "Task286 terminal completion certificate design must append an audit event");
  assert.equal(event.payload.completion_certification_prerequisite_id, prerequisite.id);
  assert.equal(event.payload.completion_certification_prerequisite_artifact_sha256, prerequisite.sha256);
  assert.equal(event.payload.completion_certificate_available, false);
  assert.equal(event.payload.terminal_unattended_completion_certified, false);
  assert.equal(event.payload.can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(events), secretTerms);
  assert.doesNotMatch(JSON.stringify(events), privilegedTerms);
  assert.doesNotMatch(JSON.stringify(events), executorLeakTerms);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task286 service-owned terminal completion certificate design tests passed.");
