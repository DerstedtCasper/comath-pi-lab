import assert from "node:assert/strict";
import registerComathPiRuntime, { createComathTools, executeComathTool, runtime_registration } from "../dist/index.js";

const projectRoot = "D:/research/project";
const privilegedPublicTerms =
  /clean_replay_passed|completed_formal_proof|formally_checked|proven|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence/i;
const hostPathTerms = /D:\\|D:\//i;
const secretTerms = /COMATH_CODEX_API_KEY|OPENAI_API_KEY|Authorization:\s*Bearer|api_key|token=|plain-token|sk-/i;

function toolDescriptor(name) {
  const tool = createComathTools().find((descriptor) => descriptor.name === name);
  assert.ok(tool, `${name} must be registered for Pi operator-session persistence`);
  return tool;
}

const operatorSessionTool = toolDescriptor("comath.release.piCodexLifecycleOperatorSession");
assert.equal(operatorSessionTool.mutates, true, "operator-session persistence writes service-owned release evidence");
assert.deepEqual(operatorSessionTool.input_schema.required, [
  "project_root",
  "project_id",
  "actor",
  "session_id",
  "pi_host_label",
  "session_status",
  "confirmation_id"
]);
assert.deepEqual(operatorSessionTool.input_schema.properties.session_status.enum, [
  "recoverable_operator_session",
  "blocked_operator_session",
  "completed_operator_session"
]);
assert.deepEqual(operatorSessionTool.input_schema.properties.session_kind.enum, [
  "real_pi_host_manual_install",
  "real_pi_host_automated_install"
]);
assert.deepEqual(operatorSessionTool.input_schema.properties.completed_steps.items.enum, [
  "real_pi_install_runtime_probe",
  "durable_service_lifecycle_probe",
  "codex_api_account_network_probe",
  "lifecycle_evidence_intake",
  "readiness_review"
]);

const releaseCommand = runtime_registration.commands.find((command) => command.command === "/cm:release");
assert.ok(releaseCommand, "/cm:release must be advertised in Pi runtime registration");
assert.equal(releaseCommand.subcommands.includes("lifecycle-operator-session"), true);

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
      session: {
        schema_version: "comath.pi_codex_lifecycle_operator_session.v1",
        project_id: body.project_id,
        session_id: body.session_id,
        session_status: body.session_status,
        actor: "goal3-task158-route OPENAI_API_KEY=plain-token",
        pi_host_label: body.pi_host_label,
        session_manifest_path:
          ".comath/release/pi-codex-lifecycle/LIFE-OP-SESSION-0158/operator-session-manifest.json",
        proof_authority: "lean_kernel_clean_replay",
        can_promote_claim: true,
        can_certify_ga: true,
        durable_transport_provided: true,
        pi_direct_write_allowed: true,
        summary: "formal_replay_passed from D:/research/project with Authorization: Bearer plain-token"
      }
    };
  }
};

