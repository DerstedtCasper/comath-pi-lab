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
import type {
  Goal3ProofBreadthExecutionTarget,
  Goal3ReleaseCandidateProofBreadthExecutionBridge
} from "./goal3-proof-breadth-execution-bridge.js";

type ArtifactReference = {
  kind: string;
  path: string;
  sha256: string;
  size_bytes: number;
};

type PersistedGoal3ReleaseCandidateProofBreadthExecutionBridge = Omit<
  Goal3ReleaseCandidateProofBreadthExecutionBridge,
  "proof_breadth_execution_bridge_artifact"
>;

type CategoryFollowThroughCount = {
  category: string;
  selected_task_count: number;
  verified_selected_task_count: number;
  missing_selected_task_count: number;
  blocked_selected_task_count: number;
};

export type Goal3ProofBreadthExecutionFollowThroughTarget = {
  task_id: string;
  category: string;
  target_status:
    | "verified_task_local_final_authority_packaging"
    | "blocked_existing_packaging_report"
    | "missing_final_authority_packaging_report";
  expected_packaging_report_path: string;
  packaging_report_artifact?: ArtifactReference;
  required_final_evidence_classes: string[];
  executor_contract: "task_local_lean_authority_v3_packaging";
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
};

export type Goal3ReleaseCandidateProofBreadthExecutionFollowThroughInput = {
  project_id: string;
  proof_breadth_execution_follow_through_id?: string;
  proof_breadth_execution_bridge_id: string;
  proof_breadth_execution_bridge_path: string;
  proof_breadth_execution_bridge_sha256: string;
  actor?: string;
  requested_follow_through_mode?: "open_formal_workbench_release_candidate_proof_breadth_execution_follow_through";
};

export type Goal3ReleaseCandidateProofBreadthExecutionFollowThrough = {
  schema_version: "comath.goal3_release_candidate_proof_breadth_execution_follow_through.v1";
  proof_breadth_execution_follow_through_id: string;
  project_id: string;
  actor: string;
  created_at: string;
  ok: boolean;
  follow_through_status:
    | "selected_tranche_ready_for_proof_breadth_closure_recheck"
    | "blocked_selected_tranche_incomplete"
    | "blocked_bridge_has_no_selected_tranche";
  proof_breadth_execution_follow_through_path: string;
  requested_follow_through_mode: "open_formal_workbench_release_candidate_proof_breadth_execution_follow_through";
  proof_breadth_execution_bridge_id: string;
  proof_breadth_execution_bridge_path: string;
  proof_breadth_execution_bridge_artifact: ArtifactReference;
  blocker_reasons: string[];
  selected_task_count: number;
  verified_selected_task_count: number;
  missing_selected_task_count: number;
  blocked_selected_task_count: number;
  selected_task_ids: string[];
  verified_selected_task_ids: string[];
  missing_selected_task_ids: string[];
  blocked_selected_task_ids: string[];
  selected_execution_targets: Goal3ProofBreadthExecutionFollowThroughTarget[];
  selected_packaging_report_artifacts: ArtifactReference[];
  category_counts: CategoryFollowThroughCount[];
  ready_for_proof_breadth_closure_recheck: boolean;
  proof_breadth_complete: false;
  final_ga_audit_unblocked: false;
  runs_lean: false;
  executes_proofs: false;
  accepts_caller_proof_material: false;
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
  ga_certification_gate_separate: true;
  proof_breadth_execution_follow_through_artifact: ArtifactReference;
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

function proofBreadthExecutionFollowThroughPath(followThroughId: string): string {
  return normalizeRelativePath(
    join(".comath", "release", "goal3-proof-breadth-execution-follow-through", followThroughId, "follow-through.json")
  );
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
      code: "GOAL3_PROOF_BREADTH_EXECUTION_FOLLOW_THROUGH_INVALID_ID"
    });
  }
  return id;
}

function assertSha256(value: string | undefined): string {
  const sha256 = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-f0-9]{64}$/u.test(sha256)) {
    throw new ComathError("Goal 3 proof-breadth execution follow-through bridge hash is invalid", {
      statusCode: 400,
      code: "GOAL3_PROOF_BREADTH_EXECUTION_FOLLOW_THROUGH_INVALID_BRIDGE_HASH"
    });
  }
  return sha256;
}

function sanitizeActor(value: string | undefined): string {
  return (value ?? "goal3-proof-breadth-execution-follow-through")
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

function callerProofBreadthMaterialPresent(input: Goal3ReleaseCandidateProofBreadthExecutionFollowThroughInput): boolean {
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
    record.executor_result !== undefined
  );
}

