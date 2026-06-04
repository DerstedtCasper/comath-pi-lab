import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  collectAgentAdapterOsIsolationProviderHelperExecutionEvidence,
  createComathServer,
  getComathdStatus,
  initProject,
  prepareAgentAdapterOsIsolationSandboxLaunch,
  probeAgentAdapterOsIsolationProviderHostCapability,
  reviewAgentAdapterOsIsolationReadiness
} from "../../dist/index.js";

const providerHelpers = {
  oci_container: {
    helperEnv: "COMATH_AGENT_ADAPTER_OSISO_OCI_HELPER",
    argsEnv: "COMATH_AGENT_ADAPTER_OSISO_OCI_HELPER_ARGS_JSON"
  },
  nix_sandbox: {
    helperEnv: "COMATH_AGENT_ADAPTER_OSISO_NIX_HELPER",
    argsEnv: "COMATH_AGENT_ADAPTER_OSISO_NIX_HELPER_ARGS_JSON"
  },
  firejail: {
    helperEnv: "COMATH_AGENT_ADAPTER_OSISO_FIREJAIL_HELPER",
    argsEnv: "COMATH_AGENT_ADAPTER_OSISO_FIREJAIL_HELPER_ARGS_JSON"
  },
  windows_appcontainer: {
    helperEnv: "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_HELPER",
    argsEnv: "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_HELPER_ARGS_JSON"
  },
  macos_sandbox_exec: {
    helperEnv: "COMATH_AGENT_ADAPTER_OSISO_MACOS_SANDBOX_EXEC_HELPER",
    argsEnv: "COMATH_AGENT_ADAPTER_OSISO_MACOS_SANDBOX_EXEC_HELPER_ARGS_JSON"
  }
};

const compatibleProvider = process.platform === "darwin"
  ? "macos_sandbox_exec"
  : process.platform === "win32"
    ? "windows_appcontainer"
    : "firejail";
const compatibleProviderToolName = {
  firejail: "firejail_cli",
  macos_sandbox_exec: "macos_sandbox_exec_cli",
  windows_appcontainer: "windows_checknetisolation"
}[compatibleProvider];
const compatibleProviderToolSha256 = "d".repeat(64);

const savedEnv = new Map();
for (const helper of Object.values(providerHelpers)) {
  savedEnv.set(helper.helperEnv, process.env[helper.helperEnv]);
  savedEnv.set(helper.argsEnv, process.env[helper.argsEnv]);
  delete process.env[helper.helperEnv];
  delete process.env[helper.argsEnv];
}
savedEnv.set("COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER", process.env.COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER);
savedEnv.set("COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER_ARGS_JSON", process.env.COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER_ARGS_JSON);
delete process.env.COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER;
delete process.env.COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER_ARGS_JSON;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task189-provider-helper-chain-check-debug-"));

function assertNotReadinessEvidence({ projectId, evidencePath, reviewId, message }) {
  const review = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: reviewId,
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task189-check-debug",
    evidence_path: evidencePath
  });
  assert.equal(review.ok, false, message);
  assert.equal(review.readiness_status, "blocked_missing_os_enforced_adapter_isolation");
  assert.equal(review.adapter_execution_isolation.current_boundary, "process_boundary_only");
  assert.equal(review.adapter_execution_isolation.os_enforced, false);
  assert.equal(review.proof_authority, "none");
  assert.equal(review.can_promote_claim, false);
  assert.equal(review.can_certify_ga, false);
  assert.equal(review.checks.service_owned_probe.ok, false);
  assert.equal(review.checks.collected_probe_binding.ok, false);
  assert.equal(
    review.vetoes.some((veto) => veto.code === "adapter_os_isolation_evidence_not_service_owned_probe"),
    true,
    `${reviewId} must fail because only canonical service-owned probe/evidence artifacts can feed readiness`
  );
}

