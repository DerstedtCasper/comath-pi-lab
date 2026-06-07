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
  assert.ok(tool, `${name} must be registered for Pi durable transport prerequisite contract`);
  return tool;
}

const durableTool = toolDescriptor("comath.release.piCodexLifecycleUnattendedRealHostDurableTransportContract");
assert.equal(durableTool.mutates, true, "durable transport prerequisite contract writes service-owned evidence");
assert.deepEqual(durableTool.input_schema.required, [
  "project_root",
  "project_id",
  "actor",
  "handoff_review_id",
  "handoff_review_path",
  "handoff_review_sha256",
  "operator_approval_id",
  "operator_approval_path",
  "operator_approval_sha256",
  "unattended_executor_contract_id",
  "unattended_executor_contract_path",
  "unattended_executor_contract_sha256",
  "transport_continuity_id",
  "transport_continuity_path",
  "transport_continuity_sha256",
  "confirmation_id"
]);

const readinessTool = toolDescriptor("comath.release.piCodexLifecycleUnattendedRealHostExecutionReadiness");
for (const field of [
  "durable_transport_contract_id",
  "durable_transport_contract_path",
  "durable_transport_contract_sha256"
]) {
  assert.equal(Object.hasOwn(readinessTool.input_schema.properties, field), true, `readiness must accept ${field}`);
}

const releaseCommand = runtime_registration.commands.find((command) => command.command === "/cm:release");
assert.ok(releaseCommand, "/cm:release must be advertised in Pi runtime registration");
assert.equal(
  releaseCommand.subcommands.includes("lifecycle-unattended-real-host-durable-transport-contract"),
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
          readiness_status: "unattended_real_host_execution_prerequisites_recorded",
          readiness_path:
            "D:/research/project/.comath/release/pi-codex-lifecycle/LIFE-EXEC-READINESS-0248/unattended-real-host-execution-readiness.json",
          requested_execution_mode: "production_unattended_real_host",
          blocker_reasons: [],
          handoff_review_id: body.handoff_review_id,
          handoff_review_path: body.handoff_review_path,
          operator_approval_id: body.operator_approval_id,
          operator_approval_path: body.operator_approval_path,
          operator_approval_artifact_current: true,
          unattended_executor_contract_id: body.unattended_executor_contract_id,
          unattended_executor_contract_path: body.unattended_executor_contract_path,
          unattended_executor_contract_current: true,
          service_owned_unattended_executor_configured: true,
          durable_transport_contract_id: body.durable_transport_contract_id,
          durable_transport_contract_path: body.durable_transport_contract_path,
          durable_transport_contract_artifact: {
            kind: "unattended_real_host_durable_transport_contract",
            path: `${body.durable_transport_contract_path} proof_success token=plain-token`,
            sha256: body.durable_transport_contract_sha256,
            size_bytes: 4321
          },
          durable_transport_contract_current: true,
          service_owned_durable_transport_prerequisite_configured: true,
          operator_approved: true,
          operatorApproved: true,
          handoff_can_execute: true,
          handoffCanExecute: true,
          executor_invoked: true,
          executorInvoked: true,
          unattended_execution_authorized: true,
          unattendedExecutionAuthorized: true,
          unattended_real_host_execution_completed: true,
          unattendedRealHostExecutionCompleted: true,
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
      durable_transport_contract: {
        schema_version: "comath.pi_codex_unattended_real_host_durable_transport_contract.v1",
        durable_transport_contract_id: body.durable_transport_contract_id,
        project_id: body.project_id,
        actor: body.actor,
        durable_transport_contract_status: "durable_transport_prerequisite_contract_recorded",
        durable_transport_contract_path:
          "D:/research/project/.comath/release/pi-codex-lifecycle/LIFE-DURABLE-TRANSPORT-CONTRACT-0248/unattended-real-host-durable-transport-contract.json",
        durable_transport_contract_artifact: {
          kind: "unattended_real_host_durable_transport_contract",
          path:
            "D:/research/project/.comath/release/pi-codex-lifecycle/LIFE-DURABLE-TRANSPORT-CONTRACT-0248/unattended-real-host-durable-transport-contract.json",
          sha256: "f".repeat(64),
          size_bytes: 1234
        },
        durability_contract_kind: body.durability_contract_kind,
        transport_prerequisite_state: body.transport_prerequisite_state,
        handoff_review_id: body.handoff_review_id,
        handoff_review_path: `${body.handoff_review_path} proof_success token=plain-token`,
        operator_approval_id: body.operator_approval_id,
        operator_approval_path: `${body.operator_approval_path} Authorization: Bearer plain-token`,
        unattended_executor_contract_id: body.unattended_executor_contract_id,
        unattended_executor_contract_path: `${body.unattended_executor_contract_path} proof_success`,
        transport_continuity_id: body.transport_continuity_id,
        transport_continuity_path: `${body.transport_continuity_path} token=plain-token`,
        handoff_review_current: true,
        operator_approval_artifact_current: true,
        unattended_executor_contract_current: true,
        transport_continuity_current: true,
        durable_transport_contract_manifest_persisted: true,
        durable_transport_contract_current: true,
        service_owned_durable_transport_prerequisite_configured: true,
        operator_approved: true,
        operatorApproved: true,
        handoff_can_execute: true,
        handoffCanExecute: true,
        executor_invoked: true,
        executorInvoked: true,
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
        request_echo: {
          durable_transport_contract_id: body.durable_transport_contract_id,
          transport_prerequisite_state: body.transport_prerequisite_state,
          proof_authority: "lean_kernel_clean_replay",
          proofAuthority: "lean_kernel_clean_replay",
          durable_transport_provided: true,
          durableTransportProvided: true,
          live_transport_open: true,
          liveTransportOpen: true,
          executor_invoked: true,
          executorInvoked: true,
          unattended_execution_authorized: true,
          unattendedExecutionAuthorized: true
        },
        summary:
          "durable transport provided after formal_replay_passed from D:/research/project with sk-should-not-leak; executor invoked; unattended execution authorized; GA certified; live transport open"
      }
    };
  }
};

