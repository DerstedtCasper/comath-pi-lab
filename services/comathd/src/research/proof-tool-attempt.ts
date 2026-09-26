import { createHash } from "node:crypto";
import { z } from "zod";
import { ComathError } from "../errors.js";
import { canonicalJson } from "../verification/runner-contracts.js";
import { getCampaign } from "../proof-kernel/campaign/research-campaign.js";
import { requireApprovedFormalScope } from "../proof-kernel/campaign/formal-spec-store.js";
import type { OwnedProcessHandle, OwnedToolProcessBinding } from "../agents/runtime/owned-process-session.js";
import { getAcquiredProjectRuntime, type ProjectRuntime } from "./project-runtime.js";
import { assertProjectReadable } from "./project-commit.js";
import { createBudgetLedger, type BudgetDebitResult } from "./budget-ledger.js";
import { createResourceAdmission, type ResearchResourceConfig } from "./resource-admission.js";
import type { ResearchTask, ScopeBinding, Usage } from "./research-schemas.js";

const id = z.string().min(1).max(160).refine(value => !["__proto__", "constructor", "prototype"].includes(value)), count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const startSchema = z.strictObject({ command_id: id, task_id: id, expected_generation: count });
const toolSchema = z.strictObject({ attempt_key: id, execution_id: id, kind: z.literal("lean"), command_ref: id });
const wallSchema = z.strictObject({ attempt_key: id, execution_id: id, cumulative_wall_ms: count });
const hash = (value: unknown) => createHash("sha256").update(canonicalJson(value)).digest("hex");
const same = (left: unknown, right: unknown) => canonicalJson(left) === canonicalJson(right);
function fail(code: string): never { throw new ComathError(code, { code, statusCode: 409 }); }
const usage = (calls: number, wall: number): Usage => ({ input_tokens: 0, cached_input_tokens: 0, output_tokens: 0, reasoning_output_tokens: 0,
  tool_calls: calls, wall_ms: wall, cost_microusd: 0 });
export type ProofToolAttemptBinding = { task_id: string; campaign_id: string; generation: number; attempt_key: string; run_id: string;
  obligation_id: string; scope: Extract<ScopeBinding, { kind: "formal" }>; expires_at: string; proof_authority: "none" };
type ToolUsage = { kind: "lean" | "cas" | "retrieval"; command_ref: string; called: boolean; wall_ms: number; termination_confirmed: boolean };
export type ProofToolAttemptState = { binding: ProofToolAttemptBinding; state: "running" | "cancelling" | "unreconciled" | "settled";
  tools: Record<string, ToolUsage>; stop_reason?: string };
export type ProofToolCallReceipt = { granted: boolean; execution_id: string; ownership?: OwnedToolProcessBinding; completed?: boolean;
  waiting_reason?: string; stop_required: boolean; tool_call_limit_reached: boolean; budget_stop_required: boolean };
const stateKey = (attemptKey: string) => `proof-tool-attempt:${attemptKey}`;

