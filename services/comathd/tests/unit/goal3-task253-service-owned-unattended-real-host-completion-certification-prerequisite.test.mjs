import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import * as comath from "../../dist/index.js";

const {
  createComathServer,
  getComathdStatus,
  readAuditEvents,
  recordPiCodexLifecycleUnattendedRealHostCompletionCertificationPrerequisite
} = comath;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task253-completion-certification-prerequisite-"));
const projectId = "PRJ-3253";
const secretTerms = /COMATH_CODEX_API_KEY|OPENAI_API_KEY|Authorization:\s*Bearer|api_key|token=|plain-token|sk-/i;
const privilegedPublicTerms =
  /clean_replay_passed|completed_formal_proof|formally_checked|proven|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|kernel_checked|proof_success/i;
const transportOverclaimTerms =
  /long[- ]lived\s+(?:websocket|sse)|indefinite\s+sse|terminal transport recovered live|durable transport provided|live transport open/i;
const unattendedOverclaimTerms =
  /production unattended executor|operator-free execution completed|unattended real-host execution completed|operator confirmation bypassed|terminal unattended completion certified|service-owned evidence created|handoff can execute|unattended execution authorized|operator approval recorded/i;

function sha256Text(text) {
  return createHash("sha256").update(text).digest("hex");
}

function writeJson(path, value) {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text, "utf8");
  return { text, sha256: sha256Text(text), size_bytes: Buffer.byteLength(text, "utf8") };
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function reviewPath(id) {
  return `.comath/release/pi-codex-lifecycle/${id}/unattended-real-host-execution-attempt-review.json`;
}

