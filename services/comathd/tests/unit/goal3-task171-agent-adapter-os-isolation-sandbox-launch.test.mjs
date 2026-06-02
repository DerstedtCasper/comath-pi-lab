import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createComathServer,
  getComathdStatus,
  initProject,
  prepareAgentAdapterOsIsolationSandboxLaunch,
  readAuditEvents,
  reviewAgentAdapterOsIsolationReadiness
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task171-adapter-osiso-launch-"));

try {
  assert.equal(
    typeof prepareAgentAdapterOsIsolationSandboxLaunch,
    "function",
    "Task171 must export a service-owned adapter OS-isolation sandbox-launch preflight producer"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("agent_adapter_os_isolation_sandbox_launch_preflight"),
    true,
    "Task171 service capability ledger must advertise provider-specific sandbox-launch preflight"
  );

  const init = initProject({ name: "Goal3 Task171 Adapter OS Isolation Sandbox Launch", root_path: projectRoot });
  const projectId = init.project.project_id;

  const spoofed = prepareAgentAdapterOsIsolationSandboxLaunch(projectRoot, {
    project_id: projectId,
    launch_id: "ADAPTER-OSISO-LAUNCH-0171-SPOOFED",
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=spoof-secret`,
    requested_provider: "windows_appcontainer",
    launcher_environment: {
      platform: "win32",
      notes: `${projectRoot} Authorization: Bearer spoof-token`,
      provider_available: true,
      launcher_binary_sha256: "9".repeat(64),
      command_override: "powershell -NoProfile unsafe-user-command"
    }
  });
  assert.equal(spoofed.ok, false, "caller-supplied launcher metadata must not make a sandbox launch ready");
  assert.equal(spoofed.launch_status, "blocked_sandbox_launcher_preflight_missing");
  assert.equal(spoofed.provider, "windows_appcontainer");
  assert.equal(spoofed.provider_command_contract.shell, false);
  assert.equal(spoofed.provider_command_contract.network_policy, "disabled");
  assert.equal(spoofed.provider_command_contract.command_override_allowed, false);
  assert.equal(spoofed.provider_command_contract.caller_supplied_success_allowed, false);
  assert.equal(spoofed.sandbox_launch_ready, false);
  assert.equal(spoofed.adapter_execution_isolation.os_enforced, false);
  assert.equal(spoofed.proof_authority, "none");
  assert.equal(spoofed.can_promote_claim, false);
  assert.equal(spoofed.can_certify_ga, false);
  assert.equal(existsSync(join(projectRoot, spoofed.launch_path)), true, "sandbox-launch manifest must be persisted");
  assert.equal(JSON.stringify(spoofed).includes(projectRoot), false, "sandbox launch result must not echo host paths");
  assert.equal(JSON.stringify(spoofed).includes("spoof-secret"), false, "sandbox launch result must not echo actor secrets");
  assert.equal(JSON.stringify(spoofed).includes("spoof-token"), false, "sandbox launch result must not echo payload secrets");
  assert.equal(JSON.stringify(spoofed).includes("unsafe-user-command"), false, "caller command overrides must not be persisted");

  const notEvidence = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0171-LAUNCH-NOT-EVIDENCE",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task171-test",
    evidence_path: spoofed.launch_path
  });
  assert.equal(notEvidence.ok, false, "sandbox launch manifests are not readiness evidence by themselves");
  assert.equal(
    notEvidence.vetoes.some((veto) => veto.code === "adapter_os_isolation_evidence_not_service_owned_probe"),
    true,
    "readiness still requires service-owned collected probe evidence, not a launch plan"
  );

  const readyPreflight = prepareAgentAdapterOsIsolationSandboxLaunch(projectRoot, {
    project_id: projectId,
    launch_id: "ADAPTER-OSISO-LAUNCH-0171-READY",
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=actor-secret`,
    requested_provider: "windows_appcontainer",
    launcher_environment: {
      platform: "win32",
      notes: `${projectRoot} password=probe-secret`
    }
  }, {
    launcher_probe: (probeInput) => {
      assert.equal(probeInput.project_root, projectRoot);
      assert.equal(probeInput.project_id, projectId);
      assert.equal(probeInput.launch_id, "ADAPTER-OSISO-LAUNCH-0171-READY");
      assert.equal(probeInput.adapter_id, "codex-cli");
      assert.equal(probeInput.backend, "external");
      assert.equal(probeInput.provider, "windows_appcontainer");
      return {
        probe_source: "service_owned_launcher_preflight",
        provider_available: true,
        launcher_binary_sha256: "a".repeat(64),
        launcher_version: "appcontainer-test-1.0",
        diagnostics: [
          `${projectRoot} should be scrubbed`,
          "fixed provider contract accepted"
        ]
      };
    }
  });
  assert.equal(readyPreflight.schema_version, "comath.agent_adapter_os_isolation_sandbox_launch.v1");
  assert.equal(readyPreflight.ok, true, "service-owned launcher preflight should make the sandbox launch ready");
  assert.equal(readyPreflight.launch_status, "ready_for_service_owned_os_sandbox_execution");
  assert.equal(readyPreflight.provider, "windows_appcontainer");
  assert.equal(readyPreflight.sandbox_launch_ready, true);
  assert.equal(readyPreflight.provider_command_contract.provider, "windows_appcontainer");
  assert.equal(readyPreflight.provider_command_contract.shell, false);
  assert.equal(readyPreflight.provider_command_contract.network_policy, "disabled");
  assert.equal(readyPreflight.provider_command_contract.no_new_privileges_required, true);
  assert.equal(readyPreflight.provider_command_contract.command_override_allowed, false);
  assert.equal(readyPreflight.provider_command_contract.caller_supplied_success_allowed, false);
  assert.equal(readyPreflight.launcher_preflight.probe_source, "service_owned_launcher_preflight");
  assert.equal(readyPreflight.launcher_preflight.provider_available, true);
  assert.equal(readyPreflight.launcher_preflight.launcher_binary_sha256, "a".repeat(64));
  assert.equal(readyPreflight.adapter_execution_isolation.current_boundary, "process_boundary_only");
  assert.equal(readyPreflight.adapter_execution_isolation.os_enforced, false);
  assert.equal(readyPreflight.adapter_execution_isolation.claims_runtime_enforcement, false);
  assert.equal(readyPreflight.proof_authority, "none");
  assert.equal(readyPreflight.can_promote_claim, false);
  assert.equal(readyPreflight.can_certify_ga, false);
  assert.equal(readyPreflight.blocker_certificate, null, "ready preflight should not emit a launcher-preflight blocker");
  assert.equal(existsSync(join(projectRoot, readyPreflight.launch_path)), true, "ready preflight manifest must be persisted");
  assert.equal(JSON.stringify(readyPreflight).includes(projectRoot), false, "ready preflight must not echo host paths");
  assert.equal(JSON.stringify(readyPreflight).includes("actor-secret"), false, "ready preflight must not echo actor secrets");
  assert.equal(JSON.stringify(readyPreflight).includes("probe-secret"), false, "ready preflight must not echo payload secrets");

  const persistedReady = JSON.parse(readFileSync(join(projectRoot, readyPreflight.launch_path), "utf8"));
  assert.equal(persistedReady.launch_status, "ready_for_service_owned_os_sandbox_execution");
  assert.equal(persistedReady.provider_command_contract.command_override_allowed, false);
  assert.equal(JSON.stringify(persistedReady).includes(projectRoot), false, "persisted launch manifest must not echo host paths");

  const unsupported = prepareAgentAdapterOsIsolationSandboxLaunch(projectRoot, {
    project_id: projectId,
    launch_id: "ADAPTER-OSISO-LAUNCH-0171-UNSUPPORTED",
    adapter_id: "codex-cli",
    backend: "bundled",
    actor: "goal3-task171-test",
    requested_provider: "made_up_provider"
  });
  assert.equal(unsupported.ok, false);
  assert.equal(unsupported.launch_status, "blocked_sandbox_provider_unsupported");
  assert.equal(unsupported.provider, "unknown");
  assert.equal(unsupported.can_certify_ga, false);

  assert.throws(
    () =>
      prepareAgentAdapterOsIsolationSandboxLaunch(projectRoot, {
        project_id: projectId,
        launch_id: "ADAPTER-OSISO-LAUNCH-0171-READY",
        adapter_id: "codex-cli",
        backend: "external",
        actor: "goal3-task171-test",
        requested_provider: "windows_appcontainer"
      }),
    (error) => error?.code === "AGENT_ADAPTER_OS_ISOLATION_SANDBOX_LAUNCH_ALREADY_EXISTS",
    "sandbox launch manifests must be append-only by launch id"
  );

  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-sandbox-launch",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      launch_id: "ADAPTER-OSISO-LAUNCH-0171-ROUTE",
      adapter_id: "codex-cli",
      backend: "bundled",
      actor: "goal3-task171-route-test",
      requested_provider: "oci_container",
      launcher_environment: {
        platform: "linux",
        provider_available: true,
        launcher_binary_sha256: "1".repeat(64),
        command_override: "docker run --privileged unsafe",
        notes: `${projectRoot} token=route-secret`
      }
    }
  });
  assert.equal(routeResponse.status, 200, JSON.stringify(routeResponse.body));
  assert.equal(routeResponse.body.launch.ok, false, "route callers cannot self-certify sandbox launcher readiness");
  assert.equal(routeResponse.body.launch.launch_status, "blocked_sandbox_launcher_preflight_missing");
  assert.equal(routeResponse.body.launch.sandbox_launch_ready, false);
  assert.equal(routeResponse.body.launch.can_certify_ga, false);
  assert.equal(JSON.stringify(routeResponse.body).includes(projectRoot), false, "route response must not echo host paths");
  assert.equal(JSON.stringify(routeResponse.body).includes("route-secret"), false, "route response must not echo secrets");
  assert.equal(JSON.stringify(routeResponse.body).includes("--privileged"), false, "route response must not echo caller command overrides");

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.os_isolation_sandbox_launch_preflighted" &&
        event.payload.launch_id === "ADAPTER-OSISO-LAUNCH-0171-READY" &&
        event.payload.ok === true &&
        event.payload.provider === "windows_appcontainer" &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "sandbox launch preflight must be audit-visible and non-authoritative"
  );
  assert.equal(JSON.stringify(events).includes(projectRoot), false, "audit events must not echo host paths");
  assert.equal(JSON.stringify(events).includes("actor-secret"), false, "audit events must not echo actor secrets");
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task171 agent adapter OS-isolation sandbox launch tests passed.");
