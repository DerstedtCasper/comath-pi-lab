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
  recordGoal3DurableTransportReleaseSignoffPrerequisite,
  recordGoal3DurableTransportReleaseSignoffVerification,
  recordGoal3FinalReleaseSignoffDecision,
  recordGoal3GaOperationalReadinessReview
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task320-final-signoff-task319-"));
const init = initProject({ name: "Goal 3 Task320 final release signoff Task319 consumption", root_path: projectRoot });
const projectId = init.project.project_id;
const secretTerms = /Authorization:\s*Bearer|api_key|token=|plain-token|sk-/i;
const proofAuthorityTerms =
  /completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|kernel_checked|proof_success/i;
const forbiddenTransportStackTerms =
  /long[- ]lived\s+(?:websocket|sse)|indefinite\s+sse|custom transport implementation|CoMath transport stack/i;

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

function artifactFrom(written, kind) {
  return {
    kind,
    path: written.path,
    sha256: written.sha256,
    size_bytes: written.size_bytes
  };
}

function writeTransportEvidenceChain(id, overrides = {}) {
  const contractPath = `.comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-CONTRACT-${id}/operator-service-transport-contract.json`;
  const contract = writeJson(contractPath, {
    schema_version: "comath.pi_codex_operator_service_transport_contract.v1",
    project_id: projectId,
    transport_contract_id: `LIFE-TRANSPORT-CONTRACT-${id}`,
    transport_contract_path: contractPath,
    transport_contract_status: "operator_service_transport_contract_recorded",
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
    can_certify_ga: false,
    ...(overrides.contract ?? {})
  });

  const continuityPath = `.comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-CONTINUITY-${id}/operator-service-transport-continuity.json`;
  const continuity = writeJson(continuityPath, {
    schema_version: "comath.pi_codex_operator_service_transport_continuity.v1",
    project_id: projectId,
    transport_continuity_id: `LIFE-TRANSPORT-CONTINUITY-${id}`,
    transport_continuity_path: continuityPath,
    transport_continuity_status: "operator_service_transport_continuity_recorded",
    transport_contract_id: `LIFE-TRANSPORT-CONTRACT-${id}`,
    transport_contract_artifact: artifactFrom(contract, "operator_service_transport_contract"),
    transport_contract_current: true,
    maintained_transport_primitive_bound: true,
    service_transport_primitive: "node_http_agent_run_log_session_route",
    client_transport_primitive: "pi_fetch_get_text",
    durable_transport_provided: false,
    live_transport_open: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    ...(overrides.continuity ?? {})
  });

  const durablePath = `.comath/release/pi-codex-lifecycle/LIFE-DURABLE-TRANSPORT-CONTRACT-${id}/unattended-real-host-durable-transport-contract.json`;
  const durable = writeJson(durablePath, {
    schema_version: "comath.pi_codex_unattended_real_host_durable_transport_contract.v1",
    project_id: projectId,
    durable_transport_contract_id: `LIFE-DURABLE-TRANSPORT-CONTRACT-${id}`,
    durable_transport_contract_path: durablePath,
    durable_transport_contract_status: "durable_transport_prerequisite_contract_recorded",
    durable_transport_contract_current: true,
    durability_contract_kind: "service_owned_external_durable_transport_prerequisite_contract",
    transport_prerequisite_state: "contract_recorded_transport_not_opened",
    service_owned_durable_transport_prerequisite_configured: true,
    transport_continuity_id: `LIFE-TRANSPORT-CONTINUITY-${id}`,
    transport_continuity_artifact: artifactFrom(continuity, "operator_service_transport_continuity"),
    transport_continuity_current: true,
    transport_contract_id: `LIFE-TRANSPORT-CONTRACT-${id}`,
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
    can_certify_ga: false,
    ...(overrides.durable ?? {})
  });

  const certificatePath = `.comath/release/pi-codex-lifecycle/LIFE-TERMINAL-COMPLETION-CERT-${id}/terminal-completion-certificate.json`;
  const certificate = writeJson(certificatePath, {
    schema_version: "comath.pi_codex_unattended_real_host_terminal_completion_certificate.v1",
    project_id: projectId,
    terminal_completion_certificate_id: `LIFE-TERMINAL-COMPLETION-CERT-${id}`,
    terminal_completion_certificate_path: certificatePath,
    terminal_completion_certificate_status: "terminal_unattended_completion_certified",
    terminal_unattended_completion_certified: true,
    completion_certificate_available: true,
    unattended_real_host_execution_completed: true,
    durable_transport_contract_id: `LIFE-DURABLE-TRANSPORT-CONTRACT-${id}`,
    durable_transport_contract_artifact: artifactFrom(durable, "unattended_real_host_durable_transport_contract"),
    durable_transport_contract_current: true,
    service_owned_durable_transport_prerequisite_configured: true,
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
    can_certify_ga: false,
    ga_certification_gate_separate: true,
    ...(overrides.certificate ?? {})
  });

  const closureId = `LIFE-TRANSPORT-CLOSURE-REVIEW-${id}`;
  const closurePath = `.comath/release/pi-codex-lifecycle/${closureId}/operator-service-transport-closure-review.json`;
  const closure = writeJson(closurePath, {
    schema_version: "comath.pi_codex_operator_service_transport_closure_review.v1",
    transport_closure_review_id: closureId,
    project_id: projectId,
    actor: "goal3-task320 transport fixture",
    created_at: "2026-06-11T00:00:00.000Z",
    transport_closure_review_status: "maintained_operator_service_transport_closure_reviewed",
    durable_transport_closure_status: "maintained_operator_service_transport_closure_reviewed",
    transport_closure_review_path: closurePath,
    requested_transport_closure_mode: "maintained_operator_service_transport_closure_review",
    terminal_completion_certificate_id: `LIFE-TERMINAL-COMPLETION-CERT-${id}`,
    terminal_completion_certificate_artifact: artifactFrom(
      certificate,
      "unattended_real_host_terminal_completion_certificate"
    ),
    terminal_completion_certificate_current: true,
    durable_transport_contract_id: `LIFE-DURABLE-TRANSPORT-CONTRACT-${id}`,
    durable_transport_contract_artifact: artifactFrom(durable, "unattended_real_host_durable_transport_contract"),
    durable_transport_contract_current: true,
    transport_continuity_id: `LIFE-TRANSPORT-CONTINUITY-${id}`,
    transport_continuity_artifact: artifactFrom(continuity, "operator_service_transport_continuity"),
    transport_continuity_current: true,
    transport_contract_id: `LIFE-TRANSPORT-CONTRACT-${id}`,
    transport_contract_artifact: artifactFrom(contract, "operator_service_transport_contract"),
    transport_contract_current: true,
    maintained_transport_primitive_bound: true,
    completion_certificate_available: true,
    terminal_unattended_completion_certified: true,
    unattended_real_host_execution_completed: true,
    service_transport_primitive: "node_http_agent_run_log_session_route",
    client_transport_primitive: "pi_fetch_get_text",
    agent_run_id: `ARUN-${id}`,
    service_route: `/agent/run/ARUN-${id}/log-session`,
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
    ...(overrides.closure ?? {})
  });

  return { closure, closureId };
}

