import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  decideCandidate,
  initProject,
  recordFailedRoutes,
  registerClaim,
  runTrivialNatAddZeroCandidates
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-ga-ensemble-recovery-"));

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

try {
  const { project } = initProject({ name: "GA Ensemble Recovery", root_path: projectRoot });
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: "For every natural number n, n + 0 = n.",
    assumptions: ["n : Nat"],
    domain: "elementary",
    status: "conjectural",
    actor: "phase19-ensemble-recovery"
  });
  const campaign = {
    campaign_id: "CAM-0001",
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
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  const obligation = {
    obligation_id: "PO-0001",
    claim_id: claim.id,
    locked_statement_nl: claim.statement,
    locked_statement_structured: { theorem: "Nat.add_zero", binder: "n : Nat" },
    lean_target: "MathResearch.C0001",
    statement_hash: claim.statement_hash,
    dependencies: [],
    assumptions: ["n : Nat"],
    status: "candidate_search"
  };

  const batch = runTrivialNatAddZeroCandidates({ projectRoot, campaign, obligation });
  const { decision, gate } = decideCandidate({ projectRoot, campaign, candidates: batch.candidates });
  recordFailedRoutes({ projectRoot, campaign, candidates: batch.candidates });

  const failedCandidates = batch.candidates.filter((candidate) => candidate.state === "candidate_failed");
  assert.equal(batch.candidates.length, 8);
  assert.equal(failedCandidates.length, 7);
  assert.equal(decision.selected_candidate_id, "CAND-0001");
  assert.equal(gate.result, "pass");
  assert.equal(decision.rejected_candidates.length, 7);

  const failureMemoryPath = join(projectRoot, ".comath", "proof_memory", "events.jsonl");
  const failureMemory = readFileSync(failureMemoryPath, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  assert.equal(failureMemory.length, 7);
  assert.deepEqual(
    failureMemory.map((event) => event.candidate_id).sort(),
    failedCandidates.map((candidate) => candidate.candidate_id).sort()
  );

  const v8Candidate = batch.candidates.find((candidate) => candidate.variant_id === "V8");
  assert.ok(v8Candidate);
  const v8Manifest = readJson(join(projectRoot, v8Candidate.workspace_path, "candidate_manifest.json"));
  assert.equal(v8Manifest.variant_id, "V8");
  assert.equal(v8Manifest.failures.length > 0, true);

  const dialecticalStressPath = join(projectRoot, v8Candidate.workspace_path, "dialectical_stress.json");
  assert.equal(existsSync(dialecticalStressPath), true);
  const dialecticalStress = readJson(dialecticalStressPath);
  assert.equal(dialecticalStress.P, claim.statement);
  assert.equal(Array.isArray(dialecticalStress.not_P), true);
  assert.equal(Array.isArray(dialecticalStress.Q), true);
  assert.equal(Array.isArray(dialecticalStress.not_Q), true);
  assert.equal(Array.isArray(dialecticalStress.R), true);
  assert.equal(Array.isArray(dialecticalStress.U), true);
  assert.equal(dialecticalStress.proof_authority, "none");
  assert.deepEqual(dialecticalStress.must_be_checked_by, ["Lean", "exact computation", "citation gate"]);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 19 GA ensemble recovery tests passed.");
