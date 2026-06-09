import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as comath from "../../dist/index.js";

const {
  createComathServer,
  getComathdStatus,
  initProject,
  readAuditEvents,
  recordGoal3GaCertificationReview,
  recordGoal3GaOperationalReadinessReview
} = comath;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task294-ga-certification-review-"));
const init = initProject({ name: "Goal 3 Task294 GA certification review", root_path: projectRoot });
const projectId = init.project.project_id;
const secretTerms = /Authorization:\s*Bearer|api_key|token=|plain-token|sk-/i;
const proofAuthorityTerms =
  /clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|kernel_checked|proof_success/i;
const gaOverclaimTerms = /GA certified|can_certify_ga\s*[:=]\s*(?:true|1)/i;

function sha256Text(text) {
  return createHash("sha256").update(text).digest("hex");
}

function writeJson(relativePath, value) {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  const absolutePath = join(projectRoot, relativePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, text, "utf8");
  return {
    path: relativePath,
    sha256: sha256Text(text),
    size_bytes: Buffer.byteLength(text, "utf8"),
    body: value
  };
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(projectRoot, relativePath), "utf8"));
}

function artifact(kind, path, fill, size = 1024) {
  return {
    kind,
    path,
    sha256: fill.repeat(64),
    size_bytes: size
  };
}

function writeTransportClosureReview(id, overrides = {}) {
  const path = `.comath/release/pi-codex-lifecycle/${id}/operator-service-transport-closure-review.json`;
  return writeJson(path, {
    schema_version: "comath.pi_codex_operator_service_transport_closure_review.v1",
    transport_closure_review_id: id,
    project_id: projectId,
    actor: "goal3-task294 transport closure reviewer",
    created_at: "2026-06-09T00:00:00.000Z",
    transport_closure_review_status: "maintained_operator_service_transport_closure_reviewed",
    durable_transport_closure_status: "maintained_operator_service_transport_closure_reviewed",
    transport_closure_review_path: path,
    requested_transport_closure_mode: "maintained_operator_service_transport_closure_review",
    terminal_completion_certificate_id: `LIFE-TERMINAL-COMPLETION-CERT-${id}`,
    terminal_completion_certificate_status: "terminal_unattended_completion_certified",
    terminal_completion_certificate_path:
      `.comath/release/pi-codex-lifecycle/LIFE-TERMINAL-COMPLETION-CERT-${id}/terminal-completion-certificate.json`,
    terminal_completion_certificate_artifact: artifact(
      "unattended_real_host_terminal_completion_certificate",
      `.comath/release/pi-codex-lifecycle/LIFE-TERMINAL-COMPLETION-CERT-${id}/terminal-completion-certificate.json`,
      "a"
    ),
    terminal_completion_certificate_current: true,
    durable_transport_contract_id: `LIFE-DURABLE-TRANSPORT-CONTRACT-${id}`,
    durable_transport_contract_artifact: artifact(
      "unattended_real_host_durable_transport_contract",
      `.comath/release/pi-codex-lifecycle/LIFE-DURABLE-TRANSPORT-CONTRACT-${id}/unattended-real-host-durable-transport-contract.json`,
      "b"
    ),
    durable_transport_contract_current: true,
    transport_continuity_id: `LIFE-TRANSPORT-CONTINUITY-${id}`,
    transport_continuity_artifact: artifact(
      "operator_service_transport_continuity",
      `.comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-CONTINUITY-${id}/operator-service-transport-continuity.json`,
      "c"
    ),
    transport_continuity_current: true,
    transport_contract_id: `LIFE-TRANSPORT-CONTRACT-${id}`,
    transport_contract_artifact: artifact(
      "operator_service_transport_contract",
      `.comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-CONTRACT-${id}/operator-service-transport-contract.json`,
      "d"
    ),
    transport_contract_current: true,
    maintained_transport_primitive_bound: true,
    completion_certificate_available: true,
    terminal_unattended_completion_certified: true,
    unattended_real_host_execution_completed: true,
    service_transport_primitive: "node_http_agent_run_log_session_route",
    client_transport_primitive: "pi_fetch_get_text",
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
    ga_certification_gate_separate: true,
    ...overrides
  });
}

