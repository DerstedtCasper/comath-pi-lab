import assert from "node:assert/strict";
import registerComathPiRuntime, { createComathTools, executeComathTool, runtime_registration } from "../dist/index.js";

const projectRoot = "D:/research/project";
const toolName = "comath.release.piCodexLifecycleOperatorServiceTransportClosureReview";
const subcommand = "lifecycle-operator-service-transport-closure-review";
const route = "/release/pi-codex-lifecycle/operator-service-transport-closure-review";
const privilegedPublicTerms =
  /clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence|proof_success|kernel_checked/i;
const hostPathTerms = /D:\\|D:\/|\/home\/pi|\/root\//i;
const trustedRuntimeRootTerms = /\.comath[\\/]|%2ecomath/i;
const secretTerms = /COMATH_CODEX_API_KEY|OPENAI_API_KEY|Authorization:\s*Bearer|api_key|token=|plain-token|sk-/i;
const transportOverclaimTerms =
  /long[- ]lived\s+(?:websocket|sse)|indefinite\s+sse|durable transport provided|live transport open/i;
const gaOverclaimTerms = /GA certified|can certify GA|can_certify_ga\s*[:=]\s*(?:true|1)|canCertifyGa\s*[:=]\s*(?:true|1)/i;
const executorLeakTerms =
  /executor_command|execution_attempt_command|attempt_result\b|execution_attempt_result|execution_attempt_result_path|execution_attempt_result_artifact|completion_certificate_json|caller_completion_certificate/i;

function toolDescriptor(name) {
  const tool = createComathTools().find((descriptor) => descriptor.name === name);
  assert.ok(tool, `${name} must be registered for Pi operator transport closure review`);
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

const closureTool = toolDescriptor(toolName);
assert.equal(closureTool.mutates, true, "operator transport closure review consumer writes service-owned evidence");
assert.deepEqual(closureTool.input_schema.required, [
  "project_root",
  "project_id",
  "actor",
  "terminal_completion_certificate_id",
  "terminal_completion_certificate_path",
  "terminal_completion_certificate_sha256",
  "confirmation_id"
]);
assert.equal(
  Object.hasOwn(closureTool.input_schema.properties, "executor_command"),
  false,
  "Pi closure-review consumer must not expose executor_command"
);
assert.equal(
  Object.hasOwn(closureTool.input_schema.properties, "attempt_result"),
  false,
  "Pi closure-review consumer must not expose caller attempt_result"
);
assert.equal(
  Object.hasOwn(closureTool.input_schema.properties, "completion_certificate"),
  false,
  "Pi closure-review consumer must not accept caller completion certificates"
);
assert.deepEqual(closureTool.input_schema.properties.requested_transport_closure_mode.enum, [
  "maintained_operator_service_transport_closure_review"
]);

const interactiveTool = toolDescriptor("comath.release.piCodexLifecycleInteractiveRealPi");
assert.equal(
  interactiveTool.input_schema.properties.completed_steps.items.enum.includes(subcommand),
  true,
  "interactive real-Pi planner must advertise operator transport closure review after terminal certificate evidence"
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
      transport_closure_review: {
        schema_version: "comath.pi_codex_operator_service_transport_closure_review.v1",
        transport_closure_review_id: body.transport_closure_review_id,
        project_id: body.project_id,
        actor: body.actor,
        transport_closure_review_status: "maintained_operator_service_transport_closure_reviewed",
        durable_transport_closure_status: "maintained_operator_service_transport_closure_reviewed",
        transport_closure_review_path:
          "D:/research/project/.comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-CLOSURE-REVIEW-0291/operator-service-transport-closure-review.json token=plain-token",
        terminal_completion_certificate_id: body.terminal_completion_certificate_id,
        terminal_completion_certificate_path:
          "D:/research/project/.comath/release/pi-codex-lifecycle/LIFE-TERMINAL-COMPLETION-CERT-0291/terminal-completion-certificate.json",
        terminal_completion_certificate_artifact: {
          kind: "unattended_real_host_terminal_completion_certificate",
          path:
            "D:/research/project/.comath/release/pi-codex-lifecycle/LIFE-TERMINAL-COMPLETION-CERT-0291/terminal-completion-certificate.json",
          sha256: "a".repeat(64),
          size_bytes: 1234
        },
        completion_certificate_available: true,
        completionCertificateAvailable: true,
        terminal_unattended_completion_certified: true,
        terminalUnattendedCompletionCertified: true,
        unattended_real_host_execution_completed: true,
        unattendedRealHostExecutionCompleted: true,
        maintained_transport_primitive_bound: true,
        service_route_bound: true,
        client_fetch_contract_bound: true,
        terminal_completion_certificate_bound: true,
        durable_transport_contract_bound: true,
        transport_continuity_bound: true,
        transport_contract_bound: true,
        service_transport_primitive: "node_http_agent_run_log_session_route",
        client_transport_primitive: "pi_fetch_get_text",
        durable_transport_provided: true,
        durableTransportProvided: true,
        live_transport_open: true,
        liveTransportOpen: true,
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
          completion_certificate: { status: "caller-supplied-terminal" },
          proof_authority: "lean_kernel_clean_replay",
          durable_transport_provided: true,
          can_certify_ga: true
        },
        summary:
          "operator transport closure reviewed after proof_success from D:/research/project with Authorization: Bearer plain-token and durable transport provided; live transport open; GA certified; can certify GA"
      }
    };
  }
};

