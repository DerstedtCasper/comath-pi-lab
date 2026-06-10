import assert from "node:assert/strict";
import registerComathPiRuntime, { createComathTools, executeComathTool, runtime_registration } from "../dist/index.js";

const projectRoot = "D:/research/project";
const toolName = "comath.release.goal3SourceReleaseOsImmutabilityAttestation";
const interactiveToolName = "comath.release.piCodexLifecycleInteractiveRealPi";
const subcommand = "goal3-source-release-os-immutability-attestation";
const route = "/release/goal3/source-release-os-immutability-attestation";
const privilegedPublicTerms =
  /clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence|proof_success|kernel_checked/i;
const hostPathTerms = /D:\\|D:\/|\/home\/pi|\/root\//i;
const trustedRuntimeRootTerms = /\.comath[\\/]|%2ecomath/i;
const secretTerms = /COMATH_CODEX_API_KEY|OPENAI_API_KEY|Authorization:\s*Bearer|api_key|token=|plain-token|sk-/i;
const gaOverclaimTerms =
  /GA certified|GA certification|can certify GA|can_certify_ga\s*[:=]\s*(?:true|1)|canCertifyGa\s*[:=]\s*(?:true|1)|can_promote_claim\s*[:=]\s*(?:true|1)|canPromoteClaim\s*[:=]\s*(?:true|1)/i;
const restoreOverclaimTerms =
  /can restore|can_restore\s*[:=]\s*(?:true|1)|canRestore\s*[:=]\s*(?:true|1)|restorable source|restore source/i;
const callerMaterialTerms =
  /"(?:attestation_artifact|attestationArtifact|os_attestation_response|osAttestationResponse|proof_claim|proofClaim|proof_claim_json|proofClaimJson|lean_replay_manifest|leanReplayManifest|lean_run_manifest|leanRunManifest|final_replay_manifest|finalReplayManifest|ga_certificate|gaCertificate|restore_manifest|restoreManifest)"\s*:/i;

function toolDescriptor(name) {
  const tool = createComathTools().find((descriptor) => descriptor.name === name);
  assert.ok(tool, `${name} must be registered for Goal 3 source-release OS immutability attestation`);
  return tool;
}

function assertPublicNonAuthoritySanitized(value, scope) {
  const serialized = JSON.stringify(value);
  assert.doesNotMatch(serialized, privilegedPublicTerms, `${scope} must sanitize proof authority wording`);
  assert.doesNotMatch(serialized, hostPathTerms, `${scope} must sanitize host paths`);
  assert.doesNotMatch(serialized, trustedRuntimeRootTerms, `${scope} must sanitize trusted runtime roots`);
  assert.doesNotMatch(serialized, secretTerms, `${scope} must sanitize secrets`);
  assert.doesNotMatch(serialized, gaOverclaimTerms, `${scope} must sanitize GA/promotion overclaims`);
  assert.doesNotMatch(serialized, restoreOverclaimTerms, `${scope} must sanitize restore overclaims`);
  assert.doesNotMatch(serialized, callerMaterialTerms, `${scope} must sanitize caller-supplied material`);
}

const attestationTool = toolDescriptor(toolName);
assert.equal(attestationTool.mutates, true, "Task316 Pi consumer writes only through comathd");
assert.deepEqual(attestationTool.input_schema.required, [
  "project_root",
  "project_id",
  "actor",
  "policy_inspection_id",
  "policy_inspection_path",
  "policy_inspection_sha256",
  "provider_id",
  "os_attestation_url",
  "confirmation_id"
]);
for (const forbidden of [
  "attestation_artifact",
  "attestationArtifact",
  "os_attestation_response",
  "osAttestationResponse",
  "proof_claim",
  "lean_replay_manifest",
  "lean_run_manifest",
  "final_replay_manifest",
  "ga_certificate",
  "restore_manifest"
]) {
  assert.equal(
    Object.hasOwn(attestationTool.input_schema.properties, forbidden),
    false,
    `Pi source-release OS attestation consumer must not expose ${forbidden}`
  );
}

