import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  createGoal3GaPositiveTaskManifest,
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
const selected = manifest.tasks.filter((task) => task.task_id >= "PM-068" && task.task_id <= "PM-078");
assert.equal(selected.length, 11, "PM-068 through PM-078 must form an 11-task bounded tranche");

const byTask = new Map(selected.map((task) => [task.task_id, task]));
for (const taskId of ["PM-068", "PM-069", "PM-070"]) {
  assert.equal(byTask.get(taskId).category, "external Lean repo", `${taskId} must stay in the external Lean repo segment`);
}
for (const taskId of ["PM-071", "PM-072", "PM-073", "PM-074", "PM-075", "PM-076", "PM-077", "PM-078"]) {
  assert.equal(byTask.get(taskId).category, "paper-to-formal-spec", `${taskId} must stay in the paper-to-formal-spec segment`);
}

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task56-tranche-"));
const materialSourceByTaskId = Object.fromEntries(selected.map((task) => [
  task.task_id,
  createDeclaredReplayMaterial(projectRoot, task.task_id)
]));
const replayCommands = [];

const trancheReport = executeGoal3GaPositiveMatrixLeanAuthorityReplayTranche({
  projectRoot,
  startTaskId: "PM-068",
  endTaskId: "PM-078",
  claimIdPrefix: "C",
  materialSourceByTaskId,
  probeLeanVersion: () => ({ exit_code: 0, stdout: "Lean (version 4.23.0, x86_64-unknown, commit abc)", stderr: "" }),
  probeLakeVersion: () => ({ exit_code: 0, stdout: "Lake version 5.0.0", stderr: "" }),
  runReplayCommand: (command, cwd) => {
    replayCommands.push({ command, cwd });
    return { exit_code: 0, stdout: `${command.join(" ")} ok`, stderr: "" };
  }
});

assert.equal(trancheReport.schema_version, "comath.goal3_positive_matrix_lean_authority_executor_tranche.v1");
assert.equal(trancheReport.start_task_id, "PM-068");
assert.equal(trancheReport.end_task_id, "PM-078");
assert.equal(trancheReport.task_count, 11);
assert.deepEqual(trancheReport.task_ids, selected.map((task) => task.task_id));
assert.deepEqual(trancheReport.category_counts, {
  "external Lean repo": 3,
  "paper-to-formal-spec": 8
});
assert.equal(trancheReport.tranche_status, "blocked_missing_final_evidence");
assert.equal(trancheReport.proof_authority, "none");
assert.equal(trancheReport.can_promote_claim, false);
assert.equal(trancheReport.promotion_requires_gate, true);
assert.equal(trancheReport.promoted_count, 0);
assert.equal(trancheReport.tranche_report_path, ".comath/release/positive_matrix/PM-068_PM-078/lean_authority_executor_tranche_v1.json");
assert.equal(replayCommands.length, 22, "each PM-068 through PM-078 task should attempt check and build through the generic executor");

const persistedTrancheReport = JSON.parse(readFileSync(join(projectRoot, trancheReport.tranche_report_path), "utf8"));
assert.deepEqual(persistedTrancheReport.task_ids, trancheReport.task_ids);
assert.deepEqual(persistedTrancheReport.category_counts, trancheReport.category_counts);
assert.equal(persistedTrancheReport.tranche_status, "blocked_missing_final_evidence");
assert.equal(persistedTrancheReport.proof_authority, "none");
assert.equal(persistedTrancheReport.can_promote_claim, false);

for (const result of trancheReport.results) {
  assert.match(result.task_id, /^PM-06[8-9]$|^PM-07[0-8]$/);
  assert.equal(result.executor_status, "blocked_before_replay");
  assert.equal(result.blocker_code, "lean_authority_evidence_incomplete");
  assert.equal(result.proof_authority, "none");
  assert.equal(result.can_promote_claim, false);
  assert.equal(result.final_authority_packaging.final_evidence_status, "blocked_missing_final_evidence");
  assert.equal(result.final_authority_packaging.proof_authority, "none");
  assert.equal(result.final_authority_packaging.can_promote_claim, false);
  assert.equal(result.final_authority_packaging.promotion_requires_gate, true);
  assert.equal(result.final_authority_packaging.source_verification.verification_basis, "project_local_artifacts");
  assert.equal(result.final_authority_packaging.source_verification.caller_success_metadata_trusted, false);
  assert.equal(result.final_authority_packaging.lean_run_manifest_paths.length, 2);
  assert.ok(result.final_authority_packaging.missing_final_evidence_classes.includes("final_replay_manifest_v3"));
  assert.ok(result.final_authority_packaging.missing_final_evidence_classes.includes("statement_check"));
  for (const manifestPath of result.final_authority_packaging.lean_run_manifest_paths) {
    const leanRunManifest = JSON.parse(readFileSync(join(projectRoot, manifestPath), "utf8"));
    assert.equal(leanRunManifest.runner, "comathd.LeanRunner");
    assert.equal(leanRunManifest.proof_authority, "none");
    assert.equal(verifyLeanRunManifestV3Evidence(projectRoot, leanRunManifest).ok, true);
  }
}

assert.equal(
  existsSync(join(projectRoot, ".comath/release/positive_matrix/PM-079/lean_authority_executor_blocker_v3.json")),
  false,
  "Task 56 tranche must not write next-batch PM-079 executor artifacts"
);

console.log("Goal 3 Task 56 PM-068 through PM-078 generic Lean executor test passed.");
