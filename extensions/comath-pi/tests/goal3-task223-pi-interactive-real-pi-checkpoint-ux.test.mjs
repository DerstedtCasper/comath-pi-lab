import assert from "node:assert/strict";
import registerComathPiRuntime, { createComathTools, executeComathTool, runtime_registration } from "../dist/index.js";

const projectRoot = "D:/research/project";
const privilegedPublicTerms =
  /clean_replay_passed|completed_formal_proof|formally_checked|proven|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence|proof_success|kernel_checked/i;
const hostPathTerms = /D:\\|D:\/|\/home\/pi|\/root\//i;
const trustedRuntimeRootTerms = /\.comath[\\/]|%2ecomath/i;
const secretTerms = /COMATH_CODEX_API_KEY|OPENAI_API_KEY|Authorization:\s*Bearer|api_key|token=|plain-token|sk-/i;
const transportOverclaimTerms =
  /long-lived\s+(?:websocket|sse)|indefinite\s+sse|terminal transport recovered live|durable transport provided/i;

function toolDescriptor(name) {
  const tool = createComathTools().find((descriptor) => descriptor.name === name);
  assert.ok(tool, `${name} must be registered for interactive real-Pi checkpoint UX`);
  return tool;
}

const expectedCheckpointSteps = [
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
  "run-codex-api-probe",
  "review"
];

const interactiveTool = toolDescriptor("comath.release.piCodexLifecycleInteractiveRealPi");
assert.equal(interactiveTool.mutates, false, "interactive real-Pi checkpoint UX must remain read-only");
assert.deepEqual(interactiveTool.input_schema.required, ["project_id", "actor", "pi_host_label", "session_id", "action"]);
assert.deepEqual(interactiveTool.input_schema.properties.action.enum, [
  "plan",
  "status",
  "resume-plan",
  "unattended-handoff",
  "operator-review-checklist"
]);
assert.deepEqual(interactiveTool.input_schema.properties.completed_steps.items.enum, expectedCheckpointSteps);
assert.equal(
  Object.hasOwn(interactiveTool.input_schema.properties, "confirmation_id"),
  false,
  "interactive real-Pi planner must not accept model-supplied confirmation ids"
);

const releaseCommand = runtime_registration.commands.find((command) => command.command === "/cm:release");
assert.ok(releaseCommand, "/cm:release must be advertised in Pi runtime registration");
assert.equal(releaseCommand.subcommands.includes("lifecycle-interactive-real-pi"), true);

const directCalls = [];
const directClient = {
  get: async (path) => {
    directCalls.push({ method: "GET", path });
    return { ok: true, path };
  },
  post: async (path, body) => {
    directCalls.push({ method: "POST", path, body });
    return { ok: true, path, body };
  }
};

