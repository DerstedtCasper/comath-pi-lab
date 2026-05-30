import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  createGoal3GaPositiveTaskManifest,
  executeGoal3GaPositiveMatrixLeanAuthorityReplay,
  executeGoal3GaPositiveMatrixLeanAuthorityReplayTranche,
  verifyLeanRunManifestV3Evidence
} from "../../dist/index.js";

function writeProjectFile(projectRoot, relativePath, text) {
  const absolute = join(projectRoot, relativePath);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, text, "utf8");
}

function writeJsonProjectFile(projectRoot, relativePath, value) {
  writeProjectFile(projectRoot, relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function createDeclaredReplayMaterial(projectRoot, taskId) {
  const materialRoot = `.comath/release/positive_matrix/${taskId}`;
  const theoremName = `Goal3Positive${taskId.slice(3)}`;
  const source = {
    schema_version: "comath.goal3_declared_replay_material_source.v1",
    task_id: taskId,
    lean_source_path: `${materialRoot}/MathResearch/Target.lean`,
    lean_toolchain_path: `${materialRoot}/lean-toolchain`,
    lakefile_path: `${materialRoot}/lakefile.lean`,
    lake_manifest_path: `${materialRoot}/lake-manifest.json`,
    formal_spec_lock_path: `${materialRoot}/formal_spec_lock.json`,
    assumption_ledger_path: `${materialRoot}/assumption_ledger.json`,
    dependency_lock_path: `${materialRoot}/dependency_lock.json`,
    lean_run_manifest_v3_path: `${materialRoot}/lean_run_manifest_v3.json`,
    final_replay_manifest_v3_path: `${materialRoot}/final_replay_manifest_v3.json`,
    structured_audit_path: `${materialRoot}/structured_audit.json`,
    third_party_replay_pack_path: `${materialRoot}/replay_pack`,
    lean_run_manifest_id: `LRUN-${taskId}-PREFLIGHT`,
    final_replay_manifest_id: `RPLY-${taskId}-PREFLIGHT`,
    proof_authority: "none",
    can_promote_claim: false
  };

  writeProjectFile(
    projectRoot,
    source.lean_source_path,
    [
      "import Mathlib",
      "",
      "namespace MathResearch",
      "",
      `theorem ${theoremName} : True := by`,
      "  trivial",
      "",
      `#check ${theoremName}`,
      `#print axioms ${theoremName}`,
      "",
      "end MathResearch",
      ""
    ].join("\n")
  );
  writeProjectFile(projectRoot, source.lean_toolchain_path, "leanprover/lean4:v4.23.0\n");
  writeProjectFile(
    projectRoot,
    source.lakefile_path,
    [
      "import Lake",
      "open Lake DSL",
      "",
      "package MathResearch where",
      "",
      "require mathlib from git \"https://github.com/leanprover-community/mathlib4\" @ \"v4.23.0\"",
      "",
      "lean_lib MathResearch where",
      "  roots := #[`MathResearch.Target]",
      ""
    ].join("\n")
  );
  writeJsonProjectFile(projectRoot, source.lake_manifest_path, { version: 7, packages: [] });
  writeJsonProjectFile(projectRoot, source.formal_spec_lock_path, {
    schema_version: "comath.formal_spec_lock.v2",
    task_id: taskId,
    theorem_name: theoremName,
    statement_hash: `${taskId}-statement-hash`,
    proof_authority: "none"
  });
  writeJsonProjectFile(projectRoot, source.assumption_ledger_path, {
    schema_version: "comath.assumption_ledger.v2",
    task_id: taskId,
    entries: [],
    proof_authority: "none"
  });
  writeJsonProjectFile(projectRoot, source.dependency_lock_path, {
    schema_version: "comath.dependency_lock.v3",
    task_id: taskId,
    lean_toolchain: "leanprover/lean4:v4.23.0",
    network_policy_final_replay: "disabled",
    proof_authority: "none"
  });
  writeJsonProjectFile(projectRoot, source.lean_run_manifest_v3_path, {
    schema_version: "comath.lean_run_manifest.v3.preflight",
    material_status: "preflight_only_not_lean_executed",
    proof_authority: "none"
  });
  writeJsonProjectFile(projectRoot, source.final_replay_manifest_v3_path, {
    schema_version: "comath.final_replay_manifest.v3.preflight",
    material_status: "preflight_only_not_final_replayed",
    proof_authority: "none",
    promotion_allowed: false
  });
  writeJsonProjectFile(projectRoot, source.structured_audit_path, {
    result: "blocked",
    hard_vetoes: ["lean_replay_not_executed"],
    proof_authority: "none"
  });
  writeProjectFile(projectRoot, `${source.third_party_replay_pack_path}/README_REPLAY.md`, "preflight only\n");
  return source;
}

const manifest = createGoal3GaPositiveTaskManifest();
const selected = manifest.tasks.filter((task) => task.task_id >= "PM-046" && task.task_id <= "PM-056");
assert.equal(selected.length, 11, "PM-046 through PM-056 must form an 11-task bounded tranche");

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task54-generic-executor-"));
const pm046Source = createDeclaredReplayMaterial(projectRoot, "PM-046");
const failingReplayCommands = [];
const failedReplayReport = executeGoal3GaPositiveMatrixLeanAuthorityReplay({
  projectRoot,
  taskId: "PM-046",
  claimId: "C-0046",
  materialSource: pm046Source,
  probeLeanVersion: () => ({ exit_code: 0, stdout: "Lean (version 4.23.0, x86_64-unknown, commit abc)", stderr: "" }),
  probeLakeVersion: () => ({ exit_code: 0, stdout: "Lake version 5.0.0", stderr: "" }),
  runReplayCommand: (command, cwd) => {
    failingReplayCommands.push({ command, cwd });
    return { exit_code: 1, stdout: "", stderr: "PM-046 generic executor replay failed" };
  }
});

assert.equal(failedReplayReport.schema_version, "comath.goal3_positive_matrix_lean_authority_executor.v1");
assert.equal(failedReplayReport.task_id, "PM-046");
assert.equal(failedReplayReport.claim_id, "C-0046");
assert.equal(failedReplayReport.executor_status, "blocked_before_replay");
assert.equal(failedReplayReport.blocker_code, "lean_replay_command_failed");
assert.equal(failedReplayReport.proof_authority, "none");
assert.equal(failedReplayReport.can_promote_claim, false);
assert.equal(failedReplayReport.final_authority_packaging.final_evidence_status, "blocked_missing_final_evidence");
assert.equal(failedReplayReport.final_authority_packaging.proof_authority, "none");
assert.equal(failedReplayReport.final_authority_packaging.can_promote_claim, false);
assert.equal(failedReplayReport.final_authority_packaging.promotion_requires_gate, true);
assert.deepEqual(failingReplayCommands.map((entry) => entry.command), [["lake", "env", "lean", "MathResearch/Target.lean"]]);

const failedBlocker = JSON.parse(readFileSync(join(projectRoot, failedReplayReport.executor_blocker_path), "utf8"));
assert.equal(failedBlocker.schema_version, "comath.goal3_positive_matrix_lean_authority_executor_blocker.v1");
assert.equal(failedBlocker.task_id, "PM-046");
assert.equal(failedBlocker.proof_authority, "none");
assert.equal(failedBlocker.can_promote_claim, false);
assert.match(failedBlocker.lean_run_manifest_paths[0], /^\.comath\/evidence\/C-0046\/lean\/LRUN-004601\.manifest\.json$/);
const failedLeanManifest = JSON.parse(readFileSync(join(projectRoot, failedBlocker.lean_run_manifest_paths[0]), "utf8"));
assert.equal(failedLeanManifest.runner, "comathd.LeanRunner");
assert.equal(failedLeanManifest.exit_code, 1);
assert.equal(verifyLeanRunManifestV3Evidence(projectRoot, failedLeanManifest).ok, true);

const trancheRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task54-tranche-"));
const materialSourceByTaskId = Object.fromEntries(selected.map((task) => [
  task.task_id,
  createDeclaredReplayMaterial(trancheRoot, task.task_id)
]));
const trancheReplayCommands = [];
const trancheReport = executeGoal3GaPositiveMatrixLeanAuthorityReplayTranche({
  projectRoot: trancheRoot,
  startTaskId: "PM-046",
  endTaskId: "PM-056",
  claimIdPrefix: "C",
  materialSourceByTaskId,
  probeLeanVersion: () => ({ exit_code: 0, stdout: "Lean (version 4.23.0, x86_64-unknown, commit abc)", stderr: "" }),
  probeLakeVersion: () => ({ exit_code: 0, stdout: "Lake version 5.0.0", stderr: "" }),
  runReplayCommand: (command, cwd) => {
    trancheReplayCommands.push({ command, cwd });
    return { exit_code: 0, stdout: `${command.join(" ")} ok`, stderr: "" };
  }
});

assert.equal(trancheReport.schema_version, "comath.goal3_positive_matrix_lean_authority_executor_tranche.v1");
assert.equal(trancheReport.start_task_id, "PM-046");
assert.equal(trancheReport.end_task_id, "PM-056");
assert.equal(trancheReport.task_count, 11);
assert.deepEqual(trancheReport.task_ids, selected.map((task) => task.task_id));
assert.equal(trancheReport.tranche_status, "blocked_missing_final_evidence");
assert.equal(trancheReport.proof_authority, "none");
assert.equal(trancheReport.can_promote_claim, false);
assert.equal(trancheReport.promotion_requires_gate, true);
assert.equal(trancheReport.promoted_count, 0);
assert.equal(trancheReplayCommands.length, 22, "each task should attempt check and build through the generic executor");

for (const result of trancheReport.results) {
  assert.match(result.task_id, /^PM-04[6-9]$|^PM-05[0-6]$/);
  assert.equal(result.executor_status, "blocked_before_replay");
  assert.equal(result.blocker_code, "lean_authority_evidence_incomplete");
  assert.equal(result.proof_authority, "none");
  assert.equal(result.can_promote_claim, false);
  assert.equal(result.final_authority_packaging.final_evidence_status, "blocked_missing_final_evidence");
  assert.ok(result.final_authority_packaging.missing_final_evidence_classes.includes("final_replay_manifest_v3"));
  assert.equal(result.final_authority_packaging.source_verification.caller_success_metadata_trusted, false);
  assert.equal(result.final_authority_packaging.source_verification.verification_basis, "project_local_artifacts");
  assert.equal(result.final_authority_packaging.lean_run_manifest_paths.length, 2);
}

assert.equal(
  existsSync(join(trancheRoot, ".comath/release/positive_matrix/PM-057/lean_authority_executor_blocker_v3.json")),
  false,
  "Task 54 tranche must not write next-batch PM-057 executor artifacts"
);

console.log("Goal 3 Task 54 PM-046 through PM-056 generic Lean executor test passed.");
