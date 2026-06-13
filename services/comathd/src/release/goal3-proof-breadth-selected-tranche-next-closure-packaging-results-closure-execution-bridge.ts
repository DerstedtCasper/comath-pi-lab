import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { assertPathAllowed } from "../security/path-policy.js";
import {
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureExecutionBridge,
  type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureExecutionBridge
} from "./goal3-proof-breadth-selected-tranche-next-closure-execution-bridge.js";
import type { Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureRecheck } from "./goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-recheck.js";

type ArtifactReference = {
  kind: string;
  path: string;
  sha256: string;
  size_bytes: number;
};

type PersistedTask349ClosureRecheck = Omit<
  Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureRecheck,
  "selected_tranche_next_closure_packaging_results_closure_recheck_artifact"
>;

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionBridgeInput = {
  project_id: string;
  selected_tranche_next_closure_packaging_results_closure_execution_bridge_id?: string;
  selected_tranche_next_closure_execution_bridge_id?: string;
  selected_tranche_next_execution_bridge_id?: string;
  proof_breadth_execution_bridge_id?: string;
  selected_tranche_next_closure_packaging_results_closure_recheck_id: string;
  selected_tranche_next_closure_packaging_results_closure_recheck_path: string;
  selected_tranche_next_closure_packaging_results_closure_recheck_sha256: string;
  actor?: string;
  requested_bridge_mode?: "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_bridge";
  max_tranche_size?: number;
};

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionBridge = {
  schema_version: "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_bridge.v1";
  selected_tranche_next_closure_packaging_results_closure_execution_bridge_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  ok: boolean;
  bridge_status:
    | "ready_for_next_selected_tranche_execution"
    | "complete_proof_breadth_requires_task301_final_ga_audit_binding";
  selected_tranche_next_closure_packaging_results_closure_execution_bridge_path: string;
  requested_bridge_mode: "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_bridge";
  selected_tranche_next_closure_packaging_results_closure_recheck_id: string;
  selected_tranche_next_closure_packaging_results_closure_recheck_path: string;
  selected_tranche_next_closure_packaging_results_closure_recheck_artifact: ArtifactReference;
  delegated_selected_tranche_next_closure_execution_bridge_id: string;
  delegated_selected_tranche_next_closure_execution_bridge_path: string;
  delegated_selected_tranche_next_closure_execution_bridge_artifact: ArtifactReference;
  delegated_selected_tranche_next_execution_bridge_id: string;
  delegated_selected_tranche_next_execution_bridge_path: string;
  delegated_selected_tranche_next_execution_bridge_artifact: ArtifactReference;
  next_proof_breadth_execution_bridge_id: string | null;
  next_proof_breadth_execution_bridge_path: string | null;
  next_proof_breadth_execution_bridge_artifact: ArtifactReference | null;
  completed_selected_task_ids: string[];
  completed_selected_task_count: number;
  next_execution_task_ids: string[];
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
  selected_tranche_next_closure_packaging_results_closure_execution_bridge_artifact: ArtifactReference;
};

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function bridgePath(bridgeId: string): string {
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

function task349Path(recheckId: string): string {
  return normalizeRelativePath(
    join(
      ".comath",
      "release",
      "goal3-selected-tranche-next-closure-packaging-results-closure-recheck",
      recheckId,
      "recheck.json"
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
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,140}$/u.test(id)) {
    throw new ComathError(`${label} is invalid`, {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_BRIDGE_INVALID_ID"
    });
  }
  return id;
}

function assertSha256(value: string | undefined): string {
  const sha256 = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-f0-9]{64}$/u.test(sha256)) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging results closure execution bridge hash is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_BRIDGE_INVALID_HASH"
    });
  }
  return sha256;
}

function assertMaxTrancheSize(value: number | undefined): number {
  if (value === undefined) {
    return 2;
  }
  if (!Number.isSafeInteger(value) || value < 1 || value > 10) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging results closure execution bridge tranche size is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_BRIDGE_INVALID_TRANCHE"
    });
  }
  return value;
}

function sanitizeActor(actor: string | undefined): string {
  const text =
    typeof actor === "string" && actor.trim().length > 0
      ? actor.trim()
      : "goal3-selected-tranche-next-closure-packaging-results-closure-execution-bridge";
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

function assertTask349InputPath(inputPath: string | undefined, recheckId: string): string {
  const normalizedInputPath = normalizeRelativePath(typeof inputPath === "string" ? inputPath.trim() : "");
  const expectedPath = task349Path(recheckId);
  if (normalizedInputPath !== expectedPath) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging results closure execution bridge Task349 path mismatch", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_BRIDGE_TASK349_PATH_MISMATCH"
    });
  }
  return expectedPath;
}

