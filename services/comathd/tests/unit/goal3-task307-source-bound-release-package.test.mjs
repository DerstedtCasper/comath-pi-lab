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
  recordGoal3SourceBoundReleasePackage
} = comath;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task307-source-bound-package-"));
const init = initProject({
  name: "Goal 3 Task307 source-bound release package",
  root_path: projectRoot
});
const projectId = init.project.project_id;
const secretTerms = /Authorization:\s*Bearer|api_key|token=|plain-token|\bsk-[A-Za-z0-9_-]+/i;
const privilegedPublicTerms =
  /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|proven|verified_final_authority_evidence)\b/i;

function repoFile(relativePath) {
  const here = dirname(fileURLToPath(import.meta.url));
  return readFileSync(join(here, "../../../..", relativePath), "utf8");
}

function sha256Text(text) {
  return createHash("sha256").update(text).digest("hex");
}

function writeJson(relativePath, value) {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  const absolutePath = join(projectRoot, relativePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, text, "utf8");
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

function artifact(kind, path, fill = "a", size = 1024) {
  return {
    kind,
    path,
    sha256: fill.repeat(64),
    size_bytes: size
  };
}

function writeConsumptionReview(id, overrides = {}) {
  const path = `.comath/release/goal3-ga-certificate-consumption/${id}/consumption-review.json`;
  return writeJson(path, {
    schema_version: "comath.goal3_ga_certificate_consumption_review.v1",
    ga_certificate_consumption_review_id: id,
    project_id: projectId,
    actor: "goal3-task307 source-bound consumption",
    created_at: "2026-06-10T00:00:00.000Z",
    ok: true,
    release_closure_status: "publishable_workbench_release_candidate_source_bound",
    ga_certificate_consumption_review_path: path,
    requested_consumption_mode: "open_formal_workbench_ga_certificate_source_bound_consumption",
    ga_certificate_id: `GOAL3-GA-CERTIFICATE-${id}`,
    ga_certificate_path: `.comath/release/goal3-ga-certificate/GOAL3-GA-CERTIFICATE-${id}/certificate.json`,
    ga_certificate_artifact: artifact(
      "goal3_ga_certificate",
      `.comath/release/goal3-ga-certificate/GOAL3-GA-CERTIFICATE-${id}/certificate.json`,
      "b"
    ),
    ga_certificate_current: true,
    ga_certificate_consumed: true,
    ga_certification_review_id: `GOAL3-GA-CERTIFICATION-REVIEW-${id}`,
    ga_certification_review_path: `.comath/release/goal3-ga-certification/GOAL3-GA-CERTIFICATION-REVIEW-${id}/review.json`,
    ga_certification_review_artifact: artifact(
      "goal3_ga_certification_review",
      `.comath/release/goal3-ga-certification/GOAL3-GA-CERTIFICATION-REVIEW-${id}/review.json`,
      "c"
    ),
    ga_certification_review_current: true,
    final_ga_audit_id: `GOAL3-FINAL-GA-AUDIT-${id}`,
    final_ga_audit_path: `.comath/release/goal3-final-ga-audit/GOAL3-FINAL-GA-AUDIT-${id}/audit.json`,
    final_ga_audit_artifact: artifact(
      "goal3_final_ga_audit",
      `.comath/release/goal3-final-ga-audit/GOAL3-FINAL-GA-AUDIT-${id}/audit.json`,
      "d"
    ),
    final_ga_audit_current: true,
    final_ga_audit_passed: true,
    proof_breadth_closure_id: `GOAL3-PROOF-BREADTH-CLOSURE-${id}`,
    proof_breadth_closure_path: `.comath/release/goal3-proof-breadth-closure/GOAL3-PROOF-BREADTH-CLOSURE-${id}/closure.json`,
    proof_breadth_closure_artifact: artifact(
      "goal3_release_candidate_proof_breadth_closure",
      `.comath/release/goal3-proof-breadth-closure/GOAL3-PROOF-BREADTH-CLOSURE-${id}/closure.json`,
      "e"
    ),
    proof_breadth_closure_current: true,
    proof_breadth_complete: true,
    operational_readiness_review_id: `GOAL3-GA-OPERATIONAL-READINESS-${id}`,
    operational_readiness_review_path: `.comath/release/goal3-ga-operational-readiness/GOAL3-GA-OPERATIONAL-READINESS-${id}/review.json`,
    operational_readiness_review_artifact: artifact(
      "goal3_ga_operational_readiness_review",
      `.comath/release/goal3-ga-operational-readiness/GOAL3-GA-OPERATIONAL-READINESS-${id}/review.json`,
      "f"
    ),
    operational_readiness_review_current: true,
    operational_readiness_status: "ready_for_ga_release_candidate_review",
    adapter_production_helper_source_bound: true,
    adapter_helper_profile_source: "operator_configured_provider_helper",
    adapter_production_helper_configured: true,
    adapter_bundled_protocol_asset: false,
    ga_certificate_available: true,
    proof_authority: "lean_kernel_clean_replay",
    can_promote_claim: false,
    can_certify_ga: true,
    claim_promotion_requires_ordinary_gate: true,
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
    typeof recordGoal3SourceBoundReleasePackage,
    "function",
    "Task307 must export a service-owned source-bound public release-package gate"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("goal3_source_bound_public_release_package_gate"),
    true,
    "Task307 capability ledger must advertise the source-bound release package gate"
  );
  for (const [path, pattern] of [
    ["README.md", /Task307.*source-bound.*release package/s],
    ["TODO.md", /Task307.*source-bound.*release package/s],
    ["REVIEW.md", /Goal 3 Task 307/s],
    ["AGENTS.md", /Task307.*source-bound.*release package/s],
    ["docs/architecture/ga-release-criteria.md", /Task307.*source-bound.*release package/s],
    ["docs/architecture/threat-model.md", /Task307.*source-bound.*release package/s],
    ["docs/architecture/adapter-contracts.md", /Task307.*source-bound.*release package/s],
    ["docs/architecture/acceptance-matrix.md", /Task307.*source-bound.*release package/s]
  ]) {
    assert.match(repoFile(path), pattern, `${path} must document Task307 source-bound release packaging`);
  }
  assert.equal(
    repoFile("scripts/phase0-smoke.mjs").includes("goal3-task307-source-bound-release-package.test.mjs"),
    true,
    "phase0 smoke must discover the Task307 focused suite"
  );

  const staleConsumption = writeConsumptionReview("0307-STALE");
  assert.throws(
    () =>
      recordGoal3SourceBoundReleasePackage(projectRoot, {
        project_id: projectId,
        release_package_id: "GOAL3-SOURCE-BOUND-RELEASE-PACKAGE-0307-STALE",
        actor: "goal3-task307 stale token=plain-token",
        ga_certificate_consumption_review_id: staleConsumption.body.ga_certificate_consumption_review_id,
        ga_certificate_consumption_review_path: staleConsumption.path,
        ga_certificate_consumption_review_sha256: "0".repeat(64)
      }),
    { code: "GOAL3_SOURCE_BOUND_RELEASE_PACKAGE_STALE" },
    "Task307 must reject stale Task306 consumption hashes before writing package material"
  );
  assert.equal(
    existsSync(
      join(
        projectRoot,
        ".comath/release/goal3-source-bound-release-package/GOAL3-SOURCE-BOUND-RELEASE-PACKAGE-0307-STALE/package.json"
      )
    ),
    false,
    "Task307 must not write partial package material after stale consumption input"
  );

  const invalidConsumption = writeConsumptionReview("0307-LEGACY", {
    adapter_production_helper_source_bound: false
  });
  assert.throws(
    () =>
      recordGoal3SourceBoundReleasePackage(projectRoot, {
        project_id: projectId,
        release_package_id: "GOAL3-SOURCE-BOUND-RELEASE-PACKAGE-0307-LEGACY",
        actor: "goal3-task307 legacy",
        ga_certificate_consumption_review_id: invalidConsumption.body.ga_certificate_consumption_review_id,
        ga_certificate_consumption_review_path: invalidConsumption.path,
        ga_certificate_consumption_review_sha256: invalidConsumption.sha256
      }),
    { code: "GOAL3_SOURCE_BOUND_RELEASE_PACKAGE_INVALID" },
    "Task307 must reject consumption artifacts that lost Task306 source-bound provenance"
  );

  const readyConsumption = writeConsumptionReview("0307-READY");
  const releasePackage = recordGoal3SourceBoundReleasePackage(projectRoot, {
    project_id: projectId,
    release_package_id: "GOAL3-SOURCE-BOUND-RELEASE-PACKAGE-0307-READY",
    actor: `goal3-task307 ${projectRoot} token=plain-token formally_checked can_promote_claim=true`,
    ga_certificate_consumption_review_id: readyConsumption.body.ga_certificate_consumption_review_id,
    ga_certificate_consumption_review_path: readyConsumption.path,
    ga_certificate_consumption_review_sha256: readyConsumption.sha256
  });

  assert.equal(releasePackage.schema_version, "comath.goal3_source_bound_release_package.v1");
  assert.equal(releasePackage.ok, true);
  assert.equal(releasePackage.release_package_status, "source_bound_public_diagnostic_package_ready");
  assert.equal(releasePackage.ga_certificate_consumption_review_current, true);
  assert.equal(releasePackage.source_bound_release_chain_current, true);
  assert.equal(releasePackage.public_archive_review_ok, true);
  assert.equal(releasePackage.proof_authority, "none");
  assert.equal(releasePackage.can_promote_claim, false);
  assert.equal(releasePackage.can_certify_ga, false);
  assert.equal(releasePackage.package_is_proof_authority, false);
  assert.equal(releasePackage.claim_promotion_requires_ordinary_gate, true);
  assertProjectRelative(releasePackage.release_package_path, "release_package_path");
  assertProjectRelative(releasePackage.source_review_public_archive_manifest_path, "source_review_public_archive_manifest_path");
  assertProjectRelative(releasePackage.public_archive_review_path, "public_archive_review_path");
  assertProjectRelative(releasePackage.release_package_artifact.path, "release_package_artifact.path");
  assertNoPublicLeak(releasePackage, "Task307 release package result");
  assert.doesNotMatch(releasePackage.actor, secretTerms);
  assert.doesNotMatch(releasePackage.actor, privilegedPublicTerms);

  const persistedPackage = readJson(releasePackage.release_package_path);
  assert.equal(persistedPackage.release_package_artifact, undefined);
  assert.equal(persistedPackage.proof_authority, "none");

  const archiveManifest = readJson(releasePackage.source_review_public_archive_manifest_path);
  assert.equal(archiveManifest.public_archive_is_proof_authority, false);
  assert.equal(archiveManifest.proof_authority, "none");
  assert.equal(archiveManifest.can_promote_claim, false);
  assert.equal(archiveManifest.can_restore, false);
  assert.equal(archiveManifest.reports.length, 3);

  for (const report of archiveManifest.reports) {
    assertProjectRelative(report.public_relative_path, `public ${report.format} report`);
    const publicText = readFileSync(join(projectRoot, report.public_relative_path), "utf8");
    assertNoPublicLeak(publicText, `Task307 public ${report.format} report`);
    if (report.format === "json") {
      const publicJson = JSON.parse(publicText);
      assert.equal(publicJson.proof_authority, "none");
      assert.equal(publicJson.can_promote_claim, false);
      assert.equal(publicJson.can_certify_ga, false);
      assert.equal(publicJson.package_is_proof_authority, false);
      assert.equal(publicJson.ga_certificate_consumption_review.sha256, readyConsumption.sha256);
    }
  }

  const archiveReview = readJson(releasePackage.public_archive_review_path);
  assert.equal(archiveReview.ok, true);
  assert.deepEqual(archiveReview.vetoes, []);
  assertNoPublicLeak(archiveReview, "Task307 public archive review");

  const server = createComathServer();
  const routeConsumption = writeConsumptionReview("0307-ROUTE");
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/goal3/source-bound-release-package",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      release_package_id: "GOAL3-SOURCE-BOUND-RELEASE-PACKAGE-0307-ROUTE",
      actor: "goal3-task307 route token=plain-token formally_checked",
      ga_certificate_consumption_review_id: routeConsumption.body.ga_certificate_consumption_review_id,
      ga_certificate_consumption_review_path: routeConsumption.path,
      ga_certificate_consumption_review_sha256: routeConsumption.sha256
    }
  });
  assert.equal(routeResponse.status, 200);
  assert.equal(routeResponse.body.source_bound_release_package.public_archive_review_ok, true);
  assert.equal(routeResponse.body.source_bound_release_package.proof_authority, "none");
  assert.equal(routeResponse.body.source_bound_release_package.can_promote_claim, false);
  assertNoPublicLeak(routeResponse.body, "Task307 public route response");

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (entry) =>
        entry.event_type === "release.goal3_source_bound_release_package_recorded" &&
        entry.payload.release_package_id === "GOAL3-SOURCE-BOUND-RELEASE-PACKAGE-0307-ROUTE" &&
        entry.payload.ga_certificate_consumption_review_artifact_sha256 === routeConsumption.sha256 &&
        entry.payload.public_archive_review_ok === true &&
        entry.payload.proof_authority === "none" &&
        entry.payload.can_promote_claim === false
    ),
    true,
    "Task307 package gate must emit source-bound package provenance"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task307 source-bound release package tests passed.");
