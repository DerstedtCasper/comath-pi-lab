import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  collectAgentAdapterOsIsolationProviderHelperExecutionEvidence,
  createComathServer,
  getComathdStatus,
  initProject,
  prepareAgentAdapterOsIsolationSandboxLaunch,
  probeAgentAdapterOsIsolationProviderHostCapability,
  reviewAgentAdapterOsIsolationReadiness
} from "../../dist/index.js";

const providerHelpers = {
  oci_container: {
    helperEnv: "COMATH_AGENT_ADAPTER_OSISO_OCI_HELPER",
    argsEnv: "COMATH_AGENT_ADAPTER_OSISO_OCI_HELPER_ARGS_JSON"
  },
  nix_sandbox: {
    helperEnv: "COMATH_AGENT_ADAPTER_OSISO_NIX_HELPER",
    argsEnv: "COMATH_AGENT_ADAPTER_OSISO_NIX_HELPER_ARGS_JSON"
  },
  firejail: {
    helperEnv: "COMATH_AGENT_ADAPTER_OSISO_FIREJAIL_HELPER",
    argsEnv: "COMATH_AGENT_ADAPTER_OSISO_FIREJAIL_HELPER_ARGS_JSON"
  },
  windows_appcontainer: {
    helperEnv: "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_HELPER",
    argsEnv: "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_HELPER_ARGS_JSON"
  },
  macos_sandbox_exec: {
    helperEnv: "COMATH_AGENT_ADAPTER_OSISO_MACOS_SANDBOX_EXEC_HELPER",
    argsEnv: "COMATH_AGENT_ADAPTER_OSISO_MACOS_SANDBOX_EXEC_HELPER_ARGS_JSON"
  }
};

const compatibleProvider = process.platform === "darwin"
  ? "macos_sandbox_exec"
  : process.platform === "win32"
    ? "windows_appcontainer"
    : "firejail";

const savedEnv = new Map();
for (const helper of Object.values(providerHelpers)) {
  savedEnv.set(helper.helperEnv, process.env[helper.helperEnv]);
  savedEnv.set(helper.argsEnv, process.env[helper.argsEnv]);
  delete process.env[helper.helperEnv];
  delete process.env[helper.argsEnv];
}
savedEnv.set("COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER", process.env.COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER);
savedEnv.set("COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER_ARGS_JSON", process.env.COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER_ARGS_JSON);
delete process.env.COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER;
delete process.env.COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER_ARGS_JSON;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task188-bundled-helper-asset-"));

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function providerHostCapabilityToolName(provider) {
  if (provider === "windows_appcontainer") {
    return "windows_checknetisolation";
  }
  if (provider === "oci_container") {
    return "oci_docker_cli";
  }
  if (provider === "nix_sandbox") {
    return "nix_cli";
  }
  if (provider === "firejail") {
    return "firejail_cli";
  }
  if (provider === "macos_sandbox_exec") {
    return "macos_sandbox_exec_cli";
  }
  throw new Error(`unsupported provider ${provider}`);
}

function providerToolExecutionWitness(probeInput) {
  const expectation = probeInput.provider_tool_execution_witness_expectation;
  assert.match(expectation.tool_sha256, /^[a-f0-9]{64}$/);
  assert.match(expectation.profile_sha256, /^[a-f0-9]{64}$/);
  assert.match(expectation.argv_sha256, /^[a-f0-9]{64}$/);
  assert.equal(expectation.host_capability_tool_name, providerHostCapabilityToolName(probeInput.provider));
  assert.match(expectation.host_capability_tool_sha256, /^[a-f0-9]{64}$/);
  return {
    witness_source: "provider_specific_executed_tool",
    provider: probeInput.provider,
    execution_id: `${probeInput.collection_id}-TOOL`,
    collection_id: probeInput.collection_id,
    helper_execution_id: probeInput.helper_execution_id,
    runner_id: probeInput.runner_id,
    launch_id: probeInput.launch_id,
    tool_sha256: expectation.tool_sha256,
    profile_sha256: expectation.profile_sha256,
    argv_sha256: expectation.argv_sha256,
    host_capability_tool_name: expectation.host_capability_tool_name,
    host_capability_tool_sha256: expectation.host_capability_tool_sha256,
    transcript_sha256: probeInput.transcript_sha256,
    network_policy: "disabled",
    proof_authority: "none"
  };
}

