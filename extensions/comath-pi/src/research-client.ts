import { createHash } from "node:crypto";

export type ResearchOperatorEvent = { seq: number; type: string; data: unknown };
export type ResearchEventSubscription = { campaign_id: string; after_seq?: number; signal?: AbortSignal };
export type ResearchOperatorClient = {
  call(tool: string, input: unknown): Promise<{ ok: boolean; data?: unknown; code?: string; error?: string }>;
  subscribeEvents?(input: ResearchEventSubscription): AsyncIterable<ResearchOperatorEvent>;
};
export type ResearchOperatorClientOptions = { baseUrl: string; token: string; fetch?: typeof globalThis.fetch };

const id = (value: unknown): string => typeof value === "string" && value.length > 0 && value.length <= 160 ? value : "";
const maxArtifactReadBytes = 256 * 1024;
type OperatorRoute = { method: "GET" | "POST"; path: string; body?: unknown; artifact?: { artifact_id: string; offset: number; length: number } };
const natural = (value: unknown, fallback?: number): number | undefined => value === undefined ? fallback
  : typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
const contentRange = (value: string | null): { start: number; end: number; total: number } | undefined => {
  const match = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(value ?? "");
  if (!match) return undefined;
  const start = Number(match[1]), end = Number(match[2]), total = Number(match[3]);
  return Number.isSafeInteger(start) && Number.isSafeInteger(end) && Number.isSafeInteger(total) && start >= 0 && end >= start && total > end
    ? { start, end, total } : undefined;
};

