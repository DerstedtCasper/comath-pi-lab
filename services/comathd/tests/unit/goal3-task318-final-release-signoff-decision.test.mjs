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
  recordGoal3FinalReleaseSignoffDecision,
  recordGoal3GaOperationalReadinessReview
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task318-final-release-signoff-"));
const init = initProject({ name: "Goal 3 Task318 final release signoff decision", root_path: projectRoot });
const projectId = init.project.project_id;
const secretTerms = /Authorization:\s*Bearer|api_key|token=|plain-token|sk-/i;
const proofAuthorityTerms =
  /clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|kernel_checked|proof_success/i;
const gaOverclaimTerms = /GA certified|can_certify_ga\s*[:=]\s*(?:true|1)|ga_release_signoff_ready\s*[:=]\s*(?:true|1)/i;
const transportOverclaimTerms =
  /long[- ]lived\s+(?:websocket|sse)|indefinite\s+sse|terminal transport recovered live|durable transport provided|live transport open/i;

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

function artifactFrom(written, kind) {
  return {
    kind,
    path: written.path,
    sha256: written.sha256,
    size_bytes: written.size_bytes
  };
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(projectRoot, relativePath), "utf8"));
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
    actor: "goal3-task318 transport fixture token=plain-token proof_success durable transport provided",
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
    actor: "goal3-task318 operational readiness reviewer token=plain-token proof_success GA certified",
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
    actor: "goal3-task318 durable prerequisite D:/project token=plain-token proof_success durable transport provided GA certified",
    operational_readiness_review_id: readiness.operational_readiness_review_id,
    operational_readiness_review_path: readiness.operational_readiness_review_path,
    operational_readiness_review_sha256: readiness.operational_readiness_review_artifact.sha256
  });
}

