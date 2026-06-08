import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { existsSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { formatAgentRunLogSseSession, type AgentRunLogCursor } from "../agents/agent-run-observability.js";
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
  completion_certification_prerequisite_id?: string;
  completion_certification_prerequisite_path?: string;
  completion_certification_prerequisite_sha256?: string;
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

export type PiCodexLifecycleCompletionCertificationPrerequisiteBinding = {
  completion_certification_prerequisite_id: string;
  completion_certification_prerequisite_status: "blocked_terminal_unattended_completion_certification_required";
  terminal_goal_state: "blocked_with_replayable_certificate";
  artifact: PiCodexUnattendedRealHostCompletionCertificationPrerequisiteArtifact;
  completion_certificate_available: false;
  terminal_unattended_completion_certified: false;
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
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
    completion_certification_prerequisite?: PiCodexLifecycleCompletionCertificationPrerequisiteBinding;
  };
  checks: {
    real_pi_host_runtime: PiCodexLifecycleReadinessCheck;
    durable_comathd_service_lifecycle: PiCodexLifecycleReadinessCheck;
    production_codex_validation: PiCodexLifecycleReadinessCheck;
    terminal_unattended_completion_certification?: PiCodexLifecycleReadinessCheck;
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

export type PiCodexLifecycleOperatorTransportLogSessionBinding = {
  binding_source: "service_owned_agent_run_log_session";
  project_id: string;
  run_id: string;
  route: string;
  content_type: "text/event-stream; charset=utf-8";
  cursor: AgentRunLogCursor;
  next_cursor: AgentRunLogCursor;
  event_count: number;
  complete: boolean;
  body_sha256: string;
  proof_authority: "none";
  durable_transport_provided: false;
  long_lived_sse_provided: false;
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
  operator_transport_log_session_bound: true;
  agent_run_log_session_binding: PiCodexLifecycleOperatorTransportLogSessionBinding;
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

export type PiCodexLifecycleOperatorTransportHeartbeatInput = {
  project_id: string;
  session_id: string;
  actor: string;
  transport_recovery_id: string;
  transport_lease_id: string;
  transport_heartbeat_id?: string;
  session_manifest_path?: string;
  transport_recovery_path?: string;
  transport_lease_path?: string;
  requested_cursor?: Partial<PiCodexLifecycleOperatorTransportRecoveryCursor>;
  client_epoch?: number;
  last_seen_event_id?: string;
  heartbeat_reason?: string;
};

export type PiCodexLifecycleOperatorTransportHeartbeatArtifact = {
  kind: "operator_transport_heartbeat";
  path: string;
  sha256: string;
  size_bytes: number;
};

export type PiCodexLifecycleOperatorTransportHeartbeat = {
  schema_version: "comath.pi_codex_lifecycle_operator_transport_heartbeat.v1";
  transport_heartbeat_id: string;
  transport_lease_id: string;
  transport_recovery_id: string;
  project_id: string;
  session_id: string;
  actor: string;
  created_at: string;
  heartbeat_status: "operator_transport_heartbeat_rebound";
  transport_kind: PiCodexLifecycleOperatorTransportLeaseKind;
  lease_route: string;
  requested_cursor: PiCodexLifecycleOperatorTransportRecoveryCursor;
  client_epoch: number;
  heartbeat_interval_ms: number;
  lease_ttl_ms: number;
  lease_started_at: string;
  lease_expires_at: string;
  heartbeat_required: true;
  last_seen_event_id: string;
  heartbeat_reason: string;
  session_manifest_path: string;
  session_manifest_artifact: PiCodexLifecycleOperatorSessionManifestArtifact;
  transport_recovery_path: string;
  transport_recovery_artifact: PiCodexLifecycleOperatorTransportRecoveryArtifact;
  transport_lease_path: string;
  lease_artifact: PiCodexLifecycleOperatorTransportLeaseArtifact;
  next_recommended_route: string;
  transport_heartbeat_path: string;
  transport_heartbeat_artifact: PiCodexLifecycleOperatorTransportHeartbeatArtifact;
  operator_transport_lease_bound: true;
  operator_transport_log_session_rebound: true;
  agent_run_log_session_binding: PiCodexLifecycleOperatorTransportLogSessionBinding;
  lease_still_valid: true;
  durable_recovery_checkpoint_required: true;
  bounded_live_transport_lease_bound: true;
  bounded_heartbeat_checkpoint_provided: true;
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

type PiCodexLifecycleOperatorTransportHeartbeatBody = Omit<
  PiCodexLifecycleOperatorTransportHeartbeat,
  "transport_heartbeat_artifact"
>;

type OperatorTransportLeaseBoundaryOptions = {
  allowLiveLogGrowth?: boolean;
};

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

export type PiCodexGuidedExecutionTerminalChainStep =
  | "real_pi_runtime_probe"
  | "operator_session_manifest"
  | "operator_transport_recovery_checkpoint"
  | "bounded_operator_transport_lease"
  | "operator_transport_heartbeat_rebind"
  | "guided_real_pi_execution";

export type PiCodexGuidedExecutionTerminalChainReviewInput = {
  project_id: string;
  review_id?: string;
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
  transport_heartbeat_id: string;
  transport_heartbeat_path?: string;
  execution_id: string;
  guided_execution_path?: string;
};

export type PiCodexGuidedExecutionTerminalChainReviewVeto = {
  code: string;
  message: string;
};

export type PiCodexGuidedExecutionTerminalChainReview = {
  schema_version: "comath.pi_codex_guided_execution_terminal_chain_review.v1";
  review_id: string;
  project_id: string;
  created_at: string;
  ok: boolean;
  review_status:
    | "guided_real_pi_terminal_chain_ready_for_release_review"
    | "blocked_missing_guided_real_pi_terminal_chain";
  review_path: string;
  ordered_steps: PiCodexGuidedExecutionTerminalChainStep[];
  required_preconditions: PiCodexGuidedExecutionTerminalChainStep[];
  real_pi_runtime_probe_id: string;
  session_id: string;
  transport_recovery_id: string;
  transport_lease_id: string;
  transport_heartbeat_id: string;
  execution_id: string;
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
  transport_heartbeat_path: string;
  transport_heartbeat_artifact: PiCodexLifecycleOperatorTransportHeartbeatArtifact;
  guided_execution_path: string;
  guided_execution_artifact: PiCodexGuidedRealPiExecutionArtifact;
  agent_run_log_session_binding: PiCodexLifecycleOperatorTransportLogSessionBinding;
  terminal_chain_bound: boolean;
  heartbeat_consumed_by_review: boolean;
  guided_execution_consumed_by_review: boolean;
  vetoes: PiCodexGuidedExecutionTerminalChainReviewVeto[];
  pi_direct_write_allowed: false;
  direct_trusted_state_mutation: false;
  durable_transport_provided: false;
  live_transport_open: false;
  indefinite_stream_open: false;
  long_lived_websocket_provided: false;
  long_lived_sse_provided: false;
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
};

export type PiCodexOperatorServiceTransportPrimitive = "node_http_agent_run_log_session_route";
export type PiCodexOperatorClientTransportPrimitive = "pi_fetch_get_text";

export type PiCodexOperatorServiceTransportContractInput = {
  project_id: string;
  transport_contract_id?: string;
  actor: string;
  terminal_review_id: string;
  terminal_review_path?: string;
  max_bytes?: number;
  max_events?: number;
  retry_ms?: number;
  service_transport_primitive?: PiCodexOperatorServiceTransportPrimitive;
  client_transport_primitive?: PiCodexOperatorClientTransportPrimitive;
};

export type PiCodexOperatorServiceTransportContinuityInput = {
  project_id: string;
  continuity_id?: string;
  actor: string;
  transport_contract_id: string;
  transport_contract_path?: string;
  transport_contract_sha256: string;
  max_bytes?: number;
  max_events?: number;
  retry_ms?: number;
  service_transport_primitive?: PiCodexOperatorServiceTransportPrimitive;
  client_transport_primitive?: PiCodexOperatorClientTransportPrimitive;
};

export type PiCodexGuidedExecutionTerminalChainReviewArtifact = {
  kind: "guided_execution_terminal_chain_review";
  path: string;
  sha256: string;
  size_bytes: number;
};

export type PiCodexOperatorServiceTransportContractArtifact = {
  kind: "operator_service_transport_contract";
  path: string;
  sha256: string;
  size_bytes: number;
};

export type PiCodexOperatorServiceTransportContract = {
  schema_version: "comath.pi_codex_operator_service_transport_contract.v1";
  transport_contract_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  contract_status: "maintained_bounded_transport_contract_recorded";
  transport_contract_path: string;
  transport_contract_artifact: PiCodexOperatorServiceTransportContractArtifact;
  terminal_review_id: string;
  terminal_review_path: string;
  terminal_review_artifact: PiCodexGuidedExecutionTerminalChainReviewArtifact;
  transport_heartbeat_id: string;
  transport_heartbeat_path: string;
  transport_heartbeat_artifact: PiCodexLifecycleOperatorTransportHeartbeatArtifact;
  execution_id: string;
  guided_execution_path: string;
  guided_execution_artifact: PiCodexGuidedRealPiExecutionArtifact;
  session_id: string;
  transport_recovery_id: string;
  transport_lease_id: string;
  agent_run_id: string;
  service_transport_primitive: PiCodexOperatorServiceTransportPrimitive;
  client_transport_primitive: PiCodexOperatorClientTransportPrimitive;
  http_method: "GET";
  service_route: string;
  content_type: "text/event-stream; charset=utf-8";
  bounded_limits: {
    max_bytes: number;
    max_events: number;
    retry_ms: number;
  };
  resume_cursor: AgentRunLogCursor;
  log_session_next_cursor: AgentRunLogCursor;
  log_session_event_count: number;
  log_session_body_sha256: string;
  maintained_transport_primitive_bound: true;
  service_route_bound: true;
  client_fetch_contract_bound: true;
  terminal_review_bound: true;
  heartbeat_bound: true;
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

type PiCodexOperatorServiceTransportContractBody = Omit<
  PiCodexOperatorServiceTransportContract,
  "transport_contract_artifact"
>;

export type PiCodexOperatorServiceTransportContinuityArtifact = {
  kind: "operator_service_transport_continuity";
  path: string;
  sha256: string;
  size_bytes: number;
};

export type PiCodexOperatorServiceTransportContinuity = {
  schema_version: "comath.pi_codex_operator_service_transport_continuity.v1";
  continuity_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  continuity_status: "maintained_bounded_transport_continuity_recorded";
  continuity_path: string;
  continuity_artifact: PiCodexOperatorServiceTransportContinuityArtifact;
  transport_contract_id: string;
  transport_contract_path: string;
  transport_contract_artifact: PiCodexOperatorServiceTransportContractArtifact;
  agent_run_id: string;
  service_transport_primitive: PiCodexOperatorServiceTransportPrimitive;
  client_transport_primitive: PiCodexOperatorClientTransportPrimitive;
  http_method: "GET";
  service_route: string;
  content_type: "text/event-stream; charset=utf-8";
  bounded_limits: {
    max_bytes: number;
    max_events: number;
    retry_ms: number;
  };
  previous_cursor: AgentRunLogCursor;
  previous_log_session_body_sha256: string;
  log_session_next_cursor: AgentRunLogCursor;
  log_session_event_count: number;
  log_session_body_sha256: string;
  maintained_transport_primitive_bound: true;
  service_route_bound: true;
  client_fetch_contract_bound: true;
  transport_contract_bound: true;
  durable_resume_checkpoint_recorded: true;
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

type PiCodexOperatorServiceTransportContinuityBody = Omit<
  PiCodexOperatorServiceTransportContinuity,
  "continuity_artifact"
>;

export type PiCodexUnattendedRealHostHandoffCheckpointId =
  | "runtime_probe"
  | "operator_session"
  | "transport_recovery"
  | "transport_lease"
  | "transport_heartbeat"
  | "guided_execution"
  | "terminal_review"
  | "transport_contract"
  | "automatic_orchestration"
  | "transport_continuity";

export type PiCodexUnattendedRealHostHandoffPreparedCheckpoint = {
  checkpoint_id: PiCodexUnattendedRealHostHandoffCheckpointId;
  public_path: string;
  canonical_path: string;
  sha256: string;
  size_bytes: number;
  current: true;
  proof_authority: "none";
  can_certify_ga: false;
};

export type PiCodexUnattendedRealHostHandoffReviewInput = {
  project_id: string;
  handoff_review_id?: string;
  actor: string;
  real_pi_runtime_probe_id: string;
  session_id: string;
  transport_recovery_id: string;
  transport_lease_id: string;
  transport_heartbeat_id: string;
  execution_id: string;
  terminal_review_id: string;
  transport_contract_id: string;
  automatic_orchestration_id: string;
  transport_continuity_id: string;
  runtime_probe_path: string;
  runtime_probe_sha256: string;
  operator_session_path: string;
  operator_session_sha256: string;
  transport_recovery_path: string;
  transport_recovery_sha256: string;
  transport_lease_path: string;
  transport_lease_sha256: string;
  transport_heartbeat_path: string;
  transport_heartbeat_sha256: string;
  guided_execution_path: string;
  guided_execution_sha256: string;
  terminal_review_path: string;
  terminal_review_sha256: string;
  transport_contract_path: string;
  transport_contract_sha256: string;
  automatic_orchestration_path: string;
  automatic_orchestration_sha256: string;
  transport_continuity_path: string;
  transport_continuity_sha256: string;
};

export type PiCodexUnattendedRealHostHandoffReviewArtifact = {
  kind: "unattended_real_host_handoff_review";
  path: string;
  sha256: string;
  size_bytes: number;
};

export type PiCodexUnattendedRealHostHandoffReview = {
  schema_version: "comath.pi_codex_unattended_real_host_handoff_review.v1";
  handoff_review_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  review_status: "prepared_unattended_real_host_handoff_review_recorded";
  handoff_review_path: string;
  handoff_review_artifact: PiCodexUnattendedRealHostHandoffReviewArtifact;
  prepared_checkpoint_order: PiCodexUnattendedRealHostHandoffCheckpointId[];
  prepared_checkpoints: PiCodexUnattendedRealHostHandoffPreparedCheckpoint[];
  real_pi_runtime_probe_id: string;
  pi_host_label: string;
  session_id: string;
  transport_recovery_id: string;
  transport_lease_id: string;
  transport_heartbeat_id: string;
  execution_id: string;
  terminal_review_id: string;
  transport_contract_id: string;
  automatic_orchestration_id: string;
  transport_continuity_id: string;
  agent_run_id: string;
  service_route: string;
  service_transport_primitive: PiCodexOperatorServiceTransportPrimitive;
  client_transport_primitive: PiCodexOperatorClientTransportPrimitive;
  prepared_checkpoint_hashes_current: true;
  service_owned_checkpoint_chain_reviewed: true;
  review_manifest_persisted: true;
  operator_approved: false;
  handoff_can_execute: false;
  unattended_execution_authorized: false;
  unattended_real_host_execution_completed: false;
  operator_confirmation_bypassed: false;
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

type PiCodexUnattendedRealHostHandoffReviewBody = Omit<
  PiCodexUnattendedRealHostHandoffReview,
  "handoff_review_artifact"
>;

export type PiCodexUnattendedRealHostOperatorApprovalInput = {
  project_id: string;
  approval_id?: string;
  actor: string;
  handoff_review_id: string;
  handoff_review_path: string;
  handoff_review_sha256: string;
  operator_approval_mode?: "manual_operator_approval";
  approval_note?: string;
};

export type PiCodexUnattendedRealHostOperatorApprovalArtifact = {
  kind: "unattended_real_host_operator_approval";
  path: string;
  sha256: string;
  size_bytes: number;
};

export type PiCodexUnattendedRealHostOperatorApproval = {
  schema_version: "comath.pi_codex_unattended_real_host_operator_approval.v1";
  approval_id: string;
  project_id: string;
  actor: string;
  approved_at: string;
  approval_status: "operator_approval_artifact_recorded";
  approval_path: string;
  operator_approval_artifact: PiCodexUnattendedRealHostOperatorApprovalArtifact;
  operator_approval_mode: "manual_operator_approval";
  approval_note: string;
  handoff_review_id: string;
  handoff_review_path: string;
  handoff_review_artifact: PiCodexUnattendedRealHostHandoffReviewArtifact;
  handoff_review_current: true;
  service_owned_checkpoint_chain_reviewed: true;
  approval_manifest_persisted: true;
  operator_approval_artifact_current: true;
  real_pi_runtime_probe_id: string;
  session_id: string;
  transport_recovery_id: string;
  transport_lease_id: string;
  transport_heartbeat_id: string;
  execution_id: string;
  terminal_review_id: string;
  transport_contract_id: string;
  automatic_orchestration_id: string;
  transport_continuity_id: string;
  agent_run_id: string;
  service_route: string;
  service_transport_primitive: PiCodexOperatorServiceTransportPrimitive;
  client_transport_primitive: PiCodexOperatorClientTransportPrimitive;
  operator_approved: false;
  handoff_can_execute: false;
  unattended_execution_authorized: false;
  unattended_real_host_execution_completed: false;
  operator_confirmation_bypassed: false;
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

type PiCodexUnattendedRealHostOperatorApprovalBody = Omit<
  PiCodexUnattendedRealHostOperatorApproval,
  "operator_approval_artifact"
>;

export type PiCodexUnattendedRealHostExecutorContractInput = {
  project_id: string;
  executor_contract_id?: string;
  actor: string;
  handoff_review_id: string;
  handoff_review_path: string;
  handoff_review_sha256: string;
  requested_execution_mode?: "production_unattended_real_host";
  executor_contract_kind?: "service_owned_unattended_real_host_executor_contract";
  executor_configuration_state?: "contract_recorded_executor_not_invoked";
};

export type PiCodexUnattendedRealHostExecutorContractArtifact = {
  kind: "unattended_real_host_executor_contract";
  path: string;
  sha256: string;
  size_bytes: number;
};

export type PiCodexUnattendedRealHostExecutorContract = {
  schema_version: "comath.pi_codex_unattended_real_host_executor_contract.v1";
  executor_contract_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  executor_contract_status: "executor_contract_recorded";
  executor_contract_path: string;
  executor_contract_artifact: PiCodexUnattendedRealHostExecutorContractArtifact;
  requested_execution_mode: "production_unattended_real_host";
  executor_contract_kind: "service_owned_unattended_real_host_executor_contract";
  executor_configuration_state: "contract_recorded_executor_not_invoked";
  handoff_review_id: string;
  handoff_review_path: string;
  handoff_review_artifact: PiCodexUnattendedRealHostHandoffReviewArtifact;
  handoff_review_current: true;
  service_owned_checkpoint_chain_reviewed: true;
  executor_contract_manifest_persisted: true;
  unattended_executor_contract_current: true;
  service_owned_unattended_executor_configured: true;
  real_pi_runtime_probe_id: string;
  session_id: string;
  transport_recovery_id: string;
  transport_lease_id: string;
  transport_heartbeat_id: string;
  execution_id: string;
  terminal_review_id: string;
  transport_contract_id: string;
  automatic_orchestration_id: string;
  transport_continuity_id: string;
  agent_run_id: string;
  service_route: string;
  service_transport_primitive: PiCodexOperatorServiceTransportPrimitive;
  client_transport_primitive: PiCodexOperatorClientTransportPrimitive;
  executor_invoked: false;
  operator_approved: false;
  handoff_can_execute: false;
  unattended_execution_authorized: false;
  unattended_real_host_execution_completed: false;
  operator_confirmation_bypassed: false;
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

type PiCodexUnattendedRealHostExecutorContractBody = Omit<
  PiCodexUnattendedRealHostExecutorContract,
  "executor_contract_artifact"
>;

export type PiCodexUnattendedRealHostDurableTransportContractInput = {
  project_id: string;
  durable_transport_contract_id?: string;
  actor: string;
  handoff_review_id: string;
  handoff_review_path: string;
  handoff_review_sha256: string;
  operator_approval_id: string;
  operator_approval_path: string;
  operator_approval_sha256: string;
  unattended_executor_contract_id: string;
  unattended_executor_contract_path: string;
  unattended_executor_contract_sha256: string;
  transport_continuity_id: string;
  transport_continuity_path: string;
  transport_continuity_sha256: string;
  durability_contract_kind?: "service_owned_external_durable_transport_prerequisite_contract";
  transport_prerequisite_state?: "contract_recorded_transport_not_opened";
};

export type PiCodexUnattendedRealHostDurableTransportContractArtifact = {
  kind: "unattended_real_host_durable_transport_contract";
  path: string;
  sha256: string;
  size_bytes: number;
};

export type PiCodexUnattendedRealHostDurableTransportContract = {
  schema_version: "comath.pi_codex_unattended_real_host_durable_transport_contract.v1";
  durable_transport_contract_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  durable_transport_contract_status: "durable_transport_prerequisite_contract_recorded";
  durable_transport_contract_path: string;
  durable_transport_contract_artifact: PiCodexUnattendedRealHostDurableTransportContractArtifact;
  durability_contract_kind: "service_owned_external_durable_transport_prerequisite_contract";
  transport_prerequisite_state: "contract_recorded_transport_not_opened";
  handoff_review_id: string;
  handoff_review_path: string;
  handoff_review_artifact: PiCodexUnattendedRealHostHandoffReviewArtifact;
  operator_approval_id: string;
  operator_approval_path: string;
  operator_approval_artifact: PiCodexUnattendedRealHostOperatorApprovalArtifact;
  unattended_executor_contract_id: string;
  unattended_executor_contract_path: string;
  unattended_executor_contract_artifact: PiCodexUnattendedRealHostExecutorContractArtifact;
  transport_continuity_id: string;
  transport_continuity_path: string;
  transport_continuity_artifact: PiCodexOperatorServiceTransportContinuityArtifact;
  handoff_review_current: true;
  operator_approval_artifact_current: true;
  unattended_executor_contract_current: true;
  transport_continuity_current: true;
  service_owned_checkpoint_chain_reviewed: true;
  durable_transport_contract_manifest_persisted: true;
  durable_transport_contract_current: true;
  service_owned_durable_transport_prerequisite_configured: true;
  real_pi_runtime_probe_id: string;
  session_id: string;
  transport_recovery_id: string;
  transport_lease_id: string;
  transport_heartbeat_id: string;
  execution_id: string;
  terminal_review_id: string;
  transport_contract_id: string;
  automatic_orchestration_id: string;
  agent_run_id: string;
  service_route: string;
  service_transport_primitive: PiCodexOperatorServiceTransportPrimitive;
  client_transport_primitive: PiCodexOperatorClientTransportPrimitive;
  operator_approved: false;
  handoff_can_execute: false;
  unattended_execution_authorized: false;
  unattended_real_host_execution_completed: false;
  operator_confirmation_bypassed: false;
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

type PiCodexUnattendedRealHostDurableTransportContractBody = Omit<
  PiCodexUnattendedRealHostDurableTransportContract,
  "durable_transport_contract_artifact"
>;

export type PiCodexUnattendedRealHostExecutionReadinessBlockerReason =
  | "operator_approval_artifact_missing"
  | "service_owned_unattended_executor_not_configured"
  | "durable_transport_not_provided";

export type PiCodexUnattendedRealHostExecutionReadinessInput = {
  project_id: string;
  readiness_id?: string;
  actor: string;
  handoff_review_id: string;
  handoff_review_path: string;
  handoff_review_sha256: string;
  operator_approval_id?: string;
  operator_approval_path?: string;
  operator_approval_sha256?: string;
  unattended_executor_contract_id?: string;
  unattended_executor_contract_path?: string;
  unattended_executor_contract_sha256?: string;
  durable_transport_contract_id?: string;
  durable_transport_contract_path?: string;
  durable_transport_contract_sha256?: string;
  requested_execution_mode?: "production_unattended_real_host";
};

export type PiCodexUnattendedRealHostExecutionReadinessArtifact = {
  kind: "unattended_real_host_execution_readiness";
  path: string;
  sha256: string;
  size_bytes: number;
};

export type PiCodexUnattendedRealHostExecutionReadiness = {
  schema_version: "comath.pi_codex_unattended_real_host_execution_readiness.v1";
  readiness_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  readiness_status:
    | "blocked_unattended_real_host_execution_not_authorized"
    | "unattended_real_host_execution_prerequisites_recorded";
  readiness_path: string;
  readiness_artifact: PiCodexUnattendedRealHostExecutionReadinessArtifact;
  requested_execution_mode: "production_unattended_real_host";
  blocker_reasons: PiCodexUnattendedRealHostExecutionReadinessBlockerReason[];
  handoff_review_id: string;
  handoff_review_path: string;
  handoff_review_artifact: PiCodexUnattendedRealHostHandoffReviewArtifact;
  handoff_review_current: true;
  service_owned_checkpoint_chain_reviewed: true;
  operator_approval_id: string | null;
  operator_approval_path: string | null;
  operator_approval_artifact: PiCodexUnattendedRealHostOperatorApprovalArtifact | null;
  operator_approval_artifact_current: boolean;
  unattended_executor_contract_id: string | null;
  unattended_executor_contract_path: string | null;
  unattended_executor_contract_artifact: PiCodexUnattendedRealHostExecutorContractArtifact | null;
  unattended_executor_contract_current: boolean;
  service_owned_unattended_executor_configured: boolean;
  durable_transport_contract_id: string | null;
  durable_transport_contract_path: string | null;
  durable_transport_contract_artifact: PiCodexUnattendedRealHostDurableTransportContractArtifact | null;
  durable_transport_contract_current: boolean;
  service_owned_durable_transport_prerequisite_configured: boolean;
  readiness_manifest_persisted: true;
  real_pi_runtime_probe_id: string;
  session_id: string;
  transport_recovery_id: string;
  transport_lease_id: string;
  transport_heartbeat_id: string;
  execution_id: string;
  terminal_review_id: string;
  transport_contract_id: string;
  automatic_orchestration_id: string;
  transport_continuity_id: string;
  agent_run_id: string;
  service_route: string;
  service_transport_primitive: PiCodexOperatorServiceTransportPrimitive;
  client_transport_primitive: PiCodexOperatorClientTransportPrimitive;
  operator_approved: false;
  handoff_can_execute: false;
  unattended_execution_authorized: false;
  unattended_real_host_execution_completed: false;
  operator_confirmation_bypassed: false;
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

type PiCodexUnattendedRealHostExecutionReadinessBody = Omit<
  PiCodexUnattendedRealHostExecutionReadiness,
  "readiness_artifact"
>;

export type PiCodexUnattendedRealHostExecutionAttemptBlockerReason =
  | "service_owned_unattended_executor_unavailable"
  | "service_owned_unattended_executor_failed";

export type PiCodexUnattendedRealHostExecutionAttemptCommandInput = PiCodexLifecycleServiceProbeCommandInput;

export type PiCodexUnattendedRealHostExecutionAttemptInput = {
  project_id: string;
  attempt_id?: string;
  actor: string;
  readiness_id: string;
  readiness_path: string;
  readiness_sha256: string;
  requested_execution_mode?: "production_unattended_real_host";
  executor_command?: PiCodexUnattendedRealHostExecutionAttemptCommandInput;
};

export type PiCodexUnattendedRealHostExecutionAttemptArtifact = {
  kind: "unattended_real_host_execution_attempt";
  path: string;
  sha256: string;
  size_bytes: number;
};

export type PiCodexUnattendedRealHostExecutionAttemptResultArtifact = {
  kind: "unattended_real_host_execution_attempt_result";
  path: string;
  sha256: string;
  size_bytes: number;
};

export type PiCodexUnattendedRealHostExecutionAttemptCommandRecord = {
  program_label: string;
  program_path_sha256: string;
  args_count: number;
  args_sha256: string;
  expected_exit_code: number;
  timeout_ms: number;
  shell: false;
  network: false;
};

export type PiCodexUnattendedRealHostExecutionAttemptRunnerResult = {
  exit_code: number | null;
  signal: NodeJS.Signals | null;
  timed_out: boolean;
  ok: boolean;
  stdout: string;
  stderr: string;
  duration_ms: number;
};

export type PiCodexUnattendedRealHostExecutionAttemptResultBody = {
  schema_version: "comath.pi_codex_unattended_real_host_execution_attempt_result.v1";
  attempt_id: string;
  project_id: string;
  created_at: string;
  execution_attempt_command: PiCodexUnattendedRealHostExecutionAttemptCommandRecord;
  execution_attempt_result: PiCodexUnattendedRealHostExecutionAttemptRunnerResult;
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
};

export type PiCodexUnattendedRealHostExecutionAttempt = {
  schema_version: "comath.pi_codex_unattended_real_host_execution_attempt.v1";
  attempt_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  attempt_status:
    | "blocked_unattended_real_host_executor_unavailable"
    | "blocked_unattended_real_host_execution_attempt_failed"
    | "unattended_real_host_execution_attempt_recorded";
  attempt_path: string;
  attempt_artifact: PiCodexUnattendedRealHostExecutionAttemptArtifact;
  requested_execution_mode: "production_unattended_real_host";
  blocker_reasons: PiCodexUnattendedRealHostExecutionAttemptBlockerReason[];
  readiness_id: string;
  readiness_status: "unattended_real_host_execution_prerequisites_recorded";
  readiness_path: string;
  readiness_artifact: PiCodexUnattendedRealHostExecutionReadinessArtifact;
  readiness_current: true;
  handoff_review_id: string;
  handoff_review_path: string;
  handoff_review_artifact: PiCodexUnattendedRealHostHandoffReviewArtifact;
  handoff_review_current: true;
  operator_approval_id: string;
  operator_approval_path: string;
  operator_approval_artifact: PiCodexUnattendedRealHostOperatorApprovalArtifact;
  operator_approval_artifact_current: true;
  unattended_executor_contract_id: string;
  unattended_executor_contract_path: string;
  unattended_executor_contract_artifact: PiCodexUnattendedRealHostExecutorContractArtifact;
  unattended_executor_contract_current: true;
  durable_transport_contract_id: string;
  durable_transport_contract_path: string;
  durable_transport_contract_artifact: PiCodexUnattendedRealHostDurableTransportContractArtifact;
  durable_transport_contract_current: true;
  service_owned_checkpoint_chain_reviewed: true;
  service_owned_unattended_executor_configured: boolean;
  service_owned_durable_transport_prerequisite_configured: true;
  execution_attempt_manifest_persisted: true;
  execution_attempt_command: PiCodexUnattendedRealHostExecutionAttemptCommandRecord | null;
  execution_attempt_result: PiCodexUnattendedRealHostExecutionAttemptRunnerResult | null;
  execution_attempt_result_path: string | null;
  execution_attempt_result_artifact: PiCodexUnattendedRealHostExecutionAttemptResultArtifact | null;
  executor_invoked: boolean;
  execution_attempted: boolean;
  execution_attempt_succeeded: boolean;
  execution_attempt_exit_code: number | null;
  real_pi_runtime_probe_id: string;
  session_id: string;
  transport_recovery_id: string;
  transport_lease_id: string;
  transport_heartbeat_id: string;
  execution_id: string;
  terminal_review_id: string;
  transport_contract_id: string;
  automatic_orchestration_id: string;
  transport_continuity_id: string;
  agent_run_id: string;
  service_route: string;
  service_transport_primitive: PiCodexOperatorServiceTransportPrimitive;
  client_transport_primitive: PiCodexOperatorClientTransportPrimitive;
  operator_approved: false;
  handoff_can_execute: false;
  unattended_execution_authorized: false;
  unattended_real_host_execution_completed: false;
  operator_confirmation_bypassed: false;
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

type PiCodexUnattendedRealHostExecutionAttemptBody = Omit<
  PiCodexUnattendedRealHostExecutionAttempt,
  "attempt_artifact"
>;

export type PiCodexUnattendedRealHostExecutionAttemptReviewBlockerReason =
  | PiCodexUnattendedRealHostExecutionAttemptBlockerReason
  | "terminal_unattended_completion_evidence_missing";

export type PiCodexUnattendedRealHostExecutionAttemptReviewInput = {
  project_id: string;
  attempt_review_id?: string;
  actor: string;
  attempt_id: string;
  attempt_path: string;
  attempt_sha256: string;
  requested_review_mode?: "terminal_unattended_real_host_execution";
};

export type PiCodexUnattendedRealHostExecutionAttemptReviewArtifact = {
  kind: "unattended_real_host_execution_attempt_review";
  path: string;
  sha256: string;
  size_bytes: number;
};

export type PiCodexUnattendedRealHostExecutionAttemptReview = {
  schema_version: "comath.pi_codex_unattended_real_host_execution_attempt_review.v1";
  attempt_review_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  attempt_review_status:
    | "blocked_unattended_real_host_executor_unavailable"
    | "blocked_unattended_real_host_execution_attempt_failed"
    | "blocked_terminal_unattended_completion_review_required";
  terminal_goal_state: "blocked_with_replayable_certificate";
  attempt_review_path: string;
  attempt_review_artifact: PiCodexUnattendedRealHostExecutionAttemptReviewArtifact;
  requested_review_mode: "terminal_unattended_real_host_execution";
  blocker_reasons: PiCodexUnattendedRealHostExecutionAttemptReviewBlockerReason[];
  attempt_id: string;
  attempt_status: PiCodexUnattendedRealHostExecutionAttempt["attempt_status"];
  attempt_path: string;
  attempt_artifact: PiCodexUnattendedRealHostExecutionAttemptArtifact;
  attempt_current: true;
  readiness_id: string;
  readiness_status: "unattended_real_host_execution_prerequisites_recorded";
  readiness_path: string;
  readiness_artifact: PiCodexUnattendedRealHostExecutionReadinessArtifact;
  readiness_current: true;
  handoff_review_id: string;
  handoff_review_path: string;
  handoff_review_artifact: PiCodexUnattendedRealHostHandoffReviewArtifact;
  handoff_review_current: true;
  operator_approval_id: string;
  operator_approval_path: string;
  operator_approval_artifact: PiCodexUnattendedRealHostOperatorApprovalArtifact;
  operator_approval_artifact_current: true;
  unattended_executor_contract_id: string;
  unattended_executor_contract_path: string;
  unattended_executor_contract_artifact: PiCodexUnattendedRealHostExecutorContractArtifact;
  unattended_executor_contract_current: true;
  durable_transport_contract_id: string;
  durable_transport_contract_path: string;
  durable_transport_contract_artifact: PiCodexUnattendedRealHostDurableTransportContractArtifact;
  durable_transport_contract_current: true;
  service_owned_checkpoint_chain_reviewed: true;
  service_owned_attempt_review_completed: true;
  terminal_unattended_completion_certified: false;
  service_owned_unattended_executor_configured: boolean;
  service_owned_durable_transport_prerequisite_configured: true;
  execution_attempt_manifest_persisted: true;
  execution_attempt_command: PiCodexUnattendedRealHostExecutionAttemptCommandRecord | null;
  execution_attempt_result: PiCodexUnattendedRealHostExecutionAttemptRunnerResult | null;
  execution_attempt_result_path: string | null;
  execution_attempt_result_artifact: PiCodexUnattendedRealHostExecutionAttemptResultArtifact | null;
  execution_attempt_result_artifact_current: boolean;
  executor_invoked: boolean;
  execution_attempted: boolean;
  execution_attempt_succeeded: boolean;
  execution_attempt_exit_code: number | null;
  real_pi_runtime_probe_id: string;
  session_id: string;
  transport_recovery_id: string;
  transport_lease_id: string;
  transport_heartbeat_id: string;
  execution_id: string;
  terminal_review_id: string;
  transport_contract_id: string;
  automatic_orchestration_id: string;
  transport_continuity_id: string;
  agent_run_id: string;
  service_route: string;
  service_transport_primitive: PiCodexOperatorServiceTransportPrimitive;
  client_transport_primitive: PiCodexOperatorClientTransportPrimitive;
  operator_approved: false;
  handoff_can_execute: false;
  unattended_execution_authorized: false;
  unattended_real_host_execution_completed: false;
  operator_confirmation_bypassed: false;
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

type PiCodexUnattendedRealHostExecutionAttemptReviewBody = Omit<
  PiCodexUnattendedRealHostExecutionAttemptReview,
  "attempt_review_artifact"
>;

export type PiCodexUnattendedRealHostCompletionCertificationPrerequisiteBlockerReason =
  | PiCodexUnattendedRealHostExecutionAttemptReviewBlockerReason
  | "terminal_unattended_completion_certificate_missing";

export type PiCodexUnattendedRealHostCompletionCertificationPrerequisiteInput = {
  project_id: string;
  completion_certification_prerequisite_id?: string;
  actor: string;
  attempt_review_id: string;
  attempt_review_path: string;
  attempt_review_sha256: string;
  requested_completion_mode?: "production_unattended_real_host_completion";
};

export type PiCodexUnattendedRealHostCompletionCertificationPrerequisiteArtifact = {
  kind: "unattended_real_host_completion_certification_prerequisite";
  path: string;
  sha256: string;
  size_bytes: number;
};

export type PiCodexUnattendedRealHostCompletionCertificationPrerequisite = {
  schema_version: "comath.pi_codex_unattended_real_host_completion_certification_prerequisite.v1";
  completion_certification_prerequisite_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  completion_certification_prerequisite_status: "blocked_terminal_unattended_completion_certification_required";
  terminal_goal_state: "blocked_with_replayable_certificate";
  completion_certification_prerequisite_path: string;
  completion_certification_prerequisite_artifact: PiCodexUnattendedRealHostCompletionCertificationPrerequisiteArtifact;
  requested_completion_mode: "production_unattended_real_host_completion";
  blocker_reasons: PiCodexUnattendedRealHostCompletionCertificationPrerequisiteBlockerReason[];
  completion_certificate_available: false;
  attempt_review_id: string;
  attempt_review_status: PiCodexUnattendedRealHostExecutionAttemptReview["attempt_review_status"];
  attempt_review_path: string;
  attempt_review_artifact: PiCodexUnattendedRealHostExecutionAttemptReviewArtifact;
  attempt_review_current: true;
  attempt_id: string;
  attempt_status: PiCodexUnattendedRealHostExecutionAttempt["attempt_status"];
  attempt_path: string;
  attempt_artifact: PiCodexUnattendedRealHostExecutionAttemptArtifact;
  attempt_current: true;
  readiness_id: string;
  readiness_status: "unattended_real_host_execution_prerequisites_recorded";
  readiness_path: string;
  readiness_artifact: PiCodexUnattendedRealHostExecutionReadinessArtifact;
  readiness_current: true;
  handoff_review_id: string;
  handoff_review_path: string;
  handoff_review_artifact: PiCodexUnattendedRealHostHandoffReviewArtifact;
  handoff_review_current: true;
  operator_approval_id: string;
  operator_approval_path: string;
  operator_approval_artifact: PiCodexUnattendedRealHostOperatorApprovalArtifact;
  operator_approval_artifact_current: true;
  unattended_executor_contract_id: string;
  unattended_executor_contract_path: string;
  unattended_executor_contract_artifact: PiCodexUnattendedRealHostExecutorContractArtifact;
  unattended_executor_contract_current: true;
  durable_transport_contract_id: string;
  durable_transport_contract_path: string;
  durable_transport_contract_artifact: PiCodexUnattendedRealHostDurableTransportContractArtifact;
  durable_transport_contract_current: true;
  service_owned_checkpoint_chain_reviewed: true;
  service_owned_attempt_review_completed: true;
  terminal_unattended_completion_certified: false;
  service_owned_unattended_executor_configured: boolean;
  service_owned_durable_transport_prerequisite_configured: true;
  execution_attempt_manifest_persisted: true;
  executor_invoked: boolean;
  execution_attempted: boolean;
  execution_attempt_succeeded: boolean;
  execution_attempt_exit_code: number | null;
  real_pi_runtime_probe_id: string | null;
  session_id: string | null;
  transport_recovery_id: string | null;
  transport_lease_id: string | null;
  transport_heartbeat_id: string | null;
  execution_id: string | null;
  terminal_review_id: string | null;
  transport_contract_id: string | null;
  automatic_orchestration_id: string | null;
  transport_continuity_id: string | null;
  agent_run_id: string | null;
  service_route: string | null;
  service_transport_primitive: PiCodexOperatorServiceTransportPrimitive;
  client_transport_primitive: PiCodexOperatorClientTransportPrimitive;
  operator_approved: false;
  handoff_can_execute: false;
  unattended_execution_authorized: false;
  unattended_real_host_execution_completed: false;
  operator_confirmation_bypassed: false;
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

type PiCodexUnattendedRealHostCompletionCertificationPrerequisiteBody = Omit<
  PiCodexUnattendedRealHostCompletionCertificationPrerequisite,
  "completion_certification_prerequisite_artifact"
>;

export type PiCodexLifecycleAutomaticRealPiExecutionCheckpointStep =
  | "real_pi_runtime_probe"
  | "operator_session_manifest"
  | "operator_transport_recovery_checkpoint"
  | "bounded_operator_transport_lease"
  | "operator_transport_heartbeat_rebind"
  | "guided_real_pi_execution"
  | "terminal_execution_review"
  | "operator_service_transport_contract";

export type PiCodexLifecycleAutomaticRealPiExecutionInput = {
  project_id: string;
  orchestration_id?: string;
  actor: string;
  runtime_probe: Omit<PiCodexRealPiRuntimeProbeInput, "project_id" | "actor"> & { actor?: string };
  operator_session: Omit<
    PiCodexLifecycleOperatorSessionInput,
    "project_id" | "actor" | "pi_host_label" | "session_kind" | "artifact_paths"
  > & { actor?: string };
  transport_recovery: Omit<
    PiCodexLifecycleOperatorTransportRecoveryInput,
    "project_id" | "session_id" | "actor" | "session_manifest_path"
  > & { actor?: string };
  transport_lease: Omit<
    PiCodexLifecycleOperatorTransportLeaseInput,
    "project_id" | "session_id" | "actor" | "transport_recovery_id" | "session_manifest_path" | "transport_recovery_path"
  > & { actor?: string };
  transport_heartbeat: Omit<
    PiCodexLifecycleOperatorTransportHeartbeatInput,
    | "project_id"
    | "session_id"
    | "actor"
    | "transport_recovery_id"
    | "transport_lease_id"
    | "session_manifest_path"
    | "transport_recovery_path"
    | "transport_lease_path"
  > & { actor?: string };
  guided_execution: Omit<
    PiCodexGuidedRealPiExecutionInput,
    | "project_id"
    | "actor"
    | "real_pi_runtime_probe_id"
    | "pi_install_transcript_path"
    | "runtime_registration_snapshot_path"
    | "session_id"
    | "session_manifest_path"
    | "transport_recovery_id"
    | "transport_recovery_path"
    | "transport_lease_id"
    | "transport_lease_path"
    | "pi_host_label"
  > & { actor?: string };
  terminal_review?: {
    review_id?: string;
    actor?: string;
  };
  transport_contract: Omit<
    PiCodexOperatorServiceTransportContractInput,
    "project_id" | "actor" | "terminal_review_id" | "terminal_review_path"
  > & { actor?: string };
};

export type PiCodexLifecycleAutomaticRealPiExecutionArtifact = {
  kind: "automatic_real_pi_execution_orchestration";
  path: string;
  sha256: string;
  size_bytes: number;
};

export type PiCodexLifecycleAutomaticRealPiExecution = {
  schema_version: "comath.pi_codex_lifecycle_automatic_real_pi_execution.v1";
  orchestration_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  orchestration_status: "automatic_real_pi_checkpoint_chain_recorded";
  orchestration_path: string;
  orchestration_artifact: PiCodexLifecycleAutomaticRealPiExecutionArtifact;
  checkpoint_order: PiCodexLifecycleAutomaticRealPiExecutionCheckpointStep[];
  real_pi_runtime_probe_id: string;
  pi_host_label: string;
  pi_install_transcript_path: string;
  pi_install_artifact: PiCodexRealPiRuntimeProbeInstallArtifact;
  runtime_registration_snapshot_path: string;
  runtime_registration_artifact: PiCodexRealPiRuntimeProbeRegistrationArtifact;
  session_id: string;
  session_manifest_path: string;
  session_manifest_artifact: PiCodexLifecycleOperatorSessionManifestArtifact;
  transport_recovery_id: string;
  transport_recovery_path: string;
  transport_recovery_artifact: PiCodexLifecycleOperatorTransportRecoveryArtifact;
  transport_lease_id: string;
  transport_lease_path: string;
  transport_lease_artifact: PiCodexLifecycleOperatorTransportLeaseArtifact;
  transport_heartbeat_id: string;
  transport_heartbeat_path: string;
  transport_heartbeat_artifact: PiCodexLifecycleOperatorTransportHeartbeatArtifact;
  execution_id: string;
  guided_execution_path: string;
  guided_execution_artifact: PiCodexGuidedRealPiExecutionArtifact;
  terminal_review_id: string;
  terminal_review_path: string;
  terminal_review_artifact: PiCodexGuidedExecutionTerminalChainReviewArtifact;
  transport_contract_id: string;
  transport_contract_path: string;
  transport_contract_artifact: PiCodexOperatorServiceTransportContractArtifact;
  agent_run_id: string;
  service_route: string;
  service_transport_primitive: PiCodexOperatorServiceTransportPrimitive;
  client_transport_primitive: PiCodexOperatorClientTransportPrimitive;
  runtime_probe_bound: true;
  operator_session_bound: true;
  transport_recovery_bound: true;
  transport_lease_bound: true;
  transport_heartbeat_bound: true;
  guided_execution_bound: true;
  terminal_review_bound: true;
  transport_contract_bound: true;
  service_owned_checkpoint_chain_completed: true;
  automatic_real_pi_orchestration_completed: true;
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

type PiCodexLifecycleAutomaticRealPiExecutionBody = Omit<
  PiCodexLifecycleAutomaticRealPiExecution,
  "orchestration_artifact"
>;

const automaticRealPiExecutionCheckpointOrder: PiCodexLifecycleAutomaticRealPiExecutionCheckpointStep[] = [
  "real_pi_runtime_probe",
  "operator_session_manifest",
  "operator_transport_recovery_checkpoint",
  "bounded_operator_transport_lease",
  "operator_transport_heartbeat_rebind",
  "guided_real_pi_execution",
  "terminal_execution_review",
  "operator_service_transport_contract"
];

const terminalChainOrderedSteps: PiCodexGuidedExecutionTerminalChainStep[] = [
  "real_pi_runtime_probe",
  "operator_session_manifest",
  "operator_transport_recovery_checkpoint",
  "bounded_operator_transport_lease",
  "operator_transport_heartbeat_rebind",
  "guided_real_pi_execution"
];

const unattendedRealHostHandoffCheckpointOrder: PiCodexUnattendedRealHostHandoffCheckpointId[] = [
  "runtime_probe",
  "operator_session",
  "transport_recovery",
  "transport_lease",
  "transport_heartbeat",
  "guided_execution",
  "terminal_review",
  "transport_contract",
  "automatic_orchestration",
  "transport_continuity"
];

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
  if (
    !/^[A-Za-z0-9._-]+$/.test(reviewId) ||
    reviewId === "." ||
    reviewId === ".." ||
    reviewId.split(".").some((segment) => segment.length === 0)
  ) {
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

function assertOperatorTransportHeartbeatId(value: string | undefined): string {
  const heartbeatId = value ?? `LIFE-TRANSPORT-HEARTBEAT-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
  if (
    !/^[A-Za-z0-9._-]+$/.test(heartbeatId) ||
    heartbeatId === "." ||
    heartbeatId === ".." ||
    heartbeatId.split(".").some((segment) => segment.length === 0)
  ) {
    throw new ComathError("invalid Pi/Codex lifecycle operator transport heartbeat id", {
      statusCode: 400,
      code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_HEARTBEAT_INVALID_ID"
    });
  }
  return heartbeatId;
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

function assertOperatorServiceTransportContractId(value: string | undefined): string {
  const contractId = value ?? `LIFE-TRANSPORT-CONTRACT-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
  if (
    !/^[A-Za-z0-9._-]+$/.test(contractId) ||
    contractId === "." ||
    contractId === ".." ||
    contractId.split(".").some((segment) => segment.length === 0)
  ) {
    throw new ComathError("invalid Pi/Codex operator/service transport contract id", {
      statusCode: 400,
      code: "PI_CODEX_OPERATOR_SERVICE_TRANSPORT_CONTRACT_INVALID_ID"
    });
  }
  return contractId;
}

function assertOperatorServiceTransportContinuityId(value: string | undefined): string {
  const continuityId =
    value ?? `LIFE-TRANSPORT-CONTINUITY-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
  if (
    !/^[A-Za-z0-9._-]+$/.test(continuityId) ||
    continuityId === "." ||
    continuityId === ".." ||
    continuityId.split(".").some((segment) => segment.length === 0)
  ) {
    throw new ComathError("invalid Pi/Codex operator/service transport continuity id", {
      statusCode: 400,
      code: "PI_CODEX_OPERATOR_SERVICE_TRANSPORT_CONTINUITY_INVALID_ID"
    });
  }
  return continuityId;
}

function assertAutomaticRealPiExecutionOrchestrationId(value: string | undefined): string {
  const orchestrationId = value ?? `LIFE-AUTO-REAL-PI-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
  if (
    !/^[A-Za-z0-9._-]+$/.test(orchestrationId) ||
    orchestrationId === "." ||
    orchestrationId === ".." ||
    orchestrationId.split(".").some((segment) => segment.length === 0)
  ) {
    throw new ComathError("invalid Pi/Codex automatic real-Pi orchestration id", {
      statusCode: 400,
      code: "PI_CODEX_AUTOMATIC_REAL_PI_EXECUTION_INVALID_ID"
    });
  }
  return orchestrationId;
}

function assertOperatorServiceTransportPrimitive(
  value: PiCodexOperatorServiceTransportPrimitive | undefined
): PiCodexOperatorServiceTransportPrimitive {
  const primitive = value ?? "node_http_agent_run_log_session_route";
  if (primitive !== "node_http_agent_run_log_session_route") {
    throw new ComathError("invalid Pi/Codex operator/service transport service primitive", {
      statusCode: 400,
      code: "PI_CODEX_OPERATOR_SERVICE_TRANSPORT_CONTRACT_INVALID_SERVICE_PRIMITIVE"
    });
  }
  return primitive;
}

function assertOperatorClientTransportPrimitive(
  value: PiCodexOperatorClientTransportPrimitive | undefined
): PiCodexOperatorClientTransportPrimitive {
  const primitive = value ?? "pi_fetch_get_text";
  if (primitive !== "pi_fetch_get_text") {
    throw new ComathError("invalid Pi/Codex operator/service transport client primitive", {
      statusCode: 400,
      code: "PI_CODEX_OPERATOR_SERVICE_TRANSPORT_CONTRACT_INVALID_CLIENT_PRIMITIVE"
    });
  }
  return primitive;
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
  /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|kernel_checked|proof_success|proven|verified_final_authority_evidence)\b/gi;

function sanitizeOperatorSessionText(value: string): string {
  return Buffer.from(
    scrubHostPaths(value)
      .replace(operatorSessionEnvSecretPattern, "<secret>")
      .replace(operatorSessionBearerSecretPattern, "<secret>")
      .replace(operatorSessionSecretPattern, "<secret>")
      .replace(operatorSessionProofSuccessPattern, "unverified_formal_status")
      .replace(operatorTransportOverclaimPattern, "bounded_transport_checkpoint_only")
      .replace(operatorUnattendedOverclaimPattern, "operator_review_required"),
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
  /\b(?:long[- ]lived\s+(?:websocket|sse)|indefinite\s+sse|terminal transport recovered live|durable transport provided|live transport open)\b/gi;
const operatorUnattendedOverclaimPattern =
  /\b(?:production unattended executor|operator-free execution completed|unattended real-host execution completed|operator confirmation bypassed|terminal unattended completion certified|service-owned evidence created|handoff can execute|unattended execution authorized|operator approval recorded)\b/gi;

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

function operatorTransportHeartbeatPath(heartbeatId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "pi-codex-lifecycle", heartbeatId, "operator-transport-heartbeat.json")
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

function parseOperatorTransportCursorOffset(value: string, prefix: "stdout" | "stderr"): number {
  const match = new RegExp(`^${prefix}:(\\d+)$`, "u").exec(value);
  if (!match) {
    return 0;
  }
  const offset = Number(match[1]);
  return Number.isSafeInteger(offset) && offset >= 0 ? offset : 0;
}

function parseAgentRunLogSessionRoute(rawRoute: string): { runId: string; route: string } | null {
  const match = /(?:^|\s)\/agent\/run\/([^/\s?#]+)\/log-session(?:[?#][^\s]*)?(?=$|\s)/u.exec(rawRoute);
  if (!match) {
    return null;
  }
  try {
    const runId = decodeURIComponent(match[1] ?? "");
    if (!runId || /[\r\n]/u.test(runId)) {
      return null;
    }
    return {
      runId,
      route: `/agent/run/${encodeURIComponent(runId)}/log-session`
    };
  } catch {
    return null;
  }
}

function assertOperatorTransportLeaseRouteMatchesRecovery(rawLeaseRoute: string, rawRecoveryRoute: string): void {
  const leaseRoute = parseAgentRunLogSessionRoute(rawLeaseRoute);
  const recoveryRoute = parseAgentRunLogSessionRoute(rawRecoveryRoute);
  if (!leaseRoute || !recoveryRoute || leaseRoute.route !== recoveryRoute.route) {
    throw new ComathError(
      "Pi/Codex lifecycle operator transport lease route must match the recovery AgentRun log session",
      {
        statusCode: 400,
        code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_LEASE_ROUTE_UNBOUND"
      }
    );
  }
}

function bindOperatorTransportLogSession(input: {
  projectRoot: string;
  projectId: string;
  rawRoute: string;
  cursor: PiCodexLifecycleOperatorTransportRecoveryCursor;
  actor: string;
}): PiCodexLifecycleOperatorTransportLogSessionBinding {
  const parsedRoute = parseAgentRunLogSessionRoute(input.rawRoute);
  if (!parsedRoute) {
    throw new ComathError("Pi/Codex lifecycle operator transport lease route is not a service-owned AgentRun log session", {
      statusCode: 400,
      code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_LEASE_ROUTE_UNBOUND"
    });
  }
  try {
    const session = formatAgentRunLogSseSession(input.projectRoot, {
      project_id: input.projectId,
      run_id: parsedRoute.runId,
      cursor: {
        stdout: parseOperatorTransportCursorOffset(input.cursor.stdout_cursor, "stdout"),
        stderr: parseOperatorTransportCursorOffset(input.cursor.stderr_cursor, "stderr")
      },
      max_bytes: 1024,
      max_events: 3,
      retry_ms: 500,
      actor: input.actor
    });
    return {
      binding_source: "service_owned_agent_run_log_session",
      project_id: session.project_id,
      run_id: session.run_id,
      route: parsedRoute.route,
      content_type: session.content_type,
      cursor: session.events[0]?.stream.cursor ?? { stdout: 0, stderr: 0 },
      next_cursor: session.next_cursor,
      event_count: session.events.length,
      complete: session.complete,
      body_sha256: sha256Text(session.body),
      proof_authority: "none",
      durable_transport_provided: false,
      long_lived_sse_provided: false
    };
  } catch {
    throw new ComathError("Pi/Codex lifecycle operator transport lease route is not bound to a readable AgentRun log session", {
      statusCode: 400,
      code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_LEASE_ROUTE_UNBOUND"
    });
  }
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

function resolveOperatorTransportHeartbeatPath(
  projectRoot: string,
  heartbeatId: string,
  heartbeatPath: string | undefined
): string {
  const expectedPath = operatorTransportHeartbeatPath(heartbeatId);
  if (heartbeatPath === undefined) {
    return expectedPath;
  }
  const absolutePath = assertPathAllowed(projectRoot, heartbeatPath, {
    purpose: "read",
    resolveRealpath: true
  });
  const relativePath = projectRelativePath(projectRoot, absolutePath);
  if (relativePath === expectedPath) {
    return relativePath;
  }
  throw new ComathError("Pi/Codex guided execution terminal chain heartbeat path does not match heartbeat id", {
    statusCode: 400,
    code: "PI_CODEX_GUIDED_EXECUTION_TERMINAL_CHAIN_HEARTBEAT_INVALID"
  });
}

function resolveGuidedRealPiExecutionPath(
  projectRoot: string,
  executionId: string,
  executionPath: string | undefined
): string {
  const expectedPath = guidedRealPiExecutionPath(executionId);
  if (executionPath === undefined) {
    return expectedPath;
  }
  const absolutePath = assertPathAllowed(projectRoot, executionPath, {
    purpose: "read",
    resolveRealpath: true
  });
  const relativePath = projectRelativePath(projectRoot, absolutePath);
  if (relativePath === expectedPath) {
    return relativePath;
  }
  throw new ComathError("Pi/Codex guided execution terminal chain execution path does not match execution id", {
    statusCode: 400,
    code: "PI_CODEX_GUIDED_EXECUTION_TERMINAL_CHAIN_EXECUTION_INVALID"
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

function assertOperatorTransportLeaseBoundary(
  projectRoot: string,
  lease: PiCodexLifecycleOperatorTransportLeaseBody,
  options: OperatorTransportLeaseBoundaryOptions = {}
): void {
  const logSessionBinding = lease.agent_run_log_session_binding;
  const parsedLogSessionRoute =
    typeof logSessionBinding?.route === "string" ? parseAgentRunLogSessionRoute(logSessionBinding.route) : null;
  const leaseStartedAtMs =
    typeof lease.lease_started_at === "string" ? Date.parse(lease.lease_started_at) : Number.NaN;
  const leaseExpiresAtMs =
    typeof lease.lease_expires_at === "string" ? Date.parse(lease.lease_expires_at) : Number.NaN;
  if (
    lease.proof_authority !== "none" ||
    lease.can_promote_claim !== false ||
    lease.can_certify_ga !== false ||
    lease.lease_status !== "bounded_operator_transport_lease_open" ||
    !Number.isFinite(leaseStartedAtMs) ||
    !Number.isFinite(leaseExpiresAtMs) ||
    leaseExpiresAtMs <= leaseStartedAtMs ||
    leaseExpiresAtMs <= Date.now() ||
    !Number.isSafeInteger(lease.lease_ttl_ms) ||
    lease.lease_ttl_ms <= 0 ||
    leaseExpiresAtMs - leaseStartedAtMs !== lease.lease_ttl_ms ||
    !Number.isSafeInteger(lease.heartbeat_interval_ms) ||
    lease.heartbeat_interval_ms <= 0 ||
    lease.heartbeat_required !== true ||
    lease.durable_recovery_checkpoint_required !== true ||
    lease.bounded_live_transport_lease_provided !== true ||
    lease.durable_transport_provided !== false ||
    lease.live_transport_open !== true ||
    lease.indefinite_stream_open !== false ||
    lease.long_lived_websocket_provided !== false ||
    lease.long_lived_sse_provided !== false ||
    lease.pi_direct_write_allowed !== false ||
    lease.direct_trusted_state_mutation !== false ||
    lease.operator_transport_log_session_bound !== true ||
    logSessionBinding?.binding_source !== "service_owned_agent_run_log_session" ||
    logSessionBinding.project_id !== lease.project_id ||
    logSessionBinding.route !== lease.lease_route ||
    parsedLogSessionRoute === null ||
    parsedLogSessionRoute.route !== logSessionBinding.route ||
    parsedLogSessionRoute.runId !== logSessionBinding.run_id ||
    logSessionBinding.content_type !== "text/event-stream; charset=utf-8" ||
    !isAgentRunLogCursor(logSessionBinding.cursor) ||
    !isAgentRunLogCursor(logSessionBinding.next_cursor) ||
    !Number.isSafeInteger(logSessionBinding.event_count) ||
    logSessionBinding.event_count < 0 ||
    typeof logSessionBinding.complete !== "boolean" ||
    !/^[a-f0-9]{64}$/u.test(logSessionBinding.body_sha256) ||
    logSessionBinding.proof_authority !== "none" ||
    logSessionBinding.durable_transport_provided !== false ||
    logSessionBinding.long_lived_sse_provided !== false
  ) {
    throw new ComathError("Pi/Codex guided real-Pi execution lease violates non-authority boundaries", {
      statusCode: 400,
      code: "PI_CODEX_GUIDED_REAL_PI_EXECUTION_LEASE_INVALID_BOUNDARY"
    });
  }
  const reboundLogSessionBinding = bindOperatorTransportLogSession({
    projectRoot,
    projectId: lease.project_id,
    rawRoute: lease.lease_route,
    cursor: lease.requested_cursor,
    actor: "pi_codex_guided_real_pi_execution_lease_boundary"
  });
  const sameLogSessionIdentity =
    reboundLogSessionBinding.project_id === logSessionBinding.project_id &&
    reboundLogSessionBinding.run_id === logSessionBinding.run_id &&
    reboundLogSessionBinding.route === logSessionBinding.route &&
    reboundLogSessionBinding.content_type === logSessionBinding.content_type &&
    agentRunLogCursorEqual(reboundLogSessionBinding.cursor, logSessionBinding.cursor) &&
    reboundLogSessionBinding.proof_authority === logSessionBinding.proof_authority &&
    reboundLogSessionBinding.durable_transport_provided === logSessionBinding.durable_transport_provided &&
    reboundLogSessionBinding.long_lived_sse_provided === logSessionBinding.long_lived_sse_provided;
  const exactLogSessionSnapshot =
    sameLogSessionIdentity &&
    agentRunLogCursorEqual(reboundLogSessionBinding.next_cursor, logSessionBinding.next_cursor) &&
    reboundLogSessionBinding.event_count === logSessionBinding.event_count &&
    reboundLogSessionBinding.complete === logSessionBinding.complete &&
    reboundLogSessionBinding.body_sha256 === logSessionBinding.body_sha256;
  const liveLogSessionAdvanced =
    options.allowLiveLogGrowth === true &&
    sameLogSessionIdentity &&
    agentRunLogCursorAtLeast(reboundLogSessionBinding.next_cursor, logSessionBinding.next_cursor) &&
    reboundLogSessionBinding.event_count >= logSessionBinding.event_count &&
    logSessionBinding.complete !== true &&
    // Heartbeats may observe additional bytes or terminal completion after the bounded lease snapshot.
    (agentRunLogCursorGreater(reboundLogSessionBinding.next_cursor, logSessionBinding.next_cursor) ||
      reboundLogSessionBinding.complete === true);
  if (!exactLogSessionSnapshot && !liveLogSessionAdvanced) {
    throw new ComathError("Pi/Codex guided real-Pi execution lease log-session binding does not match service-owned logs", {
      statusCode: 400,
      code: "PI_CODEX_GUIDED_REAL_PI_EXECUTION_LEASE_INVALID_BOUNDARY"
    });
  }
}

function isAgentRunLogCursor(value: unknown): value is AgentRunLogCursor {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const cursor = value as Partial<AgentRunLogCursor>;
  const stdout = cursor.stdout;
  const stderr = cursor.stderr;
  return (
    typeof stdout === "number" &&
    Number.isSafeInteger(stdout) &&
    stdout >= 0 &&
    typeof stderr === "number" &&
    Number.isSafeInteger(stderr) &&
    stderr >= 0
  );
}

function agentRunLogCursorEqual(left: AgentRunLogCursor, right: AgentRunLogCursor): boolean {
  return left.stdout === right.stdout && left.stderr === right.stderr;
}

function agentRunLogCursorAtLeast(left: AgentRunLogCursor, right: AgentRunLogCursor): boolean {
  return left.stdout >= right.stdout && left.stderr >= right.stderr;
}

function agentRunLogCursorGreater(left: AgentRunLogCursor, right: AgentRunLogCursor): boolean {
  return left.stdout > right.stdout || left.stderr > right.stderr;
}

function readOperatorTransportLeaseArtifact(
  projectRoot: string,
  projectId: string,
  sessionId: string,
  recoveryId: string,
  leaseId: string,
  leasePath: string,
  options: OperatorTransportLeaseBoundaryOptions = {}
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
  assertOperatorTransportLeaseBoundary(projectRoot, parsed, options);
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

function assertOperatorTransportHeartbeatBoundary(
  heartbeat: PiCodexLifecycleOperatorTransportHeartbeatBody
): void {
  const logSessionBinding = heartbeat.agent_run_log_session_binding;
  const parsedLogSessionRoute =
    typeof logSessionBinding?.route === "string" ? parseAgentRunLogSessionRoute(logSessionBinding.route) : null;
  if (
    heartbeat.heartbeat_status !== "operator_transport_heartbeat_rebound" ||
    heartbeat.heartbeat_required !== true ||
    heartbeat.operator_transport_lease_bound !== true ||
    heartbeat.operator_transport_log_session_rebound !== true ||
    heartbeat.lease_still_valid !== true ||
    heartbeat.durable_recovery_checkpoint_required !== true ||
    heartbeat.bounded_live_transport_lease_bound !== true ||
    heartbeat.bounded_heartbeat_checkpoint_provided !== true ||
    heartbeat.durable_transport_provided !== false ||
    heartbeat.live_transport_open !== false ||
    heartbeat.indefinite_stream_open !== false ||
    heartbeat.long_lived_websocket_provided !== false ||
    heartbeat.long_lived_sse_provided !== false ||
    heartbeat.pi_direct_write_allowed !== false ||
    heartbeat.direct_trusted_state_mutation !== false ||
    heartbeat.proof_authority !== "none" ||
    heartbeat.can_promote_claim !== false ||
    heartbeat.can_certify_ga !== false ||
    logSessionBinding?.binding_source !== "service_owned_agent_run_log_session" ||
    logSessionBinding.project_id !== heartbeat.project_id ||
    logSessionBinding.route !== heartbeat.lease_route ||
    parsedLogSessionRoute === null ||
    parsedLogSessionRoute.route !== logSessionBinding.route ||
    parsedLogSessionRoute.runId !== logSessionBinding.run_id ||
    logSessionBinding.content_type !== "text/event-stream; charset=utf-8" ||
    !isAgentRunLogCursor(logSessionBinding.cursor) ||
    !isAgentRunLogCursor(logSessionBinding.next_cursor) ||
    !Number.isSafeInteger(logSessionBinding.event_count) ||
    logSessionBinding.event_count < 0 ||
    typeof logSessionBinding.complete !== "boolean" ||
    !/^[a-f0-9]{64}$/u.test(logSessionBinding.body_sha256) ||
    logSessionBinding.proof_authority !== "none" ||
    logSessionBinding.durable_transport_provided !== false ||
    logSessionBinding.long_lived_sse_provided !== false
  ) {
    throw new ComathError("Pi/Codex guided execution terminal chain heartbeat violates non-authority boundaries", {
      statusCode: 400,
      code: "PI_CODEX_GUIDED_EXECUTION_TERMINAL_CHAIN_HEARTBEAT_INVALID"
    });
  }
}

function readOperatorTransportHeartbeatArtifact(
  projectRoot: string,
  projectId: string,
  sessionId: string,
  recoveryId: string,
  leaseId: string,
  heartbeatId: string,
  heartbeatPath: string
): {
  heartbeat: PiCodexLifecycleOperatorTransportHeartbeatBody;
  artifact: PiCodexLifecycleOperatorTransportHeartbeatArtifact;
} {
  const absolutePath = assertPathAllowed(projectRoot, heartbeatPath, {
    purpose: "read",
    resolveRealpath: true
  });
  if (!existsSync(absolutePath)) {
    throw new ComathError("Pi/Codex guided execution terminal chain requires a heartbeat artifact", {
      statusCode: 400,
      code: "PI_CODEX_GUIDED_EXECUTION_TERMINAL_CHAIN_HEARTBEAT_MISSING"
    });
  }
  if (!statSync(absolutePath).isFile()) {
    throw new ComathError("Pi/Codex guided execution terminal chain heartbeat artifact must be a file", {
      statusCode: 400,
      code: "PI_CODEX_GUIDED_EXECUTION_TERMINAL_CHAIN_HEARTBEAT_INVALID"
    });
  }
  const content = readFileSync(absolutePath);
  let parsed: PiCodexLifecycleOperatorTransportHeartbeatBody;
  try {
    parsed = JSON.parse(content.toString("utf8")) as PiCodexLifecycleOperatorTransportHeartbeatBody;
  } catch {
    throw new ComathError("Pi/Codex guided execution terminal chain heartbeat JSON is invalid", {
      statusCode: 400,
      code: "PI_CODEX_GUIDED_EXECUTION_TERMINAL_CHAIN_HEARTBEAT_INVALID"
    });
  }
  if (
    parsed.schema_version !== "comath.pi_codex_lifecycle_operator_transport_heartbeat.v1" ||
    parsed.project_id !== projectId ||
    parsed.session_id !== sessionId ||
    parsed.transport_recovery_id !== recoveryId ||
    parsed.transport_lease_id !== leaseId ||
    parsed.transport_heartbeat_id !== heartbeatId ||
    parsed.transport_heartbeat_path !== heartbeatPath
  ) {
    throw new ComathError("Pi/Codex guided execution terminal chain heartbeat does not bind the requested review", {
      statusCode: 400,
      code: "PI_CODEX_GUIDED_EXECUTION_TERMINAL_CHAIN_HEARTBEAT_INVALID"
    });
  }
  assertOperatorTransportHeartbeatBoundary(parsed);
  return {
    heartbeat: parsed,
    artifact: {
      kind: "operator_transport_heartbeat",
      path: heartbeatPath,
      sha256: sha256Bytes(content),
      size_bytes: content.byteLength
    }
  };
}

function assertGuidedRealPiExecutionBoundary(execution: PiCodexGuidedRealPiExecutionBody): void {
  if (
    execution.execution_status !== "guided_real_pi_execution_recorded" ||
    execution.guided_real_pi_execution_observed !== true ||
    execution.real_pi_runtime_probe_bound !== true ||
    execution.operator_session_manifest_bound !== true ||
    execution.operator_transport_recovery_bound !== true ||
    execution.operator_transport_lease_bound !== true ||
    execution.pi_direct_write_allowed !== false ||
    execution.direct_trusted_state_mutation !== false ||
    execution.durable_transport_provided !== false ||
    execution.indefinite_stream_open !== false ||
    execution.long_lived_websocket_provided !== false ||
    execution.long_lived_sse_provided !== false ||
    execution.proof_authority !== "none" ||
    execution.can_promote_claim !== false ||
    execution.can_certify_ga !== false ||
    !Array.isArray(execution.required_preconditions) ||
    execution.required_preconditions.length !== 4 ||
    execution.required_preconditions[0] !== "real_pi_runtime_probe_observed" ||
    execution.required_preconditions[1] !== "operator_session_manifest_bound" ||
    execution.required_preconditions[2] !== "operator_transport_recovery_checkpoint_bound" ||
    execution.required_preconditions[3] !== "bounded_operator_transport_lease_bound"
  ) {
    throw new ComathError("Pi/Codex guided execution terminal chain guided execution violates non-authority boundaries", {
      statusCode: 400,
      code: "PI_CODEX_GUIDED_EXECUTION_TERMINAL_CHAIN_EXECUTION_INVALID"
    });
  }
}

function readGuidedRealPiExecutionArtifact(
  projectRoot: string,
  projectId: string,
  probeId: string,
  sessionId: string,
  recoveryId: string,
  leaseId: string,
  executionId: string,
  executionPath: string
): {
  execution: PiCodexGuidedRealPiExecutionBody;
  artifact: PiCodexGuidedRealPiExecutionArtifact;
} {
  const absolutePath = assertPathAllowed(projectRoot, executionPath, {
    purpose: "read",
    resolveRealpath: true
  });
  if (!existsSync(absolutePath)) {
    throw new ComathError("Pi/Codex guided execution terminal chain requires a guided execution artifact", {
      statusCode: 400,
      code: "PI_CODEX_GUIDED_EXECUTION_TERMINAL_CHAIN_EXECUTION_MISSING"
    });
  }
  if (!statSync(absolutePath).isFile()) {
    throw new ComathError("Pi/Codex guided execution terminal chain guided execution artifact must be a file", {
      statusCode: 400,
      code: "PI_CODEX_GUIDED_EXECUTION_TERMINAL_CHAIN_EXECUTION_INVALID"
    });
  }
  const content = readFileSync(absolutePath);
  let parsed: PiCodexGuidedRealPiExecutionBody;
  try {
    parsed = JSON.parse(content.toString("utf8")) as PiCodexGuidedRealPiExecutionBody;
  } catch {
    throw new ComathError("Pi/Codex guided execution terminal chain guided execution JSON is invalid", {
      statusCode: 400,
      code: "PI_CODEX_GUIDED_EXECUTION_TERMINAL_CHAIN_EXECUTION_INVALID"
    });
  }
  if (
    parsed.schema_version !== "comath.pi_codex_guided_real_pi_execution.v1" ||
    parsed.project_id !== projectId ||
    parsed.real_pi_runtime_probe_id !== probeId ||
    parsed.session_id !== sessionId ||
    parsed.transport_recovery_id !== recoveryId ||
    parsed.transport_lease_id !== leaseId ||
    parsed.execution_id !== executionId ||
    parsed.guided_execution_path !== executionPath
  ) {
    throw new ComathError("Pi/Codex guided execution terminal chain guided execution does not bind the requested review", {
      statusCode: 400,
      code: "PI_CODEX_GUIDED_EXECUTION_TERMINAL_CHAIN_EXECUTION_INVALID"
    });
  }
  assertGuidedRealPiExecutionBoundary(parsed);
  return {
    execution: parsed,
    artifact: {
      kind: "guided_real_pi_execution",
      path: executionPath,
      sha256: sha256Bytes(content),
      size_bytes: content.byteLength
    }
  };
}

function assertOperatorServiceTransportTerminalReviewBoundary(
  review: PiCodexGuidedExecutionTerminalChainReview
): void {
  const logSessionBinding = review.agent_run_log_session_binding;
  const parsedLogSessionRoute =
    typeof logSessionBinding?.route === "string" ? parseAgentRunLogSessionRoute(logSessionBinding.route) : null;
  if (
    review.ok !== true ||
    review.review_status !== "guided_real_pi_terminal_chain_ready_for_release_review" ||
    review.terminal_chain_bound !== true ||
    review.heartbeat_consumed_by_review !== true ||
    review.guided_execution_consumed_by_review !== true ||
    review.pi_direct_write_allowed !== false ||
    review.direct_trusted_state_mutation !== false ||
    review.durable_transport_provided !== false ||
    review.live_transport_open !== false ||
    review.indefinite_stream_open !== false ||
    review.long_lived_websocket_provided !== false ||
    review.long_lived_sse_provided !== false ||
    review.proof_authority !== "none" ||
    review.can_promote_claim !== false ||
    review.can_certify_ga !== false ||
    logSessionBinding?.binding_source !== "service_owned_agent_run_log_session" ||
    logSessionBinding.project_id !== review.project_id ||
    parsedLogSessionRoute === null ||
    parsedLogSessionRoute.route !== logSessionBinding.route ||
    parsedLogSessionRoute.runId !== logSessionBinding.run_id ||
    logSessionBinding.content_type !== "text/event-stream; charset=utf-8" ||
    !isAgentRunLogCursor(logSessionBinding.cursor) ||
    !isAgentRunLogCursor(logSessionBinding.next_cursor) ||
    !Number.isSafeInteger(logSessionBinding.event_count) ||
    logSessionBinding.event_count < 0 ||
    typeof logSessionBinding.complete !== "boolean" ||
    !/^[a-f0-9]{64}$/u.test(logSessionBinding.body_sha256) ||
    logSessionBinding.proof_authority !== "none" ||
    logSessionBinding.durable_transport_provided !== false ||
    logSessionBinding.long_lived_sse_provided !== false
  ) {
    throw new ComathError("Pi/Codex operator/service transport contract terminal review violates boundaries", {
      statusCode: 400,
      code: "PI_CODEX_OPERATOR_SERVICE_TRANSPORT_CONTRACT_TERMINAL_REVIEW_INVALID"
    });
  }
}

function readGuidedExecutionTerminalChainReviewArtifact(
  projectRoot: string,
  projectId: string,
  reviewId: string,
  reviewPath: string
): {
  review: PiCodexGuidedExecutionTerminalChainReview;
  artifact: PiCodexGuidedExecutionTerminalChainReviewArtifact;
} {
  const absolutePath = assertPathAllowed(projectRoot, reviewPath, {
    purpose: "read",
    resolveRealpath: true
  });
  if (!existsSync(absolutePath)) {
    throw new ComathError("Pi/Codex operator/service transport contract requires a terminal review artifact", {
      statusCode: 400,
      code: "PI_CODEX_OPERATOR_SERVICE_TRANSPORT_CONTRACT_TERMINAL_REVIEW_MISSING"
    });
  }
  if (!statSync(absolutePath).isFile()) {
    throw new ComathError("Pi/Codex operator/service transport contract terminal review must be a file", {
      statusCode: 400,
      code: "PI_CODEX_OPERATOR_SERVICE_TRANSPORT_CONTRACT_TERMINAL_REVIEW_INVALID"
    });
  }
  const content = readFileSync(absolutePath);
  let parsed: PiCodexGuidedExecutionTerminalChainReview;
  try {
    parsed = JSON.parse(content.toString("utf8")) as PiCodexGuidedExecutionTerminalChainReview;
  } catch {
    throw new ComathError("Pi/Codex operator/service transport contract terminal review JSON is invalid", {
      statusCode: 400,
      code: "PI_CODEX_OPERATOR_SERVICE_TRANSPORT_CONTRACT_TERMINAL_REVIEW_INVALID"
    });
  }
  if (
    parsed.schema_version !== "comath.pi_codex_guided_execution_terminal_chain_review.v1" ||
    parsed.project_id !== projectId ||
    parsed.review_id !== reviewId ||
    parsed.review_path !== reviewPath
  ) {
    throw new ComathError("Pi/Codex operator/service transport contract terminal review does not bind the request", {
      statusCode: 400,
      code: "PI_CODEX_OPERATOR_SERVICE_TRANSPORT_CONTRACT_TERMINAL_REVIEW_INVALID"
    });
  }
  assertOperatorServiceTransportTerminalReviewBoundary(parsed);
  return {
    review: parsed,
    artifact: {
      kind: "guided_execution_terminal_chain_review",
      path: reviewPath,
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
): { artifact: PiCodexRealPiRuntimeProbeRegistrationArtifact; piHostLabel: string } {
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
  const piHostLabel = typeof parsed.pi_host_label === "string" ? assertPiHostLabel(parsed.pi_host_label) : undefined;
  if (piHostLabel === undefined) {
    throw new ComathError("Pi/Codex guided real-Pi execution runtime registration lacks host binding", {
      statusCode: 400,
      code: "PI_CODEX_GUIDED_REAL_PI_EXECUTION_RUNTIME_INVALID_BOUNDARY"
    });
  }
  return {
    piHostLabel,
    artifact: {
      kind: "runtime_registration_snapshot",
      path: projectRelativePath(projectRoot, absolutePath),
      sha256: sha256Bytes(content),
      size_bytes: content.byteLength
    }
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

function realPiRuntimeRegistrationSnapshotPath(probeId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "pi-codex-lifecycle", probeId, "runtime-registration-snapshot.json")
  );
}

function terminalExecutionReviewPath(reviewId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "pi-codex-lifecycle", reviewId, "terminal-execution-review.json")
  );
}

function operatorServiceTransportContractPath(contractId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "pi-codex-lifecycle", contractId, "operator-service-transport-contract.json")
  );
}

function operatorServiceTransportContinuityPath(continuityId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "pi-codex-lifecycle", continuityId, "operator-service-transport-continuity.json")
  );
}

function unattendedRealHostHandoffReviewPath(reviewId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "pi-codex-lifecycle", reviewId, "unattended-real-host-handoff-review.json")
  );
}

function unattendedRealHostOperatorApprovalPath(approvalId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "pi-codex-lifecycle", approvalId, "unattended-real-host-operator-approval.json")
  );
}

function unattendedRealHostExecutorContractPath(executorContractId: string): string {
  return normalizeRelativePath(
    join(
      ".comath",
      "release",
      "pi-codex-lifecycle",
      executorContractId,
      "unattended-real-host-executor-contract.json"
    )
  );
}

function unattendedRealHostDurableTransportContractPath(durableTransportContractId: string): string {
  return normalizeRelativePath(
    join(
      ".comath",
      "release",
      "pi-codex-lifecycle",
      durableTransportContractId,
      "unattended-real-host-durable-transport-contract.json"
    )
  );
}

function unattendedRealHostExecutionReadinessPath(readinessId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "pi-codex-lifecycle", readinessId, "unattended-real-host-execution-readiness.json")
  );
}

function unattendedRealHostExecutionAttemptPath(attemptId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "pi-codex-lifecycle", attemptId, "unattended-real-host-execution-attempt.json")
  );
}

function unattendedRealHostExecutionAttemptResultPath(attemptId: string): string {
  return normalizeRelativePath(
    join(
      ".comath",
      "release",
      "pi-codex-lifecycle",
      attemptId,
      "unattended-real-host-execution-attempt-result.json"
    )
  );
}

function unattendedRealHostExecutionAttemptReviewPath(attemptReviewId: string): string {
  return normalizeRelativePath(
    join(
      ".comath",
      "release",
      "pi-codex-lifecycle",
      attemptReviewId,
      "unattended-real-host-execution-attempt-review.json"
    )
  );
}

function unattendedRealHostCompletionCertificationPrerequisitePath(
  completionCertificationPrerequisiteId: string
): string {
  return normalizeRelativePath(
    join(
      ".comath",
      "release",
      "pi-codex-lifecycle",
      completionCertificationPrerequisiteId,
      "unattended-real-host-completion-certification-prerequisite.json"
    )
  );
}

function automaticRealPiExecutionOrchestrationPath(orchestrationId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "pi-codex-lifecycle", orchestrationId, "automatic-real-pi-execution.json")
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
  const requestedCursor = sanitizeOperatorTransportCursor(input.requested_cursor ?? recovery.requested_cursor);
  const rawLeaseRoute = input.lease_route ?? recovery.observed_route;
  assertOperatorTransportLeaseRouteMatchesRecovery(rawLeaseRoute, recovery.observed_route);
  const logSessionBinding = bindOperatorTransportLogSession({
    projectRoot,
    projectId,
    rawRoute: rawLeaseRoute,
    cursor: requestedCursor,
    actor: sanitizeOperatorTransportText(input.actor)
  });
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
    lease_route: logSessionBinding.route,
    requested_cursor: requestedCursor,
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
    operator_transport_log_session_bound: true,
    agent_run_log_session_binding: logSessionBinding,
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
      operator_transport_log_session_bound: true,
      agent_run_id: logSessionBinding.run_id,
      agent_run_log_session_route: logSessionBinding.route,
      agent_run_log_session_body_sha256: logSessionBinding.body_sha256,
      agent_run_log_session_event_count: logSessionBinding.event_count,
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

export function heartbeatPiCodexLifecycleOperatorTransportLease(
  projectRoot: string,
  input: PiCodexLifecycleOperatorTransportHeartbeatInput
): PiCodexLifecycleOperatorTransportHeartbeat {
  const projectId = assertOperatorSessionProjectId(input.project_id);
  const sessionId = assertOperatorSessionId(input.session_id);
  const recoveryId = assertOperatorTransportRecoveryId(input.transport_recovery_id);
  const leaseId = assertOperatorTransportLeaseId(input.transport_lease_id);
  const heartbeatId = assertOperatorTransportHeartbeatId(input.transport_heartbeat_id);
  const clientEpoch = assertOperatorTransportClientEpoch(input.client_epoch);
  let sessionManifestPath: string;
  let sessionBundle: ReturnType<typeof readOperatorTransportSessionManifest>;
  try {
    sessionManifestPath = resolveOperatorTransportSessionManifestPath(
      projectRoot,
      sessionId,
      input.session_manifest_path
    );
    sessionBundle = readOperatorTransportSessionManifest(projectRoot, projectId, sessionId, sessionManifestPath);
  } catch (error) {
    if (error instanceof ComathError) {
      throw new ComathError("Pi/Codex lifecycle operator transport heartbeat session is invalid", {
        statusCode: error.statusCode,
        code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_HEARTBEAT_SESSION_INVALID"
      });
    }
    throw error;
  }

  let recoveryPath: string;
  let recoveryBundle: ReturnType<typeof readOperatorTransportRecoveryCheckpoint>;
  try {
    recoveryPath = resolveOperatorTransportRecoveryPath(projectRoot, recoveryId, input.transport_recovery_path);
    recoveryBundle = readOperatorTransportRecoveryCheckpoint(projectRoot, projectId, sessionId, recoveryId, recoveryPath);
  } catch (error) {
    if (error instanceof ComathError) {
      throw new ComathError("Pi/Codex lifecycle operator transport heartbeat recovery checkpoint is invalid", {
        statusCode: error.statusCode,
        code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_HEARTBEAT_RECOVERY_INVALID"
      });
    }
    throw error;
  }
  const { manifest, artifact: sessionManifestArtifact } = sessionBundle;
  const { recovery, artifact: recoveryArtifact } = recoveryBundle;
  if (
    recovery.session_manifest_path !== sessionManifestPath ||
    recovery.session_manifest_artifact.sha256 !== sessionManifestArtifact.sha256 ||
    recovery.client_epoch > clientEpoch
  ) {
    throw new ComathError("Pi/Codex lifecycle operator transport heartbeat recovery is stale", {
      statusCode: 400,
      code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_HEARTBEAT_RECOVERY_INVALID"
    });
  }

  const leasePath = input.transport_lease_path
    ? projectRelativePath(
        projectRoot,
        assertPathAllowed(projectRoot, input.transport_lease_path, { purpose: "read", resolveRealpath: true })
      )
    : operatorTransportLeasePath(leaseId);
  let leaseBundle: ReturnType<typeof readOperatorTransportLeaseArtifact>;
  try {
    leaseBundle = readOperatorTransportLeaseArtifact(projectRoot, projectId, sessionId, recoveryId, leaseId, leasePath, {
      allowLiveLogGrowth: true
    });
  } catch (error) {
    if (error instanceof ComathError) {
      throw new ComathError("Pi/Codex lifecycle operator transport heartbeat lease is invalid or expired", {
        statusCode: error.statusCode,
        code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_HEARTBEAT_LEASE_INVALID"
      });
    }
    throw error;
  }
  const { lease, artifact: leaseArtifact } = leaseBundle;
  if (
    lease.session_manifest_path !== sessionManifestPath ||
    lease.session_manifest_artifact.sha256 !== sessionManifestArtifact.sha256 ||
    lease.transport_recovery_path !== recoveryPath ||
    lease.transport_recovery_artifact.sha256 !== recoveryArtifact.sha256 ||
    lease.client_epoch > clientEpoch
  ) {
    throw new ComathError("Pi/Codex lifecycle operator transport heartbeat artifacts do not share one chain", {
      statusCode: 400,
      code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_HEARTBEAT_CHAIN_MISMATCH"
    });
  }
  try {
    assertOperatorTransportLeaseRouteMatchesRecovery(lease.lease_route, recovery.observed_route);
  } catch (error) {
    if (error instanceof ComathError) {
      throw new ComathError("Pi/Codex lifecycle operator transport heartbeat lease route is unbound", {
        statusCode: error.statusCode,
        code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_HEARTBEAT_LEASE_INVALID"
      });
    }
    throw error;
  }

  const requestedCursor = sanitizeOperatorTransportCursor(input.requested_cursor ?? lease.requested_cursor);
  const logSessionBinding = bindOperatorTransportLogSession({
    projectRoot,
    projectId,
    rawRoute: lease.lease_route,
    cursor: requestedCursor,
    actor: sanitizeOperatorTransportText(input.actor)
  });
  const heartbeatPath = operatorTransportHeartbeatPath(heartbeatId);
  const absoluteHeartbeatPath = assertPathAllowed(projectRoot, heartbeatPath, { purpose: "runtime-write" });
  if (existsSync(absoluteHeartbeatPath)) {
    throw new ComathError("Pi/Codex lifecycle operator transport heartbeat already exists", {
      statusCode: 409,
      code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_HEARTBEAT_ALREADY_EXISTS"
    });
  }

  const body: PiCodexLifecycleOperatorTransportHeartbeatBody = {
    schema_version: "comath.pi_codex_lifecycle_operator_transport_heartbeat.v1",
    transport_heartbeat_id: heartbeatId,
    transport_lease_id: leaseId,
    transport_recovery_id: recoveryId,
    project_id: projectId,
    session_id: sessionId,
    actor: sanitizeOperatorTransportText(input.actor),
    created_at: new Date().toISOString(),
    heartbeat_status: "operator_transport_heartbeat_rebound",
    transport_kind: lease.transport_kind,
    lease_route: lease.lease_route,
    requested_cursor: requestedCursor,
    client_epoch: clientEpoch,
    heartbeat_interval_ms: lease.heartbeat_interval_ms,
    lease_ttl_ms: lease.lease_ttl_ms,
    lease_started_at: lease.lease_started_at,
    lease_expires_at: lease.lease_expires_at,
    heartbeat_required: true,
    last_seen_event_id: sanitizeOperatorTransportText(input.last_seen_event_id ?? lease.last_seen_event_id),
    heartbeat_reason: sanitizeOperatorTransportText(input.heartbeat_reason ?? "bounded_operator_transport_heartbeat"),
    session_manifest_path: sessionManifestPath,
    session_manifest_artifact: sessionManifestArtifact,
    transport_recovery_path: recoveryPath,
    transport_recovery_artifact: recoveryArtifact,
    transport_lease_path: leasePath,
    lease_artifact: leaseArtifact,
    next_recommended_route: sanitizeOperatorSessionText(manifest.next_recommended_route),
    transport_heartbeat_path: heartbeatPath,
    operator_transport_lease_bound: true,
    operator_transport_log_session_rebound: true,
    agent_run_log_session_binding: logSessionBinding,
    lease_still_valid: true,
    durable_recovery_checkpoint_required: true,
    bounded_live_transport_lease_bound: true,
    bounded_heartbeat_checkpoint_provided: true,
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
  mkdirSync(dirname(absoluteHeartbeatPath), { recursive: true });
  writeFileSync(absoluteHeartbeatPath, artifactText, "utf8");
  const result: PiCodexLifecycleOperatorTransportHeartbeat = {
    ...body,
    transport_heartbeat_artifact: {
      kind: "operator_transport_heartbeat",
      path: heartbeatPath,
      sha256: sha256Text(artifactText),
      size_bytes: Buffer.byteLength(artifactText, "utf8")
    }
  };
  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.pi_codex_lifecycle_operator_transport_heartbeat_recorded",
    actor: sanitizeOperatorTransportText(input.actor),
    target_id: projectId,
    payload: {
      transport_heartbeat_id: heartbeatId,
      transport_lease_id: leaseId,
      transport_recovery_id: recoveryId,
      session_id: sessionId,
      transport_kind: lease.transport_kind,
      session_manifest_path: sessionManifestPath,
      transport_recovery_path: recoveryPath,
      transport_lease_path: leasePath,
      transport_heartbeat_path: heartbeatPath,
      operator_transport_lease_bound: true,
      operator_transport_log_session_rebound: true,
      agent_run_id: logSessionBinding.run_id,
      agent_run_log_session_route: logSessionBinding.route,
      agent_run_log_session_body_sha256: logSessionBinding.body_sha256,
      agent_run_log_session_event_count: logSessionBinding.event_count,
      heartbeat_interval_ms: lease.heartbeat_interval_ms,
      lease_ttl_ms: lease.lease_ttl_ms,
      bounded_heartbeat_checkpoint_provided: true,
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
  const { artifact: runtimeRegistrationArtifact, piHostLabel: runtimeRegistrationPiHostLabel } =
    readGuidedRealPiRuntimeRegistrationSnapshot(
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
  const { manifest, artifact: sessionManifestArtifact } = readOperatorTransportSessionManifest(
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
    lease.transport_recovery_artifact.sha256 !== transportRecoveryArtifact.sha256 ||
    manifest.pi_host_label !== runtimeRegistrationPiHostLabel ||
    (piHostLabel !== undefined && piHostLabel !== runtimeRegistrationPiHostLabel)
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

function assertTerminalChainBinding(condition: boolean, message: string): void {
  if (!condition) {
    throw new ComathError(message, {
      statusCode: 400,
      code: "PI_CODEX_GUIDED_EXECUTION_TERMINAL_CHAIN_MISMATCH"
    });
  }
}

export function reviewPiCodexLifecycleTerminalExecution(
  projectRoot: string,
  input: PiCodexGuidedExecutionTerminalChainReviewInput
): PiCodexGuidedExecutionTerminalChainReview {
  const projectId = assertOperatorSessionProjectId(input.project_id);
  const reviewId = assertReviewId(input.review_id);
  const realPiRuntimeProbeId = assertRealPiRuntimeProbeId(input.real_pi_runtime_probe_id);
  const sessionId = assertOperatorSessionId(input.session_id);
  const recoveryId = assertOperatorTransportRecoveryId(input.transport_recovery_id);
  const leaseId = assertOperatorTransportLeaseId(input.transport_lease_id);
  const heartbeatId = assertOperatorTransportHeartbeatId(input.transport_heartbeat_id);
  const executionId = assertGuidedRealPiExecutionId(input.execution_id);

  const { artifact: runtimeRegistrationArtifact, piHostLabel: runtimeRegistrationPiHostLabel } =
    readGuidedRealPiRuntimeRegistrationSnapshot(
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
  const { manifest, artifact: sessionManifestArtifact } = readOperatorTransportSessionManifest(
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
    leasePath,
    { allowLiveLogGrowth: true }
  );
  const heartbeatPath = resolveOperatorTransportHeartbeatPath(
    projectRoot,
    heartbeatId,
    input.transport_heartbeat_path
  );
  const { heartbeat, artifact: transportHeartbeatArtifact } = readOperatorTransportHeartbeatArtifact(
    projectRoot,
    projectId,
    sessionId,
    recoveryId,
    leaseId,
    heartbeatId,
    heartbeatPath
  );
  const guidedExecutionPath = resolveGuidedRealPiExecutionPath(projectRoot, executionId, input.guided_execution_path);
  const { execution, artifact: guidedExecutionArtifact } = readGuidedRealPiExecutionArtifact(
    projectRoot,
    projectId,
    realPiRuntimeProbeId,
    sessionId,
    recoveryId,
    leaseId,
    executionId,
    guidedExecutionPath
  );

  assertTerminalChainBinding(
    manifest.pi_host_label === runtimeRegistrationPiHostLabel,
    "Pi/Codex guided execution terminal chain session host binding does not match runtime probe"
  );
  assertTerminalChainBinding(
    recovery.session_manifest_path === sessionManifestPath &&
      recovery.session_manifest_artifact.sha256 === sessionManifestArtifact.sha256,
    "Pi/Codex guided execution terminal chain recovery is not bound to the current session manifest"
  );
  assertTerminalChainBinding(
    lease.session_manifest_path === sessionManifestPath &&
      lease.session_manifest_artifact.sha256 === sessionManifestArtifact.sha256 &&
      lease.transport_recovery_path === recoveryPath &&
      lease.transport_recovery_artifact.sha256 === transportRecoveryArtifact.sha256,
    "Pi/Codex guided execution terminal chain lease is not bound to the current recovery/session chain"
  );
  assertTerminalChainBinding(
    heartbeat.session_manifest_path === sessionManifestPath &&
      heartbeat.session_manifest_artifact.sha256 === sessionManifestArtifact.sha256 &&
      heartbeat.transport_recovery_path === recoveryPath &&
      heartbeat.transport_recovery_artifact.sha256 === transportRecoveryArtifact.sha256 &&
      heartbeat.transport_lease_path === leasePath &&
      heartbeat.lease_artifact.sha256 === transportLeaseArtifact.sha256,
    "Pi/Codex guided execution terminal chain heartbeat is not bound to the current lease/recovery/session chain"
  );
  assertTerminalChainBinding(
    heartbeat.agent_run_log_session_binding.project_id === lease.agent_run_log_session_binding.project_id &&
      heartbeat.agent_run_log_session_binding.run_id === lease.agent_run_log_session_binding.run_id &&
      heartbeat.agent_run_log_session_binding.route === lease.agent_run_log_session_binding.route &&
      agentRunLogCursorAtLeast(heartbeat.agent_run_log_session_binding.cursor, lease.agent_run_log_session_binding.next_cursor),
    "Pi/Codex guided execution terminal chain heartbeat did not consume the bounded lease log-session"
  );
  assertTerminalChainBinding(
    execution.pi_install_transcript_path === piInstallArtifact.path &&
      execution.pi_install_artifact.sha256 === piInstallArtifact.sha256 &&
      execution.runtime_registration_snapshot_path === runtimeRegistrationArtifact.path &&
      execution.runtime_registration_artifact.sha256 === runtimeRegistrationArtifact.sha256 &&
      execution.session_manifest_path === sessionManifestPath &&
      execution.session_manifest_artifact.sha256 === sessionManifestArtifact.sha256 &&
      execution.transport_recovery_path === recoveryPath &&
      execution.transport_recovery_artifact.sha256 === transportRecoveryArtifact.sha256 &&
      execution.transport_lease_path === leasePath &&
      execution.transport_lease_artifact.sha256 === transportLeaseArtifact.sha256,
    "Pi/Codex guided execution terminal chain guided execution is not bound to the current lifecycle artifacts"
  );
  assertTerminalChainBinding(
    execution.pi_host_label === undefined || execution.pi_host_label === runtimeRegistrationPiHostLabel,
    "Pi/Codex guided execution terminal chain guided execution host binding does not match runtime probe"
  );

  const reviewPath = terminalExecutionReviewPath(reviewId);
  const absoluteReviewPath = assertPathAllowed(projectRoot, reviewPath, { purpose: "runtime-write" });
  if (existsSync(absoluteReviewPath)) {
    throw new ComathError("Pi/Codex guided execution terminal chain review already exists", {
      statusCode: 409,
      code: "PI_CODEX_GUIDED_EXECUTION_TERMINAL_CHAIN_REVIEW_ALREADY_EXISTS"
    });
  }

  const review: PiCodexGuidedExecutionTerminalChainReview = {
    schema_version: "comath.pi_codex_guided_execution_terminal_chain_review.v1",
    review_id: reviewId,
    project_id: projectId,
    created_at: new Date().toISOString(),
    ok: true,
    review_status: "guided_real_pi_terminal_chain_ready_for_release_review",
    review_path: reviewPath,
    ordered_steps: [...terminalChainOrderedSteps],
    required_preconditions: [...terminalChainOrderedSteps],
    real_pi_runtime_probe_id: realPiRuntimeProbeId,
    session_id: sessionId,
    transport_recovery_id: recoveryId,
    transport_lease_id: leaseId,
    transport_heartbeat_id: heartbeatId,
    execution_id: executionId,
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
    transport_heartbeat_path: heartbeatPath,
    transport_heartbeat_artifact: transportHeartbeatArtifact,
    guided_execution_path: guidedExecutionPath,
    guided_execution_artifact: guidedExecutionArtifact,
    agent_run_log_session_binding: heartbeat.agent_run_log_session_binding,
    terminal_chain_bound: true,
    heartbeat_consumed_by_review: true,
    guided_execution_consumed_by_review: true,
    vetoes: [],
    pi_direct_write_allowed: false,
    direct_trusted_state_mutation: false,
    durable_transport_provided: false,
    live_transport_open: false,
    indefinite_stream_open: false,
    long_lived_websocket_provided: false,
    long_lived_sse_provided: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  };

  mkdirSync(dirname(absoluteReviewPath), { recursive: true });
  writeFileSync(absoluteReviewPath, canonicalJson(review), "utf8");
  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.pi_codex_guided_execution_terminal_chain_reviewed",
    actor: sanitizeOperatorTransportText(input.actor),
    target_id: projectId,
    payload: {
      review_id: reviewId,
      ok: true,
      review_status: review.review_status,
      review_path: reviewPath,
      real_pi_runtime_probe_id: realPiRuntimeProbeId,
      session_id: sessionId,
      transport_recovery_id: recoveryId,
      transport_lease_id: leaseId,
      transport_heartbeat_id: heartbeatId,
      execution_id: executionId,
      transport_heartbeat_artifact_sha256: transportHeartbeatArtifact.sha256,
      guided_execution_artifact_sha256: guidedExecutionArtifact.sha256,
      terminal_chain_bound: true,
      heartbeat_consumed_by_review: true,
      guided_execution_consumed_by_review: true,
      agent_run_id: heartbeat.agent_run_log_session_binding.run_id,
      agent_run_log_session_route: heartbeat.agent_run_log_session_binding.route,
      agent_run_log_session_body_sha256: heartbeat.agent_run_log_session_binding.body_sha256,
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
  return review;
}

function assertOperatorServiceTransportContractBinding(condition: boolean, message: string): void {
  if (!condition) {
    throw new ComathError(message, {
      statusCode: 400,
      code: "PI_CODEX_OPERATOR_SERVICE_TRANSPORT_CONTRACT_CHAIN_MISMATCH"
    });
  }
}

function assertOperatorServiceTransportContractBoundary(contract: PiCodexOperatorServiceTransportContractBody): void {
  const parsedLogSessionRoute =
    typeof contract.service_route === "string" ? parseAgentRunLogSessionRoute(contract.service_route) : null;
  if (
    contract.contract_status !== "maintained_bounded_transport_contract_recorded" ||
    contract.maintained_transport_primitive_bound !== true ||
    contract.service_route_bound !== true ||
    contract.client_fetch_contract_bound !== true ||
    contract.terminal_review_bound !== true ||
    contract.heartbeat_bound !== true ||
    contract.service_transport_primitive !== "node_http_agent_run_log_session_route" ||
    contract.client_transport_primitive !== "pi_fetch_get_text" ||
    contract.http_method !== "GET" ||
    contract.content_type !== "text/event-stream; charset=utf-8" ||
    parsedLogSessionRoute === null ||
    parsedLogSessionRoute.route !== contract.service_route ||
    parsedLogSessionRoute.runId !== contract.agent_run_id ||
    !isAgentRunLogCursor(contract.resume_cursor) ||
    !isAgentRunLogCursor(contract.log_session_next_cursor) ||
    !Number.isSafeInteger(contract.log_session_event_count) ||
    contract.log_session_event_count < 0 ||
    !/^[a-f0-9]{64}$/u.test(contract.log_session_body_sha256) ||
    contract.durable_transport_provided !== false ||
    contract.live_transport_open !== false ||
    contract.indefinite_stream_open !== false ||
    contract.long_lived_websocket_provided !== false ||
    contract.long_lived_sse_provided !== false ||
    contract.pi_direct_write_allowed !== false ||
    contract.direct_trusted_state_mutation !== false ||
    contract.proof_authority !== "none" ||
    contract.can_promote_claim !== false ||
    contract.can_certify_ga !== false
  ) {
    throw new ComathError("Pi/Codex operator/service transport continuity contract violates boundaries", {
      statusCode: 400,
      code: "PI_CODEX_OPERATOR_SERVICE_TRANSPORT_CONTINUITY_CONTRACT_INVALID"
    });
  }
}

function readOperatorServiceTransportContractArtifact(
  projectRoot: string,
  projectId: string,
  contractId: string,
  contractPath: string,
  expectedSha256: string
): {
  contract: PiCodexOperatorServiceTransportContractBody;
  artifact: PiCodexOperatorServiceTransportContractArtifact;
} {
  const absolutePath = assertPathAllowed(projectRoot, contractPath, {
    purpose: "read",
    resolveRealpath: true
  });
  if (!existsSync(absolutePath)) {
    throw new ComathError("Pi/Codex operator/service transport continuity requires a transport contract artifact", {
      statusCode: 400,
      code: "PI_CODEX_OPERATOR_SERVICE_TRANSPORT_CONTINUITY_CONTRACT_MISSING"
    });
  }
  if (!statSync(absolutePath).isFile()) {
    throw new ComathError("Pi/Codex operator/service transport continuity contract must be a file", {
      statusCode: 400,
      code: "PI_CODEX_OPERATOR_SERVICE_TRANSPORT_CONTINUITY_CONTRACT_INVALID"
    });
  }
  const content = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(content);
  if (expectedSha256 !== actualSha256) {
    throw new ComathError("Pi/Codex operator/service transport continuity contract artifact changed", {
      statusCode: 400,
      code: "PI_CODEX_OPERATOR_SERVICE_TRANSPORT_CONTINUITY_CONTRACT_STALE"
    });
  }
  let parsed: PiCodexOperatorServiceTransportContractBody;
  try {
    parsed = JSON.parse(content.toString("utf8")) as PiCodexOperatorServiceTransportContractBody;
  } catch {
    throw new ComathError("Pi/Codex operator/service transport continuity contract JSON is invalid", {
      statusCode: 400,
      code: "PI_CODEX_OPERATOR_SERVICE_TRANSPORT_CONTINUITY_CONTRACT_INVALID"
    });
  }
  if (
    parsed.schema_version !== "comath.pi_codex_operator_service_transport_contract.v1" ||
    parsed.project_id !== projectId ||
    parsed.transport_contract_id !== contractId ||
    parsed.transport_contract_path !== contractPath
  ) {
    throw new ComathError("Pi/Codex operator/service transport continuity contract does not bind the request", {
      statusCode: 400,
      code: "PI_CODEX_OPERATOR_SERVICE_TRANSPORT_CONTINUITY_CONTRACT_INVALID"
    });
  }
  assertOperatorServiceTransportContractBoundary(parsed);
  return {
    contract: parsed,
    artifact: {
      kind: "operator_service_transport_contract",
      path: contractPath,
      sha256: actualSha256,
      size_bytes: content.byteLength
    }
  };
}

export function recordPiCodexLifecycleOperatorServiceTransportContract(
  projectRoot: string,
  input: PiCodexOperatorServiceTransportContractInput
): PiCodexOperatorServiceTransportContract {
  const projectId = assertOperatorSessionProjectId(input.project_id);
  const contractId = assertOperatorServiceTransportContractId(input.transport_contract_id);
  const reviewId = assertReviewId(input.terminal_review_id);
  const serviceTransportPrimitive = assertOperatorServiceTransportPrimitive(input.service_transport_primitive);
  const clientTransportPrimitive = assertOperatorClientTransportPrimitive(input.client_transport_primitive);
  const terminalReviewPath = input.terminal_review_path
    ? projectRelativePath(
        projectRoot,
        assertPathAllowed(projectRoot, input.terminal_review_path, { purpose: "read", resolveRealpath: true })
      )
    : terminalExecutionReviewPath(reviewId);
  const { review, artifact: terminalReviewArtifact } = readGuidedExecutionTerminalChainReviewArtifact(
    projectRoot,
    projectId,
    reviewId,
    terminalReviewPath
  );
  const { heartbeat, artifact: transportHeartbeatArtifact } = readOperatorTransportHeartbeatArtifact(
    projectRoot,
    projectId,
    review.session_id,
    review.transport_recovery_id,
    review.transport_lease_id,
    review.transport_heartbeat_id,
    review.transport_heartbeat_path
  );
  if (transportHeartbeatArtifact.sha256 !== review.transport_heartbeat_artifact.sha256) {
    throw new ComathError("Pi/Codex operator/service transport contract heartbeat artifact changed after review", {
      statusCode: 400,
      code: "PI_CODEX_OPERATOR_SERVICE_TRANSPORT_CONTRACT_HEARTBEAT_STALE"
    });
  }
  const { execution, artifact: guidedExecutionArtifact } = readGuidedRealPiExecutionArtifact(
    projectRoot,
    projectId,
    review.real_pi_runtime_probe_id,
    review.session_id,
    review.transport_recovery_id,
    review.transport_lease_id,
    review.execution_id,
    review.guided_execution_path
  );
  assertOperatorServiceTransportContractBinding(
    guidedExecutionArtifact.sha256 === review.guided_execution_artifact.sha256 &&
      execution.guided_execution_path === review.guided_execution_path,
    "Pi/Codex operator/service transport contract guided execution artifact changed after review"
  );
  assertOperatorServiceTransportContractBinding(
    heartbeat.agent_run_log_session_binding.project_id === review.agent_run_log_session_binding.project_id &&
      heartbeat.agent_run_log_session_binding.run_id === review.agent_run_log_session_binding.run_id &&
      heartbeat.agent_run_log_session_binding.route === review.agent_run_log_session_binding.route &&
      heartbeat.agent_run_log_session_binding.content_type === review.agent_run_log_session_binding.content_type &&
      agentRunLogCursorEqual(heartbeat.agent_run_log_session_binding.cursor, review.agent_run_log_session_binding.cursor) &&
      agentRunLogCursorEqual(
        heartbeat.agent_run_log_session_binding.next_cursor,
        review.agent_run_log_session_binding.next_cursor
      ) &&
      heartbeat.agent_run_log_session_binding.body_sha256 === review.agent_run_log_session_binding.body_sha256,
    "Pi/Codex operator/service transport contract terminal review is not bound to the current heartbeat log-session"
  );

  const boundedLimits = {
    max_bytes: input.max_bytes ?? 64 * 1024,
    max_events: input.max_events ?? 5,
    retry_ms: input.retry_ms ?? 1000
  };
  const logSession = formatAgentRunLogSseSession(projectRoot, {
    project_id: projectId,
    run_id: heartbeat.agent_run_log_session_binding.run_id,
    cursor: heartbeat.agent_run_log_session_binding.next_cursor,
    max_bytes: boundedLimits.max_bytes,
    max_events: boundedLimits.max_events,
    retry_ms: boundedLimits.retry_ms,
    actor: sanitizeOperatorTransportText(input.actor)
  });
  assertOperatorServiceTransportContractBinding(
    logSession.content_type === heartbeat.agent_run_log_session_binding.content_type &&
      logSession.run_id === heartbeat.agent_run_log_session_binding.run_id &&
      logSession.project_id === projectId,
    "Pi/Codex operator/service transport contract log-session route is not service-owned"
  );

  const contractPath = operatorServiceTransportContractPath(contractId);
  const absoluteContractPath = assertPathAllowed(projectRoot, contractPath, { purpose: "runtime-write" });
  if (existsSync(absoluteContractPath)) {
    throw new ComathError("Pi/Codex operator/service transport contract already exists", {
      statusCode: 409,
      code: "PI_CODEX_OPERATOR_SERVICE_TRANSPORT_CONTRACT_ALREADY_EXISTS"
    });
  }

  const body: PiCodexOperatorServiceTransportContractBody = {
    schema_version: "comath.pi_codex_operator_service_transport_contract.v1",
    transport_contract_id: contractId,
    project_id: projectId,
    actor: sanitizeOperatorTransportText(input.actor),
    created_at: new Date().toISOString(),
    contract_status: "maintained_bounded_transport_contract_recorded",
    transport_contract_path: contractPath,
    terminal_review_id: review.review_id,
    terminal_review_path: terminalReviewPath,
    terminal_review_artifact: terminalReviewArtifact,
    transport_heartbeat_id: review.transport_heartbeat_id,
    transport_heartbeat_path: review.transport_heartbeat_path,
    transport_heartbeat_artifact: transportHeartbeatArtifact,
    execution_id: review.execution_id,
    guided_execution_path: review.guided_execution_path,
    guided_execution_artifact: guidedExecutionArtifact,
    session_id: review.session_id,
    transport_recovery_id: review.transport_recovery_id,
    transport_lease_id: review.transport_lease_id,
    agent_run_id: heartbeat.agent_run_log_session_binding.run_id,
    service_transport_primitive: serviceTransportPrimitive,
    client_transport_primitive: clientTransportPrimitive,
    http_method: "GET",
    service_route: heartbeat.agent_run_log_session_binding.route,
    content_type: logSession.content_type,
    bounded_limits: boundedLimits,
    resume_cursor: heartbeat.agent_run_log_session_binding.next_cursor,
    log_session_next_cursor: logSession.next_cursor,
    log_session_event_count: logSession.events.length,
    log_session_body_sha256: sha256Text(logSession.body),
    maintained_transport_primitive_bound: true,
    service_route_bound: true,
    client_fetch_contract_bound: true,
    terminal_review_bound: true,
    heartbeat_bound: true,
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
  mkdirSync(dirname(absoluteContractPath), { recursive: true });
  writeFileSync(absoluteContractPath, artifactText, "utf8");
  const result: PiCodexOperatorServiceTransportContract = {
    ...body,
    transport_contract_artifact: {
      kind: "operator_service_transport_contract",
      path: contractPath,
      sha256: sha256Text(artifactText),
      size_bytes: Buffer.byteLength(artifactText, "utf8")
    }
  };
  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.pi_codex_operator_service_transport_contract_recorded",
    actor: sanitizeOperatorTransportText(input.actor),
    target_id: projectId,
    payload: {
      transport_contract_id: contractId,
      contract_status: result.contract_status,
      transport_contract_path: contractPath,
      terminal_review_id: review.review_id,
      terminal_review_artifact_sha256: terminalReviewArtifact.sha256,
      transport_heartbeat_id: review.transport_heartbeat_id,
      transport_heartbeat_artifact_sha256: transportHeartbeatArtifact.sha256,
      execution_id: review.execution_id,
      guided_execution_artifact_sha256: guidedExecutionArtifact.sha256,
      service_transport_primitive: serviceTransportPrimitive,
      client_transport_primitive: clientTransportPrimitive,
      service_route: heartbeat.agent_run_log_session_binding.route,
      agent_run_id: heartbeat.agent_run_log_session_binding.run_id,
      log_session_body_sha256: result.log_session_body_sha256,
      log_session_event_count: result.log_session_event_count,
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

export function recordPiCodexLifecycleOperatorServiceTransportContinuity(
  projectRoot: string,
  input: PiCodexOperatorServiceTransportContinuityInput
): PiCodexOperatorServiceTransportContinuity {
  const projectId = assertOperatorSessionProjectId(input.project_id);
  const continuityId = assertOperatorServiceTransportContinuityId(input.continuity_id);
  const contractId = assertOperatorServiceTransportContractId(input.transport_contract_id);
  const serviceTransportPrimitive = assertOperatorServiceTransportPrimitive(input.service_transport_primitive);
  const clientTransportPrimitive = assertOperatorClientTransportPrimitive(input.client_transport_primitive);
  const canonicalContractPath = operatorServiceTransportContractPath(contractId);
  const contractPath = input.transport_contract_path
    ? projectRelativePath(
        projectRoot,
        assertPathAllowed(projectRoot, input.transport_contract_path, { purpose: "read", resolveRealpath: true })
      )
    : canonicalContractPath;
  if (contractPath !== canonicalContractPath) {
    throw new ComathError("Pi/Codex operator/service transport continuity contract path is not canonical", {
      statusCode: 400,
      code: "PI_CODEX_OPERATOR_SERVICE_TRANSPORT_CONTINUITY_CONTRACT_NON_CANONICAL"
    });
  }
  if (input.transport_contract_sha256 === undefined) {
    throw new ComathError("Pi/Codex operator/service transport continuity requires a transport contract hash", {
      statusCode: 400,
      code: "PI_CODEX_OPERATOR_SERVICE_TRANSPORT_CONTINUITY_CONTRACT_HASH_REQUIRED"
    });
  }
  const { contract, artifact: contractArtifact } = readOperatorServiceTransportContractArtifact(
    projectRoot,
    projectId,
    contractId,
    contractPath,
    input.transport_contract_sha256
  );
  if (
    contract.service_transport_primitive !== serviceTransportPrimitive ||
    contract.client_transport_primitive !== clientTransportPrimitive
  ) {
    throw new ComathError("Pi/Codex operator/service transport continuity primitive mismatch", {
      statusCode: 400,
      code: "PI_CODEX_OPERATOR_SERVICE_TRANSPORT_CONTINUITY_PRIMITIVE_MISMATCH"
    });
  }

  const boundedLimits = {
    max_bytes: input.max_bytes ?? contract.bounded_limits.max_bytes,
    max_events: input.max_events ?? contract.bounded_limits.max_events,
    retry_ms: input.retry_ms ?? contract.bounded_limits.retry_ms
  };
  const logSession = formatAgentRunLogSseSession(projectRoot, {
    project_id: projectId,
    run_id: contract.agent_run_id,
    cursor: contract.log_session_next_cursor,
    max_bytes: boundedLimits.max_bytes,
    max_events: boundedLimits.max_events,
    retry_ms: boundedLimits.retry_ms,
    actor: sanitizeOperatorTransportText(input.actor)
  });
  if (
    logSession.project_id !== projectId ||
    logSession.run_id !== contract.agent_run_id ||
    logSession.content_type !== contract.content_type
  ) {
    throw new ComathError("Pi/Codex operator/service transport continuity log-session route is not service-owned", {
      statusCode: 400,
      code: "PI_CODEX_OPERATOR_SERVICE_TRANSPORT_CONTINUITY_ROUTE_UNBOUND"
    });
  }

  const continuityPath = operatorServiceTransportContinuityPath(continuityId);
  const absoluteContinuityPath = assertPathAllowed(projectRoot, continuityPath, { purpose: "runtime-write" });
  if (existsSync(absoluteContinuityPath)) {
    throw new ComathError("Pi/Codex operator/service transport continuity already exists", {
      statusCode: 409,
      code: "PI_CODEX_OPERATOR_SERVICE_TRANSPORT_CONTINUITY_ALREADY_EXISTS"
    });
  }

  const body: PiCodexOperatorServiceTransportContinuityBody = {
    schema_version: "comath.pi_codex_operator_service_transport_continuity.v1",
    continuity_id: continuityId,
    project_id: projectId,
    actor: sanitizeOperatorTransportText(input.actor),
    created_at: new Date().toISOString(),
    continuity_status: "maintained_bounded_transport_continuity_recorded",
    continuity_path: continuityPath,
    transport_contract_id: contract.transport_contract_id,
    transport_contract_path: contractPath,
    transport_contract_artifact: contractArtifact,
    agent_run_id: contract.agent_run_id,
    service_transport_primitive: serviceTransportPrimitive,
    client_transport_primitive: clientTransportPrimitive,
    http_method: "GET",
    service_route: contract.service_route,
    content_type: logSession.content_type,
    bounded_limits: boundedLimits,
    previous_cursor: contract.log_session_next_cursor,
    previous_log_session_body_sha256: contract.log_session_body_sha256,
    log_session_next_cursor: logSession.next_cursor,
    log_session_event_count: logSession.events.length,
    log_session_body_sha256: sha256Text(logSession.body),
    maintained_transport_primitive_bound: true,
    service_route_bound: true,
    client_fetch_contract_bound: true,
    transport_contract_bound: true,
    durable_resume_checkpoint_recorded: true,
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
  mkdirSync(dirname(absoluteContinuityPath), { recursive: true });
  writeFileSync(absoluteContinuityPath, artifactText, "utf8");
  const result: PiCodexOperatorServiceTransportContinuity = {
    ...body,
    continuity_artifact: {
      kind: "operator_service_transport_continuity",
      path: continuityPath,
      sha256: sha256Text(artifactText),
      size_bytes: Buffer.byteLength(artifactText, "utf8")
    }
  };
  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.pi_codex_operator_service_transport_continuity_recorded",
    actor: sanitizeOperatorTransportText(input.actor),
    target_id: projectId,
    payload: {
      continuity_id: continuityId,
      continuity_status: result.continuity_status,
      continuity_path: continuityPath,
      transport_contract_id: contract.transport_contract_id,
      transport_contract_artifact_sha256: contractArtifact.sha256,
      service_transport_primitive: serviceTransportPrimitive,
      client_transport_primitive: clientTransportPrimitive,
      service_route: contract.service_route,
      agent_run_id: contract.agent_run_id,
      previous_cursor: contract.log_session_next_cursor,
      log_session_next_cursor: result.log_session_next_cursor,
      log_session_body_sha256: result.log_session_body_sha256,
      log_session_event_count: result.log_session_event_count,
      durable_resume_checkpoint_recorded: true,
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

function automaticRealPiStepActor(actor: string, step: string, override: string | undefined): string {
  return sanitizeOperatorTransportText(override ?? `${actor} ${step}`);
}

export function orchestratePiCodexLifecycleAutomaticRealPiExecution(
  projectRoot: string,
  input: PiCodexLifecycleAutomaticRealPiExecutionInput
): PiCodexLifecycleAutomaticRealPiExecution {
  const projectId = assertOperatorSessionProjectId(input.project_id);
  const orchestrationId = assertAutomaticRealPiExecutionOrchestrationId(input.orchestration_id);
  const actor = sanitizeOperatorTransportText(input.actor);
  const orchestrationPath = automaticRealPiExecutionOrchestrationPath(orchestrationId);
  const absoluteOrchestrationPath = assertPathAllowed(projectRoot, orchestrationPath, { purpose: "runtime-write" });
  if (existsSync(absoluteOrchestrationPath)) {
    throw new ComathError("Pi/Codex automatic real-Pi orchestration already exists", {
      statusCode: 409,
      code: "PI_CODEX_AUTOMATIC_REAL_PI_EXECUTION_ALREADY_EXISTS"
    });
  }

  const runtimeProbe = probePiCodexRealPiInstallRuntimeRegistration(projectRoot, {
    ...input.runtime_probe,
    project_id: projectId,
    actor: automaticRealPiStepActor(actor, "real_pi_runtime_probe", input.runtime_probe.actor),
    pi_host_kind: input.runtime_probe.pi_host_kind ?? "real_pi_host"
  });
  if (!runtimeProbe.ok) {
    throw new ComathError("Pi/Codex automatic real-Pi orchestration runtime probe failed", {
      statusCode: 400,
      code: "PI_CODEX_AUTOMATIC_REAL_PI_EXECUTION_RUNTIME_PROBE_FAILED"
    });
  }

  const session = persistPiCodexLifecycleOperatorSession(projectRoot, {
    ...input.operator_session,
    project_id: projectId,
    actor: automaticRealPiStepActor(actor, "operator_session_manifest", input.operator_session.actor),
    pi_host_label: runtimeProbe.pi_host_label,
    session_kind: runtimeProbe.readiness_fragment.session_kind,
    completed_steps: input.operator_session.completed_steps ?? ["real_pi_install_runtime_probe"],
    artifact_paths: [
      { kind: "pi_install_transcript", path: runtimeProbe.pi_install_transcript_path },
      { kind: "runtime_registration_snapshot", path: runtimeProbe.runtime_registration_snapshot_path }
    ]
  });

  const recovery = recoverPiCodexLifecycleOperatorTransport(projectRoot, {
    ...input.transport_recovery,
    project_id: projectId,
    session_id: session.session_id,
    actor: automaticRealPiStepActor(
      actor,
      "operator_transport_recovery_checkpoint",
      input.transport_recovery.actor
    ),
    session_manifest_path: session.session_manifest_path
  });

  const lease = openPiCodexLifecycleOperatorTransportLease(projectRoot, {
    ...input.transport_lease,
    project_id: projectId,
    session_id: session.session_id,
    transport_recovery_id: recovery.transport_recovery_id,
    actor: automaticRealPiStepActor(actor, "bounded_operator_transport_lease", input.transport_lease.actor),
    session_manifest_path: session.session_manifest_path,
    transport_recovery_path: recovery.transport_recovery_path
  });

  const heartbeatCursor = {
    operator_event_cursor:
      input.transport_heartbeat.requested_cursor?.operator_event_cursor ??
      `event:${Math.max((input.transport_heartbeat.client_epoch ?? lease.client_epoch) + 1, lease.client_epoch + 1)}`,
    stdout_cursor: `stdout:${lease.agent_run_log_session_binding.next_cursor.stdout}`,
    stderr_cursor: `stderr:${lease.agent_run_log_session_binding.next_cursor.stderr}`
  };
  const heartbeat = heartbeatPiCodexLifecycleOperatorTransportLease(projectRoot, {
    ...input.transport_heartbeat,
    project_id: projectId,
    session_id: session.session_id,
    transport_recovery_id: recovery.transport_recovery_id,
    transport_lease_id: lease.transport_lease_id,
    actor: automaticRealPiStepActor(
      actor,
      "operator_transport_heartbeat_rebind",
      input.transport_heartbeat.actor
    ),
    session_manifest_path: session.session_manifest_path,
    transport_recovery_path: recovery.transport_recovery_path,
    transport_lease_path: lease.transport_lease_path,
    requested_cursor: heartbeatCursor,
    client_epoch: Math.max(input.transport_heartbeat.client_epoch ?? lease.client_epoch + 1, lease.client_epoch)
  });

  const execution = recordPiCodexLifecycleGuidedRealPiExecution(projectRoot, {
    ...input.guided_execution,
    project_id: projectId,
    actor: automaticRealPiStepActor(actor, "guided_real_pi_execution", input.guided_execution.actor),
    real_pi_runtime_probe_id: runtimeProbe.probe_id,
    pi_install_transcript_path: runtimeProbe.pi_install_transcript_path,
    runtime_registration_snapshot_path: runtimeProbe.runtime_registration_snapshot_path,
    session_id: session.session_id,
    session_manifest_path: session.session_manifest_path,
    transport_recovery_id: recovery.transport_recovery_id,
    transport_recovery_path: recovery.transport_recovery_path,
    transport_lease_id: lease.transport_lease_id,
    transport_lease_path: lease.transport_lease_path,
    pi_host_label: runtimeProbe.pi_host_label
  });

  const review = reviewPiCodexLifecycleTerminalExecution(projectRoot, {
    project_id: projectId,
    review_id: input.terminal_review?.review_id,
    actor: automaticRealPiStepActor(actor, "terminal_execution_review", input.terminal_review?.actor),
    real_pi_runtime_probe_id: runtimeProbe.probe_id,
    pi_install_transcript_path: runtimeProbe.pi_install_transcript_path,
    runtime_registration_snapshot_path: runtimeProbe.runtime_registration_snapshot_path,
    session_id: session.session_id,
    session_manifest_path: session.session_manifest_path,
    transport_recovery_id: recovery.transport_recovery_id,
    transport_recovery_path: recovery.transport_recovery_path,
    transport_lease_id: lease.transport_lease_id,
    transport_lease_path: lease.transport_lease_path,
    transport_heartbeat_id: heartbeat.transport_heartbeat_id,
    transport_heartbeat_path: heartbeat.transport_heartbeat_path,
    execution_id: execution.execution_id,
    guided_execution_path: execution.guided_execution_path
  });

  const contract = recordPiCodexLifecycleOperatorServiceTransportContract(projectRoot, {
    ...input.transport_contract,
    project_id: projectId,
    actor: automaticRealPiStepActor(
      actor,
      "operator_service_transport_contract",
      input.transport_contract.actor
    ),
    terminal_review_id: review.review_id,
    terminal_review_path: review.review_path
  });

  const body: PiCodexLifecycleAutomaticRealPiExecutionBody = {
    schema_version: "comath.pi_codex_lifecycle_automatic_real_pi_execution.v1",
    orchestration_id: orchestrationId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    orchestration_status: "automatic_real_pi_checkpoint_chain_recorded",
    orchestration_path: orchestrationPath,
    checkpoint_order: [...automaticRealPiExecutionCheckpointOrder],
    real_pi_runtime_probe_id: runtimeProbe.probe_id,
    pi_host_label: runtimeProbe.pi_host_label,
    pi_install_transcript_path: runtimeProbe.pi_install_transcript_path,
    pi_install_artifact: runtimeProbe.pi_install_artifact,
    runtime_registration_snapshot_path: runtimeProbe.runtime_registration_snapshot_path,
    runtime_registration_artifact: runtimeProbe.runtime_registration_artifact,
    session_id: session.session_id,
    session_manifest_path: session.session_manifest_path,
    session_manifest_artifact: session.session_manifest_artifact,
    transport_recovery_id: recovery.transport_recovery_id,
    transport_recovery_path: recovery.transport_recovery_path,
    transport_recovery_artifact: recovery.transport_recovery_artifact,
    transport_lease_id: lease.transport_lease_id,
    transport_lease_path: lease.transport_lease_path,
    transport_lease_artifact: lease.transport_lease_artifact,
    transport_heartbeat_id: heartbeat.transport_heartbeat_id,
    transport_heartbeat_path: heartbeat.transport_heartbeat_path,
    transport_heartbeat_artifact: heartbeat.transport_heartbeat_artifact,
    execution_id: execution.execution_id,
    guided_execution_path: execution.guided_execution_path,
    guided_execution_artifact: execution.guided_execution_artifact,
    terminal_review_id: review.review_id,
    terminal_review_path: review.review_path,
    terminal_review_artifact: contract.terminal_review_artifact,
    transport_contract_id: contract.transport_contract_id,
    transport_contract_path: contract.transport_contract_path,
    transport_contract_artifact: contract.transport_contract_artifact,
    agent_run_id: contract.agent_run_id,
    service_route: contract.service_route,
    service_transport_primitive: contract.service_transport_primitive,
    client_transport_primitive: contract.client_transport_primitive,
    runtime_probe_bound: true,
    operator_session_bound: true,
    transport_recovery_bound: true,
    transport_lease_bound: true,
    transport_heartbeat_bound: true,
    guided_execution_bound: true,
    terminal_review_bound: true,
    transport_contract_bound: true,
    service_owned_checkpoint_chain_completed: true,
    automatic_real_pi_orchestration_completed: true,
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
  mkdirSync(dirname(absoluteOrchestrationPath), { recursive: true });
  writeFileSync(absoluteOrchestrationPath, artifactText, "utf8");
  const result: PiCodexLifecycleAutomaticRealPiExecution = {
    ...body,
    orchestration_artifact: {
      kind: "automatic_real_pi_execution_orchestration",
      path: orchestrationPath,
      sha256: sha256Text(artifactText),
      size_bytes: Buffer.byteLength(artifactText, "utf8")
    }
  };
  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.pi_codex_lifecycle_automatic_real_pi_execution_recorded",
    actor,
    target_id: projectId,
    payload: {
      orchestration_id: orchestrationId,
      orchestration_status: result.orchestration_status,
      orchestration_path: orchestrationPath,
      real_pi_runtime_probe_id: runtimeProbe.probe_id,
      session_id: session.session_id,
      transport_recovery_id: recovery.transport_recovery_id,
      transport_lease_id: lease.transport_lease_id,
      transport_heartbeat_id: heartbeat.transport_heartbeat_id,
      execution_id: execution.execution_id,
      terminal_review_id: review.review_id,
      transport_contract_id: contract.transport_contract_id,
      agent_run_id: contract.agent_run_id,
      service_route: contract.service_route,
      service_transport_primitive: contract.service_transport_primitive,
      client_transport_primitive: contract.client_transport_primitive,
      terminal_review_artifact_sha256: contract.terminal_review_artifact.sha256,
      transport_contract_artifact_sha256: contract.transport_contract_artifact.sha256,
      service_owned_checkpoint_chain_completed: true,
      automatic_real_pi_orchestration_completed: true,
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

function assertUnattendedHandoffReviewBinding(condition: boolean, message: string): void {
  if (!condition) {
    throw new ComathError(message, {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_HANDOFF_REVIEW_CHECKPOINT_STALE"
    });
  }
}

const preparedCheckpointPublicPathPattern =
  /^service-owned-pi-lifecycle\/([A-Za-z0-9_.:-]+)\/([A-Za-z0-9_.:-]+\.json)$/u;

function assertPreparedCheckpointPublicAlias(input: {
  checkpointId: PiCodexUnattendedRealHostHandoffCheckpointId;
  publicPath: string;
  expectedId: string;
  expectedFile: string;
}): string {
  const raw = typeof input.publicPath === "string" ? input.publicPath.trim() : "";
  const sanitized = sanitizeOperatorTransportText(raw).trim();
  const match = preparedCheckpointPublicPathPattern.exec(sanitized);
  if (sanitized !== raw || !match || match[1] !== input.expectedId || match[2] !== input.expectedFile) {
    throw new ComathError("Pi/Codex unattended handoff review prepared checkpoint alias is invalid", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_HANDOFF_REVIEW_CHECKPOINT_ALIAS_INVALID"
    });
  }
  return sanitized;
}

function assertPreparedCheckpointSha256(value: string): string {
  const sha256 = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-f0-9]{64}$/u.test(sha256)) {
    throw new ComathError("Pi/Codex unattended handoff review prepared checkpoint hash is invalid", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_HANDOFF_REVIEW_CHECKPOINT_STALE"
    });
  }
  return sha256;
}

function preparedHandoffCheckpoint(input: {
  checkpointId: PiCodexUnattendedRealHostHandoffCheckpointId;
  publicPath: string;
  expectedId: string;
  expectedFile: string;
  canonicalPath: string;
  expectedSha256: string;
  actualSha256: string;
  sizeBytes: number;
}): PiCodexUnattendedRealHostHandoffPreparedCheckpoint {
  const publicPath = assertPreparedCheckpointPublicAlias({
    checkpointId: input.checkpointId,
    publicPath: input.publicPath,
    expectedId: input.expectedId,
    expectedFile: input.expectedFile
  });
  const expectedSha256 = assertPreparedCheckpointSha256(input.expectedSha256);
  if (expectedSha256 !== input.actualSha256) {
    throw new ComathError("Pi/Codex unattended handoff review prepared checkpoint hash is stale", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_HANDOFF_REVIEW_CHECKPOINT_STALE"
    });
  }
  return {
    checkpoint_id: input.checkpointId,
    public_path: publicPath,
    canonical_path: input.canonicalPath,
    sha256: input.actualSha256,
    size_bytes: input.sizeBytes,
    current: true,
    proof_authority: "none",
    can_certify_ga: false
  };
}

function assertAutomaticRealPiExecutionOrchestrationBoundary(
  orchestration: PiCodexLifecycleAutomaticRealPiExecutionBody
): void {
  if (
    orchestration.orchestration_status !== "automatic_real_pi_checkpoint_chain_recorded" ||
    !Array.isArray(orchestration.checkpoint_order) ||
    orchestration.checkpoint_order.length !== automaticRealPiExecutionCheckpointOrder.length ||
    automaticRealPiExecutionCheckpointOrder.some((step, index) => orchestration.checkpoint_order[index] !== step) ||
    orchestration.runtime_probe_bound !== true ||
    orchestration.operator_session_bound !== true ||
    orchestration.transport_recovery_bound !== true ||
    orchestration.transport_lease_bound !== true ||
    orchestration.transport_heartbeat_bound !== true ||
    orchestration.guided_execution_bound !== true ||
    orchestration.terminal_review_bound !== true ||
    orchestration.transport_contract_bound !== true ||
    orchestration.service_owned_checkpoint_chain_completed !== true ||
    orchestration.automatic_real_pi_orchestration_completed !== true ||
    orchestration.durable_transport_provided !== false ||
    orchestration.live_transport_open !== false ||
    orchestration.indefinite_stream_open !== false ||
    orchestration.long_lived_websocket_provided !== false ||
    orchestration.long_lived_sse_provided !== false ||
    orchestration.pi_direct_write_allowed !== false ||
    orchestration.direct_trusted_state_mutation !== false ||
    orchestration.proof_authority !== "none" ||
    orchestration.can_promote_claim !== false ||
    orchestration.can_certify_ga !== false
  ) {
    throw new ComathError("Pi/Codex unattended handoff review orchestration violates boundaries", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_HANDOFF_REVIEW_CHECKPOINT_STALE"
    });
  }
}

function readAutomaticRealPiExecutionOrchestrationArtifact(
  projectRoot: string,
  projectId: string,
  orchestrationId: string,
  orchestrationPath: string,
  expectedSha256: string
): {
  orchestration: PiCodexLifecycleAutomaticRealPiExecutionBody;
  artifact: PiCodexLifecycleAutomaticRealPiExecutionArtifact;
} {
  const absolutePath = assertPathAllowed(projectRoot, orchestrationPath, {
    purpose: "read",
    resolveRealpath: true
  });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new ComathError("Pi/Codex unattended handoff review requires automatic orchestration evidence", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_HANDOFF_REVIEW_CHECKPOINT_STALE"
    });
  }
  const content = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(content);
  if (assertPreparedCheckpointSha256(expectedSha256) !== actualSha256) {
    throw new ComathError("Pi/Codex unattended handoff review automatic orchestration hash is stale", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_HANDOFF_REVIEW_CHECKPOINT_STALE"
    });
  }
  let parsed: PiCodexLifecycleAutomaticRealPiExecutionBody;
  try {
    parsed = JSON.parse(content.toString("utf8")) as PiCodexLifecycleAutomaticRealPiExecutionBody;
  } catch {
    throw new ComathError("Pi/Codex unattended handoff review automatic orchestration JSON is invalid", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_HANDOFF_REVIEW_CHECKPOINT_STALE"
    });
  }
  if (
    parsed.schema_version !== "comath.pi_codex_lifecycle_automatic_real_pi_execution.v1" ||
    parsed.project_id !== projectId ||
    parsed.orchestration_id !== orchestrationId ||
    parsed.orchestration_path !== orchestrationPath
  ) {
    throw new ComathError("Pi/Codex unattended handoff review automatic orchestration does not bind the request", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_HANDOFF_REVIEW_CHECKPOINT_STALE"
    });
  }
  assertAutomaticRealPiExecutionOrchestrationBoundary(parsed);
  return {
    orchestration: parsed,
    artifact: {
      kind: "automatic_real_pi_execution_orchestration",
      path: orchestrationPath,
      sha256: actualSha256,
      size_bytes: content.byteLength
    }
  };
}

function assertOperatorServiceTransportContinuityBoundary(
  continuity: PiCodexOperatorServiceTransportContinuityBody
): void {
  const parsedLogSessionRoute =
    typeof continuity.service_route === "string" ? parseAgentRunLogSessionRoute(continuity.service_route) : null;
  if (
    continuity.continuity_status !== "maintained_bounded_transport_continuity_recorded" ||
    continuity.maintained_transport_primitive_bound !== true ||
    continuity.service_route_bound !== true ||
    continuity.client_fetch_contract_bound !== true ||
    continuity.transport_contract_bound !== true ||
    continuity.durable_resume_checkpoint_recorded !== true ||
    continuity.service_transport_primitive !== "node_http_agent_run_log_session_route" ||
    continuity.client_transport_primitive !== "pi_fetch_get_text" ||
    continuity.http_method !== "GET" ||
    continuity.content_type !== "text/event-stream; charset=utf-8" ||
    parsedLogSessionRoute === null ||
    parsedLogSessionRoute.route !== continuity.service_route ||
    parsedLogSessionRoute.runId !== continuity.agent_run_id ||
    !isAgentRunLogCursor(continuity.previous_cursor) ||
    !isAgentRunLogCursor(continuity.log_session_next_cursor) ||
    !/^[a-f0-9]{64}$/u.test(continuity.previous_log_session_body_sha256) ||
    !/^[a-f0-9]{64}$/u.test(continuity.log_session_body_sha256) ||
    !Number.isSafeInteger(continuity.log_session_event_count) ||
    continuity.log_session_event_count < 0 ||
    continuity.durable_transport_provided !== false ||
    continuity.live_transport_open !== false ||
    continuity.indefinite_stream_open !== false ||
    continuity.long_lived_websocket_provided !== false ||
    continuity.long_lived_sse_provided !== false ||
    continuity.pi_direct_write_allowed !== false ||
    continuity.direct_trusted_state_mutation !== false ||
    continuity.proof_authority !== "none" ||
    continuity.can_promote_claim !== false ||
    continuity.can_certify_ga !== false
  ) {
    throw new ComathError("Pi/Codex unattended handoff review continuity violates boundaries", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_HANDOFF_REVIEW_CHECKPOINT_STALE"
    });
  }
}

function readOperatorServiceTransportContinuityArtifact(
  projectRoot: string,
  projectId: string,
  continuityId: string,
  continuityPath: string,
  expectedSha256: string
): {
  continuity: PiCodexOperatorServiceTransportContinuityBody;
  artifact: PiCodexOperatorServiceTransportContinuityArtifact;
} {
  const absolutePath = assertPathAllowed(projectRoot, continuityPath, {
    purpose: "read",
    resolveRealpath: true
  });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new ComathError("Pi/Codex unattended handoff review requires transport continuity evidence", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_HANDOFF_REVIEW_CHECKPOINT_STALE"
    });
  }
  const content = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(content);
  if (assertPreparedCheckpointSha256(expectedSha256) !== actualSha256) {
    throw new ComathError("Pi/Codex unattended handoff review transport continuity hash is stale", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_HANDOFF_REVIEW_CHECKPOINT_STALE"
    });
  }
  let parsed: PiCodexOperatorServiceTransportContinuityBody;
  try {
    parsed = JSON.parse(content.toString("utf8")) as PiCodexOperatorServiceTransportContinuityBody;
  } catch {
    throw new ComathError("Pi/Codex unattended handoff review transport continuity JSON is invalid", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_HANDOFF_REVIEW_CHECKPOINT_STALE"
    });
  }
  if (
    parsed.schema_version !== "comath.pi_codex_operator_service_transport_continuity.v1" ||
    parsed.project_id !== projectId ||
    parsed.continuity_id !== continuityId ||
    parsed.continuity_path !== continuityPath
  ) {
    throw new ComathError("Pi/Codex unattended handoff review transport continuity does not bind the request", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_HANDOFF_REVIEW_CHECKPOINT_STALE"
    });
  }
  assertOperatorServiceTransportContinuityBoundary(parsed);
  return {
    continuity: parsed,
    artifact: {
      kind: "operator_service_transport_continuity",
      path: continuityPath,
      sha256: actualSha256,
      size_bytes: content.byteLength
    }
  };
}

export function reviewPiCodexLifecycleUnattendedRealHostHandoff(
  projectRoot: string,
  input: PiCodexUnattendedRealHostHandoffReviewInput
): PiCodexUnattendedRealHostHandoffReview {
  const projectId = assertOperatorSessionProjectId(input.project_id);
  const handoffReviewId = assertReviewId(input.handoff_review_id);
  const realPiRuntimeProbeId = assertRealPiRuntimeProbeId(input.real_pi_runtime_probe_id);
  const sessionId = assertOperatorSessionId(input.session_id);
  const recoveryId = assertOperatorTransportRecoveryId(input.transport_recovery_id);
  const leaseId = assertOperatorTransportLeaseId(input.transport_lease_id);
  const heartbeatId = assertOperatorTransportHeartbeatId(input.transport_heartbeat_id);
  const executionId = assertGuidedRealPiExecutionId(input.execution_id);
  const terminalReviewId = assertReviewId(input.terminal_review_id);
  const contractId = assertOperatorServiceTransportContractId(input.transport_contract_id);
  const orchestrationId = assertAutomaticRealPiExecutionOrchestrationId(input.automatic_orchestration_id);
  const continuityId = assertOperatorServiceTransportContinuityId(input.transport_continuity_id);

  const reviewPath = unattendedRealHostHandoffReviewPath(handoffReviewId);
  const absoluteReviewPath = assertPathAllowed(projectRoot, reviewPath, { purpose: "runtime-write" });
  if (existsSync(absoluteReviewPath)) {
    throw new ComathError("Pi/Codex unattended real-host handoff review already exists", {
      statusCode: 409,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_HANDOFF_REVIEW_ALREADY_EXISTS"
    });
  }

  const runtimeRegistrationPath = realPiRuntimeRegistrationSnapshotPath(realPiRuntimeProbeId);
  const { artifact: runtimeRegistrationArtifact, piHostLabel } = readGuidedRealPiRuntimeRegistrationSnapshot(
    projectRoot,
    projectId,
    realPiRuntimeProbeId,
    runtimeRegistrationPath
  );
  const sessionManifestPath = operatorSessionManifestPath(sessionId);
  const { manifest, artifact: sessionManifestArtifact } = readOperatorTransportSessionManifest(
    projectRoot,
    projectId,
    sessionId,
    sessionManifestPath
  );
  const recoveryPath = operatorTransportRecoveryPath(recoveryId);
  const { recovery, artifact: transportRecoveryArtifact } = readOperatorTransportRecoveryCheckpoint(
    projectRoot,
    projectId,
    sessionId,
    recoveryId,
    recoveryPath
  );
  const leasePath = operatorTransportLeasePath(leaseId);
  const { lease, artifact: transportLeaseArtifact } = readOperatorTransportLeaseArtifact(
    projectRoot,
    projectId,
    sessionId,
    recoveryId,
    leaseId,
    leasePath,
    { allowLiveLogGrowth: true }
  );
  const heartbeatPath = operatorTransportHeartbeatPath(heartbeatId);
  const { heartbeat, artifact: transportHeartbeatArtifact } = readOperatorTransportHeartbeatArtifact(
    projectRoot,
    projectId,
    sessionId,
    recoveryId,
    leaseId,
    heartbeatId,
    heartbeatPath
  );
  const guidedExecutionPath = guidedRealPiExecutionPath(executionId);
  const { execution, artifact: guidedExecutionArtifact } = readGuidedRealPiExecutionArtifact(
    projectRoot,
    projectId,
    realPiRuntimeProbeId,
    sessionId,
    recoveryId,
    leaseId,
    executionId,
    guidedExecutionPath
  );
  const terminalReviewPath = terminalExecutionReviewPath(terminalReviewId);
  const { review: terminalReview, artifact: terminalReviewArtifact } = readGuidedExecutionTerminalChainReviewArtifact(
    projectRoot,
    projectId,
    terminalReviewId,
    terminalReviewPath
  );
  const transportContractPath = operatorServiceTransportContractPath(contractId);
  const { contract, artifact: transportContractArtifact } = readOperatorServiceTransportContractArtifact(
    projectRoot,
    projectId,
    contractId,
    transportContractPath,
    input.transport_contract_sha256
  );
  const orchestrationPath = automaticRealPiExecutionOrchestrationPath(orchestrationId);
  const { orchestration, artifact: automaticOrchestrationArtifact } = readAutomaticRealPiExecutionOrchestrationArtifact(
    projectRoot,
    projectId,
    orchestrationId,
    orchestrationPath,
    input.automatic_orchestration_sha256
  );
  const continuityPath = operatorServiceTransportContinuityPath(continuityId);
  const { continuity, artifact: transportContinuityArtifact } = readOperatorServiceTransportContinuityArtifact(
    projectRoot,
    projectId,
    continuityId,
    continuityPath,
    input.transport_continuity_sha256
  );

  assertUnattendedHandoffReviewBinding(
    manifest.pi_host_label === piHostLabel,
    "Pi/Codex unattended handoff review session host binding does not match runtime probe"
  );
  assertUnattendedHandoffReviewBinding(
    recovery.session_manifest_path === sessionManifestPath &&
      recovery.session_manifest_artifact.sha256 === sessionManifestArtifact.sha256,
    "Pi/Codex unattended handoff review recovery is not current"
  );
  assertUnattendedHandoffReviewBinding(
    lease.session_manifest_path === sessionManifestPath &&
      lease.session_manifest_artifact.sha256 === sessionManifestArtifact.sha256 &&
      lease.transport_recovery_path === recoveryPath &&
      lease.transport_recovery_artifact.sha256 === transportRecoveryArtifact.sha256,
    "Pi/Codex unattended handoff review lease is not current"
  );
  assertUnattendedHandoffReviewBinding(
    heartbeat.session_manifest_path === sessionManifestPath &&
      heartbeat.session_manifest_artifact.sha256 === sessionManifestArtifact.sha256 &&
      heartbeat.transport_recovery_path === recoveryPath &&
      heartbeat.transport_recovery_artifact.sha256 === transportRecoveryArtifact.sha256 &&
      heartbeat.transport_lease_path === leasePath &&
      heartbeat.lease_artifact.sha256 === transportLeaseArtifact.sha256,
    "Pi/Codex unattended handoff review heartbeat is not current"
  );
  assertUnattendedHandoffReviewBinding(
    execution.runtime_registration_artifact.sha256 === runtimeRegistrationArtifact.sha256 &&
      execution.session_manifest_artifact.sha256 === sessionManifestArtifact.sha256 &&
      execution.transport_recovery_artifact.sha256 === transportRecoveryArtifact.sha256 &&
      execution.transport_lease_artifact.sha256 === transportLeaseArtifact.sha256,
    "Pi/Codex unattended handoff review guided execution is not current"
  );
  assertUnattendedHandoffReviewBinding(
    terminalReview.runtime_registration_artifact.sha256 === runtimeRegistrationArtifact.sha256 &&
      terminalReview.session_manifest_artifact.sha256 === sessionManifestArtifact.sha256 &&
      terminalReview.transport_recovery_artifact.sha256 === transportRecoveryArtifact.sha256 &&
      terminalReview.transport_lease_artifact.sha256 === transportLeaseArtifact.sha256 &&
      terminalReview.transport_heartbeat_artifact.sha256 === transportHeartbeatArtifact.sha256 &&
      terminalReview.guided_execution_artifact.sha256 === guidedExecutionArtifact.sha256,
    "Pi/Codex unattended handoff review terminal chain review is not current"
  );
  assertUnattendedHandoffReviewBinding(
    contract.terminal_review_artifact.sha256 === terminalReviewArtifact.sha256 &&
      contract.transport_heartbeat_artifact.sha256 === transportHeartbeatArtifact.sha256 &&
      contract.guided_execution_artifact.sha256 === guidedExecutionArtifact.sha256,
    "Pi/Codex unattended handoff review transport contract is not current"
  );
  assertUnattendedHandoffReviewBinding(
    orchestration.runtime_registration_artifact.sha256 === runtimeRegistrationArtifact.sha256 &&
      orchestration.session_manifest_artifact.sha256 === sessionManifestArtifact.sha256 &&
      orchestration.transport_recovery_artifact.sha256 === transportRecoveryArtifact.sha256 &&
      orchestration.transport_lease_artifact.sha256 === transportLeaseArtifact.sha256 &&
      orchestration.transport_heartbeat_artifact.sha256 === transportHeartbeatArtifact.sha256 &&
      orchestration.guided_execution_artifact.sha256 === guidedExecutionArtifact.sha256 &&
      orchestration.terminal_review_artifact.sha256 === terminalReviewArtifact.sha256 &&
      orchestration.transport_contract_artifact.sha256 === transportContractArtifact.sha256,
    "Pi/Codex unattended handoff review automatic orchestration is not current"
  );
  assertUnattendedHandoffReviewBinding(
    continuity.transport_contract_id === contractId &&
      continuity.transport_contract_path === transportContractPath &&
      continuity.transport_contract_artifact.sha256 === transportContractArtifact.sha256 &&
      continuity.service_route === contract.service_route &&
      continuity.agent_run_id === contract.agent_run_id &&
      agentRunLogCursorEqual(continuity.previous_cursor, contract.log_session_next_cursor) &&
      continuity.previous_log_session_body_sha256 === contract.log_session_body_sha256,
    "Pi/Codex unattended handoff review continuity checkpoint is not current"
  );

  const preparedCheckpoints: PiCodexUnattendedRealHostHandoffPreparedCheckpoint[] = [
    preparedHandoffCheckpoint({
      checkpointId: "runtime_probe",
      publicPath: input.runtime_probe_path,
      expectedId: realPiRuntimeProbeId,
      expectedFile: "real-pi-runtime-probe.json",
      canonicalPath: runtimeRegistrationPath,
      expectedSha256: input.runtime_probe_sha256,
      actualSha256: runtimeRegistrationArtifact.sha256,
      sizeBytes: runtimeRegistrationArtifact.size_bytes
    }),
    preparedHandoffCheckpoint({
      checkpointId: "operator_session",
      publicPath: input.operator_session_path,
      expectedId: sessionId,
      expectedFile: "operator-session-manifest.json",
      canonicalPath: sessionManifestPath,
      expectedSha256: input.operator_session_sha256,
      actualSha256: sessionManifestArtifact.sha256,
      sizeBytes: sessionManifestArtifact.size_bytes
    }),
    preparedHandoffCheckpoint({
      checkpointId: "transport_recovery",
      publicPath: input.transport_recovery_path,
      expectedId: recoveryId,
      expectedFile: "operator-transport-recovery.json",
      canonicalPath: recoveryPath,
      expectedSha256: input.transport_recovery_sha256,
      actualSha256: transportRecoveryArtifact.sha256,
      sizeBytes: transportRecoveryArtifact.size_bytes
    }),
    preparedHandoffCheckpoint({
      checkpointId: "transport_lease",
      publicPath: input.transport_lease_path,
      expectedId: leaseId,
      expectedFile: "operator-transport-lease.json",
      canonicalPath: leasePath,
      expectedSha256: input.transport_lease_sha256,
      actualSha256: transportLeaseArtifact.sha256,
      sizeBytes: transportLeaseArtifact.size_bytes
    }),
    preparedHandoffCheckpoint({
      checkpointId: "transport_heartbeat",
      publicPath: input.transport_heartbeat_path,
      expectedId: heartbeatId,
      expectedFile: "operator-transport-heartbeat.json",
      canonicalPath: heartbeatPath,
      expectedSha256: input.transport_heartbeat_sha256,
      actualSha256: transportHeartbeatArtifact.sha256,
      sizeBytes: transportHeartbeatArtifact.size_bytes
    }),
    preparedHandoffCheckpoint({
      checkpointId: "guided_execution",
      publicPath: input.guided_execution_path,
      expectedId: executionId,
      expectedFile: "guided-real-pi-execution.json",
      canonicalPath: guidedExecutionPath,
      expectedSha256: input.guided_execution_sha256,
      actualSha256: guidedExecutionArtifact.sha256,
      sizeBytes: guidedExecutionArtifact.size_bytes
    }),
    preparedHandoffCheckpoint({
      checkpointId: "terminal_review",
      publicPath: input.terminal_review_path,
      expectedId: terminalReviewId,
      expectedFile: "terminal-execution-review.json",
      canonicalPath: terminalReviewPath,
      expectedSha256: input.terminal_review_sha256,
      actualSha256: terminalReviewArtifact.sha256,
      sizeBytes: terminalReviewArtifact.size_bytes
    }),
    preparedHandoffCheckpoint({
      checkpointId: "transport_contract",
      publicPath: input.transport_contract_path,
      expectedId: contractId,
      expectedFile: "operator-service-transport-contract.json",
      canonicalPath: transportContractPath,
      expectedSha256: input.transport_contract_sha256,
      actualSha256: transportContractArtifact.sha256,
      sizeBytes: transportContractArtifact.size_bytes
    }),
    preparedHandoffCheckpoint({
      checkpointId: "automatic_orchestration",
      publicPath: input.automatic_orchestration_path,
      expectedId: orchestrationId,
      expectedFile: "automatic-real-pi-execution.json",
      canonicalPath: orchestrationPath,
      expectedSha256: input.automatic_orchestration_sha256,
      actualSha256: automaticOrchestrationArtifact.sha256,
      sizeBytes: automaticOrchestrationArtifact.size_bytes
    }),
    preparedHandoffCheckpoint({
      checkpointId: "transport_continuity",
      publicPath: input.transport_continuity_path,
      expectedId: continuityId,
      expectedFile: "operator-service-transport-continuity.json",
      canonicalPath: continuityPath,
      expectedSha256: input.transport_continuity_sha256,
      actualSha256: transportContinuityArtifact.sha256,
      sizeBytes: transportContinuityArtifact.size_bytes
    })
  ];

  const body: PiCodexUnattendedRealHostHandoffReviewBody = {
    schema_version: "comath.pi_codex_unattended_real_host_handoff_review.v1",
    handoff_review_id: handoffReviewId,
    project_id: projectId,
    actor: sanitizeOperatorTransportText(input.actor),
    created_at: new Date().toISOString(),
    review_status: "prepared_unattended_real_host_handoff_review_recorded",
    handoff_review_path: reviewPath,
    prepared_checkpoint_order: [...unattendedRealHostHandoffCheckpointOrder],
    prepared_checkpoints: preparedCheckpoints,
    real_pi_runtime_probe_id: realPiRuntimeProbeId,
    pi_host_label: piHostLabel,
    session_id: sessionId,
    transport_recovery_id: recoveryId,
    transport_lease_id: leaseId,
    transport_heartbeat_id: heartbeatId,
    execution_id: executionId,
    terminal_review_id: terminalReviewId,
    transport_contract_id: contractId,
    automatic_orchestration_id: orchestrationId,
    transport_continuity_id: continuityId,
    agent_run_id: contract.agent_run_id,
    service_route: contract.service_route,
    service_transport_primitive: contract.service_transport_primitive,
    client_transport_primitive: contract.client_transport_primitive,
    prepared_checkpoint_hashes_current: true,
    service_owned_checkpoint_chain_reviewed: true,
    review_manifest_persisted: true,
    operator_approved: false,
    handoff_can_execute: false,
    unattended_execution_authorized: false,
    unattended_real_host_execution_completed: false,
    operator_confirmation_bypassed: false,
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
  mkdirSync(dirname(absoluteReviewPath), { recursive: true });
  writeFileSync(absoluteReviewPath, artifactText, "utf8");
  const result: PiCodexUnattendedRealHostHandoffReview = {
    ...body,
    handoff_review_artifact: {
      kind: "unattended_real_host_handoff_review",
      path: reviewPath,
      sha256: sha256Text(artifactText),
      size_bytes: Buffer.byteLength(artifactText, "utf8")
    }
  };
  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.pi_codex_unattended_real_host_handoff_reviewed",
    actor: sanitizeOperatorTransportText(input.actor),
    target_id: projectId,
    payload: {
      handoff_review_id: handoffReviewId,
      review_status: result.review_status,
      handoff_review_path: reviewPath,
      handoff_review_artifact_sha256: result.handoff_review_artifact.sha256,
      handoff_review_artifact_size_bytes: result.handoff_review_artifact.size_bytes,
      real_pi_runtime_probe_id: realPiRuntimeProbeId,
      session_id: sessionId,
      transport_recovery_id: recoveryId,
      transport_lease_id: leaseId,
      transport_heartbeat_id: heartbeatId,
      execution_id: executionId,
      terminal_review_id: terminalReviewId,
      transport_contract_id: contractId,
      automatic_orchestration_id: orchestrationId,
      transport_continuity_id: continuityId,
      agent_run_id: contract.agent_run_id,
      service_route: contract.service_route,
      prepared_checkpoint_hashes_current: true,
      service_owned_checkpoint_chain_reviewed: true,
      review_manifest_persisted: true,
      prepared_checkpoint_count: preparedCheckpoints.length,
      prepared_checkpoint_order: result.prepared_checkpoint_order,
      prepared_checkpoint_hashes: preparedCheckpoints.map((checkpoint) => ({
        checkpoint_id: checkpoint.checkpoint_id,
        canonical_path: checkpoint.canonical_path,
        sha256: checkpoint.sha256,
        size_bytes: checkpoint.size_bytes
      })),
      operator_approved: false,
      handoff_can_execute: false,
      unattended_execution_authorized: false,
      unattended_real_host_execution_completed: false,
      operator_confirmation_bypassed: false,
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

function assertUnattendedExecutionReadinessHandoffReviewBoundary(
  projectRoot: string,
  review: PiCodexUnattendedRealHostHandoffReviewBody
): void {
  const parsedLogSessionRoute =
    typeof review.service_route === "string" ? parseAgentRunLogSessionRoute(review.service_route) : null;
  if (
    review.schema_version !== "comath.pi_codex_unattended_real_host_handoff_review.v1" ||
    review.review_status !== "prepared_unattended_real_host_handoff_review_recorded" ||
    !Array.isArray(review.prepared_checkpoint_order) ||
    review.prepared_checkpoint_order.length !== unattendedRealHostHandoffCheckpointOrder.length ||
    unattendedRealHostHandoffCheckpointOrder.some((step, index) => review.prepared_checkpoint_order[index] !== step) ||
    !Array.isArray(review.prepared_checkpoints) ||
    review.prepared_checkpoints.length !== unattendedRealHostHandoffCheckpointOrder.length ||
    !unattendedRealHostHandoffReviewIdsAreValid(review) ||
    !unattendedRealHostHandoffCheckpointEntriesAreValid(projectRoot, review) ||
    review.service_transport_primitive !== "node_http_agent_run_log_session_route" ||
    review.client_transport_primitive !== "pi_fetch_get_text" ||
    parsedLogSessionRoute === null ||
    parsedLogSessionRoute.route !== review.service_route ||
    parsedLogSessionRoute.runId !== review.agent_run_id ||
    review.prepared_checkpoint_hashes_current !== true ||
    review.service_owned_checkpoint_chain_reviewed !== true ||
    review.review_manifest_persisted !== true ||
    review.operator_approved !== false ||
    review.handoff_can_execute !== false ||
    review.unattended_execution_authorized !== false ||
    review.unattended_real_host_execution_completed !== false ||
    review.operator_confirmation_bypassed !== false ||
    review.durable_transport_provided !== false ||
    review.live_transport_open !== false ||
    review.indefinite_stream_open !== false ||
    review.long_lived_websocket_provided !== false ||
    review.long_lived_sse_provided !== false ||
    review.pi_direct_write_allowed !== false ||
    review.direct_trusted_state_mutation !== false ||
    review.proof_authority !== "none" ||
    review.can_promote_claim !== false ||
    review.can_certify_ga !== false
  ) {
    throw new ComathError("Pi/Codex unattended real-host execution readiness handoff review violates boundaries", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_HANDOFF_REVIEW_INVALID"
    });
  }
}

function safeLifecyclePathSegment(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[A-Za-z0-9._-]+$/u.test(value) &&
    value !== "." &&
    value !== ".." &&
    !value.split(".").some((segment) => segment.length === 0)
  );
}

function unattendedRealHostHandoffReviewIdsAreValid(review: PiCodexUnattendedRealHostHandoffReviewBody): boolean {
  try {
    assertRealPiRuntimeProbeId(review.real_pi_runtime_probe_id);
    assertOperatorSessionId(review.session_id);
    assertOperatorTransportRecoveryId(review.transport_recovery_id);
    assertOperatorTransportLeaseId(review.transport_lease_id);
    assertOperatorTransportHeartbeatId(review.transport_heartbeat_id);
    assertGuidedRealPiExecutionId(review.execution_id);
    assertReviewId(review.terminal_review_id);
    assertOperatorServiceTransportContractId(review.transport_contract_id);
    assertAutomaticRealPiExecutionOrchestrationId(review.automatic_orchestration_id);
    assertOperatorServiceTransportContinuityId(review.transport_continuity_id);
    return safeLifecyclePathSegment(review.agent_run_id);
  } catch {
    return false;
  }
}

function unattendedRealHostHandoffCheckpointEntriesAreValid(
  projectRoot: string,
  review: PiCodexUnattendedRealHostHandoffReviewBody
): boolean {
  const expected = [
    {
      checkpoint_id: "runtime_probe",
      public_id: review.real_pi_runtime_probe_id,
      public_file: "real-pi-runtime-probe.json",
      canonical_path: realPiRuntimeRegistrationSnapshotPath(review.real_pi_runtime_probe_id)
    },
    {
      checkpoint_id: "operator_session",
      public_id: review.session_id,
      public_file: "operator-session-manifest.json",
      canonical_path: operatorSessionManifestPath(review.session_id)
    },
    {
      checkpoint_id: "transport_recovery",
      public_id: review.transport_recovery_id,
      public_file: "operator-transport-recovery.json",
      canonical_path: operatorTransportRecoveryPath(review.transport_recovery_id)
    },
    {
      checkpoint_id: "transport_lease",
      public_id: review.transport_lease_id,
      public_file: "operator-transport-lease.json",
      canonical_path: operatorTransportLeasePath(review.transport_lease_id)
    },
    {
      checkpoint_id: "transport_heartbeat",
      public_id: review.transport_heartbeat_id,
      public_file: "operator-transport-heartbeat.json",
      canonical_path: operatorTransportHeartbeatPath(review.transport_heartbeat_id)
    },
    {
      checkpoint_id: "guided_execution",
      public_id: review.execution_id,
      public_file: "guided-real-pi-execution.json",
      canonical_path: guidedRealPiExecutionPath(review.execution_id)
    },
    {
      checkpoint_id: "terminal_review",
      public_id: review.terminal_review_id,
      public_file: "terminal-execution-review.json",
      canonical_path: terminalExecutionReviewPath(review.terminal_review_id)
    },
    {
      checkpoint_id: "transport_contract",
      public_id: review.transport_contract_id,
      public_file: "operator-service-transport-contract.json",
      canonical_path: operatorServiceTransportContractPath(review.transport_contract_id)
    },
    {
      checkpoint_id: "automatic_orchestration",
      public_id: review.automatic_orchestration_id,
      public_file: "automatic-real-pi-execution.json",
      canonical_path: automaticRealPiExecutionOrchestrationPath(review.automatic_orchestration_id)
    },
    {
      checkpoint_id: "transport_continuity",
      public_id: review.transport_continuity_id,
      public_file: "operator-service-transport-continuity.json",
      canonical_path: operatorServiceTransportContinuityPath(review.transport_continuity_id)
    }
  ] as const;
  return expected.every((entry, index) => {
    const checkpoint = review.prepared_checkpoints[index];
    if (!safeLifecyclePathSegment(entry.public_id) || checkpoint === undefined) {
      return false;
    }
    const publicPath =
      typeof checkpoint.public_path === "string" ? sanitizeOperatorTransportText(checkpoint.public_path).trim() : "";
    const publicMatch = preparedCheckpointPublicPathPattern.exec(publicPath);
    let content: Buffer;
    try {
      const absolutePath = assertPathAllowed(projectRoot, entry.canonical_path, {
        purpose: "read",
        resolveRealpath: true
      });
      if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
        return false;
      }
      content = readFileSync(absolutePath);
    } catch {
      return false;
    }
    return (
      checkpoint.checkpoint_id === entry.checkpoint_id &&
      checkpoint.public_path === publicPath &&
      publicMatch !== null &&
      publicMatch[1] === entry.public_id &&
      publicMatch[2] === entry.public_file &&
      checkpoint.canonical_path === entry.canonical_path &&
      typeof checkpoint.sha256 === "string" &&
      /^[a-f0-9]{64}$/u.test(checkpoint.sha256) &&
      Number.isSafeInteger(checkpoint.size_bytes) &&
      checkpoint.size_bytes >= 0 &&
      checkpoint.sha256 === sha256Bytes(content) &&
      checkpoint.size_bytes === content.byteLength &&
      checkpoint.current === true &&
      checkpoint.proof_authority === "none" &&
      checkpoint.can_certify_ga === false
    );
  });
}

function readUnattendedRealHostHandoffReviewArtifact(
  projectRoot: string,
  projectId: string,
  reviewId: string,
  reviewPath: string,
  expectedSha256: string
): {
  review: PiCodexUnattendedRealHostHandoffReviewBody;
  artifact: PiCodexUnattendedRealHostHandoffReviewArtifact;
} {
  const canonicalReviewPath = unattendedRealHostHandoffReviewPath(reviewId);
  const normalizedReviewPath = projectRelativePath(
    projectRoot,
    assertPathAllowed(projectRoot, reviewPath, { purpose: "read", resolveRealpath: true })
  );
  if (normalizedReviewPath !== canonicalReviewPath) {
    throw new ComathError("Pi/Codex unattended real-host execution readiness handoff review path is not canonical", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_HANDOFF_REVIEW_INVALID"
    });
  }
  const absolutePath = assertPathAllowed(projectRoot, canonicalReviewPath, {
    purpose: "read",
    resolveRealpath: true
  });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new ComathError("Pi/Codex unattended real-host execution readiness requires handoff review evidence", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_HANDOFF_REVIEW_STALE"
    });
  }
  const content = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(content);
  if (assertPreparedCheckpointSha256(expectedSha256) !== actualSha256) {
    throw new ComathError("Pi/Codex unattended real-host execution readiness handoff review hash is stale", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_HANDOFF_REVIEW_STALE"
    });
  }
  let parsed: PiCodexUnattendedRealHostHandoffReviewBody;
  try {
    parsed = JSON.parse(content.toString("utf8")) as PiCodexUnattendedRealHostHandoffReviewBody;
  } catch {
    throw new ComathError("Pi/Codex unattended real-host execution readiness handoff review JSON is invalid", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_HANDOFF_REVIEW_INVALID"
    });
  }
  if (
    parsed.project_id !== projectId ||
    parsed.handoff_review_id !== reviewId ||
    parsed.handoff_review_path !== canonicalReviewPath
  ) {
    throw new ComathError("Pi/Codex unattended real-host execution readiness handoff review does not bind the request", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_HANDOFF_REVIEW_INVALID"
    });
  }
  assertUnattendedExecutionReadinessHandoffReviewBoundary(projectRoot, parsed);
  return {
    review: parsed,
    artifact: {
      kind: "unattended_real_host_handoff_review",
      path: canonicalReviewPath,
      sha256: actualSha256,
      size_bytes: content.byteLength
    }
  };
}

function assertUnattendedRealHostOperatorApprovalBoundary(
  approval: PiCodexUnattendedRealHostOperatorApprovalBody
): void {
  const parsedLogSessionRoute =
    typeof approval.service_route === "string" ? parseAgentRunLogSessionRoute(approval.service_route) : null;
  if (
    approval.schema_version !== "comath.pi_codex_unattended_real_host_operator_approval.v1" ||
    approval.approval_status !== "operator_approval_artifact_recorded" ||
    approval.operator_approval_mode !== "manual_operator_approval" ||
    approval.handoff_review_current !== true ||
    approval.service_owned_checkpoint_chain_reviewed !== true ||
    approval.approval_manifest_persisted !== true ||
    approval.operator_approval_artifact_current !== true ||
    approval.service_transport_primitive !== "node_http_agent_run_log_session_route" ||
    approval.client_transport_primitive !== "pi_fetch_get_text" ||
    parsedLogSessionRoute === null ||
    parsedLogSessionRoute.route !== approval.service_route ||
    parsedLogSessionRoute.runId !== approval.agent_run_id ||
    approval.operator_approved !== false ||
    approval.handoff_can_execute !== false ||
    approval.unattended_execution_authorized !== false ||
    approval.unattended_real_host_execution_completed !== false ||
    approval.operator_confirmation_bypassed !== false ||
    approval.durable_transport_provided !== false ||
    approval.live_transport_open !== false ||
    approval.indefinite_stream_open !== false ||
    approval.long_lived_websocket_provided !== false ||
    approval.long_lived_sse_provided !== false ||
    approval.pi_direct_write_allowed !== false ||
    approval.direct_trusted_state_mutation !== false ||
    approval.proof_authority !== "none" ||
    approval.can_promote_claim !== false ||
    approval.can_certify_ga !== false
  ) {
    throw new ComathError("Pi/Codex unattended real-host operator approval violates boundaries", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_OPERATOR_APPROVAL_INVALID"
    });
  }
}

function assertUnattendedRealHostOperatorApprovalMatchesReview(
  approval: PiCodexUnattendedRealHostOperatorApprovalBody,
  review: PiCodexUnattendedRealHostHandoffReviewBody,
  handoffReviewArtifact: PiCodexUnattendedRealHostHandoffReviewArtifact
): void {
  if (
    approval.handoff_review_id !== review.handoff_review_id ||
    approval.handoff_review_path !== review.handoff_review_path ||
    approval.handoff_review_artifact.path !== handoffReviewArtifact.path ||
    approval.handoff_review_artifact.sha256 !== handoffReviewArtifact.sha256 ||
    approval.handoff_review_artifact.size_bytes !== handoffReviewArtifact.size_bytes ||
    approval.real_pi_runtime_probe_id !== review.real_pi_runtime_probe_id ||
    approval.session_id !== review.session_id ||
    approval.transport_recovery_id !== review.transport_recovery_id ||
    approval.transport_lease_id !== review.transport_lease_id ||
    approval.transport_heartbeat_id !== review.transport_heartbeat_id ||
    approval.execution_id !== review.execution_id ||
    approval.terminal_review_id !== review.terminal_review_id ||
    approval.transport_contract_id !== review.transport_contract_id ||
    approval.automatic_orchestration_id !== review.automatic_orchestration_id ||
    approval.transport_continuity_id !== review.transport_continuity_id ||
    approval.agent_run_id !== review.agent_run_id ||
    approval.service_route !== review.service_route ||
    approval.service_transport_primitive !== review.service_transport_primitive ||
    approval.client_transport_primitive !== review.client_transport_primitive
  ) {
    throw new ComathError("Pi/Codex unattended real-host operator approval does not bind the handoff review", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_OPERATOR_APPROVAL_INVALID"
    });
  }
}

function readUnattendedRealHostOperatorApprovalArtifact(
  projectRoot: string,
  projectId: string,
  approvalId: string,
  approvalPath: string,
  expectedSha256: string,
  review: PiCodexUnattendedRealHostHandoffReviewBody,
  handoffReviewArtifact: PiCodexUnattendedRealHostHandoffReviewArtifact
): {
  approval: PiCodexUnattendedRealHostOperatorApprovalBody;
  artifact: PiCodexUnattendedRealHostOperatorApprovalArtifact;
} {
  const canonicalApprovalPath = unattendedRealHostOperatorApprovalPath(approvalId);
  const normalizedApprovalPath = projectRelativePath(
    projectRoot,
    assertPathAllowed(projectRoot, approvalPath, { purpose: "read", resolveRealpath: true })
  );
  if (normalizedApprovalPath !== canonicalApprovalPath) {
    throw new ComathError("Pi/Codex unattended real-host operator approval path is not canonical", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_OPERATOR_APPROVAL_INVALID"
    });
  }
  const absolutePath = assertPathAllowed(projectRoot, canonicalApprovalPath, {
    purpose: "read",
    resolveRealpath: true
  });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new ComathError("Pi/Codex unattended real-host execution readiness requires operator approval evidence", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_OPERATOR_APPROVAL_STALE"
    });
  }
  const content = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(content);
  if (assertPreparedCheckpointSha256(expectedSha256) !== actualSha256) {
    throw new ComathError("Pi/Codex unattended real-host operator approval hash is stale", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_OPERATOR_APPROVAL_STALE"
    });
  }
  let parsed: PiCodexUnattendedRealHostOperatorApprovalBody;
  try {
    parsed = JSON.parse(content.toString("utf8")) as PiCodexUnattendedRealHostOperatorApprovalBody;
  } catch {
    throw new ComathError("Pi/Codex unattended real-host operator approval JSON is invalid", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_OPERATOR_APPROVAL_INVALID"
    });
  }
  if (parsed.project_id !== projectId || parsed.approval_id !== approvalId || parsed.approval_path !== canonicalApprovalPath) {
    throw new ComathError("Pi/Codex unattended real-host operator approval does not bind the request", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_OPERATOR_APPROVAL_INVALID"
    });
  }
  assertUnattendedRealHostOperatorApprovalBoundary(parsed);
  assertUnattendedRealHostOperatorApprovalMatchesReview(parsed, review, handoffReviewArtifact);
  return {
    approval: parsed,
    artifact: {
      kind: "unattended_real_host_operator_approval",
      path: canonicalApprovalPath,
      sha256: actualSha256,
      size_bytes: content.byteLength
    }
  };
}

