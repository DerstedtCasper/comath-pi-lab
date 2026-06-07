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
  /production unattended executor|operator-free execution completed|unattended real-host execution completed|operator confirmation bypassed|service-owned evidence created|service-owned attempt review completed|service_owned_attempt_review_completed\s*=\s*true|serviceOwnedAttemptReviewCompleted\s*=\s*true|terminal unattended completion certified|terminal_unattended_completion_certified\s*=\s*true|terminalUnattendedCompletionCertified\s*=\s*true|completion certificate available|completion_certificate_available\s*=\s*true|completionCertificateAvailable\s*=\s*true|completion certification prerequisite recorded terminal|completion_certification_prerequisite_status\s*=\s*certified_terminal_completion|completionCertificationPrerequisiteStatus\s*=\s*certified_terminal_completion|terminal_goal_state\s*=\s*terminal_goal_completed|terminalGoalState\s*=\s*terminal_goal_completed|handoff can execute|unattended execution authorized|operator approval recorded|operator approved|executor invoked|executor_invoked\s*=\s*true|executorInvoked\s*=\s*true|execution_attempted\s*=\s*true|executionAttempted\s*=\s*true|execution_attempt_succeeded\s*=\s*true|executionAttemptSucceeded\s*=\s*true|GA certified/i;
const executorLeakTerms =
  /execution_attempt_command|execution_attempt_result|execution_attempt_result_path|execution_attempt_result_artifact|SHOULD_NOT_LEAK_EXECUTOR/i;

function toolDescriptor(name) {
  const tool = createComathTools().find((descriptor) => descriptor.name === name);
  assert.ok(tool, `${name} must be registered for Pi completion-certification prerequisite`);
  return tool;
}

const prerequisiteTool = toolDescriptor(
  "comath.release.piCodexLifecycleUnattendedRealHostCompletionCertificationPrerequisite"
);
assert.equal(prerequisiteTool.mutates, true, "completion prerequisite consumer writes service-owned blocker evidence");
assert.deepEqual(prerequisiteTool.input_schema.required, [
  "project_root",
  "project_id",
  "actor",
  "attempt_review_id",
  "attempt_review_path",
  "attempt_review_sha256",
  "confirmation_id"
]);
assert.equal(
  Object.hasOwn(prerequisiteTool.input_schema.properties, "executor_command"),
  false,
  "Pi completion prerequisite consumer must not expose executor_command to model/public UI"
);
assert.equal(
  Object.hasOwn(prerequisiteTool.input_schema.properties, "attempt_result"),
  false,
  "Pi completion prerequisite consumer must not expose caller-provided attempt_result as authority"
);
assert.equal(
  Object.hasOwn(prerequisiteTool.input_schema.properties, "completion_certificate"),
  false,
  "Pi completion prerequisite consumer must not expose completion certificates as model/public authority"
);

const interactiveTool = toolDescriptor("comath.release.piCodexLifecycleInteractiveRealPi");
assert.equal(
  interactiveTool.input_schema.properties.completed_steps.items.enum.includes(
    "lifecycle-unattended-real-host-completion-certification-prerequisite"
  ),
  true,
  "interactive real-Pi planner must advertise completion prerequisite after attempt review"
);

const releaseCommand = runtime_registration.commands.find((command) => command.command === "/cm:release");
assert.ok(releaseCommand, "/cm:release must be advertised in Pi runtime registration");
assert.equal(
  releaseCommand.subcommands.includes("lifecycle-unattended-real-host-completion-certification-prerequisite"),
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
      completion_certification_prerequisite: {
        schema_version: "comath.pi_codex_unattended_real_host_completion_certification_prerequisite.v1",
        completion_certification_prerequisite_id: body.completion_certification_prerequisite_id,
        project_id: body.project_id,
        actor: body.actor,
        completion_certification_prerequisite_status: "certified_terminal_completion",
        completionCertificationPrerequisiteStatus: "certified_terminal_completion",
        terminal_goal_state: "terminal_goal_completed",
        terminalGoalState: "terminal_goal_completed",
        completion_certificate_available: true,
        completionCertificateAvailable: true,
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
        execution_attempt_command: {
          program_label: "SHOULD_NOT_LEAK_EXECUTOR"
        },
        execution_attempt_result: {
          stdout: "SHOULD_NOT_LEAK_EXECUTOR_STDOUT"
        },
        request_echo: {
          proof_authority: "lean_kernel_clean_replay",
          proofAuthority: "lean_kernel_clean_replay",
          terminal_unattended_completion_certified: true,
          terminalUnattendedCompletionCertified: true,
          completion_certificate_available: true,
          completionCertificateAvailable: true,
          execution_attempt_result: "SHOULD_NOT_LEAK_EXECUTOR_STDOUT"
        },
        attempt_review_artifact: {
          kind: "unattended_real_host_execution_attempt_review",
          path:
            "D:/research/project/.comath/release/pi-codex-lifecycle/LIFE-ATTEMPT-REVIEW-0254/unattended-real-host-execution-attempt-review.json token=plain-token",
          sha256: "c".repeat(64),
          size_bytes: 1234
        },
        summary:
          "completion certificate available completion_certificate_available=true terminal_unattended_completion_certified=true terminalGoalState=terminal_goal_completed after formal_replay_passed from D:/research/project with Authorization: Bearer plain-token and durable transport provided; unattended real-host execution completed; SHOULD_NOT_LEAK_EXECUTOR_STDOUT; GA certified"
      }
    };
  }
};

