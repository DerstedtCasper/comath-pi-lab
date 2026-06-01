import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createComathServer, initProject } from "../../dist/index.js";

const privilegedPublicTerms =
  /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|proven|verified_final_authority_evidence)\b/i;

function hostPathVariants(path) {
  const resolved = resolve(path);
  return Array.from(new Set([resolved, resolved.replace(/\\/g, "/"), resolved.replace(/\\/g, "\\\\")]));
}

function assertNoPublicLeak(value, projectRoot) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  assert.doesNotMatch(text, privilegedPublicTerms, "public review error must not repeat proof-authority vocabulary");
  for (const variant of hostPathVariants(projectRoot)) {
    assert.equal(text.includes(variant), false, `public review error exposed host path ${variant}`);
  }
  assert.equal(/[A-Za-z]:\\\\|[A-Za-z]:\//.test(text), false, "public review error must not expose drive paths");
  assert.equal(text.includes("\\\\?\\") || text.includes("\\\\"), false, "public review error must not expose device or UNC paths");
}

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task144-public-review-error-"));
const server = createComathServer();

try {
  const { project } = initProject({ name: "Task144 Public Review Error Contract", root_path: projectRoot });
  const archiveRoot = ".comath/release/source-review/public-archive/TASK144-BAD";
  mkdirSync(join(projectRoot, archiveRoot), { recursive: true });
  const manifestPath = `${archiveRoot}/manifest.json`;
  writeFileSync(
    join(projectRoot, manifestPath),
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
          source_relative_path: ".comath/release/source-review/generated/missing-source.md",
          public_relative_path: `${archiveRoot}/reports/missing-public.md`,
          sha256: "0".repeat(64),
          size_bytes: 123
        }
      ]
    }),
    "utf8"
  );

  const missingReportReview = await server.inject({
    method: "POST",
    path: "/release/public-archive/review",
    body: {
      project_root: projectRoot,
      project_id: project.project_id,
      actor: "goal3-task144",
      review_id: "TASK144-MISSING-REPORT",
      surfaces: [
        {
          surface_id: "missing-report-source-review",
          surface_kind: "source_review_public_archive",
          manifest_path: manifestPath
        }
      ]
    }
  });

  assert.equal(missingReportReview.status, 400, JSON.stringify(missingReportReview.body));
  assert.equal(missingReportReview.body.code, "PUBLIC_ARCHIVE_REVIEW_REFERENCED_REPORT_MISSING");
  assertNoPublicLeak(missingReportReview.body, projectRoot);

  const directoryManifestPath = `${archiveRoot}/directory-manifest.json`;
  mkdirSync(join(projectRoot, `${archiveRoot}/reports/directory-public.md`), { recursive: true });
  writeFileSync(
    join(projectRoot, directoryManifestPath),
    JSON.stringify({
      schema_version: "comath.source_review_public_archive.v1",
      archive_kind: "source_review_public_diagnostic",
      proof_authority: "none",
      reports: [
        {
          format: "markdown",
          public_relative_path: `${archiveRoot}/reports/directory-public.md`,
          sha256: "1".repeat(64),
          size_bytes: 456
        }
      ]
    }),
    "utf8"
  );

  const directoryReportReview = await server.inject({
    method: "POST",
    path: "/release/public-archive/review",
    body: {
      project_root: projectRoot,
      project_id: project.project_id,
      actor: "goal3-task144",
      review_id: "TASK144-DIRECTORY-REPORT",
      surfaces: [
        {
          surface_id: "directory-report-source-review",
          surface_kind: "source_review_public_archive",
          manifest_path: directoryManifestPath
        }
      ]
    }
  });

  assert.equal(directoryReportReview.status, 400, JSON.stringify(directoryReportReview.body));
  assert.equal(directoryReportReview.body.code, "PUBLIC_ARCHIVE_REVIEW_REFERENCED_REPORT_NOT_FILE");
  assertNoPublicLeak(directoryReportReview.body, projectRoot);
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task144 public archive review error contract tests passed.");
