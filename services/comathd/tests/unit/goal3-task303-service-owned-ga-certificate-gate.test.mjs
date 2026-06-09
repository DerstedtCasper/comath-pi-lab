import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as comath from "../../dist/index.js";

const { createComathServer, getComathdStatus, initProject, readAuditEvents, recordGoal3GaCertificate } = comath;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task303-ga-certificate-"));
const init = initProject({ name: "Goal 3 Task303 GA certificate gate", root_path: projectRoot });
const projectId = init.project.project_id;
const secretTerms = /Authorization:\s*Bearer|api_key|token=|plain-token|\bsk-[A-Za-z0-9_-]+/i;
const authorityClaimTerms =
  /\b(clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|kernel_checked|proof_success|GA certified|can_certify_ga\s*[:=]\s*(?:true|1)|can_promote_claim\s*[:=]\s*(?:true|1))\b/i;

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

function artifact(kind, path, fill = "a", size = 1024) {
  return {
    kind,
    path,
    sha256: fill.repeat(64),
    size_bytes: size
  };
}

function writePassedFinalAudit(id, overrides = {}) {
  const path = `.comath/release/goal3-final-ga-audit/${id}/audit.json`;
  return writeJson(path, {
    schema_version: "comath.goal3_final_ga_audit.v1",
    final_ga_audit_id: id,
    project_id: projectId,
    actor: "goal3-task303 final audit source",
    created_at: "2026-06-10T00:00:00.000Z",
    ok: true,
    final_ga_audit_status: "passed_release_candidate_final_ga_audit",
    final_ga_audit_path: path,
    requested_audit_mode: "open_formal_workbench_final_ga_audit",
    blocker_reasons: [],
    ga_certification_review_id: `GOAL3-GA-CERTIFICATION-REVIEW-SOURCE-${id}`,
    ga_certification_review_path:
      `.comath/release/goal3-ga-certification/GOAL3-GA-CERTIFICATION-REVIEW-SOURCE-${id}/review.json`,
    ga_certification_review_artifact: artifact(
      "goal3_ga_certification_review",
      `.comath/release/goal3-ga-certification/GOAL3-GA-CERTIFICATION-REVIEW-SOURCE-${id}/review.json`,
      "b"
    ),
    ga_certification_review_current: true,
    ga_certification_status: "blocked_release_candidate_ga_certification_prerequisites",
    operational_readiness_review_id: `GOAL3-GA-OPERATIONAL-READINESS-${id}`,
    operational_readiness_review_path:
      `.comath/release/goal3-ga-operational-readiness/GOAL3-GA-OPERATIONAL-READINESS-${id}/review.json`,
    operational_readiness_review_artifact: artifact(
      "goal3_ga_operational_readiness_review",
      `.comath/release/goal3-ga-operational-readiness/GOAL3-GA-OPERATIONAL-READINESS-${id}/review.json`,
      "c"
    ),
    operational_readiness_review_current: true,
    acceptance_report_path: `.comath/release/goal3-ga-certification/SUPPORT-${id}/acceptance-report.json`,
    acceptance_report_artifact: artifact(
      "goal3_ga_acceptance_report",
      `.comath/release/goal3-ga-certification/SUPPORT-${id}/acceptance-report.json`,
      "d"
    ),
    acceptance_report_current: true,
    trust_core_negative_suite_fail_closed: true,
    positive_workflow_representative_verified: true,
    positive_matrix_total_required_tasks: 100,
    proof_breadth_status: "complete_release_candidate_proof_breadth",
    proof_breadth_blocker_code: "",
    proof_breadth_closure_id: `GOAL3-PROOF-BREADTH-CLOSURE-${id}`,
    proof_breadth_closure_path: `.comath/release/goal3-proof-breadth-closure/GOAL3-PROOF-BREADTH-CLOSURE-${id}/closure.json`,
    proof_breadth_closure_artifact: artifact(
      "goal3_release_candidate_proof_breadth_closure",
      `.comath/release/goal3-proof-breadth-closure/GOAL3-PROOF-BREADTH-CLOSURE-${id}/closure.json`,
      "e"
    ),
    proof_breadth_closure_current: true,
    final_ga_audit_available: true,
    final_ga_audit_passed: true,
    ga_certificate_available: false,
    proof_authority: "lean_kernel_clean_replay",
    can_promote_claim: false,
    can_certify_ga: false,
    ga_certification_gate_separate: true,
    ...overrides
  });
}

