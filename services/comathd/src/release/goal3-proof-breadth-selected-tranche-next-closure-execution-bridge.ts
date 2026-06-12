import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { assertPathAllowed } from "../security/path-policy.js";
import {
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge,
  type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge
} from "./goal3-proof-breadth-selected-tranche-next-execution-bridge.js";
import type { Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureRecheck } from "./goal3-proof-breadth-selected-tranche-next-closure-recheck.js";

type ArtifactReference = {
  kind: string;
  path: string;
  sha256: string;
  size_bytes: number;
};

type PersistedSelectedTrancheNextClosureRecheck = Omit<
  Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureRecheck,
  "selected_tranche_next_closure_recheck_artifact"
>;

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureExecutionBridgeInput = {
  project_id: string;
  selected_tranche_next_closure_execution_bridge_id?: string;
  selected_tranche_next_execution_bridge_id?: string;
  proof_breadth_execution_bridge_id?: string;
  selected_tranche_next_closure_recheck_id: string;
  selected_tranche_next_closure_recheck_path: string;
  selected_tranche_next_closure_recheck_sha256: string;
  actor?: string;
  requested_bridge_mode?: "open_formal_workbench_release_candidate_selected_tranche_next_closure_execution_bridge";
  max_tranche_size?: number;
};

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureExecutionBridge = {
  schema_version: "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_execution_bridge.v1";
  selected_tranche_next_closure_execution_bridge_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  ok: boolean;
  bridge_status:
    | "ready_for_next_selected_tranche_execution"
    | "complete_proof_breadth_requires_task301_final_ga_audit_binding";
  selected_tranche_next_closure_execution_bridge_path: string;
  requested_bridge_mode: "open_formal_workbench_release_candidate_selected_tranche_next_closure_execution_bridge";
  selected_tranche_next_closure_recheck_id: string;
  selected_tranche_next_closure_recheck_path: string;
  selected_tranche_next_closure_recheck_artifact: ArtifactReference;
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
  previous_proof_breadth_status: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge["previous_proof_breadth_status"];
  previous_verified_task_count: number;
  previous_missing_task_count: number;
  previous_blocked_task_count: number;
  delegated_selected_tranche_next_execution_bridge_id: string;
  delegated_selected_tranche_next_execution_bridge_path: string;
  delegated_selected_tranche_next_execution_bridge_artifact: ArtifactReference;
  delegated_selected_tranche_next_execution_bridge: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge;
  next_proof_breadth_execution_bridge_id: string | null;
  next_proof_breadth_execution_bridge_path: string | null;
  next_proof_breadth_execution_bridge_artifact: ArtifactReference | null;
  next_proof_breadth_execution_bridge: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge["next_proof_breadth_execution_bridge"];
  next_execution_task_ids: string[];
  next_execution_targets: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge["next_execution_targets"];
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
  selected_tranche_next_closure_execution_bridge_artifact: ArtifactReference;
};

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function selectedTrancheNextClosureExecutionBridgePath(bridgeId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "goal3-selected-tranche-next-closure-execution-bridge", bridgeId, "bridge.json")
  );
}

function selectedTrancheNextClosureRecheckPath(recheckId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "goal3-selected-tranche-next-closure-recheck", recheckId, "recheck.json")
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
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_EXECUTION_BRIDGE_INVALID_ID"
    });
  }
  return id;
}

function assertSha256(value: string | undefined): string {
  const sha256 = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-f0-9]{64}$/u.test(sha256)) {
    throw new ComathError("Goal 3 selected-tranche next closure execution bridge hash is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_EXECUTION_BRIDGE_INVALID_HASH"
    });
  }
  return sha256;
}

function assertMaxTrancheSize(value: number | undefined): number {
  if (value === undefined) {
    return 2;
  }
  if (!Number.isSafeInteger(value) || value < 1 || value > 10) {
    throw new ComathError("Goal 3 selected-tranche next closure execution bridge tranche size is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_EXECUTION_BRIDGE_INVALID_TRANCHE"
    });
  }
  return value;
}

function sanitizeActor(value: string | undefined): string {
  return (value ?? "goal3-selected-tranche-next-closure-execution-bridge")
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

function assertTask343Path(inputPath: string | undefined, recheckId: string): string {
  const normalizedInputPath = normalizeRelativePath(typeof inputPath === "string" ? inputPath.trim() : "");
  const expectedPath = selectedTrancheNextClosureRecheckPath(recheckId);
  if (normalizedInputPath !== expectedPath) {
    throw new ComathError("Goal 3 selected-tranche next closure execution bridge Task343 path mismatch", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_EXECUTION_BRIDGE_TASK343_PATH_MISMATCH"
    });
  }
  return expectedPath;
}

