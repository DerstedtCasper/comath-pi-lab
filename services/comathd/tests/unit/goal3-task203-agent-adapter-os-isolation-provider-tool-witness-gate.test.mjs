import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectAgentAdapterOsIsolationProviderHelperExecutionEvidence,
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

function sha256Text(text) {
  return createHash("sha256").update(text).digest("hex");
}

function readRepoFile(relativePath) {
  const here = dirname(fileURLToPath(import.meta.url));
  const repoRoot = join(here, "../../../..");
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

const task203Capability = "agent_adapter_os_isolation_provider_tool_execution_witness_gate";
const task203TestName = "goal3-task203-agent-adapter-os-isolation-provider-tool-witness-gate.test.mjs";

assert.equal(
  getComathdStatus().capabilities.includes(task203Capability),
  true,
  "Task203 capability ledger must advertise provider-tool execution witness gating for configured helper collection"
);

const smoke = readRepoFile("scripts/phase0-smoke.mjs");
const gaReleaseCriteria = readRepoFile("docs/architecture/ga-release-criteria.md");
assert.equal(smoke.includes(task203TestName), true, "phase0 smoke must discover the Task203 provider-tool witness suite");
assert.equal(gaReleaseCriteria.includes(task203TestName), true, "GA release criteria must list the Task203 provider-tool witness suite");

for (const [content, label] of [
  [readRepoFile("README.md"), "README.md"],
  [readRepoFile("AGENTS.md"), "AGENTS.md"],
  [readRepoFile("docs/architecture/adapter-contracts.md"), "docs/architecture/adapter-contracts.md"],
  [readRepoFile("docs/architecture/threat-model.md"), "docs/architecture/threat-model.md"],
  [gaReleaseCriteria, "docs/architecture/ga-release-criteria.md"],
  [readRepoFile("config/README.md"), "config/README.md"]
]) {
  assert.equal(content.includes("Task203"), true, `${label} must record the Task203 provider-tool witness boundary`);
  assert.match(
    content,
    /provider-(?:specific )?(?:executed-)?tool (?:execution )?witness|provider_tool_execution_witness/i,
    `${label} must name provider-tool execution witness gating`
  );
  assert.doesNotMatch(
    content,
    /Task203.{0,220}(?:certif(?:y|ies) GA|mathematical proof authority|real-Pi evidence|readiness evidence by itself)/is,
    `${label} must not overclaim Task203 as proof, GA, real-Pi, or standalone readiness evidence`
  );
}

const sampleConfig = readRepoFile("config/comath.sample.json");
assert.equal(
  sampleConfig.includes('"collectionProbeProviderToolWitnessRequired": true'),
  true,
  "sample config must record that provider-helper collection probes require provider-tool witness binding"
);
assert.match(
  readRepoFile("TODO.md"),
  /Task184-20[3-9]/,
  "TODO must roll the provider-helper deferred-chain summary through at least Task203"
);
assert.equal(readRepoFile("REVIEW.md").includes("Goal 3 Task 203"), true, "REVIEW must include Task203 verification evidence");
assert.equal(readRepoFile("goal-3/tasks.md").includes("## Task203"), true, "Goal 3 tracker must record Task203 before the next frontier");

function createHelperScript(projectRoot) {
  const helperScript = join(projectRoot, "task203-provider-helper.mjs");
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

function createCollectionProbeScript(projectRoot, { includeProviderToolWitness }) {
  const collectionProbeScript = join(
    projectRoot,
    includeProviderToolWitness
      ? "task203-provider-tool-witnessed-collection-probe.mjs"
      : "task203-missing-provider-tool-witness-collection-probe.mjs"
  );
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
      includeProviderToolWitness
        ? "payload.provider_tool_execution_witness = { witness_source: 'provider_specific_executed_tool', provider: process.env.COMATH_OS_ISOLATION_PROVIDER, execution_id: `${valueAfter('--collection-id')}-TOOL`, collection_id: valueAfter('--collection-id'), helper_execution_id: valueAfter('--helper-execution-id'), runner_id: process.env.COMATH_PROVIDER_RUNNER_ID, launch_id: process.env.COMATH_SANDBOX_LAUNCH_ID, tool_sha256: valueAfter('--provider-tool-sha256'), profile_sha256: valueAfter('--provider-tool-profile-sha256'), argv_sha256: valueAfter('--provider-tool-argv-sha256'), host_capability_tool_name: valueAfter('--provider-host-tool-name'), host_capability_tool_sha256: valueAfter('--provider-host-tool-sha256'), transcript_sha256: valueAfter('--transcript-sha256'), network_policy: 'disabled', proof_authority: 'none' };"
        : "",
      includeProviderToolWitness
        ? "payload.provider_family_os_enforcement_witness = { witness_source: 'provider_family_os_enforcement', provider: process.env.COMATH_OS_ISOLATION_PROVIDER, execution_id: `${valueAfter('--collection-id')}-FAMILY`, collection_id: valueAfter('--collection-id'), helper_execution_id: valueAfter('--helper-execution-id'), runner_id: process.env.COMATH_PROVIDER_RUNNER_ID, launch_id: process.env.COMATH_SANDBOX_LAUNCH_ID, host_validation_id: valueAfter('--host-validation-id'), host_validation_path: valueAfter('--host-validation-path'), host_validation_sha256: valueAfter('--host-validation-sha256'), host_capability_probe_id: valueAfter('--host-capability-probe-id'), host_capability_probe_path: valueAfter('--host-capability-probe-path'), host_capability_probe_sha256: valueAfter('--host-capability-probe-sha256'), host_capability_status: valueAfter('--host-capability-status'), provider_host_capability_bound: valueAfter('--provider-host-capability-bound') === 'true', provider_specific_tool_name: valueAfter('--provider-host-tool-name'), provider_specific_tool_sha256: valueAfter('--provider-host-tool-sha256'), provider_tool_sha256: valueAfter('--provider-tool-sha256'), provider_tool_profile_sha256: valueAfter('--provider-tool-profile-sha256'), provider_tool_argv_sha256: valueAfter('--provider-tool-argv-sha256'), collection_source: 'service_owned_os_probe', process_isolation_enforced: true, filesystem_scope_enforced: true, network_isolation_enforced: true, no_new_privileges: true, escape_prevention: true, adapter_process_exit_code: numberAfter('--helper-exit-code'), stdout_sha256: valueAfter('--stdout-sha256'), stderr_sha256: valueAfter('--stderr-sha256'), transcript_sha256: valueAfter('--transcript-sha256'), network_policy: 'disabled', proof_authority: 'none' };"
        : "",
      "console.log(JSON.stringify(payload));",
      "console.error('collection probe stderr ok');"
    ].filter(Boolean).join("\n"),
    "utf8"
  );
  return collectionProbeScript;
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
        notes: `${projectRoot} password=${actorSecret}`,
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
}

