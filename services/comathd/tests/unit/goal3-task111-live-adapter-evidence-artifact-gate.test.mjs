import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  createServiceOwnedLeanRunManifestV3,
  decideCandidate,
  initProject,
  registerClaim,
  runGaAgentStageCandidates
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task111-live-adapter-evidence-"));

function writeProjectFile(relativePath, content) {
  const path = join(projectRoot, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
  return path;
}

function writeVerifiedLeanRunManifest({ campaignId, claim, candidateId, suffix = "0111" }) {
  const inputRel = `.comath/evidence/${claim.id}/lean/${candidateId}/Target.lean`;
  const toolchainRel = `.comath/evidence/${claim.id}/lean/${candidateId}/lean-toolchain`;
  const stdoutRel = `.comath/evidence/${claim.id}/lean/${candidateId}/stdout.log`;
  const stderrRel = `.comath/evidence/${claim.id}/lean/${candidateId}/stderr.log`;
  const manifestRel = `.comath/evidence/${claim.id}/lean/${candidateId}/lean_run_manifest_v3.json`;
  writeProjectFile(inputRel, "theorem Goal3Task111 : True := by trivial\n");
  writeProjectFile(toolchainRel, "leanprover/lean4:v4.23.0\n");
  writeProjectFile(stdoutRel, "ok\n");
  writeProjectFile(stderrRel, "");
  const manifest = createServiceOwnedLeanRunManifestV3({
    projectRoot,
    run_id: `LRUN-${suffix}`,
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
        replay_command: candidate.replay_command,
        summary: "Task111 marker-string spoofing fixture.",
        maintainability_notes: "Small exact candidate; evidence must be artifact-backed."
      },
      null,
      2
    )}\n`
  );
  return manifestRel;
}

try {
  const { project } = initProject({ name: "Goal 3 Task 111", root_path: projectRoot });
  const campaignId = "CAM-0111";
  const theoremName = "MathResearch.Goal3Task111";
  const claimStatement = `${theoremName} : True`;
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: claimStatement,
    assumptions: [],
    domain: "logic",
    status: "conjectural",
    actor: "goal3-task111"
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
  const obligation = {
    obligation_id: "PO-0111",
    claim_id: claim.id,
    locked_statement_nl: claimStatement,
    locked_statement_structured: {},
    lean_target: theoremName,
    statement_hash: claim.statement_hash,
    dependencies: [],
    assumptions: [],
    status: "candidate_search"
  };
  const replayProject = {
    lean_root: ".comath/lean/task111-native-candidate",
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
      theorem_name: "Goal3Task111",
      namespace: "MathResearch",
      normalized_statement: claimStatement,
      locked_statement_hash: claim.statement_hash
    }
  };

  assert.throws(
    () =>
      runGaAgentStageCandidates({
        projectRoot,
        campaign,
        obligation,
        stage: "lemma_sprint",
        locked_statement_hash: claim.statement_hash,
        adapter: ({ taskCard }) => {
          if (taskCard.variant_id !== "V2") {
            return { state: "candidate_plausible_only", score: 1 };
          }
          return {
            state: "candidate_kernel_checked",
            score: 120,
            statement_equivalence_claim: "exact",
            candidate_statement_hash: claim.statement_hash,
            evidence: ["service_owned_lean_replay:CAND-011102"],
            replay_command: "lake build MathResearch",
            replay_project: replayProject
          };
        }
      }),
    /candidate_replay_project_requires_service_owned_lean_manifest_artifact/
  );

  const kernelCandidate = {
    candidate_id: "CAND-0111",
    campaign_id: campaignId,
    stage: "lemma_sprint",
    obligation_id: "PO-0111",
    variant_id: "V2",
    workspace_path: ".comath/campaign/CAM-0111/ensembles/lemma_sprint/PO-0111/candidates/v2-library-premise-hunter",
    locked_statement_hash: claim.statement_hash,
    candidate_statement_hash: claim.statement_hash,
    state: "candidate_kernel_checked",
    score: 120,
    hard_vetoes: [],
    replay_command: "lake build MathResearch"
  };
  kernelCandidate.manifest_path = writeCandidateManifest(kernelCandidate, [
    "service_owned_lean_replay:CAND-0111"
  ]);

  const decision = decideCandidate({ projectRoot, campaign, candidates: [kernelCandidate] });
  assert.equal(decision.decision.selected_candidate_id, null);
  assert.equal(decision.gate.result, "blocked");
  assert.ok(
    decision.decision.rejected_candidates.some(
      (item) => item.candidate_id === "CAND-0111" && /missing service-owned Lean replay evidence/.test(item.reason)
    )
  );

  const verifiedCandidate = {
    ...kernelCandidate,
    candidate_id: "CAND-1111",
    workspace_path: ".comath/campaign/CAM-0111/ensembles/lemma_sprint/PO-0111/candidates/v2-verified"
  };
  const verifiedManifestRel = writeVerifiedLeanRunManifest({
    campaignId,
    claim,
    candidateId: verifiedCandidate.candidate_id
  });
  verifiedCandidate.manifest_path = writeCandidateManifest(verifiedCandidate, [verifiedManifestRel]);
  const verifiedDecision = decideCandidate({ projectRoot, campaign, candidates: [verifiedCandidate] });
  assert.equal(verifiedDecision.decision.selected_candidate_id, verifiedCandidate.candidate_id);
  assert.equal(verifiedDecision.gate.result, "pass");
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 111 live adapter evidence artifact gate test passed.");
