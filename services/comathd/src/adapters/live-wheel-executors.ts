import { createHash } from "node:crypto";
import { z } from "zod";
import { ComathError } from "../errors.js";
import { canonicalJson } from "../verification/runner-contracts.js";
import type { AdapterCapabilityMetadata, AdapterTerms, FetchedDocument, PromptInjectionScan, RetrievalResult, TheoremSearchResult } from "./external-wheel-registry.js";

type QueryWire = "query_json" | "query_text";
type ReaderWire = "reader_url_text" | "reader_url_json" | "reader_prefix_text";
export type WheelHttpConfig<W extends string = QueryWire | ReaderWire> = {
  endpoint: string;
  /** Explicit host contract: q/limit GET, url GET, or reader prefix. No official endpoint is assumed. */
  wire_format: W;
  credential_env?: string;
  timeout_ms?: number;
  max_response_bytes?: number;
  terms: AdapterTerms;
};
export type LiveWheelConfig = {
  retrieval_search?: WheelHttpConfig<QueryWire>;
  retrieval_read?: WheelHttpConfig<ReaderWire>;
  theorem_search?: WheelHttpConfig<"query_json">;
};
export type WheelExecutionContext = { signal: AbortSignal; /** Absolute host clock milliseconds. */ deadline?: number };
export type WheelQuery = { query: string; limit?: number };
export type WheelRead = { source_url: string };
export type WheelMetadata = {
  execution_mode: "live_http";
  provider: "jina_search" | "jina_reader" | "loogle";
  request_sha256: string;
  response_body_sha256: string;
  response_status: number;
  response_content_type: string | null;
  response_bytes: number;
  retrieved_at: string;
  prompt_injection_scan: PromptInjectionScan;
  secret_scan: { status: "clean"; scanner: "bounded_text_patterns_v1"; scanned_bytes: number };
};
export type WheelSearchExecution = { kind: "retrieval_results"; results: (RetrievalResult & { snippet: string })[]; metadata: WheelMetadata };
export type WheelTheoremExecution = { kind: "theorem_search_results"; results: TheoremSearchResult[]; metadata: WheelMetadata };
export type WheelReadExecution = { kind: "retrieval_document"; document: FetchedDocument; metadata: WheelMetadata };
export type WheelExecution = WheelSearchExecution | WheelTheoremExecution | WheelReadExecution;
export type LiveWheelExecutors = {
  search(input: WheelQuery, context: WheelExecutionContext): Promise<WheelSearchExecution>;
  read(input: WheelRead, context: WheelExecutionContext): Promise<WheelReadExecution>;
  query(input: WheelQuery, context: WheelExecutionContext): Promise<WheelTheoremExecution>;
};

const querySchema = z.strictObject({ query: z.string().trim().min(1).max(4096), limit: z.number().int().min(1).max(10).default(3) });
const readSchema = z.strictObject({ source_url: z.string().min(1).max(8192) });
const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const canonicalHash = (value: unknown) => hash(canonicalJson(value));
function fail(code: string): never { throw new ComathError(code, { code, statusCode: code === "WHEEL_UNAVAILABLE" ? 503 : 409 }); }
function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value); if (!parsed.success) fail("WHEEL_INPUT_INVALID"); return parsed.data;
}
function httpUrl(value: string, code: string): URL {
  let url: URL; try { url = new URL(value); } catch { fail(code); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.hash) fail(code);
  return url;
}

