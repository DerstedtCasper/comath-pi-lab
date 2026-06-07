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
  /production unattended executor|operator-free execution completed|unattended real-host execution completed|operator confirmation bypassed|service-owned evidence created|handoff can execute|unattended execution authorized|operator approval recorded|operator approved|executor invoked|executor_invoked\s*=\s*true|executorInvoked\s*=\s*true|GA certified/i;

function toolDescriptor(name) {
  const tool = createComathTools().find((descriptor) => descriptor.name === name);
  assert.ok(tool, `${name} must be registered for Pi unattended real-host executor contract`);
  return tool;
}

const executorTool = toolDescriptor("comath.release.piCodexLifecycleUnattendedRealHostExecutorContract");
assert.equal(executorTool.mutates, true, "executor contract writes a service-owned checkpoint through comathd");
assert.deepEqual(executorTool.input_schema.required, [
  "project_root",
  "project_id",
  "actor",
  "handoff_review_id",
  "handoff_review_path",
  "handoff_review_sha256",
  "confirmation_id"
]);

const readinessTool = toolDescriptor("comath.release.piCodexLifecycleUnattendedRealHostExecutionReadiness");
assert.equal(
  Object.hasOwn(readinessTool.input_schema.properties, "unattended_executor_contract_id"),
  true,
  "readiness Pi consumer must accept optional executor contract id"
);
assert.equal(
  Object.hasOwn(readinessTool.input_schema.properties, "unattended_executor_contract_path"),
  true,
  "readiness Pi consumer must accept optional executor contract path"
);
assert.equal(
  Object.hasOwn(readinessTool.input_schema.properties, "unattended_executor_contract_sha256"),
  true,
  "readiness Pi consumer must accept optional executor contract hash"
);

const releaseCommand = runtime_registration.commands.find((command) => command.command === "/cm:release");
assert.ok(releaseCommand, "/cm:release must be advertised in Pi runtime registration");
assert.equal(releaseCommand.subcommands.includes("lifecycle-unattended-real-host-executor-contract"), true);

