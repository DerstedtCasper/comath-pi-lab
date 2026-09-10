import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { ComathError } from "../errors.js";
import { canonicalJson } from "../verification/runner-contracts.js";
import { createResearchEventStore } from "./event-store.js";
import { assertProjectReadable, finalizeTrustCommit } from "./project-commit.js";
import type { ProjectRuntime } from "./project-runtime.js";
import { createBudgetLedger, type BudgetLimits, type BudgetPool, type PoolBudgetLimits } from "./budget-ledger.js";
import { validateResearchDagPatch, validateResearchTaskGraph } from "./research-dag.js";
import { artifactPointerSchema, parseResearchInput, researchControlCampaignSchema, researchDagPatchSchema,
  researchTaskSchema, sha256Schema, type ResearchControlCampaign, type ResearchDagPatch,
  type ResearchTask, type ResearchTaskDraft, type ScopeBinding } from "./research-schemas.js";

export type ResearchPrincipal = { kind: "operator" | "internal"; id: string }
  | { kind: "supervisor"; id: string; campaign_id: string }
  | { kind: "worker"; id: string; task_id: string; generation: number };
export type ResearchTaskPolicies = {
  model_policy_ids: readonly string[]; tool_policy_ids: readonly string[]; role_template_ids: readonly string[];
  exact_output_cap_policy_ids?: readonly string[];
  /** Service-owned approval lookup; model-provided booleans never reach this callback. */
  validateFormalScope?: (scope: Extract<ScopeBinding, { kind: "formal" }>, campaign: ResearchControlCampaign) => boolean;
};
const id = z.string().min(1).max(160);
const retrySchema = z.strictObject({ command_id: id, campaign_id: id, expected_revision: z.number().int().nonnegative(),
  task_id: id, new_evidence_refs: z.array(artifactPointerSchema).max(100), rebind_dependents: z.array(id).max(100),
  rationale: z.string().trim().min(1).max(8192) });
type RetryRequest = z.infer<typeof retrySchema>;
const registrationSchema = z.strictObject({ command_id: id, campaign: researchControlCampaignSchema, tasks: z.array(researchTaskSchema).max(10000) });
type RegistrationRequest = z.infer<typeof registrationSchema>;
const bindingSchema = z.strictObject({ command_id: id, campaign_id: id, candidate_id: id, source_task_id: id,
  payload_sha256: sha256Schema, policy_version: id, role_slot: z.enum(["referee", "counterexample", "reproduce_a", "reproduce_b", "novelty", "formalization_probe"]), task_id: id });
type BindingRequest = z.infer<typeof bindingSchema>;
export type ResearchCommand = { kind: "dag_patch"; value: ResearchDagPatch } | { kind: "task_retry"; value: RetryRequest };
function fail(code: string, message: string, statusCode = 409): never { throw new ComathError(message, { code, statusCode }); }
function authorized(principal: ResearchPrincipal, campaignId: string): void {
  if (!principal.id || !["operator", "internal", "supervisor"].includes(principal.kind) || (principal.kind === "supervisor" && principal.campaign_id !== campaignId)) {
    fail("RESEARCH_PRINCIPAL_FORBIDDEN", "Principal cannot mutate this research campaign", 403);
  }
}

