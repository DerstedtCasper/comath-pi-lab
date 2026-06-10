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
  recordGoal3SourceArtifactPresentationReview,
  recordGoal3SourceReleaseExternalEvidenceBinding,
  recordGoal3SourceReleasePublicChecklist
} = comath;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task312-evidence-chain-check-debug-"));
const init = initProject({
  name: "Goal 3 Task312 source release evidence chain check-debug",
  root_path: projectRoot
});
const projectId = init.project.project_id;

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

function readBytes(relativePath) {
  return readFileSync(join(projectRoot, relativePath));
}

function readAuditEvents() {
  const auditPath = join(projectRoot, ".comath/audit/events.jsonl");
  if (!existsSync(auditPath)) {
    return [];
  }
  return readFileSync(auditPath, "utf8")
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
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
    actor: "goal3-task312 fixture",
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
      actor: "goal3-task312 presentation fixture",
      source_review_artifact_id: sourceArtifact.body.source_review_artifact_id,
      source_review_artifact_path: sourceArtifact.path,
      source_review_artifact_sha256: sourceArtifact.sha256
    })
  };
}

function createChecklist(checklistId, artifactSuffix) {
  const ready = createPresentation(`GOAL3-SOURCE-PRESENTATION-0312-${artifactSuffix}`, `0312-${artifactSuffix}`);
  return recordGoal3SourceReleasePublicChecklist(projectRoot, {
    project_id: projectId,
    checklist_id: checklistId,
    actor: "goal3-task312 checklist fixture",
    presentation_review_id: ready.presentation.presentation_review_id,
    presentation_review_path: ready.presentation.presentation_review_path,
    presentation_review_sha256: ready.presentation.presentation_review_artifact.sha256
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
      verification_instructions: "Future operator must verify this receipt with the external provider."
    },
    external_verification_performed: false,
    proof_authority: "none",
    can_restore: false,
    can_promote_claim: false,
    can_certify_ga: false,
    evidence_is_proof_authority: false
  });
}

function bindingInput(bindingId, checklist, notary, immutable, actor = "goal3-task312") {
  return {
    project_id: projectId,
    binding_id: bindingId,
    actor,
    checklist_id: checklist.checklist_id,
    checklist_path: checklist.checklist_path,
    checklist_sha256: checklist.checklist_artifact.sha256,
    external_notarization_evidence_path: notary.path,
    external_notarization_evidence_sha256: notary.sha256,
    os_immutable_storage_evidence_path: immutable.path,
    os_immutable_storage_evidence_sha256: immutable.sha256
  };
}

