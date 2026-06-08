import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { assertPathAllowed } from "../../security/path-policy.js";
import type { ProofObligation, ResearchCampaign } from "../../types/schemas.js";
import { sha256FileSync } from "../lean/lean-project.js";
import type { LeanCandidateAttemptCheck, LeanCandidateAttemptCheckReport } from "./lean-candidate-attempt-check.js";

export type LeanCandidateAttemptRepairTask = {
  schema_version: "comath.pi_goal_mode_lean_candidate_attempt_repair_task.v1";
  campaign_id: string;
  project_id: string;
  claim_id: string;
  obligation_id: string;
  candidate_id: string;
  variant_id: LeanCandidateAttemptCheck["variant_id"];
  repair_iteration: number;
  coordinator_agent_id: "A0";
  assigned_agents: ["A5", "A8"];
  source_check_report: {
    path: string;
    sha256: string;
    proof_authority: "none";
  };
  source_check: {
    result: "repair_required";
    has_sorry: true;
    plan_path: string;
    plan_sha256: string | null;
    lean_file_path: string;
    lean_file_sha256: string | null;
    statement_boundary_hash_matches: boolean;
    source_skeleton_hash_matches: boolean;
    blueprint_hash_matches: boolean;
  };
  required_actions: string[];
  allowed_inputs: string[];
  forbidden_outputs: string[];
  service_owned_execution_required: true;
  lean_runner_invocation_allowed: false;
  may_mutate_trusted_state: false;
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
  result_can_be_used_as_proof: false;
  created_at: string;
};

export type LeanCandidateAttemptRepairBatch = {
  schema_version: "comath.pi_goal_mode_lean_candidate_attempt_repair_batch.v1";
  campaign_id: string;
  project_id: string;
  claim_id: string;
  obligation_id: string;
  locked_statement_hash: string;
  source_check_report: {
    path: string;
    sha256: string;
    proof_authority: "none";
    can_promote_claim: false;
  };
  repair_iteration: number;
  repair_required_candidate_count: number;
  blocked_candidate_count: number;
  ready_for_lean_runner_candidate_count: number;
  repair_task_count: number;
  repair_tasks_materialized: true;
  per_candidate_repairs: Array<{
    candidate_id: string;
    variant_id: LeanCandidateAttemptCheck["variant_id"];
    repair_task_path: string;
    repair_task_sha256: string;
    source_lean_file_path: string;
    source_lean_file_sha256: string | null;
    required_actions: string[];
  }>;
  repair_task_paths: string[];
  next_stage_after_repair: "candidate_verification";
  lean_runner_invocations: 0;
  lean_run_manifest_paths: string[];
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
  result_can_be_used_as_proof: false;
  created_at: string;
};

