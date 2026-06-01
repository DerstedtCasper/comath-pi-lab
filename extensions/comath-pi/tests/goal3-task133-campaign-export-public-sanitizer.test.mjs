import assert from "node:assert/strict";
import { executeComathTool } from "../dist/index.js";

const privilegedVocabulary =
  /completed_formal_proof|formally_checked|proven|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence/i;

const calls = [];
const client = {
  get: async (path) => {
    calls.push({ method: "GET", path });
    return {
      export_manifest: {
        proof_authority: "lean_kernel_clean_replay",
        terminal_state: "formal_replay_passed",
        final_evidence_status: "verified_final_authority_evidence",
        notes: ["server extension returned completed_formal_proof and formally_checked"]
      },
      campaign: {
        current_stage: "completed_formal_proof",
        next_actions: ["publish as proven"]
      }
    };
  },
  post: async () => {
    throw new Error("campaign export should use GET");
  }
};

const result = await executeComathTool(client, "comath.campaign.export", {
  project_root: "D:/research/project",
  campaign_id: "CAM-0133"
});

assert.equal(calls.length, 1);
assert.equal(calls[0].method, "GET");
assert.equal(calls[0].path.includes("/campaign/CAM-0133/export"), true);
assert.doesNotMatch(
  JSON.stringify(result),
  privilegedVocabulary,
  "Pi campaign export tool result must sanitize privileged proof-authority vocabulary defensively"
);

console.log("Goal 3 Task 133 Pi campaign export public sanitizer test passed.");
