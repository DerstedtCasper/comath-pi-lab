import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { startCampaign, tickCampaign } from "../../dist/index.js";

const root = mkdtempSync(join(tmpdir(), "comath-goal3-task268-repair-hint-bundle-"));

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(root, relativePath), "utf8"));
}

function writeFixtures(projectRoot) {
  const markdownPaper = join(projectRoot, "papers", "source.md");
  const texAttachment = join(projectRoot, "notes", "idea.tex");
  const workspaceRoot = join(projectRoot, "lean");
  mkdirSync(join(projectRoot, "papers"), { recursive: true });
  mkdirSync(join(projectRoot, "notes"), { recursive: true });
  mkdirSync(workspaceRoot, { recursive: true });
  writeFileSync(
    markdownPaper,
    [
      "# Source",
      "",
      "Theorem. Failed Lean diagnostics should guide another repair pass.",
      "Proof sketch. The hints here are planning material only.",
      ""
    ].join("\n")
  );
  writeFileSync(
    texAttachment,
    ["\\begin{lemma}\\label{lem:hint}", "A local TeX lemma used as non-authoritative repair context.", "\\end{lemma}", ""].join(
      "\n"
    )
  );
  writeFileSync(join(workspaceRoot, "Main.lean"), "theorem trivial_goal : True := by trivial\n");
}

function installFakeLeanLakeCommands(projectRoot, leanVersion = "9.99.9") {
  const binDir = join(projectRoot, "fake-bin");
  mkdirSync(binDir, { recursive: true });
  const previousPath = process.env.PATH;

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
        "echo unsolved goals 1>&2",
        "echo tactic failed, theorem-search/literature/CAS hints may help repair 1>&2",
        "exit /b 1",
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
        "echo 'unsolved goals' >&2",
        "echo 'tactic failed, theorem-search/literature/CAS hints may help repair' >&2",
        "exit 1",
        ""
      ].join("\n")
    );
    chmodSync(leanPath, 0o755);
    chmodSync(lakePath, 0o755);
  }

  process.env.PATH = `${binDir}${delimiter}${previousPath ?? ""}`;
  return () => {
    if (previousPath === undefined) {
      delete process.env.PATH;
    } else {
      process.env.PATH = previousPath;
    }
  };
}