const calls = [];
const client = {
  get: async (path) => {
    calls.push({ method: "GET", path });
    return { ok: true, path };
  },
  post: async (path, body) => {
    calls.push({ method: "POST", path, body });
    if (path.endsWith("/unattended-real-host-execution-readiness")) {
      return {
        ok: true,
        path,
        body,
        readiness: {
          schema_version: "comath.pi_codex_unattended_real_host_execution_readiness.v1",
          readiness_id: body.readiness_id,
          project_id: body.project_id,
          actor: body.actor,
          readiness_status: "blocked_unattended_real_host_execution_not_authorized",
          readiness_path:
            "D:/research/project/.comath/release/pi-codex-lifecycle/LIFE-EXEC-READINESS-0246/unattended-real-host-execution-readiness.json",
          requested_execution_mode: "production_unattended_real_host",
          blocker_reasons: ["durable_transport_not_provided"],
          handoff_review_id: body.handoff_review_id,
          handoff_review_path: body.handoff_review_path,
          unattended_executor_contract_id: body.unattended_executor_contract_id,
          unattended_executor_contract_path: body.unattended_executor_contract_path,
          unattended_executor_contract_artifact: {
            kind: "unattended_real_host_executor_contract",
            path: `${body.unattended_executor_contract_path} proof_success token=plain-token`,
            sha256: body.unattended_executor_contract_sha256,
            size_bytes: 4321
          },
          unattended_executor_contract_current: true,
          service_owned_unattended_executor_configured: true,
          executor_invoked: true,
          executorInvoked: true,
          operator_approved: true,
          operatorApproval: true,
          handoff_can_execute: true,
          handoffCanExecute: true,
          unattended_execution_authorized: true,
          unattendedExecutionAuthorized: true,
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
          summary:
            "formal_replay_passed from D:/research/project with Authorization: Bearer plain-token and durable transport provided; executor invoked; unattended execution authorized; GA certified"
        }
      };
    }
    return {
      ok: true,
      path,
      body,
      executor_contract: {
        schema_version: "comath.pi_codex_unattended_real_host_executor_contract.v1",
        executor_contract_id: body.executor_contract_id,
        project_id: body.project_id,
        actor: body.actor,
        executor_contract_status: "executor_contract_recorded",
        executor_contract_path:
          "D:/research/project/.comath/release/pi-codex-lifecycle/LIFE-UNATTENDED-EXECUTOR-CONTRACT-0246/unattended-real-host-executor-contract.json",
        executor_contract_artifact: {
          kind: "unattended_real_host_executor_contract",
          path:
            "D:/research/project/.comath/release/pi-codex-lifecycle/LIFE-UNATTENDED-EXECUTOR-CONTRACT-0246/unattended-real-host-executor-contract.json",
          sha256: "d".repeat(64),
          size_bytes: 1234
        },
        requested_execution_mode: body.requested_execution_mode,
        executor_contract_kind: body.executor_contract_kind,
        executor_configuration_state: body.executor_configuration_state,
        executor_contract_note:
          "production unattended executor ready from D:/research/project with proof_success Authorization: Bearer plain-token",
        handoff_review_id: body.handoff_review_id,
        handoff_review_path: `${body.handoff_review_path} token=plain-token`,
        handoff_review_artifact: {
          kind: "unattended_real_host_handoff_review",
          path: `${body.handoff_review_path} proof_success`,
          sha256: body.handoff_review_sha256,
          size_bytes: 5678
        },
        handoff_review_current: true,
        executor_contract_manifest_persisted: true,
        unattended_executor_contract_current: true,
        executor_invoked: true,
        executorInvoked: true,
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
        proof_authority: "lean_kernel_clean_replay",
        proofAuthority: "lean_kernel_clean_replay",
        can_promote_claim: true,
        canPromoteClaim: true,
        can_certify_ga: true,
        canCertifyGa: true,
        request_echo: {
          executor_contract_note: body.executor_contract_note,
          proof_authority: "lean_kernel_clean_replay",
          proofAuthority: "lean_kernel_clean_replay",
          executor_invoked: true,
          executorInvoked: true,
          unattended_execution_authorized: true,
          unattendedExecutionAuthorized: true,
          durable_transport_provided: true,
          durableTransportProvided: true
        },
        summary:
          "executor invoked executor_invoked=true executorInvoked=true after formal_replay_passed from D:/research/project with Authorization: Bearer plain-token and durable transport provided; unattended execution authorized; GA certified; live transport open"
      }
    };
  }
};

