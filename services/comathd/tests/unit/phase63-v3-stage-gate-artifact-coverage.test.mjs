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
const quarantinedRoot = mkdtempSync(join(tmpdir(), "comath-phase63-stage-gates-quarantined-"));
const blockedRoot = mkdtempSync(join(tmpdir(), "comath-phase63-stage-blocked-"));

try {
  const quarantinedStart = await startCampaign(server, quarantinedRoot, "phase63-quarantined");
  const quarantinedFinal = await runUntil(
    server,
    quarantinedRoot,
    quarantinedStart.campaign_id,
    "phase63-quarantined",
    (campaign) => campaign.status === "terminal"
  );

  assert.equal(quarantinedFinal.campaign.current_stage, "blocked");
  assert.equal(quarantinedFinal.campaign.terminal_state, "blocked_with_replayable_reason");
  assert.equal(quarantinedFinal.blocker, "native candidate arbitration requires proof-grade candidate evidence");
  assert.equal(quarantinedFinal.campaign.blockers[0].reason, "native candidate arbitration requires proof-grade candidate evidence");
  const stageRuns = quarantinedFinal.campaign.stage_runs;
  const requiredStages = [
    "problem_locked",
    "knowledge_pack",
    "notation_gate",
    "skeleton_gate",
    "line_map_gate",
    "candidate_generation",
    "candidate_verification",
    "candidate_arbitration"
  ];

  for (const stage of requiredStages) {
    const run = stageRuns.find((item) => item.stage === stage);
    assert.ok(run, `${stage} stage run should be recorded`);
    assert.ok(run.artifact_paths.length > 0, `${stage} stage run should record artifacts`);
    for (const artifactPath of run.artifact_paths) {
      assertArtifact(quarantinedRoot, artifactPath);
    }
  }

  for (const rel of [
    `.comath/context_lake/shards/knowledge-${quarantinedStart.campaign_id}.md`,
    ".comath/literature/references.bib",
    ".comath/memory/library_search.jsonl",
    ".comath/memory/premise_candidates.jsonl",
    ".comath/lean/MathResearch/Definitions.lean",
    `.comath/context_lake/shards/notation-${quarantinedStart.campaign_id}.md`,
    `.comath/campaign/${quarantinedStart.campaign_id}/proof/lemma_dag.json`,
    `.comath/campaign/${quarantinedStart.campaign_id}/proof/line_map.json`,
    `.comath/campaign/${quarantinedStart.campaign_id}/proof/Skeleton.lean`,
    `.comath/campaign/${quarantinedStart.campaign_id}/proof/skeleton_report.md`,
    `.comath/campaign/${quarantinedStart.campaign_id}/candidate_generation_request.json`,
    `.comath/campaign/${quarantinedStart.campaign_id}/candidate_generation.json`,
    `.comath/campaign/${quarantinedStart.campaign_id}/candidate_verification.json`,
    `.comath/campaign/${quarantinedStart.campaign_id}/candidate_arbitration_blocker.json`
  ]) {
    assertArtifact(quarantinedRoot, rel);
  }

  assert.equal(
    existsSync(join(quarantinedRoot, ".comath", "memory", "proof_memory_events.jsonl")),
    false,
    "quarantined theorem-family goals must not write proof-memory success events"
  );

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
} finally {
  await server.close();
  rmSync(quarantinedRoot, { recursive: true, force: true });
  rmSync(blockedRoot, { recursive: true, force: true });
}

console.log("Phase 63 v3 stage-gate artifact coverage tests passed.");
