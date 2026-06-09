import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as comath from "../../dist/index.js";

const {
  createComathServer,
  createGoal3GaPositiveTaskManifest,
  initProject,
  readAuditEvents,
  recordGoal3FinalGaAudit,
  recordGoal3GaCertificationReview,
  recordGoal3GaOperationalReadinessReview,
  recordGoal3ReleaseCandidateProofBreadthClosure
} = comath;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task302-ga-cert-final-audit-"));
const init = initProject({ name: "Goal 3 Task302 certification final audit binding", root_path: projectRoot });
const projectId = init.project.project_id;
const evidenceClasses = [
  "lean_run_manifest_v3",
  "final_replay_manifest_v3",
  "structured_audit",
  "dependency_closure",
  "axiom_profile",
  "statement_check",
  "third_party_replay_pack",
  "formal_spec_lock_binding",
  "assumption_ledger_binding",
  "dependency_lock_binding",
  "artifact_hash_binding",
  "toolchain_hash_binding",
  "replay_manifest_hash_binding"
];
const secretTerms = /Authorization:\s*Bearer|api_key|token=|plain-token|\bsk-[A-Za-z0-9_-]+/i;
const gaOverclaimTerms = /GA certified|can_certify_ga\s*[:=]\s*(?:true|1)|can_promote_claim\s*[:=]\s*(?:true|1)/i;

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

function writeTransportClosureReview(id) {
  const path = `.comath/release/pi-codex-lifecycle/${id}/operator-service-transport-closure-review.json`;
  return writeJson(path, {
    schema_version: "comath.pi_codex_operator_service_transport_closure_review.v1",
    transport_closure_review_id: id,
    project_id: projectId,
    actor: "goal3-task302 transport closure reviewer",
    created_at: "2026-06-10T00:00:00.000Z",
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
    ga_certification_gate_separate: true
  });
}

function writeAdapterOsIsolationReadiness(id) {
  const path = `.comath/release/agent-adapter-os-isolation/${id}/review.json`;
  return writeJson(path, {
    schema_version: "comath.agent_adapter_os_isolation_readiness.v1",
    review_id: id,
    project_id: projectId,
    adapter_id: "codex-cli",
    backend: "external",
    created_at: "2026-06-10T00:00:00.000Z",
    ok: true,
    readiness_status: "ready_for_os_isolation_release_review",
    review_path: path,
    evidence_artifact: artifact(
      "agent_adapter_os_isolation_evidence",
      `.comath/release/agent-adapter-os-isolation/${id}/evidence.json`,
      "e"
    ),
    checks: {
      evidence_artifact_bound: { ok: true, observed: "bound" },
      provider_os_enforced: { ok: true, observed: "oci_container" },
      production_helper_source: { ok: true, observed: "operator_configured_provider_helper" },
      non_authority: { ok: true, observed: true }
    },
    adapter_execution_isolation: {
      required_for_ga: true,
      current_boundary: "os_enforced",
      os_enforced: true,
      provider: "oci_container",
      production_helper_configured: true,
      helper_profile_source: "operator_configured_provider_helper",
      bundled_protocol_asset: false,
      claims_runtime_enforcement: false,
      proof_authority: "none"
    },
    vetoes: [],
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  });
}

function createOperationalReadinessReview(id) {
  const transport = writeTransportClosureReview(`LIFE-TRANSPORT-CLOSURE-REVIEW-${id}`);
  const adapter = writeAdapterOsIsolationReadiness(`ADAPTER-OSISO-${id}`);
  return recordGoal3GaOperationalReadinessReview(projectRoot, {
    project_id: projectId,
    operational_readiness_review_id: `GOAL3-GA-OPERATIONAL-READINESS-${id}`,
    actor: "goal3-task302 operational readiness source",
    transport_closure_review_id: transport.body.transport_closure_review_id,
    transport_closure_review_path: transport.path,
    transport_closure_review_sha256: transport.sha256,
    adapter_os_isolation_review_id: adapter.body.review_id,
    adapter_os_isolation_review_path: adapter.path,
    adapter_os_isolation_review_sha256: adapter.sha256
  });
}

function createCertificationReview(id, operational, overrides = {}) {
  return recordGoal3GaCertificationReview(projectRoot, {
    project_id: projectId,
    ga_certification_review_id: `GOAL3-GA-CERTIFICATION-REVIEW-${id}`,
    actor: "goal3-task302 certification source token=plain-token GA certified can_certify_ga=true",
    operational_readiness_review_id: operational.operational_readiness_review_id,
    operational_readiness_review_path: operational.operational_readiness_review_path,
    operational_readiness_review_sha256: operational.operational_readiness_review_artifact.sha256,
    ...overrides
  });
}

