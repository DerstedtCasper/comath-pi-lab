import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { importArtifact, listArtifactRefs } from "../artifacts/store.js";
import { applyGatePromotedClaim, getClaim } from "../claim/claim-store.js";
import { ComathError } from "../errors.js";
import { appendEvidenceRecord, readEvidenceRecords } from "../evidence/store.js";
import { appendProvenanceEvent, readProvenanceEvents } from "../provenance/ledger.js";
import { assertPathAllowed } from "../security/path-policy.js";
import { claimSchema, formalProofRunSchema, type ArtifactRef, type Claim, type Evidence, type FormalProofRun } from "../types/schemas.js";
import { nextSequentialId } from "../utils/id.js";

const execFileAsync = promisify(execFile);

export type LeanToolchainReport = {
  available: boolean;
  executable: string;
  version?: string;
  error?: string;
};

export type LeanProofCheckInput = {
  project_id: string;
  claim_id: string;
  proof_path: string;
  theorem_name?: string;
  dependency_hash?: string;
  actor: string;
  /**
   * Compatibility field for older callers. Production proof authority only uses
   * the service-resolved `lean` executable; caller-supplied executables are
   * recorded as fail-closed runs rather than executed as proof authority.
   */
  lean_executable?: string;
  timeout_ms?: number;
};

export type ModelLeanProofCheckInput = {
  project_id: string;
  claim_id: string;
  lean_source: string;
  theorem_name: string;
  dependency_hash: string;
  actor: string;
  model_id: string;
  model_response_id?: string;
  tool_call_id: string;
  timeout_ms?: number;
};

export type ModelLeanSourceSubmission = {
  origin: "model_tool_call";
  project_id: string;
  claim_id: string;
  theorem_name: string;
  model_id: string;
  model_response_id?: string;
  tool_call_id: string;
  source_sha256: string;
  source_bytes: number;
};

export type ModelLeanProofCheckResult = {
  run: FormalProofRun;
  evidence: Evidence;
  proof_path: string;
  submission: ModelLeanSourceSubmission;
};

function formalProofRunsPath(projectRoot: string): string {
  return assertPathAllowed(projectRoot, join(".comath", "evidence", "formal-proof-runs.jsonl"), {
    purpose: "runtime-write"
  });
}

function leanLogPath(projectRoot: string, claimId: string, existingIds: readonly string[]): { id: string; path: string } {
  const id = nextSequentialId("LEANRUN", existingIds);
  return {
    id,
    path: assertPathAllowed(projectRoot, join(".comath", "evidence", claimId, "lean", `${id}.log`), {
      purpose: "runtime-write"
    })
  };
}

function safeProofName(input: string): string {
  const normalized = input.replace(/[^A-Za-z0-9_-]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
  return normalized.slice(0, 80) || "model_lean_proof";
}

function modelLeanProofPath(projectRoot: string, claimId: string, theoremName: string): string {
  return assertPathAllowed(
    projectRoot,
    join(".comath", "formal-proofs", claimId, `${Date.now()}-${safeProofName(theoremName)}.lean`),
    { purpose: "runtime-write" }
  );
}

export function readFormalProofRuns(projectRoot: string, projectId?: string): FormalProofRun[] {
  const path = formalProofRunsPath(projectRoot);
  if (!existsSync(path)) {
    return [];
  }
  const records = readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => formalProofRunSchema.parse(JSON.parse(line)));
  return projectId ? records.filter((record) => record.project_id === projectId) : records;
}

