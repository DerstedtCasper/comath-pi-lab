import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  collectAgentAdapterOsIsolationProviderHelperExecutionEvidence,
  createComathServer,
  getComathdStatus,
  initProject,
  prepareAgentAdapterOsIsolationSandboxLaunch,
  probeAgentAdapterOsIsolationProviderHostCapability,
  readAuditEvents,
  reviewAgentAdapterOsIsolationReadiness
} from "../../dist/index.js";

const providerHelpers = {
  firejail: {
    helperEnv: "COMATH_AGENT_ADAPTER_OSISO_FIREJAIL_HELPER",
    argsEnv: "COMATH_AGENT_ADAPTER_OSISO_FIREJAIL_HELPER_ARGS_JSON"
  },
  windows_appcontainer: {
    helperEnv: "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_HELPER",
    argsEnv: "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_HELPER_ARGS_JSON"
  },
  macos_sandbox_exec: {
    helperEnv: "COMATH_AGENT_ADAPTER_OSISO_MACOS_SANDBOX_EXEC_HELPER",
    argsEnv: "COMATH_AGENT_ADAPTER_OSISO_MACOS_SANDBOX_EXEC_HELPER_ARGS_JSON"
  }
};

const compatibleProvider = process.platform === "darwin"
  ? "macos_sandbox_exec"
  : process.platform === "win32"
    ? "windows_appcontainer"
    : "firejail";
const compatibleHelper = providerHelpers[compatibleProvider];

const previousProviderHelper = process.env[compatibleHelper.helperEnv];
const previousProviderHelperArgs = process.env[compatibleHelper.argsEnv];
const previousFallbackHelper = process.env.COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER;
const previousFallbackHelperArgs = process.env.COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER_ARGS_JSON;
const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task187-runtime-attestation-"));

function writeHelperScript(path, mode) {
  const runtimeLines = mode === "bound"
    ? [
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
        "  launch_id: process.env.COMATH_SANDBOX_LAUNCH_ID"
      ]
    : [
        "  comath_provider_helper_runtime_attestation: true,",
        "  ok: true,",
        "  provider: process.env.COMATH_OS_ISOLATION_PROVIDER,",
        "  network_policy: process.env.COMATH_RUNNER_NETWORK,",
        "  proof_authority: process.env.COMATH_PROOF_AUTHORITY,",
        "  adapter: process.env.COMATH_ADAPTER_ID,",
        "  backend: process.env.COMATH_ADAPTER_BACKEND,",
        "  runner_id: process.env.COMATH_PROVIDER_RUNNER_ID,",
        "  launch_id: process.env.COMATH_SANDBOX_LAUNCH_ID"
      ];
  writeFileSync(
    path,
    [
      "const args = process.argv.slice(2);",
      "const valueAfter = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : null; };",
      "if (args.includes('--comath-provider-helper-self-test')) {",
      "  console.log(JSON.stringify({",
      "    comath_provider_helper_self_test: true,",
      "    ok: true,",
      "    provider: valueAfter('--provider'),",
      "    network_policy: valueAfter('--network-policy'),",
      "    proof_authority: valueAfter('--proof-authority'),",
      "    adapter: process.env.COMATH_ADAPTER_ID,",
      "    backend: process.env.COMATH_ADAPTER_BACKEND,",
      "    project_id: process.env.COMATH_PROJECT_ID,",
      "    host_validation_id: valueAfter('--host-validation-id'),",
      "    runner_id: valueAfter('--runner-id'),",
      "    launch_id: valueAfter('--launch-id')",
      "  }));",
      "  process.exit(0);",
      "}",
      "console.log(JSON.stringify({",
      ...runtimeLines,
      "}));",
      "console.error('task187 configured provider helper stderr ok');"
    ].join("\n"),
    "utf8"
  );
}

