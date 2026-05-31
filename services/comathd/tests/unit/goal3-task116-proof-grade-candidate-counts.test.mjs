import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  appendLeanRunManifestProvenanceIndexV1,
  createServiceOwnedLeanRunManifestV3,
  initProject,
  registerClaim,
  summarizeCandidateProofGradeEvidence
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task116-proof-grade-counts-"));

function writeProjectFile(relativePath, content) {
  const path = join(projectRoot, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
  return path;
}

function writeLeanRunManifest({ campaignId, claim, candidateId, tamperInput = false }) {
  const leanRootRel = `.comath/evidence/${claim.id}/lean/${candidateId}`;
  const inputRel = `${leanRootRel}/MathResearch/Target.lean`;
  const auditRel = `${leanRootRel}/Audit/TargetAudit.lean`;
  const toolchainRel = `${leanRootRel}/lean-toolchain`;
  const stdoutRel = `${leanRootRel}/stdout.log`;
  const stderrRel = `${leanRootRel}/stderr.log`;
  const manifestRel = `${leanRootRel}/LRUN-${candidateId.replace(/\D/g, "").slice(-4).padStart(4, "0")}.manifest.json`;
  writeProjectFile(inputRel, "namespace MathResearch\n\ntheorem Goal3Task116 : True := by\n  trivial\n\nend MathResearch\n");
  writeProjectFile(auditRel, "import MathResearch.Target\n#check MathResearch.Goal3Task116\n");
  writeProjectFile(toolchainRel, "leanprover/lean4:v4.23.0\n");
  writeProjectFile(stdoutRel, "ok\n");
  writeProjectFile(stderrRel, "");
  const manifest = createServiceOwnedLeanRunManifestV3({
    projectRoot,
    run_id: `LRUN-${candidateId.replace(/\D/g, "").slice(-4).padStart(4, "0")}`,
    claim_id: claim.id,
    campaign_id: campaignId,
    candidate_id: candidateId,
    purpose: "check",
    command: ["lake", "build", "MathResearch"],
    cwd: join(projectRoot, leanRootRel),
    input_files: [join(projectRoot, inputRel), join(projectRoot, auditRel), join(projectRoot, toolchainRel)],
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
  writeProjectFile(manifestRel, `${JSON.stringify(manifest, null, 2)}\n`);
  appendLeanRunManifestProvenanceIndexV1({
    projectRoot,
    project_id: claim.project_id,
    actor: "goal3-task116",
    manifest,
    manifest_path: join(projectRoot, manifestRel)
  });
  if (tamperInput) {
    writeProjectFile(inputRel, "axiom Goal3Task116 : False\n");
  }
  return manifestRel;
}

function writeCandidateManifest(candidate, evidence) {
  const manifestRel = `${candidate.workspace_path}/candidate_manifest.json`;
  writeProjectFile(
    manifestRel,
    `${JSON.stringify(
      {
        candidate_id: candidate.candidate_id,
        campaign_id: candidate.campaign_id,
        variant_id: candidate.variant_id,
        stage: candidate.stage,
        obligation_id: candidate.obligation_id,
        workspace_path: candidate.workspace_path,
        locked_statement_hash: candidate.locked_statement_hash,
        candidate_statement_hash: candidate.candidate_statement_hash,
        state: candidate.state,
        statement_equivalence_claim: "exact",
        primary_dependency: "Lean4",
        dependencies: ["Lean4"],
        assumptions: [],
        introduced_assumptions: [],
        introduced_dependencies: ["Lean4"],
        artifacts: [],
        lean_files: [],
        logs: [],
        evidence,
        hard_vetoes: [],
        failures: [],
        replay_command: candidate.replay_command,
        summary: "Task116 proof-grade count fixture.",
        maintainability_notes: "Read models must distinguish raw candidate state from verified Lean evidence."
      },
      null,
      2
    )}\n`
  );
  return manifestRel;
}

function candidateFixture({ campaignId, claim, candidateId, variantId, evidence }) {
  const candidate = {
    candidate_id: candidateId,
    campaign_id: campaignId,
    stage: "lemma_sprint",
    obligation_id: "PO-0116",
    variant_id: variantId,
    workspace_path: `.comath/campaign/${campaignId}/ensembles/lemma_sprint/PO-0116/candidates/${variantId.toLowerCase()}`,
    locked_statement_hash: claim.statement_hash,
    candidate_statement_hash: claim.statement_hash,
    state: "candidate_kernel_checked",
    score: 150,
    hard_vetoes: [],
    replay_command: "lake build MathResearch"
  };
  candidate.manifest_path = writeCandidateManifest(candidate, evidence);
  return candidate;
}

try {
  const { project } = initProject({ name: "Goal 3 Task 116", root_path: projectRoot });
  const campaignId = "CAM-0116";
  const claimStatement = "MathResearch.Goal3Task116 : True";
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: claimStatement,
    assumptions: [],
    domain: "logic",
    status: "conjectural",
    actor: "goal3-task116"
  });
  const campaign = {
    campaign_id: campaignId,
    project_id: project.project_id,
    root_claim_id: claim.id,
    user_goal: claimStatement,
    current_stage: "candidate_generation",
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

  const staleManifestRel = writeLeanRunManifest({ campaignId, claim, candidateId: "CAND-011601", tamperInput: true });
  const verifiedManifestRel = writeLeanRunManifest({ campaignId, claim, candidateId: "CAND-011602" });
  const staleCandidate = candidateFixture({
    campaignId,
    claim,
    candidateId: "CAND-011601",
    variantId: "V1",
    evidence: [`lean_run_manifest:${staleManifestRel}`]
  });
  const verifiedCandidate = candidateFixture({
    campaignId,
    claim,
    candidateId: "CAND-011602",
    variantId: "V2",
    evidence: [`lean_run_manifest:${verifiedManifestRel}`]
  });
  const plausibleCandidate = {
    candidate_id: "CAND-011603",
    campaign_id: campaignId,
    stage: "lemma_sprint",
    obligation_id: "PO-0116",
    variant_id: "V3",
    workspace_path: `.comath/campaign/${campaignId}/ensembles/lemma_sprint/PO-0116/candidates/v3`,
    locked_statement_hash: claim.statement_hash,
    candidate_statement_hash: claim.statement_hash,
    state: "candidate_plausible_only",
    score: 1,
    hard_vetoes: []
  };

  const summary = summarizeCandidateProofGradeEvidence({
    projectRoot,
    campaign,
    candidates: [staleCandidate, verifiedCandidate, plausibleCandidate]
  });

  assert.equal(summary.kernel_checked_candidates, 2);
  assert.equal(summary.kernel_checked_count_semantics, "raw_candidate_state_only");
  assert.deepEqual(summary.kernel_checked_candidate_ids, ["CAND-011601", "CAND-011602"]);
  assert.equal(summary.proof_grade_kernel_checked_candidates, 1);
  assert.equal(summary.proof_grade_kernel_checked_count_semantics, "service_owned_manifest_verified");
  assert.deepEqual(summary.proof_grade_kernel_checked_candidate_ids, ["CAND-011602"]);
  assert.equal(summary.proof_authority, "none");
  assert.equal(summary.can_promote_claim, false);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 116 proof-grade candidate count tests passed.");
