import assert from "node:assert/strict";
import registerComathPiRuntime, { createComathTools, executeComathTool, runtime_registration } from "../dist/index.js";

const projectRoot = "D:/research/project";
const privilegedPublicTerms =
  /clean_replay_passed|completed_formal_proof|formally_checked|proven|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence/i;
const hostPathTerms = /D:\\|D:\//i;
const secretTerms = /COMATH_CODEX_API_KEY|sk-/i;

function toolDescriptor(name) {
  const tool = createComathTools().find((descriptor) => descriptor.name === name);
  assert.ok(tool, `${name} must be registered for the Pi lifecycle operator walkthrough`);
  return tool;
}

const walkthroughTool = toolDescriptor("comath.release.piCodexLifecycleWalkthrough");
assert.equal(walkthroughTool.mutates, false, "operator walkthrough rendering must be read-only Pi UX");
assert.deepEqual(walkthroughTool.input_schema.required, ["project_id", "actor", "pi_host_label"]);
assert.equal(Object.hasOwn(walkthroughTool.input_schema.properties, "confirmation_id"), false);
assert.deepEqual(walkthroughTool.input_schema.properties.session_kind.enum, [
  "real_pi_host_manual_install",
  "real_pi_host_automated_install"
]);

const releaseCommand = runtime_registration.commands.find((command) => command.command === "/cm:release");
assert.ok(releaseCommand, "/cm:release must be advertised in Pi runtime registration");
assert.equal(releaseCommand.subcommands.includes("lifecycle-walkthrough"), true);

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

const directResult = await executeComathTool(client, "comath.release.piCodexLifecycleWalkthrough", {
  project_id: "PRJ-154",
  actor: "goal3-task154",
  pi_host_label: "pi-host-lab-01",
  session_kind: "real_pi_host_manual_install",
  probe_id: "LIFE-PI-RUNTIME-0154",
  validation_id: "LIFE-CODEX-0154",
  review_id: "LIFE-REVIEW-0154",
  project_root: projectRoot,
  install_program: "D:/secret/pi-install.exe",
  runtime_registration_program: "D:/secret/pi-runtime.exe",
  host_confirmation_program: "D:/secret/pi-confirm.exe",
  api_key: "sk-should-not-leak"
});
assert.equal(calls.length, 0, "walkthrough rendering must not call comathd or write release evidence");
assert.equal(directResult.schema_version, "comath.pi.lifecycle.operator_walkthrough.v1");
assert.equal(directResult.proof_authority, "none");
assert.equal(directResult.can_promote_claim, false);
assert.equal(directResult.can_certify_ga, false);
assert.equal(directResult.direct_trusted_state_mutation, false);
assert.equal(directResult.project_id, "PRJ-154");
assert.equal(directResult.pi_host_label, "pi-host-lab-01");
assert.equal(directResult.session_kind, "real_pi_host_manual_install");
assert.equal(directResult.command_templates.some((step) => step.subcommand === "real-pi-runtime-probe"), true);
assert.equal(directResult.command_templates.some((step) => step.subcommand === "codex-api-probe"), true);
assert.equal(directResult.command_templates.some((step) => step.subcommand === "pi-codex-lifecycle"), true);
assert.match(JSON.stringify(directResult), /<absolute-install-program>/);
assert.match(JSON.stringify(directResult), /<absolute-runtime-registration-program>/);
assert.match(JSON.stringify(directResult), /<absolute-host-confirmation-program>/);
assert.doesNotMatch(JSON.stringify(directResult), privilegedPublicTerms);
assert.doesNotMatch(JSON.stringify(directResult), hostPathTerms);
assert.doesNotMatch(JSON.stringify(directResult), secretTerms);

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
  { client, project_root: projectRoot, actor: "goal3-task154" }
);

assert.equal(
  registeredTools.has("comath.release.piCodexLifecycleWalkthrough"),
  true,
  "Pi runtime must expose the lifecycle walkthrough as an executable read-only tool"
);
assert.equal(commands.has("cm:release"), true, "Pi runtime must expose /cm:release for lifecycle walkthrough rendering");

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
    "lifecycle-walkthrough",
    "--project-id PRJ-154",
    "--pi-host-label pi-host-lab-01",
    "--session-kind real_pi_host_manual_install",
    "--probe-id LIFE-PI-RUNTIME-0154",
    "--validation-id LIFE-CODEX-0154",
    "--review-id LIFE-REVIEW-0154",
    "--install-program D:/secret/pi-install.exe",
    "--runtime-registration-program D:/secret/pi-runtime.exe",
    "--host-confirmation-program D:/secret/pi-confirm.exe"
  ].join(" "),
  ctx
);
assert.equal(calls.length, 0, "walkthrough command must not call comathd or write .comath state");
assert.equal(confirmationPrompts.length, 0, "read-only lifecycle walkthrough must not require host mutation confirmation");
assert.equal(notifications.length, 1, "lifecycle walkthrough command must notify the Pi host");
assert.doesNotMatch(notifications[0].message, privilegedPublicTerms);
assert.doesNotMatch(notifications[0].message, hostPathTerms);
assert.doesNotMatch(notifications[0].message, secretTerms);
assert.match(notifications[0].message, /real-pi-runtime-probe/);
assert.match(notifications[0].message, /codex-api-probe/);
assert.match(notifications[0].message, /pi-codex-lifecycle/);

console.log("Goal 3 Task154 Pi lifecycle operator walkthrough tests passed.");
