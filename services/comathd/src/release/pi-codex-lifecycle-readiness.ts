import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { existsSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { validateCodexApiAccountNetworkConnectivity } from "../agents/agent-adapter-packages.js";
import { ComathError } from "../errors.js";
import { assertPathAllowed } from "../security/path-policy.js";
import { canonicalJson, scrubHostPaths, sha256Text } from "../verification/runner-contracts.js";

export type PiCodexLifecycleInstallSessionEvidence = {
  session_kind:
    | "phase45_local_fake_pi_http_e2e"
    | "real_pi_host_manual_install"
    | "real_pi_host_automated_install"
    | "unknown";
  pi_host_kind: "fake_pi_host" | "real_pi_host" | "unknown";
  runtime_entrypoint_imported: boolean;
  runtime_registered: boolean;
  host_confirmation_observed: boolean;
  comathd_server_kind: "ephemeral_test_http_server" | "durable_service" | "manual_shell" | "unknown";
  service_start_observed: boolean;
  service_stop_observed: boolean;
  service_restart_observed: boolean;
};

export type PiCodexLifecycleCodexEvidence = {
  installed_cli_validation_ok: boolean;
  installed_cli_probe_source: "service_owned_process" | "injected_fake_cli" | "not_run";
  codex_api_account_network_validation:
    | "passed"
    | "not_run"
    | "injected_fake"
    | "blocked_missing_credentials"
    | "blocked_network_or_account_failure";
};

export type PiCodexLifecycleReadinessInput = {
  project_id: string;
  review_id?: string;
  actor: string;
  install_session_evidence?: PiCodexLifecycleInstallSessionEvidence;
  codex_evidence?: PiCodexLifecycleCodexEvidence;
};

export type PiCodexLifecycleReadinessCheck = {
  ok: boolean;
  required: true;
  observed: string;
};

export type PiCodexLifecycleReadinessVeto = {
  code: string;
  message: string;
};

export type PiCodexLifecycleReadinessReview = {
  schema_version: "comath.pi_codex_lifecycle_readiness.v1";
  review_id: string;
  project_id: string;
  created_at: string;
  ok: boolean;
  readiness_status: "ready_for_real_host_lifecycle_release_review" | "blocked_missing_real_host_lifecycle_validation";
  review_path: string;
  inputs: {
    install_session_evidence: PiCodexLifecycleInstallSessionEvidence;
    codex_evidence: PiCodexLifecycleCodexEvidence;
  };
  checks: {
    real_pi_host_runtime: PiCodexLifecycleReadinessCheck;
    durable_comathd_service_lifecycle: PiCodexLifecycleReadinessCheck;
    production_codex_validation: PiCodexLifecycleReadinessCheck;
  };
  vetoes: PiCodexLifecycleReadinessVeto[];
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
};

export type PiCodexLifecycleEvidenceArtifactKind =
  | "pi_install_transcript"
  | "runtime_registration_snapshot"
  | "durable_service_lifecycle_log"
  | "codex_validation_report";

export type PiCodexLifecycleEvidenceArtifact = {
  kind: PiCodexLifecycleEvidenceArtifactKind;
  path: string;
  sha256: string;
  size_bytes: number;
};

export type PiCodexLifecycleEvidenceInput = {
  project_id: string;
  evidence_id?: string;
  actor: string;
  install_session_evidence: PiCodexLifecycleInstallSessionEvidence;
  codex_evidence: PiCodexLifecycleCodexEvidence;
  artifact_paths: {
    pi_install_transcript_path: string;
    runtime_registration_snapshot_path: string;
    service_lifecycle_log_path: string;
    codex_validation_report_path: string;
  };
};

export type PiCodexLifecycleEvidenceBundle = {
  schema_version: "comath.pi_codex_lifecycle_evidence.v1";
  evidence_id: string;
  project_id: string;
  created_at: string;
  collection_status: "evidence_ready_for_readiness_review" | "blocked_missing_real_host_lifecycle_evidence";
  evidence_path: string;
  artifacts: PiCodexLifecycleEvidenceArtifact[];
  readiness_input: {
    project_id: string;
    install_session_evidence: PiCodexLifecycleInstallSessionEvidence;
    codex_evidence: PiCodexLifecycleCodexEvidence;
  };
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
};

export type PiCodexLifecycleServiceCommandName = "start" | "status" | "stop" | "restart";

export type PiCodexLifecycleServiceProbeStep =
  | "start"
  | "status_after_start"
  | "stop"
  | "restart"
  | "status_after_restart";

export type PiCodexLifecycleServiceProbeCommandInput = {
  program: string;
  args?: string[];
  expected_exit_code?: number;
  timeout_ms?: number;
};

export type PiCodexLifecycleServiceProbeInput = {
  project_id: string;
  probe_id?: string;
  actor: string;
  service_label: string;
  timeout_ms?: number;
  commands: Partial<Record<PiCodexLifecycleServiceCommandName, PiCodexLifecycleServiceProbeCommandInput>>;
};

export type PiCodexLifecycleServiceProbeRunnerCommand = {
  program: string;
  args: string[];
  timeout_ms: number;
  shell: false;
  network: false;
};

export type PiCodexLifecycleServiceProbeRunnerResult = {
  exit_code: number | null;
  signal: NodeJS.Signals | null;
  timed_out: boolean;
  stdout: string;
  stderr: string;
};

export type PiCodexLifecycleServiceProbeRunner = (
  command: PiCodexLifecycleServiceProbeRunnerCommand,
  step: PiCodexLifecycleServiceProbeStep
) => PiCodexLifecycleServiceProbeRunnerResult;

export type PiCodexLifecycleServiceProbeOptions = {
  runner?: PiCodexLifecycleServiceProbeRunner;
};

export type PiCodexRealPiRuntimeProbeStep = "install" | "runtime_registration" | "host_confirmation";

export type PiCodexRealPiRuntimeProbeCommandName = PiCodexRealPiRuntimeProbeStep;

export type PiCodexRealPiRuntimeProbeInput = {
  project_id: string;
  probe_id?: string;
  actor: string;
  pi_host_label: string;
  pi_host_kind?: "real_pi_host" | "fake_pi_host" | "unknown";
  session_kind: PiCodexLifecycleInstallSessionEvidence["session_kind"];
  timeout_ms?: number;
  commands: Partial<Record<PiCodexRealPiRuntimeProbeCommandName, PiCodexLifecycleServiceProbeCommandInput>>;
};

export type PiCodexRealPiRuntimeProbeRunnerCommand = PiCodexLifecycleServiceProbeRunnerCommand;

export type PiCodexRealPiRuntimeProbeRunnerResult = PiCodexLifecycleServiceProbeRunnerResult;

export type PiCodexRealPiRuntimeProbeRunner = (
  command: PiCodexRealPiRuntimeProbeRunnerCommand,
  step: PiCodexRealPiRuntimeProbeStep
) => PiCodexRealPiRuntimeProbeRunnerResult;

export type PiCodexRealPiRuntimeProbeOptions = {
  runner?: PiCodexRealPiRuntimeProbeRunner;
};

export type PiCodexRealPiRuntimeProbeCommandRecord = {
  step: PiCodexRealPiRuntimeProbeStep;
  command_name: PiCodexRealPiRuntimeProbeCommandName;
  program_label: string;
  program_path_sha256: string;
  args_count: number;
  args_sha256: string;
  expected_exit_code: number;
  exit_code: number | null;
  signal: NodeJS.Signals | null;
  timed_out: boolean;
  ok: boolean;
  stdout: string;
  stderr: string;
  duration_ms: number;
};

export type PiCodexRealPiRuntimeProbeVeto = {
  code: string;
  message: string;
};

export type PiCodexRealPiRuntimeProbeInstallArtifact = {
  kind: "pi_install_transcript";
  path: string;
  sha256: string;
  size_bytes: number;
};

export type PiCodexRealPiRuntimeProbeRegistrationArtifact = {
  kind: "runtime_registration_snapshot";
  path: string;
  sha256: string;
  size_bytes: number;
};

export type PiCodexRealPiRuntimeProbeArtifact =
  | PiCodexRealPiRuntimeProbeInstallArtifact
  | PiCodexRealPiRuntimeProbeRegistrationArtifact;

export type PiCodexRealPiRuntimeProbeResult = {
  schema_version: "comath.pi_codex_real_pi_install_runtime_probe.v1";
  probe_id: string;
  project_id: string;
  pi_host_label: string;
  created_at: string;
  ok: boolean;
  probe_status: "real_pi_install_runtime_observed" | "blocked_real_pi_install_runtime_probe_failed";
  pi_install_transcript_path: string;
  runtime_registration_snapshot_path: string;
  pi_install_artifact: PiCodexRealPiRuntimeProbeInstallArtifact;
  runtime_registration_artifact: PiCodexRealPiRuntimeProbeRegistrationArtifact;
  readiness_fragment: Pick<
    PiCodexLifecycleInstallSessionEvidence,
    | "session_kind"
    | "pi_host_kind"
    | "runtime_entrypoint_imported"
    | "runtime_registered"
    | "host_confirmation_observed"
  >;
  commands: PiCodexRealPiRuntimeProbeCommandRecord[];
  vetoes: PiCodexRealPiRuntimeProbeVeto[];
  shell: false;
  network: false;
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
};

type PiCodexRealPiRuntimeProbeArtifactBody = Omit<
  PiCodexRealPiRuntimeProbeResult,
  "pi_install_artifact" | "runtime_registration_artifact"
>;

export type PiCodexLifecycleServiceProbeCommandRecord = {
  step: PiCodexLifecycleServiceProbeStep;
  command_name: PiCodexLifecycleServiceCommandName;
  program_label: string;
  program_path_sha256: string;
  args_count: number;
  args_sha256: string;
  expected_exit_code: number;
  exit_code: number | null;
  signal: NodeJS.Signals | null;
  timed_out: boolean;
  ok: boolean;
  stdout: string;
  stderr: string;
  duration_ms: number;
};

export type PiCodexLifecycleServiceProbeVeto = {
  code: string;
  message: string;
};

export type PiCodexLifecycleServiceProbeArtifact = {
  kind: "durable_service_lifecycle_log";
  path: string;
  sha256: string;
  size_bytes: number;
};

export type PiCodexLifecycleServiceProbeResult = {
  schema_version: "comath.pi_codex_durable_service_lifecycle_probe.v1";
  probe_id: string;
  project_id: string;
  service_label: string;
  created_at: string;
  ok: boolean;
  probe_status: "durable_service_lifecycle_observed" | "blocked_service_lifecycle_probe_failed";
  service_lifecycle_log_path: string;
  service_lifecycle_artifact: PiCodexLifecycleServiceProbeArtifact;
  readiness_fragment: {
    comathd_server_kind: "durable_service";
    service_start_observed: boolean;
    service_stop_observed: boolean;
    service_restart_observed: boolean;
  };
  commands: PiCodexLifecycleServiceProbeCommandRecord[];
  vetoes: PiCodexLifecycleServiceProbeVeto[];
  shell: false;
  network: false;
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
};

type PiCodexLifecycleServiceProbeArtifactBody = Omit<
  PiCodexLifecycleServiceProbeResult,
  "service_lifecycle_artifact"
>;

export type PiCodexProductionCodexAccountNetworkProbeInput = {
  project_id: string;
  validation_id?: string;
  actor: string;
};

export type PiCodexProductionCodexAccountNetworkProbeVeto = {
  code: string;
  message: string;
};

export type PiCodexProductionCodexAccountNetworkProbeArtifact = {
  kind: "codex_validation_report";
  path: string;
  sha256: string;
  size_bytes: number;
};

export type PiCodexProductionCodexAccountNetworkProbeResult = {
  schema_version: "comath.pi_codex_production_codex_account_network_probe.v1";
  validation_id: string;
  project_id: string;
  created_at: string;
  ok: boolean;
  validation_status:
    | "production_codex_account_network_validation_passed"
    | "blocked_missing_codex_api_credentials"
    | "blocked_codex_api_account_network_validation_failed";
  account_network_validation: PiCodexLifecycleCodexEvidence["codex_api_account_network_validation"];
  credential_source: "service_env";
  base_url_host: string | null;
  model: string | null;
  response_id: string | null;
  status: number | null;
  attempts: number;
  statuses: number[];
  rate_limited: boolean;
  codex_validation_report_path: string;
  codex_validation_artifact: PiCodexProductionCodexAccountNetworkProbeArtifact;
  readiness_fragment: {
    codex_api_account_network_validation: PiCodexLifecycleCodexEvidence["codex_api_account_network_validation"];
  };
  vetoes: PiCodexProductionCodexAccountNetworkProbeVeto[];
  shell: false;
  network: true;
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
};

type PiCodexProductionCodexAccountNetworkProbeArtifactBody = Omit<
  PiCodexProductionCodexAccountNetworkProbeResult,
  "codex_validation_artifact"
>;

export type PiCodexLifecycleOperatorSessionStatus =
  | "recoverable_operator_session"
  | "blocked_operator_session"
  | "completed_operator_session";

export type PiCodexLifecycleOperatorSessionStep =
  | "real_pi_install_runtime_probe"
  | "durable_service_lifecycle_probe"
  | "codex_api_account_network_probe"
  | "lifecycle_evidence_intake"
  | "readiness_review";

export type PiCodexLifecycleOperatorSessionArtifactPathInput = {
  kind: PiCodexLifecycleEvidenceArtifactKind;
  path: string;
};

export type PiCodexLifecycleOperatorSessionInput = {
  project_id: string;
  session_id?: string;
  actor: string;
  session_status?: PiCodexLifecycleOperatorSessionStatus;
  pi_host_label?: string;
  session_kind?: PiCodexLifecycleInstallSessionEvidence["session_kind"];
  operator_cursor?: string;
  completed_steps?: PiCodexLifecycleOperatorSessionStep[];
  artifact_paths?: PiCodexLifecycleOperatorSessionArtifactPathInput[];
  last_result_summary?: unknown;
};

export type PiCodexLifecycleOperatorSessionManifestArtifact = {
  kind: "operator_session_manifest";
  path: string;
  sha256: string;
  size_bytes: number;
};

export type PiCodexLifecycleOperatorSessionManifest = {
  schema_version: "comath.pi_codex_lifecycle_operator_session.v1";
  session_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  updated_at: string;
  session_status: PiCodexLifecycleOperatorSessionStatus;
  pi_host_label?: string;
  session_kind: PiCodexLifecycleInstallSessionEvidence["session_kind"];
  operator_cursor: string;
  completed_steps: PiCodexLifecycleOperatorSessionStep[];
  artifact_refs: PiCodexLifecycleEvidenceArtifact[];
  last_result_summary: unknown;
  next_recommended_route: string;
  session_manifest_path: string;
  session_manifest_artifact: PiCodexLifecycleOperatorSessionManifestArtifact;
  durable_transport_provided: false;
  pi_direct_write_allowed: false;
  direct_trusted_state_mutation: false;
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
};

type PiCodexLifecycleOperatorSessionManifestBody = Omit<
  PiCodexLifecycleOperatorSessionManifest,
  "session_manifest_artifact"
>;

export type PiCodexLifecycleOperatorTransportKind =
  | "operator_polling_checkpoint"
  | "bounded_sse_snapshot"
  | "manual_terminal_resume"
  | "unknown";

export type PiCodexLifecycleOperatorTransportRecoveryCursor = {
  operator_event_cursor: string;
  stdout_cursor: string;
  stderr_cursor: string;
};

export type PiCodexLifecycleOperatorTransportRecoveryInput = {
  project_id: string;
  session_id: string;
  actor: string;
  transport_recovery_id?: string;
  session_manifest_path?: string;
  observed_route?: string;
  requested_cursor?: Partial<PiCodexLifecycleOperatorTransportRecoveryCursor>;
  client_epoch?: number;
  last_seen_event_id?: string;
  reconnect_reason?: string;
  transport_kind?: PiCodexLifecycleOperatorTransportKind;
};

export type PiCodexLifecycleOperatorTransportRecoveryArtifact = {
  kind: "operator_transport_recovery";
  path: string;
  sha256: string;
  size_bytes: number;
};

export type PiCodexLifecycleOperatorTransportRecovery = {
  schema_version: "comath.pi_codex_lifecycle_operator_transport_recovery.v1";
  transport_recovery_id: string;
  project_id: string;
  session_id: string;
  actor: string;
  created_at: string;
  recovery_status: "operator_transport_recovery_checkpoint_recorded";
  transport_kind: PiCodexLifecycleOperatorTransportKind;
  observed_route: string;
  requested_cursor: PiCodexLifecycleOperatorTransportRecoveryCursor;
  client_epoch: number;
  last_seen_event_id: string;
  reconnect_reason: string;
  session_manifest_path: string;
  session_manifest_artifact: PiCodexLifecycleOperatorSessionManifestArtifact;
  next_recommended_route: string;
  transport_recovery_path: string;
  transport_recovery_artifact: PiCodexLifecycleOperatorTransportRecoveryArtifact;
  durable_recovery_checkpoint_provided: true;
  durable_transport_provided: false;
  live_transport_open: false;
  indefinite_stream_open: false;
  long_lived_websocket_provided: false;
  long_lived_sse_provided: false;
  pi_direct_write_allowed: false;
  direct_trusted_state_mutation: false;
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
};

type PiCodexLifecycleOperatorTransportRecoveryBody = Omit<
  PiCodexLifecycleOperatorTransportRecovery,
  "transport_recovery_artifact"
>;

export type PiCodexLifecycleOperatorTransportLeaseKind =
  | "bounded_live_polling_lease"
  | "bounded_live_sse_lease"
  | "manual_terminal_polling_lease"
  | "unknown";

export type PiCodexLifecycleOperatorTransportLeaseInput = {
  project_id: string;
  session_id: string;
  actor: string;
  transport_recovery_id: string;
  transport_lease_id?: string;
  session_manifest_path?: string;
  transport_recovery_path?: string;
  lease_route?: string;
  requested_cursor?: Partial<PiCodexLifecycleOperatorTransportRecoveryCursor>;
  client_epoch?: number;
  heartbeat_interval_ms?: number;
  lease_ttl_ms?: number;
  last_seen_event_id?: string;
  open_reason?: string;
  transport_kind?: PiCodexLifecycleOperatorTransportLeaseKind;
};

export type PiCodexLifecycleOperatorTransportLeaseArtifact = {
  kind: "operator_transport_lease";
  path: string;
  sha256: string;
  size_bytes: number;
};

export type PiCodexLifecycleOperatorTransportLease = {
  schema_version: "comath.pi_codex_lifecycle_operator_transport_lease.v1";
  transport_lease_id: string;
  transport_recovery_id: string;
  project_id: string;
  session_id: string;
  actor: string;
  lease_started_at: string;
  lease_expires_at: string;
  lease_status: "bounded_operator_transport_lease_open";
  transport_kind: PiCodexLifecycleOperatorTransportLeaseKind;
  lease_route: string;
  requested_cursor: PiCodexLifecycleOperatorTransportRecoveryCursor;
  client_epoch: number;
  heartbeat_interval_ms: number;
  lease_ttl_ms: number;
  heartbeat_required: true;
  last_seen_event_id: string;
  open_reason: string;
  session_manifest_path: string;
  session_manifest_artifact: PiCodexLifecycleOperatorSessionManifestArtifact;
  transport_recovery_path: string;
  transport_recovery_artifact: PiCodexLifecycleOperatorTransportRecoveryArtifact;
  next_recommended_route: string;
  transport_lease_path: string;
  transport_lease_artifact: PiCodexLifecycleOperatorTransportLeaseArtifact;
  durable_recovery_checkpoint_required: true;
  bounded_live_transport_lease_provided: true;
  durable_transport_provided: false;
  live_transport_open: true;
  indefinite_stream_open: false;
  long_lived_websocket_provided: false;
  long_lived_sse_provided: false;
  pi_direct_write_allowed: false;
  direct_trusted_state_mutation: false;
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
};

type PiCodexLifecycleOperatorTransportLeaseBody = Omit<
  PiCodexLifecycleOperatorTransportLease,
  "transport_lease_artifact"
>;

export type PiCodexGuidedRealPiExecutionOutcome =
  | "operator_guided_run_observed"
  | "replayable_release_blocker_recorded";

export type PiCodexGuidedRealPiExecutionInput = {
  project_id: string;
  execution_id?: string;
  actor: string;
  real_pi_runtime_probe_id: string;
  pi_install_transcript_path: string;
  runtime_registration_snapshot_path: string;
  session_id: string;
  session_manifest_path?: string;
  transport_recovery_id: string;
  transport_recovery_path?: string;
  transport_lease_id: string;
  transport_lease_path?: string;
  pi_host_label?: string;
  observed_routes?: string[];
  operator_command_summary?: string;
  final_operator_cursor?: Partial<PiCodexLifecycleOperatorTransportRecoveryCursor>;
  execution_outcome?: PiCodexGuidedRealPiExecutionOutcome;
  next_recommended_route?: string;
};

export type PiCodexGuidedRealPiExecutionArtifact = {
  kind: "guided_real_pi_execution";
  path: string;
  sha256: string;
  size_bytes: number;
};

export type PiCodexGuidedRealPiExecution = {
  schema_version: "comath.pi_codex_guided_real_pi_execution.v1";
  execution_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  execution_status: "guided_real_pi_execution_recorded";
  execution_outcome: PiCodexGuidedRealPiExecutionOutcome;
  real_pi_runtime_probe_id: string;
  pi_host_label?: string;
  session_id: string;
  transport_recovery_id: string;
  transport_lease_id: string;
  observed_routes: string[];
  operator_command_summary: string;
  final_operator_cursor: PiCodexLifecycleOperatorTransportRecoveryCursor;
  next_recommended_route: string;
  required_preconditions: [
    "real_pi_runtime_probe_observed",
    "operator_session_manifest_bound",
    "operator_transport_recovery_checkpoint_bound",
    "bounded_operator_transport_lease_bound"
  ];
  pi_install_transcript_path: string;
  pi_install_artifact: PiCodexRealPiRuntimeProbeInstallArtifact;
  runtime_registration_snapshot_path: string;
  runtime_registration_artifact: PiCodexRealPiRuntimeProbeRegistrationArtifact;
  session_manifest_path: string;
  session_manifest_artifact: PiCodexLifecycleOperatorSessionManifestArtifact;
  transport_recovery_path: string;
  transport_recovery_artifact: PiCodexLifecycleOperatorTransportRecoveryArtifact;
  transport_lease_path: string;
  transport_lease_artifact: PiCodexLifecycleOperatorTransportLeaseArtifact;
  guided_execution_path: string;
  guided_execution_artifact: PiCodexGuidedRealPiExecutionArtifact;
  guided_real_pi_execution_observed: true;
  real_pi_runtime_probe_bound: true;
  operator_session_manifest_bound: true;
  operator_transport_recovery_bound: true;
  operator_transport_lease_bound: true;
  pi_direct_write_allowed: false;
  direct_trusted_state_mutation: false;
  durable_transport_provided: false;
  indefinite_stream_open: false;
  long_lived_websocket_provided: false;
  long_lived_sse_provided: false;
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
};

type PiCodexGuidedRealPiExecutionBody = Omit<PiCodexGuidedRealPiExecution, "guided_execution_artifact">;

const defaultInstallSessionEvidence: PiCodexLifecycleInstallSessionEvidence = {
  session_kind: "unknown",
  pi_host_kind: "unknown",
  runtime_entrypoint_imported: false,
  runtime_registered: false,
  host_confirmation_observed: false,
  comathd_server_kind: "unknown",
  service_start_observed: false,
  service_stop_observed: false,
  service_restart_observed: false
};

const defaultCodexEvidence: PiCodexLifecycleCodexEvidence = {
  installed_cli_validation_ok: false,
  installed_cli_probe_source: "not_run",
  codex_api_account_network_validation: "not_run"
};

const lifecycleProbeAllowedProgramsEnv = "COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS";
const lifecycleProbeOutputLimit = 16 * 1024;
const lifecycleProbeMaxTimeoutMs = 30_000;
const deniedShellProgramNames = new Set([
  "bash",
  "bash.exe",
  "cmd",
  "cmd.exe",
  "powershell",
  "powershell.exe",
  "pwsh",
  "pwsh.exe",
  "sh",
  "sh.exe"
]);
const deniedShellArgumentTokens = new Set(["-c", "/c", "-command", "--command", "-e", "--eval"]);

function normalizeRelativePath(value: string): string {
  return value.replace(/\\/g, "/");
}

function sha256Bytes(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function assertReviewId(value: string | undefined): string {
  const reviewId = value ?? `LIFE-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
  if (!/^[A-Za-z0-9._-]+$/.test(reviewId)) {
    throw new ComathError("invalid Pi/Codex lifecycle review id", {
      statusCode: 400,
      code: "PI_CODEX_LIFECYCLE_REVIEW_INVALID_ID"
    });
  }
  return reviewId;
}

function assertEvidenceId(value: string | undefined): string {
  const evidenceId = value ?? `LIFE-EVID-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
  if (!/^[A-Za-z0-9._-]+$/.test(evidenceId)) {
    throw new ComathError("invalid Pi/Codex lifecycle evidence id", {
      statusCode: 400,
      code: "PI_CODEX_LIFECYCLE_EVIDENCE_INVALID_ID"
    });
  }
  return evidenceId;
}

function assertProbeId(value: string | undefined): string {
  const probeId = value ?? `LIFE-PROBE-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
  if (!/^[A-Za-z0-9._-]+$/.test(probeId)) {
    throw new ComathError("invalid Pi/Codex lifecycle service probe id", {
      statusCode: 400,
      code: "PI_CODEX_LIFECYCLE_SERVICE_PROBE_INVALID_ID"
    });
  }
  return probeId;
}

function assertRealPiRuntimeProbeId(value: string | undefined): string {
  const probeId = value ?? `LIFE-PI-RUNTIME-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
  if (
    !/^[A-Za-z0-9._-]+$/.test(probeId) ||
    probeId === "." ||
    probeId === ".." ||
    probeId.split(".").some((segment) => segment.length === 0)
  ) {
    throw new ComathError("invalid Pi/Codex real-Pi runtime probe id", {
      statusCode: 400,
      code: "PI_CODEX_REAL_PI_RUNTIME_PROBE_INVALID_ID"
    });
  }
  return probeId;
}

function assertCodexValidationId(value: string | undefined): string {
  const validationId = value ?? `LIFE-CODEX-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
  if (
    !/^[A-Za-z0-9._-]+$/.test(validationId) ||
    validationId === "." ||
    validationId === ".." ||
    validationId.split(".").some((segment) => segment.length === 0)
  ) {
    throw new ComathError("invalid Pi/Codex lifecycle Codex API validation id", {
      statusCode: 400,
      code: "PI_CODEX_LIFECYCLE_CODEX_API_VALIDATION_INVALID_ID"
    });
  }
  return validationId;
}

function assertOperatorSessionId(value: string | undefined): string {
  const sessionId = value ?? `LIFE-OP-SESSION-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
  if (
    !/^[A-Za-z0-9._-]+$/.test(sessionId) ||
    sessionId === "." ||
    sessionId === ".." ||
    sessionId.split(".").some((segment) => segment.length === 0)
  ) {
    throw new ComathError("invalid Pi/Codex lifecycle operator session id", {
      statusCode: 400,
      code: "PI_CODEX_LIFECYCLE_OPERATOR_SESSION_INVALID_ID"
    });
  }
  return sessionId;
}

function assertOperatorTransportRecoveryId(value: string | undefined): string {
  const recoveryId = value ?? `LIFE-TRANSPORT-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
  if (
    !/^[A-Za-z0-9._-]+$/.test(recoveryId) ||
    recoveryId === "." ||
    recoveryId === ".." ||
    recoveryId.split(".").some((segment) => segment.length === 0)
  ) {
    throw new ComathError("invalid Pi/Codex lifecycle operator transport recovery id", {
      statusCode: 400,
      code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_RECOVERY_INVALID_ID"
    });
  }
  return recoveryId;
}

function assertOperatorTransportLeaseId(value: string | undefined): string {
  const leaseId = value ?? `LIFE-TRANSPORT-LEASE-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
  if (
    !/^[A-Za-z0-9._-]+$/.test(leaseId) ||
    leaseId === "." ||
    leaseId === ".." ||
    leaseId.split(".").some((segment) => segment.length === 0)
  ) {
    throw new ComathError("invalid Pi/Codex lifecycle operator transport lease id", {
      statusCode: 400,
      code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_LEASE_INVALID_ID"
    });
  }
  return leaseId;
}

function assertGuidedRealPiExecutionId(value: string | undefined): string {
  const executionId = value ?? `LIFE-GUIDED-EXEC-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
  if (
    !/^[A-Za-z0-9._-]+$/.test(executionId) ||
    executionId === "." ||
    executionId === ".." ||
    executionId.split(".").some((segment) => segment.length === 0)
  ) {
    throw new ComathError("invalid Pi/Codex guided real-Pi execution id", {
      statusCode: 400,
      code: "PI_CODEX_GUIDED_REAL_PI_EXECUTION_INVALID_ID"
    });
  }
  return executionId;
}

function assertGuidedRealPiExecutionOutcome(
  value: PiCodexGuidedRealPiExecutionInput["execution_outcome"]
): PiCodexGuidedRealPiExecutionOutcome {
  const outcome = value ?? "operator_guided_run_observed";
  if (outcome === "operator_guided_run_observed" || outcome === "replayable_release_blocker_recorded") {
    return outcome;
  }
  throw new ComathError("invalid Pi/Codex guided real-Pi execution outcome", {
    statusCode: 400,
    code: "PI_CODEX_GUIDED_REAL_PI_EXECUTION_INVALID_OUTCOME"
  });
}

function assertOperatorSessionProjectId(value: string): string {
  if (/^[A-Z]+-\d{4,}$/.test(value)) {
    return value;
  }
  throw new ComathError("invalid Pi/Codex lifecycle operator session project id", {
    statusCode: 400,
    code: "PI_CODEX_LIFECYCLE_OPERATOR_SESSION_INVALID_PROJECT_ID"
  });
}

function assertOperatorTransportKind(
  value: PiCodexLifecycleOperatorTransportRecoveryInput["transport_kind"]
): PiCodexLifecycleOperatorTransportKind {
  const kind = value ?? "unknown";
  if (
    kind === "operator_polling_checkpoint" ||
    kind === "bounded_sse_snapshot" ||
    kind === "manual_terminal_resume" ||
    kind === "unknown"
  ) {
    return kind;
  }
  throw new ComathError("invalid Pi/Codex lifecycle operator transport kind", {
    statusCode: 400,
    code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_RECOVERY_INVALID_KIND"
  });
}

function assertOperatorTransportLeaseKind(
  value: PiCodexLifecycleOperatorTransportLeaseInput["transport_kind"]
): PiCodexLifecycleOperatorTransportLeaseKind {
  const kind = value ?? "unknown";
  if (
    kind === "bounded_live_polling_lease" ||
    kind === "bounded_live_sse_lease" ||
    kind === "manual_terminal_polling_lease" ||
    kind === "unknown"
  ) {
    return kind;
  }
  throw new ComathError("invalid Pi/Codex lifecycle operator transport lease kind", {
    statusCode: 400,
    code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_LEASE_INVALID_KIND"
  });
}

function assertOperatorTransportClientEpoch(value: number | undefined): number {
  const epoch = value ?? 0;
  if (Number.isInteger(epoch) && epoch >= 0 && epoch <= Number.MAX_SAFE_INTEGER) {
    return epoch;
  }
  throw new ComathError("invalid Pi/Codex lifecycle operator transport client epoch", {
    statusCode: 400,
    code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_RECOVERY_INVALID_CLIENT_EPOCH"
  });
}

function assertOperatorTransportLeaseDuration(
  value: number | undefined,
  defaultValue: number,
  code: string
): number {
  const duration = value ?? defaultValue;
  if (Number.isInteger(duration) && duration > 0 && duration <= 300_000) {
    return duration;
  }
  throw new ComathError("invalid Pi/Codex lifecycle operator transport lease duration", {
    statusCode: 400,
    code
  });
}

function assertOperatorSessionStatus(
  value: PiCodexLifecycleOperatorSessionInput["session_status"]
): PiCodexLifecycleOperatorSessionStatus {
  const status = value ?? "recoverable_operator_session";
  if (
    status === "recoverable_operator_session" ||
    status === "blocked_operator_session" ||
    status === "completed_operator_session"
  ) {
    return status;
  }
  throw new ComathError("invalid Pi/Codex lifecycle operator session status", {
    statusCode: 400,
    code: "PI_CODEX_LIFECYCLE_OPERATOR_SESSION_INVALID_STATUS"
  });
}

function assertOperatorSessionStep(value: string): PiCodexLifecycleOperatorSessionStep {
  if (
    value === "real_pi_install_runtime_probe" ||
    value === "durable_service_lifecycle_probe" ||
    value === "codex_api_account_network_probe" ||
    value === "lifecycle_evidence_intake" ||
    value === "readiness_review"
  ) {
    return value;
  }
  throw new ComathError("invalid Pi/Codex lifecycle operator session step", {
    statusCode: 400,
    code: "PI_CODEX_LIFECYCLE_OPERATOR_SESSION_INVALID_STEP"
  });
}

function operatorSessionSteps(values: PiCodexLifecycleOperatorSessionInput["completed_steps"]): PiCodexLifecycleOperatorSessionStep[] {
  const seen = new Set<PiCodexLifecycleOperatorSessionStep>();
  const steps: PiCodexLifecycleOperatorSessionStep[] = [];
  for (const value of values ?? []) {
    const step = assertOperatorSessionStep(value);
    if (!seen.has(step)) {
      seen.add(step);
      steps.push(step);
    }
  }
  return steps;
}

function assertOperatorSessionKind(
  value: PiCodexLifecycleOperatorSessionInput["session_kind"]
): PiCodexLifecycleInstallSessionEvidence["session_kind"] {
  const sessionKind = value ?? "unknown";
  if (
    sessionKind === "phase45_local_fake_pi_http_e2e" ||
    sessionKind === "real_pi_host_manual_install" ||
    sessionKind === "real_pi_host_automated_install" ||
    sessionKind === "unknown"
  ) {
    return sessionKind;
  }
  throw new ComathError("invalid Pi/Codex lifecycle operator session kind", {
    statusCode: 400,
    code: "PI_CODEX_LIFECYCLE_OPERATOR_SESSION_INVALID_KIND"
  });
}

function optionalOperatorLabel(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return assertPiHostLabel(value);
}

function assertProbeTimeout(value: number | undefined): number {
  const timeoutMs = value ?? 10_000;
  if (Number.isInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= lifecycleProbeMaxTimeoutMs) {
    return timeoutMs;
  }
  throw new ComathError("Pi/Codex lifecycle service probe timeout must be between 1 and 30000 ms", {
    statusCode: 400,
    code: "PI_CODEX_LIFECYCLE_SERVICE_PROBE_TIMEOUT_INVALID"
  });
}

function assertExpectedExitCode(value: number | undefined): number {
  const exitCode = value ?? 0;
  if (Number.isInteger(exitCode) && exitCode >= 0 && exitCode <= 255) {
    return exitCode;
  }
  throw new ComathError("Pi/Codex lifecycle service probe expected exit code is invalid", {
    statusCode: 400,
    code: "PI_CODEX_LIFECYCLE_SERVICE_PROBE_EXPECTED_EXIT_INVALID"
  });
}

function assertServiceLabel(value: string): string {
  const label = value.trim();
  if (/^[A-Za-z0-9._-]{1,80}$/.test(label)) {
    return label;
  }
  throw new ComathError("Pi/Codex lifecycle service label is invalid", {
    statusCode: 400,
    code: "PI_CODEX_LIFECYCLE_SERVICE_PROBE_LABEL_INVALID"
  });
}

function assertPiHostLabel(value: string): string {
  const label = value.trim();
  if (/^[A-Za-z0-9._-]{1,80}$/.test(label)) {
    return label;
  }
  throw new ComathError("Pi/Codex real-Pi host label is invalid", {
    statusCode: 400,
    code: "PI_CODEX_REAL_PI_RUNTIME_PROBE_HOST_LABEL_INVALID"
  });
}

function assertRealPiRuntimeProbeHost(input: PiCodexRealPiRuntimeProbeInput): {
  piHostKind: "real_pi_host";
  sessionKind: "real_pi_host_manual_install" | "real_pi_host_automated_install";
} {
  const piHostKind = input.pi_host_kind ?? "real_pi_host";
  if (
    piHostKind !== "real_pi_host" ||
    (input.session_kind !== "real_pi_host_manual_install" && input.session_kind !== "real_pi_host_automated_install")
  ) {
    throw new ComathError("real-Pi install/runtime probe requires real Pi host evidence", {
      statusCode: 400,
      code: "PI_CODEX_REAL_PI_RUNTIME_PROBE_FAKE_HOST_DENIED"
    });
  }
  return { piHostKind, sessionKind: input.session_kind };
}

function canonicalLifecycleProgram(program: string, field: string): string {
  if (!program || program.includes("\0")) {
    throw new ComathError(`${field} is invalid`, {
      statusCode: 400,
      code: "PI_CODEX_LIFECYCLE_SERVICE_PROBE_PROGRAM_INVALID"
    });
  }
  if (!isAbsolute(program)) {
    throw new ComathError(`${field} must be an absolute path`, {
      statusCode: 400,
      code: "PI_CODEX_LIFECYCLE_SERVICE_PROBE_PROGRAM_NOT_ABSOLUTE"
    });
  }
  const resolvedProgram = resolve(program);
  if (!existsSync(resolvedProgram) || !statSync(resolvedProgram).isFile()) {
    throw new ComathError("Pi/Codex lifecycle service probe program is missing", {
      statusCode: 400,
      code: "PI_CODEX_LIFECYCLE_SERVICE_PROBE_PROGRAM_MISSING"
    });
  }
  const realProgram = realpathSync.native(resolvedProgram);
  if (deniedShellProgramNames.has(basename(realProgram).toLowerCase())) {
    throw new ComathError("shell-like lifecycle probe programs are not allowed", {
      statusCode: 403,
      code: "PI_CODEX_LIFECYCLE_SERVICE_PROBE_SHELL_PROGRAM_DENIED"
    });
  }
  return realProgram;
}

function configuredLifecycleAllowedPrograms(): Set<string> {
  const rawValue = process.env[lifecycleProbeAllowedProgramsEnv];
  if (!rawValue) {
    throw new ComathError("Pi/Codex lifecycle service probe allowed programs are not configured", {
      statusCode: 500,
      code: "PI_CODEX_LIFECYCLE_SERVICE_PROBE_ALLOWED_PROGRAMS_MISSING"
    });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawValue);
  } catch {
    throw new ComathError(`${lifecycleProbeAllowedProgramsEnv} must be a JSON string array`, {
      statusCode: 500,
      code: "PI_CODEX_LIFECYCLE_SERVICE_PROBE_ALLOWED_PROGRAMS_INVALID"
    });
  }
  if (!Array.isArray(parsed) || parsed.some((entry) => typeof entry !== "string" || entry.length === 0)) {
    throw new ComathError(`${lifecycleProbeAllowedProgramsEnv} must be a JSON string array`, {
      statusCode: 500,
      code: "PI_CODEX_LIFECYCLE_SERVICE_PROBE_ALLOWED_PROGRAMS_INVALID"
    });
  }
  return new Set(parsed.map((entry) => canonicalLifecycleProgram(entry, lifecycleProbeAllowedProgramsEnv)));
}

function assertLifecycleArgsAllowed(args: string[] | undefined): string[] {
  const safeArgs = args ?? [];
  for (const arg of safeArgs) {
    if (typeof arg !== "string" || arg.length === 0 || arg.includes("\0")) {
      throw new ComathError("Pi/Codex lifecycle service probe argument is invalid", {
        statusCode: 400,
        code: "PI_CODEX_LIFECYCLE_SERVICE_PROBE_ARGS_INVALID"
      });
    }
    const lowered = arg.toLowerCase();
    if (
      deniedShellArgumentTokens.has(lowered) ||
      /(?:&&|\|\||[|;<>`])/.test(arg) ||
      arg.includes("$(")
    ) {
      throw new ComathError("PI_CODEX_LIFECYCLE_SERVICE_PROBE_SHELL_ARGS_DENIED", {
        statusCode: 403,
        code: "PI_CODEX_LIFECYCLE_SERVICE_PROBE_SHELL_ARGS_DENIED"
      });
    }
  }
  return [...safeArgs];
}

