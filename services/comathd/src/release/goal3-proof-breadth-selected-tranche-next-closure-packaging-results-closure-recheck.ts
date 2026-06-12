import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { assertPathAllowed } from "../security/path-policy.js";
import {
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureRecheck,
  type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureRecheck
} from "./goal3-proof-breadth-selected-tranche-next-closure-recheck.js";
import type { Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsFollowUp } from "./goal3-proof-breadth-selected-tranche-next-closure-packaging-results-follow-up.js";
import type { Goal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUp } from "./goal3-proof-breadth-selected-tranche-next-packaging-results-follow-up.js";

type ArtifactReference = {
  kind: string;
  path: string;
  sha256: string;
  size_bytes: number;
};

type PersistedSelectedTrancheNextClosurePackagingResultsFollowUp = Omit<
  Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsFollowUp,
  "selected_tranche_next_closure_packaging_results_follow_up_artifact"
>;

type PersistedSelectedTrancheNextPackagingResultsFollowUp = Omit<
  Goal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUp,
  "selected_tranche_next_packaging_results_follow_up_artifact"
>;

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureRecheckInput = {
  project_id: string;
  selected_tranche_next_closure_packaging_results_closure_recheck_id?: string;
  selected_tranche_next_closure_packaging_results_follow_up_id: string;
  selected_tranche_next_closure_packaging_results_follow_up_path: string;
  selected_tranche_next_closure_packaging_results_follow_up_sha256: string;
  actor?: string;
  requested_recheck_mode?: "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_recheck";
};

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureRecheck = {
  schema_version: "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_recheck.v1";
  selected_tranche_next_closure_packaging_results_closure_recheck_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  ok: boolean;
  recheck_status:
    | "next_closure_packaging_results_recheck_global_proof_breadth_complete"
    | "blocked_global_proof_breadth_incomplete_after_next_closure_packaging_results_recheck";
  selected_tranche_next_closure_packaging_results_closure_recheck_path: string;
  requested_recheck_mode: "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_recheck";
  selected_tranche_next_closure_packaging_results_follow_up_id: string;
  selected_tranche_next_closure_packaging_results_follow_up_path: string;
  selected_tranche_next_closure_packaging_results_follow_up_artifact: ArtifactReference;
  selected_tranche_next_closure_packaging_follow_through_id: string;
  selected_tranche_next_closure_packaging_follow_through_path: string;
  selected_tranche_next_closure_packaging_follow_through_artifact: ArtifactReference;
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
  selected_tranche_next_packaging_results_follow_up_id: string;
  selected_tranche_next_packaging_results_follow_up_path: string;
  selected_tranche_next_packaging_results_follow_up_artifact: ArtifactReference;
  selected_tranche_packaging_results_follow_up_id: string;
  selected_tranche_packaging_results_follow_up_path: string;
  selected_tranche_packaging_results_follow_up_artifact: ArtifactReference;
  delegated_selected_tranche_next_closure_recheck_id: string;
  delegated_selected_tranche_next_closure_recheck_path: string;
  delegated_selected_tranche_next_closure_recheck_artifact: ArtifactReference;
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
  selected_tranche_next_closure_packaging_results_closure_recheck_artifact: ArtifactReference;
};

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function selectedTrancheNextClosurePackagingResultsClosureRecheckPath(recheckId: string): string {
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

function selectedTrancheNextClosurePackagingResultsFollowUpPath(followUpId: string): string {
  return normalizeRelativePath(
    join(
      ".comath",
      "release",
      "goal3-selected-tranche-next-closure-packaging-results-follow-up",
      followUpId,
      "follow-up.json"
    )
  );
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
    join(
      ".comath",
      "release",
      "goal3-selected-tranche-next-closure-execution-bridge",
      bridgeId,
      "bridge.json"
    )
  );
}

function selectedTrancheNextExecutionBridgePath(bridgeId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "goal3-selected-tranche-next-execution-bridge", bridgeId, "bridge.json")
  );
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

function taskLocalPackagingFollowThroughPath(followThroughId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "goal3-task-local-packaging-follow-through", followThroughId, "follow-through.json")
  );
}

function selectedTrancheNextPackagingResultsFollowUpPath(followUpId: string): string {
  return normalizeRelativePath(
    join(
      ".comath",
      "release",
      "goal3-selected-tranche-next-packaging-results-follow-up",
      followUpId,
      "follow-up.json"
    )
  );
}

function selectedTranchePackagingResultsFollowUpPath(followUpId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "goal3-selected-tranche-packaging-results-follow-up", followUpId, "follow-up.json")
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
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_RECHECK_INVALID_ID"
    });
  }
  return id;
}

