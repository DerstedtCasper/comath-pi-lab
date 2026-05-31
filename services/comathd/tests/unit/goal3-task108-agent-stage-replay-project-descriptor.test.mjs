import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  initProject,
  registerClaim,
  runGaAgentStageCandidates,
  statementHash
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task108-agent-stage-descriptor-"));

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(projectRoot, relativePath), "utf8"));
}

try {
  const { project } = initProject({ name: "Goal 3 Task 108", root_path: projectRoot });
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
  assert.equal(claim.statement_hash, statementHash(claimStatement));

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

  const leanRootRel = ".comath/lean/task108-native-candidate";
  const batch = runGaAgentStageCandidates({
    projectRoot,
    campaign,
    obligation,
    stage: "lemma_sprint",
    locked_statement_hash: claim.statement_hash,
    adapter: ({ taskCard }) => {
      if (taskCard.variant_id !== "V2") {
        return { state: "candidate_plausible_only", score: 1, summary: `${taskCard.variant_id} advisory draft.` };
      }
      return {
        state: "candidate_kernel_checked",
        score: 120,
        statement_equivalence_claim: "exact",
        candidate_statement_hash: claim.statement_hash,
        dependencies: ["Mathlib"],
        introduced_assumptions: [],
        introduced_dependencies: [],
        evidence: ["service_owned_lean_replay:CAND-010802"],
        lean_files: [`${leanRootRel}/MathResearch/Target.lean`],
        replay_command: "lake build MathResearch",
        summary: "Native candidate stage emitted a replay project descriptor source.",
        replay_project: {
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
            theorem_name: "Goal3Task108",
            namespace: "MathResearch",
            normalized_statement: claimStatement,
            locked_statement_hash: claim.statement_hash
          }
        }
      };
    }
  });

  const selected = batch.candidates.find((candidate) => candidate.variant_id === "V2");
  assert.ok(selected);
  assert.equal(selected.candidate_id, "CAND-010802");

  const descriptorRel = `${selected.workspace_path}/candidate_replay_project_descriptor.json`;
  assert.equal(existsSync(join(projectRoot, descriptorRel)), true);
  const descriptor = readJson(descriptorRel);
  assert.equal(descriptor.schema_version, "comath.candidate_replay_project_descriptor.v1");
  assert.equal(descriptor.campaign_id, campaignId);
  assert.equal(descriptor.claim_id, claim.id);
  assert.equal(descriptor.obligation_id, "PO-0108");
  assert.equal(descriptor.candidate_id, selected.candidate_id);
  assert.equal(descriptor.artifact_role, "candidate_replay_project_descriptor");
  assert.equal(descriptor.proof_authority, "none");
  assert.equal(descriptor.can_promote_claim, false);
  assert.equal(descriptor.lean_project.theorem_name, theoremName);
  assert.equal(descriptor.lean_project.formal_spec.locked_statement_hash, claim.statement_hash);

  const manifest = readJson(selected.manifest_path);
  assert.ok(
    manifest.artifacts.some(
      (artifact) =>
        artifact.path === "candidate_replay_project_descriptor.json" &&
        artifact.kind === "candidate_replay_project_descriptor" &&
        artifact.required_for.includes("candidate_replay_material_source")
    )
  );
  const agentOutput = readJson(`${selected.workspace_path}/agent_output.json`);
  assert.ok(agentOutput.artifacts.some((artifact) => artifact.kind === "candidate_replay_project_descriptor"));
  assert.equal(agentOutput.proof_authority, "none");
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 108 agent-stage replay project descriptor test passed.");
