import assert from "node:assert/strict";
import registerComathPiRuntime, { createComathTools, executeComathTool, runtime_registration } from "../dist/index.js";

const projectRoot = "D:/research/project";
const privilegedPublicTerms =
  /clean_replay_passed|completed_formal_proof|formally_checked|proven|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence/i;
const hostPathTerms = /D:\\|D:\//i;

function toolDescriptor(name) {
  const tool = createComathTools().find((descriptor) => descriptor.name === name);
  assert.ok(tool, `${name} must be registered for the Pi-facing Codex API lifecycle probe`);
  return tool;
}

const probeTool = toolDescriptor("comath.release.piCodexApiProbe");
assert.equal(probeTool.mutates, true, "Codex API lifecycle probing writes service-owned release evidence");
assert.deepEqual(probeTool.input_schema.required, ["project_root", "project_id", "actor", "confirmation_id"]);
assert.equal(probeTool.input_schema.properties.validation_id.type, "string");

const releaseCommand = runtime_registration.commands.find((command) => command.command === "/cm:release");
assert.ok(releaseCommand, "/cm:release must be advertised in Pi runtime registration");
assert.equal(releaseCommand.subcommands.includes("codex-api-probe"), true);

const calls = [];
const client = {
  get: async (path) => {
    calls.push({ method: "GET", path });
    return { ok: true, path };
  },
  post: async (path, body) => {
    calls.push({ method: "POST", path, body });
    return {
      ok: true,
      path,
      body,
      probe: {
        proof_authority: "lean_kernel_clean_replay",
        validation_status: "formal_replay_passed",
        summary: "clean_replay_passed from D:/research/project/.comath/release/pi-codex-lifecycle/raw.json"
      }
    };
  }
};

await executeComathTool(client, "comath.release.piCodexApiProbe", {
  project_root: projectRoot,
  project_id: "PRJ-151",
  actor: "goal3-task151",
  validation_id: "LIFE-CODEX-0151",
  confirmation_id: "CONF-TASK151-CODEX-PROBE"
});
assert.deepEqual(calls.at(-1), {
  method: "POST",
  path: "/release/pi-codex-lifecycle/codex-api-probe",
  body: {
    project_root: projectRoot,
    project_id: "PRJ-151",
    actor: "goal3-task151",
    validation_id: "LIFE-CODEX-0151"
  }
});

const commands = new Map();
const notifications = [];
const confirmationPrompts = [];
registerComathPiRuntime(
  {
    registerTool() {},
    registerCommand(name, options) {
      commands.set(name, options.handler);
    },
    on() {}
  },
  { client, project_root: projectRoot, actor: "goal3-task151" }
);

assert.equal(commands.has("cm:release"), true, "Pi runtime must expose /cm:release for Codex API lifecycle probing");
const ctx = {
  ui: {
    confirm: async (title, body) => {
      confirmationPrompts.push({ title, body });
      return true;
    },
    notify: async (message, level) => {
      notifications.push({ message, level });
    }
  }
};

await commands.get("cm:release")(
  "codex-api-probe --project-id PRJ-151 --validation-id LIFE-CODEX-0151",
  ctx
);
assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/release/pi-codex-lifecycle/codex-api-probe");
assert.deepEqual(calls.at(-1).body, {
  project_root: projectRoot,
  project_id: "PRJ-151",
  actor: "goal3-task151",
  validation_id: "LIFE-CODEX-0151"
});
assert.equal(confirmationPrompts.length, 1, "Codex API lifecycle probe command must require Pi host confirmation");
assert.equal(notifications.length, 1, "Codex API lifecycle probe command must notify the Pi host");
assert.doesNotMatch(notifications[0].message, privilegedPublicTerms, "Pi probe notifications must sanitize proof-authority vocabulary");
assert.doesNotMatch(notifications[0].message, hostPathTerms, "Pi probe notifications must sanitize host path echoes");
assert.doesNotMatch(
  JSON.stringify(calls.at(-1).body),
  /COMATH_CODEX_API_KEY|sk-/i,
  "Pi probe request must not carry API credentials; service-owned env/config supplies them"
);

console.log("Goal 3 Task151 Pi/Codex API probe consumer tests passed.");
