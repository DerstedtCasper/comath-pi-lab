import assert from "node:assert/strict";
import registerComathPiRuntime, { createComathTools, executeComathTool, runtime_registration } from "../dist/index.js";

const projectRoot = "D:/research/project";
const toolName = "comath.release.goal3GaCertificationReview";
const interactiveToolName = "comath.release.piCodexLifecycleInteractiveRealPi";
const subcommand = "goal3-ga-certification-review";
const route = "/release/goal3/ga-certification-review";
const privilegedPublicTerms =
  /clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence|proof_success|kernel_checked/i;
const hostPathTerms = /D:\\|D:\/|\/home\/pi|\/root\//i;
const trustedRuntimeRootTerms = /\.comath[\\/]|%2ecomath/i;
const secretTerms = /COMATH_CODEX_API_KEY|OPENAI_API_KEY|Authorization:\s*Bearer|api_key|token=|plain-token|sk-/i;
const transportOverclaimTerms =
  /long[- ]lived\s+(?:websocket|sse)|indefinite\s+sse|durable transport provided|live transport open/i;
const gaOverclaimTerms = /GA certified|GA certification|can certify GA|can_certify_ga\s*[:=]\s*(?:true|1)|canCertifyGa\s*[:=]\s*(?:true|1)/i;
const callerMaterialTerms =
  /"(?:executor_command|execution_attempt_command|attempt_result|execution_attempt_result|acceptance_report_json|acceptanceReportJson|proof_breadth_matrix|proofBreadthMatrix|proof_breadth_matrix_json|proofBreadthMatrixJson|final_ga_audit|finalGaAudit|final_ga_audit_json|finalGaAuditJson|lean_replay_manifest|leanReplayManifest|lean_replay_manifest_json|leanReplayManifestJson|lean_run_manifest|leanRunManifest|final_replay_manifest|finalReplayManifest|proof_claim|proofClaim|proof_claim_json|proofClaimJson|ga_certificate|gaCertificate|ga_certificate_json|gaCertificateJson|durable_transport_session|durableTransportSession)"\s*:/i;

function toolDescriptor(name) {
  const tool = createComathTools().find((descriptor) => descriptor.name === name);
  assert.ok(tool, `${name} must be registered for Goal 3 GA certification review`);
  return tool;
}

function assertPublicNonAuthoritySanitized(value, scope) {
  const serialized = JSON.stringify(value);
  assert.doesNotMatch(serialized, privilegedPublicTerms, `${scope} must sanitize proof authority wording`);
  assert.doesNotMatch(serialized, hostPathTerms, `${scope} must sanitize host paths`);
  assert.doesNotMatch(serialized, trustedRuntimeRootTerms, `${scope} must sanitize trusted runtime roots`);
  assert.doesNotMatch(serialized, secretTerms, `${scope} must sanitize secrets`);
  assert.doesNotMatch(serialized, transportOverclaimTerms, `${scope} must sanitize transport overclaims`);
  assert.doesNotMatch(serialized, gaOverclaimTerms, `${scope} must sanitize GA overclaims`);
  assert.doesNotMatch(serialized, callerMaterialTerms, `${scope} must sanitize caller-supplied material`);
}

const certificationTool = toolDescriptor(toolName);
assert.equal(certificationTool.mutates, true, "Goal 3 certification review consumer writes service-owned evidence");
assert.deepEqual(certificationTool.input_schema.required, [
  "project_root",
  "project_id",
  "actor",
  "operational_readiness_review_id",
  "operational_readiness_review_path",
  "operational_readiness_review_sha256",
  "confirmation_id"
]);
for (const forbidden of [
  "acceptance_report_json",
  "proof_breadth_matrix",
  "final_ga_audit",
  "executor_command",
  "attempt_result",
  "ga_certificate",
  "proof_claim",
  "lean_replay_manifest",
  "durable_transport_session"
]) {
  assert.equal(
    Object.hasOwn(certificationTool.input_schema.properties, forbidden),
    false,
    `Pi GA certification review consumer must not expose ${forbidden}`
  );
}
assert.deepEqual(certificationTool.input_schema.properties.requested_review_mode.enum, [
  "open_formal_workbench_ga_certification"
]);

