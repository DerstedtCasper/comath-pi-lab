import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createComathServer,
  getComathdStatus,
  initProject,
  probeAgentAdapterOsIsolationProviderHostCapability,
  readAuditEvents,
  reviewAgentAdapterOsIsolationReadiness
} from "../../dist/index.js";

const compatibleProvider = process.platform === "darwin"
  ? "macos_sandbox_exec"
  : process.platform === "win32"
    ? "windows_appcontainer"
    : "firejail";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task190-provider-host-capability-probe-"));

try {
  assert.equal(
    typeof probeAgentAdapterOsIsolationProviderHostCapability,
    "function",
    "Task190 must export a service-owned provider host capability probe contract producer"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("agent_adapter_os_isolation_provider_host_capability_probe_contract"),
    true,
    "Task190 capability ledger must advertise the provider host capability probe contract without claiming readiness or GA"
  );

  const init = initProject({ name: "Goal3 Task190 Provider Host Capability Probe", root_path: projectRoot });
  const projectId = init.project.project_id;
  const server = createComathServer();

  const routeSpoof = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-host-capability-probe",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      host_capability_probe_id: "ADAPTER-OSISO-HOST-CAP-0190-ROUTE-SPOOF",
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=route-secret`,
      requested_provider: compatibleProvider,
      host_capability_environment: {
        platform: "caller-spoofed-platform",
        notes: `${projectRoot} Authorization: Bearer route-secret`,
        provider_host_capability_available: true,
        kernel_feature_facts: [{ feature: "caller-claims-kernel-sandbox", observed: true }],
        tool_path: `${projectRoot}/fake-provider-helper`,
        proof_authority: "lean4",
        can_certify_ga: true
      }
    }
  });
  assert.equal(routeSpoof.status, 200, JSON.stringify(routeSpoof.body));
  const spoofed = routeSpoof.body.host_capability_probe;
  assert.equal(spoofed.ok, true, "route callers still cannot self-attest provider host capability; success must come from the service-owned default probe");
  assert.equal(spoofed.host_capability_status, "provider_host_capability_observed");
  assert.equal(spoofed.provider_host_capability_available, true);
  assert.equal(spoofed.provider_host_capability.probe_source, "service_owned_provider_host_capability_probe");
  assert.equal(spoofed.provider_host_capability.platform, process.platform);
  assert.equal(spoofed.provider_host_capability.platform_supported, true);
  assert.equal(spoofed.provider_host_capability.caller_supplied_success_allowed, false);
  assert.equal(
    spoofed.provider_host_capability.capability_facts.some((fact) => fact.capability === "provider_family_platform_contract"),
    true,
    "route path must record service-owned capability facts rather than caller-submitted facts"
  );
  assert.equal(spoofed.adapter_execution_isolation.current_boundary, "process_boundary_only");
  assert.equal(spoofed.adapter_execution_isolation.os_enforced, false);
  assert.equal(spoofed.proof_authority, "none");
  assert.equal(spoofed.can_promote_claim, false);
  assert.equal(spoofed.can_certify_ga, false);
  assert.equal(JSON.stringify(routeSpoof.body).includes(projectRoot), false, "route response must not echo host paths");
  assert.equal(JSON.stringify(routeSpoof.body).includes("route-secret"), false, "route response must not echo secrets");
  assert.equal(JSON.stringify(routeSpoof.body).includes("caller-claims-kernel-sandbox"), false, "caller capability facts must not be accepted");
  assert.equal(existsSync(join(projectRoot, spoofed.host_capability_probe_path)), true);

  const observed = probeAgentAdapterOsIsolationProviderHostCapability(projectRoot, {
    project_id: projectId,
    host_capability_probe_id: "ADAPTER-OSISO-HOST-CAP-0190-OBSERVED",
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=observed-secret`,
    requested_provider: compatibleProvider,
    host_capability_environment: {
      platform: process.platform,
      notes: `${projectRoot} token=observed-secret`
    }
  }, {
    provider_host_capability_probe: (probeInput) => {
      assert.equal(probeInput.project_root, projectRoot);
      assert.equal(probeInput.project_id, projectId);
      assert.equal(probeInput.host_capability_probe_id, "ADAPTER-OSISO-HOST-CAP-0190-OBSERVED");
      assert.equal(probeInput.adapter_id, "codex-cli");
      assert.equal(probeInput.backend, "external");
      assert.equal(probeInput.provider, compatibleProvider);
      assert.equal(probeInput.platform, process.platform);
      return {
        probe_source: "service_owned_provider_host_capability_probe",
        provider_host_capability_available: true,
        platform: process.platform,
        capability_facts: [
          {
            capability: "provider_family_platform_contract",
            observed: true,
            evidence_sha256: "b".repeat(64),
            notes: `${projectRoot} platform diagnostic must be scrubbed`
          },
          {
            capability: "provider_helper_binary_presence_required",
            observed: false,
            evidence_sha256: "c".repeat(64),
            notes: "production helper binary still required before host validation"
          }
        ],
        required_tools: [
          {
            name: `${compatibleProvider}-host-capability-probe`,
            present: true,
            version: "task190-contract-only",
            binary_sha256: "d".repeat(64)
          }
        ],
        kernel_features: [
          {
            name: `${compatibleProvider}-kernel-feature-contract`,
            observed: true
          }
        ],
        diagnostics: [`${projectRoot} diagnostic must be scrubbed`, "provider host capability observed"]
      };
    }
  });
  assert.equal(observed.schema_version, "comath.agent_adapter_os_isolation_provider_host_capability_probe.v1");
  assert.equal(observed.ok, true, "service-owned provider host capability probe should record observed host facts");
  assert.equal(observed.host_capability_status, "provider_host_capability_observed");
  assert.equal(observed.provider, compatibleProvider);
  assert.equal(observed.provider_host_capability_available, true);
  assert.equal(observed.provider_host_capability.probe_source, "service_owned_provider_host_capability_probe");
  assert.equal(observed.provider_host_capability.platform, process.platform);
  assert.equal(observed.provider_host_capability.platform_supported, true);
  assert.equal(observed.provider_host_capability.capability_facts.length, 2);
  assert.equal(observed.provider_host_capability.required_tools[0].present, true);
  assert.equal(observed.provider_host_capability.kernel_features[0].observed, true);
  assert.equal(observed.provider_host_capability.caller_supplied_success_allowed, false);
  assert.equal(observed.provider_host_capability.proof_authority, "none");
  assert.equal(observed.adapter_execution_isolation.current_boundary, "process_boundary_only");
  assert.equal(observed.adapter_execution_isolation.os_enforced, false, "host capability facts are not executed OS-isolation evidence");
  assert.equal(observed.proof_authority, "none");
  assert.equal(observed.can_promote_claim, false);
  assert.equal(observed.can_certify_ga, false);
  assert.equal(JSON.stringify(observed).includes(projectRoot), false, "observed host capability manifest must not echo host paths");
  assert.equal(JSON.stringify(observed).includes("observed-secret"), false, "observed host capability manifest must not echo secrets");

  const readiness = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0190-HOST-CAPABILITY-NOT-READINESS",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task190-test",
    evidence_path: observed.host_capability_probe_path
  });
  assert.equal(readiness.ok, false, "provider host capability manifests are not readiness evidence by themselves");
  assert.equal(readiness.readiness_status, "blocked_missing_os_enforced_adapter_isolation");
  assert.equal(
    readiness.vetoes.some((veto) => veto.code === "adapter_os_isolation_evidence_not_service_owned_probe"),
    true,
    "readiness still requires canonical service-owned collected probe/evidence artifacts, not host capability diagnostics"
  );
  assert.equal(readiness.adapter_execution_isolation.os_enforced, false);
  assert.equal(readiness.can_certify_ga, false);

  assert.throws(
    () =>
      probeAgentAdapterOsIsolationProviderHostCapability(projectRoot, {
        project_id: projectId,
        host_capability_probe_id: observed.host_capability_probe_id,
        adapter_id: "codex-cli",
        backend: "external",
        actor: "goal3-task190-test",
        requested_provider: compatibleProvider
      }),
    (error) => error?.code === "AGENT_ADAPTER_OS_ISOLATION_PROVIDER_HOST_CAPABILITY_PROBE_ALREADY_EXISTS",
    "provider host capability probe manifests must be append-only by id"
  );

  const persisted = JSON.parse(readFileSync(join(projectRoot, observed.host_capability_probe_path), "utf8"));
  assert.equal(persisted.host_capability_status, "provider_host_capability_observed");
  assert.equal(persisted.proof_authority, "none");
  assert.equal(persisted.can_certify_ga, false);
  assert.equal(JSON.stringify(persisted).includes(projectRoot), false, "persisted host capability manifest must not echo host paths");

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.os_isolation_provider_host_capability_probed" &&
        event.payload.host_capability_probe_id === observed.host_capability_probe_id &&
        event.payload.ok === true &&
        event.payload.provider === compatibleProvider &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "provider host capability probe must be audit-visible and non-authoritative"
  );
  assert.equal(JSON.stringify(events).includes(projectRoot), false, "audit events must not echo host paths");
  assert.equal(JSON.stringify(events).includes("observed-secret"), false, "audit events must not echo secrets");
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task190 provider host capability probe contract tests passed.");
