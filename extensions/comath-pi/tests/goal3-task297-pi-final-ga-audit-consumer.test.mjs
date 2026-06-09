import assert from "node:assert/strict";
import registerComathPiRuntime, { createComathTools, executeComathTool, runtime_registration } from "../dist/index.js";

const projectRoot = "D:/research/project";
const toolName = "comath.release.goal3FinalGaAudit";
const interactiveToolName = "comath.release.piCodexLifecycleInteractiveRealPi";
const subcommand = "goal3-final-ga-audit";
const route = "/release/goal3/final-ga-audit";
const privilegedPublicTerms =
  /clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence|proof_success|kernel_checked/i;
const hostPathTerms = /D:\\|D:\/|\/home\/pi|\/root\//i;
const trustedRuntimeRootTerms = /\.comath[\\/]|%2ecomath/i;
const secretTerms = /COMATH_CODEX_API_KEY|OPENAI_API_KEY|Authorization:\s*Bearer|api_key|token=|plain-token|sk-/i;
const transportOverclaimTerms =
  /long[- ]lived\s+(?:websocket|sse)|indefinite\s+sse|durable transport provided|live transport open/i;
const gaOverclaimTerms =
  /GA certified|GA certification|can certify GA|can_certify_ga\s*[:=]\s*(?:true|1)|canCertifyGa\s*[:=]\s*(?:true|1)|ga_certificate_available\s*[:=]\s*(?:true|1)|final_ga_audit_passed\s*[:=]\s*(?:true|1)/i;
const callerMaterialTerms =
  /"(?:executor_command|execution_attempt_command|attempt_result|execution_attempt_result|acceptance_report_json|acceptanceReportJson|proof_breadth_matrix|proofBreadthMatrix|proof_breadth_matrix_json|proofBreadthMatrixJson|final_ga_audit_json|finalGaAuditJson|lean_replay_manifest|leanReplayManifest|lean_replay_manifest_json|leanReplayManifestJson|lean_run_manifest|leanRunManifest|final_replay_manifest|finalReplayManifest|proof_claim|proofClaim|proof_claim_json|proofClaimJson|ga_certificate|gaCertificate|ga_certificate_json|gaCertificateJson|durable_transport_session|durableTransportSession)"\s*:/i;

