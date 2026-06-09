import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
  readAuditEvents,
  reviewAgentAdapterOsIsolationReadiness,
  runAgentAdapterOsIsolationProviderHelperExecution,
  validateAgentAdapterOsIsolationProviderHelperHost
} from "../../dist/index.js";

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

function readRepoFile(relativePath) {
  const here = dirname(fileURLToPath(import.meta.url));
  const repoRoot = join(here, "../../../..");
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function createHelperScript(projectRoot) {
  const helperScript = join(projectRoot, "task210-provider-helper.mjs");
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

function completeCollection(input, { controlPlaneMode }) {
  const expectation = input.provider_tool_execution_witness_expectation;
  assert.equal(typeof expectation?.provider_family_execution_kind, "string");
  assert.match(expectation.provider_family_execution_profile_sha256, /^[a-f0-9]{64}$/);
  assert.match(expectation.provider_family_execution_argv_sha256, /^[a-f0-9]{64}$/);
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
  const collection = {
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
    provider_tool_execution_witness_expectation: expectation,
    diagnostics: ["Task210 provider control-plane execution witness fixture"]
  };
  if (controlPlaneMode === "missing") {
    collection.provider_control_plane_execution_witness_required = true;
    collection.provider_control_plane_execution_witness_bound = false;
  }
  if (controlPlaneMode !== "missing") {
    const witness = {
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
      provider_specific_live_probe_execution_sha256:
        controlPlaneMode === "wrong-live-probe-binding" ? "f".repeat(64) : liveProbeExecutionHash,
      provider_specific_live_probe_tool_sha256: liveProbeExecution.live_probe_tool_sha256,
      provider_specific_live_probe_argv_sha256: liveProbeExecution.live_probe_argv_sha256,
      provider_specific_live_probe_stdout_sha256: liveProbeExecution.live_probe_stdout_sha256,
      provider_specific_live_probe_stderr_sha256: liveProbeExecution.live_probe_stderr_sha256,
      provider_specific_live_probe_transcript_sha256: liveProbeExecution.live_probe_transcript_sha256,
      collection_source: "service_owned_os_probe",
      network_policy: "disabled",
      proof_authority: "none"
    };
    collection.provider_control_plane_execution_witness_required = true;
    collection.provider_control_plane_execution_witness = witness;
    collection.provider_control_plane_execution_witness_bound = true;
    collection.provider_control_plane_execution_witness_sha256 =
      providerControlPlaneExecutionWitnessSha256(witness);
  }
  return collection;
}

function writeStalePreTask210Evidence(projectRoot, sourceCollection, staleProbeId) {
  const sourceProbe = sourceCollection.probe;
  const staleDir = join(projectRoot, ".comath", "release", "agent-adapter-os-isolation", staleProbeId);
  const collectionPath = `.comath/release/agent-adapter-os-isolation/${staleProbeId}/provider-helper-collection.json`;
  const evidencePath = `.comath/release/agent-adapter-os-isolation/${staleProbeId}/evidence.json`;
  const probePath = `.comath/release/agent-adapter-os-isolation/${staleProbeId}/probe.json`;
  mkdirSync(staleDir, { recursive: true });

  const staleEvidence = {
    ...sourceProbe.evidence,
    probe_id: staleProbeId
  };
  delete staleEvidence.provider_control_plane_execution_witness_required;
  delete staleEvidence.provider_control_plane_execution_witness_bound;
  delete staleEvidence.provider_control_plane_execution_witness_sha256;
  const evidenceText = JSON.stringify(staleEvidence);
  const evidenceSha256 = sha256Text(evidenceText);
  writeFileSync(join(staleDir, "evidence.json"), evidenceText, "utf8");

  const staleProbe = {
    ...sourceProbe,
    probe_id: staleProbeId,
    probe_path: probePath,
    evidence_path: evidencePath,
    evidence_artifact: {
      kind: "agent_adapter_os_isolation_evidence",
      path: evidencePath,
      sha256: evidenceSha256,
      size_bytes: Buffer.byteLength(evidenceText, "utf8")
    },
    evidence: staleEvidence
  };
  writeFileSync(join(staleDir, "probe.json"), JSON.stringify(staleProbe), "utf8");

  const staleCollection = {
    ...sourceCollection,
    collection_id: staleProbeId,
    collection_path: collectionPath,
    probe: staleProbe,
    provider_helper_collection: {
      ...sourceCollection.provider_helper_collection,
      provider_control_plane_execution_witness_required: false,
      provider_control_plane_execution_witness_bound: false,
      provider_control_plane_execution_witness_sha256: null
    }
  };
  writeFileSync(join(staleDir, "provider-helper-collection.json"), JSON.stringify(staleCollection), "utf8");
  return staleCollection;
}

const task210Capability = "agent_adapter_os_isolation_provider_control_plane_execution_witness_gate";
const task210TestName = "goal3-task210-agent-adapter-os-isolation-provider-control-plane-execution-witness-gate.test.mjs";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task210-control-plane-witness-"));

try {
  const init = initProject({
    name: "Goal3 Task210 Adapter OS Isolation Provider Control-Plane Execution Witness",
    root_path: projectRoot
  });
  const projectId = init.project.project_id;
  const helperScript = createHelperScript(projectRoot);
  const helperBinarySha256 = sha256File(process.execPath);

  const launch = prepareAgentAdapterOsIsolationSandboxLaunch(projectRoot, {
    project_id: projectId,
    launch_id: "ADAPTER-OSISO-LAUNCH-0210-READY",
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=launch-secret`,
    requested_provider: "windows_appcontainer",
    launcher_environment: { platform: "win32", notes: `${projectRoot} password=launcher-secret` }
  }, {
    launcher_probe: () => ({
      probe_source: "service_owned_launcher_preflight",
      provider_available: true,
      launcher_binary_sha256: "1".repeat(64),
      launcher_version: "appcontainer-launcher-10.0",
      diagnostics: [`${projectRoot} launcher diagnostic must be scrubbed`, "launcher ready"]
    })
  });
  assert.equal(launch.ok, true);

  const readyRunner = prepareAgentAdapterOsIsolationProviderRunner(projectRoot, {
    project_id: projectId,
    runner_id: "ADAPTER-OSISO-RUNNER-0210-READY",
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=runner-secret`,
    requested_provider: "windows_appcontainer",
    runner_environment: { platform: "win32", notes: `${projectRoot} password=runner-secret` }
  }, {
    provider_runner_resolver: () => ({
      resolution_source: "service_owned_provider_runner_resolver",
      runner_available: true,
      runner_binary_sha256: helperBinarySha256,
      runner_version: "node-provider-helper-test",
      helper_profile_source: "operator_configured_provider_helper",
      production_helper_configured: true,
      bundled_protocol_asset: false,
      diagnostics: [`${projectRoot} runner diagnostic must be scrubbed`, "runner resolved"]
    })
  });
  assert.equal(readyRunner.ok, true);

  const hostCapability = probeAgentAdapterOsIsolationProviderHostCapability(projectRoot, {
    project_id: projectId,
    host_capability_probe_id: "ADAPTER-OSISO-HOST-CAP-0210-READY",
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=host-capability-secret`,
    requested_provider: "windows_appcontainer",
    host_capability_environment: { platform: "caller-spoofed-platform", notes: `${projectRoot} password=host-capability-secret` }
  }, {
    provider_host_capability_probe: (probeInput) => {
      assert.equal(probeInput.provider, "windows_appcontainer");
      assert.equal(probeInput.platform, process.platform);
      return {
        probe_source: "service_owned_provider_host_capability_probe",
        provider_host_capability_available: true,
        capability_facts: [{ capability: "Task210 provider control-plane candidate observed", observed: true, evidence_sha256: "2".repeat(64), notes: null }],
        required_tools: [{ name: "windows_checknetisolation", present: true, binary_sha256: helperBinarySha256, version: null }],
        kernel_features: [{ name: "task210-provider-host-capability", observed: true, evidence_sha256: "3".repeat(64), notes: null }],
        diagnostics: [`${projectRoot} host capability diagnostic must be scrubbed`, "host capability observed"]
      };
    }
  });
  assert.equal(hostCapability.ok, true);

  const readyHost = validateAgentAdapterOsIsolationProviderHelperHost(projectRoot, {
    project_id: projectId,
    host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0210-READY",
    host_capability_probe_id: hostCapability.host_capability_probe_id,
    runner_id: readyRunner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=host-secret`,
    requested_provider: "windows_appcontainer",
    host_environment: { platform: "win32", notes: `${projectRoot} password=host-secret` }
  }, {
    provider_helper_host_validator: () => ({
      validation_source: "service_owned_provider_helper_host_validator",
      helper_host_ready: true,
      helper_program: process.execPath,
      helper_binary_sha256: helperBinarySha256,
      helper_version: "node-provider-helper-test",
      helper_profile_source: "operator_configured_provider_helper",
      production_helper_configured: true,
      bundled_protocol_asset: false,
      supported_platforms: ["win32"],
      diagnostics: [`${projectRoot} host validation diagnostic must be scrubbed`, "helper host ready"]
    })
  });
  assert.equal(readyHost.ok, true);

  const helperExecution = runAgentAdapterOsIsolationProviderHelperExecution(projectRoot, {
    project_id: projectId,
    helper_execution_id: "ADAPTER-OSISO-HELPER-0210-READY",
    host_validation_id: readyHost.host_validation_id,
    runner_id: readyRunner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=helper-secret`,
    requested_provider: "windows_appcontainer",
    helper_environment: { platform: "win32", notes: `${projectRoot} password=helper-secret` }
  }, {
    provider_helper_config_resolver: () => ({
      config_source: "service_owned_provider_helper_config",
      helper_available: true,
      helper_program: process.execPath,
      helper_args_prefix: [helperScript],
      helper_version: "node-provider-helper-test",
      helper_profile_source: "operator_configured_provider_helper",
      production_helper_configured: true,
      bundled_protocol_asset: false,
      timeout_ms: 5000,
      diagnostics: [`${projectRoot} helper config diagnostic must be scrubbed`, "helper configured"]
    })
  });
  assert.equal(helperExecution.ok, true);
  assert.equal(helperExecution.provider_helper_execution.runtime_attestation_bound, true);

  const missingControlPlaneWitness = collectAgentAdapterOsIsolationProviderHelperExecutionEvidence(projectRoot, {
    project_id: projectId,
    collection_id: "ADAPTER-OSISO-HELPER-COLLECT-0210-MISSING-CONTROL",
    helper_execution_id: helperExecution.helper_execution_id,
    runner_id: readyRunner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=missing-control-secret`,
    requested_provider: "windows_appcontainer",
    collection_environment: { platform: "win32", notes: `${projectRoot} password=missing-control-secret` }
  }, {
    provider_helper_collection_probe: (input) => completeCollection(input, { controlPlaneMode: "missing" })
  });
  assert.equal(missingControlPlaneWitness.ok, false, "Task209-valid collection evidence must not satisfy readiness without a provider control-plane execution witness");
  assert.equal(
    missingControlPlaneWitness.collection_status,
    "blocked_provider_helper_collection_provider_control_plane_execution_witness_missing"
  );
  assert.equal(missingControlPlaneWitness.provider_helper_collection.provider_specific_live_probe_execution_bound, true);
  assert.equal(missingControlPlaneWitness.provider_helper_collection.provider_control_plane_execution_witness_required, true);
  assert.equal(missingControlPlaneWitness.provider_helper_collection.provider_control_plane_execution_witness_bound, false);
  assert.equal(missingControlPlaneWitness.probe.evidence.provider_specific_live_probe_execution_bound, true);
  assert.equal(missingControlPlaneWitness.probe.evidence.provider_control_plane_execution_witness_bound, false);
  assert.equal(missingControlPlaneWitness.proof_authority, "none");
  assert.equal(missingControlPlaneWitness.can_certify_ga, false);

  const wrongControlPlaneWitness = collectAgentAdapterOsIsolationProviderHelperExecutionEvidence(projectRoot, {
    project_id: projectId,
    collection_id: "ADAPTER-OSISO-HELPER-COLLECT-0210-WRONG-CONTROL",
    helper_execution_id: helperExecution.helper_execution_id,
    runner_id: readyRunner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=wrong-control-secret`,
    requested_provider: "windows_appcontainer",
    collection_environment: { platform: "win32", notes: `${projectRoot} password=wrong-control-secret` }
  }, {
    provider_helper_collection_probe: (input) => completeCollection(input, { controlPlaneMode: "wrong-live-probe-binding" })
  });
  assert.equal(wrongControlPlaneWitness.ok, false, "control-plane witness with a mismatched live-probe execution hash must fail closed");
  assert.equal(
    wrongControlPlaneWitness.collection_status,
    "blocked_provider_helper_collection_provider_control_plane_execution_witness_missing"
  );
  assert.equal(wrongControlPlaneWitness.provider_helper_collection.provider_control_plane_execution_witness_bound, false);

  const boundControlPlaneWitness = collectAgentAdapterOsIsolationProviderHelperExecutionEvidence(projectRoot, {
    project_id: projectId,
    collection_id: "ADAPTER-OSISO-HELPER-COLLECT-0210-CONTROL-BOUND",
    helper_execution_id: helperExecution.helper_execution_id,
    runner_id: readyRunner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=bound-control-secret`,
    requested_provider: "windows_appcontainer",
    collection_environment: { platform: "win32", notes: `${projectRoot} password=bound-control-secret` }
  }, {
    provider_helper_collection_probe: (input) => completeCollection(input, { controlPlaneMode: "valid" })
  });
  assert.equal(boundControlPlaneWitness.ok, true, JSON.stringify(boundControlPlaneWitness.provider_helper_collection));
  assert.equal(boundControlPlaneWitness.collection_status, "provider_helper_os_evidence_collected");
  assert.equal(boundControlPlaneWitness.provider_helper_collection.provider_specific_live_probe_execution_bound, true);
  assert.equal(boundControlPlaneWitness.provider_helper_collection.provider_control_plane_execution_witness_required, true);
  assert.equal(boundControlPlaneWitness.provider_helper_collection.provider_control_plane_execution_witness_bound, true);
  assert.match(boundControlPlaneWitness.provider_helper_collection.provider_control_plane_execution_witness_sha256, /^[a-f0-9]{64}$/);
  assert.equal(boundControlPlaneWitness.probe.evidence.provider_control_plane_execution_witness_bound, true);
  assert.equal(
    boundControlPlaneWitness.probe.evidence.provider_control_plane_execution_witness_sha256,
    boundControlPlaneWitness.provider_helper_collection.provider_control_plane_execution_witness_sha256
  );
  assert.equal(JSON.stringify(boundControlPlaneWitness).includes(projectRoot), false, "control-plane witness collection must not echo host paths");
  assert.equal(JSON.stringify(boundControlPlaneWitness).includes("bound-control-secret"), false, "control-plane witness collection must not echo secrets");

  const readiness = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0210-CONTROL-BOUND-READINESS",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task210-control-bound-test",
    evidence_path: boundControlPlaneWitness.probe.evidence_path
  });
  assert.equal(readiness.ok, true, "control-plane-witness-bound canonical evidence can satisfy OS-isolation readiness");
  assert.equal(readiness.checks.provider_specific_live_probe_execution.ok, true);
  assert.equal(readiness.checks.provider_control_plane_execution_witness.ok, true);
  assert.equal(readiness.proof_authority, "none");
  assert.equal(readiness.can_certify_ga, false);

  const stalePreTask210 = writeStalePreTask210Evidence(
    projectRoot,
    boundControlPlaneWitness,
    "ADAPTER-OSISO-HELPER-COLLECT-0210-STALE-PRE-TASK210"
  );
  const staleReadiness = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0210-STALE-PRE-TASK210-READINESS",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task210-stale-pre-task210-test",
    evidence_path: stalePreTask210.probe.evidence_path
  });
  assert.equal(staleReadiness.ok, false, "stale pre-Task210 canonical evidence without a control-plane witness must fail readiness");
  assert.equal(staleReadiness.checks.provider_control_plane_execution_witness.ok, false);
  assert.equal(
    staleReadiness.vetoes.some((veto) => veto.code === "adapter_os_isolation_provider_control_plane_execution_witness_missing"),
    true,
    "stale pre-Task210 evidence must report the provider control-plane execution witness veto"
  );

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.os_isolation_provider_helper_collected" &&
        event.payload.collection_id === "ADAPTER-OSISO-HELPER-COLLECT-0210-MISSING-CONTROL" &&
        event.payload.collection_status === "blocked_provider_helper_collection_provider_control_plane_execution_witness_missing" &&
        event.payload.provider_specific_live_probe_execution_bound === true &&
        event.payload.provider_control_plane_execution_witness_bound === false &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "missing provider control-plane execution witness blocker must be audit-visible and non-authoritative"
  );
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.os_isolation_provider_helper_collected" &&
        event.payload.collection_id === "ADAPTER-OSISO-HELPER-COLLECT-0210-CONTROL-BOUND" &&
        event.payload.ok === true &&
        event.payload.provider_control_plane_execution_witness_bound === true &&
        /^[a-f0-9]{64}$/.test(event.payload.provider_control_plane_execution_witness_sha256) &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "provider control-plane execution witness-bound helper collection must be audit-visible and non-authoritative"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