function assertSha256(value: string | undefined): string {
  const sha256 = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-f0-9]{64}$/u.test(sha256)) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging results closure recheck hash is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_RECHECK_INVALID_HASH"
    });
  }
  return sha256;
}

function sanitizeActor(actor: string | undefined): string {
  const text =
    typeof actor === "string" && actor.trim().length > 0
      ? actor.trim()
      : "goal3-selected-tranche-next-closure-packaging-results-closure-recheck";
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
    normalizeRelativePath(left.path) === right.path &&
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

function invalidTask347(): never {
  throw new ComathError("Goal 3 selected-tranche next closure packaging results closure recheck Task347 artifact is invalid", {
    statusCode: 400,
    code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_RECHECK_INVALID_TASK347"
  });
}

function assertCurrentArtifactReference(
  projectRoot: string,
  artifact: ArtifactReference,
  kind: string
): ArtifactReference {
  if (!isArtifactReference(artifact) || artifact.kind !== kind) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging results closure recheck Task347 artifact is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_RECHECK_INVALID_TASK347"
    });
  }
  let current: ArtifactReference;
  try {
    current = artifactForProjectFile(projectRoot, artifact.path, kind);
  } catch {
    throw new ComathError("Goal 3 selected-tranche next closure packaging results closure recheck Task347 artifact is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_RECHECK_INVALID_TASK347"
    });
  }
  if (!artifactReferencesEqual(artifact, current)) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging results closure recheck Task347 artifact is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_RECHECK_INVALID_TASK347"
    });
  }
  return current;
}

function assertBoundCurrentArtifactReference(
  projectRoot: string,
  id: unknown,
  path: unknown,
  artifact: unknown,
  kind: string,
  expectedPathForId: (id: string) => string
): ArtifactReference {
  if (typeof id !== "string" || typeof path !== "string" || !isArtifactReference(artifact)) {
    invalidTask347();
  }
  const normalizedPath = normalizeRelativePath(path.trim());
  const expectedPath = expectedPathForId(id.trim());
  if (normalizedPath !== expectedPath || normalizeRelativePath(artifact.path) !== expectedPath) {
    invalidTask347();
  }
  return assertCurrentArtifactReference(projectRoot, artifact, kind);
}

function readJsonArtifact<T>(projectRoot: string, artifact: ArtifactReference, kind: string): T {
  const current = assertCurrentArtifactReference(projectRoot, artifact, kind);
  try {
    const bytes = readFileSync(assertPathAllowed(projectRoot, current.path));
    return JSON.parse(bytes.toString("utf8")) as T;
  } catch {
    invalidTask347();
  }
}

function assertTask347Path(inputPath: string | undefined, followUpId: string): string {
  const normalizedInputPath = normalizeRelativePath(typeof inputPath === "string" ? inputPath.trim() : "");
  const expectedPath = selectedTrancheNextClosurePackagingResultsFollowUpPath(followUpId);
  if (normalizedInputPath !== expectedPath) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging results closure recheck Task347 path mismatch", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_RECHECK_TASK347_PATH_MISMATCH"
    });
  }
  return expectedPath;
}