function requiredProbeCommand(
  commands: PiCodexLifecycleServiceProbeInput["commands"],
  name: PiCodexLifecycleServiceCommandName
): PiCodexLifecycleServiceProbeCommandInput {
  const command = commands[name];
  if (!command) {
    throw new ComathError("PI_CODEX_LIFECYCLE_SERVICE_PROBE_COMMAND_MISSING", {
      statusCode: 400,
      code: "PI_CODEX_LIFECYCLE_SERVICE_PROBE_COMMAND_MISSING"
    });
  }
  return command;
}

function prepareProbeCommand(
  commandName: PiCodexLifecycleServiceCommandName,
  input: PiCodexLifecycleServiceProbeCommandInput,
  defaultTimeoutMs: number,
  allowedPrograms: Set<string>
): {
  commandName: PiCodexLifecycleServiceCommandName;
  program: string;
  args: string[];
  expectedExitCode: number;
  timeoutMs: number;
} {
  const program = canonicalLifecycleProgram(input.program, `${commandName}.program`);
  if (!allowedPrograms.has(program)) {
    throw new ComathError("PI_CODEX_LIFECYCLE_SERVICE_PROBE_PROGRAM_NOT_ALLOWLISTED", {
      statusCode: 403,
      code: "PI_CODEX_LIFECYCLE_SERVICE_PROBE_PROGRAM_NOT_ALLOWLISTED"
    });
  }
  return {
    commandName,
    program,
    args: assertLifecycleArgsAllowed(input.args),
    expectedExitCode: assertExpectedExitCode(input.expected_exit_code),
    timeoutMs: assertProbeTimeout(input.timeout_ms ?? defaultTimeoutMs)
  };
}

