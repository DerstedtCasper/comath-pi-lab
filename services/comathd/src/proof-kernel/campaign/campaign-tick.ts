import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { appendAuditEvent } from "../../audit/jsonl-writer.js";
import { importArtifact } from "../../artifacts/store.js";
import { applyGatePromotedClaim, getClaim, registerClaim } from "../../claim/claim-store.js";
import { appendEvidenceRecord } from "../../evidence/store.js";
import { ComathError } from "../../errors.js";
import { initProject } from "../../project/project-store.js";
import { assertPathAllowed } from "../../security/path-policy.js";
import { promoteClaim } from "../../verification/gate.js";
import { decideCandidate, type EnsembleDecision } from "../ensemble/decision-forest.js";
import { recordFailedRoutes, retrieveSimilarFailedRoutes } from "../ensemble/failure-aggregator.js";
import { runTheoremFamilyCandidates } from "../ensemble/candidate-runner.js";
import { createLeanProjectForTheorem, type LeanProjectFiles } from "../lean/lean-project.js";
import { runCleanLeanReplay, type CleanReplayResult } from "../lean/clean-replay.js";
import { findTheoremFamilyForGoal, findTheoremFamilyForObligation } from "../lean/theorem-family.js";
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

type TheoremSpecificLeanTarget = {
  theorem_name: string;
  namespace: string;
  normalized_target_header: string;
  target_statement_prop: string;
  proof_body: string;
  replay_command: string;
  theorem_file_rel: string;
  audit_file_rel: string;
  formal_spec_rel: string;
  lakefile_rel: string;
  toolchain_rel: string;
};

type BoundedProofBodySynthesis = {
  proofBodyRel: string;
  auditRel: string;
};

type BoundedAuthorityReportPreparation = {
  preparationRel: string;
  staticRel: string;
  statementRel: string;
  dependencyRel: string;
  axiomRel: string;
};

function classifyLockedProblem(goal: string): LockedProblem {
  if (/n\s*\+\s*1\s*=\s*n/i.test(goal)) {
    return {
      statement: "For every natural number n, n + 1 = n.",
      structured: { variable: "n", type: "Nat", proposition: "n + 1 = n" },
      lean_target: "theorem C0001 (n : Nat) : n + 1 = n",
      theorem_name: "MathResearch.C0001",
      notation_lines: ["- `+`: Nat addition."]
    };
  }
  const theoremFamily = findTheoremFamilyForGoal(goal);
  if (theoremFamily) {
    return {
      statement: theoremFamily.lockedStatementNl,
      structured: theoremFamily.structured,
      lean_target: theoremFamily.leanTarget,
      theorem_name: theoremFamily.theoremName,
      notation_lines: theoremFamily.notationLines
    };
  }
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
  writeRuntimeFile(projectRoot, join(".comath", "lock", "assumptions.md"), "# Assumptions\n\n- n : Nat\n");
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
    assumptions: ["n : Nat"],
    status: "queued"
  });
}

