import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createComathServer, getClaim } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-v3-formal-slice-"));
const server = createComathServer();

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

async function tickToTerminal(campaignId) {
  let last = null;
  for (let index = 0; index < 16; index += 1) {
    const tick = await server.inject({
      method: "POST",
      path: `/campaign/${encodeURIComponent(campaignId)}/tick`,
      body: {
        project_root: projectRoot,
        actor: "phase67-v3-slice"
      }
    });
    assert.equal(tick.status, 200);
    last = tick.body;
    if (tick.body.campaign.status === "terminal") {
      return last;
    }
  }
  assert.fail("v3 formal campaign slice did not reach terminal state");
}

try {
  const start = await server.inject({
    method: "POST",
    path: "/campaign/start",
    body: {
      project_root: projectRoot,
      project_name: "Task 11 v3 Formal Campaign Slice",
      user_goal: "Prove in Lean that n + 0 = n for natural numbers.",
      domain: "elementary",
      strict_mode: true,
      actor: "phase67-v3-slice"
    }
  });
  assert.equal(start.status, 200);

  const campaignId = start.body.campaign.campaign_id;
  const claimId = start.body.campaign.root_claim_id;
  const finalTick = await tickToTerminal(campaignId);

  assert.equal(finalTick.campaign.status, "terminal");
  assert.equal(finalTick.campaign.current_stage, "blocked");
  assert.equal(finalTick.campaign.terminal_state, "blocked_with_replayable_reason");
  assert.equal(finalTick.final_replay, undefined);
  assert.equal(finalTick.static_audit, undefined);
  assert.equal(finalTick.gate, undefined);

  const planningRel = `.comath/campaign/${campaignId}/broad_synthesis_plan.json`;
  const failureRel = `.comath/campaign/${campaignId}/broad_synthesis_failure.json`;
  assert.equal(existsSync(join(projectRoot, planningRel)), true);
  assert.equal(existsSync(join(projectRoot, failureRel)), true);

  const failure = readJson(join(projectRoot, failureRel));
  assert.equal(failure.reason, "broad theorem synthesis requires checked replay target");
  assert.equal(failure.proof_authority, "none");
  assert.equal(failure.can_promote_claim, false);

  const claim = getClaim(projectRoot, finalTick.campaign.project_id, claimId);
  assert.equal(claim.status, "conjectural");

  const replay = await server.inject({
    method: "POST",
    path: `/campaign/${encodeURIComponent(campaignId)}/replay`,
    body: {
      project_root: projectRoot,
      actor: "phase67-v3-slice"
    }
  });
  assert.equal(replay.status, 200);
  assert.equal(replay.body.final_replay, undefined);
  assert.equal(replay.body.blocker, "broad theorem synthesis requires checked replay target");
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 67 v3 formal campaign slice tests passed.");
