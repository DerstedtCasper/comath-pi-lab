import assert from "node:assert/strict";
import { createComathPiExtension, createComathTools, executeComathTool, runtime_registration } from "../dist/index.js";

const tools = createComathTools();
const listTool = tools.find((tool) => tool.name === "comath.agent.adapterPackageList");
const prepareTool = tools.find((tool) => tool.name === "comath.agent.prepareAdapterPackage");
const executeTool = tools.find((tool) => tool.name === "comath.agent.executeAdapterPackage");
assert.ok(listTool, "comath.agent.adapterPackageList is registered");
assert.ok(prepareTool, "comath.agent.prepareAdapterPackage is registered");
assert.ok(executeTool, "comath.agent.executeAdapterPackage is registered");
assert.equal(listTool.mutates, false);
assert.equal(prepareTool.mutates, true);
assert.equal(executeTool.mutates, true);
assert.deepEqual(prepareTool.input_schema.required, [
  "project_root",
  "project_id",
  "run_id",
  "profile_id",
  "adapter_id",
  "goal",
  "context_path",
  "actor",
  "confirmation_id"
]);
assert.deepEqual(executeTool.input_schema.required, [
  "project_root",
  "project_id",
  "workstream_id",
  "profile_id",
  "adapter_id",
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

await executeComathTool(client, "comath.agent.adapterPackageList", {});
assert.deepEqual(calls.at(-1), { method: "GET", path: "/agent/adapter/package/list" });

await assert.rejects(
  () =>
    executeComathTool(client, "comath.agent.prepareAdapterPackage", {
      project_root: "D:/research/project",
      project_id: "PRJ-0001",
      run_id: "ARUN-0001",
      profile_id: "proof-route",
      adapter_id: "codex-cli",
      goal: "Prepare packaged launch.",
      context_path: ".comath/workstreams/WS-0001/spec.yaml",
      actor: "phase43-pi"
    }),
  /confirmed mutation permission is required/
);

await executeComathTool(client, "comath.agent.prepareAdapterPackage", {
  project_root: "D:/research/project",
  project_id: "PRJ-0001",
  run_id: "ARUN-0001",
  profile_id: "proof-route",
  adapter_id: "codex-cli",
  goal: "Prepare packaged launch.",
  context_path: ".comath/workstreams/WS-0001/spec.yaml",
  actor: "phase43-pi",
  confirmation_id: "CONF-PREPARE-PACKAGE"
});
assert.deepEqual(calls.at(-1), {
  method: "POST",
  path: "/agent/adapter/package/prepare-launch",
  body: {
    project_root: "D:/research/project",
    project_id: "PRJ-0001",
    run_id: "ARUN-0001",
    profile_id: "proof-route",
    adapter_id: "codex-cli",
    goal: "Prepare packaged launch.",
    context_path: ".comath/workstreams/WS-0001/spec.yaml",
    actor: "phase43-pi"
  }
});

await executeComathTool(client, "comath.agent.executeAdapterPackage", {
  project_root: "D:/research/project",
  project_id: "PRJ-0001",
  campaign_id: "CAM-0001",
  workstream_id: "WS-0001",
  profile_id: "reviewer",
  adapter_id: "codex-cli",
  goal: "Execute packaged adapter.",
  context_path: ".comath/workstreams/WS-0001/spec.yaml",
  actor: "phase43-pi",
  confirmation_id: "CONF-EXECUTE-PACKAGE"
});
assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/agent/adapter/package/execute");
assert.equal(calls.at(-1).body.adapter_id, "codex-cli");
assert.equal(calls.at(-1).body.campaign_id, "CAM-0001");

const extension = createComathPiExtension({ client });
assert.equal(runtime_registration.tools.some((tool) => tool.name === "comath.agent.adapterPackageList"), true);
assert.equal(runtime_registration.tools.some((tool) => tool.name === "comath.agent.prepareAdapterPackage"), true);
assert.equal(runtime_registration.tools.some((tool) => tool.name === "comath.agent.executeAdapterPackage"), true);
assert.equal(extension.runtime_registration.tools.some((tool) => tool.name === "comath.agent.executeAdapterPackage"), true);

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
  actor: "phase43-pi"
});

assert.equal(fakePi.tools.has("comath.agent.adapterPackageList"), true);
assert.equal(fakePi.tools.has("comath.agent.prepareAdapterPackage"), true);
assert.equal(fakePi.tools.has("comath.agent.executeAdapterPackage"), true);
await fakePi.commands.get("cm:agent").handler("packages", { ui: { notify: async () => undefined } });
assert.deepEqual(runtimeCalls.at(-1), { method: "GET", path: "/agent/adapter/package/list" });

await fakePi.commands.get("cm:agent").handler(
  "prepare-package codex-cli --project-id PRJ-0001 --run-id ARUN-0001 --profile proof-route --goal \"Prepare packaged launch.\" --context .comath/workstreams/WS-0001/spec.yaml --project-root D:/research/project",
  {
    ui: {
      confirm: async () => true,
      notify: async () => undefined
    }
  }
);
assert.equal(runtimeCalls.at(-1).method, "POST");
assert.equal(runtimeCalls.at(-1).path, "/agent/adapter/package/prepare-launch");
assert.equal(runtimeCalls.at(-1).body.adapter_id, "codex-cli");

await fakePi.commands.get("cm:agent").handler(
  "execute-package codex-cli --project-id PRJ-0001 --workstream-id WS-0001 --profile reviewer --goal \"Execute packaged adapter.\" --context .comath/workstreams/WS-0001/spec.yaml --campaign-id CAM-0001 --project-root D:/research/project",
  {
    ui: {
      confirm: async () => true,
      notify: async () => undefined
    }
  }
);
assert.equal(runtimeCalls.at(-1).method, "POST");
assert.equal(runtimeCalls.at(-1).path, "/agent/adapter/package/execute");
assert.equal(runtimeCalls.at(-1).body.profile_id, "reviewer");

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

console.log("Phase 43 Pi agent adapter package tool tests passed.");
