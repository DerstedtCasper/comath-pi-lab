import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, realpathSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { importArtifact } from "../artifacts/store.js";
import { getClaim } from "../claim/claim-store.js";
import { ComathError } from "../errors.js";
import { appendEvidenceRecord } from "../evidence/store.js";
import { assertPathAllowed } from "../security/path-policy.js";
import { type ArtifactRef, type ClaimStatus, type Evidence } from "../types/schemas.js";
import { nextSequentialId } from "../utils/id.js";
import { canonicalJson, scrubHostPaths } from "./runner-contracts.js";
import { promoteClaim, type ClaimPromotionDecision } from "./gate.js";

const execFileAsync = promisify(execFile);

export type MathProveBridgeMode = "plan" | "route" | "final_audit";

export type MathProveGateResult = "passed" | "failed";

export type MathProveBridgeVersion = "phase9-mock" | "phase25-external-v1" | "phase58-final-audit-v1";

export type MathProveExternalMetadata = {
  runner_id: "mathprove-skill.verify_sympy" | "mathprove-skill.final_audit";
  runner_version: "phase25-external-v1" | "phase58-final-audit-v1";
  mathprove_root: string;
  script_path: string;
  script_sha256: string | null;
  workspace_path: string;
  run_dir: string;
  argv_template: string[];
  timeout_ms: number;
  network: false;
  invoked: boolean;
  exit_code: number | null;
  stdout_sha256: string;
  stderr_sha256: string;
  result_sha256: string;
  replay_input_sha256: string;
  steps_sha256?: string;
  solution_sha256?: string;
};

export type MathProveBridgeResult = {
  ok: boolean;
  bridge_version: MathProveBridgeVersion;
  mode: MathProveBridgeMode;
  claim_id: string;
  claim_statement_hash?: string;
  target_status: ClaimStatus;
  gate_result: MathProveGateResult;
  evidence: unknown[];
  artifacts: unknown[];
  vetoes: string[];
  warnings: string[];
  metadata?: MathProveExternalMetadata;
  mathprove?: Record<string, unknown>;
};

export type MathProveBridgeRequest = {
  project_id: string;
  claim_id: string;
  mode: MathProveBridgeMode;
  target_status: ClaimStatus;
  actor: string;
};

export type MathProveBridgeRun = {
  result: MathProveBridgeResult;
  artifact: ArtifactRef;
  evidence: Evidence;
  report_path: string;
};

export type MathProvePromotionDecision = ClaimPromotionDecision & {
  bridge: MathProveBridgeRun;
};

export type MathProveExternalBridgeOptions = {
  mathprove_root?: string;
  expected_statement_hash?: string;
  timeout_ms?: number;
};

export type MathProvePromotionBridgeOptions = MathProveExternalBridgeOptions & {
  backend?: "mock" | "external" | "external-final-audit";
};

function repoRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
}

function bridgeScriptPath(): string {
  return join(repoRoot(), "python", "mathprove_bridge.py");
}

function defaultMathProveRoot(): string {
  return resolve(repoRoot(), "..", "MathProve-Skill");
}

function equivalentExistingPath(left: string, right: string): boolean {
  try {
    return realpathSync.native(left) === realpathSync.native(right);
  } catch {
    return resolve(left) === resolve(right);
  }
}

function bridgeReportDir(projectRoot: string, claimId: string): string {
  return assertPathAllowed(projectRoot, join(".comath", "evidence", claimId, "mathprove"), {
    purpose: "runtime-write"
  });
}

function readBridgeReportIds(projectRoot: string, claimId: string): string[] {
  const dir = bridgeReportDir(projectRoot, claimId);
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir)
    .filter((name) => /^MPBR-\d{4,}\.json$/.test(name))
    .map((name) => name.slice(0, -".json".length));
}

function bridgeReportPath(projectRoot: string, claimId: string, existingIds: readonly string[]): { id: string; path: string } {
  const id = nextSequentialId("MPBR", existingIds);
  return {
    id,
    path: assertPathAllowed(projectRoot, join(".comath", "evidence", claimId, "mathprove", `${id}.json`), {
      purpose: "runtime-write"
    })
  };
}

