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

function sha256Text(text) {
  return createHash("sha256").update(text).digest("hex");
}

function readRepoFile(relativePath) {
  const here = dirname(fileURLToPath(import.meta.url));
  const repoRoot = join(here, "../../../..");
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function createHelperScript(projectRoot) {
  const helperScript = join(projectRoot, "task205-provider-helper.mjs");
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

const liveProbeExecutionBindingStatement = [
  "payload.provider_specific_live_probe_execution_bound = true;",
  "payload.provider_specific_live_probe_execution_id = process.env.COMATH_PROVIDER_SPECIFIC_LIVE_PROBE_EXECUTION_ID;",
  "payload.provider_specific_live_probe_execution_sha256 = process.env.COMATH_PROVIDER_SPECIFIC_LIVE_PROBE_EXECUTION_SHA256;",
  "payload.provider_specific_live_probe_tool_sha256 = process.env.COMATH_PROVIDER_SPECIFIC_LIVE_PROBE_TOOL_SHA256;",
  "payload.provider_specific_live_probe_argv_sha256 = process.env.COMATH_PROVIDER_SPECIFIC_LIVE_PROBE_ARGV_SHA256;",
  "payload.provider_specific_live_probe_stdout_sha256 = process.env.COMATH_PROVIDER_SPECIFIC_LIVE_PROBE_STDOUT_SHA256;",
  "payload.provider_specific_live_probe_stderr_sha256 = process.env.COMATH_PROVIDER_SPECIFIC_LIVE_PROBE_STDERR_SHA256;",
  "payload.provider_specific_live_probe_transcript_sha256 = process.env.COMATH_PROVIDER_SPECIFIC_LIVE_PROBE_TRANSCRIPT_SHA256;"
].join(" ");

function createCollectionProbeScript(projectRoot, { familyWitnessMode }) {
  const collectionProbeScript = join(projectRoot, `task205-${familyWitnessMode}-family-witness-collection-probe.mjs`);
  const includeFamilyWitness = familyWitnessMode !== "missing";
  const wrongFamilyProvider = familyWitnessMode === "wrong-provider";
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
      "  host_capability_tool_name: valueAfter('--provider-host-tool-name'),",
      "  host_capability_tool_sha256: valueAfter('--provider-host-tool-sha256'),",
      "  transcript_sha256: valueAfter('--transcript-sha256'),",
      "  network_policy: 'disabled',",
      "  proof_authority: 'none'",
      "};",
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
      includeFamilyWitness
        ? [
            "payload.provider_family_os_enforcement_witness = {",
            "  witness_source: 'provider_family_os_enforcement',",
            wrongFamilyProvider
              ? "  provider: 'firejail',"
              : "  provider: process.env.COMATH_OS_ISOLATION_PROVIDER,",
            "  execution_id: `${valueAfter('--collection-id')}-FAMILY`,",
            "  collection_id: valueAfter('--collection-id'),",
            "  helper_execution_id: valueAfter('--helper-execution-id'),",
            "  runner_id: process.env.COMATH_PROVIDER_RUNNER_ID,",
            "  launch_id: process.env.COMATH_SANDBOX_LAUNCH_ID,",
            "  host_validation_id: valueAfter('--host-validation-id'),",
            "  host_validation_path: valueAfter('--host-validation-path'),",
            "  host_validation_sha256: valueAfter('--host-validation-sha256'),",
            "  host_capability_probe_id: valueAfter('--host-capability-probe-id'),",
            "  host_capability_probe_path: valueAfter('--host-capability-probe-path'),",
            "  host_capability_probe_sha256: valueAfter('--host-capability-probe-sha256'),",
            "  host_capability_status: valueAfter('--host-capability-status'),",
            "  provider_host_capability_bound: valueAfter('--provider-host-capability-bound') === 'true',",
            "  provider_specific_tool_name: valueAfter('--provider-host-tool-name'),",
            "  provider_specific_tool_sha256: valueAfter('--provider-host-tool-sha256'),",
            "  provider_tool_sha256: valueAfter('--provider-tool-sha256'),",
            "  provider_tool_profile_sha256: valueAfter('--provider-tool-profile-sha256'),",
            "  provider_tool_argv_sha256: valueAfter('--provider-tool-argv-sha256'),",
            "  provider_family_execution_kind: valueAfter('--provider-family-execution-kind'),",
            "  provider_family_execution_profile_sha256: valueAfter('--provider-family-execution-profile-sha256'),",
            "  provider_family_execution_argv_sha256: valueAfter('--provider-family-execution-argv-sha256'),",
            "  collection_source: 'service_owned_os_probe',",
            "  process_isolation_enforced: true,",
            "  filesystem_scope_enforced: true,",
            "  network_isolation_enforced: true,",
            "  no_new_privileges: true,",
            "  escape_prevention: true,",
            "  adapter_process_exit_code: numberAfter('--helper-exit-code'),",
            "  stdout_sha256: valueAfter('--stdout-sha256'),",
            "  stderr_sha256: valueAfter('--stderr-sha256'),",
            "  transcript_sha256: valueAfter('--transcript-sha256'),",
            "  network_policy: 'disabled',",
            "  proof_authority: 'none'",
            "};"
          ].join("\n")
        : "",
      includeFamilyWitness
        ? "payload.provider_specific_live_probe_attempt = { attempt_source: 'provider_specific_live_os_probe', provider: process.env.COMATH_OS_ISOLATION_PROVIDER, execution_id: `${valueAfter('--collection-id')}-LIVE`, collection_id: valueAfter('--collection-id'), helper_execution_id: valueAfter('--helper-execution-id'), runner_id: process.env.COMATH_PROVIDER_RUNNER_ID, launch_id: process.env.COMATH_SANDBOX_LAUNCH_ID, provider_family_execution_kind: valueAfter('--provider-family-execution-kind'), provider_family_execution_profile_sha256: valueAfter('--provider-family-execution-profile-sha256'), provider_family_execution_argv_sha256: valueAfter('--provider-family-execution-argv-sha256'), provider_tool_sha256: valueAfter('--provider-tool-sha256'), provider_tool_profile_sha256: valueAfter('--provider-tool-profile-sha256'), provider_tool_argv_sha256: valueAfter('--provider-tool-argv-sha256'), transcript_sha256: valueAfter('--transcript-sha256'), collection_source: 'service_owned_os_probe', process_isolation_enforced: true, filesystem_scope_enforced: true, network_isolation_enforced: true, no_new_privileges: true, escape_prevention: true, adapter_process_exit_code: numberAfter('--helper-exit-code'), network_policy: 'disabled', proof_authority: 'none' };"
        : "",
      includeFamilyWitness ? liveProbeExecutionBindingStatement : "",
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
        notes: `${projectRoot} password=${actorSecret}`
      }
    }
  });
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