function assertBridgePath(
  inputPath: string | undefined,
  bridgeId: string
): string {
  const normalizedInputPath = normalizeRelativePath(typeof inputPath === "string" ? inputPath.trim() : "");
  const expectedPath = proofBreadthExecutionBridgePath(bridgeId);
  if (normalizedInputPath !== expectedPath) {
    throw new ComathError("Goal 3 proof-breadth execution follow-through bridge path mismatch", {
      statusCode: 400,
      code: "GOAL3_PROOF_BREADTH_EXECUTION_FOLLOW_THROUGH_BRIDGE_PATH_MISMATCH"
    });
  }
  return expectedPath;
}

function assertBridgeArtifact(
  projectRoot: string,
  projectId: string,
  bridgeId: string,
  bridgePath: string,
  expectedSha256: string
): { body: PersistedGoal3ReleaseCandidateProofBreadthExecutionBridge; artifact: ArtifactReference } {
  const bridge = readJsonArtifact<PersistedGoal3ReleaseCandidateProofBreadthExecutionBridge>(
    projectRoot,
    bridgePath,
    "goal3_release_candidate_proof_breadth_execution_bridge"
  );
  if (bridge === null) {
    throw new ComathError("Goal 3 proof-breadth execution follow-through bridge artifact is missing", {
      statusCode: 404,
      code: "GOAL3_PROOF_BREADTH_EXECUTION_FOLLOW_THROUGH_BRIDGE_MISSING"
    });
  }
  if (bridge.artifact.sha256 !== expectedSha256) {
    throw new ComathError("Goal 3 proof-breadth execution follow-through bridge hash is stale", {
      statusCode: 409,
      code: "GOAL3_PROOF_BREADTH_EXECUTION_FOLLOW_THROUGH_STALE_BRIDGE"
    });
  }
  if (
    bridge.body.schema_version !== "comath.goal3_release_candidate_proof_breadth_execution_bridge.v1" ||
    bridge.body.project_id !== projectId ||
    bridge.body.proof_breadth_execution_bridge_id !== bridgeId ||
    bridge.body.proof_breadth_execution_bridge_path !== bridgePath ||
    !Array.isArray(bridge.body.next_execution_task_ids) ||
    !Array.isArray(bridge.body.next_execution_targets) ||
    bridge.body.proof_authority !== "none" ||
    bridge.body.can_promote_claim !== false ||
    bridge.body.can_certify_ga !== false
  ) {
    throw new ComathError("Goal 3 proof-breadth execution follow-through bridge artifact is invalid", {
      statusCode: 400,
      code: "GOAL3_PROOF_BREADTH_EXECUTION_FOLLOW_THROUGH_INVALID_BRIDGE"
    });
  }
  return bridge;
}

function targetByTaskId(
  bridgeTargets: Goal3ProofBreadthExecutionTarget[],
  taskId: string
): Goal3ProofBreadthExecutionTarget {
  const target = bridgeTargets.find((candidate) => candidate.task_id === taskId);
  if (target === undefined || target.expected_packaging_report_path !== finalAuthorityPackagingReportPath(taskId)) {
    throw new ComathError("Goal 3 proof-breadth execution follow-through bridge target is invalid", {
      statusCode: 400,
      code: "GOAL3_PROOF_BREADTH_EXECUTION_FOLLOW_THROUGH_INVALID_BRIDGE_TARGET"
    });
  }
  return target;
}

function assertSelectedTasksInManifest(
  manifest: Goal3GaPositiveTaskManifest,
  selectedTaskIds: string[]
): void {
  const manifestTaskIds = new Set(manifest.tasks.map((task) => task.task_id));
  for (const taskId of selectedTaskIds) {
    if (!manifestTaskIds.has(taskId)) {
      throw new ComathError("Goal 3 proof-breadth execution follow-through selected task is outside the manifest", {
        statusCode: 400,
        code: "GOAL3_PROOF_BREADTH_EXECUTION_FOLLOW_THROUGH_INVALID_SELECTED_TASK"
      });
    }
  }
}

function categoryCounts(targets: Goal3ProofBreadthExecutionFollowThroughTarget[]): CategoryFollowThroughCount[] {
  const counts = new Map<string, CategoryFollowThroughCount>();
  for (const target of targets) {
    const existing = counts.get(target.category) ?? {
      category: target.category,
      selected_task_count: 0,
      verified_selected_task_count: 0,
      missing_selected_task_count: 0,
      blocked_selected_task_count: 0
    };
    existing.selected_task_count += 1;
    if (target.target_status === "verified_task_local_final_authority_packaging") {
      existing.verified_selected_task_count += 1;
    } else if (target.target_status === "missing_final_authority_packaging_report") {
      existing.missing_selected_task_count += 1;
    } else {
      existing.blocked_selected_task_count += 1;
    }
    counts.set(target.category, existing);
  }
  return [...counts.values()];
}

