import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { assertPathAllowed } from "../security/path-policy.js";
import {
  recordGoal3ReleaseCandidateProofBreadthExecutionBridge,
  type Goal3ProofBreadthExecutionTarget,
  type Goal3ReleaseCandidateProofBreadthExecutionBridge
} from "./goal3-proof-breadth-execution-bridge.js";
import type { Goal3ReleaseCandidateProofBreadthClosure } from "./goal3-proof-breadth-closure.js";
import type { Goal3ReleaseCandidateProofBreadthSelectedTrancheClosureRecheck } from "./goal3-proof-breadth-selected-tranche-closure-recheck.js";

type ArtifactReference = {
  kind: string;
  path: string;
  sha256: string;
  size_bytes: number;
};

type PersistedGoal3ReleaseCandidateProofBreadthSelectedTrancheClosureRecheck = Omit<
  Goal3ReleaseCandidateProofBreadthSelectedTrancheClosureRecheck,
  "selected_tranche_closure_recheck_artifact"
>;

type PersistedGoal3ReleaseCandidateProofBreadthClosure = Omit<
  Goal3ReleaseCandidateProofBreadthClosure,
  "proof_breadth_closure_artifact"
>;

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridgeInput = {
  project_id: string;
  selected_tranche_next_execution_bridge_id?: string;
  proof_breadth_execution_bridge_id?: string;
  selected_tranche_closure_recheck_id: string;
  selected_tranche_closure_recheck_path: string;
  selected_tranche_closure_recheck_sha256: string;
  actor?: string;
  requested_bridge_mode?: "open_formal_workbench_release_candidate_selected_tranche_next_execution_bridge";
  max_tranche_size?: number;
};

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge = {
  schema_version: "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_execution_bridge.v1";
  selected_tranche_next_execution_bridge_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  ok: boolean;
  bridge_status:
    | "ready_for_next_selected_tranche_execution"
    | "complete_proof_breadth_requires_task301_final_ga_audit_binding";
  selected_tranche_next_execution_bridge_path: string;
  requested_bridge_mode: "open_formal_workbench_release_candidate_selected_tranche_next_execution_bridge";
  selected_tranche_closure_recheck_id: string;
  selected_tranche_closure_recheck_path: string;
  selected_tranche_closure_recheck_artifact: ArtifactReference;
  completed_selected_task_ids: string[];
  completed_selected_task_count: number;
  completed_selected_packaging_report_artifacts: ArtifactReference[];
  completed_selected_packaging_report_artifacts_current: true;
  previous_proof_breadth_closure_id: string;
  previous_proof_breadth_closure_path: string;
  previous_proof_breadth_closure_artifact: ArtifactReference;
  previous_proof_breadth_status: Goal3ReleaseCandidateProofBreadthClosure["proof_breadth_status"];
  previous_verified_task_count: number;
  previous_missing_task_count: number;
  previous_blocked_task_count: number;
  next_proof_breadth_execution_bridge_id: string | null;
  next_proof_breadth_execution_bridge_path: string | null;
  next_proof_breadth_execution_bridge_artifact: ArtifactReference | null;
  next_proof_breadth_execution_bridge: Goal3ReleaseCandidateProofBreadthExecutionBridge | null;
  next_execution_task_ids: string[];
  next_execution_targets: Goal3ProofBreadthExecutionTarget[];
  max_tranche_size: number;
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
  selected_tranche_next_execution_bridge_artifact: ArtifactReference;
};

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function selectedTrancheNextExecutionBridgePath(bridgeId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "goal3-selected-tranche-next-execution-bridge", bridgeId, "bridge.json")
  );
}

function selectedTrancheClosureRecheckPath(recheckId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "goal3-selected-tranche-closure-recheck", recheckId, "recheck.json")
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
      code: "GOAL3_SELECTED_TRANCHE_NEXT_EXECUTION_BRIDGE_INVALID_ID"
    });
  }
  return id;
}

function assertSha256(value: string | undefined): string {
  const sha256 = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-f0-9]{64}$/u.test(sha256)) {
    throw new ComathError("Goal 3 selected-tranche next execution bridge hash is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_EXECUTION_BRIDGE_INVALID_HASH"
    });
  }
  return sha256;
}

function assertMaxTrancheSize(value: number | undefined): number {
  if (value === undefined) {
    return 2;
  }
  if (!Number.isSafeInteger(value) || value < 1 || value > 10) {
    throw new ComathError("Goal 3 selected-tranche next execution bridge tranche size is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_EXECUTION_BRIDGE_INVALID_TRANCHE"
    });
  }
  return value;
}

