import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { assertPathAllowed } from "../../security/path-policy.js";
import type { CandidateRun, ResearchCampaign } from "../../types/schemas.js";

export function recordFailedRoutes(input: { projectRoot: string; campaign: ResearchCampaign; candidates: CandidateRun[] }): void {
  const failures = input.candidates.filter((candidate) => candidate.state !== "candidate_kernel_checked");
  const path = assertPathAllowed(input.projectRoot, join(".comath", "proof_memory", "events.jsonl"), {
    purpose: "runtime-write"
  });
  mkdirSync(dirname(path), { recursive: true });
  for (const failure of failures) {
    appendFileSync(
      path,
      `${JSON.stringify({
        type: "FailureRoute",
        campaign_id: input.campaign.campaign_id,
        candidate_id: failure.candidate_id,
        stage: failure.stage,
        obligation_id: failure.obligation_id,
        reason: "candidate did not produce proof-grade evidence",
        created_at: new Date().toISOString()
      })}\n`,
      "utf8"
    );
  }
}
