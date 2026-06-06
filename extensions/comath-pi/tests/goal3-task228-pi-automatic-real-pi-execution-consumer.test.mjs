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
  assert.ok(tool, `${name} must be registered for automatic real-Pi lifecycle orchestration`);
  return tool;
}

const automaticTool = toolDescriptor("comath.release.piCodexLifecycleAutomaticRealPiExecution");
assert.equal(automaticTool.mutates, true, "automatic real-Pi orchestration writes service-owned checkpoint evidence");
assert.deepEqual(automaticTool.input_schema.required, [
  "project_root",
  "project_id",
  "actor",
  "runtime_probe",
  "operator_session",
  "transport_recovery",
  "transport_lease",
  "transport_heartbeat",
  "guided_execution",
  "transport_contract",
  "confirmation_id"
]);
assert.equal(automaticTool.input_schema.properties.runtime_probe.properties.commands.required.includes("install"), true);
assert.equal(
  automaticTool.input_schema.properties.transport_contract.properties.service_transport_primitive.enum.includes(
    "node_http_agent_run_log_session_route"
  ),
  true
);
assert.equal(
  automaticTool.input_schema.properties.transport_contract.properties.client_transport_primitive.enum.includes(
    "pi_fetch_get_text"
  ),
  true
);

const releaseCommand = runtime_registration.commands.find((command) => command.command === "/cm:release");
assert.ok(releaseCommand, "/cm:release must be advertised in Pi runtime registration");
assert.equal(releaseCommand.subcommands.includes("lifecycle-automatic-real-pi-execution"), true);

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
      orchestration: {
        schema_version: "comath.pi_codex_lifecycle_automatic_real_pi_execution.v1",
        project_id: body.project_id,
        orchestration_id: body.orchestration_id,
        orchestration_status: "automatic_real_pi_checkpoint_chain_recorded",
        checkpoint_order: [
          "real_pi_runtime_probe",
          "operator_session_manifest",
          "operator_transport_recovery_checkpoint",
          "bounded_operator_transport_lease",
          "operator_transport_heartbeat_rebind",
          "guided_real_pi_execution",
          "terminal_execution_review",
          "operator_service_transport_contract"
        ],
        service_route: "/agent/run/RUN-TASK228/log-session",
        service_transport_primitive: "node_http_agent_run_log_session_route",
        client_transport_primitive: "pi_fetch_get_text",
        automatic_real_pi_orchestration_completed: true,
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

const runtimeProbe = {
  probe_id: "LIFE-PI-RUNTIME-0228",
  pi_host_label: "pi-host-lab-01",
  session_kind: "real_pi_host_automated_install",
  timeout_ms: 5000,
  commands: {
    install: {
      program: "D:/tools/pi-install.exe",
      args: ["install", "OPENAI_API_KEY=plain-token", "proof_success durable transport provided"],
      timeout_ms: 5000
    },
    runtime_registration: {
      program: "D:/tools/pi-runtime.exe",
      args: ["runtime_registration", "Authorization: Bearer plain-token", "long-lived SSE"],
      timeout_ms: 5000
    },
    host_confirmation: {
      program: "D:/tools/pi-confirm.exe",
      args: ["host_confirmation", "sk-task228-secret", "clean_replay_passed"],
      timeout_ms: 5000
    }
  }
};

const sanitizedRuntimeProbe = {
  probe_id: "LIFE-PI-RUNTIME-0228",
  pi_host_label: "pi-host-lab-01",
  session_kind: "real_pi_host_automated_install",
  timeout_ms: 5000,
  commands: {
    install: {
      program: "[redacted_host_path]",
      args: ["install", "[redacted_secret]", "unverified_formal_status bounded_transport_checkpoint_only"],
      timeout_ms: 5000
    },
    runtime_registration: {
      program: "[redacted_host_path]",
      args: ["runtime_registration", "[redacted_secret]", "bounded_transport_checkpoint_only"],
      timeout_ms: 5000
    },
    host_confirmation: {
      program: "[redacted_host_path]",
      args: ["host_confirmation", "[redacted_secret]", "unverified_formal_status"],
      timeout_ms: 5000
    }
  }
};

const directResult = await executeComathTool(client, "comath.release.piCodexLifecycleAutomaticRealPiExecution", {
  project_root: projectRoot,
  project_id: "PRJ-2280",
  orchestration_id: "LIFE-AUTO-REAL-PI-0228",
  actor: "goal3-task228 OPENAI_API_KEY=plain-token long-lived SSE",
  runtime_probe: runtimeProbe,
  operator_session: {
    session_id: "LIFE-OP-SESSION-0228",
    session_status: "recoverable_operator_session",
    operator_cursor: "stdout:0 token=plain-token",
    completed_steps: ["real_pi_install_runtime_probe"],
    last_result_summary: {
      summary: "proof_success from D:/research/project and durable transport provided"
    }
  },
  transport_recovery: {
    transport_recovery_id: "LIFE-TRANSPORT-0228",
    transport_kind: "bounded_sse_snapshot",
    observed_route: "/agent/run/RUN-TASK228/log-session Authorization: Bearer plain-token durable transport provided",
    requested_cursor: {
      operator_event_cursor: "event:7",
      stdout_cursor: "stdout:0",
      stderr_cursor: "stderr:0 clean_replay_passed"
    },
    client_epoch: 7,
    last_seen_event_id: "evt-7 token=plain-token",
    reconnect_reason: "automatic real-Pi lifecycle checkpoint recovery"
  },
  transport_lease: {
    transport_lease_id: "LIFE-TRANSPORT-LEASE-0228",
    transport_kind: "bounded_live_sse_lease",
    lease_route: "/agent/run/RUN-TASK228/log-session token=plain-token long-lived SSE",
    requested_cursor: {
      operator_event_cursor: "event:8",
      stdout_cursor: "stdout:0",
      stderr_cursor: "stderr:0"
    },
    client_epoch: 8,
    heartbeat_interval_ms: 10000,
    lease_ttl_ms: 60000,
    last_seen_event_id: "evt-8",
    open_reason: "bounded lease during automatic real-Pi checkpoint orchestration"
  },
  transport_heartbeat: {
    transport_heartbeat_id: "LIFE-TRANSPORT-HEARTBEAT-0228",
    requested_cursor: {
      operator_event_cursor: "event:9",
      stdout_cursor: "stdout:0",
      stderr_cursor: "stderr:0"
    },
    client_epoch: 9,
    last_seen_event_id: "evt-9",
    heartbeat_reason: "bounded heartbeat during automatic real-Pi checkpoint orchestration"
  },
  guided_execution: {
    execution_id: "LIFE-GUIDED-EXEC-0228",
    observed_routes: ["/cm:release lifecycle-operator-transport-heartbeat"],
    operator_command_summary:
      "automatic orchestrator recorded service-owned real-Pi checkpoint chain at D:/research/project sk-task228",
    final_operator_cursor: {
      operator_event_cursor: "event:10 Authorization: Bearer plain-token",
      stdout_cursor: "stdout:512 long-lived websocket",
      stderr_cursor: "stderr:0 formal_replay_passed indefinite SSE"
    },
    execution_outcome: "operator_guided_run_observed",
    next_recommended_route: "/release/pi-codex-lifecycle/terminal-execution-review"
  },
  terminal_review: {
    review_id: "LIFE-TERMINAL-REVIEW-0228"
  },
  transport_contract: {
    transport_contract_id: "LIFE-TRANSPORT-CONTRACT-0228",
    max_bytes: 4096,
    max_events: 2,
    retry_ms: 750,
    service_transport_primitive: "node_http_agent_run_log_session_route",
    client_transport_primitive: "pi_fetch_get_text"
  },
  confirmation_id: "CONF-TASK228-AUTO-REAL-PI"
});

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/release/pi-codex-lifecycle/automatic-real-pi-execution");
assert.equal(calls.at(-1).body.confirmation_id, undefined, "Pi must not forward model-supplied confirmation ids");
assert.equal(calls.at(-1).body.project_root, projectRoot);
assert.equal(calls.at(-1).body.project_id, "PRJ-2280");
assert.equal(calls.at(-1).body.orchestration_id, "LIFE-AUTO-REAL-PI-0228");
assert.equal(calls.at(-1).body.actor, "goal3-task228 [redacted_secret] bounded_transport_checkpoint_only");
assert.deepEqual(calls.at(-1).body.runtime_probe, sanitizedRuntimeProbe);
assert.equal(calls.at(-1).body.operator_session.session_id, "LIFE-OP-SESSION-0228");
assert.equal(calls.at(-1).body.transport_recovery.transport_recovery_id, "LIFE-TRANSPORT-0228");
assert.equal(calls.at(-1).body.transport_lease.transport_lease_id, "LIFE-TRANSPORT-LEASE-0228");
assert.equal(calls.at(-1).body.transport_heartbeat.transport_heartbeat_id, "LIFE-TRANSPORT-HEARTBEAT-0228");
assert.equal(calls.at(-1).body.guided_execution.execution_id, "LIFE-GUIDED-EXEC-0228");
assert.equal(calls.at(-1).body.terminal_review.review_id, "LIFE-TERMINAL-REVIEW-0228");
assert.equal(calls.at(-1).body.transport_contract.transport_contract_id, "LIFE-TRANSPORT-CONTRACT-0228");
assert.doesNotMatch(JSON.stringify(calls.at(-1).body), secretTerms, "Pi request body must not forward secrets");
assert.doesNotMatch(
  JSON.stringify({ ...calls.at(-1).body, project_root: "[project_root]" }),
  hostPathTerms,
  "Pi request body must not forward host path echoes outside required project_root"
);
assert.doesNotMatch(JSON.stringify(calls.at(-1).body), privilegedPublicTerms, "Pi request body must not forward proof-success vocabulary");
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
assert.equal(directResult.orchestration.can_promote_claim, false, "direct result must not surface promotion overclaims");
assert.equal(directResult.orchestration.can_certify_ga, false, "direct result must not surface GA-certification overclaims");
assert.equal(
  directResult.orchestration.durable_transport_provided,
  false,
  "direct result must not surface durable-transport overclaims"
);
assert.equal(directResult.orchestration.live_transport_open, false, "direct result must not surface live transport overclaims");
assert.equal(
  directResult.orchestration.indefinite_stream_open,
  false,
  "direct result must not surface indefinite-stream overclaims"
);
assert.equal(
  directResult.orchestration.long_lived_websocket_provided,
  false,
  "direct result must not surface long-lived websocket overclaims"
);
assert.equal(
  directResult.orchestration.long_lived_sse_provided,
  false,
  "direct result must not surface long-lived SSE overclaims"
);
assert.equal(
  directResult.orchestration.pi_direct_write_allowed,
  false,
  "direct result must not surface Pi direct-write overclaims"
);
assert.equal(
  directResult.orchestration.direct_trusted_state_mutation,
  false,
  "direct result must not surface direct trusted-state mutation overclaims"
);

const interactiveTool = toolDescriptor("comath.release.piCodexLifecycleInteractiveRealPi");
assert.equal(
  interactiveTool.input_schema.properties.completed_steps.items.enum.includes(
    "lifecycle-automatic-real-pi-execution"
  ),
  true,
  "interactive real-Pi planner must advertise the automatic orchestration checkpoint"
);
const interactivePlan = await executeComathTool(client, "comath.release.piCodexLifecycleInteractiveRealPi", {
  project_id: "PRJ-2280",
  actor: "goal3-task228",
  pi_host_label: "pi-host-lab-01",
  session_id: "LIFE-OP-SESSION-0228",
  action: "resume-plan",
  completed_steps: [
    "run-real-pi-runtime-probe",
    "lifecycle-operator-session",
    "lifecycle-operator-transport-recovery",
    "lifecycle-operator-transport-lease",
    "lifecycle-operator-transport-heartbeat",
    "lifecycle-guided-real-pi-execution",
    "lifecycle-operator-service-transport-contract"
  ],
  orchestration_id: "LIFE-AUTO-REAL-PI-0228",
  transport_contract_id: "LIFE-TRANSPORT-CONTRACT-0228",
  last_result_summary: "proof_success from D:/research/project with sk-should-not-leak long-lived SSE"
});
assert.equal(calls.length, 1, "interactive planner must remain read-only and must not call comathd");
assert.equal(interactivePlan.next_action.action_id, "lifecycle-automatic-real-pi-execution");
assert.match(interactivePlan.next_action.command, /\/cm:release lifecycle-automatic-real-pi-execution/);
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
  { client, project_root: projectRoot, actor: "goal3-task228" }
);

