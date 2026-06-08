import assert from "node:assert/strict";
import registerComathPiRuntime, { createComathTools, executeComathTool, runtime_registration } from "../dist/index.js";

const projectRoot = "D:/research/project";
const privilegedPublicTerms =
  /clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence|proof_success|kernel_checked/i;
const hostPathTerms = /D:\\|D:\/|\/home\/pi|\/root\//i;
const trustedRuntimeRootTerms = /\.comath[\\/]|%2ecomath/i;
const secretTerms = /COMATH_CODEX_API_KEY|OPENAI_API_KEY|Authorization:\s*Bearer|api_key|token=|plain-token|sk-/i;
const transportOverclaimTerms =
  /long[- ]lived\s+(?:websocket|sse)|indefinite\s+sse|terminal transport recovered live|durable transport provided|live transport open/i;
const unattendedOverclaimTerms =
  /production unattended executor|operator-free execution completed|unattended real-host execution completed|operator confirmation bypassed|terminal unattended completion certified|terminal_unattended_completion_certified\s*=\s*true|terminalUnattendedCompletionCertified\s*=\s*true|completion certificate available|completion_certificate_available\s*=\s*true|completionCertificateAvailable\s*=\s*true|terminal_goal_state\s*=\s*terminal_goal_completed|terminalGoalState\s*=\s*terminal_goal_completed|handoff can execute|unattended execution authorized|operator approval recorded|operator approved|executor invoked|executor_invoked\s*=\s*true|executorInvoked\s*=\s*true|execution_attempted\s*=\s*true|executionAttempted\s*=\s*true|execution_attempt_succeeded\s*=\s*true|executionAttemptSucceeded\s*=\s*true|GA certified|can certify GA/i;
const executorLeakTerms =
  /executor_command|execution_attempt_command|attempt_result|execution_attempt_result|execution_attempt_result_path|execution_attempt_result_artifact|SHOULD_NOT_LEAK_EXECUTOR/i;

function toolDescriptor(name) {
  const tool = createComathTools().find((descriptor) => descriptor.name === name);
  assert.ok(tool, `${name} must be registered for Pi terminal completion certificate design`);
  return tool;
}

function assertPublicSanitized(value, scope) {
  const serialized = JSON.stringify(value);
  assert.doesNotMatch(serialized, privilegedPublicTerms, `${scope} must sanitize proof authority wording`);
  assert.doesNotMatch(serialized, hostPathTerms, `${scope} must sanitize host paths`);
  assert.doesNotMatch(serialized, trustedRuntimeRootTerms, `${scope} must sanitize trusted runtime roots`);
  assert.doesNotMatch(serialized, secretTerms, `${scope} must sanitize secrets`);
  assert.doesNotMatch(serialized, transportOverclaimTerms, `${scope} must sanitize transport overclaims`);
  assert.doesNotMatch(serialized, unattendedOverclaimTerms, `${scope} must sanitize terminal completion overclaims`);
  assert.doesNotMatch(serialized, executorLeakTerms, `${scope} must sanitize executor material`);
}

const designTool = toolDescriptor(
  "comath.release.piCodexLifecycleUnattendedRealHostTerminalCompletionCertificateDesign"
);
assert.equal(designTool.mutates, true, "terminal completion certificate design consumer writes service-owned design evidence");
assert.deepEqual(designTool.input_schema.required, [
  "project_root",
  "project_id",
  "actor",
  "completion_certification_prerequisite_id",
  "completion_certification_prerequisite_path",
  "completion_certification_prerequisite_sha256",
  "confirmation_id"
]);
assert.equal(
  Object.hasOwn(designTool.input_schema.properties, "executor_command"),
  false,
  "Pi terminal certificate design consumer must not expose executor_command"
);
assert.equal(
  Object.hasOwn(designTool.input_schema.properties, "attempt_result"),
  false,
  "Pi terminal certificate design consumer must not expose attempt_result"
);
assert.equal(
  Object.hasOwn(designTool.input_schema.properties, "completion_certificate"),
  false,
  "Pi terminal certificate design consumer must not expose completion certificates"
);
assert.deepEqual(designTool.input_schema.properties.requested_certificate_mode.enum, [
  "production_unattended_real_host_completion_certificate_design"
]);

