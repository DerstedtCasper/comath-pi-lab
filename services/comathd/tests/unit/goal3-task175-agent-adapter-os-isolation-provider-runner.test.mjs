import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createComathServer,
  getComathdStatus,
  initProject,
  prepareAgentAdapterOsIsolationProviderRunner,
  prepareAgentAdapterOsIsolationSandboxLaunch,
  readAuditEvents,
  reviewAgentAdapterOsIsolationReadiness
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task175-adapter-osiso-runner-"));

try {
  assert.equal(
    typeof prepareAgentAdapterOsIsolationProviderRunner,
    "function",
    "Task175 must export a service-owned adapter OS-isolation provider runner producer"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("agent_adapter_os_isolation_provider_runner_contract"),
    true,
    "Task175 service capability ledger must advertise provider-specific runner contracts"
  );

  const init = initProject({ name: "Goal3 Task175 Adapter OS Isolation Provider Runner", root_path: projectRoot });
  const projectId = init.project.project_id;

  const spoofed = prepareAgentAdapterOsIsolationProviderRunner(projectRoot, {
    project_id: projectId,
    runner_id: "ADAPTER-OSISO-RUNNER-0175-SPOOFED",
    launch_id: "ADAPTER-OSISO-LAUNCH-0175-MISSING",
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=spoof-secret`,
    requested_provider: "windows_appcontainer",
    runner_environment: {
      platform: "win32",
      notes: `${projectRoot} Authorization: Bearer spoof-token`,
      provider_runner_available: true,
      runner_binary_sha256: "1".repeat(64),
      command_override: "powershell -NoProfile unsafe-user-command",
      argv_override: ["--privileged", "--host-path", projectRoot],
      env_override: {
        COMATH_SECRET: "token=env-secret"
      }
    }
  });
  assert.equal(spoofed.ok, false, "caller-supplied runner metadata must not make a provider runner ready");
  assert.equal(spoofed.runner_status, "blocked_provider_runner_launch_preflight_missing");
  assert.equal(spoofed.provider, "windows_appcontainer");
  assert.equal(spoofed.provider_runner_ready, false);
  assert.equal(spoofed.provider_runner_contract.shell, false);
  assert.equal(spoofed.provider_runner_contract.network_policy, "disabled");
  assert.equal(spoofed.provider_runner_contract.command_override_allowed, false);
  assert.equal(spoofed.provider_runner_contract.environment_override_allowed, false);
  assert.equal(spoofed.provider_runner_contract.caller_supplied_success_allowed, false);
  assert.equal(spoofed.adapter_execution_isolation.current_boundary, "process_boundary_only");
  assert.equal(spoofed.adapter_execution_isolation.os_enforced, false);
  assert.equal(spoofed.proof_authority, "none");
  assert.equal(spoofed.can_promote_claim, false);
  assert.equal(spoofed.can_certify_ga, false);
  assert.equal(existsSync(join(projectRoot, spoofed.runner_path)), true, "provider-runner manifest must be persisted");
  assert.equal(JSON.stringify(spoofed).includes(projectRoot), false, "provider-runner result must not echo host paths");
  assert.equal(JSON.stringify(spoofed).includes("spoof-secret"), false, "provider-runner result must not echo actor secrets");
  assert.equal(JSON.stringify(spoofed).includes("spoof-token"), false, "provider-runner result must not echo payload secrets");
  assert.equal(JSON.stringify(spoofed).includes("unsafe-user-command"), false, "caller command overrides must not be persisted");
  assert.equal(JSON.stringify(spoofed).includes("env-secret"), false, "caller environment overrides must not be persisted");

  const launch = prepareAgentAdapterOsIsolationSandboxLaunch(projectRoot, {
    project_id: projectId,
    launch_id: "ADAPTER-OSISO-LAUNCH-0175-READY",
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
      assert.equal(probeInput.project_id, projectId);
      assert.equal(probeInput.launch_id, "ADAPTER-OSISO-LAUNCH-0175-READY");
      assert.equal(probeInput.adapter_id, "codex-cli");
      assert.equal(probeInput.backend, "external");
      assert.equal(probeInput.provider, "windows_appcontainer");
      return {
        probe_source: "service_owned_launcher_preflight",
        provider_available: true,
        launcher_binary_sha256: "a".repeat(64),
        launcher_version: "appcontainer-launcher-3.0",
        diagnostics: [`${projectRoot} should be scrubbed`, "launcher ready"]
      };
    }
  });
  assert.equal(launch.ok, true, "a ready sandbox-launch preflight is required before runner contract resolution");

  const callerOnly = prepareAgentAdapterOsIsolationProviderRunner(projectRoot, {
    project_id: projectId,
    runner_id: "ADAPTER-OSISO-RUNNER-0175-CALLER-ONLY",
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task175-test",
    requested_provider: "windows_appcontainer",
    runner_environment: {
      platform: "win32",
      provider_runner_available: true,
      runner_binary_sha256: "2".repeat(64),
      command_override: "user-supplied-runner",
      argv_override: ["--claim-ready"]
    }
  });
  assert.equal(callerOnly.ok, true, "bundled service-owned helper asset may resolve the runner when no env helper is configured");
  assert.equal(callerOnly.runner_status, "ready_for_service_owned_provider_runner");
  assert.equal(callerOnly.provider_runner_ready, true);
  assert.equal(callerOnly.provider_runner_resolution.resolution_source, "service_owned_provider_runner_resolver");
  assert.equal(callerOnly.provider_runner_resolution.runner_available, true);
  assert.match(callerOnly.provider_runner_resolution.runner_binary_sha256, /^[a-f0-9]{64}$/);
  assert.notEqual(callerOnly.provider_runner_resolution.runner_binary_sha256, "2".repeat(64), "caller supplied runner hash must not be accepted");
  assert.equal(callerOnly.provider_runner_resolution.runner_version, "windows_appcontainer-helper-bundled-protocol-v1");
  assert.equal(callerOnly.adapter_execution_isolation.os_enforced, false);
  assert.equal(callerOnly.can_certify_ga, false);
  assert.equal(JSON.stringify(callerOnly).includes("user-supplied-runner"), false);
  assert.equal(JSON.stringify(callerOnly).includes("--claim-ready"), false);

  const readyRunner = prepareAgentAdapterOsIsolationProviderRunner(projectRoot, {
    project_id: projectId,
    runner_id: "ADAPTER-OSISO-RUNNER-0175-READY",
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=runner-actor-secret`,
    requested_provider: "windows_appcontainer",
    runner_environment: {
      platform: "win32",
      notes: `${projectRoot} password=runner-secret`
    }
  }, {
    provider_runner_resolver: (runnerInput) => {
      assert.equal(runnerInput.project_root, projectRoot);
      assert.equal(runnerInput.project_id, projectId);
      assert.equal(runnerInput.runner_id, "ADAPTER-OSISO-RUNNER-0175-READY");
      assert.equal(runnerInput.launch_id, launch.launch_id);
      assert.equal(runnerInput.launch_path, launch.launch_path);
      assert.equal(runnerInput.adapter_id, "codex-cli");
      assert.equal(runnerInput.backend, "external");
      assert.equal(runnerInput.provider, "windows_appcontainer");
      assert.equal(runnerInput.launcher_binary_sha256, "a".repeat(64));
      return {
        resolution_source: "service_owned_provider_runner_resolver",
        runner_available: true,
        runner_binary_sha256: "b".repeat(64),
        runner_version: "appcontainer-provider-runner-1.0",
        diagnostics: [`${projectRoot} should be scrubbed`, "provider runner resolved"]
      };
    }
  });
  assert.equal(readyRunner.schema_version, "comath.agent_adapter_os_isolation_provider_runner.v1");
  assert.equal(readyRunner.ok, true, "service-owned provider runner resolver should prepare the runner contract");
  assert.equal(readyRunner.runner_status, "ready_for_service_owned_provider_runner");
  assert.equal(readyRunner.launch_artifact.path, launch.launch_path);
  assert.equal(readyRunner.provider, "windows_appcontainer");
  assert.equal(readyRunner.provider_runner_ready, true);
  assert.equal(readyRunner.provider_runner_contract.provider, "windows_appcontainer");
  assert.equal(readyRunner.provider_runner_contract.shell, false);
  assert.equal(readyRunner.provider_runner_contract.network_policy, "disabled");
  assert.equal(readyRunner.provider_runner_contract.no_new_privileges_required, true);
  assert.equal(readyRunner.provider_runner_contract.command_override_allowed, false);
  assert.equal(readyRunner.provider_runner_contract.environment_override_allowed, false);
  assert.equal(readyRunner.provider_runner_contract.caller_supplied_success_allowed, false);
  assert.equal(readyRunner.provider_runner_contract.fixed_argv_template.includes("<adapter-command>"), true);
  assert.equal(readyRunner.provider_runner_contract.environment_policy.inherit_parent_environment, false);
  assert.equal(readyRunner.provider_runner_resolution.resolution_source, "service_owned_provider_runner_resolver");
  assert.equal(readyRunner.provider_runner_resolution.runner_binary_sha256, "b".repeat(64));
  assert.equal(readyRunner.adapter_execution_isolation.current_boundary, "process_boundary_only");
  assert.equal(readyRunner.adapter_execution_isolation.os_enforced, false, "runner contract preparation is still not collected OS evidence");
  assert.equal(readyRunner.proof_authority, "none");
  assert.equal(readyRunner.can_promote_claim, false);
  assert.equal(readyRunner.can_certify_ga, false);
  assert.equal(readyRunner.blocker_certificate, null);
  assert.equal(existsSync(join(projectRoot, readyRunner.runner_path)), true, "ready provider-runner manifest must be persisted");
  assert.equal(JSON.stringify(readyRunner).includes(projectRoot), false, "ready provider-runner result must not echo host paths");
  assert.equal(JSON.stringify(readyRunner).includes("runner-actor-secret"), false, "ready provider-runner result must not echo actor secrets");
  assert.equal(JSON.stringify(readyRunner).includes("runner-secret"), false, "ready provider-runner result must not echo payload secrets");

  const persistedReady = JSON.parse(readFileSync(join(projectRoot, readyRunner.runner_path), "utf8"));
  assert.equal(persistedReady.runner_status, "ready_for_service_owned_provider_runner");
  assert.equal(persistedReady.provider_runner_contract.command_override_allowed, false);
  assert.equal(JSON.stringify(persistedReady).includes(projectRoot), false, "persisted provider-runner manifest must not echo host paths");

  const notEvidence = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0175-RUNNER-NOT-EVIDENCE",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task175-test",
    evidence_path: readyRunner.runner_path
  });
  assert.equal(notEvidence.ok, false, "provider-runner manifests are not readiness evidence by themselves");
  assert.equal(
    notEvidence.vetoes.some((veto) => veto.code === "adapter_os_isolation_evidence_not_service_owned_probe"),
    true,
    "readiness still requires service-owned collected probe evidence, not a runner contract"
  );

  const mismatchedLaunch = prepareAgentAdapterOsIsolationProviderRunner(projectRoot, {
    project_id: projectId,
    runner_id: "ADAPTER-OSISO-RUNNER-0175-MISMATCHED",
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "bundled",
    actor: "goal3-task175-test",
    requested_provider: "windows_appcontainer"
  });
  assert.equal(mismatchedLaunch.ok, false, "runner contract must bind the preflight launch backend exactly");
  assert.equal(mismatchedLaunch.runner_status, "blocked_provider_runner_binding_mismatch");
  assert.equal(mismatchedLaunch.can_certify_ga, false);

  assert.throws(
    () =>
      prepareAgentAdapterOsIsolationProviderRunner(projectRoot, {
        project_id: projectId,
        runner_id: "ADAPTER-OSISO-RUNNER-0175-READY",
        launch_id: launch.launch_id,
        adapter_id: "codex-cli",
        backend: "external",
        actor: "goal3-task175-test",
        requested_provider: "windows_appcontainer"
      }),
    (error) => error?.code === "AGENT_ADAPTER_OS_ISOLATION_PROVIDER_RUNNER_ALREADY_EXISTS",
    "provider-runner manifests must be append-only by runner id"
  );

  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-runner",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      runner_id: "ADAPTER-OSISO-RUNNER-0175-ROUTE",
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: "goal3-task175-route-test",
      requested_provider: "windows_appcontainer",
      runner_environment: {
        platform: "win32",
        notes: `${projectRoot} token=route-secret`,
        provider_runner_available: true,
        runner_binary_sha256: "3".repeat(64),
        command_override: "unsafe-route-runner",
        argv_override: ["--unsafe"],
        env_override: {
          TOKEN: "route-secret"
        }
      }
    }
  });
  assert.equal(routeResponse.status, 200, JSON.stringify(routeResponse.body));
  assert.equal(routeResponse.body.runner.ok, true, "route callers cannot self-certify provider runner resolution, but bundled service-owned protocol asset may resolve it");
  assert.equal(routeResponse.body.runner.runner_status, "ready_for_service_owned_provider_runner");
  assert.equal(routeResponse.body.runner.provider_runner_ready, true);
  assert.notEqual(routeResponse.body.runner.provider_runner_resolution.runner_binary_sha256, "3".repeat(64), "route supplied runner hash must not be accepted");
  assert.equal(routeResponse.body.runner.adapter_execution_isolation.os_enforced, false);
  assert.equal(routeResponse.body.runner.can_certify_ga, false);
  assert.equal(JSON.stringify(routeResponse.body).includes(projectRoot), false, "route response must not echo host paths");
  assert.equal(JSON.stringify(routeResponse.body).includes("route-secret"), false, "route response must not echo secrets");
  assert.equal(JSON.stringify(routeResponse.body).includes("unsafe-route-runner"), false, "route response must not echo caller command overrides");
  assert.equal(JSON.stringify(routeResponse.body).includes("--unsafe"), false, "route response must not echo caller argv overrides");

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.os_isolation_provider_runner_prepared" &&
        event.payload.runner_id === "ADAPTER-OSISO-RUNNER-0175-READY" &&
        event.payload.ok === true &&
        event.payload.provider === "windows_appcontainer" &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "provider-runner preparation must be audit-visible and non-authoritative"
  );
  assert.equal(JSON.stringify(events).includes(projectRoot), false, "audit events must not echo host paths");
  assert.equal(JSON.stringify(events).includes("runner-actor-secret"), false, "audit events must not echo actor secrets");
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task175 agent adapter OS-isolation provider runner tests passed.");
