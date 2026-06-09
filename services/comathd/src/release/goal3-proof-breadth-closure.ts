import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { assertPathAllowed } from "../security/path-policy.js";
import {
  createGoal3GaPositiveTaskManifest,
  type FinalAuthorityPackagingV3Report,
  type Goal3GaPositiveTaskManifest
} from "./goal3-ga-acceptance.js";

type ArtifactReference = {
  kind: string;
  path: string;
  sha256: string;
  size_bytes: number;
};

type CategoryProofBreadthCount = {
  category: string;
  task_count: number;
  verified_task_count: number;
  missing_task_count: number;
  blocked_task_count: number;
};

export type Goal3ReleaseCandidateProofBreadthClosureInput = {
  project_id: string;
  proof_breadth_closure_id?: string;
  actor?: string;
  requested_closure_mode?: "open_formal_workbench_release_candidate_proof_breadth_closure";
};

export type Goal3ReleaseCandidateProofBreadthClosure = {
  schema_version: "comath.goal3_release_candidate_proof_breadth_closure.v1";
  proof_breadth_closure_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  ok: boolean;
  proof_breadth_status:
    | "complete_release_candidate_proof_breadth"
    | "blocked_positive_matrix_release_candidate_proof_breadth_incomplete";
  proof_breadth_closure_path: string;
  requested_closure_mode: "open_formal_workbench_release_candidate_proof_breadth_closure";
  blocker_reasons: string[];
  total_required_tasks: 100;
  task_manifest_count: number;
  verified_task_count: number;
  missing_task_count: number;
  blocked_task_count: number;
  missing_task_ids: string[];
  blocked_task_ids: string[];
  category_counts: CategoryProofBreadthCount[];
  packaging_report_artifacts: ArtifactReference[];
  proof_breadth_complete: boolean;
  final_ga_audit_unblocked: boolean;
  proof_authority: "none" | "lean_kernel_clean_replay";
  can_promote_claim: false;
  can_certify_ga: false;
  ga_certification_gate_separate: true;
  proof_breadth_closure_artifact: ArtifactReference;
};

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function proofBreadthClosurePath(closureId: string): string {
  return normalizeRelativePath(join(".comath", "release", "goal3-proof-breadth-closure", closureId, "closure.json"));
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
      code: "GOAL3_PROOF_BREADTH_CLOSURE_INVALID_ID"
    });
  }
  return id;
}

