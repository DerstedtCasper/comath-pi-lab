import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createComathServer, getCampaign, getClaim } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-ga-family-integrity-"));
const server = createComathServer();

async function startCampaign(userGoal, actor) {
  const response = await server.inject({
    method: "POST",
    path: "/campaign/start",
    body: {
      project_root: projectRoot,
      project_name: "GA Theorem Family Integrity",
      user_goal: userGoal,
      domain: "elementary",
      strict_mode: true,
      actor
    }
  });
  assert.equal(response.status, 200);
  return response.body;
}

async function tickToTerminal(campaignId, actor, maxTicks = 14) {
  let finalTick = null;
  for (let i = 0; i < maxTicks; i += 1) {
    const tick = await server.inject({
      method: "POST",
      path: `/campaign/${encodeURIComponent(campaignId)}/tick`,
      body: {
        project_root: projectRoot,
        actor
      }
    });
    assert.equal(tick.status, 200);
    finalTick = tick.body;
    if (tick.body.campaign.status === "terminal") {
      return finalTick;
    }
  }
  assert.fail(`campaign ${campaignId} did not reach terminal state`);
}

function readCampaignStatus(campaignId) {
  return JSON.parse(readFileSync(join(projectRoot, ".comath", "campaign", campaignId, "status.json"), "utf8"));
}

function writeCampaignStatus(campaignId, campaign) {
  writeFileSync(join(projectRoot, ".comath", "campaign", campaignId, "status.json"), `${JSON.stringify(campaign, null, 2)}\n`, "utf8");
}

try {
  const supported = await startCampaign("Prove in Lean that n + 0 = n for natural numbers.", "phase23-integrity-supported");
  const supportedFinal = await tickToTerminal(supported.campaign.campaign_id, "phase23-integrity-supported");
  assert.equal(supportedFinal.campaign.terminal_state, "completed_formal_proof");
  assert.equal(supportedFinal.ensemble?.decision.selected_candidate_id, "CAND-0001");

  const unsupported = await startCampaign("Prove that every prime number has a twin prime.", "phase23-integrity-unsupported");
  const unsupportedFinal = await tickToTerminal(unsupported.campaign.campaign_id, "phase23-integrity-unsupported");
  assert.equal(unsupportedFinal.campaign.terminal_state, "blocked_with_replayable_reason");
  assert.equal(unsupportedFinal.campaign.stage_runs.at(-1).stage, "candidate_generation");
  assert.equal(unsupportedFinal.ensemble, undefined, "unsupported campaign must not return stale ensemble data from another campaign");

  const mismatch = await startCampaign("Prove in Lean that n * 0 = 0 for natural numbers.", "phase23-integrity-mismatch");
  const mismatchStatus = readCampaignStatus(mismatch.campaign.campaign_id);
  mismatchStatus.open_obligations[0].locked_statement_structured.theorem_family = "nat_add_zero";
  writeCampaignStatus(mismatch.campaign.campaign_id, mismatchStatus);
  const mismatchFinal = await tickToTerminal(mismatch.campaign.campaign_id, "phase23-integrity-mismatch");
  assert.equal(mismatchFinal.campaign.terminal_state, "blocked_with_replayable_reason");
  assert.equal(mismatchFinal.campaign.stage_runs.at(-1).stage, "candidate_generation");
  assert.equal(mismatchFinal.final_replay, undefined);
  assert.equal(mismatchFinal.gate, undefined);
  const mismatchClaim = getClaim(projectRoot, mismatchFinal.campaign.project_id, mismatchFinal.campaign.root_claim_id);
  assert.equal(mismatchClaim.status, "conjectural");

  const refutation = await startCampaign("Prove in Lean that n + 1 = n for natural numbers.", "phase23-integrity-refute");
  const refutationFinal = await tickToTerminal(refutation.campaign.campaign_id, "phase23-integrity-refute");
  assert.equal(refutationFinal.campaign.terminal_state, "completed_refutation");
  const replay = await server.inject({
    method: "POST",
    path: `/campaign/${encodeURIComponent(refutation.campaign.campaign_id)}/replay`,
    body: {
      project_root: projectRoot,
      actor: "phase23-integrity-refute"
    }
  });
  assert.equal(replay.status, 200);
  assert.equal(replay.body.campaign.terminal_state, "completed_refutation");
  assert.equal(replay.body.final_replay, undefined);
  assert.equal(replay.body.blocker, "completed refutation campaigns do not have a proof replay");
  const persistedRefutation = getCampaign(projectRoot, refutation.campaign.campaign_id);
  assert.equal(persistedRefutation.terminal_state, "completed_refutation");
  assert.equal(persistedRefutation.current_stage, "completed_refutation");
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 23 GA integrity-boundary tests passed.");
