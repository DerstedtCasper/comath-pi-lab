import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { pathToFileURL } from "node:url";
import { z } from "zod";

export type OperatorMcpConfig = { base_url: string; token: string };
type OperatorResponse = { content: { type: "text"; text: string }[]; structuredContent?: Record<string, unknown>; isError?: true };

/**
 * MCP is a transport facade only.  It owns no campaign state and intentionally
 * never exposes host ticket/approval or worker-generation capabilities.
 */
export function createResearchOperatorMcp(config: OperatorMcpConfig): McpServer {
  const base = new URL(config.base_url);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash || !config.token) {
    throw new Error("Invalid operator MCP host configuration");
  }
  const server = new McpServer({ name: "comath-research-operator", version: "1.0.0" });
  async function call(path: string, body?: unknown): Promise<OperatorResponse> {
    try {
      const response = await fetch(new URL(path, base), { method: body === undefined ? "GET" : "POST", redirect: "error", signal: AbortSignal.timeout(60_000),
        headers: { Authorization: `Bearer ${config.token}`, ...(body === undefined ? {} : { "content-type": "application/json" }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      const text = await response.text();
      if (Buffer.byteLength(text, "utf8") > 1024 * 1024) throw new Error("Operator response too large");
      const parsed = JSON.parse(text) as { ok?: boolean; data?: unknown; code?: string; error?: string };
      const data = parsed.ok === true ? parsed.data : parsed;
      if (!response.ok || parsed.ok === false) return { isError: true, content: [{ type: "text", text: parsed.code ?? "RESEARCH_OPERATOR_REJECTED" }] };
      const structuredContent = data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : { value: data ?? null };
      return { content: [{ type: "text", text: JSON.stringify(structuredContent) }], structuredContent };
    } catch { return { isError: true, content: [{ type: "text", text: "RESEARCH_OPERATOR_UNAVAILABLE" }] }; }
  }
  const id = z.string().min(1).max(160), text = z.string().trim().min(1).max(8192);
  const campaignMutation = { command_id: id, campaign_id: id, expected_revision: z.number().int().nonnegative() };
  const charter = z.object({ goal: text, approach_hints: z.array(text).max(100).default([]), constraints: z.array(text).max(100), success_criteria: z.array(text).min(1).max(100) }).strict();
  const budget = z.object({ output_tokens: z.number().int().nonnegative(), tool_calls: z.number().int().nonnegative(), wall_ms: z.number().int().positive(),
    cost_microusd: z.number().int().nonnegative().optional(), token_enforcement: z.enum(["observed_stop", "exact_output_cap"]) }).strict();
  server.registerTool("research_capabilities_get", { description: "Read actual CoMath durable-research operator capabilities. This never starts work.", inputSchema: {}, annotations: { readOnlyHint: true } }, () => call("/research/v1/capabilities"));
  server.registerTool("research_campaign_get", { description: "Read a durable research campaign and its non-authoritative proof status.", inputSchema: { campaign_id: id }, annotations: { readOnlyHint: true } }, args => call(`/research/v1/campaigns/${encodeURIComponent(args.campaign_id)}`));
  server.registerTool("research_campaign_start", { description: "Start a bounded charter-scoped research campaign. This does not grant formal proof authority.",
    inputSchema: { command_id: id, charter, budget, max_active_workers: z.number().int().min(1).max(64), model_policy_id: id, tool_policy_id: id, role_template: id } }, args => call("/research/v1/campaigns", args));
  server.registerTool("research_campaign_pause", { description: "Checkpoint and stop active work, then pause the campaign after owned attempts terminate.",
    inputSchema: { ...campaignMutation, reason: text } }, args => call(`/research/v1/campaigns/${encodeURIComponent(args.campaign_id)}/pause`, args));
  server.registerTool("research_campaign_resume", { description: "Resume a fully paused research campaign without changing its charter or formal scope.",
    inputSchema: campaignMutation }, args => call(`/research/v1/campaigns/${encodeURIComponent(args.campaign_id)}/resume`, args));
  server.registerTool("research_campaign_cancel", { description: "Cancel all owned research work in a campaign. This does not promote or alter formal proof authority.",
    inputSchema: { ...campaignMutation, reason: text } }, args => call(`/research/v1/campaigns/${encodeURIComponent(args.campaign_id)}/cancel`, args));
  server.registerTool("research_campaign_finish", { description: "Checkpoint and stop remaining research work, then complete the research campaign without claiming a formal proof.",
    inputSchema: { ...campaignMutation, reason: text } }, args => call(`/research/v1/campaigns/${encodeURIComponent(args.campaign_id)}/finish`, args));
  return server;
}

export async function runResearchOperatorMcpFromEnvironment(): Promise<void> {
  const base_url = process.env.COMATH_OPERATOR_BASE_URL, token = process.env.COMATH_OPERATOR_TOKEN;
  if (!base_url || !token) throw new Error("COMATH_OPERATOR_BASE_URL and COMATH_OPERATOR_TOKEN are required");
  const server = createResearchOperatorMcp({ base_url, token });
  await server.connect(new StdioServerTransport());
  process.once("SIGTERM", () => { void server.close(); });
  process.once("SIGINT", () => { void server.close(); });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runResearchOperatorMcpFromEnvironment().catch(() => { process.stderr.write("Research operator MCP initialization failed\n"); process.exitCode = 1; });
}
