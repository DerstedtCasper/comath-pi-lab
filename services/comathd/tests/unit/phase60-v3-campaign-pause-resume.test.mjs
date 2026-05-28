import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createComathServer } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-v3-campaign-pause-"));
const server = createComathServer();

function readStatus(campaignId) {
  return JSON.parse(readFileSync(join(projectRoot, ".comath", "campaign", campaignId, "status.json"), "utf8"));
}

try {
  const start = await server.inject({
    method: "POST",
    path: "/campaign/start",
    body: {
      project_root: projectRoot,
      project_name: "v3 Campaign Pause Contract",
      user_goal: "Prove in Lean that n + 0 = n for natural numbers.",
      domain: "elementary",
      strict_mode: true,
      actor: "phase60-pause"
    }
  });
  assert.equal(start.status, 200);
  const campaignId = start.body.campaign.campaign_id;
  const statusPath = join(projectRoot, ".comath", "campaign", campaignId, "status.json");
  assert.equal(existsSync(statusPath), true);

  const pause = await server.inject({
    method: "POST",
    path: `/campaign/${encodeURIComponent(campaignId)}/pause`,
    body: {
      project_root: projectRoot,
      actor: "phase60-pause"
    }
  });
  assert.equal(pause.status, 200);
  assert.equal(pause.body.campaign.status, "paused");
  assert.equal(pause.body.campaign.current_stage, "problem_locked");

  const pausedBeforeTick = readStatus(campaignId);
  const tickWhilePaused = await server.inject({
    method: "POST",
    path: `/campaign/${encodeURIComponent(campaignId)}/tick`,
    body: {
      project_root: projectRoot,
      actor: "phase60-pause"
    }
  });
  assert.equal(tickWhilePaused.status, 409);
  assert.equal(tickWhilePaused.body.code, "CAMPAIGN_PAUSED");

  const pausedAfterRejectedTick = readStatus(campaignId);
  assert.equal(pausedAfterRejectedTick.status, "paused");
  assert.equal(pausedAfterRejectedTick.current_stage, pausedBeforeTick.current_stage);
  assert.equal(pausedAfterRejectedTick.stage_runs.length, pausedBeforeTick.stage_runs.length);
  assert.equal(
    existsSync(join(projectRoot, ".comath", "proof", "obligations", "PO-0001.json")),
    false,
    "paused campaigns must not write the next stage artifact when tick is rejected"
  );

  const resume = await server.inject({
    method: "POST",
    path: `/campaign/${encodeURIComponent(campaignId)}/resume`,
    body: {
      project_root: projectRoot,
      actor: "phase60-pause"
    }
  });
  assert.equal(resume.status, 200);
  assert.equal(resume.body.campaign.status, "running");

  const tickAfterResume = await server.inject({
    method: "POST",
    path: `/campaign/${encodeURIComponent(campaignId)}/tick`,
    body: {
      project_root: projectRoot,
      actor: "phase60-pause"
    }
  });
  assert.equal(tickAfterResume.status, 200);
  assert.equal(tickAfterResume.body.campaign.current_stage, "knowledge_pack");
  assert.equal(existsSync(join(projectRoot, ".comath", "proof", "obligations", "PO-0001.json")), true);
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 60 v3 campaign pause/resume tests passed.");
