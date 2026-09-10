import { z } from "zod";
import { ComathError } from "../errors.js";
import { getAcquiredProjectRuntime, type ProjectRuntime } from "./project-runtime.js";
import { researchPoolSchema, taskBudgetSchema, usageSchema, type ResearchTask, type Usage } from "./research-schemas.js";

const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const limitsSchema = z.strictObject({ output_tokens: count, tool_calls: count, wall_ms: count, cost_microusd: count.optional() });
const amountsSchema = z.strictObject({ output_tokens: count, tool_calls: count, wall_ms: count, cost_microusd: count });
const chargesSchema = amountsSchema.extend({ cost_microusd: count.nullable() });
const poolNames = ["exploration", "deepening", "validation", "formalization"] as const;
const poolLimitsSchema = z.strictObject({ exploration: limitsSchema, deepening: limitsSchema, validation: limitsSchema, formalization: limitsSchema });
const dimensions = ["output_tokens", "tool_calls", "wall_ms", "cost_microusd"] as const;
const usageDimensions = ["input_tokens", "cached_input_tokens", "output_tokens", "reasoning_output_tokens", "tool_calls", "wall_ms", "cost_microusd"] as const;
type Dimension = typeof dimensions[number];
export type BudgetPool = typeof poolNames[number];
export type BudgetLimits = z.infer<typeof limitsSchema>;
export type BudgetAmounts = z.infer<typeof amountsSchema>;
export type PoolBudgetLimits = Record<BudgetPool, BudgetLimits>;
export type BudgetAccountView = { campaign_id: string; pool: BudgetPool | "campaign"; limits: BudgetLimits;
  charged: z.infer<typeof chargesSchema>; reserved: BudgetAmounts; available: z.infer<typeof chargesSchema>;
  overrun: z.infer<typeof chargesSchema>; actual_excess: z.infer<typeof chargesSchema>; unknown_dimensions: Dimension[] };
export type BudgetReservationView = { attempt_key: string; campaign_id: string; pool: BudgetPool;
  state: "active" | "settled" | "unreconciled"; remaining: BudgetAmounts; accounting_epoch: number };
export type DebitCumulativeInput = { attempt_key: string; source_key: string; thread_id?: string; usage: Usage; baseline?: Usage };
export type BudgetDebitResult = BudgetReservationView & { delta: BudgetAmounts; stop_required: boolean;
  campaign: BudgetAccountView; pool_account: BudgetAccountView };
export type BudgetLedger = {
  configure(campaignId: string, limits: BudgetLimits, pools: PoolBudgetLimits): BudgetAccountView;
  reserve(task: ResearchTask, attemptKey: string): BudgetReservationView;
  debitCumulative(input: DebitCumulativeInput): BudgetDebitResult;
  settle(attemptKey: string, input: { termination_confirmed: boolean; usage_complete: boolean }): BudgetReservationView & { released: boolean };
  markUnreconciled(attemptKey: string): BudgetReservationView;
  transferPool(campaignId: string, from: BudgetPool, to: BudgetPool, amounts: Partial<BudgetAmounts>): BudgetAccountView;
  updateLimits(campaignId: string, limits: BudgetLimits, pools?: PoolBudgetLimits): BudgetAccountView;
  read(campaignId: string, pool?: BudgetPool | "campaign"): BudgetAccountView;
};
const metadataSchema = z.strictObject({ version: z.literal(1), task_id: z.string(), campaign_id: z.string(), pool: researchPoolSchema,
  generation: count, initial: amountsSchema, required_dimensions: z.array(z.enum(dimensions)), token_enforcement: taskBudgetSchema.shape.token_enforcement,
  usage: usageSchema, highwaters: z.record(z.string(), usageSchema),
  regressions: z.record(z.string(), z.strictObject({ reported: usageSchema, reason: z.string() })),
  manual_unreconciled: z.boolean(), termination_confirmed: z.boolean() });
