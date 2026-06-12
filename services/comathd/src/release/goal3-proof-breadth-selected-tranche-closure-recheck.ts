import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { assertPathAllowed } from "../security/path-policy.js";
import {
  recordGoal3ReleaseCandidateProofBreadthClosure,
  type Goal3ReleaseCandidateProofBreadthClosure
} from "./goal3-proof-breadth-closure.js";
import type { Goal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp } from "./goal3-proof-breadth-selected-tranche-packaging-results-follow-up.js";

type ArtifactReference = {
  kind: string;
  path: string;
  sha256: string;
  size_bytes: number;
};

type PersistedGoal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp = Omit<
  Goal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp,
  "selected_tranche_packaging_results_follow_up_artifact"
>;

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheClosureRecheckInput = {
  project_id: string;
  selected_tranche_closure_recheck_id?: string;
  proof_breadth_closure_id?: string;
  selected_tranche_packaging_results_follow_up_id: string;
  selected_tranche_packaging_results_follow_up_path: string;
  selected_tranche_packaging_results_follow_up_sha256: string;
  actor?: string;
  requested_recheck_mode?: "open_formal_workbench_release_candidate_selected_tranche_closure_recheck";
};

export type Goal3ReleaseCandidateProofBreadthSelectedTrancheClosureRecheck = {
  schema_version: "comath.goal3_release_candidate_proof_breadth_selected_tranche_closure_recheck.v1";
  selected_tranche_closure_recheck_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  ok: boolean;
  recheck_status:
    | "selected_tranche_recheck_global_proof_breadth_complete"
    | "blocked_global_proof_breadth_incomplete_after_selected_tranche_recheck";
  selected_tranche_closure_recheck_path: string;
  requested_recheck_mode: "open_formal_workbench_release_candidate_selected_tranche_closure_recheck";
  selected_tranche_packaging_results_follow_up_id: string;
  selected_tranche_packaging_results_follow_up_path: string;
  selected_tranche_packaging_results_follow_up_artifact: ArtifactReference;
  selected_tranche_ready_for_proof_breadth_closure_recheck: true;
  selected_task_count: number;
  selected_task_ids: string[];
  verified_selected_task_count: number;
  selected_packaging_report_artifacts: ArtifactReference[];
  selected_packaging_report_artifacts_current: true;
  proof_breadth_closure_id: string;
  proof_breadth_closure_path: string;
  proof_breadth_closure_artifact: ArtifactReference;
  proof_breadth_closure: Goal3ReleaseCandidateProofBreadthClosure;
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
  selected_tranche_closure_recheck_artifact: ArtifactReference;
};

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function selectedTrancheClosureRecheckPath(recheckId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "goal3-selected-tranche-closure-recheck", recheckId, "recheck.json")
  );
}

function selectedTranchePackagingResultsFollowUpPath(followUpId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "goal3-selected-tranche-packaging-results-follow-up", followUpId, "follow-up.json")
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
      code: "GOAL3_SELECTED_TRANCHE_CLOSURE_RECHECK_INVALID_ID"
    });
  }
  return id;
}

function assertSha256(value: string | undefined): string {
  const sha256 = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-f0-9]{64}$/u.test(sha256)) {
    throw new ComathError("Goal 3 selected-tranche closure recheck hash is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_CLOSURE_RECHECK_INVALID_HASH"
    });
  }
  return sha256;
}

function sanitizeActor(value: string | undefined): string {
  return (value ?? "goal3-selected-tranche-closure-recheck")
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

function assertFollowUpPath(inputPath: string | undefined, followUpId: string): string {
  const normalizedInputPath = normalizeRelativePath(typeof inputPath === "string" ? inputPath.trim() : "");
  const expectedPath = selectedTranchePackagingResultsFollowUpPath(followUpId);
  if (normalizedInputPath !== expectedPath) {
    throw new ComathError("Goal 3 selected-tranche closure recheck Task335 path mismatch", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_CLOSURE_RECHECK_FOLLOW_UP_PATH_MISMATCH"
    });
  }
  return expectedPath;
}

