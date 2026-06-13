import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { assertPathAllowed } from "../security/path-policy.js";
import {
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureRecheck,
  type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureRecheck
} from "./goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-recheck.js";
import type { Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsFollowUp } from "./goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-follow-up.js";

type ArtifactReference = {
  kind: string;
  path: string;
  sha256: string;
  size_bytes: number;
};

type PersistedTask353ClosureExecutionPackagingResultsFollowUp = Omit<
  Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsFollowUp,
  "selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_artifact"
>;

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureRecheckInput = {
  project_id: string;
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id?: string;
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id: string;
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_path: string;
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_sha256: string;
  actor?: string;
  requested_recheck_mode?: "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck";
};

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureRecheck = {
  schema_version: "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck.v1";
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  ok: boolean;
  recheck_status:
    | "next_closure_execution_packaging_results_recheck_global_proof_breadth_complete"
    | "blocked_global_proof_breadth_incomplete_after_next_closure_execution_packaging_results_recheck";
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path: string;
  requested_recheck_mode: "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck";
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id: string;
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_path: string;
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_artifact: ArtifactReference;
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id: string;
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_path: string;
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_artifact: ArtifactReference;
  selected_tranche_next_closure_packaging_results_closure_execution_bridge_id: string;
  selected_tranche_next_closure_packaging_results_closure_execution_bridge_path: string;
  selected_tranche_next_closure_packaging_results_closure_execution_bridge_artifact: ArtifactReference;
  delegated_selected_tranche_next_closure_packaging_results_follow_up_id: string;
  delegated_selected_tranche_next_closure_packaging_results_follow_up_path: string;
  delegated_selected_tranche_next_closure_packaging_results_follow_up_artifact: ArtifactReference;
  delegated_selected_tranche_next_closure_packaging_results_closure_recheck_id: string;
  delegated_selected_tranche_next_closure_packaging_results_closure_recheck_path: string;
  delegated_selected_tranche_next_closure_packaging_results_closure_recheck_artifact: ArtifactReference;
  proof_breadth_closure_id: string;
  proof_breadth_closure_path: string;
  proof_breadth_closure_artifact: ArtifactReference;
  selected_task_count: number;
  selected_task_ids: string[];
  verified_selected_task_count: number;
  selected_packaging_report_artifacts: ArtifactReference[];
  selected_packaging_report_artifacts_current: true;
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
  selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact: ArtifactReference;
};

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function recheckPath(recheckId: string): string {
  return normalizeRelativePath(
    join(
      ".comath",
      "release",
      "goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-recheck",
      recheckId,
      "recheck.json"
    )
  );
}

function task353Path(followUpId: string): string {
  return normalizeRelativePath(
    join(
      ".comath",
      "release",
      "goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-follow-up",
      followUpId,
      "follow-up.json"
    )
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
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,200}$/u.test(id)) {
    throw new ComathError(`${label} is invalid`, {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_RECHECK_INVALID_ID"
    });
  }
  return id;
}

function assertSha256(value: string | undefined): string {
  const sha256 = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-f0-9]{64}$/u.test(sha256)) {
    throw new ComathError("Goal 3 selected-tranche next closure execution packaging results closure recheck hash is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_RECHECK_INVALID_HASH"
    });
  }
  return sha256;
}

function sanitizeActor(actor: string | undefined): string {
  const text =
    typeof actor === "string" && actor.trim().length > 0
      ? actor.trim()
      : "goal3-selected-tranche-next-closure-execution-packaging-results-closure-recheck";
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

function invalidTask353(): never {
  throw new ComathError("Goal 3 selected-tranche next closure execution packaging results closure recheck Task353 artifact is invalid", {
    statusCode: 400,
    code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_RECHECK_INVALID_TASK353"
  });
}

function assertCurrentArtifactReference(
  projectRoot: string,
  path: string,
  artifact: unknown,
  kind: string
): ArtifactReference {
  if (!isArtifactReference(artifact) || artifact.kind !== kind || normalizeRelativePath(artifact.path) !== normalizeRelativePath(path)) {
    invalidTask353();
  }
  let current: ArtifactReference;
  try {
    current = artifactForProjectFile(projectRoot, path, kind);
  } catch {
    invalidTask353();
  }
  if (!artifactReferencesEqual(artifact, current)) {
    invalidTask353();
  }
  return current;
}

function assertTask353InputPath(path: string | undefined, followUpId: string): string {
  const normalizedInputPath = normalizeRelativePath(typeof path === "string" ? path.trim() : "");
  const expectedPath = task353Path(followUpId);
  if (normalizedInputPath !== expectedPath) {
    throw new ComathError("Goal 3 selected-tranche next closure execution packaging results closure recheck Task353 path mismatch", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_RECHECK_TASK353_PATH_MISMATCH"
    });
  }
  return expectedPath;
}

