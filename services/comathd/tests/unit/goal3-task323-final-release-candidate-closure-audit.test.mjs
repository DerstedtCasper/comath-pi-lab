import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import {
  createComathServer,
  getComathdStatus,
  initProject,
  readAuditEvents,
  recordGoal3FinalReleaseCandidateClosureAudit
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task323-final-candidate-audit-"));
const init = initProject({
  name: "Goal 3 Task323 final release-candidate closure audit",
  root_path: projectRoot
});
const projectId = init.project.project_id;
const secretTerms = /Authorization:\s*Bearer|api_key|token=|plain-token|sk-/i;
const proofAuthorityTerms =
  /completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|kernel_checked|proof_success/i;
const forbiddenCertificateTerms =
  /release_candidate_closure_audit_is_certificate"\s*:\s*true|ga_certificate_issued"\s*:\s*true/i;

function repoFile(relativePath) {
  const here = dirname(fileURLToPath(import.meta.url));
  return readFileSync(join(here, "../../../..", relativePath), "utf8");
}

function sha256Text(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function sha256Buffer(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function writeBuffer(relativePath, bytes) {
  const absolutePath = join(projectRoot, relativePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, bytes);
  return {
    path: relativePath,
    sha256: sha256Buffer(bytes),
    size_bytes: bytes.byteLength
  };
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

function artifactFrom(written, kind) {
  return {
    kind,
    path: written.path,
    sha256: written.sha256,
    size_bytes: written.size_bytes
  };
}

function futureFreshUntil() {
  return new Date(Date.now() + 30 * 60 * 1000).toISOString();
}

function pastFreshUntil() {
  return new Date(Date.now() - 60 * 1000).toISOString();
}

function writeReleaseCandidateChain(id, overrides = {}) {
  const sourceArchive = writeBuffer(
    `.comath/release/source-archives/GOAL3-SOURCE-ARCHIVE-0323-${id}/source.tar`,
    Buffer.from(`goal3 task323 source archive ${id}`, "utf8")
  );
  const sourceArchiveBody = {
    archive_path: sourceArchive.path,
    archive_sha256: sourceArchive.sha256,
    size_bytes: sourceArchive.size_bytes,
    source_only: true,
    includes_runtime_state: false,
    includes_git_dir: false,
    includes_node_modules: false
  };
  const operatorEvidence = writeJson(
    `.comath/release/source-release-operator-evidence/GOAL3-OPERATOR-EVIDENCE-0323-${id}/operator-evidence.json`,
    {
      schema_version: "comath.goal3_source_release_external_provider_verification.v1",
      verification_id: `GOAL3-OPERATOR-EVIDENCE-0323-${id}`,
      project_id: projectId,
      ok: true,
      evidence_kind: "os_immutable_storage",
      source_archive: sourceArchiveBody,
      source_archive_current: true,
      provider_id: `external-os-provider-${id}`,
      receipt_id: `external-os-receipt-${id}`,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  );
  const policyInspectionId = `GOAL3-POLICY-INSPECTION-0323-${id}`;
  const policyInspection = writeJson(
    `.comath/release/goal3-source-release-external-provider-policy-inspection/${policyInspectionId}/policy-inspection.json`,
    {
      schema_version: "comath.goal3_source_release_external_provider_policy_inspection.v1",
      inspection_id: policyInspectionId,
      verification_id: operatorEvidence.body.verification_id,
      verification_sha256: operatorEvidence.sha256,
      verification_artifact: artifactFrom(operatorEvidence, "goal3_source_release_external_provider_verification"),
      project_id: projectId,
      ok: true,
      evidence_kind: "os_immutable_storage",
      operator_evidence_artifact: artifactFrom(operatorEvidence, "goal3_source_release_external_provider_verification"),
      operator_evidence_current: true,
      source_archive: sourceArchiveBody,
      source_archive_current: true,
      provider_id: operatorEvidence.body.provider_id,
      receipt_id: operatorEvidence.body.receipt_id,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  );
  const attestationId = `GOAL3-SOURCE-RELEASE-OS-ATTESTATION-0323-${id}`;
  const attestationPath = `.comath/release/goal3-source-release-os-immutability-attestation/${attestationId}/os-immutability-attestation.json`;
  const attestation = writeJson(attestationPath, {
    schema_version: "comath.goal3_source_release_os_immutability_attestation.v1",
    attestation_id: attestationId,
    project_id: projectId,
    ok: true,
    os_immutability_attestation_status: "os_immutability_attested",
    attestation_path: attestationPath,
    ...(overrides.missingPolicy === true
      ? {}
      : {
          policy_inspection_id: policyInspectionId,
          policy_inspection_path: policyInspection.path,
          policy_inspection_sha256: policyInspection.sha256,
          policy_inspection_artifact: artifactFrom(
            policyInspection,
            "goal3_source_release_external_provider_policy_inspection"
          ),
          policy_inspection_current: true,
          verification_id: operatorEvidence.body.verification_id,
          verification_sha256: operatorEvidence.sha256
        }),
    source_archive: sourceArchiveBody,
    source_archive_current: true,
    evidence_kind: "os_immutable_storage",
    operator_evidence_artifact: artifactFrom(operatorEvidence, "goal3_source_release_external_provider_verification"),
    operator_evidence_current: true,
    provider_os_immutability_attestation_bound: true,
    co_math_os_immutability_enforced: false,
    proof_authority: "none",
    can_restore: false,
    can_promote_claim: false,
    can_certify_ga: false,
    storage_is_proof_authority: false,
    attestation_is_proof_authority: false,
    attestation_is_restore_source: false,
    result_can_be_used_as_proof: false,
    requires_separate_lean_authority: true,
    public_archive_review_ok: true
  });
  const consumptionId = `GOAL3-GA-CERTIFICATE-CONSUMPTION-0323-${id}`;
  const consumptionPath = `.comath/release/goal3-ga-certificate-consumption/${consumptionId}/consumption-review.json`;
  const certificateConsumption = writeJson(consumptionPath, {
    schema_version: "comath.goal3_ga_certificate_consumption_review.v1",
    ga_certificate_consumption_review_id: consumptionId,
    project_id: projectId,
    ok: true,
    release_closure_status: "publishable_workbench_release_candidate_source_bound",
    ga_certificate_consumption_review_path: consumptionPath,
    ga_certificate_current: true,
    ga_certificate_consumed: true,
    final_ga_audit_current: true,
    final_ga_audit_passed: true,
    proof_breadth_complete: true,
    operational_readiness_review_current: true,
    operational_readiness_status: "ready_for_ga_release_candidate_review",
    ga_certificate_available: true,
    proof_authority: "lean_kernel_clean_replay",
    can_promote_claim: false,
    can_certify_ga: true,
    claim_promotion_requires_ordinary_gate: true
  });
  const evidenceId = `GOAL3-EXTERNAL-DURABLE-TRANSPORT-EVIDENCE-0323-${id}`;
  const agentRunId = `ARUN-GOAL3-0323-${id}`;
  const transportContract = writeJson(
    `.comath/release/pi-codex-lifecycle/GOAL3-TASK323-TRANSPORT-CONTRACT-${id}/operator-service-transport-contract.json`,
    {
      schema_version: "comath.pi_codex_operator_service_transport_contract.v1",
      project_id: projectId,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  );
  const transportContinuity = writeJson(
    `.comath/release/pi-codex-lifecycle/GOAL3-TASK323-TRANSPORT-CONTINUITY-${id}/operator-service-transport-continuity.json`,
    {
      schema_version: "comath.pi_codex_operator_service_transport_continuity.v1",
      project_id: projectId,
      transport_contract_artifact: artifactFrom(transportContract, "operator_service_transport_contract"),
      transport_contract_current: true,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  );
  const durableContract = writeJson(
    `.comath/release/pi-codex-lifecycle/GOAL3-TASK323-DURABLE-CONTRACT-${id}/unattended-real-host-durable-transport-contract.json`,
    {
      schema_version: "comath.pi_codex_unattended_real_host_durable_transport_contract.v1",
      project_id: projectId,
      transport_continuity_artifact: artifactFrom(transportContinuity, "operator_service_transport_continuity"),
      transport_continuity_current: true,
      transport_contract_artifact: artifactFrom(transportContract, "operator_service_transport_contract"),
      transport_contract_current: true,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  );
  const terminalCertificate = writeJson(
    `.comath/release/pi-codex-lifecycle/GOAL3-TASK323-TERMINAL-CERT-${id}/terminal-completion-certificate.json`,
    {
      schema_version: "comath.pi_codex_unattended_real_host_terminal_completion_certificate.v1",
      project_id: projectId,
      durable_transport_contract_artifact: artifactFrom(
        durableContract,
        "unattended_real_host_durable_transport_contract"
      ),
      durable_transport_contract_current: true,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  );
  const transportClosure = writeJson(
    `.comath/release/pi-codex-lifecycle/GOAL3-TASK323-TRANSPORT-CLOSURE-${id}/operator-service-transport-closure-review.json`,
    {
      schema_version: "comath.pi_codex_operator_service_transport_closure_review.v1",
      project_id: projectId,
      service_route: `/agent/run/${agentRunId}/log-session`,
      terminal_completion_certificate_artifact: artifactFrom(
        terminalCertificate,
        "unattended_real_host_terminal_completion_certificate"
      ),
      terminal_completion_certificate_current: true,
      durable_transport_contract_artifact: artifactFrom(
        durableContract,
        "unattended_real_host_durable_transport_contract"
      ),
      durable_transport_contract_current: true,
      transport_continuity_artifact: artifactFrom(transportContinuity, "operator_service_transport_continuity"),
      transport_continuity_current: true,
      transport_contract_artifact: artifactFrom(transportContract, "operator_service_transport_contract"),
      transport_contract_current: true,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  );
  const operational = writeJson(
    `.comath/release/goal3-ga-operational-readiness/GOAL3-TASK323-OPERATIONAL-READINESS-${id}/review.json`,
    {
      schema_version: "comath.goal3_ga_operational_readiness_review.v1",
      project_id: projectId,
      ok: true,
      operational_readiness_status: "ready_for_ga_release_candidate_review",
      transport_closure_review_artifact: artifactFrom(transportClosure, "operator_service_transport_closure_review"),
      transport_closure_review_current: true,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  );
  const prerequisiteId = `GOAL3-DURABLE-TRANSPORT-SIGNOFF-PREREQ-0323-${id}`;
  const prerequisitePath = `.comath/release/goal3-durable-transport-release-signoff-prerequisite/${prerequisiteId}/prerequisite.json`;
  const prerequisite = writeJson(prerequisitePath, {
    schema_version: "comath.goal3_durable_transport_release_signoff_prerequisite.v1",
    durable_transport_signoff_prerequisite_id: prerequisiteId,
    project_id: projectId,
    durable_transport_signoff_prerequisite_path: prerequisitePath,
    operational_readiness_review_artifact: artifactFrom(operational, "goal3_ga_operational_readiness_review"),
    operational_readiness_review_current: true,
    transport_closure_review_artifact: artifactFrom(transportClosure, "operator_service_transport_closure_review"),
    transport_closure_review_current: true,
    terminal_completion_certificate_artifact: artifactFrom(
      terminalCertificate,
      "unattended_real_host_terminal_completion_certificate"
    ),
    terminal_completion_certificate_current: true,
    durable_transport_contract_artifact: artifactFrom(
      durableContract,
      "unattended_real_host_durable_transport_contract"
    ),
    durable_transport_contract_current: true,
    transport_continuity_artifact: artifactFrom(transportContinuity, "operator_service_transport_continuity"),
    transport_continuity_current: true,
    transport_contract_artifact: artifactFrom(transportContract, "operator_service_transport_contract"),
    transport_contract_current: true,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  });
  const evidencePath = `.comath/release/goal3-external-durable-transport-evidence/${evidenceId}/external-durable-transport-evidence.json`;
  const externalEvidence = writeJson(evidencePath, {
    schema_version: "comath.goal3_external_durable_transport_evidence.v1",
    external_durable_transport_evidence_id: evidenceId,
    project_id: projectId,
    ok: true,
    evidence_status: "external_durable_transport_primitive_available",
    evidence_path: evidencePath,
    provider_id: `maintained-external-operator-${id}`,
    provider_kind: "maintained_external_operator_transport",
    transport_primitive: "external_reconnectable_operator_session",
    maintenance_source: "external_maintained_primitive",
    daemon_identity_sha256: sha256Text(`daemon-identity-${id}`),
    daemon_policy_sha256: sha256Text(`daemon-policy-${id}`),
    session_policy_sha256: sha256Text(`session-policy-${id}`),
    provider_attestation_sha256: sha256Text(`provider-attestation-${id}`),
    operator_session_id: `operator-session-${id}`,
    agent_run_id: agentRunId,
    service_route: `/agent/run/${agentRunId}/log-session`,
    service_transport_primitive: "node_http_agent_run_log_session_route",
    client_transport_primitive: "pi_fetch_get_text",
    fresh_until: overrides.expiredTransport === true ? pastFreshUntil() : futureFreshUntil(),
    freshness_window_seconds: 3600,
    reconnect_policy: "external_provider_reconnect_required",
    external_durable_transport_primitive_bound: true,
    durable_transport_provided: true,
    live_transport_open: true,
    co_math_transport_stack_built: false,
    co_math_websocket_stack_built: false,
    custom_transport_implementation: false,
    indefinite_stream_open: false,
    long_lived_websocket_provided: false,
    long_lived_sse_provided: false,
    pi_direct_write_allowed: false,
    direct_trusted_state_mutation: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  });
  const verificationId = `GOAL3-DURABLE-TRANSPORT-SIGNOFF-VERIFICATION-0323-${id}`;
  const verificationPath = `.comath/release/goal3-durable-transport-release-signoff-verification/${verificationId}/verification.json`;
  const verification = writeJson(verificationPath, {
    schema_version: "comath.goal3_durable_transport_release_signoff_verification.v1",
    durable_transport_signoff_verification_id: verificationId,
    project_id: projectId,
    ok: true,
    durable_transport_signoff_verification_status: "verified_external_durable_transport_primitive_bound",
    blocker_reasons: [],
    durable_transport_signoff_verification_path: verificationPath,
    durable_transport_signoff_prerequisite_id: prerequisiteId,
    durable_transport_signoff_prerequisite_path: prerequisitePath,
    durable_transport_signoff_prerequisite_artifact: artifactFrom(
      prerequisite,
      "goal3_durable_transport_release_signoff_prerequisite"
    ),
    durable_transport_signoff_prerequisite_current: true,
    durable_transport_signoff_status: "blocked_durable_long_lived_transport_not_provided",
    ...(overrides.missingTransportChain === true
      ? {}
      : {
          operational_readiness_review_artifact: artifactFrom(operational, "goal3_ga_operational_readiness_review"),
          operational_readiness_review_current: true,
          transport_closure_review_artifact: artifactFrom(transportClosure, "operator_service_transport_closure_review"),
          transport_closure_review_current: true,
          terminal_completion_certificate_artifact: artifactFrom(
            terminalCertificate,
            "unattended_real_host_terminal_completion_certificate"
          ),
          terminal_completion_certificate_current: true,
          durable_transport_contract_artifact: artifactFrom(
            durableContract,
            "unattended_real_host_durable_transport_contract"
          ),
          durable_transport_contract_current: true,
          transport_continuity_artifact: artifactFrom(transportContinuity, "operator_service_transport_continuity"),
          transport_continuity_current: true,
          transport_contract_artifact: artifactFrom(transportContract, "operator_service_transport_contract"),
          transport_contract_current: true
        }),
    external_durable_transport_evidence_bound: true,
    external_durable_transport_evidence_id: evidenceId,
    external_durable_transport_evidence_artifact: artifactFrom(
      externalEvidence,
      "goal3_external_durable_transport_evidence"
    ),
    external_durable_transport_evidence_current: true,
    external_durable_transport_primitive_bound: true,
    provider_kind: "maintained_external_operator_transport",
    transport_primitive: "external_reconnectable_operator_session",
    service_route: `/agent/run/${agentRunId}/log-session`,
    fresh_until: externalEvidence.body.fresh_until,
    freshness_window_seconds: externalEvidence.body.freshness_window_seconds,
    service_transport_primitive: "node_http_agent_run_log_session_route",
    client_transport_primitive: "pi_fetch_get_text",
    durable_transport_provided: true,
    live_transport_open: true,
    co_math_transport_stack_built: false,
    co_math_websocket_stack_built: false,
    custom_transport_implementation: false,
    indefinite_stream_open: false,
    long_lived_websocket_provided: false,
    long_lived_sse_provided: false,
    pi_direct_write_allowed: false,
    direct_trusted_state_mutation: false,
    ga_release_signoff_ready: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  });
  const signoffId = `GOAL3-FINAL-RELEASE-SIGNOFF-0323-${id}`;
  const signoffPath = `.comath/release/goal3-final-release-signoff/${signoffId}/signoff.json`;
  const signoff = writeJson(signoffPath, {
    schema_version: "comath.goal3_final_release_signoff_decision.v1",
    final_release_signoff_id: signoffId,
    project_id: projectId,
    ok: true,
    final_release_signoff_status: "ready_for_open_formal_workbench_final_release_signoff",
    final_release_signoff_path: signoffPath,
    blocker_reasons: [],
    ga_certificate_consumption_available: true,
    ga_certificate_consumption_review_id: consumptionId,
    ga_certificate_consumption_review_artifact: artifactFrom(
      certificateConsumption,
      "goal3_ga_certificate_consumption_review"
    ),
    ga_certificate_consumption_current: true,
    ga_certificate_available: true,
    durable_transport_signoff_verification_available: true,
    durable_transport_signoff_verification_id: verificationId,
    durable_transport_signoff_verification_path: verificationPath,
    durable_transport_signoff_verification_artifact: artifactFrom(
      verification,
      "goal3_durable_transport_release_signoff_verification"
    ),
    durable_transport_signoff_verification_current: true,
    durable_transport_signoff_verification_status: "verified_external_durable_transport_primitive_bound",
    source_release_os_immutability_attestation_id: attestationId,
    source_release_os_immutability_attestation_path: attestationPath,
    source_release_os_immutability_attestation_artifact: artifactFrom(
      attestation,
      "goal3_source_release_os_immutability_attestation"
    ),
    source_release_os_immutability_attestation_current: true,
    source_archive_artifact: {
      kind: "goal3_source_release_source_archive",
      ...sourceArchive
    },
    source_archive_current: true,
    operator_evidence_artifact: artifactFrom(operatorEvidence, "goal3_source_release_external_provider_verification"),
    operator_evidence_current: true,
    external_durable_transport_evidence_bound: true,
    external_durable_transport_primitive_bound: true,
    service_transport_primitive: "node_http_agent_run_log_session_route",
    client_transport_primitive: "pi_fetch_get_text",
    durable_transport_provided: true,
    live_transport_open: true,
    ga_release_signoff_ready: true,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  });
  const reviewId = `GOAL3-FINAL-SIGNOFF-CERTIFICATION-BOUNDARY-0323-${id}`;
  const reviewPath = `.comath/release/goal3-final-release-signoff-certification-boundary-review/${reviewId}/review.json`;
  const review = writeJson(reviewPath, {
    schema_version: "comath.goal3_final_release_signoff_certification_boundary_review.v1",
    certification_boundary_review_id: reviewId,
    project_id: projectId,
    ok: overrides.blockedBoundary === true ? false : true,
    certification_boundary_review_status:
      overrides.blockedBoundary === true
        ? "blocked_final_release_signoff_certification_boundary"
        : "reviewed_final_release_signoff_certification_boundary",
    certification_boundary_review_path: reviewPath,
    final_release_signoff_id: signoffId,
    final_release_signoff_path: signoffPath,
    final_release_signoff_artifact: artifactFrom(signoff, "goal3_final_release_signoff_decision"),
    final_release_signoff_current: true,
    final_release_signoff_status: "ready_for_open_formal_workbench_final_release_signoff",
    ga_release_signoff_ready: true,
    ga_certificate_consumption_review_id: consumptionId,
    ga_certificate_consumption_review_artifact: artifactFrom(
      certificateConsumption,
      "goal3_ga_certificate_consumption_review"
    ),
    ga_certificate_consumption_current: true,
    consumed_ga_certificate_can_certify_ga: true,
    durable_transport_signoff_verification_id: verificationId,
    durable_transport_signoff_verification_path: verificationPath,
    durable_transport_signoff_verification_artifact: artifactFrom(
      verification,
      "goal3_durable_transport_release_signoff_verification"
    ),
    durable_transport_signoff_verification_current: true,
    durable_transport_signoff_verification_status: "verified_external_durable_transport_primitive_bound",
    external_durable_transport_evidence_id: evidenceId,
    external_durable_transport_evidence_artifact: artifactFrom(
      externalEvidence,
      "goal3_external_durable_transport_evidence"
    ),
    external_durable_transport_evidence_current: true,
    external_durable_transport_primitive_bound: true,
    durable_transport_provided: true,
    live_transport_open: true,
    source_release_os_immutability_attestation_id: attestationId,
    source_release_os_immutability_attestation_path: attestationPath,
    source_release_os_immutability_attestation_artifact: artifactFrom(
      attestation,
      "goal3_source_release_os_immutability_attestation"
    ),
    source_release_os_immutability_attestation_current: true,
    source_archive_artifact: {
      kind: "goal3_source_release_source_archive",
      ...sourceArchive
    },
    source_archive_current: true,
    operator_evidence_artifact: artifactFrom(operatorEvidence, "goal3_source_release_external_provider_verification"),
    operator_evidence_current: true,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    boundary_review_is_certificate: false,
    ga_certificate_issued: false,
    claim_promotion_requires_ordinary_gate: true
  });
  return { review, sourceArchive };
}

function auditInput(id, review) {
  return {
    project_id: projectId,
    final_release_candidate_closure_audit_id: `GOAL3-FINAL-RELEASE-CANDIDATE-CLOSURE-AUDIT-0323-${id}`,
    actor:
      "goal3-task323 actor Authorization: Bearer plain-token proof_success can_certify_ga=true GA certified",
    certification_boundary_review_id: review.body.certification_boundary_review_id,
    certification_boundary_review_path: review.path,
    certification_boundary_review_sha256: review.sha256
  };
}

try {
  assert.equal(typeof recordGoal3FinalReleaseCandidateClosureAudit, "function");

  const status = getComathdStatus();
  assert.equal(
    status.capabilities.includes("goal3_final_release_candidate_closure_audit_gate"),
    true,
    "Task323 must expose final release-candidate closure audit capability"
  );
  assert.equal(
    repoFile("scripts/phase0-smoke.mjs").includes(
      "goal3-task323-final-release-candidate-closure-audit.test.mjs"
    ),
    true,
    "Task323 focused suite must be discovered by phase0 smoke"
  );

  const chain = writeReleaseCandidateChain("OK");
  const audit = recordGoal3FinalReleaseCandidateClosureAudit(projectRoot, auditInput("OK", chain.review));
  assert.equal(audit.ok, true);
  assert.equal(audit.final_release_candidate_closure_status, "audited_final_release_candidate_boundary_current");
  assert.equal(audit.certification_boundary_review_current, true);
  assert.equal(audit.final_release_signoff_current, true);
  assert.equal(audit.ga_release_signoff_ready, true);
  assert.equal(audit.ga_certificate_consumption_current, true);
  assert.equal(audit.durable_transport_signoff_verification_current, true);
  assert.equal(audit.external_durable_transport_evidence_current, true);
  assert.equal(audit.source_release_os_immutability_attestation_current, true);
  assert.equal(audit.source_archive_current, true);
  assert.equal(audit.operator_evidence_current, true);
  assert.equal(audit.consumed_ga_certificate_can_certify_ga, true);
  assert.equal(audit.proof_authority, "none");
  assert.equal(audit.can_promote_claim, false);
  assert.equal(audit.can_certify_ga, false);
  assert.equal(audit.release_candidate_closure_audit_is_certificate, false);
  assert.equal(audit.ga_certificate_issued, false);
  assert.equal(audit.claim_promotion_requires_ordinary_gate, true);
  assert.equal(
    existsSync(join(projectRoot, audit.final_release_candidate_closure_audit_artifact.path)),
    true,
    "Task323 must persist append-only closure audit artifact"
  );
  assert.doesNotMatch(JSON.stringify(audit), secretTerms);
  assert.doesNotMatch(JSON.stringify(audit), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(audit), forbiddenCertificateTerms);

  assert.throws(
    () => recordGoal3FinalReleaseCandidateClosureAudit(projectRoot, auditInput("OK", chain.review)),
    { code: "GOAL3_FINAL_RELEASE_CANDIDATE_CLOSURE_AUDIT_ALREADY_EXISTS" },
    "Task323 closure audit must be append-only"
  );

  const staleSource = writeReleaseCandidateChain("STALE-SOURCE");
  writeBuffer(
    staleSource.sourceArchive.path,
    Buffer.from("goal3 task323 tampered source archive", "utf8")
  );
  assert.throws(
    () =>
      recordGoal3FinalReleaseCandidateClosureAudit(
        projectRoot,
        auditInput("STALE-SOURCE", staleSource.review)
      ),
    { code: "GOAL3_FINAL_RELEASE_CANDIDATE_CLOSURE_AUDIT_STALE" },
    "Task323 must re-read source archive bytes instead of trusting Task322 review"
  );
  assert.equal(
    existsSync(
      join(
        projectRoot,
        ".comath/release/goal3-final-release-candidate-closure-audit/GOAL3-FINAL-RELEASE-CANDIDATE-CLOSURE-AUDIT-0323-STALE-SOURCE/audit.json"
      )
    ),
    false
  );

  const expired = writeReleaseCandidateChain("EXPIRED", { expiredTransport: true });
  assert.throws(
    () =>
      recordGoal3FinalReleaseCandidateClosureAudit(projectRoot, auditInput("EXPIRED", expired.review)),
    { code: "GOAL3_FINAL_RELEASE_CANDIDATE_CLOSURE_AUDIT_STALE" },
    "Task323 must reject expired external durable transport evidence after Task322 review"
  );

  const blocked = writeReleaseCandidateChain("BLOCKED", { blockedBoundary: true });
  assert.throws(
    () => recordGoal3FinalReleaseCandidateClosureAudit(projectRoot, auditInput("BLOCKED", blocked.review)),
    { code: "GOAL3_FINAL_RELEASE_CANDIDATE_CLOSURE_AUDIT_INVALID" },
    "Task323 must only consume successful Task322 boundary reviews"
  );

  const missingPolicy = writeReleaseCandidateChain("MISSING-POLICY", { missingPolicy: true });
  assert.throws(
    () =>
      recordGoal3FinalReleaseCandidateClosureAudit(
        projectRoot,
        auditInput("MISSING-POLICY", missingPolicy.review)
      ),
    { code: "GOAL3_FINAL_RELEASE_CANDIDATE_CLOSURE_AUDIT_INVALID" },
    "Task323 must reject Task322-like material that omits the Task315 policy-inspection chain"
  );

  const missingTransportChain = writeReleaseCandidateChain("MISSING-TRANSPORT-CHAIN", {
    missingTransportChain: true
  });
  assert.throws(
    () =>
      recordGoal3FinalReleaseCandidateClosureAudit(
        projectRoot,
        auditInput("MISSING-TRANSPORT-CHAIN", missingTransportChain.review)
      ),
    { code: "GOAL3_FINAL_RELEASE_CANDIDATE_CLOSURE_AUDIT_INVALID" },
    "Task323 must reject Task322-like material that omits the Task317 nested transport chain"
  );

  const server = createComathServer();
  const overclaimChain = writeReleaseCandidateChain("ROUTE-OVERCLAIM");
  const routeOverclaimResponse = await server.inject({
    method: "POST",
    path: "/release/goal3/final-release-candidate-closure-audit",
    body: {
      project_root: projectRoot,
      ...auditInput("ROUTE-OVERCLAIM", overclaimChain.review),
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true,
      ga_certificate_issued: true
    }
  });
  assert.equal(routeOverclaimResponse.status, 400, JSON.stringify(routeOverclaimResponse.body));
  assert.equal(
    existsSync(
      join(
        projectRoot,
        ".comath/release/goal3-final-release-candidate-closure-audit/GOAL3-FINAL-RELEASE-CANDIDATE-CLOSURE-AUDIT-0323-ROUTE-OVERCLAIM/audit.json"
      )
    ),
    false,
    "Task323 route must reject caller-supplied proof/GA certificate overclaims before writing"
  );

  const routeChain = writeReleaseCandidateChain("ROUTE");
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/goal3/final-release-candidate-closure-audit",
    body: {
      project_root: projectRoot,
      ...auditInput("ROUTE", routeChain.review)
    }
  });
  assert.equal(routeResponse.status, 200, JSON.stringify(routeResponse.body));
  assert.equal(routeResponse.body.final_release_candidate_closure_audit.ok, true);
  assert.equal(routeResponse.body.final_release_candidate_closure_audit.proof_authority, "none");
  assert.equal(routeResponse.body.final_release_candidate_closure_audit.can_certify_ga, false);
  assert.equal(routeResponse.body.final_release_candidate_closure_audit.ga_certificate_issued, false);

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (entry) =>
        entry.event_type === "release.goal3_final_release_candidate_closure_audit_recorded" &&
        entry.payload.final_release_candidate_closure_audit_id ===
          "GOAL3-FINAL-RELEASE-CANDIDATE-CLOSURE-AUDIT-0323-ROUTE" &&
        entry.payload.certification_boundary_review_current === true &&
        entry.payload.final_release_signoff_current === true &&
        entry.payload.ga_certificate_consumption_current === true &&
        entry.payload.external_durable_transport_evidence_current === true &&
        entry.payload.can_certify_ga === false &&
        entry.payload.ga_certificate_issued === false
    ),
    true,
    "Task323 must emit non-authoritative final release-candidate closure provenance"
  );

  for (const [path, pattern] of [
    ["README.md", /Task323.*final release-candidate closure audit/s],
    ["TODO.md", /Task323.*final release-candidate closure audit/s],
    ["REVIEW.md", /Goal 3 Task 323/s],
    ["AGENTS.md", /Task323.*final release-candidate closure audit/s],
    ["docs/architecture/ga-release-criteria.md", /Task323.*final release-candidate closure audit/s],
    ["docs/architecture/threat-model.md", /Task323.*final release-candidate closure audit/s],
    ["docs/architecture/acceptance-matrix.md", /Task323.*final release-candidate closure audit/s]
  ]) {
    assert.match(repoFile(path), pattern, `${path} must document Task323 final release-candidate closure audit`);
  }
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task323 final release-candidate closure audit tests passed.");
