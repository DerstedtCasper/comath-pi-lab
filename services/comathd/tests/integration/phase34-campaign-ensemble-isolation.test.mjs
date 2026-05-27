import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createComathServer } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-campaign-ensemble-isolation-"));
const server = createComathServer();

async function startCampaign(goal, actor) {
  const start = await server.inject({
    method: "POST",
    path: "/campaign/start",
    body: {
      project_root: projectRoot,
      project_name: "Campaign Ensemble Isolation",
      user_goal: goal,
      domain: "elementary",
      strict_mode: true,
      actor
    }
  });
  assert.equal(start.status, 200);
  return start.body;
}

async function tick(campaignId, actor) {
  const response = await server.inject({
    method: "POST",
    path: `/campaign/${encodeURIComponent(campaignId)}/tick`,
    body: { project_root: projectRoot, actor }
  });
  assert.equal(response.status, 200);
  return response.body;
}

async function tickUntil(campaignId, actor, targetStage) {
  let body = null;
  for (let i = 0; i < 16; i += 1) {
    body = await tick(campaignId, actor);
    if (body.campaign.current_stage === targetStage || body.campaign.status === "terminal") {
      return body;
    }
  }
  assert.fail(`campaign ${campaignId} did not reach ${targetStage}`);
}

try {
  const add = await startCampaign("Prove in Lean that n + 0 = n for natural numbers.", "phase34-add");
  const mul = await startCampaign("Prove in Lean that n * 0 = 0 for natural numbers.", "phase34-mul");
  const addCampaignId = add.campaign.campaign_id;
  const mulCampaignId = mul.campaign.campaign_id;
  const addClaimHash = add.obligation.statement_hash;
  const mulClaimHash = mul.obligation.statement_hash;
  assert.notEqual(addCampaignId, mulCampaignId);
  assert.notEqual(addClaimHash, mulClaimHash);

  await tickUntil(addCampaignId, "phase34-add", "candidate_verification");
  await tickUntil(mulCampaignId, "phase34-mul", "candidate_verification");

  const addFinal = await tickUntil(addCampaignId, "phase34-add", "completed_formal_proof");
  assert.equal(addFinal.campaign.status, "terminal");
  assert.equal(addFinal.final_replay?.theorem_family, "nat_add_zero");
  assert.equal(addFinal.ensemble?.candidates.length, 8);
  assert.equal(
    addFinal.ensemble.candidates.every((candidate) => candidate.campaign_id === addCampaignId),
    true,
    "campaign A must not read campaign B candidate runs after interleaved ticks"
  );
  assert.equal(
    addFinal.ensemble.candidates.every((candidate) => candidate.locked_statement_hash === addClaimHash),
    true,
    "campaign A ensemble candidates must remain bound to campaign A statement hash"
  );
  assert.equal(
    addFinal.ensemble.candidates.every((candidate) =>
      candidate.workspace_path.startsWith(`.comath/campaign/${addCampaignId}/ensembles/lemma_sprint/PO-0001/candidates/`)
    ),
    true,
    "campaign A candidate workspaces must be campaign scoped"
  );

  const mulCandidatePath = join(
    projectRoot,
    ".comath",
    "campaign",
    mulCampaignId,
    "ensembles",
    "lemma_sprint",
    "PO-0001",
    "candidates",
    "V1_direct_formalist",
    "candidate_manifest.json"
  );
  assert.equal(existsSync(mulCandidatePath), true, "campaign B candidate manifest must remain in campaign B scope");
  assert.equal(
    existsSync(join(projectRoot, ".comath", "ensembles", "lemma_sprint", "PO-0001", "candidates.json")),
    false,
    "candidate batch index must not be written to the legacy global ensemble path"
  );
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 34 campaign ensemble isolation tests passed.");
