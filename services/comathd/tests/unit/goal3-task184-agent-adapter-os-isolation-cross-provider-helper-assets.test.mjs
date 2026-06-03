import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectAgentAdapterOsIsolationProviderHelperExecutionEvidence,
  createComathServer,
  getComathdStatus,
  initProject,
  prepareAgentAdapterOsIsolationSandboxLaunch,
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

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, "../../..", "..");
const sampleConfig = JSON.parse(readFileSync(join(repoRoot, "config/comath.sample.json"), "utf8"));

const providerHelpers = [
  {
    provider: "oci_container",
    helperEnv: "COMATH_AGENT_ADAPTER_OSISO_OCI_HELPER",
    argsEnv: "COMATH_AGENT_ADAPTER_OSISO_OCI_HELPER_ARGS_JSON"
  },
  {
    provider: "nix_sandbox",
    helperEnv: "COMATH_AGENT_ADAPTER_OSISO_NIX_HELPER",
    argsEnv: "COMATH_AGENT_ADAPTER_OSISO_NIX_HELPER_ARGS_JSON"
  },
  {
    provider: "firejail",
    helperEnv: "COMATH_AGENT_ADAPTER_OSISO_FIREJAIL_HELPER",
    argsEnv: "COMATH_AGENT_ADAPTER_OSISO_FIREJAIL_HELPER_ARGS_JSON"
  },
  {
    provider: "windows_appcontainer",
    helperEnv: "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_HELPER",
    argsEnv: "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_HELPER_ARGS_JSON"
  },
  {
    provider: "macos_sandbox_exec",
    helperEnv: "COMATH_AGENT_ADAPTER_OSISO_MACOS_SANDBOX_EXEC_HELPER",
    argsEnv: "COMATH_AGENT_ADAPTER_OSISO_MACOS_SANDBOX_EXEC_HELPER_ARGS_JSON"
  }
];

assert.equal(
  getComathdStatus().capabilities.includes("agent_adapter_os_isolation_cross_provider_configured_helper_assets"),
  true,
  "Task184 service capability ledger must advertise cross-provider configured helper asset contracts"
);

const sampleHelpers = sampleConfig.agentAdapterOsIsolation?.providerHelpers;
assert.equal(Array.isArray(sampleHelpers), true, "sample config must expose provider helper contracts as a list");

for (const expected of providerHelpers) {
  const sampleEntry = sampleHelpers.find((entry) => entry.provider === expected.provider);
  assert.ok(sampleEntry, `sample config must include ${expected.provider} helper configuration handles`);
  assert.equal(sampleEntry.enabled, false);
  assert.equal(sampleEntry.configuredByEnv, expected.helperEnv);
  assert.equal(sampleEntry.fallbackConfiguredByEnv, "COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER");
  assert.equal(sampleEntry.argsPrefixConfiguredByEnv, expected.argsEnv);
  assert.equal(sampleEntry.fallbackArgsPrefixConfiguredByEnv, "COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER_ARGS_JSON");
  assert.equal(sampleEntry.argsPrefixFormat, "json_string_array");
  assert.equal(sampleEntry.executionAssetHashBound, true);
  assert.equal(sampleEntry.proofAuthority, "none");
  assert.equal(sampleEntry.canCertifyGa, false);
}

const incompatibleProvider = process.platform === "linux" ? "macos_sandbox_exec" : "firejail";
const incompatibleHelper = providerHelpers.find((entry) => entry.provider === incompatibleProvider);
assert.ok(incompatibleHelper, "test must select a known platform-incompatible provider helper");

const providerHelperEnvVar = incompatibleHelper.helperEnv;
const providerHelperArgsEnvVar = incompatibleHelper.argsEnv;
const fallbackHelperEnvVar = "COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER";
const fallbackHelperArgsEnvVar = "COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER_ARGS_JSON";
const previousProviderHelper = process.env[providerHelperEnvVar];
const previousProviderHelperArgs = process.env[providerHelperArgsEnvVar];
const previousFallbackHelper = process.env[fallbackHelperEnvVar];
const previousFallbackHelperArgs = process.env[fallbackHelperArgsEnvVar];
const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task184-cross-provider-helper-assets-"));

