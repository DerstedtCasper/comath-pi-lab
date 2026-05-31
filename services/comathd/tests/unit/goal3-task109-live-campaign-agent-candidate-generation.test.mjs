import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createComathServer, getClaim } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task109-live-agent-candidates-"));
const server = createComathServer();

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(projectRoot, relativePath), "utf8"));
}

async function tick(campaignId) {
  const response = await server.inject({
    method: "POST",
    path: `/campaign/${encodeURIComponent(campaignId)}/tick`,
    body: {
      project_root: projectRoot,
      actor: "goal3-task109"
    }
  });
  assert.equal(response.status, 200);
  return response.body;
}

try {
  const start = await server.inject({
    method: "POST",
    path: "/campaign/start",
    body: {
      project_root: projectRoot,
      project_name: "Goal 3 Task 109 Live Candidate Generation",
      user_goal: "Prove in Lean that every group has a left identity.",
      domain: "algebra",
      strict_mode: true,
      actor: "goal3-task109"
    }
  });
  assert.equal(start.status, 200);

  const campaignId = start.body.campaign.campaign_id;
  const claimId = start.body.campaign.root_claim_id;
  const statementHash = start.body.obligation.statement_hash;

  let body = start.body;
  for (let index = 0; index < 5; index += 1) {
    body = await tick(campaignId);
    if (body.campaign.current_stage === "candidate_generation") {
      break;
    }
  }
  assert.equal(body.campaign.current_stage, "candidate_generation");

  const requestRel = `.comath/campaign/${campaignId}/candidate_generation_request.json`;
  const requestPath = join(projectRoot, requestRel);
  mkdirSync(dirname(requestPath), { recursive: true });
  writeFileSync(
    requestPath,
    `${JSON.stringify(
      {
        schema_version: "comath.native_agent_candidate_generation_request.v1",
        campaign_id: campaignId,
        claim_id: claimId,
        obligation_id: "PO-0001",
        locked_statement_hash: statementHash,
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

  const generated = await tick(campaignId);
  assert.equal(generated.campaign.status, "running");
  assert.equal(generated.campaign.current_stage, "candidate_verification");
  assert.equal(generated.campaign.open_obligations[0].status, "candidate_search");

  const ensembleRoot = `.comath/campaign/${campaignId}/ensembles/lemma_sprint/PO-0001`;
  const candidatesRel = `${ensembleRoot}/candidates.json`;
  const generationRel = `.comath/campaign/${campaignId}/candidate_generation.json`;
  assert.equal(existsSync(join(projectRoot, candidatesRel)), true);
  assert.equal(existsSync(join(projectRoot, generationRel)), true);

  const candidates = readJson(candidatesRel);
  assert.equal(candidates.length, 8);
  assert.equal(new Set(candidates.map((candidate) => candidate.variant_id)).size, 8);
  assert.equal(candidates.every((candidate) => candidate.campaign_id === campaignId), true);
  assert.equal(candidates.every((candidate) => candidate.obligation_id === "PO-0001"), true);
  assert.equal(candidates.every((candidate) => candidate.locked_statement_hash === statementHash), true);
  assert.equal(candidates.every((candidate) => candidate.candidate_statement_hash === statementHash), true);
  assert.equal(candidates.every((candidate) => candidate.state === "candidate_plausible_only"), true);
  assert.equal(candidates.every((candidate) => !candidate.replay_command), true);

  for (const candidate of candidates) {
    assert.equal(
      candidate.workspace_path.startsWith(`${ensembleRoot}/candidates/`),
      true,
      "live agent candidates must be written in campaign-scoped candidate workspaces"
    );
    const manifest = readJson(candidate.manifest_path);
    assert.equal(manifest.candidate_id, candidate.candidate_id);
    assert.equal(manifest.proof_authority, undefined);
    assert.equal(manifest.statement_equivalence_claim, "exact");
    assert.equal(manifest.locked_statement_hash, statementHash);
    assert.equal(manifest.candidate_statement_hash, statementHash);
    assert.deepEqual(manifest.evidence, []);
    assert.equal(manifest.replay_command, "");
    assert.equal(existsSync(join(projectRoot, candidate.workspace_path, "task_card.json")), true);
    assert.equal(existsSync(join(projectRoot, candidate.workspace_path, "agent_output.json")), true);
    assert.equal(existsSync(join(projectRoot, candidate.workspace_path, "agent_stage_log.jsonl")), true);
  }

  const generation = readJson(generationRel);
  assert.equal(generation.schema_version, "comath.live_candidate_generation.v1");
  assert.equal(generation.campaign_id, campaignId);
  assert.equal(generation.claim_id, claimId);
  assert.equal(generation.obligation_id, "PO-0001");
  assert.equal(generation.total_candidates, 8);
  assert.equal(generation.kernel_checked_candidates, 0);
  assert.equal(generation.proof_authority, "none");
  assert.equal(generation.can_promote_claim, false);
  assert.equal(generation.source_request_path, requestRel);

  const verified = await tick(campaignId);
  assert.equal(verified.campaign.current_stage, "candidate_arbitration");
  const verificationRel = `.comath/campaign/${campaignId}/candidate_verification.json`;
  const verification = readJson(verificationRel);
  assert.equal(verification.total_candidates, 8);
  assert.equal(verification.kernel_checked_candidates, 0);
  assert.equal(verification.all_statement_hashes_match, true);
  assert.equal(verification.unique_variant_count, 8);
  assert.equal(verification.all_required_variants_present, true);
  assert.equal(verification.all_manifest_paths_present, true);
  assert.equal(verification.proof_authority, "none");
  assert.equal(verification.can_promote_claim, false);

  const claim = getClaim(projectRoot, generated.campaign.project_id, claimId);
  assert.equal(claim.status, "conjectural");

  const tamperedStart = await server.inject({
    method: "POST",
    path: "/campaign/start",
    body: {
      project_root: projectRoot,
      project_name: "Goal 3 Task 109 Tampered Candidate Batch",
      user_goal: "Prove in Lean that every monoid has an identity.",
      domain: "algebra",
      strict_mode: true,
      actor: "goal3-task109"
    }
  });
  assert.equal(tamperedStart.status, 200);
  const tamperedCampaignId = tamperedStart.body.campaign.campaign_id;
  let tampered = tamperedStart.body;
  for (let index = 0; index < 5; index += 1) {
    tampered = await tick(tamperedCampaignId);
    if (tampered.campaign.current_stage === "candidate_generation") {
      break;
    }
  }
  assert.equal(tampered.campaign.current_stage, "candidate_generation");
  const tamperedObligation = tampered.campaign.open_obligations[0];
  const tamperedRequestRel = `.comath/campaign/${tamperedCampaignId}/candidate_generation_request.json`;
  const tamperedRequestPath = join(projectRoot, tamperedRequestRel);
  mkdirSync(dirname(tamperedRequestPath), { recursive: true });
  writeFileSync(
    tamperedRequestPath,
    `${JSON.stringify(
      {
        schema_version: "comath.native_agent_candidate_generation_request.v1",
        campaign_id: tamperedCampaignId,
        claim_id: tampered.campaign.root_claim_id,
        obligation_id: tamperedObligation.obligation_id,
        locked_statement_hash: tamperedObligation.statement_hash,
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
  const tamperedGenerated = await tick(tamperedCampaignId);
  assert.equal(tamperedGenerated.campaign.current_stage, "candidate_verification");
  const tamperedCandidatesRel = `.comath/campaign/${tamperedCampaignId}/ensembles/lemma_sprint/PO-0001/candidates.json`;
  const tamperedCandidates = readJson(tamperedCandidatesRel);
  writeFileSync(join(projectRoot, tamperedCandidatesRel), `${JSON.stringify(tamperedCandidates.slice(0, 7), null, 2)}\n`, "utf8");
  const tamperedVerified = await tick(tamperedCampaignId);
  assert.equal(tamperedVerified.campaign.status, "terminal");
  assert.equal(tamperedVerified.campaign.terminal_state, "blocked_with_replayable_reason");
  assert.match(tamperedVerified.campaign.blockers[0].reason, /native candidate verification failed/);

  const broadStart = await server.inject({
    method: "POST",
    path: "/campaign/start",
    body: {
      project_root: projectRoot,
      project_name: "Goal 3 Task 109 Broad Fallback",
      user_goal: "Prove that every prime number has a twin prime.",
      domain: "number_theory",
      strict_mode: true,
      actor: "goal3-task109"
    }
  });
  assert.equal(broadStart.status, 200);
  const broadCampaignId = broadStart.body.campaign.campaign_id;
  let broad = broadStart.body;
  for (let index = 0; index < 8; index += 1) {
    broad = await tick(broadCampaignId);
    if (broad.campaign.status === "terminal") {
      break;
    }
  }
  assert.equal(broad.campaign.status, "terminal");
  assert.equal(broad.campaign.terminal_state, "blocked_with_replayable_reason");
  assert.equal(broad.campaign.blockers[0].reason, "broad theorem synthesis requires checked replay target");
  assert.equal(existsSync(join(projectRoot, `.comath/campaign/${broadCampaignId}/ensembles/lemma_sprint/PO-0001/candidates.json`)), false);
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 109 live campaign agent candidate generation test passed.");
