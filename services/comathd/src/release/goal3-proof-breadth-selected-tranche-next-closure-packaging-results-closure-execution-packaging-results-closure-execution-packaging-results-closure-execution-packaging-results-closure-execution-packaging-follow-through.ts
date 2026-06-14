import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { assertPathAllowed } from "../security/path-policy.js";
import {
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough,
  type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough,
  type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThroughInput
} from "./goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-follow-through.js";

type ArtifactReference = {
  kind: string;
  path: string;
  sha256: string;
  size_bytes: number;
};

type JsonRecord = Record<string, any>;

type EvidenceByTaskId = NonNullable<
  Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThroughInput["evidence_by_task_id"]
>;

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThroughInput =
  {
    project_id: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id?: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_sha256: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id?: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id?: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id?: string;
    selected_tranche_next_closure_packaging_follow_through_id?: string;
    selected_tranche_next_packaging_follow_through_id?: string;
    task_local_packaging_follow_through_id?: string;
    claim_id_prefix?: string;
    evidence_by_task_id?: EvidenceByTaskId;
    actor?: string;
    requested_follow_through_mode?: "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through";
  };

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough =
  {
    schema_version: "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through.v1";
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id: string;
    project_id: string;
    actor: string;
    created_at: string;
    ok: boolean;
    follow_through_status:
      | Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough["follow_through_status"]
      | "blocked_next_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_not_ready_for_closure_execution_packaging";
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path: string;
    requested_follow_through_mode: "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through";
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact: ArtifactReference;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_path: string;
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_artifact: ArtifactReference;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id: string | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path: string | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact: ArtifactReference | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id: string | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path: string | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact: ArtifactReference | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id: string | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path: string | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact: ArtifactReference | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id: string | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_path: string | null;
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_artifact: ArtifactReference | null;
    delegated_selected_tranche_next_closure_packaging_follow_through_id: string | null;
    delegated_selected_tranche_next_closure_packaging_follow_through_path: string | null;
    delegated_selected_tranche_next_closure_packaging_follow_through_artifact: ArtifactReference | null;
    delegated_selected_tranche_next_packaging_follow_through_id: string | null;
    delegated_selected_tranche_next_packaging_follow_through_path: string | null;
    delegated_selected_tranche_next_packaging_follow_through_artifact: ArtifactReference | null;
    delegated_task_local_packaging_follow_through_id: string | null;
    delegated_task_local_packaging_follow_through_path: string | null;
    delegated_task_local_packaging_follow_through_artifact: ArtifactReference | null;
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
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact: ArtifactReference;
  };

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function followThroughPath(followThroughId: string): string {
  return normalizeRelativePath(
    join(
      ".comath",
      "release",
      "goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-follow-through",
      followThroughId,
      "follow-through.json"
    )
  );
}

function task368Path(bridgeId: string): string {
  return normalizeRelativePath(
    join(
      ".comath",
      "release",
      "goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-bridge",
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
  return `GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_FOLLOW_THROUGH_${suffix}`;
}

function assertSafeId(value: string | undefined, label: string): string {
  const id = typeof value === "string" ? value.trim() : "";
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,320}$/u.test(id)) {
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
      "Goal 3 selected-tranche next closure execution packaging results closure execution packaging follow-through hash is invalid",
      {
        statusCode: 400,
        code: errorCode("INVALID_HASH")
      }
    );
  }
  return sha256;
}

function assertTask368InputPath(path: string | undefined, bridgeId: string): string {
  const normalizedInputPath = normalizeRelativePath(typeof path === "string" ? path.trim() : "");
  const expectedPath = task368Path(bridgeId);
  if (normalizedInputPath !== expectedPath) {
    throw new ComathError(
      "Goal 3 selected-tranche next closure execution packaging results closure execution packaging follow-through Task368 path mismatch",
      {
        statusCode: 400,
        code: errorCode("TASK368_PATH_MISMATCH")
      }
    );
  }
  return expectedPath;
}

function sanitizeActor(actor: string | undefined): string {
  const text =
    typeof actor === "string" && actor.trim().length > 0
      ? actor.trim()
      : "goal3-selected-tranche-next-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-follow-through";
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

function invalidTask368(): never {
  throw new ComathError(
    "Goal 3 selected-tranche next closure execution packaging results closure execution packaging follow-through Task368 artifact is invalid",
    {
      statusCode: 400,
      code: errorCode("INVALID_TASK368")
    }
  );
}

function assertStringArray(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    invalidTask368();
  }
  return value as string[];
}

function assertCurrentArtifactReference(
  projectRoot: string,
  path: unknown,
  artifact: unknown,
  kind: string
): ArtifactReference {
  if (
    typeof path !== "string" ||
    !isArtifactReference(artifact) ||
    artifact.kind !== kind ||
    normalizeRelativePath(artifact.path) !== normalizeRelativePath(path)
  ) {
    invalidTask368();
  }
  let current: ArtifactReference;
  try {
    current = artifactForProjectFile(projectRoot, path, kind);
  } catch {
    invalidTask368();
  }
  if (!artifactReferencesEqual(artifact, current)) {
    invalidTask368();
  }
  return current;
}

