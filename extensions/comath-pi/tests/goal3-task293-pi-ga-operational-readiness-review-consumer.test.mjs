import assert from "node:assert/strict";
import registerComathPiRuntime, { createComathTools, executeComathTool, runtime_registration } from "../dist/index.js";

const projectRoot = "D:/research/project";
const toolName = "comath.release.goal3GaOperationalReadinessReview";
const interactiveToolName = "comath.release.piCodexLifecycleInteractiveRealPi";
const subcommand = "goal3-ga-operational-readiness-review";
const route = "/release/goal3/ga-operational-readiness-review";
const privilegedPublicTerms =
  /clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence|proof_success|kernel_checked/i;
const hostPathTerms = /D:\\|D:\/|\/home\/pi|\/root\//i;
const trustedRuntimeRootTerms = /\.comath[\\/]|%2ecomath/i;
const secretTerms = /COMATH_CODEX_API_KEY|OPENAI_API_KEY|Authorization:\s*Bearer|api_key|token=|plain-token|sk-/i;
const transportOverclaimTerms =
  /long[- ]lived\s+(?:websocket|sse)|indefinite\s+sse|durable transport provided|live transport open/i;
const gaOverclaimTerms = /GA certified|can certify GA|can_certify_ga\s*[:=]\s*(?:true|1)|canCertifyGa\s*[:=]\s*(?:true|1)/i;
const executorLeakTerms =
  /executor_command|execution_attempt_command|attempt_result\b|execution_attempt_result|execution_attempt_result_path|execution_attempt_result_artifact|completion_certificate_json|caller_completion_certificate|ga_certificate|proof_claim/i;

function toolDescriptor(name) {
  const tool = createComathTools().find((descriptor) => descriptor.name === name);
  assert.ok(tool, `${name} must be registered for Goal 3 GA operational readiness review`);
  return tool;
}

function assertPublicNonAuthoritySanitized(value, scope) {
  const serialized = JSON.stringify(value);
  assert.doesNotMatch(serialized, privilegedPublicTerms, `${scope} must sanitize proof authority wording`);
  assert.doesNotMatch(serialized, hostPathTerms, `${scope} must sanitize host paths`);
  assert.doesNotMatch(serialized, trustedRuntimeRootTerms, `${scope} must sanitize trusted runtime roots`);
  assert.doesNotMatch(serialized, secretTerms, `${scope} must sanitize secrets`);
  assert.doesNotMatch(serialized, transportOverclaimTerms, `${scope} must sanitize transport overclaims`);
  assert.doesNotMatch(serialized, gaOverclaimTerms, `${scope} must sanitize GA overclaims`);
  assert.doesNotMatch(serialized, executorLeakTerms, `${scope} must sanitize executor/caller material`);
}

const readinessTool = toolDescriptor(toolName);
assert.equal(readinessTool.mutates, true, "Goal 3 operational readiness consumer writes service-owned evidence");
assert.deepEqual(readinessTool.input_schema.required, [
  "project_root",
  "project_id",
  "actor",
  "transport_closure_review_id",
  "transport_closure_review_path",
  "transport_closure_review_sha256",
  "adapter_os_isolation_review_id",
  "adapter_os_isolation_review_path",
  "adapter_os_isolation_review_sha256",
  "confirmation_id"
]);
for (const forbidden of [
  "executor_command",
  "attempt_result",
  "completion_certificate",
  "ga_certificate",
  "proof_claim",
  "lean_replay_manifest",
  "durable_transport_session"
]) {
  assert.equal(
    Object.hasOwn(readinessTool.input_schema.properties, forbidden),
    false,
    `Pi GA operational readiness consumer must not expose ${forbidden}`
  );
}
assert.deepEqual(readinessTool.input_schema.properties.requested_review_mode.enum, [
  "open_formal_workbench_ga_operational_readiness"
]);

const interactiveTool = toolDescriptor(interactiveToolName);
assert.equal(
  interactiveTool.input_schema.properties.completed_steps.items.enum.includes(subcommand),
  true,
  "interactive real-Pi planner must advertise GA operational readiness review after transport closure review"
);

