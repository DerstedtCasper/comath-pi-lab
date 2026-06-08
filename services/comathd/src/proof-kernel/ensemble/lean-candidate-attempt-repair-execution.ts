import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { assertPathAllowed } from "../../security/path-policy.js";
import type { ProofObligation, ResearchCampaign } from "../../types/schemas.js";
import { sha256FileSync } from "../lean/lean-project.js";
import type { LeanCandidateAttemptRepairBatch } from "./lean-candidate-attempt-repair.js";

export type LeanCandidateAttemptRepairExecution = {
  schema_version: "comath.pi_goal_mode_lean_candidate_attempt_repair_execution.v1";
  campaign_id: string;
  project_id: string;
  claim_id: string;
  obligation_id: string;
  locked_statement_hash: string;
  execution_result: "repaired_attempts_materialized";
  source_repair_batch: {
    path: string;
    sha256: string;
    proof_authority: "none";
  };
  source_feedback_batch?: {
    path: string;
    sha256: string;
    proof_authority: "none";
  };
  source_repair_hint_bundle?: {
    path: string;
    sha256: string;
    proof_authority: "none";
  };
  source_repair_hint_execution?: {
    path: string;
    sha256: string;
    proof_authority: "none";
  };
  repair_iteration: number;
  repaired_candidate_count: number;
  repaired_attempts_materialized: true;
  repaired_attempts_ready_for_preflight: number;
  repaired_placeholder_free_candidate_count: number;
  per_candidate_executions: Array<{
    candidate_id: string;
    variant_id: string;
    repair_task_path: string;
    repair_execution_path: string;
    repair_input_snapshot_path: string;
    repaired_lean_file_path: string;
    original_lean_file_sha256: string;
    repaired_lean_file_sha256: string;
    source_feedback_batch?: {
      path: string;
      sha256: string;
      proof_authority: "none";
    };
    source_feedback?: Record<string, unknown>;
    source_repair_hint_bundle?: {
      path: string;
      sha256: string;
      proof_authority: "none";
    };
    source_repair_hints?: Record<string, unknown>[];
    source_repair_hint_execution?: {
      path: string;
      sha256: string;
      proof_authority: "none";
    };
    source_repair_hint_results?: Record<string, unknown>[];
    feedback_guided_revision_applied?: boolean;
    hint_guided_revision_applied?: boolean;
    hint_execution_guided_revision_applied?: boolean;
    placeholder_free_repair_materialized: boolean;
    placeholder_free_repair_strategy: "locked_true_theorem_trivial" | null;
    original_had_sorry: boolean;
    repaired_has_sorry: false;
    repair_placeholder_present: boolean;
    proof_authority: "none";
    can_promote_claim: false;
    result_can_be_used_as_proof: false;
  }>;
  next_stage: "candidate_verification";
  lean_runner_invocations: 0;
  lean_run_manifest_paths: string[];
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
  result_can_be_used_as_proof: false;
  created_at: string;
};

export type ExecuteLeanCandidateAttemptRepairBatchResult = {
  execution: LeanCandidateAttemptRepairExecution;
  execution_path: string;
  artifact_paths: string[];
};

function normalizedRel(path: string): string {
  return path.replace(/\\/g, "/");
}

function campaignRel(campaign: ResearchCampaign, rel: string): string {
  return normalizedRel(join(".comath", "campaign", campaign.campaign_id, rel));
}

function writeJson(projectRoot: string, relativePath: string, value: unknown): string {
  const path = assertPathAllowed(projectRoot, relativePath, { purpose: "runtime-write" });
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return path;
}

function writeText(projectRoot: string, relativePath: string, value: string): string {
  const path = assertPathAllowed(projectRoot, relativePath, { purpose: "runtime-write" });
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value, "utf8");
  return path;
}

function readText(projectRoot: string, relativePath: string): string {
  return readFileSync(assertPathAllowed(projectRoot, relativePath, { purpose: "read", resolveRealpath: true }), "utf8");
}

function sha256RuntimeFile(projectRoot: string, relativePath: string): string {
  const path = assertPathAllowed(projectRoot, relativePath, { purpose: "read", resolveRealpath: true });
  return sha256FileSync(path).sha256;
}

function stripLeanLineComments(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const index = line.indexOf("--");
      return index >= 0 ? line.slice(0, index) : line;
    })
    .join("\n");
}

function hasSorry(text: string): boolean {
  return /(?:^|[^A-Za-z0-9_'])sorry(?:[^A-Za-z0-9_']|$)/u.test(stripLeanLineComments(text));
}

