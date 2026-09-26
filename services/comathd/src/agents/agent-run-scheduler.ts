import { withLegacyRuntime, runLegacyExecution, cancelLegacyExecution } from "./runtime/legacy-runtime-facade.js";
import { executeAgentProcess } from "./runtime/agent-process-executor.js";
import { getAcquiredProjectRuntime } from "../research/project-runtime.js";
import { importArtifact } from "../artifacts/store.js";
import { scanForSecrets } from "../security/secret-scan.js";
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync, mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { acquireProjectSessionLock, releaseProjectSessionLock, type ProjectSessionLock } from "../project/session-lock.js";
import {
  cancelQueuedAgentRun,
  getAgentRun,
  startAgentRun,
  submitAgentRunReport,
  assertAgentRunWriteAllowed
} from "./agent-run-store.js";
import type { AgentRun } from "../types/schemas.js";

export type AgentRunSchedulerOptions = {
  max_concurrent: number;
  rpm: number;
  allowed_programs: string[];
};

export type AgentRunLaunchCommand = {
  program: string;
  args?: string[];
  env?: Record<string, string>;
};

export type AgentRunLaunchInput = {
  project_id: string;
  run_id: string;
  command: AgentRunLaunchCommand;
  timeout_ms: number;
  actor: string;
};

export type AgentRunProcessStatus = "succeeded" | "failed" | "cancelled";

export type AgentRunProcessResult = {
  run_id: string;
  project_id: string;
  status: AgentRunProcessStatus;
  exit_code: number | null;
  signal: NodeJS.Signals | null;
  timed_out: boolean;
  cancelled: boolean;
  started_at_ms: number;
  completed_at_ms: number;
  stdout_path: string;
  stderr_path: string;
  report_path?: string;
};

export type OperatorCancelAgentRunInput = {
  project_id: string;
  run_id: string;
  actor: string;
};

export type OperatorCancelAgentRunResult = {
  project_id: string;
  run_id: string;
  cancelled: boolean;
  proof_authority: "none";
  reason?: string;
};

type QueuedLaunch = {
  projectRoot: string;
  input: AgentRunLaunchInput;
  command: AgentRunLaunchCommand;
  resolve: (result: AgentRunProcessResult) => void;
  reject: (error: unknown) => void;
};

type RunningLaunch = {
  child: ChildProcessWithoutNullStreams;
  cancel_actor?: string;
};

type ActiveSchedulerEntry = {
  projectRoot: string;
  projectId: string;
  scheduler: AgentRunScheduler;
};

type BoundedOutputCollector = {
  push(chunk: Buffer): void;
  text(): string;
  truncated(): boolean;
};

type TerminationResult = {
  signal_sent: boolean;
  process_tree_attempted: boolean;
  process_tree_succeeded: boolean;
  escalation_scheduled: boolean;
};

const outputByteLimit = 256 * 1024;
const truncationMarker = "\n[COMATH_OUTPUT_TRUNCATED]\n";

const reportHeadings = [
  "# Agent Report",
  "",
  "## Input Context",
  "Scheduler-generated terminal report.",
  "",
  "## Actions Taken",
  "A child process was launched by the AgentRun scheduler.",
  "",
  "## Claims Proposed",
  "No trusted claim promotion.",
  "",
  "## Evidence Produced",
  "Process stdout/stderr logs only.",
  "",
  "## Graph Patch",
  "No GraphPatch authority.",
  "",
  "## Blockers",
  "See exit reason.",
  "",
  "## Failed Routes",
  "Child process did not produce an accepted proof route.",
  "",
  "## Self-Review",
  "No proof authority claimed.",
  "",
  "## Next Actions",
  "Inspect logs and rerun through an independent workstream if useful."
] as const;

const inheritedEnvironmentAllowlist =
  process.platform === "win32"
    ? ["PATH", "PATHEXT", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "COMSPEC", "NUMBER_OF_PROCESSORS", "PROCESSOR_ARCHITECTURE"]
    : ["PATH", "TMPDIR", "TEMP", "TMP", "LANG", "LC_ALL"];

const sensitiveEnvironmentPattern =
  /(?:KEY|TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL|AUTH|COOKIE|SESSION|PRIVATE|SSH|OPENAI|ANTHROPIC|AZURE|AWS|GOOGLE|GITHUB|CLOUD)/i;
