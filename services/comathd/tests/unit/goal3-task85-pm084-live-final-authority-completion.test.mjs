import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  appendEvidenceRecord,
  createGoal3GaPositiveTaskManifest,
  executeGoal3GaPositiveMatrixLeanAuthorityReplay,
  importArtifact,
  initProject,
  promoteClaim,
  registerClaim,
  statementHash,
  verifyFinalReplayManifestV3
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task85-pm084-live-authority-"));

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
    schema_version: "comath.assumption_ledger.v2",
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
  const { project } = initProject({ name: "Goal 3 Task 85 PM084 Live Final Authority", root_path: projectRoot });
  const task = createGoal3GaPositiveTaskManifest().tasks.find((item) => item.task_id === "PM-084");
  assert.equal(task?.category, "theorem-search-assisted");

  const claimStatement = "theorem Goal3Positive084 (p : Prop) (hp : p) : p";
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: claimStatement,
    assumptions: [],
    domain: "logic",
    status: "conjectural",
    actor: "goal3-task85"
  });
  assert.equal(claim.statement_hash, statementHash(claimStatement));

  const materialSource = createPm084DeclaredReplayMaterial(claim);
  const replayCalls = [];
  const report = executeGoal3GaPositiveMatrixLeanAuthorityReplay({
    projectRoot,
    taskId: "PM-084",
    claimId: claim.id,
    materialSource,
    completeFinalAuthorityEvidence: true,
    probeLeanVersion: () => ({ exit_code: 0, stdout: "Lean (version 4.23.0, x86_64-unknown, commit abc)", stderr: "" }),
    probeLakeVersion: () => ({ exit_code: 0, stdout: "Lake version 5.0.0", stderr: "" }),
    runReplayCommand: (command, cwd) => {
      replayCalls.push({ command, cwd });
      return { exit_code: 0, stdout: `${command.join(" ")} ok`, stderr: "" };
    }
  });

  assert.equal(report.schema_version, "comath.goal3_positive_matrix_lean_authority_executor.v1");
  assert.equal(report.task_id, "PM-084");
  assert.equal(report.claim_id, claim.id);
  assert.equal(report.executor_status, "live_replay_conversion_completed");
  assert.equal(report.blocker_code, "");
  assert.equal(report.proof_authority, "none");
  assert.equal(report.can_promote_claim, false);
  assert.equal(report.final_authority_packaging.final_evidence_status, "verified_final_authority_evidence");
  assert.equal(report.final_authority_packaging.proof_authority, "lean_kernel_clean_replay");
  assert.equal(report.final_authority_packaging.can_promote_claim, false);
  assert.equal(report.final_authority_packaging.promotion_requires_gate, true);
  assert.equal(report.final_authority_packaging.source_verification.verification_basis, "project_local_artifacts");
  assert.equal(report.final_authority_packaging.source_verification.caller_success_metadata_trusted, false);
  assert.deepEqual(report.final_authority_packaging.missing_final_evidence_classes, []);
  assert.ok(report.final_authority_packaging.source_verification.verified_final_evidence_classes.includes("formal_spec_lock_binding"));
  assert.ok(report.final_authority_packaging.source_verification.verified_final_evidence_classes.includes("replay_manifest_hash_binding"));
  assert.equal(replayCalls.length, 3, "PM-084 completion should run check, build, and final clean replay commands");
  assert.match(replayCalls.at(-1).cwd.replace(/\\/g, "/"), /\/\.comath\/lean\/final_replay\/RPLY-0084\/clean$/);

  const finalReplayManifest = JSON.parse(readFileSync(join(projectRoot, report.final_authority_packaging.final_replay_manifest_v3_path), "utf8"));
  assert.equal(finalReplayManifest.claim_id, claim.id);
  assert.equal(finalReplayManifest.theorem_name, "MathResearch.Goal3Positive084");
  assert.deepEqual(verifyFinalReplayManifestV3(projectRoot, finalReplayManifest), { ok: true, vetoes: [] });
  assert.ok(existsSync(join(projectRoot, report.final_authority_packaging.third_party_replay_pack_path, "FinalReplayManifest.json")));

  const packagingArtifact = await importArtifact({
    projectRoot,
    project_id: project.project_id,
    source_path: report.final_authority_packaging.packaging_report_path,
    kind: "runner_output",
    actor: "goal3-task85"
  });
  const finalReplayArtifact = await importArtifact({
    projectRoot,
    project_id: project.project_id,
    source_path: report.final_authority_packaging.final_replay_manifest_v3_path,
    kind: "runner_output",
    actor: "goal3-task85"
  });
  const derivedBindingArtifact = await importArtifact({
    projectRoot,
    project_id: project.project_id,
    source_path: `.comath/release/positive_matrix/PM-084/derived_final_authority_bindings_v3.json`,
    kind: "runner_output",
    actor: "goal3-task85"
  });
  const evidence = appendEvidenceRecord(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    kind: "lean",
    summary: "PM-084 live final-authority evidence is verified but still requires ordinary promotion gate prerequisites.",
    artifact_ids: [packagingArtifact.id, finalReplayArtifact.id, derivedBindingArtifact.id]
  });
  const rejected = promoteClaim(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    target_status: "formally_checked",
    evidence_ids: [evidence.id],
    artifact_ids: [packagingArtifact.id, finalReplayArtifact.id, derivedBindingArtifact.id],
    actor: "goal3-task85"
  });
  assert.equal(rejected.gate.ok, false, "verified live evidence packaging alone must not bypass ordinary claim gate prerequisites");
  assert.equal(rejected.claim.status, "conjectural");
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 85 PM-084 live final-authority completion test passed.");