const directExecutor = await executeComathTool(
  client,
  "comath.release.piCodexLifecycleUnattendedRealHostExecutorContract",
  {
    project_root: projectRoot,
    project_id: "PRJ-2460",
    actor: "goal3-task246 OPENAI_API_KEY=plain-token durable transport provided",
    executor_contract_id: "LIFE-UNATTENDED-EXECUTOR-CONTRACT-0246",
    handoff_review_id: "LIFE-HANDOFF-REVIEW-0246",
    handoff_review_path:
      "service-owned-pi-lifecycle/LIFE-HANDOFF-REVIEW-0246/unattended-real-host-handoff-review.json",
    handoff_review_sha256: "a".repeat(64),
    requested_execution_mode: "production_unattended_real_host",
    executor_contract_kind: "service_owned_unattended_real_host_executor_contract",
    executor_configuration_state: "contract_recorded_executor_not_invoked",
    executor_contract_note: "executor configured at D:/research/project sk-should-not-leak proof_success",
    confirmation_id: "CONF-TASK246-MUST-NOT-FORWARD"
  }
);

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/release/pi-codex-lifecycle/unattended-real-host-executor-contract");
assert.equal(calls.at(-1).body.confirmation_id, undefined, "Pi must not forward model-supplied confirmation ids");
assert.deepEqual(calls.at(-1).body, {
  project_root: projectRoot,
  project_id: "PRJ-2460",
  actor: "goal3-task246 [redacted_secret] bounded_transport_checkpoint_only",
  executor_contract_id: "LIFE-UNATTENDED-EXECUTOR-CONTRACT-0246",
  handoff_review_id: "LIFE-HANDOFF-REVIEW-0246",
  handoff_review_path:
    ".comath/release/pi-codex-lifecycle/LIFE-HANDOFF-REVIEW-0246/unattended-real-host-handoff-review.json",
  handoff_review_sha256: "a".repeat(64),
  requested_execution_mode: "production_unattended_real_host",
  executor_contract_kind: "service_owned_unattended_real_host_executor_contract",
  executor_configuration_state: "contract_recorded_executor_not_invoked",
  executor_contract_note: "executor configured at [redacted_host_path]"
});
assert.doesNotMatch(JSON.stringify(calls.at(-1).body), secretTerms, "Pi request body must not forward secrets");
assert.doesNotMatch(JSON.stringify(calls.at(-1).body), transportOverclaimTerms, "Pi request body must not forward transport claims");
assert.doesNotMatch(JSON.stringify(calls.at(-1).body), unattendedOverclaimTerms, "Pi request body must not forward execution claims");
assert.doesNotMatch(JSON.stringify(directExecutor), privilegedPublicTerms, "direct result must sanitize proof wording");
assert.doesNotMatch(JSON.stringify(directExecutor), hostPathTerms, "direct result must sanitize host paths");
assert.doesNotMatch(JSON.stringify(directExecutor), trustedRuntimeRootTerms, "direct result must sanitize trusted roots");
assert.doesNotMatch(JSON.stringify(directExecutor), secretTerms, "direct result must sanitize secrets");
assert.doesNotMatch(JSON.stringify(directExecutor), transportOverclaimTerms, "direct result must sanitize transport claims");
assert.doesNotMatch(JSON.stringify(directExecutor), unattendedOverclaimTerms, "direct result must sanitize execution claims");
assert.equal(directExecutor.executor_contract.proof_authority, "none");
assert.equal(directExecutor.executor_contract.proofAuthority, "none");
assert.equal(directExecutor.executor_contract.can_promote_claim, false);
assert.equal(directExecutor.executor_contract.canPromoteClaim, false);
assert.equal(directExecutor.executor_contract.can_certify_ga, false);
assert.equal(directExecutor.executor_contract.canCertifyGa, false);
assert.equal(directExecutor.executor_contract.executor_invoked, false);
assert.equal(directExecutor.executor_contract.executorInvoked, false);
assert.equal(directExecutor.executor_contract.unattended_execution_authorized, false);
assert.equal(directExecutor.executor_contract.unattendedExecutionAuthorized, false);
assert.equal(directExecutor.executor_contract.durable_transport_provided, false);
assert.equal(directExecutor.executor_contract.durableTransportProvided, false);
assert.equal(directExecutor.executor_contract.live_transport_open, false);
assert.equal(directExecutor.executor_contract.liveTransportOpen, false);
assert.equal(directExecutor.executor_contract.request_echo.proof_authority, "none");
assert.equal(directExecutor.executor_contract.request_echo.proofAuthority, "none");
assert.equal(directExecutor.executor_contract.request_echo.executor_invoked, false);
assert.equal(directExecutor.executor_contract.request_echo.executorInvoked, false);
assert.equal(directExecutor.executor_contract.request_echo.unattended_execution_authorized, false);
assert.equal(directExecutor.executor_contract.request_echo.unattendedExecutionAuthorized, false);

