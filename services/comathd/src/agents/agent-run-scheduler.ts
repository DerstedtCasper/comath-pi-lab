import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync, mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
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
    if (sensitiveEnvironmentPattern.test(key)) {
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
  private active = 0;
  private readonly queue: QueuedLaunch[] = [];
  private readonly running = new Map<string, RunningLaunch>();
  private readonly launchReservationsAtMs: number[] = [];
  private readonly allowedPrograms: Set<string>;

  constructor(private readonly options: AgentRunSchedulerOptions) {
    assertPositiveInteger(options.max_concurrent, "max_concurrent");
    assertPositiveInteger(options.rpm, "rpm");
    if (options.allowed_programs.length === 0) {
      throw new ComathError("allowed_programs must not be empty", {
        statusCode: 400,
        code: "AGENT_RUN_SCHEDULER_INVALID_CONFIG"
      });
    }
    this.allowedPrograms = new Set(options.allowed_programs.map((program) => canonicalProgramPath(program, "allowed_program")));
  }

  launch(projectRoot: string, input: AgentRunLaunchInput): Promise<AgentRunProcessResult> {
    let command: AgentRunLaunchCommand;
    try {
      command = this.assertLaunchAllowed(projectRoot, input);
      this.reserveRateSlot(projectRoot, input);
    } catch (error) {
      return Promise.reject(error);
    }
    return new Promise((resolve, reject) => {
      this.queue.push({ projectRoot, input, command, resolve, reject });
      this.pump();
    });
  }

  cancel(runId: string, actor: string): boolean {
    const launch = this.running.get(runId);
    if (launch) {
      launch.cancel_actor = actor;
      terminateChildProcessTree(launch.child);
      return true;
    }
    const queuedIndex = this.queue.findIndex((task) => task.input.run_id === runId);
    if (queuedIndex === -1) {
      return false;
    }
    const [task] = this.queue.splice(queuedIndex, 1);
    const completedAtMs = Date.now();
    const cancelled = cancelQueuedAgentRun(task.projectRoot, {
      project_id: task.input.project_id,
      run_id: task.input.run_id,
      report_markdown: fallbackReport("queued_cancelled"),
      exit_reason: "queued_cancelled",
      actor
    });
    task.resolve({
      run_id: task.input.run_id,
      project_id: task.input.project_id,
      status: "cancelled",
      exit_code: null,
      signal: null,
      timed_out: false,
      cancelled: true,
      started_at_ms: completedAtMs,
      completed_at_ms: completedAtMs,
      stdout_path: `.tmp/comath/${cancelled.id}/logs/stdout.log`,
      stderr_path: `.tmp/comath/${cancelled.id}/logs/stderr.log`,
      report_path: cancelled.report_path
    });
    return true;
  }

  private assertLaunchAllowed(projectRoot: string, input: AgentRunLaunchInput): AgentRunLaunchCommand {
    getAgentRun(projectRoot, input.project_id, input.run_id);
    assertPositiveInteger(input.timeout_ms, "timeout_ms");
    assertCommandEnvAllowed(input.command.env);
    const commandProgram = canonicalProgramPath(input.command.program, "command.program");
    if (!this.allowedPrograms.has(commandProgram)) {
      throw new ComathError(`program is not allowlisted: ${input.command.program}`, {
        statusCode: 403,
        code: "AGENT_RUN_PROGRAM_NOT_ALLOWLISTED"
      });
    }
    return {
      ...input.command,
      program: commandProgram
    };
  }

  private reserveRateSlot(projectRoot: string, input: AgentRunLaunchInput): void {
    this.pruneRateWindow();
    if (this.launchReservationsAtMs.length >= this.options.rpm) {
      appendAuditEvent(projectRoot, {
        project_id: input.project_id,
        event_type: "agent_run.rate_limited",
        actor: input.actor,
        target_id: input.run_id,
        payload: {
          rpm: this.options.rpm
        }
      });
      throw new ComathError("AgentRun scheduler rate limit exceeded", {
        statusCode: 429,
        code: "AGENT_RUN_RATE_LIMITED"
      });
    }
    this.launchReservationsAtMs.push(Date.now());
  }

  private pruneRateWindow(nowMs = Date.now()): void {
    const cutoff = nowMs - 60_000;
    while (this.launchReservationsAtMs.length > 0 && this.launchReservationsAtMs[0] < cutoff) {
      this.launchReservationsAtMs.shift();
    }
  }

  private pump(): void {
    while (this.active < this.options.max_concurrent && this.queue.length > 0) {
      const task = this.queue.shift() as QueuedLaunch;
      this.active += 1;
      this.execute(task)
        .then(task.resolve, task.reject)
        .finally(() => {
          this.active -= 1;
          this.pump();
        });
    }
  }

  private async execute(task: QueuedLaunch): Promise<AgentRunProcessResult> {
    const { projectRoot, input } = task;
    task.command = this.assertLaunchAllowed(projectRoot, input);
    const run = startAgentRun(projectRoot, {
      project_id: input.project_id,
      run_id: input.run_id,
      actor: input.actor
    });
    const stdoutPathRel = `.tmp/comath/${run.id}/logs/stdout.log`;
    const stderrPathRel = `.tmp/comath/${run.id}/logs/stderr.log`;
    const stdoutPath = assertAgentRunWriteAllowed(projectRoot, run, stdoutPathRel);
    const stderrPath = assertAgentRunWriteAllowed(projectRoot, run, stderrPathRel);
    mkdirSync(dirname(stdoutPath), { recursive: true });

    const startedAtMs = Date.now();
    appendAuditEvent(projectRoot, {
      project_id: input.project_id,
      event_type: "agent_run.process_started",
      actor: input.actor,
      target_id: input.run_id,
      payload: {
        program: task.command.program,
        args: task.command.args ?? [],
        timeout_ms: input.timeout_ms,
        stdout_path: stdoutPathRel,
        stderr_path: stderrPathRel
      }
    });

    const child = spawn(task.command.program, task.command.args ?? [], {
      cwd: assertAgentRunWriteAllowed(projectRoot, run, `.tmp/comath/${run.id}/`),
      shell: false,
      windowsHide: true,
      detached: process.platform !== "win32",
      env: buildChildEnvironment(input, run)
    });
    this.running.set(input.run_id, { child });

    const stdoutCollector = createBoundedOutputCollector();
    const stderrCollector = createBoundedOutputCollector();
    let timedOut = false;
    let timeoutTermination: TerminationResult | undefined;
    const timer = setTimeout(() => {
      timedOut = true;
      timeoutTermination = terminateChildProcessTree(child);
    }, input.timeout_ms);

    child.stdout.on("data", (chunk: Buffer) => stdoutCollector.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderrCollector.push(chunk));

    const { code, signal } = await new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => {
      child.on("close", (exitCode, exitSignal) => {
        resolve({ code: exitCode, signal: exitSignal });
      });
      child.on("error", () => {
        resolve({ code: null, signal: null });
      });
    });
    clearTimeout(timer);
    const running = this.running.get(input.run_id);
    const cancelled = Boolean(running?.cancel_actor);
    this.running.delete(input.run_id);
    const stdout = stdoutCollector.text();
    const stderr = stderrCollector.text();
    writeFileSync(stdoutPath, stdout, "utf8");
    writeFileSync(stderrPath, stderr, "utf8");

    let status: AgentRunProcessStatus = cancelled ? "cancelled" : timedOut || code !== 0 ? "failed" : "succeeded";
    let exitReason = cancelled ? "cancelled" : timedOut ? "timeout" : code === 0 ? "process_completed" : "process_failed";
    if (status === "succeeded" && !hasRequiredReportHeadings(stdout)) {
      status = "failed";
      exitReason = "invalid_report";
    }
    let submitted = this.submitProcessReport(
      projectRoot,
      input,
      status,
      status === "succeeded" ? schedulerReport(exitReason, stdout) : fallbackReport(exitReason),
      exitReason,
      running?.cancel_actor
    );
    if (status === "succeeded" && submitted.status === "failed") {
      status = "failed";
      exitReason = submitted.exit_reason ?? "invalid_report";
    }
    const completedAtMs = Date.now();
    appendAuditEvent(projectRoot, {
      project_id: input.project_id,
      event_type: cancelled
        ? "agent_run.process_cancelled"
        : timedOut
          ? "agent_run.process_timed_out"
          : "agent_run.process_completed",
      actor: running?.cancel_actor ?? input.actor,
      target_id: input.run_id,
      payload: {
        status,
        exit_code: code,
        signal,
        timed_out: timedOut,
        termination: timeoutTermination,
        stdout_truncated: stdoutCollector.truncated(),
        stderr_truncated: stderrCollector.truncated(),
        stdout_path: stdoutPathRel,
        stderr_path: stderrPathRel,
        report_path: submitted.report_path
      }
    });

    return {
      run_id: input.run_id,
      project_id: input.project_id,
      status,
      exit_code: code,
      signal,
      timed_out: timedOut,
      cancelled,
      started_at_ms: startedAtMs,
      completed_at_ms: completedAtMs,
      stdout_path: stdoutPathRel,
      stderr_path: stderrPathRel,
      report_path: submitted.report_path
    };
  }

  private submitProcessReport(
    projectRoot: string,
    input: AgentRunLaunchInput,
    status: AgentRunProcessStatus,
    reportMarkdown: string,
    exitReason: string,
    cancelActor?: string
  ): AgentRun {
    try {
      return submitAgentRunReport(projectRoot, {
        project_id: input.project_id,
        run_id: input.run_id,
        status,
        report_markdown: reportMarkdown,
        exit_reason: exitReason,
        actor: cancelActor ?? input.actor
      });
    } catch (error) {
      if (status === "succeeded" && error instanceof ComathError && error.code === "AGENT_RUN_REPORT_INVALID") {
        return submitAgentRunReport(projectRoot, {
          project_id: input.project_id,
          run_id: input.run_id,
          status: "failed",
          report_markdown: fallbackReport("invalid_report"),
          exit_reason: "invalid_report",
          actor: input.actor
        });
      }
      throw error;
    }
  }
}

export function createAgentRunScheduler(options: AgentRunSchedulerOptions): AgentRunScheduler {
  return new AgentRunScheduler(options);
}