/** Same bounded text heuristics as the legacy repair scanner, not a proof of content safety. */
function injectionScan(text: string): PromptInjectionScan {
  const rules: [string, RegExp][] = [
    ["ignore_previous_instructions", /\bignore\s+(all\s+)?(previous|system|developer)\s+instructions?\b/iu],
    ["skip_lean_authority", /\b(skip|bypass|avoid).{0,40}\bLean\b/iu],
    ["mark_proven_without_lean", /\b(mark|declare|label).{0,40}\b(proven|proved).{0,60}\bwithout\s+Lean\b/iu],
    ["credential_exfiltration", /\b(secret|credential|token|api[_ -]?key|password)\b/iu],
    ["tool_misuse_instruction", /\b(run|execute|call)\s+(shell|powershell|cmd|tool)\b/iu]
  ];
  const findings: string[] = [];
  text.split(/\r?\n/u).forEach((line, index) => {
    for (const [code, pattern] of rules) if (pattern.test(line) && findings.length < 100) findings.push(`${code}:${index + 1}-${index + 1}`);
  });
  return { status: findings.length ? "fail" : "pass", findings };
}
/** In-memory equivalent of the service secret scanner's patterns, plus exact configured-key echoes. */
function assertNoSecrets(text: string, credential?: string): void {
  const patterns = [/\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/u, /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/u,
    /\bAKIA[0-9A-Z]{16}\b/u, /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/u,
    /\b(?:api[_-]?key|secret|token|password)\s*=\s*["']?[^"'\s]{16,}/iu];
  if ((credential && text.includes(credential)) || patterns.some(pattern => pattern.test(text))) fail("WHEEL_SECRET_BLOCKED");
}
function items(text: string): Record<string, unknown>[] {
  let parsed: unknown; try { parsed = JSON.parse(text); } catch { fail("WHEEL_RESPONSE_INVALID"); }
  let list: unknown = parsed;
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const record = parsed as Record<string, unknown>;
    list = ["results", "items", "hits", "data"].map(key => record[key]).find(Array.isArray);
  }
  if (!Array.isArray(list) || list.some(item => !item || typeof item !== "object" || Array.isArray(item))) fail("WHEEL_RESPONSE_INVALID");
  return list as Record<string, unknown>[];
}
function field(record: Record<string, unknown>, keys: string[], max = 16384): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      if (value.length > max) fail("WHEEL_RESPONSE_INVALID");
      return value.trim();
    }
  }
  return undefined;
}
function sourceUrl(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  httpUrl(value, "WHEEL_RESPONSE_INVALID"); return value;
}
function contentField(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      if (Buffer.byteLength(value, "utf8") > 2 * 1024 * 1024) fail("WHEEL_RESPONSE_INVALID");
      return value;
    }
  }
  return undefined;
}
const vetoes = ["external_adapter_result_has_no_proof_authority"];
function capability(provider: WheelMetadata["provider"], config: WheelHttpConfig): AdapterCapabilityMetadata {
  return { adapter_id: `${provider === "loogle" ? "theorem_search" : "retrieval"}:${provider}`, kind: provider === "loogle" ? "theorem_search" : "retrieval",
    capabilities: [provider === "loogle" ? "constant_search" : provider === "jina_reader" ? "url_to_markdown" : "paper_search"],
    credential_policy: { configured: true, required_credentials: config.credential_env ? [config.credential_env] : [], missing_credentials: [], exposes_secret_values: false },
    rate_limit_policy: { default_rpm: 0, burst: 0, configured: false, notes: "Provider rate limits are enforced by the service tool permit layer." } };
}
function retrievalResult(config: WheelHttpConfig, metadata: WheelMetadata, input: unknown, content: string, title: string, url: string, index = 0): RetrievalResult {
  const query_hash = canonicalHash({ provider: metadata.provider, input });
  const content_sha256 = hash(content), capability_metadata = capability(metadata.provider, config);
  return { evidence_id: `LITLIVE-${canonicalHash({ query_hash, index, content_sha256 }).slice(0, 12)}`, adapter_id: capability_metadata.adapter_id,
    provider: metadata.provider, source_kind: "html", query_hash, title, source_ref: url, source_url: url,
    retrieved_at: metadata.retrieved_at, content_sha256,
    anchors: [{ kind: "source_body", source_url: url, line_range: `1-${content.split(/\r?\n/u).length}`, content_sha256 }],
    prompt_injection_scan: injectionScan(content), capability_metadata, terms: { ...config.terms }, proof_authority: "none", can_promote_claim: false, promotion_vetoes: [...vetoes] };
}

