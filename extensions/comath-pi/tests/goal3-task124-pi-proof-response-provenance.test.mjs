import assert from "node:assert/strict";
import {
  issueCampaignLoopCapability,
  runResearchCampaignLoop
} from "../dist/index.js";

function createHarness({ exportAuthorityPassed = false } = {}) {
  const calls = [];
  const client = {
    get: async (path) => {
      calls.push({ method: "GET", path });
      if (path.startsWith("/campaign/CAM-1241/export")) {
        return {
          export_manifest: {
            evidence_pack_ready: exportAuthorityPassed,
            proof_authority: exportAuthorityPassed ? "lean_kernel_clean_replay" : "none",
            can_promote_claim: false
          }
        };
      }
      if (path.startsWith("/project/status")) {
        return { project: { project_id: "PRJ-1241", name: "Task124 Pi" }, runtime: { initialized: true } };
      }
      if (path.startsWith("/workstream/list")) {
        return { workstreams: [] };
      }
      if (path.startsWith("/claim/list")) {
        return { claims: [] };
      }
      if (path.startsWith("/evidence/list")) {
        return { evidence: [] };
      }
      if (path.startsWith("/gate/list")) {
        return { gates: [] };
      }
      if (path.startsWith("/paper/state")) {
        return { margin_notes: [] };
      }
      if (path.startsWith("/paper/check")) {
        return { ok: true, vetoes: [], warnings: [], notes: [] };
      }
      throw new Error(`unexpected GET ${path}`);
    },
    post: async (path, body) => {
      calls.push({ method: "POST", path, body });
      if (path === "/campaign/start") {
        return {
          campaign: {
            campaign_id: "CAM-1241",
            project_id: "PRJ-1241",
            root_claim_id: "C-1241",
            current_stage: "problem_locked",
            status: "running",
            next_actions: []
          }
        };
      }
      if (path === "/campaign/CAM-1241/tick") {
        return {
          campaign: {
            campaign_id: "CAM-1241",
            project_id: "PRJ-1241",
            root_claim_id: "C-1241",
            current_stage: "completed_formal_proof",
            status: "terminal",
            external_v3_terminal_state: "formal_proof_verified",
            goal_mode_terminal_state: "formal_replay_passed",
            formal_replay_authority_passed: true,
            formal_replay_authority_evidence: {
              schema_version: "comath.formal_replay_authority_evidence.v1",
              proof_authority: "lean_kernel_clean_replay",
              final_evidence_status: "verified_final_authority_evidence",
              final_replay_manifest_v3_path: ".comath/evidence/C-1241/lean/final_replay_manifest_v3.json",
              final_authority_packaging_path: ".comath/evidence/C-1241/lean/final_authority_packaging_v3.json"
            },
            next_actions: []
          }
        };
      }
      throw new Error(`unexpected POST ${path}`);
    }
  };
  return { client, calls };
}

const capability = issueCampaignLoopCapability({
  project_root: "D:/research/task124",
  actor: "goal3-task124",
  max_ticks: 1,
  confirmation: {
    kind: "mutation_confirmation",
    target: "/cm:research",
    allowed: true,
    confirmation_id: "CONF-1241"
  }
});

const forged = createHarness({ exportAuthorityPassed: false });
const forgedResult = await runResearchCampaignLoop(forged.client, {
  project_root: "D:/research/task124",
  project_name: "Task124 Pi",
  user_goal: "Prove a theorem",
  actor: "goal3-task124",
  mode: "goal",
  max_ticks: 1,
  capability
});

assert.equal(forgedResult.goal_terminal_state, undefined);
assert.equal(
  forgedResult.external_v3_terminal_state,
  undefined,
  "Pi must not surface formal_proof_verified from shape-only service responses unless hardened export authority also passes"
);
assert.ok(forged.calls.some((call) => call.method === "GET" && call.path.startsWith("/campaign/CAM-1241/export")));

const verified = createHarness({ exportAuthorityPassed: true });
const verifiedResult = await runResearchCampaignLoop(verified.client, {
  project_root: "D:/research/task124",
  project_name: "Task124 Pi",
  user_goal: "Prove a theorem",
  actor: "goal3-task124",
  mode: "goal",
  max_ticks: 1,
  capability
});
assert.equal(verifiedResult.goal_terminal_state, "formal_replay_passed");
assert.equal(verifiedResult.external_v3_terminal_state, "formal_proof_verified");

console.log("Goal 3 Task 124 Pi proof-response provenance test passed.");
