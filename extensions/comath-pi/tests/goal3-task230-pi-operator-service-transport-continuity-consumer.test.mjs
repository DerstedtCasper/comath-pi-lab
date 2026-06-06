import assert from "node:assert/strict";
import registerComathPiRuntime, { createComathTools, executeComathTool, runtime_registration } from "../dist/index.js";

const projectRoot = "D:/research/project";
const privilegedPublicTerms =
  /clean_replay_passed|completed_formal_proof|formally_checked|proven|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence|proof_success|kernel_checked/i;
const hostPathTerms = /D:\\|D:\//i;
const trustedRuntimeRootTerms = /\.comath[\\/]|%2ecomath/i;
const secretTerms = /COMATH_CODEX_API_KEY|OPENAI_API_KEY|Authorization:\s*Bearer|api_key|token=|plain-token|sk-/i;
const transportOverclaimTerms =
  /long[- ]lived\s+(?:websocket|sse)|indefinite\s+sse|terminal transport recovered live|durable transport provided/i;

function toolDescriptor(name) {
  const tool = createComathTools().find((descriptor) => descriptor.name === name);
  assert.ok(tool, `${name} must be registered for Pi operator/service transport continuity`);
  return tool;
}

const continuityTool = toolDescriptor("comath.release.piCodexLifecycleOperatorServiceTransportContinuity");
assert.equal(continuityTool.mutates, true, "operator/service transport continuity writes service-owned evidence");
assert.deepEqual(continuityTool.input_schema.required, [
  "project_root",
  "project_id",
  "actor",
  "transport_contract_id",
  "transport_contract_sha256",
  "confirmation_id"
]);
assert.equal(continuityTool.input_schema.properties.service_transport_primitive.enum.includes("node_http_agent_run_log_session_route"), true);
assert.equal(continuityTool.input_schema.properties.client_transport_primitive.enum.includes("pi_fetch_get_text"), true);

const releaseCommand = runtime_registration.commands.find((command) => command.command === "/cm:release");
assert.ok(releaseCommand, "/cm:release must be advertised in Pi runtime registration");
assert.equal(releaseCommand.subcommands.includes("lifecycle-operator-service-transport-continuity"), true);

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
      continuity: {
        schema_version: "comath.pi_codex_operator_service_transport_continuity.v1",
        project_id: body.project_id,
        continuity_id: body.continuity_id,
        transport_contract_id: body.transport_contract_id,
        transport_contract_artifact: {
          kind: "operator_service_transport_contract",
          path: `${body.transport_contract_path} token=plain-token`,
          sha256: body.transport_contract_sha256,
          size_bytes: 1234,
          proof_authority: "trusted",
          can_certify_ga: true
        },
        continuity_artifact: {
          kind: "operator_service_transport_continuity",
          path: "D:/research/project/.comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-CONTINUITY-0230/operator-service-transport-continuity.json",
          sha256: "d".repeat(64),
          direct_trusted_state_mutation: true
        },
        previous_cursor: {
          operator_event_cursor: "event:12 Authorization: Bearer plain-token",
          stdout_cursor: "stdout:512 long-lived SSE",
          stderr_cursor: "stderr:0 proof_success"
        },
        log_session_next_cursor: {
          operator_event_cursor: "event:13 sk-task230",
          stdout_cursor: "stdout:1024 D:/research/project",
          stderr_cursor: "stderr:0 clean_replay_passed"
        },
        request_echo: {
          transport_contract_path: body.transport_contract_path,
          proof_authority: "lean_kernel_check",
          can_promote_claim: true,
          can_certify_ga: true,
          live_transport_open: true,
          pi_direct_write_allowed: true
        },
        service_transport_primitive: "node_http_agent_run_log_session_route",
        client_transport_primitive: "pi_fetch_get_text",
        service_route: "/agent/run/RUN-TASK230/log-session",
        durable_resume_checkpoint_recorded: true,
        proof_authority: "lean_kernel_clean_replay",
        can_promote_claim: true,
        can_certify_ga: true,
        durable_transport_provided: true,
        live_transport_open: true,
        indefinite_stream_open: true,
        long_lived_websocket_provided: true,
        long_lived_sse_provided: true,
        pi_direct_write_allowed: true,
        direct_trusted_state_mutation: true,
        summary:
          "formal_replay_passed from D:/research/project with Authorization: Bearer plain-token and durable transport provided"
      }
    };
  }
};