const interactiveTool = toolDescriptor(interactiveToolName);
assert.equal(
  interactiveTool.input_schema.properties.completed_steps.items.enum.includes(subcommand),
  true,
  "interactive real-Pi planner must advertise GA certification review after operational readiness review"
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
      ga_certification_review: {
        schema_version: "comath.goal3_ga_certification_review.v1",
        ga_certification_review_id: body.ga_certification_review_id,
        project_id: body.project_id,
        actor: body.actor,
        ok: false,
        ga_certification_status: "blocked_release_candidate_ga_certification_prerequisites",
        ga_certification_review_path:
          "D:/research/project/.comath/release/goal3-ga-certification/GOAL3-GA-CERTIFICATION-REVIEW-0295/review.json token=plain-token",
        requested_review_mode: "open_formal_workbench_ga_certification",
        blocker_reasons: [
          "positive_matrix_release_candidate_proof_breadth_incomplete",
          "final_ga_certification_audit_not_available"
        ],
        operational_readiness_review_id: body.operational_readiness_review_id,
        operational_readiness_review_path:
          "D:/research/project/.comath/release/goal3-ga-operational-readiness/GOAL3-GA-OPERATIONAL-READINESS-0295/review.json",
        operational_readiness_review_current: true,
        acceptance_report_path:
          "D:/research/project/.comath/release/goal3-ga-certification/GOAL3-GA-CERTIFICATION-REVIEW-0295/acceptance-report.json",
        acceptance_report_current: true,
        trust_core_negative_suite_fail_closed: true,
        positive_workflow_representative_verified: true,
        positive_matrix_remaining_blocker_status: "replayable_blocker",
        final_ga_audit_available: false,
        proof_authority: "lean_kernel_clean_replay",
        proofAuthority: "lean_kernel_clean_replay",
        can_promote_claim: true,
        canPromoteClaim: true,
        can_certify_ga: true,
        canCertifyGa: true,
        ga_certification_gate_separate: true,
        request_echo: {
          confirmation_id: "CONF-SHOULD-NOT-FORWARD",
          executor_command: { program: "D:/unsafe/executor.exe" },
          acceptance_report_json: { can_promote_claim: true },
          acceptanceReportJson: { canPromoteClaim: true },
          proof_breadth_matrix: { can_certify_ga: true },
          proof_breadth_matrix_json: { can_certify_ga: true },
          proofBreadthMatrixJson: { canCertifyGa: true },
          final_ga_audit: { status: "caller-supplied-audit" },
          final_ga_audit_json: { status: "caller-supplied-audit-json" },
          finalGaAuditJson: { status: "caller-supplied-audit-json" },
          lean_replay_manifest: { proof_authority: "lean_kernel_clean_replay" },
          leanReplayManifest: { proofAuthority: "lean_kernel_clean_replay" },
          lean_replay_manifest_json: { proof_authority: "lean_kernel_clean_replay" },
          lean_run_manifest: { proof_authority: "lean_kernel_clean_replay" },
          final_replay_manifest: { proof_authority: "lean_kernel_clean_replay" },
          proof_claim: { status: "caller-supplied-proof" },
          proof_claim_json: { status: "caller-supplied-proof-json" },
          proofClaimJson: { status: "caller-supplied-proof-json" },
          ga_certificate: { status: "caller-supplied-ga" },
          ga_certificate_json: { status: "caller-supplied-ga-json" },
          gaCertificateJson: { status: "caller-supplied-ga-json" },
          durable_transport_session: { status: "caller-supplied-session" },
          durable_transport_session_json: { status: "caller-supplied-session-json" },
          proof_authority: "lean_kernel_clean_replay",
          can_certify_ga: true
        },
        summary:
          "GA certification completed after proof_success from D:/research/project with Authorization: Bearer plain-token and durable transport provided; live transport open; can certify GA"
      }
    };
  }
};

