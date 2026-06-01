import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { assembleSourceReviewPublicArchive, createComathServer, initProject } from "../../dist/index.js";

const privilegedPublicTerms =
  /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|proven|verified_final_authority_evidence)\b/i;

function assertProjectRelative(path, label) {
  assert.equal(typeof path, "string", `${label} must be a string`);
  assert.equal(isAbsolute(path), false, `${label} must be project-relative`);
  assert.equal(path.startsWith(".comath/"), true, `${label} must stay under .comath`);
  assert.equal(path.includes(".."), false, `${label} must not contain traversal`);
  assert.equal(/[A-Za-z]:[\\/]/.test(path), false, `${label} must not expose a Windows absolute path`);
  assert.equal(path.includes("\\\\"), false, `${label} must not expose UNC/device syntax`);
}

function hostPathVariants(path) {
  const resolved = resolve(path);
  return Array.from(new Set([resolved, resolved.replace(/\\/g, "/"), resolved.replace(/\\/g, "\\\\")]));
}

function assertNoPublicLeak(value, projectRoot) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  assert.doesNotMatch(text, privilegedPublicTerms, "public source-review material must not expose authority vocabulary");
  for (const variant of hostPathVariants(projectRoot)) {
    assert.equal(text.includes(variant), false, `public source-review material exposed host path ${variant}`);
  }
  assert.equal(/[A-Za-z]:\\\\|[A-Za-z]:\//.test(text), false, "public source-review material must not expose drive paths");
  assert.equal(text.includes("\\\\?\\") || text.includes("\\\\"), false, "public source-review material must not expose device or UNC paths");
}

function assertPublicArchiveResult(result, projectRoot) {
  assert.equal(result.schema_version, "comath.source_review_public_archive.v1");
  assert.equal(result.archive_kind, "source_review_public_diagnostic");
  assert.equal(result.proof_authority, "none");
  assert.equal(result.can_promote_claim, false);
  assert.equal(result.can_restore, false);
  assert.equal(result.restore_source, false);
  assert.equal(result.public_archive_is_proof_authority, false);
  assert.equal(result.exposes_host_paths, false);
  assert.equal(result.requires_sanitized_generated_reports, true);
  assert.deepEqual(result.generated_report_formats, ["markdown", "html", "json"]);
  assert.equal(result.public_archive_contract.proof_authority, "none");
  assert.equal(result.public_archive_contract.can_restore, false);
  assert.equal(result.public_archive_contract.restore_source, false);
  assert.equal(result.public_archive_contract.public_archive_is_proof_authority, false);
  assert.equal(result.public_archive_contract.exposes_host_paths, false);
  assertProjectRelative(result.archive_root, "archive_root");
  assertProjectRelative(result.manifest_path, "manifest_path");
  assert.equal(result.reports.length, 3);
  assertNoPublicLeak(result, projectRoot);

  const manifestPath = join(projectRoot, result.manifest_path);
  assert.equal(existsSync(manifestPath), true, "public source-review manifest must be written");
  assertNoPublicLeak(readFileSync(manifestPath, "utf8"), projectRoot);

  for (const report of result.reports) {
    assertProjectRelative(report.source_relative_path, "source_relative_path");
    assertProjectRelative(report.public_relative_path, "public_relative_path");
    assert.match(report.sha256, /^[a-f0-9]{64}$/);
    assert.equal(report.size_bytes > 0, true);
    const publicText = readFileSync(join(projectRoot, report.public_relative_path), "utf8");
    assertNoPublicLeak(publicText, projectRoot);
  }
}

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task141-source-review-"));
const server = createComathServer();

try {
  const { project } = initProject({ name: "Task141 Source Review Public Archive", root_path: projectRoot });
  const generatedRoot = join(projectRoot, ".comath/release/source-review/generated");
  mkdirSync(generatedRoot, { recursive: true });

  const markdownPath = ".comath/release/source-review/generated/public-report.md";
  const htmlPath = ".comath/release/source-review/generated/public-report.html";
  const jsonPath = ".comath/release/source-review/generated/public-report.json";
  writeFileSync(
    join(projectRoot, markdownPath),
    `markdown says proven, clean_replay_passed, and host path ${projectRoot}\\private\\proof.lean\n`,
    "utf8"
  );
  writeFileSync(
    join(projectRoot, htmlPath),
    `<p>html says lean_kernel_clean_replay and verified_final_authority_evidence at ${projectRoot.replace(/\\/g, "/")}/private/proof.lean</p>\n`,
    "utf8"
  );
  writeFileSync(
    join(projectRoot, jsonPath),
    JSON.stringify({
      verified_final_authority_evidence: "formal_replay_passed",
      source_path: join(projectRoot, "private", "proof.lean"),
      nested: { status: "formally_checked", label: "proven" }
    }),
    "utf8"
  );

  const directArchive = assembleSourceReviewPublicArchive(projectRoot, {
    project_id: project.project_id,
    actor: "goal3-task141-direct",
    archive_id: "TASK141-DIRECT",
    reports: [
      { format: "markdown", path: markdownPath },
      { format: "html", path: join(projectRoot, htmlPath) },
      { format: "json", path: jsonPath }
    ]
  });
  assertPublicArchiveResult(directArchive, projectRoot);
  assert.match(readFileSync(join(projectRoot, markdownPath), "utf8"), privilegedPublicTerms);

  const routeArchive = await server.inject({
    method: "POST",
    path: "/release/source-review/public-archive",
    body: {
      project_root: projectRoot,
      project_id: project.project_id,
      actor: "goal3-task141-route",
      archive_id: "TASK141-ROUTE",
      audience: "internal_restore",
      restore_source: true,
      reports: [
        { format: "markdown", path: markdownPath },
        { format: "html", path: join(projectRoot, htmlPath) },
        { format: "json", path: jsonPath }
      ]
    }
  });
  assert.equal(routeArchive.status, 200, JSON.stringify(routeArchive.body));
  assertPublicArchiveResult(routeArchive.body, projectRoot);

  const invalidFormatArchive = await server.inject({
    method: "POST",
    path: "/release/source-review/public-archive",
    body: {
      project_root: projectRoot,
      project_id: project.project_id,
      actor: "goal3-task141-route",
      archive_id: "TASK141-BAD",
      reports: [
        { format: "markdown", path: markdownPath },
        { format: "html", path: join(projectRoot, htmlPath) },
        { format: "json", path: jsonPath },
        { format: "pdf", path: markdownPath }
      ]
    }
  });
  assert.equal(invalidFormatArchive.status, 400, JSON.stringify(invalidFormatArchive.body));
  assert.equal(invalidFormatArchive.body.code, "SOURCE_REVIEW_PUBLIC_ARCHIVE_INVALID_FORMAT");
  assertNoPublicLeak(invalidFormatArchive.body, projectRoot);
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task141 source-review public archive tests passed.");