const directPrerequisite = await executeComathTool(
  client,
  "comath.release.piCodexLifecycleUnattendedRealHostCompletionCertificationPrerequisite",
  {
    project_root: projectRoot,
    project_id: "PRJ-2540",
    actor:
      "goal3-task254 OPENAI_API_KEY=plain-token durable transport provided terminal unattended completion certified",
    completion_certification_prerequisite_id: "LIFE-COMPLETION-CERTIFICATION-PREREQ-0254",
    attempt_review_id: "LIFE-ATTEMPT-REVIEW-0254",
    attempt_review_path:
      "service-owned-pi-lifecycle/LIFE-ATTEMPT-REVIEW-0254/unattended-real-host-execution-attempt-review.json",
    attempt_review_sha256: "a".repeat(64),
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
    confirmation_id: "CONF-TASK254-MUST-NOT-FORWARD"
  }
);

assert.equal(calls.at(-1).method, "POST");
assert.equal(
  calls.at(-1).path,
  "/release/pi-codex-lifecycle/unattended-real-host-completion-certification-prerequisite"
);
assert.equal(calls.at(-1).body.confirmation_id, undefined, "Pi must not forward model-supplied confirmation ids");
assert.equal(calls.at(-1).body.executor_command, undefined, "Pi must not forward public executor commands");
assert.equal(calls.at(-1).body.attempt_result, undefined, "Pi must not forward caller-provided attempt results");
assert.equal(calls.at(-1).body.completion_certificate, undefined, "Pi must not forward completion certificates");
assert.deepEqual(calls.at(-1).body, {
  project_root: projectRoot,
  project_id: "PRJ-2540",
  actor: "goal3-task254 [redacted_secret] bounded_transport_checkpoint_only prepared_checkpoint_handoff_only",
  completion_certification_prerequisite_id: "LIFE-COMPLETION-CERTIFICATION-PREREQ-0254",
  attempt_review_id: "LIFE-ATTEMPT-REVIEW-0254",
  attempt_review_path:
    ".comath/release/pi-codex-lifecycle/LIFE-ATTEMPT-REVIEW-0254/unattended-real-host-execution-attempt-review.json",
  attempt_review_sha256: "a".repeat(64)
});
assert.doesNotMatch(JSON.stringify(calls.at(-1).body), secretTerms, "Pi request body must not forward secrets");
assert.doesNotMatch(JSON.stringify(calls.at(-1).body), transportOverclaimTerms, "Pi request body must not forward transport claims");
assert.doesNotMatch(JSON.stringify(calls.at(-1).body), unattendedOverclaimTerms, "Pi request body must not forward completion claims");
assert.doesNotMatch(JSON.stringify(calls.at(-1).body), executorLeakTerms, "Pi request body must not forward executor material");
assert.doesNotMatch(JSON.stringify(directPrerequisite), privilegedPublicTerms, "direct result must sanitize proof wording");
assert.doesNotMatch(JSON.stringify(directPrerequisite), hostPathTerms, "direct result must sanitize host paths");
assert.doesNotMatch(JSON.stringify(directPrerequisite), trustedRuntimeRootTerms, "direct result must sanitize trusted roots");
assert.doesNotMatch(JSON.stringify(directPrerequisite), secretTerms, "direct result must sanitize secrets");
assert.doesNotMatch(JSON.stringify(directPrerequisite), transportOverclaimTerms, "direct result must sanitize transport claims");
assert.doesNotMatch(JSON.stringify(directPrerequisite), unattendedOverclaimTerms, "direct result must sanitize terminal completion claims");
assert.doesNotMatch(JSON.stringify(directPrerequisite), executorLeakTerms, "direct result must sanitize executor material");
assert.equal(directPrerequisite.completion_certification_prerequisite.proof_authority, "none");
assert.equal(directPrerequisite.completion_certification_prerequisite.proofAuthority, "none");
assert.equal(directPrerequisite.completion_certification_prerequisite.can_promote_claim, false);
assert.equal(directPrerequisite.completion_certification_prerequisite.canPromoteClaim, false);
assert.equal(directPrerequisite.completion_certification_prerequisite.can_certify_ga, false);
assert.equal(directPrerequisite.completion_certification_prerequisite.canCertifyGa, false);
assert.equal(directPrerequisite.completion_certification_prerequisite.operator_approved, false);
assert.equal(directPrerequisite.completion_certification_prerequisite.unattended_execution_authorized, false);
assert.equal(directPrerequisite.completion_certification_prerequisite.unattended_real_host_execution_completed, false);
assert.equal(directPrerequisite.completion_certification_prerequisite.durable_transport_provided, false);
assert.equal(directPrerequisite.completion_certification_prerequisite.live_transport_open, false);
assert.equal(directPrerequisite.completion_certification_prerequisite.pi_direct_write_allowed, false);
assert.equal(directPrerequisite.completion_certification_prerequisite.direct_trusted_state_mutation, false);
assert.equal(directPrerequisite.completion_certification_prerequisite.terminal_unattended_completion_certified, false);
assert.equal(directPrerequisite.completion_certification_prerequisite.terminalUnattendedCompletionCertified, false);
assert.equal(directPrerequisite.completion_certification_prerequisite.completion_certificate_available, false);
assert.equal(directPrerequisite.completion_certification_prerequisite.completionCertificateAvailable, false);
assert.equal(directPrerequisite.completion_certification_prerequisite.request_echo.completion_certificate_available, false);
assert.equal(directPrerequisite.completion_certification_prerequisite.request_echo.completionCertificateAvailable, false);

