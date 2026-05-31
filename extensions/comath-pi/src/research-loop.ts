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

export const goalModeTerminalStates = [
  "formal_replay_passed",
  "formal_counterexample_confirmed",
  "needs_user_statement_disambiguation",
  "blocked_with_replayable_certificate",
  "budget_exhausted_with_resume_state"
] as const;

export type GoalModeTerminalState = (typeof goalModeTerminalStates)[number];

export type GoalModePolicy = {
  mode: "goal" | "bounded";
  terminal_states: GoalModeTerminalState[];
  max_wall_clock_ms?: number;
  max_agent_runs?: number;
  max_lean_runs?: number;
  max_tokens?: number;
  require_user_confirmation_for_statement_lock: boolean;
  resume_enabled: true;
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
  mode?: "goal" | "bounded";
  paper_paths?: string[];
  attachments?: string[];
  workspace_refs?: string[];
  budget?: string;
  goal_mode_policy?: GoalModePolicy;
  actor: string;
  max_ticks?: number;
  capability?: CampaignLoopCapability;
};

export type ResearchCampaignLoopResult = {
  campaign: any;
  obligation?: any;
  ticks: any[];
  dashboard: DashboardSnapshot;
  external_v3_terminal_state?: string;
  goal_terminal_state?: GoalModeTerminalState;
  mode: "goal" | "bounded";
  next_actions: string[];
  blocker_certificate?: Record<string, unknown>;
  resume_state?: Record<string, unknown>;
  export_descriptor?: { route: string; proof_authority: "none"; can_promote_claim: false };
  terminal: boolean;
  stopped_reason: "terminal" | "tick_budget_exhausted" | "budget_exhausted_with_resume_state" | "blocked" | "running";
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

function readFlagValues(args: string[], flag: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== flag) {
      continue;
    }
    const value = args[index + 1];
    if (value && !value.startsWith("--")) {
      values.push(value);
      index += 1;
    }
  }
  return values;
}

function readNumberFlag(args: string[], flag: string): number | undefined {
  const value = readFlagValue(args, flag);
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }
  throw new Error(`${flag} must be a non-negative number`);
}

function commandTokens(command: CampaignLoopCommand): string[] {
  return command.subcommand && command.subcommand !== "start"
    ? [command.subcommand, ...command.args]
    : command.args;
}

