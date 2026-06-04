import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

function canonicalJson(value) {
  return `${JSON.stringify(sortJson(value))}\n`;
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

function sha256Text(text) {
  return createHash("sha256").update(text).digest("hex");
}

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

const providerHelpers = {
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
const compatibleHelper = providerHelpers[compatibleProvider];

assert.equal(
  getComathdStatus().capabilities.includes("agent_adapter_os_isolation_provider_helper_self_test_contract"),
  true,
  "Task185 service capability ledger must advertise the provider-helper self-test contract"
);

const fallbackHelperEnvVar = "COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER";
const fallbackHelperArgsEnvVar = "COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER_ARGS_JSON";
const previousProviderHelper = process.env[compatibleHelper.helperEnv];
const previousProviderHelperArgs = process.env[compatibleHelper.argsEnv];
const previousFallbackHelper = process.env[fallbackHelperEnvVar];
const previousFallbackHelperArgs = process.env[fallbackHelperArgsEnvVar];
const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task185-helper-self-test-"));

try {
  const helperBinarySha256 = sha256File(process.execPath);
  const init = initProject({ name: "Goal3 Task185 Provider Helper Self Test", root_path: projectRoot });
  const projectId = init.project.project_id;

  process.env[compatibleHelper.helperEnv] = process.execPath;
  delete process.env[compatibleHelper.argsEnv];
  delete process.env[fallbackHelperEnvVar];
  delete process.env[fallbackHelperArgsEnvVar];

  const launch = prepareAgentAdapterOsIsolationSandboxLaunch(projectRoot, {
    project_id: projectId,
    launch_id: "ADAPTER-OSISO-LAUNCH-0185-SELF-TEST",
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=launch-secret`,
    requested_provider: compatibleProvider,
    launcher_environment: {
      platform: process.platform,
      notes: `${projectRoot} password=launch-secret`
    }
  }, {
    launcher_probe: (probeInput) => {
      assert.equal(probeInput.provider, compatibleProvider);
      return {
        probe_source: "service_owned_launcher_preflight",
        provider_available: true,
        launcher_binary_sha256: "a".repeat(64),
        launcher_version: `${compatibleProvider}-launcher-1.0`,
        diagnostics: [`${projectRoot} launcher diagnostic must be scrubbed`, "launcher ready"]
      };
    }
  });
  assert.equal(launch.ok, true);

  const server = createComathServer();
  const routeRunner = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-runner",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      runner_id: "ADAPTER-OSISO-RUNNER-0185-SELF-TEST",
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=runner-secret`,
      requested_provider: compatibleProvider,
      runner_environment: {
        platform: process.platform,
        notes: `${projectRoot} token=runner-secret`,
        command_override: "caller-owned-runner",
        argv_override: ["--unsafe"]
      }
    }
  });
  assert.equal(routeRunner.status, 200, JSON.stringify(routeRunner.body));
  const readyRunner = routeRunner.body.runner;
  assert.equal(readyRunner.ok, true);
  assert.equal(readyRunner.provider, compatibleProvider);
  assert.equal(readyRunner.provider_runner_resolution.runner_binary_sha256, helperBinarySha256);

  const hostCapability = probeAgentAdapterOsIsolationProviderHostCapability(projectRoot, {
    project_id: projectId,
    host_capability_probe_id: "ADAPTER-OSISO-HOST-CAP-0185-SELF-TEST",
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=host-capability-secret`,
    requested_provider: compatibleProvider,
    host_capability_environment: {
      platform: "host-capability-caller-platform-ignored",
      notes: `${projectRoot} password=host-capability-secret`
    }
  }, {
    provider_host_capability_probe: (probeInput) => {
      assert.equal(probeInput.provider, compatibleProvider);
      assert.equal(probeInput.platform, process.platform);
      return {
        probe_source: "service_owned_provider_host_capability_probe",
        provider_host_capability_available: true,
        capability_facts: ["task185 self-test host-validation prerequisite observed"],
        required_tools: [{ name: providerHostCapabilityToolName(compatibleProvider), present: true, binary_sha256: helperBinarySha256, version: null }],
        kernel_features: ["task185-provider-host-capability"],
        diagnostics: [`${projectRoot} host capability diagnostic must be scrubbed`, "host capability observed"]
      };
    }
  });
  assert.equal(hostCapability.ok, true, "Task191 requires service-owned host capability before helper self-test validation");

  const badHostRoute = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-helper-host-validation",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0185-SELF-TEST-FAIL",
      host_capability_probe_id: hostCapability.host_capability_probe_id,
      runner_id: readyRunner.runner_id,
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=bad-host-secret`,
      requested_provider: compatibleProvider,
      host_environment: {
        platform: "caller-spoofed-platform",
        notes: `${projectRoot} token=bad-host-secret`,
        helper_host_ready: true,
        helper_exit_code: 0,
        stdout_sha256: "1".repeat(64),
        stderr_sha256: "2".repeat(64),
        command_override: "caller-owned-host-validator"
      }
    }
  });
  assert.equal(badHostRoute.status, 200, JSON.stringify(badHostRoute.body));
  const badHost = badHostRoute.body.host_validation;
  assert.equal(badHost.ok, false, "an arbitrary executable must not pass host validation without the CoMath helper self-test protocol");
  assert.equal(badHost.host_validation_status, "blocked_provider_helper_host_self_test_failed");
  assert.equal(badHost.provider_helper_host_ready, false);
  assert.equal(badHost.provider_helper_host_validation.helper_binary_sha256, helperBinarySha256);
  assert.equal(badHost.provider_helper_host_validation.runner_binary_sha256, helperBinarySha256);
  assert.equal(badHost.provider_helper_host_validation.hashes_match_provider_runner, true);
  assert.equal(badHost.provider_helper_host_validation.platform, process.platform);
  assert.equal(badHost.provider_helper_host_validation.platform_supported, true);
  assert.equal(badHost.provider_helper_host_validation.self_test_required, true);
  assert.equal(badHost.provider_helper_host_validation.self_test_passed, false);
  assert.notEqual(badHost.provider_helper_host_validation.self_test_exit_code, 0);
  assert.match(badHost.provider_helper_host_validation.self_test_stdout_sha256 ?? "", /^[a-f0-9]{64}$/);
  assert.match(badHost.provider_helper_host_validation.self_test_stderr_sha256 ?? "", /^[a-f0-9]{64}$/);
  assert.match(badHost.provider_helper_host_validation.self_test_transcript_sha256 ?? "", /^[a-f0-9]{64}$/);
  assert.equal(badHost.provider_helper_host_validation.self_test_args_prefix_sha256, null);
  assert.equal(badHost.provider_helper_host_validation.self_test_args_prefix_count, 0);
  assert.match(badHost.provider_helper_host_validation.self_test_fixed_args_sha256, /^[a-f0-9]{64}$/);
  assert.equal(badHost.adapter_execution_isolation.os_enforced, false);
  assert.equal(badHost.proof_authority, "none");
  assert.equal(badHost.can_promote_claim, false);
  assert.equal(badHost.can_certify_ga, false);
  assert.equal(JSON.stringify(badHost).includes(projectRoot), false, "failed self-test host validation must not echo host paths");
  assert.equal(JSON.stringify(badHost).includes(process.execPath), false, "failed self-test host validation must not echo helper executable path");
  assert.equal(JSON.stringify(badHost).includes("bad-host-secret"), false, "failed self-test host validation must not echo secrets");
  assert.equal(JSON.stringify(badHost).includes("caller-owned-host-validator"), false, "caller command overrides must not be persisted");

  const blockedExecutionRoute = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-helper-execution",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      helper_execution_id: "ADAPTER-OSISO-HELPER-0185-BLOCKED-BY-SELF-TEST",
      host_validation_id: badHost.host_validation_id,
      runner_id: readyRunner.runner_id,
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=blocked-helper-secret`,
      requested_provider: compatibleProvider,
      helper_environment: {
        platform: process.platform,
        notes: `${projectRoot} token=blocked-helper-secret`,
        helper_exit_code: 0,
        stdout_sha256: "3".repeat(64),
        stderr_sha256: "4".repeat(64),
        command_override: "caller-owned-helper"
      }
    }
  });
  assert.equal(blockedExecutionRoute.status, 200, JSON.stringify(blockedExecutionRoute.body));
  const blockedExecution = blockedExecutionRoute.body.helper_execution;
  assert.equal(blockedExecution.ok, false);
  assert.equal(blockedExecution.helper_execution_status, "blocked_provider_helper_host_validation_not_validated");
  assert.equal(blockedExecution.provider_helper_attempted, false);
  assert.equal(blockedExecution.provider_helper_host_validation_binding.host_validation_status, "blocked_provider_helper_host_self_test_failed");
  assert.equal(blockedExecution.provider_helper_execution.helper_binary_sha256, null);
  assert.equal(blockedExecution.can_certify_ga, false);
  assert.equal(JSON.stringify(blockedExecution).includes(projectRoot), false);
  assert.equal(JSON.stringify(blockedExecution).includes("blocked-helper-secret"), false);

  const helperScript = join(projectRoot, "task185-provider-helper.mjs");
  writeFileSync(
    helperScript,
    [
      "const args = process.argv.slice(2);",
      "const valueAfter = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : null; };",
      "const provider = valueAfter('--provider');",
      "const networkPolicy = valueAfter('--network-policy');",
      "const proofAuthority = valueAfter('--proof-authority');",
      "if (args.includes('--comath-provider-helper-self-test')) {",
      "  console.log(JSON.stringify({",
      "    comath_provider_helper_self_test: true,",
      "    ok: true,",
      "    provider,",
      "    network_policy: networkPolicy,",
      "    proof_authority: proofAuthority,",
      "    adapter: process.env.COMATH_ADAPTER_ID,",
      "    backend: process.env.COMATH_ADAPTER_BACKEND,",
      "    project_id: process.env.COMATH_PROJECT_ID,",
      "    host_validation_id: valueAfter('--host-validation-id'),",
      "    runner_id: valueAfter('--runner-id'),",
      "    launch_id: valueAfter('--launch-id')",
      "  }));",
      "  console.error('task185 helper self-test stderr ok');",
      "  process.exit(0);",
      "}",
      "console.log(JSON.stringify({",
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
      "  launch_id: process.env.COMATH_SANDBOX_LAUNCH_ID,",
      "  args",
      "}));",
      "console.error('task185 provider helper execution stderr ok');"
    ].join("\n"),
    "utf8"
  );
  process.env[compatibleHelper.argsEnv] = JSON.stringify([helperScript]);
  const helperArgsPrefixSha256 = sha256Text(canonicalJson([helperScript]));

  const goodHostRoute = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-helper-host-validation",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0185-SELF-TEST-PASS",
      host_capability_probe_id: hostCapability.host_capability_probe_id,
      runner_id: readyRunner.runner_id,
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=good-host-secret`,
      requested_provider: compatibleProvider,
      host_environment: {
        platform: "caller-spoofed-platform",
        notes: `${projectRoot} token=good-host-secret`,
        helper_host_ready: false,
        command_override: "caller-owned-good-host-validator"
      }
    }
  });
  assert.equal(goodHostRoute.status, 200, JSON.stringify(goodHostRoute.body));
  const goodHost = goodHostRoute.body.host_validation;
  assert.equal(goodHost.ok, true);
  assert.equal(goodHost.host_validation_status, "provider_helper_host_validated");
  assert.equal(goodHost.provider_helper_host_ready, true);
  assert.equal(goodHost.provider_helper_host_validation.self_test_required, true);
  assert.equal(goodHost.provider_helper_host_validation.self_test_passed, true);
  assert.equal(goodHost.provider_helper_host_validation.self_test_exit_code, 0);
  assert.equal(goodHost.provider_helper_host_validation.self_test_args_prefix_sha256, helperArgsPrefixSha256);
  assert.equal(goodHost.provider_helper_host_validation.self_test_args_prefix_count, 1);
  assert.match(goodHost.provider_helper_host_validation.self_test_fixed_args_sha256, /^[a-f0-9]{64}$/);
  assert.match(goodHost.provider_helper_host_validation.self_test_stdout_sha256, /^[a-f0-9]{64}$/);
  assert.match(goodHost.provider_helper_host_validation.self_test_stderr_sha256, /^[a-f0-9]{64}$/);
  assert.match(goodHost.provider_helper_host_validation.self_test_transcript_sha256, /^[a-f0-9]{64}$/);
  assert.equal(goodHost.adapter_execution_isolation.os_enforced, false);
  assert.equal(goodHost.proof_authority, "none");
  assert.equal(goodHost.can_promote_claim, false);
  assert.equal(goodHost.can_certify_ga, false);
  assert.equal(JSON.stringify(goodHost).includes(projectRoot), false, "passed self-test host validation must not echo host paths");
  assert.equal(JSON.stringify(goodHost).includes(helperScript), false, "passed self-test host validation must not echo helper script path");
  assert.equal(JSON.stringify(goodHost).includes("good-host-secret"), false, "passed self-test host validation must not echo secrets");
  assert.equal(JSON.stringify(goodHost).includes("caller-spoofed-platform"), false, "caller platform string must not drive default host validation");

  const notHostEvidence = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0185-SELF-TEST-HOST-NOT-EVIDENCE",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task185-test",
    evidence_path: goodHost.host_validation_path
  });
  assert.equal(notHostEvidence.ok, false, "self-tested host validation is still not readiness evidence");

  const executionRoute = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-helper-execution",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      helper_execution_id: "ADAPTER-OSISO-HELPER-0185-SELF-TEST-EXEC",
      host_validation_id: goodHost.host_validation_id,
      runner_id: readyRunner.runner_id,
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=exec-secret`,
      requested_provider: compatibleProvider,
      helper_environment: {
        platform: process.platform,
        notes: `${projectRoot} token=exec-secret`,
        helper_exit_code: 0,
        stdout_sha256: "5".repeat(64),
        stderr_sha256: "6".repeat(64),
        command_override: "caller-owned-execution-helper"
      }
    }
  });
  assert.equal(executionRoute.status, 200, JSON.stringify(executionRoute.body));
  const helperExecution = executionRoute.body.helper_execution;
  assert.equal(helperExecution.ok, true);
  assert.equal(helperExecution.helper_execution_status, "provider_helper_execution_attempted");
  assert.equal(helperExecution.provider_helper_attempted, true);
  assert.equal(helperExecution.provider_helper_execution.helper_args_prefix_sha256, helperArgsPrefixSha256);
  assert.equal(helperExecution.provider_helper_execution.helper_args_prefix_count, 1);
  assert.equal(helperExecution.provider_helper_execution.helper_exit_code, 0);
  assert.equal(helperExecution.adapter_execution_isolation.os_enforced, false);
  assert.equal(helperExecution.proof_authority, "none");
  assert.equal(helperExecution.can_certify_ga, false);
  assert.equal(JSON.stringify(helperExecution).includes(projectRoot), false);
  assert.equal(JSON.stringify(helperExecution).includes(helperScript), false);
  assert.equal(JSON.stringify(helperExecution).includes("exec-secret"), false);

  const collected = collectAgentAdapterOsIsolationProviderHelperExecutionEvidence(projectRoot, {
    project_id: projectId,
    collection_id: "ADAPTER-OSISO-HELPER-COLLECT-0185-SELF-TEST",
    helper_execution_id: helperExecution.helper_execution_id,
    runner_id: readyRunner.runner_id,
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
      assert.equal(probeInput.helper_execution_id, helperExecution.helper_execution_id);
      return {
        probe_source: "service_owned_provider_helper_collection_probe",
        collection_source: "service_owned_os_probe",
        process_isolation_enforced: true,
        filesystem_scope_enforced: true,
        network_isolation_enforced: true,
        no_new_privileges: true,
        escape_prevention: true,
        adapter_process_exit_code: 0,
        stdout_sha256: helperExecution.provider_helper_execution.stdout_sha256,
        stderr_sha256: helperExecution.provider_helper_execution.stderr_sha256,
        transcript_sha256: helperExecution.provider_helper_execution.transcript_sha256,
        provider_tool_execution_witness: providerToolExecutionWitness(probeInput),
        provider_family_os_enforcement_witness: providerFamilyOsEnforcementWitness(probeInput),
        provider_specific_live_probe_attempt: providerSpecificLiveProbeAttempt(probeInput),
        provider_specific_live_probe_execution: providerSpecificLiveProbeExecution(probeInput),
        diagnostics: [`${projectRoot} collector diagnostic must be scrubbed`, "task185 helper collection succeeded"]
      };
    }
  });
  assert.equal(collected.ok, true);
  assert.equal(collected.collection_status, "provider_helper_os_evidence_collected");
  assert.equal(collected.provider_helper_collection.provider_tool_execution_witness_bound, true);
  assert.equal(collected.adapter_execution_isolation.os_enforced, false, "helper collection wrapper is not readiness evidence by itself");
  assert.equal(collected.probe.adapter_execution_isolation.os_enforced, true);
  assert.equal(collected.proof_authority, "none");
  assert.equal(collected.can_certify_ga, false);
  assert.equal(JSON.stringify(collected).includes(projectRoot), false);
  assert.equal(JSON.stringify(collected).includes("collector-secret"), false);

  const readiness = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0185-READY-FROM-CANONICAL-EVIDENCE",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task185-test",
    evidence_path: collected.probe.evidence_path
  });
  assert.equal(readiness.ok, true, "only canonical collected evidence should pass the readiness gate");
  assert.equal(readiness.checks.provider_tool_execution_witness.ok, true);
  assert.equal(readiness.can_certify_ga, false);
} finally {
  if (previousProviderHelper === undefined) {
    delete process.env[compatibleHelper.helperEnv];
  } else {
    process.env[compatibleHelper.helperEnv] = previousProviderHelper;
  }
  if (previousProviderHelperArgs === undefined) {
    delete process.env[compatibleHelper.argsEnv];
  } else {
    process.env[compatibleHelper.argsEnv] = previousProviderHelperArgs;
  }
  if (previousFallbackHelper === undefined) {
    delete process.env[fallbackHelperEnvVar];
  } else {
    process.env[fallbackHelperEnvVar] = previousFallbackHelper;
  }
  if (previousFallbackHelperArgs === undefined) {
    delete process.env[fallbackHelperArgsEnvVar];
  } else {
    process.env[fallbackHelperArgsEnvVar] = previousFallbackHelperArgs;
  }
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task185 provider helper self-test contract tests passed.");
