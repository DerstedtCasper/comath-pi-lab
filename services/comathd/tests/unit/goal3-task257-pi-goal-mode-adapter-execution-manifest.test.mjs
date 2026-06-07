import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createComathServer } from "../../dist/index.js";

const server = createComathServer();
const root = mkdtempSync(join(tmpdir(), "comath-goal3-task257-adapter-manifest-"));
const tamperedRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task257-input-tamper-"));

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function assertSha256(value, label) {
  assert.equal(typeof value, "string", `${label} must be a string`);
  assert.match(value, /^[a-f0-9]{64}$/u, `${label} must be a SHA-256 digest`);
}

function writeGoalModeFixtures(projectRoot) {
  const markdownPaper = join(projectRoot, "papers", "source.md");
  const pdfPaper = join(projectRoot, "papers", "source.pdf");
  const texAttachment = join(projectRoot, "notes", "idea.tex");
  const workspaceRoot = join(projectRoot, "lean");
  mkdirSync(join(projectRoot, "papers"), { recursive: true });
  mkdirSync(join(projectRoot, "notes"), { recursive: true });
  mkdirSync(workspaceRoot, { recursive: true });
  writeFileSync(markdownPaper, "# Source\n\nA theorem statement and informal proof sketch.\n");
  writeFileSync(pdfPaper, "%PDF-1.4\n% minimal fixture bytes, not a proof\n");
  writeFileSync(texAttachment, "\\section{Idea}\nA TeX attachment used as a hint only.\n");
  writeFileSync(join(workspaceRoot, "Main.lean"), "theorem trivial_goal : True := by trivial\n");
  return { markdownPaper, pdfPaper, texAttachment, workspaceRoot };
}

async function startGoalModeCampaign(projectRoot, fixtures, actor) {
  return server.inject({
    method: "POST",
    path: "/campaign/start",
    body: {
      project_root: projectRoot,
      project_name: "Goal 3 Task 257 Adapter Execution Manifest",
      user_goal: "Prove the attached sources can be turned into a Lean skeleton without changing the theorem boundary.",
      domain: "formalization",
      mode: "goal",
      paper_paths: ["papers/source.md", fixtures.pdfPaper],
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
      actor
    }
  });
}

async function tickCampaign(projectRoot, campaignId, actor) {
  return server.inject({
    method: "POST",
    path: `/campaign/${encodeURIComponent(campaignId)}/tick`,
    body: { project_root: projectRoot, actor }
  });
}

function knowledgeRunWithArtifacts(campaign) {
  const knowledgeRun = campaign.stage_runs.find(
    (run) =>
      run.stage === "knowledge_pack" &&
      run.artifact_paths.some((path) => path.endsWith("goal_mode_research_plan.json")) &&
      run.artifact_paths.some((path) => path.endsWith("goal_mode_adapter_execution_manifest.json"))
  );
  assert.ok(knowledgeRun, "knowledge_pack must attach a service-owned adapter execution manifest");
  const researchPlanRel = knowledgeRun.artifact_paths.find((path) => path.endsWith("goal_mode_research_plan.json"));
  const executionManifestRel = knowledgeRun.artifact_paths.find((path) =>
    path.endsWith("goal_mode_adapter_execution_manifest.json")
  );
  assert.ok(researchPlanRel?.startsWith(".comath/campaign/"));
  assert.ok(executionManifestRel?.startsWith(".comath/campaign/"));
  return { knowledgeRun, researchPlanRel, executionManifestRel };
}

