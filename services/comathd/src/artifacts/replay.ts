import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, isAbsolute, join } from "node:path";
import { promisify } from "node:util";
import { sha256File } from "./hash.js";
import { assertPathAllowed } from "../security/path-policy.js";
import {
  canonicalJson,
  pythonScriptPath,
  runnerResultSha256,
  runnerNetworkDenialPolicy,
  runnerSpecs,
  scrubHostPaths,
  sha256Text,
  type RunnerSpec
} from "../verification/runner-contracts.js";

const execFileAsync = promisify(execFile);
const OUTPUT_LIMIT = 64 * 1024;
const DEFAULT_REEXECUTION_TIMEOUT_MS = 5_000;
const MAX_REEXECUTION_TIMEOUT_MS = 30_000;

export type ReplayRunStatus = "replayable" | "unreplayable";

export type ReplayRunManifest = {
  report_relative_path: string;
  project_id?: string;
  claim_id?: string;
  runner_id: string;
  runner_version?: string;
  status: ReplayRunStatus;
  unreplayable_reason?: string;
  exactness?: string;
  supports_status?: string;
  seed?: number;
  timeout_ms?: number;
  input_sha256?: string;
  script_sha256?: string | null;
  result_sha256?: string;
  stdout_sha256?: string;
  stderr_sha256?: string;
  replay_argv: string[];
  sandbox_policy?: {
    shell: false;
    network: "denied_by_contract";
    cwd_policy: "project_root";
    allowed_executables: string[];
    os_isolation: "process_boundary_only";
    network_denial: typeof runnerNetworkDenialPolicy;
  };
  runner_env?: Record<typeof runnerNetworkDenialPolicy.env_var, typeof runnerNetworkDenialPolicy.env_value>;
  dependency_lock?: {
    runner_id: string;
    runner_version?: string;
    script_sha256?: string | null;
    python_packages: Record<string, string>;
  };
  environment: {
    node: string;
    platform: string;
    arch: string;
  };
  dependency_versions: {
    runner_version?: string;
    script_sha256?: string | null;
  };
};

export type ReplayManifest = {
  schema_version: 1;
  project_id: string;
  created_at: string;
  runs: ReplayRunManifest[];
  integrity: {
    runs_sha256: string;
  };
};

export type RunnerReplayIntegrity = {
  ok: boolean;
  vetoes: string[];
  warnings: string[];
};

export type RunnerReexecutionOptions = {
  cwd?: string;
};

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/");
}

function scrubReplayArgv(argv: string[]): string[] {
  return argv.map((item) => {
    if (isAbsolute(item) || /^[a-zA-Z]:[\\/]/.test(item) || item.startsWith("\\\\") || item.startsWith("//")) {
      return `<runner-path>/${basename(item)}`;
    }
    return item;
  });
}

function containsHostPath(value: unknown): boolean {
  if (typeof value === "string") {
    return scrubHostPaths(value) !== value;
  }
  if (Array.isArray(value)) {
    return value.some((item) => containsHostPath(item));
  }
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((item) => containsHostPath(item));
  }
  return false;
}

function runnerSpecForReplay(runnerId: string): RunnerSpec | null {
  const spec = runnerSpecs.find((item) => item.runner_id === runnerId);
  if (!spec || (spec.runner_id !== "sympy-exact" && spec.runner_id !== "counterexample-search")) {
    return null;
  }
  return spec;
}

function isPlaceholderRunner(runnerId: string): boolean {
  return runnerId.endsWith("-placeholder");
}

function expectedReplayArgv(spec: RunnerSpec): string[] {
  return ["python", `<runner-path>/${spec.script ?? "unknown"}`, "--input-json", "<canonical-json>"];
}

function sameStringArray(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function parseReplayInput(inputJson: unknown): { ok: true; value: Record<string, unknown> } | { ok: false } {
  if (typeof inputJson !== "string") {
    return { ok: false };
  }
  try {
    const parsed = JSON.parse(inputJson);
    return parsed && typeof parsed === "object" ? { ok: true, value: parsed as Record<string, unknown> } : { ok: false };
  } catch {
    return { ok: false };
  }
}

function hasValidSandboxPolicy(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }
  const policy = value as Record<string, unknown>;
  return (
    policy.shell === false &&
    policy.network === "denied_by_contract" &&
    policy.cwd_policy === "project_root" &&
    Array.isArray(policy.allowed_executables) &&
    policy.allowed_executables.every((item) => typeof item === "string") &&
    policy.os_isolation === "process_boundary_only" &&
    hasValidNetworkDenialPolicy(policy.network_denial)
  );
}

