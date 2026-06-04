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
  const helperScript = join(projectRoot, "task199-provider-helper.mjs");
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

function createCollectionProbeScript(projectRoot) {
  const collectionProbeScript = join(projectRoot, "task199-provider-helper-collection-probe.mjs");
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
      "  host_capability_probe_sha256: valueAfter('--host-capability-probe-sha256'),",
      "  host_capability_status: valueAfter('--host-capability-status'),",
      "  provider_host_capability_bound: valueAfter('--provider-host-capability-bound') === 'true',",
      "  collection_source: 'service_owned_os_probe',",
      "  process_isolation_enforced: true,",
      "  filesystem_scope_enforced: true,",
      "  network_isolation_enforced: true,",
      "  no_new_privileges: true,",
      "  escape_prevention: true,",
      "  provider_tool_execution_witness: { witness_source: 'provider_specific_executed_tool', provider: process.env.COMATH_OS_ISOLATION_PROVIDER, execution_id: `${valueAfter('--collection-id')}-TOOL`, collection_id: valueAfter('--collection-id'), helper_execution_id: valueAfter('--helper-execution-id'), runner_id: process.env.COMATH_PROVIDER_RUNNER_ID, launch_id: process.env.COMATH_SANDBOX_LAUNCH_ID, tool_sha256: valueAfter('--provider-tool-sha256'), profile_sha256: valueAfter('--provider-tool-profile-sha256'), argv_sha256: valueAfter('--provider-tool-argv-sha256'), host_capability_tool_name: valueAfter('--provider-host-tool-name'), host_capability_tool_sha256: valueAfter('--provider-host-tool-sha256'), transcript_sha256: valueAfter('--transcript-sha256'), network_policy: 'disabled', proof_authority: 'none' },",
      "  provider_family_os_enforcement_witness: { witness_source: 'provider_family_os_enforcement', provider: process.env.COMATH_OS_ISOLATION_PROVIDER, execution_id: `${valueAfter('--collection-id')}-FAMILY`, collection_id: valueAfter('--collection-id'), helper_execution_id: valueAfter('--helper-execution-id'), runner_id: process.env.COMATH_PROVIDER_RUNNER_ID, launch_id: process.env.COMATH_SANDBOX_LAUNCH_ID, host_validation_id: valueAfter('--host-validation-id'), host_validation_path: valueAfter('--host-validation-path'), host_validation_sha256: valueAfter('--host-validation-sha256'), host_capability_probe_id: valueAfter('--host-capability-probe-id'), host_capability_probe_path: valueAfter('--host-capability-probe-path'), host_capability_probe_sha256: valueAfter('--host-capability-probe-sha256'), host_capability_status: valueAfter('--host-capability-status'), provider_host_capability_bound: valueAfter('--provider-host-capability-bound') === 'true', provider_specific_tool_name: valueAfter('--provider-host-tool-name'), provider_specific_tool_sha256: valueAfter('--provider-host-tool-sha256'), provider_tool_sha256: valueAfter('--provider-tool-sha256'), provider_tool_profile_sha256: valueAfter('--provider-tool-profile-sha256'), provider_tool_argv_sha256: valueAfter('--provider-tool-argv-sha256'), provider_family_execution_kind: valueAfter('--provider-family-execution-kind'), provider_family_execution_profile_sha256: valueAfter('--provider-family-execution-profile-sha256'), provider_family_execution_argv_sha256: valueAfter('--provider-family-execution-argv-sha256'), collection_source: 'service_owned_os_probe', process_isolation_enforced: true, filesystem_scope_enforced: true, network_isolation_enforced: true, no_new_privileges: true, escape_prevention: true, adapter_process_exit_code: numberAfter('--helper-exit-code'), stdout_sha256: valueAfter('--stdout-sha256'), stderr_sha256: valueAfter('--stderr-sha256'), transcript_sha256: valueAfter('--transcript-sha256'), network_policy: 'disabled', proof_authority: 'none' },",
      "  provider_specific_live_probe_attempt: { attempt_source: 'provider_specific_live_os_probe', provider: process.env.COMATH_OS_ISOLATION_PROVIDER, execution_id: `${valueAfter('--collection-id')}-LIVE`, collection_id: valueAfter('--collection-id'), helper_execution_id: valueAfter('--helper-execution-id'), runner_id: process.env.COMATH_PROVIDER_RUNNER_ID, launch_id: process.env.COMATH_SANDBOX_LAUNCH_ID, provider_family_execution_kind: valueAfter('--provider-family-execution-kind'), provider_family_execution_profile_sha256: valueAfter('--provider-family-execution-profile-sha256'), provider_family_execution_argv_sha256: valueAfter('--provider-family-execution-argv-sha256'), provider_tool_sha256: valueAfter('--provider-tool-sha256'), provider_tool_profile_sha256: valueAfter('--provider-tool-profile-sha256'), provider_tool_argv_sha256: valueAfter('--provider-tool-argv-sha256'), transcript_sha256: valueAfter('--transcript-sha256'), collection_source: 'service_owned_os_probe', process_isolation_enforced: true, filesystem_scope_enforced: true, network_isolation_enforced: true, no_new_privileges: true, escape_prevention: true, adapter_process_exit_code: numberAfter('--helper-exit-code'), network_policy: 'disabled', proof_authority: 'none' }",
      "};",
      "console.log(JSON.stringify(payload));",
      "console.error('collection probe stderr ok');"
    ].join("\n"),
    "utf8"
  );
  return collectionProbeScript;
}

