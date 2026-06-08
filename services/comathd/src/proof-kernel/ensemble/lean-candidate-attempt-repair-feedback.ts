import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { assertPathAllowed } from "../../security/path-policy.js";
import type { LeanRunManifestV3, ProofObligation, ResearchCampaign } from "../../types/schemas.js";
import { sha256FileSync } from "../lean/lean-project.js";
import type { LeanCandidateAttemptLeanRunnerExecution } from "./lean-candidate-attempt-leanrunner-execution.js";
import type {
  LeanCandidateAttemptRepairBatch,
  LeanCandidateAttemptRepairTask
} from "./lean-candidate-attempt-repair.js";

export type LeanCandidateAttemptRepairFeedbackBatch = {
  schema_version: "comath.pi_goal_mode_lean_candidate_attempt_repair_feedback_batch.v1";
  campaign_id: string;
  project_id: string;
  claim_id: string;
  obligation_id: string;
  locked_statement_hash: string;
  source_leanrunner_execution: {
    path: string;
    sha256: string;
    proof_authority: "none";
  };
  source_candidate_index_path: string;
  repair_iteration: number;
  feedback_candidate_count: number;
  lean_run_manifest_paths: string[];
  per_candidate_feedback: Array<{
    candidate_id: string;
    variant_id: LeanCandidateAttemptLeanRunnerExecution["per_candidate_results"][number]["variant_id"];
    lean_runner_result: "lean_runner_rejected";
    plan_path: string;
    plan_sha256: string | null;
    lean_file_path: string;
    lean_file_sha256: string;
    lean_run_manifest_path: string;
    lean_run_manifest_sha256: string;
    stdout_path: string;
    stdout_sha256: string;
    stderr_path: string;
    stderr_sha256: string;
    exit_code: number;
    repair_actions: string[];
    proof_authority: "none";
    can_promote_claim: false;
    result_can_be_used_as_proof: false;
  }>;
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
  result_can_be_used_as_proof: false;
  created_at: string;
};