type Metadata = z.infer<typeof metadataSchema>;
type Reservation = { attemptKey: string; remaining: BudgetAmounts; metadata: Metadata; state: BudgetReservationView["state"]; epoch: number };
type Account = { limits: BudgetLimits; charged: z.infer<typeof chargesSchema>; reserved: BudgetAmounts };
const zeroAmounts = (): BudgetAmounts => ({ output_tokens: 0, tool_calls: 0, wall_ms: 0, cost_microusd: 0 });
const zeroUsage = (): Usage => ({ input_tokens: 0, cached_input_tokens: 0, output_tokens: 0, reasoning_output_tokens: 0, tool_calls: 0, wall_ms: 0, cost_microusd: 0 });
const unknownUsage = (): Usage => ({ input_tokens: null, cached_input_tokens: null, output_tokens: null, reasoning_output_tokens: null, tool_calls: null, wall_ms: 0, cost_microusd: null });
function failure(code: string, message: string, statusCode = 409): ComathError { return new ComathError(message, { code, statusCode }); }
function add(left: number, right: number): number {
  const result = left + right;
  if (!Number.isSafeInteger(result) || result < 0) throw failure("BUDGET_ACCOUNTING_OVERFLOW", "Budget arithmetic exceeds nonnegative safe integers");
  return result;
}
function configured<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw failure("INVALID_BUDGET_CONFIGURATION", result.error.message, 400);
  return result.data;
}