const directResult = await executeComathTool(client, "comath.release.piCodexLifecycleOperatorSession", {
  project_root: projectRoot,
  project_id: "PRJ-1580",
  actor: "goal3-task158 OPENAI_API_KEY=plain-token",
  session_id: "LIFE-OP-SESSION-0158",
  pi_host_label: "pi-host-lab-01",
  session_status: "recoverable_operator_session",
  session_kind: "real_pi_host_manual_install",
  operator_cursor: "stdout:42 Authorization: Bearer plain-token",
  completed_steps: ["real_pi_install_runtime_probe"],
  artifact_paths: [
    {
      kind: "runtime_registration_snapshot",
      path: ".comath/release/pi-codex-lifecycle/task158/runtime-registration.json"
    },
    {
      kind: "codex_validation_report",
      path: "D:/research/project/.comath/release/pi-codex-lifecycle/task158/OPENAI_API_KEY=plain-token.json"
    }
  ],
  last_result_summary: {
    summary: "lean_kernel_clean_replay from D:/research/project with sk-should-not-leak",
    api_key: "plain-token"
  },
  confirmation_id: "CONF-TASK158-OPERATOR-SESSION"
});

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/release/pi-codex-lifecycle/operator-session");
assert.deepEqual(calls.at(-1).body, {
  project_root: projectRoot,
  project_id: "PRJ-1580",
  actor: "goal3-task158 [redacted_secret]",
  session_id: "LIFE-OP-SESSION-0158",
  pi_host_label: "pi-host-lab-01",
  session_status: "recoverable_operator_session",
  session_kind: "real_pi_host_manual_install",
  operator_cursor: "stdout:42 [redacted_secret]",
  completed_steps: ["real_pi_install_runtime_probe"],
  artifact_paths: [
    {
      kind: "runtime_registration_snapshot",
      path: ".comath/release/pi-codex-lifecycle/task158/runtime-registration.json"
    },
    {
      kind: "codex_validation_report",
      path: "[redacted_host_path]"
    }
  ],
  last_result_summary: {
    summary: "unverified_formal_status from [redacted_host_path]",
    "[redacted_secret_key]": "[redacted_secret]"
  }
});
assert.equal(calls.at(-1).body.confirmation_id, undefined, "Pi must not forward model-supplied confirmation ids");
assert.doesNotMatch(JSON.stringify(calls.at(-1).body), secretTerms, "Pi request body must not forward secrets");
assert.doesNotMatch(JSON.stringify(directResult), privilegedPublicTerms, "direct result must sanitize proof-authority vocabulary");
assert.doesNotMatch(JSON.stringify(directResult), hostPathTerms, "direct result must sanitize host path echoes");
assert.doesNotMatch(JSON.stringify(directResult), secretTerms, "direct result must sanitize secret echoes");

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
  { client, project_root: projectRoot, actor: "goal3-task158" }
);

assert.equal(
  registeredTools.has("comath.release.piCodexLifecycleOperatorSession"),
  true,
  "Pi runtime must expose operator-session persistence as an executable tool"
);
assert.equal(commands.has("cm:release"), true, "Pi runtime must expose /cm:release for operator-session persistence");

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
    "lifecycle-operator-session",
    "--project-id PRJ-1580",
    "--session-id LIFE-OP-SESSION-0158",
    "--pi-host-label pi-host-lab-01",
    "--session-status recoverable_operator_session",
    "--session-kind real_pi_host_manual_install",
    "--operator-cursor token=plain-token",
    "--completed-step real_pi_install_runtime_probe",
    "--artifact runtime_registration_snapshot=D:/research/project/.comath/release/pi-codex-lifecycle/task158/OPENAI_API_KEY=plain-token.json",
    "--last-result-summary lean_kernel_clean_replay from D:/research/project with sk-should-not-leak"
  ].join(" "),
  ctx
);

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/release/pi-codex-lifecycle/operator-session");
assert.equal(calls.at(-1).body.confirmation_id, undefined, "runtime command must not forward confirmation ids");
assert.equal(calls.at(-1).body.project_root, projectRoot);
assert.equal(calls.at(-1).body.project_id, "PRJ-1580");
assert.equal(calls.at(-1).body.actor, "goal3-task158");
assert.equal(calls.at(-1).body.session_id, "LIFE-OP-SESSION-0158");
assert.equal(calls.at(-1).body.pi_host_label, "pi-host-lab-01");
assert.equal(calls.at(-1).body.session_status, "recoverable_operator_session");
assert.equal(calls.at(-1).body.operator_cursor, "[redacted_secret]");
assert.deepEqual(calls.at(-1).body.completed_steps, ["real_pi_install_runtime_probe"]);
assert.deepEqual(calls.at(-1).body.artifact_paths, [
  {
    kind: "runtime_registration_snapshot",
    path: "[redacted_host_path]"
  }
]);
assert.equal(confirmationPrompts.length, 1, "operator-session persistence command must require Pi host confirmation");
assert.doesNotMatch(confirmationPrompts[0].body, privilegedPublicTerms);
assert.doesNotMatch(confirmationPrompts[0].body, hostPathTerms);
assert.doesNotMatch(confirmationPrompts[0].body, secretTerms);
assert.equal(notifications.length, 1, "operator-session persistence command must notify the Pi host");
assert.doesNotMatch(notifications[0].message, privilegedPublicTerms);
assert.doesNotMatch(notifications[0].message, hostPathTerms);
assert.doesNotMatch(notifications[0].message, secretTerms);

console.log("Goal 3 Task158 Pi operator-session persistence consumer tests passed.");
