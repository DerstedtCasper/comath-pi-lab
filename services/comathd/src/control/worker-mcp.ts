import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { researchCheckpointSchema } from "../research/checkpoint-store.js";
import { workerResultSubmissionSchema } from "../research/research-result-service.js";

export type WorkerMcpConfig = { gateway_url: string; token: string; task_id: string; generation: number };
export function createWorkerMcp(config: WorkerMcpConfig): McpServer {
  const gateway = new URL(config.gateway_url);
  if (!["http:", "https:"].includes(gateway.protocol) || gateway.username || gateway.password || gateway.search || gateway.hash
    || !config.token || !config.task_id || !Number.isSafeInteger(config.generation) || config.generation < 1) throw new Error("Invalid worker MCP host configuration");
  const server = new McpServer({ name: "comath-worker", version: "1.0.0" });
  const command = { command_id: z.string().min(1).max(160) };
  const identity = { task_id: config.task_id, generation: config.generation };
  async function call(path: string, body?: unknown) {
    try {
      const response = await fetch(new URL(path, gateway), { method: body === undefined ? "GET" : "POST",
        headers: { Authorization: `Bearer ${config.token}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(60000), redirect: "error" });
      const bytes: Uint8Array[] = []; let size = 0;
      if (!response.body) throw new Error("Empty gateway body");
      for await (const chunk of response.body) { size += chunk.length; if (size > 1024 * 1024) throw new Error("Gateway response too large"); bytes.push(chunk); }
      const result = JSON.parse(Buffer.concat(bytes).toString("utf8")) as { ok?: boolean; data?: unknown; code?: string };
      if (!response.ok || result.ok !== true) return { isError: true as const, content: [{ type: "text" as const, text: result.code ?? "WORKER_GATEWAY_REJECTED" }] };
      const structuredContent = result.data && typeof result.data === "object" && !Array.isArray(result.data) ? result.data as Record<string, unknown> : { value: result.data ?? null };
      return { content: [{ type: "text" as const, text: JSON.stringify(structuredContent) }], structuredContent };
    } catch {
      return { isError: true as const, content: [{ type: "text" as const, text: "WORKER_GATEWAY_UNAVAILABLE" }] };
    }
  }
  server.registerTool("research_worker_checkpoint", { description: "Commit a complete, non-authoritative research checkpoint for this generation.",
    inputSchema: { ...command, checkpoint: researchCheckpointSchema } }, args => call("/worker/v1/checkpoints", { ...args, ...identity }));
  server.registerTool("research_worker_context", { description: "Read only the context selected by the service for this task.", inputSchema: {}, annotations: { readOnlyHint: true } }, () => call("/worker/v1/context"));
  server.registerTool("research_worker_artifact_read", { description: "Read an artifact permitted by this task's visibility policy.", inputSchema: { artifact_id: z.string().min(1).max(160) }, annotations: { readOnlyHint: true } },
    args => call(`/worker/v1/artifacts/${encodeURIComponent(args.artifact_id)}`));
  server.registerTool("research_worker_artifact_put", { description: "Submit artifact bytes for scanning and immutable storage; host paths are never accepted.",
    inputSchema: { ...command, content_base64: z.string().max(900000), kind: z.literal("other").default("other") } }, args => call("/worker/v1/artifacts", { ...args, ...identity }));
  server.registerTool("research_worker_result", { description: "Submit research material or a formal candidate to the service's validating consumer. A breakthrough publishes a candidate while this task continues; submit a separate final progress/failure/statement_draft result when finished. Acceptance is not proof authority.",
    inputSchema: { ...command, submission: workerResultSubmissionSchema } }, args => call("/worker/v1/results", { ...args, ...identity }));
  server.registerTool("research_worker_failure", { description: "Submit a structured failed route; infrastructure errors are separate from mathematical failure.", inputSchema: { ...command, payload: z.record(z.string(), z.json()) } },
    args => call("/worker/v1/failures", { ...args, ...identity }));
  server.registerTool("research_worker_propose", { description: "Propose changes to the research graph for service/supervisor review; this does not apply a graph mutation.", inputSchema: { ...command, payload: z.record(z.string(), z.json()) } },
    args => call("/worker/v1/proposals", { ...args, ...identity }));
  server.registerTool("research_worker_tool", { description: "Call a configured service tool under this generation's resource and visibility policy.", inputSchema: { ...command, tool_id: z.string().regex(/^[A-Za-z0-9_.-]{1,160}$/), payload: z.record(z.string(), z.json()) } },
    args => call(`/worker/v1/tools/${encodeURIComponent(args.tool_id)}`, { command_id: args.command_id, payload: args.payload, ...identity }));
  return server;
}
export async function runWorkerMcpFromEnvironment(): Promise<void> {
  const server = createWorkerMcp({ gateway_url: process.env.COMATH_WORKER_GATEWAY_URL ?? "", token: process.env.COMATH_WORKER_TOKEN ?? "",
    task_id: process.env.COMATH_TASK_ID ?? "", generation: Number(process.env.COMATH_GENERATION) });
  await server.connect(new StdioServerTransport());
  process.once("SIGTERM", () => { void server.close(); });
  process.once("SIGINT", () => { void server.close(); });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runWorkerMcpFromEnvironment().catch(() => { process.stderr.write("Worker MCP initialization failed\n"); process.exitCode = 1; });
}
