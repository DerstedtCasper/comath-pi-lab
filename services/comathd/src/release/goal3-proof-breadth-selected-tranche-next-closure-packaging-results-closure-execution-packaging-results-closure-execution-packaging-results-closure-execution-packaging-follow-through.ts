import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { assertPathAllowed } from "../security/path-policy.js";
import {
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough,
  type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough,
  type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThroughInput
} from "./goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-follow-through.js";
import type { Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionBridge } from "./goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-bridge.js";

type ArtifactReference = {
  kind: string;
  path: string;
  sha256: string;
  size_bytes: number;
};

type EvidenceByTaskId = NonNullable<
  Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThroughInput["evidence_by_task_id"]
>;

type PersistedTask362ClosureExecutionBridge = Omit<
  Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionBridge,
  "selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact"
>;

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThroughInput =
  {
    project_id: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id?: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_sha256: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id?: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id?: string;
    selected_tranche_next_closure_packaging_follow_through_id?: string;
    selected_tranche_next_packaging_follow_through_id?: string;
    task_local_packaging_follow_through_id?: string;
    claim_id_prefix?: string;
    evidence_by_task_id?: EvidenceByTaskId;
    actor?: string;
    requested_follow_through_mode?: "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through";
  };

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough =
  {
    schema_version: "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through.v1";
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id: string;
    project_id: string;
    actor: string;
    created_at: string;
    ok: boolean;
    follow_through_status:
      | "next_selected_tranche_task_local_packaging_verified"
      | "blocked_next_selected_tranche_task_local_packaging_incomplete"
      | "blocked_next_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_not_ready_for_closure_execution_packaging";
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path: string;
    requested_follow_through_mode: "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through";
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact: ArtifactReference;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_path: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_artifact: ArtifactReference;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact: ArtifactReference;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact: ArtifactReference;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id: string | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path: string | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact:
      | ArtifactReference
      | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
      | string
      | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path:
      | string
      | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact:
      | ArtifactReference
      | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
      | string
      | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path:
      | string
      | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact:
      | ArtifactReference
      | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id:
      | string
      | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_path:
      | string
      | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_artifact:
      | ArtifactReference
      | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_bridge_id: string | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_bridge_path: string | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_bridge_artifact: ArtifactReference | null;
    delegated_selected_tranche_next_closure_execution_bridge_id: string | null;
    delegated_selected_tranche_next_closure_execution_bridge_path: string | null;
    delegated_selected_tranche_next_closure_execution_bridge_artifact: ArtifactReference | null;
    delegated_selected_tranche_next_execution_bridge_id: string | null;
    delegated_selected_tranche_next_execution_bridge_path: string | null;
    delegated_selected_tranche_next_execution_bridge_artifact: ArtifactReference | null;
    selected_tranche_next_closure_packaging_follow_through_id: string | null;
    selected_tranche_next_closure_packaging_follow_through_path: string | null;
    selected_tranche_next_closure_packaging_follow_through_artifact: ArtifactReference | null;
    selected_tranche_next_packaging_follow_through_id: string | null;
    selected_tranche_next_packaging_follow_through_path: string | null;
    selected_tranche_next_packaging_follow_through_artifact: ArtifactReference | null;
    task_local_packaging_follow_through_id: string | null;
    task_local_packaging_follow_through_path: string | null;
    task_local_packaging_follow_through_artifact: ArtifactReference | null;
    task_local_packaging_follow_through_status: string | null;
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
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact: ArtifactReference;
  };

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function followThroughPath(followThroughId: string): string {
  return normalizeRelativePath(
    join(
      ".comath",
      "release",
      "goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-follow-through",
      followThroughId,
      "follow-through.json"
    )
  );
}

function task362Path(bridgeId: string): string {
  return normalizeRelativePath(
    join(
      ".comath",
      "release",
      "goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-bridge",
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

function errorCode(suffix: string): string {
  return `GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_FOLLOW_THROUGH_${suffix}`;
}

function assertSafeId(value: string | undefined, label: string): string {
  const id = typeof value === "string" ? value.trim() : "";
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,260}$/u.test(id)) {
    throw new ComathError(`${label} is invalid`, {
      statusCode: 400,
      code: errorCode("INVALID_ID")
    });
  }
  return id;
}

function assertSha256(value: string | undefined): string {
  const sha256 = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-f0-9]{64}$/u.test(sha256)) {
    throw new ComathError(
      "Goal 3 selected-tranche next closure execution packaging results closure execution packaging results closure execution packaging follow-through hash is invalid",
      {
        statusCode: 400,
        code: errorCode("INVALID_HASH")
      }
    );
  }
  return sha256;
}

