import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createComathServer,
  getComathdStatus,
  initProject,
  prepareAgentAdapterOsIsolationProviderRunner,
  prepareAgentAdapterOsIsolationSandboxLaunch,
  probeAgentAdapterOsIsolationProviderHostCapability,
  readAuditEvents,
  reviewAgentAdapterOsIsolationReadiness,
  runAgentAdapterOsIsolationProviderHelperExecution,
  validateAgentAdapterOsIsolationProviderHelperHost
} from "../../dist/index.js";

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function readRepoFile(relativePath) {
  const here = dirname(fileURLToPath(import.meta.url));
  const repoRoot = join(here, "../../../..");
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function createHelperScript(projectRoot) {
  const helperScript = join(projectRoot, "task201-provider-helper.mjs");
  writeFileSync(
    helperScript,
    [
      "const args = process.argv.slice(2);",
      "const valueAfter = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : null; };",
      "const payload = {",
      "  comath_provider_helper_runtime_attestation: true,",
      "  ok: true,",
      "  provider: process.env.COMATH_OS_ISOLATION_PROVIDER,",
      "  network_policy: process.env.COMATH_RUNNER_NETWORK,",
      "  proof_authority: process.env.COMATH_PROOF_AUTHORITY,",
      "  adapter: process.env.COMATH_ADAPTER_ID,",
      "  backend: process.env.COMATH_ADAPTER_BACKEND,",
      "  project_id: process.env.COMATH_PROJECT_ID,",
      "  helper_execution_id: valueAfter('--helper-execution-id'),",
      "  runner_id: process.env.COMATH_PROVIDER_RUNNER_ID,",
      "  launch_id: process.env.COMATH_SANDBOX_LAUNCH_ID",
      "};",
      "console.log(JSON.stringify(payload));",
      "console.error('task201 provider helper stderr ok');"
    ].join("\n"),
    "utf8"
  );
  return helperScript;
}

function createCollectionProbeScript(projectRoot) {
  const collectionProbeScript = join(projectRoot, "task201-collection-probe.mjs");
  writeFileSync(
    collectionProbeScript,
    [
      "const args = process.argv.slice(2);",
      "const valueAfter = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : null; };",
      "const numberAfter = (flag) => Number(valueAfter(flag));",
      "const payload = {",
      "  comath_provider_helper_collection_probe: true,",
      "  ok: true,",
      "  provider: process.env.COMATH_OS_ISOLATION_PROVIDER,",
      "  network_policy: process.env.COMATH_RUNNER_NETWORK,",
      "  proof_authority: process.env.COMATH_PROOF_AUTHORITY,",
      "  adapter: process.env.COMATH_ADAPTER_ID,",
      "  backend: process.env.COMATH_ADAPTER_BACKEND,",
      "  project_id: process.env.COMATH_PROJECT_ID,",
      "  collection_id: valueAfter('--collection-id'),",
      "  helper_execution_id: valueAfter('--helper-execution-id'),",
      "  runner_id: process.env.COMATH_PROVIDER_RUNNER_ID,",
      "  launch_id: process.env.COMATH_SANDBOX_LAUNCH_ID,",
      "  helper_exit_code: numberAfter('--helper-exit-code'),",
      "  stdout_sha256: valueAfter('--stdout-sha256'),",
      "  stderr_sha256: valueAfter('--stderr-sha256'),",
      "  transcript_sha256: valueAfter('--transcript-sha256'),",
      "  host_validation_id: valueAfter('--host-validation-id'),",
      "  host_validation_path: valueAfter('--host-validation-path'),",
      "  host_validation_sha256: valueAfter('--host-validation-sha256'),",
      "  host_capability_probe_id: valueAfter('--host-capability-probe-id'),",
      "  host_capability_probe_path: valueAfter('--host-capability-probe-path'),",
      "  host_capability_probe_sha256: valueAfter('--host-capability-probe-sha256'),",
      "  host_capability_status: valueAfter('--host-capability-status'),",
      "  provider_host_capability_bound: valueAfter('--provider-host-capability-bound') === 'true',",
      "  collection_source: 'service_owned_os_probe',",
      "  process_isolation_enforced: true,",
      "  filesystem_scope_enforced: true,",
      "  network_isolation_enforced: true,",
      "  no_new_privileges: true,",
      "  escape_prevention: true",
      "};",
      "console.log(JSON.stringify(payload));",
      "console.error('task201 collection probe stderr ok');"
    ].join("\n"),
    "utf8"
  );
  return collectionProbeScript;
}

async function postCollection(server, projectRoot, projectId, helperExecution, readyRunner, launch, collectionId) {
  return server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-provider-helper-collection",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      collection_id: collectionId,
      helper_execution_id: helperExecution.helper_execution_id,
      runner_id: readyRunner.runner_id,
      launch_id: launch.launch_id,
      adapter_id: "codex-cli",
      backend: "external",
      actor: `${projectRoot} token=task201-collection-secret`,
      requested_provider: "windows_appcontainer",
      collection_environment: {
        platform: "win32",
        notes: `${projectRoot} password=task201-collection-secret`,
        process_isolation_enforced: true,
        filesystem_scope_enforced: true,
        network_isolation_enforced: true,
        no_new_privileges: true,
        escape_prevention: true,
        adapter_process_exit_code: 0,
        stdout_sha256: helperExecution.provider_helper_execution.stdout_sha256,
        stderr_sha256: helperExecution.provider_helper_execution.stderr_sha256,
        transcript_sha256: helperExecution.provider_helper_execution.transcript_sha256
      }
    }
  });
}