const interactiveTool = toolDescriptor("comath.release.piCodexLifecycleInteractiveRealPi");
assert.equal(
  interactiveTool.input_schema.properties.completed_steps.items.enum.includes(
    "lifecycle-unattended-real-host-terminal-completion-certificate-design"
  ),
  true,
  "interactive real-Pi planner must advertise terminal completion certificate design after prerequisite"
);

const releaseCommand = runtime_registration.commands.find((command) => command.command === "/cm:release");
assert.ok(releaseCommand, "/cm:release must be advertised in Pi runtime registration");
assert.equal(
  releaseCommand.subcommands.includes("lifecycle-unattended-real-host-terminal-completion-certificate-design"),
  true
);

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
      terminal_completion_certificate_design: {
        schema_version: "comath.pi_codex_unattended_real_host_terminal_completion_certificate_design.v1",
        terminal_completion_certificate_design_id: body.terminal_completion_certificate_design_id,
        project_id: body.project_id,
        actor: body.actor,
        terminal_completion_certificate_design_status: "blocked_terminal_unattended_completion_certificate_evidence_missing",
        terminal_goal_state: "terminal_goal_completed",
        terminalGoalState: "terminal_goal_completed",
        terminal_completion_certificate_design_path:
          "D:/research/project/.comath/release/pi-codex-lifecycle/LIFE-TERMINAL-COMPLETION-CERT-DESIGN-0287/terminal-completion-certificate-design.json token=plain-token",
        requested_certificate_mode: body.requested_certificate_mode,
        completion_certificate_available: true,
        completionCertificateAvailable: true,
        terminal_unattended_completion_certified: true,
        terminalUnattendedCompletionCertified: true,
        execution_attempted: true,
        executionAttempted: true,
        execution_attempt_succeeded: true,
        executionAttemptSucceeded: true,
        executor_invoked: true,
        executorInvoked: true,
        durable_transport_provided: true,
        durableTransportProvided: true,
        live_transport_open: true,
        liveTransportOpen: true,
        pi_direct_write_allowed: true,
        direct_trusted_state_mutation: true,
        proof_authority: "lean_kernel_clean_replay",
        proofAuthority: "lean_kernel_clean_replay",
        can_promote_claim: true,
        canPromoteClaim: true,
        can_certify_ga: true,
        canCertifyGa: true,
        completion_certificate: {
          status: "terminal_unattended_completion_certified"
        },
        executor_command: {
          program_label: "SHOULD_NOT_LEAK_EXECUTOR"
        },
        execution_attempt_result: {
          stdout: "SHOULD_NOT_LEAK_EXECUTOR_STDOUT",
          stderr: "SHOULD_NOT_LEAK_EXECUTOR_STDERR"
        },
        request_echo: {
          completion_certificate: { status: "terminal" },
          completion_certificate_available: true,
          completionCertificateAvailable: true,
          terminal_unattended_completion_certified: true,
          terminalUnattendedCompletionCertified: true,
          executor_command: { program: "D:/unsafe/executor.exe" },
          execution_attempt_result: "SHOULD_NOT_LEAK_EXECUTOR_STDOUT",
          proof_authority: "lean_kernel_clean_replay"
        },
        summary:
          "completion certificate available completion_certificate_available=true terminal_unattended_completion_certified=true terminalGoalState=terminal_goal_completed after formal_replay_passed from D:/research/project with Authorization: Bearer plain-token and durable transport provided; unattended real-host execution completed; SHOULD_NOT_LEAK_EXECUTOR_STDOUT; GA certified; can certify GA"
      }
    };
  }
};

