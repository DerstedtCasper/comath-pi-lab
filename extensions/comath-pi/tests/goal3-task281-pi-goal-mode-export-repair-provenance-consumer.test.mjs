import assert from "node:assert/strict";
import registerComathPiRuntime, { executeComathTool } from "../dist/index.js";

const projectRoot = "D:/research/project";
const secret = "sk-task281-live-provider-secret";
const digestA = "a".repeat(64);
const digestB = "b".repeat(64);
const digestC = "c".repeat(64);

const provenance = {
  schema_version: "comath.candidate_repair_provenance.v1",
  repair_stage: "live_computation_sympy_true_decide_repair",
  source_repair_hint_execution: {
    path: ".comath/campaign/CAM-0281/lean_candidate_attempt_repair_hint_execution.json",
    sha256: digestA,
    proof_authority: "none"
  },
  source_repair_execution: {
    path: ".comath/campaign/CAM-0281/lean_candidate_attempt_repair_execution.json",
    sha256: digestB,
    proof_authority: "none"
  },
  source_per_candidate_repair_execution: {
    path: ".comath/campaign/CAM-0281/candidates/CAND-0001/repair_execution.json",
    sha256: digestC,
    proof_authority: "none"
  },
  proof_authority: "none",
  can_promote_claim: false,
  result_can_be_used_as_proof: false,
  debug_note: `service debug from ${projectRoot}/.comath/campaign/CAM-0281 with token ${secret}`
};

const calls = [];
const client = {
  get: async (path) => {
    calls.push({ method: "GET", path });
    return {
      export_manifest: {
        evidence_pack_ready: true,
        proof_authority: "lean_kernel_clean_replay",
        candidate_repair_provenance: provenance,
        notes: ["unrelated runtime path .comath/campaign/CAM-0281/private-debug.json must remain redacted"]
      }
    };
  },
  post: async () => {
    throw new Error("campaign export should use GET");
  }
};

function assertPiPublicRepairProvenance(value, label) {
  const exported = value.export_manifest.candidate_repair_provenance;
  assert.ok(exported, `${label} must preserve candidate_repair_provenance`);
  assert.equal(exported.schema_version, "comath.candidate_repair_provenance.v1");
  assert.equal(exported.repair_stage, "live_computation_sympy_true_decide_repair");
  assert.equal(exported.proof_authority, "none");
  assert.equal(exported.can_promote_claim, false);
  assert.equal(exported.result_can_be_used_as_proof, false);
  assert.deepEqual(exported.source_repair_hint_execution, provenance.source_repair_hint_execution);
  assert.deepEqual(exported.source_repair_execution, provenance.source_repair_execution);
  assert.deepEqual(exported.source_per_candidate_repair_execution, provenance.source_per_candidate_repair_execution);
  assert.equal(
    value.export_manifest.notes[0].includes("[redacted_trusted_runtime_path]"),
    true,
    `${label} must keep ordinary public runtime paths redacted`
  );

  const serialized = JSON.stringify(value);
  assert.equal(serialized.includes(projectRoot), false, `${label} must not leak host root`);
  assert.equal(serialized.includes(secret), false, `${label} must not leak provider secrets`);
}

const result = await executeComathTool(client, "comath.campaign.export", {
  project_root: projectRoot,
  campaign_id: "CAM-0281"
});

assert.equal(calls.length, 1);
assert.equal(calls[0].method, "GET");
assert.equal(calls[0].path, "/campaign/CAM-0281/export?project_root=D%3A%2Fresearch%2Fproject");
assertPiPublicRepairProvenance(result, "tool result");

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
  { client, project_root: projectRoot, actor: "goal3-task281" }
);

await commands.get("cm:campaign")("export CAM-0281 --project-root D:/research/project", {
  ui: {
    notify: async (message, level) => {
      notifications.push({ message, level });
    }
  }
});

assert.equal(notifications.length, 1);
assert.equal(notifications[0].level, "info");
assertPiPublicRepairProvenance(JSON.parse(notifications[0].message), "runtime notification");

console.log("Goal 3 Task 281 Pi goal-mode export repair provenance consumer test passed.");