function ensureStringArray(value: unknown): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : [];
}

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function sha256Json(value: unknown): string {
  return sha256Text(canonicalJson(value));
}

function sha256FileOrNull(path: string): string | null {
  if (!existsSync(path)) {
    return null;
  }
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function unique(items: readonly string[]): string[] {
  return [...new Set(items)];
}

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/");
}

function scrubHostPathsDeep(value: unknown): unknown {
  if (typeof value === "string") {
    return scrubHostPaths(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => scrubHostPathsDeep(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, scrubHostPathsDeep(item)])
    );
  }
  return value;
}

function validateBridgeShape(value: unknown): MathProveBridgeResult {
  if (!value || typeof value !== "object") {
    throw new ComathError("invalid MathProve bridge result", { code: "MATHPROVE_RESULT_INVALID" });
  }
  const record = value as Record<string, unknown>;
  const mode = record.mode;
  const targetStatus = record.target_status;
  if (!["plan", "route", "final_audit"].includes(String(mode))) {
    throw new ComathError("invalid MathProve bridge result: unknown mode", { code: "MATHPROVE_RESULT_INVALID" });
  }
  if (!["passed", "failed"].includes(String(record.gate_result))) {
    throw new ComathError("invalid MathProve bridge result: unknown gate_result", { code: "MATHPROVE_RESULT_INVALID" });
  }
  if (typeof record.ok !== "boolean" || typeof record.claim_id !== "string" || typeof targetStatus !== "string") {
    throw new ComathError("invalid MathProve bridge result: missing required fields", {
      code: "MATHPROVE_RESULT_INVALID"
    });
  }
  if (!Array.isArray(record.evidence) || !Array.isArray(record.artifacts)) {
    throw new ComathError("invalid MathProve bridge result: evidence/artifacts must be arrays", {
      code: "MATHPROVE_RESULT_INVALID"
    });
  }
  const bridgeVersion = String(record.bridge_version);
  if (!["phase9-mock", "phase25-external-v1", "phase58-final-audit-v1"].includes(bridgeVersion)) {
    throw new ComathError("invalid MathProve bridge result: unknown bridge_version", {
      code: "MATHPROVE_RESULT_INVALID"
    });
  }

  return {
    ok: record.ok,
    bridge_version: bridgeVersion as MathProveBridgeVersion,
    mode: mode as MathProveBridgeMode,
    claim_id: record.claim_id,
    claim_statement_hash: typeof record.claim_statement_hash === "string" ? record.claim_statement_hash : undefined,
    target_status: targetStatus as ClaimStatus,
    gate_result: record.gate_result as MathProveGateResult,
    evidence: record.evidence,
    artifacts: record.artifacts,
    vetoes: ensureStringArray(record.vetoes),
    warnings: ensureStringArray(record.warnings),
    metadata: record.metadata as MathProveExternalMetadata | undefined,
    mathprove: record.mathprove as Record<string, unknown> | undefined
  };
}

export function parseMathProveBridgeResult(
  stdout: string,
  expected: Pick<MathProveBridgeRequest, "claim_id" | "mode" | "target_status">
): MathProveBridgeResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch (error) {
    throw new ComathError("invalid MathProve bridge JSON", {
      code: "MATHPROVE_JSON_INVALID"
    });
  }

  const result = validateBridgeShape(parsed);
  if (result.claim_id !== expected.claim_id) {
    throw new ComathError("MathProve bridge claim mismatch", { code: "MATHPROVE_CLAIM_MISMATCH" });
  }
  if (result.mode !== expected.mode) {
    throw new ComathError("MathProve bridge mode mismatch", { code: "MATHPROVE_MODE_MISMATCH" });
  }
  if (result.target_status !== expected.target_status) {
    throw new ComathError("MathProve bridge target status mismatch", { code: "MATHPROVE_TARGET_MISMATCH" });
  }
  if (result.gate_result !== "failed") {
    throw new ComathError("MathProve bridge must remain non-authoritative", {
      code: "MATHPROVE_BRIDGE_AUTHORITY_ESCALATION"
    });
  }
  if (result.bridge_version === "phase9-mock" && result.ok) {
    throw new ComathError("Phase 9 MathProve bridge must fail closed", { code: "MATHPROVE_PHASE9_NOT_FAIL_CLOSED" });
  }
  return result;
}

