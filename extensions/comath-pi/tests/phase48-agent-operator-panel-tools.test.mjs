import assert from "node:assert/strict";
import { createComathTools, executeComathTool, runtime_registration } from "../dist/index.js";

const tools = createComathTools();
const panelTool = tools.find((tool) => tool.name === "comath.agent.operatorPanel");
assert.ok(panelTool, "comath.agent.operatorPanel is registered");
assert.equal(panelTool.mutates, false);
assert.deepEqual(panelTool.input_schema.required, ["project_root", "project_id", "run_id"]);
assert.equal(panelTool.input_schema.properties.stdout_cursor.type, "number");

const calls = [];
const client = {
  get: async (path) => {
    calls.push({ method: "GET", path });
    return {
      panel: {
        proof_authority: "none",
        actions: {
          read_logs: { enabled: true },
          stream_logs: { enabled: true },
          subscribe_logs: { enabled: true },
          cancel: { enabled: false, reason: "terminal AgentRun cannot be cancelled" }
        }
      }
    };
  },
  getText: async () => {
    throw new Error("operatorPanel must use JSON GET, not text GET");
  },
  post: async () => {
    throw new Error("operatorPanel must not use POST");
  }
};

const result = await executeComathTool(client, "comath.agent.operatorPanel", {
  project_root: "D:/research/project",
  project_id: "PRJ-0001",
  run_id: "ARUN-0001",
  stdout_cursor: 12,
  stderr_cursor: 5,
  max_bytes: 4096,
  actor: "phase48-pi"
});
assert.equal(result.panel.proof_authority, "none");
assert.equal(calls.at(-1).method, "GET");
assert.equal(
  calls.at(-1).path,
  "/agent/run/ARUN-0001/operator-panel?project_root=D%3A%2Fresearch%2Fproject&project_id=PRJ-0001&stdout_cursor=12&stderr_cursor=5&max_bytes=4096&actor=phase48-pi"
);

assert.equal(runtime_registration.tools.some((tool) => tool.name === "comath.agent.operatorPanel"), true);

const fakePi = createFakePi();
const runtimeCalls = [];
const notifications = [];
const module = await import("../dist/index.js");
module.default(fakePi.api, {
  client: {
    get: async (path) => {
      runtimeCalls.push({ method: "GET", path });
      return {
        panel: {
          proof_authority: "none",
          run: { id: "ARUN-0001", status: "succeeded" },
          actions: { cancel: { enabled: false, reason: "terminal AgentRun cannot be cancelled" } }
        }
      };
    },
    getText: async () => {
      throw new Error("operator panel command must not use text GET");
    },
    post: async () => {
      throw new Error("operator panel command must not use POST");
    }
  },
  project_root: "D:/research/project",
  actor: "phase48-pi"
});

assert.equal(fakePi.tools.has("comath.agent.operatorPanel"), true);
await fakePi.commands.get("cm:agent").handler(
  "panel --project-id PRJ-0001 --run-id ARUN-0001 --stdout-cursor 12 --stderr-cursor 5 --max-bytes 4096 --project-root D:/research/project --actor phase48-pi",
  { ui: { notify: async (message, level) => notifications.push({ message, level }) } }
);
assert.equal(runtimeCalls.at(-1).method, "GET");
assert.match(runtimeCalls.at(-1).path, /\/agent\/run\/ARUN-0001\/operator-panel/);
assert.match(notifications.at(-1).message, /operator|proof_authority|cancel/i);

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

console.log("Phase 48 Pi agent operator panel tool tests passed.");
