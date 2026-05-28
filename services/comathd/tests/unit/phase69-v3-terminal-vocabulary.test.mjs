import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createComathServer, projectExternalV3TerminalState } from "../../dist/index.js";

async function runCampaign(server, projectRoot, userGoal, actor) {
  const start = await server.inject({
    method: "POST",
    path: "/campaign/start",
    body: {
      project_root: projectRoot,
      project_name: "Phase 69 terminal vocabulary",
      user_goal: userGoal,
      domain: "elementary",
      strict_mode: true,
      actor
    }
  });
  assert.equal(start.status, 200);

  let body = start.body;
  for (let index = 0; index < 16; index += 1) {
    const tick = await server.inject({
      method: "POST",
      path: `/campaign/${encodeURIComponent(start.body.campaign.campaign_id)}/tick`,
      body: {
        project_root: projectRoot,
        actor
      }
    });
    assert.equal(tick.status, 200);
    body = tick.body;
    if (body.campaign.status === "terminal") {
      break;
    }
  }
  assert.equal(body.campaign.status, "terminal");
  return body;
}

const server = createComathServer();
const proofRoot = mkdtempSync(join(tmpdir(), "comath-phase69-proof-"));
const refutationRoot = mkdtempSync(join(tmpdir(), "comath-phase69-refute-"));
const blockedRoot = mkdtempSync(join(tmpdir(), "comath-phase69-blocked-"));

try {
  const proof = await runCampaign(
    server,
    proofRoot,
    "Prove in Lean that n + 0 = n for natural numbers.",
    "phase69-proof"
  );
  assert.equal(proof.campaign.terminal_state, "completed_formal_proof");
  assert.equal(proof.campaign.external_v3_terminal_state, "formal_proof_verified");

  const proofStatus = await server.inject({
    method: "GET",
    path: `/campaign/${encodeURIComponent(proof.campaign.campaign_id)}/status?project_root=${encodeURIComponent(
      proofRoot
    )}`
  });
  assert.equal(proofStatus.status, 200);
  assert.equal(proofStatus.body.campaign.external_v3_terminal_state, "formal_proof_verified");

  const proofReplay = await server.inject({
    method: "POST",
    path: `/campaign/${encodeURIComponent(proof.campaign.campaign_id)}/replay`,
    body: {
      project_root: proofRoot,
      actor: "phase69-proof-replay"
    }
  });
  assert.equal(proofReplay.status, 200);
  assert.equal(proofReplay.body.campaign.external_v3_terminal_state, "formal_proof_verified");

  const refutation = await runCampaign(
    server,
    refutationRoot,
    "Prove in Lean that n + 1 = n for natural numbers.",
    "phase69-refutation"
  );
  assert.equal(refutation.campaign.terminal_state, "completed_refutation");
  assert.equal(refutation.campaign.external_v3_terminal_state, "verified_counterexample");

  const blocked = await runCampaign(
    server,
    blockedRoot,
    "Prove that every prime number has a twin prime.",
    "phase69-blocked"
  );
  assert.equal(blocked.campaign.terminal_state, "blocked_with_replayable_reason");
  assert.equal(blocked.campaign.external_v3_terminal_state, "replayable_environment_blocker");

  assert.equal(
    projectExternalV3TerminalState({
      status: "terminal",
      current_stage: "repair",
      terminal_state: "blocked_with_replayable_reason",
      gate_result: "repair_required"
    }),
    "user_visible_theorem_repair_required"
  );

  assert.equal(
    projectExternalV3TerminalState({
      status: "terminal",
      current_stage: "cancelled",
      terminal_state: "cancelled_by_user"
    }),
    "user_cancelled"
  );
} finally {
  await server.close();
  rmSync(proofRoot, { recursive: true, force: true });
  rmSync(refutationRoot, { recursive: true, force: true });
  rmSync(blockedRoot, { recursive: true, force: true });
}

console.log("Phase 69 v3 terminal vocabulary tests passed.");
