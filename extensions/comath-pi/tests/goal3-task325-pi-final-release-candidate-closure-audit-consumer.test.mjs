import assert from "node:assert/strict";
import registerComathPiRuntime, { createComathTools, executeComathTool, runtime_registration } from "../dist/index.js";

const projectRoot = "D:/research/project";
const toolName = "comath.release.goal3FinalReleaseCandidateClosureAudit";
const interactiveToolName = "comath.release.piCodexLifecycleInteractiveRealPi";
const subcommand = "goal3-final-release-candidate-closure-audit";
const route = "/release/goal3/final-release-candidate-closure-audit";
const privilegedPublicTerms =
  /clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence|proof_success|kernel_checked/i;
const hostPathTerms = /D:\\|D:\/|\/home\/pi|\/root\//i;
const trustedRuntimeRootTerms = /\.comath[\\/]|%2ecomath/i;
const secretTerms = /COMATH_CODEX_API_KEY|OPENAI_API_KEY|Authorization:\s*Bearer|api_key|token=|plain-token|sk-/i;
const gaOverclaimTerms =
  /GA certified|GA certification|can certify GA|can_certify_ga\s*[:=]\s*(?:true|1)|canCertifyGa\s*[:=]\s*(?:true|1)|can_promote_claim\s*[:=]\s*(?:true|1)|canPromoteClaim\s*[:=]\s*(?:true|1)|ga_certificate_issued\s*[:=]\s*(?:true|1)|gaCertificateIssued\s*[:=]\s*(?:true|1)|closure audit is certificate|release_candidate_closure_audit_is_certificate\s*[:=]\s*(?:true|1)|releaseCandidateClosureAuditIsCertificate\s*[:=]\s*(?:true|1)/i;
const transportOverclaimTerms =
  /long[- ]lived\s+(?:websocket|sse)|indefinite\s+sse|durable transport provided|live transport open/i;
const callerMaterialTerms =
  /"(?:executor_command|execution_attempt_command|attempt_result|execution_attempt_result|acceptance_report_json|acceptanceReportJson|proof_breadth_matrix|proofBreadthMatrix|proof_breadth_matrix_json|proofBreadthMatrixJson|final_ga_audit_json|finalGaAuditJson|final_release_candidate_closure_audit_json|finalReleaseCandidateClosureAuditJson|lean_replay_manifest|leanReplayManifest|lean_replay_manifest_json|leanReplayManifestJson|lean_run_manifest|leanRunManifest|final_replay_manifest|finalReplayManifest|proof_claim|proofClaim|proof_claim_json|proofClaimJson|ga_certificate|gaCertificate|ga_certificate_json|gaCertificateJson|durable_transport_session|durableTransportSession)"\s*:/i;

function toolDescriptor(name) {
  const tool = createComathTools().find((descriptor) => descriptor.name === name);
  assert.ok(tool, `${name} must be registered for Goal 3 final release-candidate closure audit`);
  return tool;
}

function assertPublicNonAuthoritySanitized(value, scope) {
  const serialized = JSON.stringify(value);
  assert.doesNotMatch(serialized, privilegedPublicTerms, `${scope} must sanitize proof authority wording`);
  assert.doesNotMatch(serialized, hostPathTerms, `${scope} must sanitize host paths`);
  assert.doesNotMatch(serialized, trustedRuntimeRootTerms, `${scope} must sanitize trusted runtime roots`);
  assert.doesNotMatch(serialized, secretTerms, `${scope} must sanitize secrets`);
  assert.doesNotMatch(serialized, gaOverclaimTerms, `${scope} must sanitize GA/closure-certificate overclaims`);
  assert.doesNotMatch(serialized, transportOverclaimTerms, `${scope} must sanitize transport overclaims`);
  assert.doesNotMatch(serialized, callerMaterialTerms, `${scope} must sanitize caller-supplied material`);
}

const closureAuditTool = toolDescriptor(toolName);
assert.equal(closureAuditTool.mutates, true, "Task325 Pi consumer writes only through comathd");
assert.deepEqual(closureAuditTool.input_schema.required, [
  "project_root",
  "project_id",
  "actor",
  "certification_boundary_review_id",
  "certification_boundary_review_path",
  "certification_boundary_review_sha256",
  "confirmation_id"
]);
for (const forbidden of [
  "acceptance_report_json",
  "proof_breadth_matrix",
  "final_ga_audit_json",
  "final_release_candidate_closure_audit_json",
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
    Object.hasOwn(closureAuditTool.input_schema.properties, forbidden),
    false,
    `Pi final release-candidate closure audit consumer must not expose ${forbidden}`
  );
}
assert.deepEqual(closureAuditTool.input_schema.properties.requested_audit_mode.enum, [
  "open_formal_workbench_final_release_candidate_closure_audit"
]);

