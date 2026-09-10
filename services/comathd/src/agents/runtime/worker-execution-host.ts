import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { ComathError } from "../../errors.js";
import { canonicalJson } from "../../verification/runner-contracts.js";
import { assertProjectReadable } from "../../research/project-commit.js";
import { getAcquiredProjectRuntime, type ProjectRuntime } from "../../research/project-runtime.js";
import type { PortfolioScheduler, ResearchGrant } from "../../research/portfolio-scheduler.js";
import type { AttemptLifecycleHooks, AttemptReconciler, AttemptStopReason, AttemptTermination } from "../../research/reconciliation.js";
import { artifactPointerSchema, usageSchema, type ResearchTask } from "../../research/research-schemas.js";
import type { AgentRuntimeAdapter, StartWorkerInput, WorkerHandle, UsageSnapshot } from "./agent-runtime-adapter.js";
import { workerEventSchema, type WorkerEvent } from "./worker-event.js";

export type WorkerExecutionHostOptions = {
  runtime: ProjectRuntime; scheduler: PortfolioScheduler; reconciler: () => AttemptReconciler;
  validateTask: (task: ResearchTask) => void;
  prepareInput: (task: ResearchTask, grant: ResearchGrant, signal: AbortSignal) => Promise<StartWorkerInput>;
  inspectRecovered?: (attemptKey: string) => Promise<AttemptTermination>;
  expectedRuntimeKind?: (runtimeId: string) => string;
};
export type WorkerExecutionHost = {
  validate(task: ResearchTask): void;
  dispatch(grant: ResearchGrant, adapter: AgentRuntimeAdapter): Promise<void>;
  lifecycle: Pick<AttemptLifecycleHooks, "requestCheckpoint" | "stop" | "inspect">;
  close(): Promise<void>;
};
const id = z.string().min(1).max(200);
const handleSchema = z.strictObject({ attempt_key: id, runtime_kind: id, owned_handle_id: id,
  provider_session: z.strictObject({ thread_id: id, turn_id: id.optional() }).optional() });
const snapshotSchema = z.strictObject({ attempt_key: id, source_key: id, thread_id: id.optional(), total: usageSchema, observed_at: z.iso.datetime() });
type RunningAttempt = {
  grant: ResearchGrant; adapter: AgentRuntimeAdapter; controller: AbortController; expectedKind: string;
  handle?: WorkerHandle; cancelPending?: Promise<void>; run: Promise<void>; drained: boolean;
  terminationConfirmed: boolean; protocolFailed: boolean; finalUsageObserved: boolean;
  sequences: Map<string, { seq: number; sha256: string }>;
};
function error(code: string, message: string): ComathError { return new ComathError(message, { code, statusCode: 409 }); }
const hash = (text: string): string => createHash("sha256").update(text).digest("hex");

