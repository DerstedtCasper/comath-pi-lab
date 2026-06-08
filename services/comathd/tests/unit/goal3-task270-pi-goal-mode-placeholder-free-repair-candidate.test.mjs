import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { startCampaign, tickCampaign } from "../../dist/index.js";

const root = mkdtempSync(join(tmpdir(), "comath-goal3-task270-placeholder-free-repair-"));

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(root, relativePath), "utf8"));
}

function stripLineComments(text) {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const index = line.indexOf("--");
      return index >= 0 ? line.slice(0, index) : line;
    })
    .join("\n");
}

function hasLeanSorry(text) {
  return /(?:^|[^A-Za-z0-9_'])sorry(?:[^A-Za-z0-9_']|$)/u.test(stripLineComments(text));
}

function hasLeanHole(text) {
  return /(?:^|[^A-Za-z0-9_'])\?[A-Za-z_][A-Za-z0-9_']*/u.test(stripLineComments(text));
}

function writeFixtures(projectRoot) {
  mkdirSync(join(projectRoot, "papers"), { recursive: true });
  mkdirSync(join(projectRoot, "lean"), { recursive: true });
  writeFileSync(
    join(projectRoot, "papers", "source.md"),
    [
      "# Source",
      "",
      "Theorem. The locked Lean target is deliberately tiny; this is a pipeline smoke, not GA proof breadth.",
      "Proof sketch. LeanRunner must still be the only checker.",
      ""
    ].join("\n")
  );
  writeFileSync(join(projectRoot, "lean", "Main.lean"), "theorem goal3_task270_source : True := by trivial\n");
}

function installPassingFakeLeanLakeCommands(projectRoot, leanVersion = "9.99.9") {
  const binDir = join(projectRoot, "fake-bin");
  const logPath = join(projectRoot, "fake-leanrunner.jsonl");
  mkdirSync(binDir, { recursive: true });
  const previousPath = process.env.PATH;
  const previousLog = process.env.COMATH_TASK270_RUN_LOG;
  process.env.COMATH_TASK270_RUN_LOG = logPath;

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
        "echo %CD%^|%*>>\"%COMATH_TASK270_RUN_LOG%\"",
        "if not exist LeanCandidate.lean exit /b 3",
        "if not exist lean-toolchain exit /b 4",
        "findstr /C:\"?comath_repair_placeholder\" LeanCandidate.lean >nul && exit /b 5",
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
        "printf '%s|%s\\n' \"$PWD\" \"$*\" >> \"$COMATH_TASK270_RUN_LOG\"",
        "[ -f LeanCandidate.lean ] || exit 3",
        "[ -f lean-toolchain ] || exit 4",
        "grep -q '?comath_repair_placeholder' LeanCandidate.lean && exit 5",
        "exit 0",
        ""
      ].join("\n")
    );
    chmodSync(leanPath, 0o755);
    chmodSync(lakePath, 0o755);
  }

  process.env.PATH = `${binDir}${delimiter}${previousPath ?? ""}`;
  return {
    logPath,
    restore: () => {
      if (previousPath === undefined) {
        delete process.env.PATH;
      } else {
        process.env.PATH = previousPath;
      }
      if (previousLog === undefined) {
        delete process.env.COMATH_TASK270_RUN_LOG;
      } else {
        process.env.COMATH_TASK270_RUN_LOG = previousLog;
      }
    }
  };
}

async function advanceTo(campaignId, targetStage) {
  let body;
  for (let index = 0; index < 14; index += 1) {
    body = await tickCampaign({ project_root: root, campaign_id: campaignId, actor: "goal3-task270" });
    assert.notEqual(body.campaign.status, "blocked");
    assert.notEqual(body.campaign.status, "terminal");
    if (body.campaign.current_stage === targetStage) {
      return body;
    }
  }
  assert.fail(`campaign did not reach ${targetStage}`);
}

let restoreFakeCommands = () => {};

