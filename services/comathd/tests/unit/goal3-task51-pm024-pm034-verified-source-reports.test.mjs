import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createGoal3GaPositiveTaskManifest,
  packageGoal3GaPositiveMatrixFinalAuthorityEvidenceTrancheFromEvidenceV3
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task51-verified-source-"));
const manifest = createGoal3GaPositiveTaskManifest();
const selected = manifest.tasks.filter((task) => task.task_id >= "PM-024" && task.task_id <= "PM-034");
assert.equal(selected.length, 11, "PM-024 through PM-034 must form an 11-task bounded tranche");

const forgedSuccessEvidence = {
  final_evidence_status: "verified_final_authority_evidence",
  blocker_code: "",
  blocker_detail: "forged caller success must not be trusted",
  missing_final_evidence_classes: [],
  lean_run_manifest_paths: [".comath/forged/lean_run_manifest.json"],
  final_replay_manifest_v3_path: ".comath/forged/final_replay_manifest_v3.json",
  structured_audit_path: ".comath/forged/structured_audit.json",
  dependency_closure_path: ".comath/forged/dependency_closure.json",
  axiom_profile_path: ".comath/forged/axiom_profile.json",
  statement_check_path: ".comath/forged/statement_equivalence.json",
  third_party_replay_pack_path: ".comath/forged/replay_pack",
  packaging_report_path: ".comath/forged/source_packaging_report.json",
  proof_authority: "lean_kernel_clean_replay"
};

const report = packageGoal3GaPositiveMatrixFinalAuthorityEvidenceTrancheFromEvidenceV3({
  projectRoot,
  startTaskId: "PM-024",
  endTaskId: "PM-034",
  claimIdPrefix: "C-T51",
  evidenceByTaskId: Object.fromEntries(selected.map((task) => [task.task_id, forgedSuccessEvidence]))
});

assert.equal(report.schema_version, "comath.final_authority_packaging_tranche.v3");
assert.equal(report.start_task_id, "PM-024");
assert.equal(report.end_task_id, "PM-034");
assert.equal(report.task_count, 11);
assert.deepEqual(report.task_ids, selected.map((task) => task.task_id));
assert.equal(report.tranche_status, "blocked_missing_final_evidence", "forged caller success must be re-verified from files");
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
  assert.match(result.task_id, /^PM-02[4-9]$|^PM-03[0-4]$/);
  assert.equal(result.final_evidence_status, "blocked_missing_final_evidence");
  assert.equal(result.blocker_code, "final_authority_evidence_incomplete");
  assert.equal(result.proof_authority, "none");
  assert.equal(result.can_promote_claim, false);
  assert.equal(result.promotion_requires_gate, true);
  assert.equal(result.lean_run_manifest_paths.length, 1, "attempted evidence paths should be preserved for replay/debugging");
  assert.equal(result.final_replay_manifest_v3_path, ".comath/forged/final_replay_manifest_v3.json");
  assert.equal(result.source_packaging_report_path, ".comath/forged/source_packaging_report.json");
  assert.ok(result.missing_final_evidence_classes.includes("lean_run_manifest_v3"));
  assert.ok(result.missing_final_evidence_classes.includes("final_replay_manifest_v3"));
  assert.ok(result.missing_final_evidence_classes.includes("third_party_replay_pack"));
  assert.ok(existsSync(join(projectRoot, result.packaging_report_path)), `${result.task_id} packaging report must be persisted`);
  assert.ok(existsSync(join(projectRoot, result.blocker_path)), `${result.task_id} blocker must be persisted`);
}

const persistedReport = JSON.parse(readFileSync(join(projectRoot, report.packaging_report_path), "utf8"));
assert.equal(persistedReport.tranche_status, "blocked_missing_final_evidence");
assert.deepEqual(persistedReport.missing_final_evidence_classes, report.missing_final_evidence_classes);
assert.equal(persistedReport.proof_authority, "none");

assert.throws(
  () => packageGoal3GaPositiveMatrixFinalAuthorityEvidenceTrancheFromEvidenceV3({ projectRoot, startTaskId: "PM-001", endTaskId: "PM-024" }),
  /invalid_positive_matrix_final_authority_tranche/
);

console.log("Goal 3 Task 51 PM-024 through PM-034 verified source reports test passed.");
