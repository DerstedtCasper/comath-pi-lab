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

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task196-remaining-provider-host-facility-"));
const originalPath = process.env.PATH;
const originalPathext = process.env.PATHEXT;

const providerCases = [
  {
    provider: "nix_sandbox",
    supportedPlatforms: ["linux", "darwin"],
    capability: "nix_sandbox_host_facility_probe",
    feature: "nix_sandbox_service_observed_host_facility_family",
    callerCapability: "caller-claims-nix-sandbox-ready",
    callerFeature: "caller-claims-nix-store-enforcement",
    fakeToolPath: `${projectRoot}/fake/bin/nix-store`,
    tools: [
      { name: "nix_cli", lookalike: "nix" },
      { name: "nix_store_cli", lookalike: "nix-store" }
    ]
  },
  {
    provider: "firejail",
    supportedPlatforms: ["linux"],
    capability: "firejail_host_facility_probe",
    feature: "firejail_service_observed_host_facility_family",
    callerCapability: "caller-claims-firejail-ready",
    callerFeature: "caller-claims-firejail-kernel-enforcement",
    fakeToolPath: `${projectRoot}/fake/bin/firejail`,
    tools: [{ name: "firejail_cli", lookalike: "firejail" }]
  },
  {
    provider: "macos_sandbox_exec",
    supportedPlatforms: ["darwin"],
    capability: "macos_sandbox_exec_host_facility_probe",
    feature: "macos_sandbox_exec_service_observed_host_facility_family",
    callerCapability: "caller-claims-macos-sandbox-exec-ready",
    callerFeature: "caller-claims-macos-seatbelt-enforcement",
    fakeToolPath: `${projectRoot}/fake/bin/sandbox-exec`,
    tools: [{ name: "macos_sandbox_exec_cli", lookalike: "sandbox-exec" }]
  }
];