function sanitizeActor(value: string | undefined): string {
  return (value ?? "goal3-selected-tranche-next-execution-bridge")
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

function assertRecheckPath(inputPath: string | undefined, recheckId: string): string {
  const normalizedInputPath = normalizeRelativePath(typeof inputPath === "string" ? inputPath.trim() : "");
  const expectedPath = selectedTrancheClosureRecheckPath(recheckId);
  if (normalizedInputPath !== expectedPath) {
    throw new ComathError("Goal 3 selected-tranche next execution bridge Task337 path mismatch", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_EXECUTION_BRIDGE_RECHECK_PATH_MISMATCH"
    });
  }
  return expectedPath;
}

function assertRecheckArtifact(
  projectRoot: string,
  projectId: string,
  recheckId: string,
  recheckPath: string,
  expectedSha256: string
): {
  body: PersistedGoal3ReleaseCandidateProofBreadthSelectedTrancheClosureRecheck;
  artifact: ArtifactReference;
} {
  const recheck = readJsonArtifact<PersistedGoal3ReleaseCandidateProofBreadthSelectedTrancheClosureRecheck>(
    projectRoot,
    recheckPath,
    "goal3_release_candidate_proof_breadth_selected_tranche_closure_recheck"
  );
  if (recheck === null) {
    throw new ComathError("Goal 3 selected-tranche next execution bridge Task337 artifact is missing", {
      statusCode: 404,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_EXECUTION_BRIDGE_RECHECK_MISSING"
    });
  }
  if (recheck.artifact.sha256 !== expectedSha256) {
    throw new ComathError("Goal 3 selected-tranche next execution bridge Task337 hash is stale", {
      statusCode: 409,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_EXECUTION_BRIDGE_STALE_RECHECK"
    });
  }
  if (
    recheck.body.schema_version !==
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_closure_recheck.v1" ||
    recheck.body.project_id !== projectId ||
    recheck.body.selected_tranche_closure_recheck_id !== recheckId ||
    recheck.body.selected_tranche_closure_recheck_path !== recheckPath ||
    recheck.body.selected_packaging_report_artifacts_current !== true ||
    recheck.body.selected_tranche_ready_for_proof_breadth_closure_recheck !== true ||
    recheck.body.runs_lean !== false ||
    recheck.body.executes_proofs !== false ||
    recheck.body.proof_authority !== "none" ||
    recheck.body.can_promote_claim !== false ||
    recheck.body.can_certify_ga !== false ||
    !Array.isArray(recheck.body.selected_task_ids) ||
    !Array.isArray(recheck.body.selected_packaging_report_artifacts) ||
    typeof recheck.body.proof_breadth_closure_id !== "string" ||
    typeof recheck.body.proof_breadth_closure_path !== "string" ||
    typeof recheck.body.proof_breadth_closure_artifact?.sha256 !== "string"
  ) {
    throw new ComathError("Goal 3 selected-tranche next execution bridge Task337 artifact is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_EXECUTION_BRIDGE_INVALID_RECHECK"
    });
  }
  return recheck;
}

function assertClosureArtifact(
  projectRoot: string,
  projectId: string,
  recheck: PersistedGoal3ReleaseCandidateProofBreadthSelectedTrancheClosureRecheck
): {
  body: PersistedGoal3ReleaseCandidateProofBreadthClosure;
  artifact: ArtifactReference;
} {
  const closure = readJsonArtifact<PersistedGoal3ReleaseCandidateProofBreadthClosure>(
    projectRoot,
    recheck.proof_breadth_closure_path,
    "goal3_release_candidate_proof_breadth_closure"
  );
  if (closure === null) {
    throw new ComathError("Goal 3 selected-tranche next execution bridge Task300 closure artifact is missing", {
      statusCode: 404,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_EXECUTION_BRIDGE_CLOSURE_MISSING"
    });
  }
  if (
    closure.artifact.sha256 !== recheck.proof_breadth_closure_artifact.sha256 ||
    closure.artifact.size_bytes !== recheck.proof_breadth_closure_artifact.size_bytes
  ) {
    throw new ComathError("Goal 3 selected-tranche next execution bridge Task300 closure hash is stale", {
      statusCode: 409,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_EXECUTION_BRIDGE_STALE_CLOSURE"
    });
  }
  if (
    closure.body.schema_version !== "comath.goal3_release_candidate_proof_breadth_closure.v1" ||
    closure.body.project_id !== projectId ||
    closure.body.proof_breadth_closure_id !== recheck.proof_breadth_closure_id ||
    closure.body.proof_breadth_closure_path !== recheck.proof_breadth_closure_path ||
    typeof closure.body.verified_task_count !== "number" ||
    typeof closure.body.missing_task_count !== "number" ||
    typeof closure.body.blocked_task_count !== "number" ||
    typeof closure.body.proof_breadth_complete !== "boolean" ||
    typeof closure.body.final_ga_audit_unblocked !== "boolean"
  ) {
    throw new ComathError("Goal 3 selected-tranche next execution bridge Task300 closure artifact is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_EXECUTION_BRIDGE_INVALID_CLOSURE"
    });
  }
  return closure;
}

