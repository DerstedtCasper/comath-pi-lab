import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createComathServer, getClaim } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-phase81-controlled-linear-"));
const falseProjectRoot = mkdtempSync(join(tmpdir(), "comath-phase81-controlled-linear-false-"));
const unsafeProjectRoot = mkdtempSync(join(tmpdir(), "comath-phase81-controlled-linear-unsafe-"));
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
  assert.fail("controlled Nat linear synthesis campaign did not reach terminal state");
}

async function startCampaign(projectRootForCampaign, userGoal) {
  const start = await server.inject({
    method: "POST",
    path: "/campaign/start",
    body: {
      project_root: projectRootForCampaign,
      project_name: "Phase 81 Controlled Nat Linear Synthesis",
      user_goal: userGoal,
      domain: "elementary",
      strict_mode: true,
      actor: "phase81-controlled-linear"
    }
  });
  assert.equal(start.status, 200);
  return start.body.campaign;
}

try {
  const campaign = await startCampaign(
    projectRoot,
    "Prove in Lean that 2 * n + 3 = n + n + 3 for natural numbers."
  );
  const finalTick = await tickToTerminal(projectRoot, campaign.campaign_id, "phase81-controlled-linear");

  assert.equal(finalTick.campaign.status, "terminal");
  assert.equal(finalTick.campaign.current_stage, "completed_formal_proof");
  assert.equal(finalTick.campaign.terminal_state, "completed_formal_proof");
  assert.equal(finalTick.final_replay?.result, "pass");
  assert.equal(finalTick.gate?.result, "pass");

  const campaignId = finalTick.campaign.campaign_id;
  const claimId = finalTick.campaign.root_claim_id;
  const targetRel = `.comath/campaign/${campaignId}/theorem_specific_lean_project.json`;
  const proofBodyRel = `.comath/campaign/${campaignId}/bounded_proof_body_synthesis.json`;
  const theoremRel = `.comath/lean/broad/${campaignId}/MathResearch/Target.lean`;
  const finalReplayManifestRel = `.comath/evidence/${claimId}/lean/final_replay_manifest.json`;

  for (const relPath of [targetRel, proofBodyRel, theoremRel, finalReplayManifestRel]) {
    assert.equal(existsSync(join(projectRoot, relPath)), true, `${relPath} must exist`);
  }

  const target = readJson(join(projectRoot, targetRel));
  assert.equal(target.target_family_id, "synthesized_nat_linear_identity");
  assert.equal(target.synthesis_scope, "controlled_nat_linear_identity_synthesis");
  assert.equal(target.canonical_proposition, "2 * n + 3 = n + n + 3");
  assert.equal(target.target_statement_prop, "forall n : Nat, 2 * n + 3 = n + n + 3");
  assert.deepEqual(target.linear_normal_form, {
    lhs: { n_coefficient: 2, constant: 3 },
    rhs: { n_coefficient: 2, constant: 3 }
  });
  assert.equal(target.proof_authority, "lean_clean_replay");
  assert.equal(target.can_promote_claim, true);

  const proofBody = readJson(join(projectRoot, proofBodyRel));
  assert.equal(proofBody.synthesis_scope, "controlled_nat_linear_identity_synthesis");
  assert.equal(proofBody.synthesized_body, "by omega");
  assert.deepEqual(proofBody.linear_normal_form, target.linear_normal_form);

  const theorem = readFileSync(join(projectRoot, theoremRel), "utf8");
  assert.match(theorem, /theorem C0001 \(n : Nat\) : 2 \* n \+ 3 = n \+ n \+ 3 := by omega/);
  assert.doesNotMatch(theorem, /\b(sorry|admit|axiom|unsafe|opaque|constant)\b/);

  const replay = readJson(join(projectRoot, finalReplayManifestRel));
  assert.equal(replay.theorem_family, "synthesized_nat_linear_identity");
  assert.equal(replay.canonical_proposition, "2 * n + 3 = n + n + 3");

  const claim = getClaim(projectRoot, finalTick.campaign.project_id, claimId);
  assert.equal(claim.status, "formally_checked");

  const falseCampaign = await startCampaign(
    falseProjectRoot,
    "Prove in Lean that 2 * n + 3 = n + n + 4 for natural numbers."
  );
  const falseFinal = await tickToTerminal(falseProjectRoot, falseCampaign.campaign_id, "phase81-controlled-linear");
  assert.equal(falseFinal.campaign.terminal_state, "blocked_with_replayable_reason");
  assert.equal(
    existsSync(join(falseProjectRoot, `.comath/campaign/${falseCampaign.campaign_id}/theorem_specific_lean_project.json`)),
    false,
    "false linear identities must not receive a theorem-specific target package"
  );

  const unsafeCampaign = await startCampaign(
    unsafeProjectRoot,
    "Prove in Lean that n * n = n for natural numbers."
  );
  const unsafeFinal = await tickToTerminal(unsafeProjectRoot, unsafeCampaign.campaign_id, "phase81-controlled-linear");
  assert.equal(unsafeFinal.campaign.terminal_state, "blocked_with_replayable_reason");
  assert.equal(
    existsSync(join(unsafeProjectRoot, `.comath/campaign/${unsafeCampaign.campaign_id}/theorem_specific_lean_project.json`)),
    false,
    "nonlinear goals must not receive the controlled linear target package"
  );
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
  rmSync(falseProjectRoot, { recursive: true, force: true });
  rmSync(unsafeProjectRoot, { recursive: true, force: true });
}

console.log("Phase 81 controlled Nat linear synthesis tests passed.");