function packagingPath(taskId) {
  return `.comath/release/positive_matrix/${taskId}/final_authority_packaging_report_v3.json`;
}

function verifiedPackagingReport(taskId) {
  return {
    schema_version: "comath.final_authority_packaging.v3",
    binding_scope: "positive_matrix",
    task_id: taskId,
    claim_id: `C-${taskId}`,
    final_evidence_status: "verified_final_authority_evidence",
    blocker_code: "",
    blocker_detail: `${taskId} verified by task-local Lean Authority v3 evidence.`,
    missing_final_evidence_classes: [],
    lean_run_manifest_paths: [`.comath/evidence/${taskId}/lean/run.manifest.json`],
    final_replay_manifest_v3_path: `.comath/evidence/${taskId}/lean/final_replay_manifest_v3.json`,
    structured_audit_path: `.comath/evidence/${taskId}/lean/structured_audit.json`,
    dependency_closure_path: `.comath/evidence/${taskId}/lean/dependency_closure.json`,
    axiom_profile_path: `.comath/evidence/${taskId}/lean/axiom_profile.json`,
    statement_check_path: `.comath/evidence/${taskId}/lean/statement_equivalence.json`,
    third_party_replay_pack_path: `.comath/evidence/${taskId}/lean/replay_pack`,
    source_verification: {
      verification_basis: "project_local_artifacts",
      caller_success_metadata_trusted: false,
      verified_final_evidence_classes: evidenceClasses,
      missing_final_evidence_classes: [],
      lean_run_manifest_paths_checked: 1
    },
    blocker_path: "",
    packaging_report_path: packagingPath(taskId),
    source_packaging_report_path: `.comath/release/positive_matrix/${taskId}/derived_final_authority_bindings_v3.json`,
    proof_authority: "lean_kernel_clean_replay",
    can_promote_claim: false,
    promotion_requires_gate: true
  };
}

function writeAllVerifiedPackagingReports() {
  for (const task of createGoal3GaPositiveTaskManifest().tasks) {
    writeJson(packagingPath(task.task_id), verifiedPackagingReport(task.task_id));
  }
}

function createPassedFinalAudit(id, operational) {
  const initialCertification = createCertificationReview(`${id}-INITIAL`, operational);
  writeAllVerifiedPackagingReports();
  const closure = recordGoal3ReleaseCandidateProofBreadthClosure(projectRoot, {
    project_id: projectId,
    proof_breadth_closure_id: `GOAL3-PROOF-BREADTH-CLOSURE-${id}`
  });
  return {
    closure,
    finalAudit: recordGoal3FinalGaAudit(projectRoot, {
      project_id: projectId,
      final_ga_audit_id: `GOAL3-FINAL-GA-AUDIT-${id}`,
      actor: "goal3-task302 final audit source",
      ga_certification_review_id: initialCertification.ga_certification_review_id,
      ga_certification_review_path: initialCertification.ga_certification_review_path,
      ga_certification_review_sha256: initialCertification.ga_certification_review_artifact.sha256,
      proof_breadth_closure_id: closure.proof_breadth_closure_id,
      proof_breadth_closure_path: closure.proof_breadth_closure_path,
      proof_breadth_closure_sha256: closure.proof_breadth_closure_artifact.sha256
    })
  };
}

