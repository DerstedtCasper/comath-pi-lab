import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { assertPathAllowed } from "../security/path-policy.js";
import {
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck,
  type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck,
  type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheckInput
} from "./goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-recheck.js";

type ArtifactReference = {
  kind: string;
  path: string;
  sha256: string;
  size_bytes: number;
};

type JsonRecord = Record<string, any>;

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheckInput =
  {
    project_id: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id?: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_sha256: string;
    actor?: string;
    requested_recheck_mode?: "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck";
  };

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck =
  {
    schema_version: "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck.v1";
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id: string;
    project_id: string;
    actor: string;
    created_at: string;
    ok: boolean;
    recheck_status:
      | "next_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_global_proof_breadth_complete"
      | "blocked_global_proof_breadth_incomplete_after_next_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck"
      | "blocked_next_closure_execution_packaging_results_closure_execution_packaging_results_not_ready_for_closure_recheck";
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_path: string;
    requested_recheck_mode: "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck";
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact: ArtifactReference;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact: ArtifactReference;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact: ArtifactReference;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_path: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_artifact: ArtifactReference;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact: ArtifactReference;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact: ArtifactReference;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id: string | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path: string | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact: ArtifactReference | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id: string | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_path: string | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_artifact: ArtifactReference | null;
    proof_breadth_closure_id: string | null;
    proof_breadth_closure_path: string | null;
    proof_breadth_closure_artifact: ArtifactReference | null;
    selected_task_count: number;
    verified_selected_task_count: number;
    missing_selected_task_count: number;
    blocked_selected_task_count: number;
    selected_task_ids: string[];
    verified_selected_task_ids: string[];
    missing_selected_task_ids: string[];
    blocked_selected_task_ids: string[];
    selected_packaging_report_artifacts: ArtifactReference[];
    selected_packaging_report_artifacts_current: boolean;
    ready_for_proof_breadth_closure_recheck: boolean;
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
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_artifact: ArtifactReference;
  };

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function recheckPath(recheckId: string): string {
  return normalizeRelativePath(
    join(
      ".comath",
      "release",
      "goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-recheck",
      recheckId,
      "recheck.json"
    )
  );
}