const task201Capability = "agent_adapter_os_isolation_provider_helper_release_chain_check_debug";
const task201TestName = "goal3-task201-agent-adapter-os-isolation-provider-helper-release-chain-check-debug.test.mjs";

assert.equal(
  getComathdStatus().capabilities.includes(task201Capability),
  true,
  "Task201 capability ledger must advertise the provider-helper release chain check-debug guard without claiming GA"
);

const smoke = readRepoFile("scripts/phase0-smoke.mjs");
const gaReleaseCriteria = readRepoFile("docs/architecture/ga-release-criteria.md");
const readme = readRepoFile("README.md");
const agents = readRepoFile("AGENTS.md");
const todo = readRepoFile("TODO.md");
const review = readRepoFile("REVIEW.md");
const adapterContracts = readRepoFile("docs/architecture/adapter-contracts.md");
const threatModel = readRepoFile("docs/architecture/threat-model.md");
const goal3Tasks = readRepoFile("goal-3/tasks.md");

for (const testName of [
  "goal3-task190-agent-adapter-os-isolation-provider-host-capability-probe-contract.test.mjs",
  "goal3-task191-agent-adapter-os-isolation-provider-host-capability-helper-validation-binding.test.mjs",
  "goal3-task192-pi-provider-helper-host-capability-consumer.test.mjs",
  "goal3-task193-agent-adapter-os-isolation-default-provider-host-capability-probe.test.mjs",
  "goal3-task194-agent-adapter-os-isolation-windows-appcontainer-host-facility-probe.test.mjs",
  "goal3-task195-agent-adapter-os-isolation-oci-container-host-facility-probe.test.mjs",
  "goal3-task196-agent-adapter-os-isolation-remaining-provider-host-facility-probes.test.mjs",
  "goal3-task197-agent-adapter-os-isolation-provider-helper-collection-complete-enforcement-gate.test.mjs",
  "goal3-task198-agent-adapter-os-isolation-provider-helper-default-collection-probe.test.mjs",
  "goal3-task199-agent-adapter-os-isolation-configured-provider-helper-collection-probe.test.mjs",
  "goal3-task200-agent-adapter-os-isolation-configured-collection-host-capability-binding.test.mjs",
  task201TestName
]) {
  assert.equal(smoke.includes(testName), true, `phase0 smoke must discover release-chain suite ${testName}`);
  assert.equal(gaReleaseCriteria.includes(testName), true, `GA release criteria must list release-chain suite ${testName}`);
}

for (const [content, label] of [
  [readme, "README.md"],
  [agents, "AGENTS.md"],
  [adapterContracts, "docs/architecture/adapter-contracts.md"],
  [threatModel, "docs/architecture/threat-model.md"]
]) {
  assert.equal(content.includes("Task201"), true, `${label} must record the Task201 check-debug boundary`);
  assert.match(
    content,
    /stale host-validation|host-capability binding mismatch|helper release chain/i,
    `${label} must name stale host-validation or host-capability binding mismatch coverage`
  );
  assert.doesNotMatch(
    content,
    /Task201.{0,160}(?:certif(?:y|ies) GA|proof authority|real-Pi evidence|readiness evidence by itself)/is,
    `${label} must not overclaim Task201 as proof, GA, real-Pi, or standalone readiness evidence`
  );
}

