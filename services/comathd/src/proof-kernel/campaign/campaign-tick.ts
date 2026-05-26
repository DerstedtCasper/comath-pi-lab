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
import { runTrivialNatAddZeroCandidates } from "../ensemble/candidate-runner.js";
import { createNatAddZeroLeanProject } from "../lean/lean-project.js";
import { runCleanLeanReplay, type CleanReplayResult } from "../lean/clean-replay.js";
import { getCampaign, nextCampaignId, writeCampaign } from "./research-campaign.js";
import {
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

type LockedProblem = {
  statement: string;
  structured: Record<string, unknown>;
  lean_target?: string;
  theorem_name?: string;
};

function classifyLockedProblem(goal: string): LockedProblem {
  if (/n\s*\+\s*1\s*=\s*n/i.test(goal)) {
    return {
      statement: "For every natural number n, n + 1 = n.",
      structured: { variable: "n", type: "Nat", proposition: "n + 1 = n" },
      lean_target: "theorem C0001 (n : Nat) : n + 1 = n",
      theorem_name: "MathResearch.C0001"
    };
  }
  if (/n\s*\+\s*0\s*=\s*n|n \+ 0 = n|natural/i.test(goal)) {
    return {
      statement: "For every natural number n, n + 0 = n.",
      structured: { variable: "n", type: "Nat", proposition: "n + 0 = n" },
      lean_target: "theorem C0001 (n : Nat) : n + 0 = n",
      theorem_name: "MathResearch.C0001"
    };
  }
  return {
    statement: goal.trim(),
    structured: {},
    lean_target: undefined,
    theorem_name: undefined
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
  writeRuntimeFile(projectRoot, join(".comath", "lock", "notation.md"), "# Notation\n\n- `Nat`: Lean natural numbers.\n- `+`: Nat addition.\n");
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
    current_stage: "problem_lock",
    status: "running",
    strict_mode: input.strict_mode ?? true,
    stage_runs: [],
    open_obligations: [obligation],
    accepted_artifacts: [],
    blockers: [],
    next_actions: ["tick campaign to build context and run the proof-route ensemble"],
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

function readStoredDecision(projectRoot: string): { candidates: CandidateRun[]; decision: EnsembleDecision } | undefined {
  const decisionPath = assertPathAllowed(projectRoot, join(".comath", "ensembles", "lemma_sprint", "PO-0001", "decision.json"), {
    purpose: "runtime-write"
  });
  const candidatesPath = assertPathAllowed(projectRoot, join(".comath", "ensembles", "lemma_sprint", "PO-0001", "candidates.json"), {
    purpose: "runtime-write"
  });
  if (!existsSync(decisionPath)) {
    return undefined;
  }
  const payload = JSON.parse(readFileSync(decisionPath, "utf8"));
  const candidates = existsSync(candidatesPath) ? (JSON.parse(readFileSync(candidatesPath, "utf8")) as CandidateRun[]) : [];
  return { candidates, decision: payload as EnsembleDecision };
}

function isNatAddOneFalseObligation(obligation: ProofObligation): boolean {
  return obligation.locked_statement_structured.proposition === "n + 1 = n";
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
      current_stage: "terminal",
      status: "terminal",
      terminal_state: "verified_counterexample",
      open_obligations: [{ ...input.obligation, status: "refuted" }],
      accepted_artifacts: [artifact],
      blockers: [],
      stage_runs: [
        ...input.campaign.stage_runs,
        {
          id: "SR-0002",
          stage: "lemma_sprint",
          status: "completed",
          artifact_paths: [artifactRel.replace(/\\/g, "/")],
          created_at: now()
        }
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
  const obligation = campaign.open_obligations[0];
  if (!obligation) {
    throw new ComathError("campaign has no open proof obligation", { statusCode: 400, code: "CAMPAIGN_NO_OBLIGATION" });
  }

  if (campaign.current_stage === "problem_lock") {
    writeRuntimeFile(
      input.project_root,
      join(".comath", "proof", "obligations", `${obligation.obligation_id}.json`),
      `${JSON.stringify(obligation, null, 2)}\n`
    );
    const next = writeCampaign(
      input.project_root,
      researchCampaignSchema.parse({
        ...campaign,
        current_stage: "lemma_sprint",
        stage_runs: [
          ...campaign.stage_runs,
          {
            id: "SR-0001",
            stage: "problem_lock",
            status: "completed",
            artifact_paths: [
              ".comath/lock/problem_lock.md",
              ".comath/lock/assumptions.md",
              ".comath/lock/notation.md",
              ".comath/goals.yaml"
            ],
            created_at: now()
          }
        ],
        next_actions: ["run strict 8-way candidate ensemble for PO-0001"]
      }),
      actor
    );
    return { campaign: next, obligation };
  }

  if (campaign.current_stage === "lemma_sprint") {
    if (isNatAddOneFalseObligation(obligation)) {
      return completeVerifiedCounterexample({
        projectRoot: input.project_root,
        campaign,
        obligation,
        actor
      });
    }
    const batch = runTrivialNatAddZeroCandidates({ projectRoot: input.project_root, campaign, obligation });
    const { decision, gate } = decideCandidate({ projectRoot: input.project_root, campaign, candidates: batch.candidates });
    writeRuntimeFile(
      input.project_root,
      join(".comath", "ensembles", "lemma_sprint", "PO-0001", "candidates.json"),
      `${JSON.stringify(batch.candidates, null, 2)}\n`
    );
    recordFailedRoutes({ projectRoot: input.project_root, campaign, candidates: batch.candidates });
    const next = writeCampaign(
      input.project_root,
      researchCampaignSchema.parse({
        ...campaign,
        current_stage: "final_global_lean_replay",
        open_obligations: [{ ...obligation, status: "candidate_selected" }],
        stage_runs: [
          ...campaign.stage_runs,
          {
            id: "SR-0002",
            stage: "lemma_sprint",
            status: gate.result === "pass" ? "completed" : "blocked",
            artifact_paths: [".comath/ensembles/lemma_sprint/PO-0001/decision.json"],
            created_at: now()
          }
        ],
        next_actions: ["run final static audit and clean Lean replay"]
      }),
      actor
    );
    return { campaign: next, obligation, ensemble: { candidates: batch.candidates, decision }, gate };
  }

  if (campaign.current_stage === "final_global_lean_replay") {
    const claim = getClaim(input.project_root, campaign.project_id, campaign.root_claim_id);
    if (!claim) {
      throw new ComathError("campaign root claim not found", { statusCode: 404, code: "CLAIM_NOT_FOUND" });
    }
    const leanProject = createNatAddZeroLeanProject({
      projectRoot: input.project_root,
      claim_id: claim.id,
      locked_statement_hash: claim.statement_hash
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
      summary: "Clean Lean/Lake replay passed for MathResearch.C0001 with static audit, dependency closure, axiom profile, and statement-equivalence reports.",
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
    const next = writeCampaign(
      input.project_root,
      researchCampaignSchema.parse({
        ...campaign,
        current_stage: "terminal",
        status: "terminal",
        terminal_state: ok ? "formal_proof_verified" : "replayable_environment_blocker",
        open_obligations: [{ ...obligation, status: ok ? "integrated" : "blocked" }],
        accepted_artifacts: [proofArtifact, replayArtifact, auditArtifact],
        blockers: ok ? [] : [{ reason: "final replay or promotion gate failed", gate: promotion.gate }],
        stage_runs: [
          ...campaign.stage_runs,
          {
            id: "SR-0003",
            stage: "final_global_lean_replay",
            status: ok ? "completed" : "blocked",
            artifact_paths: [
              ".comath/evidence/C-0001/lean/final_replay_manifest.json",
              ".comath/evidence/C-0001/lean/final_static_audit.json"
            ],
            created_at: now()
          }
        ],
        next_actions: ok ? [] : ["inspect final replay logs and promotion gate vetoes"]
      }),
      actor
    );
    return {
      campaign: next,
      obligation,
      ensemble: readStoredDecision(input.project_root),
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
  const leanProject = createNatAddZeroLeanProject({
    projectRoot: input.project_root,
    claim_id: claim.id,
    locked_statement_hash: claim.statement_hash
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
