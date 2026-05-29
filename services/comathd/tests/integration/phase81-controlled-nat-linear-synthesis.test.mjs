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
  assert.equal(finalTick.campaign.current_stage, "blocked");
  assert.equal(finalTick.campaign.terminal_state, "blocked_with_replayable_reason");
  assert.equal(finalTick.final_replay, undefined);
  assert.equal(finalTick.gate, undefined);

  const campaignId = finalTick.campaign.campaign_id;
  const claimId = finalTick.campaign.root_claim_id;
  const targetRel = `.comath/campaign/${campaignId}/theorem_specific_lean_project.json`;
  const proofBodyRel = `.comath/campaign/${campaignId}/bounded_proof_body_synthesis.json`;
  const theoremRel = `.comath/lean/broad/${campaignId}/MathResearch/Target.lean`;
  const finalReplayManifestRel = `.comath/evidence/${claimId}/lean/final_replay_manifest.json`;

  for (const relPath of [targetRel, proofBodyRel, theoremRel, finalReplayManifestRel]) {
    assert.equal(existsSync(join(projectRoot, relPath)), false, `${relPath} must not exist`);
  }

  const claim = getClaim(projectRoot, finalTick.campaign.project_id, claimId);
  assert.equal(claim.status, "conjectural");

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
