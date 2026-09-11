import { z } from "zod";
import { createHash } from "node:crypto";
import { canonicalJson } from "../verification/runner-contracts.js";

const id = z.string().min(1).max(160);
const text = z.string().trim().min(1).max(8192);
const strings = z.array(text).max(100);
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
export const artifactPointerSchema = z.strictObject({ artifact_id: id, sha256: sha256Schema });
export const scopeBindingSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("charter"), charter_sha256: sha256Schema }),
  z.strictObject({ kind: z.literal("formal"), claim_id: id, statement_hash: sha256Schema,
    formal_spec_sha256: sha256Schema, ledger_sha256: sha256Schema, approval_id: id })
]);
export const taskKindSchema = z.enum(["intake", "clarify_spec", "retrieve", "explore", "derive", "compute", "falsify", "synthesize", "referee", "reproduce", "novelty_check", "formalize", "proof_workflow", "legacy_run"]);
export const taskStatusSchema = z.enum(["queued", "leased", "running", "blocked", "cancelling", "succeeded", "failed", "cancelled"]);
export const researchPoolSchema = z.enum(["exploration", "deepening", "validation", "formalization"]);
export const usageSchema = z.strictObject({ input_tokens: count.nullable(), cached_input_tokens: count.nullable(),
  output_tokens: count.nullable(), reasoning_output_tokens: count.nullable(), tool_calls: count.nullable(),
  wall_ms: count, cost_microusd: count.nullable() });
export const taskBudgetSchema = z.strictObject({ output_tokens: count, tool_calls: count, wall_ms: count.positive(),
  cost_microusd: count.optional(), token_enforcement: z.enum(["observed_stop", "exact_output_cap", "wall_only_legacy"]) });
const draftFields = {
  task_id: id, parent_task_id: id.optional(), depends_on: z.array(id).max(100), kind: taskKindSchema,
  question: text.refine(value => Buffer.byteLength(value, "utf8") <= 8192 && !/^try to prove it[.!]?$/i.test(value), "Question must be specific and at most 8 KiB"),
  hypothesis: text.optional(), acceptance: z.array(text).min(1).max(20), role_template: id,
  specialization: text.optional(), model_policy_id: id, tool_policy_id: id, scope: scopeBindingSchema,
  pool: researchPoolSchema, priority: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  budget: taskBudgetSchema, method_family: text, problem_slice: text, coupling_label: text,
  input_refs: z.array(artifactPointerSchema).max(100), exclusions: strings
};
function validCharterScope(task: { scope: { kind: string }; kind: string }): boolean {
  return task.scope.kind !== "charter" || ["intake", "clarify_spec", "retrieve", "synthesize", "legacy_run"].includes(task.kind);
}
export const researchTaskDraftSchema = z.strictObject(draftFields).refine(validCharterScope, "Task kind requires formal scope");
export const researchTaskSchema = z.strictObject({ ...draftFields, campaign_id: id, status: taskStatusSchema,
  generation: count, fault_retry_count: count, blocked_reason: text.optional(), retry_after: z.iso.datetime().optional(),
  checkpoint_head: id.optional(), accepted_result_id: id.optional(), created_at: z.iso.datetime(), updated_at: z.iso.datetime()
  , legacy_run_id: z.string().regex(/^ARUN-\d{4,}$/).optional()
}).refine(validCharterScope, "Task kind requires formal scope");
export const researchCharterSchema = z.strictObject({ goal: text, approach_hints: strings.default([]), constraints: strings, success_criteria: z.array(text).min(1).max(100) });
export function normalizeResearchCharter(input: z.input<typeof researchCharterSchema>) {
  const charter = researchCharterSchema.parse(input);
  return { ...charter, sha256: createHash("sha256").update(canonicalJson(charter)).digest("hex") };
}
export const researchControlCampaignSchema = z.strictObject({ campaign_id: id, project_id: id, revision: count,
  state: z.enum(["preparing", "running", "pausing", "paused", "blocked", "completed", "cancelled"]),
  charter: researchCharterSchema.extend({ sha256: sha256Schema }),
  max_active_workers: z.number().int().min(1).max(64), budget_policy_id: id,
  supervisor: z.strictObject({ dirty: z.boolean(), inflight_task_id: id.optional(), last_event_seq: count,
    ordinary_completed_since_trigger: count, next_trigger_at: z.iso.datetime() }), snapshot_seq: count
});
export const researchDagPatchSchema = z.strictObject({ command_id: id, campaign_id: id, base_revision: count,
  create_tasks: z.array(researchTaskDraftSchema).max(100),
  add_dependencies: z.array(z.strictObject({ task_id: id, prerequisite_id: id })).max(100),
  replace_dependencies: z.array(z.strictObject({ task_id: id, old_prerequisite_id: id, new_prerequisite_id: id })).max(100),
  reprioritize: z.array(z.strictObject({ task_id: id, priority: draftFields.priority })).max(100),
  cancel_tasks: z.array(z.strictObject({ task_id: id, reason: text })).max(100),
  move_pool: z.array(z.strictObject({ task_id: id, pool: researchPoolSchema, rationale: text })).max(100), rationale: text
}).refine(patch => patch.create_tasks.length + patch.add_dependencies.length + patch.replace_dependencies.length + patch.reprioritize.length + patch.cancel_tasks.length + patch.move_pool.length <= 100, "At most 100 patch operations");
export const researchEventInputSchema = z.strictObject({ campaign_id: id, task_id: id.optional(), generation: count.optional(),
  type: id, actor: id, payload: z.json(), created_at: z.iso.datetime().optional() });

/** Parse external JSON once; internal handlers can consume the resulting typed value. */
export function parseResearchInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const serialized = JSON.stringify(input);
  if (serialized === undefined || Buffer.byteLength(serialized, "utf8") > 1024 * 1024) throw new Error("Research JSON body exceeds 1 MiB");
  return schema.parse(input);
}
export const researchJsonSchemas = {
  ArtifactPointer: z.toJSONSchema(artifactPointerSchema), ScopeBinding: z.toJSONSchema(scopeBindingSchema),
  Usage: z.toJSONSchema(usageSchema), TaskBudget: z.toJSONSchema(taskBudgetSchema),
  ResearchTaskDraft: z.toJSONSchema(researchTaskDraftSchema), ResearchTask: z.toJSONSchema(researchTaskSchema),
  ResearchControlCampaign: z.toJSONSchema(researchControlCampaignSchema), ResearchDagPatch: z.toJSONSchema(researchDagPatchSchema)
};
export type ArtifactPointer = z.infer<typeof artifactPointerSchema>;
export type ScopeBinding = z.infer<typeof scopeBindingSchema>;
export type TaskKind = z.infer<typeof taskKindSchema>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type Usage = z.infer<typeof usageSchema>;
export type TaskBudget = z.infer<typeof taskBudgetSchema>;
export type ResearchTaskDraft = z.infer<typeof researchTaskDraftSchema>;
export type ResearchTask = z.infer<typeof researchTaskSchema>;
export type ResearchControlCampaign = z.infer<typeof researchControlCampaignSchema>;
export type ResearchDagPatch = z.infer<typeof researchDagPatchSchema>;
export type ResearchEventInput = z.infer<typeof researchEventInputSchema>;