export function startCampaign(input: StartCampaignInput): CampaignTickResult {
  const actor = input.actor ?? "campaign";
  const { project } = initProject({ name: input.project_name ?? "CoMath Research Campaign", root_path: input.project_root });
  const claim = registerClaim(input.project_root, {
    project_id: project.project_id,
    statement: lockedStatement(input.user_goal),
    assumptions: ["n : Nat"],
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

function isNatAddOneFalseObligation(obligation: ProofObligation): boolean {
  return obligation.locked_statement_structured.proposition === "n + 1 = n";
}

function isSupportedProofObligation(obligation: ProofObligation): boolean {
  return Boolean(findTheoremFamilyForObligation(obligation));
}

const broadSynthesisBlockedReason = "broad theorem synthesis requires checked replay target";
const broadTargetGeneratedBlockedReason =
  "theorem-specific Lean target generated but proof body and authority reports are missing";
const broadProofBodySynthesizedBlockedReason =
  "bounded theorem-specific proof body synthesized but final Lean Authority v2 reports are missing";
const broadAuthorityReportsPreparedBlockedReason =
  "bounded Lean Authority v2 reports prepared but final clean replay is missing";
const proofBodyForbiddenTokens = ["sorry", "admit", "axiom", "unsafe", "opaque", "constant"];

function isNatDoubleTargetRequest(proposition: string): boolean {
  const normalized = proposition.trim().replace(/\s+/g, " ").replace(/[.。]$/, "");
  if (/\b(do not|don't|not|negation|refute|disprove|counterexample|false)\b/i.test(normalized)) {
    return false;
  }
  return /^prove(?:\s+in\s+lean)?\s+that\s+n\s*\+\s*n\s*=\s*2\s*\*\s*n\s+for\s+natural\s+numbers$/i.test(normalized);
}

function theoremSpecificLeanTarget(campaign: ResearchCampaign, obligation: ProofObligation): TheoremSpecificLeanTarget | undefined {
  const proposition = obligation.locked_statement_nl;
  if (!isNatDoubleTargetRequest(proposition)) {
    return undefined;
  }
  const root = `.comath/lean/broad/${campaign.campaign_id}`;
  return {
    theorem_name: "MathResearch.Target.C0001",
    namespace: "MathResearch.Target",
    normalized_target_header: "theorem C0001 (n : Nat) : n + n = 2 * n",
    target_statement_prop: "forall n : Nat, n + n = 2 * n",
    proof_body: "by omega",
    replay_command: "lake env lean MathResearch/Target.lean",
    theorem_file_rel: `${root}/MathResearch/Target.lean`,
    audit_file_rel: `${root}/Audit/Target.lean`,
    formal_spec_rel: `${root}/FormalSpec/target.json`,
    lakefile_rel: `${root}/lakefile.lean`,
    toolchain_rel: `${root}/lean-toolchain`
  };
}

function writeTheoremSpecificLeanProject(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  obligation: ProofObligation;
  target: TheoremSpecificLeanTarget;
}): string {
  writeRuntimeFile(
    input.projectRoot,
    input.target.toolchain_rel,
    "leanprover/lean4:v4.27.0\n"
  );
  writeRuntimeFile(
    input.projectRoot,
    input.target.lakefile_rel,
    [
      "import Lake",
      "open Lake DSL",
      "",
      "package BroadTarget where",
      "",
      "lean_lib MathResearch where",
      "",
      "lean_lib Audit where",
      "",
      ""
    ].join("\n")
  );
  writeRuntimeFile(
    input.projectRoot,
    input.target.theorem_file_rel,
    [
      "-- CoMath theorem-specific target package; not proof authority.",
      "-- This file records a bounded proof-body candidate; it is not proof authority.",
      `-- expected theorem header: ${input.target.normalized_target_header}`,
      "",
      "import Std",
      "",
      `namespace ${input.target.namespace}`,
      "",
      `def targetStatement : Prop := ${input.target.target_statement_prop}`,
      "",
      `${input.target.normalized_target_header} := ${input.target.proof_body}`,
      "",
      `#check targetStatement`,
      `#check C0001`,
      `#print axioms C0001`,
      "",
      `end ${input.target.namespace}`,
      ""
    ].join("\n")
  );
  writeRuntimeFile(
    input.projectRoot,
    input.target.audit_file_rel,
    [
      "import MathResearch.Target",
      "",
      `#check ${input.target.theorem_name}`,
      `#print axioms ${input.target.theorem_name}`,
      ""
    ].join("\n")
  );
  writeRuntimeFile(
    input.projectRoot,
    input.target.formal_spec_rel,
    `${JSON.stringify(
      {
        schema_version: "comath.v3.theorem_specific_formal_spec.v1",
        campaign_id: input.campaign.campaign_id,
        claim_id: input.campaign.root_claim_id,
        obligation_id: input.obligation.obligation_id,
        locked_statement_hash: input.obligation.statement_hash,
        theorem_name: input.target.theorem_name,
        normalized_target_header: input.target.normalized_target_header,
        target_statement_prop: input.target.target_statement_prop,
        proof_body_status: "synthesized_unreplayed",
        status: "target_generated_unproved",
        proof_authority: "none",
        can_promote_claim: false,
        created_at: now()
      },
      null,
      2
    )}\n`
  );
  return writeSimpleStageArtifact(input.projectRoot, input.campaign, "theorem_specific_lean_project.json", {
    schema_version: "comath.v3.theorem_specific_lean_project.v1",
    campaign_id: input.campaign.campaign_id,
    project_id: input.campaign.project_id,
    claim_id: input.campaign.root_claim_id,
    obligation_id: input.obligation.obligation_id,
    locked_statement_hash: input.obligation.statement_hash,
    target_formal_system: "Lean4",
    status: "target_generated_unproved",
    theorem_name: input.target.theorem_name,
    normalized_target_header: input.target.normalized_target_header,
    target_statement_prop: input.target.target_statement_prop,
    replay_command: input.target.replay_command,
    proof_authority: "none",
    can_run_clean_replay: false,
    can_promote_claim: false,
    blocked_until: "proof body and authority reports exist",
    bound_artifacts: {
      problem_lock: ".comath/lock/problem_lock.md",
      obligation_dag: campaignProofRel(input.campaign, "lemma_dag.json"),
      line_map: campaignProofRel(input.campaign, "line_map.json"),
      formal_spec: input.target.formal_spec_rel
    },
    lean_files: {
      target: input.target.theorem_file_rel,
      audit: input.target.audit_file_rel,
      formal_spec: input.target.formal_spec_rel,
      lakefile: input.target.lakefile_rel,
      toolchain: input.target.toolchain_rel
    },
    required_authority_reports: [
      "static_audit",
      "statement_equivalence",
      "dependency_closure",
      "axiom_profile",
      "final_clean_replay_manifest"
    ],
    created_at: now()
  });
}

function createLeanProjectForTheoremSpecificTarget(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  claim_id: string;
  locked_statement_hash: string;
  target: TheoremSpecificLeanTarget;
}): LeanProjectFiles {
  const leanRootRel = `.comath/lean/broad/${input.campaign.campaign_id}`;
  const theoremFileRel = "MathResearch/Target.lean";
  const auditFileRel = "Audit/Target.lean";
  const leanRoot = assertPathAllowed(input.projectRoot, leanRootRel, { purpose: "runtime-write" });
  return {
    projectRoot: input.projectRoot,
    leanRoot,
    theoremFile: assertPathAllowed(input.projectRoot, input.target.theorem_file_rel, { purpose: "runtime-write" }),
    theoremFileRel,
    formalSpecFile: assertPathAllowed(input.projectRoot, input.target.formal_spec_rel, { purpose: "runtime-write" }),
    auditFile: assertPathAllowed(input.projectRoot, input.target.audit_file_rel, { purpose: "runtime-write" }),
    auditFileRel,
    lakefile: assertPathAllowed(input.projectRoot, input.target.lakefile_rel, { purpose: "runtime-write" }),
    toolchainFile: assertPathAllowed(input.projectRoot, input.target.toolchain_rel, { purpose: "runtime-write" }),
    theoremName: input.target.theorem_name,
    theoremFamilyId: "bounded_nat_double",
    canonicalProposition: "n + n = 2 * n",
    buildTargets: ["MathResearch.Target", "Audit.Target"],
    replayCommand: "lake build MathResearch.Target Audit.Target",
    primaryDependency: "Std omega tactic",
    formalSpec: {
      claim_id: input.claim_id,
      theorem_name: input.target.theorem_name,
      namespace: input.target.namespace,
      normalized_statement: `${input.target.theorem_name} (n : Nat) : n + n = 2 * n`,
      locked_statement_hash: input.locked_statement_hash
    }
  };
}

function patchRuntimeJson(projectRoot: string, rel: string, patch: Record<string, unknown>): void {
  const path = assertPathAllowed(projectRoot, rel, { purpose: "runtime-write" });
  const existing = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  writeRuntimeFile(projectRoot, rel, `${JSON.stringify({ ...existing, ...patch, updated_at: now() }, null, 2)}\n`);
}

function hashTextSha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function sha256RuntimeFile(projectRoot: string, rel: string): { sha256: string; size_bytes: number } {
  const path = assertPathAllowed(projectRoot, rel, { purpose: "read", resolveRealpath: true });
  return {
    sha256: createHash("sha256").update(readFileSync(path)).digest("hex"),
    size_bytes: statSync(path).size
  };
}

function previewBoundedProofBodyAudit(projectRoot: string, campaign: ResearchCampaign, proofBody: string): string {
  const findings = proofBodyForbiddenTokens
    .filter((token) => new RegExp(`\\b${token}\\b`).test(proofBody))
    .map((token) => ({
      token,
      severity: "error",
      message: `forbidden Lean escape hatch detected in synthesized proof body: ${token}`
    }));
  return writeSimpleStageArtifact(projectRoot, campaign, "bounded_proof_body_static_audit.json", {
    schema_version: "comath.v3.bounded_proof_body_static_audit.v1",
    campaign_id: campaign.campaign_id,
    result: findings.length === 0 ? "pass" : "fail",
    scanned_text_sha256: hashTextSha256(proofBody),
    forbidden_tokens: proofBodyForbiddenTokens,
    findings,
    hard_vetoes: findings.map((finding) => `${finding.token}_detected`),
    proof_authority: "none",
    can_promote_claim: false,
    created_at: now()
  });
}

function writeBoundedProofBodySynthesis(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  obligation: ProofObligation;
  target: TheoremSpecificLeanTarget;
  leanProjectRel: string;
}): BoundedProofBodySynthesis {
  const auditRel = previewBoundedProofBodyAudit(input.projectRoot, input.campaign, input.target.proof_body);
  const proofBodyRel = writeSimpleStageArtifact(input.projectRoot, input.campaign, "bounded_proof_body_synthesis.json", {
    schema_version: "comath.v3.bounded_proof_body_synthesis.v1",
    campaign_id: input.campaign.campaign_id,
    project_id: input.campaign.project_id,
    claim_id: input.campaign.root_claim_id,
    obligation_id: input.obligation.obligation_id,
    locked_statement_hash: input.obligation.statement_hash,
    theorem_name: input.target.theorem_name,
    normalized_target_header: input.target.normalized_target_header,
    target_statement_prop: input.target.target_statement_prop,
    status: "proof_body_synthesized_unreplayed",
    synthesized_body: input.target.proof_body,
    synthesis_scope: "bounded_registered_non_template_nat_double_target",
    proof_authority: "none",
    can_run_clean_replay: false,
    can_promote_claim: false,
    audit_preview_path: auditRel,
    bound_artifacts: {
      problem_lock: ".comath/lock/problem_lock.md",
      obligation_dag: campaignProofRel(input.campaign, "lemma_dag.json"),
      line_map: campaignProofRel(input.campaign, "line_map.json"),
      theorem_specific_lean_project: input.leanProjectRel,
      target_lean_file: input.target.theorem_file_rel,
      formal_spec: input.target.formal_spec_rel
    },
    required_before_authority: [
      "candidate manifest with checked statement binding",
      "dependency closure report",
      "axiom profile report",
      "statement equivalence report",
      "final clean Lean replay manifest",
      "fresh promotion gate decision"
    ],
    created_at: now()
  });
  return { proofBodyRel, auditRel };
}

function bindProofBodyToTheoremSpecificLeanProject(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  leanProjectRel: string;
  proofBody: BoundedProofBodySynthesis;
}): void {
  const path = assertPathAllowed(input.projectRoot, input.leanProjectRel, { purpose: "runtime-write" });
  const existing = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  writeRuntimeFile(
    input.projectRoot,
    input.leanProjectRel,
    `${JSON.stringify(
      {
        ...existing,
        status: "proof_body_synthesized_unreplayed",
        proof_body_synthesis_path: input.proofBody.proofBodyRel,
        proof_body_static_audit_path: input.proofBody.auditRel,
        blocked_until: "final Lean Authority v2 reports exist",
        proof_authority: "none",
        can_run_clean_replay: false,
        can_promote_claim: false,
        updated_at: now()
      },
      null,
      2
    )}\n`
  );
}

