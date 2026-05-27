import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createComathServer, getClaim, readEvidenceRecords } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-ga-family-"));
const server = createComathServer();

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

try {
  const start = await server.inject({
    method: "POST",
    path: "/campaign/start",
    body: {
      project_root: projectRoot,
      project_name: "GA Theorem Family Generalization",
      user_goal: "Prove in Lean that n * 0 = 0 for natural numbers.",
      domain: "elementary",
      strict_mode: true,
      actor: "phase23-family"
    }
  });
  assert.equal(start.status, 200);
  assert.equal(start.body.obligation.locked_statement_nl, "For every natural number n, n * 0 = 0.");
  assert.equal(start.body.obligation.locked_statement_structured.proposition, "n * 0 = 0");
  assert.equal(start.body.obligation.locked_statement_structured.theorem_family, "nat_mul_zero");
  assert.equal(start.body.obligation.lean_target, "theorem C0001 (n : Nat) : n * 0 = 0");

  const campaignId = start.body.campaign.campaign_id;
  const claimId = start.body.campaign.root_claim_id;
  let finalTick = null;
  for (let i = 0; i < 12; i += 1) {
    const tick = await server.inject({
      method: "POST",
      path: `/campaign/${encodeURIComponent(campaignId)}/tick`,
      body: {
        project_root: projectRoot,
        actor: "phase23-family"
      }
    });
    assert.equal(tick.status, 200);
    finalTick = tick.body;
    if (tick.body.campaign.status === "terminal") {
      break;
    }
  }

  assert.ok(finalTick, "campaign ticks should return a final body");
  assert.equal(finalTick.campaign.status, "terminal");
  assert.equal(finalTick.campaign.current_stage, "completed_formal_proof");
  assert.equal(finalTick.campaign.terminal_state, "completed_formal_proof");
  assert.equal(finalTick.gate?.result, "pass");
  assert.equal(finalTick.final_replay?.result, "pass");
  assert.equal(finalTick.final_replay?.theorem_name, "MathResearch.C0001");
  assert.equal(finalTick.final_replay?.command, "lake build MathResearch.C0001 Audit.C0001");
  assert.equal(finalTick.static_audit?.result, "pass");
  assert.equal(finalTick.ensemble?.candidates.length, 8);
  assert.equal(finalTick.ensemble?.decision.selected_candidate_id, "CAND-0001");

  const claim = getClaim(projectRoot, finalTick.campaign.project_id, claimId);
  assert.ok(claim);
  assert.equal(claim.statement, "For every natural number n, n * 0 = 0.");
  assert.equal(claim.status, "formally_checked");
  assert.equal(claim.evidence_level, 5);
  assert.equal(claim.formalization_status, "kernel_checked");
  assert.equal(claim.dependency_closure_status, "all_dependencies_present");
  assert.equal(claim.audit_state, "audit_passed");

  const theoremPath = join(projectRoot, ".comath", "lean", "MathResearch", "C0001.lean");
  const specPath = join(projectRoot, ".comath", "lean", "FormalSpec", "C0001.json");
  const auditPath = join(projectRoot, ".comath", "lean", "Audit", "C0001.lean");
  const replayManifestPath = join(projectRoot, ".comath", "evidence", claimId, "lean", "final_replay_manifest.json");
  const candidateManifestPath = join(
    projectRoot,
    ".comath",
    "campaign",
    campaignId,
    "ensembles",
    "lemma_sprint",
    "PO-0001",
    "candidates",
    "V1_direct_formalist",
    "candidate_manifest.json"
  );
  for (const path of [theoremPath, specPath, auditPath, replayManifestPath, candidateManifestPath]) {
    assert.equal(existsSync(path), true, `${path} must exist`);
  }

  const theoremSource = readFileSync(theoremPath, "utf8");
  assert.match(theoremSource, /theorem C0001 \(n : Nat\) : n \* 0 = 0 := Nat\.mul_zero n/);
  assert.doesNotMatch(theoremSource, /Nat\.add_zero/);

  const formalSpec = readJson(specPath);
  assert.equal(formalSpec.normalized_statement, "MathResearch.C0001 (n : Nat) : n * 0 = 0");
  assert.equal(formalSpec.theorem_name, "MathResearch.C0001");

  const candidateManifest = readJson(candidateManifestPath);
  assert.equal(candidateManifest.theorem_family, "nat_mul_zero");
  assert.equal(candidateManifest.canonical_proposition, "n * 0 = 0");
  assert.equal(candidateManifest.primary_dependency, "Nat.mul_zero");
  assert.deepEqual(candidateManifest.introduced_dependencies, ["Nat.mul_zero"]);
  assert.equal(candidateManifest.summary, "Direct Lean proof by Nat.mul_zero for the exact locked theorem.");
  assert.equal(candidateManifest.statement_equivalence_claim, "exact");

  const replayManifest = readJson(replayManifestPath);
  assert.equal(replayManifest.result, "pass");
  assert.equal(replayManifest.theorem_name, "MathResearch.C0001");
  assert.equal(replayManifest.theorem_family, "nat_mul_zero");
  assert.equal(replayManifest.canonical_proposition, "n * 0 = 0");
  assert.equal(replayManifest.normalized_statement, "MathResearch.C0001 (n : Nat) : n * 0 = 0");
  assert.equal(replayManifest.primary_dependency, "Nat.mul_zero");
  assert.equal(replayManifest.locked_statement_hash, claim.statement_hash);
  assert.equal(replayManifest.local_file_hashes["MathResearch/C0001.lean"].length, 64);

  const evidence = readEvidenceRecords(projectRoot, finalTick.campaign.project_id);
  const leanEvidence = evidence.find((record) => record.kind === "lean" && record.claim_id === claimId);
  assert.ok(leanEvidence);
  assert.match(leanEvidence.summary, /Nat\.mul_zero/);
  assert.doesNotMatch(leanEvidence.summary, /MathProve|Pi extension/);

  const replay = await server.inject({
    method: "POST",
    path: `/campaign/${encodeURIComponent(campaignId)}/replay`,
    body: {
      project_root: projectRoot,
      actor: "phase23-family"
    }
  });
  assert.equal(replay.status, 200);
  assert.equal(replay.body.final_replay.result, "pass");
  assert.equal(replay.body.final_replay.theorem_name, "MathResearch.C0001");
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 23 GA theorem-family generalization tests passed.");
