import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  exportCampaignGoalModeEvidence,
  projectExternalV3TerminalState,
  projectGoalModeTerminalState,
  withExternalV3TerminalState,
  writeCampaign
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task100-terminal-authority-"));

function campaign(overrides = {}) {
  const now = "2026-05-31T00:00:00.000Z";
  return {
    campaign_id: "CAM-0100",
    project_id: "PRJ-0100",
    root_claim_id: "C-0100",
    user_goal: "Legacy completed proof read-model fixture",
    current_stage: "completed_formal_proof",
    status: "terminal",
    strict_mode: true,
    terminal_state: "completed_formal_proof",
    stage_runs: [],
    open_obligations: [],
    accepted_artifacts: [],
    blockers: [],
    next_actions: [],
    created_at: now,
    updated_at: now,
    ...overrides
  };
}

function formalReplayAuthorityEvidence(overrides = {}) {
  return {
    schema_version: "comath.formal_replay_authority_evidence.v1",
    proof_authority: "lean_kernel_clean_replay",
    final_evidence_status: "verified_final_authority_evidence",
    final_replay_manifest_v3_path: ".comath/evidence/C-0100/lean/final_replay_manifest_v3.json",
    final_authority_packaging_path: ".comath/evidence/C-0100/lean/final_authority_packaging_v3.json",
    replay_id: "RPLY-0100",
    gate_result_id: "GR-0100",
    recorded_at: "2026-05-31T00:00:00.000Z",
    ...overrides
  };
}

try {
  const legacyCompleted = campaign();

  assert.equal(
    projectExternalV3TerminalState(legacyCompleted),
    undefined,
    "legacy completed_formal_proof without explicit final authority must not project proof success"
  );
  assert.equal(projectGoalModeTerminalState(legacyCompleted), undefined);

  const projected = withExternalV3TerminalState(legacyCompleted);
  assert.equal(projected.external_v3_terminal_state, undefined);
  assert.equal(projected.goal_mode_terminal_state, undefined);

  const unboundAuthorityFlag = campaign({ formal_replay_authority_passed: true });
  assert.equal(
    projectExternalV3TerminalState(unboundAuthorityFlag),
    undefined,
    "authority pass flag without explicit Lean Authority evidence must still fail closed"
  );
  assert.throws(
    () => writeCampaign(projectRoot, unboundAuthorityFlag, "goal3-task100-unbound-authority"),
    /formal_replay_authority_passed requires explicit formal_replay_authority_evidence/
  );

  const authorityBound = campaign({
    formal_replay_authority_passed: true,
    formal_replay_authority_evidence: formalReplayAuthorityEvidence()
  });
  assert.equal(projectExternalV3TerminalState(authorityBound), "formal_proof_verified");
  assert.equal(projectGoalModeTerminalState(authorityBound), "formal_replay_passed");

  const persisted = writeCampaign(projectRoot, legacyCompleted, "goal3-task100");
  assert.equal(persisted.formal_replay_authority_passed, false);
  const exported = exportCampaignGoalModeEvidence({
    project_root: projectRoot,
    campaign_id: persisted.campaign_id,
    actor: "goal3-task100"
  });
  assert.equal(exported.export_manifest.proof_authority, "none");
  assert.equal(exported.export_manifest.can_promote_claim, false);
  assert.equal(
    exported.export_manifest.evidence_pack_ready,
    false,
    "goal-mode export must not mark a proof evidence pack ready without final Lean Authority pass evidence"
  );

  const authorityPersisted = writeCampaign(
    projectRoot,
    campaign({
      campaign_id: "CAM-0101",
      formal_replay_authority_passed: true,
      formal_replay_authority_evidence: formalReplayAuthorityEvidence({ replay_id: "RPLY-0101" })
    }),
    "goal3-task100-authority"
  );
  const authorityExported = exportCampaignGoalModeEvidence({
    project_root: projectRoot,
    campaign_id: authorityPersisted.campaign_id,
    actor: "goal3-task100-authority"
  });
  assert.equal(authorityExported.export_manifest.evidence_pack_ready, true);
  const authorityProjected = withExternalV3TerminalState(authorityPersisted);
  assert.equal(authorityProjected.external_v3_terminal_state, "formal_proof_verified");
  assert.equal(authorityProjected.goal_mode_terminal_state, "formal_replay_passed");
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 100 terminal read-model authority gate test passed.");
