import type { CampaignTerminalState, FormalReplayAuthorityEvidence, ResearchCampaign } from "../../types/schemas.js";

export type ExternalV3TerminalState =
  | "formal_proof_verified"
  | "verified_counterexample"
  | "user_visible_theorem_repair_required"
  | "replayable_environment_blocker"
  | "user_cancelled";

export const goalModeTerminalStates = [
  "formal_replay_passed",
  "formal_counterexample_confirmed",
  "needs_user_statement_disambiguation",
  "blocked_with_replayable_certificate",
  "budget_exhausted_with_resume_state"
] as const;

export type GoalModeTerminalState = (typeof goalModeTerminalStates)[number];

export type ExternalV3TerminalProjectionInput = Pick<ResearchCampaign, "status" | "current_stage"> & {
  terminal_state?: CampaignTerminalState | null;
  gate_result?: "pass" | "fail" | "blocked" | "repair_required" | null;
  formal_replay_authority_passed?: boolean;
  formal_replay_authority_evidence?: Partial<FormalReplayAuthorityEvidence> | null;
};

export type ResearchCampaignWithExternalV3TerminalState = ResearchCampaign & {
  external_v3_terminal_state?: ExternalV3TerminalState;
  goal_mode_terminal_state?: GoalModeTerminalState;
};

export function hasFormalReplayAuthorityPassEvidence(input: {
  formal_replay_authority_passed?: boolean;
  formal_replay_authority_evidence?: Partial<FormalReplayAuthorityEvidence> | null;
}): boolean {
  const evidence = input.formal_replay_authority_evidence;
  return (
    input.formal_replay_authority_passed === true &&
    evidence?.schema_version === "comath.formal_replay_authority_evidence.v1" &&
    evidence.proof_authority === "lean_kernel_clean_replay" &&
    evidence.final_evidence_status === "verified_final_authority_evidence" &&
    typeof evidence.final_replay_manifest_v3_path === "string" &&
    evidence.final_replay_manifest_v3_path.length > 0 &&
    typeof evidence.final_authority_packaging_path === "string" &&
    evidence.final_authority_packaging_path.length > 0
  );
}

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
  if (input.terminal_state === "completed_formal_proof" && hasFormalReplayAuthorityPassEvidence(input)) {
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

export function projectGoalModeTerminalState(input: ExternalV3TerminalProjectionInput & { blockers?: Array<Record<string, unknown>> }): GoalModeTerminalState | undefined {
  const blockers = Array.isArray(input.blockers) ? input.blockers : [];
  if (
    blockers.some(
      (blocker) =>
        blocker.code === "NEEDS_FORMAL_SPEC_LOCK" ||
        blocker.reason === "needs_formal_spec_lock" ||
        (typeof blocker.artifact_path === "string" && blocker.artifact_path.includes("formal_spec_lock_blocker"))
    )
  ) {
    return "needs_user_statement_disambiguation";
  }
  const external = projectExternalV3TerminalState(input);
  if (external === "formal_proof_verified") {
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
  return undefined;
}

export function withExternalV3TerminalState(
  campaign: ResearchCampaign
): ResearchCampaignWithExternalV3TerminalState {
  const externalState = projectExternalV3TerminalState(campaign);
  const goalModeState = projectGoalModeTerminalState(campaign);
  return {
    ...campaign,
    ...(externalState ? { external_v3_terminal_state: externalState } : {}),
    ...(goalModeState ? { goal_mode_terminal_state: goalModeState } : {})
  };
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