function appendFormalProofRun(
  projectRoot: string,
  input: Omit<FormalProofRun, "id" | "created_at"> & { id?: string; created_at?: string }
): FormalProofRun {
  const existing = readFormalProofRuns(projectRoot);
  const run = formalProofRunSchema.parse({
    id: input.id ?? nextSequentialId("FPR", existing.map((record) => record.id)),
    project_id: input.project_id,
    claim_id: input.claim_id,
    system: input.system,
    status: input.status,
    proof_artifact_id: input.proof_artifact_id,
    log_artifact_id: input.log_artifact_id,
    theorem_name: input.theorem_name,
    statement_hash: input.statement_hash,
    toolchain_version: input.toolchain_version,
    dependency_hash: input.dependency_hash,
    contains_sorry: input.contains_sorry,
    contains_admit: input.contains_admit,
    kernel_checked: input.kernel_checked,
    exit_code: input.exit_code,
    vetoes: input.vetoes ?? [],
    warnings: input.warnings ?? [],
    created_at: input.created_at ?? new Date().toISOString()
  });
  const path = formalProofRunsPath(projectRoot);
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(run)}\n`, "utf8");
  appendProvenanceEvent(projectRoot, {
    project_id: run.project_id,
    event_type: "formal_proof.run_recorded",
    actor: "formal-proof-store",
    target_id: run.claim_id,
    payload: {
      formal_proof_run_id: run.id,
      system: run.system,
      status: run.status,
      proof_artifact_id: run.proof_artifact_id,
      log_artifact_id: run.log_artifact_id,
      theorem_name: run.theorem_name,
      statement_hash: run.statement_hash,
      dependency_hash: run.dependency_hash,
      vetoes: run.vetoes,
      warnings: run.warnings
    }
  });
  return run;
}

function requestedArtifactsContain(artifactIds: readonly string[], requiredIds: readonly string[]): boolean {
  const requested = new Set(artifactIds);
  return requiredIds.every((artifactId) => requested.has(artifactId));
}

function payloadStringArray(payload: Record<string, unknown>, field: string): string[] {
  const value = payload[field];
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : [];
}

function isTrustedRunForClaim(run: FormalProofRun, claim: Claim): boolean {
  return (
    run.claim_id === claim.id &&
    run.project_id === claim.project_id &&
    run.system === "lean4" &&
    run.status === "kernel_checked" &&
    run.kernel_checked &&
    !run.contains_sorry &&
    !run.contains_admit &&
    run.vetoes.length === 0 &&
    Boolean(run.proof_artifact_id) &&
    Boolean(run.log_artifact_id) &&
    Boolean(run.theorem_name) &&
    Boolean(run.statement_hash) &&
    run.statement_hash === claim.statement_hash &&
    Boolean(run.dependency_hash)
  );
}

function trustedRunsForClaim(projectRoot: string, projectId: string, claimId: string): FormalProofRun[] {
  const claim = getClaim(projectRoot, projectId, claimId);
  if (!claim) {
    return [];
  }
  return readFormalProofRuns(projectRoot, projectId).filter((run) => isTrustedRunForClaim(run, claim));
}

function trustedRunsForArtifacts(
  projectRoot: string,
  projectId: string,
  claimId: string,
  artifactIds: readonly string[]
): FormalProofRun[] {
  const requested = new Set(artifactIds);
  return trustedRunsForClaim(projectRoot, projectId, claimId).filter(
    (run) =>
      typeof run.proof_artifact_id === "string" &&
      typeof run.log_artifact_id === "string" &&
      requested.has(run.proof_artifact_id) &&
      requested.has(run.log_artifact_id)
  );
}

function matchingTrustedRun(
  projectRoot: string,
  projectId: string,
  claimId: string,
  artifactIds: readonly string[]
): FormalProofRun | null {
  return trustedRunsForArtifacts(projectRoot, projectId, claimId, artifactIds)[0] ?? null;
}

export function hasTrustedFormalProofRun(
  projectRoot: string,
  projectId: string,
  claimId: string,
  artifactIds: readonly string[]
): boolean {
  return matchingTrustedRun(projectRoot, projectId, claimId, artifactIds) !== null;
}

export function hasFormalizationCertification(
  projectRoot: string,
  projectId: string,
  claimId: string,
  artifactIds: readonly string[]
): boolean {
  const trustedRuns = trustedRunsForArtifacts(projectRoot, projectId, claimId, artifactIds);
  const trustedRunIds = new Set(trustedRuns.map((run) => run.id));
  const trustedStatementHashes = new Set(trustedRuns.map((run) => run.statement_hash));
  return readProvenanceEvents(projectRoot, projectId).some((event) => {
    if (event.event_type !== "formal_proof.formalization_certified" || event.target_id !== claimId) {
      return false;
    }
    return (
      typeof event.payload.formal_proof_run_id === "string" &&
      trustedRunIds.has(event.payload.formal_proof_run_id) &&
      typeof event.payload.statement_hash === "string" &&
      trustedStatementHashes.has(event.payload.statement_hash) &&
      requestedArtifactsContain(artifactIds, payloadStringArray(event.payload, "artifact_ids"))
    );
  });
}

export function hasFormalProofDependencyCertification(
  projectRoot: string,
  projectId: string,
  claimId: string,
  artifactIds: readonly string[]
): boolean {
  const trustedRuns = trustedRunsForArtifacts(projectRoot, projectId, claimId, artifactIds);
  const trustedRunIds = new Set(trustedRuns.map((run) => run.id));
  const trustedStatementHashes = new Set(trustedRuns.map((run) => run.statement_hash));
  const trustedDependencyHashes = new Set(trustedRuns.map((run) => run.dependency_hash));
  return readProvenanceEvents(projectRoot, projectId).some((event) => {
    if (event.event_type !== "formal_proof.dependencies_certified" || event.target_id !== claimId) {
      return false;
    }
    return (
      typeof event.payload.formal_proof_run_id === "string" &&
      trustedRunIds.has(event.payload.formal_proof_run_id) &&
      typeof event.payload.statement_hash === "string" &&
      trustedStatementHashes.has(event.payload.statement_hash) &&
      typeof event.payload.dependency_hash === "string" &&
      trustedDependencyHashes.has(event.payload.dependency_hash)
    );
  });
}

export function hasFormalProofAuditCertification(
  projectRoot: string,
  projectId: string,
  claimId: string,
  artifactIds: readonly string[]
): boolean {
  const trustedRuns = trustedRunsForArtifacts(projectRoot, projectId, claimId, artifactIds);
  const trustedRunIds = new Set(trustedRuns.map((run) => run.id));
  const trustedStatementHashes = new Set(trustedRuns.map((run) => run.statement_hash));
  const trustedDependencyHashes = new Set(trustedRuns.map((run) => run.dependency_hash));
  return readProvenanceEvents(projectRoot, projectId).some((event) => {
    if (event.event_type !== "formal_proof.audit_certified" || event.target_id !== claimId) {
      return false;
    }
    const auditArtifactIds = payloadStringArray(event.payload, "audit_artifact_ids");
    return (
      auditArtifactIds.length > 0 &&
      requestedArtifactsContain(artifactIds, auditArtifactIds) &&
      typeof event.payload.formal_proof_run_id === "string" &&
      trustedRunIds.has(event.payload.formal_proof_run_id) &&
      typeof event.payload.statement_hash === "string" &&
      trustedStatementHashes.has(event.payload.statement_hash) &&
      typeof event.payload.dependency_hash === "string" &&
      trustedDependencyHashes.has(event.payload.dependency_hash)
    );
  });
}

export function containsLeanPlaceholders(source: string): boolean {
  return /(^|[^A-Za-z0-9_])(sorry|admit|axiom|constant|unsafe|opaque)([^A-Za-z0-9_]|$)/.test(source);
}

function sha256Text(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ComathError(`${field} is required`, { statusCode: 400, code: "MODEL_LEAN_SUBMISSION_INVALID" });
  }
  return value;
}

function assertTheoremNameAppears(source: string, theoremName: string): void {
  const escaped = theoremName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(^|\\s)(theorem|lemma)\\s+${escaped}([^A-Za-z0-9_']|$)`);
  if (!pattern.test(source)) {
    throw new ComathError("lean_source must define theorem_name", {
      statusCode: 400,
      code: "LEAN_THEOREM_NAME_MISSING"
    });
  }
}