export type WriteLeanCandidateAttemptRepairFeedbackResult = {
  feedback_batch: LeanCandidateAttemptRepairFeedbackBatch;
  feedback_batch_path: string;
  repair_batch: LeanCandidateAttemptRepairBatch;
  repair_batch_path: string;
  task_paths: string[];
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

function readJson(projectRoot: string, relativePath: string): unknown {
  return JSON.parse(readFileSync(assertPathAllowed(projectRoot, relativePath, { purpose: "read", resolveRealpath: true }), "utf8"));
}

function sha256RuntimeFile(projectRoot: string, relativePath: string): string {
  const path = assertPathAllowed(projectRoot, relativePath, { purpose: "read", resolveRealpath: true });
  return sha256FileSync(path).sha256;
}

function repairActions(): string[] {
  return [
    "inspect_lean_stderr_and_repair_failed_goals",
    "preserve_locked_statement_hash",
    "do_not_treat_failed_lean_run_as_proof",
    "rerun_candidate_verification_after_repair"
  ];
}

function readLeanRunManifest(projectRoot: string, relativePath: string): LeanRunManifestV3 {
  const manifest = readJson(projectRoot, relativePath) as LeanRunManifestV3;
  if (manifest.schema_version !== "comath.lean_run_manifest.v3") {
    throw new Error("lean_run_manifest_schema_invalid");
  }
  return manifest;
}

function createRepairTask(input: {
  campaign: ResearchCampaign;
  obligation: ProofObligation;
  feedbackBatchPath: string;
  feedbackBatchSha256: string;
  feedback: LeanCandidateAttemptRepairFeedbackBatch["per_candidate_feedback"][number];
  createdAt: string;
}): LeanCandidateAttemptRepairTask & {
  source_feedback_batch: { path: string; sha256: string; proof_authority: "none" };
  source_feedback: LeanCandidateAttemptRepairFeedbackBatch["per_candidate_feedback"][number];
} {
  return {
    schema_version: "comath.pi_goal_mode_lean_candidate_attempt_repair_task.v1",
    campaign_id: input.campaign.campaign_id,
    project_id: input.campaign.project_id,
    claim_id: input.campaign.root_claim_id,
    obligation_id: input.obligation.obligation_id,
    candidate_id: input.feedback.candidate_id,
    variant_id: input.feedback.variant_id,
    repair_iteration: 2,
    coordinator_agent_id: "A0",
    assigned_agents: ["A5", "A8"],
    source_check_report: {
      path: input.feedbackBatchPath,
      sha256: input.feedbackBatchSha256,
      proof_authority: "none"
    },
    source_check: {
      result: "repair_required",
      has_sorry: false,
      plan_path: input.feedback.plan_path,
      plan_sha256: input.feedback.plan_sha256,
      lean_file_path: input.feedback.lean_file_path,
      lean_file_sha256: input.feedback.lean_file_sha256,
      statement_boundary_hash_matches: true,
      source_skeleton_hash_matches: true,
      blueprint_hash_matches: true
    },
    source_feedback_batch: {
      path: input.feedbackBatchPath,
      sha256: input.feedbackBatchSha256,
      proof_authority: "none"
    },
    source_feedback: input.feedback,
    required_actions: [...input.feedback.repair_actions],
    allowed_inputs: [
      input.feedback.lean_file_path,
      input.feedback.plan_path,
      input.feedback.lean_run_manifest_path,
      input.feedback.stdout_path,
      input.feedback.stderr_path
    ],
    forbidden_outputs: [
      "proof_claim",
      "LeanRunManifest",
      "FinalReplayManifest",
      "claim_promotion",
      "statement_change_without_FormalSpecLock_and_StatementDiffGate"
    ],
    service_owned_execution_required: true,
    lean_runner_invocation_allowed: false,
    may_mutate_trusted_state: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    result_can_be_used_as_proof: false,
    created_at: input.createdAt
  };
}

export function writeLeanCandidateAttemptRepairFeedbackBatch(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  obligation: ProofObligation;
  executionPath: string;
  execution: LeanCandidateAttemptLeanRunnerExecution;
}): WriteLeanCandidateAttemptRepairFeedbackResult {
  if (input.execution.execution_result !== "all_attempts_rejected") {
    throw new Error("lean_candidate_repair_feedback_requires_all_rejected_execution");
  }
  const createdAt = new Date().toISOString();
  const executionSha256 = sha256RuntimeFile(input.projectRoot, input.executionPath);
  const feedbackRows: LeanCandidateAttemptRepairFeedbackBatch["per_candidate_feedback"] = [];

  for (const result of input.execution.per_candidate_results) {
    if (result.result !== "lean_runner_rejected") {
      continue;
    }
    const runManifest = readLeanRunManifest(input.projectRoot, result.lean_run_manifest_path);
    feedbackRows.push({
      candidate_id: result.candidate_id,
      variant_id: result.variant_id,
      lean_runner_result: "lean_runner_rejected",
      plan_path: result.plan_path,
      plan_sha256: result.plan_sha256,
      lean_file_path: result.lean_file_path,
      lean_file_sha256: result.lean_file_sha256,
      lean_run_manifest_path: result.lean_run_manifest_path,
      lean_run_manifest_sha256: sha256RuntimeFile(input.projectRoot, result.lean_run_manifest_path),
      stdout_path: runManifest.stdout_path,
      stdout_sha256: runManifest.stdout_sha256,
      stderr_path: runManifest.stderr_path,
      stderr_sha256: runManifest.stderr_sha256,
      exit_code: runManifest.exit_code,
      repair_actions: repairActions(),
      proof_authority: "none",
      can_promote_claim: false,
      result_can_be_used_as_proof: false
    });
  }

  const feedbackBatch: LeanCandidateAttemptRepairFeedbackBatch = {
    schema_version: "comath.pi_goal_mode_lean_candidate_attempt_repair_feedback_batch.v1",
    campaign_id: input.campaign.campaign_id,
    project_id: input.campaign.project_id,
    claim_id: input.campaign.root_claim_id,
    obligation_id: input.obligation.obligation_id,
    locked_statement_hash: input.obligation.statement_hash,
    source_leanrunner_execution: {
      path: input.executionPath,
      sha256: executionSha256,
      proof_authority: "none"
    },
    source_candidate_index_path: input.execution.updated_candidate_index_path,
    repair_iteration: 2,
    feedback_candidate_count: feedbackRows.length,
    lean_run_manifest_paths: feedbackRows.map((row) => row.lean_run_manifest_path),
    per_candidate_feedback: feedbackRows,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    result_can_be_used_as_proof: false,
    created_at: createdAt
  };
  const feedbackRel = campaignRel(input.campaign, "lean_candidate_attempt_repair_feedback_batch.json");
  writeJson(input.projectRoot, feedbackRel, feedbackBatch);
  const feedbackSha256 = sha256RuntimeFile(input.projectRoot, feedbackRel);

  const taskPaths: string[] = [];
  const perCandidateRepairs: LeanCandidateAttemptRepairBatch["per_candidate_repairs"] = [];
  for (const feedback of feedbackRows) {
    const taskRel = normalizedRel(join(dirname(feedback.lean_file_path), "lean_candidate_repair_task.json"));
    const task = createRepairTask({
      campaign: input.campaign,
      obligation: input.obligation,
      feedbackBatchPath: feedbackRel,
      feedbackBatchSha256: feedbackSha256,
      feedback,
      createdAt
    });
    writeJson(input.projectRoot, taskRel, task);
    const taskSha256 = sha256RuntimeFile(input.projectRoot, taskRel);
    taskPaths.push(taskRel);
    perCandidateRepairs.push({
      candidate_id: feedback.candidate_id,
      variant_id: feedback.variant_id,
      repair_task_path: taskRel,
      repair_task_sha256: taskSha256,
      source_lean_file_path: feedback.lean_file_path,
      source_lean_file_sha256: feedback.lean_file_sha256,
      required_actions: [...feedback.repair_actions]
    });
  }

  const repairBatch = {
    schema_version: "comath.pi_goal_mode_lean_candidate_attempt_repair_batch.v1" as const,
    campaign_id: input.campaign.campaign_id,
    project_id: input.campaign.project_id,
    claim_id: input.campaign.root_claim_id,
    obligation_id: input.obligation.obligation_id,
    locked_statement_hash: input.obligation.statement_hash,
    source_check_report: {
      path: feedbackRel,
      sha256: feedbackSha256,
      proof_authority: "none" as const,
      can_promote_claim: false
    },
    source_feedback_batch: {
      path: feedbackRel,
      sha256: feedbackSha256,
      proof_authority: "none" as const
    },
    repair_iteration: 2,
    repair_required_candidate_count: perCandidateRepairs.length,
    blocked_candidate_count: 0,
    ready_for_lean_runner_candidate_count: 0,
    repair_task_count: perCandidateRepairs.length,
    repair_tasks_materialized: true as const,
    per_candidate_repairs: perCandidateRepairs,
    repair_task_paths: taskPaths,
    next_stage_after_repair: "candidate_verification" as const,
    lean_runner_invocations: 0 as const,
    lean_run_manifest_paths: feedbackBatch.lean_run_manifest_paths,
    proof_authority: "none" as const,
    can_promote_claim: false,
    can_certify_ga: false,
    result_can_be_used_as_proof: false,
    created_at: createdAt
  };
  const repairRel = campaignRel(input.campaign, "lean_candidate_attempt_repair_batch.json");
  writeJson(input.projectRoot, repairRel, repairBatch);
  return {
    feedback_batch: feedbackBatch,
    feedback_batch_path: feedbackRel,
    repair_batch: repairBatch as LeanCandidateAttemptRepairBatch,
    repair_batch_path: repairRel,
    task_paths: taskPaths
  };
}
