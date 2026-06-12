import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { assertPathAllowed } from "../security/path-policy.js";
import type { Goal3ReleaseCandidateProofBreadthExecutionBridge } from "./goal3-proof-breadth-execution-bridge.js";
import {
  recordGoal3ReleaseCandidateProofBreadthExecutionFollowThrough,
  type Goal3ReleaseCandidateProofBreadthExecutionFollowThrough
} from "./goal3-proof-breadth-execution-follow-through.js";
import type { Goal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThrough } from "./goal3-proof-breadth-task-local-packaging-follow-through.js";

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

type PersistedGoal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThrough = Omit<
  Goal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThrough,
  "task_local_packaging_follow_through_artifact"
>;

export type Goal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUpInput = {
  project_id: string;
  selected_tranche_packaging_results_follow_up_id?: string;
  proof_breadth_execution_follow_through_id?: string;
  proof_breadth_execution_bridge_id: string;
  proof_breadth_execution_bridge_path: string;
  proof_breadth_execution_bridge_sha256: string;
  task_local_packaging_follow_through_id: string;
  task_local_packaging_follow_through_path: string;
  task_local_packaging_follow_through_sha256: string;
  actor?: string;
  requested_follow_up_mode?: "open_formal_workbench_release_candidate_selected_tranche_packaging_results_follow_up";
};

export type Goal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp = {
  schema_version: "comath.goal3_release_candidate_proof_breadth_selected_tranche_packaging_results_follow_up.v1";
  selected_tranche_packaging_results_follow_up_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  ok: boolean;
  follow_up_status:
    | "selected_tranche_packaging_results_current_for_proof_breadth_closure_recheck"
    | "blocked_selected_tranche_packaging_results_incomplete"
    | "blocked_bridge_has_no_selected_tranche";
  selected_tranche_packaging_results_follow_up_path: string;
  requested_follow_up_mode: "open_formal_workbench_release_candidate_selected_tranche_packaging_results_follow_up";
  proof_breadth_execution_bridge_id: string;
  proof_breadth_execution_bridge_path: string;
  proof_breadth_execution_bridge_artifact: ArtifactReference;
  task_local_packaging_follow_through_id: string;
  task_local_packaging_follow_through_path: string;
  task_local_packaging_follow_through_artifact: ArtifactReference;
  proof_breadth_execution_follow_through_id: string;
  proof_breadth_execution_follow_through_path: string;
  proof_breadth_execution_follow_through_artifact: ArtifactReference;
  proof_breadth_execution_follow_through: Goal3ReleaseCandidateProofBreadthExecutionFollowThrough;
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
  selected_tranche_packaging_results_follow_up_artifact: ArtifactReference;
};

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function selectedTranchePackagingResultsFollowUpPath(followUpId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "goal3-selected-tranche-packaging-results-follow-up", followUpId, "follow-up.json")
  );
}

function proofBreadthExecutionBridgePath(bridgeId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "goal3-proof-breadth-execution-bridge", bridgeId, "bridge.json")
  );
}

function taskLocalPackagingFollowThroughPath(followThroughId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "goal3-task-local-packaging-follow-through", followThroughId, "follow-through.json")
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
      code: "GOAL3_SELECTED_TRANCHE_PACKAGING_RESULTS_FOLLOW_UP_INVALID_ID"
    });
  }
  return id;
}

function assertSha256(value: string | undefined): string {
  const sha256 = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-f0-9]{64}$/u.test(sha256)) {
    throw new ComathError("Goal 3 selected-tranche packaging results follow-up hash is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_PACKAGING_RESULTS_FOLLOW_UP_INVALID_HASH"
    });
  }
  return sha256;
}

