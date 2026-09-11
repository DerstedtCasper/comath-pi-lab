import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";
import { executeOwnedToolProcess } from "../../agents/runtime/owned-tool-executor.js";
import type { OwnedSessionCompletion } from "../../agents/runtime/owned-process-session.js";

export type LeanHostCommandResult = {
  exit_code: number;
  stdout: string;
  stderr: string;
};

export type LeanHostAsyncCommandOptions = Omit<Parameters<typeof executeOwnedToolProcess>[0], "command" | "cwd"> & {
  onCompleted?: (completion: OwnedSessionCompletion) => void;
};
export type LeanHostAsyncCommandResult = LeanHostCommandResult & {
  completion: OwnedSessionCompletion; executable: string; output_truncated: boolean;
};

/** Native owned execution only. Resource admission and release remain the caller's durable responsibilities. */
export async function runLeanToolCommandAsync(command: "lean" | "lake", args: string[], cwd: string, leanToolchain: string,
  options: LeanHostAsyncCommandOptions, extraEnv: Record<string, string> = {}): Promise<LeanHostAsyncCommandResult> {
  const executable = serviceToolBinary(command, leanToolchain);
  if (!executable || /\.(?:cmd|bat)$/iu.test(executable)) throw new Error("lean_native_tool_binary_required");
  const cap = options.max_output_bytes ?? 16 * 1024 * 1024;
  if (!Number.isSafeInteger(cap) || cap < 1 || cap > 64 * 1024 * 1024) throw new Error("lean_output_limit_invalid");
  const execution = await executeOwnedToolProcess({ ...options, command: { program: executable, args, env: extraEnv }, cwd, max_output_bytes: cap });
  const stdout: Buffer[] = [], stderr: Buffer[] = [];
  let retained = 0, truncated = false, streamError = false;
  try {
    for await (const chunk of execution.logs) {
      const available = cap - retained;
      if (available > 0) {
        const kept = Buffer.from(chunk.data.subarray(0, available));
        (chunk.stream === "stdout" ? stdout : stderr).push(kept); retained += kept.length;
      }
      if (chunk.data.length > available) { truncated = true; await execution.terminate(); }
    }
  } catch { streamError = true; await execution.terminate(); }
  const completion = await execution.completion;
  options.onCompleted?.(completion);
  const unsafe = streamError || truncated || completion.cancelled || completion.timed_out || !completion.termination_confirmed || !!completion.error_code;
  return { executable: completion.handle.binary_path, completion, output_truncated: truncated,
    exit_code: unsafe ? (completion.exit_code && completion.exit_code !== 0 ? completion.exit_code : 1) : completion.exit_code ?? 1,
    stdout: Buffer.concat(stdout).toString("utf8"), stderr: Buffer.concat(stderr).toString("utf8") };
}

export async function runLeanToolVersionCommandAsync(command: "lean" | "lake", args: string[], cwd: string,
  leanToolchain: string, options: LeanHostAsyncCommandOptions): Promise<string> {
  const result = await runLeanToolCommandAsync(command, args, cwd, leanToolchain, options);
  if (result.exit_code !== 0) throw new Error(`${command}_version_probe_failed`);
  return `${result.stdout}\n${result.stderr}`;
}

export function directElanTool(command: string, leanToolchain: string): string {
  const match = /^leanprover\/lean4:(v[0-9]+\.[0-9]+\.[0-9]+)$/.exec(leanToolchain.trim());
  if (!match || (command !== "lake" && command !== "lean")) {
    return command;
  }
  const exe = process.platform === "win32" ? `${command}.exe` : command;
  const toolchainDir = `leanprover--lean4---${match[1]}`;
  const elanHome = process.env.ELAN_HOME ?? join(homedir(), ".elan");
  const direct = join(elanHome, "toolchains", toolchainDir, "bin", exe);
  return existsSync(direct) ? direct : command;
}

export function findExecutableOnPath(command: string): string | undefined {
  const pathValue = process.env.PATH ?? "";
  const extensions = process.platform === "win32" ? (process.env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM").split(";") : [""];
  for (const dir of pathValue.split(delimiter).filter(Boolean)) {
    for (const extension of extensions) {
      const candidate = join(
        dir,
        process.platform === "win32" && extension && !command.toLowerCase().endsWith(extension.toLowerCase())
          ? `${command}${extension}`
          : command
      );
      if (existsSync(candidate)) {
        return candidate;
      }
    }
  }
  return undefined;
}

export function serviceToolBinary(command: "lean" | "lake", leanToolchain: string): string | undefined {
  const direct = directElanTool(command, leanToolchain);
  if (direct !== command && existsSync(direct)) {
    return direct;
  }
  return findExecutableOnPath(command);
}

function assertSafeWindowsCommandScriptToken(value: string): void {
  if (/[\r\n"&|<>^%!]/u.test(value)) {
    throw new Error("windows_command_script_unsafe_argument");
  }
}

function quoteWindowsCommandScriptToken(value: string): string {
  assertSafeWindowsCommandScriptToken(value);
  return `"${value}"`;
}

function formatWindowsCommandScriptArg(value: string): string {
  assertSafeWindowsCommandScriptToken(value);
  return /\s/u.test(value) ? `"${value}"` : value;
}

export function runLeanToolCommand(
  command: string,
  args: string[],
  cwd: string,
  leanToolchain: string,
  extraEnv?: Record<string, string | undefined>
): LeanHostCommandResult {
  const executable =
    command === "lean" || command === "lake"
      ? (serviceToolBinary(command, leanToolchain) ?? directElanTool(command, leanToolchain))
      : command;
  const windowsCommandScript = process.platform === "win32" && /\.(?:cmd|bat)$/iu.test(executable);
  let commandLine: string | undefined;
  if (windowsCommandScript) {
    try {
      commandLine = ["call", quoteWindowsCommandScriptToken(executable), ...args.map(formatWindowsCommandScriptArg)].join(" ");
    } catch (error) {
      return {
        exit_code: 1,
        stdout: "",
        stderr: error instanceof Error ? error.message : "windows_command_script_unsafe_argument"
      };
    }
  }
  const env = extraEnv ? { ...process.env, ...extraEnv } : process.env;
  const result = windowsCommandScript
    ? spawnSync("cmd.exe", ["/d", "/s", "/c", commandLine ?? ""], {
        cwd,
        env,
        encoding: "utf8",
        timeout: 30_000,
        windowsVerbatimArguments: true
      })
    : spawnSync(executable, args, { cwd, env, encoding: "utf8", timeout: 30_000 });
  return {
    exit_code: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? (result.error ? String(result.error) : "")
  };
}

export function runLeanToolVersionCommand(command: string, args: string[], cwd: string, leanToolchain: string): string {
  const result = runLeanToolCommand(command, args, cwd, leanToolchain);
  const output = `${result.stdout}\n${result.stderr}`;
  if (result.exit_code !== 0 && !output.trim()) {
    throw new Error(`${command}_version_missing`);
  }
  return output;
}

export function parseLeanVersionOutput(output: string): string | undefined {
  return /\bLean\s+(?:\(?version\s+)?([0-9]+\.[0-9]+\.[0-9]+)\b/i.exec(output)?.[1];
}

export function parseLakeVersionOutput(output: string): string | undefined {
  return /\bLake\s+(?:version\s+)?([0-9][^\r\n]*)/i.exec(output)?.[1]?.trim();
}

export function parseExpectedLeanToolchainVersion(leanToolchain: string): string | undefined {
  return /^leanprover\/lean4:v([0-9]+\.[0-9]+\.[0-9]+)$/.exec(leanToolchain.trim())?.[1];
}
