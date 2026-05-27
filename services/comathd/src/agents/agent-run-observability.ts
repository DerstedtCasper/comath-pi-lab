import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { getAgentRun } from "./agent-run-store.js";
import { getAgentProfile, type AgentProfileId } from "./agent-profiles.js";

export type ReadAgentRunLogsInput = {
  project_id: string;
  run_id: string;
  max_bytes?: number;
  actor?: string;
};

export type AgentRunLogs = {
  project_id: string;
  run_id: string;
  status: string;
  proof_authority: "none";
  stdout_path: string;
  stderr_path: string;
  report_path?: string;
  stdout: string;
  stderr: string;
  stdout_truncated: boolean;
  stderr_truncated: boolean;
};

export type AgentRunLogCursor = {
  stdout: number;
  stderr: number;
};

export type StreamAgentRunLogsInput = {
  project_id: string;
  run_id: string;
  cursor?: Partial<AgentRunLogCursor>;
  max_bytes?: number;
  actor?: string;
};

export type AgentRunLogStream = {
  project_id: string;
  run_id: string;
  status: string;
  proof_authority: "none";
  stdout_path: string;
  stderr_path: string;
  cursor: AgentRunLogCursor;
  next_cursor: AgentRunLogCursor;
  chunks: {
    stdout: string;
    stderr: string;
  };
  truncated: {
    stdout: boolean;
    stderr: boolean;
  };
  sizes: AgentRunLogCursor;
  complete: boolean;
};

export type FormatAgentRunLogSseSnapshotInput = StreamAgentRunLogsInput & {
  retry_ms?: number;
};

export type AgentRunLogSseSnapshot = {
  project_id: string;
  run_id: string;
  content_type: "text/event-stream; charset=utf-8";
  proof_authority: "none";
  body: string;
  stream: AgentRunLogStream;
};

export type ReadAgentRunOperatorPanelInput = StreamAgentRunLogsInput;

export type AgentRunOperatorPanel = {
  project_id: string;
  run: ReturnType<typeof getAgentRun>;
  proof_authority: "none";
  endpoints: {
    logs: string;
    log_stream: string;
    log_subscription: string;
  };
  actions: {
    read_logs: { enabled: true; endpoint: string };
    stream_logs: { enabled: true; endpoint: string };
    subscribe_logs: { enabled: true; endpoint: string };
    cancel: { enabled: false; reason: string };
  };
  log_stream: AgentRunLogStream;
  log_subscription: AgentRunLogSseSnapshot;
};

export type ProbeAgentAdapterHealthInput = {
  project_id: string;
  profile_id: AgentProfileId;
  program: string;
  adapter_args?: string[];
  timeout_ms?: number;
  actor: string;
};

export type AgentAdapterHealth = {
  ok: boolean;
  project_id: string;
  profile_id: AgentProfileId;
  proof_authority: "none";
  exit_code: number | null;
  signal: NodeJS.Signals | null;
  timed_out: boolean;
  version?: string;
  capabilities: string[];
  stdout: string;
  stderr: string;
};

const defaultLogMaxBytes = 64 * 1024;
const healthOutputMaxBytes = 16 * 1024;
const inheritedHealthEnvironmentAllowlist =
  process.platform === "win32"
    ? ["PATH", "PATHEXT", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "COMSPEC"]
    : ["PATH", "TMPDIR", "TEMP", "TMP", "LANG", "LC_ALL"];

function normalizeRelative(path: string): string {
  return path.split(sep).join("/");
}

function assertPositiveInteger(value: number, field: string): void {
  if (Number.isInteger(value) && value > 0) {
    return;
  }
  throw new ComathError(`${field} must be a positive integer`, {
    statusCode: 400,
    code: "AGENT_OBSERVABILITY_INVALID_LIMIT"
  });
}

function assertNonNegativeInteger(value: number, field: string): void {
  if (Number.isInteger(value) && value >= 0) {
    return;
  }
  throw new ComathError(`${field} must be a non-negative integer`, {
    statusCode: 400,
    code: "AGENT_OBSERVABILITY_INVALID_CURSOR"
  });
}

function assertSseRetryMs(value: number, field: string): void {
  if (Number.isInteger(value) && value >= 0 && value <= 600_000) {
    return;
  }
  throw new ComathError(`${field} must be an integer between 0 and 600000`, {
    statusCode: 400,
    code: "AGENT_OBSERVABILITY_INVALID_RETRY"
  });
}

