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
  const helperScript = join(projectRoot, "task200-provider-helper.mjs");
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
      "  launch_id: process.env.COMATH_SANDBOX_LAUNCH_ID",
      "};",
      "console.log(JSON.stringify(payload));",
      "console.error('provider helper stderr ok');"
    ].join("\n"),
    "utf8"
  );
  return helperScript;
}

function createCollectionProbeScript(projectRoot, { omitHostCapabilityHash = false } = {}) {
  const suffix = omitHostCapabilityHash ? "missing-host-capability" : "bound-host-capability";
  const collectionProbeScript = join(projectRoot, `task200-${suffix}-collection-probe.mjs`);
  writeFileSync(
    collectionProbeScript,
    [
      "const args = process.argv.slice(2);",
      "const valueAfter = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : null; };",
      "const numberAfter = (flag) => Number(valueAfter(flag));",
      "const payload = {",
      "  comath_provider_helper_collection_probe: true,",
      "  ok: true,",
      "  provider: process.env.COMATH_OS_ISOLATION_PROVIDER,",
      "  network_policy: process.env.COMATH_RUNNER_NETWORK,",
      "  proof_authority: process.env.COMATH_PROOF_AUTHORITY,",
      "  adapter: process.env.COMATH_ADAPTER_ID,",
      "  backend: process.env.COMATH_ADAPTER_BACKEND,",
      "  project_id: process.env.COMATH_PROJECT_ID,",
      "  collection_id: valueAfter('--collection-id'),",
      "  helper_execution_id: valueAfter('--helper-execution-id'),",
      "  runner_id: process.env.COMATH_PROVIDER_RUNNER_ID,",
      "  launch_id: process.env.COMATH_SANDBOX_LAUNCH_ID,",
      "  helper_exit_code: numberAfter('--helper-exit-code'),",
      "  stdout_sha256: valueAfter('--stdout-sha256'),",
      "  stderr_sha256: valueAfter('--stderr-sha256'),",
      "  transcript_sha256: valueAfter('--transcript-sha256'),",
      "  host_validation_id: valueAfter('--host-validation-id'),",
      "  host_validation_path: valueAfter('--host-validation-path'),",
      "  host_validation_sha256: valueAfter('--host-validation-sha256'),",
      "  host_capability_probe_id: valueAfter('--host-capability-probe-id'),",
      "  host_capability_probe_path: valueAfter('--host-capability-probe-path'),",
      omitHostCapabilityHash
        ? "  host_capability_probe_sha256: null,"
        : "  host_capability_probe_sha256: valueAfter('--host-capability-probe-sha256'),",
      "  host_capability_status: valueAfter('--host-capability-status'),",
      "  provider_host_capability_bound: valueAfter('--provider-host-capability-bound') === 'true',",
      "  collection_source: 'service_owned_os_probe',",
      "  process_isolation_enforced: true,",
      "  filesystem_scope_enforced: true,",
      "  network_isolation_enforced: true,",
      "  no_new_privileges: true,",
      "  escape_prevention: true,",
      "  provider_tool_execution_witness: { witness_source: 'provider_specific_executed_tool', provider: process.env.COMATH_OS_ISOLATION_PROVIDER, execution_id: `${valueAfter('--collection-id')}-TOOL`, collection_id: valueAfter('--collection-id'), helper_execution_id: valueAfter('--helper-execution-id'), runner_id: process.env.COMATH_PROVIDER_RUNNER_ID, launch_id: process.env.COMATH_SANDBOX_LAUNCH_ID, tool_sha256: valueAfter('--provider-tool-sha256'), profile_sha256: valueAfter('--provider-tool-profile-sha256'), argv_sha256: valueAfter('--provider-tool-argv-sha256'), host_capability_tool_name: valueAfter('--provider-host-tool-name'), host_capability_tool_sha256: valueAfter('--provider-host-tool-sha256'), transcript_sha256: valueAfter('--transcript-sha256'), network_policy: 'disabled', proof_authority: 'none' }",
      "};",
      "console.log(JSON.stringify(payload));",
      "console.error('collection probe stderr ok');"
    ].join("\n"),
    "utf8"
  );
  return collectionProbeScript;
}

