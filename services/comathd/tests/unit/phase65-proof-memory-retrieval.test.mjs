import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  initProject,
  readProofMemoryEvents,
  recordFailedRoutes,
  registerClaim,
  retrieveSimilarFailedRoutes,
  createComathServer
} from "../../dist/index.js";
import { runTrivialNatAddZeroCandidates } from "../fixtures/proof-smoke/nat-add-zero-candidates.mjs";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-proof-memory-retrieval-"));

function readJsonl(path) {
  return readFileSync(path, "utf8")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

try {
  const { project } = initProject({ name: "Proof Memory Retrieval", root_path: projectRoot });
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: "Prove in Lean that for every natural number n, n + 0 = n.",
    assumptions: ["n : Nat"],
    domain: "elementary",
    status: "conjectural",
    actor: "phase65"
  });
  const campaign = {
    campaign_id: "CAM-0065",
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
  const aggregate = recordFailedRoutes({ projectRoot, campaign, candidates: batch.candidates });
  assert.equal(aggregate.total_failed_routes, 8);

  const events = readProofMemoryEvents(projectRoot);
  assert.equal(events.length, 8);
  const v8 = events.find((event) => event.variant_id === "V8");
  assert.ok(v8, "V8 failure route should be preserved");
  assert.equal(v8.locked_statement_hash, claim.statement_hash);
  assert.equal(v8.proof_authority, "none");
  assert.equal(v8.artifact_paths.some((path) => path.endsWith("failure_routes.json")), true);
  assert.equal(v8.artifact_paths.some((path) => path.endsWith("graph_patch.json")), true);
  assert.equal(v8.artifact_paths.some((path) => path.endsWith("dialectical_stress.json")), true);
  assert.deepEqual(v8.counterexamples, []);
  assert.deepEqual(v8.blockers, v8.hard_vetoes);
  assert.equal(v8.repairs.some((repair) => /repair|rerun/i.test(repair)), true);
  assert.equal(v8.superseded_by, null);
  assert.equal(v8.final_handoff_capsule_path, null);

  const exactRetrieval = retrieveSimilarFailedRoutes({ projectRoot, obligation });
  assert.equal(exactRetrieval.matches.length, 8);
  assert.equal(exactRetrieval.warnings.length, 8);
  assert.equal(exactRetrieval.warnings.every((warning) => warning.code === "unresolved_blocker"), true);

  const memoryPath = join(projectRoot, ".comath", "proof_memory", "events.jsonl");
  const rewritten = readJsonl(memoryPath);
  rewritten[0].superseded_by = "CAM-NEW/PO-0001";
  rewritten[0].status = "superseded";
  writeFileSync(memoryPath, `${rewritten.map((event) => JSON.stringify(event)).join("\n")}\n`, "utf8");

  const retrievalWithWarning = retrieveSimilarFailedRoutes({ projectRoot, obligation });
  assert.equal(retrievalWithWarning.matches.length, 8);
  assert.equal(retrievalWithWarning.warnings.some((warning) => warning.code === "superseded_fact"), true);
  assert.equal(existsSync(join(projectRoot, retrievalWithWarning.warning_log_path)), true);

  const repairedObligation = {
    ...obligation,
    obligation_id: "PO-0002",
    statement_hash: `${claim.statement_hash}-repaired`,
    locked_statement_nl: "For every natural number n, n + 0 = n, after a repaired problem lock."
  };
  const staleRetrieval = retrieveSimilarFailedRoutes({ projectRoot, obligation: repairedObligation });
  assert.equal(staleRetrieval.matches.length, 8);
  assert.equal(staleRetrieval.warnings.some((warning) => warning.code === "stale_fact"), true);

  const server = createComathServer();
  try {
    const start = await server.inject({
      method: "POST",
      path: "/campaign/start",
      body: {
        project_root: projectRoot,
        project_name: "Proof Memory Retrieval Campaign",
        user_goal: claim.statement,
        domain: "elementary",
        strict_mode: true,
        actor: "phase65-campaign"
      }
    });
    assert.equal(start.status, 200);
    const campaignId = start.body.campaign.campaign_id;
    const problemLockTick = await server.inject({
      method: "POST",
      path: `/campaign/${encodeURIComponent(campaignId)}/tick`,
      body: { project_root: projectRoot, actor: "phase65-campaign" }
    });
    assert.equal(problemLockTick.status, 200);
    const knowledgeTick = await server.inject({
      method: "POST",
      path: `/campaign/${encodeURIComponent(campaignId)}/tick`,
      body: { project_root: projectRoot, actor: "phase65-campaign" }
    });
    assert.equal(knowledgeTick.status, 200);
    const knowledgePath = join(projectRoot, ".comath", "campaign", campaignId, "knowledge_pack.json");
    const knowledgePack = JSON.parse(readFileSync(knowledgePath, "utf8"));
    assert.equal(knowledgePack.failed_route_retrieval.match_count >= 8, true);
    assert.equal(knowledgePack.failed_route_retrieval.warning_log_path, ".comath/proof_memory/stale_or_superseded_warnings.jsonl");
    const knowledgeShard = readFileSync(join(projectRoot, ".comath", "context_lake", "shards", `knowledge-${campaignId}.md`), "utf8");
    assert.equal(knowledgeShard.includes("Prior failed routes:"), true);
  } finally {
    await server.close();
  }
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 65 proof-memory retrieval tests passed.");