function readTask353Artifact(
  projectRoot: string,
  projectId: string,
  followUpId: string,
  followUpPath: string,
  expectedSha256: string
): { body: PersistedTask353ClosureExecutionPackagingResultsFollowUp; artifact: ArtifactReference; refs: { task352: ArtifactReference; task350: ArtifactReference; task347: ArtifactReference } } {
  const absolutePath = assertPathAllowed(projectRoot, followUpPath, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new ComathError("Goal 3 selected-tranche next closure execution packaging results closure recheck Task353 artifact is missing", {
      statusCode: 404,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_RECHECK_TASK353_MISSING"
    });
  }
  const bytes = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(bytes);
  if (actualSha256 !== expectedSha256) {
    throw new ComathError("Goal 3 selected-tranche next closure execution packaging results closure recheck Task353 artifact is stale", {
      statusCode: 409,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_RECHECK_STALE_TASK353"
    });
  }
  let body: PersistedTask353ClosureExecutionPackagingResultsFollowUp;
  try {
    body = JSON.parse(bytes.toString("utf8")) as PersistedTask353ClosureExecutionPackagingResultsFollowUp;
  } catch {
    invalidTask353();
  }
  if (
    body.schema_version !==
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up.v1" ||
    body.project_id !== projectId ||
    body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id !==
      followUpId ||
    normalizeRelativePath(body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_path) !==
      followUpPath ||
    body.selected_packaging_report_artifacts_current !== true ||
    body.ready_for_proof_breadth_closure_recheck !== true ||
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
    typeof body.delegated_selected_tranche_next_closure_packaging_results_follow_up_id !== "string" ||
    typeof body.delegated_selected_tranche_next_closure_packaging_results_follow_up_path !== "string" ||
    !Array.isArray(body.selected_task_ids) ||
    !Array.isArray(body.selected_packaging_report_artifacts)
  ) {
    invalidTask353();
  }
  return {
    body,
    artifact: {
      kind: "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up",
      path: followUpPath,
      sha256: actualSha256,
      size_bytes: bytes.byteLength
    },
    refs: {
      task352: assertCurrentArtifactReference(
        projectRoot,
        body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_path,
        body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_artifact,
        "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through"
      ),
      task350: assertCurrentArtifactReference(
        projectRoot,
        body.selected_tranche_next_closure_packaging_results_closure_execution_bridge_path,
        body.selected_tranche_next_closure_packaging_results_closure_execution_bridge_artifact,
        "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_bridge"
      ),
      task347: assertCurrentArtifactReference(
        projectRoot,
        body.delegated_selected_tranche_next_closure_packaging_results_follow_up_path,
        body.delegated_selected_tranche_next_closure_packaging_results_follow_up_artifact,
        "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_follow_up"
      )
    }
  };
}

function callerProofOrGaMaterialPresent(
  input: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureRecheckInput
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
    record.proof_breadth_closure_json !== undefined ||
    record.selected_tranche_next_closure_packaging_results_closure_recheck_id !== undefined ||
    record.proof_breadth_closure_id !== undefined
  );
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

