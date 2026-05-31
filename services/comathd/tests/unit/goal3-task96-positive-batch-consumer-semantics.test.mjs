import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  runGoal3GaAcceptanceWorkflow,
  runGoal3GaPositiveMatrixBatch
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task96-positive-batch-semantics-"));

try {
  const representative = runGoal3GaAcceptanceWorkflow({ projectRoot, actor: "goal3-task96-representative" });
  assert.equal(
    representative.positive_workflow.result,
    "representative_verified_fixture",
    "Task96 must not remove the separate historical representative workflow fixture"
  );
  assert.equal(representative.positive_workflow.final_replay_verification.ok, true);

  const batch = runGoal3GaPositiveMatrixBatch({ projectRoot, batchSize: 12 });

  assert.equal(batch.schema_version, "comath.goal3_positive_matrix_batch.v1");
  assert.equal(batch.summary.clean_replay_passed, 0, "batch matrix consumers cannot inherit the representative fixture clean replay");
  assert.equal(batch.summary.replayable_blocker, 100);
  assert.equal(batch.summary.promoted_count, 0);
  assert.ok(
    batch.results.every((result) => result.proof_authority === "none"),
    "batch matrix results must not surface Lean proof authority without task-local clean replay evidence"
  );
  assert.ok(
    batch.results.every((result) => result.terminal_classification === "replayable_blocker"),
    "batch matrix results remain replayable blockers until each task has its own authority evidence"
  );

  const pm001 = batch.results.find((result) => result.task_id === "PM-001");
  assert.ok(pm001, "PM-001 must remain visible in the batch report");
  assert.equal(pm001.terminal_classification, "replayable_blocker");
  assert.equal(pm001.proof_authority, "none");
  assert.deepEqual(pm001.evidence_binding, {
    formal_spec_lock_hash: "",
    assumption_ledger_hash: "",
    dependency_lock_hash: "",
    artifact_hashes_sha256: "",
    lean_run_manifest_id: "",
    final_replay_manifest_id: ""
  });
  assert.ok(
    pm001.blockers.includes("positive_matrix_representative_fixture_not_task_local_clean_replay"),
    "PM-001 must explain that representative fixture authority is not task-local batch authority"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 96 positive batch consumer semantics test passed.");