function assertTask343Artifact(
  projectRoot: string,
  projectId: string,
  recheckId: string,
  recheckPath: string,
  expectedSha256: string
): {
  body: PersistedSelectedTrancheNextClosureRecheck;
  artifact: ArtifactReference;
} {
  const recheck = readJsonArtifact<PersistedSelectedTrancheNextClosureRecheck>(
    projectRoot,
    recheckPath,
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_recheck"
  );
  if (recheck === null) {
    throw new ComathError("Goal 3 selected-tranche next closure execution bridge Task343 artifact is missing", {
      statusCode: 404,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_EXECUTION_BRIDGE_RECHECK_MISSING"
    });
  }
  if (recheck.artifact.sha256 !== expectedSha256) {
    throw new ComathError("Goal 3 selected-tranche next closure execution bridge Task343 hash is stale", {
      statusCode: 409,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_EXECUTION_BRIDGE_STALE_RECHECK"
    });
  }
  if (
    recheck.body.schema_version !==
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_recheck.v1" ||
    recheck.body.project_id !== projectId ||
    recheck.body.selected_tranche_next_closure_recheck_id !== recheckId ||
    recheck.body.selected_tranche_next_closure_recheck_path !== recheckPath ||
    recheck.body.selected_packaging_report_artifacts_current !== true ||
    recheck.body.runs_lean !== false ||
    recheck.body.executes_proofs !== false ||
    recheck.body.accepts_caller_success_metadata !== false ||
    recheck.body.accepts_caller_proof_material !== false ||
    recheck.body.proof_authority !== "none" ||
    recheck.body.can_promote_claim !== false ||
    recheck.body.can_certify_ga !== false ||
    recheck.body.ga_certification_gate_separate !== true ||
    typeof recheck.body.selected_tranche_closure_recheck_id !== "string" ||
    typeof recheck.body.selected_tranche_closure_recheck_path !== "string" ||
    typeof recheck.body.selected_tranche_closure_recheck_artifact?.sha256 !== "string"
  ) {
    throw new ComathError("Goal 3 selected-tranche next closure execution bridge Task343 artifact is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_EXECUTION_BRIDGE_INVALID_RECHECK"
    });
  }
  return recheck;
}

