import assert from "node:assert/strict";
import registerComathPiRuntime, { createComathTools, executeComathTool, runtime_registration } from "../dist/index.js";

const projectRoot = "D:/research/project";
const privilegedPublicTerms =
  /clean_replay_passed|completed_formal_proof|formally_checked|proven|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence/i;
const hostPathTerms = /D:\\|D:\//i;

function toolDescriptor(name) {
  const tool = createComathTools().find((descriptor) => descriptor.name === name);
  assert.ok(tool, `${name} must be registered for the Pi-facing real-Pi runtime lifecycle probe`);
  return tool;
}

const probeTool = toolDescriptor("comath.release.piRealPiRuntimeProbe");
assert.equal(probeTool.mutates, true, "real-Pi runtime probing writes service-owned release evidence");
assert.deepEqual(probeTool.input_schema.required, [
  "project_root",
  "project_id",
  "actor",
  "pi_host_label",
  "session_kind",
  "commands",
  "confirmation_id"
]);
assert.equal(probeTool.input_schema.properties.probe_id.type, "string");
assert.deepEqual(probeTool.input_schema.properties.session_kind.enum, [
  "real_pi_host_manual_install",
  "real_pi_host_automated_install"
]);
assert.deepEqual(probeTool.input_schema.properties.pi_host_kind.enum, ["real_pi_host"]);
assert.deepEqual(probeTool.input_schema.properties.commands.required, [
  "install",
  "runtime_registration",
  "host_confirmation"
]);

const releaseCommand = runtime_registration.commands.find((command) => command.command === "/cm:release");
assert.ok(releaseCommand, "/cm:release must be advertised in Pi runtime registration");
assert.equal(releaseCommand.subcommands.includes("real-pi-runtime-probe"), true);

const directCommands = {
  install: { program: "C:/tools/pi-install.exe", args: ["check"], timeout_ms: 5000 },
  runtime_registration: { program: "C:/tools/pi-runtime.exe", args: ["register"], timeout_ms: 5000 },
  host_confirmation: { program: "C:/tools/pi-confirm.exe", args: ["confirm"], timeout_ms: 5000 }
};

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
        probe_status: "formal_replay_passed",
        summary: "clean_replay_passed from D:/research/project/.comath/release/pi-codex-lifecycle/raw.json"
      }
    };
  }
};

const directResult = await executeComathTool(client, "comath.release.piRealPiRuntimeProbe", {
  project_root: projectRoot,
  project_id: "PRJ-153",
  actor: "goal3-task153",
  probe_id: "LIFE-PI-RUNTIME-0153",
  pi_host_label: "pi-host-lab-01",
  pi_host_kind: "real_pi_host",
  session_kind: "real_pi_host_automated_install",
  timeout_ms: 5000,
  commands: directCommands,
  confirmation_id: "CONF-TASK153-REAL-PI-RUNTIME-PROBE"
});
assert.deepEqual(calls.at(-1), {
  method: "POST",
  path: "/release/pi-codex-lifecycle/real-pi-runtime-probe",
  body: {
    project_root: projectRoot,
    project_id: "PRJ-153",
    actor: "goal3-task153",
    probe_id: "LIFE-PI-RUNTIME-0153",
    pi_host_label: "pi-host-lab-01",
    pi_host_kind: "real_pi_host",
    session_kind: "real_pi_host_automated_install",
    timeout_ms: 5000,
    commands: directCommands
  }
});
assert.doesNotMatch(JSON.stringify(directResult), privilegedPublicTerms, "direct probe result must sanitize proof-authority vocabulary");
assert.doesNotMatch(JSON.stringify(directResult), hostPathTerms, "direct probe result must sanitize host path echoes");

const registeredTools = new Map();
const commands = new Map();
const notifications = [];
const confirmationPrompts = [];
registerComathPiRuntime(
  {
    registerTool(tool) {
      registeredTools.set(tool.name, tool);
    },
    registerCommand(name, options) {
      commands.set(name, options.handler);
    },
    on() {}
  },
  { client, project_root: projectRoot, actor: "goal3-task153" }
);

assert.equal(
  registeredTools.has("comath.release.piRealPiRuntimeProbe"),
  true,
  "Pi runtime must expose the real-Pi runtime probe as an executable tool"
);
assert.equal(commands.has("cm:release"), true, "Pi runtime must expose /cm:release for real-Pi runtime probing");
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
  [
    "real-pi-runtime-probe",
    "--project-id PRJ-153",
    "--probe-id LIFE-PI-RUNTIME-0153",
    "--pi-host-label pi-host-lab-01",
    "--session-kind real_pi_host_automated_install",
    "--timeout-ms 5000",
    "--install-program C:/tools/pi-install.exe",
    "--install-arg check",
    "--runtime-registration-program C:/tools/pi-runtime.exe",
    "--runtime-registration-arg register",
    "--host-confirmation-program C:/tools/pi-confirm.exe",
    "--host-confirmation-arg confirm"
  ].join(" "),
  ctx
);
assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/release/pi-codex-lifecycle/real-pi-runtime-probe");
assert.deepEqual(calls.at(-1).body, {
  project_root: projectRoot,
  project_id: "PRJ-153",
  actor: "goal3-task153",
  probe_id: "LIFE-PI-RUNTIME-0153",
  pi_host_label: "pi-host-lab-01",
  pi_host_kind: "real_pi_host",
  session_kind: "real_pi_host_automated_install",
  timeout_ms: 5000,
  commands: {
    install: { program: "C:/tools/pi-install.exe", args: ["check"] },
    runtime_registration: { program: "C:/tools/pi-runtime.exe", args: ["register"] },
    host_confirmation: { program: "C:/tools/pi-confirm.exe", args: ["confirm"] }
  }
});
assert.equal(confirmationPrompts.length, 1, "real-Pi runtime probe command must require Pi host confirmation");
assert.equal(notifications.length, 1, "real-Pi runtime probe command must notify the Pi host");
assert.doesNotMatch(notifications[0].message, privilegedPublicTerms, "Pi runtime probe notifications must sanitize proof-authority vocabulary");
assert.doesNotMatch(notifications[0].message, hostPathTerms, "Pi runtime probe notifications must sanitize host path echoes");
assert.doesNotMatch(
  JSON.stringify(calls.at(-1).body),
  /COMATH_CODEX_API_KEY|sk-/i,
  "Pi runtime probe request must not carry API credentials or secret material"
);

console.log("Goal 3 Task153 Pi real-Pi runtime probe consumer tests passed.");
