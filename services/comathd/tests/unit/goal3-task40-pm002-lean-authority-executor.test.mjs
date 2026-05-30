import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createGoal3GaPm002ReplayMaterialPackPreflight,
  executeGoal3GaPm002LeanAuthorityReplay
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task40-pm002-executor-"));
const preflight = createGoal3GaPm002ReplayMaterialPackPreflight({ projectRoot });

const report = executeGoal3GaPm002LeanAuthorityReplay({
  projectRoot,
  materialSource: preflight.material_source,
  probeLeanVersion: () => ({ exit_code: 1, stdout: "", stderr: "lean executable not found" }),
  probeLakeVersion: () => ({ exit_code: 1, stdout: "", stderr: "lake executable not found" })
});

assert.equal(report.schema_version, "comath.goal3_pm002_lean_authority_executor.v1");
assert.equal(report.task_id, "PM-002");
assert.equal(report.proof_authority, "none");
assert.equal(report.can_promote_claim, false);
assert.equal(report.executor_status, "blocked_before_replay");
assert.equal(report.blocker_code, "lean_toolchain_unavailable_for_live_replay");
assert.match(report.blocker_detail, /lean executable not found/);
assert.match(report.executor_blocker_path, /^\.comath\/release\/positive_matrix\/PM-002\/lean_authority_executor_blocker\.json$/);
assert.equal(report.live_replay_conversion.schema_version, "comath.goal3_positive_live_replay_conversion.v1");
assert.equal(report.live_replay_conversion.summary.clean_replay_passed, 0);
assert.equal(report.live_replay_conversion.summary.replayable_blocker, 1);
assert.equal(report.live_replay_conversion.summary.promoted_count, 0);

const result = report.live_replay_conversion.results[0];
assert.equal(result.task_id, "PM-002");
assert.equal(result.terminal_classification, "replayable_blocker");
assert.equal(result.proof_authority, "none");
assert.equal(result.can_promote_claim, false);
assert.ok(result.blockers.includes("lean_toolchain_unavailable_for_live_replay"));
assert.equal(result.live_replay.blocker_code, "lean_toolchain_unavailable_for_live_replay");
assert.equal(result.live_replay.declared_replay_material_status, "ready_for_live_executor");
assert.deepEqual(result.live_replay.declared_replay_material_missing_paths, []);
assert.equal(result.live_replay.proof_authority, "none");
assert.equal(result.live_replay.can_promote_claim, false);
assert.equal(result.live_replay.uses_production_theorem_family_recognizer, false);
assert.equal(result.live_replay.uses_controlled_nat_linear_synthesis, false);
assert.equal(result.live_replay.uses_default_assumptions, false);
assert.equal(result.live_replay.cas_literature_search_or_vote_proof_authority, false);
assert.equal(result.live_replay.direct_promotion_path, false);

const blockerPath = join(projectRoot, report.executor_blocker_path);
assert.ok(existsSync(blockerPath), "executor must persist a replayable blocker certificate");
const blocker = JSON.parse(readFileSync(blockerPath, "utf8"));
assert.equal(blocker.schema_version, "comath.goal3_pm002_lean_authority_executor_blocker.v1");
assert.equal(blocker.task_id, "PM-002");
assert.equal(blocker.blocker_code, "lean_toolchain_unavailable_for_live_replay");
assert.equal(blocker.proof_authority, "none");
assert.equal(blocker.can_promote_claim, false);
assert.deepEqual(blocker.attempted_commands, [["lean", "--version"]]);
assert.deepEqual(blocker.replay_plan_commands, [
  ["lake", "env", "lean", "MathResearch/Target.lean"],
  ["lake", "build", "MathResearch"]
]);
assert.equal(blocker.material_source_path, ".comath/release/positive_matrix/PM-002/declared_replay_material_source.json");
assert.equal(blocker.lean_source_path, preflight.material_source.lean_source_path);
assert.equal(blocker.network_policy_final_replay, "disabled");

console.log("Goal 3 Task 40 PM-002 Lean Authority executor blocker test passed.");