export type WriteLeanCandidateAttemptRepairBatchResult = {
  batch: LeanCandidateAttemptRepairBatch;
  batch_path: string;
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

function sha256RuntimeFile(projectRoot: string, relativePath: string): string {
  const path = assertPathAllowed(projectRoot, relativePath, { purpose: "read", resolveRealpath: true });
  return sha256FileSync(path).sha256;
}

function readTaskHash(projectRoot: string, relativePath: string): string {
  const path = assertPathAllowed(projectRoot, relativePath, { purpose: "read", resolveRealpath: true });
  readFileSync(path);
  return sha256FileSync(path).sha256;
}

function repairableChecks(
  report: LeanCandidateAttemptCheckReport
): Array<LeanCandidateAttemptCheck & { result: "repair_required"; has_sorry: true }> {
  return report.per_candidate_checks.filter(
    (check): check is LeanCandidateAttemptCheck & { result: "repair_required"; has_sorry: true } =>
      check.result === "repair_required" && check.has_sorry === true
  );
}

function createRepairTask(input: {
  campaign: ResearchCampaign;
  obligation: ProofObligation;
  checkReportPath: string;
  checkReportSha256: string;
  check: LeanCandidateAttemptCheck & { result: "repair_required"; has_sorry: true };
  createdAt: string;
}): LeanCandidateAttemptRepairTask {
  return {
    schema_version: "comath.pi_goal_mode_lean_candidate_attempt_repair_task.v1",
    campaign_id: input.campaign.campaign_id,
    project_id: input.campaign.project_id,
    claim_id: input.campaign.root_claim_id,
    obligation_id: input.obligation.obligation_id,
    candidate_id: input.check.candidate_id,
    variant_id: input.check.variant_id,
    repair_iteration: 1,
    coordinator_agent_id: "A0",
    assigned_agents: ["A5", "A8"],
    source_check_report: {
      path: input.checkReportPath,
      sha256: input.checkReportSha256,
      proof_authority: "none"
    },
    source_check: {
      result: "repair_required",
      has_sorry: true,
      plan_path: input.check.plan_path,
      plan_sha256: input.check.plan_sha256,
      lean_file_path: input.check.lean_file_path,
      lean_file_sha256: input.check.lean_file_sha256,
      statement_boundary_hash_matches: input.check.statement_boundary_hash_matches,
      source_skeleton_hash_matches: input.check.source_skeleton_hash_matches,
      blueprint_hash_matches: input.check.blueprint_hash_matches
    },
    required_actions: [...input.check.repair_actions],
    allowed_inputs: [
      input.check.plan_path,
      input.check.lean_file_path,
      input.check.source_skeleton_path,
      input.check.blueprint_path
    ].filter((item): item is string => typeof item === "string" && item.length > 0),
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

export function hasRepairableLeanCandidateAttempts(report: LeanCandidateAttemptCheckReport): boolean {
  return repairableChecks(report).length > 0;
}

export function writeLeanCandidateAttemptRepairBatch(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  obligation: ProofObligation;
  checkReportPath: string;
  checkReport: LeanCandidateAttemptCheckReport;
}): WriteLeanCandidateAttemptRepairBatchResult {
  const checkReportSha256 = sha256RuntimeFile(input.projectRoot, input.checkReportPath);
  const createdAt = new Date().toISOString();
  const repairs = repairableChecks(input.checkReport);
  const perCandidateRepairs: LeanCandidateAttemptRepairBatch["per_candidate_repairs"] = [];
  const taskPaths: string[] = [];

  for (const check of repairs) {
    const taskRel = normalizedRel(join(check.workspace_path, "lean_candidate_repair_task.json"));
    const task = createRepairTask({
      campaign: input.campaign,
      obligation: input.obligation,
      checkReportPath: input.checkReportPath,
      checkReportSha256,
      check,
      createdAt
    });
    writeJson(input.projectRoot, taskRel, task);
    const taskSha256 = readTaskHash(input.projectRoot, taskRel);
    taskPaths.push(taskRel);
    perCandidateRepairs.push({
      candidate_id: check.candidate_id,
      variant_id: check.variant_id,
      repair_task_path: taskRel,
      repair_task_sha256: taskSha256,
      source_lean_file_path: check.lean_file_path,
      source_lean_file_sha256: check.lean_file_sha256,
      required_actions: [...check.repair_actions]
    });
  }

  const batch: LeanCandidateAttemptRepairBatch = {
    schema_version: "comath.pi_goal_mode_lean_candidate_attempt_repair_batch.v1",
    campaign_id: input.campaign.campaign_id,
    project_id: input.campaign.project_id,
    claim_id: input.campaign.root_claim_id,
    obligation_id: input.obligation.obligation_id,
    locked_statement_hash: input.obligation.statement_hash,
    source_check_report: {
      path: input.checkReportPath,
      sha256: checkReportSha256,
      proof_authority: "none",
      can_promote_claim: false
    },
    repair_iteration: 1,
    repair_required_candidate_count: repairs.length,
    blocked_candidate_count: input.checkReport.candidates_blocked,
    ready_for_lean_runner_candidate_count: input.checkReport.candidates_ready_for_lean_runner,
    repair_task_count: perCandidateRepairs.length,
    repair_tasks_materialized: true,
    per_candidate_repairs: perCandidateRepairs,
    repair_task_paths: taskPaths,
    next_stage_after_repair: "candidate_verification",
    lean_runner_invocations: 0,
    lean_run_manifest_paths: [],
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    result_can_be_used_as_proof: false,
    created_at: createdAt
  };
  const batchRel = campaignRel(input.campaign, "lean_candidate_attempt_repair_batch.json");
  writeJson(input.projectRoot, batchRel, batch);
  return { batch, batch_path: batchRel, task_paths: taskPaths };
}
