import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";

export type LeanHostCommandResult = {
  exit_code: number;
  stdout: string;
  stderr: string;
};

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
  return /version\s+([0-9]+\.[0-9]+\.[0-9]+)/i.exec(output)?.[1];
}

export function parseLakeVersionOutput(output: string): string | undefined {
  return /lake\s+version\s+([^\r\n]+)/i.exec(output)?.[1]?.trim();
}

export function parseExpectedLeanToolchainVersion(leanToolchain: string): string | undefined {
  return /^leanprover\/lean4:v([0-9]+\.[0-9]+\.[0-9]+)$/.exec(leanToolchain.trim())?.[1];
}
