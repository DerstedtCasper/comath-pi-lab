import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createGoal3GaPositiveTaskManifest,
  packageGoal3GaPositiveMatrixFinalAuthorityEvidenceTrancheV3,
  packageGoal3GaPositiveMatrixFinalAuthorityEvidenceV3,
  runGoal3GaAcceptanceWorkflow,
  runGoal3GaPositiveMatrixBatch
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task299-pm001-task-local-authority-"));

try {
  const manifest = createGoal3GaPositiveTaskManifest();
  const pm001 = manifest.tasks.find((task) => task.task_id === "PM-001");
  assert.ok(pm001, "PM-001 must remain in the 100-task release-candidate manifest");

  const representative = runGoal3GaAcceptanceWorkflow({ projectRoot, actor: "goal3-task299-representative" });
  assert.equal(representative.positive_workflow.result, "representative_verified_fixture");
  assert.equal(representative.positive_workflow.final_replay_verification.ok, true);

  const report = packageGoal3GaPositiveMatrixFinalAuthorityEvidenceV3({
    projectRoot,
    taskId: "PM-001",
    claimId: "C-PM-001"
  });

  assert.equal(report.schema_version, "comath.final_authority_packaging.v3");
  assert.equal(report.binding_scope, "positive_matrix");
  assert.equal(report.task_id, "PM-001");
  assert.equal(report.claim_id, "C-PM-001");
  assert.equal(report.final_evidence_status, "blocked_missing_final_evidence");
  assert.equal(report.blocker_code, "final_authority_evidence_incomplete");
  assert.match(report.blocker_detail, /PM-001/);
  assert.equal(report.proof_authority, "none");
  assert.equal(report.can_promote_claim, false);
  assert.equal(report.promotion_requires_gate, true);
  assert.deepEqual(report.lean_run_manifest_paths, []);
  assert.equal(report.final_replay_manifest_v3_path, "");
  assert.ok(report.missing_final_evidence_classes.includes("lean_run_manifest_v3"));
  assert.ok(report.missing_final_evidence_classes.includes("final_replay_manifest_v3"));
  assert.match(report.packaging_report_path, /^\.comath\/release\/positive_matrix\/PM-001\/final_authority_packaging_report_v3\.json$/);
  assert.match(report.blocker_path, /^\.comath\/release\/positive_matrix\/PM-001\/final_authority_evidence_blocker_v3\.json$/);
  assert.ok(existsSync(join(projectRoot, report.packaging_report_path)), "PM-001 task-local packaging report must be persisted");
  assert.ok(existsSync(join(projectRoot, report.blocker_path)), "PM-001 task-local blocker must be persisted");
  const persisted = JSON.parse(readFileSync(join(projectRoot, report.packaging_report_path), "utf8"));
  assert.equal(persisted.task_id, "PM-001");
  assert.equal(persisted.proof_authority, "none");
  assert.equal(persisted.can_promote_claim, false);

  const tranche = packageGoal3GaPositiveMatrixFinalAuthorityEvidenceTrancheV3({
    projectRoot,
    startTaskId: "PM-001",
    endTaskId: "PM-003",
    claimIdPrefix: "C-T299"
  });
  assert.deepEqual(tranche.task_ids, ["PM-001", "PM-002", "PM-003"]);
  assert.equal(tranche.tranche_status, "blocked_missing_final_evidence");
  assert.equal(tranche.proof_authority, "none");
  assert.equal(tranche.promoted_count, 0);
  assert.equal(
    tranche.results.every((result) => result.proof_authority === "none" && result.can_promote_claim === false),
    true,
    "PM-001 tranche support must not inherit representative fixture authority"
  );

  const batch = runGoal3GaPositiveMatrixBatch({ projectRoot, batchSize: 3 });
  const batchPm001 = batch.results.find((result) => result.task_id === "PM-001");
  assert.ok(batchPm001, "PM-001 must still be visible to batch consumers");
  assert.equal(batchPm001.terminal_classification, "replayable_blocker");
  assert.equal(batchPm001.proof_authority, "none");
  assert.ok(
    batchPm001.blockers.includes("positive_matrix_representative_fixture_not_task_local_clean_replay"),
    "PM-001 still cannot inherit representative fixture authority without task-local clean replay"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task299 PM-001 task-local final authority packaging tests passed.");