const releaseCommand = runtime_registration.commands.find((command) => command.command === "/cm:release");
assert.ok(releaseCommand, "/cm:release must be advertised in Pi runtime registration");
assert.equal(releaseCommand.subcommands.includes(subcommand), true);

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
      operational_readiness_review: {
        schema_version: "comath.goal3_ga_operational_readiness_review.v1",
        operational_readiness_review_id: body.operational_readiness_review_id,
        project_id: body.project_id,
        actor: body.actor,
        ok: true,
        operational_readiness_status: "ready_for_ga_release_candidate_review",
        operational_readiness_review_path:
          "D:/research/project/.comath/release/goal3-ga-operational-readiness/GOAL3-GA-OPERATIONAL-READINESS-0293/review.json token=plain-token",
        transport_closure_review_id: body.transport_closure_review_id,
        transport_closure_review_path:
          "D:/research/project/.comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-CLOSURE-REVIEW-0293/operator-service-transport-closure-review.json",
        transport_closure_review_current: true,
        terminal_unattended_completion_certified: true,
        terminalUnattendedCompletionCertified: true,
        completion_certificate_available: true,
        completionCertificateAvailable: true,
        unattended_real_host_execution_completed: true,
        unattendedRealHostExecutionCompleted: true,
        maintained_transport_primitive_bound: true,
        maintainedTransportPrimitiveBound: true,
        service_transport_primitive: "node_http_agent_run_log_session_route",
        client_transport_primitive: "pi_fetch_get_text",
        durable_transport_provided: true,
        durableTransportProvided: true,
        live_transport_open: true,
        liveTransportOpen: true,
        adapter_os_isolation_review_id: body.adapter_os_isolation_review_id,
        adapter_os_isolation_review_path:
          "D:/research/project/.comath/release/agent-adapter-os-isolation/ADAPTER-OSISO-0293/review.json",
        adapter_os_isolation_review_current: true,
        adapter_os_isolation_status: "ready_for_os_isolation_release_review",
        adapter_os_enforced: true,
        adapter_os_isolation_required_for_ga: true,
        proof_authority: "lean_kernel_clean_replay",
        proofAuthority: "lean_kernel_clean_replay",
        can_promote_claim: true,
        canPromoteClaim: true,
        can_certify_ga: true,
        canCertifyGa: true,
        ga_certification_gate_separate: true,
        request_echo: {
          confirmation_id: "CONF-SHOULD-NOT-FORWARD",
          executor_command: { program: "D:/unsafe/executor.exe" },
          proof_claim: { status: "caller-supplied-proof" },
          ga_certificate: { status: "caller-supplied-ga" },
          durable_transport_session: { status: "caller-supplied-session" },
          proof_authority: "lean_kernel_clean_replay",
          durable_transport_provided: true,
          can_certify_ga: true
        },
        summary:
          "GA certified after proof_success from D:/research/project with Authorization: Bearer plain-token and durable transport provided; live transport open; can certify GA"
      }
    };
  }
};

