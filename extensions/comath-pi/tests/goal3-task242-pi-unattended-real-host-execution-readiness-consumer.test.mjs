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
  /production unattended executor|operator-free execution completed|unattended real-host execution completed|operator confirmation bypassed|service-owned evidence created|handoff can execute|unattended execution authorized|operator approval recorded|GA certified/i;

function toolDescriptor(name) {
  const tool = createComathTools().find((descriptor) => descriptor.name === name);
  assert.ok(tool, `${name} must be registered for Pi unattended real-host execution readiness`);
  return tool;
}

const readinessTool = toolDescriptor("comath.release.piCodexLifecycleUnattendedRealHostExecutionReadiness");
assert.equal(readinessTool.mutates, true, "execution readiness writes a service-owned blocked manifest");
assert.deepEqual(readinessTool.input_schema.required, [
  "project_root",
  "project_id",
  "actor",
  "handoff_review_id",
  "handoff_review_path",
  "handoff_review_sha256",
  "confirmation_id"
]);

const releaseCommand = runtime_registration.commands.find((command) => command.command === "/cm:release");
assert.ok(releaseCommand, "/cm:release must be advertised in Pi runtime registration");
assert.equal(releaseCommand.subcommands.includes("lifecycle-unattended-real-host-execution-readiness"), true);

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
      readiness: {
        schema_version: "comath.pi_codex_unattended_real_host_execution_readiness.v1",
        readiness_id: body.readiness_id,
        project_id: body.project_id,
        actor: body.actor,
        readiness_status: "blocked_unattended_real_host_execution_not_authorized",
        readiness_path:
          "D:/research/project/.comath/release/pi-codex-lifecycle/LIFE-EXEC-READINESS-0242/unattended-real-host-execution-readiness.json",
        requested_execution_mode: "production_unattended_real_host",
        blocker_reasons: [
          "operator_approval_artifact_missing",
          "service_owned_unattended_executor_not_configured",
          "durable_transport_not_provided"
        ],
        handoff_review_id: body.handoff_review_id,
        handoff_review_path: `${body.handoff_review_path} proof_success token=plain-token`,
        request_echo: {
          handoff_review_path: body.handoff_review_path,
          proof_authority: "lean_kernel_clean_replay",
          proofAuthority: "lean_kernel_clean_replay",
          can_promote_claim: true,
          canPromoteClaim: true,
          can_certify_ga: true,
          canCertifyGa: true,
          handoff_can_execute: true,
          handoffCanExecute: true,
          unattended_execution_authorized: true,
          unattendedExecutionAuthorized: true,
          live_transport_open: true,
          liveTransportOpen: true
        },
        readiness_artifact: {
          kind: "unattended_real_host_execution_readiness",
          path:
            "D:/research/project/.comath/release/pi-codex-lifecycle/LIFE-EXEC-READINESS-0242/unattended-real-host-execution-readiness.json",
          sha256: "e".repeat(64),
          size_bytes: 1234
        },
        operator_approved: true,
        operatorApproval: true,
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
          "formal_replay_passed from D:/research/project with Authorization: Bearer plain-token and durable transport provided; unattended execution authorized; operator approval recorded; GA certified; live transport open"
      }
    };
  }
};

