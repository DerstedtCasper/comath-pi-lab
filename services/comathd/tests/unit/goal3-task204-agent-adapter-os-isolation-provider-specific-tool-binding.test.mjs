import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
  const helperScript = join(projectRoot, "task204-provider-helper.mjs");
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
      "console.error('provider helper stderr ok');"
    ].join("\n"),
    "utf8"
  );
  return helperScript;
}

function createCollectionProbeScript(projectRoot, { includeProviderHostToolBinding, spoofTopLevelProviderSpecificBinding = false }) {
  const collectionProbeScript = join(
    projectRoot,
    spoofTopLevelProviderSpecificBinding
      ? "task204-provider-host-tool-top-level-spoof-collection-probe.mjs"
      : includeProviderHostToolBinding
        ? "task204-provider-host-tool-bound-collection-probe.mjs"
        : "task204-provider-host-tool-missing-collection-probe.mjs"
  );
  writeFileSync(
    collectionProbeScript,
    [
      "const args = process.argv.slice(2);",
      "const valueAfter = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : null; };",
      "const numberAfter = (flag) => Number(valueAfter(flag));",
      "const witness = {",
      "  witness_source: 'provider_specific_executed_tool',",
      "  provider: process.env.COMATH_OS_ISOLATION_PROVIDER,",
      "  execution_id: `${valueAfter('--collection-id')}-TOOL`,",
      "  collection_id: valueAfter('--collection-id'),",
      "  helper_execution_id: valueAfter('--helper-execution-id'),",
      "  runner_id: process.env.COMATH_PROVIDER_RUNNER_ID,",
      "  launch_id: process.env.COMATH_SANDBOX_LAUNCH_ID,",
      "  tool_sha256: valueAfter('--provider-tool-sha256'),",
      "  profile_sha256: valueAfter('--provider-tool-profile-sha256'),",
      "  argv_sha256: valueAfter('--provider-tool-argv-sha256'),",
      "  transcript_sha256: valueAfter('--transcript-sha256'),",
      "  network_policy: 'disabled',",
      "  proof_authority: 'none'",
      "};",
      includeProviderHostToolBinding
        ? "witness.host_capability_tool_name = valueAfter('--provider-host-tool-name'); witness.host_capability_tool_sha256 = valueAfter('--provider-host-tool-sha256');"
        : "",
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
      "  escape_prevention: true,",
      "  provider_tool_execution_witness: witness",
      "};",
      spoofTopLevelProviderSpecificBinding
        ? "payload.provider_specific_tool_execution_required = true; payload.provider_specific_tool_execution_bound = true; payload.provider_specific_tool_execution_sha256 = valueAfter('--provider-tool-sha256'); payload.provider_specific_tool_name = valueAfter('--provider-host-tool-name'); payload.provider_specific_tool_sha256 = valueAfter('--provider-host-tool-sha256');"
        : "",
      includeProviderHostToolBinding
        ? "payload.provider_family_os_enforcement_witness = { witness_source: 'provider_family_os_enforcement', provider: process.env.COMATH_OS_ISOLATION_PROVIDER, execution_id: `${valueAfter('--collection-id')}-FAMILY`, collection_id: valueAfter('--collection-id'), helper_execution_id: valueAfter('--helper-execution-id'), runner_id: process.env.COMATH_PROVIDER_RUNNER_ID, launch_id: process.env.COMATH_SANDBOX_LAUNCH_ID, host_validation_id: valueAfter('--host-validation-id'), host_validation_path: valueAfter('--host-validation-path'), host_validation_sha256: valueAfter('--host-validation-sha256'), host_capability_probe_id: valueAfter('--host-capability-probe-id'), host_capability_probe_path: valueAfter('--host-capability-probe-path'), host_capability_probe_sha256: valueAfter('--host-capability-probe-sha256'), host_capability_status: valueAfter('--host-capability-status'), provider_host_capability_bound: valueAfter('--provider-host-capability-bound') === 'true', provider_specific_tool_name: valueAfter('--provider-host-tool-name'), provider_specific_tool_sha256: valueAfter('--provider-host-tool-sha256'), provider_tool_sha256: valueAfter('--provider-tool-sha256'), provider_tool_profile_sha256: valueAfter('--provider-tool-profile-sha256'), provider_tool_argv_sha256: valueAfter('--provider-tool-argv-sha256'), provider_family_execution_kind: valueAfter('--provider-family-execution-kind'), provider_family_execution_profile_sha256: valueAfter('--provider-family-execution-profile-sha256'), provider_family_execution_argv_sha256: valueAfter('--provider-family-execution-argv-sha256'), collection_source: 'service_owned_os_probe', process_isolation_enforced: true, filesystem_scope_enforced: true, network_isolation_enforced: true, no_new_privileges: true, escape_prevention: true, adapter_process_exit_code: numberAfter('--helper-exit-code'), stdout_sha256: valueAfter('--stdout-sha256'), stderr_sha256: valueAfter('--stderr-sha256'), transcript_sha256: valueAfter('--transcript-sha256'), network_policy: 'disabled', proof_authority: 'none' };"
        : "",
      includeProviderHostToolBinding
        ? "payload.provider_specific_live_probe_attempt = { attempt_source: 'provider_specific_live_os_probe', provider: process.env.COMATH_OS_ISOLATION_PROVIDER, execution_id: `${valueAfter('--collection-id')}-LIVE`, collection_id: valueAfter('--collection-id'), helper_execution_id: valueAfter('--helper-execution-id'), runner_id: process.env.COMATH_PROVIDER_RUNNER_ID, launch_id: process.env.COMATH_SANDBOX_LAUNCH_ID, provider_family_execution_kind: valueAfter('--provider-family-execution-kind'), provider_family_execution_profile_sha256: valueAfter('--provider-family-execution-profile-sha256'), provider_family_execution_argv_sha256: valueAfter('--provider-family-execution-argv-sha256'), provider_tool_sha256: valueAfter('--provider-tool-sha256'), provider_tool_profile_sha256: valueAfter('--provider-tool-profile-sha256'), provider_tool_argv_sha256: valueAfter('--provider-tool-argv-sha256'), transcript_sha256: valueAfter('--transcript-sha256'), collection_source: 'service_owned_os_probe', process_isolation_enforced: true, filesystem_scope_enforced: true, network_isolation_enforced: true, no_new_privileges: true, escape_prevention: true, adapter_process_exit_code: numberAfter('--helper-exit-code'), network_policy: 'disabled', proof_authority: 'none' };"
        : "",
      "console.log(JSON.stringify(payload));",
      "console.error('collection probe stderr ok');"
    ].filter(Boolean).join("\n"),
    "utf8"
  );
  return collectionProbeScript;
}

