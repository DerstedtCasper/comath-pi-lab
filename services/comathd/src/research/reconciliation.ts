import { createHash, timingSafeEqual } from "node:crypto";
import { ComathError } from "../errors.js";
import { createResearchEventStore } from "./event-store.js";
import { assertProjectReadable, finalizeTrustCommit } from "./project-commit.js";
import type { PortfolioScheduler } from "./portfolio-scheduler.js";
import type { ProjectRuntime } from "./project-runtime.js";
import type { ResearchTask } from "./research-schemas.js";

export type AttemptStopReason = "pause" | "handoff" | "user_cancel" | "lease_expired" | "start_deadline" | "crash" | "budget" | "checkpoint_overdue" | "supervisor_invalid";
export type AttemptTermination = { runtime_terminated: boolean; tools_terminated: boolean; usage_complete: boolean };
export type AttemptLifecycleHooks = {
  requestCheckpoint: (attemptKey: string) => Promise<void>;
  stop: (attemptKey: string, reason: AttemptStopReason) => Promise<void>;
  inspect: (attemptKey: string) => Promise<AttemptTermination>;
  hasPendingSubmission?: (attemptKey: string) => boolean;
  recordSubmissionTermination?: (attemptKey: string) => void;
  reconcileSubmissions?: () => unknown;
  max_fault_retries?: number; checkpoint_grace_ms?: number; lease_ttl_ms?: number;
  checkpoint?: { first_tool_calls: number; periodic_tool_calls: number; output_tokens: number; interval_ms: number };
};
function fail(code: string, message: string): never { throw new ComathError(message, { code, statusCode: 409 }); }
const faultReasons = new Set<AttemptStopReason>(["lease_expired", "start_deadline", "crash"]);

