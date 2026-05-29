import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  decideCandidate,
  initProject,
  recordFailedRoutes,
  registerClaim,
  runTrivialNatAddZeroCandidates
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-v3-candidate-contract-"));

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

try {
  const { project } = initProject({ name: "v3 Candidate Contract", root_path: projectRoot });
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: "For every natural number n, n + 0 = n.",
    assumptions: ["n : Nat"],
    domain: "elementary",
    status: "conjectural",
    actor: "phase61-candidate-contract"
  });
  const campaign = {
    campaign_id: "CAM-0061",
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
  const blockedCandidate = batch.candidates.find((candidate) => candidate.variant_id === "V1");
  assert.ok(blockedCandidate);
  assert.equal(blockedCandidate.state, "candidate_blocked");
  assert.deepEqual(blockedCandidate.hard_vetoes, ["business_layer_theorem_prover_forbidden"]);
  const blockedManifestPath = join(projectRoot, blockedCandidate.manifest_path);
  const blockedManifest = readJson(blockedManifestPath);
  assert.equal(blockedManifest.state, blockedCandidate.state);
  assert.deepEqual(blockedManifest.dependencies, []);
  assert.deepEqual(blockedManifest.assumptions, []);
  assert.equal(blockedManifest.hard_vetoes.includes("business_layer_theorem_prover_forbidden"), true);
  for (const requiredArtifact of ["assumption_delta.json", "dependency_delta.json", "replay_commands.json"]) {
    assert.equal(
      blockedManifest.artifacts.some((artifact) => artifact.path === requiredArtifact),
      true,
      `blocked manifest should list ${requiredArtifact}`
    );
  }
  assert.equal(blockedManifest.replay_command, "");
  assert.equal(blockedManifest.maintainability_notes.length > 0, true);

  const tamperedManifest = { ...blockedManifest, candidate_statement_hash: "tampered-statement-hash" };
  writeFileSync(blockedManifestPath, `${JSON.stringify(tamperedManifest, null, 2)}\n`, "utf8");
  assert.throws(
    () => decideCandidate({ projectRoot, campaign, candidates: batch.candidates }),
    /candidate manifest statement hash mismatch|CANDIDATE_MANIFEST_INVALID/
  );

  writeFileSync(blockedManifestPath, `${JSON.stringify(blockedManifest, null, 2)}\n`, "utf8");
  const { decision, gate } = decideCandidate({ projectRoot, campaign, candidates: batch.candidates });
  assert.equal(gate.result, "blocked");
  assert.equal(decision.selected_candidate_id, null);

  const aggregate = recordFailedRoutes({ projectRoot, campaign, candidates: batch.candidates });
  assert.equal(aggregate.total_failed_routes, 8);
  assert.equal(aggregate.failure_clusters.length >= 1, true);
  assert.equal(
    aggregate.recommendations.some((recommendation) => /repair|refutation|split/i.test(recommendation)),
    true
  );
  const aggregatePath = join(projectRoot, ".comath", "proof_memory", "failure_aggregate_CAM-0061_lemma_sprint_PO-0001.json");
  assert.equal(existsSync(aggregatePath), true);
  const persistedAggregate = readJson(aggregatePath);
  assert.deepEqual(persistedAggregate.failure_clusters, aggregate.failure_clusters);
  assert.deepEqual(persistedAggregate.recommendations, aggregate.recommendations);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 61 v3 candidate manifest and failure aggregate tests passed.");
