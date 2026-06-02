import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  collectAgentAdapterOsIsolationProviderHelperExecutionEvidence,
  createComathServer,
  getComathdStatus,
  initProject,
  prepareAgentAdapterOsIsolationProviderRunner,
  prepareAgentAdapterOsIsolationSandboxLaunch,
  readAuditEvents,
  reviewAgentAdapterOsIsolationReadiness,
  runAgentAdapterOsIsolationProviderHelperExecution,
  validateAgentAdapterOsIsolationProviderHelperHost
} from "../../dist/index.js";

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task177-adapter-osiso-helper-collection-"));

try {
  assert.equal(
    typeof collectAgentAdapterOsIsolationProviderHelperExecutionEvidence,
    "function",
    "Task177 must export a service-owned provider-helper OS-isolation evidence collection bridge"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("agent_adapter_os_isolation_provider_helper_collection"),
    true,
    "Task177 service capability ledger must advertise provider-helper collection without claiming GA certification"
  );

  const init = initProject({ name: "Goal3 Task177 Adapter OS Isolation Provider Helper Collection", root_path: projectRoot });
  const projectId = init.project.project_id;

  const spoofed = collectAgentAdapterOsIsolationProviderHelperExecutionEvidence(projectRoot, {
    project_id: projectId,
    collection_id: "ADAPTER-OSISO-HELPER-COLLECT-0177-SPOOFED",
    helper_execution_id: "ADAPTER-OSISO-HELPER-0177-MISSING",
    runner_id: "ADAPTER-OSISO-RUNNER-0177-MISSING",
    launch_id: "ADAPTER-OSISO-LAUNCH-0177-MISSING",
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=spoof-secret`,
    requested_provider: "windows_appcontainer",
    collection_environment: {
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
  assert.equal(spoofed.ok, false, "caller-supplied collection metadata must not make helper collection ready");
  assert.equal(spoofed.collection_status, "blocked_provider_helper_execution_missing");
  assert.equal(spoofed.probe, null);
  assert.equal(spoofed.adapter_execution_isolation.current_boundary, "process_boundary_only");
  assert.equal(spoofed.adapter_execution_isolation.os_enforced, false);
  assert.equal(spoofed.proof_authority, "none");
  assert.equal(spoofed.can_promote_claim, false);
  assert.equal(spoofed.can_certify_ga, false);
  assert.equal(existsSync(join(projectRoot, spoofed.collection_path)), true, "helper collection manifest must be persisted");
  assert.equal(JSON.stringify(spoofed).includes(projectRoot), false, "spoofed collection result must not echo host paths");
  assert.equal(JSON.stringify(spoofed).includes("spoof-secret"), false, "spoofed collection result must not echo actor secrets");
  assert.equal(JSON.stringify(spoofed).includes("spoof-token"), false, "spoofed collection result must not echo payload secrets");
  assert.equal(JSON.stringify(spoofed).includes("111111"), false, "caller stdout hashes must not be accepted");

  const helperScript = join(projectRoot, "task177-provider-helper.mjs");
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
    launch_id: "ADAPTER-OSISO-LAUNCH-0177-READY",
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
        launcher_version: "appcontainer-launcher-5.0",
        diagnostics: [`${projectRoot} launcher diagnostic must be scrubbed`, "launcher ready"]
      };
    }
  });
  assert.equal(launch.ok, true, "ready sandbox-launch preflight is required before provider helper collection");

  const readyRunner = prepareAgentAdapterOsIsolationProviderRunner(projectRoot, {
    project_id: projectId,
    runner_id: "ADAPTER-OSISO-RUNNER-0177-READY",
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
  assert.equal(readyRunner.ok, true, "ready provider-runner manifest is required before provider helper execution");

  const readyHost = validateAgentAdapterOsIsolationProviderHelperHost(projectRoot, {
    project_id: projectId,
    host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0177-READY",
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
      assert.equal(hostInput.host_validation_id, "ADAPTER-OSISO-HELPER-HOST-0177-READY");
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
  assert.equal(readyHost.ok, true, "ready provider-helper host validation is required before provider helper collection fixtures");

  const helperExecution = runAgentAdapterOsIsolationProviderHelperExecution(projectRoot, {
    project_id: projectId,
    helper_execution_id: "ADAPTER-OSISO-HELPER-0177-READY",
    host_validation_id: readyHost.host_validation_id,
    runner_id: readyRunner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=helper-secret`,
    requested_provider: "windows_appcontainer",
    helper_environment: {
      platform: "win32",
      notes: `${projectRoot} password=helper-secret`
    }
  }, {
    provider_helper_config_resolver: (helperInput) => {
      assert.equal(helperInput.project_root, projectRoot);
      assert.equal(helperInput.project_id, projectId);
      assert.equal(helperInput.helper_execution_id, "ADAPTER-OSISO-HELPER-0177-READY");
      assert.equal(helperInput.runner_id, readyRunner.runner_id);
      assert.equal(helperInput.launch_id, launch.launch_id);
      assert.equal(helperInput.provider, "windows_appcontainer");
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
  assert.equal(helperExecution.ok, true, "Task177 positive path starts from a real service-owned helper execution attempt");
  assert.equal(helperExecution.helper_execution_status, "provider_helper_execution_attempted");
  assert.equal(helperExecution.provider_helper_host_validation_binding.bound, true);

  const failedHelperScript = join(projectRoot, "task177-provider-helper-failed.mjs");
  writeFileSync(failedHelperScript, "console.error('provider helper failed'); process.exit(2);\n", "utf8");
  const failedHelperExecution = runAgentAdapterOsIsolationProviderHelperExecution(projectRoot, {
    project_id: projectId,
    helper_execution_id: "ADAPTER-OSISO-HELPER-0177-FAILED",
    host_validation_id: readyHost.host_validation_id,
    runner_id: readyRunner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task177-test",
    requested_provider: "windows_appcontainer",
    helper_environment: {
      platform: "win32"
    }
  }, {
    provider_helper_config_resolver: () => ({
      config_source: "service_owned_provider_helper_config",
      helper_available: true,
      helper_program: process.execPath,
      helper_args_prefix: [failedHelperScript],
      helper_version: "node-provider-helper-test",
      timeout_ms: 5000
    })
  });
  assert.equal(failedHelperExecution.ok, false, "failed helper execution cannot be collected");
  assert.equal(failedHelperExecution.helper_execution_status, "blocked_provider_helper_execution_failed");
  const failedHelperCollection = collectAgentAdapterOsIsolationProviderHelperExecutionEvidence(projectRoot, {
    project_id: projectId,
    collection_id: "ADAPTER-OSISO-HELPER-COLLECT-0177-FAILED",
    helper_execution_id: failedHelperExecution.helper_execution_id,
    runner_id: readyRunner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task177-test",
    requested_provider: "windows_appcontainer",
    collection_environment: {
      platform: "win32"
    }
  }, {
    provider_helper_collection_probe: () => {
      throw new Error("collector must not be called for failed helper execution");
    }
  });
  assert.equal(failedHelperCollection.ok, false);
  assert.equal(failedHelperCollection.collection_status, "blocked_provider_helper_execution_not_attempted");
  assert.equal(failedHelperCollection.probe, null);
  assert.equal(failedHelperCollection.can_certify_ga, false);

  const callerOnlyRoute = await createComathServer().inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-helper-collection",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      collection_id: "ADAPTER-OSISO-HELPER-COLLECT-0177-ROUTE",
      helper_execution_id: helperExecution.helper_execution_id,
      runner_id: readyRunner.runner_id,
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: "goal3-task177-route-test",
      requested_provider: "windows_appcontainer",
      collection_environment: {
        platform: "win32",
        notes: `${projectRoot} token=route-secret`,
        process_isolation_enforced: true,
        filesystem_scope_enforced: true,
        network_isolation_enforced: true,
        no_new_privileges: true,
        escape_prevention: true,
        adapter_process_exit_code: 0,
        stdout_sha256: helperExecution.provider_helper_execution.stdout_sha256,
        stderr_sha256: helperExecution.provider_helper_execution.stderr_sha256,
        transcript_sha256: helperExecution.provider_helper_execution.transcript_sha256
      }
    }
  });
  assert.equal(callerOnlyRoute.status, 200, JSON.stringify(callerOnlyRoute.body));
  assert.equal(
    callerOnlyRoute.body.collection.collection_status,
    "blocked_provider_helper_collection_not_collected",
    "route callers cannot self-collect provider-helper OS evidence"
  );
  assert.equal(callerOnlyRoute.body.collection.probe.ok, false);
  assert.equal(callerOnlyRoute.body.collection.adapter_execution_isolation.os_enforced, false);
  assert.equal(callerOnlyRoute.body.collection.can_certify_ga, false);
  assert.equal(JSON.stringify(callerOnlyRoute.body).includes(projectRoot), false, "route response must not echo host paths");
  assert.equal(JSON.stringify(callerOnlyRoute.body).includes("route-secret"), false, "route response must not echo secrets");

  const mismatchedHashes = collectAgentAdapterOsIsolationProviderHelperExecutionEvidence(projectRoot, {
    project_id: projectId,
    collection_id: "ADAPTER-OSISO-HELPER-COLLECT-0177-MISMATCHED",
    helper_execution_id: helperExecution.helper_execution_id,
    runner_id: readyRunner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task177-test",
    requested_provider: "windows_appcontainer",
    collection_environment: {
      platform: "win32"
    }
  }, {
    provider_helper_collection_probe: (probeInput) => {
      assert.equal(probeInput.helper_execution_id, helperExecution.helper_execution_id);
      return {
        probe_source: "service_owned_provider_helper_collection_probe",
        collection_source: "service_owned_os_probe",
        process_isolation_enforced: true,
        filesystem_scope_enforced: true,
        network_isolation_enforced: true,
        no_new_privileges: true,
        escape_prevention: true,
        adapter_process_exit_code: 0,
        stdout_sha256: "f".repeat(64),
        stderr_sha256: helperExecution.provider_helper_execution.stderr_sha256,
        transcript_sha256: helperExecution.provider_helper_execution.transcript_sha256,
        diagnostics: [`${projectRoot} hash mismatch diagnostic must be scrubbed`, "hash mismatch"]
      };
    }
  });
  assert.equal(mismatchedHashes.ok, false, "helper collection must bind collection hashes to the helper execution manifest");
  assert.equal(mismatchedHashes.collection_status, "blocked_provider_helper_collection_hash_mismatch");
  assert.equal(mismatchedHashes.probe.ok, false);
  assert.equal(mismatchedHashes.probe.evidence.process_isolation_enforced, false);
  assert.equal(mismatchedHashes.can_certify_ga, false);

  const collected = collectAgentAdapterOsIsolationProviderHelperExecutionEvidence(projectRoot, {
    project_id: projectId,
    collection_id: "ADAPTER-OSISO-HELPER-COLLECT-0177-READY",
    helper_execution_id: helperExecution.helper_execution_id,
    runner_id: readyRunner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=collector-secret`,
    requested_provider: "windows_appcontainer",
    collection_environment: {
      platform: "win32",
      notes: `${projectRoot} password=collector-secret`
    }
  }, {
    provider_helper_collection_probe: (probeInput) => {
      assert.equal(probeInput.project_root, projectRoot);
      assert.equal(probeInput.project_id, projectId);
      assert.equal(probeInput.collection_id, "ADAPTER-OSISO-HELPER-COLLECT-0177-READY");
      assert.equal(probeInput.helper_execution_id, helperExecution.helper_execution_id);
      assert.equal(probeInput.helper_execution_path, helperExecution.helper_execution_path);
      assert.equal(probeInput.runner_id, readyRunner.runner_id);
      assert.equal(probeInput.runner_path, readyRunner.runner_path);
      assert.equal(probeInput.launch_id, launch.launch_id);
      assert.equal(probeInput.launch_path, launch.launch_path);
      assert.equal(probeInput.adapter_id, "codex-cli");
      assert.equal(probeInput.backend, "external");
      assert.equal(probeInput.provider, "windows_appcontainer");
      assert.equal(probeInput.helper_exit_code, 0);
      assert.equal(probeInput.stdout_sha256, helperExecution.provider_helper_execution.stdout_sha256);
      assert.equal(probeInput.stderr_sha256, helperExecution.provider_helper_execution.stderr_sha256);
      assert.equal(probeInput.transcript_sha256, helperExecution.provider_helper_execution.transcript_sha256);
      return {
        probe_source: "service_owned_provider_helper_collection_probe",
        collection_source: "service_owned_os_probe",
        process_isolation_enforced: true,
        filesystem_scope_enforced: true,
        network_isolation_enforced: true,
        no_new_privileges: true,
        escape_prevention: true,
        adapter_process_exit_code: 0,
        stdout_sha256: helperExecution.provider_helper_execution.stdout_sha256,
        stderr_sha256: helperExecution.provider_helper_execution.stderr_sha256,
        transcript_sha256: helperExecution.provider_helper_execution.transcript_sha256,
        diagnostics: [`${projectRoot} collector diagnostic must be scrubbed`, "helper collection succeeded"]
      };
    }
  });
  assert.equal(collected.schema_version, "comath.agent_adapter_os_isolation_provider_helper_collection.v1");
  assert.equal(collected.ok, true, "service-owned provider-helper collection should produce canonical OS evidence");
  assert.equal(collected.collection_status, "provider_helper_os_evidence_collected");
  assert.equal(collected.helper_execution_artifact.path, helperExecution.helper_execution_path);
  assert.equal(collected.runner_artifact.path, readyRunner.runner_path);
  assert.equal(collected.launch_artifact.path, launch.launch_path);
  assert.equal(collected.probe.ok, true);
  assert.equal(collected.probe.probe_status, "os_isolation_probe_collected");
  assert.equal(collected.probe.evidence.process_isolation_enforced, true);
  assert.equal(collected.probe.evidence.filesystem_scope_enforced, true);
  assert.equal(collected.probe.evidence.network_isolation_enforced, true);
  assert.equal(collected.probe.evidence.no_new_privileges, true);
  assert.equal(collected.probe.evidence.escape_prevention, true);
  assert.equal(collected.probe.evidence.stdout_sha256, helperExecution.provider_helper_execution.stdout_sha256);
  assert.equal(collected.probe.evidence.stderr_sha256, helperExecution.provider_helper_execution.stderr_sha256);
  assert.equal(collected.probe.evidence.transcript_sha256, helperExecution.provider_helper_execution.transcript_sha256);
  assert.equal(collected.provider_helper_collection.probe_source, "service_owned_provider_helper_collection_probe");
  assert.equal(collected.provider_helper_collection.hashes_match_helper_execution, true);
  assert.equal(collected.adapter_execution_isolation.current_boundary, "os_enforced");
  assert.equal(collected.adapter_execution_isolation.os_enforced, true);
  assert.equal(collected.proof_authority, "none");
  assert.equal(collected.can_promote_claim, false);
  assert.equal(collected.can_certify_ga, false);
  assert.equal(collected.blocker_certificate, null, "collected helper evidence should not emit a collection blocker");
  assert.equal(existsSync(join(projectRoot, collected.collection_path)), true, "helper collection manifest must be persisted");
  assert.equal(existsSync(join(projectRoot, collected.probe.evidence_path)), true, "canonical collected evidence must be persisted");
  assert.equal(JSON.stringify(collected).includes(projectRoot), false, "collection result must not echo host paths");
  assert.equal(JSON.stringify(collected).includes("collector-secret"), false, "collection result must not echo actor or payload secrets");

  const persistedCollection = JSON.parse(readFileSync(join(projectRoot, collected.collection_path), "utf8"));
  assert.equal(persistedCollection.collection_status, "provider_helper_os_evidence_collected");
  assert.equal(persistedCollection.probe.evidence.probe_status, "os_isolation_probe_collected");
  assert.equal(JSON.stringify(persistedCollection).includes(projectRoot), false, "persisted collection manifest must not echo host paths");

  const readiness = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0177-READY-FROM-HELPER-COLLECTION",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task177-test",
    evidence_path: collected.probe.evidence_path
  });
  assert.equal(readiness.ok, true, "provider-helper collection must feed the existing Task167 readiness gate via canonical evidence");
  assert.equal(readiness.checks.service_owned_probe.ok, true);
  assert.equal(readiness.checks.collected_probe_binding.ok, true);
  assert.equal(readiness.can_certify_ga, false);

  const notEvidence = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0177-COLLECTION-NOT-EVIDENCE",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task177-test",
    evidence_path: collected.collection_path
  });
  assert.equal(notEvidence.ok, false, "helper collection wrapper manifests are not readiness evidence by themselves");
  assert.equal(
    notEvidence.vetoes.some((veto) => veto.code === "adapter_os_isolation_evidence_not_service_owned_probe"),
    true
  );

  assert.throws(
    () =>
      collectAgentAdapterOsIsolationProviderHelperExecutionEvidence(projectRoot, {
        project_id: projectId,
        collection_id: "ADAPTER-OSISO-HELPER-COLLECT-0177-READY",
        helper_execution_id: helperExecution.helper_execution_id,
        runner_id: readyRunner.runner_id,
        launch_id: launch.launch_id,
        adapter_id: "codex-cli",
        backend: "external",
        actor: "goal3-task177-test",
        requested_provider: "windows_appcontainer"
      }),
    (error) => error?.code === "AGENT_ADAPTER_OS_ISOLATION_PROVIDER_HELPER_COLLECTION_ALREADY_EXISTS",
    "provider helper collection manifests must be append-only by collection id"
  );

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.os_isolation_provider_helper_collected" &&
        event.payload.collection_id === "ADAPTER-OSISO-HELPER-COLLECT-0177-READY" &&
        event.payload.ok === true &&
        event.payload.provider === "windows_appcontainer" &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "provider helper collection must be audit-visible and non-authoritative"
  );
  assert.equal(JSON.stringify(events).includes(projectRoot), false, "audit events must not echo host paths");
  assert.equal(JSON.stringify(events).includes("collector-secret"), false, "audit events must not echo actor secrets");
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task177 agent adapter OS-isolation provider helper collection tests passed.");
