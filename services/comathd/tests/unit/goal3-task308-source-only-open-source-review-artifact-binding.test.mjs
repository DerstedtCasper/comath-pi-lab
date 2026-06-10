import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import * as comath from "../../dist/index.js";

const {
  createComathServer,
  getComathdStatus,
  initProject,
  readAuditEvents,
  recordGoal3SourceOnlyOpenSourceReviewArtifact
} = comath;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task308-source-artifact-"));
const init = initProject({
  name: "Goal 3 Task308 source-only open-source review artifact",
  root_path: projectRoot
});
const projectId = init.project.project_id;
const secretTerms = /Authorization:\s*Bearer|api_key|token=|plain-token|\bsk-[A-Za-z0-9_-]+/i;
const privilegedPublicTerms =
  /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|proven|verified_final_authority_evidence|GA certified|can_certify_ga\s*[:=]\s*(?:true|1))\b/i;

function repoFile(relativePath) {
  const here = dirname(fileURLToPath(import.meta.url));
  return readFileSync(join(here, "../../../..", relativePath), "utf8");
}

function sha256Text(text) {
  return createHash("sha256").update(text).digest("hex");
}

function sha256File(relativePath) {
  return createHash("sha256").update(readFileSync(join(projectRoot, relativePath))).digest("hex");
}

