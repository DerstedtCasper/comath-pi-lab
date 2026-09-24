import { createHash } from "node:crypto";
import { z } from "zod";
import { ComathError } from "../errors.js";
import { canonicalJson } from "../verification/runner-contracts.js";
import { getCampaign } from "../proof-kernel/campaign/research-campaign.js";
import { resolveActiveObligation } from "../proof-kernel/campaign/active-obligation.js";
import { requireApprovedFormalScope } from "../proof-kernel/campaign/formal-spec-store.js";
import { createProofObligationFromFormalSpecLock } from "../proof-kernel/campaign/formal-spec-lock.js";
import { createGaAgentStageTaskCards } from "../proof-kernel/ensemble/ga-agent-stage-runner.js";
import { assertProjectReadable } from "./project-commit.js";
import { getAcquiredProjectRuntime } from "./project-runtime.js";
import type { ResearchOrchestrator } from "./research-orchestrator.js";
import type { WorkerPrincipal } from "../control/worker-auth.js";
import { artifactPointerSchema, scopeBindingSchema, taskBudgetSchema, type ResearchTask, type ResearchTaskDraft, type ScopeBinding } from "./research-schemas.js";

const id = z.string().min(1).max(160);
const profileSchema = z.strictObject({ role_template: id, model_policy_id: id, tool_policy_id: id,
  budget: taskBudgetSchema, priority: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]) });
const inputSchema = z.strictObject({ campaign_id: id, obligation_id: id,
  stage_attempt: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  expected_revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER) });
export type FormalCandidateDispatchProfile = z.infer<typeof profileSchema>;
export type FormalCandidateDispatchInput = z.infer<typeof inputSchema>;
export type FormalCandidateReservation = { candidate_id: string; task_id: string; generation: number;
  campaign_id: string; obligation_id: string; variant_id: "V1" | "V2" | "V3" | "V4" | "V5" | "V6" | "V7" | "V8";
  scope: Extract<ScopeBinding, { kind: "formal" }>; stage_attempt: number; dispatch_id: string; draft_sha256: string;
  proof_authority: "none" };
export type FormalCandidateDispatchReceipt = { schema_version: "comath.formal_candidate_dispatch.v1";
  dispatch_id: string; campaign_id: string; obligation_id: string; stage_attempt: number; profile_sha256: string;
  bindings: FormalCandidateReservation[]; revision: number; event_seq: number; proof_authority: "none" };
type FormalCandidateRetryReceipt = { schema_version: "comath.formal_candidate_retry.v1"; task_id: string; parent_task_id: string;
  parent_generation: number; parent_candidate_id: string; candidate_id: string; dispatch_id: string; draft_sha256: string; proof_authority: "none" };
export type IntegratedDependencySource = { obligation_id: string; artifact_id: string; sha256: string };
const hash = (value: unknown) => createHash("sha256").update(canonicalJson(value)).digest("hex");
const same = (a: unknown, b: unknown) => canonicalJson(a) === canonicalJson(b);
function fail(code: string): never { throw new ComathError(code, { code, statusCode: 409 }); }
const reservationKey = (candidateId: string) => `formal-reservation:${candidateId}`;
const generationKey = (taskId: string, generation: number) => `formal-generation:${taskId}:g${generation}`;
const retryKey = (taskId: string) => `formal-candidate-retry:${taskId}`;

