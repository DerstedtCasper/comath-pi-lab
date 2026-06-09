import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import {
  getComathdStatus,
  initProject,
  readAuditEvents,
  reviewAgentAdapterOsIsolationReadiness
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task304-osiso-helper-source-"));
const init = initProject({ name: "Goal 3 Task304 OS isolation helper source", root_path: projectRoot });
const projectId = init.project.project_id;
const provider = "oci_container";
const providerToolSha256 = "9".repeat(64);

function repoFile(relativePath) {
  const here = dirname(fileURLToPath(import.meta.url));
  return readFileSync(join(here, "../../../..", relativePath), "utf8");
}

function sha256Text(text) {
  return createHash("sha256").update(text).digest("hex");
}

function sortJson(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => sortJson(entry));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortJson(value[key])]));
  }
  return value;
}

function canonicalJson(value) {
  return `${JSON.stringify(sortJson(value))}\n`;
}

function writeJson(relativePath, value) {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  const absolutePath = join(projectRoot, relativePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, text, "utf8");
  return {
    path: relativePath,
    sha256: sha256Text(text),
    size_bytes: Buffer.byteLength(text, "utf8"),
    body: value
  };
}

function productionHelperContract(source, helperSha256) {
  const material = {
    contract_source: "service_owned_oci_container_production_helper_profile_contract",
    provider,
    provider_family: provider,
    helper_profile_source: source,
    production_helper_configured: source === "operator_configured_provider_helper",
    bundled_protocol_asset: source === "bundled_provider_helper_protocol_asset",
    helper_binary_sha256: helperSha256,
    accepted_profile_sources: ["operator_configured_provider_helper", "bundled_provider_helper_protocol_asset"],
    required_host_facility_tools: ["oci_docker_cli", "oci_podman_cli"],
    runtime_family: "docker_or_podman_oci",
    runner_network_policy: "disabled",
    no_new_privileges_required: true,
    command_override_allowed: false,
    environment_override_allowed: false,
    daemon_or_socket_inspection_allowed: false,
    container_launch_required_for_profile_contract: false,
    caller_supplied_success_allowed: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  };
  return {
    ...material,
    profile_contract_sha256: sha256Text(canonicalJson(material))
  };
}

