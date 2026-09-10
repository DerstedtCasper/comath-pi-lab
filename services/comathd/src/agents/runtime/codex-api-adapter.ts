import { ComathError } from "../../errors.js";

export type CodexApiBackendRequest = { url: string; headers: { authorization: string; "content-type": "application/json" };
  body: { model: string; input: string; metadata: Record<string, string> }; signal?: AbortSignal };
export type CodexApiBackendResponse = { status: number; headers?: Record<string, string>; json: unknown };
export type CodexApiBackendClient = (request: CodexApiBackendRequest) => Promise<CodexApiBackendResponse>;
export type CodexApiAttemptResult = { response: CodexApiBackendResponse; attempts: number; statuses: number[]; rateLimited: boolean };
export type CodexApiExecutionOptions = { signal?: AbortSignal; timeout_ms: number; max_attempts: number };
const responseByteLimit = 2 * 1024 * 1024;

/** Fetch and body consumption share the same cancellation signal and explicit byte bound. */
export async function defaultCodexApiBackendClient(request: CodexApiBackendRequest): Promise<CodexApiBackendResponse> {
  request.signal?.throwIfAborted();
  const response = await fetch(request.url, { method: "POST", headers: request.headers, body: JSON.stringify(request.body), signal: request.signal });
  let json: unknown;
  const reader = response.body?.getReader();
  if (!reader) json = { error: { message: "Codex API returned an empty response body" } };
  else {
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      while (true) {
        request.signal?.throwIfAborted();
        const chunk = await reader.read();
        if (chunk.done) break;
        total += chunk.value.byteLength;
        if (total > responseByteLimit) {
          await reader.cancel();
          throw new ComathError("Codex API response exceeds 2 MiB", { code: "AGENT_API_RESPONSE_TOO_LARGE", statusCode: 502 });
        }
        chunks.push(chunk.value);
      }
      request.signal?.throwIfAborted();
      try { json = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
      catch { json = { error: { message: "Codex API returned non-JSON response" } }; }
    } finally { reader.releaseLock(); }
  }
  return { status: response.status, headers: Object.fromEntries(response.headers.entries()), json };
}
function retryAfterMs(headers?: Record<string, string>): number {
  const value = headers?.["retry-after"] ?? headers?.["Retry-After"];
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 2000);
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? Math.min(Math.max(timestamp - Date.now(), 0), 2000) : 0;
}
async function abortableDelay(ms: number, signal: AbortSignal): Promise<void> {
  signal.throwIfAborted();
  if (ms <= 0) return;
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => { clearTimeout(timer); signal.removeEventListener("abort", aborted); };
    const aborted = () => { cleanup(); reject(signal.reason); };
    const timer = setTimeout(() => { cleanup(); resolve(); }, ms);
    signal.addEventListener("abort", aborted, { once: true });
    if (signal.aborted) aborted();
  });
}
export async function invokeCodexApiWithRetry(client: CodexApiBackendClient, request: CodexApiBackendRequest,
  options: CodexApiExecutionOptions): Promise<CodexApiAttemptResult> {
  if (!Number.isSafeInteger(options.timeout_ms) || options.timeout_ms < 1 || options.timeout_ms > 600000
    || !Number.isSafeInteger(options.max_attempts) || options.max_attempts < 1 || options.max_attempts > 5) {
    throw new ComathError("Invalid API execution timeout or retry limit", { code: "AGENT_API_INVALID_LIMIT", statusCode: 400 });
  }
  const controller = new AbortController();
  const sources = [...new Set([options.signal, request.signal].filter((signal): signal is AbortSignal => signal !== undefined))];
  let timedOut = false;
  const cancelled = () => controller.abort(new Error("Service cancelled API execution"));
  for (const source of sources) { source.addEventListener("abort", cancelled, { once: true }); if (source.aborted) cancelled(); }
  const timer = setTimeout(() => { timedOut = true; controller.abort(new Error("API execution timeout")); }, options.timeout_ms);
  const statuses: number[] = [];
  let rateLimited = false;
  try {
    for (let attempt = 1; attempt <= options.max_attempts; attempt++) {
      controller.signal.throwIfAborted();
      // A configured client must consume this signal. The built-in transport does so
      // through fetch and every body-read; no Promise.race fabricates termination.
      const response = await client({ ...request, signal: controller.signal });
      controller.signal.throwIfAborted();
      statuses.push(response.status); rateLimited ||= response.status === 429;
      if (response.status >= 200 && response.status < 300 || attempt === options.max_attempts
        || response.status !== 429 && !(response.status >= 500 && response.status <= 599)) {
        return { response, attempts: attempt, statuses, rateLimited };
      }
      await abortableDelay(retryAfterMs(response.headers), controller.signal);
    }
    throw new Error("API retry loop ended without a response");
  } catch (cause) {
    if (controller.signal.aborted) throw new ComathError(timedOut ? "Codex API execution timed out" : "Codex API execution cancelled", { code: timedOut ? "AGENT_API_TIMEOUT" : "AGENT_API_CANCELLED", statusCode: timedOut ? 504 : 409 });
    throw cause;
  } finally { clearTimeout(timer); for (const source of sources) source.removeEventListener("abort", cancelled); }
}