const directClosure = await executeComathTool(client, toolName, {
  project_root: projectRoot,
  project_id: "PRJ-2910",
  actor:
    "goal3-task291 OPENAI_API_KEY=plain-token proof_success durable transport provided terminal unattended completion certified",
  transport_closure_review_id: "LIFE-TRANSPORT-CLOSURE-REVIEW-0291",
  terminal_completion_certificate_id: "LIFE-TERMINAL-COMPLETION-CERT-0291",
  terminal_completion_certificate_path:
    "service-owned-pi-lifecycle/LIFE-TERMINAL-COMPLETION-CERT-0291/terminal-completion-certificate.json",
  terminal_completion_certificate_sha256: "a".repeat(64),
  requested_transport_closure_mode: "maintained_operator_service_transport_closure_review",
  executor_command: { program: "D:/unsafe/executor.exe" },
  attempt_result: { exit_code: 0, stdout: "proof_success sk-should-not-leak" },
  completion_certificate: { status: "caller-supplied-terminal" },
  confirmation_id: "CONF-TASK291-MUST-NOT-FORWARD"
});

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, route);
assert.equal(calls.at(-1).body.confirmation_id, undefined, "Pi must not forward model-supplied confirmation ids");
assert.equal(calls.at(-1).body.executor_command, undefined, "Pi must not forward public executor commands");
assert.equal(calls.at(-1).body.attempt_result, undefined, "Pi must not forward caller-provided attempt results");
assert.equal(calls.at(-1).body.completion_certificate, undefined, "Pi must not forward caller completion certificates");
assert.deepEqual(calls.at(-1).body, {
  project_root: projectRoot,
  project_id: "PRJ-2910",
  actor:
    "goal3-task291 [redacted_secret] unverified_formal_status bounded_transport_checkpoint_only prepared_checkpoint_handoff_only",
  transport_closure_review_id: "LIFE-TRANSPORT-CLOSURE-REVIEW-0291",
  terminal_completion_certificate_id: "LIFE-TERMINAL-COMPLETION-CERT-0291",
  terminal_completion_certificate_path:
    ".comath/release/pi-codex-lifecycle/LIFE-TERMINAL-COMPLETION-CERT-0291/terminal-completion-certificate.json",
  terminal_completion_certificate_sha256: "a".repeat(64),
  requested_transport_closure_mode: "maintained_operator_service_transport_closure_review"
});
const {
  project_root: _serviceRequiredProjectRoot,
  terminal_completion_certificate_path: _serviceRequiredTerminalCertificatePath,
  ...publicRequestAuditBody
} = calls.at(-1).body;
assertPublicNonAuthoritySanitized(publicRequestAuditBody, "Pi request body");

