import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createComathServer, readAuditEvents, reviewPiCodexLifecycleReadiness } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task284-lifecycle-completion-prereq-"));
const projectId = "PRJ-3284";
const secretTerms = /OPENAI_API_KEY|COMATH_CODEX_API_KEY|Authorization:\s*Bearer|token=|plain-token|sk-/i;
const privilegedTerms =
  /clean_replay_passed|completed_formal_proof|formally_checked|proven|proof_success|terminal unattended completion certified|unattended real-host execution completed|durable transport provided|live transport open/i;

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
      "goal3-task284 fixture token=plain-token proof_success durable transport provided terminal unattended completion certified",
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
    unattended_real_host_execution_completed: false,
    durable_transport_provided: false,
    live_transport_open: false,
    operator_confirmation_bypassed: false,
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

const greenInstallSessionEvidence = {
  session_kind: "real_pi_host_manual_install",
  pi_host_kind: "real_pi_host",
  runtime_entrypoint_imported: true,
  runtime_registered: true,
  host_confirmation_observed: true,
  comathd_server_kind: "durable_service",
  service_start_observed: true,
  service_stop_observed: true,
  service_restart_observed: true
};

const greenCodexEvidence = {
  installed_cli_validation_ok: true,
  installed_cli_probe_source: "service_owned_process",
  codex_api_account_network_validation: "passed"
};

function reviewInput(prerequisite, overrides = {}) {
  return {
    project_id: projectId,
    actor: "goal3-task284-readiness token=plain-token proof_success terminal unattended completion certified",
    install_session_evidence: greenInstallSessionEvidence,
    codex_evidence: greenCodexEvidence,
    completion_certification_prerequisite_id: prerequisite.id,
    completion_certification_prerequisite_path: prerequisite.path,
    completion_certification_prerequisite_sha256: prerequisite.sha256,
    ...overrides
  };
}

