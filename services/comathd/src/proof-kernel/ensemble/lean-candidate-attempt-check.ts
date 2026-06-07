import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { assertPathAllowed } from "../../security/path-policy.js";
import {
  candidateManifestSchema,
  type CandidateManifest,
  type CandidateRun,
  type ProofObligation,
  type ResearchCampaign
} from "../../types/schemas.js";

export type LeanCandidateAttemptCheck = {
  candidate_id: string;
  variant_id: CandidateRun["variant_id"];
  manifest_path: string;
  workspace_path: string;
  plan_path: string;
  lean_file_path: string;
  plan_sha256: string | null;
  lean_file_sha256: string | null;
  service_owned_check_kind: "candidate_attempt_static_preflight";
  result: "ready_for_lean_runner" | "repair_required" | "blocked";
  has_sorry: boolean;
  manifest_binds_attempt_artifacts: boolean;
  plan_binds_candidate: boolean;
  statement_boundary_hash_matches: boolean;
  source_skeleton_path: string | null;
  source_skeleton_sha256: string | null;
  source_skeleton_hash_matches: boolean;
  blueprint_path: string | null;
  blueprint_sha256: string | null;
  blueprint_hash_matches: boolean;
  lean_run_manifest_path: null;
  blockers: string[];
  repair_actions: string[];
  proof_authority: "none";
  can_promote_claim: false;
  result_can_be_used_as_proof: false;
};

export type LeanCandidateAttemptCheckReport = {
  schema_version: "comath.pi_goal_mode_lean_candidate_attempt_check_report.v1";
  campaign_id: string;
  project_id: string;
  claim_id: string;
  obligation_id: string;
  locked_statement_hash: string;
  source_candidate_index_path: string;
  checked_candidate_count: number;
  all_attempt_plans_bound: boolean;
  all_source_skeleton_hashes_match: boolean;
  all_blueprint_hashes_match: boolean;
  candidates_ready_for_lean_runner: number;
  candidates_requiring_repair: number;
  candidates_blocked: number;
  lean_runner_invocations: 0;
  lean_run_manifest_paths: string[];
  per_candidate_checks: LeanCandidateAttemptCheck[];
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
  result_can_be_used_as_proof: false;
  created_at: string;
};

function normalizedRel(path: string): string {
  return path.replace(/\\/g, "/");
}