function assertProjectRelativePath(path: string, field: string): void {
  if (!path || isAbsolute(path) || path.includes("..")) {
    throw new ComathError(`${field} must be project-relative`, {
      statusCode: 400,
      code: "AGENT_OBSERVABILITY_PATH_DENIED"
    });
  }
}

function assertReadableProjectPath(projectRoot: string, relativePath: string, field: string): string {
  assertProjectRelativePath(relativePath, field);
  const root = resolve(projectRoot);
  const absolute = resolve(root, relativePath);
  const rel = relative(root, absolute);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new ComathError(`${field} escapes project root`, {
      statusCode: 400,
      code: "AGENT_OBSERVABILITY_PATH_DENIED"
    });
  }
  if (!existsSync(absolute)) {
    return absolute;
  }
  const realRoot = existsSync(root) ? realpathSync.native(root) : root;
  const realPath = realpathSync.native(absolute);
  const realRel = relative(realRoot, realPath);
  if (realRel.startsWith("..") || isAbsolute(realRel)) {
    throw new ComathError(`${field} realpath escapes project root`, {
      statusCode: 400,
      code: "AGENT_OBSERVABILITY_REALPATH_DENIED"
    });
  }
  return absolute;
}

function readBoundedText(path: string, maxBytes: number): { text: string; truncated: boolean } {
  if (!existsSync(path)) {
    return { text: "", truncated: false };
  }
  const buffer = readFileSync(path);
  const truncated = buffer.byteLength > maxBytes;
  return {
    text: buffer.subarray(0, maxBytes).toString("utf8"),
    truncated
  };
}

function readStreamChunk(path: string, cursor: number, maxBytes: number): { text: string; next: number; size: number; truncated: boolean } {
  if (!existsSync(path)) {
    return { text: "", next: cursor, size: 0, truncated: false };
  }
  const buffer = readFileSync(path);
  const size = buffer.byteLength;
  const safeCursor = Math.min(cursor, size);
  const end = Math.min(safeCursor + maxBytes, size);
  return {
    text: buffer.subarray(safeCursor, end).toString("utf8"),
    next: end,
    size,
    truncated: end < size
  };
}

function canonicalProgramPath(program: string): string {
  if (!isAbsolute(program)) {
    throw new ComathError("program must be an absolute path", {
      statusCode: 400,
      code: "AGENT_ADAPTER_HEALTH_PROGRAM_NOT_ABSOLUTE"
    });
  }
  const absoluteProgram = resolve(program);
  if (!existsSync(absoluteProgram)) {
    throw new ComathError(`program does not exist: ${program}`, {
      statusCode: 400,
      code: "AGENT_ADAPTER_HEALTH_PROGRAM_NOT_FOUND"
    });
  }
  return realpathSync.native(absoluteProgram);
}

function buildHealthEnvironment(profileId: AgentProfileId): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const key of inheritedHealthEnvironmentAllowlist) {
    const value = process.env[key];
    if (typeof value === "string") {
      env[key] = value;
    }
  }
  env.COMATH_AGENT_PROFILE_ID = profileId;
  env.COMATH_PROOF_AUTHORITY = "none";
  return env;
}

function boundedProcessText(value: string | Buffer | null | undefined): string {
  const text = Buffer.isBuffer(value) ? value.toString("utf8") : String(value ?? "");
  return Buffer.from(text, "utf8").subarray(0, healthOutputMaxBytes).toString("utf8");
}

function parseHealthPayload(stdout: string): { version?: string; capabilities: string[] } {
  const firstLine = stdout.split(/\r?\n/).find((line) => line.trim().length > 0);
  if (!firstLine) {
    return { capabilities: [] };
  }
  try {
    const parsed = JSON.parse(firstLine) as { version?: unknown; capabilities?: unknown };
    return {
      version: typeof parsed.version === "string" ? parsed.version : undefined,
      capabilities: Array.isArray(parsed.capabilities) ? parsed.capabilities.map(String) : []
    };
  } catch {
    return { capabilities: [] };
  }
}