function deleteFamilyWitnessFields(target) {
  delete target.provider_family_os_enforcement_witness_required;
  delete target.provider_family_os_enforcement_witness_bound;
  delete target.provider_family_os_enforcement_witness_sha256;
}

function createLiveProbeExecutionScript(projectRoot) {
  const liveProbeExecutionScript = join(projectRoot, "task205-valid-live-probe-execution.mjs");
  writeFileSync(
    liveProbeExecutionScript,
    [
      "const args = process.argv.slice(2);",
      "const valueAfter = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : null; };",
      "const numberAfter = (flag) => Number(valueAfter(flag));",
      "const payload = {",
      "  comath_provider_specific_live_os_probe: true,",
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
      "  provider_family_execution_kind: valueAfter('--provider-family-execution-kind'),",
      "  provider_family_execution_profile_sha256: valueAfter('--provider-family-execution-profile-sha256'),",
      "  provider_family_execution_argv_sha256: valueAfter('--provider-family-execution-argv-sha256'),",
      "  provider_tool_sha256: valueAfter('--provider-tool-sha256'),",
      "  provider_tool_profile_sha256: valueAfter('--provider-tool-profile-sha256'),",
      "  provider_tool_argv_sha256: valueAfter('--provider-tool-argv-sha256'),",
      "  transcript_sha256: valueAfter('--transcript-sha256'),",
      "  collection_source: 'service_owned_os_probe',",
      "  process_isolation_enforced: true,",
      "  filesystem_scope_enforced: true,",
      "  network_isolation_enforced: true,",
      "  no_new_privileges: true,",
      "  escape_prevention: true,",
      "  adapter_process_exit_code: numberAfter('--helper-exit-code')",
      "};",
      "console.log(JSON.stringify(payload));"
    ].join("\n"),
    "utf8"
  );
  return liveProbeExecutionScript;
}

