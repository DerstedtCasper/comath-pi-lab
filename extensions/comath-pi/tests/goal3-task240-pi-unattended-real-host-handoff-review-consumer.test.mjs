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
  assert.ok(tool, `${name} must be registered for Pi unattended real-host handoff review`);
  return tool;
}

const handoffReviewTool = toolDescriptor("comath.release.piCodexLifecycleUnattendedRealHostHandoffReview");
assert.equal(handoffReviewTool.mutates, true, "unattended handoff review writes service-owned review evidence");
assert.deepEqual(handoffReviewTool.input_schema.required, [
  "project_root",
  "project_id",
  "actor",
  "automatic_orchestration_id",
  "automatic_orchestration_path",
  "automatic_orchestration_sha256",
  "transport_continuity_id",
  "transport_continuity_path",
  "transport_continuity_sha256",
  "confirmation_id"
]);

const releaseCommand = runtime_registration.commands.find((command) => command.command === "/cm:release");
assert.ok(releaseCommand, "/cm:release must be advertised in Pi runtime registration");
assert.equal(releaseCommand.subcommands.includes("lifecycle-unattended-real-host-handoff-review"), true);

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
      handoff_review: {
        schema_version: "comath.pi_codex_unattended_real_host_handoff_review.v1",
        project_id: body.project_id,
        handoff_review_id: body.handoff_review_id,
        automatic_orchestration_id: body.automatic_orchestration_id,
        transport_continuity_id: body.transport_continuity_id,
        review_status: "prepared_unattended_real_host_handoff_review_recorded",
        prepared_checkpoint_hashes_current: true,
        service_owned_checkpoint_chain_reviewed: true,
        review_manifest_persisted: true,
        prepared_checkpoints: [
          {
            checkpoint_id: "automatic_orchestration",
            public_path: `${body.automatic_orchestration_path} token=plain-token`,
            sha256: body.automatic_orchestration_sha256,
            proof_authority: "trusted",
            can_certify_ga: true
          },
          {
            checkpoint_id: "transport_continuity",
            public_path: `${body.transport_continuity_path} proof_success`,
            sha256: body.transport_continuity_sha256,
            direct_trusted_state_mutation: true
          }
        ],
        request_echo: {
          automatic_orchestration_path: body.automatic_orchestration_path,
          transport_continuity_path: body.transport_continuity_path,
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
          liveTransportOpen: true,
          pi_direct_write_allowed: true
        },
        handoff_review_artifact: {
          kind: "unattended_real_host_handoff_review",
          path: "D:/research/project/.comath/release/pi-codex-lifecycle/LIFE-HANDOFF-REVIEW-0240/unattended-real-host-handoff-review.json",
          sha256: "d".repeat(64),
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

const directResult = await executeComathTool(client, "comath.release.piCodexLifecycleUnattendedRealHostHandoffReview", {
  project_root: projectRoot,
  project_id: "PRJ-2400",
  actor: "goal3-task240 OPENAI_API_KEY=plain-token durable transport provided",
  handoff_review_id: "LIFE-HANDOFF-REVIEW-0240",
  automatic_orchestration_id: "LIFE-AUTOMATIC-REAL-PI-0240",
  automatic_orchestration_path:
    "service-owned-pi-lifecycle/LIFE-AUTOMATIC-REAL-PI-0240/automatic-real-pi-execution.json",
  automatic_orchestration_sha256: "a".repeat(64),
  transport_continuity_id: "LIFE-TRANSPORT-CONTINUITY-0240",
  transport_continuity_path:
    "service-owned-pi-lifecycle/LIFE-TRANSPORT-CONTINUITY-0240/operator-service-transport-continuity.json",
  transport_continuity_sha256: "b".repeat(64),
  confirmation_id: "CONF-TASK240-MUST-NOT-FORWARD"
});

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/release/pi-codex-lifecycle/unattended-real-host-handoff-review");
assert.equal(calls.at(-1).body.confirmation_id, undefined, "Pi must not forward model-supplied confirmation ids");
assert.deepEqual(calls.at(-1).body, {
  project_root: projectRoot,
  project_id: "PRJ-2400",
  actor: "goal3-task240 [redacted_secret] bounded_transport_checkpoint_only",
  handoff_review_id: "LIFE-HANDOFF-REVIEW-0240",
  automatic_orchestration_id: "LIFE-AUTOMATIC-REAL-PI-0240",
  automatic_orchestration_path:
    "service-owned-pi-lifecycle/LIFE-AUTOMATIC-REAL-PI-0240/automatic-real-pi-execution.json",
  automatic_orchestration_sha256: "a".repeat(64),
  transport_continuity_id: "LIFE-TRANSPORT-CONTINUITY-0240",
  transport_continuity_path:
    "service-owned-pi-lifecycle/LIFE-TRANSPORT-CONTINUITY-0240/operator-service-transport-continuity.json",
  transport_continuity_sha256: "b".repeat(64)
});
assert.doesNotMatch(JSON.stringify(calls.at(-1).body), secretTerms, "Pi request body must not forward secrets");
assert.doesNotMatch(
  JSON.stringify(calls.at(-1).body),
  transportOverclaimTerms,
  "Pi request body must not forward long-lived transport overclaims"
);
assert.doesNotMatch(JSON.stringify(directResult), privilegedPublicTerms, "direct result must sanitize proof-authority vocabulary");
assert.doesNotMatch(JSON.stringify(directResult), hostPathTerms, "direct result must sanitize host path echoes");
assert.doesNotMatch(JSON.stringify(directResult), trustedRuntimeRootTerms, "direct result must sanitize trusted runtime roots");
assert.doesNotMatch(JSON.stringify(directResult), secretTerms, "direct result must sanitize secret echoes");
assert.doesNotMatch(
  JSON.stringify(directResult),
  transportOverclaimTerms,
  "direct result must sanitize long-lived transport overclaims"
);
assert.doesNotMatch(
  JSON.stringify(directResult),
  unattendedOverclaimTerms,
  "direct result must sanitize unattended-execution overclaims"
);
assert.equal(directResult.handoff_review.proof_authority, "none", "direct result must force proof authority to none");
assert.equal(directResult.handoff_review.proofAuthority, "none", "camelCase proof authority must also be forced to none");
assert.equal(directResult.handoff_review.can_promote_claim, false, "direct result must not surface promotion overclaims");
assert.equal(directResult.handoff_review.canPromoteClaim, false, "camelCase promotion overclaims must be false");
assert.equal(directResult.handoff_review.can_certify_ga, false, "direct result must not surface GA overclaims");
assert.equal(directResult.handoff_review.canCertifyGa, false, "camelCase GA overclaims must be false");
assert.equal(directResult.handoff_review.operator_approved, false, "direct result must not surface operator approval overclaims");
assert.equal(directResult.handoff_review.operatorApproval, false, "camelCase operator approval overclaims must be false");
assert.equal(directResult.handoff_review.handoff_can_execute, false, "direct result must not surface handoff execution overclaims");
assert.equal(directResult.handoff_review.handoffCanExecute, false, "camelCase handoff execution overclaims must be false");
assert.equal(
  directResult.handoff_review.unattended_execution_authorized,
  false,
  "direct result must not surface unattended execution authorization"
);
assert.equal(
  directResult.handoff_review.unattendedExecutionAuthorized,
  false,
  "camelCase unattended execution authorization must be false"
);
assert.equal(
  directResult.handoff_review.unattended_real_host_execution_completed,
  false,
  "direct result must not surface unattended execution completion"
);
assert.equal(
  directResult.handoff_review.unattendedRealHostExecutionCompleted,
  false,
  "camelCase unattended execution completion must be false"
);
assert.equal(directResult.handoff_review.durable_transport_provided, false);
assert.equal(directResult.handoff_review.durableTransportProvided, false);
assert.equal(directResult.handoff_review.live_transport_open, false);
assert.equal(directResult.handoff_review.liveTransportOpen, false);
assert.equal(directResult.handoff_review.indefinite_stream_open, false);
assert.equal(directResult.handoff_review.indefiniteStreamOpen, false);
assert.equal(directResult.handoff_review.long_lived_websocket_provided, false);
assert.equal(directResult.handoff_review.longLivedWebsocketProvided, false);
assert.equal(directResult.handoff_review.long_lived_sse_provided, false);
assert.equal(directResult.handoff_review.longLivedSseProvided, false);
assert.equal(directResult.handoff_review.pi_direct_write_allowed, false);
assert.equal(directResult.handoff_review.piDirectWriteAllowed, false);
assert.equal(directResult.handoff_review.direct_trusted_state_mutation, false);
assert.equal(directResult.handoff_review.directTrustedStateMutation, false);
assert.equal(directResult.handoff_review.request_echo.proof_authority, "none");
assert.equal(directResult.handoff_review.request_echo.proofAuthority, "none");
assert.equal(directResult.handoff_review.request_echo.can_promote_claim, false);
assert.equal(directResult.handoff_review.request_echo.canPromoteClaim, false);
assert.equal(directResult.handoff_review.request_echo.handoff_can_execute, false);
assert.equal(directResult.handoff_review.request_echo.handoffCanExecute, false);
assert.equal(directResult.handoff_review.prepared_checkpoints[0].can_certify_ga, false);
assert.equal(directResult.handoff_review.prepared_checkpoints[1].direct_trusted_state_mutation, false);

const callsBeforeMissingOrchestrationHash = calls.length;
await assert.rejects(
  () =>
    executeComathTool(client, "comath.release.piCodexLifecycleUnattendedRealHostHandoffReview", {
      project_root: projectRoot,
      project_id: "PRJ-2400",
      actor: "goal3-task240",
      automatic_orchestration_id: "LIFE-AUTOMATIC-REAL-PI-0240",
      automatic_orchestration_path:
        "service-owned-pi-lifecycle/LIFE-AUTOMATIC-REAL-PI-0240/automatic-real-pi-execution.json",
      transport_continuity_id: "LIFE-TRANSPORT-CONTINUITY-0240",
      transport_continuity_path:
        "service-owned-pi-lifecycle/LIFE-TRANSPORT-CONTINUITY-0240/operator-service-transport-continuity.json",
      transport_continuity_sha256: "b".repeat(64),
      confirmation_id: "CONF-TASK240-MISSING-HASH"
    }),
  /automatic_orchestration_sha256 is required/
);
assert.equal(calls.length, callsBeforeMissingOrchestrationHash, "missing direct orchestration hash must not POST");

const interactiveTool = toolDescriptor("comath.release.piCodexLifecycleInteractiveRealPi");
assert.equal(
  interactiveTool.input_schema.properties.completed_steps.items.enum.includes(
    "lifecycle-unattended-real-host-handoff-review"
  ),
  true,
  "interactive real-Pi planner must advertise unattended handoff review after prepared checkpoints"
);
const interactivePlan = await executeComathTool(client, "comath.release.piCodexLifecycleInteractiveRealPi", {
  project_id: "PRJ-2400",
  actor: "goal3-task240",
  pi_host_label: "pi-host-lab-01",
  session_id: "LIFE-OP-SESSION-0240",
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
    "lifecycle-operator-service-transport-continuity"
  ],
  handoff_review_id: "LIFE-HANDOFF-REVIEW-0240",
  automatic_orchestration_id: "LIFE-AUTOMATIC-REAL-PI-0240",
  automatic_orchestration_path:
    "service-owned-pi-lifecycle/LIFE-AUTOMATIC-REAL-PI-0240/automatic-real-pi-execution.json",
  automatic_orchestration_sha256: "a".repeat(64),
  continuity_id: "LIFE-TRANSPORT-CONTINUITY-0240",
  transport_continuity_path:
    "service-owned-pi-lifecycle/LIFE-TRANSPORT-CONTINUITY-0240/operator-service-transport-continuity.json",
  transport_continuity_sha256: "b".repeat(64),
  last_result_summary: "proof_success from D:/research/project with sk-should-not-leak long-lived SSE"
});
assert.equal(calls.length, 1, "interactive planner must remain read-only and must not call comathd");
assert.equal(interactivePlan.next_action.action_id, "lifecycle-unattended-real-host-handoff-review");
assert.match(interactivePlan.next_action.command, /\/cm:release lifecycle-unattended-real-host-handoff-review/);
assert.match(interactivePlan.next_action.command, /--automatic-orchestration-sha256 a{64}/);
assert.match(interactivePlan.next_action.command, /--transport-continuity-sha256 b{64}/);
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
  { client, project_root: projectRoot, actor: "goal3-task240" }
);

