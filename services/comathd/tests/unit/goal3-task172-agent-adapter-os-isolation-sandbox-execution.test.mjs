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
  runAgentAdapterOsIsolationSandboxExecutionProbe,
  reviewAgentAdapterOsIsolationReadiness
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task172-adapter-osiso-exec-"));

try {
  assert.equal(
    typeof runAgentAdapterOsIsolationSandboxExecutionProbe,
    "function",
    "Task172 must export a service-owned adapter OS-isolation sandbox execution probe runner"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("agent_adapter_os_isolation_sandbox_execution_probe"),
    true,
    "Task172 service capability ledger must advertise service-owned sandbox execution probe wiring"
  );

  const init = initProject({ name: "Goal3 Task172 Adapter OS Isolation Sandbox Execution", root_path: projectRoot });
  const projectId = init.project.project_id;

  const spoofed = runAgentAdapterOsIsolationSandboxExecutionProbe(projectRoot, {
    project_id: projectId,
    execution_id: "ADAPTER-OSISO-EXEC-0172-SPOOFED",
    launch_id: "ADAPTER-OSISO-LAUNCH-0172-MISSING",
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=spoof-secret`,
    requested_provider: "windows_appcontainer",
    execution_environment: {
      platform: "win32",
      notes: `${projectRoot} Authorization: Bearer spoof-token`,
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
  });
  assert.equal(spoofed.ok, false, "caller-supplied execution metadata must not self-certify sandbox execution");
  assert.equal(spoofed.execution_status, "blocked_sandbox_launch_preflight_missing");
  assert.equal(spoofed.adapter_execution_isolation.current_boundary, "process_boundary_only");
  assert.equal(spoofed.adapter_execution_isolation.os_enforced, false);
  assert.equal(spoofed.proof_authority, "none");
  assert.equal(spoofed.can_promote_claim, false);
  assert.equal(spoofed.can_certify_ga, false);
  assert.equal(JSON.stringify(spoofed).includes(projectRoot), false, "spoofed execution result must not echo host paths");
  assert.equal(JSON.stringify(spoofed).includes("spoof-secret"), false, "spoofed execution result must not echo actor secrets");
  assert.equal(JSON.stringify(spoofed).includes("spoof-token"), false, "spoofed execution result must not echo payload secrets");

  const launch = prepareAgentAdapterOsIsolationSandboxLaunch(projectRoot, {
    project_id: projectId,
    launch_id: "ADAPTER-OSISO-LAUNCH-0172-READY",
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
      assert.equal(probeInput.launch_id, "ADAPTER-OSISO-LAUNCH-0172-READY");
      assert.equal(probeInput.adapter_id, "codex-cli");
      assert.equal(probeInput.backend, "external");
      assert.equal(probeInput.provider, "windows_appcontainer");
      return {
        probe_source: "service_owned_launcher_preflight",
        provider_available: true,
        launcher_binary_sha256: "a".repeat(64),
        launcher_version: "appcontainer-test-2.0",
        diagnostics: [`${projectRoot} should be scrubbed`, "provider launcher ready"]
      };
    }
  });
  assert.equal(launch.ok, true, "ready preflight is required before a service-owned execution probe can run");

  const callerOnly = runAgentAdapterOsIsolationSandboxExecutionProbe(projectRoot, {
    project_id: projectId,
    execution_id: "ADAPTER-OSISO-EXEC-0172-CALLER-ONLY",
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task172-test",
    requested_provider: "windows_appcontainer",
    execution_environment: {
      platform: "win32",
      process_isolation_enforced: true,
      filesystem_scope_enforced: true,
      network_isolation_enforced: true,
      no_new_privileges: true,
      escape_prevention: true,
      adapter_process_exit_code: 0,
      stdout_sha256: "4".repeat(64),
      stderr_sha256: "5".repeat(64),
      transcript_sha256: "6".repeat(64)
    }
  });
  assert.equal(callerOnly.ok, false, "route-shaped execution metadata still cannot become collected OS evidence");
  assert.equal(callerOnly.execution_status, "blocked_sandbox_execution_probe_not_collected");
  assert.equal(callerOnly.probe.probe_status, "blocked_os_isolation_probe_not_collected");
  assert.equal(callerOnly.probe.evidence.process_isolation_enforced, false);
  assert.equal(callerOnly.can_certify_ga, false);

  const collected = runAgentAdapterOsIsolationSandboxExecutionProbe(projectRoot, {
    project_id: projectId,
    execution_id: "ADAPTER-OSISO-EXEC-0172-COLLECTED",
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=actor-secret`,
    requested_provider: "windows_appcontainer",
    execution_environment: {
      platform: "win32",
      notes: `${projectRoot} password=runner-secret`
    }
  }, {
    execution_probe: (probeInput) => {
      assert.equal(probeInput.project_root, projectRoot);
      assert.equal(probeInput.project_id, projectId);
      assert.equal(probeInput.execution_id, "ADAPTER-OSISO-EXEC-0172-COLLECTED");
      assert.equal(probeInput.launch_id, launch.launch_id);
      assert.equal(probeInput.launch_path, launch.launch_path);
      assert.equal(probeInput.adapter_id, "codex-cli");
      assert.equal(probeInput.backend, "external");
      assert.equal(probeInput.provider, "windows_appcontainer");
      assert.equal(probeInput.launcher_binary_sha256, "a".repeat(64));
      return {
        probe_source: "service_owned_sandbox_execution_probe",
        collection_source: "service_owned_os_probe",
        process_isolation_enforced: true,
        filesystem_scope_enforced: true,
        network_isolation_enforced: true,
        no_new_privileges: true,
        escape_prevention: true,
        adapter_process_exit_code: 0,
        stdout_sha256: "b".repeat(64),
        stderr_sha256: "c".repeat(64),
        transcript_sha256: "d".repeat(64),
        diagnostics: [`${projectRoot} should be scrubbed`, "sandbox execution probe collected"]
      };
    }
  });
  assert.equal(collected.schema_version, "comath.agent_adapter_os_isolation_sandbox_execution.v1");
  assert.equal(collected.ok, true, "service-owned sandbox execution probe should collect OS-enforcement evidence");
  assert.equal(collected.execution_status, "sandbox_execution_probe_collected");
  assert.equal(collected.launch_id, launch.launch_id);
  assert.equal(collected.launch_artifact.path, launch.launch_path);
  assert.equal(collected.provider, "windows_appcontainer");
  assert.equal(collected.probe.ok, true);
  assert.equal(collected.probe.probe_status, "os_isolation_probe_collected");
  assert.equal(collected.probe.evidence.process_isolation_enforced, true);
  assert.equal(collected.probe.evidence.filesystem_scope_enforced, true);
  assert.equal(collected.probe.evidence.network_isolation_enforced, true);
  assert.equal(collected.probe.evidence.no_new_privileges, true);
  assert.equal(collected.probe.evidence.escape_prevention, true);
  assert.equal(collected.adapter_execution_isolation.current_boundary, "os_enforced");
  assert.equal(collected.adapter_execution_isolation.os_enforced, true);
  assert.equal(collected.proof_authority, "none");
  assert.equal(collected.can_promote_claim, false);
  assert.equal(collected.can_certify_ga, false);
  assert.equal(collected.blocker_certificate, null, "collected execution probe should not emit an execution blocker");
  assert.equal(existsSync(join(projectRoot, collected.execution_path)), true, "execution manifest must be persisted");
  assert.equal(existsSync(join(projectRoot, collected.probe.evidence_path)), true, "collected evidence must be persisted");
  assert.equal(JSON.stringify(collected).includes(projectRoot), false, "execution result must not echo host paths");
  assert.equal(JSON.stringify(collected).includes("actor-secret"), false, "execution result must not echo actor secrets");
  assert.equal(JSON.stringify(collected).includes("runner-secret"), false, "execution result must not echo payload secrets");

  const persistedExecution = JSON.parse(readFileSync(join(projectRoot, collected.execution_path), "utf8"));
  assert.equal(persistedExecution.execution_status, "sandbox_execution_probe_collected");
  assert.equal(persistedExecution.probe.evidence.probe_status, "os_isolation_probe_collected");
  assert.equal(JSON.stringify(persistedExecution).includes(projectRoot), false, "persisted execution manifest must not echo host paths");

  const readiness = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0172-READY-FROM-EXECUTION",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task172-test",
    evidence_path: collected.probe.evidence_path
  });
  assert.equal(
    readiness.ok,
    false,
    "sandbox execution probe evidence still needs production helper source provenance before readiness"
  );
  assert.equal(readiness.checks.collected_probe_binding.ok, true);
  assert.equal(readiness.checks.production_helper_source.ok, false);
  assert.equal(
    readiness.vetoes.some((veto) => veto.code === "adapter_os_isolation_production_helper_source_missing"),
    true,
    "sandbox execution evidence without provider-helper source provenance must fail the production helper source gate"
  );
  assert.equal(readiness.can_certify_ga, false);

  const mismatchedLaunch = runAgentAdapterOsIsolationSandboxExecutionProbe(projectRoot, {
    project_id: projectId,
    execution_id: "ADAPTER-OSISO-EXEC-0172-MISMATCHED",
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "bundled",
    actor: "goal3-task172-test",
    requested_provider: "windows_appcontainer"
  });
  assert.equal(mismatchedLaunch.ok, false, "execution must bind the preflight launch backend exactly");
  assert.equal(mismatchedLaunch.execution_status, "blocked_sandbox_launch_binding_mismatch");
  assert.equal(mismatchedLaunch.can_certify_ga, false);

  assert.throws(
    () =>
      runAgentAdapterOsIsolationSandboxExecutionProbe(projectRoot, {
        project_id: projectId,
        execution_id: "ADAPTER-OSISO-EXEC-0172-COLLECTED",
        launch_id: launch.launch_id,
        adapter_id: "codex-cli",
        backend: "external",
        actor: "goal3-task172-test",
        requested_provider: "windows_appcontainer"
      }),
    (error) => error?.code === "AGENT_ADAPTER_OS_ISOLATION_SANDBOX_EXECUTION_ALREADY_EXISTS",
    "sandbox execution probe manifests must be append-only by execution id"
  );

  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-sandbox-execution",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      execution_id: "ADAPTER-OSISO-EXEC-0172-ROUTE",
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: "goal3-task172-route-test",
      requested_provider: "windows_appcontainer",
      execution_environment: {
        platform: "win32",
        notes: `${projectRoot} token=route-secret`,
        process_isolation_enforced: true,
        filesystem_scope_enforced: true,
        network_isolation_enforced: true,
        no_new_privileges: true,
        escape_prevention: true,
        adapter_process_exit_code: 0,
        stdout_sha256: "7".repeat(64),
        stderr_sha256: "8".repeat(64),
        transcript_sha256: "9".repeat(64)
      }
    }
  });
  assert.equal(routeResponse.status, 200, JSON.stringify(routeResponse.body));
  assert.equal(routeResponse.body.execution.ok, false, "route callers cannot self-certify sandbox execution");
  assert.equal(routeResponse.body.execution.execution_status, "blocked_sandbox_execution_probe_not_collected");
  assert.equal(routeResponse.body.execution.adapter_execution_isolation.os_enforced, false);
  assert.equal(routeResponse.body.execution.can_certify_ga, false);
  assert.equal(JSON.stringify(routeResponse.body).includes(projectRoot), false, "route response must not echo host paths");
  assert.equal(JSON.stringify(routeResponse.body).includes("route-secret"), false, "route response must not echo secrets");

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.os_isolation_sandbox_execution_probed" &&
        event.payload.execution_id === "ADAPTER-OSISO-EXEC-0172-COLLECTED" &&
        event.payload.ok === true &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "sandbox execution probe must be audit-visible and non-authoritative"
  );
  assert.equal(JSON.stringify(events).includes(projectRoot), false, "audit events must not echo host paths");
  assert.equal(JSON.stringify(events).includes("actor-secret"), false, "audit events must not echo actor secrets");
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task172 agent adapter OS-isolation sandbox execution tests passed.");