function readOptionalUnattendedRealHostOperatorApprovalArtifact(
  projectRoot: string,
  projectId: string,
  input: PiCodexUnattendedRealHostExecutionReadinessInput,
  review: PiCodexUnattendedRealHostHandoffReviewBody,
  handoffReviewArtifact: PiCodexUnattendedRealHostHandoffReviewArtifact
):
  | {
      approval: PiCodexUnattendedRealHostOperatorApprovalBody;
      artifact: PiCodexUnattendedRealHostOperatorApprovalArtifact;
    }
  | null {
  const approvalFields = [input.operator_approval_id, input.operator_approval_path, input.operator_approval_sha256];
  if (approvalFields.every((value) => value === undefined)) {
    return null;
  }
  if (approvalFields.some((value) => value === undefined)) {
    throw new ComathError("Pi/Codex unattended real-host execution readiness operator approval input is incomplete", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_OPERATOR_APPROVAL_INVALID"
    });
  }
  return readUnattendedRealHostOperatorApprovalArtifact(
    projectRoot,
    projectId,
    assertReviewId(input.operator_approval_id),
    input.operator_approval_path as string,
    input.operator_approval_sha256 as string,
    review,
    handoffReviewArtifact
  );
}

function assertUnattendedRealHostExecutorContractBoundary(
  contract: PiCodexUnattendedRealHostExecutorContractBody
): void {
  const parsedLogSessionRoute =
    typeof contract.service_route === "string" ? parseAgentRunLogSessionRoute(contract.service_route) : null;
  if (
    contract.schema_version !== "comath.pi_codex_unattended_real_host_executor_contract.v1" ||
    contract.executor_contract_status !== "executor_contract_recorded" ||
    contract.requested_execution_mode !== "production_unattended_real_host" ||
    contract.executor_contract_kind !== "service_owned_unattended_real_host_executor_contract" ||
    contract.executor_configuration_state !== "contract_recorded_executor_not_invoked" ||
    contract.handoff_review_current !== true ||
    contract.service_owned_checkpoint_chain_reviewed !== true ||
    contract.executor_contract_manifest_persisted !== true ||
    contract.unattended_executor_contract_current !== true ||
    contract.service_owned_unattended_executor_configured !== true ||
    contract.service_transport_primitive !== "node_http_agent_run_log_session_route" ||
    contract.client_transport_primitive !== "pi_fetch_get_text" ||
    parsedLogSessionRoute === null ||
    parsedLogSessionRoute.route !== contract.service_route ||
    parsedLogSessionRoute.runId !== contract.agent_run_id ||
    contract.executor_invoked !== false ||
    contract.operator_approved !== false ||
    contract.handoff_can_execute !== false ||
    contract.unattended_execution_authorized !== false ||
    contract.unattended_real_host_execution_completed !== false ||
    contract.operator_confirmation_bypassed !== false ||
    contract.durable_transport_provided !== false ||
    contract.live_transport_open !== false ||
    contract.indefinite_stream_open !== false ||
    contract.long_lived_websocket_provided !== false ||
    contract.long_lived_sse_provided !== false ||
    contract.pi_direct_write_allowed !== false ||
    contract.direct_trusted_state_mutation !== false ||
    contract.proof_authority !== "none" ||
    contract.can_promote_claim !== false ||
    contract.can_certify_ga !== false
  ) {
    throw new ComathError("Pi/Codex unattended real-host executor contract violates boundaries", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_EXECUTOR_CONTRACT_INVALID"
    });
  }
}