async function executeBridge(projectRoot: string, request: MathProveBridgeRequest): Promise<MathProveBridgeResult> {
  const scriptPath = bridgeScriptPath();
  const { stdout } = await execFileAsync(
    "python",
    [
      scriptPath,
      "--project-root",
      projectRoot,
      "--claim",
      request.claim_id,
      "--mode",
      request.mode,
      "--target-status",
      request.target_status
    ],
    {
      cwd: repoRoot(),
      encoding: "utf8",
      windowsHide: true,
      timeout: 30_000,
      maxBuffer: 1024 * 1024
    }
  );
  return parseMathProveBridgeResult(stdout, request);
}

async function archiveMathProveBridgeRun(
  projectRoot: string,
  request: MathProveBridgeRequest,
  result: MathProveBridgeResult,
  backend: "mock" | "external" | "external-final-audit",
  summary: string
): Promise<MathProveBridgeRun> {
  const report = bridgeReportPath(projectRoot, request.claim_id, readBridgeReportIds(projectRoot, request.claim_id));
  mkdirSync(dirname(report.path), { recursive: true });
  writeFileSync(
    report.path,
    `${JSON.stringify(
      {
        id: report.id,
        project_id: request.project_id,
        claim_id: request.claim_id,
        mode: request.mode,
        target_status: request.target_status,
        bridge: "mathprove",
        backend,
        result
      },
      null,
      2
    )}\n`,
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
    kind: "audit",
    summary,
    artifact_ids: [artifact.id]
  });
  appendAuditEvent(projectRoot, {
    project_id: request.project_id,
    event_type: "mathprove.bridge_ran",
    actor: request.actor,
    target_id: request.claim_id,
    payload: {
      backend,
      mode: request.mode,
      target_status: request.target_status,
      ok: result.ok,
      gate_result: result.gate_result,
      vetoes: result.vetoes,
      warnings: result.warnings,
      report_id: report.id,
      artifact_id: artifact.id,
      evidence_id: evidence.id
    }
  });

  return {
    result,
    artifact,
    evidence,
    report_path: report.path
  };
}

export async function runMathProveBridgeMock(
  projectRoot: string,
  request: MathProveBridgeRequest
): Promise<MathProveBridgeRun> {
  const claim = getClaim(projectRoot, request.project_id, request.claim_id);
  if (!claim) {
    throw new ComathError("claim not found", { statusCode: 404, code: "CLAIM_NOT_FOUND" });
  }

  const result = await executeBridge(projectRoot, request);
  return archiveMathProveBridgeRun(
    projectRoot,
    request,
    result,
    "mock",
    `MathProve ${request.mode} mock failed closed for ${request.target_status}`
  );
}

function targetStatusVetoes(targetStatus: ClaimStatus): string[] {
  if (targetStatus === "formally_checked") {
    return ["mathprove_external_not_formal_authority", "missing_kernel_checked_artifact"];
  }
  if (targetStatus === "symbolically_checked") {
    return ["mathprove_external_not_symbolic_authority", "missing_exact_symbolic_artifact"];
  }
  if (targetStatus === "literature_supported") {
    return ["mathprove_external_not_literature_authority", "missing_exact_citation_artifact"];
  }
  if (targetStatus === "computationally_supported") {
    return ["mathprove_external_not_compute_authority", "missing_replayable_compute_artifact"];
  }
  return ["mathprove_external_not_claim_status_authority"];
}

