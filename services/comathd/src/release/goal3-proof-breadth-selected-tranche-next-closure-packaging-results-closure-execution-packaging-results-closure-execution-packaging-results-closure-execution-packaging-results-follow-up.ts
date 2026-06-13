import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { assertPathAllowed } from "../security/path-policy.js";
import {
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp,
  type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp,
  type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUpInput
} from "./goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-follow-up.js";
import type { Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough } from "./goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-follow-through.js";

type ArtifactReference = {
  kind: string;
  path: string;
  sha256: string;
  size_bytes: number;
};

type PersistedTask364ClosureExecutionPackagingFollowThrough = Omit<
  Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough,
  "selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact"
>;

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUpInput =
  {
    project_id: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id?: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_sha256: string;
    actor?: string;
    requested_follow_up_mode?: "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up";
  };

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp =
  {
    schema_version: "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up.v1";
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id: string;
    project_id: string;
    actor: string;
    created_at: string;
    ok: boolean;
    follow_up_status:
      | "next_closure_execution_packaging_results_selected_tranche_packaging_results_current_for_proof_breadth_closure_recheck"
      | "blocked_next_closure_execution_packaging_results_selected_tranche_packaging_results_incomplete"
      | "blocked_next_closure_execution_packaging_results_closure_execution_packaging_not_ready_for_packaging_results_follow_up";
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path: string;
    requested_follow_up_mode: "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up";
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
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id: string | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path: string | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact: ArtifactReference | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id: string | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path: string | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact: ArtifactReference | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id: string | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_path: string | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_artifact: ArtifactReference | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id: string | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_path: string | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_artifact: ArtifactReference | null;
    delegated_selected_tranche_next_closure_packaging_results_follow_up_id: string | null;
    delegated_selected_tranche_next_closure_packaging_results_follow_up_path: string | null;
    delegated_selected_tranche_next_closure_packaging_results_follow_up_artifact: ArtifactReference | null;
    selected_tranche_next_packaging_results_follow_up_id: string | null;
    selected_tranche_next_packaging_results_follow_up_path: string | null;
    selected_tranche_next_packaging_results_follow_up_artifact: ArtifactReference | null;
    selected_tranche_next_closure_packaging_follow_through_id: string | null;
    selected_tranche_next_closure_packaging_follow_through_path: string | null;
    selected_tranche_next_closure_packaging_follow_through_artifact: ArtifactReference | null;
    selected_tranche_next_packaging_follow_through_id: string | null;
    selected_tranche_next_packaging_follow_through_path: string | null;
    selected_tranche_next_packaging_follow_through_artifact: ArtifactReference | null;
    task_local_packaging_follow_through_id: string | null;
    task_local_packaging_follow_through_path: string | null;
    task_local_packaging_follow_through_artifact: ArtifactReference | null;
    proof_breadth_execution_follow_through_id: string | null;
    proof_breadth_execution_follow_through_path: string | null;
    proof_breadth_execution_follow_through_artifact: ArtifactReference | null;
    blocker_reasons: string[];
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
    proof_breadth_complete: false;
    final_ga_audit_unblocked: false;
    runs_lean: false;
    executes_proofs: false;
    accepts_caller_success_metadata: false;
    accepts_caller_proof_material: false;
    proof_authority: "none";
    can_promote_claim: false;
    can_certify_ga: false;
    ga_certification_gate_separate: true;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact: ArtifactReference;
  };

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function followUpPath(followUpId: string): string {
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

function task364Path(followThroughId: string): string {
  return normalizeRelativePath(
    join(
      ".comath",
      "release",
      "goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-follow-through",
      followThroughId,
      "follow-through.json"
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
  return `GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_FOLLOW_UP_${suffix}`;
}

function assertSafeId(value: string | undefined, label: string): string {
  const id = typeof value === "string" ? value.trim() : "";
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,280}$/u.test(id)) {
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
    throw new ComathError("Goal 3 selected-tranche next closure execution packaging results follow-up hash is invalid", {
      statusCode: 400,
      code: errorCode("INVALID_HASH")
    });
  }
  return sha256;
}

function assertTask364InputPath(path: string | undefined, followThroughId: string): string {
  const normalizedInputPath = normalizeRelativePath(typeof path === "string" ? path.trim() : "");
  const expectedPath = task364Path(followThroughId);
  if (normalizedInputPath !== expectedPath) {
    throw new ComathError("Goal 3 selected-tranche next closure execution packaging results follow-up Task364 path mismatch", {
      statusCode: 400,
      code: errorCode("TASK364_PATH_MISMATCH")
    });
  }
  return expectedPath;
}

function sanitizeActor(actor: string | undefined): string {
  const text =
    typeof actor === "string" && actor.trim().length > 0
      ? actor.trim()
      : "goal3-selected-tranche-next-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-follow-up";
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

function invalidTask364(): never {
  throw new ComathError("Goal 3 selected-tranche next closure execution packaging results follow-up Task364 artifact is invalid", {
    statusCode: 400,
    code: errorCode("INVALID_TASK364")
  });
}

function assertStringArray(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    invalidTask364();
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
    invalidTask364();
  }
  let current: ArtifactReference;
  try {
    current = artifactForProjectFile(projectRoot, path, kind);
  } catch {
    invalidTask364();
  }
  if (!artifactReferencesEqual(artifact, current)) {
    invalidTask364();
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
  if (typeof path !== "string" || !isArtifactReference(artifact)) {
    invalidTask364();
  }
  return assertCurrentArtifactReference(projectRoot, path, artifact, kind);
}

function idFromArtifactPath(path: string): string | null {
  const parts = normalizeRelativePath(path).split("/");
  return parts.length >= 2 ? (parts.at(-2) ?? null) : null;
}

function assertArtifactIdMatchesPath(id: unknown, path: string): void {
  if (typeof id !== "string" || idFromArtifactPath(path) !== id) {
    invalidTask364();
  }
}

function assertOptionalArtifactIdMatchesPath(id: unknown, path: unknown, artifact: unknown): void {
  if (id === null && path === null && artifact === null) {
    return;
  }
  if (typeof id !== "string" || typeof path !== "string" || !isArtifactReference(artifact)) {
    invalidTask364();
  }
  assertArtifactIdMatchesPath(id, path);
}

function parseTask364(bytes: Buffer): PersistedTask364ClosureExecutionPackagingFollowThrough {
  try {
    return JSON.parse(bytes.toString("utf8")) as PersistedTask364ClosureExecutionPackagingFollowThrough;
  } catch {
    invalidTask364();
  }
}

function sanitizeBlockerReason(value: string, source: "task364" | "delegated"): string {
  const trimmed = value.trim();
  const sanitized = sanitizeActor(trimmed);
  if (sanitized !== trimmed || !/^[A-Za-z0-9_.:-]{1,220}$/u.test(trimmed)) {
    return source === "task364" ? "task364_blocker_reason_redacted" : "delegated_blocker_reason_redacted";
  }
  return trimmed;
}

function sanitizeBlockerReasons(values: string[], source: "task364" | "delegated"): string[] {
  return values.map((value) => sanitizeBlockerReason(value, source));
}

function readTask364Artifact(
  projectRoot: string,
  projectId: string,
  followThroughId: string,
  followThroughPath: string,
  expectedSha256: string
): {
  body: PersistedTask364ClosureExecutionPackagingFollowThrough;
  artifact: ArtifactReference;
  refs: {
    task362: ArtifactReference;
    task361: ArtifactReference;
    task356: ArtifactReference;
    task355: ArtifactReference;
    delegatedTask358: ArtifactReference | null;
  };
  blockerReasons: string[];
} {
  const absolutePath = assertPathAllowed(projectRoot, followThroughPath, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new ComathError("Goal 3 selected-tranche next closure execution packaging results follow-up Task364 artifact is missing", {
      statusCode: 404,
      code: errorCode("TASK364_MISSING")
    });
  }
  const bytes = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(bytes);
  if (actualSha256 !== expectedSha256) {
    throw new ComathError("Goal 3 selected-tranche next closure execution packaging results follow-up Task364 artifact is stale", {
      statusCode: 409,
      code: errorCode("STALE_TASK364")
    });
  }
  const body = parseTask364(bytes);
  if (
    body.schema_version !==
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through.v1" ||
    body.project_id !== projectId ||
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id !==
      followThroughId ||
    normalizeRelativePath(
      body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path
    ) !== followThroughPath ||
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
    typeof body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id !==
      "string" ||
    typeof body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path !==
      "string" ||
    typeof body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_path !==
      "string" ||
    typeof body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path !==
      "string" ||
    typeof body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path !==
      "string" ||
    !Array.isArray(body.blocker_reasons)
  ) {
    invalidTask364();
  }
  assertArtifactIdMatchesPath(
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id,
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path
  );
  assertArtifactIdMatchesPath(
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id,
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_path
  );
  assertArtifactIdMatchesPath(
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id,
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path
  );
  assertArtifactIdMatchesPath(
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id,
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path
  );
  assertOptionalArtifactIdMatchesPath(
    body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id,
    body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path,
    body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact
  );
  const refs = {
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
    delegatedTask358: assertOptionalCurrentArtifactReference(
      projectRoot,
      body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path,
      body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact,
      "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through"
    )
  };
  return {
    body,
    artifact: {
      kind: "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through",
      path: followThroughPath,
      sha256: actualSha256,
      size_bytes: bytes.byteLength
    },
    refs,
    blockerReasons: sanitizeBlockerReasons(assertStringArray(body.blocker_reasons), "task364")
  };
}

function callerProofOrGaMaterialPresent(
  input: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUpInput
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

function artifactForDelegatedTask359(
  projectRoot: string,
  delegated: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp
): ArtifactReference {
  return artifactForProjectFile(
    projectRoot,
    delegated.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path,
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up"
  );
}

export function recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp(
  projectRoot: string,
  input: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUpInput
): Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp {
  const projectId = assertSafeId(input.project_id, "project_id");
  const followUpId = assertSafeId(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id,
    "selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id"
  );
  const task364Id = assertSafeId(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id,
    "selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id"
  );
  const task364Sha256 = assertSha256(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_sha256
  );
  const task364RelativePath = assertTask364InputPath(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path,
    task364Id
  );
  const requestedMode =
    input.requested_follow_up_mode ??
    "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up";
  if (
    requestedMode !==
    "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up"
  ) {
    throw new ComathError("Goal 3 selected-tranche next closure execution packaging results follow-up mode is invalid", {
      statusCode: 400,
      code: errorCode("INVALID_MODE")
    });
  }
  const outputPath = followUpPath(followUpId);
  const absoluteOutputPath = assertPathAllowed(projectRoot, outputPath, { purpose: "runtime-write" });
  if (existsSync(absoluteOutputPath)) {
    throw new ComathError("Goal 3 selected-tranche next closure execution packaging results follow-up already exists", {
      statusCode: 409,
      code: errorCode("ALREADY_EXISTS")
    });
  }

  const task364 = readTask364Artifact(projectRoot, projectId, task364Id, task364RelativePath, task364Sha256);
  const actor = sanitizeActor(input.actor);
  const callerAuthorityMaterialIgnored = callerProofOrGaMaterialPresent(input);
  let delegated: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp | null =
    null;
  if (task364.refs.delegatedTask358) {
    const delegatedId = `G3-T365-T359-${shortIdSuffix(followUpId)}`;
    const delegatedInput = {
      project_id: projectId,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id:
        delegatedId,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
        task364.body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id as string,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path:
        task364.refs.delegatedTask358.path,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_sha256:
        task364.refs.delegatedTask358.sha256,
      actor,
      requested_follow_up_mode:
        "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up"
    } satisfies Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUpInput;
    delegated =
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp(
        projectRoot,
        delegatedInput
      );
    if (
      delegated.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id !==
        task364.body
          .delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id ||
      normalizeRelativePath(
        delegated.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path
      ) !== task364.refs.delegatedTask358.path ||
      !artifactReferencesEqual(
        delegated.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact,
        task364.refs.delegatedTask358
      )
    ) {
      throw new ComathError("Goal 3 selected-tranche next closure execution packaging results follow-up delegated Task359 material is inconsistent", {
        statusCode: 409,
        code: errorCode("TASK359_DELEGATED_MISMATCH")
      });
    }
  }

  const delegatedArtifact = delegated ? artifactForDelegatedTask359(projectRoot, delegated) : null;
  const blockerReasons = uniqueStrings([
    ...task364.blockerReasons,
    ...(delegated ? sanitizeBlockerReasons(delegated.blocker_reasons, "delegated") : ["task364_not_ready_for_packaging_results_follow_up"]),
    ...(callerAuthorityMaterialIgnored ? ["caller_proof_or_ga_authority_material_ignored"] : [])
  ]);
  const body = {
    schema_version:
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up.v1",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id:
      followUpId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    ok: delegated?.ok ?? false,
    follow_up_status: delegated
      ? delegated.ok
        ? "next_closure_execution_packaging_results_selected_tranche_packaging_results_current_for_proof_breadth_closure_recheck"
        : "blocked_next_closure_execution_packaging_results_selected_tranche_packaging_results_incomplete"
      : "blocked_next_closure_execution_packaging_results_closure_execution_packaging_not_ready_for_packaging_results_follow_up",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path:
      outputPath,
    requested_follow_up_mode:
      "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
      task364Id,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path:
      task364RelativePath,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact:
      task364.artifact,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
      task364.body
        .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path:
      task364.refs.task362.path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact:
      task364.refs.task362,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id:
      task364.body
        .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_path:
      task364.refs.task361.path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_artifact:
      task364.refs.task361,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
      task364.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path:
      task364.refs.task356.path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact:
      task364.refs.task356,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id:
      task364.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path:
      task364.refs.task355.path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact:
      task364.refs.task355,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
      task364.body
        .delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path:
      task364.refs.delegatedTask358?.path ?? null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact:
      task364.refs.delegatedTask358,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id:
      delegated?.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id ??
      null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path:
      delegated?.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path ??
      null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact:
      delegatedArtifact,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id:
      delegated?.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id ?? null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_path:
      delegated?.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_path ?? null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_artifact:
      delegated?.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_artifact ?? null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id:
      delegated?.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id ??
      null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_path:
      delegated?.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_path ??
      null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_artifact:
      delegated?.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_artifact ??
      null,
    delegated_selected_tranche_next_closure_packaging_results_follow_up_id:
      delegated?.delegated_selected_tranche_next_closure_packaging_results_follow_up_id ?? null,
    delegated_selected_tranche_next_closure_packaging_results_follow_up_path:
      delegated?.delegated_selected_tranche_next_closure_packaging_results_follow_up_path ?? null,
    delegated_selected_tranche_next_closure_packaging_results_follow_up_artifact:
      delegated?.delegated_selected_tranche_next_closure_packaging_results_follow_up_artifact ?? null,
    selected_tranche_next_packaging_results_follow_up_id: delegated?.selected_tranche_next_packaging_results_follow_up_id ?? null,
    selected_tranche_next_packaging_results_follow_up_path:
      delegated?.selected_tranche_next_packaging_results_follow_up_path ?? null,
    selected_tranche_next_packaging_results_follow_up_artifact:
      delegated?.selected_tranche_next_packaging_results_follow_up_artifact ?? null,
    selected_tranche_next_closure_packaging_follow_through_id:
      delegated?.selected_tranche_next_closure_packaging_follow_through_id ?? null,
    selected_tranche_next_closure_packaging_follow_through_path:
      delegated?.selected_tranche_next_closure_packaging_follow_through_path ?? null,
    selected_tranche_next_closure_packaging_follow_through_artifact:
      delegated?.selected_tranche_next_closure_packaging_follow_through_artifact ?? null,
    selected_tranche_next_packaging_follow_through_id: delegated?.selected_tranche_next_packaging_follow_through_id ?? null,
    selected_tranche_next_packaging_follow_through_path: delegated?.selected_tranche_next_packaging_follow_through_path ?? null,
    selected_tranche_next_packaging_follow_through_artifact:
      delegated?.selected_tranche_next_packaging_follow_through_artifact ?? null,
    task_local_packaging_follow_through_id: delegated?.task_local_packaging_follow_through_id ?? null,
    task_local_packaging_follow_through_path: delegated?.task_local_packaging_follow_through_path ?? null,
    task_local_packaging_follow_through_artifact: delegated?.task_local_packaging_follow_through_artifact ?? null,
    proof_breadth_execution_follow_through_id: delegated?.proof_breadth_execution_follow_through_id ?? null,
    proof_breadth_execution_follow_through_path: delegated?.proof_breadth_execution_follow_through_path ?? null,
    proof_breadth_execution_follow_through_artifact: delegated?.proof_breadth_execution_follow_through_artifact ?? null,
    blocker_reasons: blockerReasons,
    selected_task_count: delegated?.selected_task_count ?? 0,
    verified_selected_task_count: delegated?.verified_selected_task_count ?? 0,
    missing_selected_task_count: delegated?.missing_selected_task_count ?? 0,
    blocked_selected_task_count: delegated?.blocked_selected_task_count ?? 0,
    selected_task_ids: delegated?.selected_task_ids ?? [],
    verified_selected_task_ids: delegated?.verified_selected_task_ids ?? [],
    missing_selected_task_ids: delegated?.missing_selected_task_ids ?? [],
    blocked_selected_task_ids: delegated?.blocked_selected_task_ids ?? [],
    selected_packaging_report_artifacts: delegated?.selected_packaging_report_artifacts ?? [],
    selected_packaging_report_artifacts_current: delegated?.selected_packaging_report_artifacts_current ?? false,
    ready_for_proof_breadth_closure_recheck: delegated?.ready_for_proof_breadth_closure_recheck ?? false,
    proof_breadth_complete: false,
    final_ga_audit_unblocked: false,
    runs_lean: false,
    executes_proofs: false,
    accepts_caller_success_metadata: false,
    accepts_caller_proof_material: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    ga_certification_gate_separate: true
  } satisfies Omit<
    Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp,
    "selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact"
  >;

  const text = `${JSON.stringify(body, null, 2)}\n`;
  mkdirSync(dirname(absoluteOutputPath), { recursive: true });
  writeFileSync(absoluteOutputPath, text, "utf8");
  const result: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp =
    {
      ...body,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact:
        {
          kind: "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up",
          path: outputPath,
          sha256: sha256Text(text),
          size_bytes: Buffer.byteLength(text, "utf8")
        }
    };

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type:
      "release.goal3_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_recorded",
    actor,
    target_id: projectId,
    payload: {
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id:
        followUpId,
      follow_up_status: result.follow_up_status,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path:
        outputPath,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact_sha256:
        result
          .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact
          .sha256,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
        task364Id,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact_sha256:
        task364.artifact.sha256,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
        result.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact_sha256:
        result
          .delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact
          ?.sha256 ?? null,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id:
        result
          .delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact_sha256:
        result
          .delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact
          ?.sha256 ?? null,
      selected_task_ids: result.selected_task_ids,
      verified_selected_task_count: result.verified_selected_task_count,
      missing_selected_task_count: result.missing_selected_task_count,
      blocked_selected_task_count: result.blocked_selected_task_count,
      ready_for_proof_breadth_closure_recheck: result.ready_for_proof_breadth_closure_recheck,
      blocker_reasons: result.blocker_reasons,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  });
  return result;
}