function assertTask362InputPath(path: string | undefined, bridgeId: string): string {
  const normalizedInputPath = normalizeRelativePath(typeof path === "string" ? path.trim() : "");
  const expectedPath = task362Path(bridgeId);
  if (normalizedInputPath !== expectedPath) {
    throw new ComathError(
      "Goal 3 selected-tranche next closure execution packaging results closure execution packaging results closure execution packaging follow-through Task362 path mismatch",
      {
        statusCode: 400,
        code: errorCode("TASK362_PATH_MISMATCH")
      }
    );
  }
  return expectedPath;
}

function sanitizeActor(actor: string | undefined): string {
  const text =
    typeof actor === "string" && actor.trim().length > 0
      ? actor.trim()
      : "goal3-selected-tranche-next-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-follow-through";
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

function invalidTask362(): never {
  throw new ComathError(
    "Goal 3 selected-tranche next closure execution packaging results closure execution packaging results closure execution packaging follow-through Task362 artifact is invalid",
    {
      statusCode: 400,
      code: errorCode("INVALID_TASK362")
    }
  );
}

function assertStringArray(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    invalidTask362();
  }
  return value as string[];
}

function assertDelegatedTask356Shape(projectRoot: string, projectId: string, task356Id: string, task356Path: string): void {
  const absolutePath = assertPathAllowed(projectRoot, task356Path, { purpose: "read", resolveRealpath: true });
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(readFileSync(absolutePath, "utf8")) as Record<string, unknown>;
  } catch {
    invalidTask362();
  }
  if (
    body.schema_version !==
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge.v1" ||
    body.project_id !== projectId ||
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id !==
      task356Id ||
    normalizeRelativePath(
      String(
        body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path ??
          ""
      )
    ) !== normalizeRelativePath(task356Path) ||
    body.proof_breadth_complete !== false ||
    body.final_ga_audit_unblocked !== false ||
    body.runs_lean !== false ||
    body.executes_proofs !== false ||
    body.accepts_caller_success_metadata !== false ||
    body.accepts_caller_proof_material !== false ||
    body.proof_authority !== "none" ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    body.ga_certification_gate_separate !== true
  ) {
    invalidTask362();
  }
}

function assertCurrentArtifactReference(
  projectRoot: string,
  path: string,
  artifact: unknown,
  kind: string
): ArtifactReference {
  if (!isArtifactReference(artifact) || artifact.kind !== kind || normalizeRelativePath(artifact.path) !== normalizeRelativePath(path)) {
    invalidTask362();
  }
  let current: ArtifactReference;
  try {
    current = artifactForProjectFile(projectRoot, path, kind);
  } catch {
    invalidTask362();
  }
  if (!artifactReferencesEqual(artifact, current)) {
    invalidTask362();
  }
  return current;
}

function sanitizeBlockerReason(value: string, source: "task362" | "delegated"): string {
  const trimmed = value.trim();
  const sanitized = sanitizeActor(trimmed);
  if (sanitized !== trimmed || !/^[A-Za-z0-9_.:-]{1,200}$/u.test(trimmed)) {
    return source === "task362" ? "task362_blocker_reason_redacted" : "delegated_blocker_reason_redacted";
  }
  return trimmed;
}

function sanitizeBlockerReasons(values: string[], source: "task362" | "delegated"): string[] {
  return values.map((value) => sanitizeBlockerReason(value, source));
}

