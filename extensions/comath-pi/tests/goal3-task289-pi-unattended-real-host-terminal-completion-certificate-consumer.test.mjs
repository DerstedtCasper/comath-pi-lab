import assert from "node:assert/strict";
import registerComathPiRuntime, { createComathTools, executeComathTool, runtime_registration } from "../dist/index.js";

const projectRoot = "D:/research/project";
const toolName = "comath.release.piCodexLifecycleUnattendedRealHostTerminalCompletionCertificate";
const subcommand = "lifecycle-unattended-real-host-terminal-completion-certificate";
const route = "/release/pi-codex-lifecycle/unattended-real-host-terminal-completion-certificate";
const privilegedPublicTerms =
  /clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence|proof_success|kernel_checked/i;
const hostPathTerms = /D:\\|D:\/|\/home\/pi|\/root\//i;
const trustedRuntimeRootTerms = /\.comath[\\/]|%2ecomath/i;
const secretTerms = /COMATH_CODEX_API_KEY|OPENAI_API_KEY|Authorization:\s*Bearer|api_key|token=|plain-token|sk-/i;
const transportOverclaimTerms =
  /long[- ]lived\s+(?:websocket|sse)|indefinite\s+sse|durable transport provided|live transport open/i;
const gaOverclaimTerms = /GA certified|can certify GA|can_certify_ga\s*[:=]\s*(?:true|1)|canCertifyGa\s*[:=]\s*(?:true|1)/i;
const executorLeakTerms =
  /executor_command|execution_attempt_command|attempt_result\b|execution_attempt_result|execution_attempt_result_path|execution_attempt_result_artifact|SHOULD_NOT_LEAK_EXECUTOR/i;

function toolDescriptor(name) {
  const tool = createComathTools().find((descriptor) => descriptor.name === name);
  assert.ok(tool, `${name} must be registered for Pi terminal completion certificate creation`);
  return tool;
}

function assertPublicNonProofSanitized(value, scope) {
  const serialized = JSON.stringify(value);
  assert.doesNotMatch(serialized, privilegedPublicTerms, `${scope} must sanitize proof authority wording`);
  assert.doesNotMatch(serialized, hostPathTerms, `${scope} must sanitize host paths`);
  assert.doesNotMatch(serialized, trustedRuntimeRootTerms, `${scope} must sanitize trusted runtime roots`);
  assert.doesNotMatch(serialized, secretTerms, `${scope} must sanitize secrets`);
  assert.doesNotMatch(serialized, transportOverclaimTerms, `${scope} must sanitize transport overclaims`);
  assert.doesNotMatch(serialized, gaOverclaimTerms, `${scope} must sanitize GA overclaims`);
  assert.doesNotMatch(serialized, executorLeakTerms, `${scope} must sanitize executor payload material`);
}

const certificateTool = toolDescriptor(toolName);
assert.equal(certificateTool.mutates, true, "terminal completion certificate consumer writes service-owned evidence");
assert.deepEqual(certificateTool.input_schema.required, [
  "project_root",
  "project_id",
  "actor",
  "terminal_completion_certificate_design_id",
  "terminal_completion_certificate_design_path",
  "terminal_completion_certificate_design_sha256",
  "confirmation_id"
]);
assert.equal(
  Object.hasOwn(certificateTool.input_schema.properties, "executor_command"),
  false,
  "Pi terminal certificate consumer must not expose executor_command"
);
assert.equal(
  Object.hasOwn(certificateTool.input_schema.properties, "attempt_result"),
  false,
  "Pi terminal certificate consumer must not expose caller attempt_result"
);
assert.equal(
  Object.hasOwn(certificateTool.input_schema.properties, "completion_certificate"),
  false,
  "Pi terminal certificate consumer must not accept caller completion certificates"
);
assert.deepEqual(certificateTool.input_schema.properties.requested_certificate_mode.enum, [
  "production_unattended_real_host_terminal_completion_certificate"
]);

