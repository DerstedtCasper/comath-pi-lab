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
  /production unattended executor|operator-free execution completed|unattended real-host execution completed|operator confirmation bypassed|service-owned evidence created|service-owned attempt review completed|service_owned_attempt_review_completed\s*=\s*true|serviceOwnedAttemptReviewCompleted\s*=\s*true|terminal unattended completion certified|terminal_unattended_completion_certified\s*=\s*true|terminalUnattendedCompletionCertified\s*=\s*true|attempt review status recorded terminal|attempt_review_status\s*=\s*reviewed_terminal_completion|attemptReviewStatus\s*=\s*reviewed_terminal_completion|terminal_goal_state\s*=\s*terminal_goal_completed|terminalGoalState\s*=\s*terminal_goal_completed|handoff can execute|unattended execution authorized|operator approval recorded|operator approved|executor invoked|executor_invoked\s*=\s*true|executorInvoked\s*=\s*true|execution_attempted\s*=\s*true|executionAttempted\s*=\s*true|execution_attempt_succeeded\s*=\s*true|executionAttemptSucceeded\s*=\s*true|GA certified/i;

function toolDescriptor(name) {
  const tool = createComathTools().find((descriptor) => descriptor.name === name);
  assert.ok(tool, `${name} must be registered for Pi unattended real-host execution attempt review`);
  return tool;
}

const reviewTool = toolDescriptor("comath.release.piCodexLifecycleUnattendedRealHostExecutionAttemptReview");
assert.equal(reviewTool.mutates, true, "attempt review consumer writes service-owned review evidence");
assert.deepEqual(reviewTool.input_schema.required, [
  "project_root",
  "project_id",
  "actor",
  "attempt_id",
  "attempt_path",
  "attempt_sha256",
  "confirmation_id"
]);
assert.equal(
  Object.hasOwn(reviewTool.input_schema.properties, "executor_command"),
  false,
  "Pi attempt review consumer must not expose executor_command to model/public UI"
);
assert.equal(
  Object.hasOwn(reviewTool.input_schema.properties, "attempt_result"),
  false,
  "Pi attempt review consumer must not expose caller-provided attempt_result as authority"
);

const interactiveTool = toolDescriptor("comath.release.piCodexLifecycleInteractiveRealPi");
assert.equal(
  interactiveTool.input_schema.properties.completed_steps.items.enum.includes(
    "lifecycle-unattended-real-host-execution-attempt-review"
  ),
  true,
  "interactive real-Pi planner must advertise terminal attempt review after execution attempt"
);

const releaseCommand = runtime_registration.commands.find((command) => command.command === "/cm:release");
assert.ok(releaseCommand, "/cm:release must be advertised in Pi runtime registration");
assert.equal(
  releaseCommand.subcommands.includes("lifecycle-unattended-real-host-execution-attempt-review"),
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
      execution_attempt_review: {
        schema_version: "comath.pi_codex_unattended_real_host_execution_attempt_review.v1",
        attempt_review_id: body.attempt_review_id,
        project_id: body.project_id,
        actor: body.actor,
        attempt_id: body.attempt_id,
        attempt_path: `${body.attempt_path} proof_success Authorization: Bearer plain-token`,
        attempt_sha256: body.attempt_sha256,
        attempt_review_status: "reviewed_terminal_completion",
        attemptReviewStatus: "reviewed_terminal_completion",
        terminal_goal_state: "terminal_goal_completed",
        terminalGoalState: "terminal_goal_completed",
        terminal_unattended_completion_certified: true,
        terminalUnattendedCompletionCertified: true,
        service_owned_attempt_review_completed: true,
        serviceOwnedAttemptReviewCompleted: true,
        unattended_real_host_execution_completed: true,
        unattendedRealHostExecutionCompleted: true,
        operator_approved: true,
        operatorApproved: true,
        handoff_can_execute: true,
        handoffCanExecute: true,
        unattended_execution_authorized: true,
        unattendedExecutionAuthorized: true,
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
          terminal_unattended_completion_certified: true,
          terminalUnattendedCompletionCertified: true,
          service_owned_attempt_review_completed: true,
          serviceOwnedAttemptReviewCompleted: true,
          unattended_real_host_execution_completed: true,
          unattendedRealHostExecutionCompleted: true
        },
        review_artifact: {
          kind: "unattended_real_host_execution_attempt_review",
          path:
            "D:/research/project/.comath/release/pi-codex-lifecycle/LIFE-ATTEMPT-REVIEW-0252/unattended-real-host-execution-attempt-review.json token=plain-token",
          sha256: "c".repeat(64),
          size_bytes: 1234
        },
        summary:
          "service-owned attempt review completed service_owned_attempt_review_completed=true terminal_unattended_completion_certified=true terminalGoalState=terminal_goal_completed after formal_replay_passed from D:/research/project with Authorization: Bearer plain-token and durable transport provided; unattended real-host execution completed; GA certified"
      }
    };
  }
};