const directContract = await executeComathTool(
  client,
  "comath.release.piCodexLifecycleUnattendedRealHostDurableTransportContract",
  {
    project_root: projectRoot,
    project_id: "PRJ-2480",
    actor: "goal3-task248 OPENAI_API_KEY=plain-token durable transport provided",
    durable_transport_contract_id: "LIFE-DURABLE-TRANSPORT-CONTRACT-0248",
    handoff_review_id: "LIFE-HANDOFF-REVIEW-0248",
    handoff_review_path:
      "service-owned-pi-lifecycle/LIFE-HANDOFF-REVIEW-0248/unattended-real-host-handoff-review.json",
    handoff_review_sha256: "a".repeat(64),
    operator_approval_id: "LIFE-OPERATOR-APPROVAL-0248",
    operator_approval_path:
      "service-owned-pi-lifecycle/LIFE-OPERATOR-APPROVAL-0248/unattended-real-host-operator-approval.json",
    operator_approval_sha256: "c".repeat(64),
    unattended_executor_contract_id: "LIFE-UNATTENDED-EXECUTOR-CONTRACT-0248",
    unattended_executor_contract_path:
      "service-owned-pi-lifecycle/LIFE-UNATTENDED-EXECUTOR-CONTRACT-0248/unattended-real-host-executor-contract.json",
    unattended_executor_contract_sha256: "d".repeat(64),
    transport_continuity_id: "LIFE-TRANSPORT-CONTINUITY-0248",
    transport_continuity_path:
      "service-owned-pi-lifecycle/LIFE-TRANSPORT-CONTINUITY-0248/operator-service-transport-continuity.json",
    transport_continuity_sha256: "e".repeat(64),
    confirmation_id: "CONF-TASK248-MUST-NOT-FORWARD"
  }
);

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/release/pi-codex-lifecycle/unattended-real-host-durable-transport-contract");
assert.equal(calls.at(-1).body.confirmation_id, undefined, "Pi must not forward model-supplied confirmation ids");
assert.deepEqual(calls.at(-1).body, {
  project_root: projectRoot,
  project_id: "PRJ-2480",
  actor: "goal3-task248 [redacted_secret] bounded_transport_checkpoint_only",
  durable_transport_contract_id: "LIFE-DURABLE-TRANSPORT-CONTRACT-0248",
  handoff_review_id: "LIFE-HANDOFF-REVIEW-0248",
  handoff_review_path:
    ".comath/release/pi-codex-lifecycle/LIFE-HANDOFF-REVIEW-0248/unattended-real-host-handoff-review.json",
  handoff_review_sha256: "a".repeat(64),
  operator_approval_id: "LIFE-OPERATOR-APPROVAL-0248",
  operator_approval_path:
    ".comath/release/pi-codex-lifecycle/LIFE-OPERATOR-APPROVAL-0248/unattended-real-host-operator-approval.json",
  operator_approval_sha256: "c".repeat(64),
  unattended_executor_contract_id: "LIFE-UNATTENDED-EXECUTOR-CONTRACT-0248",
  unattended_executor_contract_path:
    ".comath/release/pi-codex-lifecycle/LIFE-UNATTENDED-EXECUTOR-CONTRACT-0248/unattended-real-host-executor-contract.json",
  unattended_executor_contract_sha256: "d".repeat(64),
  transport_continuity_id: "LIFE-TRANSPORT-CONTINUITY-0248",
  transport_continuity_path:
    ".comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-CONTINUITY-0248/operator-service-transport-continuity.json",
  transport_continuity_sha256: "e".repeat(64),
  durability_contract_kind: "service_owned_external_durable_transport_prerequisite_contract",
  transport_prerequisite_state: "contract_recorded_transport_not_opened"
});
assert.doesNotMatch(JSON.stringify(calls.at(-1).body), secretTerms, "Pi request body must not forward secrets");
assert.doesNotMatch(JSON.stringify(calls.at(-1).body), transportOverclaimTerms, "Pi request body must not forward transport claims");
assert.doesNotMatch(JSON.stringify(calls.at(-1).body), unattendedOverclaimTerms, "Pi request body must not forward execution claims");
assert.doesNotMatch(JSON.stringify(directContract), privilegedPublicTerms, "direct result must sanitize proof wording");
assert.doesNotMatch(JSON.stringify(directContract), hostPathTerms, "direct result must sanitize host paths");
assert.doesNotMatch(JSON.stringify(directContract), trustedRuntimeRootTerms, "direct result must sanitize trusted roots");
assert.doesNotMatch(JSON.stringify(directContract), secretTerms, "direct result must sanitize secrets");
assert.doesNotMatch(JSON.stringify(directContract), transportOverclaimTerms, "direct result must sanitize transport claims");
assert.doesNotMatch(JSON.stringify(directContract), unattendedOverclaimTerms, "direct result must sanitize execution claims");
assert.equal(directContract.durable_transport_contract.proof_authority, "none");
assert.equal(directContract.durable_transport_contract.proofAuthority, "none");
assert.equal(directContract.durable_transport_contract.can_promote_claim, false);
assert.equal(directContract.durable_transport_contract.canPromoteClaim, false);
assert.equal(directContract.durable_transport_contract.can_certify_ga, false);
assert.equal(directContract.durable_transport_contract.canCertifyGa, false);
assert.equal(directContract.durable_transport_contract.operator_approved, false);
assert.equal(directContract.durable_transport_contract.executor_invoked, false);
assert.equal(directContract.durable_transport_contract.unattended_execution_authorized, false);
assert.equal(directContract.durable_transport_contract.unattended_real_host_execution_completed, false);
assert.equal(directContract.durable_transport_contract.durable_transport_provided, false);
assert.equal(directContract.durable_transport_contract.live_transport_open, false);
assert.equal(directContract.durable_transport_contract.pi_direct_write_allowed, false);
assert.equal(directContract.durable_transport_contract.direct_trusted_state_mutation, false);

