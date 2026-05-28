import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createComathServer } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-final-replay-paths-"));
const server = createComathServer();

async function startCampaign(goal, actor) {
  const start = await server.inject({
    method: "POST",
    path: "/campaign/start",
    body: {
      project_root: projectRoot,
      project_name: "Final Replay Artifact Paths",
      user_goal: goal,
      domain: "elementary",
      strict_mode: true,
      actor
    }
  });
  assert.equal(start.status, 200);
  return start.body;
}

async function runToTerminal(campaignId, actor) {
  let body = null;
  for (let i = 0; i < 16; i += 1) {
    const tick = await server.inject({
      method: "POST",
      path: `/campaign/${encodeURIComponent(campaignId)}/tick`,
      body: { project_root: projectRoot, actor }
    });
    assert.equal(tick.status, 200);
    body = tick.body;
    if (body.campaign.status === "terminal") {
      return body;
    }
  }
  assert.fail(`campaign ${campaignId} did not reach a terminal state`);
}

try {
  await startCampaign("Prove in Lean that n + 0 = n for natural numbers.", "phase35-add");
  const second = await startCampaign("Prove in Lean that n * 0 = 0 for natural numbers.", "phase35-mul");
  const secondClaimId = second.campaign.root_claim_id;
  assert.notEqual(secondClaimId, "C-0001", "test requires a non-default claim id to catch hardcoded paths");

  const final = await runToTerminal(second.campaign.campaign_id, "phase35-mul");
  assert.equal(final.campaign.current_stage, "completed_formal_proof");
  assert.equal(final.final_replay?.claim_id, secondClaimId);
  const finalReplayRun = final.campaign.stage_runs.find((run) => run.stage === "final_global_replay");
  assert.ok(finalReplayRun, "final replay stage run should be recorded");
  assert.deepEqual(finalReplayRun.artifact_paths, [
    `.comath/evidence/${secondClaimId}/lean/final_replay.log`,
    `.comath/evidence/${secondClaimId}/lean/final_static_audit.json`,
    `.comath/evidence/${secondClaimId}/lean/axiom_profile.json`,
    `.comath/evidence/${secondClaimId}/lean/dependency_closure.json`,
    `.comath/evidence/${secondClaimId}/lean/statement_equivalence.json`,
    `.comath/evidence/${secondClaimId}/lean/final_replay_manifest.json`
  ]);
  const memoryRun = final.campaign.stage_runs.find((run) => run.stage === "memory_update");
  assert.ok(memoryRun, "memory update stage run should be recorded");
  assert.deepEqual(memoryRun.artifact_paths, [
    ".comath/memory/proof_memory_events.jsonl",
    ".comath/context_lake/shards/final-handoff.md",
    ".comath/snapshots/replay/final_manifest.json"
  ]);
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 35 final replay artifact path tests passed.");