function assertUnattendedRealHostExecutorContractMatchesReview(
  contract: PiCodexUnattendedRealHostExecutorContractBody,
  review: PiCodexUnattendedRealHostHandoffReviewBody,
  handoffReviewArtifact: PiCodexUnattendedRealHostHandoffReviewArtifact
): void {
  if (
    contract.handoff_review_id !== review.handoff_review_id ||
    contract.handoff_review_path !== review.handoff_review_path ||
    contract.handoff_review_artifact.path !== handoffReviewArtifact.path ||
    contract.handoff_review_artifact.sha256 !== handoffReviewArtifact.sha256 ||
    contract.handoff_review_artifact.size_bytes !== handoffReviewArtifact.size_bytes ||
    contract.real_pi_runtime_probe_id !== review.real_pi_runtime_probe_id ||
    contract.session_id !== review.session_id ||
    contract.transport_recovery_id !== review.transport_recovery_id ||
    contract.transport_lease_id !== review.transport_lease_id ||
    contract.transport_heartbeat_id !== review.transport_heartbeat_id ||
    contract.execution_id !== review.execution_id ||
    contract.terminal_review_id !== review.terminal_review_id ||
    contract.transport_contract_id !== review.transport_contract_id ||
    contract.automatic_orchestration_id !== review.automatic_orchestration_id ||
    contract.transport_continuity_id !== review.transport_continuity_id ||
    contract.agent_run_id !== review.agent_run_id ||
    contract.service_route !== review.service_route ||
    contract.service_transport_primitive !== review.service_transport_primitive ||
    contract.client_transport_primitive !== review.client_transport_primitive
  ) {
    throw new ComathError("Pi/Codex unattended real-host executor contract does not bind the handoff review", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_EXECUTOR_CONTRACT_INVALID"
    });
  }
}

