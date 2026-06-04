import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectAgentAdapterOsIsolationProviderHelperExecutionEvidence,
  getComathdStatus,
  initProject,
  prepareAgentAdapterOsIsolationProviderRunner,
  prepareAgentAdapterOsIsolationSandboxLaunch,
  probeAgentAdapterOsIsolationProviderHostCapability,
  reviewAgentAdapterOsIsolationReadiness,
  runAgentAdapterOsIsolationProviderHelperExecution,
  validateAgentAdapterOsIsolationProviderHelperHost
} from "../../dist/index.js";

function readRepoFile(relativePath) {
  const here = dirname(fileURLToPath(import.meta.url));
  const repoRoot = join(here, "../../../..");
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function listRepoDir(relativePath) {
  const here = dirname(fileURLToPath(import.meta.url));
  const repoRoot = join(here, "../../../..");
  return readdirSync(join(repoRoot, relativePath));
}

function sortJson(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sortJson(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortJson(value[key])]));
  }
  return value;
}

function canonicalJson(value) {
  return `${JSON.stringify(sortJson(value))}\n`;
}

function sha256Text(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function createHelperScript(projectRoot) {
  const helperScript = join(projectRoot, "task211-provider-helper.mjs");
  writeFileSync(
    helperScript,
    [
      "const args = process.argv.slice(2);",
      "const valueAfter = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : null; };",
      "const payload = {",
      "  comath_provider_helper_runtime_attestation: true,",
      "  ok: true,",
      "  provider: process.env.COMATH_OS_ISOLATION_PROVIDER,",
      "  network_policy: process.env.COMATH_RUNNER_NETWORK,",
      "  proof_authority: process.env.COMATH_PROOF_AUTHORITY,",
      "  adapter: process.env.COMATH_ADAPTER_ID,",
      "  backend: process.env.COMATH_ADAPTER_BACKEND,",
      "  project_id: process.env.COMATH_PROJECT_ID,",
      "  helper_execution_id: valueAfter('--helper-execution-id'),",
      "  runner_id: process.env.COMATH_PROVIDER_RUNNER_ID,",
      "  launch_id: process.env.COMATH_SANDBOX_LAUNCH_ID",
      "};",
      "console.log(JSON.stringify(payload));"
    ].join("\n"),
    "utf8"
  );
  return helperScript;
}

function liveProbeExecutionSha256(execution) {
  return sha256Text(canonicalJson({
    execution_source: "service_owned_provider_specific_live_os_probe",
    provider: execution.provider,
    execution_id: execution.execution_id,
    collection_id: execution.collection_id,
    helper_execution_id: execution.helper_execution_id,
    runner_id: execution.runner_id,
    launch_id: execution.launch_id,
    provider_family_execution_kind: execution.provider_family_execution_kind,
    provider_family_execution_profile_sha256: execution.provider_family_execution_profile_sha256.toLowerCase(),
    provider_family_execution_argv_sha256: execution.provider_family_execution_argv_sha256.toLowerCase(),
    provider_tool_sha256: execution.provider_tool_sha256.toLowerCase(),
    provider_tool_profile_sha256: execution.provider_tool_profile_sha256.toLowerCase(),
    provider_tool_argv_sha256: execution.provider_tool_argv_sha256.toLowerCase(),
    transcript_sha256: execution.transcript_sha256.toLowerCase(),
    live_probe_tool_sha256: execution.live_probe_tool_sha256.toLowerCase(),
    live_probe_argv_sha256: execution.live_probe_argv_sha256.toLowerCase(),
    live_probe_stdout_sha256: execution.live_probe_stdout_sha256.toLowerCase(),
    live_probe_stderr_sha256: execution.live_probe_stderr_sha256.toLowerCase(),
    live_probe_transcript_sha256: execution.live_probe_transcript_sha256.toLowerCase(),
    collection_source: "service_owned_os_probe",
    process_isolation_enforced: true,
    filesystem_scope_enforced: true,
    network_isolation_enforced: true,
    no_new_privileges: true,
    escape_prevention: true,
    adapter_process_exit_code: 0,
    network_policy: "disabled",
    proof_authority: "none"
  }));
}

function providerControlPlaneExecutionWitnessSha256(witness) {
  return sha256Text(canonicalJson({
    witness_source: "provider_control_plane_execution",
    provider: witness.provider,
    control_plane_kind: witness.control_plane_kind,
    execution_id: witness.execution_id,
    collection_id: witness.collection_id,
    helper_execution_id: witness.helper_execution_id,
    runner_id: witness.runner_id,
    launch_id: witness.launch_id,
    provider_family_execution_kind: witness.provider_family_execution_kind,
    provider_family_execution_profile_sha256: witness.provider_family_execution_profile_sha256.toLowerCase(),
    provider_family_execution_argv_sha256: witness.provider_family_execution_argv_sha256.toLowerCase(),
    provider_tool_sha256: witness.provider_tool_sha256.toLowerCase(),
    provider_tool_profile_sha256: witness.provider_tool_profile_sha256.toLowerCase(),
    provider_tool_argv_sha256: witness.provider_tool_argv_sha256.toLowerCase(),
    transcript_sha256: witness.transcript_sha256.toLowerCase(),
    provider_specific_live_probe_execution_id: witness.provider_specific_live_probe_execution_id,
    provider_specific_live_probe_execution_sha256:
      witness.provider_specific_live_probe_execution_sha256.toLowerCase(),
    provider_specific_live_probe_tool_sha256: witness.provider_specific_live_probe_tool_sha256.toLowerCase(),
    provider_specific_live_probe_argv_sha256: witness.provider_specific_live_probe_argv_sha256.toLowerCase(),
    provider_specific_live_probe_stdout_sha256: witness.provider_specific_live_probe_stdout_sha256.toLowerCase(),
    provider_specific_live_probe_stderr_sha256: witness.provider_specific_live_probe_stderr_sha256.toLowerCase(),
    provider_specific_live_probe_transcript_sha256:
      witness.provider_specific_live_probe_transcript_sha256.toLowerCase(),
    collection_source: "service_owned_os_probe",
    network_policy: "disabled",
    proof_authority: "none"
  }));
}

function providerControlPlaneKind(provider) {
  return {
    oci_container: "oci_container_control_plane_execution",
    nix_sandbox: "nix_sandbox_control_plane_execution",
    firejail: "firejail_control_plane_execution",
    windows_appcontainer: "windows_appcontainer_control_plane_execution",
    macos_sandbox_exec: "macos_sandbox_exec_control_plane_execution"
  }[provider];
}

function completeTask210Collection(input) {
  const expectation = input.provider_tool_execution_witness_expectation;
  assert.equal(typeof expectation?.provider_family_execution_kind, "string");
  const providerToolWitness = {
    witness_source: "provider_specific_executed_tool",
    provider: input.provider,
    execution_id: `${input.collection_id}-TOOL`,
    collection_id: input.collection_id,
    helper_execution_id: input.helper_execution_id,
    runner_id: input.runner_id,
    launch_id: input.launch_id,
    tool_sha256: expectation.tool_sha256,
    profile_sha256: expectation.profile_sha256,
    argv_sha256: expectation.argv_sha256,
    host_capability_tool_name: expectation.host_capability_tool_name,
    host_capability_tool_sha256: expectation.host_capability_tool_sha256,
    transcript_sha256: input.transcript_sha256,
    network_policy: "disabled",
    proof_authority: "none"
  };
  const providerFamilyWitness = {
    witness_source: "provider_family_os_enforcement",
    provider: input.provider,
    execution_id: `${input.collection_id}-FAMILY`,
    collection_id: input.collection_id,
    helper_execution_id: input.helper_execution_id,
    runner_id: input.runner_id,
    launch_id: input.launch_id,
    host_validation_id: input.host_validation_id,
    host_validation_path: input.host_validation_path,
    host_validation_sha256: input.host_validation_sha256,
    host_capability_probe_id: input.host_capability_probe_id,
    host_capability_probe_path: input.host_capability_probe_path,
    host_capability_probe_sha256: input.host_capability_probe_sha256,
    host_capability_status: input.host_capability_status,
    provider_host_capability_bound: true,
    provider_specific_tool_name: expectation.host_capability_tool_name,
    provider_specific_tool_sha256: expectation.host_capability_tool_sha256,
    provider_tool_sha256: expectation.tool_sha256,
    provider_tool_profile_sha256: expectation.profile_sha256,
    provider_tool_argv_sha256: expectation.argv_sha256,
    provider_family_execution_kind: expectation.provider_family_execution_kind,
    provider_family_execution_profile_sha256: expectation.provider_family_execution_profile_sha256,
    provider_family_execution_argv_sha256: expectation.provider_family_execution_argv_sha256,
    collection_source: "service_owned_os_probe",
    process_isolation_enforced: true,
    filesystem_scope_enforced: true,
    network_isolation_enforced: true,
    no_new_privileges: true,
    escape_prevention: true,
    adapter_process_exit_code: 0,
    stdout_sha256: input.stdout_sha256,
    stderr_sha256: input.stderr_sha256,
    transcript_sha256: input.transcript_sha256,
    network_policy: "disabled",
    proof_authority: "none"
  };
  const liveProbeAttempt = {
    attempt_source: "provider_specific_live_os_probe",
    provider: input.provider,
    execution_id: `${input.collection_id}-LIVE`,
    collection_id: input.collection_id,
    helper_execution_id: input.helper_execution_id,
    runner_id: input.runner_id,
    launch_id: input.launch_id,
    provider_family_execution_kind: expectation.provider_family_execution_kind,
    provider_family_execution_profile_sha256: expectation.provider_family_execution_profile_sha256,
    provider_family_execution_argv_sha256: expectation.provider_family_execution_argv_sha256,
    provider_tool_sha256: expectation.tool_sha256,
    provider_tool_profile_sha256: expectation.profile_sha256,
    provider_tool_argv_sha256: expectation.argv_sha256,
    transcript_sha256: input.transcript_sha256,
    collection_source: "service_owned_os_probe",
    process_isolation_enforced: true,
    filesystem_scope_enforced: true,
    network_isolation_enforced: true,
    no_new_privileges: true,
    escape_prevention: true,
    adapter_process_exit_code: 0,
    network_policy: "disabled",
    proof_authority: "none"
  };
  const liveProbeExecution = {
    execution_source: "service_owned_provider_specific_live_os_probe",
    provider: input.provider,
    execution_id: `${input.collection_id}-LIVE-EXEC`,
    collection_id: input.collection_id,
    helper_execution_id: input.helper_execution_id,
    runner_id: input.runner_id,
    launch_id: input.launch_id,
    provider_family_execution_kind: expectation.provider_family_execution_kind,
    provider_family_execution_profile_sha256: expectation.provider_family_execution_profile_sha256,
    provider_family_execution_argv_sha256: expectation.provider_family_execution_argv_sha256,
    provider_tool_sha256: expectation.tool_sha256,
    provider_tool_profile_sha256: expectation.profile_sha256,
    provider_tool_argv_sha256: expectation.argv_sha256,
    transcript_sha256: input.transcript_sha256,
    live_probe_tool_sha256: "a".repeat(64),
    live_probe_argv_sha256: "b".repeat(64),
    live_probe_stdout_sha256: "c".repeat(64),
    live_probe_stderr_sha256: "d".repeat(64),
    live_probe_transcript_sha256: "e".repeat(64),
    collection_source: "service_owned_os_probe",
    process_isolation_enforced: true,
    filesystem_scope_enforced: true,
    network_isolation_enforced: true,
    no_new_privileges: true,
    escape_prevention: true,
    adapter_process_exit_code: 0,
    network_policy: "disabled",
    proof_authority: "none"
  };
  const liveProbeExecutionHash = liveProbeExecutionSha256(liveProbeExecution);
  const controlPlaneWitness = {
    witness_source: "provider_control_plane_execution",
    provider: input.provider,
    control_plane_kind: providerControlPlaneKind(input.provider),
    execution_id: `${input.collection_id}-CONTROL`,
    collection_id: input.collection_id,
    helper_execution_id: input.helper_execution_id,
    runner_id: input.runner_id,
    launch_id: input.launch_id,
    provider_family_execution_kind: expectation.provider_family_execution_kind,
    provider_family_execution_profile_sha256: expectation.provider_family_execution_profile_sha256,
    provider_family_execution_argv_sha256: expectation.provider_family_execution_argv_sha256,
    provider_tool_sha256: expectation.tool_sha256,
    provider_tool_profile_sha256: expectation.profile_sha256,
    provider_tool_argv_sha256: expectation.argv_sha256,
    transcript_sha256: input.transcript_sha256,
    provider_specific_live_probe_execution_id: liveProbeExecution.execution_id,
    provider_specific_live_probe_execution_sha256: liveProbeExecutionHash,
    provider_specific_live_probe_tool_sha256: liveProbeExecution.live_probe_tool_sha256,
    provider_specific_live_probe_argv_sha256: liveProbeExecution.live_probe_argv_sha256,
    provider_specific_live_probe_stdout_sha256: liveProbeExecution.live_probe_stdout_sha256,
    provider_specific_live_probe_stderr_sha256: liveProbeExecution.live_probe_stderr_sha256,
    provider_specific_live_probe_transcript_sha256: liveProbeExecution.live_probe_transcript_sha256,
    collection_source: "service_owned_os_probe",
    network_policy: "disabled",
    proof_authority: "none"
  };
  return {
    probe_source: "service_owned_provider_helper_collection_probe",
    collection_source: "service_owned_os_probe",
    process_isolation_enforced: true,
    filesystem_scope_enforced: true,
    network_isolation_enforced: true,
    no_new_privileges: true,
    escape_prevention: true,
    adapter_process_exit_code: input.helper_exit_code,
    stdout_sha256: input.stdout_sha256,
    stderr_sha256: input.stderr_sha256,
    transcript_sha256: input.transcript_sha256,
    provider_tool_execution_witness: providerToolWitness,
    provider_family_os_enforcement_witness: providerFamilyWitness,
    provider_specific_live_probe_attempt: liveProbeAttempt,
    provider_specific_live_probe_execution_required: true,
    provider_specific_live_probe_execution: liveProbeExecution,
    provider_specific_live_probe_execution_bound: true,
    provider_specific_live_probe_execution_sha256: liveProbeExecutionHash,
    provider_control_plane_execution_witness_required: true,
    provider_control_plane_execution_witness: controlPlaneWitness,
    provider_control_plane_execution_witness_bound: true,
    provider_control_plane_execution_witness_sha256:
      providerControlPlaneExecutionWitnessSha256(controlPlaneWitness),
    provider_tool_execution_witness_expectation: expectation,
    diagnostics: ["Task211 valid provider-helper witness chain fixture"]
  };
}

const task211Capability = "agent_adapter_os_isolation_provider_helper_witness_chain_check_debug";
const task211TestName = "goal3-task211-agent-adapter-os-isolation-provider-helper-witness-chain-check-debug.test.mjs";

assert.equal(
  getComathdStatus().capabilities.includes(task211Capability),
  true,
  "Task211 capability ledger must advertise provider-helper witness-chain check-debug coverage without claiming GA"
);

const smoke = readRepoFile("scripts/phase0-smoke.mjs");
const gaReleaseCriteria = readRepoFile("docs/architecture/ga-release-criteria.md");
const readme = readRepoFile("README.md");
const agents = readRepoFile("AGENTS.md");
const todo = readRepoFile("TODO.md");
const review = readRepoFile("REVIEW.md");
const adapterContracts = readRepoFile("docs/architecture/adapter-contracts.md");
const threatModel = readRepoFile("docs/architecture/threat-model.md");
const configReadme = readRepoFile("config/README.md");
const configSample = readRepoFile("config/comath.sample.json");
const server = readRepoFile("services/comathd/src/api/server.ts");
const adapterIsolation = readRepoFile("services/comathd/src/agents/agent-adapter-os-isolation.ts");
const piRuntimeRegistration = readRepoFile("extensions/comath-pi/src/runtime-registration.ts");
const piIndex = readRepoFile("extensions/comath-pi/src/index.ts");
const goal3Tasks = readRepoFile("goal-3/tasks.md");

const task202Through211Suites = [
  "goal3-task202-agent-adapter-os-isolation-bundled-provider-helper-collection-probe.test.mjs",
  "goal3-task203-agent-adapter-os-isolation-provider-tool-witness-gate.test.mjs",
  "goal3-task204-agent-adapter-os-isolation-provider-specific-tool-binding.test.mjs",
  "goal3-task205-agent-adapter-os-isolation-provider-family-enforcement-witness-gate.test.mjs",
  "goal3-task206-agent-adapter-os-isolation-provider-family-execution-profile-gate.test.mjs",
  "goal3-task207-agent-adapter-os-isolation-provider-specific-live-probe-attempt-gate.test.mjs",
  "goal3-task208-agent-adapter-os-isolation-provider-specific-live-probe-execution-gate.test.mjs",
  "goal3-task209-agent-adapter-os-isolation-provider-specific-live-probe-collection-binding-gate.test.mjs",
  "goal3-task210-agent-adapter-os-isolation-provider-control-plane-execution-witness-gate.test.mjs",
  task211TestName
];

const unitFiles = new Set(listRepoDir("services/comathd/tests/unit"));
for (const testName of task202Through211Suites) {
  assert.equal(unitFiles.has(testName), true, `Task211 release-hardening suite ${testName} must exist`);
  assert.equal(smoke.includes(testName), true, `phase0 smoke must discover Task211 witness-chain suite ${testName}`);
  assert.equal(gaReleaseCriteria.includes(testName), true, `GA release criteria must list Task211 witness-chain suite ${testName}`);
}

for (const capability of [
  "agent_adapter_os_isolation_bundled_provider_helper_collection_probe_asset",
  "agent_adapter_os_isolation_provider_tool_execution_witness_gate",
  "agent_adapter_os_isolation_provider_specific_tool_binding_gate",
  "agent_adapter_os_isolation_provider_family_os_enforcement_witness_gate",
  "agent_adapter_os_isolation_provider_family_execution_profile_gate",
  "agent_adapter_os_isolation_provider_specific_live_probe_attempt_gate",
  "agent_adapter_os_isolation_provider_specific_live_probe_execution_gate",
  "agent_adapter_os_isolation_provider_specific_live_probe_collection_binding_gate",
  "agent_adapter_os_isolation_provider_control_plane_execution_witness_gate",
  task211Capability
]) {
  assert.equal(getComathdStatus().capabilities.includes(capability), true, `status capability ${capability} must be advertised`);
}

for (const blocker of [
  "blocked_provider_helper_collection_provider_tool_witness_missing",
  "blocked_provider_helper_collection_provider_specific_tool_binding_missing",
  "blocked_provider_helper_collection_provider_family_os_enforcement_witness_missing",
  "blocked_provider_helper_collection_provider_family_execution_profile_missing",
  "blocked_provider_helper_collection_provider_specific_live_probe_attempt_missing",
  "blocked_provider_helper_collection_provider_specific_live_probe_execution_missing",
  "blocked_provider_helper_collection_provider_control_plane_execution_witness_missing"
]) {
  assert.equal(adapterIsolation.includes(blocker), true, `provider-helper witness-chain blocker ${blocker} must remain wired`);
}

for (const readinessVeto of [
  "adapter_os_isolation_provider_tool_execution_witness_missing",
  "adapter_os_isolation_provider_specific_tool_execution_missing",
  "adapter_os_isolation_provider_family_os_enforcement_witness_missing",
  "adapter_os_isolation_provider_family_execution_profile_missing",
  "adapter_os_isolation_provider_specific_live_probe_attempt_missing",
  "adapter_os_isolation_provider_specific_live_probe_execution_missing",
  "adapter_os_isolation_provider_control_plane_execution_witness_missing"
]) {
  assert.equal(adapterIsolation.includes(readinessVeto), true, `provider-helper witness-chain readiness veto ${readinessVeto} must remain wired`);
}

assert.match(
  server,
  /POST \/agent\/adapter\/package\/os-isolation-provider-helper-collection[\s\S]{0,260}sanitizePublicFormalAuthorityVocabulary/,
  "provider-helper collection route must keep public formal-authority sanitization around route payloads"
);
assert.doesNotMatch(
  piRuntimeRegistration,
  /agent-adapter-os-isolation-provider-helper-collection/,
  "Task211 must preserve that provider-helper collection/witness-chain material has no direct Pi release subcommand"
);
assert.doesNotMatch(
  piIndex,
  /os-isolation-provider-helper-collection/,
  "Task211 must preserve that Pi does not expose a direct provider-helper collection route consumer"
);

for (const requiredConfigFlag of [
  '"collectionProbeProviderToolWitnessRequired": true',
  '"providerSpecificToolBindingRequired": true',
  '"providerFamilyOsEnforcementWitnessRequired": true',
  '"providerFamilyExecutionProfileRequired": true',
  '"providerSpecificLiveProbeAttemptRequired": true',
  '"providerSpecificLiveProbeExecutionRequired": true',
  '"providerSpecificLiveProbeCollectionBindingRequired": true',
  '"providerControlPlaneExecutionWitnessRequired": true'
]) {
  assert.equal(configSample.includes(requiredConfigFlag), true, `sample config must keep ${requiredConfigFlag}`);
}

for (const [content, label] of [
  [readme, "README.md"],
  [agents, "AGENTS.md"],
  [adapterContracts, "docs/architecture/adapter-contracts.md"],
  [threatModel, "docs/architecture/threat-model.md"],
  [configReadme, "config/README.md"],
  [gaReleaseCriteria, "docs/architecture/ga-release-criteria.md"]
]) {
  assert.equal(content.includes("Task211"), true, `${label} must record the Task211 witness-chain check-debug boundary`);
  assert.match(
    content,
    /Task202-210|provider-helper witness chain|provider-tool\/family\/live-probe\/control-plane witness chain|witness-chain/i,
    `${label} must name the Task202-210 provider-helper witness-chain coverage`
  );
  assert.doesNotMatch(
    content,
    /Task211.{0,280}(?:certif(?:y|ies) GA|mathematical proof authority|real-Pi evidence|broad provider support|ships? production sandbox helpers?|inspects? daemon|inspects? sandbox policy|proves OS enforcement)/is,
    `${label} must not overclaim Task211 as proof, GA, real-Pi, broad provider support, production helper shipment, daemon/policy inspection, or OS-enforcement proof`
  );
}

assert.match(todo, /Task202-211|Task211/, "TODO must roll the provider-helper witness-chain summary through Task211");
assert.equal(review.includes("Goal 3 Task 211"), true, "REVIEW must include Task211 verification evidence");
assert.equal(goal3Tasks.includes("## Task211"), true, "Goal 3 tracker must record Task211 before the next frontier");

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task211-witness-chain-"));

try {
  const init = initProject({
    name: "Goal3 Task211 Provider Helper Witness Chain Check Debug",
    root_path: projectRoot
  });
  const projectId = init.project.project_id;
  const helperScript = createHelperScript(projectRoot);
  const helperBinarySha256 = sha256File(process.execPath);

  const launch = prepareAgentAdapterOsIsolationSandboxLaunch(projectRoot, {
    project_id: projectId,
    launch_id: "ADAPTER-OSISO-LAUNCH-0211-READY",
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=task211-launch-secret`,
    requested_provider: "windows_appcontainer",
    launcher_environment: { platform: "win32", notes: `${projectRoot} password=task211-launch-secret` }
  }, {
    launcher_probe: () => ({
      probe_source: "service_owned_launcher_preflight",
      provider_available: true,
      launcher_binary_sha256: "1".repeat(64),
      launcher_version: "appcontainer-launcher-task211",
      diagnostics: [`${projectRoot} launcher diagnostic must be scrubbed`, "launcher ready"]
    })
  });
  assert.equal(launch.ok, true);

  const readyRunner = prepareAgentAdapterOsIsolationProviderRunner(projectRoot, {
    project_id: projectId,
    runner_id: "ADAPTER-OSISO-RUNNER-0211-READY",
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=task211-runner-secret`,
    requested_provider: "windows_appcontainer",
    runner_environment: { platform: "win32", notes: `${projectRoot} password=task211-runner-secret` }
  }, {
    provider_runner_resolver: () => ({
      resolution_source: "service_owned_provider_runner_resolver",
      runner_available: true,
      runner_binary_sha256: helperBinarySha256,
      runner_version: "node-provider-helper-task211",
      diagnostics: [`${projectRoot} runner diagnostic must be scrubbed`, "runner resolved"]
    })
  });
  assert.equal(readyRunner.ok, true);

  const hostCapability = probeAgentAdapterOsIsolationProviderHostCapability(projectRoot, {
    project_id: projectId,
    host_capability_probe_id: "ADAPTER-OSISO-HOST-CAP-0211-READY",
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=task211-host-capability-secret`,
    requested_provider: "windows_appcontainer",
    host_capability_environment: { platform: "caller-spoofed-platform", notes: `${projectRoot} password=task211-host-capability-secret` }
  }, {
    provider_host_capability_probe: () => ({
      probe_source: "service_owned_provider_host_capability_probe",
      provider_host_capability_available: true,
      capability_facts: [{ capability: "Task211 witness-chain candidate observed", observed: true, evidence_sha256: "2".repeat(64), notes: null }],
      required_tools: [{ name: "windows_checknetisolation", present: true, binary_sha256: helperBinarySha256, version: null }],
      kernel_features: [{ name: "task211-provider-host-capability", observed: true, evidence_sha256: "3".repeat(64), notes: null }],
      diagnostics: [`${projectRoot} host capability diagnostic must be scrubbed`, "host capability observed"]
    })
  });
  assert.equal(hostCapability.ok, true);

  const readyHost = validateAgentAdapterOsIsolationProviderHelperHost(projectRoot, {
    project_id: projectId,
    host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0211-READY",
    host_capability_probe_id: hostCapability.host_capability_probe_id,
    runner_id: readyRunner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=task211-host-secret`,
    requested_provider: "windows_appcontainer",
    host_environment: { platform: "win32", notes: `${projectRoot} password=task211-host-secret` }
  }, {
    provider_helper_host_validator: () => ({
      validation_source: "service_owned_provider_helper_host_validator",
      helper_host_ready: true,
      helper_program: process.execPath,
      helper_binary_sha256: helperBinarySha256,
      helper_version: "node-provider-helper-task211",
      supported_platforms: ["win32"],
      diagnostics: [`${projectRoot} host validation diagnostic must be scrubbed`, "helper host ready"]
    })
  });
  assert.equal(readyHost.ok, true);

  const helperExecution = runAgentAdapterOsIsolationProviderHelperExecution(projectRoot, {
    project_id: projectId,
    helper_execution_id: "ADAPTER-OSISO-HELPER-0211-READY",
    host_validation_id: readyHost.host_validation_id,
    runner_id: readyRunner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=task211-helper-secret`,
    requested_provider: "windows_appcontainer",
    helper_environment: { platform: "win32", notes: `${projectRoot} password=task211-helper-secret` }
  }, {
    provider_helper_config_resolver: () => ({
      config_source: "service_owned_provider_helper_config",
      helper_available: true,
      helper_program: process.execPath,
      helper_args_prefix: [helperScript],
      helper_version: "node-provider-helper-task211",
      timeout_ms: 5000,
      diagnostics: [`${projectRoot} helper config diagnostic must be scrubbed`, "helper configured"]
    })
  });
  assert.equal(helperExecution.ok, true);
  assert.equal(helperExecution.provider_helper_execution.runtime_attestation_bound, true);

  const boundCollection = collectAgentAdapterOsIsolationProviderHelperExecutionEvidence(projectRoot, {
    project_id: projectId,
    collection_id: "ADAPTER-OSISO-HELPER-COLLECT-0211-COMPLETE",
    helper_execution_id: helperExecution.helper_execution_id,
    runner_id: readyRunner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=task211-collection-secret`,
    requested_provider: "windows_appcontainer",
    collection_environment: { platform: "win32", notes: `${projectRoot} password=task211-collection-secret` }
  }, {
    provider_helper_collection_probe: completeTask210Collection
  });
  assert.equal(boundCollection.ok, true, JSON.stringify(boundCollection.provider_helper_collection));
  assert.equal(boundCollection.collection_status, "provider_helper_os_evidence_collected");

  const readyBeforeManifestLoss = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0211-COMPLETE-BEFORE-MANIFEST-LOSS",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task211-before-manifest-loss",
    evidence_path: boundCollection.probe.evidence_path
  });
  assert.equal(readyBeforeManifestLoss.ok, true, "Task210-shaped collection evidence should be readiness-valid before manifest loss");

  unlinkSync(join(projectRoot, boundCollection.collection_path));
  const missingCollectionManifestReadiness = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0211-MISSING-COLLECTION-MANIFEST",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task211-missing-collection-manifest",
    evidence_path: boundCollection.probe.evidence_path
  });
  assert.equal(missingCollectionManifestReadiness.ok, false, "Task211 must fail closed when the provider-helper collection manifest is missing");
  assert.equal(
    missingCollectionManifestReadiness.readiness_status,
    "blocked_missing_os_enforced_adapter_isolation"
  );
  assert.equal(missingCollectionManifestReadiness.checks.collected_probe_binding.ok, false);
  assert.equal(
    missingCollectionManifestReadiness.vetoes.some((veto) => veto.code === "adapter_os_isolation_collected_probe_binding_missing"),
    true,
    "missing provider-helper collection manifest must surface the collected-probe binding veto"
  );
  assert.equal(missingCollectionManifestReadiness.proof_authority, "none");
  assert.equal(missingCollectionManifestReadiness.can_certify_ga, false);
  assert.equal(JSON.stringify(missingCollectionManifestReadiness).includes(projectRoot), false, "missing-manifest readiness must not echo host paths");
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task211 provider-helper witness-chain check-debug tests passed.");
