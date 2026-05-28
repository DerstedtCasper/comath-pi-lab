import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createComathServer, getClaim } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-phase76-nat-linear-"));
const unsupportedProjectRoot = mkdtempSync(join(tmpdir(), "comath-phase76-nat-linear-unsupported-"));
const server = createComathServer();

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

async function tickToTerminal(projectRootForCampaign, campaignId, actor, maxTicks = 14) {
  let last = null;
  for (let index = 0; index < maxTicks; index += 1) {
    const tick = await server.inject({
      method: "POST",
      path: `/campaign/${encodeURIComponent(campaignId)}/tick`,
      body: {
        project_root: projectRootForCampaign,
        actor
      }
    });
    assert.equal(tick.status, 200);
    last = tick.body;
    if (tick.body.campaign.status === "terminal") {
      return last;
    }
  }
  assert.fail("registered Nat linear target campaign did not reach terminal state");
}

try {
  const start = await server.inject({
    method: "POST",
    path: "/campaign/start",
    body: {
      project_root: projectRoot,
      project_name: "Task 25 Registered Nat Linear Target",
      user_goal: "Prove in Lean that n + 0 + n = 2 * n for natural numbers.",
      domain: "elementary",
      strict_mode: true,
      actor: "phase76-nat-linear"
    }
  });
  assert.equal(start.status, 200);

  const campaignId = start.body.campaign.campaign_id;
  const claimId = start.body.campaign.root_claim_id;
  const finalTick = await tickToTerminal(projectRoot, campaignId, "phase76-nat-linear");

  assert.equal(finalTick.campaign.status, "terminal");
  assert.equal(finalTick.campaign.current_stage, "completed_formal_proof");
  assert.equal(finalTick.campaign.terminal_state, "completed_formal_proof");
  assert.equal(finalTick.final_replay?.result, "pass");
  assert.equal(finalTick.gate?.result, "pass");

  const finalReplayManifestRel = `.comath/evidence/${claimId}/lean/final_replay_manifest.json`;
  const targetRel = `.comath/campaign/${campaignId}/theorem_specific_lean_project.json`;
  const proofBodyRel = `.comath/campaign/${campaignId}/bounded_proof_body_synthesis.json`;
  const prepRel = `.comath/campaign/${campaignId}/bounded_authority_report_preparation.json`;
  const theoremRel = `.comath/lean/broad/${campaignId}/MathResearch/Target.lean`;
  const formalSpecRel = `.comath/lean/broad/${campaignId}/FormalSpec/target.json`;

  for (const relPath of [finalReplayManifestRel, targetRel, proofBodyRel, prepRel, theoremRel, formalSpecRel]) {
    assert.equal(existsSync(join(projectRoot, relPath)), true, `${relPath} must exist`);
  }

  const replay = readJson(join(projectRoot, finalReplayManifestRel));
  assert.equal(replay.theorem_name, "MathResearch.Target.C0001");
  assert.equal(replay.theorem_family, "bounded_nat_add_zero_add_self");
  assert.equal(replay.canonical_proposition, "n + 0 + n = 2 * n");
  assert.equal(replay.locked_statement_hash, finalTick.campaign.open_obligations[0].statement_hash);

  const target = readJson(join(projectRoot, targetRel));
  assert.equal(target.schema_version, "comath.v3.theorem_specific_lean_project.v1");
  assert.equal(target.target_family_id, "bounded_nat_add_zero_add_self");
  assert.equal(target.canonical_proposition, "n + 0 + n = 2 * n");
  assert.equal(target.normalized_target_header, "theorem C0001 (n : Nat) : n + 0 + n = 2 * n");
  assert.equal(target.target_statement_prop, "forall n : Nat, n + 0 + n = 2 * n");
  assert.equal(target.proof_authority, "lean_clean_replay");
  assert.equal(target.can_promote_claim, true);
  assert.equal(target.final_replay_manifest_path, finalReplayManifestRel);

  const proofBody = readJson(join(projectRoot, proofBodyRel));
  assert.equal(proofBody.target_family_id, target.target_family_id);
  assert.equal(proofBody.canonical_proposition, target.canonical_proposition);
  assert.equal(proofBody.synthesis_scope, "registered_nat_linear_identity_target");
  assert.equal(proofBody.synthesized_body, "by omega");

  const prep = readJson(join(projectRoot, prepRel));
  assert.equal(prep.target_family_id, target.target_family_id);
  assert.equal(prep.canonical_proposition, target.canonical_proposition);
  assert.equal(prep.proof_authority, "lean_clean_replay");

  const theorem = readFileSync(join(projectRoot, theoremRel), "utf8");
  assert.match(theorem, /theorem C0001 \(n : Nat\) : n \+ 0 \+ n = 2 \* n := by omega/);
  assert.doesNotMatch(theorem, /\b(sorry|admit|axiom|unsafe|opaque|constant)\b/);

  const claim = getClaim(projectRoot, finalTick.campaign.project_id, claimId);
  assert.equal(claim.status, "formally_checked");

  const unsupportedStart = await server.inject({
    method: "POST",
    path: "/campaign/start",
    body: {
      project_root: unsupportedProjectRoot,
      project_name: "Task 25 Unsupported Broad Goal",
      user_goal: "Prove in Lean that n + 2 = n for natural numbers.",
      domain: "elementary",
      strict_mode: true,
      actor: "phase76-nat-linear"
    }
  });
  assert.equal(unsupportedStart.status, 200);
  const unsupportedCampaignId = unsupportedStart.body.campaign.campaign_id;
  const unsupportedClaimId = unsupportedStart.body.campaign.root_claim_id;
  const unsupportedFinal = await tickToTerminal(unsupportedProjectRoot, unsupportedCampaignId, "phase76-nat-linear");
  assert.equal(unsupportedFinal.campaign.terminal_state, "blocked_with_replayable_reason");
  assert.equal(
    existsSync(join(unsupportedProjectRoot, `.comath/evidence/${unsupportedClaimId}/lean/final_replay_manifest.json`)),
    false,
    "unregistered broad goals must not receive final replay authority"
  );
  assert.equal(
    existsSync(join(unsupportedProjectRoot, `.comath/campaign/${unsupportedCampaignId}/theorem_specific_lean_project.json`)),
    false,
    "unregistered broad goals must not receive a theorem-specific target package"
  );
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
  rmSync(unsupportedProjectRoot, { recursive: true, force: true });
}

console.log("Phase 76 registered Nat linear target tests passed.");
