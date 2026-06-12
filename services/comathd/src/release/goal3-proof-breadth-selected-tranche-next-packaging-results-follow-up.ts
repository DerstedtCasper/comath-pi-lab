import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { assertPathAllowed } from "../security/path-policy.js";
import {
  recordGoal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp,
  type Goal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUpInput
} from "./goal3-proof-breadth-selected-tranche-packaging-results-follow-up.js";
import type { Goal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThrough } from "./goal3-proof-breadth-selected-tranche-next-packaging-follow-through.js";

type ArtifactReference = {
  kind: string;
  path: string;
  sha256: string;
  size_bytes: number;
};

type PersistedSelectedTrancheNextPackagingFollowThrough = Omit<
  Goal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThrough,
  "selected_tranche_next_packaging_follow_through_artifact"
>;

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUpInput = {
  project_id: string;
  selected_tranche_next_packaging_results_follow_up_id?: string;
  proof_breadth_execution_follow_through_id?: string;
  selected_tranche_next_packaging_follow_through_id: string;
  selected_tranche_next_packaging_follow_through_path: string;
  selected_tranche_next_packaging_follow_through_sha256: string;
  actor?: string;
  requested_follow_up_mode?: "open_formal_workbench_release_candidate_selected_tranche_next_packaging_results_follow_up";
};

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUp = {
  schema_version: "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_packaging_results_follow_up.v1";
  selected_tranche_next_packaging_results_follow_up_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  ok: boolean;
  follow_up_status:
    | "next_selected_tranche_packaging_results_current_for_proof_breadth_closure_recheck"
    | "blocked_next_selected_tranche_packaging_results_incomplete";
  selected_tranche_next_packaging_results_follow_up_path: string;
  requested_follow_up_mode: "open_formal_workbench_release_candidate_selected_tranche_next_packaging_results_follow_up";
  selected_tranche_next_packaging_follow_through_id: string;
  selected_tranche_next_packaging_follow_through_path: string;
  selected_tranche_next_packaging_follow_through_artifact: ArtifactReference;
  delegated_proof_breadth_execution_bridge_id: string;
  delegated_proof_breadth_execution_bridge_path: string;
  delegated_proof_breadth_execution_bridge_artifact: ArtifactReference;
  task_local_packaging_follow_through_id: string;
  task_local_packaging_follow_through_path: string;
  task_local_packaging_follow_through_artifact: ArtifactReference;
  selected_tranche_packaging_results_follow_up_id: string;
  selected_tranche_packaging_results_follow_up_path: string;
  selected_tranche_packaging_results_follow_up_artifact: ArtifactReference;
  proof_breadth_execution_follow_through_id: string;
  proof_breadth_execution_follow_through_path: string;
  proof_breadth_execution_follow_through_artifact: ArtifactReference;
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
  selected_tranche_next_packaging_results_follow_up_artifact: ArtifactReference;
};

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
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
      code: "GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_RESULTS_FOLLOW_UP_INVALID_ID"
    });
  }
  return id;
}

function assertSha256(value: string | undefined): string {
  const sha256 = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-f0-9]{64}$/u.test(sha256)) {
    throw new ComathError("Goal 3 selected-tranche next packaging results follow-up hash is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_RESULTS_FOLLOW_UP_INVALID_HASH"
    });
  }
  return sha256;
}