export function isLean4VersionOutput(output: string): boolean {
  return /^\s*Lean\s+\(version\s+4\./i.test(output);
}

export async function detectLeanToolchain(leanExecutable = "lean"): Promise<LeanToolchainReport> {
  try {
    const { stdout, stderr } = await execFileAsync(leanExecutable, ["--version"], {
      encoding: "utf8",
      windowsHide: true,
      timeout: 10_000,
      maxBuffer: 1024 * 1024
    });
    const version = `${stdout}${stderr}`.trim();
    if (!isLean4VersionOutput(version)) {
      return {
        available: false,
        executable: leanExecutable,
        version,
        error: "lean executable did not report a Lean 4 version"
      };
    }
    return {
      available: true,
      executable: leanExecutable,
      version
    };
  } catch (error) {
    const err = error as { message?: string; code?: string };
    return {
      available: false,
      executable: leanExecutable,
      error: err.code ? `${err.code}: ${err.message ?? ""}` : err.message ?? "unknown lean detection error"
    };
  }
}

export async function runLeanProofCheck(projectRoot: string, input: LeanProofCheckInput): Promise<FormalProofRun> {
  const proofPath = assertPathAllowed(projectRoot, input.proof_path, { purpose: "read", resolveRealpath: true });
  const claim = getClaim(projectRoot, input.project_id, input.claim_id);
  if (!claim) {
    throw new ComathError("claim not found", { statusCode: 404, code: "CLAIM_NOT_FOUND" });
  }
  const source = readFileSync(proofPath, "utf8");
  const containsPlaceholder = containsLeanPlaceholders(source);
  const existingRunIds = readFormalProofRuns(projectRoot).map((run) => run.id);
  const log = leanLogPath(projectRoot, input.claim_id, existingRunIds);
  mkdirSync(dirname(log.path), { recursive: true });

  let status: FormalProofRun["status"] = "failed";
  let kernelChecked = false;
  let exitCode: number | undefined;
  let toolchainVersion: string | undefined;
  const vetoes: string[] = [];
  const warnings: string[] = [];
  const executable = input.lean_executable ?? "lean";

  if (input.lean_executable && input.lean_executable !== "lean") {
    status = "toolchain_missing";
    vetoes.push("custom lean executable not allowed");
    warnings.push("formal proof authority uses the service-resolved lean executable only");
    writeFileSync(log.path, "Lean proof rejected before execution: custom executable is not allowed.\n", "utf8");
  } else if (containsPlaceholder) {
    status = "skeleton_only";
    vetoes.push("lean proof contains sorry/admit");
    writeFileSync(log.path, "Lean proof rejected before execution: contains sorry/admit.\n", "utf8");
  } else if (!input.theorem_name) {
    status = "failed";
    vetoes.push("lean proof requires theorem_name");
    writeFileSync(log.path, "Lean proof rejected before execution: theorem_name is required.\n", "utf8");
  } else if (!input.dependency_hash) {
    status = "failed";
    vetoes.push("lean proof requires dependency_hash");
    writeFileSync(log.path, "Lean proof rejected before execution: dependency_hash is required.\n", "utf8");
  } else {
    const toolchain = await detectLeanToolchain(executable);
    toolchainVersion = toolchain.version;
    if (!toolchain.available) {
      status = "toolchain_missing";
      vetoes.push("lean toolchain missing");
      warnings.push(toolchain.error ?? "lean toolchain missing");
      writeFileSync(log.path, `Lean toolchain missing: ${toolchain.error ?? "unknown error"}\n`, "utf8");
    } else {
      try {
        const { stdout, stderr } = await execFileAsync(executable, [proofPath], {
          cwd: dirname(proofPath),
          encoding: "utf8",
          windowsHide: true,
          timeout: input.timeout_ms ?? 30_000,
          maxBuffer: 1024 * 1024
        });
        exitCode = 0;
        status = "kernel_checked";
        kernelChecked = true;
        writeFileSync(log.path, `${stdout}${stderr}` || "Lean kernel accepted proof artifact.\n", "utf8");
      } catch (error) {
        const err = error as { stdout?: string; stderr?: string; code?: number | string; message?: string };
        exitCode = typeof err.code === "number" ? err.code : undefined;
        status = "failed";
        vetoes.push("lean kernel check failed");
        writeFileSync(
          log.path,
          `${err.stdout ?? ""}${err.stderr ?? ""}${err.message ? `\n${err.message}\n` : ""}`,
          "utf8"
        );
      }
    }
  }

  const proofArtifact = await importArtifact({
    projectRoot,
    project_id: input.project_id,
    source_path: proofPath,
    kind: "code",
    actor: input.actor
  });
  const logArtifact = await importArtifact({
    projectRoot,
    project_id: input.project_id,
    source_path: log.path,
    kind: "runner_output",
    actor: input.actor
  });

  return appendFormalProofRun(projectRoot, {
    project_id: input.project_id,
    claim_id: input.claim_id,
    system: "lean4",
    status,
    proof_artifact_id: proofArtifact.id,
    log_artifact_id: logArtifact.id,
    theorem_name: input.theorem_name,
    statement_hash: claim.statement_hash,
    toolchain_version: toolchainVersion,
    dependency_hash: input.dependency_hash,
    contains_sorry: containsPlaceholder,
    contains_admit: containsPlaceholder,
    kernel_checked: kernelChecked,
    exit_code: exitCode,
    vetoes,
    warnings
  });
}

export async function runModelLeanProofCheck(
  projectRoot: string,
  input: ModelLeanProofCheckInput
): Promise<ModelLeanProofCheckResult> {
  if (!input.lean_source || typeof input.lean_source !== "string") {
    throw new ComathError("lean_source is required", { statusCode: 400, code: "LEAN_SOURCE_REQUIRED" });
  }
  const theoremName = requireNonEmptyString(input.theorem_name, "theorem_name");
  const dependencyHash = requireNonEmptyString(input.dependency_hash, "dependency_hash");
  const modelId = requireNonEmptyString(input.model_id, "model_id");
  const toolCallId = requireNonEmptyString(input.tool_call_id, "tool_call_id");
  if (Buffer.byteLength(input.lean_source, "utf8") > 256 * 1024) {
    throw new ComathError("lean_source exceeds 256 KiB limit", {
      statusCode: 413,
      code: "LEAN_SOURCE_TOO_LARGE"
    });
  }
  assertTheoremNameAppears(input.lean_source, theoremName);
  const sourceSha256 = sha256Text(input.lean_source);
  const proofPath = modelLeanProofPath(projectRoot, input.claim_id, input.theorem_name);
  mkdirSync(dirname(proofPath), { recursive: true });
  writeFileSync(proofPath, input.lean_source, "utf8");

  const run = await runLeanProofCheck(projectRoot, {
    project_id: input.project_id,
    claim_id: input.claim_id,
    proof_path: proofPath,
    theorem_name: theoremName,
    dependency_hash: dependencyHash,
    actor: input.actor,
    timeout_ms: Math.min(Math.max(input.timeout_ms ?? 30_000, 1_000), 120_000)
  });
  const submission: ModelLeanSourceSubmission = {
    origin: "model_tool_call",
    project_id: input.project_id,
    claim_id: input.claim_id,
    theorem_name: theoremName,
    model_id: modelId,
    model_response_id: input.model_response_id,
    tool_call_id: toolCallId,
    source_sha256: sourceSha256,
    source_bytes: Buffer.byteLength(input.lean_source, "utf8")
  };
  appendProvenanceEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "formal_proof.model_source_submitted",
    actor: input.actor,
    target_id: input.claim_id,
    payload: {
      ...submission,
      formal_proof_run_id: run.id,
      proof_path: proofPath,
      proof_artifact_id: run.proof_artifact_id,
      log_artifact_id: run.log_artifact_id,
      status: run.status,
      kernel_checked: run.kernel_checked
    }
  });
  const evidence = appendEvidenceRecord(projectRoot, {
    project_id: input.project_id,
    claim_id: input.claim_id,
    kind: "lean",
    summary: [
      `Model tool-call Lean source checked by CoMath Lean authority.`,
      `origin=${submission.origin}`,
      `model_id=${modelId}`,
      `tool_call_id=${toolCallId}`,
      `source_sha256=${sourceSha256}`,
      `formal_proof_run_id=${run.id}`,
      `status=${run.status}`,
      `kernel_checked=${run.kernel_checked}`
    ].join(" "),
    artifact_ids: [run.proof_artifact_id, run.log_artifact_id].filter((id): id is string => typeof id === "string")
  });
  return { run, evidence, proof_path: proofPath, submission };
}

