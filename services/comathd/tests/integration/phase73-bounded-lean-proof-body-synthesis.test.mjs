import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createComathServer, getClaim } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-phase73-proof-body-"));
const negativeProjectRoot = mkdtempSync(join(tmpdir(), "comath-phase73-proof-body-negative-"));
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
        actor: "phase73-proof-body"
      }
    });
    assert.equal(tick.status, 200);
    last = tick.body;
    if (tick.body.campaign.status === "terminal") {
      return last;
    }
  }
  assert.fail("bounded proof-body synthesis campaign did not reach terminal state");
}

try {
  const start = await server.inject({
    method: "POST",
    path: "/campaign/start",
    body: {
      project_root: projectRoot,
      project_name: "Task 21 Bounded Proof-Body Synthesis",
      user_goal: "Prove in Lean that n + n = 2 * n for natural numbers.",
      domain: "elementary",
      strict_mode: true,
      actor: "phase73-proof-body"
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

  const targetRel = `.comath/campaign/${campaignId}/theorem_specific_lean_project.json`;
  const proofBodyRel = `.comath/campaign/${campaignId}/bounded_proof_body_synthesis.json`;
  const auditRel = `.comath/campaign/${campaignId}/bounded_proof_body_static_audit.json`;
  const theoremRel = `.comath/lean/broad/${campaignId}/MathResearch/Target.lean`;
  const replayTargetRel = `.comath/campaign/${campaignId}/broad_replay_target.json`;
  const failureRel = `.comath/campaign/${campaignId}/broad_synthesis_failure.json`;
  const finalReplayManifestRel = `.comath/evidence/${claimId}/lean/final_replay_manifest.json`;

  for (const relPath of [targetRel, proofBodyRel, auditRel, theoremRel, replayTargetRel, failureRel]) {
    assert.equal(existsSync(join(projectRoot, relPath)), true, `${relPath} must exist`);
  }
  assert.equal(
    existsSync(join(projectRoot, finalReplayManifestRel)),
    false,
    "proof-body synthesis alone must not create final replay authority"
  );

  const proofBody = readJson(join(projectRoot, proofBodyRel));
  assert.equal(proofBody.schema_version, "comath.v3.bounded_proof_body_synthesis.v1");
  assert.equal(proofBody.campaign_id, campaignId);
  assert.equal(proofBody.claim_id, claimId);
  assert.equal(proofBody.locked_statement_hash, finalTick.campaign.open_obligations[0].statement_hash);
  assert.equal(proofBody.theorem_name, "MathResearch.Target.C0001");
  assert.equal(proofBody.status, "proof_body_synthesized_unreplayed");
  assert.equal(proofBody.proof_authority, "none");
  assert.equal(proofBody.can_run_clean_replay, false);
  assert.equal(proofBody.can_promote_claim, false);
  assert.equal(proofBody.bound_artifacts.theorem_specific_lean_project, targetRel);
  assert.equal(proofBody.bound_artifacts.target_lean_file, theoremRel);
  assert.equal(proofBody.bound_artifacts.problem_lock, ".comath/lock/problem_lock.md");
  assert.equal(proofBody.bound_artifacts.obligation_dag, `.comath/campaign/${campaignId}/proof/lemma_dag.json`);
  assert.equal(proofBody.bound_artifacts.line_map, `.comath/campaign/${campaignId}/proof/line_map.json`);
  assert.equal(proofBody.audit_preview_path, auditRel);
  assert.equal(proofBody.synthesized_body.trim(), "by omega");
  assert.equal(proofBody.required_before_authority.includes("final clean Lean replay manifest"), true);

  const audit = readJson(join(projectRoot, auditRel));
  assert.equal(audit.schema_version, "comath.v3.bounded_proof_body_static_audit.v1");
  assert.equal(audit.result, "pass");
  assert.deepEqual(audit.hard_vetoes, []);
  assert.equal(audit.scanned_text_sha256.length, 64);
  assert.equal(audit.forbidden_tokens.includes("sorry"), true);

  const draftLean = readFileSync(join(projectRoot, theoremRel), "utf8");
  assert.match(draftLean, /theorem C0001 \(n : Nat\) : n \+ n = 2 \* n := by omega/);
  assert.match(draftLean, /#check C0001/);
  assert.match(draftLean, /#print axioms C0001/);
  assert.doesNotMatch(draftLean, /\b(sorry|admit|axiom|unsafe|opaque|constant)\b/);

  const target = readJson(join(projectRoot, targetRel));
  assert.equal(target.status, "authority_reports_prepared_nonpromotional");
  assert.equal(target.proof_body_synthesis_path, proofBodyRel);
  assert.equal(target.proof_body_static_audit_path, auditRel);
  assert.equal(typeof target.authority_report_preparation_path, "string");
  assert.equal(target.can_run_clean_replay, false);
  assert.equal(target.can_promote_claim, false);

  const replayTarget = readJson(join(projectRoot, replayTargetRel));
  assert.equal(replayTarget.status, "authority_reports_prepared_nonpromotional");
  assert.equal(replayTarget.proof_body_synthesis_path, proofBodyRel);
  assert.equal(typeof replayTarget.authority_report_preparation_path, "string");
  assert.equal(replayTarget.can_run_clean_replay, false);
  assert.equal(replayTarget.can_promote_claim, false);
  assert.equal(replayTarget.required_before_replay.includes("final clean Lean replay manifest"), true);

  const failure = readJson(join(projectRoot, failureRel));
  assert.equal(failure.replayable_evidence.proof_body_synthesis, proofBodyRel);
  assert.equal(failure.replayable_evidence.proof_body_static_audit, auditRel);
  assert.equal(typeof failure.replayable_evidence.authority_report_preparation, "string");
  assert.equal(failure.promotion_blocked, true);
  assert.equal(failure.reason, "bounded Lean Authority v2 reports prepared but final clean replay is missing");

  const lastRun = finalTick.campaign.stage_runs.at(-1);
  assert.equal(lastRun.stage, "candidate_generation");
  assert.equal(lastRun.status, "blocked");
  assert.equal(lastRun.artifact_paths.includes(proofBodyRel), true);
  assert.equal(lastRun.artifact_paths.includes(auditRel), true);

  const claim = getClaim(projectRoot, finalTick.campaign.project_id, claimId);
  assert.equal(claim.status, "conjectural");

  const negativeStart = await server.inject({
    method: "POST",
    path: "/campaign/start",
    body: {
      project_root: negativeProjectRoot,
      project_name: "Task 21 Negative Proof-Body Guard",
      user_goal: "Do not prove n + n = 2 * n; investigate the negation instead.",
      domain: "elementary",
      strict_mode: true,
      actor: "phase73-proof-body"
    }
  });
  assert.equal(negativeStart.status, 200);
  const negativeCampaignId = negativeStart.body.campaign.campaign_id;
  await tickToTerminal(negativeProjectRoot, negativeCampaignId);
  assert.equal(
    existsSync(join(negativeProjectRoot, `.comath/campaign/${negativeCampaignId}/bounded_proof_body_synthesis.json`)),
    false,
    "negative/non-proof prompts must not receive the positive proof-body synthesis package"
  );
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
  rmSync(negativeProjectRoot, { recursive: true, force: true });
}

console.log("Phase 73 bounded Lean proof-body synthesis tests passed.");