try {
  writeFixtures(root);
  const started = startCampaign({
    project_root: root,
    project_name: "Goal 3 Task 270 Placeholder-Free Repair Candidate",
    user_goal:
      "Prove theorem goal3_task270 : True := by sorry while preserving the exact theorem boundary and using LeanRunner for checking.",
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
    actor: "goal3-task270"
  });
  const campaignId = started.campaign.campaign_id;

  await advanceTo(campaignId, "candidate_generation");
  await tickCampaign({ project_root: root, campaign_id: campaignId, actor: "goal3-task270" });
  const verified = await tickCampaign({ project_root: root, campaign_id: campaignId, actor: "goal3-task270" });
  assert.equal(verified.campaign.current_stage, "candidate_arbitration");

  const firstReportRel = `.comath/campaign/${campaignId}/lean_candidate_attempt_check_report.json`;
  const firstReport = readJson(firstReportRel);
  assert.equal(firstReport.candidates_requiring_repair, 8);
  for (const check of firstReport.per_candidate_checks) {
    assert.equal(check.result, "repair_required");
    assert.equal(check.has_sorry, true);
    assert.equal(check.has_lean_theorem_declaration, true);
    assert.equal(check.has_repair_placeholder, false);
    assert.equal(check.has_lean_hole, false);
  }

  const repair = await tickCampaign({ project_root: root, campaign_id: campaignId, actor: "goal3-task270" });
  assert.equal(repair.campaign.current_stage, "repair");
  const reingested = await tickCampaign({ project_root: root, campaign_id: campaignId, actor: "goal3-task270" });
  assert.equal(reingested.campaign.current_stage, "candidate_verification");
  assert.equal(reingested.repair_execution.repaired_placeholder_free_candidate_count, 8);

  const repairExecutionRel = `.comath/campaign/${campaignId}/lean_candidate_attempt_repair_execution.json`;
  const repairExecution = readJson(repairExecutionRel);
  assert.equal(repairExecution.repaired_placeholder_free_candidate_count, 8);
  assert.equal(repairExecution.repaired_attempts_ready_for_preflight, 8);
  for (const item of repairExecution.per_candidate_executions) {
    assert.equal(item.placeholder_free_repair_materialized, true);
    assert.equal(item.repair_placeholder_present, false);
    assert.equal(item.repaired_has_sorry, false);
    const repairedText = readFileSync(join(root, item.repaired_lean_file_path), "utf8");
    assert.equal(hasLeanSorry(repairedText), false);
    assert.equal(hasLeanHole(repairedText), false);
    assert.equal(repairedText.includes("?comath_repair_placeholder"), false);
    assert.match(stripLineComments(repairedText), /theorem goal3_task270\s*:\s*True\s*:=\s*by\s+trivial/u);
  }

  const ready = await tickCampaign({ project_root: root, campaign_id: campaignId, actor: "goal3-task270" });
  assert.equal(ready.campaign.current_stage, "candidate_verification");
  const readyReport = readJson(firstReportRel);
  assert.equal(readyReport.candidates_ready_for_lean_runner, 8);
  assert.equal(readyReport.candidates_requiring_repair, 0);
  for (const check of readyReport.per_candidate_checks) {
    assert.equal(check.result, "ready_for_lean_runner");
    assert.equal(check.has_sorry, false);
    assert.equal(check.has_repair_placeholder, false);
    assert.equal(check.has_lean_hole, false);
    assert.equal(check.has_lean_theorem_declaration, true);
    assert.ok(check.repair_actions.includes("run_service_owned_lean_runner"));
  }

  const fakeCommands = installPassingFakeLeanLakeCommands(root);
  restoreFakeCommands = fakeCommands.restore;
  const executed = await tickCampaign({
    project_root: root,
    campaign_id: campaignId,
    actor: "goal3-task270",
    lean_candidate_attempt_runner: {
      leanToolchain: "leanprover/lean4:v9.99.9"
    }
  });
  restoreFakeCommands();
  restoreFakeCommands = () => {};

  assert.equal(executed.campaign.current_stage, "candidate_arbitration");
  assert.equal(executed.lean_candidate_attempt_leanrunner_execution.execution_result, "kernel_checked_candidates_available");
  assert.equal(executed.lean_candidate_attempt_leanrunner_execution.kernel_checked_candidate_count, 8);
  assert.equal(executed.lean_candidate_attempt_leanrunner_execution.rejected_candidate_count, 0);
  assert.equal(executed.lean_candidate_attempt_leanrunner_execution.lean_runner_invocations, 8);
  assert.equal(existsSync(fakeCommands.logPath), true);

  const arbitrated = await tickCampaign({ project_root: root, campaign_id: campaignId, actor: "goal3-task270" });
  assert.equal(arbitrated.campaign.current_stage, "refutation_red_team");
  assert.equal(arbitrated.gate.result, "pass");
  assert.equal(arbitrated.ensemble.decision.selection_mode, "evidence_weighted");
  assert.equal(typeof arbitrated.ensemble.decision.selected_candidate_id, "string");

  const fallbackStarted = startCampaign({
    project_root: root,
    project_name: "Goal 3 Task 270 Placeholder Repair Routing",
    user_goal:
      "Prove theorem goal3_task270_fallback : 1 = 2 := by sorry while preserving the exact theorem boundary and keeping placeholders out of LeanRunner.",
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
    actor: "goal3-task270"
  });
  const fallbackCampaignId = fallbackStarted.campaign.campaign_id;
  await advanceTo(fallbackCampaignId, "candidate_generation");
  await tickCampaign({ project_root: root, campaign_id: fallbackCampaignId, actor: "goal3-task270" });
  await tickCampaign({ project_root: root, campaign_id: fallbackCampaignId, actor: "goal3-task270" });
  const fallbackRepair = await tickCampaign({ project_root: root, campaign_id: fallbackCampaignId, actor: "goal3-task270" });
  assert.equal(fallbackRepair.campaign.current_stage, "repair");
  const fallbackReingested = await tickCampaign({ project_root: root, campaign_id: fallbackCampaignId, actor: "goal3-task270" });
  assert.equal(fallbackReingested.campaign.current_stage, "candidate_verification");
  assert.equal(fallbackReingested.repair_execution.repaired_placeholder_free_candidate_count, 0);
  assert.equal(
    fallbackReingested.repair_execution.per_candidate_executions.every((item) => item.repair_placeholder_present === true),
    true
  );

  const fallbackChecked = await tickCampaign({ project_root: root, campaign_id: fallbackCampaignId, actor: "goal3-task270" });
  assert.equal(fallbackChecked.campaign.current_stage, "candidate_arbitration");
  const fallbackReport = readJson(`.comath/campaign/${fallbackCampaignId}/lean_candidate_attempt_check_report.json`);
  assert.equal(fallbackReport.candidates_requiring_repair, 8);
  assert.equal(fallbackReport.candidates_ready_for_lean_runner, 0);
  assert.equal(
    fallbackReport.per_candidate_checks.every(
      (check) =>
        check.result === "repair_required" &&
        check.has_sorry === false &&
        check.has_repair_placeholder === true &&
        check.has_lean_hole === true &&
        check.repair_actions.includes("replace_placeholder_with_kernel_checked_proof_term") &&
        !check.repair_actions.includes("run_service_owned_lean_runner")
    ),
    true
  );

  const fallbackRouted = await tickCampaign({ project_root: root, campaign_id: fallbackCampaignId, actor: "goal3-task270" });
  assert.equal(fallbackRouted.campaign.current_stage, "repair");
  assert.equal(fallbackRouted.blocker, "goal_mode_candidate_attempt_repair_required");
  const fallbackBatch = readJson(`.comath/campaign/${fallbackCampaignId}/lean_candidate_attempt_repair_batch.json`);
  assert.equal(fallbackBatch.repair_task_count, 8);
  const fallbackTasks = fallbackBatch.repair_task_paths.map((taskPath) => readJson(taskPath));
  assert.equal(
    fallbackTasks.every(
      (task) =>
        task.source_check.has_sorry === false &&
        task.source_check.has_repair_placeholder === true &&
        task.source_check.has_lean_hole === true &&
        task.lean_runner_invocation_allowed === false
    ),
    true
  );
} finally {
  if (typeof restoreFakeCommands === "function") {
    restoreFakeCommands();
  }
  rmSync(root, { recursive: true, force: true });
}

console.log("Goal 3 Task 270 Pi goal-mode placeholder-free repair candidate test passed.");