async function routeRunnerHostAndExecution({ server, projectId, launch, script, suffix }) {
  process.env[compatibleHelper.helperEnv] = process.execPath;
  process.env[compatibleHelper.argsEnv] = JSON.stringify([script]);
  delete process.env.COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER;
  delete process.env.COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER_ARGS_JSON;

  const runnerRoute = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-runner",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      runner_id: `ADAPTER-OSISO-RUNNER-0187-${suffix}`,
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=runner-secret-${suffix}`,
      requested_provider: compatibleProvider,
      runner_environment: {
        platform: process.platform,
        notes: `${projectRoot} token=runner-secret-${suffix}`
      }
    }
  });
  assert.equal(runnerRoute.status, 200, JSON.stringify(runnerRoute.body));
  const runner = runnerRoute.body.runner;
  assert.equal(runner.ok, true);

  const hostCapability = probeAgentAdapterOsIsolationProviderHostCapability(projectRoot, {
    project_id: projectId,
    host_capability_probe_id: `ADAPTER-OSISO-HOST-CAP-0187-${suffix}`,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=host-capability-secret-${suffix}`,
    requested_provider: compatibleProvider,
    host_capability_environment: {
      platform: "caller-spoofed-platform",
      notes: `${projectRoot} password=host-capability-secret-${suffix}`
    }
  }, {
    provider_host_capability_probe: (probeInput) => {
      assert.equal(probeInput.provider, compatibleProvider);
      assert.equal(probeInput.platform, process.platform);
      return {
        probe_source: "service_owned_provider_host_capability_probe",
        provider_host_capability_available: true,
        capability_facts: [`task187 runtime attestation ${suffix} host-validation prerequisite observed`],
        required_tools: [`${compatibleProvider}-task187-host-probe`],
        kernel_features: ["task187-provider-host-capability"],
        diagnostics: [`${projectRoot} host capability diagnostic must be scrubbed`, "host capability observed"]
      };
    }
  });
  assert.equal(hostCapability.ok, true, "Task191 requires service-owned host capability before runtime-attestation host validation");

  const hostRoute = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-helper-host-validation",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      host_validation_id: `ADAPTER-OSISO-HELPER-HOST-0187-${suffix}`,
      host_capability_probe_id: hostCapability.host_capability_probe_id,
      runner_id: runner.runner_id,
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=host-secret-${suffix}`,
      requested_provider: compatibleProvider,
      host_environment: {
        platform: "caller-spoofed-platform",
        notes: `${projectRoot} token=host-secret-${suffix}`
      }
    }
  });
  assert.equal(hostRoute.status, 200, JSON.stringify(hostRoute.body));
  const host = hostRoute.body.host_validation;
  assert.equal(host.ok, true, JSON.stringify(host));

  const executionRoute = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-helper-execution",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      helper_execution_id: `ADAPTER-OSISO-HELPER-0187-${suffix}`,
      host_validation_id: host.host_validation_id,
      runner_id: runner.runner_id,
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=helper-secret-${suffix}`,
      requested_provider: compatibleProvider,
      helper_environment: {
        platform: process.platform,
        notes: `${projectRoot} token=helper-secret-${suffix}`,
        helper_exit_code: 0,
        stdout_sha256: "1".repeat(64),
        stderr_sha256: "2".repeat(64),
        command_override: "caller-owned-helper",
        argv_override: ["--claim-os-enforced"],
        env_override: { TOKEN: `helper-secret-${suffix}` }
      }
    }
  });
  assert.equal(executionRoute.status, 200, JSON.stringify(executionRoute.body));
  const execution = executionRoute.body.helper_execution;
  assert.equal(execution.ok, true, JSON.stringify(execution));
  assert.equal(execution.helper_execution_status, "provider_helper_execution_attempted");
  assert.equal(JSON.stringify(execution).includes(projectRoot), false, "helper execution response must not echo host paths");
  assert.equal(JSON.stringify(execution).includes("caller-owned-helper"), false, "caller command overrides must not be persisted");
  return { runner, host, execution };
}

