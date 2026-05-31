import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  appendEvidenceRecord,
  applyGatePromotedClaim,
  appendFinalReplayRegistryEntryV3,
  createFinalReplayManifestV3,
  createGoal3GaPm002ReplayMaterialPackPreflight,
  createServiceOwnedLeanRunManifestV3,
  executeGoal3GaPm002LeanAuthorityReplay,
  importArtifact,
  initProject,
  packageGoal3GaPm002FinalAuthorityEvidence,
  promoteClaim,
  registerClaim,
  statementHash,
  writeThirdPartyReplayPackV3
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task44-pm002-gate-"));

function writeProjectFile(relativePath, content) {
  const path = join(projectRoot, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
  return path;
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function hashRef(path) {
  return { sha256: sha256(path), size_bytes: statSync(path).size };
}

try {
  const { project } = initProject({ name: "Goal 3 Task 44 PM-002 Gate", root_path: projectRoot });
  const preflight = createGoal3GaPm002ReplayMaterialPackPreflight({ projectRoot });
  const commandReport = executeGoal3GaPm002LeanAuthorityReplay({
    projectRoot,
    materialSource: preflight.material_source,
    probeLeanVersion: () => ({ exit_code: 0, stdout: "Lean (version 4.23.0, x86_64-unknown, commit abc)", stderr: "" }),
    probeLakeVersion: () => ({ exit_code: 0, stdout: "Lake version 5.0.0", stderr: "" }),
    runReplayCommand: (command) => ({ exit_code: 0, stdout: `${command.join(" ")} ok`, stderr: "" })
  });
  const commandBlocker = JSON.parse(readFileSync(join(projectRoot, commandReport.executor_blocker_path), "utf8"));
  let leanRunManifestPaths = commandBlocker.lean_run_manifest_paths;
  assert.ok(leanRunManifestPaths.length > 0);

  const claimStatement = "theorem Goal3Positive002 (M : Type) [Monoid M] (x : M) : 1 * x = x";
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: claimStatement,
    assumptions: [],
    domain: "algebra",
    status: "conjectural",
    actor: "goal3-task44"
  });
  assert.equal(claim.statement_hash, statementHash(claimStatement));

  const replayId = "RPLY-0002";
  const cleanRootRel = `.comath/lean/final_replay/${replayId}/clean`;
  const cleanRoot = join(projectRoot, cleanRootRel);
  const target = writeProjectFile(`${cleanRootRel}/MathResearch/Target.lean`, readFileSync(join(projectRoot, preflight.material_source.lean_source_path), "utf8"));
  const audit = writeProjectFile(`${cleanRootRel}/Audit/TargetAudit.lean`, "import MathResearch.Target\n#check MathResearch.Goal3Positive002\n#print axioms MathResearch.Goal3Positive002\n");
  const formalSpec = writeProjectFile(`${cleanRootRel}/FormalSpec/target.json`, readFileSync(join(projectRoot, preflight.material_source.formal_spec_lock_path), "utf8"));
  const lakefile = writeProjectFile(`${cleanRootRel}/lakefile.lean`, readFileSync(join(projectRoot, preflight.material_source.lakefile_path), "utf8"));
  const toolchain = writeProjectFile(`${cleanRootRel}/lean-toolchain`, readFileSync(join(projectRoot, preflight.material_source.lean_toolchain_path), "utf8"));
  const lakeManifest = writeProjectFile(`${cleanRootRel}/lake-manifest.json`, readFileSync(join(projectRoot, preflight.material_source.lake_manifest_path), "utf8"));

  const stdout = writeProjectFile(`.comath/evidence/${claim.id}/lean/final_replay.log`, "MathResearch.Goal3Positive002 : (M : Type) -> [Monoid M] -> (x : M) -> 1 * x = x\n");
  const stderr = writeProjectFile(`.comath/evidence/${claim.id}/lean/final_replay.stderr.log`, "");
  const staticAudit = writeProjectFile(`.comath/evidence/${claim.id}/lean/final_static_audit.json`, JSON.stringify({ result: "pass", hard_vetoes: [] }));
  const structuredAuditRel = `.comath/evidence/${claim.id}/lean/structured_audit.json`;
  writeProjectFile(
    structuredAuditRel,
    JSON.stringify({
      schema_version: "comath.structured_lean_audit.v3",
      theorem_name: "MathResearch.Goal3Positive002",
      fully_qualified_name: "MathResearch.Goal3Positive002",
      theorem_type_pretty: "(M : Type) [Monoid M] (x : M) : 1 * x = x",
      result: "pass",
      hard_vetoes: [],
      generated_by_run_id: "LRUN-0003"
    })
  );
  const axiomProfile = writeProjectFile(`.comath/evidence/${claim.id}/lean/axiom_profile.json`, JSON.stringify({ result: "pass", detected_axioms: [], hard_vetoes: [] }));
  const dependencyClosure = writeProjectFile(`.comath/evidence/${claim.id}/lean/dependency_closure.json`, JSON.stringify({ result: "pass", hard_vetoes: [] }));
  const statementEquivalence = writeProjectFile(
    `.comath/evidence/${claim.id}/lean/statement_equivalence.json`,
    JSON.stringify({ result: "pass", locked_statement_hash: claim.statement_hash, hard_vetoes: [] })
  );
  const finalRunManifest = createServiceOwnedLeanRunManifestV3({
    projectRoot,
    run_id: "LRUN-0003",
    claim_id: claim.id,
    campaign_id: "CAM-0002",
    purpose: "final_replay",
    command: ["lake", "build", "MathResearch"],
    cwd: cleanRoot,
    input_files: [target, audit, formalSpec, lakefile, toolchain, lakeManifest],
    lean_version: "4.23.0",
    lake_version: "5.0.0",
    elan_toolchain: "leanprover/lean4:v4.23.0",
    lean_toolchain_file: toolchain,
    lake_manifest_file: lakeManifest,
    network_policy: "disabled",
    sandbox: "none",
    exit_code: 0,
    stdout_path: stdout,
    stderr_path: stderr,
    started_at: new Date().toISOString(),
    ended_at: new Date().toISOString(),
    proof_authority: "lean_kernel_check"
  });
  const finalRunManifestRel = `.comath/evidence/${claim.id}/lean/LRUN-0003.manifest.json`;
  writeProjectFile(finalRunManifestRel, `${JSON.stringify(finalRunManifest, null, 2)}\n`);
  leanRunManifestPaths = [...leanRunManifestPaths, finalRunManifestRel];
  commandBlocker.lean_run_manifest_paths = leanRunManifestPaths;
  writeFileSync(join(projectRoot, commandReport.executor_blocker_path), `${JSON.stringify(commandBlocker, null, 2)}\n`, "utf8");

  const sourceHashesBefore = {
    "MathResearch/Target.lean": hashRef(target),
    "Audit/TargetAudit.lean": hashRef(audit),
    "FormalSpec/target.json": hashRef(formalSpec),
    "lakefile.lean": hashRef(lakefile),
    "lean-toolchain": hashRef(toolchain),
    "lake-manifest.json": hashRef(lakeManifest)
  };
  const finalReplayManifest = createFinalReplayManifestV3({
    projectRoot,
    replay_id: replayId,
    campaign_id: "CAM-0002",
    claim_id: claim.id,
    theorem_name: "MathResearch.Goal3Positive002",
    clean_workspace_path: cleanRoot,
    command: ["lake", "build", "MathResearch"],
    exit_code: 0,
    result: "pass",
    source_hashes_before: sourceHashesBefore,
    stdout_path: stdout,
    stderr_path: stderr,
    report_paths: {
      static_audit: staticAudit,
      axiom_profile: axiomProfile,
      dependency_closure: dependencyClosure,
      statement_equivalence: statementEquivalence
    },
    lean_run_manifest_paths: leanRunManifestPaths.map((manifestPath) => join(projectRoot, manifestPath)),
    dependency_lock: {
      lean_toolchain_path: toolchain,
      lake_manifest_path: lakeManifest,
      lakefile_path: lakefile,
      external_revisions: []
    },
    network_policy: "disabled",
    sandbox_policy: { network: "disabled", os_isolation: "process_boundary_only" },
    resource_budget: { timeout_ms: 30000, max_stdout_bytes: 65536, max_stderr_bytes: 65536 }
  });
  const finalReplayManifestRel = `.comath/evidence/${claim.id}/lean/final_replay_manifest_v3.json`;
  writeProjectFile(finalReplayManifestRel, `${JSON.stringify(finalReplayManifest, null, 2)}\n`);
  appendFinalReplayRegistryEntryV3(projectRoot, finalReplayManifest);
  const replayPack = writeThirdPartyReplayPackV3(projectRoot, finalReplayManifest);

  const packaging = packageGoal3GaPm002FinalAuthorityEvidence({
    projectRoot,
    materialSource: {
      ...preflight.material_source,
      final_replay_manifest_v3_path: finalReplayManifestRel,
      structured_audit_path: structuredAuditRel,
      third_party_replay_pack_path: replayPack.pack_path,
      lean_run_manifest_id: "LRUN-0003",
      final_replay_manifest_id: replayId
    },
    commandReplayReport: commandReport
  });
  assert.equal(packaging.final_evidence_status, "verified_final_authority_evidence");
  assert.equal(packaging.can_promote_claim, false);
  assert.equal(packaging.promotion_requires_gate, true);

  const packagingArtifact = await importArtifact({
    projectRoot,
    project_id: project.project_id,
    source_path: packaging.packaging_report_path,
    kind: "runner_output",
    actor: "goal3-task44"
  });
  const finalManifestArtifact = await importArtifact({
    projectRoot,
    project_id: project.project_id,
    source_path: finalReplayManifestRel,
    kind: "runner_output",
    actor: "goal3-task44"
  });
  const leanEvidence = appendEvidenceRecord(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    kind: "lean",
    summary: "Verified PM-002 final authority packaging plus FinalReplayManifest v3 for ordinary promotion-gate review.",
    artifact_ids: [packagingArtifact.id, finalManifestArtifact.id]
  });

  const packagingAlone = promoteClaim(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    target_status: "formally_checked",
    evidence_ids: [leanEvidence.id],
    artifact_ids: [packagingArtifact.id, finalManifestArtifact.id],
    actor: "goal3-task44"
  });
  assert.equal(packagingAlone.gate.ok, false, "packaging evidence must not bypass claim gate prerequisites");
  assert.equal(packagingAlone.claim.status, "conjectural");
  assert.ok(packagingAlone.gate.vetoes.includes("formally_checked requires kernel_checked formalization"));

  applyGatePromotedClaim(projectRoot, {
    ...claim,
    formalization_status: "kernel_checked",
    dependency_closure_status: "all_dependencies_present",
    audit_state: "audit_passed",
    updated_at: new Date().toISOString()
  });

  const promoted = promoteClaim(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    target_status: "formally_checked",
    evidence_ids: [leanEvidence.id],
    artifact_ids: [packagingArtifact.id, finalManifestArtifact.id],
    actor: "goal3-task44"
  });
  assert.equal(promoted.gate.ok, true, JSON.stringify(promoted.gate.vetoes));
  assert.equal(promoted.claim.status, "formally_checked");

  const packagingPath = join(projectRoot, packagingArtifact.path);
  const tamperedPackaging = JSON.parse(readFileSync(packagingPath, "utf8"));
  tamperedPackaging.proof_authority = "none";
  writeFileSync(packagingPath, `${JSON.stringify(tamperedPackaging, null, 2)}\n`, "utf8");
  assert.equal(existsSync(packagingPath), true);

  const tampered = promoteClaim(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    target_status: "formally_checked",
    evidence_ids: [leanEvidence.id],
    artifact_ids: [packagingArtifact.id, finalManifestArtifact.id],
    actor: "goal3-task44"
  });
  assert.equal(tampered.gate.ok, false);
  assert.ok(tampered.gate.vetoes.some((veto) => veto.includes(`promotion artifact hash mismatch: ${packagingArtifact.id}`)));
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 44 PM-002 packaging promotion gate test passed.");