function writeSourceReleaseOsAttestation(id, overrides = {}) {
  const sourcePath = `.comath/release/goal3-source-only-open-source-review-artifact/SRC-${id}/source.tar`;
  const sourceBytes = Buffer.from(`source tar for final signoff ${id}\n`, "utf8");
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
    actor: "goal3-task318 source attestation fixture",
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
      "goal3-task318 final signoff D:/project Authorization: Bearer plain-token proof_success durable transport provided GA certified ga_release_signoff_ready=true",
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

try {
  assert.equal(
    typeof recordGoal3FinalReleaseSignoffDecision,
    "function",
    "Task318 must export a service-owned final GA release-signoff decision gate"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("goal3_final_release_signoff_decision_gate"),
    true,
    "Task318 capability ledger must advertise the final release-signoff decision gate"
  );
  for (const [path, pattern] of [
    ["README.md", /Task318.*final release-signoff decision/s],
    ["TODO.md", /Task318.*final release-signoff decision/s],
    ["REVIEW.md", /Goal 3 Task 318/s],
    ["AGENTS.md", /Task318.*final release-signoff decision/s],
    ["docs/architecture/ga-release-criteria.md", /Task318.*final release-signoff decision/s],
    ["docs/architecture/threat-model.md", /Task318.*final release-signoff decision/s],
    ["docs/architecture/acceptance-matrix.md", /Task318.*final release-signoff decision/s]
  ]) {
    assert.match(repoFile(path), pattern, `${path} must document Task318 without GA signoff overclaims`);
  }
  assert.equal(
    repoFile("scripts/phase0-smoke.mjs").includes("goal3-task318-final-release-signoff-decision.test.mjs"),
    true,
    "phase0 smoke must discover the Task318 focused suite"
  );

  const prerequisite = writeDurableTransportPrerequisite("0318");
  const attestation = writeSourceReleaseOsAttestation("0318");
  const signoff = recordGoal3FinalReleaseSignoffDecision(
    projectRoot,
    signoffInput("0318", prerequisite, attestation)
  );

  assert.equal(signoff.schema_version, "comath.goal3_final_release_signoff_decision.v1");
  assert.equal(signoff.ok, false);
  assert.equal(signoff.final_release_signoff_status, "blocked_final_ga_release_signoff_prerequisites");
  assert.deepEqual(signoff.blocker_reasons, [
    "durable_long_lived_transport_not_provided",
    "final_ga_certificate_not_bound"
  ]);
  assert.equal(signoff.durable_transport_signoff_prerequisite_current, true);
  assert.equal(signoff.durable_transport_signoff_status, "blocked_durable_long_lived_transport_not_provided");
  assert.equal(signoff.source_release_os_immutability_attestation_current, true);
  assert.equal(signoff.source_archive_current, true);
  assert.equal(signoff.operator_evidence_current, true);
  assert.equal(signoff.provider_os_immutability_attestation_bound, true);
  assert.equal(signoff.source_release_os_immutability_attested, true);
  assert.equal(signoff.co_math_os_immutability_enforced, false);
  assert.equal(signoff.durable_transport_provided, false);
  assert.equal(signoff.live_transport_open, false);
  assert.equal(signoff.ga_release_signoff_ready, false);
  assert.equal(signoff.ga_certificate_available, false);
  assert.equal(signoff.proof_authority, "none");
  assert.equal(signoff.can_promote_claim, false);
  assert.equal(signoff.can_certify_ga, false);
  assert.equal(JSON.stringify(signoff).includes(projectRoot), false);
  assert.doesNotMatch(JSON.stringify(signoff), secretTerms);
  assert.doesNotMatch(JSON.stringify(signoff), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(signoff), gaOverclaimTerms);
  assert.doesNotMatch(JSON.stringify(signoff), transportOverclaimTerms);
  assert.equal(existsSync(join(projectRoot, signoff.final_release_signoff_path)), true);

  const certificatePrerequisite = writeDurableTransportPrerequisite("0318-CERT");
  const certificateAttestation = writeSourceReleaseOsAttestation("0318-CERT");
  const certificateConsumption = writeGaCertificateConsumption("0318-CERT");
  const certificateBoundSignoff = recordGoal3FinalReleaseSignoffDecision(
    projectRoot,
    signoffInput("0318-CERT", certificatePrerequisite, certificateAttestation, {
      ga_certificate_consumption_review_id: certificateConsumption.body.ga_certificate_consumption_review_id,
      ga_certificate_consumption_review_path: certificateConsumption.path,
      ga_certificate_consumption_review_sha256: certificateConsumption.sha256
    })
  );
  assert.deepEqual(certificateBoundSignoff.blocker_reasons, ["durable_long_lived_transport_not_provided"]);
  assert.equal(certificateBoundSignoff.ga_certificate_consumption_available, true);
  assert.equal(certificateBoundSignoff.ga_certificate_available, true);
  assert.equal(certificateBoundSignoff.ga_release_signoff_ready, false);
  assert.equal(certificateBoundSignoff.proof_authority, "none");
  assert.equal(certificateBoundSignoff.can_promote_claim, false);
  assert.equal(certificateBoundSignoff.can_certify_ga, false);

  const stalePrerequisite = writeDurableTransportPrerequisite("0318-STALE-SOURCE");
  const staleAttestation = writeSourceReleaseOsAttestation("0318-STALE-SOURCE");
  writeBuffer(staleAttestation.body.source_archive.archive_path, Buffer.from("tampered source archive\n"));
  assert.throws(
    () =>
      recordGoal3FinalReleaseSignoffDecision(
        projectRoot,
        signoffInput("0318-STALE-SOURCE", stalePrerequisite, staleAttestation)
      ),
    { code: "GOAL3_FINAL_RELEASE_SIGNOFF_DECISION_STALE" },
    "Task318 must reject source archive bytes changed after the Task315 OS attestation artifact was written"
  );
  assert.equal(
    existsSync(
      join(
        projectRoot,
        ".comath/release/goal3-final-release-signoff/GOAL3-FINAL-RELEASE-SIGNOFF-0318-STALE-SOURCE/signoff.json"
      )
    ),
    false,
    "Task318 must not write partial signoff material on stale source-release bytes"
  );

  const stalePrerequisiteBytes = writeDurableTransportPrerequisite("0318-STALE-PREREQ");
  const stalePrerequisiteAttestation = writeSourceReleaseOsAttestation("0318-STALE-PREREQ");
  writeJson(stalePrerequisiteBytes.durable_transport_signoff_prerequisite_path, {
    ...readJson(stalePrerequisiteBytes.durable_transport_signoff_prerequisite_path),
    durable_transport_signoff_status: "tampered"
  });
  assert.throws(
    () =>
      recordGoal3FinalReleaseSignoffDecision(
        projectRoot,
        signoffInput("0318-STALE-PREREQ", stalePrerequisiteBytes, stalePrerequisiteAttestation)
      ),
    { code: "GOAL3_FINAL_RELEASE_SIGNOFF_DECISION_STALE" },
    "Task318 must reject Task317 prerequisite bytes changed after the caller supplied its hash"
  );
  assert.equal(
    existsSync(
      join(
        projectRoot,
        ".comath/release/goal3-final-release-signoff/GOAL3-FINAL-RELEASE-SIGNOFF-0318-STALE-PREREQ/signoff.json"
      )
    ),
    false,
    "Task318 must not write partial signoff material on stale Task317 prerequisite bytes"
  );

  const stalePolicyPrerequisite = writeDurableTransportPrerequisite("0318-STALE-POLICY");
  const stalePolicyAttestation = writeSourceReleaseOsAttestation("0318-STALE-POLICY");
  writeJson(stalePolicyAttestation.body.policy_inspection_artifact.path, {
    ...readJson(stalePolicyAttestation.body.policy_inspection_artifact.path),
    provider_policy_result: "tampered"
  });
  assert.throws(
    () =>
      recordGoal3FinalReleaseSignoffDecision(
        projectRoot,
        signoffInput("0318-STALE-POLICY", stalePolicyPrerequisite, stalePolicyAttestation)
      ),
    { code: "GOAL3_FINAL_RELEASE_SIGNOFF_DECISION_STALE" },
    "Task318 must reject Task315 policy-inspection bytes changed after the OS attestation artifact was written"
  );

  const staleEvidencePrerequisite = writeDurableTransportPrerequisite("0318-STALE-EVIDENCE");
  const staleEvidenceAttestation = writeSourceReleaseOsAttestation("0318-STALE-EVIDENCE");
  writeJson(staleEvidenceAttestation.body.operator_evidence_artifact.path, {
    ...readJson(staleEvidenceAttestation.body.operator_evidence_artifact.path),
    receipt_id: "tampered"
  });
  assert.throws(
    () =>
      recordGoal3FinalReleaseSignoffDecision(
        projectRoot,
        signoffInput("0318-STALE-EVIDENCE", staleEvidencePrerequisite, staleEvidenceAttestation)
      ),
    { code: "GOAL3_FINAL_RELEASE_SIGNOFF_DECISION_STALE" },
    "Task318 must reject Task315 operator-evidence bytes changed after the OS attestation artifact was written"
  );

  const hashCurrentPrerequisite = writeDurableTransportPrerequisite("0318-EXTRA-PREREQ");
  const hashCurrentPrerequisiteAttestation = writeSourceReleaseOsAttestation("0318-EXTRA-PREREQ");
  const hashCurrentPrerequisiteRewrite = writeJson(hashCurrentPrerequisite.durable_transport_signoff_prerequisite_path, {
    ...readJson(hashCurrentPrerequisite.durable_transport_signoff_prerequisite_path),
    ga_release_signoff_ready: true
  });
  assert.throws(
    () =>
      recordGoal3FinalReleaseSignoffDecision(
        projectRoot,
        signoffInput(
          "0318-EXTRA-PREREQ",
          {
            ...hashCurrentPrerequisite,
            durable_transport_signoff_prerequisite_artifact: {
              ...hashCurrentPrerequisite.durable_transport_signoff_prerequisite_artifact,
              sha256: hashCurrentPrerequisiteRewrite.sha256,
              size_bytes: hashCurrentPrerequisiteRewrite.size_bytes
            }
          },
          hashCurrentPrerequisiteAttestation
        )
      ),
    { code: "GOAL3_FINAL_RELEASE_SIGNOFF_DECISION_INVALID" },
    "Task318 must reject hash-current Task317 prerequisite material that carries extra GA signoff overclaims"
  );

  const hashCurrentAttestationPrerequisite = writeDurableTransportPrerequisite("0318-EXTRA-ATTEST");
  const hashCurrentAttestation = writeSourceReleaseOsAttestation("0318-EXTRA-ATTEST");
  const hashCurrentAttestationRewrite = writeJson(hashCurrentAttestation.path, {
    ...hashCurrentAttestation.body,
    restore_source: true
  });
  assert.throws(
    () =>
      recordGoal3FinalReleaseSignoffDecision(
        projectRoot,
        signoffInput("0318-EXTRA-ATTEST", hashCurrentAttestationPrerequisite, {
          ...hashCurrentAttestation,
          sha256: hashCurrentAttestationRewrite.sha256,
          size_bytes: hashCurrentAttestationRewrite.size_bytes,
          body: hashCurrentAttestationRewrite.body
        })
      ),
    { code: "GOAL3_FINAL_RELEASE_SIGNOFF_DECISION_INVALID" },
    "Task318 must reject hash-current Task315 source-release attestation material that carries extra restore authority"
  );

  const mismatchedAttestationPrerequisite = writeDurableTransportPrerequisite("0318-MISMATCH-ATTEST");
  const mismatchedAttestation = writeSourceReleaseOsAttestation("0318-MISMATCH-ATTEST", {
    attestation: { policy_inspection_sha256: "f".repeat(64) }
  });
  assert.throws(
    () =>
      recordGoal3FinalReleaseSignoffDecision(
        projectRoot,
        signoffInput("0318-MISMATCH-ATTEST", mismatchedAttestationPrerequisite, mismatchedAttestation)
      ),
    { code: "GOAL3_FINAL_RELEASE_SIGNOFF_DECISION_INVALID" },
    "Task318 must reject Task315 scalar policy-inspection hashes that disagree with embedded artifact refs"
  );

  const poisonedPrerequisite = writeDurableTransportPrerequisite("0318-POISON");
  const poisonedAttestation = writeSourceReleaseOsAttestation("0318-POISON", {
    attestation: { can_certify_ga: true, proof_authority: "lean_kernel_clean_replay" }
  });
  assert.throws(
    () =>
      recordGoal3FinalReleaseSignoffDecision(
        projectRoot,
        signoffInput("0318-POISON", poisonedPrerequisite, poisonedAttestation)
      ),
    { code: "GOAL3_FINAL_RELEASE_SIGNOFF_DECISION_INVALID" },
    "Task318 must reject hash-current source-release attestation material that overclaims proof or GA authority"
  );

  const routePrerequisite = writeDurableTransportPrerequisite("0318-ROUTE");
  const routeAttestation = writeSourceReleaseOsAttestation("0318-ROUTE");
  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/goal3/final-release-signoff-decision",
    body: {
      project_root: projectRoot,
      ...signoffInput("0318-ROUTE", routePrerequisite, routeAttestation)
    }
  });
  assert.equal(routeResponse.status, 200, JSON.stringify(routeResponse.body));
  assert.equal(routeResponse.body.final_release_signoff_decision.ok, false);
  assert.equal(
    routeResponse.body.final_release_signoff_decision.final_release_signoff_status,
    "blocked_final_ga_release_signoff_prerequisites"
  );
  assert.equal(routeResponse.body.final_release_signoff_decision.ga_release_signoff_ready, false);
  assert.equal(routeResponse.body.final_release_signoff_decision.proof_authority, "none");
  assert.equal(routeResponse.body.final_release_signoff_decision.can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), secretTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), gaOverclaimTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), transportOverclaimTerms);

  const routeOverclaimPrerequisite = writeDurableTransportPrerequisite("0318-ROUTE-OVERCLAIM");
  const routeOverclaimAttestation = writeSourceReleaseOsAttestation("0318-ROUTE-OVERCLAIM");
  const routeOverclaimResponse = await server.inject({
    method: "POST",
    path: "/release/goal3/final-release-signoff-decision",
    body: {
      project_root: projectRoot,
      ...signoffInput("0318-ROUTE-OVERCLAIM", routeOverclaimPrerequisite, routeOverclaimAttestation),
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true,
      ga_release_signoff_ready: true,
      live_transport_open: true
    }
  });
  assert.equal(routeOverclaimResponse.status, 400, JSON.stringify(routeOverclaimResponse.body));
  assert.equal(
    existsSync(
      join(
        projectRoot,
        ".comath/release/goal3-final-release-signoff/GOAL3-FINAL-RELEASE-SIGNOFF-0318-ROUTE-OVERCLAIM/signoff.json"
      )
    ),
    false,
    "Task318 route must reject caller-supplied proof/GA/transport overclaims before writing signoff material"
  );

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (entry) =>
        entry.event_type === "release.goal3_final_release_signoff_decision_recorded" &&
        entry.payload.final_release_signoff_id === "GOAL3-FINAL-RELEASE-SIGNOFF-0318-ROUTE" &&
        entry.payload.durable_transport_signoff_prerequisite_current === true &&
        entry.payload.source_release_os_immutability_attestation_current === true &&
        entry.payload.blocker_reasons.includes("durable_long_lived_transport_not_provided") &&
        entry.payload.ga_release_signoff_ready === false &&
        entry.payload.can_certify_ga === false
    ),
    true,
    "Task318 signoff decision must emit non-authoritative final release provenance"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task318 final release-signoff decision tests passed.");