export function certifyClaimForFormalProof(
  projectRoot: string,
  input: { project_id: string; claim_id: string; artifact_ids: string[]; actor: string }
): Claim {
  if (!hasTrustedFormalProofRun(projectRoot, input.project_id, input.claim_id, input.artifact_ids)) {
    throw new ComathError("cannot certify claim without trusted formal proof run", {
      statusCode: 400,
      code: "FORMAL_PROOF_RUN_REQUIRED"
    });
  }
  const claim = getClaim(projectRoot, input.project_id, input.claim_id);
  if (!claim) {
    throw new ComathError("claim not found", { statusCode: 404, code: "CLAIM_NOT_FOUND" });
  }
  if (
    claim.formalization_status !== "kernel_checked" ||
    !hasFormalizationCertification(projectRoot, input.project_id, input.claim_id, input.artifact_ids)
  ) {
    throw new ComathError("cannot certify claim without formalization certification", {
      statusCode: 400,
      code: "FORMALIZATION_CERTIFICATION_REQUIRED"
    });
  }
  if (
    claim.dependency_closure_status !== "all_dependencies_present" ||
    !hasFormalProofDependencyCertification(projectRoot, input.project_id, input.claim_id, input.artifact_ids)
  ) {
    throw new ComathError("cannot certify claim without dependency closure certification", {
      statusCode: 400,
      code: "DEPENDENCY_CERTIFICATION_REQUIRED"
    });
  }
  if (
    claim.audit_state !== "audit_passed" ||
    !hasFormalProofAuditCertification(projectRoot, input.project_id, input.claim_id, input.artifact_ids)
  ) {
    throw new ComathError("cannot certify claim without formal proof audit certification", {
      statusCode: 400,
      code: "FORMAL_PROOF_AUDIT_REQUIRED"
    });
  }
  appendProvenanceEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "formal_proof.claim_certified",
    actor: input.actor,
    target_id: input.claim_id,
    payload: {
      formal_proof_run_id: matchingTrustedRun(projectRoot, input.project_id, input.claim_id, input.artifact_ids)?.id,
      statement_hash: claim.statement_hash,
      artifact_ids: input.artifact_ids
    }
  });
  return claim;
}

