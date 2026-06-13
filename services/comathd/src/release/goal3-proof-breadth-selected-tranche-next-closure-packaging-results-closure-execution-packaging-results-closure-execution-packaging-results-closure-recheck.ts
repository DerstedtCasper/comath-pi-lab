import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { assertPathAllowed } from "../security/path-policy.js";
import {
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureRecheck,
  type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureRecheck,
  type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureRecheckInput
} from "./goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-recheck.js";
import type { Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp } from "./goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-follow-up.js";

type ArtifactReference = {
  kind: string;
  path: string;
  sha256: string;
  size_bytes: number;
};

type PersistedTask359ClosureExecutionPackagingResultsFollowUp = Omit<
  Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp,
  "selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact"
>;

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheckInput =
  {
    project_id: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id?: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_sha256: string;
    actor?: string;
    requested_recheck_mode?: "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck";
  };

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck =
  {
    schema_version: "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck.v1";
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id: string;
    project_id: string;
    actor: string;
    created_at: string;
    ok: boolean;
    recheck_status:
      | "next_closure_execution_packaging_results_closure_recheck_global_proof_breadth_complete"
      | "blocked_global_proof_breadth_incomplete_after_next_closure_execution_packaging_results_closure_recheck"
      | "blocked_next_closure_execution_packaging_results_not_ready_for_closure_recheck";
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_path: string;
    requested_recheck_mode: "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck";
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact: ArtifactReference;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact: ArtifactReference;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact: ArtifactReference;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact: ArtifactReference;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id: string;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_path: string;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_artifact: ArtifactReference;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id: string | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path: string | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact:
      | ArtifactReference
      | null;
    proof_breadth_closure_id: string | null;
    proof_breadth_closure_path: string | null;
    proof_breadth_closure_artifact: ArtifactReference | null;
    selected_task_count: number;
    selected_task_ids: string[];
    verified_selected_task_count: number;
    selected_packaging_report_artifacts: ArtifactReference[];
    selected_packaging_report_artifacts_current: true;
    blocker_reasons: string[];
    proof_breadth_complete: boolean;
    final_ga_audit_unblocked: boolean;
    runs_lean: false;
    executes_proofs: false;
    accepts_caller_success_metadata: false;
    accepts_caller_proof_material: false;
    proof_authority: "none";
    can_promote_claim: false;
    can_certify_ga: false;
    ga_certification_gate_separate: true;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_artifact: ArtifactReference;
  };

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function recheckPath(recheckId: string): string {
  return normalizeRelativePath(
    join(
      ".comath",
      "release",
      "goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-recheck",
      recheckId,
      "recheck.json"
    )
  );
}

function task359Path(followUpId: string): string {
  return normalizeRelativePath(
    join(
      ".comath",
      "release",
      "goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-follow-up",
      followUpId,
      "follow-up.json"
    )
  );
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
  return `GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_RECHECK_${suffix}`;
}

function assertSafeId(value: string | undefined, label: string): string {
  const id = typeof value === "string" ? value.trim() : "";
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,220}$/u.test(id)) {
    throw new ComathError(`${label} is invalid`, {
      statusCode: 400,
      code: errorCode("INVALID_ID")
    });
  }
  return id;
}

function assertSha256(value: string | undefined): string {
  const sha256 = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-f0-9]{64}$/u.test(sha256)) {
    throw new ComathError(
      "Goal 3 selected-tranche next closure execution packaging results closure execution packaging results closure recheck hash is invalid",
      {
        statusCode: 400,
        code: errorCode("INVALID_HASH")
      }
    );
  }
  return sha256;
}

function assertTask359InputPath(path: string | undefined, followUpId: string): string {
  const normalizedInputPath = normalizeRelativePath(typeof path === "string" ? path.trim() : "");
  const expectedPath = task359Path(followUpId);
  if (normalizedInputPath !== expectedPath) {
    throw new ComathError(
      "Goal 3 selected-tranche next closure execution packaging results closure recheck Task359 path mismatch",
      {
        statusCode: 400,
        code: errorCode("TASK359_PATH_MISMATCH")
      }
    );
  }
  return expectedPath;
}