const readinessWithDurableContract = await executeComathTool(
  client,
  "comath.release.piCodexLifecycleUnattendedRealHostExecutionReadiness",
  {
    project_root: projectRoot,
    project_id: "PRJ-2480",
    actor: "goal3-task248 readiness",
    readiness_id: "LIFE-EXEC-READINESS-0248",
    handoff_review_id: "LIFE-HANDOFF-REVIEW-0248",
    handoff_review_path:
      "service-owned-pi-lifecycle/LIFE-HANDOFF-REVIEW-0248/unattended-real-host-handoff-review.json",
    handoff_review_sha256: "a".repeat(64),
    operator_approval_id: "LIFE-OPERATOR-APPROVAL-0248",
    operator_approval_path:
      "service-owned-pi-lifecycle/LIFE-OPERATOR-APPROVAL-0248/unattended-real-host-operator-approval.json",
    operator_approval_sha256: "c".repeat(64),
    unattended_executor_contract_id: "LIFE-UNATTENDED-EXECUTOR-CONTRACT-0248",
    unattended_executor_contract_path:
      "service-owned-pi-lifecycle/LIFE-UNATTENDED-EXECUTOR-CONTRACT-0248/unattended-real-host-executor-contract.json",
    unattended_executor_contract_sha256: "d".repeat(64),
    durable_transport_contract_id: "LIFE-DURABLE-TRANSPORT-CONTRACT-0248",
    durable_transport_contract_path:
      "service-owned-pi-lifecycle/LIFE-DURABLE-TRANSPORT-CONTRACT-0248/unattended-real-host-durable-transport-contract.json",
    durable_transport_contract_sha256: "f".repeat(64),
    confirmation_id: "CONF-TASK248-READINESS-MUST-NOT-FORWARD"
  }
);

