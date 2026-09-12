import type { ProjectRuntime } from "./project-runtime.js";

export type ResearchMetric = { value: number | null; incomplete: boolean; numerator: number; denominator: number };
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
    return { campaign_id: campaignId, proof_authority: "none", checkpoint_resume_success_rate: unavailable(), duplicate_work_ratio: unavailable(), repeated_failed_route_ratio: unavailable(),
      validator_disagreement_rate: unavailable(), scheduler_slot_utilization: unavailable(), straggler_block_time: unavailable(), validated_claims_per_1m_output_tokens: validatedPerMillion,
      time_to_first_validated_lemma: unavailable(), formalization_conversion_rate: unavailable(), budget_wasted_on_killed_branches: { known_output_tokens: knownKilledOutput, unknown_reservations: unknownKilledReservations, incomplete: !completeUsage || unknownKilledReservations > 0 }, branch_survival_curve: curve };
  }
  return { readCampaign };
}
