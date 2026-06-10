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
  recordGoal3SourceArtifactPresentationReview,
  recordGoal3SourceReleaseExternalEvidenceBinding,
  recordGoal3SourceReleasePublicChecklist
} = comath;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task311-external-evidence-"));
const init = initProject({
  name: "Goal 3 Task311 source release external evidence binding",
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

function sourceArtifactManifestPath(artifactId) {
  return `.comath/release/goal3-source-only-open-source-review-artifact/${artifactId}/source-artifact.json`;
}

function sourceArtifactArchivePath(artifactId) {
  return `.comath/release/goal3-source-only-open-source-review-artifact/${artifactId}/source.tar`;
}

function externalEvidenceBindingPath(bindingId) {
  return `.comath/release/goal3-source-release-external-evidence-binding/${bindingId}/external-evidence-binding.json`;
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
    actor: "goal3-task311 fixture",
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
  return {
    sourceArtifact,
    presentation: recordGoal3SourceArtifactPresentationReview(projectRoot, {
      project_id: projectId,
      presentation_review_id: presentationId,
      actor: "goal3-task311 presentation fixture",
      source_review_artifact_id: sourceArtifact.body.source_review_artifact_id,
      source_review_artifact_path: sourceArtifact.path,
      source_review_artifact_sha256: sourceArtifact.sha256
    })
  };
}

function createChecklist(checklistId, artifactSuffix) {
  const ready = createPresentation(`GOAL3-SOURCE-PRESENTATION-0311-${artifactSuffix}`, `0311-${artifactSuffix}`);
  return recordGoal3SourceReleasePublicChecklist(projectRoot, {
    project_id: projectId,
    checklist_id: checklistId,
    actor: "goal3-task311 checklist fixture",
    presentation_review_id: ready.presentation.presentation_review_id,
    presentation_review_path: ready.presentation.presentation_review_path,
    presentation_review_sha256: ready.presentation.presentation_review_artifact.sha256
  });
}

function writeOperatorEvidence(evidenceId, evidenceKind, checklist, overrides = {}) {
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
      verification_instructions: "Future operator must verify this receipt with the external provider."
    },
    external_verification_performed: false,
    proof_authority: "none",
    can_restore: false,
    can_promote_claim: false,
    can_certify_ga: false,
    evidence_is_proof_authority: false,
    ...overrides
  });
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
    typeof recordGoal3SourceReleaseExternalEvidenceBinding,
    "function",
    "Task311 must export a service-owned external notarization and immutable-storage evidence binding gate"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("goal3_source_release_external_evidence_binding_gate"),
    true,
    "Task311 capability ledger must advertise the external evidence binding gate"
  );
  for (const [path, pattern] of [
    ["README.md", /Task311.*external evidence binding/s],
    ["TODO.md", /Task311.*external evidence binding/s],
    ["REVIEW.md", /Goal 3 Task 311/s],
    ["AGENTS.md", /Task311.*external evidence binding/s],
    ["docs/architecture/ga-release-criteria.md", /Task311.*external evidence binding/s],
    ["docs/architecture/threat-model.md", /Task311.*external evidence binding/s],
    ["docs/architecture/evidence-pack-policy.md", /Task311.*external evidence binding/s],
    ["docs/architecture/acceptance-matrix.md", /Task311.*external evidence binding/s]
  ]) {
    assert.match(repoFile(path), pattern, `${path} must document Task311 external evidence binding`);
  }
  assert.equal(
    repoFile("scripts/phase0-smoke.mjs").includes("goal3-task311-source-release-external-evidence-binding.test.mjs"),
    true,
    "phase0 smoke must discover the Task311 focused suite"
  );

  const staleChecklist = createChecklist("GOAL3-SOURCE-RELEASE-CHECKLIST-0311-STALE", "STALE");
  const staleNotary = writeOperatorEvidence("GOAL3-EXTERNAL-EVIDENCE-0311-STALE-NOTARY", "external_notarization", staleChecklist);
  const staleImmutable = writeOperatorEvidence(
    "GOAL3-EXTERNAL-EVIDENCE-0311-STALE-IMMUTABLE",
    "os_immutable_storage",
    staleChecklist
  );
  assert.throws(
    () =>
      recordGoal3SourceReleaseExternalEvidenceBinding(projectRoot, {
        project_id: projectId,
        binding_id: "GOAL3-SOURCE-RELEASE-EXTERNAL-EVIDENCE-0311-STALE",
        actor: "goal3-task311 stale token=plain-token",
        checklist_id: staleChecklist.checklist_id,
        checklist_path: staleChecklist.checklist_path,
        checklist_sha256: "0".repeat(64),
        external_notarization_evidence_path: staleNotary.path,
        external_notarization_evidence_sha256: staleNotary.sha256,
        os_immutable_storage_evidence_path: staleImmutable.path,
        os_immutable_storage_evidence_sha256: staleImmutable.sha256
      }),
    { code: "GOAL3_SOURCE_RELEASE_EXTERNAL_EVIDENCE_BINDING_STALE" },
    "Task311 must reject stale Task310 checklist hashes before writing binding material"
  );
  assert.equal(
    existsSync(join(projectRoot, externalEvidenceBindingPath("GOAL3-SOURCE-RELEASE-EXTERNAL-EVIDENCE-0311-STALE"))),
    false,
    "Task311 must not write partial binding material after stale checklist input"
  );

  const staleArchive = createChecklist("GOAL3-SOURCE-RELEASE-CHECKLIST-0311-STALE-ARCHIVE", "STALE-ARCHIVE");
  const staleArchiveNotary = writeOperatorEvidence(
    "GOAL3-EXTERNAL-EVIDENCE-0311-STALE-ARCHIVE-NOTARY",
    "external_notarization",
    staleArchive
  );
  const staleArchiveImmutable = writeOperatorEvidence(
    "GOAL3-EXTERNAL-EVIDENCE-0311-STALE-ARCHIVE-IMMUTABLE",
    "os_immutable_storage",
    staleArchive
  );
  writeText(staleArchive.source_archive.archive_path, "tampered source tar bytes\n");
  assert.throws(
    () =>
      recordGoal3SourceReleaseExternalEvidenceBinding(projectRoot, {
        project_id: projectId,
        binding_id: "GOAL3-SOURCE-RELEASE-EXTERNAL-EVIDENCE-0311-STALE-ARCHIVE",
        actor: "goal3-task311 stale archive",
        checklist_id: staleArchive.checklist_id,
        checklist_path: staleArchive.checklist_path,
        checklist_sha256: staleArchive.checklist_artifact.sha256,
        external_notarization_evidence_path: staleArchiveNotary.path,
        external_notarization_evidence_sha256: staleArchiveNotary.sha256,
        os_immutable_storage_evidence_path: staleArchiveImmutable.path,
        os_immutable_storage_evidence_sha256: staleArchiveImmutable.sha256
      }),
    { code: "GOAL3_SOURCE_RELEASE_EXTERNAL_EVIDENCE_BINDING_STALE" },
    "Task311 must re-read source.tar and reject archive bytes that no longer match the Task310 checklist"
  );

  const overclaimChecklist = createChecklist("GOAL3-SOURCE-RELEASE-CHECKLIST-0311-OVERCLAIM", "OVERCLAIM");
  const overclaimNotary = writeOperatorEvidence(
    "GOAL3-EXTERNAL-EVIDENCE-0311-OVERCLAIM-NOTARY",
    "external_notarization",
    overclaimChecklist,
    {
      external_verification_performed: true,
      can_certify_ga: true
    }
  );
  const overclaimImmutable = writeOperatorEvidence(
    "GOAL3-EXTERNAL-EVIDENCE-0311-OVERCLAIM-IMMUTABLE",
    "os_immutable_storage",
    overclaimChecklist
  );
  assert.throws(
    () =>
      recordGoal3SourceReleaseExternalEvidenceBinding(projectRoot, {
        project_id: projectId,
        binding_id: "GOAL3-SOURCE-RELEASE-EXTERNAL-EVIDENCE-0311-OVERCLAIM",
        actor: "goal3-task311 forged overclaim",
        checklist_id: overclaimChecklist.checklist_id,
        checklist_path: overclaimChecklist.checklist_path,
        checklist_sha256: overclaimChecklist.checklist_artifact.sha256,
        external_notarization_evidence_path: overclaimNotary.path,
        external_notarization_evidence_sha256: overclaimNotary.sha256,
        os_immutable_storage_evidence_path: overclaimImmutable.path,
        os_immutable_storage_evidence_sha256: overclaimImmutable.sha256
      }),
    { code: "GOAL3_SOURCE_RELEASE_EXTERNAL_EVIDENCE_BINDING_INVALID" },
    "Task311 must reject operator evidence that claims external verification or GA certification"
  );

  const readyChecklist = createChecklist("GOAL3-SOURCE-RELEASE-CHECKLIST-0311-READY", "READY");
  const readyNotary = writeOperatorEvidence("GOAL3-EXTERNAL-EVIDENCE-0311-READY-NOTARY", "external_notarization", readyChecklist);
  const readyImmutable = writeOperatorEvidence(
    "GOAL3-EXTERNAL-EVIDENCE-0311-READY-IMMUTABLE",
    "os_immutable_storage",
    readyChecklist
  );
  const binding = recordGoal3SourceReleaseExternalEvidenceBinding(projectRoot, {
    project_id: projectId,
    binding_id: "GOAL3-SOURCE-RELEASE-EXTERNAL-EVIDENCE-0311-READY",
    actor: `goal3-task311 ${projectRoot} token=plain-token formally_checked can_promote_claim=true GA certified can_certify_ga=true`,
    checklist_id: readyChecklist.checklist_id,
    checklist_path: readyChecklist.checklist_path,
    checklist_sha256: readyChecklist.checklist_artifact.sha256,
    external_notarization_evidence_path: readyNotary.path,
    external_notarization_evidence_sha256: readyNotary.sha256,
    os_immutable_storage_evidence_path: readyImmutable.path,
    os_immutable_storage_evidence_sha256: readyImmutable.sha256
  });

  assert.equal(binding.schema_version, "comath.goal3_source_release_external_evidence_binding.v1");
  assert.equal(binding.ok, true);
  assert.equal(binding.external_evidence_binding_status, "source_release_external_evidence_bound");
  assert.equal(binding.checklist_current, true);
  assert.equal(binding.source_archive_current, true);
  assert.equal(binding.external_notarization_status, "operator_evidence_bound");
  assert.equal(binding.os_immutable_storage_status, "operator_evidence_bound");
  assert.equal(binding.external_verification_performed, false);
  assert.equal(binding.requires_future_external_verification, true);
  assert.equal(binding.proof_authority, "none");
  assert.equal(binding.can_restore, false);
  assert.equal(binding.can_promote_claim, false);
  assert.equal(binding.can_certify_ga, false);
  assert.equal(binding.binding_is_proof_authority, false);
  assert.equal(binding.evidence_is_proof_authority, false);
  assertProjectRelative(binding.binding_path, "binding_path");
  assertProjectRelative(binding.checklist_artifact.path, "checklist_artifact.path");
  assertProjectRelative(binding.source_archive.archive_path, "source_archive.archive_path");
  assertProjectRelative(binding.external_notarization_evidence_artifact.path, "external_notarization_evidence_artifact.path");
  assertProjectRelative(binding.os_immutable_storage_evidence_artifact.path, "os_immutable_storage_evidence_artifact.path");
  assertNoPublicLeak(binding, "Task311 external evidence binding result");

  const persisted = readJson(binding.binding_path);
  assert.equal(persisted.binding_artifact, undefined);
  assert.equal(persisted.checklist_sha256, readyChecklist.checklist_artifact.sha256);
  assert.equal(persisted.source_archive.archive_sha256, readyChecklist.source_archive.archive_sha256);
  assert.equal(persisted.external_verification_performed, false);
  assert.equal(persisted.can_certify_ga, false);

  const server = createComathServer();
  const routeChecklist = createChecklist("GOAL3-SOURCE-RELEASE-CHECKLIST-0311-ROUTE", "ROUTE");
  const routeNotary = writeOperatorEvidence("GOAL3-EXTERNAL-EVIDENCE-0311-ROUTE-NOTARY", "external_notarization", routeChecklist);
  const routeImmutable = writeOperatorEvidence(
    "GOAL3-EXTERNAL-EVIDENCE-0311-ROUTE-IMMUTABLE",
    "os_immutable_storage",
    routeChecklist
  );
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/goal3/source-release-external-evidence-binding",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      binding_id: "GOAL3-SOURCE-RELEASE-EXTERNAL-EVIDENCE-0311-ROUTE",
      actor: "goal3-task311 route token=plain-token formally_checked GA certified can_certify_ga=true",
      checklist_id: routeChecklist.checklist_id,
      checklist_path: routeChecklist.checklist_path,
      checklist_sha256: routeChecklist.checklist_artifact.sha256,
      external_notarization_evidence_path: routeNotary.path,
      external_notarization_evidence_sha256: routeNotary.sha256,
      os_immutable_storage_evidence_path: routeImmutable.path,
      os_immutable_storage_evidence_sha256: routeImmutable.sha256
    }
  });
  assert.equal(routeResponse.status, 200);
  assert.equal(routeResponse.body.source_release_external_evidence_binding.proof_authority, "none");
  assert.equal(routeResponse.body.source_release_external_evidence_binding.can_restore, false);
  assert.equal(routeResponse.body.source_release_external_evidence_binding.can_promote_claim, false);
  assert.equal(routeResponse.body.source_release_external_evidence_binding.external_notarization_status, "operator_evidence_bound");
  assert.equal(routeResponse.body.source_release_external_evidence_binding.os_immutable_storage_status, "operator_evidence_bound");
  assert.equal(routeResponse.body.source_release_external_evidence_binding.requires_future_external_verification, true);
  assertNoPublicLeak(routeResponse.body, "Task311 public route response");

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (entry) =>
        entry.event_type === "release.goal3_source_release_external_evidence_binding_recorded" &&
        entry.payload.binding_id === "GOAL3-SOURCE-RELEASE-EXTERNAL-EVIDENCE-0311-ROUTE" &&
        entry.payload.checklist_id === routeChecklist.checklist_id &&
        entry.payload.checklist_sha256 === routeChecklist.checklist_artifact.sha256 &&
        entry.payload.source_archive_sha256 === routeChecklist.source_archive.archive_sha256 &&
        entry.payload.external_notarization_status === "operator_evidence_bound" &&
        entry.payload.os_immutable_storage_status === "operator_evidence_bound" &&
        entry.payload.external_verification_performed === false &&
        entry.payload.requires_future_external_verification === true &&
        entry.payload.proof_authority === "none" &&
        entry.payload.can_restore === false &&
        entry.payload.can_promote_claim === false &&
        entry.payload.can_certify_ga === false
    ),
    true,
    "Task311 gate must emit external evidence binding provenance"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task311 source release external evidence binding tests passed.");