function toolDescriptor(name) {
  const tool = createComathTools().find((descriptor) => descriptor.name === name);
  assert.ok(tool, `${name} must be registered for Goal 3 final GA audit`);
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

const finalAuditTool = toolDescriptor(toolName);
assert.equal(finalAuditTool.mutates, true, "Goal 3 final GA audit consumer writes service-owned evidence");
assert.deepEqual(finalAuditTool.input_schema.required, [
  "project_root",
  "project_id",
  "actor",
  "ga_certification_review_id",
  "ga_certification_review_path",
  "ga_certification_review_sha256",
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
    Object.hasOwn(finalAuditTool.input_schema.properties, forbidden),
    false,
    `Pi final GA audit consumer must not expose ${forbidden}`
  );
}
assert.deepEqual(finalAuditTool.input_schema.properties.requested_audit_mode.enum, [
  "open_formal_workbench_final_ga_audit"
]);

const interactiveTool = toolDescriptor(interactiveToolName);
assert.equal(
  interactiveTool.input_schema.properties.completed_steps.items.enum.includes(subcommand),
  true,
  "interactive real-Pi planner must advertise final GA audit after GA certification review"
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
      final_ga_audit: {
        schema_version: "comath.goal3_final_ga_audit.v1",
        final_ga_audit_id: body.final_ga_audit_id,
        project_id: body.project_id,
        actor: body.actor,
        ok: false,
        final_ga_audit_status: "blocked_release_candidate_proof_breadth_incomplete",
        final_ga_audit_available: true,
        final_ga_audit_passed: true,
        ga_certificate_available: true,
        final_ga_audit_path:
          "D:/research/project/.comath/release/goal3-final-ga-audit/GOAL3-FINAL-GA-AUDIT-0297/audit.json token=plain-token",
        requested_audit_mode: "open_formal_workbench_final_ga_audit",
        blocker_reasons: ["positive_matrix_release_candidate_proof_breadth_incomplete"],
        ga_certification_review_id: body.ga_certification_review_id,
        ga_certification_review_path:
          "D:/research/project/.comath/release/goal3-ga-certification/GOAL3-GA-CERTIFICATION-REVIEW-0297/review.json",
        ga_certification_review_current: true,
        operational_readiness_review_current: true,
        acceptance_report_current: true,
        proof_authority: "lean_kernel_clean_replay",
        proofAuthority: "lean_kernel_clean_replay",
        can_promote_claim: true,
        canPromoteClaim: true,
        can_certify_ga: true,
        canCertifyGa: true,
        durable_transport_provided: true,
        live_transport_open: true,
        direct_trusted_state_mutation: true,
        request_echo: {
          confirmation_id: "CONF-SHOULD-NOT-FORWARD",
          executor_command: { program: "D:/unsafe/executor.exe" },
          acceptance_report_json: { can_promote_claim: true },
          proof_breadth_matrix: { can_certify_ga: true },
          final_ga_audit_json: { status: "caller-supplied-audit-json" },
          lean_replay_manifest: { proof_authority: "lean_kernel_clean_replay" },
          lean_run_manifest: { proof_authority: "lean_kernel_clean_replay" },
          final_replay_manifest: { proof_authority: "lean_kernel_clean_replay" },
          proof_claim: { status: "caller-supplied-proof" },
          ga_certificate: { status: "caller-supplied-ga" },
          durable_transport_session: { status: "caller-supplied-session" },
          proof_authority: "lean_kernel_clean_replay",
          can_certify_ga: true,
          ga_certificate_available: true,
          final_ga_audit_passed: true
        },
        summary:
          "Final GA audit passed with proof_success from D:/research/project using Authorization: Bearer plain-token; GA certified; live transport open; can certify GA"
      }
    };
  }
};

const directFinalAudit = await executeComathTool(client, toolName, {
  project_root: projectRoot,
  project_id: "PRJ-2970",
  actor:
    "goal3-task297 OPENAI_API_KEY=plain-token proof_success durable transport provided GA certified can_certify_ga=true",
  final_ga_audit_id: "GOAL3-FINAL-GA-AUDIT-0297",
  ga_certification_review_id: "GOAL3-GA-CERTIFICATION-REVIEW-0297",
  ga_certification_review_path:
    "service-owned-goal3-ga-certification/GOAL3-GA-CERTIFICATION-REVIEW-0297/review.json",
  ga_certification_review_sha256: "a".repeat(64),
  requested_audit_mode: "open_formal_workbench_final_ga_audit",
  acceptance_report_json: { can_promote_claim: true },
  proof_breadth_matrix: { can_certify_ga: true },
  final_ga_audit: { status: "caller-supplied-audit" },
  final_ga_audit_json: { status: "caller-supplied-audit-json" },
  lean_replay_manifest: { proof_authority: "lean_kernel_clean_replay" },
  lean_run_manifest: { proof_authority: "lean_kernel_clean_replay" },
  final_replay_manifest: { proof_authority: "lean_kernel_clean_replay" },
  executor_command: { program: "D:/unsafe/executor.exe" },
  proof_claim: { status: "caller-supplied-proof" },
  ga_certificate: { status: "caller-supplied-ga" },
  durable_transport_session: { status: "caller-supplied-session" },
  confirmation_id: "CONF-TASK297-MUST-NOT-FORWARD"
});

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, route);
assert.equal(calls.at(-1).body.confirmation_id, undefined, "Pi must not forward model-supplied confirmation ids");
assert.equal(calls.at(-1).body.executor_command, undefined, "Pi must not forward public executor commands");
assert.equal(calls.at(-1).body.acceptance_report_json, undefined, "Pi must not forward caller acceptance reports");
assert.equal(calls.at(-1).body.proof_breadth_matrix, undefined, "Pi must not forward caller proof breadth material");
assert.equal(calls.at(-1).body.final_ga_audit, undefined, "Pi must not forward caller final GA audit material");
assert.equal(calls.at(-1).body.final_ga_audit_json, undefined, "Pi must not forward caller final GA audit material");
assert.equal(calls.at(-1).body.lean_replay_manifest, undefined, "Pi must not forward caller Lean replay material");
assert.equal(calls.at(-1).body.lean_run_manifest, undefined, "Pi must not forward caller Lean run material");
assert.equal(calls.at(-1).body.final_replay_manifest, undefined, "Pi must not forward caller final replay material");
assert.equal(calls.at(-1).body.proof_claim, undefined, "Pi must not forward caller proof claims");
assert.equal(calls.at(-1).body.ga_certificate, undefined, "Pi must not forward caller GA certificates");
assert.equal(calls.at(-1).body.durable_transport_session, undefined, "Pi must not forward caller transport sessions");
assert.deepEqual(calls.at(-1).body, {
  project_root: projectRoot,
  project_id: "PRJ-2970",
  actor:
    "goal3-task297 [redacted_secret] unverified_formal_status bounded_transport_checkpoint_only prepared_checkpoint_handoff_only prepared_checkpoint_handoff_only",
  final_ga_audit_id: "GOAL3-FINAL-GA-AUDIT-0297",
  ga_certification_review_id: "GOAL3-GA-CERTIFICATION-REVIEW-0297",
  ga_certification_review_path:
    ".comath/release/goal3-ga-certification/GOAL3-GA-CERTIFICATION-REVIEW-0297/review.json",
  ga_certification_review_sha256: "a".repeat(64),
  requested_audit_mode: "open_formal_workbench_final_ga_audit"
});
const {
  project_root: _serviceRequiredProjectRoot,
  ga_certification_review_path: _serviceRequiredCertificationPath,
  ...publicRequestAuditBody
} = calls.at(-1).body;
assertPublicNonAuthoritySanitized(publicRequestAuditBody, "Pi request body");