const interactiveTool = toolDescriptor(interactiveToolName);
assert.equal(
  interactiveTool.input_schema.properties.completed_steps.items.enum.includes(subcommand),
  true,
  "interactive real-Pi planner must advertise source-release OS attestation after Task315 service gate"
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
      source_release_os_immutability_attestation: {
        schema_version: "comath.goal3_source_release_os_immutability_attestation.v1",
        attestation_id: body.attestation_id,
        project_id: body.project_id,
        actor: body.actor,
        ok: true,
        os_immutability_attestation_status: "os_immutability_attested",
        attestation_path:
          "D:/research/project/.comath/release/goal3-source-release-os-immutability-attestation/GOAL3-OS-ATTEST-0316/os-immutability-attestation.json token=plain-token",
        policy_inspection_id: body.policy_inspection_id,
        policy_inspection_path:
          "D:/research/project/.comath/release/goal3-source-release-external-provider-policy-inspection/GOAL3-POLICY-0316/policy-inspection.json",
        policy_inspection_current: true,
        provider_id: body.provider_id,
        provider_terms_url: body.provider_terms_url,
        os_immutability_attestation_performed: true,
        os_immutability_result: "provider_attested",
        provider_os_immutability_attestation_bound: true,
        co_math_os_immutability_enforced: true,
        proof_authority: "lean_kernel_clean_replay",
        proofAuthority: "lean_kernel_clean_replay",
        can_restore: true,
        canRestore: true,
        can_promote_claim: true,
        canPromoteClaim: true,
        can_certify_ga: true,
        canCertifyGa: true,
        storage_is_proof_authority: true,
        attestation_is_proof_authority: true,
        attestation_is_restore_source: true,
        result_can_be_used_as_proof: true,
        request_echo: {
          confirmation_id: "CONF-SHOULD-NOT-FORWARD",
          proof_claim: { status: "caller-proof" },
          lean_replay_manifest: { proof_authority: "lean_kernel_clean_replay" },
          ga_certificate: { status: "caller-ga" },
          restore_manifest: { can_restore: true },
          attestation_artifact: { path: "D:/unsafe/attestation.json" }
        },
        summary:
          "OS immutability proved proof_success from D:/research/project using Authorization: Bearer plain-token; GA certified; can_restore=true"
      }
    };
  }
};

const directAttestation = await executeComathTool(client, toolName, {
  project_root: projectRoot,
  project_id: "PRJ-3160",
  actor:
    "goal3-task316 OPENAI_API_KEY=plain-token proof_success GA certified can_certify_ga=true can_restore=true",
  attestation_id: "GOAL3-OS-ATTEST-0316",
  policy_inspection_id: "GOAL3-POLICY-0316",
  policy_inspection_path:
    "service-owned-goal3-source-release-external-provider-policy-inspection/GOAL3-POLICY-0316/policy-inspection.json",
  policy_inspection_sha256: "a".repeat(64),
  provider_id: "example-immutable-store",
  os_attestation_url: "https://attestation.example.invalid/goal3/os",
  provider_terms_url: "https://attestation.example.invalid/terms",
  proof_claim: { status: "caller-proof" },
  lean_replay_manifest: { proof_authority: "lean_kernel_clean_replay" },
  lean_run_manifest: { proof_authority: "lean_kernel_clean_replay" },
  final_replay_manifest: { proof_authority: "lean_kernel_clean_replay" },
  ga_certificate: { status: "caller-ga" },
  restore_manifest: { can_restore: true },
  attestation_artifact: { path: "D:/unsafe/attestation.json" },
  confirmation_id: "CONF-TASK316-MUST-NOT-FORWARD"
});

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, route);
assert.equal(calls.at(-1).body.confirmation_id, undefined, "Pi must not forward model-supplied confirmation ids");
assert.equal(calls.at(-1).body.proof_claim, undefined, "Pi must not forward caller proof claims");
assert.equal(calls.at(-1).body.lean_replay_manifest, undefined, "Pi must not forward caller Lean replay material");
assert.equal(calls.at(-1).body.lean_run_manifest, undefined, "Pi must not forward caller Lean run material");
assert.equal(calls.at(-1).body.final_replay_manifest, undefined, "Pi must not forward caller final replay material");
assert.equal(calls.at(-1).body.ga_certificate, undefined, "Pi must not forward caller GA certificates");
assert.equal(calls.at(-1).body.restore_manifest, undefined, "Pi must not forward caller restore manifests");
assert.equal(calls.at(-1).body.attestation_artifact, undefined, "Pi must not forward caller attestation artifacts");
assert.deepEqual(calls.at(-1).body, {
  project_root: projectRoot,
  project_id: "PRJ-3160",
  actor:
    "goal3-task316 [redacted_secret] unverified_formal_status prepared_checkpoint_handoff_only prepared_checkpoint_handoff_only non_restorable_public_evidence",
  attestation_id: "GOAL3-OS-ATTEST-0316",
  policy_inspection_id: "GOAL3-POLICY-0316",
  policy_inspection_path:
    ".comath/release/goal3-source-release-external-provider-policy-inspection/GOAL3-POLICY-0316/policy-inspection.json",
  policy_inspection_sha256: "a".repeat(64),
  provider_id: "example-immutable-store",
  os_attestation_url: "https://attestation.example.invalid/goal3/os",
  provider_terms_url: "https://attestation.example.invalid/terms"
});
const {
  project_root: _serviceRequiredProjectRoot,
  policy_inspection_path: _serviceRequiredPolicyInspectionPath,
  os_attestation_url: _serviceRequiredProviderUrl,
  provider_terms_url: _serviceRequiredTermsUrl,
  ...publicRequestAuditBody
} = calls.at(-1).body;
assertPublicNonAuthoritySanitized(publicRequestAuditBody, "Pi request body");

