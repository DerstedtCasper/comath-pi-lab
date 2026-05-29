export type MathProveNativeStageId =
  | "input_intake"
  | "problem_lock"
  | "knowledge_pack"
  | "formal_spec_and_notation_gate"
  | "blueprint_and_skeleton_gate"
  | "line_map_gate"
  | "lemma_sprint"
  | "refutation_gate"
  | "integration_refactor_gate"
  | "final_lean_authority_replay"
  | "proof_memory_update";

export type MathProveNativeStageStatus = "pending" | "completed" | "blocked";

export type MathProveNativeStageDefinition = {
  schema_version: "comath.mathprove_native_stage.v1";
  index: number;
  stage: MathProveNativeStageId;
  required_input_schema: string;
  required_output_schema: string;
  required_artifacts: string[];
  hard_vetoes: string[];
  blocker_certificate_schema: "comath.mathprove_native.blocker_certificate.v1";
  resume_state_schema: "comath.mathprove_native.resume_state.v1";
  proof_authority: "none";
  can_promote_claim: false;
};

export type MathProveNativeResumeState = {
  schema_version: "comath.mathprove_native.resume_state.v1";
  campaign_id: string;
  claim_id: string;
  blocked_stage: MathProveNativeStageId;
  resume_to_stage: MathProveNativeStageId;
  rewind_target: MathProveNativeStageId;
  required_artifacts: string[];
  locked_statement_hash: string;
  created_at: string;
  proof_authority: "none";
  can_promote_claim: false;
};

export type MathProveNativeBlockerCertificate = {
  schema_version: "comath.mathprove_native.blocker_certificate.v1";
  blocker_id: string;
  campaign_id: string;
  claim_id: string;
  stage: MathProveNativeStageId;
  status: "blocked";
  reason: string;
  required_artifacts: string[];
  hard_vetoes: string[];
  resume_state: MathProveNativeResumeState;
  locked_statement_hash: string;
  created_at: string;
  proof_authority: "none";
  can_promote_claim: false;
};

export type MathProveNativeStageRun = {
  schema_version: "comath.mathprove_native.stage_run.v1";
  run_id: string;
  campaign_id: string;
  claim_id: string;
  stage: MathProveNativeStageId;
  status: MathProveNativeStageStatus;
  input_schema: string;
  output_schema: string;
  input_artifacts: string[];
  output_artifacts: string[];
  required_artifacts: string[];
  missing_artifacts: string[];
  hard_vetoes: string[];
  blocker_certificate?: MathProveNativeBlockerCertificate;
  resume_state?: MathProveNativeResumeState;
  locked_statement_hash: string;
  created_at: string;
  proof_authority: "none";
  can_promote_claim: false;
};

export type MathProveNativeWorkflowState = {
  schema_version: "comath.mathprove_native.workflow_state.v1";
  campaign_id: string;
  claim_id: string;
  locked_statement_hash: string;
  current_stage: MathProveNativeStageId;
  status: "running" | "blocked" | "terminal";
  runs: MathProveNativeStageRun[];
  blockers: MathProveNativeBlockerCertificate[];
  created_at: string;
  updated_at: string;
  proof_authority: "none";
  can_promote_claim: false;
};

export type MathProveNativeResumeValidation = {
  ok: boolean;
  hard_vetoes: string[];
  proof_authority: "none";
  can_promote_claim: false;
};

export type MathProveEvidenceClassification = {
  schema_version: "comath.mathprove_native.external_evidence_classification.v1";
  source: string;
  mode: string;
  gate_result: string;
  ok: boolean;
  target_status?: string;
  normalized_status: "evidence_only";
  artifacts: unknown[];
  hard_vetoes: string[];
  proof_authority: "none";
  can_promote_claim: false;
};

type StageDefinitionInput = Omit<
  MathProveNativeStageDefinition,
  "schema_version" | "blocker_certificate_schema" | "resume_state_schema" | "proof_authority" | "can_promote_claim"
>;

function defineStage(input: StageDefinitionInput): MathProveNativeStageDefinition {
  return {
    ...input,
    schema_version: "comath.mathprove_native_stage.v1",
    blocker_certificate_schema: "comath.mathprove_native.blocker_certificate.v1",
    resume_state_schema: "comath.mathprove_native.resume_state.v1",
    proof_authority: "none",
    can_promote_claim: false
  };
}