const directResult = await executeComathTool(client, "comath.release.piCodexLifecycleOperatorServiceTransportContinuity", {
  project_root: projectRoot,
  project_id: "PRJ-2300",
  actor: "goal3-task230 OPENAI_API_KEY=plain-token long-lived SSE",
  continuity_id: "LIFE-TRANSPORT-CONTINUITY-0230",
  transport_contract_id: "LIFE-TRANSPORT-CONTRACT-0230",
  transport_contract_path:
    ".comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-CONTRACT-0230/operator-service-transport-contract.json",
  transport_contract_sha256: "a".repeat(64),
  max_bytes: 2048,
  max_events: 2,
  retry_ms: 600,
  service_transport_primitive: "node_http_agent_run_log_session_route",
  client_transport_primitive: "pi_fetch_get_text",
  confirmation_id: "CONF-TASK230-TRANSPORT-CONTINUITY"
});

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/release/pi-codex-lifecycle/operator-service-transport-continuity");
assert.equal(calls.at(-1).body.confirmation_id, undefined, "Pi must not forward model-supplied confirmation ids");
assert.deepEqual(calls.at(-1).body, {
  project_root: projectRoot,
  project_id: "PRJ-2300",
  actor: "goal3-task230 [redacted_secret] bounded_transport_checkpoint_only",
  continuity_id: "LIFE-TRANSPORT-CONTINUITY-0230",
  transport_contract_id: "LIFE-TRANSPORT-CONTRACT-0230",
  transport_contract_path:
    ".comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-CONTRACT-0230/operator-service-transport-contract.json",
  transport_contract_sha256: "a".repeat(64),
  max_bytes: 2048,
  max_events: 2,
  retry_ms: 600,
  service_transport_primitive: "node_http_agent_run_log_session_route",
  client_transport_primitive: "pi_fetch_get_text"
});
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
assert.equal(directResult.continuity.can_promote_claim, false, "direct result must not surface promotion overclaims");
assert.equal(directResult.continuity.proof_authority, "none", "direct result must force proof_authority to none");
assert.equal(
  directResult.continuity.request_echo.proof_authority,
  "none",
  "nested proof_authority fields must also be forced to none"
);
assert.equal(directResult.continuity.transport_contract_artifact.can_certify_ga, false);
assert.equal(directResult.continuity.continuity_artifact.direct_trusted_state_mutation, false);
assert.equal(directResult.continuity.request_echo.can_promote_claim, false);
assert.equal(directResult.continuity.request_echo.pi_direct_write_allowed, false);
assert.equal(directResult.continuity.can_certify_ga, false, "direct result must not surface GA-certification overclaims");
assert.equal(
  directResult.continuity.durable_transport_provided,
  false,
  "direct result must not surface durable-transport overclaims"
);
assert.equal(directResult.continuity.live_transport_open, false, "direct result must not surface live transport overclaims");
assert.equal(
  directResult.continuity.indefinite_stream_open,
  false,
  "direct result must not surface indefinite-stream overclaims"
);
assert.equal(
  directResult.continuity.long_lived_websocket_provided,
  false,
  "direct result must not surface long-lived websocket overclaims"
);
assert.equal(
  directResult.continuity.long_lived_sse_provided,
  false,
  "direct result must not surface long-lived SSE overclaims"
);
assert.equal(
  directResult.continuity.pi_direct_write_allowed,
  false,
  "direct result must not surface Pi direct-write overclaims"
);
assert.equal(
  directResult.continuity.direct_trusted_state_mutation,
  false,
  "direct result must not surface direct trusted-state mutation overclaims"
);

const callsBeforeMissingDirectHash = calls.length;
await assert.rejects(
  () =>
    executeComathTool(client, "comath.release.piCodexLifecycleOperatorServiceTransportContinuity", {
      project_root: projectRoot,
      project_id: "PRJ-2300",
      actor: "goal3-task230",
      continuity_id: "LIFE-TRANSPORT-CONTINUITY-0230-NO-HASH",
      transport_contract_id: "LIFE-TRANSPORT-CONTRACT-0230",
      confirmation_id: "CONF-TASK230-MISSING-HASH"
    }),
  /transport_contract_sha256 is required/
);
assert.equal(calls.length, callsBeforeMissingDirectHash, "missing direct contract hash must not POST to comathd");

const interactiveTool = toolDescriptor("comath.release.piCodexLifecycleInteractiveRealPi");
assert.equal(
  interactiveTool.input_schema.properties.completed_steps.items.enum.includes(
    "lifecycle-operator-service-transport-continuity"
  ),
  true,
  "interactive real-Pi planner must advertise the transport continuity checkpoint"
);
const interactivePlan = await executeComathTool(client, "comath.release.piCodexLifecycleInteractiveRealPi", {
  project_id: "PRJ-2300",
  actor: "goal3-task230",
  pi_host_label: "pi-host-lab-01",
  session_id: "LIFE-OP-SESSION-0230",
  action: "resume-plan",
  completed_steps: [
    "run-real-pi-runtime-probe",
    "lifecycle-operator-session",
    "lifecycle-operator-transport-recovery",
    "lifecycle-operator-transport-lease",
    "lifecycle-operator-transport-heartbeat",
    "lifecycle-guided-real-pi-execution",
    "lifecycle-operator-service-transport-contract",
    "lifecycle-automatic-real-pi-execution"
  ],
  continuity_id: "LIFE-TRANSPORT-CONTINUITY-0230",
  transport_contract_id: "LIFE-TRANSPORT-CONTRACT-0230",
  transport_contract_path:
    ".comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-CONTRACT-0230/operator-service-transport-contract.json",
  transport_contract_sha256: "b".repeat(64),
  last_result_summary: "proof_success from D:/research/project with sk-should-not-leak long-lived SSE"
});
assert.equal(calls.length, 1, "interactive planner must remain read-only and must not call comathd");
assert.equal(interactivePlan.next_action.action_id, "lifecycle-operator-service-transport-continuity");
assert.match(interactivePlan.next_action.command, /\/cm:release lifecycle-operator-service-transport-continuity/);
assert.match(interactivePlan.next_action.command, /--transport-contract-sha256 b{64}/);
assert.equal(interactivePlan.next_action.requires_host_confirmation, true);
assert.equal(interactivePlan.next_action.auto_executes, false);
assert.equal(interactivePlan.interactive_policy.pi_tool_readonly, true);
assert.equal(interactivePlan.interactive_policy.writes_comath_state, false);
assert.equal(interactivePlan.interactive_policy.calls_comathd, false);
assert.equal(interactivePlan.interactive_policy.executes_lifecycle_actions, false);
assert.doesNotMatch(JSON.stringify(interactivePlan), privilegedPublicTerms);
assert.doesNotMatch(JSON.stringify(interactivePlan), hostPathTerms);
assert.doesNotMatch(JSON.stringify(interactivePlan), trustedRuntimeRootTerms);
assert.doesNotMatch(JSON.stringify(interactivePlan), secretTerms);
assert.doesNotMatch(JSON.stringify(interactivePlan), transportOverclaimTerms);

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
  { client, project_root: projectRoot, actor: "goal3-task230" }
);