function readUnattendedRealHostExecutorContractArtifact(
  projectRoot: string,
  projectId: string,
  executorContractId: string,
  executorContractPath: string,
  expectedSha256: string,
  review: PiCodexUnattendedRealHostHandoffReviewBody,
  handoffReviewArtifact: PiCodexUnattendedRealHostHandoffReviewArtifact
): {
  contract: PiCodexUnattendedRealHostExecutorContractBody;
  artifact: PiCodexUnattendedRealHostExecutorContractArtifact;
} {
  const canonicalExecutorContractPath = unattendedRealHostExecutorContractPath(executorContractId);
  const normalizedExecutorContractPath = projectRelativePath(
    projectRoot,
    assertPathAllowed(projectRoot, executorContractPath, { purpose: "read", resolveRealpath: true })
  );
  if (normalizedExecutorContractPath !== canonicalExecutorContractPath) {
    throw new ComathError("Pi/Codex unattended real-host executor contract path is not canonical", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_EXECUTOR_CONTRACT_INVALID"
    });
  }
  const absolutePath = assertPathAllowed(projectRoot, canonicalExecutorContractPath, {
    purpose: "read",
    resolveRealpath: true
  });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new ComathError("Pi/Codex unattended real-host execution readiness requires executor contract evidence", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_EXECUTOR_CONTRACT_STALE"
    });
  }
  const content = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(content);
  if (assertPreparedCheckpointSha256(expectedSha256) !== actualSha256) {
    throw new ComathError("Pi/Codex unattended real-host executor contract hash is stale", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_EXECUTOR_CONTRACT_STALE"
    });
  }
  let parsed: PiCodexUnattendedRealHostExecutorContractBody;
  try {
    parsed = JSON.parse(content.toString("utf8")) as PiCodexUnattendedRealHostExecutorContractBody;
  } catch {
    throw new ComathError("Pi/Codex unattended real-host executor contract JSON is invalid", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_EXECUTOR_CONTRACT_INVALID"
    });
  }
  if (
    parsed.project_id !== projectId ||
    parsed.executor_contract_id !== executorContractId ||
    parsed.executor_contract_path !== canonicalExecutorContractPath
  ) {
    throw new ComathError("Pi/Codex unattended real-host executor contract does not bind the request", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_EXECUTOR_CONTRACT_INVALID"
    });
  }
  assertUnattendedRealHostExecutorContractBoundary(parsed);
  assertUnattendedRealHostExecutorContractMatchesReview(parsed, review, handoffReviewArtifact);
  return {
    contract: parsed,
    artifact: {
      kind: "unattended_real_host_executor_contract",
      path: canonicalExecutorContractPath,
      sha256: actualSha256,
      size_bytes: content.byteLength
    }
  };
}

