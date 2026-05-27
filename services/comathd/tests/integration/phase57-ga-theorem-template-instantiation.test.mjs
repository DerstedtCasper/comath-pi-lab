import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createComathServer, getClaim } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-ga-theorem-template-"));
const server = createComathServer();

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

async function tickToTerminal(campaignId) {
  let finalTick = null;
  for (let i = 0; i < 14; i += 1) {
    const tick = await server.inject({
      method: "POST",
      path: `/campaign/${encodeURIComponent(campaignId)}/tick`,
      body: {
        project_root: projectRoot,
        actor: "phase57-template"
      }
    });
    assert.equal(tick.status, 200);
    finalTick = tick.body;
    if (tick.body.campaign.status === "terminal") {
      return finalTick;
    }
  }
  assert.fail("Phase 57 campaign did not reach terminal state");
}

try {
  const start = await server.inject({
    method: "POST",
    path: "/campaign/start",
    body: {
      project_root: projectRoot,
      project_name: "GA Theorem Template Instantiation",
      user_goal: "Prove in Lean that 0 + n = n for natural numbers.",
      domain: "elementary",
      strict_mode: true,
      actor: "phase57-template"
    }
  });
  assert.equal(start.status, 200);
  assert.equal(start.body.obligation.locked_statement_nl, "For every natural number n, 0 + n = n.");
  assert.equal(start.body.obligation.locked_statement_structured.proposition, "0 + n = n");
  assert.equal(start.body.obligation.locked_statement_structured.theorem_family, "nat_zero_add");
  assert.equal(start.body.obligation.lean_target, "theorem C0001 (n : Nat) : 0 + n = n");

  const campaignId = start.body.campaign.campaign_id;
  const claimId = start.body.campaign.root_claim_id;
  const finalTick = await tickToTerminal(campaignId);

  assert.equal(finalTick.campaign.status, "terminal");
  assert.equal(finalTick.campaign.terminal_state, "completed_formal_proof");
  assert.equal(finalTick.gate?.result, "pass");
  assert.equal(finalTick.final_replay?.result, "pass");

  const claim = getClaim(projectRoot, finalTick.campaign.project_id, claimId);
  assert.equal(claim.status, "formally_checked");
  assert.equal(claim.formalization_status, "kernel_checked");

  const theoremPath = join(projectRoot, ".comath", "lean", "MathResearch", "C0001.lean");
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
  for (const path of [theoremPath, replayManifestPath, candidateManifestPath]) {
    assert.equal(existsSync(path), true, `${path} must exist`);
  }

  const theoremSource = readFileSync(theoremPath, "utf8");
  assert.match(theoremSource, /theorem C0001 \(n : Nat\) : 0 \+ n = n := Nat\.zero_add n/);
  assert.doesNotMatch(theoremSource, /Nat\.add_zero/);
  assert.doesNotMatch(theoremSource, /Nat\.mul_zero/);

  const replayManifest = readJson(replayManifestPath);
  assert.equal(replayManifest.theorem_family, "nat_zero_add");
  assert.equal(replayManifest.canonical_proposition, "0 + n = n");
  assert.equal(replayManifest.primary_dependency, "Nat.zero_add");
  assert.equal(replayManifest.normalized_statement, "MathResearch.C0001 (n : Nat) : 0 + n = n");

  const candidateManifest = readJson(candidateManifestPath);
  assert.equal(candidateManifest.theorem_family, "nat_zero_add");
  assert.equal(candidateManifest.canonical_proposition, "0 + n = n");
  assert.deepEqual(candidateManifest.introduced_dependencies, ["Nat.zero_add"]);
  assert.equal(candidateManifest.statement_equivalence_claim, "exact");
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 57 GA theorem template instantiation tests passed.");