async function assertRouteRejectsWrapper({ server, projectId, evidencePath, reviewId, message }) {
  const routeReview = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-review",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      review_id: reviewId,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=review-secret`,
      evidence_path: evidencePath,
      proof_authority: "lean4",
      can_certify_ga: true,
      adapter_execution_isolation: { os_enforced: true }
    }
  });
  assert.equal(routeReview.status, 200, JSON.stringify(routeReview.body));
  const review = routeReview.body.review;
  assert.equal(review.ok, false, message);
  assert.equal(review.readiness_status, "blocked_missing_os_enforced_adapter_isolation");
  assert.equal(review.adapter_execution_isolation.current_boundary, "process_boundary_only");
  assert.equal(review.adapter_execution_isolation.os_enforced, false);
  assert.equal(review.proof_authority, "none");
  assert.equal(review.can_promote_claim, false);
  assert.equal(review.can_certify_ga, false);
  assert.equal(review.checks.service_owned_probe.ok, false);
  assert.equal(review.checks.collected_probe_binding.ok, false);
  assert.equal(JSON.stringify(routeReview.body).includes(projectRoot), false, "route review response must not echo host paths");
  assert.equal(JSON.stringify(routeReview.body).includes("review-secret"), false, "route review response must not echo secrets");
}

function readRuntimeJson(relativePath) {
  return JSON.parse(readFileSync(join(projectRoot, relativePath), "utf8"));
}

function providerToolExecutionWitness(probeInput) {
  const expectation = probeInput.provider_tool_execution_witness_expectation;
  assert.match(expectation.tool_sha256, /^[a-f0-9]{64}$/);
  assert.match(expectation.profile_sha256, /^[a-f0-9]{64}$/);
  assert.match(expectation.argv_sha256, /^[a-f0-9]{64}$/);
  assert.equal(expectation.host_capability_tool_name, compatibleProviderToolName);
  assert.equal(expectation.host_capability_tool_sha256, compatibleProviderToolSha256);
  return {
    witness_source: "provider_specific_executed_tool",
    provider: probeInput.provider,
    execution_id: `${probeInput.collection_id}-TOOL`,
    collection_id: probeInput.collection_id,
    helper_execution_id: probeInput.helper_execution_id,
    runner_id: probeInput.runner_id,
    launch_id: probeInput.launch_id,
    tool_sha256: expectation.tool_sha256,
    profile_sha256: expectation.profile_sha256,
    argv_sha256: expectation.argv_sha256,
    host_capability_tool_name: expectation.host_capability_tool_name,
    host_capability_tool_sha256: expectation.host_capability_tool_sha256,
    transcript_sha256: probeInput.transcript_sha256,
    network_policy: "disabled",
    proof_authority: "none"
  };
}

function providerFamilyOsEnforcementWitness(probeInput) {
  const expectation = probeInput.provider_tool_execution_witness_expectation;
  return {
    witness_source: "provider_family_os_enforcement",
    provider: probeInput.provider,
    execution_id: `${probeInput.collection_id}-FAMILY`,
    collection_id: probeInput.collection_id,
    helper_execution_id: probeInput.helper_execution_id,
    runner_id: probeInput.runner_id,
    launch_id: probeInput.launch_id,
    host_validation_id: probeInput.host_validation_id,
    host_validation_path: probeInput.host_validation_path,
    host_validation_sha256: probeInput.host_validation_sha256,
    host_capability_probe_id: probeInput.host_capability_probe_id,
    host_capability_probe_path: probeInput.host_capability_probe_path,
    host_capability_probe_sha256: probeInput.host_capability_probe_sha256,
    host_capability_status: probeInput.host_capability_status,
    provider_host_capability_bound: true,
    provider_specific_tool_name: expectation.host_capability_tool_name,
    provider_specific_tool_sha256: expectation.host_capability_tool_sha256,
    provider_tool_sha256: expectation.tool_sha256,
    provider_tool_profile_sha256: expectation.profile_sha256,
    provider_tool_argv_sha256: expectation.argv_sha256,
    provider_family_execution_kind: expectation.provider_family_execution_kind,
    provider_family_execution_profile_sha256: expectation.provider_family_execution_profile_sha256,
    provider_family_execution_argv_sha256: expectation.provider_family_execution_argv_sha256,
    collection_source: "service_owned_os_probe",
    process_isolation_enforced: true,
    filesystem_scope_enforced: true,
    network_isolation_enforced: true,
    no_new_privileges: true,
    escape_prevention: true,
    adapter_process_exit_code: 0,
    stdout_sha256: probeInput.stdout_sha256,
    stderr_sha256: probeInput.stderr_sha256,
    transcript_sha256: probeInput.transcript_sha256,
    network_policy: "disabled",
    proof_authority: "none"
  };
}

