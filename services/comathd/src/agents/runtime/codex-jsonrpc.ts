import { StringDecoder } from "node:string_decoder";
import type { Readable, Writable } from "node:stream";
import { ComathError } from "../../errors.js";

export type CodexRpcMessage = { id?: number | string; method?: string; params?: unknown; result?: unknown; error?: { code: number; message: string } };
export type CodexJsonRpcOptions = { input: Writable; output: Readable; request_timeout_ms?: number; max_line_bytes?: number;
  onNotification?: (message: CodexRpcMessage) => void; onServerRequest?: (message: CodexRpcMessage) => Promise<unknown> };
export function createCodexJsonRpc(options: CodexJsonRpcOptions) {
  let sequence = 0, buffer = "", closed = false;
  const decoder = new StringDecoder("utf8");
  const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  const maxLine = options.max_line_bytes ?? 1024 * 1024;
  function write(message: CodexRpcMessage): void {
    if (closed) throw new ComathError("Codex connection is closed", { code: "CODEX_PROTOCOL_DISCONNECTED" });
    const line = JSON.stringify(message) + "\n";
    if (Buffer.byteLength(line) > maxLine || options.input.writableLength + Buffer.byteLength(line) > 4 * maxLine) throw new ComathError("Codex outgoing message exceeds transport limit", { code: "CODEX_PROTOCOL_LIMIT" });
    options.input.write(line);
  }
  function close(error = new ComathError("Codex connection closed", { code: "CODEX_PROTOCOL_DISCONNECTED" })): void {
    if (closed) return; closed = true;
    options.output.off("data", data); options.output.off("end", disconnected); options.output.off("error", disconnected); options.input.off("error", disconnected);
    for (const request of pending.values()) { clearTimeout(request.timer); request.reject(error); }
    pending.clear(); buffer = "";
  }
  function disconnected(): void { close(); }
  function dispatch(message: CodexRpcMessage): void {
    if (message.method !== undefined) {
      if (message.id !== undefined) {
        if (!options.onServerRequest) { write({ id: message.id, error: { code: -32601, message: "Unsupported server request" } }); return; }
        void options.onServerRequest(message).then(result => { if (!closed) write({ id: message.id, result }); }, () => {
          if (!closed) write({ id: message.id, error: { code: -32601, message: "Server request rejected" } });
        }).catch(() => close(new ComathError("Codex server request reply failed", { code: "CODEX_PROTOCOL_FAILED" })));
      } else options.onNotification?.(message);
      return;
    }
    if (typeof message.id !== "number") return;
    const request = pending.get(message.id); if (!request) return;
    pending.delete(message.id); clearTimeout(request.timer);
    if (message.error) request.reject(new ComathError("Codex RPC request failed", { code: `CODEX_RPC_${message.error.code}` }));
    else request.resolve(message.result);
  }
  function data(chunk: Buffer | string): void {
    if (closed) return;
    buffer += typeof chunk === "string" ? chunk : decoder.write(chunk);
    try {
      let newline: number;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1);
        if (Buffer.byteLength(line) > maxLine) throw new ComathError("Codex line exceeds limit", { code: "CODEX_PROTOCOL_LIMIT" });
        if (line.trim()) {
          const parsed: unknown = JSON.parse(line);
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid message");
          dispatch(parsed as CodexRpcMessage);
        }
      }
      if (Buffer.byteLength(buffer) > maxLine) throw new ComathError("Codex line exceeds limit", { code: "CODEX_PROTOCOL_LIMIT" });
    } catch (error) { close(error instanceof ComathError ? error : new ComathError("Invalid Codex JSONL input", { code: "CODEX_PROTOCOL_INVALID" })); }
  }
  options.output.on("data", data); options.output.once("end", disconnected); options.output.once("error", disconnected); options.input.once("error", disconnected);
  return {
    request(method: string, params: unknown, requestOptions: { timeout_ms?: number } = {}): Promise<unknown> {
      if (closed) return Promise.reject(new ComathError("Codex connection closed", { code: "CODEX_PROTOCOL_DISCONNECTED" }));
      if (pending.size >= 128) return Promise.reject(new ComathError("Too many Codex requests", { code: "CODEX_PROTOCOL_LIMIT" }));
      const id = ++sequence;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { pending.delete(id); reject(new ComathError("Codex request timed out", { code: "CODEX_PROTOCOL_TIMEOUT" })); }, requestOptions.timeout_ms ?? options.request_timeout_ms ?? 30000);
        pending.set(id, { resolve, reject, timer });
        try { write({ method, params, id }); } catch (error) { pending.delete(id); clearTimeout(timer); reject(error); }
      });
    },
    notify(method: string, params: unknown = {}): void { write({ method, params }); },
    close,
    get pendingCount(): number { return pending.size; }
  };
}