function inferGoal(command: CampaignLoopCommand): string {
  const tokens = commandTokens(command);
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

function buildGoalModePolicy(mode: "goal" | "bounded", args: string[]): GoalModePolicy {
  const maxWallClockMs = readNumberFlag(args, "--max-wall-clock-ms");
  const maxAgentRuns = readNumberFlag(args, "--max-agent-runs");
  const maxLeanRuns = readNumberFlag(args, "--max-lean-runs");
  const maxTokens = readNumberFlag(args, "--max-tokens");
  return {
    mode,
    terminal_states: [...goalModeTerminalStates],
    ...(maxWallClockMs === undefined ? {} : { max_wall_clock_ms: maxWallClockMs }),
    ...(maxAgentRuns === undefined ? {} : { max_agent_runs: maxAgentRuns }),
    ...(maxLeanRuns === undefined ? {} : { max_lean_runs: maxLeanRuns }),
    ...(maxTokens === undefined ? {} : { max_tokens: maxTokens }),
    require_user_confirmation_for_statement_lock: true,
    resume_enabled: true
  };
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
  const tokens = commandTokens(command);
  const mode = (readFlagValue(tokens, "--mode") ?? "goal") as "goal" | "bounded";
  if (mode !== "goal" && mode !== "bounded") {
    throw new Error("research mode must be goal or bounded");
  }
  if (mode === "bounded" && !tokens.includes("--debug") && !tokens.includes("--ci")) {
    throw new Error("bounded research mode requires --debug or --ci");
  }
  const maxTicks = readNumberFlag(tokens, "--max-ticks") ?? defaults.max_ticks ?? defaults.capability?.max_ticks;
  return {
    project_root: defaults.project_root,
    project_name: defaults.project_name,
    user_goal: inferGoal(command),
    domain: readFlagValue(tokens, "--domain"),
    strict_mode: tokens.includes("--strict") ? true : undefined,
    mode,
    paper_paths: readFlagValues(tokens, "--paper"),
    attachments: readFlagValues(tokens, "--attach"),
    workspace_refs: readFlagValues(tokens, "--workspace-ref"),
    budget: readFlagValue(tokens, "--budget"),
    goal_mode_policy: buildGoalModePolicy(mode, tokens),
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

function mapGoalTerminalState(campaign: any): GoalModeTerminalState | undefined {
  const hasFormalReplayAuthorityEvidence =
    campaign?.formal_replay_authority_passed === true &&
    campaign?.formal_replay_authority_evidence?.schema_version === "comath.formal_replay_authority_evidence.v1" &&
    campaign.formal_replay_authority_evidence.proof_authority === "lean_kernel_clean_replay" &&
    campaign.formal_replay_authority_evidence.final_evidence_status === "verified_final_authority_evidence" &&
    typeof campaign.formal_replay_authority_evidence.final_replay_manifest_v3_path === "string" &&
    campaign.formal_replay_authority_evidence.final_replay_manifest_v3_path.length > 0 &&
    typeof campaign.formal_replay_authority_evidence.final_authority_packaging_path === "string" &&
    campaign.formal_replay_authority_evidence.final_authority_packaging_path.length > 0;
  if (goalModeTerminalStates.includes(campaign?.goal_mode_terminal_state)) {
    if (campaign.goal_mode_terminal_state === "formal_replay_passed" && !hasFormalReplayAuthorityEvidence) {
      return undefined;
    }
    return campaign.goal_mode_terminal_state;
  }
  const external = campaign?.external_v3_terminal_state;
  if (external === "formal_proof_verified" && hasFormalReplayAuthorityEvidence) {
    return "formal_replay_passed";
  }
  if (external === "verified_counterexample") {
    return "formal_counterexample_confirmed";
  }
  if (external === "user_visible_theorem_repair_required") {
    return "needs_user_statement_disambiguation";
  }
  if (external === "replayable_environment_blocker") {
    return "blocked_with_replayable_certificate";
  }
  const blockers = Array.isArray(campaign?.blockers) ? campaign.blockers : [];
  if (
    blockers.some(
      (blocker: any) =>
        blocker?.code === "NEEDS_FORMAL_SPEC_LOCK" ||
        blocker?.reason === "needs_formal_spec_lock" ||
        blocker?.artifact_path?.includes("formal_spec_lock_blocker")
    )
  ) {
    return "needs_user_statement_disambiguation";
  }
  if (String(campaign?.current_stage ?? "").startsWith("blocked_") || campaign?.terminal_state === "blocked_with_replayable_reason") {
    return "blocked_with_replayable_certificate";
  }
  return undefined;
}

function isTerminal(campaign: any, mode: "goal" | "bounded" = "bounded"): boolean {
  if (mode === "goal" && mapGoalTerminalState(campaign)) {
    return true;
  }
  return (
    campaign?.status === "terminal" ||
    typeof campaign?.external_v3_terminal_state === "string" ||
    String(campaign?.current_stage ?? "").startsWith("completed_")
  );
}

function stoppedReason(campaign: any, exhausted: boolean, mode: "goal" | "bounded"): ResearchCampaignLoopResult["stopped_reason"] {
  if (mode === "goal" && exhausted) {
    return "budget_exhausted_with_resume_state";
  }
  if (isTerminal(campaign, mode)) {
    return "terminal";
  }
  if (String(campaign?.current_stage ?? "").startsWith("blocked_") || Array.isArray(campaign?.blockers) && campaign.blockers.length > 0) {
    return "blocked";
  }
  return exhausted ? "tick_budget_exhausted" : "running";
}

function firstBlocker(campaign: any): Record<string, unknown> | undefined {
  return Array.isArray(campaign?.blockers) && campaign.blockers.length > 0 && typeof campaign.blockers[0] === "object"
    ? campaign.blockers[0]
    : undefined;
}

function buildResumeState(input: ResearchCampaignLoopInput, campaign: any): Record<string, unknown> | undefined {
  if (!campaign?.campaign_id) {
    return undefined;
  }
  return {
    schema_version: "comath.pi_goal_resume_state.v1",
    campaign_id: campaign.campaign_id,
    project_root: input.project_root,
    current_stage: campaign.current_stage,
    status: campaign.status,
    mode: input.mode ?? "goal",
    budget: input.budget,
    next_actions: Array.isArray(campaign.next_actions) ? campaign.next_actions : []
  };
}

export async function runResearchCampaignLoop(
  client: CampaignLoopClient,
  input: ResearchCampaignLoopInput
): Promise<ResearchCampaignLoopResult> {
  const capability = assertCapability(input);
  const mode = input.mode ?? "goal";
  const start = await client.post("/campaign/start", {
    project_root: input.project_root,
    project_name: input.project_name,
    user_goal: input.user_goal,
    domain: input.domain,
    strict_mode: input.strict_mode ?? true,
    actor: input.actor,
    mode,
    paper_paths: input.paper_paths ?? [],
    attachments: input.attachments ?? [],
    workspace_refs: input.workspace_refs ?? [],
    budget: input.budget,
    goal_mode_policy: input.goal_mode_policy ?? buildGoalModePolicy(mode, [])
  });
  let campaign = start.campaign;
  const ticks: any[] = [];
  const maxTicks = Math.min(input.max_ticks ?? capability.max_ticks, capability.max_ticks);

  for (let index = 0; index < maxTicks && !isTerminal(campaign, mode); index += 1) {
    const tick = await client.post(`/campaign/${encodeURIComponent(campaign.campaign_id)}/tick`, {
      project_root: input.project_root,
      actor: input.actor
    });
    ticks.push(tick);
    campaign = tick.campaign;
    if (stoppedReason(campaign, false, mode) === "blocked") {
      break;
    }
  }

  const dashboard = await aggregateDashboardSnapshot(client, {
    project_root: input.project_root,
    project_id: campaign.project_id
  });
  const exhausted = !isTerminal(campaign, mode) && ticks.length >= maxTicks;
  const mappedGoalTerminalState = mapGoalTerminalState(campaign);
  const goalTerminalState =
    exhausted && mode === "goal" && !mappedGoalTerminalState
      ? "budget_exhausted_with_resume_state"
      : mappedGoalTerminalState;
  const nextActions = Array.isArray(campaign?.next_actions) ? campaign.next_actions : [];
  return {
    campaign,
    obligation: start.obligation,
    ticks,
    dashboard,
    mode,
    external_v3_terminal_state:
      typeof campaign?.external_v3_terminal_state === "string" ? campaign.external_v3_terminal_state : undefined,
    goal_terminal_state: goalTerminalState,
    next_actions: nextActions,
    blocker_certificate: firstBlocker(campaign),
    resume_state: buildResumeState(input, campaign),
    export_descriptor: campaign?.campaign_id
      ? {
          route: `/campaign/${encodeURIComponent(campaign.campaign_id)}/export`,
          proof_authority: "none",
          can_promote_claim: false
        }
      : undefined,
    terminal: isTerminal(campaign, mode) || Boolean(goalTerminalState),
    stopped_reason: stoppedReason(campaign, exhausted, mode)
  };
}