function assertFollowUpArtifact(
  projectRoot: string,
  projectId: string,
  followUpId: string,
  followUpPath: string,
  expectedSha256: string
): {
  body: PersistedGoal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp;
  artifact: ArtifactReference;
} {
  const followUp = readJsonArtifact<PersistedGoal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp>(
    projectRoot,
    followUpPath,
    "goal3_release_candidate_proof_breadth_selected_tranche_packaging_results_follow_up"
  );
  if (followUp === null) {
    throw new ComathError("Goal 3 selected-tranche closure recheck Task335 artifact is missing", {
      statusCode: 404,
      code: "GOAL3_SELECTED_TRANCHE_CLOSURE_RECHECK_FOLLOW_UP_MISSING"
    });
  }
  if (followUp.artifact.sha256 !== expectedSha256) {
    throw new ComathError("Goal 3 selected-tranche closure recheck Task335 hash is stale", {
      statusCode: 409,
      code: "GOAL3_SELECTED_TRANCHE_CLOSURE_RECHECK_STALE_FOLLOW_UP"
    });
  }
  if (
    followUp.body.schema_version !==
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_packaging_results_follow_up.v1" ||
    followUp.body.project_id !== projectId ||
    followUp.body.selected_tranche_packaging_results_follow_up_id !== followUpId ||
    followUp.body.selected_tranche_packaging_results_follow_up_path !== followUpPath ||
    followUp.body.selected_packaging_report_artifacts_current !== true ||
    followUp.body.ready_for_proof_breadth_closure_recheck !== true ||
    followUp.body.proof_breadth_complete !== false ||
    followUp.body.final_ga_audit_unblocked !== false ||
    followUp.body.runs_lean !== false ||
    followUp.body.executes_proofs !== false ||
    followUp.body.proof_authority !== "none" ||
    followUp.body.can_promote_claim !== false ||
    followUp.body.can_certify_ga !== false ||
    !Array.isArray(followUp.body.selected_task_ids) ||
    !Array.isArray(followUp.body.selected_packaging_report_artifacts)
  ) {
    throw new ComathError("Goal 3 selected-tranche closure recheck Task335 artifact is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_CLOSURE_RECHECK_INVALID_FOLLOW_UP"
    });
  }
  return followUp;
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
      throw new ComathError("Goal 3 selected-tranche closure recheck Task335 report artifact is incomplete", {
        statusCode: 409,
        code: "GOAL3_SELECTED_TRANCHE_CLOSURE_RECHECK_STALE_PACKAGING_REPORT"
      });
    }
    const current = readJsonArtifact<unknown>(projectRoot, expectedPath, "final_authority_packaging_report_v3");
    if (
      current === null ||
      current.artifact.sha256 !== artifact.sha256 ||
      current.artifact.size_bytes !== artifact.size_bytes
    ) {
      throw new ComathError("Goal 3 selected-tranche closure recheck selected packaging report hash is stale", {
        statusCode: 409,
        code: "GOAL3_SELECTED_TRANCHE_CLOSURE_RECHECK_STALE_PACKAGING_REPORT"
      });
    }
    return current.artifact;
  });
}