function writeAdapterOsIsolationReadiness(id, ok, overrides = {}) {
  const path = `.comath/release/agent-adapter-os-isolation/${id}/review.json`;
  return writeJson(path, {
    schema_version: "comath.agent_adapter_os_isolation_readiness.v1",
    review_id: id,
    project_id: projectId,
    adapter_id: "codex-cli",
    backend: "external",
    created_at: "2026-06-09T00:00:00.000Z",
    ok,
    readiness_status: ok ? "ready_for_os_isolation_release_review" : "blocked_missing_os_enforced_adapter_isolation",
    review_path: path,
    evidence_artifact: ok
      ? artifact(
          "agent_adapter_os_isolation_evidence",
          `.comath/release/agent-adapter-os-isolation/${id}/evidence.json`,
          "e"
        )
      : null,
    adapter_execution_isolation: {
      required_for_ga: true,
      current_boundary: ok ? "os_enforced" : "process_boundary_only",
      os_enforced: ok,
      provider: ok ? "oci_container" : null,
      claims_runtime_enforcement: false,
      proof_authority: "none"
    },
    vetoes: ok ? [] : [{ code: "adapter_os_isolation_evidence_missing", message: "missing canonical OS evidence" }],
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    ...overrides
  });
}

function createOperationalReadinessReview(id, overrides = {}) {
  const transport = writeTransportClosureReview(`LIFE-TRANSPORT-CLOSURE-REVIEW-${id}`);
  const adapter = writeAdapterOsIsolationReadiness(`ADAPTER-OSISO-${id}`, true);
  return recordGoal3GaOperationalReadinessReview(projectRoot, {
    project_id: projectId,
    operational_readiness_review_id: `GOAL3-GA-OPERATIONAL-READINESS-${id}`,
    actor: "goal3-task294 operational readiness source",
    transport_closure_review_id: transport.body.transport_closure_review_id,
    transport_closure_review_path: transport.path,
    transport_closure_review_sha256: transport.sha256,
    adapter_os_isolation_review_id: adapter.body.review_id,
    adapter_os_isolation_review_path: adapter.path,
    adapter_os_isolation_review_sha256: adapter.sha256,
    ...overrides
  });
}

