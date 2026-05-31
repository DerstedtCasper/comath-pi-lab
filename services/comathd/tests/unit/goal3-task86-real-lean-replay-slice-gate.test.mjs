import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  createGoal3GaPositiveTaskManifest,
  executeGoal3GaPositiveMatrixLeanAuthorityReplay,
  executeGoal3GaPositiveMatrixRealLeanReplaySlice,
  initProject,
  registerClaim,
  statementHash
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task86-real-lean-gate-"));

function writeProjectFile(relativePath, text) {
  const absolute = join(projectRoot, relativePath);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, text, "utf8");
  return absolute;
}

function writeJsonProjectFile(relativePath, value) {
  writeProjectFile(relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function createPm084DeclaredReplayMaterial(claim) {
  const taskId = "PM-084";
  const materialRoot = `.comath/release/positive_matrix/${taskId}`;
  const theoremName = "Goal3Positive084";
  const statement = `theorem ${theoremName} (p : Prop) (hp : p) : p`;
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
    lean_run_manifest_id: "LRUN-0084",
    final_replay_manifest_id: "RPLY-0084",
    proof_authority: "none",
    can_promote_claim: false
  };

  writeProjectFile(
    source.lean_source_path,
    [
      "import Mathlib",
      "",
      "namespace MathResearch",
      "",
      `theorem ${theoremName} (p : Prop) (hp : p) : p := hp`,
      "",
      `#check ${theoremName}`,
      `#print axioms ${theoremName}`,
      "",
      "end MathResearch",
      ""
    ].join("\n")
  );
  writeProjectFile(source.lean_toolchain_path, "leanprover/lean4:v4.23.0\n");
  writeProjectFile(
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
  writeJsonProjectFile(source.lake_manifest_path, { version: 7, packages: [] });
  writeJsonProjectFile(source.formal_spec_lock_path, {
    schema_version: "comath.formal_spec_lock.v2",
    task_id: taskId,
    claim_id: claim.id,
    namespace: "MathResearch",
    theorem_name: theoremName,
    theorem_header: statement,
    statement_hash: claim.statement_hash,
    proof_authority: "none"
  });
  writeJsonProjectFile(source.assumption_ledger_path, {
    schema_version: "comath.assumption_ledger.v1",
    task_id: taskId,
    claim_id: claim.id,
    formal_spec_lock_hash: claim.statement_hash,
    entries: [{ id: "ASM-0084", kind: "assumption", name: "hp", type: "p", source: "user", approved: true }],
    proof_authority: "none"
  });
  writeJsonProjectFile(source.dependency_lock_path, {
    schema_version: "comath.dependency_lock.v3",
    task_id: taskId,
    lean_toolchain: "leanprover/lean4:v4.23.0",
    network_policy_final_replay: "disabled",
    proof_authority: "none"
  });
  writeJsonProjectFile(source.lean_run_manifest_v3_path, {
    schema_version: "comath.lean_run_manifest.v3.preflight",
    material_status: "preflight_only_not_lean_executed",
    proof_authority: "none"
  });
  writeJsonProjectFile(source.final_replay_manifest_v3_path, {
    schema_version: "comath.final_replay_manifest.v3.preflight",
    material_status: "preflight_only_not_final_replayed",
    proof_authority: "none",
    promotion_allowed: false
  });
  writeJsonProjectFile(source.structured_audit_path, {
    result: "blocked",
    hard_vetoes: ["lean_replay_not_executed"],
    proof_authority: "none"
  });
  writeProjectFile(`${source.third_party_replay_pack_path}/README_REPLAY.md`, "preflight only\n");
  return source;
}

try {
  const { project } = initProject({ name: "Goal 3 Task 86 Real Lean Gate", root_path: projectRoot });
  const task = createGoal3GaPositiveTaskManifest().tasks.find((item) => item.task_id === "PM-084");
  assert.equal(task?.category, "theorem-search-assisted");

  const claimStatement = "theorem Goal3Positive084 (p : Prop) (hp : p) : p";
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: claimStatement,
    assumptions: [],
    domain: "logic",
    status: "conjectural",
    actor: "goal3-task86"
  });
  assert.equal(claim.statement_hash, statementHash(claimStatement));

  const materialSource = createPm084DeclaredReplayMaterial(claim);
  let injectedReplayCalled = false;
  const report = executeGoal3GaPositiveMatrixRealLeanReplaySlice({
    projectRoot,
    taskId: "PM-084",
    claimId: claim.id,
    materialSource,
    realReplayEnabled: false,
    runReplayCommand: () => {
      injectedReplayCalled = true;
      return { exit_code: 0, stdout: "mock replay must not be accepted by the real slice", stderr: "" };
    }
  });

  assert.equal(injectedReplayCalled, false);
  assert.equal(report.schema_version, "comath.goal3_positive_matrix_lean_authority_executor.v1");
  assert.equal(report.task_id, "PM-084");
  assert.equal(report.claim_id, claim.id);
  assert.equal(report.executor_status, "blocked_before_replay");
  assert.equal(report.blocker_code, "live_replay_executor_not_configured");
  assert.match(report.blocker_detail, /COMATH_ENABLE_GOAL3_REAL_LEAN_REPLAY=1/);
  assert.equal(report.proof_authority, "none");
  assert.equal(report.can_promote_claim, false);
  assert.equal(report.final_authority_packaging.final_evidence_status, "blocked_missing_final_evidence");
  assert.equal(report.final_authority_packaging.proof_authority, "none");
  assert.equal(report.final_authority_packaging.can_promote_claim, false);

  const blocker = JSON.parse(readFileSync(join(projectRoot, report.executor_blocker_path), "utf8"));
  assert.deepEqual(blocker.attempted_commands, []);
  assert.deepEqual(blocker.lean_run_manifest_paths, []);
  assert.equal(blocker.proof_authority, "none");
  assert.equal(blocker.can_promote_claim, false);

  const completed = executeGoal3GaPositiveMatrixLeanAuthorityReplay({
    projectRoot,
    taskId: "PM-084",
    claimId: claim.id,
    materialSource,
    completeFinalAuthorityEvidence: true,
    probeLeanVersion: () => ({ exit_code: 0, stdout: "Lean (version 4.23.0, x86_64-unknown, commit abc)", stderr: "" }),
    probeLakeVersion: () => ({ exit_code: 0, stdout: "Lake version 5.0.0", stderr: "" }),
    runReplayCommand: (command) => ({ exit_code: 0, stdout: `${command.join(" ")} ok`, stderr: "" })
  });
  assert.equal(completed.executor_status, "blocked_before_replay");
  assert.equal(completed.blocker_code, "lean_authority_evidence_incomplete");
  assert.match(completed.blocker_detail, /Injected replay callbacks cannot produce final Lean Authority evidence/);
  assert.equal(completed.final_authority_packaging.final_evidence_status, "blocked_missing_final_evidence");
  assert.equal(completed.final_authority_packaging.proof_authority, "none");
  assert.ok(completed.final_authority_packaging.missing_final_evidence_classes.includes("final_replay_manifest_v3"));
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 86 real Lean replay slice gate test passed.");