const interactiveTool = toolDescriptor("comath.release.piCodexLifecycleInteractiveRealPi");
assert.equal(
  interactiveTool.input_schema.properties.completed_steps.items.enum.includes(subcommand),
  true,
  "interactive real-Pi planner must advertise terminal completion certificate creation after design evidence"
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
      terminal_completion_certificate: {
        schema_version: "comath.pi_codex_unattended_real_host_terminal_completion_certificate.v1",
        terminal_completion_certificate_id: body.terminal_completion_certificate_id,
        project_id: body.project_id,
        actor: body.actor,
        terminal_completion_certificate_status: "terminal_unattended_completion_certified",
        terminal_goal_state: "terminal_unattended_completion_certified",
        terminal_completion_certificate_path:
          "D:/research/project/.comath/release/pi-codex-lifecycle/LIFE-TERMINAL-COMPLETION-CERT-0289/terminal-completion-certificate.json token=plain-token",
        requested_certificate_mode: body.requested_certificate_mode,
        completion_certificate_available: true,
        completionCertificateAvailable: true,
        terminal_unattended_completion_certified: true,
        terminalUnattendedCompletionCertified: true,
        unattended_real_host_execution_completed: true,
        unattendedRealHostExecutionCompleted: true,
        terminal_completion_certificate_design_id: body.terminal_completion_certificate_design_id,
        terminal_completion_certificate_design_path:
          "D:/research/project/.comath/release/pi-codex-lifecycle/LIFE-TERMINAL-COMPLETION-CERT-DESIGN-0289/terminal-completion-certificate-design.json",
        terminal_completion_certificate_design_artifact: {
          kind: "unattended_real_host_terminal_completion_certificate_design",
          path:
            "D:/research/project/.comath/release/pi-codex-lifecycle/LIFE-TERMINAL-COMPLETION-CERT-DESIGN-0289/terminal-completion-certificate-design.json",
          sha256: "a".repeat(64),
          size_bytes: 1234
        },
        attempt_result_evidence_artifact: {
          kind: "terminal_attempt_result_evidence",
          sha256: "b".repeat(64),
          size_bytes: 456,
          source_artifact_path_redacted: true
        },
        execution_attempt_result: {
          stdout: "SHOULD_NOT_LEAK_EXECUTOR_STDOUT",
          stderr: "SHOULD_NOT_LEAK_EXECUTOR_STDERR"
        },
        proof_authority: "lean_kernel_clean_replay",
        proofAuthority: "lean_kernel_clean_replay",
        can_promote_claim: true,
        canPromoteClaim: true,
        can_certify_ga: true,
        canCertifyGa: true,
        ga_certification_gate_separate: true,
        request_echo: {
          completion_certificate: { status: "terminal" },
          executor_command: { program: "D:/unsafe/executor.exe" },
          execution_attempt_result: "SHOULD_NOT_LEAK_EXECUTOR_STDOUT",
          proof_authority: "lean_kernel_clean_replay",
          can_certify_ga: true
        },
        summary:
          "terminal unattended completion certified after proof_success from D:/research/project with Authorization: Bearer plain-token and durable transport provided; SHOULD_NOT_LEAK_EXECUTOR_STDOUT; GA certified; can certify GA"
      }
    };
  }
};