function collectWithAllGreenProbe({ projectId, runner, launch, execution, collectionId }) {
  return collectAgentAdapterOsIsolationProviderHelperExecutionEvidence(projectRoot, {
    project_id: projectId,
    collection_id: collectionId,
    helper_execution_id: execution.helper_execution_id,
    runner_id: runner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=collector-secret-${collectionId}`,
    requested_provider: compatibleProvider,
    collection_environment: {
      platform: process.platform,
      notes: `${projectRoot} token=collector-secret-${collectionId}`
    }
  }, {
    provider_helper_collection_probe: (probeInput) => {
      assert.equal(probeInput.helper_execution_id, execution.helper_execution_id);
      assert.equal(probeInput.helper_exit_code, 0);
      assert.equal(probeInput.stdout_sha256, execution.provider_helper_execution.stdout_sha256);
      assert.equal(probeInput.stderr_sha256, execution.provider_helper_execution.stderr_sha256);
      assert.equal(probeInput.transcript_sha256, execution.provider_helper_execution.transcript_sha256);
      return {
        probe_source: "service_owned_provider_helper_collection_probe",
        collection_source: "service_owned_os_probe",
        process_isolation_enforced: true,
        filesystem_scope_enforced: true,
        network_isolation_enforced: true,
        no_new_privileges: true,
        escape_prevention: true,
        adapter_process_exit_code: 0,
        stdout_sha256: execution.provider_helper_execution.stdout_sha256,
        stderr_sha256: execution.provider_helper_execution.stderr_sha256,
        transcript_sha256: execution.provider_helper_execution.transcript_sha256,
        diagnostics: [`${projectRoot} collector diagnostic must be scrubbed`, "task187 helper collection succeeded"]
      };
    }
  });
}

try {
  const init = initProject({ name: "Goal3 Task187 Helper Runtime Attestation", root_path: projectRoot });
  const projectId = init.project.project_id;
  const server = createComathServer();
  const launch = prepareAgentAdapterOsIsolationSandboxLaunch(projectRoot, {
    project_id: projectId,
    launch_id: "ADAPTER-OSISO-LAUNCH-0187-RUNTIME-ATTESTATION",
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=launch-secret`,
    requested_provider: compatibleProvider,
    launcher_environment: {
      platform: process.platform,
      notes: `${projectRoot} token=launch-secret`
    }
  }, {
    launcher_probe: () => ({
      probe_source: "service_owned_launcher_preflight",
      provider_available: true,
      launcher_binary_sha256: "a".repeat(64),
      launcher_version: `${compatibleProvider}-launcher-task187`,
      diagnostics: [`${projectRoot} launcher diagnostic must be scrubbed`, "launcher ready"]
    })
  });
  assert.equal(launch.ok, true);

  const genericRuntimeScript = join(projectRoot, "task187-generic-runtime-attestation.mjs");
  writeHelperScript(genericRuntimeScript, "generic");
  const generic = await routeRunnerHostAndExecution({
    server,
    projectId,
    launch,
    script: genericRuntimeScript,
    suffix: "GENERIC-RUNTIME"
  });
  assert.equal(
    generic.execution.provider_helper_execution.runtime_attestation_bound,
    false,
    "generic helper runtime stdout must not bind the current helper execution"
  );

  const genericCollected = collectWithAllGreenProbe({
    projectId,
    runner: generic.runner,
    launch,
    execution: generic.execution,
    collectionId: "ADAPTER-OSISO-HELPER-COLLECT-0187-GENERIC-RUNTIME"
  });
  assert.equal(
    genericCollected.collection_status,
    "blocked_provider_helper_runtime_attestation_missing",
    "generic runtime stdout cannot be upgraded into canonical OS evidence even when collection hashes match"
  );
  assert.equal(genericCollected.ok, false);
  assert.equal(genericCollected.probe, null, "runtime-attestation failures must not invoke the canonical probe writer");
  assert.equal(genericCollected.adapter_execution_isolation.os_enforced, false);
  assert.equal(genericCollected.provider_helper_collection.runtime_attestation_bound, false);
  assert.equal(genericCollected.can_certify_ga, false);
  assert.equal(JSON.stringify(genericCollected).includes(projectRoot), false, "generic collection result must not echo host paths");

  const boundRuntimeScript = join(projectRoot, "task187-bound-runtime-attestation.mjs");
  writeHelperScript(boundRuntimeScript, "bound");
  const bound = await routeRunnerHostAndExecution({
    server,
    projectId,
    launch,
    script: boundRuntimeScript,
    suffix: "BOUND-RUNTIME"
  });
  assert.equal(bound.execution.provider_helper_execution.runtime_attestation_bound, true);
  assert.match(bound.execution.provider_helper_execution.runtime_attestation_sha256, /^[a-f0-9]{64}$/);
  assert.equal(bound.execution.provider_helper_execution.runtime_attestation_source, "helper_stdout_json");

  const collected = collectWithAllGreenProbe({
    projectId,
    runner: bound.runner,
    launch,
    execution: bound.execution,
    collectionId: "ADAPTER-OSISO-HELPER-COLLECT-0187-BOUND-RUNTIME"
  });
  assert.equal(collected.ok, true, "bound runtime attestation keeps provider-helper collection collectable");
  assert.equal(collected.collection_status, "provider_helper_os_evidence_collected");
  assert.equal(collected.provider_helper_collection.runtime_attestation_bound, true);
  assert.equal(collected.provider_helper_collection.runtime_attestation_sha256, bound.execution.provider_helper_execution.runtime_attestation_sha256);
  assert.equal(collected.probe.ok, true);
  assert.equal(collected.probe.evidence.collection_source, "service_owned_os_probe");
  assert.equal(collected.adapter_execution_isolation.os_enforced, false, "helper collection wrapper is not readiness evidence by itself");
  assert.equal(collected.probe.adapter_execution_isolation.os_enforced, true);
  assert.equal(collected.proof_authority, "none");
  assert.equal(collected.can_promote_claim, false);
  assert.equal(collected.can_certify_ga, false);
  assert.equal(existsSync(join(projectRoot, collected.collection_path)), true);
  assert.equal(existsSync(join(projectRoot, collected.probe.evidence_path)), true);

  const readiness = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0187-READY-FROM-BOUND-RUNTIME-ATTESTATION",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task187-test",
    evidence_path: collected.probe.evidence_path
  });
  assert.equal(readiness.ok, true, "readiness still consumes only canonical probe/evidence artifacts");
  assert.equal(readiness.can_certify_ga, false);

  assert.equal(
    getComathdStatus().capabilities.includes("agent_adapter_os_isolation_provider_helper_runtime_attestation_binding"),
    true,
    "Task187 service capability ledger must advertise provider-helper runtime attestation binding without claiming GA"
  );

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.os_isolation_provider_helper_collected" &&
        event.payload.collection_id === collected.collection_id &&
        event.payload.ok === true &&
        event.payload.runtime_attestation_bound === true &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "Task187 collection audit event must record runtime-attestation binding without becoming proof authority"
  );
  assert.equal(JSON.stringify(events).includes(projectRoot), false, "audit events must not echo host paths");
  assert.equal(JSON.stringify(events).includes("collector-secret"), false, "audit events must not echo secrets");
} finally {
  if (previousProviderHelper === undefined) {
    delete process.env[compatibleHelper.helperEnv];
  } else {
    process.env[compatibleHelper.helperEnv] = previousProviderHelper;
  }
  if (previousProviderHelperArgs === undefined) {
    delete process.env[compatibleHelper.argsEnv];
  } else {
    process.env[compatibleHelper.argsEnv] = previousProviderHelperArgs;
  }
  if (previousFallbackHelper === undefined) {
    delete process.env.COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER;
  } else {
    process.env.COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER = previousFallbackHelper;
  }
  if (previousFallbackHelperArgs === undefined) {
    delete process.env.COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER_ARGS_JSON;
  } else {
    process.env.COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER_ARGS_JSON = previousFallbackHelperArgs;
  }
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task187 provider helper runtime attestation binding tests passed.");
