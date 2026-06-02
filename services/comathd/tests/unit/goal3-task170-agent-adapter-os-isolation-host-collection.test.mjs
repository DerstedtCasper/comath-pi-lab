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

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task170-adapter-osiso-host-"));

try {
  assert.equal(
    getComathdStatus().capabilities.includes("agent_adapter_os_isolation_host_probe_collection"),
    true,
    "Task170 must advertise configured-host OS-isolation probe collection without claiming GA certification"
  );

  const init = initProject({ name: "Goal3 Task170 Adapter OS Isolation Host Collection", root_path: projectRoot });
  const projectId = init.project.project_id;

  const spoofed = probeAgentAdapterOsIsolation(projectRoot, {
    project_id: projectId,
    probe_id: "ADAPTER-OSISO-PROBE-0170-SPOOFED",
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=spoof-secret`,
    requested_provider: "windows_appcontainer",
    probe_environment: {
      provider_available: true,
      platform: "win32",
      notes: `${projectRoot} Authorization: Bearer spoof-token`,
      execution_collected: {
        collection_source: "service_owned_os_probe",
        process_isolation_enforced: true,
        filesystem_scope_enforced: true,
        network_isolation_enforced: true,
        no_new_privileges: true,
        escape_prevention: true,
        adapter_process_exit_code: 0,
        stdout_sha256: "9".repeat(64),
        stderr_sha256: "8".repeat(64),
        transcript_sha256: "7".repeat(64)
      }
    }
  });
  assert.equal(spoofed.ok, false, "caller-supplied collection metadata must not become service-owned OS evidence");
  assert.equal(spoofed.probe_status, "blocked_os_isolation_probe_not_collected");
  assert.equal(spoofed.evidence.process_isolation_enforced, false);
  assert.equal(spoofed.evidence.network_isolation_enforced, false);
  assert.equal(spoofed.adapter_execution_isolation.os_enforced, false);
  assert.equal(spoofed.can_certify_ga, false);

  const spoofReview = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0170-SPOOFED-REVIEW",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task170-test",
    evidence_path: spoofed.evidence_path
  });
  assert.equal(spoofReview.ok, false, "spoofed request metadata cannot satisfy the readiness gate");
  assert.equal(spoofReview.vetoes.some((veto) => veto.code === "adapter_os_process_isolation_missing"), true);
  assert.equal(
    spoofReview.vetoes.some((veto) => veto.code === "adapter_os_isolation_collected_probe_binding_missing"),
    true,
    "spoofed request metadata must not bind to a collected service-owned probe manifest"
  );

  const collected = probeAgentAdapterOsIsolation(projectRoot, {
    project_id: projectId,
    probe_id: "ADAPTER-OSISO-PROBE-0170-COLLECTED",
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=actor-secret`,
    requested_provider: "windows_appcontainer",
    probe_environment: {
      provider_available: true,
      platform: "win32",
      notes: `${projectRoot} Authorization: Bearer probe-token`
    }
  }, {
    collector: (collectorInput) => {
      assert.equal(collectorInput.project_root, projectRoot);
      assert.equal(collectorInput.project_id, projectId);
      assert.equal(collectorInput.probe_id, "ADAPTER-OSISO-PROBE-0170-COLLECTED");
      assert.equal(collectorInput.adapter_id, "codex-cli");
      assert.equal(collectorInput.backend, "external");
      assert.equal(collectorInput.provider, "windows_appcontainer");
      assert.equal(collectorInput.provider_available, true);
      return {
        collection_source: "service_owned_os_probe",
        process_isolation_enforced: true,
        filesystem_scope_enforced: true,
        network_isolation_enforced: true,
        no_new_privileges: true,
        escape_prevention: true,
        adapter_process_exit_code: 0,
        stdout_sha256: "a".repeat(64),
        stderr_sha256: "b".repeat(64),
        transcript_sha256: "c".repeat(64)
      };
    }
  });
  assert.equal(collected.schema_version, "comath.agent_adapter_os_isolation_probe.v1");
  assert.equal(collected.ok, true, "a configured host probe with collected OS-enforcement evidence should pass collection");
  assert.equal(collected.probe_status, "os_isolation_probe_collected");
  assert.equal(collected.evidence.provider, "windows_appcontainer");
  assert.equal(collected.evidence.evidence_source, "service_owned_probe");
  assert.equal(collected.evidence.process_isolation_enforced, true);
  assert.equal(collected.evidence.filesystem_scope_enforced, true);
  assert.equal(collected.evidence.network_isolation_enforced, true);
  assert.equal(collected.evidence.no_new_privileges, true);
  assert.equal(collected.evidence.escape_prevention, true);
  assert.equal(collected.evidence.host_path_leak_free, true);
  assert.equal(collected.evidence.secret_free, true);
  assert.equal(collected.evidence.proof_authority, "none");
  assert.equal(collected.evidence.can_promote_claim, false);
  assert.equal(collected.evidence.can_certify_ga, false);
  assert.equal(collected.adapter_execution_isolation.current_boundary, "os_enforced");
  assert.equal(collected.adapter_execution_isolation.os_enforced, true);
  assert.equal(collected.adapter_execution_isolation.proof_authority, "none");
  assert.equal(collected.can_promote_claim, false);
  assert.equal(collected.can_certify_ga, false);
  assert.equal(collected.blocker_certificate, null, "collected OS-enforced evidence should not emit a blocker certificate");
  assert.equal(existsSync(join(projectRoot, collected.probe_path)), true, "collected probe manifest must be persisted");
  assert.equal(existsSync(join(projectRoot, collected.evidence_path)), true, "collected probe evidence must be persisted");
  assert.equal(JSON.stringify(collected).includes(projectRoot), false, "probe result must not echo host paths");
  assert.equal(JSON.stringify(collected).includes("actor-secret"), false, "probe result must not echo actor secrets");
  assert.equal(JSON.stringify(collected).includes("probe-token"), false, "probe result must not echo probe secrets");

  const persistedEvidence = JSON.parse(readFileSync(join(projectRoot, collected.evidence_path), "utf8"));
  assert.equal(persistedEvidence.probe_status, "os_isolation_probe_collected");
  assert.equal(persistedEvidence.provider, "windows_appcontainer");
  assert.equal(persistedEvidence.process_isolation_enforced, true);
  assert.equal(JSON.stringify(persistedEvidence).includes(projectRoot), false, "persisted evidence must not echo host paths");

  const review = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0170-READY-FROM-COLLECTED",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task170-test",
    evidence_path: collected.evidence_path
  });
  assert.equal(review.ok, true, "service-owned collected OS-isolation probe evidence must satisfy the readiness gate");
  assert.equal(review.readiness_status, "ready_for_os_isolation_release_review");
  assert.equal(review.checks.service_owned_probe.ok, true);
  assert.equal(review.checks.collected_probe_binding.ok, true);
  assert.equal(review.checks.provider_os_enforced.ok, true);
  assert.equal(review.checks.network_isolation.ok, true);
  assert.equal(review.can_certify_ga, false, "readiness review still cannot certify GA by itself");

  const incomplete = probeAgentAdapterOsIsolation(projectRoot, {
    project_id: projectId,
    probe_id: "ADAPTER-OSISO-PROBE-0170-INCOMPLETE",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task170-test",
    requested_provider: "firejail",
    probe_environment: {
      provider_available: true
    }
  }, {
    collector: () => ({
        collection_source: "service_owned_os_probe",
        process_isolation_enforced: true,
        filesystem_scope_enforced: true,
        network_isolation_enforced: false,
        no_new_privileges: true,
        escape_prevention: true,
        adapter_process_exit_code: 0,
        stdout_sha256: "d".repeat(64),
        stderr_sha256: "e".repeat(64),
        transcript_sha256: "f".repeat(64)
      })
  });
  assert.equal(incomplete.ok, false, "partial host collection must fail closed");
  assert.equal(incomplete.probe_status, "blocked_os_isolation_probe_not_collected");
  assert.equal(incomplete.evidence.network_isolation_enforced, false);
  assert.equal(incomplete.blocker_certificate.blocker_code, "blocked_os_isolation_probe_not_collected");
  assert.equal(incomplete.can_certify_ga, false);

  assert.throws(
    () =>
      probeAgentAdapterOsIsolation(projectRoot, {
        project_id: projectId,
        probe_id: "ADAPTER-OSISO-PROBE-0170-COLLECTED",
        adapter_id: "codex-cli",
        backend: "external",
        actor: "goal3-task170-test"
      }),
    (error) => error?.code === "AGENT_ADAPTER_OS_ISOLATION_PROBE_ALREADY_EXISTS",
    "configured host probe collection must remain append-only by probe id"
  );

  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-probe",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      probe_id: "ADAPTER-OSISO-PROBE-0170-ROUTE",
      adapter_id: "codex-cli",
      backend: "bundled",
      actor: "goal3-task170-route-test",
      requested_provider: "oci_container",
      probe_environment: {
        provider_available: true,
        notes: `${projectRoot} password=route-secret`,
        execution_collected: {
          collection_source: "service_owned_os_probe",
          process_isolation_enforced: true,
          filesystem_scope_enforced: true,
          network_isolation_enforced: true,
          no_new_privileges: true,
          escape_prevention: true,
          adapter_process_exit_code: 0,
          stdout_sha256: "1".repeat(64),
          stderr_sha256: "2".repeat(64),
          transcript_sha256: "3".repeat(64)
        }
      }
    }
  });
  assert.equal(routeResponse.status, 200, JSON.stringify(routeResponse.body));
  assert.equal(routeResponse.body.probe.ok, false, "route callers cannot submit collection success evidence directly");
  assert.equal(routeResponse.body.probe.probe_status, "blocked_os_isolation_probe_not_collected");
  assert.equal(routeResponse.body.probe.adapter_execution_isolation.os_enforced, false);
  assert.equal(routeResponse.body.probe.can_certify_ga, false);
  assert.equal(JSON.stringify(routeResponse.body).includes(projectRoot), false, "route response must not echo host paths");
  assert.equal(JSON.stringify(routeResponse.body).includes("route-secret"), false, "route response must not echo secrets");

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.os_isolation_probed" &&
        event.payload.probe_id === "ADAPTER-OSISO-PROBE-0170-COLLECTED" &&
        event.payload.ok === true &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "collected adapter OS-isolation probe must be audit-visible and non-authoritative"
  );
  assert.equal(JSON.stringify(events).includes(projectRoot), false, "audit events must not echo host paths");
  assert.equal(JSON.stringify(events).includes("actor-secret"), false, "audit events must not echo actor secrets");
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task170 agent adapter OS-isolation host collection tests passed.");