assert.equal(
  registeredTools.has("comath.release.piCodexLifecycleAutomaticRealPiExecution"),
  true,
  "Pi runtime must expose automatic real-Pi orchestration as an executable tool"
);
assert.equal(commands.has("cm:release"), true, "Pi runtime must expose /cm:release for automatic real-Pi orchestration");

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
    "lifecycle-automatic-real-pi-execution",
    "--project-id PRJ-2280",
    "--orchestration-id LIFE-AUTO-REAL-PI-0228-CMD",
    "--runtime-probe-json",
    `'${JSON.stringify(runtimeProbe)}'`,
    "--operator-session-json",
    `'${JSON.stringify({ session_id: "LIFE-OP-SESSION-0228", session_status: "recoverable_operator_session" })}'`,
    "--transport-recovery-json",
    `'${JSON.stringify({ transport_recovery_id: "LIFE-TRANSPORT-0228", transport_kind: "bounded_sse_snapshot" })}'`,
    "--transport-lease-json",
    `'${JSON.stringify({ transport_lease_id: "LIFE-TRANSPORT-LEASE-0228", transport_kind: "bounded_live_sse_lease" })}'`,
    "--transport-heartbeat-json",
    `'${JSON.stringify({ transport_heartbeat_id: "LIFE-TRANSPORT-HEARTBEAT-0228", client_epoch: 9 })}'`,
    "--guided-execution-json",
    `'${JSON.stringify({ execution_id: "LIFE-GUIDED-EXEC-0228", execution_outcome: "operator_guided_run_observed" })}'`,
    "--terminal-review-json",
    `'${JSON.stringify({ review_id: "LIFE-TERMINAL-REVIEW-0228" })}'`,
    "--transport-contract-json",
    `'${JSON.stringify({
      transport_contract_id: "LIFE-TRANSPORT-CONTRACT-0228",
      service_transport_primitive: "node_http_agent_run_log_session_route",
      client_transport_primitive: "pi_fetch_get_text"
    })}'`
  ].join(" "),
  ctx
);

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/release/pi-codex-lifecycle/automatic-real-pi-execution");
assert.equal(calls.at(-1).body.confirmation_id, undefined, "runtime command must not forward confirmation ids");
assert.equal(calls.at(-1).body.project_root, projectRoot);
assert.equal(calls.at(-1).body.project_id, "PRJ-2280");
assert.equal(calls.at(-1).body.actor, "goal3-task228");
assert.equal(calls.at(-1).body.orchestration_id, "LIFE-AUTO-REAL-PI-0228-CMD");
assert.equal(calls.at(-1).body.runtime_probe.probe_id, "LIFE-PI-RUNTIME-0228");
assert.equal(calls.at(-1).body.operator_session.session_id, "LIFE-OP-SESSION-0228");
assert.equal(calls.at(-1).body.transport_recovery.transport_recovery_id, "LIFE-TRANSPORT-0228");
assert.equal(calls.at(-1).body.transport_lease.transport_lease_id, "LIFE-TRANSPORT-LEASE-0228");
assert.equal(calls.at(-1).body.transport_heartbeat.transport_heartbeat_id, "LIFE-TRANSPORT-HEARTBEAT-0228");
assert.equal(calls.at(-1).body.guided_execution.execution_id, "LIFE-GUIDED-EXEC-0228");
assert.equal(calls.at(-1).body.terminal_review.review_id, "LIFE-TERMINAL-REVIEW-0228");
assert.equal(calls.at(-1).body.transport_contract.transport_contract_id, "LIFE-TRANSPORT-CONTRACT-0228");
assert.equal(confirmationPrompts.length, 1, "automatic real-Pi orchestration command must require Pi host confirmation");
assert.doesNotMatch(confirmationPrompts[0].body, privilegedPublicTerms);
assert.doesNotMatch(confirmationPrompts[0].body, hostPathTerms);
assert.doesNotMatch(confirmationPrompts[0].body, trustedRuntimeRootTerms);
assert.doesNotMatch(confirmationPrompts[0].body, secretTerms);
assert.doesNotMatch(confirmationPrompts[0].body, transportOverclaimTerms);
assert.equal(notifications.length, 1, "automatic real-Pi orchestration command must notify the Pi host");
assert.doesNotMatch(notifications[0].message, privilegedPublicTerms);
assert.doesNotMatch(notifications[0].message, hostPathTerms);
assert.doesNotMatch(notifications[0].message, trustedRuntimeRootTerms);
assert.doesNotMatch(notifications[0].message, secretTerms);
assert.doesNotMatch(notifications[0].message, transportOverclaimTerms);

console.log("Goal 3 Task228 Pi automatic real-Pi execution consumer tests passed.");