function writeReadyCertificationReview(id, finalAudit, overrides = {}) {
  const path = `.comath/release/goal3-ga-certification/${id}/review.json`;
  return writeJson(path, {
    schema_version: "comath.goal3_ga_certification_review.v1",
    ga_certification_review_id: id,
    project_id: projectId,
    actor: "goal3-task303 ready review source token=plain-token GA certified can_certify_ga=true",
    created_at: "2026-06-10T00:00:00.000Z",
    ok: true,
    ga_certification_status: "ready_for_ga_certificate_gate",
    ga_certification_review_path: path,
    requested_review_mode: "open_formal_workbench_ga_certification",
    blocker_reasons: [],
    operational_readiness_review_id: `GOAL3-GA-OPERATIONAL-READINESS-${id}`,
    operational_readiness_review_path:
      `.comath/release/goal3-ga-operational-readiness/GOAL3-GA-OPERATIONAL-READINESS-${id}/review.json`,
    operational_readiness_review_artifact: artifact(
      "goal3_ga_operational_readiness_review",
      `.comath/release/goal3-ga-operational-readiness/GOAL3-GA-OPERATIONAL-READINESS-${id}/review.json`,
      "f"
    ),
    operational_readiness_review_current: true,
    operational_readiness_status: "ready_for_ga_release_candidate_review",
    acceptance_report_path: `.comath/release/goal3-ga-certification/${id}/acceptance-report.json`,
    acceptance_report_artifact: artifact(
      "goal3_ga_acceptance_report",
      `.comath/release/goal3-ga-certification/${id}/acceptance-report.json`,
      "0"
    ),
    acceptance_report_current: true,
    trust_core_negative_suite_fail_closed: true,
    positive_workflow_representative_verified: true,
    positive_matrix_total_required_tasks: 100,
    positive_matrix_remaining_blocker_status: "replayable_blocker",
    positive_matrix_remaining_blocker_code: "ga_positive_100_task_matrix_not_fully_executed",
    final_ga_audit_available: true,
    final_ga_audit_id: finalAudit.body.final_ga_audit_id,
    final_ga_audit_path: finalAudit.path,
    final_ga_audit_artifact: {
      kind: "goal3_final_ga_audit",
      path: finalAudit.path,
      sha256: finalAudit.sha256,
      size_bytes: finalAudit.size_bytes
    },
    final_ga_audit_current: true,
    final_ga_audit_passed: true,
    ga_certificate_available: false,
    proof_authority: "lean_kernel_clean_replay",
    can_promote_claim: false,
    can_certify_ga: false,
    ga_certification_gate_separate: true,
    ...overrides
  });
}

