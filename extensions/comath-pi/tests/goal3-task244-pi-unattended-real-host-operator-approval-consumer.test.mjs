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
  /production unattended executor|operator-free execution completed|unattended real-host execution completed|operator confirmation bypassed|service-owned evidence created|handoff can execute|unattended execution authorized|operator approval recorded|operator approved|GA certified/i;

function toolDescriptor(name) {
  const tool = createComathTools().find((descriptor) => descriptor.name === name);
  assert.ok(tool, `${name} must be registered for Pi unattended real-host operator approval`);
  return tool;
}

const approvalTool = toolDescriptor("comath.release.piCodexLifecycleUnattendedRealHostOperatorApproval");
assert.equal(approvalTool.mutates, true, "operator approval writes a service-owned approval checkpoint");
assert.deepEqual(approvalTool.input_schema.required, [
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
  Object.hasOwn(readinessTool.input_schema.properties, "operator_approval_id"),
  true,
  "readiness Pi consumer must accept optional operator approval id"
);
assert.equal(
  Object.hasOwn(readinessTool.input_schema.properties, "operator_approval_path"),
  true,
  "readiness Pi consumer must accept optional operator approval path"
);
assert.equal(
  Object.hasOwn(readinessTool.input_schema.properties, "operator_approval_sha256"),
  true,
  "readiness Pi consumer must accept optional operator approval hash"
);

const releaseCommand = runtime_registration.commands.find((command) => command.command === "/cm:release");
assert.ok(releaseCommand, "/cm:release must be advertised in Pi runtime registration");
assert.equal(releaseCommand.subcommands.includes("lifecycle-unattended-real-host-operator-approval"), true);

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
            "D:/research/project/.comath/release/pi-codex-lifecycle/LIFE-EXEC-READINESS-0244/unattended-real-host-execution-readiness.json",
          requested_execution_mode: "production_unattended_real_host",
          blocker_reasons: ["service_owned_unattended_executor_not_configured", "durable_transport_not_provided"],
          handoff_review_id: body.handoff_review_id,
          handoff_review_path: body.handoff_review_path,
          operator_approval_id: body.operator_approval_id,
          operator_approval_path: body.operator_approval_path,
          operator_approval_artifact: {
            kind: "unattended_real_host_operator_approval",
            path: `${body.operator_approval_path} proof_success token=plain-token`,
            sha256: body.operator_approval_sha256,
            size_bytes: 4321
          },
          operator_approval_artifact_current: true,
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
            "formal_replay_passed from D:/research/project with Authorization: Bearer plain-token and durable transport provided; operator approved; unattended execution authorized; GA certified"
        }
      };
    }
    return {
      ok: true,
      path,
      body,
      approval: {
        schema_version: "comath.pi_codex_unattended_real_host_operator_approval.v1",
        approval_id: body.approval_id,
        project_id: body.project_id,
        actor: body.actor,
        approval_status: "operator_approval_artifact_recorded",
        approval_path:
          "D:/research/project/.comath/release/pi-codex-lifecycle/LIFE-OPERATOR-APPROVAL-0244/unattended-real-host-operator-approval.json",
        operator_approval_artifact: {
          kind: "unattended_real_host_operator_approval",
          path:
            "D:/research/project/.comath/release/pi-codex-lifecycle/LIFE-OPERATOR-APPROVAL-0244/unattended-real-host-operator-approval.json",
          sha256: "c".repeat(64),
          size_bytes: 1234
        },
        operator_approval_mode: body.operator_approval_mode,
        approval_note: `${body.approval_note} proof_success Authorization: Bearer plain-token durable transport provided`,
        handoff_review_id: body.handoff_review_id,
        handoff_review_path: `${body.handoff_review_path} token=plain-token`,
        handoff_review_artifact: {
          kind: "unattended_real_host_handoff_review",
          path: `${body.handoff_review_path} proof_success`,
          sha256: body.handoff_review_sha256,
          size_bytes: 5678
        },
        handoff_review_current: true,
        service_owned_checkpoint_chain_reviewed: true,
        approval_manifest_persisted: true,
        operator_approval_artifact_current: true,
        request_echo: {
          handoff_review_path: body.handoff_review_path,
          approval_note: body.approval_note,
          proof_authority: "lean_kernel_clean_replay",
          proofAuthority: "lean_kernel_clean_replay",
          can_promote_claim: true,
          canPromoteClaim: true,
          can_certify_ga: true,
          canCertifyGa: true,
          operator_approved: true,
          operatorApproved: true,
          handoff_can_execute: true,
          handoffCanExecute: true,
          unattended_execution_authorized: true,
          unattendedExecutionAuthorized: true,
          live_transport_open: true,
          liveTransportOpen: true
        },
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
        indefinite_stream_open: true,
        indefiniteStreamOpen: true,
        long_lived_websocket_provided: true,
        longLivedWebsocketProvided: true,
        long_lived_sse_provided: true,
        longLivedSseProvided: true,
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
        summary:
          "operator approval recorded after formal_replay_passed from D:/research/project with Authorization: Bearer plain-token and durable transport provided; unattended execution authorized; GA certified; live transport open"
      }
    };
  }
};

