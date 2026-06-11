import assert from "node:assert/strict";
import registerComathPiRuntime, { createComathTools, executeComathTool, runtime_registration } from "../dist/index.js";

const projectRoot = "D:/research/project";
const toolName = "comath.release.goal3ProofBreadthClosure";
const interactiveToolName = "comath.release.piCodexLifecycleInteractiveRealPi";
const subcommand = "goal3-proof-breadth-closure";
const route = "/release/goal3/proof-breadth-closure";
const privilegedPublicTerms =
  /completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence|proof_success|kernel_checked/i;
const hostPathTerms = /D:\\|D:\/|\/home\/pi|\/root\//i;
const trustedRuntimeRootTerms = /\.comath[\\/]|%2ecomath/i;
const secretTerms = /COMATH_CODEX_API_KEY|OPENAI_API_KEY|Authorization:\s*Bearer|api_key|token=|plain-token|sk-/i;
const gaOverclaimTerms =
  /GA certified|GA certification|can certify GA|can_certify_ga\s*[:=]\s*(?:true|1)|canCertifyGa\s*[:=]\s*(?:true|1)|can_promote_claim\s*[:=]\s*(?:true|1)|canPromoteClaim\s*[:=]\s*(?:true|1)|final_ga_audit_passed\s*[:=]\s*(?:true|1)|finalGaAuditPassed\s*[:=]\s*(?:true|1)|ga_certificate_available\s*[:=]\s*(?:true|1)|gaCertificateAvailable\s*[:=]\s*(?:true|1)/i;
const transportOverclaimTerms =
  /long[- ]lived\s+(?:websocket|sse)|indefinite\s+sse|durable transport provided|live transport open/i;
const callerMaterialTerms =
  /"(?:executor_command|execution_attempt_command|attempt_result|execution_attempt_result|acceptance_report_json|acceptanceReportJson|proof_breadth_matrix|proofBreadthMatrix|proof_breadth_matrix_json|proofBreadthMatrixJson|proof_breadth_closure_json|proofBreadthClosureJson|proof_breadth_execution_bridge_json|proofBreadthExecutionBridgeJson|final_ga_audit_json|finalGaAuditJson|lean_replay_manifest|leanReplayManifest|lean_replay_manifest_json|leanReplayManifestJson|lean_run_manifest|leanRunManifest|final_replay_manifest|finalReplayManifest|proof_claim|proofClaim|proof_claim_json|proofClaimJson|ga_certificate|gaCertificate|ga_certificate_json|gaCertificateJson|durable_transport_session|durableTransportSession)"\s*:/i;

function toolDescriptor(name) {
  const tool = createComathTools().find((descriptor) => descriptor.name === name);
  assert.ok(tool, `${name} must be registered for Goal 3 proof-breadth closure`);
  return tool;
}

function assertPublicSanitized(value, scope) {
  const serialized = JSON.stringify(value);
  assert.doesNotMatch(serialized, privilegedPublicTerms, `${scope} must sanitize proof authority wording`);
  assert.doesNotMatch(serialized, hostPathTerms, `${scope} must sanitize host paths`);
  assert.doesNotMatch(serialized, trustedRuntimeRootTerms, `${scope} must sanitize trusted runtime roots`);
  assert.doesNotMatch(serialized, secretTerms, `${scope} must sanitize secrets`);
  assert.doesNotMatch(serialized, gaOverclaimTerms, `${scope} must sanitize GA overclaims`);
  assert.doesNotMatch(serialized, transportOverclaimTerms, `${scope} must sanitize transport overclaims`);
  assert.doesNotMatch(serialized, callerMaterialTerms, `${scope} must sanitize caller-supplied material`);
}

const closureTool = toolDescriptor(toolName);
assert.equal(closureTool.mutates, true, "Task329 Pi consumer writes only through comathd");
assert.deepEqual(closureTool.input_schema.required, [
  "project_root",
  "project_id",
  "actor",
  "proof_breadth_closure_id",
  "confirmation_id"
]);
for (const forbidden of [
  "acceptance_report_json",
  "proof_breadth_matrix",
  "proof_breadth_matrix_json",
  "proof_breadth_closure_json",
  "proof_breadth_execution_bridge_json",
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
    Object.hasOwn(closureTool.input_schema.properties, forbidden),
    false,
    `Pi proof-breadth closure consumer must not expose ${forbidden}`
  );
}
assert.deepEqual(closureTool.input_schema.properties.requested_closure_mode.enum, [
  "open_formal_workbench_release_candidate_proof_breadth_closure"
]);

