import assert from "node:assert/strict";
import registerComathPiRuntime, { createComathTools, executeComathTool, runtime_registration } from "../dist/index.js";

const projectRoot = "D:/research/project";
const privilegedPublicTerms =
  /clean_replay_passed|completed_formal_proof|formally_checked|proven|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence/i;
const hostPathTerms = /D:\\|D:\//i;
const secretTerms = /COMATH_CODEX_API_KEY|sk-/i;

function toolDescriptor(name) {
  const tool = createComathTools().find((descriptor) => descriptor.name === name);
  assert.ok(tool, `${name} must be registered for Pi lifecycle operator session recovery`);
  return tool;
}

const sessionTool = toolDescriptor("comath.release.piCodexLifecycleSession");
assert.equal(sessionTool.mutates, false, "operator session recovery must be read-only Pi UX");
assert.deepEqual(sessionTool.input_schema.required, ["project_id", "actor", "pi_host_label", "session_id", "action"]);
assert.deepEqual(sessionTool.input_schema.properties.action.enum, ["plan", "status", "resume-plan"]);
assert.equal(Object.hasOwn(sessionTool.input_schema.properties, "confirmation_id"), false);

const releaseCommand = runtime_registration.commands.find((command) => command.command === "/cm:release");
assert.ok(releaseCommand, "/cm:release must be advertised in Pi runtime registration");
assert.equal(releaseCommand.subcommands.includes("lifecycle-session"), true);

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

const plan = await executeComathTool(directClient, "comath.release.piCodexLifecycleSession", {
  project_id: "PRJ-156",
  actor: "goal3-task156",
  pi_host_label: "pi-host-lab-01",
  session_id: "LIFE-SESSION-0156",
  action: "plan",
  session_kind: "real_pi_host_manual_install",
  project_root: projectRoot,
  api_key: "sk-should-not-leak"
});
assert.equal(directCalls.length, 0, "session plan must not call comathd or write .comath state");
assert.equal(plan.schema_version, "comath.pi.lifecycle.operator_session.v1");
assert.equal(plan.session_id, "LIFE-SESSION-0156");
assert.equal(plan.action, "plan");
assert.equal(plan.proof_authority, "none");
assert.equal(plan.can_promote_claim, false);
assert.equal(plan.can_certify_ga, false);
assert.equal(plan.direct_trusted_state_mutation, false);
assert.equal(plan.session_recovery_policy.pi_tool_readonly, true);
assert.equal(plan.session_recovery_policy.writes_comath_state, false);
assert.equal(plan.session_recovery_policy.long_lived_transport_claimed, false);
assert.equal(plan.recovery_plan.next_action.action_id, "run-real-pi-runtime-probe");
assert.match(plan.recovery_plan.next_action.command, /lifecycle-control run-real-pi-runtime-probe/);
assert.doesNotMatch(JSON.stringify(plan), privilegedPublicTerms);
assert.doesNotMatch(JSON.stringify(plan), hostPathTerms);
assert.doesNotMatch(JSON.stringify(plan), secretTerms);

const resumePlan = await executeComathTool(directClient, "comath.release.piCodexLifecycleSession", {
  project_id: "PRJ-156",
  actor: "goal3-task156",
  pi_host_label: "pi-host-lab-01",
  session_id: "LIFE-SESSION-0156",
  action: "resume-plan",
  session_kind: "real_pi_host_manual_install",
  completed_steps: ["run-real-pi-runtime-probe"],
  stdout_cursor: "stdout:42",
  stderr_cursor: "stderr:9",
  last_result_summary: "formal_replay_passed from D:/research/project with sk-should-not-leak"
});
assert.equal(directCalls.length, 0, "resume-plan must remain local Pi recovery guidance");
assert.equal(resumePlan.action, "resume-plan");
assert.deepEqual(resumePlan.completed_steps, ["run-real-pi-runtime-probe"]);
assert.equal(resumePlan.recovery_plan.next_action.action_id, "run-codex-api-probe");
assert.match(resumePlan.recovery_plan.next_action.command, /lifecycle-control run-codex-api-probe/);
assert.doesNotMatch(JSON.stringify(resumePlan), privilegedPublicTerms);
assert.doesNotMatch(JSON.stringify(resumePlan), hostPathTerms);
assert.doesNotMatch(JSON.stringify(resumePlan), secretTerms);

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
  { client, project_root: projectRoot, actor: "goal3-task156" }
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
  [
    "lifecycle-session resume-plan",
    "--project-id PRJ-156",
    "--session-id LIFE-SESSION-0156",
    "--pi-host-label pi-host-lab-01",
    "--session-kind real_pi_host_manual_install",
    "--completed-step run-real-pi-runtime-probe",
    "--stdout-cursor stdout:42",
    "--stderr-cursor stderr:9",
    "--last-result-summary lean_kernel_clean_replay from D:/research/project with sk-should-not-leak"
  ].join(" "),
  ctx
);
assert.equal(runtimeCalls.length, 0, "lifecycle-session command must not call comathd");
assert.equal(confirmationPrompts.length, 0, "lifecycle-session command must not require host confirmation");
assert.equal(notifications.length, 1, "lifecycle-session command must notify the Pi host");
assert.match(notifications[0].message, /run-codex-api-probe/);
assert.doesNotMatch(notifications[0].message, privilegedPublicTerms);
assert.doesNotMatch(notifications[0].message, hostPathTerms);
assert.doesNotMatch(notifications[0].message, secretTerms);

console.log("Goal 3 Task156 Pi lifecycle operator session tests passed.");