/** Service-only accounting/admission for already-created proof_workflow tasks; never a worker scheduler. */
export function createProofToolAttemptService(runtime: ProjectRuntime, options: { resourceConfig: () => ResearchResourceConfig; lease_ttl_ms?: number }) {
  const store = runtime.store, budget = createBudgetLedger(runtime), admission = createResourceAdmission(runtime, options.resourceConfig);
  if (options.lease_ttl_ms !== undefined && (!Number.isSafeInteger(options.lease_ttl_ms) || options.lease_ttl_ms < 1)) fail("PROOF_TOOL_LEASE_INVALID");
  function owner() { if (getAcquiredProjectRuntime(runtime.root) !== runtime || runtime.referenceCount < 1) fail("RESEARCH_OWNER_REQUIRED"); }
  function readAttempt(attemptKey: string): ProofToolAttemptState | undefined {
    owner(); id.parse(attemptKey);
    const row = store.get("SELECT * FROM commands WHERE command_id=?", stateKey(attemptKey)); if (!row) return undefined;
    const state = JSON.parse(String(row.response_json)) as ProofToolAttemptState;
    if (row.principal_id !== "service:proof-tool-attempt" || row.status !== "committed" || row.request_sha256 !== hash(state)
      || state.binding.attempt_key !== attemptKey || state.binding.proof_authority !== "none") fail("PROOF_TOOL_STATE_CORRUPT");
    return state;
  }
  function save(state: ProofToolAttemptState) {
    store.run("INSERT INTO commands(command_id,principal_id,request_sha256,response_json,status) VALUES (?,'service:proof-tool-attempt',?,?,'committed') ON CONFLICT(command_id) DO UPDATE SET request_sha256=excluded.request_sha256,response_json=excluded.response_json",
      stateKey(state.binding.attempt_key), hash(state), canonicalJson(state));
  }
  function bound(attemptKey: string) {
    const state = readAttempt(attemptKey); if (!state) fail("PROOF_TOOL_ATTEMPT_UNKNOWN");
    const task = store.getTask(state.binding.task_id), attempt = store.get("SELECT * FROM attempts WHERE attempt_key=?", attemptKey);
    if (!task || !attempt || task.kind !== "proof_workflow" || task.generation !== state.binding.generation || task.campaign_id !== state.binding.campaign_id
      || attempt.task_id !== task.task_id || Number(attempt.generation) !== task.generation || attempt.runtime_kind !== "service-proof-tool"
      || attempt.lease_token_hash !== null || !same(task.scope, state.binding.scope)) fail("PROOF_TOOL_ATTEMPT_MISMATCH");
    return { state, task, attempt };
  }
  function approvedTask(task: ResearchTask) {
    if (task.kind !== "proof_workflow" || task.scope.kind !== "formal" || task.budget.output_tokens !== 0 || task.budget.tool_calls < 1
      || task.budget.token_enforcement === "wall_only_legacy") fail("PROOF_TOOL_TASK_INVALID");
    const scope = task.scope;
    assertProjectReadable(runtime.root, undefined, task.campaign_id);
    const approved = requireApprovedFormalScope(runtime, task.campaign_id, task.scope), campaign = getCampaign(runtime.root, task.campaign_id);
    if (store.getCampaign(task.campaign_id)?.state !== "running" || campaign?.status !== "running"
      || campaign.active_obligation_id !== approved.obligation_binding.obligation_id
      || !campaign.open_obligations.some(item => item.obligation_id === approved.obligation_binding.obligation_id && item.claim_id === scope.claim_id
        && same(item.locked_statement_structured.approved_scope, task.scope))) fail("PROOF_TOOL_SCOPE_INACTIVE");
    return approved;
  }
  function active(attemptKey: string) {
    const found = bound(attemptKey);
    if (found.state.state !== "running" || found.task.status !== "running" || found.attempt.state !== "running" || found.attempt.fenced_at
      || found.attempt.stop_requested_at || Number(found.attempt.termination_confirmed) !== 0
      || !Number.isFinite(Date.parse(String(found.attempt.expires_at)))
      || runtime.clock.now() >= Date.parse(String(found.attempt.expires_at))) fail("PROOF_TOOL_ATTEMPT_INACTIVE");
    approvedTask(found.task); return found;
  }
  function startAttempt(raw: z.infer<typeof startSchema>): ProofToolAttemptBinding {
    owner(); const input = startSchema.parse(raw), key = `proof-tool-start:${hash(input.command_id)}`, requestHash = hash(input);
    return store.transaction(() => {
      const old = store.get("SELECT * FROM commands WHERE command_id=?", key);
      if (old) {
        if (old.principal_id !== "service:proof-tool-start" || old.status !== "committed" || old.request_sha256 !== requestHash) fail("PROOF_TOOL_COMMAND_CONFLICT");
        const binding = JSON.parse(String(old.response_json)) as ProofToolAttemptBinding;
        if (!same(readAttempt(binding.attempt_key)?.binding, binding)) fail("PROOF_TOOL_STATE_CORRUPT"); return binding;
      }
      const task = store.getTask(input.task_id);
      if (!task || task.generation !== input.expected_generation || task.status !== "queued"
        || store.get("SELECT attempt_key FROM attempts WHERE task_id=? LIMIT 1", input.task_id)) fail("PROOF_TOOL_TASK_NOT_QUEUED");
      if (task.depends_on.some(dependency => store.getTask(dependency)?.status !== "succeeded")) fail("PROOF_TOOL_DEPENDENCIES_UNMET");
      const approved = approvedTask(task), generation = task.generation + 1;
      if (!Number.isSafeInteger(generation)) fail("PROOF_TOOL_GENERATION_INVALID");
      const runId = store.allocateId("ARUN"), attemptKey = `proof:${runId}:g${generation}`;
      const expires = new Date(runtime.clock.now() + Math.min(task.budget.wall_ms, options.lease_ttl_ms ?? task.budget.wall_ms)).toISOString();
      const running = { ...task, generation, status: "running" as const, updated_at: new Date(runtime.clock.now()).toISOString() };
      store.putTask(running);
      store.run("INSERT INTO attempts(task_id,generation,attempt_key,run_id,state,expires_at,runtime_kind,last_heartbeat_at) VALUES (?,?,?,?,'running',?,'service-proof-tool',?)",
        task.task_id, generation, attemptKey, runId, expires, running.updated_at);
      budget.reserve(running, attemptKey);
      budget.debitCumulative({ attempt_key: attemptKey, source_key: "service-proof-tools", usage: usage(0, 0) });
      const binding: ProofToolAttemptBinding = { task_id: task.task_id, campaign_id: task.campaign_id, generation, attempt_key: attemptKey, run_id: runId,
        obligation_id: approved.obligation_binding.obligation_id, scope: approved.scope, expires_at: expires, proof_authority: "none" };
      save({ binding, state: "running", tools: {} });
      store.run("INSERT INTO commands(command_id,principal_id,request_sha256,response_json,status) VALUES (?,'service:proof-tool-start',?,?,'committed')", key, requestHash, canonicalJson(binding));
      return binding;
    });
  }
  function limits(state: ProofToolAttemptState, task: ResearchTask, debit?: BudgetDebitResult) {
    const calls = Object.values(state.tools).filter(value => value.called).length, wall = Object.values(state.tools).reduce((sum, value) => sum + value.wall_ms, 0);
    const otherStop = wall >= task.budget.wall_ms || debit?.state === "unreconciled"
      || [debit?.campaign, debit?.pool_account].some(account => account && Object.values(account.overrun).some(amount => (amount ?? 0) > 0));
    return { stop_required: !!otherStop, tool_call_limit_reached: calls >= task.budget.tool_calls, budget_stop_required: debit?.stop_required ?? false };
  }
  function beginTool(raw: z.infer<typeof toolSchema>): ProofToolCallReceipt {
    const input = toolSchema.parse(raw);
    return store.transaction(() => {
      const { state, task } = active(input.attempt_key), previous = state.tools[input.execution_id];
      if (previous && (previous.kind !== input.kind || previous.command_ref !== input.command_ref)) fail("PROOF_TOOL_EXECUTION_CONFLICT");
      if (previous?.termination_confirmed) return { granted: false, execution_id: input.execution_id, completed: true, ...limits(state, task) };
      if (!previous?.called && (limits(state, task).stop_required || limits(state, task).tool_call_limit_reached)) fail("PROOF_TOOL_BUDGET_EXHAUSTED");
      const permit = admission.acquireToolPermit(input);
      const tool = previous ?? { kind: input.kind, command_ref: input.command_ref, called: false, wall_ms: 0, termination_confirmed: false };
      state.tools[input.execution_id] = tool;
      let debit: BudgetDebitResult | undefined;
      if (permit.granted && !tool.called) {
        tool.called = true;
        debit = budget.debitCumulative({ attempt_key: input.attempt_key, source_key: `tool:${hash(input.execution_id)}`, usage: usage(1, 0) });
      }
      save(state);
      return { ...permit, ...limits(state, task, debit), ...(permit.granted ? { ownership: { ...state.binding, execution_id: input.execution_id, command_ref: input.command_ref } } : {}) };
    });
  }
  function observeToolWall(raw: z.infer<typeof wallSchema>) {
    const input = wallSchema.parse(raw);
    return store.transaction(() => {
      const { state, task } = bound(input.attempt_key), tool = state.tools[input.execution_id];
      if (!tool?.called) fail("PROOF_TOOL_EXECUTION_UNKNOWN");
      if (state.state === "settled" && input.cumulative_wall_ms !== tool.wall_ms) fail("PROOF_TOOL_ALREADY_SETTLED");
      const debit = budget.debitCumulative({ attempt_key: input.attempt_key, source_key: `tool:${hash(input.execution_id)}`, usage: usage(1, input.cumulative_wall_ms) });
      tool.wall_ms = Math.max(tool.wall_ms, input.cumulative_wall_ms);
      if (debit.state === "unreconciled") state.state = "unreconciled";
      save(state); return { ...limits(state, task, debit), debit };
    });
  }
  function completeTool(input: z.infer<typeof wallSchema> & { termination_confirmed: boolean; handle?: OwnedProcessHandle }) {
    const raw = wallSchema.parse({ attempt_key: input.attempt_key, execution_id: input.execution_id, cumulative_wall_ms: input.cumulative_wall_ms });
    return store.transaction(() => {
      const observed = observeToolWall(raw), { state } = bound(raw.attempt_key), tool = state.tools[raw.execution_id]!;
      const execution = store.get("SELECT * FROM tool_executions WHERE execution_id=? AND attempt_key=?", raw.execution_id, raw.attempt_key);
      if (!execution || input.termination_confirmed !== true || execution.handle_json && (!input.handle || !same(JSON.parse(String(execution.handle_json)), input.handle))
        || !execution.handle_json && !["admitted", "terminated"].includes(String(execution.state))) {
        budget.markUnreconciled(raw.attempt_key); state.state = "unreconciled"; save(state);
        return { ...observed, released: false, stop_required: true };
      }
      tool.termination_confirmed = true; admission.releaseToolPermit(raw.execution_id, { termination_confirmed: true }); save(state);
      return { ...observed, released: true };
    });
  }
  function pendingHandles(attemptKey: string) {
    return store.all("SELECT execution_id,handle_json,state FROM tool_executions WHERE attempt_key=? AND state NOT IN ('terminated','waiting')", attemptKey)
      .map(row => ({ execution_id: String(row.execution_id), state: String(row.state), handle: row.handle_json ? JSON.parse(String(row.handle_json)) as OwnedProcessHandle : null }));
  }
  function cancelAttempt(attemptKey: string, reason = "cancel") {
    id.parse(reason);
    return store.transaction(() => {
      const { state, task } = bound(attemptKey);
      if (state.state === "settled") return { binding: state.binding, handles: [], settled: true };
      const stamp = new Date(runtime.clock.now()).toISOString(); state.state = "cancelling"; state.stop_reason = reason; save(state);
      store.run("UPDATE attempts SET state='cancelling',stop_requested_at=?,stop_reason=? WHERE attempt_key=?", stamp, reason, attemptKey);
      store.run("UPDATE tool_executions SET stop_intent=? WHERE attempt_key=? AND state<>'terminated'", reason, attemptKey);
      store.putTask({ ...task, status: "cancelling", updated_at: stamp });
      return { binding: state.binding, handles: pendingHandles(attemptKey), settled: false };
    });
  }
  function recoverAttempt(attemptKey: string) {
    return store.transaction(() => {
      const { state, task } = bound(attemptKey);
      if (state.state === "settled") return { binding: state.binding, handles: [], settled: true };
      budget.markUnreconciled(attemptKey); state.state = "unreconciled"; state.stop_reason = "service_recovery_unknown"; save(state);
      store.run("UPDATE attempts SET state='unreconciled',fault_reason='service_recovery_unknown' WHERE attempt_key=?", attemptKey);
      store.run("UPDATE tool_executions SET stop_intent='service_recovery_unknown' WHERE attempt_key=? AND state<>'terminated'", attemptKey);
      store.putTask({ ...task, status: "blocked", blocked_reason: "service_tool_unreconciled", updated_at: new Date(runtime.clock.now()).toISOString() });
      return { binding: state.binding, handles: pendingHandles(attemptKey), settled: false };
    });
  }
  function finishAttempt(raw: { attempt_key: string; outcome: "succeeded" | "failed" | "cancelled"; usage_complete: boolean }) {
    const input = z.strictObject({ attempt_key: id, outcome: z.enum(["succeeded", "failed", "cancelled"]), usage_complete: z.boolean() }).parse(raw);
    return store.transaction(() => {
      const { state, task } = bound(input.attempt_key);
      if (state.state === "settled") return { binding: state.binding, released: true, state: "settled" as const };
      if (pendingHandles(input.attempt_key).length || Object.values(state.tools).some(tool => tool.called && !tool.termination_confirmed)) {
        budget.markUnreconciled(input.attempt_key); state.state = "unreconciled"; save(state);
        return { binding: state.binding, released: false, state: "unreconciled" as const };
      }
      const settlement = budget.settle(input.attempt_key, { termination_confirmed: true, usage_complete: input.usage_complete });
      if (!settlement.released) { state.state = "unreconciled"; save(state); return { binding: state.binding, released: false, state: "unreconciled" as const }; }
      admission.releaseAttemptPermits(input.attempt_key, { termination_confirmed: true });
      state.state = "settled"; save(state);
      store.run("UPDATE attempts SET state='terminated',termination_confirmed=1 WHERE attempt_key=?", input.attempt_key);
      const { blocked_reason: ignored, ...clean } = task;
      store.putTask({ ...clean, status: state.stop_reason === "service_recovery_unknown" ? "failed" : state.stop_reason ? "cancelled" : input.outcome, updated_at: new Date(runtime.clock.now()).toISOString() });
      return { binding: state.binding, released: true, state: "settled" as const };
    });
  }
  return { startAttempt, beginTool, observeToolWall, completeTool, finishAttempt, cancelAttempt, recoverAttempt, readAttempt };
}