function hasLockedTrueTheoremWithSorry(text: string): boolean {
  const code = stripLeanLineComments(text);
  return /\b(?:theorem|lemma)\s+[A-Za-z_][A-Za-z0-9_'.]*(?:\.[A-Za-z_][A-Za-z0-9_'.]*)*[\s\S]*?:\s*True\s*:=\s*by[\s\S]*\bsorry\b/u.test(
    code
  );
}

function replaceLeanSorryTokens(text: string, replacement: string): string {
  return text
    .split(/(\r?\n)/)
    .map((part) => {
      if (part === "\n" || part === "\r\n") {
        return part;
      }
      const commentIndex = part.indexOf("--");
      const code = commentIndex >= 0 ? part.slice(0, commentIndex) : part;
      const comment = commentIndex >= 0 ? part.slice(commentIndex) : "";
      return `${code.replace(/(^|[^A-Za-z0-9_'])sorry([^A-Za-z0-9_']|$)/gu, `$1${replacement}$2`)}${comment}`;
    })
    .join("");
}

function repairLeanDraft(
  text: string,
  task: Record<string, unknown>
): {
  text: string;
  feedbackGuidedRevisionApplied: boolean;
  hintGuidedRevisionApplied: boolean;
  hintExecutionGuidedRevisionApplied: boolean;
  placeholderFreeRepairMaterialized: boolean;
  placeholderFreeRepairStrategy: "locked_true_theorem_trivial" | null;
} {
  const placeholder = [
    "by",
    "  -- comath_repair_placeholder: non-authoritative draft for LeanRunner.",
    "  exact ?comath_repair_placeholder"
  ].join("\n");
  const canMaterializeTrivial = hasLockedTrueTheoremWithSorry(text);
  const replaced = replaceLeanSorryTokens(text, canMaterializeTrivial ? "trivial" : placeholder);
  const markers: string[] = [];
  const sourceFeedback =
    task.source_feedback && typeof task.source_feedback === "object" && !Array.isArray(task.source_feedback)
      ? (task.source_feedback as Record<string, unknown>)
      : undefined;
  if (sourceFeedback) {
    const manifestPath = typeof sourceFeedback.lean_run_manifest_path === "string" ? sourceFeedback.lean_run_manifest_path : "unknown";
    const stderrSha = typeof sourceFeedback.stderr_sha256 === "string" ? sourceFeedback.stderr_sha256 : "unknown";
    markers.push(
      "-- comath_repair_feedback: non-authoritative LeanRunner diagnostics were bound for the next repair pass.",
      `-- lean_run_manifest: ${manifestPath}`,
      `-- stderr_sha256: ${stderrSha}`
    );
  }
  const sourceHintBundle = repairHintBundleFromTask(task);
  if (sourceHintBundle) {
    markers.push(
      "-- comath_repair_hints: non-authoritative external wheel descriptors were bound for this repair pass.",
      `-- repair_hint_bundle: ${sourceHintBundle.path}`,
      `-- repair_hint_bundle_sha256: ${sourceHintBundle.sha256}`
    );
  }
  const sourceHintExecution = repairHintExecutionFromTask(task);
  if (sourceHintExecution) {
    markers.push(
      "-- comath_repair_hint_execution: service-owned non-authoritative external wheel stub results were bound for this repair pass.",
      `-- repair_hint_execution: ${sourceHintExecution.path}`,
      `-- repair_hint_execution_sha256: ${sourceHintExecution.sha256}`
    );
  }
  if (markers.length === 0) {
    return {
      text: replaced,
      feedbackGuidedRevisionApplied: false,
      hintGuidedRevisionApplied: false,
      hintExecutionGuidedRevisionApplied: false,
      placeholderFreeRepairMaterialized: canMaterializeTrivial,
      placeholderFreeRepairStrategy: canMaterializeTrivial ? "locked_true_theorem_trivial" : null
    };
  }
  return {
    text: `${replaced.trimEnd()}\n\n${markers.join("\n")}\n`,
    feedbackGuidedRevisionApplied: Boolean(sourceFeedback),
    hintGuidedRevisionApplied: Boolean(sourceHintBundle),
    hintExecutionGuidedRevisionApplied: Boolean(sourceHintExecution),
    placeholderFreeRepairMaterialized: canMaterializeTrivial,
    placeholderFreeRepairStrategy: canMaterializeTrivial ? "locked_true_theorem_trivial" : null
  };
}