const STAGE_INPUTS = [
  {
    index: 0,
    stage: "input_intake",
    required_input_schema: "comath.mathprove_native.input_intake.input.v1",
    required_output_schema: "comath.mathprove_native.input_intake.output.v1",
    required_artifacts: ["RawUserGoal", "AttachmentManifest", "WorkspaceReferenceManifest", "Campaign"],
    hard_vetoes: ["missing_goal", "unreadable_attachment", "unsafe_path", "secret_leak_in_attachment"]
  },
  {
    index: 1,
    stage: "problem_lock",
    required_input_schema: "comath.mathprove_native.problem_lock.input.v1",
    required_output_schema: "comath.mathprove_native.problem_lock.output.v1",
    required_artifacts: ["ProblemLock", "InitialAssumptionLedger", "AmbiguityReport"],
    hard_vetoes: ["default_assumption_injection", "statement_unlocked", "ambiguous_problem_lock"]
  },
  {
    index: 2,
    stage: "knowledge_pack",
    required_input_schema: "comath.mathprove_native.knowledge_pack.input.v1",
    required_output_schema: "comath.mathprove_native.knowledge_pack.output.v1",
    required_artifacts: [
      "LiteratureEvidence.jsonl",
      "TheoremSearchEvidence.jsonl",
      "ExternalRepoCandidates.jsonl",
      "ContextLakeSnapshot"
    ],
    hard_vetoes: ["missing_citation_anchor", "unhashed_api_response", "external_result_claims_proof_authority", "missing_prompt_injection_scan"]
  },
  {
    index: 3,
    stage: "formal_spec_and_notation_gate",
    required_input_schema: "comath.mathprove_native.formal_spec_and_notation_gate.input.v1",
    required_output_schema: "comath.mathprove_native.formal_spec_and_notation_gate.output.v1",
    required_artifacts: ["FormalSpecLock", "NotationLock", "TheoremHeader.lean", "StatementHash"],
    hard_vetoes: ["statement_change_without_approval", "ambiguous_notation", "candidate_header_differs_from_lock"]
  },
  {
    index: 4,
    stage: "blueprint_and_skeleton_gate",
    required_input_schema: "comath.mathprove_native.blueprint_and_skeleton_gate.input.v1",
    required_output_schema: "comath.mathprove_native.blueprint_and_skeleton_gate.output.v1",
    required_artifacts: ["Blueprint", "Skeleton.lean", "LemmaDAG.json"],
    hard_vetoes: ["skeleton_claims_proof_authority", "unnamed_sorry", "missing_lemma_dag"]
  },
  {
    index: 5,
    stage: "line_map_gate",
    required_input_schema: "comath.mathprove_native.line_map_gate.input.v1",
    required_output_schema: "comath.mathprove_native.line_map_gate.output.v1",
    required_artifacts: ["LineMap.json", "ProofObligations.jsonl"],
    hard_vetoes: ["unmapped_informal_step", "hidden_jump", "false_converse"]
  },
  {
    index: 6,
    stage: "lemma_sprint",
    required_input_schema: "comath.mathprove_native.lemma_sprint.input.v1",
    required_output_schema: "comath.mathprove_native.lemma_sprint.output.v1",
    required_artifacts: ["AgentCandidatePack[]", "LeanRunManifest[]", "FailureMemoryEvent[]"],
    hard_vetoes: ["agent_claims_proof_authority", "missing_service_owned_lean_run_manifest", "candidate_statement_hash_mismatch"]
  },
  {
    index: 7,
    stage: "refutation_gate",
    required_input_schema: "comath.mathprove_native.refutation_gate.input.v1",
    required_output_schema: "comath.mathprove_native.refutation_gate.output.v1",
    required_artifacts: ["BoundaryRedTeamReport", "CounterexampleSearchReport", "StatementDriftReport"],
    hard_vetoes: ["unresolved_counterexample", "boundary_weakening", "hidden_assumption", "quantifier_mismatch", "wrong_domain"]
  },
  {
    index: 8,
    stage: "integration_refactor_gate",
    required_input_schema: "comath.mathprove_native.integration_refactor_gate.input.v1",
    required_output_schema: "comath.mathprove_native.integration_refactor_gate.output.v1",
    required_artifacts: ["Integrated.lean", "ImportProfile", "DependencyPlan", "CandidateLineage"],
    hard_vetoes: ["lineage_lost", "integrated_proof_no_longer_builds", "unapproved_dependency", "namespace_or_import_shadowing"]
  },
  {
    index: 9,
    stage: "final_lean_authority_replay",
    required_input_schema: "comath.mathprove_native.final_lean_authority_replay.input.v1",
    required_output_schema: "comath.mathprove_native.final_lean_authority_replay.output.v1",
    required_artifacts: ["FinalReplayManifest", "StructuredLeanAudit", "DependencyClosureReport", "AxiomProfileReport", "StatementCheckReport"],
    hard_vetoes: [
      "lean_failure",
      "audit_failure",
      "statement_mismatch",
      "unauthorized_axiom",
      "forbidden_construct",
      "dependency_pollution",
      "non_hermetic_network_access",
      "missing_manifest"
    ]
  },
  {
    index: 10,
    stage: "proof_memory_update",
    required_input_schema: "comath.mathprove_native.proof_memory_update.input.v1",
    required_output_schema: "comath.mathprove_native.proof_memory_update.output.v1",
    required_artifacts: ["ProofMemoryEvent[]", "FailureRouteEvent[]", "DomainPackUpdateProposal"],
    hard_vetoes: ["memory_claims_proof_authority", "failed_route_discarded", "missing_replay_pack_reference"]
  }
] satisfies StageDefinitionInput[];