try {
  const operational = createOperationalReadinessReview("0302");
  const baseline = createCertificationReview("0302-NO-FINAL-AUDIT", operational);
  assert.equal(baseline.ok, false);
  assert.equal(baseline.ga_certification_status, "blocked_release_candidate_ga_certification_prerequisites");
  assert.equal(baseline.final_ga_audit_available, false);

  const { finalAudit } = createPassedFinalAudit("0302-PASS", operational);
  assert.equal(finalAudit.final_ga_audit_passed, true);
  const readyReview = createCertificationReview("0302-READY", operational, {
    final_ga_audit_id: finalAudit.final_ga_audit_id,
    final_ga_audit_path: finalAudit.final_ga_audit_path,
    final_ga_audit_sha256: finalAudit.final_ga_audit_artifact.sha256
  });
  assert.equal(readyReview.ok, true);
  assert.equal(readyReview.ga_certification_status, "ready_for_ga_certificate_gate");
  assert.deepEqual(readyReview.blocker_reasons, []);
  assert.equal(readyReview.final_ga_audit_available, true);
  assert.equal(readyReview.final_ga_audit_passed, true);
  assert.equal(readyReview.final_ga_audit_current, true);
  assert.equal(readyReview.final_ga_audit_artifact.sha256, finalAudit.final_ga_audit_artifact.sha256);
  assert.equal(readyReview.proof_authority, "lean_kernel_clean_replay");
  assert.equal(readyReview.can_promote_claim, false);
  assert.equal(readyReview.can_certify_ga, false);
  assert.equal(readyReview.ga_certificate_available, false);
  assert.equal(readyReview.ga_certification_gate_separate, true);
  assert.equal(JSON.stringify(readyReview).includes(projectRoot), false);
  assert.doesNotMatch(JSON.stringify(readyReview), secretTerms);
  assert.doesNotMatch(JSON.stringify(readyReview), gaOverclaimTerms);
  assert.equal(existsSync(join(projectRoot, readyReview.ga_certification_review_path)), true);
  assert.equal(readJson(readyReview.ga_certification_review_path).ga_certification_review_artifact, undefined);

  const blockedFinalAuditCertification = createCertificationReview("0302-BLOCKED-FINAL-AUDIT-SOURCE", operational);
  const blockedFinalAudit = recordGoal3FinalGaAudit(projectRoot, {
    project_id: projectId,
    final_ga_audit_id: "GOAL3-FINAL-GA-AUDIT-0302-BLOCKED",
    ga_certification_review_id: blockedFinalAuditCertification.ga_certification_review_id,
    ga_certification_review_path: blockedFinalAuditCertification.ga_certification_review_path,
    ga_certification_review_sha256: blockedFinalAuditCertification.ga_certification_review_artifact.sha256
  });
  const blockedByFinalAudit = createCertificationReview("0302-BLOCKED-FINAL-AUDIT", operational, {
    final_ga_audit_id: blockedFinalAudit.final_ga_audit_id,
    final_ga_audit_path: blockedFinalAudit.final_ga_audit_path,
    final_ga_audit_sha256: blockedFinalAudit.final_ga_audit_artifact.sha256
  });
  assert.equal(blockedByFinalAudit.ok, false);
  assert.equal(blockedByFinalAudit.final_ga_audit_available, true);
  assert.equal(blockedByFinalAudit.final_ga_audit_passed, false);
  assert.equal(blockedByFinalAudit.blocker_reasons.includes("final_ga_certification_audit_not_passed"), true);
  assert.equal(blockedByFinalAudit.can_certify_ga, false);

  const tamperedFinalAudit = readJson(finalAudit.final_ga_audit_path);
  tamperedFinalAudit.can_certify_ga = true;
  writeJson(finalAudit.final_ga_audit_path, tamperedFinalAudit);
  assert.throws(
    () =>
      createCertificationReview("0302-TAMPERED-FINAL-AUDIT", operational, {
        final_ga_audit_id: finalAudit.final_ga_audit_id,
        final_ga_audit_path: finalAudit.final_ga_audit_path,
        final_ga_audit_sha256: finalAudit.final_ga_audit_artifact.sha256
      }),
    { code: "GOAL3_GA_CERTIFICATION_REVIEW_STALE" },
    "Task302 certification review must hash-bind the passed final GA audit artifact"
  );

  const { finalAudit: routeFinalAudit } = createPassedFinalAudit("0302-ROUTE", operational);
  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/goal3/ga-certification-review",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      ga_certification_review_id: "GOAL3-GA-CERTIFICATION-REVIEW-0302-ROUTE",
      operational_readiness_review_id: operational.operational_readiness_review_id,
      operational_readiness_review_path: operational.operational_readiness_review_path,
      operational_readiness_review_sha256: operational.operational_readiness_review_artifact.sha256,
      final_ga_audit_id: routeFinalAudit.final_ga_audit_id,
      final_ga_audit_path: routeFinalAudit.final_ga_audit_path,
      final_ga_audit_sha256: routeFinalAudit.final_ga_audit_artifact.sha256
    }
  });
  assert.equal(routeResponse.status, 200);
  assert.equal(routeResponse.body.ga_certification_review.ok, true);
  assert.equal(routeResponse.body.ga_certification_review.can_certify_ga, false);
  assert.equal(routeResponse.body.ga_certification_review.ga_certificate_available, false);

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (entry) =>
        entry.event_type === "release.goal3_ga_certification_review_recorded" &&
        entry.payload.ga_certification_review_id === "GOAL3-GA-CERTIFICATION-REVIEW-0302-ROUTE" &&
        entry.payload.final_ga_audit_artifact_sha256 === routeFinalAudit.final_ga_audit_artifact.sha256 &&
        entry.payload.can_certify_ga === false
    ),
    true,
    "Task302 certification review must emit final-audit-bound non-certifying provenance"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task302 GA certification final-audit binding tests passed.");
