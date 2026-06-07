import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative } from "node:path";
import { z } from "zod";
import { ComathError } from "../../errors.js";
import { assertPathAllowed } from "../../security/path-policy.js";
import {
  candidateManifestSchema,
  candidateRunSchema,
  type CandidateManifest,
  type CandidateRun,
  type CandidateVariantId,
  type ProofKernelStage,
  type ProofObligation,
  type ResearchCampaign
} from "../../types/schemas.js";
import { decideCandidate, type EnsembleDecision } from "./decision-forest.js";
import { recordFailedRoutes } from "./failure-aggregator.js";
import { candidateWorkspaceRel } from "./paths.js";
import { hasVerifiedServiceOwnedLeanManifestEvidence } from "./service-owned-lean-evidence.js";
import { defaultVariants } from "./variant-registry.js";

export type GaAgentId = "A0" | "A1" | "A2" | "A3" | "A4" | "A5" | "A6" | "A7" | "A8";

export type GaAgentTeamMember = {
  agent_id: GaAgentId;
  name: string;
  duty: string;
  default_prompt: string;
  proof_authority: "none";
  may_mutate_trusted_state: false;
  global_invariants: string[];
};

export type GaAgentTaskCard = {
  task_id: string;
  agent_id: GaAgentId;
  variant_id: CandidateVariantId;
  stage: ProofKernelStage;
  campaign_id: string;
  obligation_id: string;
  locked_statement_hash: string;
  workspace_path: string;
  instructions: string[];
  output_schema: "comath.ga_agent_output.v1";
  proof_authority: "none";
  may_mutate_trusted_state: false;
  goal_mode_skeleton_blueprint?: Record<string, unknown>;
  consumes_goal_mode_formalization_hints?: Record<string, unknown>;
  blueprint_step_ids?: string[];
  blueprint_step_count?: number;
  blueprint_bound_candidate_generation?: true;
  statement_boundary?: Record<string, unknown>;
};

export type GaAgentOutput = z.infer<typeof gaAgentOutputSchema>;

export type GaAgentReplayProject = {
  lean_root: string;
  theorem_file_rel: string;
  formal_spec_file: string;
  assumption_ledger_file: string;
  audit_file_rel: string;
  lakefile: string;
  toolchain_file: string;
  theorem_name: string;
  theorem_family_id: string;
  canonical_proposition: string;
  build_targets: string[];
  replay_command: string;
  primary_dependency: string;
  formal_spec: {
    claim_id: string;
    theorem_name: string;
    namespace: string;
    normalized_statement: string;
    locked_statement_hash: string;
  };
};

export type GaAgentStageAdapterResult = Partial<{
  state: CandidateRun["state"];
  score: number;
  statement_equivalence_claim: CandidateManifest["statement_equivalence_claim"];
  candidate_statement_hash: string;
  dependencies: string[];
  introduced_assumptions: string[];
  introduced_dependencies: string[];
  evidence: string[];
  lean_files: string[];
  logs: string[];
  hard_vetoes: string[];
  failures: string[];
  replay_command: string;
  replay_project: GaAgentReplayProject;
  summary: string;
  maintainability_notes: string;
}>;

type NormalizedGaAgentStageAdapterResult = Required<Omit<GaAgentStageAdapterResult, "replay_project">> &
  Pick<GaAgentStageAdapterResult, "replay_project">;

export type GaAgentStageBatch = {
  task_cards: GaAgentTaskCard[];
  candidates: CandidateRun[];
  manifests: CandidateManifest[];
  agent_outputs: GaAgentOutput[];
  proof_authority: "none";
};

export type ReviewerVote = {
  reviewer_id: GaAgentId;
  candidate_id: string;
  vote: "approve" | "reject" | "abstain";
  rationale: string;
};

