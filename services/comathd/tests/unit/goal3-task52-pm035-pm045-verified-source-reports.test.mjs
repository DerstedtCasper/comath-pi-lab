import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createGoal3GaPositiveTaskManifest,
  packageGoal3GaPositiveMatrixFinalAuthorityEvidenceTrancheFromEvidenceV3
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task52-verified-source-"));
const manifest = createGoal3GaPositiveTaskManifest();
const selected = manifest.tasks.filter((task) => task.task_id >= "PM-035" && task.task_id <= "PM-045");
assert.equal(selected.length, 11, "PM-035 through PM-045 must form an 11-task bounded tranche");

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
  startTaskId: "PM-035",
  endTaskId: "PM-045",
  claimIdPrefix: "C-T52",
  evidenceByTaskId: Object.fromEntries(selected.map((task) => [task.task_id, forgedSuccessEvidence]))
});

assert.equal(report.schema_version, "comath.final_authority_packaging_tranche.v3");
assert.equal(report.start_task_id, "PM-035");
assert.equal(report.end_task_id, "PM-045");
assert.equal(report.task_count, 11);
assert.deepEqual(report.task_ids, selected.map((task) => task.task_id));
assert.equal(report.tranche_status, "blocked_missing_final_evidence", "forged caller success must be re-verified from files");
assert.equal(report.proof_authority, "none");
assert.equal(report.can_promote_claim, false);
assert.equal(report.promotion_requires_gate, true);
assert.equal(report.promoted_count, 0);

for (const result of report.results) {
  assert.match(result.task_id, /^PM-03[5-9]$|^PM-04[0-5]$/);
  assert.equal(result.final_evidence_status, "blocked_missing_final_evidence");
  assert.equal(result.blocker_code, "final_authority_evidence_incomplete");
  assert.equal(result.proof_authority, "none");
  assert.equal(result.can_promote_claim, false);
  assert.equal(result.promotion_requires_gate, true);
  assert.equal(result.source_packaging_report_path, ".comath/forged/source_packaging_report.json");
  assert.ok(existsSync(join(projectRoot, result.packaging_report_path)), `${result.task_id} packaging report must be persisted`);
  assert.ok(existsSync(join(projectRoot, result.blocker_path)), `${result.task_id} blocker must be persisted`);

  assert.equal(result.source_verification.verification_basis, "project_local_artifacts");
  assert.equal(result.source_verification.caller_success_metadata_trusted, false);
  assert.equal(result.source_verification.verified_final_evidence_classes.length, 0);
  assert.deepEqual(result.source_verification.missing_final_evidence_classes, result.missing_final_evidence_classes);
  assert.equal(result.source_verification.lean_run_manifest_paths_checked, 1);
}

const persistedResult = JSON.parse(readFileSync(join(projectRoot, report.results[0].packaging_report_path), "utf8"));
assert.equal(persistedResult.source_verification.verification_basis, "project_local_artifacts");
assert.equal(persistedResult.source_verification.caller_success_metadata_trusted, false);

assert.equal(
  existsSync(join(projectRoot, ".comath/release/positive_matrix/PM-046/final_authority_packaging_report_v3.json")),
  false,
  "Task 52 tranche must not write the next-batch PM-046 packaging report"
);

console.log("Goal 3 Task 52 PM-035 through PM-045 verified source reports test passed.");
