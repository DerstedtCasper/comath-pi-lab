import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  collectAgentAdapterOsIsolationProviderHelperExecutionEvidence,
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
  const helperScript = join(projectRoot, "task197-provider-helper.mjs");
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

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task197-helper-collection-complete-gate-"));

try {
  assert.equal(
    getComathdStatus().capabilities.includes(
      "agent_adapter_os_isolation_provider_helper_collection_complete_enforcement_gate"
    ),
    true,
    "Task197 capability ledger must advertise the provider-helper collection complete-enforcement gate"
  );

  const init = initProject({
    name: "Goal3 Task197 Adapter OS Isolation Provider Helper Collection Complete Gate",
    root_path: projectRoot
  });
  const projectId = init.project.project_id;
  const helperScript = createHelperScript(projectRoot);
  const helperBinarySha256 = sha256File(process.execPath);

  const launch = prepareAgentAdapterOsIsolationSandboxLaunch(projectRoot, {
    project_id: projectId,
    launch_id: "ADAPTER-OSISO-LAUNCH-0197-READY",
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
  assert.equal(launch.ok, true);

  const readyRunner = prepareAgentAdapterOsIsolationProviderRunner(projectRoot, {
    project_id: projectId,
    runner_id: "ADAPTER-OSISO-RUNNER-0197-READY",
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
    host_capability_probe_id: "ADAPTER-OSISO-HOST-CAP-0197-READY",
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
        capability_facts: ["task197 helper collection complete-gate host prerequisite observed"],
        required_tools: ["windows_appcontainer-task197-host-probe"],
        kernel_features: ["task197-provider-host-capability"],
        diagnostics: [`${projectRoot} host capability diagnostic must be scrubbed`, "host capability observed"]
      };
    }
  });
  assert.equal(hostCapability.ok, true);

  const readyHost = validateAgentAdapterOsIsolationProviderHelperHost(projectRoot, {
    project_id: projectId,
    host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0197-READY",
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
    helper_execution_id: "ADAPTER-OSISO-HELPER-0197-READY",
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
      assert.equal(helperInput.helper_execution_id, "ADAPTER-OSISO-HELPER-0197-READY");
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
  assert.equal(helperExecution.provider_helper_host_validation_binding.bound, true);

  const incompleteCollection = collectAgentAdapterOsIsolationProviderHelperExecutionEvidence(projectRoot, {
    project_id: projectId,
    collection_id: "ADAPTER-OSISO-HELPER-COLLECT-0197-INCOMPLETE",
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
      assert.equal(probeInput.collection_id, "ADAPTER-OSISO-HELPER-COLLECT-0197-INCOMPLETE");
      assert.equal(probeInput.helper_execution_id, helperExecution.helper_execution_id);
      assert.equal(probeInput.helper_exit_code, 0);
      assert.equal(probeInput.stdout_sha256, helperExecution.provider_helper_execution.stdout_sha256);
      assert.equal(probeInput.stderr_sha256, helperExecution.provider_helper_execution.stderr_sha256);
      assert.equal(probeInput.transcript_sha256, helperExecution.provider_helper_execution.transcript_sha256);
      return {
        probe_source: "service_owned_provider_helper_collection_probe",
        collection_source: "service_owned_os_probe",
        process_isolation_enforced: true,
        filesystem_scope_enforced: true,
        network_isolation_enforced: false,
        no_new_privileges: true,
        escape_prevention: true,
        adapter_process_exit_code: 0,
        stdout_sha256: helperExecution.provider_helper_execution.stdout_sha256,
        stderr_sha256: helperExecution.provider_helper_execution.stderr_sha256,
        transcript_sha256: helperExecution.provider_helper_execution.transcript_sha256,
        diagnostics: [`${projectRoot} incomplete collector diagnostic must be scrubbed`, "network isolation incomplete"]
      };
    }
  });

  assert.equal(incompleteCollection.ok, false, "incomplete OS-enforcement facts cannot be helper-collected");
  assert.equal(
    incompleteCollection.collection_status,
    "blocked_provider_helper_collection_incomplete_os_enforcement",
    "matching helper hashes still require complete service-owned OS-enforcement facts"
  );
  assert.equal(incompleteCollection.provider_helper_collection.hashes_match_helper_execution, true);
  assert.equal(incompleteCollection.provider_helper_collection.os_enforcement_complete, false);
  assert.deepEqual(incompleteCollection.provider_helper_collection.incomplete_os_enforcement_facts, [
    "network_isolation_enforced"
  ]);
  assert.equal(incompleteCollection.provider_helper_collection.runtime_attestation_bound, true);
  assert.equal(incompleteCollection.probe.ok, false);
  assert.equal(incompleteCollection.probe.evidence.network_isolation_enforced, false);
  assert.equal(incompleteCollection.adapter_execution_isolation.os_enforced, false);
  assert.equal(incompleteCollection.proof_authority, "none");
  assert.equal(incompleteCollection.can_promote_claim, false);
  assert.equal(incompleteCollection.can_certify_ga, false);
  assert.equal(incompleteCollection.blocker_certificate.blocker_code, "blocked_provider_helper_collection_incomplete_os_enforcement");
  assert.match(incompleteCollection.blocker_certificate.replayable_next_action, /complete OS-enforcement/i);
  assert.equal(existsSync(join(projectRoot, incompleteCollection.collection_path)), true);
  assert.equal(existsSync(join(projectRoot, incompleteCollection.probe.evidence_path)), true);
  assert.equal(JSON.stringify(incompleteCollection).includes(projectRoot), false, "collection result must not echo host paths");
  assert.equal(JSON.stringify(incompleteCollection).includes("collector-secret"), false, "collection result must not echo secrets");

  const persistedCollection = JSON.parse(readFileSync(join(projectRoot, incompleteCollection.collection_path), "utf8"));
  assert.equal(persistedCollection.provider_helper_collection.os_enforcement_complete, false);
  assert.deepEqual(persistedCollection.provider_helper_collection.incomplete_os_enforcement_facts, [
    "network_isolation_enforced"
  ]);

  const readiness = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0197-INCOMPLETE-HELPER-COLLECTION-READINESS",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task197-test",
    evidence_path: incompleteCollection.probe.evidence_path
  });
  assert.equal(readiness.ok, false, "incomplete helper collection evidence must remain a replayable blocker");
  assert.equal(
    readiness.vetoes.some((veto) => veto.code === "adapter_os_isolation_collected_probe_binding_missing"),
    true
  );
  assert.equal(
    readiness.vetoes.some((veto) => veto.code === "adapter_os_network_isolation_missing"),
    true
  );

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.os_isolation_provider_helper_collected" &&
        event.payload.collection_id === "ADAPTER-OSISO-HELPER-COLLECT-0197-INCOMPLETE" &&
        event.payload.ok === false &&
        event.payload.collection_status === "blocked_provider_helper_collection_incomplete_os_enforcement" &&
        event.payload.os_enforcement_complete === false &&
        Array.isArray(event.payload.incomplete_os_enforcement_facts) &&
        event.payload.incomplete_os_enforcement_facts.includes("network_isolation_enforced") &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "incomplete helper collection must be audit-visible and non-authoritative"
  );
  assert.equal(JSON.stringify(events).includes(projectRoot), false, "audit events must not echo host paths");
  assert.equal(JSON.stringify(events).includes("collector-secret"), false, "audit events must not echo actor secrets");
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task197 agent adapter OS-isolation provider helper collection complete-enforcement gate tests passed.");