/** Executes only granted work. Provider progress and completion never certify a research result. */
export function createWorkerExecutionHost(options: WorkerExecutionHostOptions): WorkerExecutionHost {
  const { runtime, scheduler } = options;
  const attempts = new Map<string, RunningAttempt>();
  let closing: Promise<void> | undefined;
  function assertOwner(): void {
    if (getAcquiredProjectRuntime(runtime.root) !== runtime || runtime.referenceCount < 1) throw error("RESEARCH_OWNER_REQUIRED", "Worker host requires its acquired runtime");
  }
  function validate(task: ResearchTask): void {
    assertOwner(); if (closing) throw error("WORKER_HOST_CLOSED", "Worker execution host is closing");
    options.validateTask(task);
  }
  function validateGrant(grant: ResearchGrant): ResearchTask {
    assertOwner();
    const task = runtime.store.getTask(grant.task_id), row = runtime.store.get("SELECT * FROM attempts WHERE attempt_key=?", grant.attempt_key);
    const supplied = typeof grant.lease_token === "string" ? createHash("sha256").update(grant.lease_token).digest() : Buffer.alloc(0);
    const expected = row && typeof row.lease_token_hash === "string" && /^[a-f0-9]{64}$/.test(row.lease_token_hash) ? Buffer.from(row.lease_token_hash, "hex") : Buffer.alloc(0);
    if (!task || !row || !supplied.length || expected.length !== supplied.length || !timingSafeEqual(supplied, expected)
      || task.campaign_id !== grant.campaign_id || task.generation !== grant.generation || task.status !== "leased" || row.task_id !== grant.task_id
      || Number(row.generation) !== grant.generation || row.run_id !== grant.run_id || row.fenced_at || Date.parse(String(row.expires_at)) <= runtime.clock.now()
      || Date.parse(String(row.start_deadline_at)) <= runtime.clock.now() || !runtime.store.get("SELECT attempt_key FROM permits WHERE attempt_key=? AND resource_key='worker:deployment'", grant.attempt_key)) {
      throw error("WORKER_GRANT_INVALID", "Worker dispatch has no current granted attempt and permit");
    }
    assertProjectReadable(runtime.root, undefined, task.campaign_id); options.validateTask(task);
    return task;
  }
  function record(entry: RunningAttempt, type: string, payload: Record<string, unknown>): void {
    scheduler.events.appendEvent({ campaign_id: entry.grant.campaign_id, task_id: entry.grant.task_id, generation: entry.grant.generation,
      type, actor: "service:worker-host", payload: { attempt_key: entry.grant.attempt_key, ...payload, proof_authority: "none" } });
  }
  function toolsTerminated(attemptKey: string): boolean {
    return !runtime.store.get("SELECT execution_id FROM tool_executions WHERE attempt_key=? AND state NOT IN ('terminated','waiting') LIMIT 1", attemptKey)
      && !runtime.store.get("SELECT resource_key FROM permits WHERE attempt_key=? AND resource_key LIKE 'tool:%' LIMIT 1", attemptKey);
  }
  function usageComplete(entry: RunningAttempt): boolean {
    if (!entry.finalUsageObserved || entry.protocolFailed) return false;
    const row = runtime.store.get("SELECT observed_json,state FROM reservations WHERE attempt_key=?", entry.grant.attempt_key);
    if (!row || row.state === "unreconciled") return false;
    const metadata = JSON.parse(String(row.observed_json)) as { required_dimensions?: string[] };
    if (!Array.isArray(metadata.required_dimensions)) return false;
    const snapshots = runtime.store.all("SELECT provider_total_json FROM usage_snapshots WHERE attempt_key=?", entry.grant.attempt_key);
    return snapshots.length > 0 && snapshots.every(snapshot => {
      const usage = JSON.parse(String(snapshot.provider_total_json)) as Record<string, unknown>;
      return metadata.required_dimensions!.every(dimension => typeof usage[dimension] === "number" && Number.isSafeInteger(usage[dimension]) && Number(usage[dimension]) >= 0);
    });
  }
  async function inspect(attemptKey: string): Promise<AttemptTermination> {
    assertOwner();
    const row = runtime.store.get("SELECT attempt_key FROM attempts WHERE attempt_key=?", attemptKey);
    if (!row) return { runtime_terminated: false, tools_terminated: false, usage_complete: false };
    const entry = attempts.get(attemptKey);
    if (entry) return { runtime_terminated: entry.terminationConfirmed && !entry.protocolFailed, tools_terminated: toolsTerminated(attemptKey), usage_complete: usageComplete(entry) };
    const recovered = options.inspectRecovered ? await options.inspectRecovered(attemptKey) : undefined;
    return { runtime_terminated: recovered?.runtime_terminated === true, tools_terminated: toolsTerminated(attemptKey) && (recovered === undefined || recovered.tools_terminated === true), usage_complete: recovered?.usage_complete === true };
  }
  async function stop(attemptKey: string, reason: AttemptStopReason): Promise<void> {
    assertOwner(); const entry = attempts.get(attemptKey);
    if (!entry) return; // Unknown recovered handles require host inspection; no cancellation is inferred.
    entry.controller.abort(error("WORKER_STOP_REQUESTED", "Service requested worker stop"));
    if (entry.terminationConfirmed && !entry.protocolFailed) return;
    if (!entry.handle) return; // prepare/start will see the same aborted signal and re-check after await.
    if (entry.cancelPending) return entry.cancelPending;
    entry.cancelPending = Promise.resolve().then(() => entry.adapter.cancel(entry.handle!, reason));
    try { await entry.cancelPending; }
    catch (cause) {
      record(entry, "WorkerCancelFailed", { reason, code: cause instanceof ComathError ? cause.code : "WORKER_CANCEL_FAILED" });
      throw cause;
    } finally { entry.cancelPending = undefined; }
  }
  async function requestCheckpoint(attemptKey: string): Promise<void> {
    assertOwner(); const entry = attempts.get(attemptKey);
    if (!entry?.handle || entry.terminationConfirmed || entry.protocolFailed) throw error("WORKER_HANDLE_UNAVAILABLE", "No live owned worker handle can receive checkpoint instructions");
    if (!entry.adapter.capabilities().steer) throw error("WORKER_STEER_UNSUPPORTED", "Adapter cannot receive checkpoint steering");
    await entry.adapter.steer(entry.handle, "Submit a complete checkpoint through the configured service checkpoint interface, including accepted artifact references. This request does not authorize new tools or a success result while stopping.");
    record(entry, "WorkerCheckpointRequested", {});
  }
  async function applyUsage(entry: RunningAttempt, snapshot: UsageSnapshot, final: boolean): Promise<void> {
    const parsed = snapshotSchema.safeParse(snapshot);
    if (!parsed.success) throw error("WORKER_USAGE_INVALID", "Adapter usage snapshot is malformed");
    if (parsed.data.attempt_key !== entry.grant.attempt_key) throw error("WORKER_EVENT_ATTEMPT_MISMATCH", "Usage snapshot belongs to another attempt");
    const result = scheduler.recordUsage({ attempt_key: entry.grant.attempt_key, source_key: parsed.data.source_key, thread_id: parsed.data.thread_id, usage: parsed.data.total });
    if (final) entry.finalUsageObserved = true;
    if (result.stop_required && !entry.terminationConfirmed) await options.reconciler().requestStop(entry.grant.attempt_key, "budget");
  }
  async function consume(entry: RunningAttempt, value: unknown): Promise<void> {
    const parsed = workerEventSchema.safeParse(value);
    if (!parsed.success) throw error("WORKER_EVENT_INVALID", "Adapter emitted a malformed worker event");
    const event: WorkerEvent = parsed.data;
    if (event.attempt_key !== entry.grant.attempt_key) throw error("WORKER_EVENT_ATTEMPT_MISMATCH", "Worker event belongs to another attempt");
    const digest = hash(canonicalJson(event)), previous = entry.sequences.get(event.source_key);
    if (previous && event.source_seq === previous.seq && digest === previous.sha256) return;
    if (previous && event.source_seq <= previous.seq) throw error("WORKER_EVENT_SEQUENCE_INVALID", "Worker event sequence regressed or conflicts with a prior event");
    entry.sequences.set(event.source_key, { seq: event.source_seq, sha256: digest });
    if (entry.terminationConfirmed) throw error("WORKER_EVENT_AFTER_TERMINATION", "Worker event arrived after confirmed termination");
    switch (event.type) {
      case "started":
        if (event.runtime_kind !== entry.expectedKind || event.owned_handle_ref !== entry.handle?.owned_handle_id) throw error("WORKER_HANDLE_INVALID", "Worker started event does not identify the owned handle");
        break;
      case "heartbeat": options.reconciler().heartbeat(entry.grant.attempt_key, { runtime_alive: true }); break;
      case "usage_snapshot": await applyUsage(entry, { attempt_key: event.attempt_key, source_key: event.source_key, thread_id: event.thread_id, total: event.usage, observed_at: event.observed_at }, false); break;
      case "tool_started":
        options.reconciler().assertWorkerCapability(entry.grant.attempt_key, entry.grant.lease_token, "tool");
        await options.reconciler().observeToolCall(entry.grant.attempt_key, event.correlation_id);
        break;
      case "tool_completed": record(entry, "WorkerToolCompleted", { tool_id: event.tool_id, correlation_id: event.correlation_id, status: event.status }); break;
      case "checkpoint_requested": await requestCheckpoint(entry.grant.attempt_key); break;
      case "result_available": record(entry, "WorkerResultAvailable", { artifact: event.artifact, accepted: false }); break;
      case "provider_error": record(entry, "WorkerProviderError", { code: event.code, retryable: event.retryable }); break;
      case "completed": record(entry, "WorkerProviderCompleted", { status: event.status, exit_code: event.exit_code, result_accepted: false }); break;
      case "termination_confirmed":
        if (event.owned_handle_ref !== entry.handle?.owned_handle_id) throw error("WORKER_HANDLE_INVALID", "Termination event does not identify this owned handle");
        entry.terminationConfirmed = true;
        record(entry, "WorkerOwnedTerminationObserved", { owned_handle_id: entry.handle.owned_handle_id });
        break;
    }
  }
  async function run(entry: RunningAttempt): Promise<void> {
    try {
      const task = validateGrant(entry.grant);
      const input = await options.prepareInput(task, entry.grant, entry.controller.signal);
      entry.controller.signal.throwIfAborted(); const current = validateGrant(entry.grant);
      if (input.attempt_key !== entry.grant.attempt_key || input.lease_capability !== entry.grant.lease_token || input.signal !== entry.controller.signal
        || input.approved_model_policy_id !== current.model_policy_id || input.approved_tool_policy_id !== current.tool_policy_id
        || canonicalJson(input.scope) !== canonicalJson(current.scope) || canonicalJson(input.budget) !== canonicalJson(current.budget)
        || !artifactPointerSchema.safeParse(input.context_pack).success || !input.workspace?.descriptor_id || !input.workspace.workspace_path || !input.workspace.context_path) {
        throw error("WORKER_INPUT_INVALID", "Prepared input does not match the granted task and service policies");
      }
      const rawHandle = await entry.adapter.start(input);
      const parsed = handleSchema.safeParse(rawHandle);
      if (parsed.success && parsed.data.attempt_key === entry.grant.attempt_key) entry.handle = parsed.data;
      if (!parsed.success || parsed.data.attempt_key !== entry.grant.attempt_key || parsed.data.runtime_kind !== entry.expectedKind) throw error("WORKER_HANDLE_INVALID", "Adapter returned a mismatched or malformed owned handle");
      options.reconciler().runtimeStarted(entry.grant.attempt_key, { ...parsed.data });
      if (entry.controller.signal.aborted) await stop(entry.grant.attempt_key, "user_cancel");
      for await (const event of entry.adapter.events(parsed.data)) await consume(entry, event);
      const final = await entry.adapter.snapshotUsage(parsed.data);
      if (final !== null) await applyUsage(entry, final, true);
      else record(entry, "WorkerFinalUsageUnavailable", {});
      const confirmation = await inspect(entry.grant.attempt_key);
      if (confirmation.runtime_terminated && confirmation.tools_terminated) options.reconciler().confirmTermination(entry.grant.attempt_key, confirmation);
      else {
        scheduler.budget.markUnreconciled(entry.grant.attempt_key);
        if (!entry.terminationConfirmed) await stop(entry.grant.attempt_key, "crash");
        record(entry, "WorkerTerminationUnconfirmed", { runtime_terminated: confirmation.runtime_terminated, tools_terminated: confirmation.tools_terminated });
      }
    } catch (cause) {
      entry.protocolFailed = true; entry.terminationConfirmed = false; entry.controller.abort(cause);
      record(entry, "WorkerExecutionFailed", { code: cause instanceof ComathError ? cause.code : "WORKER_EXECUTION_FAILED" });
      scheduler.budget.markUnreconciled(entry.grant.attempt_key);
      try { await options.reconciler().requestStop(entry.grant.attempt_key, "crash"); await stop(entry.grant.attempt_key, "crash"); }
      catch { /* Failure is recorded by stop; no termination or permit release is inferred. */ }
      throw cause;
    } finally { entry.drained = true; }
  }
  function dispatch(grant: ResearchGrant, adapter: AgentRuntimeAdapter): Promise<void> {
    if (closing) return Promise.reject(error("WORKER_HOST_CLOSED", "Worker execution host is closing"));
    const existing = attempts.get(grant.attempt_key);
    if (existing) return existing.adapter === adapter && existing.grant.lease_token === grant.lease_token ? existing.run : Promise.reject(error("WORKER_DISPATCH_CONFLICT", "Attempt is already bound to another dispatch"));
    try { validateGrant(grant); } catch (cause) { return Promise.reject(cause); }
    const kind = options.expectedRuntimeKind ? options.expectedRuntimeKind(grant.runtime_id) : grant.runtime_id;
    if (typeof kind !== "string" || !kind) return Promise.reject(error("WORKER_RUNTIME_KIND_UNKNOWN", "Granted runtime has no host-configured adapter kind"));
    const entry: RunningAttempt = { grant: { ...grant }, adapter, controller: new AbortController(), expectedKind: kind, run: Promise.resolve(), drained: false,
      terminationConfirmed: false, protocolFailed: false, finalUsageObserved: false, sequences: new Map() };
    attempts.set(grant.attempt_key, entry);
    entry.run = run(entry);
    return entry.run;
  }
  function close(): Promise<void> {
    if (closing) return closing;
    closing = Promise.resolve().then(async () => {
      const active = [...attempts.values()].filter(entry => !entry.drained);
      const stops = await Promise.allSettled(active.map(async entry => {
        await options.reconciler().requestStop(entry.grant.attempt_key, "user_cancel");
        await stop(entry.grant.attempt_key, "user_cancel");
      }));
      const failures = stops.flatMap(result => result.status === "rejected" ? [result.reason] : []);
      // If cancellation itself failed, callers must retain the host/runtime for recovery.
      if (failures.length) throw new AggregateError(failures, "Worker host cancellation failed; termination remains unconfirmed");
      const drained = await Promise.allSettled(active.map(entry => entry.run));
      failures.push(...drained.flatMap(result => result.status === "rejected" ? [result.reason] : []));
      if (failures.length) throw new AggregateError(failures, "Worker executions failed while draining");
    });
    return closing;
  }
  return { validate, dispatch, lifecycle: { requestCheckpoint, stop, inspect }, close };
}