const interactiveTool = toolDescriptor(interactiveToolName);
assert.equal(
  interactiveTool.input_schema.properties.completed_steps.items.enum.includes(subcommand),
  true,
  "interactive real-Pi planner must advertise the Task329 proof-breadth closure checkpoint"
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
      proof_breadth_closure: {
        schema_version: "comath.goal3_release_candidate_proof_breadth_closure.v1",
        proof_breadth_closure_id: body.proof_breadth_closure_id,
        project_id: body.project_id,
        actor: body.actor,
        ok: true,
        proof_breadth_status: "complete_release_candidate_proof_breadth",
        proof_breadth_closure_path:
          "D:/research/project/.comath/release/goal3-proof-breadth-closure/GOAL3-PROOF-BREADTH-CLOSURE-0329/closure.json token=plain-token",
        requested_closure_mode: "open_formal_workbench_release_candidate_proof_breadth_closure",
        blocker_reasons: [],
        total_required_tasks: 100,
        task_manifest_count: 100,
        verified_task_count: 100,
        missing_task_count: 0,
        blocked_task_count: 0,
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
        ga_certificate_available: true,
        gaCertificateAvailable: true,
        ga_certification_gate_separate: true,
        proof_breadth_closure_artifact: {
          kind: "goal3_release_candidate_proof_breadth_closure",
          path:
            "D:/research/project/.comath/release/goal3-proof-breadth-closure/GOAL3-PROOF-BREADTH-CLOSURE-0329/closure.json",
          sha256: "d".repeat(64)
        },
        packaging_report_artifacts: [
          {
            kind: "final_authority_packaging_report_v3",
            path:
              "D:/research/project/.comath/release/positive_matrix/PM-001/final_authority_packaging_report_v3.json",
            sha256: "e".repeat(64)
          }
        ],
        request_echo: {
          confirmation_id: "CONF-SHOULD-NOT-FORWARD",
          proof_breadth_matrix: { proof_breadth_complete: true },
          proof_breadth_closure_json: { can_certify_ga: true },
          proof_breadth_execution_bridge_json: { executes_proofs: true },
          lean_replay_manifest: { proof_authority: "lean_kernel_clean_replay" },
          proof_claim: { status: "caller-proof" },
          ga_certificate: { status: "caller-ga" },
          durable_transport_session: { status: "caller-session" }
        },
        summary:
          "Proof breadth complete with proof_success from D:/research/project using Authorization: Bearer plain-token; GA certified; can_certify_ga=true; ga_certificate_available=true"
      }
    };
  }
};

const directClosure = await executeComathTool(client, toolName, {
  project_root: projectRoot,
  project_id: "PRJ-3290",
  actor:
    "goal3-task329 OPENAI_API_KEY=plain-token proof_success durable transport provided GA certified can_certify_ga=true proof_breadth_complete=true",
  proof_breadth_closure_id: "GOAL3-PROOF-BREADTH-CLOSURE-0329",
  requested_closure_mode: "open_formal_workbench_release_candidate_proof_breadth_closure",
  proof_breadth_matrix: { proof_breadth_complete: true },
  proof_breadth_matrix_json: { can_certify_ga: true },
  proof_breadth_closure_json: { can_certify_ga: true },
  proof_breadth_execution_bridge_json: { executes_proofs: true },
  proof_claim: { status: "caller-proof" },
  lean_replay_manifest: { proof_authority: "lean_kernel_clean_replay" },
  lean_run_manifest: { proof_authority: "lean_kernel_clean_replay" },
  final_replay_manifest: { proof_authority: "lean_kernel_clean_replay" },
  ga_certificate: { status: "caller-ga" },
  durable_transport_session: { status: "caller-session" },
  confirmation_id: "CONF-TASK329-MUST-NOT-FORWARD"
});

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, route);
for (const forbidden of [
  "confirmation_id",
  "proof_breadth_matrix",
  "proof_breadth_matrix_json",
  "proof_breadth_closure_json",
  "proof_breadth_execution_bridge_json",
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
  project_id: "PRJ-3290",
  actor:
    "goal3-task329 [redacted_secret] unverified_formal_status bounded_transport_checkpoint_only prepared_checkpoint_handoff_only prepared_checkpoint_handoff_only prepared_checkpoint_handoff_only",
  proof_breadth_closure_id: "GOAL3-PROOF-BREADTH-CLOSURE-0329",
  requested_closure_mode: "open_formal_workbench_release_candidate_proof_breadth_closure"
});
const { project_root: _projectRoot, ...publicRequestBody } = calls.at(-1).body;
assertPublicSanitized(publicRequestBody, "Pi request body");

assertPublicSanitized(directClosure, "direct result");
assert.ok(directClosure.proof_breadth_closure, "service-returned closure object must remain visible after sanitization");
assert.equal(directClosure.proof_breadth_closure.proof_authority, "unverified_formal_status");
assert.equal(directClosure.proof_breadth_closure.proofAuthority, "unverified_formal_status");
assert.equal(directClosure.proof_breadth_closure.can_promote_claim, false);
assert.equal(directClosure.proof_breadth_closure.canPromoteClaim, false);
assert.equal(directClosure.proof_breadth_closure.can_certify_ga, false);
assert.equal(directClosure.proof_breadth_closure.canCertifyGa, false);
assert.equal(directClosure.proof_breadth_closure.ga_certificate_available, false);
assert.equal(directClosure.proof_breadth_closure.gaCertificateAvailable, false);
assert.equal(directClosure.proof_breadth_closure.proof_breadth_complete, true);
assert.equal(directClosure.proof_breadth_closure.proofBreadthComplete, true);
assert.equal(directClosure.proof_breadth_closure.final_ga_audit_unblocked, true);
assert.equal(directClosure.proof_breadth_closure.finalGaAuditUnblocked, true);
assert.equal(directClosure.proof_breadth_closure.verified_task_count, 100);
assert.equal(directClosure.proof_breadth_closure.missing_task_count, 0);
assert.equal(directClosure.proof_breadth_closure.blocked_task_count, 0);
assert.equal(directClosure.proof_breadth_closure.ga_certification_gate_separate, true);

