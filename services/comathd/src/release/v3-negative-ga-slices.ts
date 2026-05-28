import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { assertPathAllowed } from "../security/path-policy.js";
import { applyGatePromotedClaim, registerClaim, getClaim } from "../claim/claim-store.js";
import { initProject } from "../project/project-store.js";
import { exportSnapshot, restoreSnapshot } from "../artifacts/snapshots.js";
import { importArtifact } from "../artifacts/store.js";
import { appendEvidenceRecord } from "../evidence/store.js";
import { promoteClaim } from "../verification/gate.js";
import { decideCandidate } from "../proof-kernel/ensemble/decision-forest.js";
import { ensembleDecisionRel } from "../proof-kernel/ensemble/paths.js";
import { recordFailedRoutes } from "../proof-kernel/ensemble/failure-aggregator.js";
import { replayCampaign, startCampaign, tickCampaign } from "../proof-kernel/campaign/campaign-tick.js";
import { checkStatementEquivalence } from "../proof-kernel/lean/statement-equivalence.js";
import { runStaticCheatScan } from "../proof-kernel/lean/static-cheat-scan.js";
import { candidateRunSchema, researchCampaignSchema, type CandidateRun, type Claim } from "../types/schemas.js";

type NegativeCase = {
  case_id: string;
  project_id: string;
  claim_id: string;
  final_claim_status: Claim["status"];
  promotion_blocked: boolean;
  evidence_preserved: boolean;
  evidence_paths: string[];
  gate_vetoes: string[];
  [key: string]: unknown;
};

export type V3NegativeGaSliceSummary = {
  schema_version: "comath.v3.negative_ga_slices.v1";
  artifact_path: string;
  all_required_slices_passed: boolean;
  proof_authority: "none";
  cases: NegativeCase[];
  created_at: string;
};

function now(): string {
  return new Date().toISOString();
}

function writeRuntimeJson(projectRoot: string, rel: string, value: unknown): string {
  const path = assertPathAllowed(projectRoot, rel, { purpose: "runtime-write" });
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return rel.replace(/\\/g, "/");
}

function claimStatus(projectRoot: string, projectId: string, claimId: string): Claim["status"] {
  const claim = getClaim(projectRoot, projectId, claimId);
  if (!claim) throw new Error(`claim not found: ${claimId}`);
  return claim.status;
}

function mkClaim(projectRoot: string, projectId: string, statement: string, actor: string): Claim {
  return registerClaim(projectRoot, {
    project_id: projectId,
    statement,
    assumptions: ["n : Nat"],
    domain: "elementary",
    status: "conjectural",
    actor
  });
}

function evidencePreserved(projectRoot: string, paths: string[]): boolean {
  return paths.every((rel) => {
    try {
      return existsSync(assertPathAllowed(projectRoot, rel, { purpose: "read", resolveRealpath: true }));
    } catch {
      return false;
    }
  });
}

const gateResultsRel = ".comath/claims/gate-results.jsonl";

function statementDriftCase(projectRoot: string, projectId: string, actor: string): NegativeCase {
  const claim = mkClaim(projectRoot, projectId, "For every natural number n, n + 0 = n.", actor);
  const reportRel = `.comath/release/negative/statement_drift_${claim.id}.json`;
  const report = checkStatementEquivalence({
    projectRoot,
    reportPath: reportRel,
    locked_statement_hash: claim.statement_hash,
    formal_spec_statement: "MathResearch.C0001 (n : Nat) : n + 0 = n",
    lean_check_output: "MathResearch.C0001 (n : Nat) : n + 1 = n",
    theorem_name: "MathResearch.C0001"
  });
  const promotion = promoteClaim(projectRoot, {
    project_id: projectId,
    claim_id: claim.id,
    target_status: "formally_checked",
    evidence_ids: [],
    artifact_ids: [],
    actor,
    external_vetoes: report.hard_vetoes
  });
  const evidence_paths = [reportRel, gateResultsRel];
  return {
    case_id: "statement_drift_rejection",
    project_id: projectId,
    claim_id: claim.id,
    final_claim_status: claimStatus(projectRoot, projectId, claim.id),
    promotion_blocked: !promotion.gate.ok,
    evidence_preserved: evidencePreserved(projectRoot, evidence_paths),
    evidence_paths,
    gate_vetoes: promotion.gate.vetoes,
    statement_equivalence_result: report.result
  };
}

