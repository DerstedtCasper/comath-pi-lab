import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { assertPathAllowed } from "../security/path-policy.js";
import {
  createGoal3GaPositiveTaskManifest,
  runGoal3GaPositiveMatrixBatch,
  type Goal3GaPositiveMatrixBatchReport,
  type Goal3GaPositiveTaskManifest
} from "./goal3-ga-acceptance.js";

type ArtifactReference = {
  kind: string;
  path: string;
  sha256: string;
  size_bytes: number;
};

type CategoryCount = {
  category: string;
  task_count: number;
  proof_authority: "none";
};

export type Goal3ReleaseCandidateProofBreadthReviewInput = {
  project_id: string;
  proof_breadth_review_id?: string;
  actor?: string;
  requested_review_mode?: "open_formal_workbench_release_candidate_proof_breadth";
  proof_breadth_matrix?: unknown;
  proof_breadth_matrix_path?: unknown;
  proof_breadth_matrix_sha256?: unknown;
};

export type Goal3ReleaseCandidateProofBreadthReview = {
  schema_version: "comath.goal3_release_candidate_proof_breadth_review.v1";
  proof_breadth_review_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  ok: false;
  proof_breadth_status: "blocked_positive_matrix_release_candidate_proof_breadth_incomplete";
  proof_breadth_review_path: string;
  requested_review_mode: "open_formal_workbench_release_candidate_proof_breadth";
  blocker_reasons: string[];
  total_required_tasks: 100;
  task_manifest_count: number;
  reviewed_task_count: number;
  clean_replay_passed_count: number;
  replayable_blocker_count: number;
  promoted_count: 0;
  category_counts: CategoryCount[];
  positive_task_manifest_path: string;
  positive_task_manifest_artifact: ArtifactReference;
  positive_task_manifest_current: true;
  positive_matrix_batch_path: string;
  positive_matrix_batch_artifact: ArtifactReference;
  positive_matrix_batch_current: true;
  proof_breadth_complete: false;
  final_ga_audit_unblocked: false;
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
  ga_certification_gate_separate: true;
  proof_breadth_review_artifact: ArtifactReference;
};

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function proofBreadthReviewBase(reviewId: string): string {
  return normalizeRelativePath(join(".comath", "release", "goal3-proof-breadth", reviewId));
}

function proofBreadthReviewPath(reviewId: string): string {
  return normalizeRelativePath(join(proofBreadthReviewBase(reviewId), "review.json"));
}

function positiveTaskManifestPath(reviewId: string): string {
  return normalizeRelativePath(join(proofBreadthReviewBase(reviewId), "positive-task-manifest.json"));
}

function positiveMatrixBatchPath(reviewId: string): string {
  return normalizeRelativePath(join(proofBreadthReviewBase(reviewId), "positive-matrix-batch.json"));
}

function sha256Text(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function assertSafeId(value: string | undefined, label: string): string {
  const id = typeof value === "string" ? value.trim() : "";
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,120}$/u.test(id)) {
    throw new ComathError(`${label} is invalid`, {
      statusCode: 400,
      code: "GOAL3_PROOF_BREADTH_REVIEW_INVALID_ID"
    });
  }
  return id;
}