await assert.rejects(
  () =>
    executeComathTool(client, "comath.release.piCodexLifecycleUnattendedRealHostCompletionCertificationPrerequisite", {
      project_root: projectRoot,
      project_id: "PRJ-2540",
      actor: "goal3-task254 wrong alias",
      attempt_review_id: "LIFE-ATTEMPT-REVIEW-0254",
      attempt_review_path:
        "service-owned-pi-lifecycle/LIFE-EXEC-ATTEMPT-0254/unattended-real-host-execution-attempt.json",
      attempt_review_sha256: "d".repeat(64),
      confirmation_id: "CONF-TASK254-WRONG-ALIAS"
    }),
  /attempt_review_path.*unattended-real-host-execution-attempt-review\.json/i,
  "completion prerequisite consumer must not translate non-review lifecycle aliases"
);
assert.equal(calls.length, 1, "wrong public alias must fail before another service POST");

const prerequisitePlan = await executeComathTool(client, "comath.release.piCodexLifecycleInteractiveRealPi", {
  project_id: "PRJ-2540",
  actor: "goal3-task254",
  pi_host_label: "pi-host-lab-01",
  session_id: "LIFE-OP-SESSION-0254",
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
    "lifecycle-unattended-real-host-execution-attempt-review"
  ],
  completion_certification_prerequisite_id: "LIFE-COMPLETION-CERTIFICATION-PREREQ-0254",
  attempt_review_id: "LIFE-ATTEMPT-REVIEW-0254",
  attempt_review_path:
    "service-owned-pi-lifecycle/LIFE-ATTEMPT-REVIEW-0254/unattended-real-host-execution-attempt-review.json",
  attempt_review_sha256: "a".repeat(64),
  last_result_summary: "proof_success from D:/research/project with sk-should-not-leak long-lived SSE"
});
assert.equal(calls.length, 1, "interactive planner must remain read-only and must not call comathd");
assert.equal(
  prerequisitePlan.next_action.action_id,
  "lifecycle-unattended-real-host-completion-certification-prerequisite"
);
assert.match(
  prerequisitePlan.next_action.command,
  /\/cm:release lifecycle-unattended-real-host-completion-certification-prerequisite/
);
assert.match(
  prerequisitePlan.next_action.command,
  /--completion-certification-prerequisite-id LIFE-COMPLETION-CERTIFICATION-PREREQ-0254/
);
assert.match(prerequisitePlan.next_action.command, /--attempt-review-id LIFE-ATTEMPT-REVIEW-0254/);
assert.match(prerequisitePlan.next_action.command, /--attempt-review-sha256 a{64}/);
assert.doesNotMatch(prerequisitePlan.next_action.command, /executor-command|attempt-result|completion-certificate|--program|D:\//i);
assert.equal(prerequisitePlan.next_action.requires_host_confirmation, true);
assert.equal(prerequisitePlan.next_action.auto_executes, false);
assert.equal(prerequisitePlan.interactive_policy.pi_tool_readonly, true);
assert.equal(prerequisitePlan.interactive_policy.writes_comath_state, false);
assert.equal(prerequisitePlan.interactive_policy.calls_comathd, false);
assert.equal(prerequisitePlan.interactive_policy.executes_lifecycle_actions, false);
assert.doesNotMatch(JSON.stringify(prerequisitePlan), privilegedPublicTerms);
assert.doesNotMatch(JSON.stringify(prerequisitePlan), hostPathTerms);
assert.doesNotMatch(JSON.stringify(prerequisitePlan), trustedRuntimeRootTerms);
assert.doesNotMatch(JSON.stringify(prerequisitePlan), secretTerms);
assert.doesNotMatch(JSON.stringify(prerequisitePlan), transportOverclaimTerms);
assert.doesNotMatch(JSON.stringify(prerequisitePlan), unattendedOverclaimTerms);
assert.doesNotMatch(JSON.stringify(prerequisitePlan), executorLeakTerms);

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
  { client, project_root: projectRoot, actor: "goal3-task254" }
);

