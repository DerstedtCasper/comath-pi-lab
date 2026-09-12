import { readClaims } from "../claim/claim-store.js";
import { getCampaign } from "../proof-kernel/campaign/research-campaign.js";
import type { ProjectRuntime } from "./project-runtime.js";

type JsonRecord = Record<string, unknown>;
type BudgetAmounts = Record<"output_tokens" | "tool_calls" | "wall_ms" | "cost_microusd", number | null>;
const budgetDimensions = ["output_tokens", "tool_calls", "wall_ms", "cost_microusd"] as const;

export type ResearchReadPage = { limit?: number; after_task_id?: string };
export type ResearchReadModel = { readCampaign(campaignId: string, page?: ResearchReadPage): ResearchDashboardReadModel };
export type ResearchDashboardReadModel = {
  campaign_id: string; snapshot_seq: number; proof_authority: "none";
  frontier: { items: ResearchTaskReadModel[]; next_cursor: string | null };
  budget: { charged: BudgetAmounts; reserved: BudgetAmounts; unknown: boolean; unknown_attempt_count: number; overrun: BudgetAmounts };
  validation: { current: ValidationSlotReadModel[]; history: ValidationSlotReadModel[]; open_issue_count: number };
  formalization: { active_claim: FormalClaimReadModel | null; active_obligation: { obligation_id: string; claim_id: string; status: string } | null };
};
export type ResearchTaskReadModel = {
  task_id: string; status: string; generation: number; pool: string; priority: number;
  runtime: { attempt_key: string | null; state: string | null; health: "running" | "stop_requested" | "lease_expired" | "termination_unconfirmed" | "terminated" | "not_started" };
  checkpoint: { checkpoint_id: string; seq: number; created_at: string; age_ms: number; resume_ref: { checkpoint_id: string; artifact_id: string; sha256: string } } | null;
};
export type ValidationSlotReadModel = { candidate_id: string; validation_state: string; policy_version: string; role_slot: string; current_task_id: string; prior_task_ids: string[] };
export type FormalClaimReadModel = { claim_id: string; status: string; formalization_status: string; audit_state: string };

function parsedRecord(value: unknown): JsonRecord { return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {}; }
function parsedAmounts(value: unknown): BudgetAmounts {
  const record = parsedRecord(value), out = {} as BudgetAmounts;
  for (const dimension of budgetDimensions) out[dimension] = typeof record[dimension] === "number" && Number.isFinite(record[dimension]) ? record[dimension] as number : null;
  return out;
}
function json(value: unknown): JsonRecord { try { return parsedRecord(JSON.parse(String(value))); } catch { return {}; } }
function boundedPage(input: ResearchReadPage | undefined): Required<ResearchReadPage> {
  const limit = input?.limit ?? 50;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 200) throw new Error("Dashboard page limit must be between 1 and 200");
  const after = input?.after_task_id ?? "";
  if (typeof after !== "string" || after.length > 160) throw new Error("Dashboard task cursor is invalid");
  return { limit, after_task_id: after };
}
function health(row: JsonRecord, now: number): ResearchTaskReadModel["runtime"]["health"] {
  if (!row.attempt_key) return "not_started";
  if (Number(row.termination_confirmed) === 1) return "terminated";
  if (row.stop_requested_at !== null && row.stop_requested_at !== undefined) return "stop_requested";
  const expiry = Date.parse(String(row.expires_at ?? ""));
  if (Number.isFinite(expiry) && expiry <= now) return "lease_expired";
  if (String(row.state) === "running" || String(row.state) === "leased") return "running";
  return "termination_unconfirmed";
}
function emptyAmounts(): BudgetAmounts { return { output_tokens: 0, tool_calls: 0, wall_ms: 0, cost_microusd: 0 }; }

/**
 * A bounded, read-only projection. It deliberately exposes no host paths,
 * no worker capabilities, and no proof promotion signal.
 */