function readTask362Artifact(
  projectRoot: string,
  projectId: string,
  bridgeId: string,
  bridgePath: string,
  expectedSha256: string
): {
  body: PersistedTask362ClosureExecutionBridge;
  artifact: ArtifactReference;
  refs: {
    task361: ArtifactReference;
    task356: ArtifactReference;
    task355: ArtifactReference;
    delegatedTask355: ArtifactReference | null;
    delegatedTask356: ArtifactReference | null;
  };
  blockerReasons: string[];
} {
  const absolutePath = assertPathAllowed(projectRoot, bridgePath, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new ComathError(
      "Goal 3 selected-tranche next closure execution packaging results closure execution packaging results closure execution packaging follow-through Task362 artifact is missing",
      {
        statusCode: 404,
        code: errorCode("TASK362_MISSING")
      }
    );
  }
  const bytes = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(bytes);
  if (actualSha256 !== expectedSha256) {
    throw new ComathError(
      "Goal 3 selected-tranche next closure execution packaging results closure execution packaging results closure execution packaging follow-through Task362 artifact is stale",
      {
        statusCode: 409,
        code: errorCode("STALE_TASK362")
      }
    );
  }
  let body: PersistedTask362ClosureExecutionBridge;
  try {
    body = JSON.parse(bytes.toString("utf8")) as PersistedTask362ClosureExecutionBridge;
  } catch {
    invalidTask362();
  }
  if (
    body.schema_version !==
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge.v1" ||
    body.project_id !== projectId ||
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id !==
      bridgeId ||
    normalizeRelativePath(
      body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path
    ) !== bridgePath ||
    (body.bridge_status !== "ready_for_next_selected_tranche_execution" &&
      body.bridge_status !== "complete_proof_breadth_requires_task301_final_ga_audit_binding" &&
      body.bridge_status !==
        "blocked_next_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_not_ready_for_closure_execution") ||
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
    !Array.isArray(body.next_execution_task_ids) ||
    !Array.isArray(body.completed_selected_task_ids) ||
    !Array.isArray(body.blocker_reasons)
  ) {
    invalidTask362();
  }
  const task361 = assertCurrentArtifactReference(
    projectRoot,
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_path,
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_artifact,
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck"
  );
  const task356 = assertCurrentArtifactReference(
    projectRoot,
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path,
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact,
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge"
  );
  const task355 = assertCurrentArtifactReference(
    projectRoot,
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path,
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact,
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck"
  );

  let delegatedTask355: ArtifactReference | null = null;
  if (
    body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id !==
      null ||
    body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path !==
      null ||
    body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact !==
      null
  ) {
    if (
      typeof body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id !==
        "string" ||
      typeof body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path !==
        "string"
    ) {
      invalidTask362();
    }
    delegatedTask355 = assertCurrentArtifactReference(
      projectRoot,
      body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path,
      body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact,
      "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck"
    );
  }

  let delegatedTask356: ArtifactReference | null = null;
  if (
    body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id !==
      null ||
    body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path !==
      null ||
    body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact !==
      null
  ) {
    if (
      typeof body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id !==
        "string" ||
      typeof body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path !==
        "string" ||
      !delegatedTask355
    ) {
      invalidTask362();
    }
    delegatedTask356 = assertCurrentArtifactReference(
      projectRoot,
      body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path,
      body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact,
      "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge"
    );
    assertDelegatedTask356Shape(
      projectRoot,
      projectId,
      body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id,
      delegatedTask356.path
    );
  }

  return {
    body,
    artifact: {
      kind: "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge",
      path: bridgePath,
      sha256: actualSha256,
      size_bytes: bytes.byteLength
    },
    refs: {
      task361,
      task356,
      task355,
      delegatedTask355,
      delegatedTask356
    },
    blockerReasons: sanitizeBlockerReasons(assertStringArray(body.blocker_reasons), "task362")
  };
}