const directReview = await executeComathTool(
  client,
  "comath.release.piCodexLifecycleUnattendedRealHostExecutionAttemptReview",
  {
    project_root: projectRoot,
    project_id: "PRJ-2520",
    actor:
      "goal3-task252 OPENAI_API_KEY=plain-token durable transport provided terminal unattended completion certified",
    attempt_review_id: "LIFE-ATTEMPT-REVIEW-0252",
    attempt_id: "LIFE-EXEC-ATTEMPT-0252",
    attempt_path:
      "service-owned-pi-lifecycle/LIFE-EXEC-ATTEMPT-0252/unattended-real-host-execution-attempt.json",
    attempt_sha256: "a".repeat(64),
    attempt_result: {
      exit_code: 0,
      stdout: "proof_success sk-should-not-leak"
    },
    executor_command: {
      program: "D:/unsafe/executor.exe"
    },
    confirmation_id: "CONF-TASK252-MUST-NOT-FORWARD"
  }
);

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/release/pi-codex-lifecycle/unattended-real-host-execution-attempt-review");
assert.equal(calls.at(-1).body.confirmation_id, undefined, "Pi must not forward model-supplied confirmation ids");
assert.equal(calls.at(-1).body.executor_command, undefined, "Pi must not forward public executor commands");
assert.equal(calls.at(-1).body.attempt_result, undefined, "Pi must not forward caller-provided attempt results");
assert.deepEqual(calls.at(-1).body, {
  project_root: projectRoot,
  project_id: "PRJ-2520",
  actor: "goal3-task252 [redacted_secret] bounded_transport_checkpoint_only prepared_checkpoint_handoff_only",
  attempt_review_id: "LIFE-ATTEMPT-REVIEW-0252",
  attempt_id: "LIFE-EXEC-ATTEMPT-0252",
  attempt_path:
    ".comath/release/pi-codex-lifecycle/LIFE-EXEC-ATTEMPT-0252/unattended-real-host-execution-attempt.json",
  attempt_sha256: "a".repeat(64)
});
assert.doesNotMatch(JSON.stringify(calls.at(-1).body), secretTerms, "Pi request body must not forward secrets");
assert.doesNotMatch(JSON.stringify(calls.at(-1).body), transportOverclaimTerms, "Pi request body must not forward transport claims");
assert.doesNotMatch(JSON.stringify(calls.at(-1).body), unattendedOverclaimTerms, "Pi request body must not forward terminal review claims");
assert.doesNotMatch(JSON.stringify(directReview), privilegedPublicTerms, "direct result must sanitize proof wording");
assert.doesNotMatch(JSON.stringify(directReview), hostPathTerms, "direct result must sanitize host paths");
assert.doesNotMatch(JSON.stringify(directReview), trustedRuntimeRootTerms, "direct result must sanitize trusted roots");
assert.doesNotMatch(JSON.stringify(directReview), secretTerms, "direct result must sanitize secrets");
assert.doesNotMatch(JSON.stringify(directReview), transportOverclaimTerms, "direct result must sanitize transport claims");
assert.doesNotMatch(JSON.stringify(directReview), unattendedOverclaimTerms, "direct result must sanitize terminal review claims");
assert.equal(directReview.execution_attempt_review.proof_authority, "none");
assert.equal(directReview.execution_attempt_review.proofAuthority, "none");
assert.equal(directReview.execution_attempt_review.can_promote_claim, false);
assert.equal(directReview.execution_attempt_review.canPromoteClaim, false);
assert.equal(directReview.execution_attempt_review.can_certify_ga, false);
assert.equal(directReview.execution_attempt_review.canCertifyGa, false);
assert.equal(directReview.execution_attempt_review.operator_approved, false);
assert.equal(directReview.execution_attempt_review.unattended_execution_authorized, false);
assert.equal(directReview.execution_attempt_review.unattended_real_host_execution_completed, false);
assert.equal(directReview.execution_attempt_review.durable_transport_provided, false);
assert.equal(directReview.execution_attempt_review.live_transport_open, false);
assert.equal(directReview.execution_attempt_review.pi_direct_write_allowed, false);
assert.equal(directReview.execution_attempt_review.direct_trusted_state_mutation, false);
assert.equal(directReview.execution_attempt_review.terminal_unattended_completion_certified, false);
assert.equal(directReview.execution_attempt_review.terminalUnattendedCompletionCertified, false);
assert.equal(directReview.execution_attempt_review.service_owned_attempt_review_completed, false);
assert.equal(directReview.execution_attempt_review.serviceOwnedAttemptReviewCompleted, false);
assert.equal(directReview.execution_attempt_review.request_echo.terminal_unattended_completion_certified, false);
assert.equal(directReview.execution_attempt_review.request_echo.terminalUnattendedCompletionCertified, false);

