export type ResearchOperatorClient = { call(tool: string, input: unknown): Promise<{ ok: boolean; data?: unknown; code?: string; error?: string }> };
export type ResearchOperatorClientOptions = { baseUrl: string; token: string; fetch?: typeof globalThis.fetch };

const id = (value: unknown): string => typeof value === "string" && value.length > 0 && value.length <= 160 ? value : "";
const route = (tool: string, input: unknown): { method: "GET" | "POST"; path: string; body?: unknown } | undefined => {
  const value = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const campaign = id(value.campaign_id), task = id(value.task_id);
  switch (tool) {
    case "research_capabilities_get": return { method: "GET", path: "/research/v1/capabilities" };
    case "research_campaign_start": return { method: "POST", path: "/research/v1/campaigns", body: input };
    case "research_campaign_get": return campaign ? { method: "GET", path: `/research/v1/campaigns/${encodeURIComponent(campaign)}` } : undefined;
    case "research_campaign_pause": return campaign ? { method: "POST", path: `/research/v1/campaigns/${encodeURIComponent(campaign)}/pause`, body: input } : undefined;
    case "research_campaign_resume": return campaign ? { method: "POST", path: `/research/v1/campaigns/${encodeURIComponent(campaign)}/resume`, body: input } : undefined;
    case "research_campaign_cancel": return campaign ? { method: "POST", path: `/research/v1/campaigns/${encodeURIComponent(campaign)}/cancel`, body: input } : undefined;
    case "research_campaign_finish": return campaign ? { method: "POST", path: `/research/v1/campaigns/${encodeURIComponent(campaign)}/finish`, body: input } : undefined;
    case "research_task_get": return task ? { method: "GET", path: `/research/v1/tasks/${encodeURIComponent(task)}` } : undefined;
    case "research_task_cancel": return task ? { method: "POST", path: `/research/v1/tasks/${encodeURIComponent(task)}/cancel`, body: input } : undefined;
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
