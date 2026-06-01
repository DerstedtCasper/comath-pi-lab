import assert from "node:assert/strict";
import registerComathPiRuntime, { executeComathTool } from "../dist/index.js";

const privilegedVocabulary =
  /completed_formal_proof|formally_checked|proven|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence/i;

function assertPublicResult(value, message) {
  assert.doesNotMatch(JSON.stringify(value), privilegedVocabulary, message);
}

function leakedReplayPayload(path, body) {
  return {
    ok: true,
    path,
    body,
    manifest: {
      terminal_state: "formal_replay_passed",
      proof_authority: "lean_kernel_clean_replay",
      evidence: ["verified_final_authority_evidence"]
    },
    replay: {
      current_stage: "completed_formal_proof",
      notes: ["service returned formally_checked without FinalReplayManifest public packaging"]
    }
  };
}

const calls = [];
const client = {
  get: async (path) => {
    calls.push({ method: "GET", path });
    return leakedReplayPayload(path, undefined);
  },
  post: async (path, body) => {
    calls.push({ method: "POST", path, body });
    return leakedReplayPayload(path, body);
  }
};

for (const [toolName, input] of [
  [
    "comath.snapshot.export",
    {
      project_root: "D:/research/project",
      project_id: "PRJ-0001",
      actor: "goal3-task130",
      confirmation_id: "CONF-SNAPSHOT"
    }
  ],
  [
    "comath.snapshot.verify",
    {
      manifest_path: "D:/research/project/.comath/snapshots/SNAP-0001/manifest.json"
    }
  ],
  [
    "comath.replay.verifyManifest",
    {
      manifest_path: "D:/research/project/.comath/snapshots/SNAP-0001/manifest.json"
    }
  ],
  [
    "comath.campaign.replay",
    {
      project_root: "D:/research/project",
      campaign_id: "CAM-0001",
      actor: "goal3-task130",
      confirmation_id: "CONF-REPLAY"
    }
  ]
]) {
  const result = await executeComathTool(client, toolName, input);
  assertPublicResult(result, `${toolName} must downgrade public snapshot/replay proof-authority vocabulary`);
}

const commands = new Map();
registerComathPiRuntime(
  {
    registerTool() {},
    registerCommand(name, options) {
      commands.set(name, options.handler);
    },
    on() {}
  },
  { client, project_root: "D:/research/project", actor: "goal3-task130" }
);

const notifications = [];
await commands.get("cm:replay")("--campaign-id CAM-0001", {
  ui: {
    confirm: async () => true,
    notify: async (message, level) => {
      notifications.push({ message, level });
    }
  }
});

assert.equal(notifications.length, 1);
assertPublicResult(notifications[0].message, "/cm:replay notification must not expose privileged proof-authority vocabulary");
assert.equal(notifications[0].level, "info");

console.log("Goal 3 Task 130 Pi snapshot/replay public authority sanitizer tests passed.");
