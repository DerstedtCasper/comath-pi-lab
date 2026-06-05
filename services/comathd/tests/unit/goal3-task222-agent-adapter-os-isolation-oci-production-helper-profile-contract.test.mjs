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

function createOciHelperScript(projectRoot) {
  const helperScript = join(projectRoot, "task222-oci-provider-helper.mjs");
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

function assertOciProfileContract(contract, source, helperSha256, message) {
  assert.ok(contract, `${message}: production helper profile contract must be present`);
  assert.equal(contract.contract_source, "service_owned_oci_container_production_helper_profile_contract");
  assert.equal(contract.provider, "oci_container");
  assert.equal(contract.provider_family, "oci_container");
  assert.equal(contract.helper_profile_source, source);
  assert.equal(contract.production_helper_configured, source === "operator_configured_provider_helper");
  assert.equal(contract.bundled_protocol_asset, source === "bundled_provider_helper_protocol_asset");
  assert.equal(contract.helper_binary_sha256, helperSha256);
  assert.deepEqual(contract.accepted_profile_sources, [
    "operator_configured_provider_helper",
    "bundled_provider_helper_protocol_asset"
  ]);
  assert.deepEqual(contract.required_host_facility_tools, ["oci_docker_cli", "oci_podman_cli"]);
  assert.equal(contract.runtime_family, "docker_or_podman_oci");
  assert.equal(contract.runner_network_policy, "disabled");
  assert.equal(contract.no_new_privileges_required, true);
  assert.equal(contract.command_override_allowed, false);
  assert.equal(contract.environment_override_allowed, false);
  assert.equal(contract.daemon_or_socket_inspection_allowed, false);
  assert.equal(contract.container_launch_required_for_profile_contract, false);
  assert.equal(contract.caller_supplied_success_allowed, false);
  assert.equal(contract.proof_authority, "none");
  assert.equal(contract.can_promote_claim, false);
  assert.equal(contract.can_certify_ga, false);
  assert.match(contract.profile_contract_sha256, /^[a-f0-9]{64}$/);
}

const ociHelperEnvVar = "COMATH_AGENT_ADAPTER_OSISO_OCI_HELPER";
const ociHelperArgsEnvVar = "COMATH_AGENT_ADAPTER_OSISO_OCI_HELPER_ARGS_JSON";
const fallbackHelperEnvVar = "COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER";
const fallbackHelperArgsEnvVar = "COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER_ARGS_JSON";
const previousOciHelper = process.env[ociHelperEnvVar];
const previousOciHelperArgs = process.env[ociHelperArgsEnvVar];
const previousFallbackHelper = process.env[fallbackHelperEnvVar];
const previousFallbackHelperArgs = process.env[fallbackHelperArgsEnvVar];
const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task222-oci-production-helper-profile-"));

try {
  assert.equal(
    getComathdStatus().capabilities.includes(
      "agent_adapter_os_isolation_oci_container_production_helper_profile_contract"
    ),
    true,
    "Task222 capability ledger must advertise the OCI production-helper profile contract without claiming GA"
  );

  const smoke = readRepoFile("scripts/phase0-smoke.mjs");
  assert.equal(
    smoke.includes("goal3-task222-agent-adapter-os-isolation-oci-production-helper-profile-contract.test.mjs"),
    true,
    "Task222 focused suite must be in release-hardening smoke discovery"
  );
  assert.equal(
    readRepoFile("docs/architecture/ga-release-criteria.md").includes(
      "goal3-task222-agent-adapter-os-isolation-oci-production-helper-profile-contract.test.mjs"
    ),
    true,
    "Task222 focused suite must be listed in GA release criteria"
  );
  for (const [path, pattern] of [
    ["README.md", /Task222.*OCI.*production-helper profile contract/s],
    ["AGENTS.md", /Task222.*OCI.*production-helper profile contract/s],
    ["TODO.md", /Task213-222 summary/s],
    ["REVIEW.md", /Goal 3 Task 222/s],
    ["config/README.md", /Task222.*OCI.*production-helper profile contract/s],
    ["docs/architecture/adapter-contracts.md", /Task222.*OCI.*production-helper profile contract/s],
    ["docs/architecture/threat-model.md", /Task222.*OCI.*production-helper profile contract/s]
  ]) {
    assert.match(readRepoFile(path), pattern, `${path} must document Task222 without overclaiming`);
  }
  const sampleConfig = JSON.parse(readRepoFile("config/comath.sample.json"));
  const ociProvider = sampleConfig?.agentAdapterOsIsolation?.providerHelpers?.find(
    (entry) => entry?.provider === "oci_container"
  );
  assert.equal(
    ociProvider?.productionHelperProfileContractRequired,
    true,
    "Task222 sample config must advertise the OCI profile contract as non-secret config metadata"
  );
  assert.equal(
    ociProvider?.productionHelperProfileContractKind,
    "oci_container_docker_podman_profile_contract",
    "Task222 sample config must name the OCI/Docker/Podman profile contract kind without shipping a helper"
  );
  assert.deepEqual(
    ociProvider?.productionHelperProfileSources,
    ["operator_configured_provider_helper", "bundled_provider_helper_protocol_asset"],
    "Task222 sample config must list the two profile sources without accepting caller-supplied proof fields"
  );
  assert.deepEqual(
    ociProvider?.requiredHostFacilityTools,
    ["oci_docker_cli", "oci_podman_cli"],
    "Task222 sample config must keep OCI host facility tool names non-secret and path-free"
  );

  const helperScript = createOciHelperScript(projectRoot);
  process.env[ociHelperEnvVar] = process.execPath;
  process.env[ociHelperArgsEnvVar] = JSON.stringify([helperScript]);
  delete process.env[fallbackHelperEnvVar];
  delete process.env[fallbackHelperArgsEnvVar];

  const helperSha256 = sha256File(process.execPath);
  const init = initProject({ name: "Goal3 Task222 OCI Production Helper Profile", root_path: projectRoot });
  const projectId = init.project.project_id;
  const launch = prepareAgentAdapterOsIsolationSandboxLaunch(projectRoot, {
    project_id: projectId,
    launch_id: "ADAPTER-OSISO-LAUNCH-0222-OCI",
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=launch-secret`,
    requested_provider: "oci_container",
    launcher_environment: {
      platform: process.platform,
      notes: `${projectRoot} token=launch-secret`
    }
  }, {
    launcher_probe: () => ({
      probe_source: "service_owned_launcher_preflight",
      provider_available: true,
      launcher_binary_sha256: "a".repeat(64),
      launcher_version: "oci-launcher-task222",
      diagnostics: [`${projectRoot} launcher diagnostic must be scrubbed`, "launcher ready"]
    })
  });
  assert.equal(launch.ok, true);

  const runner = prepareAgentAdapterOsIsolationProviderRunner(projectRoot, {
    project_id: projectId,
    runner_id: "ADAPTER-OSISO-RUNNER-0222-OCI",
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=runner-secret`,
    requested_provider: "oci_container",
    runner_environment: {
      platform: process.platform,
      notes: `${projectRoot} token=runner-secret`,
      docker_socket: `${projectRoot}/var/run/docker.sock`
    }
  });
  assert.equal(runner.ok, true);
  assert.equal(runner.provider, "oci_container");
  assert.equal(runner.provider_runner_resolution.runner_binary_sha256, helperSha256);
  assert.equal(runner.provider_runner_resolution.helper_profile_source, "operator_configured_provider_helper");
  assert.equal(runner.provider_runner_resolution.production_helper_configured, true);
  assert.equal(runner.provider_runner_resolution.bundled_protocol_asset, false);
  assertOciProfileContract(
    runner.provider_runner_resolution.production_helper_profile_contract,
    "operator_configured_provider_helper",
    helperSha256,
    "runner"
  );
  assert.equal(runner.provider_runner_contract.network_policy, "disabled");
  assert.equal(runner.provider_runner_contract.no_new_privileges_required, true);
  assert.equal(runner.proof_authority, "none");
  assert.equal(runner.can_certify_ga, false);
  assert.equal(JSON.stringify(runner).includes(projectRoot), false);
  assert.equal(JSON.stringify(runner).includes(process.execPath), false);
  assert.equal(JSON.stringify(runner).includes("runner-secret"), false);
  assert.equal(JSON.stringify(runner).includes("docker.sock"), false);

  const hostCapability = probeAgentAdapterOsIsolationProviderHostCapability(projectRoot, {
    project_id: projectId,
    host_capability_probe_id: "ADAPTER-OSISO-HOST-CAP-0222-OCI",
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=host-cap-secret`,
    requested_provider: "oci_container",
    host_capability_environment: {
      platform: process.platform,
      notes: `${projectRoot} token=host-cap-secret`,
      docker_socket: `${projectRoot}/var/run/docker.sock`
    }
  }, {
    provider_host_capability_probe: () => ({
      probe_source: "service_owned_provider_host_capability_probe",
      provider_host_capability_available: true,
      capability_facts: ["task222 oci container host capability observed"],
      required_tools: [
        { name: "oci_docker_cli", present: true, version: null, binary_sha256: helperSha256 },
        { name: "oci_podman_cli", present: true, version: null, binary_sha256: helperSha256 }
      ],
      kernel_features: ["task222-oci-host-capability"],
      diagnostics: [`${projectRoot} host capability diagnostic must be scrubbed`, "OCI capability observed"]
    })
  });
  assert.equal(hostCapability.ok, true);

  delete process.env[ociHelperEnvVar];
  delete process.env[ociHelperArgsEnvVar];
  const driftHost = validateAgentAdapterOsIsolationProviderHelperHost(projectRoot, {
    project_id: projectId,
    host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0222-OCI-DRIFT",
    host_capability_probe_id: hostCapability.host_capability_probe_id,
    runner_id: runner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=host-drift-secret`,
    requested_provider: "oci_container",
    host_environment: {
      platform: process.platform,
      notes: `${projectRoot} token=host-drift-secret`
    }
  });
  assert.equal(
    driftHost.ok,
    false,
    "host validation must fail closed if the OCI helper profile source drifts from operator-configured runner to bundled helper"
  );
  assert.equal(driftHost.host_validation_status, "blocked_provider_helper_host_binary_mismatch");
  assert.equal(driftHost.provider_helper_host_validation.helper_profile_source, "bundled_provider_helper_protocol_asset");
  assert.equal(driftHost.provider_helper_host_validation.production_helper_configured, false);
  assert.equal(driftHost.provider_helper_host_validation.bundled_protocol_asset, true);
  assert.equal(driftHost.provider_helper_host_validation.hashes_match_provider_runner, false);
  assertOciProfileContract(
    driftHost.provider_helper_host_validation.production_helper_profile_contract,
    "bundled_provider_helper_protocol_asset",
    helperSha256,
    "drift host"
  );
  assert.notEqual(
    driftHost.provider_helper_host_validation.production_helper_profile_contract.profile_contract_sha256,
    runner.provider_runner_resolution.production_helper_profile_contract.profile_contract_sha256,
    "profile contract hash must include helper profile source and catch operator-to-bundled drift"
  );
  assert.equal(driftHost.proof_authority, "none");
  assert.equal(driftHost.can_certify_ga, false);
  assert.equal(JSON.stringify(driftHost).includes(projectRoot), false);
  assert.equal(JSON.stringify(driftHost).includes("host-drift-secret"), false);

  process.env[ociHelperEnvVar] = process.execPath;
  process.env[ociHelperArgsEnvVar] = JSON.stringify([helperScript]);
  const host = validateAgentAdapterOsIsolationProviderHelperHost(projectRoot, {
    project_id: projectId,
    host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0222-OCI",
    host_capability_probe_id: hostCapability.host_capability_probe_id,
    runner_id: runner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=host-secret`,
    requested_provider: "oci_container",
    host_environment: {
      platform: process.platform,
      notes: `${projectRoot} token=host-secret`
    }
  });
  assert.equal(host.ok, true);
  assert.equal(host.provider_helper_host_validation.helper_profile_source, "operator_configured_provider_helper");
  assert.equal(host.provider_helper_host_validation.production_helper_configured, true);
  assert.equal(host.provider_helper_host_validation.bundled_protocol_asset, false);
  assertOciProfileContract(
    host.provider_helper_host_validation.production_helper_profile_contract,
    "operator_configured_provider_helper",
    helperSha256,
    "host validation"
  );
  assert.equal(
    host.provider_helper_host_validation.production_helper_profile_contract.profile_contract_sha256,
    runner.provider_runner_resolution.production_helper_profile_contract.profile_contract_sha256
  );
  assert.equal(host.proof_authority, "none");
  assert.equal(host.can_certify_ga, false);
  assert.equal(JSON.stringify(host).includes(projectRoot), false);
  assert.equal(JSON.stringify(host).includes(process.execPath), false);
  assert.equal(JSON.stringify(host).includes("host-secret"), false);

  delete process.env[ociHelperEnvVar];
  delete process.env[ociHelperArgsEnvVar];
  const driftExecution = runAgentAdapterOsIsolationProviderHelperExecution(projectRoot, {
    project_id: projectId,
    helper_execution_id: "ADAPTER-OSISO-HELPER-0222-OCI-DRIFT",
    host_validation_id: host.host_validation_id,
    runner_id: runner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=helper-drift-secret`,
    requested_provider: "oci_container",
    helper_environment: {
      platform: process.platform,
      notes: `${projectRoot} token=helper-drift-secret`
    }
  });
  assert.equal(
    driftExecution.ok,
    false,
    "helper execution must fail closed if the OCI helper profile source drifts after host validation"
  );
  assert.equal(driftExecution.helper_execution_status, "blocked_provider_helper_binary_mismatch");
  assert.equal(driftExecution.provider_helper_attempted, false);
  assert.equal(driftExecution.provider_helper_execution.helper_profile_source, "bundled_provider_helper_protocol_asset");
  assert.equal(driftExecution.provider_helper_execution.production_helper_configured, false);
  assert.equal(driftExecution.provider_helper_execution.bundled_protocol_asset, true);
  assertOciProfileContract(
    driftExecution.provider_helper_execution.production_helper_profile_contract,
    "bundled_provider_helper_protocol_asset",
    helperSha256,
    "drift execution"
  );
  assert.notEqual(
    driftExecution.provider_helper_execution.production_helper_profile_contract.profile_contract_sha256,
    runner.provider_runner_resolution.production_helper_profile_contract.profile_contract_sha256,
    "helper execution must bind the same OCI profile contract as the runner and validated host"
  );
  assert.equal(driftExecution.proof_authority, "none");
  assert.equal(driftExecution.can_certify_ga, false);
  assert.equal(JSON.stringify(driftExecution).includes(projectRoot), false);
  assert.equal(JSON.stringify(driftExecution).includes("helper-drift-secret"), false);

  process.env[ociHelperEnvVar] = process.execPath;
  process.env[ociHelperArgsEnvVar] = JSON.stringify([helperScript]);
  const helperExecution = runAgentAdapterOsIsolationProviderHelperExecution(projectRoot, {
    project_id: projectId,
    helper_execution_id: "ADAPTER-OSISO-HELPER-0222-OCI",
    host_validation_id: host.host_validation_id,
    runner_id: runner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=helper-secret`,
    requested_provider: "oci_container",
    helper_environment: {
      platform: process.platform,
      notes: `${projectRoot} token=helper-secret`
    }
  });
  assert.equal(helperExecution.ok, true);
  assert.equal(helperExecution.provider_helper_execution.helper_profile_source, "operator_configured_provider_helper");
  assert.equal(helperExecution.provider_helper_execution.production_helper_configured, true);
  assert.equal(helperExecution.provider_helper_execution.bundled_protocol_asset, false);
  assertOciProfileContract(
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
    collection_id: "ADAPTER-OSISO-HELPER-COLLECT-0222-OCI",
    helper_execution_id: helperExecution.helper_execution_id,
    runner_id: runner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=collection-secret`,
    requested_provider: "oci_container",
    collection_environment: {
      platform: process.platform,
      notes: `${projectRoot} token=collection-secret`
    }
  });
  assert.equal(collection.provider_helper_collection.helper_profile_source, "operator_configured_provider_helper");
  assert.equal(collection.provider_helper_collection.production_helper_configured, true);
  assert.equal(collection.provider_helper_collection.bundled_protocol_asset, false);
  assertOciProfileContract(
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

  delete process.env[ociHelperEnvVar];
  delete process.env[ociHelperArgsEnvVar];
  const bundledProjectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task222-oci-bundled-profile-"));
  try {
    const bundledInit = initProject({ name: "Goal3 Task222 OCI Bundled Profile Negative", root_path: bundledProjectRoot });
    const bundledLaunch = prepareAgentAdapterOsIsolationSandboxLaunch(bundledProjectRoot, {
      project_id: bundledInit.project.project_id,
      launch_id: "ADAPTER-OSISO-LAUNCH-0222-BUNDLED",
      adapter_id: "codex-cli",
      backend: "external",
      actor: "goal3-task222-test",
      requested_provider: "oci_container",
      launcher_environment: { platform: process.platform }
    }, {
      launcher_probe: () => ({
        probe_source: "service_owned_launcher_preflight",
        provider_available: true,
        launcher_binary_sha256: "b".repeat(64),
        launcher_version: "oci-launcher-task222-bundled",
        diagnostics: ["launcher ready"]
      })
    });
    const bundledRunner = prepareAgentAdapterOsIsolationProviderRunner(bundledProjectRoot, {
      project_id: bundledInit.project.project_id,
      runner_id: "ADAPTER-OSISO-RUNNER-0222-BUNDLED",
      launch_id: bundledLaunch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: "goal3-task222-test",
      requested_provider: "oci_container",
      runner_environment: { platform: process.platform }
    });
    assert.equal(bundledRunner.ok, true);
    assert.equal(bundledRunner.provider_runner_resolution.helper_profile_source, "bundled_provider_helper_protocol_asset");
    assert.equal(bundledRunner.provider_runner_resolution.production_helper_configured, false);
    assert.equal(bundledRunner.provider_runner_resolution.bundled_protocol_asset, true);
    assertOciProfileContract(
      bundledRunner.provider_runner_resolution.production_helper_profile_contract,
      "bundled_provider_helper_protocol_asset",
      helperSha256,
      "bundled runner"
    );
    assert.equal(bundledRunner.proof_authority, "none");
    assert.equal(bundledRunner.can_certify_ga, false);

    const bundledHostCapability = probeAgentAdapterOsIsolationProviderHostCapability(bundledProjectRoot, {
      project_id: bundledInit.project.project_id,
      host_capability_probe_id: "ADAPTER-OSISO-HOST-CAP-0222-BUNDLED",
      adapter_id: "codex-cli",
      backend: "external",
      actor: "goal3-task222-test",
      requested_provider: "oci_container",
      host_capability_environment: { platform: process.platform }
    }, {
      provider_host_capability_probe: () => ({
        probe_source: "service_owned_provider_host_capability_probe",
        provider_host_capability_available: true,
        capability_facts: ["task222 bundled oci host capability observed"],
        required_tools: [
          { name: "oci_docker_cli", present: true, version: null, binary_sha256: helperSha256 },
          { name: "oci_podman_cli", present: true, version: null, binary_sha256: helperSha256 }
        ],
        kernel_features: ["task222-bundled-oci-host-capability"],
        diagnostics: ["OCI capability observed"]
      })
    });
    assert.equal(bundledHostCapability.ok, true);

    const bundledHost = validateAgentAdapterOsIsolationProviderHelperHost(bundledProjectRoot, {
      project_id: bundledInit.project.project_id,
      host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0222-BUNDLED",
      host_capability_probe_id: bundledHostCapability.host_capability_probe_id,
      runner_id: bundledRunner.runner_id,
      launch_id: bundledLaunch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: "goal3-task222-test",
      requested_provider: "oci_container",
      host_environment: { platform: process.platform }
    });
    assert.equal(bundledHost.ok, true);
    assert.equal(bundledHost.provider_helper_host_validation.helper_profile_source, "bundled_provider_helper_protocol_asset");
    assert.equal(bundledHost.provider_helper_host_validation.production_helper_configured, false);
    assert.equal(bundledHost.provider_helper_host_validation.bundled_protocol_asset, true);
    assertOciProfileContract(
      bundledHost.provider_helper_host_validation.production_helper_profile_contract,
      "bundled_provider_helper_protocol_asset",
      helperSha256,
      "bundled host"
    );

    const bundledExecution = runAgentAdapterOsIsolationProviderHelperExecution(bundledProjectRoot, {
      project_id: bundledInit.project.project_id,
      helper_execution_id: "ADAPTER-OSISO-HELPER-0222-BUNDLED",
      host_validation_id: bundledHost.host_validation_id,
      runner_id: bundledRunner.runner_id,
      launch_id: bundledLaunch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: "goal3-task222-test",
      requested_provider: "oci_container",
      helper_environment: { platform: process.platform }
    });
    assert.equal(bundledExecution.ok, true);
    assert.equal(bundledExecution.provider_helper_execution.helper_profile_source, "bundled_provider_helper_protocol_asset");
    assert.equal(bundledExecution.provider_helper_execution.production_helper_configured, false);
    assert.equal(bundledExecution.provider_helper_execution.bundled_protocol_asset, true);
    assertOciProfileContract(
      bundledExecution.provider_helper_execution.production_helper_profile_contract,
      "bundled_provider_helper_protocol_asset",
      helperSha256,
      "bundled execution"
    );

    const bundledCollection = collectAgentAdapterOsIsolationProviderHelperExecutionEvidence(bundledProjectRoot, {
      project_id: bundledInit.project.project_id,
      collection_id: "ADAPTER-OSISO-HELPER-COLLECT-0222-BUNDLED",
      helper_execution_id: bundledExecution.helper_execution_id,
      runner_id: bundledRunner.runner_id,
      launch_id: bundledLaunch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: "goal3-task222-test",
      requested_provider: "oci_container",
      collection_environment: { platform: process.platform }
    });
    assert.equal(bundledCollection.provider_helper_collection.helper_profile_source, "bundled_provider_helper_protocol_asset");
    assert.equal(bundledCollection.provider_helper_collection.production_helper_configured, false);
    assert.equal(bundledCollection.provider_helper_collection.bundled_protocol_asset, true);
    assertOciProfileContract(
      bundledCollection.provider_helper_collection.production_helper_profile_contract,
      "bundled_provider_helper_protocol_asset",
      helperSha256,
      "bundled collection"
    );
    assert.equal(bundledCollection.proof_authority, "none");
    assert.equal(bundledCollection.can_certify_ga, false);
    assert.equal(JSON.stringify(bundledHost).includes(bundledProjectRoot), false);
    assert.equal(JSON.stringify(bundledExecution).includes(bundledProjectRoot), false);
    assert.equal(JSON.stringify(bundledCollection).includes(bundledProjectRoot), false);
  } finally {
    rmSync(bundledProjectRoot, { recursive: true, force: true });
  }
} finally {
  if (previousOciHelper === undefined) {
    delete process.env[ociHelperEnvVar];
  } else {
    process.env[ociHelperEnvVar] = previousOciHelper;
  }
  if (previousOciHelperArgs === undefined) {
    delete process.env[ociHelperArgsEnvVar];
  } else {
    process.env[ociHelperArgsEnvVar] = previousOciHelperArgs;
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

console.log("Goal 3 Task222 OCI production-helper profile contract tests passed.");
