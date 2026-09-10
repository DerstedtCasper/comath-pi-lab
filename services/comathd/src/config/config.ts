import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { z } from "zod";
import { assertPathAllowed } from "../security/path-policy.js";
import { runtimeLayout } from "../project/runtime-layout.js";
import { taskBudgetSchema } from "../research/research-schemas.js";

export type ComathConfig = {
  version: number;
  allowShell: false;
  research?: ResearchConfig;
};
const envName = z.string().regex(/^[A-Za-z_][A-Za-z0-9_]{0,127}$/);
const boundedMs = z.number().int().min(1).max(86400000);
const wheelTerms = z.strictObject({ license_note: z.string().min(1), terms_url: z.url().optional(), redistribution_policy: z.string().min(1) });
const wheelHttp = z.strictObject({ endpoint: z.url(), wire_format: z.enum(["query_json", "query_text"]), credential_env: envName.optional(),
  timeout_ms: z.number().int().min(1).max(120000).optional(), max_response_bytes: z.number().int().min(1).max(2 * 1024 * 1024).optional(), terms: wheelTerms });
export const researchConfigSchema = z.strictObject({
  enabled: z.boolean().default(false), max_active_workers: z.number().int().min(1).max(64).default(4),
  supervisor: z.strictObject({ model_policy_id: z.string().min(1).max(160), tool_policy_id: z.string().min(1).max(160),
    role_template: z.string().min(1).max(160), budget: taskBudgetSchema.refine(value => value.token_enforcement !== "wall_only_legacy", "Supervisor requires an explicit research budget") }).optional(),
  provider_policies: z.record(z.string(), z.strictObject({ launch_rpm: z.number().int().min(1).max(4).default(4), max_sessions: z.number().int().min(1).max(64).default(4) })).default({}),
  model_policies: z.record(z.string(), z.strictObject({ provider_id: z.string().min(1), runtime_id: z.string().min(1), model: z.string().min(1), initial_context_bytes: z.number().int().min(1024).max(16 * 1024 * 1024), max_sessions: z.number().int().min(1).max(64).optional() })).default({}),
  tool_policies: z.record(z.string(), z.strictObject({ allowed_tools: z.array(z.string().min(1)).max(100), visibility: z.enum(["task", "blind"]).default("task") })).default({}),
  runtimes: z.record(z.string(), z.strictObject({ kind: z.string().regex(/^[a-z][a-z0-9._-]{0,63}$/), binary: z.string().refine(isAbsolute).optional(),
    model_provider: z.string().default("comath"), provider_endpoint: z.url().optional(), provider_secret_env: envName.optional(),
    sandbox_mode: z.enum(["deferred", "native"]).default("deferred") })).default({}),
  heartbeat_ms: boundedMs.default(30000), lease_ttl_ms: boundedMs.default(120000), max_fault_retries: z.number().int().min(0).max(10).default(3),
  checkpoint: z.strictObject({ first_tool_calls: z.number().int().min(1).max(100).default(10), periodic_tool_calls: z.number().int().min(1).max(1000).default(15),
    output_tokens: z.number().int().positive().default(12000), interval_ms: boundedMs.default(1200000), grace_ms: boundedMs.default(30000) }).prefault({}),
  stop_grace_ms: boundedMs.default(10000), sqlite_busy_timeout_ms: z.number().int().min(0).max(60000).default(1000),
  operator_host: z.enum(["127.0.0.1", "::1", "localhost"]).default("127.0.0.1"), operator_port: z.number().int().min(0).max(65535).default(8787),
  worker_gateway_host: z.string().default("127.0.0.1"), worker_gateway_port: z.number().int().min(0).max(65535).default(8788),
  operator_token_env: envName.optional(), host_approval_token_env: envName.optional(),
  live_tools: z.strictObject({ retrieval_search: wheelHttp.optional(), theorem_search: wheelHttp.extend({ wire_format: z.literal("query_json") }).optional(),
    retrieval_read: wheelHttp.extend({ wire_format: z.enum(["reader_url_text", "reader_url_json", "reader_prefix_text"]) }).optional(),
    sympy: z.strictObject({ python: z.string().refine(isAbsolute), python_sha256: z.string().regex(/^[a-f0-9]{64}$/),
      script: z.string().refine(isAbsolute), script_sha256: z.string().regex(/^[a-f0-9]{64}$/) }).optional() }).prefault({}),
  tool_limits: z.strictObject({ lean: z.number().int().min(1).max(64).default(1), cas: z.number().int().min(1).max(64).default(2), retrieval: z.number().int().min(1).max(64).default(4) }).prefault({})
}).superRefine((config, ctx) => {
  if (config.supervisor && (!config.enabled || !config.model_policies[config.supervisor.model_policy_id] || !config.tool_policies[config.supervisor.tool_policy_id])) {
    ctx.addIssue({ code: "custom", message: "Supervisor requires research.enabled and existing host model/tool policies" });
  }
  if (config.supervisor && config.tool_policies[config.supervisor.tool_policy_id]?.visibility === "blind") ctx.addIssue({ code: "custom", message: "Supervisor needs the complete frontier and cannot use a blind tool policy" });
  if (config.lease_ttl_ms < 3 * config.heartbeat_ms) ctx.addIssue({ code: "custom", message: "Lease TTL must be at least three heartbeats" });
  for (const [id, policy] of Object.entries(config.model_policies)) if (!config.provider_policies[policy.provider_id] || !config.runtimes[policy.runtime_id]) ctx.addIssue({ code: "custom", message: `Model policy ${id} has an unknown provider/runtime` });
  for (const policy of Object.values(config.provider_policies)) if (policy.max_sessions > config.max_active_workers) ctx.addIssue({ code: "custom", message: "Provider session cap exceeds deployment cap" });
  if (config.operator_port !== 0 && config.worker_gateway_port === config.operator_port) ctx.addIssue({ code: "custom", message: "Worker and operator listeners must use distinct ports" });
  if (config.host_approval_token_env && config.host_approval_token_env === config.operator_token_env) ctx.addIssue({ code: "custom", message: "Host approval credential must be separate from operator credential" });
});
export type ResearchConfig = z.infer<typeof researchConfigSchema>;

export function loadConfig(projectRoot: string, options: { config_path?: string } = {}): ComathConfig {
  if (options.config_path && !isAbsolute(options.config_path)) throw new Error("Host config path must be absolute");
  const configPath = options.config_path ?? assertPathAllowed(projectRoot, join(runtimeLayout.root, runtimeLayout.configFile), {
    purpose: "read"
  });

  if (!existsSync(configPath)) {
    if (options.config_path) throw new Error("Host config file does not exist");
    return { version: 1, allowShell: false };
  }

  const parsed = JSON.parse(readFileSync(configPath, "utf8")) as Partial<ComathConfig>;
  return {
    version: typeof parsed.version === "number" ? parsed.version : 1,
    allowShell: false,
    ...(parsed.research === undefined ? {} : { research: researchConfigSchema.parse(parsed.research) })
  };
}
