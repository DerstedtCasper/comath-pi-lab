import assert from "node:assert/strict";
import {
  issueCampaignLoopCapability,
  runResearchCampaignLoop
} from "../dist/index.js";

function createHarness() {
  const calls = [];
  const client = {
    get: async (path) => {
      calls.push({ method: "GET", path });
      if (path.startsWith("/campaign/CAM-1251/export")) {
        return {
          export_manifest: {
            evidence_pack_ready: false,
            proof_authority: "none",
            can_promote_claim: false
          }
        };
      }
      if (path.startsWith("/project/status")) {
        return { project: { project_id: "PRJ-1251", name: "Task125 Pi" }, runtime: { initialized: true } };
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
            campaign_id: "CAM-1251",
            project_id: "PRJ-1251",
            root_claim_id: "C-1251",
            current_stage: "problem_locked",
            status: "running",
            next_actions: []
          }
        };
      }
      if (path === "/campaign/CAM-1251/tick") {
        return {
          campaign: {
            campaign_id: "CAM-1251",
            project_id: "PRJ-1251",
            root_claim_id: "C-1251",
            current_stage: "completed_formal_proof",
            status: "terminal",
            terminal_state: "completed_formal_proof",
            external_v3_terminal_state: "formal_proof_verified",
            goal_mode_terminal_state: "formal_replay_passed",
            formal_replay_authority_passed: true,
            formal_replay_authority_evidence: {
              schema_version: "comath.formal_replay_authority_evidence.v1",
              proof_authority: "lean_kernel_clean_replay",
              final_evidence_status: "verified_final_authority_evidence",
              final_replay_manifest_v3_path: ".comath/evidence/C-1251/lean/final_replay_manifest_v3.json",
              final_authority_packaging_path: ".comath/evidence/C-1251/lean/final_authority_packaging_v3.json"
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
  project_root: "D:/research/task125",
  actor: "goal3-task125",
  max_ticks: 1,
  confirmation: {
    kind: "mutation_confirmation",
    target: "/cm:research",
    allowed: true,
    confirmation_id: "CONF-1251"
  }
});

const harness = createHarness();
const result = await runResearchCampaignLoop(harness.client, {
  project_root: "D:/research/task125",
  project_name: "Task125 Pi",
  user_goal: "Prove a theorem",
  actor: "goal3-task125",
  mode: "goal",
  max_ticks: 1,
  capability
});

assert.equal(result.external_v3_terminal_state, undefined);
assert.equal(result.goal_terminal_state, "blocked_with_replayable_certificate");
assert.equal(result.terminal, true);
assert.equal(result.stopped_reason, "terminal");
assert.equal(result.blocker_certificate?.code, "UNVERIFIED_FORMAL_REPLAY_AUTHORITY");
assert.equal(result.blocker_certificate?.proof_authority, "none");
assert.equal(result.blocker_certificate?.can_promote_claim, false);
assert.ok(harness.calls.some((call) => call.method === "GET" && call.path.startsWith("/campaign/CAM-1251/export")));

console.log("Goal 3 Task 125 Pi untrusted proof terminal-state test passed.");
