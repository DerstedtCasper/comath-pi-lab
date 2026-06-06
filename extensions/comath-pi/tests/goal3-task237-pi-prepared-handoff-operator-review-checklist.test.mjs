import assert from "node:assert/strict";
import registerComathPiRuntime, { createComathTools, executeComathTool, runtime_registration } from "../dist/index.js";

const privilegedPublicTerms =
  /clean_replay_passed|completed_formal_proof|formally_checked|proven|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence|proof_success|kernel_checked/i;
const hostPathTerms = /D:\\|D:\/|\/home\/pi|\/root\//i;
const trustedRuntimeRootTerms = /\.comath[\\/]|%2ecomath/i;
const secretTerms = /COMATH_CODEX_API_KEY|OPENAI_API_KEY|Authorization:\s*Bearer|api_key|token=|plain-token|sk-/i;
const transportOverclaimTerms =
  /long-lived\s+(?:websocket|sse)|indefinite\s+sse|terminal transport recovered live|durable transport provided/i;
const unattendedOverclaimTerms =
  /production unattended executor|operator-free execution completed|unattended real-host execution completed|operator confirmation bypassed|service-owned evidence created|handoff can execute|unattended execution authorized/i;

function toolDescriptor(name) {
  const tool = createComathTools().find((descriptor) => descriptor.name === name);
  assert.ok(tool, `${name} must be registered for prepared handoff operator review checklist UX`);
  return tool;
}

function preparedInput(overrides = {}) {
  return {
    project_id: "PRJ-237",
    actor: "goal3-task237",
    pi_host_label: "pi-host-lab-01",
    session_id: "LIFE-SESSION-0237",
    action: "operator-review-checklist",
    runtime_probe_path: "service-owned-pi-lifecycle/LIFE-PI-RUNTIME-0237/real-pi-runtime-probe.json",
    runtime_probe_sha256: "a".repeat(64),
    operator_session_path: "service-owned-pi-lifecycle/LIFE-SESSION-0237/operator-session-manifest.json",
    operator_session_sha256: "b".repeat(64),
    transport_recovery_path: "service-owned-pi-lifecycle/LIFE-TRANSPORT-RECOVERY-0237/operator-transport-recovery.json",
    transport_recovery_sha256: "c".repeat(64),
    transport_lease_path: "service-owned-pi-lifecycle/LIFE-TRANSPORT-LEASE-0237/operator-transport-lease.json",
    transport_lease_sha256: "d".repeat(64),
    transport_heartbeat_path:
      "service-owned-pi-lifecycle/LIFE-TRANSPORT-HEARTBEAT-0237/operator-transport-heartbeat.json",
    transport_heartbeat_sha256: "e".repeat(64),
    guided_execution_path: "service-owned-pi-lifecycle/LIFE-GUIDED-EXEC-0237/guided-real-pi-execution.json",
    guided_execution_sha256: "f".repeat(64),
    terminal_review_path: "service-owned-pi-lifecycle/LIFE-TERMINAL-REVIEW-0237/terminal-execution-review.json",
    terminal_review_sha256: "1".repeat(64),
    transport_contract_path:
      "service-owned-pi-lifecycle/LIFE-TRANSPORT-CONTRACT-0237/operator-service-transport-contract.json",
    transport_contract_sha256: "2".repeat(64),
    automatic_orchestration_path:
      "service-owned-pi-lifecycle/LIFE-AUTOMATIC-REAL-PI-0237/automatic-real-pi-execution.json",
    automatic_orchestration_sha256: "3".repeat(64),
    transport_continuity_path:
      "service-owned-pi-lifecycle/LIFE-TRANSPORT-CONTINUITY-0237/operator-service-transport-continuity.json",
    transport_continuity_sha256: "4".repeat(64),
    operator_event_cursor: "event:237 Authorization: Bearer plain-token",
    stdout_cursor: "stdout:4096",
    stderr_cursor: "stderr:0 proof_success from D:/research/project",
    last_result_summary:
      "clean_replay_passed from /home/pi/project with sk-should-not-leak long-lived SSE and service-owned evidence created handoff can execute",
    confirmation_id: "model-supplied-confirmation-must-not-matter",
    operator_approved: true,
    handoff_can_execute: true,
    service_owned_evidence_created: true,
    unattended_execution_authorized: true,
    ...overrides
  };
}

