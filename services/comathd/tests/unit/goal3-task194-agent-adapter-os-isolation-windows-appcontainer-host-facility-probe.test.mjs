import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createComathServer,
  getComathdStatus,
  initProject,
  readAuditEvents,
  reviewAgentAdapterOsIsolationReadiness
} from "../../dist/index.js";

const isWin32 = process.platform === "win32";
const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task194-windows-appcontainer-host-facility-"));

try {
  assert.equal(
    getComathdStatus().capabilities.includes("agent_adapter_os_isolation_windows_appcontainer_host_facility_probe"),
    true,
    "Task194 capability ledger must advertise Windows AppContainer host facility diagnostics without claiming helper readiness, OS enforcement, proof authority, or GA"
  );

  const init = initProject({
    name: "Goal3 Task194 Windows AppContainer Host Facility Probe",
    root_path: projectRoot
  });
  const projectId = init.project.project_id;
  const server = createComathServer();

  const route = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-host-capability-probe",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      host_capability_probe_id: "ADAPTER-OSISO-HOST-CAP-0194-WINDOWS-APPCONTAINER",
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=task194-route-secret`,
      requested_provider: "windows_appcontainer",
      host_capability_environment: {
        platform: "caller-spoofed-linux",
        notes: `${projectRoot} Authorization: Bearer task194-route-secret`,
        provider_host_capability_available: true,
        capability_facts: [{ capability: "caller-claims-appcontainer-ready", observed: true }],
        kernel_feature_facts: [{ feature: "caller-claims-kernel-enforcement", observed: true }],
        tool_path: `${projectRoot}\\fake\\CheckNetIsolation.exe`,
        proof_authority: "lean4",
        can_certify_ga: true
      }
    }
  });
  assert.equal(route.status, 200, JSON.stringify(route.body));
  const manifest = route.body.host_capability_probe;

  assert.equal(manifest.schema_version, "comath.agent_adapter_os_isolation_provider_host_capability_probe.v1");
  assert.equal(manifest.provider, "windows_appcontainer");
  assert.equal(manifest.host_capability_status, isWin32
    ? "provider_host_capability_observed"
    : "blocked_provider_host_capability_provider_unavailable");
  assert.equal(manifest.ok, isWin32, "Windows AppContainer host capability may only observe on the service Win32 platform");
  assert.equal(manifest.provider_host_capability_available, isWin32);
  assert.equal(manifest.provider_host_capability.probe_source, "service_owned_provider_host_capability_probe");
  assert.equal(manifest.provider_host_capability.provider_host_capability_available, isWin32);
  assert.equal(manifest.provider_host_capability.platform, process.platform);
  assert.equal(manifest.provider_host_capability.platform_supported, isWin32);
  assert.equal(manifest.provider_host_capability.caller_supplied_success_allowed, false);
  assert.equal(manifest.provider_host_capability.proof_authority, "none");

  const facilityFact = manifest.provider_host_capability.capability_facts.find(
    (fact) => fact.capability === "windows_appcontainer_host_facility_probe"
  );
  assert.ok(facilityFact, "default host capability probe must include a Windows AppContainer host facility fact");
  assert.equal(facilityFact.observed, isWin32);
  assert.match(facilityFact.evidence_sha256, /^[a-f0-9]{64}$/);
  assert.match(facilityFact.notes, /diagnostics only/i);

  const checkNetIsolationTool = manifest.provider_host_capability.required_tools.find(
    (tool) => tool.name === "windows_checknetisolation"
  );
  assert.ok(checkNetIsolationTool, "Windows AppContainer diagnostics must report CheckNetIsolation tool metadata");
  assert.equal(typeof checkNetIsolationTool.present, "boolean");
  assert.equal(checkNetIsolationTool.version, null, "host facility probe must not invent tool versions");
  if (checkNetIsolationTool.present) {
    assert.match(checkNetIsolationTool.binary_sha256, /^[a-f0-9]{64}$/);
  } else {
    assert.equal(checkNetIsolationTool.binary_sha256, null);
  }

  const facilityFeature = manifest.provider_host_capability.kernel_features.find(
    (feature) => feature.name === "windows_appcontainer_service_observed_host_facility_family"
  );
  assert.ok(facilityFeature, "Windows AppContainer diagnostics must record a service-observed host facility feature");
  assert.equal(facilityFeature.observed, isWin32);
  assert.match(facilityFeature.evidence_sha256, /^[a-f0-9]{64}$/);

  assert.equal(manifest.adapter_execution_isolation.current_boundary, "process_boundary_only");
  assert.equal(manifest.adapter_execution_isolation.os_enforced, false);
  assert.equal(manifest.adapter_execution_isolation.claims_runtime_enforcement, false);
  assert.equal(manifest.proof_authority, "none");
  assert.equal(manifest.can_promote_claim, false);
  assert.equal(manifest.can_certify_ga, false);
  assert.equal(JSON.stringify(route.body).includes(projectRoot), false, "route response must not echo host paths");
  assert.equal(JSON.stringify(route.body).includes("task194-route-secret"), false, "route response must not echo secrets");
  assert.equal(JSON.stringify(route.body).includes("caller-claims-appcontainer-ready"), false, "caller facts must not be accepted");
  assert.equal(JSON.stringify(route.body).includes("caller-claims-kernel-enforcement"), false, "caller kernel facts must not be accepted");
  assert.equal(JSON.stringify(route.body).includes("System32"), false, "host facility diagnostics must not leak Windows system paths");
  assert.equal(JSON.stringify(route.body).includes("CheckNetIsolation.exe"), false, "host facility diagnostics must expose tool identity, not executable paths");
  assert.equal(existsSync(join(projectRoot, manifest.host_capability_probe_path)), true);

  const readiness = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0194-WINDOWS-APPCONTAINER-NOT-READINESS",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task194-test",
    evidence_path: manifest.host_capability_probe_path
  });
  assert.equal(readiness.ok, false, "Windows AppContainer host facility diagnostics are not readiness evidence by themselves");
  assert.equal(readiness.readiness_status, "blocked_missing_os_enforced_adapter_isolation");
  assert.equal(readiness.adapter_execution_isolation.os_enforced, false);
  assert.equal(readiness.proof_authority, "none");
  assert.equal(readiness.can_promote_claim, false);
  assert.equal(readiness.can_certify_ga, false);
  assert.equal(
    readiness.vetoes.some((veto) => veto.code === "adapter_os_isolation_evidence_not_service_owned_probe"),
    true,
    "readiness still requires canonical collected OS-enforcement evidence, not Windows host facility diagnostics"
  );

  const persisted = JSON.parse(readFileSync(join(projectRoot, manifest.host_capability_probe_path), "utf8"));
  assert.equal(persisted.provider_host_capability.probe_source, "service_owned_provider_host_capability_probe");
  assert.equal(
    persisted.provider_host_capability.capability_facts.some(
      (fact) => fact.capability === "windows_appcontainer_host_facility_probe" && fact.observed === isWin32
    ),
    true,
    "persisted manifest must bind Windows AppContainer host facility diagnostics"
  );
  assert.equal(persisted.adapter_execution_isolation.os_enforced, false);
  assert.equal(persisted.proof_authority, "none");
  assert.equal(persisted.can_certify_ga, false);
  assert.equal(JSON.stringify(persisted).includes(projectRoot), false, "persisted manifest must not echo host paths");
  assert.equal(JSON.stringify(persisted).includes("System32"), false, "persisted manifest must not leak Windows system paths");

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.os_isolation_provider_host_capability_probed" &&
        event.payload.host_capability_probe_id === manifest.host_capability_probe_id &&
        event.payload.provider === "windows_appcontainer" &&
        event.payload.host_capability_status === manifest.host_capability_status &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "Windows AppContainer host facility probe must be audit-visible and non-authoritative"
  );
  assert.equal(JSON.stringify(events).includes(projectRoot), false, "audit events must not echo host paths");
  assert.equal(JSON.stringify(events).includes("task194-route-secret"), false, "audit events must not echo secrets");
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task194 Windows AppContainer host facility probe tests passed.");
