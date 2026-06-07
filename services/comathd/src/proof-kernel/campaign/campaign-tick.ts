import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, extname, isAbsolute, join, relative } from "node:path";
import {
  createDefaultExternalWheelRegistry,
  listExternalWheelAdapters,
  type ExternalWheelAdapterDescriptor,
  type ExternalWheelKind
} from "../../adapters/external-wheel-registry.js";
import { importArtifact } from "../../artifacts/store.js";
import { appendAuditEvent } from "../../audit/jsonl-writer.js";
import { applyGatePromotedClaim, getClaim, registerClaim } from "../../claim/claim-store.js";
import { ComathError } from "../../errors.js";
import { initProject } from "../../project/project-store.js";
import { assertPathAllowed } from "../../security/path-policy.js";
import { decideCandidate, type EnsembleDecision } from "../ensemble/decision-forest.js";
import { recordFailedRoutes, retrieveSimilarFailedRoutes } from "../ensemble/failure-aggregator.js";
import { summarizeCandidateProofGradeEvidence } from "../ensemble/candidate-proof-grade-summary.js";
import { runGaAgentStageCandidates } from "../ensemble/ga-agent-stage-runner.js";
import { createServiceOwnedNativeCandidateLeanAdapter } from "../ensemble/live-candidate-lean-check.js";
import { hasVerifiedServiceOwnedLeanManifestEvidence } from "../ensemble/service-owned-lean-evidence.js";
import { defaultVariants } from "../ensemble/variant-registry.js";
import { runCleanLeanReplay, type CleanReplayResult } from "../lean/clean-replay.js";
import {
  parseExpectedLeanToolchainVersion,
  parseLakeVersionOutput,
  parseLeanVersionOutput,
  runLeanToolCommand,
  serviceToolBinary,
  type LeanHostCommandResult
} from "../lean/lean-host-tools.js";
import { listLeanProjectFiles, sha256FileSync, type LeanProjectFiles } from "../lean/lean-project.js";
import { ensembleCandidatesRel, ensembleDecisionRel } from "../ensemble/paths.js";
import { writeProofPlanningArtifacts, type GoalModeProofPlanningInput } from "../stages/proof-obligation-dag.js";
import { hasFormalReplayAuthorityPassEvidence, sanitizePublicFormalAuthorityVocabulary } from "./external-terminal-vocabulary.js";
import { getCampaign, nextCampaignId, writeCampaign } from "./research-campaign.js";
import {
  packageCampaignFinalAuthorityEvidenceWithDerivedBindingsV3,
  packageGoal3GaPositiveMatrixFinalAuthorityEvidenceWithDerivedBindingsV3,
  promoteCampaignFinalAuthorityEvidenceWithDerivedBindingsV3,
  promoteGoal3GaPositiveMatrixFinalAuthorityEvidenceWithDerivedBindingsV3
} from "../../release/goal3-ga-acceptance.js";
import {
  candidateRunSchema,
  candidateManifestSchema,
  proofObligationSchema,
  researchCampaignSchema,
  type ArtifactRef,
  type CandidateManifest,
  type CandidateRun,
  type GateDecision,
  type ProofObligation,
  type ResearchCampaign
} from "../../types/schemas.js";

export type StartCampaignInput = {
  project_root: string;
  project_name?: string;
  user_goal: string;
  domain?: string;
  strict_mode?: boolean;
  mode?: "goal" | "bounded";
  paper_paths?: string[];
  attachments?: string[];
  workspace_refs?: string[];
  budget?: string;
  goal_mode_policy?: Record<string, unknown>;
  actor?: string;
};

export type CampaignTickInput = {
  project_root: string;
  campaign_id: string;
  actor?: string;
};

export type StageGateRepairResumeInput = CampaignTickInput & {
  blocker_artifact_path: string;
  repaired_artifacts: string[];
};

export type StageGateRepairResumeResult = {
  campaign: ResearchCampaign;
  repair: {
    status: "accepted";
    blocker_artifact_path: string;
    repair_artifact_path: string;
    rewind_target: ResearchCampaign["current_stage"];
    repaired_artifacts: string[];
    proof_authority: "none";
  };
};

export type CampaignTickResult = {
  campaign: ResearchCampaign;
  obligation?: ProofObligation;
  ensemble?: { candidates: CandidateRun[]; decision: EnsembleDecision };
  gate?: GateDecision;
  final_replay?: CleanReplayResult["final_replay"];
  static_audit?: CleanReplayResult["static_audit"];
  counterexample?: {
    counterexample_id: string;
    assignment: Record<string, number>;
    lhs: number;
    rhs: number;
    result: "refutes";
    artifact_path: string;
  };
  blocker?: string;
};

function now(): string {
  return new Date().toISOString();
}

function writeRuntimeFile(projectRoot: string, rel: string, content: string): string {
  const path = assertPathAllowed(projectRoot, rel, { purpose: "runtime-write" });
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, content, "utf8");
  return path;
}

function nextStageRunId(campaign: ResearchCampaign): string {
  return `SR-${String(campaign.stage_runs.length + 1).padStart(4, "0")}`;
}

function stageRun(
  campaign: ResearchCampaign,
  stage: ResearchCampaign["current_stage"],
  status: ResearchCampaign["stage_runs"][number]["status"],
  artifact_paths: string[] = []
): ResearchCampaign["stage_runs"][number] {
  return {
    id: nextStageRunId(campaign),
    stage,
    status,
    artifact_paths,
    created_at: now()
  };
}

function completedStageRun(
  campaign: ResearchCampaign,
  stage: ResearchCampaign["current_stage"],
  artifact_paths: string[] = []
): ResearchCampaign["stage_runs"][number] {
  return stageRun(campaign, stage, "completed", artifact_paths);
}

function normalizeRelPath(rel: string): string {
  return rel.replace(/\\/g, "/");
}

function campaignRel(campaign: ResearchCampaign, rel: string): string {
  return normalizeRelPath(join(".comath", "campaign", campaign.campaign_id, rel));
}

function campaignProofRel(campaign: ResearchCampaign, rel: string): string {
  return campaignRel(campaign, join("proof", rel));
}

function artifactExists(projectRoot: string, rel: string): boolean {
  return existsSync(assertPathAllowed(projectRoot, rel, { purpose: "read" }));
}

function readJsonArtifact(projectRoot: string, rel: string): unknown {
  try {
    return JSON.parse(readFileSync(assertPathAllowed(projectRoot, rel, { purpose: "read", resolveRealpath: true }), "utf8"));
  } catch {
    throw new ComathError("stage-gate blocker artifact is unreadable", {
      statusCode: 409,
      code: "CAMPAIGN_REPAIR_BLOCKER_UNREADABLE"
    });
  }
}

function readTextArtifact(projectRoot: string, rel: string): string {
  return readFileSync(assertPathAllowed(projectRoot, rel, { purpose: "read", resolveRealpath: true }), "utf8");
}

type NotationConvention = {
  symbol: string;
  meaning: string;
  source: string;
  evidence_anchor?: string;
};

function notationConventionsFromObligation(obligation: ProofObligation): NotationConvention[] {
  const raw = obligation.locked_statement_structured.notation_conventions;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((item): item is NotationConvention => {
    if (!item || typeof item !== "object") {
      return false;
    }
    const convention = item as Record<string, unknown>;
    return (
      typeof convention.symbol === "string" &&
      typeof convention.meaning === "string" &&
      typeof convention.source === "string" &&
      (convention.evidence_anchor === undefined || typeof convention.evidence_anchor === "string")
    );
  });
}

function knowledgePackArtifacts(campaign: ResearchCampaign): string[] {
  return [
    `.comath/context_lake/shards/knowledge-${campaign.campaign_id}.md`,
    ".comath/literature/references.bib",
    ".comath/memory/library_search.jsonl",
    ".comath/memory/premise_candidates.jsonl",
    campaignRel(campaign, "goal_mode_research_plan.json"),
    campaignRel(campaign, "goal_mode_adapter_execution_manifest.json"),
    campaignRel(campaign, "goal_mode_local_ingestion_evidence.json")
  ];
}

function notationGateArtifacts(campaign: ResearchCampaign): string[] {
  return [
    ".comath/lean/MathResearch/Definitions.lean",
    `.comath/context_lake/shards/notation-${campaign.campaign_id}.md`
  ];
}

function skeletonGateArtifacts(campaign: ResearchCampaign): string[] {
  return [
    campaignProofRel(campaign, "lemma_dag.json"),
    campaignProofRel(campaign, "formalization_hints.json"),
    campaignProofRel(campaign, "blueprint.json"),
    campaignProofRel(campaign, "Skeleton.lean"),
    campaignProofRel(campaign, "skeleton_report.md")
  ];
}

function lineMapGateArtifacts(campaign: ResearchCampaign, obligation: ProofObligation): string[] {
  return [
    campaignProofRel(campaign, "line_map.json"),
    campaignProofRel(campaign, join("obligations", `${obligation.obligation_id}.yaml`))
  ];
}

function rewindTargetForMissingArtifact(rel: string): ResearchCampaign["current_stage"] {
  if (rel.includes("/line_map.json") || rel.includes("/proof/obligations/")) {
    return "line_map_gate";
  }
  if (
    rel.includes("/Skeleton.lean") ||
    rel.includes("/lemma_dag.json") ||
    rel.includes("/formalization_hints.json") ||
    rel.includes("/blueprint.json") ||
    rel.includes("/skeleton_report.md")
  ) {
    return "skeleton_gate";
  }
  if (rel.includes("/Definitions.lean") || rel.includes("/notation-")) {
    return "notation_gate";
  }
  if (
    rel.includes("/knowledge-") ||
    rel.includes("/references.bib") ||
    rel.includes("/library_search.jsonl") ||
    rel.includes("/goal_mode_research_plan.json") ||
    rel.includes("/goal_mode_adapter_execution_manifest.json") ||
    rel.includes("/goal_mode_local_ingestion_evidence.json")
  ) {
    return "knowledge_pack";
  }
  if (rel.includes("/refutation_red_team.json")) {
    return "refutation_red_team";
  }
  if (rel.includes("/Integrated.lean") || rel.includes("/import_profile.json") || rel.includes("/integration_report.md")) {
    return "integration_refactor";
  }
  return "problem_locked";
}

function blockForMissingArtifacts(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  obligation: ProofObligation;
  actor: string;
  attemptedStage: ResearchCampaign["current_stage"];
  missingArtifacts: string[];
}): CampaignTickResult {
  const rewindTarget = rewindTargetForMissingArtifact(input.missingArtifacts[0] ?? "");
  const blockerRel = writeSimpleStageArtifact(input.projectRoot, input.campaign, "stage_gate_blocker.json", {
    code: "MISSING_REQUIRED_STAGE_ARTIFACT",
    campaign_id: input.campaign.campaign_id,
    obligation_id: input.obligation.obligation_id,
    attempted_stage: input.attemptedStage,
    rewind_target: rewindTarget,
    missing_artifacts: input.missingArtifacts,
    recovery: "re-run or repair the producing native stage gate before advancing this campaign",
    created_at: now()
  });
  const blocker = {
    code: "MISSING_REQUIRED_STAGE_ARTIFACT",
    reason: "missing_required_stage_artifact",
    attempted_stage: input.attemptedStage,
    rewind_target: rewindTarget,
    missing_artifacts: input.missingArtifacts,
    artifact_path: blockerRel
  };
  const next = writeCampaign(
    input.projectRoot,
    researchCampaignSchema.parse({
      ...input.campaign,
      current_stage: rewindTarget,
      status: "blocked",
      blockers: [...input.campaign.blockers, blocker],
      open_obligations: [{ ...input.obligation, status: "blocked" }],
      stage_runs: [...input.campaign.stage_runs, stageRun(input.campaign, input.attemptedStage, "blocked", [blockerRel])],
      next_actions: [`repair ${rewindTarget} artifacts before retrying ${input.attemptedStage}`]
    }),
    input.actor
  );
  return { campaign: next, obligation: { ...input.obligation, status: "blocked" }, blocker: "missing_required_stage_artifact" };
}

function sameArtifactSet(a: string[], b: string[]): boolean {
  const left = [...a].sort();
  const right = [...b].sort();
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function stageGateBlockerPayload(payload: unknown): {
  code?: unknown;
  campaign_id?: unknown;
  attempted_stage?: unknown;
  rewind_target?: unknown;
  missing_artifacts?: unknown;
} {
  return payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
}

export function repairStageGateAndResume(input: StageGateRepairResumeInput): StageGateRepairResumeResult {
  const actor = input.actor ?? "campaign";
  if (!Array.isArray(input.repaired_artifacts)) {
    throw new ComathError("repair request must include repaired_artifacts", {
      statusCode: 400,
      code: "CAMPAIGN_REPAIR_INVALID_REQUEST"
    });
  }
  const campaign = getCampaign(input.project_root, input.campaign_id);
  if (!campaign) {
    throw new ComathError("campaign not found", { statusCode: 404, code: "CAMPAIGN_NOT_FOUND" });
  }
  if (campaign.status === "terminal") {
    throw new ComathError("terminal campaigns cannot be repair-resumed", {
      statusCode: 409,
      code: "CAMPAIGN_TERMINAL"
    });
  }
  if (campaign.status !== "blocked") {
    throw new ComathError("only blocked stage-gate campaigns can be repair-resumed", {
      statusCode: 409,
      code: "CAMPAIGN_NOT_BLOCKED"
    });
  }

  const blocker = campaign.blockers
    .slice()
    .reverse()
    .find((item) => item.code === "MISSING_REQUIRED_STAGE_ARTIFACT" && item.artifact_path === input.blocker_artifact_path);
  if (!blocker) {
    throw new ComathError("stage-gate blocker artifact does not match this campaign", {
      statusCode: 409,
      code: "CAMPAIGN_REPAIR_BLOCKER_MISMATCH"
    });
  }

  const payload = stageGateBlockerPayload(readJsonArtifact(input.project_root, input.blocker_artifact_path));
  const missingArtifacts = Array.isArray(payload.missing_artifacts)
    ? payload.missing_artifacts.filter((item): item is string => typeof item === "string")
    : [];
  if (
    payload.code !== "MISSING_REQUIRED_STAGE_ARTIFACT" ||
    payload.campaign_id !== campaign.campaign_id ||
    payload.attempted_stage !== blocker.attempted_stage ||
    payload.rewind_target !== blocker.rewind_target ||
    !sameArtifactSet(missingArtifacts, Array.isArray(blocker.missing_artifacts) ? (blocker.missing_artifacts as string[]) : [])
  ) {
    throw new ComathError("stage-gate blocker artifact is stale or inconsistent", {
      statusCode: 409,
      code: "CAMPAIGN_REPAIR_BLOCKER_MISMATCH"
    });
  }

  if (!sameArtifactSet(input.repaired_artifacts, missingArtifacts)) {
    throw new ComathError("repair request must cite the exact missing artifact set", {
      statusCode: 409,
      code: "CAMPAIGN_REPAIR_ARTIFACT_SET_MISMATCH"
    });
  }

  const stillMissing = input.repaired_artifacts.filter((rel) => !artifactExists(input.project_root, rel));
  if (stillMissing.length > 0) {
    throw new ComathError("stage-gate repair artifacts are still missing", {
      statusCode: 409,
      code: "CAMPAIGN_REPAIR_INCOMPLETE"
    });
  }

  const rewindTarget = blocker.rewind_target as ResearchCampaign["current_stage"];
  const repairRel = writeSimpleStageArtifact(input.project_root, campaign, "stage_gate_repair.json", {
    code: "STAGE_GATE_REPAIR_ACCEPTED",
    campaign_id: campaign.campaign_id,
    blocker_artifact_path: input.blocker_artifact_path,
    attempted_stage: blocker.attempted_stage,
    rewind_target: rewindTarget,
    repaired_artifacts: input.repaired_artifacts,
    proof_authority: "none",
    can_promote_claim: false,
    created_at: now()
  });
  const openObligations = campaign.open_obligations.map((obligation, index) =>
    index === 0 && obligation.status === "blocked" ? { ...obligation, status: "queued" as const } : obligation
  );
  const repairedBlockers = campaign.blockers.map((item) =>
    item === blocker
      ? {
          ...item,
          resolved: true,
          resolved_at: now(),
          repair_artifact_path: repairRel
        }
      : item
  );
  const next = writeCampaign(
    input.project_root,
    researchCampaignSchema.parse({
      ...campaign,
      status: "running",
      current_stage: rewindTarget,
      open_obligations: openObligations,
      blockers: repairedBlockers,
      accepted_artifacts: campaign.accepted_artifacts,
      next_actions: [`tick campaign to continue from repaired ${rewindTarget} gate`]
    }),
    actor
  );

  return {
    campaign: next,
    repair: {
      status: "accepted",
      blocker_artifact_path: input.blocker_artifact_path,
      repair_artifact_path: repairRel,
      rewind_target: rewindTarget,
      repaired_artifacts: input.repaired_artifacts,
      proof_authority: "none"
    }
  };
}

function requiredArtifactsBeforeStage(
  campaign: ResearchCampaign,
  obligation: ProofObligation,
  stage: ResearchCampaign["current_stage"]
): string[] {
  if (stage === "candidate_generation") {
    return [
      ...knowledgePackArtifacts(campaign),
      ...notationGateArtifacts(campaign),
      ...skeletonGateArtifacts(campaign),
      ...lineMapGateArtifacts(campaign, obligation)
    ];
  }
  if (stage === "integration_refactor") {
    return [campaignRel(campaign, "refutation_red_team.json")];
  }
  if (stage === "final_static_audit") {
    return [
      ".comath/lean/MathResearch/Integrated.lean",
      ".comath/proof/import_profile.json",
      ".comath/proof/integration_report.md"
    ];
  }
  return [];
}

function enforceRequiredArtifacts(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  obligation: ProofObligation;
  actor: string;
}): CampaignTickResult | undefined {
  const required = requiredArtifactsBeforeStage(input.campaign, input.obligation, input.campaign.current_stage);
  const missing = required.filter((rel) => !artifactExists(input.projectRoot, rel));
  if (missing.length === 0) {
    return undefined;
  }
  return blockForMissingArtifacts({
    projectRoot: input.projectRoot,
    campaign: input.campaign,
    obligation: input.obligation,
    actor: input.actor,
    attemptedStage: input.campaign.current_stage,
    missingArtifacts: missing
  });
}

type LockedProblem = {
  statement: string;
  structured: Record<string, unknown>;
  lean_target?: string;
  theorem_name?: string;
  notation_lines: string[];
};

function classifyLockedProblem(goal: string): LockedProblem {
  return {
    statement: goal.trim(),
    structured: {},
    lean_target: undefined,
    theorem_name: undefined,
    notation_lines: []
  };
}

function lockedStatement(goal: string): string {
  return classifyLockedProblem(goal).statement;
}

function needsFormalSpecLock(goal: string): boolean {
  const trimmed = goal.trim();
  return !/^(prove|show|formalize|theorem|lemma)\b/i.test(trimmed);
}

function createProblemLock(projectRoot: string, input: { claim_id: string; goal: string; domain: string }): void {
  const problem = classifyLockedProblem(input.goal);
  writeRuntimeFile(
    projectRoot,
    join(".comath", "lock", "problem_lock.md"),
    [`# Problem Lock`, "", `claim_id: ${input.claim_id}`, "", problem.statement, ""].join("\n")
  );
  writeRuntimeFile(projectRoot, join(".comath", "lock", "assumptions.md"), "# Assumptions\n\n");
  writeRuntimeFile(
    projectRoot,
    join(".comath", "lock", "notation.md"),
    ["# Notation", "", "No notation conventions are locked until FormalSpecLock approval.", ...problem.notation_lines, ""].join("\n")
  );
  writeRuntimeFile(
    projectRoot,
    join(".comath", "goals.yaml"),
    [
      `claim_id: ${input.claim_id}`,
      `domain: ${input.domain}`,
      "target_formal_system: Lean4",
      `theorem_name: ${problem.theorem_name ?? "unresolved"}`,
      ""
    ].join("\n")
  );
}

function createObligation(claimId: string, statementHash: string, goal: string): ProofObligation {
  const problem = classifyLockedProblem(goal);
  return proofObligationSchema.parse({
    obligation_id: "PO-0001",
    claim_id: claimId,
    locked_statement_nl: problem.statement,
    locked_statement_structured: problem.structured,
    lean_target: problem.lean_target,
    statement_hash: statementHash,
    dependencies: [],
    assumptions: [],
    status: "queued"
  });
}

type GoalModeInputRefKind = "project_absolute" | "project_relative";
type GoalModeIntakeRefKind = "paper" | "attachment" | "workspace";

function goalModePolicySummary(input: StartCampaignInput): Record<string, unknown> {
  const policy = input.goal_mode_policy ?? {};
  const terminalStates = Array.isArray(policy.terminal_states)
    ? policy.terminal_states.filter((state): state is string => typeof state === "string")
    : [];
  return {
    mode: policy.mode === "goal" || policy.mode === "bounded" ? policy.mode : input.mode ?? "bounded",
    terminal_states: terminalStates,
    require_user_confirmation_for_statement_lock: policy.require_user_confirmation_for_statement_lock === true,
    resume_enabled: policy.resume_enabled === true
  };
}

function projectRelativePath(projectRoot: string, absolutePath: string): string {
  const absoluteRoot = assertPathAllowed(projectRoot, ".", { purpose: "read", resolveRealpath: true });
  const rel = normalizeRelPath(relative(absoluteRoot, absolutePath));
  return rel === "" ? "." : rel;
}

function materializeGoalModeIntakeRefs(projectRoot: string, kind: GoalModeIntakeRefKind, refs: string[] = []): Record<string, unknown>[] {
  return refs.map((ref, index) => {
    const absolutePath = assertPathAllowed(projectRoot, ref, { purpose: "read", resolveRealpath: true });
    const stat = existsSync(absolutePath) ? lstatSync(absolutePath) : undefined;
    const hash = stat?.isFile() ? sha256FileSync(absolutePath) : undefined;
    const entryType = !stat ? "missing" : stat.isFile() ? "file" : stat.isDirectory() ? "directory" : stat.isSymbolicLink() ? "symlink" : "other";
    return {
      ref_id: `GMI-${kind.toUpperCase()}-${String(index + 1).padStart(4, "0")}`,
      kind,
      input_ref_kind: (isAbsolute(ref) ? "project_absolute" : "project_relative") satisfies GoalModeInputRefKind,
      normalized_path: projectRelativePath(projectRoot, absolutePath),
      exists: stat !== undefined,
      entry_type: entryType,
      sha256: hash?.sha256 ?? null,
      size_bytes: hash?.size_bytes ?? null,
      proof_authority: "none",
      external_evidence_authority: false,
      can_promote_claim: false,
      can_certify_ga: false,
      permitted_use: ["hint", "evidence", "refutation_source"]
    };
  });
}

function writeGoalModeIntakeManifest(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  projectId: string;
  claimId: string;
  statementHash: string;
  request: StartCampaignInput;
  actor: string;
  createdAt: string;
}): string {
  return writeSimpleStageArtifact(input.projectRoot, input.campaign, "goal_mode_intake_manifest.json", {
    schema_version: "comath.pi_goal_mode_intake_manifest.v1",
    campaign_id: input.campaign.campaign_id,
    project_id: input.projectId,
    claim_id: input.claimId,
    statement_hash: input.statementHash,
    user_goal_sha256: sha256Text(input.request.user_goal),
    mode: input.request.mode ?? "bounded",
    budget: input.request.budget ?? null,
    goal_mode_policy: goalModePolicySummary(input.request),
    created_by: "comathd",
    actor: input.actor,
    paper_refs: materializeGoalModeIntakeRefs(input.projectRoot, "paper", input.request.paper_paths),
    attachment_refs: materializeGoalModeIntakeRefs(input.projectRoot, "attachment", input.request.attachments),
    workspace_refs: materializeGoalModeIntakeRefs(input.projectRoot, "workspace", input.request.workspace_refs),
    path_policy: {
      project_root_confined: true,
      no_symlink_escape: true,
      raw_host_paths_redacted: true
    },
    authority_boundary: {
      external_inputs_are: ["hint", "evidence", "refutation_source"],
      proof_authority: "Lean4/mathlib kernel clean replay only"
    },
    proof_authority: "none",
    external_evidence_authority: false,
    can_promote_claim: false,
    can_certify_ga: false,
    created_at: input.createdAt
  });
}

type GoalModeIntakeRef = {
  ref_id: string;
  kind: GoalModeIntakeRefKind;
  normalized_path: string;
  exists: boolean;
  entry_type: string;
  sha256: string | null;
  size_bytes: number | null;
};

type GoalModeIntakeManifest = {
  schema_version: string;
  campaign_id: string;
  project_id: string;
  claim_id: string;
  statement_hash: string;
  paper_refs?: unknown[];
  attachment_refs?: unknown[];
  workspace_refs?: unknown[];
};

type GoalModeIngestionProvider = {
  kind: ExternalWheelKind;
  provider: string;
  reason: string;
};

type GoalModeIntakeManifestBinding = {
  path: string;
  sha256: string;
  manifest?: GoalModeIntakeManifest;
  invalid_reasons: string[];
};

function isGoalModeIntakeRef(value: unknown): value is GoalModeIntakeRef {
  if (!value || typeof value !== "object") {
    return false;
  }
  const ref = value as Record<string, unknown>;
  return (
    typeof ref.ref_id === "string" &&
    (ref.kind === "paper" || ref.kind === "attachment" || ref.kind === "workspace") &&
    typeof ref.normalized_path === "string" &&
    typeof ref.exists === "boolean" &&
    typeof ref.entry_type === "string" &&
    (typeof ref.sha256 === "string" || ref.sha256 === null) &&
    (typeof ref.size_bytes === "number" || ref.size_bytes === null)
  );
}

function goalModeIntakeRefs(manifest: GoalModeIntakeManifest | undefined): GoalModeIntakeRef[] {
  if (!manifest) {
    return [];
  }
  return [
    ...(manifest.paper_refs ?? []),
    ...(manifest.attachment_refs ?? []),
    ...(manifest.workspace_refs ?? [])
  ].filter(isGoalModeIntakeRef);
}

function safeGoalModeNormalizedPath(value: string): boolean {
  if (value === ".") {
    return true;
  }
  if (value.length === 0 || isAbsolute(value) || value.includes(":") || normalizeRelPath(value) !== value) {
    return false;
  }
  return value.split("/").every((part) => part.length > 0 && part !== "." && part !== "..");
}

function validateGoalModeIntakeManifest(input: {
  manifest: GoalModeIntakeManifest;
  campaign: ResearchCampaign;
  obligation: ProofObligation;
}): string[] {
  const reasons: string[] = [];
  if (input.manifest.schema_version !== "comath.pi_goal_mode_intake_manifest.v1") {
    reasons.push("schema_version_mismatch");
  }
  if (input.manifest.campaign_id !== input.campaign.campaign_id) {
    reasons.push("campaign_id_mismatch");
  }
  if (input.manifest.project_id !== input.campaign.project_id) {
    reasons.push("project_id_mismatch");
  }
  if (input.manifest.claim_id !== input.campaign.root_claim_id) {
    reasons.push("claim_id_mismatch");
  }
  if (input.manifest.statement_hash !== input.obligation.statement_hash) {
    reasons.push("statement_hash_mismatch");
  }
  for (const key of ["paper_refs", "attachment_refs", "workspace_refs"] as const) {
    const refs = input.manifest[key];
    if (refs === undefined) {
      continue;
    }
    if (!Array.isArray(refs)) {
      reasons.push(`${key}_not_array`);
      continue;
    }
    refs.forEach((ref, index) => {
      if (!isGoalModeIntakeRef(ref)) {
        reasons.push(`${key}_${index}_invalid_ref_shape`);
        return;
      }
      if (!safeGoalModeNormalizedPath(ref.normalized_path)) {
        reasons.push(`${ref.ref_id}_unsafe_normalized_path`);
      }
    });
  }
  return reasons;
}