const interactiveTool = toolDescriptor("comath.release.piCodexLifecycleInteractiveRealPi");
assert.equal(interactiveTool.mutates, false, "operator review checklist must reuse the read-only planner");
assert.equal(
  interactiveTool.input_schema.properties.action.enum.includes("operator-review-checklist"),
  true,
  "interactive planner must expose an operator-review-checklist action"
);
assert.equal(
  Object.hasOwn(interactiveTool.input_schema.properties, "confirmation_id"),
  false,
  "operator review checklist must not accept model-supplied confirmation ids"
);

const releaseCommand = runtime_registration.commands.find((command) => command.command === "/cm:release");
assert.ok(releaseCommand, "/cm:release must be advertised in Pi runtime registration");
assert.equal(releaseCommand.subcommands.includes("lifecycle-interactive-real-pi"), true);

const calls = [];
const client = {
  get: async (path) => {
    calls.push({ method: "GET", path });
    return { ok: true, path };
  },
  post: async (path, body) => {
    calls.push({ method: "POST", path, body });
    return { ok: true, path, body };
  }
};

const readyReview = await executeComathTool(
  client,
  "comath.release.piCodexLifecycleInteractiveRealPi",
  preparedInput()
);
assert.equal(calls.length, 0, "operator review checklist must not call comathd");
assert.equal(readyReview.schema_version, "comath.pi.lifecycle.interactive_real_pi_checkpoint_ux.v1");
assert.equal(readyReview.action, "operator-review-checklist");
assert.equal(readyReview.proof_authority, "none");
assert.equal(readyReview.can_promote_claim, false);
assert.equal(readyReview.can_certify_ga, false);
assert.equal(readyReview.direct_trusted_state_mutation, false);
assert.equal(readyReview.durable_transport_provided, false);
assert.equal(readyReview.long_lived_sse_provided, false);
assert.equal(readyReview.long_lived_websocket_provided, false);
assert.equal(readyReview.unattended_handoff.handoff_ready, true);
assert.equal(
  readyReview.operator_review_checklist.schema_version,
  "comath.pi.lifecycle.prepared_handoff_operator_review_checklist.v1"
);
assert.equal(readyReview.operator_review_checklist.checklist_ready, true);
assert.equal(readyReview.operator_review_checklist.review_status, "ready_for_operator_checkpoint_review");
assert.equal(readyReview.operator_review_checklist.proof_authority, "none");
assert.equal(readyReview.operator_review_checklist.can_promote_claim, false);
assert.equal(readyReview.operator_review_checklist.can_certify_ga, false);
assert.equal(readyReview.operator_review_checklist.service_owned_evidence_created, false);
assert.equal(readyReview.operator_review_checklist.handoff_can_execute, false);
assert.equal(readyReview.operator_review_checklist.auto_executes, false);
assert.equal(readyReview.operator_review_checklist.calls_comathd, false);
assert.equal(readyReview.operator_review_checklist.writes_comath_state, false);
assert.equal(readyReview.operator_review_checklist.direct_trusted_state_mutation, false);
assert.equal(readyReview.operator_review_checklist.requires_host_confirmation_for_mutation, true);
assert.equal(readyReview.operator_review_checklist.operator_review_items.length >= 8, true);
assert.equal(
  readyReview.operator_review_checklist.operator_review_items.every(
    (item) =>
      item.passed === true &&
      item.vetoes_release_if_failed === true &&
      item.proof_authority === "none" &&
      item.can_certify_ga === false
  ),
  true
);
assert.deepEqual(readyReview.operator_review_checklist.blocking_review_items, []);
assert.match(
  readyReview.operator_review_checklist.operator_next_review_command,
  /\/cm:release lifecycle-interactive-real-pi resume-plan/
);
assert.doesNotMatch(JSON.stringify(readyReview), privilegedPublicTerms);
assert.doesNotMatch(JSON.stringify(readyReview), hostPathTerms);
assert.doesNotMatch(JSON.stringify(readyReview), trustedRuntimeRootTerms);
assert.doesNotMatch(JSON.stringify(readyReview), secretTerms);
assert.doesNotMatch(JSON.stringify(readyReview), transportOverclaimTerms);
assert.doesNotMatch(JSON.stringify(readyReview), unattendedOverclaimTerms);

