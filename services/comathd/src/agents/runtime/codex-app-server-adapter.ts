import type { Readable, Writable } from "node:stream";
import { ComathError } from "../../errors.js";
import type { Usage } from "../../research/research-schemas.js";
import type { AgentRuntimeAdapter, StartWorkerInput, WorkerHandle, UsageSnapshot } from "./agent-runtime-adapter.js";
import { createCodexJsonRpc, type CodexRpcMessage } from "./codex-jsonrpc.js";
import type { WorkerEvent } from "./worker-event.js";

export type CodexOwnedTransport = { stdin: Writable; stdout: Readable; owned_handle_id: string; terminate: () => Promise<boolean>; workspace_path?: string };
export type CodexAppServerOptions = {
  model: string; model_provider: string;
  resolvePolicy?: (input: StartWorkerInput) => { model: string; model_provider: string };
  /** Service-owned launcher enforces the configured sandbox readiness and supplies scoped MCP/environment. */
  launch: (input: StartWorkerInput) => Promise<CodexOwnedTransport>;
  buildPrompt: (input: StartWorkerInput) => Promise<string>;
  isolation?: "oci" | "process_boundary_only";
};
type Session = { handle: WorkerHandle; transport: CodexOwnedTransport; rpc: ReturnType<typeof createCodexJsonRpc>;
  started: number; sequence: number; events: WorkerEvent[]; waiter?: () => void; ended: boolean; usage: UsageSnapshot | null;
  tools: Set<string>; abort: () => void; signal: AbortSignal; stopping?: Promise<void>; turnStarted?: boolean; providerCompleted?: boolean; overflow?: boolean };
type WithoutMeta<T> = T extends WorkerEvent ? Omit<T, "attempt_key" | "source_key" | "source_seq" | "observed_at"> : never;
type EventValue = WithoutMeta<WorkerEvent>;
function count(value: unknown): number | null { return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null; }