function requiredRealPiRuntimeCommand(
  commands: PiCodexRealPiRuntimeProbeInput["commands"],
  name: PiCodexRealPiRuntimeProbeCommandName
): PiCodexLifecycleServiceProbeCommandInput {
  const command = commands[name];
  if (!command) {
    throw new ComathError("PI_CODEX_REAL_PI_RUNTIME_PROBE_COMMAND_MISSING", {
      statusCode: 400,
      code: "PI_CODEX_REAL_PI_RUNTIME_PROBE_COMMAND_MISSING"
    });
  }
  return command;
}

function prepareRealPiRuntimeCommand(
  commandName: PiCodexRealPiRuntimeProbeCommandName,
  input: PiCodexLifecycleServiceProbeCommandInput,
  defaultTimeoutMs: number,
  allowedPrograms: Set<string>
): {
  commandName: PiCodexRealPiRuntimeProbeCommandName;
  program: string;
  args: string[];
  expectedExitCode: number;
  timeoutMs: number;
} {
  const program = canonicalLifecycleProgram(input.program, `${commandName}.program`);
  if (!allowedPrograms.has(program)) {
    throw new ComathError("PI_CODEX_LIFECYCLE_SERVICE_PROBE_PROGRAM_NOT_ALLOWLISTED", {
      statusCode: 403,
      code: "PI_CODEX_LIFECYCLE_SERVICE_PROBE_PROGRAM_NOT_ALLOWLISTED"
    });
  }
  return {
    commandName,
    program,
    args: assertLifecycleArgsAllowed(input.args),
    expectedExitCode: assertExpectedExitCode(input.expected_exit_code),
    timeoutMs: assertProbeTimeout(input.timeout_ms ?? defaultTimeoutMs)
  };
}

