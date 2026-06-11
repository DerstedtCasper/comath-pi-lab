import assert from "node:assert/strict";
import registerComathPiRuntime, { createComathTools, executeComathTool, runtime_registration } from "../dist/index.js";

const projectRoot = "D:/research/project";
const toolName = "comath.release.goal3ProofBreadthReview";
const interactiveToolName = "comath.release.piCodexLifecycleInteractiveRealPi";
const subcommand = "goal3-proof-breadth-review";
const route = "/release/goal3/proof-breadth-review";
const privilegedPublicTerms =
  /completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence|proof_success|kernel_checked/i;
const hostPathTerms = /D:\\|D:\/|\/home\/pi|\/root\//i;
const trustedRuntimeRootTerms = /\.comath[\\/]|%2ecomath/i;
const secretTerms = /COMATH_CODEX_API_KEY|OPENAI_API_KEY|Authorization:\s*Bearer|api_key|token=|plain-token|sk-/i;
const gaOverclaimTerms =
  /GA certified|GA certification|can certify GA|can_certify_ga\s*[:=]\s*(?:true|1)|canCertifyGa\s*[:=]\s*(?:true|1)|can_promote_claim\s*[:=]\s*(?:true|1)|canPromoteClaim\s*[:=]\s*(?:true|1)|final_ga_audit_unblocked\s*[:=]\s*(?:true|1)|finalGaAuditUnblocked\s*[:=]\s*(?:true|1)|proof_breadth_complete\s*[:=]\s*(?:true|1)|proofBreadthComplete\s*[:=]\s*(?:true|1)/i;
const transportOverclaimTerms =
  /long[- ]lived\s+(?:websocket|sse)|indefinite\s+sse|durable transport provided|live transport open/i;
const callerMaterialTerms =
  /"(?:executor_command|execution_attempt_command|attempt_result|execution_attempt_result|acceptance_report_json|acceptanceReportJson|proof_breadth_matrix|proofBreadthMatrix|proof_breadth_matrix_json|proofBreadthMatrixJson|final_ga_audit_json|finalGaAuditJson|lean_replay_manifest|leanReplayManifest|lean_replay_manifest_json|leanReplayManifestJson|lean_run_manifest|leanRunManifest|final_replay_manifest|finalReplayManifest|proof_claim|proofClaim|proof_claim_json|proofClaimJson|ga_certificate|gaCertificate|ga_certificate_json|gaCertificateJson|durable_transport_session|durableTransportSession)"\s*:/i;

function toolDescriptor(name) {
  const tool = createComathTools().find((descriptor) => descriptor.name === name);
  assert.ok(tool, `${name} must be registered for Goal 3 proof-breadth review`);
  return tool;
}

function assertPublicNonAuthoritySanitized(value, scope) {
  const serialized = JSON.stringify(value);
  assert.doesNotMatch(serialized, privilegedPublicTerms, `${scope} must sanitize proof authority wording`);
  assert.doesNotMatch(serialized, hostPathTerms, `${scope} must sanitize host paths`);
  assert.doesNotMatch(serialized, trustedRuntimeRootTerms, `${scope} must sanitize trusted runtime roots`);
  assert.doesNotMatch(serialized, secretTerms, `${scope} must sanitize secrets`);
  assert.doesNotMatch(serialized, gaOverclaimTerms, `${scope} must sanitize GA/proof-breadth overclaims`);
  assert.doesNotMatch(serialized, transportOverclaimTerms, `${scope} must sanitize transport overclaims`);
  assert.doesNotMatch(serialized, callerMaterialTerms, `${scope} must sanitize caller-supplied material`);
}

