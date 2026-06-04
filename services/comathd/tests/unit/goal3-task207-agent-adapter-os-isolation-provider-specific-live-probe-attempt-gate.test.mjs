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
  const helperScript = join(projectRoot, "task207-provider-helper.mjs");
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

function createCollectionProbeScript(projectRoot, { liveProbeMode }) {
  const collectionProbeScript = join(projectRoot, `task207-${liveProbeMode}-live-probe-attempt-collection-probe.mjs`);
  const includeLiveProbe = liveProbeMode !== "missing";
  const wrongLiveProbe = liveProbeMode === "wrong-live-probe";
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
      "payload.provider_family_os_enforcement_witness.provider_family_execution_kind = 'windows_appcontainer_os_probe';",
      "payload.provider_family_os_enforcement_witness.provider_family_execution_profile_sha256 = valueAfter('--provider-family-execution-profile-sha256');",
      "payload.provider_family_os_enforcement_witness.provider_family_execution_argv_sha256 = valueAfter('--provider-family-execution-argv-sha256');",
      includeLiveProbe
        ? [
            "payload.provider_specific_live_probe_attempt = {",
            "  attempt_source: 'provider_specific_live_os_probe',",
            "  provider: process.env.COMATH_OS_ISOLATION_PROVIDER,",
            "  execution_id: `${valueAfter('--collection-id')}-LIVE`,",
            "  collection_id: valueAfter('--collection-id'),",
            "  helper_execution_id: valueAfter('--helper-execution-id'),",
            "  runner_id: process.env.COMATH_PROVIDER_RUNNER_ID,",
            "  launch_id: process.env.COMATH_SANDBOX_LAUNCH_ID,",
            "  provider_family_execution_kind: 'windows_appcontainer_os_probe',",
            wrongLiveProbe
              ? "  provider_family_execution_profile_sha256: 'e'.repeat(64),"
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
            "  adapter_process_exit_code: numberAfter('--helper-exit-code'),",
            "  network_policy: 'disabled',",
            "  proof_authority: 'none'",
            "};"
          ].join("\n")
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
        notes: `${projectRoot} password=${actorSecret}`
      }
    }
  });
}

const task207Capability = "agent_adapter_os_isolation_provider_specific_live_probe_attempt_gate";
const task207TestName = "goal3-task207-agent-adapter-os-isolation-provider-specific-live-probe-attempt-gate.test.mjs";

assert.equal(
  getComathdStatus().capabilities.includes(task207Capability),
  true,
  "Task207 capability ledger must advertise provider-specific live probe attempt gating"
);

const smoke = readRepoFile("scripts/phase0-smoke.mjs");
const gaReleaseCriteria = readRepoFile("docs/architecture/ga-release-criteria.md");
assert.equal(smoke.includes(task207TestName), true, "phase0 smoke must discover the Task207 provider-specific live probe attempt suite");
assert.equal(gaReleaseCriteria.includes(task207TestName), true, "GA release criteria must list the Task207 provider-specific live probe attempt suite");

for (const [content, label] of [
  [readRepoFile("README.md"), "README.md"],
  [readRepoFile("AGENTS.md"), "AGENTS.md"],
  [readRepoFile("docs/architecture/adapter-contracts.md"), "docs/architecture/adapter-contracts.md"],
  [readRepoFile("docs/architecture/threat-model.md"), "docs/architecture/threat-model.md"],
  [gaReleaseCriteria, "docs/architecture/ga-release-criteria.md"],
  [readRepoFile("config/README.md"), "config/README.md"]
]) {
  assert.equal(content.includes("Task207"), true, `${label} must record the Task207 provider-specific live probe attempt boundary`);
  assert.match(
    content,
    /provider-specific live probe attempt|provider_specific_live_probe_attempt/i,
    `${label} must name provider-specific live probe attempt gating`
  );
  assert.doesNotMatch(
    content,
    /Task207.{0,220}(?:certif(?:y|ies) GA|mathematical proof authority|real-Pi evidence|broad provider support|ships? production sandbox helpers?)/is,
    `${label} must not overclaim Task207 as proof, GA, real-Pi, broad provider support, or production helper shipment`
  );
}