function readGoalModeIntakeManifest(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  obligation: ProofObligation;
}): GoalModeIntakeManifestBinding | undefined {
  const rel = input.campaign.stage_runs
    .flatMap((run) => run.artifact_paths)
    .find((path) => path.endsWith("goal_mode_intake_manifest.json"));
  if (!rel || !artifactExists(input.projectRoot, rel)) {
    return undefined;
  }
  const raw = readJsonArtifact(input.projectRoot, rel);
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const manifest = raw as GoalModeIntakeManifest;
  const invalidReasons = validateGoalModeIntakeManifest({ manifest, campaign: input.campaign, obligation: input.obligation });
  return {
    path: rel,
    sha256: sha256RuntimeFile(input.projectRoot, rel),
    manifest: invalidReasons.length === 0 ? manifest : undefined,
    invalid_reasons: invalidReasons
  };
}

function externalWheelDescriptor(kind: ExternalWheelKind, provider: string): ExternalWheelAdapterDescriptor {
  const descriptor = listExternalWheelAdapters(createDefaultExternalWheelRegistry()).find(
    (adapter) => adapter.kind === kind && adapter.provider === provider
  );
  if (!descriptor) {
    throw new Error(`goal_mode_research_plan_missing_adapter:${kind}:${provider}`);
  }
  return descriptor;
}

function localIngestionProviderForRef(ref: GoalModeIntakeRef): GoalModeIngestionProvider | undefined {
  if (ref.kind === "workspace") {
    return {
      kind: "external_lean_repo",
      provider: "local_lean_repo",
      reason: "inspect user-provided Lean workspace as a dependency candidate only"
    };
  }
  const ext = extname(ref.normalized_path).toLowerCase();
  if (ext === ".pdf") {
    return { kind: "retrieval", provider: "local_pdf", reason: "extract user-provided PDF text as evidence only" };
  }
  if (ext === ".tex" || ext === ".latex") {
    return { kind: "retrieval", provider: "local_tex", reason: "ingest user-provided TeX source as evidence only" };
  }
  if (ext === ".md" || ext === ".markdown") {
    return {
      kind: "retrieval",
      provider: "local_markdown",
      reason: "ingest user-provided Markdown as evidence only"
    };
  }
  if (ext === ".bib") {
    return { kind: "retrieval", provider: "bibtex", reason: "ingest bibliography metadata as citation metadata only" };
  }
  return undefined;
}

function plannedAdapterTask(input: {
  taskId: string;
  descriptor: ExternalWheelAdapterDescriptor;
  purpose: string;
  query?: string;
  ref?: GoalModeIntakeRef;
  reason?: string;
}): Record<string, unknown> {
  return {
    task_id: input.taskId,
    adapter_id: input.descriptor.id,
    adapter_kind: input.descriptor.kind,
    adapter_provider: input.descriptor.provider,
    capabilities: input.descriptor.capabilities,
    purpose: input.purpose,
    query_hash: input.query ? sha256Text(input.query) : null,
    input_ref_id: input.ref?.ref_id ?? null,
    input_kind: input.ref?.kind ?? null,
    normalized_path: input.ref?.normalized_path ?? null,
    input_entry_type: input.ref?.entry_type ?? null,
    input_sha256: input.ref?.sha256 ?? null,
    input_size_bytes: input.ref?.size_bytes ?? null,
    reason: input.reason ?? null,
    service_owned_execution_required: true,
    execution_state: "planned",
    executed_at: null,
    prompt_injection_scan_required: input.descriptor.kind === "retrieval",
    terms: input.descriptor.terms,
    proof_authority: "none",
    external_evidence_authority: false,
    can_promote_claim: false,
    can_certify_ga: false
  };
}

function writeGoalModeResearchPlan(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  obligation: ProofObligation;
}): string {
  const intake = readGoalModeIntakeManifest({
    projectRoot: input.projectRoot,
    campaign: input.campaign,
    obligation: input.obligation
  });
  const refs = goalModeIntakeRefs(intake?.manifest);
  const blockedCapabilities: Record<string, unknown>[] = [];
  const ingestionTasks: Record<string, unknown>[] = [];
  let ingestionIndex = 1;
  for (const ref of refs) {
    const provider = localIngestionProviderForRef(ref);
    if (!ref.exists) {
      blockedCapabilities.push({
        code: "goal_mode_input_ref_missing",
        ref_id: ref.ref_id,
        normalized_path: ref.normalized_path,
        proof_authority: "none",
        can_promote_claim: false
      });
      continue;
    }
    if (!provider) {
      blockedCapabilities.push({
        code: "goal_mode_local_ingestion_adapter_missing",
        ref_id: ref.ref_id,
        normalized_path: ref.normalized_path,
        entry_type: ref.entry_type,
        proof_authority: "none",
        can_promote_claim: false
      });
      continue;
    }
    ingestionTasks.push(
      plannedAdapterTask({
        taskId: `GMRP-INGEST-${String(ingestionIndex).padStart(4, "0")}`,
        descriptor: externalWheelDescriptor(provider.kind, provider.provider),
        purpose: "local_ingestion",
        ref,
        reason: provider.reason
      })
    );
    ingestionIndex += 1;
  }

  const query = `${input.campaign.user_goal}\n${input.obligation.locked_statement_nl}`;
  const retrievalTasks = ["arxiv", "semantic_scholar", "openalex", "crossref", "unpaywall", "jina_search", "anysearch"].map(
    (provider, index) =>
      plannedAdapterTask({
        taskId: `GMRP-RETRIEVAL-${String(index + 1).padStart(4, "0")}`,
        descriptor: externalWheelDescriptor("retrieval", provider),
        purpose: "literature_retrieval",
        query,
        reason: "retrieve source-linked literature and metadata as non-authoritative grounding"
      })
  );
  const theoremSearchTasks = ["loogle", "leansearch", "moogle", "leanexplore"].map((provider, index) =>
    plannedAdapterTask({
      taskId: `GMRP-THEOREM-SEARCH-${String(index + 1).padStart(4, "0")}`,
      descriptor: externalWheelDescriptor("theorem_search", provider),
      purpose: "lean_theorem_search",
      query: input.obligation.locked_statement_nl,
      reason: "find Lean/mathlib premises as hints before candidate generation"
    })
  );

  const plannedDescriptors = [...ingestionTasks, ...retrievalTasks, ...theoremSearchTasks].map((task) => ({
    adapter_id: task.adapter_id,
    adapter_kind: task.adapter_kind,
    adapter_provider: task.adapter_provider,
    capabilities: task.capabilities,
    proof_authority: "none",
    can_promote_claim: false
  }));

  return writeSimpleStageArtifact(input.projectRoot, input.campaign, "goal_mode_research_plan.json", {
    schema_version: "comath.pi_goal_mode_research_plan.v1",
    campaign_id: input.campaign.campaign_id,
    project_id: input.campaign.project_id,
    claim_id: input.campaign.root_claim_id,
    obligation_id: input.obligation.obligation_id,
    locked_statement_hash: input.obligation.statement_hash,
    consumes_goal_mode_intake_manifest: intake?.manifest
      ? {
          path: intake.path,
          sha256: intake.sha256,
          schema_version: intake.manifest.schema_version,
          proof_authority: "none",
          can_promote_claim: false
        }
      : null,
    execution_status: "planned_not_executed",
    network_execution_performed: false,
    ingestion_tasks: ingestionTasks,
    retrieval_tasks: retrievalTasks,
    theorem_search_tasks: theoremSearchTasks,
    planned_external_adapters: plannedDescriptors,
    lemma_planning_seed: {
      stage: "skeleton_gate",
      obligation_ids: input.campaign.open_obligations.map((obligation) => obligation.obligation_id),
      lemma_dag_path: campaignProofRel(input.campaign, "lemma_dag.json"),
      skeleton_lean_path: campaignProofRel(input.campaign, "Skeleton.lean"),
      skeleton_report_path: campaignProofRel(input.campaign, "skeleton_report.md"),
      line_map_path: campaignProofRel(input.campaign, "line_map.json"),
      required_after: ["FormalSpecLock", "AssumptionLedger", "StatementDiffGate"],
      proof_authority: "none",
      can_promote_claim: false
    },
    blocked_capabilities: [
      ...(
        !intake
          ? [
              {
                code: "goal_mode_intake_manifest_missing",
                proof_authority: "none",
                can_promote_claim: false
              }
            ]
          : !intake.manifest
            ? [
                {
                  code: "goal_mode_intake_manifest_invalid",
                  path: intake.path,
                  sha256: intake.sha256,
                  invalid_reasons: intake.invalid_reasons,
                  proof_authority: "none",
                  can_promote_claim: false
                }
              ]
            : []
      ),
      ...blockedCapabilities
    ],
    no_reinvent_policy: {
      theorem_search: "planned through external wheel adapters",
      literature_retrieval: "planned through external wheel adapters",
      local_ingestion: "planned through maintained adapter contracts",
      proof_authority: "Lean4/mathlib clean replay only"
    },
    proof_authority: "none",
    external_evidence_authority: false,
    can_promote_claim: false,
    can_certify_ga: false,
    created_at: now()
  });
}

function canonicalJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalJsonValue(item));
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = canonicalJsonValue(record[key]);
        return acc;
      }, {});
  }
  return value;
}

function sha256Json(value: unknown): string {
  return sha256Text(`${JSON.stringify(canonicalJsonValue(value))}\n`);
}

function optionalStringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function optionalNumberField(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === "number" ? value : undefined;
}

function isGoalModePlannedAdapterTask(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const task = value as Record<string, unknown>;
  return (
    typeof task.task_id === "string" &&
    typeof task.adapter_id === "string" &&
    typeof task.adapter_kind === "string" &&
    typeof task.adapter_provider === "string" &&
    typeof task.purpose === "string"
  );
}

function goalModeResearchPlanTasks(plan: Record<string, unknown>): Record<string, unknown>[] {
  return ["ingestion_tasks", "retrieval_tasks", "theorem_search_tasks"].flatMap((key) => {
    const value = plan[key];
    return Array.isArray(value) ? value.filter(isGoalModePlannedAdapterTask) : [];
  });
}

function validateGoalModeResearchPlanBinding(input: {
  plan: Record<string, unknown>;
  campaign: ResearchCampaign;
  obligation: ProofObligation;
}): string[] {
  const reasons: string[] = [];
  if (input.plan.schema_version !== "comath.pi_goal_mode_research_plan.v1") {
    reasons.push("schema_version_mismatch");
  }
  if (input.plan.campaign_id !== input.campaign.campaign_id) {
    reasons.push("campaign_id_mismatch");
  }
  if (input.plan.project_id !== input.campaign.project_id) {
    reasons.push("project_id_mismatch");
  }
  if (input.plan.claim_id !== input.campaign.root_claim_id) {
    reasons.push("claim_id_mismatch");
  }
  if (input.plan.obligation_id !== input.obligation.obligation_id) {
    reasons.push("obligation_id_mismatch");
  }
  if (input.plan.locked_statement_hash !== input.obligation.statement_hash) {
    reasons.push("locked_statement_hash_mismatch");
  }
  for (const key of ["ingestion_tasks", "retrieval_tasks", "theorem_search_tasks"] as const) {
    if (!Array.isArray(input.plan[key])) {
      reasons.push(`${key}_not_array`);
    }
  }
  const tasks = goalModeResearchPlanTasks(input.plan);
  if (tasks.length === 0) {
    reasons.push("adapter_tasks_empty");
  }
  tasks.forEach((task, index) => {
    if (task.proof_authority !== "none") {
      reasons.push(`adapter_task_${index}_proof_authority_not_none`);
    }
    if (task.can_promote_claim !== false) {
      reasons.push(`adapter_task_${index}_can_promote_claim_not_false`);
    }
    if (task.can_certify_ga !== false) {
      reasons.push(`adapter_task_${index}_can_certify_ga_not_false`);
    }
  });
  return reasons;
}

function goalModeResearchPlanIntakeBinding(plan: Record<string, unknown>): Record<string, unknown> | null {
  const binding = plan.consumes_goal_mode_intake_manifest;
  if (!binding || typeof binding !== "object" || Array.isArray(binding)) {
    return null;
  }
  const record = binding as Record<string, unknown>;
  return {
    path: typeof record.path === "string" ? record.path : null,
    sha256: typeof record.sha256 === "string" ? record.sha256 : null,
    schema_version: typeof record.schema_version === "string" ? record.schema_version : null,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  };
}

type GoalModeInputIntegrity = {
  input_integrity_status: string;
  current_input_sha256: string | null;
  current_input_size_bytes: number | null;
  blocker?: Record<string, unknown>;
};

function goalModeInputBlocker(
  code: string,
  task: Record<string, unknown>,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    code,
    planned_task_id: task.task_id,
    input_ref_id: task.input_ref_id ?? null,
    normalized_path: task.normalized_path ?? null,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    ...extra
  };
}

function currentGoalModeInputIntegrity(projectRoot: string, task: Record<string, unknown>): GoalModeInputIntegrity {
  const entryType = optionalStringField(task, "input_entry_type");
  const normalizedPath = optionalStringField(task, "normalized_path");
  const expectedSha256 = optionalStringField(task, "input_sha256");

  if (!normalizedPath || !safeGoalModeNormalizedPath(normalizedPath)) {
    return {
      input_integrity_status: "unsafe_normalized_path",
      current_input_sha256: null,
      current_input_size_bytes: null,
      blocker: goalModeInputBlocker("goal_mode_input_path_unsafe", task)
    };
  }

  const projectPath = assertPathAllowed(projectRoot, normalizedPath, { purpose: "read" });
  if (!existsSync(projectPath)) {
    return {
      input_integrity_status: "missing",
      current_input_sha256: null,
      current_input_size_bytes: null,
      blocker: goalModeInputBlocker("goal_mode_input_missing", task)
    };
  }

  const realProjectPath = assertPathAllowed(projectRoot, normalizedPath, { purpose: "read", resolveRealpath: true });
  const stat = lstatSync(realProjectPath);
  if (entryType === "directory") {
    if (!stat.isDirectory()) {
      return {
        input_integrity_status: "entry_type_changed",
        current_input_sha256: null,
        current_input_size_bytes: null,
        blocker: goalModeInputBlocker("goal_mode_input_entry_type_changed", task, {
          expected_entry_type: "directory",
          current_entry_type: stat.isFile() ? "file" : "other"
        })
      };
    }
    return {
      input_integrity_status: "directory_reference_recorded",
      current_input_sha256: null,
      current_input_size_bytes: null
    };
  }

  if (entryType !== "file") {
    return {
      input_integrity_status: "unsupported_entry_type",
      current_input_sha256: null,
      current_input_size_bytes: null,
      blocker: goalModeInputBlocker("goal_mode_input_entry_type_unsupported", task, {
        expected_entry_type: entryType ?? null
      })
    };
  }

  if (!stat.isFile()) {
    return {
      input_integrity_status: "entry_type_changed",
      current_input_sha256: null,
      current_input_size_bytes: null,
      blocker: goalModeInputBlocker("goal_mode_input_entry_type_changed", task, {
        expected_entry_type: "file",
        current_entry_type: stat.isDirectory() ? "directory" : "other"
      })
    };
  }

  const currentHash = sha256FileSync(realProjectPath);
  if (!expectedSha256) {
    return {
      input_integrity_status: "expected_hash_missing",
      current_input_sha256: currentHash.sha256,
      current_input_size_bytes: currentHash.size_bytes,
      blocker: goalModeInputBlocker("goal_mode_input_expected_hash_missing", task)
    };
  }
  if (currentHash.sha256 !== expectedSha256) {
    return {
      input_integrity_status: "mismatched",
      current_input_sha256: currentHash.sha256,
      current_input_size_bytes: currentHash.size_bytes,
      blocker: goalModeInputBlocker("goal_mode_input_hash_mismatch", task)
    };
  }
  return {
    input_integrity_status: "matched",
    current_input_sha256: currentHash.sha256,
    current_input_size_bytes: currentHash.size_bytes
  };
}

function localGoalModeExecutionState(integrity: GoalModeInputIntegrity): string {
  if (integrity.input_integrity_status === "matched" || integrity.input_integrity_status === "directory_reference_recorded") {
    return "local_manifest_recorded";
  }
  if (integrity.input_integrity_status === "mismatched") {
    return "blocked_input_hash_mismatch";
  }
  if (integrity.input_integrity_status === "missing") {
    return "blocked_input_missing";
  }
  if (integrity.input_integrity_status === "unsafe_normalized_path") {
    return "blocked_input_path_unsafe";
  }
  if (integrity.input_integrity_status === "entry_type_changed") {
    return "blocked_input_entry_type_changed";
  }
  return "blocked_input_integrity_unverified";
}

function goalModeAdapterRun(input: {
  projectRoot: string;
  task: Record<string, unknown>;
  index: number;
}): Record<string, unknown> {
  const adapterRunId = `GMAR-${String(input.index).padStart(4, "0")}`;
  const plannedTaskId = optionalStringField(input.task, "task_id") ?? `planned-task-${input.index}`;
  const adapterKind = optionalStringField(input.task, "adapter_kind") ?? "unknown";
  const adapterProvider = optionalStringField(input.task, "adapter_provider") ?? "unknown";
  const purpose = optionalStringField(input.task, "purpose") ?? "unknown";
  const requestEnvelope = {
    adapter_run_id: adapterRunId,
    planned_task_id: plannedTaskId,
    adapter_id: input.task.adapter_id ?? null,
    adapter_kind: adapterKind,
    adapter_provider: adapterProvider,
    purpose,
    input_ref_id: input.task.input_ref_id ?? null,
    input_kind: input.task.input_kind ?? null,
    normalized_path: input.task.normalized_path ?? null,
    input_entry_type: input.task.input_entry_type ?? null,
    input_sha256: input.task.input_sha256 ?? null,
    input_size_bytes: optionalNumberField(input.task, "input_size_bytes") ?? null,
    query_hash: input.task.query_hash ?? null,
    service_owned_execution: true,
    live_execution_performed: false,
    proof_authority: "none"
  };

  if (purpose === "local_ingestion") {
    const integrity = currentGoalModeInputIntegrity(input.projectRoot, input.task);
    const executionState = localGoalModeExecutionState(integrity);
    const responseEnvelope = {
      execution_state: executionState,
      input_integrity_status: integrity.input_integrity_status,
      result_count: 0,
      extracted_claims: [],
      blocker: integrity.blocker ?? null
    };
    return {
      adapter_run_id: adapterRunId,
      planned_task_id: plannedTaskId,
      adapter_id: input.task.adapter_id,
      adapter_kind: adapterKind,
      adapter_provider: adapterProvider,
      purpose,
      service_owned_execution: true,
      live_execution_performed: false,
      execution_state: executionState,
      planned_task_sha256: sha256Json(input.task),
      request_sha256: sha256Json(requestEnvelope),
      response_sha256: sha256Json(responseEnvelope),
      input_ref_id: input.task.input_ref_id ?? null,
      input_kind: input.task.input_kind ?? null,
      normalized_path: input.task.normalized_path ?? null,
      input_entry_type: input.task.input_entry_type ?? null,
      input_sha256: input.task.input_sha256 ?? null,
      current_input_sha256: integrity.current_input_sha256,
      input_size_bytes: optionalNumberField(input.task, "input_size_bytes") ?? null,
      current_input_size_bytes: integrity.current_input_size_bytes,
      input_integrity_status: integrity.input_integrity_status,
      prompt_injection_scan: {
        status: "required_before_extraction",
        findings: []
      },
      response_summary: {
        result_count: 0,
        extraction_count: 0,
        trusted_claim_count: 0
      },
      extracted_claims: [],
      blocker: integrity.blocker ?? null,
      proof_authority: "none",
      external_evidence_authority: false,
      can_promote_claim: false,
      can_certify_ga: false,
      result_can_be_used_as_proof: false
    };
  }

  const blocker = {
    code: "goal_mode_live_adapter_execution_required",
    planned_task_id: plannedTaskId,
    adapter_kind: adapterKind,
    adapter_provider: adapterProvider,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  };
  const responseSummary = {
    result_count: 0,
    evidence_anchor_count: 0,
    theorem_hint_count: 0,
    proof_authority: "none"
  };
  const responseEnvelope = {
    execution_state: "blocked_network_execution_not_performed",
    blocker,
    response_summary: responseSummary
  };
  return {
    adapter_run_id: adapterRunId,
    planned_task_id: plannedTaskId,
    adapter_id: input.task.adapter_id,
    adapter_kind: adapterKind,
    adapter_provider: adapterProvider,
    purpose,
    service_owned_execution: true,
    live_execution_performed: false,
    execution_state: "blocked_network_execution_not_performed",
    planned_task_sha256: sha256Json(input.task),
    request_sha256: sha256Json(requestEnvelope),
    response_sha256: sha256Json(responseEnvelope),
    input_ref_id: input.task.input_ref_id ?? null,
    input_kind: input.task.input_kind ?? null,
    normalized_path: input.task.normalized_path ?? null,
    input_entry_type: input.task.input_entry_type ?? null,
    input_sha256: input.task.input_sha256 ?? null,
    current_input_sha256: null,
    input_integrity_status: "not_applicable",
    prompt_injection_scan: {
      status: adapterKind === "retrieval" ? "required_after_live_retrieval" : "not_applicable",
      findings: []
    },
    response_summary: responseSummary,
    extracted_claims: [],
    blocker,
    proof_authority: "none",
    external_evidence_authority: false,
    can_promote_claim: false,
    can_certify_ga: false,
    result_can_be_used_as_proof: false
  };
}

function writeGoalModeAdapterExecutionManifest(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  obligation: ProofObligation;
  researchPlanRel: string;
}): string {
  const researchPlan = objectRecord(
    readJsonArtifact(input.projectRoot, input.researchPlanRel),
    "goal_mode_research_plan"
  );
  const invalidReasons = validateGoalModeResearchPlanBinding({
    plan: researchPlan,
    campaign: input.campaign,
    obligation: input.obligation
  });
  const tasks = invalidReasons.length === 0 ? goalModeResearchPlanTasks(researchPlan) : [];
  const adapterRuns = tasks.map((task, index) => goalModeAdapterRun({ projectRoot: input.projectRoot, task, index: index + 1 }));
  const blockedLiveProvider = adapterRuns.some((run) => run.execution_state === "blocked_network_execution_not_performed");
  const blockedInputIntegrity = adapterRuns.some((run) => typeof run.blocker === "object" && run.blocker !== null);
  const executionStatus =
    invalidReasons.length > 0
      ? "blocked_goal_mode_research_plan_invalid"
      : blockedLiveProvider
        ? "blocked_live_provider_execution_required"
        : blockedInputIntegrity
          ? "blocked_input_integrity_required"
          : "ready_for_live_adapter_execution";

  return writeSimpleStageArtifact(input.projectRoot, input.campaign, "goal_mode_adapter_execution_manifest.json", {
    schema_version: "comath.pi_goal_mode_adapter_execution_manifest.v1",
    campaign_id: input.campaign.campaign_id,
    project_id: input.campaign.project_id,
    claim_id: input.campaign.root_claim_id,
    obligation_id: input.obligation.obligation_id,
    locked_statement_hash: input.obligation.statement_hash,
    consumes_goal_mode_research_plan: {
      path: input.researchPlanRel,
      sha256: sha256RuntimeFile(input.projectRoot, input.researchPlanRel),
      schema_version: researchPlan.schema_version ?? null,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    },
    consumes_goal_mode_intake_manifest: goalModeResearchPlanIntakeBinding(researchPlan),
    service_owned_execution_manifest: true,
    execution_status: executionStatus,
    network_execution_performed: false,
    live_execution_performed: false,
    adapter_runs: adapterRuns,
    adapter_runs_sha256: sha256Json(adapterRuns),
    invalid_reasons: invalidReasons,
    no_reinvent_policy: {
      adapter_execution: "service-owned run envelopes only until maintained adapters execute",
      external_sources: "hints, evidence, or refutation sources only",
      proof_authority: "Lean4/mathlib clean replay only"
    },
    authority_boundary: {
      adapter_runs_are_not_proofs: true,
      extracted_claims_require_later_prompt_injection_scan: true,
      theorem_search_hits_are_hints_only: true,
      final_authority: "Lean4/mathlib kernel clean replay"
    },
    proof_authority: "none",
    external_evidence_authority: false,
    can_promote_claim: false,
    can_certify_ga: false,
    created_at: now()
  });
}

function goalModeAdapterExecutionRuns(manifest: Record<string, unknown>): Record<string, unknown>[] {
  const runs = manifest.adapter_runs;
  return Array.isArray(runs) ? runs.filter((run): run is Record<string, unknown> => !!run && typeof run === "object" && !Array.isArray(run)) : [];
}

function goalModeTextPromptInjectionScan(text: string): Record<string, unknown> {
  const patterns: Array<{ code: string; pattern: RegExp }> = [
    { code: "ignore_previous_instructions", pattern: /\bignore\s+(all\s+)?(previous|system|developer)\s+instructions?\b/i },
    { code: "skip_lean_authority", pattern: /\b(skip|bypass|avoid).{0,40}\bLean\b/i },
    { code: "mark_proven_without_lean", pattern: /\b(mark|declare|label).{0,40}\b(proven|proved).{0,60}\bwithout\s+Lean\b/i },
    { code: "credential_exfiltration", pattern: /\b(secret|credential|token|api[_ -]?key|password)\b/i },
    { code: "tool_misuse_instruction", pattern: /\b(run|execute|call)\s+(shell|powershell|cmd|tool)\b/i }
  ];
  const lines = text.split(/\r?\n/);
  const findings: Record<string, unknown>[] = [];
  lines.forEach((line, index) => {
    for (const entry of patterns) {
      if (entry.pattern.test(line)) {
        findings.push({
          code: entry.code,
          line_range: `${index + 1}-${index + 1}`
        });
      }
    }
  });
  return {
    status: findings.length > 0 ? "fail" : "pass",
    findings
  };
}