function sanitizeActor(actor: string | undefined): string {
  const text =
    typeof actor === "string" && actor.trim().length > 0
      ? actor.trim()
      : "goal3-selected-tranche-next-closure-execution-packaging-results-closure-execution-packaging-results-closure-recheck";
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

function invalidTask359(): never {
  throw new ComathError(
    "Goal 3 selected-tranche next closure execution packaging results closure execution packaging results closure recheck Task359 artifact is invalid",
    {
      statusCode: 400,
      code: errorCode("INVALID_TASK359")
    }
  );
}

function assertStringArray(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    invalidTask359();
  }
  return value as string[];
}

function assertCurrentArtifactReference(
  projectRoot: string,
  path: string,
  artifact: unknown,
  kind: string
): ArtifactReference {
  if (!isArtifactReference(artifact) || artifact.kind !== kind || normalizeRelativePath(artifact.path) !== normalizeRelativePath(path)) {
    invalidTask359();
  }
  let current: ArtifactReference;
  try {
    current = artifactForProjectFile(projectRoot, path, kind);
  } catch {
    invalidTask359();
  }
  if (!artifactReferencesEqual(artifact, current)) {
    invalidTask359();
  }
  return current;
}

function parseTask359(bytes: Buffer): PersistedTask359ClosureExecutionPackagingResultsFollowUp {
  try {
    return JSON.parse(bytes.toString("utf8")) as PersistedTask359ClosureExecutionPackagingResultsFollowUp;
  } catch {
    invalidTask359();
  }
}

function sanitizeBlockerReason(value: string, source: "task359" | "delegated"): string {
  const trimmed = value.trim();
  const sanitized = sanitizeActor(trimmed);
  if (sanitized !== trimmed || !/^[A-Za-z0-9_.:-]{1,200}$/u.test(trimmed)) {
    return source === "task359" ? "task359_blocker_reason_redacted" : "delegated_blocker_reason_redacted";
  }
  return trimmed;
}

function sanitizeBlockerReasons(values: string[], source: "task359" | "delegated"): string[] {
  return values.map((value) => sanitizeBlockerReason(value, source));
}

function readTask359Artifact(
  projectRoot: string,
  projectId: string,
  followUpId: string,
  followUpPath: string,
  expectedSha256: string
): {
  body: PersistedTask359ClosureExecutionPackagingResultsFollowUp;
  artifact: ArtifactReference;
  refs: {
    task358: ArtifactReference;
    task356: ArtifactReference;
    task355: ArtifactReference;
    task353: ArtifactReference;
  };
  task359BlockerReasons: string[];
} {
  const absolutePath = assertPathAllowed(projectRoot, followUpPath, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new ComathError(
      "Goal 3 selected-tranche next closure execution packaging results closure execution packaging results closure recheck Task359 artifact is missing",
      {
        statusCode: 404,
        code: errorCode("TASK359_MISSING")
      }
    );
  }
  const bytes = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(bytes);
  if (actualSha256 !== expectedSha256) {
    throw new ComathError(
      "Goal 3 selected-tranche next closure execution packaging results closure execution packaging results closure recheck Task359 artifact is stale",
      {
        statusCode: 409,
        code: errorCode("STALE_TASK359")
      }
    );
  }
  const body = parseTask359(bytes);
  if (
    body.schema_version !==
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up.v1" ||
    body.project_id !== projectId ||
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id !==
      followUpId ||
    normalizeRelativePath(
      body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path
    ) !== followUpPath ||
    body.selected_packaging_report_artifacts_current !== true ||
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
    body.ga_certification_gate_separate !== true ||
    typeof body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id !==
      "string" ||
    typeof body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_path !==
      "string" ||
    !Array.isArray(body.selected_task_ids) ||
    !Array.isArray(body.selected_packaging_report_artifacts) ||
    !Array.isArray(body.blocker_reasons)
  ) {
    invalidTask359();
  }
  return {
    body,
    artifact: {
      kind: "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up",
      path: followUpPath,
      sha256: actualSha256,
      size_bytes: bytes.byteLength
    },
    refs: {
      task358: assertCurrentArtifactReference(
        projectRoot,
        body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path,
        body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact,
        "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through"
      ),
      task356: assertCurrentArtifactReference(
        projectRoot,
        body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path,
        body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact,
        "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge"
      ),
      task355: assertCurrentArtifactReference(
        projectRoot,
        body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path,
        body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact,
        "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck"
      ),
      task353: assertCurrentArtifactReference(
        projectRoot,
        body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_path,
        body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_artifact,
        "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up"
      )
    },
    task359BlockerReasons: sanitizeBlockerReasons(assertStringArray(body.blocker_reasons), "task359")
  };
}

