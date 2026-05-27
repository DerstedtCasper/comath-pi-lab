import { join } from "node:path";
import type { ResearchCampaign } from "../../types/schemas.js";

export function ensembleBaseRel(campaign: ResearchCampaign, obligationId: string): string {
  return join(".comath", "campaign", campaign.campaign_id, "ensembles", "lemma_sprint", obligationId);
}

export function ensembleCandidatesRel(campaign: ResearchCampaign, obligationId: string): string {
  return join(ensembleBaseRel(campaign, obligationId), "candidates.json").replace(/\\/g, "/");
}

export function ensembleDecisionRel(campaign: ResearchCampaign, obligationId: string): string {
  return join(ensembleBaseRel(campaign, obligationId), "decision.json").replace(/\\/g, "/");
}

export function candidateWorkspaceRel(campaign: ResearchCampaign, obligationId: string, variantSlug: string): string {
  return join(ensembleBaseRel(campaign, obligationId), "candidates", variantSlug);
}
