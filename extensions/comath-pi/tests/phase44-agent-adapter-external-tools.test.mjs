import assert from "node:assert/strict";
import { createComathPiExtension, createComathTools, executeComathTool, runtime_registration } from "../dist/index.js";

const tools = createComathTools();
const prepareTool = tools.find((tool) => tool.name === "comath.agent.prepareAdapterPackage");
const executeTool = tools.find((tool) => tool.name === "comath.agent.executeAdapterPackage");
assert.ok(prepareTool, "prepare packaged adapter tool is registered");
assert.ok(executeTool, "execute packaged adapter tool is registered");
assert.equal(prepareTool.input_schema.properties.backend.enum.includes("external"), true);
assert.equal(executeTool.input_schema.properties.backend.enum.includes("bundled"), true);

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
  run_id: "ARUN-4401",
  profile_id: "proof-route",
  adapter_id: "codex-cli",
  backend: "external",
  goal: "Prepare external adapter launch.",
  context_path: ".comath/workstreams/WS-0001/spec.yaml",
  actor: "phase44-pi",
  confirmation_id: "CONF-PREPARE-EXTERNAL-PACKAGE"
});
assert.equal(calls.at(-1).path, "/agent/adapter/package/prepare-launch");
assert.equal(calls.at(-1).body.backend, "external");

await executeComathTool(client, "comath.agent.executeAdapterPackage", {
  project_root: "D:/research/project",
  project_id: "PRJ-0001",
  workstream_id: "WS-0001",
  profile_id: "reviewer",
  adapter_id: "codex-cli",
  backend: "external",
  goal: "Execute external adapter launch.",
  context_path: ".comath/workstreams/WS-0001/spec.yaml",
  actor: "phase44-pi",
  confirmation_id: "CONF-EXECUTE-EXTERNAL-PACKAGE"
});
assert.equal(calls.at(-1).path, "/agent/adapter/package/execute");
assert.equal(calls.at(-1).body.backend, "external");

const extension = createComathPiExtension({ client });
assert.equal(runtime_registration.tools.some((tool) => tool.name === "comath.agent.executeAdapterPackage"), true);
assert.equal(extension.runtime_registration.tools.some((tool) => tool.name === "comath.agent.prepareAdapterPackage"), true);

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
  actor: "phase44-pi"
});

await fakePi.commands.get("cm:agent").handler(
  "prepare-package codex-cli --project-id PRJ-0001 --run-id ARUN-4401 --profile proof-route --backend external --goal \"Prepare external adapter launch.\" --context .comath/workstreams/WS-0001/spec.yaml --project-root D:/research/project",
  { ui: { confirm: async () => true, notify: async () => undefined } }
);
assert.equal(runtimeCalls.at(-1).path, "/agent/adapter/package/prepare-launch");
assert.equal(runtimeCalls.at(-1).body.backend, "external");

await fakePi.commands.get("cm:agent").handler(
  "execute-package codex-cli --project-id PRJ-0001 --workstream-id WS-0001 --profile reviewer --backend external --goal \"Execute external adapter launch.\" --context .comath/workstreams/WS-0001/spec.yaml --project-root D:/research/project",
  { ui: { confirm: async () => true, notify: async () => undefined } }
);
assert.equal(runtimeCalls.at(-1).path, "/agent/adapter/package/execute");
assert.equal(runtimeCalls.at(-1).body.backend, "external");

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

console.log("Phase 44 Pi external adapter package tool tests passed.");
