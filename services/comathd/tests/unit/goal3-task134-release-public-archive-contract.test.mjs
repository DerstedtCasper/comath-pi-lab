import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createComathServer,
  exportSnapshot,
  runGoal3GaAcceptanceWorkflow
} from "../../dist/index.js";

const privilegedPublicTerms =
  /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|proven|verified_final_authority_evidence)\b/i;

function readSnapshotText(snapshot, relativePath) {
  const normalized = relativePath.replace(/\\/g, "/");
  const entry = snapshot.manifest.entries.find((item) => item.relative_path === normalized);
  assert.ok(entry, `missing snapshot entry ${normalized}`);
  return readFileSync(join(snapshot.snapshot_root, entry.snapshot_path), "utf8");
}

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task134-release-public-archive-"));
const server = createComathServer();

try {
  const report = runGoal3GaAcceptanceWorkflow({ projectRoot, actor: "goal3-task134-test" });

  assert.equal(report.public_archive_contract.schema_version, "comath.goal3_public_archive_contract.v1");
  assert.equal(report.public_archive_contract.proof_authority, "none");
  assert.equal(report.public_archive_contract.can_promote_claim, false);

  assert.equal(report.public_archive_contract.source_review_archive.archive_kind, "source_review_public_diagnostic");
  assert.equal(report.public_archive_contract.source_review_archive.restore_source, false);
  assert.equal(report.public_archive_contract.source_review_archive.public_archive_is_proof_authority, false);
  assert.equal(report.public_archive_contract.source_review_archive.requires_sanitized_generated_reports, true);
  assert.deepEqual(report.public_archive_contract.source_review_archive.generated_report_formats, ["markdown", "html", "json"]);

  assert.equal(report.public_archive_contract.public_snapshot_download.snapshot_kind, "public_download");
  assert.equal(report.public_archive_contract.public_snapshot_download.can_restore, false);
  assert.equal(report.public_archive_contract.public_snapshot_download.restore_source, false);
  assert.equal(
    report.public_archive_contract.public_snapshot_download.restore_rejection_code,
    "SNAPSHOT_PUBLIC_DOWNLOAD_NOT_RESTORABLE"
  );

  assert.equal(report.public_archive_contract.internal_restore_snapshot.snapshot_kind, "internal_restore");
  assert.equal(report.public_archive_contract.internal_restore_snapshot.can_restore, true);
  assert.equal(report.public_archive_contract.internal_restore_snapshot.restore_source, true);
  assert.equal(report.public_archive_contract.internal_restore_snapshot.byte_for_byte_runtime_fidelity, true);
  assert.equal(report.public_archive_contract.internal_restore_snapshot.public_distribution, false);

  assert.equal(report.public_archive_contract.lean_authority_evidence.required_packaging_schema, "comath.final_authority_packaging.v3");
  assert.equal(report.public_archive_contract.lean_authority_evidence.required_source_report, true);
  assert.equal(report.public_archive_contract.lean_authority_evidence.public_archive_substitutes_for_lean_authority, false);

  const releaseReportPath = ".comath/release/source-review/public_report.md";
  const leanEvidenceReportPath = ".comath/evidence/CLM-TASK134/lean/source_review_report.md";
  mkdirSync(join(projectRoot, ".comath/release/source-review"), { recursive: true });
  mkdirSync(join(projectRoot, ".comath/evidence/CLM-TASK134/lean"), { recursive: true });
  writeFileSync(
    join(projectRoot, releaseReportPath),
    "source-review public report says proven, clean_replay_passed, and verified_final_authority_evidence\n",
    "utf8"
  );
  writeFileSync(
    join(projectRoot, leanEvidenceReportPath),
    "Lean evidence public archive metadata says lean_kernel_clean_replay and formally_checked\n",
    "utf8"
  );

  const publicSnapshot = await exportSnapshot(projectRoot, {
    project_id: "PRJ-0134",
    actor: "goal3-task134"
  });
  assert.equal(publicSnapshot.manifest.snapshot_kind, "public_download");
  assert.equal(publicSnapshot.manifest.can_restore, false);
  assert.doesNotMatch(readSnapshotText(publicSnapshot, releaseReportPath), privilegedPublicTerms);
  assert.doesNotMatch(readSnapshotText(publicSnapshot, leanEvidenceReportPath), privilegedPublicTerms);

  const internalSnapshot = await exportSnapshot(projectRoot, {
    project_id: "PRJ-0134",
    actor: "goal3-task134",
    audience: "internal_restore"
  });
  assert.equal(internalSnapshot.manifest.snapshot_kind, "internal_restore");
  assert.equal(internalSnapshot.manifest.can_restore, true);
  assert.match(readSnapshotText(internalSnapshot, releaseReportPath), privilegedPublicTerms);
  assert.match(readSnapshotText(internalSnapshot, leanEvidenceReportPath), privilegedPublicTerms);

  const routeExport = await server.inject({
    method: "POST",
    path: "/snapshot/export",
    body: {
      project_root: projectRoot,
      project_id: "PRJ-0134",
      actor: "goal3-task134-route",
      audience: "internal_restore"
    }
  });
  assert.equal(routeExport.status, 200, JSON.stringify(routeExport.body));
  assert.equal(routeExport.body.manifest.snapshot_kind, "public_download");
  assert.equal(routeExport.body.manifest.can_restore, false);
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 134 release public archive contract tests passed.");
