import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { z } from "zod";
import { listArtifactRefs } from "../artifacts/store.js";
import { ComathError } from "../errors.js";
import { canonicalJson } from "../verification/runner-contracts.js";
import { assertProjectReadable, resolveProjectCommitPath } from "./project-commit.js";
import { getAcquiredProjectRuntime } from "./project-runtime.js";
import type { ResearchOrchestrator } from "./research-orchestrator.js";
import type { ResearchCandidateReceipt, ResearchResult, ResearchResultService } from "./research-result-service.js";
import type { ContextPackPolicy, ContextSource } from "./context-pack-builder.js";
import { artifactPointerSchema, taskBudgetSchema, researchPoolSchema, type ArtifactPointer, type ResearchTask, type ResearchTaskDraft, type ScopeBinding } from "./research-schemas.js";
import { VALIDATION_SLOTS, type ValidationRoleSlot } from "./validation-contracts.js";

const id = z.string().min(1).max(160), text = z.string().min(1).max(8192), strings = z.array(text).max(100);
const claimsSchema = z.array(z.strictObject({ statement: text, assumptions: strings })).min(1).max(100);
const contextSourceSchema = z.strictObject({ ref: artifactPointerSchema, kind: z.enum(["approved_lock", "assumption_ledger", "statement", "definition", "public_lemma", "tool_instructions", "other"]), source: z.string().min(1).max(200) });
export const validationStatementBriefSchema = z.strictObject({ schema_version: z.literal("comath.validation_statement_brief.v1"), candidate_id: id,
  root_scope_sha256: z.string().regex(/^[a-f0-9]{64}$/), claims: claimsSchema, approved_assumptions: strings, proof_authority: z.literal("none") });
export type ValidationStatementBrief = z.infer<typeof validationStatementBriefSchema>;
const profileSchema = z.strictObject({ model_policy_id: id, tool_policy_id: id, role_template: id, budget: taskBudgetSchema,
  pool: researchPoolSchema, priority: z.number().int().min(0).max(4), context_byte_cap: z.number().int().min(1024).max(16 * 1024 * 1024) });
export type ValidationSlotProfile = z.infer<typeof profileSchema>;
const toolPolicySchema = z.strictObject({ visibility: z.enum(["task", "blind"]), allowed_tools: z.array(id).max(100), new_thread: z.boolean() });
export type ValidationToolPolicy = z.infer<typeof toolPolicySchema>;
export type ValidationApprovedRoot = { scope: Extract<ScopeBinding, { kind: "formal" }>; approved_lock: ContextSource;
  assumption_ledger: ContextSource; assumptions: string[] };
export type PreparedValidationContext = { statement_brief: ContextSource; public_sources: ContextSource[] };
export type ValidationFanoutInput = { candidate_id: string; policy_version: string; source_event_seq: number };
export type ValidationFanoutReceipt = {
  schema_version: "comath.validation_fanout.v1"; candidate_id: string; policy_version: string; policy_sha256: string;
  campaign_id: string; source_task_id: string; source_generation: number; source_event_seq: number; candidate_ref: ArtifactPointer;
  scope: Extract<ScopeBinding, { kind: "formal" }>; approved_assumptions: string[]; candidate_claims: ValidationStatementBrief["claims"];
  root_material: { approved_lock: ContextSource; assumption_ledger: ContextSource }; statement_brief: ContextSource; public_sources: ContextSource[];
  created_task_ids: string[]; slots: { role_slot: ValidationRoleSlot; task_id: string; profile: ValidationSlotProfile; tool_policy: ValidationToolPolicy; context_sha256: string }[];
  revision: number; event_seq: number; proof_authority: "none";
};
type StoredContext = { task_id: string; candidate_id: string; policy_version: string; scope: ScopeBinding; profile: ValidationSlotProfile; tool_policy: ValidationToolPolicy;
  visibility: "task" | "blind"; mandatory: ContextSource[]; selected: ContextSource[]; lazy: ContextSource[]; statement_brief: ContextSource; assumptions: string[];
  include_parent_checkpoint: false; new_thread_required: boolean };