function assertCompletedReportsCurrent(
  projectRoot: string,
  completedTaskIds: string[],
  artifacts: ArtifactReference[]
): ArtifactReference[] {
  const artifactsByPath = new Map(artifacts.map((artifact) => [artifact.path, artifact]));
  return completedTaskIds.map((taskId) => {
    const expectedPath = finalAuthorityPackagingReportPath(taskId);
    const artifact = artifactsByPath.get(expectedPath);
    if (artifact === undefined || artifact.kind !== "final_authority_packaging_report_v3") {
      throw new ComathError("Goal 3 selected-tranche next execution bridge completed report artifact is incomplete", {
        statusCode: 409,
        code: "GOAL3_SELECTED_TRANCHE_NEXT_EXECUTION_BRIDGE_STALE_COMPLETED_REPORT"
      });
    }
    const current = readJsonArtifact<unknown>(projectRoot, expectedPath, "final_authority_packaging_report_v3");
    if (
      current === null ||
      current.artifact.sha256 !== artifact.sha256 ||
      current.artifact.size_bytes !== artifact.size_bytes
    ) {
      throw new ComathError("Goal 3 selected-tranche next execution bridge completed report hash is stale", {
        statusCode: 409,
        code: "GOAL3_SELECTED_TRANCHE_NEXT_EXECUTION_BRIDGE_STALE_COMPLETED_REPORT"
      });
    }
    return current.artifact;
  });
}