async function advanceTo(campaignId, targetStage) {
  let body;
  for (let index = 0; index < 14; index += 1) {
    body = await tickCampaign({ project_root: root, campaign_id: campaignId, actor: "goal3-task268" });
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
    project_name: "Goal 3 Task 268 Repair Hint Bundle",
    user_goal: "Prove that failed Lean diagnostics can use non-authoritative theorem-search, literature, and CAS repair hints without changing theorem boundaries.",
    domain: "formalization",
    mode: "goal",
    paper_paths: ["papers/source.md"],
    attachments: ["notes/idea.tex"],
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
    actor: "goal3-task268"
  });
  const campaignId = started.campaign.campaign_id;

  await advanceTo(campaignId, "candidate_generation");
  await tickCampaign({ project_root: root, campaign_id: campaignId, actor: "goal3-task268" });
  await tickCampaign({ project_root: root, campaign_id: campaignId, actor: "goal3-task268" });
  await tickCampaign({ project_root: root, campaign_id: campaignId, actor: "goal3-task268" });
  await tickCampaign({ project_root: root, campaign_id: campaignId, actor: "goal3-task268" });
  await tickCampaign({ project_root: root, campaign_id: campaignId, actor: "goal3-task268" });

  restoreFakeCommands = installFakeLeanLakeCommands(root);
  const rejected = await tickCampaign({
    project_root: root,
    campaign_id: campaignId,
    actor: "goal3-task268",
    lean_candidate_attempt_runner: {
      leanToolchain: "leanprover/lean4:v9.99.9"
    }
  });
  restoreFakeCommands();
  restoreFakeCommands = () => {};

  assert.equal(rejected.campaign.status, "terminal");
  assert.equal(rejected.campaign.terminal_state, "blocked_with_replayable_reason");

  const resumed = await tickCampaign({ project_root: root, campaign_id: campaignId, actor: "goal3-task268" });
  assert.equal(resumed.campaign.status, "repairing");
  assert.equal(resumed.campaign.current_stage, "repair");

  const researchPlanRel = `.comath/campaign/${campaignId}/goal_mode_research_plan.json`;
  const adapterManifestRel = `.comath/campaign/${campaignId}/goal_mode_adapter_execution_manifest.json`;
  const localEvidenceRel = `.comath/campaign/${campaignId}/goal_mode_local_ingestion_evidence.json`;
  const feedbackRel = `.comath/campaign/${campaignId}/lean_candidate_attempt_repair_feedback_batch.json`;
  const hintBundleRel = `.comath/campaign/${campaignId}/lean_candidate_attempt_repair_hint_bundle.json`;
  const repairBatchRel = `.comath/campaign/${campaignId}/lean_candidate_attempt_repair_batch.json`;

  assert.equal(existsSync(join(root, hintBundleRel)), true);
  assert.equal(
    resumed.campaign.stage_runs.some((run) => run.artifact_paths.includes(hintBundleRel)),
    true,
    "terminal resume stage run should expose the repair hint bundle"
  );

  const hintBundle = readJson(hintBundleRel);
  assert.equal(hintBundle.schema_version, "comath.pi_goal_mode_lean_candidate_attempt_repair_hint_bundle.v1");
  assert.equal(hintBundle.source_repair_feedback_batch.path, feedbackRel);
  assert.equal(hintBundle.source_repair_feedback_batch.sha256, sha256File(join(root, feedbackRel)));
  assert.equal(hintBundle.source_goal_mode_research_plan.path, researchPlanRel);
  assert.equal(hintBundle.source_goal_mode_research_plan.sha256, sha256File(join(root, researchPlanRel)));
  assert.equal(hintBundle.source_goal_mode_adapter_execution_manifest.path, adapterManifestRel);
  assert.equal(hintBundle.source_goal_mode_adapter_execution_manifest.sha256, sha256File(join(root, adapterManifestRel)));
  assert.equal(hintBundle.source_goal_mode_local_ingestion_evidence.path, localEvidenceRel);
  assert.equal(hintBundle.source_goal_mode_local_ingestion_evidence.sha256, sha256File(join(root, localEvidenceRel)));
  assert.equal(hintBundle.proof_authority, "none");
  assert.equal(hintBundle.can_promote_claim, false);
  assert.equal(hintBundle.can_certify_ga, false);
  assert.equal(hintBundle.result_can_be_used_as_proof, false);
  assert.equal(hintBundle.network_execution_performed, false);
  assert.equal(JSON.stringify(hintBundle).includes(root), false, "hint bundle must not leak host root");

  const hintKinds = new Set(hintBundle.adapter_repair_hints.map((hint) => hint.kind));
  assert.equal(hintKinds.has("theorem_search"), true);
  assert.equal(hintKinds.has("retrieval"), true);
  assert.equal(hintKinds.has("computation"), true);
  assert.equal(hintKinds.has("proof_search_backend"), true);
  assert.equal(hintKinds.has("external_lean_repo"), true);
  assert.ok(hintBundle.adapter_repair_hints.length >= 5);
  for (const hint of hintBundle.adapter_repair_hints) {
    assert.equal(hint.proof_authority, "none");
    assert.equal(hint.can_promote_claim, false);
    assert.equal(hint.result_can_be_used_as_proof, false);
    assert.equal(hint.service_owned_execution_required, true);
    assert.match(hint.adapter_id, /:/);
  }

  assert.equal(hintBundle.per_candidate_hint_refs.length, 8);
  for (const ref of hintBundle.per_candidate_hint_refs) {
    assert.equal(ref.repair_hint_bundle_path, hintBundleRel);
    assert.equal(ref.hint_ids.length, hintBundle.adapter_repair_hints.length);
    assert.ok(ref.required_actions.includes("consult_non_authoritative_theorem_search_literature_and_cas_hints"));
    assert.equal(ref.proof_authority, "none");
  }

  const repairBatch = readJson(repairBatchRel);
  assert.equal(repairBatch.source_repair_hint_bundle.path, hintBundleRel);
  assert.equal(repairBatch.source_repair_hint_bundle.sha256, sha256File(join(root, hintBundleRel)));
  assert.deepEqual(repairBatch.repair_hint_bundle_paths, [hintBundleRel]);
  assert.equal(repairBatch.proof_authority, "none");

  for (const repairItem of repairBatch.per_candidate_repairs) {
    const task = readJson(repairItem.repair_task_path);
    assert.equal(task.source_repair_hint_bundle.path, hintBundleRel);
    assert.equal(task.source_repair_hint_bundle.sha256, sha256File(join(root, hintBundleRel)));
    assert.equal(task.source_repair_hints.length, hintBundle.adapter_repair_hints.length);
    assert.ok(task.allowed_inputs.includes(hintBundleRel));
    assert.ok(task.required_actions.includes("consult_non_authoritative_theorem_search_literature_and_cas_hints"));
    assert.equal(task.proof_authority, "none");
    assert.equal(task.can_promote_claim, false);
  }

  const repairExecutionRel = `.comath/campaign/${campaignId}/lean_candidate_attempt_repair_execution.json`;
  const firstRepairItem = repairBatch.per_candidate_repairs[0];
  const firstLeanBeforeTamper = readFileSync(join(root, firstRepairItem.source_lean_file_path), "utf8");
  const repairExecutionBeforeTamper = existsSync(join(root, repairExecutionRel))
    ? readFileSync(join(root, repairExecutionRel), "utf8")
    : null;
  const hintBundleBeforeTamper = readFileSync(join(root, hintBundleRel), "utf8");
  writeFileSync(join(root, hintBundleRel), `${hintBundleBeforeTamper}\n{"tampered":true}\n`);
  await assert.rejects(
    () => tickCampaign({ project_root: root, campaign_id: campaignId, actor: "goal3-task268" }),
    /lean_candidate_repair_hint_bundle_hash_mismatch/
  );
  assert.equal(
    existsSync(join(root, repairExecutionRel)) ? readFileSync(join(root, repairExecutionRel), "utf8") : null,
    repairExecutionBeforeTamper
  );
  assert.equal(readFileSync(join(root, firstRepairItem.source_lean_file_path), "utf8"), firstLeanBeforeTamper);
  writeFileSync(join(root, hintBundleRel), hintBundleBeforeTamper);

  await tickCampaign({ project_root: root, campaign_id: campaignId, actor: "goal3-task268" });
  const repairExecution = readJson(repairExecutionRel);
  assert.equal(repairExecution.source_repair_hint_bundle.path, hintBundleRel);
  assert.equal(repairExecution.lean_runner_invocations, 0);
  assert.deepEqual(repairExecution.lean_run_manifest_paths, []);
  assert.equal(repairExecution.proof_authority, "none");
  for (const item of repairExecution.per_candidate_executions) {
    assert.equal(item.source_repair_hint_bundle.path, hintBundleRel);
    assert.equal(item.source_repair_hints.length, hintBundle.adapter_repair_hints.length);
    assert.equal(readFileSync(join(root, item.repaired_lean_file_path), "utf8").includes("comath_repair_hints"), true);
    assert.equal(item.proof_authority, "none");
    assert.equal(item.result_can_be_used_as_proof, false);
  }
} finally {
  if (typeof restoreFakeCommands === "function") {
    restoreFakeCommands();
  }
  rmSync(root, { recursive: true, force: true });
}

console.log("Goal 3 Task 268 Pi goal-mode repair hint bundle test passed.");
