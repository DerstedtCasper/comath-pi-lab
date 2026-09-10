import { createHash } from "node:crypto";
import { ComathError } from "../errors.js";
import { listArtifactRefs } from "../artifacts/store.js";
import { canonicalJson } from "../verification/runner-contracts.js";
import type { WorkerPrincipal } from "../control/worker-auth.js";
import type { ProjectRuntime } from "./project-runtime.js";
import type { ContextPackPolicy } from "./context-pack-builder.js";
import { createFailureIndex, failureMemorySchema, fingerprintRoute, type FailureIndexOptions, type RouteFingerprintInput } from "./failure-index.js";
import type { ResearchControlCampaign, ResearchTask, ResearchTaskDraft } from "./research-schemas.js";
import { createHardBlockerPolicy, type HardBlockerClassifier } from "./blocker-policy.js";

export type ResearchFailureOptions = {
  policyForTask: (task: ResearchTask) => ContextPackPolicy;
  verifyRetryCondition?: FailureIndexOptions["verifyRetryCondition"];
  classifyHardBlocker?: HardBlockerClassifier;
};
function fail(code: string, message: string): never { throw new ComathError(message, { code, statusCode: 409 }); }
/** One route fingerprint source for DAG admission, runtime admission and worker failure records. */
export function createResearchFailureService(runtime: ProjectRuntime, options: ResearchFailureOptions) {
  let validatingDraft: ResearchTask | undefined;
  const authorizeArtifact: FailureIndexOptions["authorizeArtifact"] = (taskId, ref, scope) => {
      const task = validatingDraft?.task_id === taskId ? validatingDraft : runtime.store.getTask(taskId);
      if (!task || canonicalJson(task.scope) !== canonicalJson(scope)) return false;
      const projectId = runtime.store.getCampaign(task.campaign_id)?.project_id;
      const artifact = listArtifactRefs(runtime.root).find(value => value.id === ref.artifact_id && value.sha256 === ref.sha256 && value.project_id === projectId);
      return !!artifact && options.policyForTask(task).authorizeArtifact(task, ref);
    };
  const index = createFailureIndex(runtime, { authorizeArtifact, verifyRetryCondition: options.verifyRetryCondition });
  const blockers = createHardBlockerPolicy(runtime, { authorizeArtifact, verifyRetryCondition: options.verifyRetryCondition,
    classifyHardBlocker: options.classifyHardBlocker });
  function routeFor(task: ResearchTask, policy = options.policyForTask(task)): RouteFingerprintInput {
    const dependencies = [...policy.mandatory, ...(policy.selected ?? []), ...(policy.lazy ?? [])]
      .filter(source => ["dependency", "definition", "public_lemma"].includes(source.kind)).map(source => source.ref.sha256);
    return { scope: task.scope, question: task.question, hypothesis: task.hypothesis, method_family: task.method_family,
      problem_slice: task.problem_slice, normalized_assumptions: [...policy.assumptions], dependency_hashes: dependencies };
  }
  function validateRoute(draft: ResearchTaskDraft, campaign: ResearchControlCampaign): void {
    if (draft.kind === "legacy_run") return;
    const timestamp = new Date(runtime.clock.now()).toISOString();
    const task: ResearchTask = { ...draft, campaign_id: campaign.campaign_id, generation: 0, status: "queued", fault_retry_count: 0,
      created_at: timestamp, updated_at: timestamp };
    const previous = validatingDraft; validatingDraft = task;
    try {
      const route = routeFor(task);
      const decision = index.checkRetryConditions({ task_id: task.task_id, route, new_evidence_refs: task.input_refs });
      if (!decision.allowed) fail("RESEARCH_FAILED_ROUTE_BLOCKED", `Exact route is already failed: ${decision.blocking_failure_ids.join(", ")}`);
      const shared = blockers.check(task, route);
      if (!shared.allowed) throw Object.assign(new ComathError(
        `Shared immutable blocker evidence recurred in ${shared.distinct_task_count} distinct tasks; only structural synthesis is admitted until the host verifies resolution. Failures: ${shared.blocking_failure_ids.join(", ")}. This is explicit evidence clustering, not a semantic proof judgment.`,
        { code: "RESEARCH_SHARED_HARD_BLOCKER", statusCode: 409 }),
      { details: { blocking_failure_ids: shared.blocking_failure_ids, distinct_task_count: shared.distinct_task_count,
        cluster_ids: shared.clusters.map(cluster => cluster.cluster_id), required_task_kind: "synthesize", proof_authority: "none" } });
    } finally { validatingDraft = previous; }
  }
  function recordWorkerFailure(principal: WorkerPrincipal, request: unknown) {
    const envelope = request as { command_id?: unknown; payload?: unknown };
    if (typeof envelope.command_id !== "string" || !envelope.command_id || envelope.command_id.length > 160) fail("FAILURE_INPUT_INVALID", "Failure command needs a bounded command ID");
    const failure = failureMemorySchema.parse(envelope.payload);
    const task = runtime.store.getTask(principal.task_id);
    if (!task || task.generation !== principal.generation || failure.created_by_task_id !== task.task_id) fail("FAILURE_TASK_MISMATCH", "Worker failure belongs to another task or generation");
    const expected = routeFor(task);
    if (failure.route_fingerprint !== fingerprintRoute(expected)
      || fingerprintRoute({ ...expected, normalized_assumptions: failure.normalized_assumptions, dependency_hashes: failure.dependency_hashes }) !== fingerprintRoute(expected)) {
      fail("FAILURE_ROUTE_MISMATCH", "Failure assumptions and dependencies do not match the service context");
    }
    const commandId = `worker-failure:${task.task_id}:g${task.generation}:${envelope.command_id}`;
    const digest = createHash("sha256").update(canonicalJson(failure)).digest("hex");
    return runtime.store.transaction(() => {
      const receipt = runtime.store.get("SELECT request_sha256,response_json FROM commands WHERE command_id=?", commandId);
      if (receipt) {
        if (receipt.request_sha256 !== digest) fail("COMMAND_PAYLOAD_CONFLICT", "Failure command ID refers to different content");
        return JSON.parse(String(receipt.response_json));
      }
      const record = index.recordFailure(failure);
      const proposal = index.toGraphPatchProposal(record.failure.failure_id, { patch_id: runtime.store.allocateId("GP"), node_id: runtime.store.allocateId("FR"), created_by: "service:failure-index" });
      // Preserve the actual submitted source when the exact-route index reuses a canonical
      // failure from another task. This is provenance for distinct-task blocker counting.
      const result = { ...record, source_failure: failure, source_generation: task.generation, graph_patch_proposal: proposal, proof_authority: "none" };
      runtime.store.run("INSERT INTO commands(command_id,principal_id,request_sha256,response_json,status) VALUES (?,'service:worker-failure',?,?,'committed')", commandId, digest, JSON.stringify(result));
      return result;
    });
  }
  return { index, blockers, routeFor, validateRoute, recordWorkerFailure };
}
