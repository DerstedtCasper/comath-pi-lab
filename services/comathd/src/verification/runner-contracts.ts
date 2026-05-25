import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { sha256File } from "../artifacts/hash.js";
import { importArtifact } from "../artifacts/store.js";
import { getClaim } from "../claim/claim-store.js";
import { ComathError } from "../errors.js";
import { appendEvidenceRecord } from "../evidence/store.js";
import { assertPathAllowed } from "../security/path-policy.js";
import { type ArtifactRef, type Evidence } from "../types/schemas.js";
import { nextSequentialId } from "../utils/id.js";

const execFileAsync = promisify(execFile);
const OUTPUT_LIMIT = 64 * 1024;

export type RunnerId = "sympy-exact" | "counterexample-search" | "sage-placeholder" | "sat-placeholder";
export type RunnerExactness = "exact_symbolic" | "numeric_search" | "inexact" | "not_applicable";
export type RunnerSupportedStatus = "symbolically_checked" | "computationally_supported" | "none";

export type RunnerSpec = {
  runner_id: RunnerId;
  runner_version: string;
  script: string | null;
  shell: false;
  network: false;
  evidence_kind: Evidence["kind"];
};

export type ComputeRunnerRequest = {
  project_id: string;
  claim_id?: string;
  actor: string;
  timeout_ms: number;
  seed?: number;
  input: Record<string, unknown>;
};

export type RunnerMetadata = {
  cwd_policy: "project_root";
  network: false;
  shell: false;
  timeout_ms: number;
  seed?: number;
  input_sha256: string;
  script_sha256: string | null;
  replay_argv: string[];
  stdout_sha256: string;
  stderr_sha256: string;
  stdout_truncated: boolean;
  stderr_truncated: boolean;
};

export type ComputeRunnerResult = {
  ok: boolean;
  runner_id: RunnerId;
  runner_version: string;
  exactness: RunnerExactness;
  supports_status: RunnerSupportedStatus;
  result: unknown;
  result_sha256: string;
  stdout: string;
  stderr: string;
  vetoes: string[];
  warnings: string[];
  metadata: RunnerMetadata;
};

export type ComputeRunnerRun = {
  result: ComputeRunnerResult;
  artifact: ArtifactRef;
  evidence: Evidence;
  report_path: string;
};

export const runnerSpecs: readonly RunnerSpec[] = [
  {
    runner_id: "sympy-exact",
    runner_version: "phase10-sympy-exact-v1",
    script: "exact_compute.py",
    shell: false,
    network: false,
    evidence_kind: "symbolic"
  },
  {
    runner_id: "counterexample-search",
    runner_version: "phase10-counterexample-search-v1",
    script: "counterexample_search.py",
    shell: false,
    network: false,
    evidence_kind: "computation"
  },
  {
    runner_id: "sage-placeholder",
    runner_version: "phase10-sage-placeholder-v1",
    script: null,
    shell: false,
    network: false,
    evidence_kind: "computation"
  },
  {
    runner_id: "sat-placeholder",
    runner_version: "phase10-sat-placeholder-v1",
    script: null,
    shell: false,
    network: false,
    evidence_kind: "computation"
  }
] as const;

export function listRunnerSpecs(): RunnerSpec[] {
  return runnerSpecs.map((spec) => ({ ...spec }));
}

export function repoRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
}

export function pythonScriptPath(script: string): string {
  return join(repoRoot(), "python", script);
}

export function canonicalJson(value: unknown): string {
  return `${JSON.stringify(sortJson(value))}\n`;
}

