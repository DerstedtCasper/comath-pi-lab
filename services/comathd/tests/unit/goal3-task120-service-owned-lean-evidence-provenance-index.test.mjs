import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  appendLeanRunManifestProvenanceIndexV1,
  createServiceOwnedLeanRunManifestV3,
  decideCandidate,
  initProject,
  registerClaim
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task120-service-owned-lean-evidence-"));

function writeProjectFile(relativePath, content) {
  const path = join(projectRoot, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
  return path;
}

function writeLeanRunManifest({ campaignId, claim, candidateId, runId, appendIndex }) {
  const inputRel = `.comath/evidence/${claim.id}/lean/${candidateId}/Target.lean`;
  const toolchainRel = `.comath/evidence/${claim.id}/lean/${candidateId}/lean-toolchain`;
  const stdoutRel = `.comath/evidence/${claim.id}/lean/${candidateId}/stdout.log`;
  const stderrRel = `.comath/evidence/${claim.id}/lean/${candidateId}/stderr.log`;
  const manifestRel = `.comath/evidence/${claim.id}/lean/${candidateId}/${runId}.manifest.json`;
  writeProjectFile(inputRel, "theorem Goal3Task120 : True := by trivial\n");
  writeProjectFile(toolchainRel, "leanprover/lean4:v4.23.0\n");
  writeProjectFile(stdoutRel, "ok\n");
  writeProjectFile(stderrRel, "");
  const manifest = createServiceOwnedLeanRunManifestV3({
    projectRoot,
    run_id: runId,
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
  writeProjectFile(manifestRel, `${JSON.stringify(manifest, null, 2)}\n`);
  if (appendIndex) {
    appendLeanRunManifestProvenanceIndexV1({
      projectRoot,
      project_id: claim.project_id,
      actor: "goal3-task120",
      manifest,
      manifest_path: join(projectRoot, manifestRel)
    });
  }
  return manifestRel;
}

function writeCandidateManifest(candidate, evidence) {
  const manifestPath = join(candidate.workspace_path, "candidate_manifest.json");
  writeProjectFile(
    manifestPath,
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
        state: "candidate_kernel_checked",
        statement_equivalence_claim: "exact",
        primary_dependency: "Mathlib",
        dependencies: ["Mathlib"],
        assumptions: [],
        introduced_assumptions: [],
        introduced_dependencies: ["Mathlib"],
        artifacts: [],
        lean_files: [],
        logs: [],
        evidence,
        hard_vetoes: [],
        failures: [],
        replay_command: "lake build MathResearch",
        summary: "Task120 service-owned Lean evidence provenance fixture.",
        maintainability_notes: "Candidate proof-grade evidence must be append-only indexed."
      },
      null,
      2
    )}\n`
  );
  return manifestPath.replace(/\\/g, "/");
}

try {
  const { project } = initProject({ name: "Goal 3 Task120", root_path: projectRoot });
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: "MathResearch.Goal3Task120 : True",
    assumptions: [],
    domain: "logic",
    status: "conjectural",
    actor: "goal3-task120"
  });
  const campaign = {
    campaign_id: "CAM-0120",
    project_id: project.project_id,
    root_claim_id: claim.id,
    user_goal: claim.statement,
    current_stage: "candidate_arbitration",
    status: "running",
    strict_mode: true,
    stage_runs: [],
    open_obligations: [],
    accepted_artifacts: [],
    blockers: [],
    next_actions: [],
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: "2026-06-01T00:00:00.000Z"
  };

  const unindexedCandidate = {
    candidate_id: "CAND-012001",
    campaign_id: campaign.campaign_id,
    stage: "lemma_sprint",
    obligation_id: "PO-0120",
    variant_id: "V2",
    workspace_path: ".comath/ensembles/goal3-task120/unindexed",
    locked_statement_hash: claim.statement_hash,
    candidate_statement_hash: claim.statement_hash,
    state: "candidate_kernel_checked",
    score: 120,
    hard_vetoes: [],
    replay_command: "lake build MathResearch"
  };
  const unindexedManifest = writeLeanRunManifest({
    campaignId: campaign.campaign_id,
    claim,
    candidateId: unindexedCandidate.candidate_id,
    runId: "LRUN-012001",
    appendIndex: false
  });
  unindexedCandidate.manifest_path = writeCandidateManifest(unindexedCandidate, [`lean_run_manifest:${unindexedManifest}`]);
  const unindexedDecision = decideCandidate({ projectRoot, campaign, candidates: [unindexedCandidate] });
  assert.equal(unindexedDecision.decision.selected_candidate_id, null);
  assert.equal(unindexedDecision.gate.result, "blocked");
  assert.equal(
    unindexedDecision.decision.rejected_candidates.some(
      (item) => item.candidate_id === unindexedCandidate.candidate_id && /missing service-owned Lean replay evidence/.test(item.reason)
    ),
    true
  );

  const indexedCandidate = {
    ...unindexedCandidate,
    candidate_id: "CAND-012002",
    workspace_path: ".comath/ensembles/goal3-task120/indexed"
  };
  const indexedManifest = writeLeanRunManifest({
    campaignId: campaign.campaign_id,
    claim,
    candidateId: indexedCandidate.candidate_id,
    runId: "LRUN-012002",
    appendIndex: true
  });
  indexedCandidate.manifest_path = writeCandidateManifest(indexedCandidate, [`lean_run_manifest:${indexedManifest}`]);
  const indexedDecision = decideCandidate({ projectRoot, campaign, candidates: [indexedCandidate] });
  assert.equal(indexedDecision.decision.selected_candidate_id, indexedCandidate.candidate_id);
  assert.equal(indexedDecision.gate.result, "pass");
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task120 service-owned Lean evidence provenance-index tests passed.");
