import assert from "node:assert/strict";
import registerComathPiRuntime, {
  runComathResearchCommand
} from "../dist/index.js";

function createLoopClient() {
  const calls = [];
  const campaignBase = {
    campaign_id: "CAM-0001",
    project_id: "PRJ-0001",
    status: "running",
    current_stage: "problem_locked",
    blockers: [],
    next_actions: ["tick campaign"]
  };
  return {
    calls,
    client: {
      get: async (path) => {
        calls.push({ method: "GET", path });
        if (path.includes("/claim/list")) {
          return { claims: [] };
        }
        if (path.includes("/evidence/list")) {
          return { evidence: [] };
        }
        if (path.includes("/gate/list")) {
          return { gate_results: [] };
        }
        return { ok: true, path };
      },
      post: async (path, body) => {
        calls.push({ method: "POST", path, body });
        if (path === "/campaign/start") {
          return {
            campaign: campaignBase,
            obligation: {
              obligation_id: "PO-0001",
              statement: body.user_goal
            }
          };
        }
        return {
          campaign: {
            ...campaignBase,
            current_stage: "completed_formal_proof",
            status: "terminal"
          }
        };
      }
    }
  };
}

function createFakePi() {
  const tools = new Map();
  const commands = new Map();
  return {
    tools,
    commands,
    api: {
      registerTool(tool) {
        tools.set(tool.name, tool);
      },
      registerCommand(name, options) {
        commands.set(name, options);
      },
      on() {
        // no resources needed for this command-routing test
      }
    }
  };
}

const goalFlagHarness = createLoopClient();
await runComathResearchCommand(
  goalFlagHarness.client,
  "/cm:research --goal \"n + 0 = n\" --strict",
  {
    project_root: "D:/research/project",
    project_name: "Pi Goal UX",
    actor: "phase66-pi",
    confirmation_id: "CONF-GOAL",
    max_ticks: 0
  }
);
assert.equal(goalFlagHarness.calls[0].path, "/campaign/start");
assert.equal(goalFlagHarness.calls[0].body.user_goal, "n + 0 = n");
assert.equal(goalFlagHarness.calls[0].body.strict_mode, true);

const runtimeCalls = [];
const fakePi = createFakePi();
registerComathPiRuntime(fakePi.api, {
  actor: "phase66-pi",
  project_root: "D:/research/project",
  client: {
    get: async (path) => {
      runtimeCalls.push({ method: "GET", path });
      return { ok: true, path };
    },
    post: async (path, body) => {
      runtimeCalls.push({ method: "POST", path, body });
      return { ok: true, path, body };
    }
  }
});

const confirmedCtx = {
  ui: {
    confirm: async () => true,
    notify: async () => undefined
  }
};

await fakePi.commands.get("cm:campaign").handler(
  "final-audit CAM-0001 --project-root D:/research/project --actor phase66-pi",
  confirmedCtx
);
assert.equal(runtimeCalls.at(-1).method, "POST");
assert.equal(runtimeCalls.at(-1).path, "/campaign/CAM-0001/final-audit");
assert.equal(runtimeCalls.at(-1).body.actor, "phase66-pi");

await fakePi.commands.get("cm:campaign").handler(
  "replay CAM-0001 --project-root D:/research/project --actor phase66-pi",
  confirmedCtx
);
assert.equal(runtimeCalls.at(-1).method, "POST");
assert.equal(runtimeCalls.at(-1).path, "/campaign/CAM-0001/replay");
assert.equal(runtimeCalls.at(-1).body.actor, "phase66-pi");

console.log("Phase 66 Pi goal-compatible campaign UX tests passed.");