const directReadiness = await executeComathTool(client, toolName, {
  project_root: projectRoot,
  project_id: "PRJ-2930",
  actor:
    "goal3-task293 OPENAI_API_KEY=plain-token proof_success durable transport provided GA certified can_certify_ga=true",
  operational_readiness_review_id: "GOAL3-GA-OPERATIONAL-READINESS-0293",
  transport_closure_review_id: "LIFE-TRANSPORT-CLOSURE-REVIEW-0293",
  transport_closure_review_path:
    "service-owned-pi-lifecycle/LIFE-TRANSPORT-CLOSURE-REVIEW-0293/operator-service-transport-closure-review.json",
  transport_closure_review_sha256: "a".repeat(64),
  adapter_os_isolation_review_id: "ADAPTER-OSISO-0293",
  adapter_os_isolation_review_path: "service-owned-agent-adapter-os-isolation/ADAPTER-OSISO-0293/review.json",
  adapter_os_isolation_review_sha256: "b".repeat(64),
  requested_review_mode: "open_formal_workbench_ga_operational_readiness",
  executor_command: { program: "D:/unsafe/executor.exe" },
  proof_claim: { status: "caller-supplied-proof" },
  ga_certificate: { status: "caller-supplied-ga" },
  durable_transport_session: { status: "caller-supplied-session" },
  confirmation_id: "CONF-TASK293-MUST-NOT-FORWARD"
});

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, route);
assert.equal(calls.at(-1).body.confirmation_id, undefined, "Pi must not forward model-supplied confirmation ids");
assert.equal(calls.at(-1).body.executor_command, undefined, "Pi must not forward public executor commands");
assert.equal(calls.at(-1).body.proof_claim, undefined, "Pi must not forward caller proof claims");
assert.equal(calls.at(-1).body.ga_certificate, undefined, "Pi must not forward caller GA certificates");
assert.equal(calls.at(-1).body.durable_transport_session, undefined, "Pi must not forward caller transport sessions");
assert.deepEqual(calls.at(-1).body, {
  project_root: projectRoot,
  project_id: "PRJ-2930",
  actor:
    "goal3-task293 [redacted_secret] unverified_formal_status bounded_transport_checkpoint_only prepared_checkpoint_handoff_only prepared_checkpoint_handoff_only",
  operational_readiness_review_id: "GOAL3-GA-OPERATIONAL-READINESS-0293",
  transport_closure_review_id: "LIFE-TRANSPORT-CLOSURE-REVIEW-0293",
  transport_closure_review_path:
    ".comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-CLOSURE-REVIEW-0293/operator-service-transport-closure-review.json",
  transport_closure_review_sha256: "a".repeat(64),
  adapter_os_isolation_review_id: "ADAPTER-OSISO-0293",
  adapter_os_isolation_review_path: ".comath/release/agent-adapter-os-isolation/ADAPTER-OSISO-0293/review.json",
  adapter_os_isolation_review_sha256: "b".repeat(64),
  requested_review_mode: "open_formal_workbench_ga_operational_readiness"
});
const {
  project_root: _serviceRequiredProjectRoot,
  transport_closure_review_path: _serviceRequiredTransportPath,
  adapter_os_isolation_review_path: _serviceRequiredAdapterPath,
  ...publicRequestAuditBody
} = calls.at(-1).body;
assertPublicNonAuthoritySanitized(publicRequestAuditBody, "Pi request body");

assertPublicNonAuthoritySanitized(directReadiness, "direct result");
assert.equal(directReadiness.operational_readiness_review.proof_authority, "none");
assert.equal(directReadiness.operational_readiness_review.proofAuthority, "none");
assert.equal(directReadiness.operational_readiness_review.can_promote_claim, false);
assert.equal(directReadiness.operational_readiness_review.canPromoteClaim, false);
assert.equal(directReadiness.operational_readiness_review.can_certify_ga, false);
assert.equal(directReadiness.operational_readiness_review.canCertifyGa, false);
assert.equal(directReadiness.operational_readiness_review.durable_transport_provided, false);
assert.equal(directReadiness.operational_readiness_review.durableTransportProvided, false);
assert.equal(directReadiness.operational_readiness_review.live_transport_open, false);
assert.equal(directReadiness.operational_readiness_review.liveTransportOpen, false);
assert.equal(directReadiness.operational_readiness_review.ga_certification_gate_separate, true);
assert.equal(directReadiness.operational_readiness_review.transport_closure_review_current, true);
assert.equal(directReadiness.operational_readiness_review.adapter_os_isolation_review_current, true);
assert.equal(directReadiness.operational_readiness_review.completion_certificate_available, true);
assert.equal(directReadiness.operational_readiness_review.completionCertificateAvailable, true);
assert.equal(directReadiness.operational_readiness_review.terminal_unattended_completion_certified, true);
assert.equal(directReadiness.operational_readiness_review.terminalUnattendedCompletionCertified, true);
assert.equal(directReadiness.operational_readiness_review.unattended_real_host_execution_completed, true);
assert.equal(directReadiness.operational_readiness_review.unattendedRealHostExecutionCompleted, true);
assert.equal(directReadiness.operational_readiness_review.maintained_transport_primitive_bound, true);
assert.equal(directReadiness.operational_readiness_review.maintainedTransportPrimitiveBound, true);
assert.equal(directReadiness.operational_readiness_review.adapter_os_enforced, true);
assert.equal(directReadiness.operational_readiness_review.adapter_os_isolation_required_for_ga, true);