export function readAgentRunLogs(projectRoot: string, input: ReadAgentRunLogsInput): AgentRunLogs {
  const maxBytes = input.max_bytes ?? defaultLogMaxBytes;
  assertPositiveInteger(maxBytes, "max_bytes");
  const run = getAgentRun(projectRoot, input.project_id, input.run_id);
  const stdoutPath = `.tmp/comath/${run.id}/logs/stdout.log`;
  const stderrPath = `.tmp/comath/${run.id}/logs/stderr.log`;
  const stdout = readBoundedText(assertReadableProjectPath(projectRoot, stdoutPath, "stdout_path"), maxBytes);
  const stderr = readBoundedText(assertReadableProjectPath(projectRoot, stderrPath, "stderr_path"), maxBytes);
  if (run.report_path) {
    assertReadableProjectPath(projectRoot, run.report_path, "report_path");
  }
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "agent_run.logs_read",
    actor: input.actor ?? "api",
    target_id: run.id,
    payload: {
      max_bytes: maxBytes,
      stdout_path: stdoutPath,
      stderr_path: stderrPath,
      report_path: run.report_path,
      proof_authority: "none"
    }
  });
  return {
    project_id: run.project_id,
    run_id: run.id,
    status: run.status,
    proof_authority: "none",
    stdout_path: stdoutPath,
    stderr_path: stderrPath,
    report_path: run.report_path,
    stdout: stdout.text,
    stderr: stderr.text,
    stdout_truncated: stdout.truncated,
    stderr_truncated: stderr.truncated
  };
}

export function streamAgentRunLogs(projectRoot: string, input: StreamAgentRunLogsInput): AgentRunLogStream {
  const maxBytes = input.max_bytes ?? defaultLogMaxBytes;
  assertPositiveInteger(maxBytes, "max_bytes");
  const cursor = {
    stdout: input.cursor?.stdout ?? 0,
    stderr: input.cursor?.stderr ?? 0
  };
  assertNonNegativeInteger(cursor.stdout, "cursor.stdout");
  assertNonNegativeInteger(cursor.stderr, "cursor.stderr");
  const run = getAgentRun(projectRoot, input.project_id, input.run_id);
  const stdoutPath = `.tmp/comath/${run.id}/logs/stdout.log`;
  const stderrPath = `.tmp/comath/${run.id}/logs/stderr.log`;
  const stdout = readStreamChunk(assertReadableProjectPath(projectRoot, stdoutPath, "stdout_path"), cursor.stdout, maxBytes);
  const stderr = readStreamChunk(assertReadableProjectPath(projectRoot, stderrPath, "stderr_path"), cursor.stderr, maxBytes);
  const nextCursor = { stdout: stdout.next, stderr: stderr.next };
  const terminal = ["succeeded", "failed", "cancelled"].includes(run.status);
  const complete = terminal && nextCursor.stdout >= stdout.size && nextCursor.stderr >= stderr.size;
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "agent_run.logs_streamed",
    actor: input.actor ?? "api",
    target_id: run.id,
    payload: {
      cursor,
      next_cursor: nextCursor,
      max_bytes: maxBytes,
      stdout_path: stdoutPath,
      stderr_path: stderrPath,
      stdout_bytes: stdout.text.length,
      stderr_bytes: stderr.text.length,
      complete,
      proof_authority: "none"
    }
  });
  return {
    project_id: run.project_id,
    run_id: run.id,
    status: run.status,
    proof_authority: "none",
    stdout_path: stdoutPath,
    stderr_path: stderrPath,
    cursor,
    next_cursor: nextCursor,
    chunks: {
      stdout: stdout.text,
      stderr: stderr.text
    },
    truncated: {
      stdout: stdout.truncated,
      stderr: stderr.truncated
    },
    sizes: {
      stdout: stdout.size,
      stderr: stderr.size
    },
    complete
  };
}

function sseDataLines(payload: unknown): string {
  const json = JSON.stringify(payload);
  return json
    .split(/\r?\n/)
    .map((line) => `data: ${line}`)
    .join("\n");
}

