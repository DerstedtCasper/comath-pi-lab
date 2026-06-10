import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
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
  recordGoal3SourceArtifactPresentationReview,
  recordGoal3SourceReleaseExternalEvidenceBinding,
  recordGoal3SourceReleaseExternalProviderPolicyInspection,
  recordGoal3SourceReleaseExternalProviderVerification,
  recordGoal3SourceReleaseOsImmutabilityAttestation,
  recordGoal3SourceReleasePublicChecklist
} = comath;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task315-os-attestation-"));
const init = initProject({
  name: "Goal 3 Task315 source release OS immutability attestation",
  root_path: projectRoot
});
const projectId = init.project.project_id;
const secretTerms = /Authorization:\s*Bearer|api_key|token=|plain-token|\bsk-[A-Za-z0-9_-]+/i;
const privilegedPublicTerms =
  /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|proven|verified_final_authority_evidence|GA certified|can_certify_ga\s*[:=]\s*(?:true|1)|can_promote_claim\s*[:=]\s*(?:true|1))\b/i;

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

function writeText(relativePath, text) {
  const absolutePath = join(projectRoot, relativePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, text, "utf8");
}

function writeBuffer(relativePath, bytes) {
  const absolutePath = join(projectRoot, relativePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, bytes);
}

function writeJson(relativePath, value) {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  writeText(relativePath, text);
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

function policyInspectionPath(inspectionId) {
  return `.comath/release/goal3-source-release-external-provider-policy-inspection/${inspectionId}/policy-inspection.json`;
}

function osAttestationPath(attestationId) {
  return `.comath/release/goal3-source-release-os-immutability-attestation/${attestationId}/os-immutability-attestation.json`;
}

function sourceArtifactManifestPath(artifactId) {
  return `.comath/release/goal3-source-only-open-source-review-artifact/${artifactId}/source-artifact.json`;
}

function sourceArtifactArchivePath(artifactId) {
  return `.comath/release/goal3-source-only-open-source-review-artifact/${artifactId}/source.tar`;
}

function artifact(kind, path, fill = "a", size = 1024) {
  return {
    kind,
    path,
    sha256: fill.repeat(64),
    size_bytes: size
  };
}

function writeTask308SourceArtifact(artifactId, overrides = {}) {
  const archivePath = sourceArtifactArchivePath(artifactId);
  const archiveBytes = Buffer.from(`source tar for ${artifactId}\n`);
  writeBuffer(archivePath, archiveBytes);
  const manifestPath = sourceArtifactManifestPath(artifactId);
  return writeJson(manifestPath, {
    schema_version: "comath.goal3_source_only_open_source_review_artifact.v1",
    source_review_artifact_id: artifactId,
    project_id: projectId,
    actor: "goal3-task315 fixture",
    created_at: "2026-06-10T00:00:00.000Z",
    ok: true,
    source_review_artifact_status: "source_only_open_source_review_artifact_ready",
    source_review_artifact_path: manifestPath,
    release_package_id: `GOAL3-SOURCE-BOUND-RELEASE-PACKAGE-${artifactId}`,
    release_package_path: `.comath/release/goal3-source-bound-release-package/GOAL3-SOURCE-BOUND-RELEASE-PACKAGE-${artifactId}/package.json`,
    release_package_artifact: artifact(
      "goal3_source_bound_release_package",
      `.comath/release/goal3-source-bound-release-package/GOAL3-SOURCE-BOUND-RELEASE-PACKAGE-${artifactId}/package.json`,
      "b"
    ),
    release_package_current: true,
    source_bound_release_chain_current: true,
    source_review_public_archive_manifest_path:
      `.comath/release/source-review/public-archive/GOAL3-SOURCE-BOUND-PUBLIC-ARCHIVE-${artifactId}/manifest.json`,
    source_review_public_archive_manifest_sha256: "c".repeat(64),
    source_archive: {
      generated_by: "git_archive",
      archive_format: "tar",
      archive_path: archivePath,
      archive_sha256: sha256Buffer(archiveBytes),
      size_bytes: archiveBytes.byteLength,
      git_commit: "d".repeat(40),
      git_tree: "e".repeat(40),
      entry_count: 4,
      entries_sha256: "f".repeat(64),
      forbidden_entry_count: 0,
      dirty_worktree: false,
      source_only: true,
      includes_runtime_state: false,
      includes_git_dir: false,
      includes_node_modules: false
    },
    public_archive_review_id: `GOAL3-SOURCE-ONLY-OPEN-SOURCE-REVIEW-${artifactId}`,
    public_archive_review_path:
      `.comath/release/public-archive-review/GOAL3-SOURCE-ONLY-OPEN-SOURCE-REVIEW-${artifactId}/review.json`,
    public_archive_review_ok: true,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    source_artifact_is_proof_authority: false,
    claim_promotion_requires_ordinary_gate: true,
    ...overrides
  });
}

function createPresentation(presentationId, artifactId, overrides = {}) {
  const sourceArtifact = writeTask308SourceArtifact(artifactId, overrides);
  return recordGoal3SourceArtifactPresentationReview(projectRoot, {
    project_id: projectId,
    presentation_review_id: presentationId,
    actor: "goal3-task315 presentation fixture",
    source_review_artifact_id: sourceArtifact.body.source_review_artifact_id,
    source_review_artifact_path: sourceArtifact.path,
    source_review_artifact_sha256: sourceArtifact.sha256
  });
}

function createChecklist(checklistId, artifactSuffix) {
  const presentation = createPresentation(`GOAL3-SOURCE-PRESENTATION-0315-${artifactSuffix}`, `0315-${artifactSuffix}`);
  return recordGoal3SourceReleasePublicChecklist(projectRoot, {
    project_id: projectId,
    checklist_id: checklistId,
    actor: "goal3-task315 checklist fixture",
    presentation_review_id: presentation.presentation_review_id,
    presentation_review_path: presentation.presentation_review_path,
    presentation_review_sha256: presentation.presentation_review_artifact.sha256
  });
}

function writeOperatorEvidence(evidenceId, evidenceKind, checklist) {
  const path = `.comath/release/goal3-source-release-external-evidence/${evidenceId}/${evidenceKind}.json`;
  return writeJson(path, {
    schema_version:
      evidenceKind === "external_notarization"
        ? "comath.goal3_external_notarization_operator_evidence.v1"
        : "comath.goal3_os_immutable_storage_operator_evidence.v1",
    evidence_id: evidenceId,
    project_id: projectId,
    evidence_kind: evidenceKind,
    binding_target_kind: "goal3_source_release_public_checklist",
    binding_target_id: checklist.checklist_id,
    binding_target_path: checklist.checklist_path,
    binding_target_sha256: checklist.checklist_artifact.sha256,
    source_archive_path: checklist.source_archive.archive_path,
    source_archive_sha256: checklist.source_archive.archive_sha256,
    source_archive_size_bytes: checklist.source_archive.size_bytes,
    operator_attestation: {
      provider_name: evidenceKind === "external_notarization" ? "example-notary" : "example-immutable-store",
      receipt_id: `${evidenceId}-${evidenceKind}-receipt`,
      evidence_uri: `https://example.invalid/comath/${evidenceId}/${evidenceKind}`,
      issued_at: "2026-06-10T00:00:00.000Z",
      verification_instructions: "Task315 provider OS attestation endpoint must bind this receipt."
    },
    external_verification_performed: false,
    proof_authority: "none",
    can_restore: false,
    can_promote_claim: false,
    can_certify_ga: false,
    evidence_is_proof_authority: false
  });
}

function createBinding(bindingId, artifactSuffix) {
  const checklist = createChecklist(`GOAL3-SOURCE-RELEASE-CHECKLIST-0315-${artifactSuffix}`, artifactSuffix);
  const notary = writeOperatorEvidence(`GOAL3-EXTERNAL-EVIDENCE-0315-${artifactSuffix}-NOTARY`, "external_notarization", checklist);
  const immutable = writeOperatorEvidence(`GOAL3-EXTERNAL-EVIDENCE-0315-${artifactSuffix}-IMMUTABLE`, "os_immutable_storage", checklist);
  const binding = recordGoal3SourceReleaseExternalEvidenceBinding(projectRoot, {
    project_id: projectId,
    binding_id: bindingId,
    actor: "goal3-task315 binding fixture",
    checklist_id: checklist.checklist_id,
    checklist_path: checklist.checklist_path,
    checklist_sha256: checklist.checklist_artifact.sha256,
    external_notarization_evidence_path: notary.path,
    external_notarization_evidence_sha256: notary.sha256,
    os_immutable_storage_evidence_path: immutable.path,
    os_immutable_storage_evidence_sha256: immutable.sha256
  });
  return { checklist, notary, immutable, binding };
}

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function withProvider(pathname, handler) {
  const requests = [];
  const server = createServer(async (req, res) => {
    const bodyText = await readRequestBody(req);
    const body = bodyText ? JSON.parse(bodyText) : {};
    requests.push({ method: req.method, url: req.url, headers: req.headers, body });
    const response = handler(body);
    res.statusCode = response.status ?? 200;
    res.setHeader("content-type", response.contentType ?? "application/json; charset=utf-8");
    res.end(`${JSON.stringify(response.body)}\n`);
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  const url = `http://127.0.0.1:${address.port}${pathname}`;
  return {
    url,
    requests,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  };
}

function verificationResponseFromRequest(requestBody, overrides = {}) {
  return {
    status: 200,
    body: {
      schema_version: "comath.goal3_external_provider_verification_response.v1",
      provider_id: requestBody.provider_id,
      evidence_kind: requestBody.evidence_kind,
      binding_id: requestBody.binding_id,
      binding_sha256: requestBody.binding_sha256,
      source_archive_sha256: requestBody.source_archive_sha256,
      source_archive_size_bytes: requestBody.source_archive_size_bytes,
      evidence_sha256: requestBody.evidence_sha256,
      receipt_id: requestBody.receipt_id,
      verified: true,
      checked_at: "2026-06-10T00:00:00.000Z",
      proof_authority: "none",
      can_restore: false,
      can_promote_claim: false,
      can_certify_ga: false,
      ...overrides
    }
  };
}

function policyResponseFromRequest(requestBody, overrides = {}) {
  return {
    status: 200,
    body: {
      schema_version: "comath.goal3_external_provider_policy_inspection_response.v1",
      provider_id: requestBody.provider_id,
      evidence_kind: requestBody.evidence_kind,
      verification_id: requestBody.verification_id,
      verification_sha256: requestBody.verification_sha256,
      binding_id: requestBody.binding_id,
      binding_sha256: requestBody.binding_sha256,
      source_archive_sha256: requestBody.source_archive_sha256,
      source_archive_size_bytes: requestBody.source_archive_size_bytes,
      evidence_sha256: requestBody.evidence_sha256,
      receipt_id: requestBody.receipt_id,
      provider_verification_request_sha256: requestBody.provider_verification_request_sha256,
      provider_verification_response_body_sha256: requestBody.provider_verification_response_body_sha256,
      provider_verification_response_sha256: requestBody.provider_verification_response_sha256,
      policy_status: "policy_current",
      daemon_identity_sha256: "1".repeat(64),
      policy_document_sha256: "2".repeat(64),
      checked_at: "2026-06-10T00:00:01.000Z",
      proof_authority: "none",
      can_restore: false,
      can_promote_claim: false,
      can_certify_ga: false,
      provider_policy_is_proof_authority: false,
      policy_result_is_proof_authority: false,
      result_can_be_used_as_proof: false,
      policy_inspection_is_os_immutability_proof: false,
      os_immutability_enforced: false,
      requires_separate_os_immutability_attestation: true,
      ...overrides
    }
  };
}

function osAttestationResponseFromRequest(requestBody, overrides = {}) {
  return {
    status: 200,
    body: {
      schema_version: "comath.goal3_os_immutability_attestation_response.v1",
      provider_id: requestBody.provider_id,
      evidence_kind: requestBody.evidence_kind,
      policy_inspection_id: requestBody.policy_inspection_id,
      policy_inspection_sha256: requestBody.policy_inspection_sha256,
      verification_id: requestBody.verification_id,
      verification_sha256: requestBody.verification_sha256,
      binding_id: requestBody.binding_id,
      binding_sha256: requestBody.binding_sha256,
      source_archive_sha256: requestBody.source_archive_sha256,
      source_archive_size_bytes: requestBody.source_archive_size_bytes,
      evidence_sha256: requestBody.evidence_sha256,
      receipt_id: requestBody.receipt_id,
      provider_policy_request_sha256: requestBody.provider_policy_request_sha256,
      provider_policy_response_body_sha256: requestBody.provider_policy_response_body_sha256,
      provider_policy_response_sha256: requestBody.provider_policy_response_sha256,
      daemon_identity_sha256: requestBody.daemon_identity_sha256,
      policy_document_sha256: requestBody.policy_document_sha256,
      attestation_status: "os_immutability_attested",
      immutable_store_identity_sha256: "3".repeat(64),
      immutability_policy_sha256: "4".repeat(64),
      attestation_document_sha256: "5".repeat(64),
      checked_at: "2026-06-10T00:00:02.000Z",
      proof_authority: "none",
      can_restore: false,
      can_promote_claim: false,
      can_certify_ga: false,
      storage_is_proof_authority: false,
      attestation_is_proof_authority: false,
      attestation_is_restore_source: false,
      result_can_be_used_as_proof: false,
      requires_separate_lean_authority: true,
      ...overrides
    }
  };
}

async function createVerifiedProviderArtifact(suffix, evidenceKind = "os_immutable_storage") {
  const binding = createBinding(`GOAL3-SOURCE-RELEASE-EXTERNAL-EVIDENCE-0315-${suffix}`, suffix).binding;
  const providerId = evidenceKind === "external_notarization" ? "example-notary" : "example-immutable-store";
  const provider = await withProvider("/verify", (request) => verificationResponseFromRequest(request));
  try {
    const verificationId = `GOAL3-SOURCE-RELEASE-PROVIDER-VERIFICATION-0315-${suffix}`;
    const verification = await recordGoal3SourceReleaseExternalProviderVerification(projectRoot, {
      project_id: projectId,
      verification_id: verificationId,
      actor: "goal3-task315 provider verification fixture",
      binding_id: binding.binding_id,
      binding_path: binding.binding_path,
      binding_sha256: binding.binding_artifact.sha256,
      evidence_kind: evidenceKind,
      provider_id: providerId,
      provider_verify_url: provider.url
    });
    return { binding, providerId, verification };
  } finally {
    await provider.close();
  }
}

async function createPolicyInspectionArtifact(suffix, evidenceKind = "os_immutable_storage") {
  const verified = await createVerifiedProviderArtifact(suffix, evidenceKind);
  const provider = await withProvider("/policy", (request) => policyResponseFromRequest(request));
  try {
    const inspectionId = `GOAL3-SOURCE-RELEASE-PROVIDER-POLICY-0315-${suffix}`;
    const inspection = await recordGoal3SourceReleaseExternalProviderPolicyInspection(projectRoot, {
      project_id: projectId,
      inspection_id: inspectionId,
      actor: "goal3-task315 provider policy fixture",
      verification_id: verified.verification.verification_id,
      verification_path: verified.verification.verification_path,
      verification_sha256: verified.verification.verification_artifact.sha256,
      provider_id: verified.providerId,
      provider_policy_url: provider.url
    });
    return { ...verified, inspection, inspectionPath: policyInspectionPath(inspectionId) };
  } finally {
    await provider.close();
  }
}

function assertProjectRelative(path, label) {
  assert.equal(typeof path, "string", `${label} must be a string`);
  assert.equal(path.startsWith(".comath/"), true, `${label} must stay under .comath`);
  assert.equal(path.includes(".."), false, `${label} must not contain traversal`);
  assert.equal(/[A-Za-z]:[\\/]/.test(path), false, `${label} must not expose a Windows absolute path`);
  assert.equal(path.includes("\\\\"), false, `${label} must not expose UNC/device syntax`);
}

function assertNoPublicLeak(value, label) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  assert.equal(text.includes(projectRoot), false, `${label} exposed project root`);
  assert.doesNotMatch(text, secretTerms, `${label} exposed secret-looking text`);
  assert.doesNotMatch(text, privilegedPublicTerms, `${label} exposed proof-authority wording`);
}

try {
  assert.equal(
    typeof recordGoal3SourceReleaseOsImmutabilityAttestation,
    "function",
    "Task315 must export a service-owned source release OS immutability attestation gate"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("goal3_source_release_os_immutability_attestation_gate"),
    true,
    "Task315 capability ledger must advertise the OS immutability attestation gate"
  );
  for (const [path, pattern] of [
    ["README.md", /Task315.*OS immutability attestation/s],
    ["TODO.md", /Task315.*OS immutability attestation/s],
    ["REVIEW.md", /Goal 3 Task 315/s],
    ["AGENTS.md", /Task315.*OS immutability attestation/s],
    ["docs/architecture/ga-release-criteria.md", /Task315.*OS immutability attestation/s],
    ["docs/architecture/threat-model.md", /Task315.*OS immutability attestation/s],
    ["docs/architecture/evidence-pack-policy.md", /Task315.*OS immutability attestation/s],
    ["docs/architecture/acceptance-matrix.md", /Task315.*OS immutability attestation/s],
    ["docs/architecture/adapter-contracts.md", /Task315.*OS immutability attestation/s]
  ]) {
    assert.match(repoFile(path), pattern, `${path} must document Task315 OS immutability attestation`);
  }
  assert.equal(
    repoFile("scripts/phase0-smoke.mjs").includes("goal3-task315-source-release-os-immutability-attestation.test.mjs"),
    true,
    "phase0 smoke must discover the Task315 focused suite"
  );

  const staleInspection = await createPolicyInspectionArtifact("STALE-INSPECTION");
  const staleProvider = await withProvider("/os-attest", (request) => osAttestationResponseFromRequest(request));
  try {
    await assert.rejects(
      () =>
        recordGoal3SourceReleaseOsImmutabilityAttestation(projectRoot, {
          project_id: projectId,
          attestation_id: "GOAL3-SOURCE-RELEASE-OS-IMMUTABILITY-0315-STALE-INSPECTION",
          actor: "goal3-task315 stale inspection",
          policy_inspection_id: staleInspection.inspection.inspection_id,
          policy_inspection_path: staleInspection.inspection.inspection_path,
          policy_inspection_sha256: "0".repeat(64),
          provider_id: staleInspection.providerId,
          os_attestation_url: staleProvider.url
        }),
      { code: "GOAL3_SOURCE_RELEASE_OS_IMMUTABILITY_ATTESTATION_STALE" },
      "Task315 must reject stale Task314 policy inspection hashes before calling the attestation provider"
    );
    assert.equal(staleProvider.requests.length, 0, "Task315 must not call provider after stale Task314 input");
    assert.equal(
      existsSync(join(projectRoot, osAttestationPath("GOAL3-SOURCE-RELEASE-OS-IMMUTABILITY-0315-STALE-INSPECTION"))),
      false,
      "Task315 must not write partial attestation material after stale Task314 input"
    );
  } finally {
    await staleProvider.close();
  }

  const wrongKindInspection = await createPolicyInspectionArtifact("WRONG-KIND", "external_notarization");
  const wrongKindProvider = await withProvider("/os-attest", (request) => osAttestationResponseFromRequest(request));
  try {
    await assert.rejects(
      () =>
        recordGoal3SourceReleaseOsImmutabilityAttestation(projectRoot, {
          project_id: projectId,
          attestation_id: "GOAL3-SOURCE-RELEASE-OS-IMMUTABILITY-0315-WRONG-KIND",
          actor: "goal3-task315 wrong kind",
          policy_inspection_id: wrongKindInspection.inspection.inspection_id,
          policy_inspection_path: wrongKindInspection.inspection.inspection_path,
          policy_inspection_sha256: wrongKindInspection.inspection.inspection_artifact.sha256,
          provider_id: wrongKindInspection.providerId,
          os_attestation_url: wrongKindProvider.url
        }),
      { code: "GOAL3_SOURCE_RELEASE_OS_IMMUTABILITY_ATTESTATION_INVALID" },
      "Task315 must reject Task314 material that is not for os_immutable_storage evidence"
    );
    assert.equal(wrongKindProvider.requests.length, 0, "Task315 must not call an OS attestation provider for notary evidence");
  } finally {
    await wrongKindProvider.close();
  }

  const mismatchInspection = await createPolicyInspectionArtifact("MISMATCH");
  const mismatchProvider = await withProvider("/os-attest", (request) =>
    osAttestationResponseFromRequest(request, {
      provider_policy_response_sha256: "e".repeat(64),
      source_archive_sha256: "d".repeat(64)
    })
  );
  try {
    await assert.rejects(
      () =>
        recordGoal3SourceReleaseOsImmutabilityAttestation(projectRoot, {
          project_id: projectId,
          attestation_id: "GOAL3-SOURCE-RELEASE-OS-IMMUTABILITY-0315-MISMATCH",
          actor: "goal3-task315 response mismatch",
          policy_inspection_id: mismatchInspection.inspection.inspection_id,
          policy_inspection_path: mismatchInspection.inspection.inspection_path,
          policy_inspection_sha256: mismatchInspection.inspection.inspection_artifact.sha256,
          provider_id: mismatchInspection.providerId,
          os_attestation_url: mismatchProvider.url
        }),
      { code: "GOAL3_SOURCE_RELEASE_OS_IMMUTABILITY_ATTESTATION_INVALID" },
      "Task315 must reject OS attestation responses that do not bind Task314/source hashes"
    );
    assert.equal(mismatchProvider.requests.length, 1, "Task315 must call provider once for fresh OS Task314 input");
    assert.equal(
      existsSync(join(projectRoot, osAttestationPath("GOAL3-SOURCE-RELEASE-OS-IMMUTABILITY-0315-MISMATCH"))),
      false,
      "Task315 must not write partial attestation material after provider mismatch"
    );
  } finally {
    await mismatchProvider.close();
  }

  const headerLeakInspection = await createPolicyInspectionArtifact("HEADER-LEAK");
  const headerLeakProvider = await withProvider("/os-attest", (request) => ({
    ...osAttestationResponseFromRequest(request),
    contentType: "application/json; token=plain-token"
  }));
  try {
    await assert.rejects(
      () =>
        recordGoal3SourceReleaseOsImmutabilityAttestation(projectRoot, {
          project_id: projectId,
          attestation_id: "GOAL3-SOURCE-RELEASE-OS-IMMUTABILITY-0315-HEADER-LEAK",
          actor: "goal3-task315 header leak",
          policy_inspection_id: headerLeakInspection.inspection.inspection_id,
          policy_inspection_path: headerLeakInspection.inspection.inspection_path,
          policy_inspection_sha256: headerLeakInspection.inspection.inspection_artifact.sha256,
          provider_id: headerLeakInspection.providerId,
          os_attestation_url: headerLeakProvider.url
        }),
      { code: "GOAL3_SOURCE_RELEASE_OS_IMMUTABILITY_ATTESTATION_INVALID" },
      "Task315 must reject provider OS attestation headers that contain secret-looking material"
    );
    assert.equal(headerLeakProvider.requests.length, 1, "Task315 must make exactly one provider attestation call");
  } finally {
    await headerLeakProvider.close();
  }

  const overclaimInspection = await createPolicyInspectionArtifact("OVERCLAIM");
  const overclaimProvider = await withProvider("/os-attest", (request) =>
    osAttestationResponseFromRequest(request, {
      proof_authority: "lean",
      can_restore: true,
      can_certify_ga: true,
      storage_is_proof_authority: true,
      attestation_is_proof_authority: true,
      attestation_is_restore_source: true,
      result_can_be_used_as_proof: true,
      os_immutability_enforced: true,
      ga_certified: true
    })
  );
  try {
    await assert.rejects(
      () =>
        recordGoal3SourceReleaseOsImmutabilityAttestation(projectRoot, {
          project_id: projectId,
          attestation_id: "GOAL3-SOURCE-RELEASE-OS-IMMUTABILITY-0315-OVERCLAIM",
          actor: "goal3-task315 overclaim",
          policy_inspection_id: overclaimInspection.inspection.inspection_id,
          policy_inspection_path: overclaimInspection.inspection.inspection_path,
          policy_inspection_sha256: overclaimInspection.inspection.inspection_artifact.sha256,
          provider_id: overclaimInspection.providerId,
          os_attestation_url: overclaimProvider.url
        }),
      { code: "GOAL3_SOURCE_RELEASE_OS_IMMUTABILITY_ATTESTATION_INVALID" },
      "Task315 must reject OS attestation responses that claim proof, restore, promotion, enforcement, or GA authority"
    );
  } finally {
    await overclaimProvider.close();
  }

  const readyInspection = await createPolicyInspectionArtifact("READY");
  const readyProvider = await withProvider("/os-attest", (request) => osAttestationResponseFromRequest(request));
  let attestation;
  try {
    attestation = await recordGoal3SourceReleaseOsImmutabilityAttestation(projectRoot, {
      project_id: projectId,
      attestation_id: "GOAL3-SOURCE-RELEASE-OS-IMMUTABILITY-0315-READY",
      actor: `goal3-task315 ${projectRoot} token=plain-token formally_checked GA certified can_certify_ga=true`,
      policy_inspection_id: readyInspection.inspection.inspection_id,
      policy_inspection_path: readyInspection.inspection.inspection_path,
      policy_inspection_sha256: readyInspection.inspection.inspection_artifact.sha256,
      provider_id: readyInspection.providerId,
      os_attestation_url: readyProvider.url,
      provider_terms_url: "https://example.invalid/provider/os-attestation"
    });
    assert.equal(readyProvider.requests.length, 1);
    assert.equal(readyProvider.requests[0].method, "POST");
    assert.equal(readyProvider.requests[0].body.schema_version, "comath.goal3_os_immutability_attestation_request.v1");
    assert.equal(readyProvider.requests[0].body.policy_inspection_id, readyInspection.inspection.inspection_id);
    assert.equal(readyProvider.requests[0].body.policy_inspection_sha256, readyInspection.inspection.inspection_artifact.sha256);
    assert.equal(readyProvider.requests[0].body.evidence_kind, "os_immutable_storage");
    assert.equal(
      readyProvider.requests[0].body.provider_policy_response_sha256,
      readyInspection.inspection.provider_policy_response_sha256
    );
    assert.equal(readyProvider.requests[0].body.proof_authority, "none");
    assert.equal(readyProvider.requests[0].body.can_promote_claim, false);
    assert.equal(
      readyProvider.requests[0].headers.authorization,
      undefined,
      "Task315 test provider must not receive a persisted secret header"
    );
  } finally {
    await readyProvider.close();
  }

  assert.equal(attestation.schema_version, "comath.goal3_source_release_os_immutability_attestation.v1");
  assert.equal(attestation.ok, true);
  assert.equal(attestation.os_immutability_attestation_status, "os_immutability_attested");
  assert.equal(attestation.policy_inspection_current, true);
  assert.equal(attestation.source_archive_current, true);
  assert.equal(attestation.operator_evidence_current, true);
  assert.equal(attestation.evidence_kind, "os_immutable_storage");
  assert.equal(attestation.os_immutability_attestation_performed, true);
  assert.equal(attestation.os_immutability_result, "provider_attested");
  assert.equal(attestation.provider_os_immutability_attestation_bound, true);
  assert.equal(attestation.co_math_os_immutability_enforced, false);
  assert.equal(attestation.proof_authority, "none");
  assert.equal(attestation.can_restore, false);
  assert.equal(attestation.can_promote_claim, false);
  assert.equal(attestation.can_certify_ga, false);
  assert.equal(attestation.attestation_is_proof_authority, false);
  assert.equal(attestation.storage_is_proof_authority, false);
  assert.equal(attestation.attestation_is_restore_source, false);
  assert.equal(attestation.result_can_be_used_as_proof, false);
  assert.equal(attestation.requires_separate_lean_authority, true);
  assertProjectRelative(attestation.attestation_path, "attestation_path");
  assertProjectRelative(attestation.policy_inspection_artifact.path, "policy_inspection_artifact.path");
  assertProjectRelative(attestation.operator_evidence_artifact.path, "operator_evidence_artifact.path");
  assertNoPublicLeak(attestation, "Task315 OS immutability attestation result");

  const persisted = readJson(attestation.attestation_path);
  assert.equal(persisted.attestation_artifact, undefined);
  assert.equal(persisted.policy_inspection_sha256, readyInspection.inspection.inspection_artifact.sha256);
  assert.equal(persisted.os_attestation_response_status, 200);
  assert.equal(persisted.os_immutability_attestation_performed, true);
  assert.equal(persisted.can_certify_ga, false);

  const server = createComathServer();
  const routeInspection = await createPolicyInspectionArtifact("ROUTE");
  const routeProvider = await withProvider("/os-attest", (request) => osAttestationResponseFromRequest(request));
  try {
    const routeResponse = await server.inject({
      method: "POST",
      path: "/release/goal3/source-release-os-immutability-attestation",
      body: {
        project_root: projectRoot,
        project_id: projectId,
        attestation_id: "GOAL3-SOURCE-RELEASE-OS-IMMUTABILITY-0315-ROUTE",
        actor: "goal3-task315 route token=plain-token formally_checked GA certified can_certify_ga=true",
        policy_inspection_id: routeInspection.inspection.inspection_id,
        policy_inspection_path: routeInspection.inspection.inspection_path,
        policy_inspection_sha256: routeInspection.inspection.inspection_artifact.sha256,
        provider_id: routeInspection.providerId,
        os_attestation_url: routeProvider.url
      }
    });
    assert.equal(routeResponse.status, 200, JSON.stringify(routeResponse.body));
    assert.equal(routeResponse.body.source_release_os_immutability_attestation.proof_authority, "none");
    assert.equal(routeResponse.body.source_release_os_immutability_attestation.can_restore, false);
    assert.equal(routeResponse.body.source_release_os_immutability_attestation.can_promote_claim, false);
    assert.equal(routeResponse.body.source_release_os_immutability_attestation.can_certify_ga, false);
    assert.equal(routeResponse.body.source_release_os_immutability_attestation.os_immutability_attestation_performed, true);
    assert.equal(routeResponse.body.source_release_os_immutability_attestation.co_math_os_immutability_enforced, false);
    assertNoPublicLeak(routeResponse.body, "Task315 public route response");
  } finally {
    await routeProvider.close();
  }

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (entry) =>
        entry.event_type === "release.goal3_source_release_os_immutability_attestation_recorded" &&
        entry.payload.attestation_id === "GOAL3-SOURCE-RELEASE-OS-IMMUTABILITY-0315-ROUTE" &&
        entry.payload.policy_inspection_id === routeInspection.inspection.inspection_id &&
        entry.payload.policy_inspection_sha256 === routeInspection.inspection.inspection_artifact.sha256 &&
        entry.payload.evidence_kind === "os_immutable_storage" &&
        entry.payload.os_immutability_attestation_performed === true &&
        entry.payload.os_immutability_result === "provider_attested" &&
        entry.payload.proof_authority === "none" &&
        entry.payload.can_restore === false &&
        entry.payload.can_promote_claim === false &&
        entry.payload.can_certify_ga === false
    ),
    true,
    "Task315 gate must emit OS immutability attestation provenance"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task315 source release OS immutability attestation tests passed.");