assertPublicNonAuthoritySanitized(directAttestation, "direct result");
assert.ok(
  directAttestation.source_release_os_immutability_attestation,
  "service-returned OS attestation object must remain visible after sanitization"
);
assert.equal(directAttestation.source_release_os_immutability_attestation.proof_authority, "none");
assert.equal(directAttestation.source_release_os_immutability_attestation.proofAuthority, "none");
assert.equal(directAttestation.source_release_os_immutability_attestation.can_restore, false);
assert.equal(directAttestation.source_release_os_immutability_attestation.canRestore, false);
assert.equal(directAttestation.source_release_os_immutability_attestation.can_promote_claim, false);
assert.equal(directAttestation.source_release_os_immutability_attestation.canPromoteClaim, false);
assert.equal(directAttestation.source_release_os_immutability_attestation.can_certify_ga, false);
assert.equal(directAttestation.source_release_os_immutability_attestation.canCertifyGa, false);
assert.equal(directAttestation.source_release_os_immutability_attestation.storage_is_proof_authority, false);
assert.equal(directAttestation.source_release_os_immutability_attestation.attestation_is_proof_authority, false);
assert.equal(directAttestation.source_release_os_immutability_attestation.attestation_is_restore_source, false);
assert.equal(directAttestation.source_release_os_immutability_attestation.result_can_be_used_as_proof, false);
assert.equal(directAttestation.source_release_os_immutability_attestation.co_math_os_immutability_enforced, false);
assert.equal(
  directAttestation.source_release_os_immutability_attestation.os_immutability_attestation_performed,
  true
);
assert.equal(directAttestation.source_release_os_immutability_attestation.policy_inspection_current, true);
assert.equal(
  directAttestation.source_release_os_immutability_attestation.provider_os_immutability_attestation_bound,
  true
);

await assert.rejects(
  () =>
    executeComathTool(client, toolName, {
      project_root: projectRoot,
      project_id: "PRJ-3160",
      actor: "goal3-task316 wrong policy alias",
      policy_inspection_id: "GOAL3-POLICY-0316",
      policy_inspection_path:
        "service-owned-goal3-source-release-external-provider-policy-inspection/GOAL3-POLICY-OTHER/policy-inspection.json",
      policy_inspection_sha256: "a".repeat(64),
      provider_id: "example-immutable-store",
      os_attestation_url: "https://attestation.example.invalid/goal3/os",
      confirmation_id: "CONF-TASK316-WRONG-ALIAS"
    }),
  /policy_inspection_path.*service-owned-goal3-source-release-external-provider-policy-inspection/i,
  "OS immutability attestation consumer must not translate mismatched policy-inspection aliases"
);
assert.equal(calls.length, 1, "wrong public alias must fail before another service POST");