export type GaAgentStagePlanningContext = {
  goal_mode_skeleton_blueprint: Record<string, unknown>;
  consumes_goal_mode_formalization_hints?: Record<string, unknown>;
  blueprint_step_ids: string[];
  blueprint_step_count: number;
  blueprint_bound_candidate_generation: true;
  statement_boundary: Record<string, unknown>;
};

export type GaAgentStageDecision = ReturnType<typeof decideCandidate> & {
  decision: EnsembleDecision & {
    reviewer_votes_are_advisory: true;
    reviewer_votes: ReviewerVote[];
  };
};

const globalInvariants = [
  "proof_authority = none",
  "may_mutate_trusted_state = false",
  "must preserve locked statement hash",
  "must output strict JSON",
  "must label introduced assumptions",
  "must label introduced dependencies",
  "must label statement changes",
  "reviewer vote is advisory only",
  "must request LeanRunner for Lean checks"
];

const team: GaAgentTeamMember[] = [
  { agent_id: "A0", name: "Coordinator / PI Agent", duty: "Campaign control, stage routing, repair loop", default_prompt: "Drive the campaign through native gates without certifying mathematics.", proof_authority: "none", may_mutate_trusted_state: false, global_invariants: globalInvariants },
  { agent_id: "A1", name: "FormalSpec & Boundary Agent", duty: "Statement locks, assumptions, notation", default_prompt: "Propose exact statement locks and flag drift or hidden assumptions.", proof_authority: "none", may_mutate_trusted_state: false, global_invariants: globalInvariants },
  { agent_id: "A2", name: "Librarian / Retrieval Agent", duty: "Theorem search, literature, external repo lookup", default_prompt: "Retrieve premise and literature hints with source hashes and no proof authority.", proof_authority: "none", may_mutate_trusted_state: false, global_invariants: globalInvariants },
  { agent_id: "A3", name: "Blueprint & Lemma DAG Agent", duty: "Blueprints, skeletons, obligation DAGs", default_prompt: "Create lemma DAGs and skeleton obligations that preserve the locked theorem.", proof_authority: "none", may_mutate_trusted_state: false, global_invariants: globalInvariants },
  { agent_id: "A4", name: "Proof Route Strategist", duty: "Proof routes and decomposition", default_prompt: "Compare proof routes and expose assumptions, dependencies, and blockers.", proof_authority: "none", may_mutate_trusted_state: false, global_invariants: globalInvariants },
  { agent_id: "A5", name: "Lean Tactic Sprinter", duty: "Lean candidates and repair loops", default_prompt: "Draft Lean candidates and request service-owned LeanRunner checks.", proof_authority: "none", may_mutate_trusted_state: false, global_invariants: globalInvariants },
  { agent_id: "A6", name: "Computation & Counterexample Agent", duty: "CAS/SMT/SAT support and refutation leads", default_prompt: "Search exact-computation and finite-model evidence without promoting proof status.", proof_authority: "none", may_mutate_trusted_state: false, global_invariants: globalInvariants },
  { agent_id: "A7", name: "Integrator & Refactor Agent", duty: "Candidate integration and import hygiene", default_prompt: "Integrate only evidence-valid candidates while preserving dependency and statement boundaries.", proof_authority: "none", may_mutate_trusted_state: false, global_invariants: globalInvariants },
  { agent_id: "A8", name: "Integrity Red-Team Auditor", duty: "Statement drift, hidden assumptions, no-cheat audit", default_prompt: "Attack the candidate for drift, hidden assumptions, forbidden constructs, and dependency pollution.", proof_authority: "none", may_mutate_trusted_state: false, global_invariants: globalInvariants }
];

const variantAgent: Record<CandidateVariantId, GaAgentId> = {
  V1: "A5",
  V2: "A2",
  V3: "A3",
  V4: "A5",
  V5: "A6",
  V6: "A8",
  V7: "A1",
  V8: "A8"
};

const artifactRefForAgentOutput = z
  .object({
    path: z.string().min(1),
    kind: z.string().min(1),
    sha256: z.string().min(1).optional()
  })
  .strict();