const task205Capability = "agent_adapter_os_isolation_provider_family_os_enforcement_witness_gate";
const task205TestName = "goal3-task205-agent-adapter-os-isolation-provider-family-enforcement-witness-gate.test.mjs";

assert.equal(
  getComathdStatus().capabilities.includes(task205Capability),
  true,
  "Task205 capability ledger must advertise provider-family OS-enforcement witness gating"
);

const smoke = readRepoFile("scripts/phase0-smoke.mjs");
const gaReleaseCriteria = readRepoFile("docs/architecture/ga-release-criteria.md");
assert.equal(smoke.includes(task205TestName), true, "phase0 smoke must discover the Task205 provider-family witness suite");
assert.equal(gaReleaseCriteria.includes(task205TestName), true, "GA release criteria must list the Task205 provider-family witness suite");

for (const [content, label] of [
  [readRepoFile("README.md"), "README.md"],
  [readRepoFile("AGENTS.md"), "AGENTS.md"],
  [readRepoFile("docs/architecture/adapter-contracts.md"), "docs/architecture/adapter-contracts.md"],
  [readRepoFile("docs/architecture/threat-model.md"), "docs/architecture/threat-model.md"],
  [gaReleaseCriteria, "docs/architecture/ga-release-criteria.md"],
  [readRepoFile("config/README.md"), "config/README.md"]
]) {
  assert.equal(content.includes("Task205"), true, `${label} must record the Task205 provider-family witness boundary`);
  assert.match(
    content,
    /provider-family OS-enforcement witness|provider_family_os_enforcement_witness/i,
    `${label} must name provider-family OS-enforcement witness gating`
  );
  assert.doesNotMatch(
    content,
    /Task205.{0,220}(?:certif(?:y|ies) GA|mathematical proof authority|real-Pi evidence|broad provider support|ships? production sandbox helpers?)/is,
    `${label} must not overclaim Task205 as proof, GA, real-Pi, broad provider support, or production helper shipment`
  );
}

const sampleConfig = readRepoFile("config/comath.sample.json");
assert.equal(
  sampleConfig.includes('"providerFamilyOsEnforcementWitnessRequired": true'),
  true,
  "sample config must record that complete provider-helper collection requires provider-family OS-enforcement witness binding"
);
assert.match(
  readRepoFile("TODO.md"),
  /Task184-20[5-9]/,
  "TODO must roll the provider-helper deferred-chain summary through Task205 or later"
);
assert.equal(readRepoFile("REVIEW.md").includes("Goal 3 Task 205"), true, "REVIEW must include Task205 verification evidence");
assert.equal(readRepoFile("goal-3/tasks.md").includes("## Task205"), true, "Goal 3 tracker must record Task205 before the next frontier");

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task205-provider-family-witness-"));
const probeEnvVar = "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_COLLECTION_PROBE";
const probeArgsEnvVar = "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_COLLECTION_PROBE_ARGS_JSON";
const liveProbeEnvVar = "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_LIVE_PROBE";
const liveProbeArgsEnvVar = "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_LIVE_PROBE_ARGS_JSON";
const previousProbeEnv = process.env[probeEnvVar];
const previousProbeArgsEnv = process.env[probeArgsEnvVar];
const previousLiveProbeEnv = process.env[liveProbeEnvVar];
const previousLiveProbeArgsEnv = process.env[liveProbeArgsEnvVar];