try {
  assert.equal(
    typeof recordGoal3GaCertificationReview,
    "function",
    "Task294 must export a service-owned GA certification review gate"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("goal3_ga_certification_review_gate"),
    true,
    "Task294 capability ledger must advertise the GA certification review without claiming certification"
  );

  const readiness = createOperationalReadinessReview("0294-READY");
  const review = recordGoal3GaCertificationReview(projectRoot, {
    project_id: projectId,
    ga_certification_review_id: "GOAL3-GA-CERTIFICATION-REVIEW-0294",
    actor: "goal3-task294 reviewer token=plain-token proof_success GA certified can_certify_ga=true",
    operational_readiness_review_id: readiness.operational_readiness_review_id,
    operational_readiness_review_path: readiness.operational_readiness_review_path,
    operational_readiness_review_sha256: readiness.operational_readiness_review_artifact.sha256
  });

  assert.equal(review.schema_version, "comath.goal3_ga_certification_review.v1");
  assert.equal(review.ok, false, "Task294 must fail closed until final GA prerequisites are complete");
  assert.equal(review.ga_certification_status, "blocked_release_candidate_ga_certification_prerequisites");
  assert.equal(review.operational_readiness_review_current, true);
  assert.equal(review.operational_readiness_status, "ready_for_ga_release_candidate_review");
  assert.equal(
    review.blocker_reasons.includes("positive_matrix_release_candidate_proof_breadth_incomplete"),
    true
  );
  assert.equal(review.acceptance_report_current, true);
  assert.equal(review.trust_core_negative_suite_fail_closed, true);
  assert.equal(review.positive_workflow_representative_verified, true);
  assert.equal(review.positive_matrix_remaining_blocker_status, "replayable_blocker");
  assert.equal(review.proof_authority, "none");
  assert.equal(review.can_promote_claim, false);
  assert.equal(review.can_certify_ga, false);
  assert.equal(review.ga_certification_gate_separate, true);
  assert.equal(JSON.stringify(review).includes(projectRoot), false);
  assert.doesNotMatch(JSON.stringify(review), secretTerms);
  assert.doesNotMatch(JSON.stringify(review), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(review), gaOverclaimTerms);
  assert.equal(existsSync(join(projectRoot, review.ga_certification_review_path)), true);
  assert.equal(existsSync(join(projectRoot, review.acceptance_report_artifact.path)), true);
  const persisted = readJson(review.ga_certification_review_path);
  assert.equal(persisted.ga_certification_review_artifact, undefined, "persisted review must not self-hash recursively");
  const acceptance = readJson(review.acceptance_report_artifact.path);
  assert.equal(acceptance.schema_version, "comath.goal3_ga_acceptance.v1");
  assert.equal(acceptance.proof_authority, "none");
  assert.equal(acceptance.positive_matrix.remaining_matrix_blocker.status, "replayable_blocker");

  assert.throws(
    () =>
      recordGoal3GaCertificationReview(projectRoot, {
        project_id: projectId,
        ga_certification_review_id: "GOAL3-GA-CERTIFICATION-REVIEW-0294-STALE",
        operational_readiness_review_id: readiness.operational_readiness_review_id,
        operational_readiness_review_path: readiness.operational_readiness_review_path,
        operational_readiness_review_sha256: "0".repeat(64)
      }),
    { code: "GOAL3_GA_CERTIFICATION_REVIEW_STALE" },
    "Task294 must reject stale operational readiness hashes before certification review"
  );

  const promotional = createOperationalReadinessReview("0294-PROMO");
  const promotionalBody = readJson(promotional.operational_readiness_review_path);
  promotionalBody.can_certify_ga = true;
  const promotionalArtifact = writeJson(promotional.operational_readiness_review_path, promotionalBody);
  assert.throws(
    () =>
      recordGoal3GaCertificationReview(projectRoot, {
        project_id: projectId,
        ga_certification_review_id: "GOAL3-GA-CERTIFICATION-REVIEW-0294-PROMO",
        operational_readiness_review_id: promotional.operational_readiness_review_id,
        operational_readiness_review_path: promotional.operational_readiness_review_path,
        operational_readiness_review_sha256: promotionalArtifact.sha256
      }),
    { code: "GOAL3_GA_CERTIFICATION_REVIEW_INVALID" },
    "Task294 must reject promotional operational readiness material even when hash-current"
  );

  const routeReadiness = createOperationalReadinessReview("0294-ROUTE");
  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/goal3/ga-certification-review",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      ga_certification_review_id: "GOAL3-GA-CERTIFICATION-REVIEW-0294-ROUTE",
      actor: "goal3-task294 route token=plain-token proof_success GA certified can_certify_ga=true",
      operational_readiness_review_id: routeReadiness.operational_readiness_review_id,
      operational_readiness_review_path: routeReadiness.operational_readiness_review_path,
      operational_readiness_review_sha256: routeReadiness.operational_readiness_review_artifact.sha256
    }
  });
  assert.equal(routeResponse.status, 200);
  assert.equal(routeResponse.body.ga_certification_review.ok, false);
  assert.equal(routeResponse.body.ga_certification_review.can_certify_ga, false);
  assert.equal(
    routeResponse.body.ga_certification_review.blocker_reasons.includes(
      "positive_matrix_release_candidate_proof_breadth_incomplete"
    ),
    true
  );

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (entry) =>
        entry.event_type === "release.goal3_ga_certification_review_recorded" &&
        entry.payload.ga_certification_review_id === "GOAL3-GA-CERTIFICATION-REVIEW-0294-ROUTE" &&
        entry.payload.can_certify_ga === false
    ),
    true,
    "Task294 GA certification review must emit a non-authoritative provenance audit event"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task294 service-owned GA certification review tests passed.");