export function recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureRecheck(
  projectRoot: string,
  input: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureRecheckInput
): Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureRecheck {
  const projectId = assertSafeId(input.project_id, "project_id");
  const closureRecheckId = assertSafeId(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id,
    "selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id"
  );
  const task353Id = assertSafeId(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id,
    "selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id"
  );
  const task353Sha256 = assertSha256(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_sha256
  );
  const task353RelativePath = assertTask353InputPath(
    input.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_path,
    task353Id
  );
  const requestedMode =
    input.requested_recheck_mode ??
    "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck";
  if (
    requestedMode !==
    "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck"
  ) {
    throw new ComathError("Goal 3 selected-tranche next closure execution packaging results closure recheck mode is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_RECHECK_INVALID_MODE"
    });
  }
  const outputPath = recheckPath(closureRecheckId);
  const absoluteOutputPath = assertPathAllowed(projectRoot, outputPath, { purpose: "runtime-write" });
  if (existsSync(absoluteOutputPath)) {
    throw new ComathError("Goal 3 selected-tranche next closure execution packaging results closure recheck already exists", {
      statusCode: 409,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_RECHECK_ALREADY_EXISTS"
    });
  }

  const task353 = readTask353Artifact(projectRoot, projectId, task353Id, task353RelativePath, task353Sha256);
  const actor = sanitizeActor(input.actor);
  const delegatedRecheck = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureRecheck(
    projectRoot,
    {
      project_id: projectId,
      selected_tranche_next_closure_packaging_results_closure_recheck_id: `${closureRecheckId}-TASK349`,
      selected_tranche_next_closure_packaging_results_follow_up_id:
        task353.body.delegated_selected_tranche_next_closure_packaging_results_follow_up_id,
      selected_tranche_next_closure_packaging_results_follow_up_path: task353.refs.task347.path,
      selected_tranche_next_closure_packaging_results_follow_up_sha256: task353.refs.task347.sha256,
      actor,
      requested_recheck_mode:
        "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_recheck"
    }
  );
  const callerAuthorityMaterialIgnored = callerProofOrGaMaterialPresent(input);
  const blockerReasons = uniqueStrings([
    ...task353.body.blocker_reasons,
    ...delegatedRecheck.blocker_reasons,
    ...(callerAuthorityMaterialIgnored ? ["caller_proof_or_ga_authority_material_ignored"] : [])
  ]);
  const body = {
    schema_version:
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck.v1",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id:
      closureRecheckId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    ok: delegatedRecheck.proof_breadth_complete,
    recheck_status: delegatedRecheck.proof_breadth_complete
      ? "next_closure_execution_packaging_results_recheck_global_proof_breadth_complete"
      : "blocked_global_proof_breadth_incomplete_after_next_closure_execution_packaging_results_recheck",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path:
      outputPath,
    requested_recheck_mode:
      "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id: task353Id,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_path:
      task353RelativePath,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_artifact:
      task353.artifact,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id:
      task353.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_path:
      task353.refs.task352.path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_artifact:
      task353.refs.task352,
    selected_tranche_next_closure_packaging_results_closure_execution_bridge_id:
      task353.body.selected_tranche_next_closure_packaging_results_closure_execution_bridge_id,
    selected_tranche_next_closure_packaging_results_closure_execution_bridge_path: task353.refs.task350.path,
    selected_tranche_next_closure_packaging_results_closure_execution_bridge_artifact: task353.refs.task350,
    delegated_selected_tranche_next_closure_packaging_results_follow_up_id:
      task353.body.delegated_selected_tranche_next_closure_packaging_results_follow_up_id,
    delegated_selected_tranche_next_closure_packaging_results_follow_up_path: task353.refs.task347.path,
    delegated_selected_tranche_next_closure_packaging_results_follow_up_artifact: task353.refs.task347,
    delegated_selected_tranche_next_closure_packaging_results_closure_recheck_id:
      delegatedRecheck.selected_tranche_next_closure_packaging_results_closure_recheck_id,
    delegated_selected_tranche_next_closure_packaging_results_closure_recheck_path:
      delegatedRecheck.selected_tranche_next_closure_packaging_results_closure_recheck_path,
    delegated_selected_tranche_next_closure_packaging_results_closure_recheck_artifact:
      delegatedRecheck.selected_tranche_next_closure_packaging_results_closure_recheck_artifact,
    proof_breadth_closure_id: delegatedRecheck.proof_breadth_closure_id,
    proof_breadth_closure_path: delegatedRecheck.proof_breadth_closure_path,
    proof_breadth_closure_artifact: delegatedRecheck.proof_breadth_closure_artifact,
    selected_task_count: delegatedRecheck.selected_task_count,
    selected_task_ids: delegatedRecheck.selected_task_ids,
    verified_selected_task_count: delegatedRecheck.verified_selected_task_count,
    selected_packaging_report_artifacts: delegatedRecheck.selected_packaging_report_artifacts,
    selected_packaging_report_artifacts_current: true,
    blocker_reasons: blockerReasons,
    proof_breadth_complete: delegatedRecheck.proof_breadth_complete,
    final_ga_audit_unblocked: delegatedRecheck.final_ga_audit_unblocked,
    runs_lean: false,
    executes_proofs: false,
    accepts_caller_success_metadata: false,
    accepts_caller_proof_material: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    ga_certification_gate_separate: true
  } satisfies Omit<
    Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureRecheck,
    "selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact"
  >;

  const text = `${JSON.stringify(body, null, 2)}\n`;
  mkdirSync(dirname(absoluteOutputPath), { recursive: true });
  writeFileSync(absoluteOutputPath, text, "utf8");
  const result: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureRecheck =
    {
      ...body,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact: {
        kind: "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck",
        path: outputPath,
        sha256: sha256Text(text),
        size_bytes: Buffer.byteLength(text, "utf8")
      }
    };

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type:
      "release.goal3_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_recorded",
    actor,
    target_id: projectId,
    payload: {
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id:
        closureRecheckId,
      recheck_status: result.recheck_status,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path:
        outputPath,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact_sha256:
        result.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact
          .sha256,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id: task353Id,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_artifact_sha256:
        task353.artifact.sha256,
      delegated_selected_tranche_next_closure_packaging_results_closure_recheck_id:
        result.delegated_selected_tranche_next_closure_packaging_results_closure_recheck_id,
      delegated_selected_tranche_next_closure_packaging_results_closure_recheck_artifact_sha256:
        result.delegated_selected_tranche_next_closure_packaging_results_closure_recheck_artifact.sha256,
      proof_breadth_closure_id: result.proof_breadth_closure_id,
      proof_breadth_closure_artifact_sha256: result.proof_breadth_closure_artifact.sha256,
      selected_task_ids: result.selected_task_ids,
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