function sanitizeActor(value: string | undefined): string {
  return (value ?? "goal3-proof-breadth-review")
    .replace(/(?:[A-Za-z]:[\\/][^\s"']+|\\\\[^\s"']+)/gu, "[redacted-path]")
    .replace(/(?:Authorization:\s*Bearer\s+\S+|api_key=\S+|token=\S+|sk-[A-Za-z0-9_-]+)/giu, "[redacted-secret]")
    .replace(
      /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|kernel_checked|proof_success|GA certified|can_certify_ga\s*[:=]\s*(?:true|1)|can_promote_claim\s*[:=]\s*(?:true|1))\b/giu,
      "[redacted-authority-claim]"
    )
    .slice(0, 400);
}

function writeJsonArtifact(
  projectRoot: string,
  path: string,
  kind: string,
  value: unknown
): ArtifactReference {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  const absolutePath = assertPathAllowed(projectRoot, path, { purpose: "runtime-write" });
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, text, "utf8");
  return {
    kind,
    path,
    sha256: sha256Text(text),
    size_bytes: Buffer.byteLength(text, "utf8")
  };
}

function categoryCounts(manifest: Goal3GaPositiveTaskManifest): CategoryCount[] {
  const counts = new Map<string, number>();
  for (const task of manifest.tasks) {
    counts.set(task.category, (counts.get(task.category) ?? 0) + 1);
  }
  return [...counts.entries()].map(([category, taskCount]) => ({
    category,
    task_count: taskCount,
    proof_authority: "none"
  }));
}

function callerProofBreadthMaterialPresent(input: Goal3ReleaseCandidateProofBreadthReviewInput): boolean {
  return (
    input.proof_breadth_matrix !== undefined ||
    input.proof_breadth_matrix_path !== undefined ||
    input.proof_breadth_matrix_sha256 !== undefined
  );
}

function assertBatchBoundary(batch: Goal3GaPositiveMatrixBatchReport): void {
  if (
    batch.schema_version !== "comath.goal3_positive_matrix_batch.v1" ||
    batch.total_required_tasks !== 100 ||
    batch.results.length !== 100 ||
    batch.summary.clean_replay_passed !== 0 ||
    batch.summary.replayable_blocker !== 100 ||
    batch.summary.promoted_count !== 0 ||
    batch.results.some((result) => result.proof_authority !== "none" || result.can_promote_claim !== false)
  ) {
    throw new ComathError("Goal 3 proof-breadth review positive matrix batch violates boundaries", {
      statusCode: 500,
      code: "GOAL3_PROOF_BREADTH_REVIEW_INTERNAL_BATCH_INVALID"
    });
  }
}

export function recordGoal3ReleaseCandidateProofBreadthReview(
  projectRoot: string,
  input: Goal3ReleaseCandidateProofBreadthReviewInput
): Goal3ReleaseCandidateProofBreadthReview {
  const projectId = assertSafeId(input.project_id, "project_id");
  const reviewId = assertSafeId(input.proof_breadth_review_id, "proof_breadth_review_id");
  const requestedMode = input.requested_review_mode ?? "open_formal_workbench_release_candidate_proof_breadth";
  if (requestedMode !== "open_formal_workbench_release_candidate_proof_breadth") {
    throw new ComathError("Goal 3 proof-breadth review mode is invalid", {
      statusCode: 400,
      code: "GOAL3_PROOF_BREADTH_REVIEW_INVALID_MODE"
    });
  }

  const reviewPath = proofBreadthReviewPath(reviewId);
  const absoluteReviewPath = assertPathAllowed(projectRoot, reviewPath, { purpose: "runtime-write" });
  if (existsSync(absoluteReviewPath)) {
    throw new ComathError("Goal 3 proof-breadth review already exists", {
      statusCode: 409,
      code: "GOAL3_PROOF_BREADTH_REVIEW_ALREADY_EXISTS"
    });
  }

  const manifest = createGoal3GaPositiveTaskManifest();
  const batch = runGoal3GaPositiveMatrixBatch({ projectRoot, batchSize: manifest.tasks.length });
  assertBatchBoundary(batch);

  const manifestPath = positiveTaskManifestPath(reviewId);
  const batchPath = positiveMatrixBatchPath(reviewId);
  const manifestArtifact = writeJsonArtifact(projectRoot, manifestPath, "goal3_positive_task_manifest", manifest);
  const batchArtifact = writeJsonArtifact(projectRoot, batchPath, "goal3_positive_matrix_batch", batch);
  const blockerReasons = [
    "positive_matrix_release_candidate_proof_breadth_incomplete",
    "positive_matrix_task_local_clean_replay_missing",
    ...(callerProofBreadthMaterialPresent(input) ? ["caller_proof_breadth_material_ignored"] : [])
  ];
  const body = {
    schema_version: "comath.goal3_release_candidate_proof_breadth_review.v1",
    proof_breadth_review_id: reviewId,
    project_id: projectId,
    actor: sanitizeActor(input.actor),
    created_at: new Date().toISOString(),
    ok: false,
    proof_breadth_status: "blocked_positive_matrix_release_candidate_proof_breadth_incomplete",
    proof_breadth_review_path: reviewPath,
    requested_review_mode: "open_formal_workbench_release_candidate_proof_breadth",
    blocker_reasons: blockerReasons,
    total_required_tasks: 100,
    task_manifest_count: manifest.tasks.length,
    reviewed_task_count: batch.results.length,
    clean_replay_passed_count: batch.summary.clean_replay_passed,
    replayable_blocker_count: batch.summary.replayable_blocker,
    promoted_count: 0,
    category_counts: categoryCounts(manifest),
    positive_task_manifest_path: manifestPath,
    positive_task_manifest_artifact: manifestArtifact,
    positive_task_manifest_current: true,
    positive_matrix_batch_path: batchPath,
    positive_matrix_batch_artifact: batchArtifact,
    positive_matrix_batch_current: true,
    proof_breadth_complete: false,
    final_ga_audit_unblocked: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    ga_certification_gate_separate: true
  } satisfies Omit<Goal3ReleaseCandidateProofBreadthReview, "proof_breadth_review_artifact">;

  const reviewArtifact = writeJsonArtifact(projectRoot, reviewPath, "goal3_release_candidate_proof_breadth_review", body);
  const result: Goal3ReleaseCandidateProofBreadthReview = {
    ...body,
    proof_breadth_review_artifact: reviewArtifact
  };

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.goal3_proof_breadth_review_recorded",
    actor: body.actor,
    target_id: projectId,
    payload: {
      proof_breadth_review_id: reviewId,
      proof_breadth_status: result.proof_breadth_status,
      proof_breadth_review_path: reviewPath,
      proof_breadth_review_artifact_sha256: reviewArtifact.sha256,
      positive_task_manifest_artifact_sha256: manifestArtifact.sha256,
      positive_matrix_batch_artifact_sha256: batchArtifact.sha256,
      total_required_tasks: result.total_required_tasks,
      clean_replay_passed_count: result.clean_replay_passed_count,
      replayable_blocker_count: result.replayable_blocker_count,
      blocker_reasons: blockerReasons,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  });
  return result;
}
