import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createComathServer, getClaim } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-ga-campaign-"));
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
      project_name: "GA Vertical Slice",
      user_goal: "Prove in Lean that n + 0 = n for natural numbers.",
      domain: "elementary",
      strict_mode: true,
      actor: "phase18-test"
    }
  });
  assert.equal(start.status, 200);
  assert.match(start.body.campaign.campaign_id, /^CAM-\d{4,}$/);
  assert.equal(start.body.campaign.status, "running");
  assert.equal(start.body.campaign.current_stage, "problem_lock");
  assert.match(start.body.campaign.root_claim_id, /^C-\d{4,}$/);
  assert.equal(existsSync(join(projectRoot, ".comath", "lock", "problem_lock.md")), true);
  assert.equal(existsSync(join(projectRoot, ".comath", "lock", "assumptions.md")), true);
  assert.equal(existsSync(join(projectRoot, ".comath", "lock", "notation.md")), true);
  assert.equal(existsSync(join(projectRoot, ".comath", "goals.yaml")), true);

  const campaignId = start.body.campaign.campaign_id;
  const claimId = start.body.campaign.root_claim_id;
  const statusPath = join(projectRoot, ".comath", "campaign", campaignId, "status.json");
  assert.equal(existsSync(statusPath), true);

  const nextActions = await server.inject({
    method: "GET",
    path: `/campaign/${encodeURIComponent(campaignId)}/next-actions?project_root=${encodeURIComponent(projectRoot)}`
  });
  assert.equal(nextActions.status, 200);
  assert.equal(nextActions.body.next_actions.length > 0, true);

  const seenStages = new Set();
  let finalTick = null;
  for (let i = 0; i < 12; i += 1) {
    const tick = await server.inject({
      method: "POST",
      path: `/campaign/${encodeURIComponent(campaignId)}/tick`,
      body: {
        project_root: projectRoot,
        actor: "phase18-test"
      }
    });
    assert.equal(tick.status, 200);
    seenStages.add(tick.body.campaign.current_stage);
    finalTick = tick.body;
    if (tick.body.campaign.status === "terminal") {
      break;
    }
  }

  assert.ok(finalTick, "campaign ticks should return a final body");
  assert.equal(finalTick.campaign.status, "terminal");
  assert.equal(finalTick.campaign.terminal_state, "formal_proof_verified");
  assert.equal(finalTick.gate?.result, "pass");
  assert.equal(finalTick.final_replay?.result, "pass");
  assert.equal(finalTick.static_audit?.result, "pass");
  assert.equal(finalTick.ensemble?.candidates.length, 8);
  assert.equal(finalTick.ensemble?.decision.selected_candidate_id, "CAND-0001");
  assert.equal(seenStages.has("lemma_sprint"), true);
  assert.equal(seenStages.has("final_global_lean_replay"), true);

  const claim = getClaim(projectRoot, finalTick.campaign.project_id, claimId);
  assert.ok(claim);
  assert.equal(claim.status, "formally_checked");
  assert.equal(claim.evidence_level, 5);
  assert.equal(claim.formalization_status, "kernel_checked");
  assert.equal(claim.dependency_closure_status, "all_dependencies_present");
  assert.equal(claim.audit_state, "audit_passed");

  const persisted = readJson(statusPath);
  assert.equal(persisted.terminal_state, "formal_proof_verified");
  assert.equal(existsSync(join(projectRoot, ".comath", "lean", "MathResearch", "C0001.lean")), true);
  assert.equal(existsSync(join(projectRoot, ".comath", "lean", "FormalSpec", "C0001.json")), true);
  assert.equal(existsSync(join(projectRoot, ".comath", "lean", "Audit", "C0001.lean")), true);
  assert.equal(existsSync(join(projectRoot, ".comath", "evidence", claimId, "lean", "final_replay_manifest.json")), true);
  assert.equal(existsSync(join(projectRoot, ".comath", "ensembles", "lemma_sprint", "PO-0001", "candidates", "V1_direct_formalist", "candidate_manifest.json")), true);
  assert.equal(existsSync(join(projectRoot, ".comath", "proof_memory", "events.jsonl")), true);

  const replay = await server.inject({
    method: "POST",
    path: `/campaign/${encodeURIComponent(campaignId)}/replay`,
    body: {
      project_root: projectRoot,
      actor: "phase18-test"
    }
  });
  assert.equal(replay.status, 200);
  assert.equal(replay.body.final_replay.result, "pass");
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 18 GA campaign vertical slice tests passed.");
