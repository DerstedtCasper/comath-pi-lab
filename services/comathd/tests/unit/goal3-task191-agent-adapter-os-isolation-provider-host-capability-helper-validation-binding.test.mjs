import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  getComathdStatus,
  initProject,
  prepareAgentAdapterOsIsolationProviderRunner,
  prepareAgentAdapterOsIsolationSandboxLaunch,
  probeAgentAdapterOsIsolationProviderHostCapability,
  readAuditEvents,
  reviewAgentAdapterOsIsolationReadiness,
  validateAgentAdapterOsIsolationProviderHelperHost
} from "../../dist/index.js";

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

const compatibleProvider = process.platform === "darwin"
  ? "macos_sandbox_exec"
  : process.platform === "win32"
    ? "windows_appcontainer"
    : "firejail";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task191-host-capability-validation-binding-"));

try {
  assert.equal(
    getComathdStatus().capabilities.includes("agent_adapter_os_isolation_provider_host_capability_helper_validation_binding"),
    true,
    "Task191 capability ledger must advertise host-capability-to-helper-validation binding without claiming readiness or GA"
  );

  const init = initProject({ name: "Goal3 Task191 Host Capability Validation Binding", root_path: projectRoot });
  const projectId = init.project.project_id;
  const helperBinarySha256 = sha256File(process.execPath);

  const launch = prepareAgentAdapterOsIsolationSandboxLaunch(projectRoot, {
    project_id: projectId,
    launch_id: "ADAPTER-OSISO-LAUNCH-0191-READY",
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=launch-secret`,
    requested_provider: compatibleProvider,
    launcher_environment: {
      platform: "caller-spoofed-platform",
      notes: `${projectRoot} launcher secret`
    }
  }, {
    launcher_probe: (probeInput) => {
      assert.equal(probeInput.provider, compatibleProvider);
      return {
        probe_source: "service_owned_launcher_preflight",
        provider_available: true,
        launcher_binary_sha256: "a".repeat(64),
        launcher_version: "task191-launcher",
        diagnostics: [`${projectRoot} launcher diagnostic must be scrubbed`, "launcher ready"]
      };
    }
  });
  assert.equal(launch.ok, true);

  const runner = prepareAgentAdapterOsIsolationProviderRunner(projectRoot, {
    project_id: projectId,
    runner_id: "ADAPTER-OSISO-RUNNER-0191-READY",
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=runner-secret`,
    requested_provider: compatibleProvider,
    runner_environment: {
      platform: "caller-spoofed-platform",
      notes: `${projectRoot} runner secret`
    }
  }, {
    provider_runner_resolver: (runnerInput) => {
      assert.equal(runnerInput.provider, compatibleProvider);
      return {
        resolution_source: "service_owned_provider_runner_resolver",
        runner_available: true,
        runner_binary_sha256: helperBinarySha256,
        runner_version: "task191-runner",
        diagnostics: [`${projectRoot} runner diagnostic must be scrubbed`, "runner resolved"]
      };
    }
  });
  assert.equal(runner.ok, true);

  let noCapabilityValidatorCalled = false;
  const noCapability = validateAgentAdapterOsIsolationProviderHelperHost(projectRoot, {
    project_id: projectId,
    host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0191-NO-CAP",
    runner_id: runner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=no-capability-secret`,
    requested_provider: compatibleProvider,
    host_environment: {
      platform: "caller-spoofed-platform",
      notes: `${projectRoot} no capability secret`,
      helper_host_ready: true,
      helper_binary_sha256: helperBinarySha256,
      proof_authority: "lean4",
      can_certify_ga: true
    }
  }, {
    provider_helper_host_validator: () => {
      noCapabilityValidatorCalled = true;
      return {
        validation_source: "service_owned_provider_helper_host_validator",
        helper_host_ready: true,
        helper_program: process.execPath,
        helper_binary_sha256: helperBinarySha256,
        helper_version: "should-not-run",
        supported_platforms: [process.platform],
        diagnostics: ["missing host capability id should block before host validation"]
      };
    }
  });
  assert.equal(noCapabilityValidatorCalled, false, "missing host_capability_probe_id must block before running the host validator");
  assert.equal(noCapability.ok, false);
  assert.equal(noCapability.host_validation_status, "blocked_provider_host_capability_probe_missing");
  assert.equal(noCapability.host_capability_probe_id, null);
  assert.equal(noCapability.provider_host_capability_binding.bound, false);
  assert.equal(noCapability.provider_helper_host_validation.validation_source, "missing");
  assert.equal(noCapability.adapter_execution_isolation.os_enforced, false);
  assert.equal(noCapability.proof_authority, "none");
  assert.equal(noCapability.can_certify_ga, false);

  let missingCapabilityValidatorCalled = false;
  const missingCapability = validateAgentAdapterOsIsolationProviderHelperHost(projectRoot, {
    project_id: projectId,
    host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0191-MISSING-CAP",
    runner_id: runner.runner_id,
    launch_id: launch.launch_id,
    host_capability_probe_id: "ADAPTER-OSISO-HOST-CAP-0191-MISSING",
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=missing-capability-secret`,
    requested_provider: compatibleProvider,
    host_environment: {
      platform: "caller-spoofed-platform",
      notes: `${projectRoot} missing capability secret`,
      helper_host_ready: true,
      helper_binary_sha256: helperBinarySha256,
      proof_authority: "lean4",
      can_certify_ga: true
    }
  }, {
    provider_helper_host_validator: () => {
      missingCapabilityValidatorCalled = true;
      return {
        validation_source: "service_owned_provider_helper_host_validator",
        helper_host_ready: true,
        helper_program: process.execPath,
        helper_binary_sha256: helperBinarySha256,
        helper_version: "should-not-run",
        supported_platforms: [process.platform],
        diagnostics: ["missing host capability should block before host validation"]
      };
    }
  });
  assert.equal(missingCapabilityValidatorCalled, false, "missing host capability binding must block before running the host validator");
  assert.equal(missingCapability.ok, false);
  assert.equal(missingCapability.host_validation_status, "blocked_provider_host_capability_probe_missing");
  assert.equal(missingCapability.provider_host_capability_binding.bound, false);
  assert.equal(missingCapability.provider_host_capability_binding.host_capability_probe_id, "ADAPTER-OSISO-HOST-CAP-0191-MISSING");
  assert.equal(missingCapability.provider_helper_host_validation.validation_source, "missing");
  assert.equal(missingCapability.adapter_execution_isolation.os_enforced, false);
  assert.equal(missingCapability.proof_authority, "none");
  assert.equal(missingCapability.can_promote_claim, false);
  assert.equal(missingCapability.can_certify_ga, false);
  assert.equal(JSON.stringify(missingCapability).includes(projectRoot), false, "missing-capability host validation must not echo host paths");
  assert.equal(JSON.stringify(missingCapability).includes("missing-capability-secret"), false, "missing-capability host validation must not echo secrets");

  const observedCapability = probeAgentAdapterOsIsolationProviderHostCapability(projectRoot, {
    project_id: projectId,
    host_capability_probe_id: "ADAPTER-OSISO-HOST-CAP-0191-OBSERVED",
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=capability-secret`,
    requested_provider: compatibleProvider,
    host_capability_environment: {
      platform: "caller-spoofed-platform",
      notes: `${projectRoot} capability secret`
    }
  }, {
    provider_host_capability_probe: (probeInput) => {
      assert.equal(probeInput.project_id, projectId);
      assert.equal(probeInput.provider, compatibleProvider);
      assert.equal(probeInput.platform, process.platform);
      return {
        probe_source: "service_owned_provider_host_capability_probe",
        provider_host_capability_available: true,
        platform: process.platform,
        capability_facts: [
          {
            capability: "task191_helper_host_validation_prerequisite",
            observed: true,
            evidence_sha256: "b".repeat(64),
            notes: `${projectRoot} capability note must be scrubbed`
          }
        ],
        required_tools: [
          {
            name: `${compatibleProvider}-task191-host-probe`,
            present: true,
            version: "task191",
            binary_sha256: "c".repeat(64)
          }
        ],
        kernel_features: [
          {
            name: `${compatibleProvider}-task191-kernel-feature`,
            observed: true,
            evidence_sha256: "d".repeat(64)
          }
        ],
        diagnostics: [`${projectRoot} capability diagnostic must be scrubbed`, "host capability observed"]
      };
    }
  });
  assert.equal(observedCapability.ok, true);
  assert.equal(observedCapability.adapter_execution_isolation.os_enforced, false);
  assert.equal(observedCapability.can_certify_ga, false);

  const readyHost = validateAgentAdapterOsIsolationProviderHelperHost(projectRoot, {
    project_id: projectId,
    host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0191-READY",
    runner_id: runner.runner_id,
    launch_id: launch.launch_id,
    host_capability_probe_id: observedCapability.host_capability_probe_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=validator-secret`,
    requested_provider: compatibleProvider,
    host_environment: {
      platform: "caller-spoofed-platform",
      notes: `${projectRoot} validator secret`
    }
  }, {
    provider_helper_host_validator: (hostInput) => {
      assert.equal(hostInput.project_root, projectRoot);
      assert.equal(hostInput.project_id, projectId);
      assert.equal(hostInput.host_validation_id, "ADAPTER-OSISO-HELPER-HOST-0191-READY");
      assert.equal(hostInput.host_capability_probe_id, observedCapability.host_capability_probe_id);
      assert.equal(hostInput.host_capability_probe_path, observedCapability.host_capability_probe_path);
      assert.match(hostInput.host_capability_probe_sha256, /^[a-f0-9]{64}$/);
      assert.equal(hostInput.host_capability_status, "provider_host_capability_observed");
      assert.equal(hostInput.provider_host_capability_available, true);
      assert.equal(hostInput.provider, compatibleProvider);
      return {
        validation_source: "service_owned_provider_helper_host_validator",
        helper_host_ready: true,
        helper_program: process.execPath,
        helper_binary_sha256: helperBinarySha256,
        helper_version: "task191-helper",
        supported_platforms: [process.platform],
        diagnostics: [`${projectRoot} validator diagnostic must be scrubbed`, "helper host ready with host capability binding"]
      };
    }
  });
  assert.equal(readyHost.ok, true);
  assert.equal(readyHost.host_validation_status, "provider_helper_host_validated");
  assert.equal(readyHost.host_capability_probe_id, observedCapability.host_capability_probe_id);
  assert.equal(readyHost.provider_host_capability_binding.bound, true);
  assert.equal(readyHost.provider_host_capability_binding.host_capability_status, "provider_host_capability_observed");
  assert.equal(readyHost.provider_host_capability_binding.probe_source, "service_owned_provider_host_capability_probe");
  assert.equal(readyHost.provider_host_capability_binding.provider_host_capability_available, true);
  assert.equal(readyHost.provider_host_capability_binding.platform, process.platform);
  assert.equal(readyHost.provider_host_capability_binding.platform_supported, true);
  assert.equal(readyHost.provider_host_capability_binding.provider, compatibleProvider);
  assert.equal(readyHost.provider_host_capability_artifact.kind, "agent_adapter_os_isolation_provider_host_capability_probe");
  assert.equal(readyHost.provider_host_capability_artifact.path, observedCapability.host_capability_probe_path);
  assert.match(readyHost.provider_host_capability_artifact.sha256, /^[a-f0-9]{64}$/);
  assert.equal(readyHost.provider_helper_host_validation.host_capability_required, true);
  assert.equal(readyHost.provider_helper_host_validation.host_capability_bound, true);
  assert.equal(readyHost.adapter_execution_isolation.current_boundary, "process_boundary_only");
  assert.equal(readyHost.adapter_execution_isolation.os_enforced, false);
  assert.equal(readyHost.proof_authority, "none");
  assert.equal(readyHost.can_promote_claim, false);
  assert.equal(readyHost.can_certify_ga, false);
  assert.equal(JSON.stringify(readyHost).includes(projectRoot), false, "host capability bound host validation must not echo host paths");
  assert.equal(JSON.stringify(readyHost).includes("validator-secret"), false, "host capability bound host validation must not echo secrets");

  const notEvidence = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0191-HOST-CAPABILITY-VALIDATION-NOT-READINESS",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task191-test",
    evidence_path: readyHost.host_validation_path
  });
  assert.equal(notEvidence.ok, false, "host capability-bound host validation is still not readiness evidence");
  assert.equal(
    notEvidence.vetoes.some((veto) => veto.code === "adapter_os_isolation_evidence_not_service_owned_probe"),
    true,
    "readiness still requires canonical service-owned collected probe/evidence artifacts"
  );
  assert.equal(notEvidence.adapter_execution_isolation.os_enforced, false);
  assert.equal(notEvidence.can_certify_ga, false);

  const persistedReady = JSON.parse(readFileSync(join(projectRoot, readyHost.host_validation_path), "utf8"));
  assert.equal(persistedReady.provider_host_capability_binding.bound, true);
  assert.equal(persistedReady.provider_helper_host_validation.host_capability_bound, true);
  assert.equal(persistedReady.adapter_execution_isolation.os_enforced, false);
  assert.equal(persistedReady.can_certify_ga, false);
  assert.equal(JSON.stringify(persistedReady).includes(projectRoot), false, "persisted bound host-validation manifest must not echo host paths");

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.os_isolation_provider_helper_host_validated" &&
        event.payload.host_validation_id === readyHost.host_validation_id &&
        event.payload.host_capability_probe_id === observedCapability.host_capability_probe_id &&
        event.payload.host_capability_bound === true &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "host capability binding must be audit-visible and non-authoritative"
  );
  assert.equal(JSON.stringify(events).includes(projectRoot), false, "audit events must not echo host paths");
  assert.equal(JSON.stringify(events).includes("capability-secret"), false, "audit events must not echo capability secrets");
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task191 host capability validation binding tests passed.");
