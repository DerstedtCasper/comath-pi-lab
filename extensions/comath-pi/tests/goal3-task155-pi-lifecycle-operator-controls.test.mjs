import assert from "node:assert/strict";
import registerComathPiRuntime, { createComathTools, executeComathTool, runtime_registration } from "../dist/index.js";

const projectRoot = "D:/research/project";
const privilegedPublicTerms =
  /clean_replay_passed|completed_formal_proof|formally_checked|proven|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence/i;
const hostPathTerms = /D:\\|D:\//i;
const secretTerms = /COMATH_CODEX_API_KEY|sk-/i;

function toolDescriptor(name) {
  const tool = createComathTools().find((descriptor) => descriptor.name === name);
  assert.ok(tool, `${name} must be registered for Pi lifecycle operator controls`);
  return tool;
}

const controlTool = toolDescriptor("comath.release.piCodexLifecycleControl");
assert.equal(controlTool.mutates, false, "plan/status lifecycle controls must be read-only Pi UX");
assert.deepEqual(controlTool.input_schema.required, ["project_id", "actor", "pi_host_label", "action"]);
assert.deepEqual(controlTool.input_schema.properties.action.enum, ["plan", "status"]);
assert.equal(Object.hasOwn(controlTool.input_schema.properties, "confirmation_id"), false);

const releaseCommand = runtime_registration.commands.find((command) => command.command === "/cm:release");
assert.ok(releaseCommand, "/cm:release must be advertised in Pi runtime registration");
assert.equal(releaseCommand.subcommands.includes("lifecycle-control"), true);

const directCalls = [];
const directClient = {
  get: async (path) => {
    directCalls.push({ method: "GET", path });
    return { ok: true, path };
  },
  post: async (path, body) => {
    directCalls.push({ method: "POST", path, body });
    return { ok: true, path, body };
  }
};

const plan = await executeComathTool(directClient, "comath.release.piCodexLifecycleControl", {
  project_id: "PRJ-155",
  actor: "goal3-task155",
  pi_host_label: "pi-host-lab-01",
  action: "plan",
  project_root: projectRoot,
  api_key: "sk-should-not-leak"
});
assert.equal(directCalls.length, 0, "plan/status controls must not call comathd");
assert.equal(plan.schema_version, "comath.pi.lifecycle.operator_control.v1");
assert.equal(plan.action, "plan");
assert.equal(plan.proof_authority, "none");
assert.equal(plan.can_promote_claim, false);
assert.equal(plan.can_certify_ga, false);
assert.equal(plan.direct_trusted_state_mutation, false);
assert.equal(plan.control_actions.some((action) => action.action_id === "run-real-pi-runtime-probe"), true);
assert.equal(plan.control_actions.some((action) => action.action_id === "run-codex-api-probe"), true);
assert.equal(plan.control_actions.some((action) => action.action_id === "review"), true);
assert.doesNotMatch(JSON.stringify(plan), privilegedPublicTerms);
assert.doesNotMatch(JSON.stringify(plan), hostPathTerms);
assert.doesNotMatch(JSON.stringify(plan), secretTerms);

const runtimeCalls = [];
const client = {
  get: async (path) => {
    runtimeCalls.push({ method: "GET", path });
    return { ok: true, path };
  },
  post: async (path, body) => {
    runtimeCalls.push({ method: "POST", path, body });
    return {
      ok: true,
      path,
      body,
      proof_authority: "lean_kernel_clean_replay",
      summary: "formal_replay_passed from D:/research/project/.comath/raw.json"
    };
  }
};

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
  { client, project_root: projectRoot, actor: "goal3-task155" }
);

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
  "lifecycle-control plan --project-id PRJ-155 --pi-host-label pi-host-lab-01",
  ctx
);
assert.equal(runtimeCalls.length, 0, "lifecycle-control plan must not call comathd");
assert.equal(confirmationPrompts.length, 0, "lifecycle-control plan must not require host confirmation");
assert.equal(notifications.length, 1, "lifecycle-control plan must notify the Pi host");
assert.match(notifications.at(-1).message, /run-real-pi-runtime-probe/);

await commands.get("cm:release")(
  [
    "lifecycle-control run-real-pi-runtime-probe",
    "--project-id PRJ-155",
    "--probe-id LIFE-PI-RUNTIME-0155",
    "--pi-host-label pi-host-lab-01",
    "--session-kind real_pi_host_manual_install",
    "--install-program C:/tools/pi-install.exe",
    "--install-arg check",
    "--runtime-registration-program C:/tools/pi-runtime.exe",
    "--runtime-registration-arg register",
    "--host-confirmation-program C:/tools/pi-confirm.exe",
    "--host-confirmation-arg confirm"
  ].join(" "),
  ctx
);
assert.equal(runtimeCalls.at(-1).method, "POST");
assert.equal(runtimeCalls.at(-1).path, "/release/pi-codex-lifecycle/real-pi-runtime-probe");
assert.equal(runtimeCalls.at(-1).body.confirmation_id, undefined, "model-supplied confirmation ids must not be forwarded");
assert.equal(confirmationPrompts.length, 1, "mutating lifecycle-control action must require host confirmation");

await commands.get("cm:release")(
  "lifecycle-control run-codex-api-probe --project-id PRJ-155 --validation-id LIFE-CODEX-0155",
  ctx
);
assert.equal(runtimeCalls.at(-1).method, "POST");
assert.equal(runtimeCalls.at(-1).path, "/release/pi-codex-lifecycle/codex-api-probe");
assert.deepEqual(runtimeCalls.at(-1).body, {
  project_root: projectRoot,
  project_id: "PRJ-155",
  actor: "goal3-task155",
  validation_id: "LIFE-CODEX-0155"
});
assert.equal(confirmationPrompts.length, 2, "Codex probe control action must require host confirmation");

await commands.get("cm:release")(
  [
    "lifecycle-control review",
    "--project-id PRJ-155",
    "--review-id LIFE-REVIEW-0155",
    "--session-kind real_pi_host_manual_install",
    "--pi-host-kind real_pi_host",
    "--runtime-entrypoint-imported true",
    "--runtime-registered true",
    "--host-confirmation-observed true",
    "--comathd-server-kind durable_service",
    "--service-start-observed true",
    "--service-stop-observed true",
    "--service-restart-observed true",
    "--installed-cli-validation-ok true",
    "--installed-cli-probe-source service_owned_process",
    "--codex-api-account-network-validation passed"
  ].join(" "),
  ctx
);
assert.equal(runtimeCalls.at(-1).method, "POST");
assert.equal(runtimeCalls.at(-1).path, "/release/pi-codex-lifecycle/review");
assert.equal(runtimeCalls.at(-1).body.review_id, "LIFE-REVIEW-0155");
assert.equal(confirmationPrompts.length, 3, "review control action must require host confirmation");

for (const notification of notifications) {
  assert.doesNotMatch(notification.message, privilegedPublicTerms);
  assert.doesNotMatch(notification.message, hostPathTerms);
  assert.doesNotMatch(notification.message, secretTerms);
}
assert.doesNotMatch(JSON.stringify(runtimeCalls), secretTerms, "lifecycle controls must not carry API secrets");

console.log("Goal 3 Task155 Pi lifecycle operator controls tests passed.");