try {
  assert.equal(typeof recordGoal3GaCertificate, "function", "Task303 must export a service-owned GA certificate gate");
  assert.equal(
    getComathdStatus().capabilities.includes("goal3_ga_certificate_gate"),
    true,
    "Task303 capability ledger must advertise the GA certificate gate"
  );

  const finalAudit = writePassedFinalAudit("GOAL3-FINAL-GA-AUDIT-0303");
  const readyReview = writeReadyCertificationReview("GOAL3-GA-CERTIFICATION-REVIEW-0303", finalAudit);
  const certificate = recordGoal3GaCertificate(projectRoot, {
    project_id: projectId,
    ga_certificate_id: "GOAL3-GA-CERTIFICATE-0303",
    actor: "goal3-task303 certificate issuer token=plain-token GA certified can_certify_ga=true formal_replay_passed",
    ga_certification_review_id: readyReview.body.ga_certification_review_id,
    ga_certification_review_path: readyReview.path,
    ga_certification_review_sha256: readyReview.sha256
  });
  assert.equal(certificate.schema_version, "comath.goal3_ga_certificate.v1");
  assert.equal(certificate.ok, true);
  assert.equal(certificate.ga_certification_status, "ga_release_candidate_certified");
  assert.equal(certificate.ga_certificate_available, true);
  assert.equal(certificate.ga_certification_review_current, true);
  assert.equal(certificate.final_ga_audit_current, true);
  assert.equal(certificate.final_ga_audit_artifact.sha256, finalAudit.sha256);
  assert.equal(certificate.proof_authority, "lean_kernel_clean_replay");
  assert.equal(certificate.can_promote_claim, false);
  assert.equal(certificate.can_certify_ga, true);
  assert.equal(certificate.claim_promotion_requires_ordinary_gate, true);
  assert.equal(JSON.stringify(certificate).includes(projectRoot), false);
  assert.doesNotMatch(JSON.stringify(certificate), secretTerms);
  assert.doesNotMatch(certificate.actor, authorityClaimTerms);
  assert.equal(existsSync(join(projectRoot, certificate.ga_certificate_path)), true);
  assert.equal(readJson(certificate.ga_certificate_path).ga_certificate_artifact, undefined);

  const blockedFinalAudit = writePassedFinalAudit("GOAL3-FINAL-GA-AUDIT-0303-BLOCKED", {
    ok: false,
    final_ga_audit_status: "blocked_release_candidate_proof_breadth_incomplete",
    blocker_reasons: ["positive_matrix_release_candidate_proof_breadth_incomplete"],
    proof_breadth_status: "blocked_positive_matrix_release_candidate_proof_breadth_incomplete",
    proof_breadth_blocker_code: "ga_positive_100_task_matrix_not_fully_executed",
    proof_breadth_closure_current: undefined,
    proof_breadth_closure_artifact: undefined,
    final_ga_audit_passed: false,
    proof_authority: "none"
  });
  const blockedReview = writeReadyCertificationReview("GOAL3-GA-CERTIFICATION-REVIEW-0303-BLOCKED", blockedFinalAudit, {
    ok: false,
    ga_certification_status: "blocked_release_candidate_ga_certification_prerequisites",
    blocker_reasons: ["final_ga_certification_audit_not_passed"],
    final_ga_audit_passed: false,
    proof_authority: "none"
  });
  assert.throws(
    () =>
      recordGoal3GaCertificate(projectRoot, {
        project_id: projectId,
        ga_certificate_id: "GOAL3-GA-CERTIFICATE-0303-BLOCKED",
        ga_certification_review_id: blockedReview.body.ga_certification_review_id,
        ga_certification_review_path: blockedReview.path,
        ga_certification_review_sha256: blockedReview.sha256
      }),
    { code: "GOAL3_GA_CERTIFICATE_INVALID" },
    "Task303 must reject certification reviews that are not ready for the certificate gate"
  );

  const mixedIdFinalAuditA = writePassedFinalAudit("GOAL3-FINAL-GA-AUDIT-0303-MIXED-A");
  const mixedIdFinalAuditB = writePassedFinalAudit("GOAL3-FINAL-GA-AUDIT-0303-MIXED-B");
  const mixedIdReview = writeReadyCertificationReview(
    "GOAL3-GA-CERTIFICATION-REVIEW-0303-MIXED",
    mixedIdFinalAuditB,
    {
      final_ga_audit_id: mixedIdFinalAuditA.body.final_ga_audit_id
    }
  );
  assert.throws(
    () =>
      recordGoal3GaCertificate(projectRoot, {
        project_id: projectId,
        ga_certificate_id: "GOAL3-GA-CERTIFICATE-0303-MIXED",
        ga_certification_review_id: mixedIdReview.body.ga_certification_review_id,
        ga_certification_review_path: mixedIdReview.path,
        ga_certification_review_sha256: mixedIdReview.sha256
      }),
    { code: "GOAL3_GA_CERTIFICATE_INVALID" },
    "Task303 must reject certification reviews that mix a final-audit id with another audit artifact path"
  );

  const tamperedFinalAudit = readJson(finalAudit.path);
  tamperedFinalAudit.can_certify_ga = true;
  writeJson(finalAudit.path, tamperedFinalAudit);
  assert.throws(
    () =>
      recordGoal3GaCertificate(projectRoot, {
        project_id: projectId,
        ga_certificate_id: "GOAL3-GA-CERTIFICATE-0303-TAMPERED-FINAL-AUDIT",
        ga_certification_review_id: readyReview.body.ga_certification_review_id,
        ga_certification_review_path: readyReview.path,
        ga_certification_review_sha256: readyReview.sha256
      }),
    { code: "GOAL3_GA_CERTIFICATE_STALE" },
    "Task303 must re-read and hash-check the final GA audit artifact referenced by the ready review"
  );

  const routeFinalAudit = writePassedFinalAudit("GOAL3-FINAL-GA-AUDIT-0303-ROUTE");
  const routeReadyReview = writeReadyCertificationReview("GOAL3-GA-CERTIFICATION-REVIEW-0303-ROUTE", routeFinalAudit);
  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/goal3/ga-certificate",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      ga_certificate_id: "GOAL3-GA-CERTIFICATE-0303-ROUTE",
      ga_certification_review_id: routeReadyReview.body.ga_certification_review_id,
      ga_certification_review_path: routeReadyReview.path,
      ga_certification_review_sha256: routeReadyReview.sha256
    }
  });
  assert.equal(routeResponse.status, 200);
  assert.equal(routeResponse.body.ga_certificate.ok, true);
  assert.equal(routeResponse.body.ga_certificate.can_certify_ga, true);
  assert.equal(routeResponse.body.ga_certificate.can_promote_claim, false);

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (entry) =>
        entry.event_type === "release.goal3_ga_certificate_recorded" &&
        entry.payload.ga_certificate_id === "GOAL3-GA-CERTIFICATE-0303-ROUTE" &&
        entry.payload.ga_certification_review_artifact_sha256 === routeReadyReview.sha256 &&
        entry.payload.final_ga_audit_artifact_sha256 === routeFinalAudit.sha256 &&
        entry.payload.can_certify_ga === true
    ),
    true,
    "Task303 GA certificate gate must emit review/final-audit-bound provenance"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task303 service-owned GA certificate gate tests passed.");