assert.equal(calls.at(-1).path, "/release/pi-codex-lifecycle/unattended-real-host-execution-readiness");
assert.equal(calls.at(-1).body.confirmation_id, undefined, "readiness binding must not forward confirmation ids");
assert.equal(
  calls.at(-1).body.durable_transport_contract_path,
  ".comath/release/pi-codex-lifecycle/LIFE-DURABLE-TRANSPORT-CONTRACT-0248/unattended-real-host-durable-transport-contract.json"
);
assert.equal(readinessWithDurableContract.readiness.durable_transport_contract_current, true);
assert.equal(
  readinessWithDurableContract.readiness.service_owned_durable_transport_prerequisite_configured,
  true
);
assert.deepEqual(readinessWithDurableContract.readiness.blocker_reasons, []);
assert.equal(readinessWithDurableContract.readiness.executor_invoked, false);
assert.equal(readinessWithDurableContract.readiness.unattended_execution_authorized, false);
assert.equal(readinessWithDurableContract.readiness.durable_transport_provided, false);
assert.equal(readinessWithDurableContract.readiness.live_transport_open, false);
assert.equal(readinessWithDurableContract.readiness.proof_authority, "none");
assert.equal(readinessWithDurableContract.readiness.can_certify_ga, false);
assert.doesNotMatch(JSON.stringify(readinessWithDurableContract), privilegedPublicTerms);
assert.doesNotMatch(JSON.stringify(readinessWithDurableContract), hostPathTerms);
assert.doesNotMatch(JSON.stringify(readinessWithDurableContract), trustedRuntimeRootTerms);
assert.doesNotMatch(JSON.stringify(readinessWithDurableContract), secretTerms);
assert.doesNotMatch(JSON.stringify(readinessWithDurableContract), transportOverclaimTerms);
assert.doesNotMatch(JSON.stringify(readinessWithDurableContract), unattendedOverclaimTerms);