function sha256Text(text) {
  return createHash("sha256").update(text).digest("hex");
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function rewriteEvidenceAndProbe(projectRoot, collection, rewriteEvidence) {
  const evidencePath = join(projectRoot, collection.probe.evidence_path);
  const probePath = join(projectRoot, collection.probe.probe_path);
  const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
  const probe = JSON.parse(readFileSync(probePath, "utf8"));
  rewriteEvidence(evidence);
  probe.evidence = evidence;
  const evidenceText = `${JSON.stringify(evidence, null, 2)}\n`;
  writeFileSync(evidencePath, evidenceText, "utf8");
  probe.evidence_artifact.sha256 = sha256Text(evidenceText);
  probe.evidence_artifact.size_bytes = Buffer.byteLength(evidenceText, "utf8");
  writeJson(probePath, probe);
}

function rewriteCollection(projectRoot, collection, rewrite) {
  const collectionPath = join(projectRoot, collection.collection_path);
  const manifest = JSON.parse(readFileSync(collectionPath, "utf8"));
  rewrite(manifest);
  writeJson(collectionPath, manifest);
}

function deleteProviderSpecificFields(target) {
  delete target.provider_specific_tool_execution_required;
  delete target.provider_specific_tool_execution_bound;
  delete target.provider_specific_tool_execution_sha256;
  delete target.provider_specific_tool_name;
  delete target.provider_specific_tool_sha256;
}

async function postCollection(server, projectRoot, projectId, helperExecution, readyRunner, launch, collectionId, actorSecret) {
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
      actor: `${projectRoot} token=${actorSecret}`,
      requested_provider: "windows_appcontainer",
      collection_environment: {
        platform: "win32",
        notes: `${projectRoot} password=${actorSecret}`
      }
    }
  });
}