try {
  assert.equal(
    getComathdStatus().capabilities.includes("agent_adapter_os_isolation_remaining_provider_host_facility_probes"),
    true,
    "Task196 capability ledger must advertise remaining provider host facility diagnostics without claiming helper readiness, OS enforcement, proof authority, or GA"
  );

  const init = initProject({
    name: "Goal3 Task196 Remaining Provider Host Facility Probes",
    root_path: projectRoot
  });
  const projectId = init.project.project_id;
  const server = createComathServer();
  const fakeBin = join(projectRoot, "fake-bin");
  mkdirSync(fakeBin, { recursive: true });
  for (const providerCase of providerCases) {
    for (const tool of providerCase.tools) {
      writeFileSync(join(fakeBin, tool.lookalike), `not an executable ${tool.lookalike} CLI\n`, { mode: 0o644 });
    }
  }
  process.env.PATH = fakeBin;
  process.env.PATHEXT = ".EXE;.CMD;.BAT;.COM";

  for (const providerCase of providerCases) {
    const isSupportedHost = providerCase.supportedPlatforms.includes(process.platform);
    const route = await server.inject({
      method: "POST",
      path: "/agent/adapter/package/os-isolation-provider-host-capability-probe",
      body: {
        project_root: projectRoot,
        project_id: projectId,
        host_capability_probe_id: `ADAPTER-OSISO-HOST-CAP-0196-${providerCase.provider.toUpperCase()}`,
        adapter_id: "codex-cli",
        backend: "external",
        actor: `${projectRoot} token=task196-route-secret`,
        requested_provider: providerCase.provider,
        host_capability_environment: {
          platform: "caller-spoofed-plan9",
          notes: `${projectRoot} Authorization: Bearer task196-route-secret`,
          provider_host_capability_available: true,
          capability_facts: [{ capability: providerCase.callerCapability, observed: true }],
          kernel_feature_facts: [{ feature: providerCase.callerFeature, observed: true }],
          tool_path: providerCase.fakeToolPath,
          nix_path: `${projectRoot}/fake/bin/nix`,
          nix_store_path: `${projectRoot}/fake/bin/nix-store`,
          firejail_path: `${projectRoot}/fake/bin/firejail`,
          sandbox_exec_path: `${projectRoot}/fake/bin/sandbox-exec`,
          proof_authority: "lean4",
          can_certify_ga: true
        }
      }
    });
    assert.equal(route.status, 200, JSON.stringify(route.body));
    const manifest = route.body.host_capability_probe;

    assert.equal(manifest.schema_version, "comath.agent_adapter_os_isolation_provider_host_capability_probe.v1");
    assert.equal(manifest.provider, providerCase.provider);
    assert.equal(
      manifest.host_capability_status,
      isSupportedHost
        ? "provider_host_capability_observed"
        : "blocked_provider_host_capability_provider_unavailable"
    );
    assert.equal(manifest.ok, isSupportedHost, `${providerCase.provider} host capability may only observe on service-supported platforms`);
    assert.equal(manifest.provider_host_capability_available, isSupportedHost);
    assert.equal(manifest.provider_host_capability.probe_source, "service_owned_provider_host_capability_probe");
    assert.equal(manifest.provider_host_capability.provider_host_capability_available, isSupportedHost);
    assert.equal(manifest.provider_host_capability.platform, process.platform);
    assert.equal(manifest.provider_host_capability.platform_supported, isSupportedHost);
    assert.equal(manifest.provider_host_capability.caller_supplied_success_allowed, false);
    assert.equal(manifest.provider_host_capability.proof_authority, "none");

    const facilityFact = manifest.provider_host_capability.capability_facts.find(
      (fact) => fact.capability === providerCase.capability
    );
    assert.ok(facilityFact, `${providerCase.provider} diagnostics must include a host facility fact`);
    assert.equal(facilityFact.observed, isSupportedHost);
    assert.match(facilityFact.evidence_sha256, /^[a-f0-9]{64}$/);
    assert.match(facilityFact.notes, /diagnostics only/i);

    for (const expectedTool of providerCase.tools) {
      const tool = manifest.provider_host_capability.required_tools.find(
        (candidate) => candidate.name === expectedTool.name
      );
      assert.ok(tool, `${providerCase.provider} diagnostics must report ${expectedTool.name} metadata`);
      assert.equal(
        tool.present,
        false,
        `non-executable ${expectedTool.lookalike} lookalikes on PATH must not count as CLI presence`
      );
      assert.equal(tool.binary_sha256, null, `non-executable ${expectedTool.lookalike} lookalikes must not be hashed`);
      assert.equal(tool.version, null, "host facility probe must not invent or execute tool versions");
    }

    const facilityFeature = manifest.provider_host_capability.kernel_features.find(
      (feature) => feature.name === providerCase.feature
    );
    assert.ok(facilityFeature, `${providerCase.provider} diagnostics must record a service-observed host facility feature`);
    assert.equal(facilityFeature.observed, isSupportedHost);
    assert.match(facilityFeature.evidence_sha256, /^[a-f0-9]{64}$/);

    assert.equal(manifest.adapter_execution_isolation.current_boundary, "process_boundary_only");
    assert.equal(manifest.adapter_execution_isolation.os_enforced, false);
    assert.equal(manifest.adapter_execution_isolation.claims_runtime_enforcement, false);
    assert.equal(manifest.proof_authority, "none");
    assert.equal(manifest.can_promote_claim, false);
    assert.equal(manifest.can_certify_ga, false);
    assert.equal(JSON.stringify(route.body).includes(projectRoot), false, "route response must not echo host paths");
    assert.equal(JSON.stringify(route.body).includes("task196-route-secret"), false, "route response must not echo secrets");
    assert.equal(JSON.stringify(route.body).includes(providerCase.callerCapability), false, "caller facts must not be accepted");
    assert.equal(JSON.stringify(route.body).includes(providerCase.callerFeature), false, "caller kernel facts must not be accepted");
    assert.equal(JSON.stringify(route.body).includes("fake/bin"), false, "caller tool paths must not be accepted");
    assert.equal(JSON.stringify(route.body).includes("fake-bin"), false, "host facility diagnostics must not expose PATH entries");
    assert.equal(JSON.stringify(route.body).includes(providerCase.fakeToolPath), false, "host facility diagnostics must not expose executable paths");
    assert.equal(existsSync(join(projectRoot, manifest.host_capability_probe_path)), true);

    const readiness = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
      project_id: projectId,
      review_id: `ADAPTER-OSISO-0196-${providerCase.provider.toUpperCase()}-NOT-READINESS`,
      adapter_id: "codex-cli",
      backend: "external",
      actor: "goal3-task196-test",
      evidence_path: manifest.host_capability_probe_path
    });
    assert.equal(readiness.ok, false, `${providerCase.provider} host facility diagnostics are not readiness evidence by themselves`);
    assert.equal(readiness.readiness_status, "blocked_missing_os_enforced_adapter_isolation");
    assert.equal(readiness.adapter_execution_isolation.os_enforced, false);
    assert.equal(readiness.proof_authority, "none");
    assert.equal(readiness.can_promote_claim, false);
    assert.equal(readiness.can_certify_ga, false);
    assert.equal(
      readiness.vetoes.some((veto) => veto.code === "adapter_os_isolation_evidence_not_service_owned_probe"),
      true,
      "readiness still requires canonical collected OS-enforcement evidence, not remaining host facility diagnostics"
    );

    const persisted = JSON.parse(readFileSync(join(projectRoot, manifest.host_capability_probe_path), "utf8"));
    assert.equal(persisted.provider_host_capability.probe_source, "service_owned_provider_host_capability_probe");
    assert.equal(
      persisted.provider_host_capability.capability_facts.some(
        (fact) => fact.capability === providerCase.capability && fact.observed === isSupportedHost
      ),
      true,
      `persisted manifest must bind ${providerCase.provider} host facility diagnostics`
    );
    assert.equal(persisted.adapter_execution_isolation.os_enforced, false);
    assert.equal(persisted.proof_authority, "none");
    assert.equal(persisted.can_certify_ga, false);
    assert.equal(JSON.stringify(persisted).includes(projectRoot), false, "persisted manifest must not echo host paths");
    assert.equal(JSON.stringify(persisted).includes("fake/bin"), false, "persisted manifest must not echo caller tool paths");
    assert.equal(JSON.stringify(persisted).includes("fake-bin"), false, "persisted manifest must not echo PATH entries");
  }

  const events = readAuditEvents(projectRoot);
  for (const providerCase of providerCases) {
    assert.equal(
      events.some(
        (event) =>
          event.event_type === "agent_adapter.os_isolation_provider_host_capability_probed" &&
          event.payload.provider === providerCase.provider &&
          event.payload.proof_authority === "none" &&
          event.payload.can_certify_ga === false
      ),
      true,
      `${providerCase.provider} host facility probe must be audit-visible and non-authoritative`
    );
  }
  assert.equal(JSON.stringify(events).includes(projectRoot), false, "audit events must not echo host paths");
  assert.equal(JSON.stringify(events).includes("task196-route-secret"), false, "audit events must not echo secrets");
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

console.log("Goal 3 Task196 remaining provider host facility probe tests passed.");
