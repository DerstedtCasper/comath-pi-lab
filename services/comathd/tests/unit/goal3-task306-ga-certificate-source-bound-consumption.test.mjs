import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import * as comath from "../../dist/index.js";

const {
  createComathServer,
  getComathdStatus,
  initProject,
  readAuditEvents,
  recordGoal3GaCertificateConsumptionReview
} = comath;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task306-ga-certificate-consumption-"));
const init = initProject({
  name: "Goal 3 Task306 GA certificate source-bound consumption gate",
  root_path: projectRoot
});
const projectId = init.project.project_id;
const secretTerms = /Authorization:\s*Bearer|api_key|token=|plain-token|\bsk-[A-Za-z0-9_-]+/i;
const proofClaimTerms = /\b(can_promote_claim\s*[:=]\s*(?:true|1)|formally_checked|completed_formal_proof)\b/i;

function repoFile(relativePath) {
  const here = dirname(fileURLToPath(import.meta.url));
  return readFileSync(join(here, "../../../..", relativePath), "utf8");
}

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

function artifactFrom(written, kind) {
  return {
    kind,
    path: written.path,
    sha256: written.sha256,
    size_bytes: written.size_bytes
  };
}

function proofBreadthClosureBody(id, path) {
  return {
    schema_version: "comath.goal3_release_candidate_proof_breadth_closure.v1",
    proof_breadth_closure_id: id,
    project_id: projectId,
    actor: "goal3-task306 proof breadth closure source",
    created_at: "2026-06-10T00:00:00.000Z",
    ok: true,
    proof_breadth_status: "complete_release_candidate_proof_breadth",
    proof_breadth_closure_path: path,
    requested_closure_mode: "open_formal_workbench_release_candidate_proof_breadth_closure",
    blocker_reasons: [],
    total_required_tasks: 100,
    task_manifest_count: 100,
    verified_task_count: 100,
    missing_task_count: 0,
    blocked_task_count: 0,
    missing_task_ids: [],
    blocked_task_ids: [],
    category_counts: [{ category: "task306-fixture", task_count: 100, verified_task_count: 100, missing_task_count: 0, blocked_task_count: 0 }],
    packaging_report_artifacts: Array.from({ length: 100 }, (_, index) =>
      artifact(
        "final_authority_packaging_report_v3",
        `.comath/release/positive_matrix/PM-${String(index + 1).padStart(3, "0")}/final_authority_packaging_report_v3.json`,
        ((index % 10).toString())
      )
    ),
    proof_breadth_complete: true,
    final_ga_audit_unblocked: true,
    proof_authority: "lean_kernel_clean_replay",
    can_promote_claim: false,
    can_certify_ga: false,
    ga_certification_gate_separate: true
  };
}

function writeProofBreadthClosure(id) {
  const path = `.comath/release/goal3-proof-breadth-closure/${id}/closure.json`;
  return writeJson(path, proofBreadthClosureBody(id, path));
}