function readTask349(
  projectRoot: string,
  projectId: string,
  recheckId: string,
  recheckPath: string,
  expectedSha256: string
): { body: PersistedTask349ClosureRecheck; artifact: ArtifactReference } {
  const absolutePath = assertPathAllowed(projectRoot, recheckPath, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging results closure execution bridge Task349 artifact is missing", {
      statusCode: 404,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_BRIDGE_TASK349_MISSING"
    });
  }
  const bytes = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(bytes);
  if (actualSha256 !== expectedSha256) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging results closure execution bridge Task349 hash is stale", {
      statusCode: 409,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_BRIDGE_STALE_TASK349"
    });
  }
  let body: PersistedTask349ClosureRecheck;
  try {
    body = JSON.parse(bytes.toString("utf8")) as PersistedTask349ClosureRecheck;
  } catch {
    throw new ComathError("Goal 3 selected-tranche next closure packaging results closure execution bridge Task349 artifact is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_BRIDGE_INVALID_TASK349"
    });
  }
  if (
    body.schema_version !==
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_recheck.v1" ||
    body.project_id !== projectId ||
    body.selected_tranche_next_closure_packaging_results_closure_recheck_id !== recheckId ||
    normalizeRelativePath(body.selected_tranche_next_closure_packaging_results_closure_recheck_path) !== recheckPath ||
    body.selected_packaging_report_artifacts_current !== true ||
    body.runs_lean !== false ||
    body.executes_proofs !== false ||
    body.accepts_caller_success_metadata !== false ||
    body.accepts_caller_proof_material !== false ||
    body.proof_authority !== "none" ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    body.ga_certification_gate_separate !== true ||
    typeof body.delegated_selected_tranche_next_closure_recheck_id !== "string" ||
    typeof body.delegated_selected_tranche_next_closure_recheck_path !== "string" ||
    !isArtifactReference(body.delegated_selected_tranche_next_closure_recheck_artifact)
  ) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging results closure execution bridge Task349 artifact is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_BRIDGE_INVALID_TASK349"
    });
  }
  return {
    body,
    artifact: {
      kind: "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_recheck",
      path: recheckPath,
      sha256: actualSha256,
      size_bytes: bytes.byteLength
    }
  };
}