function providerSpecificLiveProbeAttempt(probeInput) {
  const expectation = probeInput.provider_tool_execution_witness_expectation;
  return {
    attempt_source: "provider_specific_live_os_probe",
    provider: probeInput.provider,
    execution_id: `${probeInput.collection_id}-LIVE`,
    collection_id: probeInput.collection_id,
    helper_execution_id: probeInput.helper_execution_id,
    runner_id: probeInput.runner_id,
    launch_id: probeInput.launch_id,
    provider_family_execution_kind: expectation.provider_family_execution_kind,
    provider_family_execution_profile_sha256: expectation.provider_family_execution_profile_sha256,
    provider_family_execution_argv_sha256: expectation.provider_family_execution_argv_sha256,
    provider_tool_sha256: expectation.tool_sha256,
    provider_tool_profile_sha256: expectation.profile_sha256,
    provider_tool_argv_sha256: expectation.argv_sha256,
    transcript_sha256: probeInput.transcript_sha256,
    collection_source: "service_owned_os_probe",
    process_isolation_enforced: true,
    filesystem_scope_enforced: true,
    network_isolation_enforced: true,
    no_new_privileges: true,
    escape_prevention: true,
    adapter_process_exit_code: 0,
    network_policy: "disabled",
    proof_authority: "none"
  };
}

