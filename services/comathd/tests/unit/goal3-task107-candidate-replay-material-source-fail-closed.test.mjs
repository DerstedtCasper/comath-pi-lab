import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  createServiceOwnedLeanRunManifestV3,
  getClaim,
  initProject,
  registerClaim,
  statementHash,
  tickCampaign,
  writeCampaign
} from "../../dist/index.js";

function writeProjectFile(projectRoot, relativePath, text) {
  const absolute = join(projectRoot, relativePath);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, text, "utf8");
}

function writeJsonProjectFile(projectRoot, relativePath, value) {
  writeProjectFile(projectRoot, relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeVerifiedLeanRunManifest({ projectRoot, campaignId, claim, candidateId }) {
  const inputRel = `.comath/evidence/${claim.id}/lean/${candidateId}/Target.lean`;
  const toolchainRel = `.comath/evidence/${claim.id}/lean/${candidateId}/lean-toolchain`;
  const stdoutRel = `.comath/evidence/${claim.id}/lean/${candidateId}/stdout.log`;
  const stderrRel = `.comath/evidence/${claim.id}/lean/${candidateId}/stderr.log`;
  const manifestRel = `.comath/evidence/${claim.id}/lean/${candidateId}/lean_run_manifest_v3.json`;
  writeProjectFile(projectRoot, inputRel, "theorem Goal3CandidateReplaySourceFailClosed107 : True := by trivial\n");
  writeProjectFile(projectRoot, toolchainRel, "leanprover/lean4:v4.23.0\n");
  writeProjectFile(projectRoot, stdoutRel, "ok\n");
  writeProjectFile(projectRoot, stderrRel, "");
  const manifest = createServiceOwnedLeanRunManifestV3({
    projectRoot,
    run_id: "LRUN-0107",
    claim_id: claim.id,
    campaign_id: campaignId,
    candidate_id: candidateId,
    purpose: "check",
    command: ["lake", "build", "MathResearch"],
    cwd: join(projectRoot, `.comath/evidence/${claim.id}/lean/${candidateId}`),
    input_files: [join(projectRoot, inputRel), join(projectRoot, toolchainRel)],
    lean_version: "4.23.0",
    lake_version: "5.0.0",
    elan_toolchain: "leanprover/lean4:v4.23.0",
    lean_toolchain_file: join(projectRoot, toolchainRel),
    network_policy: "disabled",
    sandbox: "none",
    exit_code: 0,
    stdout_path: join(projectRoot, stdoutRel),
    stderr_path: join(projectRoot, stderrRel),
    started_at: "2026-06-01T00:00:00.000Z",
    ended_at: "2026-06-01T00:00:01.000Z",
    proof_authority: "lean_kernel_check"
  });
  writeJsonProjectFile(projectRoot, manifestRel, manifest);
  return manifestRel;
}

function campaignFixture(projectId, campaignId, claimId, statementHashValue) {
  const now = "2026-05-31T00:00:00.000Z";
  return {
    campaign_id: campaignId,
    project_id: projectId,
    root_claim_id: claimId,
    user_goal: "Task107 candidate replay-material source fail-closed guard",
    current_stage: "candidate_arbitration",
    status: "running",
    strict_mode: true,
    stage_runs: [],
    open_obligations: [
      {
        obligation_id: "PO-0107",
        claim_id: claimId,
        locked_statement_nl: "MathResearch.Goal3CandidateReplaySourceFailClosed107 : True",
        locked_statement_structured: {},
        statement_hash: statementHashValue,
        dependencies: [],
        assumptions: [],
        status: "candidate_search"
      }
    ],
    accepted_artifacts: [],
    blockers: [],
    next_actions: ["select candidate by evidence-weighted arbitration"],
    created_at: now,
    updated_at: now
  };
}

async function runBlockedScenario(name, mutateDescriptor, expectedReason) {
  const projectRoot = mkdtempSync(join(tmpdir(), `comath-goal3-task107-${name}-`));
  try {
    const { project } = initProject({ name: `Goal 3 Task 107 ${name}`, root_path: projectRoot });
    const campaignId = "CAM-0107";
    const theoremName = "MathResearch.Goal3CandidateReplaySourceFailClosed107";
    const claimStatement = `${theoremName} : True`;
    const claim = registerClaim(projectRoot, {
      project_id: project.project_id,
      statement: claimStatement,
      assumptions: [],
      domain: "logic",
      status: "conjectural",
      actor: "goal3-task107"
    });
    assert.equal(claim.statement_hash, statementHash(claimStatement));

    const leanRootRel = `.comath/lean/task107-${name}`;
    writeProjectFile(projectRoot, `${leanRootRel}/MathResearch/Target.lean`, "namespace MathResearch\ntheorem Goal3CandidateReplaySourceFailClosed107 : True := by\n  trivial\nend MathResearch\n");
    writeProjectFile(projectRoot, `${leanRootRel}/Audit/TargetAudit.lean`, "import MathResearch.Target\n#check MathResearch.Goal3CandidateReplaySourceFailClosed107\n");
    writeJsonProjectFile(projectRoot, `${leanRootRel}/FormalSpec/formal_spec_lock.json`, {});
    writeJsonProjectFile(projectRoot, `${leanRootRel}/FormalSpec/assumption_ledger.json`, {});
    writeProjectFile(projectRoot, `${leanRootRel}/lakefile.lean`, "import Lake\nopen Lake DSL\npackage MathResearch where\nlean_lib MathResearch where\n  roots := #[`MathResearch.Target]\n");
    writeProjectFile(projectRoot, `${leanRootRel}/lean-toolchain`, "leanprover/lean4:v4.23.0\n");

    const workspace = `.comath/campaign/${campaignId}/ensembles/lemma_sprint/PO-0107/candidates/v1-direct-formalist`;
    const manifestRel = `${workspace}/candidate_manifest.json`;
    const descriptorRel = `${workspace}/candidate_replay_project_descriptor.json`;
    const sourceRel = `${workspace}/candidate_final_replay_material_source.json`;
    const candidateId = "CAND-0107";
    writeJsonProjectFile(projectRoot, manifestRel, {
      candidate_id: candidateId,
      campaign_id: campaignId,
      variant_id: "V1",
      stage: "lemma_sprint",
      obligation_id: "PO-0107",
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
          path: "candidate_replay_project_descriptor.json",
          kind: "candidate_replay_project_descriptor",
          required_for: ["candidate_replay_material_source"]
        }
      ],
      lean_files: [],
      logs: [],
      evidence: [writeVerifiedLeanRunManifest({ projectRoot, campaignId, claim, candidateId })],
      hard_vetoes: [],
      failures: [],
      replay_command: "lake build MathResearch",
      summary: "non-authoritative candidate replay project descriptor",
      maintainability_notes: "small"
    });
    const descriptor = mutateDescriptor({
      schema_version: "comath.candidate_replay_project_descriptor.v1",
      campaign_id: campaignId,
      claim_id: claim.id,
      obligation_id: "PO-0107",
      candidate_id: candidateId,
      artifact_role: "candidate_replay_project_descriptor",
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
          theorem_name: "Goal3CandidateReplaySourceFailClosed107",
          namespace: "MathResearch",
          normalized_statement: claimStatement,
          locked_statement_hash: claim.statement_hash
        }
      }
    });
    writeJsonProjectFile(projectRoot, descriptorRel, descriptor);
    writeJsonProjectFile(projectRoot, `.comath/campaign/${campaignId}/ensembles/lemma_sprint/PO-0107/candidates.json`, [
      {
        candidate_id: candidateId,
        campaign_id: campaignId,
        stage: "lemma_sprint",
        obligation_id: "PO-0107",
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
    writeCampaign(projectRoot, campaignFixture(project.project_id, campaignId, claim.id, claim.statement_hash), "goal3-task107");

    const result = await tickCampaign({
      project_root: projectRoot,
      campaign_id: campaignId,
      actor: "goal3-task107"
    });

    assert.equal(result.campaign.current_stage, "blocked");
    assert.match(JSON.stringify(result.campaign.blockers), new RegExp(expectedReason));
    assert.equal(existsSync(join(projectRoot, sourceRel)), false);
    assert.equal(getClaim(projectRoot, project.project_id, claim.id)?.status, "conjectural");
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
}

await runBlockedScenario(
  "authority-forgery",
  (descriptor) => ({ ...descriptor, proof_authority: "lean_kernel_clean_replay" }),
  "candidate_replay_material_authority_forgery"
);

await runBlockedScenario(
  "statement-drift",
  (descriptor) => ({
    ...descriptor,
    lean_project: {
      ...descriptor.lean_project,
      formal_spec: {
        ...descriptor.lean_project.formal_spec,
        locked_statement_hash: "sha256:drifted"
      }
    }
  }),
  "final_replay_request_statement_hash_drift"
);

await runBlockedScenario(
  "candidate-mismatch",
  (descriptor) => ({ ...descriptor, candidate_id: "CAND-OTHER" }),
  "candidate_replay_material_identity_mismatch"
);

console.log("Goal 3 Task 107 candidate replay material source fail-closed test passed.");
