import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import {
  assembleSourceReviewPublicArchive,
  initProject,
  reviewGoal3PublicArchiveSurfaces
} from "../../dist/index.js";

const privilegedPublicTerms =
  /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|proven|verified_final_authority_evidence)\b/i;

function sha256Text(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function hostPathVariants(path) {
  const resolved = resolve(path);
  return Array.from(new Set([resolved, resolved.replace(/\\/g, "/"), resolved.replace(/\\/g, "\\\\")]));
}

function assertNoPublicLeak(value, projectRoot) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  assert.doesNotMatch(text, privilegedPublicTerms, "public archive notarization policy must not repeat proof-authority vocabulary");
  for (const variant of hostPathVariants(projectRoot)) {
    assert.equal(text.includes(variant), false, `public archive notarization policy exposed host path ${variant}`);
  }
  assert.equal(/[A-Za-z]:\\\\|[A-Za-z]:\//.test(text), false, "public archive notarization policy must not expose drive paths");
  assert.equal(text.includes("\\\\?\\") || text.includes("\\\\"), false, "public archive notarization policy must not expose device or UNC paths");
}

function assertProjectRelative(path, label) {
  assert.equal(typeof path, "string", `${label} must be a string`);
  assert.equal(isAbsolute(path), false, `${label} must be project-relative`);
  assert.equal(path.startsWith(".comath/"), true, `${label} must stay under .comath`);
  assert.equal(path.includes(".."), false, `${label} must not contain traversal`);
  assert.equal(/[A-Za-z]:[\\/]/.test(path), false, `${label} must not expose a Windows absolute path`);
  assert.equal(path.includes("\\\\"), false, `${label} must not expose UNC/device syntax`);
}

function assertNotarizationPolicy(policy) {
  assert.equal(policy.kind, "source_review_public_archive_immutability_policy");
  assert.equal(policy.proof_authority, "none");
  assert.equal(policy.can_promote_claim, false);
  assert.equal(policy.can_restore, false);
  assert.equal(policy.tamper_evident_manifest, true);
  assert.equal(policy.os_immutable_storage.status, "not_configured");
  assert.equal(policy.os_immutable_storage.evidence, null);
  assert.equal(policy.external_notarization.status, "not_configured");
  assert.equal(policy.external_notarization.evidence, null);
}

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task145-public-archive-notarization-"));

try {
  const { project } = initProject({ name: "Task145 Public Archive Notarization Policy", root_path: projectRoot });
  const generatedRoot = join(projectRoot, ".comath/release/source-review/generated");
  mkdirSync(generatedRoot, { recursive: true });

  const markdownPath = ".comath/release/source-review/generated/public-report.md";
  const htmlPath = ".comath/release/source-review/generated/public-report.html";
  const jsonPath = ".comath/release/source-review/generated/public-report.json";
  writeFileSync(join(projectRoot, markdownPath), "diagnostic markdown only\n", "utf8");
  writeFileSync(join(projectRoot, htmlPath), "<p>diagnostic html only</p>\n", "utf8");
  writeFileSync(join(projectRoot, jsonPath), JSON.stringify({ status: "diagnostic_only" }), "utf8");

  const archive = assembleSourceReviewPublicArchive(projectRoot, {
    project_id: project.project_id,
    actor: "goal3-task145",
    archive_id: "TASK145-SOURCE",
    reports: [
      { format: "markdown", path: markdownPath },
      { format: "html", path: htmlPath },
      { format: "json", path: jsonPath }
    ]
  });

  assertProjectRelative(archive.notarization_manifest_path, "notarization_manifest_path");
  assertNotarizationPolicy(archive.immutability_policy);
  assertNoPublicLeak(archive, projectRoot);

  const manifestText = readFileSync(join(projectRoot, archive.manifest_path), "utf8");
  const notarizationPath = join(projectRoot, archive.notarization_manifest_path);
  assert.equal(existsSync(notarizationPath), true, "source-review archive must write notarization policy evidence");
  const notarization = readJson(notarizationPath);
  assert.equal(notarization.schema_version, "comath.source_review_public_archive_notarization.v1");
  assert.equal(notarization.archive_id, archive.archive_id);
  assert.equal(notarization.project_id, project.project_id);
  assert.equal(notarization.source_review_manifest_path, archive.manifest_path);
  assert.equal(notarization.source_review_manifest_sha256, sha256Text(manifestText));
  assert.equal(notarization.reports.length, 3);
  assertNotarizationPolicy(notarization.immutability_policy);
  assertNoPublicLeak(notarization, projectRoot);

  const passingReview = reviewGoal3PublicArchiveSurfaces(projectRoot, {
    project_id: project.project_id,
    actor: "goal3-task145",
    review_id: "TASK145-PASS",
    surfaces: [
      {
        surface_id: "source-review",
        surface_kind: "source_review_public_archive",
        manifest_path: archive.manifest_path
      }
    ]
  });
  assert.equal(passingReview.ok, true, JSON.stringify(passingReview));
  assert.deepEqual(passingReview.vetoes, []);
  assertNoPublicLeak(passingReview, projectRoot);

  const legacyArchiveRoot = ".comath/release/source-review/public-archive/TASK145-LEGACY";
  mkdirSync(join(projectRoot, `${legacyArchiveRoot}/reports`), { recursive: true });
  const legacyReportPath = `${legacyArchiveRoot}/reports/public-report.md`;
  writeFileSync(join(projectRoot, legacyReportPath), "legacy diagnostic report\n", "utf8");
  const legacyManifestPath = `${legacyArchiveRoot}/manifest.json`;
  writeFileSync(
    join(projectRoot, legacyManifestPath),
    JSON.stringify({
      schema_version: "comath.source_review_public_archive.v1",
      archive_kind: "source_review_public_diagnostic",
      proof_authority: "none",
      can_restore: false,
      restore_source: false,
      public_archive_is_proof_authority: false,
      exposes_host_paths: false,
      reports: [
        {
          format: "markdown",
          public_relative_path: legacyReportPath,
          sha256: sha256Text("legacy diagnostic report\n"),
          size_bytes: Buffer.byteLength("legacy diagnostic report\n", "utf8")
        }
      ]
    }),
    "utf8"
  );
  const legacyReview = reviewGoal3PublicArchiveSurfaces(projectRoot, {
    project_id: project.project_id,
    actor: "goal3-task145",
    review_id: "TASK145-LEGACY",
    surfaces: [
      {
        surface_id: "legacy-source-review",
        surface_kind: "source_review_public_archive",
        manifest_path: legacyManifestPath
      }
    ]
  });
  assert.equal(legacyReview.ok, false, JSON.stringify(legacyReview));
  assert.ok(legacyReview.vetoes.includes("source_review_public_archive_notarization_missing"));
  assertNoPublicLeak(legacyReview, projectRoot);

  const tamperedNotarization = {
    ...notarization,
    source_review_manifest_sha256: "0".repeat(64)
  };
  writeFileSync(notarizationPath, JSON.stringify(tamperedNotarization), "utf8");
  const tamperedReview = reviewGoal3PublicArchiveSurfaces(projectRoot, {
    project_id: project.project_id,
    actor: "goal3-task145",
    review_id: "TASK145-TAMPERED",
    surfaces: [
      {
        surface_id: "tampered-source-review",
        surface_kind: "source_review_public_archive",
        manifest_path: archive.manifest_path
      }
    ]
  });
  assert.equal(tamperedReview.ok, false, JSON.stringify(tamperedReview));
  assert.ok(tamperedReview.vetoes.includes("source_review_public_archive_notarization_hash_mismatch"));
  assertNoPublicLeak(tamperedReview, projectRoot);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task145 public archive notarization policy tests passed.");
