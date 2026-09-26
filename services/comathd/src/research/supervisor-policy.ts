import { z } from "zod";
import { canonicalJson } from "../verification/runner-contracts.js";
import { artifactPointerSchema, parseResearchInput, researchTaskSchema, scopeBindingSchema, type ResearchTask } from "./research-schemas.js";

/** Policy input only: rank and recommendations confer no mathematical authority. */
export const triageResultSchema = z.strictObject({
  task_id: z.string().min(1).max(160),
  scope: scopeBindingSchema,
  rank: z.number().int().min(0).max(4),
  progress_refs: z.array(artifactPointerSchema).max(100),
  blocker_refs: z.array(artifactPointerSchema).max(100),
  method_family: z.string().trim().min(1).max(8192),
  recommendation: z.enum(["deepen", "discard", "needs_evidence"])
});
export type TriageResult = z.infer<typeof triageResultSchema>;
export type HardBlockerState = "clear" | "unresolved" | "unverified";
export type TriagePolicyContext = {
  /** Service-owned lookup over verified evidence, never a model-supplied clearance flag.
   * The caller also verifies accepted result provenance before invoking this policy.
   */
  getHardBlockerState(task: Readonly<ResearchTask>, result: Readonly<TriageResult>): HardBlockerState;
};
export type TriageSelection = {
  eligible_count: number;
  selected_task_ids: string[];
  proof_authority: "none";
  can_promote_claim: false;
};
const inputSchema = z.strictObject({
  tasks: z.array(researchTaskSchema),
  results: z.array(triageResultSchema)
});

/** Deterministic, side-effect-free recommendation. Does not mutate tasks or issue a DAG patch.
 * Supply a current single-campaign task snapshot and a read-only host blocker resolver.
 */
export function selectTriageCandidates(input: unknown, context: TriagePolicyContext): TriageSelection {
  const { tasks, results } = parseResearchInput(inputSchema, input);
  if (typeof context?.getHardBlockerState !== "function") throw new Error("TRIAGE_HOST_BLOCKER_RESOLVER_REQUIRED");
  const byId = new Map<string, ResearchTask>();
  for (const task of tasks) {
    if (byId.has(task.task_id)) throw new Error("TRIAGE_DUPLICATE_TASK_ID");
    byId.set(task.task_id, task);
  }
  if (new Set(tasks.map(task => task.campaign_id)).size > 1) throw new Error("TRIAGE_CAMPAIGN_MISMATCH");
  const seen = new Set<string>();
  const candidates: Array<{ task: ResearchTask; result: TriageResult }> = [];
  for (const result of results) {
    if (seen.has(result.task_id)) throw new Error("TRIAGE_DUPLICATE_RESULT_ID");
    seen.add(result.task_id);
    const task = byId.get(result.task_id);
    if (!task) throw new Error("TRIAGE_TASK_NOT_FOUND");
    if (canonicalJson(task.scope) !== canonicalJson(result.scope)) throw new Error("TRIAGE_SCOPE_MISMATCH");
    if (task.method_family !== result.method_family) throw new Error("TRIAGE_METHOD_MISMATCH");
    if (task.status === "cancelled" || task.status === "cancelling" || result.recommendation === "discard") continue;
    const blockerState = context.getHardBlockerState(task, result);
    if (!["clear", "unresolved", "unverified"].includes(blockerState)) throw new Error("TRIAGE_INVALID_HOST_BLOCKER_STATE");
    if (blockerState === "clear") candidates.push({ task, result });
  }
  // Code-unit comparison is independent of host locale and input enumeration order.
  candidates.sort((a, b) => a.result.rank - b.result.rank || a.task.priority - b.task.priority
    || (a.task.task_id < b.task.task_id ? -1 : a.task.task_id > b.task.task_id ? 1 : 0));
  const count = candidates.length === 0 ? 0 : Math.min(candidates.length, Math.max(1, Math.ceil(candidates.length / 4)));
  const selected: string[] = [];
  const families = new Set<string>();
  for (const candidate of candidates) {
    if (selected.length === count) break;
    if (families.has(candidate.task.method_family)) continue;
    families.add(candidate.task.method_family);
    selected.push(candidate.task.task_id);
  }
  const selectedSet = new Set(selected);
  for (const candidate of candidates) {
    if (selected.length === count) break;
    if (!selectedSet.has(candidate.task.task_id)) {
      selected.push(candidate.task.task_id);
      selectedSet.add(candidate.task.task_id);
    }
  }
  return { eligible_count: candidates.length, selected_task_ids: selected, proof_authority: "none", can_promote_claim: false };
}