const closurePlan = await executeComathTool(client, interactiveToolName, {
  project_id: "PRJ-3290",
  actor: "goal3-task329",
  pi_host_label: "pi-host-lab-01",
  session_id: "LIFE-OP-SESSION-0329",
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
    "goal3-final-release-candidate-closure-audit",
    "goal3-proof-breadth-review"
  ],
  proof_breadth_closure_id: "GOAL3-PROOF-BREADTH-CLOSURE-0329",
  last_result_summary:
    "proof_success from D:/research/project with sk-should-not-leak GA certified proof_breadth_complete=true"
});
assert.equal(calls.length, 1, "interactive planner must remain read-only and must not call comathd");
assert.equal(closurePlan.next_action.action_id, subcommand);
assert.match(closurePlan.next_action.command, /\/cm:release goal3-proof-breadth-closure/);
assert.match(closurePlan.next_action.command, /--proof-breadth-closure-id GOAL3-PROOF-BREADTH-CLOSURE-0329/);
assert.match(
  closurePlan.next_action.command,
  /--requested-closure-mode open_formal_workbench_release_candidate_proof_breadth_closure/
);
assert.doesNotMatch(
  closurePlan.next_action.command,
  /proof-breadth-matrix|proof-claim|ga-certificate|lean-replay|proof-breadth-execution-bridge|D:\//i
);
assert.equal(closurePlan.next_action.requires_host_confirmation, true);
assert.equal(closurePlan.next_action.auto_executes, false);
assert.equal(closurePlan.interactive_policy.pi_tool_readonly, true);
assert.equal(closurePlan.interactive_policy.writes_comath_state, false);
assert.equal(closurePlan.interactive_policy.calls_comathd, false);
assertPublicSanitized(closurePlan, "interactive planner");

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
  { client, project_root: projectRoot, actor: "goal3-task329" }
);

assert.equal(registeredTools.has(toolName), true, "Pi runtime must expose proof-breadth closure tool");
assert.equal(commands.has("cm:release"), true, "Pi runtime must expose /cm:release for proof-breadth closure");

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
    "--project-id PRJ-3290",
    "--proof-breadth-closure-id GOAL3-PROOF-BREADTH-CLOSURE-0329-CMD",
    "--requested-closure-mode open_formal_workbench_release_candidate_proof_breadth_closure",
    "--proof-breadth-matrix-json '{\"proof_breadth_complete\":true}'",
    "--proof-breadth-closure-json '{\"can_certify_ga\":true}'",
    "--proof-claim-json '{\"status\":\"caller-proof\"}'",
    "--ga-certificate-json '{\"status\":\"caller-ga\"}'",
    "--executor-command-program D:/unsafe/executor.exe"
  ].join(" "),
  ctx
);

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, route);
assert.equal(calls.at(-1).body.confirmation_id, undefined, "runtime command must not forward confirmation ids");
assert.equal(calls.at(-1).body.proof_breadth_matrix, undefined, "runtime command must not forward matrices");
assert.equal(calls.at(-1).body.proof_breadth_matrix_json, undefined, "runtime command must not forward matrix JSON");
assert.equal(calls.at(-1).body.proof_breadth_closure_json, undefined, "runtime command must not forward closure JSON");
assert.equal(calls.at(-1).body.proof_claim, undefined, "runtime command must not forward proof claims");
assert.equal(calls.at(-1).body.ga_certificate, undefined, "runtime command must not forward caller GA certificates");
assert.equal(calls.at(-1).body.executor_command, undefined, "runtime command must not forward executor commands");
assert.deepEqual(calls.at(-1).body, {
  project_root: projectRoot,
  project_id: "PRJ-3290",
  actor: "goal3-task329",
  proof_breadth_closure_id: "GOAL3-PROOF-BREADTH-CLOSURE-0329-CMD",
  requested_closure_mode: "open_formal_workbench_release_candidate_proof_breadth_closure"
});
assert.equal(confirmationPrompts.length, 1, "proof-breadth closure command must require Pi host confirmation");
assertPublicSanitized(confirmationPrompts[0], "host confirmation prompt");
assert.equal(notifications.length, 1, "proof-breadth closure command must notify the Pi host");
assertPublicSanitized(notifications[0], "host notification");

console.log("Goal 3 Task329 Pi proof-breadth closure consumer tests passed.");
