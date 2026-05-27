import assert from "node:assert/strict";
import {
  createComathPiExtension,
  createComathTools,
  executeComathTool,
  runtime_registration
} from "../dist/index.js";

const tools = createComathTools();
const byName = new Map(tools.map((tool) => [tool.name, tool]));

const expectedAgentTools = [
  ["comath.agent.profileList", false, ["global_rpm"]],
  ["comath.agent.profileGet", false, ["profile_id"]],
  ["comath.agent.runForProfile", true, ["project_root", "project_id", "workstream_id", "profile_id", "actor"]],
  [
    "comath.agent.prepareLaunch",
    true,
    ["project_root", "project_id", "run_id", "profile_id", "program", "goal", "context_path", "actor"]
  ]
];

for (const [name, mutates, required] of expectedAgentTools) {
  const tool = byName.get(name);
  assert.ok(tool, `${name} is registered`);
  assert.equal(tool.mutates, mutates, `${name} mutation flag`);
  assert.deepEqual(tool.input_schema.required, mutates ? [...required, "confirmation_id"] : required);
}

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

await executeComathTool(client, "comath.agent.profileList", { global_rpm: 4 });
assert.deepEqual(calls.at(-1), { method: "GET", path: "/agent/profile/list?global_rpm=4" });

await executeComathTool(client, "comath.agent.profileGet", { profile_id: "formalization" });
assert.deepEqual(calls.at(-1), { method: "GET", path: "/agent/profile/formalization" });

await assert.rejects(
  () =>
    executeComathTool(client, "comath.agent.runForProfile", {
      project_root: "D:/research/project",
      project_id: "PRJ-0001",
      workstream_id: "WS-0001",
      profile_id: "formalization",
      actor: "phase30-pi"
    }),
  /confirmed mutation permission is required/
);

await executeComathTool(client, "comath.agent.runForProfile", {
  project_root: "D:/research/project",
  project_id: "PRJ-0001",
  campaign_id: "CAM-0001",
  workstream_id: "WS-0001",
  profile_id: "formalization",
  actor: "phase30-pi",
  confirmation_id: "CONF-RUN"
});
assert.deepEqual(calls.at(-1), {
  method: "POST",
  path: "/agent/run/profile",
  body: {
    project_root: "D:/research/project",
    project_id: "PRJ-0001",
    campaign_id: "CAM-0001",
    workstream_id: "WS-0001",
    profile_id: "formalization",
    actor: "phase30-pi"
  }
});

await executeComathTool(client, "comath.agent.prepareLaunch", {
  project_root: "D:/research/project",
  project_id: "PRJ-0001",
  run_id: "ARUN-0001",
  profile_id: "formalization",
  program: process.execPath,
  goal: "Write a scoped Lean skeleton.",
  context_path: ".comath/workstreams/WS-0001/spec.yaml",
  actor: "phase30-pi",
  confirmation_id: "CONF-LAUNCH"
});
assert.deepEqual(calls.at(-1), {
  method: "POST",
  path: "/agent/run/profile/prepare-launch",
  body: {
    project_root: "D:/research/project",
    project_id: "PRJ-0001",
    run_id: "ARUN-0001",
    profile_id: "formalization",
    program: process.execPath,
    goal: "Write a scoped Lean skeleton.",
    context_path: ".comath/workstreams/WS-0001/spec.yaml",
    actor: "phase30-pi"
  }
});

const extension = createComathPiExtension({ client });
assert.equal(extension.commands.includes("/cm:agent"), true);
assert.equal(runtime_registration.commands.some((command) => command.command === "/cm:agent"), true);
assert.equal(runtime_registration.tools.some((tool) => tool.name === "comath.agent.runForProfile"), true);

const fakePi = createFakePi();
const runtimeCalls = [];
extension.runtime_registration.tools
  .filter((tool) => tool.name.startsWith("comath.agent."))
  .forEach((tool) => {
    assert.equal(tool.mutates ? tool.requires_confirmation : !tool.requires_confirmation, true);
  });

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
  actor: "phase30-pi"
});

assert.equal(fakePi.commands.has("cm:agent"), true);
assert.equal(fakePi.tools.has("comath.agent.profileList"), true);
assert.equal(fakePi.tools.has("comath.agent.runForProfile"), true);

await fakePi.commands.get("cm:agent").handler("profiles", { ui: { notify: async () => undefined } });
assert.deepEqual(runtimeCalls.at(-1), { method: "GET", path: "/agent/profile/list?global_rpm=4" });

await fakePi.commands.get("cm:agent").handler("profile proof-route", { ui: { notify: async () => undefined } });
assert.deepEqual(runtimeCalls.at(-1), { method: "GET", path: "/agent/profile/proof-route" });

await fakePi.commands.get("cm:agent").handler(
  "run formalization --project-id PRJ-0001 --workstream-id WS-0001 --campaign-id CAM-0001",
  {
    ui: {
      confirm: async () => true,
      notify: async () => undefined
    }
  }
);
assert.equal(runtimeCalls.at(-1).method, "POST");
assert.equal(runtimeCalls.at(-1).path, "/agent/run/profile");
assert.equal(runtimeCalls.at(-1).body.project_root, "D:/research/project");
assert.equal(runtimeCalls.at(-1).body.profile_id, "formalization");

await assert.rejects(
  () => fakePi.commands.get("cm:agent").handler("run formalization --project-id PRJ-0001", { ui: {} }),
  /workstream_id is required/
);

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

console.log("Phase 30 Pi agent profile tool tests passed.");