const directCertification = await executeComathTool(client, toolName, {
  project_root: projectRoot,
  project_id: "PRJ-2950",
  actor:
    "goal3-task295 OPENAI_API_KEY=plain-token proof_success durable transport provided GA certified can_certify_ga=true",
  ga_certification_review_id: "GOAL3-GA-CERTIFICATION-REVIEW-0295",
  operational_readiness_review_id: "GOAL3-GA-OPERATIONAL-READINESS-0295",
  operational_readiness_review_path:
    "service-owned-goal3-ga-operational-readiness/GOAL3-GA-OPERATIONAL-READINESS-0295/review.json",
  operational_readiness_review_sha256: "a".repeat(64),
  requested_review_mode: "open_formal_workbench_ga_certification",
  acceptance_report_json: { can_promote_claim: true },
  acceptanceReportJson: { canPromoteClaim: true },
  proof_breadth_matrix: { can_certify_ga: true },
  proof_breadth_matrix_json: { can_certify_ga: true },
  final_ga_audit: { status: "caller-supplied-audit" },
  final_ga_audit_json: { status: "caller-supplied-audit-json" },
  lean_replay_manifest: { proof_authority: "lean_kernel_clean_replay" },
  leanReplayManifest: { proofAuthority: "lean_kernel_clean_replay" },
  lean_run_manifest: { proof_authority: "lean_kernel_clean_replay" },
  final_replay_manifest: { proof_authority: "lean_kernel_clean_replay" },
  executor_command: { program: "D:/unsafe/executor.exe" },
  proof_claim: { status: "caller-supplied-proof" },
  proof_claim_json: { status: "caller-supplied-proof-json" },
  ga_certificate: { status: "caller-supplied-ga" },
  ga_certificate_json: { status: "caller-supplied-ga-json" },
  durable_transport_session: { status: "caller-supplied-session" },
  durable_transport_session_json: { status: "caller-supplied-session-json" },
  confirmation_id: "CONF-TASK295-MUST-NOT-FORWARD"
});

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, route);
assert.equal(calls.at(-1).body.confirmation_id, undefined, "Pi must not forward model-supplied confirmation ids");
assert.equal(calls.at(-1).body.executor_command, undefined, "Pi must not forward public executor commands");
assert.equal(calls.at(-1).body.acceptance_report_json, undefined, "Pi must not forward caller acceptance reports");
assert.equal(calls.at(-1).body.acceptanceReportJson, undefined, "Pi must not forward caller acceptance reports");
assert.equal(calls.at(-1).body.proof_breadth_matrix, undefined, "Pi must not forward caller proof breadth material");
assert.equal(calls.at(-1).body.proof_breadth_matrix_json, undefined, "Pi must not forward caller proof breadth material");
assert.equal(calls.at(-1).body.final_ga_audit, undefined, "Pi must not forward caller final GA audit material");
assert.equal(calls.at(-1).body.final_ga_audit_json, undefined, "Pi must not forward caller final GA audit material");
assert.equal(calls.at(-1).body.lean_replay_manifest, undefined, "Pi must not forward caller Lean replay material");
assert.equal(calls.at(-1).body.leanReplayManifest, undefined, "Pi must not forward caller Lean replay material");
assert.equal(calls.at(-1).body.lean_run_manifest, undefined, "Pi must not forward caller Lean run material");
assert.equal(calls.at(-1).body.final_replay_manifest, undefined, "Pi must not forward caller final replay material");
assert.equal(calls.at(-1).body.proof_claim, undefined, "Pi must not forward caller proof claims");
assert.equal(calls.at(-1).body.proof_claim_json, undefined, "Pi must not forward caller proof claims");
assert.equal(calls.at(-1).body.ga_certificate, undefined, "Pi must not forward caller GA certificates");
assert.equal(calls.at(-1).body.ga_certificate_json, undefined, "Pi must not forward caller GA certificates");
assert.equal(calls.at(-1).body.durable_transport_session, undefined, "Pi must not forward caller transport sessions");
assert.equal(calls.at(-1).body.durable_transport_session_json, undefined, "Pi must not forward caller transport sessions");
assert.deepEqual(calls.at(-1).body, {
  project_root: projectRoot,
  project_id: "PRJ-2950",
  actor:
    "goal3-task295 [redacted_secret] unverified_formal_status bounded_transport_checkpoint_only prepared_checkpoint_handoff_only prepared_checkpoint_handoff_only",
  ga_certification_review_id: "GOAL3-GA-CERTIFICATION-REVIEW-0295",
  operational_readiness_review_id: "GOAL3-GA-OPERATIONAL-READINESS-0295",
  operational_readiness_review_path:
    ".comath/release/goal3-ga-operational-readiness/GOAL3-GA-OPERATIONAL-READINESS-0295/review.json",
  operational_readiness_review_sha256: "a".repeat(64),
  requested_review_mode: "open_formal_workbench_ga_certification"
});
const {
  project_root: _serviceRequiredProjectRoot,
  operational_readiness_review_path: _serviceRequiredReadinessPath,
  ...publicRequestAuditBody
} = calls.at(-1).body;
assertPublicNonAuthoritySanitized(publicRequestAuditBody, "Pi request body");