const interactiveTool = toolDescriptor(interactiveToolName);
assert.equal(
  interactiveTool.input_schema.properties.completed_steps.items.enum.includes(subcommand),
  true,
  "interactive real-Pi planner must advertise the Task325 closure-audit checkpoint"
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
      final_release_candidate_closure_audit: {
        schema_version: "comath.goal3_final_release_candidate_closure_audit.v1",
        final_release_candidate_closure_audit_id: body.final_release_candidate_closure_audit_id,
        project_id: body.project_id,
        actor: body.actor,
        ok: true,
        final_release_candidate_closure_status: "audited_final_release_candidate_boundary_current",
        final_release_candidate_closure_audit_path:
          "D:/research/project/.comath/release/goal3-final-release-candidate-closure-audit/GOAL3-CLOSURE-0325/audit.json token=plain-token",
        requested_audit_mode: "open_formal_workbench_final_release_candidate_closure_audit",
        certification_boundary_review_id: body.certification_boundary_review_id,
        certification_boundary_review_path:
          "D:/research/project/.comath/release/goal3-final-release-signoff-certification-boundary-review/GOAL3-BOUNDARY-0325/review.json",
        certification_boundary_review_current: true,
        final_release_signoff_current: true,
        ga_certificate_consumption_current: true,
        durable_transport_signoff_verification_current: true,
        external_durable_transport_evidence_current: true,
        source_release_os_immutability_attestation_current: true,
        source_archive_current: true,
        operator_evidence_current: true,
        proof_authority: "lean_kernel_clean_replay",
        proofAuthority: "lean_kernel_clean_replay",
        can_promote_claim: true,
        canPromoteClaim: true,
        can_certify_ga: true,
        canCertifyGa: true,
        release_candidate_closure_audit_is_certificate: true,
        releaseCandidateClosureAuditIsCertificate: true,
        ga_certificate_issued: true,
        gaCertificateIssued: true,
        request_echo: {
          confirmation_id: "CONF-SHOULD-NOT-FORWARD",
          final_release_candidate_closure_audit_json: { can_certify_ga: true },
          lean_replay_manifest: { proof_authority: "lean_kernel_clean_replay" },
          proof_claim: { status: "caller-proof" },
          ga_certificate: { status: "caller-ga" },
          durable_transport_session: { status: "caller-session" }
        },
        summary:
          "Closure audit is certificate with proof_success from D:/research/project using Authorization: Bearer plain-token; GA certified; can_certify_ga=true; ga_certificate_issued=true"
      }
    };
  }
};

const directClosureAudit = await executeComathTool(client, toolName, {
  project_root: projectRoot,
  project_id: "PRJ-3250",
  actor:
    "goal3-task325 OPENAI_API_KEY=plain-token proof_success durable transport provided GA certified can_certify_ga=true ga_certificate_issued=true closure audit is certificate",
  final_release_candidate_closure_audit_id: "GOAL3-CLOSURE-0325",
  certification_boundary_review_id: "GOAL3-BOUNDARY-0325",
  certification_boundary_review_path:
    "service-owned-goal3-final-release-signoff-certification-boundary-review/GOAL3-BOUNDARY-0325/review.json",
  certification_boundary_review_sha256: "a".repeat(64),
  requested_audit_mode: "open_formal_workbench_final_release_candidate_closure_audit",
  final_release_candidate_closure_audit_json: { can_certify_ga: true },
  proof_claim: { status: "caller-proof" },
  lean_replay_manifest: { proof_authority: "lean_kernel_clean_replay" },
  lean_run_manifest: { proof_authority: "lean_kernel_clean_replay" },
  final_replay_manifest: { proof_authority: "lean_kernel_clean_replay" },
  ga_certificate: { status: "caller-ga" },
  durable_transport_session: { status: "caller-session" },
  confirmation_id: "CONF-TASK325-MUST-NOT-FORWARD"
});

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, route);
for (const forbidden of [
  "confirmation_id",
  "final_release_candidate_closure_audit_json",
  "proof_claim",
  "lean_replay_manifest",
  "lean_run_manifest",
  "final_replay_manifest",
  "ga_certificate",
  "durable_transport_session"
]) {
  assert.equal(calls.at(-1).body[forbidden], undefined, `Pi must not forward ${forbidden}`);
}
assert.deepEqual(Object.keys(calls.at(-1).body).sort(), [
  "actor",
  "certification_boundary_review_id",
  "certification_boundary_review_path",
  "certification_boundary_review_sha256",
  "final_release_candidate_closure_audit_id",
  "project_id",
  "project_root",
  "requested_audit_mode"
].sort());
assert.equal(calls.at(-1).body.project_root, projectRoot);
assert.equal(calls.at(-1).body.project_id, "PRJ-3250");
assert.equal(calls.at(-1).body.final_release_candidate_closure_audit_id, "GOAL3-CLOSURE-0325");
assert.equal(calls.at(-1).body.certification_boundary_review_id, "GOAL3-BOUNDARY-0325");
assert.equal(
  calls.at(-1).body.certification_boundary_review_path,
  ".comath/release/goal3-final-release-signoff-certification-boundary-review/GOAL3-BOUNDARY-0325/review.json"
);
assert.equal(calls.at(-1).body.certification_boundary_review_sha256, "a".repeat(64));
assert.equal(
  calls.at(-1).body.requested_audit_mode,
  "open_formal_workbench_final_release_candidate_closure_audit"
);
const { project_root: _projectRoot, certification_boundary_review_path: _servicePath, ...publicRequestBody } =
  calls.at(-1).body;
