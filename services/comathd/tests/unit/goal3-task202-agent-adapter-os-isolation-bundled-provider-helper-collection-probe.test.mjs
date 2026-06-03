import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createComathServer,
  getComathdStatus,
  initProject,
  prepareAgentAdapterOsIsolationSandboxLaunch,
  probeAgentAdapterOsIsolationProviderHostCapability,
  readAuditEvents,
  reviewAgentAdapterOsIsolationReadiness
} from "../../dist/index.js";

const providerHelpers = {
  oci_container: {
    helperEnv: "COMATH_AGENT_ADAPTER_OSISO_OCI_HELPER",
    argsEnv: "COMATH_AGENT_ADAPTER_OSISO_OCI_HELPER_ARGS_JSON",
    collectionEnv: "COMATH_AGENT_ADAPTER_OSISO_OCI_COLLECTION_PROBE",
    collectionArgsEnv: "COMATH_AGENT_ADAPTER_OSISO_OCI_COLLECTION_PROBE_ARGS_JSON"
  },
  nix_sandbox: {
    helperEnv: "COMATH_AGENT_ADAPTER_OSISO_NIX_HELPER",
    argsEnv: "COMATH_AGENT_ADAPTER_OSISO_NIX_HELPER_ARGS_JSON",
    collectionEnv: "COMATH_AGENT_ADAPTER_OSISO_NIX_COLLECTION_PROBE",
    collectionArgsEnv: "COMATH_AGENT_ADAPTER_OSISO_NIX_COLLECTION_PROBE_ARGS_JSON"
  },
  firejail: {
    helperEnv: "COMATH_AGENT_ADAPTER_OSISO_FIREJAIL_HELPER",
    argsEnv: "COMATH_AGENT_ADAPTER_OSISO_FIREJAIL_HELPER_ARGS_JSON",
    collectionEnv: "COMATH_AGENT_ADAPTER_OSISO_FIREJAIL_COLLECTION_PROBE",
    collectionArgsEnv: "COMATH_AGENT_ADAPTER_OSISO_FIREJAIL_COLLECTION_PROBE_ARGS_JSON"
  },
  windows_appcontainer: {
    helperEnv: "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_HELPER",
    argsEnv: "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_HELPER_ARGS_JSON",
    collectionEnv: "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_COLLECTION_PROBE",
    collectionArgsEnv: "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_COLLECTION_PROBE_ARGS_JSON"
  },
  macos_sandbox_exec: {
    helperEnv: "COMATH_AGENT_ADAPTER_OSISO_MACOS_SANDBOX_EXEC_HELPER",
    argsEnv: "COMATH_AGENT_ADAPTER_OSISO_MACOS_SANDBOX_EXEC_HELPER_ARGS_JSON",
    collectionEnv: "COMATH_AGENT_ADAPTER_OSISO_MACOS_SANDBOX_EXEC_COLLECTION_PROBE",
    collectionArgsEnv: "COMATH_AGENT_ADAPTER_OSISO_MACOS_SANDBOX_EXEC_COLLECTION_PROBE_ARGS_JSON"
  }
};

const compatibleProvider = process.platform === "darwin"
  ? "macos_sandbox_exec"
  : process.platform === "win32"
    ? "windows_appcontainer"
    : "firejail";

