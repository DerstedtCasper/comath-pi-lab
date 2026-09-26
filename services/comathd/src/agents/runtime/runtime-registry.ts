import { z } from "zod";
import { ComathError } from "../../errors.js";
import type { AgentRuntimeAdapter, RuntimeCapabilities } from "./agent-runtime-adapter.js";

const kindSchema = z.string().regex(/^[A-Za-z][A-Za-z0-9._-]{0,127}$/);
const capabilitiesSchema = z.strictObject({ durable_provider_session: z.boolean(), streaming_usage: z.boolean(), exact_output_cap: z.boolean(),
  exact_provider_request_quota: z.boolean(), tool_events: z.boolean(), steer: z.boolean(),
  isolation: z.enum(["oci", "process_boundary_only", "native_os_sandbox"]) });
const configSchema = z.strictObject({ runtime_kind: kindSchema, required_capabilities: capabilitiesSchema.partial().optional() });
export type RuntimeRegistryConfig = z.infer<typeof configSchema>;
export type RuntimeCloseError = { readonly kinds: readonly string[]; readonly error: unknown };
export type RuntimeRegistry = {
  register(kind: string, adapter: AgentRuntimeAdapter): void;
  resolve(kind: string): AgentRuntimeAdapter;
  capabilities(kind: string): RuntimeCapabilities;
  validateConfig(config: RuntimeRegistryConfig): AgentRuntimeAdapter;
  readonly closeErrors: readonly RuntimeCloseError[];
  close(): Promise<void>;
};
const methods = ["capabilities", "start", "resume", "steer", "cancel", "events", "snapshotUsage", "close"] as const;
function fail(code: string, message: string, statusCode = 400): never { throw new ComathError(message, { code, statusCode }); }
function validateKind(kind: string): string {
  const parsed = kindSchema.safeParse(kind);
  if (!parsed.success) fail("RUNTIME_REGISTRY_CONFIG_INVALID", "Runtime kind must be a bounded identifier, not a module path");
  return parsed.data;
}

/** Host-injected implementations only. A registered name conveys no execution authorization. */
export function createRuntimeRegistry(initial: ReadonlyMap<string, AgentRuntimeAdapter> = new Map()): RuntimeRegistry {
  const adapters = new Map<string, AgentRuntimeAdapter>();
  let closing: Promise<void> | undefined;
  let closeErrors: readonly RuntimeCloseError[] = [];
  function requireOpen(): void { if (closing) fail("RUNTIME_REGISTRY_CLOSED", "Runtime registry is shutting down or closed", 409); }
  function register(kind: string, adapter: AgentRuntimeAdapter): void {
    requireOpen(); const key = validateKind(kind);
    if (adapters.has(key)) fail("RUNTIME_KIND_DUPLICATE", `Runtime kind is already registered: ${key}`, 409);
    if (!adapter || typeof adapter !== "object" || methods.some(method => typeof adapter[method] !== "function")) fail("RUNTIME_ADAPTER_INVALID", "Host adapter does not implement AgentRuntimeAdapter");
    adapters.set(key, adapter);
  }
  function resolve(kind: string): AgentRuntimeAdapter {
    requireOpen(); const key = validateKind(kind), adapter = adapters.get(key);
    if (!adapter) fail("RUNTIME_NOT_REGISTERED", `No host adapter is registered for runtime kind: ${key}`, 422);
    return adapter;
  }
  function capabilities(kind: string): RuntimeCapabilities {
    const parsed = capabilitiesSchema.safeParse(resolve(kind).capabilities());
    if (!parsed.success) fail("RUNTIME_ADAPTER_INVALID", "Host adapter returned a malformed capability declaration");
    return parsed.data;
  }
  function validateConfig(config: RuntimeRegistryConfig): AgentRuntimeAdapter {
    requireOpen(); const parsed = configSchema.safeParse(config);
    if (!parsed.success) fail("RUNTIME_REGISTRY_CONFIG_INVALID", "Invalid runtime selection or required capability configuration");
    const adapter = resolve(parsed.data.runtime_kind), actual = capabilities(parsed.data.runtime_kind);
    for (const [key, expected] of Object.entries(parsed.data.required_capabilities ?? {})) {
      if (actual[key as keyof RuntimeCapabilities] !== expected) fail("RUNTIME_CAPABILITY_UNSUPPORTED", `Runtime does not declare required capability: ${key}`, 422);
    }
    return adapter;
  }
  for (const [kind, adapter] of initial) register(kind, adapter);
  return {
    register, resolve, capabilities, validateConfig,
    get closeErrors() { return closeErrors.map(entry => ({ kinds: [...entry.kinds], error: entry.error })); },
    close() {
      if (closing) return closing;
      const unique = new Map<AgentRuntimeAdapter, string[]>();
      for (const [kind, adapter] of adapters) { const aliases = unique.get(adapter) ?? []; aliases.push(kind); unique.set(adapter, aliases); }
      // Deferral makes the closed guard visible before any adapter.close callback runs.
      closing = Promise.resolve().then(async () => {
        const entries = [...unique.entries()];
        const results = await Promise.allSettled(entries.map(([adapter]) => Promise.resolve().then(() => adapter.close())));
        closeErrors = results.flatMap((result, index) => result.status === "rejected" ? [{ kinds: [...entries[index][1]], error: result.reason }] : []);
        adapters.clear();
        if (closeErrors.length) throw new AggregateError(closeErrors.map(entry => entry.error), "One or more runtime adapters failed to close");
      });
      return closing;
    }
  };
}
