import assert from "node:assert/strict";
import registerComathPiRuntime, { createComathTools, executeComathTool, runtime_registration } from "../dist/index.js";

const projectRoot = "D:/research/project";
const privilegedPublicTerms =
  /clean_replay_passed|completed_formal_proof|formally_checked|proven|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence|proof_success|kernel_checked/i;
const hostPathTerms = /D:\\|D:\//i;
const secretTerms = /COMATH_CODEX_API_KEY|OPENAI_API_KEY|Authorization:\s*Bearer|api_key|token=|plain-token|sk-/i;
const transportOverclaimTerms =
  /long[- ]lived\s+(?:websocket|sse)|indefinite\s+sse|terminal transport recovered live|durable transport provided/i;

function toolDescriptor(name) {
  const tool = createComathTools().find((descriptor) => descriptor.name === name);
  assert.ok(tool, `${name} must be registered for Pi operator/service maintained transport contract`);
  return tool;
}

const contractTool = toolDescriptor("comath.release.piCodexLifecycleOperatorServiceTransportContract");
assert.equal(contractTool.mutates, true, "operator/service transport contract writes service-owned evidence");
assert.deepEqual(contractTool.input_schema.required, [
  "project_root",
  "project_id",
  "actor",
  "terminal_review_id",
  "confirmation_id"
]);
assert.equal(contractTool.input_schema.properties.service_transport_primitive.enum.includes("node_http_agent_run_log_session_route"), true);
assert.equal(contractTool.input_schema.properties.client_transport_primitive.enum.includes("pi_fetch_get_text"), true);

