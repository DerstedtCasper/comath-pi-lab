import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createComathServer, writeCampaign } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task129-campaign-public-"));
const server = createComathServer();

const privilegedPublicTerms =
  /completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence/i;

function forgedCampaign() {
  const now = "2026-06-01T00:00:00.000Z";
  return {
    campaign_id: "CAM-0129",
    project_id: "PRJ-0129",
    root_claim_id: "C-0129",
    user_goal: "Public campaign read-models must not serialize stale proof authority.",
    current_stage: "completed_formal_proof",
    status: "terminal",
    strict_mode: true,
    terminal_state: "completed_formal_proof",
    stage_runs: [],
    open_obligations: [],
    accepted_artifacts: [],
    blockers: [
      {
        code: "STALE_PUBLIC_ROUTE_AUTHORITY",
        reason: "cached formal_proof_verified terminal state is not service-owned authority"
      },
      {
        nested: {
          target_status: "formally_checked",
          final_evidence_status: "verified_final_authority_evidence"
        }
      }
    ],
    next_actions: [
      "download evidence pack after formal_replay_passed",
      "treat lean_kernel_clean_replay as proof authority"
    ],
    formal_replay_authority_passed: true,
    formal_replay_authority_evidence: {
      schema_version: "comath.formal_replay_authority_evidence.v1",
      proof_authority: "lean_kernel_clean_replay",
      final_evidence_status: "verified_final_authority_evidence",
      final_replay_manifest_v3_path: ".comath/evidence/C-0129/lean/final_replay_manifest_v3.json",
      final_authority_packaging_path: ".comath/evidence/C-0129/lean/final_authority_packaging_v3.json",
      replay_id: "RPLY-0129",
      gate_result_id: "GR-0129",
      artifact_hash: "0".repeat(64),
      recorded_at: now
    },
    created_at: now,
    updated_at: now
  };
}

async function get(path) {
  const response = await server.inject({ method: "GET", path });
  assert.equal(response.status, 200);
  return response.body;
}

async function post(path) {
  const response = await server.inject({
    method: "POST",
    path,
    body: { project_root: projectRoot, actor: "goal3-task129" }
  });
  assert.equal(response.status, 200);
  return response.body;
}

function assertPublicBody(body, context) {
  assert.doesNotMatch(JSON.stringify(body), privilegedPublicTerms, context);
}

try {
  const campaign = writeCampaign(projectRoot, forgedCampaign(), "goal3-task129");
  const query = `project_root=${encodeURIComponent(projectRoot)}`;
  const campaignPath = `/campaign/${encodeURIComponent(campaign.campaign_id)}`;

  const status = await get(`${campaignPath}/status?${query}`);
  assert.equal(status.campaign.current_stage, "blocked");
  assert.equal(status.campaign.terminal_state, "blocked_with_replayable_reason");
  assert.equal(status.campaign.formal_replay_authority_passed, false);
  assert.equal("formal_replay_authority_evidence" in status.campaign, false);
  assertPublicBody(status, "campaign status route must sanitize stale authority vocabulary");

  const nextActions = await get(`${campaignPath}/next-actions?${query}`);
  assertPublicBody(nextActions, "campaign next-actions route must sanitize stale authority vocabulary");

  for (const route of ["pause", "resume", "cancel"]) {
    const routed = await post(`${campaignPath}/${route}`);
    assert.equal(routed.campaign.current_stage, "blocked");
    assert.equal(routed.campaign.terminal_state, "blocked_with_replayable_reason");
    assertPublicBody(routed, `campaign ${route} route must sanitize stale terminal authority vocabulary`);
  }
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 129 campaign public read-model authority sanitizer test passed.");
