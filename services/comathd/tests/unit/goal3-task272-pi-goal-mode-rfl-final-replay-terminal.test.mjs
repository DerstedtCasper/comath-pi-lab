import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import {
  exportCampaignGoalModeEvidence,
  getClaim,
  projectExternalV3TerminalState,
  startCampaign,
  tickCampaign
} from "../../dist/index.js";

const root = mkdtempSync(join(tmpdir(), "comath-goal3-task272-rfl-final-replay-"));
const previousPath = process.env.PATH;
const previousLog = process.env.COMATH_TASK272_RUN_LOG;

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(root, relativePath), "utf8"));
}

function writeFixtures(projectRoot) {
  mkdirSync(join(projectRoot, "papers"), { recursive: true });
  mkdirSync(join(projectRoot, "lean"), { recursive: true });
  writeFileSync(
    join(projectRoot, "papers", "source.md"),
    [
      "# Source",
      "",
      "Theorem. This is a bounded definitional-equality repair smoke, not a broad proof benchmark.",
      "Proof sketch. CoMath may propose `rfl`, but final authority must still come from Lean clean replay.",
      ""
    ].join("\n")
  );
  writeFileSync(join(projectRoot, "lean", "Main.lean"), "theorem goal3_task272_source : 1 = 1 := by rfl\n");
}

function installPassingFakeLeanLakeCommands(projectRoot, leanVersion = "9.99.9") {
  const binDir = join(projectRoot, "fake-bin");
  const logPath = join(projectRoot, "fake-leanrunner.jsonl");
  mkdirSync(binDir, { recursive: true });
  process.env.COMATH_TASK272_RUN_LOG = logPath;

  if (process.platform === "win32") {
    writeFileSync(
      join(binDir, "lean.cmd"),
      ["@echo off", `echo Lean (version ${leanVersion}, x86_64-pc-windows-msvc)`, "exit /b 0", ""].join("\r\n")
    );
    writeFileSync(
      join(binDir, "lake.cmd"),
      [
        "@echo off",
        "if \"%1\"==\"--version\" (",
        "  echo Lake version 5.0.0-src+abcdef",
        "  exit /b 0",
        ")",
        "echo %CD%^|%*>>\"%COMATH_TASK272_RUN_LOG%\"",
        "echo MathResearch.goal3_task272 : 1 = 1",
        "echo MathResearch.goal3_task272 does not depend on any axioms",
        "echo goal3_task272 : 1 = 1",
        "echo goal3_task272 does not depend on any axioms",
        "exit /b 0",
        ""
      ].join("\r\n")
    );
  } else {
    const leanPath = join(binDir, "lean");
    const lakePath = join(binDir, "lake");
    writeFileSync(leanPath, `#!/bin/sh\necho 'Lean (version ${leanVersion}, x86_64-unknown-linux-gnu)'\nexit 0\n`);
    writeFileSync(
      lakePath,
      [
        "#!/bin/sh",
        "if [ \"$1\" = \"--version\" ]; then",
        "  echo 'Lake version 5.0.0-src+abcdef'",
        "  exit 0",
        "fi",
        "printf '%s|%s\\n' \"$PWD\" \"$*\" >> \"$COMATH_TASK272_RUN_LOG\"",
        "echo 'MathResearch.goal3_task272 : 1 = 1'",
        "echo 'MathResearch.goal3_task272 does not depend on any axioms'",
        "echo 'goal3_task272 : 1 = 1'",
        "echo 'goal3_task272 does not depend on any axioms'",
        "exit 0",
        ""
      ].join("\n")
    );
    chmodSync(leanPath, 0o755);
    chmodSync(lakePath, 0o755);
  }

  process.env.PATH = `${binDir}${delimiter}${previousPath ?? ""}`;
  return logPath;
}

async function tickUntilTerminal(campaignId) {
  let body;
  for (let index = 0; index < 32; index += 1) {
    body = await tickCampaign({
      project_root: root,
      campaign_id: campaignId,
      actor: "goal3-task272",
      lean_candidate_attempt_runner: {
        leanToolchain: "leanprover/lean4:v9.99.9"
      }
    });
    if (body.campaign.status === "terminal") {
      return body;
    }
  }
  assert.fail(`campaign did not reach a terminal state; last stage was ${body?.campaign.current_stage}`);
}

