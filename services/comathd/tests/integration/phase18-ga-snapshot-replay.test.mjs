import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createComathServer, exportSnapshot, restoreSnapshot, verifySnapshot } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-ga-snapshot-"));
const restoreRoot = mkdtempSync(join(tmpdir(), "comath-ga-snapshot-restore-"));
const server = createComathServer();

try {
  const start = await server.inject({
    method: "POST",
    path: "/campaign/start",
    body: {
      project_root: projectRoot,
      project_name: "GA Snapshot Replay Slice",
      user_goal: "Prove in Lean that n + 0 = n for natural numbers.",
      domain: "elementary",
      strict_mode: true,
      actor: "phase18-snapshot"
    }
  });
  assert.equal(start.status, 200);

  const campaignId = start.body.campaign.campaign_id;
  const projectId = start.body.campaign.project_id;
  let finalTick = null;
  for (let i = 0; i < 12; i += 1) {
    const tick = await server.inject({
      method: "POST",
      path: `/campaign/${encodeURIComponent(campaignId)}/tick`,
      body: {
        project_root: projectRoot,
        actor: "phase18-snapshot"
      }
    });
    assert.equal(tick.status, 200);
    finalTick = tick.body;
    if (tick.body.campaign.status === "terminal") {
      break;
    }
  }

  assert.equal(finalTick?.campaign.terminal_state, "formal_proof_verified");
  assert.equal(finalTick.final_replay.result, "pass");

  const snapshot = await exportSnapshot(projectRoot, { project_id: projectId, actor: "phase18-snapshot" });
  const verified = await verifySnapshot(snapshot.manifest_path);
  assert.equal(verified.ok, true);

  const restored = await restoreSnapshot(snapshot.manifest_path, restoreRoot, { actor: "phase18-snapshot" });
  assert.equal(restored.project_id, projectId);
  assert.equal(existsSync(join(restoreRoot, ".comath", "campaign", campaignId, "status.json")), true);

  rmSync(join(restoreRoot, ".comath", "lean", ".lake"), { recursive: true, force: true });
  rmSync(join(restoreRoot, ".comath", "lean", "final_replay"), { recursive: true, force: true });

  const replay = await server.inject({
    method: "POST",
    path: `/campaign/${encodeURIComponent(campaignId)}/replay`,
    body: {
      project_root: restoreRoot,
      actor: "phase18-snapshot"
    }
  });
  assert.equal(replay.status, 200);
  assert.equal(replay.body.final_replay.result, "pass");
  assert.equal(replay.body.final_replay.exit_code, 0);
  assert.equal(existsSync(join(restoreRoot, ".comath", "evidence", finalTick.campaign.root_claim_id, "lean", "final_replay_manifest.json")), true);
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
  rmSync(restoreRoot, { recursive: true, force: true });
}

console.log("Phase 18 GA snapshot replay tests passed.");
