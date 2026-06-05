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
  assert.ok(tool, `${name} must be registered for Pi operator transport heartbeat`);
  return tool;
}

const heartbeatTool = toolDescriptor("comath.release.piCodexLifecycleOperatorTransportHeartbeat");
assert.equal(heartbeatTool.mutates, true, "operator transport heartbeat writes service-owned checkpoint evidence");
assert.deepEqual(heartbeatTool.input_schema.required, [
  "project_root",
  "project_id",
  "actor",
  "session_id",
  "transport_recovery_id",
  "transport_lease_id",
  "transport_heartbeat_id",
  "confirmation_id"
]);

const leaseTool = toolDescriptor("comath.release.piCodexLifecycleOperatorTransportLease");
assert.deepEqual(
  leaseTool.input_schema.properties.transport_kind.enum,
  ["bounded_live_polling_lease", "bounded_live_sse_lease", "manual_terminal_polling_lease", "unknown"],
  "Task221 must keep Pi lease-kind vocabulary in parity with comathd"
);

const releaseCommand = runtime_registration.commands.find((command) => command.command === "/cm:release");
assert.ok(releaseCommand, "/cm:release must be advertised in Pi runtime registration");
assert.equal(releaseCommand.subcommands.includes("lifecycle-operator-transport-heartbeat"), true);

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
      heartbeat: {
        schema_version: "comath.pi_codex_lifecycle_operator_transport_heartbeat.v1",
        project_id: body.project_id,
        session_id: body.session_id,
        transport_recovery_id: body.transport_recovery_id,
        transport_lease_id: body.transport_lease_id,
        transport_heartbeat_id: body.transport_heartbeat_id,
        heartbeat_status: "operator_transport_heartbeat_rebound",
        transport_heartbeat_path:
          ".comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-HEARTBEAT-0221/operator-transport-heartbeat.json",
        proof_authority: "lean_kernel_clean_replay",
        durable_transport_provided: true,
        long_lived_sse_provided: true,
        can_promote_claim: true,
        can_certify_ga: true,
        summary:
          "formal_replay_passed from D:/research/project with Authorization: Bearer plain-token and durable transport provided"
      }
    };
  }
};