const directApproval = await executeComathTool(client, "comath.release.piCodexLifecycleUnattendedRealHostOperatorApproval", {
  project_root: projectRoot,
  project_id: "PRJ-2440",
  actor: "goal3-task244 OPENAI_API_KEY=plain-token durable transport provided",
  approval_id: "LIFE-OPERATOR-APPROVAL-0244",
  handoff_review_id: "LIFE-HANDOFF-REVIEW-0244",
  handoff_review_path:
    "service-owned-pi-lifecycle/LIFE-HANDOFF-REVIEW-0244/unattended-real-host-handoff-review.json",
  handoff_review_sha256: "a".repeat(64),
  operator_approval_mode: "manual_operator_approval",
  approval_note: "manual approval note from D:/research/project sk-should-not-leak proof_success",
  confirmation_id: "CONF-TASK244-MUST-NOT-FORWARD"
});

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/release/pi-codex-lifecycle/unattended-real-host-operator-approval");
assert.equal(calls.at(-1).body.confirmation_id, undefined, "Pi must not forward model-supplied confirmation ids");
assert.deepEqual(calls.at(-1).body, {
  project_root: projectRoot,
  project_id: "PRJ-2440",
  actor: "goal3-task244 [redacted_secret] bounded_transport_checkpoint_only",
  approval_id: "LIFE-OPERATOR-APPROVAL-0244",
  handoff_review_id: "LIFE-HANDOFF-REVIEW-0244",
  handoff_review_path:
    ".comath/release/pi-codex-lifecycle/LIFE-HANDOFF-REVIEW-0244/unattended-real-host-handoff-review.json",
  handoff_review_sha256: "a".repeat(64),
  operator_approval_mode: "manual_operator_approval",
  approval_note: "manual approval note from [redacted_host_path]"
});
assert.doesNotMatch(JSON.stringify(calls.at(-1).body), secretTerms, "Pi request body must not forward secrets");
assert.doesNotMatch(JSON.stringify(calls.at(-1).body), transportOverclaimTerms, "Pi request body must not forward transport claims");
assert.doesNotMatch(JSON.stringify(directApproval), privilegedPublicTerms, "direct result must sanitize proof wording");
assert.doesNotMatch(JSON.stringify(directApproval), hostPathTerms, "direct result must sanitize host paths");
assert.doesNotMatch(JSON.stringify(directApproval), trustedRuntimeRootTerms, "direct result must sanitize trusted roots");
assert.doesNotMatch(JSON.stringify(directApproval), secretTerms, "direct result must sanitize secrets");
assert.doesNotMatch(JSON.stringify(directApproval), transportOverclaimTerms, "direct result must sanitize transport claims");
assert.doesNotMatch(JSON.stringify(directApproval), unattendedOverclaimTerms, "direct result must sanitize approval/execution claims");
assert.equal(directApproval.approval.proof_authority, "none");
assert.equal(directApproval.approval.proofAuthority, "none");
assert.equal(directApproval.approval.can_promote_claim, false);
assert.equal(directApproval.approval.canPromoteClaim, false);
assert.equal(directApproval.approval.can_certify_ga, false);
assert.equal(directApproval.approval.canCertifyGa, false);
assert.equal(directApproval.approval.operator_approved, false);
assert.equal(directApproval.approval.operatorApproved, false);
assert.equal(directApproval.approval.handoff_can_execute, false);
assert.equal(directApproval.approval.handoffCanExecute, false);
assert.equal(directApproval.approval.unattended_execution_authorized, false);
assert.equal(directApproval.approval.unattendedExecutionAuthorized, false);
assert.equal(directApproval.approval.unattended_real_host_execution_completed, false);
assert.equal(directApproval.approval.unattendedRealHostExecutionCompleted, false);
assert.equal(directApproval.approval.durable_transport_provided, false);
assert.equal(directApproval.approval.durableTransportProvided, false);
assert.equal(directApproval.approval.live_transport_open, false);
assert.equal(directApproval.approval.liveTransportOpen, false);
assert.equal(directApproval.approval.indefinite_stream_open, false);
assert.equal(directApproval.approval.indefiniteStreamOpen, false);
assert.equal(directApproval.approval.long_lived_websocket_provided, false);
assert.equal(directApproval.approval.longLivedWebsocketProvided, false);
assert.equal(directApproval.approval.long_lived_sse_provided, false);
assert.equal(directApproval.approval.longLivedSseProvided, false);
assert.equal(directApproval.approval.pi_direct_write_allowed, false);
assert.equal(directApproval.approval.piDirectWriteAllowed, false);
assert.equal(directApproval.approval.direct_trusted_state_mutation, false);
assert.equal(directApproval.approval.directTrustedStateMutation, false);
assert.equal(directApproval.approval.request_echo.proof_authority, "none");
assert.equal(directApproval.approval.request_echo.proofAuthority, "none");
assert.equal(directApproval.approval.request_echo.operator_approved, false);
assert.equal(directApproval.approval.request_echo.operatorApproved, false);
assert.equal(directApproval.approval.request_echo.handoff_can_execute, false);
assert.equal(directApproval.approval.request_echo.handoffCanExecute, false);