const agentCandidatePackRef = z
  .object({
    candidate_id: z.string().min(1),
    manifest_path: z.string().min(1).optional()
  })
  .strict();

export const gaAgentOutputSchema = z
  .object({
    agent_id: z.enum(["A0", "A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8"]),
    task_id: z.string().min(1),
    stage: z.string().min(1),
    locked_statement_hash: z.string().min(1),
    summary: z.string().min(1),
    artifacts: z.array(artifactRefForAgentOutput).default([]),
    proposed_candidates: z.array(agentCandidatePackRef).default([]),
    introduced_assumptions: z.array(z.string()).default([]),
    introduced_dependencies: z.array(z.string()).default([]),
    requested_tool_calls: z.array(z.record(z.string(), z.unknown())).default([]),
    hard_vetoes: z.array(z.string()).default([]),
    blockers: z.array(z.record(z.string(), z.unknown())).default([]),
    confidence: z.number().min(0).max(1),
    proof_authority: z.literal("none")
  })
  .strict();

function cloneTeamMember(agent: GaAgentTeamMember): GaAgentTeamMember {
  return { ...agent, global_invariants: [...agent.global_invariants] };
}

export function listGaAgentTeam(): GaAgentTeamMember[] {
  return team.map(cloneTeamMember);
}

function variantOrdinal(variantId: CandidateVariantId): string {
  return String(Number(variantId.slice(1))).padStart(2, "0");
}

function normalizedRel(path: string): string {
  return path.replace(/\\/g, "/");
}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`candidate_replay_project_${field}_invalid`);
  }
  return value;
}

function requireStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`candidate_replay_project_${field}_invalid`);
  }
  return value.map((item, index) => requireNonEmptyString(item, `${field}_${index}`));
}

function requireObjectRecord(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`candidate_replay_project_${field}_invalid`);
  }
  return value as Record<string, unknown>;
}

function rejectPathEscape(path: string, field: string): string {
  const normalized = normalizedRel(path);
  if (
    normalized.length === 0 ||
    isAbsolute(normalized) ||
    normalized.startsWith("../") ||
    normalized === ".." ||
    normalized.split("/").includes("..")
  ) {
    throw new Error(`candidate_replay_project_${field}_path_escape`);
  }
  return normalized;
}

function parseReplayProject(raw: unknown): GaAgentReplayProject {
  const project = requireObjectRecord(raw, "lean_project");
  const formalSpec = requireObjectRecord(project.formal_spec, "formal_spec");
  return {
    lean_root: rejectPathEscape(requireNonEmptyString(project.lean_root, "lean_root"), "lean_root"),
    theorem_file_rel: rejectPathEscape(requireNonEmptyString(project.theorem_file_rel, "theorem_file_rel"), "theorem_file_rel"),
    formal_spec_file: rejectPathEscape(requireNonEmptyString(project.formal_spec_file, "formal_spec_file"), "formal_spec_file"),
    assumption_ledger_file: rejectPathEscape(
      requireNonEmptyString(project.assumption_ledger_file, "assumption_ledger_file"),
      "assumption_ledger_file"
    ),
    audit_file_rel: rejectPathEscape(requireNonEmptyString(project.audit_file_rel, "audit_file_rel"), "audit_file_rel"),
    lakefile: rejectPathEscape(requireNonEmptyString(project.lakefile, "lakefile"), "lakefile"),
    toolchain_file: rejectPathEscape(requireNonEmptyString(project.toolchain_file, "toolchain_file"), "toolchain_file"),
    theorem_name: requireNonEmptyString(project.theorem_name, "theorem_name"),
    theorem_family_id: requireNonEmptyString(project.theorem_family_id, "theorem_family_id"),
    canonical_proposition: requireNonEmptyString(project.canonical_proposition, "canonical_proposition"),
    build_targets: requireStringArray(project.build_targets, "build_targets"),
    replay_command: requireNonEmptyString(project.replay_command, "replay_command"),
    primary_dependency: requireNonEmptyString(project.primary_dependency, "primary_dependency"),
    formal_spec: {
      claim_id: requireNonEmptyString(formalSpec.claim_id, "formal_spec_claim_id"),
      theorem_name: requireNonEmptyString(formalSpec.theorem_name, "formal_spec_theorem_name"),
      namespace: requireNonEmptyString(formalSpec.namespace, "formal_spec_namespace"),
      normalized_statement: requireNonEmptyString(formalSpec.normalized_statement, "formal_spec_normalized_statement"),
      locked_statement_hash: requireNonEmptyString(formalSpec.locked_statement_hash, "formal_spec_locked_statement_hash")
    }
  };
}

