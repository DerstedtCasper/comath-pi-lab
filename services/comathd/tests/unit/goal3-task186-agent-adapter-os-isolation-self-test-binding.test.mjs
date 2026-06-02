import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createComathServer,
  getComathdStatus,
  initProject,
  prepareAgentAdapterOsIsolationSandboxLaunch
} from "../../dist/index.js";

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
  "Task185 self-test contract must remain advertised while Task186 hardens its binding"
);

const previousProviderHelper = process.env[compatibleHelper.helperEnv];
const previousProviderHelperArgs = process.env[compatibleHelper.argsEnv];
const previousFallbackHelper = process.env.COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER;
const previousFallbackHelperArgs = process.env.COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER_ARGS_JSON;
const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task186-self-test-binding-"));

function writeHelperScript(path, bodyLines) {
  writeFileSync(path, bodyLines.join("\n"), "utf8");
}

try {
  const genericHelperScript = join(projectRoot, "task186-generic-self-test.mjs");
  writeHelperScript(genericHelperScript, [
    "const args = process.argv.slice(2);",
    "const valueAfter = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : null; };",
    "if (!args.includes('--comath-provider-helper-self-test')) process.exit(2);",
    "console.log(JSON.stringify({",
    "  comath_provider_helper_self_test: true,",
    "  ok: true,",
    "  provider: valueAfter('--provider'),",
    "  network_policy: valueAfter('--network-policy'),",
    "  proof_authority: valueAfter('--proof-authority'),",
    "  adapter: process.env.COMATH_ADAPTER_ID,",
    "  backend: process.env.COMATH_ADAPTER_BACKEND",
    "}));"
  ]);

  process.env[compatibleHelper.helperEnv] = process.execPath;
  process.env[compatibleHelper.argsEnv] = JSON.stringify([genericHelperScript]);
  delete process.env.COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER;
  delete process.env.COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER_ARGS_JSON;

  const init = initProject({ name: "Goal3 Task186 Self Test Binding", root_path: projectRoot });
  const projectId = init.project.project_id;
  const server = createComathServer();
  const launch = prepareAgentAdapterOsIsolationSandboxLaunch(projectRoot, {
    project_id: projectId,
    launch_id: "ADAPTER-OSISO-LAUNCH-0186-SELF-TEST-BINDING",
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=launch-secret`,
    requested_provider: compatibleProvider,
    launcher_environment: {
      platform: process.platform,
      notes: `${projectRoot} token=launch-secret`
    }
  }, {
    launcher_probe: () => ({
      probe_source: "service_owned_launcher_preflight",
      provider_available: true,
      launcher_binary_sha256: "a".repeat(64),
      launcher_version: `${compatibleProvider}-launcher-task186`,
      diagnostics: [`${projectRoot} launcher diagnostic must be scrubbed`, "launcher ready"]
    })
  });
  assert.equal(launch.ok, true);

  const runnerRoute = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-runner",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      runner_id: "ADAPTER-OSISO-RUNNER-0186-SELF-TEST-BINDING",
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=runner-secret`,
      requested_provider: compatibleProvider,
      runner_environment: {
        platform: process.platform,
        notes: `${projectRoot} token=runner-secret`
      }
    }
  });
  assert.equal(runnerRoute.status, 200, JSON.stringify(runnerRoute.body));
  const runner = runnerRoute.body.runner;
  assert.equal(runner.ok, true);

  const genericHostRoute = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-helper-host-validation",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0186-GENERIC-SELF-TEST",
      runner_id: runner.runner_id,
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=generic-host-secret`,
      requested_provider: compatibleProvider,
      host_environment: {
        platform: "caller-spoofed-platform",
        notes: `${projectRoot} token=generic-host-secret`,
        helper_host_ready: true,
        command_override: "caller-owned-host-validator"
      }
    }
  });
  assert.equal(genericHostRoute.status, 200, JSON.stringify(genericHostRoute.body));
  const genericHost = genericHostRoute.body.host_validation;
  assert.equal(
    genericHost.ok,
    false,
    "a generic self-test response must not validate a helper unless it binds the current host-validation/run/launch/project"
  );
  assert.equal(genericHost.host_validation_status, "blocked_provider_helper_host_self_test_failed");
  assert.equal(genericHost.provider_helper_host_validation.self_test_exit_code, 0);
  assert.equal(genericHost.provider_helper_host_validation.self_test_passed, false);
  assert.equal(JSON.stringify(genericHost).includes(projectRoot), false);
  assert.equal(JSON.stringify(genericHost).includes(genericHelperScript), false);
  assert.equal(JSON.stringify(genericHost).includes("generic-host-secret"), false);
  assert.equal(JSON.stringify(genericHost).includes("caller-owned-host-validator"), false);

  const boundHelperScript = join(projectRoot, "task186-bound-self-test.mjs");
  writeHelperScript(boundHelperScript, [
    "const args = process.argv.slice(2);",
    "const valueAfter = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : null; };",
    "if (!args.includes('--comath-provider-helper-self-test')) process.exit(2);",
    "console.log(JSON.stringify({",
    "  comath_provider_helper_self_test: true,",
    "  ok: true,",
    "  provider: valueAfter('--provider'),",
    "  network_policy: valueAfter('--network-policy'),",
    "  proof_authority: valueAfter('--proof-authority'),",
    "  adapter: process.env.COMATH_ADAPTER_ID,",
    "  backend: process.env.COMATH_ADAPTER_BACKEND,",
    "  project_id: process.env.COMATH_PROJECT_ID,",
    "  host_validation_id: valueAfter('--host-validation-id'),",
    "  runner_id: valueAfter('--runner-id'),",
    "  launch_id: valueAfter('--launch-id')",
    "}));"
  ]);
  process.env[compatibleHelper.argsEnv] = JSON.stringify([boundHelperScript]);

  const boundHostRoute = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-helper-host-validation",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0186-BOUND-SELF-TEST",
      runner_id: runner.runner_id,
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=bound-host-secret`,
      requested_provider: compatibleProvider,
      host_environment: {
        platform: "caller-spoofed-platform",
        notes: `${projectRoot} token=bound-host-secret`
      }
    }
  });
  assert.equal(boundHostRoute.status, 200, JSON.stringify(boundHostRoute.body));
  const boundHost = boundHostRoute.body.host_validation;
  assert.equal(boundHost.ok, true);
  assert.equal(boundHost.host_validation_status, "provider_helper_host_validated");
  assert.equal(boundHost.provider_helper_host_validation.self_test_passed, true);
  assert.equal(boundHost.provider_helper_host_validation.platform, process.platform);
  assert.equal(boundHost.provider_helper_host_validation.platform_supported, true);
  assert.equal(boundHost.adapter_execution_isolation.os_enforced, false);
  assert.equal(boundHost.proof_authority, "none");
  assert.equal(boundHost.can_certify_ga, false);
  assert.equal(JSON.stringify(boundHost).includes(projectRoot), false);
  assert.equal(JSON.stringify(boundHost).includes(boundHelperScript), false);
  assert.equal(JSON.stringify(boundHost).includes("bound-host-secret"), false);
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
    delete process.env.COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER;
  } else {
    process.env.COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER = previousFallbackHelper;
  }
  if (previousFallbackHelperArgs === undefined) {
    delete process.env.COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER_ARGS_JSON;
  } else {
    process.env.COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER_ARGS_JSON = previousFallbackHelperArgs;
  }
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task186 provider helper self-test binding tests passed.");