function callerProofOrGaMaterialPresent(
  input: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThroughInput
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

export function recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough(
  projectRoot: string,
  input: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThroughInput
): Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough {
  const projectId = assertSafeId(input.project_id, "project_id");
  const followThroughId = assertSafeId(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id,
    "selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id"
  );
  const task362Id = assertSafeId(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id,
    "selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id"
  );
  const task362Sha256 = assertSha256(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_sha256
  );
  const task362RelativePath = assertTask362InputPath(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path,
    task362Id
  );
  const requestedMode =
    input.requested_follow_through_mode ??
    "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through";
  if (
    requestedMode !==
    "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through"
  ) {
    throw new ComathError(
      "Goal 3 selected-tranche next closure execution packaging results closure execution packaging results closure execution packaging follow-through mode is invalid",
      {
        statusCode: 400,
        code: errorCode("INVALID_MODE")
      }
    );
  }
  const outputPath = followThroughPath(followThroughId);
  const absoluteOutputPath = assertPathAllowed(projectRoot, outputPath, { purpose: "runtime-write" });
  if (existsSync(absoluteOutputPath)) {
    throw new ComathError(
      "Goal 3 selected-tranche next closure execution packaging results closure execution packaging results closure execution packaging follow-through already exists",
      {
        statusCode: 409,
        code: errorCode("ALREADY_EXISTS")
      }
    );
  }

  const task362 = readTask362Artifact(projectRoot, projectId, task362Id, task362RelativePath, task362Sha256);
  const actor = sanitizeActor(input.actor);
  const followThroughSuffix = shortIdSuffix(followThroughId);
  const delegatedTask358Id = assertSafeId(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id ??
      `G3-T364-T358-${followThroughSuffix}`,
    "selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id"
  );
  const claimIdPrefix =
    typeof input.claim_id_prefix === "string" && input.claim_id_prefix.trim().length > 0
      ? input.claim_id_prefix.trim()
      : "C-T364";
  const callerAuthorityMaterialIgnored = callerProofOrGaMaterialPresent(input);
  const baseBlockerReasons = uniqueStrings([
    ...task362.blockerReasons,
    ...(callerAuthorityMaterialIgnored ? ["caller_proof_or_ga_authority_material_ignored"] : [])
  ]);

  let delegated: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough | null =
    null;
  if (task362.refs.delegatedTask356) {
    delegated =
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough(
        projectRoot,
        {
          project_id: projectId,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
            delegatedTask358Id,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
            task362.body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id as string,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path:
            task362.refs.delegatedTask356.path,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_sha256:
            task362.refs.delegatedTask356.sha256,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id:
            input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id,
          selected_tranche_next_closure_packaging_follow_through_id:
            input.selected_tranche_next_closure_packaging_follow_through_id,
          selected_tranche_next_packaging_follow_through_id: input.selected_tranche_next_packaging_follow_through_id,
          task_local_packaging_follow_through_id: input.task_local_packaging_follow_through_id,
          claim_id_prefix: claimIdPrefix,
          evidence_by_task_id: input.evidence_by_task_id,
          actor,
          requested_follow_through_mode:
            "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through"
        }
      );
    if (
      delegated.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id !==
        task362.body
          .delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id ||
      normalizeRelativePath(
        delegated.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path
      ) !== task362.refs.delegatedTask356.path ||
      !artifactReferencesEqual(
        delegated.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact,
        task362.refs.delegatedTask356
      )
    ) {
      throw new ComathError(
        "Goal 3 selected-tranche next closure execution packaging results closure execution packaging results closure execution packaging follow-through delegated Task358 material is inconsistent",
        {
          statusCode: 409,
          code: errorCode("TASK358_DELEGATED_MISMATCH")
        }
      );
    }
  }

  const delegatedBlockerReasons = delegated ? sanitizeBlockerReasons(delegated.blocker_reasons, "delegated") : [];
  const blockerReasons = uniqueStrings([
    ...baseBlockerReasons,
    ...delegatedBlockerReasons,
    ...(delegated ? [] : ["task362_not_ready_for_closure_execution_packaging"])
  ]);
  const body = {
    schema_version:
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through.v1",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
      followThroughId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    ok: delegated?.ok ?? false,
    follow_through_status:
      delegated?.follow_through_status ??
      "blocked_next_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_not_ready_for_closure_execution_packaging",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path:
      outputPath,
    requested_follow_through_mode:
      "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
      task362Id,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path:
      task362RelativePath,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact:
      task362.artifact,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id:
      task362.body
        .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_path:
      task362.refs.task361.path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_artifact:
      task362.refs.task361,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
      task362.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path:
      task362.refs.task356.path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact:
      task362.refs.task356,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id:
      task362.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path:
      task362.refs.task355.path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact:
      task362.refs.task355,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id:
      task362.body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path:
      task362.refs.delegatedTask355?.path ?? null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact:
      task362.refs.delegatedTask355,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
      task362.body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path:
      task362.refs.delegatedTask356?.path ?? null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact:
      task362.refs.delegatedTask356,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
      delegated?.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id ??
      null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path:
      delegated?.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path ??
      null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact:
      delegated?.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact ??
      null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id:
      delegated?.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id ??
      null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_path:
      delegated?.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_path ??
      null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_artifact:
      delegated?.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_artifact ??
      null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_bridge_id:
      delegated?.delegated_selected_tranche_next_closure_packaging_results_closure_execution_bridge_id ?? null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_bridge_path:
      delegated?.delegated_selected_tranche_next_closure_packaging_results_closure_execution_bridge_path ?? null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_bridge_artifact:
      delegated?.delegated_selected_tranche_next_closure_packaging_results_closure_execution_bridge_artifact ?? null,
    delegated_selected_tranche_next_closure_execution_bridge_id:
      delegated?.delegated_selected_tranche_next_closure_execution_bridge_id ?? null,
    delegated_selected_tranche_next_closure_execution_bridge_path:
      delegated?.delegated_selected_tranche_next_closure_execution_bridge_path ?? null,
    delegated_selected_tranche_next_closure_execution_bridge_artifact:
      delegated?.delegated_selected_tranche_next_closure_execution_bridge_artifact ?? null,
    delegated_selected_tranche_next_execution_bridge_id: delegated?.delegated_selected_tranche_next_execution_bridge_id ?? null,
    delegated_selected_tranche_next_execution_bridge_path:
      delegated?.delegated_selected_tranche_next_execution_bridge_path ?? null,
    delegated_selected_tranche_next_execution_bridge_artifact:
      delegated?.delegated_selected_tranche_next_execution_bridge_artifact ?? null,
    selected_tranche_next_closure_packaging_follow_through_id:
      delegated?.selected_tranche_next_closure_packaging_follow_through_id ?? null,
    selected_tranche_next_closure_packaging_follow_through_path:
      delegated?.selected_tranche_next_closure_packaging_follow_through_path ?? null,
    selected_tranche_next_closure_packaging_follow_through_artifact:
      delegated?.selected_tranche_next_closure_packaging_follow_through_artifact ?? null,
    selected_tranche_next_packaging_follow_through_id: delegated?.selected_tranche_next_packaging_follow_through_id ?? null,
    selected_tranche_next_packaging_follow_through_path:
      delegated?.selected_tranche_next_packaging_follow_through_path ?? null,
    selected_tranche_next_packaging_follow_through_artifact:
      delegated?.selected_tranche_next_packaging_follow_through_artifact ?? null,
    task_local_packaging_follow_through_id: delegated?.task_local_packaging_follow_through_id ?? null,
    task_local_packaging_follow_through_path: delegated?.task_local_packaging_follow_through_path ?? null,
    task_local_packaging_follow_through_artifact: delegated?.task_local_packaging_follow_through_artifact ?? null,
    task_local_packaging_follow_through_status: delegated?.task_local_packaging_follow_through_status ?? null,
    claim_id_prefix: claimIdPrefix,
    blocker_reasons: blockerReasons,
    selected_task_count: delegated?.selected_task_count ?? 0,
    verified_selected_task_count: delegated?.verified_selected_task_count ?? 0,
    blocked_selected_task_count: delegated?.blocked_selected_task_count ?? 0,
    written_packaging_report_count: delegated?.written_packaging_report_count ?? 0,
    selected_task_ids: delegated?.selected_task_ids ?? [],
    verified_selected_task_ids: delegated?.verified_selected_task_ids ?? [],
    blocked_selected_task_ids: delegated?.blocked_selected_task_ids ?? [],
    selected_packaging_report_artifacts: delegated?.selected_packaging_report_artifacts ?? [],
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
    Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough,
    "selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact"
  >;

  const text = `${JSON.stringify(body, null, 2)}\n`;
  mkdirSync(dirname(absoluteOutputPath), { recursive: true });
  writeFileSync(absoluteOutputPath, text, "utf8");
  const result: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough =
    {
      ...body,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact:
        {
          kind: "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through",
          path: outputPath,
          sha256: sha256Text(text),
          size_bytes: Buffer.byteLength(text, "utf8")
        }
    };

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type:
      "release.goal3_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_recorded",
    actor,
    target_id: projectId,
    payload: {
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
        followThroughId,
      follow_through_status: result.follow_through_status,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path:
        outputPath,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact_sha256:
        result
          .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact
          .sha256,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
        task362Id,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact_sha256:
        task362.artifact.sha256,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
        result.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact_sha256:
        result.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact
          ?.sha256 ?? null,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
        result
          .delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact_sha256:
        result
          .delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact
          ?.sha256 ?? null,
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
