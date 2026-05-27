import assert from "node:assert/strict";
import { createComathPiExtension, createComathTools, executeComathTool, runtime_registration } from "../dist/index.js";

const tools = createComathTools();
const streamTool = tools.find((tool) => tool.name === "comath.agent.streamLogs");
assert.ok(streamTool, "comath.agent.streamLogs is registered");
assert.equal(streamTool.mutates, false);
assert.deepEqual(streamTool.input_schema.required, ["project_root", "project_id", "run_id"]);
assert.equal(streamTool.input_schema.properties.stdout_cursor.type, "number");
assert.equal(streamTool.input_schema.properties.stderr_cursor.type, "number");

const calls = [];
const client = {
  get: async (path) => {
    calls.push({ method: "GET", path });
    return { ok: true, path };
  },
  post: async () => {
    throw new Error("streamLogs must not use POST");
  }
};

await executeComathTool(client, "comath.agent.streamLogs", {
  project_root: "D:/research/project",
  project_id: "PRJ-0001",
  run_id: "ARUN-0001",
  stdout_cursor: 12,
  stderr_cursor: 5,
  max_bytes: 4096,
  actor: "phase46-pi"
});
assert.equal(calls.at(-1).method, "GET");
assert.equal(
  calls.at(-1).path,
  "/agent/run/ARUN-0001/log-stream?project_root=D%3A%2Fresearch%2Fproject&project_id=PRJ-0001&stdout_cursor=12&stderr_cursor=5&max_bytes=4096&actor=phase46-pi"
);

const extension = createComathPiExtension({ client });
assert.equal(runtime_registration.tools.some((tool) => tool.name === "comath.agent.streamLogs"), true);
assert.equal(extension.runtime_registration.tools.some((tool) => tool.name === "comath.agent.streamLogs"), true);

const fakePi = createFakePi();
const runtimeCalls = [];
const notifications = [];
const module = await import("../dist/index.js");
module.default(fakePi.api, {
  client: {
    get: async (path) => {
      runtimeCalls.push({ method: "GET", path });
      return {
        stream: {
          run_id: "ARUN-0001",
          proof_authority: "none",
          chunks: { stdout: "delta", stderr: "" },
          next_cursor: { stdout: 17, stderr: 5 },
          complete: false
        }
      };
    },
    post: async () => {
      throw new Error("stream command must not use POST");
    }
  },
  project_root: "D:/research/project",
  actor: "phase46-pi"
});

assert.equal(fakePi.tools.has("comath.agent.streamLogs"), true);
await fakePi.commands.get("cm:agent").handler(
  "stream --project-id PRJ-0001 --run-id ARUN-0001 --stdout-cursor 12 --stderr-cursor 5 --max-bytes 4096 --project-root D:/research/project --actor phase46-pi",
  { ui: { notify: async (message, level) => notifications.push({ message, level }) } }
);
assert.equal(runtimeCalls.at(-1).method, "GET");
assert.match(runtimeCalls.at(-1).path, /\/agent\/run\/ARUN-0001\/log-stream/);
assert.match(runtimeCalls.at(-1).path, /stdout_cursor=12/);
assert.match(notifications.at(-1).message, /proof_authority/);
assert.match(notifications.at(-1).message, /next_cursor/);

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

console.log("Phase 46 Pi agent log stream tool tests passed.");
