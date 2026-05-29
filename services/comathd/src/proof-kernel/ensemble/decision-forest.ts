import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { ComathError } from "../../errors.js";
import { assertPathAllowed } from "../../security/path-policy.js";
import {
  candidateManifestSchema,
  gateDecisionSchema,
  type CandidateManifest,
  type CandidateRun,
  type GateDecision,
  type ResearchCampaign
} from "../../types/schemas.js";
import { ensembleDecisionRel } from "./paths.js";

export type EnsembleDecision = {
  selected_candidate_id: string | null;
  selection_mode: "evidence_weighted" | "verified_refutation" | "recovery_required";
  refutation_candidate_id?: string;
  proof_authority: "none";
  rejected_candidates: Array<{ candidate_id: string; reason: string }>;
  hard_vetoes: string[];
  recovery_plan: string[];
};

function readCandidateManifest(input: { projectRoot: string; candidate: CandidateRun }): CandidateManifest {
  if (!input.candidate.manifest_path) {
    throw new ComathError(`candidate ${input.candidate.candidate_id} is missing manifest_path`, {
      statusCode: 409,
      code: "CANDIDATE_MANIFEST_INVALID"
    });
  }
  const path = assertPathAllowed(input.projectRoot, input.candidate.manifest_path, {
    purpose: "read",
    resolveRealpath: true
  });
  const manifest = candidateManifestSchema.parse(JSON.parse(readFileSync(path, "utf8")));
  const mismatches: string[] = [];
  for (const key of ["candidate_id", "campaign_id", "stage", "obligation_id", "variant_id", "locked_statement_hash", "state"] as const) {
    if (manifest[key] !== input.candidate[key]) {
      mismatches.push(key);
    }
  }
  if (manifest.workspace_path !== input.candidate.workspace_path) {
    mismatches.push("workspace_path");
  }
  if (manifest.candidate_statement_hash !== input.candidate.candidate_statement_hash) {
    mismatches.push("candidate_statement_hash");
  }
  if ((manifest.replay_command || undefined) !== input.candidate.replay_command) {
    mismatches.push("replay_command");
  }
  if (mismatches.length > 0) {
    throw new ComathError(`candidate manifest statement hash mismatch or metadata mismatch: ${mismatches.join(", ")}`, {
      statusCode: 409,
      code: "CANDIDATE_MANIFEST_INVALID"
    });
  }
  return manifest;
}

function validateCandidateManifests(input: { projectRoot: string; candidates: CandidateRun[] }): CandidateManifest[] {
  return input.candidates.map((candidate) => readCandidateManifest({ projectRoot: input.projectRoot, candidate }));
}

function hasStatementDrift(candidate: CandidateRun): boolean {
  return Boolean(candidate.candidate_statement_hash && candidate.candidate_statement_hash !== candidate.locked_statement_hash);
}

function hasBoundStatementHash(candidate: CandidateRun, manifest?: CandidateManifest): boolean {
  return Boolean(
    candidate.candidate_statement_hash &&
      manifest?.candidate_statement_hash &&
      candidate.candidate_statement_hash === candidate.locked_statement_hash &&
      manifest.candidate_statement_hash === candidate.locked_statement_hash
  );
}

function hasProofGradeStatementEquivalence(manifest: CandidateManifest): boolean {
  return manifest.statement_equivalence_claim === "exact" || manifest.statement_equivalence_claim === "equivalent";
}

function hasUnapprovedAssumptionDelta(manifest?: CandidateManifest): boolean {
  return (manifest?.introduced_assumptions.length ?? 0) > 0;
}

function hasHardVeto(candidate: CandidateRun, manifest?: CandidateManifest): boolean {
  return candidate.hard_vetoes.length > 0 || (manifest?.hard_vetoes.length ?? 0) > 0;
}

function hasTrustedReplayEvidence(candidate: CandidateRun, manifest: CandidateManifest): boolean {
  const hasReplayCommand = Boolean(candidate.replay_command || manifest.replay_command);
  const hasLeanRunManifestEvidence = manifest.evidence.some((evidence) =>
    /lean_run_manifest|final_replay_manifest|service_owned_lean_replay/i.test(evidence)
  );
  return hasReplayCommand && hasLeanRunManifestEvidence;
}

function evidenceScore(candidate: CandidateRun, manifest: CandidateManifest): number {
  let score = 0;
  if (candidate.state === "candidate_kernel_checked") {
    score += 10_000;
  }
  if (manifest.statement_equivalence_claim === "exact") {
    score += 3_000;
  } else if (manifest.statement_equivalence_claim === "equivalent") {
    score += 2_000;
  }
  if ((manifest.dependencies.length > 0 || manifest.primary_dependency) && manifest.introduced_dependencies.length > 0) {
    score += 2_000;
  }
  if (manifest.hard_vetoes.length === 0) {
    score += 1_500;
  }
  if (/maintain|small|decompos|clean/i.test(manifest.maintainability_notes)) {
    score += 700;
  }
  if (manifest.dependencies.length > 0) {
    score += 500;
  }
  if (manifest.replay_command.length > 0 || candidate.replay_command) {
    score += 300;
  }
  if (hasStatementDrift(candidate)) {
    score -= 8_000;
  }
  if (manifest.introduced_assumptions.length > 0) {
    score -= 5_000;
  }
  if (hasHardVeto(candidate, manifest)) {
    score -= 10_000;
  }
  return score + Math.min(candidate.score ?? 0, 100);
}