const STAGES: MathProveNativeStageDefinition[] = STAGE_INPUTS.map(defineStage);

function now(defaultNow?: () => string): string {
  return defaultNow ? defaultNow() : new Date().toISOString();
}

function stageIndex(stage: MathProveNativeStageId): number {
  return getMathProveNativeStageDefinition(stage).index;
}

function nextStage(stage: MathProveNativeStageId): MathProveNativeStageId | null {
  return STAGES[stageIndex(stage) + 1]?.stage ?? null;
}

function missingRequiredArtifacts(stage: MathProveNativeStageDefinition, artifacts: readonly string[]): string[] {
  const present = new Set(artifacts);
  return stage.required_artifacts.filter((artifact) => !present.has(artifact));
}

function blockerId(campaignId: string, stage: MathProveNativeStageId, blockerCount = 0): string {
  return `MPNB-${campaignId}-${stage}-${String(blockerCount + 1).padStart(4, "0")}`;
}

export function listMathProveNativeStages(): MathProveNativeStageDefinition[] {
  return STAGES.map((stage) => ({ ...stage, required_artifacts: [...stage.required_artifacts], hard_vetoes: [...stage.hard_vetoes] }));
}

export function getMathProveNativeStageDefinition(stage: MathProveNativeStageId): MathProveNativeStageDefinition {
  const definition = STAGES.find((item) => item.stage === stage);
  if (!definition) {
    throw new Error(`unknown MathProve-native stage: ${stage}`);
  }
  return { ...definition, required_artifacts: [...definition.required_artifacts], hard_vetoes: [...definition.hard_vetoes] };
}

export function createMathProveNativeResumeState(input: {
  campaign_id: string;
  claim_id: string;
  stage: MathProveNativeStageId;
  locked_statement_hash: string;
  required_artifacts: string[];
  rewind_target?: MathProveNativeStageId;
  now?: () => string;
}): MathProveNativeResumeState {
  return {
    schema_version: "comath.mathprove_native.resume_state.v1",
    campaign_id: input.campaign_id,
    claim_id: input.claim_id,
    blocked_stage: input.stage,
    resume_to_stage: input.rewind_target ?? input.stage,
    rewind_target: input.rewind_target ?? input.stage,
    required_artifacts: [...input.required_artifacts],
    locked_statement_hash: input.locked_statement_hash,
    created_at: now(input.now),
    proof_authority: "none",
    can_promote_claim: false
  };
}