function assertOptionalCurrentArtifactReference(
  projectRoot: string,
  path: unknown,
  artifact: unknown,
  kind: string
): ArtifactReference | null {
  if (path === null && artifact === null) {
    return null;
  }
  return assertCurrentArtifactReference(projectRoot, path, artifact, kind);
}

function sanitizeBlockerReason(value: string, source: "task368" | "delegated"): string {
  const trimmed = value.trim();
  const sanitized = sanitizeActor(trimmed);
  if (sanitized !== trimmed || !/^[A-Za-z0-9_.:-]{1,240}$/u.test(trimmed)) {
    return source === "task368" ? "task368_blocker_reason_redacted" : "delegated_blocker_reason_redacted";
  }
  return trimmed;
}

function sanitizeBlockerReasons(values: string[], source: "task368" | "delegated"): string[] {
  return values.map((value) => sanitizeBlockerReason(value, source));
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function callerProofOrGaMaterialPresent(input: Record<string, unknown>): boolean {
  const text = JSON.stringify(input);
  return /lean_kernel_clean_replay|clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|kernel_checked|proof_success|GA certified|can_certify_ga|can_promote_claim|proof_breadth_closure_json|final_ga_audit_json/iu.test(
    text
  );
}

function parseTask368(bytes: Buffer): JsonRecord {
  try {
    return JSON.parse(bytes.toString("utf8")) as JsonRecord;
  } catch {
    invalidTask368();
  }
}

function readTask368Artifact(
  projectRoot: string,
  projectId: string,
  bridgeId: string,
  bridgePath: string,
  expectedSha256: string
): {
  body: JsonRecord;
  artifact: ArtifactReference;
  refs: {
    task367: ArtifactReference;
    delegatedTask362: ArtifactReference | null;
  };
  blockerReasons: string[];
} {
  const absolutePath = assertPathAllowed(projectRoot, bridgePath, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new ComathError(
      "Goal 3 selected-tranche next closure execution packaging results closure execution packaging follow-through Task368 artifact is missing",
      {
        statusCode: 404,
        code: errorCode("TASK368_MISSING")
      }
    );
  }
  const bytes = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(bytes);
  if (actualSha256 !== expectedSha256) {
    throw new ComathError(
      "Goal 3 selected-tranche next closure execution packaging results closure execution packaging follow-through Task368 artifact is stale",
      {
        statusCode: 409,
        code: errorCode("STALE_TASK368")
      }
    );
  }
  const body = parseTask368(bytes);
  if (
    body.schema_version !==
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge.v1" ||
    body.project_id !== projectId ||
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id !==
      bridgeId ||
    normalizeRelativePath(
      String(
        body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path ??
          ""
      )
    ) !== bridgePath ||
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
    !Array.isArray(body.blocker_reasons)
  ) {
    invalidTask368();
  }
  const task367 = assertCurrentArtifactReference(
    projectRoot,
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_path,
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_artifact,
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck"
  );
  const delegatedTask362 = assertOptionalCurrentArtifactReference(
    projectRoot,
    body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path,
    body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact,
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge"
  );
  return {
    body,
    artifact: {
      kind: "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge",
      path: bridgePath,
      sha256: actualSha256,
      size_bytes: bytes.byteLength
    },
    refs: {
      task367,
      delegatedTask362
    },
    blockerReasons: sanitizeBlockerReasons(assertStringArray(body.blocker_reasons), "task368")
  };
}

export function recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough(
  projectRoot: string,
  input: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThroughInput
): Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough {
  const projectId = assertSafeId(input.project_id, "project_id");
  const followThroughId = assertSafeId(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id,
    "selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id"
  );
  const task368Id = assertSafeId(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id,
    "selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id"
  );
  const task368Sha256 = assertSha256(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_sha256
  );
  const task368RelativePath = assertTask368InputPath(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path,
    task368Id
  );
  const requestedMode =
    input.requested_follow_through_mode ??
    "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through";
  if (
    requestedMode !==
    "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through"
  ) {
    throw new ComathError(
      "Goal 3 selected-tranche next closure execution packaging results closure execution packaging follow-through mode is invalid",
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
      "Goal 3 selected-tranche next closure execution packaging results closure execution packaging follow-through already exists",
      {
        statusCode: 409,
        code: errorCode("ALREADY_EXISTS")
      }
    );
  }

  const task368 = readTask368Artifact(projectRoot, projectId, task368Id, task368RelativePath, task368Sha256);
  const actor = sanitizeActor(input.actor);
  const followThroughSuffix = shortIdSuffix(followThroughId);
  const delegatedTask364Id = assertSafeId(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id ??
      `G3-T370-T364-${followThroughSuffix}`,
    "selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id"
  );
  const claimIdPrefix =
    typeof input.claim_id_prefix === "string" && input.claim_id_prefix.trim().length > 0
      ? input.claim_id_prefix.trim()
      : "C-T370";
  const callerAuthorityMaterialIgnored = callerProofOrGaMaterialPresent(input);
  const baseBlockerReasons = uniqueStrings([
    ...task368.blockerReasons,
    ...(callerAuthorityMaterialIgnored ? ["caller_proof_or_ga_authority_material_ignored"] : [])
  ]);

  let delegated: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough | null =
    null;
  if (task368.refs.delegatedTask362) {
    delegated =
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough(
        projectRoot,
        {
          project_id: projectId,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
            delegatedTask364Id,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
            task368.body
              .delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path:
            task368.refs.delegatedTask362.path,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_sha256:
            task368.refs.delegatedTask362.sha256,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
            input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id,
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
            "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through"
        }
      );
    if (
      delegated.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id !==
        task368.body
          .delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id ||
      normalizeRelativePath(
        delegated.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path
      ) !== task368.refs.delegatedTask362.path ||
      !artifactReferencesEqual(
        delegated.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact,
        task368.refs.delegatedTask362
      )
    ) {
      throw new ComathError(
        "Goal 3 selected-tranche next closure execution packaging results closure execution packaging follow-through delegated Task364 material is inconsistent",
        {
          statusCode: 409,
          code: errorCode("TASK364_DELEGATED_MISMATCH")
        }
      );
    }
  }

  const delegatedBlockerReasons = delegated ? sanitizeBlockerReasons(delegated.blocker_reasons, "delegated") : [];
  const blockerReasons = uniqueStrings([
    ...baseBlockerReasons,
    ...delegatedBlockerReasons,
    ...(delegated ? [] : ["task368_not_ready_for_closure_execution_packaging"])
  ]);
  const body = {
    schema_version:
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through.v1",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
      followThroughId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    ok: delegated?.ok ?? false,
    follow_through_status:
      delegated?.follow_through_status ??
      "blocked_next_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_not_ready_for_closure_execution_packaging",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path:
      outputPath,
    requested_follow_through_mode:
      "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
      task368Id,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path:
      task368RelativePath,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact:
      task368.artifact,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id:
      task368.body
        .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_path:
      task368.refs.task367.path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_artifact:
      task368.refs.task367,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
      task368.body
        .delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path:
      task368.refs.delegatedTask362?.path ?? null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact:
      task368.refs.delegatedTask362,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
      delegated?.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id ??
      null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path:
      delegated?.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path ??
      null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact:
      delegated?.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact ??
      null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
      delegated?.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id ??
      null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path:
      delegated?.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path ??
      null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact:
      delegated?.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact ??
      null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id:
      delegated?.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id ?? null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_path:
      delegated?.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_path ?? null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_artifact:
      delegated?.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_artifact ?? null,
    delegated_selected_tranche_next_closure_packaging_follow_through_id:
      delegated?.selected_tranche_next_closure_packaging_follow_through_id ?? null,
    delegated_selected_tranche_next_closure_packaging_follow_through_path:
      delegated?.selected_tranche_next_closure_packaging_follow_through_path ?? null,
    delegated_selected_tranche_next_closure_packaging_follow_through_artifact:
      delegated?.selected_tranche_next_closure_packaging_follow_through_artifact ?? null,
    delegated_selected_tranche_next_packaging_follow_through_id: delegated?.selected_tranche_next_packaging_follow_through_id ?? null,
    delegated_selected_tranche_next_packaging_follow_through_path:
      delegated?.selected_tranche_next_packaging_follow_through_path ?? null,
    delegated_selected_tranche_next_packaging_follow_through_artifact:
      delegated?.selected_tranche_next_packaging_follow_through_artifact ?? null,
    delegated_task_local_packaging_follow_through_id: delegated?.task_local_packaging_follow_through_id ?? null,
    delegated_task_local_packaging_follow_through_path: delegated?.task_local_packaging_follow_through_path ?? null,
    delegated_task_local_packaging_follow_through_artifact: delegated?.task_local_packaging_follow_through_artifact ?? null,
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
    Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough,
    "selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact"
  >;

  const text = `${JSON.stringify(body, null, 2)}\n`;
  mkdirSync(dirname(absoluteOutputPath), { recursive: true });
  writeFileSync(absoluteOutputPath, text, "utf8");
  const result: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough =
    {
      ...body,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact:
        {
          kind: "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through",
          path: outputPath,
          sha256: sha256Text(text),
          size_bytes: Buffer.byteLength(text, "utf8")
        }
    };

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type:
      "release.goal3_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_recorded",
    actor,
    target_id: projectId,
    payload: {
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
        followThroughId,
      follow_through_status: result.follow_through_status,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path:
        outputPath,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact_sha256:
        result
          .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact
          .sha256,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
        task368Id,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact_sha256:
        task368.artifact.sha256,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
        result.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact_sha256:
        result
          .delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact
          ?.sha256 ?? null,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
        result
          .delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact_sha256:
        result
          .delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact
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