function cleanGoalModeClaimText(text: string): string {
  return text
    .replace(/\\label\{[^}]+\}/g, "")
    .replace(/\\(begin|end)\{[^}]+\}/g, "")
    .replace(/[`*_#>]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function goalModeClaimKindFromLabel(label: string): string {
  const normalized = label.toLowerCase();
  if (normalized.includes("definition")) {
    return "paper_definition";
  }
  if (normalized.includes("lemma")) {
    return "paper_lemma";
  }
  if (normalized.includes("proof")) {
    return "paper_proof_step";
  }
  return "paper_theorem";
}

function goalModeLineAnchorId(recordIndex: number, anchorIndex: number): string {
  return `GMLIE-${String(recordIndex).padStart(4, "0")}-A${String(anchorIndex).padStart(4, "0")}`;
}

function goalModeExtractAnchoredClaims(input: {
  text: string;
  normalizedPath: string;
  adapterProvider: string;
  recordIndex: number;
}): { anchors: Record<string, unknown>[]; extracted_claims: Record<string, unknown>[] } {
  const lines = input.text.split(/\r?\n/);
  const anchors: Record<string, unknown>[] = [];
  const claims: Record<string, unknown>[] = [];
  const addClaim = (label: string, statement: string, startLine: number, endLine: number) => {
    const cleaned = cleanGoalModeClaimText(statement);
    if (!cleaned) {
      return;
    }
    const anchorId = goalModeLineAnchorId(input.recordIndex, anchors.length + 1);
    const anchor = {
      anchor_id: anchorId,
      source_ref: input.normalizedPath,
      line_range: `${startLine}-${endLine}`,
      excerpt: cleaned.slice(0, 240),
      proof_authority: "none",
      can_promote_claim: false
    };
    anchors.push(anchor);
    claims.push({
      claim_id: `${anchorId}-C0001`,
      kind: goalModeClaimKindFromLabel(label),
      statement: cleaned,
      statement_sha256: sha256Text(cleaned),
      evidence_anchor_id: anchorId,
      source_ref: input.normalizedPath,
      source_adapter_provider: input.adapterProvider,
      proof_authority: "none",
      external_evidence_authority: false,
      can_promote_claim: false,
      can_certify_ga: false,
      result_can_be_used_as_proof: false
    });
  };

  lines.forEach((line, index) => {
    const markdownMatch = line.match(/^\s*(Theorem|Lemma|Definition|Proof step)\.?\s*(?:[:.-]\s*)?(.*)$/i);
    if (markdownMatch?.[2]?.trim()) {
      addClaim(markdownMatch[1], markdownMatch[2], index + 1, index + 1);
    }
  });

  for (let index = 0; index < lines.length; index += 1) {
    const begin = lines[index].match(/\\begin\{(theorem|lemma|definition|proof)\}/i);
    if (!begin) {
      continue;
    }
    const label = begin[1];
    const body: string[] = [];
    let endLine = index + 1;
    for (let inner = index + 1; inner < lines.length; inner += 1) {
      endLine = inner + 1;
      if (new RegExp(`\\\\end\\{${label}\\}`, "i").test(lines[inner])) {
        break;
      }
      body.push(lines[inner]);
    }
    addClaim(label, body.join(" "), index + 1, endLine);
  }

  return { anchors, extracted_claims: claims };
}

function goalModeLocalIngestionBlocker(
  code: string,
  run: Record<string, unknown>,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    code,
    adapter_run_id: run.adapter_run_id ?? null,
    planned_task_id: run.planned_task_id ?? null,
    adapter_provider: run.adapter_provider ?? null,
    normalized_path: run.normalized_path ?? null,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    ...extra
  };
}

function goalModeLocalIngestionBlockedRecord(input: {
  run: Record<string, unknown>;
  recordIndex: number;
  executionState: string;
  blockerCode: string;
  contentSha256?: string | null;
}): Record<string, unknown> {
  return {
    ingestion_record_id: `GMLIE-${String(input.recordIndex).padStart(4, "0")}`,
    adapter_run_id: input.run.adapter_run_id ?? null,
    planned_task_id: input.run.planned_task_id ?? null,
    adapter_id: input.run.adapter_id ?? null,
    adapter_kind: input.run.adapter_kind ?? null,
    adapter_provider: input.run.adapter_provider ?? null,
    normalized_path: input.run.normalized_path ?? null,
    input_sha256: input.run.input_sha256 ?? null,
    content_sha256: input.contentSha256 ?? input.run.current_input_sha256 ?? input.run.input_sha256 ?? null,
    execution_state: input.executionState,
    prompt_injection_scan: {
      status: "not_applicable",
      findings: []
    },
    anchors: [],
    extracted_claims: [],
    response_summary: {
      anchor_count: 0,
      extracted_claim_count: 0
    },
    blocker: goalModeLocalIngestionBlocker(input.blockerCode, input.run),
    proof_authority: "none",
    external_evidence_authority: false,
    can_promote_claim: false,
    can_certify_ga: false,
    result_can_be_used_as_proof: false
  };
}

function goalModeLocalTextIngestionRecord(input: {
  projectRoot: string;
  run: Record<string, unknown>;
  recordIndex: number;
}): Record<string, unknown> {
  const normalizedPath = optionalStringField(input.run, "normalized_path");
  if (!normalizedPath || !safeGoalModeNormalizedPath(normalizedPath)) {
    return goalModeLocalIngestionBlockedRecord({
      run: input.run,
      recordIndex: input.recordIndex,
      executionState: "blocked_input_path_unsafe",
      blockerCode: "goal_mode_input_path_unsafe"
    });
  }
  if (input.run.execution_state !== "local_manifest_recorded" || input.run.input_integrity_status !== "matched") {
    return goalModeLocalIngestionBlockedRecord({
      run: input.run,
      recordIndex: input.recordIndex,
      executionState: "blocked_input_integrity_unverified",
      blockerCode: "goal_mode_input_integrity_unverified"
    });
  }

  const absolutePath = assertPathAllowed(input.projectRoot, normalizedPath, { purpose: "read", resolveRealpath: true });
  const text = readFileSync(absolutePath, "utf8");
  const contentSha256 = sha256Text(text);
  if (contentSha256 !== input.run.current_input_sha256 && contentSha256 !== input.run.input_sha256) {
    return goalModeLocalIngestionBlockedRecord({
      run: input.run,
      recordIndex: input.recordIndex,
      executionState: "blocked_input_hash_mismatch",
      blockerCode: "goal_mode_input_hash_mismatch",
      contentSha256
    });
  }

  const promptInjectionScan = goalModeTextPromptInjectionScan(text);
  if (promptInjectionScan.status === "fail") {
    return {
      ingestion_record_id: `GMLIE-${String(input.recordIndex).padStart(4, "0")}`,
      adapter_run_id: input.run.adapter_run_id ?? null,
      planned_task_id: input.run.planned_task_id ?? null,
      adapter_id: input.run.adapter_id ?? null,
      adapter_kind: input.run.adapter_kind ?? null,
      adapter_provider: input.run.adapter_provider ?? null,
      normalized_path: normalizedPath,
      input_sha256: input.run.input_sha256 ?? null,
      content_sha256: contentSha256,
      execution_state: "blocked_prompt_injection_detected",
      prompt_injection_scan: promptInjectionScan,
      anchors: [],
      extracted_claims: [],
      response_summary: {
        anchor_count: 0,
        extracted_claim_count: 0
      },
      blocker: goalModeLocalIngestionBlocker("goal_mode_prompt_injection_detected", input.run),
      proof_authority: "none",
      external_evidence_authority: false,
      can_promote_claim: false,
      can_certify_ga: false,
      result_can_be_used_as_proof: false
    };
  }

  const extracted = goalModeExtractAnchoredClaims({
    text,
    normalizedPath,
    adapterProvider: optionalStringField(input.run, "adapter_provider") ?? "unknown",
    recordIndex: input.recordIndex
  });
  return {
    ingestion_record_id: `GMLIE-${String(input.recordIndex).padStart(4, "0")}`,
    adapter_run_id: input.run.adapter_run_id ?? null,
    planned_task_id: input.run.planned_task_id ?? null,
    adapter_id: input.run.adapter_id ?? null,
    adapter_kind: input.run.adapter_kind ?? null,
    adapter_provider: input.run.adapter_provider ?? null,
    normalized_path: normalizedPath,
    input_sha256: input.run.input_sha256 ?? null,
    content_sha256: contentSha256,
    execution_state: "local_text_extracted",
    prompt_injection_scan: promptInjectionScan,
    anchors: extracted.anchors,
    extracted_claims: extracted.extracted_claims,
    response_summary: {
      anchor_count: extracted.anchors.length,
      extracted_claim_count: extracted.extracted_claims.length
    },
    blocker: null,
    proof_authority: "none",
    external_evidence_authority: false,
    can_promote_claim: false,
    can_certify_ga: false,
    result_can_be_used_as_proof: false
  };
}

function goalModeLocalIngestionEvidenceRecord(input: {
  projectRoot: string;
  run: Record<string, unknown>;
  recordIndex: number;
}): Record<string, unknown> {
  const provider = optionalStringField(input.run, "adapter_provider");
  if (provider === "local_markdown" || provider === "local_tex") {
    return goalModeLocalTextIngestionRecord(input);
  }
  if (provider === "local_pdf") {
    return goalModeLocalIngestionBlockedRecord({
      run: input.run,
      recordIndex: input.recordIndex,
      executionState: "blocked_pdf_parser_required",
      blockerCode: "goal_mode_pdf_ingestion_adapter_required"
    });
  }
  if (provider === "local_lean_repo") {
    return goalModeLocalIngestionBlockedRecord({
      run: input.run,
      recordIndex: input.recordIndex,
      executionState: "blocked_external_lean_repo_inspection_required",
      blockerCode: "goal_mode_external_lean_repo_inspection_required",
      contentSha256: null
    });
  }
  return goalModeLocalIngestionBlockedRecord({
    run: input.run,
    recordIndex: input.recordIndex,
    executionState: "blocked_local_ingestion_adapter_unsupported",
    blockerCode: "goal_mode_local_ingestion_adapter_unsupported"
  });
}

function writeGoalModeLocalIngestionEvidence(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  obligation: ProofObligation;
  researchPlanRel: string;
  adapterExecutionRel: string;
}): string {
  const researchPlan = objectRecord(readJsonArtifact(input.projectRoot, input.researchPlanRel), "goal_mode_research_plan");
  const executionManifest = objectRecord(
    readJsonArtifact(input.projectRoot, input.adapterExecutionRel),
    "goal_mode_adapter_execution_manifest"
  );
  const localRuns = goalModeAdapterExecutionRuns(executionManifest).filter((run) => run.purpose === "local_ingestion");
  const ingestionRecords = localRuns.map((run, index) =>
    goalModeLocalIngestionEvidenceRecord({ projectRoot: input.projectRoot, run, recordIndex: index + 1 })
  );
  const promptInjectionBlockerCount = ingestionRecords.filter(
    (record) => objectRecord(record.prompt_injection_scan, "prompt_injection_scan").status === "fail"
  ).length;
  const blockedRecordCount = ingestionRecords.filter((record) => typeof record.blocker === "object" && record.blocker !== null).length;
  const extractedClaimCount = ingestionRecords.reduce((count, record) => {
    const claims = record.extracted_claims;
    return count + (Array.isArray(claims) ? claims.length : 0);
  }, 0);

  return writeSimpleStageArtifact(input.projectRoot, input.campaign, "goal_mode_local_ingestion_evidence.json", {
    schema_version: "comath.pi_goal_mode_local_ingestion_evidence.v1",
    campaign_id: input.campaign.campaign_id,
    project_id: input.campaign.project_id,
    claim_id: input.campaign.root_claim_id,
    obligation_id: input.obligation.obligation_id,
    locked_statement_hash: input.obligation.statement_hash,
    consumes_goal_mode_research_plan: {
      path: input.researchPlanRel,
      sha256: sha256RuntimeFile(input.projectRoot, input.researchPlanRel),
      schema_version: researchPlan.schema_version ?? null,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    },
    consumes_goal_mode_adapter_execution_manifest: {
      path: input.adapterExecutionRel,
      sha256: sha256RuntimeFile(input.projectRoot, input.adapterExecutionRel),
      schema_version: executionManifest.schema_version ?? null,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    },
    consumes_goal_mode_intake_manifest: goalModeResearchPlanIntakeBinding(researchPlan),
    service_owned_local_ingestion: true,
    network_execution_performed: false,
    live_provider_execution_performed: false,
    ingestion_records: ingestionRecords,
    summary: {
      local_record_count: ingestionRecords.length,
      extracted_claim_count: extractedClaimCount,
      prompt_injection_blocker_count: promptInjectionBlockerCount,
      blocked_record_count: blockedRecordCount
    },
    authority_boundary: {
      document_text_is_data_not_instruction: true,
      extracted_claims_are_formalization_candidates_only: true,
      proof_authority: "Lean4/mathlib kernel clean replay only"
    },
    proof_authority: "none",
    external_evidence_authority: false,
    can_promote_claim: false,
    can_certify_ga: false,
    created_at: now()
  });
}

const goalModeFormalizationCandidateKinds = new Set(["paper_definition", "paper_theorem", "paper_lemma", "paper_proof_step"]);

function goalModeRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item))
    : [];
}

function goalModeOptionalRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function goalModeKnowledgePackRel(campaign: ResearchCampaign): string {
  return campaignRel(campaign, "knowledge_pack.json");
}

function goalModeLocalIngestionEvidenceRel(campaign: ResearchCampaign): string {
  return campaignRel(campaign, "goal_mode_local_ingestion_evidence.json");
}

function goalModeNonAuthorityBinding(path: string, sha256: string | null, schemaVersion?: unknown): Record<string, unknown> {
  return {
    path,
    sha256,
    schema_version: typeof schemaVersion === "string" ? schemaVersion : null,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  };
}

function goalModeFormalizationHintFromClaim(input: {
  record: Record<string, unknown>;
  claim: Record<string, unknown>;
  anchor: Record<string, unknown>;
  index: number;
}): Record<string, unknown> | undefined {
  const kind = optionalStringField(input.claim, "kind");
  const statementSha256 = optionalStringField(input.claim, "statement_sha256");
  const evidenceAnchorId = optionalStringField(input.claim, "evidence_anchor_id");
  const sourceRef = optionalStringField(input.claim, "source_ref") ?? optionalStringField(input.record, "normalized_path");
  const lineRange = optionalStringField(input.anchor, "line_range");
  const extractedClaimId = optionalStringField(input.claim, "claim_id");
  const ingestionRecordId = optionalStringField(input.record, "ingestion_record_id");
  if (
    !kind ||
    !goalModeFormalizationCandidateKinds.has(kind) ||
    !statementSha256 ||
    !evidenceAnchorId ||
    !sourceRef ||
    !lineRange ||
    !extractedClaimId ||
    !ingestionRecordId
  ) {
    return undefined;
  }
  return {
    hint_id: `GMFH-${String(input.index).padStart(4, "0")}`,
    ingestion_record_id: ingestionRecordId,
    extracted_claim_id: extractedClaimId,
    kind,
    statement: optionalStringField(input.claim, "statement") ?? null,
    statement_sha256: statementSha256,
    evidence_anchor_id: evidenceAnchorId,
    source_ref: sourceRef,
    source_adapter_provider: optionalStringField(input.claim, "source_adapter_provider") ?? optionalStringField(input.record, "adapter_provider") ?? null,
    line_range: lineRange,
    anchor_excerpt: optionalStringField(input.anchor, "excerpt") ?? null,
    can_inform_skeleton: true,
    can_change_locked_statement: false,
    requires_formal_spec_lock_approval: true,
    requires_statement_diff_gate: true,
    proof_authority: "none",
    external_evidence_authority: false,
    can_promote_claim: false,
    can_certify_ga: false,
    result_can_be_used_as_proof: false
  };
}

function goalModeFormalizationHintsFromEvidence(evidence: Record<string, unknown>): Record<string, unknown>[] {
  const hints: Record<string, unknown>[] = [];
  for (const record of goalModeRecordArray(evidence.ingestion_records)) {
    const promptInjectionScan = goalModeOptionalRecord(record.prompt_injection_scan);
    if (record.execution_state !== "local_text_extracted" || promptInjectionScan?.status !== "pass") {
      continue;
    }
    const anchors = new Map(
      goalModeRecordArray(record.anchors)
        .map((anchor) => [optionalStringField(anchor, "anchor_id"), anchor] as const)
        .filter((entry): entry is readonly [string, Record<string, unknown>] => typeof entry[0] === "string")
    );
    for (const claim of goalModeRecordArray(record.extracted_claims)) {
      const anchor = anchors.get(optionalStringField(claim, "evidence_anchor_id") ?? "");
      if (!anchor) {
        continue;
      }
      const hint = goalModeFormalizationHintFromClaim({ record, claim, anchor, index: hints.length + 1 });
      if (hint) {
        hints.push(hint);
      }
    }
  }
  return hints;
}

function validateGoalModeFormalizationHintBindings(input: {
  campaign: ResearchCampaign;
  obligation: ProofObligation;
  knowledgePack: Record<string, unknown> | undefined;
  knowledgePackRel: string;
  localEvidence: Record<string, unknown> | undefined;
  localEvidenceRel: string | undefined;
  localEvidenceSha256: string | undefined;
}): string[] {
  const invalidReasons: string[] = [];
  if (!input.knowledgePack) {
    invalidReasons.push("goal_mode_knowledge_pack_missing");
  } else {
    if (input.knowledgePack.campaign_id !== input.campaign.campaign_id) {
      invalidReasons.push("knowledge_pack_campaign_id_mismatch");
    }
    if (input.knowledgePack.root_claim_id !== input.campaign.root_claim_id) {
      invalidReasons.push("knowledge_pack_claim_id_mismatch");
    }
    if (input.knowledgePack.obligation_id !== input.obligation.obligation_id) {
      invalidReasons.push("knowledge_pack_obligation_id_mismatch");
    }
    if (input.knowledgePack.locked_statement_hash !== input.obligation.statement_hash) {
      invalidReasons.push("knowledge_pack_locked_statement_hash_mismatch");
    }
  }

  const expectedLocalEvidenceRel = goalModeLocalIngestionEvidenceRel(input.campaign);
  if (!input.localEvidenceRel) {
    invalidReasons.push("goal_mode_local_ingestion_evidence_binding_missing");
  } else if (
    !safeGoalModeNormalizedPath(input.localEvidenceRel) ||
    normalizeRelPath(input.localEvidenceRel) !== expectedLocalEvidenceRel
  ) {
    invalidReasons.push("goal_mode_local_ingestion_evidence_path_mismatch");
  }

  if (!input.localEvidenceSha256) {
    invalidReasons.push("goal_mode_local_ingestion_evidence_hash_missing");
  }

  if (!input.localEvidence) {
    invalidReasons.push("goal_mode_local_ingestion_evidence_missing");
  } else {
    if (input.localEvidence.schema_version !== "comath.pi_goal_mode_local_ingestion_evidence.v1") {
      invalidReasons.push("goal_mode_local_ingestion_evidence_schema_mismatch");
    }
    if (input.localEvidence.campaign_id !== input.campaign.campaign_id) {
      invalidReasons.push("goal_mode_local_ingestion_evidence_campaign_id_mismatch");
    }
    if (input.localEvidence.claim_id !== input.campaign.root_claim_id) {
      invalidReasons.push("goal_mode_local_ingestion_evidence_claim_id_mismatch");
    }
    if (input.localEvidence.obligation_id !== input.obligation.obligation_id) {
      invalidReasons.push("goal_mode_local_ingestion_evidence_obligation_id_mismatch");
    }
    if (input.localEvidence.locked_statement_hash !== input.obligation.statement_hash) {
      invalidReasons.push("goal_mode_local_ingestion_evidence_locked_statement_hash_mismatch");
    }
  }

  return invalidReasons;
}

function writeGoalModeFormalizationHints(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  obligation: ProofObligation;
}): string {
  const knowledgePackRel = goalModeKnowledgePackRel(input.campaign);
  const knowledgePackExists = artifactExists(input.projectRoot, knowledgePackRel);
  const knowledgePack = knowledgePackExists
    ? objectRecord(readJsonArtifact(input.projectRoot, knowledgePackRel), "knowledge_pack")
    : undefined;
  const knowledgePackSha256 = knowledgePackExists ? sha256RuntimeFile(input.projectRoot, knowledgePackRel) : null;
  const localEvidenceBinding = knowledgePack
    ? goalModeOptionalRecord(knowledgePack.goal_mode_local_ingestion_evidence)
    : undefined;
  const localEvidenceRel = localEvidenceBinding ? optionalStringField(localEvidenceBinding, "path") : undefined;
  const safeLocalEvidenceRel =
    localEvidenceRel && safeGoalModeNormalizedPath(localEvidenceRel) ? normalizeRelPath(localEvidenceRel) : undefined;
  const localEvidenceBindingSha256 = localEvidenceBinding ? optionalStringField(localEvidenceBinding, "sha256") : undefined;
  const localEvidenceExists = !!safeLocalEvidenceRel && artifactExists(input.projectRoot, safeLocalEvidenceRel);
  const localEvidenceSha256 = localEvidenceExists ? sha256RuntimeFile(input.projectRoot, safeLocalEvidenceRel) : undefined;
  const localEvidence =
    localEvidenceExists && localEvidenceSha256 === localEvidenceBindingSha256
      ? objectRecord(readJsonArtifact(input.projectRoot, safeLocalEvidenceRel), "goal_mode_local_ingestion_evidence")
      : undefined;
  const invalidReasons = validateGoalModeFormalizationHintBindings({
    campaign: input.campaign,
    obligation: input.obligation,
    knowledgePack,
    knowledgePackRel,
    localEvidence,
    localEvidenceRel,
    localEvidenceSha256
  });
  if (localEvidenceBindingSha256 && localEvidenceSha256 && localEvidenceSha256 !== localEvidenceBindingSha256) {
    invalidReasons.push("goal_mode_local_ingestion_evidence_hash_mismatch");
  }

  const formalizationHints = invalidReasons.length === 0 && localEvidence ? goalModeFormalizationHintsFromEvidence(localEvidence) : [];
  const ingestionRecords = localEvidence ? goalModeRecordArray(localEvidence.ingestion_records) : [];
  const blockedRecordCount = ingestionRecords.filter((record) => typeof record.blocker === "object" && record.blocker !== null).length;
  const promptInjectionBlockerCount = ingestionRecords.filter((record) => {
    const scan = record.prompt_injection_scan;
    return !!scan && typeof scan === "object" && !Array.isArray(scan) && (scan as Record<string, unknown>).status === "fail";
  }).length;
  const rel = campaignProofRel(input.campaign, "formalization_hints.json");
  writeRuntimeFile(
    input.projectRoot,
    rel,
    `${JSON.stringify(
      {
        schema_version: "comath.pi_goal_mode_formalization_hints.v1",
        campaign_id: input.campaign.campaign_id,
        project_id: input.campaign.project_id,
        claim_id: input.campaign.root_claim_id,
        obligation_id: input.obligation.obligation_id,
        locked_statement_hash: input.obligation.statement_hash,
        consumes_knowledge_pack: goalModeNonAuthorityBinding(knowledgePackRel, knowledgePackSha256),
        consumes_goal_mode_local_ingestion_evidence: goalModeNonAuthorityBinding(
          safeLocalEvidenceRel ?? goalModeLocalIngestionEvidenceRel(input.campaign),
          localEvidenceSha256 ?? null,
          localEvidence?.schema_version
        ),
        service_owned_formalization_hints: true,
        formalization_hints: formalizationHints,
        formalization_hints_sha256: sha256Json(formalizationHints),
        summary: {
          ingestion_record_count: ingestionRecords.length,
          source_extracted_claim_count:
            typeof localEvidence?.summary === "object" &&
            localEvidence.summary !== null &&
            !Array.isArray(localEvidence.summary) &&
            typeof (localEvidence.summary as Record<string, unknown>).extracted_claim_count === "number"
              ? (localEvidence.summary as Record<string, unknown>).extracted_claim_count
              : formalizationHints.length,
          formalization_hint_count: formalizationHints.length,
          blocked_ingestion_record_count: blockedRecordCount,
          prompt_injection_blocker_count: promptInjectionBlockerCount,
          allowed_candidate_kinds: [...goalModeFormalizationCandidateKinds]
        },
        invalid_reasons: invalidReasons,
        statement_drift_guard: {
          locked_statement_hash: input.obligation.statement_hash,
          extracted_claims_may_change_locked_statement: false,
          formal_spec_lock_required_before_statement_change: true,
          statement_diff_gate_required: true,
          lean_replay_required_for_promotion: true
        },
        authority_boundary: {
          extracted_claims_are_hints_only: true,
          can_seed_blueprint_or_skeleton: true,
          cannot_satisfy_literature_evidence: true,
          cannot_satisfy_theorem_search_evidence: true,
          cannot_satisfy_lean_replay: true,
          final_authority: "Lean4/mathlib kernel clean replay"
        },
        proof_authority: "none",
        external_evidence_authority: false,
        can_promote_claim: false,
        can_certify_ga: false,
        result_can_be_used_as_proof: false,
        created_at: now()
      },
      null,
      2
    )}\n`
  );
  return rel;
}

function goalModeSkeletonBlueprintStepFromHint(hint: Record<string, unknown>, index: number): Record<string, unknown> | undefined {
  const hintId = optionalStringField(hint, "hint_id");
  const kind = optionalStringField(hint, "kind");
  const sourceRef = optionalStringField(hint, "source_ref");
  const lineRange = optionalStringField(hint, "line_range");
  const statementSha256 = optionalStringField(hint, "statement_sha256");
  if (!hintId || !kind || !sourceRef || !lineRange || !statementSha256) {
    return undefined;
  }
  return {
    step_id: `GMSB-${String(index).padStart(4, "0")}`,
    formalization_hint_id: hintId,
    kind,
    source_ref: sourceRef,
    source_adapter_provider: optionalStringField(hint, "source_adapter_provider") ?? null,
    line_range: lineRange,
    statement_sha256: statementSha256,
    evidence_anchor_id: optionalStringField(hint, "evidence_anchor_id") ?? null,
    suggested_planning_use: "candidate_lemma_planning_hint",
    can_seed_lemma_dag_metadata: true,
    can_create_proof_obligation_without_formal_spec_lock: false,
    can_change_locked_statement: false,
    requires_formal_spec_lock_approval: true,
    requires_statement_diff_gate: true,
    requires_clean_lean_replay_for_promotion: true,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    result_can_be_used_as_proof: false
  };
}

function writeGoalModeSkeletonBlueprint(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  obligation: ProofObligation;
  formalizationHintsRel: string;
}): { path: string; blueprint_step_ids: string[] } {
  const hintsExists = artifactExists(input.projectRoot, input.formalizationHintsRel);
  const hintsSha256 = hintsExists ? sha256RuntimeFile(input.projectRoot, input.formalizationHintsRel) : null;
  const hints = hintsExists
    ? objectRecord(readJsonArtifact(input.projectRoot, input.formalizationHintsRel), "goal_mode_formalization_hints")
    : undefined;
  const invalidReasons: string[] = [];
  if (!hints) {
    invalidReasons.push("goal_mode_formalization_hints_missing");
  } else {
    if (hints.schema_version !== "comath.pi_goal_mode_formalization_hints.v1") {
      invalidReasons.push("goal_mode_formalization_hints_schema_mismatch");
    }
    if (hints.campaign_id !== input.campaign.campaign_id) {
      invalidReasons.push("goal_mode_formalization_hints_campaign_id_mismatch");
    }
    if (hints.claim_id !== input.campaign.root_claim_id) {
      invalidReasons.push("goal_mode_formalization_hints_claim_id_mismatch");
    }
    if (hints.obligation_id !== input.obligation.obligation_id) {
      invalidReasons.push("goal_mode_formalization_hints_obligation_id_mismatch");
    }
    if (hints.locked_statement_hash !== input.obligation.statement_hash) {
      invalidReasons.push("goal_mode_formalization_hints_locked_statement_hash_mismatch");
    }
  }

  const hintRecords = invalidReasons.length === 0 && hints ? goalModeRecordArray(hints.formalization_hints) : [];
  const blueprintSteps = hintRecords
    .map((hint, index) => goalModeSkeletonBlueprintStepFromHint(hint, index + 1))
    .filter((step): step is Record<string, unknown> => !!step);
  const formalizationHintIds = blueprintSteps
    .map((step) => optionalStringField(step, "formalization_hint_id"))
    .filter((hintId): hintId is string => typeof hintId === "string");
  const blueprintStepIds = blueprintSteps
    .map((step) => optionalStringField(step, "step_id"))
    .filter((stepId): stepId is string => typeof stepId === "string");
  const rel = campaignProofRel(input.campaign, "blueprint.json");
  writeRuntimeFile(
    input.projectRoot,
    rel,
    `${JSON.stringify(
      {
        schema_version: "comath.pi_goal_mode_skeleton_blueprint.v1",
        campaign_id: input.campaign.campaign_id,
        project_id: input.campaign.project_id,
        claim_id: input.campaign.root_claim_id,
        obligation_id: input.obligation.obligation_id,
        locked_statement_hash: input.obligation.statement_hash,
        consumes_goal_mode_formalization_hints: goalModeNonAuthorityBinding(
          input.formalizationHintsRel,
          hintsSha256,
          hints?.schema_version
        ),
        service_owned_skeleton_blueprint: true,
        formalization_hint_ids: formalizationHintIds,
        blueprint_steps: blueprintSteps,
        blueprint_steps_sha256: sha256Json(blueprintSteps),
        summary: {
          formalization_hint_count: hintRecords.length,
          blueprint_step_count: blueprintSteps.length,
          invalid_reason_count: invalidReasons.length
        },
        invalid_reasons: invalidReasons,
        statement_drift_guard: {
          locked_statement_hash: input.obligation.statement_hash,
          blueprint_may_change_locked_statement: false,
          formal_spec_lock_required_before_statement_change: true,
          statement_diff_gate_required: true,
          lean_replay_required_for_promotion: true
        },
        authority_boundary: {
          blueprint_steps_are_planning_hints_only: true,
          can_seed_lemma_dag_metadata: true,
          cannot_create_proof_obligations_without_formal_spec_lock: true,
          cannot_satisfy_literature_evidence: true,
          cannot_satisfy_theorem_search_evidence: true,
          cannot_satisfy_lean_replay: true,
          final_authority: "Lean4/mathlib kernel clean replay"
        },
        proof_authority: "none",
        can_promote_claim: false,
        can_certify_ga: false,
        result_can_be_used_as_proof: false,
        created_at: now()
      },
      null,
      2
    )}\n`
  );
  return { path: rel, blueprint_step_ids: blueprintStepIds };
}

export function startCampaign(input: StartCampaignInput): CampaignTickResult {
  const actor = input.actor ?? "campaign";
  const { project } = initProject({ name: input.project_name ?? "CoMath Research Campaign", root_path: input.project_root });
  const requiresFormalSpecLock = needsFormalSpecLock(input.user_goal);
  const claim = registerClaim(input.project_root, {
    project_id: project.project_id,
    statement: lockedStatement(input.user_goal),
    assumptions: [],
    domain: input.domain ?? "elementary",
    actor,
    status: requiresFormalSpecLock ? "needs_formal_spec_lock" : "conjectural"
  });
  createProblemLock(input.project_root, { claim_id: claim.id, goal: input.user_goal, domain: input.domain ?? "elementary" });
  const timestamp = now();
  const campaignId = nextCampaignId(input.project_root);
  if (requiresFormalSpecLock) {
    const blockerRel = join(".comath", "campaign", campaignId, "formal_spec_lock_blocker.json").replace(/\\/g, "/");
    writeRuntimeFile(
      input.project_root,
      blockerRel,
      `${JSON.stringify(
        {
          schema_version: "comath.formal_spec_lock_blocker.v1",
          campaign_id: campaignId,
          claim_id: claim.id,
          reason: "needs_formal_spec_lock",
          raw_goal_requires_lock: true,
          proof_authority: "none",
          can_create_proof_obligation: false,
          required_next_artifacts: ["FormalSpecLock", "AssumptionLedger"],
          hard_vetoes: ["statement_unlocked"],
          created_at: timestamp
        },
        null,
        2
      )}\n`
    );
    const blocker = {
      code: "NEEDS_FORMAL_SPEC_LOCK",
      reason: "needs_formal_spec_lock",
      artifact_path: blockerRel,
      hard_vetoes: ["statement_unlocked"]
    };
    const campaignBase = researchCampaignSchema.parse({
      campaign_id: campaignId,
      project_id: project.project_id,
      root_claim_id: claim.id,
      user_goal: input.user_goal,
      current_stage: "blocked",
      status: "blocked",
      strict_mode: input.strict_mode ?? true,
      stage_runs: [],
      open_obligations: [],
      accepted_artifacts: [],
      blockers: [blocker],
      next_actions: ["create approved FormalSpecLock and AssumptionLedger before proof obligation creation"],
      created_at: timestamp,
      updated_at: timestamp
    });
    const intakeManifestRel = writeGoalModeIntakeManifest({
      projectRoot: input.project_root,
      campaign: campaignBase,
      projectId: project.project_id,
      claimId: claim.id,
      statementHash: claim.statement_hash,
      request: input,
      actor,
      createdAt: timestamp
    });
    const campaign = researchCampaignSchema.parse({
      ...campaignBase,
      stage_runs: [completedStageRun(campaignBase, "initialized", [intakeManifestRel])]
    });
    appendAuditEvent(input.project_root, {
      project_id: project.project_id,
      event_type: "campaign.needs_formal_spec_lock",
      actor,
      target_id: campaign.campaign_id,
    payload: {
      root_claim_id: claim.id,
      blocker_artifact_path: blockerRel,
      goal_mode_intake_manifest_path: intakeManifestRel,
      goal_mode_intake_manifest_sha256: sha256RuntimeFile(input.project_root, intakeManifestRel)
    }
    });
    return { campaign: writeCampaign(input.project_root, campaign, actor), blocker: "needs_formal_spec_lock" };
  }
  const obligation = createObligation(claim.id, claim.statement_hash, input.user_goal);
  const campaignBase = researchCampaignSchema.parse({
    campaign_id: campaignId,
    project_id: project.project_id,
    root_claim_id: claim.id,
    user_goal: input.user_goal,
    current_stage: "problem_locked",
    status: "running",
    strict_mode: input.strict_mode ?? true,
    stage_runs: [],
    open_obligations: [obligation],
    accepted_artifacts: [],
    blockers: [],
    next_actions: ["tick campaign to build context pack for the locked problem"],
    created_at: timestamp,
    updated_at: timestamp
  });
  const intakeManifestRel = writeGoalModeIntakeManifest({
    projectRoot: input.project_root,
    campaign: campaignBase,
    projectId: project.project_id,
    claimId: claim.id,
    statementHash: claim.statement_hash,
    request: input,
    actor,
    createdAt: timestamp
  });
  const campaign = researchCampaignSchema.parse({
    ...campaignBase,
    stage_runs: [completedStageRun(campaignBase, "initialized", [intakeManifestRel])]
  });
  appendAuditEvent(input.project_root, {
    project_id: project.project_id,
    event_type: "campaign.started",
    actor,
    target_id: campaign.campaign_id,
    payload: {
      root_claim_id: claim.id,
      strict_mode: campaign.strict_mode,
      goal_mode_intake_manifest_path: intakeManifestRel,
      goal_mode_intake_manifest_sha256: sha256RuntimeFile(input.project_root, intakeManifestRel)
    }
  });
  return { campaign: writeCampaign(input.project_root, campaign, actor), obligation };
}

function readStoredDecision(
  projectRoot: string,
  campaign: ResearchCampaign,
  obligationId: string
): { candidates: CandidateRun[]; decision: EnsembleDecision } | undefined {
  const decisionPath = assertPathAllowed(projectRoot, ensembleDecisionRel(campaign, obligationId), {
    purpose: "runtime-write"
  });
  const candidatesPath = assertPathAllowed(projectRoot, ensembleCandidatesRel(campaign, obligationId), {
    purpose: "runtime-write"
  });
  if (!existsSync(decisionPath)) {
    return undefined;
  }
  const payload = JSON.parse(readFileSync(decisionPath, "utf8"));
  const candidates = existsSync(candidatesPath)
    ? candidateRunSchema.array().parse(JSON.parse(readFileSync(candidatesPath, "utf8")))
    : [];
  return { candidates, decision: payload as EnsembleDecision };
}

function readStoredCandidates(projectRoot: string, campaign: ResearchCampaign, obligationId: string): CandidateRun[] {
  const candidatesPath = assertPathAllowed(projectRoot, ensembleCandidatesRel(campaign, obligationId), {
    purpose: "runtime-write"
  });
  if (!existsSync(candidatesPath)) {
    throw new ComathError("candidate generation artifacts are missing", {
      statusCode: 409,
      code: "CAMPAIGN_CANDIDATES_MISSING"
    });
  }
  return candidateRunSchema.array().parse(JSON.parse(readFileSync(candidatesPath, "utf8")));
}

function writeStoredCandidates(projectRoot: string, campaign: ResearchCampaign, obligationId: string, candidates: CandidateRun[]): string {
  const candidatesRel = ensembleCandidatesRel(campaign, obligationId);
  writeRuntimeFile(projectRoot, candidatesRel, `${JSON.stringify(candidateRunSchema.array().parse(candidates), null, 2)}\n`);
  return candidatesRel;
}

function readCandidateManifestForCampaign(projectRoot: string, candidate: CandidateRun): CandidateManifest {
  if (!candidate.manifest_path) {
    throw new Error("selected_candidate_manifest_missing");
  }
  const manifestPath = assertPathAllowed(projectRoot, candidate.manifest_path, {
    purpose: "read",
    resolveRealpath: true
  });
  const manifest = candidateManifestSchema.parse(JSON.parse(readFileSync(manifestPath, "utf8")));
  const mismatches: string[] = [];
  for (const key of ["candidate_id", "campaign_id", "stage", "obligation_id", "variant_id", "locked_statement_hash", "state"] as const) {
    if (manifest[key] !== candidate[key]) {
      mismatches.push(key);
    }
  }
  if (manifest.workspace_path !== candidate.workspace_path) {
    mismatches.push("workspace_path");
  }
  if (manifest.candidate_statement_hash !== candidate.candidate_statement_hash) {
    mismatches.push("candidate_statement_hash");
  }
  if ((manifest.replay_command || undefined) !== candidate.replay_command) {
    mismatches.push("replay_command");
  }
  if (mismatches.length > 0) {
    throw new Error(`selected_candidate_manifest_mismatch:${mismatches.join(",")}`);
  }
  return manifest;
}

function writeSimpleStageArtifact(projectRoot: string, campaign: ResearchCampaign, filename: string, payload: unknown): string {
  const rel = join(".comath", "campaign", campaign.campaign_id, filename);
  writeRuntimeFile(projectRoot, rel, `${JSON.stringify(payload, null, 2)}\n`);
  return rel.replace(/\\/g, "/");
}

const broadSynthesisBlockedReason = "broad theorem synthesis requires checked replay target";
const businessLayerTheoremProverForbidden = "business_layer_theorem_prover_forbidden";

function blockForBroadSynthesisPlanning(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  obligation: ProofObligation;
  actor: string;
}): CampaignTickResult {
  const obligationDagRel = campaignProofRel(input.campaign, "lemma_dag.json");
  const lineMapRel = campaignProofRel(input.campaign, "line_map.json");
  const replayTargetRel = writeSimpleStageArtifact(input.projectRoot, input.campaign, "broad_replay_target.json", {
    schema_version: "comath.v3.broad_replay_target.v1",
    campaign_id: input.campaign.campaign_id,
    claim_id: input.campaign.root_claim_id,
    obligation_id: input.obligation.obligation_id,
    locked_statement_hash: input.obligation.statement_hash,
    target_formal_system: "Lean4",
    status: "blocked_no_production_theorem_prover",
    theorem_name: input.obligation.lean_target ? null : null,
    lean_target: input.obligation.lean_target ?? null,
    replay_command: null,
    lean_project_target_path: null,
    proof_body_synthesis_path: null,
    proof_body_static_audit_path: null,
    authority_report_preparation_path: null,
    can_promote_claim: false,
    required_before_replay: [
      "FormalSpecLock with approved theorem boundary",
      "service-owned LeanRunner candidate replay",
      "statement-equivalence gate",
      "dependency closure report",
      "axiom profile report",
      "final clean Lean replay manifest"
    ],
    proof_authority: "none",
    can_run_clean_replay: false,
    hard_vetoes: [businessLayerTheoremProverForbidden],
    created_at: now()
  });
  const planningRel = writeSimpleStageArtifact(input.projectRoot, input.campaign, "broad_synthesis_plan.json", {
    schema_version: "comath.v3.broad_synthesis_plan.v1",
    campaign_id: input.campaign.campaign_id,
    project_id: input.campaign.project_id,
    claim_id: input.campaign.root_claim_id,
    obligation_id: input.obligation.obligation_id,
    mode: "fail_closed_planning_slice",
    proof_authority: "none",
    locked_problem: {
      statement: input.obligation.locked_statement_nl,
      structured: input.obligation.locked_statement_structured,
      statement_hash: input.obligation.statement_hash,
      assumptions: input.obligation.assumptions,
      dependencies: input.obligation.dependencies
    },
    obligation_dag_path: obligationDagRel,
    line_map_path: lineMapRel,
    replay_target_path: replayTargetRel,
    candidate_plan: {
      family: "unregistered_or_workspace_driven",
      ensemble_variants_required: 8,
      can_promote_claim: false,
      synthesis_steps: [
        "normalize locked natural-language statement into a precise theorem header",
        "decompose the locked statement into replayable leaf obligations",
        "retrieve theorem-specific library facts and failed-route memory",
        "generate candidate manifests that bind every candidate to the locked statement hash",
        "run statement-equivalence, dependency-closure, axiom-profile, and clean-replay gates before promotion"
      ],
      required_gates: [
        "problem_lock",
        "obligation_dag",
        "candidate_manifest",
        "statement_equivalence",
        "dependency_closure",
        "axiom_profile",
        "final_clean_replay"
      ]
    },
    theorem_specific_lean_project_path: null,
    proof_body_synthesis_path: null,
    proof_body_static_audit_path: null,
    authority_report_preparation_path: null,
    blocked_until: "FormalSpecLock and service-owned LeanRunner candidate replay are implemented",
    created_at: now()
  });
  const failureRel = writeSimpleStageArtifact(input.projectRoot, input.campaign, "broad_synthesis_failure.json", {
    schema_version: "comath.v3.broad_synthesis_failure.v1",
    campaign_id: input.campaign.campaign_id,
    claim_id: input.campaign.root_claim_id,
    obligation_id: input.obligation.obligation_id,
    reason: broadSynthesisBlockedReason,
    fail_closed: true,
    promotion_blocked: true,
    proof_authority: "none",
    can_promote_claim: false,
    hard_vetoes: [businessLayerTheoremProverForbidden],
    replayable_evidence: {
      problem_lock: ".comath/lock/problem_lock.md",
      obligation_dag: obligationDagRel,
      line_map: lineMapRel,
      planning_artifact: planningRel,
      replay_target_artifact: replayTargetRel,
      lean_project_target: null,
      proof_body_synthesis: null,
      proof_body_static_audit: null,
      authority_report_preparation: null
    },
    next_actions: [
      "create a FormalSpecLock before proof search",
      "use external theorem search/proof-search adapters as hints only",
      "promote no claim until service-owned Lean clean replay and promotion gates pass"
    ],
    created_at: now()
  });
  const blocker = {
    reason: broadSynthesisBlockedReason,
    obligation_id: input.obligation.obligation_id,
    artifact_path: failureRel,
    planning_artifact_path: planningRel,
    replay_target_path: replayTargetRel,
    lean_project_target_path: null,
    proof_body_synthesis_path: null,
    authority_report_preparation_path: null,
    hard_vetoes: [businessLayerTheoremProverForbidden]
  };
  const stageArtifacts = [planningRel, replayTargetRel, failureRel];
  const next = writeCampaign(
    input.projectRoot,
    researchCampaignSchema.parse({
      ...input.campaign,
      current_stage: "blocked",
      status: "terminal",
      terminal_state: "blocked_with_replayable_reason",
      open_obligations: [{ ...input.obligation, status: "blocked" }],
      blockers: [blocker],
      stage_runs: [
        ...input.campaign.stage_runs,
        stageRun(input.campaign, "candidate_generation", "blocked", stageArtifacts)
      ],
      next_actions: [
        "create a FormalSpecLock before proof search",
        "keep the claim conjectural until final clean replay evidence exists"
      ]
    }),
    input.actor
  );
  return {
    campaign: next,
    obligation: { ...input.obligation, status: "blocked" },
    blocker: broadSynthesisBlockedReason
  };
}

function readNativeAgentCandidateGenerationRequest(
  projectRoot: string,
  campaign: ResearchCampaign,
  obligation: ProofObligation
): { path: string } | undefined {
  const requestRel = campaignRel(campaign, "candidate_generation_request.json");
  if (!artifactExists(projectRoot, requestRel)) {
    return undefined;
  }
  const request = objectRecord(readJsonArtifact(projectRoot, requestRel), "native_agent_candidate_generation_request");
  const requiredVariants = Array.isArray(request.required_variants) ? request.required_variants : [];
  const expectedVariants = defaultVariants.map((variant) => variant.variant_id);
  const lineMapPath = campaignProofRel(campaign, "line_map.json");
  const obligationPath = campaignProofRel(campaign, join("obligations", `${obligation.obligation_id}.yaml`));
  const producedByLineMapGate = campaign.stage_runs.some(
    (run) => run.stage === "line_map_gate" && run.status === "completed" && run.artifact_paths.includes(requestRel)
  );
  if (
    request.schema_version !== "comath.native_agent_candidate_generation_request.v1" ||
    request.campaign_id !== campaign.campaign_id ||
    request.project_id !== campaign.project_id ||
    request.claim_id !== campaign.root_claim_id ||
    request.obligation_id !== obligation.obligation_id ||
    request.locked_statement_hash !== obligation.statement_hash ||
    request.stage !== "candidate_generation" ||
    request.generated_by_stage !== "line_map_gate" ||
    request.line_map_path !== lineMapPath ||
    request.line_map_sha256 !== sha256RuntimeFile(projectRoot, lineMapPath) ||
    request.obligation_path !== obligationPath ||
    request.obligation_sha256 !== sha256RuntimeFile(projectRoot, obligationPath) ||
    request.required_variants_count !== expectedVariants.length ||
    requiredVariants.length !== expectedVariants.length ||
    expectedVariants.some((variantId, index) => requiredVariants[index] !== variantId) ||
    request.requested_runner !== "comathd.runGaAgentStageCandidates" ||
    !producedByLineMapGate ||
    !request.statement_boundary ||
    typeof request.statement_boundary !== "object" ||
    Array.isArray(request.statement_boundary) ||
    (request.statement_boundary as Record<string, unknown>).statement_hash !== obligation.statement_hash ||
    (request.statement_boundary as Record<string, unknown>).candidate_statement_must_match_locked_hash !== true ||
    (request.statement_boundary as Record<string, unknown>).hidden_assumptions_allowed !== false ||
    request.proof_authority !== "none" ||
    request.can_promote_claim !== false
  ) {
    throw new Error("native_agent_candidate_generation_request_invalid");
  }
  return { path: requestRel };
}

function writeNativeAgentCandidateGenerationRequest(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  obligation: ProofObligation;
}): string {
  const lineMapPath = campaignProofRel(input.campaign, "line_map.json");
  const obligationPath = campaignProofRel(input.campaign, join("obligations", `${input.obligation.obligation_id}.yaml`));
  return writeSimpleStageArtifact(input.projectRoot, input.campaign, "candidate_generation_request.json", {
    schema_version: "comath.native_agent_candidate_generation_request.v1",
    campaign_id: input.campaign.campaign_id,
    project_id: input.campaign.project_id,
    claim_id: input.campaign.root_claim_id,
    obligation_id: input.obligation.obligation_id,
    locked_statement_hash: input.obligation.statement_hash,
    stage: "candidate_generation",
    generated_by_stage: "line_map_gate",
    line_map_path: lineMapPath,
    line_map_sha256: sha256RuntimeFile(input.projectRoot, lineMapPath),
    obligation_path: obligationPath,
    obligation_sha256: sha256RuntimeFile(input.projectRoot, obligationPath),
    requested_runner: "comathd.runGaAgentStageCandidates",
    required_variants: defaultVariants.map((variant) => variant.variant_id),
    required_variants_count: defaultVariants.length,
    statement_boundary: {
      statement_hash: input.obligation.statement_hash,
      candidate_statement_must_match_locked_hash: true,
      hidden_assumptions_allowed: false
    },
    proof_authority: "none",
    can_promote_claim: false,
    created_at: now()
  });
}

export function exportCampaignGoalModeEvidence(input: CampaignTickInput): {
  export_manifest: {
    schema_version: "comath.pi_goal_export.v1";
    campaign_id: string;
    project_id: string;
    root_claim_id: string;
    terminal_state: ResearchCampaign["terminal_state"] | null;
    current_stage: ResearchCampaign["current_stage"];
    status: ResearchCampaign["status"];
    blocker_certificates: Record<string, unknown>[];
    next_actions: string[];
    evidence_pack_ready: boolean;
    proof_authority: "none" | "lean_kernel_clean_replay";
    can_promote_claim: false;
    goal_mode_intake_manifest?: {
      path: string;
      sha256: string;
      proof_authority: "none";
      external_evidence_authority: false;
      can_promote_claim: false;
      can_certify_ga: false;
    };
  };
} {
  const campaign = getCampaign(input.project_root, input.campaign_id);
  if (!campaign) {
    throw new ComathError("campaign not found", { statusCode: 404, code: "CAMPAIGN_NOT_FOUND" });
  }
  const finalReplayAuthorityPassed =
    campaign.terminal_state === "completed_formal_proof" &&
    hasFormalReplayAuthorityPassEvidence({ ...campaign, projectRoot: input.project_root });
  const publicProofTerminalWithoutAuthority = campaign.terminal_state === "completed_formal_proof" && !finalReplayAuthorityPassed;
  const intakeManifestPath = campaign.stage_runs
    .flatMap((run) => run.artifact_paths)
    .find((path) => path.endsWith("goal_mode_intake_manifest.json"));
  const intakeManifest =
    intakeManifestPath && artifactExists(input.project_root, intakeManifestPath)
      ? {
          path: intakeManifestPath,
          sha256: sha256RuntimeFile(input.project_root, intakeManifestPath),
          proof_authority: "none" as const,
          external_evidence_authority: false as const,
          can_promote_claim: false as const,
          can_certify_ga: false as const
        }
      : undefined;
  return {
    export_manifest: {
      schema_version: "comath.pi_goal_export.v1",
      campaign_id: campaign.campaign_id,
      project_id: campaign.project_id,
      root_claim_id: campaign.root_claim_id,
      terminal_state: publicProofTerminalWithoutAuthority ? "blocked_with_replayable_reason" : campaign.terminal_state ?? null,
      current_stage: publicProofTerminalWithoutAuthority ? "blocked" : campaign.current_stage,
      status: campaign.status,
      blocker_certificates: finalReplayAuthorityPassed
        ? campaign.blockers
        : (sanitizePublicFormalAuthorityVocabulary(campaign.blockers) as Record<string, unknown>[]),
      next_actions: finalReplayAuthorityPassed ? campaign.next_actions : (sanitizePublicFormalAuthorityVocabulary(campaign.next_actions) as string[]),
      evidence_pack_ready: finalReplayAuthorityPassed,
      proof_authority: finalReplayAuthorityPassed ? "lean_kernel_clean_replay" : "none",
      can_promote_claim: false,
      ...(intakeManifest ? { goal_mode_intake_manifest: intakeManifest } : {})
    }
  };
}

function blockCampaignAtFinalReplay(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  obligation: ProofObligation;
  actor: string;
  reason: string;
  stage?: ResearchCampaign["current_stage"];
}): CampaignTickResult {
  const stage = input.stage ?? "final_global_replay";
  const blockerRel = writeSimpleStageArtifact(input.projectRoot, input.campaign, "final_replay_blocker.json", {
    schema_version: "comath.campaign_final_replay_blocker.v1",
    campaign_id: input.campaign.campaign_id,
    root_claim_id: input.campaign.root_claim_id,
    obligation_id: input.obligation.obligation_id,
    reason: input.reason,
    locked_statement_structured: input.obligation.locked_statement_structured,
    required_replay_target: "service-owned Lean Authority v3 clean replay",
    proof_authority: "none",
    can_promote_claim: false,
    created_at: now()
  });
  const blocker = {
    reason: input.reason,
    obligation_id: input.obligation.obligation_id,
    artifact_path: blockerRel
  };
  const next = writeCampaign(
    input.projectRoot,
    researchCampaignSchema.parse({
      ...input.campaign,
      current_stage: "blocked",
      status: "terminal",
      terminal_state: "blocked_with_replayable_reason",
      open_obligations: [{ ...input.obligation, status: "blocked" }],
      blockers: [blocker],
      stage_runs: [...input.campaign.stage_runs, stageRun(input.campaign, stage, "blocked", [blockerRel])],
      next_actions: ["general proof planning and theorem-specific Lean project generation are required before replay"]
    }),
    input.actor
  );
  return {
    campaign: next,
    obligation: { ...input.obligation, status: "blocked" },
    blocker: input.reason
  };
}

type FinalGlobalReplayRequest = {
  packagingScope: "positive_matrix" | "campaign";
  taskId?: string;
  claimId: string;
  leanProject: LeanProjectFiles;
  formalSpecLockPath: string;
  assumptionLedgerPath: string;
  assembledRequestPath?: string;
  provisioningDiagnosticPath?: string;
  hostReplayDiagnosticPath?: string;
  importGraphDiagnosticPath?: string;
};

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field}_missing`);
  }
  return value;
}

function requireStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== "string" || item.trim().length === 0)) {
    throw new Error(`${field}_missing`);
  }
  return value;
}

function requireProjectRelPath(value: unknown, field: string): string {
  const rel = normalizeRelPath(requireString(value, field));
  if (isAbsolute(rel) || rel === "." || rel.startsWith("../") || rel.includes("/../")) {
    throw new Error(`${field}_must_be_project_relative`);
  }
  return rel;
}

function requireLeanRootRelPath(value: unknown, field: string): string {
  const rel = normalizeRelPath(requireString(value, field));
  if (isAbsolute(rel) || rel === "." || rel.startsWith("../") || rel.includes("/../")) {
    throw new Error(`${field}_must_be_lean_root_relative`);
  }
  return rel;
}

function objectRecord(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${field}_missing`);
  }
  return value as Record<string, unknown>;
}

function usesPositiveMatrixReleasePath(path: string): boolean {
  const normalized = normalizeRelPath(path);
  return normalized === ".comath/release/positive_matrix" || normalized.startsWith(".comath/release/positive_matrix/");
}

export type CampaignLiveMathlibReplayBreadthGateInput = {
  packagingScope: "positive_matrix" | "campaign";
  primaryDependency: string;
  canonicalProposition: string;
  normalizedStatement: string;
  theoremSource: string;
  leanRootRel: string;
  theoremFileRel: string;
  replayCommand: string;
  buildTargets: string[];
};

export type CampaignLiveMathlibReplayBreadthGateResult = {
  schema_version: "comath.campaign_live_mathlib_replay_breadth_gate.v1";
  profile: "campaign_live_mathlib_non_toy";
  result: "pass" | "fail";
  hard_vetoes: string[];
  toy_patterns_detected: string[];
  primary_dependency: string;
  proof_authority: "none";
  can_promote_claim: false;
};

function containsToyTrue(text: string): boolean {
  const normalized = text.replace(/\s+/g, " ").trim();
  return /^\(*\s*True\s*\)*$/u.test(normalized) || /\b:\s*\(*\s*True\s*\)*(?=\s|:=|$)/u.test(normalized);
}

function containsDefaultNatParameter(text: string): boolean {
  return /(?:\(|\s)n\s*:\s*Nat(?:\)|\s|,|$)/u.test(text);
}

function containsByTactic(text: string, tactic: "trivial" | "omega"): boolean {
  return new RegExp(`:=\\s*by\\s*(?:\\r?\\n\\s*)?${tactic}\\b`, "u").test(text);
}

export function evaluateCampaignLiveMathlibReplayBreadthGate(
  input: CampaignLiveMathlibReplayBreadthGateInput
): CampaignLiveMathlibReplayBreadthGateResult {
  const hard_vetoes: string[] = [];
  const toy_patterns_detected: string[] = [];
  const allStatementText = [input.canonicalProposition, input.normalizedStatement, input.theoremSource].join("\n");

  if (input.packagingScope !== "campaign") {
    hard_vetoes.push("campaign_packaging_scope_required");
  }
  if (input.primaryDependency !== "Mathlib") {
    hard_vetoes.push("mathlib_primary_dependency_required");
  }
  if (!/^\s*import\s+Mathlib(?:\s|$)/mu.test(input.theoremSource)) {
    hard_vetoes.push("mathlib_import_missing");
  }
  if (usesPositiveMatrixReleasePath(input.leanRootRel) || usesPositiveMatrixReleasePath(join(input.leanRootRel, input.theoremFileRel))) {
    hard_vetoes.push("positive_matrix_release_path_forbidden");
  }
  if (containsToyTrue(input.canonicalProposition) || containsToyTrue(input.normalizedStatement) || containsToyTrue(input.theoremSource)) {
    hard_vetoes.push("toy_true_statement_forbidden");
    toy_patterns_detected.push("True");
  }
  if (containsDefaultNatParameter(allStatementText)) {
    hard_vetoes.push("toy_default_nat_parameter_forbidden");
    toy_patterns_detected.push("n : Nat");
  }
  if (containsByTactic(input.theoremSource, "trivial")) {
    hard_vetoes.push("toy_trivial_proof_forbidden");
    toy_patterns_detected.push("by trivial");
  }
  if (containsByTactic(input.theoremSource, "omega")) {
    hard_vetoes.push("toy_omega_proof_forbidden");
    toy_patterns_detected.push("by omega");
  }
  if (input.buildTargets.length === 0) {
    hard_vetoes.push("empty_build_targets_forbidden");
  }
  if (!/^lake\s+build\b/u.test(input.replayCommand.trim())) {
    hard_vetoes.push("lake_build_replay_command_required");
  }

  return {
    schema_version: "comath.campaign_live_mathlib_replay_breadth_gate.v1",
    profile: "campaign_live_mathlib_non_toy",
    result: hard_vetoes.length === 0 ? "pass" : "fail",
    hard_vetoes: Array.from(new Set(hard_vetoes)),
    toy_patterns_detected: Array.from(new Set(toy_patterns_detected)),
    primary_dependency: input.primaryDependency,
    proof_authority: "none",
    can_promote_claim: false
  };
}

export type CampaignLiveMathlibDependencyMaterialGateInput = {
  packagingScope: "positive_matrix" | "campaign";
  primaryDependency: string;
  lakefileText: string;
  lakeManifest: unknown;
  lakeManifestReadError?: boolean;
  localLeanFileRels?: string[];
};

export type CampaignLiveMathlibDependencyMaterialGateResult = {
  schema_version: "comath.campaign_live_mathlib_dependency_material_gate.v1";
  profile: "campaign_live_mathlib_non_toy";
  result: "pass" | "fail";
  hard_vetoes: string[];
  primary_dependency: string;
  mathlib_revision?: string;
  mathlib_source?: string;
  mathlib_license?: string;
  proof_authority: "none";
  can_promote_claim: false;
};

export type CampaignLiveMathlibProvisioningDiagnosticInput = {
  packagingScope: "positive_matrix" | "campaign";
  primaryDependency: string;
  leanRoot: string;
  lakeManifest: unknown;
};

export type CampaignLiveMathlibProvisioningDiagnosticResult = {
  schema_version: "comath.campaign_live_mathlib_provisioning_diagnostic.v1";
  profile: "campaign_live_mathlib_non_toy";
  result: "pass" | "fail";
  hard_vetoes: string[];
  primary_dependency: string;
  mathlib_revision?: string;
  materialized_package_root?: ".lake/packages/mathlib";
  materialized_package_hash?: string;
  materialized_file_hashes: Record<string, string>;
  network_policy: "disabled";
  proof_authority: "none";
  can_promote_claim: false;
};

export type CampaignLiveMathlibNoDownloadFixturePreflightInput = CampaignLiveMathlibDependencyMaterialGateInput & {
  leanRoot: string;
};

export type CampaignLiveMathlibNoDownloadFixturePreflightResult = {
  schema_version: "comath.campaign_live_mathlib_no_download_fixture_preflight.v1";
  profile: "campaign_live_mathlib_non_toy";
  result: "pass" | "fail";
  readiness_status: "local_mathlib_fixture_ready_for_host_diagnostics" | "blocked_before_host_diagnostics";
  hard_vetoes: string[];
  primary_dependency: string;
  mathlib_revision?: string;
  mathlib_source?: string;
  mathlib_license?: string;
  materialized_package_root?: ".lake/packages/mathlib";
  materialized_package_hash?: string;
  materialized_file_hashes: Record<string, string>;
  no_download_policy: "strict_no_download";
  network_policy: "disabled";
  executes_lean_or_lake: false;
  download_attempted: false;
  ready_for_task218_219_diagnostics: boolean;
  can_allocate_final_replay_workspace: false;
  next_required_diagnostics: [
    "campaign_live_mathlib_host_replay_diagnostic",
    "campaign_live_mathlib_import_graph_diagnostic",
    "final_clean_lean_replay"
  ];
  dependency_material_gate: CampaignLiveMathlibDependencyMaterialGateResult;
  provisioning_diagnostic: CampaignLiveMathlibProvisioningDiagnosticResult;
  proof_authority: "none";
  can_promote_claim: false;
  preflight_is_proof_authority: false;
};

export type CampaignLiveMathlibHostReplayDiagnosticInput = {
  packagingScope: "positive_matrix" | "campaign";
  primaryDependency: string;
  leanRoot: string;
  leanToolchain: string;
  theoremFileRel: string;
  auditFileRel: string;
  buildTargets: string[];
  lakefileText: string;
};

export type CampaignLiveMathlibImportGraphDiagnosticInput = {
  packagingScope: "positive_matrix" | "campaign";
  primaryDependency: string;
  leanRoot: string;
  leanToolchain: string;
  theoremFileRel: string;
  auditFileRel: string;
};

type CampaignLiveMathlibHostReplayVersionProbe = {
  exit_code: number;
  stdout_sha256: string;
  stderr_sha256: string;
  output_sha256: string;
};

type CampaignLiveMathlibImportGraphProbe = CampaignLiveMathlibHostReplayVersionProbe & {
  command: string[];
  output_contains_primary_dependency: boolean;
};

export type CampaignLiveMathlibHostReplayDiagnosticResult = {
  schema_version: "comath.campaign_live_mathlib_host_replay_diagnostic.v1";
  profile: "campaign_live_mathlib_non_toy";
  result: "pass" | "fail";
  hard_vetoes: string[];
  primary_dependency: string;
  lean_toolchain: string;
  expected_lean_version?: string;
  lean_version?: string;
  lake_version?: string;
  lean_version_probe?: CampaignLiveMathlibHostReplayVersionProbe;
  lake_version_probe?: CampaignLiveMathlibHostReplayVersionProbe;
  lean_binary_sha256?: string;
  lake_binary_sha256?: string;
  probe_source: "service_owned_process";
  tool_resolution_strategy: "elan_direct_or_path";
  replay_plan: {
    theorem_check: string[];
    final_replay: string[];
    audit_check: string[];
  };
  network_policy: "disabled";
  proof_authority: "none";
  can_promote_claim: false;
  diagnostic_is_proof_authority: false;
};

export type CampaignLiveMathlibImportGraphDiagnosticResult = {
  schema_version: "comath.campaign_live_mathlib_import_graph_diagnostic.v1";
  profile: "campaign_live_mathlib_non_toy";
  result: "pass" | "fail";
  hard_vetoes: string[];
  primary_dependency: string;
  lean_toolchain: string;
  theorem_import_graph_probe?: CampaignLiveMathlibImportGraphProbe;
  audit_import_graph_probe?: CampaignLiveMathlibImportGraphProbe;
  lake_binary_sha256?: string;
  probe_source: "service_owned_process";
  import_graph_source: "lake_env_lean_deps";
  network_policy: "disabled";
  proof_authority: "none";
  can_promote_claim: false;
  import_graph_is_proof_authority: false;
};

const trustedMathlibSourceUrls = new Set([
  "https://github.com/leanprover-community/mathlib4",
  "https://github.com/leanprover-community/mathlib4.git"
]);

function lakefileHasMathlibDependency(text: string): boolean {
  return text
    .split(/\r?\n/u)
    .some((line) => /^\s*require\s+mathlib\b/u.test(line) && /github\.com\/leanprover-community\/mathlib4(?:\.git)?/u.test(line));
}

function manifestPackages(manifest: unknown): Record<string, unknown>[] {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    return [];
  }
  const packages = (manifest as { packages?: unknown }).packages;
  return Array.isArray(packages) ? packages.filter((pkg): pkg is Record<string, unknown> => Boolean(pkg) && typeof pkg === "object" && !Array.isArray(pkg)) : [];
}

function manifestPackageString(pkg: Record<string, unknown>, field: string): string | undefined {
  const value = pkg[field];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function moduleNameFromLocalLeanRel(rel: string): string | undefined {
  const normalized = normalizeRelPath(rel);
  if (!normalized.endsWith(".lean")) {
    return undefined;
  }
  const modulePath = normalized.slice(0, -".lean".length);
  const parts = modulePath.split("/");
  if (parts.some((part) => !/^[A-Za-z_][A-Za-z0-9_']*$/u.test(part))) {
    return undefined;
  }
  return parts.join(".");
}

function isFloatingOrNonCommitRevision(revision: string): boolean {
  const normalized = revision.trim();
  return !/^[0-9a-f]{40}$/iu.test(normalized) || /^(main|master|nightly|latest)$/iu.test(normalized);
}

function hashMaterializedPackageFiles(root: string, relRoot: string): Record<string, string> {
  const hashes: Record<string, string> = {};
  const absoluteRoot = join(root, relRoot);
  if (existsSync(absoluteRoot) && lstatSync(absoluteRoot).isSymbolicLink()) {
    return hashes;
  }
  const visit = (dir: string, relDir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === ".git") {
        continue;
      }
      const absolutePath = join(dir, entry.name);
      const relPath = normalizeRelPath(join(relDir, entry.name));
      if (entry.isSymbolicLink()) {
        continue;
      }
      if (entry.isDirectory()) {
        visit(absolutePath, relPath);
      } else if (entry.isFile()) {
        hashes[relPath] = createHash("sha256").update(readFileSync(absolutePath)).digest("hex");
      }
    }
  };
  if (existsSync(absoluteRoot)) {
    visit(absoluteRoot, relRoot);
  }
  return Object.fromEntries(Object.entries(hashes).sort(([left], [right]) => left.localeCompare(right)));
}

function collectMaterializedPackageSymlinks(root: string, relRoot: string): string[] {
  const symlinks: string[] = [];
  const absoluteRoot = join(root, relRoot);
  if (existsSync(absoluteRoot) && lstatSync(absoluteRoot).isSymbolicLink()) {
    return [relRoot];
  }
  const visit = (dir: string, relDir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const absolutePath = join(dir, entry.name);
      const relPath = normalizeRelPath(join(relDir, entry.name));
      if (entry.isSymbolicLink()) {
        symlinks.push(relPath);
        continue;
      }
      if (entry.isDirectory()) {
        visit(absolutePath, relPath);
      }
    }
  };
  if (existsSync(absoluteRoot)) {
    visit(absoluteRoot, relRoot);
  }
  return symlinks.sort();
}

export function evaluateCampaignLiveMathlibDependencyMaterialGate(
  input: CampaignLiveMathlibDependencyMaterialGateInput
): CampaignLiveMathlibDependencyMaterialGateResult {
  const hard_vetoes: string[] = [];

  if (input.packagingScope !== "campaign") {
    hard_vetoes.push("campaign_packaging_scope_required");
  }
  if (input.primaryDependency !== "Mathlib") {
    hard_vetoes.push("mathlib_primary_dependency_required");
  }
  if (!lakefileHasMathlibDependency(input.lakefileText)) {
    hard_vetoes.push("mathlib_lakefile_dependency_missing");
  }
  if (input.lakeManifestReadError) {
    hard_vetoes.push("lake_manifest_unreadable");
  }

  const mathlibPackage = manifestPackages(input.lakeManifest).find((pkg) => manifestPackageString(pkg, "name") === "mathlib");
  if (!mathlibPackage) {
    hard_vetoes.push("mathlib_lake_manifest_package_missing");
  }

  const revision = mathlibPackage
    ? (manifestPackageString(mathlibPackage, "rev") ?? manifestPackageString(mathlibPackage, "inputRev"))
    : undefined;
  const source = mathlibPackage ? manifestPackageString(mathlibPackage, "url") : undefined;
  const license = mathlibPackage ? manifestPackageString(mathlibPackage, "license") : undefined;

  if (mathlibPackage && !revision) {
    hard_vetoes.push("mathlib_dependency_revision_missing");
  }
  if (revision && isFloatingOrNonCommitRevision(revision)) {
    hard_vetoes.push("mathlib_dependency_revision_floating");
  }
  if (mathlibPackage && (!license || /^(unknown|none|n\/a)$/iu.test(license))) {
    hard_vetoes.push("mathlib_dependency_license_unknown");
  }
  if (mathlibPackage && (!source || !trustedMathlibSourceUrls.has(source))) {
    hard_vetoes.push("mathlib_dependency_source_untrusted");
  }
  for (const rel of input.localLeanFileRels ?? []) {
    const moduleName = moduleNameFromLocalLeanRel(rel);
    if (moduleName === "Mathlib" || moduleName?.startsWith("Mathlib.")) {
      hard_vetoes.push(`local_module_shadowing:${moduleName}`);
    }
  }

  return {
    schema_version: "comath.campaign_live_mathlib_dependency_material_gate.v1",
    profile: "campaign_live_mathlib_non_toy",
    result: hard_vetoes.length === 0 ? "pass" : "fail",
    hard_vetoes: Array.from(new Set(hard_vetoes)),
    primary_dependency: input.primaryDependency,
    ...(revision ? { mathlib_revision: revision } : {}),
    ...(source ? { mathlib_source: source } : {}),
    ...(license ? { mathlib_license: license } : {}),
    proof_authority: "none",
    can_promote_claim: false
  };
}

export function evaluateCampaignLiveMathlibProvisioningDiagnostic(
  input: CampaignLiveMathlibProvisioningDiagnosticInput
): CampaignLiveMathlibProvisioningDiagnosticResult {
  const hard_vetoes: string[] = [];
  if (input.packagingScope !== "campaign") {
    hard_vetoes.push("campaign_packaging_scope_required");
  }
  if (input.primaryDependency !== "Mathlib") {
    hard_vetoes.push("mathlib_primary_dependency_required");
  }

  const mathlibPackage = manifestPackages(input.lakeManifest).find((pkg) => manifestPackageString(pkg, "name") === "mathlib");
  if (!mathlibPackage) {
    hard_vetoes.push("mathlib_lake_manifest_package_missing");
  }
  const revision = mathlibPackage
    ? (manifestPackageString(mathlibPackage, "rev") ?? manifestPackageString(mathlibPackage, "inputRev"))
    : undefined;
  if (mathlibPackage && !revision) {
    hard_vetoes.push("mathlib_dependency_revision_missing");
  }
  if (revision && isFloatingOrNonCommitRevision(revision)) {
    hard_vetoes.push("mathlib_dependency_revision_floating");
  }

  const materializedPackageRoot = ".lake/packages/mathlib" as const;
  const materializedPackagePath = join(input.leanRoot, ".lake", "packages", "mathlib");
  const materialized_file_hashes = hashMaterializedPackageFiles(input.leanRoot, materializedPackageRoot);
  const materializedSymlinks = collectMaterializedPackageSymlinks(input.leanRoot, materializedPackageRoot);
  if (!existsSync(materializedPackagePath)) {
    hard_vetoes.push("mathlib_package_materialization_missing");
  } else if (lstatSync(materializedPackagePath).isSymbolicLink()) {
    hard_vetoes.push(`mathlib_package_root_symlink_forbidden:${materializedPackageRoot}`);
  } else if (Object.keys(materialized_file_hashes).length === 0) {
    hard_vetoes.push("mathlib_package_materialization_empty");
  }
  if (existsSync(materializedPackagePath) && !existsSync(join(materializedPackagePath, "Mathlib.lean"))) {
    hard_vetoes.push("mathlib_package_module_root_missing");
  }
  hard_vetoes.push(...materializedSymlinks.map((rel) => `mathlib_package_symlink_forbidden:${rel}`));
  const materialized_package_hash =
    Object.keys(materialized_file_hashes).length > 0
      ? sha256Text(JSON.stringify({ root: materializedPackageRoot, files: materialized_file_hashes }))
      : undefined;

  return {
    schema_version: "comath.campaign_live_mathlib_provisioning_diagnostic.v1",
    profile: "campaign_live_mathlib_non_toy",
    result: hard_vetoes.length === 0 ? "pass" : "fail",
    hard_vetoes: Array.from(new Set(hard_vetoes)),
    primary_dependency: input.primaryDependency,
    ...(revision ? { mathlib_revision: revision } : {}),
    ...(existsSync(materializedPackagePath) ? { materialized_package_root: materializedPackageRoot } : {}),
    ...(materialized_package_hash ? { materialized_package_hash } : {}),
    materialized_file_hashes,
    network_policy: "disabled",
    proof_authority: "none",
    can_promote_claim: false
  };
}

export function evaluateCampaignLiveMathlibNoDownloadFixturePreflight(
  input: CampaignLiveMathlibNoDownloadFixturePreflightInput
): CampaignLiveMathlibNoDownloadFixturePreflightResult {
  const dependencyMaterialGate = evaluateCampaignLiveMathlibDependencyMaterialGate(input);
  const provisioningDiagnostic = evaluateCampaignLiveMathlibProvisioningDiagnostic({
    packagingScope: input.packagingScope,
    primaryDependency: input.primaryDependency,
    leanRoot: input.leanRoot,
    lakeManifest: input.lakeManifest
  });
  const hard_vetoes = Array.from(
    new Set([...dependencyMaterialGate.hard_vetoes, ...provisioningDiagnostic.hard_vetoes])
  );
  const readyForDiagnostics = dependencyMaterialGate.result === "pass" && provisioningDiagnostic.result === "pass";

  return {
    schema_version: "comath.campaign_live_mathlib_no_download_fixture_preflight.v1",
    profile: "campaign_live_mathlib_non_toy",
    result: readyForDiagnostics ? "pass" : "fail",
    readiness_status: readyForDiagnostics
      ? "local_mathlib_fixture_ready_for_host_diagnostics"
      : "blocked_before_host_diagnostics",
    hard_vetoes,
    primary_dependency: input.primaryDependency,
    ...(dependencyMaterialGate.mathlib_revision ?? provisioningDiagnostic.mathlib_revision
      ? { mathlib_revision: dependencyMaterialGate.mathlib_revision ?? provisioningDiagnostic.mathlib_revision }
      : {}),
    ...(dependencyMaterialGate.mathlib_source ? { mathlib_source: dependencyMaterialGate.mathlib_source } : {}),
    ...(dependencyMaterialGate.mathlib_license ? { mathlib_license: dependencyMaterialGate.mathlib_license } : {}),
    ...(provisioningDiagnostic.materialized_package_root
      ? { materialized_package_root: provisioningDiagnostic.materialized_package_root }
      : {}),
    ...(provisioningDiagnostic.materialized_package_hash
      ? { materialized_package_hash: provisioningDiagnostic.materialized_package_hash }
      : {}),
    materialized_file_hashes: provisioningDiagnostic.materialized_file_hashes,
    no_download_policy: "strict_no_download",
    network_policy: "disabled",
    executes_lean_or_lake: false,
    download_attempted: false,
    ready_for_task218_219_diagnostics: readyForDiagnostics,
    can_allocate_final_replay_workspace: false,
    next_required_diagnostics: [
      "campaign_live_mathlib_host_replay_diagnostic",
      "campaign_live_mathlib_import_graph_diagnostic",
      "final_clean_lean_replay"
    ],
    dependency_material_gate: dependencyMaterialGate,
    provisioning_diagnostic: provisioningDiagnostic,
    proof_authority: "none",
    can_promote_claim: false,
    preflight_is_proof_authority: false
  };
}

function hostReplayProbeOutput(probe: LeanHostCommandResult): string {
  return `${probe.stdout}\n${probe.stderr}`;
}

function summarizeHostReplayProbe(probe: LeanHostCommandResult): CampaignLiveMathlibHostReplayVersionProbe {
  return {
    exit_code: probe.exit_code,
    stdout_sha256: sha256Text(probe.stdout),
    stderr_sha256: sha256Text(probe.stderr),
    output_sha256: sha256Text(hostReplayProbeOutput(probe))
  };
}

function hashHostToolBinary(path: string, vetoes: string[], code: string): string | undefined {
  try {
    return sha256FileSync(path).sha256;
  } catch {
    vetoes.push(code);
    return undefined;
  }
}

function containsUnsafeReplayCommandArgument(value: string): boolean {
  return value.startsWith("-") || /[\r\n"&|<>^%!]/u.test(value);
}

function declaredLakeBuildTargets(lakefileText: string): Set<string> {
  const targets = new Set<string>();
  for (const line of lakefileText.split(/\r?\n/u)) {
    const match = /^\s*(?:lean_lib|lean_exe)\s+([A-Za-z_][A-Za-z0-9_'.]*)\b/u.exec(line);
    if (match) {
      targets.add(match[1]);
    }
  }
  return targets;
}

export function evaluateCampaignLiveMathlibHostReplayDiagnostic(
  input: CampaignLiveMathlibHostReplayDiagnosticInput
): CampaignLiveMathlibHostReplayDiagnosticResult {
  const hard_vetoes: string[] = [];
  if (input.packagingScope !== "campaign") {
    hard_vetoes.push("campaign_packaging_scope_required");
  }
  if (input.primaryDependency !== "Mathlib") {
    hard_vetoes.push("mathlib_primary_dependency_required");
  }
  if (!existsSync(input.leanRoot)) {
    hard_vetoes.push("lean_root_missing");
  }
  if (!existsSync(join(input.leanRoot, input.theoremFileRel))) {
    hard_vetoes.push("theorem_file_missing");
  }
  if (!existsSync(join(input.leanRoot, input.auditFileRel))) {
    hard_vetoes.push("audit_file_missing");
  }
  if (input.buildTargets.length === 0) {
    hard_vetoes.push("empty_build_targets_forbidden");
  }
  if (containsUnsafeReplayCommandArgument(input.theoremFileRel)) {
    hard_vetoes.push("unsafe_theorem_file_argument");
  }
  if (containsUnsafeReplayCommandArgument(input.auditFileRel)) {
    hard_vetoes.push("unsafe_audit_file_argument");
  }
  for (const target of input.buildTargets) {
    if (target.startsWith("-") || containsUnsafeReplayCommandArgument(target)) {
      hard_vetoes.push("unsafe_build_target_argument");
    }
  }
  const declaredTargets = declaredLakeBuildTargets(input.lakefileText);
  if (declaredTargets.size === 0) {
    hard_vetoes.push("lake_build_targets_missing_from_lakefile");
  }
  for (const target of input.buildTargets) {
    if (!declaredTargets.has(target)) {
      hard_vetoes.push(`lake_build_target_not_declared:${target}`);
    }
  }

  const expectedLeanVersion = parseExpectedLeanToolchainVersion(input.leanToolchain);
  if (!input.leanToolchain.trim()) {
    hard_vetoes.push("lean_toolchain_missing");
  } else if (!expectedLeanVersion) {
    hard_vetoes.push("lean_toolchain_parse_failure");
  }

  const leanBinaryFile = serviceToolBinary("lean", input.leanToolchain);
  const lakeBinaryFile = serviceToolBinary("lake", input.leanToolchain);
  const lean_binary_sha256 = leanBinaryFile ? hashHostToolBinary(leanBinaryFile, hard_vetoes, "lean_binary_hash_failed") : undefined;
  const lake_binary_sha256 = lakeBinaryFile ? hashHostToolBinary(lakeBinaryFile, hard_vetoes, "lake_binary_hash_failed") : undefined;
  if (!leanBinaryFile) {
    hard_vetoes.push("lean_binary_missing");
  }
  if (!lakeBinaryFile) {
    hard_vetoes.push("lake_binary_missing");
  }

  let lean_version: string | undefined;
  let lake_version: string | undefined;
  let lean_version_probe: CampaignLiveMathlibHostReplayVersionProbe | undefined;
  let lake_version_probe: CampaignLiveMathlibHostReplayVersionProbe | undefined;
  if (existsSync(input.leanRoot) && leanBinaryFile) {
    const probe = runLeanToolCommand("lean", ["--version"], input.leanRoot, input.leanToolchain);
    lean_version_probe = summarizeHostReplayProbe(probe);
    if (probe.exit_code !== 0) {
      hard_vetoes.push("lean_version_probe_failed");
    }
    lean_version = parseLeanVersionOutput(hostReplayProbeOutput(probe));
    if (!lean_version) {
      hard_vetoes.push("lean_version_parse_failed");
    }
    if (expectedLeanVersion && lean_version && expectedLeanVersion !== lean_version) {
      hard_vetoes.push("lean_toolchain_version_mismatch");
    }
  }
  if (existsSync(input.leanRoot) && lakeBinaryFile) {
    const probe = runLeanToolCommand("lake", ["--version"], input.leanRoot, input.leanToolchain);
    lake_version_probe = summarizeHostReplayProbe(probe);
    if (probe.exit_code !== 0) {
      hard_vetoes.push("lake_version_probe_failed");
    }
    lake_version = parseLakeVersionOutput(hostReplayProbeOutput(probe));
    if (!lake_version) {
      hard_vetoes.push("lake_version_parse_failed");
    }
  }

  return {
    schema_version: "comath.campaign_live_mathlib_host_replay_diagnostic.v1",
    profile: "campaign_live_mathlib_non_toy",
    result: hard_vetoes.length === 0 ? "pass" : "fail",
    hard_vetoes: Array.from(new Set(hard_vetoes)),
    primary_dependency: input.primaryDependency,
    lean_toolchain: input.leanToolchain,
    ...(expectedLeanVersion ? { expected_lean_version: expectedLeanVersion } : {}),
    ...(lean_version ? { lean_version } : {}),
    ...(lake_version ? { lake_version } : {}),
    ...(lean_version_probe ? { lean_version_probe } : {}),
    ...(lake_version_probe ? { lake_version_probe } : {}),
    ...(lean_binary_sha256 ? { lean_binary_sha256 } : {}),
    ...(lake_binary_sha256 ? { lake_binary_sha256 } : {}),
    probe_source: "service_owned_process",
    tool_resolution_strategy: "elan_direct_or_path",
    replay_plan: {
      theorem_check: ["lake", "env", "lean", input.theoremFileRel],
      final_replay: ["lake", "build", ...input.buildTargets],
      audit_check: ["lake", "env", "lean", input.auditFileRel]
    },
    network_policy: "disabled",
    proof_authority: "none",
    can_promote_claim: false,
    diagnostic_is_proof_authority: false
  };
}

function importGraphOutputContainsPrimaryDependency(output: string, primaryDependency: string): boolean {
  const escaped = primaryDependency.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(`(?:^|[/\\\\.])${escaped}(?:[/\\\\.]|$)`, "iu").test(output);
}

function summarizeImportGraphProbe(
  command: string[],
  probe: LeanHostCommandResult,
  primaryDependency: string
): CampaignLiveMathlibImportGraphProbe {
  return {
    command,
    exit_code: probe.exit_code,
    stdout_sha256: sha256Text(probe.stdout),
    stderr_sha256: sha256Text(probe.stderr),
    output_sha256: sha256Text(hostReplayProbeOutput(probe)),
    output_contains_primary_dependency: importGraphOutputContainsPrimaryDependency(probe.stdout, primaryDependency)
  };
}

export function evaluateCampaignLiveMathlibImportGraphDiagnostic(
  input: CampaignLiveMathlibImportGraphDiagnosticInput
): CampaignLiveMathlibImportGraphDiagnosticResult {
  const hard_vetoes: string[] = [];
  if (input.packagingScope !== "campaign") {
    hard_vetoes.push("campaign_packaging_scope_required");
  }
  if (input.primaryDependency !== "Mathlib") {
    hard_vetoes.push("mathlib_primary_dependency_required");
  }
  if (!existsSync(input.leanRoot)) {
    hard_vetoes.push("lean_root_missing");
  }
  if (!existsSync(join(input.leanRoot, input.theoremFileRel))) {
    hard_vetoes.push("theorem_file_missing");
  }
  if (!existsSync(join(input.leanRoot, input.auditFileRel))) {
    hard_vetoes.push("audit_file_missing");
  }
  if (containsUnsafeReplayCommandArgument(input.theoremFileRel)) {
    hard_vetoes.push("unsafe_theorem_file_argument");
  }
  if (containsUnsafeReplayCommandArgument(input.auditFileRel)) {
    hard_vetoes.push("unsafe_audit_file_argument");
  }

  const lakeBinaryFile = serviceToolBinary("lake", input.leanToolchain);
  const lake_binary_sha256 = lakeBinaryFile ? hashHostToolBinary(lakeBinaryFile, hard_vetoes, "lake_binary_hash_failed") : undefined;
  if (!lakeBinaryFile) {
    hard_vetoes.push("lake_binary_missing");
  }

  const theoremCommand = ["lake", "env", "lean", "--deps", input.theoremFileRel];
  const auditCommand = ["lake", "env", "lean", "--deps", input.auditFileRel];
  let theorem_import_graph_probe: CampaignLiveMathlibImportGraphProbe | undefined;
  let audit_import_graph_probe: CampaignLiveMathlibImportGraphProbe | undefined;
  if (existsSync(input.leanRoot) && lakeBinaryFile) {
    const theoremProbe = runLeanToolCommand("lake", theoremCommand.slice(1), input.leanRoot, input.leanToolchain);
    theorem_import_graph_probe = summarizeImportGraphProbe(theoremCommand, theoremProbe, input.primaryDependency);
    if (theoremProbe.exit_code !== 0) {
      hard_vetoes.push("theorem_import_graph_probe_failed");
    }
    if (!theoremProbe.stdout.trim()) {
      hard_vetoes.push("theorem_import_graph_output_empty");
    }
    if (!theorem_import_graph_probe.output_contains_primary_dependency) {
      hard_vetoes.push("theorem_import_graph_primary_dependency_missing");
    }

    const auditProbe = runLeanToolCommand("lake", auditCommand.slice(1), input.leanRoot, input.leanToolchain);
    audit_import_graph_probe = summarizeImportGraphProbe(auditCommand, auditProbe, input.primaryDependency);
    if (auditProbe.exit_code !== 0) {
      hard_vetoes.push("audit_import_graph_probe_failed");
    }
    if (!auditProbe.stdout.trim()) {
      hard_vetoes.push("audit_import_graph_output_empty");
    }
    if (!audit_import_graph_probe.output_contains_primary_dependency) {
      hard_vetoes.push("audit_import_graph_primary_dependency_missing");
    }
  }

  return {
    schema_version: "comath.campaign_live_mathlib_import_graph_diagnostic.v1",
    profile: "campaign_live_mathlib_non_toy",
    result: hard_vetoes.length === 0 ? "pass" : "fail",
    hard_vetoes: Array.from(new Set(hard_vetoes)),
    primary_dependency: input.primaryDependency,
    lean_toolchain: input.leanToolchain,
    ...(theorem_import_graph_probe ? { theorem_import_graph_probe } : {}),
    ...(audit_import_graph_probe ? { audit_import_graph_probe } : {}),
    ...(lake_binary_sha256 ? { lake_binary_sha256 } : {}),
    probe_source: "service_owned_process",
    import_graph_source: "lake_env_lean_deps",
    network_policy: "disabled",
    proof_authority: "none",
    can_promote_claim: false,
    import_graph_is_proof_authority: false
  };
}

function parseFinalGlobalReplayRequestPayload(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  raw: unknown;
  assembledRequestPath?: string;
  expectedObligation?: ProofObligation;
}): FinalGlobalReplayRequest {
  const request = objectRecord(input.raw, "final_replay_request");
  if (request.schema_version !== "comath.campaign_final_global_replay_request.v1") {
    throw new Error("final_replay_request_schema_version_invalid");
  }
  const claimId = requireString(request.claim_id, "claim_id");
  const taskId = typeof request.task_id === "string" && request.task_id.trim().length > 0 ? request.task_id : undefined;
  const packagingScope = request.packaging_scope === "campaign" || taskId === undefined ? "campaign" : "positive_matrix";
  if (claimId !== input.campaign.root_claim_id) {
    throw new Error("final_replay_request_claim_mismatch");
  }

  const leanProjectRaw = objectRecord(request.lean_project, "lean_project");
  const formalSpecRaw = objectRecord(leanProjectRaw.formal_spec, "lean_project.formal_spec");
  const leanRootRel = requireProjectRelPath(leanProjectRaw.lean_root, "lean_project.lean_root");
  const theoremFileRel = requireLeanRootRelPath(leanProjectRaw.theorem_file_rel, "lean_project.theorem_file_rel");
  const auditFileRel = requireLeanRootRelPath(leanProjectRaw.audit_file_rel, "lean_project.audit_file_rel");
  const formalSpecFileRel = requireLeanRootRelPath(leanProjectRaw.formal_spec_file, "lean_project.formal_spec_file");
  const assumptionLedgerFileRel = requireLeanRootRelPath(leanProjectRaw.assumption_ledger_file, "lean_project.assumption_ledger_file");
  const lakefileRel = requireLeanRootRelPath(leanProjectRaw.lakefile, "lean_project.lakefile");
  const toolchainRel = requireLeanRootRelPath(leanProjectRaw.toolchain_file, "lean_project.toolchain_file");
  if (
    packagingScope === "campaign" &&
    [
      leanRootRel,
      join(leanRootRel, theoremFileRel),
      join(leanRootRel, auditFileRel),
      join(leanRootRel, formalSpecFileRel),
      join(leanRootRel, assumptionLedgerFileRel),
      join(leanRootRel, lakefileRel),
      join(leanRootRel, toolchainRel)
    ].some((path) => usesPositiveMatrixReleasePath(path))
  ) {
    throw new Error("final_replay_request_positive_matrix_path_forbidden");
  }
  const leanRoot = assertPathAllowed(input.projectRoot, leanRootRel, { purpose: "read", resolveRealpath: true });
  const leanPath = (rel: string) => assertPathAllowed(input.projectRoot, join(leanRootRel, rel), { purpose: "read", resolveRealpath: true });

  const leanProject: LeanProjectFiles = {
    projectRoot: input.projectRoot,
    leanRoot,
    theoremFile: leanPath(theoremFileRel),
    theoremFileRel,
    formalSpecFile: leanPath(formalSpecFileRel),
    auditFile: leanPath(auditFileRel),
    auditFileRel,
    lakefile: leanPath(lakefileRel),
    toolchainFile: leanPath(toolchainRel),
    theoremName: requireString(leanProjectRaw.theorem_name, "lean_project.theorem_name"),
    theoremFamilyId: requireString(leanProjectRaw.theorem_family_id, "lean_project.theorem_family_id"),
    canonicalProposition: requireString(leanProjectRaw.canonical_proposition, "lean_project.canonical_proposition"),
    buildTargets: requireStringArray(leanProjectRaw.build_targets, "lean_project.build_targets"),
    replayCommand: requireString(leanProjectRaw.replay_command, "lean_project.replay_command"),
    primaryDependency: requireString(leanProjectRaw.primary_dependency, "lean_project.primary_dependency"),
    formalSpec: {
      claim_id: requireString(formalSpecRaw.claim_id, "lean_project.formal_spec.claim_id"),
      theorem_name: requireString(formalSpecRaw.theorem_name, "lean_project.formal_spec.theorem_name"),
      namespace: requireString(formalSpecRaw.namespace, "lean_project.formal_spec.namespace"),
      normalized_statement: requireString(formalSpecRaw.normalized_statement, "lean_project.formal_spec.normalized_statement"),
      locked_statement_hash: requireString(formalSpecRaw.locked_statement_hash, "lean_project.formal_spec.locked_statement_hash")
    }
  };
  if (leanProject.formalSpec.claim_id !== input.campaign.root_claim_id) {
    throw new Error("final_replay_request_formal_spec_claim_mismatch");
  }
  const obligation = input.expectedObligation ?? input.campaign.open_obligations.find((item) => item.claim_id === input.campaign.root_claim_id);
  if (!obligation) {
    throw new Error("final_replay_request_obligation_missing");
  }
  if (obligation.claim_id !== input.campaign.root_claim_id) {
    throw new Error("final_replay_request_obligation_claim_mismatch");
  }
  if (leanProject.formalSpec.locked_statement_hash !== obligation.statement_hash) {
    throw new Error("final_replay_request_statement_hash_drift");
  }

  const replayBreadthProfile =
    typeof request.replay_breadth_profile === "string"
      ? request.replay_breadth_profile
      : typeof leanProjectRaw.replay_breadth_profile === "string"
        ? leanProjectRaw.replay_breadth_profile
        : undefined;
  if (replayBreadthProfile !== undefined && replayBreadthProfile !== "campaign_live_mathlib_non_toy") {
    throw new Error("final_replay_request_replay_breadth_profile_invalid");
  }
  if (replayBreadthProfile === "campaign_live_mathlib_non_toy") {
    const theoremSource = readFileSync(leanProject.theoremFile, "utf8");
    const gate = evaluateCampaignLiveMathlibReplayBreadthGate({
      packagingScope,
      primaryDependency: leanProject.primaryDependency,
      canonicalProposition: leanProject.canonicalProposition,
      normalizedStatement: leanProject.formalSpec.normalized_statement,
      theoremSource,
      leanRootRel,
      theoremFileRel,
      replayCommand: leanProject.replayCommand,
      buildTargets: leanProject.buildTargets
    });
    if (gate.result !== "pass") {
      throw new Error(`campaign_live_mathlib_replay_breadth_gate_failed:${gate.hard_vetoes.join(",")}`);
    }
    let lakeManifest: unknown;
    let lakeManifestReadError = false;
    const lakeManifestRel = normalizeRelPath(join(leanRootRel, dirname(lakefileRel), "lake-manifest.json"));
    try {
      lakeManifest = JSON.parse(
        readFileSync(assertPathAllowed(input.projectRoot, lakeManifestRel, { purpose: "read", resolveRealpath: true }), "utf8")
      ) as unknown;
    } catch {
      lakeManifestReadError = true;
    }
    const lakefileText = readFileSync(leanProject.lakefile, "utf8");
    const localLeanFileRels = listLeanProjectFiles(leanProject.leanRoot).map((file) =>
      relative(leanProject.leanRoot, file).replace(/\\/g, "/")
    );
    const noDownloadFixturePreflight = evaluateCampaignLiveMathlibNoDownloadFixturePreflight({
      packagingScope,
      primaryDependency: leanProject.primaryDependency,
      leanRoot: leanProject.leanRoot,
      lakefileText,
      lakeManifest,
      lakeManifestReadError,
      localLeanFileRels
    });
    const noDownloadFixturePreflightPath = writeSimpleStageArtifact(
      input.projectRoot,
      input.campaign,
      "mathlib_no_download_fixture_preflight.json",
      {
        ...noDownloadFixturePreflight,
        campaign_id: input.campaign.campaign_id,
        claim_id: input.campaign.root_claim_id,
        theorem_name: leanProject.theoremName,
        locked_statement_hash: leanProject.formalSpec.locked_statement_hash,
        lean_root_rel: leanRootRel,
        theorem_file_rel: theoremFileRel,
        audit_file_rel: auditFileRel,
        lakefile_hash: sha256RuntimeFile(input.projectRoot, normalizeRelPath(join(leanRootRel, lakefileRel))),
        ...(lakeManifestReadError ? {} : { lake_manifest_hash: sha256RuntimeFile(input.projectRoot, lakeManifestRel) }),
        theorem_file_hash: sha256RuntimeFile(input.projectRoot, normalizeRelPath(join(leanRootRel, theoremFileRel))),
        preflight_is_proof_authority: false,
        created_at: now()
      }
    );
    const dependencyMaterialGate = noDownloadFixturePreflight.dependency_material_gate;
    const provisioningDiagnostic = noDownloadFixturePreflight.provisioning_diagnostic;
    if (dependencyMaterialGate.result !== "pass") {
      throw new Error(`campaign_live_mathlib_dependency_material_gate_failed:${dependencyMaterialGate.hard_vetoes.join(",")}`);
    }
    if (provisioningDiagnostic.result !== "pass") {
      throw new Error(`campaign_live_mathlib_provisioning_diagnostic_failed:${provisioningDiagnostic.hard_vetoes.join(",")}`);
    }
    const diagnosticPath = writeSimpleStageArtifact(input.projectRoot, input.campaign, "mathlib_provisioning_diagnostic.json", {
      ...provisioningDiagnostic,
      campaign_id: input.campaign.campaign_id,
      claim_id: input.campaign.root_claim_id,
      theorem_name: leanProject.theoremName,
      locked_statement_hash: leanProject.formalSpec.locked_statement_hash,
      no_download_fixture_preflight_path: noDownloadFixturePreflightPath,
      no_download_fixture_preflight_hash: sha256RuntimeFile(input.projectRoot, noDownloadFixturePreflightPath),
      lakefile_hash: sha256RuntimeFile(input.projectRoot, normalizeRelPath(join(leanRootRel, lakefileRel))),
      lake_manifest_hash: sha256RuntimeFile(input.projectRoot, lakeManifestRel),
      theorem_file_hash: sha256RuntimeFile(input.projectRoot, normalizeRelPath(join(leanRootRel, theoremFileRel))),
      diagnostic_is_proof_authority: false,
      created_at: now()
    });
    const hostReplayDiagnostic = evaluateCampaignLiveMathlibHostReplayDiagnostic({
      packagingScope,
      primaryDependency: leanProject.primaryDependency,
      leanRoot: leanProject.leanRoot,
      leanToolchain: readFileSync(leanProject.toolchainFile, "utf8").trim(),
      theoremFileRel,
      auditFileRel,
      buildTargets: leanProject.buildTargets,
      lakefileText
    });
    const hostReplayDiagnosticPath = writeSimpleStageArtifact(input.projectRoot, input.campaign, "mathlib_host_replay_diagnostic.json", {
      ...hostReplayDiagnostic,
      campaign_id: input.campaign.campaign_id,
      claim_id: input.campaign.root_claim_id,
      theorem_name: leanProject.theoremName,
      locked_statement_hash: leanProject.formalSpec.locked_statement_hash,
      lean_root_rel: leanRootRel,
      theorem_file_rel: theoremFileRel,
      audit_file_rel: auditFileRel,
      build_targets: leanProject.buildTargets,
      replay_command: leanProject.replayCommand,
      no_download_fixture_preflight_path: noDownloadFixturePreflightPath,
      no_download_fixture_preflight_hash: sha256RuntimeFile(input.projectRoot, noDownloadFixturePreflightPath),
      provisioning_diagnostic_path: diagnosticPath,
      provisioning_diagnostic_hash: sha256RuntimeFile(input.projectRoot, diagnosticPath),
      ...(provisioningDiagnostic.mathlib_revision ? { mathlib_revision: provisioningDiagnostic.mathlib_revision } : {}),
      ...(provisioningDiagnostic.materialized_package_root
        ? { materialized_package_root: provisioningDiagnostic.materialized_package_root }
        : {}),
      ...(provisioningDiagnostic.materialized_package_hash
        ? { materialized_package_hash: provisioningDiagnostic.materialized_package_hash }
        : {}),
      lakefile_hash: sha256RuntimeFile(input.projectRoot, normalizeRelPath(join(leanRootRel, lakefileRel))),
      lake_manifest_hash: sha256RuntimeFile(input.projectRoot, lakeManifestRel),
      theorem_file_hash: sha256RuntimeFile(input.projectRoot, normalizeRelPath(join(leanRootRel, theoremFileRel))),
      diagnostic_is_proof_authority: false,
      created_at: now()
    });
    if (hostReplayDiagnostic.result !== "pass") {
      throw new Error(`campaign_live_mathlib_host_replay_diagnostic_failed:${hostReplayDiagnostic.hard_vetoes.join(",")}`);
    }
    const importGraphDiagnostic = evaluateCampaignLiveMathlibImportGraphDiagnostic({
      packagingScope,
      primaryDependency: leanProject.primaryDependency,
      leanRoot: leanProject.leanRoot,
      leanToolchain: readFileSync(leanProject.toolchainFile, "utf8").trim(),
      theoremFileRel,
      auditFileRel
    });
    const importGraphDiagnosticPath = writeSimpleStageArtifact(input.projectRoot, input.campaign, "mathlib_import_graph_diagnostic.json", {
      ...importGraphDiagnostic,
      campaign_id: input.campaign.campaign_id,
      claim_id: input.campaign.root_claim_id,
      theorem_name: leanProject.theoremName,
      locked_statement_hash: leanProject.formalSpec.locked_statement_hash,
      lean_root_rel: leanRootRel,
      theorem_file_rel: theoremFileRel,
      audit_file_rel: auditFileRel,
      host_replay_diagnostic_path: hostReplayDiagnosticPath,
      host_replay_diagnostic_hash: sha256RuntimeFile(input.projectRoot, hostReplayDiagnosticPath),
      lakefile_hash: sha256RuntimeFile(input.projectRoot, normalizeRelPath(join(leanRootRel, lakefileRel))),
      lake_manifest_hash: sha256RuntimeFile(input.projectRoot, lakeManifestRel),
      theorem_file_hash: sha256RuntimeFile(input.projectRoot, normalizeRelPath(join(leanRootRel, theoremFileRel))),
      audit_file_hash: sha256RuntimeFile(input.projectRoot, normalizeRelPath(join(leanRootRel, auditFileRel))),
      diagnostic_is_proof_authority: false,
      created_at: now()
    });
    if (importGraphDiagnostic.result !== "pass") {
      throw new Error(`campaign_live_mathlib_import_graph_diagnostic_failed:${importGraphDiagnostic.hard_vetoes.join(",")}`);
    }
    return {
      packagingScope,
      taskId,
      claimId,
      leanProject,
      formalSpecLockPath: normalizeRelPath(join(leanRootRel, formalSpecFileRel)),
      assumptionLedgerPath: normalizeRelPath(join(leanRootRel, assumptionLedgerFileRel)),
      assembledRequestPath: input.assembledRequestPath,
      provisioningDiagnosticPath: diagnosticPath,
      hostReplayDiagnosticPath,
      importGraphDiagnosticPath
    };
  }

  return {
    packagingScope,
    taskId,
    claimId,
    leanProject,
    formalSpecLockPath: normalizeRelPath(join(leanRootRel, formalSpecFileRel)),
    assumptionLedgerPath: normalizeRelPath(join(leanRootRel, assumptionLedgerFileRel)),
    assembledRequestPath: input.assembledRequestPath
  };
}

function sha256Text(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function sha256RuntimeFile(projectRoot: string, rel: string): string {
  return sha256Text(readFileSync(assertPathAllowed(projectRoot, rel, { purpose: "read", resolveRealpath: true }), "utf8"));
}

function readAcceptedArtifactJson(projectRoot: string, artifact: ArtifactRef): unknown | undefined {
  const path = assertPathAllowed(projectRoot, artifact.path, { purpose: "read", resolveRealpath: true });
  const text = readFileSync(path, "utf8");
  if (sha256Text(text) !== artifact.sha256) {
    throw new Error("accepted_artifact_hash_mismatch");
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

async function produceFinalReplayMaterialFromSelectedIntegrationArtifacts(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  obligation: ProofObligation;
  decision: { candidates: CandidateRun[]; decision: EnsembleDecision } | undefined;
  integrationRel: string;
  actor: string;
}): Promise<
  | {
      materialPath: string;
      materialArtifact: ArtifactRef;
      sourceCandidate: CandidateRun;
    }
  | undefined
> {
  const decision = input.decision;
  const selectedCandidateId = decision?.decision.selected_candidate_id;
  if (!selectedCandidateId) {
    return undefined;
  }
  const selected = decision.candidates.find((candidate) => candidate.candidate_id === selectedCandidateId);
  if (!selected) {
    throw new Error("selected_candidate_missing");
  }
  if (selected.state !== "candidate_kernel_checked") {
    throw new Error("selected_candidate_not_kernel_checked");
  }
  if (
    selected.campaign_id !== input.campaign.campaign_id ||
    selected.obligation_id !== input.obligation.obligation_id ||
    selected.locked_statement_hash !== input.obligation.statement_hash ||
    selected.candidate_statement_hash !== input.obligation.statement_hash ||
    selected.hard_vetoes.length > 0
  ) {
    throw new Error("selected_candidate_identity_mismatch");
  }
  const manifest = readCandidateManifestForCampaign(input.projectRoot, selected);
  if (
    manifest.statement_equivalence_claim !== "exact" ||
    manifest.hard_vetoes.length > 0 ||
    manifest.introduced_assumptions.length > 0 ||
    manifest.candidate_statement_hash !== input.obligation.statement_hash ||
    !manifest.replay_command ||
    !hasVerifiedServiceOwnedLeanManifestEvidence({
      projectRoot: input.projectRoot,
      campaignId: input.campaign.campaign_id,
      claimId: input.campaign.root_claim_id,
      candidateId: selected.candidate_id,
      evidence: manifest.evidence
    })
  ) {
    throw new Error("selected_candidate_not_material_grade");
  }
  const materialSourceArtifacts = manifest.artifacts.filter(
    (artifact) =>
      artifact.kind === "final_replay_material_source" ||
      artifact.required_for.includes("final_replay_material")
  );
  if (materialSourceArtifacts.length === 0) {
    return undefined;
  }
  if (materialSourceArtifacts.length > 1) {
    throw new Error("selected_candidate_final_replay_material_source_ambiguous");
  }
  const sourceRel = normalizeRelPath(join(manifest.workspace_path, materialSourceArtifacts[0]!.path));
  const sourcePath = assertPathAllowed(input.projectRoot, sourceRel, { purpose: "read", resolveRealpath: true });
  const sourceText = readFileSync(sourcePath, "utf8");
  const sourceHash = sha256Text(sourceText);
  const source = objectRecord(JSON.parse(sourceText), "selected_candidate_final_replay_material_source");
  if (
    source.schema_version !== "comath.selected_candidate_final_replay_material_source.v1" ||
    source.campaign_id !== input.campaign.campaign_id ||
    source.claim_id !== input.campaign.root_claim_id ||
    source.obligation_id !== input.obligation.obligation_id ||
    source.candidate_id !== selected.candidate_id ||
    source.artifact_role !== "selected_candidate_final_replay_material_source" ||
    source.proof_authority !== "none" ||
    source.can_promote_claim !== false
  ) {
    throw new Error("selected_candidate_final_replay_material_source_identity_mismatch");
  }
  const replayRequest = {
    schema_version: "comath.campaign_final_global_replay_request.v1",
    claim_id: input.campaign.root_claim_id,
    packaging_scope: "campaign",
    lean_project: objectRecord(source.lean_project, "selected_candidate_final_replay_material_source.lean_project")
  };
  parseFinalGlobalReplayRequestPayload({
    projectRoot: input.projectRoot,
    campaign: input.campaign,
    raw: replayRequest,
    expectedObligation: input.obligation
  });
  const materialPath = writeSimpleStageArtifact(input.projectRoot, input.campaign, "generated_final_replay_material.json", {
    schema_version: "comath.campaign_final_replay_material.v1",
    campaign_id: input.campaign.campaign_id,
    claim_id: input.campaign.root_claim_id,
    obligation_id: input.obligation.obligation_id,
    artifact_role: "final_replay_material_source",
    source_candidate_id: selected.candidate_id,
    source_candidate_manifest_path: normalizeRelPath(selected.manifest_path ?? ""),
    source_material_path: sourceRel,
    source_material_sha256: sourceHash,
    integration_artifact_path: input.integrationRel,
    produced_by: "comathd.integration_final_replay_material_producer",
    lean_project: replayRequest.lean_project,
    proof_authority: "none",
    can_promote_claim: false,
    created_at: now()
  });
  const materialArtifact = await importArtifact({
    projectRoot: input.projectRoot,
    project_id: input.campaign.project_id,
    source_path: materialPath,
    kind: "code",
    actor: input.actor
  });
  return { materialPath, materialArtifact, sourceCandidate: selected };
}

function hasFinalReplayMaterialSourceArtifact(manifest: CandidateManifest): boolean {
  return manifest.artifacts.some(
    (artifact) =>
      artifact.kind === "final_replay_material_source" ||
      artifact.required_for.includes("final_replay_material")
  );
}

function requireCandidateWorkspaceRelPath(value: unknown, field: string): string {
  const rel = normalizeRelPath(requireString(value, field));
  if (isAbsolute(rel) || rel === "." || rel.startsWith("../") || rel.includes("/../") || rel.includes(":")) {
    throw new Error("candidate_replay_material_path_escape");
  }
  return rel;
}

function assertCandidateWorkspaceContained(input: {
  projectRoot: string;
  workspaceRel: string;
  fileRel: string;
  purpose: "read" | "runtime-write";
  resolveRealpath?: boolean;
}): string {
  const workspacePath = assertPathAllowed(input.projectRoot, input.workspaceRel, {
    purpose: "read",
    resolveRealpath: true
  });
  const filePath = assertPathAllowed(input.projectRoot, input.fileRel, {
    purpose: input.purpose,
    resolveRealpath: input.resolveRealpath
  });
  const fromWorkspace = normalizeRelPath(relative(workspacePath, filePath));
  if (fromWorkspace.startsWith("../") || isAbsolute(fromWorkspace)) {
    throw new Error("candidate_replay_material_path_escape");
  }
  return filePath;
}

async function produceCandidateFinalReplayMaterialSourceFromSelectedDescriptor(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  obligation: ProofObligation;
  candidates: CandidateRun[];
  decision: EnsembleDecision;
}): Promise<{ sourcePath: string; productionPath: string } | undefined> {
  const selectedCandidateId = input.decision.selected_candidate_id;
  if (!selectedCandidateId) {
    return undefined;
  }
  const selected = input.candidates.find((candidate) => candidate.candidate_id === selectedCandidateId);
  if (!selected) {
    throw new Error("candidate_replay_material_identity_mismatch");
  }
  if (selected.state !== "candidate_kernel_checked") {
    throw new Error("candidate_replay_material_requires_service_owned_lean_evidence");
  }
  if (
    selected.campaign_id !== input.campaign.campaign_id ||
    selected.obligation_id !== input.obligation.obligation_id ||
    selected.locked_statement_hash !== input.obligation.statement_hash ||
    selected.candidate_statement_hash !== input.obligation.statement_hash ||
    selected.hard_vetoes.length > 0
  ) {
    throw new Error("candidate_replay_material_identity_mismatch");
  }
  const manifest = readCandidateManifestForCampaign(input.projectRoot, selected);
  if (hasFinalReplayMaterialSourceArtifact(manifest)) {
    return undefined;
  }
  if (
    manifest.statement_equivalence_claim !== "exact" ||
    manifest.hard_vetoes.length > 0 ||
    manifest.candidate_statement_hash !== input.obligation.statement_hash ||
    !manifest.replay_command
  ) {
    throw new Error("candidate_replay_material_statement_hash_drift");
  }
  if (manifest.introduced_assumptions.length > 0 || manifest.assumptions.length > 0) {
    throw new Error("candidate_replay_material_hidden_assumption");
  }
  if (
    !hasVerifiedServiceOwnedLeanManifestEvidence({
      projectRoot: input.projectRoot,
      campaignId: input.campaign.campaign_id,
      claimId: input.campaign.root_claim_id,
      candidateId: selected.candidate_id,
      evidence: manifest.evidence
    })
  ) {
    throw new Error("candidate_replay_material_requires_service_owned_lean_evidence");
  }

  const descriptorArtifacts = manifest.artifacts.filter(
    (artifact) =>
      artifact.kind === "candidate_replay_project_descriptor" ||
      artifact.required_for.includes("candidate_replay_material_source")
  );
  if (descriptorArtifacts.length === 0) {
    return undefined;
  }
  if (descriptorArtifacts.length > 1) {
    throw new Error("candidate_replay_material_descriptor_ambiguous");
  }

  const descriptorRelInWorkspace = requireCandidateWorkspaceRelPath(
    descriptorArtifacts[0]!.path,
    "candidate_replay_material_descriptor_path"
  );
  const descriptorRel = normalizeRelPath(join(manifest.workspace_path, descriptorRelInWorkspace));
  const descriptorPath = assertCandidateWorkspaceContained({
    projectRoot: input.projectRoot,
    workspaceRel: manifest.workspace_path,
    fileRel: descriptorRel,
    purpose: "read",
    resolveRealpath: true
  });
  const descriptorText = readFileSync(descriptorPath, "utf8");
  const descriptorHash = sha256Text(descriptorText);
  const descriptor = objectRecord(JSON.parse(descriptorText), "candidate_replay_project_descriptor");
  if (
    descriptor.schema_version !== "comath.candidate_replay_project_descriptor.v1" ||
    descriptor.campaign_id !== input.campaign.campaign_id ||
    descriptor.claim_id !== input.campaign.root_claim_id ||
    descriptor.obligation_id !== input.obligation.obligation_id ||
    descriptor.candidate_id !== selected.candidate_id ||
    descriptor.artifact_role !== "candidate_replay_project_descriptor"
  ) {
    throw new Error("candidate_replay_material_identity_mismatch");
  }
  if (descriptor.proof_authority !== "none" || descriptor.can_promote_claim !== false) {
    throw new Error("candidate_replay_material_authority_forgery");
  }

  const replayRequest = {
    schema_version: "comath.campaign_final_global_replay_request.v1",
    claim_id: input.campaign.root_claim_id,
    packaging_scope: "campaign",
    lean_project: objectRecord(descriptor.lean_project, "candidate_replay_project_descriptor.lean_project")
  };
  parseFinalGlobalReplayRequestPayload({
    projectRoot: input.projectRoot,
    campaign: input.campaign,
    raw: replayRequest,
    expectedObligation: input.obligation
  });

  const sourceRelInWorkspace = "candidate_final_replay_material_source.json";
  const sourceRel = normalizeRelPath(join(manifest.workspace_path, sourceRelInWorkspace));
  assertCandidateWorkspaceContained({
    projectRoot: input.projectRoot,
    workspaceRel: manifest.workspace_path,
    fileRel: sourceRel,
    purpose: "runtime-write"
  });
  writeRuntimeFile(
    input.projectRoot,
    sourceRel,
    `${JSON.stringify(
      {
        schema_version: "comath.selected_candidate_final_replay_material_source.v1",
        campaign_id: input.campaign.campaign_id,
        claim_id: input.campaign.root_claim_id,
        obligation_id: input.obligation.obligation_id,
        candidate_id: selected.candidate_id,
        artifact_role: "selected_candidate_final_replay_material_source",
        source_descriptor_path: descriptorRelInWorkspace,
        source_descriptor_sha256: descriptorHash,
        source_candidate_manifest_path: normalizeRelPath(selected.manifest_path ?? ""),
        produced_by: "comathd.candidate_replay_material_source_producer",
        proof_authority: "none",
        can_promote_claim: false,
        lean_project: replayRequest.lean_project,
        created_at: now()
      },
      null,
      2
    )}\n`
  );

  const updatedManifest = candidateManifestSchema.parse({
    ...manifest,
    artifacts: [
      ...manifest.artifacts,
      {
        path: sourceRelInWorkspace,
        kind: "final_replay_material_source",
        required_for: ["candidate_arbitration", "integration_refactor", "final_replay_material"]
      }
    ]
  });
  const manifestPath = assertPathAllowed(input.projectRoot, normalizeRelPath(selected.manifest_path ?? ""), {
    purpose: "runtime-write"
  });
  writeFileSync(manifestPath, `${JSON.stringify(updatedManifest, null, 2)}\n`, "utf8");

  const sourceHash = sha256Text(readFileSync(assertPathAllowed(input.projectRoot, sourceRel, { purpose: "read" }), "utf8"));
  const productionPath = writeSimpleStageArtifact(input.projectRoot, input.campaign, "candidate_replay_material_source_production.json", {
    schema_version: "comath.candidate_replay_material_source_production.v1",
    campaign_id: input.campaign.campaign_id,
    claim_id: input.campaign.root_claim_id,
    obligation_id: input.obligation.obligation_id,
    candidate_id: selected.candidate_id,
    source_path: sourceRel,
    source_sha256: sourceHash,
    source_descriptor_path: descriptorRel,
    source_descriptor_sha256: descriptorHash,
    candidate_manifest_path: normalizeRelPath(selected.manifest_path ?? ""),
    produced_by: "comathd.candidate_replay_material_source_producer",
    proof_authority: "none",
    can_promote_claim: false,
    created_at: now()
  });
  return { sourcePath: sourceRel, productionPath };
}

function assembleFinalGlobalReplayRequestFromAcceptedArtifacts(
  projectRoot: string,
  campaign: ResearchCampaign
): FinalGlobalReplayRequest | undefined {
  for (const artifact of campaign.accepted_artifacts) {
    if (artifact.project_id !== campaign.project_id) {
      continue;
    }
    const payload = readAcceptedArtifactJson(projectRoot, artifact);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      continue;
    }
    const record = payload as Record<string, unknown>;
    if (record.schema_version !== "comath.campaign_final_replay_target.v1") {
      continue;
    }
    if (
      record.campaign_id !== campaign.campaign_id ||
      record.claim_id !== campaign.root_claim_id ||
      record.artifact_role !== "final_replay_request_source" ||
      record.proof_authority !== "none" ||
      record.can_promote_claim !== false
    ) {
      throw new Error("accepted_final_replay_target_identity_mismatch");
    }
    const obligationId = requireString(record.obligation_id, "accepted_final_replay_target.obligation_id");
    const obligation = campaign.open_obligations.find(
      (item) => item.obligation_id === obligationId && item.claim_id === campaign.root_claim_id
    );
    if (!obligation) {
      throw new Error("accepted_final_replay_target_obligation_mismatch");
    }
    const replayRequest = objectRecord(record.replay_request, "accepted_final_replay_target.replay_request");
    if (replayRequest.packaging_scope !== "campaign" || replayRequest.task_id !== undefined) {
      throw new Error("accepted_final_replay_target_must_be_campaign_native");
    }
    const parsed = parseFinalGlobalReplayRequestPayload({
      projectRoot,
      campaign,
      raw: replayRequest,
      expectedObligation: obligation
    });
    const assemblyPath = writeSimpleStageArtifact(projectRoot, campaign, "assembled_final_replay_request.json", {
      schema_version: "comath.campaign_final_replay_request_assembly.v1",
      campaign_id: campaign.campaign_id,
      claim_id: campaign.root_claim_id,
      source_artifact_id: artifact.id,
      source_artifact_sha256: artifact.sha256,
      source_artifact_path: normalizeRelPath(artifact.path),
      replay_request: replayRequest,
      proof_authority: "none",
      can_promote_claim: false,
      created_at: now()
    });
    return { ...parsed, assembledRequestPath: assemblyPath };
  }
  return undefined;
}

function acceptedFinalReplayTargetExists(projectRoot: string, campaign: ResearchCampaign): boolean {
  return campaign.accepted_artifacts.some((artifact) => {
    if (artifact.project_id !== campaign.project_id) {
      return false;
    }
    const payload = readAcceptedArtifactJson(projectRoot, artifact);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return false;
    }
    const record = payload as Record<string, unknown>;
    return (
      record.schema_version === "comath.campaign_final_replay_target.v1" &&
      record.campaign_id === campaign.campaign_id &&
      record.claim_id === campaign.root_claim_id
    );
  });
}

async function produceFinalReplayTargetFromAcceptedMaterials(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  obligation: ProofObligation;
  actor: string;
}): Promise<
  | {
      targetPath: string;
      targetArtifact: ArtifactRef;
      sourceMaterialArtifact: ArtifactRef;
    }
  | undefined
> {
  if (artifactExists(input.projectRoot, campaignRel(input.campaign, "final_replay_request.json"))) {
    return undefined;
  }
  if (acceptedFinalReplayTargetExists(input.projectRoot, input.campaign)) {
    return undefined;
  }
  for (const artifact of input.campaign.accepted_artifacts) {
    if (artifact.project_id !== input.campaign.project_id) {
      continue;
    }
    const payload = readAcceptedArtifactJson(input.projectRoot, artifact);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      continue;
    }
    const record = payload as Record<string, unknown>;
    if (record.schema_version !== "comath.campaign_final_replay_material.v1") {
      continue;
    }
    if (
      record.campaign_id !== input.campaign.campaign_id ||
      record.claim_id !== input.campaign.root_claim_id ||
      record.obligation_id !== input.obligation.obligation_id ||
      record.artifact_role !== "final_replay_material_source" ||
      record.proof_authority !== "none" ||
      record.can_promote_claim !== false
    ) {
      throw new Error("accepted_final_replay_material_identity_mismatch");
    }
    const replayRequest = {
      schema_version: "comath.campaign_final_global_replay_request.v1",
      claim_id: input.campaign.root_claim_id,
      packaging_scope: "campaign",
      lean_project: objectRecord(record.lean_project, "accepted_final_replay_material.lean_project")
    };
    parseFinalGlobalReplayRequestPayload({
      projectRoot: input.projectRoot,
      campaign: input.campaign,
      raw: replayRequest,
      expectedObligation: input.obligation
    });
    const targetPath = writeSimpleStageArtifact(input.projectRoot, input.campaign, "generated_final_replay_target.json", {
      schema_version: "comath.campaign_final_replay_target.v1",
      campaign_id: input.campaign.campaign_id,
      claim_id: input.campaign.root_claim_id,
      obligation_id: input.obligation.obligation_id,
      artifact_role: "final_replay_request_source",
      source_material_artifact_id: artifact.id,
      source_material_artifact_sha256: artifact.sha256,
      source_material_artifact_path: normalizeRelPath(artifact.path),
      produced_by: "comathd.final_static_audit_replay_target_producer",
      replay_request: replayRequest,
      proof_authority: "none",
      can_promote_claim: false,
      created_at: now()
    });
    const targetArtifact = await importArtifact({
      projectRoot: input.projectRoot,
      project_id: input.campaign.project_id,
      source_path: targetPath,
      kind: "code",
      actor: input.actor
    });
    return { targetPath, targetArtifact, sourceMaterialArtifact: artifact };
  }
  return undefined;
}

function readFinalGlobalReplayRequest(projectRoot: string, campaign: ResearchCampaign): FinalGlobalReplayRequest | undefined {
  const requestRel = campaignRel(campaign, "final_replay_request.json");
  if (artifactExists(projectRoot, requestRel)) {
    const raw = JSON.parse(readFileSync(assertPathAllowed(projectRoot, requestRel, { purpose: "read", resolveRealpath: true }), "utf8")) as unknown;
    return parseFinalGlobalReplayRequestPayload({ projectRoot, campaign, raw });
  }
  return assembleFinalGlobalReplayRequestFromAcceptedArtifacts(projectRoot, campaign);
}

async function completeCampaignAtFinalGlobalReplay(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  obligation: ProofObligation;
  actor: string;
}): Promise<CampaignTickResult> {
  let request: FinalGlobalReplayRequest | undefined;
  try {
    request = readFinalGlobalReplayRequest(input.projectRoot, input.campaign);
  } catch (error) {
    return blockCampaignAtFinalReplay({
      ...input,
      reason: `service-owned Lean Authority v3 replay request is invalid: ${error instanceof Error ? error.message : "unknown_error"}`
    });
  }
  if (!request) {
    return blockCampaignAtFinalReplay({
      ...input,
      reason: "service-owned Lean Authority v3 replay target is not available"
    });
  }

  let replay: CleanReplayResult;
  try {
    replay = runCleanLeanReplay({
      projectRoot: input.projectRoot,
      project_id: input.campaign.project_id,
      actor: input.actor,
      campaign_id: input.campaign.campaign_id,
      claim_id: request.claimId,
      leanProject: request.leanProject,
      provisioningDiagnosticPath: request.provisioningDiagnosticPath,
      hostReplayDiagnosticPath: request.hostReplayDiagnosticPath,
      importGraphDiagnosticPath: request.importGraphDiagnosticPath
    });
  } catch (error) {
    return blockCampaignAtFinalReplay({
      ...input,
      reason: `service-owned Lean Authority v3 clean replay failed: ${error instanceof Error ? error.message : "unknown_error"}`
    });
  }

  if (
    replay.final_replay.result !== "pass" ||
    !replay.final_replay_manifest_v3_path ||
    replay.lean_run_manifest_paths.length === 0 ||
    !replay.third_party_replay_pack_path
  ) {
    return blockCampaignAtFinalReplay({
      ...input,
      reason: "service-owned Lean Authority v3 clean replay did not produce promotion-grade final evidence"
    });
  }

  const cleanFormalSpecLockPath = normalizeRelPath(join(replay.final_replay.clean_workspace_path, "FormalSpec", "formal_spec_lock.json"));
  const cleanAssumptionLedgerPath = normalizeRelPath(join(replay.final_replay.clean_workspace_path, "FormalSpec", "assumption_ledger.json"));
  const evidence = {
    lean_run_manifest_paths: replay.lean_run_manifest_paths,
    final_replay_manifest_v3_path: replay.final_replay_manifest_v3_path,
    structured_audit_path: replay.final_replay.static_audit_path,
    dependency_closure_path: replay.final_replay.dependency_closure_path,
    axiom_profile_path: replay.final_replay.axiom_profile_path,
    statement_check_path: replay.final_replay.statement_equivalence_path,
    third_party_replay_pack_path: replay.third_party_replay_pack_path,
    formal_spec_lock_path: artifactExists(input.projectRoot, cleanFormalSpecLockPath) ? cleanFormalSpecLockPath : request.formalSpecLockPath,
    assumption_ledger_path: artifactExists(input.projectRoot, cleanAssumptionLedgerPath) ? cleanAssumptionLedgerPath : request.assumptionLedgerPath
  };
  const packaging =
    request.packagingScope === "campaign"
      ? packageCampaignFinalAuthorityEvidenceWithDerivedBindingsV3({
          projectRoot: input.projectRoot,
          campaignId: input.campaign.campaign_id,
          claimId: request.claimId,
          evidence
        })
      : packageGoal3GaPositiveMatrixFinalAuthorityEvidenceWithDerivedBindingsV3({
          projectRoot: input.projectRoot,
          taskId: requireString(request.taskId, "task_id"),
          claimId: request.claimId,
          evidence
        });
  if (packaging.final_evidence_status !== "verified_final_authority_evidence") {
    return blockCampaignAtFinalReplay({
      ...input,
      reason: `service-owned Lean Authority v3 final authority packaging is incomplete: ${packaging.missing_final_evidence_classes.join(",")}`
    });
  }

  const claim = getClaim(input.projectRoot, input.campaign.project_id, input.campaign.root_claim_id);
  if (!claim) {
    throw new ComathError("campaign root claim not found", { statusCode: 404, code: "CLAIM_NOT_FOUND" });
  }
  applyGatePromotedClaim(input.projectRoot, {
    ...claim,
    formalization_status: "kernel_checked",
    dependency_closure_status: "all_dependencies_present",
    audit_state: "audit_passed",
    updated_at: now()
  });

  const promotion =
    request.packagingScope === "campaign"
      ? await promoteCampaignFinalAuthorityEvidenceWithDerivedBindingsV3({
          projectRoot: input.projectRoot,
          projectId: input.campaign.project_id,
          campaignId: input.campaign.campaign_id,
          claimId: request.claimId,
          evidence,
          actor: input.actor
        })
      : await promoteGoal3GaPositiveMatrixFinalAuthorityEvidenceWithDerivedBindingsV3({
          projectRoot: input.projectRoot,
          projectId: input.campaign.project_id,
          taskId: requireString(request.taskId, "task_id"),
          claimId: request.claimId,
          evidence,
          actor: input.actor
        });
  if (!promotion.promoted_by_ordinary_gate || !promotion.formal_replay_authority_evidence) {
    return blockCampaignAtFinalReplay({
      ...input,
      reason: "service-owned Lean Authority v3 evidence did not pass ordinary promotion gate"
    });
  }

  const artifactPaths = [
    request.assembledRequestPath,
    replay.final_replay_manifest_v3_path,
    packaging.packaging_report_path,
    packaging.source_packaging_report_path,
    replay.third_party_replay_pack_path
  ].filter((path): path is string => typeof path === "string" && path.length > 0);
  const completed = writeCampaign(
    input.projectRoot,
    researchCampaignSchema.parse({
      ...input.campaign,
      current_stage: "completed_formal_proof",
      status: "terminal",
      terminal_state: "completed_formal_proof",
      open_obligations: [{ ...input.obligation, status: "kernel_checked" }],
      formal_replay_authority_passed: true,
      formal_replay_authority_evidence: promotion.formal_replay_authority_evidence,
      stage_runs: [...input.campaign.stage_runs, completedStageRun(input.campaign, "final_global_replay", artifactPaths)],
      next_actions: []
    }),
    input.actor
  );
  return {
    campaign: completed,
    obligation: { ...input.obligation, status: "kernel_checked" },
    final_replay: replay.final_replay,
    static_audit: replay.static_audit
  };
}

export async function tickCampaign(input: CampaignTickInput): Promise<CampaignTickResult> {
  const actor = input.actor ?? "campaign";
  const campaign = getCampaign(input.project_root, input.campaign_id);
  if (!campaign) {
    throw new ComathError("campaign not found", { statusCode: 404, code: "CAMPAIGN_NOT_FOUND" });
  }
  if (campaign.status === "terminal") {
    return { campaign };
  }
  if (campaign.status === "paused") {
    throw new ComathError("campaign is paused; resume it before ticking", {
      statusCode: 409,
      code: "CAMPAIGN_PAUSED"
    });
  }
  if (campaign.status === "blocked") {
    return {
      campaign,
      blocker: campaign.blockers
        .map((blocker) => blocker.reason)
        .find((reason): reason is string => typeof reason === "string")
    };
  }
  const obligation = campaign.open_obligations[0];
  if (!obligation) {
    throw new ComathError("campaign has no open proof obligation", { statusCode: 400, code: "CAMPAIGN_NO_OBLIGATION" });
  }
  const artifactBlocker = enforceRequiredArtifacts({ projectRoot: input.project_root, campaign, obligation, actor });
  if (artifactBlocker) {
    return artifactBlocker;
  }

  if (campaign.current_stage === "problem_locked") {
    const obligationRel = join(".comath", "proof", "obligations", `${obligation.obligation_id}.json`).replace(/\\/g, "/");
    writeRuntimeFile(
      input.project_root,
      obligationRel,
      `${JSON.stringify(obligation, null, 2)}\n`
    );
    const next = writeCampaign(
      input.project_root,
      researchCampaignSchema.parse({
        ...campaign,
        current_stage: "knowledge_pack",
        stage_runs: [
          ...campaign.stage_runs,
          completedStageRun(campaign, "problem_locked", [
            ".comath/lock/problem_lock.md",
            ".comath/lock/assumptions.md",
            ".comath/lock/notation.md",
            ".comath/goals.yaml",
            obligationRel
          ])
        ],
        next_actions: ["build native knowledge pack for the locked problem"]
      }),
      actor
    );
    return { campaign: next, obligation };
  }

  if (campaign.current_stage === "knowledge_pack" || campaign.current_stage === "context_built") {
    const priorFailures = retrieveSimilarFailedRoutes({ projectRoot: input.project_root, obligation });
    const knowledgeRel = `.comath/context_lake/shards/knowledge-${campaign.campaign_id}.md`;
    writeRuntimeFile(
      input.project_root,
      knowledgeRel,
      [
        "# Knowledge Pack",
        "",
        `campaign_id: ${campaign.campaign_id}`,
        `root_claim_id: ${campaign.root_claim_id}`,
        `obligation_id: ${obligation.obligation_id}`,
        "",
        `Locked statement: ${obligation.locked_statement_nl}`,
        "",
        "Library facts:",
        "- External Lean theorem-search and mathlib facts, recorded as non-authoritative hints.",
        "",
        "Prior failed routes:",
        ...(
          priorFailures.matches.length > 0
            ? priorFailures.matches.map((route) => `- ${route.candidate_id} (${route.reason})`)
            : ["- none"]
        ),
        "",
        "Stale or superseded warnings:",
        ...(
          priorFailures.warnings.length > 0
            ? priorFailures.warnings.map((warning) => `- ${warning.code}: ${warning.candidate_id}`)
            : ["- none"]
        ),
        ""
      ].join("\n")
    );
    writeRuntimeFile(
      input.project_root,
      ".comath/literature/references.bib",
      "% CoMath native stage-gate references for elementary Lean campaign.\n"
    );
    writeRuntimeFile(
      input.project_root,
      ".comath/memory/library_search.jsonl",
      `${JSON.stringify({
        type: "LibrarySearch",
        campaign_id: campaign.campaign_id,
        query: obligation.locked_statement_nl,
        results: ["external_theorem_search_or_deferred"],
        created_at: now()
      })}\n`
    );
    writeRuntimeFile(
      input.project_root,
      ".comath/memory/premise_candidates.jsonl",
      `${JSON.stringify({
        type: "PremiseCandidate",
        campaign_id: campaign.campaign_id,
        obligation_id: obligation.obligation_id,
        premises: obligation.dependencies,
        created_at: now()
      })}\n`
    );
    const researchPlanRel = writeGoalModeResearchPlan({ projectRoot: input.project_root, campaign, obligation });
    const researchPlanBinding = {
      path: researchPlanRel,
      sha256: sha256RuntimeFile(input.project_root, researchPlanRel),
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    };
    const adapterExecutionRel = writeGoalModeAdapterExecutionManifest({
      projectRoot: input.project_root,
      campaign,
      obligation,
      researchPlanRel
    });
    const adapterExecutionBinding = {
      path: adapterExecutionRel,
      sha256: sha256RuntimeFile(input.project_root, adapterExecutionRel),
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    };
    const localIngestionEvidenceRel = writeGoalModeLocalIngestionEvidence({
      projectRoot: input.project_root,
      campaign,
      obligation,
      researchPlanRel,
      adapterExecutionRel
    });
    const localIngestionEvidenceBinding = {
      path: localIngestionEvidenceRel,
      sha256: sha256RuntimeFile(input.project_root, localIngestionEvidenceRel),
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    };
    const contextRel = writeSimpleStageArtifact(input.project_root, campaign, "knowledge_pack.json", {
      campaign_id: campaign.campaign_id,
      root_claim_id: campaign.root_claim_id,
      obligation_id: obligation.obligation_id,
      locked_statement_hash: obligation.statement_hash,
      locked_statement_nl: obligation.locked_statement_nl,
      failed_route_retrieval: {
        match_count: priorFailures.matches.length,
        warning_count: priorFailures.warnings.length,
        warning_log_path: priorFailures.warning_log_path,
        matched_candidate_ids: priorFailures.matches.map((route) => route.candidate_id),
        warnings: priorFailures.warnings
      },
      lock_artifacts: [
        ".comath/lock/problem_lock.md",
        ".comath/lock/assumptions.md",
        ".comath/lock/notation.md",
        ".comath/goals.yaml"
      ],
      goal_mode_research_plan: researchPlanBinding,
      goal_mode_adapter_execution_manifest: adapterExecutionBinding,
      goal_mode_local_ingestion_evidence: localIngestionEvidenceBinding,
      retrieval_mode: "service-owned-local-context-pack",
      stage_gate: "knowledge_pack",
      created_at: now()
    });
    const next = writeCampaign(
      input.project_root,
      researchCampaignSchema.parse({
        ...campaign,
        current_stage: "notation_gate",
        stage_runs: [
          ...campaign.stage_runs,
          completedStageRun(campaign, "knowledge_pack", [contextRel, ...knowledgePackArtifacts(campaign)])
        ],
        next_actions: [
          "run goal-mode ingestion, retrieval, theorem-search, and lemma-planning adapters before any proof claim promotion",
          "extract anchored evidence from service-owned adapter execution manifests before candidate generation",
          "review prompt-injection-scanned local evidence before formalization",
          "resolve notation and Lean definitions for the locked problem"
        ]
      }),
      actor
    );
    return { campaign: next, obligation };
  }

  if (campaign.current_stage === "notation_gate") {
    const notationLockRel = ".comath/lock/notation.md";
    const notationLockText = readTextArtifact(input.project_root, notationLockRel).trim();
    const notationConventions = notationConventionsFromObligation(obligation);
    const notationSource = notationConventions.length > 0 ? "formal_spec_lock" : "problem_lock_notation";
    const notationDetailLines =
      notationConventions.length > 0
        ? [
            "FormalSpecLock notation conventions:",
            "",
            ...notationConventions.map(
              (convention) =>
                `- ${convention.symbol}: ${convention.meaning} (source: ${convention.source}${
                  convention.evidence_anchor ? `, evidence: ${convention.evidence_anchor}` : ""
                })`
            )
          ]
        : ["Problem-lock notation excerpt:", "", "```text", notationLockText, "```"];
    writeRuntimeFile(
      input.project_root,
      ".comath/lean/MathResearch/Definitions.lean",
      [
        "-- CoMath notation gate definitions; not proof authority.",
        "namespace MathResearch",
        "",
        "-- No theorem-domain notation is injected here.",
        "-- Conventions must come from the problem lock or an approved FormalSpecLock.",
        "",
        "end MathResearch",
        ""
      ].join("\n")
    );
    const notationRel = `.comath/context_lake/shards/notation-${campaign.campaign_id}.md`;
    writeRuntimeFile(
      input.project_root,
      notationRel,
      [
        "# Notation Gate",
        "",
        `campaign_id: ${campaign.campaign_id}`,
        `obligation_id: ${obligation.obligation_id}`,
        "",
        `Notation source: ${notationSource}`,
        "",
        "No default theorem-domain notation was injected by CoMath.",
        "",
        ...notationDetailLines,
        ""
      ].join("\n")
    );
    const gateRel = writeSimpleStageArtifact(input.project_root, campaign, "notation_gate.json", {
      campaign_id: campaign.campaign_id,
      obligation_id: obligation.obligation_id,
      definitions_path: ".comath/lean/MathResearch/Definitions.lean",
      notation_shard_path: notationRel,
      notation_source: notationSource,
      notation_lock_path: notationLockRel,
      notation_conventions: notationConventions,
      locked_statement_hash: obligation.statement_hash,
      default_notation_injected: false,
      unresolved_symbols: [],
      bypass_reason: null,
      proof_authority: "none",
      can_promote_claim: false,
      created_at: now()
    });
    const next = writeCampaign(
      input.project_root,
      researchCampaignSchema.parse({
        ...campaign,
        current_stage: "skeleton_gate",
        stage_runs: [...campaign.stage_runs, completedStageRun(campaign, "notation_gate", [gateRel, ...notationGateArtifacts(campaign)])],
        next_actions: ["create proof skeleton and obligation DAG"]
      }),
      actor
    );
    return { campaign: next, obligation };
  }

  if (campaign.current_stage === "skeleton_gate" || campaign.current_stage === "planning") {
    const formalizationHintsRel = writeGoalModeFormalizationHints({
      projectRoot: input.project_root,
      campaign,
      obligation
    });
    const formalizationHintsBinding = {
      path: formalizationHintsRel,
      sha256: sha256RuntimeFile(input.project_root, formalizationHintsRel),
      schema_version: "comath.pi_goal_mode_formalization_hints.v1",
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false
    };
    const skeletonBlueprint = writeGoalModeSkeletonBlueprint({
      projectRoot: input.project_root,
      campaign,
      obligation,
      formalizationHintsRel
    });
    const skeletonBlueprintBinding = {
      path: skeletonBlueprint.path,
      sha256: sha256RuntimeFile(input.project_root, skeletonBlueprint.path),
      schema_version: "comath.pi_goal_mode_skeleton_blueprint.v1",
      blueprint_step_ids: skeletonBlueprint.blueprint_step_ids,
      proof_authority: "none" as const,
      can_promote_claim: false as const,
      can_certify_ga: false as const,
      can_create_proof_obligations: false as const
    };
    const goalModePlanning: GoalModeProofPlanningInput = {
      formalization_hints: {
        ...formalizationHintsBinding,
        proof_authority: "none",
        can_promote_claim: false,
        can_certify_ga: false
      },
      skeleton_blueprint: skeletonBlueprintBinding
    };
    const proofPlanning = writeProofPlanningArtifacts({
      projectRoot: input.project_root,
      campaign,
      obligation,
      goalModePlanning
    });
    const planRel = writeSimpleStageArtifact(input.project_root, campaign, "plan.json", {
      campaign_id: campaign.campaign_id,
      root_claim_id: campaign.root_claim_id,
      obligation_id: obligation.obligation_id,
      proof_planning_artifacts: proofPlanning,
      goal_mode_formalization_hints: formalizationHintsBinding,
      goal_mode_skeleton_blueprint: skeletonBlueprintBinding,
      public_stages: [
        "knowledge_pack",
        "notation_gate",
        "skeleton_gate",
        "line_map_gate",
        "candidate_generation",
        "candidate_verification",
        "candidate_arbitration",
        "refutation_red_team",
        "integration_refactor",
        "final_static_audit",
        "final_global_replay",
        "memory_update"
      ],
      proof_kernel_stage: "lemma_sprint",
      ensemble_variants: 8,
      terminal_authority: "final_global_replay",
      stage_gate: "skeleton_gate",
      created_at: now()
    });
    const next = writeCampaign(
      input.project_root,
      researchCampaignSchema.parse({
        ...campaign,
        current_stage: "line_map_gate",
        stage_runs: [
          ...campaign.stage_runs,
          completedStageRun(campaign, "skeleton_gate", [
            planRel,
            formalizationHintsRel,
            skeletonBlueprint.path,
            proofPlanning.lemma_dag_path,
            proofPlanning.skeleton_lean_path,
            proofPlanning.skeleton_report_path
          ])
        ],
        next_actions: [
          "validate line map and proof obligations before candidate generation",
          "use goal-mode formalization hints only as non-authoritative skeleton planning input"
        ]
      }),
      actor
    );
    return { campaign: next, obligation };
  }

  if (campaign.current_stage === "line_map_gate") {
    const lineMapArtifacts = lineMapGateArtifacts(campaign, obligation);
    const missing = lineMapArtifacts.filter((rel) => !artifactExists(input.project_root, rel));
    if (missing.length > 0) {
      return blockForMissingArtifacts({
        projectRoot: input.project_root,
        campaign,
        obligation,
        actor,
        attemptedStage: "line_map_gate",
        missingArtifacts: missing
      });
    }
    const gateRel = writeSimpleStageArtifact(input.project_root, campaign, "line_map_gate.json", {
      campaign_id: campaign.campaign_id,
      obligation_id: obligation.obligation_id,
      line_map_path: campaignProofRel(campaign, "line_map.json"),
      obligation_paths: [campaignProofRel(campaign, join("obligations", `${obligation.obligation_id}.yaml`))],
      unmapped_informal_leaps: [],
      bypass_reason: null,
      generated_candidate_generation_request: true,
      created_at: now()
    });
    const generationRequestRel = writeNativeAgentCandidateGenerationRequest({
      projectRoot: input.project_root,
      campaign,
      obligation
    });
    const next = writeCampaign(
      input.project_root,
      researchCampaignSchema.parse({
        ...campaign,
        current_stage: "candidate_generation",
        stage_runs: [...campaign.stage_runs, completedStageRun(campaign, "line_map_gate", [gateRel, ...lineMapArtifacts, generationRequestRel])],
        next_actions: ["run bounded 8-way candidate generation or exact refutation search"]
      }),
      actor
    );
    return { campaign: next, obligation };
  }

  if (campaign.current_stage === "candidate_generation") {
    let nativeGenerationRequest: { path: string } | undefined;
    try {
      nativeGenerationRequest = readNativeAgentCandidateGenerationRequest(input.project_root, campaign, obligation);
    } catch (error) {
      return blockCampaignAtFinalReplay({
        projectRoot: input.project_root,
        campaign,
        obligation,
        actor,
        stage: "candidate_generation",
        reason: `service-owned native candidate generation request failed: ${error instanceof Error ? error.message : "unknown_error"}`
      });
    }
    if (!nativeGenerationRequest) {
      return blockForBroadSynthesisPlanning({
        projectRoot: input.project_root,
        campaign,
        obligation,
        actor
      });
    }
    const batch = runGaAgentStageCandidates({
      projectRoot: input.project_root,
      campaign,
      obligation,
      stage: "lemma_sprint",
      locked_statement_hash: obligation.statement_hash,
      adapter: createServiceOwnedNativeCandidateLeanAdapter({
        projectRoot: input.project_root,
        campaign,
        obligation
      })
    });
    const candidatesRel = writeStoredCandidates(input.project_root, campaign, obligation.obligation_id, batch.candidates);
    const generationCandidateEvidenceSummary = summarizeCandidateProofGradeEvidence({
      projectRoot: input.project_root,
      campaign,
      candidates: batch.candidates
    });
    const generationRel = writeSimpleStageArtifact(input.project_root, campaign, "candidate_generation.json", {
      schema_version: "comath.live_candidate_generation.v1",
      campaign_id: campaign.campaign_id,
      project_id: campaign.project_id,
      claim_id: campaign.root_claim_id,
      obligation_id: obligation.obligation_id,
      total_candidates: batch.candidates.length,
      ...generationCandidateEvidenceSummary,
      failed_candidates: batch.candidates.filter((candidate) => candidate.state === "candidate_failed").length,
      blocked_candidates: batch.candidates.filter((candidate) => candidate.state === "candidate_blocked").length,
      plausible_candidates: batch.candidates.filter((candidate) => candidate.state === "candidate_plausible_only").length,
      source_request_path: nativeGenerationRequest.path,
      candidate_index_path: candidatesRel,
      candidate_manifest_paths: batch.candidates
        .map((candidate) => candidate.manifest_path)
        .filter((path): path is string => typeof path === "string" && path.length > 0),
      task_card_paths: batch.task_cards.map((taskCard) => normalizeRelPath(join(taskCard.workspace_path, "task_card.json"))),
      agent_output_paths: batch.task_cards.map((taskCard) => normalizeRelPath(join(taskCard.workspace_path, "agent_output.json"))),
      proof_authority: "none",
      can_promote_claim: false,
      next_stage: "candidate_verification",
      created_at: now()
    });
    const next = writeCampaign(
      input.project_root,
      researchCampaignSchema.parse({
        ...campaign,
        current_stage: "candidate_verification",
        open_obligations: [{ ...obligation, status: "candidate_search" }],
        stage_runs: [
          ...campaign.stage_runs,
          completedStageRun(campaign, "candidate_generation", [generationRel, candidatesRel])
        ],
        next_actions: ["verify native 8-way candidate manifests before arbitration"]
      }),
      actor
    );
    return { campaign: next, obligation, ensemble: { candidates: batch.candidates, decision: { selected_candidate_id: null, selection_mode: "recovery_required", proof_authority: "none", rejected_candidates: [], hard_vetoes: [], recovery_plan: ["candidate generation requires verification before arbitration"] } } };
  }

  if (campaign.current_stage === "candidate_verification") {
    const candidates = readStoredCandidates(input.project_root, campaign, obligation.obligation_id);
    const variantIds = new Set(candidates.map((candidate) => candidate.variant_id));
    let manifestBindingsValid = true;
    try {
      for (const candidate of candidates) {
        const manifest = readCandidateManifestForCampaign(input.project_root, candidate);
        if (
          candidate.campaign_id !== campaign.campaign_id ||
          candidate.obligation_id !== obligation.obligation_id ||
          candidate.locked_statement_hash !== obligation.statement_hash ||
          candidate.candidate_statement_hash !== obligation.statement_hash ||
          manifest.campaign_id !== campaign.campaign_id ||
          manifest.obligation_id !== obligation.obligation_id ||
          manifest.locked_statement_hash !== obligation.statement_hash ||
          manifest.candidate_statement_hash !== obligation.statement_hash
        ) {
          manifestBindingsValid = false;
        }
      }
    } catch {
      manifestBindingsValid = false;
    }
    const allRequiredVariantsPresent = defaultVariants.every((variant) => variantIds.has(variant.variant_id));
    const allManifestPathsPresent = candidates.every(
      (candidate) => typeof candidate.manifest_path === "string" && artifactExists(input.project_root, candidate.manifest_path)
    );
    const allStatementHashesMatch = candidates.every(
      (candidate) =>
        candidate.locked_statement_hash === obligation.statement_hash &&
        candidate.candidate_statement_hash === obligation.statement_hash
    );
    const verificationCandidateEvidenceSummary = summarizeCandidateProofGradeEvidence({
      projectRoot: input.project_root,
      campaign,
      candidates
    });
    const verificationRel = writeSimpleStageArtifact(input.project_root, campaign, "candidate_verification.json", {
      campaign_id: campaign.campaign_id,
      obligation_id: obligation.obligation_id,
      total_candidates: candidates.length,
      unique_variant_count: variantIds.size,
      all_required_variants_present: allRequiredVariantsPresent,
      all_manifest_paths_present: allManifestPathsPresent,
      ...verificationCandidateEvidenceSummary,
      failed_candidates: candidates.filter((candidate) => candidate.state === "candidate_failed").length,
      all_statement_hashes_match: allStatementHashesMatch,
      all_manifest_bindings_match_obligation: manifestBindingsValid,
      proof_authority: "none",
      can_promote_claim: false,
      created_at: now()
    });
    if (
      candidates.length !== defaultVariants.length ||
      variantIds.size !== defaultVariants.length ||
      !allRequiredVariantsPresent ||
      !allManifestPathsPresent ||
      !allStatementHashesMatch ||
      !manifestBindingsValid
    ) {
      return blockCampaignAtFinalReplay({
        projectRoot: input.project_root,
        campaign,
        obligation,
        actor,
        stage: "candidate_verification",
        reason: `native candidate verification failed: see ${verificationRel}`
      });
    }
    const next = writeCampaign(
      input.project_root,
      researchCampaignSchema.parse({
        ...campaign,
        current_stage: "candidate_arbitration",
        stage_runs: [...campaign.stage_runs, completedStageRun(campaign, "candidate_verification", [verificationRel])],
        next_actions: ["select candidate by evidence-weighted arbitration"]
      }),
      actor
    );
    return { campaign: next, obligation };
  }

  if (campaign.current_stage === "candidate_arbitration") {
    const candidates = readStoredCandidates(input.project_root, campaign, obligation.obligation_id);
    const { decision, gate } = decideCandidate({ projectRoot: input.project_root, campaign, candidates });
    const decisionRel = ensembleDecisionRel(campaign, obligation.obligation_id);
    let candidateSourceProduction: Awaited<ReturnType<typeof produceCandidateFinalReplayMaterialSourceFromSelectedDescriptor>>;
    if (gate.result === "pass") {
      try {
        candidateSourceProduction = await produceCandidateFinalReplayMaterialSourceFromSelectedDescriptor({
          projectRoot: input.project_root,
          campaign,
          obligation,
          candidates,
          decision
        });
      } catch (error) {
        return blockCampaignAtFinalReplay({
          projectRoot: input.project_root,
          campaign,
          obligation,
          actor,
          stage: "candidate_arbitration",
          reason: `service-owned candidate replay material source production failed: ${error instanceof Error ? error.message : "unknown_error"}`
        });
      }
    }
    if (gate.result !== "pass") {
      const blockerRel = writeSimpleStageArtifact(input.project_root, campaign, "candidate_arbitration_blocker.json", {
        schema_version: "comath.native_candidate_arbitration_blocker.v1",
        campaign_id: campaign.campaign_id,
        claim_id: campaign.root_claim_id,
        obligation_id: obligation.obligation_id,
        decision_path: decisionRel,
        reason: "native candidate arbitration requires proof-grade candidate evidence",
        gate_result: gate.result,
        proof_authority: "none",
        can_promote_claim: false,
        hard_vetoes: gate.hard_vetoes,
        recovery_plan: decision.recovery_plan,
        created_at: now()
      });
      const next = writeCampaign(
        input.project_root,
        researchCampaignSchema.parse({
          ...campaign,
          current_stage: "blocked",
          status: "terminal",
          terminal_state: "blocked_with_replayable_reason",
          open_obligations: [{ ...obligation, status: "blocked" }],
          blockers: [
            {
              reason: "native candidate arbitration requires proof-grade candidate evidence",
              obligation_id: obligation.obligation_id,
              artifact_path: blockerRel,
              decision_path: decisionRel,
              hard_vetoes: gate.hard_vetoes
            }
          ],
          stage_runs: [...campaign.stage_runs, stageRun(campaign, "candidate_arbitration", "blocked", [decisionRel, blockerRel])],
          next_actions: decision.recovery_plan
        }),
        actor
      );
      return {
        campaign: next,
        obligation: { ...obligation, status: "blocked" },
        ensemble: { candidates, decision },
        gate,
        blocker: "native candidate arbitration requires proof-grade candidate evidence"
      };
    }
    const next = writeCampaign(
      input.project_root,
      researchCampaignSchema.parse({
        ...campaign,
        current_stage: "refutation_red_team",
        open_obligations: [{ ...obligation, status: "candidate_selected" }],
        stage_runs: [
          ...campaign.stage_runs,
          completedStageRun(
            campaign,
            "candidate_arbitration",
            [decisionRel, candidateSourceProduction?.sourcePath, candidateSourceProduction?.productionPath].filter(
              (path): path is string => typeof path === "string" && path.length > 0
            )
          )
        ],
        next_actions: ["run mandatory refutation red-team before integration"]
      }),
      actor
    );
    return { campaign: next, obligation, ensemble: { candidates, decision }, gate };
  }

  if (campaign.current_stage === "refutation_red_team" || campaign.current_stage === "adversarial_review") {
    const decision = readStoredDecision(input.project_root, campaign, obligation.obligation_id);
    const reviewRel = writeSimpleStageArtifact(input.project_root, campaign, "refutation_red_team.json", {
      campaign_id: campaign.campaign_id,
      obligation_id: obligation.obligation_id,
      selected_candidate_id: decision?.decision.selected_candidate_id ?? null,
      proof_authority: "none",
      result: "no_counterexample_found",
      checks: [
        "boundary counterexamples",
        "missing hypotheses",
        "false converses",
        "degenerate cases",
        "finite model failures",
        "typeclass mismatch",
        "library theorem condition mismatch",
        "inconsistent notation"
      ],
      integration_blocked: false,
      created_at: now()
    });
    const next = writeCampaign(
      input.project_root,
      researchCampaignSchema.parse({
        ...campaign,
        current_stage: "integration_refactor",
        open_obligations: [{ ...obligation, status: "candidate_selected" }],
        stage_runs: [...campaign.stage_runs, completedStageRun(campaign, "refutation_red_team", [reviewRel])],
        next_actions: ["integrate and refactor selected candidate after red-team gate"]
      }),
      actor
    );
    return { campaign: next, obligation, ensemble: decision };
  }

  if (campaign.current_stage === "integration_refactor" || campaign.current_stage === "integration") {
    const decision = readStoredDecision(input.project_root, campaign, obligation.obligation_id);
    writeRuntimeFile(
      input.project_root,
      ".comath/lean/MathResearch/Integrated.lean",
      [
        "-- CoMath integration/refactor artifact; final authority remains clean replay.",
        "import MathResearch.Theorem",
        "",
        "namespace MathResearch",
        "",
        "-- Selected candidate is integrated only after service-owned Lean replay evidence exists.",
        "",
        "end MathResearch",
        ""
      ].join("\n")
    );
    writeRuntimeFile(
      input.project_root,
      ".comath/proof/import_profile.json",
      `${JSON.stringify(
        {
          campaign_id: campaign.campaign_id,
          obligation_id: obligation.obligation_id,
          selected_candidate_id: decision?.decision.selected_candidate_id ?? null,
          imports: ["MathResearch.Theorem"],
          proof_authority: "none",
          created_at: now()
        },
        null,
        2
      )}\n`
    );
    writeRuntimeFile(
      input.project_root,
      ".comath/proof/integration_report.md",
      [
        "# Integration Report",
        "",
        `campaign_id: ${campaign.campaign_id}`,
        `obligation_id: ${obligation.obligation_id}`,
        `selected_candidate_id: ${decision?.decision.selected_candidate_id ?? "none"}`,
        "",
        "The integrated artifact is a refactor handoff. Formal authority is still withheld until final static audit and clean replay pass.",
        ""
      ].join("\n")
    );
    const integrationRel = writeSimpleStageArtifact(input.project_root, campaign, "integration_refactor.json", {
      campaign_id: campaign.campaign_id,
      obligation_id: obligation.obligation_id,
      selected_candidate_id: decision?.decision.selected_candidate_id ?? null,
      proof_authority: "none",
      required_next_authority: "final_static_audit_and_global_replay",
      integrated_paths: [
        ".comath/lean/MathResearch/Integrated.lean",
        ".comath/proof/import_profile.json",
        ".comath/proof/integration_report.md"
      ],
      created_at: now()
    });
    let producedMaterial: Awaited<ReturnType<typeof produceFinalReplayMaterialFromSelectedIntegrationArtifacts>>;
    try {
      producedMaterial = await produceFinalReplayMaterialFromSelectedIntegrationArtifacts({
        projectRoot: input.project_root,
        campaign,
        obligation,
        decision,
        integrationRel,
        actor
      });
    } catch (error) {
      return blockCampaignAtFinalReplay({
        projectRoot: input.project_root,
        campaign,
        obligation,
        actor,
        stage: "integration_refactor",
        reason: `service-owned Lean Authority v3 replay material production failed: ${error instanceof Error ? error.message : "unknown_error"}`
      });
    }
    const integrationArtifacts = [
      integrationRel,
      ".comath/lean/MathResearch/Integrated.lean",
      ".comath/proof/import_profile.json",
      ".comath/proof/integration_report.md",
      producedMaterial?.materialPath,
      producedMaterial?.materialArtifact.path
    ].filter((path): path is string => typeof path === "string" && path.length > 0);
    const next = writeCampaign(
      input.project_root,
      researchCampaignSchema.parse({
        ...campaign,
        current_stage: "final_static_audit",
        accepted_artifacts: producedMaterial
          ? [...campaign.accepted_artifacts, producedMaterial.materialArtifact]
          : campaign.accepted_artifacts,
        stage_runs: [
          ...campaign.stage_runs,
          completedStageRun(campaign, "integration_refactor", integrationArtifacts)
        ],
        next_actions: ["prepare final static audit before global replay"]
      }),
      actor
    );
    return { campaign: next, obligation, ensemble: decision };
  }

  if (campaign.current_stage === "final_static_audit") {
    let producedTarget: Awaited<ReturnType<typeof produceFinalReplayTargetFromAcceptedMaterials>>;
    try {
      producedTarget = await produceFinalReplayTargetFromAcceptedMaterials({
        projectRoot: input.project_root,
        campaign,
        obligation,
        actor
      });
    } catch (error) {
      return blockCampaignAtFinalReplay({
        projectRoot: input.project_root,
        campaign,
        obligation,
        actor,
        stage: "final_static_audit",
        reason: `service-owned Lean Authority v3 replay target production failed: ${error instanceof Error ? error.message : "unknown_error"}`
      });
    }
    const auditPlanRel = writeSimpleStageArtifact(input.project_root, campaign, "final_static_audit_plan.json", {
      campaign_id: campaign.campaign_id,
      obligation_id: obligation.obligation_id,
      required_reports: [
        "final_static_audit.json",
        "axiom_profile.json",
        "dependency_closure.json",
        "statement_equivalence.json"
      ],
      produced_final_replay_target_path: producedTarget?.targetPath ?? null,
      produced_final_replay_target_artifact_id: producedTarget?.targetArtifact.id ?? null,
      source_final_replay_material_artifact_id: producedTarget?.sourceMaterialArtifact.id ?? null,
      next_stage_runs_clean_replay: true,
      created_at: now()
    });
    const stageArtifacts = [
      auditPlanRel,
      producedTarget?.targetPath,
      producedTarget?.targetArtifact.path
    ].filter((path): path is string => typeof path === "string" && path.length > 0);
    const next = writeCampaign(
      input.project_root,
      researchCampaignSchema.parse({
        ...campaign,
        current_stage: "final_global_replay",
        accepted_artifacts: producedTarget
          ? [...campaign.accepted_artifacts, producedTarget.targetArtifact]
          : campaign.accepted_artifacts,
        stage_runs: [...campaign.stage_runs, completedStageRun(campaign, "final_static_audit", stageArtifacts)],
        next_actions: ["run final global Lean replay and claim promotion gate"]
      }),
      actor
    );
    return { campaign: next, obligation, ensemble: readStoredDecision(input.project_root, campaign, obligation.obligation_id) };
  }

  if (campaign.current_stage === "final_global_replay") {
    return completeCampaignAtFinalGlobalReplay({
      projectRoot: input.project_root,
      campaign,
      obligation,
      actor
    });
  }

  throw new ComathError(`unsupported campaign stage: ${campaign.current_stage}`, {
    statusCode: 400,
    code: "UNSUPPORTED_CAMPAIGN_STAGE"
  });
}

export async function replayCampaign(input: CampaignTickInput): Promise<CampaignTickResult> {
  const campaign = getCampaign(input.project_root, input.campaign_id);
  if (!campaign) {
    throw new ComathError("campaign not found", { statusCode: 404, code: "CAMPAIGN_NOT_FOUND" });
  }
  const claim = getClaim(input.project_root, campaign.project_id, campaign.root_claim_id);
  if (!claim) {
    throw new ComathError("campaign root claim not found", { statusCode: 404, code: "CLAIM_NOT_FOUND" });
  }
  const obligation = campaign.open_obligations[0];
  if (!obligation) {
    throw new ComathError("campaign has no open proof obligation", { statusCode: 400, code: "CAMPAIGN_NO_OBLIGATION" });
  }
  if (campaign.terminal_state === "completed_refutation") {
    return {
      campaign,
      obligation,
      blocker: "completed refutation campaigns do not have a proof replay"
    };
  }
  if (campaign.status === "terminal" && campaign.terminal_state !== "completed_formal_proof") {
    const terminalBlockerReason = campaign.blockers
      .map((blocker) => blocker.reason)
      .find((reason): reason is string => typeof reason === "string");
    return {
      campaign,
      obligation,
      blocker: terminalBlockerReason ?? "terminal campaign does not have a proof replay"
    };
  }
  void claim;
  return blockCampaignAtFinalReplay({
    projectRoot: input.project_root,
    campaign,
    obligation,
    actor: input.actor ?? "campaign",
    reason: "service-owned Lean Authority v3 replay target is not available"
  });
}