function updateFormalProofClaimMetadata(projectRoot: string, claim: Claim, patch: Partial<Claim>): Claim {
  const certified = claimSchema.parse({
    ...claim,
    ...patch,
    updated_at: new Date().toISOString()
  });
  return applyGatePromotedClaim(projectRoot, certified, claim);
}

export function certifyFormalizationFromProofRun(
  projectRoot: string,
  input: { project_id: string; claim_id: string; artifact_ids: string[]; actor: string }
): Claim {
  const trustedRun = matchingTrustedRun(projectRoot, input.project_id, input.claim_id, input.artifact_ids);
  if (!trustedRun) {
    throw new ComathError("cannot certify formalization without trusted formal proof run", {
      statusCode: 400,
      code: "FORMAL_PROOF_RUN_REQUIRED"
    });
  }
  const claim = getClaim(projectRoot, input.project_id, input.claim_id);
  if (!claim) {
    throw new ComathError("claim not found", { statusCode: 404, code: "CLAIM_NOT_FOUND" });
  }
  const stored = updateFormalProofClaimMetadata(projectRoot, claim, {
    formalization_status: "kernel_checked"
  });
  appendProvenanceEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "formal_proof.formalization_certified",
    actor: input.actor,
    target_id: input.claim_id,
    payload: {
      formal_proof_run_id: trustedRun.id,
      statement_hash: claim.statement_hash,
      artifact_ids: input.artifact_ids
    }
  });
  return stored;
}