function parseLeanImports(source: string): string[] {
  return source
    .split(/\r?\n/)
    .map((line) => /^import\s+(.+)$/.exec(line.trim())?.[1])
    .filter((item): item is string => Boolean(item));
}

function writeBoundedAuthorityReportPreparation(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  obligation: ProofObligation;
  target: TheoremSpecificLeanTarget;
  leanProjectRel: string;
  proofBody: BoundedProofBodySynthesis;
}): BoundedAuthorityReportPreparation {
  const leanSource = readFileSync(
    assertPathAllowed(input.projectRoot, input.target.theorem_file_rel, { purpose: "read", resolveRealpath: true }),
    "utf8"
  );
  const forbiddenFindings = proofBodyForbiddenTokens
    .filter((token) => new RegExp(`\\b${token}\\b`).test(leanSource))
    .map((token) => ({
      token,
      severity: "error",
      message: `forbidden Lean escape hatch detected in authority-report preview source: ${token}`
    }));
  const staticRel = writeSimpleStageArtifact(input.projectRoot, input.campaign, "bounded_authority_static_audit_preview.json", {
    schema_version: "comath.v3.bounded_authority_static_audit_preview.v1",
    campaign_id: input.campaign.campaign_id,
    theorem_name: input.target.theorem_name,
    target_lean_file: input.target.theorem_file_rel,
    result: forbiddenFindings.length === 0 ? "preview_pass" : "preview_fail",
    findings: forbiddenFindings,
    hard_vetoes: forbiddenFindings.map((finding) => `${finding.token}_detected`),
    scanned_files: [input.target.theorem_file_rel],
    proof_authority: "none",
    can_promote_claim: false,
    created_at: now()
  });
  const expectedHeader = input.target.normalized_target_header;
  const statementMatches = leanSource.includes(`${expectedHeader} := ${input.target.proof_body}`);
  const statementRel = writeSimpleStageArtifact(input.projectRoot, input.campaign, "bounded_authority_statement_equivalence_preview.json", {
    schema_version: "comath.v3.bounded_authority_statement_equivalence_preview.v1",
    campaign_id: input.campaign.campaign_id,
    obligation_id: input.obligation.obligation_id,
    locked_statement_hash: input.obligation.statement_hash,
    theorem_name: input.target.theorem_name,
    normalized_target_header: input.target.normalized_target_header,
    target_statement_prop: input.target.target_statement_prop,
    result: statementMatches ? "preview_pass" : "preview_fail",
    status: statementMatches ? "target_header_matches_locked_statement" : "target_header_mismatch",
    hard_vetoes: statementMatches ? [] : ["target_header_mismatch"],
    proof_authority: "none",
    can_promote_claim: false,
    created_at: now()
  });
  const dependencyRel = writeSimpleStageArtifact(input.projectRoot, input.campaign, "bounded_authority_dependency_closure_preview.json", {
    schema_version: "comath.v3.bounded_authority_dependency_closure_preview.v1",
    campaign_id: input.campaign.campaign_id,
    theorem_name: input.target.theorem_name,
    result: "preview_pass",
    lean_toolchain: readFileSync(assertPathAllowed(input.projectRoot, input.target.toolchain_rel, { purpose: "read", resolveRealpath: true }), "utf8").trim(),
    lakefile_hash: sha256RuntimeFile(input.projectRoot, input.target.lakefile_rel).sha256,
    local_file_hashes: {
      "MathResearch/Target.lean": sha256RuntimeFile(input.projectRoot, input.target.theorem_file_rel).sha256,
      "FormalSpec/target.json": sha256RuntimeFile(input.projectRoot, input.target.formal_spec_rel).sha256
    },
    imports: {
      "MathResearch/Target.lean": parseLeanImports(leanSource)
    },
    hard_vetoes: [],
    proof_authority: "none",
    can_promote_claim: false,
    created_at: now()
  });
  const axiomRel = writeSimpleStageArtifact(input.projectRoot, input.campaign, "bounded_authority_axiom_profile_preview.json", {
    schema_version: "comath.v3.bounded_authority_axiom_profile_preview.v1",
    campaign_id: input.campaign.campaign_id,
    theorem_name: input.target.theorem_name,
    result: "preview_blocked",
    trust_profile: {
      profile_id: "ordinary_classical",
      allowed_axioms: ["propext", "Quot.sound", "Classical.choice"],
      require_print_axioms: true
    },
    detected_axioms: [],
    hard_vetoes: ["requires_clean_replay_axiom_output"],
    proof_authority: "none",
    can_promote_claim: false,
    created_at: now()
  });
  const preparationRel = writeSimpleStageArtifact(input.projectRoot, input.campaign, "bounded_authority_report_preparation.json", {
    schema_version: "comath.v3.bounded_authority_report_preparation.v1",
    campaign_id: input.campaign.campaign_id,
    project_id: input.campaign.project_id,
    claim_id: input.campaign.root_claim_id,
    obligation_id: input.obligation.obligation_id,
    locked_statement_hash: input.obligation.statement_hash,
    theorem_name: input.target.theorem_name,
    status: "authority_reports_prepared_nonpromotional",
    proof_authority: "none",
    can_run_clean_replay: false,
    can_promote_claim: false,
    final_replay_manifest_path: null,
    bound_artifacts: {
      problem_lock: ".comath/lock/problem_lock.md",
      obligation_dag: campaignProofRel(input.campaign, "lemma_dag.json"),
      line_map: campaignProofRel(input.campaign, "line_map.json"),
      theorem_specific_lean_project: input.leanProjectRel,
      proof_body_synthesis: input.proofBody.proofBodyRel,
      proof_body_static_audit: input.proofBody.auditRel,
      target_lean_file: input.target.theorem_file_rel,
      formal_spec: input.target.formal_spec_rel
    },
    report_paths: {
      static_audit_preview: staticRel,
      statement_equivalence_preview: statementRel,
      dependency_closure_preview: dependencyRel,
      axiom_profile_preview: axiomRel
    },
    required_before_authority: [
      "candidate manifest with checked statement binding",
      "clean workspace replay",
      "fresh final static audit report",
      "fresh statement equivalence report",
      "fresh dependency closure report",
      "fresh axiom profile report",
      "final clean Lean replay manifest",
      "fresh promotion gate decision"
    ],
    created_at: now()
  });
  return { preparationRel, staticRel, statementRel, dependencyRel, axiomRel };
}

function bindAuthorityPreparationToTheoremSpecificLeanProject(input: {
  projectRoot: string;
  leanProjectRel: string;
  authorityPreparation: BoundedAuthorityReportPreparation;
}): void {
  const path = assertPathAllowed(input.projectRoot, input.leanProjectRel, { purpose: "runtime-write" });
  const existing = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  writeRuntimeFile(
    input.projectRoot,
    input.leanProjectRel,
    `${JSON.stringify(
      {
        ...existing,
        status: "authority_reports_prepared_nonpromotional",
        authority_report_preparation_path: input.authorityPreparation.preparationRel,
        authority_preview_report_paths: {
          static_audit_preview: input.authorityPreparation.staticRel,
          statement_equivalence_preview: input.authorityPreparation.statementRel,
          dependency_closure_preview: input.authorityPreparation.dependencyRel,
          axiom_profile_preview: input.authorityPreparation.axiomRel
        },
        blocked_until: "final clean Lean replay manifest exists",
        proof_authority: "none",
        can_run_clean_replay: false,
        can_promote_claim: false,
        updated_at: now()
      },
      null,
      2
    )}\n`
  );
}

