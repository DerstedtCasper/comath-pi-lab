import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { getClaim, initProject, registerClaim, statementHash, tickCampaign, writeCampaign } from "../../dist/index.js";

function writeProjectFile(projectRoot, relativePath, text) {
  const absolute = join(projectRoot, relativePath);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, text, "utf8");
}

function writeJsonProjectFile(projectRoot, relativePath, value) {
  writeProjectFile(projectRoot, relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function campaignFixture(projectId, campaignId, claimId, statementHashValue) {
  const now = "2026-05-31T00:00:00.000Z";
  return {
    campaign_id: campaignId,
    project_id: projectId,
    root_claim_id: claimId,
    user_goal: "Task106 final replay material producer fail-closed guard",
    current_stage: "integration_refactor",
    status: "running",
    strict_mode: true,
    stage_runs: [],
    open_obligations: [
      {
        obligation_id: "PO-0106",
        claim_id: claimId,
        locked_statement_nl: "MathResearch.Goal3ReplayMaterialFailClosed106 : True",
        locked_statement_structured: {},
        statement_hash: statementHashValue,
        dependencies: [],
        assumptions: [],
        status: "candidate_selected"
      }
    ],
    accepted_artifacts: [],
    blockers: [],
    next_actions: ["integrate and refactor selected candidate after red-team gate"],
    created_at: now,
    updated_at: now
  };
}

async function runBlockedScenario(name, mutateSource, expectedReason) {
  const projectRoot = mkdtempSync(join(tmpdir(), `comath-goal3-task106-${name}-`));
  try {
    const { project } = initProject({ name: `Goal 3 Task 106 ${name}`, root_path: projectRoot });
    const campaignId = "CAM-0106";
    const theoremName = "MathResearch.Goal3ReplayMaterialFailClosed106";
    const claimStatement = `${theoremName} : True`;
    const claim = registerClaim(projectRoot, {
      project_id: project.project_id,
      statement: claimStatement,
      assumptions: [],
      domain: "logic",
      status: "conjectural",
      actor: "goal3-task106"
    });
    assert.equal(claim.statement_hash, statementHash(claimStatement));

    const leanRootRel = `.comath/lean/task106-${name}`;
    writeProjectFile(projectRoot, `${leanRootRel}/MathResearch/Target.lean`, "namespace MathResearch\ntheorem Goal3ReplayMaterialFailClosed106 : True := by\n  trivial\nend MathResearch\n");
    writeProjectFile(projectRoot, `${leanRootRel}/Audit/TargetAudit.lean`, "import MathResearch.Target\n#check MathResearch.Goal3ReplayMaterialFailClosed106\n");
    writeJsonProjectFile(projectRoot, `${leanRootRel}/FormalSpec/formal_spec_lock.json`, {});
    writeJsonProjectFile(projectRoot, `${leanRootRel}/FormalSpec/assumption_ledger.json`, {});
    writeProjectFile(projectRoot, `${leanRootRel}/lakefile.lean`, "import Lake\nopen Lake DSL\npackage MathResearch where\nlean_lib MathResearch where\n  roots := #[`MathResearch.Target]\n");
    writeProjectFile(projectRoot, `${leanRootRel}/lean-toolchain`, "leanprover/lean4:v4.23.0\n");

    const workspace = `.comath/campaign/${campaignId}/ensembles/lemma_sprint/PO-0106/candidates/v1-direct-formalist`;
    const manifestRel = `${workspace}/candidate_manifest.json`;
    const materialSourceRel = `${workspace}/candidate_final_replay_material_source.json`;
    const candidateId = "CAND-0106";
    writeJsonProjectFile(projectRoot, manifestRel, {
      candidate_id: candidateId,
      campaign_id: campaignId,
      variant_id: "V1",
      stage: "lemma_sprint",
      obligation_id: "PO-0106",
      workspace_path: workspace,
      locked_statement_hash: claim.statement_hash,
      candidate_statement_hash: claim.statement_hash,
      state: "candidate_kernel_checked",
      statement_equivalence_claim: "exact",
      dependencies: ["Mathlib"],
      assumptions: [],
      introduced_assumptions: [],
      introduced_dependencies: [],
      artifacts: [
        {
          path: "candidate_final_replay_material_source.json",
          kind: "final_replay_material_source",
          required_for: ["final_replay_material"]
        }
      ],
      lean_files: [],
      logs: [],
      evidence: ["service_owned_lean_replay:CAND-0106"],
      hard_vetoes: [],
      failures: [],
      replay_command: "lake build MathResearch",
      summary: "non-authoritative candidate material source",
      maintainability_notes: "small"
    });
    const source = mutateSource({
      schema_version: "comath.selected_candidate_final_replay_material_source.v1",
      campaign_id: campaignId,
      claim_id: claim.id,
      obligation_id: "PO-0106",
      candidate_id: candidateId,
      artifact_role: "selected_candidate_final_replay_material_source",
      proof_authority: "none",
      can_promote_claim: false,
      lean_project: {
        lean_root: leanRootRel,
        theorem_file_rel: "MathResearch/Target.lean",
        formal_spec_file: "FormalSpec/formal_spec_lock.json",
        assumption_ledger_file: "FormalSpec/assumption_ledger.json",
        audit_file_rel: "Audit/TargetAudit.lean",
        lakefile: "lakefile.lean",
        toolchain_file: "lean-toolchain",
        theorem_name: theoremName,
        theorem_family_id: campaignId,
        canonical_proposition: "True",
        build_targets: ["MathResearch"],
        replay_command: "lake build MathResearch",
        primary_dependency: "Mathlib",
        formal_spec: {
          claim_id: claim.id,
          theorem_name: "Goal3ReplayMaterialFailClosed106",
          namespace: "MathResearch",
          normalized_statement: claimStatement,
          locked_statement_hash: claim.statement_hash
        }
      }
    });
    writeJsonProjectFile(projectRoot, materialSourceRel, source);
    writeJsonProjectFile(projectRoot, `.comath/campaign/${campaignId}/ensembles/lemma_sprint/PO-0106/candidates.json`, [
      {
        candidate_id: candidateId,
        campaign_id: campaignId,
        stage: "lemma_sprint",
        obligation_id: "PO-0106",
        variant_id: "V1",
        workspace_path: workspace,
        locked_statement_hash: claim.statement_hash,
        candidate_statement_hash: claim.statement_hash,
        state: "candidate_kernel_checked",
        manifest_path: manifestRel,
        score: 100,
        hard_vetoes: [],
        artifacts: [],
        replay_command: "lake build MathResearch"
      }
    ]);
    writeJsonProjectFile(projectRoot, `.comath/campaign/${campaignId}/ensembles/lemma_sprint/PO-0106/decision.json`, {
      selected_candidate_id: candidateId,
      selection_mode: "evidence_weighted",
      proof_authority: "none",
      rejected_candidates: [],
      hard_vetoes: [],
      recovery_plan: []
    });
    writeJsonProjectFile(projectRoot, `.comath/campaign/${campaignId}/refutation_red_team.json`, {
      campaign_id: campaignId,
      obligation_id: "PO-0106",
      selected_candidate_id: candidateId,
      proof_authority: "none",
      result: "no_counterexample_found"
    });
    writeCampaign(projectRoot, campaignFixture(project.project_id, campaignId, claim.id, claim.statement_hash), "goal3-task106");

    const result = await tickCampaign({
      project_root: projectRoot,
      campaign_id: campaignId,
      actor: "goal3-task106"
    });

    assert.equal(result.campaign.current_stage, "blocked");
    assert.match(JSON.stringify(result.campaign.blockers), new RegExp(expectedReason));
    assert.equal(existsSync(join(projectRoot, `.comath/campaign/${campaignId}/generated_final_replay_material.json`)), false);
    assert.equal(getClaim(projectRoot, project.project_id, claim.id)?.status, "conjectural");
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
}

await runBlockedScenario(
  "promotional-source",
  (source) => ({ ...source, proof_authority: "lean_kernel_clean_replay" }),
  "selected_candidate_final_replay_material_source_identity_mismatch"
);

await runBlockedScenario(
  "statement-drift",
  (source) => ({
    ...source,
    lean_project: {
      ...source.lean_project,
      formal_spec: {
        ...source.lean_project.formal_spec,
        locked_statement_hash: "sha256:drifted"
      }
    }
  }),
  "final_replay_request_statement_hash_drift"
);

console.log("Goal 3 Task 106 final replay material fail-closed test passed.");
