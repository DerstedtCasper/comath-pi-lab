import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createServiceOwnedNativeCandidateLeanAdapter,
  decideCandidate,
  initProject,
  registerClaim,
  runGaAgentStageCandidates,
  statementHash
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task113-live-lean-runner-"));

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(projectRoot, relativePath), "utf8"));
}

try {
  const { project } = initProject({ name: "Goal 3 Task 113", root_path: projectRoot });
  const campaignId = "CAM-0113";
  const theoremName = "MathResearch.Goal3Task113";
  const claimStatement = `${theoremName} : True`;
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: claimStatement,
    assumptions: [],
    domain: "logic",
    status: "conjectural",
    actor: "goal3-task113"
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
    obligation_id: "PO-0113",
    claim_id: claim.id,
    locked_statement_nl: claimStatement,
    locked_statement_structured: {},
    lean_target: theoremName,
    statement_hash: claim.statement_hash,
    dependencies: [],
    assumptions: [],
    status: "candidate_search"
  };

  const seenRuns = [];
  const batch = runGaAgentStageCandidates({
    projectRoot,
    campaign,
    obligation,
    stage: "lemma_sprint",
    locked_statement_hash: claim.statement_hash,
    adapter: createServiceOwnedNativeCandidateLeanAdapter({
      projectRoot,
      campaign,
      obligation,
      leanVersionOutput: "Lean (version 4.23.0, x86_64-pc-windows-msvc)",
      lakeVersionOutput: "Lake version 5.0.0-src+abcdef (Lean version 4.23.0)",
      leanToolchain: "leanprover/lean4:v4.23.0",
      run: (command, cwd) => {
        seenRuns.push({ command, cwd });
        assert.deepEqual(command, ["lake", "build", "MathResearch"]);
        assert.equal(existsSync(join(cwd, "MathResearch", "Target.lean")), true);
        assert.equal(existsSync(join(cwd, "lean-toolchain")), true);
        return { exit_code: 0, stdout: "Goal3Task113 checked by fake lake\n", stderr: "" };
      }
    })
  });

  assert.equal(seenRuns.length, 1, "live candidate generation must invoke service-owned LeanRunner once");
  const checked = batch.candidates.find((candidate) => candidate.variant_id === "V1");
  assert.ok(checked);
  assert.equal(checked.state, "candidate_kernel_checked");
  assert.equal(checked.replay_command, "lake build MathResearch");

  const manifest = readJson(checked.manifest_path);
  assert.equal(manifest.evidence.length, 1);
  assert.match(manifest.evidence[0], /^lean_run_manifest:\.comath\/evidence\/C-\d+\/lean\/LRUN-\d+\.manifest\.json$/);
  const runManifestRel = manifest.evidence[0].replace(/^lean_run_manifest:/, "");
  const runManifest = readJson(runManifestRel);
  assert.equal(runManifest.schema_version, "comath.lean_run_manifest.v3");
  assert.equal(runManifest.runner, "comathd.LeanRunner");
  assert.equal(runManifest.candidate_id, checked.candidate_id);
  assert.equal(runManifest.exit_code, 0);
  assert.equal(runManifest.proof_authority, "lean_kernel_check");

  const descriptor = readJson(`${checked.workspace_path}/candidate_replay_project_descriptor.json`);
  assert.equal(descriptor.proof_authority, "none");
  assert.equal(descriptor.can_promote_claim, false);
  assert.equal(descriptor.lean_project.formal_spec.locked_statement_hash, claim.statement_hash);

  const decision = decideCandidate({ projectRoot, campaign, candidates: batch.candidates });
  assert.equal(decision.gate.result, "pass");
  assert.equal(decision.decision.selected_candidate_id, checked.candidate_id);

  const failingBatch = runGaAgentStageCandidates({
    projectRoot,
    campaign: { ...campaign, campaign_id: "CAM-1113" },
    obligation: { ...obligation, obligation_id: "PO-1113" },
    stage: "lemma_sprint",
    locked_statement_hash: claim.statement_hash,
    adapter: createServiceOwnedNativeCandidateLeanAdapter({
      projectRoot,
      campaign: { ...campaign, campaign_id: "CAM-1113" },
      obligation: { ...obligation, obligation_id: "PO-1113" },
      leanVersionOutput: "Lean (version 4.23.0, x86_64-pc-windows-msvc)",
      lakeVersionOutput: "Lake version 5.0.0-src+abcdef (Lean version 4.23.0)",
      leanToolchain: "leanprover/lean4:v4.23.0",
      run: () => ({ exit_code: 1, stdout: "", stderr: "Lean rejected candidate\n" })
    })
  });
  const failed = failingBatch.candidates.find((candidate) => candidate.variant_id === "V1");
  assert.ok(failed);
  assert.equal(failed.state, "candidate_failed");
  assert.equal(existsSync(join(projectRoot, failed.workspace_path, "candidate_replay_project_descriptor.json")), false);
  const failedDecision = decideCandidate({ projectRoot, campaign: { ...campaign, campaign_id: "CAM-1113" }, candidates: failingBatch.candidates });
  assert.equal(failedDecision.gate.result, "blocked");
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 113 service-owned live candidate LeanRunner test passed.");