function readOptionalUnattendedRealHostExecutorContractArtifact(
  projectRoot: string,
  projectId: string,
  input: PiCodexUnattendedRealHostExecutionReadinessInput,
  review: PiCodexUnattendedRealHostHandoffReviewBody,
  handoffReviewArtifact: PiCodexUnattendedRealHostHandoffReviewArtifact
):
  | {
      contract: PiCodexUnattendedRealHostExecutorContractBody;
      artifact: PiCodexUnattendedRealHostExecutorContractArtifact;
    }
  | null {
  const executorFields = [
    input.unattended_executor_contract_id,
    input.unattended_executor_contract_path,
    input.unattended_executor_contract_sha256
  ];
  if (executorFields.every((value) => value === undefined)) {
    return null;
  }
  if (executorFields.some((value) => value === undefined)) {
    throw new ComathError("Pi/Codex unattended real-host execution readiness executor contract input is incomplete", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_EXECUTOR_CONTRACT_INVALID"
    });
  }
  return readUnattendedRealHostExecutorContractArtifact(
    projectRoot,
    projectId,
    assertReviewId(input.unattended_executor_contract_id),
    input.unattended_executor_contract_path as string,
    input.unattended_executor_contract_sha256 as string,
    review,
    handoffReviewArtifact
  );
}

function assertUnattendedRealHostDurableTransportContractBoundary(
  contract: PiCodexUnattendedRealHostDurableTransportContractBody
): void {
  const parsedLogSessionRoute =
    typeof contract.service_route === "string" ? parseAgentRunLogSessionRoute(contract.service_route) : null;
  if (
    contract.schema_version !== "comath.pi_codex_unattended_real_host_durable_transport_contract.v1" ||
    contract.durable_transport_contract_status !== "durable_transport_prerequisite_contract_recorded" ||
    contract.durability_contract_kind !== "service_owned_external_durable_transport_prerequisite_contract" ||
    contract.transport_prerequisite_state !== "contract_recorded_transport_not_opened" ||
    contract.handoff_review_current !== true ||
    contract.operator_approval_artifact_current !== true ||
    contract.unattended_executor_contract_current !== true ||
    contract.transport_continuity_current !== true ||
    contract.service_owned_checkpoint_chain_reviewed !== true ||
    contract.durable_transport_contract_manifest_persisted !== true ||
    contract.durable_transport_contract_current !== true ||
    contract.service_owned_durable_transport_prerequisite_configured !== true ||
    contract.service_transport_primitive !== "node_http_agent_run_log_session_route" ||
    contract.client_transport_primitive !== "pi_fetch_get_text" ||
    parsedLogSessionRoute === null ||
    parsedLogSessionRoute.route !== contract.service_route ||
    parsedLogSessionRoute.runId !== contract.agent_run_id ||
    contract.operator_approved !== false ||
    contract.handoff_can_execute !== false ||
    contract.unattended_execution_authorized !== false ||
    contract.unattended_real_host_execution_completed !== false ||
    contract.operator_confirmation_bypassed !== false ||
    contract.durable_transport_provided !== false ||
    contract.live_transport_open !== false ||
    contract.indefinite_stream_open !== false ||
    contract.long_lived_websocket_provided !== false ||
    contract.long_lived_sse_provided !== false ||
    contract.pi_direct_write_allowed !== false ||
    contract.direct_trusted_state_mutation !== false ||
    contract.proof_authority !== "none" ||
    contract.can_promote_claim !== false ||
    contract.can_certify_ga !== false
  ) {
    throw new ComathError("Pi/Codex unattended real-host durable transport contract violates boundaries", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_DURABLE_TRANSPORT_CONTRACT_INVALID"
    });
  }
}

function hasLifecycleArtifactReference(value: unknown, kind: string): value is {
  kind: string;
  path: string;
  sha256: string;
  size_bytes: number;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const artifact = value as Record<string, unknown>;
  return (
    artifact.kind === kind &&
    typeof artifact.path === "string" &&
    artifact.path.length > 0 &&
    typeof artifact.sha256 === "string" &&
    /^[a-f0-9]{64}$/i.test(artifact.sha256) &&
    typeof artifact.size_bytes === "number" &&
    Number.isSafeInteger(artifact.size_bytes) &&
    artifact.size_bytes >= 0
  );
}

function assertUnattendedRealHostDurableTransportContractArtifactRefs(
  contract: PiCodexUnattendedRealHostDurableTransportContractBody
): void {
  const material = contract as {
    handoff_review_artifact?: unknown;
    operator_approval_artifact?: unknown;
    unattended_executor_contract_artifact?: unknown;
    transport_continuity_artifact?: unknown;
  };
  if (
    !hasLifecycleArtifactReference(material.handoff_review_artifact, "unattended_real_host_handoff_review") ||
    !hasLifecycleArtifactReference(material.operator_approval_artifact, "unattended_real_host_operator_approval") ||
    !hasLifecycleArtifactReference(
      material.unattended_executor_contract_artifact,
      "unattended_real_host_executor_contract"
    ) ||
    !hasLifecycleArtifactReference(material.transport_continuity_artifact, "operator_service_transport_continuity")
  ) {
    throw new ComathError("Pi/Codex unattended real-host durable transport contract artifact references are invalid", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_DURABLE_TRANSPORT_CONTRACT_INVALID"
    });
  }
}

function lifecycleArtifactReferenceMatches(
  actual: { kind: string; path: string; sha256: string; size_bytes: number },
  expected: { kind: string; path: string; sha256: string; size_bytes: number }
): boolean {
  return (
    actual.kind === expected.kind &&
    actual.path === expected.path &&
    actual.sha256 === expected.sha256 &&
    actual.size_bytes === expected.size_bytes
  );
}

function assertUnattendedRealHostDurableTransportContractMatchesChain(
  contract: PiCodexUnattendedRealHostDurableTransportContractBody,
  review: PiCodexUnattendedRealHostHandoffReviewBody,
  handoffReviewArtifact: PiCodexUnattendedRealHostHandoffReviewArtifact,
  approval: PiCodexUnattendedRealHostOperatorApprovalBody,
  approvalArtifact: PiCodexUnattendedRealHostOperatorApprovalArtifact,
  executorContract: PiCodexUnattendedRealHostExecutorContractBody,
  executorContractArtifact: PiCodexUnattendedRealHostExecutorContractArtifact,
  continuity: PiCodexOperatorServiceTransportContinuityBody,
  continuityArtifact: PiCodexOperatorServiceTransportContinuityArtifact
): void {
  assertUnattendedRealHostDurableTransportContractArtifactRefs(contract);
  if (
    contract.handoff_review_id !== review.handoff_review_id ||
    contract.handoff_review_path !== review.handoff_review_path ||
    !lifecycleArtifactReferenceMatches(contract.handoff_review_artifact, handoffReviewArtifact) ||
    contract.operator_approval_id !== approval.approval_id ||
    contract.operator_approval_path !== approval.approval_path ||
    !lifecycleArtifactReferenceMatches(contract.operator_approval_artifact, approvalArtifact) ||
    contract.unattended_executor_contract_id !== executorContract.executor_contract_id ||
    contract.unattended_executor_contract_path !== executorContract.executor_contract_path ||
    !lifecycleArtifactReferenceMatches(contract.unattended_executor_contract_artifact, executorContractArtifact) ||
    contract.transport_continuity_id !== continuity.continuity_id ||
    contract.transport_continuity_path !== continuity.continuity_path ||
    !lifecycleArtifactReferenceMatches(contract.transport_continuity_artifact, continuityArtifact) ||
    contract.real_pi_runtime_probe_id !== review.real_pi_runtime_probe_id ||
    contract.session_id !== review.session_id ||
    contract.transport_recovery_id !== review.transport_recovery_id ||
    contract.transport_lease_id !== review.transport_lease_id ||
    contract.transport_heartbeat_id !== review.transport_heartbeat_id ||
    contract.execution_id !== review.execution_id ||
    contract.terminal_review_id !== review.terminal_review_id ||
    contract.transport_contract_id !== review.transport_contract_id ||
    contract.automatic_orchestration_id !== review.automatic_orchestration_id ||
    contract.agent_run_id !== review.agent_run_id ||
    contract.service_route !== review.service_route ||
    contract.service_transport_primitive !== review.service_transport_primitive ||
    contract.client_transport_primitive !== review.client_transport_primitive ||
    continuity.continuity_id !== review.transport_continuity_id ||
    continuity.transport_contract_id !== review.transport_contract_id ||
    continuity.agent_run_id !== review.agent_run_id ||
    continuity.service_route !== review.service_route ||
    continuity.service_transport_primitive !== review.service_transport_primitive ||
    continuity.client_transport_primitive !== review.client_transport_primitive
  ) {
    throw new ComathError("Pi/Codex unattended real-host durable transport contract does not bind the handoff chain", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_DURABLE_TRANSPORT_CONTRACT_INVALID"
    });
  }
}

