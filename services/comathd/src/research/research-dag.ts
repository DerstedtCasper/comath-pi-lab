import { ComathError } from "../errors.js";
import type { ResearchControlCampaign, ResearchDagPatch, ResearchTask, ResearchTaskDraft } from "./research-schemas.js";

function reject(code: string, message: string): never {
  throw new ComathError(message, { code, statusCode: 409 });
}
export function validateResearchTaskGraph(tasks: readonly ResearchTask[]): void {
  const byId = new Map(tasks.map(task => [task.task_id, task]));
  if (byId.size !== tasks.length) reject("RESEARCH_TASK_DUPLICATE", "Duplicate task IDs");
  for (const task of tasks) {
    if (task.parent_task_id && (!byId.has(task.parent_task_id) || task.parent_task_id === task.task_id)) {
      reject("RESEARCH_PARENT_INVALID", "Parent must reference another task in the same campaign");
    }
    if (new Set(task.depends_on).size !== task.depends_on.length) reject("RESEARCH_DEPENDENCY_DUPLICATE", "Duplicate prerequisite");
    for (const prerequisite of task.depends_on) {
      const dependency = byId.get(prerequisite);
      if (!dependency) reject("RESEARCH_DEPENDENCY_UNKNOWN", `Unknown prerequisite ${prerequisite}`);
      if (dependency.campaign_id !== task.campaign_id) reject("RESEARCH_DEPENDENCY_CAMPAIGN", "Dependency crosses campaign");
    }
  }
  // Iterative Kahn traversal also handles large frontiers without recursive stack growth.
  const incoming = new Map(tasks.map(task => [task.task_id, task.depends_on.length]));
  const dependents = new Map<string, string[]>();
  for (const task of tasks) for (const prerequisite of task.depends_on) {
    const children = dependents.get(prerequisite) ?? [];
    children.push(task.task_id); dependents.set(prerequisite, children);
  }
  const ready = tasks.filter(task => task.depends_on.length === 0).map(task => task.task_id);
  for (let index = 0; index < ready.length; index++) {
    for (const child of dependents.get(ready[index]) ?? []) {
      const remaining = incoming.get(child)! - 1; incoming.set(child, remaining);
      if (remaining === 0) ready.push(child);
    }
  }
  if (ready.length !== tasks.length) reject("RESEARCH_DAG_CYCLE", "Research dependencies contain a cycle");
}

/** Calculate the complete after-graph without mutating storage or allocating resources. */
export function validateResearchDagPatch(
  campaign: ResearchControlCampaign,
  existing: readonly ResearchTask[],
  patch: ResearchDagPatch,
  options: { now: string; validateDraft: (draft: ResearchTaskDraft) => void }
): { tasks: ResearchTask[]; created_task_ids: string[]; cancelled_task_ids: string[] } {
  if (campaign.campaign_id !== patch.campaign_id) reject("RESEARCH_CAMPAIGN_MISMATCH", "Patch campaign mismatch");
  if (campaign.revision !== patch.base_revision) {
    throw Object.assign(new ComathError("Research revision changed", { code: "RESEARCH_REVISION_CONFLICT", statusCode: 409 }), { details: { current_revision: campaign.revision } });
  }
  const tasks = new Map(existing.map(task => [task.task_id, structuredClone(task)]));
  const requireTask = (id: string): ResearchTask => {
    const value = tasks.get(id);
    if (!value) reject("RESEARCH_TASK_UNKNOWN", `Task ${id} is not in this campaign`);
    return value;
  };
  const requirePending = (id: string): ResearchTask => {
    const value = requireTask(id);
    if (value.status !== "queued" && value.status !== "blocked") reject("RESEARCH_TASK_STATE_CONFLICT", "Dependencies can change only on pending tasks");
    return value;
  };
  for (const draft of patch.create_tasks) {
    if (tasks.has(draft.task_id)) reject("RESEARCH_TASK_DUPLICATE", `Task ${draft.task_id} already exists`);
    options.validateDraft(draft);
    tasks.set(draft.task_id, { ...structuredClone(draft), campaign_id: campaign.campaign_id,
      status: "queued", generation: 0, fault_retry_count: 0, created_at: options.now, updated_at: options.now });
  }
  for (const edge of patch.add_dependencies) {
    const task = requirePending(edge.task_id); requireTask(edge.prerequisite_id);
    if (task.depends_on.includes(edge.prerequisite_id)) reject("RESEARCH_DEPENDENCY_DUPLICATE", "Dependency already exists");
    task.depends_on.push(edge.prerequisite_id); task.updated_at = options.now;
  }
  for (const edge of patch.replace_dependencies) {
    const task = requirePending(edge.task_id); requireTask(edge.new_prerequisite_id);
    if (!task.depends_on.includes(edge.old_prerequisite_id)) reject("RESEARCH_DEPENDENCY_UNKNOWN", "Replaced dependency does not exist");
    task.depends_on = task.depends_on.map(id => id === edge.old_prerequisite_id ? edge.new_prerequisite_id : id);
    task.updated_at = options.now;
  }
  for (const change of patch.reprioritize) {
    const task = requireTask(change.task_id);
    if (["succeeded", "failed", "cancelled"].includes(task.status)) reject("RESEARCH_TASK_STATE_CONFLICT", "Cannot reprioritize a terminal task");
    task.priority = change.priority; task.updated_at = options.now;
  }
  for (const change of patch.move_pool) {
    const task = requireTask(change.task_id);
    if (task.status !== "queued") reject("RESEARCH_TASK_STATE_CONFLICT", "Only queued tasks can move budget pools");
    task.pool = change.pool; task.updated_at = options.now;
  }
  for (const change of patch.cancel_tasks) {
    const task = requireTask(change.task_id);
    if (["succeeded", "failed", "cancelled"].includes(task.status)) reject("RESEARCH_TASK_STATE_CONFLICT", "Cannot cancel a terminal task");
    task.status = task.status === "queued" || task.status === "blocked" ? "cancelled" : "cancelling";
    task.blocked_reason = change.reason; task.updated_at = options.now;
  }
  const after = [...tasks.values()];
  validateResearchTaskGraph(after);
  return { tasks: after, created_task_ids: patch.create_tasks.map(task => task.task_id), cancelled_task_ids: patch.cancel_tasks.map(task => task.task_id) };
}
