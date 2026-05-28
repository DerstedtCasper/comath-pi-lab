import { aggregateDashboardSnapshot } from "./renderers.js";
import type { DashboardSnapshot } from "./widgets.js";

type CampaignLoopClient = {
  get(path: string): Promise<any>;
  post(path: string, body: unknown): Promise<any>;
};

type CampaignLoopCommand = {
  namespace: "cm";
  action: string;
  subcommand?: string;
  args: string[];
};

export type CampaignLoopCapability = {
  kind: "campaign_loop";
  project_root: string;
  actor: string;
  max_ticks: number;
  token: string;
  confirmation_id: string;
};

export type MutationConfirmation = {
  kind: "mutation_confirmation";
  target: string;
  allowed: boolean;
  confirmation_id: string;
};

export type ResearchCampaignLoopInput = {
  project_root: string;
  project_name?: string;
  user_goal: string;
  domain?: string;
  strict_mode?: boolean;
  actor: string;
  max_ticks?: number;
  capability?: CampaignLoopCapability;
};

export type ResearchCampaignLoopResult = {
  campaign: any;
  obligation?: any;
  ticks: any[];
  dashboard: DashboardSnapshot;
  terminal: boolean;
  stopped_reason: "terminal" | "tick_budget_exhausted" | "blocked" | "running";
};

export function issueCampaignLoopCapability(input: {
  project_root: string;
  actor: string;
  max_ticks?: number;
  confirmation: MutationConfirmation;
}): CampaignLoopCapability {
  const allowedTargets = new Set(["/cm:research", "comath.research.runCampaignLoop"]);
  if (
    input.confirmation.kind !== "mutation_confirmation" ||
    input.confirmation.allowed !== true ||
    !input.confirmation.confirmation_id
  ) {
    throw new Error("confirmed mutation permission is required");
  }
  if (!allowedTargets.has(input.confirmation.target)) {
    throw new Error("campaign loop confirmation target is required");
  }
  return {
    kind: "campaign_loop",
    project_root: input.project_root,
    actor: input.actor,
    max_ticks: input.max_ticks ?? 8,
    token: `campaign-loop:${input.confirmation.confirmation_id}`,
    confirmation_id: input.confirmation.confirmation_id
  };
}

function readFlagValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  const value = args[index + 1];
  return value && !value.startsWith("--") ? value : undefined;
}

function inferGoal(command: CampaignLoopCommand): string {
  const tokens =
    command.subcommand && command.subcommand !== "start"
      ? [command.subcommand, ...command.args]
      : command.args;
  const explicit = readFlagValue(tokens, "--goal");
  if (explicit) {
    return explicit;
  }
  const positional = tokens.find((arg) => !arg.startsWith("--"));
  if (positional) {
    return positional;
  }
  throw new Error("research goal is required");
}

export function buildResearchCampaignLoopInput(
  command: CampaignLoopCommand | null,
  defaults: {
    project_root: string;
    project_name?: string;
    actor: string;
    capability?: CampaignLoopCapability;
    max_ticks?: number;
  }
): ResearchCampaignLoopInput {
  if (!command || command.action !== "research") {
    throw new Error("research command is required");
  }
  const maxTicks = defaults.max_ticks ?? defaults.capability?.max_ticks;
  return {
    project_root: defaults.project_root,
    project_name: defaults.project_name,
    user_goal: inferGoal(command),
    domain: readFlagValue(command.args, "--domain"),
    strict_mode: command.args.includes("--strict") ? true : undefined,
    actor: defaults.actor,
    max_ticks: maxTicks,
    capability: defaults.capability
  };
}

function assertCapability(input: ResearchCampaignLoopInput): CampaignLoopCapability {
  const capability = input.capability;
  if (!capability || capability.kind !== "campaign_loop") {
    throw new Error("campaign loop capability is required");
  }
  if (capability.project_root !== input.project_root) {
    throw new Error("capability project scope mismatch");
  }
  if (capability.actor !== input.actor) {
    throw new Error("capability actor scope mismatch");
  }
  if (!capability.token) {
    throw new Error("campaign loop capability token is required");
  }
  if (!capability.confirmation_id) {
    throw new Error("campaign loop confirmation is required");
  }
  return capability;
}

function isTerminal(campaign: any): boolean {
  return campaign?.status === "terminal" || String(campaign?.current_stage ?? "").startsWith("completed_");
}

function stoppedReason(campaign: any, exhausted: boolean): ResearchCampaignLoopResult["stopped_reason"] {
  if (isTerminal(campaign)) {
    return "terminal";
  }
  if (String(campaign?.current_stage ?? "").startsWith("blocked_") || Array.isArray(campaign?.blockers) && campaign.blockers.length > 0) {
    return "blocked";
  }
  return exhausted ? "tick_budget_exhausted" : "running";
}

export async function runResearchCampaignLoop(
  client: CampaignLoopClient,
  input: ResearchCampaignLoopInput
): Promise<ResearchCampaignLoopResult> {
  const capability = assertCapability(input);
  const start = await client.post("/campaign/start", {
    project_root: input.project_root,
    project_name: input.project_name,
    user_goal: input.user_goal,
    domain: input.domain,
    strict_mode: input.strict_mode ?? true,
    actor: input.actor
  });
  let campaign = start.campaign;
  const ticks: any[] = [];
  const maxTicks = Math.min(input.max_ticks ?? capability.max_ticks, capability.max_ticks);

  for (let index = 0; index < maxTicks && !isTerminal(campaign); index += 1) {
    const tick = await client.post(`/campaign/${encodeURIComponent(campaign.campaign_id)}/tick`, {
      project_root: input.project_root,
      actor: input.actor
    });
    ticks.push(tick);
    campaign = tick.campaign;
    if (stoppedReason(campaign, false) === "blocked") {
      break;
    }
  }

  const dashboard = await aggregateDashboardSnapshot(client, {
    project_root: input.project_root,
    project_id: campaign.project_id
  });
  const exhausted = !isTerminal(campaign) && ticks.length >= maxTicks;
  return {
    campaign,
    obligation: start.obligation,
    ticks,
    dashboard,
    terminal: isTerminal(campaign),
    stopped_reason: stoppedReason(campaign, exhausted)
  };
}