const callsBeforeIncompleteDurableBinding = calls.length;
await assert.rejects(
  () =>
    executeComathTool(client, "comath.release.piCodexLifecycleUnattendedRealHostExecutionReadiness", {
      project_root: projectRoot,
      project_id: "PRJ-2480",
      actor: "goal3-task248 readiness",
      readiness_id: "LIFE-EXEC-READINESS-0248-INCOMPLETE",
      handoff_review_id: "LIFE-HANDOFF-REVIEW-0248",
      handoff_review_path:
        "service-owned-pi-lifecycle/LIFE-HANDOFF-REVIEW-0248/unattended-real-host-handoff-review.json",
      handoff_review_sha256: "a".repeat(64),
      operator_approval_id: "LIFE-OPERATOR-APPROVAL-0248",
      operator_approval_path:
        "service-owned-pi-lifecycle/LIFE-OPERATOR-APPROVAL-0248/unattended-real-host-operator-approval.json",
      operator_approval_sha256: "c".repeat(64),
      unattended_executor_contract_id: "LIFE-UNATTENDED-EXECUTOR-CONTRACT-0248",
      unattended_executor_contract_path:
        "service-owned-pi-lifecycle/LIFE-UNATTENDED-EXECUTOR-CONTRACT-0248/unattended-real-host-executor-contract.json",
      unattended_executor_contract_sha256: "d".repeat(64),
      durable_transport_contract_id: "LIFE-DURABLE-TRANSPORT-CONTRACT-0248",
      durable_transport_contract_path:
        "service-owned-pi-lifecycle/LIFE-DURABLE-TRANSPORT-CONTRACT-0248/unattended-real-host-durable-transport-contract.json",
      confirmation_id: "CONF-TASK248-INCOMPLETE"
    }),
  /durable_transport_contract_sha256 is required/
);
assert.equal(calls.length, callsBeforeIncompleteDurableBinding, "incomplete durable binding must not POST readiness");

const interactiveTool = toolDescriptor("comath.release.piCodexLifecycleInteractiveRealPi");
assert.equal(
  interactiveTool.input_schema.properties.completed_steps.items.enum.includes(
    "lifecycle-unattended-real-host-durable-transport-contract"
  ),
  true,
  "interactive real-Pi planner must advertise durable transport prerequisite contract before readiness"
);

const durablePlan = await executeComathTool(client, "comath.release.piCodexLifecycleInteractiveRealPi", {
  project_id: "PRJ-2480",
  actor: "goal3-task248",
  pi_host_label: "pi-host-lab-01",
  session_id: "LIFE-OP-SESSION-0248",
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
  durable_transport_contract_id: "LIFE-DURABLE-TRANSPORT-CONTRACT-0248",
  handoff_review_id: "LIFE-HANDOFF-REVIEW-0248",
  handoff_review_path:
    "service-owned-pi-lifecycle/LIFE-HANDOFF-REVIEW-0248/unattended-real-host-handoff-review.json",
  handoff_review_sha256: "a".repeat(64),
  approval_id: "LIFE-OPERATOR-APPROVAL-0248",
  approval_path:
    "service-owned-pi-lifecycle/LIFE-OPERATOR-APPROVAL-0248/unattended-real-host-operator-approval.json",
  approval_sha256: "c".repeat(64),
  executor_contract_id: "LIFE-UNATTENDED-EXECUTOR-CONTRACT-0248",
  executor_contract_path:
    "service-owned-pi-lifecycle/LIFE-UNATTENDED-EXECUTOR-CONTRACT-0248/unattended-real-host-executor-contract.json",
  executor_contract_sha256: "d".repeat(64),
  continuity_id: "LIFE-TRANSPORT-CONTINUITY-0248",
  transport_continuity_path:
    "service-owned-pi-lifecycle/LIFE-TRANSPORT-CONTINUITY-0248/operator-service-transport-continuity.json",
  transport_continuity_sha256: "e".repeat(64),
  last_result_summary: "proof_success from D:/research/project with sk-should-not-leak long-lived SSE"
});
assert.equal(calls.length, 2, "interactive planner must remain read-only and must not call comathd");
assert.equal(durablePlan.next_action.action_id, "lifecycle-unattended-real-host-durable-transport-contract");
assert.match(durablePlan.next_action.command, /\/cm:release lifecycle-unattended-real-host-durable-transport-contract/);
assert.match(durablePlan.next_action.command, /--operator-approval-sha256 c{64}/);
assert.match(durablePlan.next_action.command, /--unattended-executor-contract-sha256 d{64}/);
assert.match(durablePlan.next_action.command, /--transport-continuity-sha256 e{64}/);
assert.equal(durablePlan.next_action.requires_host_confirmation, true);
assert.equal(durablePlan.next_action.auto_executes, false);
assert.equal(durablePlan.interactive_policy.pi_tool_readonly, true);
assert.equal(durablePlan.interactive_policy.writes_comath_state, false);
assert.equal(durablePlan.interactive_policy.calls_comathd, false);
assert.equal(durablePlan.interactive_policy.executes_lifecycle_actions, false);
assert.doesNotMatch(JSON.stringify(durablePlan), privilegedPublicTerms);
assert.doesNotMatch(JSON.stringify(durablePlan), hostPathTerms);
assert.doesNotMatch(JSON.stringify(durablePlan), trustedRuntimeRootTerms);
assert.doesNotMatch(JSON.stringify(durablePlan), secretTerms);
assert.doesNotMatch(JSON.stringify(durablePlan), transportOverclaimTerms);
assert.doesNotMatch(JSON.stringify(durablePlan), unattendedOverclaimTerms);

