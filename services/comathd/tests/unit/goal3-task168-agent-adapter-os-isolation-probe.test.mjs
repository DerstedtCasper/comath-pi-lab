import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createComathServer,
  getComathdStatus,
  initProject,
  probeAgentAdapterOsIsolation,
  readAuditEvents,
  reviewAgentAdapterOsIsolationReadiness
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task168-adapter-osiso-probe-"));

try {
  assert.equal(
    typeof probeAgentAdapterOsIsolation,
    "function",
    "Task168 must export a service-owned adapter OS-isolation probe artifact producer"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("agent_adapter_os_isolation_service_probe"),
    true,
    "Task168 service capability ledger must advertise the OS-isolation probe producer"
  );

  const init = initProject({ name: "Goal3 Task168 Adapter OS Isolation Probe", root_path: projectRoot });
  const projectId = init.project.project_id;

  const probe = probeAgentAdapterOsIsolation(projectRoot, {
    project_id: projectId,
    probe_id: "ADAPTER-OSISO-PROBE-0168-PROCESS",
    adapter_id: "codex-cli",
    backend: "bundled",
    actor: `${projectRoot} token=actor-secret`,
    requested_provider: "oci_container",
    probe_environment: {
      provider_available: false,
      platform: "win32",
      notes: `${projectRoot} Authorization: Bearer probe-token`
    }
  });
  assert.equal(probe.schema_version, "comath.agent_adapter_os_isolation_probe.v1");
  assert.equal(probe.ok, false, "unavailable provider probe must fail closed");
  assert.equal(probe.probe_status, "blocked_os_isolation_provider_unavailable");
  assert.equal(probe.evidence.schema_version, "comath.agent_adapter_os_isolation_evidence.v1");
  assert.equal(probe.evidence.kind, "agent_adapter_os_isolation_evidence");
  assert.equal(probe.evidence.adapter_id, "codex-cli");
  assert.equal(probe.evidence.backend, "bundled");
  assert.equal(probe.evidence.provider, "service_process_boundary");
  assert.equal(probe.evidence.evidence_source, "service_owned_probe");
  assert.equal(probe.evidence.process_isolation_enforced, false);
  assert.equal(probe.evidence.filesystem_scope_enforced, false);
  assert.equal(probe.evidence.network_isolation_enforced, false);
  assert.equal(probe.evidence.no_new_privileges, false);
  assert.equal(probe.evidence.escape_prevention, false);
  assert.equal(probe.evidence.host_path_leak_free, true);
  assert.equal(probe.evidence.secret_free, true);
  assert.equal(probe.evidence.proof_authority, "none");
  assert.equal(probe.evidence.can_promote_claim, false);
  assert.equal(probe.evidence.can_certify_ga, false);
  assert.equal(probe.adapter_execution_isolation.os_enforced, false);
  assert.equal(probe.adapter_execution_isolation.claims_runtime_enforcement, false);
  assert.equal(probe.can_promote_claim, false);
  assert.equal(probe.can_certify_ga, false);
  assert.equal(existsSync(join(projectRoot, probe.probe_path)), true, "probe manifest must be persisted");
  assert.equal(existsSync(join(projectRoot, probe.evidence_path)), true, "probe evidence must be persisted");
  assert.equal(JSON.stringify(probe).includes(projectRoot), false, "probe result must not echo host paths");
  assert.equal(JSON.stringify(probe).includes("actor-secret"), false, "probe result must not echo actor secrets");
  assert.equal(JSON.stringify(probe).includes("probe-token"), false, "probe result must not echo probe secrets");

  const persistedProbe = JSON.parse(readFileSync(join(projectRoot, probe.probe_path), "utf8"));
  const persistedEvidence = JSON.parse(readFileSync(join(projectRoot, probe.evidence_path), "utf8"));
  assert.equal(JSON.stringify(persistedProbe).includes(projectRoot), false, "persisted probe must not echo host paths");
  assert.equal(JSON.stringify(persistedEvidence).includes(projectRoot), false, "persisted evidence must not echo host paths");
  assert.equal(persistedEvidence.provider, "service_process_boundary");
  assert.equal(persistedEvidence.evidence_source, "service_owned_probe");

  const review = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0168-FROM-PROBE",
    adapter_id: "codex-cli",
    backend: "bundled",
    actor: "goal3-task168-test",
    evidence_path: probe.evidence_path
  });
  assert.equal(review.ok, false, "process-boundary probe evidence cannot satisfy OS-enforced release readiness");
  assert.equal(review.checks.service_owned_probe.ok, true);
  assert.equal(review.checks.adapter_binding.ok, true);
  assert.equal(review.checks.backend_binding.ok, true);
  assert.equal(review.vetoes.some((veto) => veto.code === "adapter_os_isolation_provider_not_os_enforced"), true);
  assert.equal(review.vetoes.some((veto) => veto.code === "adapter_os_process_isolation_missing"), true);

  assert.throws(
    () =>
      probeAgentAdapterOsIsolation(projectRoot, {
        project_id: projectId,
        probe_id: "ADAPTER-OSISO-PROBE-0168-PROCESS",
        adapter_id: "codex-cli",
        backend: "bundled",
        actor: "goal3-task168-test"
      }),
    (error) => error?.code === "AGENT_ADAPTER_OS_ISOLATION_PROBE_ALREADY_EXISTS",
    "adapter OS-isolation probes must be append-only by probe id"
  );

  const unsupported = probeAgentAdapterOsIsolation(projectRoot, {
    project_id: projectId,
    probe_id: "ADAPTER-OSISO-PROBE-0168-UNSUPPORTED",
    adapter_id: "codex-cli",
    backend: "codex-api",
    actor: "goal3-task168-test",
    requested_provider: "made_up_provider"
  });
  assert.equal(unsupported.ok, false);
  assert.equal(unsupported.probe_status, "blocked_os_isolation_provider_unsupported");
  assert.equal(unsupported.evidence.provider, "unknown");
  assert.equal(unsupported.evidence.evidence_source, "service_owned_probe");
  assert.equal(unsupported.evidence.can_certify_ga, false);

  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-probe",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      probe_id: "ADAPTER-OSISO-PROBE-0168-ROUTE",
      adapter_id: "codex-cli",
      backend: "bundled",
      actor: "goal3-task168-route-test",
      requested_provider: "firejail",
      probe_environment: {
        provider_available: false,
        notes: `${projectRoot} password=route-secret`
      }
    }
  });
  assert.equal(routeResponse.status, 200, JSON.stringify(routeResponse.body));
  assert.equal(routeResponse.body.probe.ok, false);
  assert.equal(routeResponse.body.probe.evidence.evidence_source, "service_owned_probe");
  assert.equal(routeResponse.body.probe.can_certify_ga, false);
  assert.equal(JSON.stringify(routeResponse.body).includes(projectRoot), false, "route response must not echo host paths");
  assert.equal(JSON.stringify(routeResponse.body).includes("route-secret"), false, "route response must not echo secrets");

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.os_isolation_probed" &&
        event.payload.probe_id === "ADAPTER-OSISO-PROBE-0168-PROCESS" &&
        event.payload.ok === false &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "adapter OS-isolation probe must be audit-visible and non-authoritative"
  );
  assert.equal(JSON.stringify(events).includes(projectRoot), false, "audit events must not echo host paths");
  assert.equal(JSON.stringify(events).includes("actor-secret"), false, "audit events must not echo actor secrets");
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task168 agent adapter OS-isolation probe tests passed.");
