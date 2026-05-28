import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createComathServer, getClaim } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-broad-theorem-planning-"));
const server = createComathServer();

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

async function tickToTerminal(campaignId, maxTicks = 12) {
  let last = null;
  for (let index = 0; index < maxTicks; index += 1) {
    const tick = await server.inject({
      method: "POST",
      path: `/campaign/${encodeURIComponent(campaignId)}/tick`,
      body: {
        project_root: projectRoot,
        actor: "phase70-broad-planning"
      }
    });
    assert.equal(tick.status, 200);
    last = tick.body;
    if (tick.body.campaign.status === "terminal") {
      return last;
    }
  }
  assert.fail("broad theorem planning campaign did not reach terminal state");
}

try {
  const start = await server.inject({
    method: "POST",
    path: "/campaign/start",
    body: {
      project_root: projectRoot,
      project_name: "Task 17 Broad Theorem Planning Slice",
      user_goal: "Prove that every prime number has a twin prime.",
      domain: "number_theory",
      strict_mode: true,
      actor: "phase70-broad-planning"
    }
  });
  assert.equal(start.status, 200);

  const campaignId = start.body.campaign.campaign_id;
  const claimId = start.body.campaign.root_claim_id;
  const finalTick = await tickToTerminal(campaignId);

  assert.equal(finalTick.campaign.status, "terminal");
  assert.equal(finalTick.campaign.terminal_state, "blocked_with_replayable_reason");
  assert.equal(finalTick.campaign.current_stage, "blocked");
  assert.equal(finalTick.campaign.blockers[0].reason, "broad theorem synthesis requires checked replay target");
  assert.equal(finalTick.final_replay, undefined);
  assert.equal(finalTick.gate, undefined);

  const planningRel = `.comath/campaign/${campaignId}/broad_synthesis_plan.json`;
  const replayTargetRel = `.comath/campaign/${campaignId}/broad_replay_target.json`;
  const failureRel = `.comath/campaign/${campaignId}/broad_synthesis_failure.json`;

  for (const relPath of [
    ".comath/lock/problem_lock.md",
    `.comath/campaign/${campaignId}/proof/lemma_dag.json`,
    `.comath/campaign/${campaignId}/proof/line_map.json`,
    planningRel,
    replayTargetRel,
    failureRel
  ]) {
    assert.equal(existsSync(join(projectRoot, relPath)), true, `${relPath} must exist`);
  }

  const plan = readJson(join(projectRoot, planningRel));
  assert.equal(plan.schema_version, "comath.v3.broad_synthesis_plan.v1");
  assert.equal(plan.campaign_id, campaignId);
  assert.equal(plan.claim_id, claimId);
  assert.equal(plan.mode, "fail_closed_planning_slice");
  assert.equal(plan.proof_authority, "none");
  assert.equal(plan.locked_problem.statement, "Prove that every prime number has a twin prime.");
  assert.equal(plan.obligation_dag_path, `.comath/campaign/${campaignId}/proof/lemma_dag.json`);
  assert.equal(plan.replay_target_path, replayTargetRel);
  assert.deepEqual(plan.candidate_plan.required_gates, [
    "problem_lock",
    "obligation_dag",
    "candidate_manifest",
    "statement_equivalence",
    "dependency_closure",
    "axiom_profile",
    "final_clean_replay"
  ]);
  assert.ok(plan.candidate_plan.synthesis_steps.length >= 4);
  assert.equal(plan.candidate_plan.can_promote_claim, false);

  const replayTarget = readJson(join(projectRoot, replayTargetRel));
  assert.equal(replayTarget.status, "unresolved");
  assert.equal(replayTarget.target_formal_system, "Lean4");
  assert.equal(replayTarget.required_before_replay.includes("theorem-specific Lean declaration"), true);
  assert.equal(replayTarget.proof_authority, "none");

  const failure = readJson(join(projectRoot, failureRel));
  assert.equal(failure.reason, "broad theorem synthesis requires checked replay target");
  assert.equal(failure.fail_closed, true);
  assert.equal(failure.promotion_blocked, true);
  assert.equal(failure.replayable_evidence.planning_artifact, planningRel);
  assert.equal(failure.replayable_evidence.replay_target_artifact, replayTargetRel);

  const lastRun = finalTick.campaign.stage_runs.at(-1);
  assert.equal(lastRun.stage, "candidate_generation");
  assert.equal(lastRun.status, "blocked");
  assert.deepEqual(lastRun.artifact_paths.sort(), [failureRel, planningRel, replayTargetRel].sort());

  const claim = getClaim(projectRoot, finalTick.campaign.project_id, claimId);
  assert.equal(claim.status, "conjectural");
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 70 broad theorem planning slice tests passed.");
