import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createComathServer, getClaim } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-phase72-lean-generation-"));
const negativeProjectRoot = mkdtempSync(join(tmpdir(), "comath-phase72-lean-generation-negative-"));
const server = createComathServer();

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

async function tickToTerminal(projectRootForCampaign, campaignId, maxTicks = 12) {
  let last = null;
  for (let index = 0; index < maxTicks; index += 1) {
    const tick = await server.inject({
      method: "POST",
      path: `/campaign/${encodeURIComponent(campaignId)}/tick`,
      body: {
        project_root: projectRootForCampaign,
        actor: "phase72-lean-generation"
      }
    });
    assert.equal(tick.status, 200);
    last = tick.body;
    if (tick.body.campaign.status === "terminal") {
      return last;
    }
  }
  assert.fail("theorem-specific generation campaign did not reach terminal state");
}

try {
  const start = await server.inject({
    method: "POST",
    path: "/campaign/start",
    body: {
      project_root: projectRoot,
      project_name: "Task 19 Theorem-Specific Lean Generation",
      user_goal: "Prove in Lean that n + n = 2 * n for natural numbers.",
      domain: "elementary",
      strict_mode: true,
      actor: "phase72-lean-generation"
    }
  });
  assert.equal(start.status, 200);

  const campaignId = start.body.campaign.campaign_id;
  const claimId = start.body.campaign.root_claim_id;
  const finalTick = await tickToTerminal(projectRoot, campaignId);

  assert.equal(finalTick.campaign.status, "terminal");
  assert.equal(finalTick.campaign.terminal_state, "blocked_with_replayable_reason");
  assert.equal(finalTick.final_replay, undefined);
  assert.equal(finalTick.gate, undefined);

  const projectTargetRel = `.comath/campaign/${campaignId}/theorem_specific_lean_project.json`;
  const draftTheoremRel = `.comath/lean/broad/${campaignId}/MathResearch/Target.lean`;
  const formalSpecRel = `.comath/lean/broad/${campaignId}/FormalSpec/target.json`;
  const lakefileRel = `.comath/lean/broad/${campaignId}/lakefile.lean`;
  const toolchainRel = `.comath/lean/broad/${campaignId}/lean-toolchain`;
  const replayTargetRel = `.comath/campaign/${campaignId}/broad_replay_target.json`;
  const failureRel = `.comath/campaign/${campaignId}/broad_synthesis_failure.json`;

  for (const relPath of [projectTargetRel, draftTheoremRel, formalSpecRel, lakefileRel, toolchainRel, replayTargetRel, failureRel]) {
    assert.equal(existsSync(join(projectRoot, relPath)), true, `${relPath} must exist`);
  }

  const target = readJson(join(projectRoot, projectTargetRel));
  assert.equal(target.schema_version, "comath.v3.theorem_specific_lean_project.v1");
  assert.equal(target.campaign_id, campaignId);
  assert.equal(target.claim_id, claimId);
  assert.equal(target.locked_statement_hash, finalTick.campaign.open_obligations[0].statement_hash);
  assert.equal(target.theorem_name, "MathResearch.Target.C0001");
  assert.equal(target.normalized_target_header, "theorem C0001 (n : Nat) : n + n = 2 * n");
  assert.equal(target.replay_command, "lake env lean MathResearch/Target.lean");
  assert.equal(target.status, "authority_reports_prepared_nonpromotional");
  assert.equal(target.proof_authority, "none");
  assert.equal(target.can_promote_claim, false);
  assert.equal(target.can_run_clean_replay, false);
  assert.equal(target.bound_artifacts.problem_lock, ".comath/lock/problem_lock.md");
  assert.equal(target.bound_artifacts.obligation_dag, `.comath/campaign/${campaignId}/proof/lemma_dag.json`);
  assert.equal(target.bound_artifacts.line_map, `.comath/campaign/${campaignId}/proof/line_map.json`);
  assert.equal(target.bound_artifacts.formal_spec, formalSpecRel);
  assert.equal(target.lean_files.target, draftTheoremRel);
  assert.equal(target.lean_files.lakefile, lakefileRel);
  assert.equal(target.lean_files.toolchain, toolchainRel);
  assert.equal(target.blocked_until, "final clean Lean replay manifest exists");

  const replayTarget = readJson(join(projectRoot, replayTargetRel));
  assert.equal(replayTarget.status, "authority_reports_prepared_nonpromotional");
  assert.equal(replayTarget.theorem_name, "MathResearch.Target.C0001");
  assert.equal(replayTarget.replay_command, target.replay_command);
  assert.equal(replayTarget.lean_project_target_path, projectTargetRel);
  assert.equal(replayTarget.can_run_clean_replay, false);
  assert.equal(replayTarget.can_promote_claim, false);
  assert.equal(replayTarget.proof_authority, "none");
  assert.equal(replayTarget.required_before_replay.includes("final clean Lean replay manifest"), true);

  const draftLean = readFileSync(join(projectRoot, draftTheoremRel), "utf8");
  assert.match(draftLean, /namespace MathResearch\.Target/);
  assert.match(draftLean, /def targetStatement : Prop := forall n : Nat, n \+ n = 2 \* n/);
  assert.match(draftLean, /expected theorem header: theorem C0001 \(n : Nat\) : n \+ n = 2 \* n/);
  assert.match(draftLean, /theorem C0001 \(n : Nat\) : n \+ n = 2 \* n := by omega/);
  assert.doesNotMatch(draftLean, /\b(sorry|admit|axiom|unsafe|opaque|constant)\b/);

  const failure = readJson(join(projectRoot, failureRel));
  assert.equal(failure.replayable_evidence.lean_project_target, projectTargetRel);
  assert.equal(failure.promotion_blocked, true);
  assert.equal(failure.reason, "bounded Lean Authority v2 reports prepared but final clean replay is missing");

  const lastRun = finalTick.campaign.stage_runs.at(-1);
  assert.equal(lastRun.stage, "candidate_generation");
  assert.equal(lastRun.status, "blocked");
  assert.equal(lastRun.artifact_paths.includes(projectTargetRel), true);

  const claim = getClaim(projectRoot, finalTick.campaign.project_id, claimId);
  assert.equal(claim.status, "conjectural");

  const negativeStart = await server.inject({
    method: "POST",
    path: "/campaign/start",
    body: {
      project_root: negativeProjectRoot,
      project_name: "Task 19 Negative Statement Binding",
      user_goal: "Do not prove n + n = 2 * n; investigate the negation instead.",
      domain: "elementary",
      strict_mode: true,
      actor: "phase72-lean-generation"
    }
  });
  assert.equal(negativeStart.status, 200);
  const negativeCampaignId = negativeStart.body.campaign.campaign_id;
  const negativeFinalTick = await tickToTerminal(negativeProjectRoot, negativeCampaignId);
  const negativeProjectTargetRel = `.comath/campaign/${negativeCampaignId}/theorem_specific_lean_project.json`;
  const negativeReplayTargetRel = `.comath/campaign/${negativeCampaignId}/broad_replay_target.json`;
  assert.equal(
    existsSync(join(negativeProjectRoot, negativeProjectTargetRel)),
    false,
    "formula-containing negation/non-proof prompts must not receive a positive theorem target package"
  );
  const negativeReplayTarget = readJson(join(negativeProjectRoot, negativeReplayTargetRel));
  assert.equal(negativeFinalTick.blocker, "broad theorem synthesis requires checked replay target");
  assert.equal(negativeReplayTarget.status, "unresolved");
  assert.equal(negativeReplayTarget.theorem_name, null);
  assert.equal(negativeReplayTarget.can_run_clean_replay, false);
  assert.equal(negativeReplayTarget.can_promote_claim, false);
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
  rmSync(negativeProjectRoot, { recursive: true, force: true });
}

console.log("Phase 72 theorem-specific Lean generation tests passed.");