assertPublicNonAuthoritySanitized(directCertification, "direct result");
assert.equal(directCertification.ga_certification_review.proof_authority, "none");
assert.equal(directCertification.ga_certification_review.proofAuthority, "none");
assert.equal(directCertification.ga_certification_review.can_promote_claim, false);
assert.equal(directCertification.ga_certification_review.canPromoteClaim, false);
assert.equal(directCertification.ga_certification_review.can_certify_ga, false);
assert.equal(directCertification.ga_certification_review.canCertifyGa, false);
assert.equal(directCertification.ga_certification_review.ga_certification_gate_separate, true);
assert.equal(directCertification.ga_certification_review.operational_readiness_review_current, true);
assert.equal(directCertification.ga_certification_review.acceptance_report_current, true);
assert.equal(directCertification.ga_certification_review.trust_core_negative_suite_fail_closed, true);
assert.equal(directCertification.ga_certification_review.positive_workflow_representative_verified, true);
assert.equal(directCertification.ga_certification_review.final_ga_audit_available, false);
assert.equal(directCertification.ga_certification_review.ga_certification_status, "blocked_release_candidate_ga_certification_prerequisites");

await assert.rejects(
  () =>
    executeComathTool(client, toolName, {
      project_root: projectRoot,
      project_id: "PRJ-2950",
      actor: "goal3-task295 wrong readiness alias",
      operational_readiness_review_id: "GOAL3-GA-OPERATIONAL-READINESS-0295",
      operational_readiness_review_path:
        "service-owned-goal3-ga-operational-readiness/GOAL3-GA-OPERATIONAL-READINESS-OTHER/review.json",
      operational_readiness_review_sha256: "a".repeat(64),
      confirmation_id: "CONF-TASK295-WRONG-ALIAS"
    }),
  /operational_readiness_review_path.*service-owned-goal3-ga-operational-readiness/i,
  "GA certification review consumer must not translate mismatched operational-readiness aliases"
);
assert.equal(calls.length, 1, "wrong public alias must fail before another service POST");