const directResult = await executeComathTool(client, "comath.release.piCodexLifecycleOperatorTransportHeartbeat", {
  project_root: projectRoot,
  project_id: "PRJ-2210",
  actor: "goal3-task221 OPENAI_API_KEY=plain-token long-lived SSE",
  session_id: "LIFE-OP-SESSION-0221",
  transport_recovery_id: "LIFE-TRANSPORT-0221",
  transport_lease_id: "LIFE-TRANSPORT-LEASE-0221",
  transport_heartbeat_id: "LIFE-TRANSPORT-HEARTBEAT-0221",
  session_manifest_path: ".comath/release/pi-codex-lifecycle/LIFE-OP-SESSION-0221/operator-session-manifest.json",
  transport_recovery_path: ".comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-0221/operator-transport-recovery.json",
  transport_lease_path: ".comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-LEASE-0221/operator-transport-lease.json",
  requested_cursor: {
    operator_event_cursor: "event:44 Authorization: Bearer plain-token",
    stdout_cursor: "stdout:300 sk-task221-secret indefinite SSE open",
    stderr_cursor: "stderr:48 clean_replay_passed terminal transport recovered live"
  },
  client_epoch: 7,
  last_seen_event_id: "evt-44 api_key=plain-token formal_replay_passed durable transport provided",
  heartbeat_reason: "operator heartbeat from D:/research/project/terminal.txt long-lived SSE",
  confirmation_id: "CONF-TASK221-TRANSPORT-HEARTBEAT"
});

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/release/pi-codex-lifecycle/operator-transport-heartbeat");
assert.deepEqual(calls.at(-1).body, {
  project_root: projectRoot,
  project_id: "PRJ-2210",
  actor: "goal3-task221 [redacted_secret] bounded_transport_checkpoint_only",
  session_id: "LIFE-OP-SESSION-0221",
  transport_recovery_id: "LIFE-TRANSPORT-0221",
  transport_lease_id: "LIFE-TRANSPORT-LEASE-0221",
  transport_heartbeat_id: "LIFE-TRANSPORT-HEARTBEAT-0221",
  session_manifest_path: ".comath/release/pi-codex-lifecycle/LIFE-OP-SESSION-0221/operator-session-manifest.json",
  transport_recovery_path: ".comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-0221/operator-transport-recovery.json",
  transport_lease_path: ".comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-LEASE-0221/operator-transport-lease.json",
  requested_cursor: {
    operator_event_cursor: "event:44 [redacted_secret]",
    stdout_cursor: "stdout:300 [redacted_secret] bounded_transport_checkpoint_only open",
    stderr_cursor: "stderr:48 unverified_formal_status bounded_transport_checkpoint_only"
  },
  client_epoch: 7,
  last_seen_event_id: "evt-44 [redacted_secret] unverified_formal_status bounded_transport_checkpoint_only",
  heartbeat_reason: "operator heartbeat from [redacted_host_path]"
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
  { client, project_root: projectRoot, actor: "goal3-task221" }
);

assert.equal(
  registeredTools.has("comath.release.piCodexLifecycleOperatorTransportHeartbeat"),
  true,
  "Pi runtime must expose operator transport heartbeat as an executable tool"
);
assert.equal(commands.has("cm:release"), true, "Pi runtime must expose /cm:release for operator transport heartbeat");

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
    "lifecycle-operator-transport-heartbeat",
    "--project-id PRJ-2210",
    "--session-id LIFE-OP-SESSION-0221",
    "--transport-recovery-id LIFE-TRANSPORT-0221",
    "--transport-lease-id LIFE-TRANSPORT-LEASE-0221",
    "--transport-heartbeat-id LIFE-TRANSPORT-HEARTBEAT-0221-CMD",
    "--session-manifest-path .comath/release/pi-codex-lifecycle/LIFE-OP-SESSION-0221/operator-session-manifest.json",
    "--transport-recovery-path .comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-0221/operator-transport-recovery.json",
    "--transport-lease-path .comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-LEASE-0221/operator-transport-lease.json",
    "--operator-event-cursor token=plain-token",
    "--stdout-cursor stdout:300",
    "--stderr-cursor stderr:48",
    "--client-epoch 8",
    "--last-seen-event-id evt-44",
    "--heartbeat-reason long-lived SSE from D:/research/project with sk-should-not-leak"
  ].join(" "),
  ctx
);

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/release/pi-codex-lifecycle/operator-transport-heartbeat");
assert.equal(calls.at(-1).body.confirmation_id, undefined, "runtime command must not forward confirmation ids");
assert.equal(calls.at(-1).body.project_root, projectRoot);
assert.equal(calls.at(-1).body.project_id, "PRJ-2210");
assert.equal(calls.at(-1).body.actor, "goal3-task221");
assert.equal(calls.at(-1).body.session_id, "LIFE-OP-SESSION-0221");
assert.equal(calls.at(-1).body.transport_recovery_id, "LIFE-TRANSPORT-0221");
assert.equal(calls.at(-1).body.transport_lease_id, "LIFE-TRANSPORT-LEASE-0221");
assert.equal(calls.at(-1).body.transport_heartbeat_id, "LIFE-TRANSPORT-HEARTBEAT-0221-CMD");
assert.deepEqual(calls.at(-1).body.requested_cursor, {
  operator_event_cursor: "[redacted_secret]",
  stdout_cursor: "stdout:300",
  stderr_cursor: "stderr:48"
});
assert.equal(calls.at(-1).body.client_epoch, 8);
assert.equal(confirmationPrompts.length, 1, "operator transport heartbeat command must require Pi host confirmation");
assert.doesNotMatch(confirmationPrompts[0].body, privilegedPublicTerms);
assert.doesNotMatch(confirmationPrompts[0].body, hostPathTerms);
assert.doesNotMatch(confirmationPrompts[0].body, secretTerms);
assert.doesNotMatch(confirmationPrompts[0].body, transportOverclaimTerms);
assert.equal(notifications.length, 1, "operator transport heartbeat command must notify the Pi host");
assert.doesNotMatch(notifications[0].message, privilegedPublicTerms);
assert.doesNotMatch(notifications[0].message, hostPathTerms);
assert.doesNotMatch(notifications[0].message, secretTerms);
assert.doesNotMatch(notifications[0].message, transportOverclaimTerms);

console.log("Goal 3 Task221 Pi operator transport heartbeat consumer tests passed.");
