import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
  const helperScript = join(projectRoot, "task208-provider-helper.mjs");
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
      "console.log(JSON.stringify(payload));"
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

function createLiveProbeScript(projectRoot, { mode }) {
  const liveProbeScript = join(projectRoot, `task208-${mode}-provider-specific-live-probe.mjs`);
  const wrongProfile = mode === "wrong-profile";
  writeFileSync(
    liveProbeScript,
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
      wrongProfile
        ? "  provider_family_execution_profile_sha256: 'd'.repeat(64),"
        : "  provider_family_execution_profile_sha256: valueAfter('--provider-family-execution-profile-sha256'),",
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
      "console.log(JSON.stringify(payload));",
      "console.error('provider-specific live probe stderr ok');"
    ].join("\n"),
    "utf8"
  );
  return liveProbeScript;
}

function createCollectionProbeScript(projectRoot) {
  const collectionProbeScript = join(projectRoot, "task208-live-probe-execution-collection-probe.mjs");
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
      "payload.provider_family_os_enforcement_witness = {",
      "  witness_source: 'provider_family_os_enforcement',",
      "  provider: process.env.COMATH_OS_ISOLATION_PROVIDER,",
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
      "};",
      "payload.provider_specific_live_probe_attempt = {",
      "  attempt_source: 'provider_specific_live_os_probe',",
      "  provider: process.env.COMATH_OS_ISOLATION_PROVIDER,",
      "  execution_id: `${valueAfter('--collection-id')}-LIVE`,",
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
      "  adapter_process_exit_code: numberAfter('--helper-exit-code'),",
      "  network_policy: 'disabled',",
      "  proof_authority: 'none'",
      "};",
      liveProbeExecutionBindingStatement,
      "console.log(JSON.stringify(payload));"
    ].join("\n"),
    "utf8"
  );
  return collectionProbeScript;
}

function writeStalePreTask208Evidence(projectRoot, sourceCollection, staleProbeId) {
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
  delete staleEvidence.provider_specific_live_probe_execution_required;
  delete staleEvidence.provider_specific_live_probe_execution_bound;
  delete staleEvidence.provider_specific_live_probe_execution_sha256;

  const evidenceText = JSON.stringify(staleEvidence);
  const evidenceSha256 = createHash("sha256").update(evidenceText).digest("hex");
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
      ...sourceCollection.provider_helper_collection,
      provider_specific_live_probe_execution_required: false,
      provider_specific_live_probe_execution_bound: false,
      provider_specific_live_probe_execution_sha256: null
    }
  };
  writeFileSync(join(staleDir, "provider-helper-collection.json"), JSON.stringify(staleCollection), "utf8");
  return staleCollection;
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

const task208Capability = "agent_adapter_os_isolation_provider_specific_live_probe_execution_gate";
const task208TestName = "goal3-task208-agent-adapter-os-isolation-provider-specific-live-probe-execution-gate.test.mjs";

assert.equal(
  getComathdStatus().capabilities.includes(task208Capability),
  true,
  "Task208 capability ledger must advertise provider-specific live probe execution gating"
);

const smoke = readRepoFile("scripts/phase0-smoke.mjs");
const gaReleaseCriteria = readRepoFile("docs/architecture/ga-release-criteria.md");
assert.equal(smoke.includes(task208TestName), true, "phase0 smoke must discover the Task208 provider-specific live probe execution suite");
assert.equal(gaReleaseCriteria.includes(task208TestName), true, "GA release criteria must list the Task208 provider-specific live probe execution suite");

for (const [content, label] of [
  [readRepoFile("README.md"), "README.md"],
  [readRepoFile("AGENTS.md"), "AGENTS.md"],
  [readRepoFile("TODO.md"), "TODO.md"],
  [readRepoFile("REVIEW.md"), "REVIEW.md"],
  [readRepoFile("goal-3/tasks.md"), "goal-3/tasks.md"],
  [readRepoFile("docs/architecture/adapter-contracts.md"), "docs/architecture/adapter-contracts.md"],
  [readRepoFile("docs/architecture/threat-model.md"), "docs/architecture/threat-model.md"],
  [gaReleaseCriteria, "docs/architecture/ga-release-criteria.md"],
  [readRepoFile("config/README.md"), "config/README.md"]
]) {
  assert.equal(content.includes("Task208"), true, `${label} must record the Task208 provider-specific live probe execution boundary`);
  assert.match(
    content,
    /provider-specific live probe execution|provider_specific_live_probe_execution/i,
    `${label} must name provider-specific live probe execution gating`
  );
  if (label !== "goal-3/tasks.md") {
    assert.doesNotMatch(
      content,
      /Task208.{0,240}(?:certif(?:y|ies) GA|mathematical proof authority|real-Pi evidence|broad provider support|ships? production sandbox helpers?|inspects? daemon|inspects? sandbox policy)/is,
      `${label} must not overclaim Task208 as proof, GA, real-Pi, broad provider support, production helper shipment, or real daemon/policy inspection`
    );
  }
}

