import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createComathServer, getClaim } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-phase74-authority-prep-"));
const negativeProjectRoot = mkdtempSync(join(tmpdir(), "comath-phase74-authority-prep-negative-"));
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
        actor: "phase74-authority-prep"
      }
    });
    assert.equal(tick.status, 200);
    last = tick.body;
    if (tick.body.campaign.status === "terminal") {
      return last;
    }
  }
  assert.fail("bounded authority-report preparation campaign did not reach terminal state");
}

try {
  const start = await server.inject({
    method: "POST",
    path: "/campaign/start",
    body: {
      project_root: projectRoot,
      project_name: "Task 22 Bounded Authority Report Preparation",
      user_goal: "Prove in Lean that n + n = 2 * n for natural numbers.",
      domain: "elementary",
      strict_mode: true,
      actor: "phase74-authority-prep"
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
  const prepRel = `.comath/campaign/${campaignId}/bounded_authority_report_preparation.json`;
  const staticRel = `.comath/campaign/${campaignId}/bounded_authority_static_audit_preview.json`;
  const statementRel = `.comath/campaign/${campaignId}/bounded_authority_statement_equivalence_preview.json`;
  const dependencyRel = `.comath/campaign/${campaignId}/bounded_authority_dependency_closure_preview.json`;
  const axiomRel = `.comath/campaign/${campaignId}/bounded_authority_axiom_profile_preview.json`;
  const replayTargetRel = `.comath/campaign/${campaignId}/broad_replay_target.json`;
  const failureRel = `.comath/campaign/${campaignId}/broad_synthesis_failure.json`;
  const finalReplayManifestRel = `.comath/evidence/${claimId}/lean/final_replay_manifest.json`;

  for (const relPath of [targetRel, proofBodyRel, prepRel, staticRel, statementRel, dependencyRel, axiomRel, replayTargetRel, failureRel]) {
    assert.equal(existsSync(join(projectRoot, relPath)), true, `${relPath} must exist`);
  }
  assert.equal(
    existsSync(join(projectRoot, finalReplayManifestRel)),
    false,
    "authority-report preparation must not create final replay authority"
  );

  const prep = readJson(join(projectRoot, prepRel));
  assert.equal(prep.schema_version, "comath.v3.bounded_authority_report_preparation.v1");
  assert.equal(prep.campaign_id, campaignId);
  assert.equal(prep.claim_id, claimId);
  assert.equal(prep.locked_statement_hash, finalTick.campaign.open_obligations[0].statement_hash);
  assert.equal(prep.status, "authority_reports_prepared_nonpromotional");
  assert.equal(prep.proof_authority, "none");
  assert.equal(prep.can_run_clean_replay, false);
  assert.equal(prep.can_promote_claim, false);
  assert.equal(prep.final_replay_manifest_path, null);
  assert.equal(prep.bound_artifacts.theorem_specific_lean_project, targetRel);
  assert.equal(prep.bound_artifacts.proof_body_synthesis, proofBodyRel);
  assert.equal(prep.bound_artifacts.problem_lock, ".comath/lock/problem_lock.md");
  assert.equal(prep.bound_artifacts.obligation_dag, `.comath/campaign/${campaignId}/proof/lemma_dag.json`);
  assert.equal(prep.bound_artifacts.line_map, `.comath/campaign/${campaignId}/proof/line_map.json`);
  assert.equal(prep.report_paths.static_audit_preview, staticRel);
  assert.equal(prep.report_paths.statement_equivalence_preview, statementRel);
  assert.equal(prep.report_paths.dependency_closure_preview, dependencyRel);
  assert.equal(prep.report_paths.axiom_profile_preview, axiomRel);
  assert.equal(prep.required_before_authority.includes("final clean Lean replay manifest"), true);

  const staticReport = readJson(join(projectRoot, staticRel));
  assert.equal(staticReport.schema_version, "comath.v3.bounded_authority_static_audit_preview.v1");
  assert.equal(staticReport.result, "preview_pass");
  assert.deepEqual(staticReport.hard_vetoes, []);
  assert.equal(staticReport.proof_authority, "none");

  const statementReport = readJson(join(projectRoot, statementRel));
  assert.equal(statementReport.schema_version, "comath.v3.bounded_authority_statement_equivalence_preview.v1");
  assert.equal(statementReport.result, "preview_pass");
  assert.equal(statementReport.status, "target_header_matches_locked_statement");
  assert.equal(statementReport.locked_statement_hash, finalTick.campaign.open_obligations[0].statement_hash);
  assert.equal(statementReport.normalized_target_header, "theorem C0001 (n : Nat) : n + n = 2 * n");
  assert.equal(statementReport.target_statement_prop, "forall n : Nat, n + n = 2 * n");
  assert.deepEqual(statementReport.hard_vetoes, []);

  const dependencyReport = readJson(join(projectRoot, dependencyRel));
  assert.equal(dependencyReport.schema_version, "comath.v3.bounded_authority_dependency_closure_preview.v1");
  assert.equal(dependencyReport.result, "preview_pass");
  assert.equal(dependencyReport.imports["MathResearch/Target.lean"].includes("Std"), true);
  assert.equal(typeof dependencyReport.lakefile_hash, "string");
  assert.equal(dependencyReport.local_file_hashes["MathResearch/Target.lean"].length, 64);

  const axiomReport = readJson(join(projectRoot, axiomRel));
  assert.equal(axiomReport.schema_version, "comath.v3.bounded_authority_axiom_profile_preview.v1");
  assert.equal(axiomReport.result, "preview_blocked");
  assert.equal(axiomReport.hard_vetoes.includes("requires_clean_replay_axiom_output"), true);
  assert.equal(axiomReport.proof_authority, "none");

  const target = readJson(join(projectRoot, targetRel));
  assert.equal(target.authority_report_preparation_path, prepRel);
  assert.equal(target.can_run_clean_replay, false);
  assert.equal(target.can_promote_claim, false);

  const replayTarget = readJson(join(projectRoot, replayTargetRel));
  assert.equal(replayTarget.authority_report_preparation_path, prepRel);
  assert.equal(replayTarget.can_run_clean_replay, false);
  assert.equal(replayTarget.can_promote_claim, false);
  assert.equal(replayTarget.required_before_replay.includes("final clean Lean replay manifest"), true);

  const failure = readJson(join(projectRoot, failureRel));
  assert.equal(failure.replayable_evidence.authority_report_preparation, prepRel);
  assert.equal(failure.reason, "bounded Lean Authority v2 reports prepared but final clean replay is missing");
  assert.equal(failure.promotion_blocked, true);

  const claim = getClaim(projectRoot, finalTick.campaign.project_id, claimId);
  assert.equal(claim.status, "conjectural");

  const negativeStart = await server.inject({
    method: "POST",
    path: "/campaign/start",
    body: {
      project_root: negativeProjectRoot,
      project_name: "Task 22 Negative Authority-Prep Guard",
      user_goal: "Do not prove n + n = 2 * n; investigate the negation instead.",
      domain: "elementary",
      strict_mode: true,
      actor: "phase74-authority-prep"
    }
  });
  assert.equal(negativeStart.status, 200);
  const negativeCampaignId = negativeStart.body.campaign.campaign_id;
  await tickToTerminal(negativeProjectRoot, negativeCampaignId);
  assert.equal(
    existsSync(join(negativeProjectRoot, `.comath/campaign/${negativeCampaignId}/bounded_authority_report_preparation.json`)),
    false,
    "negative/non-proof prompts must not receive the positive authority-report preparation package"
  );
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
  rmSync(negativeProjectRoot, { recursive: true, force: true });
}

console.log("Phase 74 bounded Lean authority-report preparation tests passed.");
