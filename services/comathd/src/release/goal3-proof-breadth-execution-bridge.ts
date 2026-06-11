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

type CategoryExecutionBridgeCount = {
  category: string;
  task_count: number;
  verified_task_count: number;
  missing_task_count: number;
  blocked_task_count: number;
  selected_task_count: number;
};

export type Goal3ProofBreadthExecutionTarget = {
  task_id: string;
  category: string;
  target_status: "missing_final_authority_packaging_report" | "blocked_existing_packaging_report";
  expected_packaging_report_path: string;
  required_final_evidence_classes: string[];
  executor_contract: "task_local_lean_authority_v3_packaging";
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
};

export type Goal3ReleaseCandidateProofBreadthExecutionBridgeInput = {
  project_id: string;
  proof_breadth_execution_bridge_id?: string;
  actor?: string;
  requested_bridge_mode?: "open_formal_workbench_release_candidate_proof_breadth_execution_bridge";
  max_tranche_size?: number;
};

export type Goal3ReleaseCandidateProofBreadthExecutionBridge = {
  schema_version: "comath.goal3_release_candidate_proof_breadth_execution_bridge.v1";
  proof_breadth_execution_bridge_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  ok: boolean;
  bridge_status:
    | "ready_for_bounded_proof_breadth_execution"
    | "complete_release_candidate_proof_breadth_no_execution_target";
  proof_breadth_status:
    | "blocked_positive_matrix_release_candidate_proof_breadth_incomplete"
    | "complete_release_candidate_proof_breadth_requires_closure_verifier";
  proof_breadth_execution_bridge_path: string;
  requested_bridge_mode: "open_formal_workbench_release_candidate_proof_breadth_execution_bridge";
  max_tranche_size: number;
  blocker_reasons: string[];
  total_required_tasks: 100;
  task_manifest_count: number;
  verified_task_count: number;
  missing_task_count: number;
  blocked_task_count: number;
  next_execution_task_ids: string[];
  next_execution_targets: Goal3ProofBreadthExecutionTarget[];
  category_counts: CategoryExecutionBridgeCount[];
  proof_breadth_complete: false;
  final_ga_audit_unblocked: false;
  runs_lean: false;
  executes_proofs: false;
  accepts_caller_proof_material: false;
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
  ga_certification_gate_separate: true;
  proof_breadth_execution_bridge_artifact: ArtifactReference;
};

const requiredFinalEvidenceClasses = [
  "lean_run_manifest_v3",
  "final_replay_manifest_v3",
  "structured_audit",
  "dependency_closure",
  "axiom_profile",
  "statement_check",
  "third_party_replay_pack",
  "formal_spec_lock_binding",
  "assumption_ledger_binding",
  "dependency_lock_binding",
  "artifact_hash_binding",
  "toolchain_hash_binding",
  "replay_manifest_hash_binding"
];

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/u, "");
}

function proofBreadthExecutionBridgePath(bridgeId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "goal3-proof-breadth-execution-bridge", bridgeId, "bridge.json")
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
      code: "GOAL3_PROOF_BREADTH_EXECUTION_BRIDGE_INVALID_ID"
    });
  }
  return id;
}

function assertMaxTrancheSize(value: number | undefined): number {
  if (value === undefined) {
    return 1;
  }
  if (!Number.isSafeInteger(value) || value < 1 || value > 10) {
    throw new ComathError("Goal 3 proof-breadth execution bridge tranche size is invalid", {
      statusCode: 400,
      code: "GOAL3_PROOF_BREADTH_EXECUTION_BRIDGE_INVALID_TRANCHE"
    });
  }
  return value;
}

