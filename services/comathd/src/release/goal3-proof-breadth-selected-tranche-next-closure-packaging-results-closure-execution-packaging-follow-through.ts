import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { assertPathAllowed } from "../security/path-policy.js";
import {
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingFollowThrough,
  type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingFollowThrough,
  type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingFollowThroughInput
} from "./goal3-proof-breadth-selected-tranche-next-closure-packaging-follow-through.js";
import type { Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionBridge } from "./goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-bridge.js";

type ArtifactReference = {
  kind: string;
  path: string;
  sha256: string;
  size_bytes: number;
};

type EvidenceByTaskId = NonNullable<Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingFollowThroughInput["evidence_by_task_id"]>;

type PersistedTask350ClosureExecutionBridge = Omit<
  Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionBridge,
  "selected_tranche_next_closure_packaging_results_closure_execution_bridge_artifact"
>;

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingFollowThroughInput = {
  project_id: string;
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id?: string;
  selected_tranche_next_closure_packaging_results_closure_execution_bridge_id: string;
  selected_tranche_next_closure_packaging_results_closure_execution_bridge_path: string;
  selected_tranche_next_closure_packaging_results_closure_execution_bridge_sha256: string;
  selected_tranche_next_closure_packaging_follow_through_id?: string;
  selected_tranche_next_packaging_follow_through_id?: string;
  task_local_packaging_follow_through_id?: string;
  claim_id_prefix?: string;
  evidence_by_task_id?: EvidenceByTaskId;
  actor?: string;
  requested_follow_through_mode?: "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through";
};

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingFollowThrough = {
  schema_version: "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through.v1";
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  ok: boolean;
  follow_through_status:
    | "next_selected_tranche_task_local_packaging_verified"
    | "blocked_next_selected_tranche_task_local_packaging_incomplete";
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_path: string;
  requested_follow_through_mode: "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through";
  selected_tranche_next_closure_packaging_results_closure_execution_bridge_id: string;
  selected_tranche_next_closure_packaging_results_closure_execution_bridge_path: string;
  selected_tranche_next_closure_packaging_results_closure_execution_bridge_artifact: ArtifactReference;
  delegated_selected_tranche_next_closure_execution_bridge_id: string;
  delegated_selected_tranche_next_closure_execution_bridge_path: string;
  delegated_selected_tranche_next_closure_execution_bridge_artifact: ArtifactReference;
  delegated_selected_tranche_next_execution_bridge_id: string;
  delegated_selected_tranche_next_execution_bridge_path: string;
  delegated_selected_tranche_next_execution_bridge_artifact: ArtifactReference;
  selected_tranche_next_closure_packaging_follow_through_id: string;
  selected_tranche_next_closure_packaging_follow_through_path: string;
  selected_tranche_next_closure_packaging_follow_through_artifact: ArtifactReference;
  selected_tranche_next_packaging_follow_through_id: string;
  selected_tranche_next_packaging_follow_through_path: string;
  selected_tranche_next_packaging_follow_through_artifact: ArtifactReference;
  task_local_packaging_follow_through_id: string;
  task_local_packaging_follow_through_path: string;
  task_local_packaging_follow_through_artifact: ArtifactReference;
  task_local_packaging_follow_through_status: string;
  claim_id_prefix: string;
  blocker_reasons: string[];
  selected_task_count: number;
  verified_selected_task_count: number;
  blocked_selected_task_count: number;
  written_packaging_report_count: number;
  selected_task_ids: string[];
  verified_selected_task_ids: string[];
  blocked_selected_task_ids: string[];
  selected_packaging_report_artifacts: ArtifactReference[];
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
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_artifact: ArtifactReference;
};

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function followThroughPath(followThroughId: string): string {
  return normalizeRelativePath(
    join(
      ".comath",
      "release",
      "goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-follow-through",
      followThroughId,
      "follow-through.json"
    )
  );
}

function task350Path(bridgeId: string): string {
  return normalizeRelativePath(
    join(
      ".comath",
      "release",
      "goal3-selected-tranche-next-closure-packaging-results-closure-execution-bridge",
      bridgeId,
      "bridge.json"
    )
  );
}

function sha256Bytes(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function sha256Text(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function assertSafeId(value: string | undefined, label: string): string {
  const id = typeof value === "string" ? value.trim() : "";
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,160}$/u.test(id)) {
    throw new ComathError(`${label} is invalid`, {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_FOLLOW_THROUGH_INVALID_ID"
    });
  }
  return id;
}

