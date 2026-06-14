import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { assertPathAllowed } from "../security/path-policy.js";
import { recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck as recordTask367ClosureRecheck } from "./goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-recheck.js";

type ArtifactReference = {
  kind: string;
  path: string;
  sha256: string;
  size_bytes: number;
};

type JsonRecord = Record<string, any>;

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheckInput =
  JsonRecord & {
    project_id: string;
  };

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck =
  JsonRecord & {
    schema_version: "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck.v1";
    project_id: string;
    actor: string;
    created_at: string;
    ok: boolean;
    proof_authority: "none";
    can_promote_claim: false;
    can_certify_ga: false;
    ga_certification_gate_separate: true;
  };

const prefix = "goal3_release_candidate_proof_breadth_";
const rootSnake = "selected_tranche_next_closure_packaging_results";
const rootKebab = "selected-tranche-next-closure-packaging-results";
const closureExecResultsSnake = "closure_execution_packaging_results";
const closureExecResultsKebab = "closure-execution-packaging-results";
const b2 = [rootSnake, closureExecResultsSnake, closureExecResultsSnake].join("_");
const b3 = [rootSnake, closureExecResultsSnake, closureExecResultsSnake, closureExecResultsSnake].join("_");
const b4 = b3;
const b5 = [
  rootSnake,
  closureExecResultsSnake,
  closureExecResultsSnake,
  closureExecResultsSnake,
  closureExecResultsSnake
].join("_");
const dir3 = [rootKebab, closureExecResultsKebab, closureExecResultsKebab, closureExecResultsKebab].join("-");
const dir4 = dir3;
const dir5 = [
  rootKebab,
  closureExecResultsKebab,
  closureExecResultsKebab,
  closureExecResultsKebab,
  closureExecResultsKebab
].join("-");

const TASK371_KIND = `${prefix}${b5}_follow_up`;
const TASK373_KIND = `${prefix}${b5}_closure_recheck`;
const TASK370_KIND = `${prefix}${b4}_closure_execution_packaging_follow_through`;
const TASK368_KIND = `${prefix}${b4}_closure_execution_bridge`;
const TASK367_KIND = `${prefix}${b4}_closure_recheck`;
const TASK365_KIND = `${prefix}${b3}_follow_up`;
const TASK364_KIND = `${prefix}${b2}_closure_execution_packaging_follow_through`;
const REQUESTED_MODE = `open_formal_workbench_release_candidate_${b5}_closure_recheck`;

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function recheckPath(recheckId: string): string {
  return normalizeRelativePath(join(".comath", "release", `goal3-${dir5}-closure-recheck`, recheckId, "recheck.json"));
}

function task371Path(followUpId: string): string {
  return normalizeRelativePath(join(".comath", "release", `goal3-${dir5}-follow-up`, followUpId, "follow-up.json"));
}

function sha256Bytes(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function sha256Text(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function shortIdSuffix(id: string): string {
  return sha256Text(id).slice(0, 12).toUpperCase();
}

function errorCode(suffix: string): string {
  return `GOAL3_${`${b5}_closure_recheck`.toUpperCase()}_${suffix}`;
}

function assertSafeId(value: unknown, label: string): string {
  const id = typeof value === "string" ? value.trim() : "";
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,360}$/u.test(id)) {
    throw new ComathError(`${label} is invalid`, {
      statusCode: 400,
      code: errorCode("INVALID_ID")
    });
  }
  return id;
}

function assertSha256(value: unknown): string {
  const sha256 = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-f0-9]{64}$/u.test(sha256)) {
    throw new ComathError("Goal 3 selected-tranche closure execution packaging results closure recheck hash is invalid", {
      statusCode: 400,
      code: errorCode("INVALID_HASH")
    });
  }
  return sha256;
}

function assertTask371InputPath(path: unknown, followUpId: string): string {
  const normalizedInputPath = normalizeRelativePath(typeof path === "string" ? path.trim() : "");
  const expectedPath = task371Path(followUpId);
  if (normalizedInputPath !== expectedPath) {
    throw new ComathError("Goal 3 selected-tranche closure execution packaging results closure recheck Task371 path mismatch", {
      statusCode: 400,
      code: errorCode("TASK371_PATH_MISMATCH")
    });
  }
  return expectedPath;
}