const task204Capability = "agent_adapter_os_isolation_provider_specific_tool_binding_gate";
const task204TestName = "goal3-task204-agent-adapter-os-isolation-provider-specific-tool-binding.test.mjs";

assert.equal(
  getComathdStatus().capabilities.includes(task204Capability),
  true,
  "Task204 capability ledger must advertise provider-specific tool binding for helper collection"
);

const smoke = readRepoFile("scripts/phase0-smoke.mjs");
const gaReleaseCriteria = readRepoFile("docs/architecture/ga-release-criteria.md");
assert.equal(smoke.includes(task204TestName), true, "phase0 smoke must discover the Task204 provider-specific tool suite");
assert.equal(gaReleaseCriteria.includes(task204TestName), true, "GA release criteria must list the Task204 provider-specific tool suite");

for (const [content, label] of [
  [readRepoFile("README.md"), "README.md"],
  [readRepoFile("AGENTS.md"), "AGENTS.md"],
  [readRepoFile("docs/architecture/adapter-contracts.md"), "docs/architecture/adapter-contracts.md"],
  [readRepoFile("docs/architecture/threat-model.md"), "docs/architecture/threat-model.md"],
  [gaReleaseCriteria, "docs/architecture/ga-release-criteria.md"],
  [readRepoFile("config/README.md"), "config/README.md"]
]) {
  assert.equal(content.includes("Task204"), true, `${label} must record the Task204 provider-specific tool binding boundary`);
  assert.match(
    content,
    /provider-specific tool binding|provider_specific_tool_execution|host-capability provider tool/i,
    `${label} must name the provider-specific tool binding gate`
  );
  assert.doesNotMatch(
    content,
    /Task204.{0,220}(?:certif(?:y|ies) GA|mathematical proof authority|real-Pi evidence|readiness evidence by itself|broad provider support)/is,
    `${label} must not overclaim Task204 as proof, GA, real-Pi, standalone readiness, or broad provider support`
  );
}

const sampleConfig = readRepoFile("config/comath.sample.json");
assert.equal(
  sampleConfig.includes('"providerSpecificToolBindingRequired": true'),
  true,
  "sample config must record that provider-helper complete collection requires provider-specific tool binding"
);
assert.match(
  readRepoFile("TODO.md"),
  /Task184-20[4-9]/,
  "TODO must roll the provider-helper deferred-chain summary through at least Task204"
);
assert.equal(readRepoFile("REVIEW.md").includes("Goal 3 Task 204"), true, "REVIEW must include Task204 verification evidence");
assert.equal(readRepoFile("goal-3/tasks.md").includes("## Task204"), true, "Goal 3 tracker must record Task204 before the next frontier");

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task204-provider-specific-tool-binding-"));
const probeEnvVar = "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_COLLECTION_PROBE";
const probeArgsEnvVar = "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_COLLECTION_PROBE_ARGS_JSON";
const previousProbeEnv = process.env[probeEnvVar];
const previousProbeArgsEnv = process.env[probeArgsEnvVar];

