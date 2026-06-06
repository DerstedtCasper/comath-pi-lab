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
  assert.ok(tool, `${name} must be registered for prepared unattended real-Pi handoff UX`);
  return tool;
}

const interactiveTool = toolDescriptor("comath.release.piCodexLifecycleInteractiveRealPi");
assert.equal(interactiveTool.mutates, false, "prepared unattended handoff must reuse the read-only planner");
assert.deepEqual(interactiveTool.input_schema.required, ["project_id", "actor", "pi_host_label", "session_id", "action"]);
assert.equal(
  interactiveTool.input_schema.properties.action.enum.includes("unattended-handoff"),
  true,
  "interactive planner must expose an unattended-handoff action"
);
assert.equal(
  Object.hasOwn(interactiveTool.input_schema.properties, "confirmation_id"),
  false,
  "prepared unattended handoff planner must not accept model-supplied confirmation ids"
);
assert.equal(interactiveTool.input_schema.properties.runtime_probe_sha256.type, "string");
assert.equal(interactiveTool.input_schema.properties.transport_continuity_sha256.type, "string");

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

const readyInput = {
  project_id: "PRJ-231",
  actor: "goal3-task231",
  pi_host_label: "pi-host-lab-01",
  session_id: "LIFE-SESSION-0231",
  action: "unattended-handoff",
  runtime_probe_path: "service-owned-pi-lifecycle/LIFE-PI-RUNTIME-0231/real-pi-runtime-probe.json",
  runtime_probe_sha256: "a".repeat(64),
  operator_session_path: "service-owned-pi-lifecycle/LIFE-SESSION-0231/operator-session-manifest.json",
  operator_session_sha256: "b".repeat(64),
  transport_recovery_path: "service-owned-pi-lifecycle/LIFE-TRANSPORT-RECOVERY-0231/operator-transport-recovery.json",
  transport_recovery_sha256: "c".repeat(64),
  transport_lease_path: "service-owned-pi-lifecycle/LIFE-TRANSPORT-LEASE-0231/operator-transport-lease.json",
  transport_lease_sha256: "d".repeat(64),
  transport_heartbeat_path:
    "service-owned-pi-lifecycle/LIFE-TRANSPORT-HEARTBEAT-0231/operator-transport-heartbeat.json",
  transport_heartbeat_sha256: "e".repeat(64),
  guided_execution_path: "service-owned-pi-lifecycle/LIFE-GUIDED-EXEC-0231/guided-real-pi-execution.json",
  guided_execution_sha256: "f".repeat(64),
  terminal_review_path: "service-owned-pi-lifecycle/LIFE-TERMINAL-REVIEW-0231/terminal-execution-review.json",
  terminal_review_sha256: "1".repeat(64),
  transport_contract_path:
    "service-owned-pi-lifecycle/LIFE-TRANSPORT-CONTRACT-0231/operator-service-transport-contract.json",
  transport_contract_sha256: "2".repeat(64),
  automatic_orchestration_path:
    "service-owned-pi-lifecycle/LIFE-AUTOMATIC-REAL-PI-0231/automatic-real-pi-execution.json",
  automatic_orchestration_sha256: "3".repeat(64),
  transport_continuity_path:
    "service-owned-pi-lifecycle/LIFE-TRANSPORT-CONTINUITY-0231/operator-service-transport-continuity.json",
  transport_continuity_sha256: "4".repeat(64),
  operator_event_cursor: "event:99 Authorization: Bearer plain-token",
  stdout_cursor: "stdout:2048",
  stderr_cursor: "stderr:0 proof_success from D:/research/project",
  last_result_summary:
    "clean_replay_passed from /home/pi/project with sk-should-not-leak long-lived SSE and production unattended executor operator-free execution completed"
};