function createCandidateReplayProjectDescriptor(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  obligation: ProofObligation;
  candidateId: string;
  candidateStatementHash: string;
  adapterResult: NormalizedGaAgentStageAdapterResult;
}): Record<string, unknown> | undefined {
  if (input.adapterResult.replay_project === undefined) {
    return undefined;
  }
  if (input.adapterResult.state !== "candidate_kernel_checked") {
    throw new Error("candidate_replay_project_requires_kernel_checked_candidate");
  }
  if (input.adapterResult.statement_equivalence_claim !== "exact") {
    throw new Error("candidate_replay_project_requires_exact_statement");
  }
  if (
    input.candidateStatementHash !== input.obligation.statement_hash ||
    input.adapterResult.candidate_statement_hash !== input.obligation.statement_hash
  ) {
    throw new Error("candidate_replay_project_statement_hash_drift");
  }
  if (input.adapterResult.introduced_assumptions.length > 0) {
    throw new Error("candidate_replay_project_hidden_assumption");
  }
  if (input.adapterResult.hard_vetoes.length > 0) {
    throw new Error("candidate_replay_project_hard_vetoed");
  }
  if (!input.adapterResult.replay_command) {
    throw new Error("candidate_replay_project_replay_command_missing");
  }
  if (
    !hasVerifiedServiceOwnedLeanManifestEvidence({
      projectRoot: input.projectRoot,
      campaignId: input.campaign.campaign_id,
      claimId: input.campaign.root_claim_id,
      candidateId: input.candidateId,
      evidence: input.adapterResult.evidence
    })
  ) {
    throw new Error("candidate_replay_project_requires_service_owned_lean_manifest_artifact");
  }
  const replayProject = parseReplayProject(input.adapterResult.replay_project);
  if (replayProject.formal_spec.claim_id !== input.campaign.root_claim_id) {
    throw new Error("candidate_replay_project_claim_mismatch");
  }
  if (replayProject.formal_spec.locked_statement_hash !== input.obligation.statement_hash) {
    throw new Error("candidate_replay_project_statement_hash_drift");
  }
  if (replayProject.theorem_family_id !== input.campaign.campaign_id) {
    throw new Error("candidate_replay_project_family_mismatch");
  }
  if (replayProject.replay_command !== input.adapterResult.replay_command) {
    throw new Error("candidate_replay_project_replay_command_mismatch");
  }
  return {
    schema_version: "comath.candidate_replay_project_descriptor.v1",
    campaign_id: input.campaign.campaign_id,
    claim_id: input.campaign.root_claim_id,
    obligation_id: input.obligation.obligation_id,
    candidate_id: input.candidateId,
    artifact_role: "candidate_replay_project_descriptor",
    proof_authority: "none",
    can_promote_claim: false,
    lean_project: replayProject
  };
}

function workspaceRel(campaign: ResearchCampaign, obligation: ProofObligation, variantSlug: string): string {
  return normalizedRel(candidateWorkspaceRel(campaign, obligation.obligation_id, variantSlug));
}

function writeJson(projectRoot: string, relativePath: string, value: unknown): string {
  const path = assertPathAllowed(projectRoot, relativePath, { purpose: "runtime-write" });
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return path;
}