function cheatingLeanCase(projectRoot: string, projectId: string, actor: string): NegativeCase {
  const claim = mkClaim(projectRoot, projectId, "For every natural number n, n + 0 = n.", actor);
  const leanRel = `.comath/release/negative/cheat_${claim.id}/Bad.lean`;
  const leanPath = assertPathAllowed(projectRoot, leanRel, { purpose: "runtime-write" });
  mkdirSync(dirname(leanPath), { recursive: true });
  writeFileSync(leanPath, "axiom bad : False\ntheorem C0001 (n : Nat) : n + 0 = n := by sorry\n", "utf8");
  const reportRel = `.comath/release/negative/cheat_${claim.id}/final_static_audit.json`;
  const report = runStaticCheatScan({ projectRoot, leanRoot: dirname(leanPath), reportPath: reportRel });
  const promotion = promoteClaim(projectRoot, {
    project_id: projectId,
    claim_id: claim.id,
    target_status: "formally_checked",
    evidence_ids: [],
    artifact_ids: [],
    actor,
    external_vetoes: report.hard_vetoes
  });
  const evidence_paths = [leanRel, reportRel, gateResultsRel];
  return {
    case_id: "cheating_lean_artifact_rejection",
    project_id: projectId,
    claim_id: claim.id,
    final_claim_status: claimStatus(projectRoot, projectId, claim.id),
    promotion_blocked: !promotion.gate.ok,
    evidence_preserved: evidencePreserved(projectRoot, evidence_paths),
    evidence_paths,
    gate_vetoes: promotion.gate.vetoes,
    static_audit_result: report.result
  };
}

async function tickToTerminal(projectRoot: string, campaignId: string, actor: string) {
  let last = await tickCampaign({ project_root: projectRoot, campaign_id: campaignId, actor });
  for (let index = 0; index < 16 && last.campaign.status !== "terminal"; index += 1) {
    last = await tickCampaign({ project_root: projectRoot, campaign_id: campaignId, actor });
  }
  return last;
}

async function falseTheoremRefutationCase(projectRoot: string, actor: string): Promise<NegativeCase> {
  const started = startCampaign({
    project_root: projectRoot,
    project_name: "Task 13 false theorem refutation",
    user_goal: "Prove in Lean that n + 1 = n for natural numbers.",
    domain: "elementary",
    strict_mode: true,
    actor
  });
  const final = await tickToTerminal(projectRoot, started.campaign.campaign_id, actor);
  const counterexamplePath = `.comath/evidence/${final.campaign.root_claim_id}/counterexample/CE-0001.json`;
  const evidence_paths = [counterexamplePath, `.comath/campaign/${final.campaign.campaign_id}/status.json`];
  return {
    case_id: "false_theorem_refutation",
    project_id: final.campaign.project_id,
    claim_id: final.campaign.root_claim_id,
    final_claim_status: claimStatus(projectRoot, final.campaign.project_id, final.campaign.root_claim_id),
    promotion_blocked: true,
    evidence_preserved: evidencePreserved(projectRoot, evidence_paths),
    evidence_paths,
    gate_vetoes: [],
    terminal_state: final.campaign.terminal_state,
    counterexample: final.counterexample
  };
}

