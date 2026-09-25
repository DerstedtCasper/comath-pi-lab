import { type ComputeRunnerRequest, runPythonRunner } from "./runner-contracts.js";
import { spawn, type ChildProcessByStdio } from "node:child_process";
import type { Readable } from "node:stream";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { isAbsolute, join, toNamespacedPath } from "node:path";
import { z } from "zod";
import { ComathError } from "../errors.js";
import { canonicalJson } from "./runner-contracts.js";

export const researchSympyInputSchema = z.strictObject({ expression: z.string().min(1).max(8192), expected: z.string().min(1).max(8192),
  variables: z.array(z.strictObject({ name: z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,63}$/), domain: z.enum(["integer", "rational", "real", "complex", "unspecified"]) })).max(64) });
export type ResearchSympyInput = z.infer<typeof researchSympyInputSchema>;
export type ResearchSympyConfig = { python: string; python_sha256: string; script: string; script_sha256: string };
export type ResearchSympyHandle = { runtime_kind: "fixed_python"; pid: number; nonce: string; script_sha256: string; started_at: string };
export class ResearchSympyExecutionError extends ComathError {
  constructor(code: string, readonly termination_confirmed: boolean, readonly cause_code?: string) { super("Fixed Python research tool did not complete", { code, statusCode: 409 }); }
}
const digest = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex");

/** Fixed script and explicit domains; this prototype does not assert verified OS isolation. */
export async function runResearchSympyDifference(raw: unknown, config: ResearchSympyConfig, execution: {
  workspace: string; signal: AbortSignal; timeout_ms: number; onStarted?: (handle: ResearchSympyHandle) => void;
}) {
  const input = researchSympyInputSchema.parse(raw);
  if (![config.python, config.script, execution.workspace].every(isAbsolute) || !Number.isSafeInteger(execution.timeout_ms) || execution.timeout_ms < 1 || execution.timeout_ms > 120000) {
    throw new ResearchSympyExecutionError("SYMPY_CONFIG_INVALID", true);
  }
  execution.signal.throwIfAborted();
  const python = await realpath(config.python), script = await realpath(config.script);
  const scriptBytes = await readFile(script);
  if (digest(await readFile(python)) !== config.python_sha256 || digest(scriptBytes) !== config.script_sha256) throw new ResearchSympyExecutionError("SYMPY_BINARY_HASH_MISMATCH", true);
  const envelope = canonicalJson({ input: { ...input, domain_policy: "explicit" } });
  if (Buffer.byteLength(envelope) > 32768) throw new ResearchSympyExecutionError("SYMPY_INPUT_TOO_LARGE", true);
  await mkdir(execution.workspace, { recursive: true });
  const inputPath = join(execution.workspace, `input-${randomUUID()}.json`);
  const scriptCopy = join(execution.workspace, `runner-${randomUUID()}.py`);
  await writeFile(scriptCopy, scriptBytes, { flag: "wx", flush: true });
  await writeFile(inputPath, envelope, { flag: "wx", flush: true });
  execution.signal.throwIfAborted();
  const shortWindowsCwd = process.platform === "win32" && process.env.TEMP && isAbsolute(process.env.TEMP)
    ? await mkdtemp(join(process.env.TEMP, "comath-sympy-")) : execution.workspace;
  const env: Record<string, string> = { TEMP: shortWindowsCwd, TMP: shortWindowsCwd };
  if (process.platform === "win32" && process.env.SystemRoot) env.SystemRoot = process.env.SystemRoot;
  try { return await new Promise<{ kind: "sympy_difference"; result: unknown; metadata: { execution_mode: "local_process"; python_sha256: string; script_sha256: string;
    input_sha256: string; stdout_sha256: string; stderr_sha256: string; isolation_verified: false; proof_authority: "none" }; termination_confirmed: true }>((resolve, reject) => {
    let child: ChildProcessByStdio<null, Readable, Readable>;
    try {
      child = spawn(python, ["-I", "-B", "-X", "utf8", toNamespacedPath(scriptCopy), "--input-file", toNamespacedPath(inputPath)], {
        cwd: process.platform === "win32" ? shortWindowsCwd : toNamespacedPath(shortWindowsCwd), env, shell: false, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    } catch { reject(new ResearchSympyExecutionError("SYMPY_PROCESS_ERROR", true)); return; }
    let stdout = Buffer.alloc(0), stderr = Buffer.alloc(0), stopping: string | undefined, spawned = false;
    const stop = (code: string) => { stopping ??= code; if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL"); };
    const abort = () => stop("SYMPY_CANCELLED");
    const timer = setTimeout(() => stop("SYMPY_TIMEOUT"), execution.timeout_ms);
    execution.signal.addEventListener("abort", abort, { once: true });
    if (execution.signal.aborted) abort();
    child.once("spawn", () => {
      spawned = true;
      try { execution.onStarted?.({ runtime_kind: "fixed_python", pid: child.pid!, nonce: randomUUID(), script_sha256: config.script_sha256, started_at: new Date().toISOString() }); }
      catch { stop("SYMPY_HANDLE_RECORD_FAILED"); }
    });
    child.stdout.on("data", bytes => { if (stdout.length + bytes.length > 256 * 1024) stop("SYMPY_OUTPUT_LIMIT"); else stdout = Buffer.concat([stdout, bytes]); });
    child.stderr.on("data", bytes => { if (stderr.length + bytes.length > 64 * 1024) stop("SYMPY_OUTPUT_LIMIT"); else stderr = Buffer.concat([stderr, bytes]); });
    child.stdout.on("error", () => stop("SYMPY_PIPE_ERROR"));
    child.stderr.on("error", () => stop("SYMPY_PIPE_ERROR"));
    child.once("error", error => { clearTimeout(timer); execution.signal.removeEventListener("abort", abort);
      reject(new ResearchSympyExecutionError("SYMPY_PROCESS_ERROR", !spawned, (error as NodeJS.ErrnoException).code)); });
    child.once("close", code => {
      clearTimeout(timer); execution.signal.removeEventListener("abort", abort);
      if (stopping || code !== 0) { reject(new ResearchSympyExecutionError(stopping ?? "SYMPY_PROCESS_FAILED", true)); return; }
      let result: unknown;
      try {
        result = z.object({ ok: z.boolean(), runner_id: z.literal("sympy-exact"), exactness: z.string(), supports_status: z.enum(["none", "symbolically_checked"]),
          result: z.unknown(), vetoes: z.array(z.string()), warnings: z.array(z.string()) }).parse(JSON.parse(stdout.toString("utf8")));
      } catch { reject(new ResearchSympyExecutionError("SYMPY_RESPONSE_INVALID", true)); return; }
      resolve({ kind: "sympy_difference", result, metadata: { execution_mode: "local_process", python_sha256: config.python_sha256, script_sha256: config.script_sha256,
        input_sha256: digest(envelope), stdout_sha256: digest(stdout), stderr_sha256: digest(stderr), isolation_verified: false, proof_authority: "none" }, termination_confirmed: true });
    });
  }); } finally { if (shortWindowsCwd !== execution.workspace) await rm(shortWindowsCwd, { recursive: true, force: true }); }
}

export function runSympyExact(projectRoot: string, request: ComputeRunnerRequest) {
  return runPythonRunner(projectRoot, "sympy-exact", request);
}

export function runCounterexampleSearch(projectRoot: string, request: ComputeRunnerRequest) {
  return runPythonRunner(projectRoot, "counterexample-search", request);
}