function writeAttemptReviewFixture(suffix, overrides = {}) {
  const attemptReviewId = `LIFE-UNATTENDED-COMPLETION-REVIEW-${suffix}`;
  const attemptId = `LIFE-UNATTENDED-EXEC-ATTEMPT-${suffix}`;
  const attemptPath = `.comath/release/pi-codex-lifecycle/${attemptId}/unattended-real-host-execution-attempt.json`;
  const path = reviewPath(attemptReviewId);
  const review = {
    schema_version: "comath.pi_codex_unattended_real_host_execution_attempt_review.v1",
    attempt_review_id: attemptReviewId,
    project_id: projectId,
    actor: `goal3-task253-review-${suffix}`,
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
    execution_attempt_result_artifact_current: true,
    executor_invoked: true,
    execution_attempted: true,
    execution_attempt_succeeded: true,
    execution_attempt_exit_code: 0,
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

function certificationInput(fixture, overrides = {}) {
  return {
    project_id: projectId,
    actor:
      "goal3-task253 OPENAI_API_KEY=plain-token proof_success durable transport provided terminal unattended completion certified",
    completion_certification_prerequisite_id: `LIFE-COMPLETION-CERTIFICATION-PREREQ-${fixture.attemptReviewId.split("-").at(-1)}`,
    attempt_review_id: fixture.attemptReviewId,
    attempt_review_path: fixture.path,
    attempt_review_sha256: fixture.sha256,
    ...overrides
  };
}

assert.equal(
  typeof recordPiCodexLifecycleUnattendedRealHostCompletionCertificationPrerequisite,
  "function",
  "Task253 must export a service-owned completion certification prerequisite gate"
);
assert.equal(
  getComathdStatus().capabilities.includes("pi_codex_unattended_real_host_completion_certification_prerequisite_gate"),
  true,
  "Task253 capability ledger must advertise the completion certification prerequisite gate"
);

const attemptedFixture = writeAttemptReviewFixture("0253");
const prerequisite = recordPiCodexLifecycleUnattendedRealHostCompletionCertificationPrerequisite(
  projectRoot,
  certificationInput(attemptedFixture)
);
assert.equal(
  prerequisite.schema_version,
  "comath.pi_codex_unattended_real_host_completion_certification_prerequisite.v1"
);
assert.equal(
  prerequisite.completion_certification_prerequisite_status,
  "blocked_terminal_unattended_completion_certification_required"
);
assert.equal(prerequisite.terminal_goal_state, "blocked_with_replayable_certificate");
assert.deepEqual(prerequisite.blocker_reasons, [
  "terminal_unattended_completion_evidence_missing",
  "terminal_unattended_completion_certificate_missing"
]);
assert.equal(prerequisite.attempt_review_id, attemptedFixture.attemptReviewId);
assert.equal(prerequisite.attempt_review_artifact.sha256, attemptedFixture.sha256);
assert.equal(prerequisite.attempt_review_current, true);
assert.equal(prerequisite.attempt_id, attemptedFixture.attemptId);
assert.equal(prerequisite.attempt_review_status, "blocked_terminal_unattended_completion_review_required");
assert.equal(prerequisite.execution_attempted, true);
assert.equal(prerequisite.execution_attempt_succeeded, true);
assert.equal(prerequisite.execution_attempt_exit_code, 0);
assert.equal(prerequisite.completion_certificate_available, false);
assert.equal(prerequisite.terminal_unattended_completion_certified, false);
assert.equal(prerequisite.unattended_real_host_execution_completed, false);
assert.equal(prerequisite.durable_transport_provided, false);
assert.equal(prerequisite.live_transport_open, false);
assert.equal(prerequisite.proof_authority, "none");
assert.equal(prerequisite.can_promote_claim, false);
assert.equal(prerequisite.can_certify_ga, false);
assert.equal(JSON.stringify(prerequisite).includes(projectRoot), false);
assert.doesNotMatch(JSON.stringify(prerequisite), secretTerms);
assert.doesNotMatch(JSON.stringify(prerequisite), privilegedPublicTerms);
assert.doesNotMatch(JSON.stringify(prerequisite), transportOverclaimTerms);
assert.doesNotMatch(JSON.stringify(prerequisite), unattendedOverclaimTerms);

const persistedPath = join(projectRoot, prerequisite.completion_certification_prerequisite_path);
assert.equal(existsSync(persistedPath), true, "completion certification prerequisite must persist append-only evidence");
const persisted = readJson(persistedPath);
assert.equal(
  persisted.completion_certification_prerequisite_artifact,
  undefined,
  "persisted certification prerequisite must not self-hash recursively"
);
assert.equal(persisted.proof_authority, "none");
assert.equal(persisted.can_certify_ga, false);
assert.equal(persisted.completion_certificate_available, false);
assert.equal(persisted.terminal_unattended_completion_certified, false);
assert.doesNotMatch(JSON.stringify(persisted), secretTerms);
assert.doesNotMatch(JSON.stringify(persisted), privilegedPublicTerms);
assert.doesNotMatch(JSON.stringify(persisted), transportOverclaimTerms);
assert.doesNotMatch(JSON.stringify(persisted), unattendedOverclaimTerms);

assert.throws(
  () =>
    recordPiCodexLifecycleUnattendedRealHostCompletionCertificationPrerequisite(
      projectRoot,
      certificationInput(attemptedFixture)
    ),
  { code: "PI_CODEX_UNATTENDED_REAL_HOST_COMPLETION_CERTIFICATION_PREREQUISITE_ALREADY_EXISTS" },
  "completion certification prerequisites must be append-only by certification id"
);
assert.throws(
  () =>
    recordPiCodexLifecycleUnattendedRealHostCompletionCertificationPrerequisite(
      projectRoot,
      certificationInput(attemptedFixture, {
        completion_certification_prerequisite_id: "LIFE-COMPLETION-CERTIFICATION-PREREQ-0253-STALE",
        attempt_review_sha256: "0".repeat(64)
      })
    ),
  { code: "PI_CODEX_UNATTENDED_REAL_HOST_COMPLETION_CERTIFICATION_PREREQUISITE_REVIEW_STALE" },
  "completion certification prerequisite must reject stale review hashes"
);

const poisonedFixture = writeAttemptReviewFixture("0253-POISONED");
const poisonedReview = readJson(poisonedFixture.absolutePath);
poisonedReview.proof_authority = "lean_kernel_clean_replay";
poisonedReview.can_certify_ga = true;
poisonedReview.unattended_real_host_execution_completed = true;
poisonedReview.terminal_unattended_completion_certified = true;
const poisonedPersisted = writeJson(poisonedFixture.absolutePath, poisonedReview);
assert.throws(
  () =>
    recordPiCodexLifecycleUnattendedRealHostCompletionCertificationPrerequisite(
      projectRoot,
      certificationInput(poisonedFixture, {
        completion_certification_prerequisite_id: "LIFE-COMPLETION-CERTIFICATION-PREREQ-0253-POISONED",
        attempt_review_sha256: poisonedPersisted.sha256
      })
    ),
  { code: "PI_CODEX_UNATTENDED_REAL_HOST_COMPLETION_CERTIFICATION_PREREQUISITE_REVIEW_INVALID" },
  "completion certification prerequisite must reject promotional review artifacts even when hash-current"
);

const server = createComathServer();
const routeFixture = writeAttemptReviewFixture("0253-ROUTE");
const routeResponse = await server.inject({
  method: "POST",
  path: "/release/pi-codex-lifecycle/unattended-real-host-completion-certification-prerequisite",
  body: {
    project_root: projectRoot,
    ...certificationInput(routeFixture, {
      completion_certification_prerequisite_id: "LIFE-COMPLETION-CERTIFICATION-PREREQ-0253-ROUTE",
      actor:
        "goal3-task253-route token=plain-token proof_success durable transport provided live transport open unattended real-host execution completed"
    })
  }
});
assert.equal(routeResponse.status, 200, JSON.stringify(routeResponse.body));
assert.equal(routeResponse.body.completion_certification_prerequisite.proof_authority, "none");
assert.equal(
  routeResponse.body.completion_certification_prerequisite.completion_certification_prerequisite_status,
  "blocked_terminal_unattended_completion_certification_required"
);
assert.equal(routeResponse.body.completion_certification_prerequisite.completion_certificate_available, false);
assert.equal(routeResponse.body.completion_certification_prerequisite.terminal_unattended_completion_certified, false);
assert.equal(routeResponse.body.completion_certification_prerequisite.unattended_real_host_execution_completed, false);
assert.equal(routeResponse.body.completion_certification_prerequisite.can_certify_ga, false);
assert.doesNotMatch(JSON.stringify(routeResponse.body), secretTerms);
assert.doesNotMatch(JSON.stringify(routeResponse.body), privilegedPublicTerms);
assert.doesNotMatch(JSON.stringify(routeResponse.body), transportOverclaimTerms);
assert.doesNotMatch(JSON.stringify(routeResponse.body), unattendedOverclaimTerms);

const events = readAuditEvents(projectRoot);
const event = events.find(
  (entry) =>
    entry.event_type === "release.pi_codex_unattended_real_host_completion_certification_prerequisite_recorded" &&
    entry.payload.completion_certification_prerequisite_id ===
      prerequisite.completion_certification_prerequisite_id
);
assert.ok(event, "completion certification prerequisite audit event must be appended");
assert.equal(event.payload.attempt_review_id, attemptedFixture.attemptReviewId);
assert.equal(event.payload.attempt_review_artifact_sha256, attemptedFixture.sha256);
assert.equal(event.payload.completion_certificate_available, false);
assert.equal(event.payload.terminal_unattended_completion_certified, false);
assert.equal(event.payload.unattended_real_host_execution_completed, false);
assert.equal(event.payload.proof_authority, "none");
assert.equal(event.payload.can_certify_ga, false);
assert.doesNotMatch(JSON.stringify(events), secretTerms);
assert.doesNotMatch(JSON.stringify(events), privilegedPublicTerms);
assert.doesNotMatch(JSON.stringify(events), transportOverclaimTerms);
assert.doesNotMatch(JSON.stringify(events), unattendedOverclaimTerms);

console.log("Goal 3 Task253 unattended real-host completion certification prerequisite tests passed.");