try {
  const helperScript = join(projectRoot, "task184-cross-provider-helper.mjs");
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
      "  console.error('task184 cross-provider helper self-test stderr ok');",
      "  process.exit(0);",
      "}",
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
      "  launch_id: process.env.COMATH_SANDBOX_LAUNCH_ID,",
      "  args",
      "};",
      "console.log(JSON.stringify(payload));",
      "console.error('task184 cross-provider configured provider helper stderr ok');"
    ].join("\n"),
    "utf8"
  );

  process.env[providerHelperEnvVar] = process.execPath;
  process.env[providerHelperArgsEnvVar] = JSON.stringify([helperScript]);
  process.env[fallbackHelperEnvVar] = "relative-fallback-must-not-be-used";
  process.env[fallbackHelperArgsEnvVar] = JSON.stringify(["fallback-args-must-not-be-used"]);

  const helperBinarySha256 = sha256File(process.execPath);
  const init = initProject({ name: "Goal3 Task184 Cross Provider Helper Assets", root_path: projectRoot });
  const projectId = init.project.project_id;

  const launch = prepareAgentAdapterOsIsolationSandboxLaunch(projectRoot, {
    project_id: projectId,
    launch_id: "ADAPTER-OSISO-LAUNCH-0184-CROSS-PROVIDER-READY",
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=launch-secret`,
    requested_provider: incompatibleProvider,
    launcher_environment: {
      platform: process.platform,
      notes: `${projectRoot} password=launcher-secret`
    }
  }, {
    launcher_probe: (probeInput) => {
      assert.equal(probeInput.provider, incompatibleProvider);
      return {
        probe_source: "service_owned_launcher_preflight",
        provider_available: true,
        launcher_binary_sha256: "a".repeat(64),
        launcher_version: `${incompatibleProvider}-launcher-1.0`,
        diagnostics: [`${projectRoot} launcher diagnostic must be scrubbed`, `${incompatibleProvider} launcher ready`]
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
      runner_id: "ADAPTER-OSISO-RUNNER-0184-CROSS-PROVIDER-READY",
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=runner-route-secret`,
      requested_provider: incompatibleProvider,
      runner_environment: {
        platform: process.platform,
        notes: `${projectRoot} Authorization: Bearer runner-route-secret`,
        provider_runner_available: false,
        runner_binary_sha256: "f".repeat(64),
        command_override: "caller-owned-cross-provider-runner",
        argv_override: ["--unsafe", "--claim-ready"]
      }
    }
  });
  assert.equal(routeRunner.status, 200, JSON.stringify(routeRunner.body));
  const readyRunner = routeRunner.body.runner;
  assert.equal(readyRunner.ok, true);
  assert.equal(readyRunner.provider, incompatibleProvider);
  assert.equal(readyRunner.provider_runner_ready, true);
  assert.equal(readyRunner.provider_runner_resolution.runner_binary_sha256, helperBinarySha256);
  assert.match(readyRunner.provider_runner_resolution.runner_version, new RegExp(incompatibleProvider));
  if (incompatibleProvider === "firejail") {
    assert.deepEqual(
      readyRunner.provider_runner_contract.fixed_argv_template.slice(0, 4),
      ["firejail", "--private", "--net=none", "--nonewprivs"]
    );
  } else {
    assert.deepEqual(
      readyRunner.provider_runner_contract.fixed_argv_template.slice(0, 3),
      ["sandbox-exec", "-f", "<service-owned-profile>"]
    );
  }
  assert.equal(readyRunner.provider_runner_contract.shell, false);
  assert.equal(readyRunner.provider_runner_contract.network_policy, "disabled");
  assert.equal(readyRunner.provider_runner_contract.command_override_allowed, false);
  assert.equal(readyRunner.provider_runner_contract.environment_override_allowed, false);
  assert.equal(readyRunner.provider_runner_contract.caller_supplied_success_allowed, false);
  assert.equal(readyRunner.adapter_execution_isolation.os_enforced, false);
  assert.equal(readyRunner.proof_authority, "none");
  assert.equal(readyRunner.can_promote_claim, false);
  assert.equal(readyRunner.can_certify_ga, false);
  assert.equal(JSON.stringify(readyRunner).includes(projectRoot), false);
  assert.equal(JSON.stringify(readyRunner).includes(process.execPath), false);
  assert.equal(JSON.stringify(readyRunner).includes("runner-route-secret"), false);

  const routeHost = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-helper-host-validation",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0184-PLATFORM-MISMATCH",
      runner_id: readyRunner.runner_id,
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=host-secret`,
      requested_provider: incompatibleProvider,
      host_environment: {
        platform: process.platform,
        notes: `${projectRoot} token=host-secret`,
        helper_host_ready: false,
        helper_binary_sha256: "e".repeat(64),
        command_override: "caller-owned-host-validator"
      }
    }
  });
  assert.equal(routeHost.status, 200, JSON.stringify(routeHost.body));
  const readyHost = routeHost.body.host_validation;
  assert.equal(readyHost.ok, false);
  assert.equal(readyHost.host_validation_status, "blocked_provider_helper_host_platform_mismatch");
  assert.equal(readyHost.provider_helper_host_ready, false);
  assert.equal(readyHost.provider_helper_host_validation.helper_binary_sha256, helperBinarySha256);
  assert.equal(readyHost.provider_helper_host_validation.runner_binary_sha256, helperBinarySha256);
  assert.equal(readyHost.provider_helper_host_validation.hashes_match_provider_runner, true);
  assert.equal(readyHost.provider_helper_host_validation.platform_supported, false);
  assert.equal(
    readyHost.provider_helper_host_validation.supported_platforms.includes(process.platform),
    false,
    "provider-platform contract must not accept the current host for a platform-incompatible provider"
  );
  assert.equal(readyHost.adapter_execution_isolation.os_enforced, false);
  assert.equal(readyHost.proof_authority, "none");
  assert.equal(readyHost.can_promote_claim, false);
  assert.equal(readyHost.can_certify_ga, false);
  assert.equal(JSON.stringify(readyHost).includes(projectRoot), false);
  assert.equal(JSON.stringify(readyHost).includes(process.execPath), false);
  assert.equal(JSON.stringify(readyHost).includes("host-secret"), false);

  const routeExecution = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-helper-execution",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      helper_execution_id: "ADAPTER-OSISO-HELPER-0184-CROSS-PROVIDER-EXEC",
      host_validation_id: readyHost.host_validation_id,
      runner_id: readyRunner.runner_id,
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=helper-route-secret`,
      requested_provider: incompatibleProvider,
      helper_environment: {
        platform: process.platform,
        notes: `${projectRoot} Authorization: Bearer helper-route-secret`,
        helper_available: false,
        helper_exit_code: 0,
        stdout_sha256: "1".repeat(64),
        stderr_sha256: "2".repeat(64),
        command_override: "caller-owned-helper",
        argv_override: ["--unsafe", "--claim-os-enforced"]
      }
    }
  });
  assert.equal(routeExecution.status, 200, JSON.stringify(routeExecution.body));
  const helperExecution = routeExecution.body.helper_execution;
  assert.equal(helperExecution.ok, false);
  assert.equal(helperExecution.helper_execution_status, "blocked_provider_helper_host_validation_not_validated");
  assert.equal(helperExecution.provider_helper_attempted, false);
  assert.equal(helperExecution.provider_helper_execution.helper_binary_sha256, null);
  assert.equal(helperExecution.provider_helper_execution.helper_args_prefix_sha256, null);
  assert.equal(helperExecution.provider_helper_execution.helper_args_prefix_count, 0);
  assert.equal(helperExecution.provider_helper_execution.helper_exit_code, null);
  assert.equal(helperExecution.provider_helper_execution.shell, false);
  assert.equal(helperExecution.provider_helper_execution.network_policy, "disabled");
  assert.equal(helperExecution.adapter_execution_isolation.current_boundary, "process_boundary_only");
  assert.equal(helperExecution.adapter_execution_isolation.os_enforced, false);
  assert.equal(helperExecution.proof_authority, "none");
  assert.equal(helperExecution.can_promote_claim, false);
  assert.equal(helperExecution.can_certify_ga, false);
  assert.equal(existsSync(join(projectRoot, helperExecution.helper_execution_path)), true);
  assert.equal(JSON.stringify(helperExecution).includes(projectRoot), false);
  assert.equal(JSON.stringify(helperExecution).includes(helperScript), false);
  assert.equal(JSON.stringify(helperExecution).includes(process.execPath), false);
  assert.equal(JSON.stringify(helperExecution).includes("helper-route-secret"), false);
  assert.equal(JSON.stringify(helperExecution).includes("caller-owned-helper"), false);
  assert.equal(JSON.stringify(helperExecution).includes("--claim-os-enforced"), false);

  const routeCollection = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-helper-collection",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      collection_id: "ADAPTER-OSISO-HELPER-COLLECT-0184-PLATFORM-MISMATCH",
      helper_execution_id: helperExecution.helper_execution_id,
      runner_id: readyRunner.runner_id,
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=collection-route-secret`,
      requested_provider: incompatibleProvider,
      collection_environment: {
        platform: process.platform,
        notes: `${projectRoot} token=collection-route-secret`,
        process_isolation_enforced: true,
        filesystem_scope_enforced: true,
        network_isolation_enforced: true,
        no_new_privileges: true,
        escape_prevention: true,
        adapter_process_exit_code: 0,
        stdout_sha256: "1".repeat(64),
        stderr_sha256: "2".repeat(64),
        transcript_sha256: "3".repeat(64)
      }
    }
  });
  assert.equal(routeCollection.status, 200, JSON.stringify(routeCollection.body));
  assert.equal(routeCollection.body.collection.ok, false);
  assert.equal(routeCollection.body.collection.collection_status, "blocked_provider_helper_execution_not_attempted");
  assert.equal(routeCollection.body.collection.adapter_execution_isolation.os_enforced, false);
  assert.equal(routeCollection.body.collection.can_certify_ga, false);
  assert.equal(JSON.stringify(routeCollection.body).includes(projectRoot), false);
  assert.equal(JSON.stringify(routeCollection.body).includes("collection-route-secret"), false);

  const collected = collectAgentAdapterOsIsolationProviderHelperExecutionEvidence(projectRoot, {
    project_id: projectId,
    collection_id: "ADAPTER-OSISO-HELPER-COLLECT-0184-INTERNAL-BLOCKED",
    helper_execution_id: helperExecution.helper_execution_id,
    runner_id: readyRunner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=collector-secret`,
    requested_provider: incompatibleProvider,
    collection_environment: {
      platform: process.platform,
      notes: `${projectRoot} token=collector-secret`
    }
  }, {
    provider_helper_collection_probe: (probeInput) => {
      throw new Error(`collector must not run for blocked ${incompatibleProvider} helper execution`);
    }
  });
  assert.equal(collected.ok, false);
  assert.equal(collected.collection_status, "blocked_provider_helper_execution_not_attempted");
  assert.equal(collected.adapter_execution_isolation.current_boundary, "process_boundary_only");
  assert.equal(collected.adapter_execution_isolation.os_enforced, false);
  assert.equal(collected.proof_authority, "none");
  assert.equal(collected.can_promote_claim, false);
  assert.equal(collected.can_certify_ga, false);
  assert.equal(JSON.stringify(collected).includes(projectRoot), false);
  assert.equal(JSON.stringify(collected).includes("collector-secret"), false);

  const notHostEvidence = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0184-CROSS-PROVIDER-HOST-NOT-EVIDENCE",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task184-test",
    evidence_path: readyHost.host_validation_path
  });
  assert.equal(notHostEvidence.ok, false, "platform-mismatched host-validation manifest is not readiness evidence");
  assert.equal(
    notHostEvidence.vetoes.some((veto) => veto.code === "adapter_os_isolation_evidence_not_service_owned_probe"),
    true
  );

  const notExecutionEvidence = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0184-CROSS-PROVIDER-EXECUTION-NOT-EVIDENCE",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task184-test",
    evidence_path: helperExecution.helper_execution_path
  });
  assert.equal(notExecutionEvidence.ok, false, "blocked helper execution manifest is still not readiness evidence");
  assert.equal(
    notExecutionEvidence.vetoes.some((veto) => veto.code === "adapter_os_isolation_evidence_not_service_owned_probe"),
    true
  );

  const compatibleProjectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task184-compatible-helper-assets-"));
  let compatibleHelperForRestore = null;
  let previousCompatibleProviderHelper;
  let previousCompatibleProviderHelperArgs;
  try {
    const compatibleProvider = process.platform === "darwin" ? "macos_sandbox_exec" : process.platform === "win32" ? "windows_appcontainer" : "firejail";
    const compatibleHelper = providerHelpers.find((entry) => entry.provider === compatibleProvider);
    assert.ok(compatibleHelper, "test must select a known platform-compatible provider helper");
    compatibleHelperForRestore = compatibleHelper;
    previousCompatibleProviderHelper = process.env[compatibleHelper.helperEnv];
    previousCompatibleProviderHelperArgs = process.env[compatibleHelper.argsEnv];
    const compatibleHelperScript = join(compatibleProjectRoot, "task184-compatible-provider-helper.mjs");
    writeFileSync(
      compatibleHelperScript,
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
        "  console.error('task184 compatible provider helper self-test stderr ok');",
        "  process.exit(0);",
        "}",
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
        "  launch_id: process.env.COMATH_SANDBOX_LAUNCH_ID,",
        "  args",
        "};",
        "console.log(JSON.stringify(payload));",
        "console.error('task184 compatible provider helper stderr ok');"
      ].join("\n"),
      "utf8"
    );
    process.env[compatibleHelper.helperEnv] = process.execPath;
    process.env[compatibleHelper.argsEnv] = JSON.stringify([compatibleHelperScript]);

    const compatibleArgsPrefixSha256 = sha256Text(canonicalJson([compatibleHelperScript]));
    const compatibleInit = initProject({
      name: "Goal3 Task184 Compatible Provider Helper Assets",
      root_path: compatibleProjectRoot
    });
    const compatibleProjectId = compatibleInit.project.project_id;
    const compatibleLaunch = prepareAgentAdapterOsIsolationSandboxLaunch(compatibleProjectRoot, {
      project_id: compatibleProjectId,
      launch_id: "ADAPTER-OSISO-LAUNCH-0184-COMPATIBLE-READY",
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${compatibleProjectRoot} token=compatible-launch-secret`,
      requested_provider: compatibleProvider,
      launcher_environment: {
        platform: process.platform,
        notes: `${compatibleProjectRoot} password=compatible-launch-secret`
      }
    }, {
      launcher_probe: (probeInput) => {
        assert.equal(probeInput.provider, compatibleProvider);
        return {
          probe_source: "service_owned_launcher_preflight",
          provider_available: true,
          launcher_binary_sha256: "b".repeat(64),
          launcher_version: `${compatibleProvider}-launcher-1.0`,
          diagnostics: [`${compatibleProjectRoot} compatible launcher diagnostic must be scrubbed`, "compatible launcher ready"]
        };
      }
    });
    assert.equal(compatibleLaunch.ok, true);

    const compatibleServer = createComathServer();
    const compatibleRunnerRoute = await compatibleServer.inject({
      method: "POST",
      path: "/agent/adapter/package/os-isolation-provider-runner",
      body: {
        project_root: compatibleProjectRoot,
        project_id: compatibleProjectId,
        runner_id: "ADAPTER-OSISO-RUNNER-0184-COMPATIBLE-READY",
        launch_id: compatibleLaunch.launch_id,
        adapter_id: "codex-cli",
        backend: "external",
        actor: `${compatibleProjectRoot} token=compatible-runner-secret`,
        requested_provider: compatibleProvider,
        runner_environment: {
          platform: process.platform,
          notes: `${compatibleProjectRoot} token=compatible-runner-secret`
        }
      }
    });
    assert.equal(compatibleRunnerRoute.status, 200, JSON.stringify(compatibleRunnerRoute.body));
    const compatibleRunner = compatibleRunnerRoute.body.runner;
    assert.equal(compatibleRunner.ok, true);
    assert.equal(compatibleRunner.provider, compatibleProvider);

    const compatibleHostRoute = await compatibleServer.inject({
      method: "POST",
      path: "/agent/adapter/package/os-isolation-provider-helper-host-validation",
      body: {
        project_root: compatibleProjectRoot,
        project_id: compatibleProjectId,
        host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0184-COMPATIBLE-READY",
        runner_id: compatibleRunner.runner_id,
        launch_id: compatibleLaunch.launch_id,
        adapter_id: "codex-cli",
        backend: "external",
        actor: `${compatibleProjectRoot} token=compatible-host-secret`,
        requested_provider: compatibleProvider,
        host_environment: {
          platform: "spoofed-platform-must-not-drive-contract",
          notes: `${compatibleProjectRoot} token=compatible-host-secret`
        }
      }
    });
    assert.equal(compatibleHostRoute.status, 200, JSON.stringify(compatibleHostRoute.body));
    const compatibleHost = compatibleHostRoute.body.host_validation;
    assert.equal(compatibleHost.ok, true);
    assert.equal(compatibleHost.host_validation_status, "provider_helper_host_validated");
    assert.equal(compatibleHost.provider_helper_host_ready, true);
    assert.equal(compatibleHost.provider_helper_host_validation.platform, process.platform);
    assert.equal(compatibleHost.provider_helper_host_validation.platform_supported, true);
    assert.equal(compatibleHost.provider_helper_host_validation.supported_platforms.includes(process.platform), true);
    assert.equal(JSON.stringify(compatibleHost).includes("spoofed-platform-must-not-drive-contract"), false);

    const compatibleExecutionRoute = await compatibleServer.inject({
      method: "POST",
      path: "/agent/adapter/package/os-isolation-provider-helper-execution",
      body: {
        project_root: compatibleProjectRoot,
        project_id: compatibleProjectId,
        helper_execution_id: "ADAPTER-OSISO-HELPER-0184-COMPATIBLE-EXEC",
        host_validation_id: compatibleHost.host_validation_id,
        runner_id: compatibleRunner.runner_id,
        launch_id: compatibleLaunch.launch_id,
        adapter_id: "codex-cli",
        backend: "external",
        actor: `${compatibleProjectRoot} token=compatible-helper-secret`,
        requested_provider: compatibleProvider,
        helper_environment: {
          platform: process.platform,
          notes: `${compatibleProjectRoot} token=compatible-helper-secret`
        }
      }
    });
    assert.equal(compatibleExecutionRoute.status, 200, JSON.stringify(compatibleExecutionRoute.body));
    const compatibleExecution = compatibleExecutionRoute.body.helper_execution;
    assert.equal(compatibleExecution.ok, true);
    assert.equal(compatibleExecution.helper_execution_status, "provider_helper_execution_attempted");
    assert.equal(compatibleExecution.provider_helper_attempted, true);
    assert.equal(compatibleExecution.provider_helper_execution.helper_args_prefix_sha256, compatibleArgsPrefixSha256);
    assert.equal(compatibleExecution.provider_helper_execution.helper_args_prefix_count, 1);
    assert.equal(compatibleExecution.provider_helper_execution.helper_exit_code, 0);
    assert.equal(compatibleExecution.adapter_execution_isolation.os_enforced, false);
    assert.equal(compatibleExecution.proof_authority, "none");
    assert.equal(compatibleExecution.can_certify_ga, false);
    assert.equal(JSON.stringify(compatibleExecution).includes(compatibleProjectRoot), false);
    assert.equal(JSON.stringify(compatibleExecution).includes(compatibleHelperScript), false);
    assert.equal(JSON.stringify(compatibleExecution).includes("compatible-helper-secret"), false);

    const compatibleCollected = collectAgentAdapterOsIsolationProviderHelperExecutionEvidence(compatibleProjectRoot, {
      project_id: compatibleProjectId,
      collection_id: "ADAPTER-OSISO-HELPER-COLLECT-0184-COMPATIBLE-READY",
      helper_execution_id: compatibleExecution.helper_execution_id,
      runner_id: compatibleRunner.runner_id,
      launch_id: compatibleLaunch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${compatibleProjectRoot} token=compatible-collector-secret`,
      requested_provider: compatibleProvider,
      collection_environment: {
        platform: process.platform,
        notes: `${compatibleProjectRoot} token=compatible-collector-secret`
      }
    }, {
      provider_helper_collection_probe: (probeInput) => {
        assert.equal(probeInput.helper_execution_id, compatibleExecution.helper_execution_id);
        assert.equal(probeInput.helper_exit_code, 0);
        return {
          probe_source: "service_owned_provider_helper_collection_probe",
          collection_source: "service_owned_os_probe",
          process_isolation_enforced: true,
          filesystem_scope_enforced: true,
          network_isolation_enforced: true,
          no_new_privileges: true,
          escape_prevention: true,
          adapter_process_exit_code: 0,
          stdout_sha256: compatibleExecution.provider_helper_execution.stdout_sha256,
          stderr_sha256: compatibleExecution.provider_helper_execution.stderr_sha256,
          transcript_sha256: compatibleExecution.provider_helper_execution.transcript_sha256,
          diagnostics: [`${compatibleProjectRoot} collector diagnostic must be scrubbed`, "task184 compatible helper collection succeeded"]
        };
      }
    });
    assert.equal(compatibleCollected.ok, true);
    assert.equal(compatibleCollected.collection_status, "provider_helper_os_evidence_collected");
    assert.equal(compatibleCollected.adapter_execution_isolation.os_enforced, false, "helper collection wrapper is not readiness evidence by itself");
    assert.equal(compatibleCollected.probe.adapter_execution_isolation.os_enforced, true);
    assert.equal(compatibleCollected.proof_authority, "none");
    assert.equal(compatibleCollected.can_certify_ga, false);
    assert.equal(JSON.stringify(compatibleCollected).includes(compatibleProjectRoot), false);
    assert.equal(JSON.stringify(compatibleCollected).includes("compatible-collector-secret"), false);

    const compatibleReadiness = reviewAgentAdapterOsIsolationReadiness(compatibleProjectRoot, {
      project_id: compatibleProjectId,
      review_id: "ADAPTER-OSISO-0184-COMPATIBLE-READY-FROM-CANONICAL-EVIDENCE",
      adapter_id: "codex-cli",
      backend: "external",
      actor: "goal3-task184-test",
      evidence_path: compatibleCollected.probe.evidence_path
    });
    assert.equal(compatibleReadiness.ok, true, "only canonical collected evidence should pass the readiness gate");
    assert.equal(compatibleReadiness.can_certify_ga, false);

  } finally {
    if (compatibleHelperForRestore) {
      if (previousCompatibleProviderHelper === undefined) {
        delete process.env[compatibleHelperForRestore.helperEnv];
      } else {
        process.env[compatibleHelperForRestore.helperEnv] = previousCompatibleProviderHelper;
      }
      if (previousCompatibleProviderHelperArgs === undefined) {
        delete process.env[compatibleHelperForRestore.argsEnv];
      } else {
        process.env[compatibleHelperForRestore.argsEnv] = previousCompatibleProviderHelperArgs;
      }
    }
    rmSync(compatibleProjectRoot, { recursive: true, force: true });
  }
} finally {
  if (previousProviderHelper === undefined) {
    delete process.env[providerHelperEnvVar];
  } else {
    process.env[providerHelperEnvVar] = previousProviderHelper;
  }
  if (previousProviderHelperArgs === undefined) {
    delete process.env[providerHelperArgsEnvVar];
  } else {
    process.env[providerHelperArgsEnvVar] = previousProviderHelperArgs;
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

console.log("Goal 3 Task184 cross-provider configured helper asset tests passed.");