assert.equal(
  registeredTools.has("comath.release.piCodexLifecycleUnattendedRealHostCompletionCertificationPrerequisite"),
  true,
  "Pi runtime must expose completion prerequisite as an executable host-confirmed tool"
);
assert.equal(commands.has("cm:release"), true, "Pi runtime must expose /cm:release for completion prerequisite");

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
    "lifecycle-unattended-real-host-completion-certification-prerequisite",
    "--project-id PRJ-2540",
    "--completion-certification-prerequisite-id LIFE-COMPLETION-CERTIFICATION-PREREQ-0254-CMD",
    "--attempt-review-id LIFE-ATTEMPT-REVIEW-0254",
    "--attempt-review-path service-owned-pi-lifecycle/LIFE-ATTEMPT-REVIEW-0254/unattended-real-host-execution-attempt-review.json",
    `--attempt-review-sha256 ${"b".repeat(64)}`,
    "--executor-command-program D:/unsafe/executor.exe",
    "--attempt-result-json '{\"exit_code\":0}'",
    "--completion-certificate-json '{\"status\":\"terminal\"}'"
  ].join(" "),
  ctx
);

assert.equal(calls.at(-1).method, "POST");
assert.equal(
  calls.at(-1).path,
  "/release/pi-codex-lifecycle/unattended-real-host-completion-certification-prerequisite"
);
assert.equal(calls.at(-1).body.confirmation_id, undefined, "runtime command must not forward confirmation ids");
assert.equal(calls.at(-1).body.executor_command, undefined, "runtime command must not forward executor commands");
assert.equal(calls.at(-1).body.attempt_result, undefined, "runtime command must not forward caller-provided attempt results");
assert.equal(calls.at(-1).body.completion_certificate, undefined, "runtime command must not forward completion certificates");
assert.equal(calls.at(-1).body.project_root, projectRoot);
assert.equal(calls.at(-1).body.project_id, "PRJ-2540");
assert.equal(calls.at(-1).body.actor, "goal3-task254");
assert.equal(
  calls.at(-1).body.completion_certification_prerequisite_id,
  "LIFE-COMPLETION-CERTIFICATION-PREREQ-0254-CMD"
);
assert.equal(calls.at(-1).body.attempt_review_id, "LIFE-ATTEMPT-REVIEW-0254");
assert.equal(
  calls.at(-1).body.attempt_review_path,
  ".comath/release/pi-codex-lifecycle/LIFE-ATTEMPT-REVIEW-0254/unattended-real-host-execution-attempt-review.json"
);
assert.equal(calls.at(-1).body.attempt_review_sha256, "b".repeat(64));
assert.equal(confirmationPrompts.length, 1, "completion prerequisite command must require Pi host confirmation");
assert.doesNotMatch(confirmationPrompts[0].body, privilegedPublicTerms);
assert.doesNotMatch(confirmationPrompts[0].body, hostPathTerms);
assert.doesNotMatch(confirmationPrompts[0].body, trustedRuntimeRootTerms);
assert.doesNotMatch(confirmationPrompts[0].body, secretTerms);
assert.doesNotMatch(confirmationPrompts[0].body, transportOverclaimTerms);
assert.doesNotMatch(confirmationPrompts[0].body, unattendedOverclaimTerms);
assert.doesNotMatch(confirmationPrompts[0].body, executorLeakTerms);
assert.equal(notifications.length, 1, "completion prerequisite command must notify the Pi host");
assert.doesNotMatch(notifications[0].message, privilegedPublicTerms);
assert.doesNotMatch(notifications[0].message, hostPathTerms);
assert.doesNotMatch(notifications[0].message, trustedRuntimeRootTerms);
assert.doesNotMatch(notifications[0].message, secretTerms);
assert.doesNotMatch(notifications[0].message, transportOverclaimTerms);
assert.doesNotMatch(notifications[0].message, unattendedOverclaimTerms);
assert.doesNotMatch(notifications[0].message, executorLeakTerms);

console.log("Goal 3 Task254 Pi unattended real-host completion certification prerequisite consumer tests passed.");
