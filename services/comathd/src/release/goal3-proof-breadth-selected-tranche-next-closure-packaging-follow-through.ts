import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { assertPathAllowed } from "../security/path-policy.js";
import type { Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureExecutionBridge } from "./goal3-proof-breadth-selected-tranche-next-closure-execution-bridge.js";
import type { Goal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge } from "./goal3-proof-breadth-selected-tranche-next-execution-bridge.js";
import {
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThrough,
  type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThroughInput
} from "./goal3-proof-breadth-selected-tranche-next-packaging-follow-through.js";

type ArtifactReference = {
  kind: string;
  path: string;
  sha256: string;
  size_bytes: number;
};

type EvidenceByTaskId = NonNullable<Goal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThroughInput["evidence_by_task_id"]>;

type PersistedSelectedTrancheNextClosureExecutionBridge = Omit<
  Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureExecutionBridge,
  "selected_tranche_next_closure_execution_bridge_artifact"
>;

type PersistedSelectedTrancheNextExecutionBridge = Omit<
  Goal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge,
  "selected_tranche_next_execution_bridge_artifact"
>;

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingFollowThroughInput = {
  project_id: string;
  selected_tranche_next_closure_packaging_follow_through_id?: string;
  selected_tranche_next_closure_execution_bridge_id: string;
  selected_tranche_next_closure_execution_bridge_path: string;
  selected_tranche_next_closure_execution_bridge_sha256: string;
  selected_tranche_next_packaging_follow_through_id?: string;
  task_local_packaging_follow_through_id?: string;
  claim_id_prefix?: string;
  evidence_by_task_id?: EvidenceByTaskId;
  actor?: string;
  requested_follow_through_mode?: "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_follow_through";
};

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingFollowThrough = {
  schema_version: "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_follow_through.v1";
  selected_tranche_next_closure_packaging_follow_through_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  ok: boolean;
  follow_through_status:
    | "next_selected_tranche_task_local_packaging_verified"
    | "blocked_next_selected_tranche_task_local_packaging_incomplete";
  selected_tranche_next_closure_packaging_follow_through_path: string;
  requested_follow_through_mode: "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_follow_through";
  selected_tranche_next_closure_execution_bridge_id: string;
  selected_tranche_next_closure_execution_bridge_path: string;
  selected_tranche_next_closure_execution_bridge_artifact: ArtifactReference;
  delegated_selected_tranche_next_execution_bridge_id: string;
  delegated_selected_tranche_next_execution_bridge_path: string;
  delegated_selected_tranche_next_execution_bridge_artifact: ArtifactReference;
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
  selected_tranche_next_closure_packaging_follow_through_artifact: ArtifactReference;
};

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function selectedTrancheNextClosurePackagingFollowThroughPath(followThroughId: string): string {
  return normalizeRelativePath(
    join(
      ".comath",
      "release",
      "goal3-selected-tranche-next-closure-packaging-follow-through",
      followThroughId,
      "follow-through.json"
    )
  );
}

function selectedTrancheNextClosureExecutionBridgePath(bridgeId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "goal3-selected-tranche-next-closure-execution-bridge", bridgeId, "bridge.json")
  );
}

function selectedTrancheNextExecutionBridgePath(bridgeId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "goal3-selected-tranche-next-execution-bridge", bridgeId, "bridge.json")
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
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_FOLLOW_THROUGH_INVALID_ID"
    });
  }
  return id;
}

function assertSha256(value: string | undefined): string {
  const sha256 = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-f0-9]{64}$/u.test(sha256)) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging follow-through hash is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_FOLLOW_THROUGH_INVALID_HASH"
    });
  }
  return sha256;
}

function assertTask344Path(path: string | undefined, bridgeId: string): string {
  const normalized = normalizeRelativePath(typeof path === "string" ? path.trim() : "");
  const expected = selectedTrancheNextClosureExecutionBridgePath(bridgeId);
  if (normalized !== expected) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging follow-through Task344 path mismatch", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_FOLLOW_THROUGH_TASK344_PATH_MISMATCH"
    });
  }
  return expected;
}