export class AttemptReconciler {
  readonly events;
  private timer?: ReturnType<typeof setInterval>;
  private polling = false;
  private closed = false;
  private pollDrained?: Promise<void>;
  private finishPoll?: () => void;
  constructor(readonly runtime: ProjectRuntime, private readonly scheduler: PortfolioScheduler, private readonly hooks: AttemptLifecycleHooks) {
    this.events = createResearchEventStore(runtime);
  }
  private attempt(attemptKey: string, submissionLifecycle = false) {
    const attempt = this.runtime.store.get("SELECT * FROM attempts WHERE attempt_key=?", attemptKey);
    if (!attempt) fail("RESEARCH_ATTEMPT_UNKNOWN", "Unknown worker attempt");
    const task = this.runtime.store.getTask(String(attempt.task_id));
    if (!task) fail("RESEARCH_TASK_NOT_FOUND", "Attempt task is missing");
    // Pending source installation blocks business readers, but cannot block cancellation or owned-process settlement.
    if (!submissionLifecycle || this.hooks.hasPendingSubmission?.(attemptKey) !== true) assertProjectReadable(this.runtime.root, undefined, task.campaign_id);
    return { attempt, task };
  }
  assertWorkerCapability(attemptKey: string, token: string, operation: "checkpoint" | "tool" | "result" | "heartbeat"): ResearchTask {
    const { attempt, task } = this.attempt(attemptKey), now = this.runtime.clock.now();
    const supplied = createHash("sha256").update(token).digest(), expected = Buffer.from(String(attempt.lease_token_hash), "hex");
    if (expected.length !== supplied.length || !timingSafeEqual(supplied, expected) || task.generation !== Number(attempt.generation)
      || attempt.fenced_at || Date.parse(String(attempt.expires_at)) <= now || !["running", "cancelling"].includes(task.status)) fail("RESEARCH_ATTEMPT_FENCED", "Worker capability is invalid or fenced");
    if (task.status === "cancelling" && (operation !== "checkpoint" || !["pause", "handoff", "checkpoint_overdue"].includes(String(attempt.stop_reason))
      || Date.parse(String(attempt.grace_deadline_at)) <= now)) fail("RESEARCH_ATTEMPT_FENCED", "Cancelling attempt only accepts its final checkpoint during grace");
    return task;
  }
  runtimeStarted(attemptKey: string, handle: Record<string, unknown>): void {
    this.runtime.store.transaction(() => {
      const { attempt, task } = this.attempt(attemptKey);
      if (attempt.fenced_at || task.generation !== Number(attempt.generation) || task.status !== "leased"
        || Date.parse(String(attempt.start_deadline_at)) <= this.runtime.clock.now()) fail("RESEARCH_ATTEMPT_FENCED", "Late runtime start is fenced");
      this.runtime.store.run("UPDATE attempts SET state='running',runtime_handle_json=? WHERE attempt_key=?", JSON.stringify(handle), attemptKey);
      this.runtime.store.putTask({ ...task, status: "running", updated_at: new Date(this.runtime.clock.now()).toISOString() });
      this.events.appendEvent({ campaign_id: task.campaign_id, task_id: task.task_id, generation: task.generation, type: "WorkerStarted", actor: "service:runtime", payload: { attempt_key: attemptKey } });
    });
  }
  heartbeat(attemptKey: string, liveness: { runtime_alive: boolean }): void {
    if (!liveness.runtime_alive) fail("RESEARCH_LIVENESS_UNCONFIRMED", "Heartbeat needs runtime liveness confirmation");
    this.runtime.store.transaction(() => {
      const { attempt, task } = this.attempt(attemptKey), now = this.runtime.clock.now();
      if (attempt.fenced_at || task.generation !== Number(attempt.generation) || task.status !== "running"
        || Date.parse(String(attempt.expires_at)) <= now) fail("RESEARCH_ATTEMPT_FENCED", "Expired attempt cannot renew its own lease");
      this.runtime.store.run("UPDATE attempts SET last_heartbeat_at=?,expires_at=? WHERE attempt_key=?",
        new Date(now).toISOString(), new Date(now + (this.hooks.lease_ttl_ms ?? 120000)).toISOString(), attemptKey);
    });
  }
  async requestStop(attemptKey: string, reason: AttemptStopReason): Promise<void> {
    let checkpoint = false, stop = false;
    this.runtime.store.transaction(() => {
      const { attempt, task } = this.attempt(attemptKey, true);
      if (attempt.state === "terminated") return;
      if (attempt.stop_reason && reason !== "user_cancel" && !(reason === "budget" && attempt.stop_reason !== "user_cancel")) return;
      const now = this.runtime.clock.now(), stamp = new Date(now).toISOString();
      const previousGraceExpired = reason === "checkpoint_overdue" && attempt.checkpoint_requested_at && now >= Date.parse(String(attempt.checkpoint_requested_at)) + (this.hooks.checkpoint_grace_ms ?? 30000);
      const grace = !previousGraceExpired && ["pause", "handoff", "checkpoint_overdue"].includes(reason) && !attempt.fenced_at && Date.parse(String(attempt.expires_at)) > now;
      this.runtime.store.run("UPDATE attempts SET state='cancelling',stop_reason=?,stop_requested_at=?,checkpoint_requested_at=?,grace_deadline_at=?,fenced_at=? WHERE attempt_key=?",
        reason, stamp, grace ? stamp : attempt.checkpoint_requested_at as string | null,
        grace ? new Date(Math.min(now + (this.hooks.checkpoint_grace_ms ?? 30000), Date.parse(String(attempt.expires_at)))).toISOString() : null,
        grace ? null : stamp, attemptKey);
      this.runtime.store.run("UPDATE tool_executions SET stop_intent=? WHERE attempt_key=? AND state<>'terminated'", reason, attemptKey);
      if (task.generation === Number(attempt.generation) && !["succeeded", "failed", "cancelled"].includes(task.status)) {
        this.runtime.store.putTask({ ...task, status: "cancelling", updated_at: stamp });
      }
      this.events.appendEvent({ campaign_id: task.campaign_id, task_id: task.task_id, generation: Number(attempt.generation), type: "AttemptStopRequested", actor: "service:reconciler", payload: { attempt_key: attemptKey, reason, checkpoint_grace: grace } });
      checkpoint = grace; stop = !grace;
    });
    if (checkpoint) await this.hooks.requestCheckpoint(attemptKey);
    if (stop) await this.hooks.stop(attemptKey, reason);
  }
  confirmTermination(attemptKey: string, confirmation: AttemptTermination) {
    if (!confirmation.runtime_terminated || !confirmation.tools_terminated) fail("TERMINATION_UNCONFIRMED", "Worker and every service tool must terminate first");
    return this.runtime.store.transaction(() => {
      const { attempt, task } = this.attempt(attemptKey, true);
      const reason = attempt.stop_reason as AttemptStopReason | null;
      const submissionPending = this.hooks.hasPendingSubmission?.(attemptKey) === true;
      if (submissionPending && !reason) this.hooks.recordSubmissionTermination?.(attemptKey);
      const result = this.scheduler.confirmTermination(attemptKey, { termination_confirmed: true, usage_complete: confirmation.usage_complete });
      this.runtime.store.run("UPDATE attempts SET termination_confirmed=1,fenced_at=COALESCE(fenced_at,?) WHERE attempt_key=?", new Date(this.runtime.clock.now()).toISOString(), attemptKey);
      if (attempt.state === "terminated" || task.generation !== Number(attempt.generation) || ["succeeded", "failed", "cancelled"].includes(task.status)) return result;
      const next: ResearchTask = { ...task, updated_at: new Date(this.runtime.clock.now()).toISOString() };
      if (reason === "user_cancel") { next.status = "cancelled"; delete next.blocked_reason; }
      else if (submissionPending) { next.status = "blocked"; next.blocked_reason = "submission_pending"; }
      else if (reason === "pause") { next.status = "blocked"; next.blocked_reason = "paused"; }
      else if (reason === "supervisor_invalid") { next.status = "blocked"; next.blocked_reason = "supervisor_invalid_proposal"; }
      else if (reason === "handoff" || reason === "checkpoint_overdue") {
        next.status = task.checkpoint_head ? "queued" : "blocked";
        if (task.checkpoint_head) delete next.blocked_reason; else next.blocked_reason = "checkpoint_missing";
      } else if (reason && faultReasons.has(reason)) {
        const retries = task.fault_retry_count;
        if (!task.checkpoint_head && retries >= 1) { next.status = "blocked"; next.blocked_reason = "checkpoint_missing_retry_exhausted"; }
        else if (retries >= (this.hooks.max_fault_retries ?? 3)) { next.status = "blocked"; next.blocked_reason = "fault_retry_exhausted"; }
        else { next.status = "queued"; next.fault_retry_count++; delete next.blocked_reason; }
      } else { next.status = "blocked"; next.blocked_reason = reason === "budget" ? "budget_exhausted" : "runtime_ended_without_result"; }
      this.runtime.store.putTask(next);
      return result;
    });
  }
  async observeToolCall(attemptKey: string, correlationId: string): Promise<void> {
    if (!correlationId || correlationId.length > 200) fail("RESEARCH_TOOL_EVENT_INVALID", "Invalid tool correlation ID");
    this.runtime.store.transaction(() => {
      const { attempt, task } = this.attempt(attemptKey);
      if (task.status !== "running" || attempt.fenced_at || task.generation !== Number(attempt.generation)) fail("RESEARCH_ATTEMPT_FENCED", "Tool event belongs to an inactive attempt");
      if (!this.runtime.store.get("SELECT seq FROM events WHERE task_id=? AND generation=? AND type='ToolCallObserved' AND json_extract(payload_json,'$.correlation_id')=?", task.task_id, task.generation, correlationId)) {
        this.events.appendEvent({ campaign_id: task.campaign_id, task_id: task.task_id, generation: task.generation, type: "ToolCallObserved", actor: "service:runtime", payload: { correlation_id: correlationId, attempt_key: attemptKey } });
      }
    });
    await this.monitorCheckpoint(attemptKey);
  }
  private async monitorCheckpoint(attemptKey: string): Promise<void> {
    const { attempt, task } = this.attempt(attemptKey);
    if (task.status !== "running" || attempt.checkpoint_requested_at || attempt.fenced_at) return;
    const calls = Number(this.runtime.store.get("SELECT COUNT(*) AS n FROM events WHERE task_id=? AND generation=? AND type='ToolCallObserved'", task.task_id, task.generation)?.n ?? 0);
    const reservation = this.runtime.store.get("SELECT observed_json FROM reservations WHERE attempt_key=?", attemptKey);
    const output = reservation ? Number(JSON.parse(String(reservation.observed_json)).usage?.output_tokens ?? 0) : 0;
    const lastTime = attempt.last_checkpoint_at ? Date.parse(String(attempt.last_checkpoint_at)) : Date.parse(task.created_at);
    const policy = this.hooks.checkpoint ?? { first_tool_calls: 10, periodic_tool_calls: 15, output_tokens: 12000, interval_ms: 1200000 };
    if ((!task.checkpoint_head && calls >= policy.first_tool_calls) || calls - Number(attempt.last_checkpoint_tool_calls ?? 0) >= policy.periodic_tool_calls
      || output - Number(attempt.last_checkpoint_output_tokens ?? 0) >= policy.output_tokens || this.runtime.clock.now() - lastTime >= policy.interval_ms) {
      this.runtime.store.run("UPDATE attempts SET checkpoint_requested_at=? WHERE attempt_key=?", new Date(this.runtime.clock.now()).toISOString(), attemptKey);
      await this.hooks.requestCheckpoint(attemptKey);
    }
  }
  async reconcileAttempt(attemptKey: string): Promise<{ health: string; next_action: string }> {
    const { attempt, task } = this.attempt(attemptKey, true), now = this.runtime.clock.now();
    if (attempt.state === "terminated") return { health: "terminated", next_action: "usage_reconciliation" };
    if (attempt.fenced_at) {
      // Stop is idempotent. A previous failed callback must not strand a live execution forever.
      await this.hooks.stop(attemptKey, (attempt.stop_reason as AttemptStopReason | null) ?? "crash");
      const confirmation = await this.hooks.inspect(attemptKey);
      if (confirmation.runtime_terminated && confirmation.tools_terminated) {
        this.confirmTermination(attemptKey, confirmation);
        return { health: "terminated", next_action: "usage_reconciliation" };
      }
      return { health: "fenced", next_action: "confirm_termination" };
    }
    // The grant's fixed start deadline preserves its original timestamp even as heartbeats renew TTL.
    const grantedAt = Date.parse(String(attempt.start_deadline_at)) - 60000;
    if (task.kind !== "legacy_run" && Number.isFinite(grantedAt) && now - grantedAt >= task.budget.wall_ms) {
      await this.requestStop(attemptKey, "budget"); return { health: "budget_exhausted", next_action: "confirm_termination" };
    }
    if (task.status === "leased" && now >= Date.parse(String(attempt.start_deadline_at))) {
      await this.requestStop(attemptKey, "start_deadline"); return { health: "start_timeout", next_action: "confirm_termination" };
    }
    if (attempt.stop_reason && attempt.grace_deadline_at) {
      const checkpointAccepted = attempt.last_checkpoint_at && attempt.stop_requested_at && Date.parse(String(attempt.last_checkpoint_at)) > Date.parse(String(attempt.stop_requested_at));
      if (now >= Date.parse(String(attempt.grace_deadline_at)) || checkpointAccepted) {
        this.runtime.store.run("UPDATE attempts SET fenced_at=? WHERE attempt_key=?", new Date(now).toISOString(), attemptKey);
        await this.hooks.stop(attemptKey, attempt.stop_reason as AttemptStopReason);
      }
      return { health: "cancelling", next_action: "confirm_termination" };
    }
    if (now >= Date.parse(String(attempt.expires_at))) {
      await this.requestStop(attemptKey, "lease_expired"); return { health: "expired", next_action: "confirm_termination" };
    }
    if (attempt.checkpoint_requested_at && now >= Date.parse(String(attempt.checkpoint_requested_at)) + (this.hooks.checkpoint_grace_ms ?? 30000)) {
      // The monitor already gave a checkpoint opportunity; do not open a second grace period.
      await this.requestStop(attemptKey, "checkpoint_overdue");
      return { health: "checkpoint_overdue", next_action: "confirm_termination" };
    }
    await this.monitorCheckpoint(attemptKey);
    return { health: now - Date.parse(String(attempt.last_heartbeat_at)) >= 60000 ? "suspect" : "healthy", next_action: "monitor" };
  }
  async recover(): Promise<{ blocked_operations: string[]; unconfirmed_attempts: string[] }> {
    const blocked: string[] = [], unconfirmed: string[] = [];
    for (const row of this.runtime.store.all("SELECT operation_id FROM trust_commits WHERE phase<>'committed' ORDER BY rowid")) {
      try { finalizeTrustCommit(this.runtime.root, String(row.operation_id)); } catch { blocked.push(String(row.operation_id)); }
    }
    this.hooks.reconcileSubmissions?.();
    for (const row of this.runtime.store.all("SELECT attempt_key FROM attempts WHERE state<>'terminated'")) {
      const key = String(row.attempt_key);
      try {
        const { attempt, task } = this.attempt(key, true);
        if (!attempt.stop_reason && !["succeeded", "failed", "cancelled"].includes(task.status)) await this.requestStop(key, "crash");
        else {
          this.runtime.store.run("UPDATE attempts SET fenced_at=? WHERE attempt_key=?", new Date(this.runtime.clock.now()).toISOString(), key);
          await this.hooks.stop(key, (attempt.stop_reason as AttemptStopReason | null) ?? "crash");
        }
        const confirmation = await this.hooks.inspect(key);
        this.confirmTermination(key, confirmation);
      } catch { unconfirmed.push(key); }
    }
    return { blocked_operations: blocked, unconfirmed_attempts: unconfirmed };
  }
  async poll(): Promise<{ attempt_key: string; code: string }[]> {
    if (this.closed || this.polling) return [];
    this.polling = true;
    this.pollDrained = new Promise(resolve => { this.finishPoll = resolve; });
    const errors: { attempt_key: string; code: string }[] = [];
    try {
      this.hooks.reconcileSubmissions?.();
      for (const row of this.runtime.store.all("SELECT attempt_key FROM attempts WHERE state<>'terminated'")) {
        const key = String(row.attempt_key);
        try { await this.reconcileAttempt(key); }
        catch (error) { errors.push({ attempt_key: key, code: error instanceof ComathError ? error.code : "ATTEMPT_RECONCILIATION_FAILED" }); }
      }
    } finally { this.polling = false; this.finishPoll?.(); this.finishPoll = undefined; }
    return errors;
  }
  start(): void {
    if (this.closed) fail("RECONCILER_CLOSED", "Reconciler is closed");
    if (this.timer) return;
    this.timer = setInterval(() => { void this.poll(); }, 1000); this.timer.unref();
  }
  close(): void { this.closed = true; if (this.timer) clearInterval(this.timer); this.events.close(); }
  async drain(): Promise<void> {
    this.closed = true;
    if (this.timer) { clearInterval(this.timer); this.timer = undefined; }
    await this.pollDrained;
  }
}
export function createAttemptReconciler(runtime: ProjectRuntime, scheduler: PortfolioScheduler, hooks: AttemptLifecycleHooks): AttemptReconciler {
  return new AttemptReconciler(runtime, scheduler, hooks);
}