function readRepairTask(projectRoot: string, relativePath: string): Record<string, unknown> {
  const parsed = JSON.parse(readText(projectRoot, relativePath)) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("lean_candidate_repair_task_invalid");
  }
  const task = parsed as Record<string, unknown>;
  if (task.schema_version !== "comath.pi_goal_mode_lean_candidate_attempt_repair_task.v1") {
    throw new Error("lean_candidate_repair_task_schema_invalid");
  }
  return task;
}

function feedbackBatchFromTask(task: Record<string, unknown>): LeanCandidateAttemptRepairExecution["source_feedback_batch"] | undefined {
  const source = task.source_feedback_batch;
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return undefined;
  }
  const record = source as Record<string, unknown>;
  if (typeof record.path !== "string" || typeof record.sha256 !== "string" || record.proof_authority !== "none") {
    return undefined;
  }
  return { path: record.path, sha256: record.sha256, proof_authority: "none" };
}

function repairHintBundleFromTask(task: Record<string, unknown>): LeanCandidateAttemptRepairExecution["source_repair_hint_bundle"] | undefined {
  const source = task.source_repair_hint_bundle;
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return undefined;
  }
  const record = source as Record<string, unknown>;
  if (typeof record.path !== "string" || typeof record.sha256 !== "string" || record.proof_authority !== "none") {
    return undefined;
  }
  return { path: record.path, sha256: record.sha256, proof_authority: "none" };
}

function repairHintExecutionFromTask(
  task: Record<string, unknown>
): LeanCandidateAttemptRepairExecution["source_repair_hint_execution"] | undefined {
  const source = task.source_repair_hint_execution;
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return undefined;
  }
  const record = source as Record<string, unknown>;
  if (typeof record.path !== "string" || typeof record.sha256 !== "string" || record.proof_authority !== "none") {
    return undefined;
  }
  return { path: record.path, sha256: record.sha256, proof_authority: "none" };
}

function sourceFeedbackFromTask(task: Record<string, unknown>): Record<string, unknown> | undefined {
  const source = task.source_feedback;
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return undefined;
  }
  return source as Record<string, unknown>;
}

function sourceRepairHintsFromTask(task: Record<string, unknown>): Record<string, unknown>[] | undefined {
  const source = task.source_repair_hints;
  if (!Array.isArray(source)) {
    return undefined;
  }
  const hints = source.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item));
  return hints.length > 0 ? hints : undefined;
}

function sourceRepairHintResultsFromTask(task: Record<string, unknown>): Record<string, unknown>[] | undefined {
  const source = task.source_repair_hint_results;
  if (!Array.isArray(source)) {
    return undefined;
  }
  const results = source.filter(
    (item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item)
  );
  return results.length > 0 ? results : undefined;
}

function validateRepairTaskAgainstBatch(input: {
  projectRoot: string;
  task: Record<string, unknown>;
  repair: LeanCandidateAttemptRepairBatch["per_candidate_repairs"][number];
  batch: LeanCandidateAttemptRepairBatch;
}): void {
  if (input.task.proof_authority !== "none" || input.task.can_promote_claim !== false || input.task.lean_runner_invocation_allowed !== false) {
    throw new Error("lean_candidate_repair_task_authority_flags_invalid");
  }
  const currentTaskSha256 = sha256RuntimeFile(input.projectRoot, input.repair.repair_task_path);
  if (currentTaskSha256 !== input.repair.repair_task_sha256) {
    throw new Error("lean_candidate_repair_task_hash_mismatch");
  }
  const currentLeanSha256 = sha256RuntimeFile(input.projectRoot, input.repair.source_lean_file_path);
  if (typeof input.repair.source_lean_file_sha256 === "string" && currentLeanSha256 !== input.repair.source_lean_file_sha256) {
    throw new Error("lean_candidate_repair_source_lean_hash_mismatch");
  }
  const feedbackBatch = feedbackBatchFromTask(input.task);
  if (feedbackBatch && input.batch.source_feedback_batch) {
    if (
      feedbackBatch.path !== input.batch.source_feedback_batch.path ||
      feedbackBatch.sha256 !== input.batch.source_feedback_batch.sha256
    ) {
      throw new Error("lean_candidate_repair_task_feedback_batch_mismatch");
    }
  }
  const hintBundle = repairHintBundleFromTask(input.task);
  if (hintBundle && input.batch.source_repair_hint_bundle) {
    if (
      hintBundle.path !== input.batch.source_repair_hint_bundle.path ||
      hintBundle.sha256 !== input.batch.source_repair_hint_bundle.sha256
    ) {
      throw new Error("lean_candidate_repair_task_hint_bundle_mismatch");
    }
    const currentHintSha256 = sha256RuntimeFile(input.projectRoot, hintBundle.path);
    if (currentHintSha256 !== hintBundle.sha256) {
      throw new Error("lean_candidate_repair_hint_bundle_hash_mismatch");
    }
  }
  const repairHints = sourceRepairHintsFromTask(input.task);
  if (repairHints) {
    for (const hint of repairHints) {
      if (
        hint.proof_authority !== "none" ||
        hint.can_promote_claim !== false ||
        hint.result_can_be_used_as_proof !== false ||
        hint.service_owned_execution_required !== true
      ) {
        throw new Error("lean_candidate_repair_hint_authority_flags_invalid");
      }
    }
  }
  const hintExecution = repairHintExecutionFromTask(input.task);
  if (hintExecution && input.batch.source_repair_hint_execution) {
    if (
      hintExecution.path !== input.batch.source_repair_hint_execution.path ||
      hintExecution.sha256 !== input.batch.source_repair_hint_execution.sha256
    ) {
      throw new Error("lean_candidate_repair_task_hint_execution_mismatch");
    }
    const currentHintExecutionSha256 = sha256RuntimeFile(input.projectRoot, hintExecution.path);
    if (currentHintExecutionSha256 !== hintExecution.sha256) {
      throw new Error("lean_candidate_repair_hint_execution_hash_mismatch");
    }
  }
  const hintResults = sourceRepairHintResultsFromTask(input.task);
  if (hintResults) {
    for (const result of hintResults) {
      if (
        result.proof_authority !== "none" ||
        result.can_promote_claim !== false ||
        result.result_can_be_used_as_proof !== false ||
        result.network_execution_performed !== false
      ) {
        throw new Error("lean_candidate_repair_hint_execution_authority_flags_invalid");
      }
    }
  }
}

