import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, realpathSync, writeSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ComathError } from "../../errors.js";
import { sha256File } from "../../artifacts/hash.js";
import { assertProjectReadable, resolveProjectCommitPath } from "../../research/project-commit.js";
import type { ResearchGrant } from "../../research/portfolio-scheduler.js";
import { getAcquiredProjectRuntime, type ProjectRuntime } from "../../research/project-runtime.js";

export type OwnedProcessHandle = { pid: number; wrapper_pid: number; creation_identity: string | null; wrapper_creation_identity: string;
  binary_path: string; binary_sha256: string; nonce: string; group_id: string; isolation: "process_boundary_only" };
export type ProcessLog = { path: string; text: string; tail: string; truncated: boolean; bytes_seen: number };
export type OwnedProcessResult = { exit_code: number | null; signal: NodeJS.Signals | null; timed_out: boolean; cancelled: boolean;
  termination_confirmed: boolean; handle: OwnedProcessHandle; stdout: ProcessLog; stderr: ProcessLog };
export type ExecuteAgentProcessInput = { runtime: ProjectRuntime; grant: ResearchGrant;
  command: { program: string; args?: string[]; env?: Record<string, string> }; cwd: string; timeout_ms: number; signal: AbortSignal;
  stdout_path: string; stderr_path: string; allowed_programs: string[]; onStarted?: (handle: OwnedProcessHandle) => void };