export function certifyFormalProofDependencies(
  projectRoot: string,
  input: { project_id: string; claim_id: string; dependency_hash: string; actor: string; formal_proof_run_id?: string }
): Claim {
  if (!input.dependency_hash) {
    throw new ComathError("dependency certification requires dependency_hash", {
      statusCode: 400,
      code: "DEPENDENCY_HASH_REQUIRED"
    });
  }
  const claim = getClaim(projectRoot, input.project_id, input.claim_id);
  if (!claim) {
    throw new ComathError("claim not found", { statusCode: 404, code: "CLAIM_NOT_FOUND" });
  }
  if (claim.formalization_status !== "kernel_checked") {
    throw new ComathError("dependency certification requires kernel_checked formalization", {
      statusCode: 400,
      code: "FORMALIZATION_CERTIFICATION_REQUIRED"
    });
  }
  const trustedRun = trustedRunsForClaim(projectRoot, input.project_id, input.claim_id).find(
    (run) =>
      run.dependency_hash === input.dependency_hash &&
      (!input.formal_proof_run_id || run.id === input.formal_proof_run_id)
  );
  if (!trustedRun) {
    throw new ComathError("dependency certification requires trusted formal proof run with matching dependency_hash", {
      statusCode: 400,
      code: "DEPENDENCY_FORMAL_PROOF_RUN_REQUIRED"
    });
  }
  const stored = updateFormalProofClaimMetadata(projectRoot, claim, {
    dependency_closure_status: "all_dependencies_present"
  });
  appendProvenanceEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "formal_proof.dependencies_certified",
    actor: input.actor,
    target_id: input.claim_id,
    payload: {
      formal_proof_run_id: trustedRun.id,
      statement_hash: claim.statement_hash,
      dependency_hash: input.dependency_hash
    }
  });
  return stored;
}