function hasValidNetworkDenialPolicy(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }
  const policy = value as Record<string, unknown>;
  return (
    policy.mode === runnerNetworkDenialPolicy.mode &&
    policy.env_var === runnerNetworkDenialPolicy.env_var &&
    policy.env_value === runnerNetworkDenialPolicy.env_value &&
    policy.enforcement === runnerNetworkDenialPolicy.enforcement
  );
}

function hasValidRunnerEnv(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }
  const env = value as Record<string, unknown>;
  return (
    Object.keys(env).length === 1 &&
    env[runnerNetworkDenialPolicy.env_var] === runnerNetworkDenialPolicy.env_value
  );
}

function hasValidDependencyLock(value: unknown, runnerId: string, runnerVersion: unknown, scriptSha256: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }
  const lock = value as Record<string, unknown>;
  return (
    lock.runner_id === runnerId &&
    lock.runner_version === runnerVersion &&
    lock.script_sha256 === scriptSha256 &&
    Boolean(lock.python_packages) &&
    typeof lock.python_packages === "object" &&
    !Array.isArray(lock.python_packages)
  );
}

function trustedReexecutionTimeout(value: unknown): { timeout_ms: number; vetoes: string[] } {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return { timeout_ms: DEFAULT_REEXECUTION_TIMEOUT_MS, vetoes: [] };
  }
  if (!Number.isInteger(value) || value <= 0 || value > MAX_REEXECUTION_TIMEOUT_MS) {
    return { timeout_ms: DEFAULT_REEXECUTION_TIMEOUT_MS, vetoes: ["runner_reexecution_timeout_untrusted"] };
  }
  return { timeout_ms: value, vetoes: [] };
}

function replayResultSha256(stdout: string, spec: RunnerSpec): { sha256?: string; vetoes: string[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    return { vetoes: ["runner_reexecution_invalid_json"] };
  }
  if (!parsed || typeof parsed !== "object") {
    return { vetoes: ["runner_reexecution_invalid_json"] };
  }
  const record = parsed as Record<string, unknown>;
  if (record.runner_id !== spec.runner_id) {
    return { vetoes: ["runner_reexecution_runner_id_mismatch"] };
  }

  const exactness = typeof record.exactness === "string" ? record.exactness : "not_applicable";
  const supportsStatus = typeof record.supports_status === "string" ? record.supports_status : "none";
  const vetoes = asStringArray(record.vetoes);
  const warnings = asStringArray(record.warnings);
  const sha256 = runnerResultSha256({
    ok: record.ok === true,
    runner_id: spec.runner_id,
    runner_version: spec.runner_version,
    exactness,
    supports_status: supportsStatus,
    result: record.result ?? null,
    vetoes,
    warnings
  });
  return sha256 ? { sha256, vetoes: [] } : { vetoes: ["runner_reexecution_invalid_json"] };
}

export function verifyRunnerReportReplayIntegrity(report: unknown): RunnerReplayIntegrity {
  const vetoes: string[] = [];
  const warnings: string[] = [];
  const record = report && typeof report === "object" ? (report as Record<string, any>) : undefined;
  const result = record?.result;
  const metadata = result && typeof result === "object" ? result.metadata : undefined;

  const expectedResultHash = result && typeof result === "object" ? runnerResultSha256(result) : null;
  if (!expectedResultHash || result.result_sha256 !== expectedResultHash) {
    vetoes.push("stale_runner_output");
  }
  if (containsHostPath(result?.stdout) || containsHostPath(result?.stderr) || containsHostPath(metadata)) {
    vetoes.push("runner_metadata_host_path_leak");
  }
  if (!metadata || typeof metadata !== "object") {
    vetoes.push("runner_metadata_missing");
  } else {
    if (!hasValidSandboxPolicy(metadata.sandbox_policy)) {
      vetoes.push("runner_sandbox_policy_missing");
    }
    if (!hasValidNetworkDenialPolicy(metadata.sandbox_policy?.network_denial) || !hasValidRunnerEnv(metadata.runner_env)) {
      vetoes.push("runner_network_denial_policy_missing");
    }
    if (!hasValidDependencyLock(metadata.dependency_lock, String(record?.runner_id ?? result?.runner_id ?? "unknown"), result?.runner_version, metadata.script_sha256)) {
      vetoes.push("runner_dependency_lock_missing");
    }
    if (!isSha256(metadata.input_sha256)) {
      vetoes.push("runner_input_hash_missing");
    }
    if (!isSha256(metadata.stdout_sha256)) {
      vetoes.push("runner_stdout_hash_missing");
    }
    if (!isSha256(metadata.stderr_sha256)) {
      vetoes.push("runner_stderr_hash_missing");
    }
    if (!Array.isArray(metadata.replay_argv) || metadata.replay_argv.length === 0) {
      vetoes.push("runner_replay_argv_missing");
    }
    if (isSha256(metadata.stdout_sha256) && metadata.stdout_truncated !== true) {
      const stdout = typeof result?.stdout === "string" ? result.stdout : undefined;
      if (stdout === undefined || metadata.stdout_sha256 !== sha256Text(stdout)) {
        vetoes.push("runner_stdout_hash_mismatch");
      }
    }
    if (isSha256(metadata.stderr_sha256) && metadata.stderr_truncated !== true) {
      const stderr = typeof result?.stderr === "string" ? result.stderr : undefined;
      if (stderr === undefined || metadata.stderr_sha256 !== sha256Text(stderr)) {
        vetoes.push("runner_stderr_hash_mismatch");
      }
    }
  }

  return { ok: vetoes.length === 0, vetoes: Array.from(new Set(vetoes)), warnings };
}