function sanitizeActor(value: string | undefined): string {
  return (value ?? "goal3-proof-breadth-closure")
    .replace(/(?:[A-Za-z]:[\\/][^\s"']+|\\\\[^\s"']+)/gu, "[redacted-path]")
    .replace(/(?:Authorization:\s*Bearer\s+\S+|api_key=\S+|token=\S+|sk-[A-Za-z0-9_-]+)/giu, "[redacted-secret]")
    .replace(
      /\b(?:GA certified|can_certify_ga\s*[:=]\s*(?:true|1)|can_promote_claim\s*[:=]\s*(?:true|1))\b/giu,
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

function isVerifiedTaskPackaging(report: FinalAuthorityPackagingV3Report, taskId: string): boolean {
  return (
    report.schema_version === "comath.final_authority_packaging.v3" &&
    report.binding_scope === "positive_matrix" &&
    report.task_id === taskId &&
    typeof report.claim_id === "string" &&
    report.final_evidence_status === "verified_final_authority_evidence" &&
    report.blocker_code === "" &&
    Array.isArray(report.missing_final_evidence_classes) &&
    report.missing_final_evidence_classes.length === 0 &&
    report.packaging_report_path === finalAuthorityPackagingReportPath(taskId) &&
    report.proof_authority === "lean_kernel_clean_replay" &&
    report.can_promote_claim === false &&
    report.promotion_requires_gate === true &&
    report.source_verification?.verification_basis === "project_local_artifacts" &&
    report.source_verification.caller_success_metadata_trusted === false &&
    Array.isArray(report.source_verification.missing_final_evidence_classes) &&
    report.source_verification.missing_final_evidence_classes.length === 0 &&
    Array.isArray(report.source_verification.verified_final_evidence_classes) &&
    report.source_verification.verified_final_evidence_classes.length >= 13 &&
    typeof report.source_verification.lean_run_manifest_paths_checked === "number" &&
    report.source_verification.lean_run_manifest_paths_checked > 0
  );
}

function categoryCounts(
  manifest: Goal3GaPositiveTaskManifest,
  verifiedTaskIds: Set<string>,
  missingTaskIds: Set<string>,
  blockedTaskIds: Set<string>
): CategoryProofBreadthCount[] {
  const counts = new Map<string, CategoryProofBreadthCount>();
  for (const task of manifest.tasks) {
    const existing = counts.get(task.category) ?? {
      category: task.category,
      task_count: 0,
      verified_task_count: 0,
      missing_task_count: 0,
      blocked_task_count: 0
    };
    existing.task_count += 1;
    if (verifiedTaskIds.has(task.task_id)) {
      existing.verified_task_count += 1;
    } else if (missingTaskIds.has(task.task_id)) {
      existing.missing_task_count += 1;
    } else if (blockedTaskIds.has(task.task_id)) {
      existing.blocked_task_count += 1;
    }
    counts.set(task.category, existing);
  }
  return [...counts.values()];
}

export function recordGoal3ReleaseCandidateProofBreadthClosure(
  projectRoot: string,
  input: Goal3ReleaseCandidateProofBreadthClosureInput
): Goal3ReleaseCandidateProofBreadthClosure {
  const projectId = assertSafeId(input.project_id, "project_id");
  const closureId = assertSafeId(input.proof_breadth_closure_id, "proof_breadth_closure_id");
  const requestedMode = input.requested_closure_mode ?? "open_formal_workbench_release_candidate_proof_breadth_closure";
  if (requestedMode !== "open_formal_workbench_release_candidate_proof_breadth_closure") {
    throw new ComathError("Goal 3 proof-breadth closure mode is invalid", {
      statusCode: 400,
      code: "GOAL3_PROOF_BREADTH_CLOSURE_INVALID_MODE"
    });
  }

  const closurePath = proofBreadthClosurePath(closureId);
  const absoluteClosurePath = assertPathAllowed(projectRoot, closurePath, { purpose: "runtime-write" });
  if (existsSync(absoluteClosurePath)) {
    throw new ComathError("Goal 3 proof-breadth closure already exists", {
      statusCode: 409,
      code: "GOAL3_PROOF_BREADTH_CLOSURE_ALREADY_EXISTS"
    });
  }

  const manifest = createGoal3GaPositiveTaskManifest();
  const verifiedTaskIds = new Set<string>();
  const missingTaskIds = new Set<string>();
  const blockedTaskIds = new Set<string>();
  const packagingReportArtifacts: ArtifactReference[] = [];

  for (const task of manifest.tasks) {
    const path = finalAuthorityPackagingReportPath(task.task_id);
    const artifact = readJsonArtifact<FinalAuthorityPackagingV3Report>(
      projectRoot,
      path,
      "final_authority_packaging_report_v3"
    );
    if (artifact === null) {
      missingTaskIds.add(task.task_id);
      continue;
    }
    packagingReportArtifacts.push(artifact.artifact);
    if (isVerifiedTaskPackaging(artifact.body, task.task_id)) {
      verifiedTaskIds.add(task.task_id);
    } else {
      blockedTaskIds.add(task.task_id);
    }
  }

  const complete = verifiedTaskIds.size === 100 && missingTaskIds.size === 0 && blockedTaskIds.size === 0;
  const blockerReasons = complete
    ? []
    : [
        "positive_matrix_release_candidate_proof_breadth_incomplete",
        ...(missingTaskIds.size > 0 ? ["positive_matrix_task_final_authority_packaging_missing"] : []),
        ...(blockedTaskIds.size > 0 ? ["positive_matrix_task_final_authority_packaging_not_verified"] : [])
      ];
  const body = {
    schema_version: "comath.goal3_release_candidate_proof_breadth_closure.v1",
    proof_breadth_closure_id: closureId,
    project_id: projectId,
    actor: sanitizeActor(input.actor),
    created_at: new Date().toISOString(),
    ok: complete,
    proof_breadth_status: complete
      ? "complete_release_candidate_proof_breadth"
      : "blocked_positive_matrix_release_candidate_proof_breadth_incomplete",
    proof_breadth_closure_path: closurePath,
    requested_closure_mode: "open_formal_workbench_release_candidate_proof_breadth_closure",
    blocker_reasons: blockerReasons,
    total_required_tasks: 100,
    task_manifest_count: manifest.tasks.length,
    verified_task_count: verifiedTaskIds.size,
    missing_task_count: missingTaskIds.size,
    blocked_task_count: blockedTaskIds.size,
    missing_task_ids: [...missingTaskIds],
    blocked_task_ids: [...blockedTaskIds],
    category_counts: categoryCounts(manifest, verifiedTaskIds, missingTaskIds, blockedTaskIds),
    packaging_report_artifacts: packagingReportArtifacts,
    proof_breadth_complete: complete,
    final_ga_audit_unblocked: complete,
    proof_authority: complete ? "lean_kernel_clean_replay" : "none",
    can_promote_claim: false,
    can_certify_ga: false,
    ga_certification_gate_separate: true
  } satisfies Omit<Goal3ReleaseCandidateProofBreadthClosure, "proof_breadth_closure_artifact">;

  const closureText = `${JSON.stringify(body, null, 2)}\n`;
  mkdirSync(dirname(absoluteClosurePath), { recursive: true });
  writeFileSync(absoluteClosurePath, closureText, "utf8");
  const result: Goal3ReleaseCandidateProofBreadthClosure = {
    ...body,
    proof_breadth_closure_artifact: {
      kind: "goal3_release_candidate_proof_breadth_closure",
      path: closurePath,
      sha256: sha256Text(closureText),
      size_bytes: Buffer.byteLength(closureText, "utf8")
    }
  };

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.goal3_proof_breadth_closure_recorded",
    actor: body.actor,
    target_id: projectId,
    payload: {
      proof_breadth_closure_id: closureId,
      proof_breadth_status: result.proof_breadth_status,
      proof_breadth_closure_path: closurePath,
      proof_breadth_closure_artifact_sha256: result.proof_breadth_closure_artifact.sha256,
      total_required_tasks: result.total_required_tasks,
      verified_task_count: result.verified_task_count,
      missing_task_count: result.missing_task_count,
      blocked_task_count: result.blocked_task_count,
      blocker_reasons: blockerReasons,
      proof_authority: result.proof_authority,
      can_promote_claim: false,
      can_certify_ga: false
    }
  });
  return result;
}