const readinessPlan = await executeComathTool(client, "comath.release.piCodexLifecycleInteractiveRealPi", {
  project_id: "PRJ-2480",
  actor: "goal3-task248",
  pi_host_label: "pi-host-lab-01",
  session_id: "LIFE-OP-SESSION-0248",
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
    "lifecycle-unattended-real-host-durable-transport-contract"
  ],
  readiness_id: "LIFE-EXEC-READINESS-0248",
  handoff_review_id: "LIFE-HANDOFF-REVIEW-0248",
  handoff_review_path:
    "service-owned-pi-lifecycle/LIFE-HANDOFF-REVIEW-0248/unattended-real-host-handoff-review.json",
  handoff_review_sha256: "a".repeat(64),
  approval_id: "LIFE-OPERATOR-APPROVAL-0248",
  approval_path:
    "service-owned-pi-lifecycle/LIFE-OPERATOR-APPROVAL-0248/unattended-real-host-operator-approval.json",
  approval_sha256: "c".repeat(64),
  executor_contract_id: "LIFE-UNATTENDED-EXECUTOR-CONTRACT-0248",
  executor_contract_path:
    "service-owned-pi-lifecycle/LIFE-UNATTENDED-EXECUTOR-CONTRACT-0248/unattended-real-host-executor-contract.json",
  executor_contract_sha256: "d".repeat(64),
  durable_transport_contract_id: "LIFE-DURABLE-TRANSPORT-CONTRACT-0248",
  durable_transport_contract_path:
    "service-owned-pi-lifecycle/LIFE-DURABLE-TRANSPORT-CONTRACT-0248/unattended-real-host-durable-transport-contract.json",
  durable_transport_contract_sha256: "f".repeat(64)
});
assert.equal(readinessPlan.next_action.action_id, "lifecycle-unattended-real-host-execution-readiness");
assert.match(readinessPlan.next_action.command, /--durable-transport-contract-id LIFE-DURABLE-TRANSPORT-CONTRACT-0248/);
assert.match(readinessPlan.next_action.command, /--durable-transport-contract-sha256 f{64}/);

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
  { client, project_root: projectRoot, actor: "goal3-task248" }
);