function createInvalidCollectionProbeScript(projectRoot) {
  const collectionProbeScript = join(projectRoot, "task199-invalid-provider-helper-collection-probe.mjs");
  writeFileSync(
    collectionProbeScript,
    [
      "const args = process.argv.slice(2);",
      "const valueAfter = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : null; };",
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
      "  helper_exit_code: Number(valueAfter('--helper-exit-code')),",
      "  stdout_sha256: '0'.repeat(64),",
      "  stderr_sha256: valueAfter('--stderr-sha256'),",
      "  transcript_sha256: valueAfter('--transcript-sha256'),",
      "  host_validation_id: valueAfter('--host-validation-id'),",
      "  host_validation_path: valueAfter('--host-validation-path'),",
      "  host_validation_sha256: valueAfter('--host-validation-sha256'),",
      "  host_capability_probe_id: valueAfter('--host-capability-probe-id'),",
      "  host_capability_probe_path: valueAfter('--host-capability-probe-path'),",
      "  host_capability_probe_sha256: valueAfter('--host-capability-probe-sha256'),",
      "  host_capability_status: valueAfter('--host-capability-status'),",
      "  provider_host_capability_bound: valueAfter('--provider-host-capability-bound') === 'true',",
      "  collection_source: 'service_owned_os_probe',",
      "  process_isolation_enforced: true,",
      "  filesystem_scope_enforced: true,",
      "  network_isolation_enforced: true,",
      "  no_new_privileges: true,",
      "  escape_prevention: true",
      "};",
      "console.log(JSON.stringify(payload));",
      "console.error('invalid collection probe stderr ok');"
    ].join("\n"),
    "utf8"
  );
  return collectionProbeScript;
}

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task199-configured-helper-collection-probe-"));
const probeEnvVar = "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_COLLECTION_PROBE";
const probeArgsEnvVar = "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_COLLECTION_PROBE_ARGS_JSON";
const previousProbeEnv = process.env[probeEnvVar];
const previousProbeArgsEnv = process.env[probeArgsEnvVar];

