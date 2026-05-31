import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  archiveGoal3GaPositiveMatrixRealReplayAttemptEvidence,
  createGoal3GaPositiveTaskManifest,
  getClaim,
  initProject,
  listArtifactRefs,
  promoteClaim,
  readAuditEvents,
  readEvidenceRecords,
  registerClaim,
  statementHash
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task88-real-replay-archive-"));

function writeProjectFile(relativePath, text) {
  const absolute = join(projectRoot, relativePath);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, text, "utf8");
  return absolute;
}

function writeJsonProjectFile(relativePath, value) {
  writeProjectFile(relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function markClaimPrerequisitesAsSatisfied(projectId, claimId) {
  const claimsPath = join(projectRoot, ".comath", "claims", "claims.jsonl");
  const records = readFileSync(claimsPath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const updated = records.map((record) => record.project_id === projectId && record.id === claimId
    ? {
        ...record,
        formalization_status: "kernel_checked",
        dependency_closure_status: "all_dependencies_present",
        audit_state: "audit_passed"
      }
    : record);
  writeFileSync(claimsPath, `${updated.map((record) => JSON.stringify(record)).join("\n")}\n`, "utf8");
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
    result: "blocked",
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
  const { project } = initProject({ name: "Goal 3 Task 88 Real Replay Archive", root_path: projectRoot });
  const task = createGoal3GaPositiveTaskManifest().tasks.find((item) => item.task_id === "PM-084");
  assert.equal(task?.category, "theorem-search-assisted");

  const claimStatement = "theorem Goal3Positive084 (p : Prop) (hp : p) : p";
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: claimStatement,
    assumptions: [],
    domain: "logic",
    status: "conjectural",
    actor: "goal3-task88"
  });
  assert.equal(claim.statement_hash, statementHash(claimStatement));

  const mismatchedMaterialSource = createPm084DeclaredReplayMaterial(claim);
  const mismatchedFormalSpec = JSON.parse(readFileSync(join(projectRoot, mismatchedMaterialSource.formal_spec_lock_path), "utf8"));
  writeJsonProjectFile(mismatchedMaterialSource.formal_spec_lock_path, { ...mismatchedFormalSpec, claim_id: "C-9999" });
  await assert.rejects(
    () => archiveGoal3GaPositiveMatrixRealReplayAttemptEvidence({
      projectRoot,
      projectId: project.project_id,
      taskId: "PM-084",
      claimId: claim.id,
      materialSource: mismatchedMaterialSource,
      realReplayEnabled: false,
      actor: "goal3-task88"
    }),
    /real_replay_archive_material_claim_mismatch/
  );

  const materialSource = createPm084DeclaredReplayMaterial(claim);
  const archived = await archiveGoal3GaPositiveMatrixRealReplayAttemptEvidence({
    projectRoot,
    projectId: project.project_id,
    taskId: "PM-084",
    claimId: claim.id,
    materialSource,
    realReplayEnabled: false,
    actor: "goal3-task88"
  });

  assert.equal(archived.schema_version, "comath.goal3_positive_matrix_real_replay_attempt_archive.v1");
  assert.equal(archived.task_id, "PM-084");
  assert.equal(archived.claim_id, claim.id);
  assert.equal(archived.attempt_status, "replayable_environment_blocker");
  assert.equal(archived.terminal_classification, "replayable_blocker");
  assert.equal(archived.terminal_classification_scope, "attempt_archive_only");
  assert.equal(archived.terminal_classification_is_proof_authority, false);
  assert.equal(archived.executor_status, "blocked_before_replay");
  assert.equal(archived.blocker_code, "live_replay_executor_not_configured");
  assert.deepEqual(archived.attempted_commands, []);
  assert.deepEqual(archived.lean_run_manifest_paths, []);
  assert.equal(archived.final_authority_packaging_status, "blocked_missing_final_evidence");
  assert.equal(archived.packaging_report_is_not_archive_authority, true);
  assert.equal(archived.proof_authority, "none");
  assert.equal(archived.can_promote_claim, false);
  assert.equal(archived.promotion_requires_gate, true);
  assert.equal(archived.direct_claim_mutation, false);
  assert.equal(archived.no_injected_final_replay_authority, true);

  const archiveOnDisk = JSON.parse(readFileSync(join(projectRoot, archived.archive_path), "utf8"));
  assert.deepEqual(archiveOnDisk, archived);

  const artifacts = listArtifactRefs(projectRoot);
  assert.deepEqual(archived.artifact_ids.sort(), artifacts.map((artifact) => artifact.id).sort());
  assert.equal(artifacts.length, 3);
  assert.ok(artifacts.every((artifact) => artifact.kind === "other"));

  const evidenceRecords = readEvidenceRecords(projectRoot, project.project_id);
  assert.equal(evidenceRecords.length, 1);
  assert.equal(evidenceRecords[0].id, archived.evidence_id);
  assert.equal(evidenceRecords[0].kind, "audit");
  assert.equal(evidenceRecords[0].claim_id, claim.id);
  assert.deepEqual(evidenceRecords[0].artifact_ids.sort(), archived.artifact_ids.sort());

  const archiveAudit = readAuditEvents(projectRoot).find((event) => event.event_type === "goal3.real_replay_attempt_archived");
  assert.ok(archiveAudit);
  assert.equal(archiveAudit.target_id, claim.id);
  assert.equal(archiveAudit.payload.archive_id, archived.archive_id);
  assert.equal(archiveAudit.payload.evidence_id, archived.evidence_id);
  assert.equal(archiveAudit.payload.proof_authority, "none");
  assert.equal(archiveAudit.payload.can_promote_claim, false);
  assert.equal(archiveAudit.payload.diagnostic_is_proof_authority, false);

  markClaimPrerequisitesAsSatisfied(project.project_id, claim.id);
  const rejected = promoteClaim(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    target_status: "formally_checked",
    evidence_ids: [archived.evidence_id],
    artifact_ids: archived.artifact_ids,
    actor: "goal3-task88"
  });
  assert.equal(rejected.gate.ok, false);
  assert.equal(getClaim(projectRoot, project.project_id, claim.id)?.status, "conjectural");
  assert.ok(rejected.gate.vetoes.includes("formally_checked requires lean evidence"));
  assert.ok(rejected.gate.vetoes.includes("formally_checked requires proof artifact"));
  assert.ok(rejected.gate.vetoes.includes("formally_checked requires passed proof-kernel final replay manifest"));
  assert.ok(rejected.gate.vetoes.includes("formally_checked requires hash-bound fresh final replay artifacts"));
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 88 real replay attempt archive test passed.");