export type ValidationFanoutOptions = {
  policy_version: string; profiles: Record<ValidationRoleSlot, ValidationSlotProfile>;
  verifyPublishedCandidate: ResearchResultService["verifyPublishedCandidate"];
  resolveToolPolicy: (toolPolicyId: string) => ValidationToolPolicy | undefined;
  authorizeArtifact: (task: Readonly<ResearchTask>, ref: Readonly<ArtifactPointer>) => boolean;
  /** Host approval producer only. No worker booleans or reconstructed lemma locks. */
  resolveApprovedRoot?: (source: Readonly<ResearchTask>, candidate: Readonly<ResearchResult>) => ValidationApprovedRoot | null | Promise<ValidationApprovedRoot | null>;
  /** Produces/chooses already registered CAS material; fanout never guesses a brief from a ref. */
  prepareContext?: (input: { candidate_id: string; candidate_ref: ArtifactPointer; candidate: ResearchResult; root: ValidationApprovedRoot; policy_version: string }) => PreparedValidationContext | Promise<PreparedValidationContext>;
  fault?: (stage: "after_patch" | "after_bindings" | "before_receipt") => void;
};
const hash = (value: unknown) => createHash("sha256").update(canonicalJson(value)).digest("hex");
const bytesHash = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex");
const key = (ref: Readonly<ArtifactPointer>) => `${ref.artifact_id}:${ref.sha256}`;
const commandId = (candidate_id: string, policy_version: string) => `validation-fanout:${hash({ candidate_id, policy_version })}`;
const contextId = (taskId: string) => `validation-context:${taskId}`;
const blind = (slot: ValidationRoleSlot) => slot === "reproduce_a" || slot === "reproduce_b";
function fail(code: string): never { throw new ComathError(code, { code, statusCode: 409 }); }

