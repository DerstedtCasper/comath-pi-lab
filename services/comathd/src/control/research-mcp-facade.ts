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
  const budgetLimits = z.object({ output_tokens: z.number().int().nonnegative(), tool_calls: z.number().int().nonnegative(), wall_ms: z.number().int().nonnegative(),
    cost_microusd: z.number().int().nonnegative().optional(), enforcement: z.literal("legacy_wall_only").optional() }).strict();
  const artifact = z.object({ artifact_id: id, sha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
  server.registerTool("research_capabilities_get", { description: "Read actual CoMath durable-research operator capabilities. This never starts work.", inputSchema: {}, annotations: { readOnlyHint: true } }, () => call("/research/v1/capabilities"));
  server.registerTool("research_campaign_get", { description: "Read a durable research campaign and its non-authoritative proof status.", inputSchema: { campaign_id: id }, annotations: { readOnlyHint: true } }, args => call(`/research/v1/campaigns/${encodeURIComponent(args.campaign_id)}`));
  server.registerTool("research_campaign_list", { description: "List durable campaigns or recover one by its operator start command ID.", inputSchema: { offset: z.number().int().nonnegative().optional(), limit: z.number().int().min(1).max(200).optional(), command_id: id.optional() }, annotations: { readOnlyHint: true } }, args => {
    const query = new URLSearchParams(); if (args.offset !== undefined) query.set("offset", String(args.offset)); if (args.limit !== undefined) query.set("limit", String(args.limit)); if (args.command_id) query.set("command_id", args.command_id); return call(`/research/v1/campaigns${query.size ? `?${query}` : ""}`);
  });
  server.registerTool("research_frontier_get", { description: "Read a bounded durable campaign frontier.", inputSchema: { campaign_id: id, after_task_id: id.optional(), limit: z.number().int().min(1).max(100).optional() }, annotations: { readOnlyHint: true } }, args => {
    const query = new URLSearchParams(); if (args.after_task_id) query.set("after_task_id", args.after_task_id); if (args.limit !== undefined) query.set("limit", String(args.limit)); return call(`/research/v1/campaigns/${encodeURIComponent(args.campaign_id)}/frontier${query.size ? `?${query}` : ""}`);
  });
  server.registerTool("research_budget_get", { description: "Read durable campaign budget, reservations, unknown dimensions, and overrun.", inputSchema: { campaign_id: id }, annotations: { readOnlyHint: true } }, args => call(`/research/v1/campaigns/${encodeURIComponent(args.campaign_id)}/budget`));
  server.registerTool("research_events_read", { description: "Read one bounded ordered durable event page; advance the cursor only after processing it.", inputSchema: { campaign_id: id, after_seq: z.number().int().nonnegative(), limit: z.number().int().min(1).max(200).default(100) }, annotations: { readOnlyHint: true } }, args => call(`/research/v1/campaigns/${encodeURIComponent(args.campaign_id)}/events?after_seq=${args.after_seq}&limit=${args.limit}`));
  server.registerTool("research_task_get", { description: "Read a task and safe attempt history without lease credentials.", inputSchema: { task_id: id }, annotations: { readOnlyHint: true } }, args => call(`/research/v1/tasks/${encodeURIComponent(args.task_id)}`));
  server.registerTool("research_checkpoint_get", { description: "Read the immutable committed checkpoint for a task.", inputSchema: { task_id: id }, annotations: { readOnlyHint: true } }, args => call(`/research/v1/tasks/${encodeURIComponent(args.task_id)}/checkpoint`));
  server.registerTool("research_operation_get", { description: "Read a sanitized durable operation state without its internal trust-commit plan.", inputSchema: { operation_id: id }, annotations: { readOnlyHint: true } }, args => call(`/research/v1/operations/${encodeURIComponent(args.operation_id)}`));
  server.registerTool("research_campaign_start", { description: "Start a bounded charter-scoped research campaign. This does not grant formal proof authority.",
    inputSchema: { command_id: id, charter, budget, max_active_workers: z.number().int().min(1).max(64), model_policy_id: id, tool_policy_id: id, role_template: id } }, args => call("/research/v1/campaigns", args));
  server.registerTool("research_dag_patch", { description: "Apply one revision-checked, bounded ResearchDAG patch. The service validates every task and dependency; this does not grant proof authority.",
    inputSchema: { command_id: id, campaign_id: id, base_revision: z.number().int().nonnegative(), create_tasks: z.array(z.unknown()).max(100),
      add_dependencies: z.array(z.unknown()).max(100), replace_dependencies: z.array(z.unknown()).max(100), reprioritize: z.array(z.unknown()).max(100),
      cancel_tasks: z.array(z.unknown()).max(100), move_pool: z.array(z.unknown()).max(100), rationale: text } }, args => call(`/research/v1/campaigns/${encodeURIComponent(args.campaign_id)}/patches`, args));
  server.registerTool("research_budget_update", { description: "Update a campaign budget at an explicit revision. The service keeps reservations, charges, unknown usage, and overruns authoritative.",
    inputSchema: { ...campaignMutation, new_limits: budgetLimits, pools: z.object({ exploration: budgetLimits, deepening: budgetLimits, validation: budgetLimits, formalization: budgetLimits }).strict().optional(),
      pool_transfers: z.array(z.object({ from: z.enum(["exploration", "deepening", "validation", "formalization"]), to: z.enum(["exploration", "deepening", "validation", "formalization"]),
        amounts: z.object({ output_tokens: z.number().int().nonnegative().optional(), tool_calls: z.number().int().nonnegative().optional(), wall_ms: z.number().int().nonnegative().optional(), cost_microusd: z.number().int().nonnegative().optional() }).strict() }).strict()).max(100).optional(), rationale: text } },
    args => call(`/research/v1/campaigns/${encodeURIComponent(args.campaign_id)}/budget`, args));
  server.registerTool("research_campaign_pause", { description: "Checkpoint and stop active work, then pause the campaign after owned attempts terminate.",
    inputSchema: { ...campaignMutation, reason: text } }, args => call(`/research/v1/campaigns/${encodeURIComponent(args.campaign_id)}/pause`, args));
  server.registerTool("research_campaign_resume", { description: "Resume a fully paused research campaign without changing its charter or formal scope.",
    inputSchema: campaignMutation }, args => call(`/research/v1/campaigns/${encodeURIComponent(args.campaign_id)}/resume`, args));
  server.registerTool("research_campaign_cancel", { description: "Cancel all owned research work in a campaign. This does not promote or alter formal proof authority.",
    inputSchema: { ...campaignMutation, reason: text } }, args => call(`/research/v1/campaigns/${encodeURIComponent(args.campaign_id)}/cancel`, args));
  server.registerTool("research_campaign_finish", { description: "Checkpoint and stop remaining research work, then complete the research campaign without claiming a formal proof.",
    inputSchema: { ...campaignMutation, reason: text } }, args => call(`/research/v1/campaigns/${encodeURIComponent(args.campaign_id)}/finish`, args));
  server.registerTool("research_task_cancel", { description: "Request a service-owned stop for one research task. It cannot promote claims or bypass owned attempt termination.",
    inputSchema: { command_id: id, task_id: id, reason: text } }, args => call(`/research/v1/tasks/${encodeURIComponent(args.task_id)}/cancel`, args));
  server.registerTool("research_task_retry", { description: "Retry an eligible task through the durable graph with explicit evidence and dependent rebinding. The previous task remains historical evidence.",
    inputSchema: { ...campaignMutation, task_id: id, new_evidence_refs: z.array(artifact).max(100), rebind_dependents: z.array(id).max(100), rationale: text } }, args => call(`/research/v1/tasks/${encodeURIComponent(args.task_id)}/retry`, args));
  server.registerTool("research_intake_prepare", { description: "Prepare a formalization package for host review. Preparation is non-authoritative and cannot approve or promote a proof.",
    inputSchema: { command_id: id, campaign_id: id, expected_revision: z.number().int().nonnegative(), root_local_id: id, result_refs: z.array(artifact).min(1).max(100), root_and_lemma_drafts: z.array(z.unknown()).min(1).max(100) } },
    args => call(`/research/v1/campaigns/${encodeURIComponent(args.campaign_id)}/intakes`, args));
  server.registerTool("research_intake_request_approval", { description: "Ask the host confirmation channel to review one prepared formalization package. This tool cannot issue tickets or approve it.",
    inputSchema: { command_id: id, intake_id: id, expected_revision: z.number().int().nonnegative(), prepared_sha256: z.string().regex(/^[a-f0-9]{64}$/) } }, args => call(`/research/v1/intakes/${encodeURIComponent(args.intake_id)}/approval-requests`, args));
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
