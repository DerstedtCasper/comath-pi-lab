import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import {
  exportCampaignGoalModeEvidence,
  getClaim,
  initProject,
  projectExternalV3TerminalState,
  registerClaim,
  statementHash,
  tickCampaign,
  writeCampaign
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task103-campaign-native-"));
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
    "@echo off\r\necho Lean (version 4.23.0, x86_64-pc-windows-msvc, commit task103)\r\nexit /b 0\r\n",
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
  writeFileSync(leanSh, "#!/bin/sh\necho 'Lean (version 4.23.0, x86_64-unknown-linux-gnu, commit task103)'\n", "utf8");
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
    campaign_id: "CAM-0103",
    project_id: projectId,
    root_claim_id: claimId,
    user_goal: "Task103 campaign-native final replay must not require a positive-matrix task",
    current_stage: "final_global_replay",
    status: "running",
    strict_mode: true,
    stage_runs: [],
    open_obligations: [
      {
        obligation_id: "PO-0103",
        claim_id: claimId,
        locked_statement_nl: "MathResearch.Goal3CampaignNative103 : True",
        locked_statement_structured: {},
        statement_hash: statementHashValue,
        dependencies: [],
        assumptions: [],
        status: "candidate_selected"
      }
    ],
    accepted_artifacts: [],
    blockers: [],
    next_actions: ["run final global Lean replay and claim promotion gate"],
    created_at: now,
    updated_at: now
  };
}

try {
  const { project } = initProject({ name: "Goal 3 Task 103 Campaign Native Packaging", root_path: projectRoot });
  const campaignId = "CAM-0103";
  const theoremName = "MathResearch.Goal3CampaignNative103";
  const claimStatement = `${theoremName} : True`;
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: claimStatement,
    assumptions: [],
    domain: "logic",
    status: "conjectural",
    actor: "goal3-task103"
  });
  assert.equal(claim.statement_hash, statementHash(claimStatement));
  installFakeLeanAndLake(theoremName);

  const leanRootRel = ".comath/lean/task103-campaign-native";
  writeProjectFile(
    `${leanRootRel}/MathResearch/Target.lean`,
    [
      "namespace MathResearch",
      "",
      "theorem Goal3CampaignNative103 : True := by",
      "  trivial",
      "",
      "#check Goal3CampaignNative103",
      "#print axioms Goal3CampaignNative103",
      "",
      "end MathResearch",
      ""
    ].join("\n")
  );
  writeProjectFile(
    `${leanRootRel}/Audit/TargetAudit.lean`,
    "import MathResearch.Target\n#check MathResearch.Goal3CampaignNative103\n#print axioms MathResearch.Goal3CampaignNative103\n"
  );
  writeJsonProjectFile(`${leanRootRel}/FormalSpec/formal_spec_lock.json`, {
    schema_version: "comath.formal_spec_lock.v2",
    binding_scope: "campaign",
    campaign_id: campaignId,
    claim_id: claim.id,
    namespace: "MathResearch",
    theorem_name: "Goal3CampaignNative103",
    theorem_header: "theorem Goal3CampaignNative103 : True",
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

  writeCampaign(projectRoot, campaignFixture(project.project_id, claim.id, claim.statement_hash), "goal3-task103");
  writeJsonProjectFile(`.comath/campaign/${campaignId}/final_replay_request.json`, {
    schema_version: "comath.campaign_final_global_replay_request.v1",
    claim_id: claim.id,
    packaging_scope: "campaign",
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
        theorem_name: "Goal3CampaignNative103",
        namespace: "MathResearch",
        normalized_statement: claimStatement,
        locked_statement_hash: claim.statement_hash
      }
    }
  });

  const result = await tickCampaign({
    project_root: projectRoot,
    campaign_id: campaignId,
    actor: "goal3-task103"
  });

  assert.equal(result.campaign.current_stage, "completed_formal_proof", JSON.stringify(result.campaign.blockers, null, 2));
  assert.equal(result.campaign.status, "terminal");
  assert.equal(result.campaign.terminal_state, "completed_formal_proof");
  assert.equal(result.campaign.formal_replay_authority_passed, true);
  assert.equal(projectExternalV3TerminalState(result.campaign), "formal_proof_verified");

  const finalStage = result.campaign.stage_runs.at(-1);
  const packagingPath = finalStage.artifact_paths.find((path) => path.endsWith("final_authority_packaging_report_v3.json"));
  const bindingPath = finalStage.artifact_paths.find((path) => path.endsWith("derived_final_authority_bindings_v3.json"));
  assert.equal(packagingPath, `.comath/campaign/${campaignId}/final_authority_packaging_report_v3.json`);
  assert.equal(bindingPath, `.comath/campaign/${campaignId}/derived_final_authority_bindings_v3.json`);
  assert.ok(finalStage.artifact_paths.every((path) => !path.includes("/positive_matrix/")), JSON.stringify(finalStage.artifact_paths));

  const packaging = readJsonProjectFile(packagingPath);
  assert.equal(packaging.schema_version, "comath.final_authority_packaging.v3");
  assert.equal(packaging.binding_scope, "campaign");
  assert.equal(packaging.campaign_id, campaignId);
  assert.equal(packaging.task_id, undefined);
  assert.equal(packaging.final_evidence_status, "verified_final_authority_evidence");
  assert.equal(packaging.proof_authority, "lean_kernel_clean_replay");

  const binding = readJsonProjectFile(bindingPath);
  assert.equal(binding.schema_version, "comath.final_authority_derived_bindings.v3");
  assert.equal(binding.binding_scope, "campaign");
  assert.equal(binding.campaign_id, campaignId);
  assert.equal(binding.task_id, undefined);
  assert.equal(binding.claim_id, claim.id);

  const promotedClaim = getClaim(projectRoot, project.project_id, claim.id);
  assert.equal(promotedClaim?.status, "formally_checked");

  const exported = exportCampaignGoalModeEvidence({
    project_root: projectRoot,
    campaign_id: campaignId,
    actor: "goal3-task103"
  });
  assert.equal(exported.export_manifest.evidence_pack_ready, true);
  assert.equal(exported.export_manifest.proof_authority, "lean_kernel_clean_replay");
} finally {
  process.env.PATH = oldPath;
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 103 campaign-native final authority packaging test passed.");