const directResult = await executeComathTool(client, "comath.release.piCodexLifecycleUnattendedRealHostExecutionReadiness", {
  project_root: projectRoot,
  project_id: "PRJ-2420",
  actor: "goal3-task242 OPENAI_API_KEY=plain-token durable transport provided",
  readiness_id: "LIFE-EXEC-READINESS-0242",
  handoff_review_id: "LIFE-HANDOFF-REVIEW-0242",
  handoff_review_path:
    ".comath/release/pi-codex-lifecycle/LIFE-HANDOFF-REVIEW-0242/unattended-real-host-handoff-review.json",
  handoff_review_sha256: "a".repeat(64),
  requested_execution_mode: "production_unattended_real_host",
  confirmation_id: "CONF-TASK242-MUST-NOT-FORWARD"
});

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/release/pi-codex-lifecycle/unattended-real-host-execution-readiness");
assert.equal(calls.at(-1).body.confirmation_id, undefined, "Pi must not forward model-supplied confirmation ids");
assert.deepEqual(calls.at(-1).body, {
  project_root: projectRoot,
  project_id: "PRJ-2420",
  actor: "goal3-task242 [redacted_secret] bounded_transport_checkpoint_only",
  readiness_id: "LIFE-EXEC-READINESS-0242",
  handoff_review_id: "LIFE-HANDOFF-REVIEW-0242",
  handoff_review_path:
    ".comath/release/pi-codex-lifecycle/LIFE-HANDOFF-REVIEW-0242/unattended-real-host-handoff-review.json",
  handoff_review_sha256: "a".repeat(64),
  requested_execution_mode: "production_unattended_real_host"
});
assert.doesNotMatch(JSON.stringify(calls.at(-1).body), secretTerms, "Pi request body must not forward secrets");
assert.doesNotMatch(
  JSON.stringify(calls.at(-1).body),
  transportOverclaimTerms,
  "Pi request body must not forward durable/live transport overclaims"
);
assert.doesNotMatch(JSON.stringify(directResult), privilegedPublicTerms, "direct result must sanitize proof wording");
assert.doesNotMatch(JSON.stringify(directResult), hostPathTerms, "direct result must sanitize host paths");
assert.doesNotMatch(JSON.stringify(directResult), trustedRuntimeRootTerms, "direct result must sanitize trusted roots");
assert.doesNotMatch(JSON.stringify(directResult), secretTerms, "direct result must sanitize secrets");
assert.doesNotMatch(JSON.stringify(directResult), transportOverclaimTerms, "direct result must sanitize transport claims");
assert.doesNotMatch(JSON.stringify(directResult), unattendedOverclaimTerms, "direct result must sanitize execution claims");
assert.equal(directResult.readiness.proof_authority, "none");
assert.equal(directResult.readiness.proofAuthority, "none");
assert.equal(directResult.readiness.can_promote_claim, false);
assert.equal(directResult.readiness.canPromoteClaim, false);
assert.equal(directResult.readiness.can_certify_ga, false);
assert.equal(directResult.readiness.canCertifyGa, false);
assert.equal(directResult.readiness.operator_approved, false);
assert.equal(directResult.readiness.operatorApproval, false);
assert.equal(directResult.readiness.handoff_can_execute, false);
assert.equal(directResult.readiness.handoffCanExecute, false);
assert.equal(directResult.readiness.unattended_execution_authorized, false);
assert.equal(directResult.readiness.unattendedExecutionAuthorized, false);
assert.equal(directResult.readiness.unattended_real_host_execution_completed, false);
assert.equal(directResult.readiness.unattendedRealHostExecutionCompleted, false);
assert.equal(directResult.readiness.durable_transport_provided, false);
assert.equal(directResult.readiness.durableTransportProvided, false);
assert.equal(directResult.readiness.live_transport_open, false);
assert.equal(directResult.readiness.liveTransportOpen, false);
assert.equal(directResult.readiness.indefinite_stream_open, false);
assert.equal(directResult.readiness.indefiniteStreamOpen, false);
assert.equal(directResult.readiness.long_lived_websocket_provided, false);
assert.equal(directResult.readiness.longLivedWebsocketProvided, false);
assert.equal(directResult.readiness.long_lived_sse_provided, false);
assert.equal(directResult.readiness.longLivedSseProvided, false);
assert.equal(directResult.readiness.pi_direct_write_allowed, false);
assert.equal(directResult.readiness.piDirectWriteAllowed, false);
assert.equal(directResult.readiness.direct_trusted_state_mutation, false);
assert.equal(directResult.readiness.directTrustedStateMutation, false);
assert.equal(directResult.readiness.request_echo.proof_authority, "none");
assert.equal(directResult.readiness.request_echo.proofAuthority, "none");
assert.equal(directResult.readiness.request_echo.can_promote_claim, false);
assert.equal(directResult.readiness.request_echo.canPromoteClaim, false);
assert.equal(directResult.readiness.request_echo.handoff_can_execute, false);
assert.equal(directResult.readiness.request_echo.handoffCanExecute, false);

const callsBeforeMissingReviewHash = calls.length;
await assert.rejects(
  () =>
    executeComathTool(client, "comath.release.piCodexLifecycleUnattendedRealHostExecutionReadiness", {
      project_root: projectRoot,
      project_id: "PRJ-2420",
      actor: "goal3-task242",
      readiness_id: "LIFE-EXEC-READINESS-0242-NO-HASH",
      handoff_review_id: "LIFE-HANDOFF-REVIEW-0242",
      handoff_review_path:
        "service-owned-pi-lifecycle/LIFE-HANDOFF-REVIEW-0242/unattended-real-host-handoff-review.json",
      confirmation_id: "CONF-TASK242-MISSING-HASH"
    }),
  /handoff_review_sha256 is required/
);
assert.equal(calls.length, callsBeforeMissingReviewHash, "missing handoff review hash must not POST");