assert.equal(
  registeredTools.has("comath.release.piCodexLifecycleUnattendedRealHostHandoffReview"),
  true,
  "Pi runtime must expose unattended handoff review as an executable tool"
);
assert.equal(commands.has("cm:release"), true, "Pi runtime must expose /cm:release for unattended handoff review");

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
    "lifecycle-unattended-real-host-handoff-review",
    "--project-id PRJ-2400",
    "--handoff-review-id LIFE-HANDOFF-REVIEW-0240-CMD",
    "--automatic-orchestration-id LIFE-AUTOMATIC-REAL-PI-0240",
    "--automatic-orchestration-path service-owned-pi-lifecycle/LIFE-AUTOMATIC-REAL-PI-0240/automatic-real-pi-execution.json",
    `--automatic-orchestration-sha256 ${"c".repeat(64)}`,
    "--transport-continuity-id LIFE-TRANSPORT-CONTINUITY-0240",
    "--transport-continuity-path service-owned-pi-lifecycle/LIFE-TRANSPORT-CONTINUITY-0240/operator-service-transport-continuity.json",
    `--transport-continuity-sha256 ${"d".repeat(64)}`
  ].join(" "),
  ctx
);

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, "/release/pi-codex-lifecycle/unattended-real-host-handoff-review");
assert.equal(calls.at(-1).body.confirmation_id, undefined, "runtime command must not forward confirmation ids");
assert.equal(calls.at(-1).body.project_root, projectRoot);
assert.equal(calls.at(-1).body.project_id, "PRJ-2400");
assert.equal(calls.at(-1).body.actor, "goal3-task240");
assert.equal(calls.at(-1).body.handoff_review_id, "LIFE-HANDOFF-REVIEW-0240-CMD");
assert.equal(calls.at(-1).body.automatic_orchestration_id, "LIFE-AUTOMATIC-REAL-PI-0240");
assert.equal(calls.at(-1).body.automatic_orchestration_sha256, "c".repeat(64));
assert.equal(calls.at(-1).body.transport_continuity_id, "LIFE-TRANSPORT-CONTINUITY-0240");
assert.equal(calls.at(-1).body.transport_continuity_sha256, "d".repeat(64));
assert.equal(confirmationPrompts.length, 1, "unattended handoff review command must require Pi host confirmation");
assert.doesNotMatch(confirmationPrompts[0].body, privilegedPublicTerms);
assert.doesNotMatch(confirmationPrompts[0].body, hostPathTerms);
assert.doesNotMatch(confirmationPrompts[0].body, trustedRuntimeRootTerms);
assert.doesNotMatch(confirmationPrompts[0].body, secretTerms);
assert.doesNotMatch(confirmationPrompts[0].body, transportOverclaimTerms);
assert.doesNotMatch(confirmationPrompts[0].body, unattendedOverclaimTerms);
assert.equal(notifications.length, 1, "unattended handoff review command must notify the Pi host");
assert.doesNotMatch(notifications[0].message, privilegedPublicTerms);
assert.doesNotMatch(notifications[0].message, hostPathTerms);
assert.doesNotMatch(notifications[0].message, trustedRuntimeRootTerms);
assert.doesNotMatch(notifications[0].message, secretTerms);
assert.doesNotMatch(notifications[0].message, transportOverclaimTerms);
assert.doesNotMatch(notifications[0].message, unattendedOverclaimTerms);

const callsBeforeMissingCommandHash = calls.length;
await assert.rejects(
  () =>
    commands.get("cm:release")(
      [
        "lifecycle-unattended-real-host-handoff-review",
        "--project-id PRJ-2400",
        "--handoff-review-id LIFE-HANDOFF-REVIEW-0240-CMD-NO-HASH",
        "--automatic-orchestration-id LIFE-AUTOMATIC-REAL-PI-0240",
        "--automatic-orchestration-path service-owned-pi-lifecycle/LIFE-AUTOMATIC-REAL-PI-0240/automatic-real-pi-execution.json",
        "--transport-continuity-id LIFE-TRANSPORT-CONTINUITY-0240",
        "--transport-continuity-path service-owned-pi-lifecycle/LIFE-TRANSPORT-CONTINUITY-0240/operator-service-transport-continuity.json",
        `--transport-continuity-sha256 ${"d".repeat(64)}`
      ].join(" "),
      ctx
    ),
  /automatic_orchestration_sha256 is required/
);
assert.equal(calls.length, callsBeforeMissingCommandHash, "missing command orchestration hash must not POST");

console.log("Goal 3 Task240 Pi unattended real-host handoff review consumer tests passed.");
