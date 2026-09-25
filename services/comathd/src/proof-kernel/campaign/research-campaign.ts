import { withTrustedWriter, existsCommittedFile, readCommittedFile, writeCommittedFile, allocateProjectId, projectCommitTime, assertProjectReadable } from "../../research/project-commit.js";
import { join } from "node:path";
import { appendAuditEvent } from "../../audit/jsonl-writer.js";
import { assertPathAllowed } from "../../security/path-policy.js";
import { researchCampaignSchema, type ResearchCampaign } from "../../types/schemas.js";
import { nextSequentialId } from "../../utils/id.js";

function campaignsPath(projectRoot: string): string {
  return assertPathAllowed(projectRoot, join(".comath", "campaign", "campaigns.jsonl"), { purpose: "runtime-write" });
}

function campaignStatusPath(projectRoot: string, campaignId: string): string {
  return assertPathAllowed(projectRoot, join(".comath", "campaign", campaignId, "status.json"), {
    purpose: "runtime-write"
  });
}

export function readCampaigns(projectRoot: string): ResearchCampaign[] {
  const path = campaignsPath(projectRoot);
  if (!existsCommittedFile(projectRoot, path)) {
    return [];
  }
  return readCommittedFile(projectRoot, path)
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => researchCampaignSchema.parse(JSON.parse(line)));
}

export function getCampaign(projectRoot: string, campaignId: string): ResearchCampaign | null {
  assertProjectReadable(projectRoot, undefined, campaignId);
  const path = campaignStatusPath(projectRoot, campaignId);
  if (!existsCommittedFile(projectRoot, path)) {
    return null;
  }
  return researchCampaignSchema.parse(JSON.parse(readCommittedFile(projectRoot, path)));
}

export function nextCampaignId(projectRoot: string): string {
  return allocateProjectId(projectRoot, "CAM", () => nextSequentialId("CAM", readCampaigns(projectRoot).map((campaign) => campaign.campaign_id)));
}

export function writeCampaign(projectRoot: string, campaign: ResearchCampaign, actor = "campaign"): ResearchCampaign {
  return withTrustedWriter(projectRoot, "campaign.write", { campaign, actor }, () => {
    const parsed = researchCampaignSchema.parse({ ...campaign, updated_at: projectCommitTime(projectRoot) });
    const all = readCampaigns(projectRoot).filter((item) => item.campaign_id !== parsed.campaign_id);
    const statusPath = campaignStatusPath(projectRoot, parsed.campaign_id);

    writeCommittedFile(projectRoot, statusPath, `${JSON.stringify(parsed, null, 2)}\n`);

    const indexPath = campaignsPath(projectRoot);

    writeCommittedFile(projectRoot, indexPath, `${[...all, parsed].map((item) => JSON.stringify(item)).join("\n")}\n`);
    appendAuditEvent(projectRoot, {
      project_id: parsed.project_id,
      event_type: "campaign.updated",
      actor,
      target_id: parsed.campaign_id,
      payload: {
        stage: parsed.current_stage,
        status: parsed.status,
        terminal_state: parsed.terminal_state ?? null
      }
    });
    return parsed;

  }, campaign.campaign_id);
}