export function formatAgentRunLogSseSnapshot(projectRoot: string, input: FormatAgentRunLogSseSnapshotInput): AgentRunLogSseSnapshot {
  const retryMs = input.retry_ms ?? 1000;
  assertSseRetryMs(retryMs, "retry_ms");
  const stream = streamAgentRunLogs(projectRoot, input);
  const eventId = `${stream.run_id}:${stream.next_cursor.stdout}:${stream.next_cursor.stderr}`;
  const payload = {
    event: "agent_run.log_chunk",
    project_id: stream.project_id,
    run_id: stream.run_id,
    status: stream.status,
    proof_authority: "none" as const,
    cursor: stream.cursor,
    next_cursor: stream.next_cursor,
    chunks: stream.chunks,
    truncated: stream.truncated,
    sizes: stream.sizes,
    complete: stream.complete
  };
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "agent_run.logs_sse_snapshot",
    actor: input.actor ?? "api",
    target_id: stream.run_id,
    payload: {
      cursor: stream.cursor,
      next_cursor: stream.next_cursor,
      max_bytes: input.max_bytes ?? defaultLogMaxBytes,
      retry_ms: retryMs,
      complete: stream.complete,
      proof_authority: "none"
    }
  });
  return {
    project_id: stream.project_id,
    run_id: stream.run_id,
    content_type: "text/event-stream; charset=utf-8",
    proof_authority: "none",
    stream,
    body: [`retry: ${retryMs}`, "event: agent_run.log_chunk", `id: ${eventId}`, sseDataLines(payload), ""].join("\n")
  };
}

export function readAgentRunOperatorPanel(projectRoot: string, input: ReadAgentRunOperatorPanelInput): AgentRunOperatorPanel {
  const run = getAgentRun(projectRoot, input.project_id, input.run_id);
  const encodedRunId = encodeURIComponent(run.id);
  const endpoints = {
    logs: `/agent/run/${encodedRunId}/logs`,
    log_stream: `/agent/run/${encodedRunId}/log-stream`,
    log_subscription: `/agent/run/${encodedRunId}/log-subscription`
  };
  const stream = streamAgentRunLogs(projectRoot, input);
  const subscription = formatAgentRunLogSseSnapshot(projectRoot, input);
  const terminal = ["succeeded", "failed", "cancelled"].includes(run.status);
  const cancelReason = terminal
    ? "terminal AgentRun cannot be cancelled"
    : "cancel requires an active scheduler registry in the current service process";
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "agent_run.operator_panel_read",
    actor: input.actor ?? "api",
    target_id: run.id,
    payload: {
      status: run.status,
      cursor: stream.cursor,
      next_cursor: stream.next_cursor,
      actions: ["read_logs", "stream_logs", "subscribe_logs"],
      cancel_enabled: false,
      cancel_reason: cancelReason,
      proof_authority: "none"
    }
  });
  return {
    project_id: run.project_id,
    run,
    proof_authority: "none",
    endpoints,
    actions: {
      read_logs: { enabled: true, endpoint: endpoints.logs },
      stream_logs: { enabled: true, endpoint: endpoints.log_stream },
      subscribe_logs: { enabled: true, endpoint: endpoints.log_subscription },
      cancel: { enabled: false, reason: cancelReason }
    },
    log_stream: stream,
    log_subscription: subscription
  };
}

export function probeAgentAdapterHealth(projectRoot: string, input: ProbeAgentAdapterHealthInput): AgentAdapterHealth {
  const profile = getAgentProfile(input.profile_id);
  const program = canonicalProgramPath(input.program);
  const timeoutMs = input.timeout_ms ?? 10_000;
  assertPositiveInteger(timeoutMs, "timeout_ms");
  const result = spawnSync(program, [...(input.adapter_args ?? []), "--health", "--profile", profile.id], {
    cwd: resolve(projectRoot),
    shell: false,
    windowsHide: true,
    timeout: timeoutMs,
    encoding: "utf8",
    maxBuffer: healthOutputMaxBytes,
    env: buildHealthEnvironment(profile.id)
  });
  const stdout = boundedProcessText(result.stdout);
  const stderr = boundedProcessText(result.stderr);
  const payload = parseHealthPayload(stdout);
  const health: AgentAdapterHealth = {
    ok: result.status === 0 && !result.error,
    project_id: input.project_id,
    profile_id: profile.id,
    proof_authority: "none",
    exit_code: result.status,
    signal: result.signal,
    timed_out: Boolean(result.error && result.error.message.includes("ETIMEDOUT")),
    version: payload.version,
    capabilities: payload.capabilities,
    stdout,
    stderr
  };
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "agent_adapter.health_probed",
    actor: input.actor,
    target_id: input.project_id,
    payload: {
      profile_id: profile.id,
      ok: health.ok,
      program,
      args: [...(input.adapter_args ?? []), "--health", "--profile", profile.id],
      timeout_ms: timeoutMs,
      exit_code: health.exit_code,
      signal: health.signal,
      timed_out: health.timed_out,
      proof_authority: health.proof_authority,
      capabilities: health.capabilities
    }
  });
  return health;
}