function rejectionReason(candidate: CandidateRun, selected: CandidateRun | null, manifest?: CandidateManifest): string {
  if (hasStatementDrift(candidate)) {
    return "statement drift from locked obligation";
  }
  if (!hasBoundStatementHash(candidate, manifest)) {
    return "missing candidate statement hash binding to locked obligation";
  }
  if (hasHardVeto(candidate, manifest)) {
    return `hard veto: ${[...candidate.hard_vetoes, ...(manifest?.hard_vetoes ?? [])].join(", ")}`;
  }
  if (candidate.state === "candidate_kernel_checked" && manifest && !hasProofGradeStatementEquivalence(manifest)) {
    return `statement equivalence ${manifest.statement_equivalence_claim} is not proof-grade`;
  }
  if (candidate.state === "candidate_kernel_checked" && manifest && !hasTrustedReplayEvidence(candidate, manifest)) {
    return "missing service-owned Lean replay evidence";
  }
  if (hasUnapprovedAssumptionDelta(manifest)) {
    return "introduced assumptions require problem-lock update before proof selection";
  }
  if (selected && candidate.state === "candidate_kernel_checked") {
    return "lower evidence-weighted score";
  }
  if (candidate.state === "candidate_refutes_step") {
    return "verified refutation is routed to theorem repair/counterexample protocol";
  }
  return "no proof-grade evidence";
}

export function decideCandidate(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  candidates: CandidateRun[];
}): { decision: EnsembleDecision; gate: GateDecision } {
  const manifests = validateCandidateManifests({ projectRoot: input.projectRoot, candidates: input.candidates });
  const manifestByCandidateId = new Map(manifests.map((manifest) => [manifest.candidate_id, manifest]));
  const eligible = input.candidates
    .filter(
      (candidate) =>
        candidate.state === "candidate_kernel_checked" &&
        !hasStatementDrift(candidate) &&
        hasBoundStatementHash(candidate, manifestByCandidateId.get(candidate.candidate_id)) &&
        !hasHardVeto(candidate, manifestByCandidateId.get(candidate.candidate_id)) &&
        !hasUnapprovedAssumptionDelta(manifestByCandidateId.get(candidate.candidate_id)) &&
        hasProofGradeStatementEquivalence(manifestByCandidateId.get(candidate.candidate_id)!) &&
        hasTrustedReplayEvidence(candidate, manifestByCandidateId.get(candidate.candidate_id)!)
    )
    .sort(
      (a, b) =>
        evidenceScore(b, manifestByCandidateId.get(b.candidate_id)!) -
          evidenceScore(a, manifestByCandidateId.get(a.candidate_id)!) ||
        a.candidate_id.localeCompare(b.candidate_id)
    );
  const selected = eligible[0] ?? null;
  const refutation =
    selected === null
      ? input.candidates.find(
          (candidate) =>
            candidate.state === "candidate_refutes_step" &&
            !hasStatementDrift(candidate) &&
            hasBoundStatementHash(candidate, manifestByCandidateId.get(candidate.candidate_id)) &&
            !hasHardVeto(candidate, manifestByCandidateId.get(candidate.candidate_id))
        )
      : undefined;
  const selectionMode = selected ? "evidence_weighted" : refutation ? "verified_refutation" : "recovery_required";
  const decision: EnsembleDecision = {
    selected_candidate_id: selected?.candidate_id ?? null,
    selection_mode: selectionMode,
    refutation_candidate_id: refutation?.candidate_id,
    proof_authority: "none",
    rejected_candidates: input.candidates
      .filter((candidate) => candidate.candidate_id !== selected?.candidate_id)
      .map((candidate) => ({
        candidate_id: candidate.candidate_id,
        reason: rejectionReason(candidate, selected, manifestByCandidateId.get(candidate.candidate_id))
      })),
    hard_vetoes: [],
    recovery_plan: selected
      ? []
      : refutation
        ? [
            "preserve verified counterexample/refutation artifact",
            "stop proof integration and enter theorem repair or counterexample protocol",
            "return repaired theorem to problem lock before retrying proof search"
          ]
        : ["aggregate failures", "split or repair obligation", "rerun repair/refutation search"]
  };
  const gate = gateDecisionSchema.parse({
    gate_id: "GD-0001",
    campaign_id: input.campaign.campaign_id,
    stage: "lemma_sprint",
    subject_id: input.campaign.root_claim_id,
    result: selected ? "pass" : refutation ? "repair_required" : "blocked",
    selected_candidate_id: selected?.candidate_id,
    evidence: [],
    hard_vetoes: [],
    warnings: [],
    decision_rationale_summary: selected
      ? "Selected a kernel-checked exact/equivalent candidate by evidence-weighted scoring; agreement is not proof authority."
      : refutation
        ? "Verified refutation candidate found; proof integration stops for theorem repair/counterexample protocol."
        : "No candidate carried proof-grade evidence; campaign must aggregate failures and recover.",
    created_at: new Date().toISOString()
  });

  const obligationId = input.candidates[0]?.obligation_id ?? "PO-0001";
  const path = assertPathAllowed(input.projectRoot, ensembleDecisionRel(input.campaign, obligationId), {
    purpose: "runtime-write"
  });
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify({ ...decision, gate }, null, 2)}\n`, "utf8");
  return { decision, gate };
}
