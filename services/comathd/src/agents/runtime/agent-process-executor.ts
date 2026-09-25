import { closeSync, fsyncSync, mkdirSync, openSync, writeSync } from "node:fs";
import { dirname } from "node:path";
import { ComathError } from "../../errors.js";
import { resolveProjectCommitPath } from "../../research/project-commit.js";
import type { ResearchGrant } from "../../research/portfolio-scheduler.js";
import type { ProjectRuntime } from "../../research/project-runtime.js";
import { startOwnedProcessSession, type OwnedProcessHandle } from "./owned-process-session.js";
export type { OwnedProcessHandle } from "./owned-process-session.js";
export type ProcessLog = { path: string; text: string; tail: string; truncated: boolean; bytes_seen: number };
export type OwnedProcessResult = { exit_code: number | null; signal: NodeJS.Signals | null; timed_out: boolean; cancelled: boolean;
  termination_confirmed: boolean; handle: OwnedProcessHandle; stdout: ProcessLog; stderr: ProcessLog };
export type ExecuteAgentProcessInput = { runtime: ProjectRuntime; grant: ResearchGrant;
  command: { program: string; args?: string[]; env?: Record<string, string> }; cwd: string; timeout_ms: number; signal: AbortSignal;
  stdout_path: string; stderr_path: string; allowed_programs: string[]; onStarted?: (handle: OwnedProcessHandle) => void };
// Below the shared scanner's 2 MiB ceiling, including the retained tail.
const logLimit = 1024 * 1024, retainedLimit = 256 * 1024;
const marker = "\n[COMATH_OUTPUT_TRUNCATED: retained tail follows]\n";
function logWriter(root: string, relativePath: string) {
  const path = resolveProjectCommitPath(root, relativePath); mkdirSync(dirname(path), { recursive: true });
  const fd = openSync(path, "w"); let seen = 0, stored = 0, head = Buffer.alloc(0), tail = Buffer.alloc(0), closed = false;
  const write = (bytes: Buffer) => { let offset = 0; while (offset < bytes.length) offset += writeSync(fd, bytes, offset); };
  return {
    push(bytes: Buffer) {
      if (closed) return; seen += bytes.length;
      if (head.length < retainedLimit) head = Buffer.concat([head, bytes.subarray(0, retainedLimit - head.length)]);
      tail = Buffer.concat([tail, bytes]).subarray(-retainedLimit);
      if (stored < logLimit) { const chunk = bytes.subarray(0, logLimit - stored); write(chunk); stored += chunk.length; }
    },
    finish(): ProcessLog {
      if (!closed) { if (seen > logLimit) write(Buffer.concat([Buffer.from(marker), tail])); fsyncSync(fd); closeSync(fd); closed = true; }
      return { path: relativePath, text: seen <= retainedLimit ? head.toString("utf8") : head.toString("utf8") + marker + tail.toString("utf8"), tail: tail.toString("utf8"), truncated: seen > logLimit, bytes_seen: seen };
    }
  };
}
/** Legacy completion-and-log facade over the single owned process session implementation. */
export async function executeAgentProcess(input: ExecuteAgentProcessInput): Promise<OwnedProcessResult> {
  if (!Number.isSafeInteger(input.timeout_ms) || input.timeout_ms < 1 || input.timeout_ms > 600000) {
    throw new ComathError("Process timeout must be between 1 and 600000 ms", { code: "AGENT_PROCESS_TIMEOUT_INVALID", statusCode: 409 });
  }
  const session = await startOwnedProcessSession({ runtime: input.runtime, grant: input.grant, command: input.command,
    cwd: input.cwd, allowed_programs: input.allowed_programs, signal: input.signal, interactive: false,
    startup_timeout_ms: 30000, attempt_timeout_ms: input.timeout_ms, stop_timeout_ms: 10000,
    max_output_bytes: null, onStarted: input.onStarted });
  let stdout: ReturnType<typeof logWriter> | undefined, stderr: ReturnType<typeof logWriter> | undefined;
  try {
    stdout = logWriter(input.runtime.root, input.stdout_path); stderr = logWriter(input.runtime.root, input.stderr_path);
    session.stdout.on("data", (chunk: Buffer) => stdout!.push(chunk)); session.stderr.on("data", (chunk: Buffer) => stderr!.push(chunk));
    const result = await session.completion;
    if (!result.termination_confirmed && process.platform === "win32") throw new ComathError("Owned wrapper ended without Job Object termination evidence", { code: "AGENT_PROCESS_TERMINATION_UNCONFIRMED", statusCode: 409 });
    return { exit_code: result.exit_code, signal: result.signal, timed_out: result.timed_out, cancelled: result.cancelled,
      termination_confirmed: result.termination_confirmed, handle: result.handle, stdout: stdout.finish(), stderr: stderr.finish() };
  } finally { await session.terminate(); stdout?.finish(); stderr?.finish(); }
}
