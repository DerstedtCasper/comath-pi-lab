import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  runGoal3GaPositiveMatrixTranche
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task22-positive-tranche-"));

const tranche = runGoal3GaPositiveMatrixTranche({
  projectRoot,
  startTaskId: "PM-002",
  endTaskId: "PM-012"
});

assert.equal(tranche.schema_version, "comath.goal3_positive_matrix_tranche.v1");
assert.equal(tranche.tranche_scope.start_task_id, "PM-002");
assert.equal(tranche.tranche_scope.end_task_id, "PM-012");
assert.equal(tranche.tranche_scope.expected_count, 11);
assert.equal(tranche.results.length, 11);
assert.deepEqual(
  tranche.results.map((result) => result.task_id),
  ["PM-002", "PM-003", "PM-004", "PM-005", "PM-006", "PM-007", "PM-008", "PM-009", "PM-010", "PM-011", "PM-012"]
);
assert.equal(tranche.summary.clean_replay_passed, 0, "Task 22 must not fake clean replay for PM-002 through PM-012");
assert.equal(tranche.summary.replayable_blocker, 11);
assert.equal(tranche.summary.promoted_count, 0);

const expectedSpecificBlockers = new Set([
  "lean_clean_replay_not_attempted_for_task",
  "requires_live_mathlib_or_domain_formalization"
]);

for (const result of tranche.results) {
  assert.equal(result.terminal_classification, "replayable_blocker", `${result.task_id} must remain non-promotional`);
  assert.equal(result.proof_authority, "none", `${result.task_id} must not use non-Lean proof authority`);
  assert.equal(result.can_promote_claim, false, `${result.task_id} must not promote without clean replay`);
  assert.equal(result.replay_attempt.schema_version, "comath.goal3_positive_replay_attempt_certificate.v1");
  assert.equal(result.replay_attempt.task_id, result.task_id);
  assert.equal(result.replay_attempt.attempt_status, "blocked_before_clean_replay");
  assert.equal(result.replay_attempt.can_promote_claim, false);
  assert.equal(result.replay_attempt.proof_authority, "none");
  assert.equal(result.replay_attempt.formal_spec_lock_hash.length, 64, `${result.task_id} must bind FormalSpecLock input hash`);
  assert.equal(result.replay_attempt.assumption_ledger_hash.length, 64, `${result.task_id} must bind AssumptionLedger input hash`);
  assert.equal(result.replay_attempt.dependency_lock_hash.length, 64, `${result.task_id} must bind dependency-lock expectation hash`);
  assert.ok(Array.isArray(result.replay_attempt.replay_command) && result.replay_attempt.replay_command.length > 0);
  assert.equal(result.replay_attempt.network_policy_final_replay, "disabled");
  assert.equal(result.replay_attempt.uses_production_theorem_family_recognizer, false);
  assert.equal(result.replay_attempt.uses_controlled_nat_linear_synthesis, false);
  assert.equal(result.replay_attempt.uses_default_assumptions, false);
  assert.equal(result.replay_attempt.cas_literature_search_or_vote_proof_authority, false);
  assert.equal(result.replay_attempt.direct_promotion_path, false);
  assert.ok(
    result.blockers.some((blocker) => expectedSpecificBlockers.has(blocker)),
    `${result.task_id} needs a specific replayable blocker instead of a generic batch blocker`
  );
}

const byTask = new Map(tranche.results.map((result) => [result.task_id, result]));
assert.ok(byTask.get("PM-002").blockers.includes("requires_live_mathlib_or_domain_formalization"));
assert.equal(byTask.get("PM-010").category, "Nat/List");
assert.equal(byTask.get("PM-011").category, "algebra");
assert.equal(byTask.get("PM-012").category, "algebra");
assert.ok(byTask.get("PM-011").blockers.includes("requires_live_mathlib_or_domain_formalization"));

console.log("Goal 3 Task 22 positive matrix tranche tests passed.");