await assert.rejects(
  () =>
    executeComathTool(client, toolName, {
      project_root: projectRoot,
      project_id: "PRJ-2930",
      actor: "goal3-task293 wrong adapter alias",
      transport_closure_review_id: "LIFE-TRANSPORT-CLOSURE-REVIEW-0293",
      transport_closure_review_path:
        "service-owned-pi-lifecycle/LIFE-TRANSPORT-CLOSURE-REVIEW-0293/operator-service-transport-closure-review.json",
      transport_closure_review_sha256: "a".repeat(64),
      adapter_os_isolation_review_id: "ADAPTER-OSISO-0293",
      adapter_os_isolation_review_path:
        "service-owned-agent-adapter-os-isolation/ADAPTER-OSISO-OTHER/review.json",
      adapter_os_isolation_review_sha256: "b".repeat(64),
      confirmation_id: "CONF-TASK293-WRONG-ALIAS"
    }),
  /adapter_os_isolation_review_path.*service-owned-agent-adapter-os-isolation/i,
  "GA operational readiness consumer must not translate mismatched adapter OS-isolation aliases"
);
assert.equal(calls.length, 1, "wrong public alias must fail before another service POST");

const readinessPlan = await executeComathTool(client, interactiveToolName, {
  project_id: "PRJ-2930",
  actor: "goal3-task293",
  pi_host_label: "pi-host-lab-01",
  session_id: "LIFE-OP-SESSION-0293",
  action: "resume-plan",
  completed_steps: [
    "run-real-pi-runtime-probe",
    "lifecycle-operator-session",
    "lifecycle-operator-transport-recovery",
    "lifecycle-operator-transport-lease",
    "lifecycle-operator-transport-heartbeat",
    "lifecycle-guided-real-pi-execution",
    "lifecycle-operator-service-transport-contract",
    "lifecycle-automatic-real-pi-execution",
    "lifecycle-operator-service-transport-continuity",
    "lifecycle-unattended-real-host-handoff-review",
    "lifecycle-unattended-real-host-operator-approval",
    "lifecycle-unattended-real-host-executor-contract",
    "lifecycle-unattended-real-host-durable-transport-contract",
    "lifecycle-unattended-real-host-execution-readiness",
    "lifecycle-unattended-real-host-execution-attempt",
    "lifecycle-unattended-real-host-execution-attempt-review",
    "lifecycle-unattended-real-host-completion-certification-prerequisite",
    "lifecycle-unattended-real-host-terminal-completion-certificate-design",
    "lifecycle-unattended-real-host-terminal-completion-certificate",
    "lifecycle-operator-service-transport-closure-review"
  ],
  operational_readiness_review_id: "GOAL3-GA-OPERATIONAL-READINESS-0293",
  transport_closure_review_id: "LIFE-TRANSPORT-CLOSURE-REVIEW-0293",
  transport_closure_review_path:
    "service-owned-pi-lifecycle/LIFE-TRANSPORT-CLOSURE-REVIEW-0293/operator-service-transport-closure-review.json",
  transport_closure_review_sha256: "a".repeat(64),
  adapter_os_isolation_review_id: "ADAPTER-OSISO-0293",
  adapter_os_isolation_review_path: "service-owned-agent-adapter-os-isolation/ADAPTER-OSISO-0293/review.json",
  adapter_os_isolation_review_sha256: "b".repeat(64),
  last_result_summary: "proof_success from D:/research/project with sk-should-not-leak GA certified long-lived SSE"
});
assert.equal(calls.length, 1, "interactive planner must remain read-only and must not call comathd");
assert.equal(readinessPlan.next_action.action_id, subcommand);
assert.match(readinessPlan.next_action.command, /\/cm:release goal3-ga-operational-readiness-review/);
assert.match(
  readinessPlan.next_action.command,
  /--operational-readiness-review-id GOAL3-GA-OPERATIONAL-READINESS-0293/
);
assert.match(readinessPlan.next_action.command, /--transport-closure-review-id LIFE-TRANSPORT-CLOSURE-REVIEW-0293/);
assert.match(readinessPlan.next_action.command, /--adapter-os-isolation-review-id ADAPTER-OSISO-0293/);
assert.match(readinessPlan.next_action.command, /--transport-closure-review-sha256 a{64}/);
assert.match(readinessPlan.next_action.command, /--adapter-os-isolation-review-sha256 b{64}/);
assert.doesNotMatch(readinessPlan.next_action.command, /executor-command|attempt-result|ga-certificate|proof-claim|D:\//i);
assert.equal(readinessPlan.next_action.requires_host_confirmation, true);
assert.equal(readinessPlan.next_action.auto_executes, false);
assert.equal(readinessPlan.interactive_policy.pi_tool_readonly, true);
assert.equal(readinessPlan.interactive_policy.writes_comath_state, false);
assert.equal(readinessPlan.interactive_policy.calls_comathd, false);
assert.equal(readinessPlan.interactive_policy.executes_lifecycle_actions, false);
assertPublicNonAuthoritySanitized(readinessPlan, "interactive planner");

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
  { client, project_root: projectRoot, actor: "goal3-task293" }
);