function assertAuditArtifactBinding(projectRoot: string, artifact: ArtifactRef, run: FormalProofRun, claim: Claim): void {
  const path = assertPathAllowed(projectRoot, artifact.path, { purpose: "read", resolveRealpath: true });
  let payload: Record<string, unknown>;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
    payload = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    throw new ComathError("formal proof audit artifact must be JSON", {
      statusCode: 400,
      code: "FORMAL_PROOF_AUDIT_ARTIFACT_INVALID"
    });
  }

  if (
    payload.formal_proof_run_id !== run.id ||
    payload.statement_hash !== claim.statement_hash ||
    payload.dependency_hash !== run.dependency_hash ||
    payload.audit_passed !== true
  ) {
    throw new ComathError("formal proof audit artifact is not bound to this proof run and statement hash", {
      statusCode: 400,
      code: "FORMAL_PROOF_AUDIT_ARTIFACT_BINDING_MISMATCH"
    });
  }
}

export function certifyFormalProofAudit(
  projectRoot: string,
  input: { project_id: string; claim_id: string; audit_artifact_ids: string[]; actor: string }
): Claim {
  if (input.audit_artifact_ids.length === 0) {
    throw new ComathError("formal proof audit requires audit_artifact_ids", {
      statusCode: 400,
      code: "FORMAL_PROOF_AUDIT_ARTIFACT_REQUIRED"
    });
  }
  const claim = getClaim(projectRoot, input.project_id, input.claim_id);
  if (!claim) {
    throw new ComathError("claim not found", { statusCode: 404, code: "CLAIM_NOT_FOUND" });
  }
  if (claim.formalization_status !== "kernel_checked" || claim.dependency_closure_status !== "all_dependencies_present") {
    throw new ComathError("formal proof audit requires formalization and dependency certification", {
      statusCode: 400,
      code: "FORMAL_PROOF_PREAUDIT_REQUIRED"
    });
  }
  const artifacts = new Map(
    listArtifactRefs(projectRoot)
      .filter((artifact) => artifact.project_id === input.project_id)
      .map((artifact) => [artifact.id, artifact])
  );
  const dependencyEvent = readProvenanceEvents(projectRoot, input.project_id)
    .filter((event) => event.event_type === "formal_proof.dependencies_certified" && event.target_id === input.claim_id)
    .find(
      (event) =>
        typeof event.payload.formal_proof_run_id === "string" &&
        typeof event.payload.statement_hash === "string" &&
        event.payload.statement_hash === claim.statement_hash &&
        typeof event.payload.dependency_hash === "string"
    );
  if (!dependencyEvent) {
    throw new ComathError("formal proof audit requires dependency certification bound to current statement", {
      statusCode: 400,
      code: "FORMAL_PROOF_DEPENDENCY_BINDING_REQUIRED"
    });
  }
  const trustedRun = trustedRunsForClaim(projectRoot, input.project_id, input.claim_id).find(
    (run) =>
      run.id === dependencyEvent.payload.formal_proof_run_id &&
      run.statement_hash === dependencyEvent.payload.statement_hash &&
      run.dependency_hash === dependencyEvent.payload.dependency_hash
  );
  if (!trustedRun) {
    throw new ComathError("formal proof audit requires trusted formal proof run binding", {
      statusCode: 400,
      code: "FORMAL_PROOF_AUDIT_RUN_BINDING_REQUIRED"
    });
  }
  const auditEvidence = readEvidenceRecords(projectRoot, input.project_id).filter(
    (evidence) =>
      evidence.claim_id === input.claim_id &&
      evidence.kind === "audit" &&
      input.audit_artifact_ids.every((artifactId) => evidence.artifact_ids.includes(artifactId))
  );
  if (auditEvidence.length === 0) {
    throw new ComathError("formal proof audit requires audit evidence bound to the claim and audit artifact", {
      statusCode: 400,
      code: "FORMAL_PROOF_AUDIT_EVIDENCE_REQUIRED"
    });
  }
  for (const artifactId of input.audit_artifact_ids) {
    const artifact = artifacts.get(artifactId);
    if (!artifact) {
      throw new ComathError(`formal proof audit artifact not found: ${artifactId}`, {
        statusCode: 400,
        code: "FORMAL_PROOF_AUDIT_ARTIFACT_NOT_FOUND"
      });
    }
    if (artifactId === trustedRun.proof_artifact_id || artifactId === trustedRun.log_artifact_id) {
      throw new ComathError("formal proof audit requires independent audit evidence artifact", {
        statusCode: 400,
        code: "FORMAL_PROOF_AUDIT_ARTIFACT_NOT_INDEPENDENT"
      });
    }
    assertAuditArtifactBinding(projectRoot, artifact, trustedRun, claim);
  }
  const stored = updateFormalProofClaimMetadata(projectRoot, claim, {
    audit_state: "audit_passed"
  });
  appendProvenanceEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "formal_proof.audit_certified",
    actor: input.actor,
    target_id: input.claim_id,
    payload: {
      formal_proof_run_id: trustedRun.id,
      statement_hash: claim.statement_hash,
      dependency_hash: trustedRun.dependency_hash,
      audit_artifact_ids: input.audit_artifact_ids
    }
  });
  return stored;
}