function readUnattendedRealHostDurableTransportContractArtifact(
  projectRoot: string,
  projectId: string,
  durableTransportContractId: string,
  durableTransportContractPath: string,
  expectedSha256: string,
  review: PiCodexUnattendedRealHostHandoffReviewBody,
  handoffReviewArtifact: PiCodexUnattendedRealHostHandoffReviewArtifact,
  approval: PiCodexUnattendedRealHostOperatorApprovalBody,
  approvalArtifact: PiCodexUnattendedRealHostOperatorApprovalArtifact,
  executorContract: PiCodexUnattendedRealHostExecutorContractBody,
  executorContractArtifact: PiCodexUnattendedRealHostExecutorContractArtifact
): {
  contract: PiCodexUnattendedRealHostDurableTransportContractBody;
  artifact: PiCodexUnattendedRealHostDurableTransportContractArtifact;
} {
  const canonicalDurableTransportContractPath =
    unattendedRealHostDurableTransportContractPath(durableTransportContractId);
  const normalizedDurableTransportContractPath = projectRelativePath(
    projectRoot,
    assertPathAllowed(projectRoot, durableTransportContractPath, { purpose: "read", resolveRealpath: true })
  );
  if (normalizedDurableTransportContractPath !== canonicalDurableTransportContractPath) {
    throw new ComathError("Pi/Codex unattended real-host durable transport contract path is not canonical", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_DURABLE_TRANSPORT_CONTRACT_INVALID"
    });
  }
  const absolutePath = assertPathAllowed(projectRoot, canonicalDurableTransportContractPath, {
    purpose: "read",
    resolveRealpath: true
  });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new ComathError("Pi/Codex unattended real-host execution readiness requires durable transport evidence", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_DURABLE_TRANSPORT_CONTRACT_STALE"
    });
  }
  const content = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(content);
  if (assertPreparedCheckpointSha256(expectedSha256) !== actualSha256) {
    throw new ComathError("Pi/Codex unattended real-host durable transport contract hash is stale", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_DURABLE_TRANSPORT_CONTRACT_STALE"
    });
  }
  let parsed: PiCodexUnattendedRealHostDurableTransportContractBody;
  try {
    parsed = JSON.parse(content.toString("utf8")) as PiCodexUnattendedRealHostDurableTransportContractBody;
  } catch {
    throw new ComathError("Pi/Codex unattended real-host durable transport contract JSON is invalid", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_DURABLE_TRANSPORT_CONTRACT_INVALID"
    });
  }
  if (
    parsed.project_id !== projectId ||
    parsed.durable_transport_contract_id !== durableTransportContractId ||
    parsed.durable_transport_contract_path !== canonicalDurableTransportContractPath
  ) {
    throw new ComathError("Pi/Codex unattended real-host durable transport contract does not bind the request", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_DURABLE_TRANSPORT_CONTRACT_INVALID"
    });
  }
  assertUnattendedRealHostDurableTransportContractArtifactRefs(parsed);
  const { continuity, artifact: continuityArtifact } = readOperatorServiceTransportContinuityArtifact(
    projectRoot,
    projectId,
    parsed.transport_continuity_id,
    parsed.transport_continuity_path,
    parsed.transport_continuity_artifact.sha256
  );
  assertUnattendedRealHostDurableTransportContractBoundary(parsed);
  assertUnattendedRealHostDurableTransportContractMatchesChain(
    parsed,
    review,
    handoffReviewArtifact,
    approval,
    approvalArtifact,
    executorContract,
    executorContractArtifact,
    continuity,
    continuityArtifact
  );
  return {
    contract: parsed,
    artifact: {
      kind: "unattended_real_host_durable_transport_contract",
      path: canonicalDurableTransportContractPath,
      sha256: actualSha256,
      size_bytes: content.byteLength
    }
  };
}

function readOptionalUnattendedRealHostDurableTransportContractArtifact(
  projectRoot: string,
  projectId: string,
  input: PiCodexUnattendedRealHostExecutionReadinessInput,
  review: PiCodexUnattendedRealHostHandoffReviewBody,
  handoffReviewArtifact: PiCodexUnattendedRealHostHandoffReviewArtifact,
  operatorApprovalBinding: {
    approval: PiCodexUnattendedRealHostOperatorApprovalBody;
    artifact: PiCodexUnattendedRealHostOperatorApprovalArtifact;
  } | null,
  executorContractBinding: {
    contract: PiCodexUnattendedRealHostExecutorContractBody;
    artifact: PiCodexUnattendedRealHostExecutorContractArtifact;
  } | null
):
  | {
      contract: PiCodexUnattendedRealHostDurableTransportContractBody;
      artifact: PiCodexUnattendedRealHostDurableTransportContractArtifact;
    }
  | null {
  const durableTransportFields = [
    input.durable_transport_contract_id,
    input.durable_transport_contract_path,
    input.durable_transport_contract_sha256
  ];
  if (durableTransportFields.every((value) => value === undefined)) {
    return null;
  }
  if (
    durableTransportFields.some((value) => value === undefined) ||
    operatorApprovalBinding === null ||
    executorContractBinding === null
  ) {
    throw new ComathError(
      "Pi/Codex unattended real-host execution readiness durable transport contract input is incomplete",
      {
        statusCode: 400,
        code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_DURABLE_TRANSPORT_CONTRACT_INVALID"
      }
    );
  }
  return readUnattendedRealHostDurableTransportContractArtifact(
    projectRoot,
    projectId,
    assertReviewId(input.durable_transport_contract_id),
    input.durable_transport_contract_path as string,
    input.durable_transport_contract_sha256 as string,
    review,
    handoffReviewArtifact,
    operatorApprovalBinding.approval,
    operatorApprovalBinding.artifact,
    executorContractBinding.contract,
    executorContractBinding.artifact
  );
}

export function recordPiCodexLifecycleUnattendedRealHostOperatorApproval(
  projectRoot: string,
  input: PiCodexUnattendedRealHostOperatorApprovalInput
): PiCodexUnattendedRealHostOperatorApproval {
  const projectId = assertOperatorSessionProjectId(input.project_id);
  const approvalId = assertReviewId(input.approval_id);
  const handoffReviewId = assertReviewId(input.handoff_review_id);
  const operatorApprovalMode = input.operator_approval_mode ?? "manual_operator_approval";
  if (operatorApprovalMode !== "manual_operator_approval") {
    throw new ComathError("Pi/Codex unattended real-host operator approval mode is invalid", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_OPERATOR_APPROVAL_INVALID_MODE"
    });
  }
  const approvalPath = unattendedRealHostOperatorApprovalPath(approvalId);
  const absoluteApprovalPath = assertPathAllowed(projectRoot, approvalPath, { purpose: "runtime-write" });
  if (existsSync(absoluteApprovalPath)) {
    throw new ComathError("Pi/Codex unattended real-host operator approval already exists", {
      statusCode: 409,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_OPERATOR_APPROVAL_ALREADY_EXISTS"
    });
  }

  let handoffReviewBundle: ReturnType<typeof readUnattendedRealHostHandoffReviewArtifact>;
  try {
    handoffReviewBundle = readUnattendedRealHostHandoffReviewArtifact(
      projectRoot,
      projectId,
      handoffReviewId,
      input.handoff_review_path,
      input.handoff_review_sha256
    );
  } catch (error) {
    if (error instanceof ComathError) {
      const stale = error.code === "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_HANDOFF_REVIEW_STALE";
      throw new ComathError(
        stale
          ? "Pi/Codex unattended real-host operator approval handoff review hash is stale"
          : "Pi/Codex unattended real-host operator approval handoff review is invalid",
        {
          statusCode: error.statusCode,
          code: stale
            ? "PI_CODEX_UNATTENDED_REAL_HOST_OPERATOR_APPROVAL_HANDOFF_REVIEW_STALE"
            : "PI_CODEX_UNATTENDED_REAL_HOST_OPERATOR_APPROVAL_HANDOFF_REVIEW_INVALID"
        }
      );
    }
    throw error;
  }
  const { review, artifact: handoffReviewArtifact } = handoffReviewBundle;
  const body: PiCodexUnattendedRealHostOperatorApprovalBody = {
    schema_version: "comath.pi_codex_unattended_real_host_operator_approval.v1",
    approval_id: approvalId,
    project_id: projectId,
    actor: sanitizeOperatorTransportText(input.actor),
    approved_at: new Date().toISOString(),
    approval_status: "operator_approval_artifact_recorded",
    approval_path: approvalPath,
    operator_approval_mode: "manual_operator_approval",
    approval_note: sanitizeOperatorTransportText(
      input.approval_note ??
        "Manual operator review checkpoint recorded; execution remains blocked until executor and durable transport prerequisites exist."
    ),
    handoff_review_id: handoffReviewId,
    handoff_review_path: review.handoff_review_path,
    handoff_review_artifact: handoffReviewArtifact,
    handoff_review_current: true,
    service_owned_checkpoint_chain_reviewed: true,
    approval_manifest_persisted: true,
    operator_approval_artifact_current: true,
    real_pi_runtime_probe_id: review.real_pi_runtime_probe_id,
    session_id: review.session_id,
    transport_recovery_id: review.transport_recovery_id,
    transport_lease_id: review.transport_lease_id,
    transport_heartbeat_id: review.transport_heartbeat_id,
    execution_id: review.execution_id,
    terminal_review_id: review.terminal_review_id,
    transport_contract_id: review.transport_contract_id,
    automatic_orchestration_id: review.automatic_orchestration_id,
    transport_continuity_id: review.transport_continuity_id,
    agent_run_id: review.agent_run_id,
    service_route: review.service_route,
    service_transport_primitive: review.service_transport_primitive,
    client_transport_primitive: review.client_transport_primitive,
    operator_approved: false,
    handoff_can_execute: false,
    unattended_execution_authorized: false,
    unattended_real_host_execution_completed: false,
    operator_confirmation_bypassed: false,
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
  mkdirSync(dirname(absoluteApprovalPath), { recursive: true });
  writeFileSync(absoluteApprovalPath, artifactText, "utf8");
  const result: PiCodexUnattendedRealHostOperatorApproval = {
    ...body,
    operator_approval_artifact: {
      kind: "unattended_real_host_operator_approval",
      path: approvalPath,
      sha256: sha256Text(artifactText),
      size_bytes: Buffer.byteLength(artifactText, "utf8")
    }
  };
  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.pi_codex_unattended_real_host_operator_approval_recorded",
    actor: sanitizeOperatorTransportText(input.actor),
    target_id: projectId,
    payload: {
      approval_id: approvalId,
      approval_status: result.approval_status,
      approval_path: approvalPath,
      operator_approval_artifact_sha256: result.operator_approval_artifact.sha256,
      operator_approval_artifact_size_bytes: result.operator_approval_artifact.size_bytes,
      operator_approval_mode: result.operator_approval_mode,
      handoff_review_id: handoffReviewId,
      handoff_review_path: result.handoff_review_path,
      handoff_review_artifact_sha256: handoffReviewArtifact.sha256,
      handoff_review_artifact_size_bytes: handoffReviewArtifact.size_bytes,
      handoff_review_current: true,
      service_owned_checkpoint_chain_reviewed: true,
      approval_manifest_persisted: true,
      operator_approval_artifact_current: true,
      real_pi_runtime_probe_id: result.real_pi_runtime_probe_id,
      session_id: result.session_id,
      transport_recovery_id: result.transport_recovery_id,
      transport_lease_id: result.transport_lease_id,
      transport_heartbeat_id: result.transport_heartbeat_id,
      execution_id: result.execution_id,
      terminal_review_id: result.terminal_review_id,
      transport_contract_id: result.transport_contract_id,
      automatic_orchestration_id: result.automatic_orchestration_id,
      transport_continuity_id: result.transport_continuity_id,
      agent_run_id: result.agent_run_id,
      service_route: result.service_route,
      operator_approved: false,
      handoff_can_execute: false,
      unattended_execution_authorized: false,
      unattended_real_host_execution_completed: false,
      operator_confirmation_bypassed: false,
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

export function recordPiCodexLifecycleUnattendedRealHostExecutorContract(
  projectRoot: string,
  input: PiCodexUnattendedRealHostExecutorContractInput
): PiCodexUnattendedRealHostExecutorContract {
  const projectId = assertOperatorSessionProjectId(input.project_id);
  const executorContractId = assertReviewId(input.executor_contract_id);
  const handoffReviewId = assertReviewId(input.handoff_review_id);
  const requestedExecutionMode = input.requested_execution_mode ?? "production_unattended_real_host";
  if (requestedExecutionMode !== "production_unattended_real_host") {
    throw new ComathError("Pi/Codex unattended real-host executor contract mode is invalid", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTOR_CONTRACT_INVALID_MODE"
    });
  }
  const executorContractKind =
    input.executor_contract_kind ?? "service_owned_unattended_real_host_executor_contract";
  if (executorContractKind !== "service_owned_unattended_real_host_executor_contract") {
    throw new ComathError("Pi/Codex unattended real-host executor contract kind is invalid", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTOR_CONTRACT_INVALID_KIND"
    });
  }
  const executorConfigurationState =
    input.executor_configuration_state ?? "contract_recorded_executor_not_invoked";
  if (executorConfigurationState !== "contract_recorded_executor_not_invoked") {
    throw new ComathError("Pi/Codex unattended real-host executor configuration state is invalid", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTOR_CONTRACT_INVALID_STATE"
    });
  }
  const executorContractPath = unattendedRealHostExecutorContractPath(executorContractId);
  const absoluteExecutorContractPath = assertPathAllowed(projectRoot, executorContractPath, {
    purpose: "runtime-write"
  });
  if (existsSync(absoluteExecutorContractPath)) {
    throw new ComathError("Pi/Codex unattended real-host executor contract already exists", {
      statusCode: 409,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTOR_CONTRACT_ALREADY_EXISTS"
    });
  }

  let handoffReviewBundle: ReturnType<typeof readUnattendedRealHostHandoffReviewArtifact>;
  try {
    handoffReviewBundle = readUnattendedRealHostHandoffReviewArtifact(
      projectRoot,
      projectId,
      handoffReviewId,
      input.handoff_review_path,
      input.handoff_review_sha256
    );
  } catch (error) {
    if (error instanceof ComathError) {
      const stale = error.code === "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_HANDOFF_REVIEW_STALE";
      throw new ComathError(
        stale
          ? "Pi/Codex unattended real-host executor contract handoff review hash is stale"
          : "Pi/Codex unattended real-host executor contract handoff review is invalid",
        {
          statusCode: error.statusCode,
          code: stale
            ? "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTOR_CONTRACT_HANDOFF_REVIEW_STALE"
            : "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTOR_CONTRACT_HANDOFF_REVIEW_INVALID"
        }
      );
    }
    throw error;
  }
  const { review, artifact: handoffReviewArtifact } = handoffReviewBundle;
  const body: PiCodexUnattendedRealHostExecutorContractBody = {
    schema_version: "comath.pi_codex_unattended_real_host_executor_contract.v1",
    executor_contract_id: executorContractId,
    project_id: projectId,
    actor: sanitizeOperatorTransportText(input.actor),
    created_at: new Date().toISOString(),
    executor_contract_status: "executor_contract_recorded",
    executor_contract_path: executorContractPath,
    requested_execution_mode: "production_unattended_real_host",
    executor_contract_kind: "service_owned_unattended_real_host_executor_contract",
    executor_configuration_state: "contract_recorded_executor_not_invoked",
    handoff_review_id: handoffReviewId,
    handoff_review_path: review.handoff_review_path,
    handoff_review_artifact: handoffReviewArtifact,
    handoff_review_current: true,
    service_owned_checkpoint_chain_reviewed: true,
    executor_contract_manifest_persisted: true,
    unattended_executor_contract_current: true,
    service_owned_unattended_executor_configured: true,
    real_pi_runtime_probe_id: review.real_pi_runtime_probe_id,
    session_id: review.session_id,
    transport_recovery_id: review.transport_recovery_id,
    transport_lease_id: review.transport_lease_id,
    transport_heartbeat_id: review.transport_heartbeat_id,
    execution_id: review.execution_id,
    terminal_review_id: review.terminal_review_id,
    transport_contract_id: review.transport_contract_id,
    automatic_orchestration_id: review.automatic_orchestration_id,
    transport_continuity_id: review.transport_continuity_id,
    agent_run_id: review.agent_run_id,
    service_route: review.service_route,
    service_transport_primitive: review.service_transport_primitive,
    client_transport_primitive: review.client_transport_primitive,
    executor_invoked: false,
    operator_approved: false,
    handoff_can_execute: false,
    unattended_execution_authorized: false,
    unattended_real_host_execution_completed: false,
    operator_confirmation_bypassed: false,
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
  mkdirSync(dirname(absoluteExecutorContractPath), { recursive: true });
  writeFileSync(absoluteExecutorContractPath, artifactText, "utf8");
  const result: PiCodexUnattendedRealHostExecutorContract = {
    ...body,
    executor_contract_artifact: {
      kind: "unattended_real_host_executor_contract",
      path: executorContractPath,
      sha256: sha256Text(artifactText),
      size_bytes: Buffer.byteLength(artifactText, "utf8")
    }
  };
  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.pi_codex_unattended_real_host_executor_contract_recorded",
    actor: sanitizeOperatorTransportText(input.actor),
    target_id: projectId,
    payload: {
      executor_contract_id: executorContractId,
      executor_contract_status: result.executor_contract_status,
      executor_contract_path: executorContractPath,
      executor_contract_artifact_sha256: result.executor_contract_artifact.sha256,
      executor_contract_artifact_size_bytes: result.executor_contract_artifact.size_bytes,
      requested_execution_mode: result.requested_execution_mode,
      executor_contract_kind: result.executor_contract_kind,
      executor_configuration_state: result.executor_configuration_state,
      handoff_review_id: handoffReviewId,
      handoff_review_path: result.handoff_review_path,
      handoff_review_artifact_sha256: handoffReviewArtifact.sha256,
      handoff_review_artifact_size_bytes: handoffReviewArtifact.size_bytes,
      handoff_review_current: true,
      service_owned_checkpoint_chain_reviewed: true,
      executor_contract_manifest_persisted: true,
      unattended_executor_contract_current: true,
      service_owned_unattended_executor_configured: true,
      real_pi_runtime_probe_id: result.real_pi_runtime_probe_id,
      session_id: result.session_id,
      transport_recovery_id: result.transport_recovery_id,
      transport_lease_id: result.transport_lease_id,
      transport_heartbeat_id: result.transport_heartbeat_id,
      execution_id: result.execution_id,
      terminal_review_id: result.terminal_review_id,
      transport_contract_id: result.transport_contract_id,
      automatic_orchestration_id: result.automatic_orchestration_id,
      transport_continuity_id: result.transport_continuity_id,
      agent_run_id: result.agent_run_id,
      service_route: result.service_route,
      executor_invoked: false,
      operator_approved: false,
      handoff_can_execute: false,
      unattended_execution_authorized: false,
      unattended_real_host_execution_completed: false,
      operator_confirmation_bypassed: false,
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

export function recordPiCodexLifecycleUnattendedRealHostDurableTransportContract(
  projectRoot: string,
  input: PiCodexUnattendedRealHostDurableTransportContractInput
): PiCodexUnattendedRealHostDurableTransportContract {
  const projectId = assertOperatorSessionProjectId(input.project_id);
  const durableTransportContractId = assertReviewId(input.durable_transport_contract_id);
  const handoffReviewId = assertReviewId(input.handoff_review_id);
  const durabilityContractKind =
    input.durability_contract_kind ?? "service_owned_external_durable_transport_prerequisite_contract";
  if (durabilityContractKind !== "service_owned_external_durable_transport_prerequisite_contract") {
    throw new ComathError("Pi/Codex unattended real-host durable transport contract kind is invalid", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_DURABLE_TRANSPORT_CONTRACT_INVALID_KIND"
    });
  }
  const transportPrerequisiteState =
    input.transport_prerequisite_state ?? "contract_recorded_transport_not_opened";
  if (transportPrerequisiteState !== "contract_recorded_transport_not_opened") {
    throw new ComathError("Pi/Codex unattended real-host durable transport prerequisite state is invalid", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_DURABLE_TRANSPORT_CONTRACT_INVALID_STATE"
    });
  }
  const durableTransportContractPath = unattendedRealHostDurableTransportContractPath(durableTransportContractId);
  const absoluteDurableTransportContractPath = assertPathAllowed(projectRoot, durableTransportContractPath, {
    purpose: "runtime-write"
  });
  if (existsSync(absoluteDurableTransportContractPath)) {
    throw new ComathError("Pi/Codex unattended real-host durable transport contract already exists", {
      statusCode: 409,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_DURABLE_TRANSPORT_CONTRACT_ALREADY_EXISTS"
    });
  }

  const { review, artifact: handoffReviewArtifact } = readUnattendedRealHostHandoffReviewArtifact(
    projectRoot,
    projectId,
    handoffReviewId,
    input.handoff_review_path,
    input.handoff_review_sha256
  );
  const { approval, artifact: approvalArtifact } = readUnattendedRealHostOperatorApprovalArtifact(
    projectRoot,
    projectId,
    assertReviewId(input.operator_approval_id),
    input.operator_approval_path,
    input.operator_approval_sha256,
    review,
    handoffReviewArtifact
  );
  const { contract: executorContract, artifact: executorContractArtifact } =
    readUnattendedRealHostExecutorContractArtifact(
      projectRoot,
      projectId,
      assertReviewId(input.unattended_executor_contract_id),
      input.unattended_executor_contract_path,
      input.unattended_executor_contract_sha256,
      review,
      handoffReviewArtifact
    );
  const canonicalContinuityPath = operatorServiceTransportContinuityPath(input.transport_continuity_id);
  const normalizedContinuityPath = projectRelativePath(
    projectRoot,
    assertPathAllowed(projectRoot, input.transport_continuity_path, { purpose: "read", resolveRealpath: true })
  );
  if (normalizedContinuityPath !== canonicalContinuityPath) {
    throw new ComathError("Pi/Codex unattended real-host durable transport continuity path is not canonical", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_DURABLE_TRANSPORT_CONTRACT_INVALID_CONTINUITY"
    });
  }
  const { continuity, artifact: continuityArtifact } = readOperatorServiceTransportContinuityArtifact(
    projectRoot,
    projectId,
    input.transport_continuity_id,
    canonicalContinuityPath,
    input.transport_continuity_sha256
  );
  if (
    approval.approval_id !== input.operator_approval_id ||
    executorContract.executor_contract_id !== input.unattended_executor_contract_id ||
    continuity.continuity_id !== input.transport_continuity_id
  ) {
    throw new ComathError("Pi/Codex unattended real-host durable transport contract chain binding is invalid", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_DURABLE_TRANSPORT_CONTRACT_INVALID_CHAIN"
    });
  }

  const body: PiCodexUnattendedRealHostDurableTransportContractBody = {
    schema_version: "comath.pi_codex_unattended_real_host_durable_transport_contract.v1",
    durable_transport_contract_id: durableTransportContractId,
    project_id: projectId,
    actor: sanitizeOperatorTransportText(input.actor),
    created_at: new Date().toISOString(),
    durable_transport_contract_status: "durable_transport_prerequisite_contract_recorded",
    durable_transport_contract_path: durableTransportContractPath,
    durability_contract_kind: "service_owned_external_durable_transport_prerequisite_contract",
    transport_prerequisite_state: "contract_recorded_transport_not_opened",
    handoff_review_id: handoffReviewId,
    handoff_review_path: review.handoff_review_path,
    handoff_review_artifact: handoffReviewArtifact,
    operator_approval_id: approval.approval_id,
    operator_approval_path: approval.approval_path,
    operator_approval_artifact: approvalArtifact,
    unattended_executor_contract_id: executorContract.executor_contract_id,
    unattended_executor_contract_path: executorContract.executor_contract_path,
    unattended_executor_contract_artifact: executorContractArtifact,
    transport_continuity_id: continuity.continuity_id,
    transport_continuity_path: continuity.continuity_path,
    transport_continuity_artifact: continuityArtifact,
    handoff_review_current: true,
    operator_approval_artifact_current: true,
    unattended_executor_contract_current: true,
    transport_continuity_current: true,
    service_owned_checkpoint_chain_reviewed: true,
    durable_transport_contract_manifest_persisted: true,
    durable_transport_contract_current: true,
    service_owned_durable_transport_prerequisite_configured: true,
    real_pi_runtime_probe_id: review.real_pi_runtime_probe_id,
    session_id: review.session_id,
    transport_recovery_id: review.transport_recovery_id,
    transport_lease_id: review.transport_lease_id,
    transport_heartbeat_id: review.transport_heartbeat_id,
    execution_id: review.execution_id,
    terminal_review_id: review.terminal_review_id,
    transport_contract_id: review.transport_contract_id,
    automatic_orchestration_id: review.automatic_orchestration_id,
    agent_run_id: review.agent_run_id,
    service_route: review.service_route,
    service_transport_primitive: review.service_transport_primitive,
    client_transport_primitive: review.client_transport_primitive,
    operator_approved: false,
    handoff_can_execute: false,
    unattended_execution_authorized: false,
    unattended_real_host_execution_completed: false,
    operator_confirmation_bypassed: false,
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
  assertUnattendedRealHostDurableTransportContractMatchesChain(
    body,
    review,
    handoffReviewArtifact,
    approval,
    approvalArtifact,
    executorContract,
    executorContractArtifact,
    continuity,
    continuityArtifact
  );
  const artifactText = canonicalJson(body);
  mkdirSync(dirname(absoluteDurableTransportContractPath), { recursive: true });
  writeFileSync(absoluteDurableTransportContractPath, artifactText, "utf8");
  const result: PiCodexUnattendedRealHostDurableTransportContract = {
    ...body,
    durable_transport_contract_artifact: {
      kind: "unattended_real_host_durable_transport_contract",
      path: durableTransportContractPath,
      sha256: sha256Text(artifactText),
      size_bytes: Buffer.byteLength(artifactText, "utf8")
    }
  };
  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.pi_codex_unattended_real_host_durable_transport_contract_recorded",
    actor: sanitizeOperatorTransportText(input.actor),
    target_id: projectId,
    payload: {
      durable_transport_contract_id: durableTransportContractId,
      durable_transport_contract_status: result.durable_transport_contract_status,
      durable_transport_contract_path: durableTransportContractPath,
      durable_transport_contract_artifact_sha256: result.durable_transport_contract_artifact.sha256,
      durable_transport_contract_artifact_size_bytes: result.durable_transport_contract_artifact.size_bytes,
      durability_contract_kind: result.durability_contract_kind,
      transport_prerequisite_state: result.transport_prerequisite_state,
      handoff_review_id: handoffReviewId,
      handoff_review_path: result.handoff_review_path,
      handoff_review_artifact_sha256: handoffReviewArtifact.sha256,
      operator_approval_id: result.operator_approval_id,
      operator_approval_artifact_sha256: approvalArtifact.sha256,
      unattended_executor_contract_id: result.unattended_executor_contract_id,
      unattended_executor_contract_artifact_sha256: executorContractArtifact.sha256,
      transport_continuity_id: result.transport_continuity_id,
      transport_continuity_artifact_sha256: continuityArtifact.sha256,
      durable_transport_contract_current: true,
      service_owned_durable_transport_prerequisite_configured: true,
      service_transport_primitive: result.service_transport_primitive,
      client_transport_primitive: result.client_transport_primitive,
      service_route: result.service_route,
      operator_approved: false,
      handoff_can_execute: false,
      unattended_execution_authorized: false,
      unattended_real_host_execution_completed: false,
      operator_confirmation_bypassed: false,
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

export function recordPiCodexLifecycleUnattendedRealHostExecutionReadiness(
  projectRoot: string,
  input: PiCodexUnattendedRealHostExecutionReadinessInput
): PiCodexUnattendedRealHostExecutionReadiness {
  const projectId = assertOperatorSessionProjectId(input.project_id);
  const readinessId = assertReviewId(input.readiness_id);
  const handoffReviewId = assertReviewId(input.handoff_review_id);
  const requestedExecutionMode = input.requested_execution_mode ?? "production_unattended_real_host";
  if (requestedExecutionMode !== "production_unattended_real_host") {
    throw new ComathError("Pi/Codex unattended real-host execution readiness mode is invalid", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_INVALID_MODE"
    });
  }
  const readinessPath = unattendedRealHostExecutionReadinessPath(readinessId);
  const absoluteReadinessPath = assertPathAllowed(projectRoot, readinessPath, { purpose: "runtime-write" });
  if (existsSync(absoluteReadinessPath)) {
    throw new ComathError("Pi/Codex unattended real-host execution readiness already exists", {
      statusCode: 409,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_READINESS_ALREADY_EXISTS"
    });
  }

  const { review, artifact: handoffReviewArtifact } = readUnattendedRealHostHandoffReviewArtifact(
    projectRoot,
    projectId,
    handoffReviewId,
    input.handoff_review_path,
    input.handoff_review_sha256
  );
  const operatorApprovalBinding = readOptionalUnattendedRealHostOperatorApprovalArtifact(
    projectRoot,
    projectId,
    input,
    review,
    handoffReviewArtifact
  );
  const executorContractBinding = readOptionalUnattendedRealHostExecutorContractArtifact(
    projectRoot,
    projectId,
    input,
    review,
    handoffReviewArtifact
  );
  const durableTransportContractBinding = readOptionalUnattendedRealHostDurableTransportContractArtifact(
    projectRoot,
    projectId,
    input,
    review,
    handoffReviewArtifact,
    operatorApprovalBinding,
    executorContractBinding
  );
  const blockerReasons: PiCodexUnattendedRealHostExecutionReadinessBlockerReason[] = [
    ...(operatorApprovalBinding === null
      ? (["operator_approval_artifact_missing"] as PiCodexUnattendedRealHostExecutionReadinessBlockerReason[])
      : []),
    ...(executorContractBinding === null
      ? (["service_owned_unattended_executor_not_configured"] as PiCodexUnattendedRealHostExecutionReadinessBlockerReason[])
      : []),
    ...(durableTransportContractBinding === null
      ? (["durable_transport_not_provided"] as PiCodexUnattendedRealHostExecutionReadinessBlockerReason[])
      : [])
  ];
  const readinessStatus =
    blockerReasons.length === 0
      ? "unattended_real_host_execution_prerequisites_recorded"
      : "blocked_unattended_real_host_execution_not_authorized";
  const body: PiCodexUnattendedRealHostExecutionReadinessBody = {
    schema_version: "comath.pi_codex_unattended_real_host_execution_readiness.v1",
    readiness_id: readinessId,
    project_id: projectId,
    actor: sanitizeOperatorTransportText(input.actor),
    created_at: new Date().toISOString(),
    readiness_status: readinessStatus,
    readiness_path: readinessPath,
    requested_execution_mode: "production_unattended_real_host",
    blocker_reasons: blockerReasons,
    handoff_review_id: handoffReviewId,
    handoff_review_path: review.handoff_review_path,
    handoff_review_artifact: handoffReviewArtifact,
    handoff_review_current: true,
    service_owned_checkpoint_chain_reviewed: true,
    operator_approval_id: operatorApprovalBinding?.approval.approval_id ?? null,
    operator_approval_path: operatorApprovalBinding?.approval.approval_path ?? null,
    operator_approval_artifact: operatorApprovalBinding?.artifact ?? null,
    operator_approval_artifact_current: operatorApprovalBinding !== null,
    unattended_executor_contract_id: executorContractBinding?.contract.executor_contract_id ?? null,
    unattended_executor_contract_path: executorContractBinding?.contract.executor_contract_path ?? null,
    unattended_executor_contract_artifact: executorContractBinding?.artifact ?? null,
    unattended_executor_contract_current: executorContractBinding !== null,
    service_owned_unattended_executor_configured: executorContractBinding !== null,
    durable_transport_contract_id: durableTransportContractBinding?.contract.durable_transport_contract_id ?? null,
    durable_transport_contract_path: durableTransportContractBinding?.contract.durable_transport_contract_path ?? null,
    durable_transport_contract_artifact: durableTransportContractBinding?.artifact ?? null,
    durable_transport_contract_current: durableTransportContractBinding !== null,
    service_owned_durable_transport_prerequisite_configured: durableTransportContractBinding !== null,
    readiness_manifest_persisted: true,
    real_pi_runtime_probe_id: review.real_pi_runtime_probe_id,
    session_id: review.session_id,
    transport_recovery_id: review.transport_recovery_id,
    transport_lease_id: review.transport_lease_id,
    transport_heartbeat_id: review.transport_heartbeat_id,
    execution_id: review.execution_id,
    terminal_review_id: review.terminal_review_id,
    transport_contract_id: review.transport_contract_id,
    automatic_orchestration_id: review.automatic_orchestration_id,
    transport_continuity_id: review.transport_continuity_id,
    agent_run_id: review.agent_run_id,
    service_route: review.service_route,
    service_transport_primitive: review.service_transport_primitive,
    client_transport_primitive: review.client_transport_primitive,
    operator_approved: false,
    handoff_can_execute: false,
    unattended_execution_authorized: false,
    unattended_real_host_execution_completed: false,
    operator_confirmation_bypassed: false,
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
  mkdirSync(dirname(absoluteReadinessPath), { recursive: true });
  writeFileSync(absoluteReadinessPath, artifactText, "utf8");
  const result: PiCodexUnattendedRealHostExecutionReadiness = {
    ...body,
    readiness_artifact: {
      kind: "unattended_real_host_execution_readiness",
      path: readinessPath,
      sha256: sha256Text(artifactText),
      size_bytes: Buffer.byteLength(artifactText, "utf8")
    }
  };
  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type:
      readinessStatus === "unattended_real_host_execution_prerequisites_recorded"
        ? "release.pi_codex_unattended_real_host_execution_readiness_prerequisites_recorded"
        : "release.pi_codex_unattended_real_host_execution_readiness_blocked",
    actor: sanitizeOperatorTransportText(input.actor),
    target_id: projectId,
    payload: {
      readiness_id: readinessId,
      readiness_status: result.readiness_status,
      readiness_path: readinessPath,
      readiness_artifact_sha256: result.readiness_artifact.sha256,
      readiness_artifact_size_bytes: result.readiness_artifact.size_bytes,
      requested_execution_mode: result.requested_execution_mode,
      blocker_reasons: blockerReasons,
      handoff_review_id: handoffReviewId,
      handoff_review_path: result.handoff_review_path,
      handoff_review_artifact_sha256: handoffReviewArtifact.sha256,
      handoff_review_artifact_size_bytes: handoffReviewArtifact.size_bytes,
      handoff_review_current: true,
      service_owned_checkpoint_chain_reviewed: true,
      operator_approval_id: result.operator_approval_id,
      operator_approval_path: result.operator_approval_path,
      operator_approval_artifact_sha256: result.operator_approval_artifact?.sha256 ?? null,
      operator_approval_artifact_size_bytes: result.operator_approval_artifact?.size_bytes ?? null,
      operator_approval_artifact_current: result.operator_approval_artifact_current,
      unattended_executor_contract_id: result.unattended_executor_contract_id,
      unattended_executor_contract_path: result.unattended_executor_contract_path,
      unattended_executor_contract_artifact_sha256: result.unattended_executor_contract_artifact?.sha256 ?? null,
      unattended_executor_contract_artifact_size_bytes:
        result.unattended_executor_contract_artifact?.size_bytes ?? null,
      unattended_executor_contract_current: result.unattended_executor_contract_current,
      service_owned_unattended_executor_configured: result.service_owned_unattended_executor_configured,
      durable_transport_contract_id: result.durable_transport_contract_id,
      durable_transport_contract_path: result.durable_transport_contract_path,
      durable_transport_contract_artifact_sha256: result.durable_transport_contract_artifact?.sha256 ?? null,
      durable_transport_contract_artifact_size_bytes:
        result.durable_transport_contract_artifact?.size_bytes ?? null,
      durable_transport_contract_current: result.durable_transport_contract_current,
      service_owned_durable_transport_prerequisite_configured:
        result.service_owned_durable_transport_prerequisite_configured,
      readiness_manifest_persisted: true,
      real_pi_runtime_probe_id: result.real_pi_runtime_probe_id,
      session_id: result.session_id,
      transport_recovery_id: result.transport_recovery_id,
      transport_lease_id: result.transport_lease_id,
      transport_heartbeat_id: result.transport_heartbeat_id,
      execution_id: result.execution_id,
      terminal_review_id: result.terminal_review_id,
      transport_contract_id: result.transport_contract_id,
      automatic_orchestration_id: result.automatic_orchestration_id,
      transport_continuity_id: result.transport_continuity_id,
      agent_run_id: result.agent_run_id,
      service_route: result.service_route,
      operator_approved: false,
      handoff_can_execute: false,
      unattended_execution_authorized: false,
      unattended_real_host_execution_completed: false,
      operator_confirmation_bypassed: false,
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

function assertUnattendedRealHostExecutionReadinessBoundary(
  readiness: PiCodexUnattendedRealHostExecutionReadinessBody
): void {
  const parsedLogSessionRoute =
    typeof readiness.service_route === "string" ? parseAgentRunLogSessionRoute(readiness.service_route) : null;
  if (
    readiness.schema_version !== "comath.pi_codex_unattended_real_host_execution_readiness.v1" ||
    readiness.readiness_status !== "unattended_real_host_execution_prerequisites_recorded" ||
    readiness.requested_execution_mode !== "production_unattended_real_host" ||
    !Array.isArray(readiness.blocker_reasons) ||
    readiness.blocker_reasons.length !== 0 ||
    !hasLifecycleArtifactReference(readiness.handoff_review_artifact, "unattended_real_host_handoff_review") ||
    !hasLifecycleArtifactReference(readiness.operator_approval_artifact, "unattended_real_host_operator_approval") ||
    !hasLifecycleArtifactReference(
      readiness.unattended_executor_contract_artifact,
      "unattended_real_host_executor_contract"
    ) ||
    !hasLifecycleArtifactReference(
      readiness.durable_transport_contract_artifact,
      "unattended_real_host_durable_transport_contract"
    ) ||
    readiness.handoff_review_current !== true ||
    readiness.service_owned_checkpoint_chain_reviewed !== true ||
    readiness.operator_approval_artifact_current !== true ||
    readiness.unattended_executor_contract_current !== true ||
    readiness.service_owned_unattended_executor_configured !== true ||
    readiness.durable_transport_contract_current !== true ||
    readiness.service_owned_durable_transport_prerequisite_configured !== true ||
    readiness.readiness_manifest_persisted !== true ||
    readiness.service_transport_primitive !== "node_http_agent_run_log_session_route" ||
    readiness.client_transport_primitive !== "pi_fetch_get_text" ||
    parsedLogSessionRoute === null ||
    parsedLogSessionRoute.route !== readiness.service_route ||
    parsedLogSessionRoute.runId !== readiness.agent_run_id ||
    readiness.operator_approved !== false ||
    readiness.handoff_can_execute !== false ||
    readiness.unattended_execution_authorized !== false ||
    readiness.unattended_real_host_execution_completed !== false ||
    readiness.operator_confirmation_bypassed !== false ||
    readiness.durable_transport_provided !== false ||
    readiness.live_transport_open !== false ||
    readiness.indefinite_stream_open !== false ||
    readiness.long_lived_websocket_provided !== false ||
    readiness.long_lived_sse_provided !== false ||
    readiness.pi_direct_write_allowed !== false ||
    readiness.direct_trusted_state_mutation !== false ||
    readiness.proof_authority !== "none" ||
    readiness.can_promote_claim !== false ||
    readiness.can_certify_ga !== false
  ) {
    throw new ComathError("Pi/Codex unattended real-host execution attempt readiness violates boundaries", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_ATTEMPT_READINESS_INVALID"
    });
  }
}

function assertUnattendedRealHostExecutionReadinessMatchesChain(
  readiness: PiCodexUnattendedRealHostExecutionReadinessBody,
  review: PiCodexUnattendedRealHostHandoffReviewBody,
  handoffReviewArtifact: PiCodexUnattendedRealHostHandoffReviewArtifact,
  approval: PiCodexUnattendedRealHostOperatorApprovalBody,
  approvalArtifact: PiCodexUnattendedRealHostOperatorApprovalArtifact,
  executorContract: PiCodexUnattendedRealHostExecutorContractBody,
  executorContractArtifact: PiCodexUnattendedRealHostExecutorContractArtifact,
  durableTransportContract: PiCodexUnattendedRealHostDurableTransportContractBody,
  durableTransportContractArtifact: PiCodexUnattendedRealHostDurableTransportContractArtifact
): void {
  if (
    readiness.handoff_review_id !== review.handoff_review_id ||
    readiness.handoff_review_path !== review.handoff_review_path ||
    !lifecycleArtifactReferenceMatches(readiness.handoff_review_artifact, handoffReviewArtifact) ||
    readiness.operator_approval_id !== approval.approval_id ||
    readiness.operator_approval_path !== approval.approval_path ||
    !lifecycleArtifactReferenceMatches(
      readiness.operator_approval_artifact as PiCodexUnattendedRealHostOperatorApprovalArtifact,
      approvalArtifact
    ) ||
    readiness.unattended_executor_contract_id !== executorContract.executor_contract_id ||
    readiness.unattended_executor_contract_path !== executorContract.executor_contract_path ||
    !lifecycleArtifactReferenceMatches(
      readiness.unattended_executor_contract_artifact as PiCodexUnattendedRealHostExecutorContractArtifact,
      executorContractArtifact
    ) ||
    readiness.durable_transport_contract_id !== durableTransportContract.durable_transport_contract_id ||
    readiness.durable_transport_contract_path !== durableTransportContract.durable_transport_contract_path ||
    !lifecycleArtifactReferenceMatches(
      readiness.durable_transport_contract_artifact as PiCodexUnattendedRealHostDurableTransportContractArtifact,
      durableTransportContractArtifact
    ) ||
    readiness.real_pi_runtime_probe_id !== review.real_pi_runtime_probe_id ||
    readiness.session_id !== review.session_id ||
    readiness.transport_recovery_id !== review.transport_recovery_id ||
    readiness.transport_lease_id !== review.transport_lease_id ||
    readiness.transport_heartbeat_id !== review.transport_heartbeat_id ||
    readiness.execution_id !== review.execution_id ||
    readiness.terminal_review_id !== review.terminal_review_id ||
    readiness.transport_contract_id !== review.transport_contract_id ||
    readiness.automatic_orchestration_id !== review.automatic_orchestration_id ||
    readiness.transport_continuity_id !== review.transport_continuity_id ||
    readiness.agent_run_id !== review.agent_run_id ||
    readiness.service_route !== review.service_route ||
    readiness.service_transport_primitive !== review.service_transport_primitive ||
    readiness.client_transport_primitive !== review.client_transport_primitive
  ) {
    throw new ComathError("Pi/Codex unattended real-host execution attempt readiness does not bind the chain", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_ATTEMPT_READINESS_INVALID"
    });
  }
}

function readUnattendedRealHostExecutionReadinessArtifact(
  projectRoot: string,
  projectId: string,
  readinessId: string,
  readinessPath: string,
  expectedSha256: string
): {
  readiness: PiCodexUnattendedRealHostExecutionReadinessBody;
  artifact: PiCodexUnattendedRealHostExecutionReadinessArtifact;
  review: PiCodexUnattendedRealHostHandoffReviewBody;
  handoffReviewArtifact: PiCodexUnattendedRealHostHandoffReviewArtifact;
  approval: PiCodexUnattendedRealHostOperatorApprovalBody;
  approvalArtifact: PiCodexUnattendedRealHostOperatorApprovalArtifact;
  executorContract: PiCodexUnattendedRealHostExecutorContractBody;
  executorContractArtifact: PiCodexUnattendedRealHostExecutorContractArtifact;
  durableTransportContract: PiCodexUnattendedRealHostDurableTransportContractBody;
  durableTransportContractArtifact: PiCodexUnattendedRealHostDurableTransportContractArtifact;
} {
  const canonicalReadinessPath = unattendedRealHostExecutionReadinessPath(readinessId);
  const normalizedReadinessPath = projectRelativePath(
    projectRoot,
    assertPathAllowed(projectRoot, readinessPath, { purpose: "read", resolveRealpath: true })
  );
  if (normalizedReadinessPath !== canonicalReadinessPath) {
    throw new ComathError("Pi/Codex unattended real-host execution attempt readiness path is not canonical", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_ATTEMPT_READINESS_INVALID"
    });
  }
  const absolutePath = assertPathAllowed(projectRoot, canonicalReadinessPath, {
    purpose: "read",
    resolveRealpath: true
  });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new ComathError("Pi/Codex unattended real-host execution attempt requires readiness evidence", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_ATTEMPT_READINESS_STALE"
    });
  }
  const content = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(content);
  if (assertPreparedCheckpointSha256(expectedSha256) !== actualSha256) {
    throw new ComathError("Pi/Codex unattended real-host execution attempt readiness hash is stale", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_ATTEMPT_READINESS_STALE"
    });
  }
  let parsed: PiCodexUnattendedRealHostExecutionReadinessBody;
  try {
    parsed = JSON.parse(content.toString("utf8")) as PiCodexUnattendedRealHostExecutionReadinessBody;
  } catch {
    throw new ComathError("Pi/Codex unattended real-host execution attempt readiness JSON is invalid", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_ATTEMPT_READINESS_INVALID"
    });
  }
  if (parsed.project_id !== projectId || parsed.readiness_id !== readinessId || parsed.readiness_path !== canonicalReadinessPath) {
    throw new ComathError("Pi/Codex unattended real-host execution attempt readiness does not bind the request", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_ATTEMPT_READINESS_INVALID"
    });
  }
  assertUnattendedRealHostExecutionReadinessBoundary(parsed);
  const { review, artifact: handoffReviewArtifact } = readUnattendedRealHostHandoffReviewArtifact(
    projectRoot,
    projectId,
    parsed.handoff_review_id,
    parsed.handoff_review_path,
    parsed.handoff_review_artifact.sha256
  );
  const { approval, artifact: approvalArtifact } = readUnattendedRealHostOperatorApprovalArtifact(
    projectRoot,
    projectId,
    parsed.operator_approval_id as string,
    parsed.operator_approval_path as string,
    (parsed.operator_approval_artifact as PiCodexUnattendedRealHostOperatorApprovalArtifact).sha256,
    review,
    handoffReviewArtifact
  );
  const { contract: executorContract, artifact: executorContractArtifact } =
    readUnattendedRealHostExecutorContractArtifact(
      projectRoot,
      projectId,
      parsed.unattended_executor_contract_id as string,
      parsed.unattended_executor_contract_path as string,
      (parsed.unattended_executor_contract_artifact as PiCodexUnattendedRealHostExecutorContractArtifact).sha256,
      review,
      handoffReviewArtifact
    );
  const { contract: durableTransportContract, artifact: durableTransportContractArtifact } =
    readUnattendedRealHostDurableTransportContractArtifact(
      projectRoot,
      projectId,
      parsed.durable_transport_contract_id as string,
      parsed.durable_transport_contract_path as string,
      (parsed.durable_transport_contract_artifact as PiCodexUnattendedRealHostDurableTransportContractArtifact).sha256,
      review,
      handoffReviewArtifact,
      approval,
      approvalArtifact,
      executorContract,
      executorContractArtifact
    );
  assertUnattendedRealHostExecutionReadinessMatchesChain(
    parsed,
    review,
    handoffReviewArtifact,
    approval,
    approvalArtifact,
    executorContract,
    executorContractArtifact,
    durableTransportContract,
    durableTransportContractArtifact
  );
  return {
    readiness: parsed,
    artifact: {
      kind: "unattended_real_host_execution_readiness",
      path: canonicalReadinessPath,
      sha256: actualSha256,
      size_bytes: content.byteLength
    },
    review,
    handoffReviewArtifact,
    approval,
    approvalArtifact,
    executorContract,
    executorContractArtifact,
    durableTransportContract,
    durableTransportContractArtifact
  };
}

