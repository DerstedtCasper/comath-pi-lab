import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
  runAgentAdapterOsIsolationProviderHelperExecution,
  validateAgentAdapterOsIsolationProviderHelperHost
} from "../../dist/index.js";

function readRepoFile(relativePath) {
  const here = dirname(fileURLToPath(import.meta.url));
  const repoRoot = join(here, "../../../..");
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function sha256Text(text) {
  return createHash("sha256").update(text).digest("hex");
}

function createMacosSandboxExecHelperScript(projectRoot) {
  const helperScript = join(projectRoot, "task235-macos-sandbox-exec-provider-helper.mjs");
  writeFileSync(
    helperScript,
    [
      "const args = process.argv.slice(2);",
      "const valueAfter = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : null; };",
      "if (args.includes('--comath-provider-helper-self-test')) {",
      "  console.log(JSON.stringify({",
      "    comath_provider_helper_self_test: true,",
      "    ok: true,",
      "    provider: valueAfter('--provider'),",
      "    network_policy: valueAfter('--network-policy'),",
      "    proof_authority: valueAfter('--proof-authority'),",
      "    adapter: process.env.COMATH_ADAPTER_ID,",
      "    backend: process.env.COMATH_ADAPTER_BACKEND,",
      "    project_id: process.env.COMATH_PROJECT_ID,",
      "    host_validation_id: valueAfter('--host-validation-id'),",
      "    runner_id: valueAfter('--runner-id'),",
      "    launch_id: valueAfter('--launch-id')",
      "  }));",
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
      "  launch_id: process.env.COMATH_SANDBOX_LAUNCH_ID",
      "}));"
    ].join("\n"),
    "utf8"
  );
  return helperScript;
}

function assertMacosSandboxExecProfileContract(contract, source, helperSha256, message) {
  assert.ok(contract, `${message}: production helper profile contract must be present`);
  assert.equal(contract.contract_source, "service_owned_macos_sandbox_exec_production_helper_profile_contract");
  assert.equal(contract.provider, "macos_sandbox_exec");
  assert.equal(contract.provider_family, "macos_sandbox_exec");
  assert.equal(contract.helper_profile_source, source);
  assert.equal(contract.production_helper_configured, source === "operator_configured_provider_helper");
  assert.equal(contract.bundled_protocol_asset, source === "bundled_provider_helper_protocol_asset");
  assert.equal(contract.helper_binary_sha256, helperSha256);
  assert.deepEqual(contract.accepted_profile_sources, [
    "operator_configured_provider_helper",
    "bundled_provider_helper_protocol_asset"
  ]);
  assert.deepEqual(contract.required_host_facility_tools, ["macos_sandbox_exec_cli"]);
  assert.equal(contract.runtime_family, "macos_sandbox_exec_no_network_profile");
  assert.equal(contract.runner_network_policy, "disabled");
  assert.equal(contract.no_new_privileges_required, true);
  assert.equal(contract.command_override_allowed, false);
  assert.equal(contract.environment_override_allowed, false);
  assert.equal(contract.macos_sandbox_profile_or_policy_inspection_allowed, false);
  assert.equal(contract.macos_sandbox_exec_command_execution_required_for_profile_contract, false);
  assert.equal(contract.caller_supplied_success_allowed, false);
  assert.equal(contract.proof_authority, "none");
  assert.equal(contract.can_promote_claim, false);
  assert.equal(contract.can_certify_ga, false);
  assert.match(contract.profile_contract_sha256, /^[a-f0-9]{64}$/);
}

const helperEnvVar = "COMATH_AGENT_ADAPTER_OSISO_MACOS_SANDBOX_EXEC_HELPER";
const helperArgsEnvVar = "COMATH_AGENT_ADAPTER_OSISO_MACOS_SANDBOX_EXEC_HELPER_ARGS_JSON";
const fallbackHelperEnvVar = "COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER";
const fallbackHelperArgsEnvVar = "COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER_ARGS_JSON";
const previousHelper = process.env[helperEnvVar];
const previousHelperArgs = process.env[helperArgsEnvVar];
const previousFallbackHelper = process.env[fallbackHelperEnvVar];
const previousFallbackHelperArgs = process.env[fallbackHelperArgsEnvVar];
const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task235-macos-sandbox-exec-production-helper-profile-"));

try {
  assert.equal(
    getComathdStatus().capabilities.includes(
      "agent_adapter_os_isolation_macos_sandbox_exec_production_helper_profile_contract"
    ),
    true,
    "Task235 capability ledger must advertise the macOS sandbox-exec production-helper profile contract without claiming GA"
  );

  const focusedTestName = "goal3-task235-agent-adapter-os-isolation-macos-sandbox-exec-production-helper-profile-contract.test.mjs";
  assert.equal(readRepoFile("scripts/phase0-smoke.mjs").includes(focusedTestName), true);
  assert.equal(readRepoFile("docs/architecture/ga-release-criteria.md").includes(focusedTestName), true);
  for (const [path, pattern] of [
    ["README.md", /Task235.*macOS.*sandbox-exec.*production-helper profile contract/s],
    ["AGENTS.md", /Task235.*macOS.*sandbox-exec.*production-helper profile contract/s],
    ["TODO.md", /Task213-235 summary/s],
    ["REVIEW.md", /Goal 3 Task 235/s],
    ["config/README.md", /Task235.*macOS.*sandbox-exec.*production-helper profile contract/s],
    ["docs/architecture/adapter-contracts.md", /Task235.*macOS.*sandbox-exec.*production-helper profile contract/s],
    ["docs/architecture/threat-model.md", /Task235.*macOS.*sandbox-exec.*production-helper profile contract/s]
  ]) {
    assert.match(readRepoFile(path), pattern, `${path} must document Task235 without overclaiming`);
  }
  const sampleConfig = JSON.parse(readRepoFile("config/comath.sample.json"));
  const providerConfig = sampleConfig?.agentAdapterOsIsolation?.providerHelpers?.find(
    (entry) => entry?.provider === "macos_sandbox_exec"
  );
  assert.equal(providerConfig?.productionHelperProfileContractRequired, true);
  assert.equal(providerConfig?.productionHelperProfileContractKind, "macos_sandbox_exec_no_network_profile_contract");
  assert.deepEqual(providerConfig?.productionHelperProfileSources, [
    "operator_configured_provider_helper",
    "bundled_provider_helper_protocol_asset"
  ]);
  assert.deepEqual(providerConfig?.requiredHostFacilityTools, ["macos_sandbox_exec_cli"]);

  const helperScript = createMacosSandboxExecHelperScript(projectRoot);
  process.env[helperEnvVar] = process.execPath;
  process.env[helperArgsEnvVar] = JSON.stringify([helperScript]);
  delete process.env[fallbackHelperEnvVar];
  delete process.env[fallbackHelperArgsEnvVar];

  const helperSha256 = sha256File(process.execPath);
  const init = initProject({ name: "Goal3 Task235 macOS sandbox-exec Production Helper Profile", root_path: projectRoot });
  const projectId = init.project.project_id;
  const launch = prepareAgentAdapterOsIsolationSandboxLaunch(projectRoot, {
    project_id: projectId,
    launch_id: "ADAPTER-OSISO-LAUNCH-0235-MACOS-SANDBOX-EXEC",
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=launch-secret`,
    requested_provider: "macos_sandbox_exec",
    launcher_environment: {
      platform: process.platform,
      notes: `${projectRoot} token=launch-secret`
    }
  }, {
    launcher_probe: () => ({
      probe_source: "service_owned_launcher_preflight",
      provider_available: true,
      launcher_binary_sha256: "a".repeat(64),
      launcher_version: "macOS sandbox-exec-launcher-Task235",
      diagnostics: [`${projectRoot} launcher diagnostic must be scrubbed`, "launcher ready"]
    })
  });
  assert.equal(launch.ok, true);

  const misconfiguredSandboxExec = join(projectRoot, "sandbox-exec");
  writeFileSync(misconfiguredSandboxExec, "#!/bin/sh\nexit 0\n", "utf8");
  chmodSync(misconfiguredSandboxExec, 0o755);
  process.env[helperEnvVar] = misconfiguredSandboxExec;
  process.env[helperArgsEnvVar] = JSON.stringify([]);
  const badRunner = prepareAgentAdapterOsIsolationProviderRunner(projectRoot, {
    project_id: projectId,
    runner_id: "ADAPTER-OSISO-RUNNER-0235-MACOS-SANDBOX-EXEC-BAD-HELPER",
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=bad-runner-secret`,
    requested_provider: "macos_sandbox_exec",
    runner_environment: {
      platform: process.platform,
      notes: `${projectRoot} token=bad-runner-secret`
    }
  });
  assert.equal(badRunner.ok, false, "macOS provider helper must not accept sandbox-exec itself as helper");
  assert.equal(badRunner.runner_status, "blocked_provider_runner_unavailable");
  assert.equal(JSON.stringify(badRunner).includes(misconfiguredSandboxExec), false);
  assert.match(
    JSON.stringify(badRunner.provider_runner_resolution.diagnostics),
    /sandbox-exec facility tool cannot be used as the CoMath provider-helper protocol executable/
  );

  process.env[helperEnvVar] = process.execPath;
  process.env[helperArgsEnvVar] = JSON.stringify([helperScript]);

  const runner = prepareAgentAdapterOsIsolationProviderRunner(projectRoot, {
    project_id: projectId,
    runner_id: "ADAPTER-OSISO-RUNNER-0235-MACOS-SANDBOX-EXEC",
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=runner-secret`,
    requested_provider: "macos_sandbox_exec",
    runner_environment: {
      platform: process.platform,
      notes: `${projectRoot} token=runner-secret`,
      macos_sandbox_exec_profile_path: `${projectRoot}/etc/macos-sandbox-exec/profile`
    }
  });
  assert.equal(runner.ok, true);
  assert.equal(runner.provider, "macos_sandbox_exec");
  assert.equal(runner.provider_runner_resolution.runner_binary_sha256, helperSha256);
  assert.equal(runner.provider_runner_resolution.helper_profile_source, "operator_configured_provider_helper");
  assertMacosSandboxExecProfileContract(
    runner.provider_runner_resolution.production_helper_profile_contract,
    "operator_configured_provider_helper",
    helperSha256,
    "runner"
  );
  assert.equal(runner.provider_runner_contract.network_policy, "disabled");
  assert.equal(JSON.stringify(runner).includes(projectRoot), false);
  assert.equal(JSON.stringify(runner).includes(process.execPath), false);
  assert.equal(JSON.stringify(runner).includes("runner-secret"), false);
  assert.equal(JSON.stringify(runner).includes("macos-sandbox-exec/profile"), false);

  const hostCapability = probeAgentAdapterOsIsolationProviderHostCapability(projectRoot, {
    project_id: projectId,
    host_capability_probe_id: "ADAPTER-OSISO-HOST-CAP-0235-MACOS-SANDBOX-EXEC",
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=host-cap-secret`,
    requested_provider: "macos_sandbox_exec",
    host_capability_environment: {
      platform: process.platform,
      notes: `${projectRoot} token=host-cap-secret`,
      macos_sandbox_exec_profile_path: `${projectRoot}/etc/macos-sandbox-exec/profile`
    }
  }, {
    provider_host_capability_probe: () => ({
      probe_source: "service_owned_provider_host_capability_probe",
      provider_host_capability_available: true,
      capability_facts: ["Task235 macOS sandbox-exec host capability observed"],
      required_tools: [{ name: "macos_sandbox_exec_cli", present: true, version: null, binary_sha256: helperSha256 }],
      kernel_features: ["task235-macos-sandbox-exec-host-capability"],
      diagnostics: [`${projectRoot} host capability diagnostic must be scrubbed`, "macOS sandbox-exec capability observed"]
    })
  });
  const macosSandboxExecSupportedHost = process.platform === "darwin";
  assert.equal(hostCapability.ok, macosSandboxExecSupportedHost);
  assert.equal(hostCapability.can_certify_ga, false);
  assert.equal(hostCapability.proof_authority, "none");
  assert.equal(JSON.stringify(hostCapability).includes(projectRoot), false);
  assert.equal(JSON.stringify(hostCapability).includes("host-cap-secret"), false);
  assert.equal(
    hostCapability.provider_host_capability.required_tools.some((tool) => tool.name === "macos_sandbox_exec_cli"),
    true
  );

  if (!macosSandboxExecSupportedHost) {
    assert.equal(hostCapability.host_capability_status, "blocked_provider_host_capability_provider_unavailable");
    assert.equal(hostCapability.provider_host_capability.platform_supported, false);
  } else {
    assert.equal(hostCapability.host_capability_status, "provider_host_capability_observed");

    const hostValidator = ({ host_validation_id }) => ({
      validation_source: "service_owned_provider_helper_host_validator",
      helper_host_ready: true,
      helper_program: process.execPath,
      helper_binary_sha256: helperSha256,
      helper_version: "macOS sandbox-exec-helper-Task235",
      helper_profile_source: "operator_configured_provider_helper",
      production_helper_configured: true,
      bundled_protocol_asset: false,
      supported_platforms: [process.platform],
      self_test_required: true,
      self_test_passed: true,
      self_test_exit_code: 0,
      self_test_signal: null,
      self_test_timed_out: false,
      self_test_stdout_sha256: sha256Text(host_validation_id),
      self_test_stderr_sha256: sha256Text(""),
      self_test_transcript_sha256: sha256Text(`task235:${host_validation_id}`),
      self_test_args_prefix_sha256: sha256Text("task235-macos-sandbox-exec-prefix"),
      self_test_args_prefix_count: 1,
      self_test_fixed_args_sha256: sha256Text("task235-macos-sandbox-exec-fixed-args"),
      diagnostics: [`${projectRoot} host validator diagnostic must be scrubbed`, "macOS sandbox-exec helper host validated"]
    });

    const host = validateAgentAdapterOsIsolationProviderHelperHost(projectRoot, {
      project_id: projectId,
      host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0235-MACOS-SANDBOX-EXEC",
      host_capability_probe_id: hostCapability.host_capability_probe_id,
      runner_id: runner.runner_id,
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=host-secret`,
      requested_provider: "macos_sandbox_exec",
      host_environment: {
        platform: process.platform,
        notes: `${projectRoot} token=host-secret`
      }
    }, { provider_helper_host_validator: hostValidator });
    assert.equal(host.ok, true);
    assert.equal(host.provider_helper_host_validation.helper_profile_source, "operator_configured_provider_helper");
    assertMacosSandboxExecProfileContract(
      host.provider_helper_host_validation.production_helper_profile_contract,
      "operator_configured_provider_helper",
      helperSha256,
      "host validation"
    );
    assert.equal(
      host.provider_helper_host_validation.production_helper_profile_contract.profile_contract_sha256,
      runner.provider_runner_resolution.production_helper_profile_contract.profile_contract_sha256
    );
    assert.equal(JSON.stringify(host).includes(projectRoot), false);
    assert.equal(JSON.stringify(host).includes(process.execPath), false);
    assert.equal(JSON.stringify(host).includes("host-secret"), false);

    delete process.env[helperEnvVar];
    delete process.env[helperArgsEnvVar];
    const driftExecution = runAgentAdapterOsIsolationProviderHelperExecution(projectRoot, {
      project_id: projectId,
      helper_execution_id: "ADAPTER-OSISO-HELPER-0235-MACOS-SANDBOX-EXEC-DRIFT",
      host_validation_id: host.host_validation_id,
      runner_id: runner.runner_id,
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=helper-drift-secret`,
      requested_provider: "macos_sandbox_exec",
      helper_environment: {
        platform: process.platform,
        notes: `${projectRoot} token=helper-drift-secret`
      }
    });
    assert.equal(
      driftExecution.ok,
      false,
      "helper execution must fail closed if the macOS sandbox-exec helper profile source drifts after host validation"
    );
    assert.equal(driftExecution.helper_execution_status, "blocked_provider_helper_binary_mismatch");
    assert.equal(driftExecution.provider_helper_attempted, false);
    assert.equal(driftExecution.provider_helper_execution.helper_profile_source, "bundled_provider_helper_protocol_asset");
    assertMacosSandboxExecProfileContract(
      driftExecution.provider_helper_execution.production_helper_profile_contract,
      "bundled_provider_helper_protocol_asset",
      helperSha256,
      "drift execution"
    );
    assert.notEqual(
      driftExecution.provider_helper_execution.production_helper_profile_contract.profile_contract_sha256,
      runner.provider_runner_resolution.production_helper_profile_contract.profile_contract_sha256
    );

    process.env[helperEnvVar] = process.execPath;
    process.env[helperArgsEnvVar] = JSON.stringify([helperScript]);
    const helperExecution = runAgentAdapterOsIsolationProviderHelperExecution(projectRoot, {
      project_id: projectId,
      helper_execution_id: "ADAPTER-OSISO-HELPER-0235-MACOS-SANDBOX-EXEC",
      host_validation_id: host.host_validation_id,
      runner_id: runner.runner_id,
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=helper-secret`,
      requested_provider: "macos_sandbox_exec",
      helper_environment: {
        platform: process.platform,
        notes: `${projectRoot} token=helper-secret`
      }
    });
    assert.equal(helperExecution.ok, true);
    assert.equal(helperExecution.provider_helper_execution.helper_profile_source, "operator_configured_provider_helper");
    assertMacosSandboxExecProfileContract(
      helperExecution.provider_helper_execution.production_helper_profile_contract,
      "operator_configured_provider_helper",
      helperSha256,
      "helper execution"
    );
    assert.equal(
      helperExecution.provider_helper_execution.production_helper_profile_contract.profile_contract_sha256,
      runner.provider_runner_resolution.production_helper_profile_contract.profile_contract_sha256
    );
    assert.equal(helperExecution.provider_helper_execution.runtime_attestation_bound, true);
    assert.equal(helperExecution.proof_authority, "none");
    assert.equal(helperExecution.can_certify_ga, false);

    const collection = collectAgentAdapterOsIsolationProviderHelperExecutionEvidence(projectRoot, {
      project_id: projectId,
      collection_id: "ADAPTER-OSISO-HELPER-COLLECT-0235-MACOS-SANDBOX-EXEC",
      helper_execution_id: helperExecution.helper_execution_id,
      runner_id: runner.runner_id,
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=collection-secret`,
      requested_provider: "macos_sandbox_exec",
      collection_environment: {
        platform: process.platform,
        notes: `${projectRoot} token=collection-secret`
      }
    });
    assert.equal(collection.provider_helper_collection.helper_profile_source, "operator_configured_provider_helper");
    assertMacosSandboxExecProfileContract(
      collection.provider_helper_collection.production_helper_profile_contract,
      "operator_configured_provider_helper",
      helperSha256,
      "collection"
    );
    assert.equal(
      collection.provider_helper_collection.production_helper_profile_contract.profile_contract_sha256,
      runner.provider_runner_resolution.production_helper_profile_contract.profile_contract_sha256
    );
    assert.equal(collection.proof_authority, "none");
    assert.equal(collection.can_certify_ga, false);
    assert.equal(JSON.stringify(collection).includes(projectRoot), false);
    assert.equal(JSON.stringify(collection).includes(process.execPath), false);
    assert.equal(JSON.stringify(collection).includes("collection-secret"), false);
  }
} finally {
  if (previousHelper === undefined) {
    delete process.env[helperEnvVar];
  } else {
    process.env[helperEnvVar] = previousHelper;
  }
  if (previousHelperArgs === undefined) {
    delete process.env[helperArgsEnvVar];
  } else {
    process.env[helperArgsEnvVar] = previousHelperArgs;
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

console.log("Goal 3 Task235 macOS sandbox-exec production-helper profile contract tests passed.");


