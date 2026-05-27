import assert from "node:assert/strict";
import { createComathTools, executeComathTool, runtime_registration } from "../dist/index.js";

const tools = createComathTools();
const sessionTool = tools.find((tool) => tool.name === "comath.agent.logSession");
assert.ok(sessionTool, "comath.agent.logSession is registered");
assert.equal(sessionTool.mutates, false);
assert.deepEqual(sessionTool.input_schema.required, ["project_root", "project_id", "run_id"]);
assert.equal(sessionTool.input_schema.properties.max_events.type, "number");

const calls = [];
const client = {
  get: async () => {
    throw new Error("logSession must use text GET, not JSON GET");
  },
  getText: async (path) => {
    calls.push({ method: "GET_TEXT", path });
    return {
      ok: true,
      content_type: "text/event-stream; charset=utf-8",
      body: [
        "retry: 500",
        "event: agent_run.log_chunk",
        'data: {"proof_authority":"none","next_cursor":{"stdout":17,"stderr":5}}',
        "",
        "event: agent_run.log_chunk",
        'data: {"proof_authority":"none","complete":true}',
        ""
      ].join("\n")
    };
  },
  post: async () => {
    throw new Error("logSession must not use POST");
  }
};

const result = await executeComathTool(client, "comath.agent.logSession", {
  project_root: "D:/research/project",
  project_id: "PRJ-0001",
  run_id: "ARUN-0001",
  stdout_cursor: 12,
  stderr_cursor: 5,
  max_bytes: 4096,
  max_events: 3,
  retry_ms: 750,
  actor: "phase50-pi"
});
assert.equal(result.content_type, "text/event-stream; charset=utf-8");
assert.equal(calls.at(-1).method, "GET_TEXT");
assert.equal(
  calls.at(-1).path,
  "/agent/run/ARUN-0001/log-session?project_root=D%3A%2Fresearch%2Fproject&project_id=PRJ-0001&stdout_cursor=12&stderr_cursor=5&max_bytes=4096&max_events=3&retry_ms=750&actor=phase50-pi"
);

assert.equal(runtime_registration.tools.some((tool) => tool.name === "comath.agent.logSession"), true);

const fakePi = createFakePi();
const runtimeCalls = [];
const notifications = [];
const module = await import("../dist/index.js");
module.default(fakePi.api, {
  client: {
    get: async () => {
      throw new Error("log-session command must not use JSON GET");
    },
    getText: async (path) => {
      runtimeCalls.push({ method: "GET_TEXT", path });
      return {
        content_type: "text/event-stream; charset=utf-8",
        body: "event: agent_run.log_chunk\ndata: {\"proof_authority\":\"none\"}\n\nevent: agent_run.log_chunk\ndata: {}\n\n"
      };
    },
    post: async () => {
      throw new Error("log-session command must not use POST");
    }
  },
  project_root: "D:/research/project",
  actor: "phase50-pi"
});

assert.equal(fakePi.tools.has("comath.agent.logSession"), true);
await fakePi.commands.get("cm:agent").handler(
  "log-session --project-id PRJ-0001 --run-id ARUN-0001 --stdout-cursor 12 --stderr-cursor 5 --max-bytes 4096 --max-events 3 --retry-ms 750 --project-root D:/research/project --actor phase50-pi",
  { ui: { notify: async (message, level) => notifications.push({ message, level }) } }
);
assert.equal(runtimeCalls.at(-1).method, "GET_TEXT");
assert.match(runtimeCalls.at(-1).path, /\/agent\/run\/ARUN-0001\/log-session/);
assert.match(notifications.at(-1).message, /agent_run\.log_chunk/);

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

console.log("Phase 50 Pi agent log session tool tests passed.");
