import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  assembleSourceReviewPublicArchive,
  createComathServer,
  initPaper,
  initProject,
  reviewGoal3PublicArchiveSurfaces,
  updatePaperSection
} from "../../dist/index.js";

const privilegedPublicTerms =
  /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|proven|verified_final_authority_evidence)\b/i;

function hostPathVariants(path) {
  const resolved = resolve(path);
  return Array.from(new Set([resolved, resolved.replace(/\\/g, "/"), resolved.replace(/\\/g, "\\\\")]));
}

function assertNoPublicLeak(value, projectRoot) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  assert.doesNotMatch(text, privilegedPublicTerms, "review output must not repeat authority vocabulary");
  for (const variant of hostPathVariants(projectRoot)) {
    assert.equal(text.includes(variant), false, `review output exposed host path ${variant}`);
  }
  assert.equal(/[A-Za-z]:\\\\|[A-Za-z]:\//.test(text), false, "review output must not expose drive paths");
  assert.equal(text.includes("\\\\?\\") || text.includes("\\\\"), false, "review output must not expose device or UNC paths");
}

function assertPassingReview(review, projectRoot) {
  assert.equal(review.schema_version, "comath.goal3_public_archive_review.v1");
  assert.equal(review.ok, true);
  assert.equal(review.proof_authority, "none");
  assert.equal(review.can_promote_claim, false);
  assert.equal(review.review_is_proof_authority, false);
  assert.equal(review.surfaces.length >= 3, true);
  assert.deepEqual(review.vetoes, []);
  assertNoPublicLeak(review, projectRoot);
}

function assertFailingReview(review, projectRoot) {
  assert.equal(review.schema_version, "comath.goal3_public_archive_review.v1");
  assert.equal(review.ok, false);
  assert.equal(review.proof_authority, "none");
  assert.equal(review.can_promote_claim, false);
  assert.equal(review.review_is_proof_authority, false);
  assert.ok(review.vetoes.includes("public_archive_restorable_semantics"));
  assert.ok(review.vetoes.includes("public_archive_claims_proof_authority"));
  assert.ok(review.vetoes.includes("public_archive_exposes_host_paths"));
  assert.ok(review.vetoes.includes("public_archive_authority_vocabulary"));
  assert.ok(review.vetoes.includes("public_archive_host_path_echo"));
  assertNoPublicLeak(review, projectRoot);
}

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task142-public-archive-review-"));
const server = createComathServer();