function buildExternalMetadata(input: {
  workspaceRelativePath: string;
  scriptSha256: string | null;
  replayInputSha256: string;
  timeoutMs: number;
  invoked: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  parsedResult: unknown;
}): MathProveExternalMetadata {
  return {
    runner_id: "mathprove-skill.verify_sympy",
    runner_version: "phase25-external-v1",
    mathprove_root: "<external-mathprove-root>",
    script_path: "<mathprove-root>/scripts/verify_sympy.py",
    script_sha256: input.scriptSha256,
    workspace_path: input.workspaceRelativePath,
    run_dir: "run",
    argv_template: [
      "python",
      "<mathprove-root>/scripts/verify_sympy.py",
      "--workspace-dir <controlled-workspace>",
      "--run-dir run",
      "--log logs/tool_calls.log",
      "--timeout <bounded-timeout-ms>",
      "--code <comath-generated-sympy-code>"
    ],
    timeout_ms: input.timeoutMs,
    network: false,
    invoked: input.invoked,
    exit_code: input.exitCode,
    stdout_sha256: sha256Text(scrubHostPaths(input.stdout)),
    stderr_sha256: sha256Text(scrubHostPaths(input.stderr)),
    result_sha256: sha256Json(input.parsedResult),
    replay_input_sha256: input.replayInputSha256
  };
}

function buildExternalResult(input: {
  request: MathProveBridgeRequest;
  claimStatementHash: string;
  vetoes: string[];
  warnings: string[];
  ok: boolean;
  metadata: MathProveExternalMetadata;
  mathprove: Record<string, unknown>;
}): MathProveBridgeResult {
  return {
    ok: input.ok,
    bridge_version: "phase25-external-v1",
    mode: input.request.mode,
    claim_id: input.request.claim_id,
    claim_statement_hash: input.claimStatementHash,
    target_status: input.request.target_status,
    gate_result: "failed",
    evidence: [],
    artifacts: [],
    vetoes: unique(["mathprove_external_not_claim_proof", ...targetStatusVetoes(input.request.target_status), ...input.vetoes]),
    warnings: unique([
      "external MathProve output is runner evidence only",
      "CoMath proof-kernel replay remains the authority for formally_checked claims",
      ...input.warnings
    ]),
    metadata: input.metadata,
    mathprove: input.mathprove
  };
}

function buildFinalAuditMetadata(input: {
  workspaceRelativePath: string;
  scriptSha256: string | null;
  replayInputSha256: string;
  stepsSha256: string;
  solutionSha256: string;
  timeoutMs: number;
  invoked: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  parsedResult: unknown;
}): MathProveExternalMetadata {
  return {
    runner_id: "mathprove-skill.final_audit",
    runner_version: "phase58-final-audit-v1",
    mathprove_root: "<external-mathprove-root>",
    script_path: "<mathprove-root>/scripts/final_audit.py",
    script_sha256: input.scriptSha256,
    workspace_path: input.workspaceRelativePath,
    run_dir: "run",
    argv_template: [
      "python",
      "<mathprove-root>/scripts/final_audit.py",
      "--workspace-dir <controlled-workspace>",
      "--run-dir run",
      "--log logs/tool_calls.log",
      "--steps <comath-generated-steps-json>",
      "--solution audit/Solution.md",
      "--timeout <bounded-timeout-seconds>"
    ],
    timeout_ms: input.timeoutMs,
    network: false,
    invoked: input.invoked,
    exit_code: input.exitCode,
    stdout_sha256: sha256Text(scrubHostPaths(input.stdout)),
    stderr_sha256: sha256Text(scrubHostPaths(input.stderr)),
    result_sha256: sha256Json(input.parsedResult),
    replay_input_sha256: input.replayInputSha256,
    steps_sha256: input.stepsSha256,
    solution_sha256: input.solutionSha256
  };
}

function buildFinalAuditResult(input: {
  request: MathProveBridgeRequest;
  claimStatementHash: string;
  vetoes: string[];
  warnings: string[];
  ok: boolean;
  metadata: MathProveExternalMetadata;
  mathprove: Record<string, unknown>;
}): MathProveBridgeResult {
  return {
    ok: input.ok,
    bridge_version: "phase58-final-audit-v1",
    mode: input.request.mode,
    claim_id: input.request.claim_id,
    claim_statement_hash: input.claimStatementHash,
    target_status: input.request.target_status,
    gate_result: "failed",
    evidence: [],
    artifacts: [],
    vetoes: unique([
      "mathprove_final_audit_not_claim_proof",
      "mathprove_final_audit_not_formal_authority",
      ...targetStatusVetoes(input.request.target_status),
      ...input.vetoes
    ]),
    warnings: unique([
      "MathProve final audit is non-authoritative CoMath runner evidence",
      "CoMath proof-kernel replay remains the authority for formally_checked claims",
      ...input.warnings
    ]),
    metadata: input.metadata,
    mathprove: input.mathprove
  };
}

