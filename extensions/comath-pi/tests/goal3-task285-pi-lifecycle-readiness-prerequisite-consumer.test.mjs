import assert from "node:assert/strict";
import registerComathPiRuntime, { createComathTools, executeComathTool } from "../dist/index.js";

const projectRoot = "D:/research/project";
const secretTerms = /OPENAI_API_KEY|COMATH_CODEX_API_KEY|Authorization:\s*Bearer|token=|plain-token|sk-/i;
const privilegedPublicTerms =
  /completed_formal_proof|formally_checked|proven|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|terminal unattended completion certified|terminal_unattended_completion_certified\s*[:=]\s*(?:true|1)|completion certificate available|completion_certificate_available\s*[:=]\s*(?:true|1)|GA certified|can certify GA/i;
const hostPathTerms = /D:\\|D:\//i;

function toolDescriptor(name) {
  const tool = createComathTools().find((descriptor) => descriptor.name === name);
  assert.ok(tool, `${name} must be registered for Pi lifecycle release consumers`);
  return tool;
}

const lifecycleTool = toolDescriptor("comath.release.piCodexLifecycleReview");
assert.equal(lifecycleTool.mutates, true);
assert.deepEqual(lifecycleTool.input_schema.required, [
  "project_root",
  "project_id",
  "actor",
  "install_session_evidence",
  "codex_evidence",
  "confirmation_id"
]);
assert.ok(
  lifecycleTool.input_schema.properties.completion_certification_prerequisite_id,
  "Task285 must expose optional Task253 prerequisite id on the Pi lifecycle review tool"
);
assert.ok(
  lifecycleTool.input_schema.properties.completion_certification_prerequisite_path,
  "Task285 must expose optional Task253 prerequisite path on the Pi lifecycle review tool"
);
assert.ok(
  lifecycleTool.input_schema.properties.completion_certification_prerequisite_sha256,
  "Task285 must expose optional Task253 prerequisite hash on the Pi lifecycle review tool"
);

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

const prerequisite = {
  id: "LIFE-COMPLETION-CERTIFICATION-PREREQ-0285",
  path:
    ".comath/release/pi-codex-lifecycle/LIFE-COMPLETION-CERTIFICATION-PREREQ-0285/unattended-real-host-completion-certification-prerequisite.json",
  sha256: "a".repeat(64)
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
      ok: false,
      path,
      review: {
        ok: false,
        readiness_status: "blocked_missing_real_host_lifecycle_validation",
        checks: {
          terminal_unattended_completion_certification: {
            ok: false,
            required: true,
            observed: "blocked_terminal_unattended_completion_certification_required"
          }
        },
        vetoes: [{ code: "terminal_unattended_completion_certification_required" }],
        inputs: {
          completion_certification_prerequisite: {
            completion_certification_prerequisite_id: body.completion_certification_prerequisite_id,
            artifact: {
              path: body.completion_certification_prerequisite_path,
              sha256: body.completion_certification_prerequisite_sha256
            },
            proof_authority: "none",
            can_certify_ga: false,
            completion_certificate_available: false,
            terminal_unattended_completion_certified: false
          }
        },
        proof_authority: "lean_kernel_clean_replay",
        can_certify_ga: true,
        summary:
          "formal_replay_passed terminal_unattended_completion_certified=true completion_certificate_available=true from D:/research/project with Authorization: Bearer plain-token; GA certified"
      }
    };
  }
};

await executeComathTool(client, "comath.release.piCodexLifecycleReview", {
  project_root: projectRoot,
  project_id: "PRJ-285",
  actor: "goal3-task285 token=plain-token terminal unattended completion certified",
  review_id: "LIFE-TASK285",
  install_session_evidence: installSessionEvidence,
  codex_evidence: codexEvidence,
  completion_certification_prerequisite_id: prerequisite.id,
  completion_certification_prerequisite_path: prerequisite.path,
  completion_certification_prerequisite_sha256: prerequisite.sha256,
  confirmation_id: "CONF-TASK285-LIFECYCLE"
});
assert.deepEqual(calls.at(-1), {
  method: "POST",
  path: "/release/pi-codex-lifecycle/review",
  body: {
    project_root: projectRoot,
    project_id: "PRJ-285",
    actor: "goal3-task285 token=plain-token terminal unattended completion certified",
    review_id: "LIFE-TASK285",
    install_session_evidence: installSessionEvidence,
    codex_evidence: codexEvidence,
    completion_certification_prerequisite_id: prerequisite.id,
    completion_certification_prerequisite_path: prerequisite.path,
    completion_certification_prerequisite_sha256: prerequisite.sha256
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
  { client, project_root: projectRoot, actor: "goal3-task285 token=plain-token" }
);

assert.equal(commands.has("cm:release"), true);
await commands.get("cm:release")(
  [
    "pi-codex-lifecycle",
    "--project-id PRJ-285",
    "--review-id LIFE-TASK285-CMD",
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
    "--codex-api-account-network-validation passed",
    `--completion-certification-prerequisite-id ${prerequisite.id}`,
    `--completion-certification-prerequisite-path ${prerequisite.path}`,
    `--completion-certification-prerequisite-sha256 ${prerequisite.sha256}`
  ].join(" "),
  {
    ui: {
      confirm: async (title, body) => {
        confirmationPrompts.push({ title, body });
        return true;
      },
      notify: async (message, level) => {
        notifications.push({ message, level });
      }
    }
  }
);
assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/release/pi-codex-lifecycle/review");
assert.equal(calls.at(-1).body.completion_certification_prerequisite_id, prerequisite.id);
assert.equal(calls.at(-1).body.completion_certification_prerequisite_path, prerequisite.path);
assert.equal(calls.at(-1).body.completion_certification_prerequisite_sha256, prerequisite.sha256);
assert.equal(confirmationPrompts.length, 1, "Pi lifecycle prerequisite-bound review must remain host-confirmed");
assert.equal(notifications.length, 1, "Pi lifecycle prerequisite-bound review must notify the Pi host");
assert.doesNotMatch(JSON.stringify(notifications), secretTerms);
assert.doesNotMatch(JSON.stringify(notifications), privilegedPublicTerms);
assert.doesNotMatch(JSON.stringify(notifications), hostPathTerms);

console.log("Goal 3 Task285 Pi lifecycle readiness prerequisite consumer tests passed.");
