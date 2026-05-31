import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import {
  exportCampaignGoalModeEvidence,
  getClaim,
  initProject,
  projectExternalV3TerminalState,
  projectGoalModeTerminalState,
  registerClaim,
  statementHash,
  tickCampaign,
  withExternalV3TerminalState,
  writeCampaign
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task102-final-global-replay-"));
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

function installFakeLeanAndLake(theoremName) {
  const bin = join(projectRoot, ".comath", "fake-bin");
  mkdirSync(bin, { recursive: true });
  writeFileSync(
    join(bin, "lean.cmd"),
    "@echo off\r\necho Lean (version 4.23.0, x86_64-pc-windows-msvc, commit task102)\r\nexit /b 0\r\n",
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
  writeFileSync(leanSh, "#!/bin/sh\necho 'Lean (version 4.23.0, x86_64-unknown-linux-gnu, commit task102)'\n", "utf8");
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
    campaign_id: "CAM-0102",
    project_id: projectId,
    root_claim_id: claimId,
    user_goal: "Task102 live final_global_replay must produce Lean Authority v3 evidence",
    current_stage: "final_global_replay",
    status: "running",
    strict_mode: true,
    stage_runs: [],
    open_obligations: [
      {
        obligation_id: "PO-0102",
        claim_id: claimId,
        locked_statement_nl: "MathResearch.Goal3Positive100 : True",
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
  const { project } = initProject({ name: "Goal 3 Task 102 Final Global Replay", root_path: projectRoot });
  const taskId = "PM-100";
  const theoremName = "MathResearch.Goal3Positive100";
  const claimStatement = `${theoremName} : True`;
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: claimStatement,
    assumptions: [],
    domain: "logic",
    status: "conjectural",
    actor: "goal3-task102"
  });
  assert.equal(claim.statement_hash, statementHash(claimStatement));
  installFakeLeanAndLake(theoremName);

  const leanRootRel = ".comath/lean/task102-live";
  writeProjectFile(
    `${leanRootRel}/MathResearch/Target.lean`,
    [
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
  writeProjectFile(
    `${leanRootRel}/Audit/TargetAudit.lean`,
    "import MathResearch.Target\n#check MathResearch.Goal3Positive100\n#print axioms MathResearch.Goal3Positive100\n"
  );
  writeJsonProjectFile(`${leanRootRel}/FormalSpec/formal_spec_lock.json`, {
    schema_version: "comath.formal_spec_lock.v2",
    task_id: taskId,
    claim_id: claim.id,
    namespace: "MathResearch",
    theorem_name: "Goal3Positive100",
    theorem_header: "theorem Goal3Positive100 : True",
    statement_hash: claim.statement_hash,
    proof_authority: "none"
  });
  writeJsonProjectFile(`${leanRootRel}/FormalSpec/assumption_ledger.json`, {
    schema_version: "comath.assumption_ledger.v1",
    task_id: taskId,
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

  writeCampaign(projectRoot, campaignFixture(project.project_id, claim.id, claim.statement_hash), "goal3-task102");
  writeJsonProjectFile(".comath/campaign/CAM-0102/final_replay_request.json", {
    schema_version: "comath.campaign_final_global_replay_request.v1",
    task_id: taskId,
    claim_id: claim.id,
    lean_project: {
      lean_root: leanRootRel,
      theorem_file_rel: "MathResearch/Target.lean",
      formal_spec_file: "FormalSpec/formal_spec_lock.json",
      assumption_ledger_file: "FormalSpec/assumption_ledger.json",
      audit_file_rel: "Audit/TargetAudit.lean",
      lakefile: "lakefile.lean",
      toolchain_file: "lean-toolchain",
      theorem_name: theoremName,
      theorem_family_id: taskId,
      canonical_proposition: "True",
      build_targets: ["MathResearch"],
      replay_command: "lake build MathResearch",
      primary_dependency: "Mathlib",
      formal_spec: {
        claim_id: claim.id,
        theorem_name: "Goal3Positive100",
        namespace: "MathResearch",
        normalized_statement: claimStatement,
        locked_statement_hash: claim.statement_hash
      }
    }
  });

  const result = await tickCampaign({
    project_root: projectRoot,
    campaign_id: "CAM-0102",
    actor: "goal3-task102"
  });

  assert.equal(result.campaign.current_stage, "completed_formal_proof", JSON.stringify(result.campaign.blockers, null, 2));
  assert.equal(result.campaign.status, "terminal");
  assert.equal(result.campaign.terminal_state, "completed_formal_proof");
  assert.equal(result.campaign.formal_replay_authority_passed, true);
  assert.equal(
    result.campaign.formal_replay_authority_evidence?.schema_version,
    "comath.formal_replay_authority_evidence.v1"
  );
  assert.equal(result.campaign.formal_replay_authority_evidence?.proof_authority, "lean_kernel_clean_replay");
  assert.equal(projectExternalV3TerminalState(result.campaign), "formal_proof_verified");
  assert.equal(projectGoalModeTerminalState(result.campaign), "formal_replay_passed");
  assert.equal(withExternalV3TerminalState(result.campaign).external_v3_terminal_state, "formal_proof_verified");

  const promotedClaim = getClaim(projectRoot, project.project_id, claim.id);
  assert.equal(promotedClaim?.status, "formally_checked");

  const exported = exportCampaignGoalModeEvidence({
    project_root: projectRoot,
    campaign_id: "CAM-0102",
    actor: "goal3-task102"
  });
  assert.equal(exported.export_manifest.evidence_pack_ready, true);
  assert.equal(exported.export_manifest.proof_authority, "lean_kernel_clean_replay");

  const noRequestProjectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task102-no-request-"));
  try {
    const { project: noRequestProject } = initProject({
      name: "Goal 3 Task 102 No Replay Request",
      root_path: noRequestProjectRoot
    });
    const noRequestClaim = registerClaim(noRequestProjectRoot, {
      project_id: noRequestProject.project_id,
      statement: claimStatement,
      assumptions: [],
      domain: "logic",
      status: "conjectural",
      actor: "goal3-task102"
    });
    writeCampaign(
      noRequestProjectRoot,
      campaignFixture(noRequestProject.project_id, noRequestClaim.id, noRequestClaim.statement_hash),
      "goal3-task102"
    );
    const blocked = await tickCampaign({
      project_root: noRequestProjectRoot,
      campaign_id: "CAM-0102",
      actor: "goal3-task102"
    });
    assert.equal(blocked.campaign.current_stage, "blocked");
    assert.equal(blocked.campaign.terminal_state, "blocked_with_replayable_reason");
    assert.equal(blocked.campaign.formal_replay_authority_passed, false);
    assert.notEqual(projectExternalV3TerminalState(blocked.campaign), "formal_proof_verified");
  } finally {
    rmSync(noRequestProjectRoot, { recursive: true, force: true });
  }
} finally {
  process.env.PATH = oldPath;
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 102 final global replay authority producer test passed.");
