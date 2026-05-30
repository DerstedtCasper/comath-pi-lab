import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createGoal3GaPm002ReplayMaterialPackPreflight,
  executeGoal3GaPm002LeanAuthorityReplay,
  verifyLeanRunManifestV3Evidence
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task41-pm002-command-"));
const preflight = createGoal3GaPm002ReplayMaterialPackPreflight({ projectRoot });

const attemptedReplayCommands = [];
const report = executeGoal3GaPm002LeanAuthorityReplay({
  projectRoot,
  materialSource: preflight.material_source,
  probeLeanVersion: () => ({ exit_code: 0, stdout: "Lean (version 4.23.0, x86_64-unknown, commit abc)", stderr: "" }),
  probeLakeVersion: () => ({ exit_code: 0, stdout: "Lake version 5.0.0", stderr: "" }),
  runReplayCommand: (command, cwd) => {
    attemptedReplayCommands.push({ command, cwd });
    return {
      exit_code: 1,
      stdout: "",
      stderr: "unknown package 'Mathlib' while checking PM-002"
    };
  }
});

assert.equal(report.schema_version, "comath.goal3_pm002_lean_authority_executor.v1");
assert.equal(report.task_id, "PM-002");
assert.equal(report.proof_authority, "none");
assert.equal(report.can_promote_claim, false);
assert.equal(report.executor_status, "blocked_before_replay");
assert.equal(report.blocker_code, "lean_replay_command_failed");
assert.match(report.blocker_detail, /unknown package 'Mathlib'/);
assert.equal(report.live_replay_conversion.summary.clean_replay_passed, 0);
assert.equal(report.live_replay_conversion.summary.replayable_blocker, 1);
assert.equal(report.live_replay_conversion.summary.promoted_count, 0);

assert.deepEqual(attemptedReplayCommands.map((entry) => entry.command), [
  ["lake", "env", "lean", "MathResearch/Target.lean"]
]);
assert.match(attemptedReplayCommands[0].cwd.replaceAll("\\", "/"), /\.comath\/release\/positive_matrix\/PM-002\/?$/);

const result = report.live_replay_conversion.results[0];
assert.equal(result.terminal_classification, "replayable_blocker");
assert.equal(result.proof_authority, "none");
assert.equal(result.can_promote_claim, false);
assert.ok(result.blockers.includes("lean_replay_command_failed"));
assert.equal(result.live_replay.blocker_code, "lean_replay_command_failed");
assert.equal(result.live_replay.proof_authority, "none");
assert.equal(result.live_replay.can_promote_claim, false);
assert.equal(result.live_replay.uses_production_theorem_family_recognizer, false);
assert.equal(result.live_replay.uses_controlled_nat_linear_synthesis, false);
assert.equal(result.live_replay.uses_default_assumptions, false);
assert.equal(result.live_replay.cas_literature_search_or_vote_proof_authority, false);
assert.equal(result.live_replay.direct_promotion_path, false);

const blockerPath = join(projectRoot, report.executor_blocker_path);
assert.ok(existsSync(blockerPath), "executor must persist a command-level blocker certificate");
const blocker = JSON.parse(readFileSync(blockerPath, "utf8"));
assert.equal(blocker.schema_version, "comath.goal3_pm002_lean_authority_executor_blocker.v1");
assert.equal(blocker.blocker_code, "lean_replay_command_failed");
assert.equal(blocker.proof_authority, "none");
assert.equal(blocker.can_promote_claim, false);
assert.deepEqual(blocker.attempted_commands, [
  ["lean", "--version"],
  ["lake", "--version"],
  ["lake", "env", "lean", "MathResearch/Target.lean"]
]);
assert.deepEqual(blocker.replay_plan_commands, [
  ["lake", "env", "lean", "MathResearch/Target.lean"],
  ["lake", "build", "MathResearch"]
]);
assert.equal(blocker.network_policy_final_replay, "disabled");
assert.equal(blocker.lean_run_manifest_paths.length, 1);
assert.match(blocker.lean_run_manifest_paths[0], /^\.comath\/evidence\/C-0002\/lean\/LRUN-0002\.manifest\.json$/);

