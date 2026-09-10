import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { ComathError } from "../../errors.js";
import { getAgentRun } from "../agent-run-store.js";
import type { AgentRun } from "../../types/schemas.js";
import { createPortfolioScheduler, getCurrentResearchResourceConfig, type PortfolioScheduler, type ResearchGrant } from "../../research/portfolio-scheduler.js";
import { assertProjectReadable, reconcileTrustCommits } from "../../research/project-commit.js";
import { getAcquiredProjectRuntime, ProjectRuntime } from "../../research/project-runtime.js";
import type { ResearchResourceConfig } from "../../research/resource-admission.js";
import type { ResearchTask, ScopeBinding, TaskBudget, Usage } from "../../research/research-schemas.js";

export type LegacyBackend = "process" | "codex-api";
export type LegacyBoundPolicy = { scope: ScopeBinding; model_policy_id: string; tool_policy_id: string; budget: TaskBudget; pool: ResearchTask["pool"] };
export type LegacyRuntimeHostPolicy = { allowed_programs?: string[]; timeout_ms?: number; resources?: ResearchResourceConfig; legacy_wall_budget_ms?: number;
  resolveBoundCampaign?: (runtime: ProjectRuntime, run: AgentRun, backend: LegacyBackend) => LegacyBoundPolicy };
