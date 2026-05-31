import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import {
  exportCampaignGoalModeEvidence,
  getClaim,
  importArtifact,
  initProject,
  projectExternalV3TerminalState,
  registerClaim,
  statementHash,
  tickCampaign,
  writeCampaign
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task105-replay-target-production-"));
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

function installFakeLeanAndLake(theoremName) {
  const bin = join(projectRoot, ".comath", "fake-bin");
  mkdirSync(bin, { recursive: true });
  writeFileSync(
    join(bin, "lean.cmd"),
    "@echo off\r\necho Lean (version 4.23.0, x86_64-pc-windows-msvc, commit task105)\r\nexit /b 0\r\n",
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
  writeFileSync(leanSh, "#!/bin/sh\necho 'Lean (version 4.23.0, x86_64-unknown-linux-gnu, commit task105)'\n", "utf8");
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

function campaignFixture(projectId, claimId, statementHashValue, acceptedArtifacts) {
  const now = "2026-05-31T00:00:00.000Z";
  return {
    campaign_id: "CAM-0105",
    project_id: projectId,
    root_claim_id: claimId,
    user_goal: "Task105 final_static_audit produces campaign final replay target from accepted workstream material",
    current_stage: "final_static_audit",
    status: "running",
    strict_mode: true,
    stage_runs: [],
    open_obligations: [
      {
        obligation_id: "PO-0105",
        claim_id: claimId,
        locked_statement_nl: "MathResearch.Goal3ReplayTargetProduction105 : True",
        locked_statement_structured: {},
        statement_hash: statementHashValue,
        dependencies: [],
        assumptions: [],
        status: "candidate_selected"
      }
    ],
    accepted_artifacts: acceptedArtifacts,
    blockers: [],
    next_actions: ["prepare final static audit before global replay"],
    created_at: now,
    updated_at: now
  };
}

try {
  const { project } = initProject({ name: "Goal 3 Task 105 Replay Target Production", root_path: projectRoot });
  const campaignId = "CAM-0105";
  const theoremName = "MathResearch.Goal3ReplayTargetProduction105";
  const claimStatement = `${theoremName} : True`;
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: claimStatement,
    assumptions: [],
    domain: "logic",
    status: "conjectural",
    actor: "goal3-task105"
  });
  assert.equal(claim.statement_hash, statementHash(claimStatement));
  installFakeLeanAndLake(theoremName);

  const leanRootRel = ".comath/lean/task105-produced-target";
  writeProjectFile(
    `${leanRootRel}/MathResearch/Target.lean`,
    [
      "namespace MathResearch",
      "",
      "theorem Goal3ReplayTargetProduction105 : True := by",
      "  trivial",
      "",
      "#check Goal3ReplayTargetProduction105",
      "#print axioms Goal3ReplayTargetProduction105",
      "",
      "end MathResearch",
      ""
    ].join("\n")
  );
  writeProjectFile(
    `${leanRootRel}/Audit/TargetAudit.lean`,
    "import MathResearch.Target\n#check MathResearch.Goal3ReplayTargetProduction105\n#print axioms MathResearch.Goal3ReplayTargetProduction105\n"
  );
  writeJsonProjectFile(`${leanRootRel}/FormalSpec/formal_spec_lock.json`, {
    schema_version: "comath.formal_spec_lock.v2",
    binding_scope: "campaign",
    campaign_id: campaignId,
    claim_id: claim.id,
    namespace: "MathResearch",
    theorem_name: "Goal3ReplayTargetProduction105",
    theorem_header: "theorem Goal3ReplayTargetProduction105 : True",
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
  writeProjectFile(
    ".comath/lean/MathResearch/Integrated.lean",
    "import MathResearch.Target\nnamespace MathResearch\n#check Goal3ReplayTargetProduction105\nend MathResearch\n"
  );
  writeJsonProjectFile(".comath/proof/import_profile.json", {
    campaign_id: campaignId,
    obligation_id: "PO-0105",
    imports: ["MathResearch.Target"],
    proof_authority: "none"
  });
  writeProjectFile(
    ".comath/proof/integration_report.md",
    [
      "# Integration Report",
      "",
      `campaign_id: ${campaignId}`,
      "obligation_id: PO-0105",
      "",
      "The final replay target must still be produced and clean-replayed by comathd.",
      ""
    ].join("\n")
  );

  const materialRel = `.comath/campaign/${campaignId}/workstreams/WS-0105/final_replay_material.json`;
  writeJsonProjectFile(materialRel, {
    schema_version: "comath.campaign_final_replay_material.v1",
    campaign_id: campaignId,
    claim_id: claim.id,
    obligation_id: "PO-0105",
    artifact_role: "final_replay_material_source",
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
        theorem_name: "Goal3ReplayTargetProduction105",
        namespace: "MathResearch",
        normalized_statement: claimStatement,
        locked_statement_hash: claim.statement_hash
      }
    }
  });
  const materialArtifact = await importArtifact({
    projectRoot,
    project_id: project.project_id,
    source_path: materialRel,
    kind: "code",
    actor: "goal3-task105"
  });

  assert.equal(existsSync(join(projectRoot, `.comath/campaign/${campaignId}/final_replay_request.json`)), false);
  assert.equal(existsSync(join(projectRoot, `.comath/campaign/${campaignId}/generated_final_replay_target.json`)), false);
  writeCampaign(projectRoot, campaignFixture(project.project_id, claim.id, claim.statement_hash, [materialArtifact]), "goal3-task105");

  const prepared = await tickCampaign({
    project_root: projectRoot,
    campaign_id: campaignId,
    actor: "goal3-task105"
  });

  assert.equal(prepared.campaign.current_stage, "final_global_replay", JSON.stringify(prepared.campaign.blockers, null, 2));
  assert.equal(prepared.campaign.accepted_artifacts.length, 2);
  const producedArtifact = prepared.campaign.accepted_artifacts.find((artifact) => artifact.id !== materialArtifact.id);
  assert.ok(producedArtifact);
  assert.equal(producedArtifact.project_id, project.project_id);
  assert.equal(producedArtifact.kind, "code");

  const target = JSON.parse(readFileSync(join(projectRoot, producedArtifact.path), "utf8"));
  assert.equal(target.schema_version, "comath.campaign_final_replay_target.v1");
  assert.equal(target.source_material_artifact_id, materialArtifact.id);
  assert.equal(target.source_material_artifact_sha256, materialArtifact.sha256);
  assert.equal(target.replay_request.packaging_scope, "campaign");
  assert.equal(target.proof_authority, "none");
  assert.equal(target.can_promote_claim, false);

  const auditStage = prepared.campaign.stage_runs.at(-1);
  assert.ok(auditStage.artifact_paths.includes(`.comath/campaign/${campaignId}/generated_final_replay_target.json`));
  assert.ok(auditStage.artifact_paths.includes(producedArtifact.path));

  const result = await tickCampaign({
    project_root: projectRoot,
    campaign_id: campaignId,
    actor: "goal3-task105"
  });

  assert.equal(result.campaign.current_stage, "completed_formal_proof", JSON.stringify(result.campaign.blockers, null, 2));
  assert.equal(result.campaign.status, "terminal");
  assert.equal(result.campaign.terminal_state, "completed_formal_proof");
  assert.equal(result.campaign.formal_replay_authority_passed, true);
  assert.equal(projectExternalV3TerminalState(result.campaign), "formal_proof_verified");
  assert.ok(result.campaign.stage_runs.at(-1).artifact_paths.includes(`.comath/campaign/${campaignId}/assembled_final_replay_request.json`));

  const assembled = readJsonProjectFile(`.comath/campaign/${campaignId}/assembled_final_replay_request.json`);
  assert.equal(assembled.source_artifact_id, producedArtifact.id);
  assert.equal(assembled.replay_request.packaging_scope, "campaign");

  const promotedClaim = getClaim(projectRoot, project.project_id, claim.id);
  assert.equal(promotedClaim?.status, "formally_checked");

  const exported = exportCampaignGoalModeEvidence({
    project_root: projectRoot,
    campaign_id: campaignId,
    actor: "goal3-task105"
  });
  assert.equal(exported.export_manifest.evidence_pack_ready, true);
  assert.equal(exported.export_manifest.proof_authority, "lean_kernel_clean_replay");
} finally {
  process.env.PATH = oldPath;
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 105 final replay target production test passed.");