function sanitizeActor(value: string | undefined): string {
  return (value ?? "goal3-selected-tranche-packaging-results-follow-up")
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

function callerProofOrGaMaterialPresent(
  input: Goal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUpInput
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

function assertBridgePath(inputPath: string | undefined, bridgeId: string): string {
  const normalizedInputPath = normalizeRelativePath(typeof inputPath === "string" ? inputPath.trim() : "");
  const expectedPath = proofBreadthExecutionBridgePath(bridgeId);
  if (normalizedInputPath !== expectedPath) {
    throw new ComathError("Goal 3 selected-tranche packaging results follow-up bridge path mismatch", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_PACKAGING_RESULTS_FOLLOW_UP_BRIDGE_PATH_MISMATCH"
    });
  }
  return expectedPath;
}

function assertTaskLocalPath(inputPath: string | undefined, followThroughId: string): string {
  const normalizedInputPath = normalizeRelativePath(typeof inputPath === "string" ? inputPath.trim() : "");
  const expectedPath = taskLocalPackagingFollowThroughPath(followThroughId);
  if (normalizedInputPath !== expectedPath) {
    throw new ComathError("Goal 3 selected-tranche packaging results follow-up Task334 path mismatch", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_PACKAGING_RESULTS_FOLLOW_UP_TASK_LOCAL_PATH_MISMATCH"
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
    throw new ComathError("Goal 3 selected-tranche packaging results follow-up bridge artifact is missing", {
      statusCode: 404,
      code: "GOAL3_SELECTED_TRANCHE_PACKAGING_RESULTS_FOLLOW_UP_BRIDGE_MISSING"
    });
  }
  if (bridge.artifact.sha256 !== expectedSha256) {
    throw new ComathError("Goal 3 selected-tranche packaging results follow-up bridge hash is stale", {
      statusCode: 409,
      code: "GOAL3_SELECTED_TRANCHE_PACKAGING_RESULTS_FOLLOW_UP_STALE_BRIDGE"
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
    throw new ComathError("Goal 3 selected-tranche packaging results follow-up bridge artifact is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_PACKAGING_RESULTS_FOLLOW_UP_INVALID_BRIDGE"
    });
  }
  return bridge;
}

function assertTaskLocalPackagingArtifact(
  projectRoot: string,
  projectId: string,
  followThroughId: string,
  followThroughPath: string,
  expectedSha256: string
): { body: PersistedGoal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThrough; artifact: ArtifactReference } {
  const taskLocal = readJsonArtifact<PersistedGoal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThrough>(
    projectRoot,
    followThroughPath,
    "goal3_release_candidate_proof_breadth_task_local_packaging_follow_through"
  );
  if (taskLocal === null) {
    throw new ComathError("Goal 3 selected-tranche packaging results follow-up Task334 artifact is missing", {
      statusCode: 404,
      code: "GOAL3_SELECTED_TRANCHE_PACKAGING_RESULTS_FOLLOW_UP_TASK_LOCAL_PACKAGING_MISSING"
    });
  }
  if (taskLocal.artifact.sha256 !== expectedSha256) {
    throw new ComathError("Goal 3 selected-tranche packaging results follow-up Task334 hash is stale", {
      statusCode: 409,
      code: "GOAL3_SELECTED_TRANCHE_PACKAGING_RESULTS_FOLLOW_UP_STALE_TASK_LOCAL_PACKAGING"
    });
  }
  if (
    taskLocal.body.schema_version !==
      "comath.goal3_release_candidate_proof_breadth_task_local_packaging_follow_through.v1" ||
    taskLocal.body.project_id !== projectId ||
    taskLocal.body.task_local_packaging_follow_through_id !== followThroughId ||
    taskLocal.body.task_local_packaging_follow_through_path !== followThroughPath ||
    taskLocal.body.proof_authority !== "none" ||
    taskLocal.body.can_promote_claim !== false ||
    taskLocal.body.can_certify_ga !== false ||
    taskLocal.body.proof_breadth_complete !== false ||
    taskLocal.body.final_ga_audit_unblocked !== false ||
    taskLocal.body.runs_lean !== false ||
    taskLocal.body.executes_proofs !== false ||
    !Array.isArray(taskLocal.body.selected_task_ids) ||
    !Array.isArray(taskLocal.body.selected_packaging_report_artifacts)
  ) {
    throw new ComathError("Goal 3 selected-tranche packaging results follow-up Task334 artifact is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_PACKAGING_RESULTS_FOLLOW_UP_INVALID_TASK_LOCAL_PACKAGING"
    });
  }
  return taskLocal;
}

function assertTaskLocalMatchesBridge(
  bridge: { body: PersistedGoal3ReleaseCandidateProofBreadthExecutionBridge; artifact: ArtifactReference },
  taskLocal: { body: PersistedGoal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThrough; artifact: ArtifactReference },
  bridgeId: string,
  bridgePath: string
): void {
  const bridgeSelectedTaskIds = bridge.body.next_execution_task_ids;
  const taskLocalSelectedTaskIds = taskLocal.body.selected_task_ids;
  const sameSelectedTasks =
    bridgeSelectedTaskIds.length === taskLocalSelectedTaskIds.length &&
    bridgeSelectedTaskIds.every((taskId, index) => taskId === taskLocalSelectedTaskIds[index]);
  if (
    taskLocal.body.proof_breadth_execution_bridge_id !== bridgeId ||
    taskLocal.body.proof_breadth_execution_bridge_path !== bridgePath ||
    taskLocal.body.proof_breadth_execution_bridge_artifact.sha256 !== bridge.artifact.sha256 ||
    !sameSelectedTasks ||
    taskLocal.body.selected_task_count !== bridgeSelectedTaskIds.length ||
    taskLocal.body.selected_packaging_report_artifacts.length !== bridgeSelectedTaskIds.length
  ) {
    throw new ComathError("Goal 3 selected-tranche packaging results follow-up Task334 artifact does not match the bridge selected tranche", {
      statusCode: 409,
      code: "GOAL3_SELECTED_TRANCHE_PACKAGING_RESULTS_FOLLOW_UP_TASK_LOCAL_MISMATCH"
    });
  }
}

function assertSelectedPackagingReportsCurrent(
  projectRoot: string,
  selectedTaskIds: string[],
  artifacts: ArtifactReference[]
): ArtifactReference[] {
  const artifactsByPath = new Map(artifacts.map((artifact) => [artifact.path, artifact]));
  return selectedTaskIds.map((taskId) => {
    const expectedPath = finalAuthorityPackagingReportPath(taskId);
    const artifact = artifactsByPath.get(expectedPath);
    if (artifact === undefined || artifact.kind !== "final_authority_packaging_report_v3") {
      throw new ComathError("Goal 3 selected-tranche packaging results follow-up Task334 report artifact is incomplete", {
        statusCode: 409,
        code: "GOAL3_SELECTED_TRANCHE_PACKAGING_RESULTS_FOLLOW_UP_STALE_PACKAGING_REPORT"
      });
    }
    const current = readJsonArtifact<unknown>(projectRoot, expectedPath, "final_authority_packaging_report_v3");
    if (
      current === null ||
      current.artifact.sha256 !== artifact.sha256 ||
      current.artifact.size_bytes !== artifact.size_bytes
    ) {
      throw new ComathError("Goal 3 selected-tranche packaging results follow-up selected packaging report hash is stale", {
        statusCode: 409,
        code: "GOAL3_SELECTED_TRANCHE_PACKAGING_RESULTS_FOLLOW_UP_STALE_PACKAGING_REPORT"
      });
    }
    return current.artifact;
  });
}

export function recordGoal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp(
  projectRoot: string,
  input: Goal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUpInput
): Goal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp {
  const projectId = assertSafeId(input.project_id, "project_id");
  const followUpId = assertSafeId(
    input.selected_tranche_packaging_results_follow_up_id,
    "selected_tranche_packaging_results_follow_up_id"
  );
  const executionFollowThroughId = assertSafeId(
    input.proof_breadth_execution_follow_through_id ?? `${followUpId}-TASK332-RECHECK`,
    "proof_breadth_execution_follow_through_id"
  );
  const bridgeId = assertSafeId(input.proof_breadth_execution_bridge_id, "proof_breadth_execution_bridge_id");
  const bridgeSha256 = assertSha256(input.proof_breadth_execution_bridge_sha256);
  const bridgePath = assertBridgePath(input.proof_breadth_execution_bridge_path, bridgeId);
  const taskLocalId = assertSafeId(
    input.task_local_packaging_follow_through_id,
    "task_local_packaging_follow_through_id"
  );
  const taskLocalSha256 = assertSha256(input.task_local_packaging_follow_through_sha256);
  const taskLocalPath = assertTaskLocalPath(input.task_local_packaging_follow_through_path, taskLocalId);
  const requestedMode =
    input.requested_follow_up_mode ??
    "open_formal_workbench_release_candidate_selected_tranche_packaging_results_follow_up";
  if (requestedMode !== "open_formal_workbench_release_candidate_selected_tranche_packaging_results_follow_up") {
    throw new ComathError("Goal 3 selected-tranche packaging results follow-up mode is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_PACKAGING_RESULTS_FOLLOW_UP_INVALID_MODE"
    });
  }

  const followUpPath = selectedTranchePackagingResultsFollowUpPath(followUpId);
  const absoluteFollowUpPath = assertPathAllowed(projectRoot, followUpPath, { purpose: "runtime-write" });
  if (existsSync(absoluteFollowUpPath)) {
    throw new ComathError("Goal 3 selected-tranche packaging results follow-up already exists", {
      statusCode: 409,
      code: "GOAL3_SELECTED_TRANCHE_PACKAGING_RESULTS_FOLLOW_UP_ALREADY_EXISTS"
    });
  }

  const bridge = assertBridgeArtifact(projectRoot, projectId, bridgeId, bridgePath, bridgeSha256);
  const taskLocal = assertTaskLocalPackagingArtifact(projectRoot, projectId, taskLocalId, taskLocalPath, taskLocalSha256);
  assertTaskLocalMatchesBridge(bridge, taskLocal, bridgeId, bridgePath);
  const selectedPackagingReportArtifacts = assertSelectedPackagingReportsCurrent(
    projectRoot,
    bridge.body.next_execution_task_ids,
    taskLocal.body.selected_packaging_report_artifacts
  );

  const actor = sanitizeActor(input.actor);
  const executionFollowThrough = recordGoal3ReleaseCandidateProofBreadthExecutionFollowThrough(projectRoot, {
    project_id: projectId,
    proof_breadth_execution_follow_through_id: executionFollowThroughId,
    proof_breadth_execution_bridge_id: bridgeId,
    proof_breadth_execution_bridge_path: bridgePath,
    proof_breadth_execution_bridge_sha256: bridgeSha256,
    actor
  });
  const callerAuthorityMaterialIgnored = callerProofOrGaMaterialPresent(input);
  const blockerReasons = [
    ...(executionFollowThrough.selected_task_count === 0 ? ["bridge_has_no_selected_positive_matrix_tranche"] : []),
    ...(executionFollowThrough.ready_for_proof_breadth_closure_recheck
      ? []
      : ["selected_positive_matrix_tranche_packaging_results_incomplete"]),
    ...(callerAuthorityMaterialIgnored ? ["caller_proof_or_ga_authority_material_ignored"] : [])
  ];
  const body = {
    schema_version: "comath.goal3_release_candidate_proof_breadth_selected_tranche_packaging_results_follow_up.v1",
    selected_tranche_packaging_results_follow_up_id: followUpId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    ok: executionFollowThrough.ready_for_proof_breadth_closure_recheck,
    follow_up_status:
      executionFollowThrough.selected_task_count === 0
        ? "blocked_bridge_has_no_selected_tranche"
        : executionFollowThrough.ready_for_proof_breadth_closure_recheck
          ? "selected_tranche_packaging_results_current_for_proof_breadth_closure_recheck"
          : "blocked_selected_tranche_packaging_results_incomplete",
    selected_tranche_packaging_results_follow_up_path: followUpPath,
    requested_follow_up_mode: "open_formal_workbench_release_candidate_selected_tranche_packaging_results_follow_up",
    proof_breadth_execution_bridge_id: bridgeId,
    proof_breadth_execution_bridge_path: bridgePath,
    proof_breadth_execution_bridge_artifact: bridge.artifact,
    task_local_packaging_follow_through_id: taskLocalId,
    task_local_packaging_follow_through_path: taskLocalPath,
    task_local_packaging_follow_through_artifact: taskLocal.artifact,
    proof_breadth_execution_follow_through_id: executionFollowThrough.proof_breadth_execution_follow_through_id,
    proof_breadth_execution_follow_through_path: executionFollowThrough.proof_breadth_execution_follow_through_path,
    proof_breadth_execution_follow_through_artifact:
      executionFollowThrough.proof_breadth_execution_follow_through_artifact,
    proof_breadth_execution_follow_through: executionFollowThrough,
    blocker_reasons: blockerReasons,
    selected_task_count: executionFollowThrough.selected_task_count,
    verified_selected_task_count: executionFollowThrough.verified_selected_task_count,
    missing_selected_task_count: executionFollowThrough.missing_selected_task_count,
    blocked_selected_task_count: executionFollowThrough.blocked_selected_task_count,
    selected_task_ids: executionFollowThrough.selected_task_ids,
    verified_selected_task_ids: executionFollowThrough.verified_selected_task_ids,
    missing_selected_task_ids: executionFollowThrough.missing_selected_task_ids,
    blocked_selected_task_ids: executionFollowThrough.blocked_selected_task_ids,
    selected_packaging_report_artifacts: selectedPackagingReportArtifacts,
    selected_packaging_report_artifacts_current: true,
    ready_for_proof_breadth_closure_recheck: executionFollowThrough.ready_for_proof_breadth_closure_recheck,
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
    Goal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp,
    "selected_tranche_packaging_results_follow_up_artifact"
  >;

  const followUpText = `${JSON.stringify(body, null, 2)}\n`;
  mkdirSync(dirname(absoluteFollowUpPath), { recursive: true });
  writeFileSync(absoluteFollowUpPath, followUpText, "utf8");
  const result: Goal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp = {
    ...body,
    selected_tranche_packaging_results_follow_up_artifact: {
      kind: "goal3_release_candidate_proof_breadth_selected_tranche_packaging_results_follow_up",
      path: followUpPath,
      sha256: sha256Text(followUpText),
      size_bytes: Buffer.byteLength(followUpText, "utf8")
    }
  };

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.goal3_selected_tranche_packaging_results_follow_up_recorded",
    actor,
    target_id: projectId,
    payload: {
      selected_tranche_packaging_results_follow_up_id: followUpId,
      follow_up_status: result.follow_up_status,
      selected_tranche_packaging_results_follow_up_path: followUpPath,
      selected_tranche_packaging_results_follow_up_artifact_sha256:
        result.selected_tranche_packaging_results_follow_up_artifact.sha256,
      task_local_packaging_follow_through_id: taskLocalId,
      task_local_packaging_follow_through_artifact_sha256: taskLocal.artifact.sha256,
      proof_breadth_execution_follow_through_id: result.proof_breadth_execution_follow_through_id,
      proof_breadth_execution_follow_through_artifact_sha256:
        result.proof_breadth_execution_follow_through_artifact.sha256,
      proof_breadth_execution_bridge_id: bridgeId,
      proof_breadth_execution_bridge_artifact_sha256: bridge.artifact.sha256,
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
