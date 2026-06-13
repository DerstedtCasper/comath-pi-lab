import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { assertPathAllowed } from "../security/path-policy.js";
import {
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsFollowUp,
  type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsFollowUp,
  type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsFollowUpInput
} from "./goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-follow-up.js";
import type { Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough } from "./goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-follow-through.js";

type ArtifactReference = {
  kind: string;
  path: string;
  sha256: string;
  size_bytes: number;
};

type PersistedTask358ClosureExecutionPackagingFollowThrough = Omit<
  Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough,
  "selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact"
>;

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUpInput = {
  project_id: string;
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id?: string;
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id: string;
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path: string;
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_sha256: string;
  actor?: string;
  requested_follow_up_mode?: "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up";
};

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp = {
  schema_version: "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up.v1";
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  ok: boolean;
  follow_up_status:
    | "next_closure_execution_packaging_selected_tranche_packaging_results_current_for_proof_breadth_closure_recheck"
    | "blocked_next_closure_execution_packaging_selected_tranche_packaging_results_incomplete";
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path: string;
  requested_follow_up_mode: "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up";
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id: string;
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path: string;
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact: ArtifactReference;
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id: string;
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path: string;
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact: ArtifactReference;
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id: string;
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path: string;
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact: ArtifactReference;
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id: string;
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_path: string;
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_artifact: ArtifactReference;
  delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id: string;
  delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_path: string;
  delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_artifact: ArtifactReference;
  delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id: string;
  delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_path: string;
  delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_artifact: ArtifactReference;
  delegated_selected_tranche_next_closure_packaging_results_follow_up_id: string;
  delegated_selected_tranche_next_closure_packaging_results_follow_up_path: string;
  delegated_selected_tranche_next_closure_packaging_results_follow_up_artifact: ArtifactReference;
  selected_tranche_next_packaging_results_follow_up_id: string;
  selected_tranche_next_packaging_results_follow_up_path: string;
  selected_tranche_next_packaging_results_follow_up_artifact: ArtifactReference;
  selected_tranche_next_closure_packaging_follow_through_id: string;
  selected_tranche_next_closure_packaging_follow_through_path: string;
  selected_tranche_next_closure_packaging_follow_through_artifact: ArtifactReference;
  selected_tranche_next_packaging_follow_through_id: string;
  selected_tranche_next_packaging_follow_through_path: string;
  selected_tranche_next_packaging_follow_through_artifact: ArtifactReference;
  task_local_packaging_follow_through_id: string;
  task_local_packaging_follow_through_path: string;
  task_local_packaging_follow_through_artifact: ArtifactReference;
  proof_breadth_execution_follow_through_id: string;
  proof_breadth_execution_follow_through_path: string;
  proof_breadth_execution_follow_through_artifact: ArtifactReference;
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
  selected_packaging_report_artifacts_current: true;
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
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact: ArtifactReference;
};

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function followUpPath(followUpId: string): string {
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

function task358Path(followThroughId: string): string {
  return normalizeRelativePath(
    join(
      ".comath",
      "release",
      "goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-follow-through",
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
  return `GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_FOLLOW_UP_${suffix}`;
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
    throw new ComathError("Goal 3 selected-tranche next closure execution packaging results closure execution packaging results follow-up hash is invalid", {
      statusCode: 400,
      code: errorCode("INVALID_HASH")
    });
  }
  return sha256;
}

function assertTask358InputPath(path: string | undefined, followThroughId: string): string {
  const normalizedInputPath = normalizeRelativePath(typeof path === "string" ? path.trim() : "");
  const expectedPath = task358Path(followThroughId);
  if (normalizedInputPath !== expectedPath) {
    throw new ComathError("Goal 3 selected-tranche next closure execution packaging results follow-up Task358 path mismatch", {
      statusCode: 400,
      code: errorCode("TASK358_PATH_MISMATCH")
    });
  }
  return expectedPath;
}

function sanitizeActor(actor: string | undefined): string {
  const text =
    typeof actor === "string" && actor.trim().length > 0
      ? actor.trim()
      : "goal3-selected-tranche-next-closure-execution-packaging-results-closure-execution-packaging-results-follow-up";
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

function invalidTask358(): never {
  throw new ComathError("Goal 3 selected-tranche next closure execution packaging results follow-up Task358 artifact is invalid", {
    statusCode: 400,
    code: errorCode("INVALID_TASK358")
  });
}

function assertStringArray(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    invalidTask358();
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
    invalidTask358();
  }
  let current: ArtifactReference;
  try {
    current = artifactForProjectFile(projectRoot, path, kind);
  } catch {
    invalidTask358();
  }
  if (!artifactReferencesEqual(artifact, current)) {
    invalidTask358();
  }
  return current;
}

function parseTask358(bytes: Buffer): PersistedTask358ClosureExecutionPackagingFollowThrough {
  try {
    return JSON.parse(bytes.toString("utf8")) as PersistedTask358ClosureExecutionPackagingFollowThrough;
  } catch {
    invalidTask358();
  }
}

function readTask358Artifact(
  projectRoot: string,
  projectId: string,
  followThroughId: string,
  followThroughPath: string,
  expectedSha256: string
): {
  body: PersistedTask358ClosureExecutionPackagingFollowThrough;
  artifact: ArtifactReference;
  delegatedTask352: ArtifactReference;
  copiedTask356: ArtifactReference;
  copiedTask355: ArtifactReference;
  copiedTask353: ArtifactReference;
  task358BlockerReasons: string[];
} {
  const absolutePath = assertPathAllowed(projectRoot, followThroughPath, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new ComathError("Goal 3 selected-tranche next closure execution packaging results follow-up Task358 artifact is missing", {
      statusCode: 404,
      code: errorCode("TASK358_MISSING")
    });
  }
  const bytes = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(bytes);
  if (actualSha256 !== expectedSha256) {
    throw new ComathError("Goal 3 selected-tranche next closure execution packaging results follow-up Task358 artifact is stale", {
      statusCode: 409,
      code: errorCode("STALE_TASK358")
    });
  }
  const body = parseTask358(bytes);
  if (
    body.schema_version !==
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through.v1" ||
    body.project_id !== projectId ||
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id !==
      followThroughId ||
    normalizeRelativePath(
      body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path
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
    typeof body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id !==
      "string" ||
    typeof body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_path !==
      "string" ||
    !isArtifactReference(body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_artifact) ||
    !Array.isArray(body.selected_task_ids) ||
    !Array.isArray(body.blocker_reasons)
  ) {
    invalidTask358();
  }
  const delegatedTask352 = assertCurrentArtifactReference(
    projectRoot,
    body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_path,
    body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_artifact,
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through"
  );
  const copiedTask356 = assertCurrentArtifactReference(
    projectRoot,
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path,
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact,
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge"
  );
  const copiedTask355 = assertCurrentArtifactReference(
    projectRoot,
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path,
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact,
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck"
  );
  const copiedTask353 = assertCurrentArtifactReference(
    projectRoot,
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_path,
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_artifact,
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up"
  );
  return {
    body,
    artifact: {
      kind: "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through",
      path: followThroughPath,
      sha256: actualSha256,
      size_bytes: bytes.byteLength
    },
    delegatedTask352,
    copiedTask356,
    copiedTask355,
    copiedTask353,
    task358BlockerReasons: sanitizeBlockerReasons(assertStringArray(body.blocker_reasons), "task358")
  };
}

function callerProofOrGaMaterialPresent(
  input: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUpInput
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

function sanitizeBlockerReason(value: string, source: "task358" | "delegated"): string {
  const trimmed = value.trim();
  const sanitized = sanitizeActor(trimmed);
  if (sanitized !== trimmed || !/^[A-Za-z0-9_.:-]{1,200}$/u.test(trimmed)) {
    return source === "task358" ? "task358_blocker_reason_redacted" : "delegated_blocker_reason_redacted";
  }
  return trimmed;
}

function sanitizeBlockerReasons(values: string[], source: "task358" | "delegated"): string[] {
  return values.map((value) => sanitizeBlockerReason(value, source));
}

function artifactForDelegatedTask353(
  projectRoot: string,
  delegated: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsFollowUp
): ArtifactReference {
  return artifactForProjectFile(
    projectRoot,
    delegated.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_path,
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up"
  );
}

export function recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp(
  projectRoot: string,
  input: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUpInput
): Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp {
  const projectId = assertSafeId(input.project_id, "project_id");
  const followUpId = assertSafeId(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id,
    "selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id"
  );
  const task358Id = assertSafeId(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id,
    "selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id"
  );
  const task358Sha256 = assertSha256(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_sha256
  );
  const task358RelativePath = assertTask358InputPath(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path,
    task358Id
  );
  const requestedMode =
    input.requested_follow_up_mode ??
    "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up";
  if (
    requestedMode !==
    "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up"
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

  const task358 = readTask358Artifact(projectRoot, projectId, task358Id, task358RelativePath, task358Sha256);
  const actor = sanitizeActor(input.actor);
  const delegatedId = `G3-T359-T353-${shortIdSuffix(followUpId)}`;
  const delegatedInput = {
    project_id: projectId,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id: delegatedId,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id:
      task358.body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_path:
      task358.body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_sha256:
      task358.delegatedTask352.sha256,
    actor,
    requested_follow_up_mode:
      "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up"
  } satisfies Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsFollowUpInput;
  const delegated = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsFollowUp(
    projectRoot,
    delegatedInput
  );
  if (
    delegated.selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id !==
      task358.body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id ||
    normalizeRelativePath(delegated.selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_path) !==
      normalizeRelativePath(
        task358.body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_path
      ) ||
    !artifactReferencesEqual(
      delegated.selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_artifact,
      task358.delegatedTask352
    )
  ) {
    throw new ComathError(
      "Goal 3 selected-tranche next closure execution packaging results follow-up delegated Task353 material is inconsistent",
      {
        statusCode: 409,
        code: errorCode("TASK353_DELEGATED_MISMATCH")
      }
    );
  }
  const delegatedArtifact = artifactForDelegatedTask353(projectRoot, delegated);
  const callerAuthorityMaterialIgnored = callerProofOrGaMaterialPresent(input);
  const blockerReasons = uniqueStrings([
    ...task358.task358BlockerReasons,
    ...sanitizeBlockerReasons(delegated.blocker_reasons, "delegated"),
    ...(callerAuthorityMaterialIgnored ? ["caller_proof_or_ga_authority_material_ignored"] : [])
  ]);
  const body = {
    schema_version:
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up.v1",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id:
      followUpId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    ok: delegated.ok,
    follow_up_status: delegated.ok
      ? "next_closure_execution_packaging_selected_tranche_packaging_results_current_for_proof_breadth_closure_recheck"
      : "blocked_next_closure_execution_packaging_selected_tranche_packaging_results_incomplete",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path:
      outputPath,
    requested_follow_up_mode:
      "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
      task358Id,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path:
      task358RelativePath,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact:
      task358.artifact,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
      task358.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path:
      task358.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact:
      task358.copiedTask356,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id:
      task358.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path:
      task358.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact:
      task358.copiedTask355,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id:
      task358.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_path:
      task358.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_artifact:
      task358.copiedTask353,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id:
      task358.body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_path:
      task358.body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_path,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_artifact:
      task358.delegatedTask352,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id:
      delegated.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_path:
      delegated.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_path,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_artifact:
      delegatedArtifact,
    delegated_selected_tranche_next_closure_packaging_results_follow_up_id:
      delegated.delegated_selected_tranche_next_closure_packaging_results_follow_up_id,
    delegated_selected_tranche_next_closure_packaging_results_follow_up_path:
      delegated.delegated_selected_tranche_next_closure_packaging_results_follow_up_path,
    delegated_selected_tranche_next_closure_packaging_results_follow_up_artifact:
      delegated.delegated_selected_tranche_next_closure_packaging_results_follow_up_artifact,
    selected_tranche_next_packaging_results_follow_up_id:
      delegated.selected_tranche_next_packaging_results_follow_up_id,
    selected_tranche_next_packaging_results_follow_up_path:
      delegated.selected_tranche_next_packaging_results_follow_up_path,
    selected_tranche_next_packaging_results_follow_up_artifact:
      delegated.selected_tranche_next_packaging_results_follow_up_artifact,
    selected_tranche_next_closure_packaging_follow_through_id:
      delegated.selected_tranche_next_closure_packaging_follow_through_id,
    selected_tranche_next_closure_packaging_follow_through_path:
      delegated.selected_tranche_next_closure_packaging_follow_through_path,
    selected_tranche_next_closure_packaging_follow_through_artifact:
      delegated.selected_tranche_next_closure_packaging_follow_through_artifact,
    selected_tranche_next_packaging_follow_through_id: delegated.selected_tranche_next_packaging_follow_through_id,
    selected_tranche_next_packaging_follow_through_path: delegated.selected_tranche_next_packaging_follow_through_path,
    selected_tranche_next_packaging_follow_through_artifact:
      delegated.selected_tranche_next_packaging_follow_through_artifact,
    task_local_packaging_follow_through_id: delegated.task_local_packaging_follow_through_id,
    task_local_packaging_follow_through_path: delegated.task_local_packaging_follow_through_path,
    task_local_packaging_follow_through_artifact: delegated.task_local_packaging_follow_through_artifact,
    proof_breadth_execution_follow_through_id: delegated.proof_breadth_execution_follow_through_id,
    proof_breadth_execution_follow_through_path: delegated.proof_breadth_execution_follow_through_path,
    proof_breadth_execution_follow_through_artifact: delegated.proof_breadth_execution_follow_through_artifact,
    blocker_reasons: blockerReasons,
    selected_task_count: delegated.selected_task_count,
    verified_selected_task_count: delegated.verified_selected_task_count,
    missing_selected_task_count: delegated.missing_selected_task_count,
    blocked_selected_task_count: delegated.blocked_selected_task_count,
    selected_task_ids: delegated.selected_task_ids,
    verified_selected_task_ids: delegated.verified_selected_task_ids,
    missing_selected_task_ids: delegated.missing_selected_task_ids,
    blocked_selected_task_ids: delegated.blocked_selected_task_ids,
    selected_packaging_report_artifacts: delegated.selected_packaging_report_artifacts,
    selected_packaging_report_artifacts_current: delegated.selected_packaging_report_artifacts_current,
    ready_for_proof_breadth_closure_recheck: delegated.ready_for_proof_breadth_closure_recheck,
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
    Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp,
    "selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact"
  >;

  const text = `${JSON.stringify(body, null, 2)}\n`;
  mkdirSync(dirname(absoluteOutputPath), { recursive: true });
  writeFileSync(absoluteOutputPath, text, "utf8");
  const result: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp =
    {
      ...body,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact:
        {
          kind: "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up",
          path: outputPath,
          sha256: sha256Text(text),
          size_bytes: Buffer.byteLength(text, "utf8")
        }
    };

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type:
      "release.goal3_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_recorded",
    actor,
    target_id: projectId,
    payload: {
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id:
        followUpId,
      follow_up_status: result.follow_up_status,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path:
        outputPath,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact_sha256:
        result
          .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact
          .sha256,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
        task358Id,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact_sha256:
        task358.artifact.sha256,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id:
        result.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_artifact_sha256:
        result.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_artifact
          .sha256,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id:
        result.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_artifact_sha256:
        result.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_artifact
          .sha256,
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