export function parseGaAgentOutputJson(raw: string): GaAgentOutput {
  try {
    return gaAgentOutputSchema.parse(JSON.parse(raw));
  } catch (error) {
    throw new ComathError(`strict JSON agent output rejected: ${(error as Error).message}`, {
      statusCode: 400,
      code: "GA_AGENT_OUTPUT_INVALID"
    });
  }
}

export function createGaAgentStageTaskCards(input: {
  campaign: ResearchCampaign;
  obligation: ProofObligation;
  stage: ProofKernelStage;
  locked_statement_hash: string;
  planning_context?: GaAgentStagePlanningContext;
}): GaAgentTaskCard[] {
  return defaultVariants.map((variant) => ({
    task_id: `ATASK-${input.campaign.campaign_id.replace(/^[A-Z]+-/, "")}${variantOrdinal(variant.variant_id)}`,
    agent_id: variantAgent[variant.variant_id],
    variant_id: variant.variant_id,
    stage: input.stage,
    campaign_id: input.campaign.campaign_id,
    obligation_id: input.obligation.obligation_id,
    locked_statement_hash: input.locked_statement_hash,
    workspace_path: workspaceRel(input.campaign, input.obligation, variant.slug),
    instructions: [
      variant.purpose,
      "Return strict JSON only.",
      "Preserve the locked statement hash exactly.",
      "Do not claim proof authority; request service-owned LeanRunner checks for Lean evidence.",
      "Label every introduced assumption, dependency, or statement change.",
      ...(input.planning_context
        ? [
            `Use the goal-mode skeleton blueprint ${String(
              input.planning_context.goal_mode_skeleton_blueprint.path ?? ""
            )} only as non-authoritative planning context.`
          ]
        : [])
    ],
    output_schema: "comath.ga_agent_output.v1",
    proof_authority: "none",
    may_mutate_trusted_state: false,
    ...(input.planning_context
      ? {
          goal_mode_skeleton_blueprint: input.planning_context.goal_mode_skeleton_blueprint,
          consumes_goal_mode_formalization_hints: input.planning_context.consumes_goal_mode_formalization_hints,
          blueprint_step_ids: [...input.planning_context.blueprint_step_ids],
          blueprint_step_count: input.planning_context.blueprint_step_count,
          blueprint_bound_candidate_generation: input.planning_context.blueprint_bound_candidate_generation,
          statement_boundary: input.planning_context.statement_boundary
        }
      : {})
  }));
}

function normalizeAdapterResult(result: GaAgentStageAdapterResult | undefined): NormalizedGaAgentStageAdapterResult {
  return {
    state: result?.state ?? "candidate_plausible_only",
    score: result?.score ?? 0,
    statement_equivalence_claim: result?.statement_equivalence_claim ?? "exact",
    candidate_statement_hash: result?.candidate_statement_hash ?? "",
    dependencies: result?.dependencies ?? [],
    introduced_assumptions: result?.introduced_assumptions ?? [],
    introduced_dependencies: result?.introduced_dependencies ?? [],
    evidence: result?.evidence ?? [],
    lean_files: result?.lean_files ?? [],
    logs: result?.logs ?? [],
    hard_vetoes: result?.hard_vetoes ?? [],
    failures: result?.failures ?? [],
    replay_command: result?.replay_command ?? "",
    replay_project: result?.replay_project,
    summary: result?.summary ?? "Agent candidate draft; no proof authority.",
    maintainability_notes: result?.maintainability_notes ?? "Candidate remains advisory until service-owned gates pass."
  };
}

