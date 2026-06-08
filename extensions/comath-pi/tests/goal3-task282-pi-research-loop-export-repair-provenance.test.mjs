import assert from "node:assert/strict";
import registerComathPiRuntime, { runComathResearchCommand } from "../dist/index.js";

const projectRoot = "D:/research/project";
const digestA = "a".repeat(64);
const digestB = "b".repeat(64);
const digestC = "c".repeat(64);

const provenance = {
  schema_version: "comath.candidate_repair_provenance.v1",
  repair_stage: "live_computation_sympy_true_decide_repair",
  source_repair_hint_execution: {
    path: ".comath/campaign/CAM-0282/lean_candidate_attempt_repair_hint_execution.json",
    sha256: digestA,
    proof_authority: "none"
  },
  source_repair_execution: {
    path: ".comath/campaign/CAM-0282/lean_candidate_attempt_repair_execution.json",
    sha256: digestB,
    proof_authority: "none"
  },
  source_per_candidate_repair_execution: {
    path: ".comath/campaign/CAM-0282/candidates/CAND-0001/repair_execution.json",
    sha256: digestC,
    proof_authority: "none"
  },
  proof_authority: "none",
  can_promote_claim: false,
  result_can_be_used_as_proof: false
};

function createClient({ exportAuthorityPassed = true } = {}) {
  const calls = [];
  const client = {
    get: async (path) => {
      calls.push({ method: "GET", path });
      if (path.startsWith("/campaign/CAM-0282/export")) {
        return {
          export_manifest: {
            evidence_pack_ready: exportAuthorityPassed,
            proof_authority: exportAuthorityPassed ? "lean_kernel_clean_replay" : "none",
            can_promote_claim: false,
            candidate_repair_provenance: provenance
          }
        };
      }
      if (path.startsWith("/project/status")) {
        return { project: { project_id: "PRJ-0282", name: "Task282 Pi" }, runtime: { initialized: true } };
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
            campaign_id: "CAM-0282",
            project_id: "PRJ-0282",
            root_claim_id: "C-0282",
            current_stage: "problem_locked",
            status: "running",
            next_actions: []
          }
        };
      }
      if (path === "/campaign/CAM-0282/tick") {
        return {
          campaign: {
            campaign_id: "CAM-0282",
            project_id: "PRJ-0282",
            root_claim_id: "C-0282",
            current_stage: "completed_formal_proof",
            status: "terminal",
            external_v3_terminal_state: "formal_proof_verified",
            goal_mode_terminal_state: "formal_replay_passed",
            formal_replay_authority_passed: true,
            formal_replay_authority_evidence: {
              schema_version: "comath.formal_replay_authority_evidence.v1",
              proof_authority: "lean_kernel_clean_replay",
              final_evidence_status: "verified_final_authority_evidence",
              final_replay_manifest_v3_path: ".comath/evidence/C-0282/lean/final_replay_manifest_v3.json",
              final_authority_packaging_path: ".comath/evidence/C-0282/lean/final_authority_packaging_v3.json"
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

function assertResearchLoopExportDescriptor(result, label, { publicNotification = false } = {}) {
  if (!publicNotification) {
    assert.equal(result.goal_terminal_state, "formal_replay_passed");
    assert.equal(result.external_v3_terminal_state, "formal_proof_verified");
  } else {
    assert.equal(result.goal_terminal_state, "unverified_formal_status");
    assert.equal(result.external_v3_terminal_state, "unverified_formal_status");
  }
  assert.equal(result.export_descriptor.route, "/campaign/CAM-0282/export");
  assert.equal(result.export_descriptor.proof_authority, "none");
  assert.equal(result.export_descriptor.can_promote_claim, false);
  assert.equal(result.export_descriptor.lean_clean_replay_authority_verified, true);
  assert.deepEqual(result.export_descriptor.candidate_repair_provenance, provenance, `${label} must surface repair provenance`);
}

const directHarness = createClient();
const directResult = await runComathResearchCommand(
  directHarness.client,
  '/cm:research --goal "show (2 : Int) + 2 = 4" --strict',
  {
    project_root: projectRoot,
    project_name: "Task282 Pi",
    actor: "goal3-task282",
    confirmation_id: "CONF-282",
    max_ticks: 1
  }
);
assertResearchLoopExportDescriptor(directResult, "direct /cm:research command");
assert.ok(directHarness.calls.some((call) => call.method === "GET" && call.path.startsWith("/campaign/CAM-0282/export")));

const forgedHarness = createClient({ exportAuthorityPassed: false });
const forgedResult = await runComathResearchCommand(
  forgedHarness.client,
  '/cm:research --goal "show (2 : Int) + 2 = 4" --strict',
  {
    project_root: projectRoot,
    project_name: "Task282 Pi",
    actor: "goal3-task282",
    confirmation_id: "CONF-282-FORGED",
    max_ticks: 1
  }
);
assert.equal(forgedResult.goal_terminal_state, "blocked_with_replayable_certificate");
assert.equal(forgedResult.export_descriptor.candidate_repair_provenance, undefined);
assert.equal(forgedResult.export_descriptor.lean_clean_replay_authority_verified, false);

const runtimeHarness = createClient();
const commands = new Map();
const notifications = [];
registerComathPiRuntime(
  {
    registerTool() {},
    registerCommand(name, options) {
      commands.set(name, options.handler);
    },
    on() {}
  },
  { client: runtimeHarness.client, project_root: projectRoot, actor: "goal3-task282" }
);

await commands.get("cm:research")('--goal "show (2 : Int) + 2 = 4" --strict', {
  ui: {
    confirm: async () => true,
    notify: async (message, level) => {
      notifications.push({ message, level });
    }
  }
});

assert.equal(notifications.length, 1);
assert.equal(notifications[0].level, "info");
assertResearchLoopExportDescriptor(JSON.parse(notifications[0].message), "runtime /cm:research notification", {
  publicNotification: true
});

console.log("Goal 3 Task 282 Pi research loop export repair provenance test passed.");