function writeCompleteOsEvidenceChain(id, source) {
  const helperSha256 = "e".repeat(64);
  const hostCapabilityPath = `.comath/release/agent-adapter-os-isolation/ADAPTER-OSISO-HOST-CAP-${id}/provider-host-capability-probe.json`;
  const helperExecutionId = `ADAPTER-OSISO-HELPER-${id}`;
  const helperExecutionPath = `.comath/release/agent-adapter-os-isolation/${helperExecutionId}/provider-helper-execution.json`;
  const collectionPath = `.comath/release/agent-adapter-os-isolation/${id}/provider-helper-collection.json`;
  const probePath = `.comath/release/agent-adapter-os-isolation/${id}/probe.json`;
  const evidencePath = `.comath/release/agent-adapter-os-isolation/${id}/evidence.json`;
  const productionHelperConfigured = source === "operator_configured_provider_helper";
  const bundledProtocolAsset = source === "bundled_provider_helper_protocol_asset";
  const profileContract = productionHelperContract(source, helperSha256);

  const hostCapability = writeJson(hostCapabilityPath, {
    schema_version: "comath.agent_adapter_os_isolation_provider_host_capability_probe.v1",
    host_capability_probe_id: `ADAPTER-OSISO-HOST-CAP-${id}`,
    project_id: projectId,
    adapter_id: "codex-cli",
    backend: "external",
    provider,
    created_at: "2026-06-10T00:00:00.000Z",
    ok: true,
    host_capability_status: "provider_host_capability_observed",
    host_capability_probe_path: hostCapabilityPath,
    provider_host_capability_available: true,
    provider_host_capability: {
      probe_source: "service_owned_provider_host_capability_probe",
      provider_host_capability_available: true,
      platform: process.platform,
      platform_supported: true,
      required_tools: [
        { name: "oci_docker_cli", present: true, version: null, binary_sha256: providerToolSha256 }
      ],
      capability_facts: ["task304 oci capability observed"],
      kernel_features: ["task304-oci-host-capability"],
      proof_authority: "none"
    },
    adapter_execution_isolation: {
      required_for_ga: true,
      current_boundary: "process_boundary_only",
      os_enforced: false,
      provider,
      claims_runtime_enforcement: false,
      proof_authority: "none"
    },
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  });

  const helperExecution = writeJson(helperExecutionPath, {
    schema_version: "comath.agent_adapter_os_isolation_provider_helper_execution.v1",
    helper_execution_id: helperExecutionId,
    host_validation_id: `ADAPTER-OSISO-HOST-${id}`,
    project_id: projectId,
    runner_id: `ADAPTER-OSISO-RUNNER-${id}`,
    launch_id: `ADAPTER-OSISO-LAUNCH-${id}`,
    adapter_id: "codex-cli",
    backend: "external",
    created_at: "2026-06-10T00:00:00.000Z",
    ok: true,
    helper_execution_status: "provider_helper_execution_attempted",
    requested_provider: provider,
    provider,
    provider_helper_attempted: true,
    helper_execution_path: helperExecutionPath,
    launch_artifact: null,
    runner_artifact: null,
    host_validation_artifact: {
      kind: "agent_adapter_os_isolation_provider_helper_host_validation",
      path: `.comath/release/agent-adapter-os-isolation/ADAPTER-OSISO-HOST-${id}/provider-helper-host-validation.json`,
      sha256: "5".repeat(64),
      size_bytes: 128
    },
    provider_helper_host_validation_binding: {
      bound: true,
      host_validation_id: `ADAPTER-OSISO-HOST-${id}`,
      host_validation_status: "provider_helper_host_validated",
      validation_source: "service_owned_provider_helper_host_validator",
      host_capability_probe_id: hostCapability.body.host_capability_probe_id,
      provider_host_capability_bound: true,
      host_capability_status: "provider_host_capability_observed",
      helper_binary_sha256: helperSha256,
      runner_binary_sha256: helperSha256,
      hashes_match_provider_runner: true,
      platform: process.platform,
      platform_supported: true,
      diagnostics: [],
      proof_authority: "none"
    },
    provider_helper_execution: {
      helper_source: "service_owned_provider_helper_config",
      helper_profile_source: source,
      production_helper_configured: productionHelperConfigured,
      bundled_protocol_asset: bundledProtocolAsset,
      production_helper_profile_contract: profileContract,
      helper_configured: true,
      helper_binary_sha256: helperSha256,
      helper_args_prefix_sha256: null,
      helper_args_prefix_count: 0,
      helper_version: `${provider}-helper-task304`,
      helper_exit_code: 0,
      helper_signal: null,
      timed_out: false,
      stdout_sha256: "1".repeat(64),
      stderr_sha256: "2".repeat(64),
      transcript_sha256: "3".repeat(64),
      runtime_attestation_source: "helper_stdout_json",
      runtime_attestation_bound: true,
      runtime_attestation_sha256: "4".repeat(64),
      stdout_size_bytes: 128,
      stderr_size_bytes: 0,
      shell: false,
      network_policy: "disabled",
      no_new_privileges_required: true,
      command_override_allowed: false,
      environment_override_allowed: false,
      caller_supplied_success_allowed: false,
      fixed_args_template: ["--comath-provider-helper-self-test"],
      fixed_args_template_sha256: "6".repeat(64),
      environment_policy: {
        fixed_env: {
          COMATH_AGENT_ADAPTER_OSISO_NETWORK_POLICY: "disabled"
        },
        forbidden_env_prefixes: ["OPENAI_", "ANTHROPIC_"],
        caller_env_allowed: false,
        proof_authority: "none"
      },
      diagnostics: ["task304 helper execution provenance source"],
      proof_authority: "none"
    },
    adapter_execution_isolation: {
      required_for_ga: true,
      current_boundary: "process_boundary_only",
      os_enforced: false,
      provider,
      claims_runtime_enforcement: false,
      proof_authority: "none"
    },
    blocker_certificate: null,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  });

  const collection = writeJson(collectionPath, {
    schema_version: "comath.agent_adapter_os_isolation_provider_helper_collection.v1",
    collection_id: id,
    project_id: projectId,
    helper_execution_id: helperExecutionId,
    runner_id: `ADAPTER-OSISO-RUNNER-${id}`,
    launch_id: `ADAPTER-OSISO-LAUNCH-${id}`,
    adapter_id: "codex-cli",
    backend: "external",
    created_at: "2026-06-10T00:00:00.000Z",
    ok: true,
    collection_status: "provider_helper_os_evidence_collected",
    requested_provider: provider,
    provider,
    collection_path: collectionPath,
    helper_execution_artifact: {
      kind: "agent_adapter_os_isolation_provider_helper_execution",
      path: helperExecution.path,
      sha256: helperExecution.sha256,
      size_bytes: helperExecution.size_bytes
    },
    provider_helper_collection: {
      probe_source: "service_owned_provider_helper_collection_probe",
      helper_profile_source: source,
      production_helper_configured: productionHelperConfigured,
      bundled_protocol_asset: bundledProtocolAsset,
      production_helper_profile_contract: profileContract,
      hashes_match_helper_execution: true,
      os_enforcement_complete: true,
      incomplete_os_enforcement_facts: [],
      helper_exit_code: 0,
      stdout_sha256: "1".repeat(64),
      stderr_sha256: "2".repeat(64),
      transcript_sha256: "3".repeat(64),
      runtime_attestation_bound: true,
      runtime_attestation_sha256: "4".repeat(64),
      host_capability_required: true,
      host_capability_bound: true,
      host_validation_id: `ADAPTER-OSISO-HOST-${id}`,
      host_validation_path: `.comath/release/agent-adapter-os-isolation/ADAPTER-OSISO-HOST-${id}/provider-helper-host-validation.json`,
      host_validation_sha256: "5".repeat(64),
      host_capability_probe_id: hostCapability.body.host_capability_probe_id,
      host_capability_probe_path: hostCapability.path,
      host_capability_probe_sha256: hostCapability.sha256,
      host_capability_status: "provider_host_capability_observed",
      provider_tool_execution_witness_required: true,
      provider_tool_execution_witness_bound: true,
      provider_tool_execution_witness_sha256: "7".repeat(64),
      provider_specific_tool_execution_required: true,
      provider_specific_tool_execution_bound: true,
      provider_specific_tool_execution_sha256: "8".repeat(64),
      provider_specific_tool_name: "oci_docker_cli",
      provider_specific_tool_sha256: providerToolSha256,
      provider_family_os_enforcement_witness_required: true,
      provider_family_os_enforcement_witness_bound: true,
      provider_family_os_enforcement_witness_sha256: "a".repeat(64),
      provider_family_execution_profile_required: true,
      provider_family_execution_profile_bound: true,
      provider_family_execution_kind: "oci_container_os_probe",
      provider_family_execution_profile_sha256: "b".repeat(64),
      provider_family_execution_argv_sha256: "c".repeat(64),
      provider_specific_live_probe_attempt_required: true,
      provider_specific_live_probe_attempt_bound: true,
      provider_specific_live_probe_attempt_sha256: "d".repeat(64),
      provider_specific_live_probe_execution_required: true,
      provider_specific_live_probe_execution_bound: true,
      provider_specific_live_probe_execution_sha256: "e".repeat(64),
      provider_control_plane_execution_witness_required: true,
      provider_control_plane_execution_witness_bound: true,
      provider_control_plane_execution_witness_sha256: "f".repeat(64),
      diagnostics: ["complete service-owned OS evidence chain"],
      proof_authority: "none"
    },
    adapter_execution_isolation: {
      required_for_ga: true,
      current_boundary: "process_boundary_only",
      os_enforced: false,
      provider,
      claims_runtime_enforcement: false,
      proof_authority: "none"
    },
    blocker_certificate: null,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  });

  const evidenceBody = {
    schema_version: "comath.agent_adapter_os_isolation_evidence.v1",
    kind: "agent_adapter_os_isolation_evidence",
    probe_id: id,
    probe_status: "os_isolation_probe_collected",
    adapter_id: "codex-cli",
    backend: "external",
    provider,
    evidence_source: "service_owned_probe",
    process_isolation_enforced: true,
    filesystem_scope_enforced: true,
    network_isolation_enforced: true,
    no_new_privileges: true,
    escape_prevention: true,
    host_path_leak_free: true,
    secret_free: true,
    notes: "service-owned OS evidence",
    collection_source: "service_owned_os_probe",
    adapter_process_exit_code: 0,
    stdout_sha256: "1".repeat(64),
    stderr_sha256: "2".repeat(64),
    transcript_sha256: "3".repeat(64),
    provider_tool_execution_witness_required: true,
    provider_tool_execution_witness_bound: true,
    provider_tool_execution_witness_sha256:
      collection.body.provider_helper_collection.provider_tool_execution_witness_sha256,
    provider_specific_tool_execution_required: true,
    provider_specific_tool_execution_bound: true,
    provider_specific_tool_execution_sha256:
      collection.body.provider_helper_collection.provider_specific_tool_execution_sha256,
    provider_specific_tool_name: "oci_docker_cli",
    provider_specific_tool_sha256: providerToolSha256,
    provider_family_os_enforcement_witness_required: true,
    provider_family_os_enforcement_witness_bound: true,
    provider_family_os_enforcement_witness_sha256:
      collection.body.provider_helper_collection.provider_family_os_enforcement_witness_sha256,
    provider_family_execution_profile_required: true,
    provider_family_execution_profile_bound: true,
    provider_family_execution_kind: "oci_container_os_probe",
    provider_family_execution_profile_sha256:
      collection.body.provider_helper_collection.provider_family_execution_profile_sha256,
    provider_family_execution_argv_sha256:
      collection.body.provider_helper_collection.provider_family_execution_argv_sha256,
    provider_specific_live_probe_attempt_required: true,
    provider_specific_live_probe_attempt_bound: true,
    provider_specific_live_probe_attempt_sha256:
      collection.body.provider_helper_collection.provider_specific_live_probe_attempt_sha256,
    provider_specific_live_probe_execution_required: true,
    provider_specific_live_probe_execution_bound: true,
    provider_specific_live_probe_execution_sha256:
      collection.body.provider_helper_collection.provider_specific_live_probe_execution_sha256,
    provider_control_plane_execution_witness_required: true,
    provider_control_plane_execution_witness_bound: true,
    provider_control_plane_execution_witness_sha256:
      collection.body.provider_helper_collection.provider_control_plane_execution_witness_sha256,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  };
  const evidence = writeJson(evidencePath, evidenceBody);
  writeJson(probePath, {
    schema_version: "comath.agent_adapter_os_isolation_probe.v1",
    probe_id: id,
    project_id: projectId,
    adapter_id: "codex-cli",
    backend: "external",
    created_at: "2026-06-10T00:00:00.000Z",
    ok: true,
    probe_status: "os_isolation_probe_collected",
    requested_provider: provider,
    observed_provider: provider,
    provider_available: true,
    probe_path: probePath,
    evidence_path: evidencePath,
    evidence_artifact: {
      kind: "agent_adapter_os_isolation_evidence",
      path: evidencePath,
      sha256: evidence.sha256,
      size_bytes: evidence.size_bytes
    },
    evidence: evidence.body,
    adapter_execution_isolation: {
      required_for_ga: true,
      current_boundary: "os_enforced",
      os_enforced: true,
      provider,
      claims_runtime_enforcement: false,
      proof_authority: "none"
    },
    blocker_certificate: null,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  });
  return { collection, evidence };
}

