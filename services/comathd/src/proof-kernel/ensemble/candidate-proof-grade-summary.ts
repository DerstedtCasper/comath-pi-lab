import { readFileSync } from "node:fs";
import { assertPathAllowed } from "../../security/path-policy.js";
import { candidateManifestSchema, type CandidateManifest, type CandidateRun, type ResearchCampaign } from "../../types/schemas.js";
import { hasVerifiedServiceOwnedLeanManifestEvidence } from "./service-owned-lean-evidence.js";

export type CandidateProofGradeEvidenceSummary = {
  kernel_checked_candidates: number;
  kernel_checked_candidate_ids: string[];
  kernel_checked_count_semantics: "raw_candidate_state_only";
  proof_grade_kernel_checked_candidates: number;
  proof_grade_kernel_checked_candidate_ids: string[];
  proof_grade_kernel_checked_count_semantics: "service_owned_manifest_verified";
  proof_authority: "none";
  can_promote_claim: false;
};

function readCandidateManifest(projectRoot: string, candidate: CandidateRun): CandidateManifest | undefined {
  if (!candidate.manifest_path) {
    return undefined;
  }
  try {
    const path = assertPathAllowed(projectRoot, candidate.manifest_path, { purpose: "read", resolveRealpath: true });
    return candidateManifestSchema.parse(JSON.parse(readFileSync(path, "utf8")));
  } catch {
    return undefined;
  }
}

export function summarizeCandidateProofGradeEvidence(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  candidates: CandidateRun[];
}): CandidateProofGradeEvidenceSummary {
  const kernelChecked = input.candidates.filter((candidate) => candidate.state === "candidate_kernel_checked");
  const proofGradeKernelChecked = kernelChecked.filter((candidate) => {
    const manifest = readCandidateManifest(input.projectRoot, candidate);
    if (!manifest) {
      return false;
    }
    return hasVerifiedServiceOwnedLeanManifestEvidence({
      projectRoot: input.projectRoot,
      campaignId: input.campaign.campaign_id,
      claimId: input.campaign.root_claim_id,
      candidateId: candidate.candidate_id,
      evidence: manifest.evidence
    });
  });

  return {
    kernel_checked_candidates: kernelChecked.length,
    kernel_checked_candidate_ids: kernelChecked.map((candidate) => candidate.candidate_id),
    kernel_checked_count_semantics: "raw_candidate_state_only",
    proof_grade_kernel_checked_candidates: proofGradeKernelChecked.length,
    proof_grade_kernel_checked_candidate_ids: proofGradeKernelChecked.map((candidate) => candidate.candidate_id),
    proof_grade_kernel_checked_count_semantics: "service_owned_manifest_verified",
    proof_authority: "none",
    can_promote_claim: false
  };
}
