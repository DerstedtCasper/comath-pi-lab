import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import type { CampaignTerminalState, FormalReplayAuthorityEvidence, ResearchCampaign } from "../../types/schemas.js";
import { assertPathAllowed } from "../../security/path-policy.js";
import {
  hasFinalReplayRegistryProvenanceV3,
  hasLeanLakeBinaryHashProvenanceV3,
  verifyFinalReplayManifestV3
} from "../lean/final-replay-manifest-v3.js";

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

export type TerminalProjectionOptions = {
  projectRoot?: string;
};

export type ResearchCampaignWithExternalV3TerminalState = ResearchCampaign & {
  external_v3_terminal_state?: ExternalV3TerminalState;
  goal_mode_terminal_state?: GoalModeTerminalState;
};

const unverifiedPublicAuthorityVocabulary =
  /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|proven|verified_final_authority_evidence)\b/i;
const unverifiedPublicAuthorityVocabularyText =
  /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|proven|verified_final_authority_evidence)\b/gi;

export function sanitizePublicFormalAuthorityText(value: string): string {
  return value.replace(unverifiedPublicAuthorityVocabularyText, "unverified_formal_status");
}

export function sanitizePublicFormalAuthorityVocabulary(value: unknown): unknown {
  if (typeof value === "string") {
    return sanitizePublicFormalAuthorityText(value);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizePublicFormalAuthorityVocabulary(entry));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        unverifiedPublicAuthorityVocabulary.test(key) ? "unverified_formal_status" : key,
        sanitizePublicFormalAuthorityVocabulary(entry)
      ])
    );
  }
  return value;
}

export function hasFormalReplayAuthorityPassEvidence(input: {
  projectRoot?: string;
  formal_replay_authority_passed?: boolean;
  formal_replay_authority_evidence?: Partial<FormalReplayAuthorityEvidence> | null;
}): boolean {
  const evidence = input.formal_replay_authority_evidence;
  const envelopeOk =
    input.formal_replay_authority_passed === true &&
    evidence?.schema_version === "comath.formal_replay_authority_evidence.v1" &&
    evidence.proof_authority === "lean_kernel_clean_replay" &&
    evidence.final_evidence_status === "verified_final_authority_evidence" &&
    typeof evidence.final_replay_manifest_v3_path === "string" &&
    evidence.final_replay_manifest_v3_path.length > 0 &&
    typeof evidence.final_authority_packaging_path === "string" &&
    evidence.final_authority_packaging_path.length > 0;
  if (!envelopeOk || !input.projectRoot) {
    return false;
  }
  const finalReplayManifestPath = evidence.final_replay_manifest_v3_path as string;
  const finalAuthorityPackagingPath = evidence.final_authority_packaging_path as string;

  const finalReplayManifest = readJsonInsideProjectOrNull(input.projectRoot, finalReplayManifestPath);
  if (
    !verifyFinalReplayManifestV3(input.projectRoot, finalReplayManifest).ok ||
    !hasFinalReplayRegistryProvenanceV3(input.projectRoot, finalReplayManifest) ||
    !hasLeanLakeBinaryHashProvenanceV3(input.projectRoot, finalReplayManifest)
  ) {
    return false;
  }

  const packagingPath = readablePathInsideProject(input.projectRoot, finalAuthorityPackagingPath);
  if (!packagingPath) {
    return false;
  }
  return isSha256(evidence.artifact_hash) && sha256File(packagingPath) === evidence.artifact_hash;
}

export function projectExternalV3TerminalState(
  input: ExternalV3TerminalProjectionInput,
  options: TerminalProjectionOptions = {}
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
  if (input.terminal_state === "completed_formal_proof" && hasFormalReplayAuthorityPassEvidence({ ...input, projectRoot: options.projectRoot })) {
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

export function projectGoalModeTerminalState(
  input: ExternalV3TerminalProjectionInput & { blockers?: Array<Record<string, unknown>> },
  options: TerminalProjectionOptions = {}
): GoalModeTerminalState | undefined {
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
  const external = projectExternalV3TerminalState(input, options);
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
  campaign: ResearchCampaign,
  options: TerminalProjectionOptions = {}
): ResearchCampaignWithExternalV3TerminalState {
  const externalState = projectExternalV3TerminalState(campaign, options);
  const goalModeState = projectGoalModeTerminalState(campaign, options);
  return {
    ...campaign,
    ...(externalState ? { external_v3_terminal_state: externalState } : {}),
    ...(goalModeState ? { goal_mode_terminal_state: goalModeState } : {})
  };
}

export function withPublicExternalV3TerminalState(
  campaign: ResearchCampaign,
  options: TerminalProjectionOptions = {}
): ResearchCampaignWithExternalV3TerminalState {
  const projected = withExternalV3TerminalState(campaign, options);
  const finalReplayAuthorityPassed =
    campaign.terminal_state === "completed_formal_proof" &&
    hasFormalReplayAuthorityPassEvidence({ ...campaign, projectRoot: options.projectRoot });
  if (finalReplayAuthorityPassed) {
    return projected;
  }

  const sanitized = sanitizePublicFormalAuthorityVocabulary(projected) as ResearchCampaignWithExternalV3TerminalState;
  const publicCampaign = {
    ...sanitized,
    ...(campaign.terminal_state === "completed_formal_proof"
      ? { terminal_state: "blocked_with_replayable_reason" as const, current_stage: "blocked" as const }
      : {}),
    formal_replay_authority_passed: false
  };
  delete (publicCampaign as Partial<ResearchCampaign>).formal_replay_authority_evidence;
  return publicCampaign;
}

export function withExternalV3CampaignResult<T extends { campaign?: ResearchCampaign }>(
  result: T,
  options: TerminalProjectionOptions = {}
): Omit<T, "campaign"> & { campaign?: ResearchCampaignWithExternalV3TerminalState } {
  if (!result.campaign) {
    return result;
  }
  return {
    ...result,
    campaign: withExternalV3TerminalState(result.campaign, options)
  };
}

export function withPublicExternalV3CampaignResult<T extends { campaign?: ResearchCampaign }>(
  result: T,
  options: TerminalProjectionOptions = {}
): Omit<T, "campaign"> & { campaign?: ResearchCampaignWithExternalV3TerminalState } {
  if (!result.campaign) {
    return result;
  }
  return {
    ...result,
    campaign: withPublicExternalV3TerminalState(result.campaign, options)
  };
}

function readablePathInsideProject(projectRoot: string, relativePath: string): string | null {
  try {
    const path = assertPathAllowed(projectRoot, relativePath, { purpose: "read", resolveRealpath: true });
    return existsSync(path) ? path : null;
  } catch {
    return null;
  }
}

function readJsonInsideProjectOrNull(projectRoot: string, relativePath: string): unknown | null {
  const path = readablePathInsideProject(projectRoot, relativePath);
  if (!path) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}