try {
  assert.equal(
    typeof reviewPiCodexLifecycleReadiness,
    "function",
    "Task284 must extend the service-owned lifecycle readiness review gate"
  );

  const prerequisite = writeCompletionPrerequisiteFixture("LIFE-COMPLETION-CERTIFICATION-PREREQ-0284");
  const review = reviewPiCodexLifecycleReadiness(projectRoot, {
    ...reviewInput(prerequisite),
    review_id: "LIFE-0284"
  });

  assert.equal(
    review.ok,
    false,
    "terminal completion-certification prerequisite must block lifecycle release readiness even when older checks are green"
  );
  assert.equal(review.readiness_status, "blocked_missing_real_host_lifecycle_validation");
  assert.deepEqual(review.checks.real_pi_host_runtime, {
    ok: true,
    required: true,
    observed: "real_pi_host"
  });
  assert.deepEqual(review.checks.durable_comathd_service_lifecycle, {
    ok: true,
    required: true,
    observed: "durable_service"
  });
  assert.deepEqual(review.checks.production_codex_validation, {
    ok: true,
    required: true,
    observed: "passed"
  });
  assert.deepEqual(review.checks.terminal_unattended_completion_certification, {
    ok: false,
    required: true,
    observed: "blocked_terminal_unattended_completion_certification_required"
  });
  assert.equal(
    review.vetoes.some((veto) => veto.code === "terminal_unattended_completion_certification_required"),
    true
  );
  assert.equal(review.proof_authority, "none");
  assert.equal(review.can_promote_claim, false);
  assert.equal(review.can_certify_ga, false);
  assert.equal(
    review.inputs.completion_certification_prerequisite.completion_certification_prerequisite_id,
    prerequisite.id
  );
  assert.equal(
    review.inputs.completion_certification_prerequisite.completion_certification_prerequisite_status,
    "blocked_terminal_unattended_completion_certification_required"
  );
  assert.equal(review.inputs.completion_certification_prerequisite.artifact.path, prerequisite.path);
  assert.equal(review.inputs.completion_certification_prerequisite.artifact.sha256, prerequisite.sha256);
  assert.equal(review.inputs.completion_certification_prerequisite.proof_authority, "none");
  assert.equal(review.inputs.completion_certification_prerequisite.can_certify_ga, false);
  assert.equal(review.inputs.completion_certification_prerequisite.completion_certificate_available, false);
  assert.equal(review.inputs.completion_certification_prerequisite.terminal_unattended_completion_certified, false);

  const persisted = readJson(join(projectRoot, review.review_path));
  assert.equal(persisted.inputs.completion_certification_prerequisite.artifact.sha256, prerequisite.sha256);
  assert.equal(JSON.stringify(persisted).includes(projectRoot), false, "persisted review must not echo host paths");
  assert.doesNotMatch(JSON.stringify(persisted), secretTerms);
  assert.doesNotMatch(JSON.stringify(persisted), privilegedTerms);

  assert.throws(
    () =>
      reviewPiCodexLifecycleReadiness(projectRoot, {
        ...reviewInput(prerequisite, {
          review_id: "LIFE-0284-STALE",
          completion_certification_prerequisite_sha256: "0".repeat(64)
        })
      }),
    { code: "PI_CODEX_LIFECYCLE_READINESS_COMPLETION_CERTIFICATION_PREREQUISITE_STALE" },
    "lifecycle readiness review must reject stale completion-prerequisite hashes"
  );

  const poisoned = writeCompletionPrerequisiteFixture("LIFE-COMPLETION-CERTIFICATION-PREREQ-0284-POISONED", {
    proof_authority: "lean_kernel_clean_replay",
    can_certify_ga: true,
    completion_certificate_available: true,
    terminal_unattended_completion_certified: true,
    unattended_real_host_execution_completed: true
  });
  assert.throws(
    () =>
      reviewPiCodexLifecycleReadiness(projectRoot, {
        ...reviewInput(poisoned, { review_id: "LIFE-0284-POISONED" })
      }),
    { code: "PI_CODEX_LIFECYCLE_READINESS_COMPLETION_CERTIFICATION_PREREQUISITE_INVALID" },
    "lifecycle readiness review must reject promotional completion-prerequisite artifacts"
  );

  const noncanonical = writeCompletionPrerequisiteFixture(
    "LIFE-COMPLETION-CERTIFICATION-PREREQ-0284-NONCANONICAL",
    {},
    ".comath/release/pi-codex-lifecycle/noncanonical/unattended-real-host-completion-certification-prerequisite.json"
  );
  assert.throws(
    () =>
      reviewPiCodexLifecycleReadiness(projectRoot, {
        ...reviewInput(noncanonical, { review_id: "LIFE-0284-NONCANONICAL" })
      }),
    { code: "PI_CODEX_LIFECYCLE_READINESS_COMPLETION_CERTIFICATION_PREREQUISITE_INVALID" },
    "lifecycle readiness review must reject non-canonical completion-prerequisite paths"
  );

  const server = createComathServer();
  const routePrerequisite = writeCompletionPrerequisiteFixture("LIFE-COMPLETION-CERTIFICATION-PREREQ-0284-ROUTE");
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/pi-codex-lifecycle/review",
    body: {
      project_root: projectRoot,
      ...reviewInput(routePrerequisite, { review_id: "LIFE-0284-ROUTE" })
    }
  });
  assert.equal(routeResponse.status, 200, JSON.stringify(routeResponse.body));
  assert.equal(routeResponse.body.review.ok, false);
  assert.equal(
    routeResponse.body.review.inputs.completion_certification_prerequisite.artifact.sha256,
    routePrerequisite.sha256
  );
  assert.equal(
    routeResponse.body.review.vetoes.some((veto) => veto.code === "terminal_unattended_completion_certification_required"),
    true
  );
  assert.equal(routeResponse.body.review.proof_authority, "none");
  assert.equal(routeResponse.body.review.can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), secretTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), privilegedTerms);

  const events = readAuditEvents(projectRoot);
  const event = events.find(
    (entry) =>
      entry.event_type === "release.pi_codex_lifecycle_readiness_reviewed" &&
      entry.payload.review_id === "LIFE-0284"
  );
  assert.ok(event, "Task284 readiness review must append an audit event");
  assert.equal(event.payload.completion_certification_prerequisite_id, prerequisite.id);
  assert.equal(event.payload.completion_certification_prerequisite_artifact_sha256, prerequisite.sha256);
  assert.equal(event.payload.terminal_unattended_completion_certified, false);
  assert.equal(event.payload.can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(events), secretTerms);
  assert.doesNotMatch(JSON.stringify(events), privilegedTerms);

  assert.equal(existsSync(prerequisite.absolutePath), true);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task284 Pi lifecycle readiness completion-prerequisite binding tests passed.");