function truncateProbeOutput(value: string): string {
  return Buffer.from(scrubHostPaths(value), "utf8").subarray(0, lifecycleProbeOutputLimit).toString("utf8");
}

const operatorSessionEnvSecretPattern =
  /\b(?:COMATH_CODEX_API_KEY|OPENAI_API_KEY|api[_-]?key|token)\b\s*[:=]\s*[^\s,;}"']+/gi;
const operatorSessionBearerSecretPattern = /\bAuthorization\s*:\s*Bearer\s+[^\s,;}"']+/gi;
const operatorSessionSecretPattern = /\b(?:sk-[A-Za-z0-9._-]+)\b/gi;
const operatorSessionProofSuccessPattern =
  /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|proven|verified_final_authority_evidence)\b/gi;

function sanitizeOperatorSessionText(value: string): string {
  return Buffer.from(
    scrubHostPaths(value)
      .replace(operatorSessionEnvSecretPattern, "<secret>")
      .replace(operatorSessionBearerSecretPattern, "<secret>")
      .replace(operatorSessionSecretPattern, "<secret>")
      .replace(operatorSessionProofSuccessPattern, "unverified_formal_status")
      .replace(operatorTransportOverclaimPattern, "bounded_transport_checkpoint_only"),
    "utf8"
  )
    .subarray(0, lifecycleProbeOutputLimit)
    .toString("utf8");
}

function sanitizeOperatorSessionValue(value: unknown, depth = 0): unknown {
  if (depth > 5) {
    return "<truncated>";
  }
  if (typeof value === "string") {
    return sanitizeOperatorSessionText(value);
  }
  if (typeof value === "number" || typeof value === "boolean" || value === null) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((entry) => sanitizeOperatorSessionValue(entry, depth + 1));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 40)
        .map(([key, entry]) => [sanitizeOperatorSessionText(key), sanitizeOperatorSessionValue(entry, depth + 1)])
    );
  }
  if (value === undefined) {
    return "not_provided";
  }
  return sanitizeOperatorSessionText(String(value));
}

const operatorTransportOverclaimPattern =
  /\b(?:long[- ]lived\s+(?:websocket|sse)|indefinite\s+sse|terminal transport recovered live|durable transport provided)\b/gi;

function defaultLifecycleProbeRunner(
  command: PiCodexLifecycleServiceProbeRunnerCommand
): PiCodexLifecycleServiceProbeRunnerResult {
  const result = spawnSync(command.program, command.args, {
    cwd: dirname(command.program),
    shell: false,
    windowsHide: true,
    timeout: command.timeout_ms,
    encoding: "utf8",
    maxBuffer: lifecycleProbeOutputLimit,
    env: {
      PATH: process.env.PATH ?? "",
      PATHEXT: process.env.PATHEXT ?? "",
      SYSTEMROOT: process.env.SYSTEMROOT ?? "",
      SystemRoot: process.env.SystemRoot ?? "",
      WINDIR: process.env.WINDIR ?? "",
      COMATH_PROOF_AUTHORITY: "none",
      COMATH_PI_CODEX_LIFECYCLE_PROBE: "true"
    }
  });
  return {
    exit_code: result.status,
    signal: result.signal,
    timed_out: Boolean(result.error && result.error.message.includes("ETIMEDOUT")),
    stdout: typeof result.stdout === "string" ? result.stdout : "",
    stderr: typeof result.stderr === "string" ? result.stderr : result.error?.message ?? ""
  };
}

function runProbeStep(
  step: PiCodexLifecycleServiceProbeStep,
  command: ReturnType<typeof prepareProbeCommand>,
  runner: PiCodexLifecycleServiceProbeRunner
): PiCodexLifecycleServiceProbeCommandRecord {
  const startedAt = Date.now();
  let result: PiCodexLifecycleServiceProbeRunnerResult;
  try {
    result = runner(
      {
        program: command.program,
        args: command.args,
        timeout_ms: command.timeoutMs,
        shell: false,
        network: false
      },
      step
    );
  } catch (error) {
    result = {
      exit_code: null,
      signal: null,
      timed_out: false,
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error)
    };
  }
  const ok = result.exit_code === command.expectedExitCode && !result.timed_out;
  return {
    step,
    command_name: command.commandName,
    program_label: basename(command.program),
    program_path_sha256: sha256Text(command.program),
    args_count: command.args.length,
    args_sha256: sha256Text(canonicalJson(command.args)),
    expected_exit_code: command.expectedExitCode,
    exit_code: result.exit_code,
    signal: result.signal,
    timed_out: result.timed_out,
    ok,
    stdout: truncateProbeOutput(result.stdout),
    stderr: truncateProbeOutput(result.stderr),
    duration_ms: Math.max(Date.now() - startedAt, 0)
  };
}

function runRealPiRuntimeProbeStep(
  step: PiCodexRealPiRuntimeProbeStep,
  command: ReturnType<typeof prepareRealPiRuntimeCommand>,
  runner: PiCodexRealPiRuntimeProbeRunner
): PiCodexRealPiRuntimeProbeCommandRecord {
  const startedAt = Date.now();
  let result: PiCodexRealPiRuntimeProbeRunnerResult;
  try {
    result = runner(
      {
        program: command.program,
        args: command.args,
        timeout_ms: command.timeoutMs,
        shell: false,
        network: false
      },
      step
    );
  } catch (error) {
    result = {
      exit_code: null,
      signal: null,
      timed_out: false,
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error)
    };
  }
  const ok = result.exit_code === command.expectedExitCode && !result.timed_out;
  return {
    step,
    command_name: command.commandName,
    program_label: basename(command.program),
    program_path_sha256: sha256Text(command.program),
    args_count: command.args.length,
    args_sha256: sha256Text(canonicalJson(command.args)),
    expected_exit_code: command.expectedExitCode,
    exit_code: result.exit_code,
    signal: result.signal,
    timed_out: result.timed_out,
    ok,
    stdout: truncateProbeOutput(result.stdout),
    stderr: truncateProbeOutput(result.stderr),
    duration_ms: Math.max(Date.now() - startedAt, 0)
  };
}

function probeVetoForCommand(record: PiCodexLifecycleServiceProbeCommandRecord): PiCodexLifecycleServiceProbeVeto[] {
  if (record.ok) {
    return [];
  }
  const baseCode = `durable_service_lifecycle_${record.step}`;
  return [
    ...(record.timed_out
      ? [
          {
            code: `${baseCode}_timeout`,
            message: `Durable service lifecycle ${record.step} command timed out.`
          }
        ]
      : []),
    {
      code: `${baseCode}_failed`,
      message: `Durable service lifecycle ${record.step} command did not return the expected exit code.`
    }
  ];
}

function realPiRuntimeProbeVetoForCommand(
  record: PiCodexRealPiRuntimeProbeCommandRecord
): PiCodexRealPiRuntimeProbeVeto[] {
  if (record.ok) {
    return [];
  }
  const baseCode =
    record.step === "install"
      ? "real_pi_install"
      : record.step === "runtime_registration"
        ? "real_pi_runtime_registration"
        : "real_pi_host_confirmation";
  return [
    ...(record.timed_out
      ? [
          {
            code: `${baseCode}_timeout`,
            message: `Real Pi ${record.step} command timed out.`
          }
        ]
      : []),
    {
      code: `${baseCode}_failed`,
      message: `Real Pi ${record.step} command did not return the expected exit code.`
    }
  ];
}

function projectRelativePath(projectRoot: string, absolutePath: string): string {
  return normalizeRelativePath(relative(resolve(projectRoot), absolutePath));
}

function readLifecycleArtifact(
  projectRoot: string,
  kind: PiCodexLifecycleEvidenceArtifactKind,
  path: string
): PiCodexLifecycleEvidenceArtifact {
  const absolutePath = assertPathAllowed(projectRoot, path, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath)) {
    throw new ComathError("PI_CODEX_LIFECYCLE_EVIDENCE_ARTIFACT_MISSING", {
      statusCode: 400,
      code: "PI_CODEX_LIFECYCLE_EVIDENCE_ARTIFACT_MISSING"
    });
  }
  if (!statSync(absolutePath).isFile()) {
    throw new ComathError("PI_CODEX_LIFECYCLE_EVIDENCE_ARTIFACT_NOT_FILE", {
      statusCode: 400,
      code: "PI_CODEX_LIFECYCLE_EVIDENCE_ARTIFACT_NOT_FILE"
    });
  }
  const content = readFileSync(absolutePath);
  return {
    kind,
    path: projectRelativePath(projectRoot, absolutePath),
    sha256: sha256Bytes(content),
    size_bytes: content.byteLength
  };
}

const operatorSessionStepOrder: PiCodexLifecycleOperatorSessionStep[] = [
  "real_pi_install_runtime_probe",
  "durable_service_lifecycle_probe",
  "codex_api_account_network_probe",
  "lifecycle_evidence_intake",
  "readiness_review"
];

const operatorSessionRouteByStep: Record<PiCodexLifecycleOperatorSessionStep, string> = {
  real_pi_install_runtime_probe: "/release/pi-codex-lifecycle/real-pi-runtime-probe",
  durable_service_lifecycle_probe: "/release/pi-codex-lifecycle/service-probe",
  codex_api_account_network_probe: "/release/pi-codex-lifecycle/codex-api-probe",
  lifecycle_evidence_intake: "/release/pi-codex-lifecycle/evidence",
  readiness_review: "/release/pi-codex-lifecycle/review"
};

function nextOperatorSessionRoute(completedSteps: PiCodexLifecycleOperatorSessionStep[]): string {
  const completed = new Set(completedSteps);
  const nextStep = operatorSessionStepOrder.find((step) => !completed.has(step)) ?? "readiness_review";
  return operatorSessionRouteByStep[nextStep];
}

function operatorSessionManifestPath(sessionId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "pi-codex-lifecycle", sessionId, "operator-session-manifest.json")
  );
}

function operatorTransportRecoveryPath(recoveryId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "pi-codex-lifecycle", recoveryId, "operator-transport-recovery.json")
  );
}

function operatorTransportLeasePath(leaseId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "pi-codex-lifecycle", leaseId, "operator-transport-lease.json")
  );
}

