import assert from "node:assert/strict";
import { createComathTools, executeComathTool } from "../dist/index.js";

const tools = createComathTools();
const prepareTool = tools.find((tool) => tool.name === "comath.agent.prepareAdapterPackage");
const executeTool = tools.find((tool) => tool.name === "comath.agent.executeAdapterPackage");
assert.ok(prepareTool, "prepare packaged adapter tool is registered");
assert.ok(executeTool, "execute packaged adapter tool is registered");
assert.equal(prepareTool.input_schema.properties.backend.enum.includes("codex-api"), true);
assert.equal(executeTool.input_schema.properties.backend.enum.includes("codex-api"), true);

const calls = [];
const client = {
  get: async (path) => ({ ok: true, path }),
  post: async (path, body) => {
    calls.push({ method: "POST", path, body });
    return { ok: true, path, body };
  }
};

await executeComathTool(client, "comath.agent.prepareAdapterPackage", {
  project_root: "D:/research/project",
  project_id: "PRJ-0001",
  run_id: "ARUN-5101",
  profile_id: "proof-route",
  adapter_id: "codex-cli",
  backend: "codex-api",
  goal: "Prepare Codex API adapter launch.",
  context_path: ".comath/workstreams/WS-0001/spec.yaml",
  actor: "phase51-pi",
  confirmation_id: "CONF-PREPARE-CODEX-API"
});
assert.equal(calls.at(-1).path, "/agent/adapter/package/prepare-launch");
assert.equal(calls.at(-1).body.backend, "codex-api");
assert.equal("api_key" in calls.at(-1).body, false);
assert.equal("base_url" in calls.at(-1).body, false);

await executeComathTool(client, "comath.agent.executeAdapterPackage", {
  project_root: "D:/research/project",
  project_id: "PRJ-0001",
  workstream_id: "WS-0001",
  profile_id: "reviewer",
  adapter_id: "codex-cli",
  backend: "codex-api",
  goal: "Execute Codex API adapter launch.",
  context_path: ".comath/workstreams/WS-0001/spec.yaml",
  actor: "phase51-pi",
  confirmation_id: "CONF-EXECUTE-CODEX-API"
});
assert.equal(calls.at(-1).path, "/agent/adapter/package/execute");
assert.equal(calls.at(-1).body.backend, "codex-api");
assert.equal("api_key" in calls.at(-1).body, false);
assert.equal("base_url" in calls.at(-1).body, false);

const fakePi = createFakePi();
const runtimeCalls = [];
const module = await import("../dist/index.js");
module.default(fakePi.api, {
  client: {
    get: async (path) => ({ ok: true, path }),
    post: async (path, body) => {
      runtimeCalls.push({ method: "POST", path, body });
      return { ok: true, path, body };
    }
  },
  project_root: "D:/research/project",
  actor: "phase51-pi"
});

await fakePi.commands.get("cm:agent").handler(
  "prepare-package codex-cli --project-id PRJ-0001 --run-id ARUN-5101 --profile proof-route --backend codex-api --goal \"Prepare Codex API adapter launch.\" --context .comath/workstreams/WS-0001/spec.yaml --project-root D:/research/project",
  { ui: { confirm: async () => true, notify: async () => undefined } }
);
assert.equal(runtimeCalls.at(-1).path, "/agent/adapter/package/prepare-launch");
assert.equal(runtimeCalls.at(-1).body.backend, "codex-api");

await fakePi.commands.get("cm:agent").handler(
  "execute-package codex-cli --project-id PRJ-0001 --workstream-id WS-0001 --profile reviewer --backend codex-api --goal \"Execute Codex API adapter launch.\" --context .comath/workstreams/WS-0001/spec.yaml --project-root D:/research/project",
  { ui: { confirm: async () => true, notify: async () => undefined } }
);
assert.equal(runtimeCalls.at(-1).path, "/agent/adapter/package/execute");
assert.equal(runtimeCalls.at(-1).body.backend, "codex-api");

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

console.log("Phase 51 Pi Codex API backend tool tests passed.");