try {
  const fixtures = writeGoalModeFixtures(root);
  const start = await startGoalModeCampaign(root, fixtures, "goal3-task257");
  assert.equal(start.status, 200);

  const firstTick = await tickCampaign(root, start.body.campaign.campaign_id, "goal3-task257");
  assert.equal(firstTick.status, 200);
  assert.equal(firstTick.body.campaign.current_stage, "knowledge_pack");

  const secondTick = await tickCampaign(root, start.body.campaign.campaign_id, "goal3-task257");
  assert.equal(secondTick.status, 200);
  assert.equal(secondTick.body.campaign.current_stage, "notation_gate");

  const { knowledgeRun, researchPlanRel, executionManifestRel } = knowledgeRunWithArtifacts(secondTick.body.campaign);
  const researchPlanPath = join(root, researchPlanRel);
  const executionManifestPath = join(root, executionManifestRel);
  assert.equal(existsSync(researchPlanPath), true);
  assert.equal(existsSync(executionManifestPath), true);

  const researchPlan = JSON.parse(readFileSync(researchPlanPath, "utf8"));
  const executionText = readFileSync(executionManifestPath, "utf8");
  const executionManifest = JSON.parse(executionText);

  assert.equal(executionManifest.schema_version, "comath.pi_goal_mode_adapter_execution_manifest.v1");
  assert.equal(executionManifest.campaign_id, start.body.campaign.campaign_id);
  assert.equal(executionManifest.claim_id, start.body.campaign.root_claim_id);
  assert.equal(executionManifest.locked_statement_hash, researchPlan.locked_statement_hash);
  assert.equal(executionManifest.consumes_goal_mode_research_plan.path, researchPlanRel);
  assert.equal(executionManifest.consumes_goal_mode_research_plan.sha256, sha256File(researchPlanPath));
  assert.equal(
    executionManifest.consumes_goal_mode_intake_manifest.path,
    researchPlan.consumes_goal_mode_intake_manifest.path
  );
  assert.equal(
    executionManifest.consumes_goal_mode_intake_manifest.sha256,
    researchPlan.consumes_goal_mode_intake_manifest.sha256
  );
  assert.equal(executionManifest.consumes_goal_mode_intake_manifest.proof_authority, "none");
  assert.equal(executionManifest.service_owned_execution_manifest, true);
  assert.equal(executionManifest.network_execution_performed, false);
  assert.equal(executionManifest.execution_status, "blocked_live_provider_execution_required");
  assert.equal(executionManifest.proof_authority, "none");
  assert.equal(executionManifest.external_evidence_authority, false);
  assert.equal(executionManifest.can_promote_claim, false);
  assert.equal(executionManifest.can_certify_ga, false);

  const plannedTaskCount =
    researchPlan.ingestion_tasks.length + researchPlan.retrieval_tasks.length + researchPlan.theorem_search_tasks.length;
  assert.equal(executionManifest.adapter_runs.length, plannedTaskCount);
  assert.equal(new Set(executionManifest.adapter_runs.map((run) => run.planned_task_id)).size, plannedTaskCount);

  const runProviders = executionManifest.adapter_runs.map((run) => `${run.adapter_kind}:${run.adapter_provider}`).sort();
  assert.deepEqual(runProviders, [
    "external_lean_repo:local_lean_repo",
    "retrieval:anysearch",
    "retrieval:arxiv",
    "retrieval:crossref",
    "retrieval:jina_search",
    "retrieval:local_markdown",
    "retrieval:local_pdf",
    "retrieval:local_tex",
    "retrieval:openalex",
    "retrieval:semantic_scholar",
    "retrieval:unpaywall",
    "theorem_search:leanexplore",
    "theorem_search:leansearch",
    "theorem_search:loogle",
    "theorem_search:moogle"
  ]);

  for (const run of executionManifest.adapter_runs) {
    assert.equal(run.service_owned_execution, true);
    assert.equal(run.proof_authority, "none");
    assert.equal(run.can_promote_claim, false);
    assert.equal(run.can_certify_ga, false);
    assert.equal(run.result_can_be_used_as_proof, false);
    assertSha256(run.planned_task_sha256, `${run.adapter_run_id} planned_task_sha256`);
    assertSha256(run.request_sha256, `${run.adapter_run_id} request_sha256`);
    assertSha256(run.response_sha256, `${run.adapter_run_id} response_sha256`);
    assert.equal(JSON.stringify(run).includes(root), false, "adapter run manifest must not leak the host project root");
  }

  const localRuns = executionManifest.adapter_runs.filter((run) => run.purpose === "local_ingestion");
  assert.equal(localRuns.length, 4);
  for (const run of localRuns) {
    assert.equal(run.input_integrity_status, run.adapter_provider === "local_lean_repo" ? "directory_reference_recorded" : "matched");
    assert.equal(run.live_execution_performed, false);
    assert.equal(run.execution_state, "local_manifest_recorded");
    assert.equal(run.prompt_injection_scan.status, "required_before_extraction");
    assert.equal(run.extracted_claims.length, 0);
  }
  assert.equal(
    localRuns.find((run) => run.adapter_provider === "local_markdown").current_input_sha256,
    sha256File(fixtures.markdownPaper)
  );
  assert.equal(localRuns.find((run) => run.adapter_provider === "local_pdf").current_input_sha256, sha256File(fixtures.pdfPaper));
  assert.equal(localRuns.find((run) => run.adapter_provider === "local_tex").current_input_sha256, sha256File(fixtures.texAttachment));

  const blockedNetworkRuns = executionManifest.adapter_runs.filter((run) => run.purpose !== "local_ingestion");
  assert.equal(blockedNetworkRuns.length, 11);
  for (const run of blockedNetworkRuns) {
    assert.equal(run.execution_state, "blocked_network_execution_not_performed");
    assert.equal(run.live_execution_performed, false);
    assert.equal(run.blocker.code, "goal_mode_live_adapter_execution_required");
    assert.equal(run.response_summary.result_count, 0);
  }

  const knowledgePackRel = knowledgeRun.artifact_paths.find((path) => path.endsWith("knowledge_pack.json"));
  const knowledgePack = JSON.parse(readFileSync(join(root, knowledgePackRel), "utf8"));
  assert.equal(knowledgePack.goal_mode_adapter_execution_manifest.path, executionManifestRel);
  assert.equal(knowledgePack.goal_mode_adapter_execution_manifest.sha256, sha256File(executionManifestPath));
  assert.equal(knowledgePack.goal_mode_adapter_execution_manifest.proof_authority, "none");
  assert.equal(knowledgePack.goal_mode_adapter_execution_manifest.can_promote_claim, false);
  assert.equal(
    secondTick.body.campaign.next_actions.includes("extract anchored evidence from service-owned adapter execution manifests before candidate generation"),
    true
  );
  assert.equal(executionText.includes(root), false, "execution manifest must not leak the host project root");

  let advanced = secondTick;
  while (advanced.body.campaign.current_stage !== "candidate_generation") {
    advanced = await tickCampaign(root, start.body.campaign.campaign_id, "goal3-task257");
    assert.equal(advanced.status, 200);
    assert.notEqual(advanced.body.campaign.status, "blocked");
  }
  unlinkSync(executionManifestPath);
  const missingExecutionManifest = await tickCampaign(root, start.body.campaign.campaign_id, "goal3-task257");
  assert.equal(missingExecutionManifest.status, 200);
  assert.equal(missingExecutionManifest.body.blocker, "missing_required_stage_artifact");
  const missingBlocker = missingExecutionManifest.body.campaign.blockers.at(-1);
  assert.equal(missingBlocker.code, "MISSING_REQUIRED_STAGE_ARTIFACT");
  assert.equal(missingBlocker.rewind_target, "knowledge_pack");
  assert.deepEqual(missingBlocker.missing_artifacts, [executionManifestRel]);

  const tamperedFixtures = writeGoalModeFixtures(tamperedRoot);
  const tamperedStart = await startGoalModeCampaign(tamperedRoot, tamperedFixtures, "goal3-task257-tampered");
  assert.equal(tamperedStart.status, 200);
  const tamperedIntakeRun = tamperedStart.body.campaign.stage_runs.find(
    (run) => run.stage === "initialized" && run.artifact_paths.some((path) => path.endsWith("goal_mode_intake_manifest.json"))
  );
  assert.ok(tamperedIntakeRun, "tamper scenario must have an intake manifest artifact");
  const tamperedIntakeRel = tamperedIntakeRun.artifact_paths.find((path) => path.endsWith("goal_mode_intake_manifest.json"));
  const tamperedIntake = JSON.parse(readFileSync(join(tamperedRoot, tamperedIntakeRel), "utf8"));
  writeFileSync(tamperedFixtures.markdownPaper, "# Source\n\nTampered after intake manifest creation.\n");
  const tamperedFirstTick = await tickCampaign(
    tamperedRoot,
    tamperedStart.body.campaign.campaign_id,
    "goal3-task257-tampered"
  );
  assert.equal(tamperedFirstTick.status, 200);
  const tamperedSecondTick = await tickCampaign(
    tamperedRoot,
    tamperedStart.body.campaign.campaign_id,
    "goal3-task257-tampered"
  );
  assert.equal(tamperedSecondTick.status, 200);
  const { executionManifestRel: tamperedExecutionRel } = knowledgeRunWithArtifacts(tamperedSecondTick.body.campaign);
  const tamperedExecution = JSON.parse(readFileSync(join(tamperedRoot, tamperedExecutionRel), "utf8"));
  const tamperedMarkdownRun = tamperedExecution.adapter_runs.find((run) => run.adapter_provider === "local_markdown");
  assert.equal(tamperedMarkdownRun.input_integrity_status, "mismatched");
  assert.equal(tamperedMarkdownRun.execution_state, "blocked_input_hash_mismatch");
  assert.equal(tamperedMarkdownRun.blocker.code, "goal_mode_input_hash_mismatch");
  assert.equal(tamperedMarkdownRun.input_sha256, tamperedIntake.paper_refs[0].sha256);
  assert.notEqual(tamperedMarkdownRun.current_input_sha256, tamperedMarkdownRun.input_sha256);
  assert.equal(JSON.stringify(tamperedExecution).includes(tamperedRoot), false, "tamper blockers must not leak host roots");
} finally {
  await server.close();
  rmSync(root, { recursive: true, force: true });
  rmSync(tamperedRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 257 Pi goal-mode adapter execution manifest test passed.");