const readinessWithExecutor = await executeComathTool(
  client,
  "comath.release.piCodexLifecycleUnattendedRealHostExecutionReadiness",
  {
    project_root: projectRoot,
    project_id: "PRJ-2460",
    actor: "goal3-task246 readiness",
    readiness_id: "LIFE-EXEC-READINESS-0246",
    handoff_review_id: "LIFE-HANDOFF-REVIEW-0246",
    handoff_review_path:
      "service-owned-pi-lifecycle/LIFE-HANDOFF-REVIEW-0246/unattended-real-host-handoff-review.json",
    handoff_review_sha256: "a".repeat(64),
    unattended_executor_contract_id: "LIFE-UNATTENDED-EXECUTOR-CONTRACT-0246",
    unattended_executor_contract_path:
      "service-owned-pi-lifecycle/LIFE-UNATTENDED-EXECUTOR-CONTRACT-0246/unattended-real-host-executor-contract.json",
    unattended_executor_contract_sha256: "d".repeat(64),
    confirmation_id: "CONF-TASK246-READINESS-MUST-NOT-FORWARD"
  }
);

assert.equal(calls.at(-1).path, "/release/pi-codex-lifecycle/unattended-real-host-execution-readiness");
assert.equal(calls.at(-1).body.confirmation_id, undefined, "readiness binding must not forward confirmation ids");
assert.equal(
  calls.at(-1).body.unattended_executor_contract_path,
  ".comath/release/pi-codex-lifecycle/LIFE-UNATTENDED-EXECUTOR-CONTRACT-0246/unattended-real-host-executor-contract.json"
);
assert.equal(readinessWithExecutor.readiness.unattended_executor_contract_current, true);
assert.deepEqual(readinessWithExecutor.readiness.blocker_reasons, ["durable_transport_not_provided"]);
assert.equal(readinessWithExecutor.readiness.executor_invoked, false);
assert.equal(readinessWithExecutor.readiness.executorInvoked, false);
assert.equal(readinessWithExecutor.readiness.unattended_execution_authorized, false);
assert.equal(readinessWithExecutor.readiness.unattendedExecutionAuthorized, false);
assert.equal(readinessWithExecutor.readiness.proof_authority, "none");
assert.equal(readinessWithExecutor.readiness.can_certify_ga, false);
assert.doesNotMatch(JSON.stringify(readinessWithExecutor), privilegedPublicTerms);
assert.doesNotMatch(JSON.stringify(readinessWithExecutor), hostPathTerms);
assert.doesNotMatch(JSON.stringify(readinessWithExecutor), trustedRuntimeRootTerms);
assert.doesNotMatch(JSON.stringify(readinessWithExecutor), secretTerms);
assert.doesNotMatch(JSON.stringify(readinessWithExecutor), transportOverclaimTerms);
assert.doesNotMatch(JSON.stringify(readinessWithExecutor), unattendedOverclaimTerms);

const callsBeforeIncompleteExecutorBinding = calls.length;
await assert.rejects(
  () =>
    executeComathTool(client, "comath.release.piCodexLifecycleUnattendedRealHostExecutionReadiness", {
      project_root: projectRoot,
      project_id: "PRJ-2460",
      actor: "goal3-task246 readiness",
      readiness_id: "LIFE-EXEC-READINESS-0246-INCOMPLETE",
      handoff_review_id: "LIFE-HANDOFF-REVIEW-0246",
      handoff_review_path:
        "service-owned-pi-lifecycle/LIFE-HANDOFF-REVIEW-0246/unattended-real-host-handoff-review.json",
      handoff_review_sha256: "a".repeat(64),
      unattended_executor_contract_id: "LIFE-UNATTENDED-EXECUTOR-CONTRACT-0246",
      unattended_executor_contract_path:
        "service-owned-pi-lifecycle/LIFE-UNATTENDED-EXECUTOR-CONTRACT-0246/unattended-real-host-executor-contract.json",
      confirmation_id: "CONF-TASK246-INCOMPLETE"
    }),
  /unattended_executor_contract_sha256 is required/
);
assert.equal(calls.length, callsBeforeIncompleteExecutorBinding, "incomplete executor binding must not POST readiness");