function sha256Bytes(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function readText(projectRoot: string, relativePath: string): string | undefined {
  try {
    return readFileSync(assertPathAllowed(projectRoot, relativePath, { purpose: "read", resolveRealpath: true }), "utf8");
  } catch {
    return undefined;
  }
}

function readJson(projectRoot: string, relativePath: string): unknown | undefined {
  const text = readText(projectRoot, relativePath);
  if (text === undefined) {
    return undefined;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function fileSha256(projectRoot: string, relativePath: string): string | null {
  try {
    const path = assertPathAllowed(projectRoot, relativePath, { purpose: "read", resolveRealpath: true });
    statSync(path);
    return sha256Bytes(readFileSync(path));
  } catch {
    return null;
  }
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function stringField(value: unknown, key: string): string | undefined {
  const object = record(value);
  const field = object?.[key];
  return typeof field === "string" && field.trim().length > 0 ? field.trim() : undefined;
}

function hasArtifact(manifest: CandidateManifest | undefined, path: string, kind: string): boolean {
  return manifest?.artifacts.some((artifact) => artifact.path === path && artifact.kind === kind) ?? false;
}

function readManifest(projectRoot: string, candidate: CandidateRun): CandidateManifest | undefined {
  if (!candidate.manifest_path) {
    return undefined;
  }
  try {
    return candidateManifestSchema.parse(readJson(projectRoot, candidate.manifest_path));
  } catch {
    return undefined;
  }
}

function pathExists(projectRoot: string, relativePath: string): boolean {
  try {
    return existsSync(assertPathAllowed(projectRoot, relativePath, { purpose: "read", resolveRealpath: true }));
  } catch {
    return false;
  }
}

function hasSorry(text: string | undefined): boolean {
  return text !== undefined && /(?:^|[^A-Za-z0-9_'])sorry(?:[^A-Za-z0-9_']|$)/u.test(text);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function checkCandidateAttempt(input: {
  projectRoot: string;
  obligation: ProofObligation;
  candidate: CandidateRun;
}): LeanCandidateAttemptCheck {
  const planPath = normalizedRel(join(input.candidate.workspace_path, "lean_candidate_attempt_plan.json"));
  const leanFilePath = normalizedRel(join(input.candidate.workspace_path, "LeanCandidate.lean"));
  const manifest = readManifest(input.projectRoot, input.candidate);
  const plan = record(readJson(input.projectRoot, planPath));
  const leanText = readText(input.projectRoot, leanFilePath);
  const sourceSkeleton = record(plan?.source_skeleton);
  const blueprint = record(plan?.goal_mode_skeleton_blueprint);
  const statementBoundary = record(plan?.statement_boundary);
  const sourceSkeletonPath = stringField(sourceSkeleton, "path") ?? null;
  const sourceSkeletonSha256 = stringField(sourceSkeleton, "sha256") ?? null;
  const blueprintPath = stringField(blueprint, "path") ?? null;
  const blueprintSha256 = stringField(blueprint, "sha256") ?? null;
  const planSha256 = fileSha256(input.projectRoot, planPath);
  const leanFileSha256 = fileSha256(input.projectRoot, leanFilePath);
  const sourceSkeletonActualSha256 = sourceSkeletonPath ? fileSha256(input.projectRoot, sourceSkeletonPath) : null;
  const blueprintActualSha256 = blueprintPath ? fileSha256(input.projectRoot, blueprintPath) : null;

  const manifestBindsAttemptArtifacts =
    hasArtifact(manifest, "lean_candidate_attempt_plan.json", "lean_candidate_attempt_plan") &&
    hasArtifact(manifest, "LeanCandidate.lean", "lean_candidate_attempt_draft") &&
    (manifest?.lean_files.includes(leanFilePath) ?? false);
  const planBindsCandidate =
    plan?.schema_version === "comath.pi_goal_mode_lean_candidate_attempt_plan.v1" &&
    plan?.campaign_id === input.candidate.campaign_id &&
    plan?.obligation_id === input.candidate.obligation_id &&
    plan?.candidate_id === input.candidate.candidate_id &&
    plan?.variant_id === input.candidate.variant_id &&
    plan?.locked_statement_hash === input.obligation.statement_hash;
  const statementBoundaryHashMatches =
    input.candidate.locked_statement_hash === input.obligation.statement_hash &&
    input.candidate.candidate_statement_hash === input.obligation.statement_hash &&
    statementBoundary?.statement_hash === input.obligation.statement_hash;
  const sourceSkeletonHashMatches =
    sourceSkeletonPath !== null &&
    sourceSkeletonSha256 !== null &&
    sourceSkeletonActualSha256 !== null &&
    sourceSkeletonSha256 === sourceSkeletonActualSha256;
  const blueprintHashMatches =
    blueprintPath !== null &&
    blueprintSha256 !== null &&
    blueprintActualSha256 !== null &&
    blueprintSha256 === blueprintActualSha256;
  const sorryPresent = hasSorry(leanText);

  const blockers = unique([
    ...(manifest ? [] : ["candidate_manifest_unreadable"]),
    ...(pathExists(input.projectRoot, planPath) ? [] : ["lean_candidate_attempt_plan_missing"]),
    ...(pathExists(input.projectRoot, leanFilePath) ? [] : ["lean_candidate_attempt_file_missing"]),
    ...(manifestBindsAttemptArtifacts ? [] : ["candidate_manifest_does_not_bind_attempt_artifacts"]),
    ...(planBindsCandidate ? [] : ["lean_candidate_attempt_plan_candidate_binding_invalid"]),
    ...(statementBoundaryHashMatches ? [] : ["lean_candidate_attempt_statement_boundary_mismatch"]),
    ...(sourceSkeletonHashMatches ? [] : ["lean_candidate_attempt_source_skeleton_hash_mismatch"]),
    ...(blueprintHashMatches ? [] : ["lean_candidate_attempt_blueprint_hash_mismatch"])
  ]);
  const repairActions = unique([
    ...(sorryPresent ? ["replace_sorry_with_kernel_checked_proof_term"] : []),
    ...(!sourceSkeletonHashMatches || !blueprintHashMatches ? ["regenerate_attempt_from_current_blueprint_and_skeleton"] : []),
    ...(!statementBoundaryHashMatches ? ["restore_formal_spec_lock_statement_boundary"] : []),
    ...(blockers.length > 0 ? ["regenerate_candidate_attempt_artifacts"] : []),
    ...(blockers.length === 0 && !sorryPresent ? ["run_service_owned_lean_runner"] : [])
  ]);
  const result = blockers.length > 0 ? "blocked" : sorryPresent ? "repair_required" : "ready_for_lean_runner";

  return {
    candidate_id: input.candidate.candidate_id,
    variant_id: input.candidate.variant_id,
    manifest_path: input.candidate.manifest_path ?? "",
    workspace_path: input.candidate.workspace_path,
    plan_path: planPath,
    lean_file_path: leanFilePath,
    plan_sha256: planSha256,
    lean_file_sha256: leanFileSha256,
    service_owned_check_kind: "candidate_attempt_static_preflight",
    result,
    has_sorry: sorryPresent,
    manifest_binds_attempt_artifacts: manifestBindsAttemptArtifacts,
    plan_binds_candidate: planBindsCandidate,
    statement_boundary_hash_matches: statementBoundaryHashMatches,
    source_skeleton_path: sourceSkeletonPath,
    source_skeleton_sha256: sourceSkeletonSha256,
    source_skeleton_hash_matches: sourceSkeletonHashMatches,
    blueprint_path: blueprintPath,
    blueprint_sha256: blueprintSha256,
    blueprint_hash_matches: blueprintHashMatches,
    lean_run_manifest_path: null,
    blockers,
    repair_actions: repairActions,
    proof_authority: "none",
    can_promote_claim: false,
    result_can_be_used_as_proof: false
  };
}

export function createLeanCandidateAttemptCheckReport(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  obligation: ProofObligation;
  candidates: CandidateRun[];
  sourceCandidateIndexPath: string;
}): LeanCandidateAttemptCheckReport {
  const checks = input.candidates.map((candidate) =>
    checkCandidateAttempt({ projectRoot: input.projectRoot, obligation: input.obligation, candidate })
  );
  return {
    schema_version: "comath.pi_goal_mode_lean_candidate_attempt_check_report.v1",
    campaign_id: input.campaign.campaign_id,
    project_id: input.campaign.project_id,
    claim_id: input.campaign.root_claim_id,
    obligation_id: input.obligation.obligation_id,
    locked_statement_hash: input.obligation.statement_hash,
    source_candidate_index_path: input.sourceCandidateIndexPath,
    checked_candidate_count: checks.length,
    all_attempt_plans_bound: checks.every(
      (check) =>
        check.manifest_binds_attempt_artifacts &&
        check.plan_binds_candidate &&
        check.statement_boundary_hash_matches &&
        check.plan_sha256 !== null &&
        check.lean_file_sha256 !== null
    ),
    all_source_skeleton_hashes_match: checks.every((check) => check.source_skeleton_hash_matches),
    all_blueprint_hashes_match: checks.every((check) => check.blueprint_hash_matches),
    candidates_ready_for_lean_runner: checks.filter((check) => check.result === "ready_for_lean_runner").length,
    candidates_requiring_repair: checks.filter((check) => check.result === "repair_required").length,
    candidates_blocked: checks.filter((check) => check.result === "blocked").length,
    lean_runner_invocations: 0,
    lean_run_manifest_paths: [],
    per_candidate_checks: checks,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    result_can_be_used_as_proof: false,
    created_at: new Date().toISOString()
  };
}
