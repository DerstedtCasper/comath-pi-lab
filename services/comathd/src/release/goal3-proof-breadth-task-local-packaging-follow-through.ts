import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { assertPathAllowed } from "../security/path-policy.js";
import {
  createGoal3GaPositiveTaskManifest,
  packageGoal3GaPositiveMatrixFinalAuthorityEvidenceFromEvidenceV3,
  type FinalAuthorityPackagingV3EvidenceInput,
  type FinalAuthorityPackagingV3Report
} from "./goal3-ga-acceptance.js";
import type {
  Goal3ProofBreadthExecutionTarget,
  Goal3ReleaseCandidateProofBreadthExecutionBridge
} from "./goal3-proof-breadth-execution-bridge.js";

type ArtifactReference = {
  kind: string;
  path: string;
  sha256: string;
  size_bytes: number;
};

type PersistedGoal3ReleaseCandidateProofBreadthExecutionBridge = Omit<
  Goal3ReleaseCandidateProofBreadthExecutionBridge,
  "proof_breadth_execution_bridge_artifact"
>;

export type Goal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThroughInput = {
  project_id: string;
  task_local_packaging_follow_through_id?: string;
  proof_breadth_execution_bridge_id: string;
  proof_breadth_execution_bridge_path: string;
  proof_breadth_execution_bridge_sha256: string;
  claim_id_prefix?: string;
  evidence_by_task_id?: Record<string, FinalAuthorityPackagingV3EvidenceInput | undefined>;
  actor?: string;
  requested_follow_through_mode?: "open_formal_workbench_release_candidate_task_local_lean_authority_packaging_follow_through";
};

export type Goal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThrough = {
  schema_version: "comath.goal3_release_candidate_proof_breadth_task_local_packaging_follow_through.v1";
  task_local_packaging_follow_through_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  ok: boolean;
  follow_through_status:
    | "selected_tranche_task_local_packaging_verified"
    | "blocked_selected_tranche_packaging_incomplete"
    | "blocked_bridge_has_no_selected_tranche";
  task_local_packaging_follow_through_path: string;
  requested_follow_through_mode: "open_formal_workbench_release_candidate_task_local_lean_authority_packaging_follow_through";
  proof_breadth_execution_bridge_id: string;
  proof_breadth_execution_bridge_path: string;
  proof_breadth_execution_bridge_artifact: ArtifactReference;
  claim_id_prefix: string;
  blocker_reasons: string[];
  selected_task_count: number;
  verified_selected_task_count: number;
  blocked_selected_task_count: number;
  missing_selected_task_count: 0;
  written_packaging_report_count: number;
  selected_task_ids: string[];
  verified_selected_task_ids: string[];
  blocked_selected_task_ids: string[];
  missing_selected_task_ids: [];
  selected_packaging_reports: FinalAuthorityPackagingV3Report[];
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
  task_local_packaging_follow_through_artifact: ArtifactReference;
};

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function taskLocalPackagingFollowThroughPath(followThroughId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "goal3-task-local-packaging-follow-through", followThroughId, "follow-through.json")
  );
}

function proofBreadthExecutionBridgePath(bridgeId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "goal3-proof-breadth-execution-bridge", bridgeId, "bridge.json")
  );
}

function finalAuthorityPackagingReportPath(taskId: string): string {
  return normalizeRelativePath(join(".comath", "release", "positive_matrix", taskId, "final_authority_packaging_report_v3.json"));
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
      code: "GOAL3_TASK_LOCAL_PACKAGING_FOLLOW_THROUGH_INVALID_ID"
    });
  }
  return id;
}

function assertSha256(value: string | undefined): string {
  const sha256 = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-f0-9]{64}$/u.test(sha256)) {
    throw new ComathError("Goal 3 task-local packaging follow-through bridge hash is invalid", {
      statusCode: 400,
      code: "GOAL3_TASK_LOCAL_PACKAGING_FOLLOW_THROUGH_INVALID_BRIDGE_HASH"
    });
  }
  return sha256;
}