assertPublicNonAuthoritySanitized(publicRequestBody, "Pi request body");

assertPublicNonAuthoritySanitized(directClosureAudit, "direct result");
assert.ok(
  directClosureAudit.final_release_candidate_closure_audit,
  "service-returned closure audit object must remain visible after sanitization"
);
assert.equal(directClosureAudit.final_release_candidate_closure_audit.proof_authority, "none");
assert.equal(directClosureAudit.final_release_candidate_closure_audit.proofAuthority, "none");
assert.equal(directClosureAudit.final_release_candidate_closure_audit.can_promote_claim, false);
assert.equal(directClosureAudit.final_release_candidate_closure_audit.canPromoteClaim, false);
assert.equal(directClosureAudit.final_release_candidate_closure_audit.can_certify_ga, false);
assert.equal(directClosureAudit.final_release_candidate_closure_audit.canCertifyGa, false);
assert.equal(directClosureAudit.final_release_candidate_closure_audit.release_candidate_closure_audit_is_certificate, false);
assert.equal(directClosureAudit.final_release_candidate_closure_audit.releaseCandidateClosureAuditIsCertificate, false);
assert.equal(directClosureAudit.final_release_candidate_closure_audit.ga_certificate_issued, false);
assert.equal(directClosureAudit.final_release_candidate_closure_audit.gaCertificateIssued, false);
assert.equal(directClosureAudit.final_release_candidate_closure_audit.certification_boundary_review_current, true);
assert.equal(directClosureAudit.final_release_candidate_closure_audit.final_release_signoff_current, true);
assert.equal(directClosureAudit.final_release_candidate_closure_audit.ga_certificate_consumption_current, true);
assert.equal(
  directClosureAudit.final_release_candidate_closure_audit.source_release_os_immutability_attestation_current,
  true
);

await assert.rejects(
  () =>
    executeComathTool(client, toolName, {
      project_root: projectRoot,
      project_id: "PRJ-3250",
      actor: "goal3-task325 wrong boundary alias",
      certification_boundary_review_id: "GOAL3-BOUNDARY-0325",
      certification_boundary_review_path:
        "service-owned-goal3-final-release-signoff-certification-boundary-review/GOAL3-BOUNDARY-OTHER/review.json",
      certification_boundary_review_sha256: "a".repeat(64),
      confirmation_id: "CONF-TASK325-WRONG-ALIAS"
    }),
  /certification_boundary_review_path.*service-owned-goal3-final-release-signoff-certification-boundary-review/i,
  "closure audit consumer must not translate mismatched certification-boundary aliases"
);
assert.equal(calls.length, 1, "wrong public alias must fail before another service POST");

