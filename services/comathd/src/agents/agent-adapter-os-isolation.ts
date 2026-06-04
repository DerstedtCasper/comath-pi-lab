import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { delimiter, dirname, extname, isAbsolute, join, relative, resolve, win32 as pathWin32 } from "node:path";
import { fileURLToPath } from "node:url";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { assertPathAllowed } from "../security/path-policy.js";
import { canonicalJson, scrubHostPaths, sha256Text } from "../verification/runner-contracts.js";
import { getAgentAdapterPackage, type AgentAdapterBackend, type AgentAdapterPackageId } from "./agent-adapter-packages.js";

export type AgentAdapterOsIsolationBoundary = "process_boundary_only" | "os_enforced";

export type AgentAdapterOsIsolationMetadata = {
  required_for_ga: true;
  os_enforced: boolean;
  current_boundary: AgentAdapterOsIsolationBoundary;
  evidence_required: true;
  proof_authority: "none";
};

export type AgentAdapterOsIsolationProvider =
  | "oci_container"
  | "nix_sandbox"
  | "firejail"
  | "windows_appcontainer"
  | "macos_sandbox_exec"
  | "service_process_boundary"
  | "unknown";

export type AgentAdapterOsIsolationProviderFamilyExecutionKind =
  | "oci_container_os_probe"
  | "nix_sandbox_os_probe"
  | "firejail_os_probe"
  | "windows_appcontainer_os_probe"
  | "macos_sandbox_exec_os_probe";

export type AgentAdapterOsIsolationProviderControlPlaneExecutionKind =
  | "oci_container_control_plane_execution"
  | "nix_sandbox_control_plane_execution"
  | "firejail_control_plane_execution"
  | "windows_appcontainer_control_plane_execution"
  | "macos_sandbox_exec_control_plane_execution";

export type AgentAdapterOsIsolationEvidence = {
  schema_version?: string;
  kind?: "agent_adapter_os_isolation_evidence";
  adapter_id?: string;
  backend?: AgentAdapterBackend;
  provider?: AgentAdapterOsIsolationProvider;
  evidence_source?: "service_owned_probe" | "operator_attested" | "contract_only" | "unknown";
  probe_id?: string;
  probe_status?: AgentAdapterOsIsolationProbeStatus;
  process_isolation_enforced?: boolean;
  filesystem_scope_enforced?: boolean;
  network_isolation_enforced?: boolean;
  no_new_privileges?: boolean;
  escape_prevention?: boolean;
  host_path_leak_free?: boolean;
  secret_free?: boolean;
  notes?: string;
  collection_source?: "service_owned_os_probe";
  adapter_process_exit_code?: number;
  stdout_sha256?: string;
  stderr_sha256?: string;
  transcript_sha256?: string;
  provider_tool_execution_witness_required?: boolean;
  provider_tool_execution_witness_bound?: boolean;
  provider_tool_execution_witness_sha256?: string;
  provider_specific_tool_execution_required?: boolean;
  provider_specific_tool_execution_bound?: boolean;
  provider_specific_tool_execution_sha256?: string;
  provider_specific_tool_name?: string;
  provider_specific_tool_sha256?: string;
  provider_family_os_enforcement_witness_required?: boolean;
  provider_family_os_enforcement_witness_bound?: boolean;
  provider_family_os_enforcement_witness_sha256?: string;
  provider_family_execution_profile_required?: boolean;
  provider_family_execution_profile_bound?: boolean;
  provider_family_execution_kind?: AgentAdapterOsIsolationProviderFamilyExecutionKind;
  provider_family_execution_profile_sha256?: string;
  provider_family_execution_argv_sha256?: string;
  provider_specific_live_probe_attempt_required?: boolean;
  provider_specific_live_probe_attempt_bound?: boolean;
  provider_specific_live_probe_attempt_sha256?: string;
  provider_specific_live_probe_execution_required?: boolean;
  provider_specific_live_probe_execution_bound?: boolean;
  provider_specific_live_probe_execution_sha256?: string;
  provider_control_plane_execution_witness_required?: boolean;
  provider_control_plane_execution_witness_bound?: boolean;
  provider_control_plane_execution_witness_sha256?: string;
  proof_authority?: unknown;
  can_promote_claim?: unknown;
  can_certify_ga?: unknown;
};

export type AgentAdapterOsIsolationProviderToolExecutionWitness = {
  witness_source: "provider_specific_executed_tool";
  provider: AgentAdapterOsIsolationProvider;
  execution_id: string;
  collection_id: string;
  helper_execution_id: string;
  runner_id: string;
  launch_id: string;
  tool_sha256: string;
  profile_sha256: string;
  argv_sha256: string;
  host_capability_tool_name?: string;
  host_capability_tool_sha256?: string;
  transcript_sha256: string;
  network_policy: "disabled";
  proof_authority: "none";
};

type AgentAdapterOsIsolationProviderToolExecutionWitnessExpectation = {
  tool_sha256: string;
  profile_sha256: string;
  argv_sha256: string;
  host_capability_tool_name?: string;
  host_capability_tool_sha256?: string;
  provider_family_execution_kind?: AgentAdapterOsIsolationProviderFamilyExecutionKind;
  provider_family_execution_profile_sha256?: string;
  provider_family_execution_argv_sha256?: string;
};

export type AgentAdapterOsIsolationProviderFamilyOsEnforcementWitness = {
  witness_source: "provider_family_os_enforcement";
  provider: AgentAdapterOsIsolationProvider;
  execution_id: string;
  collection_id: string;
  helper_execution_id: string;
  runner_id: string;
  launch_id: string;
  host_validation_id: string;
  host_validation_path: string;
  host_validation_sha256: string;
  host_capability_probe_id: string;
  host_capability_probe_path: string;
  host_capability_probe_sha256: string;
  host_capability_status: AgentAdapterOsIsolationProviderHostCapabilityStatus;
  provider_host_capability_bound: true;
  provider_specific_tool_name: string;
  provider_specific_tool_sha256: string;
  provider_tool_sha256: string;
  provider_tool_profile_sha256: string;
  provider_tool_argv_sha256: string;
  provider_family_execution_kind?: AgentAdapterOsIsolationProviderFamilyExecutionKind;
  provider_family_execution_profile_sha256?: string;
  provider_family_execution_argv_sha256?: string;
  collection_source: "service_owned_os_probe";
  process_isolation_enforced: true;
  filesystem_scope_enforced: true;
  network_isolation_enforced: true;
  no_new_privileges: true;
  escape_prevention: true;
  adapter_process_exit_code: 0;
  stdout_sha256: string;
  stderr_sha256: string;
  transcript_sha256: string;
  network_policy: "disabled";
  proof_authority: "none";
};

export type AgentAdapterOsIsolationProviderSpecificLiveProbeAttempt = {
  attempt_source: "provider_specific_live_os_probe";
  provider: AgentAdapterOsIsolationProvider;
  execution_id: string;
  collection_id: string;
  helper_execution_id: string;
  runner_id: string;
  launch_id: string;
  provider_family_execution_kind: AgentAdapterOsIsolationProviderFamilyExecutionKind;
  provider_family_execution_profile_sha256: string;
  provider_family_execution_argv_sha256: string;
  provider_tool_sha256: string;
  provider_tool_profile_sha256: string;
  provider_tool_argv_sha256: string;
  transcript_sha256: string;
  collection_source: "service_owned_os_probe";
  process_isolation_enforced: true;
  filesystem_scope_enforced: true;
  network_isolation_enforced: true;
  no_new_privileges: true;
  escape_prevention: true;
  adapter_process_exit_code: 0;
  network_policy: "disabled";
  proof_authority: "none";
};

export type AgentAdapterOsIsolationProviderSpecificLiveProbeExecution = {
  execution_source: "service_owned_provider_specific_live_os_probe";
  provider: AgentAdapterOsIsolationProvider;
  execution_id: string;
  collection_id: string;
  helper_execution_id: string;
  runner_id: string;
  launch_id: string;
  provider_family_execution_kind: AgentAdapterOsIsolationProviderFamilyExecutionKind;
  provider_family_execution_profile_sha256: string;
  provider_family_execution_argv_sha256: string;
  provider_tool_sha256: string;
  provider_tool_profile_sha256: string;
  provider_tool_argv_sha256: string;
  transcript_sha256: string;
  live_probe_tool_sha256: string;
  live_probe_argv_sha256: string;
  live_probe_stdout_sha256: string;
  live_probe_stderr_sha256: string;
  live_probe_transcript_sha256: string;
  collection_source: "service_owned_os_probe";
  process_isolation_enforced: true;
  filesystem_scope_enforced: true;
  network_isolation_enforced: true;
  no_new_privileges: true;
  escape_prevention: true;
  adapter_process_exit_code: 0;
  network_policy: "disabled";
  proof_authority: "none";
};

export type AgentAdapterOsIsolationProviderControlPlaneExecutionWitness = {
  witness_source: "provider_control_plane_execution";
  provider: AgentAdapterOsIsolationProvider;
  control_plane_kind: AgentAdapterOsIsolationProviderControlPlaneExecutionKind;
  execution_id: string;
  collection_id: string;
  helper_execution_id: string;
  runner_id: string;
  launch_id: string;
  provider_family_execution_kind: AgentAdapterOsIsolationProviderFamilyExecutionKind;
  provider_family_execution_profile_sha256: string;
  provider_family_execution_argv_sha256: string;
  provider_tool_sha256: string;
  provider_tool_profile_sha256: string;
  provider_tool_argv_sha256: string;
  transcript_sha256: string;
  provider_specific_live_probe_execution_id: string;
  provider_specific_live_probe_execution_sha256: string;
  provider_specific_live_probe_tool_sha256: string;
  provider_specific_live_probe_argv_sha256: string;
  provider_specific_live_probe_stdout_sha256: string;
  provider_specific_live_probe_stderr_sha256: string;
  provider_specific_live_probe_transcript_sha256: string;
  collection_source: "service_owned_os_probe";
  network_policy: "disabled";
  proof_authority: "none";
};

export type AgentAdapterOsIsolationProbeCollection = {
  collection_source?: "service_owned_os_probe" | "operator_attested" | "unknown";
  process_isolation_enforced?: boolean;
  filesystem_scope_enforced?: boolean;
  network_isolation_enforced?: boolean;
  no_new_privileges?: boolean;
  escape_prevention?: boolean;
  adapter_process_exit_code?: number;
  stdout_sha256?: string;
  stderr_sha256?: string;
  transcript_sha256?: string;
  provider_tool_execution_witness_required?: boolean;
  provider_tool_execution_witness?: AgentAdapterOsIsolationProviderToolExecutionWitness;
  provider_specific_tool_execution_required?: boolean;
  provider_specific_tool_execution_bound?: boolean;
  provider_specific_tool_execution_sha256?: string;
  provider_specific_tool_name?: string;
  provider_specific_tool_sha256?: string;
  provider_family_os_enforcement_witness_required?: boolean;
  provider_family_os_enforcement_witness?: AgentAdapterOsIsolationProviderFamilyOsEnforcementWitness;
  provider_family_os_enforcement_witness_bound?: boolean;
  provider_family_os_enforcement_witness_sha256?: string;
  provider_family_execution_profile_required?: boolean;
  provider_family_execution_profile_bound?: boolean;
  provider_family_execution_kind?: AgentAdapterOsIsolationProviderFamilyExecutionKind;
  provider_family_execution_profile_sha256?: string;
  provider_family_execution_argv_sha256?: string;
  provider_specific_live_probe_attempt_required?: boolean;
  provider_specific_live_probe_attempt?: AgentAdapterOsIsolationProviderSpecificLiveProbeAttempt;
  provider_specific_live_probe_attempt_bound?: boolean;
  provider_specific_live_probe_attempt_sha256?: string;
  provider_specific_live_probe_execution_required?: boolean;
  provider_specific_live_probe_execution?: AgentAdapterOsIsolationProviderSpecificLiveProbeExecution;
  provider_specific_live_probe_execution_bound?: boolean;
  provider_specific_live_probe_execution_sha256?: string;
  provider_control_plane_execution_witness_required?: boolean;
  provider_control_plane_execution_witness?: AgentAdapterOsIsolationProviderControlPlaneExecutionWitness;
  provider_control_plane_execution_witness_bound?: boolean;
  provider_control_plane_execution_witness_sha256?: string;
  notes?: string;
};

export type AgentAdapterOsIsolationProbeEnvironment = {
  provider_available?: boolean;
  platform?: string;
  notes?: string;
};

export type AgentAdapterOsIsolationProbeCollectorInput = {
  project_root: string;
  project_id: string;
  probe_id: string;
  adapter_id: AgentAdapterPackageId;
  backend: AgentAdapterBackend;
  requested_provider: string;
  provider: AgentAdapterOsIsolationProvider | null;
  provider_available: boolean;
};

export type AgentAdapterOsIsolationProbeCollector = (
  input: AgentAdapterOsIsolationProbeCollectorInput
) => AgentAdapterOsIsolationProbeCollection | null | undefined;

export type AgentAdapterOsIsolationProbeOptions = {
  collector?: AgentAdapterOsIsolationProbeCollector;
};

export type AgentAdapterOsIsolationSandboxLaunchPreflightInput = {
  project_root: string;
  project_id: string;
  launch_id: string;
  adapter_id: AgentAdapterPackageId;
  backend: AgentAdapterBackend;
  requested_provider: string;
  provider: AgentAdapterOsIsolationProvider | null;
  platform?: string;
};

export type AgentAdapterOsIsolationSandboxLaunchPreflight = {
  probe_source?: "service_owned_launcher_preflight" | "operator_attested" | "unknown";
  provider_available?: boolean;
  launcher_binary_sha256?: string;
  launcher_version?: string;
  diagnostics?: string[];
};

export type AgentAdapterOsIsolationSandboxLaunchProbe = (
  input: AgentAdapterOsIsolationSandboxLaunchPreflightInput
) => AgentAdapterOsIsolationSandboxLaunchPreflight | null | undefined;

export type AgentAdapterOsIsolationSandboxLaunchOptions = {
  launcher_probe?: AgentAdapterOsIsolationSandboxLaunchProbe;
};

export type AgentAdapterOsIsolationSandboxExecutionProbeInput = {
  project_root: string;
  project_id: string;
  execution_id: string;
  launch_id: string;
  launch_path: string;
  adapter_id: AgentAdapterPackageId;
  backend: AgentAdapterBackend;
  provider: AgentAdapterOsIsolationProvider;
  launcher_binary_sha256: string;
  platform?: string;
};

export type AgentAdapterOsIsolationSandboxExecutionCollection = AgentAdapterOsIsolationProbeCollection & {
  probe_source?: "service_owned_sandbox_execution_probe" | "operator_attested" | "unknown";
  diagnostics?: string[];
};

export type AgentAdapterOsIsolationSandboxExecutionProbe = (
  input: AgentAdapterOsIsolationSandboxExecutionProbeInput
) => AgentAdapterOsIsolationSandboxExecutionCollection | null | undefined;

export type AgentAdapterOsIsolationSandboxExecutionOptions = {
  execution_probe?: AgentAdapterOsIsolationSandboxExecutionProbe;
};

export type AgentAdapterOsIsolationProviderRunnerResolverInput = {
  project_root: string;
  project_id: string;
  runner_id: string;
  launch_id: string;
  launch_path: string;
  adapter_id: AgentAdapterPackageId;
  backend: AgentAdapterBackend;
  provider: AgentAdapterOsIsolationProvider;
  launcher_binary_sha256: string;
  platform?: string;
};

export type AgentAdapterOsIsolationProviderRunnerResolution = {
  resolution_source?: "service_owned_provider_runner_resolver" | "operator_attested" | "unknown";
  runner_available?: boolean;
  runner_binary_sha256?: string;
  runner_version?: string;
  diagnostics?: string[];
};

export type AgentAdapterOsIsolationProviderRunnerResolver = (
  input: AgentAdapterOsIsolationProviderRunnerResolverInput
) => AgentAdapterOsIsolationProviderRunnerResolution | null | undefined;

export type AgentAdapterOsIsolationProviderRunnerOptions = {
  provider_runner_resolver?: AgentAdapterOsIsolationProviderRunnerResolver;
};

export type AgentAdapterOsIsolationProviderHelperConfigResolverInput = {
  project_root: string;
  project_id: string;
  helper_execution_id: string;
  runner_id: string;
  runner_path: string;
  launch_id: string;
  launch_path: string;
  adapter_id: AgentAdapterPackageId;
  backend: AgentAdapterBackend;
  provider: AgentAdapterOsIsolationProvider;
  runner_binary_sha256: string;
  platform?: string;
};

export type AgentAdapterOsIsolationProviderHelperConfig = {
  config_source?: "service_owned_provider_helper_config" | "operator_attested" | "unknown";
  helper_available?: boolean;
  helper_program?: string;
  helper_args_prefix?: string[];
  helper_version?: string;
  timeout_ms?: number;
  diagnostics?: string[];
};

export type AgentAdapterOsIsolationProviderHelperConfigResolver = (
  input: AgentAdapterOsIsolationProviderHelperConfigResolverInput
) => AgentAdapterOsIsolationProviderHelperConfig | null | undefined;

export type AgentAdapterOsIsolationProviderHelperExecutionOptions = {
  provider_helper_config_resolver?: AgentAdapterOsIsolationProviderHelperConfigResolver;
};

export type AgentAdapterOsIsolationProviderHelperHostValidatorInput = {
  project_root: string;
  project_id: string;
  host_validation_id: string;
  host_capability_probe_id: string;
  host_capability_probe_path: string;
  host_capability_probe_sha256: string;
  host_capability_status: AgentAdapterOsIsolationProviderHostCapabilityStatus;
  provider_host_capability_available: boolean;
  runner_id: string;
  runner_path: string;
  launch_id: string;
  launch_path: string;
  adapter_id: AgentAdapterPackageId;
  backend: AgentAdapterBackend;
  provider: AgentAdapterOsIsolationProvider;
  runner_binary_sha256: string;
  platform?: string;
};

export type AgentAdapterOsIsolationProviderHelperHostValidationProbe = {
  validation_source?: "service_owned_provider_helper_host_validator" | "operator_attested" | "unknown";
  helper_host_ready?: boolean;
  helper_program?: string;
  helper_binary_sha256?: string;
  helper_version?: string;
  supported_platforms?: string[];
  self_test_required?: boolean;
  self_test_passed?: boolean;
  self_test_exit_code?: number | null;
  self_test_signal?: string | null;
  self_test_timed_out?: boolean;
  self_test_stdout_sha256?: string | null;
  self_test_stderr_sha256?: string | null;
  self_test_transcript_sha256?: string | null;
  self_test_args_prefix_sha256?: string | null;
  self_test_args_prefix_count?: number;
  self_test_fixed_args_sha256?: string | null;
  diagnostics?: string[];
};

export type AgentAdapterOsIsolationProviderHelperHostValidator = (
  input: AgentAdapterOsIsolationProviderHelperHostValidatorInput
) => AgentAdapterOsIsolationProviderHelperHostValidationProbe | null | undefined;

export type AgentAdapterOsIsolationProviderHelperHostValidationOptions = {
  provider_helper_host_validator?: AgentAdapterOsIsolationProviderHelperHostValidator;
};

export type AgentAdapterOsIsolationProviderHelperCollectionProbeInput = {
  project_root: string;
  project_id: string;
  collection_id: string;
  helper_execution_id: string;
  helper_execution_path: string;
  runner_id: string;
  runner_path: string;
  launch_id: string;
  launch_path: string;
  host_validation_id: string;
  host_validation_path: string;
  host_validation_sha256: string;
  host_capability_probe_id: string;
  host_capability_probe_path: string;
  host_capability_probe_sha256: string;
  host_capability_status: AgentAdapterOsIsolationProviderHostCapabilityStatus;
  provider_host_capability_bound: boolean;
  adapter_id: AgentAdapterPackageId;
  backend: AgentAdapterBackend;
  provider: AgentAdapterOsIsolationProvider;
  helper_exit_code: number;
  stdout_sha256: string;
  stderr_sha256: string;
  transcript_sha256: string;
  provider_tool_execution_witness_expectation?: AgentAdapterOsIsolationProviderToolExecutionWitnessExpectation;
  provider_specific_tool_name?: string | null;
  provider_specific_tool_sha256?: string | null;
  platform?: string;
};

export type AgentAdapterOsIsolationProviderHelperCollection = AgentAdapterOsIsolationProbeCollection & {
  probe_source?: "service_owned_provider_helper_collection_probe" | "operator_attested" | "unknown";
  provider_tool_execution_witness_expectation?: AgentAdapterOsIsolationProviderToolExecutionWitnessExpectation;
  diagnostics?: string[];
};

export type AgentAdapterOsIsolationProviderHelperCollectionProbe = (
  input: AgentAdapterOsIsolationProviderHelperCollectionProbeInput
) => AgentAdapterOsIsolationProviderHelperCollection | null | undefined;

export type AgentAdapterOsIsolationProviderHelperCollectionOptions = {
  provider_helper_collection_probe?: AgentAdapterOsIsolationProviderHelperCollectionProbe;
};

export type AgentAdapterOsIsolationProviderHostCapabilityFact = {
  capability: string;
  observed: boolean;
  evidence_sha256: string | null;
  notes: string | null;
};

export type AgentAdapterOsIsolationProviderHostCapabilityTool = {
  name: string;
  present: boolean;
  version: string | null;
  binary_sha256: string | null;
};

export type AgentAdapterOsIsolationProviderHostCapabilityKernelFeature = {
  name: string;
  observed: boolean;
  evidence_sha256: string | null;
  notes: string | null;
};

export type AgentAdapterOsIsolationProviderHostCapabilityProbeInput = {
  project_root: string;
  project_id: string;
  host_capability_probe_id: string;
  adapter_id: AgentAdapterPackageId;
  backend: AgentAdapterBackend;
  requested_provider: string;
  provider: AgentAdapterOsIsolationProvider | null;
  platform: NodeJS.Platform;
};

export type AgentAdapterOsIsolationProviderHostCapabilityProbeResult = {
  probe_source?: "service_owned_provider_host_capability_probe" | "operator_attested" | "unknown";
  provider_host_capability_available?: boolean;
  platform?: string;
  capability_facts?: AgentAdapterOsIsolationProviderHostCapabilityFact[];
  required_tools?: AgentAdapterOsIsolationProviderHostCapabilityTool[];
  kernel_features?: AgentAdapterOsIsolationProviderHostCapabilityKernelFeature[];
  diagnostics?: string[];
};

export type AgentAdapterOsIsolationProviderHostCapabilityProbe = (
  input: AgentAdapterOsIsolationProviderHostCapabilityProbeInput
) => AgentAdapterOsIsolationProviderHostCapabilityProbeResult | null | undefined;

export type AgentAdapterOsIsolationProviderHostCapabilityOptions = {
  provider_host_capability_probe?: AgentAdapterOsIsolationProviderHostCapabilityProbe;
};

export type AgentAdapterOsIsolationSandboxLaunchStatus =
  | "ready_for_service_owned_os_sandbox_execution"
  | "blocked_sandbox_provider_unsupported"
  | "blocked_sandbox_provider_not_os_enforced"
  | "blocked_sandbox_launcher_preflight_missing";

export type AgentAdapterOsIsolationSandboxLaunchInput = {
  project_id: string;
  launch_id?: string;
  adapter_id: AgentAdapterPackageId;
  backend?: AgentAdapterBackend;
  actor: string;
  requested_provider?: string;
  launcher_environment?: {
    platform?: string;
    notes?: string;
    provider_available?: boolean;
    launcher_binary_sha256?: string;
    command_override?: string;
  };
};

export type AgentAdapterOsIsolationSandboxExecutionStatus =
  | "sandbox_execution_probe_collected"
  | "blocked_sandbox_launch_preflight_missing"
  | "blocked_sandbox_launch_binding_mismatch"
  | "blocked_sandbox_execution_probe_not_collected";

export type AgentAdapterOsIsolationProviderRunnerStatus =
  | "ready_for_service_owned_provider_runner"
  | "blocked_provider_runner_launch_preflight_missing"
  | "blocked_provider_runner_binding_mismatch"
  | "blocked_provider_runner_unavailable"
  | "blocked_provider_runner_not_resolved";

export type AgentAdapterOsIsolationProviderHelperExecutionStatus =
  | "provider_helper_execution_attempted"
  | "blocked_provider_runner_manifest_missing"
  | "blocked_provider_runner_binding_mismatch"
  | "blocked_provider_helper_host_validation_missing"
  | "blocked_provider_helper_host_validation_not_validated"
  | "blocked_provider_helper_host_validation_binding_mismatch"
  | "blocked_provider_helper_not_configured"
  | "blocked_provider_helper_binary_mismatch"
  | "blocked_provider_helper_launch_failed"
  | "blocked_provider_helper_execution_failed";

export type AgentAdapterOsIsolationProviderHelperHostValidationStatus =
  | "provider_helper_host_validated"
  | "blocked_provider_host_capability_probe_missing"
  | "blocked_provider_host_capability_probe_not_observed"
  | "blocked_provider_host_capability_binding_mismatch"
  | "blocked_provider_runner_manifest_missing"
  | "blocked_provider_runner_binding_mismatch"
  | "blocked_provider_helper_host_not_validated"
  | "blocked_provider_helper_host_binary_mismatch"
  | "blocked_provider_helper_host_platform_mismatch"
  | "blocked_provider_helper_host_self_test_failed";

export type AgentAdapterOsIsolationProviderHelperCollectionStatus =
  | "provider_helper_os_evidence_collected"
  | "blocked_provider_helper_execution_missing"
  | "blocked_provider_helper_execution_binding_mismatch"
  | "blocked_provider_helper_execution_not_attempted"
  | "blocked_provider_helper_runtime_attestation_missing"
  | "blocked_provider_helper_collection_host_capability_binding_mismatch"
  | "blocked_provider_helper_collection_hash_mismatch"
  | "blocked_provider_helper_collection_provider_specific_tool_binding_missing"
  | "blocked_provider_helper_collection_provider_tool_witness_missing"
  | "blocked_provider_helper_collection_provider_family_os_enforcement_witness_missing"
  | "blocked_provider_helper_collection_provider_family_execution_profile_missing"
  | "blocked_provider_helper_collection_provider_specific_live_probe_attempt_missing"
  | "blocked_provider_helper_collection_provider_specific_live_probe_execution_missing"
  | "blocked_provider_helper_collection_provider_control_plane_execution_witness_missing"
  | "blocked_provider_helper_collection_incomplete_os_enforcement"
  | "blocked_provider_helper_collection_not_collected";

export type AgentAdapterOsIsolationProviderHostCapabilityStatus =
  | "provider_host_capability_observed"
  | "blocked_provider_host_capability_provider_unsupported"
  | "blocked_provider_host_capability_provider_not_os_enforced"
  | "blocked_provider_host_capability_provider_unavailable"
  | "blocked_provider_host_capability_probe_not_collected";

export type AgentAdapterOsIsolationSandboxExecutionInput = {
  project_id: string;
  execution_id?: string;
  launch_id: string;
  adapter_id: AgentAdapterPackageId;
  backend?: AgentAdapterBackend;
  actor: string;
  requested_provider?: string;
  execution_environment?: {
    platform?: string;
    notes?: string;
    process_isolation_enforced?: boolean;
    filesystem_scope_enforced?: boolean;
    network_isolation_enforced?: boolean;
    no_new_privileges?: boolean;
    escape_prevention?: boolean;
    adapter_process_exit_code?: number;
    stdout_sha256?: string;
    stderr_sha256?: string;
    transcript_sha256?: string;
    provider_tool_execution_witness_required?: boolean;
    provider_tool_execution_witness_bound?: boolean;
    provider_tool_execution_witness_sha256?: string;
    provider_specific_tool_execution_required?: boolean;
    provider_specific_tool_execution_bound?: boolean;
    provider_specific_tool_execution_sha256?: string;
    provider_specific_tool_name?: string;
    provider_specific_tool_sha256?: string;
    provider_family_os_enforcement_witness_required?: boolean;
    provider_family_os_enforcement_witness_bound?: boolean;
    provider_family_os_enforcement_witness_sha256?: string;
  };
};

export type AgentAdapterOsIsolationProviderRunnerInput = {
  project_id: string;
  runner_id?: string;
  launch_id: string;
  adapter_id: AgentAdapterPackageId;
  backend?: AgentAdapterBackend;
  actor: string;
  requested_provider?: string;
  runner_environment?: {
    platform?: string;
    notes?: string;
    provider_runner_available?: boolean;
    runner_binary_sha256?: string;
    command_override?: string;
    argv_override?: string[];
    env_override?: Record<string, string>;
  };
};

export type AgentAdapterOsIsolationProviderHelperExecutionInput = {
  project_id: string;
  helper_execution_id?: string;
  host_validation_id?: string;
  runner_id: string;
  launch_id: string;
  adapter_id: AgentAdapterPackageId;
  backend?: AgentAdapterBackend;
  actor: string;
  requested_provider?: string;
  helper_environment?: {
    platform?: string;
    notes?: string;
    helper_available?: boolean;
    helper_exit_code?: number;
    stdout_sha256?: string;
    stderr_sha256?: string;
    command_override?: string;
    argv_override?: string[];
    env_override?: Record<string, string>;
  };
};

export type AgentAdapterOsIsolationProviderHelperHostValidationInput = {
  project_id: string;
  host_validation_id?: string;
  host_capability_probe_id?: string;
  runner_id: string;
  launch_id: string;
  adapter_id: AgentAdapterPackageId;
  backend?: AgentAdapterBackend;
  actor: string;
  requested_provider?: string;
  host_environment?: {
    platform?: string;
    notes?: string;
    helper_host_ready?: boolean;
    helper_binary_sha256?: string;
    helper_version?: string;
    command_override?: string;
    argv_override?: string[];
    env_override?: Record<string, string>;
  };
};

export type AgentAdapterOsIsolationProviderHelperCollectionInput = {
  project_id: string;
  collection_id?: string;
  helper_execution_id: string;
  runner_id: string;
  launch_id: string;
  adapter_id: AgentAdapterPackageId;
  backend?: AgentAdapterBackend;
  actor: string;
  requested_provider?: string;
  collection_environment?: {
    platform?: string;
    notes?: string;
    process_isolation_enforced?: boolean;
    filesystem_scope_enforced?: boolean;
    network_isolation_enforced?: boolean;
    no_new_privileges?: boolean;
    escape_prevention?: boolean;
    adapter_process_exit_code?: number;
    stdout_sha256?: string;
    stderr_sha256?: string;
    transcript_sha256?: string;
    provider_tool_execution_witness_required?: boolean;
    provider_tool_execution_witness_bound?: boolean;
    provider_tool_execution_witness_sha256?: string;
    provider_specific_tool_execution_required?: boolean;
    provider_specific_tool_execution_bound?: boolean;
    provider_specific_tool_execution_sha256?: string;
    provider_specific_tool_name?: string;
    provider_specific_tool_sha256?: string;
    provider_family_os_enforcement_witness_required?: boolean;
    provider_family_os_enforcement_witness_bound?: boolean;
    provider_family_os_enforcement_witness_sha256?: string;
  };
};

export type AgentAdapterOsIsolationProviderHostCapabilityProbeRouteInput = {
  project_id: string;
  host_capability_probe_id?: string;
  adapter_id: AgentAdapterPackageId;
  backend?: AgentAdapterBackend;
  actor: string;
  requested_provider?: string;
  host_capability_environment?: {
    platform?: string;
    notes?: string;
    provider_host_capability_available?: boolean;
    capability_facts?: unknown;
    kernel_feature_facts?: unknown;
    tool_path?: string;
    proof_authority?: unknown;
    can_certify_ga?: unknown;
  };
};

export type AgentAdapterOsIsolationProbeStatus =
  | "os_isolation_probe_collected"
  | "blocked_os_isolation_provider_unsupported"
  | "blocked_os_isolation_provider_not_os_enforced"
  | "blocked_os_isolation_provider_unavailable"
  | "blocked_os_isolation_probe_not_collected";

export type AgentAdapterOsIsolationProbeInput = {
  project_id: string;
  probe_id?: string;
  adapter_id: AgentAdapterPackageId;
  backend?: AgentAdapterBackend;
  actor: string;
  requested_provider?: string;
  probe_environment?: AgentAdapterOsIsolationProbeEnvironment;
};

export type AgentAdapterOsIsolationReviewInput = {
  project_id: string;
  review_id?: string;
  adapter_id: AgentAdapterPackageId;
  backend?: AgentAdapterBackend;
  actor: string;
  evidence_path?: string;
};

export type AgentAdapterOsIsolationReviewVeto = {
  code: string;
  message: string;
};

export type AgentAdapterOsIsolationReviewCheck = {
  ok: boolean;
  required: true;
  observed: string | boolean | null;
};

export type AgentAdapterOsIsolationEvidenceArtifact = {
  kind: "agent_adapter_os_isolation_evidence";
  path: string;
  sha256: string;
  size_bytes: number;
};

export type AgentAdapterOsIsolationReview = {
  schema_version: "comath.agent_adapter_os_isolation_readiness.v1";
  review_id: string;
  project_id: string;
  adapter_id: AgentAdapterPackageId;
  backend: AgentAdapterBackend;
  created_at: string;
  ok: boolean;
  readiness_status:
    | "ready_for_os_isolation_release_review"
    | "blocked_missing_os_enforced_adapter_isolation";
  review_path: string;
  evidence_artifact: AgentAdapterOsIsolationEvidenceArtifact | null;
  checks: {
    evidence_artifact_bound: AgentAdapterOsIsolationReviewCheck;
    provider_os_enforced: AgentAdapterOsIsolationReviewCheck;
    process_isolation: AgentAdapterOsIsolationReviewCheck;
    filesystem_isolation: AgentAdapterOsIsolationReviewCheck;
    network_isolation: AgentAdapterOsIsolationReviewCheck;
    no_new_privileges: AgentAdapterOsIsolationReviewCheck;
    escape_prevention: AgentAdapterOsIsolationReviewCheck;
    adapter_binding: AgentAdapterOsIsolationReviewCheck;
    backend_binding: AgentAdapterOsIsolationReviewCheck;
    service_owned_probe: AgentAdapterOsIsolationReviewCheck;
    collected_probe_binding: AgentAdapterOsIsolationReviewCheck;
    provider_tool_execution_witness: AgentAdapterOsIsolationReviewCheck;
    provider_specific_tool_execution: AgentAdapterOsIsolationReviewCheck;
    provider_family_os_enforcement_witness: AgentAdapterOsIsolationReviewCheck;
    provider_family_execution_profile: AgentAdapterOsIsolationReviewCheck;
    provider_specific_live_probe_attempt: AgentAdapterOsIsolationReviewCheck;
    provider_specific_live_probe_execution: AgentAdapterOsIsolationReviewCheck;
    provider_control_plane_execution_witness: AgentAdapterOsIsolationReviewCheck;
    host_path_secret_free: AgentAdapterOsIsolationReviewCheck;
    non_authority: AgentAdapterOsIsolationReviewCheck;
  };
  adapter_execution_isolation: {
    required_for_ga: true;
    current_boundary: AgentAdapterOsIsolationBoundary;
    os_enforced: boolean;
    provider: AgentAdapterOsIsolationProvider | null;
    claims_runtime_enforcement: false;
    proof_authority: "none";
  };
  vetoes: AgentAdapterOsIsolationReviewVeto[];
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
};

export type AgentAdapterOsIsolationProbe = {
  schema_version: "comath.agent_adapter_os_isolation_probe.v1";
  probe_id: string;
  project_id: string;
  adapter_id: AgentAdapterPackageId;
  backend: AgentAdapterBackend;
  created_at: string;
  ok: boolean;
  probe_status: AgentAdapterOsIsolationProbeStatus;
  requested_provider: string;
  observed_provider: AgentAdapterOsIsolationProvider;
  provider_available: boolean;
  probe_path: string;
  evidence_path: string;
  evidence_artifact: AgentAdapterOsIsolationEvidenceArtifact;
  evidence: Required<Pick<AgentAdapterOsIsolationEvidence,
    | "schema_version"
    | "kind"
    | "adapter_id"
    | "backend"
    | "provider"
    | "evidence_source"
    | "process_isolation_enforced"
    | "filesystem_scope_enforced"
    | "network_isolation_enforced"
    | "no_new_privileges"
    | "escape_prevention"
    | "host_path_leak_free"
    | "secret_free"
    | "proof_authority"
    | "can_promote_claim"
    | "can_certify_ga"
  >> & {
    probe_id: string;
    probe_status: AgentAdapterOsIsolationProbeStatus;
    notes: string;
    collection_source?: "service_owned_os_probe";
    adapter_process_exit_code?: number;
    stdout_sha256?: string;
    stderr_sha256?: string;
    transcript_sha256?: string;
    provider_tool_execution_witness_required?: boolean;
    provider_tool_execution_witness_bound?: boolean;
    provider_tool_execution_witness_sha256?: string;
    provider_specific_tool_execution_required?: boolean;
    provider_specific_tool_execution_bound?: boolean;
    provider_specific_tool_execution_sha256?: string;
    provider_specific_tool_name?: string;
    provider_specific_tool_sha256?: string;
    provider_family_os_enforcement_witness_required?: boolean;
    provider_family_os_enforcement_witness_bound?: boolean;
    provider_family_os_enforcement_witness_sha256?: string;
    provider_family_execution_profile_required?: boolean;
    provider_family_execution_profile_bound?: boolean;
    provider_family_execution_kind?: AgentAdapterOsIsolationProviderFamilyExecutionKind;
    provider_family_execution_profile_sha256?: string;
    provider_family_execution_argv_sha256?: string;
    provider_specific_live_probe_attempt_required?: boolean;
    provider_specific_live_probe_attempt_bound?: boolean;
    provider_specific_live_probe_attempt_sha256?: string;
    provider_specific_live_probe_execution_required?: boolean;
    provider_specific_live_probe_execution_bound?: boolean;
    provider_specific_live_probe_execution_sha256?: string;
    provider_control_plane_execution_witness_required?: boolean;
    provider_control_plane_execution_witness_bound?: boolean;
    provider_control_plane_execution_witness_sha256?: string;
  };
  adapter_execution_isolation: {
    required_for_ga: true;
    current_boundary: AgentAdapterOsIsolationBoundary;
    os_enforced: boolean;
    provider: AgentAdapterOsIsolationProvider;
    claims_runtime_enforcement: false;
    proof_authority: "none";
  };
  blocker_certificate: {
    blocker_code: AgentAdapterOsIsolationProbeStatus;
    replayable_next_action: string;
    proof_authority: "none";
  } | null;
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
};

export type AgentAdapterOsIsolationSandboxLaunch = {
  schema_version: "comath.agent_adapter_os_isolation_sandbox_launch.v1";
  launch_id: string;
  project_id: string;
  adapter_id: AgentAdapterPackageId;
  backend: AgentAdapterBackend;
  created_at: string;
  ok: boolean;
  launch_status: AgentAdapterOsIsolationSandboxLaunchStatus;
  requested_provider: string;
  provider: AgentAdapterOsIsolationProvider;
  sandbox_launch_ready: boolean;
  launch_path: string;
  provider_command_contract: {
    provider: AgentAdapterOsIsolationProvider;
    shell: false;
    network_policy: "disabled";
    no_new_privileges_required: true;
    command_override_allowed: false;
    caller_supplied_success_allowed: false;
    proof_authority: "none";
  };
  launcher_preflight: {
    probe_source: "service_owned_launcher_preflight" | "missing";
    provider_available: boolean;
    launcher_binary_sha256: string | null;
    launcher_version: string | null;
    diagnostics: string[];
  };
  adapter_execution_isolation: {
    required_for_ga: true;
    current_boundary: AgentAdapterOsIsolationBoundary;
    os_enforced: false;
    provider: AgentAdapterOsIsolationProvider;
    claims_runtime_enforcement: false;
    proof_authority: "none";
  };
  blocker_certificate: {
    blocker_code: AgentAdapterOsIsolationSandboxLaunchStatus;
    replayable_next_action: string;
    proof_authority: "none";
  } | null;
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
};

export type AgentAdapterOsIsolationLaunchArtifact = {
  kind: "agent_adapter_os_isolation_sandbox_launch";
  path: string;
  sha256: string;
  size_bytes: number;
};

export type AgentAdapterOsIsolationSandboxExecution = {
  schema_version: "comath.agent_adapter_os_isolation_sandbox_execution.v1";
  execution_id: string;
  project_id: string;
  launch_id: string;
  adapter_id: AgentAdapterPackageId;
  backend: AgentAdapterBackend;
  created_at: string;
  ok: boolean;
  execution_status: AgentAdapterOsIsolationSandboxExecutionStatus;
  requested_provider: string;
  provider: AgentAdapterOsIsolationProvider;
  execution_path: string;
  launch_artifact: AgentAdapterOsIsolationLaunchArtifact | null;
  probe: AgentAdapterOsIsolationProbe | null;
  execution_probe: {
    probe_source: "service_owned_sandbox_execution_probe" | "missing";
    diagnostics: string[];
  };
  adapter_execution_isolation: {
    required_for_ga: true;
    current_boundary: AgentAdapterOsIsolationBoundary;
    os_enforced: boolean;
    provider: AgentAdapterOsIsolationProvider;
    claims_runtime_enforcement: false;
    proof_authority: "none";
  };
  blocker_certificate: {
    blocker_code: AgentAdapterOsIsolationSandboxExecutionStatus;
    replayable_next_action: string;
    proof_authority: "none";
  } | null;
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
};

export type AgentAdapterOsIsolationProviderRunner = {
  schema_version: "comath.agent_adapter_os_isolation_provider_runner.v1";
  runner_id: string;
  project_id: string;
  launch_id: string;
  adapter_id: AgentAdapterPackageId;
  backend: AgentAdapterBackend;
  created_at: string;
  ok: boolean;
  runner_status: AgentAdapterOsIsolationProviderRunnerStatus;
  requested_provider: string;
  provider: AgentAdapterOsIsolationProvider;
  provider_runner_ready: boolean;
  runner_path: string;
  launch_artifact: AgentAdapterOsIsolationLaunchArtifact | null;
  provider_runner_contract: {
    provider: AgentAdapterOsIsolationProvider;
    shell: false;
    network_policy: "disabled";
    no_new_privileges_required: true;
    command_override_allowed: false;
    environment_override_allowed: false;
    caller_supplied_success_allowed: false;
    fixed_argv_template: string[];
    fixed_argv_template_sha256: string;
    environment_policy: {
      inherit_parent_environment: false;
      allowed_env_keys: string[];
      env_override_allowed: false;
      env_policy_sha256: string;
    };
    proof_authority: "none";
  };
  provider_runner_resolution: {
    resolution_source: "service_owned_provider_runner_resolver" | "missing";
    runner_available: boolean;
    runner_binary_sha256: string | null;
    runner_version: string | null;
    diagnostics: string[];
  };
  adapter_execution_isolation: {
    required_for_ga: true;
    current_boundary: AgentAdapterOsIsolationBoundary;
    os_enforced: false;
    provider: AgentAdapterOsIsolationProvider;
    claims_runtime_enforcement: false;
    proof_authority: "none";
  };
  blocker_certificate: {
    blocker_code: AgentAdapterOsIsolationProviderRunnerStatus;
    replayable_next_action: string;
    proof_authority: "none";
  } | null;
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
};

export type AgentAdapterOsIsolationProviderRunnerArtifact = {
  kind: "agent_adapter_os_isolation_provider_runner";
  path: string;
  sha256: string;
  size_bytes: number;
};

export type AgentAdapterOsIsolationProviderHostCapabilityManifest = {
  schema_version: "comath.agent_adapter_os_isolation_provider_host_capability_probe.v1";
  host_capability_probe_id: string;
  project_id: string;
  adapter_id: AgentAdapterPackageId;
  backend: AgentAdapterBackend;
  created_at: string;
  ok: boolean;
  host_capability_status: AgentAdapterOsIsolationProviderHostCapabilityStatus;
  requested_provider: string;
  provider: AgentAdapterOsIsolationProvider;
  provider_host_capability_available: boolean;
  host_capability_probe_path: string;
  provider_host_capability: {
    probe_source: "service_owned_provider_host_capability_probe" | "missing";
    provider_host_capability_available: boolean;
    platform: string | null;
    platform_supported: boolean;
    capability_facts: AgentAdapterOsIsolationProviderHostCapabilityFact[];
    required_tools: AgentAdapterOsIsolationProviderHostCapabilityTool[];
    kernel_features: AgentAdapterOsIsolationProviderHostCapabilityKernelFeature[];
    diagnostics: string[];
    caller_supplied_success_allowed: false;
    proof_authority: "none";
  };
  adapter_execution_isolation: {
    required_for_ga: true;
    current_boundary: AgentAdapterOsIsolationBoundary;
    os_enforced: false;
    provider: AgentAdapterOsIsolationProvider;
    claims_runtime_enforcement: false;
    proof_authority: "none";
  };
  blocker_certificate: {
    blocker_code: AgentAdapterOsIsolationProviderHostCapabilityStatus;
    replayable_next_action: string;
    proof_authority: "none";
  } | null;
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
};

export type AgentAdapterOsIsolationProviderHostCapabilityArtifact = {
  kind: "agent_adapter_os_isolation_provider_host_capability_probe";
  path: string;
  sha256: string;
  size_bytes: number;
};

export type AgentAdapterOsIsolationProviderHelperExecution = {
  schema_version: "comath.agent_adapter_os_isolation_provider_helper_execution.v1";
  helper_execution_id: string;
  host_validation_id: string | null;
  project_id: string;
  runner_id: string;
  launch_id: string;
  adapter_id: AgentAdapterPackageId;
  backend: AgentAdapterBackend;
  created_at: string;
  ok: boolean;
  helper_execution_status: AgentAdapterOsIsolationProviderHelperExecutionStatus;
  requested_provider: string;
  provider: AgentAdapterOsIsolationProvider;
  provider_helper_attempted: boolean;
  helper_execution_path: string;
  launch_artifact: AgentAdapterOsIsolationLaunchArtifact | null;
  runner_artifact: AgentAdapterOsIsolationProviderRunnerArtifact | null;
  host_validation_artifact: AgentAdapterOsIsolationProviderHelperHostValidationArtifact | null;
  provider_helper_host_validation_binding: {
    bound: boolean;
    host_validation_id: string | null;
    host_validation_status: AgentAdapterOsIsolationProviderHelperHostValidationStatus | null;
    validation_source: "service_owned_provider_helper_host_validator" | "missing";
    host_capability_probe_id: string | null;
    provider_host_capability_bound: boolean;
    host_capability_status: AgentAdapterOsIsolationProviderHostCapabilityStatus | null;
    helper_binary_sha256: string | null;
    runner_binary_sha256: string | null;
    hashes_match_provider_runner: boolean;
    platform: string | null;
    platform_supported: boolean;
    diagnostics: string[];
    proof_authority: "none";
  };
  provider_helper_execution: {
    helper_source: "service_owned_provider_helper_config" | "missing";
    helper_configured: boolean;
    helper_binary_sha256: string | null;
    helper_args_prefix_sha256: string | null;
    helper_args_prefix_count: number;
    helper_version: string | null;
    helper_exit_code: number | null;
    helper_signal: string | null;
    timed_out: boolean;
    stdout_sha256: string | null;
    stderr_sha256: string | null;
    transcript_sha256: string | null;
    runtime_attestation_source: "helper_stdout_json" | "missing";
    runtime_attestation_bound: boolean;
    runtime_attestation_sha256: string | null;
    stdout_size_bytes: number;
    stderr_size_bytes: number;
    shell: false;
    network_policy: "disabled";
    no_new_privileges_required: true;
    command_override_allowed: false;
    environment_override_allowed: false;
    caller_supplied_success_allowed: false;
    fixed_args_template: string[];
    fixed_args_template_sha256: string;
    environment_policy: AgentAdapterOsIsolationProviderRunner["provider_runner_contract"]["environment_policy"];
    diagnostics: string[];
    proof_authority: "none";
  };
  adapter_execution_isolation: {
    required_for_ga: true;
    current_boundary: AgentAdapterOsIsolationBoundary;
    os_enforced: false;
    provider: AgentAdapterOsIsolationProvider;
    claims_runtime_enforcement: false;
    proof_authority: "none";
  };
  blocker_certificate: {
    blocker_code: AgentAdapterOsIsolationProviderHelperExecutionStatus;
    replayable_next_action: string;
    proof_authority: "none";
  };
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
};

export type AgentAdapterOsIsolationProviderHelperExecutionArtifact = {
  kind: "agent_adapter_os_isolation_provider_helper_execution";
  path: string;
  sha256: string;
  size_bytes: number;
};

export type AgentAdapterOsIsolationProviderHelperHostValidationArtifact = {
  kind: "agent_adapter_os_isolation_provider_helper_host_validation";
  path: string;
  sha256: string;
  size_bytes: number;
};

export type AgentAdapterOsIsolationProviderHelperHostValidation = {
  schema_version: "comath.agent_adapter_os_isolation_provider_helper_host_validation.v1";
  host_validation_id: string;
  host_capability_probe_id: string | null;
  project_id: string;
  runner_id: string;
  launch_id: string;
  adapter_id: AgentAdapterPackageId;
  backend: AgentAdapterBackend;
  created_at: string;
  ok: boolean;
  host_validation_status: AgentAdapterOsIsolationProviderHelperHostValidationStatus;
  requested_provider: string;
  provider: AgentAdapterOsIsolationProvider;
  provider_helper_host_ready: boolean;
  host_validation_path: string;
  provider_host_capability_artifact: AgentAdapterOsIsolationProviderHostCapabilityArtifact | null;
  provider_host_capability_binding: {
    bound: boolean;
    host_capability_probe_id: string | null;
    host_capability_status: AgentAdapterOsIsolationProviderHostCapabilityStatus | null;
    probe_source: "service_owned_provider_host_capability_probe" | "missing";
    provider_host_capability_available: boolean;
    provider: AgentAdapterOsIsolationProvider | null;
    platform: string | null;
    platform_supported: boolean;
    diagnostics: string[];
    proof_authority: "none";
  };
  launch_artifact: AgentAdapterOsIsolationLaunchArtifact | null;
  runner_artifact: AgentAdapterOsIsolationProviderRunnerArtifact | null;
  provider_helper_host_validation: {
    validation_source: "service_owned_provider_helper_host_validator" | "missing";
    helper_host_ready: boolean;
    helper_binary_sha256: string | null;
    runner_binary_sha256: string | null;
    hashes_match_provider_runner: boolean;
    helper_version: string | null;
    supported_platforms: string[];
    platform: string | null;
    platform_supported: boolean;
    host_capability_required: true;
    host_capability_bound: boolean;
    self_test_required: boolean;
    self_test_passed: boolean;
    self_test_exit_code: number | null;
    self_test_signal: string | null;
    self_test_timed_out: boolean;
    self_test_stdout_sha256: string | null;
    self_test_stderr_sha256: string | null;
    self_test_transcript_sha256: string | null;
    self_test_args_prefix_sha256: string | null;
    self_test_args_prefix_count: number;
    self_test_fixed_args_sha256: string | null;
    shell: false;
    network_policy: "disabled";
    no_new_privileges_required: true;
    command_override_allowed: false;
    environment_override_allowed: false;
    caller_supplied_success_allowed: false;
    fixed_args_template: string[];
    fixed_args_template_sha256: string;
    environment_policy: AgentAdapterOsIsolationProviderRunner["provider_runner_contract"]["environment_policy"];
    diagnostics: string[];
    proof_authority: "none";
  };
  adapter_execution_isolation: {
    required_for_ga: true;
    current_boundary: AgentAdapterOsIsolationBoundary;
    os_enforced: false;
    provider: AgentAdapterOsIsolationProvider;
    claims_runtime_enforcement: false;
    proof_authority: "none";
  };
  blocker_certificate: {
    blocker_code: AgentAdapterOsIsolationProviderHelperHostValidationStatus;
    replayable_next_action: string;
    proof_authority: "none";
  } | null;
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
};

export type AgentAdapterOsIsolationProviderHelperCollectionManifest = {
  schema_version: "comath.agent_adapter_os_isolation_provider_helper_collection.v1";
  collection_id: string;
  project_id: string;
  helper_execution_id: string;
  runner_id: string;
  launch_id: string;
  adapter_id: AgentAdapterPackageId;
  backend: AgentAdapterBackend;
  created_at: string;
  ok: boolean;
  collection_status: AgentAdapterOsIsolationProviderHelperCollectionStatus;
  requested_provider: string;
  provider: AgentAdapterOsIsolationProvider;
  collection_path: string;
  launch_artifact: AgentAdapterOsIsolationLaunchArtifact | null;
  runner_artifact: AgentAdapterOsIsolationProviderRunnerArtifact | null;
  helper_execution_artifact: AgentAdapterOsIsolationProviderHelperExecutionArtifact | null;
  probe: AgentAdapterOsIsolationProbe | null;
  provider_helper_collection: {
    probe_source: "service_owned_provider_helper_collection_probe" | "missing";
    hashes_match_helper_execution: boolean;
    os_enforcement_complete: boolean;
    incomplete_os_enforcement_facts: string[];
    helper_exit_code: number | null;
    stdout_sha256: string | null;
    stderr_sha256: string | null;
    transcript_sha256: string | null;
    runtime_attestation_bound: boolean;
    runtime_attestation_sha256: string | null;
    host_capability_required: true;
    host_capability_bound: boolean;
    host_validation_id: string | null;
    host_validation_path: string | null;
    host_validation_sha256: string | null;
    host_capability_probe_id: string | null;
    host_capability_probe_path: string | null;
    host_capability_probe_sha256: string | null;
    host_capability_status: AgentAdapterOsIsolationProviderHostCapabilityStatus | null;
    provider_tool_execution_witness_required: true;
    provider_tool_execution_witness_bound: boolean;
    provider_tool_execution_witness_sha256: string | null;
    provider_specific_tool_execution_required: boolean;
    provider_specific_tool_execution_bound: boolean;
    provider_specific_tool_execution_sha256: string | null;
    provider_specific_tool_name: string | null;
    provider_specific_tool_sha256: string | null;
    provider_family_os_enforcement_witness_required: true;
    provider_family_os_enforcement_witness_bound: boolean;
    provider_family_os_enforcement_witness_sha256: string | null;
    provider_family_execution_profile_required: true;
    provider_family_execution_profile_bound: boolean;
    provider_family_execution_kind: AgentAdapterOsIsolationProviderFamilyExecutionKind | null;
    provider_family_execution_profile_sha256: string | null;
    provider_family_execution_argv_sha256: string | null;
    provider_specific_live_probe_attempt_required: true;
    provider_specific_live_probe_attempt_bound: boolean;
    provider_specific_live_probe_attempt_sha256: string | null;
    provider_specific_live_probe_execution_required: boolean;
    provider_specific_live_probe_execution_bound: boolean;
    provider_specific_live_probe_execution_sha256: string | null;
    provider_control_plane_execution_witness_required: true;
    provider_control_plane_execution_witness_bound: boolean;
    provider_control_plane_execution_witness_sha256: string | null;
    diagnostics: string[];
    proof_authority: "none";
  };
  adapter_execution_isolation: {
    required_for_ga: true;
    current_boundary: AgentAdapterOsIsolationBoundary;
    os_enforced: boolean;
    provider: AgentAdapterOsIsolationProvider;
    claims_runtime_enforcement: false;
    proof_authority: "none";
  };
  blocker_certificate: {
    blocker_code: AgentAdapterOsIsolationProviderHelperCollectionStatus;
    replayable_next_action: string;
    proof_authority: "none";
  } | null;
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
};

const osEnforcedProviders = new Set<AgentAdapterOsIsolationProvider>([
  "oci_container",
  "nix_sandbox",
  "firejail",
  "windows_appcontainer",
  "macos_sandbox_exec"
]);

const allProviders = new Set<AgentAdapterOsIsolationProvider>([
  ...osEnforcedProviders,
  "service_process_boundary",
  "unknown"
]);

const supportedBackends = new Set<AgentAdapterBackend>(["bundled", "external", "codex-api"]);

const secretPattern = /(?:Authorization\s*:\s*Bearer\s+[^\s,;}"']+|(?:api[_-]?key|token|secret|password)\s*[=:]\s*[^\s,;}"']+)/i;
const secretScrubPattern = /(?:Authorization\s*:\s*Bearer\s+[^\s,;}"']+|(?:api[_-]?key|token|secret|password)\s*[=:]\s*[^\s,;}"']+)/gi;

function normalizeRelativePath(value: string): string {
  return value.replace(/\\/g, "/");
}

function assertReviewId(value: string | undefined): string {
  if (!value) {
    return `ADAPTER-OSISO-${Date.now()}`;
  }
  if (/^[A-Z0-9][A-Z0-9_-]{2,96}$/.test(value)) {
    return value;
  }
  throw new ComathError("invalid adapter OS-isolation review id", {
    statusCode: 400,
    code: "AGENT_ADAPTER_OS_ISOLATION_REVIEW_ID_INVALID"
  });
}

function assertProbeId(value: string | undefined): string {
  if (!value) {
    return `ADAPTER-OSISO-PROBE-${Date.now()}`;
  }
  if (/^[A-Z0-9][A-Z0-9_-]{2,96}$/.test(value)) {
    return value;
  }
  throw new ComathError("invalid adapter OS-isolation probe id", {
    statusCode: 400,
    code: "AGENT_ADAPTER_OS_ISOLATION_PROBE_ID_INVALID"
  });
}

function assertSandboxLaunchId(value: string | undefined): string {
  if (!value) {
    return `ADAPTER-OSISO-LAUNCH-${Date.now()}`;
  }
  if (/^[A-Z0-9][A-Z0-9_-]{2,96}$/.test(value)) {
    return value;
  }
  throw new ComathError("invalid adapter OS-isolation sandbox launch id", {
    statusCode: 400,
    code: "AGENT_ADAPTER_OS_ISOLATION_SANDBOX_LAUNCH_ID_INVALID"
  });
}

function assertSandboxExecutionId(value: string | undefined): string {
  if (!value) {
    return `ADAPTER-OSISO-EXEC-${Date.now()}`;
  }
  if (/^[A-Z0-9][A-Z0-9_-]{2,96}$/.test(value)) {
    return value;
  }
  throw new ComathError("invalid adapter OS-isolation sandbox execution id", {
    statusCode: 400,
    code: "AGENT_ADAPTER_OS_ISOLATION_SANDBOX_EXECUTION_ID_INVALID"
  });
}

function assertProviderRunnerId(value: string | undefined): string {
  if (!value) {
    return `ADAPTER-OSISO-RUNNER-${Date.now()}`;
  }
  if (/^[A-Z0-9][A-Z0-9_-]{2,96}$/.test(value)) {
    return value;
  }
  throw new ComathError("invalid adapter OS-isolation provider runner id", {
    statusCode: 400,
    code: "AGENT_ADAPTER_OS_ISOLATION_PROVIDER_RUNNER_ID_INVALID"
  });
}

function assertProviderHostCapabilityProbeId(value: string | undefined): string {
  if (!value) {
    return `ADAPTER-OSISO-HOST-CAP-${Date.now()}`;
  }
  if (/^[A-Z0-9][A-Z0-9_-]{2,96}$/.test(value)) {
    return value;
  }
  throw new ComathError("invalid adapter OS-isolation provider host capability probe id", {
    statusCode: 400,
    code: "AGENT_ADAPTER_OS_ISOLATION_PROVIDER_HOST_CAPABILITY_PROBE_ID_INVALID"
  });
}

function assertProviderHelperExecutionId(value: string | undefined): string {
  if (!value) {
    return `ADAPTER-OSISO-HELPER-${Date.now()}`;
  }
  if (/^[A-Z0-9][A-Z0-9_-]{2,96}$/.test(value)) {
    return value;
  }
  throw new ComathError("invalid adapter OS-isolation provider helper execution id", {
    statusCode: 400,
    code: "AGENT_ADAPTER_OS_ISOLATION_PROVIDER_HELPER_EXECUTION_ID_INVALID"
  });
}

function assertProviderHelperHostValidationId(value: string | undefined): string {
  if (!value) {
    return `ADAPTER-OSISO-HELPER-HOST-${Date.now()}`;
  }
  if (/^[A-Z0-9][A-Z0-9_-]{2,96}$/.test(value)) {
    return value;
  }
  throw new ComathError("invalid adapter OS-isolation provider helper host validation id", {
    statusCode: 400,
    code: "AGENT_ADAPTER_OS_ISOLATION_PROVIDER_HELPER_HOST_VALIDATION_ID_INVALID"
  });
}

function assertProviderHelperCollectionId(value: string | undefined): string {
  if (!value) {
    return `ADAPTER-OSISO-HELPER-COLLECT-${Date.now()}`;
  }
  if (/^[A-Z0-9][A-Z0-9_-]{2,96}$/.test(value)) {
    return value;
  }
  throw new ComathError("invalid adapter OS-isolation provider helper collection id", {
    statusCode: 400,
    code: "AGENT_ADAPTER_OS_ISOLATION_PROVIDER_HELPER_COLLECTION_ID_INVALID"
  });
}

function assertBackend(value: AgentAdapterBackend | undefined): AgentAdapterBackend {
  const backend = value ?? "bundled";
  if (supportedBackends.has(backend)) {
    return backend;
  }
  throw new ComathError("unsupported adapter backend for OS-isolation probe", {
    statusCode: 400,
    code: "AGENT_ADAPTER_OS_ISOLATION_PROBE_BACKEND_UNSUPPORTED"
  });
}

function sanitizeReviewText(value: string): string {
  return scrubHostPaths(value).replace(secretScrubPattern, "<secret>");
}

function sanitizeProbeText(value: unknown): string {
  return sanitizeReviewText(typeof value === "string" ? value : "").slice(0, 2048);
}

function projectRelativePath(projectRoot: string, absolutePath: string): string {
  return normalizeRelativePath(relative(resolve(projectRoot), absolutePath));
}

function readEvidenceArtifact(
  projectRoot: string,
  path: string
): { artifact: AgentAdapterOsIsolationEvidenceArtifact; text: string; evidence: AgentAdapterOsIsolationEvidence } {
  const absolutePath = assertPathAllowed(projectRoot, path, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath)) {
    throw new ComathError("adapter OS-isolation evidence artifact is missing", {
      statusCode: 400,
      code: "AGENT_ADAPTER_OS_ISOLATION_EVIDENCE_MISSING"
    });
  }
  if (!statSync(absolutePath).isFile()) {
    throw new ComathError("adapter OS-isolation evidence artifact is not a file", {
      statusCode: 400,
      code: "AGENT_ADAPTER_OS_ISOLATION_EVIDENCE_NOT_FILE"
    });
  }
  const bytes = readFileSync(absolutePath);
  const text = bytes.toString("utf8");
  let parsed: AgentAdapterOsIsolationEvidence;
  try {
    parsed = JSON.parse(text) as AgentAdapterOsIsolationEvidence;
  } catch {
    throw new ComathError("adapter OS-isolation evidence artifact must be JSON", {
      statusCode: 400,
      code: "AGENT_ADAPTER_OS_ISOLATION_EVIDENCE_INVALID_JSON"
    });
  }
  return {
    artifact: {
      kind: "agent_adapter_os_isolation_evidence",
      path: projectRelativePath(projectRoot, absolutePath),
      sha256: sha256Text(text),
      size_bytes: bytes.byteLength
    },
    text,
    evidence: parsed
  };
}

function check(ok: boolean, observed: string | boolean | null): AgentAdapterOsIsolationReviewCheck {
  return { ok, required: true, observed };
}

function evidenceOverclaimsAuthority(evidence: AgentAdapterOsIsolationEvidence): boolean {
  return (
    evidence.proof_authority !== undefined && evidence.proof_authority !== "none" ||
    evidence.can_promote_claim === true ||
    evidence.can_certify_ga === true
  );
}

function evidenceAdapterMatches(
  evidence: AgentAdapterOsIsolationEvidence | undefined,
  adapterId: AgentAdapterPackageId
): boolean {
  return Boolean(evidence && evidence.adapter_id === adapterId);
}

function evidenceBackendMatches(
  evidence: AgentAdapterOsIsolationEvidence | undefined,
  backend: AgentAdapterBackend
): boolean {
  return Boolean(evidence && evidence.backend === backend);
}

function evidenceIsServiceOwnedProbe(evidence: AgentAdapterOsIsolationEvidence | undefined): boolean {
  return Boolean(evidence && evidence.evidence_source === "service_owned_probe");
}

function evidenceHasProviderToolExecutionWitnessFields(
  evidence: AgentAdapterOsIsolationEvidence | undefined
): boolean {
  return Boolean(
    evidence?.collection_source === "service_owned_os_probe" &&
      evidence.provider_tool_execution_witness_required === true &&
      evidence.provider_tool_execution_witness_bound === true &&
      isSha256(evidence.provider_tool_execution_witness_sha256)
  );
}

function evidenceHasProviderSpecificToolExecutionFields(
  evidence: AgentAdapterOsIsolationEvidence | undefined
): boolean {
  return Boolean(
    evidence?.provider_specific_tool_execution_required === true &&
      evidence.provider_specific_tool_execution_bound === true &&
      isSha256(evidence.provider_specific_tool_execution_sha256) &&
      isProviderToolName(evidence.provider_specific_tool_name) &&
      isSha256(evidence.provider_specific_tool_sha256)
  );
}

function evidenceHasProviderFamilyOsEnforcementWitnessFields(
  evidence: AgentAdapterOsIsolationEvidence | undefined
): boolean {
  return Boolean(
    evidence?.collection_source === "service_owned_os_probe" &&
      evidence.provider_family_os_enforcement_witness_required === true &&
      evidence.provider_family_os_enforcement_witness_bound === true &&
      isSha256(evidence.provider_family_os_enforcement_witness_sha256)
  );
}

function evidenceHasProviderFamilyExecutionProfileFields(
  evidence: AgentAdapterOsIsolationEvidence | undefined
): boolean {
  return Boolean(
    evidence?.collection_source === "service_owned_os_probe" &&
      evidence.provider_family_execution_profile_required === true &&
      evidence.provider_family_execution_profile_bound === true &&
      isProviderFamilyExecutionKind(evidence.provider_family_execution_kind) &&
      isSha256(evidence.provider_family_execution_profile_sha256) &&
      isSha256(evidence.provider_family_execution_argv_sha256)
  );
}

function evidenceHasProviderSpecificLiveProbeAttemptFields(
  evidence: AgentAdapterOsIsolationEvidence | undefined
): boolean {
  return Boolean(
    evidence?.collection_source === "service_owned_os_probe" &&
      evidence.provider_specific_live_probe_attempt_required === true &&
      evidence.provider_specific_live_probe_attempt_bound === true &&
      isSha256(evidence.provider_specific_live_probe_attempt_sha256)
  );
}

function evidenceHasProviderSpecificLiveProbeExecutionFields(
  evidence: AgentAdapterOsIsolationEvidence | undefined
): boolean {
  return Boolean(
    evidence?.collection_source === "service_owned_os_probe" &&
      evidence.provider_specific_live_probe_execution_required === true &&
      evidence.provider_specific_live_probe_execution_bound === true &&
      isSha256(evidence.provider_specific_live_probe_execution_sha256)
  );
}

function evidenceHasProviderControlPlaneExecutionWitnessFields(
  evidence: AgentAdapterOsIsolationEvidence | undefined
): boolean {
  return Boolean(
    evidence?.collection_source === "service_owned_os_probe" &&
      evidence.provider_control_plane_execution_witness_required === true &&
      evidence.provider_control_plane_execution_witness_bound === true &&
      isSha256(evidence.provider_control_plane_execution_witness_sha256)
  );
}

function providerHelperCollectionHasProviderToolExecutionWitness(
  collection: AgentAdapterOsIsolationProviderHelperCollectionManifest | null | undefined,
  evidence: AgentAdapterOsIsolationEvidence | undefined
): boolean {
  const witnessSha256 = collection?.provider_helper_collection.provider_tool_execution_witness_sha256;
  return Boolean(
    collection &&
      collection.provider_helper_collection.provider_tool_execution_witness_required === true &&
      collection.provider_helper_collection.provider_tool_execution_witness_bound === true &&
      isSha256(witnessSha256) &&
      isSha256(evidence?.provider_tool_execution_witness_sha256) &&
      witnessSha256 === evidence.provider_tool_execution_witness_sha256
  );
}

function providerHelperCollectionRequiresProviderSpecificToolExecution(
  collection: AgentAdapterOsIsolationProviderHelperCollectionManifest | null | undefined,
  evidence: AgentAdapterOsIsolationEvidence | undefined
): boolean {
  return Boolean(
    collection?.provider_helper_collection.provider_specific_tool_execution_required === true ||
      collection?.provider_helper_collection.provider_tool_execution_witness_required === true ||
      collection?.provider_helper_collection.provider_tool_execution_witness_bound === true ||
      evidence?.provider_specific_tool_execution_required === true ||
      evidence?.provider_tool_execution_witness_required === true ||
      evidence?.provider_tool_execution_witness_bound === true
  );
}

function providerHelperCollectionHasProviderSpecificToolExecution(
  collection: AgentAdapterOsIsolationProviderHelperCollectionManifest | null | undefined,
  evidence: AgentAdapterOsIsolationEvidence | undefined
): boolean {
  return Boolean(
    collection?.provider_helper_collection.provider_specific_tool_execution_required === true &&
      collection.provider_helper_collection.provider_specific_tool_execution_bound === true &&
      isSha256(collection.provider_helper_collection.provider_specific_tool_execution_sha256) &&
      isProviderToolName(collection.provider_helper_collection.provider_specific_tool_name) &&
      isSha256(collection.provider_helper_collection.provider_specific_tool_sha256) &&
      evidenceHasProviderSpecificToolExecutionFields(evidence) &&
      collection.provider_helper_collection.provider_specific_tool_execution_sha256 ===
        evidence?.provider_specific_tool_execution_sha256 &&
      collection.provider_helper_collection.provider_specific_tool_name ===
        evidence?.provider_specific_tool_name &&
      collection.provider_helper_collection.provider_specific_tool_sha256 ===
        evidence?.provider_specific_tool_sha256
  );
}

function providerHelperCollectionRequiresProviderFamilyOsEnforcementWitness(
  collection: AgentAdapterOsIsolationProviderHelperCollectionManifest | null | undefined,
  evidence: AgentAdapterOsIsolationEvidence | undefined
): boolean {
  return Boolean(collection || evidence?.provider_family_os_enforcement_witness_required === true);
}

function providerHelperCollectionHasProviderFamilyOsEnforcementWitness(
  collection: AgentAdapterOsIsolationProviderHelperCollectionManifest | null | undefined,
  evidence: AgentAdapterOsIsolationEvidence | undefined
): boolean {
  const witnessSha256 = collection?.provider_helper_collection.provider_family_os_enforcement_witness_sha256;
  return Boolean(
    collection &&
      collection.provider_helper_collection.provider_family_os_enforcement_witness_required === true &&
      collection.provider_helper_collection.provider_family_os_enforcement_witness_bound === true &&
      isSha256(witnessSha256) &&
      isSha256(evidence?.provider_family_os_enforcement_witness_sha256) &&
      witnessSha256 === evidence.provider_family_os_enforcement_witness_sha256
  );
}

function providerHelperCollectionRequiresProviderFamilyExecutionProfile(
  collection: AgentAdapterOsIsolationProviderHelperCollectionManifest | null | undefined,
  evidence: AgentAdapterOsIsolationEvidence | undefined
): boolean {
  return Boolean(collection || evidence?.provider_family_execution_profile_required === true);
}

function providerHelperCollectionHasProviderFamilyExecutionProfile(
  collection: AgentAdapterOsIsolationProviderHelperCollectionManifest | null | undefined,
  evidence: AgentAdapterOsIsolationEvidence | undefined
): boolean {
  const profileSha256 = collection?.provider_helper_collection.provider_family_execution_profile_sha256;
  const argvSha256 = collection?.provider_helper_collection.provider_family_execution_argv_sha256;
  return Boolean(
    collection &&
      collection.provider_helper_collection.provider_family_execution_profile_required === true &&
      collection.provider_helper_collection.provider_family_execution_profile_bound === true &&
      isProviderFamilyExecutionKind(collection.provider_helper_collection.provider_family_execution_kind) &&
      isSha256(profileSha256) &&
      isSha256(argvSha256) &&
      evidenceHasProviderFamilyExecutionProfileFields(evidence) &&
      collection.provider_helper_collection.provider_family_execution_kind ===
        evidence?.provider_family_execution_kind &&
      profileSha256 === evidence.provider_family_execution_profile_sha256 &&
      argvSha256 === evidence.provider_family_execution_argv_sha256
  );
}

function providerHelperCollectionRequiresProviderSpecificLiveProbeAttempt(
  collection: AgentAdapterOsIsolationProviderHelperCollectionManifest | null | undefined,
  evidence: AgentAdapterOsIsolationEvidence | undefined
): boolean {
  return Boolean(collection || evidence?.provider_specific_live_probe_attempt_required === true);
}

function providerHelperCollectionRequiresProviderSpecificLiveProbeExecution(
  collection: AgentAdapterOsIsolationProviderHelperCollectionManifest | null | undefined,
  evidence: AgentAdapterOsIsolationEvidence | undefined
): boolean {
  return Boolean(collection || evidence?.provider_specific_live_probe_execution_required === true);
}

function providerHelperCollectionRequiresProviderControlPlaneExecutionWitness(
  collection: AgentAdapterOsIsolationProviderHelperCollectionManifest | null | undefined,
  evidence: AgentAdapterOsIsolationEvidence | undefined
): boolean {
  return Boolean(collection || evidence?.provider_control_plane_execution_witness_required === true);
}

function providerHelperCollectionHasProviderSpecificLiveProbeAttempt(
  collection: AgentAdapterOsIsolationProviderHelperCollectionManifest | null | undefined,
  evidence: AgentAdapterOsIsolationEvidence | undefined
): boolean {
  const attemptSha256 = collection?.provider_helper_collection.provider_specific_live_probe_attempt_sha256;
  return Boolean(
    collection &&
      collection.provider_helper_collection.provider_specific_live_probe_attempt_required === true &&
      collection.provider_helper_collection.provider_specific_live_probe_attempt_bound === true &&
      isSha256(attemptSha256) &&
      evidenceHasProviderSpecificLiveProbeAttemptFields(evidence) &&
      attemptSha256 === evidence?.provider_specific_live_probe_attempt_sha256
  );
}

function providerHelperCollectionHasProviderSpecificLiveProbeExecution(
  collection: AgentAdapterOsIsolationProviderHelperCollectionManifest | null | undefined,
  evidence: AgentAdapterOsIsolationEvidence | undefined
): boolean {
  const executionSha256 = collection?.provider_helper_collection.provider_specific_live_probe_execution_sha256;
  return Boolean(
    collection &&
      collection.provider_helper_collection.provider_specific_live_probe_execution_required === true &&
      collection.provider_helper_collection.provider_specific_live_probe_execution_bound === true &&
      isSha256(executionSha256) &&
      evidenceHasProviderSpecificLiveProbeExecutionFields(evidence) &&
      executionSha256 === evidence?.provider_specific_live_probe_execution_sha256
  );
}

function providerHelperCollectionHasProviderControlPlaneExecutionWitness(
  collection: AgentAdapterOsIsolationProviderHelperCollectionManifest | null | undefined,
  evidence: AgentAdapterOsIsolationEvidence | undefined
): boolean {
  const witnessSha256 = collection?.provider_helper_collection.provider_control_plane_execution_witness_sha256;
  return Boolean(
    collection &&
      collection.provider_helper_collection.provider_control_plane_execution_witness_required === true &&
      collection.provider_helper_collection.provider_control_plane_execution_witness_bound === true &&
      isSha256(witnessSha256) &&
      evidenceHasProviderControlPlaneExecutionWitnessFields(evidence) &&
      witnessSha256 === evidence?.provider_control_plane_execution_witness_sha256
  );
}

function providerHelperCollectionHasCurrentHostCapabilityProviderSpecificTool(input: {
  projectRoot: string;
  collection: AgentAdapterOsIsolationProviderHelperCollectionManifest | null | undefined;
  evidence: AgentAdapterOsIsolationEvidence | undefined;
}): boolean {
  const collection = input.collection;
  const evidence = input.evidence;
  const hostCapabilityProbeId = collection?.provider_helper_collection.host_capability_probe_id;
  const hostCapabilityPath = collection?.provider_helper_collection.host_capability_probe_path;
  const hostCapabilitySha256 = collection?.provider_helper_collection.host_capability_probe_sha256;
  if (
    !collection ||
    !evidence ||
    typeof hostCapabilityProbeId !== "string" ||
    typeof hostCapabilityPath !== "string" ||
    !isSha256(hostCapabilitySha256) ||
    collection.provider !== evidence.provider ||
    collection.provider_helper_collection.host_capability_status !== "provider_host_capability_observed"
  ) {
    return false;
  }
  const currentBundle = readProviderHostCapabilityProbeArtifact(input.projectRoot, hostCapabilityProbeId);
  const currentTool = providerSpecificHostCapabilityTool({
    hostCapability: currentBundle?.hostCapability,
    provider: collection.provider
  });
  return Boolean(
    currentBundle &&
      currentBundle.artifact.path === hostCapabilityPath &&
      currentBundle.artifact.sha256 === hostCapabilitySha256 &&
      currentBundle.hostCapability.host_capability_probe_path === hostCapabilityPath &&
      currentBundle.hostCapability.project_id === collection.project_id &&
      currentBundle.hostCapability.adapter_id === collection.adapter_id &&
      currentBundle.hostCapability.backend === collection.backend &&
      currentBundle.hostCapability.provider === collection.provider &&
      providerHostCapabilityIsObserved(currentBundle) &&
      currentTool &&
      currentTool.name === collection.provider_helper_collection.provider_specific_tool_name &&
      currentTool.sha256 === collection.provider_helper_collection.provider_specific_tool_sha256 &&
      currentTool.name === evidence.provider_specific_tool_name &&
      currentTool.sha256 === evidence.provider_specific_tool_sha256
  );
}

function providerHelperCollectionRequiresProviderToolExecutionWitness(
  collection: AgentAdapterOsIsolationProviderHelperCollectionManifest | null | undefined,
  evidence: AgentAdapterOsIsolationEvidence | undefined
): boolean {
  return Boolean(collection || evidence?.provider_tool_execution_witness_required === true);
}

function evidenceHasCollectedProbeBinding(
  projectRoot: string,
  artifact: AgentAdapterOsIsolationEvidenceArtifact | undefined,
  evidence: AgentAdapterOsIsolationEvidence | undefined
): boolean {
  if (!artifact || !evidence || typeof evidence.probe_id !== "string") {
    return false;
  }
  if (
    evidence.probe_status !== "os_isolation_probe_collected" ||
    evidence.collection_source !== "service_owned_os_probe"
  ) {
    return false;
  }
  const expectedEvidencePath = probeEvidencePath(evidence.probe_id);
  if (artifact.path !== expectedEvidencePath) {
    return false;
  }
  const absoluteProbePath = assertPathAllowed(projectRoot, probePath(evidence.probe_id), {
    purpose: "read",
    resolveRealpath: true
  });
  if (!existsSync(absoluteProbePath) || !statSync(absoluteProbePath).isFile()) {
    return false;
  }
  try {
    const parsedProbe = JSON.parse(readFileSync(absoluteProbePath, "utf8")) as AgentAdapterOsIsolationProbe;
    const providerHelperCollection = readProviderHelperCollectionManifest(projectRoot, evidence.probe_id);
    const providerToolWitnessRequired = providerHelperCollectionRequiresProviderToolExecutionWitness(
      providerHelperCollection,
      evidence
    );
    const providerToolWitnessBound = Boolean(
      !providerToolWitnessRequired ||
        (
          evidenceHasProviderToolExecutionWitnessFields(evidence) &&
          parsedProbe.evidence?.provider_tool_execution_witness_required === true &&
          parsedProbe.evidence?.provider_tool_execution_witness_bound === true &&
          isSha256(parsedProbe.evidence?.provider_tool_execution_witness_sha256) &&
          parsedProbe.evidence?.provider_tool_execution_witness_sha256 === evidence.provider_tool_execution_witness_sha256 &&
          (
            providerHelperCollection
              ? providerHelperCollectionHasProviderToolExecutionWitness(providerHelperCollection, evidence)
              : true
          )
        )
    );
    const providerSpecificToolRequired = providerHelperCollectionRequiresProviderSpecificToolExecution(
      providerHelperCollection,
      evidence
    );
    const providerSpecificToolBound = Boolean(
      !providerSpecificToolRequired ||
        (
          evidenceHasProviderSpecificToolExecutionFields(evidence) &&
          parsedProbe.evidence?.provider_specific_tool_execution_required === true &&
          parsedProbe.evidence?.provider_specific_tool_execution_bound === true &&
          isSha256(parsedProbe.evidence?.provider_specific_tool_execution_sha256) &&
          parsedProbe.evidence?.provider_specific_tool_execution_sha256 ===
            evidence.provider_specific_tool_execution_sha256 &&
          parsedProbe.evidence?.provider_specific_tool_name === evidence.provider_specific_tool_name &&
          parsedProbe.evidence?.provider_specific_tool_sha256 === evidence.provider_specific_tool_sha256 &&
          (
            providerHelperCollection
              ? providerHelperCollectionHasProviderSpecificToolExecution(providerHelperCollection, evidence) &&
                providerHelperCollectionHasCurrentHostCapabilityProviderSpecificTool({
                  projectRoot,
                  collection: providerHelperCollection,
                  evidence
                })
              : true
          )
        )
    );
    const providerFamilyOsEnforcementWitnessRequired = providerHelperCollectionRequiresProviderFamilyOsEnforcementWitness(
      providerHelperCollection,
      evidence
    );
    const providerFamilyOsEnforcementWitnessBound = Boolean(
      !providerFamilyOsEnforcementWitnessRequired ||
        (
          evidenceHasProviderFamilyOsEnforcementWitnessFields(evidence) &&
          parsedProbe.evidence?.provider_family_os_enforcement_witness_required === true &&
          parsedProbe.evidence?.provider_family_os_enforcement_witness_bound === true &&
          isSha256(parsedProbe.evidence?.provider_family_os_enforcement_witness_sha256) &&
          parsedProbe.evidence?.provider_family_os_enforcement_witness_sha256 ===
            evidence.provider_family_os_enforcement_witness_sha256 &&
          (
            providerHelperCollection
              ? providerHelperCollectionHasProviderFamilyOsEnforcementWitness(providerHelperCollection, evidence)
              : true
          )
        )
    );
    const providerFamilyExecutionProfileRequired = providerHelperCollectionRequiresProviderFamilyExecutionProfile(
      providerHelperCollection,
      evidence
    );
    const providerFamilyExecutionProfileBound = Boolean(
      !providerFamilyExecutionProfileRequired ||
        (
          evidenceHasProviderFamilyExecutionProfileFields(evidence) &&
          parsedProbe.evidence?.provider_family_execution_profile_required === true &&
          parsedProbe.evidence?.provider_family_execution_profile_bound === true &&
          parsedProbe.evidence?.provider_family_execution_kind === evidence.provider_family_execution_kind &&
          parsedProbe.evidence?.provider_family_execution_profile_sha256 ===
            evidence.provider_family_execution_profile_sha256 &&
          parsedProbe.evidence?.provider_family_execution_argv_sha256 ===
            evidence.provider_family_execution_argv_sha256 &&
          (
            providerHelperCollection
              ? providerHelperCollectionHasProviderFamilyExecutionProfile(providerHelperCollection, evidence)
              : true
          )
        )
    );
    const providerSpecificLiveProbeAttemptRequired = providerHelperCollectionRequiresProviderSpecificLiveProbeAttempt(
      providerHelperCollection,
      evidence
    );
    const providerSpecificLiveProbeAttemptBound = Boolean(
      !providerSpecificLiveProbeAttemptRequired ||
        (
          evidenceHasProviderSpecificLiveProbeAttemptFields(evidence) &&
          parsedProbe.evidence?.provider_specific_live_probe_attempt_required === true &&
          parsedProbe.evidence?.provider_specific_live_probe_attempt_bound === true &&
          isSha256(parsedProbe.evidence?.provider_specific_live_probe_attempt_sha256) &&
          parsedProbe.evidence?.provider_specific_live_probe_attempt_sha256 ===
            evidence.provider_specific_live_probe_attempt_sha256 &&
          (
            providerHelperCollection
              ? providerHelperCollectionHasProviderSpecificLiveProbeAttempt(providerHelperCollection, evidence)
              : true
          )
        )
    );
    const providerSpecificLiveProbeExecutionRequired = providerHelperCollectionRequiresProviderSpecificLiveProbeExecution(
      providerHelperCollection,
      evidence
    );
    const providerSpecificLiveProbeExecutionBound = Boolean(
      !providerSpecificLiveProbeExecutionRequired ||
        (
          evidenceHasProviderSpecificLiveProbeExecutionFields(evidence) &&
          parsedProbe.evidence?.provider_specific_live_probe_execution_required === true &&
          parsedProbe.evidence?.provider_specific_live_probe_execution_bound === true &&
          isSha256(parsedProbe.evidence?.provider_specific_live_probe_execution_sha256) &&
          parsedProbe.evidence?.provider_specific_live_probe_execution_sha256 ===
            evidence.provider_specific_live_probe_execution_sha256 &&
          (
            providerHelperCollection
              ? providerHelperCollectionHasProviderSpecificLiveProbeExecution(providerHelperCollection, evidence)
              : true
          )
        )
    );
    const providerControlPlaneExecutionWitnessRequired = providerHelperCollectionRequiresProviderControlPlaneExecutionWitness(
      providerHelperCollection,
      evidence
    );
    const providerControlPlaneExecutionWitnessBound = Boolean(
      !providerControlPlaneExecutionWitnessRequired ||
        (
          evidenceHasProviderControlPlaneExecutionWitnessFields(evidence) &&
          parsedProbe.evidence?.provider_control_plane_execution_witness_required === true &&
          parsedProbe.evidence?.provider_control_plane_execution_witness_bound === true &&
          isSha256(parsedProbe.evidence?.provider_control_plane_execution_witness_sha256) &&
          parsedProbe.evidence?.provider_control_plane_execution_witness_sha256 ===
            evidence.provider_control_plane_execution_witness_sha256 &&
          (
            providerHelperCollection
              ? providerHelperCollectionHasProviderControlPlaneExecutionWitness(providerHelperCollection, evidence)
              : true
          )
        )
    );
    return Boolean(
      parsedProbe.schema_version === "comath.agent_adapter_os_isolation_probe.v1" &&
        parsedProbe.probe_id === evidence.probe_id &&
        parsedProbe.ok === true &&
        parsedProbe.probe_status === "os_isolation_probe_collected" &&
        parsedProbe.evidence_path === expectedEvidencePath &&
        parsedProbe.evidence_artifact?.sha256 === artifact.sha256 &&
        parsedProbe.evidence?.probe_id === evidence.probe_id &&
        parsedProbe.evidence?.collection_source === "service_owned_os_probe" &&
        parsedProbe.evidence?.adapter_id === evidence.adapter_id &&
        parsedProbe.evidence?.backend === evidence.backend &&
        parsedProbe.evidence?.provider === evidence.provider &&
        providerToolWitnessBound &&
        providerSpecificToolBound &&
        providerFamilyOsEnforcementWitnessBound &&
        providerFamilyExecutionProfileBound &&
        providerSpecificLiveProbeAttemptBound &&
        providerSpecificLiveProbeExecutionBound &&
        providerControlPlaneExecutionWitnessBound &&
        parsedProbe.proof_authority === "none" &&
        parsedProbe.can_promote_claim === false &&
        parsedProbe.can_certify_ga === false
    );
  } catch {
    return false;
  }
}

function evidenceLeaksHostPathOrSecret(text: string, evidence: AgentAdapterOsIsolationEvidence): boolean {
  return (
    scrubHostPaths(text) !== text ||
    secretPattern.test(text) ||
    evidence.host_path_leak_free === false ||
    evidence.secret_free === false
  );
}

function buildVetoes(input: {
  evidencePresent: boolean;
  checks: AgentAdapterOsIsolationReview["checks"];
  evidence?: AgentAdapterOsIsolationEvidence;
  text?: string;
}): AgentAdapterOsIsolationReviewVeto[] {
  const vetoes: AgentAdapterOsIsolationReviewVeto[] = [];
  if (!input.evidencePresent) {
    vetoes.push({
      code: "adapter_os_isolation_evidence_missing",
      message: "OS-enforced adapter isolation evidence is required before this adapter can satisfy GA release readiness."
    });
  }
  if (!input.checks.provider_os_enforced.ok) {
    vetoes.push({
      code: "adapter_os_isolation_provider_not_os_enforced",
      message: "The recorded provider is not an OS-enforced isolation boundary."
    });
  }
  if (!input.checks.process_isolation.ok) {
    vetoes.push({ code: "adapter_os_process_isolation_missing", message: "Process isolation was not enforced." });
  }
  if (!input.checks.filesystem_isolation.ok) {
    vetoes.push({ code: "adapter_os_filesystem_isolation_missing", message: "Filesystem scope isolation was not enforced." });
  }
  if (!input.checks.network_isolation.ok) {
    vetoes.push({ code: "adapter_os_network_isolation_missing", message: "Network isolation was not enforced." });
  }
  if (!input.checks.no_new_privileges.ok) {
    vetoes.push({ code: "adapter_os_no_new_privileges_missing", message: "No-new-privileges isolation was not enforced." });
  }
  if (!input.checks.escape_prevention.ok) {
    vetoes.push({ code: "adapter_os_escape_prevention_missing", message: "Escape-prevention evidence was not present." });
  }
  if (!input.checks.adapter_binding.ok) {
    vetoes.push({
      code: "adapter_os_isolation_evidence_adapter_mismatch",
      message: "OS-isolation evidence was not bound to the reviewed adapter package."
    });
  }
  if (!input.checks.backend_binding.ok) {
    vetoes.push({
      code: "adapter_os_isolation_evidence_backend_mismatch",
      message: "OS-isolation evidence was not bound to the reviewed adapter backend."
    });
  }
  if (!input.checks.service_owned_probe.ok) {
    vetoes.push({
      code: "adapter_os_isolation_evidence_not_service_owned_probe",
      message: "OS-isolation release-readiness evidence must come from a service-owned probe."
    });
  }
  if (!input.checks.collected_probe_binding.ok) {
    vetoes.push({
      code: "adapter_os_isolation_collected_probe_binding_missing",
      message: "OS-isolation readiness evidence must bind to a service-owned collected probe manifest."
    });
  }
  if (!input.checks.provider_tool_execution_witness.ok) {
    vetoes.push({
      code: "adapter_os_isolation_provider_tool_execution_witness_missing",
      message: "Collected OS-isolation evidence must carry a provider-tool execution witness bound to the service-owned collection probe."
    });
  }
  if (!input.checks.provider_specific_tool_execution.ok) {
    vetoes.push({
      code: "adapter_os_isolation_provider_specific_tool_execution_missing",
      message: "Collected OS-isolation evidence must bind the provider-tool execution witness to the current host-capability provider tool."
    });
  }
  if (!input.checks.provider_family_os_enforcement_witness.ok) {
    vetoes.push({
      code: "adapter_os_isolation_provider_family_os_enforcement_witness_missing",
      message: "Collected OS-isolation evidence must carry a provider-family OS-enforcement witness bound to the complete service-owned enforcement facts."
    });
  }
  if (!input.checks.provider_family_execution_profile.ok) {
    vetoes.push({
      code: "adapter_os_isolation_provider_family_execution_profile_missing",
      message: "Collected OS-isolation evidence must bind the provider-family OS-enforcement witness to the service-derived provider-family execution kind, profile hash, and argv hash."
    });
  }
  if (!input.checks.provider_specific_live_probe_attempt.ok) {
    vetoes.push({
      code: "adapter_os_isolation_provider_specific_live_probe_attempt_missing",
      message: "Collected OS-isolation evidence must bind complete OS-enforcement facts to a provider-specific live probe attempt for the current provider family."
    });
  }
  if (!input.checks.provider_specific_live_probe_execution.ok) {
    vetoes.push({
      code: "adapter_os_isolation_provider_specific_live_probe_execution_missing",
      message: "Collected OS-isolation evidence must bind complete OS-enforcement facts to a service-owned provider-specific live probe execution transcript for the current provider family."
    });
  }
  if (!input.checks.provider_control_plane_execution_witness.ok) {
    vetoes.push({
      code: "adapter_os_isolation_provider_control_plane_execution_witness_missing",
      message: "Collected OS-isolation evidence must bind the provider-specific live probe execution to a provider control-plane execution witness for the current sandbox family."
    });
  }
  if (!input.checks.host_path_secret_free.ok) {
    vetoes.push({
      code: "adapter_os_isolation_evidence_leaks_host_path_or_secret",
      message: "OS-isolation evidence leaked host paths or secret-like material."
    });
  }
  if (!input.checks.non_authority.ok) {
    vetoes.push({
      code: "adapter_os_isolation_evidence_overclaims_authority",
      message: "OS-isolation evidence attempted to claim proof authority, claim promotion, or GA certification."
    });
  }
  return vetoes;
}

function reviewPath(reviewId: string): string {
  return normalizeRelativePath(join(".comath", "release", "agent-adapter-os-isolation", reviewId, "review.json"));
}

function probePath(probeId: string): string {
  return normalizeRelativePath(join(".comath", "release", "agent-adapter-os-isolation", probeId, "probe.json"));
}

function probeEvidencePath(probeId: string): string {
  return normalizeRelativePath(join(".comath", "release", "agent-adapter-os-isolation", probeId, "evidence.json"));
}

function sandboxLaunchPath(launchId: string): string {
  return normalizeRelativePath(join(".comath", "release", "agent-adapter-os-isolation", launchId, "sandbox-launch.json"));
}

function sandboxExecutionPath(executionId: string): string {
  return normalizeRelativePath(join(".comath", "release", "agent-adapter-os-isolation", executionId, "sandbox-execution.json"));
}

function providerRunnerPath(runnerId: string): string {
  return normalizeRelativePath(join(".comath", "release", "agent-adapter-os-isolation", runnerId, "provider-runner.json"));
}

function providerHostCapabilityProbePath(hostCapabilityProbeId: string): string {
  return normalizeRelativePath(join(".comath", "release", "agent-adapter-os-isolation", hostCapabilityProbeId, "provider-host-capability-probe.json"));
}

function providerHelperExecutionPath(helperExecutionId: string): string {
  return normalizeRelativePath(join(".comath", "release", "agent-adapter-os-isolation", helperExecutionId, "provider-helper-execution.json"));
}

function providerHelperHostValidationPath(hostValidationId: string): string {
  return normalizeRelativePath(join(".comath", "release", "agent-adapter-os-isolation", hostValidationId, "provider-helper-host-validation.json"));
}

function providerHelperCollectionPath(collectionId: string): string {
  return normalizeRelativePath(join(".comath", "release", "agent-adapter-os-isolation", collectionId, "provider-helper-collection.json"));
}

function readSandboxLaunchArtifact(
  projectRoot: string,
  launchId: string
): { artifact: AgentAdapterOsIsolationLaunchArtifact; launch: AgentAdapterOsIsolationSandboxLaunch } | null {
  const path = sandboxLaunchPath(launchId);
  const absolutePath = assertPathAllowed(projectRoot, path, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    return null;
  }
  const bytes = readFileSync(absolutePath);
  let parsed: AgentAdapterOsIsolationSandboxLaunch;
  try {
    parsed = JSON.parse(bytes.toString("utf8")) as AgentAdapterOsIsolationSandboxLaunch;
  } catch {
    return null;
  }
  return {
    artifact: {
      kind: "agent_adapter_os_isolation_sandbox_launch",
      path,
      sha256: sha256Text(bytes.toString("utf8")),
      size_bytes: bytes.byteLength
    },
    launch: parsed
  };
}

function readProviderRunnerArtifact(
  projectRoot: string,
  runnerId: string
): { artifact: AgentAdapterOsIsolationProviderRunnerArtifact; runner: AgentAdapterOsIsolationProviderRunner } | null {
  const path = providerRunnerPath(runnerId);
  const absolutePath = assertPathAllowed(projectRoot, path, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    return null;
  }
  const bytes = readFileSync(absolutePath);
  let parsed: AgentAdapterOsIsolationProviderRunner;
  try {
    parsed = JSON.parse(bytes.toString("utf8")) as AgentAdapterOsIsolationProviderRunner;
  } catch {
    return null;
  }
  return {
    artifact: {
      kind: "agent_adapter_os_isolation_provider_runner",
      path,
      sha256: sha256Text(bytes.toString("utf8")),
      size_bytes: bytes.byteLength
    },
    runner: parsed
  };
}

function readProviderHostCapabilityProbeArtifact(
  projectRoot: string,
  hostCapabilityProbeId: string
): {
  artifact: AgentAdapterOsIsolationProviderHostCapabilityArtifact;
  hostCapability: AgentAdapterOsIsolationProviderHostCapabilityManifest;
} | null {
  const path = providerHostCapabilityProbePath(hostCapabilityProbeId);
  const absolutePath = assertPathAllowed(projectRoot, path, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    return null;
  }
  const bytes = readFileSync(absolutePath);
  let parsed: AgentAdapterOsIsolationProviderHostCapabilityManifest;
  try {
    parsed = JSON.parse(bytes.toString("utf8")) as AgentAdapterOsIsolationProviderHostCapabilityManifest;
  } catch {
    return null;
  }
  return {
    artifact: {
      kind: "agent_adapter_os_isolation_provider_host_capability_probe",
      path,
      sha256: sha256Text(bytes.toString("utf8")),
      size_bytes: bytes.byteLength
    },
    hostCapability: parsed
  };
}

function readProviderHelperExecutionArtifact(
  projectRoot: string,
  helperExecutionId: string
): { artifact: AgentAdapterOsIsolationProviderHelperExecutionArtifact; helperExecution: AgentAdapterOsIsolationProviderHelperExecution } | null {
  const path = providerHelperExecutionPath(helperExecutionId);
  const absolutePath = assertPathAllowed(projectRoot, path, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    return null;
  }
  const bytes = readFileSync(absolutePath);
  let parsed: AgentAdapterOsIsolationProviderHelperExecution;
  try {
    parsed = JSON.parse(bytes.toString("utf8")) as AgentAdapterOsIsolationProviderHelperExecution;
  } catch {
    return null;
  }
  return {
    artifact: {
      kind: "agent_adapter_os_isolation_provider_helper_execution",
      path,
      sha256: sha256Text(bytes.toString("utf8")),
      size_bytes: bytes.byteLength
    },
    helperExecution: parsed
  };
}

function readProviderHelperCollectionManifest(
  projectRoot: string,
  collectionId: string
): AgentAdapterOsIsolationProviderHelperCollectionManifest | null {
  const path = providerHelperCollectionPath(collectionId);
  const absolutePath = assertPathAllowed(projectRoot, path, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(absolutePath, "utf8")) as AgentAdapterOsIsolationProviderHelperCollectionManifest;
  } catch {
    return null;
  }
}

function readProviderHelperHostValidationArtifact(
  projectRoot: string,
  hostValidationId: string
): {
  artifact: AgentAdapterOsIsolationProviderHelperHostValidationArtifact;
  hostValidation: AgentAdapterOsIsolationProviderHelperHostValidation;
} | null {
  const path = providerHelperHostValidationPath(hostValidationId);
  const absolutePath = assertPathAllowed(projectRoot, path, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    return null;
  }
  const bytes = readFileSync(absolutePath);
  let parsed: AgentAdapterOsIsolationProviderHelperHostValidation;
  try {
    parsed = JSON.parse(bytes.toString("utf8")) as AgentAdapterOsIsolationProviderHelperHostValidation;
  } catch {
    return null;
  }
  return {
    artifact: {
      kind: "agent_adapter_os_isolation_provider_helper_host_validation",
      path,
      sha256: sha256Text(bytes.toString("utf8")),
      size_bytes: bytes.byteLength
    },
    hostValidation: parsed
  };
}

function normalizeRequestedProvider(value: string | undefined): {
  requestedProvider: string;
  knownProvider: AgentAdapterOsIsolationProvider | null;
} {
  const requestedProvider = value ?? "unknown";
  return {
    requestedProvider,
    knownProvider: allProviders.has(requestedProvider as AgentAdapterOsIsolationProvider)
      ? requestedProvider as AgentAdapterOsIsolationProvider
      : null
  };
}

function classifyProbe(input: {
  knownProvider: AgentAdapterOsIsolationProvider | null;
  providerAvailable: boolean;
}): { status: AgentAdapterOsIsolationProbeStatus; observedProvider: AgentAdapterOsIsolationProvider } {
  if (!input.knownProvider || input.knownProvider === "unknown") {
    return { status: "blocked_os_isolation_provider_unsupported", observedProvider: "unknown" };
  }
  if (!osEnforcedProviders.has(input.knownProvider)) {
    return { status: "blocked_os_isolation_provider_not_os_enforced", observedProvider: input.knownProvider };
  }
  if (!input.providerAvailable) {
    return { status: "blocked_os_isolation_provider_unavailable", observedProvider: "service_process_boundary" };
  }
  return { status: "blocked_os_isolation_probe_not_collected", observedProvider: input.knownProvider };
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
}

function isBoundedExecutionId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_.:-]{1,160}$/.test(value);
}

function isProviderToolName(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_.:-]{1,160}$/.test(value);
}

const providerFamilyExecutionKindByProvider: Partial<Record<AgentAdapterOsIsolationProvider, AgentAdapterOsIsolationProviderFamilyExecutionKind>> = {
  oci_container: "oci_container_os_probe",
  nix_sandbox: "nix_sandbox_os_probe",
  firejail: "firejail_os_probe",
  windows_appcontainer: "windows_appcontainer_os_probe",
  macos_sandbox_exec: "macos_sandbox_exec_os_probe"
};

const providerControlPlaneExecutionKindByProvider: Partial<Record<AgentAdapterOsIsolationProvider, AgentAdapterOsIsolationProviderControlPlaneExecutionKind>> = {
  oci_container: "oci_container_control_plane_execution",
  nix_sandbox: "nix_sandbox_control_plane_execution",
  firejail: "firejail_control_plane_execution",
  windows_appcontainer: "windows_appcontainer_control_plane_execution",
  macos_sandbox_exec: "macos_sandbox_exec_control_plane_execution"
};

function isProviderFamilyExecutionKind(value: unknown): value is AgentAdapterOsIsolationProviderFamilyExecutionKind {
  return typeof value === "string" && Object.values(providerFamilyExecutionKindByProvider).includes(
    value as AgentAdapterOsIsolationProviderFamilyExecutionKind
  );
}

function isProviderControlPlaneExecutionKind(
  value: unknown
): value is AgentAdapterOsIsolationProviderControlPlaneExecutionKind {
  return typeof value === "string" && Object.values(providerControlPlaneExecutionKindByProvider).includes(
    value as AgentAdapterOsIsolationProviderControlPlaneExecutionKind
  );
}

function providerFamilyExecutionKindForProvider(
  provider: AgentAdapterOsIsolationProvider
): AgentAdapterOsIsolationProviderFamilyExecutionKind | null {
  return providerFamilyExecutionKindByProvider[provider] ?? null;
}

function providerControlPlaneExecutionKindForProvider(
  provider: AgentAdapterOsIsolationProvider
): AgentAdapterOsIsolationProviderControlPlaneExecutionKind | null {
  return providerControlPlaneExecutionKindByProvider[provider] ?? null;
}

function providerSpecificToolExpectationRequired(
  expectation: AgentAdapterOsIsolationProviderToolExecutionWitnessExpectation | undefined
): boolean {
  return Boolean(
    isProviderToolName(expectation?.host_capability_tool_name) &&
      isSha256(expectation?.host_capability_tool_sha256)
  );
}

function providerFamilyExecutionProfileRequired(
  expectation: AgentAdapterOsIsolationProviderToolExecutionWitnessExpectation | undefined
): expectation is AgentAdapterOsIsolationProviderToolExecutionWitnessExpectation & {
  provider_family_execution_kind: AgentAdapterOsIsolationProviderFamilyExecutionKind;
  provider_family_execution_profile_sha256: string;
  provider_family_execution_argv_sha256: string;
} {
  return Boolean(
    isProviderFamilyExecutionKind(expectation?.provider_family_execution_kind) &&
      isSha256(expectation?.provider_family_execution_profile_sha256) &&
      isSha256(expectation?.provider_family_execution_argv_sha256)
  );
}

function providerToolExecutionWitnessAccepted(
  value: unknown,
  input: AgentAdapterOsIsolationProviderHelperCollectionProbeInput,
  expectation: AgentAdapterOsIsolationProviderToolExecutionWitnessExpectation | undefined
): value is AgentAdapterOsIsolationProviderToolExecutionWitness {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !isSha256(expectation?.tool_sha256) ||
    !isSha256(expectation?.profile_sha256) ||
    !isSha256(expectation?.argv_sha256)
  ) {
    return false;
  }
  const witness = value as Record<string, unknown>;
  return Boolean(
    witness.witness_source === "provider_specific_executed_tool" &&
      witness.provider === input.provider &&
      isBoundedExecutionId(witness.execution_id) &&
      witness.collection_id === input.collection_id &&
      witness.helper_execution_id === input.helper_execution_id &&
      witness.runner_id === input.runner_id &&
      witness.launch_id === input.launch_id &&
      isSha256(witness.tool_sha256) &&
      witness.tool_sha256.toLowerCase() === expectation.tool_sha256.toLowerCase() &&
      isSha256(witness.profile_sha256) &&
      witness.profile_sha256.toLowerCase() === expectation.profile_sha256.toLowerCase() &&
      isSha256(witness.argv_sha256) &&
      witness.argv_sha256.toLowerCase() === expectation.argv_sha256.toLowerCase() &&
      isSha256(witness.transcript_sha256) &&
      witness.transcript_sha256.toLowerCase() === input.transcript_sha256.toLowerCase() &&
      witness.network_policy === "disabled" &&
      witness.proof_authority === "none"
  );
}

function providerToolExecutionWitnessSha256(
  witness: AgentAdapterOsIsolationProviderToolExecutionWitness | undefined
): string | null {
  if (!witness) {
    return null;
  }
  if (
    witness.witness_source !== "provider_specific_executed_tool" ||
    !osEnforcedProviders.has(witness.provider) ||
    !isBoundedExecutionId(witness.execution_id) ||
    !isBoundedExecutionId(witness.collection_id) ||
    !isBoundedExecutionId(witness.helper_execution_id) ||
    !isBoundedExecutionId(witness.runner_id) ||
    !isBoundedExecutionId(witness.launch_id) ||
    !isSha256(witness.tool_sha256) ||
    !isSha256(witness.profile_sha256) ||
    !isSha256(witness.argv_sha256) ||
    !isSha256(witness.transcript_sha256) ||
    (
      (witness.host_capability_tool_name !== undefined || witness.host_capability_tool_sha256 !== undefined) &&
        (
          !isProviderToolName(witness.host_capability_tool_name) ||
            !isSha256(witness.host_capability_tool_sha256)
        )
    ) ||
    witness.network_policy !== "disabled" ||
    witness.proof_authority !== "none"
  ) {
    return null;
  }
  return sha256Text(canonicalJson({
    witness_source: witness.witness_source,
    provider: witness.provider,
    execution_id: witness.execution_id,
    collection_id: witness.collection_id,
    helper_execution_id: witness.helper_execution_id,
    runner_id: witness.runner_id,
    launch_id: witness.launch_id,
    tool_sha256: witness.tool_sha256.toLowerCase(),
    profile_sha256: witness.profile_sha256.toLowerCase(),
    argv_sha256: witness.argv_sha256.toLowerCase(),
    host_capability_tool_name: witness.host_capability_tool_name ?? null,
    host_capability_tool_sha256: witness.host_capability_tool_sha256?.toLowerCase() ?? null,
    transcript_sha256: witness.transcript_sha256.toLowerCase(),
    network_policy: witness.network_policy,
    proof_authority: "none"
  }));
}

function providerFamilyOsEnforcementWitnessAccepted(
  value: unknown,
  input: AgentAdapterOsIsolationProviderHelperCollectionProbeInput,
  expectation: AgentAdapterOsIsolationProviderToolExecutionWitnessExpectation | undefined
): value is AgentAdapterOsIsolationProviderFamilyOsEnforcementWitness {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !providerSpecificToolExpectationRequired(expectation) ||
    !isSha256(expectation?.tool_sha256) ||
    !isSha256(expectation?.profile_sha256) ||
    !isSha256(expectation?.argv_sha256)
  ) {
    return false;
  }
  const witness = value as Record<string, unknown>;
  return Boolean(
    witness.witness_source === "provider_family_os_enforcement" &&
      witness.provider === input.provider &&
      isBoundedExecutionId(witness.execution_id) &&
      witness.collection_id === input.collection_id &&
      witness.helper_execution_id === input.helper_execution_id &&
      witness.runner_id === input.runner_id &&
      witness.launch_id === input.launch_id &&
      witness.host_validation_id === input.host_validation_id &&
      witness.host_validation_path === input.host_validation_path &&
      isSha256(witness.host_validation_sha256) &&
      witness.host_validation_sha256.toLowerCase() === input.host_validation_sha256.toLowerCase() &&
      witness.host_capability_probe_id === input.host_capability_probe_id &&
      witness.host_capability_probe_path === input.host_capability_probe_path &&
      isSha256(witness.host_capability_probe_sha256) &&
      witness.host_capability_probe_sha256.toLowerCase() === input.host_capability_probe_sha256.toLowerCase() &&
      witness.host_capability_status === input.host_capability_status &&
      witness.provider_host_capability_bound === true &&
      input.provider_host_capability_bound === true &&
      witness.provider_specific_tool_name === expectation?.host_capability_tool_name &&
      isSha256(witness.provider_specific_tool_sha256) &&
      witness.provider_specific_tool_sha256.toLowerCase() === expectation?.host_capability_tool_sha256?.toLowerCase() &&
      isSha256(witness.provider_tool_sha256) &&
      witness.provider_tool_sha256.toLowerCase() === expectation.tool_sha256.toLowerCase() &&
      isSha256(witness.provider_tool_profile_sha256) &&
      witness.provider_tool_profile_sha256.toLowerCase() === expectation.profile_sha256.toLowerCase() &&
      isSha256(witness.provider_tool_argv_sha256) &&
      witness.provider_tool_argv_sha256.toLowerCase() === expectation.argv_sha256.toLowerCase() &&
      witness.collection_source === "service_owned_os_probe" &&
      witness.process_isolation_enforced === true &&
      witness.filesystem_scope_enforced === true &&
      witness.network_isolation_enforced === true &&
      witness.no_new_privileges === true &&
      witness.escape_prevention === true &&
      witness.adapter_process_exit_code === 0 &&
      input.helper_exit_code === 0 &&
      isSha256(witness.stdout_sha256) &&
      witness.stdout_sha256.toLowerCase() === input.stdout_sha256.toLowerCase() &&
      isSha256(witness.stderr_sha256) &&
      witness.stderr_sha256.toLowerCase() === input.stderr_sha256.toLowerCase() &&
      isSha256(witness.transcript_sha256) &&
      witness.transcript_sha256.toLowerCase() === input.transcript_sha256.toLowerCase() &&
      witness.network_policy === "disabled" &&
      witness.proof_authority === "none"
  );
}

function providerFamilyOsEnforcementWitnessSha256(
  witness: AgentAdapterOsIsolationProviderFamilyOsEnforcementWitness | undefined
): string | null {
  if (!witness) {
    return null;
  }
  if (
    witness.witness_source !== "provider_family_os_enforcement" ||
    !osEnforcedProviders.has(witness.provider) ||
    !isBoundedExecutionId(witness.execution_id) ||
    !isBoundedExecutionId(witness.collection_id) ||
    !isBoundedExecutionId(witness.helper_execution_id) ||
    !isBoundedExecutionId(witness.runner_id) ||
    !isBoundedExecutionId(witness.launch_id) ||
    !isBoundedExecutionId(witness.host_validation_id) ||
    typeof witness.host_validation_path !== "string" ||
    !isSha256(witness.host_validation_sha256) ||
    !isBoundedExecutionId(witness.host_capability_probe_id) ||
    typeof witness.host_capability_probe_path !== "string" ||
    !isSha256(witness.host_capability_probe_sha256) ||
    witness.host_capability_status !== "provider_host_capability_observed" ||
    witness.provider_host_capability_bound !== true ||
    !isProviderToolName(witness.provider_specific_tool_name) ||
    !isSha256(witness.provider_specific_tool_sha256) ||
    !isSha256(witness.provider_tool_sha256) ||
    !isSha256(witness.provider_tool_profile_sha256) ||
    !isSha256(witness.provider_tool_argv_sha256) ||
    witness.collection_source !== "service_owned_os_probe" ||
    witness.process_isolation_enforced !== true ||
    witness.filesystem_scope_enforced !== true ||
    witness.network_isolation_enforced !== true ||
    witness.no_new_privileges !== true ||
    witness.escape_prevention !== true ||
    witness.adapter_process_exit_code !== 0 ||
    !isSha256(witness.stdout_sha256) ||
    !isSha256(witness.stderr_sha256) ||
    !isSha256(witness.transcript_sha256) ||
    witness.network_policy !== "disabled" ||
    witness.proof_authority !== "none"
  ) {
    return null;
  }
  return sha256Text(canonicalJson({
    witness_source: "provider_family_os_enforcement",
    provider: witness.provider,
    execution_id: witness.execution_id,
    collection_id: witness.collection_id,
    helper_execution_id: witness.helper_execution_id,
    runner_id: witness.runner_id,
    launch_id: witness.launch_id,
    host_validation_id: witness.host_validation_id,
    host_validation_path: witness.host_validation_path,
    host_validation_sha256: witness.host_validation_sha256.toLowerCase(),
    host_capability_probe_id: witness.host_capability_probe_id,
    host_capability_probe_path: witness.host_capability_probe_path,
    host_capability_probe_sha256: witness.host_capability_probe_sha256.toLowerCase(),
    host_capability_status: witness.host_capability_status,
    provider_host_capability_bound: true,
    provider_specific_tool_name: witness.provider_specific_tool_name,
    provider_specific_tool_sha256: witness.provider_specific_tool_sha256.toLowerCase(),
    provider_tool_sha256: witness.provider_tool_sha256.toLowerCase(),
    provider_tool_profile_sha256: witness.provider_tool_profile_sha256.toLowerCase(),
    provider_tool_argv_sha256: witness.provider_tool_argv_sha256.toLowerCase(),
    collection_source: "service_owned_os_probe",
    process_isolation_enforced: true,
    filesystem_scope_enforced: true,
    network_isolation_enforced: true,
    no_new_privileges: true,
    escape_prevention: true,
    adapter_process_exit_code: 0,
    stdout_sha256: witness.stdout_sha256.toLowerCase(),
    stderr_sha256: witness.stderr_sha256.toLowerCase(),
    transcript_sha256: witness.transcript_sha256.toLowerCase(),
    network_policy: "disabled",
    proof_authority: "none"
  }));
}

function providerSpecificLiveProbeAttemptAccepted(
  value: unknown,
  input: AgentAdapterOsIsolationProviderHelperCollectionProbeInput,
  expectation: AgentAdapterOsIsolationProviderToolExecutionWitnessExpectation | undefined
): value is AgentAdapterOsIsolationProviderSpecificLiveProbeAttempt {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !providerFamilyExecutionProfileRequired(expectation) ||
    !isSha256(expectation.tool_sha256) ||
    !isSha256(expectation.profile_sha256) ||
    !isSha256(expectation.argv_sha256)
  ) {
    return false;
  }
  const attempt = value as Record<string, unknown>;
  return Boolean(
    attempt.attempt_source === "provider_specific_live_os_probe" &&
      attempt.provider === input.provider &&
      isBoundedExecutionId(attempt.execution_id) &&
      attempt.collection_id === input.collection_id &&
      attempt.helper_execution_id === input.helper_execution_id &&
      attempt.runner_id === input.runner_id &&
      attempt.launch_id === input.launch_id &&
      attempt.provider_family_execution_kind === expectation.provider_family_execution_kind &&
      isSha256(attempt.provider_family_execution_profile_sha256) &&
      attempt.provider_family_execution_profile_sha256.toLowerCase() ===
        expectation.provider_family_execution_profile_sha256.toLowerCase() &&
      isSha256(attempt.provider_family_execution_argv_sha256) &&
      attempt.provider_family_execution_argv_sha256.toLowerCase() ===
        expectation.provider_family_execution_argv_sha256.toLowerCase() &&
      isSha256(attempt.provider_tool_sha256) &&
      attempt.provider_tool_sha256.toLowerCase() === expectation.tool_sha256.toLowerCase() &&
      isSha256(attempt.provider_tool_profile_sha256) &&
      attempt.provider_tool_profile_sha256.toLowerCase() === expectation.profile_sha256.toLowerCase() &&
      isSha256(attempt.provider_tool_argv_sha256) &&
      attempt.provider_tool_argv_sha256.toLowerCase() === expectation.argv_sha256.toLowerCase() &&
      isSha256(attempt.transcript_sha256) &&
      attempt.transcript_sha256.toLowerCase() === input.transcript_sha256.toLowerCase() &&
      attempt.collection_source === "service_owned_os_probe" &&
      attempt.process_isolation_enforced === true &&
      attempt.filesystem_scope_enforced === true &&
      attempt.network_isolation_enforced === true &&
      attempt.no_new_privileges === true &&
      attempt.escape_prevention === true &&
      attempt.adapter_process_exit_code === 0 &&
      input.helper_exit_code === 0 &&
      attempt.network_policy === "disabled" &&
      attempt.proof_authority === "none"
  );
}

function providerSpecificLiveProbeAttemptSha256(
  attempt: AgentAdapterOsIsolationProviderSpecificLiveProbeAttempt | undefined
): string | null {
  if (!attempt) {
    return null;
  }
  if (
    attempt.attempt_source !== "provider_specific_live_os_probe" ||
    !osEnforcedProviders.has(attempt.provider) ||
    !isBoundedExecutionId(attempt.execution_id) ||
    !isBoundedExecutionId(attempt.collection_id) ||
    !isBoundedExecutionId(attempt.helper_execution_id) ||
    !isBoundedExecutionId(attempt.runner_id) ||
    !isBoundedExecutionId(attempt.launch_id) ||
    !isProviderFamilyExecutionKind(attempt.provider_family_execution_kind) ||
    !isSha256(attempt.provider_family_execution_profile_sha256) ||
    !isSha256(attempt.provider_family_execution_argv_sha256) ||
    !isSha256(attempt.provider_tool_sha256) ||
    !isSha256(attempt.provider_tool_profile_sha256) ||
    !isSha256(attempt.provider_tool_argv_sha256) ||
    !isSha256(attempt.transcript_sha256) ||
    attempt.collection_source !== "service_owned_os_probe" ||
    attempt.process_isolation_enforced !== true ||
    attempt.filesystem_scope_enforced !== true ||
    attempt.network_isolation_enforced !== true ||
    attempt.no_new_privileges !== true ||
    attempt.escape_prevention !== true ||
    attempt.adapter_process_exit_code !== 0 ||
    attempt.network_policy !== "disabled" ||
    attempt.proof_authority !== "none"
  ) {
    return null;
  }
  return sha256Text(canonicalJson({
    attempt_source: "provider_specific_live_os_probe",
    provider: attempt.provider,
    execution_id: attempt.execution_id,
    collection_id: attempt.collection_id,
    helper_execution_id: attempt.helper_execution_id,
    runner_id: attempt.runner_id,
    launch_id: attempt.launch_id,
    provider_family_execution_kind: attempt.provider_family_execution_kind,
    provider_family_execution_profile_sha256: attempt.provider_family_execution_profile_sha256.toLowerCase(),
    provider_family_execution_argv_sha256: attempt.provider_family_execution_argv_sha256.toLowerCase(),
    provider_tool_sha256: attempt.provider_tool_sha256.toLowerCase(),
    provider_tool_profile_sha256: attempt.provider_tool_profile_sha256.toLowerCase(),
    provider_tool_argv_sha256: attempt.provider_tool_argv_sha256.toLowerCase(),
    transcript_sha256: attempt.transcript_sha256.toLowerCase(),
    collection_source: "service_owned_os_probe",
    process_isolation_enforced: true,
    filesystem_scope_enforced: true,
    network_isolation_enforced: true,
    no_new_privileges: true,
    escape_prevention: true,
    adapter_process_exit_code: 0,
    network_policy: "disabled",
    proof_authority: "none"
  }));
}

function providerSpecificLiveProbeExecutionAccepted(
  execution: AgentAdapterOsIsolationProviderSpecificLiveProbeExecution | undefined,
  input: AgentAdapterOsIsolationProviderHelperCollectionProbeInput,
  expectation: AgentAdapterOsIsolationProviderToolExecutionWitnessExpectation | undefined
): execution is AgentAdapterOsIsolationProviderSpecificLiveProbeExecution {
  return Boolean(
    execution &&
      providerFamilyExecutionProfileRequired(expectation) &&
      execution.execution_source === "service_owned_provider_specific_live_os_probe" &&
      execution.provider === input.provider &&
      isBoundedExecutionId(execution.execution_id) &&
      execution.collection_id === input.collection_id &&
      execution.helper_execution_id === input.helper_execution_id &&
      execution.runner_id === input.runner_id &&
      execution.launch_id === input.launch_id &&
      execution.provider_family_execution_kind === expectation?.provider_family_execution_kind &&
      isSha256(execution.provider_family_execution_profile_sha256) &&
      execution.provider_family_execution_profile_sha256.toLowerCase() ===
        expectation?.provider_family_execution_profile_sha256?.toLowerCase() &&
      isSha256(execution.provider_family_execution_argv_sha256) &&
      execution.provider_family_execution_argv_sha256.toLowerCase() ===
        expectation?.provider_family_execution_argv_sha256?.toLowerCase() &&
      isSha256(execution.provider_tool_sha256) &&
      execution.provider_tool_sha256.toLowerCase() === expectation?.tool_sha256.toLowerCase() &&
      isSha256(execution.provider_tool_profile_sha256) &&
      execution.provider_tool_profile_sha256.toLowerCase() === expectation?.profile_sha256.toLowerCase() &&
      isSha256(execution.provider_tool_argv_sha256) &&
      execution.provider_tool_argv_sha256.toLowerCase() === expectation?.argv_sha256.toLowerCase() &&
      isSha256(execution.transcript_sha256) &&
      execution.transcript_sha256.toLowerCase() === input.transcript_sha256.toLowerCase() &&
      isSha256(execution.live_probe_tool_sha256) &&
      isSha256(execution.live_probe_argv_sha256) &&
      isSha256(execution.live_probe_stdout_sha256) &&
      isSha256(execution.live_probe_stderr_sha256) &&
      isSha256(execution.live_probe_transcript_sha256) &&
      execution.collection_source === "service_owned_os_probe" &&
      execution.process_isolation_enforced === true &&
      execution.filesystem_scope_enforced === true &&
      execution.network_isolation_enforced === true &&
      execution.no_new_privileges === true &&
      execution.escape_prevention === true &&
      execution.adapter_process_exit_code === 0 &&
      input.helper_exit_code === 0 &&
      execution.network_policy === "disabled" &&
      execution.proof_authority === "none"
  );
}

function providerSpecificLiveProbeExecutionSha256(
  execution: AgentAdapterOsIsolationProviderSpecificLiveProbeExecution | undefined
): string | null {
  if (!execution) {
    return null;
  }
  if (
    execution.execution_source !== "service_owned_provider_specific_live_os_probe" ||
    !osEnforcedProviders.has(execution.provider) ||
    !isBoundedExecutionId(execution.execution_id) ||
    !isBoundedExecutionId(execution.collection_id) ||
    !isBoundedExecutionId(execution.helper_execution_id) ||
    !isBoundedExecutionId(execution.runner_id) ||
    !isBoundedExecutionId(execution.launch_id) ||
    !isProviderFamilyExecutionKind(execution.provider_family_execution_kind) ||
    !isSha256(execution.provider_family_execution_profile_sha256) ||
    !isSha256(execution.provider_family_execution_argv_sha256) ||
    !isSha256(execution.provider_tool_sha256) ||
    !isSha256(execution.provider_tool_profile_sha256) ||
    !isSha256(execution.provider_tool_argv_sha256) ||
    !isSha256(execution.transcript_sha256) ||
    !isSha256(execution.live_probe_tool_sha256) ||
    !isSha256(execution.live_probe_argv_sha256) ||
    !isSha256(execution.live_probe_stdout_sha256) ||
    !isSha256(execution.live_probe_stderr_sha256) ||
    !isSha256(execution.live_probe_transcript_sha256) ||
    execution.collection_source !== "service_owned_os_probe" ||
    execution.process_isolation_enforced !== true ||
    execution.filesystem_scope_enforced !== true ||
    execution.network_isolation_enforced !== true ||
    execution.no_new_privileges !== true ||
    execution.escape_prevention !== true ||
    execution.adapter_process_exit_code !== 0 ||
    execution.network_policy !== "disabled" ||
    execution.proof_authority !== "none"
  ) {
    return null;
  }
  return sha256Text(canonicalJson({
    execution_source: "service_owned_provider_specific_live_os_probe",
    provider: execution.provider,
    execution_id: execution.execution_id,
    collection_id: execution.collection_id,
    helper_execution_id: execution.helper_execution_id,
    runner_id: execution.runner_id,
    launch_id: execution.launch_id,
    provider_family_execution_kind: execution.provider_family_execution_kind,
    provider_family_execution_profile_sha256: execution.provider_family_execution_profile_sha256.toLowerCase(),
    provider_family_execution_argv_sha256: execution.provider_family_execution_argv_sha256.toLowerCase(),
    provider_tool_sha256: execution.provider_tool_sha256.toLowerCase(),
    provider_tool_profile_sha256: execution.provider_tool_profile_sha256.toLowerCase(),
    provider_tool_argv_sha256: execution.provider_tool_argv_sha256.toLowerCase(),
    transcript_sha256: execution.transcript_sha256.toLowerCase(),
    live_probe_tool_sha256: execution.live_probe_tool_sha256.toLowerCase(),
    live_probe_argv_sha256: execution.live_probe_argv_sha256.toLowerCase(),
    live_probe_stdout_sha256: execution.live_probe_stdout_sha256.toLowerCase(),
    live_probe_stderr_sha256: execution.live_probe_stderr_sha256.toLowerCase(),
    live_probe_transcript_sha256: execution.live_probe_transcript_sha256.toLowerCase(),
    collection_source: "service_owned_os_probe",
    process_isolation_enforced: true,
    filesystem_scope_enforced: true,
    network_isolation_enforced: true,
    no_new_privileges: true,
    escape_prevention: true,
    adapter_process_exit_code: 0,
    network_policy: "disabled",
    proof_authority: "none"
  }));
}

function providerControlPlaneExecutionWitnessAccepted(
  witness: AgentAdapterOsIsolationProviderControlPlaneExecutionWitness | undefined,
  input: AgentAdapterOsIsolationProviderHelperCollectionProbeInput,
  expectation: AgentAdapterOsIsolationProviderToolExecutionWitnessExpectation | undefined,
  liveProbeExecution: AgentAdapterOsIsolationProviderSpecificLiveProbeExecution | undefined
): witness is AgentAdapterOsIsolationProviderControlPlaneExecutionWitness {
  const liveProbeExecutionSha256 = providerSpecificLiveProbeExecutionSha256(liveProbeExecution);
  const controlPlaneKind = providerControlPlaneExecutionKindForProvider(input.provider);
  return Boolean(
    witness &&
      liveProbeExecution &&
      isSha256(liveProbeExecutionSha256) &&
      providerFamilyExecutionProfileRequired(expectation) &&
      isProviderControlPlaneExecutionKind(controlPlaneKind) &&
      witness.witness_source === "provider_control_plane_execution" &&
      witness.provider === input.provider &&
      witness.control_plane_kind === controlPlaneKind &&
      isBoundedExecutionId(witness.execution_id) &&
      witness.collection_id === input.collection_id &&
      witness.helper_execution_id === input.helper_execution_id &&
      witness.runner_id === input.runner_id &&
      witness.launch_id === input.launch_id &&
      witness.provider_family_execution_kind === expectation.provider_family_execution_kind &&
      isSha256(witness.provider_family_execution_profile_sha256) &&
      witness.provider_family_execution_profile_sha256.toLowerCase() ===
        expectation.provider_family_execution_profile_sha256.toLowerCase() &&
      isSha256(witness.provider_family_execution_argv_sha256) &&
      witness.provider_family_execution_argv_sha256.toLowerCase() ===
        expectation.provider_family_execution_argv_sha256.toLowerCase() &&
      isSha256(witness.provider_tool_sha256) &&
      witness.provider_tool_sha256.toLowerCase() === expectation.tool_sha256.toLowerCase() &&
      isSha256(witness.provider_tool_profile_sha256) &&
      witness.provider_tool_profile_sha256.toLowerCase() === expectation.profile_sha256.toLowerCase() &&
      isSha256(witness.provider_tool_argv_sha256) &&
      witness.provider_tool_argv_sha256.toLowerCase() === expectation.argv_sha256.toLowerCase() &&
      isSha256(witness.transcript_sha256) &&
      witness.transcript_sha256.toLowerCase() === input.transcript_sha256.toLowerCase() &&
      witness.provider_specific_live_probe_execution_id === liveProbeExecution.execution_id &&
      isSha256(witness.provider_specific_live_probe_execution_sha256) &&
      witness.provider_specific_live_probe_execution_sha256.toLowerCase() === liveProbeExecutionSha256.toLowerCase() &&
      isSha256(witness.provider_specific_live_probe_tool_sha256) &&
      witness.provider_specific_live_probe_tool_sha256.toLowerCase() ===
        liveProbeExecution.live_probe_tool_sha256.toLowerCase() &&
      isSha256(witness.provider_specific_live_probe_argv_sha256) &&
      witness.provider_specific_live_probe_argv_sha256.toLowerCase() ===
        liveProbeExecution.live_probe_argv_sha256.toLowerCase() &&
      isSha256(witness.provider_specific_live_probe_stdout_sha256) &&
      witness.provider_specific_live_probe_stdout_sha256.toLowerCase() ===
        liveProbeExecution.live_probe_stdout_sha256.toLowerCase() &&
      isSha256(witness.provider_specific_live_probe_stderr_sha256) &&
      witness.provider_specific_live_probe_stderr_sha256.toLowerCase() ===
        liveProbeExecution.live_probe_stderr_sha256.toLowerCase() &&
      isSha256(witness.provider_specific_live_probe_transcript_sha256) &&
      witness.provider_specific_live_probe_transcript_sha256.toLowerCase() ===
        liveProbeExecution.live_probe_transcript_sha256.toLowerCase() &&
      witness.collection_source === "service_owned_os_probe" &&
      witness.network_policy === "disabled" &&
      witness.proof_authority === "none"
  );
}

function providerControlPlaneExecutionWitnessSha256(
  witness: AgentAdapterOsIsolationProviderControlPlaneExecutionWitness | undefined
): string | null {
  if (!witness) {
    return null;
  }
  if (
    witness.witness_source !== "provider_control_plane_execution" ||
    !osEnforcedProviders.has(witness.provider) ||
    !isProviderControlPlaneExecutionKind(witness.control_plane_kind) ||
    providerControlPlaneExecutionKindForProvider(witness.provider) !== witness.control_plane_kind ||
    !isBoundedExecutionId(witness.execution_id) ||
    !isBoundedExecutionId(witness.collection_id) ||
    !isBoundedExecutionId(witness.helper_execution_id) ||
    !isBoundedExecutionId(witness.runner_id) ||
    !isBoundedExecutionId(witness.launch_id) ||
    !isProviderFamilyExecutionKind(witness.provider_family_execution_kind) ||
    !isSha256(witness.provider_family_execution_profile_sha256) ||
    !isSha256(witness.provider_family_execution_argv_sha256) ||
    !isSha256(witness.provider_tool_sha256) ||
    !isSha256(witness.provider_tool_profile_sha256) ||
    !isSha256(witness.provider_tool_argv_sha256) ||
    !isSha256(witness.transcript_sha256) ||
    !isBoundedExecutionId(witness.provider_specific_live_probe_execution_id) ||
    !isSha256(witness.provider_specific_live_probe_execution_sha256) ||
    !isSha256(witness.provider_specific_live_probe_tool_sha256) ||
    !isSha256(witness.provider_specific_live_probe_argv_sha256) ||
    !isSha256(witness.provider_specific_live_probe_stdout_sha256) ||
    !isSha256(witness.provider_specific_live_probe_stderr_sha256) ||
    !isSha256(witness.provider_specific_live_probe_transcript_sha256) ||
    witness.collection_source !== "service_owned_os_probe" ||
    witness.network_policy !== "disabled" ||
    witness.proof_authority !== "none"
  ) {
    return null;
  }
  return sha256Text(canonicalJson({
    witness_source: "provider_control_plane_execution",
    provider: witness.provider,
    control_plane_kind: witness.control_plane_kind,
    execution_id: witness.execution_id,
    collection_id: witness.collection_id,
    helper_execution_id: witness.helper_execution_id,
    runner_id: witness.runner_id,
    launch_id: witness.launch_id,
    provider_family_execution_kind: witness.provider_family_execution_kind,
    provider_family_execution_profile_sha256: witness.provider_family_execution_profile_sha256.toLowerCase(),
    provider_family_execution_argv_sha256: witness.provider_family_execution_argv_sha256.toLowerCase(),
    provider_tool_sha256: witness.provider_tool_sha256.toLowerCase(),
    provider_tool_profile_sha256: witness.provider_tool_profile_sha256.toLowerCase(),
    provider_tool_argv_sha256: witness.provider_tool_argv_sha256.toLowerCase(),
    transcript_sha256: witness.transcript_sha256.toLowerCase(),
    provider_specific_live_probe_execution_id: witness.provider_specific_live_probe_execution_id,
    provider_specific_live_probe_execution_sha256:
      witness.provider_specific_live_probe_execution_sha256.toLowerCase(),
    provider_specific_live_probe_tool_sha256: witness.provider_specific_live_probe_tool_sha256.toLowerCase(),
    provider_specific_live_probe_argv_sha256: witness.provider_specific_live_probe_argv_sha256.toLowerCase(),
    provider_specific_live_probe_stdout_sha256: witness.provider_specific_live_probe_stdout_sha256.toLowerCase(),
    provider_specific_live_probe_stderr_sha256: witness.provider_specific_live_probe_stderr_sha256.toLowerCase(),
    provider_specific_live_probe_transcript_sha256:
      witness.provider_specific_live_probe_transcript_sha256.toLowerCase(),
    collection_source: "service_owned_os_probe",
    network_policy: "disabled",
    proof_authority: "none"
  }));
}

function serviceDerivedProviderControlPlaneExecutionWitness(input: {
  collectionProbeInput: AgentAdapterOsIsolationProviderHelperCollectionProbeInput;
  expectation: AgentAdapterOsIsolationProviderToolExecutionWitnessExpectation;
  liveProbeExecution: AgentAdapterOsIsolationProviderSpecificLiveProbeExecution | undefined;
  liveProbeExecutionSha256: string | null;
}): AgentAdapterOsIsolationProviderControlPlaneExecutionWitness | undefined {
  const controlPlaneKind = providerControlPlaneExecutionKindForProvider(input.collectionProbeInput.provider);
  if (
    !controlPlaneKind ||
    !providerFamilyExecutionProfileRequired(input.expectation) ||
    !input.liveProbeExecution ||
    !isSha256(input.liveProbeExecutionSha256)
  ) {
    return undefined;
  }
  const executionId = `CONTROL-${sha256Text(canonicalJson({
    schema_version: "comath.agent_adapter_os_isolation_provider_control_plane_execution_witness_id.v1",
    provider: input.collectionProbeInput.provider,
    control_plane_kind: controlPlaneKind,
    collection_id: input.collectionProbeInput.collection_id,
    helper_execution_id: input.collectionProbeInput.helper_execution_id,
    runner_id: input.collectionProbeInput.runner_id,
    launch_id: input.collectionProbeInput.launch_id,
    provider_family_execution_profile_sha256: input.expectation.provider_family_execution_profile_sha256,
    provider_specific_live_probe_execution_id: input.liveProbeExecution.execution_id,
    provider_specific_live_probe_execution_sha256: input.liveProbeExecutionSha256
  })).slice(0, 32)}`;
  return {
    witness_source: "provider_control_plane_execution",
    provider: input.collectionProbeInput.provider,
    control_plane_kind: controlPlaneKind,
    execution_id: executionId,
    collection_id: input.collectionProbeInput.collection_id,
    helper_execution_id: input.collectionProbeInput.helper_execution_id,
    runner_id: input.collectionProbeInput.runner_id,
    launch_id: input.collectionProbeInput.launch_id,
    provider_family_execution_kind: input.expectation.provider_family_execution_kind,
    provider_family_execution_profile_sha256: input.expectation.provider_family_execution_profile_sha256,
    provider_family_execution_argv_sha256: input.expectation.provider_family_execution_argv_sha256,
    provider_tool_sha256: input.expectation.tool_sha256,
    provider_tool_profile_sha256: input.expectation.profile_sha256,
    provider_tool_argv_sha256: input.expectation.argv_sha256,
    transcript_sha256: input.collectionProbeInput.transcript_sha256,
    provider_specific_live_probe_execution_id: input.liveProbeExecution.execution_id,
    provider_specific_live_probe_execution_sha256: input.liveProbeExecutionSha256,
    provider_specific_live_probe_tool_sha256: input.liveProbeExecution.live_probe_tool_sha256,
    provider_specific_live_probe_argv_sha256: input.liveProbeExecution.live_probe_argv_sha256,
    provider_specific_live_probe_stdout_sha256: input.liveProbeExecution.live_probe_stdout_sha256,
    provider_specific_live_probe_stderr_sha256: input.liveProbeExecution.live_probe_stderr_sha256,
    provider_specific_live_probe_transcript_sha256: input.liveProbeExecution.live_probe_transcript_sha256,
    collection_source: "service_owned_os_probe",
    network_policy: "disabled",
    proof_authority: "none"
  };
}

function collectionProviderToolWitnessBound(
  collection: (AgentAdapterOsIsolationProbeCollection & {
    provider_tool_execution_witness_expectation?: AgentAdapterOsIsolationProviderToolExecutionWitnessExpectation;
  }) | undefined,
  input?: AgentAdapterOsIsolationProviderHelperCollectionProbeInput
): boolean {
  const witness = collection?.provider_tool_execution_witness;
  if (!witness) {
    return false;
  }
  if (input && !providerToolExecutionWitnessAccepted(
    witness,
    input,
    collection.provider_tool_execution_witness_expectation ??
      input.provider_tool_execution_witness_expectation
  )) {
    return false;
  }
  return Boolean(providerToolExecutionWitnessSha256(witness));
}

function collectionProviderSpecificToolExecutionRequired(
  collection: (AgentAdapterOsIsolationProbeCollection & {
    provider_tool_execution_witness_expectation?: AgentAdapterOsIsolationProviderToolExecutionWitnessExpectation;
  }) | undefined,
  input?: AgentAdapterOsIsolationProviderHelperCollectionProbeInput
): boolean {
  const expectation =
    collection?.provider_tool_execution_witness_expectation ??
      input?.provider_tool_execution_witness_expectation;
  return providerSpecificToolExpectationRequired(expectation);
}

function collectionProviderSpecificToolExecutionBound(
  collection: (AgentAdapterOsIsolationProbeCollection & {
    provider_tool_execution_witness_expectation?: AgentAdapterOsIsolationProviderToolExecutionWitnessExpectation;
  }) | undefined,
  input?: AgentAdapterOsIsolationProviderHelperCollectionProbeInput
): boolean {
  const expectation =
    collection?.provider_tool_execution_witness_expectation ??
      input?.provider_tool_execution_witness_expectation;
  if (!providerSpecificToolExpectationRequired(expectation)) {
    if (collection?.provider_specific_tool_execution_required === true) {
      return Boolean(
        collection.provider_specific_tool_execution_bound === true &&
          isSha256(collection.provider_specific_tool_execution_sha256) &&
          isProviderToolName(collection.provider_specific_tool_name) &&
          isSha256(collection.provider_specific_tool_sha256)
      );
    }
    return true;
  }
  const topLevelBindingConsistent = collection?.provider_specific_tool_execution_required === true
    ? Boolean(
        collection.provider_specific_tool_execution_bound === true &&
          isSha256(collection.provider_specific_tool_execution_sha256) &&
          collection.provider_specific_tool_name === expectation?.host_capability_tool_name &&
          isSha256(collection.provider_specific_tool_sha256) &&
          collection.provider_specific_tool_sha256.toLowerCase() ===
            expectation?.host_capability_tool_sha256?.toLowerCase()
      )
    : true;
  const witness = collection?.provider_tool_execution_witness;
  return Boolean(
    witness &&
      collectionProviderToolWitnessBound(collection, input) &&
      topLevelBindingConsistent &&
      isProviderToolName(witness.host_capability_tool_name) &&
      witness.host_capability_tool_name === expectation?.host_capability_tool_name &&
      isSha256(witness.host_capability_tool_sha256) &&
      witness.host_capability_tool_sha256.toLowerCase() === expectation?.host_capability_tool_sha256?.toLowerCase()
  );
}

function providerSpecificToolExecutionSha256(
  collection: (AgentAdapterOsIsolationProbeCollection & {
    provider_tool_execution_witness_expectation?: AgentAdapterOsIsolationProviderToolExecutionWitnessExpectation;
  }) | undefined,
  input?: AgentAdapterOsIsolationProviderHelperCollectionProbeInput
): string | null {
  if (!collectionProviderSpecificToolExecutionBound(collection, input)) {
    return null;
  }
  const witnessSha256 = providerToolExecutionWitnessSha256(collection?.provider_tool_execution_witness);
  return witnessSha256;
}

function collectionProviderFamilyOsEnforcementWitnessBound(
  collection: (AgentAdapterOsIsolationProbeCollection & {
    provider_tool_execution_witness_expectation?: AgentAdapterOsIsolationProviderToolExecutionWitnessExpectation;
  }) | undefined,
  input?: AgentAdapterOsIsolationProviderHelperCollectionProbeInput
): boolean {
  const witness = collection?.provider_family_os_enforcement_witness;
  if (!witness) {
    return false;
  }
  if (input && !providerFamilyOsEnforcementWitnessAccepted(
    witness,
    input,
    collection.provider_tool_execution_witness_expectation ??
      input.provider_tool_execution_witness_expectation
  )) {
    return false;
  }
  return Boolean(providerFamilyOsEnforcementWitnessSha256(witness));
}

function collectionProviderFamilyExecutionProfileBound(
  collection: (AgentAdapterOsIsolationProbeCollection & {
    provider_tool_execution_witness_expectation?: AgentAdapterOsIsolationProviderToolExecutionWitnessExpectation;
  }) | undefined,
  input?: AgentAdapterOsIsolationProviderHelperCollectionProbeInput
): boolean {
  const expectation =
    collection?.provider_tool_execution_witness_expectation ??
      input?.provider_tool_execution_witness_expectation;
  const witness = collection?.provider_family_os_enforcement_witness;
  if (!providerFamilyExecutionProfileRequired(expectation)) {
    if (collection?.provider_family_execution_profile_required === true) {
      return Boolean(
        collection.provider_family_execution_profile_bound === true &&
          isProviderFamilyExecutionKind(collection.provider_family_execution_kind) &&
          isSha256(collection.provider_family_execution_profile_sha256) &&
          isSha256(collection.provider_family_execution_argv_sha256)
      );
    }
    return false;
  }
  if (!witness) {
    return false;
  }
  const boundExpectation = expectation;
  const topLevelBindingConsistent = collection?.provider_family_execution_profile_required === true
    ? Boolean(
        collection.provider_family_execution_profile_bound === true &&
          collection.provider_family_execution_kind === boundExpectation.provider_family_execution_kind &&
          isSha256(collection.provider_family_execution_profile_sha256) &&
          collection.provider_family_execution_profile_sha256.toLowerCase() ===
            boundExpectation.provider_family_execution_profile_sha256?.toLowerCase() &&
          isSha256(collection.provider_family_execution_argv_sha256) &&
          collection.provider_family_execution_argv_sha256.toLowerCase() ===
            boundExpectation.provider_family_execution_argv_sha256?.toLowerCase()
      )
    : true;
  return Boolean(
    collectionProviderFamilyOsEnforcementWitnessBound(collection, input) &&
      topLevelBindingConsistent &&
      witness.provider_family_execution_kind === boundExpectation.provider_family_execution_kind &&
      isSha256(witness.provider_family_execution_profile_sha256) &&
      witness.provider_family_execution_profile_sha256.toLowerCase() ===
        boundExpectation.provider_family_execution_profile_sha256?.toLowerCase() &&
      isSha256(witness.provider_family_execution_argv_sha256) &&
      witness.provider_family_execution_argv_sha256.toLowerCase() ===
        boundExpectation.provider_family_execution_argv_sha256?.toLowerCase()
  );
}

function providerFamilyExecutionProfileSha256ForCollection(
  collection: (AgentAdapterOsIsolationProbeCollection & {
    provider_tool_execution_witness_expectation?: AgentAdapterOsIsolationProviderToolExecutionWitnessExpectation;
  }) | undefined,
  input?: AgentAdapterOsIsolationProviderHelperCollectionProbeInput
): string | null {
  if (!collectionProviderFamilyExecutionProfileBound(collection, input)) {
    return null;
  }
  const witness = collection?.provider_family_os_enforcement_witness;
  return isSha256(witness?.provider_family_execution_profile_sha256)
    ? witness.provider_family_execution_profile_sha256.toLowerCase()
    : null;
}

function providerFamilyExecutionArgvSha256ForCollection(
  collection: (AgentAdapterOsIsolationProbeCollection & {
    provider_tool_execution_witness_expectation?: AgentAdapterOsIsolationProviderToolExecutionWitnessExpectation;
  }) | undefined,
  input?: AgentAdapterOsIsolationProviderHelperCollectionProbeInput
): string | null {
  if (!collectionProviderFamilyExecutionProfileBound(collection, input)) {
    return null;
  }
  const witness = collection?.provider_family_os_enforcement_witness;
  return isSha256(witness?.provider_family_execution_argv_sha256)
    ? witness.provider_family_execution_argv_sha256.toLowerCase()
    : null;
}

function providerFamilyExecutionKindForCollection(
  collection: (AgentAdapterOsIsolationProbeCollection & {
    provider_tool_execution_witness_expectation?: AgentAdapterOsIsolationProviderToolExecutionWitnessExpectation;
  }) | undefined,
  input?: AgentAdapterOsIsolationProviderHelperCollectionProbeInput
): AgentAdapterOsIsolationProviderFamilyExecutionKind | null {
  if (!collectionProviderFamilyExecutionProfileBound(collection, input)) {
    return null;
  }
  const witness = collection?.provider_family_os_enforcement_witness;
  return isProviderFamilyExecutionKind(witness?.provider_family_execution_kind)
    ? witness.provider_family_execution_kind
    : null;
}

function providerFamilyOsEnforcementWitnessSha256ForCollection(
  collection: (AgentAdapterOsIsolationProbeCollection & {
    provider_tool_execution_witness_expectation?: AgentAdapterOsIsolationProviderToolExecutionWitnessExpectation;
  }) | undefined,
  input?: AgentAdapterOsIsolationProviderHelperCollectionProbeInput
): string | null {
  if (!collectionProviderFamilyOsEnforcementWitnessBound(collection, input)) {
    return null;
  }
  return providerFamilyOsEnforcementWitnessSha256(collection?.provider_family_os_enforcement_witness);
}

function collectionProviderSpecificLiveProbeAttemptBound(
  collection: (AgentAdapterOsIsolationProbeCollection & {
    provider_tool_execution_witness_expectation?: AgentAdapterOsIsolationProviderToolExecutionWitnessExpectation;
  }) | undefined,
  input?: AgentAdapterOsIsolationProviderHelperCollectionProbeInput
): boolean {
  const expectation =
    collection?.provider_tool_execution_witness_expectation ??
      input?.provider_tool_execution_witness_expectation;
  if (!providerFamilyExecutionProfileRequired(expectation)) {
    if (collection?.provider_specific_live_probe_attempt_required === true) {
      return Boolean(
        collection.provider_specific_live_probe_attempt_bound === true &&
          isSha256(collection.provider_specific_live_probe_attempt_sha256)
      );
    }
    return false;
  }
  const attempt = collection?.provider_specific_live_probe_attempt;
  if (!attempt) {
    return false;
  }
  if (input && !providerSpecificLiveProbeAttemptAccepted(attempt, input, expectation)) {
    return false;
  }
  const attemptSha256 = providerSpecificLiveProbeAttemptSha256(attempt);
  const topLevelBindingConsistent = collection?.provider_specific_live_probe_attempt_required === true
    ? Boolean(
        collection.provider_specific_live_probe_attempt_bound === true &&
          isSha256(collection.provider_specific_live_probe_attempt_sha256) &&
          attemptSha256 === collection.provider_specific_live_probe_attempt_sha256
      )
    : true;
  return Boolean(
    attemptSha256 &&
      topLevelBindingConsistent &&
      collectionProviderFamilyExecutionProfileBound(collection, input)
  );
}

function providerSpecificLiveProbeAttemptSha256ForCollection(
  collection: (AgentAdapterOsIsolationProbeCollection & {
    provider_tool_execution_witness_expectation?: AgentAdapterOsIsolationProviderToolExecutionWitnessExpectation;
  }) | undefined,
  input?: AgentAdapterOsIsolationProviderHelperCollectionProbeInput
): string | null {
  if (!collectionProviderSpecificLiveProbeAttemptBound(collection, input)) {
    return null;
  }
  const attemptSha256 = providerSpecificLiveProbeAttemptSha256(collection?.provider_specific_live_probe_attempt);
  if (isSha256(attemptSha256)) {
    return attemptSha256;
  }
  return isSha256(collection?.provider_specific_live_probe_attempt_sha256)
    ? collection.provider_specific_live_probe_attempt_sha256.toLowerCase()
    : null;
}

function collectionProviderSpecificLiveProbeExecutionBound(
  collection: (AgentAdapterOsIsolationProbeCollection & {
    provider_tool_execution_witness_expectation?: AgentAdapterOsIsolationProviderToolExecutionWitnessExpectation;
  }) | undefined,
  input?: AgentAdapterOsIsolationProviderHelperCollectionProbeInput
): boolean {
  const expectation =
    collection?.provider_tool_execution_witness_expectation ??
      input?.provider_tool_execution_witness_expectation;
  if (!providerFamilyExecutionProfileRequired(expectation)) {
    if (collection?.provider_specific_live_probe_execution_required === true) {
      return Boolean(
        collection.provider_specific_live_probe_execution_bound === true &&
          isSha256(collection.provider_specific_live_probe_execution_sha256)
      );
    }
    return false;
  }
  const execution = collection?.provider_specific_live_probe_execution;
  if (!execution) {
    return false;
  }
  if (
    input &&
    !providerSpecificLiveProbeExecutionAccepted(execution, input, expectation)
  ) {
    return false;
  }
  const executionSha256 = providerSpecificLiveProbeExecutionSha256(execution);
  const topLevelBindingConsistent = collection?.provider_specific_live_probe_execution_required === true
    ? Boolean(
        collection.provider_specific_live_probe_execution_bound === true &&
          isSha256(collection.provider_specific_live_probe_execution_sha256) &&
          executionSha256 === collection.provider_specific_live_probe_execution_sha256
      )
    : true;
  return Boolean(
    executionSha256 &&
      topLevelBindingConsistent &&
      collectionProviderSpecificLiveProbeAttemptBound(collection, input)
  );
}

function providerSpecificLiveProbeExecutionSha256ForCollection(
  collection: (AgentAdapterOsIsolationProbeCollection & {
    provider_tool_execution_witness_expectation?: AgentAdapterOsIsolationProviderToolExecutionWitnessExpectation;
  }) | undefined,
  input?: AgentAdapterOsIsolationProviderHelperCollectionProbeInput
): string | null {
  if (!collectionProviderSpecificLiveProbeExecutionBound(collection, input)) {
    return null;
  }
  const executionSha256 = providerSpecificLiveProbeExecutionSha256(collection?.provider_specific_live_probe_execution);
  if (isSha256(executionSha256)) {
    return executionSha256;
  }
  return isSha256(collection?.provider_specific_live_probe_execution_sha256)
    ? collection.provider_specific_live_probe_execution_sha256.toLowerCase()
    : null;
}

function collectionProviderControlPlaneExecutionWitnessBound(
  collection: (AgentAdapterOsIsolationProbeCollection & {
    provider_tool_execution_witness_expectation?: AgentAdapterOsIsolationProviderToolExecutionWitnessExpectation;
  }) | undefined,
  input?: AgentAdapterOsIsolationProviderHelperCollectionProbeInput
): boolean {
  const witness = providerControlPlaneExecutionWitnessForCollection(collection, input);
  const witnessSha256 = providerControlPlaneExecutionWitnessSha256(witness);
  const topLevelBindingConsistent = collection?.provider_control_plane_execution_witness_required === true
    ? Boolean(
        collection.provider_control_plane_execution_witness_bound === true &&
          isSha256(collection.provider_control_plane_execution_witness_sha256) &&
          witnessSha256 === collection.provider_control_plane_execution_witness_sha256
      )
    : true;
  return Boolean(
    witnessSha256 &&
      topLevelBindingConsistent &&
      collectionProviderSpecificLiveProbeExecutionBound(collection, input)
  );
}

function providerControlPlaneExecutionWitnessForCollection(
  collection: (AgentAdapterOsIsolationProbeCollection & {
    provider_tool_execution_witness_expectation?: AgentAdapterOsIsolationProviderToolExecutionWitnessExpectation;
  }) | undefined,
  input?: AgentAdapterOsIsolationProviderHelperCollectionProbeInput
): AgentAdapterOsIsolationProviderControlPlaneExecutionWitness | undefined {
  const expectation =
    collection?.provider_tool_execution_witness_expectation ??
      input?.provider_tool_execution_witness_expectation;
  const witness = collection?.provider_control_plane_execution_witness;
  if (witness && !input) {
    return witness;
  }
  if (!providerFamilyExecutionProfileRequired(expectation)) {
    return undefined;
  }
  if (witness &&
    input &&
    providerControlPlaneExecutionWitnessAccepted(witness, input, expectation, collection?.provider_specific_live_probe_execution)
  ) {
    return witness;
  }
  if (collection?.provider_control_plane_execution_witness_required === true || !input) {
    return undefined;
  }
  const liveProbeExecutionSha256 = providerSpecificLiveProbeExecutionSha256ForCollection(collection, input);
  return serviceDerivedProviderControlPlaneExecutionWitness({
    collectionProbeInput: input,
    expectation,
    liveProbeExecution: collection?.provider_specific_live_probe_execution,
    liveProbeExecutionSha256
  });
}

function providerControlPlaneExecutionWitnessSha256ForCollection(
  collection: (AgentAdapterOsIsolationProbeCollection & {
    provider_tool_execution_witness_expectation?: AgentAdapterOsIsolationProviderToolExecutionWitnessExpectation;
  }) | undefined,
  input?: AgentAdapterOsIsolationProviderHelperCollectionProbeInput
): string | null {
  if (!collectionProviderControlPlaneExecutionWitnessBound(collection, input)) {
    return null;
  }
  const witnessSha256 = providerControlPlaneExecutionWitnessSha256(
    providerControlPlaneExecutionWitnessForCollection(collection, input)
  );
  if (isSha256(witnessSha256)) {
    return witnessSha256;
  }
  return isSha256(collection?.provider_control_plane_execution_witness_sha256)
    ? collection.provider_control_plane_execution_witness_sha256.toLowerCase()
    : null;
}

function collectionProviderToolWitnessSatisfied(
  collection: AgentAdapterOsIsolationProbeCollection | undefined,
  input?: AgentAdapterOsIsolationProviderHelperCollectionProbeInput
): boolean {
  return collection?.provider_tool_execution_witness_required === true
    ? collectionProviderToolWitnessBound(collection, input)
    : true;
}

function collectionProviderFamilyOsEnforcementWitnessSatisfied(
  collection: AgentAdapterOsIsolationProbeCollection | undefined,
  input?: AgentAdapterOsIsolationProviderHelperCollectionProbeInput
): boolean {
  return collection?.provider_family_os_enforcement_witness_required === true
    ? collectionProviderFamilyOsEnforcementWitnessBound(collection, input)
    : true;
}

function collectionProviderFamilyExecutionProfileSatisfied(
  collection: AgentAdapterOsIsolationProbeCollection | undefined,
  input?: AgentAdapterOsIsolationProviderHelperCollectionProbeInput
): boolean {
  return collection?.provider_family_execution_profile_required === true
    ? collectionProviderFamilyExecutionProfileBound(collection, input)
    : true;
}

function collectionProviderSpecificLiveProbeAttemptSatisfied(
  collection: AgentAdapterOsIsolationProbeCollection | undefined,
  input?: AgentAdapterOsIsolationProviderHelperCollectionProbeInput
): boolean {
  return collection?.provider_specific_live_probe_attempt_required === true
    ? collectionProviderSpecificLiveProbeAttemptBound(collection, input)
    : true;
}

function collectionProviderSpecificLiveProbeExecutionSatisfied(
  collection: AgentAdapterOsIsolationProbeCollection | undefined,
  input?: AgentAdapterOsIsolationProviderHelperCollectionProbeInput
): boolean {
  return collection?.provider_specific_live_probe_execution_required === true
    ? collectionProviderSpecificLiveProbeExecutionBound(collection, input)
    : true;
}

function collectionProviderControlPlaneExecutionWitnessSatisfied(
  collection: AgentAdapterOsIsolationProbeCollection | undefined,
  input?: AgentAdapterOsIsolationProviderHelperCollectionProbeInput
): boolean {
  return collection?.provider_control_plane_execution_witness_required === true
    ? collectionProviderControlPlaneExecutionWitnessBound(collection, input)
    : true;
}

function isCollectedOsIsolationProbe(input: {
  knownProvider: AgentAdapterOsIsolationProvider | null;
  providerAvailable: boolean;
  collection: AgentAdapterOsIsolationProbeCollection | undefined;
}): boolean {
  const collection = input.collection;
  return Boolean(
    input.knownProvider &&
      osEnforcedProviders.has(input.knownProvider) &&
      input.providerAvailable &&
      collection?.collection_source === "service_owned_os_probe" &&
      collection.process_isolation_enforced === true &&
      collection.filesystem_scope_enforced === true &&
      collection.network_isolation_enforced === true &&
      collection.no_new_privileges === true &&
      collection.escape_prevention === true &&
      collection.adapter_process_exit_code === 0 &&
      isSha256(collection.stdout_sha256) &&
      isSha256(collection.stderr_sha256) &&
      isSha256(collection.transcript_sha256) &&
      collectionProviderToolWitnessSatisfied(collection) &&
      collectionProviderSpecificToolExecutionBound(collection) &&
      collectionProviderFamilyOsEnforcementWitnessSatisfied(collection) &&
      collectionProviderFamilyExecutionProfileSatisfied(collection) &&
      collectionProviderSpecificLiveProbeAttemptSatisfied(collection) &&
      collectionProviderSpecificLiveProbeExecutionSatisfied(collection)
  );
}

function isServiceOwnedLauncherPreflight(input: {
  knownProvider: AgentAdapterOsIsolationProvider | null;
  preflight: AgentAdapterOsIsolationSandboxLaunchPreflight | undefined;
}): boolean {
  return Boolean(
    input.knownProvider &&
      osEnforcedProviders.has(input.knownProvider) &&
      input.preflight?.probe_source === "service_owned_launcher_preflight" &&
      input.preflight.provider_available === true &&
      isSha256(input.preflight.launcher_binary_sha256)
  );
}

function sanitizeDiagnostics(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => sanitizeProbeText(entry))
    .filter((entry) => entry.length > 0)
    .slice(0, 8);
}

function sanitizeCapabilityFacts(values: unknown): AgentAdapterOsIsolationProviderHostCapabilityFact[] {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object" && !Array.isArray(entry))
    .map((entry) => ({
      capability: sanitizeProbeText(entry.capability) || "unknown_capability",
      observed: entry.observed === true,
      evidence_sha256: isSha256(entry.evidence_sha256) ? entry.evidence_sha256.toLowerCase() : null,
      notes: typeof entry.notes === "string" ? sanitizeProbeText(entry.notes) : null
    }))
    .slice(0, 16);
}

function sanitizeCapabilityTools(values: unknown): AgentAdapterOsIsolationProviderHostCapabilityTool[] {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object" && !Array.isArray(entry))
    .map((entry) => ({
      name: sanitizeProbeText(entry.name) || "unknown_tool",
      present: entry.present === true,
      version: typeof entry.version === "string" ? sanitizeProbeText(entry.version) : null,
      binary_sha256: isSha256(entry.binary_sha256) ? entry.binary_sha256.toLowerCase() : null
    }))
    .slice(0, 16);
}

function sanitizeKernelFeatures(values: unknown): AgentAdapterOsIsolationProviderHostCapabilityKernelFeature[] {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object" && !Array.isArray(entry))
    .map((entry) => ({
      name: sanitizeProbeText(entry.name) || "unknown_kernel_feature",
      observed: entry.observed === true,
      evidence_sha256: isSha256(entry.evidence_sha256) ? entry.evidence_sha256.toLowerCase() : null,
      notes: typeof entry.notes === "string" ? sanitizeProbeText(entry.notes) : null
    }))
    .slice(0, 16);
}

function providerCapabilityEvidenceHash(material: Record<string, unknown>): string {
  return sha256Text(canonicalJson({
    ...material,
    proof_authority: "none",
    adapter_execution_isolation: "process_boundary_only"
  }));
}

function sha256ExistingFileOrNull(path: string): string | null {
  try {
    return existsSync(path) && statSync(path).isFile() ? sha256FileSync(path).sha256 : null;
  } catch {
    return null;
  }
}

function windowsExecutableExtensions(): Set<string> {
  return new Set(
    (process.env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM")
      .split(";")
      .map((entry) => entry.trim().toUpperCase())
      .filter((entry) => /^\.[A-Z0-9]+$/.test(entry))
  );
}

function servicePathExecutableNames(command: string): string[] {
  if (process.platform !== "win32") {
    return [command];
  }
  const extensions = Array.from(windowsExecutableExtensions());
  return Array.from(new Set([
    ...extensions.flatMap((extension) => [
      `${command}${extension.toLowerCase()}`,
      `${command}${extension.toUpperCase()}`
    ])
  ]));
}

function sha256ExecutableFileOrNull(path: string): string | null {
  try {
    const stats = statSync(path);
    if (!stats.isFile()) {
      return null;
    }
    if (process.platform === "win32") {
      const extension = extname(path).toUpperCase();
      if (!windowsExecutableExtensions().has(extension)) {
        return null;
      }
    } else if ((stats.mode & 0o111) === 0) {
      return null;
    }
    return sha256FileSync(path).sha256;
  } catch {
    return null;
  }
}

function servicePathExecutableHashOrNull(command: string): string | null {
  const pathEntries = (process.env.PATH ?? "")
    .split(delimiter)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0 && entry.length <= 4096 && isAbsolute(entry));
  const names = servicePathExecutableNames(command);
  for (const entry of pathEntries) {
    for (const name of names) {
      const sha256 = sha256ExecutableFileOrNull(join(entry, name));
      if (sha256) {
        return sha256;
      }
    }
  }
  return null;
}

function windowsSystemRootCandidate(): string {
  const configuredRoot = process.env.SystemRoot;
  if (typeof configuredRoot === "string" && /^[A-Za-z]:\\[^<>:"|?*]+(?:\\[^<>:"|?*]+)*$/.test(configuredRoot)) {
    return configuredRoot;
  }
  return "C:\\Windows";
}

function windowsAppContainerHostFacilityDiagnostics(
  input: AgentAdapterOsIsolationProviderHostCapabilityProbeInput
): Pick<
  AgentAdapterOsIsolationProviderHostCapabilityProbeResult,
  "capability_facts" | "required_tools" | "kernel_features" | "diagnostics"
> | null {
  if (input.provider !== "windows_appcontainer") {
    return null;
  }

  const serviceObservedWindows = input.platform === "win32";
  const checkNetIsolationSha256 = serviceObservedWindows
    ? sha256ExistingFileOrNull(pathWin32.join(windowsSystemRootCandidate(), "System32", "CheckNetIsolation.exe"))
    : null;

  return {
    capability_facts: [
      {
        capability: "windows_appcontainer_host_facility_probe",
        observed: serviceObservedWindows,
        evidence_sha256: providerCapabilityEvidenceHash({
          capability: "windows_appcontainer_host_facility_probe",
          provider: input.provider,
          platform: input.platform,
          check_net_isolation_present: Boolean(checkNetIsolationSha256)
        }),
        notes:
          "Windows AppContainer host facility diagnostics only; this is not provider-helper readiness, executed OS isolation, proof authority, real-Pi evidence, or GA certification."
      }
    ],
    required_tools: [
      {
        name: "windows_checknetisolation",
        present: Boolean(checkNetIsolationSha256),
        version: null,
        binary_sha256: checkNetIsolationSha256
      }
    ],
    kernel_features: [
      {
        name: "windows_appcontainer_service_observed_host_facility_family",
        observed: serviceObservedWindows,
        evidence_sha256: providerCapabilityEvidenceHash({
          capability: "windows_appcontainer_service_observed_host_facility_family",
          provider: input.provider,
          platform: input.platform
        }),
        notes: "Service-observed Windows host facility family only; no AppContainer launch or runtime isolation enforcement has run."
      }
    ],
    diagnostics: [
      serviceObservedWindows
        ? "Windows AppContainer host facility diagnostics were evaluated on the service-observed Win32 platform."
        : "Windows AppContainer host facility diagnostics require the service-observed Win32 platform.",
      checkNetIsolationSha256
        ? "CheckNetIsolation host tool was detected and hashed without exposing its executable path."
        : "CheckNetIsolation host tool was not detected or could not be hashed.",
      "Windows AppContainer host facility diagnostics are not provider-helper readiness, executed OS isolation, proof authority, real-Pi evidence, or GA certification."
    ]
  };
}

function ociContainerHostFacilityDiagnostics(
  input: AgentAdapterOsIsolationProviderHostCapabilityProbeInput
): Pick<
  AgentAdapterOsIsolationProviderHostCapabilityProbeResult,
  "capability_facts" | "required_tools" | "kernel_features" | "diagnostics"
> | null {
  if (input.provider !== "oci_container") {
    return null;
  }

  const serviceSupportedHost = ["linux", "darwin", "win32"].includes(input.platform);
  const dockerSha256 = serviceSupportedHost ? servicePathExecutableHashOrNull("docker") : null;
  const podmanSha256 = serviceSupportedHost ? servicePathExecutableHashOrNull("podman") : null;

  return {
    capability_facts: [
      {
        capability: "oci_container_host_facility_probe",
        observed: serviceSupportedHost,
        evidence_sha256: providerCapabilityEvidenceHash({
          capability: "oci_container_host_facility_probe",
          provider: input.provider,
          platform: input.platform,
          docker_cli_present: Boolean(dockerSha256),
          podman_cli_present: Boolean(podmanSha256)
        }),
        notes:
          "OCI container host facility diagnostics only; this is not provider-helper readiness, executed OS isolation, proof authority, real-Pi evidence, or GA certification."
      }
    ],
    required_tools: [
      {
        name: "oci_docker_cli",
        present: Boolean(dockerSha256),
        version: null,
        binary_sha256: dockerSha256
      },
      {
        name: "oci_podman_cli",
        present: Boolean(podmanSha256),
        version: null,
        binary_sha256: podmanSha256
      }
    ],
    kernel_features: [
      {
        name: "oci_container_service_observed_host_facility_family",
        observed: serviceSupportedHost,
        evidence_sha256: providerCapabilityEvidenceHash({
          capability: "oci_container_service_observed_host_facility_family",
          provider: input.provider,
          platform: input.platform
        }),
        notes: "Service-observed OCI container host facility family only; no container launch or runtime isolation enforcement has run."
      }
    ],
    diagnostics: [
      serviceSupportedHost
        ? "OCI container host facility diagnostics were evaluated on a service-supported host platform."
        : "OCI container host facility diagnostics require linux, darwin, or win32 service-observed platforms.",
      dockerSha256
        ? "Docker CLI host tool was detected and hashed without exposing its executable path."
        : "Docker CLI host tool was not detected or could not be hashed.",
      podmanSha256
        ? "Podman CLI host tool was detected and hashed without exposing its executable path."
        : "Podman CLI host tool was not detected or could not be hashed.",
      "OCI container host facility diagnostics are not provider-helper readiness, executed OS isolation, proof authority, real-Pi evidence, or GA certification."
    ]
  };
}

type RemainingProviderHostFacilitySpec = {
  provider: AgentAdapterOsIsolationProvider;
  label: string;
  capability: string;
  feature: string;
  supported_platforms: NodeJS.Platform[];
  unsupported_platform_diagnostics: string;
  tools: Array<{
    name: string;
    command: string;
    label: string;
  }>;
};

const remainingProviderHostFacilitySpecs: Partial<Record<AgentAdapterOsIsolationProvider, RemainingProviderHostFacilitySpec>> = {
  nix_sandbox: {
    provider: "nix_sandbox",
    label: "Nix sandbox",
    capability: "nix_sandbox_host_facility_probe",
    feature: "nix_sandbox_service_observed_host_facility_family",
    supported_platforms: ["linux", "darwin"],
    unsupported_platform_diagnostics:
      "Nix sandbox host facility diagnostics require linux or darwin service-observed platforms.",
    tools: [
      { name: "nix_cli", command: "nix", label: "nix CLI" },
      { name: "nix_store_cli", command: "nix-store", label: "nix-store CLI" }
    ]
  },
  firejail: {
    provider: "firejail",
    label: "Firejail",
    capability: "firejail_host_facility_probe",
    feature: "firejail_service_observed_host_facility_family",
    supported_platforms: ["linux"],
    unsupported_platform_diagnostics:
      "Firejail host facility diagnostics require the linux service-observed platform.",
    tools: [{ name: "firejail_cli", command: "firejail", label: "Firejail CLI" }]
  },
  macos_sandbox_exec: {
    provider: "macos_sandbox_exec",
    label: "macOS sandbox-exec",
    capability: "macos_sandbox_exec_host_facility_probe",
    feature: "macos_sandbox_exec_service_observed_host_facility_family",
    supported_platforms: ["darwin"],
    unsupported_platform_diagnostics:
      "macOS sandbox-exec host facility diagnostics require the darwin service-observed platform.",
    tools: [{ name: "macos_sandbox_exec_cli", command: "sandbox-exec", label: "sandbox-exec CLI" }]
  }
};

function remainingProviderHostFacilityDiagnostics(
  input: AgentAdapterOsIsolationProviderHostCapabilityProbeInput
): Pick<
  AgentAdapterOsIsolationProviderHostCapabilityProbeResult,
  "capability_facts" | "required_tools" | "kernel_features" | "diagnostics"
> | null {
  const spec = input.provider ? remainingProviderHostFacilitySpecs[input.provider] : null;
  if (!spec) {
    return null;
  }

  const serviceSupportedHost = spec.supported_platforms.includes(input.platform);
  const toolHashes = spec.tools.map((tool) => ({
    ...tool,
    sha256: serviceSupportedHost ? servicePathExecutableHashOrNull(tool.command) : null
  }));
  const toolPresence = Object.fromEntries(
    toolHashes.map((tool) => [`${tool.name}_present`, Boolean(tool.sha256)])
  );

  return {
    capability_facts: [
      {
        capability: spec.capability,
        observed: serviceSupportedHost,
        evidence_sha256: providerCapabilityEvidenceHash({
          capability: spec.capability,
          provider: spec.provider,
          platform: input.platform,
          ...toolPresence
        }),
        notes:
          `${spec.label} host facility diagnostics only; this is not provider-helper readiness, executed OS isolation, proof authority, real-Pi evidence, or GA certification.`
      }
    ],
    required_tools: toolHashes.map((tool) => ({
      name: tool.name,
      present: Boolean(tool.sha256),
      version: null,
      binary_sha256: tool.sha256
    })),
    kernel_features: [
      {
        name: spec.feature,
        observed: serviceSupportedHost,
        evidence_sha256: providerCapabilityEvidenceHash({
          capability: spec.feature,
          provider: spec.provider,
          platform: input.platform
        }),
        notes: `Service-observed ${spec.label} host facility family only; no provider-helper launch or runtime isolation enforcement has run.`
      }
    ],
    diagnostics: [
      serviceSupportedHost
        ? `${spec.label} host facility diagnostics were evaluated on a service-supported host platform.`
        : spec.unsupported_platform_diagnostics,
      ...toolHashes.map((tool) =>
        tool.sha256
          ? `${tool.label} host tool was detected and hashed without exposing its executable path.`
          : `${tool.label} host tool was not detected as an executable candidate or could not be hashed.`
      ),
      `${spec.label} host facility diagnostics are not provider-helper readiness, executed OS isolation, proof authority, real-Pi evidence, or GA certification.`
    ]
  };
}

function defaultProviderHostCapabilityProbe(
  input: AgentAdapterOsIsolationProviderHostCapabilityProbeInput
): AgentAdapterOsIsolationProviderHostCapabilityProbeResult {
  const provider = input.provider;
  const providerLabel = provider ?? "unknown";
  const providerOsEnforced = Boolean(provider && osEnforcedProviders.has(provider));
  const supportedPlatforms = provider ? providerHelperSupportedPlatforms(provider) : [];
  const platformSupported = Boolean(provider && supportedPlatforms.includes(input.platform));
  const bundledHelper = provider && providerOsEnforced ? bundledProviderHelperConfig(provider) : null;
  const helperAssetPath = bundledProviderHelperAssetPath();
  const helperAssetHash = helperAssetPath ? sha256FileSync(helperAssetPath).sha256 : null;
  const runtimeHash = bundledHelper ? sha256FileSync(bundledHelper.program).sha256 : null;
  const providerHostCapabilityAvailable = Boolean(providerOsEnforced && platformSupported && bundledHelper);
  const windowsAppContainerFacility = windowsAppContainerHostFacilityDiagnostics(input);
  const ociContainerFacility = ociContainerHostFacilityDiagnostics(input);
  const remainingProviderFacility = remainingProviderHostFacilityDiagnostics(input);

  return {
    probe_source: "service_owned_provider_host_capability_probe",
    provider_host_capability_available: providerHostCapabilityAvailable,
    platform: input.platform,
    capability_facts: [
      {
        capability: "provider_family_os_enforced_contract",
        observed: providerOsEnforced,
        evidence_sha256: providerCapabilityEvidenceHash({
          capability: "provider_family_os_enforced_contract",
          provider: providerLabel,
          os_enforced_provider_family: providerOsEnforced
        }),
        notes: "Provider family is service-known as OS-enforced in contract metadata only; this is not executed OS-isolation evidence."
      },
      {
        capability: "provider_family_platform_contract",
        observed: platformSupported,
        evidence_sha256: providerCapabilityEvidenceHash({
          capability: "provider_family_platform_contract",
          provider: providerLabel,
          platform: input.platform,
          supported_platforms: supportedPlatforms
        }),
        notes: "Platform compatibility is service-observed from process.platform and the provider support table only."
      },
      {
        capability: "bundled_provider_helper_protocol_asset",
        observed: Boolean(bundledHelper && helperAssetHash),
        evidence_sha256: helperAssetHash,
        notes: "Bundled provider-helper protocol asset is service-owned diagnostics only, not OS-enforcement evidence or GA certification."
      },
      ...(windowsAppContainerFacility?.capability_facts ?? []),
      ...(ociContainerFacility?.capability_facts ?? []),
      ...(remainingProviderFacility?.capability_facts ?? [])
    ],
    required_tools: [
      {
        name: "comath_bundled_provider_helper_protocol",
        present: Boolean(bundledHelper),
        version: bundledHelper?.version ?? null,
        binary_sha256: runtimeHash
      },
      ...(windowsAppContainerFacility?.required_tools ?? []),
      ...(ociContainerFacility?.required_tools ?? []),
      ...(remainingProviderFacility?.required_tools ?? [])
    ],
    kernel_features: [
      {
        name: `${providerLabel}_service_observed_platform_family`,
        observed: platformSupported,
        evidence_sha256: providerCapabilityEvidenceHash({
          capability: "service_observed_platform_family",
          provider: providerLabel,
          platform: input.platform
        }),
        notes: "Service-observed platform family only; no kernel enforcement probe has run."
      },
      {
        name: `${providerLabel}_os_enforcement_not_collected`,
        observed: false,
        evidence_sha256: providerCapabilityEvidenceHash({
          capability: "os_enforcement_not_collected",
          provider: providerLabel,
          platform: input.platform
        }),
        notes: "Host capability probing does not collect executed OS-isolation or adapter runtime evidence."
      },
      ...(windowsAppContainerFacility?.kernel_features ?? []),
      ...(ociContainerFacility?.kernel_features ?? []),
      ...(remainingProviderFacility?.kernel_features ?? [])
    ],
    diagnostics: [
      `Default service-owned provider host capability probe evaluated provider=${sanitizeProbeText(providerLabel)} on platform=${sanitizeProbeText(input.platform)}.`,
      platformSupported
        ? "Service-observed platform is compatible with the requested provider family."
        : "Requested provider family is not supported on the service-observed platform.",
      bundledHelper
        ? "Bundled CoMath provider-helper protocol asset is available for default host capability diagnostics."
        : "No bundled provider-helper protocol asset is available for this provider/platform family.",
      ...(windowsAppContainerFacility?.diagnostics ?? []),
      ...(ociContainerFacility?.diagnostics ?? []),
      ...(remainingProviderFacility?.diagnostics ?? []),
      "Default host capability diagnostics are not provider-helper readiness, executed OS isolation, proof authority, real-Pi evidence, or GA certification."
    ]
  };
}

function providerHostCapabilityStatus(input: {
  knownProvider: AgentAdapterOsIsolationProvider | null;
  sourceAccepted: boolean;
  providerAvailable: boolean;
  platformSupported: boolean;
}): AgentAdapterOsIsolationProviderHostCapabilityStatus {
  if (!input.knownProvider || input.knownProvider === "unknown") {
    return "blocked_provider_host_capability_provider_unsupported";
  }
  if (!osEnforcedProviders.has(input.knownProvider)) {
    return "blocked_provider_host_capability_provider_not_os_enforced";
  }
  if (!input.sourceAccepted) {
    return "blocked_provider_host_capability_probe_not_collected";
  }
  if (!input.providerAvailable || !input.platformSupported) {
    return "blocked_provider_host_capability_provider_unavailable";
  }
  return "provider_host_capability_observed";
}

function providerHostCapabilityReplayableNextAction(
  status: AgentAdapterOsIsolationProviderHostCapabilityStatus
): string {
  if (status === "blocked_provider_host_capability_provider_unsupported") {
    return "Select a supported OS-enforced adapter isolation provider before probing host capability.";
  }
  if (status === "blocked_provider_host_capability_provider_not_os_enforced") {
    return "Select an OS-enforced provider family such as OCI, Nix, Firejail, Windows AppContainer, or macOS sandbox-exec before collecting host capability evidence.";
  }
  if (status === "blocked_provider_host_capability_provider_unavailable") {
    return "Run the service-owned provider host capability probe on a compatible host with the required provider family facilities installed.";
  }
  return "Run a service-owned provider host capability probe; caller-supplied platform, tool, kernel, or success metadata cannot validate host capability.";
}

function providerHostCapabilityIsObserved(
  bundle: { hostCapability: AgentAdapterOsIsolationProviderHostCapabilityManifest } | null
): boolean {
  const hostCapability = bundle?.hostCapability;
  return Boolean(
    hostCapability &&
      hostCapability.schema_version === "comath.agent_adapter_os_isolation_provider_host_capability_probe.v1" &&
      hostCapability.ok === true &&
      hostCapability.host_capability_status === "provider_host_capability_observed" &&
      hostCapability.provider_host_capability_available === true &&
      hostCapability.provider_host_capability.probe_source === "service_owned_provider_host_capability_probe" &&
      hostCapability.provider_host_capability.provider_host_capability_available === true &&
      hostCapability.provider_host_capability.platform_supported === true &&
      hostCapability.adapter_execution_isolation.os_enforced === false &&
      hostCapability.proof_authority === "none" &&
      hostCapability.can_promote_claim === false &&
      hostCapability.can_certify_ga === false
  );
}

function providerHostCapabilityMatchesHelperHostInput(input: {
  bundle: {
    artifact: AgentAdapterOsIsolationProviderHostCapabilityArtifact;
    hostCapability: AgentAdapterOsIsolationProviderHostCapabilityManifest;
  } | null;
  projectId: string;
  hostCapabilityProbeId: string | null;
  adapterId: AgentAdapterPackageId;
  backend: AgentAdapterBackend;
  provider: AgentAdapterOsIsolationProvider;
  serviceObservedPlatform: NodeJS.Platform;
}): boolean {
  const hostCapability = input.bundle?.hostCapability;
  if (!hostCapability || !input.hostCapabilityProbeId || !input.bundle?.artifact) {
    return false;
  }
  return Boolean(
    hostCapability.project_id === input.projectId &&
      hostCapability.host_capability_probe_id === input.hostCapabilityProbeId &&
      hostCapability.adapter_id === input.adapterId &&
      hostCapability.backend === input.backend &&
      hostCapability.provider === input.provider &&
      hostCapability.provider_host_capability.platform === input.serviceObservedPlatform &&
      hostCapability.provider_host_capability.platform_supported === true &&
      hostCapability.provider_host_capability.proof_authority === "none" &&
      input.bundle.artifact.path === hostCapability.host_capability_probe_path &&
      isSha256(input.bundle.artifact.sha256)
  );
}

const providerSpecificHostCapabilityToolNames: Partial<Record<AgentAdapterOsIsolationProvider, string[]>> = {
  windows_appcontainer: ["windows_checknetisolation"],
  oci_container: ["oci_docker_cli", "oci_podman_cli"],
  nix_sandbox: ["nix_cli", "nix_store_cli"],
  firejail: ["firejail_cli"],
  macos_sandbox_exec: ["macos_sandbox_exec_cli"]
};

function providerSpecificHostCapabilityTool(input: {
  hostCapability: AgentAdapterOsIsolationProviderHostCapabilityManifest | null | undefined;
  provider: AgentAdapterOsIsolationProvider;
}): { name: string; sha256: string } | null {
  const allowedNames = providerSpecificHostCapabilityToolNames[input.provider] ?? [];
  if (allowedNames.length === 0) {
    return null;
  }
  const requiredTools = input.hostCapability?.provider_host_capability.required_tools ?? [];
  const tool = requiredTools.find((entry) =>
    allowedNames.includes(entry.name) &&
      entry.present === true &&
      isSha256(entry.binary_sha256)
  );
  return tool && isSha256(tool.binary_sha256)
    ? { name: tool.name, sha256: tool.binary_sha256.toLowerCase() }
    : null;
}

function classifySandboxLaunch(input: {
  knownProvider: AgentAdapterOsIsolationProvider | null;
  ready: boolean;
}): { status: AgentAdapterOsIsolationSandboxLaunchStatus; provider: AgentAdapterOsIsolationProvider } {
  if (!input.knownProvider || input.knownProvider === "unknown") {
    return { status: "blocked_sandbox_provider_unsupported", provider: "unknown" };
  }
  if (!osEnforcedProviders.has(input.knownProvider)) {
    return { status: "blocked_sandbox_provider_not_os_enforced", provider: input.knownProvider };
  }
  if (!input.ready) {
    return { status: "blocked_sandbox_launcher_preflight_missing", provider: input.knownProvider };
  }
  return { status: "ready_for_service_owned_os_sandbox_execution", provider: input.knownProvider };
}

function sandboxLaunchIsReadyForExecution(
  launchBundle: { launch: AgentAdapterOsIsolationSandboxLaunch } | null
): boolean {
  const launch = launchBundle?.launch;
  return Boolean(
    launch &&
      launch.schema_version === "comath.agent_adapter_os_isolation_sandbox_launch.v1" &&
      launch.ok === true &&
      launch.launch_status === "ready_for_service_owned_os_sandbox_execution" &&
      launch.sandbox_launch_ready === true &&
      launch.launcher_preflight.probe_source === "service_owned_launcher_preflight" &&
      isSha256(launch.launcher_preflight.launcher_binary_sha256) &&
      osEnforcedProviders.has(launch.provider)
  );
}

function sandboxLaunchMatchesExecutionInput(input: {
  launchBundle: { launch: AgentAdapterOsIsolationSandboxLaunch } | null;
  projectId: string;
  launchId: string;
  adapterId: AgentAdapterPackageId;
  backend: AgentAdapterBackend;
  provider: AgentAdapterOsIsolationProvider;
}): boolean {
  const launch = input.launchBundle?.launch;
  return Boolean(
    launch &&
      launch.project_id === input.projectId &&
      launch.launch_id === input.launchId &&
      launch.adapter_id === input.adapterId &&
      launch.backend === input.backend &&
      launch.provider === input.provider
  );
}

function executionCollectionForProbe(
  collection: AgentAdapterOsIsolationSandboxExecutionCollection | undefined
): AgentAdapterOsIsolationProbeCollection | undefined {
  if (collection?.probe_source !== "service_owned_sandbox_execution_probe") {
    return undefined;
  }
  return {
    collection_source: collection.collection_source,
    process_isolation_enforced: collection.process_isolation_enforced,
    filesystem_scope_enforced: collection.filesystem_scope_enforced,
    network_isolation_enforced: collection.network_isolation_enforced,
    no_new_privileges: collection.no_new_privileges,
    escape_prevention: collection.escape_prevention,
    adapter_process_exit_code: collection.adapter_process_exit_code,
    stdout_sha256: collection.stdout_sha256,
    stderr_sha256: collection.stderr_sha256,
    transcript_sha256: collection.transcript_sha256,
    notes: sanitizeDiagnostics(collection.diagnostics).join(" ")
  };
}

function executionStatusFromProbe(
  probe: AgentAdapterOsIsolationProbe | null,
  fallbackStatus: AgentAdapterOsIsolationSandboxExecutionStatus
): AgentAdapterOsIsolationSandboxExecutionStatus {
  if (!probe) {
    return fallbackStatus;
  }
  return probe.ok ? "sandbox_execution_probe_collected" : "blocked_sandbox_execution_probe_not_collected";
}

function executionReplayableNextAction(status: AgentAdapterOsIsolationSandboxExecutionStatus): string {
  if (status === "blocked_sandbox_launch_preflight_missing") {
    return "Run a service-owned provider sandbox-launch preflight before attempting sandbox execution evidence collection.";
  }
  if (status === "blocked_sandbox_launch_binding_mismatch") {
    return "Re-run sandbox execution with the exact adapter, backend, project, and provider bound by the ready sandbox-launch preflight manifest.";
  }
  return "Run a service-owned sandbox execution probe on a host with the configured OS provider so canonical OS-isolation evidence can be collected.";
}

function isServiceOwnedProviderRunnerResolution(
  resolution: AgentAdapterOsIsolationProviderRunnerResolution | undefined
): boolean {
  return Boolean(
    resolution?.resolution_source === "service_owned_provider_runner_resolver" &&
      resolution.runner_available === true &&
      isSha256(resolution.runner_binary_sha256)
  );
}

function defaultProviderRunnerResolver(
  input: AgentAdapterOsIsolationProviderRunnerResolverInput
): AgentAdapterOsIsolationProviderRunnerResolution {
  const providerEnvVar = providerHelperProgramEnvVar(input.provider);
  const configuredProgram = process.env[providerEnvVar] ?? process.env.COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER;
  if (!configuredProgram) {
    const bundledHelper = bundledProviderHelperConfig(input.provider);
    if (!bundledHelper) {
      return {
        resolution_source: "service_owned_provider_runner_resolver",
        runner_available: false,
        diagnostics: [
          `${input.provider} provider runner helper is not configured for platform=${sanitizeProbeText(input.platform ?? "unknown")}.`,
          `Set ${providerEnvVar} to an absolute service-owned helper executable before collecting provider execution evidence.`
        ]
      };
    }
    const helperHash = sha256FileSync(bundledHelper.program);
    return {
      resolution_source: "service_owned_provider_runner_resolver",
      runner_available: true,
      runner_binary_sha256: helperHash.sha256,
      runner_version: bundledHelper.version,
      diagnostics: [
        `${input.provider} provider runner is using the bundled CoMath provider-helper protocol asset for platform=${sanitizeProbeText(input.platform ?? "unknown")}.`,
        ...bundledHelper.diagnostics,
        "Bundled helper assets prove only protocol binding; canonical OS-enforcement evidence still requires service-owned collection."
      ]
    };
  }
  if (!isAbsolute(configuredProgram)) {
    return {
      resolution_source: "service_owned_provider_runner_resolver",
      runner_available: false,
      diagnostics: [`${providerEnvVar} must be an absolute path.`]
    };
  }
  if (!existsSync(configuredProgram) || !statSync(configuredProgram).isFile()) {
    return {
      resolution_source: "service_owned_provider_runner_resolver",
      runner_available: false,
      diagnostics: [`${providerEnvVar} does not point to an existing file.`]
    };
  }
  const helperHash = sha256FileSync(configuredProgram);
  return {
    resolution_source: "service_owned_provider_runner_resolver",
    runner_available: true,
    runner_binary_sha256: helperHash.sha256,
    runner_version: `${input.provider}-helper-env-configured`,
    diagnostics: [
      `${providerEnvVar} resolved to a service-owned provider helper executable for platform=${sanitizeProbeText(input.platform ?? "unknown")}.`,
      "Configured helper assets prepare only a provider runner contract; canonical OS-enforcement evidence still requires service-owned collection."
    ]
  };
}

function providerRunnerStatus(input: {
  launchReady: boolean;
  launchMatches: boolean;
  resolution: AgentAdapterOsIsolationProviderRunnerResolution | undefined;
  resolved: boolean;
}): AgentAdapterOsIsolationProviderRunnerStatus {
  if (!input.launchReady) {
    return "blocked_provider_runner_launch_preflight_missing";
  }
  if (!input.launchMatches) {
    return "blocked_provider_runner_binding_mismatch";
  }
  if (
    input.resolution?.resolution_source === "service_owned_provider_runner_resolver" &&
    input.resolution.runner_available === false
  ) {
    return "blocked_provider_runner_unavailable";
  }
  return input.resolved ? "ready_for_service_owned_provider_runner" : "blocked_provider_runner_not_resolved";
}

function providerRunnerReplayableNextAction(status: AgentAdapterOsIsolationProviderRunnerStatus): string {
  if (status === "blocked_provider_runner_launch_preflight_missing") {
    return "Run a ready service-owned sandbox-launch preflight before preparing a provider runner contract.";
  }
  if (status === "blocked_provider_runner_binding_mismatch") {
    return "Prepare the provider runner with the exact adapter, backend, project, and provider bound by the ready sandbox-launch preflight manifest.";
  }
  if (status === "blocked_provider_runner_unavailable") {
    return "Configure the service-owned OS sandbox provider runner helper on this host; caller-supplied command or environment metadata cannot stand in for the runner.";
  }
  return "Configure a service-owned provider runner resolver for the selected OS sandbox provider; caller-supplied command or environment metadata cannot resolve it.";
}

function providerRunnerArgvTemplate(provider: AgentAdapterOsIsolationProvider): string[] {
  switch (provider) {
    case "oci_container":
      return ["oci-run", "--network=none", "--no-new-privileges", "--", "<adapter-command>", "<adapter-args>"];
    case "nix_sandbox":
      return ["nix", "develop", "--ignore-environment", "--command", "<adapter-command>", "<adapter-args>"];
    case "firejail":
      return ["firejail", "--private", "--net=none", "--nonewprivs", "--", "<adapter-command>", "<adapter-args>"];
    case "windows_appcontainer":
      return ["windows-appcontainer-runner", "--network=disabled", "--profile", "<service-owned-profile>", "--", "<adapter-command>", "<adapter-args>"];
    case "macos_sandbox_exec":
      return ["sandbox-exec", "-f", "<service-owned-profile>", "<adapter-command>", "<adapter-args>"];
    default:
      return ["unsupported-provider", "--", "<adapter-command>", "<adapter-args>"];
  }
}

function providerRunnerEnvironmentPolicy(provider: AgentAdapterOsIsolationProvider): AgentAdapterOsIsolationProviderRunner["provider_runner_contract"]["environment_policy"] {
  const allowedEnvKeys = [
    "COMATH_ADAPTER_BACKEND",
    "COMATH_ADAPTER_ID",
    "COMATH_OS_ISOLATION_PROVIDER",
    "COMATH_RUNNER_NETWORK",
    "COMATH_PROOF_AUTHORITY",
    "COMATH_PROVIDER_RUNNER_ID",
    "COMATH_SANDBOX_LAUNCH_ID",
    "COMATH_PROJECT_ID"
  ];
  const material = {
    provider,
    inherit_parent_environment: false,
    allowed_env_keys: allowedEnvKeys,
    env_override_allowed: false
  };
  return {
    inherit_parent_environment: false,
    allowed_env_keys: allowedEnvKeys,
    env_override_allowed: false,
    env_policy_sha256: sha256Text(canonicalJson(material))
  };
}

function providerRunnerIsReadyForHelperExecution(
  runnerBundle: { runner: AgentAdapterOsIsolationProviderRunner } | null
): boolean {
  const runner = runnerBundle?.runner;
  return Boolean(
    runner &&
      runner.schema_version === "comath.agent_adapter_os_isolation_provider_runner.v1" &&
      runner.ok === true &&
      runner.runner_status === "ready_for_service_owned_provider_runner" &&
      runner.provider_runner_ready === true &&
      runner.provider_runner_resolution.resolution_source === "service_owned_provider_runner_resolver" &&
      isSha256(runner.provider_runner_resolution.runner_binary_sha256) &&
      runner.provider_runner_contract.shell === false &&
      runner.provider_runner_contract.network_policy === "disabled" &&
      runner.provider_runner_contract.command_override_allowed === false &&
      runner.provider_runner_contract.environment_override_allowed === false &&
      runner.provider_runner_contract.caller_supplied_success_allowed === false &&
      osEnforcedProviders.has(runner.provider)
  );
}

function providerRunnerMatchesHelperInput(input: {
  runnerBundle: { runner: AgentAdapterOsIsolationProviderRunner } | null;
  projectId: string;
  runnerId: string;
  launchId: string;
  adapterId: AgentAdapterPackageId;
  backend: AgentAdapterBackend;
  provider: AgentAdapterOsIsolationProvider;
}): boolean {
  const runner = input.runnerBundle?.runner;
  return Boolean(
    runner &&
      runner.project_id === input.projectId &&
      runner.runner_id === input.runnerId &&
      runner.launch_id === input.launchId &&
      runner.adapter_id === input.adapterId &&
      runner.backend === input.backend &&
      runner.provider === input.provider
  );
}

function providerHelperEnv(input: {
  projectId: string;
  runnerId: string;
  launchId: string;
  adapterId: AgentAdapterPackageId;
  backend: AgentAdapterBackend;
  provider: AgentAdapterOsIsolationProvider;
}): Record<string, string> {
  return {
    COMATH_ADAPTER_BACKEND: input.backend,
    COMATH_ADAPTER_ID: input.adapterId,
    COMATH_OS_ISOLATION_PROVIDER: input.provider,
    COMATH_RUNNER_NETWORK: "disabled",
    COMATH_PROOF_AUTHORITY: "none",
    COMATH_PROVIDER_RUNNER_ID: input.runnerId,
    COMATH_SANDBOX_LAUNCH_ID: input.launchId,
    COMATH_PROJECT_ID: input.projectId
  };
}

function providerHelperFixedArgs(input: {
  helperExecutionId: string;
  runnerId: string;
  launchId: string;
  adapterId: AgentAdapterPackageId;
  backend: AgentAdapterBackend;
  provider: AgentAdapterOsIsolationProvider;
}): string[] {
  return [
    "--provider",
    input.provider,
    "--runner-id",
    input.runnerId,
    "--launch-id",
    input.launchId,
    "--helper-execution-id",
    input.helperExecutionId,
    "--adapter-id",
    input.adapterId,
    "--backend",
    input.backend,
    "--network-policy",
    "disabled",
    "--proof-authority",
    "none"
  ];
}

function providerHelperCollectionProbeFixedArgs(
  input: AgentAdapterOsIsolationProviderHelperCollectionProbeInput,
  expectation?: AgentAdapterOsIsolationProviderToolExecutionWitnessExpectation
): string[] {
  const args = [
    "--provider",
    input.provider,
    "--runner-id",
    input.runner_id,
    "--launch-id",
    input.launch_id,
    "--collection-id",
    input.collection_id,
    "--helper-execution-id",
    input.helper_execution_id,
    "--adapter-id",
    input.adapter_id,
    "--backend",
    input.backend,
    "--network-policy",
    "disabled",
    "--proof-authority",
    "none",
    "--helper-exit-code",
    String(input.helper_exit_code),
    "--stdout-sha256",
    input.stdout_sha256,
    "--stderr-sha256",
    input.stderr_sha256,
    "--transcript-sha256",
    input.transcript_sha256,
    "--host-validation-id",
    input.host_validation_id,
    "--host-validation-path",
    input.host_validation_path,
    "--host-validation-sha256",
    input.host_validation_sha256,
    "--host-capability-probe-id",
    input.host_capability_probe_id,
    "--host-capability-probe-path",
    input.host_capability_probe_path,
    "--host-capability-probe-sha256",
    input.host_capability_probe_sha256,
    "--host-capability-status",
    input.host_capability_status,
    "--provider-host-capability-bound",
    input.provider_host_capability_bound ? "true" : "false"
  ];
  return expectation
    ? [
        ...args,
        "--provider-tool-sha256",
        expectation.tool_sha256,
        "--provider-tool-profile-sha256",
        expectation.profile_sha256,
        "--provider-tool-argv-sha256",
        expectation.argv_sha256,
        ...(providerSpecificToolExpectationRequired(expectation)
          ? [
              "--provider-host-tool-name",
              expectation.host_capability_tool_name as string,
              "--provider-host-tool-sha256",
              expectation.host_capability_tool_sha256 as string
            ]
          : []),
        ...(providerFamilyExecutionProfileRequired(expectation)
          ? [
              "--provider-family-execution-kind",
              expectation.provider_family_execution_kind as string,
              "--provider-family-execution-profile-sha256",
              expectation.provider_family_execution_profile_sha256 as string,
              "--provider-family-execution-argv-sha256",
              expectation.provider_family_execution_argv_sha256 as string
            ]
          : [])
      ]
    : args;
}

function providerHelperSelfTestFixedArgs(input: {
  hostValidationId: string;
  runnerId: string;
  launchId: string;
  adapterId: AgentAdapterPackageId;
  backend: AgentAdapterBackend;
  provider: AgentAdapterOsIsolationProvider;
}): string[] {
  return [
    "--comath-provider-helper-self-test",
    "--provider",
    input.provider,
    "--runner-id",
    input.runnerId,
    "--launch-id",
    input.launchId,
    "--host-validation-id",
    input.hostValidationId,
    "--adapter-id",
    input.adapterId,
    "--backend",
    input.backend,
    "--network-policy",
    "disabled",
    "--proof-authority",
    "none"
  ];
}

function providerHelperProgramEnvVar(provider: AgentAdapterOsIsolationProvider): string {
  switch (provider) {
    case "oci_container":
      return "COMATH_AGENT_ADAPTER_OSISO_OCI_HELPER";
    case "nix_sandbox":
      return "COMATH_AGENT_ADAPTER_OSISO_NIX_HELPER";
    case "firejail":
      return "COMATH_AGENT_ADAPTER_OSISO_FIREJAIL_HELPER";
    case "windows_appcontainer":
      return "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_HELPER";
    case "macos_sandbox_exec":
      return "COMATH_AGENT_ADAPTER_OSISO_MACOS_SANDBOX_EXEC_HELPER";
    default:
      return "COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER";
  }
}

function providerHelperArgsEnvVar(provider: AgentAdapterOsIsolationProvider): string {
  switch (provider) {
    case "oci_container":
      return "COMATH_AGENT_ADAPTER_OSISO_OCI_HELPER_ARGS_JSON";
    case "nix_sandbox":
      return "COMATH_AGENT_ADAPTER_OSISO_NIX_HELPER_ARGS_JSON";
    case "firejail":
      return "COMATH_AGENT_ADAPTER_OSISO_FIREJAIL_HELPER_ARGS_JSON";
    case "windows_appcontainer":
      return "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_HELPER_ARGS_JSON";
    case "macos_sandbox_exec":
      return "COMATH_AGENT_ADAPTER_OSISO_MACOS_SANDBOX_EXEC_HELPER_ARGS_JSON";
    default:
      return "COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER_ARGS_JSON";
  }
}

function providerHelperCollectionProbeProgramEnvVar(provider: AgentAdapterOsIsolationProvider): string {
  switch (provider) {
    case "oci_container":
      return "COMATH_AGENT_ADAPTER_OSISO_OCI_COLLECTION_PROBE";
    case "nix_sandbox":
      return "COMATH_AGENT_ADAPTER_OSISO_NIX_COLLECTION_PROBE";
    case "firejail":
      return "COMATH_AGENT_ADAPTER_OSISO_FIREJAIL_COLLECTION_PROBE";
    case "windows_appcontainer":
      return "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_COLLECTION_PROBE";
    case "macos_sandbox_exec":
      return "COMATH_AGENT_ADAPTER_OSISO_MACOS_SANDBOX_EXEC_COLLECTION_PROBE";
    default:
      return "COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER_COLLECTION_PROBE";
  }
}

function providerHelperCollectionProbeArgsEnvVar(provider: AgentAdapterOsIsolationProvider): string {
  switch (provider) {
    case "oci_container":
      return "COMATH_AGENT_ADAPTER_OSISO_OCI_COLLECTION_PROBE_ARGS_JSON";
    case "nix_sandbox":
      return "COMATH_AGENT_ADAPTER_OSISO_NIX_COLLECTION_PROBE_ARGS_JSON";
    case "firejail":
      return "COMATH_AGENT_ADAPTER_OSISO_FIREJAIL_COLLECTION_PROBE_ARGS_JSON";
    case "windows_appcontainer":
      return "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_COLLECTION_PROBE_ARGS_JSON";
    case "macos_sandbox_exec":
      return "COMATH_AGENT_ADAPTER_OSISO_MACOS_SANDBOX_EXEC_COLLECTION_PROBE_ARGS_JSON";
    default:
      return "COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER_COLLECTION_PROBE_ARGS_JSON";
  }
}

function providerSpecificLiveProbeProgramEnvVar(provider: AgentAdapterOsIsolationProvider): string {
  switch (provider) {
    case "oci_container":
      return "COMATH_AGENT_ADAPTER_OSISO_OCI_LIVE_PROBE";
    case "nix_sandbox":
      return "COMATH_AGENT_ADAPTER_OSISO_NIX_LIVE_PROBE";
    case "firejail":
      return "COMATH_AGENT_ADAPTER_OSISO_FIREJAIL_LIVE_PROBE";
    case "windows_appcontainer":
      return "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_LIVE_PROBE";
    case "macos_sandbox_exec":
      return "COMATH_AGENT_ADAPTER_OSISO_MACOS_SANDBOX_EXEC_LIVE_PROBE";
    default:
      return "COMATH_AGENT_ADAPTER_OSISO_PROVIDER_SPECIFIC_LIVE_PROBE";
  }
}

function providerSpecificLiveProbeArgsEnvVar(provider: AgentAdapterOsIsolationProvider): string {
  switch (provider) {
    case "oci_container":
      return "COMATH_AGENT_ADAPTER_OSISO_OCI_LIVE_PROBE_ARGS_JSON";
    case "nix_sandbox":
      return "COMATH_AGENT_ADAPTER_OSISO_NIX_LIVE_PROBE_ARGS_JSON";
    case "firejail":
      return "COMATH_AGENT_ADAPTER_OSISO_FIREJAIL_LIVE_PROBE_ARGS_JSON";
    case "windows_appcontainer":
      return "COMATH_AGENT_ADAPTER_OSISO_WINDOWS_APPCONTAINER_LIVE_PROBE_ARGS_JSON";
    case "macos_sandbox_exec":
      return "COMATH_AGENT_ADAPTER_OSISO_MACOS_SANDBOX_EXEC_LIVE_PROBE_ARGS_JSON";
    default:
      return "COMATH_AGENT_ADAPTER_OSISO_PROVIDER_SPECIFIC_LIVE_PROBE_ARGS_JSON";
  }
}

function configuredHelperArgsPrefix(provider: AgentAdapterOsIsolationProvider): {
  ok: boolean;
  args: string[];
  configured_env_var: string | null;
  diagnostics: string[];
} {
  const providerEnvVar = providerHelperArgsEnvVar(provider);
  const configuredArgs = process.env[providerEnvVar] ?? process.env.COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER_ARGS_JSON;
  const configuredEnvVar = process.env[providerEnvVar] !== undefined
    ? providerEnvVar
    : process.env.COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER_ARGS_JSON !== undefined
      ? "COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER_ARGS_JSON"
      : null;
  if (!configuredArgs) {
    return { ok: true, args: [], configured_env_var: null, diagnostics: [] };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(configuredArgs);
  } catch {
    return {
      ok: false,
      args: [],
      configured_env_var: configuredEnvVar,
      diagnostics: [`${configuredEnvVar ?? providerEnvVar} must be a JSON string array.`]
    };
  }
  const args = sanitizeHelperArgsPrefix(parsed);
  if (!Array.isArray(parsed) || args.length !== parsed.length) {
    return {
      ok: false,
      args: [],
      configured_env_var: configuredEnvVar,
      diagnostics: [`${configuredEnvVar ?? providerEnvVar} must contain only bounded string arguments.`]
    };
  }
  return {
    ok: true,
    args,
    configured_env_var: configuredEnvVar,
    diagnostics: [
      `${configuredEnvVar ?? providerEnvVar} resolved to ${args.length} fixed service-owned helper argument(s).`
    ]
  };
}

function configuredProviderHelperCollectionProbeArgsPrefix(provider: AgentAdapterOsIsolationProvider): {
  ok: boolean;
  args: string[];
  configured_env_var: string | null;
  diagnostics: string[];
} {
  const providerEnvVar = providerHelperCollectionProbeArgsEnvVar(provider);
  const fallbackEnvVar = "COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER_COLLECTION_PROBE_ARGS_JSON";
  const configuredArgs = process.env[providerEnvVar] ?? process.env[fallbackEnvVar];
  const configuredEnvVar = process.env[providerEnvVar] !== undefined
    ? providerEnvVar
    : process.env[fallbackEnvVar] !== undefined
      ? fallbackEnvVar
      : null;
  if (!configuredArgs) {
    return { ok: true, args: [], configured_env_var: null, diagnostics: [] };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(configuredArgs);
  } catch {
    return {
      ok: false,
      args: [],
      configured_env_var: configuredEnvVar,
      diagnostics: [`${configuredEnvVar ?? providerEnvVar} must be a JSON string array.`]
    };
  }
  const args = sanitizeHelperArgsPrefix(parsed);
  if (!Array.isArray(parsed) || args.length !== parsed.length) {
    return {
      ok: false,
      args: [],
      configured_env_var: configuredEnvVar,
      diagnostics: [`${configuredEnvVar ?? providerEnvVar} must contain only bounded string arguments.`]
    };
  }
  return {
    ok: true,
    args,
    configured_env_var: configuredEnvVar,
    diagnostics: [
      `${configuredEnvVar ?? providerEnvVar} resolved to ${args.length} fixed service-owned collection probe argument(s).`
    ]
  };
}

function configuredProviderSpecificLiveProbeArgsPrefix(provider: AgentAdapterOsIsolationProvider): {
  ok: boolean;
  args: string[];
  configured_env_var: string | null;
  diagnostics: string[];
} {
  const providerEnvVar = providerSpecificLiveProbeArgsEnvVar(provider);
  const fallbackEnvVar = "COMATH_AGENT_ADAPTER_OSISO_PROVIDER_SPECIFIC_LIVE_PROBE_ARGS_JSON";
  const configuredArgs = process.env[providerEnvVar] ?? process.env[fallbackEnvVar];
  const configuredEnvVar = process.env[providerEnvVar] !== undefined
    ? providerEnvVar
    : process.env[fallbackEnvVar] !== undefined
      ? fallbackEnvVar
      : null;
  if (!configuredArgs) {
    return { ok: true, args: [], configured_env_var: null, diagnostics: [] };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(configuredArgs);
  } catch {
    return {
      ok: false,
      args: [],
      configured_env_var: configuredEnvVar,
      diagnostics: [`${configuredEnvVar ?? providerEnvVar} must be a JSON string array.`]
    };
  }
  const args = sanitizeHelperArgsPrefix(parsed);
  if (!Array.isArray(parsed) || args.length !== parsed.length) {
    return {
      ok: false,
      args: [],
      configured_env_var: configuredEnvVar,
      diagnostics: [`${configuredEnvVar ?? providerEnvVar} must contain only bounded string arguments.`]
    };
  }
  return {
    ok: true,
    args,
    configured_env_var: configuredEnvVar,
    diagnostics: [
      `${configuredEnvVar ?? providerEnvVar} resolved to ${args.length} fixed service-owned live probe argument(s).`
    ]
  };
}

function bundledProviderHelperAssetPath(): string | null {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  const helperPath = join(moduleDir, "helpers", "provider-helper-protocol.mjs");
  return existsSync(helperPath) && statSync(helperPath).isFile() ? helperPath : null;
}

function bundledProviderHelperCollectionProbeAssetPath(): string | null {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  const helperPath = join(moduleDir, "helpers", "provider-helper-collection-probe.mjs");
  return existsSync(helperPath) && statSync(helperPath).isFile() ? helperPath : null;
}

function bundledProviderHelperConfig(provider: AgentAdapterOsIsolationProvider): {
  program: string;
  argsPrefix: string[];
  version: string;
  diagnostics: string[];
} | null {
  const helperAssetPath = bundledProviderHelperAssetPath();
  if (!helperAssetPath || !isAbsolute(process.execPath) || !existsSync(process.execPath) || !statSync(process.execPath).isFile()) {
    return null;
  }
  return {
    program: process.execPath,
    argsPrefix: [helperAssetPath],
    version: `${provider}-helper-bundled-protocol-v1`,
    diagnostics: [
      "Bundled CoMath provider-helper protocol asset is available.",
      "Bundled helper output is protocol attestation only, not OS-enforcement evidence or GA certification."
    ]
  };
}

function defaultProviderHelperConfigResolver(
  input: AgentAdapterOsIsolationProviderHelperConfigResolverInput
): AgentAdapterOsIsolationProviderHelperConfig {
  const providerEnvVar = providerHelperProgramEnvVar(input.provider);
  const configuredProgram = process.env[providerEnvVar] ?? process.env.COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER;
  if (!configuredProgram) {
    const bundledHelper = bundledProviderHelperConfig(input.provider);
    return bundledHelper
      ? {
          config_source: "service_owned_provider_helper_config",
          helper_available: true,
          helper_program: bundledHelper.program,
          helper_args_prefix: bundledHelper.argsPrefix,
          helper_version: bundledHelper.version,
          timeout_ms: 10_000,
          diagnostics: bundledHelper.diagnostics
        }
      : {
          config_source: "service_owned_provider_helper_config",
          helper_available: false,
          diagnostics: [
            `${input.provider} provider helper is not configured for platform=${sanitizeProbeText(input.platform ?? "unknown")}.`,
            `Set ${providerEnvVar} to an absolute service-owned helper executable before attempting provider helper execution.`
          ]
        };
  }
  if (!isAbsolute(configuredProgram)) {
    return {
      config_source: "service_owned_provider_helper_config",
      helper_available: false,
      diagnostics: [`${providerEnvVar} must be an absolute path.`]
    };
  }
  if (!existsSync(configuredProgram) || !statSync(configuredProgram).isFile()) {
    return {
      config_source: "service_owned_provider_helper_config",
      helper_available: false,
      diagnostics: [`${providerEnvVar} does not point to an existing file.`]
    };
  }
  const configuredArgs = configuredHelperArgsPrefix(input.provider);
  if (!configuredArgs.ok) {
    return {
      config_source: "service_owned_provider_helper_config",
      helper_available: false,
      diagnostics: configuredArgs.diagnostics
    };
  }
  return {
    config_source: "service_owned_provider_helper_config",
    helper_available: true,
    helper_program: configuredProgram,
    helper_args_prefix: configuredArgs.args,
    helper_version: `${input.provider}-helper-env-configured`,
    timeout_ms: 10_000,
    diagnostics: [
      `${providerEnvVar} resolved to a service-owned helper executable.`,
      ...configuredArgs.diagnostics
    ]
  };
}

function defaultProviderHelperHostValidator(
  input: AgentAdapterOsIsolationProviderHelperHostValidatorInput
): AgentAdapterOsIsolationProviderHelperHostValidationProbe {
  const providerEnvVar = providerHelperProgramEnvVar(input.provider);
  const configuredProgram = process.env[providerEnvVar] ?? process.env.COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER;
  const supportedPlatforms = providerHelperSupportedPlatforms(input.provider);
  const hostPlatform = process.platform;
  if (!configuredProgram) {
    const bundledHelper = bundledProviderHelperConfig(input.provider);
    if (!bundledHelper) {
      return {
        validation_source: "service_owned_provider_helper_host_validator",
        helper_host_ready: false,
        diagnostics: [
          `${input.provider} provider helper host is not configured for platform=${sanitizeProbeText(input.platform ?? "unknown")}.`,
          `Set ${providerEnvVar} to an absolute service-owned helper executable before validating this host.`
        ]
      };
    }
    return runDefaultProviderHelperHostValidator({
      input,
      helperProgram: bundledHelper.program,
      helperVersion: bundledHelper.version,
      configuredArgs: {
        ok: true,
        args: bundledHelper.argsPrefix,
        configured_env_var: null,
        diagnostics: bundledHelper.diagnostics
      },
      providerLabel: "bundled CoMath provider-helper protocol asset",
      supportedPlatforms,
      hostPlatform
    });
  }
  if (!isAbsolute(configuredProgram)) {
    return {
      validation_source: "service_owned_provider_helper_host_validator",
      helper_host_ready: false,
      diagnostics: [`${providerEnvVar} must be an absolute path.`]
    };
  }
  if (!existsSync(configuredProgram) || !statSync(configuredProgram).isFile()) {
    return {
      validation_source: "service_owned_provider_helper_host_validator",
      helper_host_ready: false,
      diagnostics: [`${providerEnvVar} does not point to an existing file.`]
    };
  }
  const configuredArgs = configuredHelperArgsPrefix(input.provider);
  return runDefaultProviderHelperHostValidator({
    input,
    helperProgram: configuredProgram,
    helperVersion: `${input.provider}-helper-env-configured`,
    configuredArgs,
    providerLabel: providerEnvVar,
    supportedPlatforms,
    hostPlatform
  });
}

function runDefaultProviderHelperHostValidator(input: {
  input: AgentAdapterOsIsolationProviderHelperHostValidatorInput;
  helperProgram: string;
  helperVersion: string;
  configuredArgs: {
    ok: boolean;
    args: string[];
    configured_env_var: string | null;
    diagnostics: string[];
  };
  providerLabel: string;
  supportedPlatforms: string[];
  hostPlatform: NodeJS.Platform;
}): AgentAdapterOsIsolationProviderHelperHostValidationProbe {
  const { input: validatorInput, helperProgram, helperVersion, configuredArgs, providerLabel, supportedPlatforms, hostPlatform } = input;
  const helperHash = sha256FileSync(helperProgram);
  if (!configuredArgs.ok) {
    return {
      validation_source: "service_owned_provider_helper_host_validator",
      helper_host_ready: false,
      helper_program: helperProgram,
      helper_binary_sha256: helperHash.sha256,
      helper_version: helperVersion,
      supported_platforms: supportedPlatforms,
      self_test_required: true,
      self_test_passed: false,
      self_test_exit_code: null,
      self_test_signal: null,
      self_test_timed_out: false,
      self_test_stdout_sha256: null,
      self_test_stderr_sha256: null,
      self_test_transcript_sha256: null,
      self_test_args_prefix_sha256: null,
      self_test_args_prefix_count: 0,
      self_test_fixed_args_sha256: null,
      diagnostics: configuredArgs.diagnostics
    };
  }
  const fixedArgs = providerHelperSelfTestFixedArgs({
    hostValidationId: validatorInput.host_validation_id,
    runnerId: validatorInput.runner_id,
    launchId: validatorInput.launch_id,
    adapterId: validatorInput.adapter_id,
    backend: validatorInput.backend,
    provider: validatorInput.provider
  });
  const env = providerHelperEnv({
    projectId: validatorInput.project_id,
    runnerId: validatorInput.runner_id,
    launchId: validatorInput.launch_id,
    adapterId: validatorInput.adapter_id,
    backend: validatorInput.backend,
    provider: validatorInput.provider
  });
  const shouldRunSelfTest = supportedPlatforms.includes(hostPlatform);
  const selfTest = shouldRunSelfTest
    ? spawnSync(helperProgram, [...configuredArgs.args, ...fixedArgs], {
        cwd: validatorInput.project_root,
        env,
        encoding: "utf8",
        shell: false,
        timeout: 10_000
      })
    : undefined;
  const stdout = typeof selfTest?.stdout === "string" ? selfTest.stdout : "";
  const stderr = typeof selfTest?.stderr === "string" ? selfTest.stderr : "";
  const exitCode = typeof selfTest?.status === "number" ? selfTest.status : null;
  const signal = typeof selfTest?.signal === "string" ? selfTest.signal : null;
  const spawnError = selfTest?.error as (Error & { code?: string }) | undefined;
  const timedOut = spawnError?.code === "ETIMEDOUT";
  const selfTestStdoutSha256 = shouldRunSelfTest ? sha256Bytes(stdout) : null;
  const selfTestStderrSha256 = shouldRunSelfTest ? sha256Bytes(stderr) : null;
  const selfTestArgsPrefixSha256 = configuredArgs.args.length > 0 ? sha256Text(canonicalJson(configuredArgs.args)) : null;
  const selfTestFixedArgsSha256 = sha256Text(canonicalJson(fixedArgs));
  const selfTestPassed = shouldRunSelfTest && !spawnError && exitCode === 0 && providerHelperSelfTestStdoutAccepted(stdout, validatorInput);
  const selfTestTranscriptSha256 = shouldRunSelfTest
    ? sha256Text(canonicalJson({
        host_validation_id: validatorInput.host_validation_id,
        runner_id: validatorInput.runner_id,
        launch_id: validatorInput.launch_id,
        helper_binary_sha256: helperHash.sha256,
        helper_args_prefix_sha256: selfTestArgsPrefixSha256,
        helper_args_prefix_count: configuredArgs.args.length,
        self_test_fixed_args_sha256: selfTestFixedArgsSha256,
        self_test_exit_code: exitCode,
        self_test_signal: signal,
        stdout_sha256: selfTestStdoutSha256,
        stderr_sha256: selfTestStderrSha256
      }))
    : null;
  return {
    validation_source: "service_owned_provider_helper_host_validator",
    helper_host_ready: selfTestPassed,
    helper_program: helperProgram,
    helper_binary_sha256: helperHash.sha256,
    helper_version: helperVersion,
    supported_platforms: supportedPlatforms,
    self_test_required: true,
    self_test_passed: selfTestPassed,
    self_test_exit_code: exitCode,
    self_test_signal: signal,
    self_test_timed_out: timedOut,
    self_test_stdout_sha256: selfTestStdoutSha256,
    self_test_stderr_sha256: selfTestStderrSha256,
    self_test_transcript_sha256: selfTestTranscriptSha256,
    self_test_args_prefix_sha256: selfTestArgsPrefixSha256,
    self_test_args_prefix_count: configuredArgs.args.length,
    self_test_fixed_args_sha256: selfTestFixedArgsSha256,
    diagnostics: [
      `${providerLabel} resolved to a service-owned helper executable for host validation.`,
      ...configuredArgs.diagnostics,
      supportedPlatforms.includes(hostPlatform)
        ? `${validatorInput.provider} configured helper host platform contract accepts platform=${hostPlatform}.`
        : `${validatorInput.provider} configured helper host platform contract rejects platform=${hostPlatform}; supported platforms are ${supportedPlatforms.join(", ") || "none"}.`,
      shouldRunSelfTest
        ? `Provider helper self-test ${selfTestPassed ? "passed" : "failed"} with exit_code=${exitCode ?? "null"}.`
        : "Provider helper self-test skipped because host platform is incompatible.",
      spawnError?.message ? sanitizeProbeText(spawnError.message) : undefined
    ].filter((entry): entry is string => Boolean(entry))
  };
}

function providerHelperSelfTestStdoutAccepted(
  stdout: string,
  input: AgentAdapterOsIsolationProviderHelperHostValidatorInput
): boolean {
  const firstLine = stdout.split(/\r?\n/).find((line) => line.trim().length > 0);
  if (!firstLine) {
    return false;
  }
  try {
    const parsed = JSON.parse(firstLine) as Record<string, unknown>;
    return (
      parsed.comath_provider_helper_self_test === true &&
      parsed.ok === true &&
      parsed.provider === input.provider &&
      parsed.network_policy === "disabled" &&
      parsed.proof_authority === "none" &&
      parsed.adapter === input.adapter_id &&
      parsed.backend === input.backend &&
      parsed.project_id === input.project_id &&
      parsed.host_validation_id === input.host_validation_id &&
      parsed.runner_id === input.runner_id &&
      parsed.launch_id === input.launch_id
    );
  } catch {
    return false;
  }
}

function parseFirstJsonLine(stdout: string): Record<string, unknown> | null {
  const firstLine = stdout.split(/\r?\n/).find((line) => line.trim().length > 0);
  if (!firstLine) {
    return null;
  }
  try {
    const parsed = JSON.parse(firstLine) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function providerHelperRuntimeAttestation(input: {
  stdout: string;
  projectId: string;
  helperExecutionId: string;
  runnerId: string;
  launchId: string;
  adapterId: AgentAdapterPackageId;
  backend: AgentAdapterBackend;
  provider: AgentAdapterOsIsolationProvider;
}): {
  source: "helper_stdout_json" | "missing";
  bound: boolean;
  sha256: string | null;
} {
  const parsed = parseFirstJsonLine(input.stdout);
  const bound = Boolean(
    parsed &&
      parsed.comath_provider_helper_runtime_attestation === true &&
      parsed.ok === true &&
      parsed.provider === input.provider &&
      parsed.network_policy === "disabled" &&
      parsed.proof_authority === "none" &&
      parsed.adapter === input.adapterId &&
      parsed.backend === input.backend &&
      parsed.project_id === input.projectId &&
      parsed.helper_execution_id === input.helperExecutionId &&
      parsed.runner_id === input.runnerId &&
      parsed.launch_id === input.launchId
  );
  if (!bound || !parsed) {
    return { source: parsed ? "helper_stdout_json" : "missing", bound: false, sha256: null };
  }
  return {
    source: "helper_stdout_json",
    bound: true,
    sha256: sha256Text(canonicalJson({
      comath_provider_helper_runtime_attestation: true,
      provider: input.provider,
      network_policy: "disabled",
      proof_authority: "none",
      adapter: input.adapterId,
      backend: input.backend,
      project_id: input.projectId,
      helper_execution_id: input.helperExecutionId,
      runner_id: input.runnerId,
      launch_id: input.launchId
    }))
  };
}

function providerHelperSupportedPlatforms(provider: AgentAdapterOsIsolationProvider): string[] {
  switch (provider) {
    case "firejail":
      return ["linux"];
    case "windows_appcontainer":
      return ["win32"];
    case "macos_sandbox_exec":
      return ["darwin"];
    case "nix_sandbox":
      return ["linux", "darwin"];
    case "oci_container":
      return ["linux", "darwin", "win32"];
    default:
      return [];
  }
}

function sha256Bytes(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function sha256FileSync(path: string): { sha256: string; size_bytes: number } {
  const bytes = readFileSync(path);
  return { sha256: sha256Bytes(bytes), size_bytes: bytes.byteLength };
}

function providerToolExecutionArgvSha256(argv: string[]): string {
  return sha256Text(canonicalJson({
    schema_version: "comath.agent_adapter_os_isolation_provider_tool_argv.v1",
    shell: false,
    argv
  }));
}

const providerToolExecutionWitnessArgvTemplate: AgentAdapterOsIsolationProviderToolExecutionWitnessExpectation = {
  tool_sha256: "<provider-tool-sha256>",
  profile_sha256: "<provider-tool-profile-sha256>",
  argv_sha256: "<provider-tool-argv-sha256>"
};

function providerToolExecutionArgvTemplateSha256(
  input: AgentAdapterOsIsolationProviderHelperCollectionProbeInput,
  argvPrefix: string[],
  providerSpecificTool?: { name: string; sha256: string } | null
): string {
  const template: AgentAdapterOsIsolationProviderToolExecutionWitnessExpectation = providerSpecificTool
    ? {
        ...providerToolExecutionWitnessArgvTemplate,
        host_capability_tool_name: providerSpecificTool.name,
        host_capability_tool_sha256: providerSpecificTool.sha256
      }
    : providerToolExecutionWitnessArgvTemplate;
  return providerToolExecutionArgvSha256([
    ...argvPrefix,
    ...providerHelperCollectionProbeFixedArgs(input, template)
  ]);
}

function providerToolExecutionProfileSha256(input: AgentAdapterOsIsolationProviderHelperCollectionProbeInput, profile: {
  tool_source:
    | "configured_provider_helper_collection_probe"
    | "bundled_provider_helper_collection_probe"
    | "service_owned_provider_helper_collection_callback";
  tool_sha256: string;
  argv_sha256: string;
  args_prefix_sha256: string | null;
  bundled_asset_sha256?: string | null;
  provider_specific_tool?: { name: string; sha256: string } | null;
}): string {
  return sha256Text(canonicalJson({
    schema_version: "comath.agent_adapter_os_isolation_provider_tool_profile.v1",
    tool_source: profile.tool_source,
    project_id: input.project_id,
    collection_id: input.collection_id,
    helper_execution_id: input.helper_execution_id,
    runner_id: input.runner_id,
    launch_id: input.launch_id,
    adapter_id: input.adapter_id,
    backend: input.backend,
    provider: input.provider,
    network_policy: "disabled",
    proof_authority: "none",
    host_validation_id: input.host_validation_id,
    host_validation_sha256: input.host_validation_sha256.toLowerCase(),
    host_capability_probe_id: input.host_capability_probe_id,
    host_capability_probe_sha256: input.host_capability_probe_sha256.toLowerCase(),
    provider_host_capability_bound: input.provider_host_capability_bound === true,
    tool_sha256: profile.tool_sha256.toLowerCase(),
    argv_sha256: profile.argv_sha256.toLowerCase(),
    args_prefix_sha256: profile.args_prefix_sha256,
    bundled_asset_sha256: profile.bundled_asset_sha256 ?? null,
    provider_specific_tool_name: profile.provider_specific_tool?.name ?? null,
    provider_specific_tool_sha256: profile.provider_specific_tool?.sha256?.toLowerCase() ?? null
  }));
}

function providerFamilyExecutionArgvTemplateSha256(
  input: AgentAdapterOsIsolationProviderHelperCollectionProbeInput,
  argvPrefix: string[],
  expectation: AgentAdapterOsIsolationProviderToolExecutionWitnessExpectation
): string {
  const kind = providerFamilyExecutionKindForProvider(input.provider);
  if (!kind) {
    return sha256Text("unsupported-provider-family-execution");
  }
  return providerToolExecutionArgvSha256([
    ...argvPrefix,
    ...providerHelperCollectionProbeFixedArgs(input, {
      ...expectation,
      provider_family_execution_kind: kind,
      provider_family_execution_profile_sha256: "<provider-family-execution-profile-sha256>",
      provider_family_execution_argv_sha256: "<provider-family-execution-argv-sha256>"
    })
  ]);
}

function providerFamilyExecutionProfileSha256(
  input: AgentAdapterOsIsolationProviderHelperCollectionProbeInput,
  expectation: AgentAdapterOsIsolationProviderToolExecutionWitnessExpectation,
  argvSha256: string
): string {
  return sha256Text(canonicalJson({
    schema_version: "comath.agent_adapter_os_isolation_provider_family_execution_profile.v1",
    provider_family_execution_kind: providerFamilyExecutionKindForProvider(input.provider),
    project_id: input.project_id,
    collection_id: input.collection_id,
    helper_execution_id: input.helper_execution_id,
    runner_id: input.runner_id,
    launch_id: input.launch_id,
    adapter_id: input.adapter_id,
    backend: input.backend,
    provider: input.provider,
    network_policy: "disabled",
    proof_authority: "none",
    host_validation_id: input.host_validation_id,
    host_validation_sha256: input.host_validation_sha256.toLowerCase(),
    host_capability_probe_id: input.host_capability_probe_id,
    host_capability_sha256: input.host_capability_probe_sha256.toLowerCase(),
    provider_host_capability_bound: input.provider_host_capability_bound === true,
    provider_specific_tool_name: expectation.host_capability_tool_name ?? null,
    provider_specific_tool_sha256: expectation.host_capability_tool_sha256?.toLowerCase() ?? null,
    provider_tool_sha256: expectation.tool_sha256.toLowerCase(),
    provider_tool_profile_sha256: expectation.profile_sha256.toLowerCase(),
    provider_tool_argv_sha256: expectation.argv_sha256.toLowerCase(),
    provider_family_execution_argv_sha256: argvSha256.toLowerCase(),
    required_facts: {
      collection_source: "service_owned_os_probe",
      process_isolation_enforced: true,
      filesystem_scope_enforced: true,
      network_isolation_enforced: true,
      no_new_privileges: true,
      escape_prevention: true,
      adapter_process_exit_code: 0
    }
  }));
}

function withProviderFamilyExecutionExpectation(
  input: AgentAdapterOsIsolationProviderHelperCollectionProbeInput,
  expectation: AgentAdapterOsIsolationProviderToolExecutionWitnessExpectation,
  argvPrefix: string[]
): AgentAdapterOsIsolationProviderToolExecutionWitnessExpectation {
  const kind = providerFamilyExecutionKindForProvider(input.provider);
  if (!kind) {
    return expectation;
  }
  const providerFamilyExecutionArgvSha256 = providerFamilyExecutionArgvTemplateSha256(
    input,
    argvPrefix,
    expectation
  );
  return {
    ...expectation,
    provider_family_execution_kind: kind,
    provider_family_execution_argv_sha256: providerFamilyExecutionArgvSha256,
    provider_family_execution_profile_sha256: providerFamilyExecutionProfileSha256(
      input,
      expectation,
      providerFamilyExecutionArgvSha256
    )
  };
}

function providerToolExecutionCallbackExpectation(
  input: AgentAdapterOsIsolationProviderHelperCollectionProbeInput
): AgentAdapterOsIsolationProviderToolExecutionWitnessExpectation {
  const providerSpecificTool = input.provider_specific_tool_name && isSha256(input.provider_specific_tool_sha256)
    ? { name: input.provider_specific_tool_name, sha256: input.provider_specific_tool_sha256.toLowerCase() }
    : null;
  const toolSha256 = sha256Text(canonicalJson({
    schema_version: "comath.agent_adapter_os_isolation_provider_tool_callback.v1",
    tool_source: "service_owned_provider_helper_collection_callback",
    adapter_id: input.adapter_id,
    backend: input.backend,
    provider: input.provider
  }));
  const argvSha256 = providerToolExecutionArgvTemplateSha256(input, [], providerSpecificTool);
  const expectation = {
    tool_sha256: toolSha256,
    argv_sha256: argvSha256,
    host_capability_tool_name: providerSpecificTool?.name,
    host_capability_tool_sha256: providerSpecificTool?.sha256,
    profile_sha256: providerToolExecutionProfileSha256(input, {
      tool_source: "service_owned_provider_helper_collection_callback",
      tool_sha256: toolSha256,
      argv_sha256: argvSha256,
      args_prefix_sha256: null,
      provider_specific_tool: providerSpecificTool
    })
  };
  return withProviderFamilyExecutionExpectation(input, expectation, []);
}

function sanitizeHelperArgsPrefix(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string" && entry.length <= 4096);
}

function normalizeHelperTimeoutMs(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 100 && value <= 120_000 ? value : 10_000;
}

function providerHelperConfigAccepted(config: AgentAdapterOsIsolationProviderHelperConfig | undefined): boolean {
  return Boolean(
    config?.config_source === "service_owned_provider_helper_config" &&
      config.helper_available === true &&
      typeof config.helper_program === "string" &&
      isAbsolute(config.helper_program) &&
      existsSync(config.helper_program) &&
      statSync(config.helper_program).isFile()
  );
}

function sanitizeSupportedPlatforms(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return Array.from(
    new Set(
      value
        .filter((entry): entry is string => typeof entry === "string" && entry.length > 0 && entry.length <= 64)
        .map((entry) => sanitizeProbeText(entry))
        .filter(Boolean)
    )
  );
}

function providerHelperHostReplayableNextAction(
  status: AgentAdapterOsIsolationProviderHelperHostValidationStatus
): string {
  if (status === "blocked_provider_runner_manifest_missing") {
    return "Prepare a ready service-owned provider-runner manifest before validating the provider-helper host.";
  }
  if (status === "blocked_provider_runner_binding_mismatch") {
    return "Validate the provider-helper host with the exact project, adapter, backend, provider, launch, and runner bindings.";
  }
  if (status === "blocked_provider_host_capability_probe_missing") {
    return "Run a service-owned provider host capability probe and pass its append-only host_capability_probe_id before validating the provider-helper host.";
  }
  if (status === "blocked_provider_host_capability_probe_not_observed") {
    return "Retry provider-helper host validation only after the referenced provider host capability probe is service-owned and provider_host_capability_observed.";
  }
  if (status === "blocked_provider_host_capability_binding_mismatch") {
    return "Bind provider-helper host validation to a provider host capability probe with the exact project, adapter, backend, provider, platform, and artifact hash.";
  }
  if (status === "blocked_provider_helper_host_binary_mismatch") {
    return "Reconfigure the service-owned provider helper host so the validated helper binary hash matches the ready provider-runner manifest.";
  }
  if (status === "blocked_provider_helper_host_platform_mismatch") {
    return "Run host validation on a platform explicitly supported by the service-owned provider helper validator.";
  }
  if (status === "blocked_provider_helper_host_self_test_failed") {
    return "Configure a service-owned provider helper that passes the fixed CoMath helper self-test protocol before host validation can unlock helper execution.";
  }
  return "Configure and run a service-owned provider-helper host validator; caller-supplied host readiness, argv, env, or hashes cannot validate the host.";
}

function providerHelperHostValidationStatus(input: {
  runnerReady: boolean;
  runnerMatches: boolean;
  hostCapabilityPresent: boolean;
  hostCapabilityObserved: boolean;
  hostCapabilityMatches: boolean;
  validationSourceAccepted: boolean;
  helperHostReady: boolean;
  hashesMatchRunner: boolean;
  platformContractDeclared: boolean;
  platformSupported: boolean;
  selfTestRequired: boolean;
  selfTestPassed: boolean;
}): AgentAdapterOsIsolationProviderHelperHostValidationStatus {
  if (!input.runnerReady) {
    return "blocked_provider_runner_manifest_missing";
  }
  if (!input.runnerMatches) {
    return "blocked_provider_runner_binding_mismatch";
  }
  if (!input.hostCapabilityPresent) {
    return "blocked_provider_host_capability_probe_missing";
  }
  if (!input.hostCapabilityObserved) {
    return "blocked_provider_host_capability_probe_not_observed";
  }
  if (!input.hostCapabilityMatches) {
    return "blocked_provider_host_capability_binding_mismatch";
  }
  if (input.validationSourceAccepted && input.platformContractDeclared && !input.platformSupported) {
    return "blocked_provider_helper_host_platform_mismatch";
  }
  if (input.validationSourceAccepted && input.selfTestRequired && !input.selfTestPassed) {
    return "blocked_provider_helper_host_self_test_failed";
  }
  if (input.validationSourceAccepted && input.helperHostReady && !input.hashesMatchRunner) {
    return "blocked_provider_helper_host_binary_mismatch";
  }
  return input.validationSourceAccepted && input.helperHostReady && input.hashesMatchRunner && input.platformSupported && (!input.selfTestRequired || input.selfTestPassed)
    ? "provider_helper_host_validated"
    : "blocked_provider_helper_host_not_validated";
}

function providerHelperReplayableNextAction(status: AgentAdapterOsIsolationProviderHelperExecutionStatus): string {
  if (status === "blocked_provider_runner_manifest_missing") {
    return "Prepare a ready service-owned provider-runner manifest before executing the provider helper.";
  }
  if (status === "blocked_provider_runner_binding_mismatch") {
    return "Run provider helper execution with the exact project, adapter, backend, provider, launch, and runner bound by the ready provider-runner manifest.";
  }
  if (status === "blocked_provider_helper_host_validation_missing") {
    return "Run service-owned provider-helper host validation and pass its append-only host_validation_id before executing the provider helper.";
  }
  if (status === "blocked_provider_helper_host_validation_not_validated") {
    return "Retry provider helper execution only after the referenced host-validation manifest is provider_helper_host_validated by a service-owned validator.";
  }
  if (status === "blocked_provider_helper_host_validation_binding_mismatch") {
    return "Bind provider helper execution to a host-validation manifest with the exact project, adapter, backend, provider, launch, runner, artifact hashes, and helper binary hash.";
  }
  if (status === "blocked_provider_helper_not_configured") {
    return "Configure a service-owned OS sandbox provider helper executable; caller-supplied command, argv, env, or success metadata cannot configure it.";
  }
  if (status === "blocked_provider_helper_binary_mismatch") {
    return "Reconfigure the service-owned provider helper so its executable hash matches the ready provider-runner manifest.";
  }
  if (status === "blocked_provider_helper_launch_failed") {
    return "Repair the service-owned provider helper launch path or host configuration, then retry provider helper execution.";
  }
  if (status === "blocked_provider_helper_execution_failed") {
    return "Inspect the provider helper stderr hash/output under service control, repair the helper or sandbox profile, then retry.";
  }
  return "Provider helper execution was attempted. Run a canonical service-owned OS-isolation collection probe before treating this as readiness evidence.";
}

function helperExecutionStatus(input: {
  runnerReady: boolean;
  runnerMatches: boolean;
  hostValidationPresent: boolean;
  hostValidationValidated: boolean;
  hostValidationMatches: boolean;
  configAccepted: boolean;
  helperHashMatches: boolean;
  launchFailed: boolean;
  exitCode: number | null;
}): AgentAdapterOsIsolationProviderHelperExecutionStatus {
  if (!input.runnerReady) {
    return "blocked_provider_runner_manifest_missing";
  }
  if (!input.runnerMatches) {
    return "blocked_provider_runner_binding_mismatch";
  }
  if (!input.hostValidationPresent) {
    return "blocked_provider_helper_host_validation_missing";
  }
  if (!input.hostValidationValidated) {
    return "blocked_provider_helper_host_validation_not_validated";
  }
  if (!input.hostValidationMatches) {
    return "blocked_provider_helper_host_validation_binding_mismatch";
  }
  if (!input.configAccepted) {
    return "blocked_provider_helper_not_configured";
  }
  if (!input.helperHashMatches) {
    return "blocked_provider_helper_binary_mismatch";
  }
  if (input.launchFailed) {
    return "blocked_provider_helper_launch_failed";
  }
  if (input.exitCode !== 0) {
    return "blocked_provider_helper_execution_failed";
  }
  return "provider_helper_execution_attempted";
}

function providerHelperHostValidationIsExecutable(
  hostValidationBundle: { hostValidation: AgentAdapterOsIsolationProviderHelperHostValidation } | null
): boolean {
  const hostValidation = hostValidationBundle?.hostValidation;
  return Boolean(
    hostValidation &&
      hostValidation.schema_version === "comath.agent_adapter_os_isolation_provider_helper_host_validation.v1" &&
      hostValidation.ok === true &&
      hostValidation.host_validation_status === "provider_helper_host_validated" &&
      hostValidation.provider_helper_host_ready === true &&
      hostValidation.provider_helper_host_validation.validation_source === "service_owned_provider_helper_host_validator" &&
      hostValidation.provider_helper_host_validation.hashes_match_provider_runner === true &&
      hostValidation.provider_helper_host_validation.platform_supported === true &&
      hostValidation.provider_helper_host_validation.shell === false &&
      hostValidation.provider_helper_host_validation.network_policy === "disabled" &&
      hostValidation.provider_helper_host_validation.command_override_allowed === false &&
      hostValidation.provider_helper_host_validation.environment_override_allowed === false &&
      hostValidation.provider_helper_host_validation.caller_supplied_success_allowed === false &&
      hostValidation.provider_host_capability_binding.bound === true &&
      hostValidation.provider_host_capability_binding.probe_source === "service_owned_provider_host_capability_probe" &&
      hostValidation.provider_host_capability_binding.provider_host_capability_available === true &&
      hostValidation.provider_helper_host_validation.host_capability_required === true &&
      hostValidation.provider_helper_host_validation.host_capability_bound === true &&
      hostValidation.proof_authority === "none" &&
      hostValidation.can_promote_claim === false &&
      hostValidation.can_certify_ga === false &&
      osEnforcedProviders.has(hostValidation.provider)
  );
}

function providerHelperHostValidationMatchesExecutionInput(input: {
  hostValidationBundle: {
    artifact: AgentAdapterOsIsolationProviderHelperHostValidationArtifact;
    hostValidation: AgentAdapterOsIsolationProviderHelperHostValidation;
  } | null;
  runnerBundle: { artifact: AgentAdapterOsIsolationProviderRunnerArtifact; runner: AgentAdapterOsIsolationProviderRunner } | null;
  launchBundle: { artifact: AgentAdapterOsIsolationLaunchArtifact; launch: AgentAdapterOsIsolationSandboxLaunch } | null;
  projectId: string;
  hostValidationId: string | null;
  runnerId: string;
  launchId: string;
  adapterId: AgentAdapterPackageId;
  backend: AgentAdapterBackend;
  provider: AgentAdapterOsIsolationProvider;
}): boolean {
  const hostValidation = input.hostValidationBundle?.hostValidation;
  const runnerArtifact = input.runnerBundle?.artifact;
  const runner = input.runnerBundle?.runner;
  const launchArtifact = input.launchBundle?.artifact;
  if (!hostValidation || !runnerArtifact || !runner || !launchArtifact || !input.hostValidationId) {
    return false;
  }
  const runnerBinarySha256 = runner.provider_runner_resolution.runner_binary_sha256;
  return Boolean(
    hostValidation.project_id === input.projectId &&
      hostValidation.host_validation_id === input.hostValidationId &&
      hostValidation.runner_id === input.runnerId &&
      hostValidation.launch_id === input.launchId &&
      hostValidation.adapter_id === input.adapterId &&
      hostValidation.backend === input.backend &&
      hostValidation.provider === input.provider &&
      hostValidation.runner_artifact?.path === runnerArtifact.path &&
      hostValidation.runner_artifact?.sha256 === runnerArtifact.sha256 &&
      hostValidation.runner_artifact?.size_bytes === runnerArtifact.size_bytes &&
      hostValidation.launch_artifact?.path === launchArtifact.path &&
      hostValidation.launch_artifact?.sha256 === launchArtifact.sha256 &&
      hostValidation.launch_artifact?.size_bytes === launchArtifact.size_bytes &&
      isSha256(hostValidation.provider_helper_host_validation.helper_binary_sha256) &&
      isSha256(hostValidation.provider_helper_host_validation.runner_binary_sha256) &&
      isSha256(runnerBinarySha256) &&
      hostValidation.provider_helper_host_validation.runner_binary_sha256.toLowerCase() ===
        runnerBinarySha256.toLowerCase() &&
      hostValidation.provider_helper_host_validation.helper_binary_sha256.toLowerCase() ===
        runnerBinarySha256.toLowerCase() &&
      Boolean(hostValidation.host_capability_probe_id) &&
      hostValidation.provider_host_capability_artifact?.kind === "agent_adapter_os_isolation_provider_host_capability_probe" &&
      isSha256(hostValidation.provider_host_capability_artifact.sha256) &&
      hostValidation.provider_host_capability_binding.bound === true &&
      hostValidation.provider_host_capability_binding.host_capability_probe_id === hostValidation.host_capability_probe_id &&
      hostValidation.provider_host_capability_binding.host_capability_status === "provider_host_capability_observed" &&
      hostValidation.provider_host_capability_binding.probe_source === "service_owned_provider_host_capability_probe" &&
      hostValidation.provider_host_capability_binding.provider_host_capability_available === true &&
      hostValidation.provider_host_capability_binding.provider === input.provider &&
      hostValidation.provider_host_capability_binding.platform_supported === true &&
      hostValidation.provider_helper_host_validation.host_capability_required === true &&
      hostValidation.provider_helper_host_validation.host_capability_bound === true
  );
}

function providerHelperExecutionIsCollectable(
  helperBundle: { helperExecution: AgentAdapterOsIsolationProviderHelperExecution } | null
): boolean {
  const helperExecution = helperBundle?.helperExecution;
  return Boolean(
    helperExecution &&
      helperExecution.schema_version === "comath.agent_adapter_os_isolation_provider_helper_execution.v1" &&
      helperExecution.ok === true &&
      helperExecution.helper_execution_status === "provider_helper_execution_attempted" &&
      helperExecution.provider_helper_attempted === true &&
      helperExecution.host_validation_artifact &&
      helperExecution.host_validation_artifact.kind === "agent_adapter_os_isolation_provider_helper_host_validation" &&
      isSha256(helperExecution.host_validation_artifact.sha256) &&
      helperExecution.provider_helper_host_validation_binding.bound === true &&
      helperExecution.provider_helper_host_validation_binding.validation_source === "service_owned_provider_helper_host_validator" &&
      helperExecution.provider_helper_host_validation_binding.host_validation_status === "provider_helper_host_validated" &&
      helperExecution.provider_helper_host_validation_binding.hashes_match_provider_runner === true &&
      helperExecution.provider_helper_host_validation_binding.platform_supported === true &&
      isSha256(helperExecution.provider_helper_host_validation_binding.helper_binary_sha256) &&
      isSha256(helperExecution.provider_helper_host_validation_binding.runner_binary_sha256) &&
      helperExecution.provider_helper_execution.helper_source === "service_owned_provider_helper_config" &&
      helperExecution.provider_helper_execution.helper_exit_code === 0 &&
      helperExecution.provider_helper_execution.shell === false &&
      helperExecution.provider_helper_execution.network_policy === "disabled" &&
      helperExecution.provider_helper_execution.command_override_allowed === false &&
      helperExecution.provider_helper_execution.environment_override_allowed === false &&
      helperExecution.provider_helper_execution.caller_supplied_success_allowed === false &&
      isSha256(helperExecution.provider_helper_execution.stdout_sha256) &&
      isSha256(helperExecution.provider_helper_execution.stderr_sha256) &&
      isSha256(helperExecution.provider_helper_execution.transcript_sha256) &&
      osEnforcedProviders.has(helperExecution.provider)
  );
}

function providerHelperExecutionRuntimeAttestationBound(
  helperExecution: AgentAdapterOsIsolationProviderHelperExecution | undefined
): boolean {
  return Boolean(
    helperExecution?.provider_helper_execution.runtime_attestation_source === "helper_stdout_json" &&
      helperExecution.provider_helper_execution.runtime_attestation_bound === true &&
      isSha256(helperExecution.provider_helper_execution.runtime_attestation_sha256)
  );
}

function providerHelperCollectionHostCapabilityBinding(input: {
  helperExecution: AgentAdapterOsIsolationProviderHelperExecution | undefined;
  hostValidationBundle: {
    artifact: AgentAdapterOsIsolationProviderHelperHostValidationArtifact;
    hostValidation: AgentAdapterOsIsolationProviderHelperHostValidation;
  } | null;
  hostCapabilityBundle: {
    artifact: AgentAdapterOsIsolationProviderHostCapabilityArtifact;
    hostCapability: AgentAdapterOsIsolationProviderHostCapabilityManifest;
  } | null;
}): {
  bound: boolean;
  host_validation_id: string | null;
  host_validation_path: string | null;
  host_validation_sha256: string | null;
  host_capability_probe_id: string | null;
  host_capability_probe_path: string | null;
  host_capability_probe_sha256: string | null;
  host_capability_status: AgentAdapterOsIsolationProviderHostCapabilityStatus | null;
} {
  const helperExecution = input.helperExecution;
  const hostValidation = input.hostValidationBundle?.hostValidation;
  const hostValidationArtifact = input.hostValidationBundle?.artifact;
  const hostCapabilityArtifact = input.hostCapabilityBundle?.artifact;
  const hostCapability = input.hostCapabilityBundle?.hostCapability;
  const hostValidationCapabilityArtifact = hostValidation?.provider_host_capability_artifact;
  const hostCapabilityProbeId = hostValidation?.host_capability_probe_id ?? null;
  const hostCapabilityStatus = hostValidation?.provider_host_capability_binding.host_capability_status ?? null;
  const hostValidationId = helperExecution?.host_validation_id ?? null;
  const hostCapabilityPath = typeof hostCapabilityProbeId === "string"
    ? providerHostCapabilityProbePath(hostCapabilityProbeId)
    : null;
  const bound = Boolean(
    helperExecution &&
      hostValidation &&
      hostValidationArtifact &&
      helperExecution.host_validation_artifact &&
      hostValidation.schema_version === "comath.agent_adapter_os_isolation_provider_helper_host_validation.v1" &&
      hostValidation.host_validation_id === helperExecution.host_validation_id &&
      hostValidation.project_id === helperExecution.project_id &&
      hostValidation.runner_id === helperExecution.runner_id &&
      hostValidation.launch_id === helperExecution.launch_id &&
      hostValidation.adapter_id === helperExecution.adapter_id &&
      hostValidation.backend === helperExecution.backend &&
      hostValidation.provider === helperExecution.provider &&
      helperExecution.host_validation_artifact.path === hostValidationArtifact.path &&
      helperExecution.host_validation_artifact.sha256 === hostValidationArtifact.sha256 &&
      helperExecution.host_validation_artifact.size_bytes === hostValidationArtifact.size_bytes &&
      hostValidation.provider_host_capability_binding.bound === true &&
      hostValidation.provider_host_capability_binding.probe_source === "service_owned_provider_host_capability_probe" &&
      hostValidation.provider_host_capability_binding.provider_host_capability_available === true &&
      hostValidation.provider_host_capability_binding.provider === helperExecution.provider &&
      hostValidation.provider_host_capability_binding.host_capability_probe_id === hostCapabilityProbeId &&
      hostCapabilityStatus === "provider_host_capability_observed" &&
      hostCapability &&
      hostCapability.schema_version === "comath.agent_adapter_os_isolation_provider_host_capability_probe.v1" &&
      hostCapability.host_capability_probe_id === hostCapabilityProbeId &&
      hostCapability.project_id === helperExecution.project_id &&
      hostCapability.adapter_id === helperExecution.adapter_id &&
      hostCapability.backend === helperExecution.backend &&
      hostCapability.provider === helperExecution.provider &&
      hostCapability.ok === true &&
      hostCapability.host_capability_status === hostCapabilityStatus &&
      hostCapability.provider_host_capability_available === true &&
      hostCapability.host_capability_probe_path === hostCapabilityPath &&
      hostCapability.provider_host_capability.probe_source === "service_owned_provider_host_capability_probe" &&
      hostCapability.provider_host_capability.provider_host_capability_available === true &&
      hostCapability.provider_host_capability.proof_authority === "none" &&
      hostCapability.proof_authority === "none" &&
      hostCapability.can_promote_claim === false &&
      hostCapability.can_certify_ga === false &&
      helperExecution.provider_helper_host_validation_binding.host_capability_probe_id === hostCapabilityProbeId &&
      helperExecution.provider_helper_host_validation_binding.host_capability_status === hostCapabilityStatus &&
      hostCapabilityArtifact?.kind === "agent_adapter_os_isolation_provider_host_capability_probe" &&
      hostCapabilityArtifact.path === hostCapabilityPath &&
      isSha256(hostCapabilityArtifact.sha256) &&
      hostValidationCapabilityArtifact?.kind === "agent_adapter_os_isolation_provider_host_capability_probe" &&
      hostValidationCapabilityArtifact.path === hostCapabilityArtifact.path &&
      hostValidationCapabilityArtifact.sha256 === hostCapabilityArtifact.sha256 &&
      hostValidationCapabilityArtifact.size_bytes === hostCapabilityArtifact.size_bytes
  );
  return {
    bound,
    host_validation_id: hostValidationId,
    host_validation_path: hostValidationArtifact?.path ?? helperExecution?.host_validation_artifact?.path ?? null,
    host_validation_sha256: hostValidationArtifact?.sha256 ?? helperExecution?.host_validation_artifact?.sha256 ?? null,
    host_capability_probe_id: hostCapabilityProbeId,
    host_capability_probe_path: hostCapabilityArtifact?.path ?? null,
    host_capability_probe_sha256: hostCapabilityArtifact?.sha256 ?? null,
    host_capability_status: hostCapabilityStatus
  };
}

function providerHelperExecutionMatchesCollectionInput(input: {
  helperBundle: { helperExecution: AgentAdapterOsIsolationProviderHelperExecution } | null;
  runnerBundle: { artifact: AgentAdapterOsIsolationProviderRunnerArtifact; runner: AgentAdapterOsIsolationProviderRunner } | null;
  launchBundle: { artifact: AgentAdapterOsIsolationLaunchArtifact; launch: AgentAdapterOsIsolationSandboxLaunch } | null;
  projectId: string;
  helperExecutionId: string;
  runnerId: string;
  launchId: string;
  adapterId: AgentAdapterPackageId;
  backend: AgentAdapterBackend;
  provider: AgentAdapterOsIsolationProvider;
}): boolean {
  const helperExecution = input.helperBundle?.helperExecution;
  if (!helperExecution) {
    return false;
  }
  const runnerArtifact = input.runnerBundle?.artifact;
  const launchArtifact = input.launchBundle?.artifact;
  return Boolean(
    helperExecution.project_id === input.projectId &&
      helperExecution.helper_execution_id === input.helperExecutionId &&
      helperExecution.runner_id === input.runnerId &&
      helperExecution.launch_id === input.launchId &&
      helperExecution.adapter_id === input.adapterId &&
      helperExecution.backend === input.backend &&
      helperExecution.provider === input.provider &&
      runnerArtifact &&
      launchArtifact &&
      helperExecution.runner_artifact?.path === runnerArtifact.path &&
      helperExecution.runner_artifact?.sha256 === runnerArtifact.sha256 &&
      helperExecution.runner_artifact?.size_bytes === runnerArtifact.size_bytes &&
      helperExecution.launch_artifact?.path === launchArtifact.path &&
      helperExecution.launch_artifact?.sha256 === launchArtifact.sha256 &&
      helperExecution.launch_artifact?.size_bytes === launchArtifact.size_bytes
  );
}

function providerHelperCollectionHashesMatchExecution(
  collection: AgentAdapterOsIsolationProviderHelperCollection | undefined,
  helperExecution: AgentAdapterOsIsolationProviderHelperExecution | undefined
): boolean {
  if (!collection || !helperExecution) {
    return false;
  }
  return Boolean(
    collection.probe_source === "service_owned_provider_helper_collection_probe" &&
      collection.adapter_process_exit_code === helperExecution.provider_helper_execution.helper_exit_code &&
      isSha256(collection.stdout_sha256) &&
      isSha256(collection.stderr_sha256) &&
      isSha256(collection.transcript_sha256) &&
      collection.stdout_sha256.toLowerCase() === helperExecution.provider_helper_execution.stdout_sha256?.toLowerCase() &&
      collection.stderr_sha256.toLowerCase() === helperExecution.provider_helper_execution.stderr_sha256?.toLowerCase() &&
      collection.transcript_sha256.toLowerCase() === helperExecution.provider_helper_execution.transcript_sha256?.toLowerCase()
  );
}

const providerHelperCollectionRequiredOsEnforcementFacts = [
  "collection_source",
  "process_isolation_enforced",
  "filesystem_scope_enforced",
  "network_isolation_enforced",
  "no_new_privileges",
  "escape_prevention",
  "adapter_process_exit_code"
] as const;

function providerHelperCollectionOsEnforcementCompleteness(input: {
  collection: AgentAdapterOsIsolationProviderHelperCollection | undefined;
  hashesMatch: boolean;
  collectionProbeInput?: AgentAdapterOsIsolationProviderHelperCollectionProbeInput | null;
}): { complete: boolean; incompleteFacts: string[] } {
  if (input.collection?.probe_source !== "service_owned_provider_helper_collection_probe" || !input.hashesMatch) {
    return { complete: false, incompleteFacts: [] };
  }
  const incompleteFacts: string[] = providerHelperCollectionRequiredOsEnforcementFacts.filter((fact) => {
    if (fact === "collection_source") {
      return input.collection?.collection_source !== "service_owned_os_probe";
    }
    if (fact === "adapter_process_exit_code") {
      return input.collection?.adapter_process_exit_code !== 0;
    }
    return input.collection?.[fact] !== true;
  });
  if (
    incompleteFacts.length === 0 &&
    !collectionProviderToolWitnessBound(input.collection, input.collectionProbeInput ?? undefined)
  ) {
    incompleteFacts.push("provider_tool_execution_witness");
  }
  if (
    incompleteFacts.length === 0 &&
    collectionProviderSpecificToolExecutionRequired(input.collection, input.collectionProbeInput ?? undefined) &&
    !collectionProviderSpecificToolExecutionBound(input.collection, input.collectionProbeInput ?? undefined)
  ) {
    incompleteFacts.push("provider_specific_tool_execution");
  }
  if (
    incompleteFacts.length === 0 &&
    !collectionProviderFamilyOsEnforcementWitnessBound(input.collection, input.collectionProbeInput ?? undefined)
  ) {
    incompleteFacts.push("provider_family_os_enforcement_witness");
  }
  if (
    incompleteFacts.length === 0 &&
    !collectionProviderFamilyExecutionProfileBound(input.collection, input.collectionProbeInput ?? undefined)
  ) {
    incompleteFacts.push("provider_family_execution_profile");
  }
  if (
    incompleteFacts.length === 0 &&
    !collectionProviderSpecificLiveProbeAttemptBound(input.collection, input.collectionProbeInput ?? undefined)
  ) {
    incompleteFacts.push("provider_specific_live_probe_attempt");
  }
  if (
    incompleteFacts.length === 0 &&
    !collectionProviderSpecificLiveProbeExecutionBound(input.collection, input.collectionProbeInput ?? undefined)
  ) {
    incompleteFacts.push("provider_specific_live_probe_execution");
  }
  if (
    incompleteFacts.length === 0 &&
    !collectionProviderControlPlaneExecutionWitnessBound(input.collection, input.collectionProbeInput ?? undefined)
  ) {
    incompleteFacts.push("provider_control_plane_execution_witness");
  }
  return { complete: incompleteFacts.length === 0, incompleteFacts };
}

function providerHelperCollectionForProbe(input: {
  collection: AgentAdapterOsIsolationProviderHelperCollection | undefined;
  helperExecution: AgentAdapterOsIsolationProviderHelperExecution | undefined;
  hashesMatch: boolean;
  collectionProbeInput?: AgentAdapterOsIsolationProviderHelperCollectionProbeInput | null;
}): AgentAdapterOsIsolationProbeCollection | undefined {
  if (input.collection?.probe_source !== "service_owned_provider_helper_collection_probe" || !input.hashesMatch) {
    return undefined;
  }
  const providerToolExecutionWitness =
    input.collectionProbeInput &&
    providerToolExecutionWitnessAccepted(
      input.collection.provider_tool_execution_witness,
      input.collectionProbeInput,
      input.collection.provider_tool_execution_witness_expectation ??
        input.collectionProbeInput.provider_tool_execution_witness_expectation
    )
      ? input.collection.provider_tool_execution_witness
      : undefined;
  const expectation =
    input.collection.provider_tool_execution_witness_expectation ??
      input.collectionProbeInput?.provider_tool_execution_witness_expectation;
  const providerSpecificToolRequired = providerSpecificToolExpectationRequired(expectation);
  const providerSpecificToolBound = collectionProviderSpecificToolExecutionBound(
    input.collection,
    input.collectionProbeInput ?? undefined
  );
  const providerSpecificToolExecutionHash = providerSpecificToolExecutionSha256(
    input.collection,
    input.collectionProbeInput ?? undefined
  );
  const providerFamilyOsEnforcementWitness =
    input.collectionProbeInput &&
    providerFamilyOsEnforcementWitnessAccepted(
      input.collection.provider_family_os_enforcement_witness,
      input.collectionProbeInput,
      input.collection.provider_tool_execution_witness_expectation ??
        input.collectionProbeInput.provider_tool_execution_witness_expectation
    )
      ? input.collection.provider_family_os_enforcement_witness
      : undefined;
  const providerFamilyOsEnforcementWitnessHash = providerFamilyOsEnforcementWitnessSha256(
    providerFamilyOsEnforcementWitness
  );
  const providerFamilyExecutionProfileBound = collectionProviderFamilyExecutionProfileBound(
    input.collection,
    input.collectionProbeInput ?? undefined
  );
  const providerFamilyExecutionProfileSha256 = providerFamilyExecutionProfileSha256ForCollection(
    input.collection,
    input.collectionProbeInput ?? undefined
  );
  const providerFamilyExecutionArgvSha256 = providerFamilyExecutionArgvSha256ForCollection(
    input.collection,
    input.collectionProbeInput ?? undefined
  );
  const providerFamilyExecutionKind = providerFamilyExecutionKindForCollection(
    input.collection,
    input.collectionProbeInput ?? undefined
  );
  const providerSpecificLiveProbeAttempt =
    input.collectionProbeInput &&
    providerSpecificLiveProbeAttemptAccepted(
      input.collection.provider_specific_live_probe_attempt,
      input.collectionProbeInput,
      input.collection.provider_tool_execution_witness_expectation ??
        input.collectionProbeInput.provider_tool_execution_witness_expectation
    )
      ? input.collection.provider_specific_live_probe_attempt
      : undefined;
  const providerSpecificLiveProbeAttemptSha256 = providerSpecificLiveProbeAttemptSha256ForCollection(
    input.collection,
    input.collectionProbeInput ?? undefined
  );
  const providerSpecificLiveProbeExecution =
    input.collectionProbeInput &&
    providerSpecificLiveProbeExecutionAccepted(
      input.collection.provider_specific_live_probe_execution,
      input.collectionProbeInput,
      input.collection.provider_tool_execution_witness_expectation ??
        input.collectionProbeInput.provider_tool_execution_witness_expectation
    )
      ? input.collection.provider_specific_live_probe_execution
      : undefined;
  const providerSpecificLiveProbeExecutionSha256 = providerSpecificLiveProbeExecutionSha256ForCollection(
    input.collection,
    input.collectionProbeInput ?? undefined
  );
  const providerControlPlaneExecutionWitness = providerControlPlaneExecutionWitnessForCollection(
    input.collection,
    input.collectionProbeInput ?? undefined
  );
  const providerControlPlaneExecutionWitnessSha256 = providerControlPlaneExecutionWitnessSha256ForCollection(
    input.collection,
    input.collectionProbeInput ?? undefined
  );
  return {
    collection_source: input.collection.collection_source,
    process_isolation_enforced: input.collection.process_isolation_enforced,
    filesystem_scope_enforced: input.collection.filesystem_scope_enforced,
    network_isolation_enforced: input.collection.network_isolation_enforced,
    no_new_privileges: input.collection.no_new_privileges,
    escape_prevention: input.collection.escape_prevention,
    adapter_process_exit_code: input.collection.adapter_process_exit_code,
    stdout_sha256: input.collection.stdout_sha256,
    stderr_sha256: input.collection.stderr_sha256,
    transcript_sha256: input.collection.transcript_sha256,
    provider_tool_execution_witness_required: true,
    provider_tool_execution_witness: providerToolExecutionWitness,
    provider_specific_tool_execution_required: providerSpecificToolRequired,
    provider_specific_tool_execution_bound: providerSpecificToolRequired ? providerSpecificToolBound : undefined,
    provider_specific_tool_execution_sha256: providerSpecificToolExecutionHash ?? undefined,
    provider_specific_tool_name: providerSpecificToolRequired ? expectation?.host_capability_tool_name : undefined,
    provider_specific_tool_sha256: providerSpecificToolRequired
      ? expectation?.host_capability_tool_sha256?.toLowerCase()
      : undefined,
    provider_family_os_enforcement_witness_required: true,
    provider_family_os_enforcement_witness: providerFamilyOsEnforcementWitness,
    provider_family_os_enforcement_witness_bound: Boolean(providerFamilyOsEnforcementWitnessHash),
    provider_family_os_enforcement_witness_sha256: providerFamilyOsEnforcementWitnessHash ?? undefined,
    provider_family_execution_profile_required: true,
    provider_family_execution_profile_bound: providerFamilyExecutionProfileBound,
    provider_family_execution_kind: providerFamilyExecutionKind ?? undefined,
    provider_family_execution_profile_sha256: providerFamilyExecutionProfileSha256 ?? undefined,
    provider_family_execution_argv_sha256: providerFamilyExecutionArgvSha256 ?? undefined,
    provider_specific_live_probe_attempt_required: true,
    provider_specific_live_probe_attempt: providerSpecificLiveProbeAttempt,
    provider_specific_live_probe_attempt_bound: Boolean(providerSpecificLiveProbeAttemptSha256),
    provider_specific_live_probe_attempt_sha256: providerSpecificLiveProbeAttemptSha256 ?? undefined,
    provider_specific_live_probe_execution_required: true,
    provider_specific_live_probe_execution: providerSpecificLiveProbeExecution,
    provider_specific_live_probe_execution_bound: Boolean(providerSpecificLiveProbeExecutionSha256),
    provider_specific_live_probe_execution_sha256: providerSpecificLiveProbeExecutionSha256 ?? undefined,
    provider_control_plane_execution_witness_required: true,
    provider_control_plane_execution_witness: providerControlPlaneExecutionWitness,
    provider_control_plane_execution_witness_bound: Boolean(providerControlPlaneExecutionWitnessSha256),
    provider_control_plane_execution_witness_sha256: providerControlPlaneExecutionWitnessSha256 ?? undefined,
    notes: sanitizeDiagnostics(input.collection.diagnostics).join(" ")
  };
}

function incompleteProviderHelperCollectionProbe(
  input: AgentAdapterOsIsolationProviderHelperCollectionProbeInput,
  diagnostics: string[]
): AgentAdapterOsIsolationProviderHelperCollection {
  return {
    probe_source: "service_owned_provider_helper_collection_probe",
    collection_source: "service_owned_os_probe",
    process_isolation_enforced: false,
    filesystem_scope_enforced: false,
    network_isolation_enforced: false,
    no_new_privileges: false,
    escape_prevention: false,
    adapter_process_exit_code: input.helper_exit_code,
    stdout_sha256: input.stdout_sha256,
    stderr_sha256: input.stderr_sha256,
    transcript_sha256: input.transcript_sha256,
    diagnostics
  };
}

function providerHelperCollectionProbeStdoutAccepted(
  parsed: Record<string, unknown> | null,
  input: AgentAdapterOsIsolationProviderHelperCollectionProbeInput
): boolean {
  return Boolean(
    parsed &&
      parsed.comath_provider_helper_collection_probe === true &&
      parsed.ok === true &&
      parsed.provider === input.provider &&
      parsed.network_policy === "disabled" &&
      parsed.proof_authority === "none" &&
      parsed.adapter === input.adapter_id &&
      parsed.backend === input.backend &&
      parsed.project_id === input.project_id &&
      parsed.collection_id === input.collection_id &&
      parsed.helper_execution_id === input.helper_execution_id &&
      parsed.runner_id === input.runner_id &&
      parsed.launch_id === input.launch_id &&
      parsed.helper_exit_code === input.helper_exit_code &&
      parsed.collection_source === "service_owned_os_probe" &&
      isSha256(parsed.stdout_sha256) &&
      isSha256(parsed.stderr_sha256) &&
      isSha256(parsed.transcript_sha256) &&
      parsed.stdout_sha256.toLowerCase() === input.stdout_sha256.toLowerCase() &&
      parsed.stderr_sha256.toLowerCase() === input.stderr_sha256.toLowerCase() &&
      parsed.transcript_sha256.toLowerCase() === input.transcript_sha256.toLowerCase() &&
      parsed.host_validation_id === input.host_validation_id &&
      parsed.host_validation_path === input.host_validation_path &&
      isSha256(parsed.host_validation_sha256) &&
      parsed.host_validation_sha256.toLowerCase() === input.host_validation_sha256.toLowerCase() &&
      parsed.host_capability_probe_id === input.host_capability_probe_id &&
      parsed.host_capability_probe_path === input.host_capability_probe_path &&
      isSha256(parsed.host_capability_probe_sha256) &&
      parsed.host_capability_probe_sha256.toLowerCase() === input.host_capability_probe_sha256.toLowerCase() &&
      parsed.host_capability_status === input.host_capability_status &&
      parsed.provider_host_capability_bound === true &&
      input.provider_host_capability_bound === true
  );
}

function providerSpecificLiveProbeStdoutAccepted(
  parsed: Record<string, unknown> | null,
  input: AgentAdapterOsIsolationProviderHelperCollectionProbeInput,
  expectation: AgentAdapterOsIsolationProviderToolExecutionWitnessExpectation
): boolean {
  return Boolean(
    parsed &&
      parsed.comath_provider_specific_live_os_probe === true &&
      parsed.ok === true &&
      parsed.provider === input.provider &&
      parsed.network_policy === "disabled" &&
      parsed.proof_authority === "none" &&
      parsed.adapter === input.adapter_id &&
      parsed.backend === input.backend &&
      parsed.project_id === input.project_id &&
      parsed.collection_id === input.collection_id &&
      parsed.helper_execution_id === input.helper_execution_id &&
      parsed.runner_id === input.runner_id &&
      parsed.launch_id === input.launch_id &&
      parsed.provider_family_execution_kind === expectation.provider_family_execution_kind &&
      isSha256(parsed.provider_family_execution_profile_sha256) &&
      parsed.provider_family_execution_profile_sha256.toLowerCase() ===
        expectation.provider_family_execution_profile_sha256?.toLowerCase() &&
      isSha256(parsed.provider_family_execution_argv_sha256) &&
      parsed.provider_family_execution_argv_sha256.toLowerCase() ===
        expectation.provider_family_execution_argv_sha256?.toLowerCase() &&
      isSha256(parsed.provider_tool_sha256) &&
      parsed.provider_tool_sha256.toLowerCase() === expectation.tool_sha256.toLowerCase() &&
      isSha256(parsed.provider_tool_profile_sha256) &&
      parsed.provider_tool_profile_sha256.toLowerCase() === expectation.profile_sha256.toLowerCase() &&
      isSha256(parsed.provider_tool_argv_sha256) &&
      parsed.provider_tool_argv_sha256.toLowerCase() === expectation.argv_sha256.toLowerCase() &&
      isSha256(parsed.transcript_sha256) &&
      parsed.transcript_sha256.toLowerCase() === input.transcript_sha256.toLowerCase() &&
      parsed.collection_source === "service_owned_os_probe" &&
      parsed.process_isolation_enforced === true &&
      parsed.filesystem_scope_enforced === true &&
      parsed.network_isolation_enforced === true &&
      parsed.no_new_privileges === true &&
      parsed.escape_prevention === true &&
      parsed.adapter_process_exit_code === 0 &&
      input.helper_exit_code === 0
  );
}

function providerSpecificLiveProbeExecutionCollectionBindingAccepted(
  parsed: Record<string, unknown> | null,
  execution: AgentAdapterOsIsolationProviderSpecificLiveProbeExecution | undefined,
  executionSha256: string | null
): boolean {
  return Boolean(
    parsed &&
      execution &&
      isSha256(executionSha256) &&
      parsed.provider_specific_live_probe_execution_bound === true &&
      parsed.provider_specific_live_probe_execution_id === execution.execution_id &&
      isSha256(parsed.provider_specific_live_probe_execution_sha256) &&
      parsed.provider_specific_live_probe_execution_sha256.toLowerCase() === executionSha256.toLowerCase() &&
      isSha256(parsed.provider_specific_live_probe_tool_sha256) &&
      parsed.provider_specific_live_probe_tool_sha256.toLowerCase() === execution.live_probe_tool_sha256.toLowerCase() &&
      isSha256(parsed.provider_specific_live_probe_argv_sha256) &&
      parsed.provider_specific_live_probe_argv_sha256.toLowerCase() === execution.live_probe_argv_sha256.toLowerCase() &&
      isSha256(parsed.provider_specific_live_probe_stdout_sha256) &&
      parsed.provider_specific_live_probe_stdout_sha256.toLowerCase() === execution.live_probe_stdout_sha256.toLowerCase() &&
      isSha256(parsed.provider_specific_live_probe_stderr_sha256) &&
      parsed.provider_specific_live_probe_stderr_sha256.toLowerCase() === execution.live_probe_stderr_sha256.toLowerCase() &&
      isSha256(parsed.provider_specific_live_probe_transcript_sha256) &&
      parsed.provider_specific_live_probe_transcript_sha256.toLowerCase() ===
        execution.live_probe_transcript_sha256.toLowerCase()
  );
}

function configuredProviderSpecificLiveProbeExecution(
  input: AgentAdapterOsIsolationProviderHelperCollectionProbeInput,
  expectation: AgentAdapterOsIsolationProviderToolExecutionWitnessExpectation
): {
  execution?: AgentAdapterOsIsolationProviderSpecificLiveProbeExecution;
  diagnostics: string[];
} {
  const providerEnvVar = providerSpecificLiveProbeProgramEnvVar(input.provider);
  const fallbackEnvVar = "COMATH_AGENT_ADAPTER_OSISO_PROVIDER_SPECIFIC_LIVE_PROBE";
  const configuredProgram = process.env[providerEnvVar] ?? process.env[fallbackEnvVar];
  const configuredEnvVar = process.env[providerEnvVar] !== undefined
    ? providerEnvVar
    : process.env[fallbackEnvVar] !== undefined
      ? fallbackEnvVar
      : null;
  if (!configuredProgram) {
    return {
      diagnostics: [
        `${providerEnvVar} or ${fallbackEnvVar} must configure a service-owned provider-specific live OS probe executable before complete collection evidence can satisfy readiness.`
      ]
    };
  }
  if (!providerFamilyExecutionProfileRequired(expectation)) {
    return {
      diagnostics: [
        "Provider-specific live OS probe execution requires a service-derived provider-family execution profile binding."
      ]
    };
  }
  if (!isAbsolute(configuredProgram)) {
    return {
      diagnostics: [`${configuredEnvVar ?? providerEnvVar} must be an absolute path.`]
    };
  }
  if (!existsSync(configuredProgram) || !statSync(configuredProgram).isFile()) {
    return {
      diagnostics: [`${configuredEnvVar ?? providerEnvVar} does not point to an existing file.`]
    };
  }
  const configuredArgs = configuredProviderSpecificLiveProbeArgsPrefix(input.provider);
  if (!configuredArgs.ok) {
    return { diagnostics: configuredArgs.diagnostics };
  }
  const liveProbeToolSha256 = sha256FileSync(configuredProgram).sha256;
  const fixedArgs = providerHelperCollectionProbeFixedArgs(input, expectation);
  const argv = [...configuredArgs.args, ...fixedArgs];
  const liveProbeArgvSha256 = providerToolExecutionArgvSha256(argv);
  const env = providerHelperEnv({
    projectId: input.project_id,
    runnerId: input.runner_id,
    launchId: input.launch_id,
    adapterId: input.adapter_id,
    backend: input.backend,
    provider: input.provider
  });
  const spawned = spawnSync(configuredProgram, argv, {
    cwd: input.project_root,
    env,
    encoding: "utf8",
    shell: false,
    timeout: 10_000
  });
  const stdout = typeof spawned.stdout === "string" ? spawned.stdout : "";
  const stderr = typeof spawned.stderr === "string" ? spawned.stderr : "";
  const exitCode = typeof spawned.status === "number" ? spawned.status : null;
  const spawnError = spawned.error as (Error & { code?: string }) | undefined;
  const timedOut = spawnError?.code === "ETIMEDOUT";
  const parsed = parseFirstJsonLine(stdout);
  const accepted =
    !spawnError &&
    exitCode === 0 &&
    providerSpecificLiveProbeStdoutAccepted(parsed, input, expectation);
  const stdoutSha256 = sha256Bytes(stdout);
  const stderrSha256 = sha256Bytes(stderr);
  const executionId = `LIVE-${sha256Text(canonicalJson({
    schema_version: "comath.agent_adapter_os_isolation_provider_specific_live_probe_execution_id.v1",
    provider: input.provider,
    collection_id: input.collection_id,
    helper_execution_id: input.helper_execution_id,
    runner_id: input.runner_id,
    launch_id: input.launch_id,
    live_probe_tool_sha256: liveProbeToolSha256,
    live_probe_argv_sha256: liveProbeArgvSha256
  })).slice(0, 32)}`;
  const liveProbeTranscriptSha256 = sha256Text(canonicalJson({
    schema_version: "comath.agent_adapter_os_isolation_provider_specific_live_probe_execution_transcript.v1",
    execution_id: executionId,
    provider: input.provider,
    collection_id: input.collection_id,
    helper_execution_id: input.helper_execution_id,
    runner_id: input.runner_id,
    launch_id: input.launch_id,
    live_probe_tool_sha256: liveProbeToolSha256,
    live_probe_argv_sha256: liveProbeArgvSha256,
    live_probe_stdout_sha256: stdoutSha256,
    live_probe_stderr_sha256: stderrSha256,
    exit_code: exitCode,
    signal: spawned.signal ?? null,
    shell: false,
    network_policy: "disabled",
    proof_authority: "none"
  }));
  const diagnostics = [
    `${configuredEnvVar ?? providerEnvVar} resolved to a service-owned provider-specific live OS probe executable.`,
    ...configuredArgs.diagnostics,
    accepted
      ? `Configured provider-specific live OS probe passed with exit_code=${exitCode}.`
      : `Configured provider-specific live OS probe failed binding validation with exit_code=${exitCode ?? "null"}.`,
    !accepted && parsed ? "Configured provider-specific live OS probe stdout did not bind the current provider-family execution profile and helper transcript." : undefined,
    !parsed ? "Configured provider-specific live OS probe did not emit a JSON stdout binding record." : undefined,
    timedOut ? "Configured provider-specific live OS probe timed out." : undefined,
    spawnError?.message ? sanitizeProbeText(spawnError.message) : undefined,
    stderr ? `live_probe_stderr_sha256=${stderrSha256}` : undefined
  ].filter((entry): entry is string => Boolean(entry));
  if (!accepted) {
    return { diagnostics };
  }
  const execution: AgentAdapterOsIsolationProviderSpecificLiveProbeExecution = {
    execution_source: "service_owned_provider_specific_live_os_probe",
    provider: input.provider,
    execution_id: executionId,
    collection_id: input.collection_id,
    helper_execution_id: input.helper_execution_id,
    runner_id: input.runner_id,
    launch_id: input.launch_id,
    provider_family_execution_kind: expectation.provider_family_execution_kind as AgentAdapterOsIsolationProviderFamilyExecutionKind,
    provider_family_execution_profile_sha256: expectation.provider_family_execution_profile_sha256 as string,
    provider_family_execution_argv_sha256: expectation.provider_family_execution_argv_sha256 as string,
    provider_tool_sha256: expectation.tool_sha256,
    provider_tool_profile_sha256: expectation.profile_sha256,
    provider_tool_argv_sha256: expectation.argv_sha256,
    transcript_sha256: input.transcript_sha256,
    live_probe_tool_sha256: liveProbeToolSha256,
    live_probe_argv_sha256: liveProbeArgvSha256,
    live_probe_stdout_sha256: stdoutSha256,
    live_probe_stderr_sha256: stderrSha256,
    live_probe_transcript_sha256: liveProbeTranscriptSha256,
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
  return { execution, diagnostics };
}

function configuredProviderHelperCollectionProbe(
  input: AgentAdapterOsIsolationProviderHelperCollectionProbeInput
): AgentAdapterOsIsolationProviderHelperCollection | null {
  const providerEnvVar = providerHelperCollectionProbeProgramEnvVar(input.provider);
  const fallbackEnvVar = "COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER_COLLECTION_PROBE";
  const configuredProgram = process.env[providerEnvVar] ?? process.env[fallbackEnvVar];
  const configuredEnvVar = process.env[providerEnvVar] !== undefined
    ? providerEnvVar
    : process.env[fallbackEnvVar] !== undefined
      ? fallbackEnvVar
      : null;
  if (!configuredProgram) {
    return null;
  }
  if (!isAbsolute(configuredProgram)) {
    return incompleteProviderHelperCollectionProbe(input, [
      `${configuredEnvVar ?? providerEnvVar} must be an absolute path.`
    ]);
  }
  if (!existsSync(configuredProgram) || !statSync(configuredProgram).isFile()) {
    return incompleteProviderHelperCollectionProbe(input, [
      `${configuredEnvVar ?? providerEnvVar} does not point to an existing file.`
    ]);
  }
  const configuredArgs = configuredProviderHelperCollectionProbeArgsPrefix(input.provider);
  if (!configuredArgs.ok) {
    return incompleteProviderHelperCollectionProbe(input, configuredArgs.diagnostics);
  }
  const providerSpecificTool = input.provider_specific_tool_name && isSha256(input.provider_specific_tool_sha256)
    ? { name: input.provider_specific_tool_name, sha256: input.provider_specific_tool_sha256.toLowerCase() }
    : null;
  if (!providerSpecificTool) {
    return incompleteProviderHelperCollectionProbe(input, [
      ...configuredArgs.diagnostics,
      "Configured provider-helper collection probe requires a service-observed provider-specific host tool from the current host-capability manifest."
    ]);
  }
  const toolSha256 = sha256FileSync(configuredProgram).sha256;
  const argsPrefixSha256 = configuredArgs.args.length > 0 ? sha256Text(canonicalJson(configuredArgs.args)) : null;
  const argvSha256 = providerToolExecutionArgvTemplateSha256(input, configuredArgs.args, providerSpecificTool);
  const expectationBase: AgentAdapterOsIsolationProviderToolExecutionWitnessExpectation = {
    tool_sha256: toolSha256,
    argv_sha256: argvSha256,
    host_capability_tool_name: providerSpecificTool.name,
    host_capability_tool_sha256: providerSpecificTool.sha256,
    profile_sha256: providerToolExecutionProfileSha256(input, {
      tool_source: "configured_provider_helper_collection_probe",
      tool_sha256: toolSha256,
      argv_sha256: argvSha256,
      args_prefix_sha256: argsPrefixSha256,
      provider_specific_tool: providerSpecificTool
    })
  };
  const expectation = withProviderFamilyExecutionExpectation(input, expectationBase, configuredArgs.args);
  const liveProbeExecutionResult = configuredProviderSpecificLiveProbeExecution(input, expectation);
  const liveProbeExecutionSha256 = providerSpecificLiveProbeExecutionSha256(
    liveProbeExecutionResult.execution
  );
  const fixedArgs = providerHelperCollectionProbeFixedArgs(input, expectation);
  const env = {
    ...providerHelperEnv({
      projectId: input.project_id,
      runnerId: input.runner_id,
      launchId: input.launch_id,
      adapterId: input.adapter_id,
      backend: input.backend,
      provider: input.provider
    }),
    ...(liveProbeExecutionResult.execution && isSha256(liveProbeExecutionSha256)
      ? {
          COMATH_PROVIDER_SPECIFIC_LIVE_PROBE_EXECUTION_ID:
            liveProbeExecutionResult.execution.execution_id,
          COMATH_PROVIDER_SPECIFIC_LIVE_PROBE_EXECUTION_SHA256:
            liveProbeExecutionSha256,
          COMATH_PROVIDER_SPECIFIC_LIVE_PROBE_TOOL_SHA256:
            liveProbeExecutionResult.execution.live_probe_tool_sha256,
          COMATH_PROVIDER_SPECIFIC_LIVE_PROBE_ARGV_SHA256:
            liveProbeExecutionResult.execution.live_probe_argv_sha256,
          COMATH_PROVIDER_SPECIFIC_LIVE_PROBE_STDOUT_SHA256:
            liveProbeExecutionResult.execution.live_probe_stdout_sha256,
          COMATH_PROVIDER_SPECIFIC_LIVE_PROBE_STDERR_SHA256:
            liveProbeExecutionResult.execution.live_probe_stderr_sha256,
          COMATH_PROVIDER_SPECIFIC_LIVE_PROBE_TRANSCRIPT_SHA256:
            liveProbeExecutionResult.execution.live_probe_transcript_sha256
        }
      : {})
  };
  const spawned = spawnSync(configuredProgram, [...configuredArgs.args, ...fixedArgs], {
    cwd: input.project_root,
    env,
    encoding: "utf8",
    shell: false,
    timeout: 10_000
  });
  const stdout = typeof spawned.stdout === "string" ? spawned.stdout : "";
  const stderr = typeof spawned.stderr === "string" ? spawned.stderr : "";
  const exitCode = typeof spawned.status === "number" ? spawned.status : null;
  const spawnError = spawned.error as (Error & { code?: string }) | undefined;
  const timedOut = spawnError?.code === "ETIMEDOUT";
  const parsed = parseFirstJsonLine(stdout);
  const witness = providerToolExecutionWitnessAccepted(parsed?.provider_tool_execution_witness, input, expectation)
    ? parsed.provider_tool_execution_witness
    : undefined;
  const invalidWitness = Boolean(parsed?.provider_tool_execution_witness) && !witness;
  const familyWitness = providerFamilyOsEnforcementWitnessAccepted(
    parsed?.provider_family_os_enforcement_witness,
    input,
    expectation
  )
    ? parsed?.provider_family_os_enforcement_witness
    : undefined;
  const invalidFamilyWitness = Boolean(parsed?.provider_family_os_enforcement_witness) && !familyWitness;
  const liveProbeAttempt = providerSpecificLiveProbeAttemptAccepted(
    parsed?.provider_specific_live_probe_attempt,
    input,
    expectation
  )
    ? parsed?.provider_specific_live_probe_attempt
    : undefined;
  const invalidLiveProbeAttempt = Boolean(parsed?.provider_specific_live_probe_attempt) && !liveProbeAttempt;
  const liveProbeExecutionCollectionBinding = providerSpecificLiveProbeExecutionCollectionBindingAccepted(
    parsed,
    liveProbeExecutionResult.execution,
    liveProbeExecutionSha256
  );
  const parsedControlPlaneWitness =
    parsed?.provider_control_plane_execution_witness as
      AgentAdapterOsIsolationProviderControlPlaneExecutionWitness | undefined;
  const parsedControlPlaneWitnessAccepted = providerControlPlaneExecutionWitnessAccepted(
    parsedControlPlaneWitness,
    input,
    expectation,
    liveProbeExecutionResult.execution
  );
  const serviceControlPlaneWitness = !parsed?.provider_control_plane_execution_witness &&
    liveProbeExecutionCollectionBinding
    ? serviceDerivedProviderControlPlaneExecutionWitness({
        collectionProbeInput: input,
        expectation,
        liveProbeExecution: liveProbeExecutionResult.execution,
        liveProbeExecutionSha256
      })
    : undefined;
  const controlPlaneWitness = parsedControlPlaneWitnessAccepted
    ? parsedControlPlaneWitness
    : serviceControlPlaneWitness;
  const invalidControlPlaneWitness = Boolean(parsed?.provider_control_plane_execution_witness) &&
    !parsedControlPlaneWitnessAccepted;
  const controlPlaneWitnessSha256 = providerControlPlaneExecutionWitnessSha256(controlPlaneWitness);
  const accepted =
    !spawnError &&
    exitCode === 0 &&
    !invalidWitness &&
    !invalidFamilyWitness &&
    providerHelperCollectionProbeStdoutAccepted(parsed, input);
  const baseDiagnostics = [
    `${configuredEnvVar ?? providerEnvVar} resolved to a service-owned provider-helper collection probe executable.`,
    ...configuredArgs.diagnostics,
    accepted
      ? `Configured provider-helper collection probe passed with exit_code=${exitCode}.`
      : `Configured provider-helper collection probe failed binding validation with exit_code=${exitCode ?? "null"}.`,
    ...liveProbeExecutionResult.diagnostics,
    invalidWitness ? "Configured provider-helper collection probe emitted an invalid provider-tool execution witness." : undefined,
    invalidFamilyWitness ? "Configured provider-helper collection probe emitted an invalid provider-family OS-enforcement witness." : undefined,
    invalidLiveProbeAttempt ? "Configured provider-helper collection probe emitted an invalid provider-specific live probe attempt." : undefined,
    invalidControlPlaneWitness ? "Configured provider-helper collection probe emitted an invalid provider control-plane execution witness." : undefined,
    !liveProbeExecutionCollectionBinding
      ? "Configured provider-helper collection probe did not bind the service-owned provider-specific live OS probe execution."
      : undefined,
    timedOut ? "Configured provider-helper collection probe timed out." : undefined,
    spawnError?.message ? sanitizeProbeText(spawnError.message) : undefined
  ].filter((entry): entry is string => Boolean(entry));
  if (!accepted || !parsed) {
    return incompleteProviderHelperCollectionProbe(input, baseDiagnostics);
  }
  return {
    probe_source: "service_owned_provider_helper_collection_probe",
    collection_source: "service_owned_os_probe",
    process_isolation_enforced: parsed.process_isolation_enforced === true,
    filesystem_scope_enforced: parsed.filesystem_scope_enforced === true,
    network_isolation_enforced: parsed.network_isolation_enforced === true,
    no_new_privileges: parsed.no_new_privileges === true,
    escape_prevention: parsed.escape_prevention === true,
    adapter_process_exit_code: input.helper_exit_code,
    stdout_sha256: input.stdout_sha256,
    stderr_sha256: input.stderr_sha256,
    transcript_sha256: input.transcript_sha256,
    provider_tool_execution_witness: witness,
    provider_family_os_enforcement_witness: familyWitness,
    provider_specific_live_probe_attempt: liveProbeAttempt,
    provider_specific_live_probe_execution_required: true,
    provider_specific_live_probe_execution: liveProbeExecutionCollectionBinding
      ? liveProbeExecutionResult.execution
      : undefined,
    provider_specific_live_probe_execution_bound: liveProbeExecutionCollectionBinding,
    provider_specific_live_probe_execution_sha256: liveProbeExecutionCollectionBinding
      ? liveProbeExecutionSha256 ?? undefined
      : undefined,
    provider_control_plane_execution_witness_required: true,
    provider_control_plane_execution_witness: controlPlaneWitness,
    provider_control_plane_execution_witness_bound: Boolean(controlPlaneWitnessSha256),
    provider_control_plane_execution_witness_sha256: controlPlaneWitnessSha256 ?? undefined,
    provider_tool_execution_witness_expectation: expectation,
    diagnostics: baseDiagnostics
  };
}

function bundledProviderHelperCollectionProbe(
  input: AgentAdapterOsIsolationProviderHelperCollectionProbeInput
): AgentAdapterOsIsolationProviderHelperCollection | null {
  const assetPath = bundledProviderHelperCollectionProbeAssetPath();
  if (!assetPath || !isAbsolute(process.execPath) || !existsSync(process.execPath) || !statSync(process.execPath).isFile()) {
    return null;
  }
  const toolSha256 = sha256FileSync(process.execPath).sha256;
  const bundledAssetSha256 = sha256FileSync(assetPath).sha256;
  const argvSha256 = providerToolExecutionArgvTemplateSha256(input, [assetPath]);
  const expectationBase: AgentAdapterOsIsolationProviderToolExecutionWitnessExpectation = {
    tool_sha256: toolSha256,
    argv_sha256: argvSha256,
    profile_sha256: providerToolExecutionProfileSha256(input, {
      tool_source: "bundled_provider_helper_collection_probe",
      tool_sha256: toolSha256,
      argv_sha256: argvSha256,
      args_prefix_sha256: sha256Text(canonicalJson([assetPath])),
      bundled_asset_sha256: bundledAssetSha256
    })
  };
  const expectation = withProviderFamilyExecutionExpectation(input, expectationBase, [assetPath]);
  const fixedArgs = providerHelperCollectionProbeFixedArgs(input, expectation);
  const env = providerHelperEnv({
    projectId: input.project_id,
    runnerId: input.runner_id,
    launchId: input.launch_id,
    adapterId: input.adapter_id,
    backend: input.backend,
    provider: input.provider
  });
  const spawned = spawnSync(process.execPath, [assetPath, ...fixedArgs], {
    cwd: input.project_root,
    env,
    encoding: "utf8",
    shell: false,
    timeout: 10_000
  });
  const stdout = typeof spawned.stdout === "string" ? spawned.stdout : "";
  const stderr = typeof spawned.stderr === "string" ? spawned.stderr : "";
  const exitCode = typeof spawned.status === "number" ? spawned.status : null;
  const spawnError = spawned.error as (Error & { code?: string }) | undefined;
  const timedOut = spawnError?.code === "ETIMEDOUT";
  const parsed = parseFirstJsonLine(stdout);
  const witness = providerToolExecutionWitnessAccepted(parsed?.provider_tool_execution_witness, input, expectation)
    ? parsed.provider_tool_execution_witness
    : undefined;
  const invalidWitness = Boolean(parsed?.provider_tool_execution_witness) && !witness;
  const familyWitness = providerFamilyOsEnforcementWitnessAccepted(
    parsed?.provider_family_os_enforcement_witness,
    input,
    expectation
  )
    ? parsed?.provider_family_os_enforcement_witness
    : undefined;
  const invalidFamilyWitness = Boolean(parsed?.provider_family_os_enforcement_witness) && !familyWitness;
  const liveProbeAttempt = providerSpecificLiveProbeAttemptAccepted(
    parsed?.provider_specific_live_probe_attempt,
    input,
    expectation
  )
    ? parsed?.provider_specific_live_probe_attempt
    : undefined;
  const invalidLiveProbeAttempt = Boolean(parsed?.provider_specific_live_probe_attempt) && !liveProbeAttempt;
  const accepted =
    !spawnError &&
    exitCode === 0 &&
    !invalidWitness &&
    !invalidFamilyWitness &&
    providerHelperCollectionProbeStdoutAccepted(parsed, input);
  const baseDiagnostics = [
    "Bundled CoMath provider-helper collection probe asset executed as a service-owned default collector.",
    accepted
      ? `Bundled provider-helper collection probe passed with exit_code=${exitCode}.`
      : `Bundled provider-helper collection probe failed binding validation with exit_code=${exitCode ?? "null"}.`,
    "Bundled collection output binds helper execution, host-validation, and host-capability hashes but records incomplete OS-enforcement facts.",
    invalidWitness ? "Bundled provider-helper collection probe emitted an invalid provider-tool execution witness." : undefined,
    invalidFamilyWitness ? "Bundled provider-helper collection probe emitted an invalid provider-family OS-enforcement witness." : undefined,
    invalidLiveProbeAttempt ? "Bundled provider-helper collection probe emitted an invalid provider-specific live probe attempt." : undefined,
    timedOut ? "Bundled provider-helper collection probe timed out." : undefined,
    spawnError?.message ? sanitizeProbeText(spawnError.message) : undefined,
    stderr ? `stderr_sha256=${sha256Bytes(stderr)}` : undefined
  ].filter((entry): entry is string => Boolean(entry));
  if (!accepted || !parsed) {
    return incompleteProviderHelperCollectionProbe(input, baseDiagnostics);
  }
  return {
    probe_source: "service_owned_provider_helper_collection_probe",
    collection_source: "service_owned_os_probe",
    process_isolation_enforced: parsed.process_isolation_enforced === true,
    filesystem_scope_enforced: parsed.filesystem_scope_enforced === true,
    network_isolation_enforced: parsed.network_isolation_enforced === true,
    no_new_privileges: parsed.no_new_privileges === true,
    escape_prevention: parsed.escape_prevention === true,
    adapter_process_exit_code: input.helper_exit_code,
    stdout_sha256: input.stdout_sha256,
    stderr_sha256: input.stderr_sha256,
    transcript_sha256: input.transcript_sha256,
    provider_tool_execution_witness: witness,
    provider_family_os_enforcement_witness: familyWitness,
    provider_specific_live_probe_attempt: liveProbeAttempt,
    provider_tool_execution_witness_expectation: expectation,
    diagnostics: baseDiagnostics
  };
}

function defaultProviderHelperCollectionProbe(
  input: AgentAdapterOsIsolationProviderHelperCollectionProbeInput
): AgentAdapterOsIsolationProviderHelperCollection {
  return configuredProviderHelperCollectionProbe(input) ?? bundledProviderHelperCollectionProbe(input) ?? incompleteProviderHelperCollectionProbe(input, [
    "Default provider-helper collection probe bound service-owned helper execution hashes only; provider-specific OS-enforcement probe is still required."
  ]);
}

function providerHelperCollectionStatus(input: {
  helperExecutionPresent: boolean;
  helperExecutionCollectable: boolean;
  runtimeAttestationBound: boolean;
  hostCapabilityBound: boolean;
  bindingMatches: boolean;
  collectionPresent: boolean;
  collectionSourceAccepted: boolean;
  hashesMatch: boolean;
  providerToolWitnessBound: boolean;
  providerSpecificToolExecutionRequired: boolean;
  providerSpecificToolExecutionBound: boolean;
  onlyProviderToolWitnessMissing: boolean;
  onlyProviderFamilyOsEnforcementWitnessMissing: boolean;
  onlyProviderFamilyExecutionProfileMissing: boolean;
  onlyProviderSpecificLiveProbeAttemptMissing: boolean;
  onlyProviderSpecificLiveProbeExecutionMissing: boolean;
  onlyProviderControlPlaneExecutionWitnessMissing: boolean;
  osEnforcementComplete: boolean;
  probe: AgentAdapterOsIsolationProbe | null;
}): AgentAdapterOsIsolationProviderHelperCollectionStatus {
  if (!input.helperExecutionPresent) {
    return "blocked_provider_helper_execution_missing";
  }
  if (!input.bindingMatches) {
    return "blocked_provider_helper_execution_binding_mismatch";
  }
  if (!input.helperExecutionCollectable) {
    return "blocked_provider_helper_execution_not_attempted";
  }
  if (!input.runtimeAttestationBound) {
    return "blocked_provider_helper_runtime_attestation_missing";
  }
  if (!input.hostCapabilityBound) {
    return "blocked_provider_helper_collection_host_capability_binding_mismatch";
  }
  if (input.collectionPresent && input.collectionSourceAccepted && !input.hashesMatch) {
    return "blocked_provider_helper_collection_hash_mismatch";
  }
  if (
    input.collectionPresent &&
    input.collectionSourceAccepted &&
    input.hashesMatch &&
      !input.providerToolWitnessBound &&
      input.onlyProviderToolWitnessMissing
  ) {
    return "blocked_provider_helper_collection_provider_tool_witness_missing";
  }
  if (
    input.collectionPresent &&
    input.collectionSourceAccepted &&
    input.hashesMatch &&
    input.providerToolWitnessBound &&
    input.providerSpecificToolExecutionRequired &&
    !input.providerSpecificToolExecutionBound
  ) {
    return "blocked_provider_helper_collection_provider_specific_tool_binding_missing";
  }
  if (
    input.collectionPresent &&
    input.collectionSourceAccepted &&
    input.hashesMatch &&
    input.providerToolWitnessBound &&
    input.providerSpecificToolExecutionBound &&
    input.onlyProviderFamilyOsEnforcementWitnessMissing
  ) {
    return "blocked_provider_helper_collection_provider_family_os_enforcement_witness_missing";
  }
  if (
    input.collectionPresent &&
    input.collectionSourceAccepted &&
    input.hashesMatch &&
    input.providerToolWitnessBound &&
    input.providerSpecificToolExecutionBound &&
    input.onlyProviderFamilyExecutionProfileMissing
  ) {
    return "blocked_provider_helper_collection_provider_family_execution_profile_missing";
  }
  if (
    input.collectionPresent &&
    input.collectionSourceAccepted &&
    input.hashesMatch &&
    input.providerToolWitnessBound &&
    input.providerSpecificToolExecutionBound &&
    input.onlyProviderSpecificLiveProbeAttemptMissing
  ) {
    return "blocked_provider_helper_collection_provider_specific_live_probe_attempt_missing";
  }
  if (
    input.collectionPresent &&
    input.collectionSourceAccepted &&
    input.hashesMatch &&
    input.providerToolWitnessBound &&
    input.providerSpecificToolExecutionBound &&
    input.onlyProviderSpecificLiveProbeExecutionMissing
  ) {
    return "blocked_provider_helper_collection_provider_specific_live_probe_execution_missing";
  }
  if (
    input.collectionPresent &&
    input.collectionSourceAccepted &&
    input.hashesMatch &&
    input.providerToolWitnessBound &&
    input.providerSpecificToolExecutionBound &&
    input.onlyProviderControlPlaneExecutionWitnessMissing
  ) {
    return "blocked_provider_helper_collection_provider_control_plane_execution_witness_missing";
  }
  if (input.collectionPresent && input.collectionSourceAccepted && input.hashesMatch && !input.osEnforcementComplete) {
    return "blocked_provider_helper_collection_incomplete_os_enforcement";
  }
  return input.probe?.ok === true
    ? "provider_helper_os_evidence_collected"
    : "blocked_provider_helper_collection_not_collected";
}

function providerHelperCollectionReplayableNextAction(
  status: AgentAdapterOsIsolationProviderHelperCollectionStatus
): string {
  if (status === "blocked_provider_helper_execution_missing") {
    return "Run a service-owned provider-helper execution attempt before collecting provider-helper OS-isolation evidence.";
  }
  if (status === "blocked_provider_helper_execution_binding_mismatch") {
    return "Collect provider-helper evidence with the exact project, adapter, backend, provider, launch, runner, and helper execution bindings.";
  }
  if (status === "blocked_provider_helper_execution_not_attempted") {
    return "Repair the service-owned provider helper execution until it records a successful attempted helper process with hash-bound stdout/stderr/transcript material.";
  }
  if (status === "blocked_provider_helper_runtime_attestation_missing") {
    return "Repair the service-owned provider helper so its runtime stdout attestation binds the current project, helper execution, runner, launch, adapter, backend, provider, network policy, and proof-authority boundary.";
  }
  if (status === "blocked_provider_helper_collection_host_capability_binding_mismatch") {
    return "Re-run the provider host-capability probe, provider-helper host validation, and helper execution chain so collection binds the current host-validation and provider host-capability artifacts before any configured OS-enforcement probe is accepted.";
  }
  if (status === "blocked_provider_helper_collection_hash_mismatch") {
    return "Re-run the service-owned provider-helper collection probe so exit/stdout/stderr/transcript hashes exactly match the helper execution manifest.";
  }
  if (status === "blocked_provider_helper_collection_provider_tool_witness_missing") {
    return "Re-run the provider-specific service-owned collection probe so complete OS-enforcement facts are bound to an executed provider tool witness with tool/profile/argv/transcript hashes.";
  }
  if (status === "blocked_provider_helper_collection_provider_specific_tool_binding_missing") {
    return "Re-run the provider-specific service-owned collection probe so its executed-tool witness also binds the current host-capability provider tool name and hash.";
  }
  if (status === "blocked_provider_helper_collection_provider_family_os_enforcement_witness_missing") {
    return "Re-run the provider-specific service-owned collection probe so complete OS-enforcement facts are bound to a provider-family OS-enforcement witness with current helper, host-capability, tool, transcript, and proof-authority bindings.";
  }
  if (status === "blocked_provider_helper_collection_provider_family_execution_profile_missing") {
    return "Re-run the provider-specific service-owned collection probe so its provider-family OS-enforcement witness binds the service-derived family execution kind, profile hash, and argv hash for the current provider family.";
  }
  if (status === "blocked_provider_helper_collection_provider_specific_live_probe_attempt_missing") {
    return "Re-run the provider-specific service-owned collection probe so complete OS-enforcement facts bind a provider-specific live probe attempt for the current provider family execution profile.";
  }
  if (status === "blocked_provider_helper_collection_provider_specific_live_probe_execution_missing") {
    return "Configure and run a service-owned provider-specific live OS probe executable so complete collection facts bind an executed live probe transcript for the current provider family execution profile.";
  }
  if (status === "blocked_provider_helper_collection_provider_control_plane_execution_witness_missing") {
    return "Re-run the provider-specific service-owned collection probe so complete OS-enforcement facts bind a provider control-plane execution witness to the current live probe transcript and provider family execution profile.";
  }
  if (status === "blocked_provider_helper_collection_incomplete_os_enforcement") {
    return "Re-run the service-owned provider-helper collection probe with complete OS-enforcement facts: process, filesystem, network, no-new-privileges, escape-prevention, service-owned source, and helper exit code.";
  }
  return "Run a service-owned provider-helper collection probe that records complete OS-enforcement checks and writes canonical probe/evidence artifacts.";
}

function collectionBoolean(
  collection: AgentAdapterOsIsolationProbeCollection | undefined,
  key:
    | "process_isolation_enforced"
    | "filesystem_scope_enforced"
    | "network_isolation_enforced"
    | "no_new_privileges"
    | "escape_prevention",
  collected: boolean
): boolean {
  return collected ? true : collection?.collection_source === "service_owned_os_probe" ? collection[key] === true : false;
}

function collectedEvidenceDetails(
  collection: AgentAdapterOsIsolationProbeCollection | undefined,
  collected: boolean
): Pick<AgentAdapterOsIsolationProbe["evidence"],
  | "collection_source"
  | "adapter_process_exit_code"
  | "stdout_sha256"
  | "stderr_sha256"
  | "transcript_sha256"
  | "provider_tool_execution_witness_required"
  | "provider_tool_execution_witness_bound"
  | "provider_tool_execution_witness_sha256"
  | "provider_specific_tool_execution_required"
  | "provider_specific_tool_execution_bound"
  | "provider_specific_tool_execution_sha256"
  | "provider_specific_tool_name"
  | "provider_specific_tool_sha256"
  | "provider_family_os_enforcement_witness_required"
  | "provider_family_os_enforcement_witness_bound"
  | "provider_family_os_enforcement_witness_sha256"
  | "provider_family_execution_profile_required"
  | "provider_family_execution_profile_bound"
  | "provider_family_execution_kind"
  | "provider_family_execution_profile_sha256"
  | "provider_family_execution_argv_sha256"
  | "provider_specific_live_probe_attempt_required"
  | "provider_specific_live_probe_attempt_bound"
  | "provider_specific_live_probe_attempt_sha256"
  | "provider_specific_live_probe_execution_required"
  | "provider_specific_live_probe_execution_bound"
  | "provider_specific_live_probe_execution_sha256"
  | "provider_control_plane_execution_witness_required"
  | "provider_control_plane_execution_witness_bound"
  | "provider_control_plane_execution_witness_sha256"
> {
  if (!collection || collection.collection_source !== "service_owned_os_probe") {
    return {};
  }
  const witnessSha256 = providerToolExecutionWitnessSha256(collection.provider_tool_execution_witness);
  const familyWitnessSha256 = providerFamilyOsEnforcementWitnessSha256ForCollection(collection);
  const familyExecutionProfileSha256 = providerFamilyExecutionProfileSha256ForCollection(collection);
  const familyExecutionArgvSha256 = providerFamilyExecutionArgvSha256ForCollection(collection);
  const familyExecutionKind = providerFamilyExecutionKindForCollection(collection);
  const liveProbeAttemptSha256 = providerSpecificLiveProbeAttemptSha256ForCollection(collection);
  const liveProbeExecutionSha256 = providerSpecificLiveProbeExecutionSha256ForCollection(collection);
  const controlPlaneWitnessSha256 =
    providerControlPlaneExecutionWitnessSha256ForCollection(collection) ??
    (
      collection.provider_control_plane_execution_witness_required === true &&
      collection.provider_control_plane_execution_witness_bound === true &&
      isSha256(collection.provider_control_plane_execution_witness_sha256)
        ? collection.provider_control_plane_execution_witness_sha256.toLowerCase()
        : null
    );
  return {
    collection_source: "service_owned_os_probe",
    adapter_process_exit_code: collected || typeof collection.adapter_process_exit_code === "number"
      ? collection.adapter_process_exit_code
      : undefined,
    stdout_sha256: isSha256(collection.stdout_sha256) ? collection.stdout_sha256.toLowerCase() : undefined,
    stderr_sha256: isSha256(collection.stderr_sha256) ? collection.stderr_sha256.toLowerCase() : undefined,
    transcript_sha256: isSha256(collection.transcript_sha256) ? collection.transcript_sha256.toLowerCase() : undefined,
    provider_tool_execution_witness_required: collection.provider_tool_execution_witness_required === true ? true : undefined,
    provider_tool_execution_witness_bound: Boolean(witnessSha256),
    provider_tool_execution_witness_sha256: witnessSha256 ?? undefined,
    provider_specific_tool_execution_required: collection.provider_specific_tool_execution_required === true ? true : undefined,
    provider_specific_tool_execution_bound:
      collection.provider_specific_tool_execution_required === true
        ? collection.provider_specific_tool_execution_bound === true
        : undefined,
    provider_specific_tool_execution_sha256: isSha256(collection.provider_specific_tool_execution_sha256)
      ? collection.provider_specific_tool_execution_sha256.toLowerCase()
      : undefined,
    provider_specific_tool_name: isProviderToolName(collection.provider_specific_tool_name)
      ? collection.provider_specific_tool_name
      : undefined,
    provider_specific_tool_sha256: isSha256(collection.provider_specific_tool_sha256)
      ? collection.provider_specific_tool_sha256.toLowerCase()
      : undefined,
    provider_family_os_enforcement_witness_required:
      collection.provider_family_os_enforcement_witness_required === true ? true : undefined,
    provider_family_os_enforcement_witness_bound: Boolean(familyWitnessSha256),
    provider_family_os_enforcement_witness_sha256: familyWitnessSha256 ?? undefined,
    provider_family_execution_profile_required:
      collection.provider_family_execution_profile_required === true ? true : undefined,
    provider_family_execution_profile_bound: Boolean(familyExecutionProfileSha256),
    provider_family_execution_kind: familyExecutionKind ?? undefined,
    provider_family_execution_profile_sha256: familyExecutionProfileSha256 ?? undefined,
    provider_family_execution_argv_sha256: familyExecutionArgvSha256 ?? undefined,
    provider_specific_live_probe_attempt_required:
      collection.provider_specific_live_probe_attempt_required === true ? true : undefined,
    provider_specific_live_probe_attempt_bound: Boolean(liveProbeAttemptSha256),
    provider_specific_live_probe_attempt_sha256: liveProbeAttemptSha256 ?? undefined,
    provider_specific_live_probe_execution_required:
      collection.provider_specific_live_probe_execution_required === true ? true : undefined,
    provider_specific_live_probe_execution_bound:
      collection.provider_specific_live_probe_execution_required === true
        ? Boolean(liveProbeExecutionSha256)
        : undefined,
    provider_specific_live_probe_execution_sha256: liveProbeExecutionSha256 ?? undefined,
    provider_control_plane_execution_witness_required:
      collection.provider_control_plane_execution_witness_required === true ? true : undefined,
    provider_control_plane_execution_witness_bound: Boolean(controlPlaneWitnessSha256),
    provider_control_plane_execution_witness_sha256: controlPlaneWitnessSha256 ?? undefined
  };
}

export function defaultAgentAdapterOsIsolationMetadata(): AgentAdapterOsIsolationMetadata {
  return {
    required_for_ga: true,
    os_enforced: false,
    current_boundary: "process_boundary_only",
    evidence_required: true,
    proof_authority: "none"
  };
}

export function prepareAgentAdapterOsIsolationSandboxLaunch(
  projectRoot: string,
  input: AgentAdapterOsIsolationSandboxLaunchInput,
  options: AgentAdapterOsIsolationSandboxLaunchOptions = {}
): AgentAdapterOsIsolationSandboxLaunch {
  getAgentAdapterPackage(input.adapter_id);
  const launchId = assertSandboxLaunchId(input.launch_id);
  const backend = assertBackend(input.backend);
  const path = sandboxLaunchPath(launchId);
  const absoluteLaunchPath = assertPathAllowed(projectRoot, path, { purpose: "runtime-write" });
  if (existsSync(absoluteLaunchPath)) {
    throw new ComathError("adapter OS-isolation sandbox launch already exists", {
      statusCode: 409,
      code: "AGENT_ADAPTER_OS_ISOLATION_SANDBOX_LAUNCH_ALREADY_EXISTS"
    });
  }

  const { requestedProvider, knownProvider } = normalizeRequestedProvider(input.requested_provider);
  const preflight = options.launcher_probe?.({
    project_root: projectRoot,
    project_id: input.project_id,
    launch_id: launchId,
    adapter_id: input.adapter_id,
    backend,
    requested_provider: requestedProvider,
    provider: knownProvider,
    platform: input.launcher_environment?.platform
  }) ?? undefined;
  const ready = isServiceOwnedLauncherPreflight({ knownProvider, preflight });
  const classified = classifySandboxLaunch({ knownProvider, ready });
  const status = classified.status;
  const provider = classified.provider;
  const diagnostics = [
    input.launcher_environment?.platform ? `platform=${sanitizeProbeText(input.launcher_environment.platform)}` : undefined,
    input.launcher_environment?.notes ? sanitizeProbeText(input.launcher_environment.notes) : undefined,
    ...sanitizeDiagnostics(preflight?.diagnostics),
    ready
      ? "Service-owned provider launcher preflight is ready for a future OS-sandbox execution probe."
      : "No service-owned provider launcher preflight was accepted."
  ].filter((entry): entry is string => Boolean(entry));
  const launch: AgentAdapterOsIsolationSandboxLaunch = {
    schema_version: "comath.agent_adapter_os_isolation_sandbox_launch.v1",
    launch_id: launchId,
    project_id: input.project_id,
    adapter_id: input.adapter_id,
    backend,
    created_at: new Date().toISOString(),
    ok: ready,
    launch_status: status,
    requested_provider: sanitizeProbeText(requestedProvider) || "unknown",
    provider,
    sandbox_launch_ready: ready,
    launch_path: path,
    provider_command_contract: {
      provider,
      shell: false,
      network_policy: "disabled",
      no_new_privileges_required: true,
      command_override_allowed: false,
      caller_supplied_success_allowed: false,
      proof_authority: "none"
    },
    launcher_preflight: {
      probe_source: ready ? "service_owned_launcher_preflight" : "missing",
      provider_available: ready,
      launcher_binary_sha256: ready && isSha256(preflight?.launcher_binary_sha256)
        ? preflight.launcher_binary_sha256.toLowerCase()
        : null,
      launcher_version: ready && typeof preflight?.launcher_version === "string"
        ? sanitizeProbeText(preflight.launcher_version)
        : null,
      diagnostics
    },
    adapter_execution_isolation: {
      required_for_ga: true,
      current_boundary: "process_boundary_only",
      os_enforced: false,
      provider,
      claims_runtime_enforcement: false,
      proof_authority: "none"
    },
    blocker_certificate: ready
      ? null
      : {
          blocker_code: status,
          replayable_next_action: "Configure a supported OS sandbox provider and run a service-owned launcher preflight before collecting OS-enforced adapter execution evidence.",
          proof_authority: "none"
        },
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  };

  mkdirSync(dirname(absoluteLaunchPath), { recursive: true });
  writeFileSync(absoluteLaunchPath, canonicalJson(launch), "utf8");
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "agent_adapter.os_isolation_sandbox_launch_preflighted",
    actor: sanitizeReviewText(input.actor),
    target_id: input.project_id,
    payload: {
      launch_id: launchId,
      adapter_id: input.adapter_id,
      backend,
      ok: ready,
      launch_status: status,
      provider,
      sandbox_launch_ready: ready,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  });
  return launch;
}

export function probeAgentAdapterOsIsolationProviderHostCapability(
  projectRoot: string,
  input: AgentAdapterOsIsolationProviderHostCapabilityProbeRouteInput,
  options: AgentAdapterOsIsolationProviderHostCapabilityOptions = {}
): AgentAdapterOsIsolationProviderHostCapabilityManifest {
  getAgentAdapterPackage(input.adapter_id);
  const hostCapabilityProbeId = assertProviderHostCapabilityProbeId(input.host_capability_probe_id);
  const backend = assertBackend(input.backend);
  const path = providerHostCapabilityProbePath(hostCapabilityProbeId);
  const absoluteProbePath = assertPathAllowed(projectRoot, path, { purpose: "runtime-write" });
  if (existsSync(absoluteProbePath)) {
    throw new ComathError("adapter OS-isolation provider host capability probe already exists", {
      statusCode: 409,
      code: "AGENT_ADAPTER_OS_ISOLATION_PROVIDER_HOST_CAPABILITY_PROBE_ALREADY_EXISTS"
    });
  }

  const { requestedProvider, knownProvider } = normalizeRequestedProvider(input.requested_provider);
  const provider = knownProvider ?? "unknown";
  const serviceObservedPlatform = process.platform;
  const supportedPlatforms = providerHelperSupportedPlatforms(provider);
  const platformSupported = Boolean(knownProvider && supportedPlatforms.includes(serviceObservedPlatform));
  const providerHostCapabilityProbe = options.provider_host_capability_probe ?? defaultProviderHostCapabilityProbe;
  const probe = providerHostCapabilityProbe({
    project_root: projectRoot,
    project_id: input.project_id,
    host_capability_probe_id: hostCapabilityProbeId,
    adapter_id: input.adapter_id,
    backend,
    requested_provider: requestedProvider,
    provider: knownProvider,
    platform: serviceObservedPlatform
  }) ?? undefined;
  const sourceAccepted = probe?.probe_source === "service_owned_provider_host_capability_probe";
  const providerAvailable = sourceAccepted && probe.provider_host_capability_available === true;
  const status = providerHostCapabilityStatus({
    knownProvider,
    sourceAccepted,
    providerAvailable,
    platformSupported
  });
  const ok = status === "provider_host_capability_observed";
  const diagnostics = [
    input.host_capability_environment?.platform
      ? `caller_platform_ignored=${sanitizeProbeText(input.host_capability_environment.platform)}`
      : undefined,
    input.host_capability_environment?.notes ? sanitizeProbeText(input.host_capability_environment.notes) : undefined,
    ...sanitizeDiagnostics(probe?.diagnostics),
    ok
      ? "Service-owned provider host capability probe recorded host capability facts for future helper validation planning."
      : "No service-owned provider host capability probe was accepted as provider-helper readiness or OS-enforcement evidence."
  ].filter((entry): entry is string => Boolean(entry));
  const manifest: AgentAdapterOsIsolationProviderHostCapabilityManifest = {
    schema_version: "comath.agent_adapter_os_isolation_provider_host_capability_probe.v1",
    host_capability_probe_id: hostCapabilityProbeId,
    project_id: input.project_id,
    adapter_id: input.adapter_id,
    backend,
    created_at: new Date().toISOString(),
    ok,
    host_capability_status: status,
    requested_provider: sanitizeProbeText(requestedProvider) || "unknown",
    provider,
    provider_host_capability_available: ok,
    host_capability_probe_path: path,
    provider_host_capability: {
      probe_source: sourceAccepted ? "service_owned_provider_host_capability_probe" : "missing",
      provider_host_capability_available: ok,
      platform: serviceObservedPlatform,
      platform_supported: platformSupported,
      capability_facts: sourceAccepted ? sanitizeCapabilityFacts(probe?.capability_facts) : [],
      required_tools: sourceAccepted ? sanitizeCapabilityTools(probe?.required_tools) : [],
      kernel_features: sourceAccepted ? sanitizeKernelFeatures(probe?.kernel_features) : [],
      diagnostics,
      caller_supplied_success_allowed: false,
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
    blocker_certificate: ok
      ? null
      : {
          blocker_code: status,
          replayable_next_action: providerHostCapabilityReplayableNextAction(status),
          proof_authority: "none"
        },
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  };

  mkdirSync(dirname(absoluteProbePath), { recursive: true });
  writeFileSync(absoluteProbePath, canonicalJson(manifest), "utf8");
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "agent_adapter.os_isolation_provider_host_capability_probed",
    actor: sanitizeReviewText(input.actor),
    target_id: input.project_id,
    payload: {
      host_capability_probe_id: hostCapabilityProbeId,
      adapter_id: input.adapter_id,
      backend,
      ok,
      host_capability_status: status,
      provider,
      provider_host_capability_available: ok,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  });
  return manifest;
}

export function prepareAgentAdapterOsIsolationProviderRunner(
  projectRoot: string,
  input: AgentAdapterOsIsolationProviderRunnerInput,
  options: AgentAdapterOsIsolationProviderRunnerOptions = {}
): AgentAdapterOsIsolationProviderRunner {
  getAgentAdapterPackage(input.adapter_id);
  const runnerId = assertProviderRunnerId(input.runner_id);
  const backend = assertBackend(input.backend);
  const path = providerRunnerPath(runnerId);
  const absoluteRunnerPath = assertPathAllowed(projectRoot, path, { purpose: "runtime-write" });
  if (existsSync(absoluteRunnerPath)) {
    throw new ComathError("adapter OS-isolation provider runner already exists", {
      statusCode: 409,
      code: "AGENT_ADAPTER_OS_ISOLATION_PROVIDER_RUNNER_ALREADY_EXISTS"
    });
  }

  const launchBundle = readSandboxLaunchArtifact(projectRoot, input.launch_id);
  const launchReady = sandboxLaunchIsReadyForExecution(launchBundle);
  const { requestedProvider, knownProvider } = normalizeRequestedProvider(
    input.requested_provider ?? launchBundle?.launch.requested_provider
  );
  const provider = launchBundle?.launch.provider ?? knownProvider ?? "unknown";
  const launchMatches = sandboxLaunchMatchesExecutionInput({
    launchBundle,
    projectId: input.project_id,
    launchId: input.launch_id,
    adapterId: input.adapter_id,
    backend,
    provider
  });
  const readyLaunchBundle = launchReady && launchMatches ? launchBundle : null;
  const resolver = options.provider_runner_resolver ?? defaultProviderRunnerResolver;
  const resolution = readyLaunchBundle
    ? resolver({
        project_root: projectRoot,
        project_id: input.project_id,
        runner_id: runnerId,
        launch_id: input.launch_id,
        launch_path: readyLaunchBundle.launch.launch_path,
        adapter_id: input.adapter_id,
        backend,
        provider,
        launcher_binary_sha256: readyLaunchBundle.launch.launcher_preflight.launcher_binary_sha256 as string,
        platform: input.runner_environment?.platform
      }) ?? undefined
    : undefined;
  const resolved = isServiceOwnedProviderRunnerResolution(resolution);
  const status = providerRunnerStatus({ launchReady, launchMatches, resolution, resolved });
  const argvTemplate = providerRunnerArgvTemplate(provider);
  const environmentPolicy = providerRunnerEnvironmentPolicy(provider);
  const diagnostics = [
    input.runner_environment?.platform ? `platform=${sanitizeProbeText(input.runner_environment.platform)}` : undefined,
    input.runner_environment?.notes ? sanitizeProbeText(input.runner_environment.notes) : undefined,
    ...sanitizeDiagnostics(resolution?.diagnostics),
    resolved
      ? "Service-owned provider runner resolver prepared a fixed command contract for future OS-sandbox execution."
      : "No service-owned provider runner resolver was accepted."
  ].filter((entry): entry is string => Boolean(entry));
  const runner: AgentAdapterOsIsolationProviderRunner = {
    schema_version: "comath.agent_adapter_os_isolation_provider_runner.v1",
    runner_id: runnerId,
    project_id: input.project_id,
    launch_id: input.launch_id,
    adapter_id: input.adapter_id,
    backend,
    created_at: new Date().toISOString(),
    ok: resolved,
    runner_status: status,
    requested_provider: sanitizeProbeText(requestedProvider) || "unknown",
    provider,
    provider_runner_ready: resolved,
    runner_path: path,
    launch_artifact: readyLaunchBundle?.artifact ?? launchBundle?.artifact ?? null,
    provider_runner_contract: {
      provider,
      shell: false,
      network_policy: "disabled",
      no_new_privileges_required: true,
      command_override_allowed: false,
      environment_override_allowed: false,
      caller_supplied_success_allowed: false,
      fixed_argv_template: argvTemplate,
      fixed_argv_template_sha256: sha256Text(canonicalJson(argvTemplate)),
      environment_policy: environmentPolicy,
      proof_authority: "none"
    },
    provider_runner_resolution: {
      resolution_source: resolution?.resolution_source === "service_owned_provider_runner_resolver"
        ? "service_owned_provider_runner_resolver"
        : "missing",
      runner_available: resolved,
      runner_binary_sha256: resolved && isSha256(resolution?.runner_binary_sha256)
        ? resolution.runner_binary_sha256.toLowerCase()
        : null,
      runner_version: resolved && typeof resolution?.runner_version === "string"
        ? sanitizeProbeText(resolution.runner_version)
        : null,
      diagnostics
    },
    adapter_execution_isolation: {
      required_for_ga: true,
      current_boundary: "process_boundary_only",
      os_enforced: false,
      provider,
      claims_runtime_enforcement: false,
      proof_authority: "none"
    },
    blocker_certificate: resolved
      ? null
      : {
          blocker_code: status,
          replayable_next_action: providerRunnerReplayableNextAction(status),
          proof_authority: "none"
        },
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  };

  mkdirSync(dirname(absoluteRunnerPath), { recursive: true });
  writeFileSync(absoluteRunnerPath, canonicalJson(runner), "utf8");
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "agent_adapter.os_isolation_provider_runner_prepared",
    actor: sanitizeReviewText(input.actor),
    target_id: input.project_id,
    payload: {
      runner_id: runnerId,
      launch_id: input.launch_id,
      adapter_id: input.adapter_id,
      backend,
      ok: resolved,
      runner_status: status,
      provider,
      provider_runner_ready: resolved,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  });
  return runner;
}

export function validateAgentAdapterOsIsolationProviderHelperHost(
  projectRoot: string,
  input: AgentAdapterOsIsolationProviderHelperHostValidationInput,
  options: AgentAdapterOsIsolationProviderHelperHostValidationOptions = {}
): AgentAdapterOsIsolationProviderHelperHostValidation {
  getAgentAdapterPackage(input.adapter_id);
  const hostValidationId = assertProviderHelperHostValidationId(input.host_validation_id);
  const backend = assertBackend(input.backend);
  const path = providerHelperHostValidationPath(hostValidationId);
  const absoluteHostValidationPath = assertPathAllowed(projectRoot, path, { purpose: "runtime-write" });
  if (existsSync(absoluteHostValidationPath)) {
    throw new ComathError("adapter OS-isolation provider helper host validation already exists", {
      statusCode: 409,
      code: "AGENT_ADAPTER_OS_ISOLATION_PROVIDER_HELPER_HOST_VALIDATION_ALREADY_EXISTS"
    });
  }

  const runnerBundle = readProviderRunnerArtifact(projectRoot, input.runner_id);
  const launchBundle = readSandboxLaunchArtifact(projectRoot, input.launch_id);
  const runnerReady = providerRunnerIsReadyForHelperExecution(runnerBundle);
  const { requestedProvider, knownProvider } = normalizeRequestedProvider(
    input.requested_provider ?? runnerBundle?.runner.requested_provider
  );
  const provider = runnerBundle?.runner.provider ?? knownProvider ?? "unknown";
  const runnerMatches = providerRunnerMatchesHelperInput({
    runnerBundle,
    projectId: input.project_id,
    runnerId: input.runner_id,
    launchId: input.launch_id,
    adapterId: input.adapter_id,
    backend,
    provider
  });
  const launchReady = sandboxLaunchIsReadyForExecution(launchBundle);
  const launchMatches = sandboxLaunchMatchesExecutionInput({
    launchBundle,
    projectId: input.project_id,
    launchId: input.launch_id,
    adapterId: input.adapter_id,
    backend,
    provider
  });
  const bindingMatches = runnerMatches && launchReady && launchMatches;
  const readyRunnerBundle = runnerReady && bindingMatches ? runnerBundle : null;
  const hostCapabilityProbeId = input.host_capability_probe_id ?? null;
  const hostCapabilityBundle = hostCapabilityProbeId
    ? readProviderHostCapabilityProbeArtifact(projectRoot, hostCapabilityProbeId)
    : null;
  const serviceObservedPlatform = process.platform;
  const hostCapabilityPresent = Boolean(hostCapabilityProbeId && hostCapabilityBundle);
  const hostCapabilityObserved = providerHostCapabilityIsObserved(hostCapabilityBundle);
  const hostCapabilityMatches = providerHostCapabilityMatchesHelperHostInput({
    bundle: hostCapabilityBundle,
    projectId: input.project_id,
    hostCapabilityProbeId,
    adapterId: input.adapter_id,
    backend,
    provider,
    serviceObservedPlatform
  });
  const hostCapabilityBindingAccepted = hostCapabilityPresent && hostCapabilityObserved && hostCapabilityMatches;
  const hostCapabilityDiagnostics = [
    hostCapabilityProbeId ? `host_capability_probe_id=${sanitizeProbeText(hostCapabilityProbeId)}` : "host_capability_probe_id=missing",
    hostCapabilityBundle?.hostCapability.host_capability_status
      ? `host_capability_status=${sanitizeProbeText(hostCapabilityBundle.hostCapability.host_capability_status)}`
      : undefined,
    ...sanitizeDiagnostics(hostCapabilityBundle?.hostCapability.provider_host_capability.diagnostics),
    hostCapabilityBindingAccepted
      ? "Service-owned provider host capability probe is bound to provider-helper host validation diagnostics."
      : "Provider-helper host validation is blocked until a matching service-owned provider host capability probe is supplied."
  ].filter((entry): entry is string => Boolean(entry));
  const observedPlatform = process.platform;
  const validationPlatform = observedPlatform;
  const environmentPolicy = readyRunnerBundle?.runner.provider_runner_contract.environment_policy ?? providerRunnerEnvironmentPolicy(provider);
  const fixedArgs = providerHelperFixedArgs({
    helperExecutionId: hostValidationId,
    runnerId: input.runner_id,
    launchId: input.launch_id,
    adapterId: input.adapter_id,
    backend,
    provider
  });

  const validation = readyRunnerBundle && hostCapabilityBindingAccepted
    ? (options.provider_helper_host_validator ?? defaultProviderHelperHostValidator)({
        project_root: projectRoot,
        project_id: input.project_id,
        host_validation_id: hostValidationId,
        host_capability_probe_id: hostCapabilityProbeId as string,
        host_capability_probe_path: hostCapabilityBundle?.hostCapability.host_capability_probe_path ?? "",
        host_capability_probe_sha256: hostCapabilityBundle?.artifact.sha256 ?? "",
        host_capability_status: hostCapabilityBundle?.hostCapability.host_capability_status ?? "blocked_provider_host_capability_probe_not_collected",
        provider_host_capability_available: hostCapabilityBundle?.hostCapability.provider_host_capability_available === true,
        runner_id: input.runner_id,
        runner_path: readyRunnerBundle.runner.runner_path,
        launch_id: input.launch_id,
        launch_path: readyRunnerBundle.runner.launch_artifact?.path ?? launchBundle?.artifact.path ?? "",
        adapter_id: input.adapter_id,
        backend,
        provider,
        runner_binary_sha256: readyRunnerBundle.runner.provider_runner_resolution.runner_binary_sha256 as string,
        platform: validationPlatform
      }) ?? undefined
    : undefined;
  const validationSourceAccepted = validation?.validation_source === "service_owned_provider_helper_host_validator";
  const helperProgram = validationSourceAccepted &&
    typeof validation?.helper_program === "string" &&
    isAbsolute(validation.helper_program) &&
    existsSync(validation.helper_program) &&
    statSync(validation.helper_program).isFile()
    ? validation.helper_program
    : null;
  const helperHash = helperProgram ? sha256FileSync(helperProgram) : null;
  const declaredHelperHash = isSha256(validation?.helper_binary_sha256)
    ? validation.helper_binary_sha256.toLowerCase()
    : null;
  const helperBinarySha256 = helperHash?.sha256 ?? declaredHelperHash;
  const runnerBinarySha256 = readyRunnerBundle?.runner.provider_runner_resolution.runner_binary_sha256 ?? null;
  const declaredHashMatchesProgram = Boolean(
    helperHash && (!declaredHelperHash || declaredHelperHash === helperHash.sha256.toLowerCase())
  );
  const hashesMatchProviderRunner = Boolean(
    validationSourceAccepted &&
      helperHash &&
      declaredHashMatchesProgram &&
      isSha256(runnerBinarySha256) &&
      helperHash.sha256.toLowerCase() === runnerBinarySha256.toLowerCase()
  );
  const supportedPlatforms = sanitizeSupportedPlatforms(validation?.supported_platforms);
  const platformSupported = Boolean(
    validationSourceAccepted &&
    supportedPlatforms.length > 0 &&
    supportedPlatforms.includes(validationPlatform)
  );
  const selfTestRequired = validationSourceAccepted && validation?.self_test_required === true;
  const selfTestPassed = validationSourceAccepted && validation?.self_test_passed === true;
  const helperHostReady = Boolean(
    validationSourceAccepted &&
      validation?.helper_host_ready === true &&
      helperHash &&
      osEnforcedProviders.has(provider)
  );
  const status = providerHelperHostValidationStatus({
    runnerReady,
    runnerMatches: bindingMatches,
    hostCapabilityPresent,
    hostCapabilityObserved,
    hostCapabilityMatches,
    validationSourceAccepted,
    helperHostReady,
    hashesMatchRunner: hashesMatchProviderRunner,
    platformContractDeclared: supportedPlatforms.length > 0,
    platformSupported,
    selfTestRequired,
    selfTestPassed
  });
  const ok = status === "provider_helper_host_validated";
  const diagnostics = [
    validationPlatform ? `platform=${validationPlatform}` : undefined,
    input.host_environment?.notes ? sanitizeProbeText(input.host_environment.notes) : undefined,
    ...hostCapabilityDiagnostics,
    ...sanitizeDiagnostics(validation?.diagnostics),
    ok
      ? "Service-owned provider-helper host validator accepted the helper host configuration."
      : "No service-owned provider-helper host validation was accepted as OS-enforcement or readiness evidence."
  ].filter((entry): entry is string => Boolean(entry));

  const hostValidation: AgentAdapterOsIsolationProviderHelperHostValidation = {
    schema_version: "comath.agent_adapter_os_isolation_provider_helper_host_validation.v1",
    host_validation_id: hostValidationId,
    host_capability_probe_id: hostCapabilityProbeId,
    project_id: input.project_id,
    runner_id: input.runner_id,
    launch_id: input.launch_id,
    adapter_id: input.adapter_id,
    backend,
    created_at: new Date().toISOString(),
    ok,
    host_validation_status: status,
    requested_provider: sanitizeProbeText(requestedProvider) || "unknown",
    provider,
    provider_helper_host_ready: ok,
    host_validation_path: path,
    provider_host_capability_artifact: hostCapabilityBundle?.artifact ?? null,
    provider_host_capability_binding: {
      bound: hostCapabilityBindingAccepted,
      host_capability_probe_id: hostCapabilityProbeId,
      host_capability_status: hostCapabilityBundle?.hostCapability.host_capability_status ?? null,
      probe_source:
        hostCapabilityBundle?.hostCapability.provider_host_capability.probe_source === "service_owned_provider_host_capability_probe"
          ? "service_owned_provider_host_capability_probe"
          : "missing",
      provider_host_capability_available: hostCapabilityBundle?.hostCapability.provider_host_capability_available === true,
      provider: hostCapabilityBundle?.hostCapability.provider ?? null,
      platform: hostCapabilityBundle?.hostCapability.provider_host_capability.platform ?? null,
      platform_supported: hostCapabilityBundle?.hostCapability.provider_host_capability.platform_supported === true,
      diagnostics: hostCapabilityDiagnostics,
      proof_authority: "none"
    },
    launch_artifact: launchBundle?.artifact ?? null,
    runner_artifact: runnerBundle?.artifact ?? null,
    provider_helper_host_validation: {
      validation_source: validationSourceAccepted ? "service_owned_provider_helper_host_validator" : "missing",
      helper_host_ready: helperHostReady,
      helper_binary_sha256: helperBinarySha256,
      runner_binary_sha256: isSha256(runnerBinarySha256) ? runnerBinarySha256.toLowerCase() : null,
      hashes_match_provider_runner: hashesMatchProviderRunner,
      helper_version: validationSourceAccepted && typeof validation?.helper_version === "string"
        ? sanitizeProbeText(validation.helper_version)
        : null,
      supported_platforms: supportedPlatforms,
      platform: validationPlatform,
      platform_supported: platformSupported,
      host_capability_required: true,
      host_capability_bound: hostCapabilityBindingAccepted,
      self_test_required: selfTestRequired,
      self_test_passed: selfTestPassed,
      self_test_exit_code: validationSourceAccepted && typeof validation?.self_test_exit_code === "number"
        ? validation.self_test_exit_code
        : null,
      self_test_signal: validationSourceAccepted && typeof validation?.self_test_signal === "string"
        ? sanitizeProbeText(validation.self_test_signal)
        : null,
      self_test_timed_out: validationSourceAccepted && validation?.self_test_timed_out === true,
      self_test_stdout_sha256: isSha256(validation?.self_test_stdout_sha256)
        ? validation.self_test_stdout_sha256.toLowerCase()
        : null,
      self_test_stderr_sha256: isSha256(validation?.self_test_stderr_sha256)
        ? validation.self_test_stderr_sha256.toLowerCase()
        : null,
      self_test_transcript_sha256: isSha256(validation?.self_test_transcript_sha256)
        ? validation.self_test_transcript_sha256.toLowerCase()
        : null,
      self_test_args_prefix_sha256: isSha256(validation?.self_test_args_prefix_sha256)
        ? validation.self_test_args_prefix_sha256.toLowerCase()
        : null,
      self_test_args_prefix_count: typeof validation?.self_test_args_prefix_count === "number" && Number.isInteger(validation.self_test_args_prefix_count) && validation.self_test_args_prefix_count >= 0
        ? validation.self_test_args_prefix_count
        : 0,
      self_test_fixed_args_sha256: isSha256(validation?.self_test_fixed_args_sha256)
        ? validation.self_test_fixed_args_sha256.toLowerCase()
        : null,
      shell: false,
      network_policy: "disabled",
      no_new_privileges_required: true,
      command_override_allowed: false,
      environment_override_allowed: false,
      caller_supplied_success_allowed: false,
      fixed_args_template: fixedArgs,
      fixed_args_template_sha256: sha256Text(canonicalJson(fixedArgs)),
      environment_policy: environmentPolicy,
      diagnostics,
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
    blocker_certificate: ok
      ? null
      : {
          blocker_code: status,
          replayable_next_action: providerHelperHostReplayableNextAction(status),
          proof_authority: "none"
        },
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  };

  mkdirSync(dirname(absoluteHostValidationPath), { recursive: true });
  writeFileSync(absoluteHostValidationPath, canonicalJson(hostValidation), "utf8");
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "agent_adapter.os_isolation_provider_helper_host_validated",
    actor: sanitizeReviewText(input.actor),
    target_id: input.project_id,
    payload: {
      host_validation_id: hostValidationId,
      host_capability_probe_id: hostCapabilityProbeId,
      runner_id: input.runner_id,
      launch_id: input.launch_id,
      adapter_id: input.adapter_id,
      backend,
      ok,
      host_validation_status: status,
      provider,
      provider_helper_host_ready: ok,
      host_capability_bound: hostCapabilityBindingAccepted,
      host_capability_status: hostCapabilityBundle?.hostCapability.host_capability_status ?? null,
      helper_binary_sha256: helperBinarySha256,
      runner_binary_sha256: isSha256(runnerBinarySha256) ? runnerBinarySha256.toLowerCase() : null,
      hashes_match_provider_runner: hashesMatchProviderRunner,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  });
  return hostValidation;
}

export function runAgentAdapterOsIsolationProviderHelperExecution(
  projectRoot: string,
  input: AgentAdapterOsIsolationProviderHelperExecutionInput,
  options: AgentAdapterOsIsolationProviderHelperExecutionOptions = {}
): AgentAdapterOsIsolationProviderHelperExecution {
  getAgentAdapterPackage(input.adapter_id);
  const helperExecutionId = assertProviderHelperExecutionId(input.helper_execution_id);
  const backend = assertBackend(input.backend);
  const path = providerHelperExecutionPath(helperExecutionId);
  const absoluteHelperExecutionPath = assertPathAllowed(projectRoot, path, { purpose: "runtime-write" });
  if (existsSync(absoluteHelperExecutionPath)) {
    throw new ComathError("adapter OS-isolation provider helper execution already exists", {
      statusCode: 409,
      code: "AGENT_ADAPTER_OS_ISOLATION_PROVIDER_HELPER_EXECUTION_ALREADY_EXISTS"
    });
  }

  const runnerBundle = readProviderRunnerArtifact(projectRoot, input.runner_id);
  const runnerReady = providerRunnerIsReadyForHelperExecution(runnerBundle);
  const { requestedProvider, knownProvider } = normalizeRequestedProvider(
    input.requested_provider ?? runnerBundle?.runner.requested_provider
  );
  const provider = runnerBundle?.runner.provider ?? knownProvider ?? "unknown";
  const runnerMatches = providerRunnerMatchesHelperInput({
    runnerBundle,
    projectId: input.project_id,
    runnerId: input.runner_id,
    launchId: input.launch_id,
    adapterId: input.adapter_id,
    backend,
    provider
  });
  const readyRunnerBundle = runnerReady && runnerMatches ? runnerBundle : null;
  const launchBundle = readSandboxLaunchArtifact(projectRoot, input.launch_id);
  const hostValidationId = input.host_validation_id ?? null;
  const hostValidationBundle = hostValidationId
    ? readProviderHelperHostValidationArtifact(projectRoot, hostValidationId)
    : null;
  const hostValidation = hostValidationBundle?.hostValidation;
  const hostValidationPresent = Boolean(hostValidationId && hostValidationBundle);
  const hostValidationValidated = providerHelperHostValidationIsExecutable(hostValidationBundle);
  const hostValidationMatches = providerHelperHostValidationMatchesExecutionInput({
    hostValidationBundle,
    runnerBundle,
    launchBundle,
    projectId: input.project_id,
    hostValidationId,
    runnerId: input.runner_id,
    launchId: input.launch_id,
    adapterId: input.adapter_id,
    backend,
    provider
  });
  const hostValidationBindingAccepted = hostValidationPresent && hostValidationValidated && hostValidationMatches;
  const hostValidationBindingDiagnostics = [
    hostValidationId ? `host_validation_id=${sanitizeProbeText(hostValidationId)}` : "host_validation_id=missing",
    hostValidation?.host_validation_status
      ? `host_validation_status=${sanitizeProbeText(hostValidation.host_validation_status)}`
      : undefined,
    ...sanitizeDiagnostics(hostValidation?.provider_helper_host_validation.diagnostics),
    hostValidationBindingAccepted
      ? "Service-owned provider-helper execution is bound to a validated host-validation manifest."
      : "Provider-helper execution is blocked until a matching service-owned host-validation manifest is supplied."
  ].filter((entry): entry is string => Boolean(entry));
  const config = readyRunnerBundle && hostValidationBindingAccepted
    ? (options.provider_helper_config_resolver ?? defaultProviderHelperConfigResolver)({
        project_root: projectRoot,
        project_id: input.project_id,
        helper_execution_id: helperExecutionId,
        runner_id: input.runner_id,
        runner_path: readyRunnerBundle.runner.runner_path,
        launch_id: input.launch_id,
        launch_path: readyRunnerBundle.runner.launch_artifact?.path ?? launchBundle?.artifact.path ?? "",
        adapter_id: input.adapter_id,
        backend,
        provider,
        runner_binary_sha256: readyRunnerBundle.runner.provider_runner_resolution.runner_binary_sha256 as string,
        platform: input.helper_environment?.platform
      }) ?? undefined
    : undefined;
  const configAccepted = providerHelperConfigAccepted(config);
  const fixedArgs = providerHelperFixedArgs({
    helperExecutionId,
    runnerId: input.runner_id,
    launchId: input.launch_id,
    adapterId: input.adapter_id,
    backend,
    provider
  });
  const env = providerHelperEnv({
    projectId: input.project_id,
    runnerId: input.runner_id,
    launchId: input.launch_id,
    adapterId: input.adapter_id,
    backend,
    provider
  });
  const helperProgram = configAccepted ? config?.helper_program as string : null;
  const helperHash = helperProgram ? sha256FileSync(helperProgram) : null;
  const runnerBinarySha256 = readyRunnerBundle?.runner.provider_runner_resolution.runner_binary_sha256;
  const helperHashMatches = Boolean(
    helperHash &&
      isSha256(runnerBinarySha256) &&
      helperHash.sha256.toLowerCase() === runnerBinarySha256.toLowerCase()
  );
  const helperArgsPrefix = configAccepted ? sanitizeHelperArgsPrefix(config?.helper_args_prefix) : [];
  const helperArgsPrefixSha256 = helperArgsPrefix.length > 0 ? sha256Text(canonicalJson(helperArgsPrefix)) : null;
  const shouldSpawn = Boolean(hostValidationBindingAccepted && configAccepted && helperHashMatches && helperProgram);
  const spawned = shouldSpawn
    ? spawnSync(helperProgram as string, [...helperArgsPrefix, ...fixedArgs], {
        cwd: projectRoot,
        env,
        encoding: "utf8",
        shell: false,
        timeout: normalizeHelperTimeoutMs(config?.timeout_ms)
      })
    : undefined;
  const stdout = typeof spawned?.stdout === "string" ? spawned.stdout : "";
  const stderr = typeof spawned?.stderr === "string" ? spawned.stderr : "";
  const stdoutSha256 = shouldSpawn ? sha256Bytes(stdout) : null;
  const stderrSha256 = shouldSpawn ? sha256Bytes(stderr) : null;
  const stdoutSize = shouldSpawn ? Buffer.byteLength(stdout, "utf8") : 0;
  const stderrSize = shouldSpawn ? Buffer.byteLength(stderr, "utf8") : 0;
  const runtimeAttestation = shouldSpawn
    ? providerHelperRuntimeAttestation({
        stdout,
        projectId: input.project_id,
        helperExecutionId,
        runnerId: input.runner_id,
        launchId: input.launch_id,
        adapterId: input.adapter_id,
        backend,
        provider
      })
    : { source: "missing" as const, bound: false, sha256: null };
  const exitCode = typeof spawned?.status === "number" ? spawned.status : null;
  const signal = typeof spawned?.signal === "string" ? spawned.signal : null;
  const spawnError = spawned?.error as (Error & { code?: string }) | undefined;
  const launchFailed = Boolean(spawnError);
  const timedOut = spawnError?.code === "ETIMEDOUT";
  const status = helperExecutionStatus({
    runnerReady,
    runnerMatches,
    hostValidationPresent,
    hostValidationValidated,
    hostValidationMatches,
    configAccepted,
    helperHashMatches,
    launchFailed,
    exitCode
  });
  const ok = status === "provider_helper_execution_attempted";
  const attempted = shouldSpawn && !launchFailed && exitCode !== null;
  const transcriptSha256 = shouldSpawn
    ? sha256Text(canonicalJson({
        helper_execution_id: helperExecutionId,
        host_validation_id: hostValidationId,
        runner_id: input.runner_id,
        launch_id: input.launch_id,
        helper_binary_sha256: helperHash?.sha256 ?? null,
        helper_args_prefix_sha256: helperArgsPrefixSha256,
        helper_args_prefix_count: helperArgsPrefix.length,
        helper_exit_code: exitCode,
        helper_signal: signal,
        stdout_sha256: stdoutSha256,
        stderr_sha256: stderrSha256,
        runtime_attestation_sha256: runtimeAttestation.sha256,
        runtime_attestation_bound: runtimeAttestation.bound,
        stdout_size_bytes: stdoutSize,
        stderr_size_bytes: stderrSize
      }))
    : null;
  const environmentPolicy = readyRunnerBundle?.runner.provider_runner_contract.environment_policy ?? providerRunnerEnvironmentPolicy(provider);
  const diagnostics = [
    input.helper_environment?.platform ? `platform=${sanitizeProbeText(input.helper_environment.platform)}` : undefined,
    input.helper_environment?.notes ? sanitizeProbeText(input.helper_environment.notes) : undefined,
    ...hostValidationBindingDiagnostics,
    ...sanitizeDiagnostics(config?.diagnostics),
    spawnError?.message ? sanitizeProbeText(spawnError.message) : undefined,
    attempted && runtimeAttestation.bound
      ? "Provider helper runtime attestation binds the current project, helper execution, runner, launch, adapter, backend, provider, network policy, and proof authority."
      : undefined,
    ok
      ? "Service-owned provider helper process executed with fixed argv/env and hash-bound runner binary."
      : "No service-owned provider helper execution evidence was accepted as readiness evidence."
  ].filter((entry): entry is string => Boolean(entry));

  const helperExecution: AgentAdapterOsIsolationProviderHelperExecution = {
    schema_version: "comath.agent_adapter_os_isolation_provider_helper_execution.v1",
    helper_execution_id: helperExecutionId,
    host_validation_id: hostValidationId,
    project_id: input.project_id,
    runner_id: input.runner_id,
    launch_id: input.launch_id,
    adapter_id: input.adapter_id,
    backend,
    created_at: new Date().toISOString(),
    ok,
    helper_execution_status: status,
    requested_provider: sanitizeProbeText(requestedProvider) || "unknown",
    provider,
    provider_helper_attempted: attempted,
    helper_execution_path: path,
    launch_artifact: readyRunnerBundle?.runner.launch_artifact ?? launchBundle?.artifact ?? null,
    runner_artifact: runnerBundle?.artifact ?? null,
    host_validation_artifact: hostValidationBundle?.artifact ?? null,
    provider_helper_host_validation_binding: {
      bound: hostValidationBindingAccepted,
      host_validation_id: hostValidationId,
      host_validation_status: hostValidation?.host_validation_status ?? null,
      validation_source:
        hostValidation?.provider_helper_host_validation.validation_source === "service_owned_provider_helper_host_validator"
          ? "service_owned_provider_helper_host_validator"
          : "missing",
      host_capability_probe_id: hostValidation?.host_capability_probe_id ?? null,
      provider_host_capability_bound: hostValidation?.provider_host_capability_binding.bound === true,
      host_capability_status: hostValidation?.provider_host_capability_binding.host_capability_status ?? null,
      helper_binary_sha256: isSha256(hostValidation?.provider_helper_host_validation.helper_binary_sha256)
        ? hostValidation.provider_helper_host_validation.helper_binary_sha256.toLowerCase()
        : null,
      runner_binary_sha256: isSha256(hostValidation?.provider_helper_host_validation.runner_binary_sha256)
        ? hostValidation.provider_helper_host_validation.runner_binary_sha256.toLowerCase()
        : null,
      hashes_match_provider_runner: hostValidation?.provider_helper_host_validation.hashes_match_provider_runner === true,
      platform: hostValidation?.provider_helper_host_validation.platform ?? null,
      platform_supported: hostValidation?.provider_helper_host_validation.platform_supported === true,
      diagnostics: hostValidationBindingDiagnostics,
      proof_authority: "none"
    },
    provider_helper_execution: {
      helper_source: configAccepted ? "service_owned_provider_helper_config" : "missing",
      helper_configured: configAccepted,
      helper_binary_sha256: helperHash?.sha256 ?? null,
      helper_args_prefix_sha256: helperArgsPrefixSha256,
      helper_args_prefix_count: helperArgsPrefix.length,
      helper_version: configAccepted && typeof config?.helper_version === "string"
        ? sanitizeProbeText(config.helper_version)
        : null,
      helper_exit_code: attempted ? exitCode : null,
      helper_signal: attempted ? signal : null,
      timed_out: timedOut,
      stdout_sha256: attempted ? stdoutSha256 : null,
      stderr_sha256: attempted ? stderrSha256 : null,
      transcript_sha256: attempted ? transcriptSha256 : null,
      runtime_attestation_source: attempted ? runtimeAttestation.source : "missing",
      runtime_attestation_bound: attempted ? runtimeAttestation.bound : false,
      runtime_attestation_sha256: attempted ? runtimeAttestation.sha256 : null,
      stdout_size_bytes: attempted ? stdoutSize : 0,
      stderr_size_bytes: attempted ? stderrSize : 0,
      shell: false,
      network_policy: "disabled",
      no_new_privileges_required: true,
      command_override_allowed: false,
      environment_override_allowed: false,
      caller_supplied_success_allowed: false,
      fixed_args_template: fixedArgs,
      fixed_args_template_sha256: sha256Text(canonicalJson(fixedArgs)),
      environment_policy: environmentPolicy,
      diagnostics,
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
    blocker_certificate: {
      blocker_code: status,
      replayable_next_action: providerHelperReplayableNextAction(status),
      proof_authority: "none"
    },
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  };

  mkdirSync(dirname(absoluteHelperExecutionPath), { recursive: true });
  writeFileSync(absoluteHelperExecutionPath, canonicalJson(helperExecution), "utf8");
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "agent_adapter.os_isolation_provider_helper_executed",
    actor: sanitizeReviewText(input.actor),
    target_id: input.project_id,
    payload: {
      helper_execution_id: helperExecutionId,
      host_validation_id: hostValidationId,
      runner_id: input.runner_id,
      launch_id: input.launch_id,
      adapter_id: input.adapter_id,
      backend,
      ok,
      helper_execution_status: status,
      host_validation_status: hostValidation?.host_validation_status ?? null,
      host_validation_bound: hostValidationBindingAccepted,
      host_capability_probe_id: hostValidation?.host_capability_probe_id ?? null,
      host_capability_bound: hostValidation?.provider_host_capability_binding.bound === true,
      host_capability_status: hostValidation?.provider_host_capability_binding.host_capability_status ?? null,
      provider,
      provider_helper_attempted: attempted,
      helper_exit_code: attempted ? exitCode : null,
      stdout_sha256: attempted ? stdoutSha256 : null,
      stderr_sha256: attempted ? stderrSha256 : null,
      runtime_attestation_bound: attempted ? runtimeAttestation.bound : false,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  });
  return helperExecution;
}

export function collectAgentAdapterOsIsolationProviderHelperExecutionEvidence(
  projectRoot: string,
  input: AgentAdapterOsIsolationProviderHelperCollectionInput,
  options: AgentAdapterOsIsolationProviderHelperCollectionOptions = {}
): AgentAdapterOsIsolationProviderHelperCollectionManifest {
  getAgentAdapterPackage(input.adapter_id);
  const collectionId = assertProviderHelperCollectionId(input.collection_id);
  const backend = assertBackend(input.backend);
  const path = providerHelperCollectionPath(collectionId);
  const absoluteCollectionPath = assertPathAllowed(projectRoot, path, { purpose: "runtime-write" });
  if (existsSync(absoluteCollectionPath)) {
    throw new ComathError("adapter OS-isolation provider helper collection already exists", {
      statusCode: 409,
      code: "AGENT_ADAPTER_OS_ISOLATION_PROVIDER_HELPER_COLLECTION_ALREADY_EXISTS"
    });
  }

  const helperBundle = readProviderHelperExecutionArtifact(projectRoot, input.helper_execution_id);
  const runnerBundle = readProviderRunnerArtifact(projectRoot, input.runner_id);
  const launchBundle = readSandboxLaunchArtifact(projectRoot, input.launch_id);
  const helperExecution = helperBundle?.helperExecution;
  const hostValidationBundle = helperExecution?.host_validation_id
    ? readProviderHelperHostValidationArtifact(projectRoot, helperExecution.host_validation_id)
    : null;
  const hostCapabilityProbeId =
    hostValidationBundle?.hostValidation.host_capability_probe_id ??
    helperExecution?.provider_helper_host_validation_binding.host_capability_probe_id ??
    null;
  const hostCapabilityBundle = hostCapabilityProbeId
    ? readProviderHostCapabilityProbeArtifact(projectRoot, hostCapabilityProbeId)
    : null;
  const { requestedProvider, knownProvider } = normalizeRequestedProvider(
    input.requested_provider ?? helperExecution?.requested_provider ?? runnerBundle?.runner.requested_provider
  );
  const provider = helperExecution?.provider ?? runnerBundle?.runner.provider ?? knownProvider ?? "unknown";
  const helperExecutionCollectable = providerHelperExecutionIsCollectable(helperBundle);
  const runnerReady = providerRunnerIsReadyForHelperExecution(runnerBundle);
  const launchReady = sandboxLaunchIsReadyForExecution(launchBundle);
  const runnerMatches = providerRunnerMatchesHelperInput({
    runnerBundle,
    projectId: input.project_id,
    runnerId: input.runner_id,
    launchId: input.launch_id,
    adapterId: input.adapter_id,
    backend,
    provider
  });
  const launchMatches = sandboxLaunchMatchesExecutionInput({
    launchBundle,
    projectId: input.project_id,
    launchId: input.launch_id,
    adapterId: input.adapter_id,
    backend,
    provider
  });
  const bindingMatches = Boolean(
    helperExecution &&
      runnerReady &&
      launchReady &&
      runnerMatches &&
      launchMatches &&
      providerHelperExecutionMatchesCollectionInput({
        helperBundle,
        runnerBundle,
        launchBundle,
        projectId: input.project_id,
        helperExecutionId: input.helper_execution_id,
        runnerId: input.runner_id,
        launchId: input.launch_id,
        adapterId: input.adapter_id,
        backend,
        provider
      })
  );

  const runtimeAttestationBound = providerHelperExecutionRuntimeAttestationBound(helperExecution);
  const hostCapabilityBinding = providerHelperCollectionHostCapabilityBinding({
    helperExecution,
    hostValidationBundle,
    hostCapabilityBundle
  });
  const providerSpecificTool = providerSpecificHostCapabilityTool({
    hostCapability: hostCapabilityBundle?.hostCapability,
    provider
  });
  const canCollectFromHelperExecution =
    bindingMatches && helperExecutionCollectable && runtimeAttestationBound && hostCapabilityBinding.bound;
  const providerHelperCollectionProbe =
    options.provider_helper_collection_probe ?? defaultProviderHelperCollectionProbe;
  const collectionProbeInput: AgentAdapterOsIsolationProviderHelperCollectionProbeInput | null = canCollectFromHelperExecution
    ? {
        project_root: projectRoot,
        project_id: input.project_id,
        collection_id: collectionId,
        helper_execution_id: input.helper_execution_id,
        helper_execution_path: helperExecution?.helper_execution_path as string,
        runner_id: input.runner_id,
        runner_path: runnerBundle?.runner.runner_path as string,
        launch_id: input.launch_id,
        launch_path: launchBundle?.launch.launch_path as string,
        host_validation_id: hostCapabilityBinding.host_validation_id as string,
        host_validation_path: hostCapabilityBinding.host_validation_path as string,
        host_validation_sha256: hostCapabilityBinding.host_validation_sha256 as string,
        host_capability_probe_id: hostCapabilityBinding.host_capability_probe_id as string,
        host_capability_probe_path: hostCapabilityBinding.host_capability_probe_path as string,
        host_capability_probe_sha256: hostCapabilityBinding.host_capability_probe_sha256 as string,
        host_capability_status: hostCapabilityBinding.host_capability_status as AgentAdapterOsIsolationProviderHostCapabilityStatus,
        provider_host_capability_bound: hostCapabilityBinding.bound,
        adapter_id: input.adapter_id,
        backend,
        provider,
        helper_exit_code: helperExecution?.provider_helper_execution.helper_exit_code as number,
        stdout_sha256: helperExecution?.provider_helper_execution.stdout_sha256 as string,
        stderr_sha256: helperExecution?.provider_helper_execution.stderr_sha256 as string,
        transcript_sha256: helperExecution?.provider_helper_execution.transcript_sha256 as string,
        provider_specific_tool_name: providerSpecificTool?.name ?? null,
        provider_specific_tool_sha256: providerSpecificTool?.sha256 ?? null,
        platform: input.collection_environment?.platform
      }
    : null;
  if (collectionProbeInput) {
    collectionProbeInput.provider_tool_execution_witness_expectation =
      providerToolExecutionCallbackExpectation(collectionProbeInput);
  }
  const collection = collectionProbeInput
    ? providerHelperCollectionProbe(collectionProbeInput) ?? undefined
    : undefined;
  const collectionSourceAccepted = collection?.probe_source === "service_owned_provider_helper_collection_probe";
  const hashesMatch = providerHelperCollectionHashesMatchExecution(collection, helperExecution);
  const providerToolWitness =
    collectionProbeInput &&
    providerToolExecutionWitnessAccepted(
      collection?.provider_tool_execution_witness,
      collectionProbeInput,
      collection?.provider_tool_execution_witness_expectation ??
        collectionProbeInput.provider_tool_execution_witness_expectation
    )
      ? collection?.provider_tool_execution_witness
      : undefined;
  const providerToolWitnessSha256 = providerToolExecutionWitnessSha256(providerToolWitness);
  const providerToolWitnessBound = Boolean(providerToolWitnessSha256);
  const providerSpecificToolExecutionRequired = collectionProviderSpecificToolExecutionRequired(
    collection,
    collectionProbeInput ?? undefined
  );
  const providerSpecificToolExecutionBound = collectionProviderSpecificToolExecutionBound(
    collection,
    collectionProbeInput ?? undefined
  );
  const providerSpecificToolExecutionHash = providerSpecificToolExecutionSha256(
    collection,
    collectionProbeInput ?? undefined
  );
  const providerFamilyOsEnforcementWitnessHash = providerFamilyOsEnforcementWitnessSha256ForCollection(
    collection,
    collectionProbeInput ?? undefined
  );
  const providerFamilyOsEnforcementWitnessBound = Boolean(providerFamilyOsEnforcementWitnessHash);
  const providerFamilyExecutionProfileSha256 = providerFamilyExecutionProfileSha256ForCollection(
    collection,
    collectionProbeInput ?? undefined
  );
  const providerFamilyExecutionArgvSha256 = providerFamilyExecutionArgvSha256ForCollection(
    collection,
    collectionProbeInput ?? undefined
  );
  const providerFamilyExecutionKind = providerFamilyExecutionKindForCollection(
    collection,
    collectionProbeInput ?? undefined
  );
  const providerFamilyExecutionProfileBound = Boolean(providerFamilyExecutionProfileSha256);
  const providerSpecificLiveProbeAttemptSha256 = providerSpecificLiveProbeAttemptSha256ForCollection(
    collection,
    collectionProbeInput ?? undefined
  );
  const providerSpecificLiveProbeAttemptBound = Boolean(providerSpecificLiveProbeAttemptSha256);
  const providerSpecificLiveProbeExecutionRequired = collectionSourceAccepted;
  const providerSpecificLiveProbeExecutionSha256 = providerSpecificLiveProbeExecutionSha256ForCollection(
    collection,
    collectionProbeInput ?? undefined
  );
  const providerSpecificLiveProbeExecutionBound = providerSpecificLiveProbeExecutionRequired
    ? Boolean(providerSpecificLiveProbeExecutionSha256)
    : false;
  const providerControlPlaneExecutionWitnessSha256 = providerControlPlaneExecutionWitnessSha256ForCollection(
    collection,
    collectionProbeInput ?? undefined
  );
  const providerControlPlaneExecutionWitnessBound = Boolean(providerControlPlaneExecutionWitnessSha256);
  const osEnforcementCompleteness = providerHelperCollectionOsEnforcementCompleteness({
    collection,
    hashesMatch,
    collectionProbeInput
  });
  const probe = helperExecution && canCollectFromHelperExecution
    ? probeAgentAdapterOsIsolation(projectRoot, {
        project_id: input.project_id,
        probe_id: collectionId,
        adapter_id: input.adapter_id,
        backend,
        actor: input.actor,
        requested_provider: provider,
        probe_environment: {
          provider_available: true,
          platform: input.collection_environment?.platform,
          notes: input.collection_environment?.notes
        }
      }, {
        collector: () =>
          providerHelperCollectionForProbe({
            collection,
            helperExecution,
            hashesMatch,
            collectionProbeInput
          })
      })
    : null;
  const status = providerHelperCollectionStatus({
    helperExecutionPresent: Boolean(helperExecution),
    helperExecutionCollectable,
    runtimeAttestationBound,
    hostCapabilityBound: hostCapabilityBinding.bound,
    bindingMatches,
    collectionPresent: Boolean(collection),
    collectionSourceAccepted,
    hashesMatch,
    providerToolWitnessBound,
    providerSpecificToolExecutionRequired,
    providerSpecificToolExecutionBound,
    onlyProviderToolWitnessMissing:
      osEnforcementCompleteness.incompleteFacts.length === 1 &&
      osEnforcementCompleteness.incompleteFacts[0] === "provider_tool_execution_witness",
    onlyProviderFamilyOsEnforcementWitnessMissing:
      osEnforcementCompleteness.incompleteFacts.length === 1 &&
      osEnforcementCompleteness.incompleteFacts[0] === "provider_family_os_enforcement_witness",
    onlyProviderFamilyExecutionProfileMissing:
      osEnforcementCompleteness.incompleteFacts.length === 1 &&
      osEnforcementCompleteness.incompleteFacts[0] === "provider_family_execution_profile",
    onlyProviderSpecificLiveProbeAttemptMissing:
      osEnforcementCompleteness.incompleteFacts.length === 1 &&
      osEnforcementCompleteness.incompleteFacts[0] === "provider_specific_live_probe_attempt",
    onlyProviderSpecificLiveProbeExecutionMissing:
      osEnforcementCompleteness.incompleteFacts.length === 1 &&
      osEnforcementCompleteness.incompleteFacts[0] === "provider_specific_live_probe_execution",
    onlyProviderControlPlaneExecutionWitnessMissing:
      osEnforcementCompleteness.incompleteFacts.length === 1 &&
      osEnforcementCompleteness.incompleteFacts[0] === "provider_control_plane_execution_witness",
    osEnforcementComplete: osEnforcementCompleteness.complete,
    probe
  });
  const ok = status === "provider_helper_os_evidence_collected";
  const diagnostics = [
    input.collection_environment?.platform ? `platform=${sanitizeProbeText(input.collection_environment.platform)}` : undefined,
    input.collection_environment?.notes ? sanitizeProbeText(input.collection_environment.notes) : undefined,
    ...sanitizeDiagnostics(collection?.diagnostics),
    ok
      ? "Service-owned provider-helper collection produced canonical OS-enforcement evidence."
      : "No service-owned provider-helper collection was accepted as canonical OS-enforcement evidence."
  ].filter((entry): entry is string => Boolean(entry));
  const helperCollection: AgentAdapterOsIsolationProviderHelperCollectionManifest = {
    schema_version: "comath.agent_adapter_os_isolation_provider_helper_collection.v1",
    collection_id: collectionId,
    project_id: input.project_id,
    helper_execution_id: input.helper_execution_id,
    runner_id: input.runner_id,
    launch_id: input.launch_id,
    adapter_id: input.adapter_id,
    backend,
    created_at: new Date().toISOString(),
    ok,
    collection_status: status,
    requested_provider: sanitizeProbeText(requestedProvider) || "unknown",
    provider,
    collection_path: path,
    launch_artifact: launchBundle?.artifact ?? null,
    runner_artifact: runnerBundle?.artifact ?? null,
    helper_execution_artifact: helperBundle?.artifact ?? null,
    probe,
    provider_helper_collection: {
      probe_source: collectionSourceAccepted ? "service_owned_provider_helper_collection_probe" : "missing",
      hashes_match_helper_execution: hashesMatch,
      os_enforcement_complete: osEnforcementCompleteness.complete,
      incomplete_os_enforcement_facts: osEnforcementCompleteness.incompleteFacts,
      helper_exit_code: helperExecution?.provider_helper_execution.helper_exit_code ?? null,
      stdout_sha256: helperExecution?.provider_helper_execution.stdout_sha256 ?? null,
      stderr_sha256: helperExecution?.provider_helper_execution.stderr_sha256 ?? null,
      transcript_sha256: helperExecution?.provider_helper_execution.transcript_sha256 ?? null,
      runtime_attestation_bound: runtimeAttestationBound,
      runtime_attestation_sha256: helperExecution?.provider_helper_execution.runtime_attestation_sha256 ?? null,
      host_capability_required: true,
      host_capability_bound: hostCapabilityBinding.bound,
      host_validation_id: hostCapabilityBinding.host_validation_id,
      host_validation_path: hostCapabilityBinding.host_validation_path,
      host_validation_sha256: hostCapabilityBinding.host_validation_sha256,
      host_capability_probe_id: hostCapabilityBinding.host_capability_probe_id,
      host_capability_probe_path: hostCapabilityBinding.host_capability_probe_path,
      host_capability_probe_sha256: hostCapabilityBinding.host_capability_probe_sha256,
      host_capability_status: hostCapabilityBinding.host_capability_status,
      provider_tool_execution_witness_required: true,
      provider_tool_execution_witness_bound: providerToolWitnessBound,
      provider_tool_execution_witness_sha256: providerToolWitnessSha256,
      provider_specific_tool_execution_required: providerSpecificToolExecutionRequired,
      provider_specific_tool_execution_bound: providerSpecificToolExecutionRequired
        ? providerSpecificToolExecutionBound
        : false,
      provider_specific_tool_execution_sha256: providerSpecificToolExecutionHash,
      provider_specific_tool_name: providerSpecificTool?.name ?? null,
      provider_specific_tool_sha256: providerSpecificTool?.sha256 ?? null,
      provider_family_os_enforcement_witness_required: true,
      provider_family_os_enforcement_witness_bound: providerFamilyOsEnforcementWitnessBound,
      provider_family_os_enforcement_witness_sha256: providerFamilyOsEnforcementWitnessHash,
      provider_family_execution_profile_required: true,
      provider_family_execution_profile_bound: providerFamilyExecutionProfileBound,
      provider_family_execution_kind: providerFamilyExecutionKind,
      provider_family_execution_profile_sha256: providerFamilyExecutionProfileSha256,
      provider_family_execution_argv_sha256: providerFamilyExecutionArgvSha256,
      provider_specific_live_probe_attempt_required: true,
      provider_specific_live_probe_attempt_bound: providerSpecificLiveProbeAttemptBound,
      provider_specific_live_probe_attempt_sha256: providerSpecificLiveProbeAttemptSha256,
      provider_specific_live_probe_execution_required: providerSpecificLiveProbeExecutionRequired,
      provider_specific_live_probe_execution_bound: providerSpecificLiveProbeExecutionBound,
      provider_specific_live_probe_execution_sha256: providerSpecificLiveProbeExecutionSha256,
      provider_control_plane_execution_witness_required: true,
      provider_control_plane_execution_witness_bound: providerControlPlaneExecutionWitnessBound,
      provider_control_plane_execution_witness_sha256: providerControlPlaneExecutionWitnessSha256,
      diagnostics,
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
    blocker_certificate: ok
      ? null
      : {
          blocker_code: status,
          replayable_next_action: providerHelperCollectionReplayableNextAction(status),
          proof_authority: "none"
        },
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  };

  mkdirSync(dirname(absoluteCollectionPath), { recursive: true });
  writeFileSync(absoluteCollectionPath, canonicalJson(helperCollection), "utf8");
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "agent_adapter.os_isolation_provider_helper_collected",
    actor: sanitizeReviewText(input.actor),
    target_id: input.project_id,
    payload: {
      collection_id: collectionId,
      helper_execution_id: input.helper_execution_id,
      runner_id: input.runner_id,
      launch_id: input.launch_id,
      adapter_id: input.adapter_id,
      backend,
      ok,
      collection_status: status,
      provider,
      probe_id: probe?.probe_id ?? null,
      evidence_path: probe?.evidence_path ?? null,
      hashes_match_helper_execution: hashesMatch,
      os_enforcement_complete: osEnforcementCompleteness.complete,
      incomplete_os_enforcement_facts: osEnforcementCompleteness.incompleteFacts,
      runtime_attestation_bound: runtimeAttestationBound,
      host_capability_bound: hostCapabilityBinding.bound,
      host_validation_id: hostCapabilityBinding.host_validation_id,
      host_capability_probe_id: hostCapabilityBinding.host_capability_probe_id,
      host_capability_status: hostCapabilityBinding.host_capability_status,
      provider_tool_execution_witness_bound: providerToolWitnessBound,
      provider_tool_execution_witness_sha256: providerToolWitnessSha256,
      provider_specific_tool_execution_required: providerSpecificToolExecutionRequired,
      provider_specific_tool_execution_bound: providerSpecificToolExecutionRequired
        ? providerSpecificToolExecutionBound
        : false,
      provider_specific_tool_name: providerSpecificTool?.name ?? null,
      provider_family_os_enforcement_witness_bound: providerFamilyOsEnforcementWitnessBound,
      provider_family_os_enforcement_witness_sha256: providerFamilyOsEnforcementWitnessHash,
      provider_family_execution_profile_bound: providerFamilyExecutionProfileBound,
      provider_family_execution_kind: providerFamilyExecutionKind,
      provider_family_execution_profile_sha256: providerFamilyExecutionProfileSha256,
      provider_family_execution_argv_sha256: providerFamilyExecutionArgvSha256,
      provider_specific_live_probe_attempt_bound: providerSpecificLiveProbeAttemptBound,
      provider_specific_live_probe_attempt_sha256: providerSpecificLiveProbeAttemptSha256,
      provider_specific_live_probe_execution_bound: providerSpecificLiveProbeExecutionBound,
      provider_specific_live_probe_execution_sha256: providerSpecificLiveProbeExecutionSha256,
      provider_control_plane_execution_witness_bound: providerControlPlaneExecutionWitnessBound,
      provider_control_plane_execution_witness_sha256: providerControlPlaneExecutionWitnessSha256,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  });
  return helperCollection;
}

export function runAgentAdapterOsIsolationSandboxExecutionProbe(
  projectRoot: string,
  input: AgentAdapterOsIsolationSandboxExecutionInput,
  options: AgentAdapterOsIsolationSandboxExecutionOptions = {}
): AgentAdapterOsIsolationSandboxExecution {
  getAgentAdapterPackage(input.adapter_id);
  const executionId = assertSandboxExecutionId(input.execution_id);
  const backend = assertBackend(input.backend);
  const path = sandboxExecutionPath(executionId);
  const absoluteExecutionPath = assertPathAllowed(projectRoot, path, { purpose: "runtime-write" });
  if (existsSync(absoluteExecutionPath)) {
    throw new ComathError("adapter OS-isolation sandbox execution already exists", {
      statusCode: 409,
      code: "AGENT_ADAPTER_OS_ISOLATION_SANDBOX_EXECUTION_ALREADY_EXISTS"
    });
  }

  const launchBundle = readSandboxLaunchArtifact(projectRoot, input.launch_id);
  const launchReady = sandboxLaunchIsReadyForExecution(launchBundle);
  const { requestedProvider, knownProvider } = normalizeRequestedProvider(
    input.requested_provider ?? launchBundle?.launch.requested_provider
  );
  const provider = launchBundle?.launch.provider ?? knownProvider ?? "unknown";
  const launchMatches = sandboxLaunchMatchesExecutionInput({
    launchBundle,
    projectId: input.project_id,
    launchId: input.launch_id,
    adapterId: input.adapter_id,
    backend,
    provider
  });

  const readyLaunchBundle = launchReady && launchMatches ? launchBundle : null;
  const collection = readyLaunchBundle
    ? options.execution_probe?.({
        project_root: projectRoot,
        project_id: input.project_id,
        execution_id: executionId,
        launch_id: input.launch_id,
        launch_path: readyLaunchBundle.launch.launch_path,
        adapter_id: input.adapter_id,
        backend,
        provider,
        launcher_binary_sha256: readyLaunchBundle.launch.launcher_preflight.launcher_binary_sha256 as string,
        platform: input.execution_environment?.platform
      }) ?? undefined
    : undefined;
  const probe = readyLaunchBundle
    ? probeAgentAdapterOsIsolation(projectRoot, {
        project_id: input.project_id,
        probe_id: executionId,
        adapter_id: input.adapter_id,
        backend,
        actor: input.actor,
        requested_provider: provider,
        probe_environment: {
          provider_available: true,
          platform: input.execution_environment?.platform,
          notes: input.execution_environment?.notes
        }
      }, {
        collector: () => executionCollectionForProbe(collection)
      })
    : null;
  const fallbackStatus: AgentAdapterOsIsolationSandboxExecutionStatus = !launchReady
    ? "blocked_sandbox_launch_preflight_missing"
    : "blocked_sandbox_launch_binding_mismatch";
  const executionStatus = executionStatusFromProbe(probe, fallbackStatus);
  const ok = executionStatus === "sandbox_execution_probe_collected";
  const diagnostics = [
    input.execution_environment?.platform ? `platform=${sanitizeProbeText(input.execution_environment.platform)}` : undefined,
    input.execution_environment?.notes ? sanitizeProbeText(input.execution_environment.notes) : undefined,
    ...sanitizeDiagnostics(collection?.diagnostics),
    ok
      ? "Service-owned sandbox execution probe collected OS-enforcement evidence."
      : "No service-owned sandbox execution probe collection was accepted."
  ].filter((entry): entry is string => Boolean(entry));
  const execution: AgentAdapterOsIsolationSandboxExecution = {
    schema_version: "comath.agent_adapter_os_isolation_sandbox_execution.v1",
    execution_id: executionId,
    project_id: input.project_id,
    launch_id: input.launch_id,
    adapter_id: input.adapter_id,
    backend,
    created_at: new Date().toISOString(),
    ok,
    execution_status: executionStatus,
    requested_provider: sanitizeProbeText(requestedProvider) || "unknown",
    provider,
    execution_path: path,
    launch_artifact: launchBundle?.artifact ?? null,
    probe,
    execution_probe: {
      probe_source: collection?.probe_source === "service_owned_sandbox_execution_probe"
        ? "service_owned_sandbox_execution_probe"
        : "missing",
      diagnostics
    },
    adapter_execution_isolation: {
      required_for_ga: true,
      current_boundary: ok ? "os_enforced" : "process_boundary_only",
      os_enforced: ok,
      provider,
      claims_runtime_enforcement: false,
      proof_authority: "none"
    },
    blocker_certificate: ok
      ? null
      : {
          blocker_code: executionStatus,
          replayable_next_action: executionReplayableNextAction(executionStatus),
          proof_authority: "none"
        },
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  };

  mkdirSync(dirname(absoluteExecutionPath), { recursive: true });
  writeFileSync(absoluteExecutionPath, canonicalJson(execution), "utf8");
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "agent_adapter.os_isolation_sandbox_execution_probed",
    actor: sanitizeReviewText(input.actor),
    target_id: input.project_id,
    payload: {
      execution_id: executionId,
      launch_id: input.launch_id,
      adapter_id: input.adapter_id,
      backend,
      ok,
      execution_status: executionStatus,
      provider,
      probe_id: probe?.probe_id ?? null,
      evidence_path: probe?.evidence_path ?? null,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  });
  return execution;
}

export function probeAgentAdapterOsIsolation(
  projectRoot: string,
  input: AgentAdapterOsIsolationProbeInput,
  options: AgentAdapterOsIsolationProbeOptions = {}
): AgentAdapterOsIsolationProbe {
  getAgentAdapterPackage(input.adapter_id);
  const probeId = assertProbeId(input.probe_id);
  const backend = assertBackend(input.backend);
  const path = probePath(probeId);
  const evidencePath = probeEvidencePath(probeId);
  const absoluteProbePath = assertPathAllowed(projectRoot, path, { purpose: "runtime-write" });
  const absoluteEvidencePath = assertPathAllowed(projectRoot, evidencePath, { purpose: "runtime-write" });
  if (existsSync(absoluteProbePath) || existsSync(absoluteEvidencePath)) {
    throw new ComathError("adapter OS-isolation probe already exists", {
      statusCode: 409,
      code: "AGENT_ADAPTER_OS_ISOLATION_PROBE_ALREADY_EXISTS"
    });
  }

  const providerAvailable = input.probe_environment?.provider_available === true;
  const { requestedProvider, knownProvider } = normalizeRequestedProvider(input.requested_provider);
  const classified = classifyProbe({ knownProvider, providerAvailable });
  const collection = options.collector?.({
    project_root: projectRoot,
    project_id: input.project_id,
    probe_id: probeId,
    adapter_id: input.adapter_id,
    backend,
    requested_provider: requestedProvider,
    provider: knownProvider,
    provider_available: providerAvailable
  }) ?? undefined;
  const collected = isCollectedOsIsolationProbe({ knownProvider, providerAvailable, collection });
  const probeStatus: AgentAdapterOsIsolationProbeStatus = collected
    ? "os_isolation_probe_collected"
    : classified.status;
  const observedProvider = collected ? knownProvider as AgentAdapterOsIsolationProvider : classified.observedProvider;
  const notes = [
    input.probe_environment?.platform ? `platform=${sanitizeProbeText(input.probe_environment.platform)}` : undefined,
    input.probe_environment?.notes ? sanitizeProbeText(input.probe_environment.notes) : undefined,
    collection?.notes ? sanitizeProbeText(collection.notes) : undefined,
    collected
      ? "Service-owned OS-enforced adapter execution probe collection was recorded."
      : "No complete OS-enforced adapter execution probe collection was recorded."
  ]
    .filter((entry): entry is string => Boolean(entry))
    .join(" ");

  const evidence: AgentAdapterOsIsolationProbe["evidence"] = {
    schema_version: "comath.agent_adapter_os_isolation_evidence.v1",
    kind: "agent_adapter_os_isolation_evidence",
    probe_id: probeId,
    probe_status: probeStatus,
    adapter_id: input.adapter_id,
    backend,
    provider: observedProvider,
    evidence_source: "service_owned_probe",
    process_isolation_enforced: collectionBoolean(collection, "process_isolation_enforced", collected),
    filesystem_scope_enforced: collectionBoolean(collection, "filesystem_scope_enforced", collected),
    network_isolation_enforced: collectionBoolean(collection, "network_isolation_enforced", collected),
    no_new_privileges: collectionBoolean(collection, "no_new_privileges", collected),
    escape_prevention: collectionBoolean(collection, "escape_prevention", collected),
    host_path_leak_free: true,
    secret_free: true,
    notes,
    ...collectedEvidenceDetails(collection, collected),
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  };
  const evidenceText = canonicalJson(evidence);
  const evidenceArtifact: AgentAdapterOsIsolationEvidenceArtifact = {
    kind: "agent_adapter_os_isolation_evidence",
    path: evidencePath,
    sha256: sha256Text(evidenceText),
    size_bytes: Buffer.byteLength(evidenceText, "utf8")
  };
  const probe: AgentAdapterOsIsolationProbe = {
    schema_version: "comath.agent_adapter_os_isolation_probe.v1",
    probe_id: probeId,
    project_id: input.project_id,
    adapter_id: input.adapter_id,
    backend,
    created_at: new Date().toISOString(),
    ok: collected,
    probe_status: probeStatus,
    requested_provider: sanitizeProbeText(requestedProvider) || "unknown",
    observed_provider: observedProvider,
    provider_available: providerAvailable,
    probe_path: path,
    evidence_path: evidencePath,
    evidence_artifact: evidenceArtifact,
    evidence,
    adapter_execution_isolation: {
      required_for_ga: true,
      current_boundary: collected ? "os_enforced" : "process_boundary_only",
      os_enforced: collected,
      provider: observedProvider,
      claims_runtime_enforcement: false,
      proof_authority: "none"
    },
    blocker_certificate: collected
      ? null
      : {
          blocker_code: probeStatus,
          replayable_next_action: "Run a service-owned OS-enforced adapter execution probe on a host with a configured sandbox provider, then submit the resulting evidence artifact to the readiness review gate.",
          proof_authority: "none"
        },
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  };

  mkdirSync(dirname(absoluteEvidencePath), { recursive: true });
  writeFileSync(absoluteEvidencePath, evidenceText, "utf8");
  mkdirSync(dirname(absoluteProbePath), { recursive: true });
  writeFileSync(absoluteProbePath, canonicalJson(probe), "utf8");
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "agent_adapter.os_isolation_probed",
    actor: sanitizeReviewText(input.actor),
    target_id: input.project_id,
    payload: {
      probe_id: probeId,
      adapter_id: input.adapter_id,
      backend,
      ok: collected,
      probe_status: probeStatus,
      requested_provider: probe.requested_provider,
      observed_provider: observedProvider,
      provider_available: providerAvailable,
      evidence_path: evidencePath,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  });
  return probe;
}

export function reviewAgentAdapterOsIsolationReadiness(
  projectRoot: string,
  input: AgentAdapterOsIsolationReviewInput
): AgentAdapterOsIsolationReview {
  getAgentAdapterPackage(input.adapter_id);
  const reviewId = assertReviewId(input.review_id);
  const backend = input.backend ?? "bundled";
  const path = reviewPath(reviewId);
  const absoluteReviewPath = assertPathAllowed(projectRoot, path, { purpose: "runtime-write" });
  if (existsSync(absoluteReviewPath)) {
    throw new ComathError("adapter OS-isolation readiness review already exists", {
      statusCode: 409,
      code: "AGENT_ADAPTER_OS_ISOLATION_REVIEW_ALREADY_EXISTS"
    });
  }
  const evidenceBundle = input.evidence_path ? readEvidenceArtifact(projectRoot, input.evidence_path) : undefined;
  const evidence = evidenceBundle?.evidence;
  const provider = evidence?.provider ?? null;
  const providerOsEnforced = provider ? osEnforcedProviders.has(provider) : false;
  const hostPathSecretFree = evidenceBundle ? !evidenceLeaksHostPathOrSecret(evidenceBundle.text, evidence as AgentAdapterOsIsolationEvidence) : false;
  const nonAuthority = evidence ? !evidenceOverclaimsAuthority(evidence) : false;
  const providerHelperCollection = evidence?.probe_id
    ? readProviderHelperCollectionManifest(projectRoot, evidence.probe_id)
    : null;
  const providerToolWitnessRequired = providerHelperCollectionRequiresProviderToolExecutionWitness(
    providerHelperCollection,
    evidence
  );
  const providerSpecificToolExecutionRequired = providerHelperCollectionRequiresProviderSpecificToolExecution(
    providerHelperCollection,
    evidence
  );
  const providerFamilyOsEnforcementWitnessRequired = providerHelperCollectionRequiresProviderFamilyOsEnforcementWitness(
    providerHelperCollection,
    evidence
  );
  const providerFamilyExecutionProfileRequired = providerHelperCollectionRequiresProviderFamilyExecutionProfile(
    providerHelperCollection,
    evidence
  );
  const providerSpecificLiveProbeAttemptRequired = providerHelperCollectionRequiresProviderSpecificLiveProbeAttempt(
    providerHelperCollection,
    evidence
  );
  const providerSpecificLiveProbeExecutionRequired = providerHelperCollectionRequiresProviderSpecificLiveProbeExecution(
    providerHelperCollection,
    evidence
  );
  const providerControlPlaneExecutionWitnessRequired = providerHelperCollectionRequiresProviderControlPlaneExecutionWitness(
    providerHelperCollection,
    evidence
  );
  const providerToolWitnessBound = !providerToolWitnessRequired ||
    (
      evidenceHasProviderToolExecutionWitnessFields(evidence) &&
      (
        providerHelperCollection
          ? providerHelperCollectionHasProviderToolExecutionWitness(providerHelperCollection, evidence)
          : true
      )
    );
  const providerSpecificToolExecutionBound = !providerSpecificToolExecutionRequired ||
    (
      evidenceHasProviderSpecificToolExecutionFields(evidence) &&
      (
        providerHelperCollection
          ? providerHelperCollectionHasProviderSpecificToolExecution(providerHelperCollection, evidence) &&
            providerHelperCollectionHasCurrentHostCapabilityProviderSpecificTool({
              projectRoot,
              collection: providerHelperCollection,
              evidence
            })
          : true
      )
    );
  const providerFamilyOsEnforcementWitnessBound = !providerFamilyOsEnforcementWitnessRequired ||
    (
      evidenceHasProviderFamilyOsEnforcementWitnessFields(evidence) &&
      (
        providerHelperCollection
          ? providerHelperCollectionHasProviderFamilyOsEnforcementWitness(providerHelperCollection, evidence)
          : true
      )
    );
  const providerFamilyExecutionProfileBound = !providerFamilyExecutionProfileRequired ||
    (
      evidenceHasProviderFamilyExecutionProfileFields(evidence) &&
      (
        providerHelperCollection
          ? providerHelperCollectionHasProviderFamilyExecutionProfile(providerHelperCollection, evidence)
        : true
      )
    );
  const providerSpecificLiveProbeAttemptBound = !providerSpecificLiveProbeAttemptRequired ||
    (
      evidenceHasProviderSpecificLiveProbeAttemptFields(evidence) &&
      (
        providerHelperCollection
          ? providerHelperCollectionHasProviderSpecificLiveProbeAttempt(providerHelperCollection, evidence)
        : true
      )
    );
  const providerSpecificLiveProbeExecutionBound = !providerSpecificLiveProbeExecutionRequired ||
    (
      evidenceHasProviderSpecificLiveProbeExecutionFields(evidence) &&
      (
        providerHelperCollection
          ? providerHelperCollectionHasProviderSpecificLiveProbeExecution(providerHelperCollection, evidence)
          : true
      )
    );
  const providerControlPlaneExecutionWitnessBound = !providerControlPlaneExecutionWitnessRequired ||
    (
      evidenceHasProviderControlPlaneExecutionWitnessFields(evidence) &&
      (
        providerHelperCollection
          ? providerHelperCollectionHasProviderControlPlaneExecutionWitness(providerHelperCollection, evidence)
          : true
      )
    );
  const checks: AgentAdapterOsIsolationReview["checks"] = {
    evidence_artifact_bound: check(Boolean(evidenceBundle), evidenceBundle ? evidenceBundle.artifact.path : null),
    provider_os_enforced: check(providerOsEnforced, provider),
    process_isolation: check(evidence?.process_isolation_enforced === true, evidence?.process_isolation_enforced ?? null),
    filesystem_isolation: check(evidence?.filesystem_scope_enforced === true, evidence?.filesystem_scope_enforced ?? null),
    network_isolation: check(evidence?.network_isolation_enforced === true, evidence?.network_isolation_enforced ?? null),
    no_new_privileges: check(evidence?.no_new_privileges === true, evidence?.no_new_privileges ?? null),
    escape_prevention: check(evidence?.escape_prevention === true, evidence?.escape_prevention ?? null),
    adapter_binding: check(evidenceAdapterMatches(evidence, input.adapter_id), evidence?.adapter_id ?? null),
    backend_binding: check(evidenceBackendMatches(evidence, backend), evidence?.backend ?? null),
    service_owned_probe: check(evidenceIsServiceOwnedProbe(evidence), evidence?.evidence_source ?? null),
    collected_probe_binding: check(
      evidenceHasCollectedProbeBinding(projectRoot, evidenceBundle?.artifact, evidence),
      evidence?.probe_id ?? null
    ),
    provider_tool_execution_witness: check(
      providerToolWitnessBound,
      providerToolWitnessRequired ? evidence?.provider_tool_execution_witness_sha256 ?? null : "not_required"
    ),
    provider_specific_tool_execution: check(
      providerSpecificToolExecutionBound,
      providerSpecificToolExecutionRequired ? evidence?.provider_specific_tool_execution_sha256 ?? null : "not_required"
    ),
    provider_family_os_enforcement_witness: check(
      providerFamilyOsEnforcementWitnessBound,
      providerFamilyOsEnforcementWitnessRequired
        ? evidence?.provider_family_os_enforcement_witness_sha256 ?? null
        : "not_required"
    ),
    provider_family_execution_profile: check(
      providerFamilyExecutionProfileBound,
      providerFamilyExecutionProfileRequired
        ? evidence?.provider_family_execution_profile_sha256 ?? null
        : "not_required"
    ),
    provider_specific_live_probe_attempt: check(
      providerSpecificLiveProbeAttemptBound,
      providerSpecificLiveProbeAttemptRequired
        ? evidence?.provider_specific_live_probe_attempt_sha256 ?? null
        : "not_required"
    ),
    provider_specific_live_probe_execution: check(
      providerSpecificLiveProbeExecutionBound,
      providerSpecificLiveProbeExecutionRequired
        ? evidence?.provider_specific_live_probe_execution_sha256 ?? null
        : "not_required"
    ),
    provider_control_plane_execution_witness: check(
      providerControlPlaneExecutionWitnessBound,
      providerControlPlaneExecutionWitnessRequired
        ? evidence?.provider_control_plane_execution_witness_sha256 ?? null
        : "not_required"
    ),
    host_path_secret_free: check(hostPathSecretFree, hostPathSecretFree),
    non_authority: check(nonAuthority, nonAuthority)
  };
  const vetoes = buildVetoes({ evidencePresent: Boolean(evidenceBundle), checks, evidence, text: evidenceBundle?.text });
  const ok = vetoes.length === 0;
  const review: AgentAdapterOsIsolationReview = {
    schema_version: "comath.agent_adapter_os_isolation_readiness.v1",
    review_id: reviewId,
    project_id: input.project_id,
    adapter_id: input.adapter_id,
    backend,
    created_at: new Date().toISOString(),
    ok,
    readiness_status: ok ? "ready_for_os_isolation_release_review" : "blocked_missing_os_enforced_adapter_isolation",
    review_path: path,
    evidence_artifact: evidenceBundle?.artifact ?? null,
    checks,
    adapter_execution_isolation: {
      required_for_ga: true,
      current_boundary: ok ? "os_enforced" : "process_boundary_only",
      os_enforced: ok,
      provider,
      claims_runtime_enforcement: false,
      proof_authority: "none"
    },
    vetoes,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  };
  mkdirSync(dirname(absoluteReviewPath), { recursive: true });
  writeFileSync(absoluteReviewPath, canonicalJson(review), "utf8");
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "agent_adapter.os_isolation_reviewed",
    actor: sanitizeReviewText(input.actor),
    target_id: input.project_id,
    payload: {
      review_id: reviewId,
      adapter_id: input.adapter_id,
      backend,
      ok,
      readiness_status: review.readiness_status,
      evidence_path: evidenceBundle?.artifact.path ?? null,
      provider,
      os_enforced: ok,
      veto_codes: vetoes.map((veto) => veto.code),
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  });
  return review;
}