try {
  assert.equal(
    getComathdStatus().capabilities.includes("agent_adapter_os_isolation_provider_helper_chain_check_debug"),
    true,
    "Task189 service capability ledger must advertise the provider-helper chain check-debug regression without claiming GA"
  );

  const init = initProject({ name: "Goal3 Task189 Provider Helper Chain Check Debug", root_path: projectRoot });
  const projectId = init.project.project_id;
  const server = createComathServer();

  const launch = prepareAgentAdapterOsIsolationSandboxLaunch(projectRoot, {
    project_id: projectId,
    launch_id: "ADAPTER-OSISO-LAUNCH-0189-CHECK-DEBUG",
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=launch-secret`,
    requested_provider: compatibleProvider,
    launcher_environment: {
      platform: process.platform,
      notes: `${projectRoot} token=launch-secret`
    }
  }, {
    launcher_probe: () => ({
      probe_source: "service_owned_launcher_preflight",
      provider_available: true,
      launcher_binary_sha256: "a".repeat(64),
      launcher_version: `${compatibleProvider}-launcher-task189`,
      diagnostics: [`${projectRoot} launcher diagnostic must be scrubbed`, "launcher ready"]
    })
  });
  assert.equal(launch.ok, true);

  const runnerRoute = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-runner",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      runner_id: "ADAPTER-OSISO-RUNNER-0189-CHECK-DEBUG",
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=runner-secret`,
      requested_provider: compatibleProvider,
      runner_environment: {
        platform: process.platform,
        notes: `${projectRoot} token=runner-secret`,
        provider_runner_available: true,
        runner_binary_sha256: "f".repeat(64),
        command_override: "caller-owned-runner-claiming-ready"
      }
    }
  });
  assert.equal(runnerRoute.status, 200, JSON.stringify(runnerRoute.body));
  const runner = runnerRoute.body.runner;
  assert.equal(runner.ok, true);
  assert.equal(runner.provider_runner_resolution.runner_version, `${compatibleProvider}-helper-bundled-protocol-v1`);
  assert.equal(runner.adapter_execution_isolation.os_enforced, false);
  assert.equal(runner.proof_authority, "none");
  assert.equal(runner.can_certify_ga, false);

  const hostCapability = probeAgentAdapterOsIsolationProviderHostCapability(projectRoot, {
    project_id: projectId,
    host_capability_probe_id: "ADAPTER-OSISO-HOST-CAP-0189-CHECK-DEBUG",
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=host-capability-secret`,
    requested_provider: compatibleProvider,
    host_capability_environment: {
      platform: "caller-spoofed-platform",
      notes: `${projectRoot} password=host-capability-secret`
    }
  }, {
    provider_host_capability_probe: (probeInput) => {
      assert.equal(probeInput.provider, compatibleProvider);
      assert.equal(probeInput.platform, process.platform);
      return {
        probe_source: "service_owned_provider_host_capability_probe",
        provider_host_capability_available: true,
        capability_facts: ["task189 chain-check host-validation prerequisite observed"],
        required_tools: [{
          name: compatibleProviderToolName,
          present: true,
          binary_sha256: compatibleProviderToolSha256,
          version: null
        }],
        kernel_features: ["task189-provider-host-capability"],
        diagnostics: [`${projectRoot} host capability diagnostic must be scrubbed`, "host capability observed"]
      };
    }
  });
  assert.equal(hostCapability.ok, true, "Task191 requires service-owned host capability before provider-helper chain validation");

  const hostRoute = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-helper-host-validation",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0189-CHECK-DEBUG",
      host_capability_probe_id: hostCapability.host_capability_probe_id,
      runner_id: runner.runner_id,
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=host-secret`,
      requested_provider: compatibleProvider,
      host_environment: {
        platform: "caller-spoofed-platform",
        notes: `${projectRoot} token=host-secret`,
        helper_host_ready: true,
        helper_binary_sha256: "e".repeat(64),
        helper_version: "caller-owned-host-validator",
        command_override: "caller-owned-host-validator"
      }
    }
  });
  assert.equal(hostRoute.status, 200, JSON.stringify(hostRoute.body));
  const host = hostRoute.body.host_validation;
  assert.equal(host.ok, true);
  assert.equal(host.host_validation_status, "provider_helper_host_validated");
  assert.equal(host.provider_helper_host_validation.self_test_required, true);
  assert.equal(host.provider_helper_host_validation.self_test_passed, true);
  assert.equal(host.adapter_execution_isolation.os_enforced, false);
  assert.equal(host.proof_authority, "none");
  assert.equal(host.can_certify_ga, false);
  assert.equal(JSON.stringify(host).includes(projectRoot), false, "host validation response must not echo host paths");
  assert.equal(JSON.stringify(host).includes("caller-owned-host-validator"), false, "caller host metadata must not be persisted");
  assert.equal(JSON.stringify(host).includes("host-secret"), false, "host validation response must not echo secrets");
  assert.equal(existsSync(join(projectRoot, host.host_validation_path)), true);

  assertNotReadinessEvidence({
    projectId,
    evidencePath: host.host_validation_path,
    reviewId: "ADAPTER-OSISO-0189-HOST-VALIDATION-NOT-READINESS",
    message: "host-validation wrapper manifests are not adapter OS-isolation readiness evidence"
  });
  await assertRouteRejectsWrapper({
    server,
    projectId,
    evidencePath: host.host_validation_path,
    reviewId: "ADAPTER-OSISO-0189-ROUTE-HOST-VALIDATION-NOT-READINESS",
    message: "route review must reject host-validation wrapper manifests as readiness evidence"
  });

  const executionRoute = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-helper-execution",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      helper_execution_id: "ADAPTER-OSISO-HELPER-0189-CHECK-DEBUG",
      host_validation_id: host.host_validation_id,
      runner_id: runner.runner_id,
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=helper-secret`,
      requested_provider: compatibleProvider,
      helper_environment: {
        platform: process.platform,
        notes: `${projectRoot} token=helper-secret`,
        helper_exit_code: 0,
        stdout_sha256: "1".repeat(64),
        stderr_sha256: "2".repeat(64),
        command_override: "caller-owned-helper-claiming-os-enforced",
        argv_override: ["--claim-ready", "--claim-os-enforced"],
        env_override: { TOKEN: "helper-secret" }
      }
    }
  });
  assert.equal(executionRoute.status, 200, JSON.stringify(executionRoute.body));
  const execution = executionRoute.body.helper_execution;
  assert.equal(execution.ok, true);
  assert.equal(execution.helper_execution_status, "provider_helper_execution_attempted");
  assert.equal(execution.provider_helper_execution.runtime_attestation_bound, true);
  assert.equal(execution.provider_helper_execution.runtime_attestation_source, "helper_stdout_json");
  assert.notEqual(execution.provider_helper_execution.stdout_sha256, "1".repeat(64), "caller stdout hash must not be accepted");
  assert.notEqual(execution.provider_helper_execution.stderr_sha256, "2".repeat(64), "caller stderr hash must not be accepted");
  assert.equal(execution.adapter_execution_isolation.os_enforced, false);
  assert.equal(execution.proof_authority, "none");
  assert.equal(execution.can_certify_ga, false);
  assert.equal(JSON.stringify(execution).includes(projectRoot), false, "helper execution response must not echo host paths");
  assert.equal(JSON.stringify(execution).includes(process.execPath), false, "helper execution response must not expose executable paths");
  assert.equal(JSON.stringify(execution).includes("caller-owned-helper-claiming-os-enforced"), false, "caller helper command overrides must not be persisted");
  assert.equal(JSON.stringify(execution).includes("--claim-ready"), false, "caller helper argv overrides must not be persisted");
  assert.equal(JSON.stringify(execution).includes("helper-secret"), false, "helper execution response must not echo secrets");
  assert.equal(existsSync(join(projectRoot, execution.helper_execution_path)), true);

  assertNotReadinessEvidence({
    projectId,
    evidencePath: execution.helper_execution_path,
    reviewId: "ADAPTER-OSISO-0189-HELPER-EXECUTION-NOT-READINESS",
    message: "helper-execution wrapper manifests are not adapter OS-isolation readiness evidence"
  });
  await assertRouteRejectsWrapper({
    server,
    projectId,
    evidencePath: execution.helper_execution_path,
    reviewId: "ADAPTER-OSISO-0189-ROUTE-HELPER-EXECUTION-NOT-READINESS",
    message: "route review must reject helper-execution wrapper manifests as readiness evidence"
  });

  const routeCollection = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-helper-collection",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      collection_id: "ADAPTER-OSISO-HELPER-COLLECT-0189-ROUTE-SPOOF",
      helper_execution_id: execution.helper_execution_id,
      runner_id: runner.runner_id,
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=collection-route-secret`,
      requested_provider: compatibleProvider,
      collection_environment: {
        platform: process.platform,
        notes: `${projectRoot} token=collection-route-secret`,
        process_isolation_enforced: true,
        filesystem_scope_enforced: true,
        network_isolation_enforced: true,
        no_new_privileges: true,
        escape_prevention: true,
        adapter_process_exit_code: 0,
        stdout_sha256: execution.provider_helper_execution.stdout_sha256,
        stderr_sha256: execution.provider_helper_execution.stderr_sha256,
        transcript_sha256: execution.provider_helper_execution.transcript_sha256
      }
    }
  });
  assert.equal(routeCollection.status, 200, JSON.stringify(routeCollection.body));
  const publicCollection = routeCollection.body.collection;
  assert.equal(publicCollection.ok, false, "public route callers cannot self-collect provider-helper OS evidence");
  assert.equal(publicCollection.collection_status, "blocked_provider_helper_collection_incomplete_os_enforcement");
  assert.equal(publicCollection.provider_helper_collection.hashes_match_helper_execution, true);
  assert.equal(publicCollection.provider_helper_collection.os_enforcement_complete, false);
  assert.equal(publicCollection.adapter_execution_isolation.os_enforced, false);
  assert.equal(publicCollection.proof_authority, "none");
  assert.equal(publicCollection.can_certify_ga, false);
  assert.equal(JSON.stringify(publicCollection).includes(projectRoot), false, "public collection response must not echo host paths");
  assert.equal(JSON.stringify(publicCollection).includes("collection-route-secret"), false, "public collection response must not echo secrets");
  assert.equal(existsSync(join(projectRoot, publicCollection.collection_path)), true);

  assertNotReadinessEvidence({
    projectId,
    evidencePath: publicCollection.collection_path,
    reviewId: "ADAPTER-OSISO-0189-PUBLIC-COLLECTION-WRAPPER-NOT-READINESS",
    message: "public route collection wrapper manifests are not adapter OS-isolation readiness evidence"
  });
  await assertRouteRejectsWrapper({
    server,
    projectId,
    evidencePath: publicCollection.collection_path,
    reviewId: "ADAPTER-OSISO-0189-ROUTE-PUBLIC-COLLECTION-NOT-READINESS",
    message: "route review must reject public collection wrapper manifests as readiness evidence"
  });

  const collected = collectAgentAdapterOsIsolationProviderHelperExecutionEvidence(projectRoot, {
    project_id: projectId,
    collection_id: "ADAPTER-OSISO-HELPER-COLLECT-0189-CANONICAL",
    helper_execution_id: execution.helper_execution_id,
    runner_id: runner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=collector-secret`,
    requested_provider: compatibleProvider,
    collection_environment: {
      platform: process.platform,
      notes: `${projectRoot} token=collector-secret`
    }
  }, {
    provider_helper_collection_probe: (probeInput) => {
      assert.equal(probeInput.helper_execution_id, execution.helper_execution_id);
      assert.equal(probeInput.helper_execution_path, execution.helper_execution_path);
      assert.equal(probeInput.helper_exit_code, 0);
      assert.equal(probeInput.stdout_sha256, execution.provider_helper_execution.stdout_sha256);
      assert.equal(probeInput.stderr_sha256, execution.provider_helper_execution.stderr_sha256);
      assert.equal(probeInput.transcript_sha256, execution.provider_helper_execution.transcript_sha256);
      return {
        probe_source: "service_owned_provider_helper_collection_probe",
        collection_source: "service_owned_os_probe",
        process_isolation_enforced: true,
        filesystem_scope_enforced: true,
        network_isolation_enforced: true,
        no_new_privileges: true,
        escape_prevention: true,
        adapter_process_exit_code: 0,
        stdout_sha256: execution.provider_helper_execution.stdout_sha256,
        stderr_sha256: execution.provider_helper_execution.stderr_sha256,
        transcript_sha256: execution.provider_helper_execution.transcript_sha256,
        provider_tool_execution_witness: providerToolExecutionWitness(probeInput),
        provider_family_os_enforcement_witness: providerFamilyOsEnforcementWitness(probeInput),
        provider_specific_live_probe_attempt: providerSpecificLiveProbeAttempt(probeInput),
        diagnostics: [`${projectRoot} collector diagnostic must be scrubbed`, "task189 canonical collection succeeded"]
      };
    }
  });
  assert.equal(collected.ok, true, "internal service-owned collection remains the only path to canonical OS evidence");
  assert.equal(collected.collection_status, "provider_helper_os_evidence_collected");
  assert.equal(collected.provider_helper_collection.provider_tool_execution_witness_bound, true);
  assert.equal(collected.provider_helper_collection.provider_specific_tool_execution_bound, true);
  assert.equal(collected.provider_helper_collection.provider_specific_tool_name, compatibleProviderToolName);
  assert.equal(collected.provider_helper_collection.provider_specific_tool_sha256, compatibleProviderToolSha256);
  assert.equal(collected.probe.ok, true);
  assert.equal(collected.probe.evidence.collection_source, "service_owned_os_probe");
  assert.equal(collected.adapter_execution_isolation.current_boundary, "process_boundary_only");
  assert.equal(collected.adapter_execution_isolation.os_enforced, false, "collection wrapper must not itself claim OS enforcement");
  assert.equal(collected.probe.adapter_execution_isolation.os_enforced, true);
  assert.equal(collected.probe.evidence.process_isolation_enforced, true);
  assert.equal(collected.proof_authority, "none");
  assert.equal(collected.can_certify_ga, false);
  assert.equal(JSON.stringify(collected).includes(projectRoot), false, "collected manifest must not echo host paths");
  assert.equal(JSON.stringify(collected).includes("collector-secret"), false, "collected manifest must not echo secrets");
  assert.equal(existsSync(join(projectRoot, collected.collection_path)), true);
  assert.equal(existsSync(join(projectRoot, collected.probe.evidence_path)), true);

  const readiness = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0189-CANONICAL-EVIDENCE-READINESS",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task189-check-debug",
    evidence_path: collected.probe.evidence_path
  });
  assert.equal(readiness.ok, true, "readiness consumes canonical service-owned probe/evidence artifacts only");
  assert.equal(readiness.checks.service_owned_probe.ok, true);
  assert.equal(readiness.checks.collected_probe_binding.ok, true);
  assert.equal(readiness.checks.provider_tool_execution_witness.ok, true);
  assert.equal(readiness.checks.provider_specific_tool_execution.ok, true);
  assert.equal(readiness.can_certify_ga, false);

  assertNotReadinessEvidence({
    projectId,
    evidencePath: collected.collection_path,
    reviewId: "ADAPTER-OSISO-0189-COLLECTION-WRAPPER-NOT-READINESS",
    message: "even successful provider-helper collection wrapper manifests are not readiness evidence by themselves"
  });
  await assertRouteRejectsWrapper({
    server,
    projectId,
    evidencePath: collected.collection_path,
    reviewId: "ADAPTER-OSISO-0189-ROUTE-COLLECTION-WRAPPER-NOT-READINESS",
    message: "route review must reject successful collection wrapper manifests as readiness evidence"
  });

  for (const [label, relativePath] of [
    ["host validation", host.host_validation_path],
    ["helper execution", execution.helper_execution_path],
    ["public collection", publicCollection.collection_path],
    ["successful collection", collected.collection_path]
  ]) {
    const persisted = readRuntimeJson(relativePath);
    assert.equal(persisted.proof_authority, "none", `${label} wrapper must stay non-authoritative`);
    assert.equal(persisted.can_promote_claim, false, `${label} wrapper must not promote claims`);
    assert.equal(persisted.can_certify_ga, false, `${label} wrapper must not certify GA`);
    assert.equal(persisted.adapter_execution_isolation.proof_authority, "none", `${label} wrapper isolation metadata must stay non-authoritative`);
    if (persisted.provider_helper_host_validation) {
      assert.equal(persisted.provider_helper_host_validation.proof_authority, "none", `${label} host-validation metadata must stay non-authoritative`);
    }
    if (persisted.provider_helper_host_validation_binding) {
      assert.equal(persisted.provider_helper_host_validation_binding.proof_authority, "none", `${label} host-validation binding must stay non-authoritative`);
    }
    if (persisted.provider_helper_execution) {
      assert.equal(persisted.provider_helper_execution.proof_authority, "none", `${label} helper-execution metadata must stay non-authoritative`);
    }
    if (persisted.provider_helper_collection) {
      assert.equal(persisted.provider_helper_collection.proof_authority, "none", `${label} helper-collection metadata must stay non-authoritative`);
    }
    assert.equal(JSON.stringify(persisted).includes(projectRoot), false, `${label} persisted manifest must not echo host paths`);
  }
} finally {
  for (const [key, value] of savedEnv.entries()) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task189 provider-helper chain check-debug tests passed.");