function sanitizeActor(value: string | undefined): string {
  return (value ?? "goal3-task-local-packaging-follow-through")
    .replace(/(?:[A-Za-z]:[\\/][^\s"']+|\\\\[^\s"']+)/gu, "[redacted-path]")
    .replace(/(?:Authorization:\s*Bearer\s+\S+|api_key=\S+|token=\S+|sk-[A-Za-z0-9_-]+)/giu, "[redacted-secret]")
    .replace(
      /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|kernel_checked|proof_success|GA certified|can_certify_ga\s*[:=]\s*(?:true|1)|can_promote_claim\s*[:=]\s*(?:true|1))\b/giu,
      "[redacted-authority-claim]"
    )
    .slice(0, 400);
}

function readJsonArtifact<T>(
  projectRoot: string,
  relativePath: string,
  kind: string
): { body: T; artifact: ArtifactReference } | null {
  const absolutePath = assertPathAllowed(projectRoot, relativePath, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    return null;
  }
  const content = readFileSync(absolutePath);
  try {
    return {
      body: JSON.parse(content.toString("utf8")) as T,
      artifact: {
        kind,
        path: relativePath,
        sha256: sha256Bytes(content),
        size_bytes: content.byteLength
      }
    };
  } catch {
    return null;
  }
}

function artifactForProjectFile(projectRoot: string, relativePath: string, kind: string): ArtifactReference {
  const absolutePath = assertPathAllowed(projectRoot, relativePath, { purpose: "read", resolveRealpath: true });
  const content = readFileSync(absolutePath);
  return {
    kind,
    path: relativePath,
    sha256: sha256Bytes(content),
    size_bytes: content.byteLength
  };
}

function assertBridgePath(inputPath: string | undefined, bridgeId: string): string {
  const normalizedInputPath = normalizeRelativePath(typeof inputPath === "string" ? inputPath.trim() : "");
  const expectedPath = proofBreadthExecutionBridgePath(bridgeId);
  if (normalizedInputPath !== expectedPath) {
    throw new ComathError("Goal 3 task-local packaging follow-through bridge path mismatch", {
      statusCode: 400,
      code: "GOAL3_TASK_LOCAL_PACKAGING_FOLLOW_THROUGH_BRIDGE_PATH_MISMATCH"
    });
  }
  return expectedPath;
}

function assertBridgeArtifact(
  projectRoot: string,
  projectId: string,
  bridgeId: string,
  bridgePath: string,
  expectedSha256: string
): { body: PersistedGoal3ReleaseCandidateProofBreadthExecutionBridge; artifact: ArtifactReference } {
  const bridge = readJsonArtifact<PersistedGoal3ReleaseCandidateProofBreadthExecutionBridge>(
    projectRoot,
    bridgePath,
    "goal3_release_candidate_proof_breadth_execution_bridge"
  );
  if (bridge === null) {
    throw new ComathError("Goal 3 task-local packaging follow-through bridge artifact is missing", {
      statusCode: 404,
      code: "GOAL3_TASK_LOCAL_PACKAGING_FOLLOW_THROUGH_BRIDGE_MISSING"
    });
  }
  if (bridge.artifact.sha256 !== expectedSha256) {
    throw new ComathError("Goal 3 task-local packaging follow-through bridge hash is stale", {
      statusCode: 409,
      code: "GOAL3_TASK_LOCAL_PACKAGING_FOLLOW_THROUGH_STALE_BRIDGE"
    });
  }
  if (
    bridge.body.schema_version !== "comath.goal3_release_candidate_proof_breadth_execution_bridge.v1" ||
    bridge.body.project_id !== projectId ||
    bridge.body.proof_breadth_execution_bridge_id !== bridgeId ||
    bridge.body.proof_breadth_execution_bridge_path !== bridgePath ||
    !Array.isArray(bridge.body.next_execution_task_ids) ||
    !Array.isArray(bridge.body.next_execution_targets) ||
    bridge.body.proof_authority !== "none" ||
    bridge.body.can_promote_claim !== false ||
    bridge.body.can_certify_ga !== false
  ) {
    throw new ComathError("Goal 3 task-local packaging follow-through bridge artifact is invalid", {
      statusCode: 400,
      code: "GOAL3_TASK_LOCAL_PACKAGING_FOLLOW_THROUGH_INVALID_BRIDGE"
    });
  }
  return bridge;
}

function assertSelectedTasksInManifest(selectedTaskIds: string[]): void {
  const manifestTaskIds = new Set(createGoal3GaPositiveTaskManifest().tasks.map((task) => task.task_id));
  for (const taskId of selectedTaskIds) {
    if (!manifestTaskIds.has(taskId)) {
      throw new ComathError("Goal 3 task-local packaging follow-through selected task is outside the manifest", {
        statusCode: 400,
        code: "GOAL3_TASK_LOCAL_PACKAGING_FOLLOW_THROUGH_INVALID_SELECTED_TASK"
      });
    }
  }
}

function assertBridgeTargetsMatchSelectedTasks(
  selectedTaskIds: string[],
  bridgeTargets: Goal3ProofBreadthExecutionTarget[]
): void {
  for (const taskId of selectedTaskIds) {
    const target = bridgeTargets.find((candidate) => candidate.task_id === taskId);
    if (target === undefined || target.expected_packaging_report_path !== finalAuthorityPackagingReportPath(taskId)) {
      throw new ComathError("Goal 3 task-local packaging follow-through bridge target is invalid", {
        statusCode: 400,
        code: "GOAL3_TASK_LOCAL_PACKAGING_FOLLOW_THROUGH_INVALID_BRIDGE_TARGET"
      });
    }
  }
}

function callerProofOrGaMaterialPresent(input: Goal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThroughInput): boolean {
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

function assertNoUnselectedEvidence(
  selectedTaskIds: Set<string>,
  evidenceByTaskId: Record<string, FinalAuthorityPackagingV3EvidenceInput | undefined>
): void {
  for (const taskId of Object.keys(evidenceByTaskId)) {
    if (!selectedTaskIds.has(taskId)) {
      throw new ComathError("Goal 3 task-local packaging follow-through evidence is outside the selected tranche", {
        statusCode: 400,
        code: "GOAL3_TASK_LOCAL_PACKAGING_FOLLOW_THROUGH_UNSELECTED_EVIDENCE"
      });
    }
  }
}

export function recordGoal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThrough(
  projectRoot: string,
  input: Goal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThroughInput
): Goal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThrough {
  const projectId = assertSafeId(input.project_id, "project_id");
  const followThroughId = assertSafeId(input.task_local_packaging_follow_through_id, "task_local_packaging_follow_through_id");
  const bridgeId = assertSafeId(input.proof_breadth_execution_bridge_id, "proof_breadth_execution_bridge_id");
  const bridgeSha256 = assertSha256(input.proof_breadth_execution_bridge_sha256);
  const bridgePath = assertBridgePath(input.proof_breadth_execution_bridge_path, bridgeId);
  const requestedMode =
    input.requested_follow_through_mode ??
    "open_formal_workbench_release_candidate_task_local_lean_authority_packaging_follow_through";
  if (requestedMode !== "open_formal_workbench_release_candidate_task_local_lean_authority_packaging_follow_through") {
    throw new ComathError("Goal 3 task-local packaging follow-through mode is invalid", {
      statusCode: 400,
      code: "GOAL3_TASK_LOCAL_PACKAGING_FOLLOW_THROUGH_INVALID_MODE"
    });
  }

  const followThroughPath = taskLocalPackagingFollowThroughPath(followThroughId);
  const absoluteFollowThroughPath = assertPathAllowed(projectRoot, followThroughPath, { purpose: "runtime-write" });
  if (existsSync(absoluteFollowThroughPath)) {
    throw new ComathError("Goal 3 task-local packaging follow-through already exists", {
      statusCode: 409,
      code: "GOAL3_TASK_LOCAL_PACKAGING_FOLLOW_THROUGH_ALREADY_EXISTS"
    });
  }

  const bridge = assertBridgeArtifact(projectRoot, projectId, bridgeId, bridgePath, bridgeSha256);
  const selectedTaskIds = [...bridge.body.next_execution_task_ids];
  assertSelectedTasksInManifest(selectedTaskIds);
  assertBridgeTargetsMatchSelectedTasks(selectedTaskIds, bridge.body.next_execution_targets);
  const selectedTaskIdSet = new Set(selectedTaskIds);
  const evidenceByTaskId = input.evidence_by_task_id ?? {};
  assertNoUnselectedEvidence(selectedTaskIdSet, evidenceByTaskId);

  const claimIdPrefix = typeof input.claim_id_prefix === "string" && input.claim_id_prefix.trim().length > 0
    ? input.claim_id_prefix.trim()
    : "C";
  const selectedPackagingReports = selectedTaskIds.map((taskId) =>
    packageGoal3GaPositiveMatrixFinalAuthorityEvidenceFromEvidenceV3({
      projectRoot,
      taskId,
      claimId: `${claimIdPrefix}-${taskId}`,
      evidence: evidenceByTaskId[taskId]
    })
  );
  const selectedPackagingReportArtifacts = selectedPackagingReports.map((report) =>
    artifactForProjectFile(projectRoot, report.packaging_report_path, "final_authority_packaging_report_v3")
  );
  const verifiedSelectedTaskIds = selectedPackagingReports
    .filter((report) => report.final_evidence_status === "verified_final_authority_evidence")
    .map((report) => report.task_id ?? "")
    .filter(Boolean);
  const blockedSelectedTaskIds = selectedPackagingReports
    .filter((report) => report.final_evidence_status !== "verified_final_authority_evidence")
    .map((report) => report.task_id ?? "")
    .filter(Boolean);
  const selectedTrancheVerified = selectedTaskIds.length > 0 && verifiedSelectedTaskIds.length === selectedTaskIds.length;
  const callerAuthorityMaterialIgnored = callerProofOrGaMaterialPresent(input);
  const blockerReasons = [
    ...(selectedTaskIds.length === 0 ? ["bridge_has_no_selected_positive_matrix_tranche"] : []),
    ...(selectedTrancheVerified ? [] : ["selected_positive_matrix_tranche_packaging_incomplete"]),
    ...(blockedSelectedTaskIds.length > 0 ? ["selected_positive_matrix_task_local_packaging_blocked"] : []),
    ...(callerAuthorityMaterialIgnored ? ["caller_proof_or_ga_authority_material_ignored"] : [])
  ];
  const actor = sanitizeActor(input.actor);
  const body = {
    schema_version: "comath.goal3_release_candidate_proof_breadth_task_local_packaging_follow_through.v1",
    task_local_packaging_follow_through_id: followThroughId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    ok: selectedTrancheVerified,
    follow_through_status:
      selectedTaskIds.length === 0
        ? "blocked_bridge_has_no_selected_tranche"
        : selectedTrancheVerified
          ? "selected_tranche_task_local_packaging_verified"
          : "blocked_selected_tranche_packaging_incomplete",
    task_local_packaging_follow_through_path: followThroughPath,
    requested_follow_through_mode: "open_formal_workbench_release_candidate_task_local_lean_authority_packaging_follow_through",
    proof_breadth_execution_bridge_id: bridgeId,
    proof_breadth_execution_bridge_path: bridgePath,
    proof_breadth_execution_bridge_artifact: bridge.artifact,
    claim_id_prefix: claimIdPrefix,
    blocker_reasons: blockerReasons,
    selected_task_count: selectedTaskIds.length,
    verified_selected_task_count: verifiedSelectedTaskIds.length,
    blocked_selected_task_count: blockedSelectedTaskIds.length,
    missing_selected_task_count: 0,
    written_packaging_report_count: selectedPackagingReports.length,
    selected_task_ids: selectedTaskIds,
    verified_selected_task_ids: verifiedSelectedTaskIds,
    blocked_selected_task_ids: blockedSelectedTaskIds,
    missing_selected_task_ids: [],
    selected_packaging_reports: selectedPackagingReports,
    selected_packaging_report_artifacts: selectedPackagingReportArtifacts,
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
    Goal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThrough,
    "task_local_packaging_follow_through_artifact"
  >;

  const followThroughText = `${JSON.stringify(body, null, 2)}\n`;
  mkdirSync(dirname(absoluteFollowThroughPath), { recursive: true });
  writeFileSync(absoluteFollowThroughPath, followThroughText, "utf8");
  const result: Goal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThrough = {
    ...body,
    task_local_packaging_follow_through_artifact: {
      kind: "goal3_release_candidate_proof_breadth_task_local_packaging_follow_through",
      path: followThroughPath,
      sha256: sha256Text(followThroughText),
      size_bytes: Buffer.byteLength(followThroughText, "utf8")
    }
  };

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.goal3_task_local_lean_authority_packaging_follow_through_recorded",
    actor,
    target_id: projectId,
    payload: {
      task_local_packaging_follow_through_id: followThroughId,
      follow_through_status: result.follow_through_status,
      task_local_packaging_follow_through_path: followThroughPath,
      task_local_packaging_follow_through_artifact_sha256:
        result.task_local_packaging_follow_through_artifact.sha256,
      proof_breadth_execution_bridge_id: bridgeId,
      proof_breadth_execution_bridge_artifact_sha256: bridge.artifact.sha256,
      selected_task_ids: selectedTaskIds,
      verified_selected_task_count: result.verified_selected_task_count,
      blocked_selected_task_count: result.blocked_selected_task_count,
      written_packaging_report_count: result.written_packaging_report_count,
      blocker_reasons: blockerReasons,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  });
  return result;
}
