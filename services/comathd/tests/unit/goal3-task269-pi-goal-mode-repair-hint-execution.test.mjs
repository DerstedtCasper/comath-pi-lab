import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { startCampaign, tickCampaign } from "../../dist/index.js";

const root = mkdtempSync(join(tmpdir(), "comath-goal3-task269-repair-hint-execution-"));

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function assertSha256(value, label) {
  assert.equal(typeof value, "string", `${label} must be a string`);
  assert.match(value, /^[a-f0-9]{64}$/u, `${label} must be a SHA-256 digest`);
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
      "Theorem. Failed Lean diagnostics should guide a service-owned repair hint execution pass.",
      "Proof sketch. Adapter outputs are planning material only.",
      ""
    ].join("\n")
  );
  writeFileSync(
    texAttachment,
    ["\\begin{lemma}\\label{lem:hint-exec}", "A local TeX lemma used as non-authoritative repair context.", "\\end{lemma}", ""].join(
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
    body = await tickCampaign({ project_root: root, campaign_id: campaignId, actor: "goal3-task269" });
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
    project_name: "Goal 3 Task 269 Repair Hint Execution",
    user_goal:
      "Prove that failed Lean diagnostics can use service-owned theorem-search, literature, and CAS repair hint executions without changing theorem boundaries.",
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
    actor: "goal3-task269"
  });
  const campaignId = started.campaign.campaign_id;

  await advanceTo(campaignId, "candidate_generation");
  await tickCampaign({ project_root: root, campaign_id: campaignId, actor: "goal3-task269" });
  await tickCampaign({ project_root: root, campaign_id: campaignId, actor: "goal3-task269" });
  await tickCampaign({ project_root: root, campaign_id: campaignId, actor: "goal3-task269" });
  await tickCampaign({ project_root: root, campaign_id: campaignId, actor: "goal3-task269" });
  await tickCampaign({ project_root: root, campaign_id: campaignId, actor: "goal3-task269" });

  restoreFakeCommands = installFakeLeanLakeCommands(root);
  const rejected = await tickCampaign({
    project_root: root,
    campaign_id: campaignId,
    actor: "goal3-task269",
    lean_candidate_attempt_runner: {
      leanToolchain: "leanprover/lean4:v9.99.9"
    }
  });
  restoreFakeCommands();
  restoreFakeCommands = () => {};

  assert.equal(rejected.campaign.status, "terminal");
  assert.equal(rejected.campaign.terminal_state, "blocked_with_replayable_reason");

  const resumed = await tickCampaign({ project_root: root, campaign_id: campaignId, actor: "goal3-task269" });
  assert.equal(resumed.campaign.status, "repairing");
  assert.equal(resumed.campaign.current_stage, "repair");

  const feedbackRel = `.comath/campaign/${campaignId}/lean_candidate_attempt_repair_feedback_batch.json`;
  const hintBundleRel = `.comath/campaign/${campaignId}/lean_candidate_attempt_repair_hint_bundle.json`;
  const hintExecutionRel = `.comath/campaign/${campaignId}/lean_candidate_attempt_repair_hint_execution.json`;
  const repairBatchRel = `.comath/campaign/${campaignId}/lean_candidate_attempt_repair_batch.json`;

  assert.equal(existsSync(join(root, hintExecutionRel)), true);
  assert.equal(
    resumed.campaign.stage_runs.some((run) => run.artifact_paths.includes(hintExecutionRel)),
    true,
    "terminal resume stage run should expose the repair hint execution artifact"
  );

  const hintBundle = readJson(hintBundleRel);
  const hintExecution = readJson(hintExecutionRel);
  assert.equal(hintExecution.schema_version, "comath.pi_goal_mode_lean_candidate_attempt_repair_hint_execution.v1");
  assert.equal(hintExecution.source_repair_feedback_batch.path, feedbackRel);
  assert.equal(hintExecution.source_repair_feedback_batch.sha256, sha256File(join(root, feedbackRel)));
  assert.equal(hintExecution.source_repair_hint_bundle.path, hintBundleRel);
  assert.equal(hintExecution.source_repair_hint_bundle.sha256, sha256File(join(root, hintBundleRel)));
  assert.equal(hintExecution.service_owned_adapter_execution, true);
  assert.equal(hintExecution.network_execution_performed, false);
  assert.equal(hintExecution.live_provider_execution_performed, false);
  assert.equal(hintExecution.stubbed_adapter_execution_performed, true);
  assert.equal(hintExecution.proof_authority, "none");
  assert.equal(hintExecution.can_promote_claim, false);
  assert.equal(hintExecution.can_certify_ga, false);
  assert.equal(hintExecution.result_can_be_used_as_proof, false);
  assert.equal(JSON.stringify(hintExecution).includes(root), false, "hint execution must not leak host root");

  assert.ok(hintExecution.adapter_results.length >= 5);
  assert.equal(hintExecution.adapter_result_count, hintExecution.adapter_results.length);
  const resultKinds = new Set(hintExecution.adapter_results.map((result) => result.kind));
  assert.equal(resultKinds.has("theorem_search"), true);
  assert.equal(resultKinds.has("retrieval"), true);
  assert.equal(resultKinds.has("computation"), true);
  assert.equal(resultKinds.has("proof_search_backend"), true);
  assert.equal(resultKinds.has("external_lean_repo"), true);

  for (const result of hintExecution.adapter_results) {
    assert.equal(result.adapter_execution_state, "stubbed_provider_result_recorded");
    assertSha256(result.request_sha256, `${result.adapter_result_id} request_sha256`);
    assertSha256(result.result_payload_sha256, `${result.adapter_result_id} result_payload_sha256`);
    assert.equal(result.source_repair_hint.repair_hint_bundle_path, hintBundleRel);
    assert.equal(result.source_repair_hint.repair_hint_bundle_sha256, sha256File(join(root, hintBundleRel)));
    assert.equal(result.proof_authority, "none");
    assert.equal(result.can_promote_claim, false);
    assert.equal(result.result_can_be_used_as_proof, false);
    assert.equal(result.network_execution_performed, false);
    assert.ok(result.promotion_vetoes.includes("external_adapter_result_has_no_proof_authority"));
    if (result.kind === "theorem_search" || result.kind === "retrieval") {
      assert.equal(Array.isArray(result.result_payload_summary.results), true);
      assert.ok(result.result_payload_summary.results.length >= 1);
      assert.equal(result.result_payload_summary.results[0].adapter_id, result.adapter_id);
      assert.equal(result.result_payload_summary.results[0].proof_authority, "none");
      assert.equal(result.result_payload_summary.results[0].can_promote_claim, false);
    }
    if (result.kind === "computation") {
      assert.equal(result.result_payload_summary.report.adapter_id, result.adapter_id);
      assert.equal(result.result_payload_summary.report.proof_authority, "none");
      assert.equal(result.result_payload_summary.report.can_promote_claim, false);
    }
    if (result.kind === "proof_search_backend" || result.kind === "external_lean_repo") {
      assert.equal(result.result_payload_summary.candidate.adapter_id, result.adapter_id);
      assert.equal(result.result_payload_summary.candidate.proof_authority, "none");
      assert.equal(result.result_payload_summary.candidate.can_promote_claim, false);
    }
  }

  assert.equal(hintExecution.per_candidate_execution_refs.length, 8);
  for (const ref of hintExecution.per_candidate_execution_refs) {
    assert.equal(ref.repair_hint_execution_path, hintExecutionRel);
    assert.equal(ref.adapter_result_ids.length, hintExecution.adapter_results.length);
    assert.ok(ref.required_actions.includes("apply_service_owned_non_authoritative_repair_hint_results"));
    assert.equal(ref.proof_authority, "none");
  }

  const repairBatch = readJson(repairBatchRel);
  assert.equal(repairBatch.source_repair_hint_execution.path, hintExecutionRel);
  assert.equal(repairBatch.source_repair_hint_execution.sha256, sha256File(join(root, hintExecutionRel)));
  assert.deepEqual(repairBatch.repair_hint_execution_paths, [hintExecutionRel]);
  assert.equal(repairBatch.proof_authority, "none");

  for (const repairItem of repairBatch.per_candidate_repairs) {
    const task = readJson(repairItem.repair_task_path);
    assert.equal(task.source_repair_hint_execution.path, hintExecutionRel);
    assert.equal(task.source_repair_hint_execution.sha256, sha256File(join(root, hintExecutionRel)));
    assert.equal(task.source_repair_hint_results.length, hintExecution.adapter_results.length);
    assert.ok(task.allowed_inputs.includes(hintExecutionRel));
    assert.ok(task.required_actions.includes("apply_service_owned_non_authoritative_repair_hint_results"));
    assert.equal(task.proof_authority, "none");
    assert.equal(task.can_promote_claim, false);
  }

  const repairExecutionRel = `.comath/campaign/${campaignId}/lean_candidate_attempt_repair_execution.json`;
  const firstRepairItem = repairBatch.per_candidate_repairs[0];
  const firstLeanBeforeTamper = readFileSync(join(root, firstRepairItem.source_lean_file_path), "utf8");
  const repairExecutionBeforeTamper = existsSync(join(root, repairExecutionRel))
    ? readFileSync(join(root, repairExecutionRel), "utf8")
    : null;
  const hintExecutionBeforeTamper = readFileSync(join(root, hintExecutionRel), "utf8");
  writeFileSync(join(root, hintExecutionRel), `${hintExecutionBeforeTamper}\n{"tampered":true}\n`);
  await assert.rejects(
    () => tickCampaign({ project_root: root, campaign_id: campaignId, actor: "goal3-task269" }),
    /lean_candidate_repair_hint_execution_hash_mismatch/
  );
  assert.equal(
    existsSync(join(root, repairExecutionRel)) ? readFileSync(join(root, repairExecutionRel), "utf8") : null,
    repairExecutionBeforeTamper
  );
  assert.equal(readFileSync(join(root, firstRepairItem.source_lean_file_path), "utf8"), firstLeanBeforeTamper);
  writeFileSync(join(root, hintExecutionRel), hintExecutionBeforeTamper);

  await tickCampaign({ project_root: root, campaign_id: campaignId, actor: "goal3-task269" });
  const repairExecution = readJson(repairExecutionRel);
  assert.equal(repairExecution.source_repair_hint_execution.path, hintExecutionRel);
  assert.equal(repairExecution.lean_runner_invocations, 0);
  assert.deepEqual(repairExecution.lean_run_manifest_paths, []);
  assert.equal(repairExecution.proof_authority, "none");
  for (const item of repairExecution.per_candidate_executions) {
    assert.equal(item.source_repair_hint_execution.path, hintExecutionRel);
    assert.equal(item.source_repair_hint_results.length, hintExecution.adapter_results.length);
    assert.equal(readFileSync(join(root, item.repaired_lean_file_path), "utf8").includes("comath_repair_hint_execution"), true);
    assert.equal(item.hint_execution_guided_revision_applied, true);
    assert.equal(item.proof_authority, "none");
    assert.equal(item.result_can_be_used_as_proof, false);
  }
} finally {
  if (typeof restoreFakeCommands === "function") {
    restoreFakeCommands();
  }
  rmSync(root, { recursive: true, force: true });
}

console.log("Goal 3 Task 269 Pi goal-mode repair hint execution test passed.");
