import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createComathServer, exportCampaignGoalModeEvidence, writeCampaign } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task127-export-sanitizer-"));
const server = createComathServer();

const privilegedPublicTerms =
  /completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence/i;

function forgedExportCampaign() {
  const now = "2026-06-01T00:00:00.000Z";
  return {
    campaign_id: "CAM-0127",
    project_id: "PRJ-0127",
    root_claim_id: "C-0127",
    user_goal: "Export endpoints must not serialize stale proof authority.",
    current_stage: "completed_formal_proof",
    status: "terminal",
    strict_mode: true,
    terminal_state: "completed_formal_proof",
    stage_runs: [],
    open_obligations: [],
    accepted_artifacts: [],
    blockers: [
      {
        code: "STALE_PUBLIC_EXPORT_AUTHORITY",
        reason: "cached formal_proof_verified terminal state is not service-owned authority"
      },
      {
      nested: {
          target_status: "formally_checked",
          stale_status: "formal_replay_passed",
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
      final_replay_manifest_v3_path: ".comath/evidence/C-0127/lean/final_replay_manifest_v3.json",
      final_authority_packaging_path: ".comath/evidence/C-0127/lean/final_authority_packaging_v3.json",
      replay_id: "RPLY-0127",
      gate_result_id: "GR-0127",
      artifact_hash: "0".repeat(64),
      recorded_at: now
    },
    created_at: now,
    updated_at: now
  };
}

try {
  const campaign = writeCampaign(projectRoot, forgedExportCampaign(), "goal3-task127-forged-export");

  const direct = exportCampaignGoalModeEvidence({
    project_root: projectRoot,
    campaign_id: campaign.campaign_id,
    actor: "goal3-task127"
  });
  assert.equal(direct.export_manifest.evidence_pack_ready, false);
  assert.equal(direct.export_manifest.proof_authority, "none");
  assert.equal(direct.export_manifest.terminal_state, "blocked_with_replayable_reason");
  assert.equal(direct.export_manifest.current_stage, "blocked");
  assert.doesNotMatch(
    JSON.stringify(direct.export_manifest),
    privilegedPublicTerms,
    "public export manifest must not leak stale proof-authority vocabulary when final replay packaging is not verified"
  );

  const routed = await server.inject({
    method: "GET",
    path: `/campaign/${encodeURIComponent(campaign.campaign_id)}/export?project_root=${encodeURIComponent(projectRoot)}&actor=goal3-task127`
  });
  assert.equal(routed.status, 200);
  assert.equal(routed.body.export_manifest.evidence_pack_ready, false);
  assert.equal(routed.body.export_manifest.proof_authority, "none");
  assert.doesNotMatch(
    JSON.stringify(routed.body.export_manifest),
    privilegedPublicTerms,
    "route export manifest must use the same public sanitizer as direct export"
  );
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 127 campaign export public authority sanitizer test passed.");