function prepareUnattendedRealHostExecutionAttemptCommand(
  input: PiCodexUnattendedRealHostExecutionAttemptCommandInput
): {
  program: string;
  args: string[];
  expectedExitCode: number;
  timeoutMs: number;
} {
  const allowedPrograms = configuredLifecycleAllowedPrograms();
  const program = canonicalLifecycleProgram(input.program, "executor_command.program");
  if (!allowedPrograms.has(program)) {
    throw new ComathError("Pi/Codex unattended real-host execution attempt program is not allowlisted", {
      statusCode: 403,
      code: "PI_CODEX_LIFECYCLE_SERVICE_PROBE_PROGRAM_NOT_ALLOWLISTED"
    });
  }
  return {
    program,
    args: assertLifecycleArgsAllowed(input.args),
    expectedExitCode: assertExpectedExitCode(input.expected_exit_code),
    timeoutMs: assertProbeTimeout(input.timeout_ms ?? 5000)
  };
}

function runUnattendedRealHostExecutionAttemptCommand(
  command: ReturnType<typeof prepareUnattendedRealHostExecutionAttemptCommand>
): {
  commandRecord: PiCodexUnattendedRealHostExecutionAttemptCommandRecord;
  runnerResult: PiCodexUnattendedRealHostExecutionAttemptRunnerResult;
} {
  const startedAt = Date.now();
  let result: PiCodexLifecycleServiceProbeRunnerResult;
  try {
    result = defaultLifecycleProbeRunner({
      program: command.program,
      args: command.args,
      timeout_ms: command.timeoutMs,
      shell: false,
      network: false
    });
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
    commandRecord: {
      program_label: basename(command.program),
      program_path_sha256: sha256Text(command.program),
      args_count: command.args.length,
      args_sha256: sha256Text(canonicalJson(command.args)),
      expected_exit_code: command.expectedExitCode,
      timeout_ms: command.timeoutMs,
      shell: false,
      network: false
    },
    runnerResult: {
      exit_code: result.exit_code,
      signal: result.signal,
      timed_out: result.timed_out,
      ok,
      stdout: truncateProbeOutput(sanitizeOperatorTransportText(result.stdout)),
      stderr: truncateProbeOutput(sanitizeOperatorTransportText(result.stderr)),
      duration_ms: Math.max(Date.now() - startedAt, 0)
    }
  };
}

function persistUnattendedRealHostExecutionAttemptResult(
  projectRoot: string,
  attemptId: string,
  projectId: string,
  createdAt: string,
  commandRecord: PiCodexUnattendedRealHostExecutionAttemptCommandRecord,
  runnerResult: PiCodexUnattendedRealHostExecutionAttemptRunnerResult
): {
  path: string;
  artifact: PiCodexUnattendedRealHostExecutionAttemptResultArtifact;
} {
  const resultPath = unattendedRealHostExecutionAttemptResultPath(attemptId);
  const absoluteResultPath = assertPathAllowed(projectRoot, resultPath, { purpose: "runtime-write" });
  const resultBody: PiCodexUnattendedRealHostExecutionAttemptResultBody = {
    schema_version: "comath.pi_codex_unattended_real_host_execution_attempt_result.v1",
    attempt_id: attemptId,
    project_id: projectId,
    created_at: createdAt,
    execution_attempt_command: commandRecord,
    execution_attempt_result: runnerResult,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  };
  const resultText = canonicalJson(resultBody);
  mkdirSync(dirname(absoluteResultPath), { recursive: true });
  writeFileSync(absoluteResultPath, resultText, "utf8");
  return {
    path: resultPath,
    artifact: {
      kind: "unattended_real_host_execution_attempt_result",
      path: resultPath,
      sha256: sha256Text(resultText),
      size_bytes: Buffer.byteLength(resultText, "utf8")
    }
  };
}

export function recordPiCodexLifecycleUnattendedRealHostExecutionAttempt(
  projectRoot: string,
  input: PiCodexUnattendedRealHostExecutionAttemptInput
): PiCodexUnattendedRealHostExecutionAttempt {
  const projectId = assertOperatorSessionProjectId(input.project_id);
  const attemptId = assertReviewId(input.attempt_id);
  const readinessId = assertReviewId(input.readiness_id);
  const requestedExecutionMode = input.requested_execution_mode ?? "production_unattended_real_host";
  if (requestedExecutionMode !== "production_unattended_real_host") {
    throw new ComathError("Pi/Codex unattended real-host execution attempt mode is invalid", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_ATTEMPT_INVALID_MODE"
    });
  }
  const attemptPath = unattendedRealHostExecutionAttemptPath(attemptId);
  const absoluteAttemptPath = assertPathAllowed(projectRoot, attemptPath, { purpose: "runtime-write" });
  if (existsSync(absoluteAttemptPath)) {
    throw new ComathError("Pi/Codex unattended real-host execution attempt already exists", {
      statusCode: 409,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_ATTEMPT_ALREADY_EXISTS"
    });
  }

  const {
    readiness,
    artifact: readinessArtifact,
    review,
    handoffReviewArtifact,
    approval,
    approvalArtifact,
    executorContract,
    executorContractArtifact,
    durableTransportContract,
    durableTransportContractArtifact
  } = readUnattendedRealHostExecutionReadinessArtifact(
    projectRoot,
    projectId,
    readinessId,
    input.readiness_path,
    input.readiness_sha256
  );

  const createdAt = new Date().toISOString();
  let executionAttemptCommand: PiCodexUnattendedRealHostExecutionAttemptCommandRecord | null = null;
  let executionAttemptResult: PiCodexUnattendedRealHostExecutionAttemptRunnerResult | null = null;
  let executionAttemptResultPath: string | null = null;
  let executionAttemptResultArtifact: PiCodexUnattendedRealHostExecutionAttemptResultArtifact | null = null;

  if (input.executor_command !== undefined) {
    const preparedCommand = prepareUnattendedRealHostExecutionAttemptCommand(input.executor_command);
    const { commandRecord, runnerResult } = runUnattendedRealHostExecutionAttemptCommand(preparedCommand);
    const resultArtifact = persistUnattendedRealHostExecutionAttemptResult(
      projectRoot,
      attemptId,
      projectId,
      createdAt,
      commandRecord,
      runnerResult
    );
    executionAttemptCommand = commandRecord;
    executionAttemptResult = runnerResult;
    executionAttemptResultPath = resultArtifact.path;
    executionAttemptResultArtifact = resultArtifact.artifact;
  }

  const executorInvoked = executionAttemptCommand !== null && executionAttemptResult !== null;
  const executionAttemptSucceeded = executionAttemptResult?.ok ?? false;
  const blockerReasons: PiCodexUnattendedRealHostExecutionAttemptBlockerReason[] =
    input.executor_command === undefined
      ? ["service_owned_unattended_executor_unavailable"]
      : executionAttemptSucceeded
        ? []
        : ["service_owned_unattended_executor_failed"];
  const attemptStatus =
    input.executor_command === undefined
      ? "blocked_unattended_real_host_executor_unavailable"
      : executionAttemptSucceeded
        ? "unattended_real_host_execution_attempt_recorded"
        : "blocked_unattended_real_host_execution_attempt_failed";

  const body: PiCodexUnattendedRealHostExecutionAttemptBody = {
    schema_version: "comath.pi_codex_unattended_real_host_execution_attempt.v1",
    attempt_id: attemptId,
    project_id: projectId,
    actor: sanitizeOperatorTransportText(input.actor),
    created_at: createdAt,
    attempt_status: attemptStatus,
    attempt_path: attemptPath,
    requested_execution_mode: "production_unattended_real_host",
    blocker_reasons: blockerReasons,
    readiness_id: readiness.readiness_id,
    readiness_status: "unattended_real_host_execution_prerequisites_recorded",
    readiness_path: readiness.readiness_path,
    readiness_artifact: readinessArtifact,
    readiness_current: true,
    handoff_review_id: review.handoff_review_id,
    handoff_review_path: review.handoff_review_path,
    handoff_review_artifact: handoffReviewArtifact,
    handoff_review_current: true,
    operator_approval_id: approval.approval_id,
    operator_approval_path: approval.approval_path,
    operator_approval_artifact: approvalArtifact,
    operator_approval_artifact_current: true,
    unattended_executor_contract_id: executorContract.executor_contract_id,
    unattended_executor_contract_path: executorContract.executor_contract_path,
    unattended_executor_contract_artifact: executorContractArtifact,
    unattended_executor_contract_current: true,
    durable_transport_contract_id: durableTransportContract.durable_transport_contract_id,
    durable_transport_contract_path: durableTransportContract.durable_transport_contract_path,
    durable_transport_contract_artifact: durableTransportContractArtifact,
    durable_transport_contract_current: true,
    service_owned_checkpoint_chain_reviewed: true,
    service_owned_unattended_executor_configured: executorInvoked,
    service_owned_durable_transport_prerequisite_configured: true,
    execution_attempt_manifest_persisted: true,
    execution_attempt_command: executionAttemptCommand,
    execution_attempt_result: executionAttemptResult,
    execution_attempt_result_path: executionAttemptResultPath,
    execution_attempt_result_artifact: executionAttemptResultArtifact,
    executor_invoked: executorInvoked,
    execution_attempted: executorInvoked,
    execution_attempt_succeeded: executionAttemptSucceeded,
    execution_attempt_exit_code: executionAttemptResult?.exit_code ?? null,
    real_pi_runtime_probe_id: review.real_pi_runtime_probe_id,
    session_id: review.session_id,
    transport_recovery_id: review.transport_recovery_id,
    transport_lease_id: review.transport_lease_id,
    transport_heartbeat_id: review.transport_heartbeat_id,
    execution_id: review.execution_id,
    terminal_review_id: review.terminal_review_id,
    transport_contract_id: review.transport_contract_id,
    automatic_orchestration_id: review.automatic_orchestration_id,
    transport_continuity_id: review.transport_continuity_id,
    agent_run_id: review.agent_run_id,
    service_route: review.service_route,
    service_transport_primitive: review.service_transport_primitive,
    client_transport_primitive: review.client_transport_primitive,
    operator_approved: false,
    handoff_can_execute: false,
    unattended_execution_authorized: false,
    unattended_real_host_execution_completed: false,
    operator_confirmation_bypassed: false,
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
  mkdirSync(dirname(absoluteAttemptPath), { recursive: true });
  writeFileSync(absoluteAttemptPath, artifactText, "utf8");
  const result: PiCodexUnattendedRealHostExecutionAttempt = {
    ...body,
    attempt_artifact: {
      kind: "unattended_real_host_execution_attempt",
      path: attemptPath,
      sha256: sha256Text(artifactText),
      size_bytes: Buffer.byteLength(artifactText, "utf8")
    }
  };
  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: attemptStatus === "unattended_real_host_execution_attempt_recorded"
      ? "release.pi_codex_unattended_real_host_execution_attempt_recorded"
      : "release.pi_codex_unattended_real_host_execution_attempt_blocked",
    actor: sanitizeOperatorTransportText(input.actor),
    target_id: projectId,
    payload: {
      attempt_id: attemptId,
      attempt_status: result.attempt_status,
      attempt_path: attemptPath,
      attempt_artifact_sha256: result.attempt_artifact.sha256,
      attempt_artifact_size_bytes: result.attempt_artifact.size_bytes,
      readiness_id: result.readiness_id,
      readiness_path: result.readiness_path,
      readiness_artifact_sha256: readinessArtifact.sha256,
      readiness_artifact_size_bytes: readinessArtifact.size_bytes,
      blocker_reasons: result.blocker_reasons,
      handoff_review_id: result.handoff_review_id,
      handoff_review_artifact_sha256: handoffReviewArtifact.sha256,
      operator_approval_id: result.operator_approval_id,
      operator_approval_artifact_sha256: approvalArtifact.sha256,
      unattended_executor_contract_id: result.unattended_executor_contract_id,
      unattended_executor_contract_artifact_sha256: executorContractArtifact.sha256,
      durable_transport_contract_id: result.durable_transport_contract_id,
      durable_transport_contract_artifact_sha256: durableTransportContractArtifact.sha256,
      service_transport_primitive: result.service_transport_primitive,
      client_transport_primitive: result.client_transport_primitive,
      service_route: result.service_route,
      service_owned_unattended_executor_configured: result.service_owned_unattended_executor_configured,
      executor_invoked: result.executor_invoked,
      execution_attempted: result.execution_attempted,
      execution_attempt_succeeded: result.execution_attempt_succeeded,
      execution_attempt_exit_code: result.execution_attempt_exit_code,
      execution_attempt_result_artifact_sha256: result.execution_attempt_result_artifact?.sha256 ?? null,
      operator_approved: false,
      handoff_can_execute: false,
      unattended_execution_authorized: false,
      unattended_real_host_execution_completed: false,
      operator_confirmation_bypassed: false,
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

function assertUnattendedRealHostExecutionAttemptBoundary(
  attempt: PiCodexUnattendedRealHostExecutionAttemptBody
): void {
  const parsedLogSessionRoute =
    typeof attempt.service_route === "string" ? parseAgentRunLogSessionRoute(attempt.service_route) : null;
  const missingExecutor =
    attempt.attempt_status === "blocked_unattended_real_host_executor_unavailable" &&
    attempt.blocker_reasons.length === 1 &&
    attempt.blocker_reasons[0] === "service_owned_unattended_executor_unavailable" &&
    attempt.execution_attempt_command === null &&
    attempt.execution_attempt_result === null &&
    attempt.execution_attempt_result_path === null &&
    attempt.execution_attempt_result_artifact === null &&
    attempt.executor_invoked === false &&
    attempt.execution_attempted === false &&
    attempt.execution_attempt_succeeded === false &&
    attempt.execution_attempt_exit_code === null;
  const recordedAttempt =
    attempt.attempt_status === "unattended_real_host_execution_attempt_recorded" &&
    attempt.blocker_reasons.length === 0 &&
    attempt.execution_attempt_command !== null &&
    attempt.execution_attempt_result !== null &&
    attempt.execution_attempt_result_path !== null &&
    hasLifecycleArtifactReference(
      attempt.execution_attempt_result_artifact,
      "unattended_real_host_execution_attempt_result"
    ) &&
    attempt.executor_invoked === true &&
    attempt.execution_attempted === true &&
    attempt.execution_attempt_succeeded === true &&
    attempt.execution_attempt_result.ok === true &&
    attempt.execution_attempt_exit_code === attempt.execution_attempt_result.exit_code;
  const failedAttempt =
    attempt.attempt_status === "blocked_unattended_real_host_execution_attempt_failed" &&
    attempt.blocker_reasons.length === 1 &&
    attempt.blocker_reasons[0] === "service_owned_unattended_executor_failed" &&
    attempt.execution_attempt_command !== null &&
    attempt.execution_attempt_result !== null &&
    attempt.execution_attempt_result_path !== null &&
    hasLifecycleArtifactReference(
      attempt.execution_attempt_result_artifact,
      "unattended_real_host_execution_attempt_result"
    ) &&
    attempt.executor_invoked === true &&
    attempt.execution_attempted === true &&
    attempt.execution_attempt_succeeded === false &&
    attempt.execution_attempt_result.ok === false &&
    attempt.execution_attempt_exit_code === attempt.execution_attempt_result.exit_code;
  if (
    attempt.schema_version !== "comath.pi_codex_unattended_real_host_execution_attempt.v1" ||
    attempt.requested_execution_mode !== "production_unattended_real_host" ||
    attempt.readiness_status !== "unattended_real_host_execution_prerequisites_recorded" ||
    !Array.isArray(attempt.blocker_reasons) ||
    (!missingExecutor && !recordedAttempt && !failedAttempt) ||
    !hasLifecycleArtifactReference(attempt.readiness_artifact, "unattended_real_host_execution_readiness") ||
    !hasLifecycleArtifactReference(attempt.handoff_review_artifact, "unattended_real_host_handoff_review") ||
    !hasLifecycleArtifactReference(attempt.operator_approval_artifact, "unattended_real_host_operator_approval") ||
    !hasLifecycleArtifactReference(
      attempt.unattended_executor_contract_artifact,
      "unattended_real_host_executor_contract"
    ) ||
    !hasLifecycleArtifactReference(
      attempt.durable_transport_contract_artifact,
      "unattended_real_host_durable_transport_contract"
    ) ||
    attempt.readiness_current !== true ||
    attempt.handoff_review_current !== true ||
    attempt.operator_approval_artifact_current !== true ||
    attempt.unattended_executor_contract_current !== true ||
    attempt.durable_transport_contract_current !== true ||
    attempt.service_owned_checkpoint_chain_reviewed !== true ||
    attempt.service_owned_unattended_executor_configured !== attempt.executor_invoked ||
    attempt.service_owned_durable_transport_prerequisite_configured !== true ||
    attempt.execution_attempt_manifest_persisted !== true ||
    attempt.service_transport_primitive !== "node_http_agent_run_log_session_route" ||
    attempt.client_transport_primitive !== "pi_fetch_get_text" ||
    parsedLogSessionRoute === null ||
    parsedLogSessionRoute.route !== attempt.service_route ||
    parsedLogSessionRoute.runId !== attempt.agent_run_id ||
    attempt.operator_approved !== false ||
    attempt.handoff_can_execute !== false ||
    attempt.unattended_execution_authorized !== false ||
    attempt.unattended_real_host_execution_completed !== false ||
    attempt.operator_confirmation_bypassed !== false ||
    attempt.durable_transport_provided !== false ||
    attempt.live_transport_open !== false ||
    attempt.indefinite_stream_open !== false ||
    attempt.long_lived_websocket_provided !== false ||
    attempt.long_lived_sse_provided !== false ||
    attempt.pi_direct_write_allowed !== false ||
    attempt.direct_trusted_state_mutation !== false ||
    attempt.proof_authority !== "none" ||
    attempt.can_promote_claim !== false ||
    attempt.can_certify_ga !== false
  ) {
    throw new ComathError("Pi/Codex unattended real-host execution attempt review attempt violates boundaries", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_ATTEMPT_REVIEW_ATTEMPT_INVALID"
    });
  }
}

function assertUnattendedRealHostExecutionAttemptMatchesChain(
  attempt: PiCodexUnattendedRealHostExecutionAttemptBody,
  readiness: PiCodexUnattendedRealHostExecutionReadinessBody,
  readinessArtifact: PiCodexUnattendedRealHostExecutionReadinessArtifact,
  review: PiCodexUnattendedRealHostHandoffReviewBody,
  handoffReviewArtifact: PiCodexUnattendedRealHostHandoffReviewArtifact,
  approval: PiCodexUnattendedRealHostOperatorApprovalBody,
  approvalArtifact: PiCodexUnattendedRealHostOperatorApprovalArtifact,
  executorContract: PiCodexUnattendedRealHostExecutorContractBody,
  executorContractArtifact: PiCodexUnattendedRealHostExecutorContractArtifact,
  durableTransportContract: PiCodexUnattendedRealHostDurableTransportContractBody,
  durableTransportContractArtifact: PiCodexUnattendedRealHostDurableTransportContractArtifact
): void {
  if (
    attempt.readiness_id !== readiness.readiness_id ||
    attempt.readiness_path !== readiness.readiness_path ||
    !lifecycleArtifactReferenceMatches(attempt.readiness_artifact, readinessArtifact) ||
    attempt.handoff_review_id !== review.handoff_review_id ||
    attempt.handoff_review_path !== review.handoff_review_path ||
    !lifecycleArtifactReferenceMatches(attempt.handoff_review_artifact, handoffReviewArtifact) ||
    attempt.operator_approval_id !== approval.approval_id ||
    attempt.operator_approval_path !== approval.approval_path ||
    !lifecycleArtifactReferenceMatches(attempt.operator_approval_artifact, approvalArtifact) ||
    attempt.unattended_executor_contract_id !== executorContract.executor_contract_id ||
    attempt.unattended_executor_contract_path !== executorContract.executor_contract_path ||
    !lifecycleArtifactReferenceMatches(attempt.unattended_executor_contract_artifact, executorContractArtifact) ||
    attempt.durable_transport_contract_id !== durableTransportContract.durable_transport_contract_id ||
    attempt.durable_transport_contract_path !== durableTransportContract.durable_transport_contract_path ||
    !lifecycleArtifactReferenceMatches(
      attempt.durable_transport_contract_artifact,
      durableTransportContractArtifact
    ) ||
    attempt.real_pi_runtime_probe_id !== review.real_pi_runtime_probe_id ||
    attempt.session_id !== review.session_id ||
    attempt.transport_recovery_id !== review.transport_recovery_id ||
    attempt.transport_lease_id !== review.transport_lease_id ||
    attempt.transport_heartbeat_id !== review.transport_heartbeat_id ||
    attempt.execution_id !== review.execution_id ||
    attempt.terminal_review_id !== review.terminal_review_id ||
    attempt.transport_contract_id !== review.transport_contract_id ||
    attempt.automatic_orchestration_id !== review.automatic_orchestration_id ||
    attempt.transport_continuity_id !== review.transport_continuity_id ||
    attempt.agent_run_id !== review.agent_run_id ||
    attempt.service_route !== review.service_route ||
    attempt.service_transport_primitive !== review.service_transport_primitive ||
    attempt.client_transport_primitive !== review.client_transport_primitive ||
    attempt.readiness_current !== true ||
    attempt.handoff_review_current !== true ||
    attempt.operator_approval_artifact_current !== true ||
    attempt.unattended_executor_contract_current !== true ||
    attempt.durable_transport_contract_current !== true
  ) {
    throw new ComathError("Pi/Codex unattended real-host execution attempt review chain binding is invalid", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_ATTEMPT_REVIEW_ATTEMPT_INVALID"
    });
  }
}

function readUnattendedRealHostExecutionAttemptResultArtifact(
  projectRoot: string,
  projectId: string,
  attempt: PiCodexUnattendedRealHostExecutionAttemptBody
): boolean {
  if (
    attempt.execution_attempt_result_path === null ||
    attempt.execution_attempt_result_artifact === null ||
    attempt.execution_attempt_command === null ||
    attempt.execution_attempt_result === null
  ) {
    return false;
  }
  const canonicalResultPath = unattendedRealHostExecutionAttemptResultPath(attempt.attempt_id);
  const normalizedResultPath = projectRelativePath(
    projectRoot,
    assertPathAllowed(projectRoot, attempt.execution_attempt_result_path, { purpose: "read", resolveRealpath: true })
  );
  if (
    normalizedResultPath !== canonicalResultPath ||
    attempt.execution_attempt_result_artifact.path !== canonicalResultPath
  ) {
    throw new ComathError("Pi/Codex unattended real-host execution attempt review result path is not canonical", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_ATTEMPT_REVIEW_RESULT_INVALID"
    });
  }
  const absolutePath = assertPathAllowed(projectRoot, canonicalResultPath, {
    purpose: "read",
    resolveRealpath: true
  });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new ComathError("Pi/Codex unattended real-host execution attempt review requires result evidence", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_ATTEMPT_REVIEW_RESULT_STALE"
    });
  }
  const content = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(content);
  if (
    attempt.execution_attempt_result_artifact.sha256 !== actualSha256 ||
    attempt.execution_attempt_result_artifact.size_bytes !== content.byteLength
  ) {
    throw new ComathError("Pi/Codex unattended real-host execution attempt review result hash is stale", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_ATTEMPT_REVIEW_RESULT_STALE"
    });
  }
  let parsed: PiCodexUnattendedRealHostExecutionAttemptResultBody;
  try {
    parsed = JSON.parse(content.toString("utf8")) as PiCodexUnattendedRealHostExecutionAttemptResultBody;
  } catch {
    throw new ComathError("Pi/Codex unattended real-host execution attempt review result JSON is invalid", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_ATTEMPT_REVIEW_RESULT_INVALID"
    });
  }
  if (
    parsed.schema_version !== "comath.pi_codex_unattended_real_host_execution_attempt_result.v1" ||
    parsed.project_id !== projectId ||
    parsed.attempt_id !== attempt.attempt_id ||
    canonicalJson(parsed.execution_attempt_command) !== canonicalJson(attempt.execution_attempt_command) ||
    canonicalJson(parsed.execution_attempt_result) !== canonicalJson(attempt.execution_attempt_result) ||
    parsed.proof_authority !== "none" ||
    parsed.can_promote_claim !== false ||
    parsed.can_certify_ga !== false
  ) {
    throw new ComathError("Pi/Codex unattended real-host execution attempt review result does not bind the attempt", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_ATTEMPT_REVIEW_RESULT_INVALID"
    });
  }
  return true;
}

function readUnattendedRealHostExecutionAttemptArtifact(
  projectRoot: string,
  projectId: string,
  attemptId: string,
  attemptPath: string,
  expectedSha256: string
): {
  attempt: PiCodexUnattendedRealHostExecutionAttemptBody;
  artifact: PiCodexUnattendedRealHostExecutionAttemptArtifact;
  readiness: PiCodexUnattendedRealHostExecutionReadinessBody;
  readinessArtifact: PiCodexUnattendedRealHostExecutionReadinessArtifact;
  review: PiCodexUnattendedRealHostHandoffReviewBody;
  handoffReviewArtifact: PiCodexUnattendedRealHostHandoffReviewArtifact;
  approval: PiCodexUnattendedRealHostOperatorApprovalBody;
  approvalArtifact: PiCodexUnattendedRealHostOperatorApprovalArtifact;
  executorContract: PiCodexUnattendedRealHostExecutorContractBody;
  executorContractArtifact: PiCodexUnattendedRealHostExecutorContractArtifact;
  durableTransportContract: PiCodexUnattendedRealHostDurableTransportContractBody;
  durableTransportContractArtifact: PiCodexUnattendedRealHostDurableTransportContractArtifact;
  resultArtifactCurrent: boolean;
} {
  const canonicalAttemptPath = unattendedRealHostExecutionAttemptPath(attemptId);
  const normalizedAttemptPath = projectRelativePath(
    projectRoot,
    assertPathAllowed(projectRoot, attemptPath, { purpose: "read", resolveRealpath: true })
  );
  if (normalizedAttemptPath !== canonicalAttemptPath) {
    throw new ComathError("Pi/Codex unattended real-host execution attempt review attempt path is not canonical", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_ATTEMPT_REVIEW_ATTEMPT_INVALID"
    });
  }
  const absolutePath = assertPathAllowed(projectRoot, canonicalAttemptPath, {
    purpose: "read",
    resolveRealpath: true
  });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new ComathError("Pi/Codex unattended real-host execution attempt review requires attempt evidence", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_ATTEMPT_REVIEW_ATTEMPT_STALE"
    });
  }
  const content = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(content);
  if (assertPreparedCheckpointSha256(expectedSha256) !== actualSha256) {
    throw new ComathError("Pi/Codex unattended real-host execution attempt review attempt hash is stale", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_ATTEMPT_REVIEW_ATTEMPT_STALE"
    });
  }
  let parsed: PiCodexUnattendedRealHostExecutionAttemptBody;
  try {
    parsed = JSON.parse(content.toString("utf8")) as PiCodexUnattendedRealHostExecutionAttemptBody;
  } catch {
    throw new ComathError("Pi/Codex unattended real-host execution attempt review attempt JSON is invalid", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_ATTEMPT_REVIEW_ATTEMPT_INVALID"
    });
  }
  if (parsed.project_id !== projectId || parsed.attempt_id !== attemptId || parsed.attempt_path !== canonicalAttemptPath) {
    throw new ComathError("Pi/Codex unattended real-host execution attempt review attempt does not bind the request", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_ATTEMPT_REVIEW_ATTEMPT_INVALID"
    });
  }
  assertUnattendedRealHostExecutionAttemptBoundary(parsed);
  const {
    readiness,
    artifact: readinessArtifact,
    review,
    handoffReviewArtifact,
    approval,
    approvalArtifact,
    executorContract,
    executorContractArtifact,
    durableTransportContract,
    durableTransportContractArtifact
  } = readUnattendedRealHostExecutionReadinessArtifact(
    projectRoot,
    projectId,
    parsed.readiness_id,
    parsed.readiness_path,
    parsed.readiness_artifact.sha256
  );
  assertUnattendedRealHostExecutionAttemptMatchesChain(
    parsed,
    readiness,
    readinessArtifact,
    review,
    handoffReviewArtifact,
    approval,
    approvalArtifact,
    executorContract,
    executorContractArtifact,
    durableTransportContract,
    durableTransportContractArtifact
  );
  const resultArtifactCurrent = readUnattendedRealHostExecutionAttemptResultArtifact(projectRoot, projectId, parsed);
  return {
    attempt: parsed,
    artifact: {
      kind: "unattended_real_host_execution_attempt",
      path: canonicalAttemptPath,
      sha256: actualSha256,
      size_bytes: content.byteLength
    },
    readiness,
    readinessArtifact,
    review,
    handoffReviewArtifact,
    approval,
    approvalArtifact,
    executorContract,
    executorContractArtifact,
    durableTransportContract,
    durableTransportContractArtifact,
    resultArtifactCurrent
  };
}

