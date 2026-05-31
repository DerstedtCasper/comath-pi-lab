import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createProofObligationFromFormalSpecLock,
  createServiceOwnedNativeCandidateLeanAdapter,
  decideCandidate,
  initProject,
  registerClaim,
  runGaAgentStageCandidates,
  statementHash,
  writeProofPlanningArtifacts
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task114-formal-spec-live-replay-"));

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(projectRoot, relativePath), "utf8"));
}

try {
  const { project } = initProject({ name: "Goal 3 Task 114", root_path: projectRoot });
  const naturalLanguageGoal = "Formalize the theorem-specific Lean boundary locked by FormalSpecLock.";
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: naturalLanguageGoal,
    assumptions: [],
    domain: "logic",
    status: "formal_spec_locked",
    actor: "goal3-task114"
  });
  assert.equal(claim.statement_hash, statementHash(naturalLanguageGoal));

  const timestamp = new Date().toISOString();
  const lock = {
    schema_version: "comath.formal_spec_lock.v2",
    claim_id: claim.id,
    original_goal_text: naturalLanguageGoal,
    original_goal_sha256: "a".repeat(64),
    normalized_nl_statement: naturalLanguageGoal,
    theorem_name: "Goal3Task114",
    namespace: "MathResearch",
    theorem_header: "theorem Goal3Task114 : True := by",
    theorem_type_pretty: "True",
    variables: [],
    assumptions: [],
    conclusion: "True",
    notation_conventions: [],
    imports_allowed: [],
    external_dependencies_allowed: [],
    trust_profile_id: "lean4_mathlib_default",
    statement_hash: claim.statement_hash,
    locked_by: "goal3-task114",
    locked_at: timestamp,
    user_approval_required: false,
    proof_authority: "none"
  };
  const ledger = {
    schema_version: "comath.assumption_ledger.v1",
    claim_id: claim.id,
    formal_spec_lock_hash: claim.statement_hash,
    entries: [],
    created_at: timestamp,
    updated_at: timestamp,
    proof_authority: "none"
  };

  const obligation = createProofObligationFromFormalSpecLock({
    obligation_id: "PO-0114",
    formal_spec_lock: lock,
    assumption_ledger: ledger
  });
  assert.equal(obligation.locked_statement_nl, naturalLanguageGoal);
  assert.equal(obligation.lean_target, "MathResearch.Goal3Task114");

  const campaign = {
    campaign_id: "CAM-0114",
    project_id: project.project_id,
    root_claim_id: claim.id,
    user_goal: naturalLanguageGoal,
    current_stage: "candidate_generation",
    status: "running",
    strict_mode: true,
    stage_runs: [],
    open_obligations: [obligation],
    accepted_artifacts: [],
    blockers: [],
    next_actions: [],
    created_at: timestamp,
    updated_at: timestamp
  };

  const planning = writeProofPlanningArtifacts({ projectRoot, campaign, obligation });
  const lineMap = readJson(planning.line_map_path);
  const skeleton = readFileSync(join(projectRoot, planning.skeleton_lean_path), "utf8");
  assert.equal(lineMap.lines[0].formal_theorem_header, lock.theorem_header);
  assert.equal(lineMap.lines[0].formal_spec_lock_statement_hash, claim.statement_hash);
  assert.match(skeleton, /theorem Goal3Task114 : True := by/);
  assert.match(skeleton, /sorry/);

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
        const target = readFileSync(join(cwd, "MathResearch", "Target.lean"), "utf8");
        const formalSpec = readJson(
          `.comath/lean/native_candidates/CAM-0114/PO-0114/CAND-011401/FormalSpec/formal_spec_lock.json`
        );
        const assumptionLedger = readJson(
          `.comath/lean/native_candidates/CAM-0114/PO-0114/CAND-011401/FormalSpec/assumption_ledger.json`
        );
        assert.match(target, /theorem Goal3Task114 : True := by/);
        assert.doesNotMatch(target, /Formalize the theorem-specific/);
        assert.equal(formalSpec.schema_version, "comath.formal_spec_lock.v2");
        assert.equal(formalSpec.theorem_header, lock.theorem_header);
        assert.equal(assumptionLedger.schema_version, "comath.assumption_ledger.v1");
        assert.equal(assumptionLedger.formal_spec_lock_hash, claim.statement_hash);
        return { exit_code: 0, stdout: "FormalSpecLock-derived target checked\n", stderr: "" };
      }
    })
  });

  assert.equal(seenRuns.length, 1, "FormalSpecLock-derived obligation must invoke service-owned LeanRunner once");
  const checked = batch.candidates.find((candidate) => candidate.variant_id === "V1");
  assert.ok(checked);
  assert.equal(checked.state, "candidate_kernel_checked");
  assert.equal(checked.candidate_statement_hash, claim.statement_hash);
  assert.equal(existsSync(join(projectRoot, checked.workspace_path, "candidate_replay_project_descriptor.json")), true);

  const descriptor = readJson(`${checked.workspace_path}/candidate_replay_project_descriptor.json`);
  assert.equal(descriptor.lean_project.theorem_name, "MathResearch.Goal3Task114");
  assert.equal(descriptor.lean_project.canonical_proposition, "True");
  assert.equal(descriptor.lean_project.formal_spec.locked_statement_hash, claim.statement_hash);

  const manifest = readJson(checked.manifest_path);
  assert.equal(manifest.evidence.length, 1);
  assert.match(manifest.evidence[0], /^lean_run_manifest:\.comath\/evidence\/C-\d+\/lean\/LRUN-\d+\.manifest\.json$/);

  const decision = decideCandidate({ projectRoot, campaign, candidates: batch.candidates });
  assert.equal(decision.gate.result, "pass");
  assert.equal(decision.decision.selected_candidate_id, checked.candidate_id);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 114 FormalSpecLock live candidate replay test passed.");