export function executeLeanCandidateAttemptRepairBatch(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  obligation: ProofObligation;
  batchPath: string;
  batch: LeanCandidateAttemptRepairBatch;
}): ExecuteLeanCandidateAttemptRepairBatchResult {
  const batchSha256 = sha256RuntimeFile(input.projectRoot, input.batchPath);
  const createdAt = new Date().toISOString();
  const perCandidateExecutions: LeanCandidateAttemptRepairExecution["per_candidate_executions"] = [];
  const artifactPaths: string[] = [];

  for (const repair of input.batch.per_candidate_repairs) {
    const task = readRepairTask(input.projectRoot, repair.repair_task_path);
    if (task.candidate_id !== repair.candidate_id) {
      throw new Error("lean_candidate_repair_task_candidate_mismatch");
    }
    validateRepairTaskAgainstBatch({ projectRoot: input.projectRoot, task, repair, batch: input.batch });
    const sourceLeanRel = repair.source_lean_file_path;
    const originalLean = readText(input.projectRoot, sourceLeanRel);
    const originalHadSorry = hasSorry(originalLean);
    const originalSha256 = sha256RuntimeFile(input.projectRoot, sourceLeanRel);
    const repairDir = normalizedRel(dirname(repair.repair_task_path));
    const inputSnapshotRel = normalizedRel(join(repairDir, "LeanCandidate.repair-input-1.lean"));
    const perCandidateExecutionRel = normalizedRel(join(repairDir, "lean_candidate_repair_execution.json"));
    writeText(input.projectRoot, inputSnapshotRel, originalLean);
    const feedbackBatch = feedbackBatchFromTask(task);
    const sourceFeedback = sourceFeedbackFromTask(task);
    const repairHintBundle = repairHintBundleFromTask(task);
    const sourceRepairHints = sourceRepairHintsFromTask(task);
    const repairHintExecution = repairHintExecutionFromTask(task);
    const sourceRepairHintResults = sourceRepairHintResultsFromTask(task);
    const repaired = repairLeanDraft(originalLean, task);
    const repairedLean = repaired.text;
    writeText(input.projectRoot, sourceLeanRel, repairedLean);
    const repairedHasSorry = hasSorry(repairedLean);
    if (repairedHasSorry) {
      throw new Error("lean_candidate_repair_execution_sorry_remaining");
    }
    const repairedSha256 = sha256RuntimeFile(input.projectRoot, sourceLeanRel);
    const perCandidate = {
      schema_version: "comath.pi_goal_mode_lean_candidate_attempt_per_candidate_repair_execution.v1",
      campaign_id: input.campaign.campaign_id,
      obligation_id: input.obligation.obligation_id,
      candidate_id: repair.candidate_id,
      variant_id: repair.variant_id,
      source_repair_batch: {
        path: input.batchPath,
        sha256: batchSha256,
        proof_authority: "none"
      },
      source_feedback_batch: feedbackBatch,
      source_feedback: sourceFeedback,
      source_repair_hint_bundle: repairHintBundle,
      source_repair_hints: sourceRepairHints,
      source_repair_hint_execution: repairHintExecution,
      source_repair_hint_results: sourceRepairHintResults,
      repair_task_path: repair.repair_task_path,
      repair_input_snapshot_path: inputSnapshotRel,
      repaired_lean_file_path: sourceLeanRel,
      original_lean_file_sha256: originalSha256,
      repaired_lean_file_sha256: repairedSha256,
      feedback_guided_revision_applied: repaired.feedbackGuidedRevisionApplied,
      hint_guided_revision_applied: repaired.hintGuidedRevisionApplied,
      hint_execution_guided_revision_applied: repaired.hintExecutionGuidedRevisionApplied,
      placeholder_free_repair_materialized: repaired.placeholderFreeRepairMaterialized,
      placeholder_free_repair_strategy: repaired.placeholderFreeRepairStrategy,
      original_had_sorry: originalHadSorry,
      repaired_has_sorry: false,
      repair_placeholder_present: repairedLean.includes("comath_repair_placeholder"),
      lean_runner_invocation_allowed_after_preflight_only: true,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false,
      result_can_be_used_as_proof: false,
      created_at: createdAt
    };
    writeJson(input.projectRoot, perCandidateExecutionRel, perCandidate);
    artifactPaths.push(inputSnapshotRel, perCandidateExecutionRel, sourceLeanRel);
    perCandidateExecutions.push({
      candidate_id: repair.candidate_id,
      variant_id: repair.variant_id,
      repair_task_path: repair.repair_task_path,
      repair_execution_path: perCandidateExecutionRel,
      repair_input_snapshot_path: inputSnapshotRel,
      repaired_lean_file_path: sourceLeanRel,
      original_lean_file_sha256: originalSha256,
      repaired_lean_file_sha256: repairedSha256,
      source_feedback_batch: feedbackBatch,
      source_feedback: sourceFeedback,
      source_repair_hint_bundle: repairHintBundle,
      source_repair_hints: sourceRepairHints,
      source_repair_hint_execution: repairHintExecution,
      source_repair_hint_results: sourceRepairHintResults,
      feedback_guided_revision_applied: repaired.feedbackGuidedRevisionApplied,
      hint_guided_revision_applied: repaired.hintGuidedRevisionApplied,
      hint_execution_guided_revision_applied: repaired.hintExecutionGuidedRevisionApplied,
      placeholder_free_repair_materialized: repaired.placeholderFreeRepairMaterialized,
      placeholder_free_repair_strategy: repaired.placeholderFreeRepairStrategy,
      original_had_sorry: originalHadSorry,
      repaired_has_sorry: false,
      repair_placeholder_present: repairedLean.includes("comath_repair_placeholder"),
      proof_authority: "none",
      can_promote_claim: false,
      result_can_be_used_as_proof: false
    });
  }

  const execution: LeanCandidateAttemptRepairExecution = {
    schema_version: "comath.pi_goal_mode_lean_candidate_attempt_repair_execution.v1",
    campaign_id: input.campaign.campaign_id,
    project_id: input.campaign.project_id,
    claim_id: input.campaign.root_claim_id,
    obligation_id: input.obligation.obligation_id,
    locked_statement_hash: input.obligation.statement_hash,
    execution_result: "repaired_attempts_materialized",
    source_repair_batch: {
      path: input.batchPath,
      sha256: batchSha256,
      proof_authority: "none"
    },
    source_feedback_batch: input.batch.source_feedback_batch,
    source_repair_hint_bundle: input.batch.source_repair_hint_bundle,
    source_repair_hint_execution: input.batch.source_repair_hint_execution,
    repair_iteration: input.batch.repair_iteration,
    repaired_candidate_count: perCandidateExecutions.length,
    repaired_attempts_materialized: true,
    repaired_attempts_ready_for_preflight: perCandidateExecutions.length,
    repaired_placeholder_free_candidate_count: perCandidateExecutions.filter((item) => item.placeholder_free_repair_materialized).length,
    per_candidate_executions: perCandidateExecutions,
    next_stage: "candidate_verification",
    lean_runner_invocations: 0,
    lean_run_manifest_paths: [],
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    result_can_be_used_as_proof: false,
    created_at: createdAt
  };
  const executionRel = campaignRel(input.campaign, "lean_candidate_attempt_repair_execution.json");
  writeJson(input.projectRoot, executionRel, execution);
  artifactPaths.push(executionRel);
  return { execution, execution_path: executionRel, artifact_paths: artifactPaths };
}
