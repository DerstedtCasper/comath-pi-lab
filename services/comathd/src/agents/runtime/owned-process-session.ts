import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, realpathSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable, Writable } from "node:stream";
import { ComathError } from "../../errors.js";
import { sha256File } from "../../artifacts/hash.js";
import { assertProjectReadable, resolveProjectCommitPath } from "../../research/project-commit.js";
import type { ResearchGrant } from "../../research/portfolio-scheduler.js";
import { getAcquiredProjectRuntime, type ProjectRuntime } from "../../research/project-runtime.js";

export type OwnedProcessHandle = { pid: number; wrapper_pid: number; creation_identity: string | null; wrapper_creation_identity: string;
  binary_path: string; binary_sha256: string; nonce: string; group_id: string; isolation: "process_boundary_only" };
export type OwnedSessionCompletion = { exit_code: number | null; signal: NodeJS.Signals | null; timed_out: boolean; cancelled: boolean;
  termination_confirmed: boolean; handle: OwnedProcessHandle; stdout_bytes: number; stderr_bytes: number; error_code?: string };
export type StartOwnedProcessSessionInput = { runtime: ProjectRuntime; grant: ResearchGrant;
  command: { program: string; args?: string[]; env?: Record<string, string> }; cwd: string; allowed_programs: string[]; signal: AbortSignal;
  interactive: boolean; startup_timeout_ms: number; /** Begins after started; null explicitly allows an unbounded session. */
  attempt_timeout_ms: number | null; stop_timeout_ms: number;
  max_input_queue_bytes?: number; max_output_queue_bytes?: number; /** Null is for legacy drained log streams. */ max_output_bytes?: number | null;
  onStarted?: (handle: OwnedProcessHandle) => void };
export type OwnedProcessSession = { stdin: Writable; stdout: Readable; stderr: Readable; handle: OwnedProcessHandle;
  completion: Promise<OwnedSessionCompletion>; terminate(): Promise<boolean> };
/** Separate service-only injection surface. Never populated from command.env or worker input. */
export type OwnedSessionServiceOptions = { environment?: Readonly<Record<string, string>> };
export type OwnedToolProcessBinding = { execution_id: string; task_id: string; campaign_id: string; generation: number; attempt_key: string; command_ref: string };
export type StartOwnedToolProcessSessionInput = Omit<StartOwnedProcessSessionInput, "grant"> & { ownership: OwnedToolProcessBinding };
function fail(code: string, message = code): never { throw new ComathError(message, { code, statusCode: 409 }); }
function programPath(program: string): string {
  if (!isAbsolute(program)) fail("AGENT_RUN_PROGRAM_NOT_ALLOWLISTED");
  return realpathSync(program);
}
function environment(overrides: Record<string, string> = {}): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of process.platform === "win32" ? ["PATH", "PATHEXT", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "COMSPEC", "NUMBER_OF_PROCESSORS", "PROCESSOR_ARCHITECTURE"] : ["PATH", "TMPDIR", "TEMP", "TMP", "LANG", "LC_ALL"]) if (process.env[key] !== undefined) result[key] = process.env[key]!;
  const explicitlySafe = new Set(["COMATH_PROOF_AUTHORITY", "COMATH_CODEX_ADAPTER_BACKEND", "COMATH_CODEX_EXTERNAL_PROGRAM", "COMATH_CODEX_EXTERNAL_PREFIX_ARGS"]);
  for (const [key, value] of Object.entries(overrides)) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || typeof value !== "string" || value.includes("\0") || !explicitlySafe.has(key) && /KEY|TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL|AUTH|COOKIE|SESSION|PRIVATE|SSH|OPENAI|ANTHROPIC|AZURE|AWS|GOOGLE|GITHUB|CLOUD/i.test(key)) fail("AGENT_RUN_ENV_DENIED");
    result[key] = value;
  }
  return result;
}
function linuxBirth(pid: number): string | null {
  try { const stat = readFileSync(`/proc/${pid}/stat`, "utf8"); return stat.slice(stat.lastIndexOf(")") + 2).split(" ")[19] ?? null; } catch { return null; }
}
class BoundedInput extends Writable {
  constructor(private readonly limit: number, private readonly overflow: () => void, options: ConstructorParameters<typeof Writable>[0]) { super(options); }
  override write(chunk: Uint8Array | string, encodingOrCallback?: BufferEncoding | ((error?: Error | null) => void), callback?: (error?: Error | null) => void): boolean {
    const size = typeof chunk === "string" ? Buffer.byteLength(chunk, typeof encodingOrCallback === "string" ? encodingOrCallback : "utf8") : chunk.byteLength;
    if (this.writableLength + size > this.limit) {
      this.overflow(); const error = new ComathError("AGENT_PROCESS_INPUT_LIMIT", { code: "AGENT_PROCESS_INPUT_LIMIT" });
      const done = typeof encodingOrCallback === "function" ? encodingOrCallback : callback;
      queueMicrotask(() => { done?.(error); this.destroy(error); }); return false;
    }
    return typeof encodingOrCallback === "string" ? super.write(chunk, encodingOrCallback, callback) : super.write(chunk, encodingOrCallback);
  }
}

