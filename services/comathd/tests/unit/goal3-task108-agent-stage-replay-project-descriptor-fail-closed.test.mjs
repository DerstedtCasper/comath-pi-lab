import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  initProject,
  registerClaim,
  runGaAgentStageCandidates
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task108-agent-stage-descriptor-fail-closed-"));

try {
  const { project } = initProject({ name: "Goal 3 Task 108 Fail Closed", root_path: projectRoot });
  const campaignId = "CAM-0108";
  const theoremName = "MathResearch.Goal3Task108";
  const claimStatement = `${theoremName} : True`;
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: claimStatement,
    assumptions: [],
    domain: "logic",
    status: "conjectural",
    actor: "goal3-task108"
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
    obligation_id: "PO-0108",
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
    lean_root: ".comath/lean/task108-native-candidate",
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
      theorem_name: "Goal3Task108",
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
            statement_equivalence_claim: "weaker",
            candidate_statement_hash: claim.statement_hash,
            evidence: ["service_owned_lean_replay:CAND-010802"],
            replay_command: "lake build MathResearch",
            replay_project: replayProject
          };
        }
      }),
    /candidate_replay_project_requires_exact_statement/
  );

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
            candidate_statement_hash: "drifted-hash",
            evidence: ["service_owned_lean_replay:CAND-010802"],
            replay_command: "lake build MathResearch",
            replay_project: {
              ...replayProject,
              formal_spec: {
                ...replayProject.formal_spec,
                locked_statement_hash: "drifted-hash"
              }
            }
          };
        }
      }),
    /candidate_replay_project_statement_hash_drift/
  );

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
            introduced_assumptions: ["assume extra decidability"],
            evidence: ["service_owned_lean_replay:CAND-010802"],
            replay_command: "lake build MathResearch",
            replay_project: replayProject
          };
        }
      }),
    /candidate_replay_project_hidden_assumption/
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 108 agent-stage replay project descriptor fail-closed test passed.");