function writeCandidateManifest(projectRoot: string, candidate: CandidateRun): string {
  const rel = join(candidate.workspace_path, "candidate_manifest.json").replace(/\\/g, "/");
  writeRuntimeJson(projectRoot, rel, {
    candidate_id: candidate.candidate_id,
    campaign_id: candidate.campaign_id,
    variant_id: candidate.variant_id,
    stage: candidate.stage,
    obligation_id: candidate.obligation_id,
    workspace_path: candidate.workspace_path,
    locked_statement_hash: candidate.locked_statement_hash,
    candidate_statement_hash: candidate.candidate_statement_hash,
    state: candidate.state,
    statement_equivalence_claim: "unknown",
    theorem_family: "nat_add_zero",
    canonical_proposition: "n + 0 = n",
    dependencies: [],
    assumptions: [],
    introduced_assumptions: [],
    introduced_dependencies: [],
    artifacts: [{ path: "failure_routes.json", kind: "failure_routes", required_for: ["failure_memory"] }],
    hard_vetoes: candidate.hard_vetoes,
    failures: ["no proof-grade evidence"],
    summary: "required negative GA all-candidate failure fixture",
    maintainability_notes: "not proof grade"
  });
  writeRuntimeJson(projectRoot, join(candidate.workspace_path, "failure_routes.json").replace(/\\/g, "/"), {
    candidate_id: candidate.candidate_id,
    failures: ["no proof-grade evidence"],
    hard_vetoes: candidate.hard_vetoes,
    recovery_hints: ["aggregate failures", "split or repair obligation", "rerun repair/refutation search"]
  });
  return rel;
}

function allCandidateFailureCase(projectRoot: string, projectId: string, actor: string): NegativeCase {
  const claim = mkClaim(projectRoot, projectId, "For every natural number n, n + 0 = n.", actor);
  const claimDigits = claim.id.replace(/\D/g, "").padStart(4, "0");
  const campaign = researchCampaignSchema.parse({
    campaign_id: `CAM-68${claimDigits}`,
    project_id: projectId,
    root_claim_id: claim.id,
    user_goal: claim.statement,
    current_stage: "candidate_arbitration",
    status: "running",
    strict_mode: true,
    stage_runs: [],
    open_obligations: [],
    accepted_artifacts: [],
    blockers: [],
    next_actions: [],
    created_at: now(),
    updated_at: now()
  });
  const candidates = Array.from({ length: 8 }, (_, index) => {
    const candidate = candidateRunSchema.parse({
      candidate_id: `CAND-${String(6801 + index).padStart(4, "0")}`,
      campaign_id: campaign.campaign_id,
      stage: "lemma_sprint",
      obligation_id: "PO-0001",
      variant_id: `V${index + 1}`,
      workspace_path: `.comath/release/negative/all_failed_${claim.id}/V${index + 1}`,
      locked_statement_hash: claim.statement_hash,
      candidate_statement_hash: claim.statement_hash,
      state: "candidate_failed",
      score: -100,
      hard_vetoes: ["no_kernel_checked_candidate"]
    });
    return { ...candidate, manifest_path: writeCandidateManifest(projectRoot, candidate) };
  });
  const decision = decideCandidate({ projectRoot, campaign, candidates });
  const aggregate = recordFailedRoutes({ projectRoot, campaign, candidates });
  const evidence_paths = [aggregate.aggregate_path, aggregate.event_log_path, ensembleDecisionRel(campaign, "PO-0001")];
  return {
    case_id: "all_candidate_failure_recovery",
    project_id: projectId,
    claim_id: claim.id,
    final_claim_status: claimStatus(projectRoot, projectId, claim.id),
    promotion_blocked: decision.gate.result !== "pass",
    evidence_preserved: evidencePreserved(projectRoot, evidence_paths),
    evidence_paths,
    gate_vetoes: decision.decision.rejected_candidates.map((item) => item.reason),
    decision_result: decision.gate.result,
    selection_mode: decision.decision.selection_mode,
    failure_aggregate: aggregate
  };
}

