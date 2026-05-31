import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  createServiceOwnedLeanRunManifestV3,
  decideCandidate,
  initProject,
  registerClaim,
  verifyLeanRunManifestV3Evidence
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task115-lean-input-binding-"));

function writeProjectFile(relativePath, content) {
  const path = join(projectRoot, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
  return path;
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
        summary: "Task115 stale input-file binding fixture.",
        maintainability_notes: "Manifest evidence must be invalidated if any recorded Lean input changes."
      },
      null,
      2
    )}\n`
  );
  return manifestRel;
}

try {
  const { project } = initProject({ name: "Goal 3 Task 115", root_path: projectRoot });
  const campaignId = "CAM-0115";
  const theoremName = "MathResearch.Goal3Task115";
  const claimStatement = `${theoremName} : True`;
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: claimStatement,
    assumptions: [],
    domain: "logic",
    status: "conjectural",
    actor: "goal3-task115"
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

  const candidateId = "CAND-0115";
  const leanRootRel = `.comath/evidence/${claim.id}/lean/${candidateId}`;
  const inputRel = `${leanRootRel}/MathResearch/Target.lean`;
  const auditRel = `${leanRootRel}/Audit/TargetAudit.lean`;
  const toolchainRel = `${leanRootRel}/lean-toolchain`;
  const stdoutRel = `${leanRootRel}/stdout.log`;
  const stderrRel = `${leanRootRel}/stderr.log`;
  const manifestRel = `${leanRootRel}/LRUN-0115.manifest.json`;

  writeProjectFile(inputRel, "namespace MathResearch\n\ntheorem Goal3Task115 : True := by\n  trivial\n\nend MathResearch\n");
  writeProjectFile(auditRel, "import MathResearch.Target\n#check MathResearch.Goal3Task115\n");
  writeProjectFile(toolchainRel, "leanprover/lean4:v4.23.0\n");
  writeProjectFile(stdoutRel, "ok\n");
  writeProjectFile(stderrRel, "");
  const manifest = createServiceOwnedLeanRunManifestV3({
    projectRoot,
    run_id: "LRUN-0115",
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

  writeProjectFile(inputRel, "axiom Goal3Task115 : False\n");

  const verification = verifyLeanRunManifestV3Evidence(projectRoot, manifest);
  assert.equal(verification.ok, false);
  assert.ok(verification.vetoes.includes("lean_input_file_hash_mismatch"));

  const candidate = {
    candidate_id: candidateId,
    campaign_id: campaignId,
    stage: "lemma_sprint",
    obligation_id: "PO-0115",
    variant_id: "V1",
    workspace_path: ".comath/campaign/CAM-0115/ensembles/lemma_sprint/PO-0115/candidates/v1-lean-tactic-sprinter",
    locked_statement_hash: claim.statement_hash,
    candidate_statement_hash: claim.statement_hash,
    state: "candidate_kernel_checked",
    score: 150,
    hard_vetoes: [],
    replay_command: "lake build MathResearch"
  };
  candidate.manifest_path = writeCandidateManifest(candidate, [`lean_run_manifest:${manifestRel}`]);
  const decision = decideCandidate({ projectRoot, campaign, candidates: [candidate] });
  assert.equal(decision.gate.result, "blocked");
  assert.equal(decision.decision.selected_candidate_id, null);
  assert.ok(
    decision.decision.rejected_candidates.some(
      (item) => item.candidate_id === candidateId && /missing service-owned Lean replay evidence/.test(item.reason)
    )
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 115 Lean manifest input binding test passed.");
