import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { assertPathAllowed } from "../security/path-policy.js";
import {
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingFollowThrough,
  type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingFollowThrough,
  type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingFollowThroughInput
} from "./goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-follow-through.js";
import type { Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionBridge } from "./goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-bridge.js";
import type { Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionBridge } from "./goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-bridge.js";

type ArtifactReference = {
  kind: string;
  path: string;
  sha256: string;
  size_bytes: number;
};

type EvidenceByTaskId = NonNullable<Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingFollowThroughInput["evidence_by_task_id"]>;

type PersistedTask356ClosureExecutionBridge = Omit<
  Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionBridge,
  "selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact"
>;

type PersistedTask350ClosureExecutionBridge = Omit<
  Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionBridge,
  "selected_tranche_next_closure_packaging_results_closure_execution_bridge_artifact"
>;

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThroughInput = {
  project_id: string;
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id?: string;
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id: string;
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path: string;
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_sha256: string;
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id?: string;
  selected_tranche_next_closure_packaging_follow_through_id?: string;
  selected_tranche_next_packaging_follow_through_id?: string;
  task_local_packaging_follow_through_id?: string;
  claim_id_prefix?: string;
  evidence_by_task_id?: EvidenceByTaskId;
  actor?: string;
  requested_follow_through_mode?: "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through";
};

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough = {
  schema_version: "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through.v1";
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  ok: boolean;
  follow_through_status:
    | "next_selected_tranche_task_local_packaging_verified"
    | "blocked_next_selected_tranche_task_local_packaging_incomplete";
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path: string;
  requested_follow_through_mode: "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through";
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id: string;
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path: string;
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact: ArtifactReference;
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id: string;
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path: string;
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact: ArtifactReference;
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id: string;
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_path: string;
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_artifact: ArtifactReference;
  delegated_selected_tranche_next_closure_packaging_results_closure_execution_bridge_id: string;
  delegated_selected_tranche_next_closure_packaging_results_closure_execution_bridge_path: string;
  delegated_selected_tranche_next_closure_packaging_results_closure_execution_bridge_artifact: ArtifactReference;
  delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id: string;
  delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_path: string;
  delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_artifact: ArtifactReference;
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
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact: ArtifactReference;
};

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function followThroughPath(followThroughId: string): string {
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

function task356Path(bridgeId: string): string {
  return normalizeRelativePath(
    join(
      ".comath",
      "release",
      "goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-bridge",
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

function shortIdSuffix(id: string): string {
  return sha256Text(id).slice(0, 12).toUpperCase();
}

function assertSafeId(value: string | undefined, label: string): string {
  const id = typeof value === "string" ? value.trim() : "";
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,220}$/u.test(id)) {
    throw new ComathError(`${label} is invalid`, {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_FOLLOW_THROUGH_INVALID_ID"
    });
  }
  return id;
}

function assertSha256(value: string | undefined): string {
  const sha256 = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-f0-9]{64}$/u.test(sha256)) {
    throw new ComathError("Goal 3 selected-tranche next closure execution packaging results closure execution packaging follow-through hash is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_FOLLOW_THROUGH_INVALID_HASH"
    });
  }
  return sha256;
}

function assertTask356InputPath(path: string | undefined, bridgeId: string): string {
  const normalizedInputPath = normalizeRelativePath(typeof path === "string" ? path.trim() : "");
  const expectedPath = task356Path(bridgeId);
  if (normalizedInputPath !== expectedPath) {
    throw new ComathError("Goal 3 selected-tranche next closure execution packaging results closure execution packaging follow-through Task356 path mismatch", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_FOLLOW_THROUGH_TASK356_PATH_MISMATCH"
    });
  }
  return expectedPath;
}