export function runGaAgentStageCandidates(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  obligation: ProofObligation;
  stage: ProofKernelStage;
  locked_statement_hash: string;
  planning_context?: GaAgentStagePlanningContext;
  adapter?: (input: {
    taskCard: GaAgentTaskCard;
    candidateId: string;
    projectRoot: string;
    campaign: ResearchCampaign;
    obligation: ProofObligation;
  }) => GaAgentStageAdapterResult | undefined;
}): GaAgentStageBatch {
  const taskCards = createGaAgentStageTaskCards(input);
  const candidates: CandidateRun[] = [];
  const manifests: CandidateManifest[] = [];
  const agentOutputs: GaAgentOutput[] = [];

  for (const taskCard of taskCards) {
    const variantNumber = variantOrdinal(taskCard.variant_id);
    const candidateId = `CAND-${input.campaign.campaign_id.replace(/^[A-Z]+-/, "")}${variantNumber}`;
    const adapterResult = normalizeAdapterResult(
      input.adapter?.({
        taskCard,
        candidateId,
        projectRoot: input.projectRoot,
        campaign: input.campaign,
        obligation: input.obligation
      })
    );
    const workspacePath = assertPathAllowed(input.projectRoot, taskCard.workspace_path, { purpose: "runtime-write" });
    mkdirSync(workspacePath, { recursive: true });
    writeJson(input.projectRoot, join(taskCard.workspace_path, "task_card.json"), taskCard);

    const candidateStatementHash = adapterResult.candidate_statement_hash || input.locked_statement_hash;
    const descriptor = createCandidateReplayProjectDescriptor({
      projectRoot: input.projectRoot,
      campaign: input.campaign,
      obligation: input.obligation,
      candidateId,
      candidateStatementHash,
      adapterResult
    });
    const descriptorArtifact = descriptor
      ? {
          path: "candidate_replay_project_descriptor.json",
          kind: "candidate_replay_project_descriptor",
          required_for: ["candidate_replay_material_source"]
        }
      : undefined;
    if (descriptor) {
      writeJson(input.projectRoot, join(taskCard.workspace_path, "candidate_replay_project_descriptor.json"), descriptor);
    }
    const manifest = candidateManifestSchema.parse({
      candidate_id: candidateId,
      campaign_id: input.campaign.campaign_id,
      variant_id: taskCard.variant_id,
      stage: taskCard.stage,
      obligation_id: taskCard.obligation_id,
      workspace_path: normalizedRel(relative(input.projectRoot, workspacePath)),
      locked_statement_hash: input.locked_statement_hash,
      candidate_statement_hash: candidateStatementHash,
      state: adapterResult.state,
      statement_equivalence_claim: adapterResult.statement_equivalence_claim,
      dependencies: adapterResult.dependencies,
      assumptions: [],
      introduced_assumptions: adapterResult.introduced_assumptions,
      introduced_dependencies: adapterResult.introduced_dependencies,
      artifacts: [
        { path: "task_card.json", kind: "agent_task_card", required_for: ["agent_stage"] },
        { path: "agent_output.json", kind: "agent_output", required_for: ["agent_stage"] },
        { path: "agent_stage_log.jsonl", kind: "agent_stage_log", required_for: ["agent_stage", "failure_memory"] },
        ...(descriptorArtifact ? [descriptorArtifact] : [])
      ],
      lean_files: adapterResult.lean_files,
      logs: adapterResult.logs,
      evidence: adapterResult.evidence,
      hard_vetoes: adapterResult.hard_vetoes,
      failures: adapterResult.failures,
      replay_command: adapterResult.replay_command,
      summary: adapterResult.summary,
      maintainability_notes: adapterResult.maintainability_notes
    });
    const manifestPath = writeJson(input.projectRoot, join(taskCard.workspace_path, "candidate_manifest.json"), manifest);
    writeFileSync(
      assertPathAllowed(input.projectRoot, join(taskCard.workspace_path, "agent_stage_log.jsonl"), { purpose: "runtime-write" }),
      `${JSON.stringify({ task_id: taskCard.task_id, candidate_id: candidateId, proof_authority: "none", summary: adapterResult.summary })}\n`,
      "utf8"
    );
    const agentOutput = gaAgentOutputSchema.parse({
      agent_id: taskCard.agent_id,
      task_id: taskCard.task_id,
      stage: taskCard.stage,
      locked_statement_hash: input.locked_statement_hash,
      summary: adapterResult.summary,
      artifacts: [
        { path: normalizedRel(relative(input.projectRoot, manifestPath)), kind: "candidate_manifest" },
        ...(descriptor
          ? [
              {
                path: normalizedRel(join(taskCard.workspace_path, "candidate_replay_project_descriptor.json")),
                kind: "candidate_replay_project_descriptor"
              }
            ]
          : [])
      ],
      proposed_candidates: [{ candidate_id: candidateId, manifest_path: normalizedRel(relative(input.projectRoot, manifestPath)) }],
      introduced_assumptions: adapterResult.introduced_assumptions,
      introduced_dependencies: adapterResult.introduced_dependencies,
      requested_tool_calls: [],
      hard_vetoes: adapterResult.hard_vetoes,
      blockers: adapterResult.hard_vetoes.map((veto) => ({ code: veto })),
      confidence: Math.max(0, Math.min(1, (adapterResult.score + 100) / 200)),
      proof_authority: "none"
    });
    writeJson(input.projectRoot, join(taskCard.workspace_path, "agent_output.json"), agentOutput);

    manifests.push(manifest);
    agentOutputs.push(agentOutput);
    candidates.push(
      candidateRunSchema.parse({
        candidate_id: candidateId,
        campaign_id: input.campaign.campaign_id,
        stage: taskCard.stage,
        obligation_id: taskCard.obligation_id,
        variant_id: taskCard.variant_id,
        workspace_path: normalizedRel(relative(input.projectRoot, workspacePath)),
        locked_statement_hash: input.locked_statement_hash,
        candidate_statement_hash: candidateStatementHash,
        state: adapterResult.state,
        manifest_path: normalizedRel(relative(input.projectRoot, manifestPath)),
        score: adapterResult.score,
        hard_vetoes: adapterResult.hard_vetoes,
        artifacts: [],
        replay_command: adapterResult.replay_command || undefined
      })
    );
  }

  return { task_cards: taskCards, candidates, manifests, agent_outputs: agentOutputs, proof_authority: "none" };
}