function sanitizeActor(actor: string | undefined): string {
  const text =
    typeof actor === "string" && actor.trim().length > 0
      ? actor.trim()
      : "goal3-selected-tranche-next-packaging-results-follow-up";
  return text
    .replace(/(?:[A-Za-z]:[\\/][^\s"']+|\\\\[^\s"']+)/gu, "[redacted-path]")
    .replace(/(?:Authorization:\s*Bearer\s+\S+|api_key=\S+|token=\S+|sk-[A-Za-z0-9_-]+)/giu, "[redacted-secret]")
    .replace(
      /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|kernel_checked|proof_success|GA certified|can_certify_ga\s*[:=]\s*(?:true|1)|can_promote_claim\s*[:=]\s*(?:true|1))\b/giu,
      "[redacted-authority-claim]"
    )
    .slice(0, 400);
}

function assertTask340Path(inputPath: string | undefined, followThroughId: string): string {
  const normalized = normalizeRelativePath(typeof inputPath === "string" ? inputPath.trim() : "");
  const expected = selectedTrancheNextPackagingFollowThroughPath(followThroughId);
  if (normalized !== expected) {
    throw new ComathError("Goal 3 selected-tranche next packaging results follow-up Task340 path mismatch", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_RESULTS_FOLLOW_UP_TASK340_PATH_MISMATCH"
    });
  }
  return expected;
}

function parseJsonArtifact<T>(bytes: Buffer): T {
  try {
    return JSON.parse(bytes.toString("utf8")) as T;
  } catch {
    throw new ComathError("Goal 3 selected-tranche next packaging results follow-up Task340 artifact is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_RESULTS_FOLLOW_UP_INVALID_TASK340"
    });
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

function assertStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
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

function readTask340Artifact(
  projectRoot: string,
  followThroughId: string,
  followThroughPath: string,
  followThroughSha256: string
): { body: PersistedSelectedTrancheNextPackagingFollowThrough; artifact: ArtifactReference } {
  const absolutePath = assertPathAllowed(projectRoot, followThroughPath);
  if (!existsSync(absolutePath)) {
    throw new ComathError("Goal 3 selected-tranche next packaging results follow-up Task340 artifact is missing", {
      statusCode: 404,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_RESULTS_FOLLOW_UP_TASK340_MISSING"
    });
  }
  const bytes = readFileSync(absolutePath);
  const actualSha256 = sha256Bytes(bytes);
  if (actualSha256 !== followThroughSha256) {
    throw new ComathError("Goal 3 selected-tranche next packaging results follow-up Task340 artifact is stale", {
      statusCode: 409,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_RESULTS_FOLLOW_UP_STALE_TASK340"
    });
  }
  const body = parseJsonArtifact<PersistedSelectedTrancheNextPackagingFollowThrough>(bytes);
  if (
    body.schema_version !== "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_packaging_follow_through.v1" ||
    body.selected_tranche_next_packaging_follow_through_id !== followThroughId ||
    normalizeRelativePath(body.selected_tranche_next_packaging_follow_through_path) !== followThroughPath ||
    body.proof_authority !== "none" ||
    body.can_promote_claim !== false ||
    body.can_certify_ga !== false ||
    body.proof_breadth_complete !== false ||
    body.final_ga_audit_unblocked !== false ||
    body.runs_lean !== false ||
    body.executes_proofs !== false ||
    body.accepts_caller_success_metadata !== false ||
    body.accepts_caller_proof_material !== false ||
    typeof body.delegated_proof_breadth_execution_bridge_id !== "string" ||
    typeof body.delegated_proof_breadth_execution_bridge_path !== "string" ||
    !isArtifactReference(body.delegated_proof_breadth_execution_bridge_artifact) ||
    typeof body.task_local_packaging_follow_through_id !== "string" ||
    typeof body.task_local_packaging_follow_through_path !== "string" ||
    !isArtifactReference(body.task_local_packaging_follow_through_artifact) ||
    assertStringArray(body.selected_task_ids).length === 0
  ) {
    throw new ComathError("Goal 3 selected-tranche next packaging results follow-up Task340 artifact is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_RESULTS_FOLLOW_UP_INVALID_TASK340"
    });
  }
  return {
    body,
    artifact: {
      kind: "goal3_release_candidate_proof_breadth_selected_tranche_next_packaging_follow_through",
      path: followThroughPath,
      sha256: actualSha256,
      size_bytes: bytes.byteLength
    }
  };
}

function callerProofOrGaMaterialPresent(
  input: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUpInput
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

export function recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUp(
  projectRoot: string,
  input: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUpInput
): Goal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUp {
  const projectId = assertSafeId(input.project_id, "project_id");
  const followUpId = assertSafeId(
    input.selected_tranche_next_packaging_results_follow_up_id,
    "selected_tranche_next_packaging_results_follow_up_id"
  );
  const task340Id = assertSafeId(
    input.selected_tranche_next_packaging_follow_through_id,
    "selected_tranche_next_packaging_follow_through_id"
  );
  const task340Sha256 = assertSha256(input.selected_tranche_next_packaging_follow_through_sha256);
  const task340Path = assertTask340Path(input.selected_tranche_next_packaging_follow_through_path, task340Id);
  const requestedMode =
    input.requested_follow_up_mode ??
    "open_formal_workbench_release_candidate_selected_tranche_next_packaging_results_follow_up";
  if (requestedMode !== "open_formal_workbench_release_candidate_selected_tranche_next_packaging_results_follow_up") {
    throw new ComathError("Goal 3 selected-tranche next packaging results follow-up mode is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_RESULTS_FOLLOW_UP_INVALID_MODE"
    });
  }

  const followUpPath = selectedTrancheNextPackagingResultsFollowUpPath(followUpId);
  const absoluteFollowUpPath = assertPathAllowed(projectRoot, followUpPath, { purpose: "runtime-write" });
  if (existsSync(absoluteFollowUpPath)) {
    throw new ComathError("Goal 3 selected-tranche next packaging results follow-up already exists", {
      statusCode: 409,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_RESULTS_FOLLOW_UP_ALREADY_EXISTS"
    });
  }

  const task340 = readTask340Artifact(projectRoot, task340Id, task340Path, task340Sha256);
  if (task340.body.project_id !== projectId) {
    throw new ComathError("Goal 3 selected-tranche next packaging results follow-up project id mismatch", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_RESULTS_FOLLOW_UP_INVALID_TASK340"
    });
  }

  const actor = sanitizeActor(input.actor);
  const task335Input = {
    project_id: projectId,
    selected_tranche_packaging_results_follow_up_id: `${followUpId}-TASK335`,
    proof_breadth_execution_follow_through_id: input.proof_breadth_execution_follow_through_id,
    proof_breadth_execution_bridge_id: task340.body.delegated_proof_breadth_execution_bridge_id,
    proof_breadth_execution_bridge_path: task340.body.delegated_proof_breadth_execution_bridge_path,
    proof_breadth_execution_bridge_sha256: task340.body.delegated_proof_breadth_execution_bridge_artifact.sha256,
    task_local_packaging_follow_through_id: task340.body.task_local_packaging_follow_through_id,
    task_local_packaging_follow_through_path: task340.body.task_local_packaging_follow_through_path,
    task_local_packaging_follow_through_sha256: task340.body.task_local_packaging_follow_through_artifact.sha256,
    actor,
    requested_follow_up_mode: "open_formal_workbench_release_candidate_selected_tranche_packaging_results_follow_up"
  } satisfies Goal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUpInput;
  const selectedTrancheFollowUp =
    recordGoal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp(projectRoot, task335Input);
  const callerAuthorityMaterialIgnored = callerProofOrGaMaterialPresent(input);
  const blockerReasons = uniqueStrings([
    ...assertStringArray(task340.body.blocker_reasons),
    ...selectedTrancheFollowUp.blocker_reasons,
    ...(callerAuthorityMaterialIgnored ? ["caller_proof_or_ga_authority_material_ignored"] : [])
  ]);
  const selectedTrancheArtifact = artifactForProjectFile(
    projectRoot,
    selectedTrancheFollowUp.selected_tranche_packaging_results_follow_up_path,
    "goal3_release_candidate_proof_breadth_selected_tranche_packaging_results_follow_up"
  );
  const body = {
    schema_version: "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_packaging_results_follow_up.v1",
    selected_tranche_next_packaging_results_follow_up_id: followUpId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    ok: selectedTrancheFollowUp.ok,
    follow_up_status: selectedTrancheFollowUp.ok
      ? "next_selected_tranche_packaging_results_current_for_proof_breadth_closure_recheck"
      : "blocked_next_selected_tranche_packaging_results_incomplete",
    selected_tranche_next_packaging_results_follow_up_path: followUpPath,
    requested_follow_up_mode: "open_formal_workbench_release_candidate_selected_tranche_next_packaging_results_follow_up",
    selected_tranche_next_packaging_follow_through_id: task340Id,
    selected_tranche_next_packaging_follow_through_path: task340Path,
    selected_tranche_next_packaging_follow_through_artifact: task340.artifact,
    delegated_proof_breadth_execution_bridge_id: task340.body.delegated_proof_breadth_execution_bridge_id,
    delegated_proof_breadth_execution_bridge_path: task340.body.delegated_proof_breadth_execution_bridge_path,
    delegated_proof_breadth_execution_bridge_artifact: task340.body.delegated_proof_breadth_execution_bridge_artifact,
    task_local_packaging_follow_through_id: task340.body.task_local_packaging_follow_through_id,
    task_local_packaging_follow_through_path: task340.body.task_local_packaging_follow_through_path,
    task_local_packaging_follow_through_artifact: task340.body.task_local_packaging_follow_through_artifact,
    selected_tranche_packaging_results_follow_up_id:
      selectedTrancheFollowUp.selected_tranche_packaging_results_follow_up_id,
    selected_tranche_packaging_results_follow_up_path:
      selectedTrancheFollowUp.selected_tranche_packaging_results_follow_up_path,
    selected_tranche_packaging_results_follow_up_artifact: selectedTrancheArtifact,
    proof_breadth_execution_follow_through_id: selectedTrancheFollowUp.proof_breadth_execution_follow_through_id,
    proof_breadth_execution_follow_through_path: selectedTrancheFollowUp.proof_breadth_execution_follow_through_path,
    proof_breadth_execution_follow_through_artifact:
      selectedTrancheFollowUp.proof_breadth_execution_follow_through_artifact,
    blocker_reasons: blockerReasons,
    selected_task_count: selectedTrancheFollowUp.selected_task_count,
    verified_selected_task_count: selectedTrancheFollowUp.verified_selected_task_count,
    missing_selected_task_count: selectedTrancheFollowUp.missing_selected_task_count,
    blocked_selected_task_count: selectedTrancheFollowUp.blocked_selected_task_count,
    selected_task_ids: selectedTrancheFollowUp.selected_task_ids,
    verified_selected_task_ids: selectedTrancheFollowUp.verified_selected_task_ids,
    missing_selected_task_ids: selectedTrancheFollowUp.missing_selected_task_ids,
    blocked_selected_task_ids: selectedTrancheFollowUp.blocked_selected_task_ids,
    selected_packaging_report_artifacts: selectedTrancheFollowUp.selected_packaging_report_artifacts,
    selected_packaging_report_artifacts_current: true,
    ready_for_proof_breadth_closure_recheck: selectedTrancheFollowUp.ready_for_proof_breadth_closure_recheck,
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
    Goal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUp,
    "selected_tranche_next_packaging_results_follow_up_artifact"
  >;

  const followUpText = `${JSON.stringify(body, null, 2)}\n`;
  mkdirSync(dirname(absoluteFollowUpPath), { recursive: true });
  writeFileSync(absoluteFollowUpPath, followUpText, "utf8");
  const result: Goal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUp = {
    ...body,
    selected_tranche_next_packaging_results_follow_up_artifact: {
      kind: "goal3_release_candidate_proof_breadth_selected_tranche_next_packaging_results_follow_up",
      path: followUpPath,
      sha256: sha256Text(followUpText),
      size_bytes: Buffer.byteLength(followUpText, "utf8")
    }
  };

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.goal3_selected_tranche_next_packaging_results_follow_up_recorded",
    actor,
    target_id: projectId,
    payload: {
      selected_tranche_next_packaging_results_follow_up_id: followUpId,
      follow_up_status: result.follow_up_status,
      selected_tranche_next_packaging_results_follow_up_path: followUpPath,
      selected_tranche_next_packaging_results_follow_up_artifact_sha256:
        result.selected_tranche_next_packaging_results_follow_up_artifact.sha256,
      selected_tranche_next_packaging_follow_through_id: task340Id,
      selected_tranche_next_packaging_follow_through_artifact_sha256: task340.artifact.sha256,
      selected_tranche_packaging_results_follow_up_id:
        result.selected_tranche_packaging_results_follow_up_id,
      selected_tranche_packaging_results_follow_up_artifact_sha256:
        result.selected_tranche_packaging_results_follow_up_artifact.sha256,
      delegated_proof_breadth_execution_bridge_id: result.delegated_proof_breadth_execution_bridge_id,
      delegated_proof_breadth_execution_bridge_artifact_sha256:
        result.delegated_proof_breadth_execution_bridge_artifact.sha256,
      task_local_packaging_follow_through_id: result.task_local_packaging_follow_through_id,
      task_local_packaging_follow_through_artifact_sha256:
        result.task_local_packaging_follow_through_artifact.sha256,
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