const explicitNonSecretEnvironmentKeys = new Set([
  "COMATH_PROOF_AUTHORITY",
  "COMATH_CODEX_ADAPTER_BACKEND",
  "COMATH_CODEX_EXTERNAL_PROGRAM",
  "COMATH_CODEX_EXTERNAL_PREFIX_ARGS"
]);

const activeSchedulerRegistry = new Map<string, ActiveSchedulerEntry>();

function registryKey(projectRoot: string, projectId: string, runId: string): string {
  return `${resolve(projectRoot)}\0${projectId}\0${runId}`;
}

function registerActiveScheduler(projectRoot: string, projectId: string, runId: string, scheduler: AgentRunScheduler): void {
  activeSchedulerRegistry.set(registryKey(projectRoot, projectId, runId), { projectRoot: resolve(projectRoot), projectId, scheduler });
}

function unregisterActiveScheduler(projectRoot: string, projectId: string, runId: string): void {
  activeSchedulerRegistry.delete(registryKey(projectRoot, projectId, runId));
}

function getActiveScheduler(projectRoot: string, projectId: string, runId: string): ActiveSchedulerEntry | undefined {
  return activeSchedulerRegistry.get(registryKey(projectRoot, projectId, runId));
}

export function isAgentRunCancellableByOperator(projectRoot: string, projectId: string, runId: string): boolean {
  const task = getAcquiredProjectRuntime(projectRoot)?.store.getTask(`LEGACY-${runId}`);
  return Boolean(task && ["queued", "leased", "running", "cancelling"].includes(task.status));
}

export function cancelAgentRunFromOperator(projectRoot: string, input: OperatorCancelAgentRunInput): OperatorCancelAgentRunResult {
  const run = getAgentRun(projectRoot, input.project_id, input.run_id);
  if (["succeeded", "failed", "cancelled"].includes(run.status)) {
    throw new ComathError("terminal AgentRun cannot be cancelled", {
      statusCode: 409,
      code: "AGENT_RUN_NOT_CANCELLABLE"
    });
  }
  const active = getActiveScheduler(projectRoot, input.project_id, input.run_id);
  if (!active && !isAgentRunCancellableByOperator(projectRoot, input.project_id, input.run_id)) {
    throw new ComathError("AgentRun is not cancellable in this service process", {
      statusCode: 409,
      code: "AGENT_RUN_NOT_CANCELLABLE"
    });
  }
  const cancelled = active ? active.scheduler.cancel(input.run_id, input.actor) : cancelLegacyExecution(projectRoot, input.run_id, input.actor);
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "agent_run.operator_cancel_requested",
    actor: input.actor,
    target_id: input.run_id,
    payload: {
      cancelled,
      status: run.status,
      proof_authority: "none"
    }
  });
  return {
    project_id: input.project_id,
    run_id: input.run_id,
    cancelled,
    proof_authority: "none",
    reason: cancelled ? undefined : "scheduler did not accept cancellation"
  };
}

function fallbackReport(exitReason: string): string {
  return [...reportHeadings, "", `Exit reason: ${exitReason}`, ""].join("\n");
}

function hasRequiredReportHeadings(reportMarkdown: string): boolean {
  return reportHeadings
    .filter((line) => line.startsWith("#"))
    .every((heading) => {
      const pattern = new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "m");
      return pattern.test(reportMarkdown);
    });
}

function schedulerReport(exitReason: string, childStdout: string): string {
  const stdoutExcerpt = childStdout.slice(0, 16 * 1024).trimEnd();
  return [
    "# Agent Report",
    "",
    "## Input Context",
    "Scheduler-generated terminal report.",
    "",
    "## Actions Taken",
    "A child process was launched by the AgentRun scheduler.",
    "",
    "## Claims Proposed",
    "proof_authority: none",
    "supports_claim_status: none",
    "",
    "## Evidence Produced",
    "child_stdout_untrusted: true",
    `exit_reason: ${exitReason}`,
    "",
    stdoutExcerpt ? "Child stdout excerpt:" : "Child stdout excerpt: <empty>",
    stdoutExcerpt,
    "",
    "## Graph Patch",
    "No GraphPatch authority.",
    "",
    "## Blockers",
    "None recorded by scheduler.",
    "",
    "## Failed Routes",
    "Child process output is untrusted until independently reviewed.",
    "",
    "## Self-Review",
    "No proof authority claimed.",
    "",
    "## Next Actions",
    "Inspect logs and route any useful material through independent review."
  ].join("\n");
}

