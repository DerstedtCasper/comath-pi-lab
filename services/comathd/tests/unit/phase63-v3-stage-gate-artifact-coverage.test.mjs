import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createComathServer } from "../../dist/index.js";

async function startCampaign(server, projectRoot, actor) {
  const response = await server.inject({
    method: "POST",
    path: "/campaign/start",
    body: {
      project_root: projectRoot,
      project_name: "Phase 63 v3 stage gates",
      user_goal: "Prove in Lean that n + 0 = n for natural numbers.",
      domain: "elementary",
      strict_mode: true,
      actor
    }
  });
  assert.equal(response.status, 200);
  return response.body.campaign;
}

async function tick(server, projectRoot, campaignId, actor) {
  const response = await server.inject({
    method: "POST",
    path: `/campaign/${encodeURIComponent(campaignId)}/tick`,
    body: { project_root: projectRoot, actor }
  });
  assert.equal(response.status, 200);
  return response.body;
}

async function runUntil(server, projectRoot, campaignId, actor, predicate) {
  let body;
  for (let index = 0; index < 24; index += 1) {
    body = await tick(server, projectRoot, campaignId, actor);
    if (predicate(body.campaign)) {
      return body;
    }
  }
  assert.fail(`campaign ${campaignId} did not reach expected state`);
}

function assertArtifact(projectRoot, rel) {
  assert.equal(existsSync(join(projectRoot, rel)), true, `${rel} should exist`);
}

const server = createComathServer();
const happyRoot = mkdtempSync(join(tmpdir(), "comath-phase63-stage-gates-"));
const blockedRoot = mkdtempSync(join(tmpdir(), "comath-phase63-stage-blocked-"));

try {
  const happyStart = await startCampaign(server, happyRoot, "phase63-happy");
  const happyFinal = await runUntil(
    server,
    happyRoot,
    happyStart.campaign_id,
    "phase63-happy",
    (campaign) => campaign.status === "terminal"
  );

  assert.equal(happyFinal.campaign.current_stage, "completed_formal_proof");
  const stageRuns = happyFinal.campaign.stage_runs;
  const requiredStages = [
    "problem_locked",
    "knowledge_pack",
    "notation_gate",
    "skeleton_gate",
    "line_map_gate",
    "candidate_generation",
    "candidate_verification",
    "candidate_arbitration",
    "refutation_red_team",
    "integration_refactor",
    "final_static_audit",
    "final_global_replay",
    "memory_update"
  ];

  for (const stage of requiredStages) {
    const run = stageRuns.find((item) => item.stage === stage);
    assert.ok(run, `${stage} stage run should be recorded`);
    assert.ok(run.artifact_paths.length > 0, `${stage} stage run should record artifacts`);
    for (const artifactPath of run.artifact_paths) {
      assertArtifact(happyRoot, artifactPath);
    }
  }

  const claimId = happyFinal.campaign.root_claim_id;
  for (const rel of [
    `.comath/context_lake/shards/knowledge-${happyStart.campaign_id}.md`,
    ".comath/literature/references.bib",
    ".comath/memory/library_search.jsonl",
    ".comath/memory/premise_candidates.jsonl",
    ".comath/lean/MathResearch/Definitions.lean",
    `.comath/context_lake/shards/notation-${happyStart.campaign_id}.md`,
    `.comath/campaign/${happyStart.campaign_id}/proof/lemma_dag.json`,
    `.comath/campaign/${happyStart.campaign_id}/proof/line_map.json`,
    `.comath/campaign/${happyStart.campaign_id}/proof/Skeleton.lean`,
    `.comath/campaign/${happyStart.campaign_id}/proof/skeleton_report.md`,
    `.comath/campaign/${happyStart.campaign_id}/refutation_red_team.json`,
    ".comath/lean/MathResearch/Integrated.lean",
    ".comath/proof/import_profile.json",
    ".comath/proof/integration_report.md",
    `.comath/evidence/${claimId}/lean/final_static_audit.json`,
    `.comath/evidence/${claimId}/lean/final_replay.log`,
    `.comath/evidence/${claimId}/lean/final_replay_manifest.json`,
    `.comath/evidence/${claimId}/lean/axiom_profile.json`,
    `.comath/evidence/${claimId}/lean/dependency_closure.json`,
    `.comath/evidence/${claimId}/lean/statement_equivalence.json`,
    ".comath/memory/proof_memory_events.jsonl",
    ".comath/context_lake/shards/final-handoff.md",
    ".comath/snapshots/replay/final_manifest.json"
  ]) {
    assertArtifact(happyRoot, rel);
  }

  const blockedStart = await startCampaign(server, blockedRoot, "phase63-blocked");
  const generated = await runUntil(
    server,
    blockedRoot,
    blockedStart.campaign_id,
    "phase63-blocked",
    (campaign) => campaign.current_stage === "candidate_generation"
  );
  const lineMapRel = `.comath/campaign/${generated.campaign.campaign_id}/proof/line_map.json`;
  rmSync(join(blockedRoot, lineMapRel), { force: true });

  const blocked = await tick(server, blockedRoot, generated.campaign.campaign_id, "phase63-blocked");
  assert.equal(blocked.campaign.status, "blocked");
  assert.equal(blocked.campaign.current_stage, "line_map_gate");
  assert.equal(blocked.blocker, "missing_required_stage_artifact");
  assert.equal(blocked.campaign.stage_runs.at(-1).status, "blocked");
  assert.equal(blocked.campaign.stage_runs.at(-1).stage, "candidate_generation");

  const blocker = blocked.campaign.blockers.at(-1);
  assert.equal(blocker.code, "MISSING_REQUIRED_STAGE_ARTIFACT");
  assert.equal(blocker.attempted_stage, "candidate_generation");
  assert.equal(blocker.rewind_target, "line_map_gate");
  assert.deepEqual(blocker.missing_artifacts, [lineMapRel]);
  assertArtifact(blockedRoot, blocker.artifact_path);

  const blockerPayload = JSON.parse(readFileSync(join(blockedRoot, blocker.artifact_path), "utf8"));
  assert.equal(blockerPayload.code, "MISSING_REQUIRED_STAGE_ARTIFACT");
  assert.equal(blockerPayload.rewind_target, "line_map_gate");
  assert.deepEqual(blockerPayload.missing_artifacts, [lineMapRel]);
} finally {
  await server.close();
  rmSync(happyRoot, { recursive: true, force: true });
  rmSync(blockedRoot, { recursive: true, force: true });
}

console.log("Phase 63 v3 stage-gate artifact coverage tests passed.");