function sanitizeActor(actor: string | undefined): string {
  const text =
    typeof actor === "string" && actor.trim().length > 0
      ? actor.trim()
      : "goal3-selected-tranche-next-closure-execution-packaging-results-closure-execution-packaging-follow-through";
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

function invalidTask356(): never {
  throw new ComathError("Goal 3 selected-tranche next closure execution packaging results closure execution packaging follow-through Task356 artifact is invalid", {
    statusCode: 400,
    code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_FOLLOW_THROUGH_INVALID_TASK356"
  });
}

function assertCurrentArtifactReference(
  projectRoot: string,
  path: string,
  artifact: unknown,
  kind: string
): ArtifactReference {
  if (!isArtifactReference(artifact) || artifact.kind !== kind || normalizeRelativePath(artifact.path) !== normalizeRelativePath(path)) {
    invalidTask356();
  }
  let current: ArtifactReference;
  try {
    current = artifactForProjectFile(projectRoot, path, kind);
  } catch {
    invalidTask356();
  }
  if (!artifactReferencesEqual(artifact, current)) {
    invalidTask356();
  }
  return current;
}

function readDelegatedTask350(
  projectRoot: string,
  projectId: string,
  task356: PersistedTask356ClosureExecutionBridge
): { body: PersistedTask350ClosureExecutionBridge; artifact: ArtifactReference } {
  const artifact = assertCurrentArtifactReference(
    projectRoot,
    task356.delegated_selected_tranche_next_closure_packaging_results_closure_execution_bridge_path,
    task356.delegated_selected_tranche_next_closure_packaging_results_closure_execution_bridge_artifact,
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_bridge"
  );
  const absolutePath = assertPathAllowed(projectRoot, artifact.path, { purpose: "read", resolveRealpath: true });
  let body: PersistedTask350ClosureExecutionBridge;
  try {
    body = JSON.parse(readFileSync(absolutePath, "utf8")) as PersistedTask350ClosureExecutionBridge;
  } catch {
    invalidTask356();
  }
  if (
    body.schema_version !==
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_bridge.v1" ||
    body.project_id !== projectId ||
    body.selected_tranche_next_closure_packaging_results_closure_execution_bridge_id !==
      task356.delegated_selected_tranche_next_closure_packaging_results_closure_execution_bridge_id ||
    normalizeRelativePath(body.selected_tranche_next_closure_packaging_results_closure_execution_bridge_path) !==
      normalizeRelativePath(task356.delegated_selected_tranche_next_closure_packaging_results_closure_execution_bridge_path) ||
    body.bridge_status !== task356.bridge_status ||
    body.proof_breadth_complete !== task356.proof_breadth_complete ||
    body.final_ga_audit_unblocked !== task356.final_ga_audit_unblocked ||
    body.runs_lean !== false ||
    body.executes_proofs !== false ||
    body.accepts_caller_success_metadata !== false ||
    body.accepts_caller_proof_material !== false ||
    body.proof_authority !== "none" ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    body.ga_certification_gate_separate !== true ||
    body.delegated_selected_tranche_next_closure_execution_bridge_id !==
      task356.delegated_selected_tranche_next_closure_execution_bridge_id ||
    normalizeRelativePath(body.delegated_selected_tranche_next_closure_execution_bridge_path) !==
      normalizeRelativePath(task356.delegated_selected_tranche_next_closure_execution_bridge_path) ||
    !artifactReferencesEqual(
      body.delegated_selected_tranche_next_closure_execution_bridge_artifact,
      task356.delegated_selected_tranche_next_closure_execution_bridge_artifact
    ) ||
    body.delegated_selected_tranche_next_execution_bridge_id !== task356.delegated_selected_tranche_next_execution_bridge_id ||
    normalizeRelativePath(body.delegated_selected_tranche_next_execution_bridge_path) !==
      normalizeRelativePath(task356.delegated_selected_tranche_next_execution_bridge_path) ||
    !artifactReferencesEqual(
      body.delegated_selected_tranche_next_execution_bridge_artifact,
      task356.delegated_selected_tranche_next_execution_bridge_artifact
    ) ||
    JSON.stringify(body.next_execution_task_ids) !== JSON.stringify(task356.next_execution_task_ids)
  ) {
    invalidTask356();
  }
  return { body, artifact };
}

function readTask356Artifact(
  projectRoot: string,
  projectId: string,
  bridgeId: string,
  bridgePath: string,
  expectedSha256: string
): { body: PersistedTask356ClosureExecutionBridge; artifact: ArtifactReference; delegatedTask350: ArtifactReference } {
  const absolutePath = assertPathAllowed(projectRoot, bridgePath, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new ComathError("Goal 3 selected-tranche next closure execution packaging results closure execution packaging follow-through Task356 artifact is missing", {
      statusCode: 404,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_FOLLOW_THROUGH_TASK356_MISSING"
    });
  }
  const bytes = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(bytes);
  if (actualSha256 !== expectedSha256) {
    throw new ComathError("Goal 3 selected-tranche next closure execution packaging results closure execution packaging follow-through Task356 artifact is stale", {
      statusCode: 409,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_FOLLOW_THROUGH_STALE_TASK356"
    });
  }
  let body: PersistedTask356ClosureExecutionBridge;
  try {
    body = JSON.parse(bytes.toString("utf8")) as PersistedTask356ClosureExecutionBridge;
  } catch {
    invalidTask356();
  }
  if (
    body.schema_version !==
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge.v1" ||
    body.project_id !== projectId ||
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id !==
      bridgeId ||
    normalizeRelativePath(body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path) !==
      bridgePath ||
    (body.bridge_status !== "ready_for_next_selected_tranche_execution" &&
      body.bridge_status !== "complete_proof_breadth_requires_task301_final_ga_audit_binding") ||
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
    typeof body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_bridge_id !== "string" ||
    typeof body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_bridge_path !== "string" ||
    !isArtifactReference(body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_bridge_artifact) ||
    typeof body.delegated_selected_tranche_next_closure_execution_bridge_id !== "string" ||
    typeof body.delegated_selected_tranche_next_closure_execution_bridge_path !== "string" ||
    !isArtifactReference(body.delegated_selected_tranche_next_closure_execution_bridge_artifact) ||
    typeof body.delegated_selected_tranche_next_execution_bridge_id !== "string" ||
    typeof body.delegated_selected_tranche_next_execution_bridge_path !== "string" ||
    !isArtifactReference(body.delegated_selected_tranche_next_execution_bridge_artifact) ||
    !Array.isArray(body.next_execution_task_ids) ||
    body.next_execution_task_ids.length === 0
  ) {
    invalidTask356();
  }
  const delegatedTask350 = readDelegatedTask350(projectRoot, projectId, body);
  return {
    body,
    artifact: {
      kind: "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge",
      path: bridgePath,
      sha256: actualSha256,
      size_bytes: bytes.byteLength
    },
    delegatedTask350: delegatedTask350.artifact
  };
}

function callerProofOrGaMaterialPresent(
  input: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThroughInput
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

export function recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough(
  projectRoot: string,
  input: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThroughInput
): Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough {
  const projectId = assertSafeId(input.project_id, "project_id");
  const followThroughId = assertSafeId(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id,
    "selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id"
  );
  const task356Id = assertSafeId(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id,
    "selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id"
  );
  const task356Sha256 = assertSha256(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_sha256
  );
  const task356RelativePath = assertTask356InputPath(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path,
    task356Id
  );
  const requestedMode =
    input.requested_follow_through_mode ??
    "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through";
  if (
    requestedMode !==
    "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through"
  ) {
    throw new ComathError("Goal 3 selected-tranche next closure execution packaging results closure execution packaging follow-through mode is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_FOLLOW_THROUGH_INVALID_MODE"
    });
  }
  const outputPath = followThroughPath(followThroughId);
  const absoluteOutputPath = assertPathAllowed(projectRoot, outputPath, { purpose: "runtime-write" });
  if (existsSync(absoluteOutputPath)) {
    throw new ComathError("Goal 3 selected-tranche next closure execution packaging results closure execution packaging follow-through already exists", {
      statusCode: 409,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_FOLLOW_THROUGH_ALREADY_EXISTS"
    });
  }

  const task356 = readTask356Artifact(projectRoot, projectId, task356Id, task356RelativePath, task356Sha256);
  const actor = sanitizeActor(input.actor);
  const followThroughSuffix = shortIdSuffix(followThroughId);
  const delegatedTask352Id = assertSafeId(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id ??
      `G3-T358-T352-${followThroughSuffix}`,
    "selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id"
  );
  const claimIdPrefix =
    typeof input.claim_id_prefix === "string" && input.claim_id_prefix.trim().length > 0
      ? input.claim_id_prefix.trim()
      : "C-T358";
  const delegated = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingFollowThrough(
    projectRoot,
    {
      project_id: projectId,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id: delegatedTask352Id,
      selected_tranche_next_closure_packaging_results_closure_execution_bridge_id:
        task356.body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_bridge_id,
      selected_tranche_next_closure_packaging_results_closure_execution_bridge_path:
        task356.body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_bridge_path,
      selected_tranche_next_closure_packaging_results_closure_execution_bridge_sha256: task356.delegatedTask350.sha256,
      selected_tranche_next_closure_packaging_follow_through_id:
        input.selected_tranche_next_closure_packaging_follow_through_id,
      selected_tranche_next_packaging_follow_through_id: input.selected_tranche_next_packaging_follow_through_id,
      task_local_packaging_follow_through_id: input.task_local_packaging_follow_through_id,
      claim_id_prefix: claimIdPrefix,
      evidence_by_task_id: input.evidence_by_task_id,
      actor,
      requested_follow_through_mode:
        "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through"
    }
  );

  if (
    delegated.selected_tranche_next_closure_packaging_results_closure_execution_bridge_id !==
      task356.body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_bridge_id ||
    normalizeRelativePath(delegated.selected_tranche_next_closure_packaging_results_closure_execution_bridge_path) !==
      normalizeRelativePath(task356.body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_bridge_path) ||
    !artifactReferencesEqual(delegated.selected_tranche_next_closure_packaging_results_closure_execution_bridge_artifact, task356.delegatedTask350)
  ) {
    throw new ComathError(
      "Goal 3 selected-tranche next closure execution packaging results closure execution packaging follow-through delegated Task352 material is inconsistent",
      {
        statusCode: 409,
        code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_FOLLOW_THROUGH_TASK352_DELEGATED_MISMATCH"
      }
    );
  }

  const callerAuthorityMaterialIgnored = callerProofOrGaMaterialPresent(input);
  const blockerReasons = uniqueStrings([
    ...task356.body.blocker_reasons,
    ...delegated.blocker_reasons,
    ...(callerAuthorityMaterialIgnored ? ["caller_proof_or_ga_authority_material_ignored"] : [])
  ]);
  const body = {
    schema_version:
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through.v1",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
      followThroughId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    ok: delegated.ok,
    follow_through_status: delegated.follow_through_status,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path:
      outputPath,
    requested_follow_through_mode:
      "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
      task356Id,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path:
      task356RelativePath,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact:
      task356.artifact,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id:
      task356.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path:
      task356.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact:
      task356.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id:
      task356.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_path:
      task356.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_artifact:
      task356.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_artifact,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_bridge_id:
      task356.body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_bridge_id,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_bridge_path:
      task356.body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_bridge_path,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_bridge_artifact: task356.delegatedTask350,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id:
      delegated.selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_path:
      delegated.selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_path,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_artifact:
      delegated.selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_artifact,
    delegated_selected_tranche_next_closure_execution_bridge_id:
      task356.body.delegated_selected_tranche_next_closure_execution_bridge_id,
    delegated_selected_tranche_next_closure_execution_bridge_path:
      task356.body.delegated_selected_tranche_next_closure_execution_bridge_path,
    delegated_selected_tranche_next_closure_execution_bridge_artifact:
      task356.body.delegated_selected_tranche_next_closure_execution_bridge_artifact,
    delegated_selected_tranche_next_execution_bridge_id: task356.body.delegated_selected_tranche_next_execution_bridge_id,
    delegated_selected_tranche_next_execution_bridge_path:
      task356.body.delegated_selected_tranche_next_execution_bridge_path,
    delegated_selected_tranche_next_execution_bridge_artifact:
      task356.body.delegated_selected_tranche_next_execution_bridge_artifact,
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
    Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough,
    "selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact"
  >;

  const text = `${JSON.stringify(body, null, 2)}\n`;
  mkdirSync(dirname(absoluteOutputPath), { recursive: true });
  writeFileSync(absoluteOutputPath, text, "utf8");
  const result: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough =
    {
      ...body,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact:
        {
          kind: "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through",
          path: outputPath,
          sha256: sha256Text(text),
          size_bytes: Buffer.byteLength(text, "utf8")
        }
    };

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type:
      "release.goal3_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_recorded",
    actor,
    target_id: projectId,
    payload: {
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
        followThroughId,
      follow_through_status: result.follow_through_status,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path:
        outputPath,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact_sha256:
        result.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact
          .sha256,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
        task356Id,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact_sha256:
        task356.artifact.sha256,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_bridge_id:
        result.delegated_selected_tranche_next_closure_packaging_results_closure_execution_bridge_id,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_bridge_artifact_sha256:
        result.delegated_selected_tranche_next_closure_packaging_results_closure_execution_bridge_artifact.sha256,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id:
        result.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_artifact_sha256:
        result.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_artifact.sha256,
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
