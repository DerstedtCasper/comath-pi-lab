import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import {
  appendLeanRunManifestProvenanceIndexV1,
  createServiceOwnedLeanRunManifestV3,
  exportCampaignGoalModeEvidence,
  getClaim,
  initProject,
  projectExternalV3TerminalState,
  registerClaim,
  statementHash,
  tickCampaign,
  writeCampaign
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task106-replay-material-production-"));
const oldPath = process.env.PATH;

function writeProjectFile(relativePath, text) {
  const absolute = join(projectRoot, relativePath);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, text, "utf8");
  return absolute;
}

function writeJsonProjectFile(relativePath, value) {
  writeProjectFile(relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function readJsonProjectFile(relativePath) {
  return JSON.parse(readFileSync(join(projectRoot, relativePath), "utf8"));
}

function writeVerifiedLeanRunManifest({ campaignId, claim, candidateId, theoremName }) {
  const inputRel = `.comath/evidence/${claim.id}/lean/${candidateId}/Target.lean`;
  const toolchainRel = `.comath/evidence/${claim.id}/lean/${candidateId}/lean-toolchain`;
  const stdoutRel = `.comath/evidence/${claim.id}/lean/${candidateId}/stdout.log`;
  const stderrRel = `.comath/evidence/${claim.id}/lean/${candidateId}/stderr.log`;
  const manifestRel = `.comath/evidence/${claim.id}/lean/${candidateId}/lean_run_manifest_v3.json`;
  writeProjectFile(inputRel, `theorem ${theoremName.replace("MathResearch.", "")} : True := by trivial\n`);
  writeProjectFile(toolchainRel, "leanprover/lean4:v4.23.0\n");
  writeProjectFile(stdoutRel, "ok\n");
  writeProjectFile(stderrRel, "");
  const manifest = createServiceOwnedLeanRunManifestV3({
    projectRoot,
    run_id: "LRUN-0106",
    claim_id: claim.id,
    campaign_id: campaignId,
    candidate_id: candidateId,
    purpose: "check",
    command: ["lake", "build", "MathResearch"],
    cwd: join(projectRoot, `.comath/evidence/${claim.id}/lean/${candidateId}`),
    input_files: [join(projectRoot, inputRel), join(projectRoot, toolchainRel)],
    lean_version: "4.23.0",
    lake_version: "5.0.0",
    elan_toolchain: "leanprover/lean4:v4.23.0",
    lean_toolchain_file: join(projectRoot, toolchainRel),
    network_policy: "disabled",
    sandbox: "none",
    exit_code: 0,
    stdout_path: join(projectRoot, stdoutRel),
    stderr_path: join(projectRoot, stderrRel),
    started_at: "2026-06-01T00:00:00.000Z",
    ended_at: "2026-06-01T00:00:01.000Z",
    proof_authority: "lean_kernel_check"
  });
  writeJsonProjectFile(manifestRel, manifest);
  appendLeanRunManifestProvenanceIndexV1({
    projectRoot,
    project_id: claim.project_id,
    actor: "goal3-task106",
    manifest,
    manifest_path: join(projectRoot, manifestRel)
  });
  return manifestRel;
}

function installFakeLeanAndLake(theoremName) {
  const bin = join(projectRoot, ".comath", "fake-bin");
  mkdirSync(bin, { recursive: true });
  writeFileSync(
    join(bin, "lean.cmd"),
    "@echo off\r\necho Lean (version 4.23.0, x86_64-pc-windows-msvc, commit task106)\r\nexit /b 0\r\n",
    "utf8"
  );
  writeFileSync(
    join(bin, "lake.cmd"),
    [
      "@echo off",
      "if \"%1\"==\"--version\" (",
      "  echo Lake version 5.0.0",
      "  exit /b 0",
      ")",
      `echo ${theoremName} : True`,
      `echo ${theoremName} does not depend on any axioms`,
      "exit /b 0",
      ""
    ].join("\r\n"),
    "utf8"
  );
  const leanSh = join(bin, "lean");
  const lakeSh = join(bin, "lake");
  writeFileSync(leanSh, "#!/bin/sh\necho 'Lean (version 4.23.0, x86_64-unknown-linux-gnu, commit task106)'\n", "utf8");
  writeFileSync(
    lakeSh,
    [
      "#!/bin/sh",
      "if [ \"$1\" = \"--version\" ]; then",
      "  echo 'Lake version 5.0.0'",
      "  exit 0",
      "fi",
      `echo '${theoremName} : True'`,
      `echo '${theoremName} does not depend on any axioms'`,
      ""
    ].join("\n"),
    "utf8"
  );
  chmodSync(leanSh, 0o755);
  chmodSync(lakeSh, 0o755);
  process.env.PATH = `${bin}${delimiter}${process.env.PATH ?? ""}`;
}

function campaignFixture(projectId, claimId, statementHashValue) {
  const now = "2026-05-31T00:00:00.000Z";
  return {
    campaign_id: "CAM-0106",
    project_id: projectId,
    root_claim_id: claimId,
    user_goal: "Task106 integration produces final replay material from selected candidate artifacts",
    current_stage: "integration_refactor",
    status: "running",
    strict_mode: true,
    stage_runs: [],
    open_obligations: [
      {
        obligation_id: "PO-0106",
        claim_id: claimId,
        locked_statement_nl: "MathResearch.Goal3ReplayMaterialProduction106 : True",
        locked_statement_structured: {},
        statement_hash: statementHashValue,
        dependencies: [],
        assumptions: [],
        status: "candidate_selected"
      }
    ],
    accepted_artifacts: [],
    blockers: [],
    next_actions: ["integrate and refactor selected candidate after red-team gate"],
    created_at: now,
    updated_at: now
  };
}

function writeSelectedCandidateMaterialSource({ campaignId, claim, claimStatement, theoremName, leanRootRel, evidenceRel }) {
  const workspace = `.comath/campaign/${campaignId}/ensembles/lemma_sprint/PO-0106/candidates/v5-computational-verifier`;
  const manifestRel = `${workspace}/candidate_manifest.json`;
  const materialSourceRel = `${workspace}/candidate_final_replay_material_source.json`;
  const candidateId = "CAND-0106";
  const candidate = {
    candidate_id: candidateId,
    campaign_id: campaignId,
    stage: "lemma_sprint",
    obligation_id: "PO-0106",
    variant_id: "V5",
    workspace_path: workspace,
    locked_statement_hash: claim.statement_hash,
    candidate_statement_hash: claim.statement_hash,
    state: "candidate_kernel_checked",
    manifest_path: manifestRel,
    score: 120,
    hard_vetoes: [],
    artifacts: [],
    replay_command: "lake build MathResearch"
  };
  writeJsonProjectFile(manifestRel, {
    candidate_id: candidateId,
    campaign_id: campaignId,
    variant_id: "V5",
    stage: "lemma_sprint",
    obligation_id: "PO-0106",
    workspace_path: workspace,
    locked_statement_hash: claim.statement_hash,
    candidate_statement_hash: claim.statement_hash,
    state: "candidate_kernel_checked",
    statement_equivalence_claim: "exact",
    dependencies: ["Mathlib"],
    assumptions: [],
    introduced_assumptions: [],
    introduced_dependencies: [],
    artifacts: [
      {
        path: "candidate_final_replay_material_source.json",
        kind: "final_replay_material_source",
        required_for: ["integration_refactor", "final_replay_material"]
      }
    ],
    lean_files: [`${leanRootRel}/MathResearch/Target.lean`],
    logs: [],
    evidence: [evidenceRel],
    hard_vetoes: [],
    failures: [],
    replay_command: "lake build MathResearch",
    summary: "Candidate is checked only as candidate material; final proof authority still requires clean replay.",
    maintainability_notes: "Small integrated proof candidate with explicit final replay material source."
  });
  writeJsonProjectFile(materialSourceRel, {
    schema_version: "comath.selected_candidate_final_replay_material_source.v1",
    campaign_id: campaignId,
    claim_id: claim.id,
    obligation_id: "PO-0106",
    candidate_id: candidateId,
    artifact_role: "selected_candidate_final_replay_material_source",
    proof_authority: "none",
    can_promote_claim: false,
    lean_project: {
      lean_root: leanRootRel,
      theorem_file_rel: "MathResearch/Target.lean",
      formal_spec_file: "FormalSpec/formal_spec_lock.json",
      assumption_ledger_file: "FormalSpec/assumption_ledger.json",
      audit_file_rel: "Audit/TargetAudit.lean",
      lakefile: "lakefile.lean",
      toolchain_file: "lean-toolchain",
      theorem_name: theoremName,
      theorem_family_id: campaignId,
      canonical_proposition: "True",
      build_targets: ["MathResearch"],
      replay_command: "lake build MathResearch",
      primary_dependency: "Mathlib",
      formal_spec: {
        claim_id: claim.id,
        theorem_name: "Goal3ReplayMaterialProduction106",
        namespace: "MathResearch",
        normalized_statement: claimStatement,
        locked_statement_hash: claim.statement_hash
      }
    }
  });
  writeJsonProjectFile(`.comath/campaign/${campaignId}/ensembles/lemma_sprint/PO-0106/candidates.json`, [candidate]);
  writeJsonProjectFile(`.comath/campaign/${campaignId}/ensembles/lemma_sprint/PO-0106/decision.json`, {
    selected_candidate_id: candidateId,
    selection_mode: "evidence_weighted",
    proof_authority: "none",
    rejected_candidates: [],
    hard_vetoes: [],
    recovery_plan: []
  });
  writeJsonProjectFile(`.comath/campaign/${campaignId}/refutation_red_team.json`, {
    campaign_id: campaignId,
    obligation_id: "PO-0106",
    selected_candidate_id: candidateId,
    proof_authority: "none",
    result: "no_counterexample_found",
    hard_vetoes: []
  });
}

try {
  const { project } = initProject({ name: "Goal 3 Task 106 Replay Material Production", root_path: projectRoot });
  const campaignId = "CAM-0106";
  const theoremName = "MathResearch.Goal3ReplayMaterialProduction106";
  const claimStatement = `${theoremName} : True`;
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: claimStatement,
    assumptions: [],
    domain: "logic",
    status: "conjectural",
    actor: "goal3-task106"
  });
  assert.equal(claim.statement_hash, statementHash(claimStatement));
  installFakeLeanAndLake(theoremName);

  const leanRootRel = ".comath/lean/task106-produced-material";
  writeProjectFile(
    `${leanRootRel}/MathResearch/Target.lean`,
    [
      "namespace MathResearch",
      "",
      "theorem Goal3ReplayMaterialProduction106 : True := by",
      "  trivial",
      "",
      "#check Goal3ReplayMaterialProduction106",
      "#print axioms Goal3ReplayMaterialProduction106",
      "",
      "end MathResearch",
      ""
    ].join("\n")
  );
  writeProjectFile(
    `${leanRootRel}/Audit/TargetAudit.lean`,
    "import MathResearch.Target\n#check MathResearch.Goal3ReplayMaterialProduction106\n#print axioms MathResearch.Goal3ReplayMaterialProduction106\n"
  );
  writeJsonProjectFile(`${leanRootRel}/FormalSpec/formal_spec_lock.json`, {
    schema_version: "comath.formal_spec_lock.v2",
    binding_scope: "campaign",
    campaign_id: campaignId,
    claim_id: claim.id,
    namespace: "MathResearch",
    theorem_name: "Goal3ReplayMaterialProduction106",
    theorem_header: "theorem Goal3ReplayMaterialProduction106 : True",
    statement_hash: claim.statement_hash,
    proof_authority: "none"
  });
  writeJsonProjectFile(`${leanRootRel}/FormalSpec/assumption_ledger.json`, {
    schema_version: "comath.assumption_ledger.v1",
    binding_scope: "campaign",
    campaign_id: campaignId,
    claim_id: claim.id,
    formal_spec_lock_hash: claim.statement_hash,
    entries: [],
    proof_authority: "none"
  });
  writeProjectFile(
    `${leanRootRel}/lakefile.lean`,
    "import Lake\nopen Lake DSL\npackage MathResearch where\nlean_lib MathResearch where\n  roots := #[`MathResearch.Target]\n"
  );
  writeProjectFile(`${leanRootRel}/lean-toolchain`, "leanprover/lean4:v4.23.0\n");
  writeJsonProjectFile(`${leanRootRel}/lake-manifest.json`, { version: 7, packages: [] });
  writeSelectedCandidateMaterialSource({
    campaignId,
    claim,
    claimStatement,
    theoremName,
    leanRootRel,
    evidenceRel: writeVerifiedLeanRunManifest({ campaignId, claim, candidateId: "CAND-0106", theoremName })
  });

  assert.equal(existsSync(join(projectRoot, `.comath/campaign/${campaignId}/generated_final_replay_material.json`)), false);
  writeCampaign(projectRoot, campaignFixture(project.project_id, claim.id, claim.statement_hash), "goal3-task106");

  const integrated = await tickCampaign({
    project_root: projectRoot,
    campaign_id: campaignId,
    actor: "goal3-task106"
  });

  assert.equal(integrated.campaign.current_stage, "final_static_audit", JSON.stringify(integrated.campaign.blockers, null, 2));
  assert.equal(integrated.campaign.accepted_artifacts.length, 1);
  const materialArtifact = integrated.campaign.accepted_artifacts[0];
  const material = JSON.parse(readFileSync(join(projectRoot, materialArtifact.path), "utf8"));
  assert.equal(material.schema_version, "comath.campaign_final_replay_material.v1");
  assert.equal(material.source_candidate_id, "CAND-0106");
  assert.equal(material.source_candidate_manifest_path.endsWith("/candidate_manifest.json"), true);
  assert.equal(material.source_material_path.endsWith("/candidate_final_replay_material_source.json"), true);
  assert.equal(material.integration_artifact_path, `.comath/campaign/${campaignId}/integration_refactor.json`);
  assert.equal(material.produced_by, "comathd.integration_final_replay_material_producer");
  assert.equal(material.proof_authority, "none");
  assert.equal(material.can_promote_claim, false);

  const integrationStage = integrated.campaign.stage_runs.at(-1);
  assert.ok(integrationStage.artifact_paths.includes(`.comath/campaign/${campaignId}/generated_final_replay_material.json`));
  assert.ok(integrationStage.artifact_paths.includes(materialArtifact.path));

  const prepared = await tickCampaign({
    project_root: projectRoot,
    campaign_id: campaignId,
    actor: "goal3-task106"
  });
  assert.equal(prepared.campaign.current_stage, "final_global_replay", JSON.stringify(prepared.campaign.blockers, null, 2));
  assert.equal(prepared.campaign.accepted_artifacts.length, 2);

  const result = await tickCampaign({
    project_root: projectRoot,
    campaign_id: campaignId,
    actor: "goal3-task106"
  });

  assert.equal(result.campaign.current_stage, "completed_formal_proof", JSON.stringify(result.campaign.blockers, null, 2));
  assert.equal(result.campaign.formal_replay_authority_passed, true);
  assert.equal(projectExternalV3TerminalState(result.campaign, { projectRoot }), "formal_proof_verified");
  assert.equal(getClaim(projectRoot, project.project_id, claim.id)?.status, "formally_checked");

  const exported = exportCampaignGoalModeEvidence({
    project_root: projectRoot,
    campaign_id: campaignId,
    actor: "goal3-task106"
  });
  assert.equal(exported.export_manifest.evidence_pack_ready, true);
  assert.equal(exported.export_manifest.proof_authority, "lean_kernel_clean_replay");
} finally {
  process.env.PATH = oldPath;
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 106 final replay material production test passed.");