/** Stateful JSONL protocol consumer. A supplied owned transport is required; no global Codex settings are changed. */
export function createCodexAppServerAdapter(options: CodexAppServerOptions): AgentRuntimeAdapter {
  const sessions = new Map<string, Session>();
  let closing = false;
  function requireSession(handle: WorkerHandle): Session {
    const session = sessions.get(handle.attempt_key);
    if (!session || session.handle.owned_handle_id !== handle.owned_handle_id) throw new ComathError("Unknown Codex worker handle", { code: "CODEX_HANDLE_UNKNOWN" });
    return session;
  }
  function emit(session: Session, value: EventValue): void {
    if (session.ended) return;
    if (!session.overflow && session.events.length >= 512) {
      session.overflow = true;
      session.rpc.close(new ComathError("Worker event consumer exceeded buffer", { code: "CODEX_EVENT_BACKPRESSURE" }));
      emit(session, { type: "provider_error", code: "CODEX_EVENT_BACKPRESSURE", retryable: false });
      void stop(session).catch(() => { /* stop records failure and retains owned state for retry. */ });
      return;
    }
    if (session.overflow) {
      // Reserve two control entries without discarding already queued accounting events.
      if (value.type !== "provider_error" && value.type !== "termination_confirmed") return;
      if (value.type === "provider_error" && session.events.some(event => event.type === "provider_error" && event.code === value.code)) return;
      if (session.events.length >= 514) {
        if (value.type !== "termination_confirmed") return;
        const replace = session.events.findIndex(event => event.type === "provider_error" && event.code === "TERMINATION_UNCONFIRMED");
        if (replace < 0) return;
        session.events.splice(replace, 1);
      }
    }
    session.events.push({ ...value, attempt_key: session.handle.attempt_key, source_key: `codex:${session.handle.owned_handle_id}`,
      source_seq: ++session.sequence, observed_at: new Date().toISOString() } as WorkerEvent);
    session.waiter?.(); session.waiter = undefined;
  }
  function receive(session: Session, message: CodexRpcMessage): void {
    const params = message.params as Record<string, any> | undefined;
    if (!params) return;
    if (params.threadId && session.handle.provider_session?.thread_id && params.threadId !== session.handle.provider_session.thread_id) return;
    if (message.method === "thread/tokenUsage/updated") {
      const total = params.tokenUsage?.total;
      if (!total) return;
      const usage: Usage = { input_tokens: count(total.inputTokens), cached_input_tokens: count(total.cachedInputTokens),
        output_tokens: count(total.outputTokens), reasoning_output_tokens: count(total.reasoningOutputTokens),
        tool_calls: session.tools.size, wall_ms: Date.now() - session.started, cost_microusd: null };
      session.usage = { attempt_key: session.handle.attempt_key, source_key: `codex:${session.handle.owned_handle_id}`,
        thread_id: String(params.threadId), total: usage, observed_at: new Date().toISOString() };
      emit(session, { type: "usage_snapshot", usage, thread_id: String(params.threadId) });
    } else if (message.method === "item/started" && ["mcpToolCall", "commandExecution", "fileChange", "webSearch"].includes(params.item?.type)) {
      const item = params.item;
      if (typeof item.id !== "string" || session.tools.has(item.id)) return;
      session.tools.add(item.id); emit(session, { type: "tool_started", tool_id: String(item.tool ?? item.type), correlation_id: item.id });
    } else if (message.method === "item/completed" && session.tools.has(params.item?.id)) {
      emit(session, { type: "tool_completed", tool_id: String(params.item.tool ?? params.item.type), correlation_id: params.item.id,
        status: params.item.status === "failed" ? "failed" : "succeeded" });
    } else if (message.method === "turn/completed") {
      emit(session, { type: "completed", status: params.turn?.status === "completed" ? "succeeded" : params.turn?.status === "interrupted" ? "cancelled" : "failed", exit_code: null });
      // A completed turn still needs independently confirmed owned-process termination.
      session.providerCompleted = true;
      if (session.turnStarted) void stop(session).catch(() => emit(session, { type: "provider_error", code: "TERMINATION_UNCONFIRMED", retryable: true }));
    } else if (message.method === "error") {
      emit(session, { type: "provider_error", code: String(params.error?.codexErrorInfo ?? "PROVIDER_ERROR"), retryable: params.willRetry === true });
    }
  }
  async function stop(session: Session): Promise<void> {
    if (session.ended) return;
    if (session.stopping) return session.stopping;
    session.stopping = Promise.resolve().then(async () => {
      const provider = session.handle.provider_session;
      if (provider?.turn_id && !session.providerCompleted) {
        try { await session.rpc.request("turn/interrupt", { threadId: provider.thread_id, turnId: provider.turn_id }, { timeout_ms: 1000 }); }
        catch { /* The owned process still must terminate even if interrupt has no response. */ }
      }
      try {
        const confirmed = await session.transport.terminate();
        if (confirmed) emit(session, { type: "termination_confirmed", owned_handle_ref: session.handle.owned_handle_id });
        session.ended = confirmed;
        if (!confirmed) throw new ComathError("Owned Codex process termination is unconfirmed", { code: "TERMINATION_UNCONFIRMED" });
      } catch (error) {
        emit(session, { type: "provider_error", code: "TERMINATION_UNCONFIRMED", retryable: true });
        throw error;
      } finally { session.rpc.close(); session.signal.removeEventListener("abort", session.abort); session.waiter?.(); }
    }).finally(() => { session.stopping = undefined; });
    return session.stopping;
  }
  const adapter: AgentRuntimeAdapter = {
    capabilities: () => ({ durable_provider_session: true, streaming_usage: true, exact_output_cap: false,
      exact_provider_request_quota: false, tool_events: true, steer: true, isolation: options.isolation ?? "process_boundary_only" }),
    async start(input) {
      if (closing || sessions.has(input.attempt_key)) throw new ComathError("Codex attempt already exists or adapter is closed", { code: "CODEX_ATTEMPT_CONFLICT" });
      input.signal.throwIfAborted();
      if (input.budget.token_enforcement === "exact_output_cap") throw new ComathError("Codex cannot enforce an exact output cap", { code: "CAPABILITY_UNSUPPORTED", statusCode: 422 });
      const policy = options.resolvePolicy?.(input) ?? { model: options.model, model_provider: options.model_provider };
      if (!policy.model || !policy.model_provider) throw new ComathError("Codex model policy is missing", { code: "RESEARCH_POLICY_UNKNOWN" });
      const prompt = await options.buildPrompt(input);
      input.signal.throwIfAborted();
      const transport = await options.launch(input);
      const handle: WorkerHandle = { attempt_key: input.attempt_key, runtime_kind: "codex-app-server", owned_handle_id: transport.owned_handle_id };
      const cwd = transport.workspace_path ?? input.workspace.workspace_path;
      const session = { handle, transport, started: Date.now(), sequence: 0, events: [], ended: false, usage: null,
        tools: new Set<string>(), signal: input.signal } as unknown as Session;
      session.rpc = createCodexJsonRpc({ input: transport.stdin, output: transport.stdout, onNotification: message => receive(session, message) });
      session.abort = () => { void stop(session).catch(() => emit(session, { type: "provider_error", code: "TERMINATION_UNCONFIRMED", retryable: true })); }; input.signal.addEventListener("abort", session.abort, { once: true });
      sessions.set(input.attempt_key, session);
      try {
        input.signal.throwIfAborted();
        await session.rpc.request("initialize", { clientInfo: { name: "comath_worker", version: "1.0.0" } });
        session.rpc.notify("initialized");
        input.signal.throwIfAborted();
        const thread = await session.rpc.request("thread/start", { model: policy.model, modelProvider: policy.model_provider,
          cwd, approvalPolicy: "never", config: { "features.multi_agent": false },
          developerInstructions: "Use only the service-provisioned task scope and checkpoint tools. Research output has no proof authority." }) as { thread: { id: string } };
        if (typeof thread.thread?.id !== "string") throw new Error("Missing provider thread ID");
        handle.provider_session = { thread_id: thread.thread.id };
        input.signal.throwIfAborted();
        const turn = await session.rpc.request("turn/start", { threadId: thread.thread.id, model: policy.model,
          input: [{ type: "text", text: prompt }], cwd }) as { turn: { id: string } };
        if (typeof turn.turn?.id !== "string") throw new Error("Missing provider turn ID");
        handle.provider_session.turn_id = turn.turn.id;
        session.turnStarted = true;
        emit(session, { type: "started", runtime_kind: "codex-app-server", owned_handle_ref: handle.owned_handle_id });
        if (session.providerCompleted) void stop(session).catch(() => emit(session, { type: "provider_error", code: "TERMINATION_UNCONFIRMED", retryable: true }));
        return handle;
      } catch (error) { await stop(session); throw error; }
    },
    async resume(input) {
      // Default recovery starts a fresh provider thread. Accepted checkpoint material is included by buildPrompt.
      return adapter.start(input);
    },
    async steer(handle, instruction) {
      const session = requireSession(handle), provider = session.handle.provider_session!;
      await session.rpc.request("turn/steer", { threadId: provider.thread_id, expectedTurnId: provider.turn_id, input: [{ type: "text", text: instruction }] });
    },
    async cancel(handle) { await stop(requireSession(handle)); },
    async *events(handle) {
      const session = requireSession(handle);
      while (!session.ended || session.events.length) {
        const event = session.events.shift();
        if (event) yield event;
        else await new Promise<void>(resolve => { session.waiter = resolve; });
      }
    },
    async snapshotUsage(handle) { return requireSession(handle).usage; },
    async close() {
      closing = true;
      const results = await Promise.allSettled([...sessions.values()].map(session => stop(session)));
      const errors = results.flatMap(result => result.status === "rejected" ? [result.reason] : []);
      if (errors.length) throw new AggregateError(errors, "Codex sessions could not all confirm termination");
    }
  };
  return adapter;
}