export async function verifyRunnerReportReexecution(
  report: unknown,
  options: RunnerReexecutionOptions = {}
): Promise<RunnerReplayIntegrity> {
  const vetoes: string[] = [];
  const warnings: string[] = [];
  const record = report && typeof report === "object" ? (report as Record<string, any>) : undefined;
  const result = record?.result && typeof record.result === "object" ? (record.result as Record<string, any>) : undefined;
  const metadata = result?.metadata && typeof result.metadata === "object" ? (result.metadata as Record<string, any>) : undefined;
  const runnerId = String(record?.runner_id ?? result?.runner_id ?? "unknown");

  if (isPlaceholderRunner(runnerId)) {
    return { ok: true, vetoes, warnings };
  }

  const spec = runnerSpecForReplay(runnerId);
  if (!spec || !spec.script) {
    return { ok: false, vetoes: ["runner_reexecution_unsupported_runner"], warnings };
  }

  if (!metadata) {
    return { ok: false, vetoes: ["runner_metadata_missing"], warnings };
  }
  if (!result) {
    return { ok: false, vetoes: ["runner_result_missing"], warnings };
  }

  const replayArgv = asStringArray(metadata.replay_argv);
  if (!sameStringArray(replayArgv, expectedReplayArgv(spec))) {
    vetoes.push("runner_reexecution_argv_untrusted");
  }
  if (!hasValidNetworkDenialPolicy(metadata.sandbox_policy?.network_denial) || !hasValidRunnerEnv(metadata.runner_env)) {
    vetoes.push("runner_network_denial_policy_missing");
  }

  const inputJson = typeof metadata.replay_input_json === "string" ? metadata.replay_input_json : undefined;
  if (!inputJson) {
    vetoes.push("runner_reexecution_input_missing");
  } else {
    const inputHash = sha256Text(inputJson);
    if (metadata.replay_input_sha256 !== inputHash || metadata.input_sha256 !== inputHash) {
      vetoes.push("runner_reexecution_input_hash_mismatch");
    }
    const replayInput = parseReplayInput(inputJson);
    if (
      !replayInput.ok ||
      replayInput.value.runner_id !== spec.runner_id ||
      replayInput.value.runner_version !== spec.runner_version ||
      replayInput.value.project_id !== record?.project_id ||
      replayInput.value.claim_id !== record?.claim_id
    ) {
      vetoes.push("runner_reexecution_input_mismatch");
    }
  }

  if (result?.runner_version !== spec.runner_version) {
    vetoes.push("runner_reexecution_runner_version_mismatch");
  }

  const replayTimeout = trustedReexecutionTimeout(metadata.timeout_ms);
  vetoes.push(...replayTimeout.vetoes);

  const scriptPath = pythonScriptPath(spec.script);
  try {
    const currentScriptHash = await sha256File(scriptPath);
    if (metadata.script_sha256 !== currentScriptHash.sha256) {
      vetoes.push("runner_reexecution_script_hash_mismatch");
    }
  } catch {
    vetoes.push("runner_reexecution_unavailable");
  }

  if (vetoes.length > 0 || !inputJson) {
    return { ok: false, vetoes: Array.from(new Set(vetoes)), warnings };
  }

  try {
    const execution = await execFileAsync("python", [scriptPath, "--input-json", inputJson], {
      cwd: options.cwd,
      env: {
        ...process.env,
        [runnerNetworkDenialPolicy.env_var]: runnerNetworkDenialPolicy.env_value
      },
      encoding: "utf8",
      shell: false,
      windowsHide: true,
      timeout: replayTimeout.timeout_ms,
      maxBuffer: OUTPUT_LIMIT
    });
    const replayHash = replayResultSha256(execution.stdout, spec);
    vetoes.push(...replayHash.vetoes);
    if (!replayHash.sha256 || result.result_sha256 !== replayHash.sha256) {
      vetoes.push("runner_reexecution_result_hash_mismatch");
    }
    const safeStderr = scrubHostPaths(execution.stderr ?? "");
    if (isSha256(metadata.stderr_sha256) && metadata.stderr_sha256 !== sha256Text(safeStderr)) {
      vetoes.push("runner_reexecution_stderr_hash_mismatch");
    }
  } catch (error) {
    const execError = error as { killed?: boolean; code?: unknown };
    vetoes.push(execError.killed ? "runner_reexecution_timeout" : "runner_reexecution_nonzero_exit");
  }

  return { ok: vetoes.length === 0, vetoes: Array.from(new Set(vetoes)), warnings };
}