const missingReview = await executeComathTool(
  client,
  "comath.release.piCodexLifecycleInteractiveRealPi",
  preparedInput({ terminal_review_sha256: undefined })
);
assert.equal(calls.length, 0, "blocked operator review checklist must remain read-only");
assert.equal(missingReview.unattended_handoff.handoff_ready, false);
assert.equal(missingReview.operator_review_checklist.checklist_ready, false);
assert.equal(missingReview.operator_review_checklist.review_status, "blocked_missing_prepared_checkpoint_refs");
assert.deepEqual(missingReview.operator_review_checklist.blocking_review_items, [
  "missing_prepared_checkpoint_ref:terminal_review_sha256"
]);
assert.equal(
  missingReview.operator_review_checklist.operator_review_items.find(
    (item) => item.review_id === "prepared_checkpoint_refs_present"
  ).passed,
  false
);
assert.doesNotMatch(JSON.stringify(missingReview), privilegedPublicTerms);
assert.doesNotMatch(JSON.stringify(missingReview), hostPathTerms);
assert.doesNotMatch(JSON.stringify(missingReview), trustedRuntimeRootTerms);
assert.doesNotMatch(JSON.stringify(missingReview), secretTerms);
assert.doesNotMatch(JSON.stringify(missingReview), transportOverclaimTerms);
assert.doesNotMatch(JSON.stringify(missingReview), unattendedOverclaimTerms);

const poisonedReview = await executeComathTool(
  client,
  "comath.release.piCodexLifecycleInteractiveRealPi",
  preparedInput({
    project_id: ".comath/release/PROJECT-POISON",
    actor: "/home/pi/operator proof_success token=plain-token",
    session_id: "%2ecomath%2frelease%2fSESSION-POISON",
    runtime_probe_path: ".comath/release/pi-codex-lifecycle/LIFE-PI-RUNTIME-0237/real-pi-runtime-probe.json",
    runtime_probe_sha256: "not-a-real-hash"
  })
);
assert.equal(poisonedReview.project_id, "PROJECT");
assert.equal(poisonedReview.actor, "operator");
assert.equal(poisonedReview.session_id, "LIFECYCLE-SESSION");
assert.equal(poisonedReview.operator_review_checklist.checklist_ready, false);
assert.equal(
  poisonedReview.operator_review_checklist.blocking_review_items.includes(
    "missing_prepared_checkpoint_ref:runtime_probe_path"
  ),
  true
);
assert.equal(
  poisonedReview.operator_review_checklist.blocking_review_items.includes(
    "missing_prepared_checkpoint_ref:runtime_probe_sha256"
  ),
  true
);
assert.doesNotMatch(JSON.stringify(poisonedReview), privilegedPublicTerms);
assert.doesNotMatch(JSON.stringify(poisonedReview), hostPathTerms);
assert.doesNotMatch(JSON.stringify(poisonedReview), trustedRuntimeRootTerms);
assert.doesNotMatch(JSON.stringify(poisonedReview), secretTerms);
assert.doesNotMatch(JSON.stringify(poisonedReview), transportOverclaimTerms);
assert.doesNotMatch(JSON.stringify(poisonedReview), unattendedOverclaimTerms);

const runtimeCalls = [];
const commands = new Map();
const notifications = [];
const confirmations = [];
registerComathPiRuntime(
  {
    registerTool(tool) {
      assert.notEqual(tool.name, "missing");
    },
    registerCommand(name, options) {
      commands.set(name, options.handler);
    },
    on() {}
  },
  {
    client: {
      get: async (path) => {
        runtimeCalls.push({ method: "GET", path });
        return { ok: true, path };
      },
      post: async (path, body) => {
        runtimeCalls.push({ method: "POST", path, body });
        return { ok: true, path, body };
      }
    },
    project_root: "D:/research/project",
    actor: "goal3-task237"
  }
);

