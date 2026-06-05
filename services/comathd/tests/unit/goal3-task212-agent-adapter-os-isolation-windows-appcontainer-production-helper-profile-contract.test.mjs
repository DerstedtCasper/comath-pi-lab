import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

function createWindowsHelperScript(projectRoot) {
  const helperScript = join(projectRoot, "task212-windows-appcontainer-provider-helper.mjs");
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

const windowsHelperEnvVar = "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_HELPER";
const windowsHelperArgsEnvVar = "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_HELPER_ARGS_JSON";
const fallbackHelperEnvVar = "COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER";
const fallbackHelperArgsEnvVar = "COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER_ARGS_JSON";
const previousWindowsHelper = process.env[windowsHelperEnvVar];
const previousWindowsHelperArgs = process.env[windowsHelperArgsEnvVar];
const previousFallbackHelper = process.env[fallbackHelperEnvVar];
const previousFallbackHelperArgs = process.env[fallbackHelperArgsEnvVar];
const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task212-windows-production-helper-profile-"));

try {
  assert.equal(
    getComathdStatus().capabilities.includes(
      "agent_adapter_os_isolation_windows_appcontainer_production_helper_profile_contract"
    ),
    true,
    "Task212 capability ledger must advertise the Windows AppContainer production-helper profile contract without claiming GA"
  );

  const smoke = readRepoFile("scripts/phase0-smoke.mjs");
  assert.equal(
    smoke.includes("goal3-task212-agent-adapter-os-isolation-windows-appcontainer-production-helper-profile-contract.test.mjs"),
    true,
    "Task212 focused suite must be in release-hardening smoke discovery"
  );
  assert.equal(
    readRepoFile("docs/architecture/ga-release-criteria.md").includes(
      "goal3-task212-agent-adapter-os-isolation-windows-appcontainer-production-helper-profile-contract.test.mjs"
    ),
    true,
    "Task212 focused suite must be listed in GA release criteria"
  );
  for (const [path, pattern] of [
    ["README.md", /Task212.*Windows AppContainer production-helper profile contract/s],
    ["AGENTS.md", /Task212.*Windows AppContainer production-helper profile contract/s],
    ["TODO.md", /Task202-212 summary/s],
    ["REVIEW.md", /Goal 3 Task 212/s],
    ["config/README.md", /Task212.*Windows AppContainer production-helper profile contract/s],
    ["docs/architecture/adapter-contracts.md", /Task212.*Windows AppContainer production-helper profile contract/s],
    ["docs/architecture/threat-model.md", /Task212.*Windows AppContainer production-helper profile contract/s]
  ]) {
    assert.match(readRepoFile(path), pattern, `${path} must document Task212 without overclaiming`);
  }
  const sampleConfig = JSON.parse(readRepoFile("config/comath.sample.json"));
  const windowsProvider = sampleConfig?.agentAdapterOsIsolation?.providerHelpers?.find(
    (entry) => entry?.provider === "windows_appcontainer"
  );
  assert.equal(
    windowsProvider?.productionHelperProfileContractRequired,
    true,
    "Task212 sample config must advertise the Windows AppContainer profile contract as non-secret config metadata"
  );
  assert.deepEqual(
    windowsProvider?.productionHelperProfileSources,
    ["operator_configured_provider_helper", "bundled_provider_helper_protocol_asset"],
    "Task212 sample config must list the two profile sources without accepting caller-supplied proof fields"
  );

  const helperScript = createWindowsHelperScript(projectRoot);
  process.env[windowsHelperEnvVar] = process.execPath;
  process.env[windowsHelperArgsEnvVar] = JSON.stringify([helperScript]);
  delete process.env[fallbackHelperEnvVar];
  delete process.env[fallbackHelperArgsEnvVar];

  const helperSha256 = sha256File(process.execPath);
  const init = initProject({ name: "Goal3 Task212 Windows AppContainer Production Helper Profile", root_path: projectRoot });
  const projectId = init.project.project_id;
  const launch = prepareAgentAdapterOsIsolationSandboxLaunch(projectRoot, {
    project_id: projectId,
    launch_id: "ADAPTER-OSISO-LAUNCH-0212-WINDOWS",
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=launch-secret`,
    requested_provider: "windows_appcontainer",
    launcher_environment: {
      platform: process.platform,
      notes: `${projectRoot} token=launch-secret`
    }
  }, {
    launcher_probe: () => ({
      probe_source: "service_owned_launcher_preflight",
      provider_available: true,
      launcher_binary_sha256: "a".repeat(64),
      launcher_version: "windows-appcontainer-launcher-task212",
      diagnostics: [`${projectRoot} launcher diagnostic must be scrubbed`, "launcher ready"]
    })
  });
  assert.equal(launch.ok, true);

  const runner = prepareAgentAdapterOsIsolationProviderRunner(projectRoot, {
    project_id: projectId,
    runner_id: "ADAPTER-OSISO-RUNNER-0212-WINDOWS",
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=runner-secret`,
    requested_provider: "windows_appcontainer",
    runner_environment: {
      platform: process.platform,
      notes: `${projectRoot} token=runner-secret`
    }
  });
  assert.equal(runner.ok, true);
  assert.equal(runner.provider, "windows_appcontainer");
  assert.equal(runner.provider_runner_resolution.runner_binary_sha256, helperSha256);
  assert.equal(runner.provider_runner_resolution.helper_profile_source, "operator_configured_provider_helper");
  assert.equal(runner.provider_runner_resolution.production_helper_configured, true);
  assert.equal(runner.provider_runner_resolution.bundled_protocol_asset, false);
  assert.equal(runner.proof_authority, "none");
  assert.equal(runner.can_certify_ga, false);
  assert.equal(JSON.stringify(runner).includes(projectRoot), false);
  assert.equal(JSON.stringify(runner).includes(process.execPath), false);
  assert.equal(JSON.stringify(runner).includes("runner-secret"), false);

  const hostCapability = probeAgentAdapterOsIsolationProviderHostCapability(projectRoot, {
    project_id: projectId,
    host_capability_probe_id: "ADAPTER-OSISO-HOST-CAP-0212-WINDOWS",
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=host-cap-secret`,
    requested_provider: "windows_appcontainer",
    host_capability_environment: {
      platform: process.platform,
      notes: `${projectRoot} token=host-cap-secret`
    }
  }, {
    provider_host_capability_probe: () => ({
      probe_source: "service_owned_provider_host_capability_probe",
      provider_host_capability_available: true,
      capability_facts: ["task212 windows appcontainer host capability observed"],
      required_tools: [
        { name: "windows_checknetisolation", present: true, version: null, binary_sha256: helperSha256 }
      ],
      kernel_features: ["task212-windows-appcontainer-host-capability"],
      diagnostics: [`${projectRoot} host capability diagnostic must be scrubbed`, "Windows AppContainer capability observed"]
    })
  });
  assert.equal(hostCapability.ok, true);

  const host = validateAgentAdapterOsIsolationProviderHelperHost(projectRoot, {
    project_id: projectId,
    host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0212-WINDOWS",
    host_capability_probe_id: hostCapability.host_capability_probe_id,
    runner_id: runner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=host-secret`,
    requested_provider: "windows_appcontainer",
    host_environment: {
      platform: process.platform,
      notes: `${projectRoot} token=host-secret`
    }
  });
  assert.equal(host.ok, true);
  assert.equal(host.provider_helper_host_validation.helper_profile_source, "operator_configured_provider_helper");
  assert.equal(host.provider_helper_host_validation.production_helper_configured, true);
  assert.equal(host.provider_helper_host_validation.bundled_protocol_asset, false);
  assert.equal(host.provider_helper_host_validation.helper_binary_sha256, helperSha256);
  assert.equal(host.proof_authority, "none");
  assert.equal(host.can_certify_ga, false);
  assert.equal(JSON.stringify(host).includes(projectRoot), false);
  assert.equal(JSON.stringify(host).includes(process.execPath), false);
  assert.equal(JSON.stringify(host).includes("host-secret"), false);

  const helperExecution = runAgentAdapterOsIsolationProviderHelperExecution(projectRoot, {
    project_id: projectId,
    helper_execution_id: "ADAPTER-OSISO-HELPER-0212-WINDOWS",
    host_validation_id: host.host_validation_id,
    runner_id: runner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=helper-secret`,
    requested_provider: "windows_appcontainer",
    helper_environment: {
      platform: process.platform,
      notes: `${projectRoot} token=helper-secret`
    }
  });
  assert.equal(helperExecution.ok, true);
  assert.equal(helperExecution.provider_helper_execution.helper_profile_source, "operator_configured_provider_helper");
  assert.equal(helperExecution.provider_helper_execution.production_helper_configured, true);
  assert.equal(helperExecution.provider_helper_execution.bundled_protocol_asset, false);
  assert.equal(helperExecution.provider_helper_execution.helper_binary_sha256, helperSha256);
  assert.equal(helperExecution.provider_helper_execution.runtime_attestation_bound, true);
  assert.equal(helperExecution.proof_authority, "none");
  assert.equal(helperExecution.can_certify_ga, false);

  const collection = collectAgentAdapterOsIsolationProviderHelperExecutionEvidence(projectRoot, {
    project_id: projectId,
    collection_id: "ADAPTER-OSISO-HELPER-COLLECT-0212-WINDOWS",
    helper_execution_id: helperExecution.helper_execution_id,
    runner_id: runner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=collection-secret`,
    requested_provider: "windows_appcontainer",
    collection_environment: {
      platform: process.platform,
      notes: `${projectRoot} token=collection-secret`
    }
  });
  assert.equal(collection.provider_helper_collection.helper_profile_source, "operator_configured_provider_helper");
  assert.equal(collection.provider_helper_collection.production_helper_configured, true);
  assert.equal(collection.provider_helper_collection.bundled_protocol_asset, false);
  assert.equal(collection.proof_authority, "none");
  assert.equal(collection.can_certify_ga, false);
  assert.equal(JSON.stringify(collection).includes(projectRoot), false);
  assert.equal(JSON.stringify(collection).includes(process.execPath), false);
  assert.equal(JSON.stringify(collection).includes("collection-secret"), false);

  delete process.env[windowsHelperEnvVar];
  delete process.env[windowsHelperArgsEnvVar];
  const bundledProjectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task212-bundled-profile-"));
  try {
    const bundledInit = initProject({ name: "Goal3 Task212 Bundled Profile Negative", root_path: bundledProjectRoot });
    const bundledLaunch = prepareAgentAdapterOsIsolationSandboxLaunch(bundledProjectRoot, {
      project_id: bundledInit.project.project_id,
      launch_id: "ADAPTER-OSISO-LAUNCH-0212-BUNDLED",
      adapter_id: "codex-cli",
      backend: "external",
      actor: "goal3-task212-test",
      requested_provider: "windows_appcontainer",
      launcher_environment: { platform: process.platform }
    }, {
      launcher_probe: () => ({
        probe_source: "service_owned_launcher_preflight",
        provider_available: true,
        launcher_binary_sha256: "b".repeat(64),
        launcher_version: "windows-appcontainer-launcher-task212-bundled",
        diagnostics: ["launcher ready"]
      })
    });
    const bundledRunner = prepareAgentAdapterOsIsolationProviderRunner(bundledProjectRoot, {
      project_id: bundledInit.project.project_id,
      runner_id: "ADAPTER-OSISO-RUNNER-0212-BUNDLED",
      launch_id: bundledLaunch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: "goal3-task212-test",
      requested_provider: "windows_appcontainer",
      runner_environment: { platform: process.platform }
    });
    assert.equal(bundledRunner.ok, true);
    assert.equal(bundledRunner.provider_runner_resolution.helper_profile_source, "bundled_provider_helper_protocol_asset");
    assert.equal(bundledRunner.provider_runner_resolution.production_helper_configured, false);
    assert.equal(bundledRunner.provider_runner_resolution.bundled_protocol_asset, true);
    assert.equal(bundledRunner.proof_authority, "none");
    assert.equal(bundledRunner.can_certify_ga, false);

    const bundledHostCapability = probeAgentAdapterOsIsolationProviderHostCapability(bundledProjectRoot, {
      project_id: bundledInit.project.project_id,
      host_capability_probe_id: "ADAPTER-OSISO-HOST-CAP-0212-BUNDLED",
      adapter_id: "codex-cli",
      backend: "external",
      actor: "goal3-task212-test",
      requested_provider: "windows_appcontainer",
      host_capability_environment: { platform: process.platform }
    }, {
      provider_host_capability_probe: () => ({
        probe_source: "service_owned_provider_host_capability_probe",
        provider_host_capability_available: true,
        capability_facts: ["task212 bundled windows appcontainer host capability observed"],
        required_tools: [
          { name: "windows_checknetisolation", present: true, version: null, binary_sha256: sha256File(process.execPath) }
        ],
        kernel_features: ["task212-bundled-windows-appcontainer-host-capability"],
        diagnostics: ["Windows AppContainer capability observed"]
      })
    });
    assert.equal(bundledHostCapability.ok, true);

    const bundledHost = validateAgentAdapterOsIsolationProviderHelperHost(bundledProjectRoot, {
      project_id: bundledInit.project.project_id,
      host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0212-BUNDLED",
      host_capability_probe_id: bundledHostCapability.host_capability_probe_id,
      runner_id: bundledRunner.runner_id,
      launch_id: bundledLaunch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: "goal3-task212-test",
      requested_provider: "windows_appcontainer",
      host_environment: { platform: process.platform }
    });
    assert.equal(bundledHost.ok, true);
    assert.equal(bundledHost.provider_helper_host_validation.helper_profile_source, "bundled_provider_helper_protocol_asset");
    assert.equal(bundledHost.provider_helper_host_validation.production_helper_configured, false);
    assert.equal(bundledHost.provider_helper_host_validation.bundled_protocol_asset, true);
    assert.equal(bundledHost.proof_authority, "none");
    assert.equal(bundledHost.can_certify_ga, false);

    const bundledExecution = runAgentAdapterOsIsolationProviderHelperExecution(bundledProjectRoot, {
      project_id: bundledInit.project.project_id,
      helper_execution_id: "ADAPTER-OSISO-HELPER-0212-BUNDLED",
      host_validation_id: bundledHost.host_validation_id,
      runner_id: bundledRunner.runner_id,
      launch_id: bundledLaunch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: "goal3-task212-test",
      requested_provider: "windows_appcontainer",
      helper_environment: { platform: process.platform }
    });
    assert.equal(bundledExecution.ok, true);
    assert.equal(bundledExecution.provider_helper_execution.helper_profile_source, "bundled_provider_helper_protocol_asset");
    assert.equal(bundledExecution.provider_helper_execution.production_helper_configured, false);
    assert.equal(bundledExecution.provider_helper_execution.bundled_protocol_asset, true);
    assert.equal(bundledExecution.provider_helper_execution.runtime_attestation_bound, true);
    assert.equal(bundledExecution.proof_authority, "none");
    assert.equal(bundledExecution.can_certify_ga, false);

    const bundledCollection = collectAgentAdapterOsIsolationProviderHelperExecutionEvidence(bundledProjectRoot, {
      project_id: bundledInit.project.project_id,
      collection_id: "ADAPTER-OSISO-HELPER-COLLECT-0212-BUNDLED",
      helper_execution_id: bundledExecution.helper_execution_id,
      runner_id: bundledRunner.runner_id,
      launch_id: bundledLaunch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: "goal3-task212-test",
      requested_provider: "windows_appcontainer",
      collection_environment: { platform: process.platform }
    });
    assert.equal(bundledCollection.provider_helper_collection.helper_profile_source, "bundled_provider_helper_protocol_asset");
    assert.equal(bundledCollection.provider_helper_collection.production_helper_configured, false);
    assert.equal(bundledCollection.provider_helper_collection.bundled_protocol_asset, true);
    assert.equal(bundledCollection.proof_authority, "none");
    assert.equal(bundledCollection.can_certify_ga, false);
    assert.equal(JSON.stringify(bundledHost).includes(bundledProjectRoot), false);
    assert.equal(JSON.stringify(bundledExecution).includes(bundledProjectRoot), false);
    assert.equal(JSON.stringify(bundledCollection).includes(bundledProjectRoot), false);
  } finally {
    rmSync(bundledProjectRoot, { recursive: true, force: true });
  }
} finally {
  if (previousWindowsHelper === undefined) {
    delete process.env[windowsHelperEnvVar];
  } else {
    process.env[windowsHelperEnvVar] = previousWindowsHelper;
  }
  if (previousWindowsHelperArgs === undefined) {
    delete process.env[windowsHelperArgsEnvVar];
  } else {
    process.env[windowsHelperArgsEnvVar] = previousWindowsHelperArgs;
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

console.log("Goal 3 Task212 Windows AppContainer production-helper profile contract tests passed.");