function readOperatorSessionCreatedAt(projectRoot: string, sessionManifestPath: string, fallback: string): string {
  const absolutePath = assertPathAllowed(projectRoot, sessionManifestPath, { purpose: "read" });
  if (!existsSync(absolutePath)) {
    return fallback;
  }
  try {
    const parsed = JSON.parse(readFileSync(absolutePath, "utf8")) as { created_at?: unknown };
    if (typeof parsed.created_at === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(parsed.created_at)) {
      return parsed.created_at;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

function sanitizeOperatorTransportText(value: unknown): string {
  const sanitized =
    typeof value === "string"
      ? sanitizeOperatorSessionText(value)
      : value === undefined
        ? "not_provided"
        : sanitizeOperatorSessionText(String(value));
  return sanitized.replace(operatorTransportOverclaimPattern, "bounded_transport_checkpoint_only");
}

function sanitizeOperatorTransportCursor(
  cursor: PiCodexLifecycleOperatorTransportRecoveryInput["requested_cursor"]
): PiCodexLifecycleOperatorTransportRecoveryCursor {
  return {
    operator_event_cursor: sanitizeOperatorTransportText(cursor?.operator_event_cursor),
    stdout_cursor: sanitizeOperatorTransportText(cursor?.stdout_cursor),
    stderr_cursor: sanitizeOperatorTransportText(cursor?.stderr_cursor)
  };
}

function resolveOperatorTransportSessionManifestPath(
  projectRoot: string,
  sessionId: string,
  sessionManifestPath: string | undefined
): string {
  const expectedPath = operatorSessionManifestPath(sessionId);
  if (sessionManifestPath === undefined) {
    return expectedPath;
  }
  const absolutePath = assertPathAllowed(projectRoot, sessionManifestPath, {
    purpose: "read",
    resolveRealpath: true
  });
  const relativePath = projectRelativePath(projectRoot, absolutePath);
  if (relativePath === expectedPath) {
    return relativePath;
  }
  throw new ComathError("Pi/Codex lifecycle operator transport recovery session manifest path does not match session id", {
    statusCode: 400,
    code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_RECOVERY_SESSION_PATH_MISMATCH"
  });
}

function resolveOperatorTransportRecoveryPath(
  projectRoot: string,
  recoveryId: string,
  recoveryPath: string | undefined
): string {
  const expectedPath = operatorTransportRecoveryPath(recoveryId);
  if (recoveryPath === undefined) {
    return expectedPath;
  }
  const absolutePath = assertPathAllowed(projectRoot, recoveryPath, {
    purpose: "read",
    resolveRealpath: true
  });
  const relativePath = projectRelativePath(projectRoot, absolutePath);
  if (relativePath === expectedPath) {
    return relativePath;
  }
  throw new ComathError("Pi/Codex lifecycle operator transport lease recovery path does not match recovery id", {
    statusCode: 400,
    code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_LEASE_RECOVERY_PATH_MISMATCH"
  });
}

function assertOperatorTransportSessionManifestBoundary(manifest: PiCodexLifecycleOperatorSessionManifestBody): void {
  let completedSteps: PiCodexLifecycleOperatorSessionStep[];
  try {
    if (!Array.isArray(manifest.completed_steps)) {
      throw new Error("completed_steps must be an array");
    }
    completedSteps = operatorSessionSteps(manifest.completed_steps as PiCodexLifecycleOperatorSessionStep[]);
  } catch {
    throw new ComathError("Pi/Codex lifecycle operator-session manifest has invalid completed steps", {
      statusCode: 400,
      code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_RECOVERY_SESSION_INVALID_BOUNDARY"
    });
  }
  if (
    manifest.proof_authority !== "none" ||
    manifest.can_promote_claim !== false ||
    manifest.can_certify_ga !== false ||
    manifest.durable_transport_provided !== false ||
    manifest.pi_direct_write_allowed !== false ||
    manifest.direct_trusted_state_mutation !== false ||
    manifest.next_recommended_route !== nextOperatorSessionRoute(completedSteps)
  ) {
    throw new ComathError("Pi/Codex lifecycle operator-session manifest violates non-authority boundaries", {
      statusCode: 400,
      code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_RECOVERY_SESSION_INVALID_BOUNDARY"
    });
  }
}

function readOperatorTransportSessionManifest(
  projectRoot: string,
  projectId: string,
  sessionId: string,
  sessionManifestPath: string
): {
  manifest: PiCodexLifecycleOperatorSessionManifestBody;
  artifact: PiCodexLifecycleOperatorSessionManifestArtifact;
} {
  const absolutePath = assertPathAllowed(projectRoot, sessionManifestPath, {
    purpose: "read",
    resolveRealpath: true
  });
  if (!existsSync(absolutePath)) {
    throw new ComathError("Pi/Codex lifecycle operator-session manifest is required before transport recovery", {
      statusCode: 400,
      code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_RECOVERY_SESSION_MISSING"
    });
  }
  if (!statSync(absolutePath).isFile()) {
    throw new ComathError("Pi/Codex lifecycle operator-session manifest must be a file", {
      statusCode: 400,
      code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_RECOVERY_SESSION_NOT_FILE"
    });
  }
  const content = readFileSync(absolutePath);
  let parsed: PiCodexLifecycleOperatorSessionManifestBody;
  try {
    parsed = JSON.parse(content.toString("utf8")) as PiCodexLifecycleOperatorSessionManifestBody;
  } catch {
    throw new ComathError("Pi/Codex lifecycle operator-session manifest JSON is invalid", {
      statusCode: 400,
      code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_RECOVERY_SESSION_INVALID_JSON"
    });
  }
  if (
    parsed.schema_version !== "comath.pi_codex_lifecycle_operator_session.v1" ||
    parsed.project_id !== projectId ||
    parsed.session_id !== sessionId ||
    parsed.session_manifest_path !== sessionManifestPath
  ) {
    throw new ComathError("Pi/Codex lifecycle operator-session manifest does not bind the requested recovery", {
      statusCode: 400,
      code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_RECOVERY_SESSION_MISMATCH"
    });
  }
  assertOperatorTransportSessionManifestBoundary(parsed);
  return {
    manifest: parsed,
    artifact: {
      kind: "operator_session_manifest",
      path: sessionManifestPath,
      sha256: sha256Bytes(content),
      size_bytes: content.byteLength
    }
  };
}

function assertOperatorTransportRecoveryBoundary(recovery: PiCodexLifecycleOperatorTransportRecoveryBody): void {
  if (
    recovery.proof_authority !== "none" ||
    recovery.can_promote_claim !== false ||
    recovery.can_certify_ga !== false ||
    recovery.durable_recovery_checkpoint_provided !== true ||
    recovery.durable_transport_provided !== false ||
    recovery.live_transport_open !== false ||
    recovery.indefinite_stream_open !== false ||
    recovery.long_lived_websocket_provided !== false ||
    recovery.long_lived_sse_provided !== false ||
    recovery.pi_direct_write_allowed !== false ||
    recovery.direct_trusted_state_mutation !== false
  ) {
    throw new ComathError("Pi/Codex lifecycle operator transport recovery violates non-authority boundaries", {
      statusCode: 400,
      code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_LEASE_RECOVERY_INVALID_BOUNDARY"
    });
  }
}

function readOperatorTransportRecoveryCheckpoint(
  projectRoot: string,
  projectId: string,
  sessionId: string,
  recoveryId: string,
  recoveryPath: string
): {
  recovery: PiCodexLifecycleOperatorTransportRecoveryBody;
  artifact: PiCodexLifecycleOperatorTransportRecoveryArtifact;
} {
  const absolutePath = assertPathAllowed(projectRoot, recoveryPath, {
    purpose: "read",
    resolveRealpath: true
  });
  if (!existsSync(absolutePath)) {
    throw new ComathError("Pi/Codex lifecycle operator transport recovery checkpoint is required before lease opening", {
      statusCode: 400,
      code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_LEASE_RECOVERY_MISSING"
    });
  }
  if (!statSync(absolutePath).isFile()) {
    throw new ComathError("Pi/Codex lifecycle operator transport recovery checkpoint must be a file", {
      statusCode: 400,
      code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_LEASE_RECOVERY_NOT_FILE"
    });
  }
  const content = readFileSync(absolutePath);
  let parsed: PiCodexLifecycleOperatorTransportRecoveryBody;
  try {
    parsed = JSON.parse(content.toString("utf8")) as PiCodexLifecycleOperatorTransportRecoveryBody;
  } catch {
    throw new ComathError("Pi/Codex lifecycle operator transport recovery checkpoint JSON is invalid", {
      statusCode: 400,
      code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_LEASE_RECOVERY_INVALID_JSON"
    });
  }
  if (
    parsed.schema_version !== "comath.pi_codex_lifecycle_operator_transport_recovery.v1" ||
    parsed.project_id !== projectId ||
    parsed.session_id !== sessionId ||
    parsed.transport_recovery_id !== recoveryId ||
    parsed.transport_recovery_path !== recoveryPath
  ) {
    throw new ComathError("Pi/Codex lifecycle operator transport recovery checkpoint does not bind the requested lease", {
      statusCode: 400,
      code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_LEASE_RECOVERY_MISMATCH"
    });
  }
  assertOperatorTransportRecoveryBoundary(parsed);
  return {
    recovery: parsed,
    artifact: {
      kind: "operator_transport_recovery",
      path: recoveryPath,
      sha256: sha256Bytes(content),
      size_bytes: content.byteLength
    }
  };
}

function assertOperatorTransportLeaseBoundary(lease: PiCodexLifecycleOperatorTransportLeaseBody): void {
  if (
    lease.proof_authority !== "none" ||
    lease.can_promote_claim !== false ||
    lease.can_certify_ga !== false ||
    lease.durable_recovery_checkpoint_required !== true ||
    lease.bounded_live_transport_lease_provided !== true ||
    lease.durable_transport_provided !== false ||
    lease.live_transport_open !== true ||
    lease.indefinite_stream_open !== false ||
    lease.long_lived_websocket_provided !== false ||
    lease.long_lived_sse_provided !== false ||
    lease.pi_direct_write_allowed !== false ||
    lease.direct_trusted_state_mutation !== false
  ) {
    throw new ComathError("Pi/Codex guided real-Pi execution lease violates non-authority boundaries", {
      statusCode: 400,
      code: "PI_CODEX_GUIDED_REAL_PI_EXECUTION_LEASE_INVALID_BOUNDARY"
    });
  }
}

function readOperatorTransportLeaseArtifact(
  projectRoot: string,
  projectId: string,
  sessionId: string,
  recoveryId: string,
  leaseId: string,
  leasePath: string
): {
  lease: PiCodexLifecycleOperatorTransportLeaseBody;
  artifact: PiCodexLifecycleOperatorTransportLeaseArtifact;
} {
  const absolutePath = assertPathAllowed(projectRoot, leasePath, {
    purpose: "read",
    resolveRealpath: true
  });
  if (!existsSync(absolutePath)) {
    throw new ComathError("Pi/Codex guided real-Pi execution requires a bounded operator transport lease", {
      statusCode: 400,
      code: "PI_CODEX_GUIDED_REAL_PI_EXECUTION_LEASE_MISSING"
    });
  }
  if (!statSync(absolutePath).isFile()) {
    throw new ComathError("Pi/Codex guided real-Pi execution transport lease must be a file", {
      statusCode: 400,
      code: "PI_CODEX_GUIDED_REAL_PI_EXECUTION_LEASE_NOT_FILE"
    });
  }
  const content = readFileSync(absolutePath);
  let parsed: PiCodexLifecycleOperatorTransportLeaseBody;
  try {
    parsed = JSON.parse(content.toString("utf8")) as PiCodexLifecycleOperatorTransportLeaseBody;
  } catch {
    throw new ComathError("Pi/Codex guided real-Pi execution transport lease JSON is invalid", {
      statusCode: 400,
      code: "PI_CODEX_GUIDED_REAL_PI_EXECUTION_LEASE_INVALID_JSON"
    });
  }
  if (
    parsed.schema_version !== "comath.pi_codex_lifecycle_operator_transport_lease.v1" ||
    parsed.project_id !== projectId ||
    parsed.session_id !== sessionId ||
    parsed.transport_recovery_id !== recoveryId ||
    parsed.transport_lease_id !== leaseId ||
    parsed.transport_lease_path !== leasePath
  ) {
    throw new ComathError("Pi/Codex guided real-Pi execution transport lease does not bind the requested execution", {
      statusCode: 400,
      code: "PI_CODEX_GUIDED_REAL_PI_EXECUTION_LEASE_MISMATCH"
    });
  }
  assertOperatorTransportLeaseBoundary(parsed);
  return {
    lease: parsed,
    artifact: {
      kind: "operator_transport_lease",
      path: leasePath,
      sha256: sha256Bytes(content),
      size_bytes: content.byteLength
    }
  };
}

function readGuidedRealPiRuntimeRegistrationSnapshot(
  projectRoot: string,
  projectId: string,
  probeId: string,
  runtimeRegistrationPath: string
): PiCodexRealPiRuntimeProbeRegistrationArtifact {
  const absolutePath = assertPathAllowed(projectRoot, runtimeRegistrationPath, {
    purpose: "read",
    resolveRealpath: true
  });
  if (!existsSync(absolutePath)) {
    throw new ComathError("Pi/Codex guided real-Pi execution requires Task152 runtime registration evidence", {
      statusCode: 400,
      code: "PI_CODEX_GUIDED_REAL_PI_EXECUTION_RUNTIME_MISSING"
    });
  }
  if (!statSync(absolutePath).isFile()) {
    throw new ComathError("Pi/Codex guided real-Pi execution runtime registration evidence must be a file", {
      statusCode: 400,
      code: "PI_CODEX_GUIDED_REAL_PI_EXECUTION_RUNTIME_NOT_FILE"
    });
  }
  const content = readFileSync(absolutePath);
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content.toString("utf8")) as Record<string, unknown>;
  } catch {
    throw new ComathError("Pi/Codex guided real-Pi execution runtime registration JSON is invalid", {
      statusCode: 400,
      code: "PI_CODEX_GUIDED_REAL_PI_EXECUTION_RUNTIME_INVALID_JSON"
    });
  }
  if (
    parsed.schema_version !== "comath.pi_codex_runtime_registration_snapshot.v1" ||
    parsed.probe_id !== probeId ||
    parsed.project_id !== projectId ||
    parsed.pi_host_kind !== "real_pi_host" ||
    parsed.runtime_entrypoint_imported !== true ||
    parsed.runtime_registered !== true ||
    parsed.host_confirmation_observed !== true ||
    parsed.proof_authority !== "none" ||
    parsed.can_promote_claim !== false ||
    parsed.can_certify_ga !== false
  ) {
    throw new ComathError("Pi/Codex guided real-Pi execution runtime registration violates real-Pi boundaries", {
      statusCode: 400,
      code: "PI_CODEX_GUIDED_REAL_PI_EXECUTION_RUNTIME_INVALID_BOUNDARY"
    });
  }
  return {
    kind: "runtime_registration_snapshot",
    path: projectRelativePath(projectRoot, absolutePath),
    sha256: sha256Bytes(content),
    size_bytes: content.byteLength
  };
}

function readGuidedRealPiInstallTranscript(
  projectRoot: string,
  piInstallTranscriptPath: string
): PiCodexRealPiRuntimeProbeInstallArtifact {
  const artifact = readLifecycleArtifact(projectRoot, "pi_install_transcript", piInstallTranscriptPath);
  return {
    kind: "pi_install_transcript",
    path: artifact.path,
    sha256: artifact.sha256,
    size_bytes: artifact.size_bytes
  };
}

function guidedRealPiExecutionPath(executionId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "pi-codex-lifecycle", executionId, "guided-real-pi-execution.json")
  );
}

function sanitizedObservedRoutes(values: string[] | undefined): string[] {
  const routes = values ?? [];
  return routes.slice(0, 20).map((route) => sanitizeOperatorTransportText(route));
}