export function aggregateGaAgentStageCandidates(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  candidates: CandidateRun[];
  reviewer_votes?: ReviewerVote[];
}): GaAgentStageDecision {
  const result = decideCandidate({ projectRoot: input.projectRoot, campaign: input.campaign, candidates: input.candidates });
  const hardVetoes = new Set(result.decision.hard_vetoes);
  const rejectedIds = new Set(result.decision.rejected_candidates.map((candidate) => candidate.candidate_id));
  const memoryCandidates = input.candidates.map((candidate) => {
    if (candidate.candidate_id === result.decision.selected_candidate_id || !rejectedIds.has(candidate.candidate_id)) {
      return candidate;
    }
    if (candidate.state !== "candidate_kernel_checked") {
      return candidate;
    }
    return {
      ...candidate,
      state: "candidate_blocked" as const,
      hard_vetoes: [...new Set([...candidate.hard_vetoes, "rejected_kernel_candidate_without_final_authority"])]
    };
  });
  for (const candidate of input.candidates) {
    if (
      candidate.variant_id === "V1" &&
      candidate.state === "candidate_kernel_checked" &&
      candidate.score !== undefined &&
      candidate.score > 10_000 &&
      !candidate.replay_command
    ) {
      hardVetoes.add("synthetic_variant_winner_rejected");
    }
  }
  recordFailedRoutes({ projectRoot: input.projectRoot, campaign: input.campaign, candidates: memoryCandidates });
  return {
    ...result,
    decision: {
      ...result.decision,
      hard_vetoes: [...hardVetoes],
      reviewer_votes_are_advisory: true,
      reviewer_votes: input.reviewer_votes ?? []
    }
  };
}