function callerProofOrGaMaterialPresent(
  input: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureExecutionBridgeInput
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

export function recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureExecutionBridge(
  projectRoot: string,
  input: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureExecutionBridgeInput
): Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureExecutionBridge {
  const projectId = assertSafeId(input.project_id, "project_id");
  const bridgeId = assertSafeId(
    input.selected_tranche_next_closure_execution_bridge_id,
    "selected_tranche_next_closure_execution_bridge_id"
  );
  const delegatedBridgeId = assertSafeId(
    input.selected_tranche_next_execution_bridge_id ?? `${bridgeId}-TASK338-NEXT-BRIDGE`,
    "selected_tranche_next_execution_bridge_id"
  );
  const delegatedTask326Id = assertSafeId(
    input.proof_breadth_execution_bridge_id ?? `${delegatedBridgeId}-TASK326-BRIDGE`,
    "proof_breadth_execution_bridge_id"
  );
  const task343Id = assertSafeId(
    input.selected_tranche_next_closure_recheck_id,
    "selected_tranche_next_closure_recheck_id"
  );
  const task343Sha256 = assertSha256(input.selected_tranche_next_closure_recheck_sha256);
  const task343Path = assertTask343Path(input.selected_tranche_next_closure_recheck_path, task343Id);
  const maxTrancheSize = assertMaxTrancheSize(input.max_tranche_size);
  const requestedMode =
    input.requested_bridge_mode ??
    "open_formal_workbench_release_candidate_selected_tranche_next_closure_execution_bridge";
  if (requestedMode !== "open_formal_workbench_release_candidate_selected_tranche_next_closure_execution_bridge") {
    throw new ComathError("Goal 3 selected-tranche next closure execution bridge mode is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_EXECUTION_BRIDGE_INVALID_MODE"
    });
  }

  const bridgePath = selectedTrancheNextClosureExecutionBridgePath(bridgeId);
  const absoluteBridgePath = assertPathAllowed(projectRoot, bridgePath, { purpose: "runtime-write" });
  if (existsSync(absoluteBridgePath)) {
    throw new ComathError("Goal 3 selected-tranche next closure execution bridge already exists", {
      statusCode: 409,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_EXECUTION_BRIDGE_ALREADY_EXISTS"
    });
  }

  const task343 = assertTask343Artifact(projectRoot, projectId, task343Id, task343Path, task343Sha256);
  const actor = sanitizeActor(input.actor);
  const callerAuthorityMaterialIgnored = callerProofOrGaMaterialPresent(input);
  const delegatedBridge = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge(projectRoot, {
    project_id: projectId,
    selected_tranche_next_execution_bridge_id: delegatedBridgeId,
    proof_breadth_execution_bridge_id: delegatedTask326Id,
    selected_tranche_closure_recheck_id: task343.body.selected_tranche_closure_recheck_id,
    selected_tranche_closure_recheck_path: task343.body.selected_tranche_closure_recheck_path,
    selected_tranche_closure_recheck_sha256: task343.body.selected_tranche_closure_recheck_artifact.sha256,
    actor,
    max_tranche_size: maxTrancheSize,
    requested_bridge_mode: "open_formal_workbench_release_candidate_selected_tranche_next_execution_bridge"
  });

  const blockerReasons = [
    ...delegatedBridge.blocker_reasons,
    ...(callerAuthorityMaterialIgnored ? ["caller_proof_or_ga_authority_material_ignored"] : [])
  ];
  const body = {
    schema_version: "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_execution_bridge.v1",
    selected_tranche_next_closure_execution_bridge_id: bridgeId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    ok: delegatedBridge.ok,
    bridge_status: delegatedBridge.bridge_status,
    selected_tranche_next_closure_execution_bridge_path: bridgePath,
    requested_bridge_mode: "open_formal_workbench_release_candidate_selected_tranche_next_closure_execution_bridge",
    selected_tranche_next_closure_recheck_id: task343Id,
    selected_tranche_next_closure_recheck_path: task343Path,
    selected_tranche_next_closure_recheck_artifact: task343.artifact,
    selected_tranche_closure_recheck_id: delegatedBridge.selected_tranche_closure_recheck_id,
    selected_tranche_closure_recheck_path: delegatedBridge.selected_tranche_closure_recheck_path,
    selected_tranche_closure_recheck_artifact: delegatedBridge.selected_tranche_closure_recheck_artifact,
    completed_selected_task_ids: delegatedBridge.completed_selected_task_ids,
    completed_selected_task_count: delegatedBridge.completed_selected_task_count,
    completed_selected_packaging_report_artifacts: delegatedBridge.completed_selected_packaging_report_artifacts,
    completed_selected_packaging_report_artifacts_current: true,
    previous_proof_breadth_closure_id: delegatedBridge.previous_proof_breadth_closure_id,
    previous_proof_breadth_closure_path: delegatedBridge.previous_proof_breadth_closure_path,
    previous_proof_breadth_closure_artifact: delegatedBridge.previous_proof_breadth_closure_artifact,
    previous_proof_breadth_status: delegatedBridge.previous_proof_breadth_status,
    previous_verified_task_count: delegatedBridge.previous_verified_task_count,
    previous_missing_task_count: delegatedBridge.previous_missing_task_count,
    previous_blocked_task_count: delegatedBridge.previous_blocked_task_count,
    delegated_selected_tranche_next_execution_bridge_id:
      delegatedBridge.selected_tranche_next_execution_bridge_id,
    delegated_selected_tranche_next_execution_bridge_path:
      delegatedBridge.selected_tranche_next_execution_bridge_path,
    delegated_selected_tranche_next_execution_bridge_artifact:
      delegatedBridge.selected_tranche_next_execution_bridge_artifact,
    delegated_selected_tranche_next_execution_bridge: delegatedBridge,
    next_proof_breadth_execution_bridge_id: delegatedBridge.next_proof_breadth_execution_bridge_id,
    next_proof_breadth_execution_bridge_path: delegatedBridge.next_proof_breadth_execution_bridge_path,
    next_proof_breadth_execution_bridge_artifact: delegatedBridge.next_proof_breadth_execution_bridge_artifact,
    next_proof_breadth_execution_bridge: delegatedBridge.next_proof_breadth_execution_bridge,
    next_execution_task_ids: delegatedBridge.next_execution_task_ids,
    next_execution_targets: delegatedBridge.next_execution_targets,
    max_tranche_size: maxTrancheSize,
    blocker_reasons: [...new Set(blockerReasons)],
    proof_breadth_complete: delegatedBridge.proof_breadth_complete,
    final_ga_audit_unblocked: delegatedBridge.final_ga_audit_unblocked,
    runs_lean: false,
    executes_proofs: false,
    accepts_caller_success_metadata: false,
    accepts_caller_proof_material: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    ga_certification_gate_separate: true
  } satisfies Omit<
    Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureExecutionBridge,
    "selected_tranche_next_closure_execution_bridge_artifact"
  >;

  const bridgeText = `${JSON.stringify(body, null, 2)}\n`;
  mkdirSync(dirname(absoluteBridgePath), { recursive: true });
  writeFileSync(absoluteBridgePath, bridgeText, "utf8");
  const result: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureExecutionBridge = {
    ...body,
    selected_tranche_next_closure_execution_bridge_artifact: {
      kind: "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_execution_bridge",
      path: bridgePath,
      sha256: sha256Text(bridgeText),
      size_bytes: Buffer.byteLength(bridgeText, "utf8")
    }
  };

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.goal3_selected_tranche_next_closure_execution_bridge_recorded",
    actor,
    target_id: projectId,
    payload: {
      selected_tranche_next_closure_execution_bridge_id: bridgeId,
      bridge_status: result.bridge_status,
      selected_tranche_next_closure_execution_bridge_path: bridgePath,
      selected_tranche_next_closure_execution_bridge_artifact_sha256:
        result.selected_tranche_next_closure_execution_bridge_artifact.sha256,
      selected_tranche_next_closure_recheck_id: task343Id,
      selected_tranche_next_closure_recheck_artifact_sha256: task343.artifact.sha256,
      delegated_selected_tranche_next_execution_bridge_id:
        result.delegated_selected_tranche_next_execution_bridge_id,
      delegated_selected_tranche_next_execution_bridge_artifact_sha256:
        result.delegated_selected_tranche_next_execution_bridge_artifact.sha256,
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