await assert.rejects(
  () =>
    executeComathTool(client, "comath.release.piCodexLifecycleUnattendedRealHostExecutionAttemptReview", {
      project_root: projectRoot,
      project_id: "PRJ-2520",
      actor: "goal3-task252 wrong alias",
      attempt_id: "LIFE-EXEC-ATTEMPT-0252",
      attempt_path:
        "service-owned-pi-lifecycle/LIFE-EXEC-READINESS-0252/unattended-real-host-execution-readiness.json",
      attempt_sha256: "d".repeat(64),
      confirmation_id: "CONF-TASK252-WRONG-ALIAS"
    }),
  /attempt_path.*unattended-real-host-execution-attempt\.json/i,
  "attempt review consumer must not translate non-attempt lifecycle aliases"
);
assert.equal(calls.length, 1, "wrong public alias must fail before another service POST");

const reviewPlan = await executeComathTool(client, "comath.release.piCodexLifecycleInteractiveRealPi", {
  project_id: "PRJ-2520",
  actor: "goal3-task252",
  pi_host_label: "pi-host-lab-01",
  session_id: "LIFE-OP-SESSION-0252",
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
    "lifecycle-unattended-real-host-execution-attempt"
  ],
  attempt_review_id: "LIFE-ATTEMPT-REVIEW-0252",
  attempt_id: "LIFE-EXEC-ATTEMPT-0252",
  attempt_path:
    "service-owned-pi-lifecycle/LIFE-EXEC-ATTEMPT-0252/unattended-real-host-execution-attempt.json",
  attempt_sha256: "a".repeat(64),
  last_result_summary: "proof_success from D:/research/project with sk-should-not-leak long-lived SSE"
});
assert.equal(calls.length, 1, "interactive planner must remain read-only and must not call comathd");
assert.equal(reviewPlan.next_action.action_id, "lifecycle-unattended-real-host-execution-attempt-review");
assert.match(reviewPlan.next_action.command, /\/cm:release lifecycle-unattended-real-host-execution-attempt-review/);
assert.match(reviewPlan.next_action.command, /--attempt-review-id LIFE-ATTEMPT-REVIEW-0252/);
assert.match(reviewPlan.next_action.command, /--attempt-id LIFE-EXEC-ATTEMPT-0252/);
assert.match(reviewPlan.next_action.command, /--attempt-sha256 a{64}/);
assert.doesNotMatch(reviewPlan.next_action.command, /executor-command|attempt-result|--program|D:\//i);
assert.equal(reviewPlan.next_action.requires_host_confirmation, true);
assert.equal(reviewPlan.next_action.auto_executes, false);
assert.equal(reviewPlan.interactive_policy.pi_tool_readonly, true);
assert.equal(reviewPlan.interactive_policy.writes_comath_state, false);
assert.equal(reviewPlan.interactive_policy.calls_comathd, false);
assert.equal(reviewPlan.interactive_policy.executes_lifecycle_actions, false);
assert.doesNotMatch(JSON.stringify(reviewPlan), privilegedPublicTerms);
assert.doesNotMatch(JSON.stringify(reviewPlan), hostPathTerms);
assert.doesNotMatch(JSON.stringify(reviewPlan), trustedRuntimeRootTerms);
assert.doesNotMatch(JSON.stringify(reviewPlan), secretTerms);
assert.doesNotMatch(JSON.stringify(reviewPlan), transportOverclaimTerms);
assert.doesNotMatch(JSON.stringify(reviewPlan), unattendedOverclaimTerms);

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
  { client, project_root: projectRoot, actor: "goal3-task252" }
);