const interactiveTool = toolDescriptor("comath.release.piCodexLifecycleInteractiveRealPi");
assert.equal(
  interactiveTool.input_schema.properties.completed_steps.items.enum.includes(
    "lifecycle-unattended-real-host-execution-readiness"
  ),
  true,
  "interactive real-Pi planner must advertise unattended execution readiness after handoff review"
);
const interactivePlan = await executeComathTool(client, "comath.release.piCodexLifecycleInteractiveRealPi", {
  project_id: "PRJ-2420",
  actor: "goal3-task242",
  pi_host_label: "pi-host-lab-01",
  session_id: "LIFE-OP-SESSION-0242",
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
  readiness_id: "LIFE-EXEC-READINESS-0242",
  handoff_review_id: "LIFE-HANDOFF-REVIEW-0242",
  handoff_review_path:
    "service-owned-pi-lifecycle/LIFE-HANDOFF-REVIEW-0242/unattended-real-host-handoff-review.json",
  handoff_review_sha256: "a".repeat(64),
  last_result_summary: "proof_success from D:/research/project with sk-should-not-leak long-lived SSE"
});
assert.equal(calls.length, 1, "interactive planner must remain read-only and must not call comathd");
assert.equal(interactivePlan.next_action.action_id, "lifecycle-unattended-real-host-execution-readiness");
assert.match(interactivePlan.next_action.command, /\/cm:release lifecycle-unattended-real-host-execution-readiness/);
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
  { client, project_root: projectRoot, actor: "goal3-task242" }
);

assert.equal(
  registeredTools.has("comath.release.piCodexLifecycleUnattendedRealHostExecutionReadiness"),
  true,
  "Pi runtime must expose unattended execution readiness as an executable tool"
);
assert.equal(commands.has("cm:release"), true, "Pi runtime must expose /cm:release for unattended execution readiness");

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
    "lifecycle-unattended-real-host-execution-readiness",
    "--project-id PRJ-2420",
    "--readiness-id LIFE-EXEC-READINESS-0242-CMD",
    "--handoff-review-id LIFE-HANDOFF-REVIEW-0242",
    "--handoff-review-path service-owned-pi-lifecycle/LIFE-HANDOFF-REVIEW-0242/unattended-real-host-handoff-review.json",
    `--handoff-review-sha256 ${"b".repeat(64)}`
  ].join(" "),
  ctx
);

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/release/pi-codex-lifecycle/unattended-real-host-execution-readiness");
assert.equal(calls.at(-1).body.confirmation_id, undefined, "runtime command must not forward confirmation ids");
assert.equal(calls.at(-1).body.project_root, projectRoot);
assert.equal(calls.at(-1).body.project_id, "PRJ-2420");
assert.equal(calls.at(-1).body.actor, "goal3-task242");
assert.equal(calls.at(-1).body.readiness_id, "LIFE-EXEC-READINESS-0242-CMD");
assert.equal(calls.at(-1).body.handoff_review_id, "LIFE-HANDOFF-REVIEW-0242");
assert.equal(
  calls.at(-1).body.handoff_review_path,
  ".comath/release/pi-codex-lifecycle/LIFE-HANDOFF-REVIEW-0242/unattended-real-host-handoff-review.json"
);
assert.equal(calls.at(-1).body.handoff_review_sha256, "b".repeat(64));
assert.equal(calls.at(-1).body.requested_execution_mode, "production_unattended_real_host");
assert.equal(confirmationPrompts.length, 1, "unattended execution readiness command must require Pi host confirmation");
assert.doesNotMatch(confirmationPrompts[0].body, privilegedPublicTerms);
assert.doesNotMatch(confirmationPrompts[0].body, hostPathTerms);
assert.doesNotMatch(confirmationPrompts[0].body, trustedRuntimeRootTerms);
assert.doesNotMatch(confirmationPrompts[0].body, secretTerms);
assert.doesNotMatch(confirmationPrompts[0].body, transportOverclaimTerms);
assert.doesNotMatch(confirmationPrompts[0].body, unattendedOverclaimTerms);
assert.equal(notifications.length, 1, "unattended execution readiness command must notify the Pi host");
assert.doesNotMatch(notifications[0].message, privilegedPublicTerms);
assert.doesNotMatch(notifications[0].message, hostPathTerms);
assert.doesNotMatch(notifications[0].message, trustedRuntimeRootTerms);
assert.doesNotMatch(notifications[0].message, secretTerms);
assert.doesNotMatch(notifications[0].message, transportOverclaimTerms);
assert.doesNotMatch(notifications[0].message, unattendedOverclaimTerms);

console.log("Goal 3 Task242 Pi unattended real-host execution readiness consumer tests passed.");