export function reviewPiCodexLifecycleUnattendedRealHostExecutionAttempt(
  projectRoot: string,
  input: PiCodexUnattendedRealHostExecutionAttemptReviewInput
): PiCodexUnattendedRealHostExecutionAttemptReview {
  const projectId = assertOperatorSessionProjectId(input.project_id);
  const attemptReviewId = assertReviewId(input.attempt_review_id);
  const attemptId = assertReviewId(input.attempt_id);
  const requestedReviewMode = input.requested_review_mode ?? "terminal_unattended_real_host_execution";
  if (requestedReviewMode !== "terminal_unattended_real_host_execution") {
    throw new ComathError("Pi/Codex unattended real-host execution attempt review mode is invalid", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_ATTEMPT_REVIEW_INVALID_MODE"
    });
  }
  const attemptReviewPath = unattendedRealHostExecutionAttemptReviewPath(attemptReviewId);
  const absoluteAttemptReviewPath = assertPathAllowed(projectRoot, attemptReviewPath, { purpose: "runtime-write" });
  if (existsSync(absoluteAttemptReviewPath)) {
    throw new ComathError("Pi/Codex unattended real-host execution attempt review already exists", {
      statusCode: 409,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_EXECUTION_ATTEMPT_REVIEW_ALREADY_EXISTS"
    });
  }
  const {
    attempt,
    artifact: attemptArtifact,
    readinessArtifact,
    handoffReviewArtifact,
    approvalArtifact,
    executorContractArtifact,
    durableTransportContractArtifact,
    resultArtifactCurrent
  } = readUnattendedRealHostExecutionAttemptArtifact(
    projectRoot,
    projectId,
    attemptId,
    input.attempt_path,
    input.attempt_sha256
  );
  const attemptReviewStatus =
    attempt.attempt_status === "unattended_real_host_execution_attempt_recorded"
      ? "blocked_terminal_unattended_completion_review_required"
      : attempt.attempt_status;
  const blockerReasons: PiCodexUnattendedRealHostExecutionAttemptReviewBlockerReason[] =
    attempt.attempt_status === "unattended_real_host_execution_attempt_recorded"
      ? ["terminal_unattended_completion_evidence_missing"]
      : [...attempt.blocker_reasons];
  const body: PiCodexUnattendedRealHostExecutionAttemptReviewBody = {
    schema_version: "comath.pi_codex_unattended_real_host_execution_attempt_review.v1",
    attempt_review_id: attemptReviewId,
    project_id: projectId,
    actor: sanitizeOperatorTransportText(input.actor),
    created_at: new Date().toISOString(),
    attempt_review_status: attemptReviewStatus,
    terminal_goal_state: "blocked_with_replayable_certificate",
    attempt_review_path: attemptReviewPath,
    requested_review_mode: "terminal_unattended_real_host_execution",
    blocker_reasons: blockerReasons,
    attempt_id: attempt.attempt_id,
    attempt_status: attempt.attempt_status,
    attempt_path: attempt.attempt_path,
    attempt_artifact: attemptArtifact,
    attempt_current: true,
    readiness_id: attempt.readiness_id,
    readiness_status: "unattended_real_host_execution_prerequisites_recorded",
    readiness_path: attempt.readiness_path,
    readiness_artifact: readinessArtifact,
    readiness_current: true,
    handoff_review_id: attempt.handoff_review_id,
    handoff_review_path: attempt.handoff_review_path,
    handoff_review_artifact: handoffReviewArtifact,
    handoff_review_current: true,
    operator_approval_id: attempt.operator_approval_id,
    operator_approval_path: attempt.operator_approval_path,
    operator_approval_artifact: approvalArtifact,
    operator_approval_artifact_current: true,
    unattended_executor_contract_id: attempt.unattended_executor_contract_id,
    unattended_executor_contract_path: attempt.unattended_executor_contract_path,
    unattended_executor_contract_artifact: executorContractArtifact,
    unattended_executor_contract_current: true,
    durable_transport_contract_id: attempt.durable_transport_contract_id,
    durable_transport_contract_path: attempt.durable_transport_contract_path,
    durable_transport_contract_artifact: durableTransportContractArtifact,
    durable_transport_contract_current: true,
    service_owned_checkpoint_chain_reviewed: true,
    service_owned_attempt_review_completed: true,
    terminal_unattended_completion_certified: false,
    service_owned_unattended_executor_configured: attempt.service_owned_unattended_executor_configured,
    service_owned_durable_transport_prerequisite_configured: true,
    execution_attempt_manifest_persisted: true,
    execution_attempt_command: attempt.execution_attempt_command,
    execution_attempt_result: attempt.execution_attempt_result,
    execution_attempt_result_path: attempt.execution_attempt_result_path,
    execution_attempt_result_artifact: attempt.execution_attempt_result_artifact,
    execution_attempt_result_artifact_current: resultArtifactCurrent,
    executor_invoked: attempt.executor_invoked,
    execution_attempted: attempt.execution_attempted,
    execution_attempt_succeeded: attempt.execution_attempt_succeeded,
    execution_attempt_exit_code: attempt.execution_attempt_exit_code,
    real_pi_runtime_probe_id: attempt.real_pi_runtime_probe_id,
    session_id: attempt.session_id,
    transport_recovery_id: attempt.transport_recovery_id,
    transport_lease_id: attempt.transport_lease_id,
    transport_heartbeat_id: attempt.transport_heartbeat_id,
    execution_id: attempt.execution_id,
    terminal_review_id: attempt.terminal_review_id,
    transport_contract_id: attempt.transport_contract_id,
    automatic_orchestration_id: attempt.automatic_orchestration_id,
    transport_continuity_id: attempt.transport_continuity_id,
    agent_run_id: attempt.agent_run_id,
    service_route: attempt.service_route,
    service_transport_primitive: attempt.service_transport_primitive,
    client_transport_primitive: attempt.client_transport_primitive,
    operator_approved: false,
    handoff_can_execute: false,
    unattended_execution_authorized: false,
    unattended_real_host_execution_completed: false,
    operator_confirmation_bypassed: false,
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
  mkdirSync(dirname(absoluteAttemptReviewPath), { recursive: true });
  writeFileSync(absoluteAttemptReviewPath, artifactText, "utf8");
  const result: PiCodexUnattendedRealHostExecutionAttemptReview = {
    ...body,
    attempt_review_artifact: {
      kind: "unattended_real_host_execution_attempt_review",
      path: attemptReviewPath,
      sha256: sha256Text(artifactText),
      size_bytes: Buffer.byteLength(artifactText, "utf8")
    }
  };
  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.pi_codex_unattended_real_host_execution_attempt_reviewed",
    actor: sanitizeOperatorTransportText(input.actor),
    target_id: projectId,
    payload: {
      attempt_review_id: attemptReviewId,
      attempt_review_status: result.attempt_review_status,
      terminal_goal_state: result.terminal_goal_state,
      attempt_review_path: attemptReviewPath,
      attempt_review_artifact_sha256: result.attempt_review_artifact.sha256,
      attempt_review_artifact_size_bytes: result.attempt_review_artifact.size_bytes,
      attempt_id: result.attempt_id,
      attempt_status: result.attempt_status,
      attempt_path: result.attempt_path,
      attempt_artifact_sha256: result.attempt_artifact.sha256,
      attempt_artifact_size_bytes: result.attempt_artifact.size_bytes,
      blocker_reasons: result.blocker_reasons,
      readiness_id: result.readiness_id,
      readiness_path: result.readiness_path,
      readiness_artifact_sha256: readinessArtifact.sha256,
      readiness_artifact_size_bytes: readinessArtifact.size_bytes,
      handoff_review_id: result.handoff_review_id,
      handoff_review_artifact_sha256: handoffReviewArtifact.sha256,
      operator_approval_id: result.operator_approval_id,
      operator_approval_artifact_sha256: approvalArtifact.sha256,
      unattended_executor_contract_id: result.unattended_executor_contract_id,
      unattended_executor_contract_artifact_sha256: executorContractArtifact.sha256,
      durable_transport_contract_id: result.durable_transport_contract_id,
      durable_transport_contract_artifact_sha256: durableTransportContractArtifact.sha256,
      service_transport_primitive: result.service_transport_primitive,
      client_transport_primitive: result.client_transport_primitive,
      service_route: result.service_route,
      service_owned_unattended_executor_configured: result.service_owned_unattended_executor_configured,
      service_owned_attempt_review_completed: true,
      terminal_unattended_completion_certified: false,
      executor_invoked: result.executor_invoked,
      execution_attempted: result.execution_attempted,
      execution_attempt_succeeded: result.execution_attempt_succeeded,
      execution_attempt_exit_code: result.execution_attempt_exit_code,
      execution_attempt_result_artifact_sha256: result.execution_attempt_result_artifact?.sha256 ?? null,
      execution_attempt_result_artifact_current: result.execution_attempt_result_artifact_current,
      operator_approved: false,
      handoff_can_execute: false,
      unattended_execution_authorized: false,
      unattended_real_host_execution_completed: false,
      operator_confirmation_bypassed: false,
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

function throwCompletionCertificationPrerequisiteReviewInvalid(message: string): never {
  throw new ComathError(message, {
    statusCode: 400,
    code: "PI_CODEX_UNATTENDED_REAL_HOST_COMPLETION_CERTIFICATION_PREREQUISITE_REVIEW_INVALID"
  });
}

function assertCompletionCertificationPrerequisiteReviewSha256(value: string): string {
  const sha256 = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-f0-9]{64}$/u.test(sha256)) {
    throw new ComathError("Pi/Codex unattended real-host completion certification prerequisite review hash is stale", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_COMPLETION_CERTIFICATION_PREREQUISITE_REVIEW_STALE"
    });
  }
  return sha256;
}

function hasUnattendedRealHostExecutionAttemptCommandRecord(
  value: unknown
): value is PiCodexUnattendedRealHostExecutionAttemptCommandRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const command = value as Record<string, unknown>;
  return (
    typeof command.program_label === "string" &&
    command.program_label.length > 0 &&
    typeof command.program_path_sha256 === "string" &&
    /^[a-f0-9]{64}$/iu.test(command.program_path_sha256) &&
    typeof command.args_count === "number" &&
    Number.isSafeInteger(command.args_count) &&
    command.args_count >= 0 &&
    typeof command.args_sha256 === "string" &&
    /^[a-f0-9]{64}$/iu.test(command.args_sha256) &&
    typeof command.expected_exit_code === "number" &&
    Number.isSafeInteger(command.expected_exit_code) &&
    typeof command.timeout_ms === "number" &&
    Number.isSafeInteger(command.timeout_ms) &&
    command.timeout_ms > 0 &&
    command.shell === false &&
    command.network === false
  );
}

function hasUnattendedRealHostExecutionAttemptRunnerResult(
  value: unknown
): value is PiCodexUnattendedRealHostExecutionAttemptRunnerResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const result = value as Record<string, unknown>;
  const exitCodeValid =
    result.exit_code === null ||
    (typeof result.exit_code === "number" && Number.isSafeInteger(result.exit_code));
  const signalValid = result.signal === null || typeof result.signal === "string";
  return (
    exitCodeValid &&
    signalValid &&
    typeof result.timed_out === "boolean" &&
    typeof result.ok === "boolean" &&
    typeof result.stdout === "string" &&
    typeof result.stderr === "string" &&
    typeof result.duration_ms === "number" &&
    Number.isSafeInteger(result.duration_ms) &&
    result.duration_ms >= 0
  );
}

function assertCompletionCertificationPrerequisiteReviewBoundary(
  review: PiCodexUnattendedRealHostExecutionAttemptReviewBody
): void {
  const allowedReviewStatuses = new Set<PiCodexUnattendedRealHostExecutionAttemptReview["attempt_review_status"]>([
    "blocked_unattended_real_host_executor_unavailable",
    "blocked_unattended_real_host_execution_attempt_failed",
    "blocked_terminal_unattended_completion_review_required"
  ]);
  const allowedAttemptStatuses = new Set<PiCodexUnattendedRealHostExecutionAttempt["attempt_status"]>([
    "blocked_unattended_real_host_executor_unavailable",
    "blocked_unattended_real_host_execution_attempt_failed",
    "unattended_real_host_execution_attempt_recorded"
  ]);
  const allowedBlockers = new Set<PiCodexUnattendedRealHostExecutionAttemptReviewBlockerReason>([
    "service_owned_unattended_executor_unavailable",
    "service_owned_unattended_executor_failed",
    "terminal_unattended_completion_evidence_missing"
  ]);
  const parsedLogSessionRoute =
    typeof review.service_route === "string" ? parseAgentRunLogSessionRoute(review.service_route) : null;
  const canonicalResultPath =
    typeof review.attempt_id === "string" ? unattendedRealHostExecutionAttemptResultPath(review.attempt_id) : null;
  const resultArtifactValid =
    canonicalResultPath !== null &&
    hasLifecycleArtifactReference(review.execution_attempt_result_artifact, "unattended_real_host_execution_attempt_result") &&
    review.execution_attempt_result_artifact.path === canonicalResultPath &&
    review.execution_attempt_result_path === canonicalResultPath;
  const resultEvidenceValid =
    hasUnattendedRealHostExecutionAttemptCommandRecord(review.execution_attempt_command) &&
    hasUnattendedRealHostExecutionAttemptRunnerResult(review.execution_attempt_result) &&
    resultArtifactValid &&
    review.execution_attempt_result_artifact_current === true &&
    review.execution_attempt_exit_code === review.execution_attempt_result.exit_code;
  const missingExecutorReview =
    review.attempt_review_status === "blocked_unattended_real_host_executor_unavailable" &&
    review.attempt_status === "blocked_unattended_real_host_executor_unavailable" &&
    review.blocker_reasons.length === 1 &&
    review.blocker_reasons[0] === "service_owned_unattended_executor_unavailable" &&
    review.execution_attempt_command === null &&
    review.execution_attempt_result === null &&
    review.execution_attempt_result_path === null &&
    review.execution_attempt_result_artifact === null &&
    review.execution_attempt_result_artifact_current === false &&
    review.executor_invoked === false &&
    review.execution_attempted === false &&
    review.execution_attempt_succeeded === false &&
    review.execution_attempt_exit_code === null;
  const failedAttemptReview =
    review.attempt_review_status === "blocked_unattended_real_host_execution_attempt_failed" &&
    review.attempt_status === "blocked_unattended_real_host_execution_attempt_failed" &&
    review.blocker_reasons.length === 1 &&
    review.blocker_reasons[0] === "service_owned_unattended_executor_failed" &&
    resultEvidenceValid &&
    review.execution_attempt_result?.ok === false &&
    review.executor_invoked === true &&
    review.execution_attempted === true &&
    review.execution_attempt_succeeded === false;
  const successfulAttemptStillBlockedReview =
    review.attempt_review_status === "blocked_terminal_unattended_completion_review_required" &&
    review.attempt_status === "unattended_real_host_execution_attempt_recorded" &&
    review.blocker_reasons.length === 1 &&
    review.blocker_reasons[0] === "terminal_unattended_completion_evidence_missing" &&
    resultEvidenceValid &&
    review.execution_attempt_result?.ok === true &&
    review.executor_invoked === true &&
    review.execution_attempted === true &&
    review.execution_attempt_succeeded === true;
  if (
    review.schema_version !== "comath.pi_codex_unattended_real_host_execution_attempt_review.v1" ||
    !allowedReviewStatuses.has(review.attempt_review_status) ||
    review.terminal_goal_state !== "blocked_with_replayable_certificate" ||
    review.requested_review_mode !== "terminal_unattended_real_host_execution" ||
    !Array.isArray(review.blocker_reasons) ||
    review.blocker_reasons.length === 0 ||
    review.blocker_reasons.some((reason) => !allowedBlockers.has(reason)) ||
    !allowedAttemptStatuses.has(review.attempt_status) ||
    (!missingExecutorReview && !failedAttemptReview && !successfulAttemptStillBlockedReview) ||
    !hasLifecycleArtifactReference(review.attempt_artifact, "unattended_real_host_execution_attempt") ||
    review.attempt_current !== true ||
    review.readiness_status !== "unattended_real_host_execution_prerequisites_recorded" ||
    !hasLifecycleArtifactReference(review.readiness_artifact, "unattended_real_host_execution_readiness") ||
    review.readiness_current !== true ||
    !hasLifecycleArtifactReference(review.handoff_review_artifact, "unattended_real_host_handoff_review") ||
    review.handoff_review_current !== true ||
    !hasLifecycleArtifactReference(review.operator_approval_artifact, "unattended_real_host_operator_approval") ||
    review.operator_approval_artifact_current !== true ||
    !hasLifecycleArtifactReference(
      review.unattended_executor_contract_artifact,
      "unattended_real_host_executor_contract"
    ) ||
    review.unattended_executor_contract_current !== true ||
    !hasLifecycleArtifactReference(
      review.durable_transport_contract_artifact,
      "unattended_real_host_durable_transport_contract"
    ) ||
    review.durable_transport_contract_current !== true ||
    review.service_owned_checkpoint_chain_reviewed !== true ||
    review.service_owned_attempt_review_completed !== true ||
    review.terminal_unattended_completion_certified !== false ||
    review.service_owned_durable_transport_prerequisite_configured !== true ||
    review.execution_attempt_manifest_persisted !== true ||
    review.service_transport_primitive !== "node_http_agent_run_log_session_route" ||
    review.client_transport_primitive !== "pi_fetch_get_text" ||
    typeof review.agent_run_id !== "string" ||
    parsedLogSessionRoute === null ||
    parsedLogSessionRoute.route !== review.service_route ||
    parsedLogSessionRoute.runId !== review.agent_run_id ||
    review.operator_approved !== false ||
    review.handoff_can_execute !== false ||
    review.unattended_execution_authorized !== false ||
    review.unattended_real_host_execution_completed !== false ||
    review.operator_confirmation_bypassed !== false ||
    review.durable_transport_provided !== false ||
    review.live_transport_open !== false ||
    review.indefinite_stream_open !== false ||
    review.long_lived_websocket_provided !== false ||
    review.long_lived_sse_provided !== false ||
    review.pi_direct_write_allowed !== false ||
    review.direct_trusted_state_mutation !== false ||
    review.proof_authority !== "none" ||
    review.can_promote_claim !== false ||
    review.can_certify_ga !== false
  ) {
    throwCompletionCertificationPrerequisiteReviewInvalid(
      "Pi/Codex unattended real-host completion certification prerequisite review violates boundaries"
    );
  }
}

function readUnattendedRealHostExecutionAttemptReviewArtifact(
  projectRoot: string,
  projectId: string,
  attemptReviewId: string,
  attemptReviewPath: string,
  expectedSha256: string
): {
  review: PiCodexUnattendedRealHostExecutionAttemptReviewBody;
  artifact: PiCodexUnattendedRealHostExecutionAttemptReviewArtifact;
} {
  const canonicalReviewPath = unattendedRealHostExecutionAttemptReviewPath(attemptReviewId);
  const normalizedReviewPath = projectRelativePath(
    projectRoot,
    assertPathAllowed(projectRoot, attemptReviewPath, { purpose: "read", resolveRealpath: true })
  );
  if (normalizedReviewPath !== canonicalReviewPath) {
    throwCompletionCertificationPrerequisiteReviewInvalid(
      "Pi/Codex unattended real-host completion certification prerequisite review path is not canonical"
    );
  }
  const absolutePath = assertPathAllowed(projectRoot, canonicalReviewPath, {
    purpose: "read",
    resolveRealpath: true
  });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new ComathError(
      "Pi/Codex unattended real-host completion certification prerequisite requires review evidence",
      {
        statusCode: 400,
        code: "PI_CODEX_UNATTENDED_REAL_HOST_COMPLETION_CERTIFICATION_PREREQUISITE_REVIEW_STALE"
      }
    );
  }
  const content = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(content);
  if (assertCompletionCertificationPrerequisiteReviewSha256(expectedSha256) !== actualSha256) {
    throw new ComathError(
      "Pi/Codex unattended real-host completion certification prerequisite review hash is stale",
      {
        statusCode: 400,
        code: "PI_CODEX_UNATTENDED_REAL_HOST_COMPLETION_CERTIFICATION_PREREQUISITE_REVIEW_STALE"
      }
    );
  }
  let parsed: PiCodexUnattendedRealHostExecutionAttemptReviewBody;
  try {
    parsed = JSON.parse(content.toString("utf8")) as PiCodexUnattendedRealHostExecutionAttemptReviewBody;
  } catch {
    throwCompletionCertificationPrerequisiteReviewInvalid(
      "Pi/Codex unattended real-host completion certification prerequisite review JSON is invalid"
    );
  }
  if (
    parsed.project_id !== projectId ||
    parsed.attempt_review_id !== attemptReviewId ||
    parsed.attempt_review_path !== canonicalReviewPath
  ) {
    throwCompletionCertificationPrerequisiteReviewInvalid(
      "Pi/Codex unattended real-host completion certification prerequisite review does not bind the request"
    );
  }
  assertCompletionCertificationPrerequisiteReviewBoundary(parsed);
  return {
    review: parsed,
    artifact: {
      kind: "unattended_real_host_execution_attempt_review",
      path: canonicalReviewPath,
      sha256: actualSha256,
      size_bytes: content.byteLength
    }
  };
}

export function recordPiCodexLifecycleUnattendedRealHostCompletionCertificationPrerequisite(
  projectRoot: string,
  input: PiCodexUnattendedRealHostCompletionCertificationPrerequisiteInput
): PiCodexUnattendedRealHostCompletionCertificationPrerequisite {
  const projectId = assertOperatorSessionProjectId(input.project_id);
  const completionCertificationPrerequisiteId = assertReviewId(input.completion_certification_prerequisite_id);
  const attemptReviewId = assertReviewId(input.attempt_review_id);
  const requestedCompletionMode = input.requested_completion_mode ?? "production_unattended_real_host_completion";
  if (requestedCompletionMode !== "production_unattended_real_host_completion") {
    throw new ComathError("Pi/Codex unattended real-host completion certification prerequisite mode is invalid", {
      statusCode: 400,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_COMPLETION_CERTIFICATION_PREREQUISITE_INVALID_MODE"
    });
  }
  const completionCertificationPrerequisitePath = unattendedRealHostCompletionCertificationPrerequisitePath(
    completionCertificationPrerequisiteId
  );
  const absoluteCompletionCertificationPrerequisitePath = assertPathAllowed(
    projectRoot,
    completionCertificationPrerequisitePath,
    { purpose: "runtime-write" }
  );
  if (existsSync(absoluteCompletionCertificationPrerequisitePath)) {
    throw new ComathError("Pi/Codex unattended real-host completion certification prerequisite already exists", {
      statusCode: 409,
      code: "PI_CODEX_UNATTENDED_REAL_HOST_COMPLETION_CERTIFICATION_PREREQUISITE_ALREADY_EXISTS"
    });
  }
  const { review, artifact: attemptReviewArtifact } = readUnattendedRealHostExecutionAttemptReviewArtifact(
    projectRoot,
    projectId,
    attemptReviewId,
    input.attempt_review_path,
    input.attempt_review_sha256
  );
  const blockerReasons = Array.from(
    new Set<PiCodexUnattendedRealHostCompletionCertificationPrerequisiteBlockerReason>([
      ...review.blocker_reasons,
      "terminal_unattended_completion_certificate_missing"
    ])
  );
  const body: PiCodexUnattendedRealHostCompletionCertificationPrerequisiteBody = {
    schema_version: "comath.pi_codex_unattended_real_host_completion_certification_prerequisite.v1",
    completion_certification_prerequisite_id: completionCertificationPrerequisiteId,
    project_id: projectId,
    actor: sanitizeOperatorTransportText(input.actor),
    created_at: new Date().toISOString(),
    completion_certification_prerequisite_status: "blocked_terminal_unattended_completion_certification_required",
    terminal_goal_state: "blocked_with_replayable_certificate",
    completion_certification_prerequisite_path: completionCertificationPrerequisitePath,
    requested_completion_mode: "production_unattended_real_host_completion",
    blocker_reasons: blockerReasons,
    completion_certificate_available: false,
    attempt_review_id: review.attempt_review_id,
    attempt_review_status: review.attempt_review_status,
    attempt_review_path: review.attempt_review_path,
    attempt_review_artifact: attemptReviewArtifact,
    attempt_review_current: true,
    attempt_id: review.attempt_id,
    attempt_status: review.attempt_status,
    attempt_path: review.attempt_path,
    attempt_artifact: review.attempt_artifact,
    attempt_current: true,
    readiness_id: review.readiness_id,
    readiness_status: "unattended_real_host_execution_prerequisites_recorded",
    readiness_path: review.readiness_path,
    readiness_artifact: review.readiness_artifact,
    readiness_current: true,
    handoff_review_id: review.handoff_review_id,
    handoff_review_path: review.handoff_review_path,
    handoff_review_artifact: review.handoff_review_artifact,
    handoff_review_current: true,
    operator_approval_id: review.operator_approval_id,
    operator_approval_path: review.operator_approval_path,
    operator_approval_artifact: review.operator_approval_artifact,
    operator_approval_artifact_current: true,
    unattended_executor_contract_id: review.unattended_executor_contract_id,
    unattended_executor_contract_path: review.unattended_executor_contract_path,
    unattended_executor_contract_artifact: review.unattended_executor_contract_artifact,
    unattended_executor_contract_current: true,
    durable_transport_contract_id: review.durable_transport_contract_id,
    durable_transport_contract_path: review.durable_transport_contract_path,
    durable_transport_contract_artifact: review.durable_transport_contract_artifact,
    durable_transport_contract_current: true,
    service_owned_checkpoint_chain_reviewed: true,
    service_owned_attempt_review_completed: true,
    terminal_unattended_completion_certified: false,
    service_owned_unattended_executor_configured: review.service_owned_unattended_executor_configured,
    service_owned_durable_transport_prerequisite_configured: true,
    execution_attempt_manifest_persisted: true,
    executor_invoked: review.executor_invoked,
    execution_attempted: review.execution_attempted,
    execution_attempt_succeeded: review.execution_attempt_succeeded,
    execution_attempt_exit_code: review.execution_attempt_exit_code ?? null,
    real_pi_runtime_probe_id: review.real_pi_runtime_probe_id ?? null,
    session_id: review.session_id ?? null,
    transport_recovery_id: review.transport_recovery_id ?? null,
    transport_lease_id: review.transport_lease_id ?? null,
    transport_heartbeat_id: review.transport_heartbeat_id ?? null,
    execution_id: review.execution_id ?? null,
    terminal_review_id: review.terminal_review_id ?? null,
    transport_contract_id: review.transport_contract_id ?? null,
    automatic_orchestration_id: review.automatic_orchestration_id ?? null,
    transport_continuity_id: review.transport_continuity_id ?? null,
    agent_run_id: review.agent_run_id ?? null,
    service_route: review.service_route ?? null,
    service_transport_primitive: "node_http_agent_run_log_session_route",
    client_transport_primitive: "pi_fetch_get_text",
    operator_approved: false,
    handoff_can_execute: false,
    unattended_execution_authorized: false,
    unattended_real_host_execution_completed: false,
    operator_confirmation_bypassed: false,
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
  mkdirSync(dirname(absoluteCompletionCertificationPrerequisitePath), { recursive: true });
  writeFileSync(absoluteCompletionCertificationPrerequisitePath, artifactText, "utf8");
  const result: PiCodexUnattendedRealHostCompletionCertificationPrerequisite = {
    ...body,
    completion_certification_prerequisite_artifact: {
      kind: "unattended_real_host_completion_certification_prerequisite",
      path: completionCertificationPrerequisitePath,
      sha256: sha256Text(artifactText),
      size_bytes: Buffer.byteLength(artifactText, "utf8")
    }
  };
  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.pi_codex_unattended_real_host_completion_certification_prerequisite_recorded",
    actor: sanitizeOperatorTransportText(input.actor),
    target_id: projectId,
    payload: {
      completion_certification_prerequisite_id: completionCertificationPrerequisiteId,
      completion_certification_prerequisite_status: result.completion_certification_prerequisite_status,
      terminal_goal_state: result.terminal_goal_state,
      completion_certification_prerequisite_path: completionCertificationPrerequisitePath,
      completion_certification_prerequisite_artifact_sha256:
        result.completion_certification_prerequisite_artifact.sha256,
      completion_certification_prerequisite_artifact_size_bytes:
        result.completion_certification_prerequisite_artifact.size_bytes,
      requested_completion_mode: result.requested_completion_mode,
      blocker_reasons: result.blocker_reasons,
      completion_certificate_available: false,
      attempt_review_id: result.attempt_review_id,
      attempt_review_status: result.attempt_review_status,
      attempt_review_path: result.attempt_review_path,
      attempt_review_artifact_sha256: result.attempt_review_artifact.sha256,
      attempt_review_artifact_size_bytes: result.attempt_review_artifact.size_bytes,
      attempt_id: result.attempt_id,
      attempt_status: result.attempt_status,
      attempt_path: result.attempt_path,
      attempt_artifact_sha256: result.attempt_artifact.sha256,
      attempt_artifact_size_bytes: result.attempt_artifact.size_bytes,
      executor_invoked: result.executor_invoked,
      execution_attempted: result.execution_attempted,
      execution_attempt_succeeded: result.execution_attempt_succeeded,
      execution_attempt_exit_code: result.execution_attempt_exit_code,
      service_owned_attempt_review_completed: true,
      terminal_unattended_completion_certified: false,
      operator_approved: false,
      handoff_can_execute: false,
      unattended_execution_authorized: false,
      unattended_real_host_execution_completed: false,
      operator_confirmation_bypassed: false,
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
  codex: PiCodexLifecycleCodexEvidence,
  completionPrerequisite?: PiCodexLifecycleCompletionCertificationPrerequisiteBinding
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

  const checks: PiCodexLifecycleReadinessReview["checks"] = {
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
  if (completionPrerequisite) {
    checks.terminal_unattended_completion_certification = {
      ok: false,
      required: true,
      observed: completionPrerequisite.completion_certification_prerequisite_status
    };
  }
  return checks;
}

function buildVetoes(
  checks: PiCodexLifecycleReadinessReview["checks"],
  codex: PiCodexLifecycleCodexEvidence,
  completionPrerequisite?: PiCodexLifecycleCompletionCertificationPrerequisiteBinding
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
  if (completionPrerequisite) {
    pushVeto(
      vetoes,
      "terminal_unattended_completion_certification_required",
      "Task253 records that production unattended real-host completion still requires a terminal completion certificate."
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

function throwLifecycleReadinessCompletionPrerequisiteInvalid(message: string): never {
  throw new ComathError(message, {
    statusCode: 400,
    code: "PI_CODEX_LIFECYCLE_READINESS_COMPLETION_CERTIFICATION_PREREQUISITE_INVALID"
  });
}

function assertLifecycleReadinessCompletionPrerequisiteSha256(value: string | undefined): string {
  const sha256 = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-f0-9]{64}$/u.test(sha256)) {
    throw new ComathError("Pi/Codex lifecycle readiness completion certification prerequisite hash is stale", {
      statusCode: 400,
      code: "PI_CODEX_LIFECYCLE_READINESS_COMPLETION_CERTIFICATION_PREREQUISITE_STALE"
    });
  }
  return sha256;
}

function completionCertificationPrerequisiteBindingFromInput(
  projectRoot: string,
  projectId: string,
  input: PiCodexLifecycleReadinessInput
): PiCodexLifecycleCompletionCertificationPrerequisiteBinding | undefined {
  const providedValues = [
    input.completion_certification_prerequisite_id,
    input.completion_certification_prerequisite_path,
    input.completion_certification_prerequisite_sha256
  ].filter((value) => value !== undefined);
  if (providedValues.length === 0) {
    return undefined;
  }
  if (
    input.completion_certification_prerequisite_id === undefined ||
    input.completion_certification_prerequisite_path === undefined ||
    input.completion_certification_prerequisite_sha256 === undefined
  ) {
    throwLifecycleReadinessCompletionPrerequisiteInvalid(
      "Pi/Codex lifecycle readiness completion certification prerequisite binding is incomplete"
    );
  }
  const prerequisiteId = assertReviewId(input.completion_certification_prerequisite_id);
  const canonicalPrerequisitePath = unattendedRealHostCompletionCertificationPrerequisitePath(prerequisiteId);
  const normalizedInputPath = projectRelativePath(
    projectRoot,
    assertPathAllowed(projectRoot, input.completion_certification_prerequisite_path, {
      purpose: "read",
      resolveRealpath: true
    })
  );
  if (normalizedInputPath !== canonicalPrerequisitePath) {
    throwLifecycleReadinessCompletionPrerequisiteInvalid(
      "Pi/Codex lifecycle readiness completion certification prerequisite path is not canonical"
    );
  }
  const absolutePath = assertPathAllowed(projectRoot, canonicalPrerequisitePath, {
    purpose: "read",
    resolveRealpath: true
  });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new ComathError("Pi/Codex lifecycle readiness completion certification prerequisite artifact is stale", {
      statusCode: 400,
      code: "PI_CODEX_LIFECYCLE_READINESS_COMPLETION_CERTIFICATION_PREREQUISITE_STALE"
    });
  }
  const content = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(content);
  if (assertLifecycleReadinessCompletionPrerequisiteSha256(input.completion_certification_prerequisite_sha256) !== actualSha256) {
    throw new ComathError("Pi/Codex lifecycle readiness completion certification prerequisite hash is stale", {
      statusCode: 400,
      code: "PI_CODEX_LIFECYCLE_READINESS_COMPLETION_CERTIFICATION_PREREQUISITE_STALE"
    });
  }
  let parsed: PiCodexUnattendedRealHostCompletionCertificationPrerequisiteBody & {
    completion_certification_prerequisite_artifact?: unknown;
  };
  try {
    parsed = JSON.parse(content.toString("utf8")) as PiCodexUnattendedRealHostCompletionCertificationPrerequisiteBody & {
      completion_certification_prerequisite_artifact?: unknown;
    };
  } catch {
    throwLifecycleReadinessCompletionPrerequisiteInvalid(
      "Pi/Codex lifecycle readiness completion certification prerequisite JSON is invalid"
    );
  }
  if (
    parsed.schema_version !== "comath.pi_codex_unattended_real_host_completion_certification_prerequisite.v1" ||
    parsed.completion_certification_prerequisite_id !== prerequisiteId ||
    parsed.project_id !== projectId ||
    parsed.completion_certification_prerequisite_path !== canonicalPrerequisitePath ||
    parsed.completion_certification_prerequisite_artifact !== undefined ||
    parsed.completion_certification_prerequisite_status !==
      "blocked_terminal_unattended_completion_certification_required" ||
    parsed.terminal_goal_state !== "blocked_with_replayable_certificate" ||
    parsed.requested_completion_mode !== "production_unattended_real_host_completion" ||
    !Array.isArray(parsed.blocker_reasons) ||
    !parsed.blocker_reasons.includes("terminal_unattended_completion_certificate_missing") ||
    parsed.completion_certificate_available !== false ||
    parsed.terminal_unattended_completion_certified !== false ||
    parsed.unattended_real_host_execution_completed !== false ||
    parsed.operator_confirmation_bypassed !== false ||
    parsed.durable_transport_provided !== false ||
    parsed.live_transport_open !== false ||
    parsed.attempt_review_current !== true ||
    parsed.attempt_current !== true ||
    parsed.readiness_current !== true ||
    parsed.handoff_review_current !== true ||
    parsed.operator_approval_artifact_current !== true ||
    parsed.unattended_executor_contract_current !== true ||
    parsed.durable_transport_contract_current !== true ||
    parsed.service_owned_checkpoint_chain_reviewed !== true ||
    parsed.service_owned_attempt_review_completed !== true ||
    parsed.proof_authority !== "none" ||
    parsed.can_promote_claim !== false ||
    parsed.can_certify_ga !== false ||
    !hasLifecycleArtifactReference(parsed.attempt_review_artifact, "unattended_real_host_execution_attempt_review") ||
    !hasLifecycleArtifactReference(parsed.attempt_artifact, "unattended_real_host_execution_attempt") ||
    !hasLifecycleArtifactReference(parsed.readiness_artifact, "unattended_real_host_execution_readiness") ||
    !hasLifecycleArtifactReference(parsed.handoff_review_artifact, "unattended_real_host_handoff_review") ||
    !hasLifecycleArtifactReference(parsed.operator_approval_artifact, "unattended_real_host_operator_approval") ||
    !hasLifecycleArtifactReference(parsed.unattended_executor_contract_artifact, "unattended_real_host_executor_contract") ||
    !hasLifecycleArtifactReference(parsed.durable_transport_contract_artifact, "unattended_real_host_durable_transport_contract")
  ) {
    throwLifecycleReadinessCompletionPrerequisiteInvalid(
      "Pi/Codex lifecycle readiness completion certification prerequisite violates boundaries"
    );
  }
  return {
    completion_certification_prerequisite_id: prerequisiteId,
    completion_certification_prerequisite_status: parsed.completion_certification_prerequisite_status,
    terminal_goal_state: parsed.terminal_goal_state,
    artifact: {
      kind: "unattended_real_host_completion_certification_prerequisite",
      path: canonicalPrerequisitePath,
      sha256: actualSha256,
      size_bytes: content.byteLength
    },
    completion_certificate_available: false,
    terminal_unattended_completion_certified: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  };
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
  const completionCertificationPrerequisite = completionCertificationPrerequisiteBindingFromInput(
    projectRoot,
    input.project_id,
    input
  );
  const checks = buildChecks(installSession, codex, completionCertificationPrerequisite);
  const vetoes = buildVetoes(checks, codex, completionCertificationPrerequisite);
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
      codex_evidence: codex,
      ...(completionCertificationPrerequisite
        ? { completion_certification_prerequisite: completionCertificationPrerequisite }
        : {})
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
    actor: sanitizeOperatorTransportText(input.actor),
    target_id: input.project_id,
    payload: {
      review_id: reviewId,
      ok,
      readiness_status: review.readiness_status,
      veto_codes: vetoes.map((veto) => veto.code),
      review_path: reviewPath,
      ...(completionCertificationPrerequisite
        ? {
            completion_certification_prerequisite_id:
              completionCertificationPrerequisite.completion_certification_prerequisite_id,
            completion_certification_prerequisite_artifact_sha256:
              completionCertificationPrerequisite.artifact.sha256,
            terminal_unattended_completion_certified:
              completionCertificationPrerequisite.terminal_unattended_completion_certified
          }
        : {}),
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  });
  return review;
}
