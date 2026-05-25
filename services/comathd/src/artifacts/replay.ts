import { existsSync, readFileSync } from "node:fs";
import { basename, isAbsolute, join } from "node:path";
import { assertPathAllowed } from "../security/path-policy.js";
import { canonicalJson, runnerResultSha256, scrubHostPaths, sha256Text } from "../verification/runner-contracts.js";

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