const directCertificate = await executeComathTool(client, toolName, {
  project_root: projectRoot,
  project_id: "PRJ-2890",
  actor:
    "goal3-task289 OPENAI_API_KEY=plain-token proof_success durable transport provided terminal unattended completion certified",
  terminal_completion_certificate_id: "LIFE-TERMINAL-COMPLETION-CERT-0289",
  terminal_completion_certificate_design_id: "LIFE-TERMINAL-COMPLETION-CERT-DESIGN-0289",
  terminal_completion_certificate_design_path:
    "service-owned-pi-lifecycle/LIFE-TERMINAL-COMPLETION-CERT-DESIGN-0289/terminal-completion-certificate-design.json",
  terminal_completion_certificate_design_sha256: "a".repeat(64),
  requested_certificate_mode: "production_unattended_real_host_terminal_completion_certificate",
  executor_command: {
    program: "D:/unsafe/executor.exe"
  },
  attempt_result: {
    exit_code: 0,
    stdout: "proof_success sk-should-not-leak"
  },
  completion_certificate: {
    status: "caller-supplied-terminal"
  },
  confirmation_id: "CONF-TASK289-MUST-NOT-FORWARD"
});

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, route);
assert.equal(calls.at(-1).body.confirmation_id, undefined, "Pi must not forward model-supplied confirmation ids");
assert.equal(calls.at(-1).body.executor_command, undefined, "Pi must not forward public executor commands");
assert.equal(calls.at(-1).body.attempt_result, undefined, "Pi must not forward caller-provided attempt results");
assert.equal(calls.at(-1).body.completion_certificate, undefined, "Pi must not forward caller completion certificates");
assert.deepEqual(calls.at(-1).body, {
  project_root: projectRoot,
  project_id: "PRJ-2890",
  actor:
    "goal3-task289 [redacted_secret] unverified_formal_status bounded_transport_checkpoint_only prepared_checkpoint_handoff_only",
  terminal_completion_certificate_id: "LIFE-TERMINAL-COMPLETION-CERT-0289",
  terminal_completion_certificate_design_id: "LIFE-TERMINAL-COMPLETION-CERT-DESIGN-0289",
  terminal_completion_certificate_design_path:
    ".comath/release/pi-codex-lifecycle/LIFE-TERMINAL-COMPLETION-CERT-DESIGN-0289/terminal-completion-certificate-design.json",
  terminal_completion_certificate_design_sha256: "a".repeat(64),
  requested_certificate_mode: "production_unattended_real_host_terminal_completion_certificate"
});
assert.doesNotMatch(JSON.stringify(calls.at(-1).body), secretTerms, "Pi request body must not forward secrets");
assert.doesNotMatch(JSON.stringify(calls.at(-1).body), privilegedPublicTerms, "Pi request body must not forward proof claims");
assert.doesNotMatch(JSON.stringify(calls.at(-1).body), transportOverclaimTerms, "Pi request body must not forward transport claims");
assert.doesNotMatch(JSON.stringify(calls.at(-1).body), gaOverclaimTerms, "Pi request body must not forward GA claims");
assert.doesNotMatch(JSON.stringify(calls.at(-1).body), executorLeakTerms, "Pi request body must not forward executor material");

assertPublicNonProofSanitized(directCertificate, "direct result");
assert.equal(directCertificate.terminal_completion_certificate.proof_authority, "none");
assert.equal(directCertificate.terminal_completion_certificate.proofAuthority, "none");
assert.equal(directCertificate.terminal_completion_certificate.can_promote_claim, false);
assert.equal(directCertificate.terminal_completion_certificate.canPromoteClaim, false);
assert.equal(directCertificate.terminal_completion_certificate.can_certify_ga, false);
assert.equal(directCertificate.terminal_completion_certificate.canCertifyGa, false);
assert.equal(directCertificate.terminal_completion_certificate.ga_certification_gate_separate, true);
assert.equal(directCertificate.terminal_completion_certificate.completion_certificate_available, true);
assert.equal(directCertificate.terminal_completion_certificate.completionCertificateAvailable, true);
assert.equal(directCertificate.terminal_completion_certificate.terminal_unattended_completion_certified, true);
assert.equal(directCertificate.terminal_completion_certificate.terminalUnattendedCompletionCertified, true);
assert.equal(directCertificate.terminal_completion_certificate.unattended_real_host_execution_completed, true);
assert.equal(directCertificate.terminal_completion_certificate.unattendedRealHostExecutionCompleted, true);

await assert.rejects(
  () =>
    executeComathTool(client, toolName, {
      project_root: projectRoot,
      project_id: "PRJ-2890",
      actor: "goal3-task289 wrong alias",
      terminal_completion_certificate_design_id: "LIFE-TERMINAL-COMPLETION-CERT-DESIGN-0289",
      terminal_completion_certificate_design_path:
        "service-owned-pi-lifecycle/LIFE-COMPLETION-CERTIFICATION-PREREQ-0289/unattended-real-host-completion-certification-prerequisite.json",
      terminal_completion_certificate_design_sha256: "d".repeat(64),
      confirmation_id: "CONF-TASK289-WRONG-ALIAS"
    }),
  /terminal_completion_certificate_design_path.*terminal-completion-certificate-design\.json/i,
  "terminal certificate consumer must not translate non-design lifecycle aliases"
);
assert.equal(calls.length, 1, "wrong public alias must fail before another service POST");

