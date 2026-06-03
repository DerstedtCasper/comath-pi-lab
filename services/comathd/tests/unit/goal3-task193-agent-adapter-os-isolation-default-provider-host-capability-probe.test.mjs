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

const incompatibleProvider = process.platform === "win32" ? "firejail" : "windows_appcontainer";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task193-default-provider-host-capability-"));

try {
  assert.equal(
    getComathdStatus().capabilities.includes("agent_adapter_os_isolation_default_provider_host_capability_probe"),
    true,
    "Task193 capability ledger must advertise the default service-owned provider host capability probe without claiming readiness or GA"
  );

  const init = initProject({ name: "Goal3 Task193 Default Provider Host Capability Probe", root_path: projectRoot });
  const projectId = init.project.project_id;
  const server = createComathServer();

  const route = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-host-capability-probe",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      host_capability_probe_id: "ADAPTER-OSISO-HOST-CAP-0193-DEFAULT",
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=task193-route-secret`,
      requested_provider: compatibleProvider,
      host_capability_environment: {
        platform: "caller-spoofed-platform",
        notes: `${projectRoot} Authorization: Bearer task193-route-secret`,
        provider_host_capability_available: true,
        capability_facts: [{ capability: "caller-claims-provider-ready", observed: true }],
        kernel_feature_facts: [{ feature: "caller-claims-kernel-sandbox", observed: true }],
        tool_path: `${projectRoot}/fake-provider-helper`,
        proof_authority: "lean4",
        can_certify_ga: true
      }
    }
  });
  assert.equal(route.status, 200, JSON.stringify(route.body));
  const manifest = route.body.host_capability_probe;
  assert.equal(manifest.schema_version, "comath.agent_adapter_os_isolation_provider_host_capability_probe.v1");
  assert.equal(manifest.ok, true, "route should use the default service-owned host capability probe on a compatible platform");
  assert.equal(manifest.host_capability_status, "provider_host_capability_observed");
  assert.equal(manifest.provider, compatibleProvider);
  assert.equal(manifest.provider_host_capability_available, true);
  assert.equal(manifest.provider_host_capability.probe_source, "service_owned_provider_host_capability_probe");
  assert.equal(manifest.provider_host_capability.provider_host_capability_available, true);
  assert.equal(manifest.provider_host_capability.platform, process.platform);
  assert.equal(manifest.provider_host_capability.platform_supported, true);
  assert.equal(manifest.provider_host_capability.caller_supplied_success_allowed, false);
  assert.equal(manifest.provider_host_capability.proof_authority, "none");
  assert.equal(
    manifest.provider_host_capability.capability_facts.some((fact) => fact.capability === "provider_family_platform_contract" && fact.observed === true),
    true,
    "default probe must record a service-observed provider/platform compatibility fact"
  );
  assert.equal(
    manifest.provider_host_capability.capability_facts.some((fact) => fact.capability === "bundled_provider_helper_protocol_asset" && fact.observed === true),
    true,
    "default probe must bind the bundled provider-helper protocol asset as service-owned diagnostics"
  );
  assert.equal(
    manifest.provider_host_capability.required_tools.some((tool) => tool.name === "comath_bundled_provider_helper_protocol" && tool.present === true),
    true,
    "default probe must expose only service-owned helper protocol tool metadata"
  );
  assert.equal(
    manifest.provider_host_capability.kernel_features.some((feature) => feature.name === `${compatibleProvider}_service_observed_platform_family` && feature.observed === true),
    true,
    "default probe must record service-observed provider-family platform diagnostics"
  );
  assert.equal(manifest.adapter_execution_isolation.current_boundary, "process_boundary_only");
  assert.equal(manifest.adapter_execution_isolation.os_enforced, false);
  assert.equal(manifest.adapter_execution_isolation.claims_runtime_enforcement, false);
  assert.equal(manifest.proof_authority, "none");
  assert.equal(manifest.can_promote_claim, false);
  assert.equal(manifest.can_certify_ga, false);
  assert.equal(JSON.stringify(route.body).includes(projectRoot), false, "route response must not echo host paths");
  assert.equal(JSON.stringify(route.body).includes("task193-route-secret"), false, "route response must not echo secrets");
  assert.equal(JSON.stringify(route.body).includes("caller-claims-provider-ready"), false, "caller capability facts must not be accepted");
  assert.equal(JSON.stringify(route.body).includes("caller-claims-kernel-sandbox"), false, "caller kernel facts must not be accepted");
  assert.equal(existsSync(join(projectRoot, manifest.host_capability_probe_path)), true);

  const readiness = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0193-DEFAULT-HOST-CAPABILITY-NOT-READINESS",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task193-test",
    evidence_path: manifest.host_capability_probe_path
  });
  assert.equal(readiness.ok, false, "default host capability manifests are not readiness evidence by themselves");
  assert.equal(readiness.readiness_status, "blocked_missing_os_enforced_adapter_isolation");
  assert.equal(readiness.adapter_execution_isolation.os_enforced, false);
  assert.equal(readiness.proof_authority, "none");
  assert.equal(readiness.can_promote_claim, false);
  assert.equal(readiness.can_certify_ga, false);
  assert.equal(
    readiness.vetoes.some((veto) => veto.code === "adapter_os_isolation_evidence_not_service_owned_probe"),
    true,
    "readiness still requires canonical collected OS-enforcement evidence, not host capability diagnostics"
  );

  const incompatible = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-host-capability-probe",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      host_capability_probe_id: "ADAPTER-OSISO-HOST-CAP-0193-INCOMPATIBLE",
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=incompatible-secret`,
      requested_provider: incompatibleProvider,
      host_capability_environment: {
        platform: process.platform,
        notes: `${projectRoot} token=incompatible-secret`,
        provider_host_capability_available: true,
        proof_authority: "lean4",
        can_certify_ga: true
      }
    }
  });
  assert.equal(incompatible.status, 200, JSON.stringify(incompatible.body));
  const incompatibleManifest = incompatible.body.host_capability_probe;
  assert.equal(incompatibleManifest.ok, false, "default probe must fail closed for provider families unsupported by this platform");
  assert.equal(incompatibleManifest.host_capability_status, "blocked_provider_host_capability_provider_unavailable");
  assert.equal(incompatibleManifest.provider_host_capability.probe_source, "service_owned_provider_host_capability_probe");
  assert.equal(incompatibleManifest.provider_host_capability.platform_supported, false);
  assert.equal(incompatibleManifest.provider_host_capability.provider_host_capability_available, false);
  assert.equal(incompatibleManifest.adapter_execution_isolation.os_enforced, false);
  assert.equal(incompatibleManifest.proof_authority, "none");
  assert.equal(incompatibleManifest.can_certify_ga, false);
  assert.equal(JSON.stringify(incompatible.body).includes(projectRoot), false, "incompatible response must not echo host paths");
  assert.equal(JSON.stringify(incompatible.body).includes("incompatible-secret"), false, "incompatible response must not echo secrets");

  const persisted = JSON.parse(readFileSync(join(projectRoot, manifest.host_capability_probe_path), "utf8"));
  assert.equal(persisted.host_capability_status, "provider_host_capability_observed");
  assert.equal(persisted.provider_host_capability.probe_source, "service_owned_provider_host_capability_probe");
  assert.equal(persisted.adapter_execution_isolation.os_enforced, false);
  assert.equal(persisted.proof_authority, "none");
  assert.equal(persisted.can_certify_ga, false);
  assert.equal(JSON.stringify(persisted).includes(projectRoot), false, "persisted default host capability manifest must not echo host paths");

  assert.throws(
    () =>
      probeAgentAdapterOsIsolationProviderHostCapability(projectRoot, {
        project_id: projectId,
        host_capability_probe_id: manifest.host_capability_probe_id,
        adapter_id: "codex-cli",
        backend: "external",
        actor: "goal3-task193-test",
        requested_provider: compatibleProvider
      }),
    (error) => error?.code === "AGENT_ADAPTER_OS_ISOLATION_PROVIDER_HOST_CAPABILITY_PROBE_ALREADY_EXISTS",
    "default provider host capability probe manifests must stay append-only by id"
  );

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.os_isolation_provider_host_capability_probed" &&
        event.payload.host_capability_probe_id === manifest.host_capability_probe_id &&
        event.payload.ok === true &&
        event.payload.provider === compatibleProvider &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "default provider host capability probe must be audit-visible and non-authoritative"
  );
  assert.equal(JSON.stringify(events).includes(projectRoot), false, "audit events must not echo host paths");
  assert.equal(JSON.stringify(events).includes("task193-route-secret"), false, "audit events must not echo secrets");
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task193 default provider host capability probe tests passed.");