function callerProofOrGaMaterialPresent(
  input: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionBridgeInput
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

export function recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionBridge(
  projectRoot: string,
  input: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionBridgeInput
): Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionBridge {
  const projectId = assertSafeId(input.project_id, "project_id");
  const bridgeId = assertSafeId(
    input.selected_tranche_next_closure_packaging_results_closure_execution_bridge_id,
    "selected_tranche_next_closure_packaging_results_closure_execution_bridge_id"
  );
  const task349Id = assertSafeId(
    input.selected_tranche_next_closure_packaging_results_closure_recheck_id,
    "selected_tranche_next_closure_packaging_results_closure_recheck_id"
  );
  const task349Sha256 = assertSha256(input.selected_tranche_next_closure_packaging_results_closure_recheck_sha256);
  const task349RelativePath = assertTask349InputPath(
    input.selected_tranche_next_closure_packaging_results_closure_recheck_path,
    task349Id
  );
  const requestedMode =
    input.requested_bridge_mode ??
    "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_bridge";
  if (
    requestedMode !==
    "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_bridge"
  ) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging results closure execution bridge mode is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_BRIDGE_INVALID_MODE"
    });
  }
  const maxTrancheSize = assertMaxTrancheSize(input.max_tranche_size);
  const outputPath = bridgePath(bridgeId);
  const absoluteOutputPath = assertPathAllowed(projectRoot, outputPath, { purpose: "runtime-write" });
  if (existsSync(absoluteOutputPath)) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging results closure execution bridge already exists", {
      statusCode: 409,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_BRIDGE_ALREADY_EXISTS"
    });
  }

  const task349 = readTask349(projectRoot, projectId, task349Id, task349RelativePath, task349Sha256);
  const actor = sanitizeActor(input.actor);
  const bridgeSuffix = shortIdSuffix(bridgeId);
  const delegatedBridgeId = assertSafeId(
    input.selected_tranche_next_closure_execution_bridge_id ?? `G3-T350-T344-${bridgeSuffix}`,
    "selected_tranche_next_closure_execution_bridge_id"
  );
  const delegatedTask338Id = assertSafeId(
    input.selected_tranche_next_execution_bridge_id ?? `G3-T350-T338-${bridgeSuffix}`,
    "selected_tranche_next_execution_bridge_id"
  );
  const delegatedTask326Id = assertSafeId(
    input.proof_breadth_execution_bridge_id ?? `G3-T350-T326-${bridgeSuffix}`,
    "proof_breadth_execution_bridge_id"
  );
  const delegated = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureExecutionBridge(projectRoot, {
    project_id: projectId,
    selected_tranche_next_closure_execution_bridge_id: delegatedBridgeId,
    selected_tranche_next_execution_bridge_id: delegatedTask338Id,
    proof_breadth_execution_bridge_id: delegatedTask326Id,
    selected_tranche_next_closure_recheck_id: task349.body.delegated_selected_tranche_next_closure_recheck_id,
    selected_tranche_next_closure_recheck_path: task349.body.delegated_selected_tranche_next_closure_recheck_path,
    selected_tranche_next_closure_recheck_sha256: task349.body.delegated_selected_tranche_next_closure_recheck_artifact.sha256,
    actor,
    max_tranche_size: maxTrancheSize,
    requested_bridge_mode: "open_formal_workbench_release_candidate_selected_tranche_next_closure_execution_bridge"
  });

  const callerAuthorityMaterialIgnored = callerProofOrGaMaterialPresent(input);
  const blockerReasons = uniqueStrings([
    ...task349.body.blocker_reasons,
    ...delegated.blocker_reasons,
    ...(callerAuthorityMaterialIgnored ? ["caller_proof_or_ga_authority_material_ignored"] : [])
  ]);
  const body = {
    schema_version:
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_bridge.v1",
    selected_tranche_next_closure_packaging_results_closure_execution_bridge_id: bridgeId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    ok: delegated.ok,
    bridge_status: delegated.bridge_status,
    selected_tranche_next_closure_packaging_results_closure_execution_bridge_path: outputPath,
    requested_bridge_mode:
      "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_bridge",
    selected_tranche_next_closure_packaging_results_closure_recheck_id: task349Id,
    selected_tranche_next_closure_packaging_results_closure_recheck_path: task349RelativePath,
    selected_tranche_next_closure_packaging_results_closure_recheck_artifact: task349.artifact,
    delegated_selected_tranche_next_closure_execution_bridge_id:
      delegated.selected_tranche_next_closure_execution_bridge_id,
    delegated_selected_tranche_next_closure_execution_bridge_path:
      delegated.selected_tranche_next_closure_execution_bridge_path,
    delegated_selected_tranche_next_closure_execution_bridge_artifact:
      delegated.selected_tranche_next_closure_execution_bridge_artifact,
    delegated_selected_tranche_next_execution_bridge_id:
      delegated.delegated_selected_tranche_next_execution_bridge_id,
    delegated_selected_tranche_next_execution_bridge_path:
      delegated.delegated_selected_tranche_next_execution_bridge_path,
    delegated_selected_tranche_next_execution_bridge_artifact:
      delegated.delegated_selected_tranche_next_execution_bridge_artifact,
    next_proof_breadth_execution_bridge_id: delegated.next_proof_breadth_execution_bridge_id,
    next_proof_breadth_execution_bridge_path: delegated.next_proof_breadth_execution_bridge_path,
    next_proof_breadth_execution_bridge_artifact: delegated.next_proof_breadth_execution_bridge_artifact,
    completed_selected_task_ids: delegated.completed_selected_task_ids,
    completed_selected_task_count: delegated.completed_selected_task_count,
    next_execution_task_ids: delegated.next_execution_task_ids,
    max_tranche_size: maxTrancheSize,
    blocker_reasons: blockerReasons,
    proof_breadth_complete: delegated.proof_breadth_complete,
    final_ga_audit_unblocked: delegated.final_ga_audit_unblocked,
    runs_lean: false,
    executes_proofs: false,
    accepts_caller_success_metadata: false,
    accepts_caller_proof_material: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    ga_certification_gate_separate: true
  } satisfies Omit<
    Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionBridge,
    "selected_tranche_next_closure_packaging_results_closure_execution_bridge_artifact"
  >;

  const text = `${JSON.stringify(body, null, 2)}\n`;
  mkdirSync(dirname(absoluteOutputPath), { recursive: true });
  writeFileSync(absoluteOutputPath, text, "utf8");
  const result: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionBridge = {
    ...body,
    selected_tranche_next_closure_packaging_results_closure_execution_bridge_artifact: {
      kind: "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_bridge",
      path: outputPath,
      sha256: sha256Text(text),
      size_bytes: Buffer.byteLength(text, "utf8")
    }
  };

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.goal3_selected_tranche_next_closure_packaging_results_closure_execution_bridge_recorded",
    actor,
    target_id: projectId,
    payload: {
      selected_tranche_next_closure_packaging_results_closure_execution_bridge_id: bridgeId,
      bridge_status: result.bridge_status,
      selected_tranche_next_closure_packaging_results_closure_execution_bridge_path: outputPath,
      selected_tranche_next_closure_packaging_results_closure_execution_bridge_artifact_sha256:
        result.selected_tranche_next_closure_packaging_results_closure_execution_bridge_artifact.sha256,
      selected_tranche_next_closure_packaging_results_closure_recheck_id: task349Id,
      selected_tranche_next_closure_packaging_results_closure_recheck_artifact_sha256: task349.artifact.sha256,
      delegated_selected_tranche_next_closure_execution_bridge_id:
        result.delegated_selected_tranche_next_closure_execution_bridge_id,
      delegated_selected_tranche_next_closure_execution_bridge_artifact_sha256:
        result.delegated_selected_tranche_next_closure_execution_bridge_artifact.sha256,
      delegated_selected_tranche_next_execution_bridge_id:
        result.delegated_selected_tranche_next_execution_bridge_id,
      next_proof_breadth_execution_bridge_id: result.next_proof_breadth_execution_bridge_id,
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