assert.equal(commands.has("cm:release"), true, "Pi runtime must expose /cm:release operator review checklist command");
const ctx = {
  ui: {
    confirm: async (title, body) => {
      confirmations.push({ title, body });
      return true;
    },
    notify: async (message, level) => {
      notifications.push({ message, level });
    }
  }
};

await commands.get("cm:release")(
  [
    "lifecycle-interactive-real-pi operator-review-checklist",
    "--project-id PRJ-237",
    "--pi-host-label pi-host-lab-01",
    "--session-id LIFE-SESSION-0237",
    "--runtime-probe-path service-owned-pi-lifecycle/LIFE-PI-RUNTIME-0237/real-pi-runtime-probe.json",
    `--runtime-probe-sha256 ${"a".repeat(64)}`,
    "--operator-session-path service-owned-pi-lifecycle/LIFE-SESSION-0237/operator-session-manifest.json",
    `--operator-session-sha256 ${"b".repeat(64)}`,
    "--transport-recovery-path service-owned-pi-lifecycle/LIFE-TRANSPORT-RECOVERY-0237/operator-transport-recovery.json",
    `--transport-recovery-sha256 ${"c".repeat(64)}`,
    "--transport-lease-path service-owned-pi-lifecycle/LIFE-TRANSPORT-LEASE-0237/operator-transport-lease.json",
    `--transport-lease-sha256 ${"d".repeat(64)}`,
    "--transport-heartbeat-path service-owned-pi-lifecycle/LIFE-TRANSPORT-HEARTBEAT-0237/operator-transport-heartbeat.json",
    `--transport-heartbeat-sha256 ${"e".repeat(64)}`,
    "--guided-execution-path service-owned-pi-lifecycle/LIFE-GUIDED-EXEC-0237/guided-real-pi-execution.json",
    `--guided-execution-sha256 ${"f".repeat(64)}`,
    "--terminal-review-path service-owned-pi-lifecycle/LIFE-TERMINAL-REVIEW-0237/terminal-execution-review.json",
    `--terminal-review-sha256 ${"1".repeat(64)}`,
    "--transport-contract-path service-owned-pi-lifecycle/LIFE-TRANSPORT-CONTRACT-0237/operator-service-transport-contract.json",
    `--transport-contract-sha256 ${"2".repeat(64)}`,
    "--automatic-orchestration-path service-owned-pi-lifecycle/LIFE-AUTOMATIC-REAL-PI-0237/automatic-real-pi-execution.json",
    `--automatic-orchestration-sha256 ${"3".repeat(64)}`,
    "--transport-continuity-path service-owned-pi-lifecycle/LIFE-TRANSPORT-CONTINUITY-0237/operator-service-transport-continuity.json",
    `--transport-continuity-sha256 ${"4".repeat(64)}`,
    "--last-result-summary 'proof_success at D:/research/project with token=plain-token long-lived SSE service-owned evidence created'"
  ].join(" "),
  ctx
);

assert.equal(runtimeCalls.length, 0, "runtime operator review checklist command must remain read-only");
assert.equal(confirmations.length, 0, "read-only operator review checklist must not ask for mutation confirmation");
assert.equal(notifications.length, 1, "operator review checklist command must notify the Pi host with sanitized output");
assert.doesNotMatch(notifications[0].message, privilegedPublicTerms);
assert.doesNotMatch(notifications[0].message, hostPathTerms);
assert.doesNotMatch(notifications[0].message, trustedRuntimeRootTerms);
assert.doesNotMatch(notifications[0].message, secretTerms);
assert.doesNotMatch(notifications[0].message, transportOverclaimTerms);
assert.doesNotMatch(notifications[0].message, unattendedOverclaimTerms);
const notified = JSON.parse(notifications[0].message);
assert.equal(notified.action, "operator-review-checklist");
assert.equal(notified.operator_review_checklist.checklist_ready, true);
assert.equal(notified.operator_review_checklist.service_owned_evidence_created, false);
assert.equal(notified.operator_review_checklist.handoff_can_execute, false);

console.log("Goal 3 Task237 prepared handoff operator review checklist tests passed.");