function writeStalePreTask203Evidence(projectRoot, sourceCollection, staleProbeId) {
  const sourceProbe = sourceCollection.probe;
  const staleDir = join(projectRoot, ".comath", "release", "agent-adapter-os-isolation", staleProbeId);
  const collectionPath = `.comath/release/agent-adapter-os-isolation/${staleProbeId}/provider-helper-collection.json`;
  const evidencePath = `.comath/release/agent-adapter-os-isolation/${staleProbeId}/evidence.json`;
  const probePath = `.comath/release/agent-adapter-os-isolation/${staleProbeId}/probe.json`;
  mkdirSync(staleDir, { recursive: true });

  const staleEvidence = {
    ...sourceProbe.evidence,
    probe_id: staleProbeId
  };
  delete staleEvidence.provider_tool_execution_witness_required;
  delete staleEvidence.provider_tool_execution_witness_bound;
  delete staleEvidence.provider_tool_execution_witness_sha256;

  const evidenceText = JSON.stringify(staleEvidence);
  const evidenceSha256 = sha256Text(evidenceText);
  writeFileSync(join(staleDir, "evidence.json"), evidenceText, "utf8");

  const staleProbe = {
    ...sourceProbe,
    probe_id: staleProbeId,
    probe_path: probePath,
    evidence_path: evidencePath,
    evidence_artifact: {
      kind: "agent_adapter_os_isolation_evidence",
      path: evidencePath,
      sha256: evidenceSha256,
      size_bytes: Buffer.byteLength(evidenceText, "utf8")
    },
    evidence: staleEvidence
  };
  writeFileSync(join(staleDir, "probe.json"), JSON.stringify(staleProbe), "utf8");

  const staleCollection = {
    ...sourceCollection,
    collection_id: staleProbeId,
    collection_path: collectionPath,
    probe: staleProbe,
    provider_helper_collection: {
      ...sourceCollection.provider_helper_collection
    }
  };
  delete staleCollection.provider_helper_collection.provider_tool_execution_witness_required;
  delete staleCollection.provider_helper_collection.provider_tool_execution_witness_bound;
  delete staleCollection.provider_helper_collection.provider_tool_execution_witness_sha256;
  writeFileSync(join(staleDir, "provider-helper-collection.json"), JSON.stringify(staleCollection), "utf8");
  return evidencePath;
}

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task203-provider-tool-witness-gate-"));
const probeEnvVar = "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_COLLECTION_PROBE";
const probeArgsEnvVar = "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_COLLECTION_PROBE_ARGS_JSON";
const previousProbeEnv = process.env[probeEnvVar];
const previousProbeArgsEnv = process.env[probeArgsEnvVar];

