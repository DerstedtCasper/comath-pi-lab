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
  recordGoal3SourceReleasePublicChecklist
} = comath;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task314-provider-policy-"));
const init = initProject({
  name: "Goal 3 Task314 source release external provider policy inspection",
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

function verificationPath(verificationId) {
  return `.comath/release/goal3-source-release-external-provider-verification/${verificationId}/provider-verification.json`;
}

function policyInspectionPath(inspectionId) {
  return `.comath/release/goal3-source-release-external-provider-policy-inspection/${inspectionId}/policy-inspection.json`;
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
    actor: "goal3-task314 fixture",
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
    actor: "goal3-task314 presentation fixture",
    source_review_artifact_id: sourceArtifact.body.source_review_artifact_id,
    source_review_artifact_path: sourceArtifact.path,
    source_review_artifact_sha256: sourceArtifact.sha256
  });
}

function createChecklist(checklistId, artifactSuffix) {
  const presentation = createPresentation(`GOAL3-SOURCE-PRESENTATION-0314-${artifactSuffix}`, `0314-${artifactSuffix}`);
  return recordGoal3SourceReleasePublicChecklist(projectRoot, {
    project_id: projectId,
    checklist_id: checklistId,
    actor: "goal3-task314 checklist fixture",
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
      verification_instructions: "Task314 provider policy endpoint must inspect this receipt policy."
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
  const checklist = createChecklist(`GOAL3-SOURCE-RELEASE-CHECKLIST-0314-${artifactSuffix}`, artifactSuffix);
  const notary = writeOperatorEvidence(`GOAL3-EXTERNAL-EVIDENCE-0314-${artifactSuffix}-NOTARY`, "external_notarization", checklist);
  const immutable = writeOperatorEvidence(`GOAL3-EXTERNAL-EVIDENCE-0314-${artifactSuffix}-IMMUTABLE`, "os_immutable_storage", checklist);
  const binding = recordGoal3SourceReleaseExternalEvidenceBinding(projectRoot, {
    project_id: projectId,
    binding_id: bindingId,
    actor: "goal3-task314 binding fixture",
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

async function createVerifiedProviderArtifact(suffix, evidenceKind = "external_notarization") {
  const binding = createBinding(`GOAL3-SOURCE-RELEASE-EXTERNAL-EVIDENCE-0314-${suffix}`, suffix).binding;
  const providerId = evidenceKind === "external_notarization" ? "example-notary" : "example-immutable-store";
  const provider = await withProvider("/verify", (request) => verificationResponseFromRequest(request));
  try {
    const verificationId = `GOAL3-SOURCE-RELEASE-PROVIDER-VERIFICATION-0314-${suffix}`;
    const verification = await recordGoal3SourceReleaseExternalProviderVerification(projectRoot, {
      project_id: projectId,
      verification_id: verificationId,
      actor: "goal3-task314 provider verification fixture",
      binding_id: binding.binding_id,
      binding_path: binding.binding_path,
      binding_sha256: binding.binding_artifact.sha256,
      evidence_kind: evidenceKind,
      provider_id: providerId,
      provider_verify_url: provider.url
    });
    return { binding, providerId, verification, verificationPath: verificationPath(verificationId) };
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
    typeof recordGoal3SourceReleaseExternalProviderPolicyInspection,
    "function",
    "Task314 must export a service-owned external provider policy inspection gate"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("goal3_source_release_external_provider_policy_inspection_gate"),
    true,
    "Task314 capability ledger must advertise the external provider policy inspection gate"
  );
  for (const [path, pattern] of [
    ["README.md", /Task314.*provider policy inspection/s],
    ["TODO.md", /Task314.*provider policy inspection/s],
    ["REVIEW.md", /Goal 3 Task 314/s],
    ["AGENTS.md", /Task314.*provider policy inspection/s],
    ["docs/architecture/ga-release-criteria.md", /Task314.*provider policy inspection/s],
    ["docs/architecture/threat-model.md", /Task314.*provider policy inspection/s],
    ["docs/architecture/evidence-pack-policy.md", /Task314.*provider policy inspection/s],
    ["docs/architecture/acceptance-matrix.md", /Task314.*provider policy inspection/s],
    ["docs/architecture/adapter-contracts.md", /Task314.*provider policy inspection/s]
  ]) {
    assert.match(repoFile(path), pattern, `${path} must document Task314 provider policy inspection`);
  }
  assert.equal(
    repoFile("scripts/phase0-smoke.mjs").includes("goal3-task314-source-release-external-provider-policy-inspection.test.mjs"),
    true,
    "phase0 smoke must discover the Task314 focused suite"
  );

  const staleVerification = await createVerifiedProviderArtifact("STALE-VERIFICATION");
  const stalePolicyProvider = await withProvider("/policy", (request) => policyResponseFromRequest(request));
  try {
    await assert.rejects(
      () =>
        recordGoal3SourceReleaseExternalProviderPolicyInspection(projectRoot, {
          project_id: projectId,
          inspection_id: "GOAL3-SOURCE-RELEASE-PROVIDER-POLICY-0314-STALE-VERIFICATION",
          actor: "goal3-task314 stale verification",
          verification_id: staleVerification.verification.verification_id,
          verification_path: staleVerification.verification.verification_path,
          verification_sha256: "0".repeat(64),
          provider_id: staleVerification.providerId,
          provider_policy_url: stalePolicyProvider.url
        }),
      { code: "GOAL3_SOURCE_RELEASE_EXTERNAL_PROVIDER_POLICY_INSPECTION_STALE" },
      "Task314 must reject stale Task313 verification hashes before calling the policy provider"
    );
    assert.equal(stalePolicyProvider.requests.length, 0, "Task314 must not call provider after stale Task313 input");
    assert.equal(
      existsSync(
        join(projectRoot, policyInspectionPath("GOAL3-SOURCE-RELEASE-PROVIDER-POLICY-0314-STALE-VERIFICATION"))
      ),
      false,
      "Task314 must not write partial policy inspection material after stale Task313 input"
    );
  } finally {
    await stalePolicyProvider.close();
  }

  const mismatchVerification = await createVerifiedProviderArtifact("MISMATCH");
  const mismatchPolicyProvider = await withProvider("/policy", (request) =>
    policyResponseFromRequest(request, {
      provider_verification_request_sha256: "e".repeat(64),
      provider_verification_response_body_sha256: "d".repeat(64)
    })
  );
  try {
    await assert.rejects(
      () =>
        recordGoal3SourceReleaseExternalProviderPolicyInspection(projectRoot, {
          project_id: projectId,
          inspection_id: "GOAL3-SOURCE-RELEASE-PROVIDER-POLICY-0314-MISMATCH",
          actor: "goal3-task314 policy mismatch",
          verification_id: mismatchVerification.verification.verification_id,
          verification_path: mismatchVerification.verification.verification_path,
          verification_sha256: mismatchVerification.verification.verification_artifact.sha256,
          provider_id: mismatchVerification.providerId,
          provider_policy_url: mismatchPolicyProvider.url
        }),
      { code: "GOAL3_SOURCE_RELEASE_EXTERNAL_PROVIDER_POLICY_INSPECTION_INVALID" },
      "Task314 must reject policy provider responses that do not bind the Task313 provider verification response hash"
    );
    assert.equal(mismatchPolicyProvider.requests.length, 1, "Task314 must call policy provider once for fresh Task313 input");
    assert.equal(
      existsSync(join(projectRoot, policyInspectionPath("GOAL3-SOURCE-RELEASE-PROVIDER-POLICY-0314-MISMATCH"))),
      false,
      "Task314 must not write partial policy inspection material after provider policy mismatch"
    );
  } finally {
    await mismatchPolicyProvider.close();
  }

  const headerLeakVerification = await createVerifiedProviderArtifact("HEADER-LEAK");
  const headerLeakPolicyProvider = await withProvider("/policy", (request) => ({
    ...policyResponseFromRequest(request),
    contentType: "application/json; token=plain-token"
  }));
  try {
    await assert.rejects(
      () =>
        recordGoal3SourceReleaseExternalProviderPolicyInspection(projectRoot, {
          project_id: projectId,
          inspection_id: "GOAL3-SOURCE-RELEASE-PROVIDER-POLICY-0314-HEADER-LEAK",
          actor: "goal3-task314 policy header leak",
          verification_id: headerLeakVerification.verification.verification_id,
          verification_path: headerLeakVerification.verification.verification_path,
          verification_sha256: headerLeakVerification.verification.verification_artifact.sha256,
          provider_id: headerLeakVerification.providerId,
          provider_policy_url: headerLeakPolicyProvider.url
        }),
      { code: "GOAL3_SOURCE_RELEASE_EXTERNAL_PROVIDER_POLICY_INSPECTION_INVALID" },
      "Task314 must reject provider policy response headers that contain secret-looking material"
    );
    assert.equal(headerLeakPolicyProvider.requests.length, 1, "Task314 must make exactly one provider policy call");
    assert.equal(
      existsSync(join(projectRoot, policyInspectionPath("GOAL3-SOURCE-RELEASE-PROVIDER-POLICY-0314-HEADER-LEAK"))),
      false,
      "Task314 must not write partial policy inspection material after a provider header leak"
    );
  } finally {
    await headerLeakPolicyProvider.close();
  }

  const overclaimVerification = await createVerifiedProviderArtifact("OVERCLAIM");
  const overclaimPolicyProvider = await withProvider("/policy", (request) =>
    policyResponseFromRequest(request, {
      proof_authority: "lean",
      can_restore: true,
      can_certify_ga: true,
      policy_result_is_proof_authority: true,
      result_can_be_used_as_proof: true,
      policy_inspection_is_os_immutability_proof: true,
      os_immutability_enforced: true
    })
  );
  try {
    await assert.rejects(
      () =>
        recordGoal3SourceReleaseExternalProviderPolicyInspection(projectRoot, {
          project_id: projectId,
          inspection_id: "GOAL3-SOURCE-RELEASE-PROVIDER-POLICY-0314-OVERCLAIM",
          actor: "goal3-task314 policy overclaim",
          verification_id: overclaimVerification.verification.verification_id,
          verification_path: overclaimVerification.verification.verification_path,
          verification_sha256: overclaimVerification.verification.verification_artifact.sha256,
          provider_id: overclaimVerification.providerId,
          provider_policy_url: overclaimPolicyProvider.url
        }),
      { code: "GOAL3_SOURCE_RELEASE_EXTERNAL_PROVIDER_POLICY_INSPECTION_INVALID" },
      "Task314 must reject provider policy responses that claim proof, restore, OS immutability, or GA authority"
    );
  } finally {
    await overclaimPolicyProvider.close();
  }

  const aliasOverclaimVerification = await createVerifiedProviderArtifact("ALIAS-OVERCLAIM");
  const aliasOverclaimPolicyProvider = await withProvider("/policy", (request) =>
    policyResponseFromRequest(request, {
      ga_certified: true,
      restore_available: true,
      os_immutability_attestation: true
    })
  );
  try {
    await assert.rejects(
      () =>
        recordGoal3SourceReleaseExternalProviderPolicyInspection(projectRoot, {
          project_id: projectId,
          inspection_id: "GOAL3-SOURCE-RELEASE-PROVIDER-POLICY-0314-ALIAS-OVERCLAIM",
          actor: "goal3-task314 policy alias overclaim",
          verification_id: aliasOverclaimVerification.verification.verification_id,
          verification_path: aliasOverclaimVerification.verification.verification_path,
          verification_sha256: aliasOverclaimVerification.verification.verification_artifact.sha256,
          provider_id: aliasOverclaimVerification.providerId,
          provider_policy_url: aliasOverclaimPolicyProvider.url
        }),
      { code: "GOAL3_SOURCE_RELEASE_EXTERNAL_PROVIDER_POLICY_INSPECTION_INVALID" },
      "Task314 must reject provider policy responses with alias proof, restore, OS immutability, or GA overclaim fields"
    );
    assert.equal(
      existsSync(join(projectRoot, policyInspectionPath("GOAL3-SOURCE-RELEASE-PROVIDER-POLICY-0314-ALIAS-OVERCLAIM"))),
      false,
      "Task314 must not write partial policy inspection material after alias overclaims"
    );
  } finally {
    await aliasOverclaimPolicyProvider.close();
  }

  const readyVerification = await createVerifiedProviderArtifact("READY");
  const readyPolicyProvider = await withProvider("/policy", (request) => policyResponseFromRequest(request));
  let inspection;
  try {
    inspection = await recordGoal3SourceReleaseExternalProviderPolicyInspection(projectRoot, {
      project_id: projectId,
      inspection_id: "GOAL3-SOURCE-RELEASE-PROVIDER-POLICY-0314-READY",
      actor: `goal3-task314 ${projectRoot} token=plain-token formally_checked GA certified can_certify_ga=true`,
      verification_id: readyVerification.verification.verification_id,
      verification_path: readyVerification.verification.verification_path,
      verification_sha256: readyVerification.verification.verification_artifact.sha256,
      provider_id: readyVerification.providerId,
      provider_policy_url: readyPolicyProvider.url,
      provider_terms_url: "https://example.invalid/provider/policy"
    });
    assert.equal(readyPolicyProvider.requests.length, 1);
    assert.equal(readyPolicyProvider.requests[0].method, "POST");
    assert.equal(
      readyPolicyProvider.requests[0].body.schema_version,
      "comath.goal3_external_provider_policy_inspection_request.v1"
    );
    assert.equal(readyPolicyProvider.requests[0].body.verification_id, readyVerification.verification.verification_id);
    assert.equal(
      readyPolicyProvider.requests[0].body.verification_sha256,
      readyVerification.verification.verification_artifact.sha256
    );
    assert.equal(
      readyPolicyProvider.requests[0].body.provider_verification_response_sha256,
      readyVerification.verification.provider_response_sha256
    );
    assert.equal(readyPolicyProvider.requests[0].body.binding_sha256, readyVerification.binding.binding_artifact.sha256);
    assert.equal(readyPolicyProvider.requests[0].body.proof_authority, "none");
    assert.equal(readyPolicyProvider.requests[0].body.can_promote_claim, false);
    assert.equal(
      readyPolicyProvider.requests[0].headers.authorization,
      undefined,
      "Task314 test provider must not receive a persisted secret header"
    );
  } finally {
    await readyPolicyProvider.close();
  }

  assert.equal(inspection.schema_version, "comath.goal3_source_release_external_provider_policy_inspection.v1");
  assert.equal(inspection.ok, true);
  assert.equal(inspection.provider_policy_inspection_status, "provider_policy_inspected");
  assert.equal(inspection.verification_current, true);
  assert.equal(inspection.source_archive_current, true);
  assert.equal(inspection.operator_evidence_current, true);
  assert.equal(inspection.provider_policy_inspection_performed, true);
  assert.equal(inspection.provider_policy_result, "provider_policy_current");
  assert.equal(inspection.proof_authority, "none");
  assert.equal(inspection.can_restore, false);
  assert.equal(inspection.can_promote_claim, false);
  assert.equal(inspection.can_certify_ga, false);
  assert.equal(inspection.policy_inspection_is_proof_authority, false);
  assert.equal(inspection.provider_policy_is_proof_authority, false);
  assert.equal(inspection.policy_result_is_proof_authority, false);
  assert.equal(inspection.result_can_be_used_as_proof, false);
  assert.equal(inspection.policy_inspection_is_os_immutability_proof, false);
  assert.equal(inspection.os_immutability_enforced, false);
  assert.equal(inspection.requires_separate_lean_authority, true);
  assert.equal(inspection.requires_separate_os_immutability_attestation, true);
  assertProjectRelative(inspection.inspection_path, "inspection_path");
  assertProjectRelative(inspection.verification_artifact.path, "verification_artifact.path");
  assertProjectRelative(inspection.operator_evidence_artifact.path, "operator_evidence_artifact.path");
  assertNoPublicLeak(inspection, "Task314 policy inspection result");

  const persisted = readJson(inspection.inspection_path);
  assert.equal(persisted.inspection_artifact, undefined);
  assert.equal(persisted.verification_sha256, readyVerification.verification.verification_artifact.sha256);
  assert.equal(persisted.provider_policy_response_status, 200);
  assert.equal(persisted.provider_policy_inspection_performed, true);
  assert.equal(persisted.can_certify_ga, false);

  const server = createComathServer();
  const routeVerification = await createVerifiedProviderArtifact("ROUTE");
  const routePolicyProvider = await withProvider("/policy", (request) => policyResponseFromRequest(request));
  try {
    const routeResponse = await server.inject({
      method: "POST",
      path: "/release/goal3/source-release-external-provider-policy-inspection",
      body: {
        project_root: projectRoot,
        project_id: projectId,
        inspection_id: "GOAL3-SOURCE-RELEASE-PROVIDER-POLICY-0314-ROUTE",
        actor: "goal3-task314 route token=plain-token formally_checked GA certified can_certify_ga=true",
        verification_id: routeVerification.verification.verification_id,
        verification_path: routeVerification.verification.verification_path,
        verification_sha256: routeVerification.verification.verification_artifact.sha256,
        provider_id: routeVerification.providerId,
        provider_policy_url: routePolicyProvider.url
      }
    });
    assert.equal(routeResponse.status, 200, JSON.stringify(routeResponse.body));
    assert.equal(routeResponse.body.source_release_external_provider_policy_inspection.proof_authority, "none");
    assert.equal(routeResponse.body.source_release_external_provider_policy_inspection.can_restore, false);
    assert.equal(routeResponse.body.source_release_external_provider_policy_inspection.can_promote_claim, false);
    assert.equal(routeResponse.body.source_release_external_provider_policy_inspection.can_certify_ga, false);
    assert.equal(
      routeResponse.body.source_release_external_provider_policy_inspection.provider_policy_inspection_performed,
      true
    );
    assert.equal(
      routeResponse.body.source_release_external_provider_policy_inspection.requires_separate_lean_authority,
      true
    );
    assertNoPublicLeak(routeResponse.body, "Task314 public route response");
  } finally {
    await routePolicyProvider.close();
  }

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (entry) =>
        entry.event_type === "release.goal3_source_release_external_provider_policy_inspection_recorded" &&
        entry.payload.inspection_id === "GOAL3-SOURCE-RELEASE-PROVIDER-POLICY-0314-ROUTE" &&
        entry.payload.verification_id === routeVerification.verification.verification_id &&
        entry.payload.verification_sha256 === routeVerification.verification.verification_artifact.sha256 &&
        entry.payload.provider_policy_inspection_performed === true &&
        entry.payload.provider_policy_result === "provider_policy_current" &&
        entry.payload.proof_authority === "none" &&
        entry.payload.can_restore === false &&
        entry.payload.can_promote_claim === false &&
        entry.payload.can_certify_ga === false
    ),
    true,
    "Task314 gate must emit provider policy inspection provenance"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task314 source release external provider policy inspection tests passed.");
