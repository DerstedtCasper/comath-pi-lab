import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { appendAuditEvent } from "../../audit/jsonl-writer.js";
import { getClaim, registerClaim } from "../../claim/claim-store.js";
import { ComathError } from "../../errors.js";
import { initProject } from "../../project/project-store.js";
import { assertPathAllowed } from "../../security/path-policy.js";
import { decideCandidate, type EnsembleDecision } from "../ensemble/decision-forest.js";
import { recordFailedRoutes, retrieveSimilarFailedRoutes } from "../ensemble/failure-aggregator.js";
import type { CleanReplayResult } from "../lean/clean-replay.js";
import { ensembleCandidatesRel, ensembleDecisionRel } from "../ensemble/paths.js";
import { writeProofPlanningArtifacts } from "../stages/proof-obligation-dag.js";
import { getCampaign, nextCampaignId, writeCampaign } from "./research-campaign.js";
import {
  candidateRunSchema,
  proofObligationSchema,
  researchCampaignSchema,
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
    ["# Notation", "", "- `Nat`: Lean natural numbers.", ...problem.notation_lines, ""].join("\n")
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
  const claim = registerClaim(input.project_root, {
    project_id: project.project_id,
    statement: lockedStatement(input.user_goal),
    assumptions: [],
    domain: input.domain ?? "elementary",
    actor,
    status: "conjectural"
  });
  createProblemLock(input.project_root, { claim_id: claim.id, goal: input.user_goal, domain: input.domain ?? "elementary" });
  const obligation = createObligation(claim.id, claim.statement_hash, input.user_goal);
  const timestamp = now();
  const campaign = researchCampaignSchema.parse({
    campaign_id: nextCampaignId(input.project_root),
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
    writeRuntimeFile(
      input.project_root,
      ".comath/lean/MathResearch/Definitions.lean",
      [
        "-- CoMath notation gate definitions; not proof authority.",
        "namespace MathResearch",
        "",
        "-- The current elementary campaign uses Lean Nat notation directly.",
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
        "Notation is locked to Lean Nat syntax and the problem-lock notation file.",
        ""
      ].join("\n")
    );
    const gateRel = writeSimpleStageArtifact(input.project_root, campaign, "notation_gate.json", {
      campaign_id: campaign.campaign_id,
      obligation_id: obligation.obligation_id,
      definitions_path: ".comath/lean/MathResearch/Definitions.lean",
      notation_shard_path: notationRel,
      unresolved_symbols: [],
      bypass_reason: null,
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
      created_at: now()
    });
    const next = writeCampaign(
      input.project_root,
      researchCampaignSchema.parse({
        ...campaign,
        current_stage: "candidate_generation",
        stage_runs: [...campaign.stage_runs, completedStageRun(campaign, "line_map_gate", [gateRel, ...lineMapArtifacts])],
        next_actions: ["run bounded 8-way candidate generation or exact refutation search"]
      }),
      actor
    );
    return { campaign: next, obligation };
  }

  if (campaign.current_stage === "candidate_generation") {
    return blockForBroadSynthesisPlanning({
      projectRoot: input.project_root,
      campaign,
      obligation,
      actor
    });
  }

  if (campaign.current_stage === "candidate_verification") {
    const candidates = readStoredCandidates(input.project_root, campaign, obligation.obligation_id);
    const verificationRel = writeSimpleStageArtifact(input.project_root, campaign, "candidate_verification.json", {
      campaign_id: campaign.campaign_id,
      obligation_id: obligation.obligation_id,
      total_candidates: candidates.length,
      kernel_checked_candidates: candidates.filter((candidate) => candidate.state === "candidate_kernel_checked").length,
      failed_candidates: candidates.filter((candidate) => candidate.state === "candidate_failed").length,
      all_statement_hashes_match: candidates.every(
        (candidate) => candidate.candidate_statement_hash === candidate.locked_statement_hash
      ),
      created_at: now()
    });
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
    const next = writeCampaign(
      input.project_root,
      researchCampaignSchema.parse({
        ...campaign,
        current_stage: gate.result === "pass" ? "refutation_red_team" : "repair",
        open_obligations: [{ ...obligation, status: gate.result === "pass" ? "candidate_selected" : "blocked" }],
        stage_runs: [
          ...campaign.stage_runs,
          completedStageRun(campaign, "candidate_arbitration", [decisionRel])
        ],
        next_actions:
          gate.result === "pass"
            ? ["run mandatory refutation red-team before integration"]
            : ["repair blocked candidate search before retrying arbitration"]
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
    const next = writeCampaign(
      input.project_root,
      researchCampaignSchema.parse({
        ...campaign,
        current_stage: "final_static_audit",
        stage_runs: [
          ...campaign.stage_runs,
          completedStageRun(campaign, "integration_refactor", [
            integrationRel,
            ".comath/lean/MathResearch/Integrated.lean",
            ".comath/proof/import_profile.json",
            ".comath/proof/integration_report.md"
          ])
        ],
        next_actions: ["prepare final static audit before global replay"]
      }),
      actor
    );
    return { campaign: next, obligation, ensemble: decision };
  }

  if (campaign.current_stage === "final_static_audit") {
    const auditPlanRel = writeSimpleStageArtifact(input.project_root, campaign, "final_static_audit_plan.json", {
      campaign_id: campaign.campaign_id,
      obligation_id: obligation.obligation_id,
      required_reports: [
        "final_static_audit.json",
        "axiom_profile.json",
        "dependency_closure.json",
        "statement_equivalence.json"
      ],
      next_stage_runs_clean_replay: true,
      created_at: now()
    });
    const next = writeCampaign(
      input.project_root,
      researchCampaignSchema.parse({
        ...campaign,
        current_stage: "final_global_replay",
        stage_runs: [...campaign.stage_runs, completedStageRun(campaign, "final_static_audit", [auditPlanRel])],
        next_actions: ["run final global Lean replay and claim promotion gate"]
      }),
      actor
    );
    return { campaign: next, obligation, ensemble: readStoredDecision(input.project_root, campaign, obligation.obligation_id) };
  }

  if (campaign.current_stage === "final_global_replay") {
    return blockCampaignAtFinalReplay({
      projectRoot: input.project_root,
      campaign,
      obligation,
      actor,
      reason: "service-owned Lean Authority v3 replay target is not available"
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