try {
  assert.equal(
    getComathdStatus().capabilities.includes(
      "agent_adapter_os_isolation_provider_tool_execution_witness_gate"
    ),
    true,
    "Task203 capability ledger must advertise provider-tool execution witness gating for configured helper collection"
  );

  const init = initProject({
    name: "Goal3 Task203 Adapter OS Isolation Provider Tool Witness Gate",
    root_path: projectRoot
  });
  const projectId = init.project.project_id;
  const helperScript = createHelperScript(projectRoot);
  const missingWitnessProbeScript = createCollectionProbeScript(projectRoot, { includeProviderToolWitness: false });
  const witnessedProbeScript = createCollectionProbeScript(projectRoot, { includeProviderToolWitness: true });
  const helperBinarySha256 = sha256File(process.execPath);
  process.env[probeEnvVar] = process.execPath;
  process.env[probeArgsEnvVar] = JSON.stringify([missingWitnessProbeScript]);

  const launch = prepareAgentAdapterOsIsolationSandboxLaunch(projectRoot, {
    project_id: projectId,
    launch_id: "ADAPTER-OSISO-LAUNCH-0203-READY",
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
      launcher_version: "appcontainer-launcher-9.0",
      diagnostics: [`${projectRoot} launcher diagnostic must be scrubbed`, "launcher ready"]
    })
  });
  assert.equal(launch.ok, true);

  const readyRunner = prepareAgentAdapterOsIsolationProviderRunner(projectRoot, {
    project_id: projectId,
    runner_id: "ADAPTER-OSISO-RUNNER-0203-READY",
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
    host_capability_probe_id: "ADAPTER-OSISO-HOST-CAP-0203-READY",
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
        capability_facts: ["task203 provider-tool witness host prerequisite observed"],
        required_tools: [{ name: "windows_checknetisolation", present: true, binary_sha256: helperBinarySha256, version: null }],
        kernel_features: ["task203-provider-host-capability"],
        diagnostics: [`${projectRoot} host capability diagnostic must be scrubbed`, "host capability observed"]
      };
    }
  });
  assert.equal(hostCapability.ok, true);

  const readyHost = validateAgentAdapterOsIsolationProviderHelperHost(projectRoot, {
    project_id: projectId,
    host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0203-READY",
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
    provider_helper_host_validator: (hostInput) => {
      assert.equal(hostInput.host_capability_probe_id, hostCapability.host_capability_probe_id);
      assert.equal(hostInput.host_capability_status, "provider_host_capability_observed");
      return {
        validation_source: "service_owned_provider_helper_host_validator",
        helper_host_ready: true,
        helper_program: process.execPath,
        helper_binary_sha256: helperBinarySha256,
        helper_version: "node-provider-helper-test",
        supported_platforms: ["win32"],
        diagnostics: [`${projectRoot} host validation diagnostic must be scrubbed`, "helper host ready"]
      };
    }
  });
  assert.equal(readyHost.ok, true);

  const helperExecution = runAgentAdapterOsIsolationProviderHelperExecution(projectRoot, {
    project_id: projectId,
    helper_execution_id: "ADAPTER-OSISO-HELPER-0203-READY",
    host_validation_id: readyHost.host_validation_id,
    runner_id: readyRunner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=helper-secret`,
    requested_provider: "windows_appcontainer",
    helper_environment: {
      platform: "win32",
      notes: `${projectRoot} password=helper-secret`,
      stdout_sha256: "1".repeat(64),
      stderr_sha256: "2".repeat(64)
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

  const invalidInjectedWitnessCollection = collectAgentAdapterOsIsolationProviderHelperExecutionEvidence(projectRoot, {
    project_id: projectId,
    collection_id: "ADAPTER-OSISO-HELPER-COLLECT-0203-BAD-WITNESS",
    helper_execution_id: helperExecution.helper_execution_id,
    runner_id: readyRunner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=bad-witness-secret`,
    requested_provider: "windows_appcontainer",
    collection_environment: {
      platform: "win32",
      notes: `${projectRoot} password=bad-witness-secret`
    }
  }, {
    provider_helper_collection_probe: (collectionInput) => ({
      probe_source: "service_owned_provider_helper_collection_probe",
      collection_source: "service_owned_os_probe",
      process_isolation_enforced: true,
      filesystem_scope_enforced: true,
      network_isolation_enforced: true,
      no_new_privileges: true,
      escape_prevention: true,
      adapter_process_exit_code: collectionInput.helper_exit_code,
      stdout_sha256: collectionInput.stdout_sha256,
      stderr_sha256: collectionInput.stderr_sha256,
      transcript_sha256: collectionInput.transcript_sha256,
      provider_tool_execution_witness: {
        witness_source: "provider_specific_executed_tool",
        provider: collectionInput.provider,
        execution_id: `${collectionInput.collection_id}-TOOL`,
        collection_id: collectionInput.collection_id,
        helper_execution_id: collectionInput.helper_execution_id,
        runner_id: collectionInput.runner_id,
        launch_id: collectionInput.launch_id,
        tool_sha256: "9".repeat(64),
        profile_sha256: "8".repeat(64),
        argv_sha256: "7".repeat(64),
        transcript_sha256: "0".repeat(64),
        network_policy: "disabled",
        proof_authority: "none"
      },
      diagnostics: [`${projectRoot} bad witness diagnostic must be scrubbed`]
    })
  });
  assert.equal(
    invalidInjectedWitnessCollection.ok,
    false,
    "internal service-owned callbacks must not satisfy collection with a witness that fails current hash binding"
  );
  assert.equal(
    invalidInjectedWitnessCollection.collection_status,
    "blocked_provider_helper_collection_provider_tool_witness_missing"
  );
  assert.deepEqual(invalidInjectedWitnessCollection.provider_helper_collection.incomplete_os_enforcement_facts, [
    "provider_tool_execution_witness"
  ]);
  assert.equal(invalidInjectedWitnessCollection.provider_helper_collection.provider_tool_execution_witness_bound, false);
  assert.equal(invalidInjectedWitnessCollection.provider_helper_collection.provider_tool_execution_witness_sha256, null);
  assert.equal(invalidInjectedWitnessCollection.probe.ok, false);
  assert.equal(invalidInjectedWitnessCollection.probe.evidence.provider_tool_execution_witness_bound, false);
  assert.equal(JSON.stringify(invalidInjectedWitnessCollection).includes(projectRoot), false, "invalid witness output must not echo host paths");
  assert.equal(JSON.stringify(invalidInjectedWitnessCollection).includes("bad-witness-secret"), false, "invalid witness output must not echo secrets");

  const server = createComathServer();
  const missingWitnessResponse = await postCollection(
    server,
    projectRoot,
    projectId,
    helperExecution,
    readyRunner,
    launch,
    "ADAPTER-OSISO-HELPER-COLLECT-0203-NO-WITNESS",
    "missing-witness-secret"
  );
  assert.equal(missingWitnessResponse.status, 200, JSON.stringify(missingWitnessResponse.body));
  const missingWitnessCollection = missingWitnessResponse.body.collection;
  assert.equal(
    missingWitnessCollection.ok,
    false,
    "configured collection probe booleans cannot satisfy readiness without a provider-specific executed-tool witness"
  );
  assert.equal(
    missingWitnessCollection.collection_status,
    "blocked_provider_helper_collection_provider_tool_witness_missing"
  );
  assert.equal(missingWitnessCollection.provider_helper_collection.hashes_match_helper_execution, true);
  assert.equal(missingWitnessCollection.provider_helper_collection.os_enforcement_complete, false);
  assert.equal(
    missingWitnessCollection.provider_helper_collection.provider_tool_execution_witness_bound,
    false
  );
  assert.deepEqual(missingWitnessCollection.provider_helper_collection.incomplete_os_enforcement_facts, [
    "provider_tool_execution_witness"
  ]);
  assert.equal(missingWitnessCollection.probe.ok, false);
  assert.equal(missingWitnessCollection.probe.evidence.process_isolation_enforced, true);
  assert.equal(missingWitnessCollection.probe.evidence.provider_tool_execution_witness_bound, false);
  assert.equal(missingWitnessCollection.probe.evidence.provider_tool_execution_witness_sha256, undefined);
  assert.equal(missingWitnessCollection.adapter_execution_isolation.os_enforced, false);
  assert.equal(missingWitnessCollection.proof_authority, "none");
  assert.equal(missingWitnessCollection.can_certify_ga, false);
  assert.equal(missingWitnessCollection.blocker_certificate.blocker_code, "blocked_provider_helper_collection_provider_tool_witness_missing");
  assert.equal(JSON.stringify(missingWitnessResponse.body).includes(projectRoot), false, "route response must not echo host paths");
  assert.equal(JSON.stringify(missingWitnessResponse.body).includes("missing-witness-secret"), false, "route response must not echo secrets");

  const missingWitnessReadiness = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0203-NO-WITNESS-READINESS",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task203-missing-witness-test",
    evidence_path: missingWitnessCollection.probe.evidence_path
  });
  assert.equal(missingWitnessReadiness.ok, false, "missing provider-tool witness blocker must not satisfy readiness");

  process.env[probeArgsEnvVar] = JSON.stringify([witnessedProbeScript]);
  const witnessedResponse = await postCollection(
    server,
    projectRoot,
    projectId,
    helperExecution,
    readyRunner,
    launch,
    "ADAPTER-OSISO-HELPER-COLLECT-0203-WITNESSED",
    "witnessed-secret"
  );
  assert.equal(witnessedResponse.status, 200, JSON.stringify(witnessedResponse.body));
  const witnessedCollection = witnessedResponse.body.collection;
  assert.equal(witnessedCollection.ok, true, "provider-tool-witnessed complete collection can create canonical OS evidence");
  assert.equal(witnessedCollection.collection_status, "provider_helper_os_evidence_collected");
  assert.equal(witnessedCollection.provider_helper_collection.os_enforcement_complete, true);
  assert.equal(witnessedCollection.provider_helper_collection.provider_tool_execution_witness_bound, true);
  assert.match(witnessedCollection.provider_helper_collection.provider_tool_execution_witness_sha256, /^[a-f0-9]{64}$/);
  assert.equal(witnessedCollection.probe.ok, true);
  assert.equal(witnessedCollection.probe.evidence.process_isolation_enforced, true);
  assert.equal(witnessedCollection.probe.evidence.provider_tool_execution_witness_bound, true);
  assert.match(witnessedCollection.probe.evidence.provider_tool_execution_witness_sha256, /^[a-f0-9]{64}$/);
  assert.equal(witnessedCollection.probe.adapter_execution_isolation.os_enforced, true);
  assert.equal(witnessedCollection.adapter_execution_isolation.os_enforced, false);
  assert.equal(witnessedCollection.proof_authority, "none");
  assert.equal(witnessedCollection.can_certify_ga, false);
  assert.equal(JSON.stringify(witnessedResponse.body).includes(projectRoot), false, "witnessed route response must not echo host paths");
  assert.equal(JSON.stringify(witnessedResponse.body).includes("witnessed-secret"), false, "witnessed route response must not echo secrets");

  const witnessedReadiness = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0203-WITNESSED-READINESS",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task203-witnessed-test",
    evidence_path: witnessedCollection.probe.evidence_path
  });
  assert.equal(witnessedReadiness.ok, true, "provider-tool-witnessed canonical evidence can satisfy OS-isolation readiness");
  assert.equal(witnessedReadiness.proof_authority, "none");
  assert.equal(witnessedReadiness.can_certify_ga, false);

  const staleEvidencePath = writeStalePreTask203Evidence(
    projectRoot,
    witnessedCollection,
    "ADAPTER-OSISO-HELPER-COLLECT-0203-STALE-NO-WITNESS"
  );
  const staleReadiness = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0203-STALE-NO-WITNESS-READINESS",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task203-stale-witness-test",
    evidence_path: staleEvidencePath
  });
  assert.equal(staleReadiness.ok, false, "stale pre-Task203 evidence without provider-tool witness must not satisfy readiness");
  assert.equal(staleReadiness.checks.provider_tool_execution_witness.ok, false);
  assert.equal(
    staleReadiness.vetoes.some((veto) => veto.code === "adapter_os_isolation_provider_tool_execution_witness_missing"),
    true,
    "stale pre-Task203 evidence must receive a provider-tool witness readiness veto"
  );

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.os_isolation_provider_helper_collected" &&
        event.payload.collection_id === "ADAPTER-OSISO-HELPER-COLLECT-0203-NO-WITNESS" &&
        event.payload.collection_status === "blocked_provider_helper_collection_provider_tool_witness_missing" &&
        event.payload.provider_tool_execution_witness_bound === false &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "missing provider-tool witness blocker must be audit-visible and non-authoritative"
  );
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.os_isolation_provider_helper_collected" &&
        event.payload.collection_id === "ADAPTER-OSISO-HELPER-COLLECT-0203-WITNESSED" &&
        event.payload.ok === true &&
        event.payload.provider_tool_execution_witness_bound === true &&
        typeof event.payload.provider_tool_execution_witness_sha256 === "string" &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "provider-tool-witnessed helper collection must be audit-visible and non-authoritative"
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

console.log("Goal 3 Task203 provider-tool execution witness gate tests passed.");