function runFromReport(projectRoot: string, projectId: string, reportRelativePath: string): ReplayRunManifest {
  const absolutePath = assertPathAllowed(projectRoot, reportRelativePath, { purpose: "read", resolveRealpath: true });
  const raw = existsSync(absolutePath) ? JSON.parse(readFileSync(absolutePath, "utf8")) : {};
  const result = raw?.result ?? {};
  const metadata = result?.metadata ?? {};
  const replayArgv = scrubReplayArgv(asStringArray(metadata.replay_argv));
  const runnerId = String(raw?.runner_id ?? result?.runner_id ?? "unknown");
  const runnerVersion = typeof result?.runner_version === "string" ? result.runner_version : undefined;
  const integrity = verifyRunnerReportReplayIntegrity(raw);
  const placeholder = replayArgv[0] === "placeholder" || runnerId.endsWith("-placeholder");
  const missingScript = metadata.script_sha256 === null && !placeholder;
  const status: ReplayRunStatus = integrity.ok && !placeholder && !missingScript ? "replayable" : "unreplayable";
  const unreplayableReason = !integrity.ok
    ? integrity.vetoes.join(";")
    : placeholder
      ? "placeholder_runner_has_no_executable_replay"
      : missingScript
        ? "runner_script_hash_missing"
        : undefined;

  return {
    report_relative_path: normalizeRelativePath(reportRelativePath),
    project_id: typeof raw?.project_id === "string" ? raw.project_id : projectId,
    claim_id: typeof raw?.claim_id === "string" ? raw.claim_id : undefined,
    runner_id: runnerId,
    runner_version: runnerVersion,
    status,
    unreplayable_reason: unreplayableReason,
    exactness: typeof result?.exactness === "string" ? result.exactness : undefined,
    supports_status: typeof result?.supports_status === "string" ? result.supports_status : undefined,
    seed: typeof metadata.seed === "number" ? metadata.seed : undefined,
    timeout_ms: typeof metadata.timeout_ms === "number" ? metadata.timeout_ms : undefined,
    input_sha256: isSha256(metadata.input_sha256) ? metadata.input_sha256 : undefined,
    script_sha256: isSha256(metadata.script_sha256) || metadata.script_sha256 === null ? metadata.script_sha256 : undefined,
    result_sha256: isSha256(result?.result_sha256) ? result.result_sha256 : undefined,
    stdout_sha256: isSha256(metadata.stdout_sha256) ? metadata.stdout_sha256 : undefined,
    stderr_sha256: isSha256(metadata.stderr_sha256) ? metadata.stderr_sha256 : undefined,
    replay_argv: replayArgv,
    sandbox_policy: hasValidSandboxPolicy(metadata.sandbox_policy) ? metadata.sandbox_policy : undefined,
    runner_env: hasValidRunnerEnv(metadata.runner_env) ? metadata.runner_env : undefined,
    dependency_lock: hasValidDependencyLock(metadata.dependency_lock, runnerId, runnerVersion, metadata.script_sha256)
      ? metadata.dependency_lock
      : undefined,
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch
    },
    dependency_versions: {
      runner_version: runnerVersion,
      script_sha256: isSha256(metadata.script_sha256) || metadata.script_sha256 === null ? metadata.script_sha256 : undefined
    }
  };
}

export function createReplayManifest(
  projectRoot: string,
  projectId: string,
  runnerReportRelativePaths: string[],
  createdAt = new Date().toISOString()
): ReplayManifest {
  const runs = runnerReportRelativePaths
    .map((path) => normalizeRelativePath(path))
    .sort()
    .map((path) => runFromReport(projectRoot, projectId, path));
  return {
    schema_version: 1,
    project_id: projectId,
    created_at: createdAt,
    runs,
    integrity: {
      runs_sha256: sha256Text(canonicalJson(runs))
    }
  };
}

export function replayManifestPath(snapshotRoot: string): string {
  return join(snapshotRoot, "replay_manifest.json");
}