function parseJsonArtifact<T>(bytes: Buffer, code: string, message: string): T {
  try {
    return JSON.parse(bytes.toString("utf8")) as T;
  } catch {
    throw new ComathError(message, { statusCode: 400, code });
  }
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
    actual.path === normalizeRelativePath(expected.path) &&
    actual.sha256 === expected.sha256 &&
    actual.size_bytes === expected.size_bytes
  );
}

function assertStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function sameStringArray(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function sanitizeActor(actor: string | undefined): string {
  const text =
    typeof actor === "string" && actor.trim().length > 0
      ? actor.trim()
      : "goal3-selected-tranche-next-closure-packaging-follow-through";
  return text
    .replace(/(?:[A-Za-z]:[\\/][^\s"']+|\\\\[^\s"']+)/gu, "[redacted-path]")
    .replace(/(?:Authorization:\s*Bearer\s+\S+|api_key=\S+|token=\S+|sk-[A-Za-z0-9_-]+)/giu, "[redacted-secret]")
    .replace(
      /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|kernel_checked|proof_success|GA certified|can_certify_ga\s*[:=]\s*(?:true|1)|can_promote_claim\s*[:=]\s*(?:true|1))\b/giu,
      "[redacted-authority-claim]"
    )
    .slice(0, 400);
}

function readTask344Artifact(
  projectRoot: string,
  bridgeId: string,
  bridgePath: string,
  bridgeSha256: string
): { body: PersistedSelectedTrancheNextClosureExecutionBridge; artifact: ArtifactReference } {
  const absolutePath = assertPathAllowed(projectRoot, bridgePath);
  if (!existsSync(absolutePath)) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging follow-through Task344 artifact is missing", {
      statusCode: 404,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_FOLLOW_THROUGH_TASK344_MISSING"
    });
  }
  const bytes = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(bytes);
  if (actualSha256 !== bridgeSha256) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging follow-through Task344 artifact is stale", {
      statusCode: 409,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_FOLLOW_THROUGH_STALE_TASK344"
    });
  }
  const body = parseJsonArtifact<PersistedSelectedTrancheNextClosureExecutionBridge>(
    bytes,
    "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_FOLLOW_THROUGH_INVALID_TASK344",
    "Goal 3 selected-tranche next closure packaging follow-through Task344 artifact is invalid"
  );
  if (
    body.schema_version !== "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_execution_bridge.v1" ||
    body.selected_tranche_next_closure_execution_bridge_id !== bridgeId ||
    normalizeRelativePath(body.selected_tranche_next_closure_execution_bridge_path) !== bridgePath ||
    body.runs_lean !== false ||
    body.executes_proofs !== false ||
    body.accepts_caller_success_metadata !== false ||
    body.accepts_caller_proof_material !== false ||
    body.proof_authority !== "none" ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    body.ga_certification_gate_separate !== true
  ) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging follow-through Task344 artifact is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_FOLLOW_THROUGH_INVALID_TASK344"
    });
  }
  return {
    body,
    artifact: {
      kind: "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_execution_bridge",
      path: bridgePath,
      sha256: actualSha256,
      size_bytes: bytes.byteLength
    }
  };
}

