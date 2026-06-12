import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { assertPathAllowed } from "../security/path-policy.js";
import type { Goal3ReleaseCandidateProofBreadthExecutionBridge } from "./goal3-proof-breadth-execution-bridge.js";
import type { Goal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge } from "./goal3-proof-breadth-selected-tranche-next-execution-bridge.js";
import {
  recordGoal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThrough,
  type Goal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThroughInput
} from "./goal3-proof-breadth-task-local-packaging-follow-through.js";

type ArtifactReference = {
  kind: string;
  path: string;
  sha256: string;
  size_bytes: number;
};

type EvidenceByTaskId = NonNullable<Goal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThroughInput["evidence_by_task_id"]>;

type PersistedSelectedTrancheNextExecutionBridge = Omit<
  Goal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge,
  "selected_tranche_next_execution_bridge_artifact"
>;

type PersistedProofBreadthExecutionBridge = Omit<
  Goal3ReleaseCandidateProofBreadthExecutionBridge,
  "proof_breadth_execution_bridge_artifact"
>;

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThroughInput = {
  project_id: string;
  selected_tranche_next_packaging_follow_through_id?: string;
  selected_tranche_next_execution_bridge_id: string;
  selected_tranche_next_execution_bridge_path: string;
  selected_tranche_next_execution_bridge_sha256: string;
  task_local_packaging_follow_through_id?: string;
  claim_id_prefix?: string;
  evidence_by_task_id?: EvidenceByTaskId;
  actor?: string;
  requested_follow_through_mode?: "open_formal_workbench_release_candidate_selected_tranche_next_packaging_follow_through";
};

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThrough = {
  schema_version: "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_packaging_follow_through.v1";
  selected_tranche_next_packaging_follow_through_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  ok: boolean;
  follow_through_status:
    | "next_selected_tranche_task_local_packaging_verified"
    | "blocked_next_selected_tranche_task_local_packaging_incomplete";
  selected_tranche_next_packaging_follow_through_path: string;
  requested_follow_through_mode: "open_formal_workbench_release_candidate_selected_tranche_next_packaging_follow_through";
  selected_tranche_next_execution_bridge_id: string;
  selected_tranche_next_execution_bridge_path: string;
  selected_tranche_next_execution_bridge_artifact: ArtifactReference;
  delegated_proof_breadth_execution_bridge_id: string;
  delegated_proof_breadth_execution_bridge_path: string;
  delegated_proof_breadth_execution_bridge_artifact: ArtifactReference;
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
  selected_tranche_next_packaging_follow_through_artifact: ArtifactReference;
};

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function selectedTrancheNextPackagingFollowThroughPath(followThroughId: string): string {
  return normalizeRelativePath(
    join(
      ".comath",
      "release",
      "goal3-selected-tranche-next-packaging-follow-through",
      followThroughId,
      "follow-through.json"
    )
  );
}

function selectedTrancheNextExecutionBridgePath(bridgeId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "goal3-selected-tranche-next-execution-bridge", bridgeId, "bridge.json")
  );
}

function proofBreadthExecutionBridgePath(bridgeId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "goal3-proof-breadth-execution-bridge", bridgeId, "bridge.json")
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
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,120}$/u.test(id)) {
    throw new ComathError(`${label} is invalid`, {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_FOLLOW_THROUGH_INVALID_ID"
    });
  }
  return id;
}

function assertSha256(value: string): string {
  const hash = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-f0-9]{64}$/u.test(hash)) {
    throw new ComathError("Goal 3 selected-tranche next packaging follow-through hash is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_FOLLOW_THROUGH_INVALID_HASH"
    });
  }
  return hash;
}

function assertSelectedBridgePath(path: string, bridgeId: string): string {
  const normalized = normalizeRelativePath(path);
  const expected = selectedTrancheNextExecutionBridgePath(bridgeId);
  if (normalized !== expected) {
    throw new ComathError("Goal 3 selected-tranche next packaging follow-through Task338 path mismatch", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_FOLLOW_THROUGH_TASK338_PATH_MISMATCH"
    });
  }
  return normalized;
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