try {
  const init = initProject({
    name: "Goal3 Task205 Adapter OS Isolation Provider Family Witness",
    root_path: projectRoot
  });
  const projectId = init.project.project_id;
  const helperScript = createHelperScript(projectRoot);
  const missingFamilyProbe = createCollectionProbeScript(projectRoot, { familyWitnessMode: "missing" });
  const wrongFamilyProbe = createCollectionProbeScript(projectRoot, { familyWitnessMode: "wrong-provider" });
  const validFamilyProbe = createCollectionProbeScript(projectRoot, { familyWitnessMode: "valid" });
  const validLiveProbeExecution = createLiveProbeExecutionScript(projectRoot);
  const helperBinarySha256 = sha256File(process.execPath);
  process.env[probeEnvVar] = process.execPath;
  delete process.env[liveProbeEnvVar];
  delete process.env[liveProbeArgsEnvVar];

  const launch = prepareAgentAdapterOsIsolationSandboxLaunch(projectRoot, {
    project_id: projectId,
    launch_id: "ADAPTER-OSISO-LAUNCH-0205-READY",
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
    runner_id: "ADAPTER-OSISO-RUNNER-0205-READY",
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
      helper_profile_source: "operator_configured_provider_helper",
      production_helper_configured: true,
      bundled_protocol_asset: false,
      diagnostics: [`${projectRoot} runner diagnostic must be scrubbed`, "runner resolved"]
    })
  });
  assert.equal(readyRunner.ok, true);

  const hostCapability = probeAgentAdapterOsIsolationProviderHostCapability(projectRoot, {
    project_id: projectId,
    host_capability_probe_id: "ADAPTER-OSISO-HOST-CAP-0205-READY",
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
        capability_facts: [{ capability: "task205 provider family witness candidate observed", observed: true, evidence_sha256: "b".repeat(64), notes: null }],
        required_tools: [{ name: "windows_checknetisolation", present: true, binary_sha256: helperBinarySha256, version: null }],
        kernel_features: [{ name: "task205-provider-host-capability", observed: true, evidence_sha256: "c".repeat(64), notes: null }],
        diagnostics: [`${projectRoot} host capability diagnostic must be scrubbed`, "host capability observed"]
      };
    }
  });
  assert.equal(hostCapability.ok, true);

  const readyHost = validateAgentAdapterOsIsolationProviderHelperHost(projectRoot, {
    project_id: projectId,
    host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0205-READY",
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
      helper_profile_source: "operator_configured_provider_helper",
      production_helper_configured: true,
      bundled_protocol_asset: false,
      supported_platforms: ["win32"],
      diagnostics: [`${projectRoot} host validation diagnostic must be scrubbed`, "helper host ready"]
    })
  });
  assert.equal(readyHost.ok, true);

  const helperExecution = runAgentAdapterOsIsolationProviderHelperExecution(projectRoot, {
    project_id: projectId,
    helper_execution_id: "ADAPTER-OSISO-HELPER-0205-READY",
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
      helper_profile_source: "operator_configured_provider_helper",
      production_helper_configured: true,
      bundled_protocol_asset: false,
      timeout_ms: 5000,
      diagnostics: [`${projectRoot} helper config diagnostic must be scrubbed`, "helper configured"]
    })
  });
  assert.equal(helperExecution.ok, true);
  assert.equal(helperExecution.provider_helper_execution.runtime_attestation_bound, true);

  const server = createComathServer();
  process.env[probeArgsEnvVar] = JSON.stringify([missingFamilyProbe]);
  const missingFamilyResponse = await postCollection(
    server,
    projectRoot,
    projectId,
    helperExecution,
    readyRunner,
    launch,
    "ADAPTER-OSISO-HELPER-COLLECT-0205-MISSING-FAMILY",
    "missing-family-secret"
  );
  assert.equal(missingFamilyResponse.status, 200, JSON.stringify(missingFamilyResponse.body));
  const missingFamily = missingFamilyResponse.body.collection;
  assert.equal(missingFamily.ok, false, "Task204-valid complete facts must not satisfy collection without provider-family OS-enforcement witness");
  assert.equal(
    missingFamily.collection_status,
    "blocked_provider_helper_collection_provider_family_os_enforcement_witness_missing"
  );
  assert.equal(missingFamily.provider_helper_collection.provider_family_os_enforcement_witness_required, true);
  assert.equal(missingFamily.provider_helper_collection.provider_family_os_enforcement_witness_bound, false);
  assert.equal(missingFamily.probe.ok, false);
  assert.equal(missingFamily.probe.evidence.provider_family_os_enforcement_witness_bound, false);
  assert.equal(missingFamily.proof_authority, "none");
  assert.equal(missingFamily.can_certify_ga, false);
  assert.equal(JSON.stringify(missingFamilyResponse.body).includes(projectRoot), false, "missing-family route response must not echo host paths");
  assert.equal(JSON.stringify(missingFamilyResponse.body).includes("missing-family-secret"), false, "missing-family route response must not echo secrets");

  const missingFamilyReadiness = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0205-MISSING-FAMILY-READINESS",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task205-missing-family-test",
    evidence_path: missingFamily.probe.evidence_path
  });
  assert.equal(missingFamilyReadiness.ok, false, "missing provider-family witness must not satisfy readiness");
  assert.equal(missingFamilyReadiness.checks.provider_tool_execution_witness.ok, true);
  assert.equal(missingFamilyReadiness.checks.provider_specific_tool_execution.ok, true);
  assert.equal(missingFamilyReadiness.checks.provider_family_os_enforcement_witness.ok, false);
  assert.equal(
    missingFamilyReadiness.vetoes.some((veto) => veto.code === "adapter_os_isolation_provider_family_os_enforcement_witness_missing"),
    true,
    "readiness must report a provider-family witness veto"
  );

  process.env[probeArgsEnvVar] = JSON.stringify([wrongFamilyProbe]);
  const wrongFamilyResponse = await postCollection(
    server,
    projectRoot,
    projectId,
    helperExecution,
    readyRunner,
    launch,
    "ADAPTER-OSISO-HELPER-COLLECT-0205-WRONG-FAMILY",
    "wrong-family-secret"
  );
  assert.equal(wrongFamilyResponse.status, 200, JSON.stringify(wrongFamilyResponse.body));
  const wrongFamily = wrongFamilyResponse.body.collection;
  assert.equal(wrongFamily.ok, false, "provider-family witness with mismatched provider must fail closed");
  assert.equal(
    wrongFamily.collection_status,
    "blocked_provider_helper_collection_incomplete_os_enforcement"
  );
  assert.equal(wrongFamily.provider_helper_collection.provider_family_os_enforcement_witness_required, true);
  assert.equal(wrongFamily.provider_helper_collection.provider_family_os_enforcement_witness_bound, false);

  process.env[probeArgsEnvVar] = JSON.stringify([validFamilyProbe]);
  process.env[liveProbeEnvVar] = process.execPath;
  process.env[liveProbeArgsEnvVar] = JSON.stringify([validLiveProbeExecution]);
  const validFamilyResponse = await postCollection(
    server,
    projectRoot,
    projectId,
    helperExecution,
    readyRunner,
    launch,
    "ADAPTER-OSISO-HELPER-COLLECT-0205-FAMILY-BOUND",
    "family-bound-secret"
  );
  assert.equal(validFamilyResponse.status, 200, JSON.stringify(validFamilyResponse.body));
  const validFamily = validFamilyResponse.body.collection;
  assert.equal(validFamily.ok, true, "provider-family witness-bound configured collection can produce canonical OS evidence");
  assert.equal(validFamily.collection_status, "provider_helper_os_evidence_collected");
  assert.equal(validFamily.provider_helper_collection.provider_tool_execution_witness_bound, true);
  assert.equal(validFamily.provider_helper_collection.provider_specific_tool_execution_bound, true);
  assert.equal(validFamily.provider_helper_collection.provider_family_os_enforcement_witness_required, true);
  assert.equal(validFamily.provider_helper_collection.provider_family_os_enforcement_witness_bound, true);
  assert.match(validFamily.provider_helper_collection.provider_family_os_enforcement_witness_sha256, /^[a-f0-9]{64}$/);
  assert.equal(validFamily.probe.ok, true);
  assert.equal(validFamily.probe.evidence.provider_family_os_enforcement_witness_bound, true);
  assert.equal(
    validFamily.probe.evidence.provider_family_os_enforcement_witness_sha256,
    validFamily.provider_helper_collection.provider_family_os_enforcement_witness_sha256
  );
  assert.equal(validFamily.proof_authority, "none");
  assert.equal(validFamily.can_certify_ga, false);
  assert.equal(JSON.stringify(validFamilyResponse.body).includes(projectRoot), false, "valid-family route response must not echo host paths");
  assert.equal(JSON.stringify(validFamilyResponse.body).includes("family-bound-secret"), false, "valid-family route response must not echo secrets");

  const validFamilyReadiness = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0205-FAMILY-BOUND-READINESS",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task205-family-bound-test",
    evidence_path: validFamily.probe.evidence_path
  });
  assert.equal(validFamilyReadiness.ok, true, "provider-family witness-bound canonical evidence can satisfy OS-isolation readiness");
  assert.equal(validFamilyReadiness.checks.provider_family_os_enforcement_witness.ok, true);
  assert.equal(validFamilyReadiness.proof_authority, "none");
  assert.equal(validFamilyReadiness.can_certify_ga, false);

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.os_isolation_provider_helper_collected" &&
        event.payload.collection_id === "ADAPTER-OSISO-HELPER-COLLECT-0205-MISSING-FAMILY" &&
        event.payload.collection_status === "blocked_provider_helper_collection_provider_family_os_enforcement_witness_missing" &&
        event.payload.provider_family_os_enforcement_witness_bound === false &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "missing provider-family witness blocker must be audit-visible and non-authoritative"
  );
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.os_isolation_provider_helper_collected" &&
        event.payload.collection_id === "ADAPTER-OSISO-HELPER-COLLECT-0205-FAMILY-BOUND" &&
        event.payload.ok === true &&
        event.payload.provider_family_os_enforcement_witness_bound === true &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "provider-family witness-bound helper collection must be audit-visible and non-authoritative"
  );
  assert.equal(JSON.stringify(events).includes(projectRoot), false, "audit events must not echo host paths");

  rewriteCollection(projectRoot, validFamily, (manifest) => {
    deleteFamilyWitnessFields(manifest.provider_helper_collection);
  });
  rewriteEvidenceAndProbe(projectRoot, validFamily, (evidence) => {
    deleteFamilyWitnessFields(evidence);
  });
  const stalePreTask205Readiness = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0205-STALE-PRE-TASK205-READINESS",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task205-stale-pre-task205-test",
    evidence_path: validFamily.probe.evidence_path
  });
  assert.equal(
    stalePreTask205Readiness.ok,
    false,
    "stale Task204-valid collection evidence without provider-family OS-enforcement witness must fail closed"
  );
  assert.equal(stalePreTask205Readiness.checks.provider_tool_execution_witness.ok, true);
  assert.equal(stalePreTask205Readiness.checks.provider_specific_tool_execution.ok, true);
  assert.equal(stalePreTask205Readiness.checks.provider_family_os_enforcement_witness.ok, false);
  assert.equal(
    stalePreTask205Readiness.vetoes.some((veto) => veto.code === "adapter_os_isolation_provider_family_os_enforcement_witness_missing"),
    true,
    "stale pre-Task205 evidence must report the provider-family witness veto"
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
  if (previousLiveProbeEnv === undefined) {
    delete process.env[liveProbeEnvVar];
  } else {
    process.env[liveProbeEnvVar] = previousLiveProbeEnv;
  }
  if (previousLiveProbeArgsEnv === undefined) {
    delete process.env[liveProbeArgsEnvVar];
  } else {
    process.env[liveProbeArgsEnvVar] = previousLiveProbeArgsEnv;
  }
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task205 provider-family OS-enforcement witness tests passed.");
