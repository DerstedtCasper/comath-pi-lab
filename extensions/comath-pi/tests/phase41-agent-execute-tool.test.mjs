import assert from "node:assert/strict";
import {
  createComathPiExtension,
  createComathTools,
  executeComathTool,
  runtime_registration
} from "../dist/index.js";

const tools = createComathTools();
const executeTool = tools.find((tool) => tool.name === "comath.agent.executeProfile");
assert.ok(executeTool, "comath.agent.executeProfile is registered");
assert.equal(executeTool.mutates, true);
assert.deepEqual(executeTool.input_schema.required, [
  "project_root",
  "project_id",
  "workstream_id",
  "profile_id",
  "program",
  "goal",
  "context_path",
  "actor",
  "confirmation_id"
]);

const calls = [];
const client = {
  get: async (path) => {
    calls.push({ method: "GET", path });
    return { ok: true, path };
  },
  post: async (path, body) => {
    calls.push({ method: "POST", path, body });
    return { ok: true, path, body };
  }
};

await assert.rejects(
  () =>
    executeComathTool(client, "comath.agent.executeProfile", {
      project_root: "D:/research/project",
      project_id: "PRJ-0001",
      workstream_id: "WS-0001",
      profile_id: "proof-route",
      program: process.execPath,
      goal: "Run proof route adapter.",
      context_path: ".comath/workstreams/WS-0001/spec.yaml",
      actor: "phase41-pi"
    }),
  /confirmed mutation permission is required/
);

await executeComathTool(client, "comath.agent.executeProfile", {
  project_root: "D:/research/project",
  project_id: "PRJ-0001",
  campaign_id: "CAM-0001",
  workstream_id: "WS-0001",
  profile_id: "proof-route",
  program: process.execPath,
  adapter_args: ["D:/adapter/fixture.mjs"],
  goal: "Run proof route adapter.",
  context_path: ".comath/workstreams/WS-0001/spec.yaml",
  actor: "phase41-pi",
  confirmation_id: "CONF-EXECUTE"
});
assert.deepEqual(calls.at(-1), {
  method: "POST",
  path: "/agent/run/profile/execute",
  body: {
    project_root: "D:/research/project",
    project_id: "PRJ-0001",
    campaign_id: "CAM-0001",
    workstream_id: "WS-0001",
    profile_id: "proof-route",
    program: process.execPath,
    adapter_args: ["D:/adapter/fixture.mjs"],
    goal: "Run proof route adapter.",
    context_path: ".comath/workstreams/WS-0001/spec.yaml",
    actor: "phase41-pi"
  }
});

const extension = createComathPiExtension({ client });
assert.equal(runtime_registration.tools.some((tool) => tool.name === "comath.agent.executeProfile"), true);
assert.equal(extension.runtime_registration.tools.some((tool) => tool.name === "comath.agent.executeProfile"), true);

const fakePi = createFakePi();
const runtimeCalls = [];
const module = await import("../dist/index.js");
module.default(fakePi.api, {
  client: {
    get: async (path) => {
      runtimeCalls.push({ method: "GET", path });
      return { ok: true, path };
    },
    post: async (path, body) => {
      runtimeCalls.push({ method: "POST", path, body });
      return { ok: true, path, body };
    }
  },
  project_root: "D:/research/project",
  actor: "phase41-pi"
});

assert.equal(fakePi.tools.has("comath.agent.executeProfile"), true);
await fakePi.commands.get("cm:agent").handler(
  `execute proof-route --project-id PRJ-0001 --workstream-id WS-0001 --program ${JSON.stringify(process.execPath)} --adapter-arg D:/adapter/fixture.mjs --goal "Run proof route adapter." --context .comath/workstreams/WS-0001/spec.yaml --campaign-id CAM-0001`,
  {
    ui: {
      confirm: async () => true,
      notify: async () => undefined
    }
  }
);
assert.equal(runtimeCalls.at(-1).method, "POST");
assert.equal(runtimeCalls.at(-1).path, "/agent/run/profile/execute");
assert.equal(runtimeCalls.at(-1).body.profile_id, "proof-route");
assert.deepEqual(runtimeCalls.at(-1).body.adapter_args, ["D:/adapter/fixture.mjs"]);

function createFakePi() {
  const tools = new Map();
  const commands = new Map();
  const handlers = new Map();
  return {
    tools,
    commands,
    handlers,
    api: {
      registerTool(tool) {
        tools.set(tool.name, tool);
      },
      registerCommand(name, options) {
        commands.set(name, options);
      },
      on(event, handler) {
        handlers.set(event, handler);
      }
    }
  };
}

console.log("Phase 41 Pi agent execute tool tests passed.");