function writeOperationalReadiness(id, { sourceBound = true } = {}) {
  const path = `.comath/release/goal3-ga-operational-readiness/${id}/review.json`;
  return writeJson(path, {
    schema_version: "comath.goal3_ga_operational_readiness_review.v1",
    operational_readiness_review_id: id,
    project_id: projectId,
    actor: "goal3-task306 operational readiness source",
    created_at: "2026-06-10T00:00:00.000Z",
    ok: true,
    operational_readiness_status: "ready_for_ga_release_candidate_review",
    operational_readiness_review_path: path,
    requested_review_mode: "open_formal_workbench_ga_operational_readiness",
    blocker_reasons: [],
    transport_closure_review_id: `LIFE-TRANSPORT-CLOSURE-${id}`,
    transport_closure_review_status: "maintained_operator_service_transport_closure_reviewed",
    transport_closure_review_path: `.comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-CLOSURE-${id}/operator-service-transport-closure-review.json`,
    transport_closure_review_artifact: artifact(
      "operator_service_transport_closure_review",
      `.comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-CLOSURE-${id}/operator-service-transport-closure-review.json`,
      "b"
    ),
    transport_closure_review_current: true,
    terminal_unattended_completion_certified: true,
    completion_certificate_available: true,
    unattended_real_host_execution_completed: true,
    maintained_transport_primitive_bound: true,
    service_transport_primitive: "node_http_agent_run_log_session_route",
    client_transport_primitive: "pi_fetch_get_text",
    durable_transport_provided: false,
    live_transport_open: false,
    adapter_os_isolation_review_id: `ADAPTER-OSISO-${id}`,
    adapter_os_isolation_review_path: `.comath/release/agent-adapter-os-isolation/ADAPTER-OSISO-${id}/review.json`,
    adapter_os_isolation_review_artifact: artifact(
      "agent_adapter_os_isolation_readiness",
      `.comath/release/agent-adapter-os-isolation/ADAPTER-OSISO-${id}/review.json`,
      "c"
    ),
    adapter_os_isolation_review_current: true,
    adapter_id: "codex-cli",
    adapter_backend: "external",
    adapter_os_isolation_status: "ready_for_os_isolation_release_review",
    adapter_os_enforced: true,
    adapter_os_isolation_required_for_ga: true,
    ...(sourceBound
      ? {
          adapter_production_helper_source_bound: true,
          adapter_helper_profile_source: "operator_configured_provider_helper",
          adapter_production_helper_configured: true,
          adapter_bundled_protocol_asset: false
        }
      : {}),
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    ga_certification_gate_separate: true
  });
}

function writeAcceptanceReport(id) {
  const path = `.comath/release/goal3-ga-certification/${id}/acceptance-report.json`;
  return writeJson(path, {
    schema_version: "comath.goal3_ga_acceptance.v1",
    proof_authority: "none",
    trust_core_negative_suite: {
      all_required_cases_fail_closed: true,
      missing_required_cases: []
    },
    positive_workflow: {
      result: "representative_verified_fixture",
      can_promote_claim: false,
      lean_run_verification: { ok: true },
      final_replay_verification: { ok: true }
    },
    positive_matrix: {
      total_required_tasks: 100,
      remaining_matrix_blocker: {
        status: "replayable_blocker",
        blocker_code: "ga_positive_100_task_matrix_not_fully_executed",
        can_promote_claim: false
      }
    }
  });
}