try {
  const init = initProject({
    name: "Goal3 Task204 Adapter OS Isolation Provider Specific Tool Binding",
    root_path: projectRoot
  });
  const projectId = init.project.project_id;
  const helperScript = createHelperScript(projectRoot);
  const missingToolBindingProbe = createCollectionProbeScript(projectRoot, { includeProviderHostToolBinding: false });
  const spoofTopLevelToolBindingProbe = createCollectionProbeScript(projectRoot, {
    includeProviderHostToolBinding: false,
    spoofTopLevelProviderSpecificBinding: true
  });
  const toolBoundProbe = createCollectionProbeScript(projectRoot, { includeProviderHostToolBinding: true });
  const helperBinarySha256 = sha256File(process.execPath);
  process.env[probeEnvVar] = process.execPath;
  process.env[probeArgsEnvVar] = JSON.stringify([missingToolBindingProbe]);

  const launch = prepareAgentAdapterOsIsolationSandboxLaunch(projectRoot, {
    project_id: projectId,
    launch_id: "ADAPTER-OSISO-LAUNCH-0204-READY",
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
      launcher_version: "appcontainer-launcher-10.0",
      diagnostics: [`${projectRoot} launcher diagnostic must be scrubbed`, "launcher ready"]
    })
  });
  assert.equal(launch.ok, true);

  const readyRunner = prepareAgentAdapterOsIsolationProviderRunner(projectRoot, {
    project_id: projectId,
    runner_id: "ADAPTER-OSISO-RUNNER-0204-READY",
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
      runner_version: "node-provider-helper-test",
      diagnostics: [`${projectRoot} runner diagnostic must be scrubbed`, "runner resolved"]
    })
  });
  assert.equal(readyRunner.ok, true);

  const hostCapability = probeAgentAdapterOsIsolationProviderHostCapability(projectRoot, {
    project_id: projectId,
    host_capability_probe_id: "ADAPTER-OSISO-HOST-CAP-0204-READY",
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=host-capability-secret`,
    requested_provider: "windows_appcontainer",
    host_capability_environment: {
      platform: "caller-spoofed-platform",
      notes: `${projectRoot} password=host-capability-secret`
    }
  }, {
    provider_host_capability_probe: (probeInput) => {
      assert.equal(probeInput.provider, "windows_appcontainer");
      assert.equal(probeInput.platform, process.platform);
      return {
        probe_source: "service_owned_provider_host_capability_probe",
        provider_host_capability_available: true,
        capability_facts: [{ capability: "task204 provider tool candidate observed", observed: true, evidence_sha256: "b".repeat(64), notes: null }],
        required_tools: [{ name: "windows_checknetisolation", present: true, binary_sha256: helperBinarySha256, version: null }],
        kernel_features: [{ name: "task204-provider-host-capability", observed: true, evidence_sha256: "c".repeat(64), notes: null }],
        diagnostics: [`${projectRoot} host capability diagnostic must be scrubbed`, "host capability observed"]
      };
    }
  });
  assert.equal(hostCapability.ok, true);
  assert.equal(hostCapability.provider_host_capability.required_tools[0].binary_sha256, helperBinarySha256);

  const readyHost = validateAgentAdapterOsIsolationProviderHelperHost(projectRoot, {
    project_id: projectId,
    host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0204-READY",
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
      helper_version: "node-provider-helper-test",
      supported_platforms: ["win32"],
      diagnostics: [`${projectRoot} host validation diagnostic must be scrubbed`, "helper host ready"]
    })
  });
  assert.equal(readyHost.ok, true);

  const helperExecution = runAgentAdapterOsIsolationProviderHelperExecution(projectRoot, {
    project_id: projectId,
    helper_execution_id: "ADAPTER-OSISO-HELPER-0204-READY",
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
      helper_version: "node-provider-helper-test",
      timeout_ms: 5000,
      diagnostics: [`${projectRoot} helper config diagnostic must be scrubbed`, "helper configured"]
    })
  });
  assert.equal(helperExecution.ok, true);
  assert.equal(helperExecution.provider_helper_execution.runtime_attestation_bound, true);

  const server = createComathServer();
  const missingBindingResponse = await postCollection(
    server,
    projectRoot,
    projectId,
    helperExecution,
    readyRunner,
    launch,
    "ADAPTER-OSISO-HELPER-COLLECT-0204-MISSING-HOST-TOOL",
    "missing-host-tool-secret"
  );
  assert.equal(missingBindingResponse.status, 200, JSON.stringify(missingBindingResponse.body));
  const missingBinding = missingBindingResponse.body.collection;
  assert.equal(
    missingBinding.ok,
    false,
    "Task203-valid complete facts must not satisfy collection without host-capability provider tool binding"
  );
  assert.equal(
    missingBinding.collection_status,
    "blocked_provider_helper_collection_provider_specific_tool_binding_missing"
  );
  assert.equal(missingBinding.provider_helper_collection.provider_specific_tool_execution_required, true);
  assert.equal(missingBinding.provider_helper_collection.provider_specific_tool_execution_bound, false);
  assert.equal(missingBinding.probe.ok, false);
  assert.equal(missingBinding.probe.evidence.provider_specific_tool_execution_bound, false);
  assert.equal(missingBinding.adapter_execution_isolation.os_enforced, false);
  assert.equal(missingBinding.proof_authority, "none");
  assert.equal(missingBinding.can_certify_ga, false);
  assert.equal(JSON.stringify(missingBindingResponse.body).includes(projectRoot), false, "missing-binding route response must not echo host paths");
  assert.equal(JSON.stringify(missingBindingResponse.body).includes("missing-host-tool-secret"), false, "missing-binding route response must not echo secrets");

  const missingBindingReadiness = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0204-MISSING-HOST-TOOL-READINESS",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task204-missing-host-tool-test",
    evidence_path: missingBinding.probe.evidence_path
  });
  assert.equal(missingBindingReadiness.ok, false, "provider-tool witness without host tool binding must not satisfy readiness");
  assert.equal(missingBindingReadiness.checks.provider_specific_tool_execution.ok, false);
  assert.equal(
    missingBindingReadiness.vetoes.some((veto) => veto.code === "adapter_os_isolation_provider_specific_tool_execution_missing"),
    true,
    "readiness must report a provider-specific tool execution veto"
  );

  process.env[probeArgsEnvVar] = JSON.stringify([spoofTopLevelToolBindingProbe]);
  const spoofTopLevelResponse = await postCollection(
    server,
    projectRoot,
    projectId,
    helperExecution,
    readyRunner,
    launch,
    "ADAPTER-OSISO-HELPER-COLLECT-0204-TOP-LEVEL-SPOOF",
    "top-level-spoof-secret"
  );
  assert.equal(spoofTopLevelResponse.status, 200, JSON.stringify(spoofTopLevelResponse.body));
  const spoofTopLevel = spoofTopLevelResponse.body.collection;
  assert.equal(
    spoofTopLevel.ok,
    false,
    "top-level provider-specific fields must not substitute for witness host-capability tool binding"
  );
  assert.equal(
    spoofTopLevel.collection_status,
    "blocked_provider_helper_collection_provider_specific_tool_binding_missing"
  );
  assert.equal(spoofTopLevel.provider_helper_collection.provider_specific_tool_execution_required, true);
  assert.equal(spoofTopLevel.provider_helper_collection.provider_specific_tool_execution_bound, false);
  assert.equal(spoofTopLevel.probe.ok, false);

  process.env[probeArgsEnvVar] = JSON.stringify([toolBoundProbe]);
  const boundResponse = await postCollection(
    server,
    projectRoot,
    projectId,
    helperExecution,
    readyRunner,
    launch,
    "ADAPTER-OSISO-HELPER-COLLECT-0204-HOST-TOOL-BOUND",
    "host-tool-bound-secret"
  );
  assert.equal(boundResponse.status, 200, JSON.stringify(boundResponse.body));
  const boundCollection = boundResponse.body.collection;
  assert.equal(boundCollection.ok, true, "host-tool-bound configured collection can produce canonical OS evidence");
  assert.equal(boundCollection.collection_status, "provider_helper_os_evidence_collected");
  assert.equal(boundCollection.provider_helper_collection.provider_tool_execution_witness_bound, true);
  assert.equal(boundCollection.provider_helper_collection.provider_specific_tool_execution_required, true);
  assert.equal(boundCollection.provider_helper_collection.provider_specific_tool_execution_bound, true);
  assert.equal(boundCollection.provider_helper_collection.provider_specific_tool_name, "windows_checknetisolation");
  assert.equal(boundCollection.provider_helper_collection.provider_specific_tool_sha256, helperBinarySha256);
  assert.match(boundCollection.provider_helper_collection.provider_specific_tool_execution_sha256, /^[a-f0-9]{64}$/);
  assert.equal(boundCollection.probe.ok, true);
  assert.equal(boundCollection.probe.evidence.provider_specific_tool_execution_bound, true);
  assert.equal(boundCollection.probe.evidence.provider_specific_tool_name, "windows_checknetisolation");
  assert.equal(boundCollection.probe.evidence.provider_specific_tool_sha256, helperBinarySha256);
  assert.equal(boundCollection.proof_authority, "none");
  assert.equal(boundCollection.can_certify_ga, false);
  assert.equal(JSON.stringify(boundResponse.body).includes(projectRoot), false, "bound route response must not echo host paths");
  assert.equal(JSON.stringify(boundResponse.body).includes("host-tool-bound-secret"), false, "bound route response must not echo secrets");

  const boundReadiness = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0204-HOST-TOOL-BOUND-READINESS",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task204-host-tool-bound-test",
    evidence_path: boundCollection.probe.evidence_path
  });
  assert.equal(boundReadiness.ok, true, "provider-specific host-tool-bound canonical evidence can satisfy OS-isolation readiness");
  assert.equal(boundReadiness.checks.provider_specific_tool_execution.ok, true);
  assert.equal(boundReadiness.proof_authority, "none");
  assert.equal(boundReadiness.can_certify_ga, false);

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.os_isolation_provider_helper_collected" &&
        event.payload.collection_id === "ADAPTER-OSISO-HELPER-COLLECT-0204-MISSING-HOST-TOOL" &&
        event.payload.collection_status === "blocked_provider_helper_collection_provider_specific_tool_binding_missing" &&
        event.payload.provider_specific_tool_execution_bound === false &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "missing provider-specific tool binding blocker must be audit-visible and non-authoritative"
  );
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.os_isolation_provider_helper_collected" &&
        event.payload.collection_id === "ADAPTER-OSISO-HELPER-COLLECT-0204-HOST-TOOL-BOUND" &&
        event.payload.ok === true &&
        event.payload.provider_specific_tool_execution_bound === true &&
        event.payload.provider_specific_tool_name === "windows_checknetisolation" &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "provider-specific tool-bound helper collection must be audit-visible and non-authoritative"
  );
  assert.equal(JSON.stringify(events).includes(projectRoot), false, "audit events must not echo host paths");

  const hostCapabilityPath = join(projectRoot, hostCapability.host_capability_probe_path);
  const staleHostCapability = JSON.parse(readFileSync(hostCapabilityPath, "utf8"));
  staleHostCapability.provider_host_capability.required_tools[0].binary_sha256 = "d".repeat(64);
  writeJson(hostCapabilityPath, staleHostCapability);
  const staleHostCapabilityReadiness = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0204-STALE-HOST-CAPABILITY-TOOL-READINESS",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task204-stale-host-capability-tool-test",
    evidence_path: boundCollection.probe.evidence_path
  });
  assert.equal(
    staleHostCapabilityReadiness.ok,
    false,
    "provider-specific tool binding must be rechecked against the current host-capability artifact"
  );
  assert.equal(staleHostCapabilityReadiness.checks.provider_tool_execution_witness.ok, true);
  assert.equal(staleHostCapabilityReadiness.checks.provider_specific_tool_execution.ok, false);
  assert.equal(
    staleHostCapabilityReadiness.vetoes.some((veto) => veto.code === "adapter_os_isolation_provider_specific_tool_execution_missing"),
    true,
    "stale host-capability provider tool binding must report the provider-specific tool binding veto"
  );

  rewriteCollection(projectRoot, boundCollection, (manifest) => {
    deleteProviderSpecificFields(manifest.provider_helper_collection);
  });
  rewriteEvidenceAndProbe(projectRoot, boundCollection, (evidence) => {
    deleteProviderSpecificFields(evidence);
  });
  const stalePreTask204Readiness = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0204-STALE-PRE-TASK204-READINESS",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task204-stale-pre-task204-test",
    evidence_path: boundCollection.probe.evidence_path
  });
  assert.equal(
    stalePreTask204Readiness.ok,
    false,
    "stale Task203-valid collection evidence without provider-specific tool binding must fail closed"
  );
  assert.equal(stalePreTask204Readiness.checks.provider_tool_execution_witness.ok, true);
  assert.equal(stalePreTask204Readiness.checks.provider_specific_tool_execution.ok, false);
  assert.equal(
    stalePreTask204Readiness.vetoes.some((veto) => veto.code === "adapter_os_isolation_provider_specific_tool_execution_missing"),
    true,
    "stale pre-Task204 evidence must report the provider-specific tool binding veto"
  );
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

console.log("Goal 3 Task204 provider-specific tool binding tests passed.");