try {
  const bundled = writeCompleteOsEvidenceChain("ADAPTER-OSISO-0304-BUNDLED", "bundled_provider_helper_protocol_asset");
  const bundledReview = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0304-BUNDLED-READINESS",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task304 bundled reviewer token=plain-token",
    evidence_path: bundled.evidence.path
  });
  assert.equal(
    bundledReview.ok,
    false,
    "bundled provider-helper protocol assets must not satisfy GA OS-isolation release readiness"
  );
  assert.equal(bundledReview.readiness_status, "blocked_missing_os_enforced_adapter_isolation");
  assert.equal(bundledReview.checks.production_helper_source.ok, false);
  assert.equal(
    bundledReview.vetoes.some((veto) => veto.code === "adapter_os_isolation_production_helper_source_missing"),
    true
  );
  assert.equal(bundledReview.proof_authority, "none");
  assert.equal(bundledReview.can_promote_claim, false);
  assert.equal(bundledReview.can_certify_ga, false);

  const tamperedBundledCollection = JSON.parse(JSON.stringify(bundled.collection.body));
  const tamperedContract = productionHelperContract(
    "operator_configured_provider_helper",
    bundled.collection.body.provider_helper_collection.production_helper_profile_contract.helper_binary_sha256
  );
  tamperedBundledCollection.provider_helper_collection.helper_profile_source =
    "operator_configured_provider_helper";
  tamperedBundledCollection.provider_helper_collection.production_helper_configured = true;
  tamperedBundledCollection.provider_helper_collection.bundled_protocol_asset = false;
  tamperedBundledCollection.provider_helper_collection.production_helper_profile_contract = tamperedContract;
  writeJson(bundled.collection.path, tamperedBundledCollection);
  const tamperedBundledReview = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0304-BUNDLED-TAMPERED-READINESS",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task304 tampered bundled reviewer token=plain-token",
    evidence_path: bundled.evidence.path
  });
  assert.equal(
    tamperedBundledReview.ok,
    false,
    "production helper source readiness must bind collection provenance to the original helper execution"
  );
  assert.equal(tamperedBundledReview.checks.production_helper_source.ok, false);
  assert.equal(
    tamperedBundledReview.vetoes.some(
      (veto) => veto.code === "adapter_os_isolation_production_helper_source_missing"
    ),
    true
  );

  const configured = writeCompleteOsEvidenceChain(
    "ADAPTER-OSISO-0304-CONFIGURED",
    "operator_configured_provider_helper"
  );
  const readyReview = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0304-CONFIGURED-READINESS",
    adapter_id: "codex-cli",
    backend: "external",
    actor: "goal3-task304 configured reviewer token=plain-token proof_success",
    evidence_path: configured.evidence.path
  });
  assert.equal(readyReview.ok, true);
  assert.equal(readyReview.readiness_status, "ready_for_os_isolation_release_review");
  assert.equal(readyReview.checks.production_helper_source.ok, true);
  assert.equal(readyReview.checks.production_helper_source.observed, "operator_configured_provider_helper");
  assert.equal(readyReview.adapter_execution_isolation.os_enforced, true);
  assert.equal(readyReview.adapter_execution_isolation.production_helper_configured, true);
  assert.equal(readyReview.adapter_execution_isolation.helper_profile_source, "operator_configured_provider_helper");
  assert.equal(readyReview.adapter_execution_isolation.bundled_protocol_asset, false);
  assert.equal(readyReview.proof_authority, "none");
  assert.equal(readyReview.can_promote_claim, false);
  assert.equal(readyReview.can_certify_ga, false);
  assert.equal(JSON.stringify(readyReview).includes(projectRoot), false);
  assert.equal(JSON.stringify(readyReview).includes("plain-token"), false);
  assert.equal(existsSync(join(projectRoot, readyReview.review_path)), true);

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (entry) =>
        entry.event_type === "agent_adapter.os_isolation_reviewed" &&
        entry.payload.review_id === "ADAPTER-OSISO-0304-CONFIGURED-READINESS" &&
        entry.payload.production_helper_configured === true &&
        entry.payload.helper_profile_source === "operator_configured_provider_helper" &&
        entry.payload.can_certify_ga === false
    ),
    true,
    "Task304 OS-isolation readiness audit must bind production helper source provenance"
  );

  assert.equal(
    getComathdStatus().capabilities.includes("agent_adapter_os_isolation_production_helper_source_readiness_gate"),
    true,
    "Task304 capability ledger must advertise the production helper source readiness gate"
  );
  for (const [path, pattern] of [
    ["README.md", /Task304.*production helper.*readiness/s],
    ["TODO.md", /Task304.*production helper.*readiness/s],
    ["REVIEW.md", /Goal 3 Task 304/s],
    ["AGENTS.md", /Task304.*production helper.*readiness/s],
    ["docs/architecture/adapter-contracts.md", /Task304.*production helper.*readiness/s],
    ["docs/architecture/ga-release-criteria.md", /Task304.*production helper.*readiness/s],
    ["docs/architecture/threat-model.md", /Task304.*production helper.*readiness/s],
    ["docs/architecture/acceptance-matrix.md", /Task304.*production helper.*readiness/s]
  ]) {
    assert.match(repoFile(path), pattern, `${path} must document Task304 without shifting proof authority`);
  }
  assert.equal(
    repoFile("scripts/phase0-smoke.mjs").includes(
      "goal3-task304-agent-adapter-os-isolation-production-helper-source-readiness-gate.test.mjs"
    ),
    true,
    "phase0 smoke must discover the Task304 focused suite"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task304 agent adapter OS-isolation production helper source readiness tests passed.");
