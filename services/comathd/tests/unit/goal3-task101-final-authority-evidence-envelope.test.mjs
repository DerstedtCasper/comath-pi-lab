import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  appendFinalReplayRegistryEntryV3,
  appendLeanRunManifestProvenanceIndexV1,
  applyGatePromotedClaim,
  createFinalReplayManifestV3,
  createFormalReplayAuthorityEvidenceFromFinalAuthorityPackagingV3,
  createServiceOwnedLeanRunManifestV3,
  exportCampaignGoalModeEvidence,
  initProject,
  packageGoal3GaPositiveMatrixFinalAuthorityEvidenceV3,
  packageGoal3GaPositiveMatrixFinalAuthorityEvidenceWithDerivedBindingsV3,
  promoteGoal3GaPositiveMatrixFinalAuthorityEvidenceWithDerivedBindingsV3,
  projectExternalV3TerminalState,
  projectGoalModeTerminalState,
  registerClaim,
  statementHash,
  withExternalV3TerminalState,
  writeCampaign,
  writeThirdPartyReplayPackV3
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task101-authority-envelope-"));

function writeProjectFile(relativePath, content) {
  const absolute = join(projectRoot, relativePath);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content, "utf8");
  return absolute;
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function hashRef(path) {
  return { sha256: sha256(path), size_bytes: statSync(path).size };
}

function campaign(overrides = {}) {
  const now = "2026-05-31T00:00:00.000Z";
  return {
    campaign_id: "CAM-0101",
    project_id: "PRJ-0101",
    root_claim_id: "C-0101",
    user_goal: "Bind final authority packaging into terminal proof read model",
    current_stage: "completed_formal_proof",
    status: "terminal",
    strict_mode: true,
    terminal_state: "completed_formal_proof",
    stage_runs: [],
    open_obligations: [],
    accepted_artifacts: [],
    blockers: [],
    next_actions: [],
    created_at: now,
    updated_at: now,
    ...overrides
  };
}