assertPublicNonAuthoritySanitized(directFinalAudit, "direct result");
assert.ok(directFinalAudit.final_ga_audit, "service-returned final GA audit object must remain visible after sanitization");
assert.equal(directFinalAudit.final_ga_audit.proof_authority, "none");
assert.equal(directFinalAudit.final_ga_audit.proofAuthority, "none");
assert.equal(directFinalAudit.final_ga_audit.can_promote_claim, false);
assert.equal(directFinalAudit.final_ga_audit.canPromoteClaim, false);
assert.equal(directFinalAudit.final_ga_audit.can_certify_ga, false);
assert.equal(directFinalAudit.final_ga_audit.canCertifyGa, false);
assert.equal(directFinalAudit.final_ga_audit.final_ga_audit_available, true);
assert.equal(directFinalAudit.final_ga_audit.final_ga_audit_passed, false);
assert.equal(directFinalAudit.final_ga_audit.ga_certificate_available, false);
assert.equal(directFinalAudit.final_ga_audit.ga_certification_review_current, true);
assert.equal(directFinalAudit.final_ga_audit.operational_readiness_review_current, true);
assert.equal(directFinalAudit.final_ga_audit.acceptance_report_current, true);
assert.equal(directFinalAudit.final_ga_audit.final_ga_audit_status, "blocked_release_candidate_proof_breadth_incomplete");

await assert.rejects(
  () =>
    executeComathTool(client, toolName, {
      project_root: projectRoot,
      project_id: "PRJ-2970",
      actor: "goal3-task297 wrong certification alias",
      ga_certification_review_id: "GOAL3-GA-CERTIFICATION-REVIEW-0297",
      ga_certification_review_path:
        "service-owned-goal3-ga-certification/GOAL3-GA-CERTIFICATION-REVIEW-OTHER/review.json",
      ga_certification_review_sha256: "a".repeat(64),
      confirmation_id: "CONF-TASK297-WRONG-ALIAS"
    }),
  /ga_certification_review_path.*service-owned-goal3-ga-certification/i,
  "final GA audit consumer must not translate mismatched certification-review aliases"
);
assert.equal(calls.length, 1, "wrong public alias must fail before another service POST");