assert.equal(
  registeredTools.has("comath.release.piCodexLifecycleOperatorServiceTransportContinuity"),
  true,
  "Pi runtime must expose operator/service transport continuity as an executable tool"
);
assert.equal(commands.has("cm:release"), true, "Pi runtime must expose /cm:release for operator/service transport continuity");

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
    "lifecycle-operator-service-transport-continuity",
    "--project-id PRJ-2300",
    "--continuity-id LIFE-TRANSPORT-CONTINUITY-0230-CMD",
    "--transport-contract-id LIFE-TRANSPORT-CONTRACT-0230",
    "--transport-contract-path .comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-CONTRACT-0230/operator-service-transport-contract.json",
    `--transport-contract-sha256 ${"c".repeat(64)}`,
    "--max-bytes 1024",
    "--max-events 1",
    "--retry-ms 500",
    "--service-transport-primitive node_http_agent_run_log_session_route",
    "--client-transport-primitive pi_fetch_get_text"
  ].join(" "),
  ctx
);

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/release/pi-codex-lifecycle/operator-service-transport-continuity");
assert.equal(calls.at(-1).body.confirmation_id, undefined, "runtime command must not forward confirmation ids");
assert.equal(calls.at(-1).body.project_root, projectRoot);
assert.equal(calls.at(-1).body.project_id, "PRJ-2300");
assert.equal(calls.at(-1).body.actor, "goal3-task230");
assert.equal(calls.at(-1).body.continuity_id, "LIFE-TRANSPORT-CONTINUITY-0230-CMD");
assert.equal(calls.at(-1).body.transport_contract_id, "LIFE-TRANSPORT-CONTRACT-0230");
assert.equal(calls.at(-1).body.transport_contract_sha256, "c".repeat(64));
assert.equal(calls.at(-1).body.max_bytes, 1024);
assert.equal(calls.at(-1).body.max_events, 1);
assert.equal(calls.at(-1).body.retry_ms, 500);
assert.equal(confirmationPrompts.length, 1, "operator/service transport continuity command must require Pi host confirmation");
assert.doesNotMatch(confirmationPrompts[0].body, privilegedPublicTerms);
assert.doesNotMatch(confirmationPrompts[0].body, hostPathTerms);
assert.doesNotMatch(confirmationPrompts[0].body, trustedRuntimeRootTerms);
assert.doesNotMatch(confirmationPrompts[0].body, secretTerms);
assert.doesNotMatch(confirmationPrompts[0].body, transportOverclaimTerms);
assert.equal(notifications.length, 1, "operator/service transport continuity command must notify the Pi host");
assert.doesNotMatch(notifications[0].message, privilegedPublicTerms);
assert.doesNotMatch(notifications[0].message, hostPathTerms);
assert.doesNotMatch(notifications[0].message, trustedRuntimeRootTerms);
assert.doesNotMatch(notifications[0].message, secretTerms);
assert.doesNotMatch(notifications[0].message, transportOverclaimTerms);

const callsBeforeMissingCommandHash = calls.length;
await assert.rejects(
  () =>
    commands.get("cm:release")(
      [
        "lifecycle-operator-service-transport-continuity",
        "--project-id PRJ-2300",
        "--continuity-id LIFE-TRANSPORT-CONTINUITY-0230-CMD-NO-HASH",
        "--transport-contract-id LIFE-TRANSPORT-CONTRACT-0230"
      ].join(" "),
      ctx
    ),
  /transport_contract_sha256 is required/
);
assert.equal(calls.length, callsBeforeMissingCommandHash, "missing command contract hash must not POST to comathd");

console.log("Goal 3 Task230 Pi operator/service transport continuity consumer tests passed.");
