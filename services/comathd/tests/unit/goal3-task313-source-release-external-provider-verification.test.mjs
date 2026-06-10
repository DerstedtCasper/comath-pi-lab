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
  recordGoal3SourceReleaseExternalProviderVerification,
  recordGoal3SourceReleasePublicChecklist
} = comath;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task313-provider-verification-"));
const init = initProject({
  name: "Goal 3 Task313 source release external provider verification",
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
    actor: "goal3-task313 fixture",
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
    actor: "goal3-task313 presentation fixture",
    source_review_artifact_id: sourceArtifact.body.source_review_artifact_id,
    source_review_artifact_path: sourceArtifact.path,
    source_review_artifact_sha256: sourceArtifact.sha256
  });
}

function createChecklist(checklistId, artifactSuffix) {
  const presentation = createPresentation(`GOAL3-SOURCE-PRESENTATION-0313-${artifactSuffix}`, `0313-${artifactSuffix}`);
  return recordGoal3SourceReleasePublicChecklist(projectRoot, {
    project_id: projectId,
    checklist_id: checklistId,
    actor: "goal3-task313 checklist fixture",
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
      verification_instructions: "Task313 provider must verify this receipt with the external provider."
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
  const checklist = createChecklist(`GOAL3-SOURCE-RELEASE-CHECKLIST-0313-${artifactSuffix}`, artifactSuffix);
  const notary = writeOperatorEvidence(`GOAL3-EXTERNAL-EVIDENCE-0313-${artifactSuffix}-NOTARY`, "external_notarization", checklist);
  const immutable = writeOperatorEvidence(`GOAL3-EXTERNAL-EVIDENCE-0313-${artifactSuffix}-IMMUTABLE`, "os_immutable_storage", checklist);
  const binding = recordGoal3SourceReleaseExternalEvidenceBinding(projectRoot, {
    project_id: projectId,
    binding_id: bindingId,
    actor: "goal3-task313 binding fixture",
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

async function withProvider(handler) {
  const requests = [];
  const server = createServer(async (req, res) => {
    const bodyText = await readRequestBody(req);
    const body = bodyText ? JSON.parse(bodyText) : {};
    requests.push({ method: req.method, url: req.url, headers: req.headers, body });
    const response = handler(body);
    res.statusCode = response.status ?? 200;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(`${JSON.stringify(response.body)}\n`);
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  const url = `http://127.0.0.1:${address.port}/verify`;
  return {
    url,
    requests,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  };
}

function providerResponseFromRequest(requestBody, overrides = {}) {
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
    typeof recordGoal3SourceReleaseExternalProviderVerification,
    "function",
    "Task313 must export a service-owned external provider verification gate"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("goal3_source_release_external_provider_verification_gate"),
    true,
    "Task313 capability ledger must advertise the external provider verification gate"
  );
  for (const [path, pattern] of [
    ["README.md", /Task313.*external provider verification/s],
    ["TODO.md", /Task313.*external provider verification/s],
    ["REVIEW.md", /Goal 3 Task 313/s],
    ["AGENTS.md", /Task313.*external provider verification/s],
    ["docs/architecture/ga-release-criteria.md", /Task313.*external provider verification/s],
    ["docs/architecture/threat-model.md", /Task313.*external provider verification/s],
    ["docs/architecture/evidence-pack-policy.md", /Task313.*external provider verification/s],
    ["docs/architecture/acceptance-matrix.md", /Task313.*external provider verification/s],
    ["docs/architecture/adapter-contracts.md", /Task313.*external provider verification/s]
  ]) {
    assert.match(repoFile(path), pattern, `${path} must document Task313 external provider verification`);
  }
  assert.equal(
    repoFile("scripts/phase0-smoke.mjs").includes("goal3-task313-source-release-external-provider-verification.test.mjs"),
    true,
    "phase0 smoke must discover the Task313 focused suite"
  );

  const staleBinding = createBinding(
    "GOAL3-SOURCE-RELEASE-EXTERNAL-EVIDENCE-0313-STALE-BINDING",
    "STALE-BINDING"
  ).binding;
  const staleProvider = await withProvider((request) => providerResponseFromRequest(request));
  try {
    await assert.rejects(
      () =>
        recordGoal3SourceReleaseExternalProviderVerification(projectRoot, {
          project_id: projectId,
          verification_id: "GOAL3-SOURCE-RELEASE-PROVIDER-VERIFICATION-0313-STALE-BINDING",
          actor: "goal3-task313 stale binding",
          binding_id: staleBinding.binding_id,
          binding_path: staleBinding.binding_path,
          binding_sha256: "0".repeat(64),
          evidence_kind: "external_notarization",
          provider_id: "example-notary",
          provider_verify_url: staleProvider.url
        }),
      { code: "GOAL3_SOURCE_RELEASE_EXTERNAL_PROVIDER_VERIFICATION_STALE" },
      "Task313 must reject stale Task311 binding hashes before calling the provider"
    );
    assert.equal(staleProvider.requests.length, 0, "Task313 must not call provider after stale local binding input");
    assert.equal(
      existsSync(join(projectRoot, verificationPath("GOAL3-SOURCE-RELEASE-PROVIDER-VERIFICATION-0313-STALE-BINDING"))),
      false,
      "Task313 must not write partial verification material after stale binding input"
    );
  } finally {
    await staleProvider.close();
  }

  const driftBinding = createBinding("GOAL3-SOURCE-RELEASE-EXTERNAL-EVIDENCE-0313-DRIFT", "DRIFT").binding;
  const driftBindingPath = join(projectRoot, driftBinding.binding_path);
  const driftBindingBody = readJson(driftBinding.binding_path);
  driftBindingBody.checklist_id = "GOAL3-SOURCE-RELEASE-CHECKLIST-0313-DRIFTED";
  const driftBindingText = `${JSON.stringify(driftBindingBody, null, 2)}\n`;
  writeFileSync(driftBindingPath, driftBindingText, "utf8");
  const driftProvider = await withProvider((request) => providerResponseFromRequest(request));
  try {
    await assert.rejects(
      () =>
        recordGoal3SourceReleaseExternalProviderVerification(projectRoot, {
          project_id: projectId,
          verification_id: "GOAL3-SOURCE-RELEASE-PROVIDER-VERIFICATION-0313-DRIFT",
          actor: "goal3-task313 binding drift",
          binding_id: driftBinding.binding_id,
          binding_path: driftBinding.binding_path,
          binding_sha256: sha256Text(driftBindingText),
          evidence_kind: "external_notarization",
          provider_id: "example-notary",
          provider_verify_url: driftProvider.url
        }),
      { code: "GOAL3_SOURCE_RELEASE_EXTERNAL_PROVIDER_VERIFICATION_INVALID" },
      "Task313 must reject Task311 bindings whose checklist id/path/sha fields drift from the bound artifact"
    );
    assert.equal(driftProvider.requests.length, 0, "Task313 must not call provider after local binding target drift");
    assert.equal(
      existsSync(join(projectRoot, verificationPath("GOAL3-SOURCE-RELEASE-PROVIDER-VERIFICATION-0313-DRIFT"))),
      false,
      "Task313 must not write partial verification material after local binding target drift"
    );
  } finally {
    await driftProvider.close();
  }

  const mismatchBinding = createBinding(
    "GOAL3-SOURCE-RELEASE-EXTERNAL-EVIDENCE-0313-MISMATCH",
    "MISMATCH"
  ).binding;
  const mismatchProvider = await withProvider((request) =>
    providerResponseFromRequest(request, {
      source_archive_sha256: "f".repeat(64)
    })
  );
  try {
    await assert.rejects(
      () =>
        recordGoal3SourceReleaseExternalProviderVerification(projectRoot, {
          project_id: projectId,
          verification_id: "GOAL3-SOURCE-RELEASE-PROVIDER-VERIFICATION-0313-MISMATCH",
          actor: "goal3-task313 provider mismatch",
          binding_id: mismatchBinding.binding_id,
          binding_path: mismatchBinding.binding_path,
          binding_sha256: mismatchBinding.binding_artifact.sha256,
          evidence_kind: "external_notarization",
          provider_id: "example-notary",
          provider_verify_url: mismatchProvider.url
        }),
      { code: "GOAL3_SOURCE_RELEASE_EXTERNAL_PROVIDER_VERIFICATION_INVALID" },
      "Task313 must reject provider responses that do not bind the current source archive hash"
    );
    assert.equal(mismatchProvider.requests.length, 1, "Task313 must make exactly one provider call for a fresh binding");
    assert.equal(
      existsSync(join(projectRoot, verificationPath("GOAL3-SOURCE-RELEASE-PROVIDER-VERIFICATION-0313-MISMATCH"))),
      false,
      "Task313 must not write partial verification material after provider mismatch"
    );
  } finally {
    await mismatchProvider.close();
  }

  const overclaimBinding = createBinding(
    "GOAL3-SOURCE-RELEASE-EXTERNAL-EVIDENCE-0313-OVERCLAIM",
    "OVERCLAIM"
  ).binding;
  const overclaimProvider = await withProvider((request) =>
    providerResponseFromRequest(request, {
      can_certify_ga: true,
      proof_authority: "lean"
    })
  );
  try {
    await assert.rejects(
      () =>
        recordGoal3SourceReleaseExternalProviderVerification(projectRoot, {
          project_id: projectId,
          verification_id: "GOAL3-SOURCE-RELEASE-PROVIDER-VERIFICATION-0313-OVERCLAIM",
          actor: "goal3-task313 provider overclaim",
          binding_id: overclaimBinding.binding_id,
          binding_path: overclaimBinding.binding_path,
          binding_sha256: overclaimBinding.binding_artifact.sha256,
          evidence_kind: "external_notarization",
          provider_id: "example-notary",
          provider_verify_url: overclaimProvider.url
        }),
      { code: "GOAL3_SOURCE_RELEASE_EXTERNAL_PROVIDER_VERIFICATION_INVALID" },
      "Task313 must reject provider responses that claim proof authority or GA certification"
    );
  } finally {
    await overclaimProvider.close();
  }

  const shadowOverclaimBinding = createBinding(
    "GOAL3-SOURCE-RELEASE-EXTERNAL-EVIDENCE-0313-SHADOW-OVERCLAIM",
    "SHADOW-OVERCLAIM"
  ).binding;
  const shadowOverclaimProvider = await withProvider((request) =>
    providerResponseFromRequest(request, {
      proof_authority: "none",
      can_restore: false,
      can_promote_claim: false,
      can_certify_ga: false,
      restore_source: true,
      provider_result_is_proof_authority: true,
      result_can_be_used_as_proof: true,
      verification_is_os_immutability_proof: true
    })
  );
  try {
    await assert.rejects(
      () =>
        recordGoal3SourceReleaseExternalProviderVerification(projectRoot, {
          project_id: projectId,
          verification_id: "GOAL3-SOURCE-RELEASE-PROVIDER-VERIFICATION-0313-SHADOW-OVERCLAIM",
          actor: "goal3-task313 provider shadow overclaim",
          binding_id: shadowOverclaimBinding.binding_id,
          binding_path: shadowOverclaimBinding.binding_path,
          binding_sha256: shadowOverclaimBinding.binding_artifact.sha256,
          evidence_kind: "external_notarization",
          provider_id: "example-notary",
          provider_verify_url: shadowOverclaimProvider.url
        }),
      { code: "GOAL3_SOURCE_RELEASE_EXTERNAL_PROVIDER_VERIFICATION_INVALID" },
      "Task313 must reject provider responses with extra proof, restore, or immutability authority fields"
    );
    assert.equal(
      existsSync(join(projectRoot, verificationPath("GOAL3-SOURCE-RELEASE-PROVIDER-VERIFICATION-0313-SHADOW-OVERCLAIM"))),
      false,
      "Task313 must not write partial verification material after provider shadow overclaim"
    );
  } finally {
    await shadowOverclaimProvider.close();
  }

  const traversalFixture = createBinding(
    "GOAL3-SOURCE-RELEASE-EXTERNAL-EVIDENCE-0313-TRAVERSAL",
    "TRAVERSAL"
  );
  const traversalPath = traversalFixture.binding.source_archive.archive_path.replace(
    ".comath/release/goal3-source-only-open-source-review-artifact/",
    ".comath/release/goal3-source-only-open-source-review-artifact/../goal3-source-only-open-source-review-artifact/"
  );
  const traversalEvidenceBody = readJson(traversalFixture.notary.path);
  traversalEvidenceBody.source_archive_path = traversalPath;
  const traversalEvidenceText = `${JSON.stringify(traversalEvidenceBody, null, 2)}\n`;
  writeFileSync(join(projectRoot, traversalFixture.notary.path), traversalEvidenceText, "utf8");
  const traversalBindingBody = readJson(traversalFixture.binding.binding_path);
  traversalBindingBody.source_archive.archive_path = traversalPath;
  traversalBindingBody.external_notarization_evidence_artifact.sha256 = sha256Text(traversalEvidenceText);
  traversalBindingBody.external_notarization_evidence_artifact.size_bytes = Buffer.byteLength(
    traversalEvidenceText,
    "utf8"
  );
  const traversalBindingText = `${JSON.stringify(traversalBindingBody, null, 2)}\n`;
  writeFileSync(join(projectRoot, traversalFixture.binding.binding_path), traversalBindingText, "utf8");
  const traversalProvider = await withProvider((request) => providerResponseFromRequest(request));
  try {
    await assert.rejects(
      () =>
        recordGoal3SourceReleaseExternalProviderVerification(projectRoot, {
          project_id: projectId,
          verification_id: "GOAL3-SOURCE-RELEASE-PROVIDER-VERIFICATION-0313-TRAVERSAL",
          actor: "goal3-task313 source archive traversal",
          binding_id: traversalFixture.binding.binding_id,
          binding_path: traversalFixture.binding.binding_path,
          binding_sha256: sha256Text(traversalBindingText),
          evidence_kind: "external_notarization",
          provider_id: "example-notary",
          provider_verify_url: traversalProvider.url
        }),
      { code: "GOAL3_SOURCE_RELEASE_EXTERNAL_PROVIDER_VERIFICATION_INVALID" },
      "Task313 must reject Task311 bindings whose source archive path contains traversal even when bytes match"
    );
    assert.equal(traversalProvider.requests.length, 0, "Task313 must not call provider after local source archive traversal");
  } finally {
    await traversalProvider.close();
  }

  const readyBinding = createBinding("GOAL3-SOURCE-RELEASE-EXTERNAL-EVIDENCE-0313-READY", "READY").binding;
  const readyProvider = await withProvider((request) => providerResponseFromRequest(request));
  let verification;
  try {
    verification = await recordGoal3SourceReleaseExternalProviderVerification(projectRoot, {
      project_id: projectId,
      verification_id: "GOAL3-SOURCE-RELEASE-PROVIDER-VERIFICATION-0313-READY",
      actor: `goal3-task313 ${projectRoot} token=plain-token formally_checked GA certified can_certify_ga=true`,
      binding_id: readyBinding.binding_id,
      binding_path: readyBinding.binding_path,
      binding_sha256: readyBinding.binding_artifact.sha256,
      evidence_kind: "external_notarization",
      provider_id: "example-notary",
      provider_verify_url: readyProvider.url,
      provider_terms_url: "https://example.invalid/provider/terms"
    });
    assert.equal(readyProvider.requests.length, 1);
    assert.equal(readyProvider.requests[0].method, "POST");
    assert.equal(readyProvider.requests[0].body.schema_version, "comath.goal3_external_provider_verification_request.v1");
    assert.equal(readyProvider.requests[0].body.binding_id, readyBinding.binding_id);
    assert.equal(readyProvider.requests[0].body.binding_sha256, readyBinding.binding_artifact.sha256);
    assert.equal(readyProvider.requests[0].body.source_archive_sha256, readyBinding.source_archive.archive_sha256);
    assert.equal(readyProvider.requests[0].body.evidence_sha256, readyBinding.external_notarization_evidence_artifact.sha256);
    assert.equal(readyProvider.requests[0].body.proof_authority, "none");
    assert.equal(readyProvider.requests[0].body.can_promote_claim, false);
    assert.equal(readyProvider.requests[0].headers.authorization, undefined, "Task313 test provider must not receive a persisted secret header");
  } finally {
    await readyProvider.close();
  }

  assert.equal(verification.schema_version, "comath.goal3_source_release_external_provider_verification.v1");
  assert.equal(verification.ok, true);
  assert.equal(verification.external_provider_verification_status, "provider_response_verified");
  assert.equal(verification.binding_current, true);
  assert.equal(verification.source_archive_current, true);
  assert.equal(verification.operator_evidence_current, true);
  assert.equal(verification.evidence_kind, "external_notarization");
  assert.equal(verification.external_verification_performed, true);
  assert.equal(verification.external_verification_result, "provider_verified");
  assert.equal(verification.proof_authority, "none");
  assert.equal(verification.can_restore, false);
  assert.equal(verification.can_promote_claim, false);
  assert.equal(verification.can_certify_ga, false);
  assert.equal(verification.verification_is_proof_authority, false);
  assert.equal(verification.verification_is_os_immutability_proof, false);
  assert.equal(verification.requires_separate_lean_authority, true);
  assert.equal(verification.requires_separate_os_policy_inspection, true);
  assertProjectRelative(verification.verification_path, "verification_path");
  assertProjectRelative(verification.binding_artifact.path, "binding_artifact.path");
  assertProjectRelative(verification.operator_evidence_artifact.path, "operator_evidence_artifact.path");
  assertNoPublicLeak(verification, "Task313 verification result");

  const persisted = readJson(verification.verification_path);
  assert.equal(persisted.verification_artifact, undefined);
  assert.equal(persisted.binding_sha256, readyBinding.binding_artifact.sha256);
  assert.equal(persisted.provider_response_status, 200);
  assert.equal(persisted.external_verification_performed, true);
  assert.equal(persisted.can_certify_ga, false);

  const server = createComathServer();
  const routeBinding = createBinding("GOAL3-SOURCE-RELEASE-EXTERNAL-EVIDENCE-0313-ROUTE", "ROUTE").binding;
  const routeProvider = await withProvider((request) => providerResponseFromRequest(request));
  try {
    const routeResponse = await server.inject({
      method: "POST",
      path: "/release/goal3/source-release-external-provider-verification",
      body: {
        project_root: projectRoot,
        project_id: projectId,
        verification_id: "GOAL3-SOURCE-RELEASE-PROVIDER-VERIFICATION-0313-ROUTE",
        actor: "goal3-task313 route token=plain-token formally_checked GA certified can_certify_ga=true",
        binding_id: routeBinding.binding_id,
        binding_path: routeBinding.binding_path,
        binding_sha256: routeBinding.binding_artifact.sha256,
        evidence_kind: "external_notarization",
        provider_id: "example-notary",
        provider_verify_url: routeProvider.url
      }
    });
    assert.equal(routeResponse.status, 200, JSON.stringify(routeResponse.body));
    assert.equal(routeResponse.body.source_release_external_provider_verification.proof_authority, "none");
    assert.equal(routeResponse.body.source_release_external_provider_verification.can_restore, false);
    assert.equal(routeResponse.body.source_release_external_provider_verification.can_promote_claim, false);
    assert.equal(routeResponse.body.source_release_external_provider_verification.can_certify_ga, false);
    assert.equal(routeResponse.body.source_release_external_provider_verification.external_verification_performed, true);
    assert.equal(
      routeResponse.body.source_release_external_provider_verification.requires_separate_lean_authority,
      true
    );
    assertNoPublicLeak(routeResponse.body, "Task313 public route response");
  } finally {
    await routeProvider.close();
  }

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (entry) =>
        entry.event_type === "release.goal3_source_release_external_provider_verification_recorded" &&
        entry.payload.verification_id === "GOAL3-SOURCE-RELEASE-PROVIDER-VERIFICATION-0313-ROUTE" &&
        entry.payload.binding_id === routeBinding.binding_id &&
        entry.payload.binding_sha256 === routeBinding.binding_artifact.sha256 &&
        entry.payload.source_archive_sha256 === routeBinding.source_archive.archive_sha256 &&
        entry.payload.external_verification_performed === true &&
        entry.payload.external_verification_result === "provider_verified" &&
        entry.payload.proof_authority === "none" &&
        entry.payload.can_restore === false &&
        entry.payload.can_promote_claim === false &&
        entry.payload.can_certify_ga === false
    ),
    true,
    "Task313 gate must emit external provider verification provenance"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task313 source release external provider verification tests passed.");