assertPublicNonAuthoritySanitized(directClosure, "direct result");
assert.equal(directClosure.transport_closure_review.proof_authority, "none");
assert.equal(directClosure.transport_closure_review.proofAuthority, "none");
assert.equal(directClosure.transport_closure_review.can_promote_claim, false);
assert.equal(directClosure.transport_closure_review.canPromoteClaim, false);
assert.equal(directClosure.transport_closure_review.can_certify_ga, false);
assert.equal(directClosure.transport_closure_review.canCertifyGa, false);
assert.equal(directClosure.transport_closure_review.durable_transport_provided, false);
assert.equal(directClosure.transport_closure_review.durableTransportProvided, false);
assert.equal(directClosure.transport_closure_review.live_transport_open, false);
assert.equal(directClosure.transport_closure_review.liveTransportOpen, false);
assert.equal(directClosure.transport_closure_review.ga_certification_gate_separate, true);
assert.equal(directClosure.transport_closure_review.completion_certificate_available, true);
assert.equal(directClosure.transport_closure_review.completionCertificateAvailable, true);
assert.equal(directClosure.transport_closure_review.terminal_unattended_completion_certified, true);
assert.equal(directClosure.transport_closure_review.terminalUnattendedCompletionCertified, true);
assert.equal(directClosure.transport_closure_review.unattended_real_host_execution_completed, true);
assert.equal(directClosure.transport_closure_review.unattendedRealHostExecutionCompleted, true);
assert.equal(directClosure.transport_closure_review.maintained_transport_primitive_bound, true);
assert.equal(directClosure.transport_closure_review.service_route_bound, true);
assert.equal(directClosure.transport_closure_review.client_fetch_contract_bound, true);

await assert.rejects(
  () =>
    executeComathTool(client, toolName, {
      project_root: projectRoot,
      project_id: "PRJ-2910",
      actor: "goal3-task291 wrong alias",
      terminal_completion_certificate_id: "LIFE-TERMINAL-COMPLETION-CERT-0291",
      terminal_completion_certificate_path:
        "service-owned-pi-lifecycle/LIFE-TERMINAL-COMPLETION-CERT-DESIGN-0291/terminal-completion-certificate-design.json",
      terminal_completion_certificate_sha256: "d".repeat(64),
      confirmation_id: "CONF-TASK291-WRONG-ALIAS"
    }),
  /terminal_completion_certificate_path.*terminal-completion-certificate\.json/i,
  "transport closure consumer must not translate non-terminal-certificate lifecycle aliases"
);
assert.equal(calls.length, 1, "wrong public alias must fail before another service POST");

