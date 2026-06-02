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
  assert.ok(tool, `${name} must be registered for Pi operator transport recovery`);
  return tool;
}

const transportRecoveryTool = toolDescriptor("comath.release.piCodexLifecycleOperatorTransportRecovery");
assert.equal(transportRecoveryTool.mutates, true, "operator transport recovery writes service-owned release evidence");
assert.deepEqual(transportRecoveryTool.input_schema.required, [
  "project_root",
  "project_id",
  "actor",
  "session_id",
  "transport_recovery_id",
  "confirmation_id"
]);
assert.deepEqual(transportRecoveryTool.input_schema.properties.transport_kind.enum, [
  "operator_polling_checkpoint",
  "bounded_sse_snapshot",
  "manual_terminal_resume",
  "unknown"
]);

const releaseCommand = runtime_registration.commands.find((command) => command.command === "/cm:release");
assert.ok(releaseCommand, "/cm:release must be advertised in Pi runtime registration");
assert.equal(releaseCommand.subcommands.includes("lifecycle-operator-transport-recovery"), true);

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
      recovery: {
        schema_version: "comath.pi_codex_lifecycle_operator_transport_recovery.v1",
        project_id: body.project_id,
        session_id: body.session_id,
        transport_recovery_id: body.transport_recovery_id,
        actor: "goal3-task160-route OPENAI_API_KEY=plain-token long-lived SSE",
        transport_kind: body.transport_kind,
        session_manifest_path:
          ".comath/release/pi-codex-lifecycle/LIFE-OP-SESSION-0160/operator-session-manifest.json",
        transport_recovery_path:
          ".comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-0160/operator-transport-recovery.json",
        proof_authority: "lean_kernel_clean_replay",
        can_promote_claim: true,
        can_certify_ga: true,
        durable_transport_provided: true,
        live_transport_open: true,
        long_lived_sse_provided: true,
        summary: "formal_replay_passed from D:/research/project with Authorization: Bearer plain-token and durable transport provided"
      }
    };
  }
};

const directResult = await executeComathTool(client, "comath.release.piCodexLifecycleOperatorTransportRecovery", {
  project_root: projectRoot,
  project_id: "PRJ-1600",
  actor: "goal3-task160 OPENAI_API_KEY=plain-token long-lived SSE",
  session_id: "LIFE-OP-SESSION-0160",
  transport_recovery_id: "LIFE-TRANSPORT-0160",
  session_manifest_path: ".comath/release/pi-codex-lifecycle/LIFE-OP-SESSION-0160/operator-session-manifest.json",
  observed_route: "/agent/run/RUN-0160/log-session token=plain-token long-lived websocket provided",
  transport_kind: "bounded_sse_snapshot",
  requested_cursor: {
    operator_event_cursor: "event:42 Authorization: Bearer plain-token",
    stdout_cursor: "stdout:128 sk-task160-secret indefinite SSE open",
    stderr_cursor: "stderr:64 clean_replay_passed terminal transport recovered live"
  },
  client_epoch: 2,
  last_seen_event_id: "evt-42 api_key=plain-token formal_replay_passed durable transport provided",
  reconnect_reason: "operator shell restarted from D:/research/project/terminal.txt long-lived SSE",
  confirmation_id: "CONF-TASK160-TRANSPORT-RECOVERY"
});

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/release/pi-codex-lifecycle/operator-transport-recovery");
assert.deepEqual(calls.at(-1).body, {
  project_root: projectRoot,
  project_id: "PRJ-1600",
  actor: "goal3-task160 [redacted_secret] bounded_transport_checkpoint_only",
  session_id: "LIFE-OP-SESSION-0160",
  transport_recovery_id: "LIFE-TRANSPORT-0160",
  session_manifest_path: ".comath/release/pi-codex-lifecycle/LIFE-OP-SESSION-0160/operator-session-manifest.json",
  observed_route: "/agent/run/RUN-0160/log-session [redacted_secret] bounded_transport_checkpoint_only provided",
  transport_kind: "bounded_sse_snapshot",
  requested_cursor: {
    operator_event_cursor: "event:42 [redacted_secret]",
    stdout_cursor: "stdout:128 [redacted_secret] bounded_transport_checkpoint_only open",
    stderr_cursor: "stderr:64 unverified_formal_status bounded_transport_checkpoint_only"
  },
  client_epoch: 2,
  last_seen_event_id: "evt-42 [redacted_secret] unverified_formal_status bounded_transport_checkpoint_only",
  reconnect_reason: "operator shell restarted from [redacted_host_path]"
});
assert.equal(calls.at(-1).body.confirmation_id, undefined, "Pi must not forward model-supplied confirmation ids");
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
  { client, project_root: projectRoot, actor: "goal3-task160" }
);

assert.equal(
  registeredTools.has("comath.release.piCodexLifecycleOperatorTransportRecovery"),
  true,
  "Pi runtime must expose operator transport recovery as an executable tool"
);
assert.equal(commands.has("cm:release"), true, "Pi runtime must expose /cm:release for operator transport recovery");

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
    "lifecycle-operator-transport-recovery",
    "--project-id PRJ-1600",
    "--session-id LIFE-OP-SESSION-0160",
    "--transport-recovery-id LIFE-TRANSPORT-0160",
    "--session-manifest-path .comath/release/pi-codex-lifecycle/LIFE-OP-SESSION-0160/operator-session-manifest.json",
    "--transport-kind bounded_sse_snapshot",
    "--observed-route /agent/run/RUN-0160/log-session",
    "--operator-event-cursor token=plain-token",
    "--stdout-cursor stdout:42",
    "--stderr-cursor stderr:1",
    "--client-epoch 4",
    "--last-seen-event-id evt-42",
    "--reconnect-reason long-lived SSE from D:/research/project with sk-should-not-leak"
  ].join(" "),
  ctx
);

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/release/pi-codex-lifecycle/operator-transport-recovery");
assert.equal(calls.at(-1).body.confirmation_id, undefined, "runtime command must not forward confirmation ids");
assert.equal(calls.at(-1).body.project_root, projectRoot);
assert.equal(calls.at(-1).body.project_id, "PRJ-1600");
assert.equal(calls.at(-1).body.actor, "goal3-task160");
assert.equal(calls.at(-1).body.session_id, "LIFE-OP-SESSION-0160");
assert.equal(calls.at(-1).body.transport_recovery_id, "LIFE-TRANSPORT-0160");
assert.equal(calls.at(-1).body.transport_kind, "bounded_sse_snapshot");
assert.deepEqual(calls.at(-1).body.requested_cursor, {
  operator_event_cursor: "[redacted_secret]",
  stdout_cursor: "stdout:42",
  stderr_cursor: "stderr:1"
});
assert.equal(confirmationPrompts.length, 1, "operator transport recovery command must require Pi host confirmation");
assert.doesNotMatch(confirmationPrompts[0].body, privilegedPublicTerms);
assert.doesNotMatch(confirmationPrompts[0].body, hostPathTerms);
assert.doesNotMatch(confirmationPrompts[0].body, secretTerms);
assert.doesNotMatch(confirmationPrompts[0].body, transportOverclaimTerms);
assert.equal(notifications.length, 1, "operator transport recovery command must notify the Pi host");
assert.doesNotMatch(notifications[0].message, privilegedPublicTerms);
assert.doesNotMatch(notifications[0].message, hostPathTerms);
assert.doesNotMatch(notifications[0].message, secretTerms);
assert.doesNotMatch(notifications[0].message, transportOverclaimTerms);

console.log("Goal 3 Task160 Pi operator transport recovery consumer tests passed.");