function assertSha256(value: string | undefined): string {
  const sha256 = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-f0-9]{64}$/u.test(sha256)) {
    throw new ComathError("Goal 3 selected-tranche next closure execution packaging follow-through hash is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_FOLLOW_THROUGH_INVALID_HASH"
    });
  }
  return sha256;
}

function assertTask350InputPath(path: string | undefined, bridgeId: string): string {
  const normalizedInputPath = normalizeRelativePath(typeof path === "string" ? path.trim() : "");
  const expectedPath = task350Path(bridgeId);
  if (normalizedInputPath !== expectedPath) {
    throw new ComathError("Goal 3 selected-tranche next closure execution packaging follow-through Task350 path mismatch", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_FOLLOW_THROUGH_TASK350_PATH_MISMATCH"
    });
  }
  return expectedPath;
}

function sanitizeActor(actor: string | undefined): string {
  const text =
    typeof actor === "string" && actor.trim().length > 0
      ? actor.trim()
      : "goal3-selected-tranche-next-closure-execution-packaging-follow-through";
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

function artifactReferenceMatches(actual: ArtifactReference, expected: ArtifactReference | null | undefined): boolean {
  return (
    !!expected &&
    actual.kind === expected.kind &&
    normalizeRelativePath(actual.path) === normalizeRelativePath(expected.path) &&
    actual.sha256 === expected.sha256 &&
    actual.size_bytes === expected.size_bytes
  );
}

function readTask350Artifact(
  projectRoot: string,
  projectId: string,
  bridgeId: string,
  bridgePath: string,
  expectedSha256: string
): { body: PersistedTask350ClosureExecutionBridge; artifact: ArtifactReference } {
  const absolutePath = assertPathAllowed(projectRoot, bridgePath, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new ComathError("Goal 3 selected-tranche next closure execution packaging follow-through Task350 artifact is missing", {
      statusCode: 404,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_FOLLOW_THROUGH_TASK350_MISSING"
    });
  }
  const bytes = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(bytes);
  if (actualSha256 !== expectedSha256) {
    throw new ComathError("Goal 3 selected-tranche next closure execution packaging follow-through Task350 artifact is stale", {
      statusCode: 409,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_FOLLOW_THROUGH_STALE_TASK350"
    });
  }
  let body: PersistedTask350ClosureExecutionBridge;
  try {
    body = JSON.parse(bytes.toString("utf8")) as PersistedTask350ClosureExecutionBridge;
  } catch {
    throw new ComathError("Goal 3 selected-tranche next closure execution packaging follow-through Task350 artifact is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_FOLLOW_THROUGH_INVALID_TASK350"
    });
  }
  if (
    body.schema_version !==
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_bridge.v1" ||
    body.project_id !== projectId ||
    body.selected_tranche_next_closure_packaging_results_closure_execution_bridge_id !== bridgeId ||
    normalizeRelativePath(body.selected_tranche_next_closure_packaging_results_closure_execution_bridge_path) !==
      bridgePath ||
    body.bridge_status !== "ready_for_next_selected_tranche_execution" ||
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
    typeof body.delegated_selected_tranche_next_closure_execution_bridge_id !== "string" ||
    typeof body.delegated_selected_tranche_next_closure_execution_bridge_path !== "string" ||
    !isArtifactReference(body.delegated_selected_tranche_next_closure_execution_bridge_artifact) ||
    typeof body.delegated_selected_tranche_next_execution_bridge_id !== "string" ||
    typeof body.delegated_selected_tranche_next_execution_bridge_path !== "string" ||
    !isArtifactReference(body.delegated_selected_tranche_next_execution_bridge_artifact) ||
    !Array.isArray(body.next_execution_task_ids) ||
    body.next_execution_task_ids.length === 0
  ) {
    throw new ComathError("Goal 3 selected-tranche next closure execution packaging follow-through Task350 artifact is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_FOLLOW_THROUGH_INVALID_TASK350"
    });
  }
  return {
    body,
    artifact: {
      kind: "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_bridge",
      path: bridgePath,
      sha256: actualSha256,
      size_bytes: bytes.byteLength
    }
  };
}

function callerProofOrGaMaterialPresent(
  input: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingFollowThroughInput
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
    record.proof_breadth_closure_json !== undefined
  );
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

