import assert from "node:assert/strict";
import {
  createComathPiExtension,
  createComathTools,
  executeComathTool,
  runtime_registration
} from "../dist/index.js";

const tools = createComathTools();
const logsTool = tools.find((tool) => tool.name === "comath.agent.logs");
const healthTool = tools.find((tool) => tool.name === "comath.agent.health");
assert.ok(logsTool, "comath.agent.logs is registered");
assert.ok(healthTool, "comath.agent.health is registered");
assert.equal(logsTool.mutates, false);
assert.equal(healthTool.mutates, true);
assert.deepEqual(logsTool.input_schema.required, ["project_root", "project_id", "run_id"]);
assert.deepEqual(healthTool.input_schema.required, [
  "project_root",
  "project_id",
  "profile_id",
  "program",
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

await executeComathTool(client, "comath.agent.logs", {
  project_root: "D:/research/project",
  project_id: "PRJ-0001",
  run_id: "ARUN-0001",
  max_bytes: 4096
});
assert.equal(calls.at(-1).method, "GET");
assert.equal(
  calls.at(-1).path,
  "/agent/run/ARUN-0001/logs?project_root=D%3A%2Fresearch%2Fproject&project_id=PRJ-0001&max_bytes=4096"
);

await assert.rejects(
  () =>
    executeComathTool(client, "comath.agent.health", {
      project_root: "D:/research/project",
      project_id: "PRJ-0001",
      profile_id: "reviewer",
      program: process.execPath,
      actor: "phase42-pi"
    }),
  /confirmed mutation permission is required/
);

await executeComathTool(client, "comath.agent.health", {
  project_root: "D:/research/project",
  project_id: "PRJ-0001",
  profile_id: "reviewer",
  program: process.execPath,
  adapter_args: ["D:/adapter/fixture.mjs"],
  actor: "phase42-pi",
  confirmation_id: "CONF-HEALTH"
});
assert.deepEqual(calls.at(-1), {
  method: "POST",
  path: "/agent/adapter/health",
  body: {
    project_root: "D:/research/project",
    project_id: "PRJ-0001",
    profile_id: "reviewer",
    program: process.execPath,
    adapter_args: ["D:/adapter/fixture.mjs"],
    actor: "phase42-pi"
  }
});

const extension = createComathPiExtension({ client });
assert.equal(runtime_registration.tools.some((tool) => tool.name === "comath.agent.logs"), true);
assert.equal(runtime_registration.tools.some((tool) => tool.name === "comath.agent.health"), true);
assert.equal(extension.runtime_registration.tools.some((tool) => tool.name === "comath.agent.logs"), true);
assert.equal(extension.runtime_registration.tools.some((tool) => tool.name === "comath.agent.health"), true);

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
  actor: "phase42-pi"
});

assert.equal(fakePi.tools.has("comath.agent.logs"), true);
assert.equal(fakePi.tools.has("comath.agent.health"), true);
await fakePi.commands.get("cm:agent").handler(
  "logs --project-id PRJ-0001 --run-id ARUN-0001 --project-root D:/research/project --max-bytes 128",
  { ui: { notify: async () => undefined } }
);
assert.equal(runtimeCalls.at(-1).method, "GET");
assert.match(runtimeCalls.at(-1).path, /\/agent\/run\/ARUN-0001\/logs/);

await fakePi.commands.get("cm:agent").handler(
  `health reviewer --project-id PRJ-0001 --program ${JSON.stringify(process.execPath)} --adapter-arg D:/adapter/fixture.mjs --project-root D:/research/project`,
  {
    ui: {
      confirm: async () => true,
      notify: async () => undefined
    }
  }
);
assert.equal(runtimeCalls.at(-1).method, "POST");
assert.equal(runtimeCalls.at(-1).path, "/agent/adapter/health");
assert.equal(runtimeCalls.at(-1).body.profile_id, "reviewer");
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

console.log("Phase 42 Pi agent observability tool tests passed.");