const readyPlan = await executeComathTool(client, "comath.release.piCodexLifecycleInteractiveRealPi", readyInput);
assert.equal(calls.length, 0, "prepared unattended handoff UX must not call comathd");
assert.equal(readyPlan.schema_version, "comath.pi.lifecycle.interactive_real_pi_checkpoint_ux.v1");
assert.equal(readyPlan.action, "unattended-handoff");
assert.equal(readyPlan.proof_authority, "none");
assert.equal(readyPlan.can_promote_claim, false);
assert.equal(readyPlan.can_certify_ga, false);
assert.equal(readyPlan.direct_trusted_state_mutation, false);
assert.equal(readyPlan.durable_transport_provided, false);
assert.equal(readyPlan.long_lived_sse_provided, false);
assert.equal(readyPlan.long_lived_websocket_provided, false);
assert.equal(readyPlan.unattended_handoff.handoff_ready, true, "all prepared checkpoint path/hash pairs should make handoff ready");
assert.equal(readyPlan.unattended_handoff.handoff_status, "prepared_checkpoint_handoff_ready");
assert.equal(readyPlan.unattended_handoff.unattended_policy.pi_tool_readonly, true);
assert.equal(readyPlan.unattended_handoff.unattended_policy.calls_comathd, false);
assert.equal(readyPlan.unattended_handoff.unattended_policy.executes_lifecycle_actions, false);
assert.equal(readyPlan.unattended_handoff.unattended_policy.auto_executes, false);
assert.equal(readyPlan.unattended_handoff.unattended_policy.service_owned_checkpoint_hashes_required, true);
assert.equal(readyPlan.unattended_handoff.unattended_policy.host_confirmation_required_for_any_mutation, true);
assert.equal(readyPlan.unattended_handoff.unattended_policy.unattended_execution_authorized, false);
assert.equal(readyPlan.unattended_handoff.unattended_policy.unattended_real_host_execution_completed, false);
assert.equal(readyPlan.unattended_handoff.unattended_policy.operator_confirmation_bypassed, false);
assert.equal(readyPlan.unattended_handoff.unattended_policy.service_owned_evidence_created, false);
assert.equal(readyPlan.unattended_handoff.unattended_policy.handoff_can_execute, false);
assert.equal(readyPlan.unattended_handoff.prepared_checkpoints.length, 10);
assert.equal(
  readyPlan.unattended_handoff.prepared_checkpoints.every(
    (checkpoint) => checkpoint.prepared === true && /^[a-f0-9]{64}$/.test(checkpoint.sha256)
  ),
  true
);
assert.deepEqual(readyPlan.unattended_handoff.missing_prepared_checkpoint_refs, []);
assert.match(readyPlan.unattended_handoff.operator_handoff.review_command, /\/cm:release lifecycle-interactive-real-pi/);
assert.match(
  readyPlan.unattended_handoff.operator_handoff.review_command,
  /--completed-step lifecycle-operator-service-transport-continuity/
);
assert.equal(readyPlan.unattended_handoff.operator_handoff.auto_executes, false);
assert.doesNotMatch(JSON.stringify(readyPlan), privilegedPublicTerms);
assert.doesNotMatch(JSON.stringify(readyPlan), hostPathTerms);
assert.doesNotMatch(JSON.stringify(readyPlan), trustedRuntimeRootTerms);
assert.doesNotMatch(JSON.stringify(readyPlan), secretTerms);
assert.doesNotMatch(JSON.stringify(readyPlan), transportOverclaimTerms);
assert.doesNotMatch(JSON.stringify(readyPlan), unattendedOverclaimTerms);

const missingHashPlan = await executeComathTool(client, "comath.release.piCodexLifecycleInteractiveRealPi", {
  ...readyInput,
  transport_continuity_sha256: undefined
});
assert.equal(calls.length, 0, "missing prepared refs must still remain read-only and must not call comathd");
assert.equal(missingHashPlan.unattended_handoff.handoff_ready, false);
assert.equal(missingHashPlan.unattended_handoff.handoff_status, "prepared_checkpoint_refs_missing");
assert.deepEqual(missingHashPlan.unattended_handoff.missing_prepared_checkpoint_refs, ["transport_continuity_sha256"]);
assert.equal(
  missingHashPlan.unattended_handoff.prepared_checkpoints.find(
    (checkpoint) => checkpoint.checkpoint_id === "transport_continuity"
  ).prepared,
  false
);
assert.doesNotMatch(JSON.stringify(missingHashPlan), privilegedPublicTerms);
assert.doesNotMatch(JSON.stringify(missingHashPlan), hostPathTerms);
assert.doesNotMatch(JSON.stringify(missingHashPlan), trustedRuntimeRootTerms);
assert.doesNotMatch(JSON.stringify(missingHashPlan), secretTerms);
assert.doesNotMatch(JSON.stringify(missingHashPlan), transportOverclaimTerms);
assert.doesNotMatch(JSON.stringify(missingHashPlan), unattendedOverclaimTerms);