const manifest = JSON.parse(readFileSync(join(projectRoot, blocker.lean_run_manifest_paths[0]), "utf8"));
assert.equal(manifest.schema_version, "comath.lean_run_manifest.v3");
assert.equal(manifest.run_id, "LRUN-0002");
assert.deepEqual(manifest.command, ["lake", "env", "lean", "MathResearch/Target.lean"]);
assert.equal(manifest.cwd, ".comath/release/positive_matrix/PM-002");
assert.equal(manifest.exit_code, 1);
assert.equal(manifest.runner, "comathd.LeanRunner");
assert.equal(manifest.proof_authority, "none");
assert.equal(manifest.network_policy, "disabled");
assert.equal(verifyLeanRunManifestV3Evidence(projectRoot, manifest).ok, true);

const successfulCommandRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task41-pm002-incomplete-"));
const successfulPreflight = createGoal3GaPm002ReplayMaterialPackPreflight({ projectRoot: successfulCommandRoot });
const successfulCommands = [];
const incompleteEvidenceReport = executeGoal3GaPm002LeanAuthorityReplay({
  projectRoot: successfulCommandRoot,
  materialSource: successfulPreflight.material_source,
  probeLeanVersion: () => ({ exit_code: 0, stdout: "Lean (version 4.23.0, x86_64-unknown, commit abc)", stderr: "" }),
  probeLakeVersion: () => ({ exit_code: 0, stdout: "Lake version 5.0.0", stderr: "" }),
  runReplayCommand: (command, cwd) => {
    successfulCommands.push({ command, cwd });
    return {
      exit_code: 0,
      stdout: `${command.join(" ")} ok`,
      stderr: ""
    };
  }
});

assert.deepEqual(successfulCommands.map((entry) => entry.command), [
  ["lake", "env", "lean", "MathResearch/Target.lean"],
  ["lake", "build", "MathResearch"]
]);
assert.equal(incompleteEvidenceReport.executor_status, "blocked_before_replay");
assert.equal(incompleteEvidenceReport.blocker_code, "lean_authority_evidence_incomplete");
assert.equal(incompleteEvidenceReport.proof_authority, "none");
assert.equal(incompleteEvidenceReport.can_promote_claim, false);
assert.equal(incompleteEvidenceReport.live_replay_conversion.summary.clean_replay_passed, 0);
assert.equal(incompleteEvidenceReport.live_replay_conversion.results[0].terminal_classification, "replayable_blocker");
assert.ok(incompleteEvidenceReport.live_replay_conversion.results[0].blockers.includes("lean_authority_evidence_incomplete"));

const incompleteBlocker = JSON.parse(readFileSync(join(successfulCommandRoot, incompleteEvidenceReport.executor_blocker_path), "utf8"));
assert.equal(incompleteBlocker.blocker_code, "lean_authority_evidence_incomplete");
assert.deepEqual(incompleteBlocker.attempted_commands, [
  ["lean", "--version"],
  ["lake", "--version"],
  ["lake", "env", "lean", "MathResearch/Target.lean"],
  ["lake", "build", "MathResearch"]
]);
assert.equal(incompleteBlocker.lean_run_manifest_paths.length, 2);
for (const manifestPath of incompleteBlocker.lean_run_manifest_paths) {
  const checkedManifest = JSON.parse(readFileSync(join(successfulCommandRoot, manifestPath), "utf8"));
  assert.equal(verifyLeanRunManifestV3Evidence(successfulCommandRoot, checkedManifest).ok, true);
  assert.equal(checkedManifest.proof_authority, "none");
}

console.log("Goal 3 Task 41 PM-002 Lean command execution blocker test passed.");