function runGit(args, options = {}) {
  const result = spawnSync("git", args, {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options
  });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

function writeText(relativePath, text) {
  const absolutePath = join(projectRoot, relativePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, text, "utf8");
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

function artifact(kind, path, fill = "a", size = 1024) {
  return {
    kind,
    path,
    sha256: fill.repeat(64),
    size_bytes: size
  };
}

function writePublicArchiveForPackage(packageId) {
  const archiveId = `GOAL3-SOURCE-BOUND-PUBLIC-ARCHIVE-${packageId}`;
  const archiveRoot = `.comath/release/source-review/public-archive/${archiveId}`;
  const reportFixtures = [
    { format: "markdown", public_relative_path: `${archiveRoot}/reports/01-report.md`, text: "public markdown report\n" },
    { format: "html", public_relative_path: `${archiveRoot}/reports/02-report.html`, text: "public html report\n" },
    { format: "json", public_relative_path: `${archiveRoot}/reports/03-report.json`, text: "public json report\n" }
  ];
  for (const report of reportFixtures) {
    writeText(report.public_relative_path, report.text);
  }
  const reports = reportFixtures.map((report) => ({
    format: report.format,
    public_relative_path: report.public_relative_path,
    sha256: sha256Text(report.text),
    size_bytes: Buffer.byteLength(report.text, "utf8")
  }));
  const manifestPath = `${archiveRoot}/manifest.json`;
  const notarizationPath = `${archiveRoot}/notarization-policy.json`;
  const manifestBody = {
    schema_version: "comath.source_review_public_archive.v1",
    archive_kind: "source_review_public_diagnostic",
    project_id: projectId,
    archive_id: archiveId,
    archive_root: archiveRoot,
    manifest_path: manifestPath,
    notarization_manifest_path: notarizationPath,
    kind: "source_review_public_diagnostic",
    proof_authority: "none",
    can_promote_claim: false,
    can_restore: false,
    restore_source: false,
    public_archive_is_proof_authority: false,
    exposes_host_paths: false,
    requires_sanitized_generated_reports: true,
    generated_report_formats: ["markdown", "html", "json"],
    public_archive_contract: {
      kind: "source_review_public_diagnostic",
      proof_authority: "none",
      can_promote_claim: false,
      can_restore: false,
      restore_source: false,
      public_archive_is_proof_authority: false,
      exposes_host_paths: false,
      requires_sanitized_generated_reports: true,
      generated_report_formats: ["markdown", "html", "json"]
    },
    immutability_policy: {
      kind: "source_review_public_archive_immutability_policy",
      proof_authority: "none",
      can_promote_claim: false,
      can_restore: false,
      tamper_evident_manifest: true,
      os_immutable_storage: { status: "not_configured", evidence: null },
      external_notarization: { status: "not_configured", evidence: null }
    },
    reports,
    warnings: []
  };
  const manifest = writeJson(manifestPath, manifestBody);
  writeJson(notarizationPath, {
    schema_version: "comath.source_review_public_archive_notarization.v1",
    project_id: projectId,
    archive_id: archiveId,
    archive_kind: "source_review_public_diagnostic",
    source_review_manifest_path: manifestPath,
    source_review_manifest_sha256: manifest.sha256,
    reports,
    immutability_policy: manifestBody.immutability_policy,
    recorded_at: "2026-06-10T00:00:00.000Z",
    actor: "goal3-task308 fixture",
    warnings: ["os_immutable_storage_not_configured", "external_notarization_not_configured"]
  });
  return manifest;
}

function writeTask307Package(packageId, overrides = {}) {
  const releasePackagePath = `.comath/release/goal3-source-bound-release-package/${packageId}/package.json`;
  const publicArchive = writePublicArchiveForPackage(packageId);
  return writeJson(releasePackagePath, {
    schema_version: "comath.goal3_source_bound_release_package.v1",
    release_package_id: packageId,
    project_id: projectId,
    actor: "goal3-task307 fixture",
    created_at: "2026-06-10T00:00:00.000Z",
    ok: true,
    release_package_status: "source_bound_public_diagnostic_package_ready",
    release_package_path: releasePackagePath,
    ga_certificate_consumption_review_id: `GOAL3-CONSUMPTION-${packageId}`,
    ga_certificate_consumption_review_path: `.comath/release/goal3-ga-certificate-consumption/GOAL3-CONSUMPTION-${packageId}/consumption-review.json`,
    ga_certificate_consumption_review_artifact: artifact(
      "goal3_ga_certificate_consumption_review",
      `.comath/release/goal3-ga-certificate-consumption/GOAL3-CONSUMPTION-${packageId}/consumption-review.json`,
      "a"
    ),
    ga_certificate_consumption_review_current: true,
    source_bound_release_chain_current: true,
    source_review_public_archive_id: publicArchive.body.archive_id,
    source_review_public_archive_manifest_path: publicArchive.path,
    source_review_public_archive_manifest_sha256: publicArchive.sha256,
    public_archive_review_id: `GOAL3-SOURCE-BOUND-PUBLIC-ARCHIVE-REVIEW-${packageId}`,
    public_archive_review_path: `.comath/release/public-archive-review/GOAL3-SOURCE-BOUND-PUBLIC-ARCHIVE-REVIEW-${packageId}/review.json`,
    public_archive_review_ok: true,
    public_report_paths: {
      markdown: `.comath/release/source-review/generated/goal3-source-bound-release-package/${packageId}/report.md`,
      html: `.comath/release/source-review/generated/goal3-source-bound-release-package/${packageId}/report.html`,
      json: `.comath/release/source-review/generated/goal3-source-bound-release-package/${packageId}/report.json`
    },
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    package_is_proof_authority: false,
    claim_promotion_requires_ordinary_gate: true,
    ...overrides
  });
}

function setupGitRepository() {
  writeText(".gitignore", ".comath/\nnode_modules/\ndist/\n.tmp/\n.env\n.env.*\n");
  writeText("README.md", "# Fixture source\n");
  writeText("package.json", "{ \"name\": \"fixture\" }\n");
  writeText("services/comathd/src/index.ts", "export const fixture = true;\n");
  runGit(["init"]);
  runGit(["config", "user.email", "fixture@example.test"]);
  runGit(["config", "user.name", "CoMath Fixture"]);
  runGit(["add", ".gitignore", "README.md", "package.json", "services/comathd/src/index.ts"]);
  runGit(["commit", "-m", "fixture source"]);
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
  setupGitRepository();
  assert.equal(
    typeof recordGoal3SourceOnlyOpenSourceReviewArtifact,
    "function",
    "Task308 must export a service-owned source-only open-source review artifact gate"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("goal3_source_only_open_source_review_artifact_gate"),
    true,
    "Task308 capability ledger must advertise the source-only open-source review artifact gate"
  );
  for (const [path, pattern] of [
    ["README.md", /Task308.*source-only.*open-source review artifact/s],
    ["TODO.md", /Task308.*source-only.*open-source review artifact/s],
    ["REVIEW.md", /Goal 3 Task 308/s],
    ["AGENTS.md", /Task308.*source-only.*open-source review artifact/s],
    ["docs/architecture/ga-release-criteria.md", /Task308.*source-only.*open-source review artifact/s],
    ["docs/architecture/threat-model.md", /Task308.*source-only.*open-source review artifact/s],
    ["docs/architecture/evidence-pack-policy.md", /Task308.*source-only.*open-source review artifact/s],
    ["docs/architecture/acceptance-matrix.md", /Task308.*source-only.*open-source review artifact/s]
  ]) {
    assert.match(repoFile(path), pattern, `${path} must document Task308 source-only review artifacts`);
  }
  assert.equal(
    repoFile("scripts/phase0-smoke.mjs").includes("goal3-task308-source-only-open-source-review-artifact-binding.test.mjs"),
    true,
    "phase0 smoke must discover the Task308 focused suite"
  );

  const stalePackage = writeTask307Package("0308-STALE");
  assert.throws(
    () =>
      recordGoal3SourceOnlyOpenSourceReviewArtifact(projectRoot, {
        project_id: projectId,
        source_review_artifact_id: "GOAL3-SOURCE-ONLY-REVIEW-ARTIFACT-0308-STALE",
        actor: "goal3-task308 stale token=plain-token",
        release_package_id: stalePackage.body.release_package_id,
        release_package_path: stalePackage.path,
        release_package_sha256: "0".repeat(64)
      }),
    { code: "GOAL3_SOURCE_ONLY_REVIEW_ARTIFACT_STALE" },
    "Task308 must reject stale Task307 package hashes before writing source artifacts"
  );
  assert.equal(
    existsSync(
      join(
        projectRoot,
        ".comath/release/goal3-source-only-open-source-review-artifact/GOAL3-SOURCE-ONLY-REVIEW-ARTIFACT-0308-STALE/source-artifact.json"
      )
    ),
    false,
    "Task308 must not write partial manifest material after stale package input"
  );

  const invalidPackage = writeTask307Package("0308-LEGACY", {
    source_bound_release_chain_current: false
  });
  assert.throws(
    () =>
      recordGoal3SourceOnlyOpenSourceReviewArtifact(projectRoot, {
        project_id: projectId,
        source_review_artifact_id: "GOAL3-SOURCE-ONLY-REVIEW-ARTIFACT-0308-LEGACY",
        actor: "goal3-task308 legacy",
        release_package_id: invalidPackage.body.release_package_id,
        release_package_path: invalidPackage.path,
        release_package_sha256: invalidPackage.sha256
      }),
    { code: "GOAL3_SOURCE_ONLY_REVIEW_ARTIFACT_INVALID" },
    "Task308 must reject Task307 packages that are not current source-bound material"
  );

  const forgedArchivePackage = writeTask307Package("0308-FORGED-ARCHIVE", {
    source_review_public_archive_manifest_path: "README.md",
    source_review_public_archive_manifest_sha256: sha256File("README.md")
  });
  assert.throws(
    () =>
      recordGoal3SourceOnlyOpenSourceReviewArtifact(projectRoot, {
        project_id: projectId,
        source_review_artifact_id: "GOAL3-SOURCE-ONLY-REVIEW-ARTIFACT-0308-FORGED-ARCHIVE",
        actor: "goal3-task308 forged archive",
        release_package_id: forgedArchivePackage.body.release_package_id,
        release_package_path: forgedArchivePackage.path,
        release_package_sha256: forgedArchivePackage.sha256
      }),
    { code: "GOAL3_SOURCE_ONLY_REVIEW_ARTIFACT_INVALID" },
    "Task308 must reject Task307 packages whose public archive manifest is not a current source-review archive manifest"
  );
  assert.equal(
    existsSync(join(projectRoot, sourceArtifactArchivePath("GOAL3-SOURCE-ONLY-REVIEW-ARTIFACT-0308-FORGED-ARCHIVE"))),
    false,
    "Task308 must not write source archives for forged Task307 archive bindings"
  );

  const publicVetoPackage = writeTask307Package("0308-PUBLIC-VETO");
  const publicVetoArchive = readJson(publicVetoPackage.body.source_review_public_archive_manifest_path);
  writeText(publicVetoArchive.reports[0].public_relative_path, "formally_checked leaked public report\n");
  assert.throws(
    () =>
      recordGoal3SourceOnlyOpenSourceReviewArtifact(projectRoot, {
        project_id: projectId,
        source_review_artifact_id: "GOAL3-SOURCE-ONLY-REVIEW-ARTIFACT-0308-PUBLIC-VETO",
        actor: "goal3-task308 public veto",
        release_package_id: publicVetoPackage.body.release_package_id,
        release_package_path: publicVetoPackage.path,
        release_package_sha256: publicVetoPackage.sha256
      }),
    { code: "GOAL3_SOURCE_ONLY_REVIEW_ARTIFACT_INVALID" },
    "Task308 must fail closed when public archive review vetoes the bound package surface"
  );
  assert.equal(
    existsSync(join(projectRoot, sourceArtifactArchivePath("GOAL3-SOURCE-ONLY-REVIEW-ARTIFACT-0308-PUBLIC-VETO"))),
    false,
    "Task308 must not leave source.tar after a public archive review veto"
  );
  assert.equal(
    existsSync(join(projectRoot, sourceArtifactManifestPath("GOAL3-SOURCE-ONLY-REVIEW-ARTIFACT-0308-PUBLIC-VETO"))),
    false,
    "Task308 must not leave a manifest after a public archive review veto"
  );

  const publicHashMismatchPackage = writeTask307Package("0308-PUBLIC-HASH-MISMATCH");
  const publicHashMismatchArchive = readJson(publicHashMismatchPackage.body.source_review_public_archive_manifest_path);
  writeText(publicHashMismatchArchive.reports[0].public_relative_path, "benign replacement with stale hash metadata\n");
  assert.throws(
    () =>
      recordGoal3SourceOnlyOpenSourceReviewArtifact(projectRoot, {
        project_id: projectId,
        source_review_artifact_id: "GOAL3-SOURCE-ONLY-REVIEW-ARTIFACT-0308-PUBLIC-HASH-MISMATCH",
        actor: "goal3-task308 public hash mismatch",
        release_package_id: publicHashMismatchPackage.body.release_package_id,
        release_package_path: publicHashMismatchPackage.path,
        release_package_sha256: publicHashMismatchPackage.sha256
      }),
    { code: "GOAL3_SOURCE_ONLY_REVIEW_ARTIFACT_INVALID" },
    "Task308 must fail closed when a bound public report no longer matches its manifest hash and size"
  );
  assert.equal(
    existsSync(join(projectRoot, sourceArtifactArchivePath("GOAL3-SOURCE-ONLY-REVIEW-ARTIFACT-0308-PUBLIC-HASH-MISMATCH"))),
    false,
    "Task308 must not leave source.tar after a public report hash/size mismatch"
  );

  const partialArtifactId = "GOAL3-SOURCE-ONLY-REVIEW-ARTIFACT-0308-PARTIAL";
  writeText(sourceArtifactArchivePath(partialArtifactId), "stale partial tar\n");
  const partialPackage = writeTask307Package("0308-PARTIAL");
  assert.throws(
    () =>
      recordGoal3SourceOnlyOpenSourceReviewArtifact(projectRoot, {
        project_id: projectId,
        source_review_artifact_id: partialArtifactId,
        actor: "goal3-task308 partial",
        release_package_id: partialPackage.body.release_package_id,
        release_package_path: partialPackage.path,
        release_package_sha256: partialPackage.sha256
      }),
    { code: "GOAL3_SOURCE_ONLY_REVIEW_ARTIFACT_ALREADY_EXISTS" },
    "Task308 must reject stale partial source archives instead of overwriting them"
  );

  const partialReviewArtifactId = "GOAL3-SOURCE-ONLY-REVIEW-ARTIFACT-0308-PARTIAL-REVIEW";
  writeText(
    `.comath/release/public-archive-review/GOAL3-SOURCE-ONLY-OPEN-SOURCE-REVIEW-${partialReviewArtifactId}/review.json`,
    "stale public review\n"
  );
  const partialReviewPackage = writeTask307Package("0308-PARTIAL-REVIEW");
  assert.throws(
    () =>
      recordGoal3SourceOnlyOpenSourceReviewArtifact(projectRoot, {
        project_id: projectId,
        source_review_artifact_id: partialReviewArtifactId,
        actor: "goal3-task308 partial review",
        release_package_id: partialReviewPackage.body.release_package_id,
        release_package_path: partialReviewPackage.path,
        release_package_sha256: partialReviewPackage.sha256
      }),
    { code: "GOAL3_SOURCE_ONLY_REVIEW_ARTIFACT_ALREADY_EXISTS" },
    "Task308 must reject stale partial public archive review manifests instead of overwriting them"
  );

  const dirtyPackage = writeTask307Package("0308-DIRTY");
  writeText("README.md", "# Fixture source\n\nDirty local edit.\n");
  assert.throws(
    () =>
      recordGoal3SourceOnlyOpenSourceReviewArtifact(projectRoot, {
        project_id: projectId,
        source_review_artifact_id: "GOAL3-SOURCE-ONLY-REVIEW-ARTIFACT-0308-DIRTY",
        actor: "goal3-task308 dirty",
        release_package_id: dirtyPackage.body.release_package_id,
        release_package_path: dirtyPackage.path,
        release_package_sha256: dirtyPackage.sha256
      }),
    { code: "GOAL3_SOURCE_ONLY_REVIEW_ARTIFACT_DIRTY_WORKTREE" },
    "Task308 must reject dirty source worktrees before git archive"
  );
  runGit(["checkout", "--", "README.md"]);

  writeText("dist/bundle.js", "tracked build output\n");
  runGit(["add", "-f", "dist/bundle.js"]);
  runGit(["commit", "-m", "tracked forbidden build output"]);
  const forbiddenPackage = writeTask307Package("0308-FORBIDDEN");
  assert.throws(
    () =>
      recordGoal3SourceOnlyOpenSourceReviewArtifact(projectRoot, {
        project_id: projectId,
        source_review_artifact_id: "GOAL3-SOURCE-ONLY-REVIEW-ARTIFACT-0308-FORBIDDEN",
        actor: "goal3-task308 forbidden",
        release_package_id: forbiddenPackage.body.release_package_id,
        release_package_path: forbiddenPackage.path,
        release_package_sha256: forbiddenPackage.sha256
      }),
    { code: "GOAL3_SOURCE_ONLY_REVIEW_ARTIFACT_FORBIDDEN_ENTRY" },
    "Task308 must reject source archives that would include build/runtime/cache entries"
  );
  runGit(["rm", "-r", "dist"]);
  runGit(["commit", "-m", "remove forbidden build output"]);

  writeText("build/generated.js", "tracked build output\n");
  runGit(["add", "-f", "build/generated.js"]);
  runGit(["commit", "-m", "tracked forbidden build directory"]);
  const forbiddenBuildPackage = writeTask307Package("0308-FORBIDDEN-BUILD");
  assert.throws(
    () =>
      recordGoal3SourceOnlyOpenSourceReviewArtifact(projectRoot, {
        project_id: projectId,
        source_review_artifact_id: "GOAL3-SOURCE-ONLY-REVIEW-ARTIFACT-0308-FORBIDDEN-BUILD",
        actor: "goal3-task308 forbidden build",
        release_package_id: forbiddenBuildPackage.body.release_package_id,
        release_package_path: forbiddenBuildPackage.path,
        release_package_sha256: forbiddenBuildPackage.sha256
      }),
    { code: "GOAL3_SOURCE_ONLY_REVIEW_ARTIFACT_FORBIDDEN_ENTRY" },
    "Task308 must reject tracked build directories beyond dist/"
  );
  runGit(["rm", "-r", "build"]);
  runGit(["commit", "-m", "remove forbidden build directory"]);

  writeText("symlink-target.txt", "../outside");
  const symlinkTargetSha = runGit(["hash-object", "-w", "symlink-target.txt"]);
  rmSync(join(projectRoot, "symlink-target.txt"), { force: true });
  runGit(["update-index", "--add", "--cacheinfo", `120000,${symlinkTargetSha},links/outside`]);
  runGit(["commit", "-m", "tracked symlink metadata"]);
  runGit(["update-index", "--skip-worktree", "links/outside"]);
  const forbiddenMetadataPackage = writeTask307Package("0308-FORBIDDEN-METADATA");
  assert.throws(
    () =>
      recordGoal3SourceOnlyOpenSourceReviewArtifact(projectRoot, {
        project_id: projectId,
        source_review_artifact_id: "GOAL3-SOURCE-ONLY-REVIEW-ARTIFACT-0308-FORBIDDEN-METADATA",
        actor: "goal3-task308 forbidden metadata",
        release_package_id: forbiddenMetadataPackage.body.release_package_id,
        release_package_path: forbiddenMetadataPackage.path,
        release_package_sha256: forbiddenMetadataPackage.sha256
      }),
    { code: "GOAL3_SOURCE_ONLY_REVIEW_ARTIFACT_FORBIDDEN_ENTRY" },
    "Task308 must reject symlink/gitlink source tree metadata before git archive"
  );
  runGit(["update-index", "--no-skip-worktree", "links/outside"]);
  runGit(["rm", "--cached", "links/outside"]);
  runGit(["commit", "-m", "remove forbidden symlink metadata"]);

  const readyPackage = writeTask307Package("0308-READY");
  const sourceArtifact = recordGoal3SourceOnlyOpenSourceReviewArtifact(projectRoot, {
    project_id: projectId,
    source_review_artifact_id: "GOAL3-SOURCE-ONLY-REVIEW-ARTIFACT-0308-READY",
    actor: `goal3-task308 ${projectRoot} token=plain-token formally_checked can_promote_claim=true GA certified can_certify_ga=true`,
    release_package_id: readyPackage.body.release_package_id,
    release_package_path: readyPackage.path,
    release_package_sha256: readyPackage.sha256
  });

  assert.equal(sourceArtifact.schema_version, "comath.goal3_source_only_open_source_review_artifact.v1");
  assert.equal(sourceArtifact.ok, true);
  assert.equal(sourceArtifact.source_review_artifact_status, "source_only_open_source_review_artifact_ready");
  assert.equal(sourceArtifact.release_package_current, true);
  assert.equal(sourceArtifact.source_archive.source_only, true);
  assert.equal(sourceArtifact.source_archive.generated_by, "git_archive");
  assert.equal(sourceArtifact.source_archive.dirty_worktree, false);
  assert.equal(sourceArtifact.source_archive.forbidden_entry_count, 0);
  assert.equal(sourceArtifact.source_archive.entry_count >= 4, true);
  assert.equal(sourceArtifact.source_archive.archive_sha256, sha256File(sourceArtifact.source_archive.archive_path));
  assert.equal(statSync(join(projectRoot, sourceArtifact.source_archive.archive_path)).size, sourceArtifact.source_archive.size_bytes);
  assert.equal(sourceArtifact.proof_authority, "none");
  assert.equal(sourceArtifact.can_promote_claim, false);
  assert.equal(sourceArtifact.can_certify_ga, false);
  assert.equal(sourceArtifact.source_artifact_is_proof_authority, false);
  assert.equal(sourceArtifact.claim_promotion_requires_ordinary_gate, true);
  assert.equal(sourceArtifact.public_archive_review_ok, true);
  assertProjectRelative(sourceArtifact.source_review_artifact_path, "source_review_artifact_path");
  assertProjectRelative(sourceArtifact.source_archive.archive_path, "source_archive.archive_path");
  assertProjectRelative(sourceArtifact.release_package_artifact.path, "release_package_artifact.path");
  assertProjectRelative(sourceArtifact.source_review_artifact.path, "source_review_artifact.path");
  assertNoPublicLeak(sourceArtifact, "Task308 source-only review artifact result");

  const persisted = readJson(sourceArtifact.source_review_artifact_path);
  assert.equal(persisted.source_review_artifact, undefined);
  assert.equal(persisted.source_archive.archive_path, sourceArtifact.source_archive.archive_path);
  assert.equal(persisted.proof_authority, "none");

  const server = createComathServer();
  const routePackage = writeTask307Package("0308-ROUTE");
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/goal3/source-only-open-source-review-artifact",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      source_review_artifact_id: "GOAL3-SOURCE-ONLY-REVIEW-ARTIFACT-0308-ROUTE",
      actor: "goal3-task308 route token=plain-token formally_checked GA certified can_certify_ga=true",
      release_package_id: routePackage.body.release_package_id,
      release_package_path: routePackage.path,
      release_package_sha256: routePackage.sha256
    }
  });
  assert.equal(routeResponse.status, 200);
  assert.equal(routeResponse.body.source_only_open_source_review_artifact.proof_authority, "none");
  assert.equal(routeResponse.body.source_only_open_source_review_artifact.can_promote_claim, false);
  assert.equal(routeResponse.body.source_only_open_source_review_artifact.source_archive.generated_by, "git_archive");
  assertNoPublicLeak(routeResponse.body, "Task308 public route response");

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (entry) =>
        entry.event_type === "release.goal3_source_only_open_source_review_artifact_recorded" &&
        entry.payload.source_review_artifact_id === "GOAL3-SOURCE-ONLY-REVIEW-ARTIFACT-0308-ROUTE" &&
        entry.payload.release_package_artifact_sha256 === routePackage.sha256 &&
        entry.payload.source_archive_generated_by === "git_archive" &&
        entry.payload.proof_authority === "none" &&
        entry.payload.can_promote_claim === false
    ),
    true,
    "Task308 gate must emit source-only open-source artifact provenance"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task308 source-only open-source review artifact binding tests passed.");
