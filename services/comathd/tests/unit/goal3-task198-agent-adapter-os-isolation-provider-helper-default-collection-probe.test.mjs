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

function createHelperScript(projectRoot) {
  const helperScript = join(projectRoot, "task198-provider-helper.mjs");
  writeFileSync(
    helperScript,
    [
      "const args = process.argv.slice(2);",
      "const valueAfter = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : null; };",
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
      "console.error('provider helper stderr ok');"
    ].join("\n"),
    "utf8"
  );
  return helperScript;
}

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task198-default-helper-collector-"));

try {
  assert.equal(
    getComathdStatus().capabilities.includes(
      "agent_adapter_os_isolation_provider_helper_default_collection_probe"
    ),
    true,
    "Task198 capability ledger must advertise the default provider-helper collection probe"
  );

  const init = initProject({
    name: "Goal3 Task198 Adapter OS Isolation Provider Helper Default Collection Probe",
    root_path: projectRoot
  });
  const projectId = init.project.project_id;
  const helperScript = createHelperScript(projectRoot);
  const helperBinarySha256 = sha256File(process.execPath);

  const launch = prepareAgentAdapterOsIsolationSandboxLaunch(projectRoot, {
    project_id: projectId,
    launch_id: "ADAPTER-OSISO-LAUNCH-0198-READY",
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
  assert.equal(launch.ok, true);

  const readyRunner = prepareAgentAdapterOsIsolationProviderRunner(projectRoot, {
    project_id: projectId,
    runner_id: "ADAPTER-OSISO-RUNNER-0198-READY",
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
  assert.equal(readyRunner.ok, true);

  const hostCapability = probeAgentAdapterOsIsolationProviderHostCapability(projectRoot, {
    project_id: projectId,
    host_capability_probe_id: "ADAPTER-OSISO-HOST-CAP-0198-READY",
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
        capability_facts: ["task198 default helper collection host prerequisite observed"],
        required_tools: ["windows_appcontainer-task198-host-probe"],
        kernel_features: ["task198-provider-host-capability"],
        diagnostics: [`${projectRoot} host capability diagnostic must be scrubbed`, "host capability observed"]
      };
    }
  });
  assert.equal(hostCapability.ok, true);

  const readyHost = validateAgentAdapterOsIsolationProviderHelperHost(projectRoot, {
    project_id: projectId,
    host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0198-READY",
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
      assert.equal(hostInput.host_capability_probe_id, hostCapability.host_capability_probe_id);
      assert.equal(hostInput.host_capability_status, "provider_host_capability_observed");
      assert.equal(hostInput.provider, "windows_appcontainer");
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
  assert.equal(readyHost.ok, true);

  const helperExecution = runAgentAdapterOsIsolationProviderHelperExecution(projectRoot, {
    project_id: projectId,
    helper_execution_id: "ADAPTER-OSISO-HELPER-0198-READY",
    host_validation_id: readyHost.host_validation_id,
    runner_id: readyRunner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=helper-secret`,
    requested_provider: "windows_appcontainer",
    helper_environment: {
      platform: "win32",
      notes: `${projectRoot} password=helper-secret`,
      helper_exit_code: 99,
      stdout_sha256: "1".repeat(64),
      stderr_sha256: "2".repeat(64),
      command_override: "caller-owned-helper"
    }
  }, {
    provider_helper_config_resolver: (helperInput) => {
      assert.equal(helperInput.project_root, projectRoot);
      assert.equal(helperInput.project_id, projectId);
      assert.equal(helperInput.helper_execution_id, "ADAPTER-OSISO-HELPER-0198-READY");
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
  assert.equal(helperExecution.ok, true);
  assert.equal(helperExecution.provider_helper_execution.runtime_attestation_bound, true);
  assert.notEqual(helperExecution.provider_helper_execution.stdout_sha256, "1".repeat(64));
  assert.notEqual(helperExecution.provider_helper_execution.stderr_sha256, "2".repeat(64));

  const server = createComathServer();
  const routeCollection = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-helper-collection",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      collection_id: "ADAPTER-OSISO-HELPER-COLLECT-0198-DEFAULT",
      helper_execution_id: helperExecution.helper_execution_id,
      runner_id: readyRunner.runner_id,
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=route-collector-secret`,
      requested_provider: "windows_appcontainer",
      collection_environment: {
        platform: "win32",
        notes: `${projectRoot} password=route-collector-secret`,
        process_isolation_enforced: true,
        filesystem_scope_enforced: true,
        network_isolation_enforced: true,
        no_new_privileges: true,
        escape_prevention: true,
        adapter_process_exit_code: 0,
        stdout_sha256: "f".repeat(64),
        stderr_sha256: "e".repeat(64),
        transcript_sha256: "d".repeat(64)
      }
    }
  });

  assert.equal(routeCollection.status, 200, JSON.stringify(routeCollection.body));
  const collection = routeCollection.body.collection;
  assert.equal(collection.ok, false, "default helper collection probe records a blocker, not readiness evidence");
  assert.equal(collection.collection_status, "blocked_provider_helper_collection_incomplete_os_enforcement");
  assert.equal(collection.provider_helper_collection.probe_source, "service_owned_provider_helper_collection_probe");
  assert.equal(collection.provider_helper_collection.hashes_match_helper_execution, true);
  assert.equal(collection.provider_helper_collection.os_enforcement_complete, false);
  assert.deepEqual(collection.provider_helper_collection.incomplete_os_enforcement_facts, [
    "process_isolation_enforced",
    "filesystem_scope_enforced",
    "network_isolation_enforced",
    "no_new_privileges",
    "escape_prevention"
  ]);
  assert.equal(collection.provider_helper_collection.helper_exit_code, 0);
  assert.equal(
    collection.provider_helper_collection.stdout_sha256,
    helperExecution.provider_helper_execution.stdout_sha256,
    "default collector must bind service-owned helper stdout hash, not caller payload hash"
  );
  assert.equal(collection.provider_helper_collection.stderr_sha256, helperExecution.provider_helper_execution.stderr_sha256);
  assert.equal(collection.provider_helper_collection.transcript_sha256, helperExecution.provider_helper_execution.transcript_sha256);
  assert.equal(collection.provider_helper_collection.runtime_attestation_bound, true);
  assert.equal(collection.probe.ok, false);
  assert.equal(collection.probe.probe_status, "blocked_os_isolation_probe_not_collected");
  assert.equal(collection.probe.evidence.collection_source, "service_owned_os_probe");
  assert.equal(collection.probe.evidence.process_isolation_enforced, false);
  assert.equal(collection.probe.evidence.filesystem_scope_enforced, false);
  assert.equal(collection.probe.evidence.network_isolation_enforced, false);
  assert.equal(collection.probe.evidence.no_new_privileges, false);
  assert.equal(collection.probe.evidence.escape_prevention, false);
  assert.equal(collection.probe.evidence.stdout_sha256, helperExecution.provider_helper_execution.stdout_sha256);
  assert.equal(collection.probe.evidence.stderr_sha256, helperExecution.provider_helper_execution.stderr_sha256);
  assert.equal(collection.probe.evidence.transcript_sha256, helperExecution.provider_helper_execution.transcript_sha256);
  assert.equal(collection.adapter_execution_isolation.current_boundary, "process_boundary_only");
  assert.equal(collection.adapter_execution_isolation.os_enforced, false);
  assert.equal(collection.proof_authority, "none");
  assert.equal(collection.can_promote_claim, false);
  assert.equal(collection.can_certify_ga, false);
  assert.equal(collection.blocker_certificate.blocker_code, "blocked_provider_helper_collection_incomplete_os_enforcement");
  assert.match(collection.blocker_certificate.replayable_next_action, /complete OS-enforcement/i);
  assert.equal(existsSync(join(projectRoot, collection.collection_path)), true);
  assert.equal(existsSync(join(projectRoot, collection.probe.evidence_path)), true);
  assert.equal(JSON.stringify(routeCollection.body).includes(projectRoot), false, "route response must not echo host paths");
  assert.equal(JSON.stringify(routeCollection.body).includes("route-collector-secret"), false, "route response must not echo secrets");

  const readiness = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0198-DEFAULT-HELPER-COLLECTION-READINESS",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task198-test",
    evidence_path: collection.probe.evidence_path
  });
  assert.equal(readiness.ok, false, "default helper collection blocker evidence must not satisfy readiness");
  assert.equal(
    readiness.vetoes.some((veto) => veto.code === "adapter_os_isolation_collected_probe_binding_missing"),
    true
  );
  assert.equal(readiness.vetoes.some((veto) => veto.code === "adapter_os_process_isolation_missing"), true);
  assert.equal(readiness.vetoes.some((veto) => veto.code === "adapter_os_network_isolation_missing"), true);

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.os_isolation_provider_helper_collected" &&
        event.payload.collection_id === "ADAPTER-OSISO-HELPER-COLLECT-0198-DEFAULT" &&
        event.payload.ok === false &&
        event.payload.collection_status === "blocked_provider_helper_collection_incomplete_os_enforcement" &&
        event.payload.hashes_match_helper_execution === true &&
        event.payload.os_enforcement_complete === false &&
        Array.isArray(event.payload.incomplete_os_enforcement_facts) &&
        event.payload.incomplete_os_enforcement_facts.includes("process_isolation_enforced") &&
        event.payload.incomplete_os_enforcement_facts.includes("network_isolation_enforced") &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "default helper collection blocker must be audit-visible and non-authoritative"
  );
  assert.equal(JSON.stringify(events).includes(projectRoot), false, "audit events must not echo host paths");
  assert.equal(JSON.stringify(events).includes("route-collector-secret"), false, "audit events must not echo route secrets");
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task198 agent adapter OS-isolation default provider-helper collection probe tests passed.");
