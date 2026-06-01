import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative } from "node:path";
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
import type { LeanProjectFiles } from "../lean/lean-project.js";
import { ensembleCandidatesRel, ensembleDecisionRel } from "../ensemble/paths.js";
import { writeProofPlanningArtifacts } from "../stages/proof-obligation-dag.js";
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
    ".comath/memory/premise_candidates.jsonl"
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
  if (rel.includes("/Skeleton.lean") || rel.includes("/lemma_dag.json") || rel.includes("/skeleton_report.md")) {
    return "skeleton_gate";
  }
  if (rel.includes("/Definitions.lean") || rel.includes("/notation-")) {
    return "notation_gate";
  }
  if (rel.includes("/knowledge-") || rel.includes("/references.bib") || rel.includes("/library_search.jsonl")) {
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
    const campaign = researchCampaignSchema.parse({
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
    appendAuditEvent(input.project_root, {
      project_id: project.project_id,
      event_type: "campaign.needs_formal_spec_lock",
      actor,
      target_id: campaign.campaign_id,
    payload: { root_claim_id: claim.id, blocker_artifact_path: blockerRel }
    });
    return { campaign: writeCampaign(input.project_root, campaign, actor), blocker: "needs_formal_spec_lock" };
  }
  const obligation = createObligation(claim.id, claim.statement_hash, input.user_goal);
  const campaign = researchCampaignSchema.parse({
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
  appendAuditEvent(input.project_root, {
    project_id: project.project_id,
    event_type: "campaign.started",
    actor,
    target_id: campaign.campaign_id,
    payload: { root_claim_id: claim.id, strict_mode: campaign.strict_mode }
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
      can_promote_claim: false
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
    campaign_id: input.campaign.campaign_id,
    root_claim_id: input.campaign.root_claim_id,
    obligation_id: input.obligation.obligation_id,
    reason: input.reason,
    locked_statement_structured: input.obligation.locked_statement_structured,
    required_replay_target: "service-owned Lean Authority v3 clean replay",
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
      leanProject: request.leanProject
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
        next_actions: ["resolve notation and Lean definitions for the locked problem"]
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
    const proofPlanning = writeProofPlanningArtifacts({
      projectRoot: input.project_root,
      campaign,
      obligation
    });
    const planRel = writeSimpleStageArtifact(input.project_root, campaign, "plan.json", {
      campaign_id: campaign.campaign_id,
      root_claim_id: campaign.root_claim_id,
      obligation_id: obligation.obligation_id,
      proof_planning_artifacts: proofPlanning,
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
            proofPlanning.lemma_dag_path,
            proofPlanning.skeleton_lean_path,
            proofPlanning.skeleton_report_path
          ])
        ],
        next_actions: ["validate line map and proof obligations before candidate generation"]
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
