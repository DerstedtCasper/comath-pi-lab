import type { ResearchOperatorClient } from "./research-client.js";

export type PiOperatorRequest = { version: 1; request_id: string; tool: string; input: unknown };
export type PiOperatorResult = { version: 1; request_id: string; tool: string; result: { ok: true; data: unknown } | { ok: false; code: string; error: string } };
const allowed = new Set(["research_capabilities_get", "research_campaign_list", "research_campaign_start", "research_campaign_get", "research_frontier_get", "research_budget_get", "research_dashboard_get", "research_events_read", "research_dag_patch", "research_budget_update", "research_campaign_pause", "research_campaign_resume", "research_campaign_cancel", "research_campaign_finish", "research_task_get", "research_task_cancel", "research_task_retry", "research_validation_issue_resolve", "research_validation_intake_preparations_list", "research_checkpoint_get", "research_operation_get", "research_intake_prepare", "research_intake_request_approval"]);

export async function dispatchResearchOperatorRequest(client: ResearchOperatorClient, raw: unknown): Promise<PiOperatorResult> {
  const value = raw && typeof raw === "object" ? raw as Partial<PiOperatorRequest> : {};
  if (value.version !== 1 || typeof value.request_id !== "string" || !value.request_id || typeof value.tool !== "string" || !value.tool) {
    return { version: 1, request_id: typeof value.request_id === "string" ? value.request_id : "invalid", tool: typeof value.tool === "string" ? value.tool : "invalid", result: { ok: false, code: "RESEARCH_OPERATOR_REQUEST_INVALID", error: "Operator request must contain version, request_id, tool and input" } };
  }
  if (!allowed.has(value.tool)) return { version: 1, request_id: value.request_id, tool: value.tool, result: { ok: false, code: "RESEARCH_OPERATOR_TOOL_FORBIDDEN", error: "Tool is not available through the operator transport" } };
  const response = await client.call(value.tool, value.input);
  return response.ok ? { version: 1, request_id: value.request_id, tool: value.tool, result: { ok: true, data: response.data ?? null } }
    : { version: 1, request_id: value.request_id, tool: value.tool, result: { ok: false, code: response.code ?? "RESEARCH_OPERATOR_REJECTED", error: response.error ?? "Operator request failed" } };
}
