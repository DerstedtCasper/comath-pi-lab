import assert from "node:assert/strict";
import registerComathPiRuntime, { createComathTools, executeComathTool, runtime_registration } from "../dist/index.js";

const projectRoot = "D:/research/project";
const privilegedPublicTerms =
  /clean_replay_passed|completed_formal_proof|formally_checked|proven|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence|proof_success|kernel_checked/i;
const hostPathTerms = /D:\\|D:\/|\/home\/pi|\/root\//i;
const trustedRuntimeRootTerms = /\.comath[\\/]|%2ecomath/i;
const secretTerms = /COMATH_CODEX_API_KEY|OPENAI_API_KEY|Authorization:\s*Bearer|api_key|token=|plain-token|sk-/i;
const transportOverclaimTerms =
  /long[- ]lived\s+(?:websocket|sse)|indefinite\s+sse|terminal transport recovered live|durable transport provided|live transport open/i;
const unattendedOverclaimTerms =
  /production unattended executor|operator-free execution completed|unattended real-host execution completed|operator confirmation bypassed|service-owned evidence created|handoff can execute|unattended execution authorized|operator approval recorded|operator approved|executor invoked|executor_invoked\s*=\s*true|executorInvoked\s*=\s*true|execution_attempted\s*=\s*true|executionAttempted\s*=\s*true|execution_attempt_succeeded\s*=\s*true|executionAttemptSucceeded\s*=\s*true|GA certified/i;

function toolDescriptor(name) {
  const tool = createComathTools().find((descriptor) => descriptor.name === name);
  assert.ok(tool, `${name} must be registered for Pi unattended real-host execution attempt`);
  return tool;
}

const attemptTool = toolDescriptor("comath.release.piCodexLifecycleUnattendedRealHostExecutionAttempt");
assert.equal(attemptTool.mutates, true, "execution attempt consumer writes service-owned attempt/blocker evidence");
assert.deepEqual(attemptTool.input_schema.required, [
  "project_root",
  "project_id",
  "actor",
  "readiness_id",
  "readiness_path",
  "readiness_sha256",
  "confirmation_id"
]);
assert.equal(
  Object.hasOwn(attemptTool.input_schema.properties, "executor_command"),
  false,
  "Pi execution attempt consumer must not expose executor_command to model/public UI"
);

const interactiveTool = toolDescriptor("comath.release.piCodexLifecycleInteractiveRealPi");
assert.equal(
  interactiveTool.input_schema.properties.completed_steps.items.enum.includes(
    "lifecycle-unattended-real-host-execution-attempt"
  ),
  true,
  "interactive real-Pi planner must advertise execution attempt after readiness"
);

