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

  assert.equal(finalTick.campaign.current_stage, "completed_formal_proof");
  assert.equal(finalTick.final_replay.result, "pass");
  assert.equal(finalTick.static_audit.result, "pass");

  const summaryPath = join(projectRoot, ".comath", "campaign", campaignId, "v3_formal_campaign_slice.json");
  assert.equal(existsSync(summaryPath), true, "v3 formal campaign slice summary artifact must exist");

  const summary = readJson(summaryPath);
  assert.equal(summary.schema_version, "comath.v3.formal_campaign_slice.v1");
  assert.equal(summary.user_goal, "Prove in Lean that n + 0 = n for natural numbers.");
  assert.equal(summary.campaign_id, campaignId);
  assert.equal(summary.claim_id, claimId);
  assert.equal(summary.theorem_family, "nat_add_zero");
  assert.equal(summary.canonical_proposition, "n + 0 = n");
  assert.equal(summary.terminal_state, "completed_formal_proof");
  assert.equal(summary.final_claim_status, "formally_checked");
  assert.equal(summary.proof_authority, "lean_clean_replay");

  const requiredStages = [
    "problem_locked",
    "knowledge_pack",
    "notation_gate",
    "skeleton_gate",
    "line_map_gate",
    "candidate_generation",
    "candidate_verification",
    "candidate_arbitration",
    "refutation_red_team",
    "integration_refactor",
    "final_static_audit",
    "final_global_replay",
    "memory_update"
  ];
  assert.deepEqual(summary.stage_sequence, requiredStages);
  assert.equal(summary.candidate_summary.total_candidates, 8);
  assert.equal(summary.candidate_summary.selected_candidate_id, "CAND-0001");
  assert.equal(summary.candidate_summary.selection_mode, "evidence_weighted");
  assert.equal(summary.candidate_summary.trivial_bypass_logged, false);
  assert.equal(summary.final_audit.result, "pass");
  assert.equal(summary.clean_replay.result, "pass");
  assert.equal(summary.clean_replay.replay_command, finalTick.final_replay.command);
  assert.match(summary.clean_replay.replay_command, /^(lake build\b|lake env lean\b)/);
  assert.equal(summary.promotion.result, "pass");
  assert.equal(summary.replayable_artifact_bundle.final_replay_manifest.endsWith("final_replay_manifest.json"), true);
  assert.equal(summary.replayable_artifact_bundle.final_static_audit.endsWith("final_static_audit.json"), true);
  assert.equal(summary.replayable_artifact_bundle.proof_memory_events, ".comath/memory/proof_memory_events.jsonl");

  for (const relPath of Object.values(summary.replayable_artifact_bundle)) {
    assert.equal(existsSync(join(projectRoot, relPath)), true, `${relPath} must exist`);
  }

  const claim = getClaim(projectRoot, finalTick.campaign.project_id, claimId);
  assert.equal(claim.status, "formally_checked");

  const replay = await server.inject({
    method: "POST",
    path: `/campaign/${encodeURIComponent(campaignId)}/replay`,
    body: {
      project_root: projectRoot,
      actor: "phase67-v3-slice"
    }
  });
  assert.equal(replay.status, 200);
  assert.equal(replay.body.final_replay.result, "pass");
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 67 v3 formal campaign slice tests passed.");
