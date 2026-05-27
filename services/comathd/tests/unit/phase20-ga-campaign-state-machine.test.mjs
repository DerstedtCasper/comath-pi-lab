import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { campaignStageSchema, campaignTerminalStateSchema, createComathServer, researchCampaignSchema } from "../../dist/index.js";

const requiredCampaignStates = [
  "initialized",
  "problem_locked",
  "context_built",
  "planning",
  "running_stage",
  "candidate_generation",
  "candidate_verification",
  "candidate_arbitration",
  "integration",
  "adversarial_review",
  "repair",
  "final_static_audit",
  "final_global_replay",
  "completed_formal_proof",
  "completed_refutation",
  "blocked",
  "cancelled"
];

const oldPublicStages = ["problem_lock", "lemma_sprint", "final_global_lean_replay", "final_report_and_memory_update", "terminal"];

for (const stage of requiredCampaignStates) {
  assert.equal(campaignStageSchema.parse(stage), stage);
}

for (const stage of oldPublicStages) {
  assert.throws(() => campaignStageSchema.parse(stage), /Invalid option/);
}

for (const terminalState of [
  "completed_formal_proof",
  "completed_refutation",
  "blocked_with_replayable_reason",
  "cancelled_by_user"
]) {
  assert.equal(campaignTerminalStateSchema.parse(terminalState), terminalState);
}

for (const terminalState of [
  "formal_proof_verified",
  "verified_counterexample",
  "user_visible_theorem_repair_required",
  "replayable_environment_blocker",
  "user_cancelled"
]) {
  assert.throws(() => campaignTerminalStateSchema.parse(terminalState), /Invalid option/);
}

const campaignBase = {
  campaign_id: "CAM-9999",
  project_id: "P-9999",
  root_claim_id: "C-9999",
  user_goal: "schema invariant check",
  current_stage: "problem_locked",
  status: "running",
  strict_mode: true,
  stage_runs: [],
  open_obligations: [],
  accepted_artifacts: [],
  blockers: [],
  next_actions: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

assert.throws(
  () => researchCampaignSchema.parse({ ...campaignBase, status: "terminal" }),
  /terminal campaign requires terminal_state/
);
assert.throws(
  () =>
    researchCampaignSchema.parse({
      ...campaignBase,
      terminal_state: "completed_formal_proof"
    }),
  /non-terminal campaign cannot carry terminal_state/
);
assert.throws(
  () =>
    researchCampaignSchema.parse({
      ...campaignBase,
      current_stage: "blocked",
      status: "terminal",
      terminal_state: "completed_formal_proof"
    }),
  /completed_formal_proof terminal state requires completed_formal_proof current_stage/
);
assert.throws(
  () =>
    researchCampaignSchema.parse({
      ...campaignBase,
      current_stage: "completed_formal_proof",
      status: "terminal",
      terminal_state: "blocked_with_replayable_reason"
    }),
  /blocked_with_replayable_reason terminal state requires blocked current_stage/
);

async function runCampaign(server, projectRoot, userGoal, actor) {
  const start = await server.inject({
    method: "POST",
    path: "/campaign/start",
    body: {
      project_root: projectRoot,
      project_name: "GA Canonical State Machine",
      user_goal: userGoal,
      domain: "elementary",
      strict_mode: true,
      actor
    }
  });
  assert.equal(start.status, 200);
  assert.equal(start.body.campaign.current_stage, "problem_locked");

  const seenStages = [start.body.campaign.current_stage];
  let finalTick = null;
  for (let i = 0; i < 16; i += 1) {
    const tick = await server.inject({
      method: "POST",
      path: `/campaign/${encodeURIComponent(start.body.campaign.campaign_id)}/tick`,
      body: {
        project_root: projectRoot,
        actor
      }
    });
    assert.equal(tick.status, 200);
    finalTick = tick.body;
    seenStages.push(tick.body.campaign.current_stage);
    if (tick.body.campaign.status === "terminal") {
      break;
    }
  }

  assert.ok(finalTick, "campaign ticks should return a final body");
  return { start: start.body, finalTick, seenStages };
}

const proofRoot = mkdtempSync(join(tmpdir(), "comath-ga-state-proof-"));
const refutationRoot = mkdtempSync(join(tmpdir(), "comath-ga-state-refute-"));
const unsupportedRoot = mkdtempSync(join(tmpdir(), "comath-ga-state-unsupported-"));
const server = createComathServer();

try {
  const proof = await runCampaign(
    server,
    proofRoot,
    "Prove in Lean that n + 0 = n for natural numbers.",
    "phase20-state-proof"
  );
  assert.equal(proof.finalTick.campaign.status, "terminal");
  assert.equal(proof.finalTick.campaign.current_stage, "completed_formal_proof");
  assert.equal(proof.finalTick.campaign.terminal_state, "completed_formal_proof");
  assert.deepEqual(proof.seenStages, [
    "problem_locked",
    "context_built",
    "planning",
    "candidate_generation",
    "candidate_verification",
    "candidate_arbitration",
    "integration",
    "adversarial_review",
    "final_static_audit",
    "final_global_replay",
    "completed_formal_proof"
  ]);

  const refutation = await runCampaign(
    server,
    refutationRoot,
    "Prove in Lean that n + 1 = n for natural numbers.",
    "phase20-state-refute"
  );
  assert.equal(refutation.finalTick.campaign.status, "terminal");
  assert.equal(refutation.finalTick.campaign.current_stage, "completed_refutation");
  assert.equal(refutation.finalTick.campaign.terminal_state, "completed_refutation");
  assert.equal(refutation.finalTick.counterexample?.assignment.n, 0);
  assert.deepEqual(refutation.seenStages, [
    "problem_locked",
    "context_built",
    "planning",
    "candidate_generation",
    "completed_refutation"
  ]);
  assert.equal(refutation.finalTick.final_replay, undefined);
  assert.equal(
    refutation.finalTick.campaign.stage_runs.some(
      (run) => run.stage === "final_global_replay" || run.stage === "final_static_audit"
    ),
    false,
    "verified exact refutation shortcut should not fabricate final proof replay stages"
  );

  const unsupported = await runCampaign(
    server,
    unsupportedRoot,
    "Prove that every prime number has a twin prime.",
    "phase20-state-unsupported"
  );
  assert.equal(unsupported.finalTick.campaign.status, "terminal");
  assert.equal(unsupported.finalTick.campaign.current_stage, "blocked");
  assert.equal(unsupported.finalTick.campaign.terminal_state, "blocked_with_replayable_reason");
  assert.equal(unsupported.finalTick.blocker, "unsupported final replay target");
  assert.equal(unsupported.finalTick.campaign.blockers[0].reason, "unsupported final replay target");
  assert.equal(
    unsupported.finalTick.campaign.stage_runs.at(-1).status,
    "blocked",
    "blocked final replay attempts must not be recorded as completed stage runs"
  );
  assert.equal(
    unsupported.finalTick.campaign.stage_runs.at(-1).stage,
    "candidate_generation",
    "unsupported goals must fail closed before fabricating theorem-family candidates"
  );
} finally {
  await server.close();
  rmSync(proofRoot, { recursive: true, force: true });
  rmSync(refutationRoot, { recursive: true, force: true });
  rmSync(unsupportedRoot, { recursive: true, force: true });
}

console.log("Phase 20 GA campaign state-machine tests passed.");