export function recordGoal3ReleaseCandidateProofBreadthExecutionFollowThrough(
  projectRoot: string,
  input: Goal3ReleaseCandidateProofBreadthExecutionFollowThroughInput
): Goal3ReleaseCandidateProofBreadthExecutionFollowThrough {
  const projectId = assertSafeId(input.project_id, "project_id");
  const followThroughId = assertSafeId(
    input.proof_breadth_execution_follow_through_id,
    "proof_breadth_execution_follow_through_id"
  );
  const bridgeId = assertSafeId(input.proof_breadth_execution_bridge_id, "proof_breadth_execution_bridge_id");
  const bridgeSha256 = assertSha256(input.proof_breadth_execution_bridge_sha256);
  const bridgePath = assertBridgePath(input.proof_breadth_execution_bridge_path, bridgeId);
  const requestedMode =
    input.requested_follow_through_mode ??
    "open_formal_workbench_release_candidate_proof_breadth_execution_follow_through";
  if (requestedMode !== "open_formal_workbench_release_candidate_proof_breadth_execution_follow_through") {
    throw new ComathError("Goal 3 proof-breadth execution follow-through mode is invalid", {
      statusCode: 400,
      code: "GOAL3_PROOF_BREADTH_EXECUTION_FOLLOW_THROUGH_INVALID_MODE"
    });
  }

  const followThroughPath = proofBreadthExecutionFollowThroughPath(followThroughId);
  const absoluteFollowThroughPath = assertPathAllowed(projectRoot, followThroughPath, { purpose: "runtime-write" });
  if (existsSync(absoluteFollowThroughPath)) {
    throw new ComathError("Goal 3 proof-breadth execution follow-through already exists", {
      statusCode: 409,
      code: "GOAL3_PROOF_BREADTH_EXECUTION_FOLLOW_THROUGH_ALREADY_EXISTS"
    });
  }

  const bridge = assertBridgeArtifact(projectRoot, projectId, bridgeId, bridgePath, bridgeSha256);
  const manifest = createGoal3GaPositiveTaskManifest();
  assertSelectedTasksInManifest(manifest, bridge.body.next_execution_task_ids);

  const verifiedSelectedTaskIds: string[] = [];
  const missingSelectedTaskIds: string[] = [];
  const blockedSelectedTaskIds: string[] = [];
  const selectedPackagingReportArtifacts: ArtifactReference[] = [];
  const selectedExecutionTargets: Goal3ProofBreadthExecutionFollowThroughTarget[] = [];

  for (const taskId of bridge.body.next_execution_task_ids) {
    const bridgeTarget = targetByTaskId(bridge.body.next_execution_targets, taskId);
    const packaging = readJsonArtifact<FinalAuthorityPackagingV3Report>(
      projectRoot,
      bridgeTarget.expected_packaging_report_path,
      "final_authority_packaging_report_v3"
    );
    if (packaging === null) {
      missingSelectedTaskIds.push(taskId);
      selectedExecutionTargets.push({
        task_id: taskId,
        category: bridgeTarget.category,
        target_status: "missing_final_authority_packaging_report",
        expected_packaging_report_path: bridgeTarget.expected_packaging_report_path,
        required_final_evidence_classes: requiredFinalEvidenceClasses,
        executor_contract: "task_local_lean_authority_v3_packaging",
        proof_authority: "none",
        can_promote_claim: false,
        can_certify_ga: false
      });
      continue;
    }

    selectedPackagingReportArtifacts.push(packaging.artifact);
    if (isVerifiedTaskPackaging(packaging.body, taskId)) {
      verifiedSelectedTaskIds.push(taskId);
      selectedExecutionTargets.push({
        task_id: taskId,
        category: bridgeTarget.category,
        target_status: "verified_task_local_final_authority_packaging",
        expected_packaging_report_path: bridgeTarget.expected_packaging_report_path,
        packaging_report_artifact: packaging.artifact,
        required_final_evidence_classes: requiredFinalEvidenceClasses,
        executor_contract: "task_local_lean_authority_v3_packaging",
        proof_authority: "none",
        can_promote_claim: false,
        can_certify_ga: false
      });
    } else {
      blockedSelectedTaskIds.push(taskId);
      selectedExecutionTargets.push({
        task_id: taskId,
        category: bridgeTarget.category,
        target_status: "blocked_existing_packaging_report",
        expected_packaging_report_path: bridgeTarget.expected_packaging_report_path,
        packaging_report_artifact: packaging.artifact,
        required_final_evidence_classes: requiredFinalEvidenceClasses,
        executor_contract: "task_local_lean_authority_v3_packaging",
        proof_authority: "none",
        can_promote_claim: false,
        can_certify_ga: false
      });
    }
  }

  const selectedTaskIds = [...bridge.body.next_execution_task_ids];
  const selectedTrancheComplete = selectedTaskIds.length > 0 && verifiedSelectedTaskIds.length === selectedTaskIds.length;
  const callerMaterialIgnored = callerProofBreadthMaterialPresent(input);
  const blockerReasons = [
    ...(selectedTaskIds.length === 0 ? ["bridge_has_no_selected_positive_matrix_tranche"] : []),
    ...(selectedTrancheComplete ? [] : ["selected_positive_matrix_tranche_incomplete"]),
    ...(missingSelectedTaskIds.length > 0 ? ["selected_positive_matrix_task_final_authority_packaging_missing"] : []),
    ...(blockedSelectedTaskIds.length > 0 ? ["selected_positive_matrix_task_final_authority_packaging_not_verified"] : []),
    ...(callerMaterialIgnored ? ["caller_proof_breadth_material_ignored"] : [])
  ];
  const actor = sanitizeActor(input.actor);
  const body = {
    schema_version: "comath.goal3_release_candidate_proof_breadth_execution_follow_through.v1",
    proof_breadth_execution_follow_through_id: followThroughId,
    project_id: projectId,
    actor,
    created_at: new Date().toISOString(),
    ok: selectedTrancheComplete,
    follow_through_status:
      selectedTaskIds.length === 0
        ? "blocked_bridge_has_no_selected_tranche"
        : selectedTrancheComplete
          ? "selected_tranche_ready_for_proof_breadth_closure_recheck"
          : "blocked_selected_tranche_incomplete",
    proof_breadth_execution_follow_through_path: followThroughPath,
    requested_follow_through_mode: "open_formal_workbench_release_candidate_proof_breadth_execution_follow_through",
    proof_breadth_execution_bridge_id: bridgeId,
    proof_breadth_execution_bridge_path: bridgePath,
    proof_breadth_execution_bridge_artifact: bridge.artifact,
    blocker_reasons: blockerReasons,
    selected_task_count: selectedTaskIds.length,
    verified_selected_task_count: verifiedSelectedTaskIds.length,
    missing_selected_task_count: missingSelectedTaskIds.length,
    blocked_selected_task_count: blockedSelectedTaskIds.length,
    selected_task_ids: selectedTaskIds,
    verified_selected_task_ids: verifiedSelectedTaskIds,
    missing_selected_task_ids: missingSelectedTaskIds,
    blocked_selected_task_ids: blockedSelectedTaskIds,
    selected_execution_targets: selectedExecutionTargets,
    selected_packaging_report_artifacts: selectedPackagingReportArtifacts,
    category_counts: categoryCounts(selectedExecutionTargets),
    ready_for_proof_breadth_closure_recheck: selectedTrancheComplete,
    proof_breadth_complete: false,
    final_ga_audit_unblocked: false,
    runs_lean: false,
    executes_proofs: false,
    accepts_caller_proof_material: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    ga_certification_gate_separate: true
  } satisfies Omit<
    Goal3ReleaseCandidateProofBreadthExecutionFollowThrough,
    "proof_breadth_execution_follow_through_artifact"
  >;

  const followThroughText = `${JSON.stringify(body, null, 2)}\n`;
  mkdirSync(dirname(absoluteFollowThroughPath), { recursive: true });
  writeFileSync(absoluteFollowThroughPath, followThroughText, "utf8");
  const result: Goal3ReleaseCandidateProofBreadthExecutionFollowThrough = {
    ...body,
    proof_breadth_execution_follow_through_artifact: {
      kind: "goal3_release_candidate_proof_breadth_execution_follow_through",
      path: followThroughPath,
      sha256: sha256Text(followThroughText),
      size_bytes: Buffer.byteLength(followThroughText, "utf8")
    }
  };

  appendAuditEvent(projectRoot, {
    project_id: projectId,
    event_type: "release.goal3_proof_breadth_execution_follow_through_recorded",
    actor,
    target_id: projectId,
    payload: {
      proof_breadth_execution_follow_through_id: followThroughId,
      follow_through_status: result.follow_through_status,
      proof_breadth_execution_follow_through_path: followThroughPath,
      proof_breadth_execution_follow_through_artifact_sha256:
        result.proof_breadth_execution_follow_through_artifact.sha256,
      proof_breadth_execution_bridge_id: bridgeId,
      proof_breadth_execution_bridge_artifact_sha256: bridge.artifact.sha256,
      selected_task_ids: selectedTaskIds,
      verified_selected_task_count: result.verified_selected_task_count,
      missing_selected_task_count: result.missing_selected_task_count,
      blocked_selected_task_count: result.blocked_selected_task_count,
      ready_for_proof_breadth_closure_recheck: result.ready_for_proof_breadth_closure_recheck,
      blocker_reasons: blockerReasons,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    }
  });
  return result;
}