const interactiveTool = toolDescriptor("comath.release.piCodexLifecycleInteractiveRealPi");
assert.equal(
  interactiveTool.input_schema.properties.completed_steps.items.enum.includes(
    "lifecycle-unattended-real-host-executor-contract"
  ),
  true,
  "interactive real-Pi planner must advertise executor contract before readiness"
);
const interactivePlan = await executeComathTool(client, "comath.release.piCodexLifecycleInteractiveRealPi", {
  project_id: "PRJ-2460",
  actor: "goal3-task246",
  pi_host_label: "pi-host-lab-01",
  session_id: "LIFE-OP-SESSION-0246",
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
    "lifecycle-unattended-real-host-operator-approval"
  ],
  executor_contract_id: "LIFE-UNATTENDED-EXECUTOR-CONTRACT-0246",
  handoff_review_id: "LIFE-HANDOFF-REVIEW-0246",
  handoff_review_path:
    "service-owned-pi-lifecycle/LIFE-HANDOFF-REVIEW-0246/unattended-real-host-handoff-review.json",
  handoff_review_sha256: "a".repeat(64),
  executor_contract_note: "executor note proof_success from /home/pi/private token=plain-token",
  last_result_summary: "proof_success from D:/research/project with sk-should-not-leak long-lived SSE"
});
assert.equal(calls.length, 2, "interactive planner must remain read-only and must not call comathd");
assert.equal(interactivePlan.next_action.action_id, "lifecycle-unattended-real-host-executor-contract");
assert.match(interactivePlan.next_action.command, /\/cm:release lifecycle-unattended-real-host-executor-contract/);
assert.match(interactivePlan.next_action.command, /--handoff-review-sha256 a{64}/);
assert.equal(interactivePlan.next_action.requires_host_confirmation, true);
assert.equal(interactivePlan.next_action.auto_executes, false);
assert.equal(interactivePlan.interactive_policy.pi_tool_readonly, true);
assert.equal(interactivePlan.interactive_policy.writes_comath_state, false);
assert.equal(interactivePlan.interactive_policy.calls_comathd, false);
assert.equal(interactivePlan.interactive_policy.executes_lifecycle_actions, false);
assert.doesNotMatch(JSON.stringify(interactivePlan), privilegedPublicTerms);
assert.doesNotMatch(JSON.stringify(interactivePlan), hostPathTerms);
assert.doesNotMatch(JSON.stringify(interactivePlan), trustedRuntimeRootTerms);
assert.doesNotMatch(JSON.stringify(interactivePlan), secretTerms);
assert.doesNotMatch(JSON.stringify(interactivePlan), transportOverclaimTerms);
assert.doesNotMatch(JSON.stringify(interactivePlan), unattendedOverclaimTerms);

const readinessPlan = await executeComathTool(client, "comath.release.piCodexLifecycleInteractiveRealPi", {
  project_id: "PRJ-2460",
  actor: "goal3-task246",
  pi_host_label: "pi-host-lab-01",
  session_id: "LIFE-OP-SESSION-0246",
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
    "lifecycle-unattended-real-host-executor-contract"
  ],
  readiness_id: "LIFE-EXEC-READINESS-0246",
  handoff_review_id: "LIFE-HANDOFF-REVIEW-0246",
  handoff_review_path:
    "service-owned-pi-lifecycle/LIFE-HANDOFF-REVIEW-0246/unattended-real-host-handoff-review.json",
  handoff_review_sha256: "a".repeat(64),
  approval_id: "LIFE-OPERATOR-APPROVAL-0246",
  approval_path:
    "service-owned-pi-lifecycle/LIFE-OPERATOR-APPROVAL-0246/unattended-real-host-operator-approval.json",
  approval_sha256: "c".repeat(64),
  executor_contract_id: "LIFE-UNATTENDED-EXECUTOR-CONTRACT-0246",
  executor_contract_path:
    "service-owned-pi-lifecycle/LIFE-UNATTENDED-EXECUTOR-CONTRACT-0246/unattended-real-host-executor-contract.json",
  executor_contract_sha256: "d".repeat(64)
});
assert.equal(readinessPlan.next_action.action_id, "lifecycle-unattended-real-host-execution-readiness");
assert.match(readinessPlan.next_action.command, /--unattended-executor-contract-id LIFE-UNATTENDED-EXECUTOR-CONTRACT-0246/);
assert.match(readinessPlan.next_action.command, /--unattended-executor-contract-sha256 d{64}/);

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
  { client, project_root: projectRoot, actor: "goal3-task246" }
);