const attestationPlan = await executeComathTool(client, interactiveToolName, {
  project_id: "PRJ-3160",
  actor: "goal3-task316",
  pi_host_label: "pi-host-lab-01",
  session_id: "LIFE-OP-SESSION-0316",
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
    "goal3-final-ga-audit"
  ],
  attestation_id: "GOAL3-OS-ATTEST-0316",
  policy_inspection_id: "GOAL3-POLICY-0316",
  policy_inspection_path:
    "service-owned-goal3-source-release-external-provider-policy-inspection/GOAL3-POLICY-0316/policy-inspection.json",
  policy_inspection_sha256: "b".repeat(64),
  provider_id: "example-immutable-store",
  os_attestation_url: "https://attestation.example.invalid/goal3/os",
  provider_terms_url: "https://attestation.example.invalid/terms",
  last_result_summary:
    "proof_success from D:/research/project with sk-should-not-leak GA certified can_restore=true"
});
assert.equal(calls.length, 1, "interactive planner must remain read-only and must not call comathd");
assert.equal(attestationPlan.next_action.action_id, subcommand);
assert.match(attestationPlan.next_action.command, /\/cm:release goal3-source-release-os-immutability-attestation/);
assert.match(attestationPlan.next_action.command, /--attestation-id GOAL3-OS-ATTEST-0316/);
assert.match(attestationPlan.next_action.command, /--policy-inspection-id GOAL3-POLICY-0316/);
assert.match(attestationPlan.next_action.command, /--policy-inspection-sha256 b{64}/);
assert.match(attestationPlan.next_action.command, /--provider-id example-immutable-store/);
assert.match(attestationPlan.next_action.command, /--os-attestation-url https:\/\/attestation\.example\.invalid\/goal3\/os/);
assert.doesNotMatch(
  attestationPlan.next_action.command,
  /proof-claim|ga-certificate|lean-replay|restore-manifest|attestation-artifact|D:\//i
);
assert.equal(attestationPlan.next_action.requires_host_confirmation, true);
assert.equal(attestationPlan.next_action.auto_executes, false);
assert.equal(attestationPlan.interactive_policy.pi_tool_readonly, true);
assert.equal(attestationPlan.interactive_policy.writes_comath_state, false);
assert.equal(attestationPlan.interactive_policy.calls_comathd, false);
assertPublicNonAuthoritySanitized(attestationPlan, "interactive planner");

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
  { client, project_root: projectRoot, actor: "goal3-task316" }
);

assert.equal(registeredTools.has(toolName), true, "Pi runtime must expose source-release OS attestation tool");
assert.equal(commands.has("cm:release"), true, "Pi runtime must expose /cm:release for source-release OS attestation");

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
    "--project-id PRJ-3160",
    "--attestation-id GOAL3-OS-ATTEST-0316-CMD",
    "--policy-inspection-id GOAL3-POLICY-0316",
    "--policy-inspection-path service-owned-goal3-source-release-external-provider-policy-inspection/GOAL3-POLICY-0316/policy-inspection.json",
    `--policy-inspection-sha256 ${"c".repeat(64)}`,
    "--provider-id example-immutable-store",
    "--os-attestation-url https://attestation.example.invalid/goal3/os",
    "--provider-terms-url https://attestation.example.invalid/terms",
    "--proof-claim-json '{\"status\":\"caller-proof\"}'",
    "--ga-certificate-json '{\"status\":\"caller-ga\"}'",
    "--restore-manifest-json '{\"can_restore\":true}'",
    "--attestation-artifact-json '{\"path\":\"D:/unsafe/attestation.json\"}'"
  ].join(" "),
  ctx
);

assert.equal(calls.at(-1).method, "POST");
assert.equal(calls.at(-1).path, route);
assert.equal(calls.at(-1).body.confirmation_id, undefined, "runtime command must not forward confirmation ids");
assert.equal(calls.at(-1).body.proof_claim, undefined, "runtime command must not forward proof claims");
assert.equal(calls.at(-1).body.ga_certificate, undefined, "runtime command must not forward caller GA certificates");
assert.equal(calls.at(-1).body.restore_manifest, undefined, "runtime command must not forward restore manifests");
assert.equal(calls.at(-1).body.attestation_artifact, undefined, "runtime command must not forward attestation artifacts");
assert.deepEqual(calls.at(-1).body, {
  project_root: projectRoot,
  project_id: "PRJ-3160",
  actor: "goal3-task316",
  attestation_id: "GOAL3-OS-ATTEST-0316-CMD",
  policy_inspection_id: "GOAL3-POLICY-0316",
  policy_inspection_path:
    ".comath/release/goal3-source-release-external-provider-policy-inspection/GOAL3-POLICY-0316/policy-inspection.json",
  policy_inspection_sha256: "c".repeat(64),
  provider_id: "example-immutable-store",
  os_attestation_url: "https://attestation.example.invalid/goal3/os",
  provider_terms_url: "https://attestation.example.invalid/terms"
});
assert.equal(confirmationPrompts.length, 1, "source-release OS attestation command must require Pi host confirmation");
assertPublicNonAuthoritySanitized(confirmationPrompts[0], "host confirmation prompt");
assert.equal(notifications.length, 1, "source-release OS attestation command must notify the Pi host");
assertPublicNonAuthoritySanitized(notifications[0], "host notification");

console.log("Goal 3 Task316 Pi source-release OS immutability attestation consumer tests passed.");
