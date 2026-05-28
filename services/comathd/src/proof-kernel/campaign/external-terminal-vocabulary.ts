import type { CampaignTerminalState, ResearchCampaign } from "../../types/schemas.js";

export type ExternalV3TerminalState =
  | "formal_proof_verified"
  | "verified_counterexample"
  | "user_visible_theorem_repair_required"
  | "replayable_environment_blocker"
  | "user_cancelled";

export type ExternalV3TerminalProjectionInput = Pick<ResearchCampaign, "status" | "current_stage"> & {
  terminal_state?: CampaignTerminalState | null;
  gate_result?: "pass" | "fail" | "blocked" | "repair_required" | null;
};

export type ResearchCampaignWithExternalV3TerminalState = ResearchCampaign & {
  external_v3_terminal_state?: ExternalV3TerminalState;
};

export function projectExternalV3TerminalState(
  input: ExternalV3TerminalProjectionInput
): ExternalV3TerminalState | undefined {
  if (input.current_stage === "cancelled" || input.terminal_state === "cancelled_by_user") {
    return "user_cancelled";
  }
  if (input.gate_result === "repair_required" || input.current_stage === "repair") {
    return "user_visible_theorem_repair_required";
  }
  if (input.status !== "terminal") {
    return undefined;
  }
  if (input.terminal_state === "completed_formal_proof") {
    return "formal_proof_verified";
  }
  if (input.terminal_state === "completed_refutation") {
    return "verified_counterexample";
  }
  if (input.terminal_state === "blocked_with_replayable_reason") {
    return "replayable_environment_blocker";
  }
  return undefined;
}

export function withExternalV3TerminalState(campaign: ResearchCampaign): ResearchCampaignWithExternalV3TerminalState {
  const externalState = projectExternalV3TerminalState(campaign);
  return externalState ? { ...campaign, external_v3_terminal_state: externalState } : { ...campaign };
}

export function withExternalV3CampaignResult<T extends { campaign?: ResearchCampaign }>(
  result: T
): Omit<T, "campaign"> & { campaign?: ResearchCampaignWithExternalV3TerminalState } {
  if (!result.campaign) {
    return result;
  }
  return {
    ...result,
    campaign: withExternalV3TerminalState(result.campaign)
  };
}