assert.equal(
  getComathdStatus().capabilities.includes(task210Capability),
  true,
  "Task210 capability ledger must advertise provider control-plane execution witness gating"
);

const smoke = readRepoFile("scripts/phase0-smoke.mjs");
const gaReleaseCriteria = readRepoFile("docs/architecture/ga-release-criteria.md");
assert.equal(smoke.includes(task210TestName), true, "phase0 smoke must discover the Task210 provider control-plane execution witness suite");
assert.equal(gaReleaseCriteria.includes(task210TestName), true, "GA release criteria must list the Task210 provider control-plane execution witness suite");

for (const [content, label] of [
  [readRepoFile("README.md"), "README.md"],
  [readRepoFile("AGENTS.md"), "AGENTS.md"],
  [readRepoFile("TODO.md"), "TODO.md"],
  [readRepoFile("REVIEW.md"), "REVIEW.md"],
  [readRepoFile("goal-3/tasks.md"), "goal-3/tasks.md"],
  [readRepoFile("docs/architecture/adapter-contracts.md"), "docs/architecture/adapter-contracts.md"],
  [readRepoFile("docs/architecture/threat-model.md"), "docs/architecture/threat-model.md"],
  [gaReleaseCriteria, "docs/architecture/ga-release-criteria.md"],
  [readRepoFile("config/README.md"), "config/README.md"]
]) {
  assert.equal(content.includes("Task210"), true, `${label} must record the Task210 provider control-plane execution witness boundary`);
  assert.match(
    content,
    /provider control-plane execution witness|provider_control_plane_execution_witness/i,
    `${label} must name provider control-plane execution witness gating`
  );
  if (label !== "goal-3/tasks.md") {
    assert.doesNotMatch(
      content,
      /Task210.{0,260}(?:certif(?:y|ies) GA|mathematical proof authority|real-Pi evidence|broad provider support|ships? production sandbox helpers?|inspects? daemon|inspects? sandbox policy)/is,
      `${label} must not overclaim Task210 as proof, GA, real-Pi, broad provider support, production helper shipment, or real daemon/policy inspection`
    );
  }
}

assert.equal(
  readRepoFile("config/comath.sample.json").includes('"providerControlPlaneExecutionWitnessRequired": true'),
  true,
  "sample config must record that complete provider-helper collection requires provider control-plane execution witness binding"
);

console.log("Goal 3 Task210 provider control-plane execution witness gate tests passed.");