const releaseCommand = runtime_registration.commands.find((command) => command.command === "/cm:release");
assert.ok(releaseCommand, "/cm:release must be advertised in Pi runtime registration");
assert.equal(releaseCommand.subcommands.includes("lifecycle-operator-service-transport-contract"), true);

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
      contract: {
        schema_version: "comath.pi_codex_operator_service_transport_contract.v1",
        project_id: body.project_id,
        transport_contract_id: body.transport_contract_id,
        terminal_review_id: body.terminal_review_id,
        transport_heartbeat_id: "LIFE-TRANSPORT-HEARTBEAT-0226",
        service_transport_primitive: "node_http_agent_run_log_session_route",
        client_transport_primitive: "pi_fetch_get_text",
        service_route: "/agent/run/RUN-TASK226/log-session",
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

const directResult = await executeComathTool(client, "comath.release.piCodexLifecycleOperatorServiceTransportContract", {
  project_root: projectRoot,
  project_id: "PRJ-2260",
  actor: "goal3-task226 OPENAI_API_KEY=plain-token long-lived SSE",
  transport_contract_id: "LIFE-TRANSPORT-CONTRACT-0226",
  terminal_review_id: "LIFE-TERMINAL-REVIEW-0226",
  terminal_review_path:
    ".comath/release/pi-codex-lifecycle/LIFE-TERMINAL-REVIEW-0226/terminal-execution-review.json",
  max_bytes: 2048,
  max_events: 2,
  retry_ms: 600,
  service_transport_primitive: "node_http_agent_run_log_session_route",
  client_transport_primitive: "pi_fetch_get_text",
  confirmation_id: "CONF-TASK226-TRANSPORT-CONTRACT"
});

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/release/pi-codex-lifecycle/operator-service-transport-contract");
assert.equal(calls.at(-1).body.confirmation_id, undefined, "Pi must not forward model-supplied confirmation ids");
assert.deepEqual(calls.at(-1).body, {
  project_root: projectRoot,
  project_id: "PRJ-2260",
  actor: "goal3-task226 [redacted_secret] bounded_transport_checkpoint_only",
  transport_contract_id: "LIFE-TRANSPORT-CONTRACT-0226",
  terminal_review_id: "LIFE-TERMINAL-REVIEW-0226",
  terminal_review_path:
    ".comath/release/pi-codex-lifecycle/LIFE-TERMINAL-REVIEW-0226/terminal-execution-review.json",
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
assert.equal(directResult.contract.can_promote_claim, false, "direct result must not surface promotion overclaims");
assert.equal(directResult.contract.can_certify_ga, false, "direct result must not surface GA-certification overclaims");
assert.equal(
  directResult.contract.durable_transport_provided,
  false,
  "direct result must not surface durable-transport overclaims"
);
assert.equal(directResult.contract.live_transport_open, false, "direct result must not surface live transport overclaims");
assert.equal(
  directResult.contract.indefinite_stream_open,
  false,
  "direct result must not surface indefinite-stream overclaims"
);
assert.equal(
  directResult.contract.long_lived_websocket_provided,
  false,
  "direct result must not surface long-lived websocket overclaims"
);
assert.equal(
  directResult.contract.long_lived_sse_provided,
  false,
  "direct result must not surface long-lived SSE overclaims"
);
assert.equal(
  directResult.contract.pi_direct_write_allowed,
  false,
  "direct result must not surface Pi direct-write overclaims"
);
assert.equal(
  directResult.contract.direct_trusted_state_mutation,
  false,
  "direct result must not surface direct trusted-state mutation overclaims"
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
  { client, project_root: projectRoot, actor: "goal3-task226" }
);

assert.equal(
  registeredTools.has("comath.release.piCodexLifecycleOperatorServiceTransportContract"),
  true,
  "Pi runtime must expose operator/service transport contract as an executable tool"
);
assert.equal(commands.has("cm:release"), true, "Pi runtime must expose /cm:release for operator/service transport contract");

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
    "lifecycle-operator-service-transport-contract",
    "--project-id PRJ-2260",
    "--transport-contract-id LIFE-TRANSPORT-CONTRACT-0226-CMD",
    "--terminal-review-id LIFE-TERMINAL-REVIEW-0226",
    "--terminal-review-path .comath/release/pi-codex-lifecycle/LIFE-TERMINAL-REVIEW-0226/terminal-execution-review.json",
    "--max-bytes 1024",
    "--max-events 1",
    "--retry-ms 500",
    "--service-transport-primitive node_http_agent_run_log_session_route",
    "--client-transport-primitive pi_fetch_get_text"
  ].join(" "),
  ctx
);

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/release/pi-codex-lifecycle/operator-service-transport-contract");
assert.equal(calls.at(-1).body.confirmation_id, undefined, "runtime command must not forward confirmation ids");
assert.equal(calls.at(-1).body.project_root, projectRoot);
assert.equal(calls.at(-1).body.project_id, "PRJ-2260");
assert.equal(calls.at(-1).body.actor, "goal3-task226");
assert.equal(calls.at(-1).body.transport_contract_id, "LIFE-TRANSPORT-CONTRACT-0226-CMD");
assert.equal(calls.at(-1).body.terminal_review_id, "LIFE-TERMINAL-REVIEW-0226");
assert.equal(calls.at(-1).body.max_bytes, 1024);
assert.equal(calls.at(-1).body.max_events, 1);
assert.equal(calls.at(-1).body.retry_ms, 500);
assert.equal(confirmationPrompts.length, 1, "operator/service transport contract command must require Pi host confirmation");
assert.doesNotMatch(confirmationPrompts[0].body, privilegedPublicTerms);
assert.doesNotMatch(confirmationPrompts[0].body, hostPathTerms);
assert.doesNotMatch(confirmationPrompts[0].body, secretTerms);
assert.doesNotMatch(confirmationPrompts[0].body, transportOverclaimTerms);
assert.equal(notifications.length, 1, "operator/service transport contract command must notify the Pi host");
assert.doesNotMatch(notifications[0].message, privilegedPublicTerms);
assert.doesNotMatch(notifications[0].message, hostPathTerms);
assert.doesNotMatch(notifications[0].message, secretTerms);
assert.doesNotMatch(notifications[0].message, transportOverclaimTerms);

console.log("Goal 3 Task226 Pi operator/service transport contract consumer tests passed.");