const directDesign = await executeComathTool(
  client,
  "comath.release.piCodexLifecycleUnattendedRealHostTerminalCompletionCertificateDesign",
  {
    project_root: projectRoot,
    project_id: "PRJ-2870",
    actor:
      "goal3-task287 OPENAI_API_KEY=plain-token durable transport provided terminal unattended completion certified",
    terminal_completion_certificate_design_id: "LIFE-TERMINAL-COMPLETION-CERT-DESIGN-0287",
    completion_certification_prerequisite_id: "LIFE-COMPLETION-CERTIFICATION-PREREQ-0287",
    completion_certification_prerequisite_path:
      "service-owned-pi-lifecycle/LIFE-COMPLETION-CERTIFICATION-PREREQ-0287/unattended-real-host-completion-certification-prerequisite.json",
    completion_certification_prerequisite_sha256: "a".repeat(64),
    requested_certificate_mode: "production_unattended_real_host_completion_certificate_design",
    executor_command: {
      program: "D:/unsafe/executor.exe"
    },
    attempt_result: {
      exit_code: 0,
      stdout: "proof_success sk-should-not-leak"
    },
    completion_certificate: {
      status: "terminal_unattended_completion_certified"
    },
    confirmation_id: "CONF-TASK287-MUST-NOT-FORWARD"
  }
);

assert.equal(calls.at(-1).method, "POST");
assert.equal(
  calls.at(-1).path,
  "/release/pi-codex-lifecycle/unattended-real-host-terminal-completion-certificate-design"
);
assert.equal(calls.at(-1).body.confirmation_id, undefined, "Pi must not forward model-supplied confirmation ids");
assert.equal(calls.at(-1).body.executor_command, undefined, "Pi must not forward public executor commands");
assert.equal(calls.at(-1).body.attempt_result, undefined, "Pi must not forward caller-provided attempt results");
assert.equal(calls.at(-1).body.completion_certificate, undefined, "Pi must not forward completion certificates");
assert.deepEqual(calls.at(-1).body, {
  project_root: projectRoot,
  project_id: "PRJ-2870",
  actor: "goal3-task287 [redacted_secret] bounded_transport_checkpoint_only prepared_checkpoint_handoff_only",
  terminal_completion_certificate_design_id: "LIFE-TERMINAL-COMPLETION-CERT-DESIGN-0287",
  completion_certification_prerequisite_id: "LIFE-COMPLETION-CERTIFICATION-PREREQ-0287",
  completion_certification_prerequisite_path:
    ".comath/release/pi-codex-lifecycle/LIFE-COMPLETION-CERTIFICATION-PREREQ-0287/unattended-real-host-completion-certification-prerequisite.json",
  completion_certification_prerequisite_sha256: "a".repeat(64),
  requested_certificate_mode: "production_unattended_real_host_completion_certificate_design"
});
assert.doesNotMatch(JSON.stringify(calls.at(-1).body), secretTerms, "Pi request body must not forward secrets");
assert.doesNotMatch(JSON.stringify(calls.at(-1).body), transportOverclaimTerms, "Pi request body must not forward transport claims");
assert.doesNotMatch(JSON.stringify(calls.at(-1).body), unattendedOverclaimTerms, "Pi request body must not forward completion claims");
assert.doesNotMatch(JSON.stringify(calls.at(-1).body), executorLeakTerms, "Pi request body must not forward executor material");
assertPublicSanitized(directDesign, "direct result");
assert.equal(directDesign.terminal_completion_certificate_design.proof_authority, "none");
assert.equal(directDesign.terminal_completion_certificate_design.proofAuthority, "none");
assert.equal(directDesign.terminal_completion_certificate_design.can_promote_claim, false);
assert.equal(directDesign.terminal_completion_certificate_design.canPromoteClaim, false);
assert.equal(directDesign.terminal_completion_certificate_design.can_certify_ga, false);
assert.equal(directDesign.terminal_completion_certificate_design.canCertifyGa, false);
assert.equal(directDesign.terminal_completion_certificate_design.completion_certificate_available, false);
assert.equal(directDesign.terminal_completion_certificate_design.completionCertificateAvailable, false);
assert.equal(directDesign.terminal_completion_certificate_design.terminal_unattended_completion_certified, false);
assert.equal(directDesign.terminal_completion_certificate_design.terminalUnattendedCompletionCertified, false);
assert.equal(directDesign.terminal_completion_certificate_design.executor_invoked, false);
assert.equal(directDesign.terminal_completion_certificate_design.executorInvoked, false);
assert.equal(directDesign.terminal_completion_certificate_design.execution_attempted, false);
assert.equal(directDesign.terminal_completion_certificate_design.executionAttempted, false);
assert.equal(directDesign.terminal_completion_certificate_design.execution_attempt_succeeded, false);
assert.equal(directDesign.terminal_completion_certificate_design.executionAttemptSucceeded, false);
assert.equal(directDesign.terminal_completion_certificate_design.durable_transport_provided, false);
assert.equal(directDesign.terminal_completion_certificate_design.live_transport_open, false);
assert.equal(directDesign.terminal_completion_certificate_design.pi_direct_write_allowed, false);
assert.equal(directDesign.terminal_completion_certificate_design.direct_trusted_state_mutation, false);