try {
  const { project } = initProject({ name: "Goal 3 Task 101 Authority Envelope", root_path: projectRoot });
  const taskId = "PM-100";
  const claimStatement = "theorem Goal3Positive100 : True";
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: claimStatement,
    assumptions: [],
    domain: "logic",
    status: "conjectural",
    actor: "goal3-task101"
  });
  assert.equal(claim.statement_hash, statementHash(claimStatement));

  const replayId = "RPLY-0101";
  const runId = "LRUN-0101";
  const cleanRootRel = `.comath/lean/final_replay/${replayId}/clean`;
  const target = writeProjectFile(
    `${cleanRootRel}/MathResearch/Target.lean`,
    [
      "import Mathlib",
      "",
      "namespace MathResearch",
      "",
      "theorem Goal3Positive100 : True := by",
      "  trivial",
      "",
      "#check Goal3Positive100",
      "#print axioms Goal3Positive100",
      "",
      "end MathResearch",
      ""
    ].join("\n")
  );
  const audit = writeProjectFile(
    `${cleanRootRel}/Audit/TargetAudit.lean`,
    "import MathResearch.Target\n#check MathResearch.Goal3Positive100\n#print axioms MathResearch.Goal3Positive100\n"
  );
  const formalSpecRel = `${cleanRootRel}/FormalSpec/formal_spec_lock.json`;
  const assumptionLedgerRel = `${cleanRootRel}/FormalSpec/assumption_ledger.json`;
  const formalSpec = writeProjectFile(formalSpecRel, `${JSON.stringify({
    schema_version: "comath.formal_spec_lock.v2",
    task_id: taskId,
    claim_id: claim.id,
    namespace: "MathResearch",
    theorem_name: "Goal3Positive100",
    theorem_header: claimStatement,
    statement_hash: claim.statement_hash,
    proof_authority: "none"
  }, null, 2)}\n`);
  const assumptionLedger = writeProjectFile(assumptionLedgerRel, `${JSON.stringify({
    schema_version: "comath.assumption_ledger.v1",
    task_id: taskId,
    claim_id: claim.id,
    formal_spec_lock_hash: claim.statement_hash,
    entries: [],
    proof_authority: "none"
  }, null, 2)}\n`);
  const lakefile = writeProjectFile(
    `${cleanRootRel}/lakefile.lean`,
    "import Lake\nopen Lake DSL\npackage MathResearch where\nlean_lib MathResearch where\n  roots := #[`MathResearch.Target]\n"
  );
  const toolchain = writeProjectFile(`${cleanRootRel}/lean-toolchain`, "leanprover/lean4:v4.23.0\n");
  const lakeManifest = writeProjectFile(`${cleanRootRel}/lake-manifest.json`, `${JSON.stringify({ version: 7, packages: [] }, null, 2)}\n`);
  const leanBinary = writeProjectFile(`${cleanRootRel}/bin/lean`, "dummy lean executable for Task101 binary provenance\n");
  const lakeBinary = writeProjectFile(`${cleanRootRel}/bin/lake`, "dummy lake executable for Task101 binary provenance\n");
  const stdout = writeProjectFile(`.comath/evidence/${claim.id}/lean/${runId}.stdout.log`, "Goal3Positive100 checked\n");
  const stderr = writeProjectFile(`.comath/evidence/${claim.id}/lean/${runId}.stderr.log`, "");

  const leanRunManifest = createServiceOwnedLeanRunManifestV3({
    projectRoot,
    run_id: runId,
    claim_id: claim.id,
    campaign_id: "CAM-0101",
    purpose: "final_replay",
    command: ["lake", "build", "MathResearch"],
    cwd: join(projectRoot, cleanRootRel),
    input_files: [target, audit, formalSpec, assumptionLedger, lakefile, toolchain, lakeManifest],
    lean_version: "4.23.0",
    lake_version: "5.0.0",
    elan_toolchain: "leanprover/lean4:v4.23.0",
    lean_toolchain_file: toolchain,
    lake_manifest_file: lakeManifest,
    lean_binary_file: leanBinary,
    lake_binary_file: lakeBinary,
    network_policy: "disabled",
    sandbox: "none",
    exit_code: 0,
    stdout_path: stdout,
    stderr_path: stderr,
    started_at: "2026-05-31T00:00:00.000Z",
    ended_at: "2026-05-31T00:00:01.000Z",
    proof_authority: "lean_kernel_check"
  });
  const leanRunManifestRel = `.comath/evidence/${claim.id}/lean/${runId}.manifest.json`;
  writeProjectFile(leanRunManifestRel, `${JSON.stringify(leanRunManifest, null, 2)}\n`);
  appendLeanRunManifestProvenanceIndexV1({
    projectRoot,
    project_id: project.project_id,
    actor: "goal3-task101",
    manifest: leanRunManifest,
    manifest_path: leanRunManifestRel
  });

  const structuredAuditRel = `.comath/evidence/${claim.id}/lean/structured_audit.json`;
  const dependencyClosureRel = `.comath/evidence/${claim.id}/lean/dependency_closure.json`;
  const axiomProfileRel = `.comath/evidence/${claim.id}/lean/axiom_profile.json`;
  const statementCheckRel = `.comath/evidence/${claim.id}/lean/statement_equivalence.json`;
  writeProjectFile(structuredAuditRel, `${JSON.stringify({ result: "pass", hard_vetoes: [], generated_by_run_id: runId }, null, 2)}\n`);
  const staticAudit = writeProjectFile(`.comath/evidence/${claim.id}/lean/final_static_audit.json`, `${JSON.stringify({ result: "pass", hard_vetoes: [] })}\n`);
  const dependencyClosure = writeProjectFile(dependencyClosureRel, `${JSON.stringify({ result: "pass", hard_vetoes: [] })}\n`);
  const axiomProfile = writeProjectFile(axiomProfileRel, `${JSON.stringify({ result: "pass", detected_axioms: [], hard_vetoes: [] })}\n`);
  const statementCheck = writeProjectFile(statementCheckRel, `${JSON.stringify({ result: "pass", locked_statement_hash: claim.statement_hash, hard_vetoes: [] })}\n`);

  const finalReplayManifest = createFinalReplayManifestV3({
    projectRoot,
    replay_id: replayId,
    campaign_id: "CAM-0101",
    claim_id: claim.id,
    theorem_name: "MathResearch.Goal3Positive100",
    clean_workspace_path: join(projectRoot, cleanRootRel),
    command: ["lake", "build", "MathResearch"],
    exit_code: 0,
    result: "pass",
    source_hashes_before: {
      "MathResearch/Target.lean": hashRef(target),
      "Audit/TargetAudit.lean": hashRef(audit),
      "FormalSpec/formal_spec_lock.json": hashRef(formalSpec),
      "FormalSpec/assumption_ledger.json": hashRef(assumptionLedger),
      "lakefile.lean": hashRef(lakefile),
      "lean-toolchain": hashRef(toolchain),
      "lake-manifest.json": hashRef(lakeManifest)
    },
    stdout_path: stdout,
    stderr_path: stderr,
    report_paths: {
      static_audit: staticAudit,
      axiom_profile: axiomProfile,
      dependency_closure: dependencyClosure,
      statement_equivalence: statementCheck
    },
    lean_run_manifest_paths: [join(projectRoot, leanRunManifestRel)],
    dependency_lock: {
      lean_toolchain_path: toolchain,
      lake_manifest_path: lakeManifest,
      lakefile_path: lakefile,
      external_revisions: []
    },
    network_policy: "disabled",
    sandbox_policy: { network: "disabled", os_isolation: "process_boundary_only" },
    resource_budget: { timeout_ms: 30000, max_stdout_bytes: 65536, max_stderr_bytes: 65536 },
    binary_hashes: { lean: sha256(leanBinary), lake: sha256(lakeBinary) }
  });
  const finalReplayManifestRel = `.comath/evidence/${claim.id}/lean/final_replay_manifest_v3.json`;
  writeProjectFile(finalReplayManifestRel, `${JSON.stringify(finalReplayManifest, null, 2)}\n`);
  appendFinalReplayRegistryEntryV3(projectRoot, finalReplayManifest, { project_id: project.project_id, actor: "goal3-task101" });
  const replayPack = writeThirdPartyReplayPackV3(projectRoot, finalReplayManifest);

  const packaging = packageGoal3GaPositiveMatrixFinalAuthorityEvidenceWithDerivedBindingsV3({
    projectRoot,
    taskId,
    claimId: claim.id,
    evidence: {
      lean_run_manifest_paths: [leanRunManifestRel],
      final_replay_manifest_v3_path: finalReplayManifestRel,
      structured_audit_path: structuredAuditRel,
      dependency_closure_path: dependencyClosureRel,
      axiom_profile_path: axiomProfileRel,
      statement_check_path: statementCheckRel,
      third_party_replay_pack_path: replayPack.pack_path,
      formal_spec_lock_path: formalSpecRel,
      assumption_ledger_path: assumptionLedgerRel
    }
  });
  assert.equal(packaging.final_evidence_status, "verified_final_authority_evidence");

  applyGatePromotedClaim(projectRoot, {
    ...claim,
    formalization_status: "kernel_checked",
    dependency_closure_status: "all_dependencies_present",
    audit_state: "audit_passed",
    updated_at: new Date().toISOString()
  });

  const bound = createFormalReplayAuthorityEvidenceFromFinalAuthorityPackagingV3({
    projectRoot,
    packaging,
    gate_result_id: "GR-0101",
    recorded_at: "2026-05-31T00:00:00.000Z"
  });
  assert.equal(bound.ok, true);
  assert.deepEqual(bound.vetoes, []);
  assert.equal(bound.proof_authority, "lean_kernel_clean_replay");
  assert.equal(bound.evidence.schema_version, "comath.formal_replay_authority_evidence.v1");
  assert.equal(bound.evidence.proof_authority, "lean_kernel_clean_replay");
  assert.equal(bound.evidence.final_replay_manifest_v3_path, finalReplayManifestRel);
  assert.equal(bound.evidence.final_authority_packaging_path, packaging.packaging_report_path);
  assert.equal(bound.evidence.replay_id, replayId);
  assert.equal(bound.evidence.gate_result_id, "GR-0101");
  assert.equal(bound.evidence.artifact_hash, sha256(join(projectRoot, packaging.packaging_report_path)));

  const promotion = await promoteGoal3GaPositiveMatrixFinalAuthorityEvidenceWithDerivedBindingsV3({
    projectRoot,
    projectId: project.project_id,
    taskId,
    claimId: claim.id,
    evidence: {
      lean_run_manifest_paths: [leanRunManifestRel],
      final_replay_manifest_v3_path: finalReplayManifestRel,
      structured_audit_path: structuredAuditRel,
      dependency_closure_path: dependencyClosureRel,
      axiom_profile_path: axiomProfileRel,
      statement_check_path: statementCheckRel,
      third_party_replay_pack_path: replayPack.pack_path,
      formal_spec_lock_path: formalSpecRel,
      assumption_ledger_path: assumptionLedgerRel
    },
    actor: "goal3-task101-promotion"
  });
  assert.equal(promotion.gate.ok, true, JSON.stringify(promotion.gate.vetoes));
  assert.equal(promotion.promoted_by_ordinary_gate, true);
  assert.equal(promotion.formal_replay_authority_evidence?.gate_result_id, promotion.gate.id);
  assert.equal(promotion.formal_replay_authority_evidence?.replay_id, replayId);

  const persisted = writeCampaign(
    projectRoot,
    campaign({
      campaign_id: "CAM-0101",
      project_id: project.project_id,
      root_claim_id: claim.id,
      formal_replay_authority_passed: true,
      formal_replay_authority_evidence: bound.evidence
    }),
    "goal3-task101"
  );
  assert.equal(projectExternalV3TerminalState(persisted, { projectRoot }), "formal_proof_verified");
  assert.equal(projectGoalModeTerminalState(persisted, { projectRoot }), "formal_replay_passed");
  const projected = withExternalV3TerminalState(persisted, { projectRoot });
  assert.equal(projected.external_v3_terminal_state, "formal_proof_verified");
  assert.equal(projected.goal_mode_terminal_state, "formal_replay_passed");
  const exported = exportCampaignGoalModeEvidence({
    project_root: projectRoot,
    campaign_id: persisted.campaign_id,
    actor: "goal3-task101"
  });
  assert.equal(exported.export_manifest.evidence_pack_ready, true);
  assert.equal(exported.export_manifest.proof_authority, "lean_kernel_clean_replay");

  const blockedPackaging = packageGoal3GaPositiveMatrixFinalAuthorityEvidenceV3({
    projectRoot,
    taskId: "PM-099",
    claimId: claim.id
  });
  const blocked = createFormalReplayAuthorityEvidenceFromFinalAuthorityPackagingV3({
    projectRoot,
    packaging: blockedPackaging,
    recorded_at: "2026-05-31T00:00:00.000Z"
  });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.proof_authority, "none");
  assert.equal(blocked.evidence, undefined);
  assert.ok(blocked.vetoes.includes("final_authority_packaging_not_verified"));

  const legacy = createFormalReplayAuthorityEvidenceFromFinalAuthorityPackagingV3({
    projectRoot,
    packaging: {
      schema_version: "comath.pm002_final_authority_packaging.v1",
      final_evidence_status: "verified_final_authority_evidence",
      proof_authority: "lean_kernel_clean_replay",
      final_replay_manifest_v3_path: finalReplayManifestRel,
      packaging_report_path: packaging.packaging_report_path
    },
    recorded_at: "2026-05-31T00:00:00.000Z"
  });
  assert.equal(legacy.ok, false);
  assert.equal(legacy.evidence, undefined);
  assert.ok(legacy.vetoes.includes("final_authority_packaging_v3_required"));

  const noRegistry = createFormalReplayAuthorityEvidenceFromFinalAuthorityPackagingV3({
    projectRoot,
    packaging: { ...packaging, final_replay_manifest_v3_path: ".comath/evidence/missing/final_replay_manifest_v3.json" },
    recorded_at: "2026-05-31T00:00:00.000Z"
  });
  assert.equal(noRegistry.ok, false);
  assert.equal(noRegistry.evidence, undefined);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 101 final authority evidence envelope test passed.");