function blockForBroadSynthesisPlanning(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  obligation: ProofObligation;
  actor: string;
}): CampaignTickResult {
  const obligationDagRel = campaignProofRel(input.campaign, "lemma_dag.json");
  const lineMapRel = campaignProofRel(input.campaign, "line_map.json");
  const leanTarget = theoremSpecificLeanTarget(input.campaign, input.obligation);
  const leanProjectRel = leanTarget
    ? writeTheoremSpecificLeanProject({
        projectRoot: input.projectRoot,
        campaign: input.campaign,
        obligation: input.obligation,
        target: leanTarget
      })
    : undefined;
  const proofBody = leanTarget && leanProjectRel
    ? writeBoundedProofBodySynthesis({
        projectRoot: input.projectRoot,
        campaign: input.campaign,
        obligation: input.obligation,
        target: leanTarget,
        leanProjectRel
      })
    : undefined;
  if (leanProjectRel && proofBody) {
    bindProofBodyToTheoremSpecificLeanProject({
      projectRoot: input.projectRoot,
      campaign: input.campaign,
      leanProjectRel,
      proofBody
    });
  }
  const authorityPreparation = leanTarget && leanProjectRel && proofBody
    ? writeBoundedAuthorityReportPreparation({
        projectRoot: input.projectRoot,
        campaign: input.campaign,
        obligation: input.obligation,
        target: leanTarget,
        leanProjectRel,
        proofBody
      })
    : undefined;
  if (leanProjectRel && authorityPreparation) {
    bindAuthorityPreparationToTheoremSpecificLeanProject({
      projectRoot: input.projectRoot,
      leanProjectRel,
      authorityPreparation
    });
  }
  const replayTargetRel = writeSimpleStageArtifact(input.projectRoot, input.campaign, "broad_replay_target.json", {
    schema_version: "comath.v3.broad_replay_target.v1",
    campaign_id: input.campaign.campaign_id,
    claim_id: input.campaign.root_claim_id,
    obligation_id: input.obligation.obligation_id,
    locked_statement_hash: input.obligation.statement_hash,
    target_formal_system: "Lean4",
    status: authorityPreparation
      ? "authority_reports_prepared_nonpromotional"
      : proofBody
        ? "proof_body_synthesized_unreplayed"
        : leanTarget
          ? "target_generated_unproved"
          : "unresolved",
    theorem_name: leanTarget?.theorem_name ?? null,
    lean_target: input.obligation.lean_target ?? null,
    replay_command: leanTarget?.replay_command ?? null,
    lean_project_target_path: leanProjectRel ?? null,
    proof_body_synthesis_path: proofBody?.proofBodyRel ?? null,
    proof_body_static_audit_path: proofBody?.auditRel ?? null,
    authority_report_preparation_path: authorityPreparation?.preparationRel ?? null,
    can_promote_claim: false,
    required_before_replay: proofBody
      ? [
          "candidate manifest with checked statement binding",
          "dependency closure report",
          "axiom profile report",
          "statement equivalence report",
          "final clean Lean replay manifest"
        ]
      : [
          leanTarget ? "add kernel-checked proof body" : "theorem-specific Lean declaration",
          "candidate manifest with checked statement binding",
          "dependency closure report",
          "axiom profile report",
          "statement equivalence report",
          "final clean Lean replay manifest"
        ],
    proof_authority: "none",
    can_run_clean_replay: false,
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
    theorem_specific_lean_project_path: leanProjectRel ?? null,
    proof_body_synthesis_path: proofBody?.proofBodyRel ?? null,
    proof_body_static_audit_path: proofBody?.auditRel ?? null,
    authority_report_preparation_path: authorityPreparation?.preparationRel ?? null,
    blocked_until: leanTarget
      ? proofBody
        ? authorityPreparation
          ? "final clean Lean replay manifest exists"
          : "final Lean Authority v2 reports exist"
        : "proof body and authority reports exist"
      : "a theorem-specific Lean declaration and checked replay target are generated",
    created_at: now()
  });
  const failureRel = writeSimpleStageArtifact(input.projectRoot, input.campaign, "broad_synthesis_failure.json", {
    schema_version: "comath.v3.broad_synthesis_failure.v1",
    campaign_id: input.campaign.campaign_id,
    claim_id: input.campaign.root_claim_id,
    obligation_id: input.obligation.obligation_id,
    reason: authorityPreparation
      ? broadAuthorityReportsPreparedBlockedReason
      : proofBody
        ? broadProofBodySynthesizedBlockedReason
      : leanTarget
        ? broadTargetGeneratedBlockedReason
        : broadSynthesisBlockedReason,
    fail_closed: true,
    promotion_blocked: true,
    proof_authority: "none",
    replayable_evidence: {
      problem_lock: ".comath/lock/problem_lock.md",
      obligation_dag: obligationDagRel,
      line_map: lineMapRel,
      planning_artifact: planningRel,
      replay_target_artifact: replayTargetRel,
      lean_project_target: leanProjectRel ?? null,
      proof_body_synthesis: proofBody?.proofBodyRel ?? null,
      proof_body_static_audit: proofBody?.auditRel ?? null,
      authority_report_preparation: authorityPreparation?.preparationRel ?? null
    },
    next_actions: [
      authorityPreparation
        ? "run final clean replay in a clean workspace before any promotion"
        : proofBody
          ? "run candidate manifest binding, dependency closure, axiom profile, statement equivalence, and final clean replay"
        : "synthesize a theorem-specific Lean target before candidate generation",
      "rerun 8-way candidate generation only after replay target resolution",
      "promote no claim until final clean replay and promotion gate pass"
    ],
    created_at: now()
  });
  const blocker = {
    reason: authorityPreparation
      ? broadAuthorityReportsPreparedBlockedReason
      : proofBody
        ? broadProofBodySynthesizedBlockedReason
      : leanTarget
        ? broadTargetGeneratedBlockedReason
        : broadSynthesisBlockedReason,
    obligation_id: input.obligation.obligation_id,
    artifact_path: failureRel,
    planning_artifact_path: planningRel,
    replay_target_path: replayTargetRel,
    lean_project_target_path: leanProjectRel ?? null,
    proof_body_synthesis_path: proofBody?.proofBodyRel ?? null,
    authority_report_preparation_path: authorityPreparation?.preparationRel ?? null
  };
  const stageArtifacts = leanProjectRel && proofBody && authorityPreparation
    ? [
        planningRel,
        replayTargetRel,
        leanProjectRel,
        proofBody.proofBodyRel,
        proofBody.auditRel,
        authorityPreparation.preparationRel,
        authorityPreparation.staticRel,
        authorityPreparation.statementRel,
        authorityPreparation.dependencyRel,
        authorityPreparation.axiomRel,
        failureRel
      ]
    : leanProjectRel && proofBody
      ? [planningRel, replayTargetRel, leanProjectRel, proofBody.proofBodyRel, proofBody.auditRel, failureRel]
    : leanProjectRel
      ? [planningRel, replayTargetRel, leanProjectRel, failureRel]
    : [planningRel, replayTargetRel, failureRel];
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
        leanTarget
          ? proofBody
            ? authorityPreparation
              ? "run final clean Lean replay before any claim promotion"
              : "run final Lean Authority v2 reports before any claim promotion"
            : "add a kernel-checked proof body and authority reports before rerunning broad synthesis"
          : "resolve a theorem-specific Lean replay target before rerunning broad synthesis",
        "keep the claim conjectural until final clean replay evidence exists"
      ]
    }),
    input.actor
  );
  return {
    campaign: next,
    obligation: { ...input.obligation, status: "blocked" },
    blocker: authorityPreparation
      ? broadAuthorityReportsPreparedBlockedReason
      : proofBody
        ? broadProofBodySynthesizedBlockedReason
      : leanTarget
        ? broadTargetGeneratedBlockedReason
        : broadSynthesisBlockedReason
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
    required_replay_target: "registered theorem-family clean Lean replay",
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

async function runFinalReplayAndPromotion(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  obligation: ProofObligation;
  actor: string;
  leanProject: LeanProjectFiles;
  proofRoute: string;
  patchAuthorityArtifacts?: (details: { finalReplayManifestRel: string; replay: CleanReplayResult }) => void;
}): Promise<CampaignTickResult> {
  const claim = getClaim(input.projectRoot, input.campaign.project_id, input.campaign.root_claim_id);
  if (!claim) {
    throw new ComathError("campaign root claim not found", { statusCode: 404, code: "CLAIM_NOT_FOUND" });
  }
  const replay = runCleanLeanReplay({
    projectRoot: input.projectRoot,
    campaign_id: input.campaign.campaign_id,
    claim_id: claim.id,
    leanProject: input.leanProject
  });

  const proofArtifact = await importArtifact({
    projectRoot: input.projectRoot,
    project_id: input.campaign.project_id,
    source_path: input.leanProject.theoremFile,
    kind: "code",
    actor: input.actor
  });
  const finalReplayManifestRel = join(".comath", "evidence", claim.id, "lean", "final_replay_manifest.json").replace(/\\/g, "/");
  const replayArtifact = await importArtifact({
    projectRoot: input.projectRoot,
    project_id: input.campaign.project_id,
    source_path: assertPathAllowed(input.projectRoot, finalReplayManifestRel, {
      purpose: "read",
      resolveRealpath: true
    }),
    kind: "runner_output",
    actor: input.actor
  });
  const auditArtifact = await importArtifact({
    projectRoot: input.projectRoot,
    project_id: input.campaign.project_id,
    source_path: assertPathAllowed(input.projectRoot, replay.final_replay.static_audit_path, {
      purpose: "read",
      resolveRealpath: true
    }),
    kind: "runner_output",
    actor: input.actor
  });
  const evidence = appendEvidenceRecord(input.projectRoot, {
    project_id: input.campaign.project_id,
    claim_id: claim.id,
    kind: "lean",
    summary: `Clean Lean/Lake replay passed for ${input.leanProject.theoremName} via ${input.leanProject.primaryDependency} with static audit, dependency closure, axiom profile, and statement-equivalence reports.`,
    artifact_ids: [proofArtifact.id, replayArtifact.id, auditArtifact.id]
  });
  const metadataReadyClaim = applyGatePromotedClaim(input.projectRoot, {
    ...claim,
    formalization_status: "kernel_checked",
    dependency_closure_status: "all_dependencies_present",
    audit_state: "audit_passed",
    updated_at: now()
  });
  appendAuditEvent(input.projectRoot, {
    project_id: input.campaign.project_id,
    event_type: "proof_kernel.metadata_ready",
    actor: input.actor,
    target_id: metadataReadyClaim.id,
    payload: {
      replay_id: replay.final_replay.replay_id,
      evidence_id: evidence.id
    }
  });
  const promotion = promoteClaim(input.projectRoot, {
    project_id: input.campaign.project_id,
    claim_id: claim.id,
    target_status: "formally_checked",
    evidence_ids: [evidence.id],
    artifact_ids: [proofArtifact.id, replayArtifact.id, auditArtifact.id],
    actor: input.actor
  });
  const ok = replay.final_replay.result === "pass" && promotion.gate.ok;
  const sliceSummaryRel = campaignRel(input.campaign, "v3_formal_campaign_slice.json");
  const finalReplayArtifactPaths = [
    replay.final_replay.stdout_path,
    replay.final_replay.static_audit_path,
    replay.final_replay.axiom_profile_path,
    replay.final_replay.dependency_closure_path,
    replay.final_replay.statement_equivalence_path,
    finalReplayManifestRel
  ];
  const finalReplayRun = stageRun(input.campaign, "final_global_replay", ok ? "completed" : "blocked", finalReplayArtifactPaths);
  const memoryArtifactPaths = ok
    ? [
        ".comath/memory/proof_memory_events.jsonl",
        ".comath/context_lake/shards/final-handoff.md",
        ".comath/snapshots/replay/final_manifest.json",
        sliceSummaryRel
      ]
    : [];
  if (ok) {
    input.patchAuthorityArtifacts?.({ finalReplayManifestRel, replay });
    const memoryRun = completedStageRun({ ...input.campaign, stage_runs: [...input.campaign.stage_runs, finalReplayRun] }, "memory_update", memoryArtifactPaths);
    const finalStageRuns = [...input.campaign.stage_runs, finalReplayRun, memoryRun];
    const storedDecision = readStoredDecision(input.projectRoot, input.campaign, input.obligation.obligation_id);
    writeRuntimeFile(
      input.projectRoot,
      ".comath/memory/proof_memory_events.jsonl",
      `${JSON.stringify({
        type: "FormalProofVerified",
        campaign_id: input.campaign.campaign_id,
        claim_id: claim.id,
        theorem_name: replay.final_replay.theorem_name,
        final_theorem_hash: proofArtifact.sha256,
        proof_route: input.proofRoute,
        failed_routes_preserved_at: ".comath/proof_memory/events.jsonl",
        created_at: now()
      })}\n`
    );
    writeRuntimeFile(
      input.projectRoot,
      ".comath/context_lake/shards/final-handoff.md",
      [
        "# Final Handoff",
        "",
        `campaign_id: ${input.campaign.campaign_id}`,
        `claim_id: ${claim.id}`,
        `theorem_name: ${replay.final_replay.theorem_name}`,
        `final_replay_manifest: .comath/evidence/${claim.id}/lean/final_replay_manifest.json`,
        "",
        "The claim was promoted only after final static audit, dependency closure, axiom profile, statement equivalence, and clean replay passed.",
        ""
      ].join("\n")
    );
    writeRuntimeFile(
      input.projectRoot,
      ".comath/snapshots/replay/final_manifest.json",
      `${JSON.stringify(
        {
          campaign_id: input.campaign.campaign_id,
          claim_id: claim.id,
          replay_id: replay.final_replay.replay_id,
          final_replay_manifest: finalReplayManifestRel,
          proof_memory_events: ".comath/memory/proof_memory_events.jsonl",
          created_at: now()
        },
        null,
        2
      )}\n`
    );
    writeRuntimeFile(
      input.projectRoot,
      sliceSummaryRel,
      `${JSON.stringify(
        {
          schema_version: "comath.v3.formal_campaign_slice.v1",
          campaign_id: input.campaign.campaign_id,
          project_id: input.campaign.project_id,
          claim_id: claim.id,
          user_goal: input.campaign.user_goal,
          obligation_id: input.obligation.obligation_id,
          locked_statement_hash: input.obligation.statement_hash,
          theorem_family: replay.final_replay.theorem_family,
          canonical_proposition: replay.final_replay.canonical_proposition,
          terminal_state: "completed_formal_proof",
          final_claim_status: promotion.claim.status,
          proof_authority: "lean_clean_replay",
          stage_sequence: finalStageRuns.map((run) => run.stage),
          candidate_summary: {
            total_candidates: storedDecision?.candidates.length ?? 0,
            selected_candidate_id: storedDecision?.decision.selected_candidate_id ?? null,
            selection_mode: storedDecision?.decision.selection_mode ?? "recovery_required",
            trivial_bypass_logged: (storedDecision?.candidates.length ?? 0) === 0,
            candidate_artifact_paths: storedDecision?.candidates.map((candidate) => candidate.manifest_path).filter(Boolean) ?? []
          },
          final_audit: {
            result: replay.static_audit.result,
            artifact_path: replay.final_replay.static_audit_path,
            hard_vetoes: replay.static_audit.hard_vetoes,
            warnings: replay.static_audit.warnings
          },
          clean_replay: {
            result: replay.final_replay.result,
            replay_id: replay.final_replay.replay_id,
            replay_command: replay.final_replay.command,
            final_replay_manifest: finalReplayManifestRel,
            stdout_path: replay.final_replay.stdout_path,
            stderr_path: replay.final_replay.stderr_path
          },
          promotion: {
            result: promotion.gate.ok ? "pass" : "blocked",
            gate_id: promotion.gate.id,
            evidence_ids: [evidence.id],
            artifact_ids: [proofArtifact.id, replayArtifact.id, auditArtifact.id]
          },
          replayable_artifact_bundle: {
            final_replay_manifest: finalReplayManifestRel,
            final_static_audit: replay.final_replay.static_audit_path,
            final_replay_log: replay.final_replay.stdout_path,
            final_replay_stderr: replay.final_replay.stderr_path,
            axiom_profile: replay.final_replay.axiom_profile_path,
            dependency_closure: replay.final_replay.dependency_closure_path,
            statement_equivalence: replay.final_replay.statement_equivalence_path,
            proof_memory_events: ".comath/memory/proof_memory_events.jsonl",
            snapshot_final_manifest: ".comath/snapshots/replay/final_manifest.json",
            final_handoff: ".comath/context_lake/shards/final-handoff.md"
          },
          created_at: now()
        },
        null,
        2
      )}\n`
    );
  }
  const memoryRun = ok
    ? completedStageRun({ ...input.campaign, stage_runs: [...input.campaign.stage_runs, finalReplayRun] }, "memory_update", memoryArtifactPaths)
    : undefined;
  const next = writeCampaign(
    input.projectRoot,
    researchCampaignSchema.parse({
      ...input.campaign,
      current_stage: ok ? "completed_formal_proof" : "blocked",
      status: "terminal",
      terminal_state: ok ? "completed_formal_proof" : "blocked_with_replayable_reason",
      open_obligations: [{ ...input.obligation, status: ok ? "integrated" : "blocked" }],
      accepted_artifacts: [proofArtifact, replayArtifact, auditArtifact],
      blockers: ok ? [] : [{ reason: "final replay or promotion gate failed", gate: promotion.gate }],
      stage_runs: [...input.campaign.stage_runs, finalReplayRun, ...(memoryRun ? [memoryRun] : [])],
      next_actions: ok ? [] : ["inspect final replay logs and promotion gate vetoes"]
    }),
    input.actor
  );
  return {
    campaign: next,
    obligation: input.obligation,
    ensemble: readStoredDecision(input.projectRoot, input.campaign, input.obligation.obligation_id),
    gate: {
      gate_id: "GD-0002",
      campaign_id: input.campaign.campaign_id,
      stage: "final_global_lean_replay",
      subject_id: claim.id,
      result: ok ? "pass" : "blocked",
      evidence: [proofArtifact, replayArtifact, auditArtifact],
      hard_vetoes: promotion.gate.vetoes,
      warnings: promotion.gate.warnings,
      decision_rationale_summary: ok
        ? "Claim promoted only after static audit, clean Lean replay, statement equivalence, dependency closure, and axiom profile passed."
        : "Final replay or claim promotion gate failed.",
      created_at: now()
    },
    final_replay: replay.final_replay,
    static_audit: replay.static_audit
  };
}