function readTask347Artifact(
  projectRoot: string,
  projectId: string,
  followUpId: string,
  followUpPath: string,
  followUpSha256: string
): {
  body: PersistedSelectedTrancheNextClosurePackagingResultsFollowUp;
  artifact: ArtifactReference;
  refs: {
    task346: ArtifactReference;
    task344: ArtifactReference;
    task338: ArtifactReference;
    task340: ArtifactReference;
    task334: ArtifactReference;
    task341: ArtifactReference;
    task335: ArtifactReference;
  };
} {
  const absolutePath = assertPathAllowed(projectRoot, followUpPath);
  if (!existsSync(absolutePath)) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging results closure recheck Task347 artifact is missing", {
      statusCode: 404,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_RECHECK_TASK347_MISSING"
    });
  }
  const bytes = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(bytes);
  if (actualSha256 !== followUpSha256) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging results closure recheck Task347 artifact is stale", {
      statusCode: 409,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_RECHECK_STALE_TASK347"
    });
  }

  let body: PersistedSelectedTrancheNextClosurePackagingResultsFollowUp;
  try {
    body = JSON.parse(bytes.toString("utf8")) as PersistedSelectedTrancheNextClosurePackagingResultsFollowUp;
  } catch {
    throw new ComathError("Goal 3 selected-tranche next closure packaging results closure recheck Task347 artifact is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_RECHECK_INVALID_TASK347"
    });
  }
  if (
    body.schema_version !==
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_follow_up.v1" ||
    body.project_id !== projectId ||
    body.selected_tranche_next_closure_packaging_results_follow_up_id !== followUpId ||
    normalizeRelativePath(body.selected_tranche_next_closure_packaging_results_follow_up_path) !== followUpPath ||
    body.selected_packaging_report_artifacts_current !== true ||
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
    typeof body.selected_tranche_next_packaging_results_follow_up_id !== "string" ||
    typeof body.selected_tranche_next_packaging_results_follow_up_path !== "string" ||
    !isArtifactReference(body.selected_tranche_next_packaging_results_follow_up_artifact) ||
    !Array.isArray(body.selected_task_ids) ||
    !Array.isArray(body.selected_packaging_report_artifacts)
  ) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging results closure recheck Task347 artifact is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_RECHECK_INVALID_TASK347"
    });
  }

  const refs = {
    task346: assertBoundCurrentArtifactReference(
      projectRoot,
      body.selected_tranche_next_closure_packaging_follow_through_id,
      body.selected_tranche_next_closure_packaging_follow_through_path,
      body.selected_tranche_next_closure_packaging_follow_through_artifact,
      "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_follow_through",
      selectedTrancheNextClosurePackagingFollowThroughPath
    ),
    task344: assertBoundCurrentArtifactReference(
      projectRoot,
      body.selected_tranche_next_closure_execution_bridge_id,
      body.selected_tranche_next_closure_execution_bridge_path,
      body.selected_tranche_next_closure_execution_bridge_artifact,
      "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_execution_bridge",
      selectedTrancheNextClosureExecutionBridgePath
    ),
    task338: assertBoundCurrentArtifactReference(
      projectRoot,
      body.delegated_selected_tranche_next_execution_bridge_id,
      body.delegated_selected_tranche_next_execution_bridge_path,
      body.delegated_selected_tranche_next_execution_bridge_artifact,
      "goal3_release_candidate_proof_breadth_selected_tranche_next_execution_bridge",
      selectedTrancheNextExecutionBridgePath
    ),
    task340: assertBoundCurrentArtifactReference(
      projectRoot,
      body.selected_tranche_next_packaging_follow_through_id,
      body.selected_tranche_next_packaging_follow_through_path,
      body.selected_tranche_next_packaging_follow_through_artifact,
      "goal3_release_candidate_proof_breadth_selected_tranche_next_packaging_follow_through",
      selectedTrancheNextPackagingFollowThroughPath
    ),
    task334: assertBoundCurrentArtifactReference(
      projectRoot,
      body.task_local_packaging_follow_through_id,
      body.task_local_packaging_follow_through_path,
      body.task_local_packaging_follow_through_artifact,
      "goal3_release_candidate_proof_breadth_task_local_packaging_follow_through",
      taskLocalPackagingFollowThroughPath
    ),
    task341: assertBoundCurrentArtifactReference(
      projectRoot,
      body.selected_tranche_next_packaging_results_follow_up_id,
      body.selected_tranche_next_packaging_results_follow_up_path,
      body.selected_tranche_next_packaging_results_follow_up_artifact,
      "goal3_release_candidate_proof_breadth_selected_tranche_next_packaging_results_follow_up",
      selectedTrancheNextPackagingResultsFollowUpPath
    )
  };
  const task341Body = readJsonArtifact<PersistedSelectedTrancheNextPackagingResultsFollowUp>(
    projectRoot,
    refs.task341,
    "goal3_release_candidate_proof_breadth_selected_tranche_next_packaging_results_follow_up"
  );
  if (
    task341Body.schema_version !==
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_packaging_results_follow_up.v1" ||
    task341Body.project_id !== projectId ||
    task341Body.selected_tranche_next_packaging_results_follow_up_id !==
      body.selected_tranche_next_packaging_results_follow_up_id ||
    normalizeRelativePath(task341Body.selected_tranche_next_packaging_results_follow_up_path) !== refs.task341.path ||
    task341Body.proof_authority !== "none" ||
    task341Body.can_promote_claim !== false ||
    task341Body.can_certify_ga !== false ||
    task341Body.runs_lean !== false ||
    task341Body.executes_proofs !== false ||
    task341Body.selected_packaging_report_artifacts_current !== true
  ) {
    invalidTask347();
  }
  const task335 = assertBoundCurrentArtifactReference(
    projectRoot,
    task341Body.selected_tranche_packaging_results_follow_up_id,
    task341Body.selected_tranche_packaging_results_follow_up_path,
    task341Body.selected_tranche_packaging_results_follow_up_artifact,
    "goal3_release_candidate_proof_breadth_selected_tranche_packaging_results_follow_up",
    selectedTranchePackagingResultsFollowUpPath
  );
  return {
    body,
    artifact: {
      kind: "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_follow_up",
      path: followUpPath,
      sha256: actualSha256,
      size_bytes: bytes.byteLength
    },
    refs: {
      ...refs,
      task335
    }
  };
}