try {
  const missingReviewChecklist = createChecklist("GOAL3-SOURCE-RELEASE-CHECKLIST-0312-MISSING-REVIEW", "MISSING-REVIEW");
  const missingReviewNotary = writeOperatorEvidence(
    "GOAL3-EXTERNAL-EVIDENCE-0312-MISSING-REVIEW-NOTARY",
    "external_notarization",
    missingReviewChecklist
  );
  const missingReviewImmutable = writeOperatorEvidence(
    "GOAL3-EXTERNAL-EVIDENCE-0312-MISSING-REVIEW-IMMUTABLE",
    "os_immutable_storage",
    missingReviewChecklist
  );
  rmSync(join(projectRoot, missingReviewChecklist.public_archive_review_path), { force: true });
  assert.throws(
    () =>
      recordGoal3SourceReleaseExternalEvidenceBinding(
        projectRoot,
        bindingInput(
          "GOAL3-SOURCE-RELEASE-EXTERNAL-EVIDENCE-0312-MISSING-REVIEW",
          missingReviewChecklist,
          missingReviewNotary,
          missingReviewImmutable,
          "goal3-task312 missing public review"
        )
      ),
    { code: "GOAL3_SOURCE_RELEASE_EXTERNAL_EVIDENCE_BINDING_STALE" },
    "Task312 check-debug must reject Task311 binding when the Task310 public archive review file is missing"
  );
  assert.equal(
    existsSync(join(projectRoot, externalEvidenceBindingPath("GOAL3-SOURCE-RELEASE-EXTERNAL-EVIDENCE-0312-MISSING-REVIEW"))),
    false,
    "Task312 check-debug must not write partial binding material after missing Task310 public review"
  );

  const tamperedReviewChecklist = createChecklist("GOAL3-SOURCE-RELEASE-CHECKLIST-0312-TAMPERED-REVIEW", "TAMPERED-REVIEW");
  const tamperedBody = readJson(tamperedReviewChecklist.public_archive_review_path);
  tamperedBody.ok = false;
  tamperedBody.vetoes = ["tampered_task310_public_review"];
  tamperedBody.can_promote_claim = true;
  writeJson(tamperedReviewChecklist.public_archive_review_path, tamperedBody);
  const tamperedReviewNotary = writeOperatorEvidence(
    "GOAL3-EXTERNAL-EVIDENCE-0312-TAMPERED-REVIEW-NOTARY",
    "external_notarization",
    tamperedReviewChecklist
  );
  const tamperedReviewImmutable = writeOperatorEvidence(
    "GOAL3-EXTERNAL-EVIDENCE-0312-TAMPERED-REVIEW-IMMUTABLE",
    "os_immutable_storage",
    tamperedReviewChecklist
  );
  const server = createComathServer();
  const tamperedRoute = await server.inject({
    method: "POST",
    path: "/release/goal3/source-release-external-evidence-binding",
    body: {
      project_root: projectRoot,
      ...bindingInput(
        "GOAL3-SOURCE-RELEASE-EXTERNAL-EVIDENCE-0312-TAMPERED-REVIEW",
        tamperedReviewChecklist,
        tamperedReviewNotary,
        tamperedReviewImmutable,
        "goal3-task312 tampered public review"
      )
    }
  });
  assert.equal(tamperedRoute.status, 400, JSON.stringify(tamperedRoute.body));
  assert.equal(tamperedRoute.body.code, "GOAL3_SOURCE_RELEASE_EXTERNAL_EVIDENCE_BINDING_STALE");
  assert.equal(
    existsSync(join(projectRoot, externalEvidenceBindingPath("GOAL3-SOURCE-RELEASE-EXTERNAL-EVIDENCE-0312-TAMPERED-REVIEW"))),
    false,
    "Task312 check-debug must not write route binding material after tampered Task310 public review"
  );

  const byteTamperedReviewChecklist = createChecklist("GOAL3-SOURCE-RELEASE-CHECKLIST-0312-BYTE-TAMPERED", "BYTE-TAMPERED");
  const originalReviewBytes = readBytes(byteTamperedReviewChecklist.public_archive_review_path);
  const byteTamperedReview = JSON.parse(originalReviewBytes.toString("utf8"));
  byteTamperedReview.warnings = ["semantically passing but byte-tampered Task310 public review"];
  writeJson(byteTamperedReviewChecklist.public_archive_review_path, byteTamperedReview);
  const byteTamperedReviewNotary = writeOperatorEvidence(
    "GOAL3-EXTERNAL-EVIDENCE-0312-BYTE-TAMPERED-NOTARY",
    "external_notarization",
    byteTamperedReviewChecklist
  );
  const byteTamperedReviewImmutable = writeOperatorEvidence(
    "GOAL3-EXTERNAL-EVIDENCE-0312-BYTE-TAMPERED-IMMUTABLE",
    "os_immutable_storage",
    byteTamperedReviewChecklist
  );
  assert.throws(
    () =>
      recordGoal3SourceReleaseExternalEvidenceBinding(
        projectRoot,
        bindingInput(
          "GOAL3-SOURCE-RELEASE-EXTERNAL-EVIDENCE-0312-BYTE-TAMPERED",
          byteTamperedReviewChecklist,
          byteTamperedReviewNotary,
          byteTamperedReviewImmutable,
          "goal3-task312 byte-tampered public review"
        )
      ),
    { code: "GOAL3_SOURCE_RELEASE_EXTERNAL_EVIDENCE_BINDING_STALE" },
    "Task312 check-debug must reject a Task310 public review whose bytes changed even when top-level non-authority fields still pass"
  );
  assert.equal(
    existsSync(join(projectRoot, externalEvidenceBindingPath("GOAL3-SOURCE-RELEASE-EXTERNAL-EVIDENCE-0312-BYTE-TAMPERED"))),
    false,
    "Task312 check-debug must not write binding material after byte-tampered Task310 public review"
  );

  const boundReviewChecklist = createChecklist("GOAL3-SOURCE-RELEASE-CHECKLIST-0312-BOUND-REVIEW", "BOUND-REVIEW");
  const boundReviewBytes = readBytes(boundReviewChecklist.public_archive_review_path);
  const boundReviewSha256 = sha256Buffer(boundReviewBytes);
  const boundReviewNotary = writeOperatorEvidence(
    "GOAL3-EXTERNAL-EVIDENCE-0312-BOUND-REVIEW-NOTARY",
    "external_notarization",
    boundReviewChecklist
  );
  const boundReviewImmutable = writeOperatorEvidence(
    "GOAL3-EXTERNAL-EVIDENCE-0312-BOUND-REVIEW-IMMUTABLE",
    "os_immutable_storage",
    boundReviewChecklist
  );
  const boundReviewBinding = recordGoal3SourceReleaseExternalEvidenceBinding(
    projectRoot,
    bindingInput(
      "GOAL3-SOURCE-RELEASE-EXTERNAL-EVIDENCE-0312-BOUND-REVIEW",
      boundReviewChecklist,
      boundReviewNotary,
      boundReviewImmutable,
      "goal3-task312 bound public review"
    )
  );
  assert.deepEqual(boundReviewBinding.checklist_public_archive_review_artifact, {
    kind: "goal3_public_archive_review",
    path: boundReviewChecklist.public_archive_review_path,
    sha256: boundReviewSha256,
    size_bytes: boundReviewBytes.byteLength
  });
  assert.equal(boundReviewBinding.checklist_public_archive_review_current, true);
  const boundReviewPersisted = readJson(boundReviewBinding.binding_path);
  assert.deepEqual(
    boundReviewPersisted.checklist_public_archive_review_artifact,
    boundReviewBinding.checklist_public_archive_review_artifact,
    "Task312 persisted binding must preserve the Task310 public review artifact reference"
  );
  const boundReviewAudit = readAuditEvents().find(
    (entry) =>
      entry.event_type === "release.goal3_source_release_external_evidence_binding_recorded" &&
      entry.payload.binding_id === boundReviewBinding.binding_id
  );
  assert.equal(boundReviewAudit?.payload.checklist_public_archive_review_path, boundReviewChecklist.public_archive_review_path);
  assert.equal(boundReviewAudit?.payload.checklist_public_archive_review_sha256, boundReviewSha256);
  assert.equal(boundReviewAudit?.payload.checklist_public_archive_review_current, true);

  assert.equal(
    getComathdStatus().capabilities.includes("goal3_source_release_external_evidence_chain_check_debug"),
    true,
    "Task312 check-debug capability must advertise Task310->Task311 source release evidence chain coverage"
  );
  for (const [path, pattern] of [
    ["README.md", /Task312.*source release evidence chain check-debug/s],
    ["TODO.md", /Task312.*source release evidence chain check-debug/s],
    ["REVIEW.md", /Goal 3 Task 312/s],
    ["AGENTS.md", /Task312.*source release evidence chain check-debug/s],
    ["docs/architecture/ga-release-criteria.md", /Task312.*source release evidence chain check-debug/s],
    ["docs/architecture/threat-model.md", /Task312.*source release evidence chain check-debug/s],
    ["docs/architecture/evidence-pack-policy.md", /Task312.*source release evidence chain check-debug/s],
    ["docs/architecture/acceptance-matrix.md", /Task312.*source release evidence chain check-debug/s]
  ]) {
    assert.match(repoFile(path), pattern, `${path} must document Task312 source release evidence chain check-debug`);
  }
  assert.equal(
    repoFile("scripts/phase0-smoke.mjs").includes("goal3-task312-source-release-evidence-chain-check-debug.test.mjs"),
    true,
    "phase0 smoke must discover the Task312 focused suite"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task312 source release evidence chain check-debug tests passed.");