export function sha256Text(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function runnerResultSha256(result: {
  ok?: unknown;
  runner_id?: unknown;
  runner_version?: unknown;
  exactness?: unknown;
  supports_status?: unknown;
  result?: unknown;
  vetoes?: unknown;
  warnings?: unknown;
}): string | null {
  if (typeof result.runner_id !== "string" || typeof result.runner_version !== "string") {
    return null;
  }
  return sha256Text(
    canonicalJson({
      ok: result.ok === true,
      runner_id: result.runner_id,
      runner_version: result.runner_version,
      exactness: typeof result.exactness === "string" ? result.exactness : "not_applicable",
      supports_status: typeof result.supports_status === "string" ? result.supports_status : "none",
      result: result.result ?? null,
      vetoes: asStringArray(result.vetoes),
      warnings: asStringArray(result.warnings)
    })
  );
}

export function scrubHostPaths(text: string): string {
  return text
    .replace(/\\\\\?\\[A-Za-z]:\\[^\s"'`]+/g, "<host-path>")
    .replace(/\\\\[^\s"'`]+/g, "<host-path>")
    .replace(/[A-Za-z]:[\\/][^\s"'`]+/g, "<host-path>")
    .replace(/\/(?:Users|home|tmp|var|opt|mnt|Volumes)\/[^\s"'`]+/g, "<host-path>");
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortJson(item));
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(record).sort().map((key) => [key, sortJson(record[key])]));
  }
  return value;
}

function getRunnerSpec(runnerId: RunnerId): RunnerSpec {
  const spec = runnerSpecs.find((item) => item.runner_id === runnerId);
  if (!spec) {
    throw new ComathError(`unknown runner id: ${runnerId}`, { code: "UNKNOWN_RUNNER" });
  }
  return spec;
}

function runnerReportDir(projectRoot: string, claimId: string | undefined): string {
  const owner = claimId ?? "unlinked";
  return assertPathAllowed(projectRoot, join(".comath", "evidence", owner, "runners"), { purpose: "runtime-write" });
}

function readRunnerReportIds(projectRoot: string, claimId: string | undefined): string[] {
  const dir = runnerReportDir(projectRoot, claimId);
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir)
    .filter((name) => /^RUN-\d{4,}\.json$/.test(name))
    .map((name) => name.slice(0, -".json".length));
}

function runnerReportPath(projectRoot: string, claimId: string | undefined): { id: string; path: string } {
  const id = nextSequentialId("RUN", readRunnerReportIds(projectRoot, claimId));
  return {
    id,
    path: assertPathAllowed(projectRoot, join(".comath", "evidence", claimId ?? "unlinked", "runners", `${id}.json`), {
      purpose: "runtime-write"
    })
  };
}

function truncate(text: string): { text: string; truncated: boolean } {
  if (Buffer.byteLength(text, "utf8") <= OUTPUT_LIMIT) {
    return { text, truncated: false };
  }
  return {
    text: text.slice(0, OUTPUT_LIMIT),
    truncated: true
  };
}

function parseRunnerStdout(stdout: string, spec: RunnerSpec, metadata: RunnerMetadata): ComputeRunnerResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch (error) {
    const failed = {
      ok: false,
      runner_id: spec.runner_id,
      runner_version: spec.runner_version,
      exactness: "not_applicable" as const,
      supports_status: "none" as const,
      result: { error: "invalid_runner_json" },
      vetoes: ["invalid_runner_json"],
      warnings: []
    };
    return {
      ...failed,
      result_sha256: runnerResultSha256(failed) ?? "",
      stdout: "",
      stderr: "",
      metadata
    };
  }

  if (!parsed || typeof parsed !== "object") {
    throw new ComathError("invalid runner result shape", { code: "RUNNER_RESULT_INVALID" });
  }
  const record = parsed as Record<string, unknown>;
  if (record.runner_id !== spec.runner_id) {
    throw new ComathError("runner id mismatch", { code: "RUNNER_RESULT_INVALID" });
  }

  const resultPayload = record.result ?? null;
  const exactness = String(record.exactness ?? "not_applicable") as RunnerExactness;
  const supports = String(record.supports_status ?? "none") as RunnerSupportedStatus;
  const vetoes = Array.isArray(record.vetoes) ? record.vetoes.filter((item): item is string => typeof item === "string") : [];
  const warnings = Array.isArray(record.warnings) ? record.warnings.filter((item): item is string => typeof item === "string") : [];
  const resultHash =
    runnerResultSha256({
      ok: record.ok === true,
      runner_id: spec.runner_id,
      runner_version: spec.runner_version,
      exactness,
      supports_status: supports,
      result: resultPayload,
      vetoes,
      warnings
    }) ?? "";

  return {
    ok: record.ok === true,
    runner_id: spec.runner_id,
    runner_version: spec.runner_version,
    exactness,
    supports_status: supports,
    result: resultPayload,
    result_sha256: resultHash,
    stdout: "",
    stderr: "",
    vetoes,
    warnings,
    metadata
  };
}

async function buildMetadata(
  spec: RunnerSpec,
  request: ComputeRunnerRequest,
  inputJson: string,
  scriptPath: string | null,
  stdout: string,
  stderr: string
): Promise<RunnerMetadata> {
  const safeStdout = scrubHostPaths(stdout);
  const safeStderr = scrubHostPaths(stderr);
  return {
    cwd_policy: "project_root",
    network: false,
    shell: false,
    timeout_ms: request.timeout_ms,
    seed: request.seed,
    input_sha256: sha256Text(inputJson),
    script_sha256: scriptPath ? (await sha256File(scriptPath)).sha256 : null,
    replay_argv: scriptPath
      ? ["python", `<runner-path>/${spec.script ?? "unknown"}`, "--input-json", "<canonical-json>"]
      : ["placeholder", spec.runner_id, "--input-json", "<canonical-json>"],
    stdout_sha256: sha256Text(safeStdout),
    stderr_sha256: sha256Text(safeStderr),
    stdout_truncated: truncate(safeStdout).truncated,
    stderr_truncated: truncate(safeStderr).truncated
  };
}

async function persistRunnerRun(
  projectRoot: string,
  request: ComputeRunnerRequest,
  spec: RunnerSpec,
  result: ComputeRunnerResult
): Promise<ComputeRunnerRun> {
  const report = runnerReportPath(projectRoot, request.claim_id);
  mkdirSync(dirname(report.path), { recursive: true });
  writeFileSync(
    report.path,
    canonicalJson({
      id: report.id,
      project_id: request.project_id,
      claim_id: request.claim_id,
      runner_id: spec.runner_id,
      result
    }),
    "utf8"
  );

  const artifact = await importArtifact({
    projectRoot,
    project_id: request.project_id,
    source_path: report.path,
    kind: "runner_output",
    actor: request.actor
  });
  const evidence = appendEvidenceRecord(projectRoot, {
    project_id: request.project_id,
    claim_id: request.claim_id,
    kind: spec.evidence_kind,
    summary: `${spec.runner_id} ${result.ok ? "completed" : "failed"} with exactness ${result.exactness}`,
    artifact_ids: [artifact.id]
  });

  appendAuditEvent(projectRoot, {
    project_id: request.project_id,
    event_type: result.ok ? "runner.completed" : "runner.failed",
    actor: request.actor,
    target_id: request.claim_id,
    payload: {
      runner_id: spec.runner_id,
      runner_version: spec.runner_version,
      exactness: result.exactness,
      supports_status: result.supports_status,
      result_sha256: result.result_sha256,
      artifact_id: artifact.id,
      evidence_id: evidence.id,
      vetoes: result.vetoes,
      warnings: result.warnings,
      metadata: result.metadata
    }
  });

  return { result, artifact, evidence, report_path: report.path };
}

function assertClaimExists(projectRoot: string, request: ComputeRunnerRequest): void {
  if (!request.claim_id) {
    return;
  }
  if (!getClaim(projectRoot, request.project_id, request.claim_id)) {
    throw new ComathError("claim not found", { statusCode: 404, code: "CLAIM_NOT_FOUND" });
  }
}

export async function runPythonRunner(
  projectRoot: string,
  runnerId: Extract<RunnerId, "sympy-exact" | "counterexample-search">,
  request: ComputeRunnerRequest
): Promise<ComputeRunnerRun> {
  assertClaimExists(projectRoot, request);
  const spec = getRunnerSpec(runnerId);
  if (!spec.script) {
    throw new ComathError(`runner ${runnerId} has no script`, { code: "RUNNER_SCRIPT_MISSING" });
  }
  const scriptPath = pythonScriptPath(spec.script);
  const inputJson = canonicalJson({
    runner_id: runnerId,
    runner_version: spec.runner_version,
    project_id: request.project_id,
    claim_id: request.claim_id,
    seed: request.seed,
    input: request.input
  });

  let stdout = "";
  let stderr = "";
  try {
    const execution = await execFileAsync("python", [scriptPath, "--input-json", inputJson], {
      cwd: projectRoot,
      encoding: "utf8",
      shell: false,
      windowsHide: true,
      timeout: request.timeout_ms,
      maxBuffer: OUTPUT_LIMIT
    });
    stdout = execution.stdout;
    stderr = execution.stderr;
  } catch (error) {
    const execError = error as { stdout?: string; stderr?: string; killed?: boolean; code?: unknown };
    stdout = typeof execError.stdout === "string" ? execError.stdout : "";
    stderr = typeof execError.stderr === "string" ? execError.stderr : "";
    const safeStdout = scrubHostPaths(stdout);
    const safeStderr = scrubHostPaths(stderr);
    const metadata = await buildMetadata(spec, request, inputJson, scriptPath, safeStdout, safeStderr);
    const failedEnvelope = {
      ok: false,
      runner_id: runnerId,
      runner_version: spec.runner_version,
      exactness: "not_applicable" as const,
      supports_status: "none" as const,
      result: { exit_code: execError.code ?? null, killed: execError.killed === true },
      vetoes: [execError.killed ? "runner_timeout" : "runner_failed"],
      warnings: []
    };
    const failed: ComputeRunnerResult = {
      ...failedEnvelope,
      result_sha256: runnerResultSha256(failedEnvelope) ?? "",
      stdout: truncate(safeStdout).text,
      stderr: truncate(safeStderr).text,
      metadata
    };
    return persistRunnerRun(projectRoot, request, spec, failed);
  }

  const safeStderr = scrubHostPaths(stderr);
  const metadata = await buildMetadata(spec, request, inputJson, scriptPath, "", safeStderr);
  const parsed = parseRunnerStdout(stdout, spec, metadata);
  parsed.stdout = truncate("").text;
  parsed.stderr = truncate(safeStderr).text;
  return persistRunnerRun(projectRoot, request, spec, parsed);
}

export async function runPlaceholderRunner(
  projectRoot: string,
  runnerId: Extract<RunnerId, "sage-placeholder" | "sat-placeholder">,
  request: ComputeRunnerRequest
): Promise<ComputeRunnerRun> {
  assertClaimExists(projectRoot, request);
  const spec = getRunnerSpec(runnerId);
  const inputJson = canonicalJson({
    runner_id: runnerId,
    runner_version: spec.runner_version,
    project_id: request.project_id,
    claim_id: request.claim_id,
    seed: request.seed,
    input: request.input
  });
  const metadata = await buildMetadata(spec, request, inputJson, null, "", "");
  const resultPayload = { message: `${runnerId} is not implemented in Phase 10` };
  const resultEnvelope = {
    ok: false,
    runner_id: runnerId,
    runner_version: spec.runner_version,
    exactness: "not_applicable" as const,
    supports_status: "none" as const,
    result: resultPayload,
    vetoes: ["not_implemented"],
    warnings: ["placeholder runner failed closed"]
  };
  const result: ComputeRunnerResult = {
    ...resultEnvelope,
    result_sha256: runnerResultSha256(resultEnvelope) ?? "",
    stdout: "",
    stderr: "",
    metadata
  };
  return persistRunnerRun(projectRoot, request, spec, result);
}