await assert.rejects(
  () =>
    executeComathTool(
      client,
      "comath.release.piCodexLifecycleUnattendedRealHostTerminalCompletionCertificateDesign",
      {
        project_root: projectRoot,
        project_id: "PRJ-2870",
        actor: "goal3-task287 wrong alias",
        completion_certification_prerequisite_id: "LIFE-COMPLETION-CERTIFICATION-PREREQ-0287",
        completion_certification_prerequisite_path:
          "service-owned-pi-lifecycle/LIFE-ATTEMPT-REVIEW-0287/unattended-real-host-execution-attempt-review.json",
        completion_certification_prerequisite_sha256: "d".repeat(64),
        confirmation_id: "CONF-TASK287-WRONG-ALIAS"
      }
    ),
  /completion_certification_prerequisite_path.*unattended-real-host-completion-certification-prerequisite\.json/i,
  "terminal certificate design consumer must not translate non-prerequisite lifecycle aliases"
);
assert.equal(calls.length, 1, "wrong public alias must fail before another service POST");

const designPlan = await executeComathTool(client, "comath.release.piCodexLifecycleInteractiveRealPi", {
  project_id: "PRJ-2870",
  actor: "goal3-task287",
  pi_host_label: "pi-host-lab-01",
  session_id: "LIFE-OP-SESSION-0287",
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
    "lifecycle-unattended-real-host-completion-certification-prerequisite"
  ],
  completion_certification_prerequisite_id: "LIFE-COMPLETION-CERTIFICATION-PREREQ-0287",
  completion_certification_prerequisite_path:
    "service-owned-pi-lifecycle/LIFE-COMPLETION-CERTIFICATION-PREREQ-0287/unattended-real-host-completion-certification-prerequisite.json",
  completion_certification_prerequisite_sha256: "a".repeat(64),
  terminal_completion_certificate_design_id: "LIFE-TERMINAL-COMPLETION-CERT-DESIGN-0287",
  last_result_summary: "proof_success from D:/research/project with sk-should-not-leak long-lived SSE"
});
assert.equal(calls.length, 1, "interactive planner must remain read-only and must not call comathd");
assert.equal(
  designPlan.next_action.action_id,
  "lifecycle-unattended-real-host-terminal-completion-certificate-design"
);
assert.match(
  designPlan.next_action.command,
  /\/cm:release lifecycle-unattended-real-host-terminal-completion-certificate-design/
);
assert.match(
  designPlan.next_action.command,
  /--terminal-completion-certificate-design-id LIFE-TERMINAL-COMPLETION-CERT-DESIGN-0287/
);
assert.match(
  designPlan.next_action.command,
  /--completion-certification-prerequisite-id LIFE-COMPLETION-CERTIFICATION-PREREQ-0287/
);
assert.match(designPlan.next_action.command, /--completion-certification-prerequisite-sha256 a{64}/);
assert.doesNotMatch(
  designPlan.next_action.command,
  /executor-command|attempt-result|completion-certificate-json|--program|D:\//i
);
assert.equal(designPlan.next_action.requires_host_confirmation, true);
assert.equal(designPlan.next_action.auto_executes, false);
assert.equal(designPlan.interactive_policy.pi_tool_readonly, true);
assert.equal(designPlan.interactive_policy.writes_comath_state, false);
assert.equal(designPlan.interactive_policy.calls_comathd, false);
assert.equal(designPlan.interactive_policy.executes_lifecycle_actions, false);
assertPublicSanitized(designPlan, "interactive planner");

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
  { client, project_root: projectRoot, actor: "goal3-task287" }
);