function readDelegatedTask338Artifact(
  projectRoot: string,
  projectId: string,
  task338Id: string,
  task338Path: string,
  expectedArtifact: ArtifactReference,
  expectedTaskIds: string[]
): { body: PersistedSelectedTrancheNextExecutionBridge; artifact: ArtifactReference } {
  const normalizedPath = normalizeRelativePath(task338Path);
  const expectedPath = selectedTrancheNextExecutionBridgePath(task338Id);
  if (normalizedPath !== expectedPath) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging follow-through delegated Task338 path mismatch", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_FOLLOW_THROUGH_DELEGATED_TASK338_MISMATCH"
    });
  }
  const absolutePath = assertPathAllowed(projectRoot, normalizedPath);
  if (!existsSync(absolutePath)) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging follow-through delegated Task338 is missing", {
      statusCode: 404,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_FOLLOW_THROUGH_DELEGATED_TASK338_MISSING"
    });
  }
  const bytes = readFileSync(absolutePath);
  const artifact = {
    kind: "goal3_release_candidate_proof_breadth_selected_tranche_next_execution_bridge",
    path: normalizedPath,
    sha256: sha256Bytes(bytes),
    size_bytes: bytes.byteLength
  };
  if (!artifactReferenceMatches(artifact, expectedArtifact)) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging follow-through delegated Task338 is stale", {
      statusCode: 409,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_FOLLOW_THROUGH_STALE_TASK338"
    });
  }
  const body = parseJsonArtifact<PersistedSelectedTrancheNextExecutionBridge>(
    bytes,
    "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_FOLLOW_THROUGH_INVALID_TASK338",
    "Goal 3 selected-tranche next closure packaging follow-through delegated Task338 is invalid"
  );
  const task338TaskIds = assertStringArray(body.next_execution_task_ids);
  if (
    body.schema_version !== "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_execution_bridge.v1" ||
    body.project_id !== projectId ||
    body.selected_tranche_next_execution_bridge_id !== task338Id ||
    normalizeRelativePath(body.selected_tranche_next_execution_bridge_path) !== normalizedPath ||
    body.bridge_status !== "ready_for_next_selected_tranche_execution" ||
    body.proof_breadth_complete !== false ||
    !isArtifactReference(body.next_proof_breadth_execution_bridge_artifact) ||
    typeof body.next_proof_breadth_execution_bridge_id !== "string" ||
    typeof body.next_proof_breadth_execution_bridge_path !== "string" ||
    !sameStringArray(expectedTaskIds, task338TaskIds)
  ) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging follow-through delegated Task338 is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_FOLLOW_THROUGH_INVALID_TASK338"
    });
  }
  return { body, artifact };
}

function assertNoUnselectedEvidence(selectedTaskIds: Set<string>, evidenceByTaskId: EvidenceByTaskId): void {
  for (const taskId of Object.keys(evidenceByTaskId)) {
    if (!selectedTaskIds.has(taskId)) {
      throw new ComathError("Goal 3 selected-tranche next closure packaging follow-through evidence is outside the Task344 next tranche", {
        statusCode: 400,
        code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_FOLLOW_THROUGH_UNSELECTED_EVIDENCE"
      });
    }
  }
}

