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
  recordGoal3FinalGaAudit,
  recordGoal3GaCertificationReview,
  recordGoal3GaOperationalReadinessReview
} = comath;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task296-final-ga-audit-"));
const init = initProject({ name: "Goal 3 Task296 final GA audit", root_path: projectRoot });
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
    actor: "goal3-task296 transport closure reviewer",
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
    actor: "goal3-task296 operational readiness source",
    transport_closure_review_id: transport.body.transport_closure_review_id,
    transport_closure_review_path: transport.path,
    transport_closure_review_sha256: transport.sha256,
    adapter_os_isolation_review_id: adapter.body.review_id,
    adapter_os_isolation_review_path: adapter.path,
    adapter_os_isolation_review_sha256: adapter.sha256,
    ...overrides
  });
}

function createCertificationReview(id, overrides = {}) {
  const readiness = createOperationalReadinessReview(id);
  return recordGoal3GaCertificationReview(projectRoot, {
    project_id: projectId,
    ga_certification_review_id: `GOAL3-GA-CERTIFICATION-REVIEW-${id}`,
    actor: "goal3-task296 certification source",
    operational_readiness_review_id: readiness.operational_readiness_review_id,
    operational_readiness_review_path: readiness.operational_readiness_review_path,
    operational_readiness_review_sha256: readiness.operational_readiness_review_artifact.sha256,
    ...overrides
  });
}

