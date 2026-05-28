import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createComathServer, getClaim } from "../../dist/index.js";

async function startCampaign(server, projectRoot, actor) {
  const response = await server.inject({
    method: "POST",
    path: "/campaign/start",
    body: {
      project_root: projectRoot,
      project_name: "Phase 71 stage gate repair resume",
      user_goal: "Prove in Lean that n + 0 = n for natural numbers.",
      domain: "elementary",
      strict_mode: true,
      actor
    }
  });
  assert.equal(response.status, 200);
  return response.body.campaign;
}

async function tick(server, projectRoot, campaignId, actor) {
  const response = await server.inject({
    method: "POST",
    path: `/campaign/${encodeURIComponent(campaignId)}/tick`,
    body: { project_root: projectRoot, actor }
  });
  assert.equal(response.status, 200);
  return response.body;
}

async function runUntil(server, projectRoot, campaignId, actor, predicate) {
  let body;
  for (let index = 0; index < 24; index += 1) {
    body = await tick(server, projectRoot, campaignId, actor);
    if (predicate(body.campaign)) {
      return body;
    }
  }
  assert.fail(`campaign ${campaignId} did not reach expected state`);
}

function readStatus(projectRoot, campaignId) {
  return JSON.parse(readFileSync(join(projectRoot, ".comath", "campaign", campaignId, "status.json"), "utf8"));
}

const projectRoot = mkdtempSync(join(tmpdir(), "comath-phase71-repair-resume-"));
const server = createComathServer();

try {
  const start = await startCampaign(server, projectRoot, "phase71");
  const generated = await runUntil(
    server,
    projectRoot,
    start.campaign_id,
    "phase71",
    (campaign) => campaign.current_stage === "candidate_generation"
  );

  const campaignId = generated.campaign.campaign_id;
  const lineMapRel = `.comath/campaign/${campaignId}/proof/line_map.json`;
  const originalLineMap = readFileSync(join(projectRoot, lineMapRel), "utf8");
  rmSync(join(projectRoot, lineMapRel), { force: true });

  const blocked = await tick(server, projectRoot, campaignId, "phase71");
  assert.equal(blocked.campaign.status, "blocked");
  assert.equal(blocked.campaign.current_stage, "line_map_gate");
  assert.equal(blocked.blocker, "missing_required_stage_artifact");
  const blocker = blocked.campaign.blockers.at(-1);
  assert.equal(blocker.code, "MISSING_REQUIRED_STAGE_ARTIFACT");
  assert.deepEqual(blocker.missing_artifacts, [lineMapRel]);
  assert.equal(existsSync(join(projectRoot, blocker.artifact_path)), true);

  const normalResume = await server.inject({
    method: "POST",
    path: `/campaign/${encodeURIComponent(campaignId)}/resume`,
    body: { project_root: projectRoot, actor: "phase71" }
  });
  assert.equal(normalResume.status, 409);
  assert.equal(normalResume.body.code, "CAMPAIGN_REPAIR_REQUIRED");
  assert.equal(readStatus(projectRoot, campaignId).status, "blocked");

  const invalidRepair = await server.inject({
    method: "POST",
    path: `/campaign/${encodeURIComponent(campaignId)}/repair-resume`,
    body: {
      project_root: projectRoot,
      actor: "phase71",
      blocker_artifact_path: blocker.artifact_path,
      repaired_artifacts: [lineMapRel]
    }
  });
  assert.equal(invalidRepair.status, 409);
  assert.equal(invalidRepair.body.code, "CAMPAIGN_REPAIR_INCOMPLETE");
  assert.equal(readStatus(projectRoot, campaignId).status, "blocked");

  const mismatchedRepair = await server.inject({
    method: "POST",
    path: `/campaign/${encodeURIComponent(campaignId)}/repair-resume`,
    body: {
      project_root: projectRoot,
      actor: "phase71",
      blocker_artifact_path: blocker.artifact_path,
      repaired_artifacts: [lineMapRel, `.comath/campaign/${campaignId}/proof/not-required.json`]
    }
  });
  assert.equal(mismatchedRepair.status, 409);
  assert.equal(mismatchedRepair.body.code, "CAMPAIGN_REPAIR_ARTIFACT_SET_MISMATCH");
  assert.equal(readStatus(projectRoot, campaignId).status, "blocked");

  mkdirSync(dirname(join(projectRoot, lineMapRel)), { recursive: true });
  writeFileSync(join(projectRoot, lineMapRel), originalLineMap, "utf8");

  const repaired = await server.inject({
    method: "POST",
    path: `/campaign/${encodeURIComponent(campaignId)}/repair-resume`,
    body: {
      project_root: projectRoot,
      actor: "phase71",
      blocker_artifact_path: blocker.artifact_path,
      repaired_artifacts: [lineMapRel]
    }
  });
  assert.equal(repaired.status, 200);
  assert.equal(repaired.body.repair.status, "accepted");
  assert.equal(repaired.body.repair.rewind_target, "line_map_gate");
  assert.equal(repaired.body.campaign.status, "running");
  assert.equal(repaired.body.campaign.current_stage, "line_map_gate");
  assert.equal(repaired.body.campaign.terminal_state, undefined);
  assert.equal(repaired.body.campaign.blockers.at(-1).resolved, true);
  assert.deepEqual(repaired.body.campaign.accepted_artifacts, blocked.campaign.accepted_artifacts);
  assert.equal(getClaim(projectRoot, repaired.body.campaign.project_id, repaired.body.campaign.root_claim_id).status, "conjectural");

  const repairPayload = JSON.parse(readFileSync(join(projectRoot, repaired.body.repair.repair_artifact_path), "utf8"));
  assert.equal(repairPayload.proof_authority, "none");
  assert.equal(repairPayload.can_promote_claim, false);

  const continued = await tick(server, projectRoot, campaignId, "phase71");
  assert.equal(continued.campaign.current_stage, "candidate_generation");
  assert.equal(continued.campaign.status, "running");
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 71 stage-gate repair/resume tests passed.");