function artifactReferenceMatches(actual: ArtifactReference, expected: ArtifactReference | null | undefined): boolean {
  return (
    !!expected &&
    actual.path === normalizeRelativePath(expected.path) &&
    actual.sha256 === expected.sha256 &&
    actual.size_bytes === expected.size_bytes
  );
}

function parseJsonArtifact<T>(bytes: Buffer, code: string, message: string): T {
  try {
    return JSON.parse(bytes.toString("utf8")) as T;
  } catch {
    throw new ComathError(message, { statusCode: 400, code });
  }
}

function readTask338Artifact(
  projectRoot: string,
  bridgeId: string,
  bridgePath: string,
  bridgeSha256: string
): { body: PersistedSelectedTrancheNextExecutionBridge; artifact: ArtifactReference } {
  const absoluteBridgePath = assertPathAllowed(projectRoot, bridgePath);
  if (!existsSync(absoluteBridgePath)) {
    throw new ComathError("Goal 3 selected-tranche next packaging follow-through Task338 artifact is missing", {
      statusCode: 404,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_FOLLOW_THROUGH_TASK338_MISSING"
    });
  }
  const bytes = readFileSync(absoluteBridgePath);
  const actualSha256 = sha256Bytes(bytes);
  if (actualSha256 !== bridgeSha256) {
    throw new ComathError("Goal 3 selected-tranche next packaging follow-through Task338 artifact is stale", {
      statusCode: 409,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_FOLLOW_THROUGH_STALE_TASK338"
    });
  }
  const body = parseJsonArtifact<PersistedSelectedTrancheNextExecutionBridge>(
    bytes,
    "GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_FOLLOW_THROUGH_INVALID_TASK338",
    "Goal 3 selected-tranche next packaging follow-through Task338 artifact is invalid"
  );
  if (
    body.schema_version !== "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_execution_bridge.v1" ||
    body.project_id === undefined ||
    body.selected_tranche_next_execution_bridge_id !== bridgeId ||
    normalizeRelativePath(body.selected_tranche_next_execution_bridge_path) !== bridgePath
  ) {
    throw new ComathError("Goal 3 selected-tranche next packaging follow-through Task338 artifact identity is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_FOLLOW_THROUGH_INVALID_TASK338"
    });
  }
  return {
    body,
    artifact: {
      kind: "goal3_release_candidate_proof_breadth_selected_tranche_next_execution_bridge",
      path: bridgePath,
      sha256: actualSha256,
      size_bytes: bytes.byteLength
    }
  };
}

function readDelegatedBridgeArtifact(
  projectRoot: string,
  bridgeId: string,
  bridgePath: string,
  expectedArtifact: ArtifactReference
): { body: PersistedProofBreadthExecutionBridge; artifact: ArtifactReference } {
  const normalizedPath = normalizeRelativePath(bridgePath);
  const expectedPath = proofBreadthExecutionBridgePath(bridgeId);
  if (normalizedPath !== expectedPath) {
    throw new ComathError("Goal 3 selected-tranche next packaging follow-through delegated bridge path mismatch", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_FOLLOW_THROUGH_DELEGATED_BRIDGE_MISMATCH"
    });
  }
  const absoluteBridgePath = assertPathAllowed(projectRoot, normalizedPath);
  if (!existsSync(absoluteBridgePath)) {
    throw new ComathError("Goal 3 selected-tranche next packaging follow-through delegated Task326 bridge is missing", {
      statusCode: 404,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_FOLLOW_THROUGH_DELEGATED_BRIDGE_MISSING"
    });
  }
  const bytes = readFileSync(absoluteBridgePath);
  const artifact = {
    kind: "goal3_release_candidate_proof_breadth_execution_bridge",
    path: normalizedPath,
    sha256: sha256Bytes(bytes),
    size_bytes: bytes.byteLength
  };
  if (!artifactReferenceMatches(artifact, expectedArtifact)) {
    throw new ComathError("Goal 3 selected-tranche next packaging follow-through delegated Task326 bridge is stale", {
      statusCode: 409,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_FOLLOW_THROUGH_STALE_DELEGATED_BRIDGE"
    });
  }
  const body = parseJsonArtifact<PersistedProofBreadthExecutionBridge>(
    bytes,
    "GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_FOLLOW_THROUGH_INVALID_DELEGATED_BRIDGE",
    "Goal 3 selected-tranche next packaging follow-through delegated Task326 bridge is invalid"
  );
  if (
    body.schema_version !== "comath.goal3_release_candidate_proof_breadth_execution_bridge.v1" ||
    body.proof_breadth_execution_bridge_id !== bridgeId ||
    normalizeRelativePath(body.proof_breadth_execution_bridge_path) !== normalizedPath
  ) {
    throw new ComathError("Goal 3 selected-tranche next packaging follow-through delegated Task326 identity is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_FOLLOW_THROUGH_INVALID_DELEGATED_BRIDGE"
    });
  }
  return { body, artifact };
}

function assertStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function sameStringArray(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function assertNoUnselectedEvidence(selectedTaskIds: Set<string>, evidenceByTaskId: EvidenceByTaskId): void {
  for (const taskId of Object.keys(evidenceByTaskId)) {
    if (!selectedTaskIds.has(taskId)) {
      throw new ComathError("Goal 3 selected-tranche next packaging follow-through evidence is outside the Task338 next tranche", {
        statusCode: 400,
        code: "GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_FOLLOW_THROUGH_UNSELECTED_EVIDENCE"
      });
    }
  }
}

function callerProofOrGaMaterialPresent(
  input: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThroughInput
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

function sanitizeActor(actor: string | undefined): string {
  const text = typeof actor === "string" && actor.trim().length > 0 ? actor.trim() : "comathd";
  return text
    .replace(/(?:[A-Za-z]:[\\/][^\s"']+|\\\\[^\s"']+)/gu, "[redacted-path]")
    .replace(/(?:Authorization:\s*Bearer\s+\S+|api_key=\S+|token=\S+|sk-[A-Za-z0-9_-]+)/giu, "[redacted-secret]")
    .replace(/proof_success/giu, "proof_status_redacted")
    .replace(/GA certified/giu, "GA status redacted")
    .replace(/can_certify_ga\s*=\s*true/giu, "can_certify_ga=false")
    .slice(0, 240);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

export function recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThrough(
  projectRoot: string,
  input: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThroughInput
): Goal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThrough {
  const projectId = assertSafeId(input.project_id, "project_id");
  const followThroughId = assertSafeId(
    input.selected_tranche_next_packaging_follow_through_id,
    "selected_tranche_next_packaging_follow_through_id"
  );
  const task338Id = assertSafeId(
    input.selected_tranche_next_execution_bridge_id,
    "selected_tranche_next_execution_bridge_id"
  );
  const task338Sha256 = assertSha256(input.selected_tranche_next_execution_bridge_sha256);
  const task338Path = assertSelectedBridgePath(input.selected_tranche_next_execution_bridge_path, task338Id);
  const requestedMode =
    input.requested_follow_through_mode ??
    "open_formal_workbench_release_candidate_selected_tranche_next_packaging_follow_through";
  if (requestedMode !== "open_formal_workbench_release_candidate_selected_tranche_next_packaging_follow_through") {
    throw new ComathError("Goal 3 selected-tranche next packaging follow-through mode is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_FOLLOW_THROUGH_INVALID_MODE"
    });
  }

  const followThroughPath = selectedTrancheNextPackagingFollowThroughPath(followThroughId);
  const absoluteFollowThroughPath = assertPathAllowed(projectRoot, followThroughPath, { purpose: "runtime-write" });
  if (existsSync(absoluteFollowThroughPath)) {
    throw new ComathError("Goal 3 selected-tranche next packaging follow-through already exists", {
      statusCode: 409,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_FOLLOW_THROUGH_ALREADY_EXISTS"
    });
  }

  const task338 = readTask338Artifact(projectRoot, task338Id, task338Path, task338Sha256);
  if (task338.body.project_id !== projectId) {
    throw new ComathError("Goal 3 selected-tranche next packaging follow-through project id mismatch", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_FOLLOW_THROUGH_INVALID_TASK338"
    });
  }
  const nextTaskIds = assertStringArray(task338.body.next_execution_task_ids);
  const delegatedBridgeId = task338.body.next_proof_breadth_execution_bridge_id;
  const delegatedBridgePath = task338.body.next_proof_breadth_execution_bridge_path;
  const delegatedBridgeArtifact = task338.body.next_proof_breadth_execution_bridge_artifact;
  if (
    task338.body.bridge_status !== "ready_for_next_selected_tranche_execution" ||
    task338.body.proof_breadth_complete !== false ||
    typeof delegatedBridgeId !== "string" ||
    typeof delegatedBridgePath !== "string" ||
    delegatedBridgeArtifact === null ||
    nextTaskIds.length === 0
  ) {
    throw new ComathError("Goal 3 selected-tranche next packaging follow-through has no next delegated bridge", {
      statusCode: 409,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_FOLLOW_THROUGH_NO_NEXT_BRIDGE"
    });
  }

  const delegated = readDelegatedBridgeArtifact(projectRoot, delegatedBridgeId, delegatedBridgePath, delegatedBridgeArtifact);
  const delegatedTaskIds = assertStringArray(delegated.body.next_execution_task_ids);
  const embeddedDelegatedTaskIds = assertStringArray(
    task338.body.next_proof_breadth_execution_bridge?.next_execution_task_ids
  );
  if (
    delegated.body.project_id !== projectId ||
    !sameStringArray(nextTaskIds, delegatedTaskIds) ||
    (embeddedDelegatedTaskIds.length > 0 && !sameStringArray(nextTaskIds, embeddedDelegatedTaskIds))
  ) {
    throw new ComathError("Goal 3 selected-tranche next packaging follow-through delegated Task326 bridge mismatch", {
      statusCode: 409,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_FOLLOW_THROUGH_DELEGATED_BRIDGE_MISMATCH"
    });
  }

  const evidenceByTaskId = input.evidence_by_task_id ?? {};
  assertNoUnselectedEvidence(new Set(nextTaskIds), evidenceByTaskId);

  const actor = sanitizeActor(input.actor);
  const claimIdPrefix = typeof input.claim_id_prefix === "string" && input.claim_id_prefix.trim().length > 0
    ? input.claim_id_prefix.trim()
    : "C-T340";
  const taskLocalFollowThroughId = assertSafeId(
    input.task_local_packaging_follow_through_id ?? `${followThroughId}-TASK334`,
    "task_local_packaging_follow_through_id"
  );
  const taskLocal = recordGoal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThrough(projectRoot, {
    project_id: projectId,
    task_local_packaging_follow_through_id: taskLocalFollowThroughId,
    proof_breadth_execution_bridge_id: delegatedBridgeId,
    proof_breadth_execution_bridge_path: delegatedBridgePath,
    proof_breadth_execution_bridge_sha256: delegated.artifact.sha256,
    claim_id_prefix: claimIdPrefix,
    evidence_by_task_id: evidenceByTaskId,
    actor,
    requested_follow_through_mode: "open_formal_workbench_release_candidate_task_local_lean_authority_packaging_follow_through"
  });

  const callerAuthorityMaterialIgnored = callerProofOrGaMaterialPresent(input);
  const blockerReasons = uniqueStrings([
    ...assertStringArray(task338.body.blocker_reasons),
    ...taskLocal.blocker_reasons,
    ...(callerAuthorityMaterialIgnored ? ["caller_proof_or_ga_authority_material_ignored"] : [])
  ]);
  const body = {
    schema_version: "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_packaging_follow_through.v1",
    selected_tranche_next_packaging_follow_through_id: followThroughId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    ok: taskLocal.ok,
    follow_through_status: taskLocal.ok
      ? "next_selected_tranche_task_local_packaging_verified"
      : "blocked_next_selected_tranche_task_local_packaging_incomplete",
    selected_tranche_next_packaging_follow_through_path: followThroughPath,
    requested_follow_through_mode: "open_formal_workbench_release_candidate_selected_tranche_next_packaging_follow_through",
    selected_tranche_next_execution_bridge_id: task338Id,
    selected_tranche_next_execution_bridge_path: task338Path,
    selected_tranche_next_execution_bridge_artifact: task338.artifact,
    delegated_proof_breadth_execution_bridge_id: delegatedBridgeId,
    delegated_proof_breadth_execution_bridge_path: delegatedBridgePath,
    delegated_proof_breadth_execution_bridge_artifact: delegated.artifact,
    task_local_packaging_follow_through_id: taskLocal.task_local_packaging_follow_through_id,
    task_local_packaging_follow_through_path: taskLocal.task_local_packaging_follow_through_path,
    task_local_packaging_follow_through_artifact: artifactForProjectFile(
      projectRoot,
      taskLocal.task_local_packaging_follow_through_path,
      "goal3_release_candidate_proof_breadth_task_local_packaging_follow_through"
    ),
    task_local_packaging_follow_through_status: taskLocal.follow_through_status,
    claim_id_prefix: claimIdPrefix,
    blocker_reasons: blockerReasons,
    selected_task_count: taskLocal.selected_task_count,
    verified_selected_task_count: taskLocal.verified_selected_task_count,
    blocked_selected_task_count: taskLocal.blocked_selected_task_count,
    written_packaging_report_count: taskLocal.written_packaging_report_count,
    selected_task_ids: taskLocal.selected_task_ids,
    verified_selected_task_ids: taskLocal.verified_selected_task_ids,
    blocked_selected_task_ids: taskLocal.blocked_selected_task_ids,
    selected_packaging_report_artifacts: taskLocal.selected_packaging_report_artifacts,
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
    Goal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThrough,
    "selected_tranche_next_packaging_follow_through_artifact"
  >;

  const followThroughText = `${JSON.stringify(body, null, 2)}\n`;
  mkdirSync(dirname(absoluteFollowThroughPath), { recursive: true });
  writeFileSync(absoluteFollowThroughPath, followThroughText, "utf8");
  const result: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThrough = {
    ...body,
    selected_tranche_next_packaging_follow_through_artifact: {
      kind: "goal3_release_candidate_proof_breadth_selected_tranche_next_packaging_follow_through",
      path: followThroughPath,
      sha256: sha256Text(followThroughText),
      size_bytes: Buffer.byteLength(followThroughText, "utf8")
    }
  };

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.goal3_selected_tranche_next_packaging_follow_through_recorded",
    actor,
    target_id: projectId,
    payload: {
      selected_tranche_next_packaging_follow_through_id: followThroughId,
      follow_through_status: result.follow_through_status,
      selected_tranche_next_packaging_follow_through_path: followThroughPath,
      selected_tranche_next_packaging_follow_through_artifact_sha256:
        result.selected_tranche_next_packaging_follow_through_artifact.sha256,
      selected_tranche_next_execution_bridge_id: task338Id,
      selected_tranche_next_execution_bridge_artifact_sha256: task338.artifact.sha256,
      delegated_proof_breadth_execution_bridge_id: delegatedBridgeId,
      delegated_proof_breadth_execution_bridge_artifact_sha256: delegated.artifact.sha256,
      task_local_packaging_follow_through_id: result.task_local_packaging_follow_through_id,
      task_local_packaging_follow_through_artifact_sha256: result.task_local_packaging_follow_through_artifact.sha256,
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
