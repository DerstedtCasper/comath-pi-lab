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

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task179-adapter-osiso-helper-binding-"));

try {
  assert.equal(
    typeof runAgentAdapterOsIsolationProviderHelperExecution,
    "function",
    "Task179 hardens the existing provider-helper execution producer"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("agent_adapter_os_isolation_provider_helper_execution"),
    true,
    "provider-helper execution capability remains advertised without claiming GA certification"
  );

  const init = initProject({
    name: "Goal3 Task179 Adapter OS Isolation Helper Execution Host Validation Binding",
    root_path: projectRoot
  });
  const projectId = init.project.project_id;

  const helperScript = join(projectRoot, "task179-provider-helper.mjs");
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
  const helperBinarySha256 = sha256File(process.execPath);

  const launch = prepareAgentAdapterOsIsolationSandboxLaunch(projectRoot, {
    project_id: projectId,
    launch_id: "ADAPTER-OSISO-LAUNCH-0179-READY",
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
  assert.equal(launch.ok, true, "ready sandbox-launch preflight is required before Task179 binding");

  const readyRunner = prepareAgentAdapterOsIsolationProviderRunner(projectRoot, {
    project_id: projectId,
    runner_id: "ADAPTER-OSISO-RUNNER-0179-READY",
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
  assert.equal(readyRunner.ok, true, "ready provider-runner manifest is required before Task179 binding");

  let resolverCalledWithoutHostValidation = false;
  const missingHostValidation = runAgentAdapterOsIsolationProviderHelperExecution(projectRoot, {
    project_id: projectId,
    helper_execution_id: "ADAPTER-OSISO-HELPER-0179-MISSING-HOST",
    runner_id: readyRunner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=helper-secret`,
    requested_provider: "windows_appcontainer",
    helper_environment: {
      platform: "win32",
      notes: `${projectRoot} password=helper-secret`,
      helper_available: true,
      helper_exit_code: 0,
      stdout_sha256: "1".repeat(64),
      stderr_sha256: "2".repeat(64),
      command_override: "caller-helper-command",
      argv_override: ["--claim-ready"],
      env_override: {
        SECRET: "helper-secret"
      }
    }
  }, {
    provider_helper_config_resolver: () => {
      resolverCalledWithoutHostValidation = true;
      return {
        config_source: "service_owned_provider_helper_config",
        helper_available: true,
        helper_program: process.execPath,
        helper_args_prefix: [helperScript],
        helper_version: "node-provider-helper-test",
        timeout_ms: 5000
      };
    }
  });
  assert.equal(
    missingHostValidation.helper_execution_status,
    "blocked_provider_helper_host_validation_missing",
    "helper execution must fail closed before spawning unless it binds a service-owned host-validation artifact"
  );
  assert.equal(missingHostValidation.ok, false);
  assert.equal(missingHostValidation.provider_helper_attempted, false);
  assert.equal(resolverCalledWithoutHostValidation, false, "helper config resolver must not run before host-validation binding passes");
  assert.equal(missingHostValidation.host_validation_artifact, null);
  assert.equal(missingHostValidation.provider_helper_host_validation_binding.bound, false);
  assert.equal(JSON.stringify(missingHostValidation).includes(projectRoot), false, "missing-host result must not echo host paths");
  assert.equal(JSON.stringify(missingHostValidation).includes("helper-secret"), false, "missing-host result must not echo secrets");
  assert.equal(JSON.stringify(missingHostValidation).includes("caller-helper-command"), false, "caller command overrides must not be persisted");
  assert.equal(JSON.stringify(missingHostValidation).includes("111111"), false, "caller stdout hashes must not be accepted");

  const missingHostValidationId = runAgentAdapterOsIsolationProviderHelperExecution(projectRoot, {
    project_id: projectId,
    helper_execution_id: "ADAPTER-OSISO-HELPER-0179-MISSING-HOST-ID",
    host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0179-MISSING",
    runner_id: readyRunner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task179-test",
    requested_provider: "windows_appcontainer",
    helper_environment: {
      platform: "win32"
    }
  }, {
    provider_helper_config_resolver: () => {
      throw new Error("helper resolver must not be called when host-validation artifact is missing");
    }
  });
  assert.equal(missingHostValidationId.helper_execution_status, "blocked_provider_helper_host_validation_missing");
  assert.equal(missingHostValidationId.provider_helper_attempted, false);

  const routeMissingHost = await createComathServer().inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-helper-execution",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      helper_execution_id: "ADAPTER-OSISO-HELPER-0179-ROUTE-MISSING-HOST",
      runner_id: readyRunner.runner_id,
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: "goal3-task179-route-test",
      requested_provider: "windows_appcontainer",
      helper_environment: {
        platform: "win32",
        notes: `${projectRoot} token=route-secret`,
        helper_available: true,
        helper_exit_code: 0,
        stdout_sha256: "3".repeat(64),
        stderr_sha256: "4".repeat(64),
        command_override: "unsafe-route-helper",
        argv_override: ["--unsafe"],
        env_override: {
          TOKEN: "route-secret"
        }
      }
    }
  });
  assert.equal(routeMissingHost.status, 200, JSON.stringify(routeMissingHost.body));
  assert.equal(
    routeMissingHost.body.helper_execution.helper_execution_status,
    "blocked_provider_helper_host_validation_missing",
    "route callers cannot bypass host-validation binding with success-shaped helper payloads"
  );
  assert.equal(routeMissingHost.body.helper_execution.provider_helper_attempted, false);
  assert.equal(JSON.stringify(routeMissingHost.body).includes(projectRoot), false, "route response must not echo host paths");
  assert.equal(JSON.stringify(routeMissingHost.body).includes("route-secret"), false, "route response must not echo secrets");
  assert.equal(JSON.stringify(routeMissingHost.body).includes("unsafe-route-helper"), false, "route response must not echo caller command overrides");

  const unvalidatedHost = validateAgentAdapterOsIsolationProviderHelperHost(projectRoot, {
    project_id: projectId,
    host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0179-UNVALIDATED",
    runner_id: readyRunner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task179-test",
    requested_provider: "windows_appcontainer",
    host_environment: {
      platform: "win32"
    }
  }, {
    provider_helper_host_validator: () => ({
      validation_source: "service_owned_provider_helper_host_validator",
      helper_host_ready: false,
      helper_program: process.execPath,
      helper_binary_sha256: helperBinarySha256,
      helper_version: "node-provider-helper-test",
      supported_platforms: ["win32"],
      diagnostics: ["host not validated"]
    })
  });
  assert.equal(unvalidatedHost.ok, false);
  assert.equal(unvalidatedHost.host_validation_status, "blocked_provider_helper_host_not_validated");
  const blockedByUnvalidatedHost = runAgentAdapterOsIsolationProviderHelperExecution(projectRoot, {
    project_id: projectId,
    helper_execution_id: "ADAPTER-OSISO-HELPER-0179-UNVALIDATED-HOST",
    host_validation_id: unvalidatedHost.host_validation_id,
    runner_id: readyRunner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task179-test",
    requested_provider: "windows_appcontainer",
    helper_environment: {
      platform: "win32"
    }
  }, {
    provider_helper_config_resolver: () => {
      throw new Error("helper resolver must not be called for an unvalidated host-validation artifact");
    }
  });
  assert.equal(blockedByUnvalidatedHost.helper_execution_status, "blocked_provider_helper_host_validation_not_validated");
  assert.equal(blockedByUnvalidatedHost.host_validation_artifact.path, unvalidatedHost.host_validation_path);
  assert.equal(blockedByUnvalidatedHost.provider_helper_attempted, false);

  const readyHost = validateAgentAdapterOsIsolationProviderHelperHost(projectRoot, {
    project_id: projectId,
    host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0179-READY",
    runner_id: readyRunner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=validator-secret`,
    requested_provider: "windows_appcontainer",
    host_environment: {
      platform: "win32",
      notes: `${projectRoot} password=validator-secret`
    }
  }, {
    provider_helper_host_validator: (hostInput) => {
      assert.equal(hostInput.project_root, projectRoot);
      assert.equal(hostInput.project_id, projectId);
      assert.equal(hostInput.host_validation_id, "ADAPTER-OSISO-HELPER-HOST-0179-READY");
      assert.equal(hostInput.runner_id, readyRunner.runner_id);
      assert.equal(hostInput.runner_path, readyRunner.runner_path);
      assert.equal(hostInput.launch_id, launch.launch_id);
      assert.equal(hostInput.launch_path, launch.launch_path);
      assert.equal(hostInput.adapter_id, "codex-cli");
      assert.equal(hostInput.backend, "external");
      assert.equal(hostInput.provider, "windows_appcontainer");
      assert.equal(hostInput.runner_binary_sha256, helperBinarySha256);
      assert.equal(hostInput.platform, "win32");
      return {
        validation_source: "service_owned_provider_helper_host_validator",
        helper_host_ready: true,
        helper_program: process.execPath,
        helper_binary_sha256: helperBinarySha256,
        helper_version: "node-provider-helper-test",
        supported_platforms: ["win32"],
        diagnostics: [`${projectRoot} validator diagnostic must be scrubbed`, "helper host ready"]
      };
    }
  });
  assert.equal(readyHost.ok, true, "service-owned validated host manifest is required for helper execution");
  assert.equal(readyHost.host_validation_status, "provider_helper_host_validated");

  const boundExecution = runAgentAdapterOsIsolationProviderHelperExecution(projectRoot, {
    project_id: projectId,
    helper_execution_id: "ADAPTER-OSISO-HELPER-0179-READY",
    host_validation_id: readyHost.host_validation_id,
    runner_id: readyRunner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=helper-actor-secret`,
    requested_provider: "windows_appcontainer",
    helper_environment: {
      platform: "win32",
      notes: `${projectRoot} password=helper-secret`,
      helper_available: true,
      helper_exit_code: 0,
      stdout_sha256: "5".repeat(64),
      stderr_sha256: "6".repeat(64),
      command_override: "caller-helper-command",
      argv_override: ["--claim-ready"],
      env_override: {
        SECRET: "helper-secret"
      }
    }
  }, {
    provider_helper_config_resolver: (helperInput) => {
      assert.equal(helperInput.project_root, projectRoot);
      assert.equal(helperInput.project_id, projectId);
      assert.equal(helperInput.helper_execution_id, "ADAPTER-OSISO-HELPER-0179-READY");
      assert.equal(helperInput.runner_id, readyRunner.runner_id);
      assert.equal(helperInput.launch_id, launch.launch_id);
      assert.equal(helperInput.runner_path, readyRunner.runner_path);
      assert.equal(helperInput.adapter_id, "codex-cli");
      assert.equal(helperInput.backend, "external");
      assert.equal(helperInput.provider, "windows_appcontainer");
      assert.equal(helperInput.runner_binary_sha256, helperBinarySha256);
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
  assert.equal(boundExecution.schema_version, "comath.agent_adapter_os_isolation_provider_helper_execution.v1");
  assert.equal(boundExecution.ok, true, "helper execution may proceed only after host-validation binding passes");
  assert.equal(boundExecution.helper_execution_status, "provider_helper_execution_attempted");
  assert.equal(boundExecution.host_validation_artifact.path, readyHost.host_validation_path);
  assert.equal(boundExecution.host_validation_artifact.sha256, sha256File(join(projectRoot, readyHost.host_validation_path)));
  assert.equal(boundExecution.provider_helper_host_validation_binding.bound, true);
  assert.equal(boundExecution.provider_helper_host_validation_binding.host_validation_id, readyHost.host_validation_id);
  assert.equal(boundExecution.provider_helper_host_validation_binding.host_validation_status, "provider_helper_host_validated");
  assert.equal(boundExecution.provider_helper_host_validation_binding.hashes_match_provider_runner, true);
  assert.equal(boundExecution.provider_helper_host_validation_binding.helper_binary_sha256, helperBinarySha256);
  assert.equal(boundExecution.provider_helper_host_validation_binding.runner_binary_sha256, helperBinarySha256);
  assert.equal(boundExecution.provider_helper_host_validation_binding.validation_source, "service_owned_provider_helper_host_validator");
  assert.equal(boundExecution.provider_helper_attempted, true);
  assert.equal(boundExecution.provider_helper_execution.helper_source, "service_owned_provider_helper_config");
  assert.equal(boundExecution.provider_helper_execution.helper_binary_sha256, helperBinarySha256);
  assert.equal(boundExecution.provider_helper_execution.helper_exit_code, 0);
  assert.match(boundExecution.provider_helper_execution.stdout_sha256, /^[a-f0-9]{64}$/);
  assert.match(boundExecution.provider_helper_execution.stderr_sha256, /^[a-f0-9]{64}$/);
  assert.match(boundExecution.provider_helper_execution.transcript_sha256, /^[a-f0-9]{64}$/);
  assert.notEqual(boundExecution.provider_helper_execution.stdout_sha256, "5".repeat(64), "caller stdout hash must not be accepted");
  assert.notEqual(boundExecution.provider_helper_execution.stderr_sha256, "6".repeat(64), "caller stderr hash must not be accepted");
  assert.equal(boundExecution.provider_helper_execution.shell, false);
  assert.equal(boundExecution.provider_helper_execution.network_policy, "disabled");
  assert.equal(boundExecution.provider_helper_execution.command_override_allowed, false);
  assert.equal(boundExecution.adapter_execution_isolation.current_boundary, "process_boundary_only");
  assert.equal(boundExecution.adapter_execution_isolation.os_enforced, false, "host-bound helper exit 0 is not collected OS evidence");
  assert.equal(boundExecution.proof_authority, "none");
  assert.equal(boundExecution.can_promote_claim, false);
  assert.equal(boundExecution.can_certify_ga, false);
  assert.equal(boundExecution.blocker_certificate.blocker_code, "provider_helper_execution_attempted");
  assert.equal(existsSync(join(projectRoot, boundExecution.helper_execution_path)), true);
  assert.equal(JSON.stringify(boundExecution).includes(projectRoot), false, "bound execution result must not echo host paths");
  assert.equal(JSON.stringify(boundExecution).includes("helper-actor-secret"), false, "bound execution result must not echo actor secrets");
  assert.equal(JSON.stringify(boundExecution).includes("helper-secret"), false, "bound execution result must not echo payload secrets");
  assert.equal(JSON.stringify(boundExecution).includes("caller-helper-command"), false, "caller command overrides must not be persisted");

  const persistedBoundExecution = JSON.parse(readFileSync(join(projectRoot, boundExecution.helper_execution_path), "utf8"));
  assert.equal(persistedBoundExecution.helper_execution_status, "provider_helper_execution_attempted");
  assert.equal(persistedBoundExecution.host_validation_artifact.path, readyHost.host_validation_path);
  assert.equal(persistedBoundExecution.provider_helper_host_validation_binding.bound, true);
  assert.equal(JSON.stringify(persistedBoundExecution).includes(projectRoot), false, "persisted bound manifest must not echo host paths");

  const otherLaunch = prepareAgentAdapterOsIsolationSandboxLaunch(projectRoot, {
    project_id: projectId,
    launch_id: "ADAPTER-OSISO-LAUNCH-0179-OTHER",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task179-test",
    requested_provider: "windows_appcontainer",
    launcher_environment: {
      platform: "win32"
    }
  }, {
    launcher_probe: () => ({
      probe_source: "service_owned_launcher_preflight",
      provider_available: true,
      launcher_binary_sha256: "b".repeat(64),
      launcher_version: "appcontainer-launcher-7.1"
    })
  });
  assert.equal(otherLaunch.ok, true);

  const otherRunner = prepareAgentAdapterOsIsolationProviderRunner(projectRoot, {
    project_id: projectId,
    runner_id: "ADAPTER-OSISO-RUNNER-0179-OTHER",
    launch_id: otherLaunch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task179-test",
    requested_provider: "windows_appcontainer",
    runner_environment: {
      platform: "win32"
    }
  }, {
    provider_runner_resolver: () => ({
      resolution_source: "service_owned_provider_runner_resolver",
      runner_available: true,
      runner_binary_sha256: helperBinarySha256,
      runner_version: "node-provider-helper-test"
    })
  });
  assert.equal(otherRunner.ok, true);

  const otherHost = validateAgentAdapterOsIsolationProviderHelperHost(projectRoot, {
    project_id: projectId,
    host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0179-OTHER",
    runner_id: otherRunner.runner_id,
    launch_id: otherLaunch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task179-test",
    requested_provider: "windows_appcontainer",
    host_environment: {
      platform: "win32"
    }
  }, {
    provider_helper_host_validator: () => ({
      validation_source: "service_owned_provider_helper_host_validator",
      helper_host_ready: true,
      helper_program: process.execPath,
      helper_binary_sha256: helperBinarySha256,
      helper_version: "node-provider-helper-test",
      supported_platforms: ["win32"]
    })
  });
  assert.equal(otherHost.ok, true);

  const mismatchExecution = runAgentAdapterOsIsolationProviderHelperExecution(projectRoot, {
    project_id: projectId,
    helper_execution_id: "ADAPTER-OSISO-HELPER-0179-MISMATCHED-HOST",
    host_validation_id: otherHost.host_validation_id,
    runner_id: readyRunner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task179-test",
    requested_provider: "windows_appcontainer",
    helper_environment: {
      platform: "win32"
    }
  }, {
    provider_helper_config_resolver: () => {
      throw new Error("helper resolver must not be called for mismatched host-validation binding");
    }
  });
  assert.equal(mismatchExecution.ok, false);
  assert.equal(mismatchExecution.helper_execution_status, "blocked_provider_helper_host_validation_binding_mismatch");
  assert.equal(mismatchExecution.provider_helper_attempted, false);
  assert.equal(mismatchExecution.host_validation_artifact.path, otherHost.host_validation_path);
  assert.equal(mismatchExecution.provider_helper_host_validation_binding.bound, false);

  const collected = collectAgentAdapterOsIsolationProviderHelperExecutionEvidence(projectRoot, {
    project_id: projectId,
    collection_id: "ADAPTER-OSISO-HELPER-COLLECT-0179-READY",
    helper_execution_id: boundExecution.helper_execution_id,
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
      assert.equal(probeInput.helper_execution_id, boundExecution.helper_execution_id);
      assert.equal(probeInput.stdout_sha256, boundExecution.provider_helper_execution.stdout_sha256);
      assert.equal(probeInput.stderr_sha256, boundExecution.provider_helper_execution.stderr_sha256);
      assert.equal(probeInput.transcript_sha256, boundExecution.provider_helper_execution.transcript_sha256);
      return {
        probe_source: "service_owned_provider_helper_collection_probe",
        collection_source: "service_owned_os_probe",
        process_isolation_enforced: true,
        filesystem_scope_enforced: true,
        network_isolation_enforced: true,
        no_new_privileges: true,
        escape_prevention: true,
        adapter_process_exit_code: 0,
        stdout_sha256: boundExecution.provider_helper_execution.stdout_sha256,
        stderr_sha256: boundExecution.provider_helper_execution.stderr_sha256,
        transcript_sha256: boundExecution.provider_helper_execution.transcript_sha256,
        diagnostics: [`${projectRoot} collector diagnostic must be scrubbed`, "helper collection succeeded"]
      };
    }
  });
  assert.equal(collected.ok, true, "host-bound helper execution remains collectable through canonical Task170 evidence");
  assert.equal(collected.collection_status, "provider_helper_os_evidence_collected");
  assert.equal(collected.helper_execution_artifact.path, boundExecution.helper_execution_path);
  assert.equal(collected.probe.ok, true);
  assert.equal(collected.adapter_execution_isolation.os_enforced, true);
  assert.equal(collected.proof_authority, "none");
  assert.equal(collected.can_certify_ga, false);

  const readiness = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0179-READY-FROM-HOST-BOUND-HELPER",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task179-test",
    evidence_path: collected.probe.evidence_path
  });
  assert.equal(readiness.ok, true, "host-bound helper collection still feeds readiness only through canonical evidence");
  assert.equal(readiness.can_certify_ga, false);

  const notEvidence = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0179-HELPER-NOT-EVIDENCE",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task179-test",
    evidence_path: boundExecution.helper_execution_path
  });
  assert.equal(notEvidence.ok, false, "host-bound helper execution attempts are not readiness evidence by themselves");
  assert.equal(
    notEvidence.vetoes.some((veto) => veto.code === "adapter_os_isolation_evidence_not_service_owned_probe"),
    true,
    "readiness still requires canonical collected probe evidence, not helper execution exit status"
  );

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.os_isolation_provider_helper_executed" &&
        event.payload.helper_execution_id === "ADAPTER-OSISO-HELPER-0179-READY" &&
        event.payload.host_validation_id === readyHost.host_validation_id &&
        event.payload.host_validation_status === "provider_helper_host_validated" &&
        event.payload.ok === true &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "provider-helper execution audit event must bind the validated host artifact without becoming proof authority"
  );
  assert.equal(JSON.stringify(events).includes(projectRoot), false, "audit events must not echo host paths");
  assert.equal(JSON.stringify(events).includes("collector-secret"), false, "audit events must not echo secrets");
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task179 agent adapter OS-isolation provider helper execution host-validation binding tests passed.");