assert.equal(
  readRepoFile("config/comath.sample.json").includes('"providerSpecificLiveProbeExecutionRequired": true'),
  true,
  "sample config must record that configured complete provider-helper collection requires service-owned live probe execution binding"
);

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task208-live-probe-execution-"));
const collectionProbeEnvVar = "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_COLLECTION_PROBE";
const collectionProbeArgsEnvVar = "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_COLLECTION_PROBE_ARGS_JSON";
const liveProbeEnvVar = "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_LIVE_PROBE";
const liveProbeArgsEnvVar = "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_LIVE_PROBE_ARGS_JSON";
const previousCollectionProbeEnv = process.env[collectionProbeEnvVar];
const previousCollectionProbeArgsEnv = process.env[collectionProbeArgsEnvVar];
const previousLiveProbeEnv = process.env[liveProbeEnvVar];
const previousLiveProbeArgsEnv = process.env[liveProbeArgsEnvVar];

try {
  const init = initProject({
    name: "Goal3 Task208 Adapter OS Isolation Provider-Specific Live Probe Execution",
    root_path: projectRoot
  });
  const projectId = init.project.project_id;
  const helperScript = createHelperScript(projectRoot);
  const collectionProbeScript = createCollectionProbeScript(projectRoot);
  const validLiveProbeScript = createLiveProbeScript(projectRoot, { mode: "valid" });
  const wrongLiveProbeScript = createLiveProbeScript(projectRoot, { mode: "wrong-profile" });
  const helperBinarySha256 = sha256File(process.execPath);
  process.env[collectionProbeEnvVar] = process.execPath;
  process.env[collectionProbeArgsEnvVar] = JSON.stringify([collectionProbeScript]);

  const launch = prepareAgentAdapterOsIsolationSandboxLaunch(projectRoot, {
    project_id: projectId,
    launch_id: "ADAPTER-OSISO-LAUNCH-0208-READY",
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=launch-secret`,
    requested_provider: "windows_appcontainer",
    launcher_environment: { platform: "win32", notes: `${projectRoot} password=launcher-secret` }
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
    runner_id: "ADAPTER-OSISO-RUNNER-0208-READY",
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=runner-secret`,
    requested_provider: "windows_appcontainer",
    runner_environment: { platform: "win32", notes: `${projectRoot} password=runner-secret` }
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
    host_capability_probe_id: "ADAPTER-OSISO-HOST-CAP-0208-READY",
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=host-capability-secret`,
    requested_provider: "windows_appcontainer",
    host_capability_environment: { platform: "caller-spoofed-platform", notes: `${projectRoot} password=host-capability-secret` }
  }, {
    provider_host_capability_probe: (probeInput) => {
      assert.equal(probeInput.provider, "windows_appcontainer");
      assert.equal(probeInput.platform, process.platform);
      return {
        probe_source: "service_owned_provider_host_capability_probe",
        provider_host_capability_available: true,
        capability_facts: [{ capability: "task208 provider-specific live probe execution candidate observed", observed: true, evidence_sha256: "b".repeat(64), notes: null }],
        required_tools: [{ name: "windows_checknetisolation", present: true, binary_sha256: helperBinarySha256, version: null }],
        kernel_features: [{ name: "task208-provider-host-capability", observed: true, evidence_sha256: "c".repeat(64), notes: null }],
        diagnostics: [`${projectRoot} host capability diagnostic must be scrubbed`, "host capability observed"]
      };
    }
  });
  assert.equal(hostCapability.ok, true);

  const readyHost = validateAgentAdapterOsIsolationProviderHelperHost(projectRoot, {
    project_id: projectId,
    host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0208-READY",
    host_capability_probe_id: hostCapability.host_capability_probe_id,
    runner_id: readyRunner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=host-secret`,
    requested_provider: "windows_appcontainer",
    host_environment: { platform: "win32", notes: `${projectRoot} password=host-secret` }
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
    helper_execution_id: "ADAPTER-OSISO-HELPER-0208-READY",
    host_validation_id: readyHost.host_validation_id,
    runner_id: readyRunner.runner_id,
    launch_id: launch.launch_id,
    adapter_id: "codex-cli",
    backend: "external",
    actor: `${projectRoot} token=helper-secret`,
    requested_provider: "windows_appcontainer",
    helper_environment: { platform: "win32", notes: `${projectRoot} password=helper-secret` }
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
  delete process.env[liveProbeEnvVar];
  delete process.env[liveProbeArgsEnvVar];
  const missingLiveProbeExecutionResponse = await postCollection(
    server,
    projectRoot,
    projectId,
    helperExecution,
    readyRunner,
    launch,
    "ADAPTER-OSISO-HELPER-COLLECT-0208-MISSING-LIVE-EXEC",
    "missing-live-exec-secret"
  );
  assert.equal(missingLiveProbeExecutionResponse.status, 200, JSON.stringify(missingLiveProbeExecutionResponse.body));
  const missingLiveProbeExecution = missingLiveProbeExecutionResponse.body.collection;
  assert.equal(missingLiveProbeExecution.ok, false, "configured complete facts must not satisfy collection without a service-owned live probe execution");
  assert.equal(
    missingLiveProbeExecution.collection_status,
    "blocked_provider_helper_collection_provider_specific_live_probe_execution_missing"
  );
  assert.equal(missingLiveProbeExecution.provider_helper_collection.provider_specific_live_probe_attempt_bound, true);
  assert.equal(missingLiveProbeExecution.provider_helper_collection.provider_specific_live_probe_execution_required, true);
  assert.equal(missingLiveProbeExecution.provider_helper_collection.provider_specific_live_probe_execution_bound, false);
  assert.equal(missingLiveProbeExecution.probe.evidence.provider_specific_live_probe_attempt_bound, true);
  assert.equal(missingLiveProbeExecution.probe.evidence.provider_specific_live_probe_execution_bound, false);
  assert.equal(missingLiveProbeExecution.proof_authority, "none");
  assert.equal(missingLiveProbeExecution.can_certify_ga, false);

  process.env[liveProbeEnvVar] = process.execPath;
  process.env[liveProbeArgsEnvVar] = JSON.stringify([wrongLiveProbeScript]);
  const wrongLiveProbeExecutionResponse = await postCollection(
    server,
    projectRoot,
    projectId,
    helperExecution,
    readyRunner,
    launch,
    "ADAPTER-OSISO-HELPER-COLLECT-0208-WRONG-LIVE-EXEC",
    "wrong-live-exec-secret"
  );
  assert.equal(wrongLiveProbeExecutionResponse.status, 200, JSON.stringify(wrongLiveProbeExecutionResponse.body));
  const wrongLiveProbeExecution = wrongLiveProbeExecutionResponse.body.collection;
  assert.equal(wrongLiveProbeExecution.ok, false, "mismatched provider-specific live probe execution must fail closed");
  assert.equal(
    wrongLiveProbeExecution.collection_status,
    "blocked_provider_helper_collection_provider_specific_live_probe_execution_missing"
  );
  assert.equal(wrongLiveProbeExecution.provider_helper_collection.provider_specific_live_probe_execution_bound, false);

  process.env[liveProbeEnvVar] = process.execPath;
  process.env[liveProbeArgsEnvVar] = JSON.stringify([validLiveProbeScript]);
  const boundLiveProbeExecutionResponse = await postCollection(
    server,
    projectRoot,
    projectId,
    helperExecution,
    readyRunner,
    launch,
    "ADAPTER-OSISO-HELPER-COLLECT-0208-LIVE-EXEC-BOUND",
    "live-exec-bound-secret"
  );
  assert.equal(boundLiveProbeExecutionResponse.status, 200, JSON.stringify(boundLiveProbeExecutionResponse.body));
  const boundLiveProbeExecution = boundLiveProbeExecutionResponse.body.collection;
  assert.equal(boundLiveProbeExecution.ok, true, JSON.stringify(boundLiveProbeExecution.provider_helper_collection));
  assert.equal(boundLiveProbeExecution.collection_status, "provider_helper_os_evidence_collected");
  assert.equal(boundLiveProbeExecution.provider_helper_collection.provider_specific_live_probe_attempt_bound, true);
  assert.equal(boundLiveProbeExecution.provider_helper_collection.provider_specific_live_probe_execution_required, true);
  assert.equal(boundLiveProbeExecution.provider_helper_collection.provider_specific_live_probe_execution_bound, true);
  assert.match(boundLiveProbeExecution.provider_helper_collection.provider_specific_live_probe_execution_sha256, /^[a-f0-9]{64}$/);
  assert.equal(boundLiveProbeExecution.probe.evidence.provider_specific_live_probe_execution_bound, true);
  assert.equal(
    boundLiveProbeExecution.probe.evidence.provider_specific_live_probe_execution_sha256,
    boundLiveProbeExecution.provider_helper_collection.provider_specific_live_probe_execution_sha256
  );
  assert.equal(JSON.stringify(boundLiveProbeExecutionResponse.body).includes(projectRoot), false, "bound live probe route response must not echo host paths");
  assert.equal(JSON.stringify(boundLiveProbeExecutionResponse.body).includes("live-exec-bound-secret"), false, "bound live probe route response must not echo secrets");

  const readiness = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0208-LIVE-EXEC-BOUND-READINESS",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task208-live-exec-bound-test",
    evidence_path: boundLiveProbeExecution.probe.evidence_path
  });
  assert.equal(readiness.ok, true, "service-owned live-probe-execution-bound canonical evidence can satisfy OS-isolation readiness");
  assert.equal(readiness.checks.provider_specific_live_probe_attempt.ok, true);
  assert.equal(readiness.checks.provider_specific_live_probe_execution.ok, true);
  assert.equal(readiness.proof_authority, "none");
  assert.equal(readiness.can_certify_ga, false);

  const stalePreTask208 = writeStalePreTask208Evidence(
    projectRoot,
    boundLiveProbeExecution,
    "ADAPTER-OSISO-HELPER-COLLECT-0208-STALE-PRE-TASK208"
  );
  const staleReadiness = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0208-STALE-PRE-TASK208-READINESS",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task208-stale-pre-task208-test",
    evidence_path: stalePreTask208.probe.evidence_path
  });
  assert.equal(staleReadiness.ok, false, "stale pre-Task208 canonical evidence without live-probe-execution binding must fail readiness");
  assert.equal(staleReadiness.checks.provider_specific_live_probe_execution.ok, false);
  assert.equal(
    staleReadiness.vetoes.some((veto) => veto.code === "adapter_os_isolation_provider_specific_live_probe_execution_missing"),
    true,
    "stale pre-Task208 evidence must report the provider-specific live probe execution veto"
  );

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.os_isolation_provider_helper_collected" &&
        event.payload.collection_id === "ADAPTER-OSISO-HELPER-COLLECT-0208-MISSING-LIVE-EXEC" &&
        event.payload.collection_status === "blocked_provider_helper_collection_provider_specific_live_probe_execution_missing" &&
        event.payload.provider_specific_live_probe_attempt_bound === true &&
        event.payload.provider_specific_live_probe_execution_bound === false &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "missing provider-specific live probe execution blocker must be audit-visible and non-authoritative"
  );
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.os_isolation_provider_helper_collected" &&
        event.payload.collection_id === "ADAPTER-OSISO-HELPER-COLLECT-0208-LIVE-EXEC-BOUND" &&
        event.payload.ok === true &&
        event.payload.provider_specific_live_probe_execution_bound === true &&
        /^[a-f0-9]{64}$/.test(event.payload.provider_specific_live_probe_execution_sha256) &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "provider-specific live-probe-execution-bound helper collection must be audit-visible and non-authoritative"
  );
} finally {
  if (previousCollectionProbeEnv === undefined) {
    delete process.env[collectionProbeEnvVar];
  } else {
    process.env[collectionProbeEnvVar] = previousCollectionProbeEnv;
  }
  if (previousCollectionProbeArgsEnv === undefined) {
    delete process.env[collectionProbeArgsEnvVar];
  } else {
    process.env[collectionProbeArgsEnvVar] = previousCollectionProbeArgsEnv;
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

console.log("Goal 3 Task208 provider-specific live probe execution gate tests passed.");
