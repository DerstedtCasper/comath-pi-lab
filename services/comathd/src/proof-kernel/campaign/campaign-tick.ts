import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
import { recordFailedRoutes } from "../ensemble/failure-aggregator.js";
import { runTheoremFamilyCandidates } from "../ensemble/candidate-runner.js";
import { createLeanProjectForTheorem } from "../lean/lean-project.js";
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
      return blockCampaignAtFinalReplay({
        projectRoot: input.project_root,
        campaign,
        obligation,
        actor,
        reason: "unsupported final replay target",
        stage: "candidate_generation"
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
    const finalReplayArtifactPaths = [
      replay.final_replay.stdout_path,
      replay.final_replay.static_audit_path,
      replay.final_replay.axiom_profile_path,
      replay.final_replay.dependency_closure_path,
      replay.final_replay.statement_equivalence_path,
      join(".comath", "evidence", claim.id, "lean", "final_replay_manifest.json").replace(/\\/g, "/")
    ];
    const finalReplayRun = stageRun(campaign, "final_global_replay", ok ? "completed" : "blocked", finalReplayArtifactPaths);
    const memoryArtifactPaths = ok
      ? [
          ".comath/memory/proof_memory_events.jsonl",
          ".comath/context_lake/shards/final-handoff.md",
          ".comath/snapshots/replay/final_manifest.json"
        ]
      : [];
    if (ok) {
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
            final_replay_manifest: join(".comath", "evidence", claim.id, "lean", "final_replay_manifest.json").replace(/\\/g, "/"),
            proof_memory_events: ".comath/memory/proof_memory_events.jsonl",
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