assert.equal(registeredTools.has(toolName), true, "Pi runtime must expose Goal 3 GA operational readiness tool");
assert.equal(commands.has("cm:release"), true, "Pi runtime must expose /cm:release for GA operational readiness");

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
    subcommand,
    "--project-id PRJ-2930",
    "--operational-readiness-review-id GOAL3-GA-OPERATIONAL-READINESS-0293-CMD",
    "--transport-closure-review-id LIFE-TRANSPORT-CLOSURE-REVIEW-0293",
    "--transport-closure-review-path service-owned-pi-lifecycle/LIFE-TRANSPORT-CLOSURE-REVIEW-0293/operator-service-transport-closure-review.json",
    `--transport-closure-review-sha256 ${"c".repeat(64)}`,
    "--adapter-os-isolation-review-id ADAPTER-OSISO-0293",
    "--adapter-os-isolation-review-path service-owned-agent-adapter-os-isolation/ADAPTER-OSISO-0293/review.json",
    `--adapter-os-isolation-review-sha256 ${"d".repeat(64)}`,
    "--requested-review-mode open_formal_workbench_ga_operational_readiness",
    "--proof-claim-json '{\"status\":\"caller-proof\"}'",
    "--ga-certificate-json '{\"status\":\"caller-ga\"}'",
    "--executor-command-program D:/unsafe/executor.exe"
  ].join(" "),
  ctx
);

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, route);
assert.equal(calls.at(-1).body.confirmation_id, undefined, "runtime command must not forward confirmation ids");
assert.equal(calls.at(-1).body.executor_command, undefined, "runtime command must not forward executor commands");
assert.equal(calls.at(-1).body.proof_claim, undefined, "runtime command must not forward proof claims");
assert.equal(calls.at(-1).body.ga_certificate, undefined, "runtime command must not forward caller GA certificates");
assert.deepEqual(calls.at(-1).body, {
  project_root: projectRoot,
  project_id: "PRJ-2930",
  actor: "goal3-task293",
  operational_readiness_review_id: "GOAL3-GA-OPERATIONAL-READINESS-0293-CMD",
  transport_closure_review_id: "LIFE-TRANSPORT-CLOSURE-REVIEW-0293",
  transport_closure_review_path:
    ".comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-CLOSURE-REVIEW-0293/operator-service-transport-closure-review.json",
  transport_closure_review_sha256: "c".repeat(64),
  adapter_os_isolation_review_id: "ADAPTER-OSISO-0293",
  adapter_os_isolation_review_path: ".comath/release/agent-adapter-os-isolation/ADAPTER-OSISO-0293/review.json",
  adapter_os_isolation_review_sha256: "d".repeat(64),
  requested_review_mode: "open_formal_workbench_ga_operational_readiness"
});
assert.equal(confirmationPrompts.length, 1, "GA operational readiness command must require Pi host confirmation");
assertPublicNonAuthoritySanitized(confirmationPrompts[0], "host confirmation prompt");
assert.equal(notifications.length, 1, "GA operational readiness command must notify the Pi host");
assertPublicNonAuthoritySanitized(notifications[0], "host notification");

console.log("Goal 3 Task293 Pi GA operational readiness review consumer tests passed.");
