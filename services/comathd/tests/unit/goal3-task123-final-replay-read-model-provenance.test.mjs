import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createComathServer, exportCampaignGoalModeEvidence, writeCampaign } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task123-read-model-provenance-"));
const server = createComathServer();

function forgedCompletedCampaign() {
  const now = "2026-06-01T00:00:00.000Z";
  return {
    campaign_id: "CAM-0123",
    project_id: "PRJ-0123",
    root_claim_id: "C-0123",
    user_goal: "Forged read-model authority evidence must not project proof success.",
    current_stage: "completed_formal_proof",
    status: "terminal",
    strict_mode: true,
    terminal_state: "completed_formal_proof",
    stage_runs: [],
    open_obligations: [],
    accepted_artifacts: [],
    blockers: [],
    next_actions: [],
    formal_replay_authority_passed: true,
    formal_replay_authority_evidence: {
      schema_version: "comath.formal_replay_authority_evidence.v1",
      proof_authority: "lean_kernel_clean_replay",
      final_evidence_status: "verified_final_authority_evidence",
      final_replay_manifest_v3_path: ".comath/evidence/C-0123/lean/final_replay_manifest_v3.json",
      final_authority_packaging_path: ".comath/evidence/C-0123/lean/final_authority_packaging_v3.json",
      replay_id: "RPLY-0123",
      gate_result_id: "GR-0123",
      recorded_at: now
    },
    created_at: now,
    updated_at: now
  };
}

try {
  const campaign = writeCampaign(projectRoot, forgedCompletedCampaign(), "goal3-task123-forged-read-model");

  const status = await server.inject({
    method: "GET",
    path: `/campaign/${encodeURIComponent(campaign.campaign_id)}/status?project_root=${encodeURIComponent(projectRoot)}`
  });
  assert.equal(status.status, 200);
  assert.equal(
    status.body.campaign.external_v3_terminal_state,
    undefined,
    "status read-model must not project formal_proof_verified from an envelope without verified FinalReplayManifest registry/binary provenance"
  );
  assert.equal(
    status.body.campaign.goal_mode_terminal_state,
    undefined,
    "status read-model must not project formal_replay_passed from an envelope without verified FinalReplayManifest registry/binary provenance"
  );

  const exported = exportCampaignGoalModeEvidence({
    project_root: projectRoot,
    campaign_id: campaign.campaign_id,
    actor: "goal3-task123"
  });
  assert.equal(
    exported.export_manifest.evidence_pack_ready,
    false,
    "goal-mode export must not mark evidence packs ready from an unverified final replay authority envelope"
  );
  assert.equal(exported.export_manifest.proof_authority, "none");
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 123 final replay read-model provenance tests passed.");