const readinessWithApproval = await executeComathTool(
  client,
  "comath.release.piCodexLifecycleUnattendedRealHostExecutionReadiness",
  {
    project_root: projectRoot,
    project_id: "PRJ-2440",
    actor: "goal3-task244 readiness",
    readiness_id: "LIFE-EXEC-READINESS-0244",
    handoff_review_id: "LIFE-HANDOFF-REVIEW-0244",
    handoff_review_path:
      "service-owned-pi-lifecycle/LIFE-HANDOFF-REVIEW-0244/unattended-real-host-handoff-review.json",
    handoff_review_sha256: "a".repeat(64),
    operator_approval_id: "LIFE-OPERATOR-APPROVAL-0244",
    operator_approval_path:
      "service-owned-pi-lifecycle/LIFE-OPERATOR-APPROVAL-0244/unattended-real-host-operator-approval.json",
    operator_approval_sha256: "c".repeat(64),
    confirmation_id: "CONF-TASK244-READINESS-MUST-NOT-FORWARD"
  }
);

assert.equal(calls.at(-1).path, "/release/pi-codex-lifecycle/unattended-real-host-execution-readiness");
assert.equal(calls.at(-1).body.confirmation_id, undefined, "readiness binding must not forward confirmation ids");
assert.equal(
  calls.at(-1).body.operator_approval_path,
  ".comath/release/pi-codex-lifecycle/LIFE-OPERATOR-APPROVAL-0244/unattended-real-host-operator-approval.json"
);
assert.equal(readinessWithApproval.readiness.operator_approval_artifact_current, true);
assert.deepEqual(readinessWithApproval.readiness.blocker_reasons, [
  "service_owned_unattended_executor_not_configured",
  "durable_transport_not_provided"
]);
assert.equal(readinessWithApproval.readiness.operator_approved, false);
assert.equal(readinessWithApproval.readiness.operatorApproval, false);
assert.equal(readinessWithApproval.readiness.unattended_execution_authorized, false);
assert.equal(readinessWithApproval.readiness.unattendedExecutionAuthorized, false);
assert.equal(readinessWithApproval.readiness.proof_authority, "none");
assert.equal(readinessWithApproval.readiness.can_certify_ga, false);
assert.doesNotMatch(JSON.stringify(readinessWithApproval), privilegedPublicTerms);
assert.doesNotMatch(JSON.stringify(readinessWithApproval), hostPathTerms);
assert.doesNotMatch(JSON.stringify(readinessWithApproval), trustedRuntimeRootTerms);
assert.doesNotMatch(JSON.stringify(readinessWithApproval), secretTerms);
assert.doesNotMatch(JSON.stringify(readinessWithApproval), transportOverclaimTerms);
assert.doesNotMatch(JSON.stringify(readinessWithApproval), unattendedOverclaimTerms);