function sanitizeActor(value: string | undefined): string {
  return (value ?? "goal3-proof-breadth-execution-bridge")
    .replace(/(?:[A-Za-z]:[\\/][^\s"']+|\\\\[^\s"']+)/gu, "[redacted-path]")
    .replace(/(?:Authorization:\s*Bearer\s+\S+|api_key=\S+|token=\S+|sk-[A-Za-z0-9_-]+)/giu, "[redacted-secret]")
    .replace(
      /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|kernel_checked|proof_success|GA certified|can_certify_ga\s*[:=]\s*(?:true|1)|can_promote_claim\s*[:=]\s*(?:true|1))\b/giu,
      "[redacted-authority-claim]"
    )
    .slice(0, 400);
}

function readJsonArtifact<T>(projectRoot: string, relativePath: string): { body: T; artifact: ArtifactReference } | null {
  const absolutePath = assertPathAllowed(projectRoot, relativePath, { purpose: "read", resolveRealpath: true });
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    return null;
  }
  const content = readFileSync(absolutePath);
  try {
    return {
      body: JSON.parse(content.toString("utf8")) as T,
      artifact: {
        kind: "final_authority_packaging_report_v3",
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
    report.source_verification.verified_final_evidence_classes.length >= requiredFinalEvidenceClasses.length &&
    typeof report.source_verification.lean_run_manifest_paths_checked === "number" &&
    report.source_verification.lean_run_manifest_paths_checked > 0
  );
}

function callerProofBreadthMaterialPresent(input: Goal3ReleaseCandidateProofBreadthExecutionBridgeInput): boolean {
  const record = input as Record<string, unknown>;
  return (
    record.proof_breadth_matrix !== undefined ||
    record.proof_breadth_matrix_path !== undefined ||
    record.proof_breadth_matrix_sha256 !== undefined ||
    record.proof_artifact !== undefined ||
    record.proof_claim !== undefined ||
    record.lean_replay_manifest !== undefined ||
    record.final_replay_manifest !== undefined
  );
}

function categoryCounts(
  manifest: Goal3GaPositiveTaskManifest,
  verifiedTaskIds: Set<string>,
  missingTaskIds: Set<string>,
  blockedTaskIds: Set<string>,
  selectedTaskIds: Set<string>
): CategoryExecutionBridgeCount[] {
  const counts = new Map<string, CategoryExecutionBridgeCount>();
  for (const task of manifest.tasks) {
    const existing = counts.get(task.category) ?? {
      category: task.category,
      task_count: 0,
      verified_task_count: 0,
      missing_task_count: 0,
      blocked_task_count: 0,
      selected_task_count: 0
    };
    existing.task_count += 1;
    if (verifiedTaskIds.has(task.task_id)) {
      existing.verified_task_count += 1;
    } else if (missingTaskIds.has(task.task_id)) {
      existing.missing_task_count += 1;
    } else if (blockedTaskIds.has(task.task_id)) {
      existing.blocked_task_count += 1;
    }
    if (selectedTaskIds.has(task.task_id)) {
      existing.selected_task_count += 1;
    }
    counts.set(task.category, existing);
  }
  return [...counts.values()];
}

export function recordGoal3ReleaseCandidateProofBreadthExecutionBridge(
  projectRoot: string,
  input: Goal3ReleaseCandidateProofBreadthExecutionBridgeInput
): Goal3ReleaseCandidateProofBreadthExecutionBridge {
  const projectId = assertSafeId(input.project_id, "project_id");
  const bridgeId = assertSafeId(input.proof_breadth_execution_bridge_id, "proof_breadth_execution_bridge_id");
  const requestedMode =
    input.requested_bridge_mode ?? "open_formal_workbench_release_candidate_proof_breadth_execution_bridge";
  if (requestedMode !== "open_formal_workbench_release_candidate_proof_breadth_execution_bridge") {
    throw new ComathError("Goal 3 proof-breadth execution bridge mode is invalid", {
      statusCode: 400,
      code: "GOAL3_PROOF_BREADTH_EXECUTION_BRIDGE_INVALID_MODE"
    });
  }
  const maxTrancheSize = assertMaxTrancheSize(input.max_tranche_size);
  const bridgePath = proofBreadthExecutionBridgePath(bridgeId);
  const absoluteBridgePath = assertPathAllowed(projectRoot, bridgePath, { purpose: "runtime-write" });
  if (existsSync(absoluteBridgePath)) {
    throw new ComathError("Goal 3 proof-breadth execution bridge already exists", {
      statusCode: 409,
      code: "GOAL3_PROOF_BREADTH_EXECUTION_BRIDGE_ALREADY_EXISTS"
    });
  }

  const manifest = createGoal3GaPositiveTaskManifest();
  const verifiedTaskIds = new Set<string>();
  const missingTaskIds = new Set<string>();
  const blockedTaskIds = new Set<string>();
  const nextExecutionTargets: Goal3ProofBreadthExecutionTarget[] = [];

  for (const task of manifest.tasks) {
    const expectedPath = finalAuthorityPackagingReportPath(task.task_id);
    const packaging = readJsonArtifact<FinalAuthorityPackagingV3Report>(projectRoot, expectedPath);
    if (packaging !== null && isVerifiedTaskPackaging(packaging.body, task.task_id)) {
      verifiedTaskIds.add(task.task_id);
      continue;
    }
    const targetStatus =
      packaging === null ? "missing_final_authority_packaging_report" : "blocked_existing_packaging_report";
    if (packaging === null) {
      missingTaskIds.add(task.task_id);
    } else {
      blockedTaskIds.add(task.task_id);
    }
    if (nextExecutionTargets.length < maxTrancheSize) {
      nextExecutionTargets.push({
        task_id: task.task_id,
        category: task.category,
        target_status: targetStatus,
        expected_packaging_report_path: expectedPath,
        required_final_evidence_classes: requiredFinalEvidenceClasses,
        executor_contract: "task_local_lean_authority_v3_packaging",
        proof_authority: "none",
        can_promote_claim: false,
        can_certify_ga: false
      });
    }
  }

  const selectedTaskIds = new Set(nextExecutionTargets.map((target) => target.task_id));
  const allPackagingVerified = verifiedTaskIds.size === 100 && missingTaskIds.size === 0 && blockedTaskIds.size === 0;
  const callerMaterialIgnored = callerProofBreadthMaterialPresent(input);
  const blockerReasons = [
    ...(allPackagingVerified ? [] : ["positive_matrix_release_candidate_proof_breadth_incomplete"]),
    ...(missingTaskIds.size > 0 ? ["positive_matrix_task_final_authority_packaging_missing"] : []),
    ...(blockedTaskIds.size > 0 ? ["positive_matrix_task_final_authority_packaging_not_verified"] : []),
    ...(callerMaterialIgnored ? ["caller_proof_breadth_material_ignored"] : [])
  ];
  const actor = sanitizeActor(input.actor);
  const body = {
    schema_version: "comath.goal3_release_candidate_proof_breadth_execution_bridge.v1",
    proof_breadth_execution_bridge_id: bridgeId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    ok: nextExecutionTargets.length > 0,
    bridge_status:
      nextExecutionTargets.length > 0
        ? "ready_for_bounded_proof_breadth_execution"
        : "complete_release_candidate_proof_breadth_no_execution_target",
    proof_breadth_status: allPackagingVerified
      ? "complete_release_candidate_proof_breadth_requires_closure_verifier"
      : "blocked_positive_matrix_release_candidate_proof_breadth_incomplete",
    proof_breadth_execution_bridge_path: bridgePath,
    requested_bridge_mode: "open_formal_workbench_release_candidate_proof_breadth_execution_bridge",
    max_tranche_size: maxTrancheSize,
    blocker_reasons: blockerReasons,
    total_required_tasks: 100,
    task_manifest_count: manifest.tasks.length,
    verified_task_count: verifiedTaskIds.size,
    missing_task_count: missingTaskIds.size,
    blocked_task_count: blockedTaskIds.size,
    next_execution_task_ids: nextExecutionTargets.map((target) => target.task_id),
    next_execution_targets: nextExecutionTargets,
    category_counts: categoryCounts(manifest, verifiedTaskIds, missingTaskIds, blockedTaskIds, selectedTaskIds),
    proof_breadth_complete: false,
    final_ga_audit_unblocked: false,
    runs_lean: false,
    executes_proofs: false,
    accepts_caller_proof_material: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    ga_certification_gate_separate: true
  } satisfies Omit<Goal3ReleaseCandidateProofBreadthExecutionBridge, "proof_breadth_execution_bridge_artifact">;

  const bridgeText = `${JSON.stringify(body, null, 2)}\n`;
  mkdirSync(dirname(absoluteBridgePath), { recursive: true });
  writeFileSync(absoluteBridgePath, bridgeText, "utf8");
  const result: Goal3ReleaseCandidateProofBreadthExecutionBridge = {
    ...body,
    proof_breadth_execution_bridge_artifact: {
      kind: "goal3_release_candidate_proof_breadth_execution_bridge",
      path: bridgePath,
      sha256: sha256Text(bridgeText),
      size_bytes: Buffer.byteLength(bridgeText, "utf8")
    }
  };

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.goal3_proof_breadth_execution_bridge_recorded",
    actor,
    target_id: projectId,
    payload: {
      proof_breadth_execution_bridge_id: bridgeId,
      bridge_status: result.bridge_status,
      proof_breadth_status: result.proof_breadth_status,
      proof_breadth_execution_bridge_path: bridgePath,
      proof_breadth_execution_bridge_artifact_sha256: result.proof_breadth_execution_bridge_artifact.sha256,
      total_required_tasks: result.total_required_tasks,
      verified_task_count: result.verified_task_count,
      missing_task_count: result.missing_task_count,
      blocked_task_count: result.blocked_task_count,
      next_execution_task_ids: result.next_execution_task_ids,
      blocker_reasons: blockerReasons,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  });
  return result;
}