/** Creates queued tasks through ordinary policy admission. It neither starts workers nor verifies proofs. */
export function createFormalCandidateDispatch(app: ResearchOrchestrator, options: {
  profile?: FormalCandidateDispatchProfile; fault?: (stage: "after_patch" | "after_reservations") => void;
  resolveIntegratedDependencies?: (input: { campaign_id: string; obligation_id: string; required_obligation_ids: readonly string[] }) => IntegratedDependencySource[];
}) {
  const runtime = app.runtime, store = runtime.store, profile = options.profile && profileSchema.parse(options.profile), profileHash = profile && hash(profile);
  function owner(campaignId?: string) {
    if (getAcquiredProjectRuntime(runtime.root) !== runtime || runtime.referenceCount < 1) fail("RESEARCH_OWNER_REQUIRED");
    assertProjectReadable(runtime.root, undefined, campaignId);
  }
  function load<T>(key: string, principal: string): T | undefined {
    const row = store.get("SELECT * FROM commands WHERE command_id=?", key); if (!row) return undefined;
    const value = JSON.parse(String(row.response_json));
    if (row.principal_id !== principal || row.status !== "committed" || row.request_sha256 !== hash(value)) fail("FORMAL_DISPATCH_RECEIPT_INVALID");
    return value as T;
  }
  function save(key: string, principal: string, value: unknown) {
    store.run("INSERT INTO commands(command_id,principal_id,request_sha256,response_json,status) VALUES (?,?,?,?,'committed')",
      key, principal, hash(value), canonicalJson(value));
  }
  function current(input: FormalCandidateDispatchInput) {
    owner(input.campaign_id);
    const campaign = getCampaign(runtime.root, input.campaign_id), control = store.getCampaign(input.campaign_id);
    if (!campaign || !control || campaign.status === "terminal" || control.state !== "running") fail("FORMAL_DISPATCH_CAMPAIGN_NOT_RUNNING");
    const obligation = resolveActiveObligation(campaign), cursor = campaign.obligation_cursors?.[input.obligation_id];
    if (!obligation || obligation.status === "blocked" || obligation.obligation_id !== input.obligation_id
      || campaign.active_obligation_id !== input.obligation_id || campaign.current_stage !== "candidate_generation"
      || cursor?.current_stage !== "candidate_generation" || cursor.stage_attempt !== input.stage_attempt || cursor.blocked_reason) fail("FORMAL_DISPATCH_STAGE_CHANGED");
    const scope = scopeBindingSchema.parse(obligation.locked_statement_structured.approved_scope);
    const approved = requireApprovedFormalScope(runtime, campaign.campaign_id, scope);
    const expected = createProofObligationFromFormalSpecLock({ obligation_id: obligation.obligation_id, formal_spec_lock: approved.lock, assumption_ledger: approved.ledger });
    const { approved_scope: ignored, ...locked } = obligation.locked_statement_structured;
    if (approved.obligation_binding.obligation_id !== obligation.obligation_id || obligation.claim_id !== expected.claim_id
      || obligation.statement_hash !== expected.statement_hash || obligation.locked_statement_nl !== expected.locked_statement_nl
      || obligation.lean_target !== expected.lean_target || !same(locked, expected.locked_statement_structured)
      || !same(obligation.assumptions, expected.assumptions) || !same(obligation.dependencies, approved.obligation_binding.dependencies)
      || obligation.parent_obligation_id !== approved.obligation_binding.parent_obligation_id) fail("FORMAL_DISPATCH_OBLIGATION_CHANGED");
    return { campaign, control, obligation, approved };
  }
  function readCandidateReservation(candidateId: string): FormalCandidateReservation | undefined {
    owner();
    if (!/^CAND-\d{4,}$/.test(candidateId)) fail("FORMAL_RESERVATION_ID_INVALID");
    const binding = load<FormalCandidateReservation>(reservationKey(candidateId), "service:formal-reservation");
    if (!binding) return undefined;
    owner(binding.campaign_id);
    const dispatch = load<FormalCandidateDispatchReceipt>(binding.dispatch_id, "service:formal-dispatch");
    if (!dispatch || binding.candidate_id !== candidateId || binding.generation < 1) fail("FORMAL_DISPATCH_RECEIPT_INVALID");
    const firstGeneration = load<FormalCandidateReservation>(generationKey(binding.task_id, 1), "service:formal-generation");
    if (!firstGeneration || !same({ ...binding, candidate_id: firstGeneration.candidate_id, generation: 1 }, firstGeneration)) fail("FORMAL_DISPATCH_RECEIPT_INVALID");
    let cursor: FormalCandidateReservation | undefined = firstGeneration;
    const visited = new Set<string>();
    while (cursor && !dispatch.bindings.some(value => value.task_id === cursor!.task_id)) {
      if (visited.has(cursor.task_id)) fail("FORMAL_DISPATCH_RECEIPT_INVALID");
      visited.add(cursor.task_id);
      const retry: FormalCandidateRetryReceipt | undefined = load<FormalCandidateRetryReceipt>(retryKey(cursor.task_id), "service:formal-candidate-retry");
      const task: ResearchTask | undefined = store.getTask(cursor.task_id);
      const parent: FormalCandidateReservation | undefined = retry
        ? load<FormalCandidateReservation>(generationKey(retry.parent_task_id, retry.parent_generation), "service:formal-generation") : undefined;
      if (!retry || !task || !parent || retry.schema_version !== "comath.formal_candidate_retry.v1"
        || retry.task_id !== cursor.task_id || retry.dispatch_id !== dispatch.dispatch_id || retry.candidate_id !== cursor.candidate_id
        || retry.draft_sha256 !== cursor.draft_sha256 || !Number.isSafeInteger(retry.parent_generation) || retry.parent_generation < 1
        || retry.parent_task_id !== task.parent_task_id || retry.parent_candidate_id !== parent.candidate_id || parent.dispatch_id !== dispatch.dispatch_id
        || task.kind !== "formalize" || task.specialization !== `formal_candidate:${parent.variant_id}`
        || task.problem_slice !== `obligation:${parent.obligation_id}` || !same(task.scope, parent.scope)
        || task.coupling_label !== `formal:${parent.obligation_id}:a${parent.stage_attempt}`) fail("FORMAL_DISPATCH_RECEIPT_INVALID");
      const expected = { ...parent, task_id: cursor.task_id, candidate_id: retry.candidate_id, generation: 1,
        draft_sha256: retry.draft_sha256, proof_authority: "none" as const };
      if (!same(cursor, expected)) fail("FORMAL_DISPATCH_RECEIPT_INVALID");
      cursor = parent;
    }
    const root = cursor && dispatch.bindings.find(value => value.task_id === cursor!.task_id);
    if (!cursor || !root || !same({ ...cursor, candidate_id: root.candidate_id, generation: 1 }, root)) fail("FORMAL_DISPATCH_RECEIPT_INVALID");
    const generation = load<FormalCandidateReservation>(generationKey(binding.task_id, binding.generation), "service:formal-generation");
    if (!generation || !same(generation, binding)) fail("FORMAL_DISPATCH_RECEIPT_INVALID");
    // This is a historical reservation, not an accepted submission or a current-attempt authorization.
    return binding;
  }
  function readTaskCandidateReservation(taskId: string, generation: number): FormalCandidateReservation | undefined {
    owner(); id.parse(taskId);
    if (!Number.isSafeInteger(generation) || generation < 1) fail("FORMAL_RESERVATION_GENERATION_INVALID");
    const value = load<FormalCandidateReservation>(generationKey(taskId, generation), "service:formal-generation");
    return value && readCandidateReservation(value.candidate_id);
  }
  function recordTaskRetry(previous: ResearchTask, next: ResearchTask): FormalCandidateReservation {
    owner(previous.campaign_id);
    if (previous.kind !== "formalize" || !previous.specialization?.startsWith("formal_candidate:")
      || next.parent_task_id !== previous.task_id || next.task_id === previous.task_id || next.campaign_id !== previous.campaign_id
      || next.kind !== "formalize" || next.status !== "queued" || next.generation !== 0
      || next.specialization !== previous.specialization || !same(next.scope, previous.scope)
      || next.problem_slice !== previous.problem_slice || next.coupling_label !== previous.coupling_label
      || next.question !== previous.question || !same(next.acceptance, previous.acceptance)
      || next.role_template !== previous.role_template || next.model_policy_id !== previous.model_policy_id || next.tool_policy_id !== previous.tool_policy_id
      || next.pool !== previous.pool || next.priority !== previous.priority || !same(next.budget, previous.budget)
      || next.method_family !== previous.method_family || !same(next.exclusions, previous.exclusions)) fail("FORMAL_RESERVATION_TASK_UNBOUND");
    const parentGeneration = Math.max(1, previous.generation);
    const parent = readTaskCandidateReservation(previous.task_id, parentGeneration);
    if (!parent || !same(parent.scope, next.scope)) fail("FORMAL_RESERVATION_TASK_UNBOUND");
    const control = store.getCampaign(next.campaign_id);
    if (!control) fail("FORMAL_DISPATCH_CAMPAIGN_NOT_RUNNING");
    const active = current({ campaign_id: parent.campaign_id, obligation_id: parent.obligation_id,
      stage_attempt: parent.stage_attempt, expected_revision: control.revision });
    if (!same(active.approved.scope, parent.scope)) fail("FORMAL_DISPATCH_OBLIGATION_CHANGED");
    const binding: FormalCandidateReservation = { ...parent, candidate_id: store.allocateId("CAND"), task_id: next.task_id,
      generation: 1, draft_sha256: hash(next), proof_authority: "none" };
    const receipt: FormalCandidateRetryReceipt = { schema_version: "comath.formal_candidate_retry.v1", task_id: next.task_id,
      parent_task_id: previous.task_id, parent_generation: parentGeneration, parent_candidate_id: parent.candidate_id,
      candidate_id: binding.candidate_id, dispatch_id: binding.dispatch_id, draft_sha256: binding.draft_sha256, proof_authority: "none" };
    save(reservationKey(binding.candidate_id), "service:formal-reservation", binding);
    save(generationKey(binding.task_id, binding.generation), "service:formal-generation", binding);
    save(retryKey(binding.task_id), "service:formal-candidate-retry", receipt);
    return binding;
  }
  function readDispatchBindings(raw: FormalCandidateDispatchReceipt): FormalCandidateReservation[] {
    owner(raw.campaign_id);
    const dispatch = load<FormalCandidateDispatchReceipt>(raw.dispatch_id, "service:formal-dispatch");
    if (!dispatch || !same(dispatch, raw)) fail("FORMAL_DISPATCH_RECEIPT_INVALID");
    const rows = store.all("SELECT command_id FROM commands WHERE principal_id='service:formal-generation' AND status='committed' AND json_extract(response_json,'$.dispatch_id')=? AND json_extract(response_json,'$.generation')=1 ORDER BY rowid", dispatch.dispatch_id);
    const byTask = new Map<string, FormalCandidateReservation>();
    for (const row of rows) {
      const binding = load<FormalCandidateReservation>(String(row.command_id), "service:formal-generation");
      if (!binding || binding.dispatch_id !== dispatch.dispatch_id || binding.generation !== 1 || byTask.has(binding.task_id)) fail("FORMAL_DISPATCH_RECEIPT_INVALID");
      const verified = readCandidateReservation(binding.candidate_id);
      if (!verified || !same(verified, binding)) fail("FORMAL_DISPATCH_RECEIPT_INVALID");
      byTask.set(binding.task_id, binding);
    }
    for (const original of dispatch.bindings) if (!same(byTask.get(original.task_id), original)) fail("FORMAL_DISPATCH_RECEIPT_INVALID");
    const retries = [...byTask.values()].filter(value => !dispatch.bindings.some(original => original.task_id === value.task_id))
      .sort((a, b) => a.task_id.localeCompare(b.task_id));
    return [...dispatch.bindings, ...retries];
  }
  function ensureCandidateReservationForAttempt(principal: WorkerPrincipal): FormalCandidateReservation {
    owner(principal.campaign_id);
    return store.transaction(() => {
      const task = store.getTask(principal.task_id), attempt = store.get("SELECT * FROM attempts WHERE attempt_key=?", principal.attempt_key);
      if (!task || !attempt || task.campaign_id !== principal.campaign_id || task.generation !== principal.generation || task.kind !== "formalize"
        || attempt.task_id !== task.task_id || Number(attempt.generation) !== task.generation || !["leased", "running"].includes(task.status)
        || !["leased", "running"].includes(String(attempt.state)) || attempt.stop_reason || attempt.stop_requested_at || attempt.fenced_at
        || Number(attempt.termination_confirmed) !== 0 || !(runtime.clock.now() < Date.parse(String(attempt.expires_at)))) fail("FORMAL_RESERVATION_ATTEMPT_REJECTED");
      const original = readTaskCandidateReservation(task.task_id, 1);
      if (!original || !same(task.scope, original.scope) || task.specialization !== `formal_candidate:${original.variant_id}`
        || task.problem_slice !== `obligation:${original.obligation_id}`) fail("FORMAL_RESERVATION_TASK_UNBOUND");
      const control = store.getCampaign(task.campaign_id)!;
      current({ campaign_id: task.campaign_id, obligation_id: original.obligation_id, stage_attempt: original.stage_attempt, expected_revision: control.revision });
      const prior = readTaskCandidateReservation(task.task_id, task.generation); if (prior) return prior;
      const binding = { ...original, candidate_id: store.allocateId("CAND"), generation: task.generation };
      save(reservationKey(binding.candidate_id), "service:formal-reservation", binding);
      save(`formal-generation:${task.task_id}:g${task.generation}`, "service:formal-generation", binding);
      return binding;
    });
  }
  function submitCandidateGenerationTasks(raw: FormalCandidateDispatchInput): FormalCandidateDispatchReceipt {
    if (!profile || !profileHash) fail("FORMAL_DISPATCH_PROFILE_REQUIRED");
    const input = inputSchema.parse(raw);
    owner(input.campaign_id);
    const dispatchId = `formal-dispatch:${hash({ campaign_id: input.campaign_id, obligation_id: input.obligation_id, stage_attempt: input.stage_attempt })}`;
    return store.transaction(() => {
      // A lost receipt is replayed even after stage/campaign advancement. It never creates another batch.
      const prior = load<FormalCandidateDispatchReceipt>(dispatchId, "service:formal-dispatch");
      if (prior) { if (prior.profile_sha256 !== profileHash) fail("FORMAL_DISPATCH_PROFILE_CONFLICT"); return prior; }
      const { campaign, control, obligation, approved } = current(input);
      if (control.revision !== input.expected_revision) fail("RESEARCH_REVISION_CONFLICT");
      const requiredDependencies = [...obligation.dependencies];
      const dependencySources = requiredDependencies.length === 0 ? [] : options.resolveIntegratedDependencies?.({ campaign_id: campaign.campaign_id,
        obligation_id: obligation.obligation_id, required_obligation_ids: requiredDependencies }) ?? fail("FORMAL_DISPATCH_DEPENDENCY_RESOLVER_UNAVAILABLE");
      const resolvedDependencies = dependencySources.map(({ obligation_id, ...ref }) => ({ obligation_id: id.parse(obligation_id), ref: artifactPointerSchema.parse(ref) }));
      if (resolvedDependencies.some(source => !requiredDependencies.includes(source.obligation_id))
        || requiredDependencies.some(obligationId => !resolvedDependencies.some(source => source.obligation_id === obligationId))) fail("FORMAL_DISPATCH_DEPENDENCY_UNRESOLVED");
      const inputRefs = [...new Map([approved.formal_spec_ref, approved.ledger_ref, ...resolvedDependencies.map(source => source.ref)]
        .map(ref => [`${ref.artifact_id}:${ref.sha256}`, ref])).values()];
      // The pure strategy cards use proof-kernel stage names; the durable cursor remains candidate_generation.
      const cards = createGaAgentStageTaskCards({ campaign, obligation, stage: "lemma_sprint", locked_statement_hash: obligation.statement_hash });
      const bindings: FormalCandidateReservation[] = [];
      const drafts: ResearchTaskDraft[] = cards.map(card => {
        const taskId = store.allocateId("FTASK"), candidateId = store.allocateId("CAND");
        const draft: ResearchTaskDraft = { task_id: taskId, depends_on: [], kind: "formalize", scope: approved.scope,
          question: `${card.instructions.join("\n")}\nProduce Lean source for the exact approved theorem ${approved.lock.namespace}.${approved.lock.theorem_name}. Read the approved lock and complete assumption ledger from input_refs.`,
          acceptance: ["Return FormalCandidateSubmission via the formal_candidate worker result branch; upload exact Lean source bytes as artifacts.",
            "Use the exact candidate/task/generation/obligation/variant/scope binding in service context formal_candidate. Never copy an identity from a previous-generation checkpoint.",
            "Preserve the approved theorem, variables, assumptions and permitted imports. Declare introduced assumptions and dependencies; never claim kernel_checked or proof authority."],
          role_template: profile.role_template, model_policy_id: profile.model_policy_id, tool_policy_id: profile.tool_policy_id,
          specialization: `formal_candidate:${card.variant_id}`, pool: "formalization", priority: profile.priority, budget: profile.budget,
          method_family: `formal_candidate/${card.variant_id}`, problem_slice: `obligation:${obligation.obligation_id}`,
          coupling_label: `formal:${obligation.obligation_id}:a${input.stage_attempt}`,
          input_refs: inputRefs, exclusions: ["Do not mutate trusted .comath state.", "Do not substitute a different theorem or undeclared hypothesis."] };
        bindings.push({ candidate_id: candidateId, task_id: taskId, generation: 1, campaign_id: campaign.campaign_id,
          obligation_id: obligation.obligation_id, variant_id: card.variant_id, scope: approved.scope,
          stage_attempt: input.stage_attempt, dispatch_id: dispatchId, draft_sha256: hash(draft), proof_authority: "none" });
        return draft;
      });
      const applied = app.applyPatch({ kind: "internal", id: "service:formal-dispatch" }, {
        command_id: `${dispatchId}:patch`, campaign_id: campaign.campaign_id, base_revision: control.revision,
        create_tasks: drafts, add_dependencies: [], replace_dependencies: [], reprioritize: [], cancel_tasks: [], move_pool: [],
        rationale: "Dispatch eight approved-scope Lean source strategies through normal research admission." });
      options.fault?.("after_patch");
      for (const binding of bindings) {
        save(reservationKey(binding.candidate_id), "service:formal-reservation", binding);
        save(generationKey(binding.task_id, binding.generation), "service:formal-generation", binding);
      }
      options.fault?.("after_reservations");
      const event = app.events.appendEvent({ campaign_id: campaign.campaign_id, type: "FormalCandidateTasksCreated", actor: "service:formal-dispatch",
        payload: { dispatch_id: dispatchId, obligation_id: obligation.obligation_id, stage_attempt: input.stage_attempt,
          task_ids: applied.created_task_ids, candidate_ids: bindings.map(value => value.candidate_id), proof_authority: "none" } });
      const receipt: FormalCandidateDispatchReceipt = { schema_version: "comath.formal_candidate_dispatch.v1", dispatch_id: dispatchId,
        campaign_id: campaign.campaign_id, obligation_id: obligation.obligation_id, stage_attempt: input.stage_attempt,
        profile_sha256: profileHash, bindings, revision: applied.revision, event_seq: event.seq, proof_authority: "none" };
      save(dispatchId, "service:formal-dispatch", receipt);
      store.putCampaign({ ...store.getCampaign(campaign.campaign_id)!, snapshot_seq: event.seq });
      return receipt;
    });
  }
  return { submitCandidateGenerationTasks, readCandidateReservation, readTaskCandidateReservation, ensureCandidateReservationForAttempt,
    recordTaskRetry, readDispatchBindings };
}