/** Service-owned accounting only: this module neither accepts worker totals nor launches/stops processes. */
export function createBudgetLedger(runtime: ProjectRuntime): BudgetLedger {
  const store = runtime.store;
  const assertOwner = () => {
    if (getAcquiredProjectRuntime(runtime.root) !== runtime || runtime.referenceCount < 1) throw failure("RESEARCH_OWNER_REQUIRED", "Budget ledger requires its acquired runtime");
  };
  function account(campaignId: string, pool: BudgetPool | "campaign"): Account {
    const row = store.get("SELECT * FROM budget_accounts WHERE campaign_id=? AND pool=?", campaignId, pool);
    if (!row) throw failure("BUDGET_NOT_CONFIGURED", `Budget account is not configured: ${campaignId}/${pool}`);
    return { limits: limitsSchema.parse(JSON.parse(String(row.admission_limit_json))), charged: chargesSchema.parse(JSON.parse(String(row.charged_json))), reserved: amountsSchema.parse(JSON.parse(String(row.reserved_json))) };
  }
  function saveAccount(campaignId: string, pool: BudgetPool | "campaign", value: Account): void {
    store.run("UPDATE budget_accounts SET admission_limit_json=?,charged_json=?,reserved_json=? WHERE campaign_id=? AND pool=?",
      JSON.stringify(value.limits), JSON.stringify(value.charged), JSON.stringify(value.reserved), campaignId, pool);
  }
  function reservation(attemptKey: string): Reservation {
    const row = store.get("SELECT * FROM reservations WHERE attempt_key=?", attemptKey);
    if (!row) throw failure("BUDGET_RESERVATION_NOT_FOUND", "Budget reservation does not exist");
    return { attemptKey, remaining: amountsSchema.parse(JSON.parse(String(row.reserved_json))), metadata: metadataSchema.parse(JSON.parse(String(row.observed_json))),
      state: z.enum(["active", "settled", "unreconciled"]).parse(row.state), epoch: Number(row.accounting_epoch) };
  }
  function saveReservation(value: Reservation): void {
    store.run("UPDATE reservations SET reserved_json=?,observed_json=?,state=?,accounting_epoch=? WHERE attempt_key=?",
      JSON.stringify(value.remaining), JSON.stringify(value.metadata), value.state, value.epoch, value.attemptKey);
  }
  function view(value: Reservation): BudgetReservationView { return { attempt_key: value.attemptKey, campaign_id: value.metadata.campaign_id, pool: value.metadata.pool, state: value.state, remaining: { ...value.remaining }, accounting_epoch: value.epoch }; }
  function snapshots(attemptKey: string): Usage[] { return store.all("SELECT provider_total_json FROM usage_snapshots WHERE attempt_key=?", attemptKey).map(row => usageSchema.parse(JSON.parse(String(row.provider_total_json)))); }
  function unknownDimensions(value: Reservation): Dimension[] {
    const sources = snapshots(value.attemptKey);
    return dimensions.filter(dimension => sources.length === 0 || sources.some(source => source[dimension] === null));
  }
  function requiredMissing(value: Reservation): boolean { return unknownDimensions(value).some(dimension => value.metadata.required_dimensions.includes(dimension)); }
  function read(campaignId: string, pool: BudgetPool | "campaign" = "campaign"): BudgetAccountView {
    assertOwner();
    if (pool !== "campaign") configured(researchPoolSchema, pool);
    const value = account(campaignId, pool);
    const available = { ...zeroAmounts() } as z.infer<typeof chargesSchema>;
    const overrun = { ...zeroAmounts() } as z.infer<typeof chargesSchema>;
    const actualExcess = { ...zeroAmounts() } as z.infer<typeof chargesSchema>;
    for (const dimension of dimensions) {
      const cap = value.limits[dimension];
      if (cap === undefined) { available[dimension] = null as never; overrun[dimension] = null as never; actualExcess[dimension] = null as never; continue; }
      const charged = value.charged[dimension] ?? 0, committed = add(charged, value.reserved[dimension]);
      available[dimension] = Math.max(0, cap - committed); overrun[dimension] = Math.max(0, committed - cap); actualExcess[dimension] = Math.max(0, charged - cap);
    }
    const unknown = new Set<Dimension>();
    if (value.charged.cost_microusd === null) unknown.add("cost_microusd");
    for (const row of store.all("SELECT r.attempt_key,r.observed_json FROM reservations r JOIN attempts a ON a.attempt_key=r.attempt_key JOIN tasks t ON t.task_id=a.task_id WHERE t.campaign_id=?", campaignId)) {
      const metadata = metadataSchema.parse(JSON.parse(String(row.observed_json)));
      if (pool === "campaign" || metadata.pool === pool) for (const dimension of unknownDimensions(reservation(String(row.attempt_key)))) unknown.add(dimension);
    }
    return { campaign_id: campaignId, pool, limits: value.limits, charged: value.charged, reserved: value.reserved,
      available, overrun, actual_excess: actualExcess, unknown_dimensions: [...unknown] };
  }
  function assertAffordable(value: Account, requested: BudgetAmounts, scope: string): void {
    for (const dimension of dimensions) {
      const cap = value.limits[dimension];
      if (cap !== undefined && add(add(value.charged[dimension] ?? 0, value.reserved[dimension]), requested[dimension]) > cap) throw failure("RESEARCH_BUDGET_EXHAUSTED", `${scope} budget exhausted for ${dimension}`);
    }
  }
  function configure(campaignId: string, limits: BudgetLimits, pools: PoolBudgetLimits): BudgetAccountView {
    assertOwner(); const total = configured(limitsSchema, limits), allocations = configured(poolLimitsSchema, pools);
    return store.transaction(() => {
      if (!store.getCampaign(campaignId)) throw failure("BUDGET_CAMPAIGN_NOT_FOUND", "Cannot configure a missing campaign");
      const existing = store.all("SELECT pool FROM budget_accounts WHERE campaign_id=?", campaignId);
      if (existing.length) {
        if (existing.length !== 5 || JSON.stringify(account(campaignId, "campaign").limits) !== JSON.stringify(total)
          || poolNames.some(pool => JSON.stringify(account(campaignId, pool).limits) !== JSON.stringify(allocations[pool]))) throw failure("BUDGET_ALREADY_CONFIGURED", "Use updateLimits to change existing budgets");
        return read(campaignId);
      }
      for (const pool of ["campaign", ...poolNames] as const) store.run("INSERT INTO budget_accounts(campaign_id,pool,admission_limit_json,charged_json,reserved_json) VALUES (?,?,?,?,?)",
        campaignId, pool, JSON.stringify(pool === "campaign" ? total : allocations[pool]), JSON.stringify({ ...zeroAmounts(), cost_microusd: null }), JSON.stringify(zeroAmounts()));
      return read(campaignId);
    });
  }
  function reserve(task: ResearchTask, attemptKey: string): BudgetReservationView {
    assertOwner();
    if (!store.inTransaction) throw failure("BUDGET_TRANSACTION_REQUIRED", "Grant must reserve inside its outer transaction");
    const canonical = store.getTask(task.task_id), attempt = store.get("SELECT task_id,generation FROM attempts WHERE attempt_key=?", attemptKey);
    if (!canonical || !attempt || attempt.task_id !== canonical.task_id || Number(attempt.generation) !== canonical.generation
      || !["leased", "running"].includes(canonical.status)) throw failure("BUDGET_ATTEMPT_MISMATCH", "Reservation must bind the current task generation");
    const budget = taskBudgetSchema.parse(canonical.budget);
    const campaignAccount = account(canonical.campaign_id, "campaign"), poolAccount = account(canonical.campaign_id, canonical.pool);
    const costRequired = budget.cost_microusd !== undefined || campaignAccount.limits.cost_microusd !== undefined || poolAccount.limits.cost_microusd !== undefined;
    if (costRequired && budget.cost_microusd === undefined) throw failure("BUDGET_COST_UNOBSERVABLE", "A finite cost cap requires an explicit task cost reservation");
    const requested: BudgetAmounts = { output_tokens: budget.token_enforcement === "wall_only_legacy" ? 0 : budget.output_tokens, tool_calls: budget.tool_calls, wall_ms: budget.wall_ms, cost_microusd: budget.cost_microusd ?? 0 };
    const previous = store.get("SELECT attempt_key FROM reservations WHERE attempt_key=?", attemptKey);
    if (previous) {
      const found = reservation(attemptKey);
      if (found.metadata.pool !== canonical.pool || JSON.stringify(found.metadata.initial) !== JSON.stringify(requested)) throw failure("BUDGET_RESERVATION_CONFLICT", "Existing reservation binds different task limits or pool");
      return view(found);
    }
    assertAffordable(campaignAccount, requested, "campaign"); assertAffordable(poolAccount, requested, canonical.pool);
    const required: Dimension[] = ["tool_calls", "wall_ms"];
    if (budget.token_enforcement !== "wall_only_legacy") required.push("output_tokens");
    if (costRequired) required.push("cost_microusd");
    const metadata: Metadata = { version: 1, task_id: canonical.task_id, campaign_id: canonical.campaign_id, pool: canonical.pool,
      generation: canonical.generation, initial: requested, required_dimensions: required, token_enforcement: budget.token_enforcement,
      usage: unknownUsage(), highwaters: {}, regressions: {}, manual_unreconciled: false, termination_confirmed: false };
    store.run("INSERT INTO reservations(attempt_key,reserved_json,observed_json,state,accounting_epoch) VALUES (?,?,?,'active',0)", attemptKey, JSON.stringify(requested), JSON.stringify(metadata));
    for (const [pool, value] of [["campaign", campaignAccount], [canonical.pool, poolAccount]] as const) {
      for (const dimension of dimensions) value.reserved[dimension] = add(value.reserved[dimension], requested[dimension]);
      saveAccount(canonical.campaign_id, pool, value);
    }
    return view(reservation(attemptKey));
  }
  function debitCumulative(input: DebitCumulativeInput): BudgetDebitResult {
    assertOwner();
    if (!input.source_key || typeof input.source_key !== "string" || input.source_key.length > 160 || ["__proto__", "constructor", "prototype"].includes(input.source_key) || (input.thread_id !== undefined && (typeof input.thread_id !== "string" || !input.thread_id))) throw failure("INVALID_USAGE_SOURCE", "Invalid service usage source", 400);
    const reported = configured(usageSchema, input.usage), suppliedBaseline = input.baseline === undefined ? undefined : configured(usageSchema, input.baseline);
    return store.transaction(() => {
      const value = reservation(input.attempt_key), metadata = value.metadata;
      const source = store.get("SELECT * FROM usage_snapshots WHERE attempt_key=? AND source_key=?", input.attempt_key, input.source_key);
      const baseline = source ? usageSchema.parse(JSON.parse(String(source.generation_baseline_json))) : suppliedBaseline ?? zeroUsage();
      if (source && suppliedBaseline && JSON.stringify(suppliedBaseline) !== JSON.stringify(baseline)) throw failure("USAGE_BASELINE_CONFLICT", "A usage source baseline is immutable");
      if (source && input.thread_id !== undefined && source.thread_id !== input.thread_id) throw failure("USAGE_THREAD_CONFLICT", "A usage source is bound to its original provider thread");
      const highwater = metadata.highwaters[input.source_key] ?? { ...baseline };
      const delta = zeroAmounts();
      const regressions = usageDimensions.filter(dimension => reported[dimension] !== null && (highwater[dimension] === null || reported[dimension]! < highwater[dimension]!));
      const hadRegression = Object.prototype.hasOwnProperty.call(metadata.regressions, input.source_key);
      if (regressions.length) {
        const previous = metadata.regressions[input.source_key];
        if (!previous || JSON.stringify(previous.reported) !== JSON.stringify(reported)) value.epoch = add(value.epoch, 1);
        metadata.regressions[input.source_key] = { reported, reason: regressions.some(dimension => highwater[dimension] === null) ? "baseline_unobservable" : "cumulative_counter_regressed" };
      } else {
        const newer = metadata.required_dimensions.some(dimension => reported[dimension] !== null && highwater[dimension] !== null && reported[dimension]! > highwater[dimension]!);
        if (hadRegression && newer) delete metadata.regressions[input.source_key];
        for (const dimension of usageDimensions) {
          const current = reported[dimension], prior = highwater[dimension];
          if (current === null || prior === null) continue;
          const difference = current - prior;
          metadata.usage[dimension] = add(metadata.usage[dimension] ?? 0, difference);
          highwater[dimension] = current;
          if ((dimensions as readonly string[]).includes(dimension)) delta[dimension as Dimension] = difference;
        }
      }
      metadata.highwaters[input.source_key] = highwater;
      store.run("INSERT INTO usage_snapshots(attempt_key,source_key,thread_id,provider_total_json,generation_baseline_json,observed_at) VALUES (?,?,?,?,?,?) ON CONFLICT(attempt_key,source_key) DO UPDATE SET provider_total_json=excluded.provider_total_json,observed_at=excluded.observed_at",
        input.attempt_key, input.source_key, source?.thread_id as string | null ?? input.thread_id ?? null, JSON.stringify(reported), JSON.stringify(baseline), new Date(runtime.clock.now()).toISOString());
      for (const pool of ["campaign", metadata.pool] as const) {
        const target = account(metadata.campaign_id, pool);
        for (const dimension of dimensions) {
          const consumed = Math.min(delta[dimension], value.remaining[dimension]);
          target.reserved[dimension] = add(target.reserved[dimension], -consumed);
          if (dimension !== "cost_microusd" || reported.cost_microusd !== null && regressions.length === 0) target.charged[dimension] = add(target.charged[dimension] ?? 0, delta[dimension]);
        }
        saveAccount(metadata.campaign_id, pool, target);
      }
      for (const dimension of dimensions) value.remaining[dimension] -= Math.min(delta[dimension], value.remaining[dimension]);
      if (Object.keys(metadata.regressions).length || metadata.manual_unreconciled || requiredMissing(value)) value.state = "unreconciled";
      else if (value.state !== "settled") value.state = "active";
      saveReservation(value);
      const campaign = read(metadata.campaign_id), poolAccount = read(metadata.campaign_id, metadata.pool);
      const threshold = metadata.required_dimensions.some(dimension => metadata.usage[dimension] !== null && (metadata.usage[dimension]! > metadata.initial[dimension]
        || metadata.initial[dimension] > 0 && metadata.usage[dimension]! >= metadata.initial[dimension]));
      const overrun = dimensions.some(dimension => (campaign.overrun[dimension] ?? 0) > 0 || (poolAccount.overrun[dimension] ?? 0) > 0);
      return { ...view(value), delta, stop_required: threshold || overrun || Object.keys(metadata.regressions).length > 0,
        campaign, pool_account: poolAccount };
    });
  }
  function settle(attemptKey: string, input: { termination_confirmed: boolean; usage_complete: boolean }): BudgetReservationView & { released: boolean } {
    assertOwner();
    return store.transaction(() => {
      const value = reservation(attemptKey);
      if (input.termination_confirmed !== true) return { ...view(value), released: false };
      value.metadata.termination_confirmed = true;
      if (input.usage_complete !== true || requiredMissing(value) || Object.keys(value.metadata.regressions).length) {
        value.state = "unreconciled"; saveReservation(value); return { ...view(value), released: false };
      }
      for (const pool of ["campaign", value.metadata.pool] as const) {
        const target = account(value.metadata.campaign_id, pool);
        for (const dimension of dimensions) target.reserved[dimension] = add(target.reserved[dimension], -value.remaining[dimension]);
        saveAccount(value.metadata.campaign_id, pool, target);
      }
      value.remaining = zeroAmounts(); value.state = "settled"; value.metadata.manual_unreconciled = false; saveReservation(value);
      return { ...view(value), released: true };
    });
  }
  function markUnreconciled(attemptKey: string): BudgetReservationView {
    assertOwner(); return store.transaction(() => { const value = reservation(attemptKey); value.state = "unreconciled"; value.metadata.manual_unreconciled = true; saveReservation(value); return view(value); });
  }
  function checkedLimits(value: Account, limits: BudgetLimits): Account {
    for (const dimension of dimensions) if (limits[dimension] !== undefined && limits[dimension]! < add(value.charged[dimension] ?? 0, value.reserved[dimension])) throw failure("RESEARCH_BUDGET_COMMITTED", `Cannot reduce ${dimension} below charged plus reserved`);
    return { ...value, limits };
  }
  function assertNewCostCap(campaignId: string, pool: BudgetPool | "campaign", previous: Account, next: BudgetLimits): void {
    if (previous.limits.cost_microusd !== undefined || next.cost_microusd === undefined) return;
    for (const row of store.all("SELECT r.attempt_key FROM reservations r JOIN attempts a ON a.attempt_key=r.attempt_key JOIN tasks t ON t.task_id=a.task_id WHERE t.campaign_id=?", campaignId)) {
      const value = reservation(String(row.attempt_key));
      if (pool !== "campaign" && value.metadata.pool !== pool) continue;
      if (unknownDimensions(value).includes("cost_microusd") || Object.keys(value.metadata.regressions).length > 0
        || value.state !== "settled" && !value.metadata.required_dimensions.includes("cost_microusd")) {
        throw failure("BUDGET_COST_UNOBSERVABLE", "Cannot add a finite cost cap over unknown history or an unbounded active reservation");
      }
    }
  }
  function updateLimits(campaignId: string, limits: BudgetLimits, pools?: PoolBudgetLimits): BudgetAccountView {
    assertOwner(); const total = configured(limitsSchema, limits), allocations = pools === undefined ? undefined : configured(poolLimitsSchema, pools);
    return store.transaction(() => {
      const previous = account(campaignId, "campaign"); assertNewCostCap(campaignId, "campaign", previous, total);
      const next = checkedLimits(previous, total);
      const nextPools = allocations ? poolNames.map(pool => {
        const before = account(campaignId, pool); assertNewCostCap(campaignId, pool, before, allocations[pool]);
        return [pool, checkedLimits(before, allocations[pool])] as const;
      }) : [];
      saveAccount(campaignId, "campaign", next);
      for (const [pool, value] of nextPools) saveAccount(campaignId, pool, value);
      return read(campaignId);
    });
  }
  function transferPool(campaignId: string, from: BudgetPool, to: BudgetPool, amounts: Partial<BudgetAmounts>): BudgetAccountView {
    assertOwner(); configured(researchPoolSchema, from); configured(researchPoolSchema, to);
    const transfer = configured(amountsSchema.partial(), amounts);
    if (from === to || !dimensions.some(dimension => (transfer[dimension] ?? 0) > 0)) throw failure("INVALID_POOL_TRANSFER", "Pool transfer must move a positive amount between distinct pools", 400);
    return store.transaction(() => {
      const source = account(campaignId, from), target = account(campaignId, to);
      const sourceLimits = { ...source.limits }, targetLimits = { ...target.limits };
      for (const dimension of dimensions) {
        const amount = transfer[dimension] ?? 0; if (!amount) continue;
        if (sourceLimits[dimension] === undefined || targetLimits[dimension] === undefined) throw failure("INVALID_POOL_TRANSFER", "Cannot transfer an unconfigured dimension", 400);
        if (sourceLimits[dimension]! < amount) throw failure("RESEARCH_BUDGET_COMMITTED", "Pool transfer exceeds the source limit");
        sourceLimits[dimension] = sourceLimits[dimension]! - amount; targetLimits[dimension] = add(targetLimits[dimension]!, amount);
      }
      saveAccount(campaignId, from, checkedLimits(source, sourceLimits)); saveAccount(campaignId, to, checkedLimits(target, targetLimits));
      return read(campaignId);
    });
  }
  return { configure, reserve, debitCumulative, settle, markUnreconciled, transferPool, updateLimits, read };
}