function callerProofOrGaMaterialPresent(input: Goal3ReleaseCandidateProofBreadthSelectedTrancheClosureRecheckInput): boolean {
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

export function recordGoal3ReleaseCandidateProofBreadthSelectedTrancheClosureRecheck(
  projectRoot: string,
  input: Goal3ReleaseCandidateProofBreadthSelectedTrancheClosureRecheckInput
): Goal3ReleaseCandidateProofBreadthSelectedTrancheClosureRecheck {
  const projectId = assertSafeId(input.project_id, "project_id");
  const recheckId = assertSafeId(input.selected_tranche_closure_recheck_id, "selected_tranche_closure_recheck_id");
  const closureId = assertSafeId(
    input.proof_breadth_closure_id ?? `${recheckId}-TASK300-CLOSURE`,
    "proof_breadth_closure_id"
  );
  const followUpId = assertSafeId(
    input.selected_tranche_packaging_results_follow_up_id,
    "selected_tranche_packaging_results_follow_up_id"
  );
  const followUpSha256 = assertSha256(input.selected_tranche_packaging_results_follow_up_sha256);
  const followUpPath = assertFollowUpPath(input.selected_tranche_packaging_results_follow_up_path, followUpId);
  const requestedMode =
    input.requested_recheck_mode ??
    "open_formal_workbench_release_candidate_selected_tranche_closure_recheck";
  if (requestedMode !== "open_formal_workbench_release_candidate_selected_tranche_closure_recheck") {
    throw new ComathError("Goal 3 selected-tranche closure recheck mode is invalid", {
      statusCode: 400,
      code: "GOAL3_SELECTED_TRANCHE_CLOSURE_RECHECK_INVALID_MODE"
    });
  }

  const recheckPath = selectedTrancheClosureRecheckPath(recheckId);
  const absoluteRecheckPath = assertPathAllowed(projectRoot, recheckPath, { purpose: "runtime-write" });
  if (existsSync(absoluteRecheckPath)) {
    throw new ComathError("Goal 3 selected-tranche closure recheck already exists", {
      statusCode: 409,
      code: "GOAL3_SELECTED_TRANCHE_CLOSURE_RECHECK_ALREADY_EXISTS"
    });
  }

  const followUp = assertFollowUpArtifact(projectRoot, projectId, followUpId, followUpPath, followUpSha256);
  const selectedPackagingReportArtifacts = assertSelectedPackagingReportsCurrent(
    projectRoot,
    followUp.body.selected_task_ids,
    followUp.body.selected_packaging_report_artifacts
  );
  const actor = sanitizeActor(input.actor);
  const closure = recordGoal3ReleaseCandidateProofBreadthClosure(projectRoot, {
    project_id: projectId,
    proof_breadth_closure_id: closureId,
    actor
  });
  const callerAuthorityMaterialIgnored = callerProofOrGaMaterialPresent(input);
  const blockerReasons = [
    ...(closure.proof_breadth_complete
      ? []
      : ["global_positive_matrix_release_candidate_proof_breadth_incomplete"]),
    ...closure.blocker_reasons,
    ...(callerAuthorityMaterialIgnored ? ["caller_proof_or_ga_authority_material_ignored"] : [])
  ];
  const body = {
    schema_version: "comath.goal3_release_candidate_proof_breadth_selected_tranche_closure_recheck.v1",
    selected_tranche_closure_recheck_id: recheckId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    ok: closure.proof_breadth_complete,
    recheck_status: closure.proof_breadth_complete
      ? "selected_tranche_recheck_global_proof_breadth_complete"
      : "blocked_global_proof_breadth_incomplete_after_selected_tranche_recheck",
    selected_tranche_closure_recheck_path: recheckPath,
    requested_recheck_mode: "open_formal_workbench_release_candidate_selected_tranche_closure_recheck",
    selected_tranche_packaging_results_follow_up_id: followUpId,
    selected_tranche_packaging_results_follow_up_path: followUpPath,
    selected_tranche_packaging_results_follow_up_artifact: followUp.artifact,
    selected_tranche_ready_for_proof_breadth_closure_recheck: true,
    selected_task_count: followUp.body.selected_task_count,
    selected_task_ids: followUp.body.selected_task_ids,
    verified_selected_task_count: followUp.body.verified_selected_task_count,
    selected_packaging_report_artifacts: selectedPackagingReportArtifacts,
    selected_packaging_report_artifacts_current: true,
    proof_breadth_closure_id: closure.proof_breadth_closure_id,
    proof_breadth_closure_path: closure.proof_breadth_closure_path,
    proof_breadth_closure_artifact: closure.proof_breadth_closure_artifact,
    proof_breadth_closure: closure,
    blocker_reasons: [...new Set(blockerReasons)],
    proof_breadth_complete: closure.proof_breadth_complete,
    final_ga_audit_unblocked: closure.final_ga_audit_unblocked,
    runs_lean: false,
    executes_proofs: false,
    accepts_caller_success_metadata: false,
    accepts_caller_proof_material: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    ga_certification_gate_separate: true
  } satisfies Omit<
    Goal3ReleaseCandidateProofBreadthSelectedTrancheClosureRecheck,
    "selected_tranche_closure_recheck_artifact"
  >;

  const recheckText = `${JSON.stringify(body, null, 2)}\n`;
  mkdirSync(dirname(absoluteRecheckPath), { recursive: true });
  writeFileSync(absoluteRecheckPath, recheckText, "utf8");
  const result: Goal3ReleaseCandidateProofBreadthSelectedTrancheClosureRecheck = {
    ...body,
    selected_tranche_closure_recheck_artifact: {
      kind: "goal3_release_candidate_proof_breadth_selected_tranche_closure_recheck",
      path: recheckPath,
      sha256: sha256Text(recheckText),
      size_bytes: Buffer.byteLength(recheckText, "utf8")
    }
  };

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.goal3_selected_tranche_closure_recheck_recorded",
    actor,
    target_id: projectId,
    payload: {
      selected_tranche_closure_recheck_id: recheckId,
      recheck_status: result.recheck_status,
      selected_tranche_closure_recheck_path: recheckPath,
      selected_tranche_closure_recheck_artifact_sha256:
        result.selected_tranche_closure_recheck_artifact.sha256,
      selected_tranche_packaging_results_follow_up_id: followUpId,
      selected_tranche_packaging_results_follow_up_artifact_sha256: followUp.artifact.sha256,
      selected_task_ids: result.selected_task_ids,
      proof_breadth_closure_id: result.proof_breadth_closure_id,
      proof_breadth_closure_artifact_sha256: result.proof_breadth_closure_artifact.sha256,
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
