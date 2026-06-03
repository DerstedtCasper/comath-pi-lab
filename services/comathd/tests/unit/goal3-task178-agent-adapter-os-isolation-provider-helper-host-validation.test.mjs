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
  readAuditEvents,
  reviewAgentAdapterOsIsolationReadiness,
  validateAgentAdapterOsIsolationProviderHelperHost
} from "../../dist/index.js";

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task178-adapter-osiso-helper-host-"));

try {
  assert.equal(
    typeof validateAgentAdapterOsIsolationProviderHelperHost,
    "function",
    "Task178 must export a service-owned provider-helper host validation producer"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("agent_adapter_os_isolation_provider_helper_host_validation"),
    true,
    "Task178 service capability ledger must advertise provider-helper host validation"
  );

  const init = initProject({ name: "Goal3 Task178 Adapter OS Isolation Helper Host Validation", root_path: projectRoot });
  const projectId = init.project.project_id;

  const spoofed = validateAgentAdapterOsIsolationProviderHelperHost(projectRoot, {
    project_id: projectId,
    host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0178-SPOOFED",
    runner_id: "ADAPTER-OSISO-RUNNER-0178-MISSING",
    launch_id: "ADAPTER-OSISO-LAUNCH-0178-MISSING",
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=spoof-secret`,
    requested_provider: "windows_appcontainer",
    host_environment: {
      platform: "win32",
      notes: `${projectRoot} Authorization: Bearer spoof-token`,
      helper_host_ready: true,
      helper_binary_sha256: "1".repeat(64),
      helper_version: "caller-claims-ready",
      command_override: "powershell -NoProfile unsafe-helper-host",
      argv_override: ["--claim-ready", projectRoot],
      env_override: {
        COMATH_SECRET: "token=env-secret"
      }
    }
  });
  assert.equal(spoofed.ok, false, "caller-supplied host validation metadata must not make the helper host ready");
  assert.equal(spoofed.host_validation_status, "blocked_provider_runner_manifest_missing");
  assert.equal(spoofed.provider_helper_host_ready, false);
  assert.equal(spoofed.provider_helper_host_validation.validation_source, "missing");
  assert.equal(spoofed.provider_helper_host_validation.command_override_allowed, false);
  assert.equal(spoofed.provider_helper_host_validation.environment_override_allowed, false);
  assert.equal(spoofed.provider_helper_host_validation.caller_supplied_success_allowed, false);
  assert.equal(spoofed.adapter_execution_isolation.current_boundary, "process_boundary_only");
  assert.equal(spoofed.adapter_execution_isolation.os_enforced, false);
  assert.equal(spoofed.proof_authority, "none");
  assert.equal(spoofed.can_promote_claim, false);
  assert.equal(spoofed.can_certify_ga, false);
  assert.equal(existsSync(join(projectRoot, spoofed.host_validation_path)), true, "host-validation manifest must be persisted");
  assert.equal(JSON.stringify(spoofed).includes(projectRoot), false, "host-validation result must not echo host paths");
  assert.equal(JSON.stringify(spoofed).includes("spoof-secret"), false, "host-validation result must not echo actor secrets");
  assert.equal(JSON.stringify(spoofed).includes("spoof-token"), false, "host-validation result must not echo payload secrets");
  assert.equal(JSON.stringify(spoofed).includes("unsafe-helper-host"), false, "caller command overrides must not be persisted");
  assert.equal(JSON.stringify(spoofed).includes("env-secret"), false, "caller environment overrides must not be persisted");
  assert.equal(JSON.stringify(spoofed).includes("111111"), false, "caller helper hash must not be accepted");

  const helperScript = join(projectRoot, "task178-provider-helper.mjs");
  writeFileSync(helperScript, "console.log('helper host validation fixture');\n", "utf8");
  const helperBinarySha256 = sha256File(process.execPath);

  const launch = prepareAgentAdapterOsIsolationSandboxLaunch(projectRoot, {
    project_id: projectId,
    launch_id: "ADAPTER-OSISO-LAUNCH-0178-READY",
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
        launcher_version: "appcontainer-launcher-6.0",
        diagnostics: [`${projectRoot} launcher diagnostic must be scrubbed`, "launcher ready"]
      };
    }
  });
  assert.equal(launch.ok, true, "ready sandbox-launch preflight is required before host validation");

  const readyRunner = prepareAgentAdapterOsIsolationProviderRunner(projectRoot, {
    project_id: projectId,
    runner_id: "ADAPTER-OSISO-RUNNER-0178-READY",
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
  assert.equal(readyRunner.ok, true, "ready provider-runner manifest is required before host validation");

  const callerOnlyRoute = await createComathServer().inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-helper-host-validation",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0178-ROUTE",
      runner_id: readyRunner.runner_id,
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: "goal3-task178-route-test",
      requested_provider: "windows_appcontainer",
      host_environment: {
        platform: "win32",
        notes: `${projectRoot} token=route-secret`,
        helper_host_ready: true,
        helper_binary_sha256: "2".repeat(64),
        helper_version: "route-claims-ready",
        command_override: "unsafe-route-host-validator",
        argv_override: ["--unsafe"],
        env_override: {
          TOKEN: "route-secret"
        }
      }
    }
  });
  assert.equal(callerOnlyRoute.status, 200, JSON.stringify(callerOnlyRoute.body));
  assert.equal(
    callerOnlyRoute.body.host_validation.host_validation_status,
    "provider_helper_host_validated",
    "route callers cannot self-validate the provider helper host, but the bundled service-owned protocol asset may validate it"
  );
  assert.equal(callerOnlyRoute.body.host_validation.provider_helper_host_ready, true);
  assert.equal(
    callerOnlyRoute.body.host_validation.provider_helper_host_validation.validation_source,
    "service_owned_provider_helper_host_validator"
  );
  assert.notEqual(
    callerOnlyRoute.body.host_validation.provider_helper_host_validation.helper_binary_sha256,
    "2".repeat(64),
    "route supplied helper hash must not be accepted"
  );
  assert.notEqual(
    callerOnlyRoute.body.host_validation.provider_helper_host_validation.helper_version,
    "route-claims-ready",
    "route supplied helper version must not be accepted"
  );
  assert.equal(callerOnlyRoute.body.host_validation.provider_helper_host_validation.self_test_passed, true);
  assert.equal(callerOnlyRoute.body.host_validation.adapter_execution_isolation.os_enforced, false);
  assert.equal(callerOnlyRoute.body.host_validation.can_certify_ga, false);
  assert.equal(JSON.stringify(callerOnlyRoute.body).includes(projectRoot), false, "route response must not echo host paths");
  assert.equal(JSON.stringify(callerOnlyRoute.body).includes("route-secret"), false, "route response must not echo secrets");
  assert.equal(JSON.stringify(callerOnlyRoute.body).includes("unsafe-route-host-validator"), false, "route response must not echo caller command overrides");
  assert.equal(JSON.stringify(callerOnlyRoute.body).includes("--unsafe"), false, "route response must not echo caller argv overrides");

  const mismatchedHash = validateAgentAdapterOsIsolationProviderHelperHost(projectRoot, {
    project_id: projectId,
    host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0178-MISMATCH",
    runner_id: readyRunner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task178-test",
    requested_provider: "windows_appcontainer",
    host_environment: {
      platform: "win32"
    }
  }, {
    provider_helper_host_validator: (hostInput) => {
      assert.equal(hostInput.runner_binary_sha256, helperBinarySha256);
      return {
        validation_source: "service_owned_provider_helper_host_validator",
        helper_host_ready: true,
        helper_program: process.execPath,
        helper_binary_sha256: "f".repeat(64),
        helper_version: "node-provider-helper-test",
        supported_platforms: ["win32"],
        diagnostics: [`${projectRoot} hash mismatch diagnostic must be scrubbed`, "hash mismatch"]
      };
    }
  });
  assert.equal(mismatchedHash.ok, false, "host validation must bind the helper binary hash to the provider-runner manifest");
  assert.equal(mismatchedHash.host_validation_status, "blocked_provider_helper_host_binary_mismatch");
  assert.equal(mismatchedHash.provider_helper_host_ready, false);
  assert.equal(
    mismatchedHash.provider_helper_host_validation.helper_binary_sha256,
    helperBinarySha256,
    "the manifest records the actual helper program hash, not a mismatched validator claim"
  );
  assert.equal(mismatchedHash.adapter_execution_isolation.os_enforced, false);
  assert.equal(mismatchedHash.can_certify_ga, false);

  const unsupportedPlatform = validateAgentAdapterOsIsolationProviderHelperHost(projectRoot, {
    project_id: projectId,
    host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0178-PLATFORM",
    runner_id: readyRunner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task178-test",
    requested_provider: "windows_appcontainer",
    host_environment: {
      platform: "linux"
    }
  }, {
    provider_helper_host_validator: () => ({
      validation_source: "service_owned_provider_helper_host_validator",
      helper_host_ready: true,
      helper_program: process.execPath,
      helper_binary_sha256: helperBinarySha256,
      helper_version: "node-provider-helper-test",
      supported_platforms: ["win32"],
      diagnostics: ["unsupported platform"]
    })
  });
  assert.equal(unsupportedPlatform.ok, false, "host validation must reject unsupported service-owned platforms");
  assert.equal(unsupportedPlatform.host_validation_status, "blocked_provider_helper_host_platform_mismatch");
  assert.equal(unsupportedPlatform.provider_helper_host_ready, false);

  const readyHost = validateAgentAdapterOsIsolationProviderHelperHost(projectRoot, {
    project_id: projectId,
    host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0178-READY",
    runner_id: readyRunner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=validator-secret`,
    requested_provider: "windows_appcontainer",
    host_environment: {
      platform: "win32",
      notes: `${projectRoot} password=validator-secret`
    }
  }, {
    provider_helper_host_validator: (hostInput) => {
      assert.equal(hostInput.project_root, projectRoot);
      assert.equal(hostInput.project_id, projectId);
      assert.equal(hostInput.host_validation_id, "ADAPTER-OSISO-HELPER-HOST-0178-READY");
      assert.equal(hostInput.runner_id, readyRunner.runner_id);
      assert.equal(hostInput.runner_path, readyRunner.runner_path);
      assert.equal(hostInput.launch_id, launch.launch_id);
      assert.equal(hostInput.launch_path, launch.launch_path);
      assert.equal(hostInput.adapter_id, "codex-cli");
      assert.equal(hostInput.backend, "external");
      assert.equal(hostInput.provider, "windows_appcontainer");
      assert.equal(hostInput.runner_binary_sha256, helperBinarySha256);
      assert.equal(hostInput.platform, "win32");
      return {
        validation_source: "service_owned_provider_helper_host_validator",
        helper_host_ready: true,
        helper_program: process.execPath,
        helper_binary_sha256: helperBinarySha256,
        helper_version: "node-provider-helper-test",
        supported_platforms: ["win32"],
        diagnostics: [`${projectRoot} validator diagnostic must be scrubbed`, "helper host ready"]
      };
    }
  });
  assert.equal(readyHost.schema_version, "comath.agent_adapter_os_isolation_provider_helper_host_validation.v1");
  assert.equal(readyHost.ok, true, "service-owned host validator should produce a ready helper-host manifest");
  assert.equal(readyHost.host_validation_status, "provider_helper_host_validated");
  assert.equal(readyHost.launch_artifact.path, launch.launch_path);
  assert.equal(readyHost.runner_artifact.path, readyRunner.runner_path);
  assert.equal(readyHost.provider, "windows_appcontainer");
  assert.equal(readyHost.provider_helper_host_ready, true);
  assert.equal(readyHost.provider_helper_host_validation.validation_source, "service_owned_provider_helper_host_validator");
  assert.equal(readyHost.provider_helper_host_validation.helper_binary_sha256, helperBinarySha256);
  assert.equal(readyHost.provider_helper_host_validation.runner_binary_sha256, helperBinarySha256);
  assert.equal(readyHost.provider_helper_host_validation.hashes_match_provider_runner, true);
  assert.equal(readyHost.provider_helper_host_validation.supported_platforms.includes("win32"), true);
  assert.equal(readyHost.provider_helper_host_validation.shell, false);
  assert.equal(readyHost.provider_helper_host_validation.network_policy, "disabled");
  assert.equal(readyHost.provider_helper_host_validation.command_override_allowed, false);
  assert.equal(readyHost.provider_helper_host_validation.environment_override_allowed, false);
  assert.equal(readyHost.provider_helper_host_validation.caller_supplied_success_allowed, false);
  assert.equal(readyHost.adapter_execution_isolation.current_boundary, "process_boundary_only");
  assert.equal(readyHost.adapter_execution_isolation.os_enforced, false, "host validation is still not collected OS evidence");
  assert.equal(readyHost.proof_authority, "none");
  assert.equal(readyHost.can_promote_claim, false);
  assert.equal(readyHost.can_certify_ga, false);
  assert.equal(readyHost.blocker_certificate, null);
  assert.equal(existsSync(join(projectRoot, readyHost.host_validation_path)), true);
  assert.equal(JSON.stringify(readyHost).includes(projectRoot), false, "ready host validation result must not echo host paths");
  assert.equal(JSON.stringify(readyHost).includes("validator-secret"), false, "ready host validation result must not echo secrets");

  const persistedReady = JSON.parse(readFileSync(join(projectRoot, readyHost.host_validation_path), "utf8"));
  assert.equal(persistedReady.host_validation_status, "provider_helper_host_validated");
  assert.equal(persistedReady.provider_helper_host_validation.hashes_match_provider_runner, true);
  assert.equal(JSON.stringify(persistedReady).includes(projectRoot), false, "persisted host-validation manifest must not echo host paths");

  const notEvidence = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0178-HOST-VALIDATION-NOT-EVIDENCE",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task178-test",
    evidence_path: readyHost.host_validation_path
  });
  assert.equal(notEvidence.ok, false, "host validation manifests are not readiness evidence by themselves");
  assert.equal(
    notEvidence.vetoes.some((veto) => veto.code === "adapter_os_isolation_evidence_not_service_owned_probe"),
    true,
    "readiness still requires canonical service-owned collected probe evidence, not host validation"
  );

  assert.throws(
    () =>
      validateAgentAdapterOsIsolationProviderHelperHost(projectRoot, {
        project_id: projectId,
        host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0178-READY",
        runner_id: readyRunner.runner_id,
        launch_id: launch.launch_id,
        adapter_id: "codex-cli",
        backend: "external",
        actor: "goal3-task178-test",
        requested_provider: "windows_appcontainer"
      }),
    (error) => error?.code === "AGENT_ADAPTER_OS_ISOLATION_PROVIDER_HELPER_HOST_VALIDATION_ALREADY_EXISTS",
    "provider-helper host-validation manifests must be append-only by host validation id"
  );

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.os_isolation_provider_helper_host_validated" &&
        event.payload.host_validation_id === "ADAPTER-OSISO-HELPER-HOST-0178-READY" &&
        event.payload.ok === true &&
        event.payload.provider === "windows_appcontainer" &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "provider-helper host validation must be audit-visible and non-authoritative"
  );
  assert.equal(JSON.stringify(events).includes(projectRoot), false, "audit events must not echo host paths");
  assert.equal(JSON.stringify(events).includes("validator-secret"), false, "audit events must not echo actor secrets");
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task178 agent adapter OS-isolation provider helper host validation tests passed.");