const sampleConfig = readRepoFile("config/comath.sample.json");
assert.equal(
  sampleConfig.includes('"providerSpecificLiveProbeAttemptRequired": true'),
  true,
  "sample config must record that complete provider-helper collection requires provider-specific live probe attempt binding"
);
assert.equal(readRepoFile("TODO.md").includes("Task184-207"), true, "TODO must roll the provider-helper deferred-chain summary through Task207");
assert.equal(readRepoFile("REVIEW.md").includes("Goal 3 Task 207"), true, "REVIEW must include Task207 verification evidence");
assert.equal(readRepoFile("goal-3/tasks.md").includes("## Task207"), true, "Goal 3 tracker must record Task207 before the next frontier");

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task207-live-probe-attempt-"));
const probeEnvVar = "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_COLLECTION_PROBE";
const probeArgsEnvVar = "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_COLLECTION_PROBE_ARGS_JSON";
const previousProbeEnv = process.env[probeEnvVar];
const previousProbeArgsEnv = process.env[probeArgsEnvVar];

try {
  const init = initProject({
    name: "Goal3 Task207 Adapter OS Isolation Provider-Specific Live Probe Attempt",
    root_path: projectRoot
  });
  const projectId = init.project.project_id;
  const helperScript = createHelperScript(projectRoot);
  const missingLiveProbe = createCollectionProbeScript(projectRoot, { liveProbeMode: "missing" });
  const wrongLiveProbe = createCollectionProbeScript(projectRoot, { liveProbeMode: "wrong-live-probe" });
  const validLiveProbe = createCollectionProbeScript(projectRoot, { liveProbeMode: "valid" });
  const helperBinarySha256 = sha256File(process.execPath);
  process.env[probeEnvVar] = process.execPath;

  const launch = prepareAgentAdapterOsIsolationSandboxLaunch(projectRoot, {
    project_id: projectId,
    launch_id: "ADAPTER-OSISO-LAUNCH-0207-READY",
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
    runner_id: "ADAPTER-OSISO-RUNNER-0207-READY",
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
    host_capability_probe_id: "ADAPTER-OSISO-HOST-CAP-0207-READY",
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
        capability_facts: [{ capability: "task207 provider-specific live probe attempt candidate observed", observed: true, evidence_sha256: "b".repeat(64), notes: null }],
        required_tools: [{ name: "windows_checknetisolation", present: true, binary_sha256: helperBinarySha256, version: null }],
        kernel_features: [{ name: "task207-provider-host-capability", observed: true, evidence_sha256: "c".repeat(64), notes: null }],
        diagnostics: [`${projectRoot} host capability diagnostic must be scrubbed`, "host capability observed"]
      };
    }
  });
  assert.equal(hostCapability.ok, true);

  const readyHost = validateAgentAdapterOsIsolationProviderHelperHost(projectRoot, {
    project_id: projectId,
    host_validation_id: "ADAPTER-OSISO-HELPER-HOST-0207-READY",
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
    helper_execution_id: "ADAPTER-OSISO-HELPER-0207-READY",
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
  process.env[probeArgsEnvVar] = JSON.stringify([missingLiveProbe]);
  const missingLiveProbeResponse = await postCollection(
    server,
    projectRoot,
    projectId,
    helperExecution,
    readyRunner,
    launch,
    "ADAPTER-OSISO-HELPER-COLLECT-0207-MISSING-LIVE-PROBE",
    "missing-live-probe-secret"
  );
  assert.equal(missingLiveProbeResponse.status, 200, JSON.stringify(missingLiveProbeResponse.body));
  const missingLiveProbeCollection = missingLiveProbeResponse.body.collection;
  assert.equal(missingLiveProbeCollection.ok, false, "Task206-valid complete facts must not satisfy collection without provider-specific live probe attempt binding");
  assert.equal(
    missingLiveProbeCollection.collection_status,
    "blocked_provider_helper_collection_provider_specific_live_probe_attempt_missing"
  );
  assert.equal(missingLiveProbeCollection.provider_helper_collection.provider_family_os_enforcement_witness_bound, true);
  assert.equal(missingLiveProbeCollection.provider_helper_collection.provider_family_execution_profile_required, true);
  assert.equal(missingLiveProbeCollection.provider_helper_collection.provider_family_execution_profile_bound, true);
  assert.equal(missingLiveProbeCollection.provider_helper_collection.provider_specific_live_probe_attempt_required, true);
  assert.equal(missingLiveProbeCollection.provider_helper_collection.provider_specific_live_probe_attempt_bound, false);
  assert.equal(missingLiveProbeCollection.probe.ok, false);
  assert.equal(missingLiveProbeCollection.probe.evidence.provider_family_execution_profile_bound, true);
  assert.equal(missingLiveProbeCollection.probe.evidence.provider_specific_live_probe_attempt_bound, false);
  assert.equal(missingLiveProbeCollection.proof_authority, "none");
  assert.equal(missingLiveProbeCollection.can_certify_ga, false);
  assert.equal(JSON.stringify(missingLiveProbeResponse.body).includes(projectRoot), false, "missing-live-probe route response must not echo host paths");
  assert.equal(JSON.stringify(missingLiveProbeResponse.body).includes("missing-live-probe-secret"), false, "missing-live-probe route response must not echo secrets");

  const missingLiveProbeReadiness = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0207-MISSING-LIVE-PROBE-READINESS",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task207-missing-live-probe-test",
    evidence_path: missingLiveProbeCollection.probe.evidence_path
  });
  assert.equal(missingLiveProbeReadiness.ok, false, "missing provider-specific live probe attempt must not satisfy readiness");
  assert.equal(missingLiveProbeReadiness.checks.provider_family_os_enforcement_witness.ok, true);
  assert.equal(missingLiveProbeReadiness.checks.provider_family_execution_profile.ok, true);
  assert.equal(missingLiveProbeReadiness.checks.provider_specific_live_probe_attempt.ok, false);
  assert.equal(
    missingLiveProbeReadiness.vetoes.some((veto) => veto.code === "adapter_os_isolation_provider_specific_live_probe_attempt_missing"),
    true,
    "readiness must report a provider-specific live probe attempt veto"
  );

  process.env[probeArgsEnvVar] = JSON.stringify([wrongLiveProbe]);
  const wrongLiveProbeResponse = await postCollection(
    server,
    projectRoot,
    projectId,
    helperExecution,
    readyRunner,
    launch,
    "ADAPTER-OSISO-HELPER-COLLECT-0207-WRONG-LIVE-PROBE",
    "wrong-live-probe-secret"
  );
  assert.equal(wrongLiveProbeResponse.status, 200, JSON.stringify(wrongLiveProbeResponse.body));
  const wrongLiveProbeCollection = wrongLiveProbeResponse.body.collection;
  assert.equal(wrongLiveProbeCollection.ok, false, "provider-specific live probe attempt with mismatched execution profile must fail closed");
  assert.equal(
    wrongLiveProbeCollection.collection_status,
    "blocked_provider_helper_collection_provider_specific_live_probe_attempt_missing"
  );
  assert.equal(wrongLiveProbeCollection.provider_helper_collection.provider_family_os_enforcement_witness_bound, true);
  assert.equal(wrongLiveProbeCollection.provider_helper_collection.provider_family_execution_profile_bound, true);
  assert.equal(wrongLiveProbeCollection.provider_helper_collection.provider_specific_live_probe_attempt_bound, false);
  assert.equal(wrongLiveProbeCollection.probe.evidence.provider_specific_live_probe_attempt_bound, false);

  process.env[probeArgsEnvVar] = JSON.stringify([validLiveProbe]);
  const validLiveProbeResponse = await postCollection(
    server,
    projectRoot,
    projectId,
    helperExecution,
    readyRunner,
    launch,
    "ADAPTER-OSISO-HELPER-COLLECT-0207-LIVE-PROBE-BOUND",
    "live-probe-bound-secret"
  );
  assert.equal(validLiveProbeResponse.status, 200, JSON.stringify(validLiveProbeResponse.body));
  const validLiveProbeCollection = validLiveProbeResponse.body.collection;
  assert.equal(
    validLiveProbeCollection.ok,
    true,
    `provider-specific live-probe-attempt-bound configured collection can produce canonical OS evidence: ${JSON.stringify({
      status: validLiveProbeCollection.collection_status,
      incomplete: validLiveProbeCollection.provider_helper_collection?.incomplete_os_enforcement_facts,
      familyWitnessBound: validLiveProbeCollection.provider_helper_collection?.provider_family_os_enforcement_witness_bound,
      familyProfileBound: validLiveProbeCollection.provider_helper_collection?.provider_family_execution_profile_bound,
      liveProbeBound: validLiveProbeCollection.provider_helper_collection?.provider_specific_live_probe_attempt_bound,
      diagnostics: validLiveProbeCollection.provider_helper_collection?.diagnostics
    })}`
  );
  assert.equal(validLiveProbeCollection.collection_status, "provider_helper_os_evidence_collected");
  assert.equal(validLiveProbeCollection.provider_helper_collection.provider_family_os_enforcement_witness_bound, true);
  assert.equal(validLiveProbeCollection.provider_helper_collection.provider_family_execution_profile_required, true);
  assert.equal(validLiveProbeCollection.provider_helper_collection.provider_family_execution_profile_bound, true);
  assert.equal(validLiveProbeCollection.provider_helper_collection.provider_family_execution_kind, "windows_appcontainer_os_probe");
  assert.match(validLiveProbeCollection.provider_helper_collection.provider_family_execution_profile_sha256, /^[a-f0-9]{64}$/);
  assert.match(validLiveProbeCollection.provider_helper_collection.provider_family_execution_argv_sha256, /^[a-f0-9]{64}$/);
  assert.equal(validLiveProbeCollection.provider_helper_collection.provider_specific_live_probe_attempt_required, true);
  assert.equal(validLiveProbeCollection.provider_helper_collection.provider_specific_live_probe_attempt_bound, true);
  assert.match(validLiveProbeCollection.provider_helper_collection.provider_specific_live_probe_attempt_sha256, /^[a-f0-9]{64}$/);
  assert.equal(validLiveProbeCollection.probe.ok, true);
  assert.equal(validLiveProbeCollection.probe.evidence.provider_family_execution_profile_bound, true);
  assert.equal(validLiveProbeCollection.probe.evidence.provider_specific_live_probe_attempt_bound, true);
  assert.equal(
    validLiveProbeCollection.probe.evidence.provider_family_execution_profile_sha256,
    validLiveProbeCollection.provider_helper_collection.provider_family_execution_profile_sha256
  );
  assert.equal(
    validLiveProbeCollection.probe.evidence.provider_specific_live_probe_attempt_sha256,
    validLiveProbeCollection.provider_helper_collection.provider_specific_live_probe_attempt_sha256
  );
  assert.equal(validLiveProbeCollection.proof_authority, "none");
  assert.equal(validLiveProbeCollection.can_certify_ga, false);
  assert.equal(JSON.stringify(validLiveProbeResponse.body).includes(projectRoot), false, "valid live probe route response must not echo host paths");
  assert.equal(JSON.stringify(validLiveProbeResponse.body).includes("live-probe-bound-secret"), false, "valid live probe route response must not echo secrets");

  const validLiveProbeReadiness = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0207-LIVE-PROBE-BOUND-READINESS",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task207-live-probe-bound-test",
    evidence_path: validLiveProbeCollection.probe.evidence_path
  });
  assert.equal(validLiveProbeReadiness.ok, true, "provider-specific live-probe-attempt-bound canonical evidence can satisfy OS-isolation readiness");
  assert.equal(validLiveProbeReadiness.checks.provider_family_execution_profile.ok, true);
  assert.equal(validLiveProbeReadiness.checks.provider_specific_live_probe_attempt.ok, true);
  assert.equal(validLiveProbeReadiness.proof_authority, "none");
  assert.equal(validLiveProbeReadiness.can_certify_ga, false);

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.os_isolation_provider_helper_collected" &&
        event.payload.collection_id === "ADAPTER-OSISO-HELPER-COLLECT-0207-MISSING-LIVE-PROBE" &&
        event.payload.collection_status === "blocked_provider_helper_collection_provider_specific_live_probe_attempt_missing" &&
        event.payload.provider_family_execution_profile_bound === true &&
        event.payload.provider_specific_live_probe_attempt_bound === false &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "missing provider-specific live probe attempt blocker must be audit-visible and non-authoritative"
  );
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.os_isolation_provider_helper_collected" &&
        event.payload.collection_id === "ADAPTER-OSISO-HELPER-COLLECT-0207-LIVE-PROBE-BOUND" &&
        event.payload.ok === true &&
        event.payload.provider_family_execution_profile_bound === true &&
        event.payload.provider_family_execution_kind === "windows_appcontainer_os_probe" &&
        /^[a-f0-9]{64}$/.test(event.payload.provider_family_execution_argv_sha256) &&
        event.payload.provider_specific_live_probe_attempt_bound === true &&
        /^[a-f0-9]{64}$/.test(event.payload.provider_specific_live_probe_attempt_sha256) &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "provider-specific live-probe-attempt-bound helper collection must be audit-visible and non-authoritative"
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

console.log("Goal 3 Task207 provider-specific live probe attempt gate tests passed.");