const proofBreadthReviewTool = toolDescriptor(toolName);
assert.equal(proofBreadthReviewTool.mutates, true, "Task328 Pi consumer writes only through comathd");
assert.deepEqual(proofBreadthReviewTool.input_schema.required, [
  "project_root",
  "project_id",
  "actor",
  "confirmation_id"
]);
for (const forbidden of [
  "acceptance_report_json",
  "proof_breadth_matrix",
  "proof_breadth_matrix_json",
  "final_ga_audit_json",
  "executor_command",
  "attempt_result",
  "ga_certificate",
  "proof_claim",
  "lean_replay_manifest",
  "lean_run_manifest",
  "final_replay_manifest",
  "durable_transport_session"
]) {
  assert.equal(
    Object.hasOwn(proofBreadthReviewTool.input_schema.properties, forbidden),
    false,
    `Pi proof-breadth review consumer must not expose ${forbidden}`
  );
}
assert.deepEqual(proofBreadthReviewTool.input_schema.properties.requested_review_mode.enum, [
  "open_formal_workbench_release_candidate_proof_breadth"
]);

const interactiveTool = toolDescriptor(interactiveToolName);
assert.equal(
  interactiveTool.input_schema.properties.completed_steps.items.enum.includes(subcommand),
  true,
  "interactive real-Pi planner must advertise the Task328 proof-breadth review checkpoint"
);

const releaseCommand = runtime_registration.commands.find((command) => command.command === "/cm:release");
assert.ok(releaseCommand, "/cm:release must be advertised in Pi runtime registration");
assert.equal(releaseCommand.subcommands.includes(subcommand), true);

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
      proof_breadth_review: {
        schema_version: "comath.goal3_release_candidate_proof_breadth_review.v1",
        proof_breadth_review_id: body.proof_breadth_review_id,
        project_id: body.project_id,
        actor: body.actor,
        ok: false,
        proof_breadth_status: "blocked_positive_matrix_release_candidate_proof_breadth_incomplete",
        proof_breadth_review_path:
          "D:/research/project/.comath/release/goal3-proof-breadth/GOAL3-PROOF-BREADTH-REVIEW-0328/review.json token=plain-token",
        requested_review_mode: "open_formal_workbench_release_candidate_proof_breadth",
        blocker_reasons: [
          "positive_matrix_release_candidate_proof_breadth_incomplete",
          "positive_matrix_task_local_clean_replay_missing"
        ],
        total_required_tasks: 100,
        task_manifest_count: 100,
        reviewed_task_count: 100,
        clean_replay_passed_count: 100,
        replayable_blocker_count: 0,
        promoted_count: 100,
        positive_task_manifest_current: true,
        positive_matrix_batch_current: true,
        proof_breadth_complete: true,
        proofBreadthComplete: true,
        final_ga_audit_unblocked: true,
        finalGaAuditUnblocked: true,
        proof_authority: "lean_kernel_clean_replay",
        proofAuthority: "lean_kernel_clean_replay",
        can_promote_claim: true,
        canPromoteClaim: true,
        can_certify_ga: true,
        canCertifyGa: true,
        ga_certification_gate_separate: true,
        request_echo: {
          confirmation_id: "CONF-SHOULD-NOT-FORWARD",
          proof_breadth_matrix: { proof_breadth_complete: true },
          proof_breadth_matrix_json: { can_certify_ga: true },
          lean_replay_manifest: { proof_authority: "lean_kernel_clean_replay" },
          proof_claim: { status: "caller-proof" },
          ga_certificate: { status: "caller-ga" },
          durable_transport_session: { status: "caller-session" }
        },
        summary:
          "Proof breadth completed with proof_success from D:/research/project using Authorization: Bearer plain-token; GA certified; can_certify_ga=true; final_ga_audit_unblocked=true"
      }
    };
  }
};