try {
  assert.equal(
    getComathdStatus().capabilities.includes(
      "agent_adapter_os_isolation_configured_provider_helper_collection_probe"
    ),
    true,
    "Task199 capability ledger must advertise configured provider-helper collection probe execution"
  );

  const init = initProject({
    name: "Goal3 Task199 Adapter OS Isolation Configured Provider Helper Collection Probe",
    root_path: projectRoot
  });
  const projectId = init.project.project_id;
  const helperScript = createHelperScript(projectRoot);
  const collectionProbeScript = createCollectionProbeScript(projectRoot);
  const invalidCollectionProbeScript = createInvalidCollectionProbeScript(projectRoot);
  const helperBinarySha256 = sha256File(process.execPath);
  process.env[probeEnvVar] = process.execPath;
  process.env[probeArgsEnvVar] = JSON.stringify([collectionProbeScript]);

  const launch = prepareAgentAdapterOsIsolationSandboxLaunch(projectRoot, {
    project_id: projectId,
    launch_id: "ADAPTER-OSISO-LAUNCH-0199-READY",
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
        launcher_version: "appcontainer-launcher-7.0",
        diagnostics: [`${projectRoot} launcher diagnostic must be scrubbed`, "launcher ready"]
      };
    }
  });
  assert.equal(launch.ok, true);

  const readyRunner = prepareAgentAdapterOsIsolationProviderRunner(projectRoot, {
    project_id: projectId,
    runner_id: "ADAPTER-OSISO-RUNNER-0199-READY",
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
    host_capability_probe_id: "ADAPTER-OSISO-HOST-CAP-0199-READY",
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
        capability_facts: ["task199 configured collection probe host prerequisite observed"],
        required_tools: [{ name: "windows_checknetisolation", present: true, binary_sha256: helperBinarySha256, version: null }],
        kernel_features: ["task199-provider-host-capability"],
        diagnostics: [`${projectRoot} host capability diagnostic must be scrubbed`, "host capability observed"]
      };
    }
  });
  assert.equal(hostCapability.ok, true);

  const readyHost = validateAgentAdapterOsIsolationProviderHelperHost(projectRoot, {
    project_id: projectId,
    host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0199-READY",
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
    helper_execution_id: "ADAPTER-OSISO-HELPER-0199-READY",
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
      assert.equal(helperInput.helper_execution_id, "ADAPTER-OSISO-HELPER-0199-READY");
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
      collection_id: "ADAPTER-OSISO-HELPER-COLLECT-0199-CONFIGURED",
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
        process_isolation_enforced: false,
        filesystem_scope_enforced: false,
        network_isolation_enforced: false,
        no_new_privileges: false,
        escape_prevention: false,
        adapter_process_exit_code: 99,
        stdout_sha256: "f".repeat(64),
        stderr_sha256: "e".repeat(64),
        transcript_sha256: "d".repeat(64)
      }
    }
  });

  assert.equal(routeCollection.status, 200, JSON.stringify(routeCollection.body));
  const collection = routeCollection.body.collection;
  assert.equal(collection.ok, true, "configured provider-helper collection probe should produce canonical OS evidence");
  assert.equal(collection.collection_status, "provider_helper_os_evidence_collected");
  assert.equal(collection.provider_helper_collection.probe_source, "service_owned_provider_helper_collection_probe");
  assert.equal(collection.provider_helper_collection.hashes_match_helper_execution, true);
  assert.equal(collection.provider_helper_collection.os_enforcement_complete, true);
  assert.equal(collection.provider_helper_collection.provider_tool_execution_witness_bound, true);
  assert.match(collection.provider_helper_collection.provider_tool_execution_witness_sha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(collection.provider_helper_collection.incomplete_os_enforcement_facts, []);
  assert.equal(collection.provider_helper_collection.helper_exit_code, 0);
  assert.equal(
    collection.provider_helper_collection.stdout_sha256,
    helperExecution.provider_helper_execution.stdout_sha256,
    "configured collector must bind service-owned helper stdout hash, not caller payload hash"
  );
  assert.equal(collection.provider_helper_collection.stderr_sha256, helperExecution.provider_helper_execution.stderr_sha256);
  assert.equal(collection.provider_helper_collection.transcript_sha256, helperExecution.provider_helper_execution.transcript_sha256);
  assert.equal(collection.provider_helper_collection.runtime_attestation_bound, true);
  assert.equal(collection.probe.ok, true);
  assert.equal(collection.probe.probe_status, "os_isolation_probe_collected");
  assert.equal(collection.probe.evidence.collection_source, "service_owned_os_probe");
  assert.equal(collection.probe.evidence.process_isolation_enforced, true);
  assert.equal(collection.probe.evidence.filesystem_scope_enforced, true);
  assert.equal(collection.probe.evidence.network_isolation_enforced, true);
  assert.equal(collection.probe.evidence.no_new_privileges, true);
  assert.equal(collection.probe.evidence.escape_prevention, true);
  assert.equal(collection.probe.evidence.provider_tool_execution_witness_bound, true);
  assert.match(collection.probe.evidence.provider_tool_execution_witness_sha256, /^[a-f0-9]{64}$/);
  assert.equal(collection.probe.evidence.stdout_sha256, helperExecution.provider_helper_execution.stdout_sha256);
  assert.equal(collection.probe.evidence.stderr_sha256, helperExecution.provider_helper_execution.stderr_sha256);
  assert.equal(collection.probe.evidence.transcript_sha256, helperExecution.provider_helper_execution.transcript_sha256);
  assert.equal(collection.probe.adapter_execution_isolation.os_enforced, true);
  assert.equal(collection.adapter_execution_isolation.current_boundary, "process_boundary_only");
  assert.equal(collection.adapter_execution_isolation.os_enforced, false);
  assert.equal(collection.proof_authority, "none");
  assert.equal(collection.can_promote_claim, false);
  assert.equal(collection.can_certify_ga, false);
  assert.equal(collection.blocker_certificate, null);
  assert.equal(existsSync(join(projectRoot, collection.collection_path)), true);
  assert.equal(existsSync(join(projectRoot, collection.probe.evidence_path)), true);
  assert.equal(JSON.stringify(routeCollection.body).includes(projectRoot), false, "route response must not echo host paths");
  assert.equal(JSON.stringify(routeCollection.body).includes("route-collector-secret"), false, "route response must not echo secrets");

  const readiness = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0199-CONFIGURED-HELPER-COLLECTION-READINESS",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task199-test",
    evidence_path: collection.probe.evidence_path
  });
  assert.equal(readiness.ok, true, "configured complete helper collection evidence should satisfy OS-isolation readiness");
  assert.equal(readiness.adapter_execution_isolation.os_enforced, true);
  assert.equal(readiness.proof_authority, "none");
  assert.equal(readiness.can_certify_ga, false);

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.os_isolation_provider_helper_collected" &&
        event.payload.collection_id === "ADAPTER-OSISO-HELPER-COLLECT-0199-CONFIGURED" &&
        event.payload.ok === true &&
        event.payload.collection_status === "provider_helper_os_evidence_collected" &&
        event.payload.hashes_match_helper_execution === true &&
        event.payload.os_enforcement_complete === true &&
        Array.isArray(event.payload.incomplete_os_enforcement_facts) &&
        event.payload.incomplete_os_enforcement_facts.length === 0 &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "configured helper collection evidence must be audit-visible and non-authoritative"
  );
  assert.equal(JSON.stringify(events).includes(projectRoot), false, "audit events must not echo host paths");
  assert.equal(JSON.stringify(events).includes("route-collector-secret"), false, "audit events must not echo route secrets");

  process.env[probeArgsEnvVar] = JSON.stringify([invalidCollectionProbeScript]);
  const invalidRouteCollection = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-helper-collection",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      collection_id: "ADAPTER-OSISO-HELPER-COLLECT-0199-BAD-STDOUT",
      helper_execution_id: helperExecution.helper_execution_id,
      runner_id: readyRunner.runner_id,
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=invalid-collector-secret`,
      requested_provider: "windows_appcontainer",
      collection_environment: {
        platform: "win32",
        notes: `${projectRoot} password=invalid-collector-secret`,
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
  assert.equal(invalidRouteCollection.status, 200, JSON.stringify(invalidRouteCollection.body));
  const invalidCollection = invalidRouteCollection.body.collection;
  assert.equal(invalidCollection.ok, false, "invalid configured probe stdout binding must fail closed");
  assert.equal(invalidCollection.collection_status, "blocked_provider_helper_collection_incomplete_os_enforcement");
  assert.equal(invalidCollection.provider_helper_collection.probe_source, "service_owned_provider_helper_collection_probe");
  assert.equal(invalidCollection.provider_helper_collection.hashes_match_helper_execution, true);
  assert.equal(invalidCollection.provider_helper_collection.os_enforcement_complete, false);
  assert.deepEqual(invalidCollection.provider_helper_collection.incomplete_os_enforcement_facts, [
    "process_isolation_enforced",
    "filesystem_scope_enforced",
    "network_isolation_enforced",
    "no_new_privileges",
    "escape_prevention"
  ]);
  assert.equal(invalidCollection.provider_helper_collection.stdout_sha256, helperExecution.provider_helper_execution.stdout_sha256);
  assert.equal(invalidCollection.probe.ok, false);
  assert.equal(invalidCollection.probe.probe_status, "blocked_os_isolation_probe_not_collected");
  assert.equal(invalidCollection.probe.evidence.process_isolation_enforced, false);
  assert.equal(invalidCollection.adapter_execution_isolation.os_enforced, false);
  assert.equal(invalidCollection.proof_authority, "none");
  assert.equal(invalidCollection.can_certify_ga, false);
  assert.equal(invalidCollection.blocker_certificate.blocker_code, "blocked_provider_helper_collection_incomplete_os_enforcement");
  assert.equal(JSON.stringify(invalidRouteCollection.body).includes(projectRoot), false, "invalid route response must not echo host paths");
  assert.equal(JSON.stringify(invalidRouteCollection.body).includes("invalid-collector-secret"), false, "invalid route response must not echo secrets");

  const invalidReadiness = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0199-BAD-STDOUT-READINESS",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task199-invalid-test",
    evidence_path: invalidCollection.probe.evidence_path
  });
  assert.equal(invalidReadiness.ok, false, "invalid configured collection probe blocker must not satisfy readiness");
  assert.equal(
    invalidReadiness.vetoes.some((veto) => veto.code === "adapter_os_process_isolation_missing"),
    true
  );
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

console.log("Goal 3 Task199 agent adapter OS-isolation configured provider-helper collection probe tests passed.");
