import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createComathServer, getClaim } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-phase75-final-replay-"));
const negativeProjectRoot = mkdtempSync(join(tmpdir(), "comath-phase75-final-replay-negative-"));
const server = createComathServer();

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

async function tickToTerminal(projectRootForCampaign, campaignId, maxTicks = 14) {
  let last = null;
  for (let index = 0; index < maxTicks; index += 1) {
    const tick = await server.inject({
      method: "POST",
      path: `/campaign/${encodeURIComponent(campaignId)}/tick`,
      body: {
        project_root: projectRootForCampaign,
        actor: "phase75-final-replay"
      }
    });
    assert.equal(tick.status, 200);
    last = tick.body;
    if (tick.body.campaign.status === "terminal") {
      return last;
    }
  }
  assert.fail("bounded final clean replay campaign did not reach terminal state");
}

try {
  const start = await server.inject({
    method: "POST",
    path: "/campaign/start",
    body: {
      project_root: projectRoot,
      project_name: "Task 24 Bounded Final Clean Replay",
      user_goal: "Prove in Lean that n + n = 2 * n for natural numbers.",
      domain: "elementary",
      strict_mode: true,
      actor: "phase75-final-replay"
    }
  });
  assert.equal(start.status, 200);

  const campaignId = start.body.campaign.campaign_id;
  const claimId = start.body.campaign.root_claim_id;
  const finalTick = await tickToTerminal(projectRoot, campaignId);

  assert.equal(finalTick.campaign.status, "terminal");
  assert.equal(finalTick.campaign.current_stage, "completed_formal_proof");
  assert.equal(finalTick.campaign.terminal_state, "completed_formal_proof");
  assert.equal(finalTick.gate?.result, "pass");
  assert.equal(finalTick.final_replay?.result, "pass");
  assert.equal(finalTick.static_audit?.result, "pass");

  const finalReplayManifestRel = `.comath/evidence/${claimId}/lean/final_replay_manifest.json`;
  const finalStaticRel = `.comath/evidence/${claimId}/lean/final_static_audit.json`;
  const statementRel = `.comath/evidence/${claimId}/lean/statement_equivalence.json`;
  const dependencyRel = `.comath/evidence/${claimId}/lean/dependency_closure.json`;
  const axiomRel = `.comath/evidence/${claimId}/lean/axiom_profile.json`;
  const finalReplayLogRel = `.comath/evidence/${claimId}/lean/final_replay.log`;
  const targetRel = `.comath/campaign/${campaignId}/theorem_specific_lean_project.json`;
  const prepRel = `.comath/campaign/${campaignId}/bounded_authority_report_preparation.json`;
  const replayTargetRel = `.comath/campaign/${campaignId}/broad_replay_target.json`;

  for (const relPath of [finalReplayManifestRel, finalStaticRel, statementRel, dependencyRel, axiomRel, finalReplayLogRel, targetRel, prepRel, replayTargetRel]) {
    assert.equal(existsSync(join(projectRoot, relPath)), true, `${relPath} must exist`);
  }

  const replay = readJson(join(projectRoot, finalReplayManifestRel));
  assert.equal(replay.claim_id, claimId);
  assert.equal(replay.result, "pass");
  assert.equal(replay.exit_code, 0);
  assert.equal(replay.theorem_name, "MathResearch.Target.C0001");
  assert.equal(replay.theorem_family, "bounded_nat_double");
  assert.equal(replay.canonical_proposition, "n + n = 2 * n");
  assert.equal(replay.locked_statement_hash, finalTick.campaign.open_obligations[0].statement_hash);
  assert.equal(replay.static_audit_path, finalStaticRel);
  assert.equal(replay.statement_equivalence_path, statementRel);
  assert.equal(replay.dependency_closure_path, dependencyRel);
  assert.equal(replay.axiom_profile_path, axiomRel);
  assert.equal(typeof replay.artifact_hashes.static_audit.sha256, "string");
  assert.equal(replay.artifact_hashes.static_audit.sha256.length, 64);

  const statement = readJson(join(projectRoot, statementRel));
  assert.equal(statement.result, "pass");
  assert.equal(statement.status, "exact");
  assert.equal(statement.locked_statement_hash, finalTick.campaign.open_obligations[0].statement_hash);

  const dependency = readJson(join(projectRoot, dependencyRel));
  assert.equal(dependency.result, "pass");
  assert.equal(dependency.imports["MathResearch/Target.lean"].includes("Std"), true);

  const axiom = readJson(join(projectRoot, axiomRel));
  assert.equal(axiom.result, "pass");
  assert.deepEqual(axiom.hard_vetoes, []);

  const target = readJson(join(projectRoot, targetRel));
  assert.equal(target.status, "final_clean_replay_passed");
  assert.equal(target.proof_authority, "lean_clean_replay");
  assert.equal(target.can_promote_claim, true);
  assert.equal(target.final_replay_manifest_path, finalReplayManifestRel);

  const prep = readJson(join(projectRoot, prepRel));
  assert.equal(prep.status, "final_clean_replay_passed");
  assert.equal(prep.proof_authority, "lean_clean_replay");
  assert.equal(prep.can_promote_claim, true);
  assert.equal(prep.final_replay_manifest_path, finalReplayManifestRel);
  assert.equal(prep.final_report_paths.static_audit, finalStaticRel);
  assert.equal(prep.final_report_paths.statement_equivalence, statementRel);
  assert.equal(prep.final_report_paths.dependency_closure, dependencyRel);
  assert.equal(prep.final_report_paths.axiom_profile, axiomRel);

  const replayTarget = readJson(join(projectRoot, replayTargetRel));
  assert.equal(replayTarget.status, "final_clean_replay_passed");
  assert.equal(replayTarget.can_promote_claim, true);
  assert.equal(replayTarget.proof_authority, "lean_clean_replay");
  assert.equal(replayTarget.final_replay_manifest_path, finalReplayManifestRel);

  const claim = getClaim(projectRoot, finalTick.campaign.project_id, claimId);
  assert.equal(claim.status, "formally_checked");
  assert.equal(claim.evidence_level, 5);
  assert.equal(claim.formalization_status, "kernel_checked");
  assert.equal(claim.dependency_closure_status, "all_dependencies_present");
  assert.equal(claim.audit_state, "audit_passed");

  const negativeStart = await server.inject({
    method: "POST",
    path: "/campaign/start",
    body: {
      project_root: negativeProjectRoot,
      project_name: "Task 24 Negative Final Replay Guard",
      user_goal: "Do not prove n + n = 2 * n; investigate the negation instead.",
      domain: "elementary",
      strict_mode: true,
      actor: "phase75-final-replay"
    }
  });
  assert.equal(negativeStart.status, 200);
  const negativeCampaignId = negativeStart.body.campaign.campaign_id;
  const negativeClaimId = negativeStart.body.campaign.root_claim_id;
  const negativeFinal = await tickToTerminal(negativeProjectRoot, negativeCampaignId);
  assert.equal(negativeFinal.campaign.terminal_state, "blocked_with_replayable_reason");
  assert.equal(
    existsSync(join(negativeProjectRoot, `.comath/evidence/${negativeClaimId}/lean/final_replay_manifest.json`)),
    false,
    "negative/non-proof prompts must not receive final clean replay authority"
  );
  const negativeClaim = getClaim(negativeProjectRoot, negativeFinal.campaign.project_id, negativeClaimId);
  assert.equal(negativeClaim.status, "conjectural");
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
  rmSync(negativeProjectRoot, { recursive: true, force: true });
}

console.log("Phase 75 bounded final clean replay tests passed.");