const directReview = await executeComathTool(client, toolName, {
  project_root: projectRoot,
  project_id: "PRJ-3280",
  actor:
    "goal3-task328 OPENAI_API_KEY=plain-token proof_success durable transport provided GA certified can_certify_ga=true proof_breadth_complete=true",
  proof_breadth_review_id: "GOAL3-PROOF-BREADTH-REVIEW-0328",
  requested_review_mode: "open_formal_workbench_release_candidate_proof_breadth",
  proof_breadth_matrix: { proof_breadth_complete: true },
  proof_breadth_matrix_json: { can_certify_ga: true },
  proof_claim: { status: "caller-proof" },
  lean_replay_manifest: { proof_authority: "lean_kernel_clean_replay" },
  lean_run_manifest: { proof_authority: "lean_kernel_clean_replay" },
  final_replay_manifest: { proof_authority: "lean_kernel_clean_replay" },
  ga_certificate: { status: "caller-ga" },
  durable_transport_session: { status: "caller-session" },
  confirmation_id: "CONF-TASK328-MUST-NOT-FORWARD"
});

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, route);
for (const forbidden of [
  "confirmation_id",
  "proof_breadth_matrix",
  "proof_breadth_matrix_json",
  "proof_claim",
  "lean_replay_manifest",
  "lean_run_manifest",
  "final_replay_manifest",
  "ga_certificate",
  "durable_transport_session"
]) {
  assert.equal(calls.at(-1).body[forbidden], undefined, `Pi must not forward ${forbidden}`);
}
assert.deepEqual(calls.at(-1).body, {
  project_root: projectRoot,
  project_id: "PRJ-3280",
  actor:
    "goal3-task328 [redacted_secret] unverified_formal_status bounded_transport_checkpoint_only prepared_checkpoint_handoff_only prepared_checkpoint_handoff_only prepared_checkpoint_handoff_only",
  proof_breadth_review_id: "GOAL3-PROOF-BREADTH-REVIEW-0328",
  requested_review_mode: "open_formal_workbench_release_candidate_proof_breadth"
});
const { project_root: _projectRoot, ...publicRequestBody } = calls.at(-1).body;
assertPublicNonAuthoritySanitized(publicRequestBody, "Pi request body");

assertPublicNonAuthoritySanitized(directReview, "direct result");
assert.ok(directReview.proof_breadth_review, "service-returned review object must remain visible after sanitization");
assert.equal(directReview.proof_breadth_review.proof_authority, "none");
assert.equal(directReview.proof_breadth_review.proofAuthority, "none");
assert.equal(directReview.proof_breadth_review.can_promote_claim, false);
assert.equal(directReview.proof_breadth_review.canPromoteClaim, false);
assert.equal(directReview.proof_breadth_review.can_certify_ga, false);
assert.equal(directReview.proof_breadth_review.canCertifyGa, false);
assert.equal(directReview.proof_breadth_review.proof_breadth_complete, false);
assert.equal(directReview.proof_breadth_review.proofBreadthComplete, false);
assert.equal(directReview.proof_breadth_review.final_ga_audit_unblocked, false);
assert.equal(directReview.proof_breadth_review.finalGaAuditUnblocked, false);
assert.equal(directReview.proof_breadth_review.clean_replay_passed_count, 0);
assert.equal(directReview.proof_breadth_review.replayable_blocker_count, 100);
assert.equal(directReview.proof_breadth_review.promoted_count, 0);
assert.equal(directReview.proof_breadth_review.positive_task_manifest_current, true);
assert.equal(directReview.proof_breadth_review.positive_matrix_batch_current, true);
assert.equal(directReview.proof_breadth_review.ga_certification_gate_separate, true);

