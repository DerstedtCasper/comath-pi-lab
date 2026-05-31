import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createComathServer, getClaim } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task110-native-generation-request-"));
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
      actor: "goal3-task110"
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
      project_name: "Goal 3 Task 110 Native Generation Request",
      user_goal: "Prove in Lean that every semigroup has an associative operation.",
      domain: "algebra",
      strict_mode: true,
      actor: "goal3-task110"
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
  assert.equal(
    existsSync(join(projectRoot, requestRel)),
    true,
    "line_map_gate must produce the service-owned native candidate generation request"
  );
  const request = readJson(requestRel);
  assert.equal(request.schema_version, "comath.native_agent_candidate_generation_request.v1");
  assert.equal(request.campaign_id, campaignId);
  assert.equal(request.claim_id, claimId);
  assert.equal(request.obligation_id, "PO-0001");
  assert.equal(request.locked_statement_hash, statementHash);
  assert.equal(request.stage, "candidate_generation");
  assert.equal(request.requested_runner, "comathd.runGaAgentStageCandidates");
  assert.equal(request.proof_authority, "none");
  assert.equal(request.can_promote_claim, false);
  assert.equal(request.generated_by_stage, "line_map_gate");
  assert.equal(request.line_map_path, `.comath/campaign/${campaignId}/proof/line_map.json`);
  assert.match(request.line_map_sha256, /^[0-9a-f]{64}$/);
  assert.equal(request.obligation_path, `.comath/campaign/${campaignId}/proof/obligations/PO-0001.yaml`);
  assert.match(request.obligation_sha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(request.required_variants, ["V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8"]);
  const lineMapStage = body.campaign.stage_runs.find((run) => run.stage === "line_map_gate");
  assert.ok(lineMapStage?.artifact_paths.includes(requestRel));

  const generated = await tick(campaignId);
  assert.equal(generated.campaign.status, "running");
  assert.equal(generated.campaign.current_stage, "candidate_verification");
  const generation = readJson(`.comath/campaign/${campaignId}/candidate_generation.json`);
  assert.equal(generation.source_request_path, requestRel);
  assert.equal(generation.proof_authority, "none");
  assert.equal(generation.can_promote_claim, false);
  const claim = getClaim(projectRoot, generated.campaign.project_id, claimId);
  assert.equal(claim.status, "conjectural");
  const verified = await tick(campaignId);
  assert.equal(verified.campaign.current_stage, "candidate_arbitration");
  const blocked = await tick(campaignId);
  assert.equal(blocked.campaign.status, "terminal");
  assert.equal(blocked.campaign.terminal_state, "blocked_with_replayable_reason");
  assert.equal(blocked.blocker, "native candidate arbitration requires proof-grade candidate evidence");
  assert.equal(getClaim(projectRoot, generated.campaign.project_id, claimId).status, "conjectural");

  const tamperedStart = await server.inject({
    method: "POST",
    path: "/campaign/start",
    body: {
      project_root: projectRoot,
      project_name: "Goal 3 Task 110 Tampered Request",
      user_goal: "Prove in Lean that every ring has addition.",
      domain: "algebra",
      strict_mode: true,
      actor: "goal3-task110"
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
  const tamperedRequestRel = `.comath/campaign/${tamperedCampaignId}/candidate_generation_request.json`;
  const tamperedRequest = readJson(tamperedRequestRel);
  tamperedRequest.locked_statement_hash = "sha256:wrong-statement";
  writeFileSync(join(projectRoot, tamperedRequestRel), `${JSON.stringify(tamperedRequest, null, 2)}\n`, "utf8");

  const tamperedResult = await tick(tamperedCampaignId);
  assert.equal(tamperedResult.campaign.status, "terminal");
  assert.equal(tamperedResult.campaign.terminal_state, "blocked_with_replayable_reason");
  assert.match(tamperedResult.campaign.blockers[0].reason, /native candidate generation request failed/);

  const staleStart = await server.inject({
    method: "POST",
    path: "/campaign/start",
    body: {
      project_root: projectRoot,
      project_name: "Goal 3 Task 110 Stale Line Map",
      user_goal: "Prove in Lean that every module has zero.",
      domain: "algebra",
      strict_mode: true,
      actor: "goal3-task110"
    }
  });
  assert.equal(staleStart.status, 200);
  const staleCampaignId = staleStart.body.campaign.campaign_id;
  let stale = staleStart.body;
  for (let index = 0; index < 5; index += 1) {
    stale = await tick(staleCampaignId);
    if (stale.campaign.current_stage === "candidate_generation") {
      break;
    }
  }
  assert.equal(stale.campaign.current_stage, "candidate_generation");
  const staleLineMapRel = `.comath/campaign/${staleCampaignId}/proof/line_map.json`;
  writeFileSync(join(projectRoot, staleLineMapRel), `${JSON.stringify({ tampered: true }, null, 2)}\n`, "utf8");
  const staleResult = await tick(staleCampaignId);
  assert.equal(staleResult.campaign.status, "terminal");
  assert.equal(staleResult.campaign.terminal_state, "blocked_with_replayable_reason");
  assert.match(staleResult.campaign.blockers[0].reason, /native candidate generation request failed/);

  const driftStart = await server.inject({
    method: "POST",
    path: "/campaign/start",
    body: {
      project_root: projectRoot,
      project_name: "Goal 3 Task 110 Candidate Drift",
      user_goal: "Prove in Lean that every lattice has joins.",
      domain: "order",
      strict_mode: true,
      actor: "goal3-task110"
    }
  });
  assert.equal(driftStart.status, 200);
  const driftCampaignId = driftStart.body.campaign.campaign_id;
  let drift = driftStart.body;
  for (let index = 0; index < 6; index += 1) {
    drift = await tick(driftCampaignId);
    if (drift.campaign.current_stage === "candidate_verification") {
      break;
    }
  }
  assert.equal(drift.campaign.current_stage, "candidate_verification");
  const driftCandidatesRel = `.comath/campaign/${driftCampaignId}/ensembles/lemma_sprint/PO-0001/candidates.json`;
  const driftCandidates = readJson(driftCandidatesRel).map((candidate) => ({
    ...candidate,
    locked_statement_hash: "sha256:wrong-but-self-consistent",
    candidate_statement_hash: "sha256:wrong-but-self-consistent"
  }));
  writeFileSync(join(projectRoot, driftCandidatesRel), `${JSON.stringify(driftCandidates, null, 2)}\n`, "utf8");
  for (const candidate of driftCandidates) {
    const manifest = readJson(candidate.manifest_path);
    manifest.locked_statement_hash = "sha256:wrong-but-self-consistent";
    manifest.candidate_statement_hash = "sha256:wrong-but-self-consistent";
    writeFileSync(join(projectRoot, candidate.manifest_path), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  }
  const driftResult = await tick(driftCampaignId);
  assert.equal(driftResult.campaign.status, "terminal");
  assert.equal(driftResult.campaign.terminal_state, "blocked_with_replayable_reason");
  assert.match(driftResult.campaign.blockers[0].reason, /native candidate verification failed/);
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 110 planning native generation request test passed.");