const certificationPlan = await executeComathTool(client, interactiveToolName, {
  project_id: "PRJ-2950",
  actor: "goal3-task295",
  pi_host_label: "pi-host-lab-01",
  session_id: "LIFE-OP-SESSION-0295",
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
    "goal3-ga-operational-readiness-review"
  ],
  ga_certification_review_id: "GOAL3-GA-CERTIFICATION-REVIEW-0295",
  operational_readiness_review_id: "GOAL3-GA-OPERATIONAL-READINESS-0295",
  operational_readiness_review_path:
    "service-owned-goal3-ga-operational-readiness/GOAL3-GA-OPERATIONAL-READINESS-0295/review.json",
  operational_readiness_review_sha256: "b".repeat(64),
  last_result_summary: "proof_success from D:/research/project with sk-should-not-leak GA certified long-lived SSE"
});
assert.equal(calls.length, 1, "interactive planner must remain read-only and must not call comathd");
assert.equal(certificationPlan.next_action.action_id, subcommand);
assert.match(certificationPlan.next_action.command, /\/cm:release goal3-ga-certification-review/);
assert.match(
  certificationPlan.next_action.command,
  /--ga-certification-review-id GOAL3-GA-CERTIFICATION-REVIEW-0295/
);
assert.match(
  certificationPlan.next_action.command,
  /--operational-readiness-review-id GOAL3-GA-OPERATIONAL-READINESS-0295/
);
assert.match(certificationPlan.next_action.command, /--operational-readiness-review-sha256 b{64}/);
assert.doesNotMatch(
  certificationPlan.next_action.command,
  /executor-command|attempt-result|ga-certificate|proof-claim|acceptance-report|proof-breadth|final-ga-audit|D:\//i
);
assert.equal(certificationPlan.next_action.requires_host_confirmation, true);
assert.equal(certificationPlan.next_action.auto_executes, false);
assert.equal(certificationPlan.interactive_policy.pi_tool_readonly, true);
assert.equal(certificationPlan.interactive_policy.writes_comath_state, false);
assert.equal(certificationPlan.interactive_policy.calls_comathd, false);
assert.equal(certificationPlan.interactive_policy.executes_lifecycle_actions, false);
assertPublicNonAuthoritySanitized(certificationPlan, "interactive planner");

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
  { client, project_root: projectRoot, actor: "goal3-task295" }
);

assert.equal(registeredTools.has(toolName), true, "Pi runtime must expose Goal 3 GA certification review tool");
assert.equal(commands.has("cm:release"), true, "Pi runtime must expose /cm:release for GA certification review");

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
    "--project-id PRJ-2950",
    "--ga-certification-review-id GOAL3-GA-CERTIFICATION-REVIEW-0295-CMD",
    "--operational-readiness-review-id GOAL3-GA-OPERATIONAL-READINESS-0295",
    "--operational-readiness-review-path service-owned-goal3-ga-operational-readiness/GOAL3-GA-OPERATIONAL-READINESS-0295/review.json",
    `--operational-readiness-review-sha256 ${"c".repeat(64)}`,
    "--requested-review-mode open_formal_workbench_ga_certification",
    "--proof-claim-json '{\"status\":\"caller-proof\"}'",
    "--ga-certificate-json '{\"status\":\"caller-ga\"}'",
    "--acceptance-report-json '{\"can_promote_claim\":true}'",
    "--final-ga-audit-json '{\"can_certify_ga\":true}'",
    "--executor-command-program D:/unsafe/executor.exe"
  ].join(" "),
  ctx
);

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, route);
assert.equal(calls.at(-1).body.confirmation_id, undefined, "runtime command must not forward confirmation ids");
assert.equal(calls.at(-1).body.executor_command, undefined, "runtime command must not forward executor commands");
assert.equal(calls.at(-1).body.proof_claim, undefined, "runtime command must not forward proof claims");
assert.equal(calls.at(-1).body.ga_certificate, undefined, "runtime command must not forward caller GA certificates");
assert.equal(calls.at(-1).body.acceptance_report_json, undefined, "runtime command must not forward acceptance reports");
assert.equal(calls.at(-1).body.final_ga_audit, undefined, "runtime command must not forward final GA audits");
assert.deepEqual(calls.at(-1).body, {
  project_root: projectRoot,
  project_id: "PRJ-2950",
  actor: "goal3-task295",
  ga_certification_review_id: "GOAL3-GA-CERTIFICATION-REVIEW-0295-CMD",
  operational_readiness_review_id: "GOAL3-GA-OPERATIONAL-READINESS-0295",
  operational_readiness_review_path:
    ".comath/release/goal3-ga-operational-readiness/GOAL3-GA-OPERATIONAL-READINESS-0295/review.json",
  operational_readiness_review_sha256: "c".repeat(64),
  requested_review_mode: "open_formal_workbench_ga_certification"
});
assert.equal(confirmationPrompts.length, 1, "GA certification review command must require Pi host confirmation");
assertPublicNonAuthoritySanitized(confirmationPrompts[0], "host confirmation prompt");
assert.equal(notifications.length, 1, "GA certification review command must notify the Pi host");
assertPublicNonAuthoritySanitized(notifications[0], "host notification");

console.log("Goal 3 Task295 Pi GA certification review consumer tests passed.");
