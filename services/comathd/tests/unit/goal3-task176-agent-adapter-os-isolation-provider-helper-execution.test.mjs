import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createComathServer,
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

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task176-adapter-osiso-helper-"));

try {
  assert.equal(
    typeof runAgentAdapterOsIsolationProviderHelperExecution,
    "function",
    "Task176 must export a service-owned adapter OS-isolation provider-helper execution producer"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("agent_adapter_os_isolation_provider_helper_execution"),
    true,
    "Task176 service capability ledger must advertise provider helper execution attempts"
  );

  const init = initProject({ name: "Goal3 Task176 Adapter OS Isolation Provider Helper", root_path: projectRoot });
  const projectId = init.project.project_id;

  const spoofed = runAgentAdapterOsIsolationProviderHelperExecution(projectRoot, {
    project_id: projectId,
    helper_execution_id: "ADAPTER-OSISO-HELPER-0176-SPOOFED",
    runner_id: "ADAPTER-OSISO-RUNNER-0176-MISSING",
    launch_id: "ADAPTER-OSISO-LAUNCH-0176-MISSING",
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=spoof-secret`,
    requested_provider: "windows_appcontainer",
    helper_environment: {
      platform: "win32",
      notes: `${projectRoot} Authorization: Bearer spoof-token`,
      helper_available: true,
      helper_exit_code: 0,
      stdout_sha256: "1".repeat(64),
      stderr_sha256: "2".repeat(64),
      command_override: "powershell -NoProfile unsafe-user-helper",
      argv_override: ["--claim-os-enforced", projectRoot],
      env_override: {
        COMATH_SECRET: "token=env-secret"
      }
    }
  });
  assert.equal(spoofed.ok, false, "caller-supplied helper success metadata must not make execution ready");
  assert.equal(spoofed.helper_execution_status, "blocked_provider_runner_manifest_missing");
  assert.equal(spoofed.provider_helper_attempted, false);
  assert.equal(spoofed.adapter_execution_isolation.current_boundary, "process_boundary_only");
  assert.equal(spoofed.adapter_execution_isolation.os_enforced, false);
  assert.equal(spoofed.proof_authority, "none");
  assert.equal(spoofed.can_promote_claim, false);
  assert.equal(spoofed.can_certify_ga, false);
  assert.equal(existsSync(join(projectRoot, spoofed.helper_execution_path)), true, "helper execution manifest must be persisted");
  assert.equal(JSON.stringify(spoofed).includes(projectRoot), false, "helper execution result must not echo host paths");
  assert.equal(JSON.stringify(spoofed).includes("spoof-secret"), false, "helper execution result must not echo actor secrets");
  assert.equal(JSON.stringify(spoofed).includes("spoof-token"), false, "helper execution result must not echo payload secrets");
  assert.equal(JSON.stringify(spoofed).includes("unsafe-user-helper"), false, "caller helper command overrides must not be persisted");
  assert.equal(JSON.stringify(spoofed).includes("env-secret"), false, "caller helper environment overrides must not be persisted");
  assert.equal(JSON.stringify(spoofed).includes("111111"), false, "caller stdout hashes must not be accepted");

  const helperScript = join(projectRoot, "task176-provider-helper.mjs");
  writeFileSync(
    helperScript,
    [
      "const payload = {",
      "  provider: process.env.COMATH_OS_ISOLATION_PROVIDER,",
      "  network: process.env.COMATH_RUNNER_NETWORK,",
      "  proof: process.env.COMATH_PROOF_AUTHORITY,",
      "  adapter: process.env.COMATH_ADAPTER_ID,",
      "  backend: process.env.COMATH_ADAPTER_BACKEND,",
      "  args: process.argv.slice(2)",
      "};",
      "console.log(JSON.stringify(payload));",
      "console.error('provider helper stderr ok');"
    ].join("\n"),
    "utf8"
  );
  const helperBinarySha256 = sha256File(process.execPath);

  const launch = prepareAgentAdapterOsIsolationSandboxLaunch(projectRoot, {
    project_id: projectId,
    launch_id: "ADAPTER-OSISO-LAUNCH-0176-READY",
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=launch-secret`,
    requested_provider: "windows_appcontainer",
    launcher_environment: {
      platform: "win32",
      notes: `${projectRoot} password=launcher-secret`
    }
  }, {
    launcher_probe: (probeInput) => {
      assert.equal(probeInput.project_root, projectRoot);
      assert.equal(probeInput.provider, "windows_appcontainer");
      return {
        probe_source: "service_owned_launcher_preflight",
        provider_available: true,
        launcher_binary_sha256: "a".repeat(64),
        launcher_version: "appcontainer-launcher-4.0",
        diagnostics: [`${projectRoot} launcher diagnostic must be scrubbed`, "launcher ready"]
      };
    }
  });
  assert.equal(launch.ok, true, "ready sandbox-launch preflight is required before provider helper execution");

  const readyRunner = prepareAgentAdapterOsIsolationProviderRunner(projectRoot, {
    project_id: projectId,
    runner_id: "ADAPTER-OSISO-RUNNER-0176-READY",
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=runner-secret`,
    requested_provider: "windows_appcontainer",
    runner_environment: {
      platform: "win32",
      notes: `${projectRoot} password=runner-secret`
    }
  }, {
    provider_runner_resolver: (runnerInput) => {
      assert.equal(runnerInput.project_root, projectRoot);
      assert.equal(runnerInput.launch_id, launch.launch_id);
      assert.equal(runnerInput.provider, "windows_appcontainer");
      return {
        resolution_source: "service_owned_provider_runner_resolver",
        runner_available: true,
        runner_binary_sha256: helperBinarySha256,
        runner_version: "node-provider-helper-test",
        diagnostics: [`${projectRoot} runner diagnostic must be scrubbed`, "runner resolved"]
      };
    }
  });
  assert.equal(readyRunner.ok, true, "ready provider-runner manifest is required before helper execution");

  const hostCapability = probeAgentAdapterOsIsolationProviderHostCapability(projectRoot, {
    project_id: projectId,
    host_capability_probe_id: "ADAPTER-OSISO-HOST-CAP-0176-READY",
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=host-capability-secret`,
    requested_provider: "windows_appcontainer",
    host_capability_environment: {
      platform: "caller-spoofed-platform",
      notes: `${projectRoot} password=host-capability-secret`
    }
  }, {
    provider_host_capability_probe: (probeInput) => {
      assert.equal(probeInput.project_root, projectRoot);
      assert.equal(probeInput.provider, "windows_appcontainer");
      assert.equal(probeInput.platform, process.platform);
      return {
        probe_source: "service_owned_provider_host_capability_probe",
        provider_host_capability_available: true,
        capability_facts: ["task176 helper execution host-validation prerequisite observed"],
        required_tools: ["windows_appcontainer-task176-host-probe"],
        kernel_features: ["task176-provider-host-capability"],
        diagnostics: [`${projectRoot} host capability diagnostic must be scrubbed`, "host capability observed"]
      };
    }
  });
  assert.equal(hostCapability.ok, true, "Task191 requires service-owned host capability before helper host validation");

  const callerOnlyRoute = await createComathServer().inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-helper-execution",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      helper_execution_id: "ADAPTER-OSISO-HELPER-0176-ROUTE",
      runner_id: readyRunner.runner_id,
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: "goal3-task176-route-test",
      requested_provider: "windows_appcontainer",
      helper_environment: {
        platform: "win32",
        notes: `${projectRoot} token=route-secret`,
        helper_available: true,
        helper_exit_code: 0,
        stdout_sha256: "3".repeat(64),
        stderr_sha256: "4".repeat(64),
        command_override: "unsafe-route-helper",
        argv_override: ["--unsafe"],
        env_override: {
          TOKEN: "route-secret"
        }
      }
    }
  });
  assert.equal(callerOnlyRoute.status, 200, JSON.stringify(callerOnlyRoute.body));
  assert.equal(
    callerOnlyRoute.body.helper_execution.helper_execution_status,
    "blocked_provider_helper_host_validation_missing",
    "route callers cannot self-configure or self-validate the provider helper host"
  );
  assert.equal(callerOnlyRoute.body.helper_execution.provider_helper_attempted, false);
  assert.equal(callerOnlyRoute.body.helper_execution.can_certify_ga, false);
  assert.equal(JSON.stringify(callerOnlyRoute.body).includes(projectRoot), false, "route response must not echo host paths");
  assert.equal(JSON.stringify(callerOnlyRoute.body).includes("route-secret"), false, "route response must not echo secrets");
  assert.equal(JSON.stringify(callerOnlyRoute.body).includes("unsafe-route-helper"), false, "route response must not echo caller command overrides");
  assert.equal(JSON.stringify(callerOnlyRoute.body).includes("--unsafe"), false, "route response must not echo caller argv overrides");

  const readyHost = validateAgentAdapterOsIsolationProviderHelperHost(projectRoot, {
    project_id: projectId,
    host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0176-READY",
    host_capability_probe_id: hostCapability.host_capability_probe_id,
    runner_id: readyRunner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=host-secret`,
    requested_provider: "windows_appcontainer",
    host_environment: {
      platform: "win32",
      notes: `${projectRoot} password=host-secret`
    }
  }, {
    provider_helper_host_validator: (hostInput) => {
      assert.equal(hostInput.project_root, projectRoot);
      assert.equal(hostInput.project_id, projectId);
      assert.equal(hostInput.host_validation_id, "ADAPTER-OSISO-HELPER-HOST-0176-READY");
      assert.equal(hostInput.host_capability_probe_id, hostCapability.host_capability_probe_id);
      assert.equal(hostInput.host_capability_status, "provider_host_capability_observed");
      assert.equal(hostInput.provider_host_capability_available, true);
      assert.equal(hostInput.runner_id, readyRunner.runner_id);
      assert.equal(hostInput.launch_id, launch.launch_id);
      assert.equal(hostInput.provider, "windows_appcontainer");
      assert.equal(hostInput.runner_binary_sha256, helperBinarySha256);
      return {
        validation_source: "service_owned_provider_helper_host_validator",
        helper_host_ready: true,
        helper_program: process.execPath,
        helper_binary_sha256: helperBinarySha256,
        helper_version: "node-provider-helper-test",
        supported_platforms: ["win32"],
        diagnostics: [`${projectRoot} host validation diagnostic must be scrubbed`, "helper host ready"]
      };
    }
  });
  assert.equal(readyHost.ok, true, "ready provider-helper host validation is required before helper execution");

  const helperExecution = runAgentAdapterOsIsolationProviderHelperExecution(projectRoot, {
    project_id: projectId,
    helper_execution_id: "ADAPTER-OSISO-HELPER-0176-READY",
    host_validation_id: readyHost.host_validation_id,
    runner_id: readyRunner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=helper-actor-secret`,
    requested_provider: "windows_appcontainer",
    helper_environment: {
      platform: "win32",
      notes: `${projectRoot} password=helper-secret`,
      helper_available: true,
      helper_exit_code: 0,
      stdout_sha256: "5".repeat(64),
      stderr_sha256: "6".repeat(64),
      command_override: "caller-helper-command",
      argv_override: ["--claim-ready"],
      env_override: {
        SECRET: "helper-secret"
      }
    }
  }, {
    provider_helper_config_resolver: (helperInput) => {
      assert.equal(helperInput.project_root, projectRoot);
      assert.equal(helperInput.project_id, projectId);
      assert.equal(helperInput.helper_execution_id, "ADAPTER-OSISO-HELPER-0176-READY");
      assert.equal(helperInput.runner_id, readyRunner.runner_id);
      assert.equal(helperInput.launch_id, launch.launch_id);
      assert.equal(helperInput.runner_path, readyRunner.runner_path);
      assert.equal(helperInput.adapter_id, "codex-cli");
      assert.equal(helperInput.backend, "external");
      assert.equal(helperInput.provider, "windows_appcontainer");
      assert.equal(helperInput.runner_binary_sha256, helperBinarySha256);
      return {
        config_source: "service_owned_provider_helper_config",
        helper_available: true,
        helper_program: process.execPath,
        helper_args_prefix: [helperScript],
        helper_version: "node-provider-helper-test",
        timeout_ms: 5000,
        diagnostics: [`${projectRoot} helper config diagnostic must be scrubbed`, "helper configured"]
      };
    }
  });
  assert.equal(helperExecution.schema_version, "comath.agent_adapter_os_isolation_provider_helper_execution.v1");
  assert.equal(helperExecution.ok, true, "service-owned provider helper should be executed as a real child process");
  assert.equal(helperExecution.helper_execution_status, "provider_helper_execution_attempted");
  assert.equal(helperExecution.host_validation_artifact.path, readyHost.host_validation_path);
  assert.equal(helperExecution.provider_helper_host_validation_binding.bound, true);
  assert.equal(helperExecution.provider_helper_host_validation_binding.host_validation_status, "provider_helper_host_validated");
  assert.equal(helperExecution.launch_artifact.path, launch.launch_path);
  assert.equal(helperExecution.runner_artifact.path, readyRunner.runner_path);
  assert.equal(helperExecution.provider, "windows_appcontainer");
  assert.equal(helperExecution.provider_helper_attempted, true);
  assert.equal(helperExecution.provider_helper_execution.helper_source, "service_owned_provider_helper_config");
  assert.equal(helperExecution.provider_helper_execution.helper_binary_sha256, helperBinarySha256);
  assert.equal(helperExecution.provider_helper_execution.helper_exit_code, 0);
  assert.match(helperExecution.provider_helper_execution.stdout_sha256, /^[a-f0-9]{64}$/);
  assert.match(helperExecution.provider_helper_execution.stderr_sha256, /^[a-f0-9]{64}$/);
  assert.match(helperExecution.provider_helper_execution.transcript_sha256, /^[a-f0-9]{64}$/);
  assert.notEqual(helperExecution.provider_helper_execution.stdout_sha256, "5".repeat(64), "caller stdout hash must not be accepted");
  assert.notEqual(helperExecution.provider_helper_execution.stderr_sha256, "6".repeat(64), "caller stderr hash must not be accepted");
  assert.equal(helperExecution.provider_helper_execution.shell, false);
  assert.equal(helperExecution.provider_helper_execution.network_policy, "disabled");
  assert.equal(helperExecution.provider_helper_execution.command_override_allowed, false);
  assert.equal(helperExecution.provider_helper_execution.environment_policy.inherit_parent_environment, false);
  assert.equal(helperExecution.provider_helper_execution.environment_policy.env_override_allowed, false);
  assert.equal(helperExecution.provider_helper_execution.fixed_args_template.includes("--provider"), true);
  assert.equal(helperExecution.provider_helper_execution.fixed_args_template.includes("windows_appcontainer"), true);
  assert.equal(helperExecution.adapter_execution_isolation.current_boundary, "process_boundary_only");
  assert.equal(
    helperExecution.adapter_execution_isolation.os_enforced,
    false,
    "provider helper exit 0 is not collected OS-enforcement evidence by itself"
  );
  assert.equal(helperExecution.proof_authority, "none");
  assert.equal(helperExecution.can_promote_claim, false);
  assert.equal(helperExecution.can_certify_ga, false);
  assert.equal(helperExecution.blocker_certificate.blocker_code, "provider_helper_execution_attempted");
  assert.equal(existsSync(join(projectRoot, helperExecution.helper_execution_path)), true);
  assert.equal(JSON.stringify(helperExecution).includes(projectRoot), false, "helper execution result must not echo host paths");
  assert.equal(JSON.stringify(helperExecution).includes("helper-actor-secret"), false, "helper execution result must not echo actor secrets");
  assert.equal(JSON.stringify(helperExecution).includes("helper-secret"), false, "helper execution result must not echo payload secrets");
  assert.equal(JSON.stringify(helperExecution).includes("caller-helper-command"), false, "caller command overrides must not be persisted");
  assert.equal(JSON.stringify(helperExecution).includes("--claim-ready"), false, "caller argv overrides must not be persisted");

  const persistedHelper = JSON.parse(readFileSync(join(projectRoot, helperExecution.helper_execution_path), "utf8"));
  assert.equal(persistedHelper.helper_execution_status, "provider_helper_execution_attempted");
  assert.equal(persistedHelper.provider_helper_execution.helper_exit_code, 0);
  assert.equal(JSON.stringify(persistedHelper).includes(projectRoot), false, "persisted helper execution manifest must not echo host paths");

  const notEvidence = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0176-HELPER-NOT-EVIDENCE",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task176-test",
    evidence_path: helperExecution.helper_execution_path
  });
  assert.equal(notEvidence.ok, false, "provider helper execution attempts are not readiness evidence by themselves");
  assert.equal(
    notEvidence.vetoes.some((veto) => veto.code === "adapter_os_isolation_evidence_not_service_owned_probe"),
    true,
    "readiness still requires service-owned collected probe evidence, not helper execution exit status"
  );

  assert.throws(
    () =>
      runAgentAdapterOsIsolationProviderHelperExecution(projectRoot, {
        project_id: projectId,
        helper_execution_id: "ADAPTER-OSISO-HELPER-0176-READY",
        runner_id: readyRunner.runner_id,
        launch_id: launch.launch_id,
        adapter_id: "codex-cli",
        backend: "external",
        actor: "goal3-task176-test",
        requested_provider: "windows_appcontainer"
      }),
    (error) => error?.code === "AGENT_ADAPTER_OS_ISOLATION_PROVIDER_HELPER_EXECUTION_ALREADY_EXISTS",
    "provider helper execution manifests must be append-only by helper execution id"
  );

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.os_isolation_provider_helper_executed" &&
        event.payload.helper_execution_id === "ADAPTER-OSISO-HELPER-0176-READY" &&
        event.payload.ok === true &&
        event.payload.provider === "windows_appcontainer" &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "provider helper execution must be audit-visible and non-authoritative"
  );
  assert.equal(JSON.stringify(events).includes(projectRoot), false, "audit events must not echo host paths");
  assert.equal(JSON.stringify(events).includes("helper-actor-secret"), false, "audit events must not echo actor secrets");
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task176 agent adapter OS-isolation provider helper execution tests passed.");