function providerFamilyOsEnforcementWitness(probeInput) {
  const expectation = probeInput.provider_tool_execution_witness_expectation;
  return {
    witness_source: "provider_family_os_enforcement",
    provider: probeInput.provider,
    execution_id: `${probeInput.collection_id}-FAMILY`,
    collection_id: probeInput.collection_id,
    helper_execution_id: probeInput.helper_execution_id,
    runner_id: probeInput.runner_id,
    launch_id: probeInput.launch_id,
    host_validation_id: probeInput.host_validation_id,
    host_validation_path: probeInput.host_validation_path,
    host_validation_sha256: probeInput.host_validation_sha256,
    host_capability_probe_id: probeInput.host_capability_probe_id,
    host_capability_probe_path: probeInput.host_capability_probe_path,
    host_capability_probe_sha256: probeInput.host_capability_probe_sha256,
    host_capability_status: probeInput.host_capability_status,
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
    stdout_sha256: probeInput.stdout_sha256,
    stderr_sha256: probeInput.stderr_sha256,
    transcript_sha256: probeInput.transcript_sha256,
    network_policy: "disabled",
    proof_authority: "none"
  };
}

function providerSpecificLiveProbeAttempt(probeInput) {
  const expectation = probeInput.provider_tool_execution_witness_expectation;
  return {
    attempt_source: "provider_specific_live_os_probe",
    provider: probeInput.provider,
    execution_id: `${probeInput.collection_id}-LIVE`,
    collection_id: probeInput.collection_id,
    helper_execution_id: probeInput.helper_execution_id,
    runner_id: probeInput.runner_id,
    launch_id: probeInput.launch_id,
    provider_family_execution_kind: expectation.provider_family_execution_kind,
    provider_family_execution_profile_sha256: expectation.provider_family_execution_profile_sha256,
    provider_family_execution_argv_sha256: expectation.provider_family_execution_argv_sha256,
    provider_tool_sha256: expectation.tool_sha256,
    provider_tool_profile_sha256: expectation.profile_sha256,
    provider_tool_argv_sha256: expectation.argv_sha256,
    transcript_sha256: probeInput.transcript_sha256,
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
}
function providerSpecificLiveProbeExecution(probeInput) {
  const expectation = probeInput.provider_tool_execution_witness_expectation;
  return {
    execution_source: "service_owned_provider_specific_live_os_probe",
    provider: probeInput.provider,
    execution_id: `${probeInput.collection_id}-LIVE-EXEC`,
    collection_id: probeInput.collection_id,
    helper_execution_id: probeInput.helper_execution_id,
    runner_id: probeInput.runner_id,
    launch_id: probeInput.launch_id,
    provider_family_execution_kind: expectation.provider_family_execution_kind,
    provider_family_execution_profile_sha256: expectation.provider_family_execution_profile_sha256,
    provider_family_execution_argv_sha256: expectation.provider_family_execution_argv_sha256,
    provider_tool_sha256: expectation.tool_sha256,
    provider_tool_profile_sha256: expectation.profile_sha256,
    provider_tool_argv_sha256: expectation.argv_sha256,
    transcript_sha256: probeInput.transcript_sha256,
    live_probe_tool_sha256: "d".repeat(64),
    live_probe_argv_sha256: "e".repeat(64),
    live_probe_stdout_sha256: "f".repeat(64),
    live_probe_stderr_sha256: "1".repeat(64),
    live_probe_transcript_sha256: "2".repeat(64),
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
}

try {
  assert.equal(
    getComathdStatus().capabilities.includes("agent_adapter_os_isolation_bundled_provider_helper_asset"),
    true,
    "Task188 service capability ledger must advertise the bundled provider-helper protocol asset without claiming GA"
  );

  const init = initProject({ name: "Goal3 Task188 Bundled Helper Asset", root_path: projectRoot });
  const projectId = init.project.project_id;

  const launch = prepareAgentAdapterOsIsolationSandboxLaunch(projectRoot, {
    project_id: projectId,
    launch_id: "ADAPTER-OSISO-LAUNCH-0188-BUNDLED-READY",
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=launch-secret`,
    requested_provider: compatibleProvider,
    launcher_environment: {
      platform: process.platform,
      notes: `${projectRoot} password=launch-secret`
    }
  }, {
    launcher_probe: () => ({
      probe_source: "service_owned_launcher_preflight",
      provider_available: true,
      launcher_binary_sha256: "a".repeat(64),
      launcher_version: `${compatibleProvider}-launcher-task188`,
      diagnostics: [`${projectRoot} launcher diagnostic must be scrubbed`, "launcher ready"]
    })
  });
  assert.equal(launch.ok, true);

  const server = createComathServer();
  const runnerRoute = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-runner",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      runner_id: "ADAPTER-OSISO-RUNNER-0188-BUNDLED",
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=runner-secret`,
      requested_provider: compatibleProvider,
      runner_environment: {
        platform: process.platform,
        notes: `${projectRoot} token=runner-secret`,
        provider_runner_available: false,
        runner_binary_sha256: "f".repeat(64),
        command_override: "caller-owned-runner"
      }
    }
  });
  assert.equal(runnerRoute.status, 200, JSON.stringify(runnerRoute.body));
  const runner = runnerRoute.body.runner;
  assert.equal(runner.ok, true, "missing env helper should fall back to a bundled service-owned helper asset");
  assert.equal(runner.runner_status, "ready_for_service_owned_provider_runner");
  assert.equal(runner.provider_runner_resolution.resolution_source, "service_owned_provider_runner_resolver");
  assert.match(runner.provider_runner_resolution.runner_binary_sha256, /^[a-f0-9]{64}$/);
  assert.equal(runner.provider_runner_resolution.runner_version, `${compatibleProvider}-helper-bundled-protocol-v1`);
  assert.equal(runner.provider_runner_contract.command_override_allowed, false);
  assert.equal(runner.adapter_execution_isolation.os_enforced, false);
  assert.equal(runner.proof_authority, "none");
  assert.equal(runner.can_certify_ga, false);
  assert.equal(JSON.stringify(runner).includes(projectRoot), false, "runner manifest must not echo host paths");
  assert.equal(JSON.stringify(runner).includes(process.execPath), false, "runner manifest must not expose the bundled helper executable path");
  assert.equal(JSON.stringify(runner).includes("caller-owned-runner"), false, "caller command overrides must not be persisted");
  assert.equal(JSON.stringify(runner).includes("runner-secret"), false, "runner manifest must not echo secrets");

  const hostCapability = probeAgentAdapterOsIsolationProviderHostCapability(projectRoot, {
    project_id: projectId,
    host_capability_probe_id: "ADAPTER-OSISO-HOST-CAP-0188-BUNDLED",
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=host-capability-secret`,
    requested_provider: compatibleProvider,
    host_capability_environment: {
      platform: "caller-spoofed-platform",
      notes: `${projectRoot} password=host-capability-secret`
    }
  }, {
    provider_host_capability_probe: (probeInput) => {
      assert.equal(probeInput.provider, compatibleProvider);
      assert.equal(probeInput.platform, process.platform);
      return {
        probe_source: "service_owned_provider_host_capability_probe",
        provider_host_capability_available: true,
        capability_facts: ["task188 bundled helper host-validation prerequisite observed"],
        required_tools: [{ name: providerHostCapabilityToolName(compatibleProvider), present: true, binary_sha256: sha256File(process.execPath), version: null }],
        kernel_features: ["task188-provider-host-capability"],
        diagnostics: [`${projectRoot} host capability diagnostic must be scrubbed`, "host capability observed"]
      };
    }
  });
  assert.equal(hostCapability.ok, true, "Task191 requires service-owned host capability before bundled helper host validation");

  const hostRoute = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-helper-host-validation",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0188-BUNDLED",
      host_capability_probe_id: hostCapability.host_capability_probe_id,
      runner_id: runner.runner_id,
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=host-secret`,
      requested_provider: compatibleProvider,
      host_environment: {
        platform: "caller-spoofed-platform",
        notes: `${projectRoot} token=host-secret`,
        helper_host_ready: true,
        helper_binary_sha256: "e".repeat(64),
        command_override: "caller-owned-host-validator"
      }
    }
  });
  assert.equal(hostRoute.status, 200, JSON.stringify(hostRoute.body));
  const host = hostRoute.body.host_validation;
  assert.equal(host.ok, true, "bundled helper self-test should validate the current host for the compatible provider");
  assert.equal(host.host_validation_status, "provider_helper_host_validated");
  assert.equal(host.provider_helper_host_validation.helper_binary_sha256, runner.provider_runner_resolution.runner_binary_sha256);
  assert.equal(host.provider_helper_host_validation.runner_binary_sha256, runner.provider_runner_resolution.runner_binary_sha256);
  assert.equal(host.provider_helper_host_validation.self_test_required, true);
  assert.equal(host.provider_helper_host_validation.self_test_passed, true);
  assert.equal(host.provider_helper_host_validation.self_test_args_prefix_count > 0, true);
  assert.match(host.provider_helper_host_validation.self_test_args_prefix_sha256, /^[a-f0-9]{64}$/);
  assert.equal(host.provider_helper_host_validation.platform, process.platform);
  assert.equal(host.provider_helper_host_validation.platform_supported, true);
  assert.equal(host.provider_helper_host_validation.shell, false);
  assert.equal(host.provider_helper_host_validation.network_policy, "disabled");
  assert.equal(host.provider_helper_host_validation.caller_supplied_success_allowed, false);
  assert.equal(host.adapter_execution_isolation.os_enforced, false);
  assert.equal(host.proof_authority, "none");
  assert.equal(host.can_certify_ga, false);
  assert.equal(JSON.stringify(host).includes(projectRoot), false, "host validation response must not echo host paths");
  assert.equal(JSON.stringify(host).includes("caller-owned-host-validator"), false, "caller host command overrides must not be persisted");
  assert.equal(JSON.stringify(host).includes("host-secret"), false, "host validation response must not echo secrets");

  const executionRoute = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-helper-execution",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      helper_execution_id: "ADAPTER-OSISO-HELPER-0188-BUNDLED",
      host_validation_id: host.host_validation_id,
      runner_id: runner.runner_id,
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=helper-secret`,
      requested_provider: compatibleProvider,
      helper_environment: {
        platform: process.platform,
        notes: `${projectRoot} token=helper-secret`,
        helper_exit_code: 0,
        stdout_sha256: "1".repeat(64),
        stderr_sha256: "2".repeat(64),
        command_override: "caller-owned-helper",
        argv_override: ["--claim-os-enforced"],
        env_override: { TOKEN: "helper-secret" }
      }
    }
  });
  assert.equal(executionRoute.status, 200, JSON.stringify(executionRoute.body));
  const execution = executionRoute.body.helper_execution;
  assert.equal(execution.ok, true, "bundled helper should run under fixed argv/env after host validation");
  assert.equal(execution.helper_execution_status, "provider_helper_execution_attempted");
  assert.equal(execution.provider_helper_attempted, true);
  assert.equal(execution.provider_helper_execution.helper_source, "service_owned_provider_helper_config");
  assert.equal(execution.provider_helper_execution.helper_binary_sha256, runner.provider_runner_resolution.runner_binary_sha256);
  assert.match(execution.provider_helper_execution.helper_args_prefix_sha256, /^[a-f0-9]{64}$/);
  assert.equal(execution.provider_helper_execution.helper_args_prefix_count > 0, true);
  assert.equal(execution.provider_helper_execution.helper_exit_code, 0);
  assert.notEqual(execution.provider_helper_execution.stdout_sha256, "1".repeat(64), "caller stdout hash must not be accepted");
  assert.notEqual(execution.provider_helper_execution.stderr_sha256, "2".repeat(64), "caller stderr hash must not be accepted");
  assert.equal(execution.provider_helper_execution.runtime_attestation_source, "helper_stdout_json");
  assert.equal(execution.provider_helper_execution.runtime_attestation_bound, true);
  assert.match(execution.provider_helper_execution.runtime_attestation_sha256, /^[a-f0-9]{64}$/);
  assert.equal(execution.provider_helper_execution.shell, false);
  assert.equal(execution.provider_helper_execution.network_policy, "disabled");
  assert.equal(execution.adapter_execution_isolation.os_enforced, false, "bundled helper runtime attestation is not OS-enforcement evidence");
  assert.equal(execution.proof_authority, "none");
  assert.equal(execution.can_certify_ga, false);
  assert.equal(existsSync(join(projectRoot, execution.helper_execution_path)), true);
  assert.equal(JSON.stringify(execution).includes(projectRoot), false, "helper execution response must not echo host paths");
  assert.equal(JSON.stringify(execution).includes(process.execPath), false, "helper execution response must not expose executable paths");
  assert.equal(JSON.stringify(execution).includes("caller-owned-helper"), false, "caller helper command overrides must not be persisted");
  assert.equal(JSON.stringify(execution).includes("helper-secret"), false, "helper execution response must not echo secrets");

  const routeCollection = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-helper-collection",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      collection_id: "ADAPTER-OSISO-HELPER-COLLECT-0188-ROUTE-SPOOF",
      helper_execution_id: execution.helper_execution_id,
      runner_id: runner.runner_id,
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=collection-route-secret`,
      requested_provider: compatibleProvider,
      collection_environment: {
        platform: process.platform,
        notes: `${projectRoot} token=collection-route-secret`,
        process_isolation_enforced: true,
        filesystem_scope_enforced: true,
        network_isolation_enforced: true,
        no_new_privileges: true,
        escape_prevention: true,
        adapter_process_exit_code: 0,
        stdout_sha256: execution.provider_helper_execution.stdout_sha256,
        stderr_sha256: execution.provider_helper_execution.stderr_sha256,
        transcript_sha256: execution.provider_helper_execution.transcript_sha256
      }
    }
  });
  assert.equal(routeCollection.status, 200, JSON.stringify(routeCollection.body));
  assert.equal(routeCollection.body.collection.ok, false, "public route callers cannot turn bundled helper output into readiness evidence");
  assert.equal(routeCollection.body.collection.collection_status, "blocked_provider_helper_collection_incomplete_os_enforcement");
  assert.equal(routeCollection.body.collection.provider_helper_collection.hashes_match_helper_execution, true);
  assert.equal(routeCollection.body.collection.provider_helper_collection.os_enforcement_complete, false);
  assert.equal(routeCollection.body.collection.adapter_execution_isolation.os_enforced, false);
  assert.equal(routeCollection.body.collection.can_certify_ga, false);

  const collected = collectAgentAdapterOsIsolationProviderHelperExecutionEvidence(projectRoot, {
    project_id: projectId,
    collection_id: "ADAPTER-OSISO-HELPER-COLLECT-0188-BUNDLED",
    helper_execution_id: execution.helper_execution_id,
    runner_id: runner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=collector-secret`,
    requested_provider: compatibleProvider,
    collection_environment: {
      platform: process.platform,
      notes: `${projectRoot} token=collector-secret`
    }
  }, {
    provider_helper_collection_probe: (probeInput) => {
      assert.equal(probeInput.helper_execution_id, execution.helper_execution_id);
      assert.equal(probeInput.helper_exit_code, 0);
      assert.equal(probeInput.stdout_sha256, execution.provider_helper_execution.stdout_sha256);
      assert.equal(probeInput.stderr_sha256, execution.provider_helper_execution.stderr_sha256);
      assert.equal(probeInput.transcript_sha256, execution.provider_helper_execution.transcript_sha256);
      return {
        probe_source: "service_owned_provider_helper_collection_probe",
        collection_source: "service_owned_os_probe",
        process_isolation_enforced: true,
        filesystem_scope_enforced: true,
        network_isolation_enforced: true,
        no_new_privileges: true,
        escape_prevention: true,
        adapter_process_exit_code: 0,
        stdout_sha256: execution.provider_helper_execution.stdout_sha256,
        stderr_sha256: execution.provider_helper_execution.stderr_sha256,
        transcript_sha256: execution.provider_helper_execution.transcript_sha256,
        provider_tool_execution_witness: providerToolExecutionWitness(probeInput),
        provider_family_os_enforcement_witness: providerFamilyOsEnforcementWitness(probeInput),
        provider_specific_live_probe_attempt: providerSpecificLiveProbeAttempt(probeInput),
        provider_specific_live_probe_execution: providerSpecificLiveProbeExecution(probeInput),
        diagnostics: [`${projectRoot} collector diagnostic must be scrubbed`, "task188 bundled helper collection succeeded"]
      };
    }
  });
  assert.equal(collected.ok, true, "internal service-owned collection remains the only path to canonical OS evidence");
  assert.equal(collected.collection_status, "provider_helper_os_evidence_collected");
  assert.equal(collected.provider_helper_collection.runtime_attestation_bound, true);
  assert.equal(collected.provider_helper_collection.provider_tool_execution_witness_bound, true);
  assert.equal(collected.probe.ok, true);
  assert.equal(collected.probe.evidence.collection_source, "service_owned_os_probe");
  assert.equal(collected.adapter_execution_isolation.os_enforced, false, "helper collection wrapper is not readiness evidence by itself");
  assert.equal(collected.probe.adapter_execution_isolation.os_enforced, true);
  assert.equal(collected.proof_authority, "none");
  assert.equal(collected.can_certify_ga, false);
  assert.equal(JSON.stringify(collected).includes(projectRoot), false, "collected manifest must not echo host paths");
  assert.equal(JSON.stringify(collected).includes("collector-secret"), false, "collected manifest must not echo secrets");

  const readiness = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0188-READY-FROM-BUNDLED-HELPER-CANONICAL-EVIDENCE",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task188-test",
    evidence_path: collected.probe.evidence_path
  });
  assert.equal(readiness.ok, true, "readiness still consumes only canonical probe/evidence artifacts");
  assert.equal(readiness.checks.provider_tool_execution_witness.ok, true);
  assert.equal(readiness.can_certify_ga, false);

  const notEvidence = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0188-BUNDLED-HELPER-EXECUTION-NOT-EVIDENCE",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task188-test",
    evidence_path: execution.helper_execution_path
  });
  assert.equal(notEvidence.ok, false, "bundled helper execution manifest is still not readiness evidence");
  assert.equal(
    notEvidence.vetoes.some((veto) => veto.code === "adapter_os_isolation_evidence_not_service_owned_probe"),
    true
  );
} finally {
  for (const [key, value] of savedEnv.entries()) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task188 bundled provider helper asset tests passed.");