function assertPositiveInteger(value: number, field: string): void {
  if (Number.isInteger(value) && value > 0) {
    return;
  }
  throw new ComathError(`${field} must be a positive integer`, {
    statusCode: 400,
    code: "AGENT_RUN_SCHEDULER_INVALID_CONFIG"
  });
}

function normalizeAllowedProgram(program: string): string {
  return process.platform === "win32" ? program.toLowerCase() : program;
}

function canonicalProgramPath(program: string, field: string): string {
  if (!isAbsolute(program)) {
    throw new ComathError(`${field} must be an absolute path`, {
      statusCode: 400,
      code: "AGENT_RUN_PROGRAM_NOT_ABSOLUTE"
    });
  }
  const absoluteProgram = resolve(program);
  if (!existsSync(absoluteProgram)) {
    throw new ComathError(`${field} does not exist: ${program}`, {
      statusCode: 400,
      code: "AGENT_RUN_PROGRAM_NOT_FOUND"
    });
  }
  return normalizeAllowedProgram(realpathSync.native(absoluteProgram));
}

function createBoundedOutputCollector(limitBytes = outputByteLimit): BoundedOutputCollector {
  const chunks: Buffer[] = [];
  let storedBytes = 0;
  let wasTruncated = false;

  return {
    push(chunk: Buffer): void {
      if (storedBytes >= limitBytes) {
        wasTruncated = true;
        return;
      }
      const remaining = limitBytes - storedBytes;
      if (chunk.byteLength > remaining) {
        chunks.push(chunk.subarray(0, remaining));
        storedBytes += remaining;
        wasTruncated = true;
        return;
      }
      chunks.push(chunk);
      storedBytes += chunk.byteLength;
    },
    text(): string {
      const text = Buffer.concat(chunks).toString("utf8");
      return wasTruncated ? `${text}${truncationMarker}` : text;
    },
    truncated(): boolean {
      return wasTruncated;
    }
  };
}

function assertCommandEnvAllowed(env: Record<string, string> = {}): void {
  for (const [key, value] of Object.entries(env)) {
    if (typeof value !== "string") {
      throw new ComathError(`environment variable must be a string: ${key}`, {
        statusCode: 400,
        code: "AGENT_RUN_ENV_INVALID"
      });
    }
    if (!explicitNonSecretEnvironmentKeys.has(key) && sensitiveEnvironmentPattern.test(key)) {
      throw new ComathError(`environment variable is not allowed: ${key}`, {
        statusCode: 403,
        code: "AGENT_RUN_ENV_DENIED"
      });
    }
  }
}

function buildChildEnvironment(input: AgentRunLaunchInput, run: AgentRun): NodeJS.ProcessEnv {
  const childEnv: NodeJS.ProcessEnv = {};
  for (const key of inheritedEnvironmentAllowlist) {
    const value = process.env[key];
    if (typeof value === "string") {
      childEnv[key] = value;
    }
  }
  return {
    ...childEnv,
    ...input.command.env,
    COMATH_PROJECT_ID: input.project_id,
    COMATH_AGENT_RUN_ID: input.run_id,
    COMATH_WORKSTREAM_ID: run.workstream_id
  };
}

function terminateChildProcessTree(child: ChildProcessWithoutNullStreams): TerminationResult {
  const result: TerminationResult = {
    signal_sent: false,
    process_tree_attempted: false,
    process_tree_succeeded: false,
    escalation_scheduled: false
  };

  if (child.pid && process.platform === "win32") {
    result.process_tree_attempted = true;
    const taskkill = spawnSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], {
      windowsHide: true,
      stdio: "ignore"
    });
    result.process_tree_succeeded = taskkill.status === 0;
    if (result.process_tree_succeeded) {
      result.signal_sent = true;
      return result;
    }
  }

  if (child.pid && process.platform !== "win32") {
    result.process_tree_attempted = true;
    try {
      process.kill(-child.pid, "SIGTERM");
      result.process_tree_succeeded = true;
      result.signal_sent = true;
      result.escalation_scheduled = true;
      const processGroupId = child.pid;
      const escalation = setTimeout(() => {
        try {
          process.kill(-processGroupId, "SIGKILL");
        } catch {
          // The process tree may already have exited after SIGTERM.
        }
      }, 1_000);
      escalation.unref?.();
      return result;
    } catch {
      result.process_tree_succeeded = false;
    }
  }

  result.signal_sent = child.kill();
  return result;
}