export function persistPiCodexLifecycleOperatorSession(
  projectRoot: string,
  input: PiCodexLifecycleOperatorSessionInput
): PiCodexLifecycleOperatorSessionManifest {
  const projectId = assertOperatorSessionProjectId(input.project_id);
  const sessionId = assertOperatorSessionId(input.session_id);
  const sessionStatus = assertOperatorSessionStatus(input.session_status);
  const piHostLabel = optionalOperatorLabel(input.pi_host_label);
  const sessionKind = assertOperatorSessionKind(input.session_kind);
  const completedSteps = operatorSessionSteps(input.completed_steps);
  const artifactRefs = (input.artifact_paths ?? []).map((artifact) =>
    readLifecycleArtifact(projectRoot, artifact.kind, artifact.path)
  );
  const now = new Date().toISOString();
  const sessionManifestPath = operatorSessionManifestPath(sessionId);
  const createdAt = readOperatorSessionCreatedAt(projectRoot, sessionManifestPath, now);
  const body: PiCodexLifecycleOperatorSessionManifestBody = {
    schema_version: "comath.pi_codex_lifecycle_operator_session.v1",
    session_id: sessionId,
    project_id: projectId,
    actor: sanitizeOperatorSessionText(input.actor),
    created_at: createdAt,
    updated_at: now,
    session_status: sessionStatus,
    ...(piHostLabel === undefined ? {} : { pi_host_label: piHostLabel }),
    session_kind: sessionKind,
    operator_cursor: sanitizeOperatorSessionText(input.operator_cursor ?? "not_provided"),
    completed_steps: completedSteps,
    artifact_refs: artifactRefs,
    last_result_summary: sanitizeOperatorSessionValue(input.last_result_summary),
    next_recommended_route: nextOperatorSessionRoute(completedSteps),
    session_manifest_path: sessionManifestPath,
    durable_transport_provided: false,
    pi_direct_write_allowed: false,
    direct_trusted_state_mutation: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  };
  const artifactText = canonicalJson(body);
  const absoluteManifestPath = assertPathAllowed(projectRoot, sessionManifestPath, { purpose: "runtime-write" });
  mkdirSync(dirname(absoluteManifestPath), { recursive: true });
  writeFileSync(absoluteManifestPath, artifactText, "utf8");
  const result: PiCodexLifecycleOperatorSessionManifest = {
    ...body,
    session_manifest_artifact: {
      kind: "operator_session_manifest",
      path: sessionManifestPath,
      sha256: sha256Text(artifactText),
      size_bytes: Buffer.byteLength(artifactText, "utf8")
    }
  };
  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.pi_codex_lifecycle_operator_session_persisted",
    actor: sanitizeOperatorSessionText(input.actor),
    target_id: projectId,
    payload: {
      session_id: sessionId,
      session_status: sessionStatus,
      session_manifest_path: sessionManifestPath,
      completed_steps: completedSteps,
      artifact_kinds: artifactRefs.map((artifact) => artifact.kind),
      durable_transport_provided: false,
      pi_direct_write_allowed: false,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  });
  return result;
}

export function recoverPiCodexLifecycleOperatorTransport(
  projectRoot: string,
  input: PiCodexLifecycleOperatorTransportRecoveryInput
): PiCodexLifecycleOperatorTransportRecovery {
  const projectId = assertOperatorSessionProjectId(input.project_id);
  const sessionId = assertOperatorSessionId(input.session_id);
  const recoveryId = assertOperatorTransportRecoveryId(input.transport_recovery_id);
  const transportKind = assertOperatorTransportKind(input.transport_kind);
  const clientEpoch = assertOperatorTransportClientEpoch(input.client_epoch);
  const sessionManifestPath = resolveOperatorTransportSessionManifestPath(
    projectRoot,
    sessionId,
    input.session_manifest_path
  );
  const { manifest, artifact: sessionManifestArtifact } = readOperatorTransportSessionManifest(
    projectRoot,
    projectId,
    sessionId,
    sessionManifestPath
  );
  const transportRecoveryPath = operatorTransportRecoveryPath(recoveryId);
  const body: PiCodexLifecycleOperatorTransportRecoveryBody = {
    schema_version: "comath.pi_codex_lifecycle_operator_transport_recovery.v1",
    transport_recovery_id: recoveryId,
    project_id: projectId,
    session_id: sessionId,
    actor: sanitizeOperatorTransportText(input.actor),
    created_at: new Date().toISOString(),
    recovery_status: "operator_transport_recovery_checkpoint_recorded",
    transport_kind: transportKind,
    observed_route: sanitizeOperatorTransportText(input.observed_route),
    requested_cursor: sanitizeOperatorTransportCursor(input.requested_cursor),
    client_epoch: clientEpoch,
    last_seen_event_id: sanitizeOperatorTransportText(input.last_seen_event_id),
    reconnect_reason: sanitizeOperatorTransportText(input.reconnect_reason),
    session_manifest_path: sessionManifestPath,
    session_manifest_artifact: sessionManifestArtifact,
    next_recommended_route: sanitizeOperatorSessionText(manifest.next_recommended_route),
    transport_recovery_path: transportRecoveryPath,
    durable_recovery_checkpoint_provided: true,
    durable_transport_provided: false,
    live_transport_open: false,
    indefinite_stream_open: false,
    long_lived_websocket_provided: false,
    long_lived_sse_provided: false,
    pi_direct_write_allowed: false,
    direct_trusted_state_mutation: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  };
  const artifactText = canonicalJson(body);
  const absoluteRecoveryPath = assertPathAllowed(projectRoot, transportRecoveryPath, { purpose: "runtime-write" });
  mkdirSync(dirname(absoluteRecoveryPath), { recursive: true });
  writeFileSync(absoluteRecoveryPath, artifactText, "utf8");
  const result: PiCodexLifecycleOperatorTransportRecovery = {
    ...body,
    transport_recovery_artifact: {
      kind: "operator_transport_recovery",
      path: transportRecoveryPath,
      sha256: sha256Text(artifactText),
      size_bytes: Buffer.byteLength(artifactText, "utf8")
    }
  };
  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.pi_codex_lifecycle_operator_transport_recovery_recorded",
    actor: sanitizeOperatorTransportText(input.actor),
    target_id: projectId,
    payload: {
      transport_recovery_id: recoveryId,
      session_id: sessionId,
      transport_kind: transportKind,
      session_manifest_path: sessionManifestPath,
      transport_recovery_path: transportRecoveryPath,
      next_recommended_route: result.next_recommended_route,
      durable_recovery_checkpoint_provided: true,
      durable_transport_provided: false,
      live_transport_open: false,
      indefinite_stream_open: false,
      long_lived_websocket_provided: false,
      long_lived_sse_provided: false,
      pi_direct_write_allowed: false,
      direct_trusted_state_mutation: false,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  });
  return result;
}

export function openPiCodexLifecycleOperatorTransportLease(
  projectRoot: string,
  input: PiCodexLifecycleOperatorTransportLeaseInput
): PiCodexLifecycleOperatorTransportLease {
  const projectId = assertOperatorSessionProjectId(input.project_id);
  const sessionId = assertOperatorSessionId(input.session_id);
  const recoveryId = assertOperatorTransportRecoveryId(input.transport_recovery_id);
  const leaseId = assertOperatorTransportLeaseId(input.transport_lease_id);
  const transportKind = assertOperatorTransportLeaseKind(input.transport_kind);
  const clientEpoch = assertOperatorTransportClientEpoch(input.client_epoch);
  const leaseTtlMs = assertOperatorTransportLeaseDuration(
    input.lease_ttl_ms,
    60_000,
    "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_LEASE_INVALID_TTL"
  );
  const heartbeatIntervalMs = assertOperatorTransportLeaseDuration(
    input.heartbeat_interval_ms,
    Math.min(15_000, leaseTtlMs),
    "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_LEASE_INVALID_HEARTBEAT"
  );
  if (heartbeatIntervalMs > leaseTtlMs) {
    throw new ComathError("Pi/Codex lifecycle operator transport lease heartbeat exceeds TTL", {
      statusCode: 400,
      code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_LEASE_INVALID_HEARTBEAT"
    });
  }
  const sessionManifestPath = resolveOperatorTransportSessionManifestPath(
    projectRoot,
    sessionId,
    input.session_manifest_path
  );
  const { manifest, artifact: sessionManifestArtifact } = readOperatorTransportSessionManifest(
    projectRoot,
    projectId,
    sessionId,
    sessionManifestPath
  );
  const recoveryPath = resolveOperatorTransportRecoveryPath(projectRoot, recoveryId, input.transport_recovery_path);
  const { recovery, artifact: recoveryArtifact } = readOperatorTransportRecoveryCheckpoint(
    projectRoot,
    projectId,
    sessionId,
    recoveryId,
    recoveryPath
  );
  if (
    recovery.session_manifest_path !== sessionManifestPath ||
    recovery.session_manifest_artifact.sha256 !== sessionManifestArtifact.sha256 ||
    recovery.client_epoch > clientEpoch
  ) {
    throw new ComathError("Pi/Codex lifecycle operator transport recovery is stale for requested lease", {
      statusCode: 400,
      code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_LEASE_RECOVERY_MISMATCH"
    });
  }
  const startedAt = new Date();
  const transportLeasePath = operatorTransportLeasePath(leaseId);
  const body: PiCodexLifecycleOperatorTransportLeaseBody = {
    schema_version: "comath.pi_codex_lifecycle_operator_transport_lease.v1",
    transport_lease_id: leaseId,
    transport_recovery_id: recoveryId,
    project_id: projectId,
    session_id: sessionId,
    actor: sanitizeOperatorTransportText(input.actor),
    lease_started_at: startedAt.toISOString(),
    lease_expires_at: new Date(startedAt.getTime() + leaseTtlMs).toISOString(),
    lease_status: "bounded_operator_transport_lease_open",
    transport_kind: transportKind,
    lease_route: sanitizeOperatorTransportText(input.lease_route ?? recovery.observed_route),
    requested_cursor: sanitizeOperatorTransportCursor(input.requested_cursor ?? recovery.requested_cursor),
    client_epoch: clientEpoch,
    heartbeat_interval_ms: heartbeatIntervalMs,
    lease_ttl_ms: leaseTtlMs,
    heartbeat_required: true,
    last_seen_event_id: sanitizeOperatorTransportText(input.last_seen_event_id ?? recovery.last_seen_event_id),
    open_reason: sanitizeOperatorTransportText(input.open_reason ?? "bounded_operator_transport_lease_requested"),
    session_manifest_path: sessionManifestPath,
    session_manifest_artifact: sessionManifestArtifact,
    transport_recovery_path: recoveryPath,
    transport_recovery_artifact: recoveryArtifact,
    next_recommended_route: sanitizeOperatorSessionText(manifest.next_recommended_route),
    transport_lease_path: transportLeasePath,
    durable_recovery_checkpoint_required: true,
    bounded_live_transport_lease_provided: true,
    durable_transport_provided: false,
    live_transport_open: true,
    indefinite_stream_open: false,
    long_lived_websocket_provided: false,
    long_lived_sse_provided: false,
    pi_direct_write_allowed: false,
    direct_trusted_state_mutation: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  };
  const artifactText = canonicalJson(body);
  const absoluteLeasePath = assertPathAllowed(projectRoot, transportLeasePath, { purpose: "runtime-write" });
  if (existsSync(absoluteLeasePath)) {
    throw new ComathError("Pi/Codex lifecycle operator transport lease already exists", {
      statusCode: 409,
      code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_LEASE_ALREADY_EXISTS"
    });
  }
  mkdirSync(dirname(absoluteLeasePath), { recursive: true });
  writeFileSync(absoluteLeasePath, artifactText, "utf8");
  const result: PiCodexLifecycleOperatorTransportLease = {
    ...body,
    transport_lease_artifact: {
      kind: "operator_transport_lease",
      path: transportLeasePath,
      sha256: sha256Text(artifactText),
      size_bytes: Buffer.byteLength(artifactText, "utf8")
    }
  };
  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.pi_codex_lifecycle_operator_transport_lease_opened",
    actor: sanitizeOperatorTransportText(input.actor),
    target_id: projectId,
    payload: {
      transport_lease_id: leaseId,
      transport_recovery_id: recoveryId,
      session_id: sessionId,
      transport_kind: transportKind,
      session_manifest_path: sessionManifestPath,
      transport_recovery_path: recoveryPath,
      transport_lease_path: transportLeasePath,
      heartbeat_interval_ms: heartbeatIntervalMs,
      lease_ttl_ms: leaseTtlMs,
      durable_recovery_checkpoint_required: true,
      bounded_live_transport_lease_provided: true,
      durable_transport_provided: false,
      live_transport_open: true,
      indefinite_stream_open: false,
      long_lived_websocket_provided: false,
      long_lived_sse_provided: false,
      pi_direct_write_allowed: false,
      direct_trusted_state_mutation: false,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  });
  return result;
}

