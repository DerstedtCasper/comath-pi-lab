import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  exportSnapshot,
  initProject
} from "../../dist/index.js";

const privilegedPublicTerms =
  /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|proven|verified_final_authority_evidence)\b/i;

function readSnapshotText(snapshot, relativePath) {
  const normalized = relativePath.replace(/\\/g, "/");
  const entry = snapshot.manifest.entries.find((item) => item.relative_path === normalized);
  assert.ok(entry, `missing snapshot entry ${normalized}`);
  return readFileSync(join(snapshot.snapshot_root, entry.snapshot_path), "utf8");
}

function assertPublicGeneratedReport(snapshot, relativePath) {
  assert.doesNotMatch(
    readSnapshotText(snapshot, relativePath),
    privilegedPublicTerms,
    `${relativePath} must be sanitized in public generated-report downloads`
  );
}

function assertInternalGeneratedReport(snapshot, relativePath) {
  assert.match(
    readSnapshotText(snapshot, relativePath),
    privilegedPublicTerms,
    `${relativePath} must preserve byte-for-byte internal restore material`
  );
}

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task135-generated-reports-"));

try {
  const { project } = initProject({ name: "Task 135 public generated reports", root_path: projectRoot });
  const paperRoot = join(projectRoot, ".comath/artifacts/papers");
  const releaseRoot = join(projectRoot, ".comath/release/source-review");
  mkdirSync(paperRoot, { recursive: true });
  mkdirSync(releaseRoot, { recursive: true });

  const generatedReports = [
    ".comath/artifacts/papers/main.md",
    ".comath/artifacts/papers/public-report.html",
    ".comath/artifacts/papers/paper_state.json",
    ".comath/release/source-review/public-report.html",
    ".comath/release/source-review/public-report.json"
  ];

  writeFileSync(
    join(projectRoot, generatedReports[0]),
    "paper markdown says proven, formally_checked, and clean_replay_passed\n",
    "utf8"
  );
  writeFileSync(
    join(projectRoot, generatedReports[1]),
    "<p>paper html says formal_replay_passed and verified_final_authority_evidence</p>\n",
    "utf8"
  );
  writeFileSync(
    join(projectRoot, generatedReports[2]),
    JSON.stringify({
      status: "completed_formal_proof",
      exactness: "lean_kernel_clean_replay",
      label: "proven"
    }),
    "utf8"
  );
  writeFileSync(
    join(projectRoot, generatedReports[3]),
    "<p>release html says proven and lean_kernel_clean_replay</p>\n",
    "utf8"
  );
  writeFileSync(
    join(projectRoot, generatedReports[4]),
    JSON.stringify({
      public_archive_label: "verified_final_authority_evidence",
      claim_status: "formally_checked"
    }),
    "utf8"
  );

  const publicSnapshot = await exportSnapshot(projectRoot, {
    project_id: project.project_id,
    actor: "goal3-task135"
  });
  assert.equal(publicSnapshot.manifest.snapshot_kind, "public_download");
  assert.equal(publicSnapshot.manifest.can_restore, false);
  for (const reportPath of generatedReports) {
    assertPublicGeneratedReport(publicSnapshot, reportPath);
  }

  const internalSnapshot = await exportSnapshot(projectRoot, {
    project_id: project.project_id,
    actor: "goal3-task135",
    audience: "internal_restore"
  });
  assert.equal(internalSnapshot.manifest.snapshot_kind, "internal_restore");
  assert.equal(internalSnapshot.manifest.can_restore, true);
  for (const reportPath of generatedReports) {
    assertInternalGeneratedReport(internalSnapshot, reportPath);
  }
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 135 public generated report sanitizer test passed.");