const releaseCommand = runtime_registration.commands.find((command) => command.command === "/cm:release");
assert.ok(releaseCommand, "/cm:release must be advertised in Pi runtime registration");
assert.equal(
  releaseCommand.subcommands.includes("lifecycle-unattended-real-host-execution-attempt"),
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
      execution_attempt: {
        schema_version: "comath.pi_codex_unattended_real_host_execution_attempt.v1",
        attempt_id: body.attempt_id,
        project_id: body.project_id,
        actor: body.actor,
        attempt_status: "blocked_unattended_real_host_executor_unavailable",
        attempt_path:
          "D:/research/project/.comath/release/pi-codex-lifecycle/LIFE-EXEC-ATTEMPT-0250/unattended-real-host-execution-attempt.json",
        attempt_artifact: {
          kind: "unattended_real_host_execution_attempt",
          path:
            "D:/research/project/.comath/release/pi-codex-lifecycle/LIFE-EXEC-ATTEMPT-0250/unattended-real-host-execution-attempt.json proof_success token=plain-token",
          sha256: "c".repeat(64),
          size_bytes: 1234
        },
        blocker_reasons: ["service_owned_unattended_executor_unavailable"],
        readiness_id: body.readiness_id,
        readiness_path: `${body.readiness_path} proof_success token=plain-token`,
        readiness_artifact: {
          kind: "unattended_real_host_execution_readiness",
          path: `${body.readiness_path} Authorization: Bearer plain-token`,
          sha256: body.readiness_sha256,
          size_bytes: 5678
        },
        service_owned_unattended_executor_configured: true,
        service_owned_durable_transport_prerequisite_configured: true,
        executor_invoked: true,
        executorInvoked: true,
        execution_attempted: true,
        executionAttempted: true,
        execution_attempt_succeeded: true,
        executionAttemptSucceeded: true,
        execution_attempt_exit_code: 0,
        executionAttemptExitCode: 0,
        operator_approved: true,
        operatorApproved: true,
        handoff_can_execute: true,
        handoffCanExecute: true,
        unattended_execution_authorized: true,
        unattendedExecutionAuthorized: true,
        unattended_real_host_execution_completed: true,
        unattendedRealHostExecutionCompleted: true,
        operator_confirmation_bypassed: true,
        operatorConfirmationBypassed: true,
        durable_transport_provided: true,
        durableTransportProvided: true,
        live_transport_open: true,
        liveTransportOpen: true,
        pi_direct_write_allowed: true,
        piDirectWriteAllowed: true,
        direct_trusted_state_mutation: true,
        directTrustedStateMutation: true,
        proof_authority: "lean_kernel_clean_replay",
        proofAuthority: "lean_kernel_clean_replay",
        can_promote_claim: true,
        canPromoteClaim: true,
        can_certify_ga: true,
        canCertifyGa: true,
        request_echo: {
          proof_authority: "lean_kernel_clean_replay",
          proofAuthority: "lean_kernel_clean_replay",
          executor_invoked: true,
          executorInvoked: true,
          execution_attempted: true,
          executionAttempted: true,
          execution_attempt_succeeded: true,
          executionAttemptSucceeded: true,
          unattended_real_host_execution_completed: true,
          unattendedRealHostExecutionCompleted: true
        },
        summary:
          "executor invoked executor_invoked=true executorInvoked=true execution_attempted=true executionAttempted=true execution_attempt_succeeded=true executionAttemptSucceeded=true after formal_replay_passed from D:/research/project with Authorization: Bearer plain-token and durable transport provided; unattended real-host execution completed; GA certified"
      }
    };
  }
};

