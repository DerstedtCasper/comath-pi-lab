import { ComathError } from "../../errors.js";
import { campaignStageSchema, type CampaignStage, type ResearchCampaign } from "../../types/schemas.js";
import { validateObligationGraphs } from "./active-obligation.js";

function fail(code: string, message: string): never { throw new ComathError(message, { code, statusCode: 409 }); }
function positiveAttempt(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1) fail("OBLIGATION_STAGE_ATTEMPT_INVALID", "Stage attempt must be a positive safe integer");
  return value;
}

export function advanceObligationStage(campaign: ResearchCampaign, nextStage: CampaignStage,
  options: { obligation_id?: string; retry?: boolean; blocked_reason?: string } = {}): ResearchCampaign {
  if (!campaignStageSchema.safeParse(nextStage).success) fail("OBLIGATION_STAGE_INVALID", "Unknown obligation stage");
  validateObligationGraphs(campaign.open_obligations);
  const only = campaign.open_obligations.length === 1;
  const target = options.obligation_id ?? campaign.active_obligation_id ?? (only ? campaign.open_obligations[0]!.obligation_id : undefined);
  if (!target || !campaign.open_obligations.some(item => item.obligation_id === target)) fail("OBLIGATION_STAGE_TARGET_INVALID", "Stage transition requires a known obligation target");
  const historyMaximum = (stage: CampaignStage) => campaign.stage_runs.reduce((maximum, run) => {
    if (run.stage !== stage || !(run.obligation_id === target || only && run.obligation_id === undefined)) return maximum;
    return Math.max(maximum, positiveAttempt(run.stage_attempt ?? 1));
  }, 0);
  const saved = campaign.obligation_cursors?.[target];
  if (saved) positiveAttempt(saved.stage_attempt);
  const current: NonNullable<ResearchCampaign["obligation_cursors"]>[string] | undefined = saved
    ?? (only ? { current_stage: campaign.current_stage, stage_attempt: Math.max(1, historyMaximum(campaign.current_stage)) } : undefined);
  const sameStage = current?.current_stage === nextStage;
  const maximum = Math.max(historyMaximum(nextStage), sameStage ? current.stage_attempt : 0);
  const attempt = sameStage && !options.retry ? current.stage_attempt : positiveAttempt(maximum + 1);
  const blockedReason = Object.hasOwn(options, "blocked_reason") ? options.blocked_reason : (sameStage && !options.retry ? current.blocked_reason : undefined);
  const cursor = { current_stage: nextStage, stage_attempt: attempt, ...(blockedReason === undefined ? {} : { blocked_reason: blockedReason }) };
  return { ...campaign, active_obligation_id: target, current_stage: nextStage,
    obligation_cursors: { ...campaign.obligation_cursors, [target]: cursor } };
}

function safeSegment(value: string): boolean {
  return typeof value === "string" && value.length > 0 && !/[\\/:<>"|?*\p{Cc}]/u.test(value) && !/^\.+$/u.test(value) && !/[. ]$/u.test(value)
    && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(value);
}

/** Pure relative path producer; the commit-aware writer owns all filesystem effects. */
export function obligationStagePath(campaign: ResearchCampaign, relative: string): string {
  validateObligationGraphs(campaign.open_obligations);
  const active = campaign.active_obligation_id;
  const cursor = active === undefined ? undefined : campaign.obligation_cursors?.[active];
  if (!active || !campaign.open_obligations.some(item => item.obligation_id === active) || !cursor
    || cursor.current_stage !== campaign.current_stage || !campaignStageSchema.safeParse(cursor.current_stage).success) {
    fail("OBLIGATION_STAGE_CURSOR_MISMATCH", "Stage paths require a consistent active obligation and stage cursor");
  }
  positiveAttempt(cursor.stage_attempt);
  const parts = typeof relative === "string" ? relative.replace(/\\/g, "/").split("/") : [];
  if (!parts.length || ![campaign.campaign_id, active, cursor.current_stage, ...parts].every(safeSegment)) {
    fail("OBLIGATION_STAGE_PATH_INVALID", "Stage artifact path must contain only safe relative components");
  }
  return `.comath/campaign/${campaign.campaign_id}/proof/${active}/stages/${cursor.current_stage}/a${cursor.stage_attempt}/${parts.join("/")}`;
}
