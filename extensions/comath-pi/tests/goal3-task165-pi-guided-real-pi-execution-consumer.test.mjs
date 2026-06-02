import assert from "node:assert/strict";
import registerComathPiRuntime, { createComathTools, executeComathTool, runtime_registration } from "../dist/index.js";

const projectRoot = "D:/research/project";
const privilegedPublicTerms =
  /clean_replay_passed|completed_formal_proof|formally_checked|proven|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence/i;
const hostPathTerms = /D:\\|D:\//i;
const secretTerms = /COMATH_CODEX_API_KEY|OPENAI_API_KEY|Authorization:\s*Bearer|api_key|token=|plain-token|sk-/i;
const transportOverclaimTerms =
  /long-lived\s+(?:websocket|sse)|indefinite\s+sse|terminal transport recovered live|durable transport provided/i;

function toolDescriptor(name) {
  const tool = createComathTools().find((descriptor) => descriptor.name === name);
  assert.ok(tool, `${name} must be registered for Pi guided real-Pi execution evidence`);
  return tool;
}

const guidedExecutionTool = toolDescriptor("comath.release.piCodexLifecycleGuidedRealPiExecution");
assert.equal(guidedExecutionTool.mutates, true, "guided real-Pi execution writes service-owned release evidence");
assert.deepEqual(guidedExecutionTool.input_schema.required, [
  "project_root",
  "project_id",
  "actor",
  "execution_id",
  "real_pi_runtime_probe_id",
  "pi_install_transcript_path",
  "runtime_registration_snapshot_path",
  "session_id",
  "transport_recovery_id",
  "transport_lease_id",
  "confirmation_id"
]);
assert.deepEqual(guidedExecutionTool.input_schema.properties.execution_outcome.enum, [
  "operator_guided_run_observed",
  "replayable_release_blocker_recorded"
]);

const releaseCommand = runtime_registration.commands.find((command) => command.command === "/cm:release");
assert.ok(releaseCommand, "/cm:release must be advertised in Pi runtime registration");
assert.equal(releaseCommand.subcommands.includes("lifecycle-guided-real-pi-execution"), true);

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
      execution: {
        schema_version: "comath.pi_codex_guided_real_pi_execution.v1",
        project_id: body.project_id,
        execution_id: body.execution_id,
        actor: "goal3-task165-route OPENAI_API_KEY=plain-token long-lived SSE",
        real_pi_runtime_probe_id: body.real_pi_runtime_probe_id,
        session_id: body.session_id,
        transport_recovery_id: body.transport_recovery_id,
        transport_lease_id: body.transport_lease_id,
        guided_execution_path:
          ".comath/release/pi-codex-lifecycle/LIFE-GUIDED-EXEC-0165/guided-real-pi-execution.json",
        proof_authority: "lean_kernel_clean_replay",
        can_promote_claim: true,
        can_certify_ga: true,
        durable_transport_provided: true,
        indefinite_stream_open: true,
        long_lived_websocket_provided: true,
        long_lived_sse_provided: true,
        summary: "formal_replay_passed from D:/research/project with Authorization: Bearer plain-token and durable transport provided"
      }
    };
  }
};