async function postCollection(server, projectRoot, projectId, helperExecution, readyRunner, launch, collectionId, actorSecret) {
  return server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-helper-collection",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      collection_id: collectionId,
      helper_execution_id: helperExecution.helper_execution_id,
      runner_id: readyRunner.runner_id,
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=${actorSecret}`,
      requested_provider: "windows_appcontainer",
      collection_environment: {
        platform: "win32",
        notes: `${projectRoot} password=${actorSecret}`,
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
}

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task200-configured-collection-host-capability-"));
const probeEnvVar = "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_COLLECTION_PROBE";
const probeArgsEnvVar = "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_COLLECTION_PROBE_ARGS_JSON";
const previousProbeEnv = process.env[probeEnvVar];
const previousProbeArgsEnv = process.env[probeArgsEnvVar];

try {
  assert.equal(
    getComathdStatus().capabilities.includes(
      "agent_adapter_os_isolation_configured_provider_helper_collection_host_capability_binding"
    ),
    true,
    "Task200 capability ledger must advertise configured collection probe host-capability binding"
  );

  const init = initProject({
    name: "Goal3 Task200 Adapter OS Isolation Configured Collection Host Capability Binding",
    root_path: projectRoot
  });
  const projectId = init.project.project_id;
  const helperScript = createHelperScript(projectRoot);
  const hostBoundCollectionProbeScript = createCollectionProbeScript(projectRoot);
  const missingHostCapabilityProbeScript = createCollectionProbeScript(projectRoot, {
    omitHostCapabilityHash: true
  });
  const helperBinarySha256 = sha256File(process.execPath);
  process.env[probeEnvVar] = process.execPath;
  process.env[probeArgsEnvVar] = JSON.stringify([hostBoundCollectionProbeScript]);

  const launch = prepareAgentAdapterOsIsolationSandboxLaunch(projectRoot, {
    project_id: projectId,
    launch_id: "ADAPTER-OSISO-LAUNCH-0200-READY",
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
        launcher_version: "appcontainer-launcher-8.0",
        diagnostics: [`${projectRoot} launcher diagnostic must be scrubbed`, "launcher ready"]
      };
    }
  });
  assert.equal(launch.ok, true);

  const readyRunner = prepareAgentAdapterOsIsolationProviderRunner(projectRoot, {
    project_id: projectId,
    runner_id: "ADAPTER-OSISO-RUNNER-0200-READY",
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
    host_capability_probe_id: "ADAPTER-OSISO-HOST-CAP-0200-READY",
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
        capability_facts: ["task200 configured collection host capability prerequisite observed"],
        required_tools: [{ name: "windows_checknetisolation", present: true, binary_sha256: helperBinarySha256, version: null }],
        kernel_features: ["task200-provider-host-capability"],
        diagnostics: [`${projectRoot} host capability diagnostic must be scrubbed`, "host capability observed"]
      };
    }
  });
  assert.equal(hostCapability.ok, true);

  const readyHost = validateAgentAdapterOsIsolationProviderHelperHost(projectRoot, {
    project_id: projectId,
    host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0200-READY",
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
      assert.equal(hostInput.host_capability_probe_id, hostCapability.host_capability_probe_id);
      assert.equal(hostInput.host_capability_probe_path, hostCapability.host_capability_probe_path);
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
  assert.equal(readyHost.provider_host_capability_artifact.path, hostCapability.host_capability_probe_path);
  assert.match(readyHost.provider_host_capability_artifact.sha256, /^[a-f0-9]{64}$/);

  const helperExecution = runAgentAdapterOsIsolationProviderHelperExecution(projectRoot, {
    project_id: projectId,
    helper_execution_id: "ADAPTER-OSISO-HELPER-0200-READY",
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
      stdout_sha256: "1".repeat(64),
      stderr_sha256: "2".repeat(64)
    }
  }, {
    provider_helper_config_resolver: (helperInput) => {
      assert.equal(helperInput.project_root, projectRoot);
      assert.equal(helperInput.project_id, projectId);
      assert.equal(helperInput.helper_execution_id, "ADAPTER-OSISO-HELPER-0200-READY");
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
  assert.equal(helperExecution.provider_helper_host_validation_binding.host_capability_probe_id, hostCapability.host_capability_probe_id);

  const server = createComathServer();
  const routeCollection = await postCollection(
    server,
    projectRoot,
    projectId,
    helperExecution,
    readyRunner,
    launch,
    "ADAPTER-OSISO-HELPER-COLLECT-0200-HOST-BOUND",
    "route-collector-secret"
  );

  assert.equal(routeCollection.status, 200, JSON.stringify(routeCollection.body));
  const collection = routeCollection.body.collection;
  assert.equal(collection.ok, true, "host-capability-bound configured collection probe should produce canonical OS evidence");
  assert.equal(collection.collection_status, "provider_helper_os_evidence_collected");
  assert.equal(collection.provider_helper_collection.host_capability_required, true);
  assert.equal(collection.provider_helper_collection.host_capability_bound, true);
  assert.equal(collection.provider_helper_collection.host_validation_id, readyHost.host_validation_id);
  assert.equal(collection.provider_helper_collection.host_validation_path, helperExecution.host_validation_artifact.path);
  assert.equal(collection.provider_helper_collection.host_validation_sha256, helperExecution.host_validation_artifact.sha256);
  assert.equal(collection.provider_helper_collection.host_capability_probe_id, hostCapability.host_capability_probe_id);
  assert.equal(collection.provider_helper_collection.host_capability_probe_path, hostCapability.host_capability_probe_path);
  assert.equal(collection.provider_helper_collection.host_capability_probe_sha256, readyHost.provider_host_capability_artifact.sha256);
  assert.equal(collection.provider_helper_collection.host_capability_status, "provider_host_capability_observed");
  assert.equal(collection.provider_helper_collection.os_enforcement_complete, true);
  assert.equal(collection.provider_helper_collection.provider_tool_execution_witness_bound, true);
  assert.match(collection.provider_helper_collection.provider_tool_execution_witness_sha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(collection.provider_helper_collection.incomplete_os_enforcement_facts, []);
  assert.equal(collection.probe.ok, true);
  assert.equal(collection.probe.adapter_execution_isolation.os_enforced, true);
  assert.equal(collection.adapter_execution_isolation.os_enforced, false);
  assert.equal(collection.proof_authority, "none");
  assert.equal(collection.can_certify_ga, false);
  assert.equal(existsSync(join(projectRoot, collection.collection_path)), true);
  assert.equal(existsSync(join(projectRoot, collection.probe.evidence_path)), true);
  assert.equal(JSON.stringify(routeCollection.body).includes(projectRoot), false, "route response must not echo host paths");
  assert.equal(JSON.stringify(routeCollection.body).includes("route-collector-secret"), false, "route response must not echo secrets");

  const readiness = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0200-HOST-BOUND-COLLECTION-READINESS",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task200-test",
    evidence_path: collection.probe.evidence_path
  });
  assert.equal(readiness.ok, true, "complete host-bound configured collection evidence can satisfy OS-isolation readiness");
  assert.equal(readiness.proof_authority, "none");
  assert.equal(readiness.can_certify_ga, false);

  process.env[probeArgsEnvVar] = JSON.stringify([missingHostCapabilityProbeScript]);
  const invalidRouteCollection = await postCollection(
    server,
    projectRoot,
    projectId,
    helperExecution,
    readyRunner,
    launch,
    "ADAPTER-OSISO-HELPER-COLLECT-0200-MISSING-HOST-CAP",
    "invalid-collector-secret"
  );

  assert.equal(invalidRouteCollection.status, 200, JSON.stringify(invalidRouteCollection.body));
  const invalidCollection = invalidRouteCollection.body.collection;
  assert.equal(invalidCollection.ok, false, "configured probe without host capability artifact hash must fail closed");
  assert.equal(invalidCollection.collection_status, "blocked_provider_helper_collection_incomplete_os_enforcement");
  assert.equal(invalidCollection.provider_helper_collection.probe_source, "service_owned_provider_helper_collection_probe");
  assert.equal(invalidCollection.provider_helper_collection.host_capability_required, true);
  assert.equal(invalidCollection.provider_helper_collection.host_capability_bound, true);
  assert.equal(invalidCollection.provider_helper_collection.host_capability_probe_id, hostCapability.host_capability_probe_id);
  assert.equal(invalidCollection.provider_helper_collection.host_capability_probe_sha256, readyHost.provider_host_capability_artifact.sha256);
  assert.equal(invalidCollection.provider_helper_collection.os_enforcement_complete, false);
  assert.deepEqual(invalidCollection.provider_helper_collection.incomplete_os_enforcement_facts, [
    "process_isolation_enforced",
    "filesystem_scope_enforced",
    "network_isolation_enforced",
    "no_new_privileges",
    "escape_prevention"
  ]);
  assert.equal(invalidCollection.probe.ok, false);
  assert.equal(invalidCollection.adapter_execution_isolation.os_enforced, false);
  assert.equal(invalidCollection.proof_authority, "none");
  assert.equal(invalidCollection.can_certify_ga, false);
  assert.equal(invalidCollection.blocker_certificate.blocker_code, "blocked_provider_helper_collection_incomplete_os_enforcement");
  assert.equal(JSON.stringify(invalidRouteCollection.body).includes(projectRoot), false, "invalid route response must not echo host paths");
  assert.equal(JSON.stringify(invalidRouteCollection.body).includes("invalid-collector-secret"), false, "invalid route response must not echo secrets");

  const invalidReadiness = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0200-MISSING-HOST-CAP-READINESS",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task200-invalid-test",
    evidence_path: invalidCollection.probe.evidence_path
  });
  assert.equal(invalidReadiness.ok, false, "host-capability-unbound configured collection blocker must not satisfy readiness");

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.os_isolation_provider_helper_collected" &&
        event.payload.collection_id === "ADAPTER-OSISO-HELPER-COLLECT-0200-HOST-BOUND" &&
        event.payload.ok === true &&
        event.payload.host_capability_bound === true &&
        event.payload.host_capability_probe_id === hostCapability.host_capability_probe_id &&
        event.payload.host_capability_status === "provider_host_capability_observed" &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "host-capability-bound configured helper collection must be audit-visible and non-authoritative"
  );
  assert.equal(JSON.stringify(events).includes(projectRoot), false, "audit events must not echo host paths");
} finally {
  if (previousProbeEnv === undefined) {
    delete process.env[probeEnvVar];
  } else {
    process.env[probeEnvVar] = previousProbeEnv;
  }
  if (previousProbeArgsEnv === undefined) {
    delete process.env[probeArgsEnvVar];
  } else {
    process.env[probeArgsEnvVar] = previousProbeArgsEnv;
  }
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task200 configured collection host capability binding tests passed.");
