import assert from "node:assert/strict";
import {
  createComathTools,
  createOfficialPiManifest,
  createOfficialPiToolRegistrations,
  validateOfficialPiManifest
} from "../dist/index.js";

const researchTools = createComathTools();
const officialTools = createOfficialPiToolRegistrations(researchTools);

assert.equal(officialTools.length, researchTools.length);

const claimTool = officialTools.find((tool) => tool.name === "comath_claim_register");
const researchClaimTool = researchTools.find((tool) => tool.name === "comath.claim.register");
assert.ok(claimTool, "official claim tool is registered");
assert.equal(claimTool.label, "comath.claim.register");
assert.equal(officialTools.every((tool) => /^[a-zA-Z0-9_-]+$/.test(tool.name)), true);
assert.equal(claimTool.description, researchClaimTool.description);
assert.deepEqual(claimTool.parameters, researchClaimTool.input_schema);
assert.equal("input_schema" in claimTool, false);
assert.equal(typeof claimTool.execute, "function");
assert.equal(claimTool.execute.length, 5);

const onUpdateCalls = [];
const ctx = {
  hasUI: false,
  ui: {
    async showToast() {
      throw new Error("headless adapter must not call ctx.ui");
    }
  },
  tools: {
    async execute(name, params, options) {
      return {
        name,
        params,
        options
      };
    }
  }
};

const signal = new AbortController().signal;
const result = await claimTool.execute(
  "TOOLCALL-0001",
  { project_root: "D:/math/project", project_id: "PRJ-0001", statement: "x = x", domain: "algebra" },
  signal,
  (update) => onUpdateCalls.push(update),
  ctx
);

assert.equal(result.name, "comath.claim.register");
assert.equal(result.params.statement, "x = x");
assert.equal(result.options.toolCallId, "TOOLCALL-0001");
assert.equal(result.options.signal, signal);
assert.equal(onUpdateCalls.length, 1);
assert.equal(onUpdateCalls[0].toolCallId, "TOOLCALL-0001");
assert.equal(onUpdateCalls[0].name, "comath_claim_register");
assert.equal(onUpdateCalls[0].status, "started");

const preAbortedController = new AbortController();
preAbortedController.abort();
const preAbortUpdates = [];
await assert.rejects(
  () =>
    claimTool.execute(
      "TOOLCALL-ABORTED",
      { project_root: "D:/math/project", project_id: "PRJ-0001", statement: "x = x", domain: "algebra" },
      preAbortedController.signal,
      (update) => preAbortUpdates.push(update),
      ctx
    ),
  /aborted/
);
assert.equal(preAbortUpdates.length, 0);

await assert.rejects(
  () => claimTool.execute("TOOLCALL-BAD-PARAMS", null, undefined, undefined, ctx),
  /params must be a plain object/
);
await assert.rejects(
  () => claimTool.execute("TOOLCALL-MISSING-REQUIRED", { project_root: "D:/math/project" }, undefined, undefined, ctx),
  /missing required parameter/
);
await assert.rejects(
  () =>
    claimTool.execute(
      "TOOLCALL-NO-EXECUTOR",
      { project_root: "D:/math/project", project_id: "PRJ-0001", statement: "x = x", domain: "algebra" },
      undefined,
      undefined,
      { hasUI: false }
    ),
  /official Pi tool executor is unavailable/
);

const manifest = createOfficialPiManifest({
  extensions: [{ name: "coMath-pi-lab", tools: officialTools.map((tool) => tool.name) }],
  skills: ["math-research"],
  prompts: ["coordinator"],
  themes: ["formal-workbench"]
});

assert.deepEqual(Object.keys(manifest).sort(), ["extensions", "prompts", "skills", "themes"]);
assert.deepEqual(validateOfficialPiManifest(manifest), manifest);

assert.throws(
  () =>
    validateOfficialPiManifest({
      extensions: [],
      skills: [],
      prompts: [],
      themes: [],
      resources: []
    }),
  /manifest only allows extensions, skills, prompts, and themes/
);

console.log("Phase 18 official Pi adapter tests passed.");