const closurePlan = await executeComathTool(client, "comath.release.piCodexLifecycleInteractiveRealPi", {
  project_id: "PRJ-2910",
  actor: "goal3-task291",
  pi_host_label: "pi-host-lab-01",
  session_id: "LIFE-OP-SESSION-0291",
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
    "lifecycle-unattended-real-host-terminal-completion-certificate"
  ],
  transport_closure_review_id: "LIFE-TRANSPORT-CLOSURE-REVIEW-0291",
  terminal_completion_certificate_id: "LIFE-TERMINAL-COMPLETION-CERT-0291",
  terminal_completion_certificate_path:
    "service-owned-pi-lifecycle/LIFE-TERMINAL-COMPLETION-CERT-0291/terminal-completion-certificate.json",
  terminal_completion_certificate_sha256: "a".repeat(64),
  last_result_summary: "proof_success from D:/research/project with sk-should-not-leak long-lived SSE"
});
assert.equal(calls.length, 1, "interactive planner must remain read-only and must not call comathd");
assert.equal(closurePlan.next_action.action_id, subcommand);
assert.match(closurePlan.next_action.command, /\/cm:release lifecycle-operator-service-transport-closure-review/);
assert.match(closurePlan.next_action.command, /--transport-closure-review-id LIFE-TRANSPORT-CLOSURE-REVIEW-0291/);
assert.match(closurePlan.next_action.command, /--terminal-completion-certificate-id LIFE-TERMINAL-COMPLETION-CERT-0291/);
assert.match(closurePlan.next_action.command, /--terminal-completion-certificate-sha256 a{64}/);
assert.doesNotMatch(
  closurePlan.next_action.command,
  /executor-command|attempt-result|completion-certificate-json|--program|D:\//i
);
assert.equal(closurePlan.next_action.requires_host_confirmation, true);
assert.equal(closurePlan.next_action.auto_executes, false);
assert.equal(closurePlan.interactive_policy.pi_tool_readonly, true);
assert.equal(closurePlan.interactive_policy.writes_comath_state, false);
assert.equal(closurePlan.interactive_policy.calls_comathd, false);
assert.equal(closurePlan.interactive_policy.executes_lifecycle_actions, false);
assertPublicNonAuthoritySanitized(closurePlan, "interactive planner");

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
  { client, project_root: projectRoot, actor: "goal3-task291" }
);

assert.equal(registeredTools.has(toolName), true, "Pi runtime must expose operator transport closure review tool");
assert.equal(commands.has("cm:release"), true, "Pi runtime must expose /cm:release for closure review");

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
    "--project-id PRJ-2910",
    "--transport-closure-review-id LIFE-TRANSPORT-CLOSURE-REVIEW-0291-CMD",
    "--terminal-completion-certificate-id LIFE-TERMINAL-COMPLETION-CERT-0291",
    "--terminal-completion-certificate-path service-owned-pi-lifecycle/LIFE-TERMINAL-COMPLETION-CERT-0291/terminal-completion-certificate.json",
    `--terminal-completion-certificate-sha256 ${"b".repeat(64)}`,
    "--requested-transport-closure-mode maintained_operator_service_transport_closure_review",
    "--executor-command-program D:/unsafe/executor.exe",
    "--attempt-result-json '{\"exit_code\":0}'",
    "--completion-certificate-json '{\"status\":\"caller-terminal\"}'"
  ].join(" "),
  ctx
);

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, route);
assert.equal(calls.at(-1).body.confirmation_id, undefined, "runtime command must not forward confirmation ids");
assert.equal(calls.at(-1).body.executor_command, undefined, "runtime command must not forward executor commands");
assert.equal(calls.at(-1).body.attempt_result, undefined, "runtime command must not forward caller attempt results");
assert.equal(calls.at(-1).body.completion_certificate, undefined, "runtime command must not forward caller certificates");
assert.deepEqual(calls.at(-1).body, {
  project_root: projectRoot,
  project_id: "PRJ-2910",
  actor: "goal3-task291",
  transport_closure_review_id: "LIFE-TRANSPORT-CLOSURE-REVIEW-0291-CMD",
  terminal_completion_certificate_id: "LIFE-TERMINAL-COMPLETION-CERT-0291",
  terminal_completion_certificate_path:
    ".comath/release/pi-codex-lifecycle/LIFE-TERMINAL-COMPLETION-CERT-0291/terminal-completion-certificate.json",
  terminal_completion_certificate_sha256: "b".repeat(64),
  requested_transport_closure_mode: "maintained_operator_service_transport_closure_review"
});
assert.equal(confirmationPrompts.length, 1, "closure review command must require Pi host confirmation");
assertPublicNonAuthoritySanitized(confirmationPrompts[0], "host confirmation prompt");
assert.equal(notifications.length, 1, "closure review command must notify the Pi host");
assertPublicNonAuthoritySanitized(notifications[0], "host notification");

console.log("Goal 3 Task291 Pi operator service transport closure review consumer tests passed.");