const directResult = await executeComathTool(client, "comath.release.piCodexLifecycleGuidedRealPiExecution", {
  project_root: projectRoot,
  project_id: "PRJ-1650",
  actor: "goal3-task165 OPENAI_API_KEY=plain-token long-lived SSE",
  execution_id: "LIFE-GUIDED-EXEC-0165",
  real_pi_runtime_probe_id: "LIFE-PI-RUNTIME-0165",
  pi_install_transcript_path: ".comath/release/pi-codex-lifecycle/LIFE-PI-RUNTIME-0165/pi-install-transcript.md",
  runtime_registration_snapshot_path:
    ".comath/release/pi-codex-lifecycle/LIFE-PI-RUNTIME-0165/runtime-registration-snapshot.json",
  session_id: "LIFE-OP-SESSION-0165",
  session_manifest_path: ".comath/release/pi-codex-lifecycle/LIFE-OP-SESSION-0165/operator-session-manifest.json",
  transport_recovery_id: "LIFE-TRANSPORT-0165",
  transport_recovery_path:
    ".comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-0165/operator-transport-recovery.json",
  transport_lease_id: "LIFE-TRANSPORT-LEASE-0165",
  transport_lease_path:
    ".comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-LEASE-0165/operator-transport-lease.json",
  pi_host_label: "pi-host-lab-01",
  observed_routes: [
    "/cm:release lifecycle-operator-transport-lease terminal transport recovered live",
    "D:/research/project/route-secret.txt token=plain-token"
  ],
  operator_command_summary:
    "operator completed guided real Pi lifecycle at D:/research/project/terminal.txt sk-task165 clean_replay_passed durable transport provided",
  final_operator_cursor: {
    operator_event_cursor: "event:8 Authorization: Bearer plain-token",
    stdout_cursor: "stdout:256 long-lived websocket",
    stderr_cursor: "stderr:0 formal_replay_passed indefinite SSE"
  },
  execution_outcome: "replayable_release_blocker_recorded",
  next_recommended_route: "/release/pi-codex-lifecycle/review token=plain-token",
  confirmation_id: "CONF-TASK165-GUIDED-EXECUTION"
});

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/release/pi-codex-lifecycle/guided-real-pi-execution");
assert.equal(calls.at(-1).body.confirmation_id, undefined, "Pi must not forward model-supplied confirmation ids");
assert.equal(calls.at(-1).body.execution_id, "LIFE-GUIDED-EXEC-0165");
assert.equal(calls.at(-1).body.project_root, projectRoot);
assert.equal(calls.at(-1).body.project_id, "PRJ-1650");
assert.equal(calls.at(-1).body.real_pi_runtime_probe_id, "LIFE-PI-RUNTIME-0165");
assert.equal(calls.at(-1).body.session_id, "LIFE-OP-SESSION-0165");
assert.equal(calls.at(-1).body.transport_recovery_id, "LIFE-TRANSPORT-0165");
assert.equal(calls.at(-1).body.transport_lease_id, "LIFE-TRANSPORT-LEASE-0165");
assert.equal(calls.at(-1).body.execution_outcome, "replayable_release_blocker_recorded");
const directRequestWithoutProjectRoot = { ...calls.at(-1).body, project_root: "[project_root]" };
assert.doesNotMatch(JSON.stringify(calls.at(-1).body), privilegedPublicTerms, "Pi request body must not forward proof-success vocabulary");
assert.doesNotMatch(
  JSON.stringify(directRequestWithoutProjectRoot),
  hostPathTerms,
  "Pi request body must not forward host path echoes outside the required project_root"
);
assert.doesNotMatch(JSON.stringify(calls.at(-1).body), secretTerms, "Pi request body must not forward secrets");
assert.doesNotMatch(
  JSON.stringify(calls.at(-1).body),
  transportOverclaimTerms,
  "Pi request body must not forward long-lived transport overclaims"
);
assert.doesNotMatch(JSON.stringify(directResult), privilegedPublicTerms, "direct result must sanitize proof-authority vocabulary");
assert.doesNotMatch(JSON.stringify(directResult), hostPathTerms, "direct result must sanitize host path echoes");
assert.doesNotMatch(JSON.stringify(directResult), secretTerms, "direct result must sanitize secret echoes");
assert.doesNotMatch(
  JSON.stringify(directResult),
  transportOverclaimTerms,
  "direct result must sanitize long-lived transport overclaims"
);
assert.equal(directResult.execution.can_promote_claim, false, "direct result must not surface promotion overclaims");
assert.equal(directResult.execution.can_certify_ga, false, "direct result must not surface GA-certification overclaims");
assert.equal(
  directResult.execution.durable_transport_provided,
  false,
  "direct result must not surface durable-transport overclaims"
);
assert.equal(
  directResult.execution.indefinite_stream_open,
  false,
  "direct result must not surface indefinite-stream overclaims"
);
assert.equal(
  directResult.execution.long_lived_websocket_provided,
  false,
  "direct result must not surface long-lived websocket overclaims"
);
assert.equal(
  directResult.execution.long_lived_sse_provided,
  false,
  "direct result must not surface long-lived SSE overclaims"
);

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
  { client, project_root: projectRoot, actor: "goal3-task165" }
);