function callerProofOrGaMaterialPresent(
  input: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingFollowThroughInput
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

export function recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingFollowThrough(
  projectRoot: string,
  input: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingFollowThroughInput
): Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingFollowThrough {
  const projectId = assertSafeId(input.project_id, "project_id");
  const followThroughId = assertSafeId(
    input.selected_tranche_next_closure_packaging_follow_through_id,
    "selected_tranche_next_closure_packaging_follow_through_id"
  );
  const task344Id = assertSafeId(
    input.selected_tranche_next_closure_execution_bridge_id,
    "selected_tranche_next_closure_execution_bridge_id"
  );
  const task344Sha256 = assertSha256(input.selected_tranche_next_closure_execution_bridge_sha256);
  const task344Path = assertTask344Path(input.selected_tranche_next_closure_execution_bridge_path, task344Id);
  const requestedMode =
    input.requested_follow_through_mode ??
    "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_follow_through";
  if (requestedMode !== "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_follow_through") {
    throw new ComathError("Goal 3 selected-tranche next closure packaging follow-through mode is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_FOLLOW_THROUGH_INVALID_MODE"
    });
  }

  const followThroughPath = selectedTrancheNextClosurePackagingFollowThroughPath(followThroughId);
  const absoluteFollowThroughPath = assertPathAllowed(projectRoot, followThroughPath, { purpose: "runtime-write" });
  if (existsSync(absoluteFollowThroughPath)) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging follow-through already exists", {
      statusCode: 409,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_FOLLOW_THROUGH_ALREADY_EXISTS"
    });
  }

  const task344 = readTask344Artifact(projectRoot, task344Id, task344Path, task344Sha256);
  if (task344.body.project_id !== projectId) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging follow-through project id mismatch", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_FOLLOW_THROUGH_INVALID_TASK344"
    });
  }

  const nextTaskIds = assertStringArray(task344.body.next_execution_task_ids);
  const task338Id = task344.body.delegated_selected_tranche_next_execution_bridge_id;
  const task338Path = task344.body.delegated_selected_tranche_next_execution_bridge_path;
  const task338Artifact = task344.body.delegated_selected_tranche_next_execution_bridge_artifact;
  const task344NextBridgeId = task344.body.next_proof_breadth_execution_bridge_id;
  const task344NextBridgePath = task344.body.next_proof_breadth_execution_bridge_path;
  const task344NextBridgeArtifact = task344.body.next_proof_breadth_execution_bridge_artifact;
  if (
    task344.body.bridge_status !== "ready_for_next_selected_tranche_execution" ||
    task344.body.proof_breadth_complete !== false ||
    typeof task338Id !== "string" ||
    typeof task338Path !== "string" ||
    !isArtifactReference(task338Artifact) ||
    typeof task344NextBridgeId !== "string" ||
    typeof task344NextBridgePath !== "string" ||
    !isArtifactReference(task344NextBridgeArtifact) ||
    nextTaskIds.length === 0
  ) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging follow-through has no next delegated bridge", {
      statusCode: 409,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_FOLLOW_THROUGH_NO_NEXT_BRIDGE"
    });
  }

  const delegatedTask338 = readDelegatedTask338Artifact(projectRoot, projectId, task338Id, task338Path, task338Artifact, nextTaskIds);
  const delegatedTask338NextBridgeArtifact = delegatedTask338.body.next_proof_breadth_execution_bridge_artifact;
  if (
    delegatedTask338.body.next_proof_breadth_execution_bridge_id !== task344NextBridgeId ||
    delegatedTask338.body.next_proof_breadth_execution_bridge_path !== task344NextBridgePath ||
    !isArtifactReference(delegatedTask338NextBridgeArtifact) ||
    !artifactReferenceMatches(delegatedTask338NextBridgeArtifact, task344NextBridgeArtifact)
  ) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging follow-through delegated Task338 bridge mismatch", {
      statusCode: 409,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_FOLLOW_THROUGH_DELEGATED_TASK338_MISMATCH"
    });
  }

  const evidenceByTaskId = input.evidence_by_task_id ?? {};
  assertNoUnselectedEvidence(new Set(nextTaskIds), evidenceByTaskId);

  const actor = sanitizeActor(input.actor);
  const task340Id = assertSafeId(
    input.selected_tranche_next_packaging_follow_through_id ?? `${followThroughId}-TASK340`,
    "selected_tranche_next_packaging_follow_through_id"
  );
  const claimIdPrefix =
    typeof input.claim_id_prefix === "string" && input.claim_id_prefix.trim().length > 0
      ? input.claim_id_prefix.trim()
      : "C-T346";
  const task340 = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThrough(projectRoot, {
    project_id: projectId,
    selected_tranche_next_packaging_follow_through_id: task340Id,
    selected_tranche_next_execution_bridge_id: task338Id,
    selected_tranche_next_execution_bridge_path: delegatedTask338.artifact.path,
    selected_tranche_next_execution_bridge_sha256: delegatedTask338.artifact.sha256,
    task_local_packaging_follow_through_id: input.task_local_packaging_follow_through_id,
    claim_id_prefix: claimIdPrefix,
    evidence_by_task_id: evidenceByTaskId,
    actor,
    requested_follow_through_mode: "open_formal_workbench_release_candidate_selected_tranche_next_packaging_follow_through"
  });

  const callerAuthorityMaterialIgnored = callerProofOrGaMaterialPresent(input);
  const blockerReasons = uniqueStrings([
    ...assertStringArray(task344.body.blocker_reasons),
    ...task340.blocker_reasons,
    ...(callerAuthorityMaterialIgnored ? ["caller_proof_or_ga_authority_material_ignored"] : [])
  ]);
  const body = {
    schema_version:
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_follow_through.v1",
    selected_tranche_next_closure_packaging_follow_through_id: followThroughId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    ok: task340.ok,
    follow_through_status: task340.follow_through_status,
    selected_tranche_next_closure_packaging_follow_through_path: followThroughPath,
    requested_follow_through_mode:
      "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_follow_through",
    selected_tranche_next_closure_execution_bridge_id: task344Id,
    selected_tranche_next_closure_execution_bridge_path: task344Path,
    selected_tranche_next_closure_execution_bridge_artifact: task344.artifact,
    delegated_selected_tranche_next_execution_bridge_id: task338Id,
    delegated_selected_tranche_next_execution_bridge_path: delegatedTask338.artifact.path,
    delegated_selected_tranche_next_execution_bridge_artifact: delegatedTask338.artifact,
    selected_tranche_next_packaging_follow_through_id: task340.selected_tranche_next_packaging_follow_through_id,
    selected_tranche_next_packaging_follow_through_path: task340.selected_tranche_next_packaging_follow_through_path,
    selected_tranche_next_packaging_follow_through_artifact:
      task340.selected_tranche_next_packaging_follow_through_artifact,
    task_local_packaging_follow_through_id: task340.task_local_packaging_follow_through_id,
    task_local_packaging_follow_through_path: task340.task_local_packaging_follow_through_path,
    task_local_packaging_follow_through_artifact: task340.task_local_packaging_follow_through_artifact,
    task_local_packaging_follow_through_status: task340.task_local_packaging_follow_through_status,
    claim_id_prefix: claimIdPrefix,
    blocker_reasons: blockerReasons,
    selected_task_count: task340.selected_task_count,
    verified_selected_task_count: task340.verified_selected_task_count,
    blocked_selected_task_count: task340.blocked_selected_task_count,
    written_packaging_report_count: task340.written_packaging_report_count,
    selected_task_ids: task340.selected_task_ids,
    verified_selected_task_ids: task340.verified_selected_task_ids,
    blocked_selected_task_ids: task340.blocked_selected_task_ids,
    selected_packaging_report_artifacts: task340.selected_packaging_report_artifacts,
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
    Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingFollowThrough,
    "selected_tranche_next_closure_packaging_follow_through_artifact"
  >;

  const followThroughText = `${JSON.stringify(body, null, 2)}\n`;
  mkdirSync(dirname(absoluteFollowThroughPath), { recursive: true });
  writeFileSync(absoluteFollowThroughPath, followThroughText, "utf8");
  const result: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingFollowThrough = {
    ...body,
    selected_tranche_next_closure_packaging_follow_through_artifact: {
      kind: "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_follow_through",
      path: followThroughPath,
      sha256: sha256Text(followThroughText),
      size_bytes: Buffer.byteLength(followThroughText, "utf8")
    }
  };

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.goal3_selected_tranche_next_closure_packaging_follow_through_recorded",
    actor,
    target_id: projectId,
    payload: {
      selected_tranche_next_closure_packaging_follow_through_id: followThroughId,
      follow_through_status: result.follow_through_status,
      selected_tranche_next_closure_packaging_follow_through_path: followThroughPath,
      selected_tranche_next_closure_packaging_follow_through_artifact_sha256:
        result.selected_tranche_next_closure_packaging_follow_through_artifact.sha256,
      selected_tranche_next_closure_execution_bridge_id: task344Id,
      selected_tranche_next_closure_execution_bridge_artifact_sha256: task344.artifact.sha256,
      delegated_selected_tranche_next_execution_bridge_id: task338Id,
      delegated_selected_tranche_next_execution_bridge_artifact_sha256: delegatedTask338.artifact.sha256,
      selected_tranche_next_packaging_follow_through_id: task340.selected_tranche_next_packaging_follow_through_id,
      selected_tranche_next_packaging_follow_through_artifact_sha256:
        task340.selected_tranche_next_packaging_follow_through_artifact.sha256,
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
