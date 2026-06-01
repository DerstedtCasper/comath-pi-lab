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