assert.equal(
  registeredTools.has("comath.release.piCodexLifecycleGuidedRealPiExecution"),
  true,
  "Pi runtime must expose guided real-Pi execution as an executable tool"
);
assert.equal(commands.has("cm:release"), true, "Pi runtime must expose /cm:release for guided real-Pi execution");

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
    "lifecycle-guided-real-pi-execution",
    "--project-id PRJ-1650",
    "--execution-id LIFE-GUIDED-EXEC-0165-CMD",
    "--real-pi-runtime-probe-id LIFE-PI-RUNTIME-0165",
    "--pi-install-transcript-path .comath/release/pi-codex-lifecycle/LIFE-PI-RUNTIME-0165/pi-install-transcript.md",
    "--runtime-registration-snapshot-path .comath/release/pi-codex-lifecycle/LIFE-PI-RUNTIME-0165/runtime-registration-snapshot.json",
    "--session-id LIFE-OP-SESSION-0165",
    "--session-manifest-path .comath/release/pi-codex-lifecycle/LIFE-OP-SESSION-0165/operator-session-manifest.json",
    "--transport-recovery-id LIFE-TRANSPORT-0165",
    "--transport-recovery-path .comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-0165/operator-transport-recovery.json",
    "--transport-lease-id LIFE-TRANSPORT-LEASE-0165",
    "--transport-lease-path .comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-LEASE-0165/operator-transport-lease.json",
    "--pi-host-label pi-host-lab-01",
    "--observed-route '/cm:release lifecycle-operator-transport-lease'",
    "--observed-route 'D:/research/project/route-secret.txt token=plain-token'",
    "--operator-command-summary 'guided execution from D:/research/project/terminal.txt sk-task165 clean_replay_passed durable transport provided'",
    "--operator-event-cursor 'event:9 Authorization: Bearer plain-token'",
    "--stdout-cursor 'stdout:288 long-lived websocket'",
    "--stderr-cursor 'stderr:0 formal_replay_passed indefinite SSE'",
    "--execution-outcome replayable_release_blocker_recorded",
    "--next-recommended-route /release/pi-codex-lifecycle/review"
  ].join(" "),
  ctx
);

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/release/pi-codex-lifecycle/guided-real-pi-execution");
assert.equal(calls.at(-1).body.confirmation_id, undefined, "runtime command must not forward confirmation ids");
assert.equal(calls.at(-1).body.project_root, projectRoot);
assert.equal(calls.at(-1).body.project_id, "PRJ-1650");
assert.equal(calls.at(-1).body.actor, "goal3-task165");
assert.equal(calls.at(-1).body.execution_id, "LIFE-GUIDED-EXEC-0165-CMD");
assert.equal(calls.at(-1).body.real_pi_runtime_probe_id, "LIFE-PI-RUNTIME-0165");
assert.equal(calls.at(-1).body.session_id, "LIFE-OP-SESSION-0165");
assert.equal(calls.at(-1).body.transport_recovery_id, "LIFE-TRANSPORT-0165");
assert.equal(calls.at(-1).body.transport_lease_id, "LIFE-TRANSPORT-LEASE-0165");
assert.equal(calls.at(-1).body.execution_outcome, "replayable_release_blocker_recorded");
assert.equal(confirmationPrompts.length, 1, "guided execution command must require Pi host confirmation");
assert.doesNotMatch(confirmationPrompts[0].body, privilegedPublicTerms);
assert.doesNotMatch(confirmationPrompts[0].body, hostPathTerms);
assert.doesNotMatch(confirmationPrompts[0].body, secretTerms);
assert.doesNotMatch(confirmationPrompts[0].body, transportOverclaimTerms);
assert.equal(notifications.length, 1, "guided execution command must notify the Pi host");
assert.doesNotMatch(notifications[0].message, privilegedPublicTerms);
assert.doesNotMatch(notifications[0].message, hostPathTerms);
assert.doesNotMatch(notifications[0].message, secretTerms);
assert.doesNotMatch(notifications[0].message, transportOverclaimTerms);

console.log("Goal 3 Task165 Pi guided real-Pi execution consumer tests passed.");