function task365Path(followUpId: string): string {
  return normalizeRelativePath(
    join(
      ".comath",
      "release",
      "goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-follow-up",
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
  return `GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_RECHECK_${suffix}`;
}

function assertSafeId(value: string | undefined, label: string): string {
  const id = typeof value === "string" ? value.trim() : "";
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,300}$/u.test(id)) {
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

function assertTask365InputPath(path: string | undefined, followUpId: string): string {
  const normalizedInputPath = normalizeRelativePath(typeof path === "string" ? path.trim() : "");
  const expectedPath = task365Path(followUpId);
  if (normalizedInputPath !== expectedPath) {
    throw new ComathError(
      "Goal 3 selected-tranche next closure execution packaging results closure execution packaging results closure recheck Task365 path mismatch",
      {
        statusCode: 400,
        code: errorCode("TASK365_PATH_MISMATCH")
      }
    );
  }
  return expectedPath;
}

function sanitizeActor(actor: string | undefined): string {
  const text =
    typeof actor === "string" && actor.trim().length > 0
      ? actor.trim()
      : "goal3-selected-tranche-next-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-recheck";
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

function invalidTask365(): never {
  throw new ComathError(
    "Goal 3 selected-tranche next closure execution packaging results closure execution packaging results closure recheck Task365 artifact is invalid",
    {
      statusCode: 400,
      code: errorCode("INVALID_TASK365")
    }
  );
}

function assertStringArray(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    invalidTask365();
  }
  return value as string[];
}

function assertArtifactArray(value: unknown): ArtifactReference[] {
  if (!Array.isArray(value) || value.some((entry) => !isArtifactReference(entry))) {
    invalidTask365();
  }
  return value as ArtifactReference[];
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
    invalidTask365();
  }
  let current: ArtifactReference;
  try {
    current = artifactForProjectFile(projectRoot, path, kind);
  } catch {
    invalidTask365();
  }
  if (!artifactReferencesEqual(artifact, current)) {
    invalidTask365();
  }
  return current;
}

function assertOptionalCurrentArtifactReference(
  projectRoot: string,
  path: unknown,
  artifact: unknown,
  kind: string
): ArtifactReference | null {
  if (path === null && artifact === null) {
    return null;
  }
  return assertCurrentArtifactReference(projectRoot, path, artifact, kind);
}

function parseTask365(bytes: Buffer): JsonRecord {
  try {
    return JSON.parse(bytes.toString("utf8")) as JsonRecord;
  } catch {
    invalidTask365();
  }
}

function sanitizeBlockerReason(value: string, source: "task365" | "delegated"): string {
  const trimmed = value.trim();
  const sanitized = sanitizeActor(trimmed);
  if (sanitized !== trimmed || !/^[A-Za-z0-9_.:-]{1,240}$/u.test(trimmed)) {
    return source === "task365" ? "task365_blocker_reason_redacted" : "delegated_blocker_reason_redacted";
  }
  return trimmed;
}

function sanitizeBlockerReasons(values: string[], source: "task365" | "delegated"): string[] {
  return values.map((value) => sanitizeBlockerReason(value, source));
}

function readTask365Artifact(
  projectRoot: string,
  projectId: string,
  followUpId: string,
  followUpPath: string,
  expectedSha256: string
): {
  body: JsonRecord;
  artifact: ArtifactReference;
  refs: {
    task364: ArtifactReference;
    task362: ArtifactReference;
    task361: ArtifactReference;
    task356: ArtifactReference;
    task355: ArtifactReference;
    delegatedTask359: ArtifactReference | null;
  };
  blockerReasons: string[];
  selectedTaskIds: string[];
  verifiedSelectedTaskIds: string[];
  missingSelectedTaskIds: string[];
  blockedSelectedTaskIds: string[];
  selectedPackagingReportArtifacts: ArtifactReference[];
} {
  const absolutePath = assertPathAllowed(projectRoot, followUpPath, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new ComathError(
      "Goal 3 selected-tranche next closure execution packaging results closure execution packaging results closure recheck Task365 artifact is missing",
      {
        statusCode: 404,
        code: errorCode("TASK365_MISSING")
      }
    );
  }
  const bytes = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(bytes);
  if (actualSha256 !== expectedSha256) {
    throw new ComathError(
      "Goal 3 selected-tranche next closure execution packaging results closure execution packaging results closure recheck Task365 artifact is stale",
      {
        statusCode: 409,
        code: errorCode("STALE_TASK365")
      }
    );
  }
  const body = parseTask365(bytes);
  if (
    body.schema_version !==
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up.v1" ||
    body.project_id !== projectId ||
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id !==
      followUpId ||
    normalizeRelativePath(
      String(
        body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path ??
          ""
      )
    ) !== followUpPath ||
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
    invalidTask365();
  }
  return {
    body,
    artifact: {
      kind: "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up",
      path: followUpPath,
      sha256: actualSha256,
      size_bytes: bytes.byteLength
    },
    refs: {
      task364: assertCurrentArtifactReference(
        projectRoot,
        body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path,
        body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact,
        "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through"
      ),
      task362: assertCurrentArtifactReference(
        projectRoot,
        body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path,
        body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact,
        "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge"
      ),
      task361: assertCurrentArtifactReference(
        projectRoot,
        body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_path,
        body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_artifact,
        "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck"
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
      delegatedTask359: assertOptionalCurrentArtifactReference(
        projectRoot,
        body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path,
        body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact,
        "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up"
      )
    },
    blockerReasons: sanitizeBlockerReasons(assertStringArray(body.blocker_reasons), "task365"),
    selectedTaskIds: assertStringArray(body.selected_task_ids),
    verifiedSelectedTaskIds: assertStringArray(body.verified_selected_task_ids),
    missingSelectedTaskIds: assertStringArray(body.missing_selected_task_ids),
    blockedSelectedTaskIds: assertStringArray(body.blocked_selected_task_ids),
    selectedPackagingReportArtifacts: assertArtifactArray(body.selected_packaging_report_artifacts)
  };
}

function callerProofOrGaMaterialPresent(
  input: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheckInput
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
    record.ga_certificate_id !== undefined
  );
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function artifactForDelegatedTask361(
  projectRoot: string,
  delegated: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck
): ArtifactReference {
  return artifactForProjectFile(
    projectRoot,
    delegated.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_path,
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck"
  );
}

function makeBaseBody(
  projectId: string,
  recheckId: string,
  actor: string,
  outputPath: string,
  task365: ReturnType<typeof readTask365Artifact>,
  blockerReasons: string[]
) {
  return {
    schema_version:
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck.v1",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id:
      recheckId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_path:
      outputPath,
    requested_recheck_mode:
      "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id:
      task365.body
        .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path:
      task365.artifact.path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact:
      task365.artifact,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
      task365.body
        .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path:
      task365.refs.task364.path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact:
      task365.refs.task364,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
      task365.body
        .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path:
      task365.refs.task362.path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact:
      task365.refs.task362,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id:
      task365.body
        .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_path:
      task365.refs.task361.path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_artifact:
      task365.refs.task361,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
      task365.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path:
      task365.refs.task356.path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact:
      task365.refs.task356,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id:
      task365.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path:
      task365.refs.task355.path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact:
      task365.refs.task355,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id:
      task365.body
        .delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path:
      task365.refs.delegatedTask359?.path ?? null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact:
      task365.refs.delegatedTask359,
    selected_task_count: task365.body.selected_task_count,
    verified_selected_task_count: task365.body.verified_selected_task_count,
    missing_selected_task_count: task365.body.missing_selected_task_count,
    blocked_selected_task_count: task365.body.blocked_selected_task_count,
    selected_task_ids: task365.selectedTaskIds,
    verified_selected_task_ids: task365.verifiedSelectedTaskIds,
    missing_selected_task_ids: task365.missingSelectedTaskIds,
    blocked_selected_task_ids: task365.blockedSelectedTaskIds,
    selected_packaging_report_artifacts: task365.selectedPackagingReportArtifacts,
    selected_packaging_report_artifacts_current: task365.body.selected_packaging_report_artifacts_current,
    ready_for_proof_breadth_closure_recheck: task365.body.ready_for_proof_breadth_closure_recheck,
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
  absoluteOutputPath: string,
  body: Omit<
    Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck,
    "selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_artifact"
  >
): Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck {
  const text = `${JSON.stringify(body, null, 2)}\n`;
  mkdirSync(dirname(absoluteOutputPath), { recursive: true });
  writeFileSync(absoluteOutputPath, text, "utf8");
  return {
    ...body,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_artifact:
      {
        kind: "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck",
        path: body
          .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_path,
        sha256: sha256Text(text),
        size_bytes: Buffer.byteLength(text, "utf8")
      }
  };
}

export function recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck(
  projectRoot: string,
  input: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheckInput
): Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck {
  const projectId = assertSafeId(input.project_id, "project_id");
  const recheckId = assertSafeId(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id,
    "selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id"
  );
  const task365Id = assertSafeId(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id,
    "selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id"
  );
  const task365Sha256 = assertSha256(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_sha256
  );
  const task365RelativePath = assertTask365InputPath(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path,
    task365Id
  );
  const requestedMode =
    input.requested_recheck_mode ??
    "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck";
  if (
    requestedMode !==
    "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck"
  ) {
    throw new ComathError(
      "Goal 3 selected-tranche next closure execution packaging results closure execution packaging results closure recheck mode is invalid",
      {
        statusCode: 400,
        code: errorCode("INVALID_MODE")
      }
    );
  }
  const outputPath = recheckPath(recheckId);
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

  const task365 = readTask365Artifact(projectRoot, projectId, task365Id, task365RelativePath, task365Sha256);
  const actor = sanitizeActor(input.actor);
  const callerAuthorityMaterialIgnored = callerProofOrGaMaterialPresent(input);
  const baseBlockerReasons = uniqueStrings([
    ...task365.blockerReasons,
    ...(callerAuthorityMaterialIgnored ? ["caller_proof_or_ga_authority_material_ignored"] : [])
  ]);
  const baseBody = makeBaseBody(projectId, recheckId, actor, outputPath, task365, baseBlockerReasons);

  let result: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck;
  if (!task365.refs.delegatedTask359) {
    result = persistResult(absoluteOutputPath, {
      ...baseBody,
      ok: false,
      recheck_status: "blocked_next_closure_execution_packaging_results_closure_execution_packaging_results_not_ready_for_closure_recheck",
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id: null,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_path: null,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_artifact: null,
      proof_breadth_closure_id: null,
      proof_breadth_closure_path: null,
      proof_breadth_closure_artifact: null,
      blocker_reasons: uniqueStrings([...baseBlockerReasons, "task365_not_ready_for_closure_recheck"]),
      proof_breadth_complete: false,
      final_ga_audit_unblocked: false
    });
  } else {
    const delegatedId = `G3-T367-T361-${shortIdSuffix(recheckId)}`;
    const delegatedInput = {
      project_id: projectId,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id:
        delegatedId,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id:
        task365.body
          .delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path:
        task365.refs.delegatedTask359.path,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_sha256:
        task365.refs.delegatedTask359.sha256,
      actor,
      requested_recheck_mode:
        "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck"
    } satisfies Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheckInput;
    const delegated =
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck(
        projectRoot,
        delegatedInput
      );
    if (
      delegated.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id !==
        task365.body
          .delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id ||
      normalizeRelativePath(
        delegated.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path
      ) !== task365.refs.delegatedTask359.path ||
      !artifactReferencesEqual(
        delegated.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact,
        task365.refs.delegatedTask359
      )
    ) {
      throw new ComathError(
        "Goal 3 selected-tranche next closure execution packaging results closure execution packaging results closure recheck delegated Task361 material is inconsistent",
        {
          statusCode: 409,
          code: errorCode("TASK361_DELEGATED_MISMATCH")
        }
      );
    }
    const delegatedArtifact = artifactForDelegatedTask361(projectRoot, delegated);
    const blockerReasons = uniqueStrings([
      ...baseBlockerReasons,
      ...sanitizeBlockerReasons(delegated.blocker_reasons, "delegated")
    ]);
    result = persistResult(absoluteOutputPath, {
      ...baseBody,
      ok: delegated.proof_breadth_complete,
      recheck_status: delegated.proof_breadth_complete
        ? "next_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_global_proof_breadth_complete"
        : "blocked_global_proof_breadth_incomplete_after_next_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck",
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id:
        delegated.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_path:
        delegated.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_path,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_artifact:
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
      "release.goal3_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_recorded",
    actor,
    target_id: projectId,
    payload: {
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id:
        recheckId,
      recheck_status: result.recheck_status,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_path:
        outputPath,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_artifact_sha256:
        result
          .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_artifact
          .sha256,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id:
        task365Id,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact_sha256:
        task365.artifact.sha256,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id:
        result.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact_sha256:
        result
          .delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact
          ?.sha256 ?? null,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id:
        result
          .delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_artifact_sha256:
        result
          .delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_artifact
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