assert.match(todo, /Task184-20(?:1|[2-9])/, "TODO must roll the provider-helper deferred-chain summary at least through Task201");
assert.equal(review.includes("Goal 3 Task 201"), true, "REVIEW must include Task201 verification evidence");
assert.equal(goal3Tasks.includes("## Task201"), true, "Goal 3 tracker must record Task201 before the next frontier");

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task201-provider-helper-release-chain-"));
const probeEnvVar = "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_COLLECTION_PROBE";
const probeArgsEnvVar = "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_COLLECTION_PROBE_ARGS_JSON";
const previousProbeEnv = process.env[probeEnvVar];
const previousProbeArgsEnv = process.env[probeArgsEnvVar];

try {
  const init = initProject({
    name: "Goal3 Task201 Provider Helper Release Chain Check Debug",
    root_path: projectRoot
  });
  const projectId = init.project.project_id;
  const helperScript = createHelperScript(projectRoot);
  const collectionProbeScript = createCollectionProbeScript(projectRoot);
  const helperBinarySha256 = sha256File(process.execPath);
  process.env[probeEnvVar] = process.execPath;
  process.env[probeArgsEnvVar] = JSON.stringify([collectionProbeScript]);

  const launch = prepareAgentAdapterOsIsolationSandboxLaunch(projectRoot, {
    project_id: projectId,
    launch_id: "ADAPTER-OSISO-LAUNCH-0201-READY",
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=launch-secret`,
    requested_provider: "windows_appcontainer",
    launcher_environment: {
      platform: "win32",
      notes: `${projectRoot} password=launcher-secret`
    }
  }, {
    launcher_probe: () => ({
      probe_source: "service_owned_launcher_preflight",
      provider_available: true,
      launcher_binary_sha256: "a".repeat(64),
      launcher_version: "appcontainer-launcher-task201",
      diagnostics: [`${projectRoot} launcher diagnostic must be scrubbed`, "launcher ready"]
    })
  });
  assert.equal(launch.ok, true);

  const readyRunner = prepareAgentAdapterOsIsolationProviderRunner(projectRoot, {
    project_id: projectId,
    runner_id: "ADAPTER-OSISO-RUNNER-0201-READY",
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=runner-secret`,
    requested_provider: "windows_appcontainer",
    runner_environment: {
      platform: "win32",
      notes: `${projectRoot} password=runner-secret`
    }
  }, {
    provider_runner_resolver: () => ({
      resolution_source: "service_owned_provider_runner_resolver",
      runner_available: true,
      runner_binary_sha256: helperBinarySha256,
      runner_version: "node-provider-helper-task201",
      diagnostics: [`${projectRoot} runner diagnostic must be scrubbed`, "runner resolved"]
    })
  });
  assert.equal(readyRunner.ok, true);

  const hostCapability = probeAgentAdapterOsIsolationProviderHostCapability(projectRoot, {
    project_id: projectId,
    host_capability_probe_id: "ADAPTER-OSISO-HOST-CAP-0201-READY",
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=host-capability-secret`,
    requested_provider: "windows_appcontainer",
    host_capability_environment: {
      platform: "caller-spoofed-platform",
      notes: `${projectRoot} password=host-capability-secret`
    }
  }, {
    provider_host_capability_probe: () => ({
      probe_source: "service_owned_provider_host_capability_probe",
      provider_host_capability_available: true,
      capability_facts: ["task201 configured collection host capability prerequisite observed"],
      required_tools: ["windows_appcontainer-task201-host-probe"],
      kernel_features: ["task201-provider-host-capability"],
      diagnostics: [`${projectRoot} host capability diagnostic must be scrubbed`, "host capability observed"]
    })
  });
  assert.equal(hostCapability.ok, true);

  const readyHost = validateAgentAdapterOsIsolationProviderHelperHost(projectRoot, {
    project_id: projectId,
    host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0201-READY",
    host_capability_probe_id: hostCapability.host_capability_probe_id,
    runner_id: readyRunner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=host-secret`,
    requested_provider: "windows_appcontainer",
    host_environment: {
      platform: "win32",
      notes: `${projectRoot} password=host-secret`
    }
  }, {
    provider_helper_host_validator: () => ({
      validation_source: "service_owned_provider_helper_host_validator",
      helper_host_ready: true,
      helper_program: process.execPath,
      helper_binary_sha256: helperBinarySha256,
      helper_version: "node-provider-helper-task201",
      supported_platforms: ["win32"],
      diagnostics: [`${projectRoot} host validation diagnostic must be scrubbed`, "helper host ready"]
    })
  });
  assert.equal(readyHost.ok, true);

  const helperExecution = runAgentAdapterOsIsolationProviderHelperExecution(projectRoot, {
    project_id: projectId,
    helper_execution_id: "ADAPTER-OSISO-HELPER-0201-READY",
    host_validation_id: readyHost.host_validation_id,
    runner_id: readyRunner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=helper-secret`,
    requested_provider: "windows_appcontainer",
    helper_environment: {
      platform: "win32",
      notes: `${projectRoot} password=helper-secret`
    }
  }, {
    provider_helper_config_resolver: () => ({
      config_source: "service_owned_provider_helper_config",
      helper_available: true,
      helper_program: process.execPath,
      helper_args_prefix: [helperScript],
      helper_version: "node-provider-helper-task201",
      timeout_ms: 5000,
      diagnostics: [`${projectRoot} helper config diagnostic must be scrubbed`, "helper configured"]
    })
  });
  assert.equal(helperExecution.ok, true);
  assert.equal(helperExecution.provider_helper_execution.runtime_attestation_bound, true);

  const hostCapabilityPath = join(projectRoot, hostCapability.host_capability_probe_path);
  const staleHostCapability = JSON.parse(readFileSync(hostCapabilityPath, "utf8"));
  staleHostCapability.provider_host_capability.diagnostics = [
    "tampered-after-host-validation-before-collection"
  ];
  writeFileSync(hostCapabilityPath, JSON.stringify(staleHostCapability, null, 2), "utf8");

  const server = createComathServer();
  const staleCollectionResponse = await postCollection(
    server,
    projectRoot,
    projectId,
    helperExecution,
    readyRunner,
    launch,
    "ADAPTER-OSISO-HELPER-COLLECT-0201-STALE-HOST-CAPABILITY"
  );

  assert.equal(staleCollectionResponse.status, 200, JSON.stringify(staleCollectionResponse.body));
  const staleCollection = staleCollectionResponse.body.collection;
  assert.equal(staleCollection.ok, false, "stale provider host-capability artifacts must fail closed before configured collection probe acceptance");
  assert.equal(
    staleCollection.collection_status,
    "blocked_provider_helper_collection_host_capability_binding_mismatch"
  );
  assert.equal(staleCollection.provider_helper_collection.host_capability_required, true);
  assert.equal(staleCollection.provider_helper_collection.host_capability_bound, false);
  assert.equal(staleCollection.provider_helper_collection.host_validation_id, readyHost.host_validation_id);
  assert.equal(staleCollection.provider_helper_collection.host_validation_sha256, helperExecution.host_validation_artifact.sha256);
  assert.equal(staleCollection.provider_helper_collection.host_capability_probe_id, hostCapability.host_capability_probe_id);
  assert.notEqual(
    staleCollection.provider_helper_collection.host_capability_probe_sha256,
    readyHost.provider_host_capability_artifact.sha256,
    "collection diagnostics must expose that the current host-capability artifact hash drifted from the host-validation binding"
  );
  assert.equal(staleCollection.probe, null, "stale host-validation binding must block before canonical probe writing");
  assert.equal(staleCollection.adapter_execution_isolation.os_enforced, false);
  assert.equal(staleCollection.proof_authority, "none");
  assert.equal(staleCollection.can_promote_claim, false);
  assert.equal(staleCollection.can_certify_ga, false);
  assert.equal(JSON.stringify(staleCollectionResponse.body).includes(projectRoot), false, "stale collection response must not echo host paths");
  assert.equal(JSON.stringify(staleCollectionResponse.body).includes("task201-collection-secret"), false, "stale collection response must not echo secrets");

  const wrapperReadiness = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0201-STALE-HOST-CAPABILITY-WRAPPER-READINESS",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task201-test",
    evidence_path: staleCollection.collection_path
  });
  assert.equal(wrapperReadiness.ok, false, "stale collection wrapper must not satisfy readiness");
  assert.equal(wrapperReadiness.proof_authority, "none");
  assert.equal(wrapperReadiness.can_certify_ga, false);

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.os_isolation_provider_helper_collected" &&
        event.payload.collection_id === "ADAPTER-OSISO-HELPER-COLLECT-0201-STALE-HOST-CAPABILITY" &&
        event.payload.collection_status === "blocked_provider_helper_collection_host_capability_binding_mismatch" &&
        event.payload.host_capability_bound === false &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "stale host-validation collection blocker must be audit-visible and non-authoritative"
  );
  assert.equal(JSON.stringify(events).includes(projectRoot), false, "audit events must not echo host paths");
} finally {
  if (previousProbeEnv === undefined) {
    delete process.env[probeEnvVar];
  } else {
    process.env[probeEnvVar] = previousProbeEnv;
  }
  if (previousProbeArgsEnv === undefined) {
    delete process.env[probeArgsEnvVar];
  } else {
    process.env[probeArgsEnvVar] = previousProbeArgsEnv;
  }
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task201 provider-helper release chain check-debug tests passed.");
