import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createComathServer, getClaim, readEvidenceRecords } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-ga-refute-"));
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
      project_name: "GA Refutation Slice",
      user_goal: "Prove in Lean that n + 1 = n for natural numbers.",
      domain: "elementary",
      strict_mode: true,
      actor: "phase18-refute"
    }
  });
  assert.equal(start.status, 200);
  assert.equal(start.body.obligation.locked_statement_nl, "For every natural number n, n + 1 = n.");
  assert.equal(start.body.obligation.locked_statement_structured.proposition, "n + 1 = n");

  const campaignId = start.body.campaign.campaign_id;
  const claimId = start.body.campaign.root_claim_id;
  let finalTick = null;
  for (let i = 0; i < 8; i += 1) {
    const tick = await server.inject({
      method: "POST",
      path: `/campaign/${encodeURIComponent(campaignId)}/tick`,
      body: {
        project_root: projectRoot,
        actor: "phase18-refute"
      }
    });
    assert.equal(tick.status, 200);
    finalTick = tick.body;
    if (tick.body.campaign.status === "terminal") {
      break;
    }
  }

  assert.ok(finalTick, "campaign ticks should return a body");
  assert.equal(finalTick.campaign.status, "terminal");
  assert.equal(finalTick.campaign.current_stage, "completed_refutation");
  assert.equal(finalTick.campaign.terminal_state, "completed_refutation");
  assert.equal(finalTick.counterexample?.assignment.n, 0);
  assert.equal(finalTick.counterexample?.lhs, 1);
  assert.equal(finalTick.counterexample?.rhs, 0);
  assert.equal(finalTick.gate?.result, "pass");
  assert.equal(finalTick.gate?.decision_rationale_summary.includes("counterexample"), true);

  const claim = getClaim(projectRoot, finalTick.campaign.project_id, claimId);
  assert.equal(claim.status, "refuted");
  assert.equal(claim.evidence_level, 2);
  assert.equal(claim.audit_state, "audit_passed");

  const counterexamplePath = join(projectRoot, ".comath", "evidence", claimId, "counterexample", "CE-0001.json");
  assert.equal(existsSync(counterexamplePath), true);
  const counterexample = readJson(counterexamplePath);
  assert.equal(counterexample.result, "refutes");
  assert.equal(counterexample.statement_hash, claim.statement_hash);

  const evidence = readEvidenceRecords(projectRoot, finalTick.campaign.project_id);
  assert.equal(evidence.some((record) => record.kind === "counterexample" && record.claim_id === claimId), true);
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 18 GA refutation path tests passed.");
