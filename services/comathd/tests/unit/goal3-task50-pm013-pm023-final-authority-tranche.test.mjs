import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createGoal3GaPositiveTaskManifest,
  packageGoal3GaPositiveMatrixFinalAuthorityEvidenceTrancheV3
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task50-authority-tranche-"));
const manifest = createGoal3GaPositiveTaskManifest();
const selected = manifest.tasks.filter((task) => task.task_id >= "PM-013" && task.task_id <= "PM-023");
assert.equal(selected.length, 11, "PM-013 through PM-023 must form an 11-task bounded tranche");

const report = packageGoal3GaPositiveMatrixFinalAuthorityEvidenceTrancheV3({
  projectRoot,
  startTaskId: "PM-013",
  endTaskId: "PM-023",
  claimIdPrefix: "C-T50"
});

assert.equal(report.schema_version, "comath.final_authority_packaging_tranche.v3");
assert.equal(report.start_task_id, "PM-013");
assert.equal(report.end_task_id, "PM-023");
assert.equal(report.task_count, 11);
assert.deepEqual(report.task_ids, selected.map((task) => task.task_id));
assert.equal(report.tranche_status, "blocked_missing_final_evidence");
assert.equal(report.proof_authority, "none");
assert.equal(report.can_promote_claim, false);
assert.equal(report.promotion_requires_gate, true);
assert.equal(report.promoted_count, 0);
assert.deepEqual(report.missing_final_evidence_classes, [
  "lean_run_manifest_v3",
  "final_replay_manifest_v3",
  "structured_audit",
  "dependency_closure",
  "axiom_profile",
  "statement_check",
  "third_party_replay_pack"
]);

for (const result of report.results) {
  assert.match(result.task_id, /^PM-01[3-9]$|^PM-02[0-3]$/);
  assert.equal(result.final_evidence_status, "blocked_missing_final_evidence");
  assert.equal(result.blocker_code, "final_authority_evidence_incomplete");
  assert.equal(result.proof_authority, "none");
  assert.equal(result.can_promote_claim, false);
  assert.equal(result.promotion_requires_gate, true);
  assert.deepEqual(result.lean_run_manifest_paths, []);
  assert.equal(result.final_replay_manifest_v3_path, "");
  assert.equal(result.structured_audit_path, "");
  assert.equal(result.dependency_closure_path, "");
  assert.equal(result.axiom_profile_path, "");
  assert.equal(result.statement_check_path, "");
  assert.equal(result.third_party_replay_pack_path, "");
  assert.match(result.packaging_report_path, new RegExp(`^\\.comath/release/positive_matrix/${result.task_id}/final_authority_packaging_report_v3\\.json$`));
  assert.match(result.blocker_path, new RegExp(`^\\.comath/release/positive_matrix/${result.task_id}/final_authority_evidence_blocker_v3\\.json$`));
  assert.ok(existsSync(join(projectRoot, result.packaging_report_path)), `${result.task_id} packaging report must be persisted`);
  assert.ok(existsSync(join(projectRoot, result.blocker_path)), `${result.task_id} blocker must be persisted`);
}

const persistedReport = JSON.parse(readFileSync(join(projectRoot, report.packaging_report_path), "utf8"));
assert.equal(persistedReport.tranche_status, "blocked_missing_final_evidence");
assert.deepEqual(persistedReport.missing_final_evidence_classes, report.missing_final_evidence_classes);
assert.deepEqual(persistedReport.task_ids, report.task_ids);
assert.equal(persistedReport.promoted_count, 0);

assert.throws(
  () => packageGoal3GaPositiveMatrixFinalAuthorityEvidenceTrancheV3({ projectRoot, startTaskId: "PM-001", endTaskId: "PM-013" }),
  /invalid_positive_matrix_final_authority_tranche/
);
assert.equal(
  existsSync(join(projectRoot, ".comath/release/positive_matrix/PM-001/final_authority_packaging_report_v3.json")),
  false,
  "invalid PM-001 tranche must not write PM-001 packaging artifacts"
);

console.log("Goal 3 Task 50 PM-013 through PM-023 final authority tranche test passed.");
