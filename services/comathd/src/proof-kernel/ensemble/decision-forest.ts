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

export function decideCandidate(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  candidates: CandidateRun[];
}): { decision: EnsembleDecision; gate: GateDecision } {
  validateCandidateManifests({ projectRoot: input.projectRoot, candidates: input.candidates });
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

  const obligationId = input.candidates[0]?.obligation_id ?? "PO-0001";
  const path = assertPathAllowed(input.projectRoot, ensembleDecisionRel(input.campaign, obligationId), {
    purpose: "runtime-write"
  });
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify({ ...decision, gate }, null, 2)}\n`, "utf8");
  return { decision, gate };
}