assert.equal(
  registeredTools.has("comath.release.piCodexLifecycleUnattendedRealHostDurableTransportContract"),
  true,
  "Pi runtime must expose durable transport contract as an executable tool"
);
assert.equal(commands.has("cm:release"), true, "Pi runtime must expose /cm:release for durable transport contract");

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
    "lifecycle-unattended-real-host-durable-transport-contract",
    "--project-id PRJ-2480",
    "--durable-transport-contract-id LIFE-DURABLE-TRANSPORT-CONTRACT-0248-CMD",
    "--handoff-review-id LIFE-HANDOFF-REVIEW-0248",
    "--handoff-review-path service-owned-pi-lifecycle/LIFE-HANDOFF-REVIEW-0248/unattended-real-host-handoff-review.json",
    `--handoff-review-sha256 ${"b".repeat(64)}`,
    "--operator-approval-id LIFE-OPERATOR-APPROVAL-0248",
    "--operator-approval-path service-owned-pi-lifecycle/LIFE-OPERATOR-APPROVAL-0248/unattended-real-host-operator-approval.json",
    `--operator-approval-sha256 ${"c".repeat(64)}`,
    "--unattended-executor-contract-id LIFE-UNATTENDED-EXECUTOR-CONTRACT-0248",
    "--unattended-executor-contract-path service-owned-pi-lifecycle/LIFE-UNATTENDED-EXECUTOR-CONTRACT-0248/unattended-real-host-executor-contract.json",
    `--unattended-executor-contract-sha256 ${"d".repeat(64)}`,
    "--transport-continuity-id LIFE-TRANSPORT-CONTINUITY-0248",
    "--transport-continuity-path service-owned-pi-lifecycle/LIFE-TRANSPORT-CONTINUITY-0248/operator-service-transport-continuity.json",
    `--transport-continuity-sha256 ${"e".repeat(64)}`
  ].join(" "),
  ctx
);

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/release/pi-codex-lifecycle/unattended-real-host-durable-transport-contract");
assert.equal(calls.at(-1).body.confirmation_id, undefined, "runtime command must not forward confirmation ids");
assert.equal(calls.at(-1).body.project_root, projectRoot);
assert.equal(calls.at(-1).body.project_id, "PRJ-2480");
assert.equal(calls.at(-1).body.actor, "goal3-task248");
assert.equal(calls.at(-1).body.durable_transport_contract_id, "LIFE-DURABLE-TRANSPORT-CONTRACT-0248-CMD");
assert.equal(
  calls.at(-1).body.handoff_review_path,
  ".comath/release/pi-codex-lifecycle/LIFE-HANDOFF-REVIEW-0248/unattended-real-host-handoff-review.json"
);
assert.equal(
  calls.at(-1).body.operator_approval_path,
  ".comath/release/pi-codex-lifecycle/LIFE-OPERATOR-APPROVAL-0248/unattended-real-host-operator-approval.json"
);
assert.equal(
  calls.at(-1).body.unattended_executor_contract_path,
  ".comath/release/pi-codex-lifecycle/LIFE-UNATTENDED-EXECUTOR-CONTRACT-0248/unattended-real-host-executor-contract.json"
);
assert.equal(
  calls.at(-1).body.transport_continuity_path,
  ".comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-CONTINUITY-0248/operator-service-transport-continuity.json"
);
assert.equal(calls.at(-1).body.durability_contract_kind, "service_owned_external_durable_transport_prerequisite_contract");
assert.equal(calls.at(-1).body.transport_prerequisite_state, "contract_recorded_transport_not_opened");
assert.equal(confirmationPrompts.length, 1, "durable transport contract command must require Pi host confirmation");
assert.doesNotMatch(confirmationPrompts[0].body, privilegedPublicTerms);
assert.doesNotMatch(confirmationPrompts[0].body, hostPathTerms);
assert.doesNotMatch(confirmationPrompts[0].body, trustedRuntimeRootTerms);
assert.doesNotMatch(confirmationPrompts[0].body, secretTerms);
assert.doesNotMatch(confirmationPrompts[0].body, transportOverclaimTerms);
assert.doesNotMatch(confirmationPrompts[0].body, unattendedOverclaimTerms);
assert.equal(notifications.length, 1, "durable transport contract command must notify the Pi host");
assert.doesNotMatch(notifications[0].message, privilegedPublicTerms);
assert.doesNotMatch(notifications[0].message, hostPathTerms);
assert.doesNotMatch(notifications[0].message, trustedRuntimeRootTerms);
assert.doesNotMatch(notifications[0].message, secretTerms);
assert.doesNotMatch(notifications[0].message, transportOverclaimTerms);
assert.doesNotMatch(notifications[0].message, unattendedOverclaimTerms);

console.log("Goal 3 Task248 Pi unattended real-host durable transport contract consumer tests passed.");
