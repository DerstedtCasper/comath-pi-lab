export type ResearchOperatorClient = { call(tool: string, input: unknown): Promise<{ ok: boolean; data?: unknown; code?: string; error?: string }> };
export type ResearchOperatorClientOptions = { baseUrl: string; token: string; fetch?: typeof globalThis.fetch };

const id = (value: unknown): string => typeof value === "string" && value.length > 0 && value.length <= 160 ? value : "";
const route = (tool: string, input: unknown): { method: "GET" | "POST"; path: string; body?: unknown } | undefined => {
  const value = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const campaign = id(value.campaign_id), task = id(value.task_id), intake = id(value.intake_id), operation = id(value.operation_id), command = id(value.command_id);
  switch (tool) {
    case "research_capabilities_get": return { method: "GET", path: "/research/v1/capabilities" };
    case "research_campaign_list": { const page = new URLSearchParams(); if (Number.isSafeInteger(value.offset)) page.set("offset", String(value.offset)); if (Number.isSafeInteger(value.limit)) page.set("limit", String(value.limit)); if (command) page.set("command_id", command); return { method: "GET", path: `/research/v1/campaigns${page.size ? `?${page}` : ""}` }; }
    case "research_campaign_start": return { method: "POST", path: "/research/v1/campaigns", body: input };
    case "research_campaign_get": return campaign ? { method: "GET", path: `/research/v1/campaigns/${encodeURIComponent(campaign)}` } : undefined;
    case "research_frontier_get": return campaign ? { method: "GET", path: `/research/v1/campaigns/${encodeURIComponent(campaign)}/frontier` } : undefined;
    case "research_budget_get": return campaign ? { method: "GET", path: `/research/v1/campaigns/${encodeURIComponent(campaign)}/budget` } : undefined;
    case "research_events_read": return campaign ? { method: "GET", path: `/research/v1/campaigns/${encodeURIComponent(campaign)}/events?after_seq=${Number.isSafeInteger(value.after_seq) ? value.after_seq : 0}&limit=${Number.isSafeInteger(value.limit) ? value.limit : 100}` } : undefined;
    case "research_dag_patch": return campaign ? { method: "POST", path: `/research/v1/campaigns/${encodeURIComponent(campaign)}/patches`, body: input } : undefined;
    case "research_budget_update": return campaign ? { method: "POST", path: `/research/v1/campaigns/${encodeURIComponent(campaign)}/budget`, body: input } : undefined;
    case "research_campaign_pause": return campaign ? { method: "POST", path: `/research/v1/campaigns/${encodeURIComponent(campaign)}/pause`, body: input } : undefined;
    case "research_campaign_resume": return campaign ? { method: "POST", path: `/research/v1/campaigns/${encodeURIComponent(campaign)}/resume`, body: input } : undefined;
    case "research_campaign_cancel": return campaign ? { method: "POST", path: `/research/v1/campaigns/${encodeURIComponent(campaign)}/cancel`, body: input } : undefined;
    case "research_campaign_finish": return campaign ? { method: "POST", path: `/research/v1/campaigns/${encodeURIComponent(campaign)}/finish`, body: input } : undefined;
    case "research_task_get": return task ? { method: "GET", path: `/research/v1/tasks/${encodeURIComponent(task)}` } : undefined;
    case "research_task_cancel": return task ? { method: "POST", path: `/research/v1/tasks/${encodeURIComponent(task)}/cancel`, body: input } : undefined;
    case "research_task_retry": return task ? { method: "POST", path: `/research/v1/tasks/${encodeURIComponent(task)}/retry`, body: input } : undefined;
    case "research_checkpoint_get": return task ? { method: "GET", path: `/research/v1/tasks/${encodeURIComponent(task)}/checkpoint` } : undefined;
    case "research_operation_get": return operation ? { method: "GET", path: `/research/v1/operations/${encodeURIComponent(operation)}` } : undefined;
    case "research_intake_prepare": return campaign ? { method: "POST", path: `/research/v1/campaigns/${encodeURIComponent(campaign)}/intakes`, body: input } : undefined;
    case "research_intake_request_approval": return intake ? { method: "POST", path: `/research/v1/intakes/${encodeURIComponent(intake)}/approval-requests`, body: input } : undefined;
    default: return undefined;
  }
};

/** Pi receives an operator credential only; caller-controlled tool names never become arbitrary HTTP paths. */
export function createResearchOperatorClient(options: ResearchOperatorClientOptions): ResearchOperatorClient {
  const base = new URL(options.baseUrl), fetcher = options.fetch ?? globalThis.fetch;
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash || !options.token) throw new Error("Invalid CoMath research operator client configuration");
  return { async call(tool, input) {
    const selected = route(tool, input);
    if (!selected) return { ok: false, code: "RESEARCH_OPERATOR_TOOL_FORBIDDEN", error: "Tool is not available through the operator transport" };
    try {
      const response = await fetcher(new URL(selected.path, base), { method: selected.method, redirect: "error", signal: AbortSignal.timeout(60_000),
        headers: { Authorization: `Bearer ${options.token}`, ...(selected.body === undefined ? {} : { "content-type": "application/json" }) },
        ...(selected.body === undefined ? {} : { body: JSON.stringify(selected.body) }) });
      const body = await response.json() as { ok?: boolean; data?: unknown; code?: string; error?: string };
      const data = body.ok === true ? body.data : body;
      return !response.ok || body.ok === false ? { ok: false, code: body.code ?? "RESEARCH_OPERATOR_REJECTED", error: body.error } : { ok: true, data };
    } catch { return { ok: false, code: "RESEARCH_OPERATOR_UNAVAILABLE", error: "Operator service is unavailable" }; }
  } };
}
export function createDefaultResearchOperatorClient(): ResearchOperatorClient {
  const baseUrl = globalThis.process?.env?.COMATHD_BASE_URL ?? "http://127.0.0.1:8787", token = globalThis.process?.env?.COMATH_OPERATOR_TOKEN ?? "";
  return createResearchOperatorClient({ baseUrl, token });
}