const reviewPlan = await executeComathTool(client, interactiveToolName, {
  project_id: "PRJ-3280",
  actor: "goal3-task328",
  pi_host_label: "pi-host-lab-01",
  session_id: "LIFE-OP-SESSION-0328",
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
    "lifecycle-unattended-real-host-execution-attempt-review",
    "lifecycle-unattended-real-host-completion-certification-prerequisite",
    "lifecycle-unattended-real-host-terminal-completion-certificate-design",
    "lifecycle-unattended-real-host-terminal-completion-certificate",
    "lifecycle-operator-service-transport-closure-review",
    "goal3-ga-operational-readiness-review",
    "goal3-ga-certification-review",
    "goal3-final-ga-audit",
    "goal3-source-release-os-immutability-attestation",
    "goal3-final-release-candidate-closure-audit"
  ],
  proof_breadth_review_id: "GOAL3-PROOF-BREADTH-REVIEW-0328",
  last_result_summary:
    "proof_success from D:/research/project with sk-should-not-leak GA certified proof_breadth_complete=true"
});
assert.equal(calls.length, 1, "interactive planner must remain read-only and must not call comathd");
assert.equal(reviewPlan.next_action.action_id, subcommand);
assert.match(reviewPlan.next_action.command, /\/cm:release goal3-proof-breadth-review/);
assert.match(reviewPlan.next_action.command, /--proof-breadth-review-id GOAL3-PROOF-BREADTH-REVIEW-0328/);
assert.match(reviewPlan.next_action.command, /--requested-review-mode open_formal_workbench_release_candidate_proof_breadth/);
assert.doesNotMatch(
  reviewPlan.next_action.command,
  /proof-breadth-matrix|proof-claim|ga-certificate|lean-replay|final-ga-audit-json|D:\//i
);
assert.equal(reviewPlan.next_action.requires_host_confirmation, true);
assert.equal(reviewPlan.next_action.auto_executes, false);
assert.equal(reviewPlan.interactive_policy.pi_tool_readonly, true);
assert.equal(reviewPlan.interactive_policy.writes_comath_state, false);
assert.equal(reviewPlan.interactive_policy.calls_comathd, false);
assertPublicNonAuthoritySanitized(reviewPlan, "interactive planner");

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
  { client, project_root: projectRoot, actor: "goal3-task328" }
);

assert.equal(registeredTools.has(toolName), true, "Pi runtime must expose proof-breadth review tool");
assert.equal(commands.has("cm:release"), true, "Pi runtime must expose /cm:release for proof-breadth review");

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
    subcommand,
    "--project-id PRJ-3280",
    "--proof-breadth-review-id GOAL3-PROOF-BREADTH-REVIEW-0328-CMD",
    "--requested-review-mode open_formal_workbench_release_candidate_proof_breadth",
    "--proof-breadth-matrix-json '{\"proof_breadth_complete\":true}'",
    "--proof-claim-json '{\"status\":\"caller-proof\"}'",
    "--ga-certificate-json '{\"status\":\"caller-ga\"}'",
    "--executor-command-program D:/unsafe/executor.exe"
  ].join(" "),
  ctx
);

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, route);
assert.equal(calls.at(-1).body.confirmation_id, undefined, "runtime command must not forward confirmation ids");
assert.equal(calls.at(-1).body.proof_breadth_matrix, undefined, "runtime command must not forward proof-breadth matrices");
assert.equal(calls.at(-1).body.proof_breadth_matrix_json, undefined, "runtime command must not forward matrix JSON");
assert.equal(calls.at(-1).body.proof_claim, undefined, "runtime command must not forward proof claims");
assert.equal(calls.at(-1).body.ga_certificate, undefined, "runtime command must not forward caller GA certificates");
assert.equal(calls.at(-1).body.executor_command, undefined, "runtime command must not forward executor commands");
assert.deepEqual(calls.at(-1).body, {
  project_root: projectRoot,
  project_id: "PRJ-3280",
  actor: "goal3-task328",
  proof_breadth_review_id: "GOAL3-PROOF-BREADTH-REVIEW-0328-CMD",
  requested_review_mode: "open_formal_workbench_release_candidate_proof_breadth"
});
assert.equal(confirmationPrompts.length, 1, "proof-breadth review command must require Pi host confirmation");
assertPublicNonAuthoritySanitized(confirmationPrompts[0], "host confirmation prompt");
assert.equal(notifications.length, 1, "proof-breadth review command must notify the Pi host");
assertPublicNonAuthoritySanitized(notifications[0], "host notification");

console.log("Goal 3 Task328 Pi proof-breadth review consumer tests passed.");