export function recordPiCodexLifecycleGuidedRealPiExecution(
  projectRoot: string,
  input: PiCodexGuidedRealPiExecutionInput
): PiCodexGuidedRealPiExecution {
  const projectId = assertOperatorSessionProjectId(input.project_id);
  const executionId = assertGuidedRealPiExecutionId(input.execution_id);
  const realPiRuntimeProbeId = assertRealPiRuntimeProbeId(input.real_pi_runtime_probe_id);
  const sessionId = assertOperatorSessionId(input.session_id);
  const recoveryId = assertOperatorTransportRecoveryId(input.transport_recovery_id);
  const leaseId = assertOperatorTransportLeaseId(input.transport_lease_id);
  const outcome = assertGuidedRealPiExecutionOutcome(input.execution_outcome);
  const piHostLabel = input.pi_host_label === undefined ? undefined : assertPiHostLabel(input.pi_host_label);
  const runtimeRegistrationArtifact = readGuidedRealPiRuntimeRegistrationSnapshot(
    projectRoot,
    projectId,
    realPiRuntimeProbeId,
    input.runtime_registration_snapshot_path
  );
  const piInstallArtifact = readGuidedRealPiInstallTranscript(projectRoot, input.pi_install_transcript_path);
  const sessionManifestPath = resolveOperatorTransportSessionManifestPath(
    projectRoot,
    sessionId,
    input.session_manifest_path
  );
  const { artifact: sessionManifestArtifact } = readOperatorTransportSessionManifest(
    projectRoot,
    projectId,
    sessionId,
    sessionManifestPath
  );
  const recoveryPath = resolveOperatorTransportRecoveryPath(projectRoot, recoveryId, input.transport_recovery_path);
  const { recovery, artifact: transportRecoveryArtifact } = readOperatorTransportRecoveryCheckpoint(
    projectRoot,
    projectId,
    sessionId,
    recoveryId,
    recoveryPath
  );
  const leasePath = input.transport_lease_path
    ? projectRelativePath(
        projectRoot,
        assertPathAllowed(projectRoot, input.transport_lease_path, { purpose: "read", resolveRealpath: true })
      )
    : operatorTransportLeasePath(leaseId);
  const { lease, artifact: transportLeaseArtifact } = readOperatorTransportLeaseArtifact(
    projectRoot,
    projectId,
    sessionId,
    recoveryId,
    leaseId,
    leasePath
  );
  if (
    recovery.session_manifest_path !== sessionManifestPath ||
    recovery.session_manifest_artifact.sha256 !== sessionManifestArtifact.sha256 ||
    lease.session_manifest_path !== sessionManifestPath ||
    lease.session_manifest_artifact.sha256 !== sessionManifestArtifact.sha256 ||
    lease.transport_recovery_path !== recoveryPath ||
    lease.transport_recovery_artifact.sha256 !== transportRecoveryArtifact.sha256
  ) {
    throw new ComathError("Pi/Codex guided real-Pi execution artifacts do not share a single lifecycle chain", {
      statusCode: 400,
      code: "PI_CODEX_GUIDED_REAL_PI_EXECUTION_ARTIFACT_CHAIN_MISMATCH"
    });
  }
  const guidedExecutionPath = guidedRealPiExecutionPath(executionId);
  const absoluteExecutionPath = assertPathAllowed(projectRoot, guidedExecutionPath, { purpose: "runtime-write" });
  if (existsSync(absoluteExecutionPath)) {
    throw new ComathError("Pi/Codex guided real-Pi execution artifact already exists", {
      statusCode: 409,
      code: "PI_CODEX_GUIDED_REAL_PI_EXECUTION_ALREADY_EXISTS"
    });
  }
  const body: PiCodexGuidedRealPiExecutionBody = {
    schema_version: "comath.pi_codex_guided_real_pi_execution.v1",
    execution_id: executionId,
    project_id: projectId,
    actor: sanitizeOperatorTransportText(input.actor),
    created_at: new Date().toISOString(),
    execution_status: "guided_real_pi_execution_recorded",
    execution_outcome: outcome,
    real_pi_runtime_probe_id: realPiRuntimeProbeId,
    ...(piHostLabel === undefined ? {} : { pi_host_label: piHostLabel }),
    session_id: sessionId,
    transport_recovery_id: recoveryId,
    transport_lease_id: leaseId,
    observed_routes: sanitizedObservedRoutes(input.observed_routes),
    operator_command_summary: sanitizeOperatorTransportText(input.operator_command_summary),
    final_operator_cursor: sanitizeOperatorTransportCursor(input.final_operator_cursor),
    next_recommended_route: sanitizeOperatorTransportText(input.next_recommended_route ?? lease.next_recommended_route),
    required_preconditions: [
      "real_pi_runtime_probe_observed",
      "operator_session_manifest_bound",
      "operator_transport_recovery_checkpoint_bound",
      "bounded_operator_transport_lease_bound"
    ],
    pi_install_transcript_path: piInstallArtifact.path,
    pi_install_artifact: piInstallArtifact,
    runtime_registration_snapshot_path: runtimeRegistrationArtifact.path,
    runtime_registration_artifact: runtimeRegistrationArtifact,
    session_manifest_path: sessionManifestPath,
    session_manifest_artifact: sessionManifestArtifact,
    transport_recovery_path: recoveryPath,
    transport_recovery_artifact: transportRecoveryArtifact,
    transport_lease_path: leasePath,
    transport_lease_artifact: transportLeaseArtifact,
    guided_execution_path: guidedExecutionPath,
    guided_real_pi_execution_observed: true,
    real_pi_runtime_probe_bound: true,
    operator_session_manifest_bound: true,
    operator_transport_recovery_bound: true,
    operator_transport_lease_bound: true,
    pi_direct_write_allowed: false,
    direct_trusted_state_mutation: false,
    durable_transport_provided: false,
    indefinite_stream_open: false,
    long_lived_websocket_provided: false,
    long_lived_sse_provided: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  };
  const artifactText = canonicalJson(body);
  mkdirSync(dirname(absoluteExecutionPath), { recursive: true });
  writeFileSync(absoluteExecutionPath, artifactText, "utf8");
  const result: PiCodexGuidedRealPiExecution = {
    ...body,
    guided_execution_artifact: {
      kind: "guided_real_pi_execution",
      path: guidedExecutionPath,
      sha256: sha256Text(artifactText),
      size_bytes: Buffer.byteLength(artifactText, "utf8")
    }
  };
  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.pi_codex_lifecycle_guided_real_pi_execution_recorded",
    actor: sanitizeOperatorTransportText(input.actor),
    target_id: projectId,
    payload: {
      execution_id: executionId,
      execution_status: result.execution_status,
      execution_outcome: outcome,
      real_pi_runtime_probe_id: realPiRuntimeProbeId,
      session_id: sessionId,
      transport_recovery_id: recoveryId,
      transport_lease_id: leaseId,
      guided_execution_path: guidedExecutionPath,
      guided_real_pi_execution_observed: true,
      real_pi_runtime_probe_bound: true,
      operator_session_manifest_bound: true,
      operator_transport_recovery_bound: true,
      operator_transport_lease_bound: true,
      pi_direct_write_allowed: false,
      direct_trusted_state_mutation: false,
      durable_transport_provided: false,
      indefinite_stream_open: false,
      long_lived_websocket_provided: false,
      long_lived_sse_provided: false,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  });
  return result;
}

export function probePiCodexDurableServiceLifecycle(
  projectRoot: string,
  input: PiCodexLifecycleServiceProbeInput,
  options: PiCodexLifecycleServiceProbeOptions = {}
): PiCodexLifecycleServiceProbeResult {
  const probeId = assertProbeId(input.probe_id);
  const serviceLabel = assertServiceLabel(input.service_label);
  const timeoutMs = assertProbeTimeout(input.timeout_ms);
  const allowedPrograms = configuredLifecycleAllowedPrograms();
  const start = prepareProbeCommand("start", requiredProbeCommand(input.commands, "start"), timeoutMs, allowedPrograms);
  const status = prepareProbeCommand("status", requiredProbeCommand(input.commands, "status"), timeoutMs, allowedPrograms);
  const stop = prepareProbeCommand("stop", requiredProbeCommand(input.commands, "stop"), timeoutMs, allowedPrograms);
  const restart = prepareProbeCommand("restart", requiredProbeCommand(input.commands, "restart"), timeoutMs, allowedPrograms);
  const runner = options.runner ?? defaultLifecycleProbeRunner;
  const commands = [
    runProbeStep("start", start, runner),
    runProbeStep("status_after_start", status, runner),
    runProbeStep("stop", stop, runner),
    runProbeStep("restart", restart, runner),
    runProbeStep("status_after_restart", status, runner)
  ];
  const byStep = new Map(commands.map((command) => [command.step, command]));
  const serviceStartObserved = Boolean(byStep.get("start")?.ok && byStep.get("status_after_start")?.ok);
  const serviceStopObserved = Boolean(byStep.get("stop")?.ok);
  const serviceRestartObserved = Boolean(byStep.get("restart")?.ok && byStep.get("status_after_restart")?.ok);
  const vetoes = commands.flatMap(probeVetoForCommand);
  const ok = serviceStartObserved && serviceStopObserved && serviceRestartObserved && vetoes.length === 0;
  const serviceLifecycleLogPath = normalizeRelativePath(
    join(".comath", "release", "pi-codex-lifecycle", probeId, "service-lifecycle-probe.json")
  );
  const artifactBody: PiCodexLifecycleServiceProbeArtifactBody = {
    schema_version: "comath.pi_codex_durable_service_lifecycle_probe.v1",
    probe_id: probeId,
    project_id: input.project_id,
    service_label: serviceLabel,
    created_at: new Date().toISOString(),
    ok,
    probe_status: ok ? "durable_service_lifecycle_observed" : "blocked_service_lifecycle_probe_failed",
    service_lifecycle_log_path: serviceLifecycleLogPath,
    readiness_fragment: {
      comathd_server_kind: "durable_service",
      service_start_observed: serviceStartObserved,
      service_stop_observed: serviceStopObserved,
      service_restart_observed: serviceRestartObserved
    },
    commands,
    vetoes,
    shell: false,
    network: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  };
  const absoluteProbePath = assertPathAllowed(projectRoot, serviceLifecycleLogPath, { purpose: "runtime-write" });
  mkdirSync(dirname(absoluteProbePath), { recursive: true });
  const artifactText = canonicalJson(artifactBody);
  writeFileSync(absoluteProbePath, artifactText, "utf8");
  const result: PiCodexLifecycleServiceProbeResult = {
    ...artifactBody,
    service_lifecycle_artifact: {
      kind: "durable_service_lifecycle_log",
      path: serviceLifecycleLogPath,
      sha256: sha256Text(artifactText),
      size_bytes: Buffer.byteLength(artifactText, "utf8")
    }
  };
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "release.pi_codex_lifecycle_service_probe_completed",
    actor: input.actor,
    target_id: input.project_id,
    payload: {
      probe_id: probeId,
      ok,
      probe_status: result.probe_status,
      service_lifecycle_log_path: serviceLifecycleLogPath,
      service_start_observed: serviceStartObserved,
      service_stop_observed: serviceStopObserved,
      service_restart_observed: serviceRestartObserved,
      veto_codes: vetoes.map((veto) => veto.code),
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  });
  return result;
}

function defaultRealPiRuntimeProbeRunner(
  command: PiCodexRealPiRuntimeProbeRunnerCommand
): PiCodexRealPiRuntimeProbeRunnerResult {
  return defaultLifecycleProbeRunner(command);
}

function realPiTranscriptText(input: {
  probeId: string;
  projectId: string;
  piHostLabel: string;
  createdAt: string;
  ok: boolean;
  probeStatus: PiCodexRealPiRuntimeProbeResult["probe_status"];
  commands: PiCodexRealPiRuntimeProbeCommandRecord[];
  vetoes: PiCodexRealPiRuntimeProbeVeto[];
}): string {
  const lines = [
    "# CoMath Pi/Codex Real-Pi Install Runtime Probe",
    "",
    `probe_id: ${input.probeId}`,
    `project_id: ${input.projectId}`,
    `pi_host_label: ${input.piHostLabel}`,
    `created_at: ${input.createdAt}`,
    `ok: ${input.ok}`,
    `probe_status: ${input.probeStatus}`,
    "proof_authority: none",
    "can_promote_claim: false",
    "can_certify_ga: false",
    "",
    "## Commands",
    ...input.commands.map(
      (command) =>
        `- ${command.step}: ok=${command.ok}; program=${command.program_label}; args_sha256=${command.args_sha256}; exit_code=${command.exit_code ?? "null"}; stdout=${command.stdout}; stderr=${command.stderr}`
    ),
    "",
    "## Vetoes",
    ...(input.vetoes.length > 0
      ? input.vetoes.map((veto) => `- ${veto.code}: ${veto.message}`)
      : ["- none"])
  ];
  return `${scrubHostPaths(lines.join("\n"))}\n`;
}

