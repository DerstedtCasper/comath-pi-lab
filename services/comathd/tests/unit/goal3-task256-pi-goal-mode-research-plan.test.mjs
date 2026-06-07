import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createComathServer } from "../../dist/index.js";

const server = createComathServer();
const root = mkdtempSync(join(tmpdir(), "comath-goal3-task256-plan-"));
const tamperedRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task256-tampered-"));

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
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
      project_name: "Goal 3 Task 256 Research Plan",
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

function researchPlanPathFromCampaign(campaign) {
  const knowledgeRun = campaign.stage_runs.find(
    (run) => run.stage === "knowledge_pack" && run.artifact_paths.some((path) => path.endsWith("goal_mode_research_plan.json"))
  );
  assert.ok(knowledgeRun, "knowledge_pack must attach a service-owned goal-mode research plan");
  const researchPlanRel = knowledgeRun.artifact_paths.find((path) => path.endsWith("goal_mode_research_plan.json"));
  assert.ok(researchPlanRel?.startsWith(".comath/campaign/"));
  return { knowledgeRun, researchPlanRel };
}

try {
  const fixtures = writeGoalModeFixtures(root);
  const start = await startGoalModeCampaign(root, fixtures, "goal3-task256");

  assert.equal(start.status, 200);
  assert.equal(start.body.campaign.current_stage, "problem_locked");

  const firstTick = await tickCampaign(root, start.body.campaign.campaign_id, "goal3-task256");
  assert.equal(firstTick.status, 200);
  assert.equal(firstTick.body.campaign.current_stage, "knowledge_pack");

  const secondTick = await tickCampaign(root, start.body.campaign.campaign_id, "goal3-task256");
  assert.equal(secondTick.status, 200);
  assert.equal(secondTick.body.campaign.current_stage, "notation_gate");

  const intakeRun = secondTick.body.campaign.stage_runs.find((run) => run.stage === "initialized");
  const intakeRel = intakeRun.artifact_paths.find((path) => path.endsWith("goal_mode_intake_manifest.json"));
  assert.ok(intakeRel);
  const intakePath = join(root, intakeRel);
  assert.equal(existsSync(intakePath), true);

  const { knowledgeRun, researchPlanRel } = researchPlanPathFromCampaign(secondTick.body.campaign);
  const researchPlanPath = join(root, researchPlanRel);
  assert.equal(existsSync(researchPlanPath), true);

  const researchPlanText = readFileSync(researchPlanPath, "utf8");
  const researchPlan = JSON.parse(researchPlanText);
  assert.equal(researchPlan.schema_version, "comath.pi_goal_mode_research_plan.v1");
  assert.equal(researchPlan.campaign_id, start.body.campaign.campaign_id);
  assert.equal(researchPlan.claim_id, start.body.campaign.root_claim_id);
  assert.equal(researchPlan.consumes_goal_mode_intake_manifest.path, intakeRel);
  assert.equal(researchPlan.consumes_goal_mode_intake_manifest.sha256, sha256File(intakePath));
  assert.equal(researchPlan.execution_status, "planned_not_executed");
  assert.equal(researchPlan.network_execution_performed, false);
  assert.equal(researchPlan.proof_authority, "none");
  assert.equal(researchPlan.can_promote_claim, false);
  assert.equal(researchPlan.can_certify_ga, false);

  const ingestionProviders = researchPlan.ingestion_tasks.map((task) => task.adapter_provider).sort();
  assert.deepEqual(ingestionProviders, ["local_lean_repo", "local_markdown", "local_pdf", "local_tex"]);
  for (const task of researchPlan.ingestion_tasks) {
    assert.equal(task.service_owned_execution_required, true);
    assert.equal(task.proof_authority, "none");
    assert.equal(task.can_promote_claim, false);
  }
  assert.equal(
    researchPlan.ingestion_tasks.find((task) => task.adapter_provider === "local_markdown").input_sha256,
    sha256File(fixtures.markdownPaper)
  );
  assert.equal(
    researchPlan.ingestion_tasks.find((task) => task.adapter_provider === "local_pdf").input_sha256,
    sha256File(fixtures.pdfPaper)
  );
  assert.equal(
    researchPlan.ingestion_tasks.find((task) => task.adapter_provider === "local_tex").input_sha256,
    sha256File(fixtures.texAttachment)
  );

  const retrievalProviders = researchPlan.retrieval_tasks.map((task) => task.adapter_provider).sort();
  assert.deepEqual(retrievalProviders, ["anysearch", "arxiv", "crossref", "jina_search", "openalex", "semantic_scholar", "unpaywall"]);
  for (const task of researchPlan.retrieval_tasks) {
    assert.equal(task.proof_authority, "none");
    assert.equal(task.can_promote_claim, false);
  }

  const theoremSearchProviders = researchPlan.theorem_search_tasks.map((task) => task.adapter_provider).sort();
  assert.deepEqual(theoremSearchProviders, ["leanexplore", "leansearch", "loogle", "moogle"]);
  for (const task of researchPlan.theorem_search_tasks) {
    assert.equal(task.proof_authority, "none");
    assert.equal(task.can_promote_claim, false);
  }

  assert.equal(researchPlan.lemma_planning_seed.stage, "skeleton_gate");
  assert.equal(researchPlan.lemma_planning_seed.lemma_dag_path, `.comath/campaign/${start.body.campaign.campaign_id}/proof/lemma_dag.json`);
  assert.equal(researchPlan.lemma_planning_seed.skeleton_lean_path, `.comath/campaign/${start.body.campaign.campaign_id}/proof/Skeleton.lean`);
  assert.equal(researchPlan.lemma_planning_seed.proof_authority, "none");
  assert.equal(researchPlan.lemma_planning_seed.can_promote_claim, false);

  assert.equal(researchPlanText.includes(root), false, "research plan must not leak the host project root");
  assert.equal(researchPlanText.includes(root.replace(/\\/g, "/")), false, "research plan must not leak normalized host project root");
  assert.equal(researchPlanText.includes(root.replace(/\\/g, "\\\\")), false, "research plan must not leak JSON-escaped host project root");

  const knowledgePackRel = knowledgeRun.artifact_paths.find((path) => path.endsWith("knowledge_pack.json"));
  const knowledgePack = JSON.parse(readFileSync(join(root, knowledgePackRel), "utf8"));
  assert.equal(knowledgePack.goal_mode_research_plan.path, researchPlanRel);
  assert.equal(knowledgePack.goal_mode_research_plan.sha256, sha256File(researchPlanPath));
  assert.equal(knowledgePack.goal_mode_research_plan.proof_authority, "none");
  assert.equal(knowledgePack.goal_mode_research_plan.can_promote_claim, false);
  assert.equal(
    secondTick.body.campaign.next_actions.includes("run goal-mode ingestion, retrieval, theorem-search, and lemma-planning adapters before any proof claim promotion"),
    true
  );

  let advanced = secondTick;
  while (advanced.body.campaign.current_stage !== "candidate_generation") {
    advanced = await tickCampaign(root, start.body.campaign.campaign_id, "goal3-task256");
    assert.equal(advanced.status, 200);
    assert.notEqual(advanced.body.campaign.status, "blocked");
  }
  unlinkSync(researchPlanPath);
  const missingPlan = await tickCampaign(root, start.body.campaign.campaign_id, "goal3-task256");
  assert.equal(missingPlan.status, 200);
  assert.equal(missingPlan.body.blocker, "missing_required_stage_artifact");
  const missingBlocker = missingPlan.body.campaign.blockers.at(-1);
  assert.equal(missingBlocker.code, "MISSING_REQUIRED_STAGE_ARTIFACT");
  assert.equal(missingBlocker.rewind_target, "knowledge_pack");
  assert.deepEqual(missingBlocker.missing_artifacts, [researchPlanRel]);

  const tamperedFixtures = writeGoalModeFixtures(tamperedRoot);
  const tamperedStart = await startGoalModeCampaign(tamperedRoot, tamperedFixtures, "goal3-task256-tampered");
  assert.equal(tamperedStart.status, 200);
  const tamperedIntakeRun = tamperedStart.body.campaign.stage_runs.find((run) => run.stage === "initialized");
  const tamperedIntakeRel = tamperedIntakeRun.artifact_paths.find((path) => path.endsWith("goal_mode_intake_manifest.json"));
  assert.ok(tamperedIntakeRel);
  writeFileSync(
    join(tamperedRoot, tamperedIntakeRel),
    `${JSON.stringify(
      {
        schema_version: "comath.pi_goal_mode_intake_manifest.v1",
        campaign_id: "CAM-POISONED",
        project_id: tamperedStart.body.campaign.project_id,
        claim_id: tamperedStart.body.campaign.root_claim_id,
        statement_hash: "poisoned-statement",
        paper_refs: [
          {
            ref_id: "GMI-PAPER-0001",
            kind: "paper",
            normalized_path: tamperedRoot,
            exists: true,
            entry_type: "file",
            sha256: "0".repeat(64),
            size_bytes: 1
          }
        ],
        attachment_refs: [],
        workspace_refs: [],
        proof_authority: "none",
        can_promote_claim: false
      },
      null,
      2
    )}\n`
  );
  const tamperedFirstTick = await tickCampaign(tamperedRoot, tamperedStart.body.campaign.campaign_id, "goal3-task256-tampered");
  assert.equal(tamperedFirstTick.status, 200);
  const tamperedSecondTick = await tickCampaign(tamperedRoot, tamperedStart.body.campaign.campaign_id, "goal3-task256-tampered");
  assert.equal(tamperedSecondTick.status, 200);
  const { researchPlanRel: tamperedPlanRel } = researchPlanPathFromCampaign(tamperedSecondTick.body.campaign);
  const tamperedPlanText = readFileSync(join(tamperedRoot, tamperedPlanRel), "utf8");
  const tamperedPlan = JSON.parse(tamperedPlanText);
  assert.equal(tamperedPlan.consumes_goal_mode_intake_manifest, null);
  assert.deepEqual(tamperedPlan.ingestion_tasks, []);
  assert.equal(
    tamperedPlan.blocked_capabilities.some((blocker) => blocker.code === "goal_mode_intake_manifest_invalid"),
    true
  );
  assert.equal(tamperedPlanText.includes(tamperedRoot), false, "invalid intake refs must not leak host paths into the plan");
} finally {
  await server.close();
  rmSync(root, { recursive: true, force: true });
  rmSync(tamperedRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 256 Pi goal-mode research plan test passed.");
