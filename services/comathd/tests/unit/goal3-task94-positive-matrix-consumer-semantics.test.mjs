import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createGoal3GaPositiveProofMatrix, runGoal3GaAcceptanceWorkflow } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task94-positive-matrix-semantics-"));

try {
  const report = runGoal3GaAcceptanceWorkflow({ projectRoot, actor: "goal3-task94" });
  const standaloneMatrix = createGoal3GaPositiveProofMatrix();

  assert.equal(report.proof_authority, "none");
  assert.deepEqual(
    report.positive_matrix.representative_seeds,
    standaloneMatrix.representative_seeds,
    "GA acceptance report must not rewrite positive-matrix seeds into proof-authority fixtures"
  );
  assert.equal(report.positive_matrix.remaining_matrix_blocker.can_promote_claim, false);
  assert.ok(
    report.positive_matrix.representative_seeds.every((seed) => seed.status === "replayable_blocker"),
    "positive-matrix representative seeds remain blockers until each seed has its own clean replay evidence"
  );
  assert.ok(
    report.positive_matrix.representative_seeds.every((seed) => seed.proof_authority === "none"),
    "positive-matrix representative seeds cannot inherit proof authority from a separate representative workflow fixture"
  );
  assert.equal(
    report.positive_matrix.representative_seeds.some((seed) => seed.status === "representative_verified_fixture"),
    false
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 94 positive-matrix consumer semantics test passed.");
