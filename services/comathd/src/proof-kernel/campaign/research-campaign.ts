import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
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
  if (!existsSync(path)) {
    return [];
  }
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => researchCampaignSchema.parse(JSON.parse(line)));
}

export function getCampaign(projectRoot: string, campaignId: string): ResearchCampaign | null {
  const path = campaignStatusPath(projectRoot, campaignId);
  if (!existsSync(path)) {
    return null;
  }
  return researchCampaignSchema.parse(JSON.parse(readFileSync(path, "utf8")));
}

export function nextCampaignId(projectRoot: string): string {
  return nextSequentialId("CAM", readCampaigns(projectRoot).map((campaign) => campaign.campaign_id));
}

export function writeCampaign(projectRoot: string, campaign: ResearchCampaign, actor = "campaign"): ResearchCampaign {
  const parsed = researchCampaignSchema.parse({ ...campaign, updated_at: new Date().toISOString() });
  const statusPath = campaignStatusPath(projectRoot, parsed.campaign_id);
  mkdirSync(dirname(statusPath), { recursive: true });
  writeFileSync(statusPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");

  const all = readCampaigns(projectRoot).filter((item) => item.campaign_id !== parsed.campaign_id);
  const indexPath = campaignsPath(projectRoot);
  mkdirSync(dirname(indexPath), { recursive: true });
  writeFileSync(indexPath, `${[...all, parsed].map((item) => JSON.stringify(item)).join("\n")}\n`, "utf8");
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
}