export function createResearchReadModel(runtime: ProjectRuntime): ResearchReadModel {
  const { store } = runtime;
  function budget(campaignId: string): ResearchDashboardReadModel["budget"] {
    const account = store.get("SELECT admission_limit_json,charged_json,reserved_json FROM budget_accounts WHERE campaign_id=? AND pool='campaign'", campaignId);
    if (!account) return { charged: emptyAmounts(), reserved: emptyAmounts(), unknown: true, unknown_attempt_count: 0,
      overrun: { output_tokens: null, tool_calls: null, wall_ms: null, cost_microusd: null } };
    const limits = parsedAmounts(json(account.admission_limit_json)), charged = parsedAmounts(json(account.charged_json)), reserved = parsedAmounts(json(account.reserved_json));
    const overrun = {} as BudgetAmounts;
    for (const dimension of budgetDimensions) {
      const limit = limits[dimension], spent = charged[dimension], held = reserved[dimension];
      overrun[dimension] = limit === null || spent === null || held === null ? null : Math.max(0, spent + held - limit);
    }
    const unknown = store.get("SELECT COUNT(*) AS count FROM reservations r JOIN attempts a ON a.attempt_key=r.attempt_key JOIN tasks t ON t.task_id=a.task_id WHERE t.campaign_id=? AND r.state='unreconciled'", campaignId);
    const unknownAttempts = Number(unknown?.count ?? 0);
    return { charged, reserved, unknown: unknownAttempts > 0 || budgetDimensions.some(dimension => charged[dimension] === null), unknown_attempt_count: unknownAttempts, overrun };
  }
  function validation(campaignId: string): ResearchDashboardReadModel["validation"] {
    const rows = store.all("SELECT v.candidate_id,c.validation_state,v.policy_version,v.role_slot,v.current_task_id,v.prior_task_ids_json FROM validation_tasks v JOIN candidates c ON c.candidate_id=v.candidate_id JOIN tasks source ON source.task_id=c.source_task_id WHERE source.campaign_id=? ORDER BY v.candidate_id,v.policy_version,v.role_slot", campaignId);
    const slots = rows.map(row => ({ candidate_id: String(row.candidate_id), validation_state: String(row.validation_state), policy_version: String(row.policy_version), role_slot: String(row.role_slot), current_task_id: String(row.current_task_id), prior_task_ids: (() => { try { const value = JSON.parse(String(row.prior_task_ids_json)); return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : []; } catch { return []; } })() }));
    const opened = store.all("SELECT payload_json FROM events WHERE campaign_id=? AND type='ValidationIssueOpened'", campaignId).map(row => json(row.payload_json));
    const resolved = new Set(store.all("SELECT payload_json FROM events WHERE campaign_id=? AND type='ValidationIssueResolved'", campaignId).map(row => String(json(row.payload_json).issue_id ?? "")));
    return { current: slots, history: slots.filter(slot => slot.prior_task_ids.length > 0), open_issue_count: opened.filter(issue => !resolved.has(String(issue.issue_id ?? ""))).length };
  }
  function formalization(campaignId: string): ResearchDashboardReadModel["formalization"] {
    const control = store.getCampaign(campaignId), proof = getCampaign(runtime.root, campaignId);
    if (!control || !proof) return { active_claim: null, active_obligation: null };
    const claim = proof.root_claim_id ? readClaims(runtime.root, control.project_id).find(value => value.id === proof.root_claim_id) : undefined;
    const active = proof.active_obligation_id ? proof.open_obligations.find(value => value.obligation_id === proof.active_obligation_id) : undefined;
    return { active_claim: claim ? { claim_id: claim.id, status: claim.status, formalization_status: claim.formalization_status, audit_state: claim.audit_state } : null,
      active_obligation: active ? { obligation_id: active.obligation_id, claim_id: active.claim_id, status: active.status } : null };
  }
  function readCampaign(campaignId: string, input?: ResearchReadPage): ResearchDashboardReadModel {
    if (!store.getCampaign(campaignId)) throw new Error("Research campaign does not exist");
    const page = boundedPage(input), rows = store.all("SELECT t.task_id,t.status,t.generation,t.pool,t.priority,a.attempt_key,a.state AS attempt_state,a.expires_at,a.stop_requested_at,a.termination_confirmed,c.checkpoint_id,c.seq,c.created_at,c.artifact_ref FROM tasks t LEFT JOIN attempts a ON a.task_id=t.task_id AND a.generation=t.generation LEFT JOIN checkpoints c ON c.checkpoint_id=json_extract(t.task_json,'$.checkpoint_head') WHERE t.campaign_id=? AND t.task_id>? ORDER BY t.task_id LIMIT ?", campaignId, page.after_task_id, page.limit + 1);
    const hasMore = rows.length > page.limit, selected = rows.slice(0, page.limit), now = runtime.clock.now();
    const items = selected.map(row => {
      const artifact = json(row.artifact_ref), checkpoint = row.checkpoint_id === null || row.checkpoint_id === undefined ? null : { checkpoint_id: String(row.checkpoint_id), seq: Number(row.seq), created_at: String(row.created_at), age_ms: Math.max(0, now - Date.parse(String(row.created_at))), resume_ref: { checkpoint_id: String(row.checkpoint_id), artifact_id: String(artifact.artifact_id ?? ""), sha256: String(artifact.sha256 ?? "") } };
      const attempt: JsonRecord = { attempt_key: row.attempt_key, state: row.attempt_state, expires_at: row.expires_at, stop_requested_at: row.stop_requested_at, termination_confirmed: row.termination_confirmed };
      return { task_id: String(row.task_id), status: String(row.status), generation: Number(row.generation), pool: String(row.pool), priority: Number(row.priority), runtime: { attempt_key: row.attempt_key === null || row.attempt_key === undefined ? null : String(row.attempt_key), state: row.attempt_state === null || row.attempt_state === undefined ? null : String(row.attempt_state), health: health(attempt, now) }, checkpoint };
    });
    return { campaign_id: campaignId, snapshot_seq: Number(store.get("SELECT COALESCE(MAX(seq),0) AS seq FROM events WHERE campaign_id=?", campaignId)?.seq ?? 0), proof_authority: "none",
      frontier: { items, next_cursor: hasMore && items.length ? items.at(-1)!.task_id : null }, budget: budget(campaignId), validation: validation(campaignId), formalization: formalization(campaignId) };
  }
  return { readCampaign };
}