// Below the shared scanner's 2 MiB ceiling, including the retained tail.
const logLimit = 1024 * 1024, retainedLimit = 256 * 1024;
const marker = "\n[COMATH_OUTPUT_TRUNCATED: retained tail follows]\n";
function fail(code: string, message: string): never { throw new ComathError(message, { code, statusCode: 409 }); }
function programPath(program: string): string {
  if (!isAbsolute(program)) fail("AGENT_RUN_PROGRAM_NOT_ALLOWLISTED", "Executable path must be absolute and host approved");
  return realpathSync(program);
}
function environment(overrides: Record<string, string> = {}): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of process.platform === "win32" ? ["PATH", "PATHEXT", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "COMSPEC", "NUMBER_OF_PROCESSORS", "PROCESSOR_ARCHITECTURE"] : ["PATH", "TMPDIR", "TEMP", "TMP", "LANG", "LC_ALL"]) if (process.env[key] !== undefined) result[key] = process.env[key]!;
  const explicitlySafe = new Set(["COMATH_PROOF_AUTHORITY", "COMATH_CODEX_ADAPTER_BACKEND", "COMATH_CODEX_EXTERNAL_PROGRAM", "COMATH_CODEX_EXTERNAL_PREFIX_ARGS"]);
  for (const [key, value] of Object.entries(overrides)) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || typeof value !== "string" || value.includes("\0") || !explicitlySafe.has(key) && /KEY|TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL|AUTH|COOKIE|SESSION|PRIVATE|SSH|OPENAI|ANTHROPIC|AZURE|AWS|GOOGLE|GITHUB|CLOUD/i.test(key)) fail("AGENT_RUN_ENV_DENIED", "Process environment contains an unapproved sensitive field");
    result[key] = value;
  }
  return result;
}
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
function linuxBirth(pid: number): string | null {
  try { const stat = readFileSync(`/proc/${pid}/stat`, "utf8"); return stat.slice(stat.lastIndexOf(")") + 2).split(" ")[19] ?? null; } catch { return null; }
}
/** Launch requires an existing shared-admission permit. The returned boundary is never a sandbox claim. */
export async function executeAgentProcess(input: ExecuteAgentProcessInput): Promise<OwnedProcessResult> {
  const { runtime, grant } = input, store = runtime.store;
  const program = programPath(input.command.program);
  const compare = (path: string) => process.platform === "win32" ? path.toLowerCase() : path;
  if (!input.allowed_programs.map(programPath).some(allowed => compare(allowed) === compare(program))) fail("AGENT_RUN_PROGRAM_NOT_ALLOWLISTED", "Program is not in the explicit host allowlist");
  if (!Number.isSafeInteger(input.timeout_ms) || input.timeout_ms < 1 || input.timeout_ms > 600000) fail("AGENT_PROCESS_TIMEOUT_INVALID", "Process timeout must be between 1 and 600000 ms");
  const env = environment(input.command.env), cwd = resolveProjectCommitPath(runtime.root, input.cwd === runtime.root ? ".tmp/comath/process-root" : input.cwd);
  const verifyPermit = () => {
    if (getAcquiredProjectRuntime(runtime.root) !== runtime) fail("RESEARCH_OWNER_REQUIRED", "Process execution requires the project owner");
    assertProjectReadable(runtime.root, undefined, grant.campaign_id);
    const task = store.getTask(grant.task_id), attempt = store.get("SELECT * FROM attempts WHERE attempt_key=?", grant.attempt_key);
    if (!task || !attempt || task.generation !== grant.generation || attempt.task_id !== task.task_id || Number(attempt.generation) !== grant.generation
      || !["leased", "running"].includes(task.status) || attempt.fenced_at || !store.get("SELECT attempt_key FROM permits WHERE attempt_key=? AND resource_key='worker:deployment'", grant.attempt_key)) fail("AGENT_PROCESS_PERMIT_REQUIRED", "No current shared-admission process permit");
  };
  verifyPermit(); input.signal.throwIfAborted(); const binaryHash = (await sha256File(program)).sha256; verifyPermit(); input.signal.throwIfAborted();
  mkdirSync(cwd, { recursive: true });
  const stdout = logWriter(runtime.root, input.stdout_path), stderr = logWriter(runtime.root, input.stderr_path);
  const nonce = randomUUID();
  let handle: OwnedProcessHandle = { pid: 0, wrapper_pid: 0, creation_identity: null, wrapper_creation_identity: new Date().toISOString(), binary_path: program, binary_sha256: binaryHash, nonce, group_id: "unknown", isolation: "process_boundary_only" };
  let timedOut = false, cancelled = false, terminationConfirmed = false, exitCode: number | null = null, exitSignal: NodeJS.Signals | null = null;
  const persistStarted = () => {
    store.transaction(() => { store.run("UPDATE attempts SET runtime_handle_json=?,state='running' WHERE attempt_key=?", JSON.stringify(handle), grant.attempt_key);
      const task = store.getTask(grant.task_id)!; if (task.status === "leased") store.putTask({ ...task, status: "running", updated_at: new Date(runtime.clock.now()).toISOString() }); });
    input.onStarted?.(handle);
  };
  try {
    if (process.platform === "win32") {
      const systemRoot = process.env.SystemRoot ?? process.env.SYSTEMROOT;
      if (!systemRoot) fail("AGENT_PROCESS_HOST_UNAVAILABLE", "Windows system directory is unavailable");
      const powershell = join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
      const wrapper = fileURLToPath(new URL("windows-job-wrapper.ps1", import.meta.url));
      if (!existsSync(wrapper)) fail("AGENT_PROCESS_HOST_UNAVAILABLE", "Service-owned Job Object wrapper is missing");
      const child = spawn(powershell, ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", wrapper], { windowsHide: true, env: environment(), stdio: ["pipe", "pipe", "pipe"] });
      handle.wrapper_pid = child.pid ?? 0;
      let buffer = "", protocolError: Error | undefined, completed = false;
      const cancel = () => { cancelled = true; if (!child.stdin.destroyed) child.stdin.write("cancel\n"); };
      input.signal.addEventListener("abort", cancel, { once: true });
      const startupTimer = setTimeout(() => { if (!handle.pid) { protocolError = new Error("Job Object wrapper did not start within 30 seconds"); child.kill(); } }, 30000);
      child.stdout.on("data", (chunk: Buffer) => {
        buffer += chunk.toString("utf8");
        if (buffer.length > 1024 * 1024) { protocolError = new Error("Job wrapper control frame exceeded bound"); cancel(); return; }
        let newline: number;
        while ((newline = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, newline).trim(); buffer = buffer.slice(newline + 1); if (!line) continue;
          try {
            const message = JSON.parse(line) as Record<string, unknown>;
            if (message.type === "stdout" || message.type === "stderr") (message.type === "stdout" ? stdout : stderr).push(Buffer.from(String(message.data), "base64"));
            else if (message.type === "started") { clearTimeout(startupTimer); handle = { ...handle, pid: Number(message.pid), creation_identity: String(message.creation_identity), wrapper_creation_identity: String(message.wrapper_creation_identity), group_id: String(message.job_name) }; persistStarted(); }
            else if (message.type === "completed") { completed = true; exitCode = Number(message.exit_code); timedOut = message.timed_out === true; cancelled ||= message.cancelled === true; terminationConfirmed = message.termination_confirmed === true; }
            else if (message.type === "error") protocolError = new Error(`Owned Job Object failed: ${String(message.message)}`);
            else protocolError = new Error("Unknown Job Object wrapper event");
          } catch (cause) { protocolError = cause instanceof Error ? cause : new Error("Invalid Job Object wrapper output"); cancel(); }
        }
      });
      child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
      child.stdin.on("error", () => undefined);
      child.stdin.write(JSON.stringify({ program, args: input.command.args ?? [], cwd, env, nonce, timeout_ms: input.timeout_ms }) + "\n");
      if (input.signal.aborted) cancel();
      try {
        await new Promise<void>((resolve, reject) => { child.once("error", reject); child.once("close", () => resolve()); });
        if (protocolError || !completed) fail("AGENT_PROCESS_TERMINATION_UNCONFIRMED", protocolError?.message ?? "Owned wrapper ended without Job Object termination evidence");
      } finally { clearTimeout(startupTimer); input.signal.removeEventListener("abort", cancel); child.stdin.destroy(); }
    } else {
      const child = spawn(program, input.command.args ?? [], { cwd, env, shell: false, detached: true, stdio: ["ignore", "pipe", "pipe"] });
      handle = { ...handle, pid: child.pid ?? 0, wrapper_pid: process.pid, creation_identity: child.pid ? linuxBirth(child.pid) : null, group_id: String(child.pid ?? 0) };
      if (child.pid) persistStarted();
      child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk)); child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
      const groupAlive = () => { try { process.kill(-handle.pid, 0); return true; } catch (cause) { return (cause as NodeJS.ErrnoException).code !== "ESRCH"; } };
      const kill = () => { if (handle.pid) try { process.kill(-handle.pid, "SIGKILL"); } catch { /* Checked by groupAlive below. */ } };
      const cancel = () => { cancelled = true; kill(); };
      input.signal.addEventListener("abort", cancel, { once: true });
      const timeout = setTimeout(() => { timedOut = true; kill(); }, input.timeout_ms);
      try {
        await new Promise<void>((resolve, reject) => { child.once("error", reject); child.once("close", (code, signal) => { exitCode = code; exitSignal = signal; resolve(); }); });
        while (groupAlive() && !timedOut && !cancelled) await new Promise(resolve => setTimeout(resolve, 10));
        const deadline = Date.now() + 10000;
        while (groupAlive() && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 10));
        terminationConfirmed = !groupAlive();
      } finally { clearTimeout(timeout); input.signal.removeEventListener("abort", cancel); }
    }
    return { exit_code: exitCode, signal: exitSignal, timed_out: timedOut, cancelled, termination_confirmed: terminationConfirmed, handle, stdout: stdout.finish(), stderr: stderr.finish() };
  } finally { stdout.finish(); stderr.finish(); }
}
