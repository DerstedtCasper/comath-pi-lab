import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createGoal3GaPositiveTaskManifest,
  packageGoal3GaPositiveMatrixFinalAuthorityEvidenceV3
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task47-pm003-authority-"));
const task = createGoal3GaPositiveTaskManifest().tasks.find((item) => item.task_id === "PM-003");
assert.ok(task, "PM-003 must exist in the positive matrix manifest");
assert.equal(task.category, "Nat/List");

const report = packageGoal3GaPositiveMatrixFinalAuthorityEvidenceV3({
  projectRoot,
  taskId: "PM-003",
  claimId: "C-PM-003"
});

assert.equal(report.schema_version, "comath.final_authority_packaging.v3");
assert.equal(report.task_id, "PM-003");
assert.equal(report.claim_id, "C-PM-003");
assert.equal(report.final_evidence_status, "blocked_missing_final_evidence");
assert.equal(report.blocker_code, "final_authority_evidence_incomplete");
assert.match(report.blocker_detail, /PM-003/);
assert.equal(report.proof_authority, "none");
assert.equal(report.can_promote_claim, false);
assert.equal(report.promotion_requires_gate, true);
assert.deepEqual(report.lean_run_manifest_paths, []);
assert.equal(report.final_replay_manifest_v3_path, "");
assert.equal(report.structured_audit_path, "");
assert.equal(report.dependency_closure_path, "");
assert.equal(report.axiom_profile_path, "");
assert.equal(report.statement_check_path, "");
assert.equal(report.third_party_replay_pack_path, "");
assert.ok(report.missing_final_evidence_classes.includes("lean_run_manifest_v3"));
assert.ok(report.missing_final_evidence_classes.includes("final_replay_manifest_v3"));
assert.ok(report.missing_final_evidence_classes.includes("structured_audit"));
assert.ok(report.missing_final_evidence_classes.includes("dependency_closure"));
assert.ok(report.missing_final_evidence_classes.includes("axiom_profile"));
assert.ok(report.missing_final_evidence_classes.includes("statement_check"));
assert.ok(report.missing_final_evidence_classes.includes("third_party_replay_pack"));
assert.match(report.blocker_path, /^\.comath\/release\/positive_matrix\/PM-003\/final_authority_evidence_blocker_v3\.json$/);
assert.match(report.packaging_report_path, /^\.comath\/release\/positive_matrix\/PM-003\/final_authority_packaging_report_v3\.json$/);
assert.equal(report.source_packaging_report_path, "");

const reportPath = join(projectRoot, report.packaging_report_path);
const blockerPath = join(projectRoot, report.blocker_path);
assert.ok(existsSync(reportPath), "generic PM-003 packaging report must be persisted");
assert.ok(existsSync(blockerPath), "generic PM-003 blocker must be persisted");
const persisted = JSON.parse(readFileSync(reportPath, "utf8"));
assert.equal(persisted.task_id, "PM-003");
assert.equal(persisted.proof_authority, "none");
assert.equal(persisted.can_promote_claim, false);
assert.equal(persisted.promotion_requires_gate, true);

assert.throws(
  () => packageGoal3GaPositiveMatrixFinalAuthorityEvidenceV3({ projectRoot, taskId: "PM-001", claimId: "C-PM-001" }),
  /invalid_positive_matrix_final_authority_task/
);

console.log("Goal 3 Task 47 PM-003 final authority blocker test passed.");