const poisonedPlan = await executeComathTool(client, "comath.release.piCodexLifecycleInteractiveRealPi", {
  ...readyInput,
  project_id: ".comath/release/PROJECT-POISON",
  actor: "/home/pi/operator proof_success token=plain-token",
  session_id: "%2ecomath%2frelease%2fSESSION-POISON",
  runtime_probe_path: ".comath/release/pi-codex-lifecycle/LIFE-PI-RUNTIME-0231/real-pi-runtime-probe.json",
  runtime_probe_sha256: "not-a-real-hash",
  transport_continuity_path:
    "D:/research/project/.comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-CONTINUITY-0231/operator-service-transport-continuity.json"
});
assert.equal(poisonedPlan.project_id, "PROJECT");
assert.equal(poisonedPlan.actor, "operator");
assert.equal(poisonedPlan.session_id, "LIFECYCLE-SESSION");
assert.equal(poisonedPlan.unattended_handoff.handoff_ready, false);
assert.equal(poisonedPlan.unattended_handoff.handoff_status, "prepared_checkpoint_refs_missing");
assert.equal(poisonedPlan.unattended_handoff.missing_prepared_checkpoint_refs.includes("runtime_probe_path"), true);
assert.equal(poisonedPlan.unattended_handoff.missing_prepared_checkpoint_refs.includes("runtime_probe_sha256"), true);
assert.equal(
  poisonedPlan.unattended_handoff.missing_prepared_checkpoint_refs.includes("transport_continuity_path"),
  true
);
assert.doesNotMatch(JSON.stringify(poisonedPlan), privilegedPublicTerms);
assert.doesNotMatch(JSON.stringify(poisonedPlan), hostPathTerms);
assert.doesNotMatch(JSON.stringify(poisonedPlan), trustedRuntimeRootTerms);
assert.doesNotMatch(JSON.stringify(poisonedPlan), secretTerms);
assert.doesNotMatch(JSON.stringify(poisonedPlan), transportOverclaimTerms);
assert.doesNotMatch(JSON.stringify(poisonedPlan), unattendedOverclaimTerms);

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
    actor: "goal3-task231"
  }
);

assert.equal(commands.has("cm:release"), true, "Pi runtime must expose /cm:release prepared unattended handoff command");
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
    "lifecycle-interactive-real-pi unattended-handoff",
    "--project-id PRJ-231",
    "--pi-host-label pi-host-lab-01",
    "--session-id LIFE-SESSION-0231",
    "--runtime-probe-path service-owned-pi-lifecycle/LIFE-PI-RUNTIME-0231/real-pi-runtime-probe.json",
    `--runtime-probe-sha256 ${"a".repeat(64)}`,
    "--operator-session-path service-owned-pi-lifecycle/LIFE-SESSION-0231/operator-session-manifest.json",
    `--operator-session-sha256 ${"b".repeat(64)}`,
    "--transport-recovery-path service-owned-pi-lifecycle/LIFE-TRANSPORT-RECOVERY-0231/operator-transport-recovery.json",
    `--transport-recovery-sha256 ${"c".repeat(64)}`,
    "--transport-lease-path service-owned-pi-lifecycle/LIFE-TRANSPORT-LEASE-0231/operator-transport-lease.json",
    `--transport-lease-sha256 ${"d".repeat(64)}`,
    "--transport-heartbeat-path service-owned-pi-lifecycle/LIFE-TRANSPORT-HEARTBEAT-0231/operator-transport-heartbeat.json",
    `--transport-heartbeat-sha256 ${"e".repeat(64)}`,
    "--guided-execution-path service-owned-pi-lifecycle/LIFE-GUIDED-EXEC-0231/guided-real-pi-execution.json",
    `--guided-execution-sha256 ${"f".repeat(64)}`,
    "--terminal-review-path service-owned-pi-lifecycle/LIFE-TERMINAL-REVIEW-0231/terminal-execution-review.json",
    `--terminal-review-sha256 ${"1".repeat(64)}`,
    "--transport-contract-path service-owned-pi-lifecycle/LIFE-TRANSPORT-CONTRACT-0231/operator-service-transport-contract.json",
    `--transport-contract-sha256 ${"2".repeat(64)}`,
    "--automatic-orchestration-path service-owned-pi-lifecycle/LIFE-AUTOMATIC-REAL-PI-0231/automatic-real-pi-execution.json",
    `--automatic-orchestration-sha256 ${"3".repeat(64)}`,
    "--transport-continuity-path service-owned-pi-lifecycle/LIFE-TRANSPORT-CONTINUITY-0231/operator-service-transport-continuity.json",
    `--transport-continuity-sha256 ${"4".repeat(64)}`,
    "--last-result-summary 'proof_success at D:/research/project with token=plain-token long-lived SSE'"
  ].join(" "),
  ctx
);

assert.equal(runtimeCalls.length, 0, "runtime prepared unattended command must remain read-only");
assert.equal(confirmations.length, 0, "read-only prepared unattended handoff must not ask for mutation confirmation");
assert.equal(notifications.length, 1, "prepared unattended command must notify the Pi host with the sanitized handoff");
assert.doesNotMatch(notifications[0].message, privilegedPublicTerms);
assert.doesNotMatch(notifications[0].message, hostPathTerms);
assert.doesNotMatch(notifications[0].message, trustedRuntimeRootTerms);
assert.doesNotMatch(notifications[0].message, secretTerms);
assert.doesNotMatch(notifications[0].message, transportOverclaimTerms);
assert.doesNotMatch(notifications[0].message, unattendedOverclaimTerms);
const notified = JSON.parse(notifications[0].message);
assert.equal(notified.action, "unattended-handoff");
assert.equal(notified.unattended_handoff.handoff_ready, true);
assert.equal(notified.unattended_handoff.operator_handoff.auto_executes, false);

console.log("Goal 3 Task231 prepared unattended real-Pi handoff UX tests passed.");