export function createMathProveNativeBlockerCertificate(input: {
  campaign_id: string;
  claim_id: string;
  stage: MathProveNativeStageId;
  locked_statement_hash: string;
  missing_artifacts?: string[];
  hard_vetoes?: string[];
  reason: string;
  rewind_target?: MathProveNativeStageId;
  blocker_count?: number;
  now?: () => string;
}): MathProveNativeBlockerCertificate {
  const definition = getMathProveNativeStageDefinition(input.stage);
  const requiredArtifacts = input.missing_artifacts && input.missing_artifacts.length > 0 ? input.missing_artifacts : definition.required_artifacts;
  const hardVetoes = input.hard_vetoes && input.hard_vetoes.length > 0 ? input.hard_vetoes : ["missing_required_stage_artifact"];
  const createdAt = now(input.now);
  const resumeState = createMathProveNativeResumeState({
    campaign_id: input.campaign_id,
    claim_id: input.claim_id,
    stage: input.stage,
    locked_statement_hash: input.locked_statement_hash,
    required_artifacts: requiredArtifacts,
    rewind_target: input.rewind_target,
    now: () => createdAt
  });
  return {
    schema_version: "comath.mathprove_native.blocker_certificate.v1",
    blocker_id: blockerId(input.campaign_id, input.stage, input.blocker_count),
    campaign_id: input.campaign_id,
    claim_id: input.claim_id,
    stage: input.stage,
    status: "blocked",
    reason: input.reason,
    required_artifacts: [...requiredArtifacts],
    hard_vetoes: [...hardVetoes],
    resume_state: resumeState,
    locked_statement_hash: input.locked_statement_hash,
    created_at: createdAt,
    proof_authority: "none",
    can_promote_claim: false
  };
}

export function createMathProveNativeStageRun(input: {
  campaign_id: string;
  claim_id: string;
  stage: MathProveNativeStageId;
  locked_statement_hash: string;
  input_artifacts?: string[];
  output_artifacts?: string[];
  status?: MathProveNativeStageStatus;
  missing_artifacts?: string[];
  hard_vetoes?: string[];
  run_index?: number;
  blocker_count?: number;
  now?: () => string;
}): MathProveNativeStageRun {
  const definition = getMathProveNativeStageDefinition(input.stage);
  const missingArtifacts = input.missing_artifacts ?? [];
  const status: MathProveNativeStageStatus = missingArtifacts.length > 0 ? "blocked" : input.status ?? "completed";
  const hardVetoes = status === "blocked" ? input.hard_vetoes ?? ["missing_required_stage_artifact"] : [];
  const createdAt = now(input.now);
  const blocker_certificate =
    status === "blocked"
      ? createMathProveNativeBlockerCertificate({
          campaign_id: input.campaign_id,
          claim_id: input.claim_id,
          stage: input.stage,
          locked_statement_hash: input.locked_statement_hash,
          missing_artifacts: missingArtifacts.length > 0 ? missingArtifacts : definition.required_artifacts,
          hard_vetoes: hardVetoes,
          reason: hardVetoes.includes("illegal_stage_transition") ? "illegal stage transition" : "missing required stage artifact",
          blocker_count: input.blocker_count,
          now: () => createdAt
        })
      : undefined;
  return {
    schema_version: "comath.mathprove_native.stage_run.v1",
    run_id: `MPNSR-${String((input.run_index ?? 0) + 1).padStart(4, "0")}`,
    campaign_id: input.campaign_id,
    claim_id: input.claim_id,
    stage: input.stage,
    status,
    input_schema: definition.required_input_schema,
    output_schema: definition.required_output_schema,
    input_artifacts: [...(input.input_artifacts ?? [])],
    output_artifacts: [...(input.output_artifacts ?? [])],
    required_artifacts: [...definition.required_artifacts],
    missing_artifacts: [...missingArtifacts],
    hard_vetoes: hardVetoes,
    blocker_certificate,
    resume_state: blocker_certificate?.resume_state,
    locked_statement_hash: input.locked_statement_hash,
    created_at: createdAt,
    proof_authority: "none",
    can_promote_claim: false
  };
}