assert.equal(
  registeredTools.has("comath.release.piCodexLifecycleUnattendedRealHostExecutionAttemptReview"),
  true,
  "Pi runtime must expose attempt review as an executable host-confirmed tool"
);
assert.equal(commands.has("cm:release"), true, "Pi runtime must expose /cm:release for attempt review");

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
    "lifecycle-unattended-real-host-execution-attempt-review",
    "--project-id PRJ-2520",
    "--attempt-review-id LIFE-ATTEMPT-REVIEW-0252-CMD",
    "--attempt-id LIFE-EXEC-ATTEMPT-0252",
    "--attempt-path service-owned-pi-lifecycle/LIFE-EXEC-ATTEMPT-0252/unattended-real-host-execution-attempt.json",
    `--attempt-sha256 ${"b".repeat(64)}`,
    "--executor-command-program D:/unsafe/executor.exe",
    "--attempt-result-json '{\"exit_code\":0}'"
  ].join(" "),
  ctx
);

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/release/pi-codex-lifecycle/unattended-real-host-execution-attempt-review");
assert.equal(calls.at(-1).body.confirmation_id, undefined, "runtime command must not forward confirmation ids");
assert.equal(calls.at(-1).body.executor_command, undefined, "runtime command must not forward executor commands");
assert.equal(calls.at(-1).body.attempt_result, undefined, "runtime command must not forward caller-provided attempt results");
assert.equal(calls.at(-1).body.project_root, projectRoot);
assert.equal(calls.at(-1).body.project_id, "PRJ-2520");
assert.equal(calls.at(-1).body.actor, "goal3-task252");
assert.equal(calls.at(-1).body.attempt_review_id, "LIFE-ATTEMPT-REVIEW-0252-CMD");
assert.equal(calls.at(-1).body.attempt_id, "LIFE-EXEC-ATTEMPT-0252");
assert.equal(
  calls.at(-1).body.attempt_path,
  ".comath/release/pi-codex-lifecycle/LIFE-EXEC-ATTEMPT-0252/unattended-real-host-execution-attempt.json"
);
assert.equal(calls.at(-1).body.attempt_sha256, "b".repeat(64));
assert.equal(confirmationPrompts.length, 1, "attempt review command must require Pi host confirmation");
assert.doesNotMatch(confirmationPrompts[0].body, privilegedPublicTerms);
assert.doesNotMatch(confirmationPrompts[0].body, hostPathTerms);
assert.doesNotMatch(confirmationPrompts[0].body, trustedRuntimeRootTerms);
assert.doesNotMatch(confirmationPrompts[0].body, secretTerms);
assert.doesNotMatch(confirmationPrompts[0].body, transportOverclaimTerms);
assert.doesNotMatch(confirmationPrompts[0].body, unattendedOverclaimTerms);
assert.equal(notifications.length, 1, "attempt review command must notify the Pi host");
assert.doesNotMatch(notifications[0].message, privilegedPublicTerms);
assert.doesNotMatch(notifications[0].message, hostPathTerms);
assert.doesNotMatch(notifications[0].message, trustedRuntimeRootTerms);
assert.doesNotMatch(notifications[0].message, secretTerms);
assert.doesNotMatch(notifications[0].message, transportOverclaimTerms);
assert.doesNotMatch(notifications[0].message, unattendedOverclaimTerms);

console.log("Goal 3 Task252 Pi unattended real-host execution attempt review consumer tests passed.");
