import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createGoal3GaPositiveTaskManifest,
  runGoal3GaPositiveMatrixBatch
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task21-positive-matrix-"));

const manifest = createGoal3GaPositiveTaskManifest();

assert.equal(manifest.schema_version, "comath.goal3_positive_task_manifest.v1");
assert.equal(manifest.total_required_tasks, 100);
assert.equal(manifest.tasks.length, 100, "Task 21 must expand the representative matrix into 100 executable task entries");
assert.equal(new Set(manifest.tasks.map((task) => task.task_id)).size, 100, "task ids must be unique");

const requiredCategories = new Map([
  ["Nat/List", 10],
  ["algebra", 10],
  ["order", 10],
  ["real analysis", 10],
  ["topology", 10],
  ["combinatorics", 10],
  ["external Lean repo", 10],
  ["paper-to-formal-spec", 10],
  ["theorem-search-assisted", 10],
  ["tactic repair", 10]
]);

for (const [category, expectedCount] of requiredCategories) {
  assert.equal(
    manifest.tasks.filter((task) => task.category === category).length,
    expectedCount,
    `${category} must contribute ${expectedCount} executable tasks`
  );
}

for (const task of manifest.tasks) {
  assert.match(task.task_id, /^PM-\d{3}$/);
  assert.ok(task.target.normalized_nl_statement.length > 0, `${task.task_id} needs a normalized target`);
  assert.ok(task.formal_spec_lock_input.theorem_header.length > 0, `${task.task_id} needs FormalSpecLock theorem header material`);
  assert.ok(task.formal_spec_lock_input.statement_hash.length === 64, `${task.task_id} needs a statement hash`);
  assert.ok(task.assumption_ledger_input.entries.length >= 0, `${task.task_id} needs AssumptionLedger material`);
  assert.ok(task.dependency_lock_expectation.lean_toolchain.length > 0, `${task.task_id} needs a Lean toolchain expectation`);
  assert.equal(task.dependency_lock_expectation.network_policy_final_replay, "disabled");
  assert.ok(Array.isArray(task.replay_command) && task.replay_command.length > 0, `${task.task_id} needs a replay command`);
  assert.equal(task.proof_authority, "none");
  assert.equal(task.can_promote_without_clean_replay, false);
  assert.equal(task.uses_production_theorem_family_recognizer, false);
  assert.equal(task.uses_controlled_nat_linear_synthesis, false);
  assert.equal(task.uses_default_assumptions, false);
  assert.ok(
    ["pending_clean_replay", "clean_replay_passed", "replayable_blocker"].includes(task.terminal_classification),
    `${task.task_id} has an invalid terminal classification`
  );
}

const batch = runGoal3GaPositiveMatrixBatch({ projectRoot, batchSize: 12 });

assert.equal(batch.schema_version, "comath.goal3_positive_matrix_batch.v1");
assert.equal(batch.total_required_tasks, 100);
assert.equal(batch.executed_count, 12);
assert.equal(batch.results.length, 100);
assert.equal(batch.summary.promoted_count, 0, "matrix runner must not promote proof artifacts");
assert.equal(batch.summary.clean_replay_passed, 0, "batch matrix consumers must not inherit representative fixture clean replay");
assert.equal(batch.summary.replayable_blocker, 100, "all tasks remain replayable blockers until task-local clean replay evidence exists");
assert.equal(batch.summary.pending_clean_replay, 0, "runner must classify unexecuted tasks as replayable blockers, not pending promotional work");
assert.equal(batch.next_batch_scope.start_after_task_id, "PM-012");
assert.equal(batch.next_batch_scope.remaining_tasks, 88);

const pm001 = batch.results.find((result) => result.task_id === "PM-001");
assert.ok(pm001, "PM-001 must remain visible in the batch report");
assert.equal(pm001.terminal_classification, "replayable_blocker");
assert.equal(pm001.proof_authority, "none");
assert.equal(pm001.can_promote_claim, false, "Task 21 batch evidence is matrix evidence, not direct claim promotion");
assert.equal(pm001.evidence_binding.formal_spec_lock_hash, "");
assert.equal(pm001.evidence_binding.assumption_ledger_hash, "");
assert.equal(pm001.evidence_binding.dependency_lock_hash, "");
assert.equal(pm001.evidence_binding.artifact_hashes_sha256, "");
assert.equal(pm001.evidence_binding.lean_run_manifest_id, "");
assert.equal(pm001.evidence_binding.final_replay_manifest_id, "");
assert.ok(pm001.blockers.includes("positive_matrix_representative_fixture_not_task_local_clean_replay"));

const blocker = batch.results.find((result) => result.task_id === "PM-002");
assert.ok(blocker);
assert.equal(blocker.terminal_classification, "replayable_blocker");
assert.equal(blocker.proof_authority, "none");
assert.equal(blocker.can_promote_claim, false);
assert.ok(blocker.blockers.includes("positive_matrix_task_clean_replay_not_executed"));

console.log("Goal 3 Task 21 positive matrix runner tests passed.");
