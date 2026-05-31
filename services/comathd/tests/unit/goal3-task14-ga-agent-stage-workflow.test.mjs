import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import {
  aggregateGaAgentStageCandidates,
  createServiceOwnedLeanRunManifestV3,
  createGaAgentStageTaskCards,
  initProject,
  listGaAgentTeam,
  parseGaAgentOutputJson,
  registerClaim,
  runGaAgentStageCandidates
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task14-agent-stage-"));

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(projectRoot, relativePath), "utf8"));
}

function writeProjectFile(relativePath, content) {
  const path = join(projectRoot, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
  return path;
}

function writeVerifiedLeanRunManifest({ campaignId, claim, candidateId }) {
  const inputRel = `.comath/evidence/${claim.id}/lean/${candidateId}/Target.lean`;
  const toolchainRel = `.comath/evidence/${claim.id}/lean/${candidateId}/lean-toolchain`;
  const stdoutRel = `.comath/evidence/${claim.id}/lean/${candidateId}/stdout.log`;
  const stderrRel = `.comath/evidence/${claim.id}/lean/${candidateId}/stderr.log`;
  const manifestRel = `.comath/evidence/${claim.id}/lean/${candidateId}/lean_run_manifest_v3.json`;
  writeProjectFile(inputRel, "theorem Locked : True := by trivial\n");
  writeProjectFile(toolchainRel, "leanprover/lean4:v4.23.0\n");
  writeProjectFile(stdoutRel, "ok\n");
  writeProjectFile(stderrRel, "");
  const manifest = createServiceOwnedLeanRunManifestV3({
    projectRoot,
    run_id: "LRUN-0014",
    claim_id: claim.id,
    campaign_id: campaignId,
    candidate_id: candidateId,
    purpose: "check",
    command: ["lake", "build", "Task14.Locked"],
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

try {
  const { project } = initProject({ name: "Goal 3 Task 14", root_path: projectRoot });
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: "Locked theorem statement for Task 14.",
    assumptions: [],
    domain: "formal-workbench",
    status: "conjectural",
    actor: "goal3-task14"
  });
  const campaign = {
    campaign_id: "CAM-0014",
    project_id: project.project_id,
    root_claim_id: claim.id,
    user_goal: claim.statement,
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
    obligation_id: "PO-0014",
    claim_id: claim.id,
    locked_statement_nl: claim.statement,
    locked_statement_structured: { theorem: "Task14.Locked" },
    lean_target: "Task14.Locked",
    statement_hash: claim.statement_hash,
    dependencies: [],
    assumptions: [],
    status: "candidate_search"
  };

  const team = listGaAgentTeam();
  assert.deepEqual(team.map((agent) => agent.agent_id), ["A0", "A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8"]);
  for (const agent of team) {
    assert.equal(agent.proof_authority, "none");
    assert.equal(agent.may_mutate_trusted_state, false);
    assert.equal(agent.default_prompt.length > 0, true);
    assert.equal(agent.global_invariants.includes("must preserve locked statement hash"), true);
    assert.equal(agent.global_invariants.includes("must output strict JSON"), true);
    assert.equal(agent.global_invariants.includes("reviewer vote is advisory only"), true);
  }

  const taskCards = createGaAgentStageTaskCards({
    campaign,
    obligation,
    stage: "lemma_sprint",
    locked_statement_hash: claim.statement_hash
  });
  assert.deepEqual(taskCards.map((task) => task.variant_id), ["V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8"]);
  assert.equal(new Set(taskCards.map((task) => task.task_id)).size, 8);
  assert.equal(new Set(taskCards.map((task) => task.workspace_path)).size, 8);
  assert.equal(taskCards.every((task) => task.proof_authority === "none"), true);
  assert.equal(taskCards.every((task) => task.may_mutate_trusted_state === false), true);

  assert.throws(
    () =>
      parseGaAgentOutputJson(
        JSON.stringify({
          agent_id: "A5",
          task_id: "ATASK-0014-V4",
          stage: "lemma_sprint",
          locked_statement_hash: claim.statement_hash,
          summary: "malformed because proof_authority is trusted",
          artifacts: [],
          proposed_candidates: [],
          introduced_assumptions: [],
          introduced_dependencies: [],
          requested_tool_calls: [],
          hard_vetoes: [],
          blockers: [],
          confidence: 0.5,
          proof_authority: "trusted",
          unexpected_field: true
        })
      ),
    /strict JSON|proof_authority/
  );

  const batch = runGaAgentStageCandidates({
    projectRoot,
    campaign,
    obligation,
    stage: "lemma_sprint",
    locked_statement_hash: claim.statement_hash,
    adapter: ({ taskCard }) => {
      if (taskCard.variant_id === "V1") {
        return {
          state: "candidate_kernel_checked",
          score: 99999,
          evidence: [],
          replay_command: "",
          summary: "Synthetic V1 winner with no service-owned Lean evidence."
        };
      }
      if (taskCard.variant_id === "V2") {
        return {
          state: "candidate_kernel_checked",
          score: 5,
          evidence: [writeVerifiedLeanRunManifest({ campaignId: campaign.campaign_id, claim, candidateId: "CAND-001402" })],
          replay_command: "lake build Task14.Locked",
          introduced_dependencies: ["Mathlib"],
          dependencies: ["Mathlib"],
          maintainability_notes: "small clean maintainable candidate",
          summary: "Candidate with service-owned Lean manifest evidence."
        };
      }
      if (taskCard.variant_id === "V6") {
        return {
          state: "candidate_plausible_only",
          hard_vetoes: ["hidden_assumption"],
          score: 10,
          summary: "Boundary refuter found a hidden assumption."
        };
      }
      return { state: "candidate_plausible_only", score: 1, summary: `${taskCard.variant_id} advisory draft.` };
    }
  });
  assert.equal(batch.task_cards.length, 8);
  assert.equal(batch.candidates.length, 8);
  assert.equal(batch.agent_outputs.length, 8);
  assert.equal(batch.proof_authority, "none");
  assert.equal(batch.candidates.every((candidate) => candidate.manifest_path), true);
  assert.equal(batch.agent_outputs.every((output) => output.proof_authority === "none"), true);
  assert.equal(existsSync(join(projectRoot, batch.task_cards[0].workspace_path, "task_card.json")), true);
  assert.equal(readJson(`${batch.task_cards[0].workspace_path}/agent_output.json`).proof_authority, "none");
  assert.equal(existsSync(join(projectRoot, batch.task_cards[0].workspace_path, "agent_stage_log.jsonl")), true);

  const decision = aggregateGaAgentStageCandidates({
    projectRoot,
    campaign,
    candidates: batch.candidates,
    reviewer_votes: [
      { reviewer_id: "A7", candidate_id: "CAND-001401", vote: "approve", rationale: "vote must not certify proof" },
      { reviewer_id: "A8", candidate_id: "CAND-001401", vote: "approve", rationale: "vote is advisory only" },
      { reviewer_id: "A7", candidate_id: "CAND-001402", vote: "approve", rationale: "tie-breaker only after gates" }
    ]
  });
  assert.equal(decision.decision.selected_candidate_id, "CAND-001402");
  assert.equal(decision.decision.proof_authority, "none");
  assert.equal(decision.decision.selection_mode, "evidence_weighted");
  assert.equal(decision.decision.reviewer_votes_are_advisory, true);
  assert.equal(decision.decision.hard_vetoes.includes("synthetic_variant_winner_rejected"), true);
  assert.equal(decision.decision.hard_vetoes.includes("hidden_assumption"), true);
  assert.equal(
    decision.decision.rejected_candidates.some(
      (item) => item.candidate_id === "CAND-001401" && /missing service-owned Lean replay evidence/.test(item.reason)
    ),
    true
  );
  const failureAggregatePath = join(
    projectRoot,
    ".comath",
    "proof_memory",
    "failure_aggregate_CAM-0014_lemma_sprint_PO-0014.json"
  );
  assert.equal(existsSync(failureAggregatePath), true);
  const failureAggregate = JSON.parse(readFileSync(failureAggregatePath, "utf8"));
  assert.equal(failureAggregate.proof_authority, "none");
  assert.equal(failureAggregate.total_failed_routes >= 1, true);
  assert.equal(failureAggregate.failed_candidate_ids.includes("CAND-001401"), true);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 14 GA agent stage workflow tests passed.");
