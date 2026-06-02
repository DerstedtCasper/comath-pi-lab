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
  prepareAgentAdapterOsIsolationSandboxLaunch,
  readAuditEvents,
  reviewAgentAdapterOsIsolationReadiness
} from "../../dist/index.js";

function canonicalJson(value) {
  return `${JSON.stringify(sortJson(value))}\n`;
}

function sortJson(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sortJson(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortJson(value[key])]));
  }
  return value;
}

function sha256Text(text) {
  return createHash("sha256").update(text).digest("hex");
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

const providerHelperEnvVar = "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_HELPER";
const providerHelperArgsEnvVar = "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_HELPER_ARGS_JSON";
const fallbackHelperEnvVar = "COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER";
const fallbackHelperArgsEnvVar = "COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER_ARGS_JSON";
const previousProviderHelper = process.env[providerHelperEnvVar];
const previousProviderHelperArgs = process.env[providerHelperArgsEnvVar];
const previousFallbackHelper = process.env[fallbackHelperEnvVar];
const previousFallbackHelperArgs = process.env[fallbackHelperArgsEnvVar];
const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task182-adapter-osiso-helper-exec-"));

try {
  const helperScript = join(projectRoot, "task182-provider-helper.mjs");
  writeFileSync(
    helperScript,
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
      "  console.error('task182 configured provider helper self-test stderr ok');",
      "  process.exit(0);",
      "}",
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
      "console.error('task182 configured provider helper stderr ok');"
    ].join("\n"),
    "utf8"
  );

  process.env[providerHelperEnvVar] = process.execPath;
  process.env[providerHelperArgsEnvVar] = JSON.stringify([helperScript]);
  delete process.env[fallbackHelperEnvVar];
  delete process.env[fallbackHelperArgsEnvVar];

  const helperBinarySha256 = sha256File(process.execPath);
  const helperArgsPrefixSha256 = sha256Text(canonicalJson([helperScript]));
  const init = initProject({ name: "Goal3 Task182 Configured Helper Execution Collection", root_path: projectRoot });
  const projectId = init.project.project_id;

  const launch = prepareAgentAdapterOsIsolationSandboxLaunch(projectRoot, {
    project_id: projectId,
    launch_id: "ADAPTER-OSISO-LAUNCH-0182-READY",
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
      assert.equal(probeInput.provider, "windows_appcontainer");
      return {
        probe_source: "service_owned_launcher_preflight",
        provider_available: true,
        launcher_binary_sha256: "a".repeat(64),
        launcher_version: "appcontainer-launcher-9.0",
        diagnostics: [`${projectRoot} launcher diagnostic must be scrubbed`, "launcher ready"]
      };
    }
  });
  assert.equal(launch.ok, true, "ready sandbox-launch preflight is required before configured helper execution");

  const server = createComathServer();
  const routeRunner = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-runner",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      runner_id: "ADAPTER-OSISO-RUNNER-0182-ENV-READY",
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=runner-route-secret`,
      requested_provider: "windows_appcontainer",
      runner_environment: {
        platform: "win32",
        notes: `${projectRoot} Authorization: Bearer runner-route-secret`,
        provider_runner_available: false,
        runner_binary_sha256: "f".repeat(64),
        command_override: "caller-owned-runner",
        argv_override: ["--unsafe", "--claim-ready"]
      }
    }
  });
  assert.equal(routeRunner.status, 200, JSON.stringify(routeRunner.body));
  const readyRunner = routeRunner.body.runner;
  assert.equal(readyRunner.ok, true);
  assert.equal(readyRunner.provider_runner_resolution.runner_binary_sha256, helperBinarySha256);

  const routeHost = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-helper-host-validation",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0182-ENV-READY",
      runner_id: readyRunner.runner_id,
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=host-secret`,
      requested_provider: "windows_appcontainer",
      host_environment: {
        platform: process.platform,
        notes: `${projectRoot} token=host-secret`,
        helper_host_ready: false,
        helper_binary_sha256: "e".repeat(64),
        command_override: "caller-owned-host-validator"
      }
    }
  });
  assert.equal(routeHost.status, 200, JSON.stringify(routeHost.body));
  const readyHost = routeHost.body.host_validation;
  assert.equal(readyHost.ok, true);
  assert.equal(readyHost.host_validation_status, "provider_helper_host_validated");
  assert.equal(readyHost.provider_helper_host_validation.helper_binary_sha256, helperBinarySha256);

  process.env[providerHelperArgsEnvVar] = JSON.stringify([helperScript, 42, `${projectRoot} token=bad-prefix-secret`]);
  const routeInvalidArgsExecution = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-helper-execution",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      helper_execution_id: "ADAPTER-OSISO-HELPER-0182-BAD-ARGS",
      host_validation_id: readyHost.host_validation_id,
      runner_id: readyRunner.runner_id,
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=bad-args-route-secret`,
      requested_provider: "windows_appcontainer",
      helper_environment: {
        platform: process.platform,
        notes: `${projectRoot} token=bad-args-note-secret`
      }
    }
  });
  assert.equal(routeInvalidArgsExecution.status, 200, JSON.stringify(routeInvalidArgsExecution.body));
  assert.equal(
    routeInvalidArgsExecution.body.helper_execution.helper_execution_status,
    "blocked_provider_helper_not_configured",
    "invalid configured helper args JSON must fail closed before spawning the helper"
  );
  assert.equal(routeInvalidArgsExecution.body.helper_execution.provider_helper_attempted, false);
  assert.equal(routeInvalidArgsExecution.body.helper_execution.provider_helper_execution.helper_args_prefix_sha256, null);
  assert.equal(routeInvalidArgsExecution.body.helper_execution.provider_helper_execution.helper_args_prefix_count, 0);
  assert.equal(routeInvalidArgsExecution.body.helper_execution.can_certify_ga, false);
  assert.equal(JSON.stringify(routeInvalidArgsExecution.body).includes(projectRoot), false, "invalid args response must not echo host paths");
  assert.equal(JSON.stringify(routeInvalidArgsExecution.body).includes("bad-prefix-secret"), false, "invalid args response must not echo prefix secrets");
  assert.equal(JSON.stringify(routeInvalidArgsExecution.body).includes("bad-args-route-secret"), false, "invalid args response must not echo actor secrets");
  process.env[providerHelperArgsEnvVar] = JSON.stringify([helperScript]);

  const routeExecution = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-helper-execution",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      helper_execution_id: "ADAPTER-OSISO-HELPER-0182-ENV-EXEC",
      host_validation_id: readyHost.host_validation_id,
      runner_id: readyRunner.runner_id,
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=helper-route-secret`,
      requested_provider: "windows_appcontainer",
      helper_environment: {
        platform: process.platform,
        notes: `${projectRoot} Authorization: Bearer helper-route-secret`,
        helper_available: false,
        helper_exit_code: 0,
        stdout_sha256: "1".repeat(64),
        stderr_sha256: "2".repeat(64),
        command_override: "caller-owned-helper",
        argv_override: ["--unsafe", "--claim-os-enforced"],
        env_override: {
          TOKEN: "helper-route-secret"
        }
      }
    }
  });
  assert.equal(routeExecution.status, 200, JSON.stringify(routeExecution.body));
  const helperExecution = routeExecution.body.helper_execution;
  assert.equal(
    helperExecution.helper_execution_status,
    "provider_helper_execution_attempted",
    "default configured helper args asset should let the host-validated helper execute without caller-owned command metadata"
  );
  assert.equal(helperExecution.ok, true);
  assert.equal(helperExecution.provider_helper_attempted, true);
  assert.equal(helperExecution.provider_helper_host_validation_binding.bound, true);
  assert.equal(helperExecution.provider_helper_execution.helper_source, "service_owned_provider_helper_config");
  assert.equal(helperExecution.provider_helper_execution.helper_binary_sha256, helperBinarySha256);
  assert.equal(helperExecution.provider_helper_execution.helper_args_prefix_sha256, helperArgsPrefixSha256);
  assert.equal(helperExecution.provider_helper_execution.helper_args_prefix_count, 1);
  assert.equal(helperExecution.provider_helper_execution.helper_exit_code, 0);
  assert.match(helperExecution.provider_helper_execution.stdout_sha256, /^[a-f0-9]{64}$/);
  assert.match(helperExecution.provider_helper_execution.stderr_sha256, /^[a-f0-9]{64}$/);
  assert.match(helperExecution.provider_helper_execution.transcript_sha256, /^[a-f0-9]{64}$/);
  assert.equal(helperExecution.provider_helper_execution.stdout_sha256 !== "1".repeat(64), true);
  assert.equal(helperExecution.provider_helper_execution.stderr_sha256 !== "2".repeat(64), true);
  assert.equal(helperExecution.provider_helper_execution.shell, false);
  assert.equal(helperExecution.provider_helper_execution.network_policy, "disabled");
  assert.equal(helperExecution.adapter_execution_isolation.current_boundary, "process_boundary_only");
  assert.equal(helperExecution.adapter_execution_isolation.os_enforced, false);
  assert.equal(helperExecution.proof_authority, "none");
  assert.equal(helperExecution.can_promote_claim, false);
  assert.equal(helperExecution.can_certify_ga, false);
  assert.equal(existsSync(join(projectRoot, helperExecution.helper_execution_path)), true);
  assert.equal(JSON.stringify(helperExecution).includes(projectRoot), false, "helper execution response must not echo host paths");
  assert.equal(JSON.stringify(helperExecution).includes(helperScript), false, "helper execution response must not echo helper script path");
  assert.equal(JSON.stringify(helperExecution).includes(process.execPath), false, "helper execution response must not echo helper executable path");
  assert.equal(JSON.stringify(helperExecution).includes("helper-route-secret"), false, "helper execution response must not echo secrets");
  assert.equal(JSON.stringify(helperExecution).includes("caller-owned-helper"), false, "caller helper command overrides must not be persisted");
  assert.equal(JSON.stringify(helperExecution).includes("--claim-os-enforced"), false, "caller argv override must not be persisted");

  const persistedExecution = JSON.parse(readFileSync(join(projectRoot, helperExecution.helper_execution_path), "utf8"));
  assert.equal(persistedExecution.provider_helper_execution.helper_args_prefix_sha256, helperArgsPrefixSha256);
  assert.equal(JSON.stringify(persistedExecution).includes(projectRoot), false, "persisted helper execution must not echo host paths");
  assert.equal(JSON.stringify(persistedExecution).includes(helperScript), false, "persisted helper execution must not echo helper script path");

  const routeCollection = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-helper-collection",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      collection_id: "ADAPTER-OSISO-HELPER-COLLECT-0182-ROUTE-SPOOF",
      helper_execution_id: helperExecution.helper_execution_id,
      runner_id: readyRunner.runner_id,
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=collection-route-secret`,
      requested_provider: "windows_appcontainer",
      collection_environment: {
        platform: process.platform,
        notes: `${projectRoot} token=collection-route-secret`,
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
  assert.equal(routeCollection.status, 200, JSON.stringify(routeCollection.body));
  assert.equal(
    routeCollection.body.collection.collection_status,
    "blocked_provider_helper_collection_not_collected",
    "public route callers cannot turn helper execution into collected OS evidence"
  );
  assert.equal(routeCollection.body.collection.adapter_execution_isolation.os_enforced, false);
  assert.equal(routeCollection.body.collection.can_certify_ga, false);
  assert.equal(JSON.stringify(routeCollection.body).includes(projectRoot), false, "collection route response must not echo host paths");
  assert.equal(JSON.stringify(routeCollection.body).includes("collection-route-secret"), false, "collection route response must not echo secrets");

  const collected = collectAgentAdapterOsIsolationProviderHelperExecutionEvidence(projectRoot, {
    project_id: projectId,
    collection_id: "ADAPTER-OSISO-HELPER-COLLECT-0182-READY",
    helper_execution_id: helperExecution.helper_execution_id,
    runner_id: readyRunner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=collector-secret`,
    requested_provider: "windows_appcontainer",
    collection_environment: {
      platform: process.platform,
      notes: `${projectRoot} token=collector-secret`
    }
  }, {
    provider_helper_collection_probe: (probeInput) => {
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
        network_isolation_enforced: true,
        no_new_privileges: true,
        escape_prevention: true,
        adapter_process_exit_code: 0,
        stdout_sha256: helperExecution.provider_helper_execution.stdout_sha256,
        stderr_sha256: helperExecution.provider_helper_execution.stderr_sha256,
        transcript_sha256: helperExecution.provider_helper_execution.transcript_sha256,
        diagnostics: [`${projectRoot} collector diagnostic must be scrubbed`, "task182 helper collection succeeded"]
      };
    }
  });
  assert.equal(collected.ok, true, "service-owned collection probe can collect from the configured helper execution manifest");
  assert.equal(collected.collection_status, "provider_helper_os_evidence_collected");
  assert.equal(collected.probe.ok, true);
  assert.equal(collected.probe.evidence.collection_source, "service_owned_os_probe");
  assert.equal(collected.probe.evidence.stdout_sha256, helperExecution.provider_helper_execution.stdout_sha256);
  assert.equal(collected.adapter_execution_isolation.current_boundary, "os_enforced");
  assert.equal(collected.adapter_execution_isolation.os_enforced, true);
  assert.equal(collected.proof_authority, "none");
  assert.equal(collected.can_promote_claim, false);
  assert.equal(collected.can_certify_ga, false);
  assert.equal(JSON.stringify(collected).includes(projectRoot), false, "collected manifest must not echo host paths");
  assert.equal(JSON.stringify(collected).includes("collector-secret"), false, "collected manifest must not echo secrets");

  const readiness = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0182-READY-FROM-CONFIGURED-HELPER",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task182-test",
    evidence_path: collected.probe.evidence_path
  });
  assert.equal(readiness.ok, true, "only canonical collected evidence should pass the readiness gate");
  assert.equal(readiness.can_certify_ga, false);

  const notExecutionEvidence = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0182-EXECUTION-NOT-EVIDENCE",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task182-test",
    evidence_path: helperExecution.helper_execution_path
  });
  assert.equal(notExecutionEvidence.ok, false, "configured helper execution manifest is still not readiness evidence");
  assert.equal(
    notExecutionEvidence.vetoes.some((veto) => veto.code === "adapter_os_isolation_evidence_not_service_owned_probe"),
    true
  );

  assert.equal(
    getComathdStatus().capabilities.includes("agent_adapter_os_isolation_configured_provider_helper_execution_asset"),
    true,
    "Task182 service capability ledger must advertise configured helper execution assets without claiming GA"
  );

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.os_isolation_provider_helper_executed" &&
        event.payload.helper_execution_id === helperExecution.helper_execution_id &&
        event.payload.ok === true &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "configured helper execution must be audit-visible and non-authoritative"
  );
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.os_isolation_provider_helper_collected" &&
        event.payload.collection_id === collected.collection_id &&
        event.payload.ok === true &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "configured helper collection must be audit-visible and non-authoritative"
  );
  assert.equal(JSON.stringify(events).includes(projectRoot), false, "audit events must not echo host paths");
  assert.equal(JSON.stringify(events).includes("collector-secret"), false, "audit events must not echo secrets");
} finally {
  if (previousProviderHelper === undefined) {
    delete process.env[providerHelperEnvVar];
  } else {
    process.env[providerHelperEnvVar] = previousProviderHelper;
  }
  if (previousProviderHelperArgs === undefined) {
    delete process.env[providerHelperArgsEnvVar];
  } else {
    process.env[providerHelperArgsEnvVar] = previousProviderHelperArgs;
  }
  if (previousFallbackHelper === undefined) {
    delete process.env[fallbackHelperEnvVar];
  } else {
    process.env[fallbackHelperEnvVar] = previousFallbackHelper;
  }
  if (previousFallbackHelperArgs === undefined) {
    delete process.env[fallbackHelperArgsEnvVar];
  } else {
    process.env[fallbackHelperArgsEnvVar] = previousFallbackHelperArgs;
  }
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task182 configured provider helper execution collection tests passed.");