export class ResearchOrchestrator {
  readonly events: ReturnType<typeof createResearchEventStore>;
  readonly startup_blockers: { operation_id: string; code: string }[] = [];
  constructor(readonly runtime: ProjectRuntime, private readonly policies: ResearchTaskPolicies) {
    // Preserve local conflicts and continue recovering disjoint operations. Read barriers stay active.
    for (const row of runtime.store.all("SELECT operation_id FROM trust_commits WHERE phase<>'committed' ORDER BY rowid")) {
      try { finalizeTrustCommit(runtime.root, String(row.operation_id)); }
      catch (error) { this.startup_blockers.push({ operation_id: String(row.operation_id), code: error instanceof ComathError ? error.code : "TRUST_COMMIT_RECOVERY_FAILED" }); }
    }
    this.events = createResearchEventStore(runtime);
  }
  private command<T>(principal: ResearchPrincipal, commandId: string, request: unknown, action: () => T): T {
    const principalId = `${principal.kind}:${principal.id}`;
    const requestHash = createHash("sha256").update(canonicalJson(request)).digest("hex");
    return this.runtime.store.transaction(() => {
      const receipt = this.runtime.store.get("SELECT * FROM commands WHERE command_id=?", commandId);
      if (receipt) {
        if (receipt.principal_id !== principalId) fail("COMMAND_PRINCIPAL_CONFLICT", "Command belongs to a different principal", 403);
        if (receipt.request_sha256 !== requestHash) fail("COMMAND_PAYLOAD_CONFLICT", "Command ID was reused with a different payload");
        if (receipt.status !== "committed") fail("COMMAND_PENDING", "Command is not yet committed");
        return JSON.parse(String(receipt.response_json)) as T;
      }
      const response = action();
      this.runtime.store.run("INSERT INTO commands(command_id,principal_id,request_sha256,response_json,status) VALUES (?,?,?,?,'committed')",
        commandId, principalId, requestHash, JSON.stringify(response));
      return response;
    });
  }
  private requireCampaign(campaignId: string): ResearchControlCampaign {
    assertProjectReadable(this.runtime.root, undefined, campaignId);
    const campaign = this.runtime.store.getCampaign(campaignId);
    if (!campaign) fail("RESEARCH_CAMPAIGN_NOT_FOUND", "Research campaign not found", 404);
    return campaign;
  }
  private validateDraft(draft: ResearchTaskDraft, campaign: ResearchControlCampaign, allowLegacy = false): void {
    if (!this.policies.model_policy_ids.includes(draft.model_policy_id) || !this.policies.tool_policy_ids.includes(draft.tool_policy_id)
      || !this.policies.role_template_ids.includes(draft.role_template)) fail("RESEARCH_POLICY_UNKNOWN", "Task references an unknown host policy or role", 400);
    if (draft.kind === "legacy_run" && !allowLegacy) fail("RESEARCH_LEGACY_INTERNAL_ONLY", "Legacy runs require a service-owned admission mapping", 403);
    if (draft.budget.token_enforcement === "wall_only_legacy" && draft.kind !== "legacy_run") fail("RESEARCH_BUDGET_CAPABILITY", "Research tasks cannot use legacy wall-only accounting", 422);
    if (draft.scope.kind === "charter") {
      if (draft.scope.charter_sha256 !== campaign.charter.sha256) fail("RESEARCH_SCOPE_MISMATCH", "Task charter does not match its campaign");
    } else if (this.policies.validateFormalScope?.(draft.scope, campaign) !== true) fail("RESEARCH_SCOPE_UNAPPROVED", "Formal task scope is not approved", 403);
    if (draft.budget.token_enforcement === "exact_output_cap" && !this.policies.exact_output_cap_policy_ids?.includes(draft.model_policy_id)) {
      fail("CAPABILITY_UNSUPPORTED", "This model policy cannot enforce an exact output cap", 422);
    }
  }
  assertTaskPolicy(task: ResearchTask): void {
    this.validateDraft(task, this.requireCampaign(task.campaign_id), task.kind === "legacy_run");
  }
  updateBudget(principal: ResearchPrincipal, request: { command_id: string; campaign_id: string; expected_revision: number;
    new_limits: BudgetLimits; pools?: PoolBudgetLimits; pool_transfers?: { from: BudgetPool; to: BudgetPool; amounts: Partial<BudgetLimits> }[]; rationale: string }) {
    if (principal.kind !== "operator" && principal.kind !== "internal") fail("RESEARCH_PRINCIPAL_FORBIDDEN", "Only the operator can change budget limits", 403);
    if (!request.command_id || !request.rationale?.trim() || (request.pool_transfers?.length ?? 0) > 100) fail("RESEARCH_BUDGET_REQUEST_INVALID", "Budget change needs command ID and rationale", 400);
    return this.command(principal, request.command_id, { kind: "budget_update", request }, () => {
      const campaign = this.requireCampaign(request.campaign_id);
      if (campaign.revision !== request.expected_revision) fail("RESEARCH_REVISION_CONFLICT", "Research revision changed");
      const ledger = createBudgetLedger(this.runtime);
      ledger.updateLimits(campaign.campaign_id, request.new_limits, request.pools);
      for (const transfer of request.pool_transfers ?? []) ledger.transferPool(campaign.campaign_id, transfer.from, transfer.to, transfer.amounts);
      const revision = campaign.revision + 1;
      const event = this.events.appendEvent({ campaign_id: campaign.campaign_id, type: "BudgetUpdated", actor: principal.id,
        payload: { revision, rationale: request.rationale, limits: request.new_limits, transfers: request.pool_transfers ?? [] } });
      this.runtime.store.putCampaign({ ...campaign, revision, snapshot_seq: event.seq });
      return { revision, budget: ledger.read(campaign.campaign_id), snapshot_seq: event.seq };
    });
  }
  private persistGraph(tasks: ResearchTask[]): void {
    // Insert all task IDs before FK-constrained edges, including mutually referring new IDs.
    for (const task of tasks) this.runtime.store.putTask(task);
    for (const task of tasks) {
      this.runtime.store.run("DELETE FROM dependencies WHERE task_id=?", task.task_id);
      for (const prerequisite of task.depends_on) this.runtime.store.run("INSERT INTO dependencies(task_id,prerequisite_id) VALUES (?,?)", task.task_id, prerequisite);
    }
  }
  /** Service-only binding/import of operational state; this never creates or promotes proof claims. */
  registerCampaign(principal: ResearchPrincipal, request: RegistrationRequest): { campaign_id: string; revision: number } {
    if (principal.kind !== "internal") fail("RESEARCH_PRINCIPAL_FORBIDDEN", "Only the service can bind existing control state", 403);
    const input = parseResearchInput(registrationSchema, request);
    return this.command(principal, input.command_id, { kind: "register_campaign", input }, () => {
      if (this.runtime.store.getCampaign(input.campaign.campaign_id)) fail("RESEARCH_CAMPAIGN_EXISTS", "Campaign is already bound");
      for (const task of input.tasks) {
        if (task.campaign_id !== input.campaign.campaign_id || this.runtime.store.getTask(task.task_id)) fail("RESEARCH_TASK_CAMPAIGN_MISMATCH", "Imported task has an invalid campaign or duplicate ID");
        this.validateDraft(task, input.campaign, true);
      }
      validateResearchTaskGraph(input.tasks);
      this.runtime.store.putCampaign(input.campaign); this.persistGraph(input.tasks);
      const event = this.events.appendEvent({ campaign_id: input.campaign.campaign_id, type: "CampaignBound", actor: principal.id, payload: { task_count: input.tasks.length, proof_authority: "none" } });
      this.runtime.store.putCampaign({ ...input.campaign, snapshot_seq: event.seq });
      return { campaign_id: input.campaign.campaign_id, revision: input.campaign.revision };
    });
  }
  applyPatch(principal: ResearchPrincipal, request: ResearchDagPatch): { revision: number; created_task_ids: string[]; snapshot_seq: number } {
    authorized(principal, request.campaign_id);
    const patch = parseResearchInput(researchDagPatchSchema, request);
    return this.command(principal, patch.command_id, { kind: "dag_patch", patch }, () => {
      const campaign = this.requireCampaign(patch.campaign_id);
      if (campaign.state === "completed" || campaign.state === "cancelled") fail("RESEARCH_CAMPAIGN_TERMINAL", "Terminal campaign cannot accept a new graph");
      for (const draft of patch.create_tasks) if (this.runtime.store.getTask(draft.task_id)) fail("RESEARCH_TASK_DUPLICATE", "Task ID is already allocated");
      const after = validateResearchDagPatch(campaign, this.runtime.store.listTasks(campaign.campaign_id), patch,
        { now: new Date(this.runtime.clock.now()).toISOString(), validateDraft: draft => this.validateDraft(draft, campaign) });
      this.persistGraph(after.tasks);
      for (const cancelled of patch.cancel_tasks) {
        const task = after.tasks.find(task => task.task_id === cancelled.task_id)!;
        if (task.status === "cancelling") {
          const stamp = new Date(this.runtime.clock.now()).toISOString();
          this.runtime.store.run("UPDATE attempts SET state='cancelling',stop_reason='user_cancel',stop_requested_at=?,fenced_at=?,grace_deadline_at=NULL WHERE task_id=? AND generation=? AND state<>'terminated'", stamp, stamp, task.task_id, task.generation);
          this.runtime.store.run("UPDATE tool_executions SET stop_intent='user_cancel' WHERE attempt_key IN (SELECT attempt_key FROM attempts WHERE task_id=? AND generation=?) AND state<>'terminated'", task.task_id, task.generation);
        }
        this.events.appendEvent({ campaign_id: campaign.campaign_id, task_id: cancelled.task_id,
          type: "TaskStopRequested", actor: principal.id, payload: { reason: cancelled.reason } });
      }
      const revision = campaign.revision + 1;
      const event = this.events.appendEvent({ campaign_id: campaign.campaign_id, type: "DagPatched", actor: principal.id,
        payload: { revision, command_id: patch.command_id, created_task_ids: after.created_task_ids, cancelled_task_ids: after.cancelled_task_ids, rationale: patch.rationale } });
      this.runtime.store.putCampaign({ ...campaign, revision, snapshot_seq: event.seq });
      return { revision, created_task_ids: after.created_task_ids, snapshot_seq: event.seq };
    });
  }
  retryTask(principal: ResearchPrincipal, request: RetryRequest): { task_id: string; revision: number; snapshot_seq: number } {
    authorized(principal, request.campaign_id);
    const input = parseResearchInput(retrySchema, request);
    if (principal.kind === "supervisor" && input.new_evidence_refs.length === 0) fail("RESEARCH_RETRY_EVIDENCE_REQUIRED", "Supervisor retry needs new evidence");
    return this.command(principal, input.command_id, { kind: "task_retry", input }, () => {
      const campaign = this.requireCampaign(input.campaign_id);
      if (campaign.state === "completed" || campaign.state === "cancelled") fail("RESEARCH_CAMPAIGN_TERMINAL", "Terminal campaign cannot accept a retry");
      if (campaign.revision !== input.expected_revision) fail("RESEARCH_REVISION_CONFLICT", "Research revision changed");
      const previous = this.getTask(input.task_id);
      if (previous.campaign_id !== campaign.campaign_id || !["failed", "cancelled"].includes(previous.status)) fail("RESEARCH_RETRY_STATE_CONFLICT", "Only a failed/cancelled task in this campaign can be retried");
      if (new Set(input.rebind_dependents).size !== input.rebind_dependents.length) fail("RESEARCH_REBIND_DUPLICATE", "Repeated dependent in retry request");
      const taskId = `TASK-${randomUUID()}`;
      const stamp = new Date(this.runtime.clock.now()).toISOString();
      const { checkpoint_head: _checkpoint, accepted_result_id: _result, blocked_reason: _blocked, retry_after: _retry, ...material } = previous;
      const refs = [...previous.input_refs];
      for (const ref of input.new_evidence_refs) if (!refs.some(existing => existing.artifact_id === ref.artifact_id && existing.sha256 === ref.sha256)) refs.push(ref);
      const next = researchTaskSchema.parse({ ...material, task_id: taskId, parent_task_id: previous.task_id, input_refs: refs,
        status: "queued", generation: 0, fault_retry_count: 0, created_at: stamp, updated_at: stamp });
      this.validateDraft(next, campaign, principal.kind === "internal");
      const tasks = this.runtime.store.listTasks(campaign.campaign_id).map(task => {
        if (!input.rebind_dependents.includes(task.task_id)) return task;
        if (!["queued", "blocked"].includes(task.status) || !task.depends_on.includes(previous.task_id)) fail("RESEARCH_REBIND_STATE_CONFLICT", "Only selected pending dependents can reconnect to a retry");
        const changed = { ...task, depends_on: task.depends_on.map(id => id === previous.task_id ? taskId : id), updated_at: stamp };
        if (changed.status === "blocked" && changed.blocked_reason === "dependency_failed") {
          const otherFailed = changed.depends_on.some(id => id !== taskId && ["failed", "cancelled"].includes(this.runtime.store.getTask(id)?.status ?? ""));
          if (!otherFailed) { changed.status = "queued"; delete changed.blocked_reason; }
        }
        return changed;
      });
      for (const id of input.rebind_dependents) if (!tasks.some(task => task.task_id === id)) fail("RESEARCH_TASK_UNKNOWN", "Selected retry dependent does not exist in this campaign");
      tasks.push(next); validateResearchTaskGraph(tasks); this.persistGraph(tasks);
      for (const slot of this.runtime.store.all("SELECT candidate_id,policy_version,role_slot,prior_task_ids_json FROM validation_tasks WHERE current_task_id=?", previous.task_id)) {
        const history = JSON.parse(String(slot.prior_task_ids_json)) as string[]; history.push(previous.task_id);
        this.runtime.store.run("UPDATE validation_tasks SET current_task_id=?,prior_task_ids_json=? WHERE candidate_id=? AND policy_version=? AND role_slot=?",
          taskId, JSON.stringify(history), String(slot.candidate_id), String(slot.policy_version), String(slot.role_slot));
      }
      const revision = campaign.revision + 1;
      const event = this.events.appendEvent({ campaign_id: campaign.campaign_id, task_id: taskId, type: "TaskRetried", actor: principal.id,
        payload: { previous_task_id: previous.task_id, rebind_dependents: input.rebind_dependents, rationale: input.rationale, new_evidence_refs: input.new_evidence_refs } });
      this.runtime.store.putCampaign({ ...campaign, revision, snapshot_seq: event.seq });
      return { task_id: taskId, revision, snapshot_seq: event.seq };
    });
  }
  /** Internal validation-index consumer; the binding carries no mathematical approval. */
  bindValidationSlot(principal: ResearchPrincipal, request: BindingRequest): { candidate_id: string; current_task_id: string } {
    if (principal.kind !== "internal") fail("RESEARCH_PRINCIPAL_FORBIDDEN", "Validation slots belong to the service", 403);
    const input = parseResearchInput(bindingSchema, request);
    return this.command(principal, input.command_id, { kind: "validation_slot", input }, () => {
      this.requireCampaign(input.campaign_id);
      const source = this.getTask(input.source_task_id), validator = this.getTask(input.task_id);
      if (source.campaign_id !== input.campaign_id || validator.campaign_id !== input.campaign_id) fail("RESEARCH_VALIDATION_SCOPE", "Validation binding crosses campaign");
      const existing = this.runtime.store.get("SELECT payload_sha256,source_task_id FROM candidates WHERE candidate_id=?", input.candidate_id);
      if (existing && (existing.payload_sha256 !== input.payload_sha256 || existing.source_task_id !== source.task_id)) fail("RESEARCH_CANDIDATE_CONFLICT", "Candidate ID refers to different source material");
      if (!existing) this.runtime.store.run("INSERT INTO candidates(candidate_id,source_task_id,scope_json,payload_sha256,validation_state,result_json) VALUES (?,?,?,?,'unvalidated',?)",
        input.candidate_id, source.task_id, JSON.stringify(source.scope), input.payload_sha256,
        JSON.stringify({ source_task_id: source.task_id, payload_sha256: input.payload_sha256, proof_authority: "none" }));
      const slot = this.runtime.store.get("SELECT current_task_id FROM validation_tasks WHERE candidate_id=? AND policy_version=? AND role_slot=?", input.candidate_id, input.policy_version, input.role_slot);
      if (slot && slot.current_task_id !== validator.task_id) fail("RESEARCH_VALIDATION_SLOT_EXISTS", "Use explicit retry to replace a validation slot");
      if (!slot) this.runtime.store.run("INSERT INTO validation_tasks(candidate_id,policy_version,role_slot,current_task_id,prior_task_ids_json) VALUES (?,?,?,?,'[]')",
        input.candidate_id, input.policy_version, input.role_slot, validator.task_id);
      return { candidate_id: input.candidate_id, current_task_id: validator.task_id };
    });
  }
  validationSlots(candidateId: string): { role_slot: string; current_task_id: string; prior_task_ids: string[] }[] {
    return this.runtime.store.all("SELECT role_slot,current_task_id,prior_task_ids_json FROM validation_tasks WHERE candidate_id=? ORDER BY role_slot", candidateId)
      .map(row => ({ role_slot: String(row.role_slot), current_task_id: String(row.current_task_id), prior_task_ids: JSON.parse(String(row.prior_task_ids_json)) as string[] }));
  }
  getTask(taskId: string): ResearchTask {
    const task = this.runtime.store.getTask(taskId);
    if (!task) fail("RESEARCH_TASK_NOT_FOUND", "Research task not found", 404);
    assertProjectReadable(this.runtime.root, undefined, task.campaign_id); return task;
  }
  frontier(campaignId: string, options: { after_task_id?: string; limit?: number } = {}) {
    const campaign = this.requireCampaign(campaignId);
    const limit = options.limit ?? 100;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) fail("RESEARCH_PAGE_INVALID", "Frontier limit must be 1..100", 400);
    const all = this.runtime.store.listTasks(campaignId), byId = new Map(all.map(task => [task.task_id, task]));
    const ordered = all.sort((a, b) => a.task_id.localeCompare(b.task_id)).filter(task => !options.after_task_id || task.task_id.localeCompare(options.after_task_id) > 0);
    const tasks = ordered.slice(0, limit).map(task => {
      const dependenciesReady = task.depends_on.every(id => byId.get(id)?.status === "succeeded");
      const ready = task.status === "queued" && campaign.state === "running" && dependenciesReady && (!task.retry_after || Date.parse(task.retry_after) <= this.runtime.clock.now());
      return { ...task, ready, waiting_reason: ready ? null : task.blocked_reason ?? (!dependenciesReady ? "dependencies" : task.status === "queued" ? "campaign_or_retry_time" : task.status) };
    });
    return { campaign_id: campaignId, revision: campaign.revision, snapshot_seq: Number(this.runtime.store.get("SELECT COALESCE(MAX(seq),0) AS seq FROM events")?.seq ?? 0),
      tasks, dependencies: tasks.flatMap(task => task.depends_on.map(prerequisite_id => ({ task_id: task.task_id, prerequisite_id }))),
      next_cursor: ordered.length > limit ? tasks.at(-1)!.task_id : null };
  }
  close(): void { this.events.close(); }
}
export function createResearchOrchestrator(runtime: ProjectRuntime, policies: ResearchTaskPolicies): ResearchOrchestrator {
  return new ResearchOrchestrator(runtime, policies);
}
export function applyResearchCommand(orchestrator: ResearchOrchestrator, principal: ResearchPrincipal, command: ResearchCommand) {
  switch (command.kind) {
    case "dag_patch": return orchestrator.applyPatch(principal, command.value);
    case "task_retry": return orchestrator.retryTask(principal, command.value);
    default: return fail("RESEARCH_COMMAND_UNKNOWN", "Unknown research command", 400);
  }
}