async function* readResearchEvents(response: Response, afterSeq: number): AsyncGenerator<ResearchOperatorEvent> {
  const reader = response.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffered = "", eventId = "", eventType = "message", data: string[] = [];
  const finish = (): ResearchOperatorEvent | undefined => {
    const seq = Number(eventId), type = eventType, body = data.join("\n");
    eventId = ""; eventType = "message"; data = [];
    if (!Number.isSafeInteger(seq) || seq <= afterSeq || !body) return undefined;
    try { return { seq, type, data: JSON.parse(body) }; } catch { return undefined; }
  };
  const consume = (line: string): ResearchOperatorEvent | undefined => {
    if (!line) return finish();
    if (line.startsWith(":")) return undefined;
    const separator = line.indexOf(":"), field = separator === -1 ? line : line.slice(0, separator);
    const value = separator === -1 ? "" : line.slice(separator + 1).replace(/^ /, "");
    if (field === "id") eventId = value;
    else if (field === "event") eventType = value;
    else if (field === "data") data.push(value);
    return undefined;
  };
  while (true) {
    const chunk = await reader.read();
    buffered += decoder.decode(chunk.value, { stream: !chunk.done });
    let newline = buffered.indexOf("\n");
    while (newline !== -1) {
      const event = consume(buffered.slice(0, newline).replace(/\r$/, ""));
      buffered = buffered.slice(newline + 1);
      if (event) yield event;
      newline = buffered.indexOf("\n");
    }
    if (chunk.done) break;
  }
  const event = consume(buffered.replace(/\r$/, ""));
  if (event) yield event;
}
const route = (tool: string, input: unknown): OperatorRoute | undefined => {
  const value = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const campaign = id(value.campaign_id), task = id(value.task_id), intake = id(value.intake_id), operation = id(value.operation_id), command = id(value.command_id), artifact = id(value.artifact_id);
  switch (tool) {
    case "research_capabilities_get": return { method: "GET", path: "/research/v1/capabilities" };
    case "research_campaign_list": { const page = new URLSearchParams(); if (Number.isSafeInteger(value.offset)) page.set("offset", String(value.offset)); if (Number.isSafeInteger(value.limit)) page.set("limit", String(value.limit)); if (command) page.set("command_id", command); return { method: "GET", path: `/research/v1/campaigns${page.size ? `?${page}` : ""}` }; }
    case "research_campaign_start": return { method: "POST", path: "/research/v1/campaigns", body: input };
    case "research_campaign_get": return campaign ? { method: "GET", path: `/research/v1/campaigns/${encodeURIComponent(campaign)}` } : undefined;
    case "research_frontier_get": return campaign ? { method: "GET", path: `/research/v1/campaigns/${encodeURIComponent(campaign)}/frontier` } : undefined;
    case "research_budget_get": return campaign ? { method: "GET", path: `/research/v1/campaigns/${encodeURIComponent(campaign)}/budget` } : undefined;
    case "research_dashboard_get": return campaign ? { method: "GET", path: `/research/v1/campaigns/${encodeURIComponent(campaign)}/dashboard` } : undefined;
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
    case "research_validation_issue_resolve": return { method: "POST", path: "/research/v1/validation/issues/resolve", body: input };
    case "research_validation_intake_preparations_list": { const page = new URLSearchParams(); if (campaign) page.set("campaign_id", campaign); return { method: "GET", path: `/research/v1/validation/intake-preparations${page.size ? `?${page}` : ""}` }; }
    case "research_checkpoint_get": return task ? { method: "GET", path: `/research/v1/tasks/${encodeURIComponent(task)}/checkpoint` } : undefined;
    case "research_artifact_read": {
      const offset = natural(value.offset, 0), length = natural(value.length, 64 * 1024);
      return artifact && offset !== undefined && length !== undefined && length >= 1 && length <= maxArtifactReadBytes && offset <= Number.MAX_SAFE_INTEGER - length
        ? { method: "GET", path: `/research/v1/artifacts/${encodeURIComponent(artifact)}`, artifact: { artifact_id: artifact, offset, length } } : undefined;
    }
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
      const range = selected.artifact ? `bytes=${selected.artifact.offset}-${selected.artifact.offset + selected.artifact.length - 1}` : undefined;
      const response = await fetcher(new URL(selected.path, base), { method: selected.method, redirect: "error", signal: AbortSignal.timeout(60_000),
        headers: { Authorization: `Bearer ${options.token}`, ...(range ? { Range: range } : {}), ...(selected.body === undefined ? {} : { "content-type": "application/json" }) },
        ...(selected.body === undefined ? {} : { body: JSON.stringify(selected.body) }) });
      if (selected.artifact) {
        const bytes = Buffer.from(await response.arrayBuffer());
        if (!response.ok) {
          try {
            const body = JSON.parse(bytes.toString("utf8")) as { code?: string; error?: string };
            return { ok: false, code: body.code ?? "RESEARCH_OPERATOR_REJECTED", error: body.error };
          } catch { return { ok: false, code: "RESEARCH_OPERATOR_REJECTED", error: "Operator artifact read was rejected" }; }
        }
        const artifactSha256 = /^"sha256-([a-f0-9]{64})"$/.exec(response.headers.get("etag") ?? "")?.[1];
        const partial = contentRange(response.headers.get("content-range"));
        const returnedRange = partial ?? (response.status === 200 && selected.artifact.offset === 0
          ? { start: 0, end: bytes.length - 1, total: bytes.length } : undefined);
        if (!artifactSha256 || !returnedRange || bytes.length > selected.artifact.length || bytes.length > maxArtifactReadBytes
          || returnedRange.start !== selected.artifact.offset || returnedRange.end - returnedRange.start + 1 !== bytes.length) {
          return { ok: false, code: "RESEARCH_ARTIFACT_RESPONSE_INVALID", error: "Operator artifact response did not satisfy the requested bounded range" };
        }
        const bytesSha256 = createHash("sha256").update(bytes).digest("hex");
        if (response.status === 200 && bytesSha256 !== artifactSha256) {
          return { ok: false, code: "RESEARCH_ARTIFACT_HASH_MISMATCH", error: "Operator artifact response did not match its immutable digest" };
        }
        return { ok: true, data: { artifact_id: selected.artifact.artifact_id, artifact_sha256: artifactSha256, bytes_sha256: bytesSha256,
          content_type: response.headers.get("content-type") ?? "application/octet-stream", range: returnedRange, encoding: "base64", bytes_base64: bytes.toString("base64") } };
      }
      const body = await response.json() as { ok?: boolean; data?: unknown; code?: string; error?: string };
      const data = body.ok === true ? body.data : body;
      return !response.ok || body.ok === false ? { ok: false, code: body.code ?? "RESEARCH_OPERATOR_REJECTED", error: body.error } : { ok: true, data };
    } catch { return { ok: false, code: "RESEARCH_OPERATOR_UNAVAILABLE", error: "Operator service is unavailable" }; }
  }, async *subscribeEvents(input) {
    const campaign = id(input.campaign_id), initialCursor = natural(input.after_seq, 0);
    if (!campaign || initialCursor === undefined || input.signal?.aborted) return;
    let response: Response;
    try {
      response = await fetcher(new URL(`/research/v1/campaigns/${encodeURIComponent(campaign)}/events/stream`, base), {
        method: "GET", redirect: "error", signal: input.signal,
        headers: { Authorization: `Bearer ${options.token}`, Accept: "text/event-stream", "Last-Event-ID": String(initialCursor) }
      });
    } catch { return; }
    if (!response.ok) return;
    try { yield* readResearchEvents(response, initialCursor); } catch { return; }
  } };
}
export function createDefaultResearchOperatorClient(): ResearchOperatorClient {
  const baseUrl = globalThis.process?.env?.COMATHD_BASE_URL ?? "http://127.0.0.1:8787", token = globalThis.process?.env?.COMATH_OPERATOR_TOKEN ?? "";
  return createResearchOperatorClient({ baseUrl, token });
}
