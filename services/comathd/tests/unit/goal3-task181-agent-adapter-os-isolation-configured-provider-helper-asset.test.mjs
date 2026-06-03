import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createComathServer,
  getComathdStatus,
  initProject,
  prepareAgentAdapterOsIsolationSandboxLaunch,
  probeAgentAdapterOsIsolationProviderHostCapability,
  readAuditEvents,
  reviewAgentAdapterOsIsolationReadiness,
  validateAgentAdapterOsIsolationProviderHelperHost
} from "../../dist/index.js";

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
const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task181-adapter-osiso-helper-asset-"));

try {
  assert.equal(
    getComathdStatus().capabilities.includes("agent_adapter_os_isolation_configured_provider_helper_asset"),
    true,
    "Task181 service capability ledger must advertise configured provider-helper assets"
  );

  const helperScript = join(projectRoot, "task181-provider-helper.mjs");
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
      "  process.exit(0);",
      "}",
      "console.log(JSON.stringify({ provider: process.env.COMATH_OS_ISOLATION_PROVIDER, args }));"
    ].join("\n"),
    "utf8"
  );

  process.env[providerHelperEnvVar] = process.execPath;
  process.env[providerHelperArgsEnvVar] = JSON.stringify([helperScript]);
  delete process.env[fallbackHelperEnvVar];
  delete process.env[fallbackHelperArgsEnvVar];

  const helperBinarySha256 = sha256File(process.execPath);
  const init = initProject({ name: "Goal3 Task181 Adapter OS Isolation Configured Helper Asset", root_path: projectRoot });
  const projectId = init.project.project_id;

  const launch = prepareAgentAdapterOsIsolationSandboxLaunch(projectRoot, {
    project_id: projectId,
    launch_id: "ADAPTER-OSISO-LAUNCH-0181-READY",
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
        launcher_version: "appcontainer-launcher-8.0",
        diagnostics: [`${projectRoot} launcher diagnostic must be scrubbed`, "launcher ready"]
      };
    }
  });
  assert.equal(launch.ok, true, "ready sandbox-launch preflight is required before configured helper resolution");

  const routeRunner = await createComathServer().inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-runner",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      runner_id: "ADAPTER-OSISO-RUNNER-0181-ENV-READY",
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
        argv_override: ["--unsafe", "--claim-ready"],
        env_override: {
          TOKEN: "runner-route-secret"
        }
      }
    }
  });
  assert.equal(routeRunner.status, 200, JSON.stringify(routeRunner.body));
  const readyRunner = routeRunner.body.runner;
  assert.equal(
    readyRunner.runner_status,
    "ready_for_service_owned_provider_runner",
    "configured service-owned Windows AppContainer helper asset should resolve the default provider runner"
  );
  assert.equal(readyRunner.ok, true);
  assert.equal(readyRunner.provider, "windows_appcontainer");
  assert.equal(readyRunner.provider_runner_ready, true);
  assert.equal(readyRunner.provider_runner_resolution.resolution_source, "service_owned_provider_runner_resolver");
  assert.equal(readyRunner.provider_runner_resolution.runner_binary_sha256, helperBinarySha256);
  assert.match(readyRunner.provider_runner_resolution.runner_version, /windows_appcontainer/);
  assert.equal(readyRunner.provider_runner_contract.shell, false);
  assert.equal(readyRunner.provider_runner_contract.network_policy, "disabled");
  assert.equal(readyRunner.provider_runner_contract.command_override_allowed, false);
  assert.equal(readyRunner.provider_runner_contract.environment_override_allowed, false);
  assert.equal(readyRunner.provider_runner_contract.caller_supplied_success_allowed, false);
  assert.equal(readyRunner.adapter_execution_isolation.current_boundary, "process_boundary_only");
  assert.equal(readyRunner.adapter_execution_isolation.os_enforced, false);
  assert.equal(readyRunner.proof_authority, "none");
  assert.equal(readyRunner.can_promote_claim, false);
  assert.equal(readyRunner.can_certify_ga, false);
  assert.equal(existsSync(join(projectRoot, readyRunner.runner_path)), true);
  assert.equal(JSON.stringify(readyRunner).includes(projectRoot), false, "runner response must not echo host paths");
  assert.equal(JSON.stringify(readyRunner).includes(process.execPath), false, "runner response must not echo helper executable path");
  assert.equal(JSON.stringify(readyRunner).includes("runner-route-secret"), false, "runner response must not echo secrets");
  assert.equal(JSON.stringify(readyRunner).includes("caller-owned-runner"), false, "caller command override must not be persisted");
  assert.equal(JSON.stringify(readyRunner).includes("--claim-ready"), false, "caller argv override must not be persisted");

  const hostCapability = probeAgentAdapterOsIsolationProviderHostCapability(projectRoot, {
    project_id: projectId,
    host_capability_probe_id: "ADAPTER-OSISO-HOST-CAP-0181-ENV-READY",
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
      assert.equal(probeInput.provider, "windows_appcontainer");
      assert.equal(probeInput.platform, process.platform);
      return {
        probe_source: "service_owned_provider_host_capability_probe",
        provider_host_capability_available: true,
        capability_facts: ["task181 configured helper host-validation prerequisite observed"],
        required_tools: ["windows_appcontainer-task181-host-probe"],
        kernel_features: ["task181-provider-host-capability"],
        diagnostics: [`${projectRoot} host capability diagnostic must be scrubbed`, "host capability observed"]
      };
    }
  });
  assert.equal(hostCapability.ok, true, "Task191 requires service-owned host capability before configured helper host validation");

  const notRunnerEvidence = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0181-RUNNER-NOT-EVIDENCE",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task181-test",
    evidence_path: readyRunner.runner_path
  });
  assert.equal(notRunnerEvidence.ok, false, "configured provider-runner manifest is still not readiness evidence");
  assert.equal(
    notRunnerEvidence.vetoes.some((veto) => veto.code === "adapter_os_isolation_evidence_not_service_owned_probe"),
    true
  );

  const readyHost = validateAgentAdapterOsIsolationProviderHelperHost(projectRoot, {
    project_id: projectId,
    host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0181-ENV-READY",
    host_capability_probe_id: hostCapability.host_capability_probe_id,
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
  });
  assert.equal(readyHost.ok, true, "default host validator should bind the configured helper asset to the ready runner");
  assert.equal(readyHost.host_validation_status, "provider_helper_host_validated");
  assert.equal(readyHost.provider_helper_host_ready, true);
  assert.equal(readyHost.provider_helper_host_validation.validation_source, "service_owned_provider_helper_host_validator");
  assert.equal(readyHost.provider_helper_host_validation.helper_binary_sha256, helperBinarySha256);
  assert.equal(readyHost.provider_helper_host_validation.runner_binary_sha256, helperBinarySha256);
  assert.equal(readyHost.provider_helper_host_validation.hashes_match_provider_runner, true);
  assert.equal(readyHost.provider_helper_host_validation.supported_platforms.includes(process.platform), true);
  assert.equal(readyHost.provider_helper_host_validation.command_override_allowed, false);
  assert.equal(readyHost.provider_helper_host_validation.environment_override_allowed, false);
  assert.equal(readyHost.provider_helper_host_validation.caller_supplied_success_allowed, false);
  assert.equal(readyHost.adapter_execution_isolation.os_enforced, false);
  assert.equal(readyHost.proof_authority, "none");
  assert.equal(readyHost.can_promote_claim, false);
  assert.equal(readyHost.can_certify_ga, false);
  assert.equal(JSON.stringify(readyHost).includes(projectRoot), false, "host-validation response must not echo host paths");
  assert.equal(JSON.stringify(readyHost).includes(process.execPath), false, "host-validation response must not echo helper executable path");
  assert.equal(JSON.stringify(readyHost).includes("host-secret"), false, "host-validation response must not echo secrets");
  assert.equal(JSON.stringify(readyHost).includes("caller-owned-host-validator"), false, "caller command override must not be persisted");

  const notHostEvidence = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0181-HOST-NOT-EVIDENCE",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task181-test",
    evidence_path: readyHost.host_validation_path
  });
  assert.equal(notHostEvidence.ok, false, "configured helper host validation is still not readiness evidence");
  assert.equal(
    notHostEvidence.vetoes.some((veto) => veto.code === "adapter_os_isolation_evidence_not_service_owned_probe"),
    true
  );

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.os_isolation_provider_runner_prepared" &&
        event.payload.runner_id === readyRunner.runner_id &&
        event.payload.ok === true &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "provider-runner audit event must bind configured helper resolution without claiming GA"
  );
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.os_isolation_provider_helper_host_validated" &&
        event.payload.host_validation_id === readyHost.host_validation_id &&
        event.payload.provider_helper_host_ready === true &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "host-validation audit event must bind configured helper validation without claiming GA"
  );
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

console.log("Goal 3 Task181 agent adapter OS-isolation configured provider helper asset tests passed.");