try {
  const { project } = initProject({ name: "Task142 Public Archive Review", root_path: projectRoot });
  const generatedRoot = join(projectRoot, ".comath/release/source-review/generated");
  mkdirSync(generatedRoot, { recursive: true });
  const markdownPath = ".comath/release/source-review/generated/public-report.md";
  const htmlPath = ".comath/release/source-review/generated/public-report.html";
  const jsonPath = ".comath/release/source-review/generated/public-report.json";
  writeFileSync(join(projectRoot, markdownPath), "review markdown says proven but must be sanitized\n", "utf8");
  writeFileSync(join(projectRoot, htmlPath), "<p>review html says lean_kernel_clean_replay</p>\n", "utf8");
  writeFileSync(
    join(projectRoot, jsonPath),
    JSON.stringify({ status: "formal_replay_passed", source_path: join(projectRoot, "private", "proof.lean") }),
    "utf8"
  );

  const sourceReviewArchive = assembleSourceReviewPublicArchive(projectRoot, {
    project_id: project.project_id,
    actor: "goal3-task142",
    archive_id: "TASK142-SOURCE",
    reports: [
      { format: "markdown", path: markdownPath },
      { format: "html", path: htmlPath },
      { format: "json", path: jsonPath }
    ]
  });

  const snapshotExport = await server.inject({
    method: "POST",
    path: "/snapshot/export",
    body: {
      project_root: projectRoot,
      project_id: project.project_id,
      actor: "goal3-task142-snapshot"
    }
  });
  assert.equal(snapshotExport.status, 200, JSON.stringify(snapshotExport.body));

  initPaper(projectRoot, {
    project_id: project.project_id,
    title: "Task142 Public Archive Review",
    actor: "goal3-task142"
  });
  updatePaperSection(projectRoot, {
    project_id: project.project_id,
    section_id: "public-review",
    title: "Public Review",
    markdown: "This public review report is diagnostic only.",
    actor: "goal3-task142"
  });
  const paperExport = await server.inject({
    method: "POST",
    path: "/paper/export",
    body: {
      project_root: projectRoot,
      project_id: project.project_id,
      format: "md",
      actor: "goal3-task142-paper"
    }
  });
  assert.equal(paperExport.status, 200, JSON.stringify(paperExport.body));

  const passingReview = reviewGoal3PublicArchiveSurfaces(projectRoot, {
    project_id: project.project_id,
    actor: "goal3-task142",
    review_id: "TASK142-PASS",
    surfaces: [
      {
        surface_id: "source-review",
        surface_kind: "source_review_public_archive",
        manifest_path: sourceReviewArchive.manifest_path
      },
      {
        surface_id: "snapshot-export",
        surface_kind: "public_route_payload",
        payload: snapshotExport.body
      },
      {
        surface_id: "paper-export",
        surface_kind: "public_route_payload",
        payload: paperExport.body
      }
    ]
  });
  assertPassingReview(passingReview, projectRoot);
  assert.throws(
    () =>
      reviewGoal3PublicArchiveSurfaces(projectRoot, {
        project_id: project.project_id,
        actor: "goal3-task142-duplicate",
        review_id: "TASK142-PASS",
        surfaces: [
          {
            surface_id: "source-review-duplicate",
            surface_kind: "source_review_public_archive",
            manifest_path: sourceReviewArchive.manifest_path
          }
        ]
      }),
    { code: "PUBLIC_ARCHIVE_REVIEW_ALREADY_EXISTS" },
    "public archive reviews must be append-only and reject duplicate review manifests"
  );

  const maliciousManifestPath = ".comath/release/source-review/public-archive/TASK142-MALICIOUS/manifest.json";
  mkdirSync(join(projectRoot, ".comath/release/source-review/public-archive/TASK142-MALICIOUS"), { recursive: true });
  writeFileSync(
    join(projectRoot, maliciousManifestPath),
    JSON.stringify({
      schema_version: "comath.source_review_public_archive.v1",
      archive_kind: "source_review_public_diagnostic",
      proof_authority: "lean_kernel_clean_replay",
      can_promote_claim: true,
      can_restore: true,
      restore_source: true,
      public_archive_is_proof_authority: true,
      exposes_host_paths: true,
      leaked_path: join(projectRoot, "private", "proof.lean"),
      notes: "public manifest says proven and formal_replay_passed"
    }),
    "utf8"
  );
  const failingReview = reviewGoal3PublicArchiveSurfaces(projectRoot, {
    project_id: project.project_id,
    actor: "goal3-task142",
    review_id: "TASK142-FAIL",
    surfaces: [
      {
        surface_id: "malicious-source-review",
        surface_kind: "source_review_public_archive",
        manifest_path: maliciousManifestPath
      },
      {
        surface_id: "restorable-route-payload",
        surface_kind: "public_route_payload",
        payload: {
          public_archive_contract: {
            proof_authority: "none",
            can_restore: true,
            restore_source: true,
            exposes_host_paths: true
          },
          path: `${projectRoot}\\private\\proof.lean`,
          label: "verified_final_authority_evidence"
        }
      }
    ]
  });
  assertFailingReview(failingReview, projectRoot);

  const routeReview = await server.inject({
    method: "POST",
    path: "/release/public-archive/review",
    body: {
      project_root: projectRoot,
      project_id: project.project_id,
      actor: "goal3-task142-route",
      review_id: "TASK142-ROUTE",
      surfaces: [
        {
          surface_id: "source-review",
          surface_kind: "source_review_public_archive",
          manifest_path: sourceReviewArchive.manifest_path
        },
        {
          surface_id: "snapshot-export",
          surface_kind: "public_route_payload",
          payload: snapshotExport.body
        },
        {
          surface_id: "paper-export",
          surface_kind: "public_route_payload",
          payload: paperExport.body
        }
      ]
    }
  });
  assert.equal(routeReview.status, 200, JSON.stringify(routeReview.body));
  assertPassingReview(routeReview.body, projectRoot);
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task142 public archive review gate tests passed.");