function callerProofOrGaMaterialPresent(
  input: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridgeInput
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

export function recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge(
  projectRoot: string,
  input: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridgeInput
): Goal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge {
  const projectId = assertSafeId(input.project_id, "project_id");
  const nextBridgeId = assertSafeId(
    input.selected_tranche_next_execution_bridge_id,
    "selected_tranche_next_execution_bridge_id"
  );
  const delegatedBridgeId = assertSafeId(
    input.proof_breadth_execution_bridge_id ?? `${nextBridgeId}-TASK326-BRIDGE`,
    "proof_breadth_execution_bridge_id"
  );
  const recheckId = assertSafeId(input.selected_tranche_closure_recheck_id, "selected_tranche_closure_recheck_id");
  const recheckSha256 = assertSha256(input.selected_tranche_closure_recheck_sha256);
  const recheckPath = assertRecheckPath(input.selected_tranche_closure_recheck_path, recheckId);
  const maxTrancheSize = assertMaxTrancheSize(input.max_tranche_size);
  const requestedMode =
    input.requested_bridge_mode ??
    "open_formal_workbench_release_candidate_selected_tranche_next_execution_bridge";
  if (requestedMode !== "open_formal_workbench_release_candidate_selected_tranche_next_execution_bridge") {
    throw new ComathError("Goal 3 selected-tranche next execution bridge mode is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_EXECUTION_BRIDGE_INVALID_MODE"
    });
  }

  const nextBridgePath = selectedTrancheNextExecutionBridgePath(nextBridgeId);
  const absoluteNextBridgePath = assertPathAllowed(projectRoot, nextBridgePath, { purpose: "runtime-write" });
  if (existsSync(absoluteNextBridgePath)) {
    throw new ComathError("Goal 3 selected-tranche next execution bridge already exists", {
      statusCode: 409,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_EXECUTION_BRIDGE_ALREADY_EXISTS"
    });
  }

  const recheck = assertRecheckArtifact(projectRoot, projectId, recheckId, recheckPath, recheckSha256);
  const closure = assertClosureArtifact(projectRoot, projectId, recheck.body);
  const completedSelectedReportArtifacts = assertCompletedReportsCurrent(
    projectRoot,
    recheck.body.selected_task_ids,
    recheck.body.selected_packaging_report_artifacts
  );
  const actor = sanitizeActor(input.actor);
  const callerAuthorityMaterialIgnored = callerProofOrGaMaterialPresent(input);
  const proofBreadthComplete = closure.body.proof_breadth_complete === true;
  const nextExecutionBridge = proofBreadthComplete
    ? null
    : recordGoal3ReleaseCandidateProofBreadthExecutionBridge(projectRoot, {
        project_id: projectId,
        proof_breadth_execution_bridge_id: delegatedBridgeId,
        actor,
        max_tranche_size: maxTrancheSize,
        requested_bridge_mode: "open_formal_workbench_release_candidate_proof_breadth_execution_bridge"
      });
  const blockerReasons = [
    ...(proofBreadthComplete
      ? ["task301_final_ga_audit_binding_required"]
      : ["global_positive_matrix_release_candidate_proof_breadth_incomplete"]),
    ...closure.body.blocker_reasons,
    ...(nextExecutionBridge?.blocker_reasons ?? []),
    ...(callerAuthorityMaterialIgnored ? ["caller_proof_or_ga_authority_material_ignored"] : [])
  ];
  const body = {
    schema_version: "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_execution_bridge.v1",
    selected_tranche_next_execution_bridge_id: nextBridgeId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    ok: nextExecutionBridge !== null,
    bridge_status: nextExecutionBridge
      ? "ready_for_next_selected_tranche_execution"
      : "complete_proof_breadth_requires_task301_final_ga_audit_binding",
    selected_tranche_next_execution_bridge_path: nextBridgePath,
    requested_bridge_mode: "open_formal_workbench_release_candidate_selected_tranche_next_execution_bridge",
    selected_tranche_closure_recheck_id: recheckId,
    selected_tranche_closure_recheck_path: recheckPath,
    selected_tranche_closure_recheck_artifact: recheck.artifact,
    completed_selected_task_ids: recheck.body.selected_task_ids,
    completed_selected_task_count: recheck.body.selected_task_ids.length,
    completed_selected_packaging_report_artifacts: completedSelectedReportArtifacts,
    completed_selected_packaging_report_artifacts_current: true,
    previous_proof_breadth_closure_id: closure.body.proof_breadth_closure_id,
    previous_proof_breadth_closure_path: closure.body.proof_breadth_closure_path,
    previous_proof_breadth_closure_artifact: closure.artifact,
    previous_proof_breadth_status: closure.body.proof_breadth_status,
    previous_verified_task_count: closure.body.verified_task_count,
    previous_missing_task_count: closure.body.missing_task_count,
    previous_blocked_task_count: closure.body.blocked_task_count,
    next_proof_breadth_execution_bridge_id: nextExecutionBridge?.proof_breadth_execution_bridge_id ?? null,
    next_proof_breadth_execution_bridge_path: nextExecutionBridge?.proof_breadth_execution_bridge_path ?? null,
    next_proof_breadth_execution_bridge_artifact: nextExecutionBridge?.proof_breadth_execution_bridge_artifact ?? null,
    next_proof_breadth_execution_bridge: nextExecutionBridge,
    next_execution_task_ids: nextExecutionBridge?.next_execution_task_ids ?? [],
    next_execution_targets: nextExecutionBridge?.next_execution_targets ?? [],
    max_tranche_size: maxTrancheSize,
    blocker_reasons: [...new Set(blockerReasons)],
    proof_breadth_complete: proofBreadthComplete,
    final_ga_audit_unblocked: closure.body.final_ga_audit_unblocked,
    runs_lean: false,
    executes_proofs: false,
    accepts_caller_success_metadata: false,
    accepts_caller_proof_material: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    ga_certification_gate_separate: true
  } satisfies Omit<
    Goal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge,
    "selected_tranche_next_execution_bridge_artifact"
  >;

  const nextBridgeText = `${JSON.stringify(body, null, 2)}\n`;
  mkdirSync(dirname(absoluteNextBridgePath), { recursive: true });
  writeFileSync(absoluteNextBridgePath, nextBridgeText, "utf8");
  const result: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge = {
    ...body,
    selected_tranche_next_execution_bridge_artifact: {
      kind: "goal3_release_candidate_proof_breadth_selected_tranche_next_execution_bridge",
      path: nextBridgePath,
      sha256: sha256Text(nextBridgeText),
      size_bytes: Buffer.byteLength(nextBridgeText, "utf8")
    }
  };

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.goal3_selected_tranche_next_execution_bridge_recorded",
    actor,
    target_id: projectId,
    payload: {
      selected_tranche_next_execution_bridge_id: nextBridgeId,
      bridge_status: result.bridge_status,
      selected_tranche_next_execution_bridge_path: nextBridgePath,
      selected_tranche_next_execution_bridge_artifact_sha256:
        result.selected_tranche_next_execution_bridge_artifact.sha256,
      selected_tranche_closure_recheck_id: recheckId,
      selected_tranche_closure_recheck_artifact_sha256: recheck.artifact.sha256,
      previous_proof_breadth_closure_id: result.previous_proof_breadth_closure_id,
      previous_proof_breadth_closure_artifact_sha256: result.previous_proof_breadth_closure_artifact.sha256,
      next_proof_breadth_execution_bridge_id: result.next_proof_breadth_execution_bridge_id,
      next_proof_breadth_execution_bridge_artifact_sha256:
        result.next_proof_breadth_execution_bridge_artifact?.sha256 ?? null,
      completed_selected_task_ids: result.completed_selected_task_ids,
      next_execution_task_ids: result.next_execution_task_ids,
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