const certificatePlan = await executeComathTool(client, "comath.release.piCodexLifecycleInteractiveRealPi", {
  project_id: "PRJ-2890",
  actor: "goal3-task289",
  pi_host_label: "pi-host-lab-01",
  session_id: "LIFE-OP-SESSION-0289",
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
    "lifecycle-unattended-real-host-terminal-completion-certificate-design"
  ],
  terminal_completion_certificate_id: "LIFE-TERMINAL-COMPLETION-CERT-0289",
  terminal_completion_certificate_design_id: "LIFE-TERMINAL-COMPLETION-CERT-DESIGN-0289",
  terminal_completion_certificate_design_path:
    "service-owned-pi-lifecycle/LIFE-TERMINAL-COMPLETION-CERT-DESIGN-0289/terminal-completion-certificate-design.json",
  terminal_completion_certificate_design_sha256: "a".repeat(64),
  last_result_summary: "proof_success from D:/research/project with sk-should-not-leak long-lived SSE"
});
assert.equal(calls.length, 1, "interactive planner must remain read-only and must not call comathd");
assert.equal(certificatePlan.next_action.action_id, subcommand);
assert.match(certificatePlan.next_action.command, /\/cm:release lifecycle-unattended-real-host-terminal-completion-certificate/);
assert.match(
  certificatePlan.next_action.command,
  /--terminal-completion-certificate-id LIFE-TERMINAL-COMPLETION-CERT-0289/
);
assert.match(
  certificatePlan.next_action.command,
  /--terminal-completion-certificate-design-id LIFE-TERMINAL-COMPLETION-CERT-DESIGN-0289/
);
assert.match(certificatePlan.next_action.command, /--terminal-completion-certificate-design-sha256 a{64}/);
assert.doesNotMatch(
  certificatePlan.next_action.command,
  /executor-command|attempt-result|completion-certificate-json|--program|D:\//i
);
assert.equal(certificatePlan.next_action.requires_host_confirmation, true);
assert.equal(certificatePlan.next_action.auto_executes, false);
assert.equal(certificatePlan.interactive_policy.pi_tool_readonly, true);
assert.equal(certificatePlan.interactive_policy.writes_comath_state, false);
assert.equal(certificatePlan.interactive_policy.calls_comathd, false);
assert.equal(certificatePlan.interactive_policy.executes_lifecycle_actions, false);
assertPublicNonProofSanitized(certificatePlan, "interactive planner");

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
  { client, project_root: projectRoot, actor: "goal3-task289" }
);

assert.equal(registeredTools.has(toolName), true, "Pi runtime must expose terminal completion certificate tool");
assert.equal(commands.has("cm:release"), true, "Pi runtime must expose /cm:release for terminal certificate creation");

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
    "--project-id PRJ-2890",
    "--terminal-completion-certificate-id LIFE-TERMINAL-COMPLETION-CERT-0289-CMD",
    "--terminal-completion-certificate-design-id LIFE-TERMINAL-COMPLETION-CERT-DESIGN-0289",
    "--terminal-completion-certificate-design-path service-owned-pi-lifecycle/LIFE-TERMINAL-COMPLETION-CERT-DESIGN-0289/terminal-completion-certificate-design.json",
    `--terminal-completion-certificate-design-sha256 ${"b".repeat(64)}`,
    "--requested-certificate-mode production_unattended_real_host_terminal_completion_certificate",
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
  project_id: "PRJ-2890",
  actor: "goal3-task289",
  terminal_completion_certificate_id: "LIFE-TERMINAL-COMPLETION-CERT-0289-CMD",
  terminal_completion_certificate_design_id: "LIFE-TERMINAL-COMPLETION-CERT-DESIGN-0289",
  terminal_completion_certificate_design_path:
    ".comath/release/pi-codex-lifecycle/LIFE-TERMINAL-COMPLETION-CERT-DESIGN-0289/terminal-completion-certificate-design.json",
  terminal_completion_certificate_design_sha256: "b".repeat(64),
  requested_certificate_mode: "production_unattended_real_host_terminal_completion_certificate"
});
assert.equal(confirmationPrompts.length, 1, "terminal certificate command must require Pi host confirmation");
assertPublicNonProofSanitized(confirmationPrompts[0], "host confirmation prompt");
assert.equal(notifications.length, 1, "terminal certificate command must notify the Pi host");
assertPublicNonProofSanitized(notifications[0], "host notification");

console.log("Goal 3 Task289 Pi terminal completion certificate consumer tests passed.");
