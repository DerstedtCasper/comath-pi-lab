import assert from "node:assert/strict";
import registerComathPiRuntime, { createComathTools, executeComathTool, runtime_registration } from "../dist/index.js";

const projectRoot = "D:/research/project";
const privilegedPublicTerms =
  /completed_formal_proof|formally_checked|proven|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence/i;
const hostPathTerms = /D:\\|D:\//i;

function toolDescriptor(name) {
  const tool = createComathTools().find((descriptor) => descriptor.name === name);
  assert.ok(tool, `${name} must be registered for Pi lifecycle release consumers`);
  return tool;
}

const lifecycleTool = toolDescriptor("comath.release.piCodexLifecycleReview");
assert.equal(lifecycleTool.mutates, true, "Pi/Codex lifecycle review writes service-owned release material");
assert.deepEqual(lifecycleTool.input_schema.required, [
  "project_root",
  "project_id",
  "actor",
  "install_session_evidence",
  "codex_evidence",
  "confirmation_id"
]);

const releaseCommand = runtime_registration.commands.find((command) => command.command === "/cm:release");
assert.ok(releaseCommand, "/cm:release must be advertised in Pi runtime registration");
assert.equal(releaseCommand.mutates, true);
assert.equal(releaseCommand.requires_confirmation, true);
assert.equal(releaseCommand.subcommands.includes("pi-codex-lifecycle"), true);

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
      review: {
        proof_authority: "lean_kernel_clean_replay",
        readiness_status: "blocked_missing_real_host_lifecycle_validation",
        summary: "formal_replay_passed from D:/research/project/.comath/release/pi-codex-lifecycle/raw.json"
      }
    };
  }
};

const installSessionEvidence = {
  session_kind: "real_pi_host_manual_install",
  pi_host_kind: "real_pi_host",
  runtime_entrypoint_imported: true,
  runtime_registered: true,
  host_confirmation_observed: true,
  comathd_server_kind: "durable_service",
  service_start_observed: true,
  service_stop_observed: true,
  service_restart_observed: true
};

const codexEvidence = {
  installed_cli_validation_ok: true,
  installed_cli_probe_source: "service_owned_process",
  codex_api_account_network_validation: "passed"
};

await executeComathTool(client, "comath.release.piCodexLifecycleReview", {
  project_root: projectRoot,
  project_id: "PRJ-147",
  actor: "goal3-task147",
  review_id: "LIFE-TASK147",
  install_session_evidence: installSessionEvidence,
  codex_evidence: codexEvidence,
  confirmation_id: "CONF-TASK147-LIFECYCLE"
});
assert.deepEqual(calls.at(-1), {
  method: "POST",
  path: "/release/pi-codex-lifecycle/review",
  body: {
    project_root: projectRoot,
    project_id: "PRJ-147",
    actor: "goal3-task147",
    review_id: "LIFE-TASK147",
    install_session_evidence: installSessionEvidence,
    codex_evidence: codexEvidence
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
  { client, project_root: projectRoot, actor: "goal3-task147" }
);

assert.equal(commands.has("cm:release"), true, "Pi runtime must expose /cm:release for lifecycle consumers");
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
    "pi-codex-lifecycle",
    "--project-id PRJ-147",
    "--review-id LIFE-TASK147",
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
assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/release/pi-codex-lifecycle/review");
assert.deepEqual(calls.at(-1).body, {
  project_root: projectRoot,
  project_id: "PRJ-147",
  actor: "goal3-task147",
  review_id: "LIFE-TASK147",
  install_session_evidence: installSessionEvidence,
  codex_evidence: codexEvidence
});
assert.equal(confirmationPrompts.length, 1, "Pi/Codex lifecycle command must require Pi host confirmation");
assert.equal(notifications.length, 1, "Pi/Codex lifecycle command must notify the Pi host");
assert.doesNotMatch(notifications[0].message, privilegedPublicTerms, "Pi lifecycle notifications must sanitize proof-authority vocabulary");
assert.doesNotMatch(notifications[0].message, hostPathTerms, "Pi lifecycle notifications must sanitize host path echoes");

console.log("Goal 3 Task147 Pi/Codex lifecycle consumer tests passed.");
