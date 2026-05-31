import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
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

function writeNativeGenerationRequest(campaign) {
  const obligation = campaign.open_obligations[0];
  const rel = `.comath/campaign/${campaign.campaign_id}/candidate_generation_request.json`;
  const path = join(projectRoot, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    `${JSON.stringify(
      {
        schema_version: "comath.native_agent_candidate_generation_request.v1",
        campaign_id: campaign.campaign_id,
        claim_id: campaign.root_claim_id,
        obligation_id: obligation.obligation_id,
        locked_statement_hash: obligation.statement_hash,
        stage: "candidate_generation",
        requested_runner: "comathd.runGaAgentStageCandidates",
        proof_authority: "none",
        can_promote_claim: false
      },
      null,
      2
    )}\n`,
    "utf8"
  );
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(projectRoot, relativePath), "utf8"));
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

  const addReady = await tickUntil(addCampaignId, "phase34-add", "candidate_generation");
  const mulReady = await tickUntil(mulCampaignId, "phase34-mul", "candidate_generation");
  writeNativeGenerationRequest(addReady.campaign);
  writeNativeGenerationRequest(mulReady.campaign);
  await tickUntil(addCampaignId, "phase34-add", "candidate_verification");
  await tickUntil(mulCampaignId, "phase34-mul", "candidate_verification");

  const addCandidates = readJson(`.comath/campaign/${addCampaignId}/ensembles/lemma_sprint/PO-0001/candidates.json`);
  assert.equal(addCandidates.length, 8);
  assert.equal(
    addCandidates.every((candidate) => candidate.campaign_id === addCampaignId),
    true,
    "campaign A must not read campaign B candidate runs after interleaved ticks"
  );
  assert.equal(
    addCandidates.every((candidate) => candidate.locked_statement_hash === addClaimHash),
    true,
    "campaign A ensemble candidates must remain bound to campaign A statement hash"
  );
  assert.equal(
    addCandidates.every((candidate) =>
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