export function createMathProveNativeWorkflowState(input: {
  campaign_id: string;
  claim_id: string;
  locked_statement_hash: string;
  now?: () => string;
}): MathProveNativeWorkflowState {
  const createdAt = now(input.now);
  return {
    schema_version: "comath.mathprove_native.workflow_state.v1",
    campaign_id: input.campaign_id,
    claim_id: input.claim_id,
    locked_statement_hash: input.locked_statement_hash,
    current_stage: "input_intake",
    status: "running",
    runs: [],
    blockers: [],
    created_at: createdAt,
    updated_at: createdAt,
    proof_authority: "none",
    can_promote_claim: false
  };
}

export function advanceMathProveNativeStage(
  state: MathProveNativeWorkflowState,
  input: { to_stage: MathProveNativeStageId; output_artifacts?: string[]; now?: () => string }
): MathProveNativeWorkflowState {
  const expected = nextStage(state.current_stage);
  if (expected !== input.to_stage) {
    const blocker = createMathProveNativeBlockerCertificate({
      campaign_id: state.campaign_id,
      claim_id: state.claim_id,
      stage: state.current_stage,
      locked_statement_hash: state.locked_statement_hash,
      missing_artifacts: [],
      hard_vetoes: ["illegal_stage_transition"],
      reason: `illegal transition from ${state.current_stage} to ${input.to_stage}`,
      blocker_count: state.blockers.length,
      now: input.now
    });
    return {
      ...state,
      status: "blocked",
      blockers: [...state.blockers, blocker],
      updated_at: blocker.created_at
    };
  }

  const currentDefinition = getMathProveNativeStageDefinition(state.current_stage);
  const outputArtifacts = input.output_artifacts ?? [];
  const missingArtifacts = missingRequiredArtifacts(currentDefinition, outputArtifacts);
  const run = createMathProveNativeStageRun({
    campaign_id: state.campaign_id,
    claim_id: state.claim_id,
    stage: state.current_stage,
    locked_statement_hash: state.locked_statement_hash,
    output_artifacts: outputArtifacts,
    missing_artifacts: missingArtifacts,
    run_index: state.runs.length,
    blocker_count: state.blockers.length,
    now: input.now
  });
  if (run.status === "blocked" && run.blocker_certificate) {
    return {
      ...state,
      status: "blocked",
      runs: [...state.runs, run],
      blockers: [...state.blockers, run.blocker_certificate],
      updated_at: run.created_at
    };
  }

  return {
    ...state,
    current_stage: input.to_stage,
    status: input.to_stage === "proof_memory_update" ? "terminal" : "running",
    runs: [...state.runs, run],
    updated_at: run.created_at
  };
}

export function validateMathProveNativeResumeState(
  resumeState: MathProveNativeResumeState,
  input: { current_stage: MathProveNativeStageId }
): MathProveNativeResumeValidation {
  const ok = input.current_stage === resumeState.resume_to_stage || input.current_stage === resumeState.rewind_target;
  return {
    ok,
    hard_vetoes: ok ? [] : ["resume_stage_mismatch"],
    proof_authority: "none",
    can_promote_claim: false
  };
}

export function assertMathProveEvidenceHasNoProofAuthority(input: {
  source?: unknown;
  mode?: unknown;
  gate_result?: unknown;
  ok?: unknown;
  target_status?: unknown;
  artifacts?: unknown;
}): MathProveEvidenceClassification {
  const gateResult = typeof input.gate_result === "string" ? input.gate_result : "unknown";
  const targetStatus = typeof input.target_status === "string" ? input.target_status : undefined;
  const hardVetoes = ["mathprove_output_has_no_proof_authority"];
  if (gateResult === "passed" || targetStatus === "formally_checked") {
    hardVetoes.push("missing_lean_clean_replay_authority");
  }
  return {
    schema_version: "comath.mathprove_native.external_evidence_classification.v1",
    source: typeof input.source === "string" ? input.source : "MathProve",
    mode: typeof input.mode === "string" ? input.mode : "unknown",
    gate_result: gateResult,
    ok: input.ok === true,
    target_status: targetStatus,
    normalized_status: "evidence_only",
    artifacts: Array.isArray(input.artifacts) ? input.artifacts : [],
    hard_vetoes: hardVetoes,
    proof_authority: "none",
    can_promote_claim: false
  };
}
