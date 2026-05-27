import assert from "node:assert/strict";
import { createComathClient, createComathTools, executeComathTool, runtime_registration } from "../dist/index.js";

const tools = createComathTools();
const subscribeTool = tools.find((tool) => tool.name === "comath.agent.subscribeLogs");
assert.ok(subscribeTool, "comath.agent.subscribeLogs is registered");
assert.equal(subscribeTool.mutates, false);
assert.deepEqual(subscribeTool.input_schema.required, ["project_root", "project_id", "run_id"]);
assert.equal(subscribeTool.input_schema.properties.retry_ms.type, "number");

const calls = [];
const client = {
  get: async () => {
    throw new Error("subscribeLogs must use text GET, not JSON GET");
  },
  getText: async (path) => {
    calls.push({ method: "GET_TEXT", path });
    return {
      ok: true,
      content_type: "text/event-stream; charset=utf-8",
      body: 'event: agent_run.log_chunk\ndata: {"proof_authority":"none","next_cursor":{"stdout":17,"stderr":5}}\n\n'
    };
  },
  post: async () => {
    throw new Error("subscribeLogs must not use POST");
  }
};

const result = await executeComathTool(client, "comath.agent.subscribeLogs", {
  project_root: "D:/research/project",
  project_id: "PRJ-0001",
  run_id: "ARUN-0001",
  stdout_cursor: 12,
  stderr_cursor: 5,
  max_bytes: 4096,
  retry_ms: 750,
  actor: "phase47-pi"
});
assert.equal(result.content_type, "text/event-stream; charset=utf-8");
assert.equal(calls.at(-1).method, "GET_TEXT");
assert.equal(
  calls.at(-1).path,
  "/agent/run/ARUN-0001/log-subscription?project_root=D%3A%2Fresearch%2Fproject&project_id=PRJ-0001&stdout_cursor=12&stderr_cursor=5&max_bytes=4096&retry_ms=750&actor=phase47-pi"
);

const fetchCalls = [];
const fetchClient = createComathClient({
  baseUrl: "http://127.0.0.1:17345",
  fetch: async (url, init) => {
    fetchCalls.push({ url, init });
    return {
      ok: true,
      status: 200,
      headers: { get: (name) => (name.toLowerCase() === "content-type" ? "text/event-stream; charset=utf-8" : null) },
      json: async () => ({ wrong: true }),
      text: async () => "event: agent_run.log_chunk\ndata: {}\n\n"
    };
  }
});
const textResponse = await fetchClient.getText("/agent/run/ARUN-0001/log-subscription?project_root=x&project_id=PRJ-0001");
assert.equal(textResponse.body.startsWith("event: agent_run.log_chunk"), true);
assert.equal(fetchCalls.at(-1).init.headers.accept, "text/event-stream");

assert.equal(runtime_registration.tools.some((tool) => tool.name === "comath.agent.subscribeLogs"), true);

const fakePi = createFakePi();
const runtimeCalls = [];
const notifications = [];
const module = await import("../dist/index.js");
module.default(fakePi.api, {
  client: {
    get: async () => {
      throw new Error("subscribe command must not use JSON GET");
    },
    getText: async (path) => {
      runtimeCalls.push({ method: "GET_TEXT", path });
      return {
        content_type: "text/event-stream; charset=utf-8",
        body: 'event: agent_run.log_chunk\ndata: {"proof_authority":"none","next_cursor":{"stdout":17,"stderr":5}}\n\n'
      };
    },
    post: async () => {
      throw new Error("subscribe command must not use POST");
    }
  },
  project_root: "D:/research/project",
  actor: "phase47-pi"
});

assert.equal(fakePi.tools.has("comath.agent.subscribeLogs"), true);
await fakePi.commands.get("cm:agent").handler(
  "subscribe-logs --project-id PRJ-0001 --run-id ARUN-0001 --stdout-cursor 12 --stderr-cursor 5 --max-bytes 4096 --retry-ms 750 --project-root D:/research/project --actor phase47-pi",
  { ui: { notify: async (message, level) => notifications.push({ message, level }) } }
);
assert.equal(runtimeCalls.at(-1).method, "GET_TEXT");
assert.match(runtimeCalls.at(-1).path, /\/agent\/run\/ARUN-0001\/log-subscription/);
assert.match(notifications.at(-1).message, /text\/event-stream/);
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

console.log("Phase 47 Pi agent log subscription tool tests passed.");
