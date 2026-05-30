import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createGoal3GaPositiveTaskManifest,
  packageGoal3GaPositiveMatrixFinalAuthorityEvidenceTrancheV3
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task48-authority-tranche-"));
const manifest = createGoal3GaPositiveTaskManifest();
const selected = manifest.tasks.filter((task) => task.task_id >= "PM-004" && task.task_id <= "PM-012");
assert.equal(selected.length, 9, "PM-004 through PM-012 must form a 9-task bounded tranche");

const report = packageGoal3GaPositiveMatrixFinalAuthorityEvidenceTrancheV3({
  projectRoot,
  startTaskId: "PM-004",
  endTaskId: "PM-012",
  claimIdPrefix: "C-T48"
});

assert.equal(report.schema_version, "comath.final_authority_packaging_tranche.v3");
assert.equal(report.start_task_id, "PM-004");
assert.equal(report.end_task_id, "PM-012");
assert.equal(report.task_count, 9);
assert.deepEqual(report.task_ids, selected.map((task) => task.task_id));
assert.equal(report.proof_authority, "none");
assert.equal(report.can_promote_claim, false);
assert.equal(report.promotion_requires_gate, true);
assert.equal(report.promoted_count, 0);
assert.ok(report.packaging_report_path.endsWith("final_authority_packaging_tranche_v3.json"));

for (const result of report.results) {
  assert.match(result.task_id, /^PM-00[4-9]$|^PM-01[0-2]$/);
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
  assert.ok(result.missing_final_evidence_classes.includes("lean_run_manifest_v3"));
  assert.ok(result.missing_final_evidence_classes.includes("final_replay_manifest_v3"));
  assert.ok(result.missing_final_evidence_classes.includes("structured_audit"));
  assert.ok(result.missing_final_evidence_classes.includes("dependency_closure"));
  assert.ok(result.missing_final_evidence_classes.includes("axiom_profile"));
  assert.ok(result.missing_final_evidence_classes.includes("statement_check"));
  assert.ok(result.missing_final_evidence_classes.includes("third_party_replay_pack"));
  assert.match(result.packaging_report_path, new RegExp(`^\\.comath/release/positive_matrix/${result.task_id}/final_authority_packaging_report_v3\\.json$`));
  assert.match(result.blocker_path, new RegExp(`^\\.comath/release/positive_matrix/${result.task_id}/final_authority_evidence_blocker_v3\\.json$`));
  assert.ok(existsSync(join(projectRoot, result.packaging_report_path)), `${result.task_id} packaging report must be persisted`);
  assert.ok(existsSync(join(projectRoot, result.blocker_path)), `${result.task_id} blocker must be persisted`);
}

const persistedReport = JSON.parse(readFileSync(join(projectRoot, report.packaging_report_path), "utf8"));
assert.deepEqual(persistedReport.task_ids, report.task_ids);
assert.equal(persistedReport.promoted_count, 0);

assert.throws(
  () => packageGoal3GaPositiveMatrixFinalAuthorityEvidenceTrancheV3({ projectRoot, startTaskId: "PM-001", endTaskId: "PM-004" }),
  /invalid_positive_matrix_final_authority_tranche/
);
assert.equal(
  existsSync(join(projectRoot, ".comath/release/positive_matrix/PM-001/final_authority_packaging_report_v3.json")),
  false,
  "invalid PM-001 tranche must not write PM-001 packaging artifacts"
);
assert.throws(
  () => packageGoal3GaPositiveMatrixFinalAuthorityEvidenceTrancheV3({ projectRoot, startTaskId: "PM-012", endTaskId: "PM-004" }),
  /invalid_positive_matrix_final_authority_tranche/
);

console.log("Goal 3 Task 48 PM-004 through PM-012 final authority tranche test passed.");
