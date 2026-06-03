import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createComathServer,
  getComathdStatus,
  initProject,
  readAuditEvents,
  reviewAgentAdapterOsIsolationReadiness
} from "../../dist/index.js";

const isOciSupportedHost = ["linux", "darwin", "win32"].includes(process.platform);
const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task195-oci-container-host-facility-"));
const originalPath = process.env.PATH;
const originalPathext = process.env.PATHEXT;

try {
  assert.equal(
    getComathdStatus().capabilities.includes("agent_adapter_os_isolation_oci_container_host_facility_probe"),
    true,
    "Task195 capability ledger must advertise OCI container host facility diagnostics without claiming helper readiness, OS enforcement, proof authority, or GA"
  );

  const init = initProject({
    name: "Goal3 Task195 OCI Container Host Facility Probe",
    root_path: projectRoot
  });
  const projectId = init.project.project_id;
  const server = createComathServer();
  const fakeBin = join(projectRoot, "fake-bin");
  mkdirSync(fakeBin, { recursive: true });
  writeFileSync(join(fakeBin, "docker"), "not an executable Docker CLI\n", { mode: 0o644 });
  writeFileSync(join(fakeBin, "podman"), "not an executable Podman CLI\n", { mode: 0o644 });
  process.env.PATH = fakeBin;
  process.env.PATHEXT = ".EXE;.CMD;.BAT;.COM";

  const route = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-host-capability-probe",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      host_capability_probe_id: "ADAPTER-OSISO-HOST-CAP-0195-OCI-CONTAINER",
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=task195-route-secret`,
      requested_provider: "oci_container",
      host_capability_environment: {
        platform: "caller-spoofed-plan9",
        notes: `${projectRoot} Authorization: Bearer task195-route-secret`,
        provider_host_capability_available: true,
        capability_facts: [{ capability: "caller-claims-oci-ready", observed: true }],
        kernel_feature_facts: [{ feature: "caller-claims-container-runtime-enforcement", observed: true }],
        tool_path: `${projectRoot}/fake/bin/docker.exe`,
        docker_path: `${projectRoot}/fake/bin/docker.exe`,
        podman_path: `${projectRoot}/fake/bin/podman.exe`,
        proof_authority: "lean4",
        can_certify_ga: true
      }
    }
  });
  assert.equal(route.status, 200, JSON.stringify(route.body));
  const manifest = route.body.host_capability_probe;

  assert.equal(manifest.schema_version, "comath.agent_adapter_os_isolation_provider_host_capability_probe.v1");
  assert.equal(manifest.provider, "oci_container");
  assert.equal(manifest.host_capability_status, isOciSupportedHost
    ? "provider_host_capability_observed"
    : "blocked_provider_host_capability_provider_unavailable");
  assert.equal(manifest.ok, isOciSupportedHost, "OCI container host capability may only observe on service-supported host platforms");
  assert.equal(manifest.provider_host_capability_available, isOciSupportedHost);
  assert.equal(manifest.provider_host_capability.probe_source, "service_owned_provider_host_capability_probe");
  assert.equal(manifest.provider_host_capability.provider_host_capability_available, isOciSupportedHost);
  assert.equal(manifest.provider_host_capability.platform, process.platform);
  assert.equal(manifest.provider_host_capability.platform_supported, isOciSupportedHost);
  assert.equal(manifest.provider_host_capability.caller_supplied_success_allowed, false);
  assert.equal(manifest.provider_host_capability.proof_authority, "none");

  const facilityFact = manifest.provider_host_capability.capability_facts.find(
    (fact) => fact.capability === "oci_container_host_facility_probe"
  );
  assert.ok(facilityFact, "default host capability probe must include an OCI container host facility fact");
  assert.equal(facilityFact.observed, isOciSupportedHost);
  assert.match(facilityFact.evidence_sha256, /^[a-f0-9]{64}$/);
  assert.match(facilityFact.notes, /diagnostics only/i);

  const dockerTool = manifest.provider_host_capability.required_tools.find(
    (tool) => tool.name === "oci_docker_cli"
  );
  const podmanTool = manifest.provider_host_capability.required_tools.find(
    (tool) => tool.name === "oci_podman_cli"
  );
  assert.ok(dockerTool, "OCI diagnostics must report Docker CLI metadata");
  assert.ok(podmanTool, "OCI diagnostics must report Podman CLI metadata");
  assert.equal(dockerTool.present, false, "extensionless or non-executable Docker lookalikes on PATH must not count as CLI presence");
  assert.equal(dockerTool.binary_sha256, null, "non-executable Docker lookalikes must not be hashed as CLI binaries");
  assert.equal(podmanTool.present, false, "extensionless or non-executable Podman lookalikes on PATH must not count as CLI presence");
  assert.equal(podmanTool.binary_sha256, null, "non-executable Podman lookalikes must not be hashed as CLI binaries");
  for (const tool of [dockerTool, podmanTool]) {
    assert.equal(typeof tool.present, "boolean");
    assert.equal(tool.version, null, "host facility probe must not invent or execute tool versions");
    if (tool.present) {
      assert.match(tool.binary_sha256, /^[a-f0-9]{64}$/);
    } else {
      assert.equal(tool.binary_sha256, null);
    }
  }

  const facilityFeature = manifest.provider_host_capability.kernel_features.find(
    (feature) => feature.name === "oci_container_service_observed_host_facility_family"
  );
  assert.ok(facilityFeature, "OCI diagnostics must record a service-observed host facility feature");
  assert.equal(facilityFeature.observed, isOciSupportedHost);
  assert.match(facilityFeature.evidence_sha256, /^[a-f0-9]{64}$/);

  assert.equal(manifest.adapter_execution_isolation.current_boundary, "process_boundary_only");
  assert.equal(manifest.adapter_execution_isolation.os_enforced, false);
  assert.equal(manifest.adapter_execution_isolation.claims_runtime_enforcement, false);
  assert.equal(manifest.proof_authority, "none");
  assert.equal(manifest.can_promote_claim, false);
  assert.equal(manifest.can_certify_ga, false);
  assert.equal(JSON.stringify(route.body).includes(projectRoot), false, "route response must not echo host paths");
  assert.equal(JSON.stringify(route.body).includes("task195-route-secret"), false, "route response must not echo secrets");
  assert.equal(JSON.stringify(route.body).includes("caller-claims-oci-ready"), false, "caller facts must not be accepted");
  assert.equal(JSON.stringify(route.body).includes("caller-claims-container-runtime-enforcement"), false, "caller kernel facts must not be accepted");
  assert.equal(JSON.stringify(route.body).includes("fake/bin"), false, "caller tool paths must not be accepted");
  assert.equal(JSON.stringify(route.body).includes("docker.exe"), false, "host facility diagnostics must expose tool identity, not executable paths");
  assert.equal(JSON.stringify(route.body).includes("podman.exe"), false, "host facility diagnostics must expose tool identity, not executable paths");
  assert.equal(existsSync(join(projectRoot, manifest.host_capability_probe_path)), true);

  const readiness = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0195-OCI-CONTAINER-NOT-READINESS",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task195-test",
    evidence_path: manifest.host_capability_probe_path
  });
  assert.equal(readiness.ok, false, "OCI container host facility diagnostics are not readiness evidence by themselves");
  assert.equal(readiness.readiness_status, "blocked_missing_os_enforced_adapter_isolation");
  assert.equal(readiness.adapter_execution_isolation.os_enforced, false);
  assert.equal(readiness.proof_authority, "none");
  assert.equal(readiness.can_promote_claim, false);
  assert.equal(readiness.can_certify_ga, false);
  assert.equal(
    readiness.vetoes.some((veto) => veto.code === "adapter_os_isolation_evidence_not_service_owned_probe"),
    true,
    "readiness still requires canonical collected OS-enforcement evidence, not OCI host facility diagnostics"
  );

  const persisted = JSON.parse(readFileSync(join(projectRoot, manifest.host_capability_probe_path), "utf8"));
  assert.equal(persisted.provider_host_capability.probe_source, "service_owned_provider_host_capability_probe");
  assert.equal(
    persisted.provider_host_capability.capability_facts.some(
      (fact) => fact.capability === "oci_container_host_facility_probe" && fact.observed === isOciSupportedHost
    ),
    true,
    "persisted manifest must bind OCI container host facility diagnostics"
  );
  assert.equal(persisted.adapter_execution_isolation.os_enforced, false);
  assert.equal(persisted.proof_authority, "none");
  assert.equal(persisted.can_certify_ga, false);
  assert.equal(JSON.stringify(persisted).includes(projectRoot), false, "persisted manifest must not echo host paths");
  assert.equal(JSON.stringify(persisted).includes("fake/bin"), false, "persisted manifest must not echo caller tool paths");

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.os_isolation_provider_host_capability_probed" &&
        event.payload.host_capability_probe_id === manifest.host_capability_probe_id &&
        event.payload.provider === "oci_container" &&
        event.payload.host_capability_status === manifest.host_capability_status &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "OCI container host facility probe must be audit-visible and non-authoritative"
  );
  assert.equal(JSON.stringify(events).includes(projectRoot), false, "audit events must not echo host paths");
  assert.equal(JSON.stringify(events).includes("task195-route-secret"), false, "audit events must not echo secrets");
} finally {
  if (originalPath === undefined) {
    delete process.env.PATH;
  } else {
    process.env.PATH = originalPath;
  }
  if (originalPathext === undefined) {
    delete process.env.PATHEXT;
  } else {
    process.env.PATHEXT = originalPathext;
  }
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task195 OCI container host facility probe tests passed.");