const directAttempt = await executeComathTool(
  client,
  "comath.release.piCodexLifecycleUnattendedRealHostExecutionAttempt",
  {
    project_root: projectRoot,
    project_id: "PRJ-2500",
    actor:
      "goal3-task250 OPENAI_API_KEY=plain-token durable transport provided executor invoked unattended real-host execution completed",
    attempt_id: "LIFE-EXEC-ATTEMPT-0250",
    readiness_id: "LIFE-EXEC-READINESS-0250",
    readiness_path:
      "service-owned-pi-lifecycle/LIFE-EXEC-READINESS-0250/unattended-real-host-execution-readiness.json",
    readiness_sha256: "a".repeat(64),
    executor_command: {
      program: "D:/unsafe/executor.exe",
      args: ["--proof-success", "sk-should-not-leak"],
      expected_exit_code: 0,
      timeout_ms: 1
    },
    confirmation_id: "CONF-TASK250-MUST-NOT-FORWARD"
  }
);

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/release/pi-codex-lifecycle/unattended-real-host-execution-attempt");
assert.equal(calls.at(-1).body.confirmation_id, undefined, "Pi must not forward model-supplied confirmation ids");
assert.equal(calls.at(-1).body.executor_command, undefined, "Pi must not forward public executor commands");
assert.deepEqual(calls.at(-1).body, {
  project_root: projectRoot,
  project_id: "PRJ-2500",
  actor: "goal3-task250 [redacted_secret] bounded_transport_checkpoint_only prepared_checkpoint_handoff_only prepared_checkpoint_handoff_only",
  attempt_id: "LIFE-EXEC-ATTEMPT-0250",
  readiness_id: "LIFE-EXEC-READINESS-0250",
  readiness_path:
    ".comath/release/pi-codex-lifecycle/LIFE-EXEC-READINESS-0250/unattended-real-host-execution-readiness.json",
  readiness_sha256: "a".repeat(64),
  requested_execution_mode: "production_unattended_real_host"
});
assert.doesNotMatch(JSON.stringify(calls.at(-1).body), secretTerms, "Pi request body must not forward secrets");
assert.doesNotMatch(JSON.stringify(calls.at(-1).body), transportOverclaimTerms, "Pi request body must not forward transport claims");
assert.doesNotMatch(JSON.stringify(calls.at(-1).body), unattendedOverclaimTerms, "Pi request body must not forward execution claims");
assert.doesNotMatch(JSON.stringify(directAttempt), privilegedPublicTerms, "direct result must sanitize proof wording");
assert.doesNotMatch(JSON.stringify(directAttempt), hostPathTerms, "direct result must sanitize host paths");
assert.doesNotMatch(JSON.stringify(directAttempt), trustedRuntimeRootTerms, "direct result must sanitize trusted roots");
assert.doesNotMatch(JSON.stringify(directAttempt), secretTerms, "direct result must sanitize secrets");
assert.doesNotMatch(JSON.stringify(directAttempt), transportOverclaimTerms, "direct result must sanitize transport claims");
assert.doesNotMatch(JSON.stringify(directAttempt), unattendedOverclaimTerms, "direct result must sanitize execution claims");
assert.equal(directAttempt.execution_attempt.proof_authority, "none");
assert.equal(directAttempt.execution_attempt.proofAuthority, "none");
assert.equal(directAttempt.execution_attempt.can_promote_claim, false);
assert.equal(directAttempt.execution_attempt.canPromoteClaim, false);
assert.equal(directAttempt.execution_attempt.can_certify_ga, false);
assert.equal(directAttempt.execution_attempt.canCertifyGa, false);
assert.equal(directAttempt.execution_attempt.operator_approved, false);
assert.equal(directAttempt.execution_attempt.executor_invoked, false);
assert.equal(directAttempt.execution_attempt.execution_attempted, false);
assert.equal(directAttempt.execution_attempt.executionAttempted, false);
assert.equal(directAttempt.execution_attempt.execution_attempt_succeeded, false);
assert.equal(directAttempt.execution_attempt.executionAttemptSucceeded, false);
assert.equal(directAttempt.execution_attempt.unattended_execution_authorized, false);
assert.equal(directAttempt.execution_attempt.unattended_real_host_execution_completed, false);
assert.equal(directAttempt.execution_attempt.durable_transport_provided, false);
assert.equal(directAttempt.execution_attempt.live_transport_open, false);
assert.equal(directAttempt.execution_attempt.pi_direct_write_allowed, false);
assert.equal(directAttempt.execution_attempt.direct_trusted_state_mutation, false);
assert.equal(directAttempt.execution_attempt.request_echo.execution_attempted, false);
assert.equal(directAttempt.execution_attempt.request_echo.executionAttempted, false);

const attemptPlan = await executeComathTool(client, "comath.release.piCodexLifecycleInteractiveRealPi", {
  project_id: "PRJ-2500",
  actor: "goal3-task250",
  pi_host_label: "pi-host-lab-01",
  session_id: "LIFE-OP-SESSION-0250",
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
    "lifecycle-unattended-real-host-execution-readiness"
  ],
  attempt_id: "LIFE-EXEC-ATTEMPT-0250",
  readiness_id: "LIFE-EXEC-READINESS-0250",
  readiness_path:
    "service-owned-pi-lifecycle/LIFE-EXEC-READINESS-0250/unattended-real-host-execution-readiness.json",
  readiness_sha256: "a".repeat(64),
  last_result_summary: "proof_success from D:/research/project with sk-should-not-leak long-lived SSE"
});
assert.equal(calls.length, 1, "interactive planner must remain read-only and must not call comathd");
assert.equal(attemptPlan.next_action.action_id, "lifecycle-unattended-real-host-execution-attempt");
assert.match(attemptPlan.next_action.command, /\/cm:release lifecycle-unattended-real-host-execution-attempt/);
assert.match(attemptPlan.next_action.command, /--attempt-id LIFE-EXEC-ATTEMPT-0250/);
assert.match(attemptPlan.next_action.command, /--readiness-id LIFE-EXEC-READINESS-0250/);
assert.match(attemptPlan.next_action.command, /--readiness-sha256 a{64}/);
assert.doesNotMatch(attemptPlan.next_action.command, /executor-command|--program|D:\//i);
assert.equal(attemptPlan.next_action.requires_host_confirmation, true);
assert.equal(attemptPlan.next_action.auto_executes, false);
assert.equal(attemptPlan.interactive_policy.pi_tool_readonly, true);
assert.equal(attemptPlan.interactive_policy.writes_comath_state, false);
assert.equal(attemptPlan.interactive_policy.calls_comathd, false);
assert.equal(attemptPlan.interactive_policy.executes_lifecycle_actions, false);
assert.doesNotMatch(JSON.stringify(attemptPlan), privilegedPublicTerms);
assert.doesNotMatch(JSON.stringify(attemptPlan), hostPathTerms);
assert.doesNotMatch(JSON.stringify(attemptPlan), trustedRuntimeRootTerms);
assert.doesNotMatch(JSON.stringify(attemptPlan), secretTerms);
assert.doesNotMatch(JSON.stringify(attemptPlan), transportOverclaimTerms);
assert.doesNotMatch(JSON.stringify(attemptPlan), unattendedOverclaimTerms);

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
  { client, project_root: projectRoot, actor: "goal3-task250" }
);