function callerProofOrGaMaterialPresent(
  input: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureRecheckInput
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
    record.selected_tranche_next_closure_recheck_id !== undefined ||
    record.proof_breadth_closure_id !== undefined
  );
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

export function recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureRecheck(
  projectRoot: string,
  input: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureRecheckInput
): Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureRecheck {
  const projectId = assertSafeId(input.project_id, "project_id");
  const recheckId = assertSafeId(
    input.selected_tranche_next_closure_packaging_results_closure_recheck_id,
    "selected_tranche_next_closure_packaging_results_closure_recheck_id"
  );
  const task347Id = assertSafeId(
    input.selected_tranche_next_closure_packaging_results_follow_up_id,
    "selected_tranche_next_closure_packaging_results_follow_up_id"
  );
  const task347Sha256 = assertSha256(input.selected_tranche_next_closure_packaging_results_follow_up_sha256);
  const task347Path = assertTask347Path(input.selected_tranche_next_closure_packaging_results_follow_up_path, task347Id);
  const requestedMode =
    input.requested_recheck_mode ??
    "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_recheck";
  if (
    requestedMode !==
    "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_recheck"
  ) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging results closure recheck mode is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_RECHECK_INVALID_MODE"
    });
  }

  const recheckPath = selectedTrancheNextClosurePackagingResultsClosureRecheckPath(recheckId);
  const absoluteRecheckPath = assertPathAllowed(projectRoot, recheckPath, { purpose: "runtime-write" });
  if (existsSync(absoluteRecheckPath)) {
    throw new ComathError("Goal 3 selected-tranche next closure packaging results closure recheck already exists", {
      statusCode: 409,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_RECHECK_ALREADY_EXISTS"
    });
  }

  const task347 = readTask347Artifact(projectRoot, projectId, task347Id, task347Path, task347Sha256);
  const actor = sanitizeActor(input.actor);
  const callerAuthorityMaterialIgnored = callerProofOrGaMaterialPresent(input);
  const delegatedRecheckId = `${recheckId}-TASK343-CLOSURE-RECHECK`;
  const delegatedClosureRecheckId = `${recheckId}-TASK337`;
  const delegatedProofBreadthClosureId = `${recheckId}-TASK300`;
  const delegated = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureRecheck(projectRoot, {
    project_id: projectId,
    selected_tranche_next_closure_recheck_id: delegatedRecheckId,
    selected_tranche_closure_recheck_id: delegatedClosureRecheckId,
    proof_breadth_closure_id: delegatedProofBreadthClosureId,
    selected_tranche_next_packaging_results_follow_up_id:
      task347.body.selected_tranche_next_packaging_results_follow_up_id,
    selected_tranche_next_packaging_results_follow_up_path: task347.refs.task341.path,
    selected_tranche_next_packaging_results_follow_up_sha256: task347.refs.task341.sha256,
    actor
  });

  const blockerReasons = uniqueStrings([
    ...task347.body.blocker_reasons,
    ...delegated.blocker_reasons,
    ...(callerAuthorityMaterialIgnored ? ["caller_proof_or_ga_authority_material_ignored"] : [])
  ]);
  const body = {
    schema_version:
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_recheck.v1",
    selected_tranche_next_closure_packaging_results_closure_recheck_id: recheckId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    ok: delegated.proof_breadth_complete,
    recheck_status: delegated.proof_breadth_complete
      ? "next_closure_packaging_results_recheck_global_proof_breadth_complete"
      : "blocked_global_proof_breadth_incomplete_after_next_closure_packaging_results_recheck",
    selected_tranche_next_closure_packaging_results_closure_recheck_path: recheckPath,
    requested_recheck_mode:
      "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_recheck",
    selected_tranche_next_closure_packaging_results_follow_up_id: task347Id,
    selected_tranche_next_closure_packaging_results_follow_up_path: task347Path,
    selected_tranche_next_closure_packaging_results_follow_up_artifact: task347.artifact,
    selected_tranche_next_closure_packaging_follow_through_id:
      task347.body.selected_tranche_next_closure_packaging_follow_through_id,
    selected_tranche_next_closure_packaging_follow_through_path: task347.refs.task346.path,
    selected_tranche_next_closure_packaging_follow_through_artifact: task347.refs.task346,
    selected_tranche_next_closure_execution_bridge_id: task347.body.selected_tranche_next_closure_execution_bridge_id,
    selected_tranche_next_closure_execution_bridge_path: task347.refs.task344.path,
    selected_tranche_next_closure_execution_bridge_artifact: task347.refs.task344,
    delegated_selected_tranche_next_execution_bridge_id:
      task347.body.delegated_selected_tranche_next_execution_bridge_id,
    delegated_selected_tranche_next_execution_bridge_path: task347.refs.task338.path,
    delegated_selected_tranche_next_execution_bridge_artifact: task347.refs.task338,
    selected_tranche_next_packaging_follow_through_id: task347.body.selected_tranche_next_packaging_follow_through_id,
    selected_tranche_next_packaging_follow_through_path: task347.refs.task340.path,
    selected_tranche_next_packaging_follow_through_artifact: task347.refs.task340,
    task_local_packaging_follow_through_id: task347.body.task_local_packaging_follow_through_id,
    task_local_packaging_follow_through_path: task347.refs.task334.path,
    task_local_packaging_follow_through_artifact: task347.refs.task334,
    selected_tranche_next_packaging_results_follow_up_id:
      task347.body.selected_tranche_next_packaging_results_follow_up_id,
    selected_tranche_next_packaging_results_follow_up_path: task347.refs.task341.path,
    selected_tranche_next_packaging_results_follow_up_artifact: task347.refs.task341,
    selected_tranche_packaging_results_follow_up_id:
      delegated.selected_tranche_packaging_results_follow_up_id,
    selected_tranche_packaging_results_follow_up_path: task347.refs.task335.path,
    selected_tranche_packaging_results_follow_up_artifact: task347.refs.task335,
    delegated_selected_tranche_next_closure_recheck_id: delegated.selected_tranche_next_closure_recheck_id,
    delegated_selected_tranche_next_closure_recheck_path: delegated.selected_tranche_next_closure_recheck_path,
    delegated_selected_tranche_next_closure_recheck_artifact:
      delegated.selected_tranche_next_closure_recheck_artifact,
    proof_breadth_closure_id: delegated.proof_breadth_closure_id,
    proof_breadth_closure_path: delegated.proof_breadth_closure_path,
    proof_breadth_closure_artifact: delegated.proof_breadth_closure_artifact,
    selected_task_count: delegated.selected_task_count,
    selected_task_ids: delegated.selected_task_ids,
    verified_selected_task_count: delegated.verified_selected_task_count,
    selected_packaging_report_artifacts: delegated.selected_packaging_report_artifacts,
    selected_packaging_report_artifacts_current: true,
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
    Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureRecheck,
    "selected_tranche_next_closure_packaging_results_closure_recheck_artifact"
  >;

  const text = `${JSON.stringify(body, null, 2)}\n`;
  mkdirSync(dirname(absoluteRecheckPath), { recursive: true });
  writeFileSync(absoluteRecheckPath, text, "utf8");
  const result: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureRecheck = {
    ...body,
    selected_tranche_next_closure_packaging_results_closure_recheck_artifact: {
      kind: "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_recheck",
      path: recheckPath,
      sha256: sha256Text(text),
      size_bytes: Buffer.byteLength(text, "utf8")
    }
  };

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.goal3_selected_tranche_next_closure_packaging_results_closure_recheck_recorded",
    actor,
    target_id: projectId,
    payload: {
      selected_tranche_next_closure_packaging_results_closure_recheck_id: recheckId,
      recheck_status: result.recheck_status,
      selected_tranche_next_closure_packaging_results_closure_recheck_path: recheckPath,
      selected_tranche_next_closure_packaging_results_closure_recheck_artifact_sha256:
        result.selected_tranche_next_closure_packaging_results_closure_recheck_artifact.sha256,
      selected_tranche_next_closure_packaging_results_follow_up_id: task347Id,
      selected_tranche_next_closure_packaging_results_follow_up_artifact_sha256: task347.artifact.sha256,
      delegated_selected_tranche_next_closure_recheck_id: delegated.selected_tranche_next_closure_recheck_id,
      delegated_selected_tranche_next_closure_recheck_artifact_sha256:
        delegated.selected_tranche_next_closure_recheck_artifact.sha256,
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