const finalAuditPlan = await executeComathTool(client, interactiveToolName, {
  project_id: "PRJ-2970",
  actor: "goal3-task297",
  pi_host_label: "pi-host-lab-01",
  session_id: "LIFE-OP-SESSION-0297",
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
    "goal3-ga-certification-review"
  ],
  final_ga_audit_id: "GOAL3-FINAL-GA-AUDIT-0297",
  ga_certification_review_id: "GOAL3-GA-CERTIFICATION-REVIEW-0297",
  ga_certification_review_path:
    "service-owned-goal3-ga-certification/GOAL3-GA-CERTIFICATION-REVIEW-0297/review.json",
  ga_certification_review_sha256: "b".repeat(64),
  last_result_summary: "proof_success from D:/research/project with sk-should-not-leak GA certified long-lived SSE"
});
assert.equal(calls.length, 1, "interactive planner must remain read-only and must not call comathd");
assert.equal(finalAuditPlan.next_action.action_id, subcommand);
assert.match(finalAuditPlan.next_action.command, /\/cm:release goal3-final-ga-audit/);
assert.match(finalAuditPlan.next_action.command, /--final-ga-audit-id GOAL3-FINAL-GA-AUDIT-0297/);
assert.match(
  finalAuditPlan.next_action.command,
  /--ga-certification-review-id GOAL3-GA-CERTIFICATION-REVIEW-0297/
);
assert.match(finalAuditPlan.next_action.command, /--ga-certification-review-sha256 b{64}/);
assert.doesNotMatch(
  finalAuditPlan.next_action.command,
  /executor-command|attempt-result|ga-certificate|proof-claim|acceptance-report|proof-breadth|final-ga-audit-json|D:\//i
);
assert.equal(finalAuditPlan.next_action.requires_host_confirmation, true);
assert.equal(finalAuditPlan.next_action.auto_executes, false);
assert.equal(finalAuditPlan.interactive_policy.pi_tool_readonly, true);
assert.equal(finalAuditPlan.interactive_policy.writes_comath_state, false);
assert.equal(finalAuditPlan.interactive_policy.calls_comathd, false);
assertPublicNonAuthoritySanitized(finalAuditPlan, "interactive planner");

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
  { client, project_root: projectRoot, actor: "goal3-task297" }
);

assert.equal(registeredTools.has(toolName), true, "Pi runtime must expose Goal 3 final GA audit tool");
assert.equal(commands.has("cm:release"), true, "Pi runtime must expose /cm:release for final GA audit");

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
    "--project-id PRJ-2970",
    "--final-ga-audit-id GOAL3-FINAL-GA-AUDIT-0297-CMD",
    "--ga-certification-review-id GOAL3-GA-CERTIFICATION-REVIEW-0297",
    "--ga-certification-review-path service-owned-goal3-ga-certification/GOAL3-GA-CERTIFICATION-REVIEW-0297/review.json",
    `--ga-certification-review-sha256 ${"c".repeat(64)}`,
    "--requested-audit-mode open_formal_workbench_final_ga_audit",
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
assert.equal(calls.at(-1).body.final_ga_audit, undefined, "runtime command must not forward caller final GA audits");
assert.deepEqual(calls.at(-1).body, {
  project_root: projectRoot,
  project_id: "PRJ-2970",
  actor: "goal3-task297",
  final_ga_audit_id: "GOAL3-FINAL-GA-AUDIT-0297-CMD",
  ga_certification_review_id: "GOAL3-GA-CERTIFICATION-REVIEW-0297",
  ga_certification_review_path:
    ".comath/release/goal3-ga-certification/GOAL3-GA-CERTIFICATION-REVIEW-0297/review.json",
  ga_certification_review_sha256: "c".repeat(64),
  requested_audit_mode: "open_formal_workbench_final_ga_audit"
});
assert.equal(confirmationPrompts.length, 1, "final GA audit command must require Pi host confirmation");
assertPublicNonAuthoritySanitized(confirmationPrompts[0], "host confirmation prompt");
assert.equal(notifications.length, 1, "final GA audit command must notify the Pi host");
assertPublicNonAuthoritySanitized(notifications[0], "host notification");

console.log("Goal 3 Task297 Pi final GA audit consumer tests passed.");