const callsBeforeIncompleteApprovalBinding = calls.length;
await assert.rejects(
  () =>
    executeComathTool(client, "comath.release.piCodexLifecycleUnattendedRealHostExecutionReadiness", {
      project_root: projectRoot,
      project_id: "PRJ-2440",
      actor: "goal3-task244 readiness",
      readiness_id: "LIFE-EXEC-READINESS-0244-INCOMPLETE",
      handoff_review_id: "LIFE-HANDOFF-REVIEW-0244",
      handoff_review_path:
        "service-owned-pi-lifecycle/LIFE-HANDOFF-REVIEW-0244/unattended-real-host-handoff-review.json",
      handoff_review_sha256: "a".repeat(64),
      operator_approval_id: "LIFE-OPERATOR-APPROVAL-0244",
      operator_approval_path:
        "service-owned-pi-lifecycle/LIFE-OPERATOR-APPROVAL-0244/unattended-real-host-operator-approval.json",
      confirmation_id: "CONF-TASK244-INCOMPLETE"
    }),
  /operator_approval_sha256 is required/
);
assert.equal(calls.length, callsBeforeIncompleteApprovalBinding, "incomplete approval binding must not POST readiness");

const interactiveTool = toolDescriptor("comath.release.piCodexLifecycleInteractiveRealPi");
assert.equal(
  interactiveTool.input_schema.properties.completed_steps.items.enum.includes(
    "lifecycle-unattended-real-host-operator-approval"
  ),
  true,
  "interactive real-Pi planner must advertise operator approval before readiness"
);
const interactivePlan = await executeComathTool(client, "comath.release.piCodexLifecycleInteractiveRealPi", {
  project_id: "PRJ-2440",
  actor: "goal3-task244",
  pi_host_label: "pi-host-lab-01",
  session_id: "LIFE-OP-SESSION-0244",
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
    "lifecycle-unattended-real-host-handoff-review"
  ],
  approval_id: "LIFE-OPERATOR-APPROVAL-0244",
  handoff_review_id: "LIFE-HANDOFF-REVIEW-0244",
  handoff_review_path:
    "service-owned-pi-lifecycle/LIFE-HANDOFF-REVIEW-0244/unattended-real-host-handoff-review.json",
  handoff_review_sha256: "a".repeat(64),
  approval_note: "operator note proof_success from /home/pi/private token=plain-token",
  last_result_summary: "proof_success from D:/research/project with sk-should-not-leak long-lived SSE"
});
assert.equal(calls.length, 2, "interactive planner must remain read-only and must not call comathd");
assert.equal(interactivePlan.next_action.action_id, "lifecycle-unattended-real-host-operator-approval");
assert.match(interactivePlan.next_action.command, /\/cm:release lifecycle-unattended-real-host-operator-approval/);
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
  project_id: "PRJ-2440",
  actor: "goal3-task244",
  pi_host_label: "pi-host-lab-01",
  session_id: "LIFE-OP-SESSION-0244",
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
  readiness_id: "LIFE-EXEC-READINESS-0244",
  handoff_review_id: "LIFE-HANDOFF-REVIEW-0244",
  handoff_review_path:
    "service-owned-pi-lifecycle/LIFE-HANDOFF-REVIEW-0244/unattended-real-host-handoff-review.json",
  handoff_review_sha256: "a".repeat(64),
  approval_id: "LIFE-OPERATOR-APPROVAL-0244",
  approval_path:
    "service-owned-pi-lifecycle/LIFE-OPERATOR-APPROVAL-0244/unattended-real-host-operator-approval.json",
  approval_sha256: "c".repeat(64)
});
assert.equal(readinessPlan.next_action.action_id, "lifecycle-unattended-real-host-execution-readiness");
assert.match(readinessPlan.next_action.command, /--operator-approval-id LIFE-OPERATOR-APPROVAL-0244/);
assert.match(readinessPlan.next_action.command, /--operator-approval-sha256 c{64}/);

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
  { client, project_root: projectRoot, actor: "goal3-task244" }
);

