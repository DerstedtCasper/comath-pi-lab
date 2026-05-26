import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { assertPathAllowed } from "../../security/path-policy.js";
import { gateDecisionSchema, type CandidateRun, type GateDecision, type ResearchCampaign } from "../../types/schemas.js";

export type EnsembleDecision = {
  selected_candidate_id: string | null;
  rejected_candidates: Array<{ candidate_id: string; reason: string }>;
  hard_vetoes: string[];
  recovery_plan: string[];
};

export function decideCandidate(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  candidates: CandidateRun[];
}): { decision: EnsembleDecision; gate: GateDecision } {
  const eligible = input.candidates
    .filter(
      (candidate) =>
        candidate.state === "candidate_kernel_checked" &&
        candidate.hard_vetoes.length === 0 &&
        candidate.candidate_statement_hash === candidate.locked_statement_hash
    )
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const selected = eligible[0] ?? null;
  const decision: EnsembleDecision = {
    selected_candidate_id: selected?.candidate_id ?? null,
    rejected_candidates: input.candidates
      .filter((candidate) => candidate.candidate_id !== selected?.candidate_id)
      .map((candidate) => ({
        candidate_id: candidate.candidate_id,
        reason:
          candidate.candidate_statement_hash && candidate.candidate_statement_hash !== candidate.locked_statement_hash
            ? "statement drift from locked obligation"
            : candidate.hard_vetoes.length > 0
              ? `hard veto: ${candidate.hard_vetoes.join(", ")}`
              : candidate.state === "candidate_kernel_checked"
                ? "lower evidence-weighted score"
                : "no proof-grade evidence"
      })),
    hard_vetoes: [],
    recovery_plan: selected ? [] : ["aggregate failures", "split obligation", "rerun repair/refutation search"]
  };
  const gate = gateDecisionSchema.parse({
    gate_id: "GD-0001",
    campaign_id: input.campaign.campaign_id,
    stage: "lemma_sprint",
    subject_id: input.campaign.root_claim_id,
    result: selected ? "pass" : "blocked",
    selected_candidate_id: selected?.candidate_id,
    evidence: [],
    hard_vetoes: [],
    warnings: [],
    decision_rationale_summary: selected
      ? "Selected the only candidate classified as kernel-checked for the exact locked statement."
      : "No candidate carried proof-grade evidence; campaign must repair or block.",
    created_at: new Date().toISOString()
  });

  const path = assertPathAllowed(
    input.projectRoot,
    join(".comath", "ensembles", "lemma_sprint", "PO-0001", "decision.json"),
    { purpose: "runtime-write" }
  );
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify({ ...decision, gate }, null, 2)}\n`, "utf8");
  return { decision, gate };
}
