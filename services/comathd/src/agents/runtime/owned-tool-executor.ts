import { ComathError } from "../../errors.js";
import { startOwnedToolProcessSession, type OwnedProcessHandle, type OwnedProcessSession, type OwnedSessionCompletion,
  type OwnedSessionServiceOptions, type OwnedToolProcessBinding, type StartOwnedProcessSessionInput } from "./owned-process-session.js";
import type { ProjectRuntime } from "../../research/project-runtime.js";

export type OwnedToolLog = { stream: "stdout" | "stderr"; data: Buffer };
export type ExecuteOwnedToolProcessInput = { runtime: ProjectRuntime; ownership: OwnedToolProcessBinding;
  command: StartOwnedProcessSessionInput["command"]; cwd: string; allowed_programs: string[]; signal: AbortSignal;
  timeout_ms: number; startup_timeout_ms?: number; stop_timeout_ms?: number;
  max_output_bytes?: number; max_log_queue_bytes?: number; onStarted?: (handle: OwnedProcessHandle) => void };
export type OwnedToolExecution = { session: OwnedProcessSession; handle: OwnedProcessHandle; logs: AsyncIterable<OwnedToolLog>;
  completion: Promise<OwnedSessionCompletion>; terminate(): Promise<boolean> };

/** Native owned tool process, not a sandbox. Callers retain permits until termination is confirmed. */
export async function executeOwnedToolProcess(input: ExecuteOwnedToolProcessInput, service: OwnedSessionServiceOptions = {}): Promise<OwnedToolExecution> {
  const limit = input.max_log_queue_bytes ?? 1024 * 1024, outputLimit = input.max_output_bytes ?? 16 * 1024 * 1024;
  if (!Number.isSafeInteger(input.timeout_ms) || input.timeout_ms < 1 || input.timeout_ms > 2147483647
    || !Number.isSafeInteger(limit) || limit < 16384 || limit > 16 * 1024 * 1024
    || !Number.isSafeInteger(outputLimit) || outputLimit < 1 || outputLimit > 64 * 1024 * 1024) {
    throw new ComathError("Owned tool execution requires finite timeout and bounded logs", { code: "OWNED_TOOL_LIMIT_INVALID", statusCode: 409 });
  }
  const session = await startOwnedToolProcessSession({ runtime: input.runtime, ownership: input.ownership,
    command: input.command, cwd: input.cwd, allowed_programs: input.allowed_programs, signal: input.signal,
    interactive: false, startup_timeout_ms: input.startup_timeout_ms ?? 30000, attempt_timeout_ms: input.timeout_ms,
    stop_timeout_ms: input.stop_timeout_ms ?? 5000, max_output_queue_bytes: limit, max_output_bytes: outputLimit,
    onStarted: input.onStarted }, service);
  const queue: OwnedToolLog[] = [];
  let queuedBytes = 0, ended = false, overflow = false, consumed = false, wake: (() => void) | undefined;
  const notify = () => { const resolve = wake; wake = undefined; resolve?.(); };
  const push = (stream: OwnedToolLog["stream"], data: Buffer) => {
    if (overflow) return;
    if (queuedBytes + data.length > limit) {
      overflow = true; void session.terminate(); return;
    }
    const copy = Buffer.from(data); queue.push({ stream, data: copy }); queuedBytes += copy.length; notify();
  };
  const drained = Promise.all([session.stdout, session.stderr].map(stream => new Promise<void>(resolve => {
    if (stream.readableEnded) resolve();
    else { stream.once("end", resolve); stream.once("close", resolve); }
  })));
  session.stdout.on("data", (data: Buffer) => push("stdout", data));
  session.stderr.on("data", (data: Buffer) => push("stderr", data));
  const completion = session.completion.then(async result => {
    await drained;
    ended = true; notify();
    return overflow ? { ...result, error_code: "OWNED_TOOL_LOG_QUEUE_LIMIT" } : result;
  });
  const logs: AsyncIterable<OwnedToolLog> = { async *[Symbol.asyncIterator]() {
    if (consumed) throw new ComathError("Owned tool logs allow only one consumer", { code: "OWNED_TOOL_LOG_CONSUMER_EXISTS" });
    consumed = true;
    try {
      for (;;) {
        const entry = queue.shift();
        if (entry) { queuedBytes -= entry.data.length; yield entry; continue; }
        if (ended) return;
        await new Promise<void>(resolve => { wake = resolve; });
      }
    } finally { if (!ended) void session.terminate(); }
  } };
  return { session, handle: session.handle, logs, completion, terminate: () => session.terminate() };
}
