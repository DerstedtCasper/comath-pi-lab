import { createHash, randomBytes, randomUUID } from "node:crypto";
import { ComathError } from "../errors.js";
import { createBudgetLedger } from "./budget-ledger.js";
import { createResearchEventStore } from "./event-store.js";
import { assertProjectReadable } from "./project-commit.js";
import type { ProjectRuntime } from "./project-runtime.js";
import { createResourceAdmission, validateResourceConfig, type ResearchResourceConfig } from "./resource-admission.js";
import type { ResearchTask, Usage } from "./research-schemas.js";

export type ResearchGrant = { task_id: string; campaign_id: string; generation: number; attempt_key: string; run_id: string;
  lease_token: string; expires_at: string; provider_id: string; model_policy_id: string; runtime_id: string };
export type PortfolioSchedulerHooks = {
  validateTask: (task: ResearchTask) => void;
  capabilities: (runtimeId: string) => { exact_output_cap: boolean };
  onDispatch?: (grant: ResearchGrant) => void | Promise<void>;
  onStopRequested?: (attemptKey: string, reason: string) => void | Promise<void>;
  auto_poll?: boolean;
};
function fail(code: string, message: string): never { throw new ComathError(message, { code, statusCode: 409 }); }
const liveSchedulers = new WeakMap<ProjectRuntime, PortfolioScheduler>();