const closurePlan = await executeComathTool(client, interactiveToolName, {
  project_id: "PRJ-3250",
  actor: "goal3-task325",
  pi_host_label: "pi-host-lab-01",
  session_id: "LIFE-OP-SESSION-0325",
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
    "goal3-source-release-os-immutability-attestation"
  ],
  final_release_candidate_closure_audit_id: "GOAL3-CLOSURE-0325",
  certification_boundary_review_id: "GOAL3-BOUNDARY-0325",
  certification_boundary_review_path:
    "service-owned-goal3-final-release-signoff-certification-boundary-review/GOAL3-BOUNDARY-0325/review.json",
  certification_boundary_review_sha256: "b".repeat(64),
  last_result_summary:
    "proof_success from D:/research/project with sk-should-not-leak GA certified ga_certificate_issued=true"
});
assert.equal(calls.length, 1, "interactive planner must remain read-only and must not call comathd");
assert.equal(closurePlan.next_action.action_id, subcommand);
assert.match(closurePlan.next_action.command, /\/cm:release goal3-final-release-candidate-closure-audit/);
assert.match(closurePlan.next_action.command, /--final-release-candidate-closure-audit-id GOAL3-CLOSURE-0325/);
assert.match(closurePlan.next_action.command, /--certification-boundary-review-id GOAL3-BOUNDARY-0325/);
assert.match(closurePlan.next_action.command, /--certification-boundary-review-sha256 b{64}/);
assert.doesNotMatch(
  closurePlan.next_action.command,
  /proof-claim|ga-certificate|lean-replay|final-release-candidate-closure-audit-json|D:\//i
);
assert.equal(closurePlan.next_action.requires_host_confirmation, true);
assert.equal(closurePlan.next_action.auto_executes, false);
assert.equal(closurePlan.interactive_policy.pi_tool_readonly, true);
assert.equal(closurePlan.interactive_policy.writes_comath_state, false);
assert.equal(closurePlan.interactive_policy.calls_comathd, false);
assertPublicNonAuthoritySanitized(closurePlan, "interactive planner");

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
  { client, project_root: projectRoot, actor: "goal3-task325" }
);

assert.equal(registeredTools.has(toolName), true, "Pi runtime must expose final release-candidate closure audit tool");
assert.equal(commands.has("cm:release"), true, "Pi runtime must expose /cm:release for closure audit");

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
    "--project-id PRJ-3250",
    "--final-release-candidate-closure-audit-id GOAL3-CLOSURE-0325-CMD",
    "--certification-boundary-review-id GOAL3-BOUNDARY-0325",
    "--certification-boundary-review-path service-owned-goal3-final-release-signoff-certification-boundary-review/GOAL3-BOUNDARY-0325/review.json",
    `--certification-boundary-review-sha256 ${"c".repeat(64)}`,
    "--requested-audit-mode open_formal_workbench_final_release_candidate_closure_audit",
    "--proof-claim-json '{\"status\":\"caller-proof\"}'",
    "--ga-certificate-json '{\"status\":\"caller-ga\"}'",
    "--final-release-candidate-closure-audit-json '{\"can_certify_ga\":true}'"
  ].join(" "),
  ctx
);

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, route);
assert.equal(calls.at(-1).body.confirmation_id, undefined, "runtime command must not forward confirmation ids");
assert.equal(calls.at(-1).body.proof_claim, undefined, "runtime command must not forward proof claims");
assert.equal(calls.at(-1).body.ga_certificate, undefined, "runtime command must not forward caller GA certificates");
assert.equal(
  calls.at(-1).body.final_release_candidate_closure_audit_json,
  undefined,
  "runtime command must not forward caller closure audit JSON"
);
assert.deepEqual(calls.at(-1).body, {
  project_root: projectRoot,
  project_id: "PRJ-3250",
  actor: "goal3-task325",
  final_release_candidate_closure_audit_id: "GOAL3-CLOSURE-0325-CMD",
  certification_boundary_review_id: "GOAL3-BOUNDARY-0325",
  certification_boundary_review_path:
    ".comath/release/goal3-final-release-signoff-certification-boundary-review/GOAL3-BOUNDARY-0325/review.json",
  certification_boundary_review_sha256: "c".repeat(64),
  requested_audit_mode: "open_formal_workbench_final_release_candidate_closure_audit"
});
assert.equal(confirmationPrompts.length, 1, "closure audit command must require Pi host confirmation");
assertPublicNonAuthoritySanitized(confirmationPrompts[0], "host confirmation prompt");
assert.equal(notifications.length, 1, "closure audit command must notify the Pi host");
assertPublicNonAuthoritySanitized(notifications[0], "host notification");

console.log("Goal 3 Task325 Pi final release-candidate closure audit consumer tests passed.");
