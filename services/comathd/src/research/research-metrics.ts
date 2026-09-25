import type { ProjectRuntime } from "./project-runtime.js";

export type ResearchMetric = { value: number | null; incomplete: boolean; numerator: number; denominator: number; pending?: number };
export type ResearchMetrics = {
  campaign_id: string; proof_authority: "none";
  checkpoint_resume_success_rate: ResearchMetric; duplicate_work_ratio: ResearchMetric; repeated_failed_route_ratio: ResearchMetric;
  validator_disagreement_rate: ResearchMetric; scheduler_slot_utilization: ResearchMetric; straggler_block_time: ResearchMetric;
  validated_claims_per_1m_output_tokens: ResearchMetric; time_to_first_validated_lemma: ResearchMetric; formalization_conversion_rate: ResearchMetric;
  budget_wasted_on_killed_branches: { known_output_tokens: number; unknown_reservations: number; incomplete: boolean };
  branch_survival_curve: Record<"exploration" | "deepening" | "validation" | "formalization", { entered: number; completed: number; exited: number }>;
};
export type ResearchMetricsReader = { readCampaign(campaignId: string): ResearchMetrics };
const pools = ["exploration", "deepening", "validation", "formalization"] as const;
const unavailable = (): ResearchMetric => ({ value: null, incomplete: true, numerator: 0, denominator: 0 });
function asRecord(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function parseJson(value: unknown): Record<string, unknown> { try { return asRecord(JSON.parse(String(value))); } catch { return {}; } }

/** Metrics only report persisted facts. Missing instrumentation is explicit, never a synthetic success. */
export function createResearchMetrics(runtime: ProjectRuntime): ResearchMetricsReader {
  const { store } = runtime;
  function readCampaign(campaignId: string): ResearchMetrics {
    if (!store.getCampaign(campaignId)) throw new Error("Research campaign does not exist");
    const curve = Object.fromEntries(pools.map(pool => [pool, { entered: 0, completed: 0, exited: 0 }])) as ResearchMetrics["branch_survival_curve"];
    const tasks = store.all("SELECT task_id,status,pool FROM tasks WHERE campaign_id=?", campaignId);
    for (const task of tasks) {
      const pool = String(task.pool) as keyof typeof curve;
      if (!(pool in curve)) continue;
      curve[pool].entered++;
      if (String(task.status) === "succeeded") curve[pool].completed++;
      if (["failed", "cancelled", "blocked"].includes(String(task.status))) curve[pool].exited++;
    }
    const reservationRows = store.all("SELECT r.observed_json,r.state,t.status FROM reservations r JOIN attempts a ON a.attempt_key=r.attempt_key JOIN tasks t ON t.task_id=a.task_id WHERE t.campaign_id=?", campaignId);
    let knownKilledOutput = 0, unknownKilledReservations = 0, completeUsage = true, knownOutput = 0;
    for (const row of reservationRows) {
      const observed = parseJson(row.observed_json), usage = asRecord(observed.usage), output = usage.output_tokens;
      const known = typeof output === "number" && Number.isFinite(output);
      if (!known || String(row.state) === "unreconciled") completeUsage = false;
      if (known) knownOutput += output as number;
      if (["failed", "cancelled"].includes(String(row.status))) {
        if (known) knownKilledOutput += output as number;
        else unknownKilledReservations++;
      }
    }
    const validated = Number(store.get("SELECT COUNT(*) AS count FROM candidates c JOIN tasks t ON t.task_id=c.source_task_id WHERE t.campaign_id=? AND c.validation_state='research_validated'", campaignId)?.count ?? 0);
    const validatedPerMillion: ResearchMetric = !completeUsage || knownOutput <= 0 ? { value: null, incomplete: true, numerator: validated, denominator: knownOutput }
      : { value: validated * 1_000_000 / knownOutput, incomplete: false, numerator: validated, denominator: knownOutput };
    const events = store.all("SELECT seq,task_id,generation,type,actor,payload_json,created_at FROM events WHERE campaign_id=? AND type IN ('CampaignStarted','ValidationAggregated','FormalScopeApproved','ProofObligationIntegrated','ProofCampaignFormallyCompleted') ORDER BY seq", campaignId)
      .map(row => ({ seq: Number(row.seq), task_id: row.task_id === null ? undefined : String(row.task_id), generation: row.generation === null ? undefined : Number(row.generation),
        type: String(row.type), actor: String(row.actor), payload: parseJson(row.payload_json), at: Date.parse(String(row.created_at)) }));
    const start = events.find(event => event.type === "CampaignStarted" && Number.isFinite(event.at));
    const candidateCampaigns = new Map(store.all("SELECT c.candidate_id,t.campaign_id FROM candidates c JOIN tasks t ON t.task_id=c.source_task_id WHERE t.campaign_id=?", campaignId)
      .map(row => [String(row.candidate_id), String(row.campaign_id)]));
    const validatedEvents = start ? events.filter(event => event.type === "ValidationAggregated" && event.seq > start.seq && event.payload.state === "research_validated") : [];
    const malformedValidated = validatedEvents.some(event => typeof event.payload.candidate_id !== "string" || candidateCampaigns.get(event.payload.candidate_id) !== campaignId || !Number.isFinite(event.at));
    const firstValidated = !malformedValidated && start ? validatedEvents.find(event => Number.isFinite(event.at)) : undefined;
    const timeToFirstValidated = start && firstValidated
      ? { value: firstValidated.at - start.at, incomplete: false, numerator: firstValidated.at - start.at, denominator: 1 }
      : unavailable();

    const approved = new Set<string>(), completed = new Set<string>();
    let formalizationIncomplete = false;
    for (const event of events) {
      if (event.type === "FormalScopeApproved") {
        const packages = event.payload.packages;
        if (!Array.isArray(packages)) { formalizationIncomplete = true; continue; }
        for (const value of packages) {
          const entry = asRecord(value), claimId = entry.claim_id, obligationId = entry.obligation_id;
          if (typeof claimId !== "string" || typeof obligationId !== "string" || !claimId || !obligationId) { formalizationIncomplete = true; continue; }
          const key = `${claimId}\u0000${obligationId}`;
          if (approved.has(key)) formalizationIncomplete = true;
          approved.add(key);
        }
      } else if (["ProofObligationIntegrated", "ProofCampaignFormallyCompleted"].includes(event.type) && event.actor === "service:proof-workflow") {
        const claimId = event.payload.claim_id, obligationId = event.payload.obligation_id;
        if (typeof claimId !== "string" || typeof obligationId !== "string" || !claimId || !obligationId) { formalizationIncomplete = true; continue; }
        const key = `${claimId}\u0000${obligationId}`;
        if (!approved.has(key) || completed.has(key)) formalizationIncomplete = true;
        else completed.add(key);
      }
    }
    const formalizationConversion = approved.size === 0 ? unavailable()
      : formalizationIncomplete ? { value: null, incomplete: true, numerator: completed.size, denominator: approved.size, pending: Math.max(0, approved.size - completed.size) }
      : { value: completed.size / approved.size, incomplete: false, numerator: completed.size, denominator: approved.size, pending: approved.size - completed.size };

    return { campaign_id: campaignId, proof_authority: "none", checkpoint_resume_success_rate: unavailable(), duplicate_work_ratio: unavailable(), repeated_failed_route_ratio: unavailable(),
      validator_disagreement_rate: unavailable(), scheduler_slot_utilization: unavailable(), straggler_block_time: unavailable(), validated_claims_per_1m_output_tokens: validatedPerMillion,
      time_to_first_validated_lemma: timeToFirstValidated, formalization_conversion_rate: formalizationConversion, budget_wasted_on_killed_branches: { known_output_tokens: knownKilledOutput, unknown_reservations: unknownKilledReservations, incomplete: !completeUsage || unknownKilledReservations > 0 }, branch_survival_curve: curve };
  }
  return { readCampaign };
}