const expectedNextActions = [
  { completed: [], action: "run-real-pi-runtime-probe", command: /lifecycle-control run-real-pi-runtime-probe/ },
  {
    completed: ["run-real-pi-runtime-probe"],
    action: "lifecycle-operator-session",
    command: /\/cm:release lifecycle-operator-session/
  },
  {
    completed: ["run-real-pi-runtime-probe", "lifecycle-operator-session"],
    action: "lifecycle-operator-transport-recovery",
    command: /\/cm:release lifecycle-operator-transport-recovery/
  },
  {
    completed: ["run-real-pi-runtime-probe", "lifecycle-operator-session", "lifecycle-operator-transport-recovery"],
    action: "lifecycle-operator-transport-lease",
    command: /\/cm:release lifecycle-operator-transport-lease/
  },
  {
    completed: [
      "run-real-pi-runtime-probe",
      "lifecycle-operator-session",
      "lifecycle-operator-transport-recovery",
      "lifecycle-operator-transport-lease"
    ],
    action: "lifecycle-operator-transport-heartbeat",
    command: /\/cm:release lifecycle-operator-transport-heartbeat/
  },
  {
    completed: [
      "run-real-pi-runtime-probe",
      "lifecycle-operator-session",
      "lifecycle-operator-transport-recovery",
      "lifecycle-operator-transport-lease",
      "lifecycle-operator-transport-heartbeat"
    ],
    action: "lifecycle-guided-real-pi-execution",
    command: /\/cm:release lifecycle-guided-real-pi-execution/
  },
  {
    completed: [
      "run-real-pi-runtime-probe",
      "lifecycle-operator-session",
      "lifecycle-operator-transport-recovery",
      "lifecycle-operator-transport-lease",
      "lifecycle-operator-transport-heartbeat",
      "lifecycle-guided-real-pi-execution"
    ],
    action: "lifecycle-operator-service-transport-contract",
    command: /\/cm:release lifecycle-operator-service-transport-contract/
  },
  {
    completed: [
      "run-real-pi-runtime-probe",
      "lifecycle-operator-session",
      "lifecycle-operator-transport-recovery",
      "lifecycle-operator-transport-lease",
      "lifecycle-operator-transport-heartbeat",
      "lifecycle-guided-real-pi-execution",
      "lifecycle-operator-service-transport-contract"
    ],
    action: "lifecycle-automatic-real-pi-execution",
    command: /\/cm:release lifecycle-automatic-real-pi-execution/
  },
  {
    completed: [
      "run-real-pi-runtime-probe",
      "lifecycle-operator-session",
      "lifecycle-operator-transport-recovery",
      "lifecycle-operator-transport-lease",
      "lifecycle-operator-transport-heartbeat",
      "lifecycle-guided-real-pi-execution",
      "lifecycle-operator-service-transport-contract",
      "lifecycle-automatic-real-pi-execution"
    ],
    action: "lifecycle-operator-service-transport-continuity",
    command: /\/cm:release lifecycle-operator-service-transport-continuity/
  },
  {
    completed: [
      "run-real-pi-runtime-probe",
      "lifecycle-operator-session",
      "lifecycle-operator-transport-recovery",
      "lifecycle-operator-transport-lease",
      "lifecycle-operator-transport-heartbeat",
      "lifecycle-guided-real-pi-execution",
      "lifecycle-operator-service-transport-contract",
      "lifecycle-automatic-real-pi-execution",
      "lifecycle-operator-service-transport-continuity"
    ],
    action: "lifecycle-unattended-real-host-handoff-review",
    command: /\/cm:release lifecycle-unattended-real-host-handoff-review/
  },
  {
    completed: [
      "run-real-pi-runtime-probe",
      "lifecycle-operator-session",
      "lifecycle-operator-transport-recovery",
      "lifecycle-operator-transport-lease",
      "lifecycle-operator-transport-heartbeat",
      "lifecycle-guided-real-pi-execution",
      "lifecycle-operator-service-transport-contract",
      "lifecycle-automatic-real-pi-execution",
      "lifecycle-operator-service-transport-continuity",
      "lifecycle-unattended-real-host-handoff-review"
    ],
    action: "lifecycle-unattended-real-host-operator-approval",
    command: /\/cm:release lifecycle-unattended-real-host-operator-approval/
  },
  {
    completed: [
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
      "lifecycle-unattended-real-host-operator-approval"
    ],
    action: "lifecycle-unattended-real-host-executor-contract",
    command: /\/cm:release lifecycle-unattended-real-host-executor-contract/
  },
  {
    completed: [
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
      "lifecycle-unattended-real-host-executor-contract"
    ],
    action: "lifecycle-unattended-real-host-durable-transport-contract",
    command: /\/cm:release lifecycle-unattended-real-host-durable-transport-contract/
  },
  {
    completed: [
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
      "lifecycle-unattended-real-host-durable-transport-contract"
    ],
    action: "lifecycle-unattended-real-host-execution-readiness",
    command: /\/cm:release lifecycle-unattended-real-host-execution-readiness/
  },
  {
    completed: [
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
    action: "lifecycle-unattended-real-host-execution-attempt",
    command: /\/cm:release lifecycle-unattended-real-host-execution-attempt/
  },
  {
    completed: [
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
    action: "lifecycle-unattended-real-host-execution-attempt-review",
    command: /\/cm:release lifecycle-unattended-real-host-execution-attempt-review/
  },
  {
    completed: [
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
    action: "lifecycle-unattended-real-host-completion-certification-prerequisite",
    command: /\/cm:release lifecycle-unattended-real-host-completion-certification-prerequisite/
  },
  {
    completed: [
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
    action: "run-codex-api-probe",
    command: /lifecycle-control run-codex-api-probe/
  },
  {
    completed: [
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
      "run-codex-api-probe"
    ],
    action: "review",
    command: /lifecycle-control review/
  }
];

for (const expected of expectedNextActions) {
  const plan = await executeComathTool(directClient, "comath.release.piCodexLifecycleInteractiveRealPi", {
    project_id: "PRJ-223",
    actor: "goal3-task223",
    pi_host_label: "pi-host-lab-01",
    session_id: "LIFE-SESSION-0223",
    action: "resume-plan",
    session_kind: "real_pi_host_manual_install",
    completed_steps: expected.completed,
    probe_id: "LIFE-PI-RUNTIME-0223",
    validation_id: "LIFE-CODEX-0223",
    review_id: "LIFE-REVIEW-0223",
    transport_recovery_id: "LIFE-TRANSPORT-0223",
    transport_lease_id: "LIFE-TRANSPORT-LEASE-0223",
    transport_heartbeat_id: "LIFE-TRANSPORT-HEARTBEAT-0223",
    execution_id: "LIFE-GUIDED-EXEC-0223",
    terminal_review_id: "LIFE-TERMINAL-REVIEW-0223",
    transport_contract_id: "LIFE-TRANSPORT-CONTRACT-0223",
    handoff_review_id: "LIFE-HANDOFF-REVIEW-0223",
    orchestration_id: "LIFE-AUTOMATIC-REAL-PI-0223",
    continuity_id: "LIFE-TRANSPORT-CONTINUITY-0223",
    automatic_orchestration_sha256: "1".repeat(64),
    transport_continuity_sha256: "2".repeat(64),
    transport_contract_sha256: "0".repeat(64),
    session_manifest_path: ".comath/release/pi-codex-lifecycle/LIFE-SESSION-0223/operator-session-manifest.json",
    transport_recovery_path:
      ".comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-0223/operator-transport-recovery.json",
    transport_lease_path:
      ".comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-LEASE-0223/operator-transport-lease.json",
    pi_install_transcript_path:
      ".comath/release/pi-codex-lifecycle/LIFE-PI-RUNTIME-0223/pi-install-transcript.md",
    runtime_registration_snapshot_path:
      ".comath/release/pi-codex-lifecycle/LIFE-PI-RUNTIME-0223/runtime-registration-snapshot.json",
    terminal_review_path:
      ".comath/release/pi-codex-lifecycle/LIFE-TERMINAL-REVIEW-0223/terminal-execution-review.json",
    transport_contract_path:
      ".comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-CONTRACT-0223/operator-service-transport-contract.json",
    operator_event_cursor: "event:42 Authorization: Bearer plain-token",
    stdout_cursor: "stdout:42",
    stderr_cursor: "stderr:0 clean_replay_passed from D:/research/project",
    last_result_summary: "formal_replay_passed from D:/research/project with sk-should-not-leak long-lived SSE"
  });

  assert.equal(directCalls.length, 0, "interactive real-Pi planner must not call comathd");
  assert.equal(plan.schema_version, "comath.pi.lifecycle.interactive_real_pi_checkpoint_ux.v1");
  assert.equal(plan.proof_authority, "none");
  assert.equal(plan.can_promote_claim, false);
  assert.equal(plan.can_certify_ga, false);
  assert.equal(plan.direct_trusted_state_mutation, false);
  assert.equal(plan.durable_transport_provided, false);
  assert.equal(plan.long_lived_sse_provided, false);
  assert.equal(plan.long_lived_websocket_provided, false);
  assert.deepEqual(
    plan.ordered_steps.map((step) => step.action_id),
    expectedCheckpointSteps
  );
  assert.equal(plan.next_action.action_id, expected.action);
  assert.match(plan.next_action.command, expected.command);
  assert.equal(plan.next_action.requires_host_confirmation, true);
  assert.equal(plan.next_action.auto_executes, false);
  assert.equal(plan.interactive_policy.pi_tool_readonly, true);
  assert.equal(plan.interactive_policy.writes_comath_state, false);
  assert.equal(plan.interactive_policy.calls_comathd, false);
  assert.equal(plan.interactive_policy.executes_lifecycle_actions, false);
  assert.equal(plan.interactive_policy.mutating_steps_require_host_confirmation, true);
  assert.doesNotMatch(JSON.stringify(plan), privilegedPublicTerms);
  assert.doesNotMatch(JSON.stringify(plan), hostPathTerms);
  assert.doesNotMatch(JSON.stringify(plan), trustedRuntimeRootTerms);
  assert.doesNotMatch(JSON.stringify(plan), secretTerms);
  assert.doesNotMatch(JSON.stringify(plan), transportOverclaimTerms);
}

const poisonedPlan = await executeComathTool(directClient, "comath.release.piCodexLifecycleInteractiveRealPi", {
  project_id: ".comath/release/PROJECT-POISON",
  actor: "/home/pi/operator proof_success",
  pi_host_label: "pi-host-lab-01",
  session_id: "%2ecomath%2frelease%2fSESSION-POISON",
  action: "plan",
  probe_id: "/home/pi/private/probe kernel_checked",
  transport_recovery_id: ".comath/release/TRANSPORT-POISON",
  session_manifest_path: ".comath/release/pi-codex-lifecycle/SESSION-POISON/operator-session-manifest.json",
  last_result_summary: "proof_success kernel_checked at /home/pi/private/project with token=plain-token"
});
assert.equal(poisonedPlan.project_id, "PROJECT");
assert.equal(poisonedPlan.actor, "operator");
assert.equal(poisonedPlan.session_id, "LIFECYCLE-SESSION");
assert.doesNotMatch(JSON.stringify(poisonedPlan), privilegedPublicTerms);
assert.doesNotMatch(JSON.stringify(poisonedPlan), hostPathTerms);
assert.doesNotMatch(JSON.stringify(poisonedPlan), trustedRuntimeRootTerms);
assert.doesNotMatch(JSON.stringify(poisonedPlan), secretTerms);
assert.doesNotMatch(JSON.stringify(poisonedPlan), transportOverclaimTerms);

const runtimeCalls = [];
const client = {
  get: async (path) => {
    runtimeCalls.push({ method: "GET", path });
    return { ok: true, path };
  },
  post: async (path, body) => {
    runtimeCalls.push({ method: "POST", path, body });
    return { ok: true, path, body };
  }
};

const commands = new Map();
const notifications = [];
const confirmationPrompts = [];
registerComathPiRuntime(
  {
    registerTool() {},
    registerCommand(name, options) {
      commands.set(name, options.handler);
    },
    on() {}
  },
  { client, project_root: projectRoot, actor: "goal3-task223" }
);

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
    "lifecycle-interactive-real-pi resume-plan",
    "--project-id PRJ-223",
    "--session-id .comath/release/pi-codex-lifecycle/LIFE-SESSION-0223",
    "--pi-host-label pi-host-lab-01",
    "--session-kind real_pi_host_manual_install",
    "--completed-step run-real-pi-runtime-probe",
    "--completed-step lifecycle-operator-session",
    "--completed-step lifecycle-operator-transport-recovery",
    "--completed-step lifecycle-operator-transport-lease",
    "--session-manifest-path .comath/release/pi-codex-lifecycle/LIFE-SESSION-0223/operator-session-manifest.json",
    "--transport-recovery-id LIFE-TRANSPORT-0223",
    "--transport-lease-id LIFE-TRANSPORT-LEASE-0223",
    "--transport-lease-path .comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-LEASE-0223/operator-transport-lease.json",
    "--operator-event-cursor 'event:42 Authorization: Bearer plain-token'",
    "--stdout-cursor stdout:42",
    "--stderr-cursor stderr:0",
    "--last-result-summary 'lean_kernel_clean_replay proof_success kernel_checked from D:/research/project and /home/pi/private with sk-should-not-leak long-lived SSE'"
  ].join(" "),
  ctx
);
assert.equal(runtimeCalls.length, 0, "interactive real-Pi command must not call comathd");
assert.equal(confirmationPrompts.length, 0, "interactive real-Pi command must not require host confirmation");
assert.equal(notifications.length, 1, "interactive real-Pi command must notify the Pi host");
assert.match(notifications[0].message, /lifecycle-operator-transport-heartbeat/);
assert.doesNotMatch(notifications[0].message, privilegedPublicTerms);
assert.doesNotMatch(notifications[0].message, hostPathTerms);
assert.doesNotMatch(notifications[0].message, trustedRuntimeRootTerms);
assert.doesNotMatch(notifications[0].message, secretTerms);
assert.doesNotMatch(notifications[0].message, transportOverclaimTerms);

console.log("Goal 3 Task223 interactive real-Pi checkpoint UX tests passed.");