async function snapshotReplayCase(projectRoot: string, actor: string): Promise<NegativeCase> {
  const started = startCampaign({
    project_root: projectRoot,
    project_name: "Task 13 snapshot replay negative gate",
    user_goal: "Prove in Lean that n + 0 = n for natural numbers.",
    domain: "elementary",
    strict_mode: true,
    actor
  });
  const final = await tickToTerminal(projectRoot, started.campaign.campaign_id, actor);
  const snapshot = await exportSnapshot(projectRoot, { project_id: final.campaign.project_id, actor });
  const restoreRoot = assertPathAllowed(projectRoot, ".comath/release/negative/snapshot_restore", { purpose: "runtime-write" });
  await restoreSnapshot(snapshot.manifest_path, restoreRoot, { actor });
  const replay = await replayCampaign({ project_root: restoreRoot, campaign_id: final.campaign.campaign_id, actor });
  const claim = mkClaim(projectRoot, final.campaign.project_id, "Snapshot replay alone cannot promote this claim.", actor);
  const snapshotArtifact = await importArtifact({
    projectRoot,
    project_id: final.campaign.project_id,
    source_path: snapshot.manifest_path,
    kind: "runner_output",
    actor
  });
  const evidence = appendEvidenceRecord(projectRoot, {
    project_id: final.campaign.project_id,
    claim_id: claim.id,
    kind: "lean",
    summary: "Snapshot replay evidence is preserved but is not a fresh hash-bound final replay artifact for this claim.",
    artifact_ids: [snapshotArtifact.id]
  });
  const metadataReady = applyGatePromotedClaimForNegative(projectRoot, claim);
  const promotion = promoteClaim(projectRoot, {
    project_id: final.campaign.project_id,
    claim_id: metadataReady.id,
    target_status: "formally_checked",
    evidence_ids: [evidence.id],
    artifact_ids: [snapshotArtifact.id],
    actor
  });
  const evidence_paths = [snapshot.manifest_path.replace(projectRoot, "").replace(/^[/\\]/, "").replace(/\\/g, "/"), gateResultsRel];
  return {
    case_id: "snapshot_replay_requires_clean_replay",
    project_id: final.campaign.project_id,
    claim_id: metadataReady.id,
    final_claim_status: claimStatus(projectRoot, final.campaign.project_id, metadataReady.id),
    promotion_blocked: !promotion.gate.ok,
    evidence_preserved: replay.final_replay?.result === "pass" && evidencePreserved(projectRoot, evidence_paths),
    evidence_paths,
    gate_vetoes: promotion.gate.vetoes,
    snapshot_replay_result: replay.final_replay?.result,
    snapshot_only_promotion_gate_ok: promotion.gate.ok
  };
}

function applyGatePromotedClaimForNegative(projectRoot: string, claim: Claim): Claim {
  return applyGatePromotedClaim(projectRoot, {
    ...claim,
    formalization_status: "kernel_checked",
    dependency_closure_status: "all_dependencies_present",
    audit_state: "audit_passed",
    updated_at: now()
  });
}

export async function runV3NegativeGaSlices(input: {
  project_root: string;
  project_name?: string;
  actor?: string;
}): Promise<{ summary: V3NegativeGaSliceSummary }> {
  const actor = input.actor ?? "v3-negative-ga-slices";
  const { project } = initProject({
    name: input.project_name ?? "v3 Negative GA Slices",
    root_path: input.project_root
  });
  const cases: NegativeCase[] = [
    statementDriftCase(input.project_root, project.project_id, actor),
    cheatingLeanCase(input.project_root, project.project_id, actor),
    await falseTheoremRefutationCase(input.project_root, actor),
    allCandidateFailureCase(input.project_root, project.project_id, actor),
    await snapshotReplayCase(input.project_root, actor)
  ];
  const artifact_path = ".comath/release/v3_negative_ga_slices.json";
  const summary: V3NegativeGaSliceSummary = {
    schema_version: "comath.v3.negative_ga_slices.v1",
    artifact_path,
    all_required_slices_passed: cases.every((item) => item.promotion_blocked && item.evidence_preserved),
    proof_authority: "none",
    cases,
    created_at: now()
  };
  writeRuntimeJson(input.project_root, artifact_path, summary);
  return { summary };
}