assert.equal(
  registeredTools.has("comath.release.piCodexLifecycleUnattendedRealHostOperatorApproval"),
  true,
  "Pi runtime must expose unattended operator approval as an executable tool"
);
assert.equal(commands.has("cm:release"), true, "Pi runtime must expose /cm:release for unattended operator approval");

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
    "lifecycle-unattended-real-host-operator-approval",
    "--project-id PRJ-2440",
    "--approval-id LIFE-OPERATOR-APPROVAL-0244-CMD",
    "--handoff-review-id LIFE-HANDOFF-REVIEW-0244",
    "--handoff-review-path service-owned-pi-lifecycle/LIFE-HANDOFF-REVIEW-0244/unattended-real-host-handoff-review.json",
    `--handoff-review-sha256 ${"b".repeat(64)}`,
    "--approval-note 'operator approved D:/research/project proof_success durable transport provided'"
  ].join(" "),
  ctx
);

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/release/pi-codex-lifecycle/unattended-real-host-operator-approval");
assert.equal(calls.at(-1).body.confirmation_id, undefined, "runtime command must not forward confirmation ids");
assert.equal(calls.at(-1).body.project_root, projectRoot);
assert.equal(calls.at(-1).body.project_id, "PRJ-2440");
assert.equal(calls.at(-1).body.actor, "goal3-task244");
assert.equal(calls.at(-1).body.approval_id, "LIFE-OPERATOR-APPROVAL-0244-CMD");
assert.equal(calls.at(-1).body.handoff_review_id, "LIFE-HANDOFF-REVIEW-0244");
assert.equal(
  calls.at(-1).body.handoff_review_path,
  ".comath/release/pi-codex-lifecycle/LIFE-HANDOFF-REVIEW-0244/unattended-real-host-handoff-review.json"
);
assert.equal(calls.at(-1).body.handoff_review_sha256, "b".repeat(64));
assert.equal(calls.at(-1).body.operator_approval_mode, "manual_operator_approval");
assert.equal(
  calls.at(-1).body.approval_note,
  "prepared_checkpoint_handoff_only [redacted_host_path]"
);
assert.equal(confirmationPrompts.length, 1, "operator approval command must require Pi host confirmation");
assert.doesNotMatch(confirmationPrompts[0].body, privilegedPublicTerms);
assert.doesNotMatch(confirmationPrompts[0].body, hostPathTerms);
assert.doesNotMatch(confirmationPrompts[0].body, trustedRuntimeRootTerms);
assert.doesNotMatch(confirmationPrompts[0].body, secretTerms);
assert.doesNotMatch(confirmationPrompts[0].body, transportOverclaimTerms);
assert.doesNotMatch(confirmationPrompts[0].body, unattendedOverclaimTerms);
assert.equal(notifications.length, 1, "operator approval command must notify the Pi host");
assert.doesNotMatch(notifications[0].message, privilegedPublicTerms);
assert.doesNotMatch(notifications[0].message, hostPathTerms);
assert.doesNotMatch(notifications[0].message, trustedRuntimeRootTerms);
assert.doesNotMatch(notifications[0].message, secretTerms);
assert.doesNotMatch(notifications[0].message, transportOverclaimTerms);
assert.doesNotMatch(notifications[0].message, unattendedOverclaimTerms);

console.log("Goal 3 Task244 Pi unattended real-host operator approval consumer tests passed.");