function writePassedFinalAudit(id, certificationId, operational, acceptance, closure, overrides = {}) {
  const path = `.comath/release/goal3-final-ga-audit/${id}/audit.json`;
  return writeJson(path, {
    schema_version: "comath.goal3_final_ga_audit.v1",
    final_ga_audit_id: id,
    project_id: projectId,
    actor: "goal3-task306 final audit source",
    created_at: "2026-06-10T00:00:00.000Z",
    ok: true,
    final_ga_audit_status: "passed_release_candidate_final_ga_audit",
    final_ga_audit_path: path,
    requested_audit_mode: "open_formal_workbench_final_ga_audit",
    blocker_reasons: [],
    ga_certification_review_id: certificationId,
    ga_certification_review_path: `.comath/release/goal3-ga-certification/${certificationId}/review.json`,
    ga_certification_review_artifact: artifact(
      "goal3_ga_certification_review",
      `.comath/release/goal3-ga-certification/${certificationId}/review.json`,
      "d"
    ),
    ga_certification_review_current: true,
    ga_certification_status: "blocked_release_candidate_ga_certification_prerequisites",
    operational_readiness_review_id: operational.body.operational_readiness_review_id,
    operational_readiness_review_path: operational.path,
    operational_readiness_review_artifact: artifactFrom(operational, "goal3_ga_operational_readiness_review"),
    operational_readiness_review_current: true,
    acceptance_report_path: acceptance.path,
    acceptance_report_artifact: artifactFrom(acceptance, "goal3_ga_acceptance_report"),
    acceptance_report_current: true,
    trust_core_negative_suite_fail_closed: true,
    positive_workflow_representative_verified: true,
    positive_matrix_total_required_tasks: 100,
    proof_breadth_status: "complete_release_candidate_proof_breadth",
    proof_breadth_blocker_code: "",
    proof_breadth_closure_id: closure.body.proof_breadth_closure_id,
    proof_breadth_closure_path: closure.path,
    proof_breadth_closure_artifact: artifactFrom(closure, "goal3_release_candidate_proof_breadth_closure"),
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

function writeReadyCertificationReview(id, operational, acceptance, finalAudit, overrides = {}) {
  const path = `.comath/release/goal3-ga-certification/${id}/review.json`;
  return writeJson(path, {
    schema_version: "comath.goal3_ga_certification_review.v1",
    ga_certification_review_id: id,
    project_id: projectId,
    actor: "goal3-task306 certification review source",
    created_at: "2026-06-10T00:00:00.000Z",
    ok: true,
    ga_certification_status: "ready_for_ga_certificate_gate",
    ga_certification_review_path: path,
    requested_review_mode: "open_formal_workbench_ga_certification",
    blocker_reasons: [],
    operational_readiness_review_id: operational.body.operational_readiness_review_id,
    operational_readiness_review_path: operational.path,
    operational_readiness_review_artifact: artifactFrom(operational, "goal3_ga_operational_readiness_review"),
    operational_readiness_review_current: true,
    operational_readiness_status: "ready_for_ga_release_candidate_review",
    acceptance_report_path: acceptance.path,
    acceptance_report_artifact: artifactFrom(acceptance, "goal3_ga_acceptance_report"),
    acceptance_report_current: true,
    trust_core_negative_suite_fail_closed: true,
    positive_workflow_representative_verified: true,
    positive_matrix_total_required_tasks: 100,
    positive_matrix_remaining_blocker_status: "replayable_blocker",
    positive_matrix_remaining_blocker_code: "ga_positive_100_task_matrix_not_fully_executed",
    final_ga_audit_available: true,
    final_ga_audit_id: finalAudit.body.final_ga_audit_id,
    final_ga_audit_path: finalAudit.path,
    final_ga_audit_artifact: artifactFrom(finalAudit, "goal3_final_ga_audit"),
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

function writeGaCertificate(id, certificationReview, finalAudit, overrides = {}) {
  const path = `.comath/release/goal3-ga-certificate/${id}/certificate.json`;
  return writeJson(path, {
    schema_version: "comath.goal3_ga_certificate.v1",
    ga_certificate_id: id,
    project_id: projectId,
    actor: "goal3-task306 certificate source",
    created_at: "2026-06-10T00:00:00.000Z",
    ok: true,
    ga_certification_status: "ga_release_candidate_certified",
    ga_certificate_path: path,
    requested_certificate_mode: "open_formal_workbench_ga_certificate",
    ga_certification_review_id: certificationReview.body.ga_certification_review_id,
    ga_certification_review_path: certificationReview.path,
    ga_certification_review_artifact: artifactFrom(certificationReview, "goal3_ga_certification_review"),
    ga_certification_review_current: true,
    final_ga_audit_id: finalAudit.body.final_ga_audit_id,
    final_ga_audit_path: finalAudit.path,
    final_ga_audit_artifact: artifactFrom(finalAudit, "goal3_final_ga_audit"),
    final_ga_audit_current: true,
    final_ga_audit_passed: true,
    ga_certificate_available: true,
    proof_authority: "lean_kernel_clean_replay",
    can_promote_claim: false,
    can_certify_ga: true,
    claim_promotion_requires_ordinary_gate: true,
    ...overrides
  });
}

function writeSourceBoundChain(label, { sourceBound = true } = {}) {
  const operational = writeOperationalReadiness(`GOAL3-GA-OPERATIONAL-READINESS-${label}`, { sourceBound });
  const acceptance = writeAcceptanceReport(`GOAL3-GA-CERTIFICATION-REVIEW-${label}`);
  const closure = writeProofBreadthClosure(`GOAL3-PROOF-BREADTH-CLOSURE-${label}`);
  const finalAudit = writePassedFinalAudit(
    `GOAL3-FINAL-GA-AUDIT-${label}`,
    `GOAL3-GA-CERTIFICATION-REVIEW-${label}`,
    operational,
    acceptance,
    closure
  );
  const certificationReview = writeReadyCertificationReview(
    `GOAL3-GA-CERTIFICATION-REVIEW-${label}`,
    operational,
    acceptance,
    finalAudit
  );
  const certificate = writeGaCertificate(`GOAL3-GA-CERTIFICATE-${label}`, certificationReview, finalAudit);
  return { operational, acceptance, closure, finalAudit, certificationReview, certificate };
}

function rebindOperationalReadiness(chain, operational) {
  const finalAudit = writeJson(chain.finalAudit.path, {
    ...chain.finalAudit.body,
    operational_readiness_review_id: operational.body.operational_readiness_review_id,
    operational_readiness_review_path: operational.path,
    operational_readiness_review_artifact: artifactFrom(operational, "goal3_ga_operational_readiness_review")
  });
  const certificationReview = writeJson(chain.certificationReview.path, {
    ...chain.certificationReview.body,
    operational_readiness_review_id: operational.body.operational_readiness_review_id,
    operational_readiness_review_path: operational.path,
    operational_readiness_review_artifact: artifactFrom(operational, "goal3_ga_operational_readiness_review"),
    final_ga_audit_artifact: artifactFrom(finalAudit, "goal3_final_ga_audit")
  });
  const certificate = writeJson(chain.certificate.path, {
    ...chain.certificate.body,
    ga_certification_review_artifact: artifactFrom(certificationReview, "goal3_ga_certification_review"),
    final_ga_audit_artifact: artifactFrom(finalAudit, "goal3_final_ga_audit")
  });
  return { ...chain, operational, finalAudit, certificationReview, certificate };
}

try {
  assert.equal(
    typeof recordGoal3GaCertificateConsumptionReview,
    "function",
    "Task306 must export a service-owned source-bound GA certificate consumption gate"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("goal3_ga_certificate_source_bound_consumption_gate"),
    true,
    "Task306 capability ledger must advertise source-bound certificate consumption"
  );
  for (const [path, pattern] of [
    ["README.md", /Task306.*certificate.*source-bound.*consumption/s],
    ["TODO.md", /Task306.*certificate.*source-bound.*consumption/s],
    ["REVIEW.md", /Goal 3 Task 306/s],
    ["AGENTS.md", /Task306.*certificate.*source-bound.*consumption/s],
    ["docs/architecture/ga-release-criteria.md", /Task306.*certificate.*source-bound.*consumption/s],
    ["docs/architecture/threat-model.md", /Task306.*certificate.*source-bound.*consumption/s],
    ["docs/architecture/adapter-contracts.md", /Task306.*certificate.*source-bound.*consumption/s],
    ["docs/architecture/acceptance-matrix.md", /Task306.*certificate.*source-bound.*consumption/s]
  ]) {
    assert.match(repoFile(path), pattern, `${path} must document Task306 product-core release closure`);
  }
  assert.equal(
    repoFile("scripts/phase0-smoke.mjs").includes("goal3-task306-ga-certificate-source-bound-consumption.test.mjs"),
    true,
    "phase0 smoke must discover the Task306 focused suite"
  );

  const legacy = writeSourceBoundChain("0306-LEGACY", { sourceBound: false });
  assert.throws(
    () =>
      recordGoal3GaCertificateConsumptionReview(projectRoot, {
        project_id: projectId,
        ga_certificate_consumption_review_id: "GOAL3-GA-CERTIFICATE-CONSUMPTION-0306-LEGACY",
        ga_certificate_id: legacy.certificate.body.ga_certificate_id,
        ga_certificate_path: legacy.certificate.path,
        ga_certificate_sha256: legacy.certificate.sha256
      }),
    { code: "GOAL3_GA_CERTIFICATE_CONSUMPTION_INVALID" },
    "Task306 must reject certificate chains whose operational readiness lacks Task305 source binding"
  );
  assert.equal(
    existsSync(
      join(
        projectRoot,
        ".comath/release/goal3-ga-certificate-consumption/GOAL3-GA-CERTIFICATE-CONSUMPTION-0306-LEGACY/consumption-review.json"
      )
    ),
    false,
    "Task306 must not write a partial consumption artifact for legacy source-less certificate chains"
  );

  const nonCanonical = writeSourceBoundChain("0306-NONCANONICAL");
  const nonCanonicalOperationalPath = `.comath/release/goal3-ga-operational-readiness-noncanonical/${nonCanonical.operational.body.operational_readiness_review_id}/review.json`;
  const nonCanonicalOperational = writeJson(nonCanonicalOperationalPath, {
    ...nonCanonical.operational.body,
    operational_readiness_review_path: nonCanonicalOperationalPath
  });
  const nonCanonicalChain = rebindOperationalReadiness(nonCanonical, nonCanonicalOperational);
  assert.throws(
    () =>
      recordGoal3GaCertificateConsumptionReview(projectRoot, {
        project_id: projectId,
        ga_certificate_consumption_review_id: "GOAL3-GA-CERTIFICATE-CONSUMPTION-0306-NONCANONICAL",
        ga_certificate_id: nonCanonicalChain.certificate.body.ga_certificate_id,
        ga_certificate_path: nonCanonicalChain.certificate.path,
        ga_certificate_sha256: nonCanonicalChain.certificate.sha256
      }),
    { code: "GOAL3_GA_CERTIFICATE_CONSUMPTION_INVALID" },
    "Task306 must recompute the canonical operational-readiness path from its id before consuming a certificate"
  );
  assert.equal(
    existsSync(
      join(
        projectRoot,
        ".comath/release/goal3-ga-certificate-consumption/GOAL3-GA-CERTIFICATE-CONSUMPTION-0306-NONCANONICAL/consumption-review.json"
      )
    ),
    false,
    "Task306 must not write a partial consumption artifact for non-canonical operational-readiness chains"
  );

  const thin = writeSourceBoundChain("0306-THIN-READINESS");
  const thinOperational = writeJson(thin.operational.path, {
    schema_version: "comath.goal3_ga_operational_readiness_review.v1",
    operational_readiness_review_id: thin.operational.body.operational_readiness_review_id,
    project_id: projectId,
    ok: true,
    operational_readiness_status: "ready_for_ga_release_candidate_review",
    operational_readiness_review_path: thin.operational.path,
    adapter_production_helper_source_bound: true,
    adapter_helper_profile_source: "operator_configured_provider_helper",
    adapter_production_helper_configured: true,
    adapter_bundled_protocol_asset: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    ga_certification_gate_separate: true
  });
  const thinChain = rebindOperationalReadiness(thin, thinOperational);
  assert.throws(
    () =>
      recordGoal3GaCertificateConsumptionReview(projectRoot, {
        project_id: projectId,
        ga_certificate_consumption_review_id: "GOAL3-GA-CERTIFICATE-CONSUMPTION-0306-THIN-READINESS",
        ga_certificate_id: thinChain.certificate.body.ga_certificate_id,
        ga_certificate_path: thinChain.certificate.path,
        ga_certificate_sha256: thinChain.certificate.sha256
      }),
    { code: "GOAL3_GA_CERTIFICATE_CONSUMPTION_INVALID" },
    "Task306 must reject thin readiness-shaped artifacts that omit Task292/305 operational boundary fields"
  );
  assert.equal(
    existsSync(
      join(
        projectRoot,
        ".comath/release/goal3-ga-certificate-consumption/GOAL3-GA-CERTIFICATE-CONSUMPTION-0306-THIN-READINESS/consumption-review.json"
      )
    ),
    false,
    "Task306 must not write a partial consumption artifact for thin forged operational-readiness artifacts"
  );

  const ready = writeSourceBoundChain("0306-READY");
  const consumption = recordGoal3GaCertificateConsumptionReview(projectRoot, {
    project_id: projectId,
    ga_certificate_consumption_review_id: "GOAL3-GA-CERTIFICATE-CONSUMPTION-0306-READY",
    actor: "goal3-task306 consumer token=plain-token can_promote_claim=true formally_checked",
    ga_certificate_id: ready.certificate.body.ga_certificate_id,
    ga_certificate_path: ready.certificate.path,
    ga_certificate_sha256: ready.certificate.sha256
  });
  assert.equal(consumption.schema_version, "comath.goal3_ga_certificate_consumption_review.v1");
  assert.equal(consumption.ok, true);
  assert.equal(consumption.ga_certificate_consumed, true);
  assert.equal(consumption.ga_certificate_current, true);
  assert.equal(consumption.ga_certification_review_current, true);
  assert.equal(consumption.final_ga_audit_current, true);
  assert.equal(consumption.proof_breadth_closure_current, true);
  assert.equal(consumption.operational_readiness_review_current, true);
  assert.equal(consumption.adapter_production_helper_source_bound, true);
  assert.equal(consumption.adapter_helper_profile_source, "operator_configured_provider_helper");
  assert.equal(consumption.adapter_production_helper_configured, true);
  assert.equal(consumption.adapter_bundled_protocol_asset, false);
  assert.equal(consumption.can_certify_ga, true);
  assert.equal(consumption.can_promote_claim, false);
  assert.equal(consumption.claim_promotion_requires_ordinary_gate, true);
  assert.equal(consumption.proof_authority, "lean_kernel_clean_replay");
  assert.equal(JSON.stringify(consumption).includes(projectRoot), false);
  assert.doesNotMatch(JSON.stringify(consumption), secretTerms);
  assert.doesNotMatch(consumption.actor, proofClaimTerms);
  const persisted = readJson(consumption.ga_certificate_consumption_review_path);
  assert.equal(persisted.ga_certificate_consumption_review_artifact, undefined);
  assert.equal(persisted.adapter_production_helper_source_bound, true);

  const mixed = writeSourceBoundChain("0306-MIXED");
  const otherOperational = writeOperationalReadiness("GOAL3-GA-OPERATIONAL-READINESS-0306-MIXED-OTHER");
  const tamperedAuditBody = { ...mixed.finalAudit.body };
  tamperedAuditBody.operational_readiness_review_id = otherOperational.body.operational_readiness_review_id;
  tamperedAuditBody.operational_readiness_review_path = otherOperational.path;
  tamperedAuditBody.operational_readiness_review_artifact = artifactFrom(otherOperational, "goal3_ga_operational_readiness_review");
  writeJson(mixed.finalAudit.path, tamperedAuditBody);
  assert.throws(
    () =>
      recordGoal3GaCertificateConsumptionReview(projectRoot, {
        project_id: projectId,
        ga_certificate_consumption_review_id: "GOAL3-GA-CERTIFICATE-CONSUMPTION-0306-MIXED",
        ga_certificate_id: mixed.certificate.body.ga_certificate_id,
        ga_certificate_path: mixed.certificate.path,
        ga_certificate_sha256: mixed.certificate.sha256
      }),
    { code: "GOAL3_GA_CERTIFICATE_CONSUMPTION_STALE" },
    "Task306 must re-read and hash-bind final audit provenance before consuming a certificate"
  );

  const routeChain = writeSourceBoundChain("0306-ROUTE");
  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/goal3/ga-certificate-consumption-review",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      ga_certificate_consumption_review_id: "GOAL3-GA-CERTIFICATE-CONSUMPTION-0306-ROUTE",
      actor: "goal3-task306 route token=plain-token can_promote_claim=true",
      ga_certificate_id: routeChain.certificate.body.ga_certificate_id,
      ga_certificate_path: routeChain.certificate.path,
      ga_certificate_sha256: routeChain.certificate.sha256
    }
  });
  assert.equal(routeResponse.status, 200);
  assert.equal(routeResponse.body.ga_certificate_consumption_review.ga_certificate_consumed, true);
  assert.equal(routeResponse.body.ga_certificate_consumption_review.adapter_production_helper_source_bound, true);
  assert.equal(routeResponse.body.ga_certificate_consumption_review.can_promote_claim, false);

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (entry) =>
        entry.event_type === "release.goal3_ga_certificate_consumption_recorded" &&
        entry.payload.ga_certificate_consumption_review_id === "GOAL3-GA-CERTIFICATE-CONSUMPTION-0306-ROUTE" &&
        entry.payload.ga_certificate_artifact_sha256 === routeChain.certificate.sha256 &&
        entry.payload.ga_certification_review_artifact_sha256 === routeChain.certificationReview.sha256 &&
        entry.payload.final_ga_audit_artifact_sha256 === routeChain.finalAudit.sha256 &&
        entry.payload.proof_breadth_closure_artifact_sha256 === routeChain.closure.sha256 &&
        entry.payload.operational_readiness_review_artifact_sha256 === routeChain.operational.sha256 &&
        entry.payload.adapter_production_helper_source_bound === true &&
        entry.payload.can_promote_claim === false
    ),
    true,
    "Task306 consumption gate must emit full source-bound release-chain provenance"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task306 GA certificate source-bound consumption tests passed.");