export function probePiCodexRealPiInstallRuntimeRegistration(
  projectRoot: string,
  input: PiCodexRealPiRuntimeProbeInput,
  options: PiCodexRealPiRuntimeProbeOptions = {}
): PiCodexRealPiRuntimeProbeResult {
  const probeId = assertRealPiRuntimeProbeId(input.probe_id);
  const piHostLabel = assertPiHostLabel(input.pi_host_label);
  const host = assertRealPiRuntimeProbeHost(input);
  const timeoutMs = assertProbeTimeout(input.timeout_ms);
  const allowedPrograms = configuredLifecycleAllowedPrograms();
  const install = prepareRealPiRuntimeCommand(
    "install",
    requiredRealPiRuntimeCommand(input.commands, "install"),
    timeoutMs,
    allowedPrograms
  );
  const runtimeRegistration = prepareRealPiRuntimeCommand(
    "runtime_registration",
    requiredRealPiRuntimeCommand(input.commands, "runtime_registration"),
    timeoutMs,
    allowedPrograms
  );
  const hostConfirmation = prepareRealPiRuntimeCommand(
    "host_confirmation",
    requiredRealPiRuntimeCommand(input.commands, "host_confirmation"),
    timeoutMs,
    allowedPrograms
  );
  const runner = options.runner ?? defaultRealPiRuntimeProbeRunner;
  const commands = [
    runRealPiRuntimeProbeStep("install", install, runner),
    runRealPiRuntimeProbeStep("runtime_registration", runtimeRegistration, runner),
    runRealPiRuntimeProbeStep("host_confirmation", hostConfirmation, runner)
  ];
  const byStep = new Map(commands.map((command) => [command.step, command]));
  const runtimeEntrypointImported = Boolean(byStep.get("install")?.ok);
  const runtimeRegistered = Boolean(byStep.get("runtime_registration")?.ok);
  const hostConfirmationObserved = Boolean(byStep.get("host_confirmation")?.ok);
  const vetoes = commands.flatMap(realPiRuntimeProbeVetoForCommand);
  const ok = runtimeEntrypointImported && runtimeRegistered && hostConfirmationObserved && vetoes.length === 0;
  const probeStatus = ok
    ? "real_pi_install_runtime_observed"
    : "blocked_real_pi_install_runtime_probe_failed";
  const createdAt = new Date().toISOString();
  const piInstallTranscriptPath = normalizeRelativePath(
    join(".comath", "release", "pi-codex-lifecycle", probeId, "pi-install-transcript.md")
  );
  const runtimeRegistrationSnapshotPath = normalizeRelativePath(
    join(".comath", "release", "pi-codex-lifecycle", probeId, "runtime-registration-snapshot.json")
  );
  const artifactBody: PiCodexRealPiRuntimeProbeArtifactBody = {
    schema_version: "comath.pi_codex_real_pi_install_runtime_probe.v1",
    probe_id: probeId,
    project_id: input.project_id,
    pi_host_label: piHostLabel,
    created_at: createdAt,
    ok,
    probe_status: probeStatus,
    pi_install_transcript_path: piInstallTranscriptPath,
    runtime_registration_snapshot_path: runtimeRegistrationSnapshotPath,
    readiness_fragment: {
      session_kind: host.sessionKind,
      pi_host_kind: host.piHostKind,
      runtime_entrypoint_imported: runtimeEntrypointImported,
      runtime_registered: runtimeRegistered,
      host_confirmation_observed: hostConfirmationObserved
    },
    commands,
    vetoes,
    shell: false,
    network: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  };
  const installTranscript = realPiTranscriptText({
    probeId,
    projectId: input.project_id,
    piHostLabel,
    createdAt,
    ok,
    probeStatus,
    commands,
    vetoes
  });
  const runtimeSnapshot = canonicalJson({
    schema_version: "comath.pi_codex_runtime_registration_snapshot.v1",
    probe_id: probeId,
    project_id: input.project_id,
    pi_host_label: piHostLabel,
    created_at: createdAt,
    session_kind: host.sessionKind,
    pi_host_kind: host.piHostKind,
    runtime_entrypoint_imported: runtimeEntrypointImported,
    runtime_registered: runtimeRegistered,
    host_confirmation_observed: hostConfirmationObserved,
    commands: commands.map((command) => ({
      step: command.step,
      ok: command.ok,
      program_label: command.program_label,
      program_path_sha256: command.program_path_sha256,
      args_count: command.args_count,
      args_sha256: command.args_sha256,
      exit_code: command.exit_code,
      timed_out: command.timed_out
    })),
    vetoes,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  });
  const absoluteInstallPath = assertPathAllowed(projectRoot, piInstallTranscriptPath, { purpose: "runtime-write" });
  const absoluteRuntimePath = assertPathAllowed(projectRoot, runtimeRegistrationSnapshotPath, {
    purpose: "runtime-write"
  });
  mkdirSync(dirname(absoluteInstallPath), { recursive: true });
  mkdirSync(dirname(absoluteRuntimePath), { recursive: true });
  writeFileSync(absoluteInstallPath, installTranscript, "utf8");
  writeFileSync(absoluteRuntimePath, runtimeSnapshot, "utf8");
  const result: PiCodexRealPiRuntimeProbeResult = {
    ...artifactBody,
    pi_install_artifact: {
      kind: "pi_install_transcript",
      path: piInstallTranscriptPath,
      sha256: sha256Text(installTranscript),
      size_bytes: Buffer.byteLength(installTranscript, "utf8")
    },
    runtime_registration_artifact: {
      kind: "runtime_registration_snapshot",
      path: runtimeRegistrationSnapshotPath,
      sha256: sha256Text(runtimeSnapshot),
      size_bytes: Buffer.byteLength(runtimeSnapshot, "utf8")
    }
  };
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "release.pi_codex_real_pi_runtime_probe_completed",
    actor: input.actor,
    target_id: input.project_id,
    payload: {
      probe_id: probeId,
      ok,
      probe_status: probeStatus,
      pi_host_label: piHostLabel,
      pi_install_transcript_path: piInstallTranscriptPath,
      runtime_registration_snapshot_path: runtimeRegistrationSnapshotPath,
      runtime_entrypoint_imported: runtimeEntrypointImported,
      runtime_registered: runtimeRegistered,
      host_confirmation_observed: hostConfirmationObserved,
      veto_codes: vetoes.map((veto) => veto.code),
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  });
  return result;
}

function codexValidationOutcome(
  failureCode: string | undefined,
  ok: boolean
): {
  validationStatus: PiCodexProductionCodexAccountNetworkProbeResult["validation_status"];
  accountNetworkValidation: PiCodexLifecycleCodexEvidence["codex_api_account_network_validation"];
  vetoes: PiCodexProductionCodexAccountNetworkProbeVeto[];
} {
  if (ok) {
    return {
      validationStatus: "production_codex_account_network_validation_passed",
      accountNetworkValidation: "passed",
      vetoes: []
    };
  }
  if (failureCode === "AGENT_ADAPTER_PACKAGE_CODEX_API_KEY_MISSING") {
    return {
      validationStatus: "blocked_missing_codex_api_credentials",
      accountNetworkValidation: "blocked_missing_credentials",
      vetoes: [
        {
          code: "codex_api_credentials_missing",
          message: "Production Codex API account/network validation requires service-owned Codex API credentials."
        }
      ]
    };
  }
  return {
    validationStatus: "blocked_codex_api_account_network_validation_failed",
    accountNetworkValidation: "blocked_network_or_account_failure",
    vetoes: [
      {
        code: "codex_api_account_network_validation_failed",
        message: "Production Codex API account/network validation did not complete successfully."
      }
    ]
  };
}

export async function probePiCodexProductionCodexAccountNetwork(
  projectRoot: string,
  input: PiCodexProductionCodexAccountNetworkProbeInput
): Promise<PiCodexProductionCodexAccountNetworkProbeResult> {
  const validationId = assertCodexValidationId(input.validation_id);
  const validation = await validateCodexApiAccountNetworkConnectivity({
    project_id: input.project_id,
    validation_id: validationId,
    actor: input.actor
  });
  const outcome = codexValidationOutcome(validation.failure_code, validation.ok);
  const codexValidationReportPath = normalizeRelativePath(
    join(".comath", "release", "pi-codex-lifecycle", validationId, "codex-account-network-validation.json")
  );
  const artifactBody: PiCodexProductionCodexAccountNetworkProbeArtifactBody = {
    schema_version: "comath.pi_codex_production_codex_account_network_probe.v1",
    validation_id: validationId,
    project_id: input.project_id,
    created_at: new Date().toISOString(),
    ok: validation.ok,
    validation_status: outcome.validationStatus,
    account_network_validation: outcome.accountNetworkValidation,
    credential_source: "service_env",
    base_url_host: validation.base_url_host,
    model: validation.model,
    response_id: validation.response_id,
    status: validation.status,
    attempts: validation.attempts,
    statuses: validation.statuses,
    rate_limited: validation.rate_limited,
    codex_validation_report_path: codexValidationReportPath,
    readiness_fragment: {
      codex_api_account_network_validation: outcome.accountNetworkValidation
    },
    vetoes: outcome.vetoes,
    shell: false,
    network: true,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  };
  const absoluteReportPath = assertPathAllowed(projectRoot, codexValidationReportPath, { purpose: "runtime-write" });
  mkdirSync(dirname(absoluteReportPath), { recursive: true });
  const artifactText = canonicalJson(artifactBody);
  writeFileSync(absoluteReportPath, artifactText, "utf8");
  const result: PiCodexProductionCodexAccountNetworkProbeResult = {
    ...artifactBody,
    codex_validation_artifact: {
      kind: "codex_validation_report",
      path: codexValidationReportPath,
      sha256: sha256Text(artifactText),
      size_bytes: Buffer.byteLength(artifactText, "utf8")
    }
  };
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "release.pi_codex_codex_api_account_network_validated",
    actor: input.actor,
    target_id: input.project_id,
    payload: {
      validation_id: validationId,
      ok: result.ok,
      validation_status: result.validation_status,
      account_network_validation: result.account_network_validation,
      attempts: result.attempts,
      statuses: result.statuses,
      rate_limited: result.rate_limited,
      codex_validation_report_path: result.codex_validation_report_path,
      veto_codes: result.vetoes.map((veto) => veto.code),
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  });
  return result;
}

function pushVeto(vetoes: PiCodexLifecycleReadinessVeto[], code: string, message: string): void {
  vetoes.push({ code, message });
}

function buildChecks(
  installSession: PiCodexLifecycleInstallSessionEvidence,
  codex: PiCodexLifecycleCodexEvidence
): PiCodexLifecycleReadinessReview["checks"] {
  const realPiHostRuntime =
    installSession.pi_host_kind === "real_pi_host" &&
    installSession.runtime_entrypoint_imported &&
    installSession.runtime_registered &&
    installSession.host_confirmation_observed;
  const durableLifecycle =
    installSession.comathd_server_kind === "durable_service" &&
    installSession.service_start_observed &&
    installSession.service_stop_observed &&
    installSession.service_restart_observed;
  const productionCodexValidation =
    codex.installed_cli_validation_ok &&
    codex.installed_cli_probe_source === "service_owned_process" &&
    codex.codex_api_account_network_validation === "passed";

  return {
    real_pi_host_runtime: {
      ok: realPiHostRuntime,
      required: true,
      observed: installSession.pi_host_kind
    },
    durable_comathd_service_lifecycle: {
      ok: durableLifecycle,
      required: true,
      observed: installSession.comathd_server_kind
    },
    production_codex_validation: {
      ok: productionCodexValidation,
      required: true,
      observed: codex.codex_api_account_network_validation
    }
  };
}

function buildVetoes(
  checks: PiCodexLifecycleReadinessReview["checks"],
  codex: PiCodexLifecycleCodexEvidence
): PiCodexLifecycleReadinessVeto[] {
  const vetoes: PiCodexLifecycleReadinessVeto[] = [];
  if (!checks.real_pi_host_runtime.ok) {
    pushVeto(
      vetoes,
      "real_pi_host_validation_missing",
      "Phase45 fake-host install-session evidence is not real Pi host validation."
    );
  }
  if (!checks.durable_comathd_service_lifecycle.ok) {
    pushVeto(
      vetoes,
      "durable_comathd_service_lifecycle_missing",
      "Ephemeral HTTP install sessions do not prove durable comathd service start, stop, and restart lifecycle readiness."
    );
  }
  if (!codex.installed_cli_validation_ok || codex.installed_cli_probe_source !== "service_owned_process") {
    pushVeto(
      vetoes,
      "installed_codex_cli_service_probe_missing",
      "Installed Codex CLI readiness requires a service-owned non-injected validation probe."
    );
  }
  if (!checks.production_codex_validation.ok) {
    pushVeto(
      vetoes,
      "production_codex_account_network_validation_missing",
      "Production Codex account and network validation has not passed."
    );
  }
  return vetoes;
}

export function collectPiCodexLifecycleEvidence(
  projectRoot: string,
  input: PiCodexLifecycleEvidenceInput
): PiCodexLifecycleEvidenceBundle {
  const evidenceId = assertEvidenceId(input.evidence_id);
  const artifacts: PiCodexLifecycleEvidenceArtifact[] = [
    readLifecycleArtifact(projectRoot, "pi_install_transcript", input.artifact_paths.pi_install_transcript_path),
    readLifecycleArtifact(
      projectRoot,
      "runtime_registration_snapshot",
      input.artifact_paths.runtime_registration_snapshot_path
    ),
    readLifecycleArtifact(projectRoot, "durable_service_lifecycle_log", input.artifact_paths.service_lifecycle_log_path),
    readLifecycleArtifact(projectRoot, "codex_validation_report", input.artifact_paths.codex_validation_report_path)
  ];
  const checks = buildChecks(input.install_session_evidence, input.codex_evidence);
  const collectionStatus =
    checks.real_pi_host_runtime.ok && checks.durable_comathd_service_lifecycle.ok && checks.production_codex_validation.ok
      ? "evidence_ready_for_readiness_review"
      : "blocked_missing_real_host_lifecycle_evidence";
  const evidencePath = normalizeRelativePath(join(".comath", "release", "pi-codex-lifecycle", evidenceId, "evidence.json"));
  const bundle: PiCodexLifecycleEvidenceBundle = {
    schema_version: "comath.pi_codex_lifecycle_evidence.v1",
    evidence_id: evidenceId,
    project_id: input.project_id,
    created_at: new Date().toISOString(),
    collection_status: collectionStatus,
    evidence_path: evidencePath,
    artifacts,
    readiness_input: {
      project_id: input.project_id,
      install_session_evidence: input.install_session_evidence,
      codex_evidence: input.codex_evidence
    },
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  };

  const absoluteEvidencePath = assertPathAllowed(projectRoot, evidencePath, { purpose: "runtime-write" });
  mkdirSync(dirname(absoluteEvidencePath), { recursive: true });
  writeFileSync(absoluteEvidencePath, canonicalJson(bundle), "utf8");
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "release.pi_codex_lifecycle_evidence_collected",
    actor: input.actor,
    target_id: input.project_id,
    payload: {
      evidence_id: evidenceId,
      collection_status: collectionStatus,
      evidence_path: evidencePath,
      artifact_kinds: artifacts.map((artifact) => artifact.kind),
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  });
  return bundle;
}

export function reviewPiCodexLifecycleReadiness(
  projectRoot: string,
  input: PiCodexLifecycleReadinessInput
): PiCodexLifecycleReadinessReview {
  const reviewId = assertReviewId(input.review_id);
  const installSession = {
    ...defaultInstallSessionEvidence,
    ...(input.install_session_evidence ?? {})
  };
  const codex = {
    ...defaultCodexEvidence,
    ...(input.codex_evidence ?? {})
  };
  const checks = buildChecks(installSession, codex);
  const vetoes = buildVetoes(checks, codex);
  const ok = vetoes.length === 0;
  const reviewPath = normalizeRelativePath(join(".comath", "release", "pi-codex-lifecycle", reviewId, "review.json"));
  const review: PiCodexLifecycleReadinessReview = {
    schema_version: "comath.pi_codex_lifecycle_readiness.v1",
    review_id: reviewId,
    project_id: input.project_id,
    created_at: new Date().toISOString(),
    ok,
    readiness_status: ok
      ? "ready_for_real_host_lifecycle_release_review"
      : "blocked_missing_real_host_lifecycle_validation",
    review_path: reviewPath,
    inputs: {
      install_session_evidence: installSession,
      codex_evidence: codex
    },
    checks,
    vetoes,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  };

  const absoluteReviewPath = assertPathAllowed(projectRoot, reviewPath, { purpose: "runtime-write" });
  mkdirSync(dirname(absoluteReviewPath), { recursive: true });
  writeFileSync(absoluteReviewPath, canonicalJson(review), "utf8");
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "release.pi_codex_lifecycle_readiness_reviewed",
    actor: input.actor,
    target_id: input.project_id,
    payload: {
      review_id: reviewId,
      ok,
      readiness_status: review.readiness_status,
      veto_codes: vetoes.map((veto) => veto.code),
      review_path: reviewPath,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  });
  return review;
}