export class PortfolioScheduler {
  readonly budget;
  readonly resources;
  readonly events;
  private config: ResearchResourceConfig;
  private running = false;
  private closed = false;
  private admissionsStopped = false;
  private scheduled = false;
  private pumping = false;
  private timer?: ReturnType<typeof setInterval>;
  private unsubscribe: () => void;
  private readonly dispatchHandlers = new Map<string, (grant: ResearchGrant) => void | Promise<void>>();
  private readonly legacyValidators = new Map<string, (task: ResearchTask) => void>();
  constructor(readonly runtime: ProjectRuntime, config: ResearchResourceConfig, private readonly hooks: PortfolioSchedulerHooks) {
    validateResourceConfig(config); this.config = structuredClone(config);
    this.budget = createBudgetLedger(runtime); this.resources = createResourceAdmission(runtime, () => this.config);
    this.events = createResearchEventStore(runtime); this.unsubscribe = this.events.subscribe(() => this.wake());
  }
  updateConfig(config: ResearchResourceConfig): void {
    validateResourceConfig(config); this.config = structuredClone(config); this.wake();
  }
  getResourceConfig(): ResearchResourceConfig { return structuredClone(this.config); }
  registerDispatchHandler(taskId: string, handler: (grant: ResearchGrant) => void | Promise<void>, validateLegacyTask?: (task: ResearchTask) => void): () => void {
    if (this.closed || this.dispatchHandlers.has(taskId)) fail("RESEARCH_DISPATCH_HANDLER_CONFLICT", "Task already has an execution handle or scheduler is closed");
    this.dispatchHandlers.set(taskId, handler);
    if (validateLegacyTask) this.legacyValidators.set(taskId, validateLegacyTask);
    return () => { if (this.dispatchHandlers.get(taskId) === handler) { this.dispatchHandlers.delete(taskId); this.legacyValidators.delete(taskId); } };
  }
  private eligible(task: ResearchTask): boolean {
    const campaign = this.runtime.store.getCampaign(task.campaign_id);
    if (task.status !== "queued" || campaign?.state !== "running" || task.kind === "proof_workflow") return false;
    if (task.kind === "legacy_run" && !this.dispatchHandlers.has(task.task_id)) return false;
    if (task.retry_after && Date.parse(task.retry_after) > this.runtime.clock.now()) return false;
    return task.depends_on.every(id => this.runtime.store.getTask(id)?.status === "succeeded");
  }
  private candidates(): ResearchTask[] {
    const all = this.runtime.store.listCampaigns().flatMap(c => this.runtime.store.listTasks(c.campaign_id)).filter(task => this.eligible(task));
    const recent = this.runtime.store.get("SELECT payload_json FROM events WHERE type='DispatchRequested' ORDER BY seq DESC LIMIT 1");
    const lastCampaign = recent ? JSON.parse(String(recent.payload_json)).campaign_id as string : "";
    const total = Number(this.runtime.store.get("SELECT COUNT(*) AS count FROM events WHERE type='DispatchRequested'")?.count ?? 0);
    const campaignIds = [...new Set(all.map(task => task.campaign_id))].sort();
    const start = campaignIds.findIndex(id => id > lastCampaign);
    const rotated = [...campaignIds.slice(start < 0 ? 0 : start), ...campaignIds.slice(0, start < 0 ? 0 : start)];
    const age = (task: ResearchTask) => Math.max(0, this.runtime.clock.now() - Date.parse(task.created_at));
    const score = (task: ResearchTask) => Math.max(0, task.priority - Math.floor(age(task) / (this.config.aging_ms ?? 900000)));
    all.sort((a, b) => score(a) - score(b) || rotated.indexOf(a.campaign_id) - rotated.indexOf(b.campaign_id)
      || a.created_at.localeCompare(b.created_at) || a.task_id.localeCompare(b.task_id));
    if ((total + 1) % 10 === 0) {
      const oldest = all.filter(task => task.pool !== "validation").sort((a, b) => a.created_at.localeCompare(b.created_at) || a.task_id.localeCompare(b.task_id))[0];
      if (oldest) return [oldest, ...all.filter(task => task !== oldest)];
    }
    return all;
  }
  grantNext(taskId?: string): ResearchGrant | null {
    if (this.closed) fail("RESEARCH_SCHEDULER_CLOSED", "Scheduler is closed");
    if (this.admissionsStopped) return null;
    const candidates = taskId ? [this.runtime.store.getTask(taskId)].filter((task): task is ResearchTask => !!task) : this.candidates();
    for (const candidate of candidates) {
      try {
        const grant = this.runtime.store.transaction(() => {
          const task = this.runtime.store.getTask(candidate.task_id)!;
          if (!this.eligible(task)) return null;
          assertProjectReadable(this.runtime.root, undefined, task.campaign_id);
          const legacyValidator = task.kind === "legacy_run" && task.campaign_id.startsWith("LEGACY-") ? this.legacyValidators.get(task.task_id) : undefined;
          (legacyValidator ?? this.hooks.validateTask)(task);
          const model = this.config.model_policies[task.model_policy_id];
          if (!model) fail("RESEARCH_POLICY_UNKNOWN", "No model runtime policy");
          if (task.budget.token_enforcement === "exact_output_cap" && !this.hooks.capabilities(model.runtime_id).exact_output_cap) fail("CAPABILITY_UNSUPPORTED", "Runtime cannot enforce exact output cap");
          if (this.resources.waitingReason(task)) return null;
          const generation = task.generation + 1, attemptKey = `${task.task_id}:g${generation}`;
          const token = randomBytes(32).toString("base64url");
          const now = this.runtime.clock.now(), expires = new Date(now + (this.config.lease_ttl_ms ?? 120000)).toISOString();
          const runId = task.kind === "legacy_run" && task.legacy_run_id ? task.legacy_run_id : this.runtime.store.allocateId("ARUN");
          const resumeCheckpointId = task.checkpoint_head ?? null;
          const leased: ResearchTask = { ...task, status: "leased", generation, updated_at: new Date(now).toISOString() };
          this.runtime.store.putTask(leased);
          this.runtime.store.run("INSERT INTO attempts(task_id,generation,attempt_key,run_id,state,worker_id,lease_token_hash,expires_at,last_heartbeat_at,runtime_kind,start_deadline_at,resume_checkpoint_id) VALUES (?,?,?,?,'leased',?,?,?,?,?,?,?)",
            task.task_id, generation, attemptKey, runId, `WORKER-${randomUUID()}`, createHash("sha256").update(token).digest("hex"), expires,
            new Date(now).toISOString(), model.runtime_id, new Date(now + 60000).toISOString(), resumeCheckpointId);
          this.budget.reserve(leased, attemptKey);
          this.resources.acquireAttemptPermits(leased, attemptKey, expires);
          const grant: ResearchGrant = { task_id: task.task_id, campaign_id: task.campaign_id, generation, attempt_key: attemptKey, run_id: runId,
            lease_token: token, expires_at: expires, provider_id: model.provider_id, model_policy_id: task.model_policy_id, runtime_id: model.runtime_id };
          const { lease_token: _secret, ...descriptor } = grant;
          this.events.appendEvent({ campaign_id: task.campaign_id, task_id: task.task_id, generation, type: "DispatchRequested", actor: "service:scheduler", payload: descriptor });
          return grant;
        });
        if (grant) return grant;
      } catch (error) {
        if (error instanceof ComathError && ["RESEARCH_BUDGET_EXHAUSTED", "RESEARCH_RESOURCE_WAIT", "COMMIT_PENDING"].includes(error.code)) continue;
        if (!taskId && error instanceof ComathError && ["CAPABILITY_UNSUPPORTED", "RESEARCH_POLICY_UNKNOWN", "RESEARCH_SCOPE_UNAPPROVED", "RESEARCH_SCOPE_MISMATCH", "RESEARCH_BUDGET_CAPABILITY", "BUDGET_NOT_CONFIGURED", "RESEARCH_FAILED_ROUTE_BLOCKED", "RESEARCH_SHARED_HARD_BLOCKER", "CONTEXT_DEFAULT_FORMAL_POLICY_REQUIRED", "CONTEXT_BLIND_BRIEF_REQUIRED"].includes(error.code)) {
          this.runtime.store.transaction(() => {
            const task = this.runtime.store.getTask(candidate.task_id)!;
            this.runtime.store.putTask({ ...task, status: "blocked", blocked_reason: error.code, updated_at: new Date(this.runtime.clock.now()).toISOString() });
            this.events.appendEvent({ campaign_id: task.campaign_id, task_id: task.task_id, type: "TaskAdmissionBlocked", actor: "service:scheduler", payload: { code: error.code } });
          });
          continue;
        }
        throw error;
      }
    }
    return null;
  }
  recordUsage(input: { attempt_key: string; source_key: string; thread_id?: string; usage: Usage; baseline?: Usage }) {
    return this.runtime.store.transaction(() => {
      const result = this.budget.debitCumulative(input);
      const attempt = this.runtime.store.get("SELECT task_id,generation,state FROM attempts WHERE attempt_key=?", input.attempt_key);
      if (!attempt) fail("RESEARCH_ATTEMPT_UNKNOWN", "Unknown usage attempt");
      const task = this.runtime.store.getTask(String(attempt.task_id))!;
      this.events.appendEvent({ campaign_id: task.campaign_id, task_id: task.task_id, generation: Number(attempt.generation),
        type: "UsageUpdated", actor: "service:provider", payload: { attempt_key: input.attempt_key, source_key: input.source_key, usage: input.usage } });
      if (result.stop_required && task.generation === Number(attempt.generation) && ["leased", "running"].includes(task.status)) {
        this.runtime.store.putTask({ ...task, status: "cancelling", blocked_reason: "budget_threshold", updated_at: new Date(this.runtime.clock.now()).toISOString() });
        const stamp = new Date(this.runtime.clock.now()).toISOString();
        this.runtime.store.run("UPDATE attempts SET state='cancelling',fault_reason='budget_threshold',stop_reason='budget',stop_requested_at=?,fenced_at=?,grace_deadline_at=NULL WHERE attempt_key=?", stamp, stamp, input.attempt_key);
        this.runtime.store.run("UPDATE tool_executions SET stop_intent='budget_threshold' WHERE attempt_key=? AND state<>'terminated'", input.attempt_key);
        this.events.appendEvent({ campaign_id: task.campaign_id, task_id: task.task_id, generation: task.generation, type: "TaskStopRequested", actor: "service:scheduler", payload: { reason: "budget_threshold", attempt_key: input.attempt_key } });
        this.runtime.store.afterCommit(() => {
          try { const pending = this.hooks.onStopRequested?.(input.attempt_key, "budget_threshold");
            if (pending) void pending.catch(error => this.recordCallbackFailure(task, "StopCallbackFailed", error));
          } catch (error) { this.recordCallbackFailure(task, "StopCallbackFailed", error); }
        });
      }
      return result;
    });
  }
  confirmTermination(attemptKey: string, confirmation: { termination_confirmed: boolean; usage_complete: boolean }) {
    return this.runtime.store.transaction(() => {
      const attempt = this.runtime.store.get("SELECT task_id,generation,state FROM attempts WHERE attempt_key=?", attemptKey);
      if (!attempt) fail("RESEARCH_ATTEMPT_UNKNOWN", "Unknown attempt");
      this.resources.releaseAttemptPermits(attemptKey, confirmation);
      const settlement = this.budget.settle(attemptKey, confirmation);
      if (attempt.state !== "terminated") {
        this.runtime.store.run("UPDATE attempts SET state='terminated' WHERE attempt_key=?", attemptKey);
        const task = this.runtime.store.getTask(String(attempt.task_id))!;
        if (task.generation === Number(attempt.generation) && ["leased", "running", "cancelling"].includes(task.status)) {
          this.runtime.store.putTask({ ...task, status: "blocked", blocked_reason: task.blocked_reason ?? "runtime_ended_without_result", updated_at: new Date(this.runtime.clock.now()).toISOString() });
        }
        this.events.appendEvent({ campaign_id: task.campaign_id, task_id: task.task_id, generation: Number(attempt.generation), type: "TerminationConfirmed", actor: "service:runtime", payload: { attempt_key: attemptKey, usage_complete: confirmation.usage_complete } });
      }
      this.runtime.store.afterCommit(() => this.wake());
      return settlement;
    });
  }
  private recordCallbackFailure(task: ResearchTask, type: string, error: unknown): void {
    if (this.closed) return;
    this.events.appendEvent({ campaign_id: task.campaign_id, task_id: task.task_id, generation: task.generation, type,
      actor: "service:scheduler", payload: { error_type: error instanceof Error ? error.name : "Error", termination_confirmed: false } });
  }
  start(): void {
    if (this.closed) fail("RESEARCH_SCHEDULER_CLOSED", "Scheduler is closed");
    if (this.admissionsStopped) fail("RESEARCH_ADMISSIONS_STOPPED", "Scheduler is draining");
    if (this.running) return; this.running = true;
    if (this.hooks.auto_poll !== false) { this.timer = setInterval(() => this.wake(), 1000); this.timer.unref(); }
    this.wake();
  }
  wake(): void {
    if (!this.running || this.closed || this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => { this.scheduled = false; if (this.running && !this.closed) this.pump(); });
  }
  pump(): void {
    if (this.pumping || this.closed) return; this.pumping = true;
    try {
      for (let count = 0; count < this.config.max_active_workers; count++) {
        const grant = this.grantNext(); if (!grant) break;
        const task = this.runtime.store.getTask(grant.task_id)!;
        try {
          const pending = (this.dispatchHandlers.get(grant.task_id) ?? this.hooks.onDispatch)?.(grant);
          if (pending) void pending.catch(error => this.recordCallbackFailure(task, "DispatchCallbackFailed", error));
        } catch (error) { this.recordCallbackFailure(task, "DispatchCallbackFailed", error); }
      }
    } finally { this.pumping = false; }
  }
  /** Permanently stop grants while keeping usage and termination settlement available. */
  stopGrants(): void {
    this.admissionsStopped = true; this.running = false;
    if (this.timer) { clearInterval(this.timer); this.timer = undefined; }
  }
  close(): void {
    this.stopGrants();
    this.running = false; this.closed = true; if (this.timer) clearInterval(this.timer);
    this.unsubscribe(); this.events.close(); if (liveSchedulers.get(this.runtime) === this) liveSchedulers.delete(this.runtime);
    this.dispatchHandlers.clear();
    this.legacyValidators.clear();
  }
}
export function getCurrentResearchResourceConfig(runtime: ProjectRuntime): ResearchResourceConfig | undefined {
  return liveSchedulers.get(runtime)?.getResourceConfig();
}
export function createPortfolioScheduler(runtime: ProjectRuntime, config: ResearchResourceConfig, hooks: PortfolioSchedulerHooks): PortfolioScheduler {
  const existing = liveSchedulers.get(runtime);
  if (existing) return existing;
  const scheduler = new PortfolioScheduler(runtime, config, hooks); liveSchedulers.set(runtime, scheduler); return scheduler;
}