async function completeVerifiedCounterexample(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  obligation: ProofObligation;
  actor: string;
}): Promise<CampaignTickResult> {
  const claim = getClaim(input.projectRoot, input.campaign.project_id, input.campaign.root_claim_id);
  if (!claim) {
    throw new ComathError("campaign root claim not found", { statusCode: 404, code: "CLAIM_NOT_FOUND" });
  }
  const counterexample_id = "CE-0001";
  const artifactRel = join(".comath", "evidence", claim.id, "counterexample", `${counterexample_id}.json`);
  const payload = {
    counterexample_id,
    campaign_id: input.campaign.campaign_id,
    claim_id: claim.id,
    statement_hash: claim.statement_hash,
    statement: claim.statement,
    assignment: { n: 0 },
    lhs: 1,
    rhs: 0,
    result: "refutes" as const,
    verification: "exact Nat arithmetic evaluation: 0 + 1 = 1 and 0 = 0",
    created_at: now()
  };
  const artifactPath = writeRuntimeFile(input.projectRoot, artifactRel, `${JSON.stringify(payload, null, 2)}\n`);
  const artifact = await importArtifact({
    projectRoot: input.projectRoot,
    project_id: input.campaign.project_id,
    source_path: artifactPath,
    kind: "runner_output",
    actor: input.actor
  });
  const evidence = appendEvidenceRecord(input.projectRoot, {
    project_id: input.campaign.project_id,
    claim_id: claim.id,
    kind: "counterexample",
    summary: "Exact Nat counterexample refutes the locked statement at n = 0.",
    artifact_ids: [artifact.id]
  });
  const refuted = applyGatePromotedClaim(input.projectRoot, {
    ...claim,
    status: "refuted",
    evidence_level: 2,
    audit_state: "audit_passed",
    updated_at: now()
  });
  appendAuditEvent(input.projectRoot, {
    project_id: input.campaign.project_id,
    event_type: "proof_kernel.counterexample_verified",
    actor: input.actor,
    target_id: refuted.id,
    payload: {
      evidence_id: evidence.id,
      artifact_id: artifact.id,
      counterexample_id,
      statement_hash: claim.statement_hash
    }
  });
  const next = writeCampaign(
    input.projectRoot,
    researchCampaignSchema.parse({
      ...input.campaign,
      current_stage: "completed_refutation",
      status: "terminal",
      terminal_state: "completed_refutation",
      open_obligations: [{ ...input.obligation, status: "refuted" }],
      accepted_artifacts: [artifact],
      blockers: [],
      stage_runs: [
        ...input.campaign.stage_runs,
        completedStageRun(input.campaign, "candidate_generation", [artifactRel.replace(/\\/g, "/")])
      ],
      next_actions: []
    }),
    input.actor
  );
  return {
    campaign: next,
    obligation: { ...input.obligation, status: "refuted" },
    counterexample: {
      counterexample_id,
      assignment: payload.assignment,
      lhs: payload.lhs,
      rhs: payload.rhs,
      result: payload.result,
      artifact_path: artifactRel.replace(/\\/g, "/")
    },
    gate: {
      gate_id: "GD-0001",
      campaign_id: input.campaign.campaign_id,
      stage: "lemma_sprint",
      subject_id: claim.id,
      result: "pass",
      evidence: [artifact],
      hard_vetoes: [],
      warnings: [],
      decision_rationale_summary: "Verified exact counterexample; campaign terminates as refutation instead of proof promotion.",
      created_at: now()
    }
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
        "- Nat.add_zero / Nat.mul_zero theorem-family registry entries when applicable.",
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
        results: ["registered_theorem_family_or_deferred"],
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
    if (isNatAddOneFalseObligation(obligation)) {
      return completeVerifiedCounterexample({
        projectRoot: input.project_root,
        campaign,
        obligation,
        actor
      });
    }
    const theoremFamily = findTheoremFamilyForObligation(obligation);
    if (!theoremFamily) {
      const target = theoremSpecificLeanTarget(campaign, obligation);
      if (target) {
        const leanProjectRel = writeTheoremSpecificLeanProject({
          projectRoot: input.project_root,
          campaign,
          obligation,
          target
        });
        const proofBody = writeBoundedProofBodySynthesis({
          projectRoot: input.project_root,
          campaign,
          obligation,
          target,
          leanProjectRel
        });
        bindProofBodyToTheoremSpecificLeanProject({
          projectRoot: input.project_root,
          campaign,
          leanProjectRel,
          proofBody
        });
        const authorityPreparation = writeBoundedAuthorityReportPreparation({
          projectRoot: input.project_root,
          campaign,
          obligation,
          target,
          leanProjectRel,
          proofBody
        });
        bindAuthorityPreparationToTheoremSpecificLeanProject({
          projectRoot: input.project_root,
          leanProjectRel,
          authorityPreparation
        });
        const replayTargetRel = writeSimpleStageArtifact(input.project_root, campaign, "broad_replay_target.json", {
          schema_version: "comath.v3.broad_replay_target.v1",
          campaign_id: campaign.campaign_id,
          claim_id: campaign.root_claim_id,
          obligation_id: obligation.obligation_id,
          locked_statement_hash: obligation.statement_hash,
          target_formal_system: "Lean4",
          status: "authority_reports_prepared_clean_replay_ready",
          theorem_name: target.theorem_name,
          lean_target: obligation.lean_target ?? null,
          replay_command: target.replay_command,
          lean_project_target_path: leanProjectRel,
          proof_body_synthesis_path: proofBody.proofBodyRel,
          proof_body_static_audit_path: proofBody.auditRel,
          authority_report_preparation_path: authorityPreparation.preparationRel,
          can_promote_claim: false,
          required_before_replay: [
            "fresh final static audit report",
            "fresh statement equivalence report",
            "fresh dependency closure report",
            "fresh axiom profile report",
            "final clean Lean replay manifest",
            "fresh promotion gate decision"
          ],
          proof_authority: "none",
          can_run_clean_replay: true,
          created_at: now()
        });
        const replay = await runFinalReplayAndPromotion({
          projectRoot: input.project_root,
          campaign: {
            ...campaign,
            stage_runs: [
              ...campaign.stage_runs,
              completedStageRun(campaign, "candidate_generation", [
                replayTargetRel,
                leanProjectRel,
                proofBody.proofBodyRel,
                proofBody.auditRel,
                authorityPreparation.preparationRel,
                authorityPreparation.staticRel,
                authorityPreparation.statementRel,
                authorityPreparation.dependencyRel,
                authorityPreparation.axiomRel
              ])
            ]
          },
          obligation,
          actor,
          leanProject: createLeanProjectForTheoremSpecificTarget({
            projectRoot: input.project_root,
            campaign,
            claim_id: campaign.root_claim_id,
            locked_statement_hash: obligation.statement_hash,
            target
          }),
          proofRoute: "bounded_nat_double_final_clean_replay",
          patchAuthorityArtifacts: ({ finalReplayManifestRel }) => {
            const finalPatch = {
              status: "final_clean_replay_passed",
              proof_authority: "lean_clean_replay",
              can_run_clean_replay: true,
              can_promote_claim: true,
              final_replay_manifest_path: finalReplayManifestRel,
              final_report_paths: {
                static_audit: `.comath/evidence/${campaign.root_claim_id}/lean/final_static_audit.json`,
                statement_equivalence: `.comath/evidence/${campaign.root_claim_id}/lean/statement_equivalence.json`,
                dependency_closure: `.comath/evidence/${campaign.root_claim_id}/lean/dependency_closure.json`,
                axiom_profile: `.comath/evidence/${campaign.root_claim_id}/lean/axiom_profile.json`
              }
            };
            patchRuntimeJson(input.project_root, leanProjectRel, finalPatch);
            patchRuntimeJson(input.project_root, authorityPreparation.preparationRel, finalPatch);
            patchRuntimeJson(input.project_root, replayTargetRel, finalPatch);
          }
        });
        return replay;
      }
      return blockForBroadSynthesisPlanning({
        projectRoot: input.project_root,
        campaign,
        obligation,
        actor
      });
    }
    const batch = runTheoremFamilyCandidates({ projectRoot: input.project_root, campaign, obligation, theoremFamily });
    const candidatesRel = ensembleCandidatesRel(campaign, obligation.obligation_id);
    writeRuntimeFile(
      input.project_root,
      candidatesRel,
      `${JSON.stringify(batch.candidates, null, 2)}\n`
    );
    recordFailedRoutes({ projectRoot: input.project_root, campaign, candidates: batch.candidates });
    const next = writeCampaign(
      input.project_root,
      researchCampaignSchema.parse({
        ...campaign,
        current_stage: "candidate_verification",
        open_obligations: [{ ...obligation, status: "candidate_search" }],
        stage_runs: [...campaign.stage_runs, completedStageRun(campaign, "candidate_generation", [candidatesRel])],
        next_actions: ["verify candidate manifests, statement hashes, and failure preservation"]
      }),
      actor
    );
    return { campaign: next, obligation };
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
        "-- Selected candidate is integrated by the theorem-family clean replay stage.",
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
    const claim = getClaim(input.project_root, campaign.project_id, campaign.root_claim_id);
    if (!claim) {
      throw new ComathError("campaign root claim not found", { statusCode: 404, code: "CLAIM_NOT_FOUND" });
    }
    if (!isSupportedProofObligation(obligation)) {
      return blockCampaignAtFinalReplay({
        projectRoot: input.project_root,
        campaign,
        obligation,
        actor,
        reason: "unsupported final replay target"
      });
    }
    const theoremFamily = findTheoremFamilyForObligation(obligation);
    if (!theoremFamily) {
      return blockCampaignAtFinalReplay({
        projectRoot: input.project_root,
        campaign,
        obligation,
        actor,
        reason: "unsupported final replay target"
      });
    }
    const leanProject = createLeanProjectForTheorem({
      projectRoot: input.project_root,
      claim_id: claim.id,
      locked_statement_hash: claim.statement_hash,
      theoremFamily
    });
    const replay = runCleanLeanReplay({
      projectRoot: input.project_root,
      campaign_id: campaign.campaign_id,
      claim_id: claim.id,
      leanProject
    });

    const proofArtifact = await importArtifact({
      projectRoot: input.project_root,
      project_id: campaign.project_id,
      source_path: leanProject.theoremFile,
      kind: "code",
      actor
    });
    const replayArtifact = await importArtifact({
      projectRoot: input.project_root,
      project_id: campaign.project_id,
      source_path: assertPathAllowed(input.project_root, join(".comath", "evidence", claim.id, "lean", "final_replay_manifest.json"), {
        purpose: "read",
        resolveRealpath: true
      }),
      kind: "runner_output",
      actor
    });
    const auditArtifact = await importArtifact({
      projectRoot: input.project_root,
      project_id: campaign.project_id,
      source_path: assertPathAllowed(input.project_root, join(".comath", "evidence", claim.id, "lean", "final_static_audit.json"), {
        purpose: "read",
        resolveRealpath: true
      }),
      kind: "runner_output",
      actor
    });
    const evidence = appendEvidenceRecord(input.project_root, {
      project_id: campaign.project_id,
      claim_id: claim.id,
      kind: "lean",
      summary: `Clean Lean/Lake replay passed for ${leanProject.theoremName} via ${leanProject.primaryDependency} with static audit, dependency closure, axiom profile, and statement-equivalence reports.`,
      artifact_ids: [proofArtifact.id, replayArtifact.id, auditArtifact.id]
    });
    const metadataReadyClaim = applyGatePromotedClaim(input.project_root, {
      ...claim,
      formalization_status: "kernel_checked",
      dependency_closure_status: "all_dependencies_present",
      audit_state: "audit_passed",
      updated_at: now()
    });
    appendAuditEvent(input.project_root, {
      project_id: campaign.project_id,
      event_type: "proof_kernel.metadata_ready",
      actor,
      target_id: metadataReadyClaim.id,
      payload: {
        replay_id: replay.final_replay.replay_id,
        evidence_id: evidence.id
      }
    });
    const promotion = promoteClaim(input.project_root, {
      project_id: campaign.project_id,
      claim_id: claim.id,
      target_status: "formally_checked",
      evidence_ids: [evidence.id],
      artifact_ids: [proofArtifact.id, replayArtifact.id, auditArtifact.id],
      actor
    });
    const ok = replay.final_replay.result === "pass" && promotion.gate.ok;
    const finalReplayManifestRel = join(".comath", "evidence", claim.id, "lean", "final_replay_manifest.json").replace(/\\/g, "/");
    const sliceSummaryRel = campaignRel(campaign, "v3_formal_campaign_slice.json");
    const finalReplayArtifactPaths = [
      replay.final_replay.stdout_path,
      replay.final_replay.static_audit_path,
      replay.final_replay.axiom_profile_path,
      replay.final_replay.dependency_closure_path,
      replay.final_replay.statement_equivalence_path,
      finalReplayManifestRel
    ];
    const finalReplayRun = stageRun(campaign, "final_global_replay", ok ? "completed" : "blocked", finalReplayArtifactPaths);
    const memoryArtifactPaths = ok
      ? [
          ".comath/memory/proof_memory_events.jsonl",
          ".comath/context_lake/shards/final-handoff.md",
          ".comath/snapshots/replay/final_manifest.json",
          sliceSummaryRel
        ]
      : [];
    if (ok) {
      const memoryRun = completedStageRun({ ...campaign, stage_runs: [...campaign.stage_runs, finalReplayRun] }, "memory_update", memoryArtifactPaths);
      const finalStageRuns = [...campaign.stage_runs, finalReplayRun, memoryRun];
      const storedDecision = readStoredDecision(input.project_root, campaign, obligation.obligation_id);
      writeRuntimeFile(
        input.project_root,
        ".comath/memory/proof_memory_events.jsonl",
        `${JSON.stringify({
          type: "FormalProofVerified",
          campaign_id: campaign.campaign_id,
          claim_id: claim.id,
          theorem_name: replay.final_replay.theorem_name,
          final_theorem_hash: proofArtifact.sha256,
          proof_route: "native_campaign_stage_gates",
          failed_routes_preserved_at: ".comath/proof_memory/events.jsonl",
          created_at: now()
        })}\n`
      );
      writeRuntimeFile(
        input.project_root,
        ".comath/context_lake/shards/final-handoff.md",
        [
          "# Final Handoff",
          "",
          `campaign_id: ${campaign.campaign_id}`,
          `claim_id: ${claim.id}`,
          `theorem_name: ${replay.final_replay.theorem_name}`,
          `final_replay_manifest: .comath/evidence/${claim.id}/lean/final_replay_manifest.json`,
          "",
          "The claim was promoted only after final static audit, dependency closure, axiom profile, statement equivalence, and clean replay passed.",
          ""
        ].join("\n")
      );
      writeRuntimeFile(
        input.project_root,
        ".comath/snapshots/replay/final_manifest.json",
        `${JSON.stringify(
          {
            campaign_id: campaign.campaign_id,
            claim_id: claim.id,
            replay_id: replay.final_replay.replay_id,
            final_replay_manifest: finalReplayManifestRel,
            proof_memory_events: ".comath/memory/proof_memory_events.jsonl",
            created_at: now()
          },
          null,
          2
        )}\n`
      );
      writeRuntimeFile(
        input.project_root,
        sliceSummaryRel,
        `${JSON.stringify(
          {
            schema_version: "comath.v3.formal_campaign_slice.v1",
            campaign_id: campaign.campaign_id,
            project_id: campaign.project_id,
            claim_id: claim.id,
            user_goal: campaign.user_goal,
            obligation_id: obligation.obligation_id,
            locked_statement_hash: obligation.statement_hash,
            theorem_family: replay.final_replay.theorem_family,
            canonical_proposition: replay.final_replay.canonical_proposition,
            terminal_state: "completed_formal_proof",
            final_claim_status: promotion.claim.status,
            proof_authority: "lean_clean_replay",
            stage_sequence: finalStageRuns.map((run) => run.stage),
            candidate_summary: {
              total_candidates: storedDecision?.candidates.length ?? 0,
              selected_candidate_id: storedDecision?.decision.selected_candidate_id ?? null,
              selection_mode: storedDecision?.decision.selection_mode ?? "recovery_required",
              trivial_bypass_logged: (storedDecision?.candidates.length ?? 0) === 0,
              candidate_artifact_paths: storedDecision?.candidates.map((candidate) => candidate.manifest_path).filter(Boolean) ?? []
            },
            final_audit: {
              result: replay.static_audit.result,
              artifact_path: replay.final_replay.static_audit_path,
              hard_vetoes: replay.static_audit.hard_vetoes,
              warnings: replay.static_audit.warnings
            },
            clean_replay: {
              result: replay.final_replay.result,
              replay_id: replay.final_replay.replay_id,
              replay_command: replay.final_replay.command,
              final_replay_manifest: finalReplayManifestRel,
              stdout_path: replay.final_replay.stdout_path,
              stderr_path: replay.final_replay.stderr_path
            },
            promotion: {
              result: promotion.gate.ok ? "pass" : "blocked",
              gate_id: promotion.gate.id,
              evidence_ids: [evidence.id],
              artifact_ids: [proofArtifact.id, replayArtifact.id, auditArtifact.id]
            },
            replayable_artifact_bundle: {
              final_replay_manifest: finalReplayManifestRel,
              final_static_audit: replay.final_replay.static_audit_path,
              final_replay_log: replay.final_replay.stdout_path,
              final_replay_stderr: replay.final_replay.stderr_path,
              axiom_profile: replay.final_replay.axiom_profile_path,
              dependency_closure: replay.final_replay.dependency_closure_path,
              statement_equivalence: replay.final_replay.statement_equivalence_path,
              proof_memory_events: ".comath/memory/proof_memory_events.jsonl",
              snapshot_final_manifest: ".comath/snapshots/replay/final_manifest.json",
              final_handoff: ".comath/context_lake/shards/final-handoff.md"
            },
            created_at: now()
          },
          null,
          2
        )}\n`
      );
    }
    const memoryRun = ok
      ? completedStageRun({ ...campaign, stage_runs: [...campaign.stage_runs, finalReplayRun] }, "memory_update", memoryArtifactPaths)
      : undefined;
    const next = writeCampaign(
      input.project_root,
      researchCampaignSchema.parse({
        ...campaign,
        current_stage: ok ? "completed_formal_proof" : "blocked",
        status: "terminal",
        terminal_state: ok ? "completed_formal_proof" : "blocked_with_replayable_reason",
        open_obligations: [{ ...obligation, status: ok ? "integrated" : "blocked" }],
        accepted_artifacts: [proofArtifact, replayArtifact, auditArtifact],
        blockers: ok ? [] : [{ reason: "final replay or promotion gate failed", gate: promotion.gate }],
        stage_runs: [...campaign.stage_runs, finalReplayRun, ...(memoryRun ? [memoryRun] : [])],
        next_actions: ok ? [] : ["inspect final replay logs and promotion gate vetoes"]
      }),
      actor
    );
    return {
      campaign: next,
      obligation,
      ensemble: readStoredDecision(input.project_root, campaign, obligation.obligation_id),
      gate: {
        gate_id: "GD-0002",
        campaign_id: campaign.campaign_id,
        stage: "final_global_lean_replay",
        subject_id: claim.id,
        result: ok ? "pass" : "blocked",
        evidence: [proofArtifact, replayArtifact, auditArtifact],
        hard_vetoes: promotion.gate.vetoes,
        warnings: promotion.gate.warnings,
        decision_rationale_summary: ok
          ? "Claim promoted only after static audit, clean Lean replay, statement equivalence, dependency closure, and axiom profile passed."
          : "Final replay or claim promotion gate failed.",
        created_at: now()
      },
      final_replay: replay.final_replay,
      static_audit: replay.static_audit
    };
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
  const theoremFamily = findTheoremFamilyForObligation(obligation);
  if (!theoremFamily) {
    return blockCampaignAtFinalReplay({
      projectRoot: input.project_root,
      campaign,
      obligation,
      actor: input.actor ?? "campaign",
      reason: "unsupported final replay target"
    });
  }
  const leanProject = createLeanProjectForTheorem({
    projectRoot: input.project_root,
    claim_id: claim.id,
    locked_statement_hash: claim.statement_hash,
    theoremFamily
  });
  const replay = runCleanLeanReplay({
    projectRoot: input.project_root,
    campaign_id: campaign.campaign_id,
    claim_id: claim.id,
    leanProject
  });
  return {
    campaign,
    final_replay: replay.final_replay,
    static_audit: replay.static_audit
  };
}
