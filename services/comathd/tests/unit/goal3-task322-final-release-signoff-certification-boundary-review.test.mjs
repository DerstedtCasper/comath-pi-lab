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
  recordGoal3FinalReleaseSignoffCertificationBoundaryReview
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task322-final-signoff-boundary-"));
const init = initProject({
  name: "Goal 3 Task322 final release signoff certification boundary review",
  root_path: projectRoot
});
const projectId = init.project.project_id;
const secretTerms = /Authorization:\s*Bearer|api_key|token=|plain-token|sk-/i;
const proofAuthorityTerms =
  /completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|kernel_checked|proof_success/i;
const forbiddenBoundaryCertificateTerms = /boundary_review_is_certificate"\s*:\s*true|ga_certificate_issued"\s*:\s*true/i;

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

function writeGaCertificateConsumption(id) {
  const reviewId = `GOAL3-GA-CERTIFICATE-CONSUMPTION-0322-${id}`;
  const path = `.comath/release/goal3-ga-certificate-consumption/${reviewId}/consumption-review.json`;
  return writeJson(path, {
    schema_version: "comath.goal3_ga_certificate_consumption_review.v1",
    ga_certificate_consumption_review_id: reviewId,
    project_id: projectId,
    ok: true,
    release_closure_status: "publishable_workbench_release_candidate_source_bound",
    ga_certificate_consumption_review_path: path,
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
}

function writeExternalDurableTransportEvidence(id, overrides = {}) {
  const evidenceId = `GOAL3-EXTERNAL-DURABLE-TRANSPORT-EVIDENCE-0322-${id}`;
  const path = `.comath/release/goal3-external-durable-transport-evidence/${evidenceId}/external-durable-transport-evidence.json`;
  const agentRunId = `ARUN-GOAL3-0322-${id}`;
  return writeJson(path, {
    schema_version: "comath.goal3_external_durable_transport_evidence.v1",
    external_durable_transport_evidence_id: evidenceId,
    project_id: projectId,
    ok: true,
    evidence_status: "external_durable_transport_primitive_available",
    evidence_path: path,
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
    fresh_until: futureFreshUntil(),
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
    can_certify_ga: false,
    ...overrides
  });
}

function writeDurableTransportVerification(id, externalEvidence, overrides = {}) {
  const verificationId = `GOAL3-DURABLE-TRANSPORT-SIGNOFF-VERIFICATION-0322-${id}`;
  const contract = writeJson(
    `.comath/release/pi-codex-lifecycle/GOAL3-TASK322-TRANSPORT-CONTRACT-${id}/operator-service-transport-contract.json`,
    {
      schema_version: "comath.pi_codex_operator_service_transport_contract.v1",
      project_id: projectId,
      transport_contract_id: `GOAL3-TASK322-TRANSPORT-CONTRACT-${id}`,
      maintained_transport_primitive_bound: true,
      service_transport_primitive: "node_http_agent_run_log_session_route",
      client_transport_primitive: "pi_fetch_get_text",
      durable_transport_provided: false,
      live_transport_open: false,
      indefinite_stream_open: false,
      long_lived_websocket_provided: false,
      long_lived_sse_provided: false,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  );
  const continuity = writeJson(
    `.comath/release/pi-codex-lifecycle/GOAL3-TASK322-TRANSPORT-CONTINUITY-${id}/operator-service-transport-continuity.json`,
    {
      schema_version: "comath.pi_codex_operator_service_transport_continuity.v1",
      project_id: projectId,
      transport_continuity_id: `GOAL3-TASK322-TRANSPORT-CONTINUITY-${id}`,
      transport_contract_artifact: artifactFrom(contract, "operator_service_transport_contract"),
      transport_contract_current: true,
      maintained_transport_primitive_bound: true,
      service_transport_primitive: "node_http_agent_run_log_session_route",
      client_transport_primitive: "pi_fetch_get_text",
      durable_transport_provided: false,
      live_transport_open: false,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  );
  const durable = writeJson(
    `.comath/release/pi-codex-lifecycle/GOAL3-TASK322-DURABLE-CONTRACT-${id}/unattended-real-host-durable-transport-contract.json`,
    {
      schema_version: "comath.pi_codex_unattended_real_host_durable_transport_contract.v1",
      project_id: projectId,
      durable_transport_contract_id: `GOAL3-TASK322-DURABLE-CONTRACT-${id}`,
      transport_continuity_artifact: artifactFrom(continuity, "operator_service_transport_continuity"),
      transport_continuity_current: true,
      transport_contract_artifact: artifactFrom(contract, "operator_service_transport_contract"),
      transport_contract_current: true,
      maintained_transport_primitive_bound: true,
      service_transport_primitive: "node_http_agent_run_log_session_route",
      client_transport_primitive: "pi_fetch_get_text",
      durable_transport_provided: false,
      live_transport_open: false,
      indefinite_stream_open: false,
      long_lived_websocket_provided: false,
      long_lived_sse_provided: false,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  );
  const terminalCertificate = writeJson(
    `.comath/release/pi-codex-lifecycle/GOAL3-TASK322-TERMINAL-CERT-${id}/terminal-completion-certificate.json`,
    {
      schema_version: "comath.pi_codex_unattended_real_host_terminal_completion_certificate.v1",
      project_id: projectId,
      terminal_completion_certificate_id: `GOAL3-TASK322-TERMINAL-CERT-${id}`,
      terminal_unattended_completion_certified: true,
      completion_certificate_available: true,
      unattended_real_host_execution_completed: true,
      durable_transport_contract_artifact: artifactFrom(durable, "unattended_real_host_durable_transport_contract"),
      durable_transport_contract_current: true,
      maintained_transport_primitive_bound: true,
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
      can_certify_ga: false
    }
  );
  const closure = writeJson(
    `.comath/release/pi-codex-lifecycle/GOAL3-TASK322-TRANSPORT-CLOSURE-${id}/operator-service-transport-closure-review.json`,
    {
      schema_version: "comath.pi_codex_operator_service_transport_closure_review.v1",
      project_id: projectId,
      transport_closure_review_id: `GOAL3-TASK322-TRANSPORT-CLOSURE-${id}`,
      maintained_transport_primitive_bound: true,
      completion_certificate_available: true,
      terminal_unattended_completion_certified: true,
      unattended_real_host_execution_completed: true,
      service_transport_primitive: "node_http_agent_run_log_session_route",
      client_transport_primitive: "pi_fetch_get_text",
      service_route: externalEvidence.body.service_route,
      terminal_completion_certificate_artifact: artifactFrom(
        terminalCertificate,
        "unattended_real_host_terminal_completion_certificate"
      ),
      terminal_completion_certificate_current: true,
      durable_transport_contract_artifact: artifactFrom(durable, "unattended_real_host_durable_transport_contract"),
      durable_transport_contract_current: true,
      transport_continuity_artifact: artifactFrom(continuity, "operator_service_transport_continuity"),
      transport_continuity_current: true,
      transport_contract_artifact: artifactFrom(contract, "operator_service_transport_contract"),
      transport_contract_current: true,
      durable_transport_provided: false,
      live_transport_open: false,
      indefinite_stream_open: false,
      long_lived_websocket_provided: false,
      long_lived_sse_provided: false,
      pi_direct_write_allowed: false,
      direct_trusted_state_mutation: false,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  );
  const operational = writeJson(
    `.comath/release/goal3-ga-operational-readiness/GOAL3-TASK322-OPERATIONAL-READINESS-${id}/review.json`,
    {
      schema_version: "comath.goal3_ga_operational_readiness_review.v1",
      project_id: projectId,
      operational_readiness_review_id: `GOAL3-TASK322-OPERATIONAL-READINESS-${id}`,
      ok: true,
      operational_readiness_status: "ready_for_ga_release_candidate_review",
      transport_closure_review_artifact: artifactFrom(closure, "operator_service_transport_closure_review"),
      transport_closure_review_current: true,
      maintained_transport_primitive_bound: true,
      service_transport_primitive: "node_http_agent_run_log_session_route",
      client_transport_primitive: "pi_fetch_get_text",
      durable_transport_provided: false,
      live_transport_open: false,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  );
  const prerequisiteId = `GOAL3-DURABLE-TRANSPORT-SIGNOFF-PREREQ-0322-${id}`;
  const prerequisitePath = `.comath/release/goal3-durable-transport-release-signoff-prerequisite/${prerequisiteId}/prerequisite.json`;
  const prerequisite = writeJson(prerequisitePath, {
    schema_version: "comath.goal3_durable_transport_release_signoff_prerequisite.v1",
    durable_transport_signoff_prerequisite_id: prerequisiteId,
    project_id: projectId,
    ok: false,
    durable_transport_signoff_status: "blocked_durable_long_lived_transport_not_provided",
    blocker_reasons: ["durable_long_lived_transport_not_provided"],
    durable_transport_signoff_prerequisite_path: prerequisitePath,
    requested_review_mode: "open_formal_workbench_durable_transport_release_signoff_prerequisite",
    operational_readiness_review_artifact: artifactFrom(operational, "goal3_ga_operational_readiness_review"),
    operational_readiness_review_current: true,
    transport_closure_review_artifact: artifactFrom(closure, "operator_service_transport_closure_review"),
    transport_closure_review_current: true,
    terminal_completion_certificate_artifact: artifactFrom(
      terminalCertificate,
      "unattended_real_host_terminal_completion_certificate"
    ),
    terminal_completion_certificate_current: true,
    durable_transport_contract_artifact: artifactFrom(durable, "unattended_real_host_durable_transport_contract"),
    durable_transport_contract_current: true,
    transport_continuity_artifact: artifactFrom(continuity, "operator_service_transport_continuity"),
    transport_continuity_current: true,
    transport_contract_artifact: artifactFrom(contract, "operator_service_transport_contract"),
    transport_contract_current: true,
    terminal_unattended_completion_certified: true,
    completion_certificate_available: true,
    unattended_real_host_execution_completed: true,
    maintained_transport_primitive_bound: true,
    service_route_bound: true,
    client_fetch_contract_bound: true,
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
  const path = `.comath/release/goal3-durable-transport-release-signoff-verification/${verificationId}/verification.json`;
  return writeJson(path, {
    schema_version: "comath.goal3_durable_transport_release_signoff_verification.v1",
    durable_transport_signoff_verification_id: verificationId,
    project_id: projectId,
    ok: true,
    durable_transport_signoff_verification_status: "verified_external_durable_transport_primitive_bound",
    blocker_reasons: [],
    durable_transport_signoff_verification_path: path,
    requested_verification_mode: "open_formal_workbench_durable_transport_release_signoff_verification",
    durable_transport_signoff_prerequisite_id: prerequisite.body.durable_transport_signoff_prerequisite_id,
    durable_transport_signoff_prerequisite_path: prerequisite.path,
    durable_transport_signoff_prerequisite_artifact: artifactFrom(
      prerequisite,
      "goal3_durable_transport_release_signoff_prerequisite"
    ),
    durable_transport_signoff_prerequisite_current: true,
    durable_transport_signoff_status: "blocked_durable_long_lived_transport_not_provided",
    operational_readiness_review_artifact: artifactFrom(operational, "goal3_ga_operational_readiness_review"),
    operational_readiness_review_current: true,
    transport_closure_review_artifact: artifactFrom(closure, "operator_service_transport_closure_review"),
    transport_closure_review_current: true,
    terminal_completion_certificate_artifact: artifactFrom(
      terminalCertificate,
      "unattended_real_host_terminal_completion_certificate"
    ),
    terminal_completion_certificate_current: true,
    durable_transport_contract_artifact: artifactFrom(durable, "unattended_real_host_durable_transport_contract"),
    durable_transport_contract_current: true,
    transport_continuity_artifact: artifactFrom(continuity, "operator_service_transport_continuity"),
    transport_continuity_current: true,
    transport_contract_artifact: artifactFrom(contract, "operator_service_transport_contract"),
    transport_contract_current: true,
    external_durable_transport_evidence_bound: true,
    external_durable_transport_evidence_id: externalEvidence.body.external_durable_transport_evidence_id,
    external_durable_transport_evidence_artifact: artifactFrom(
      externalEvidence,
      "goal3_external_durable_transport_evidence"
    ),
    external_durable_transport_evidence_current: true,
    external_durable_transport_primitive_bound: true,
    provider_id: externalEvidence.body.provider_id,
    provider_kind: "maintained_external_operator_transport",
    transport_primitive: "external_reconnectable_operator_session",
    daemon_identity_sha256: externalEvidence.body.daemon_identity_sha256,
    daemon_policy_sha256: externalEvidence.body.daemon_policy_sha256,
    session_policy_sha256: externalEvidence.body.session_policy_sha256,
    provider_attestation_sha256: externalEvidence.body.provider_attestation_sha256,
    operator_session_id: externalEvidence.body.operator_session_id,
    agent_run_id: externalEvidence.body.agent_run_id,
    service_route: externalEvidence.body.service_route,
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
    can_certify_ga: false,
    ...(overrides.verification ?? {})
  });
}

function writeSourceReleaseOsAttestation(id, overrides = {}) {
  const sourceArchive = writeBuffer(
    `.comath/release/source-archives/GOAL3-SOURCE-ARCHIVE-0322-${id}/source.tar`,
    Buffer.from(`goal3 task322 source archive ${id}`, "utf8")
  );
  const providerId = `external-os-provider-${id}`;
  const receiptId = `external-os-receipt-${id}`;
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
    `.comath/release/source-release-operator-evidence/GOAL3-OPERATOR-EVIDENCE-0322-${id}/operator-evidence.json`,
    {
      schema_version: "comath.goal3_source_release_external_provider_verification.v1",
      verification_id: `GOAL3-OPERATOR-EVIDENCE-0322-${id}`,
      project_id: projectId,
      ok: true,
      evidence_kind: "os_immutable_storage",
      source_archive_current: true,
      source_archive: sourceArchiveBody,
      provider_id: providerId,
      receipt_id: receiptId,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false,
      ...(overrides.operatorEvidence ?? {})
    }
  );
  const policyInspectionId = `GOAL3-POLICY-INSPECTION-0322-${id}`;
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
      provider_id: providerId,
      receipt_id: receiptId,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false,
      ...(overrides.policyInspection ?? {})
    }
  );
  const attestationId = `GOAL3-SOURCE-RELEASE-OS-ATTESTATION-0322-${id}`;
  const path = `.comath/release/goal3-source-release-os-immutability-attestation/${attestationId}/os-immutability-attestation.json`;
  return {
    sourceArchive,
    operatorEvidence,
    policyInspection,
    attestation: writeJson(path, {
      schema_version: "comath.goal3_source_release_os_immutability_attestation.v1",
      attestation_id: attestationId,
      project_id: projectId,
      ok: true,
      os_immutability_attestation_status: "os_immutability_attested",
      attestation_path: path,
      policy_inspection_id: policyInspectionId,
      policy_inspection_path: policyInspection.path,
      policy_inspection_sha256: policyInspection.sha256,
      policy_inspection_artifact: artifactFrom(policyInspection, "goal3_source_release_external_provider_policy_inspection"),
      policy_inspection_current: true,
      verification_id: operatorEvidence.body.verification_id,
      verification_sha256: operatorEvidence.sha256,
      source_archive_current: true,
      source_archive: sourceArchiveBody,
      evidence_kind: "os_immutable_storage",
      operator_evidence_artifact: artifactFrom(operatorEvidence, "goal3_source_release_external_provider_verification"),
      operator_evidence_current: true,
      provider_id: providerId,
      receipt_id: receiptId,
      os_immutability_attestation_performed: true,
      os_immutability_result: "provider_attested",
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
      public_archive_review_ok: true,
      ...(overrides.attestation ?? {})
    })
  };
}

function writeReadyFinalReleaseSignoff(id, overrides = {}) {
  const consumption = writeGaCertificateConsumption(id);
  const externalEvidence = writeExternalDurableTransportEvidence(id, overrides.externalEvidence ?? {});
  const verification = writeDurableTransportVerification(id, externalEvidence, overrides.verification ?? {});
  const sourceRelease = writeSourceReleaseOsAttestation(id, overrides.sourceRelease ?? {});
  const signoffId = `GOAL3-FINAL-RELEASE-SIGNOFF-0322-${id}`;
  const path = `.comath/release/goal3-final-release-signoff/${signoffId}/signoff.json`;
  const signoff = writeJson(path, {
    schema_version: "comath.goal3_final_release_signoff_decision.v1",
    final_release_signoff_id: signoffId,
    project_id: projectId,
    actor: "goal3-task322 final release signoff fixture",
    created_at: "2026-06-11T00:00:00.000Z",
    ok: true,
    final_release_signoff_status: "ready_for_open_formal_workbench_final_release_signoff",
    final_release_signoff_path: path,
    requested_signoff_mode: "open_formal_workbench_final_release_signoff_decision",
    blocker_reasons: [],
    durable_transport_signoff_prerequisite_id: verification.body.durable_transport_signoff_prerequisite_id,
    durable_transport_signoff_prerequisite_path: verification.body.durable_transport_signoff_prerequisite_path,
    durable_transport_signoff_prerequisite_artifact: verification.body.durable_transport_signoff_prerequisite_artifact,
    durable_transport_signoff_prerequisite_current: true,
    durable_transport_signoff_status: "blocked_durable_long_lived_transport_not_provided",
    durable_transport_signoff_verification_available: true,
    durable_transport_signoff_verification_id: verification.body.durable_transport_signoff_verification_id,
    durable_transport_signoff_verification_path: verification.path,
    durable_transport_signoff_verification_artifact: artifactFrom(
      verification,
      "goal3_durable_transport_release_signoff_verification"
    ),
    durable_transport_signoff_verification_current: true,
    durable_transport_signoff_verification_status: "verified_external_durable_transport_primitive_bound",
    source_release_os_immutability_attestation_id: sourceRelease.attestation.body.attestation_id,
    source_release_os_immutability_attestation_path: sourceRelease.attestation.path,
    source_release_os_immutability_attestation_artifact: artifactFrom(
      sourceRelease.attestation,
      "goal3_source_release_os_immutability_attestation"
    ),
    source_release_os_immutability_attestation_current: true,
    source_release_os_immutability_attested: true,
    source_archive_artifact: {
      kind: "goal3_source_release_source_archive",
      ...sourceRelease.sourceArchive
    },
    source_archive_current: true,
    operator_evidence_artifact: artifactFrom(
      sourceRelease.operatorEvidence,
      "goal3_source_release_external_provider_verification"
    ),
    operator_evidence_current: true,
    provider_os_immutability_attestation_bound: true,
    co_math_os_immutability_enforced: false,
    ga_certificate_consumption_available: true,
    ga_certificate_consumption_review_id: consumption.body.ga_certificate_consumption_review_id,
    ga_certificate_consumption_review_artifact: artifactFrom(consumption, "goal3_ga_certificate_consumption_review"),
    ga_certificate_consumption_current: true,
    ga_certificate_available: true,
    external_durable_transport_evidence_bound: true,
    external_durable_transport_primitive_bound: true,
    service_transport_primitive: "node_http_agent_run_log_session_route",
    client_transport_primitive: "pi_fetch_get_text",
    durable_transport_provided: true,
    live_transport_open: true,
    ga_release_signoff_ready: true,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    ...(overrides.signoff ?? {})
  });
  return {
    consumption,
    externalEvidence,
    verification,
    sourceRelease,
    signoff
  };
}

function reviewInput(id, signoff) {
  return {
    project_id: projectId,
    certification_boundary_review_id: `GOAL3-FINAL-SIGNOFF-CERTIFICATION-BOUNDARY-0322-${id}`,
    actor:
      "goal3-task322 actor Authorization: Bearer plain-token proof_success can_certify_ga=true durable transport provided",
    final_release_signoff_id: signoff.body.final_release_signoff_id,
    final_release_signoff_path: signoff.path,
    final_release_signoff_sha256: signoff.sha256
  };
}

try {
  assert.equal(typeof recordGoal3FinalReleaseSignoffCertificationBoundaryReview, "function");

  const status = getComathdStatus();
  assert.equal(
    status.capabilities.includes("goal3_final_release_signoff_certification_boundary_review_gate"),
    true,
    "Task322 must expose final release signoff certification boundary review capability"
  );
  assert.equal(
    repoFile("scripts/phase0-smoke.mjs").includes(
      "goal3-task322-final-release-signoff-certification-boundary-review.test.mjs"
    ),
    true,
    "Task322 focused suite must be discovered by phase0 smoke"
  );

  const chain = writeReadyFinalReleaseSignoff("OK");
  const review = recordGoal3FinalReleaseSignoffCertificationBoundaryReview(
    projectRoot,
    reviewInput("OK", chain.signoff)
  );
  assert.equal(review.ok, true);
  assert.equal(review.certification_boundary_review_status, "reviewed_final_release_signoff_certification_boundary");
  assert.equal(review.final_release_signoff_current, true);
  assert.equal(review.ga_release_signoff_ready, true);
  assert.equal(review.ga_certificate_consumption_current, true);
  assert.equal(review.durable_transport_signoff_verification_current, true);
  assert.equal(review.external_durable_transport_evidence_current, true);
  assert.equal(review.source_release_os_immutability_attestation_current, true);
  assert.equal(review.source_archive_current, true);
  assert.equal(review.operator_evidence_current, true);
  assert.equal(review.consumed_ga_certificate_can_certify_ga, true);
  assert.equal(review.proof_authority, "none");
  assert.equal(review.can_promote_claim, false);
  assert.equal(review.can_certify_ga, false);
  assert.equal(review.boundary_review_is_certificate, false);
  assert.equal(review.ga_certificate_issued, false);
  assert.equal(review.claim_promotion_requires_ordinary_gate, true);
  assert.equal(
    existsSync(join(projectRoot, review.final_release_signoff_certification_boundary_review_artifact.path)),
    true,
    "Task322 must persist append-only boundary review artifact"
  );
  assert.doesNotMatch(JSON.stringify(review), secretTerms);
  assert.doesNotMatch(JSON.stringify(review), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(review), forbiddenBoundaryCertificateTerms);

  assert.throws(
    () =>
      recordGoal3FinalReleaseSignoffCertificationBoundaryReview(
        projectRoot,
        reviewInput("OK", chain.signoff)
      ),
    { code: "GOAL3_FINAL_RELEASE_SIGNOFF_CERTIFICATION_BOUNDARY_REVIEW_ALREADY_EXISTS" },
    "Task322 boundary review must be append-only"
  );

  const staleSource = writeReadyFinalReleaseSignoff("STALE-SOURCE");
  writeBuffer(
    staleSource.sourceRelease.sourceArchive.path,
    Buffer.from("goal3 task322 tampered source archive", "utf8")
  );
  assert.throws(
    () =>
      recordGoal3FinalReleaseSignoffCertificationBoundaryReview(
        projectRoot,
        reviewInput("STALE-SOURCE", staleSource.signoff)
      ),
    { code: "GOAL3_FINAL_RELEASE_SIGNOFF_CERTIFICATION_BOUNDARY_REVIEW_STALE" },
    "Task322 must re-read source archive bytes instead of trusting the Task320 signoff"
  );
  assert.equal(
    existsSync(
      join(
        projectRoot,
        ".comath/release/goal3-final-release-signoff-certification-boundary-review/GOAL3-FINAL-SIGNOFF-CERTIFICATION-BOUNDARY-0322-STALE-SOURCE/review.json"
      )
    ),
    false
  );

  const expired = writeReadyFinalReleaseSignoff("EXPIRED", {
    externalEvidence: { fresh_until: pastFreshUntil() }
  });
  assert.throws(
    () =>
      recordGoal3FinalReleaseSignoffCertificationBoundaryReview(
        projectRoot,
        reviewInput("EXPIRED", expired.signoff)
      ),
    { code: "GOAL3_FINAL_RELEASE_SIGNOFF_CERTIFICATION_BOUNDARY_REVIEW_STALE" },
    "Task322 must reject expired external durable transport evidence even when Task320 signoff was hash-current"
  );

  const blockedSignoff = writeReadyFinalReleaseSignoff("BLOCKED", {
    signoff: {
      ok: false,
      final_release_signoff_status: "blocked_final_ga_release_signoff_prerequisites",
      blocker_reasons: ["final_ga_certificate_not_bound"],
      ga_release_signoff_ready: false
    }
  });
  assert.throws(
    () =>
      recordGoal3FinalReleaseSignoffCertificationBoundaryReview(
        projectRoot,
        reviewInput("BLOCKED", blockedSignoff.signoff)
      ),
    { code: "GOAL3_FINAL_RELEASE_SIGNOFF_CERTIFICATION_BOUNDARY_REVIEW_INVALID" },
    "Task322 must only consume ready Task320 final release signoff decisions"
  );

  const missingPolicy = writeReadyFinalReleaseSignoff("MISSING-POLICY", {
    sourceRelease: {
      attestation: {
        policy_inspection_id: undefined,
        policy_inspection_path: undefined,
        policy_inspection_sha256: undefined,
        policy_inspection_artifact: undefined,
        policy_inspection_current: undefined
      }
    }
  });
  assert.throws(
    () =>
      recordGoal3FinalReleaseSignoffCertificationBoundaryReview(
        projectRoot,
        reviewInput("MISSING-POLICY", missingPolicy.signoff)
      ),
    { code: "GOAL3_FINAL_RELEASE_SIGNOFF_CERTIFICATION_BOUNDARY_REVIEW_INVALID" },
    "Task322 must reject hash-current Task315-like attestation material that omits the policy-inspection chain"
  );

  const missingTransportChain = writeReadyFinalReleaseSignoff("MISSING-TRANSPORT-CHAIN", {
    verification: {
      verification: {
        operational_readiness_review_artifact: undefined,
        operational_readiness_review_current: undefined
      }
    }
  });
  assert.throws(
    () =>
      recordGoal3FinalReleaseSignoffCertificationBoundaryReview(
        projectRoot,
        reviewInput("MISSING-TRANSPORT-CHAIN", missingTransportChain.signoff)
      ),
    { code: "GOAL3_FINAL_RELEASE_SIGNOFF_CERTIFICATION_BOUNDARY_REVIEW_INVALID" },
    "Task322 must reject hash-current Task319-like verification material that omits the Task317 nested transport chain"
  );

  const overclaimChain = writeReadyFinalReleaseSignoff("ROUTE-OVERCLAIM");
  const server = createComathServer();
  const routeOverclaimResponse = await server.inject({
    method: "POST",
    path: "/release/goal3/final-release-signoff-certification-boundary-review",
    body: {
      project_root: projectRoot,
      ...reviewInput("ROUTE-OVERCLAIM", overclaimChain.signoff),
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
        ".comath/release/goal3-final-release-signoff-certification-boundary-review/GOAL3-FINAL-SIGNOFF-CERTIFICATION-BOUNDARY-0322-ROUTE-OVERCLAIM/review.json"
      )
    ),
    false,
    "Task322 route must reject caller-supplied proof/GA certificate overclaims before writing"
  );

  const routeChain = writeReadyFinalReleaseSignoff("ROUTE");
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/goal3/final-release-signoff-certification-boundary-review",
    body: {
      project_root: projectRoot,
      ...reviewInput("ROUTE", routeChain.signoff)
    }
  });
  assert.equal(routeResponse.status, 200, JSON.stringify(routeResponse.body));
  assert.equal(routeResponse.body.final_release_signoff_certification_boundary_review.ok, true);
  assert.equal(routeResponse.body.final_release_signoff_certification_boundary_review.ga_release_signoff_ready, true);
  assert.equal(routeResponse.body.final_release_signoff_certification_boundary_review.proof_authority, "none");
  assert.equal(routeResponse.body.final_release_signoff_certification_boundary_review.can_certify_ga, false);
  assert.equal(routeResponse.body.final_release_signoff_certification_boundary_review.ga_certificate_issued, false);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), secretTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), forbiddenBoundaryCertificateTerms);

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (entry) =>
        entry.event_type ===
          "release.goal3_final_release_signoff_certification_boundary_review_recorded" &&
        entry.payload.certification_boundary_review_id ===
          "GOAL3-FINAL-SIGNOFF-CERTIFICATION-BOUNDARY-0322-ROUTE" &&
        entry.payload.final_release_signoff_current === true &&
        entry.payload.ga_release_signoff_ready === true &&
        entry.payload.ga_certificate_consumption_current === true &&
        entry.payload.durable_transport_signoff_verification_current === true &&
        entry.payload.external_durable_transport_evidence_current === true &&
        entry.payload.can_certify_ga === false &&
        entry.payload.ga_certificate_issued === false
    ),
    true,
    "Task322 must emit non-authoritative final release signoff certification-boundary provenance"
  );

  for (const [path, pattern] of [
    ["README.md", /Task322.*final release signoff certification-boundary review/s],
    ["TODO.md", /Task322.*final release signoff certification-boundary review/s],
    ["REVIEW.md", /Goal 3 Task 322/s],
    ["AGENTS.md", /Task322.*final release signoff certification-boundary review/s],
    ["docs/architecture/ga-release-criteria.md", /Task322.*final release signoff certification-boundary review/s],
    ["docs/architecture/threat-model.md", /Task322.*final release signoff certification-boundary review/s],
    ["docs/architecture/acceptance-matrix.md", /Task322.*final release signoff certification-boundary review/s]
  ]) {
    assert.match(repoFile(path), pattern, `${path} must document Task322 certification-boundary review`);
  }
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task322 final release signoff certification boundary review tests passed.");