try {
  writeFixtures(root);
  const logPath = installPassingFakeLeanLakeCommands(root);
  const started = startCampaign({
    project_root: root,
    project_name: "Goal 3 Task 272 Rfl Final Replay Terminal",
    user_goal:
      "Prove theorem goal3_task272 : 1 = 1 := by sorry while preserving the exact theorem boundary and requiring final clean replay.",
    domain: "formalization",
    mode: "goal",
    paper_paths: ["papers/source.md"],
    workspace_refs: ["lean"],
    budget: "frontier",
    goal_mode_policy: {
      mode: "goal",
      terminal_states: [
        "formal_replay_passed",
        "formal_counterexample_confirmed",
        "needs_user_statement_disambiguation",
        "blocked_with_replayable_certificate",
        "budget_exhausted_with_resume_state"
      ],
      require_user_confirmation_for_statement_lock: true,
      resume_enabled: true
    },
    strict_mode: true,
    actor: "goal3-task272"
  });

  const campaignId = started.campaign.campaign_id;
  const result = await tickUntilTerminal(campaignId);

  assert.equal(result.campaign.current_stage, "completed_formal_proof", JSON.stringify(result.campaign.blockers, null, 2));
  assert.equal(result.campaign.formal_replay_authority_passed, true);
  assert.equal(projectExternalV3TerminalState(result.campaign, { projectRoot: root }), "formal_proof_verified");
  assert.equal(getClaim(root, started.campaign.project_id, started.campaign.root_claim_id)?.status, "formally_checked");

  const repairExecution = readJson(`.comath/campaign/${campaignId}/lean_candidate_attempt_repair_execution.json`);
  assert.equal(repairExecution.repaired_placeholder_free_candidate_count, 8);
  assert.equal(
    repairExecution.per_candidate_executions.every(
      (item) =>
        item.placeholder_free_repair_materialized === true &&
        item.placeholder_free_repair_strategy === "locked_reflexive_equality_rfl" &&
        item.repair_placeholder_present === false
    ),
    true
  );

  const decision = readJson(`.comath/campaign/${campaignId}/ensembles/lemma_sprint/PO-0001/decision.json`);
  const candidates = readJson(`.comath/campaign/${campaignId}/ensembles/lemma_sprint/PO-0001/candidates.json`);
  const selected = candidates.find((candidate) => candidate.candidate_id === decision.selected_candidate_id);
  assert.ok(selected);
  const manifest = readJson(selected.manifest_path);
  const descriptorArtifact = manifest.artifacts.find((artifact) => artifact.kind === "candidate_replay_project_descriptor");
  assert.equal(descriptorArtifact.path, "final_replay_project/candidate_replay_project_descriptor.json");
  const descriptor = readJson(`${selected.workspace_path}/${descriptorArtifact.path}`);
  assert.equal(descriptor.lean_project.formal_spec.normalized_statement, "MathResearch.goal3_task272 : 1 = 1");

  const targetRel = `${selected.workspace_path}/final_replay_project/MathResearch/Target.lean`;
  const target = readFileSync(join(root, targetRel), "utf8");
  assert.match(target, /theorem goal3_task272\s*:\s*1\s*=\s*1\s*:=\s*by\s+rfl/u);
  assert.equal(target.includes("sorry"), false);
  assert.equal(target.includes("?comath_repair_placeholder"), false);

  const finalReplayManifest = readJson(`.comath/evidence/${started.campaign.root_claim_id}/lean/final_replay_manifest_v3.json`);
  assert.equal(finalReplayManifest.result, "pass");
  assert.equal(finalReplayManifest.runner, "comathd.LeanAuthority");

  const exported = exportCampaignGoalModeEvidence({
    project_root: root,
    campaign_id: campaignId,
    actor: "goal3-task272"
  });
  assert.equal(exported.export_manifest.evidence_pack_ready, true);
  assert.equal(exported.export_manifest.proof_authority, "lean_kernel_clean_replay");
  assert.equal(existsSync(logPath), true);
} finally {
  process.env.PATH = previousPath;
  if (previousLog === undefined) {
    delete process.env.COMATH_TASK272_RUN_LOG;
  } else {
    process.env.COMATH_TASK272_RUN_LOG = previousLog;
  }
  rmSync(root, { recursive: true, force: true });
}

console.log("Goal 3 Task 272 Pi goal-mode rfl final replay terminal test passed.");