assert.equal(
  registeredTools.has("comath.release.piCodexLifecycleUnattendedRealHostExecutorContract"),
  true,
  "Pi runtime must expose unattended executor contract as an executable tool"
);
assert.equal(commands.has("cm:release"), true, "Pi runtime must expose /cm:release for unattended executor contract");

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
    "lifecycle-unattended-real-host-executor-contract",
    "--project-id PRJ-2460",
    "--executor-contract-id LIFE-UNATTENDED-EXECUTOR-CONTRACT-0246-CMD",
    "--handoff-review-id LIFE-HANDOFF-REVIEW-0246",
    "--handoff-review-path service-owned-pi-lifecycle/LIFE-HANDOFF-REVIEW-0246/unattended-real-host-handoff-review.json",
    `--handoff-review-sha256 ${"b".repeat(64)}`,
    "--executor-contract-note 'executor configured D:/research/project proof_success durable transport provided'"
  ].join(" "),
  ctx
);

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/release/pi-codex-lifecycle/unattended-real-host-executor-contract");
assert.equal(calls.at(-1).body.confirmation_id, undefined, "runtime command must not forward confirmation ids");
assert.equal(calls.at(-1).body.project_root, projectRoot);
assert.equal(calls.at(-1).body.project_id, "PRJ-2460");
assert.equal(calls.at(-1).body.actor, "goal3-task246");
assert.equal(calls.at(-1).body.executor_contract_id, "LIFE-UNATTENDED-EXECUTOR-CONTRACT-0246-CMD");
assert.equal(calls.at(-1).body.handoff_review_id, "LIFE-HANDOFF-REVIEW-0246");
assert.equal(
  calls.at(-1).body.handoff_review_path,
  ".comath/release/pi-codex-lifecycle/LIFE-HANDOFF-REVIEW-0246/unattended-real-host-handoff-review.json"
);
assert.equal(calls.at(-1).body.handoff_review_sha256, "b".repeat(64));
assert.equal(calls.at(-1).body.requested_execution_mode, "production_unattended_real_host");
assert.equal(
  calls.at(-1).body.executor_contract_kind,
  "service_owned_unattended_real_host_executor_contract"
);
assert.equal(calls.at(-1).body.executor_configuration_state, "contract_recorded_executor_not_invoked");
assert.equal(calls.at(-1).body.executor_contract_note, "executor configured [redacted_host_path]");
assert.equal(confirmationPrompts.length, 1, "executor contract command must require Pi host confirmation");
assert.doesNotMatch(confirmationPrompts[0].body, privilegedPublicTerms);
assert.doesNotMatch(confirmationPrompts[0].body, hostPathTerms);
assert.doesNotMatch(confirmationPrompts[0].body, trustedRuntimeRootTerms);
assert.doesNotMatch(confirmationPrompts[0].body, secretTerms);
assert.doesNotMatch(confirmationPrompts[0].body, transportOverclaimTerms);
assert.doesNotMatch(confirmationPrompts[0].body, unattendedOverclaimTerms);
assert.equal(notifications.length, 1, "executor contract command must notify the Pi host");
assert.doesNotMatch(notifications[0].message, privilegedPublicTerms);
assert.doesNotMatch(notifications[0].message, hostPathTerms);
assert.doesNotMatch(notifications[0].message, trustedRuntimeRootTerms);
assert.doesNotMatch(notifications[0].message, secretTerms);
assert.doesNotMatch(notifications[0].message, transportOverclaimTerms);
assert.doesNotMatch(notifications[0].message, unattendedOverclaimTerms);

console.log("Goal 3 Task246 Pi unattended real-host executor contract consumer tests passed.");
