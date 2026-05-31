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

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task104-accepted-replay-target-"));
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
    "@echo off\r\necho Lean (version 4.23.0, x86_64-pc-windows-msvc, commit task104)\r\nexit /b 0\r\n",
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
  writeFileSync(leanSh, "#!/bin/sh\necho 'Lean (version 4.23.0, x86_64-unknown-linux-gnu, commit task104)'\n", "utf8");
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
    campaign_id: "CAM-0104",
    project_id: projectId,
    root_claim_id: claimId,
    user_goal: "Task104 final_global_replay must assemble replay request from accepted campaign artifacts",
    current_stage: "final_global_replay",
    status: "running",
    strict_mode: true,
    stage_runs: [],
    open_obligations: [
      {
        obligation_id: "PO-0104",
        claim_id: claimId,
        locked_statement_nl: "MathResearch.Goal3AcceptedReplayTarget104 : True",
        locked_statement_structured: {},
        statement_hash: statementHashValue,
        dependencies: [],
        assumptions: [],
        status: "candidate_selected"
      }
    ],
    accepted_artifacts: acceptedArtifacts,
    blockers: [],
    next_actions: ["run final global Lean replay and claim promotion gate"],
    created_at: now,
    updated_at: now
  };
}

try {
  const { project } = initProject({ name: "Goal 3 Task 104 Accepted Replay Target", root_path: projectRoot });
  const campaignId = "CAM-0104";
  const theoremName = "MathResearch.Goal3AcceptedReplayTarget104";
  const claimStatement = `${theoremName} : True`;
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: claimStatement,
    assumptions: [],
    domain: "logic",
    status: "conjectural",
    actor: "goal3-task104"
  });
  assert.equal(claim.statement_hash, statementHash(claimStatement));
  installFakeLeanAndLake(theoremName);

  const leanRootRel = ".comath/lean/task104-accepted-target";
  writeProjectFile(
    `${leanRootRel}/MathResearch/Target.lean`,
    [
      "namespace MathResearch",
      "",
      "theorem Goal3AcceptedReplayTarget104 : True := by",
      "  trivial",
      "",
      "#check Goal3AcceptedReplayTarget104",
      "#print axioms Goal3AcceptedReplayTarget104",
      "",
      "end MathResearch",
      ""
    ].join("\n")
  );
  writeProjectFile(
    `${leanRootRel}/Audit/TargetAudit.lean`,
    "import MathResearch.Target\n#check MathResearch.Goal3AcceptedReplayTarget104\n#print axioms MathResearch.Goal3AcceptedReplayTarget104\n"
  );
  writeJsonProjectFile(`${leanRootRel}/FormalSpec/formal_spec_lock.json`, {
    schema_version: "comath.formal_spec_lock.v2",
    binding_scope: "campaign",
    campaign_id: campaignId,
    claim_id: claim.id,
    namespace: "MathResearch",
    theorem_name: "Goal3AcceptedReplayTarget104",
    theorem_header: "theorem Goal3AcceptedReplayTarget104 : True",
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

  const replayTargetRel = `.comath/campaign/${campaignId}/workstreams/WS-0104/final_replay_target.json`;
  writeJsonProjectFile(replayTargetRel, {
    schema_version: "comath.campaign_final_replay_target.v1",
    campaign_id: campaignId,
    claim_id: claim.id,
    obligation_id: "PO-0104",
    artifact_role: "final_replay_request_source",
    proof_authority: "none",
    can_promote_claim: false,
    replay_request: {
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
          theorem_name: "Goal3AcceptedReplayTarget104",
          namespace: "MathResearch",
          normalized_statement: claimStatement,
          locked_statement_hash: claim.statement_hash
        }
      }
    }
  });
  const replayTargetArtifact = await importArtifact({
    projectRoot,
    project_id: project.project_id,
    source_path: replayTargetRel,
    kind: "code",
    actor: "goal3-task104"
  });

  assert.equal(existsSync(join(projectRoot, `.comath/campaign/${campaignId}/final_replay_request.json`)), false);
  writeCampaign(projectRoot, campaignFixture(project.project_id, claim.id, claim.statement_hash, [replayTargetArtifact]), "goal3-task104");

  const result = await tickCampaign({
    project_root: projectRoot,
    campaign_id: campaignId,
    actor: "goal3-task104"
  });

  assert.equal(result.campaign.current_stage, "completed_formal_proof", JSON.stringify(result.campaign.blockers, null, 2));
  assert.equal(result.campaign.status, "terminal");
  assert.equal(result.campaign.terminal_state, "completed_formal_proof");
  assert.equal(result.campaign.formal_replay_authority_passed, true);
  assert.equal(projectExternalV3TerminalState(result.campaign, { projectRoot }), "formal_proof_verified");

  const finalStage = result.campaign.stage_runs.at(-1);
  assert.ok(finalStage.artifact_paths.includes(`.comath/campaign/${campaignId}/assembled_final_replay_request.json`));
  assert.equal(finalStage.artifact_paths.some((path) => path.includes("/positive_matrix/")), false);

  const assembled = readJsonProjectFile(`.comath/campaign/${campaignId}/assembled_final_replay_request.json`);
  assert.equal(assembled.schema_version, "comath.campaign_final_replay_request_assembly.v1");
  assert.equal(assembled.source_artifact_id, replayTargetArtifact.id);
  assert.equal(assembled.source_artifact_sha256, replayTargetArtifact.sha256);
  assert.equal(assembled.replay_request.packaging_scope, "campaign");
  assert.equal(assembled.proof_authority, "none");
  assert.equal(assembled.can_promote_claim, false);

  const promotedClaim = getClaim(projectRoot, project.project_id, claim.id);
  assert.equal(promotedClaim?.status, "formally_checked");

  const exported = exportCampaignGoalModeEvidence({
    project_root: projectRoot,
    campaign_id: campaignId,
    actor: "goal3-task104"
  });
  assert.equal(exported.export_manifest.evidence_pack_ready, true);
  assert.equal(exported.export_manifest.proof_authority, "lean_kernel_clean_replay");
} finally {
  process.env.PATH = oldPath;
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 104 accepted-artifact final replay request test passed.");