function writeAdapterOsIsolationReadiness(id) {
  const path = `.comath/release/agent-adapter-os-isolation/${id}/review.json`;
  return writeJson(path, {
    schema_version: "comath.agent_adapter_os_isolation_readiness.v1",
    review_id: id,
    project_id: projectId,
    adapter_id: "codex-cli",
    backend: "external",
    ok: true,
    readiness_status: "ready_for_os_isolation_release_review",
    review_path: path,
    evidence_artifact: {
      kind: "agent_adapter_os_isolation_evidence",
      path: `.comath/release/agent-adapter-os-isolation/${id}/evidence.json`,
      sha256: "e".repeat(64),
      size_bytes: 1024
    },
    checks: {
      production_helper_source: { ok: true, observed: "operator_configured_provider_helper" }
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

function recordOperationalReadiness(id, transport, osReview) {
  return recordGoal3GaOperationalReadinessReview(projectRoot, {
    project_id: projectId,
    operational_readiness_review_id: `GOAL3-GA-OPERATIONAL-READINESS-${id}`,
    actor: "goal3-task320 operational readiness reviewer token=plain-token proof_success GA certified",
    transport_closure_review_id: transport.closureId,
    transport_closure_review_path: transport.closure.path,
    transport_closure_review_sha256: transport.closure.sha256,
    adapter_os_isolation_review_id: osReview.body.review_id,
    adapter_os_isolation_review_path: osReview.path,
    adapter_os_isolation_review_sha256: osReview.sha256
  });
}

function writeDurableTransportPrerequisite(id) {
  const osReview = writeAdapterOsIsolationReadiness(`ADAPTER-OSISO-${id}`);
  const transport = writeTransportEvidenceChain(id);
  const readiness = recordOperationalReadiness(id, transport, osReview);
  return recordGoal3DurableTransportReleaseSignoffPrerequisite(projectRoot, {
    project_id: projectId,
    durable_transport_signoff_prerequisite_id: `GOAL3-DURABLE-TRANSPORT-SIGNOFF-${id}`,
    actor: "goal3-task320 durable prerequisite D:/project token=plain-token proof_success durable transport provided GA certified",
    operational_readiness_review_id: readiness.operational_readiness_review_id,
    operational_readiness_review_path: readiness.operational_readiness_review_path,
    operational_readiness_review_sha256: readiness.operational_readiness_review_artifact.sha256
  });
}

function writeExternalDurableTransportEvidence(id, overrides = {}) {
  const evidenceId = `GOAL3-EXTERNAL-DURABLE-TRANSPORT-EVIDENCE-${id}`;
  const path = `.comath/release/goal3-external-durable-transport-evidence/${evidenceId}/external-durable-transport-evidence.json`;
  const freshUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  return writeJson(path, {
    schema_version: "comath.goal3_external_durable_transport_evidence.v1",
    external_durable_transport_evidence_id: evidenceId,
    project_id: projectId,
    ok: true,
    evidence_status: "external_durable_transport_primitive_available",
    evidence_path: path,
    provider_id: "openssh-tmux-operator-transport",
    provider_kind: "maintained_external_operator_transport",
    transport_primitive: "external_reconnectable_operator_session",
    maintenance_source: "external_maintained_primitive",
    daemon_identity_sha256: "1".repeat(64),
    daemon_policy_sha256: "2".repeat(64),
    session_policy_sha256: "3".repeat(64),
    provider_attestation_sha256: "4".repeat(64),
    operator_session_id: `OPSESSION-${id}`,
    agent_run_id: `ARUN-${id}`,
    service_route: `/agent/run/ARUN-${id}/log-session`,
    service_transport_primitive: "node_http_agent_run_log_session_route",
    client_transport_primitive: "pi_fetch_get_text",
    fresh_until: freshUntil,
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
    ...(overrides.evidence ?? {})
  });
}

function verificationInput(id, prerequisite, overrides = {}) {
  return {
    project_id: projectId,
    durable_transport_signoff_verification_id: `GOAL3-DURABLE-TRANSPORT-SIGNOFF-VERIFICATION-${id}`,
    actor:
      "goal3-task320 transport verification D:/project Authorization: Bearer plain-token proof_success durable transport provided GA certified",
    durable_transport_signoff_prerequisite_id: prerequisite.durable_transport_signoff_prerequisite_id,
    durable_transport_signoff_prerequisite_path: prerequisite.durable_transport_signoff_prerequisite_path,
    durable_transport_signoff_prerequisite_sha256:
      prerequisite.durable_transport_signoff_prerequisite_artifact.sha256,
    ...overrides
  };
}

function recordVerifiedTransport(id, prerequisite) {
  const evidence = writeExternalDurableTransportEvidence(id);
  return recordGoal3DurableTransportReleaseSignoffVerification(
    projectRoot,
    verificationInput(id, prerequisite, {
      external_durable_transport_evidence_id: evidence.body.external_durable_transport_evidence_id,
      external_durable_transport_evidence_path: evidence.path,
      external_durable_transport_evidence_sha256: evidence.sha256
    })
  );
}

function writeSourceReleaseOsAttestation(id, overrides = {}) {
  const sourcePath = `.comath/release/goal3-source-only-open-source-review-artifact/SRC-${id}/source.tar`;
  const sourceBytes = Buffer.from(`source tar for task320 final signoff ${id}\n`, "utf8");
  writeBuffer(sourcePath, sourceBytes);
  const sourceArchive = {
    generated_by: "git_archive",
    archive_format: "tar",
    archive_path: sourcePath,
    archive_sha256: sha256Buffer(sourceBytes),
    size_bytes: sourceBytes.byteLength,
    git_commit: "a".repeat(40),
    git_tree: "b".repeat(40),
    entry_count: 4,
    entries_sha256: "c".repeat(64),
    forbidden_entry_count: 0,
    dirty_worktree: false,
    source_only: true,
    includes_runtime_state: false,
    includes_git_dir: false,
    includes_node_modules: false
  };

  const evidencePath = `.comath/release/goal3-source-release-external-provider-verification/VER-${id}/provider-verification.json`;
  const evidence = writeJson(evidencePath, {
    schema_version: "comath.goal3_source_release_external_provider_verification.v1",
    verification_id: `VER-${id}`,
    project_id: projectId,
    ok: true,
    evidence_kind: "os_immutable_storage",
    source_archive: sourceArchive,
    source_archive_current: true,
    provider_id: "example-immutable-store",
    receipt_id: `receipt-${id}`,
    proof_authority: "none",
    can_restore: false,
    can_promote_claim: false,
    can_certify_ga: false,
    verification_is_proof_authority: false,
    provider_result_is_proof_authority: false,
    result_can_be_used_as_proof: false
  });

  const policyPath = `.comath/release/goal3-source-release-external-provider-policy-inspection/POL-${id}/policy-inspection.json`;
  const policy = writeJson(policyPath, {
    schema_version: "comath.goal3_source_release_external_provider_policy_inspection.v1",
    inspection_id: `POL-${id}`,
    project_id: projectId,
    ok: true,
    provider_policy_inspection_status: "provider_policy_inspected",
    inspection_path: policyPath,
    evidence_kind: "os_immutable_storage",
    verification_id: `VER-${id}`,
    verification_path: evidence.path,
    verification_sha256: evidence.sha256,
    verification_artifact: artifactFrom(evidence, "goal3_source_release_external_provider_verification"),
    verification_current: true,
    source_archive: sourceArchive,
    source_archive_current: true,
    operator_evidence_artifact: artifactFrom(evidence, "goal3_source_release_external_provider_verification"),
    operator_evidence_current: true,
    provider_id: "example-immutable-store",
    receipt_id: `receipt-${id}`,
    provider_policy_response_sha256: "d".repeat(64),
    daemon_identity_sha256: "1".repeat(64),
    policy_document_sha256: "2".repeat(64),
    provider_policy_inspection_performed: true,
    provider_policy_result: "provider_policy_current",
    proof_authority: "none",
    can_restore: false,
    can_promote_claim: false,
    can_certify_ga: false,
    policy_inspection_is_proof_authority: false,
    provider_policy_is_proof_authority: false,
    result_can_be_used_as_proof: false,
    policy_inspection_is_os_immutability_proof: false,
    os_immutability_enforced: false,
    requires_separate_lean_authority: true,
    requires_separate_os_immutability_attestation: true
  });

  const publicReviewId = `PUB-${id}`;
  const publicReviewPath = `.comath/release/public-archive-review/${publicReviewId}/review.json`;
  writeJson(publicReviewPath, {
    schema_version: "comath.public_archive_review.v1",
    review_id: publicReviewId,
    project_id: projectId,
    ok: true,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  });

  const attestationId = `ATT-${id}`;
  const attestationPath = `.comath/release/goal3-source-release-os-immutability-attestation/${attestationId}/os-immutability-attestation.json`;
  return writeJson(attestationPath, {
    schema_version: "comath.goal3_source_release_os_immutability_attestation.v1",
    attestation_id: attestationId,
    project_id: projectId,
    actor: "goal3-task320 source attestation fixture",
    created_at: "2026-06-11T00:00:00.000Z",
    ok: true,
    os_immutability_attestation_status: "os_immutability_attested",
    attestation_path: attestationPath,
    policy_inspection_id: policy.body.inspection_id,
    policy_inspection_path: policy.path,
    policy_inspection_sha256: policy.sha256,
    policy_inspection_artifact: artifactFrom(policy, "goal3_source_release_external_provider_policy_inspection"),
    policy_inspection_current: true,
    verification_id: evidence.body.verification_id,
    verification_sha256: evidence.sha256,
    source_archive: sourceArchive,
    source_archive_current: true,
    evidence_kind: "os_immutable_storage",
    operator_evidence_artifact: artifactFrom(evidence, "goal3_source_release_external_provider_verification"),
    operator_evidence_current: true,
    provider_id: "example-immutable-store",
    receipt_id: `receipt-${id}`,
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
    public_archive_review_id: publicReviewId,
    public_archive_review_path: publicReviewPath,
    public_archive_review_ok: true,
    ...(overrides.attestation ?? {})
  });
}

function writeGaCertificateConsumption(id, overrides = {}) {
  const reviewId = `CONS-${id}`;
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
    claim_promotion_requires_ordinary_gate: true,
    ...(overrides.consumption ?? {})
  });
}

function signoffInput(id, prerequisite, attestation, overrides = {}) {
  return {
    project_id: projectId,
    final_release_signoff_id: `GOAL3-FINAL-RELEASE-SIGNOFF-${id}`,
    actor:
      "goal3-task320 final signoff D:/project Authorization: Bearer plain-token proof_success durable transport provided GA certified ga_release_signoff_ready=true",
    durable_transport_signoff_prerequisite_id: prerequisite.durable_transport_signoff_prerequisite_id,
    durable_transport_signoff_prerequisite_path: prerequisite.durable_transport_signoff_prerequisite_path,
    durable_transport_signoff_prerequisite_sha256:
      prerequisite.durable_transport_signoff_prerequisite_artifact.sha256,
    source_release_os_immutability_attestation_id: attestation.body.attestation_id,
    source_release_os_immutability_attestation_path: attestation.path,
    source_release_os_immutability_attestation_sha256: attestation.sha256,
    ...overrides
  };
}

function withVerificationInput(verification) {
  return {
    durable_transport_signoff_verification_id: verification.durable_transport_signoff_verification_id,
    durable_transport_signoff_verification_path: verification.durable_transport_signoff_verification_path,
    durable_transport_signoff_verification_sha256:
      verification.durable_transport_signoff_verification_artifact.sha256
  };
}

try {
  assert.equal(
    getComathdStatus().capabilities.includes("goal3_final_release_signoff_task319_consumption_gate"),
    true,
    "Task320 capability ledger must advertise Task319 consumption by the final release-signoff decision gate"
  );
  for (const [path, pattern] of [
    ["README.md", /Task320.*Task319.*final release-signoff/s],
    ["TODO.md", /Task320.*Task319.*final release-signoff/s],
    ["REVIEW.md", /Goal 3 Task 320/s],
    ["AGENTS.md", /Task320.*Task319.*final release-signoff/s],
    ["docs/architecture/ga-release-criteria.md", /Task320.*Task319.*final release-signoff/s],
    ["docs/architecture/threat-model.md", /Task320.*Task319.*final release-signoff/s],
    ["docs/architecture/acceptance-matrix.md", /Task320.*Task319.*final release-signoff/s]
  ]) {
    assert.match(repoFile(path), pattern, `${path} must document Task320 Task319 consumption without authority drift`);
  }
  assert.equal(
    repoFile("scripts/phase0-smoke.mjs").includes(
      "goal3-task320-final-release-signoff-task319-consumption.test.mjs"
    ),
    true,
    "phase0 smoke must discover the Task320 focused suite"
  );

  const certOnlyPrerequisite = writeDurableTransportPrerequisite("0320-CERT-ONLY");
  const certOnlyAttestation = writeSourceReleaseOsAttestation("0320-CERT-ONLY");
  const certOnlyConsumption = writeGaCertificateConsumption("0320-CERT-ONLY");
  const certOnlySignoff = recordGoal3FinalReleaseSignoffDecision(
    projectRoot,
    signoffInput("0320-CERT-ONLY", certOnlyPrerequisite, certOnlyAttestation, {
      ga_certificate_consumption_review_id: certOnlyConsumption.body.ga_certificate_consumption_review_id,
      ga_certificate_consumption_review_path: certOnlyConsumption.path,
      ga_certificate_consumption_review_sha256: certOnlyConsumption.sha256
    })
  );
  assert.equal(certOnlySignoff.ok, false);
  assert.deepEqual(certOnlySignoff.blocker_reasons, ["durable_long_lived_transport_not_provided"]);
  assert.equal(certOnlySignoff.ga_release_signoff_ready, false);

  const transportOnlyPrerequisite = writeDurableTransportPrerequisite("0320-TRANSPORT-ONLY");
  const transportOnlyVerification = recordVerifiedTransport("0320-TRANSPORT-ONLY", transportOnlyPrerequisite);
  const transportOnlyAttestation = writeSourceReleaseOsAttestation("0320-TRANSPORT-ONLY");
  const transportOnlySignoff = recordGoal3FinalReleaseSignoffDecision(
    projectRoot,
    signoffInput("0320-TRANSPORT-ONLY", transportOnlyPrerequisite, transportOnlyAttestation, {
      ...withVerificationInput(transportOnlyVerification)
    })
  );
  assert.equal(transportOnlySignoff.ok, false);
  assert.deepEqual(transportOnlySignoff.blocker_reasons, ["final_ga_certificate_not_bound"]);
  assert.equal(transportOnlySignoff.durable_transport_signoff_verification_current, true);
  assert.equal(transportOnlySignoff.durable_transport_signoff_verification_status, "verified_external_durable_transport_primitive_bound");
  assert.equal(transportOnlySignoff.durable_transport_provided, true);
  assert.equal(transportOnlySignoff.live_transport_open, true);
  assert.equal(transportOnlySignoff.ga_certificate_available, false);
  assert.equal(transportOnlySignoff.ga_release_signoff_ready, false);
  assert.equal(transportOnlySignoff.proof_authority, "none");
  assert.equal(transportOnlySignoff.can_promote_claim, false);
  assert.equal(transportOnlySignoff.can_certify_ga, false);

  const readyPrerequisite = writeDurableTransportPrerequisite("0320-READY");
  const readyVerification = recordVerifiedTransport("0320-READY", readyPrerequisite);
  const readyAttestation = writeSourceReleaseOsAttestation("0320-READY");
  const readyConsumption = writeGaCertificateConsumption("0320-READY");
  const readySignoff = recordGoal3FinalReleaseSignoffDecision(
    projectRoot,
    signoffInput("0320-READY", readyPrerequisite, readyAttestation, {
      ...withVerificationInput(readyVerification),
      ga_certificate_consumption_review_id: readyConsumption.body.ga_certificate_consumption_review_id,
      ga_certificate_consumption_review_path: readyConsumption.path,
      ga_certificate_consumption_review_sha256: readyConsumption.sha256
    })
  );
  assert.equal(readySignoff.ok, true);
  assert.equal(readySignoff.final_release_signoff_status, "ready_for_open_formal_workbench_final_release_signoff");
  assert.deepEqual(readySignoff.blocker_reasons, []);
  assert.equal(readySignoff.durable_transport_signoff_verification_current, true);
  assert.equal(readySignoff.external_durable_transport_evidence_bound, true);
  assert.equal(readySignoff.external_durable_transport_primitive_bound, true);
  assert.equal(readySignoff.durable_transport_provided, true);
  assert.equal(readySignoff.live_transport_open, true);
  assert.equal(readySignoff.service_transport_primitive, "node_http_agent_run_log_session_route");
  assert.equal(readySignoff.client_transport_primitive, "pi_fetch_get_text");
  assert.equal(readySignoff.ga_certificate_consumption_current, true);
  assert.equal(readySignoff.ga_certificate_available, true);
  assert.equal(readySignoff.ga_release_signoff_ready, true);
  assert.equal(readySignoff.proof_authority, "none");
  assert.equal(readySignoff.can_promote_claim, false);
  assert.equal(readySignoff.can_certify_ga, false);
  assert.equal(JSON.stringify(readySignoff).includes(projectRoot), false);
  assert.doesNotMatch(JSON.stringify(readySignoff), secretTerms);
  assert.doesNotMatch(JSON.stringify(readySignoff), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(readySignoff), forbiddenTransportStackTerms);

  const blockedPrerequisite = writeDurableTransportPrerequisite("0320-BLOCKED-TRANSPORT");
  const blockedVerification = recordGoal3DurableTransportReleaseSignoffVerification(
    projectRoot,
    verificationInput("0320-BLOCKED-TRANSPORT", blockedPrerequisite)
  );
  const blockedAttestation = writeSourceReleaseOsAttestation("0320-BLOCKED-TRANSPORT");
  const blockedConsumption = writeGaCertificateConsumption("0320-BLOCKED-TRANSPORT");
  const blockedSignoff = recordGoal3FinalReleaseSignoffDecision(
    projectRoot,
    signoffInput("0320-BLOCKED-TRANSPORT", blockedPrerequisite, blockedAttestation, {
      ...withVerificationInput(blockedVerification),
      ga_certificate_consumption_review_id: blockedConsumption.body.ga_certificate_consumption_review_id,
      ga_certificate_consumption_review_path: blockedConsumption.path,
      ga_certificate_consumption_review_sha256: blockedConsumption.sha256
    })
  );
  assert.equal(blockedSignoff.ok, false);
  assert.deepEqual(blockedSignoff.blocker_reasons, ["durable_long_lived_transport_not_provided"]);
  assert.equal(blockedSignoff.durable_transport_provided, false);
  assert.equal(blockedSignoff.ga_release_signoff_ready, false);

  const mismatchPrerequisite = writeDurableTransportPrerequisite("0320-MISMATCH-A");
  const mismatchVerificationPrerequisite = writeDurableTransportPrerequisite("0320-MISMATCH-B");
  const mismatchVerification = recordVerifiedTransport("0320-MISMATCH-B", mismatchVerificationPrerequisite);
  const mismatchAttestation = writeSourceReleaseOsAttestation("0320-MISMATCH-A");
  assert.throws(
    () =>
      recordGoal3FinalReleaseSignoffDecision(
        projectRoot,
        signoffInput("0320-MISMATCH", mismatchPrerequisite, mismatchAttestation, {
          ...withVerificationInput(mismatchVerification)
        })
      ),
    { code: "GOAL3_FINAL_RELEASE_SIGNOFF_DECISION_INVALID" },
    "Task320 must reject Task319 verifications bound to a different Task317 prerequisite"
  );
  assert.equal(
    existsSync(
      join(projectRoot, ".comath/release/goal3-final-release-signoff/GOAL3-FINAL-RELEASE-SIGNOFF-0320-MISMATCH/signoff.json")
    ),
    false,
    "Task320 must not write partial signoff material on mismatched Task319 verification"
  );

  const noncanonicalEvidencePrerequisite = writeDurableTransportPrerequisite("0320-NONCANONICAL-EVIDENCE");
  const noncanonicalEvidenceVerification = recordVerifiedTransport(
    "0320-NONCANONICAL-EVIDENCE",
    noncanonicalEvidencePrerequisite
  );
  const noncanonicalVerificationBody = readJson(
    noncanonicalEvidenceVerification.durable_transport_signoff_verification_path
  );
  const canonicalEvidenceBody = readJson(
    noncanonicalVerificationBody.external_durable_transport_evidence_artifact.path
  );
  const noncanonicalEvidencePath =
    ".comath/release/goal3-external-durable-transport-evidence-shadow/GOAL3-EXTERNAL-DURABLE-TRANSPORT-EVIDENCE-0320-NONCANONICAL-EVIDENCE/external-durable-transport-evidence.json";
  const noncanonicalEvidence = writeJson(noncanonicalEvidencePath, {
    ...canonicalEvidenceBody,
    evidence_path: noncanonicalEvidencePath
  });
  const noncanonicalVerificationRewrite = writeJson(
    noncanonicalEvidenceVerification.durable_transport_signoff_verification_path,
    {
      ...noncanonicalVerificationBody,
      external_durable_transport_evidence_artifact: artifactFrom(
        noncanonicalEvidence,
        "goal3_external_durable_transport_evidence"
      )
    }
  );
  const noncanonicalEvidenceAttestation = writeSourceReleaseOsAttestation("0320-NONCANONICAL-EVIDENCE");
  assert.throws(
    () =>
      recordGoal3FinalReleaseSignoffDecision(
        projectRoot,
        signoffInput(
          "0320-NONCANONICAL-EVIDENCE",
          noncanonicalEvidencePrerequisite,
          noncanonicalEvidenceAttestation,
          {
            durable_transport_signoff_verification_id:
              noncanonicalEvidenceVerification.durable_transport_signoff_verification_id,
            durable_transport_signoff_verification_path:
              noncanonicalEvidenceVerification.durable_transport_signoff_verification_path,
            durable_transport_signoff_verification_sha256: noncanonicalVerificationRewrite.sha256
          }
        )
      ),
    { code: "GOAL3_FINAL_RELEASE_SIGNOFF_DECISION_INVALID" },
    "Task320 must reject Task319 verification that points at a noncanonical external evidence path"
  );

  const expiredPrerequisite = writeDurableTransportPrerequisite("0320-EXPIRED");
  const expiredVerification = recordVerifiedTransport("0320-EXPIRED", expiredPrerequisite);
  const expiredVerificationRewrite = writeJson(expiredVerification.durable_transport_signoff_verification_path, {
    ...readJson(expiredVerification.durable_transport_signoff_verification_path),
    fresh_until: "2020-01-01T00:00:00.000Z"
  });
  const expiredAttestation = writeSourceReleaseOsAttestation("0320-EXPIRED");
  assert.throws(
    () =>
      recordGoal3FinalReleaseSignoffDecision(
        projectRoot,
        signoffInput("0320-EXPIRED", expiredPrerequisite, expiredAttestation, {
          durable_transport_signoff_verification_id:
            expiredVerification.durable_transport_signoff_verification_id,
          durable_transport_signoff_verification_path:
            expiredVerification.durable_transport_signoff_verification_path,
          durable_transport_signoff_verification_sha256: expiredVerificationRewrite.sha256
        })
      ),
    { code: "GOAL3_FINAL_RELEASE_SIGNOFF_DECISION_STALE" },
    "Task320 must reject expired Task319 durable transport evidence at final signoff time"
  );

  const routePrerequisite = writeDurableTransportPrerequisite("0320-ROUTE");
  const routeVerification = recordVerifiedTransport("0320-ROUTE", routePrerequisite);
  const routeAttestation = writeSourceReleaseOsAttestation("0320-ROUTE");
  const routeConsumption = writeGaCertificateConsumption("0320-ROUTE");
  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/goal3/final-release-signoff-decision",
    body: {
      project_root: projectRoot,
      ...signoffInput("0320-ROUTE", routePrerequisite, routeAttestation, {
        ...withVerificationInput(routeVerification),
        ga_certificate_consumption_review_id: routeConsumption.body.ga_certificate_consumption_review_id,
        ga_certificate_consumption_review_path: routeConsumption.path,
        ga_certificate_consumption_review_sha256: routeConsumption.sha256
      })
    }
  });
  assert.equal(routeResponse.status, 200, JSON.stringify(routeResponse.body));
  assert.equal(routeResponse.body.final_release_signoff_decision.ok, true);
  assert.equal(routeResponse.body.final_release_signoff_decision.ga_release_signoff_ready, true);
  assert.equal(routeResponse.body.final_release_signoff_decision.proof_authority, "none");
  assert.equal(routeResponse.body.final_release_signoff_decision.can_certify_ga, false);

  const routeOverclaimPrerequisite = writeDurableTransportPrerequisite("0320-ROUTE-OVERCLAIM");
  const routeOverclaimVerification = recordVerifiedTransport("0320-ROUTE-OVERCLAIM", routeOverclaimPrerequisite);
  const routeOverclaimAttestation = writeSourceReleaseOsAttestation("0320-ROUTE-OVERCLAIM");
  const routeOverclaimResponse = await server.inject({
    method: "POST",
    path: "/release/goal3/final-release-signoff-decision",
    body: {
      project_root: projectRoot,
      ...signoffInput("0320-ROUTE-OVERCLAIM", routeOverclaimPrerequisite, routeOverclaimAttestation, {
        ...withVerificationInput(routeOverclaimVerification)
      }),
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true,
      custom_transport_implementation: true
    }
  });
  assert.equal(routeOverclaimResponse.status, 400, JSON.stringify(routeOverclaimResponse.body));

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (entry) =>
        entry.event_type === "release.goal3_final_release_signoff_decision_recorded" &&
        entry.payload.final_release_signoff_id === "GOAL3-FINAL-RELEASE-SIGNOFF-0320-ROUTE" &&
        entry.payload.durable_transport_signoff_verification_current === true &&
        entry.payload.external_durable_transport_evidence_bound === true &&
        entry.payload.ga_certificate_consumption_available === true &&
        entry.payload.ga_release_signoff_ready === true &&
        entry.payload.proof_authority === "none" &&
        entry.payload.can_certify_ga === false
    ),
    true,
    "Task320 final signoff must emit non-proof-authority provenance for Task319 consumption"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task320 final release-signoff Task319 consumption tests passed.");