/** Deterministic policy fanout, not an autonomous evaluator or a proof promotion path. */
export function createValidationFanout(app: ResearchOrchestrator, options: ValidationFanoutOptions) {
  const { runtime } = app, store = runtime.store, principal = { kind: "internal" as const, id: "validation-fanout" };
  id.parse(options.policy_version);
  function owner(): void { if (getAcquiredProjectRuntime(runtime.root) !== runtime) fail("RESEARCH_OWNER_REQUIRED"); }
  function profiles() {
    return VALIDATION_SLOTS.map(role_slot => {
      const parsed = profileSchema.safeParse(options.profiles[role_slot]); if (!parsed.success) fail("VALIDATION_PROFILE_REQUIRED");
      const profile = parsed.data, resolved = toolPolicySchema.safeParse(options.resolveToolPolicy(profile.tool_policy_id));
      if (!resolved.success) fail("VALIDATION_TOOL_POLICY_REQUIRED");
      const tool_policy = resolved.data;
      if (blind(role_slot) && (tool_policy.visibility !== "blind" || !tool_policy.new_thread)) fail("VALIDATION_BLIND_POLICY_REQUIRED");
      if (!blind(role_slot) && tool_policy.visibility !== "task") fail("VALIDATION_TOOL_POLICY_INVALID");
      if (role_slot === "formalization_probe" && tool_policy.allowed_tools.some(tool => !["retrieval.search", "retrieval.read", "theorem_search.query"].includes(tool))) fail("VALIDATION_PROBE_POLICY_UNSAFE");
      return { role_slot, profile, tool_policy };
    });
  }
  function cas(source: Readonly<ResearchTask>, ref: Readonly<ArtifactPointer>): Buffer {
    const registered = listArtifactRefs(runtime.root).find(value => value.id === ref.artifact_id);
    const path = `.comath/artifacts/sha256/${ref.sha256.slice(0, 2)}/${ref.sha256}`;
    if (!registered || registered.sha256 !== ref.sha256 || registered.project_id !== store.getCampaign(source.campaign_id)?.project_id || registered.path.replace(/\\/g, "/") !== path) fail("VALIDATION_ARTIFACT_INVALID");
    assertProjectReadable(runtime.root, path, source.campaign_id);
    const absolute = resolveProjectCommitPath(runtime.root, path), info = statSync(absolute);
    if (!info.isFile() || info.size !== registered.size_bytes || info.size > 16 * 1024 * 1024) fail("VALIDATION_ARTIFACT_INVALID");
    const bytes = readFileSync(absolute); if (bytesHash(bytes) !== ref.sha256) fail("VALIDATION_ARTIFACT_INVALID"); return bytes;
  }
  function material(source: ResearchTask, value: ContextSource): ContextSource {
    const parsed = contextSourceSchema.parse(value);
    if (options.authorizeArtifact(source, parsed.ref) !== true) fail("VALIDATION_ARTIFACT_DENIED");
    cas(source, parsed.ref); return parsed;
  }
  function publication(input: ValidationFanoutInput) {
    owner();
    const indexed = store.get("SELECT * FROM candidates WHERE candidate_id=?", input.candidate_id);
    if (!indexed) fail("VALIDATION_CANDIDATE_NOT_FOUND");
    const source = app.getTask(String(indexed.source_task_id));
    const event = app.events.readEventsAfter({ campaign_id: source.campaign_id, after_seq: input.source_event_seq - 1, limit: 1 })[0];
    const receipt = event?.payload as unknown as ResearchCandidateReceipt;
    if (!event || event.seq !== input.source_event_seq || event.type !== "ResearchCandidatePublished" || receipt.candidate_id !== input.candidate_id) fail("VALIDATION_SOURCE_INVALID");
    const ref = artifactPointerSchema.parse(receipt.result_ref);
    if (options.verifyPublishedCandidate(event, source, ref) !== true) fail("VALIDATION_SOURCE_INVALID");
    if (source.scope.kind !== "formal") fail("VALIDATION_ROOT_SCOPE_REQUIRED");
    const candidate = JSON.parse(cas(source, ref).toString("utf8")) as ResearchResult;
    if (!Array.isArray(candidate.claims) || !candidate.claims.length) fail("VALIDATION_STATEMENT_REQUIRED");
    const claims = claimsSchema.parse(candidate.claims.map(claim => ({ statement: claim.statement, assumptions: claim.assumptions })));
    return { source, event, ref, candidate, claims, scope: source.scope };
  }
  function loadContext(taskId: string): StoredContext | undefined {
    const row = store.get("SELECT * FROM commands WHERE command_id=?", contextId(taskId));
    if (!row) return undefined;
    const value = JSON.parse(String(row.response_json)) as StoredContext;
    if (row.principal_id !== "service:validation-context" || row.status !== "committed" || row.request_sha256 !== hash(value) || value.task_id !== taskId) fail("VALIDATION_CONTEXT_CORRUPT");
    return value;
  }
  function readValidationFanout(candidateId: string, policyVersion: string): ValidationFanoutReceipt | undefined {
    owner(); id.parse(candidateId); id.parse(policyVersion);
    const row = store.get("SELECT * FROM commands WHERE command_id=?", commandId(candidateId, policyVersion)); if (!row) return undefined;
    const receipt = JSON.parse(String(row.response_json)) as ValidationFanoutReceipt;
    if (row.principal_id !== "service:validation-fanout" || row.status !== "committed" || row.request_sha256 !== hash(receipt)
      || receipt.candidate_id !== candidateId || receipt.policy_version !== policyVersion || receipt.slots.length !== 6) fail("VALIDATION_RECEIPT_CORRUPT");
    const current = publication({ candidate_id: candidateId, policy_version: policyVersion, source_event_seq: receipt.source_event_seq });
    if (canonicalJson(current.claims) !== canonicalJson(receipt.candidate_claims) || canonicalJson(current.ref) !== canonicalJson(receipt.candidate_ref)
      || canonicalJson(current.scope) !== canonicalJson(receipt.scope)) fail("VALIDATION_RECEIPT_CORRUPT");
    for (const source of [receipt.root_material.approved_lock, receipt.root_material.assumption_ledger, receipt.statement_brief, ...receipt.public_sources]) cas(current.source, source.ref);
    for (const slot of receipt.slots) {
      const context = loadContext(slot.task_id); if (!context || hash(context) !== slot.context_sha256) fail("VALIDATION_CONTEXT_CORRUPT");
    }
    return receipt;
  }
  async function requestValidationFanout(raw: ValidationFanoutInput): Promise<ValidationFanoutReceipt> {
    const input = z.strictObject({ candidate_id: id, policy_version: id, source_event_seq: z.number().int().positive().max(Number.MAX_SAFE_INTEGER) }).parse(raw);
    if (input.policy_version !== options.policy_version) fail("VALIDATION_POLICY_UNAVAILABLE");
    const source = publication(input), profileRows = profiles(), policyHash = hash(profileRows);
    const existing = readValidationFanout(input.candidate_id, input.policy_version);
    if (existing) { if (existing.policy_sha256 !== policyHash) fail("VALIDATION_POLICY_CONFLICT"); return existing; }
    if (!options.resolveApprovedRoot || !options.prepareContext) fail("VALIDATION_CONTEXT_PRODUCER_UNAVAILABLE");
    const root = await options.resolveApprovedRoot(source.source, source.candidate);
    if (!root || canonicalJson(root.scope) !== canonicalJson(source.scope)) fail("VALIDATION_ROOT_UNAPPROVED");
    const rootAssumptions = strings.parse(root.assumptions), lock = material(source.source, root.approved_lock), ledger = material(source.source, root.assumption_ledger);
    if (lock.kind !== "approved_lock" || lock.ref.sha256 !== source.scope.formal_spec_sha256 || ledger.kind !== "assumption_ledger" || ledger.ref.sha256 !== source.scope.ledger_sha256) fail("VALIDATION_ROOT_BINDING_INVALID");
    const prepared = await options.prepareContext({ candidate_id: input.candidate_id, candidate_ref: source.ref, candidate: source.candidate, root, policy_version: input.policy_version });
    const brief = material(source.source, prepared.statement_brief);
    if (brief.kind !== "statement") fail("VALIDATION_STATEMENT_BRIEF_REQUIRED");
    const briefValue = validationStatementBriefSchema.parse(JSON.parse(cas(source.source, brief.ref).toString("utf8")));
    if (briefValue.candidate_id !== input.candidate_id || briefValue.root_scope_sha256 !== hash(source.scope)
      || canonicalJson(briefValue.claims) !== canonicalJson(source.claims) || canonicalJson(briefValue.approved_assumptions) !== canonicalJson(rootAssumptions)) fail("VALIDATION_STATEMENT_BINDING_INVALID");
    if (!Array.isArray(prepared.public_sources) || prepared.public_sources.length > 50) fail("VALIDATION_PUBLIC_SOURCES_INVALID");
    const proofRefs = source.candidate.claims.flatMap(claim => claim.artifact_refs), protectedHashes = new Set([source.ref.sha256, lock.ref.sha256, ledger.ref.sha256, ...proofRefs.map(ref => ref.sha256)]);
    const publics = prepared.public_sources.map(value => material(source.source, value));
    for (const value of [brief, ...publics]) if (protectedHashes.has(value.ref.sha256) || value !== brief && !["definition", "public_lemma", "tool_instructions"].includes(value.kind)) fail("VALIDATION_BLIND_SOURCE_DENIED");
    const proofSources = proofRefs.map(ref => material(source.source, { ref, kind: "other", source: "candidate_claim_artifact" }));
    const contexts = profileRows.map(({ role_slot, profile, tool_policy }) => {
      const task_id = `VAL-${hash({ candidate_id: input.candidate_id, policy_version: input.policy_version, role_slot }).slice(0, 48)}`;
      const isBlind = blind(role_slot), isProbe = role_slot === "formalization_probe";
      const value: StoredContext = { task_id, candidate_id: input.candidate_id, policy_version: input.policy_version, scope: source.scope, profile, tool_policy,
        visibility: isBlind ? "blind" : "task", mandatory: isBlind ? [...publics] : [lock, ledger, brief, ...publics],
        selected: isBlind || isProbe ? [] : [{ ref: source.ref, kind: "other", source: "accepted_candidate_publication" }],
        lazy: isBlind || isProbe ? [] : proofSources, statement_brief: brief, assumptions: [...rootAssumptions],
        include_parent_checkpoint: false, new_thread_required: isBlind || tool_policy.new_thread };
      return { role_slot, task_id, profile, tool_policy, value, context_sha256: hash(value) };
    });
    const kinds = { referee: "referee", counterexample: "falsify", reproduce_a: "reproduce", reproduce_b: "reproduce", novelty: "novelty_check", formalization_probe: "clarify_spec" } as const;
    const drafts: ResearchTaskDraft[] = contexts.map(({ role_slot, task_id, profile, value }) => ({ task_id, parent_task_id: source.source.task_id, depends_on: [], kind: kinds[role_slot],
      question: `${role_slot === "formalization_probe" ? "Draft only candidate statements and dependency/formalization requirements; do not search a proof body or execute Lean." : blind(role_slot) ? "Independently reproduce every claim using only the statement brief and public prerequisites; do not access the original argument." : `Perform independent ${role_slot} examination of every declared candidate claim.`} Candidate ${input.candidate_id}.`,
      acceptance: [`Return kind=validation, candidate_id=${input.candidate_id}, role_slot=${role_slot}, and the complete C4 assessment fields.`, "Distinguish proposed candidate assumptions from approved root assumptions; never promote mathematical status."],
      role_template: profile.role_template, model_policy_id: profile.model_policy_id, tool_policy_id: profile.tool_policy_id, specialization: `validation:${role_slot}`,
      scope: source.scope, pool: profile.pool, priority: profile.priority as 0 | 1 | 2 | 3 | 4, budget: profile.budget,
      method_family: `validation/${role_slot}`, problem_slice: `candidate:${input.candidate_id}`, coupling_label: input.candidate_id,
      input_refs: [...new Map([brief, ...value.mandatory, ...value.selected, ...value.lazy].map(value => [key(value.ref), value.ref])).values()], exclusions: [] }));
    return store.transaction(() => {
      const latest = publication(input), duplicate = readValidationFanout(input.candidate_id, input.policy_version);
      if (duplicate) { if (duplicate.policy_sha256 !== policyHash) fail("VALIDATION_POLICY_CONFLICT"); return duplicate; }
      if (canonicalJson(latest.scope) !== canonicalJson(source.scope)) fail("VALIDATION_SOURCE_CHANGED");
      for (const context of contexts) for (const sourceRef of [context.value.statement_brief, ...context.value.mandatory, ...context.value.selected, ...context.value.lazy]) material(latest.source, sourceRef);
      const campaign = store.getCampaign(source.source.campaign_id)!;
      const applied = app.applyPatch(principal, { command_id: `validation-patch:${hash(input)}`, campaign_id: campaign.campaign_id, base_revision: campaign.revision,
        create_tasks: drafts, add_dependencies: [], replace_dependencies: [], reprioritize: [], cancel_tasks: [], move_pool: [], rationale: "Create six policy-bound candidate assessment tasks without waiting for source termination." });
      options.fault?.("after_patch");
      for (const context of contexts) {
        app.bindValidationSlot(principal, { command_id: `validation-slot:${hash({ task_id: context.task_id })}`, campaign_id: campaign.campaign_id,
          candidate_id: input.candidate_id, source_task_id: source.source.task_id, payload_sha256: source.ref.sha256, policy_version: input.policy_version, role_slot: context.role_slot, task_id: context.task_id });
        store.run("INSERT INTO commands(command_id,principal_id,request_sha256,response_json,status) VALUES (?,'service:validation-context',?,?,'committed')",
          contextId(context.task_id), context.context_sha256, canonicalJson(context.value));
      }
      options.fault?.("after_bindings");
      const event = app.events.appendEvent({ campaign_id: campaign.campaign_id, type: "ValidationFanoutCreated", actor: "service:validation-fanout",
        payload: { candidate_id: input.candidate_id, policy_version: input.policy_version, task_ids: applied.created_task_ids, source_event_seq: input.source_event_seq, proof_authority: "none" } });
      const receipt: ValidationFanoutReceipt = { schema_version: "comath.validation_fanout.v1", ...input, policy_sha256: policyHash,
        campaign_id: campaign.campaign_id, source_task_id: source.source.task_id, source_generation: Number(source.event.generation), candidate_ref: source.ref,
        scope: source.scope, approved_assumptions: rootAssumptions, candidate_claims: source.claims, root_material: { approved_lock: lock, assumption_ledger: ledger }, statement_brief: brief, public_sources: publics,
        created_task_ids: applied.created_task_ids, slots: contexts.map(({ role_slot, task_id, profile, tool_policy, context_sha256 }) => ({ role_slot, task_id, profile, tool_policy, context_sha256 })),
        revision: applied.revision, event_seq: event.seq, proof_authority: "none" };
      options.fault?.("before_receipt");
      store.run("INSERT INTO commands(command_id,principal_id,request_sha256,response_json,status) VALUES (?,'service:validation-fanout',?,?,'committed')",
        commandId(input.candidate_id, input.policy_version), hash(receipt), canonicalJson(receipt));
      return receipt;
    });
  }
  function contextPolicyForTask(task: ResearchTask): (ContextPackPolicy & { include_parent_checkpoint: false }) | undefined {
    owner(); const stored = loadContext(task.task_id); if (!stored) {
      if (task.specialization?.startsWith("validation:")) {
        if (store.get("SELECT current_task_id FROM validation_tasks WHERE current_task_id=?", task.task_id)) fail("VALIDATION_REPLACEMENT_CONTEXT_UNAVAILABLE");
        fail("VALIDATION_CONTEXT_MISSING");
      }
      return undefined;
    }
    const actual = app.getTask(task.task_id);
    if (actual.generation !== task.generation || actual.campaign_id !== task.campaign_id || canonicalJson(actual.scope) !== canonicalJson(stored.scope)
      || canonicalJson(task.scope) !== canonicalJson(stored.scope) || task.tool_policy_id !== stored.profile.tool_policy_id) fail("VALIDATION_CONTEXT_SCOPE_MISMATCH");
    const receipt = readValidationFanout(stored.candidate_id, stored.policy_version);
    if (!receipt || !receipt.slots.some(slot => slot.task_id === task.task_id && slot.context_sha256 === hash(stored))) fail("VALIDATION_CONTEXT_CORRUPT");
    const currentPolicy = toolPolicySchema.safeParse(options.resolveToolPolicy(task.tool_policy_id));
    if (!currentPolicy.success || canonicalJson(currentPolicy.data) !== canonicalJson(stored.tool_policy)) fail("VALIDATION_TOOL_POLICY_CHANGED");
    const refs = new Set([stored.statement_brief, ...stored.mandatory, ...stored.selected, ...stored.lazy].map(source => key(source.ref)));
    for (const source of [stored.statement_brief, ...stored.mandatory, ...stored.selected, ...stored.lazy]) cas(task, source.ref);
    return { byte_cap: stored.profile.context_byte_cap, visibility: stored.visibility, mandatory: stored.mandatory, selected: stored.selected,
      lazy: stored.lazy, statement_brief: stored.statement_brief, assumptions: stored.assumptions, include_parent_checkpoint: false,
      authorizeArtifact: (current, ref) => current.task_id === task.task_id && current.generation === task.generation
        && canonicalJson(current.scope) === canonicalJson(stored.scope) && refs.has(key(ref)) && options.authorizeArtifact(current, ref) === true };
  }
  return { requestValidationFanout, readValidationFanout, contextPolicyForTask };
}