export function isMathProveFinalAuditPassed(parsedResult: Record<string, unknown>, exitCode: number | null): boolean {
  const report = Array.isArray(parsedResult.report) ? parsedResult.report : [];
  return (
    exitCode === 0 &&
    parsedResult.status === "passed" &&
    report.length > 0 &&
    report.every((entry) => (entry as Record<string, unknown>).status === "passed")
  );
}

export async function runMathProveBridgeExternal(
  projectRoot: string,
  request: MathProveBridgeRequest,
  options: MathProveExternalBridgeOptions = {}
): Promise<MathProveBridgeRun> {
  const claim = getClaim(projectRoot, request.project_id, request.claim_id);
  if (!claim) {
    throw new ComathError("claim not found", { statusCode: 404, code: "CLAIM_NOT_FOUND" });
  }

  const mathproveRoot = resolve(options.mathprove_root ?? defaultMathProveRoot());
  const trustedMathProveRoot = defaultMathProveRoot();
  const scriptPath = join(mathproveRoot, "scripts", "verify_sympy.py");
  const timeoutMs = Math.min(Math.max(options.timeout_ms ?? 5_000, 1_000), 10_000);
  const workspacePath = assertPathAllowed(
    projectRoot,
    join(".comath", "evidence", request.claim_id, "mathprove", "external-workspace"),
    { purpose: "runtime-write" }
  );
  const workspaceRelativePath = normalizeRelativePath(join(".comath", "evidence", request.claim_id, "mathprove", "external-workspace"));
  const replayInput = {
    bridge_version: "phase25-external-v1",
    runner_id: "mathprove-skill.verify_sympy",
    claim_id: request.claim_id,
    statement_hash: claim.statement_hash,
    mode: request.mode,
    target_status: request.target_status,
    sympy_check: "expand((x + 1)**2) == x**2 + 2*x + 1"
  };
  const replayInputSha256 = sha256Json(replayInput);
  const expectedStatementHash = options.expected_statement_hash ?? claim.statement_hash;

  if (!equivalentExistingPath(mathproveRoot, trustedMathProveRoot)) {
    const metadata = buildExternalMetadata({
      workspaceRelativePath,
      scriptSha256: null,
      replayInputSha256,
      timeoutMs,
      invoked: false,
      exitCode: null,
      stdout: "",
      stderr: "",
      parsedResult: { status: "not_invoked", reason: "untrusted_runner_root" }
    });
    const result = buildExternalResult({
      request,
      claimStatementHash: claim.statement_hash,
      ok: false,
      metadata,
      mathprove: { status: "not_invoked", reason: "untrusted_runner_root" },
      vetoes: ["mathprove_external_runner_untrusted_root"],
      warnings: []
    });
    return archiveMathProveBridgeRun(
      projectRoot,
      request,
      result,
      "external",
      `MathProve ${request.mode} external runner root rejected for ${request.target_status}`
    );
  }

  if (expectedStatementHash !== claim.statement_hash) {
    const metadata = buildExternalMetadata({
      workspaceRelativePath,
      scriptSha256: sha256FileOrNull(scriptPath),
      replayInputSha256,
      timeoutMs,
      invoked: false,
      exitCode: null,
      stdout: "",
      stderr: "",
      parsedResult: { status: "not_invoked", reason: "statement_hash_mismatch" }
    });
    const result = buildExternalResult({
      request,
      claimStatementHash: claim.statement_hash,
      ok: false,
      metadata,
      mathprove: { status: "not_invoked", reason: "statement_hash_mismatch" },
      vetoes: ["mathprove_claim_statement_hash_mismatch"],
      warnings: []
    });
    return archiveMathProveBridgeRun(
      projectRoot,
      request,
      result,
      "external",
      `MathProve ${request.mode} external bridge rejected statement hash mismatch for ${request.target_status}`
    );
  }

  if (!existsSync(scriptPath)) {
    const metadata = buildExternalMetadata({
      workspaceRelativePath,
      scriptSha256: null,
      replayInputSha256,
      timeoutMs,
      invoked: false,
      exitCode: null,
      stdout: "",
      stderr: "",
      parsedResult: { status: "not_invoked", reason: "runner_unavailable" }
    });
    const result = buildExternalResult({
      request,
      claimStatementHash: claim.statement_hash,
      ok: false,
      metadata,
      mathprove: { status: "not_invoked", reason: "runner_unavailable" },
      vetoes: ["mathprove_external_runner_unavailable"],
      warnings: []
    });
    return archiveMathProveBridgeRun(
      projectRoot,
      request,
      result,
      "external",
      `MathProve ${request.mode} external runner unavailable for ${request.target_status}`
    );
  }

  mkdirSync(join(workspacePath, "logs"), { recursive: true });
  const logPath = join(workspacePath, "logs", "tool_calls.log");
  const code = [
    "x = symbols('x')",
    "ok = bool(expand((x + 1)**2) == x**2 + 2*x + 1)",
    `emit({'ok': ok, 'claim_id': ${JSON.stringify(request.claim_id)}, 'statement_hash': ${JSON.stringify(claim.statement_hash)}})`
  ].join("; ");
  let stdout = "";
  let stderr = "";
  let exitCode: number | null = null;
  let parsedResult: Record<string, unknown>;
  try {
    const completed = await execFileAsync(
      "python",
      [
        scriptPath,
        "--workspace-dir",
        workspacePath,
        "--run-dir",
        "run",
        "--log",
        logPath,
        "--timeout",
        String(Math.ceil(timeoutMs / 1000)),
        "--code",
        code
      ],
      {
        cwd: repoRoot(),
        encoding: "utf8",
        shell: false,
        windowsHide: true,
        timeout: timeoutMs + 5_000,
        maxBuffer: 1024 * 1024
      }
    );
    stdout = completed.stdout;
    stderr = completed.stderr;
    exitCode = 0;
  } catch (error) {
    const processError = error as { stdout?: string; stderr?: string; code?: number | string | null };
    stdout = processError.stdout ?? "";
    stderr = processError.stderr ?? "";
    exitCode = typeof processError.code === "number" ? processError.code : null;
  }

  try {
    parsedResult = scrubHostPathsDeep(JSON.parse(stdout)) as Record<string, unknown>;
  } catch {
    parsedResult = {
      status: "error",
      error_type: "invalid_json",
      stdout: scrubHostPaths(stdout),
      stderr: scrubHostPaths(stderr)
    };
  }

  const output = parsedResult.output;
  const outputRecord = output && typeof output === "object" ? (output as Record<string, unknown>) : {};
  const resultOk =
    exitCode === 0 &&
    parsedResult.status === "success" &&
    outputRecord.ok === true &&
    outputRecord.claim_id === request.claim_id &&
    outputRecord.statement_hash === claim.statement_hash;
  const vetoes = resultOk ? [] : ["mathprove_external_runner_failed"];
  if (parsedResult.status === "success" && outputRecord.statement_hash !== claim.statement_hash) {
    vetoes.push("mathprove_claim_statement_hash_mismatch");
  }
  const metadata = buildExternalMetadata({
    workspaceRelativePath,
    scriptSha256: sha256FileOrNull(scriptPath),
    replayInputSha256,
    timeoutMs,
    invoked: true,
    exitCode,
    stdout,
    stderr,
    parsedResult
  });
  const result = buildExternalResult({
    request,
    claimStatementHash: claim.statement_hash,
    ok: resultOk,
    metadata,
    mathprove: parsedResult,
    vetoes,
    warnings: []
  });
  return archiveMathProveBridgeRun(
    projectRoot,
    request,
    result,
    "external",
    `MathProve ${request.mode} external bridge ran as non-authoritative evidence for ${request.target_status}`
  );
}