/** Await ownership handshake, then return immediately with raw bidirectional streams. Not a sandbox. */
export async function startOwnedProcessSession(input: StartOwnedProcessSessionInput, service: OwnedSessionServiceOptions = {}): Promise<OwnedProcessSession> {
  return startSession(input, { kind: "worker", binding: input.grant }, service);
}

/** Service-only tool admission binding; never supplies or borrows a worker deployment permit. */
export async function startOwnedToolProcessSession(input: StartOwnedToolProcessSessionInput, service: OwnedSessionServiceOptions = {}): Promise<OwnedProcessSession> {
  return startSession(input, { kind: "tool", binding: input.ownership }, service);
}

async function startSession(input: Omit<StartOwnedProcessSessionInput, "grant">,
  ownership: { kind: "worker"; binding: ResearchGrant } | { kind: "tool"; binding: OwnedToolProcessBinding }, service: OwnedSessionServiceOptions): Promise<OwnedProcessSession> {
  const { runtime } = input, grant = ownership.binding, store = runtime.store;
  const program = programPath(input.command.program), compare = (path: string) => process.platform === "win32" ? path.toLowerCase() : path;
  if (!input.allowed_programs.map(programPath).some(allowed => compare(allowed) === compare(program))) fail("AGENT_RUN_PROGRAM_NOT_ALLOWLISTED");
  for (const value of [input.startup_timeout_ms, input.stop_timeout_ms]) if (!Number.isSafeInteger(value) || value < 1 || value > 120000) fail("AGENT_PROCESS_TIMEOUT_INVALID");
  if (input.attempt_timeout_ms !== null && (!Number.isSafeInteger(input.attempt_timeout_ms) || input.attempt_timeout_ms < 1 || input.attempt_timeout_ms > 2147483647)) fail("AGENT_PROCESS_TIMEOUT_INVALID");
  const inputLimit = input.max_input_queue_bytes ?? 262144, outputQueueLimit = input.max_output_queue_bytes ?? 1048576, outputLimit = input.max_output_bytes === undefined ? 16 * 1024 * 1024 : input.max_output_bytes;
  for (const value of [inputLimit, outputQueueLimit]) if (!Number.isSafeInteger(value) || value < 16384 || value > 16 * 1024 * 1024) fail("AGENT_PROCESS_QUEUE_INVALID");
  if (outputLimit !== null && (!Number.isSafeInteger(outputLimit) || outputLimit < 1)) fail("AGENT_PROCESS_QUEUE_INVALID");
  const env = environment(input.command.env);
  for (const [key, value] of Object.entries(service.environment ?? {})) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || typeof value !== "string" || value.includes("\0")) fail("AGENT_RUN_ENV_DENIED");
    env[key] = value;
  }
  if ((input.command.args ?? []).some(value => typeof value !== "string" || value.includes("\0")) || Buffer.byteLength(JSON.stringify({ args: input.command.args ?? [], env })) > 262144) fail("AGENT_PROCESS_REQUEST_INVALID");
  const cwd = resolveProjectCommitPath(runtime.root, input.cwd === runtime.root ? ".tmp/comath/process-root" : input.cwd);
  let toolClaimed = false;
  const verifyPermit = () => {
    if (getAcquiredProjectRuntime(runtime.root) !== runtime) fail("RESEARCH_OWNER_REQUIRED");
    assertProjectReadable(runtime.root, undefined, grant.campaign_id);
    const task = store.getTask(grant.task_id), attempt = store.get("SELECT * FROM attempts WHERE attempt_key=?", grant.attempt_key);
    if (!task || !attempt || task.generation !== grant.generation || task.campaign_id !== grant.campaign_id || attempt.task_id !== task.task_id || Number(attempt.generation) !== grant.generation
      || !["leased", "running"].includes(task.status) || attempt.fenced_at) fail("AGENT_PROCESS_PERMIT_REQUIRED");
    if (ownership.kind === "worker") {
      if (!store.get("SELECT attempt_key FROM permits WHERE attempt_key=? AND resource_key='worker:deployment'", grant.attempt_key)) fail("AGENT_PROCESS_PERMIT_REQUIRED");
    } else {
      const binding = ownership.binding, execution = store.get("SELECT * FROM tool_executions WHERE execution_id=?", binding.execution_id);
      const permit = execution && store.get("SELECT * FROM permits WHERE attempt_key=? AND resource_key=?", binding.attempt_key, String(execution.permit_ref));
      if (!execution || execution.attempt_key !== binding.attempt_key || execution.command_ref !== binding.command_ref
        || execution.state !== (toolClaimed ? "starting" : "admitted") || execution.stop_intent || execution.handle_json
        || execution.permit_ref !== `tool:${execution.kind}:${binding.execution_id}` || !permit || Number(permit.amount) < 1
        || !["lean", "cas", "retrieval"].includes(String(execution.kind)) || !["leased", "running"].includes(String(attempt.state))
        || attempt.stop_requested_at || attempt.stop_reason || Number(attempt.termination_confirmed ?? 0) !== 0
        || !Number.isFinite(Date.parse(String(attempt.expires_at))) || runtime.clock.now() >= Date.parse(String(attempt.expires_at))
        || !Number.isFinite(Date.parse(String(permit.deadline))) || runtime.clock.now() >= Date.parse(String(permit.deadline))) fail("AGENT_TOOL_PROCESS_PERMIT_REQUIRED");
    }
  };
  verifyPermit(); input.signal.throwIfAborted(); const binaryHash = (await sha256File(program)).sha256; verifyPermit(); input.signal.throwIfAborted();
  mkdirSync(cwd, { recursive: true });
  const nonce = randomUUID(), handle: OwnedProcessHandle = { pid: 0, wrapper_pid: 0, creation_identity: null, wrapper_creation_identity: new Date().toISOString(), binary_path: program,
    binary_sha256: binaryHash, nonce, group_id: "unknown", isolation: "process_boundary_only" };
  if (ownership.kind === "tool") {
    store.transaction(() => {
      verifyPermit();
      const changed = store.run("UPDATE tool_executions SET state='starting' WHERE execution_id=? AND state='admitted' AND handle_json IS NULL", ownership.binding.execution_id);
      if (Number(changed.changes) !== 1) fail("AGENT_TOOL_PROCESS_PERMIT_REQUIRED");
    });
    toolClaimed = true;
  }
  const stdout = new Readable({ read() {} }), stderr = new Readable({ read() {} });
  let resolveReady!: () => void, rejectReady!: (error: Error) => void;
  const ready = new Promise<void>((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  let resolveDone!: (result: OwnedSessionCompletion) => void;
  const completion = new Promise<OwnedSessionCompletion>(resolve => { resolveDone = resolve; });
  let timedOut = false, cancelled = false, closed = false, stopped = false, started = false, completed = false;
  let exitCode: number | null = null, exitSignal: NodeJS.Signals | null = null, errorCode: string | undefined;
  let outBytes = 0, errBytes = 0, terminationEvidence = false;
  let attemptTimer: NodeJS.Timeout | undefined, stopTimer: NodeJS.Timeout | undefined;
  let sendCancel: () => void = () => {}, forceClose: () => void = () => {};
  const stop = (reason: "cancel" | "timeout" | "failure", code?: string) => {
    if (closed) return;
    if (reason === "cancel") cancelled = true;
    if (reason === "timeout") timedOut = true;
    errorCode ??= code;
    if (stopped) return; stopped = true; sendCancel();
    stopTimer = setTimeout(() => { errorCode ??= "AGENT_PROCESS_TERMINATION_UNCONFIRMED"; forceClose(); }, input.stop_timeout_ms);
  };
  const abort = () => stop("cancel");
  const onOutput = (type: "stdout" | "stderr", bytes: Buffer) => {
    if (type === "stdout") outBytes += bytes.length; else errBytes += bytes.length;
    const stream = type === "stdout" ? stdout : stderr;
    if (errorCode === "AGENT_PROCESS_OUTPUT_LIMIT") return;
    if ((outputLimit !== null && outBytes + errBytes > outputLimit) || stream.readableLength + bytes.length > outputQueueLimit) { stop("failure", "AGENT_PROCESS_OUTPUT_LIMIT"); return; }
    stream.push(bytes);
  };
  const startedHandle = () => {
    verifyPermit();
    Object.freeze(handle);
    store.transaction(() => {
      if (ownership.kind === "tool") {
        const changed = store.run("UPDATE tool_executions SET handle_json=?,state='running' WHERE execution_id=? AND state='starting' AND handle_json IS NULL", JSON.stringify(handle), ownership.binding.execution_id);
        if (Number(changed.changes) !== 1) fail("AGENT_TOOL_PROCESS_PERMIT_REQUIRED");
      } else {
        store.run("UPDATE attempts SET runtime_handle_json=?,state='running' WHERE attempt_key=?", JSON.stringify(handle), grant.attempt_key);
        const task = store.getTask(grant.task_id)!; if (task.status === "leased") store.putTask({ ...task, status: "running", updated_at: new Date(runtime.clock.now()).toISOString() });
      }
    });
    started = true; clearTimeout(startupTimer);
    if (input.attempt_timeout_ms !== null) attemptTimer = setTimeout(() => stop("timeout"), input.attempt_timeout_ms);
    input.onStarted?.(handle); resolveReady();
  };
  let writeData: (bytes: Buffer, callback: (error?: Error | null) => void) => void = (_bytes, callback) => callback(new Error("Session not ready"));
  let closeInput: (callback: (error?: Error | null) => void) => void = callback => callback();
  const stdin = new BoundedInput(inputLimit, () => stop("failure", "AGENT_PROCESS_INPUT_LIMIT"), {
    write(chunk: Buffer, _encoding, callback) { if (closed || !input.interactive) callback(new ComathError("AGENT_PROCESS_STDIN_CLOSED", { code: "AGENT_PROCESS_STDIN_CLOSED" })); else writeData(chunk, callback); },
    final(callback) { if (closed || !input.interactive) callback(); else closeInput(callback); }
  });
  // Completion reports ownership errors; callers may also attach their own stream error listener.
  stdin.on("error", () => {});
  const finish = (confirmed: boolean) => {
    if (closed) return; closed = true;
    clearTimeout(startupTimer); clearTimeout(attemptTimer); clearTimeout(stopTimer); input.signal.removeEventListener("abort", abort);
    stdout.push(null); stderr.push(null); stdin.destroy();
    if (!started) rejectReady(new ComathError(errorCode ?? "AGENT_PROCESS_START_FAILED", { code: errorCode ?? "AGENT_PROCESS_START_FAILED", statusCode: 409 }));
    resolveDone({ exit_code: exitCode, signal: exitSignal, timed_out: timedOut, cancelled, termination_confirmed: confirmed,
      handle, stdout_bytes: outBytes, stderr_bytes: errBytes, ...(errorCode ? { error_code: errorCode } : {}) });
  };
  const startupTimer = setTimeout(() => { if (!started) stop("failure", "AGENT_PROCESS_START_TIMEOUT"); }, input.startup_timeout_ms);
  input.signal.addEventListener("abort", abort, { once: true });
  try {
    if (process.platform === "win32") {
      const systemRoot = process.env.SystemRoot ?? process.env.SYSTEMROOT;
      if (!systemRoot) fail("AGENT_PROCESS_HOST_UNAVAILABLE");
      const wrapper = fileURLToPath(new URL("windows-job-wrapper.ps1", import.meta.url));
      if (!existsSync(wrapper)) fail("AGENT_PROCESS_HOST_UNAVAILABLE");
      const localAppData = process.env.LOCALAPPDATA;
      if (!localAppData) fail("AGENT_PROCESS_HOST_UNAVAILABLE");
      const wrapperEnvironment = { ...environment(), LOCALAPPDATA: localAppData };
      const child = spawn(join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe"),
        ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", wrapper], { windowsHide: true, env: wrapperEnvironment, stdio: ["pipe", "pipe", "pipe"] });
      handle.wrapper_pid = child.pid ?? 0;
      const providerAlive = () => {
        if (!handle.pid) return false;
        try { process.kill(handle.pid, 0); return true; }
        catch (error) { return (error as NodeJS.ErrnoException).code !== "ESRCH"; }
      };
      const waitForProviderExit = async () => {
        const deadline = Date.now() + input.stop_timeout_ms;
        while (providerAlive() && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 10));
      };
      const frame = (type: string, data?: string) => JSON.stringify({ type, nonce, ...(data !== undefined ? { data } : {}) }) + "\n";
      sendCancel = () => { if (!child.stdin.destroyed) child.stdin.write(frame("cancel")); };
      forceClose = () => { child.kill(); };
      writeData = (bytes, callback) => {
        let offset = 0;
        const next = (error?: Error | null) => {
          if (error || closed || stopped) { callback(error ?? new Error("Owned session stopped")); return; }
          if (offset >= bytes.length) { callback(); return; }
          const part = bytes.subarray(offset, offset + 16384); offset += part.length;
          child.stdin.write(frame("stdin", part.toString("base64")), next);
        };
        next();
      };
      closeInput = callback => child.stdin.write(frame("stdin_close"), callback);
      let buffer = "";
      child.stdout.on("data", (chunk: Buffer) => {
        buffer += chunk.toString("utf8");
        if (buffer.length > 1048576) { stop("failure", "AGENT_PROCESS_PROTOCOL_INVALID"); buffer = ""; return; }
        let newline: number;
        while ((newline = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, newline).trim(); buffer = buffer.slice(newline + 1); if (!line) continue;
          try {
            const message = JSON.parse(line) as Record<string, unknown>;
            if (message.nonce !== nonce || completed) fail("AGENT_PROCESS_PROTOCOL_INVALID");
            if (message.type === "stdout" || message.type === "stderr") {
              if (typeof message.data !== "string" || message.data.length > 22000) fail("AGENT_PROCESS_PROTOCOL_INVALID");
              const bytes = Buffer.from(message.data, "base64"); if (bytes.toString("base64") !== message.data) fail("AGENT_PROCESS_PROTOCOL_INVALID");
              onOutput(message.type, bytes);
            } else if (message.type === "started") {
              if (started || !Number.isSafeInteger(message.pid) || Number(message.pid) < 1 || !/^\d+$/.test(String(message.creation_identity))
                || !/^\d+$/.test(String(message.wrapper_creation_identity)) || message.job_name !== `Local\\CoMath-${nonce}`) fail("AGENT_PROCESS_PROTOCOL_INVALID");
              Object.assign(handle, { pid: message.pid, creation_identity: message.creation_identity, wrapper_creation_identity: message.wrapper_creation_identity, group_id: message.job_name }); startedHandle();
            } else if (message.type === "completed") {
              if (!started || !Number.isSafeInteger(message.exit_code)) fail("AGENT_PROCESS_PROTOCOL_INVALID");
              completed = true; exitCode = Number(message.exit_code); timedOut ||= message.timed_out === true;
              cancelled ||= message.cancelled === true && !timedOut;
              if (message.input_overflow === true) errorCode ??= "AGENT_PROCESS_INPUT_LIMIT";
              if (message.protocol_error === true) errorCode ??= "AGENT_PROCESS_PROTOCOL_INVALID";
              terminationEvidence = message.termination_confirmed === true && message.active_processes === 0;
            } else if (message.type === "error") stop("failure", "AGENT_PROCESS_TERMINATION_UNCONFIRMED");
            else fail("AGENT_PROCESS_PROTOCOL_INVALID");
          } catch {
            rejectReady(new ComathError("AGENT_PROCESS_PROTOCOL_INVALID", { code: "AGENT_PROCESS_PROTOCOL_INVALID", statusCode: 409 }));
            stop("failure", "AGENT_PROCESS_PROTOCOL_INVALID");
          }
        }
      });
      // Wrapper diagnostics are not provider stderr and must never enter its protocol stream.
      child.stderr.resume(); child.stdin.on("error", () => {});
      child.once("error", () => { errorCode ??= "AGENT_PROCESS_START_FAILED"; finish(false); });
      child.once("close", async (code, signal) => {
        if (!completed || buffer.trim() || code !== 0 || signal) errorCode ??= "AGENT_PROCESS_TERMINATION_UNCONFIRMED";
        const protocolOkay = !errorCode || ["AGENT_PROCESS_OUTPUT_LIMIT", "AGENT_PROCESS_INPUT_LIMIT"].includes(errorCode);
        await waitForProviderExit();
        finish(completed && terminationEvidence && code === 0 && !signal && protocolOkay); child.stdin.destroy();
      });
      child.stdin.write(JSON.stringify({ program, args: input.command.args ?? [], cwd, env, nonce,
        interactive: input.interactive, timeout_ms: input.attempt_timeout_ms ?? 0, stop_timeout_ms: input.stop_timeout_ms,
        input_queue_bytes: inputLimit, startup_deadline_ms: Date.now() + input.startup_timeout_ms }) + "\n");
      if (input.signal.aborted) abort();
    } else {
      const child = spawn(program, input.command.args ?? [], { cwd, env, shell: false, detached: true, stdio: [input.interactive ? "pipe" : "ignore", "pipe", "pipe"] });
      Object.assign(handle, { pid: child.pid ?? 0, wrapper_pid: process.pid, creation_identity: child.pid ? linuxBirth(child.pid) : null, group_id: String(child.pid ?? 0) });
      const alive = () => { try { process.kill(-handle.pid, 0); return true; } catch (cause) { return (cause as NodeJS.ErrnoException).code !== "ESRCH"; } };
      const kill = () => { if (handle.pid) try { process.kill(-handle.pid, "SIGKILL"); } catch {} };
      sendCancel = kill; forceClose = kill;
      writeData = (bytes, callback) => { if (child.stdin) child.stdin.write(bytes, callback); else callback(new Error("stdin unavailable")); };
      closeInput = callback => { if (child.stdin) child.stdin.end(callback); else callback(); };
      child.stdout!.on("data", chunk => onOutput("stdout", chunk)); child.stderr!.on("data", chunk => onOutput("stderr", chunk)); child.stdin?.on("error", () => {});
      child.once("spawn", () => { try { startedHandle(); if (input.signal.aborted) abort(); } catch {
        rejectReady(new ComathError("AGENT_PROCESS_START_FAILED", { code: "AGENT_PROCESS_START_FAILED", statusCode: 409 }));
        stop("failure", "AGENT_PROCESS_START_FAILED");
      } });
      child.once("error", () => { errorCode ??= "AGENT_PROCESS_START_FAILED"; finish(false); });
      child.once("close", async (code, signal) => {
        exitCode = code; exitSignal = signal;
        while (alive() && !stopped) await new Promise(resolve => setTimeout(resolve, 10));
        const deadline = Date.now() + input.stop_timeout_ms;
        while (alive() && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 10));
        finish(!alive());
      });
    }
  } catch (error) { stop("failure", "AGENT_PROCESS_START_FAILED"); finish(false); await ready.catch(() => {}); throw error; }
  try { await ready; } catch (error) { await completion; throw error; }
  if (input.signal.aborted) { stop("cancel"); await completion; fail("AGENT_PROCESS_CANCELLED"); }
  let terminating: Promise<boolean> | undefined;
  return { stdin, stdout, stderr, handle, completion, terminate() {
    if (!terminating) { stop("cancel"); terminating = completion.then(result => result.termination_confirmed); }
    return terminating;
  } };
}