assert.equal(
  registeredTools.has("comath.release.piCodexLifecycleUnattendedRealHostTerminalCompletionCertificateDesign"),
  true,
  "Pi runtime must expose terminal completion certificate design as an executable host-confirmed tool"
);
assert.equal(commands.has("cm:release"), true, "Pi runtime must expose /cm:release for terminal certificate design");

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
    "lifecycle-unattended-real-host-terminal-completion-certificate-design",
    "--project-id PRJ-2870",
    "--terminal-completion-certificate-design-id LIFE-TERMINAL-COMPLETION-CERT-DESIGN-0287-CMD",
    "--completion-certification-prerequisite-id LIFE-COMPLETION-CERTIFICATION-PREREQ-0287",
    "--completion-certification-prerequisite-path service-owned-pi-lifecycle/LIFE-COMPLETION-CERTIFICATION-PREREQ-0287/unattended-real-host-completion-certification-prerequisite.json",
    `--completion-certification-prerequisite-sha256 ${"b".repeat(64)}`,
    "--requested-certificate-mode production_unattended_real_host_completion_certificate_design",
    "--executor-command-program D:/unsafe/executor.exe",
    "--attempt-result-json '{\"exit_code\":0}'",
    "--completion-certificate-json '{\"status\":\"terminal\"}'"
  ].join(" "),
  ctx
);

assert.equal(calls.at(-1).method, "POST");
assert.equal(
  calls.at(-1).path,
  "/release/pi-codex-lifecycle/unattended-real-host-terminal-completion-certificate-design"
);
assert.equal(calls.at(-1).body.confirmation_id, undefined, "runtime command must not forward confirmation ids");
assert.equal(calls.at(-1).body.executor_command, undefined, "runtime command must not forward executor commands");
assert.equal(calls.at(-1).body.attempt_result, undefined, "runtime command must not forward caller-provided attempt results");
assert.equal(calls.at(-1).body.completion_certificate, undefined, "runtime command must not forward completion certificates");
assert.deepEqual(calls.at(-1).body, {
  project_root: projectRoot,
  project_id: "PRJ-2870",
  actor: "goal3-task287",
  terminal_completion_certificate_design_id: "LIFE-TERMINAL-COMPLETION-CERT-DESIGN-0287-CMD",
  completion_certification_prerequisite_id: "LIFE-COMPLETION-CERTIFICATION-PREREQ-0287",
  completion_certification_prerequisite_path:
    ".comath/release/pi-codex-lifecycle/LIFE-COMPLETION-CERTIFICATION-PREREQ-0287/unattended-real-host-completion-certification-prerequisite.json",
  completion_certification_prerequisite_sha256: "b".repeat(64),
  requested_certificate_mode: "production_unattended_real_host_completion_certificate_design"
});
assert.equal(confirmationPrompts.length, 1, "terminal certificate design command must require Pi host confirmation");
assertPublicSanitized(confirmationPrompts[0], "host confirmation prompt");
assert.equal(notifications.length, 1, "terminal certificate design command must notify the Pi host");
assertPublicSanitized(notifications[0], "host notification");

console.log("Goal 3 Task287 Pi terminal completion certificate design consumer tests passed.");
