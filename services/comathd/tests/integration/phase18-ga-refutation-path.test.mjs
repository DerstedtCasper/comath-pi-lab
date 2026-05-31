import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createComathServer, getClaim } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-ga-refute-"));
const server = createComathServer();

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

try {
  const start = await server.inject({
    method: "POST",
    path: "/campaign/start",
    body: {
      project_root: projectRoot,
      project_name: "GA Refutation Slice",
      user_goal: "Prove in Lean that n + 1 = n for natural numbers.",
      domain: "elementary",
      strict_mode: true,
      actor: "phase18-refute"
    }
  });
  assert.equal(start.status, 200);
  assert.equal(start.body.obligation.locked_statement_nl, "Prove in Lean that n + 1 = n for natural numbers.");
  assert.deepEqual(start.body.obligation.locked_statement_structured, {});
  assert.deepEqual(start.body.obligation.assumptions, []);
  assert.equal(start.body.obligation.lean_target, undefined);

  const campaignId = start.body.campaign.campaign_id;
  const claimId = start.body.campaign.root_claim_id;
  let finalTick = null;
  for (let i = 0; i < 8; i += 1) {
    const tick = await server.inject({
      method: "POST",
      path: `/campaign/${encodeURIComponent(campaignId)}/tick`,
      body: {
        project_root: projectRoot,
        actor: "phase18-refute"
      }
    });
    assert.equal(tick.status, 200);
    finalTick = tick.body;
    if (tick.body.campaign.status === "terminal") {
      break;
    }
  }

  assert.ok(finalTick, "campaign ticks should return a body");
  assert.equal(finalTick.campaign.status, "terminal");
  assert.equal(finalTick.campaign.current_stage, "blocked");
  assert.equal(finalTick.campaign.terminal_state, "blocked_with_replayable_reason");
  assert.equal(finalTick.counterexample, undefined);
  assert.equal(finalTick.blocker, "native candidate arbitration requires proof-grade candidate evidence");
  assert.equal(finalTick.gate.result, "blocked");
  assert.equal(finalTick.gate.stage, "lemma_sprint");

  const claim = getClaim(projectRoot, finalTick.campaign.project_id, claimId);
  assert.equal(claim.status, "conjectural");

  const counterexamplePath = join(projectRoot, ".comath", "evidence", claimId, "counterexample", "CE-0001.json");
  assert.equal(existsSync(counterexamplePath), false);
  const failurePath = join(projectRoot, ".comath", "campaign", campaignId, "candidate_arbitration_blocker.json");
  assert.equal(existsSync(failurePath), true);
  const failure = readJson(failurePath);
  assert.equal(failure.proof_authority, "none");
  assert.equal(failure.can_promote_claim, false);
  assert.equal(failure.reason, "native candidate arbitration requires proof-grade candidate evidence");
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 18 GA refutation path no-reinvent tests passed.");