export function recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingFollowThrough(
  projectRoot: string,
  input: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingFollowThroughInput
): Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingFollowThrough {
  const projectId = assertSafeId(input.project_id, "project_id");
  const followThroughId = assertSafeId(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id,
    "selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id"
  );
  const task350Id = assertSafeId(
    input.selected_tranche_next_closure_packaging_results_closure_execution_bridge_id,
    "selected_tranche_next_closure_packaging_results_closure_execution_bridge_id"
  );
  const task350Sha256 = assertSha256(input.selected_tranche_next_closure_packaging_results_closure_execution_bridge_sha256);
  const task350RelativePath = assertTask350InputPath(
    input.selected_tranche_next_closure_packaging_results_closure_execution_bridge_path,
    task350Id
  );
  const requestedMode =
    input.requested_follow_through_mode ??
    "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through";
  if (
    requestedMode !==
    "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through"
  ) {
    throw new ComathError("Goal 3 selected-tranche next closure execution packaging follow-through mode is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_FOLLOW_THROUGH_INVALID_MODE"
    });
  }
  const outputPath = followThroughPath(followThroughId);
  const absoluteOutputPath = assertPathAllowed(projectRoot, outputPath, { purpose: "runtime-write" });
  if (existsSync(absoluteOutputPath)) {
    throw new ComathError("Goal 3 selected-tranche next closure execution packaging follow-through already exists", {
      statusCode: 409,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_FOLLOW_THROUGH_ALREADY_EXISTS"
    });
  }

  const task350 = readTask350Artifact(projectRoot, projectId, task350Id, task350RelativePath, task350Sha256);
  const actor = sanitizeActor(input.actor);
  const delegatedFollowThroughId = assertSafeId(
    input.selected_tranche_next_closure_packaging_follow_through_id ?? `${followThroughId}-TASK346`,
    "selected_tranche_next_closure_packaging_follow_through_id"
  );
  const claimIdPrefix =
    typeof input.claim_id_prefix === "string" && input.claim_id_prefix.trim().length > 0
      ? input.claim_id_prefix.trim()
      : "C-T352";
  const delegated = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingFollowThrough(projectRoot, {
    project_id: projectId,
    selected_tranche_next_closure_packaging_follow_through_id: delegatedFollowThroughId,
    selected_tranche_next_closure_execution_bridge_id:
      task350.body.delegated_selected_tranche_next_closure_execution_bridge_id,
    selected_tranche_next_closure_execution_bridge_path:
      task350.body.delegated_selected_tranche_next_closure_execution_bridge_path,
    selected_tranche_next_closure_execution_bridge_sha256:
      task350.body.delegated_selected_tranche_next_closure_execution_bridge_artifact.sha256,
    selected_tranche_next_packaging_follow_through_id: input.selected_tranche_next_packaging_follow_through_id,
    task_local_packaging_follow_through_id: input.task_local_packaging_follow_through_id,
    claim_id_prefix: claimIdPrefix,
    evidence_by_task_id: input.evidence_by_task_id,
    actor,
    requested_follow_through_mode: "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_follow_through"
  });

  if (
    delegated.selected_tranche_next_closure_execution_bridge_id !==
      task350.body.delegated_selected_tranche_next_closure_execution_bridge_id ||
    normalizeRelativePath(delegated.selected_tranche_next_closure_execution_bridge_path) !==
      normalizeRelativePath(task350.body.delegated_selected_tranche_next_closure_execution_bridge_path) ||
    !artifactReferenceMatches(
      delegated.selected_tranche_next_closure_execution_bridge_artifact,
      task350.body.delegated_selected_tranche_next_closure_execution_bridge_artifact
    ) ||
    delegated.delegated_selected_tranche_next_execution_bridge_id !==
      task350.body.delegated_selected_tranche_next_execution_bridge_id ||
    normalizeRelativePath(delegated.delegated_selected_tranche_next_execution_bridge_path) !==
      normalizeRelativePath(task350.body.delegated_selected_tranche_next_execution_bridge_path) ||
    !artifactReferenceMatches(
      delegated.delegated_selected_tranche_next_execution_bridge_artifact,
      task350.body.delegated_selected_tranche_next_execution_bridge_artifact
    )
  ) {
    throw new ComathError(
      "Goal 3 selected-tranche next closure execution packaging follow-through Task350 delegated bridge material is inconsistent",
      {
        statusCode: 409,
        code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_FOLLOW_THROUGH_TASK350_DELEGATED_MISMATCH"
      }
    );
  }

  const callerAuthorityMaterialIgnored = callerProofOrGaMaterialPresent(input);
  const blockerReasons = uniqueStrings([
    ...task350.body.blocker_reasons,
    ...delegated.blocker_reasons,
    ...(callerAuthorityMaterialIgnored ? ["caller_proof_or_ga_authority_material_ignored"] : [])
  ]);
  const body = {
    schema_version:
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through.v1",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id: followThroughId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    ok: delegated.ok,
    follow_through_status: delegated.follow_through_status,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_path: outputPath,
    requested_follow_through_mode:
      "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through",
    selected_tranche_next_closure_packaging_results_closure_execution_bridge_id: task350Id,
    selected_tranche_next_closure_packaging_results_closure_execution_bridge_path: task350RelativePath,
    selected_tranche_next_closure_packaging_results_closure_execution_bridge_artifact: task350.artifact,
    delegated_selected_tranche_next_closure_execution_bridge_id:
      delegated.selected_tranche_next_closure_execution_bridge_id,
    delegated_selected_tranche_next_closure_execution_bridge_path:
      delegated.selected_tranche_next_closure_execution_bridge_path,
    delegated_selected_tranche_next_closure_execution_bridge_artifact:
      delegated.selected_tranche_next_closure_execution_bridge_artifact,
    delegated_selected_tranche_next_execution_bridge_id: delegated.delegated_selected_tranche_next_execution_bridge_id,
    delegated_selected_tranche_next_execution_bridge_path: delegated.delegated_selected_tranche_next_execution_bridge_path,
    delegated_selected_tranche_next_execution_bridge_artifact: delegated.delegated_selected_tranche_next_execution_bridge_artifact,
    selected_tranche_next_closure_packaging_follow_through_id:
      delegated.selected_tranche_next_closure_packaging_follow_through_id,
    selected_tranche_next_closure_packaging_follow_through_path:
      delegated.selected_tranche_next_closure_packaging_follow_through_path,
    selected_tranche_next_closure_packaging_follow_through_artifact:
      delegated.selected_tranche_next_closure_packaging_follow_through_artifact,
    selected_tranche_next_packaging_follow_through_id: delegated.selected_tranche_next_packaging_follow_through_id,
    selected_tranche_next_packaging_follow_through_path: delegated.selected_tranche_next_packaging_follow_through_path,
    selected_tranche_next_packaging_follow_through_artifact: delegated.selected_tranche_next_packaging_follow_through_artifact,
    task_local_packaging_follow_through_id: delegated.task_local_packaging_follow_through_id,
    task_local_packaging_follow_through_path: delegated.task_local_packaging_follow_through_path,
    task_local_packaging_follow_through_artifact: delegated.task_local_packaging_follow_through_artifact,
    task_local_packaging_follow_through_status: delegated.task_local_packaging_follow_through_status,
    claim_id_prefix: claimIdPrefix,
    blocker_reasons: blockerReasons,
    selected_task_count: delegated.selected_task_count,
    verified_selected_task_count: delegated.verified_selected_task_count,
    blocked_selected_task_count: delegated.blocked_selected_task_count,
    written_packaging_report_count: delegated.written_packaging_report_count,
    selected_task_ids: delegated.selected_task_ids,
    verified_selected_task_ids: delegated.verified_selected_task_ids,
    blocked_selected_task_ids: delegated.blocked_selected_task_ids,
    selected_packaging_report_artifacts: delegated.selected_packaging_report_artifacts,
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
    Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingFollowThrough,
    "selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_artifact"
  >;

  const text = `${JSON.stringify(body, null, 2)}\n`;
  mkdirSync(dirname(absoluteOutputPath), { recursive: true });
  writeFileSync(absoluteOutputPath, text, "utf8");
  const result: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingFollowThrough = {
    ...body,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_artifact: {
      kind: "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through",
      path: outputPath,
      sha256: sha256Text(text),
      size_bytes: Buffer.byteLength(text, "utf8")
    }
  };

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.goal3_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_recorded",
    actor,
    target_id: projectId,
    payload: {
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id: followThroughId,
      follow_through_status: result.follow_through_status,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_path: outputPath,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_artifact_sha256:
        result.selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_artifact.sha256,
      selected_tranche_next_closure_packaging_results_closure_execution_bridge_id: task350Id,
      selected_tranche_next_closure_packaging_results_closure_execution_bridge_artifact_sha256: task350.artifact.sha256,
      selected_tranche_next_closure_packaging_follow_through_id:
        delegated.selected_tranche_next_closure_packaging_follow_through_id,
      selected_tranche_next_closure_packaging_follow_through_artifact_sha256:
        delegated.selected_tranche_next_closure_packaging_follow_through_artifact.sha256,
      selected_tranche_next_packaging_follow_through_id: delegated.selected_tranche_next_packaging_follow_through_id,
      task_local_packaging_follow_through_id: delegated.task_local_packaging_follow_through_id,
      selected_task_ids: result.selected_task_ids,
      verified_selected_task_count: result.verified_selected_task_count,
      blocked_selected_task_count: result.blocked_selected_task_count,
      written_packaging_report_count: result.written_packaging_report_count,
      blocker_reasons: result.blocker_reasons,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  });
  return result;
}