export type LegacyExecutionInput = { project_id: string; run_id: string; backend: LegacyBackend; timeout_ms: number; actor: string };
export type LegacyExecutionOutcome<T> = { value: T; status: "succeeded" | "failed" | "cancelled"; termination_confirmed: boolean; usage?: Usage };
type ExecutionHandle = { controller: AbortController; task_id: string; attempt_key?: string; promise: Promise<unknown>; cancelQueued?: () => void };
type RuntimeContext = { runtime: ProjectRuntime; scheduler: PortfolioScheduler; references: number; owned: boolean; handles: Map<string, ExecutionHandle>; host: LegacyRuntimeHostPolicy };
const hosts = new Map<string, LegacyRuntimeHostPolicy>(), contexts = new Map<string, Promise<RuntimeContext>>();
const clock = { now: () => Date.now() }, executors = {};
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const keyFor = (root: string) => { const key = realpathSync(root); return process.platform === "win32" ? key.toLowerCase() : key; };
function fail(code: string, message: string): never { throw new ComathError(message, { code, statusCode: 409 }); }
export function configureLegacyRuntimeHost(root: string, policy: LegacyRuntimeHostPolicy): void {
  const key = keyFor(root); if (contexts.has(key)) fail("LEGACY_HOST_POLICY_ACTIVE", "Configure legacy host policy before acquiring execution runtime");
  hosts.set(key, policy);
}
export function legacyHostPrograms(root: string): string[] {
  const configured = hosts.get(keyFor(root))?.allowed_programs;
  const configuredCli = process.env.COMATH_CODEX_CLI_PROGRAM ?? process.env.COMATH_CODEX_EXTERNAL_PROGRAM;
  return configured ? [...configured] : [process.execPath, ...(configuredCli ? [configuredCli] : [])];
}
export function verifyLegacyRuntimeQuiescence(root: string) {
  const lockPath = join(root, ".comath/sessions/writer.lock.json");
  if (existsSync(lockPath)) { const lock = JSON.parse(readFileSync(lockPath, "utf8")); if (!lock.released_at) fail("MIGRATION_BLOCKED", "A legacy writer has not released its session lock"); }
  const runs = join(root, ".comath/agents/runs");
  if (existsSync(runs)) for (const entry of readdirSync(runs, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
    const path = join(runs, entry.name, "status.json");
    if (existsSync(path)) { const run = JSON.parse(readFileSync(path, "utf8")); if (["running", "cancelling"].includes(run.status)) fail("MIGRATION_BLOCKED", "A legacy AgentRun has no confirmed termination"); }
  }
  // No pre-control service/tool executors can be active under this acquired owner.
  // Existing research databases are reopened through their migration receipt, not this legacy branch.
  if (existsSync(join(root, ".comath/control/research.sqlite"))) fail("MIGRATION_BLOCKED", "A legacy control database requires an explicit maintenance migration");
  return { admissions_stopped: true, workers_stopped: true, tools_stopped: true, writers_quiet: true, pending_commits_reconciled: true };
}
function defaults(): ResearchResourceConfig { return { max_active_workers: 4, provider_policies: { legacy: { max_sessions: 4, launch_rpm: 4 } },
  model_policies: { "legacy-process": { provider_id: "legacy", runtime_id: "legacy-process", model: "legacy-host" }, "legacy-codex-api": { provider_id: "legacy", runtime_id: "legacy-codex-api", model: "legacy-api" } } }; }
async function acquire(root: string): Promise<RuntimeContext> {
  const key = keyFor(root);
  let pending = contexts.get(key);
  if (!pending) {
    pending = (async () => {
      const existing = getAcquiredProjectRuntime(root), host = hosts.get(key) ?? {};
      const runtime = existing ?? await ProjectRuntime.acquire(root, { clock, executor: executors, migration: { quiesce: async () => verifyLegacyRuntimeQuiescence(root) } });
      try {
        reconcileTrustCommits(root);
        const current = getCurrentResearchResourceConfig(runtime), fallback = defaults();
        const config: ResearchResourceConfig = current ?? host.resources ?? fallback;
        const combined = { ...config, provider_policies: { ...fallback.provider_policies, ...config.provider_policies }, model_policies: { ...fallback.model_policies, ...config.model_policies } };
        const context: RuntimeContext = { runtime, scheduler: undefined as unknown as PortfolioScheduler, references: 0, owned: !existing, handles: new Map(), host };
        context.scheduler = createPortfolioScheduler(runtime, combined, { capabilities: () => ({ exact_output_cap: false }),
          validateTask: task => {
            if (task.kind !== "legacy_run" || !context.handles.has(task.legacy_run_id ?? "")) fail("RESEARCH_POLICY_UNKNOWN", "Legacy execution has no host-owned dispatch binding");
          }, onStopRequested: async attemptKey => { for (const handle of context.handles.values()) if (handle.attempt_key === attemptKey) handle.controller.abort(); } });
        context.scheduler.updateConfig(combined);
        return context;
      } catch (cause) { if (!existing) await runtime.release(); throw cause; }
    })();
    contexts.set(key, pending);
    void pending.catch(() => { if (contexts.get(key) === pending) contexts.delete(key); });
  }
  const context = await pending; context.references++; return context;
}
export async function withLegacyRuntime<T>(root: string, callback: () => Promise<T>): Promise<T> {
  const context = await acquire(root);
  try { return await callback(); }
  finally {
    context.references--;
  }
}
/** The daemon/embedded host owns shutdown; an individual execution does not close its shared owner. */
export async function closeLegacyRuntime(root: string): Promise<void> {
  const key = keyFor(root), pending = contexts.get(key); if (!pending) return;
  const context = await pending;
  if (context.references > 0 || context.handles.size > 0) fail("LEGACY_RUNTIME_BUSY", "Cannot close legacy runtime while executions are active");
  if (context.owned) { context.scheduler.close(); await context.runtime.release(); }
  contexts.delete(key);
}
/** Host shutdown cancels accepted legacy work, then waits before releasing the borrowed store. */
export async function shutdownLegacyRuntime(root: string): Promise<void> {
  const pending = contexts.get(keyFor(root)); if (!pending) return;
  const context = await pending;
  const executions = [...context.handles.entries()];
  for (const [runId] of executions) cancelLegacyExecution(root, runId, "service:shutdown");
  await Promise.allSettled(executions.map(([, handle]) => handle.promise));
  // withLegacyRuntime releases its reference in the awaiting caller's finally.
  await new Promise<void>(resolve => setImmediate(resolve));
  await closeLegacyRuntime(root);
}
function internalTask(context: RuntimeContext, input: LegacyExecutionInput, run: AgentRun): ResearchTask {
  const { runtime, scheduler, host } = context, now = new Date(runtime.clock.now()).toISOString();
  const bound = run.campaign_id ? runtime.store.getCampaign(run.campaign_id) : undefined;
  const campaignId = bound?.campaign_id ?? `LEGACY-${hash(input.project_id).slice(0, 24)}`;
  let policy: LegacyBoundPolicy;
  if (bound) {
    if (!host.resolveBoundCampaign) fail("RESEARCH_BUDGET_CAPABILITY", "A research-bound legacy run requires explicit host scope/model/tool/budget mapping");
    policy = host.resolveBoundCampaign(runtime, run, input.backend);
    if (policy.budget.token_enforcement === "wall_only_legacy" || policy.budget.token_enforcement === "exact_output_cap") fail("RESEARCH_BUDGET_CAPABILITY", "Legacy execution cannot bypass or guarantee a research token cap");
  } else {
    const charter = { goal: "Run authorized legacy agents without mathematical proof authority", approach_hints: [], constraints: ["No proof promotion"], success_criteria: ["Record execution outcomes"], sha256: hash(`legacy:${input.project_id}`) };
    if (!runtime.store.getCampaign(campaignId)) {
      runtime.store.putCampaign({ campaign_id: campaignId, project_id: input.project_id, revision: 0, state: "running", charter,
        max_active_workers: scheduler.getResourceConfig().max_active_workers, budget_policy_id: "legacy-host-wall", supervisor: { dirty: false, last_event_seq: 0, ordinary_completed_since_trigger: 0, next_trigger_at: now }, snapshot_seq: 0 });
      const limits = { output_tokens: 0, tool_calls: 0, wall_ms: host.legacy_wall_budget_ms ?? 24 * 60 * 60 * 1000, enforcement: "legacy_wall_only" as const };
      scheduler.budget.configure(campaignId, limits, { exploration: limits, deepening: limits, validation: limits, formalization: limits });
    }
    policy = { scope: { kind: "charter", charter_sha256: charter.sha256 }, model_policy_id: input.backend === "process" ? "legacy-process" : "legacy-codex-api", tool_policy_id: "legacy-host-tools", pool: "exploration",
      budget: { output_tokens: 0, tool_calls: 0, wall_ms: input.timeout_ms, token_enforcement: "wall_only_legacy" } };
  }
  return { task_id: `LEGACY-${run.id}`, legacy_run_id: run.id, campaign_id: campaignId, depends_on: [], kind: "legacy_run",
    question: `Execute authorized AgentRun ${run.id} in workstream ${run.workstream_id}`, acceptance: ["Persist terminal execution evidence"], role_template: run.role,
    model_policy_id: policy.model_policy_id, tool_policy_id: policy.tool_policy_id, scope: policy.scope, pool: policy.pool, priority: 2, budget: policy.budget,
    method_family: "legacy-execution", problem_slice: run.workstream_id, coupling_label: "legacy-host", input_refs: [], exclusions: [], status: "queued", generation: 0, fault_retry_count: 0, created_at: now, updated_at: now };
}
export async function runLegacyExecution<T>(root: string, input: LegacyExecutionInput,
  execute: (grant: ResearchGrant, signal: AbortSignal) => Promise<LegacyExecutionOutcome<T>>, cancelledBeforeStart: () => T): Promise<T> {
  return withLegacyRuntime(root, async () => {
    const context = await contexts.get(keyFor(root))!, { runtime, scheduler } = context;
    const timeoutCap = context.host.timeout_ms ?? 600000;
    if (!Number.isSafeInteger(input.timeout_ms) || input.timeout_ms < 1 || input.timeout_ms > timeoutCap) fail("LEGACY_TIMEOUT_DENIED", "Legacy timeout exceeds host policy");
    const existing = context.handles.get(input.run_id); if (existing) return existing.promise as Promise<T>;
    const run = getAgentRun(root, input.project_id, input.run_id);
    const saved = runtime.store.get("SELECT response_json FROM commands WHERE command_id=? AND principal_id='service:legacy-execution'", `legacy-result:${input.run_id}`);
    if (saved) return JSON.parse(String(saved.response_json)) as T;
    if (run.status !== "queued") fail("INVALID_AGENT_RUN_TRANSITION", "Legacy run is not queued for execution");
    const task = runtime.store.transaction(() => {
      const old = runtime.store.getTask(`LEGACY-${run.id}`);
      if (old) { if (old.status !== "queued") fail("LEGACY_EXECUTION_RECOVERY_REQUIRED", "Prior legacy attempt requires ownership recovery"); return old; }
      const value = internalTask(context, input, run); runtime.store.putTask(value); return value;
    });
    let resolveResult!: (value: T) => void, rejectResult!: (cause: unknown) => void;
    const result = new Promise<T>((resolve, reject) => { resolveResult = resolve; rejectResult = reject; });
    const handle: ExecutionHandle = { task_id: task.task_id, controller: new AbortController(), promise: result };
    context.handles.set(input.run_id, handle);
    const dispose = scheduler.registerDispatchHandler(task.task_id, async grant => {
      handle.attempt_key = grant.attempt_key;
      const started = runtime.clock.now();
      if (input.backend === "codex-api") runtime.store.transaction(() => {
        const current = runtime.store.getTask(task.task_id)!;
        runtime.store.putTask({ ...current, status: "running", updated_at: new Date(runtime.clock.now()).toISOString() });
        runtime.store.run("UPDATE attempts SET state='running',runtime_handle_json=? WHERE attempt_key=?", JSON.stringify({ runtime_kind: "codex-api", attempt_key: grant.attempt_key, service_pid: process.pid }), grant.attempt_key);
      });
      const heartbeat = setInterval(() => {
        const current = runtime.store.getTask(task.task_id), attempt = runtime.store.get("SELECT * FROM attempts WHERE attempt_key=?", grant.attempt_key);
        if (current?.status === "cancelling" || attempt?.fenced_at) { handle.controller.abort(); return; }
        if (current?.status === "running") runtime.store.run("UPDATE attempts SET last_heartbeat_at=?,expires_at=? WHERE attempt_key=?", new Date(runtime.clock.now()).toISOString(), new Date(runtime.clock.now() + 120000).toISOString(), grant.attempt_key);
      }, 1000);
      try {
        const outcome = await execute(grant, handle.controller.signal);
        const usage: Usage = outcome.usage ?? { input_tokens: null, cached_input_tokens: null, output_tokens: null, reasoning_output_tokens: null, tool_calls: null, wall_ms: Math.max(0, runtime.clock.now() - started), cost_microusd: null };
        runtime.store.transaction(() => {
          scheduler.budget.debitCumulative({ attempt_key: grant.attempt_key, source_key: input.backend, usage });
          const current = runtime.store.getTask(task.task_id)!;
          runtime.store.putTask({ ...current, status: outcome.status, updated_at: new Date(runtime.clock.now()).toISOString() });
          if (outcome.termination_confirmed) scheduler.confirmTermination(grant.attempt_key, { termination_confirmed: true, usage_complete: true });
          else scheduler.budget.markUnreconciled(grant.attempt_key);
          runtime.store.run("INSERT INTO commands(command_id,principal_id,request_sha256,response_json,status) VALUES (?,'service:legacy-execution',?,?,'committed')", `legacy-result:${input.run_id}`, hash(input.run_id), JSON.stringify(outcome.value));
        });
        resolveResult(outcome.value);
      } catch (cause) { scheduler.budget.markUnreconciled(grant.attempt_key); rejectResult(cause); }
      finally { clearInterval(heartbeat); dispose(); context.handles.delete(input.run_id); scheduler.wake(); }
    }, candidate => {
      const boundRun = getAgentRun(root, input.project_id, input.run_id);
      if (candidate.kind !== "legacy_run" || candidate.legacy_run_id !== boundRun.id || candidate.task_id !== `LEGACY-${boundRun.id}`
        || !candidate.campaign_id.startsWith("LEGACY-") || candidate.budget.token_enforcement !== "wall_only_legacy") fail("RESEARCH_POLICY_UNKNOWN", "Legacy dispatch does not match its host-owned binding");
    });
    handle.cancelQueued = () => {
      const current = runtime.store.getTask(task.task_id)!;
      if (current.status !== "queued") return;
      try { runtime.store.putTask({ ...current, status: "cancelled", updated_at: new Date(runtime.clock.now()).toISOString() }); resolveResult(cancelledBeforeStart()); }
      catch (cause) { rejectResult(cause); }
      finally { dispose(); context.handles.delete(input.run_id); }
    };
    scheduler.start(); scheduler.wake();
    return result;
  });
}
export function cancelLegacyExecution(root: string, runId: string, actor: string): boolean {
  const runtime = getAcquiredProjectRuntime(root); if (!runtime) return false;
  const task = runtime.store.getTask(`LEGACY-${runId}`); if (!task || !["queued", "leased", "running", "cancelling"].includes(task.status)) return false;
  assertProjectReadable(root, undefined, task.campaign_id);
  runtime.store.transaction(() => {
    if (task.status !== "queued") {
      runtime.store.putTask({ ...task, status: "cancelling", updated_at: new Date(runtime.clock.now()).toISOString() });
      runtime.store.run("UPDATE attempts SET state='cancelling',stop_reason='user_cancel',stop_requested_at=?,fenced_at=? WHERE task_id=? AND generation=?", new Date(runtime.clock.now()).toISOString(), new Date(runtime.clock.now()).toISOString(), task.task_id, task.generation);
    }
  });
  void contexts.get(keyFor(root))?.then(context => { const handle = context.handles.get(runId); if (!handle) return; handle.controller.abort(); handle.cancelQueued?.(); });
  return true;
}