try {
  assert.equal(typeof recordGoal3FinalGaAudit, "function", "Task296 must export a service-owned final GA audit gate");
  assert.equal(
    getComathdStatus().capabilities.includes("goal3_final_ga_audit_gate"),
    true,
    "Task296 capability ledger must advertise the final GA audit gate without claiming certification"
  );

  const certification = createCertificationReview("0296-READY");
  const audit = recordGoal3FinalGaAudit(projectRoot, {
    project_id: projectId,
    final_ga_audit_id: "GOAL3-FINAL-GA-AUDIT-0296",
    actor: "goal3-task296 auditor token=plain-token proof_success GA certified can_certify_ga=true",
    ga_certification_review_id: certification.ga_certification_review_id,
    ga_certification_review_path: certification.ga_certification_review_path,
    ga_certification_review_sha256: certification.ga_certification_review_artifact.sha256
  });

  assert.equal(audit.schema_version, "comath.goal3_final_ga_audit.v1");
  assert.equal(audit.ok, false, "Task296 must fail closed while proof breadth is incomplete");
  assert.equal(audit.final_ga_audit_status, "blocked_release_candidate_proof_breadth_incomplete");
  assert.equal(audit.ga_certification_review_current, true);
  assert.equal(audit.ga_certification_status, "blocked_release_candidate_ga_certification_prerequisites");
  assert.equal(audit.operational_readiness_review_current, true);
  assert.equal(audit.acceptance_report_current, true);
  assert.equal(audit.final_ga_audit_available, true, "Task296 should replace missing final-audit evidence with a blocked audit artifact");
  assert.equal(audit.final_ga_audit_passed, false);
  assert.equal(audit.positive_matrix_total_required_tasks, 100);
  assert.equal(audit.proof_breadth_status, "blocked_positive_matrix_release_candidate_proof_breadth_incomplete");
  assert.equal(audit.blocker_reasons.includes("positive_matrix_release_candidate_proof_breadth_incomplete"), true);
  assert.equal(audit.blocker_reasons.includes("ga_certification_review_not_ready_to_certify"), true);
  assert.equal(audit.proof_authority, "none");
  assert.equal(audit.can_promote_claim, false);
  assert.equal(audit.can_certify_ga, false);
  assert.equal(audit.ga_certificate_available, false);
  assert.equal(JSON.stringify(audit).includes(projectRoot), false);
  assert.doesNotMatch(JSON.stringify(audit), secretTerms);
  assert.doesNotMatch(JSON.stringify(audit), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(audit), gaOverclaimTerms);
  assert.equal(existsSync(join(projectRoot, audit.final_ga_audit_path)), true);
  const persisted = readJson(audit.final_ga_audit_path);
  assert.equal(persisted.final_ga_audit_artifact, undefined, "persisted final audit must not self-hash recursively");

  assert.throws(
    () =>
      recordGoal3FinalGaAudit(projectRoot, {
        project_id: projectId,
        final_ga_audit_id: "GOAL3-FINAL-GA-AUDIT-0296-NONCANONICAL",
        ga_certification_review_id: certification.ga_certification_review_id,
        ga_certification_review_path: join(projectRoot, certification.ga_certification_review_path),
        ga_certification_review_sha256: certification.ga_certification_review_artifact.sha256
      }),
    { code: "GOAL3_FINAL_GA_AUDIT_INVALID" },
    "Task296 must reject non-canonical certification-review paths before final audit"
  );

  assert.throws(
    () =>
      recordGoal3FinalGaAudit(projectRoot, {
        project_id: projectId,
        final_ga_audit_id: "GOAL3-FINAL-GA-AUDIT-0296-STALE",
        ga_certification_review_id: certification.ga_certification_review_id,
        ga_certification_review_path: certification.ga_certification_review_path,
        ga_certification_review_sha256: "0".repeat(64)
      }),
    { code: "GOAL3_FINAL_GA_AUDIT_STALE" },
    "Task296 must reject stale certification-review hashes before final audit"
  );

  const tamperedAcceptance = createCertificationReview("0296-TAMPERED-ACCEPTANCE");
  const acceptanceBody = readJson(tamperedAcceptance.acceptance_report_path);
  acceptanceBody.positive_matrix.remaining_matrix_blocker.can_promote_claim = true;
  writeJson(tamperedAcceptance.acceptance_report_path, acceptanceBody);
  assert.throws(
    () =>
      recordGoal3FinalGaAudit(projectRoot, {
        project_id: projectId,
        final_ga_audit_id: "GOAL3-FINAL-GA-AUDIT-0296-TAMPERED-ACCEPTANCE",
        ga_certification_review_id: tamperedAcceptance.ga_certification_review_id,
        ga_certification_review_path: tamperedAcceptance.ga_certification_review_path,
        ga_certification_review_sha256: tamperedAcceptance.ga_certification_review_artifact.sha256
      }),
    { code: "GOAL3_FINAL_GA_AUDIT_STALE" },
    "Task296 must re-read and hash-check the Task294 acceptance support artifact"
  );

  const promotional = createCertificationReview("0296-PROMO");
  const promotionalBody = readJson(promotional.ga_certification_review_path);
  promotionalBody.can_certify_ga = true;
  const promotionalArtifact = writeJson(promotional.ga_certification_review_path, promotionalBody);
  assert.throws(
    () =>
      recordGoal3FinalGaAudit(projectRoot, {
        project_id: projectId,
        final_ga_audit_id: "GOAL3-FINAL-GA-AUDIT-0296-PROMO",
        ga_certification_review_id: promotional.ga_certification_review_id,
        ga_certification_review_path: promotional.ga_certification_review_path,
        ga_certification_review_sha256: promotionalArtifact.sha256
      }),
    { code: "GOAL3_FINAL_GA_AUDIT_INVALID" },
    "Task296 must reject promotional certification-review material even when hash-current"
  );

  const mismatchedSupportPath = createCertificationReview("0296-MISMATCHED-SUPPORT-PATH");
  const mismatchedSupportPathBody = readJson(mismatchedSupportPath.ga_certification_review_path);
  mismatchedSupportPathBody.operational_readiness_review_path =
    ".comath/release/goal3-ga-operational-readiness/GOAL3-GA-OPERATIONAL-READINESS-0296-FORGED/review.json";
  const mismatchedSupportPathArtifact = writeJson(
    mismatchedSupportPath.ga_certification_review_path,
    mismatchedSupportPathBody
  );
  assert.throws(
    () =>
      recordGoal3FinalGaAudit(projectRoot, {
        project_id: projectId,
        final_ga_audit_id: "GOAL3-FINAL-GA-AUDIT-0296-MISMATCHED-SUPPORT-PATH",
        ga_certification_review_id: mismatchedSupportPath.ga_certification_review_id,
        ga_certification_review_path: mismatchedSupportPath.ga_certification_review_path,
        ga_certification_review_sha256: mismatchedSupportPathArtifact.sha256
      }),
    { code: "GOAL3_FINAL_GA_AUDIT_INVALID" },
    "Task296 must reject Task294 reviews whose scalar support path disagrees with the artifact reference"
  );

  const wrongSupportKind = createCertificationReview("0296-WRONG-SUPPORT-KIND");
  const wrongSupportKindBody = readJson(wrongSupportKind.ga_certification_review_path);
  wrongSupportKindBody.acceptance_report_artifact.kind = "caller_supplied_final_ga_certificate";
  const wrongSupportKindArtifact = writeJson(wrongSupportKind.ga_certification_review_path, wrongSupportKindBody);
  assert.throws(
    () =>
      recordGoal3FinalGaAudit(projectRoot, {
        project_id: projectId,
        final_ga_audit_id: "GOAL3-FINAL-GA-AUDIT-0296-WRONG-SUPPORT-KIND",
        ga_certification_review_id: wrongSupportKind.ga_certification_review_id,
        ga_certification_review_path: wrongSupportKind.ga_certification_review_path,
        ga_certification_review_sha256: wrongSupportKindArtifact.sha256
      }),
    { code: "GOAL3_FINAL_GA_AUDIT_INVALID" },
    "Task296 must reject Task294 support artifact references with the wrong artifact kind"
  );

  const wrongSupportSize = createCertificationReview("0296-WRONG-SUPPORT-SIZE");
  const wrongSupportSizeBody = readJson(wrongSupportSize.ga_certification_review_path);
  wrongSupportSizeBody.acceptance_report_artifact.size_bytes += 1;
  const wrongSupportSizeArtifact = writeJson(wrongSupportSize.ga_certification_review_path, wrongSupportSizeBody);
  assert.throws(
    () =>
      recordGoal3FinalGaAudit(projectRoot, {
        project_id: projectId,
        final_ga_audit_id: "GOAL3-FINAL-GA-AUDIT-0296-WRONG-SUPPORT-SIZE",
        ga_certification_review_id: wrongSupportSize.ga_certification_review_id,
        ga_certification_review_path: wrongSupportSize.ga_certification_review_path,
        ga_certification_review_sha256: wrongSupportSizeArtifact.sha256
      }),
    { code: "GOAL3_FINAL_GA_AUDIT_STALE" },
    "Task296 must reject Task294 support artifact references whose recorded size does not match disk"
  );

  const routeCertification = createCertificationReview("0296-ROUTE");
  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/goal3/final-ga-audit",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      final_ga_audit_id: "GOAL3-FINAL-GA-AUDIT-0296-ROUTE",
      actor: "goal3-task296 route token=plain-token proof_success GA certified can_certify_ga=true",
      ga_certification_review_id: routeCertification.ga_certification_review_id,
      ga_certification_review_path: routeCertification.ga_certification_review_path,
      ga_certification_review_sha256: routeCertification.ga_certification_review_artifact.sha256
    }
  });
  assert.equal(routeResponse.status, 200);
  assert.equal(routeResponse.body.final_ga_audit.ok, false);
  assert.equal(routeResponse.body.final_ga_audit.can_certify_ga, false);
  assert.equal(
    routeResponse.body.final_ga_audit.blocker_reasons.includes(
      "positive_matrix_release_candidate_proof_breadth_incomplete"
    ),
    true
  );

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (entry) =>
        entry.event_type === "release.goal3_final_ga_audit_recorded" &&
        entry.payload.final_ga_audit_id === "GOAL3-FINAL-GA-AUDIT-0296-ROUTE" &&
        entry.payload.can_certify_ga === false
    ),
    true,
    "Task296 final GA audit must emit a non-authoritative provenance audit event"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task296 service-owned final GA audit tests passed.");