function sanitizeActor(actor: unknown): string {
  const text =
    typeof actor === "string" && actor.trim().length > 0
      ? actor.trim()
      : "goal3-selected-tranche-next-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-recheck";
  return text
    .replace(/(?:[A-Za-z]:[\\/][^\s"']+|\\\\[^\s"']+)/gu, "[redacted-path]")
    .replace(/(?:Authorization:\s*Bearer\s+\S+|api_key=\S+|token=\S+|sk-[A-Za-z0-9_-]+)/giu, "[redacted-secret]")
    .replace(
      /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|kernel_checked|proof_success|GA certified|can_certify_ga\s*[:=]\s*(?:true|1)|can_promote_claim\s*[:=]\s*(?:true|1))\b/giu,
      "[redacted-authority-claim]"
    )
    .slice(0, 400);
}

function isArtifactReference(value: unknown): value is ArtifactReference {
  const record = value as ArtifactReference;
  return (
    typeof record?.kind === "string" &&
    typeof record.path === "string" &&
    /^[a-f0-9]{64}$/u.test(record.sha256) &&
    typeof record.size_bytes === "number" &&
    Number.isFinite(record.size_bytes) &&
    record.size_bytes >= 0
  );
}

function artifactReferencesEqual(left: ArtifactReference, right: ArtifactReference): boolean {
  return (
    left.kind === right.kind &&
    normalizeRelativePath(left.path) === normalizeRelativePath(right.path) &&
    left.sha256 === right.sha256 &&
    left.size_bytes === right.size_bytes
  );
}

function artifactForProjectFile(projectRoot: string, path: string, kind: string): ArtifactReference {
  const normalized = normalizeRelativePath(path);
  const absolutePath = assertPathAllowed(projectRoot, normalized);
  const bytes = readFileSync(absolutePath);
  return {
    kind,
    path: normalized,
    sha256: sha256Bytes(bytes),
    size_bytes: statSync(absolutePath).size
  };
}

function invalidTask371(): never {
  throw new ComathError("Goal 3 selected-tranche closure execution packaging results closure recheck Task371 artifact is invalid", {
    statusCode: 400,
    code: errorCode("INVALID_TASK371")
  });
}

function assertStringArray(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    invalidTask371();
  }
  return value as string[];
}

function assertArtifactArray(value: unknown): ArtifactReference[] {
  if (!Array.isArray(value) || value.some((entry) => !isArtifactReference(entry))) {
    invalidTask371();
  }
  return value as ArtifactReference[];
}

function idFromArtifactPath(path: string): string | null {
  const parts = normalizeRelativePath(path).split("/");
  return parts.length >= 2 ? (parts.at(-2) ?? null) : null;
}

function assertArtifactIdMatchesPath(id: unknown, path: unknown, artifact: unknown): void {
  if (typeof id !== "string" || typeof path !== "string" || !isArtifactReference(artifact) || idFromArtifactPath(path) !== id) {
    invalidTask371();
  }
}

function assertCurrentArtifactReference(
  projectRoot: string,
  path: unknown,
  artifact: unknown,
  kind: string
): ArtifactReference {
  if (
    typeof path !== "string" ||
    !isArtifactReference(artifact) ||
    artifact.kind !== kind ||
    normalizeRelativePath(artifact.path) !== normalizeRelativePath(path)
  ) {
    invalidTask371();
  }
  let current: ArtifactReference;
  try {
    current = artifactForProjectFile(projectRoot, path, kind);
  } catch {
    invalidTask371();
  }
  if (!artifactReferencesEqual(artifact, current)) {
    invalidTask371();
  }
  return current;
}

function assertOptionalCurrentArtifactReference(
  projectRoot: string,
  path: unknown,
  artifact: unknown,
  kind: string,
  id: unknown
): ArtifactReference | null {
  if (path === null && artifact === null && id === null) {
    return null;
  }
  const current = assertCurrentArtifactReference(projectRoot, path, artifact, kind);
  assertArtifactIdMatchesPath(id, path, artifact);
  return current;
}

function parseTask371(bytes: Buffer): JsonRecord {
  try {
    return JSON.parse(bytes.toString("utf8")) as JsonRecord;
  } catch {
    invalidTask371();
  }
}

function sanitizeBlockerReason(value: string, source: "task371" | "delegated"): string {
  const trimmed = value.trim();
  const sanitized = sanitizeActor(trimmed);
  if (sanitized !== trimmed || !/^[A-Za-z0-9_.:-]{1,240}$/u.test(trimmed)) {
    return source === "task371" ? "task371_blocker_reason_redacted" : "delegated_blocker_reason_redacted";
  }
  return trimmed;
}

function sanitizeBlockerReasons(values: string[], source: "task371" | "delegated"): string[] {
  return values.map((value) => sanitizeBlockerReason(value, source));
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function callerProofOrGaMaterialPresent(input: JsonRecord): boolean {
  const text = JSON.stringify(input);
  return /lean_kernel_clean_replay|clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|kernel_checked|proof_success|GA certified|can_certify_ga|can_promote_claim|proof_breadth_closure_json|final_ga_audit_json/iu.test(
    text
  );
}

function readTask371Artifact(
  projectRoot: string,
  projectId: string,
  followUpId: string,
  followUpPath: string,
  expectedSha256: string
): {
  body: JsonRecord;
  artifact: ArtifactReference;
  refs: {
    task370: ArtifactReference;
    task368: ArtifactReference;
    task367: ArtifactReference;
    task364: ArtifactReference | null;
    delegatedTask365: ArtifactReference | null;
  };
  selectedPackagingReportArtifacts: ArtifactReference[];
  blockerReasons: string[];
} {
  const absolutePath = assertPathAllowed(projectRoot, followUpPath, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new ComathError("Goal 3 selected-tranche closure execution packaging results closure recheck Task371 artifact is missing", {
      statusCode: 404,
      code: errorCode("TASK371_MISSING")
    });
  }
  const bytes = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(bytes);
  if (actualSha256 !== expectedSha256) {
    throw new ComathError("Goal 3 selected-tranche closure execution packaging results closure recheck Task371 artifact is stale", {
      statusCode: 409,
      code: errorCode("STALE_TASK371")
    });
  }
  const body = parseTask371(bytes);
  if (
    body.schema_version !== `comath.${TASK371_KIND}.v1` ||
    body.project_id !== projectId ||
    body[`${b5}_follow_up_id`] !== followUpId ||
    normalizeRelativePath(String(body[`${b5}_follow_up_path`] ?? "")) !== followUpPath ||
    typeof body.selected_packaging_report_artifacts_current !== "boolean" ||
    typeof body.ready_for_proof_breadth_closure_recheck !== "boolean" ||
    body.proof_breadth_complete !== false ||
    body.final_ga_audit_unblocked !== false ||
    body.runs_lean !== false ||
    body.executes_proofs !== false ||
    body.accepts_caller_success_metadata !== false ||
    body.accepts_caller_proof_material !== false ||
    body.proof_authority !== "none" ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    body.ga_certification_gate_separate !== true
  ) {
    invalidTask371();
  }

  const task370 = assertCurrentArtifactReference(
    projectRoot,
    body[`${b4}_closure_execution_packaging_follow_through_path`],
    body[`${b4}_closure_execution_packaging_follow_through_artifact`],
    TASK370_KIND
  );
  assertArtifactIdMatchesPath(body[`${b4}_closure_execution_packaging_follow_through_id`], task370.path, task370);

  const task368 = assertCurrentArtifactReference(
    projectRoot,
    body[`${b4}_closure_execution_bridge_path`],
    body[`${b4}_closure_execution_bridge_artifact`],
    TASK368_KIND
  );
  assertArtifactIdMatchesPath(body[`${b4}_closure_execution_bridge_id`], task368.path, task368);

  const task367 = assertCurrentArtifactReference(
    projectRoot,
    body[`${b4}_closure_recheck_path`],
    body[`${b4}_closure_recheck_artifact`],
    TASK367_KIND
  );
  assertArtifactIdMatchesPath(body[`${b4}_closure_recheck_id`], task367.path, task367);

  const task364 = assertOptionalCurrentArtifactReference(
    projectRoot,
    body[`delegated_${b2}_closure_execution_packaging_follow_through_path`],
    body[`delegated_${b2}_closure_execution_packaging_follow_through_artifact`],
    TASK364_KIND,
    body[`delegated_${b2}_closure_execution_packaging_follow_through_id`]
  );

  const delegatedTask365 = assertOptionalCurrentArtifactReference(
    projectRoot,
    body[`delegated_${b3}_follow_up_path`],
    body[`delegated_${b3}_follow_up_artifact`],
    TASK365_KIND,
    body[`delegated_${b3}_follow_up_id`]
  );

  const selectedPackagingReportArtifacts = assertArtifactArray(body.selected_packaging_report_artifacts);
  for (const artifact of selectedPackagingReportArtifacts) {
    const current = artifactForProjectFile(projectRoot, artifact.path, artifact.kind);
    if (!artifactReferencesEqual(artifact, current)) {
      invalidTask371();
    }
  }

  return {
    body,
    artifact: {
      kind: TASK371_KIND,
      path: followUpPath,
      sha256: actualSha256,
      size_bytes: statSync(absolutePath).size
    },
    refs: { task370, task368, task367, task364, delegatedTask365 },
    selectedPackagingReportArtifacts,
    blockerReasons: sanitizeBlockerReasons(assertStringArray(body.blocker_reasons), "task371")
  };
}

function artifactForDelegatedTask367(projectRoot: string, delegated: JsonRecord): ArtifactReference {
  return artifactForProjectFile(projectRoot, delegated[`${b4}_closure_recheck_path`], TASK367_KIND);
}

function persistResult(
  absoluteOutputPath: string,
  body: JsonRecord
): Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck {
  const text = `${JSON.stringify(body, null, 2)}\n`;
  mkdirSync(dirname(absoluteOutputPath), { recursive: true });
  writeFileSync(absoluteOutputPath, text, "utf8");
  return {
    ...body,
    [`${b5}_closure_recheck_artifact`]: {
      kind: TASK373_KIND,
      path: body[`${b5}_closure_recheck_path`],
      sha256: sha256Text(text),
      size_bytes: Buffer.byteLength(text, "utf8")
    }
  } as Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck;
}

function makeBaseBody(
  projectId: string,
  recheckId: string,
  actor: string,
  outputPath: string,
  task371: ReturnType<typeof readTask371Artifact>,
  blockerReasons: string[]
): JsonRecord {
  return {
    schema_version: `comath.${TASK373_KIND}.v1`,
    [`${b5}_closure_recheck_id`]: recheckId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    [`${b5}_closure_recheck_path`]: outputPath,
    requested_recheck_mode: REQUESTED_MODE,
    [`${b5}_follow_up_id`]: task371.body[`${b5}_follow_up_id`],
    [`${b5}_follow_up_path`]: task371.artifact.path,
    [`${b5}_follow_up_artifact`]: task371.artifact,
    [`${b4}_closure_execution_packaging_follow_through_id`]: task371.body[`${b4}_closure_execution_packaging_follow_through_id`],
    [`${b4}_closure_execution_packaging_follow_through_path`]: task371.refs.task370.path,
    [`${b4}_closure_execution_packaging_follow_through_artifact`]: task371.refs.task370,
    [`${b4}_closure_execution_bridge_id`]: task371.body[`${b4}_closure_execution_bridge_id`],
    [`${b4}_closure_execution_bridge_path`]: task371.refs.task368.path,
    [`${b4}_closure_execution_bridge_artifact`]: task371.refs.task368,
    [`${b4}_closure_recheck_id`]: task371.body[`${b4}_closure_recheck_id`],
    [`${b4}_closure_recheck_path`]: task371.refs.task367.path,
    [`${b4}_closure_recheck_artifact`]: task371.refs.task367,
    [`delegated_${b2}_closure_execution_packaging_follow_through_id`]:
      task371.body[`delegated_${b2}_closure_execution_packaging_follow_through_id`],
    [`delegated_${b2}_closure_execution_packaging_follow_through_path`]: task371.refs.task364?.path ?? null,
    [`delegated_${b2}_closure_execution_packaging_follow_through_artifact`]: task371.refs.task364,
    [`delegated_${b3}_follow_up_id`]: task371.body[`delegated_${b3}_follow_up_id`],
    [`delegated_${b3}_follow_up_path`]: task371.refs.delegatedTask365?.path ?? null,
    [`delegated_${b3}_follow_up_artifact`]: task371.refs.delegatedTask365,
    selected_task_count: task371.body.selected_task_count,
    verified_selected_task_count: task371.body.verified_selected_task_count,
    missing_selected_task_count: task371.body.missing_selected_task_count,
    blocked_selected_task_count: task371.body.blocked_selected_task_count,
    selected_task_ids: assertStringArray(task371.body.selected_task_ids),
    verified_selected_task_ids: assertStringArray(task371.body.verified_selected_task_ids),
    missing_selected_task_ids: assertStringArray(task371.body.missing_selected_task_ids),
    blocked_selected_task_ids: assertStringArray(task371.body.blocked_selected_task_ids),
    selected_packaging_report_artifacts: task371.selectedPackagingReportArtifacts,
    selected_packaging_report_artifacts_current: task371.body.selected_packaging_report_artifacts_current,
    ready_for_proof_breadth_closure_recheck: task371.body.ready_for_proof_breadth_closure_recheck,
    blocker_reasons: blockerReasons,
    runs_lean: false,
    executes_proofs: false,
    accepts_caller_success_metadata: false,
    accepts_caller_proof_material: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    ga_certification_gate_separate: true
  };
}

export function recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck(
  projectRoot: string,
  input: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheckInput
): Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck {
  const projectId = assertSafeId(input.project_id, "project_id");
  const recheckId = assertSafeId(input[`${b5}_closure_recheck_id`], `${b5}_closure_recheck_id`);
  const task371Id = assertSafeId(input[`${b5}_follow_up_id`], `${b5}_follow_up_id`);
  const task371Sha256 = assertSha256(input[`${b5}_follow_up_sha256`]);
  const task371RelativePath = assertTask371InputPath(input[`${b5}_follow_up_path`], task371Id);
  if (input.requested_recheck_mode !== undefined && input.requested_recheck_mode !== REQUESTED_MODE) {
    throw new ComathError("Goal 3 selected-tranche closure execution packaging results closure recheck mode is invalid", {
      statusCode: 400,
      code: errorCode("INVALID_MODE")
    });
  }

  const outputPath = recheckPath(recheckId);
  const absoluteOutputPath = assertPathAllowed(projectRoot, outputPath, { purpose: "runtime-write" });
  if (existsSync(absoluteOutputPath)) {
    throw new ComathError("Goal 3 selected-tranche closure execution packaging results closure recheck already exists", {
      statusCode: 409,
      code: errorCode("ALREADY_EXISTS")
    });
  }

  const task371 = readTask371Artifact(projectRoot, projectId, task371Id, task371RelativePath, task371Sha256);
  const actor = sanitizeActor(input.actor);
  const baseBlockerReasons = uniqueStrings([
    ...task371.blockerReasons,
    ...(callerProofOrGaMaterialPresent(input) ? ["caller_proof_or_ga_authority_material_ignored"] : [])
  ]);
  const baseBody = makeBaseBody(projectId, recheckId, actor, outputPath, task371, baseBlockerReasons);

  let result: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck;
  if (!task371.refs.delegatedTask365) {
    result = persistResult(absoluteOutputPath, {
      ...baseBody,
      ok: false,
      recheck_status:
        "blocked_next_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_not_ready_for_closure_recheck",
      [`delegated_${b4}_closure_recheck_id`]: null,
      [`delegated_${b4}_closure_recheck_path`]: null,
      [`delegated_${b4}_closure_recheck_artifact`]: null,
      proof_breadth_closure_id: null,
      proof_breadth_closure_path: null,
      proof_breadth_closure_artifact: null,
      blocker_reasons: uniqueStrings([...baseBlockerReasons, "task371_not_ready_for_closure_recheck"]),
      proof_breadth_complete: false,
      final_ga_audit_unblocked: false
    });
  } else {
    const delegatedId = `G3-T373-T367-${shortIdSuffix(recheckId)}`;
    const delegated = recordTask367ClosureRecheck(projectRoot, {
      project_id: projectId,
      [`${b4}_closure_recheck_id`]: delegatedId,
      [`${b3}_follow_up_id`]: task371.body[`delegated_${b3}_follow_up_id`],
      [`${b3}_follow_up_path`]: task371.refs.delegatedTask365.path,
      [`${b3}_follow_up_sha256`]: task371.refs.delegatedTask365.sha256,
      actor
    } as any);
    const delegatedRecord = delegated as JsonRecord;
    if (
      delegatedRecord[`${b3}_follow_up_id`] !== task371.body[`delegated_${b3}_follow_up_id`] ||
      normalizeRelativePath(delegatedRecord[`${b3}_follow_up_path`]) !== task371.refs.delegatedTask365.path ||
      !artifactReferencesEqual(delegatedRecord[`${b3}_follow_up_artifact`], task371.refs.delegatedTask365)
    ) {
      throw new ComathError("Goal 3 selected-tranche closure execution packaging results closure recheck delegated Task367 material is inconsistent", {
        statusCode: 409,
        code: errorCode("TASK367_DELEGATED_MISMATCH")
      });
    }
    const delegatedArtifact = artifactForDelegatedTask367(projectRoot, delegatedRecord);
    const blockerReasons = uniqueStrings([
      ...baseBlockerReasons,
      ...sanitizeBlockerReasons(assertStringArray(delegatedRecord.blocker_reasons), "delegated")
    ]);
    result = persistResult(absoluteOutputPath, {
      ...baseBody,
      ok: delegatedRecord.proof_breadth_complete,
      recheck_status: delegatedRecord.proof_breadth_complete
        ? "next_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_global_proof_breadth_complete"
        : "blocked_global_proof_breadth_incomplete_after_next_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck",
      [`delegated_${b4}_closure_recheck_id`]: delegatedRecord[`${b4}_closure_recheck_id`],
      [`delegated_${b4}_closure_recheck_path`]: delegatedRecord[`${b4}_closure_recheck_path`],
      [`delegated_${b4}_closure_recheck_artifact`]: delegatedArtifact,
      proof_breadth_closure_id: delegatedRecord.proof_breadth_closure_id,
      proof_breadth_closure_path: delegatedRecord.proof_breadth_closure_path,
      proof_breadth_closure_artifact: delegatedRecord.proof_breadth_closure_artifact,
      blocker_reasons: blockerReasons,
      proof_breadth_complete: delegatedRecord.proof_breadth_complete,
      final_ga_audit_unblocked: delegatedRecord.final_ga_audit_unblocked
    });
  }

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type:
      "release.goal3_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_recorded",
    actor,
    target_id: projectId,
    payload: {
      [`${b5}_closure_recheck_id`]: recheckId,
      recheck_status: result.recheck_status,
      [`${b5}_closure_recheck_path`]: outputPath,
      [`${b5}_closure_recheck_artifact_sha256`]: result[`${b5}_closure_recheck_artifact`].sha256,
      [`${b5}_follow_up_id`]: task371Id,
      [`${b5}_follow_up_artifact_sha256`]: task371.artifact.sha256,
      [`delegated_${b3}_follow_up_id`]: result[`delegated_${b3}_follow_up_id`],
      [`delegated_${b3}_follow_up_artifact_sha256`]: result[`delegated_${b3}_follow_up_artifact`]?.sha256 ?? null,
      [`delegated_${b4}_closure_recheck_id`]: result[`delegated_${b4}_closure_recheck_id`],
      [`delegated_${b4}_closure_recheck_artifact_sha256`]: result[`delegated_${b4}_closure_recheck_artifact`]?.sha256 ?? null,
      proof_breadth_closure_id: result.proof_breadth_closure_id,
      proof_breadth_closure_artifact_sha256: result.proof_breadth_closure_artifact?.sha256 ?? null,
      selected_task_ids: result.selected_task_ids,
      proof_breadth_complete: result.proof_breadth_complete,
      final_ga_audit_unblocked: result.final_ga_audit_unblocked,
      blocker_reasons: result.blocker_reasons,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  });
  return result;
}
