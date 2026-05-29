import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createGoal3GaPositiveProofMatrix,
  runGoal3GaAcceptanceWorkflow
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task17-ga-acceptance-"));

const requiredNegativeCases = [
  "fake_stdout",
  "agent_pass_log",
  "sorry_final_proof",
  "admit_final_proof",
  "axiom_target",
  "axiom_dependency",
  "unsafe_declaration",
  "opaque_escape_hatch",
  "constant_fake_theorem",
  "statement_drift",
  "hidden_assumption",
  "default_assumption_injection",
  "unapproved_import",
  "toolchain_mismatch",
  "mathlib_revision_change",
  "external_repo_unpinned",
  "network_replay",
  "symlink_escape",
  "untracked_import",
  "modified_file_after_replay",
  "cas_only_proof",
  "literature_only_proof",
  "vote_only_proof",
  "human_review_only_proof"
];

const report = runGoal3GaAcceptanceWorkflow({ projectRoot, actor: "goal3-task17-test" });

assert.equal(report.schema_version, "comath.goal3_ga_acceptance.v1");
assert.equal(report.proof_authority, "none");
assert.equal(report.trust_core_negative_suite.all_required_cases_fail_closed, true);
assert.deepEqual(
  report.trust_core_negative_suite.missing_required_cases,
  [],
  "GA trust-core suite must enumerate every required negative case"
);

for (const caseId of requiredNegativeCases) {
  const item = report.trust_core_negative_suite.cases.find((candidate) => candidate.case_id === caseId);
  assert.ok(item, `missing negative case ${caseId}`);
  assert.equal(item.result, "blocked", `${caseId} must fail closed`);
  assert.equal(item.can_promote_claim, false, `${caseId} must not promote`);
  assert.ok(item.bound_gate.length > 0, `${caseId} must bind at least one real gate family`);
  assert.ok(item.vetoes.length > 0, `${caseId} must record veto evidence`);
}

assert.equal(report.positive_workflow.result, "representative_verified_fixture");
assert.equal(report.positive_workflow.uses_production_theorem_family_recognizer, false);
assert.equal(report.positive_workflow.uses_controlled_nat_linear_synthesis, false);
assert.equal(report.positive_workflow.can_promote_claim, true);
assert.equal(report.positive_workflow.binding_checklist.formal_spec_lock, true);
assert.equal(report.positive_workflow.binding_checklist.assumption_ledger, true);
assert.equal(report.positive_workflow.binding_checklist.dependency_lock, true);
assert.equal(report.positive_workflow.binding_checklist.toolchain_hash, true);
assert.equal(report.positive_workflow.binding_checklist.artifact_hashes, true);
assert.equal(report.positive_workflow.binding_checklist.lean_run_manifest_v3, true);
assert.equal(report.positive_workflow.binding_checklist.final_replay_manifest_v3, true);
assert.equal(report.positive_workflow.binding_checklist.third_party_replay_pack, true);
assert.equal(report.positive_workflow.final_replay_verification.ok, true);
assert.equal(report.positive_workflow.lean_run_verification.ok, true);

assert.ok(report.positive_matrix.total_required_tasks >= 100);
assert.ok(report.positive_matrix.representative_seeds.length >= 10);
assert.equal(report.positive_matrix.remaining_matrix_blocker.status, "replayable_blocker");
assert.equal(report.positive_matrix.remaining_matrix_blocker.can_promote_claim, false);
assert.ok(
  report.positive_matrix.representative_seeds.some((seed) => seed.domain === "paper-to-formal-spec"),
  "matrix must include paper-to-formal-spec coverage"
);
assert.ok(
  report.positive_matrix.representative_seeds.some((seed) => seed.domain === "external Lean repo"),
  "matrix must include external Lean repo coverage"
);

const standaloneMatrix = createGoal3GaPositiveProofMatrix();
assert.equal(standaloneMatrix.total_required_tasks, report.positive_matrix.total_required_tasks);
assert.deepEqual(standaloneMatrix.remaining_matrix_blocker, report.positive_matrix.remaining_matrix_blocker);

console.log("Goal 3 Task 17 GA acceptance workflow tests passed.");