function readRepoFile(relativePath) {
  const here = dirname(fileURLToPath(import.meta.url));
  const repoRoot = join(here, "../../../..");
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function protectEnv(keys) {
  const saved = new Map();
  for (const key of keys) {
    saved.set(key, process.env[key]);
    delete process.env[key];
  }
  return () => {
    for (const [key, value] of saved.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };
}

const task202Capability = "agent_adapter_os_isolation_bundled_provider_helper_collection_probe_asset";
const task202TestName = "goal3-task202-agent-adapter-os-isolation-bundled-provider-helper-collection-probe.test.mjs";
const helperAssetName = "provider-helper-collection-probe.mjs";

assert.equal(
  getComathdStatus().capabilities.includes(task202Capability),
  true,
  "Task202 capability ledger must advertise the bundled provider-helper collection probe asset without claiming GA"
);

assert.equal(
  existsSync(join(dirname(fileURLToPath(import.meta.url)), "../../src/agents/helpers", helperAssetName)),
  true,
  "Task202 must ship a source-controlled bundled provider-helper collection probe asset"
);

assert.equal(
  readRepoFile("services/comathd/scripts/copy-agent-adapters.mjs").includes(helperAssetName),
  true,
  "Task202 bundled collection probe asset must be copied into dist during comathd build"
);

const smoke = readRepoFile("scripts/phase0-smoke.mjs");
const gaReleaseCriteria = readRepoFile("docs/architecture/ga-release-criteria.md");
assert.equal(smoke.includes(task202TestName), true, "phase0 smoke must discover the Task202 bundled collection probe suite");
assert.equal(gaReleaseCriteria.includes(task202TestName), true, "GA release criteria must list the Task202 bundled collection probe suite");

for (const [content, label] of [
  [readRepoFile("README.md"), "README.md"],
  [readRepoFile("AGENTS.md"), "AGENTS.md"],
  [readRepoFile("docs/architecture/adapter-contracts.md"), "docs/architecture/adapter-contracts.md"],
  [readRepoFile("docs/architecture/threat-model.md"), "docs/architecture/threat-model.md"]
]) {
  assert.equal(content.includes("Task202"), true, `${label} must record the Task202 bundled collection-probe boundary`);
  assert.match(
    content,
    /bundled provider-helper collection probe|bundled collection probe/i,
    `${label} must name bundled provider-helper collection probe coverage`
  );
  assert.doesNotMatch(
    content,
    /Task202.{0,180}(?:certif(?:y|ies) GA|proof authority|real-Pi evidence|readiness evidence by itself|complete OS-enforcement evidence)/is,
    `${label} must not overclaim Task202 as proof, GA, real-Pi, standalone readiness, or complete OS-enforcement evidence`
  );
}

assert.equal(readRepoFile("TODO.md").includes("Task184-202"), true, "TODO must roll the provider-helper deferred-chain summary through Task202");
assert.equal(readRepoFile("REVIEW.md").includes("Goal 3 Task 202"), true, "REVIEW must include Task202 verification evidence");
assert.equal(readRepoFile("goal-3/tasks.md").includes("## Task202"), true, "Goal 3 tracker must record Task202 before the next frontier");

const savedEnvKeys = [
  ...Object.values(providerHelpers).flatMap((helper) => [
    helper.helperEnv,
    helper.argsEnv,
    helper.collectionEnv,
    helper.collectionArgsEnv
  ]),
  "COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER",
  "COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER_ARGS_JSON",
  "COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER_COLLECTION_PROBE",
  "COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER_COLLECTION_PROBE_ARGS_JSON"
];
const restoreEnv = protectEnv(savedEnvKeys);
const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task202-bundled-helper-collector-"));

try {
  const init = initProject({
    name: "Goal3 Task202 Bundled Provider Helper Collection Probe",
    root_path: projectRoot
  });
  const projectId = init.project.project_id;
  const server = createComathServer();

  const launch = prepareAgentAdapterOsIsolationSandboxLaunch(projectRoot, {
    project_id: projectId,
    launch_id: "ADAPTER-OSISO-LAUNCH-0202-BUNDLED",
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=launch-secret`,
    requested_provider: compatibleProvider,
    launcher_environment: {
      platform: process.platform,
      notes: `${projectRoot} password=launch-secret`
    }
  }, {
    launcher_probe: () => ({
      probe_source: "service_owned_launcher_preflight",
      provider_available: true,
      launcher_binary_sha256: "a".repeat(64),
      launcher_version: `${compatibleProvider}-launcher-task202`,
      diagnostics: [`${projectRoot} launcher diagnostic must be scrubbed`, "launcher ready"]
    })
  });
  assert.equal(launch.ok, true);

  const runnerResponse = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-runner",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      runner_id: "ADAPTER-OSISO-RUNNER-0202-BUNDLED",
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=runner-secret`,
      requested_provider: compatibleProvider,
      runner_environment: {
        platform: process.platform,
        notes: `${projectRoot} password=runner-secret`
      }
    }
  });
  assert.equal(runnerResponse.status, 200, JSON.stringify(runnerResponse.body));
  const runner = runnerResponse.body.runner;
  assert.equal(runner.ok, true);
  assert.equal(runner.provider_runner_resolution.runner_version, `${compatibleProvider}-helper-bundled-protocol-v1`);

  const hostCapability = probeAgentAdapterOsIsolationProviderHostCapability(projectRoot, {
    project_id: projectId,
    host_capability_probe_id: "ADAPTER-OSISO-HOST-CAP-0202-BUNDLED",
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
        capability_facts: ["task202 bundled collection host prerequisite observed"],
        required_tools: [`${compatibleProvider}-task202-host-probe`],
        kernel_features: ["task202-provider-host-capability"],
        diagnostics: [`${projectRoot} host capability diagnostic must be scrubbed`, "host capability observed"]
      };
    }
  });
  assert.equal(hostCapability.ok, true);

  const hostResponse = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-helper-host-validation",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0202-BUNDLED",
      host_capability_probe_id: hostCapability.host_capability_probe_id,
      runner_id: runner.runner_id,
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=host-secret`,
      requested_provider: compatibleProvider,
      host_environment: {
        platform: "caller-spoofed-platform",
        notes: `${projectRoot} password=host-secret`,
        helper_host_ready: true,
        helper_version: "caller-owned-host-spoof"
      }
    }
  });
  assert.equal(hostResponse.status, 200, JSON.stringify(hostResponse.body));
  const host = hostResponse.body.host_validation;
  assert.equal(host.ok, true);
  assert.equal(host.host_validation_status, "provider_helper_host_validated");
  assert.equal(host.provider_helper_host_validation.self_test_passed, true);
  assert.equal(JSON.stringify(host).includes("caller-owned-host-spoof"), false, "caller host metadata must not be trusted");

  const executionResponse = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-helper-execution",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      helper_execution_id: "ADAPTER-OSISO-HELPER-0202-BUNDLED",
      host_validation_id: host.host_validation_id,
      runner_id: runner.runner_id,
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=helper-secret`,
      requested_provider: compatibleProvider,
      helper_environment: {
        platform: process.platform,
        notes: `${projectRoot} password=helper-secret`,
        helper_exit_code: 0,
        stdout_sha256: "1".repeat(64),
        stderr_sha256: "2".repeat(64),
        command_override: "caller-owned-helper"
      }
    }
  });
  assert.equal(executionResponse.status, 200, JSON.stringify(executionResponse.body));
  const helperExecution = executionResponse.body.helper_execution;
  assert.equal(helperExecution.ok, true);
  assert.equal(helperExecution.provider_helper_execution.runtime_attestation_bound, true);
  assert.notEqual(helperExecution.provider_helper_execution.stdout_sha256, "1".repeat(64));
  assert.notEqual(helperExecution.provider_helper_execution.stderr_sha256, "2".repeat(64));

  const collectionResponse = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-helper-collection",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      collection_id: "ADAPTER-OSISO-HELPER-COLLECT-0202-BUNDLED",
      helper_execution_id: helperExecution.helper_execution_id,
      runner_id: runner.runner_id,
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=collection-secret`,
      requested_provider: compatibleProvider,
      collection_environment: {
        platform: process.platform,
        notes: `${projectRoot} password=collection-secret`,
        process_isolation_enforced: true,
        filesystem_scope_enforced: true,
        network_isolation_enforced: true,
        no_new_privileges: true,
        escape_prevention: true,
        adapter_process_exit_code: 0,
        stdout_sha256: "f".repeat(64),
        stderr_sha256: "e".repeat(64),
        transcript_sha256: "d".repeat(64)
      }
    }
  });
  assert.equal(collectionResponse.status, 200, JSON.stringify(collectionResponse.body));
  const collection = collectionResponse.body.collection;
  assert.equal(collection.ok, false);
  assert.equal(collection.collection_status, "blocked_provider_helper_collection_incomplete_os_enforcement");
  assert.equal(collection.provider_helper_collection.probe_source, "service_owned_provider_helper_collection_probe");
  assert.equal(collection.provider_helper_collection.hashes_match_helper_execution, true);
  assert.equal(collection.provider_helper_collection.os_enforcement_complete, false);
  assert.deepEqual(collection.provider_helper_collection.incomplete_os_enforcement_facts, [
    "process_isolation_enforced",
    "filesystem_scope_enforced",
    "network_isolation_enforced",
    "no_new_privileges",
    "escape_prevention"
  ]);
  assert.equal(collection.provider_helper_collection.host_capability_bound, true);
  assert.equal(collection.provider_helper_collection.host_validation_id, host.host_validation_id);
  assert.equal(collection.provider_helper_collection.host_capability_probe_id, hostCapability.host_capability_probe_id);
  assert.equal(collection.provider_helper_collection.stdout_sha256, helperExecution.provider_helper_execution.stdout_sha256);
  assert.equal(collection.provider_helper_collection.stderr_sha256, helperExecution.provider_helper_execution.stderr_sha256);
  assert.equal(collection.provider_helper_collection.transcript_sha256, helperExecution.provider_helper_execution.transcript_sha256);
  assert.match(
    collection.provider_helper_collection.diagnostics.join(" "),
    /Bundled CoMath provider-helper collection probe asset/i,
    "default collection path must execute the bundled collection probe asset rather than only writing an in-process blocker"
  );
  assert.equal(collection.probe.ok, false);
  assert.equal(collection.probe.evidence.collection_source, "service_owned_os_probe");
  assert.equal(collection.probe.evidence.process_isolation_enforced, false);
  assert.equal(collection.probe.evidence.network_isolation_enforced, false);
  assert.equal(collection.adapter_execution_isolation.os_enforced, false);
  assert.equal(collection.proof_authority, "none");
  assert.equal(collection.can_promote_claim, false);
  assert.equal(collection.can_certify_ga, false);
  assert.equal(JSON.stringify(collectionResponse.body).includes(projectRoot), false, "route response must not echo host paths");
  assert.equal(JSON.stringify(collectionResponse.body).includes("collection-secret"), false, "route response must not echo secrets");
  assert.equal(existsSync(join(projectRoot, collection.collection_path)), true);
  assert.equal(existsSync(join(projectRoot, collection.probe.evidence_path)), true);

  const readiness = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0202-BUNDLED-COLLECTION-READINESS",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task202-test",
    evidence_path: collection.probe.evidence_path
  });
  assert.equal(readiness.ok, false, "bundled collection blocker evidence must not satisfy readiness");
  assert.equal(readiness.proof_authority, "none");
  assert.equal(readiness.can_certify_ga, false);

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.os_isolation_provider_helper_collected" &&
        event.payload.collection_id === "ADAPTER-OSISO-HELPER-COLLECT-0202-BUNDLED" &&
        event.payload.collection_status === "blocked_provider_helper_collection_incomplete_os_enforcement" &&
        event.payload.hashes_match_helper_execution === true &&
        event.payload.os_enforcement_complete === false &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "bundled collection blocker must be audit-visible and non-authoritative"
  );
  assert.equal(JSON.stringify(events).includes(projectRoot), false, "audit events must not echo host paths");
} finally {
  restoreEnv();
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task202 bundled provider-helper collection probe tests passed.");