export function createLiveWheelExecutors(configuration: LiveWheelConfig = {}, options: { env?: Record<string, string | undefined>; now?: () => number } = {}): LiveWheelExecutors {
  const configs = structuredClone(configuration), env = options.env ?? process.env, now = options.now ?? Date.now;
  function checked<T extends WheelExecution>(execution: T, config: WheelHttpConfig): T {
    // JSON decoding can reveal credentials hidden by provider Unicode escapes.
    assertNoSecrets(canonicalJson(execution), config.credential_env ? env[config.credential_env] : undefined);
    return execution;
  }
  function configured(config: WheelHttpConfig | undefined, wires: string[]): WheelHttpConfig {
    if (!config) fail("WHEEL_UNAVAILABLE");
    if (!wires.includes(config.wire_format)) fail("WHEEL_CONFIG_INVALID");
    httpUrl(config.endpoint, "WHEEL_CONFIG_INVALID");
    const timeout = config.timeout_ms ?? 10000, cap = config.max_response_bytes ?? 1024 * 1024;
    if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 120000 || !Number.isSafeInteger(cap) || cap < 1 || cap > 2 * 1024 * 1024) fail("WHEEL_CONFIG_INVALID");
    if (!config.terms || typeof config.terms.license_note !== "string" || typeof config.terms.redistribution_policy !== "string"
      || JSON.stringify(config.terms).length > 8192) fail("WHEEL_CONFIG_INVALID");
    if (config.credential_env && (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(config.credential_env) || !env[config.credential_env])) fail("WHEEL_UNAVAILABLE");
    return config;
  }
  async function request(config: WheelHttpConfig, provider: WheelMetadata["provider"], input: { query: string; limit: number } | WheelRead, context: WheelExecutionContext) {
    if (!context?.signal || typeof context.signal.addEventListener !== "function") fail("WHEEL_INPUT_INVALID");
    if (context.signal.aborted) fail("WHEEL_CANCELLED");
    if (context.deadline !== undefined && !Number.isFinite(context.deadline)) fail("WHEEL_INPUT_INVALID");
    const duration = Math.min(config.timeout_ms ?? 10000, context.deadline === undefined ? Infinity : context.deadline - now());
    if (duration <= 0) fail("WHEEL_TIMEOUT");
    const credential = config.credential_env ? env[config.credential_env] : undefined;
    const endpoint = httpUrl(config.endpoint, "WHEEL_CONFIG_INVALID");
    let url = new URL(endpoint);
    if ("query" in input) { url.searchParams.set("q", input.query); url.searchParams.set("limit", String(input.limit)); }
    else if (config.wire_format === "reader_prefix_text") {
      if (endpoint.search || !endpoint.pathname.endsWith("/")) fail("WHEEL_CONFIG_INVALID");
      url = new URL(`${endpoint.href}${input.source_url}`);
      if (url.origin !== endpoint.origin) fail("WHEEL_CONFIG_INVALID");
    } else url.searchParams.set("url", input.source_url);
    assertNoSecrets(canonicalJson(input), credential);
    assertNoSecrets(JSON.stringify(config.terms), credential);
    const headers: Record<string, string> = { accept: config.wire_format.endsWith("json") ? "application/json" : "text/plain, text/markdown" };
    if (credential) headers.authorization = `Bearer ${credential}`;
    const controller = new AbortController(); let timedOut = false;
    const cancel = () => controller.abort();
    context.signal.addEventListener("abort", cancel, { once: true });
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, duration);
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      const response = await fetch(url, { method: "GET", headers, signal: controller.signal, redirect: "error" });
      if (!response.ok) { await response.body?.cancel(); fail("WHEEL_HTTP_ERROR"); }
      const cap = config.max_response_bytes ?? 1024 * 1024;
      const declared = response.headers.get("content-length");
      if (declared && Number(declared) > cap) { await response.body?.cancel(); fail("WHEEL_RESPONSE_TOO_LARGE"); }
      if (!response.body) fail("WHEEL_RESPONSE_INVALID");
      reader = response.body.getReader(); const chunks: Buffer[] = []; let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > cap) { await reader.cancel(); fail("WHEEL_RESPONSE_TOO_LARGE"); }
        chunks.push(Buffer.from(value));
      }
      if (controller.signal.aborted) fail(timedOut ? "WHEEL_TIMEOUT" : "WHEEL_CANCELLED");
      const bytes = Buffer.concat(chunks, size); let text: string;
      try { text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes); } catch { fail("WHEEL_RESPONSE_INVALID"); }
      assertNoSecrets(text, credential);
      const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim() ?? null;
      const metadata: WheelMetadata = { execution_mode: "live_http", provider,
        request_sha256: canonicalHash({ method: "GET", url: url.href, auth_header_present: Boolean(credential) }),
        response_body_sha256: hash(bytes), response_status: response.status,
        response_content_type: contentType && /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/iu.test(contentType) ? contentType : null,
        response_bytes: size, retrieved_at: new Date(now()).toISOString(), prompt_injection_scan: injectionScan(text),
        secret_scan: { status: "clean", scanner: "bounded_text_patterns_v1", scanned_bytes: size } };
      return { text, metadata };
    } catch (error) {
      if (context.signal.aborted) fail("WHEEL_CANCELLED");
      if (timedOut) fail("WHEEL_TIMEOUT");
      if (error instanceof ComathError) throw error;
      fail("WHEEL_TRANSPORT_ERROR");
    } finally {
      clearTimeout(timer); context.signal.removeEventListener("abort", cancel); reader?.releaseLock();
    }
  }
  return {
    async search(raw, context) {
      const config = configured(configs.retrieval_search, ["query_json", "query_text"]), input = parse(querySchema, raw);
      const { text, metadata } = await request(config, "jina_search", input, context);
      if (config.wire_format === "query_text") {
        // Legacy Jina repair semantics: a raw HTTP response document, never a fabricated paper hit.
        const results = text.trim() ? [{ ...retrievalResult(config, metadata, input, text, "Jina search response document", new URL(config.endpoint).origin + new URL(config.endpoint).pathname), snippet: text }] : [];
        return checked({ kind: "retrieval_results", results, metadata }, config);
      }
      const results = items(text).slice(0, input.limit).map((item, index) => {
        const title = field(item, ["title", "name"], 2048), url = sourceUrl(field(item, ["url", "source_url"], 8192));
        const snippet = contentField(item, ["content", "description", "snippet", "text"]);
        if (!title || !url || !snippet) fail("WHEEL_RESPONSE_INVALID");
        return { ...retrievalResult(config, metadata, input, snippet, title, url, index), snippet };
      });
      return checked({ kind: "retrieval_results", results, metadata }, config);
    },
    async query(raw, context) {
      const config = configured(configs.theorem_search, ["query_json"]), input = parse(querySchema, raw);
      const { text, metadata } = await request(config, "loogle", input, context);
      const query_hash = canonicalHash({ provider: "loogle", input }), capability_metadata = capability("loogle", config);
      const results: TheoremSearchResult[] = items(text).slice(0, input.limit).map((item, index) => {
        const name = field(item, ["declaration_name", "name", "declaration", "constant", "full_name"], 2048);
        if (!name) fail("WHEEL_RESPONSE_INVALID");
        return { result_id: `TSLIVE-${canonicalHash({ query_hash, index, item }).slice(0, 12)}`, adapter_id: capability_metadata.adapter_id, provider: "loogle", query_hash,
          declaration_name: name, declaration_type: field(item, ["declaration_type", "type", "signature"]),
          module: field(item, ["module", "import", "namespace"], 2048), import_hint: field(item, ["import_hint", "import", "module"], 2048),
          source_url: sourceUrl(field(item, ["source_url", "url"], 8192)), mathlib_revision: field(item, ["mathlib_revision", "revision", "commit"], 2048),
          score: typeof item.score === "number" && Number.isFinite(item.score) ? item.score : undefined,
          retrieved_at: metadata.retrieved_at, capability_metadata, terms: { ...config.terms }, proof_authority: "none", can_promote_claim: false, promotion_vetoes: [...vetoes] };
      });
      return checked({ kind: "theorem_search_results", results, metadata }, config);
    },
    async read(raw, context) {
      const config = configured(configs.retrieval_read, ["reader_url_text", "reader_url_json", "reader_prefix_text"]), input = parse(readSchema, raw);
      httpUrl(input.source_url, "WHEEL_INPUT_INVALID");
      const { text, metadata } = await request(config, "jina_reader", input, context);
      let body = text, title = "Retrieved source document";
      if (config.wire_format === "reader_url_json") {
        let parsed: unknown; try { parsed = JSON.parse(text); } catch { fail("WHEEL_RESPONSE_INVALID"); }
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) fail("WHEEL_RESPONSE_INVALID");
        const outer = parsed as Record<string, unknown>, record = (outer.data ?? outer) as Record<string, unknown>;
        if (!record || typeof record !== "object" || Array.isArray(record) || typeof record.content !== "string") fail("WHEEL_RESPONSE_INVALID");
        body = record.content; title = field(record, ["title"], 2048) ?? title;
        const returnedUrl = sourceUrl(field(record, ["url", "source_url"], 8192));
        if (returnedUrl && returnedUrl !== input.source_url) fail("WHEEL_RESPONSE_INVALID");
      }
      if (!body.trim()) fail("WHEEL_RESPONSE_INVALID");
      return checked({ kind: "retrieval_document", document: { ...retrievalResult(config, metadata, input, body, title, input.source_url), body_text: body }, metadata }, config);
    }
  };
}

/** Preserve the old repair envelope shape while transport ownership stays in these executors. */
export function mapWheelExecutionToRepairEnvelope(execution: WheelExecution) {
  const metadata = execution.metadata;
  const requestForHash = { provider: metadata.provider, request_sha256: metadata.request_sha256 };
  return { requestForHash,
    resultPayloadSummary: { result_kind: execution.kind,
      ...(execution.kind === "retrieval_document" ? { document: execution.document } : { result_count: execution.results.length, results: execution.results }),
      live_provider: { ...metadata, network_execution_performed: true, live_provider_execution_performed: true } },
    adapterExecutionState: "live_provider_result_recorded" as const, networkExecutionPerformed: true, liveProviderExecutionPerformed: true };
}
