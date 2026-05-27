import assert from "node:assert/strict";
import { createComathTools, executeComathTool, runtime_registration } from "../dist/index.js";

const tools = createComathTools();
const cancelTool = tools.find((tool) => tool.name === "comath.agent.cancelRun");
assert.ok(cancelTool, "comath.agent.cancelRun is registered");
assert.equal(cancelTool.mutates, true);
assert.deepEqual(cancelTool.input_schema.required, ["project_root", "project_id", "run_id", "actor", "confirmation_id"]);

const calls = [];
const client = {
  get: async () => {
    throw new Error("cancelRun must not use GET");
  },
  getText: async () => {
    throw new Error("cancelRun must not use text GET");
  },
  post: async (path, body) => {
    calls.push({ method: "POST", path, body });
    return { cancellation: { cancelled: true, proof_authority: "none" } };
  }
};

await assert.rejects(
  () =>
    executeComathTool(client, "comath.agent.cancelRun", {
      project_root: "D:/research/project",
      project_id: "PRJ-0001",
      run_id: "ARUN-0001",
      actor: "phase49-pi"
    }),
  /confirmed mutation permission is required/
);
assert.equal(calls.length, 0);

const result = await executeComathTool(client, "comath.agent.cancelRun", {
  project_root: "D:/research/project",
  project_id: "PRJ-0001",
  run_id: "ARUN-0001",
  actor: "phase49-pi",
  confirmation_id: "CONF-PHASE49"
});
assert.equal(result.cancellation.proof_authority, "none");
assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/agent/run/ARUN-0001/cancel");
assert.deepEqual(calls.at(-1).body, {
  project_root: "D:/research/project",
  project_id: "PRJ-0001",
  actor: "phase49-pi"
});

assert.equal(runtime_registration.tools.some((tool) => tool.name === "comath.agent.cancelRun"), true);

const fakePi = createFakePi();
const runtimeCalls = [];
const confirmations = [];
const notifications = [];
const module = await import("../dist/index.js");
module.default(fakePi.api, {
  client: {
    get: async () => {
      throw new Error("cancel command must not use GET");
    },
    getText: async () => {
      throw new Error("cancel command must not use text GET");
    },
    post: async (path, body) => {
      runtimeCalls.push({ method: "POST", path, body });
      return { cancellation: { cancelled: true, proof_authority: "none" } };
    }
  },
  project_root: "D:/research/project",
  actor: "phase49-pi"
});

assert.equal(fakePi.tools.has("comath.agent.cancelRun"), true);
await fakePi.commands.get("cm:agent").handler(
  "cancel --project-id PRJ-0001 --run-id ARUN-0001 --project-root D:/research/project --actor phase49-pi",
  {
    ui: {
      confirm: async (title, body) => {
        confirmations.push({ title, body });
        return true;
      },
      notify: async (message, level) => notifications.push({ message, level })
    }
  }
);
assert.equal(confirmations.length, 1);
assert.match(confirmations[0].body, /comath\.agent\.cancelRun/);
assert.equal(runtimeCalls.at(-1).method, "POST");
assert.equal(runtimeCalls.at(-1).path, "/agent/run/ARUN-0001/cancel");
assert.match(notifications.at(-1).message, /cancelled|proof_authority/i);

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

console.log("Phase 49 Pi agent operator cancel tool tests passed.");
