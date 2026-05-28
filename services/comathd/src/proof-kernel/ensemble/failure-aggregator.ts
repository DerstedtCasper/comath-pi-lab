import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { assertPathAllowed } from "../../security/path-policy.js";
import type { CandidateRun, ResearchCampaign } from "../../types/schemas.js";

export type FailureAggregate = {
  aggregate_id: string;
  type: "FailureRouteAggregate";
  campaign_id: string;
  stage: CandidateRun["stage"];
  obligation_id: string;
  selected_candidate_id: string | null;
  total_candidates: number;
  total_failed_routes: number;
  failed_candidate_ids: string[];
  failure_clusters: Array<{
    cluster_id: string;
    reason: string;
    candidate_ids: string[];
    variant_ids: string[];
  }>;
  hard_vetoes: string[];
  recommendations: string[];
  proof_authority: "none";
  event_log_path: string;
  aggregate_path: string;
  created_at: string;
};

function clusterReason(candidate: CandidateRun): string {
  if (candidate.hard_vetoes.length > 0) {
    return `hard veto: ${candidate.hard_vetoes.join(", ")}`;
  }
  if (candidate.candidate_statement_hash && candidate.candidate_statement_hash !== candidate.locked_statement_hash) {
    return "statement drift from locked obligation";
  }
  if (candidate.state === "candidate_refutes_step") {
    return "candidate refutes the step";
  }
  if (candidate.state === "candidate_blocked") {
    return "candidate blocked";
  }
  return "candidate did not produce proof-grade evidence";
}

function clusterFailures(failures: CandidateRun[]): FailureAggregate["failure_clusters"] {
  const byReason = new Map<string, CandidateRun[]>();
  for (const failure of failures) {
    const reason = clusterReason(failure);
    byReason.set(reason, [...(byReason.get(reason) ?? []), failure]);
  }
  return [...byReason.entries()].map(([reason, candidates], index) => ({
    cluster_id: `FC-${String(index + 1).padStart(4, "0")}`,
    reason,
    candidate_ids: candidates.map((candidate) => candidate.candidate_id),
    variant_ids: candidates.map((candidate) => candidate.variant_id)
  }));
}

export function recordFailedRoutes(input: { projectRoot: string; campaign: ResearchCampaign; candidates: CandidateRun[] }): FailureAggregate {
  const failures = input.candidates.filter((candidate) => candidate.state !== "candidate_kernel_checked");
  const eventLogRel = join(".comath", "proof_memory", "events.jsonl").replace(/\\/g, "/");
  const path = assertPathAllowed(input.projectRoot, eventLogRel, {
    purpose: "runtime-write"
  });
  mkdirSync(dirname(path), { recursive: true });
  const selected = input.candidates.find((candidate) => candidate.state === "candidate_kernel_checked") ?? null;
  const stage = input.candidates[0]?.stage ?? "lemma_sprint";
  const obligationId = input.candidates[0]?.obligation_id ?? "PO-0001";
  const createdAt = new Date().toISOString();
  for (const failure of failures) {
    appendFileSync(
      path,
      `${JSON.stringify({
        type: "FailureRoute",
        campaign_id: input.campaign.campaign_id,
        candidate_id: failure.candidate_id,
        stage: failure.stage,
        obligation_id: failure.obligation_id,
        variant_id: failure.variant_id,
        state: failure.state,
        reason: clusterReason(failure),
        manifest_path: failure.manifest_path ?? null,
        hard_vetoes: failure.hard_vetoes,
        created_at: createdAt
      })}\n`,
      "utf8"
    );
  }
  const aggregateRel = join(
    ".comath",
    "proof_memory",
    `failure_aggregate_${input.campaign.campaign_id}_${stage}_${obligationId}.json`
  ).replace(/\\/g, "/");
  const aggregatePath = assertPathAllowed(input.projectRoot, aggregateRel, {
    purpose: "runtime-write"
  });
  const aggregate: FailureAggregate = {
    aggregate_id: `FAG-${input.campaign.campaign_id}-${stage}-${obligationId}`,
    type: "FailureRouteAggregate",
    campaign_id: input.campaign.campaign_id,
    stage,
    obligation_id: obligationId,
    selected_candidate_id: selected?.candidate_id ?? null,
    total_candidates: input.candidates.length,
    total_failed_routes: failures.length,
    failed_candidate_ids: failures.map((candidate) => candidate.candidate_id),
    failure_clusters: clusterFailures(failures),
    hard_vetoes: failures.flatMap((candidate) => candidate.hard_vetoes),
    recommendations:
      failures.length === 0
        ? []
        : [
            "preserve failed routes as proof memory before retrying",
            "split or repair the obligation if no kernel-checked candidate remains",
            "run refutation search before integrating a repaired candidate"
          ],
    proof_authority: "none",
    event_log_path: eventLogRel,
    aggregate_path: aggregateRel,
    created_at: createdAt
  };
  writeFileSync(aggregatePath, `${JSON.stringify(aggregate, null, 2)}\n`, "utf8");
  return aggregate;
}