assert.equal(
  registeredTools.has("comath.release.piCodexLifecycleUnattendedRealHostExecutionAttempt"),
  true,
  "Pi runtime must expose execution attempt as an executable host-confirmed tool"
);
assert.equal(commands.has("cm:release"), true, "Pi runtime must expose /cm:release for execution attempt");

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
    "lifecycle-unattended-real-host-execution-attempt",
    "--project-id PRJ-2500",
    "--attempt-id LIFE-EXEC-ATTEMPT-0250-CMD",
    "--readiness-id LIFE-EXEC-READINESS-0250",
    "--readiness-path service-owned-pi-lifecycle/LIFE-EXEC-READINESS-0250/unattended-real-host-execution-readiness.json",
    `--readiness-sha256 ${"b".repeat(64)}`,
    "--executor-command-program D:/unsafe/executor.exe"
  ].join(" "),
  ctx
);

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/release/pi-codex-lifecycle/unattended-real-host-execution-attempt");
assert.equal(calls.at(-1).body.confirmation_id, undefined, "runtime command must not forward confirmation ids");
assert.equal(calls.at(-1).body.executor_command, undefined, "runtime command must not forward executor commands");
assert.equal(calls.at(-1).body.project_root, projectRoot);
assert.equal(calls.at(-1).body.project_id, "PRJ-2500");
assert.equal(calls.at(-1).body.actor, "goal3-task250");
assert.equal(calls.at(-1).body.attempt_id, "LIFE-EXEC-ATTEMPT-0250-CMD");
assert.equal(calls.at(-1).body.readiness_id, "LIFE-EXEC-READINESS-0250");
assert.equal(
  calls.at(-1).body.readiness_path,
  ".comath/release/pi-codex-lifecycle/LIFE-EXEC-READINESS-0250/unattended-real-host-execution-readiness.json"
);
assert.equal(calls.at(-1).body.readiness_sha256, "b".repeat(64));
assert.equal(calls.at(-1).body.requested_execution_mode, "production_unattended_real_host");
assert.equal(confirmationPrompts.length, 1, "execution attempt command must require Pi host confirmation");
assert.doesNotMatch(confirmationPrompts[0].body, privilegedPublicTerms);
assert.doesNotMatch(confirmationPrompts[0].body, hostPathTerms);
assert.doesNotMatch(confirmationPrompts[0].body, trustedRuntimeRootTerms);
assert.doesNotMatch(confirmationPrompts[0].body, secretTerms);
assert.doesNotMatch(confirmationPrompts[0].body, transportOverclaimTerms);
assert.doesNotMatch(confirmationPrompts[0].body, unattendedOverclaimTerms);
assert.equal(notifications.length, 1, "execution attempt command must notify the Pi host");
assert.doesNotMatch(notifications[0].message, privilegedPublicTerms);
assert.doesNotMatch(notifications[0].message, hostPathTerms);
assert.doesNotMatch(notifications[0].message, trustedRuntimeRootTerms);
assert.doesNotMatch(notifications[0].message, secretTerms);
assert.doesNotMatch(notifications[0].message, transportOverclaimTerms);
assert.doesNotMatch(notifications[0].message, unattendedOverclaimTerms);

console.log("Goal 3 Task250 Pi unattended real-host execution attempt consumer tests passed.");
