import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
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
  proof_authority?: unknown;
  can_promote_claim?: unknown;
  can_certify_ga?: unknown;
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
  | "blocked_provider_helper_not_configured"
  | "blocked_provider_helper_binary_mismatch"
  | "blocked_provider_helper_launch_failed"
  | "blocked_provider_helper_execution_failed";

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

export type AgentAdapterOsIsolationProviderHelperExecution = {
  schema_version: "comath.agent_adapter_os_isolation_provider_helper_execution.v1";
  helper_execution_id: string;
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
  provider_helper_execution: {
    helper_source: "service_owned_provider_helper_config" | "missing";
    helper_configured: boolean;
    helper_binary_sha256: string | null;
    helper_version: string | null;
    helper_exit_code: number | null;
    helper_signal: string | null;
    timed_out: boolean;
    stdout_sha256: string | null;
    stderr_sha256: string | null;
    transcript_sha256: string | null;
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

function providerHelperExecutionPath(helperExecutionId: string): string {
  return normalizeRelativePath(join(".comath", "release", "agent-adapter-os-isolation", helperExecutionId, "provider-helper-execution.json"));
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
      isSha256(collection.transcript_sha256)
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
  return {
    resolution_source: "service_owned_provider_runner_resolver",
    runner_available: false,
    diagnostics: [
      `${input.provider} provider runner helper is not configured for platform=${sanitizeProbeText(input.platform ?? "unknown")}.`,
      "Configure a service-owned OS sandbox runner helper before collecting provider execution evidence."
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

function defaultProviderHelperConfigResolver(
  input: AgentAdapterOsIsolationProviderHelperConfigResolverInput
): AgentAdapterOsIsolationProviderHelperConfig {
  const providerEnvVar = providerHelperProgramEnvVar(input.provider);
  const configuredProgram = process.env[providerEnvVar] ?? process.env.COMATH_AGENT_ADAPTER_OSISO_PROVIDER_HELPER;
  if (!configuredProgram) {
    return {
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
  return {
    config_source: "service_owned_provider_helper_config",
    helper_available: true,
    helper_program: configuredProgram,
    helper_version: `${input.provider}-helper-env-configured`,
    timeout_ms: 10_000,
    diagnostics: [`${providerEnvVar} resolved to a service-owned helper executable.`]
  };
}

function sha256Bytes(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function sha256FileSync(path: string): { sha256: string; size_bytes: number } {
  const bytes = readFileSync(path);
  return { sha256: sha256Bytes(bytes), size_bytes: bytes.byteLength };
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

function providerHelperReplayableNextAction(status: AgentAdapterOsIsolationProviderHelperExecutionStatus): string {
  if (status === "blocked_provider_runner_manifest_missing") {
    return "Prepare a ready service-owned provider-runner manifest before executing the provider helper.";
  }
  if (status === "blocked_provider_runner_binding_mismatch") {
    return "Run provider helper execution with the exact project, adapter, backend, provider, launch, and runner bound by the ready provider-runner manifest.";
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
> {
  if (!collection || collection.collection_source !== "service_owned_os_probe") {
    return {};
  }
  return {
    collection_source: "service_owned_os_probe",
    adapter_process_exit_code: collected || typeof collection.adapter_process_exit_code === "number"
      ? collection.adapter_process_exit_code
      : undefined,
    stdout_sha256: isSha256(collection.stdout_sha256) ? collection.stdout_sha256.toLowerCase() : undefined,
    stderr_sha256: isSha256(collection.stderr_sha256) ? collection.stderr_sha256.toLowerCase() : undefined,
    transcript_sha256: isSha256(collection.transcript_sha256) ? collection.transcript_sha256.toLowerCase() : undefined
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
  const config = readyRunnerBundle
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
  const shouldSpawn = Boolean(configAccepted && helperHashMatches && helperProgram);
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
  const exitCode = typeof spawned?.status === "number" ? spawned.status : null;
  const signal = typeof spawned?.signal === "string" ? spawned.signal : null;
  const spawnError = spawned?.error as (Error & { code?: string }) | undefined;
  const launchFailed = Boolean(spawnError);
  const timedOut = spawnError?.code === "ETIMEDOUT";
  const status = helperExecutionStatus({
    runnerReady,
    runnerMatches,
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
        runner_id: input.runner_id,
        launch_id: input.launch_id,
        helper_binary_sha256: helperHash?.sha256 ?? null,
        helper_exit_code: exitCode,
        helper_signal: signal,
        stdout_sha256: stdoutSha256,
        stderr_sha256: stderrSha256,
        stdout_size_bytes: stdoutSize,
        stderr_size_bytes: stderrSize
      }))
    : null;
  const environmentPolicy = readyRunnerBundle?.runner.provider_runner_contract.environment_policy ?? providerRunnerEnvironmentPolicy(provider);
  const diagnostics = [
    input.helper_environment?.platform ? `platform=${sanitizeProbeText(input.helper_environment.platform)}` : undefined,
    input.helper_environment?.notes ? sanitizeProbeText(input.helper_environment.notes) : undefined,
    ...sanitizeDiagnostics(config?.diagnostics),
    spawnError?.message ? sanitizeProbeText(spawnError.message) : undefined,
    ok
      ? "Service-owned provider helper process executed with fixed argv/env and hash-bound runner binary."
      : "No service-owned provider helper execution evidence was accepted as readiness evidence."
  ].filter((entry): entry is string => Boolean(entry));

  const helperExecution: AgentAdapterOsIsolationProviderHelperExecution = {
    schema_version: "comath.agent_adapter_os_isolation_provider_helper_execution.v1",
    helper_execution_id: helperExecutionId,
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
    provider_helper_execution: {
      helper_source: configAccepted ? "service_owned_provider_helper_config" : "missing",
      helper_configured: configAccepted,
      helper_binary_sha256: helperHash?.sha256 ?? null,
      helper_version: configAccepted && typeof config?.helper_version === "string"
        ? sanitizeProbeText(config.helper_version)
        : null,
      helper_exit_code: attempted ? exitCode : null,
      helper_signal: attempted ? signal : null,
      timed_out: timedOut,
      stdout_sha256: attempted ? stdoutSha256 : null,
      stderr_sha256: attempted ? stderrSha256 : null,
      transcript_sha256: attempted ? transcriptSha256 : null,
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
      runner_id: input.runner_id,
      launch_id: input.launch_id,
      adapter_id: input.adapter_id,
      backend,
      ok,
      helper_execution_status: status,
      provider,
      provider_helper_attempted: attempted,
      helper_exit_code: attempted ? exitCode : null,
      stdout_sha256: attempted ? stdoutSha256 : null,
      stderr_sha256: attempted ? stderrSha256 : null,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  });
  return helperExecution;
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
