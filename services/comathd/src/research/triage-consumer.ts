import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { ComathError } from "../errors.js";
import { listArtifactRefs } from "../artifacts/store.js";
import { canonicalJson } from "../verification/runner-contracts.js";
import { resolveProjectCommitPath } from "./project-commit.js";
import { artifactPointerSchema, type ResearchTaskDraft } from "./research-schemas.js";
import type { ResearchOrchestrator } from "./research-orchestrator.js";
import { researchResultSchema, type ResearchResultService } from "./research-result-service.js";
import { selectTriageCandidates, type TriagePolicyContext } from "./supervisor-policy.js";

const hash = (value: unknown) => createHash("sha256").update(canonicalJson(value)).digest("hex");
function fail(code: string): never { throw new ComathError(code, { code, statusCode: 409 }); }

/** Turn accepted strategic rankings into ordinary C4 successors; never promote a claim. */
export function createTriageConsumer(app: ResearchOrchestrator, results: ResearchResultService, policy: TriagePolicyContext) {
  function consume(campaignId: string): number {
    const runtime = app.runtime, campaign = runtime.store.getCampaign(campaignId);
    if (!campaign || campaign.state !== "running") return 0;
    let processed = 0;
    const events = runtime.store.all("SELECT seq FROM events WHERE campaign_id=? AND type='ResearchResultAccepted' AND NOT EXISTS (SELECT 1 FROM commands WHERE command_id='triage-event:'||events.seq AND principal_id='internal:triage-consumer') ORDER BY seq LIMIT 100", campaignId);
    for (const row of events) {
      runtime.store.transaction(() => {
        const seq = Number(row.seq), event = app.events.readEventsAfter({ campaign_id: campaignId, after_seq: seq - 1, limit: 1 })[0];
        const source = event.task_id && runtime.store.getTask(event.task_id);
        const ref = artifactPointerSchema.parse((event.payload as Record<string, unknown>).result_ref);
        if (!source || !results.verifyAcceptedResult(event, source, ref)) fail("TRIAGE_SOURCE_NOT_VERIFIED");
        const registered = listArtifactRefs(runtime.root).find(value => value.id === ref.artifact_id && value.sha256 === ref.sha256);
        if (!registered) fail("TRIAGE_SOURCE_NOT_VERIFIED");
        const path = resolveProjectCommitPath(runtime.root, registered.path);
        if (statSync(path).size > 256 * 1024) fail("TRIAGE_SOURCE_TOO_LARGE");
        const bytes = readFileSync(path);
        if (createHash("sha256").update(bytes).digest("hex") !== ref.sha256) fail("TRIAGE_SOURCE_NOT_VERIFIED");
        const result = researchResultSchema.parse(JSON.parse(bytes.toString("utf8")));
        let selection: ReturnType<typeof selectTriageCandidates> | undefined;
        const createdIds: string[] = [];
        if (result.triage) {
          if (source.kind !== "synthesize" || source.specialization !== "triage") fail("TRIAGE_SOURCE_NOT_VERIFIED");
          const targets = result.triage.map(item => {
            const target = runtime.store.getTask(item.task_id);
            if (!target || target.campaign_id !== campaignId || target.pool !== "exploration" || target.specialization === "triage") fail("TRIAGE_SOURCE_NOT_VERIFIED");
            return target;
          });
          selection = selectTriageCandidates({ tasks: targets, results: result.triage }, policy);
          const drafts: ResearchTaskDraft[] = selection.selected_task_ids.map(id => {
            const target = targets.find(task => task.task_id === id)!;
            if (target.status !== "succeeded" || !target.accepted_result_id) fail("TRIAGE_SOURCE_NOT_VERIFIED");
            const targetRef = listArtifactRefs(runtime.root).find(value => value.id === target.accepted_result_id);
            if (!targetRef || !source.input_refs.some(allowed => allowed.artifact_id === targetRef.id && allowed.sha256 === targetRef.sha256)) fail("TRIAGE_SOURCE_NOT_VERIFIED");
            const inputRefs = [...new Map([...target.input_refs, { artifact_id: targetRef.id, sha256: targetRef.sha256 }, ref].map(value => [`${value.artifact_id}:${value.sha256}`, value])).values()];
            if (inputRefs.length > 100) fail("TRIAGE_CONTEXT_REFERENCE_LIMIT");
            const taskId = runtime.store.allocateId("TASK"); createdIds.push(taskId);
            return { task_id: taskId, parent_task_id: target.task_id, depends_on: [], kind: target.scope.kind === "charter" ? "synthesize" : target.kind,
              question: `Deepen the accepted result from ${target.task_id}, resolving its remaining questions under the unchanged declared scope and assumptions.`,
              acceptance: [...target.acceptance], role_template: target.role_template, model_policy_id: target.model_policy_id, tool_policy_id: target.tool_policy_id,
              scope: target.scope, pool: "deepening", priority: target.priority, budget: { ...target.budget },
              method_family: target.method_family, problem_slice: target.problem_slice, coupling_label: target.coupling_label,
              specialization: "deepening", input_refs: inputRefs, exclusions: [...target.exclusions] };
          });
          if (drafts.length) app.applyPatch({ kind: "internal", id: "triage-consumer" }, {
            command_id: `triage-patch:${seq}`, campaign_id: campaignId, base_revision: runtime.store.getCampaign(campaignId)!.revision,
            create_tasks: drafts, add_dependencies: [], replace_dependencies: [], reprioritize: [], cancel_tasks: [], move_pool: [],
            rationale: "Deepen the deterministic eligible triage selection using existing pool limits and task policies"
          });
          app.events.appendEvent({ campaign_id: campaignId, task_id: source.task_id, generation: source.generation, type: "TriageSelectionApplied",
            actor: "service:triage", payload: { source_event_seq: seq, source_ref: ref, ...selection, created_task_ids: createdIds } });
        }
        const response = { source_event_seq: seq, source_ref: ref, selected_task_ids: selection?.selected_task_ids ?? [], created_task_ids: createdIds, proof_authority: "none" };
        runtime.store.run("INSERT INTO commands(command_id,principal_id,request_sha256,response_json,status) VALUES (?,'internal:triage-consumer',?,?,'committed')", `triage-event:${seq}`, hash({ seq, ref }), JSON.stringify(response));
        processed++;
      });
    }
    return processed;
  }
  return { consume };
}