function callerProofOrGaMaterialPresent(
  input: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheckInput
): boolean {
  const record = input as Record<string, unknown>;
  return (
    record.proof_breadth_matrix !== undefined ||
    record.proof_breadth_matrix_path !== undefined ||
    record.proof_breadth_matrix_sha256 !== undefined ||
    record.proof_artifact !== undefined ||
    record.proof_claim !== undefined ||
    record.lean_replay_manifest !== undefined ||
    record.final_replay_manifest !== undefined ||
    record.final_authority_packaging_report !== undefined ||
    record.executor_result !== undefined ||
    record.proof_authority !== undefined ||
    record.can_certify_ga !== undefined ||
    record.can_promote_claim !== undefined ||
    record.final_ga_audit_json !== undefined ||
    record.final_ga_audit_id !== undefined ||
    record.proof_breadth_closure_json !== undefined ||
    record.proof_breadth_closure_id !== undefined ||
    record.ga_certificate_id !== undefined ||
    record.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id !==
      undefined
  );
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function artifactForDelegatedTask355(
  projectRoot: string,
  delegated: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureRecheck
): ArtifactReference {
  return artifactForProjectFile(
    projectRoot,
    delegated.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path,
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck"
  );
}

function makeBaseBody(
  projectId: string,
  recheckId: string,
  actor: string,
  outputPath: string,
  task359: ReturnType<typeof readTask359Artifact>,
  blockerReasons: string[]
) {
  return {
    schema_version:
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck.v1",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id:
      recheckId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_path:
      outputPath,
    requested_recheck_mode:
      "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id:
      task359.body
        .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path:
      task359.artifact.path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact:
      task359.artifact,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
      task359.body
        .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path:
      task359.refs.task358.path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact:
      task359.refs.task358,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
      task359.body
        .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path:
      task359.refs.task356.path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact:
      task359.refs.task356,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id:
      task359.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path:
      task359.refs.task355.path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact:
      task359.refs.task355,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id:
      task359.body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_path:
      task359.refs.task353.path,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_artifact:
      task359.refs.task353,
    selected_task_count: task359.body.selected_task_count,
    selected_task_ids: task359.body.selected_task_ids,
    verified_selected_task_count: task359.body.verified_selected_task_count,
    selected_packaging_report_artifacts: task359.body.selected_packaging_report_artifacts,
    selected_packaging_report_artifacts_current: true,
    blocker_reasons: blockerReasons,
    runs_lean: false,
    executes_proofs: false,
    accepts_caller_success_metadata: false,
    accepts_caller_proof_material: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    ga_certification_gate_separate: true
  } as const;
}

function persistResult(
  projectRoot: string,
  absoluteOutputPath: string,
  body: Omit<
    Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck,
    "selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_artifact"
  >
): Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck {
  const text = `${JSON.stringify(body, null, 2)}\n`;
  mkdirSync(dirname(absoluteOutputPath), { recursive: true });
  writeFileSync(absoluteOutputPath, text, "utf8");
  return {
    ...body,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_artifact:
      {
        kind: "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck",
        path: body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_path,
        sha256: sha256Text(text),
        size_bytes: Buffer.byteLength(text, "utf8")
      }
  };
}

export function recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck(
  projectRoot: string,
  input: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheckInput
): Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck {
  const projectId = assertSafeId(input.project_id, "project_id");
  const closureRecheckId = assertSafeId(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id,
    "selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id"
  );
  const task359Id = assertSafeId(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id,
    "selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id"
  );
  const task359Sha256 = assertSha256(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_sha256
  );
  const task359RelativePath = assertTask359InputPath(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path,
    task359Id
  );
  const requestedMode =
    input.requested_recheck_mode ??
    "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck";
  if (
    requestedMode !==
    "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck"
  ) {
    throw new ComathError(
      "Goal 3 selected-tranche next closure execution packaging results closure execution packaging results closure recheck mode is invalid",
      {
        statusCode: 400,
        code: errorCode("INVALID_MODE")
      }
    );
  }
  const outputPath = recheckPath(closureRecheckId);
  const absoluteOutputPath = assertPathAllowed(projectRoot, outputPath, { purpose: "runtime-write" });
  if (existsSync(absoluteOutputPath)) {
    throw new ComathError(
      "Goal 3 selected-tranche next closure execution packaging results closure execution packaging results closure recheck already exists",
      {
        statusCode: 409,
        code: errorCode("ALREADY_EXISTS")
      }
    );
  }

  const task359 = readTask359Artifact(projectRoot, projectId, task359Id, task359RelativePath, task359Sha256);
  const actor = sanitizeActor(input.actor);
  const callerAuthorityMaterialIgnored = callerProofOrGaMaterialPresent(input);
  const task359BlockerReasons = sanitizeBlockerReasons(task359.task359BlockerReasons, "task359");
  const baseBlockerReasons = uniqueStrings([
    ...task359BlockerReasons,
    ...(callerAuthorityMaterialIgnored ? ["caller_proof_or_ga_authority_material_ignored"] : [])
  ]);
  const baseBody = makeBaseBody(projectId, closureRecheckId, actor, outputPath, task359, baseBlockerReasons);

  let result: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck;
  if (!task359.body.ready_for_proof_breadth_closure_recheck) {
    result = persistResult(projectRoot, absoluteOutputPath, {
      ...baseBody,
      ok: false,
      recheck_status: "blocked_next_closure_execution_packaging_results_not_ready_for_closure_recheck",
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id: null,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path: null,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact: null,
      proof_breadth_closure_id: null,
      proof_breadth_closure_path: null,
      proof_breadth_closure_artifact: null,
      blocker_reasons: uniqueStrings([...baseBlockerReasons, "task359_not_ready_for_closure_recheck"]),
      proof_breadth_complete: false,
      final_ga_audit_unblocked: false
    });
  } else {
    const delegatedId = `G3-T361-T355-${shortIdSuffix(closureRecheckId)}`;
    const delegatedInput = {
      project_id: projectId,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id:
        delegatedId,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id:
        task359.body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_path:
        task359.refs.task353.path,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_sha256:
        task359.refs.task353.sha256,
      actor,
      requested_recheck_mode:
        "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck"
    } satisfies Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureRecheckInput;
    const delegated =
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureRecheck(
        projectRoot,
        delegatedInput
      );
    if (
      delegated.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id !==
        task359.body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id ||
      normalizeRelativePath(delegated.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_path) !==
        task359.refs.task353.path ||
      !artifactReferencesEqual(
        delegated.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_artifact,
        task359.refs.task353
      )
    ) {
      throw new ComathError(
        "Goal 3 selected-tranche next closure execution packaging results closure execution packaging results closure recheck delegated Task355 material is inconsistent",
        {
          statusCode: 409,
          code: errorCode("TASK355_DELEGATED_MISMATCH")
        }
      );
    }
    const delegatedArtifact = artifactForDelegatedTask355(projectRoot, delegated);
    const blockerReasons = uniqueStrings([
      ...baseBlockerReasons,
      ...sanitizeBlockerReasons(delegated.blocker_reasons, "delegated")
    ]);
    result = persistResult(projectRoot, absoluteOutputPath, {
      ...baseBody,
      ok: delegated.proof_breadth_complete,
      recheck_status: delegated.proof_breadth_complete
        ? "next_closure_execution_packaging_results_closure_recheck_global_proof_breadth_complete"
        : "blocked_global_proof_breadth_incomplete_after_next_closure_execution_packaging_results_closure_recheck",
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id:
        delegated.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path:
        delegated.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact:
        delegatedArtifact,
      proof_breadth_closure_id: delegated.proof_breadth_closure_id,
      proof_breadth_closure_path: delegated.proof_breadth_closure_path,
      proof_breadth_closure_artifact: delegated.proof_breadth_closure_artifact,
      blocker_reasons: blockerReasons,
      proof_breadth_complete: delegated.proof_breadth_complete,
      final_ga_audit_unblocked: delegated.final_ga_audit_unblocked
    });
  }

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type:
      "release.goal3_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_recorded",
    actor,
    target_id: projectId,
    payload: {
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id:
        closureRecheckId,
      recheck_status: result.recheck_status,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_path:
        outputPath,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_artifact_sha256:
        result
          .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_artifact
          .sha256,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id:
        task359Id,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact_sha256:
        task359.artifact.sha256,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id:
        result.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_artifact_sha256:
        result.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_artifact
          .sha256,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id:
        result.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact_sha256:
        result.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact
          ?.sha256 ?? null,
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