export async function runMathProveFinalAuditExternal(
  projectRoot: string,
  request: MathProveBridgeRequest,
  options: MathProveExternalBridgeOptions = {}
): Promise<MathProveBridgeRun> {
  const claim = getClaim(projectRoot, request.project_id, request.claim_id);
  if (!claim) {
    throw new ComathError("claim not found", { statusCode: 404, code: "CLAIM_NOT_FOUND" });
  }
  if (request.mode !== "final_audit") {
    throw new ComathError("MathProve final-audit runner requires final_audit mode", { code: "MATHPROVE_MODE_MISMATCH" });
  }

  const mathproveRoot = resolve(options.mathprove_root ?? defaultMathProveRoot());
  const trustedMathProveRoot = defaultMathProveRoot();
  const scriptPath = join(mathproveRoot, "scripts", "final_audit.py");
  const timeoutMs = Math.min(Math.max(options.timeout_ms ?? 8_000, 1_000), 15_000);
  const timeoutSeconds = Math.max(1, Math.ceil(timeoutMs / 1000));
  const workspacePath = assertPathAllowed(
    projectRoot,
    join(".comath", "evidence", request.claim_id, "mathprove", "final-audit-workspace"),
    { purpose: "runtime-write" }
  );
  const workspaceRelativePath = normalizeRelativePath(
    join(".comath", "evidence", request.claim_id, "mathprove", "final-audit-workspace")
  );
  const expectedStatementHash = options.expected_statement_hash ?? claim.statement_hash;
  const stepsPayload = {
    problem: claim.statement,
    claim_id: request.claim_id,
    statement_hash: claim.statement_hash,
    steps: [
      {
        id: "S1",
        goal: "Run a deterministic symbolic audit smoke for CoMath MathProve final-audit integration.",
        difficulty: "smoke",
        route: "sympy",
        evidence_path: "comath-generated-final-audit-smoke",
        checker: {
          type: "sympy",
          timeout: timeoutSeconds,
          code: "x = symbols('x'); emit({'ok': bool(expand((x + 1)**2) == x**2 + 2*x + 1)})"
        }
      }
    ]
  };
  const stepsSha256 = sha256Json(stepsPayload);
  const replayInput = {
    bridge_version: "phase58-final-audit-v1",
    runner_id: "mathprove-skill.final_audit",
    claim_id: request.claim_id,
    statement_hash: claim.statement_hash,
    mode: request.mode,
    target_status: request.target_status,
    steps_sha256: stepsSha256
  };
  const replayInputSha256 = sha256Json(replayInput);

  const notInvoked = async (reason: string, veto: string, scriptSha256: string | null = null): Promise<MathProveBridgeRun> => {
    const parsedResult = { status: "not_invoked", reason };
    const metadata = buildFinalAuditMetadata({
      workspaceRelativePath,
      scriptSha256,
      replayInputSha256,
      stepsSha256,
      solutionSha256: sha256Text(""),
      timeoutMs,
      invoked: false,
      exitCode: null,
      stdout: "",
      stderr: "",
      parsedResult
    });
    const result = buildFinalAuditResult({
      request,
      claimStatementHash: claim.statement_hash,
      ok: false,
      metadata,
      mathprove: parsedResult,
      vetoes: [veto],
      warnings: []
    });
    return archiveMathProveBridgeRun(
      projectRoot,
      request,
      result,
      "external-final-audit",
      `MathProve ${request.mode} final-audit runner ${reason} for ${request.target_status}`
    );
  };

  if (!equivalentExistingPath(mathproveRoot, trustedMathProveRoot)) {
    return notInvoked("untrusted_runner_root", "mathprove_final_audit_runner_untrusted_root");
  }
  if (expectedStatementHash !== claim.statement_hash) {
    return notInvoked("statement_hash_mismatch", "mathprove_claim_statement_hash_mismatch", sha256FileOrNull(scriptPath));
  }
  if (!existsSync(scriptPath)) {
    return notInvoked("runner_unavailable", "mathprove_final_audit_runner_unavailable");
  }

  mkdirSync(join(workspacePath, "logs"), { recursive: true });
  mkdirSync(join(workspacePath, "audit"), { recursive: true });
  const stepsPath = join(workspacePath, "steps.json");
  const solutionPath = join(workspacePath, "audit", "Solution.md");
  const logPath = join(workspacePath, "logs", "tool_calls.log");
  writeFileSync(stepsPath, `${JSON.stringify(stepsPayload, null, 2)}\n`, "utf8");

  let stdout = "";
  let stderr = "";
  let exitCode: number | null = null;
  let parsedResult: Record<string, unknown>;
  try {
    const completed = await execFileAsync(
      "python",
      [
        scriptPath,
        "--workspace-dir",
        workspacePath,
        "--run-dir",
        "run",
        "--log",
        logPath,
        "--steps",
        stepsPath,
        "--solution",
        solutionPath,
        "--timeout",
        String(timeoutSeconds)
      ],
      {
        cwd: repoRoot(),
        encoding: "utf8",
        shell: false,
        windowsHide: true,
        timeout: timeoutMs + 5_000,
        maxBuffer: 1024 * 1024
      }
    );
    stdout = completed.stdout;
    stderr = completed.stderr;
    exitCode = 0;
  } catch (error) {
    const processError = error as { stdout?: string; stderr?: string; code?: number | string | null };
    stdout = processError.stdout ?? "";
    stderr = processError.stderr ?? "";
    exitCode = typeof processError.code === "number" ? processError.code : null;
  }

  try {
    parsedResult = scrubHostPathsDeep(JSON.parse(stdout)) as Record<string, unknown>;
  } catch {
    parsedResult = {
      status: "error",
      error_type: "invalid_json",
      stdout: scrubHostPaths(stdout),
      stderr: scrubHostPaths(stderr)
    };
  }
  const solutionSha256 = existsSync(solutionPath) ? sha256FileOrNull(solutionPath) ?? sha256Text("") : sha256Text("");
  const ok = isMathProveFinalAuditPassed(parsedResult, exitCode);
  const metadata = buildFinalAuditMetadata({
    workspaceRelativePath,
    scriptSha256: sha256FileOrNull(scriptPath),
    replayInputSha256,
    stepsSha256,
    solutionSha256,
    timeoutMs,
    invoked: true,
    exitCode,
    stdout,
    stderr,
    parsedResult
  });
  const result = buildFinalAuditResult({
    request,
    claimStatementHash: claim.statement_hash,
    ok,
    metadata,
    mathprove: parsedResult,
    vetoes: ok ? [] : ["mathprove_final_audit_runner_failed"],
    warnings: []
  });
  return archiveMathProveBridgeRun(
    projectRoot,
    request,
    result,
    "external-final-audit",
    `MathProve ${request.mode} final-audit runner archived as non-authoritative evidence for ${request.target_status}`
  );
}

export async function promoteClaimWithMathProveBridge(
  projectRoot: string,
  request: MathProveBridgeRequest & { evidence_ids: string[]; artifact_ids: string[] },
  options: MathProvePromotionBridgeOptions = {}
): Promise<MathProvePromotionDecision> {
  const bridge =
    options.backend === "external-final-audit"
      ? await runMathProveFinalAuditExternal(projectRoot, request, options)
      : options.backend === "external"
      ? await runMathProveBridgeExternal(projectRoot, request, options)
      : await runMathProveBridgeMock(projectRoot, request);
  const promotion = promoteClaim(projectRoot, {
    project_id: request.project_id,
    claim_id: request.claim_id,
    target_status: request.target_status,
    actor: request.actor,
    evidence_ids: [...request.evidence_ids, bridge.evidence.id],
    artifact_ids: [...request.artifact_ids, bridge.artifact.id],
    external_vetoes: bridge.result.vetoes,
    external_warnings: bridge.result.warnings
  });
  return {
    ...promotion,
    bridge
  };
}