export class AgentRunScheduler {
  private readonly allowedPrograms: Set<string>;
  // Connection lookup only. Admission state and cancellation intent live in SQLite.
  private readonly connectionRoots = new Map<string, string>();
  constructor(private readonly options: AgentRunSchedulerOptions) {
    assertPositiveInteger(options.max_concurrent, "max_concurrent");
    assertPositiveInteger(options.rpm, "rpm");
    if (!options.allowed_programs.length) throw new ComathError("allowed_programs must not be empty", { code: "AGENT_RUN_SCHEDULER_INVALID_CONFIG" });
    this.allowedPrograms = new Set(options.allowed_programs.map(program => canonicalProgramPath(program, "allowed_program")));
  }
  async launch(projectRoot: string, input: AgentRunLaunchInput): Promise<AgentRunProcessResult> {
    const program = canonicalProgramPath(input.command.program, "command.program");
    if (!this.allowedPrograms.has(program)) throw new ComathError("program is not host allowlisted", { code: "AGENT_RUN_PROGRAM_NOT_ALLOWLISTED", statusCode: 403 });
    assertCommandEnvAllowed(input.command.env);
    return withLegacyRuntime(projectRoot, async () => {
      getAgentRun(projectRoot, input.project_id, input.run_id);
      this.connectionRoots.set(input.run_id, projectRoot);
      registerActiveScheduler(projectRoot, input.project_id, input.run_id, this);
      try {
        return await runLegacyExecution(projectRoot, { project_id: input.project_id, run_id: input.run_id, backend: "process", timeout_ms: input.timeout_ms, actor: input.actor }, async (grant, signal) => {
          const runtime = getAcquiredProjectRuntime(projectRoot)!;
          const run = startAgentRun(projectRoot, { project_id: input.project_id, run_id: input.run_id, actor: input.actor });
          const stdoutPath = `.tmp/comath/${run.id}/logs/stdout.log`, stderrPath = `.tmp/comath/${run.id}/logs/stderr.log`;
          const started = Date.now();
          let processResult;
          try { processResult = await executeAgentProcess({ runtime, grant, command: { ...input.command, program, env: buildChildEnvironment(input, run) as Record<string,string> },
            cwd: assertAgentRunWriteAllowed(projectRoot, run, `.tmp/comath/${run.id}/`), timeout_ms: input.timeout_ms, signal,
            stdout_path: stdoutPath, stderr_path: stderrPath, allowed_programs: [...this.allowedPrograms], onStarted: handle => {
              appendAuditEvent(projectRoot, { project_id: input.project_id, event_type: "agent_run.process_started", actor: input.actor, target_id: run.id,
                payload: { program: handle.binary_path, binary_sha256: handle.binary_sha256, pid: handle.pid, attempt_key: grant.attempt_key, stdout_path: stdoutPath, stderr_path: stderrPath } });
            } }); }
          catch (cause) {
            const attempt = runtime.store.get("SELECT runtime_handle_json FROM attempts WHERE attempt_key=?", grant.attempt_key);
            if (!signal.aborted || attempt?.runtime_handle_json) throw cause;
            const submitted = submitAgentRunReport(projectRoot, { project_id: input.project_id, run_id: run.id, status: "cancelled", actor: input.actor, report_markdown: fallbackReport("cancelled"), exit_reason: "cancelled" });
            appendAuditEvent(projectRoot, { project_id: input.project_id, event_type: "agent_run.process_cancelled", actor: input.actor, target_id: run.id, payload: { started: false, termination_confirmed: true } });
            return { value: { run_id: run.id, project_id: input.project_id, status: "cancelled" as const, exit_code: null, signal: null, timed_out: false, cancelled: true,
              started_at_ms: started, completed_at_ms: Date.now(), stdout_path: stdoutPath, stderr_path: stderrPath, report_path: submitted.report_path }, status: "cancelled" as const, termination_confirmed: true };
          }
          let status: AgentRunProcessStatus = processResult.cancelled ? "cancelled" : processResult.timed_out || processResult.exit_code !== 0 ? "failed" : "succeeded";
          let reason = processResult.cancelled ? "cancelled" : processResult.timed_out ? "timeout" : status === "succeeded" ? "process_completed" : "process_failed";
          const reportSource = hasRequiredReportHeadings(processResult.stdout.tail) ? processResult.stdout.tail : processResult.stdout.text;
          if (status === "succeeded" && !hasRequiredReportHeadings(reportSource)) { status = "failed"; reason = "invalid_report"; }
          const logArtifacts: string[] = [];
          for (const logPath of [stdoutPath, stderrPath]) {
            const absolute = assertAgentRunWriteAllowed(projectRoot, run, logPath);
            if (scanForSecrets(absolute).blocks_import) { writeFileSync(absolute, "[COMATH_LOG_BLOCKED_BY_SECRET_SCAN]\n", "utf8"); status = "failed"; reason = "secret_scan_blocked"; }
            else logArtifacts.push((await importArtifact({ projectRoot, project_id: input.project_id, source_path: logPath, kind: "other", actor: "service:process-log" })).id);
          }
          if (signal.aborted) { status = "cancelled"; reason = "cancelled"; }
          const submitted = submitAgentRunReport(projectRoot, { project_id: input.project_id, run_id: run.id, status,
            report_markdown: status === "succeeded" ? schedulerReport(reason, reportSource) : fallbackReport(reason), exit_reason: reason, actor: input.actor });
          appendAuditEvent(projectRoot, { project_id: input.project_id, event_type: processResult.cancelled ? "agent_run.process_cancelled" : processResult.timed_out ? "agent_run.process_timed_out" : "agent_run.process_completed",
            actor: input.actor, target_id: run.id, payload: { status, exit_code: processResult.exit_code, signal: processResult.signal, timed_out: processResult.timed_out,
              termination_confirmed: processResult.termination_confirmed, stdout_truncated: processResult.stdout.truncated, stderr_truncated: processResult.stderr.truncated,
              stdout_bytes_seen: processResult.stdout.bytes_seen, stderr_bytes_seen: processResult.stderr.bytes_seen, log_artifact_ids: logArtifacts, stdout_path: stdoutPath, stderr_path: stderrPath, report_path: submitted.report_path } });
          return { value: { run_id: run.id, project_id: input.project_id, status, exit_code: processResult.exit_code, signal: processResult.signal,
            timed_out: processResult.timed_out, cancelled: processResult.cancelled, started_at_ms: started, completed_at_ms: Date.now(), stdout_path: stdoutPath, stderr_path: stderrPath, report_path: submitted.report_path }, status, termination_confirmed: processResult.termination_confirmed };
        }, () => {
          const run = cancelQueuedAgentRun(projectRoot, { project_id: input.project_id, run_id: input.run_id, actor: input.actor, report_markdown: fallbackReport("queued_cancelled"), exit_reason: "queued_cancelled" });
          const now = Date.now();
          return { run_id: run.id, project_id: input.project_id, status: "cancelled", exit_code: null, signal: null, timed_out: false, cancelled: true,
            started_at_ms: now, completed_at_ms: now, stdout_path: `.tmp/comath/${run.id}/logs/stdout.log`, stderr_path: `.tmp/comath/${run.id}/logs/stderr.log`, report_path: run.report_path };
        });
      } finally { unregisterActiveScheduler(projectRoot, input.project_id, input.run_id); this.connectionRoots.delete(input.run_id); }
    });
  }
  cancel(runId: string, actor: string): boolean {
    const root = this.connectionRoots.get(runId);
    return root ? cancelLegacyExecution(root, runId, actor) : false;
  }
}
export function createAgentRunScheduler(options: AgentRunSchedulerOptions): AgentRunScheduler { return new AgentRunScheduler(options); }
