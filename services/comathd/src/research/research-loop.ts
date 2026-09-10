import { createHash } from "node:crypto";
import { z } from "zod";
import { ComathError } from "../errors.js";
import { canonicalJson } from "../verification/runner-contracts.js";
import type { ResearchOrchestrator } from "./research-orchestrator.js";
import type { ResearchEvent } from "./research-store.js";
import { artifactPointerSchema, parseResearchInput, researchDagPatchSchema, researchTaskDraftSchema,
  type ArtifactPointer, type ResearchControlCampaign, type ResearchTask, type ResearchTaskDraft } from "./research-schemas.js";
import { selectTriageCandidates, type TriagePolicyContext } from "./supervisor-policy.js";

const INTERVAL_MS = 15 * 60 * 1000;
const id = z.string().min(1).max(160);
const triggerSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("ordinary"), artifact: artifactPointerSchema }),
  z.strictObject({ kind: z.literal("immediate"), artifact: artifactPointerSchema }),
  z.strictObject({ kind: z.literal("candidate"), artifact: artifactPointerSchema }),
  z.strictObject({ kind: z.literal("operator") })
]);
export type SupervisorTrigger = z.infer<typeof triggerSchema>;
export type ResearchLoopOptions = {
  /** Service-owned classifier. Provider completion/availability events are always ignored. */
  classifyEvent(event: Readonly<ResearchEvent>): SupervisorTrigger | null;
  /** Must synchronously verify accepted source bytes, scope and generation. When proposal is
   * supplied, it must additionally match the accepted artifact's actual parsed content. */
  verifyAcceptedResult(event: Readonly<ResearchEvent>, task: Readonly<ResearchTask>, artifact: Readonly<ArtifactPointer>, proposal?: unknown): boolean;
  verifyPublishedCandidate?: (event: Readonly<ResearchEvent>, task: Readonly<ResearchTask>, artifact: Readonly<ArtifactPointer>) => boolean;
  verifyOperatorEvent(event: Readonly<ResearchEvent>): boolean;
  /** Host ledger feasibility only; dispatch still acquires ordinary scheduler reservations. */
  canAllocateSupervisor(campaign: Readonly<ResearchControlCampaign>, draft: Readonly<ResearchTaskDraft>): boolean;
  triageContext: TriagePolicyContext;
};
const claimSchema = z.strictObject({ command_id: id, campaign_id: id, task: researchTaskDraftSchema });
const finishSchema = z.strictObject({ command_id: id, campaign_id: id, task_id: id,
  generation: z.number().int().positive(), source_event_seq: z.number().int().positive(), artifact: artifactPointerSchema,
  // Invalid proposals are retained as an artifact-bound rejection, not silently repaired.
  proposal: z.unknown() });
export type ClaimSupervisorTurnInput = z.infer<typeof claimSchema>;
export type FinishSupervisorTurnInput = z.infer<typeof finishSchema>;
type ClaimResult = { status: "claimed"; task_id: string; revision: number }
  | { status: "inflight"; task_id: string }
  | { status: "inactive" | "idle" | "backoff" | "budget_blocked" };
type FinishResult = { status: "finished"; revision: number }
  | { status: "proposal_blocked"; code: string; artifact: ArtifactPointer };
function hash(value: unknown): string { return createHash("sha256").update(canonicalJson(value)).digest("hex"); }
function fail(code: string): never { throw new ComathError(code, { code, statusCode: 409 }); }

/** Persistent control primitives, not a second scheduler or an autonomous model loop.
 * The daemon calls recordSupervisorTrigger on wakeups/timer ticks. Tasks created by claim
 * use the existing admission/runtime path; verified accepted-result consumption is injected.
 */
export class ResearchLoop {
  constructor(readonly app: ResearchOrchestrator, private readonly options: ResearchLoopOptions) {}
  private campaign(campaignId: string): ResearchControlCampaign {
    // Existing app read path retains trusted-state read barriers.
    this.app.frontier(campaignId, { limit: 1 });
    return this.app.runtime.store.getCampaign(campaignId)!;
  }
  private receipt<T>(key: string, request: unknown, body: () => T): T {
    const store = this.app.runtime.store, digest = hash(request);
    return store.transaction(() => {
      const old = store.get("SELECT * FROM commands WHERE command_id=?", key);
      if (old) {
        if (old.principal_id !== "internal:research-loop" || old.request_sha256 !== digest || old.status !== "committed") fail("SUPERVISOR_COMMAND_CONFLICT");
        return JSON.parse(String(old.response_json)) as T;
      }
      const response = body();
      store.run("INSERT INTO commands(command_id,principal_id,request_sha256,response_json,status) VALUES (?,'internal:research-loop',?,?,'committed')", key, digest, JSON.stringify(response));
      return response;
    });
  }
  private eventAt(campaignId: string, seq: number): ResearchEvent {
    const event = this.app.events.readEventsAfter({ campaign_id: campaignId, after_seq: seq - 1, limit: 1 })[0];
    if (!event || event.seq !== seq || event.payload_sha256 !== hash(event.payload)) fail("SUPERVISOR_SOURCE_EVENT_INVALID");
    return event;
  }
  private accepted(event: ResearchEvent, ref: ArtifactPointer, proposal?: unknown): ResearchTask {
    if (["WorkerProviderCompleted", "WorkerResultAvailable"].includes(event.type)) fail("SUPERVISOR_SOURCE_NOT_ACCEPTED");
    const task = event.task_id ? this.app.runtime.store.getTask(event.task_id) : undefined;
    if (!task || task.campaign_id !== event.campaign_id || task.generation !== event.generation || task.generation < 1
      || task.status !== "succeeded" || task.accepted_result_id !== ref.artifact_id) fail("SUPERVISOR_SOURCE_BINDING_INVALID");
    if (this.options.verifyAcceptedResult(event, task, ref, proposal) !== true) fail("SUPERVISOR_SOURCE_NOT_VERIFIED");
    return task;
  }
  /** Consume one bounded page in source order. Call again if has_more; cursor is durable.
   * A rejected/unverified event never counts as success and is not guessed into acceptance.
   */
  recordSupervisorTrigger(campaignId: string): { last_event_seq: number; dirty: boolean; has_more: boolean } {
    id.parse(campaignId);
    const { store, clock } = this.app.runtime;
    return store.transaction(() => {
      const campaign = this.campaign(campaignId), supervisor = { ...campaign.supervisor };
      const page = this.app.events.readEventsAfter({ campaign_id: campaignId, after_seq: supervisor.last_event_seq, limit: 200 });
      let snapshotSeq = campaign.snapshot_seq;
      for (const event of page) {
        if (event.payload_sha256 !== hash(event.payload)) fail("SUPERVISOR_SOURCE_EVENT_INVALID");
        supervisor.last_event_seq = event.seq;
        snapshotSeq = Math.max(snapshotSeq, event.seq);
        if (event.actor === "research-loop" || event.type.startsWith("Supervisor") || ["WorkerProviderCompleted", "WorkerResultAvailable"].includes(event.type)) continue;
        // Persisted claim events identify supervisor tasks after restart, preventing self-excitation.
        if (event.task_id && store.get("SELECT seq FROM events WHERE campaign_id=? AND task_id=? AND type='SupervisorTurnClaimed' LIMIT 1", campaignId, event.task_id)) continue;
        const classified = this.options.classifyEvent(event);
        if (classified === null) continue;
        const trigger = triggerSchema.parse(classified);
        let sourceKey: string;
        if (trigger.kind === "operator") {
          if (this.options.verifyOperatorEvent(event) !== true) fail("SUPERVISOR_OPERATOR_EVENT_UNVERIFIED");
          sourceKey = hash({ campaignId, seq: event.seq });
        } else {
          let task: ResearchTask;
          if (trigger.kind === "candidate") {
            const source = event.task_id && store.getTask(event.task_id);
            if (!source || event.type !== "ResearchCandidatePublished" || source.campaign_id !== campaignId
              || this.options.verifyPublishedCandidate?.(event, source, trigger.artifact) !== true) fail("SUPERVISOR_SOURCE_NOT_VERIFIED");
            task = source;
          } else task = this.accepted(event, trigger.artifact);
          sourceKey = hash({ campaignId, task_id: task.task_id, generation: event.generation, artifact: trigger.artifact });
        }
        const key = `supervisor-source:${sourceKey}`;
        if (store.get("SELECT command_id FROM commands WHERE command_id=?", key)) continue;
        store.run("INSERT INTO commands(command_id,principal_id,request_sha256,response_json,status) VALUES (?,'internal:research-loop',?,'{}','committed')", key, hash({ source_event_seq: event.seq }));
        if (trigger.kind === "ordinary") {
          supervisor.ordinary_completed_since_trigger++;
          if (supervisor.ordinary_completed_since_trigger >= 5) supervisor.dirty = true;
        } else {
          supervisor.dirty = true;
          // Persist verified wake provenance, rather than trusting an event name on replay.
          if (trigger.kind === "operator") {
            const wake = this.app.events.appendEvent({ campaign_id: campaignId,
              type: "SupervisorOperatorWake", actor: "research-loop", payload: { source_event_seq: event.seq, proof_authority: "none" } });
            snapshotSeq = Math.max(snapshotSeq, wake.seq);
          }
        }
      }
      if (campaign.state === "running" && clock.now() >= Date.parse(supervisor.next_trigger_at)) {
        supervisor.dirty = true;
        supervisor.next_trigger_at = new Date(clock.now() + INTERVAL_MS).toISOString();
      }
      store.putCampaign({ ...campaign, snapshot_seq: snapshotSeq, supervisor });
      return { last_event_seq: supervisor.last_event_seq, dirty: supervisor.dirty, has_more: page.length === 200 };
    });
  }
  claimSupervisorTurn(raw: ClaimSupervisorTurnInput): ClaimResult {
    const input = parseResearchInput(claimSchema, raw);
    return this.receipt<ClaimResult>(`supervisor-claim:${hash(input.command_id)}`, input, () => {
      const { store, clock } = this.app.runtime;
      const campaign = this.campaign(input.campaign_id);
      if (campaign.state !== "running") return { status: "inactive" };
      if (campaign.supervisor.inflight_task_id) return { status: "inflight", task_id: campaign.supervisor.inflight_task_id };
      if (!campaign.supervisor.dirty) return { status: "idle" };
      if (input.task.kind !== "synthesize") fail("SUPERVISOR_TASK_KIND_INVALID");
      const blocked = store.get("SELECT seq,payload_json FROM events WHERE campaign_id=? AND type='SupervisorBudgetBlocked' ORDER BY seq DESC LIMIT 1", campaign.campaign_id);
      if (blocked) {
        const retryAt = Date.parse(String((JSON.parse(String(blocked.payload_json)) as { retry_at: string }).retry_at));
        const wake = store.get("SELECT seq FROM events WHERE campaign_id=? AND type='SupervisorOperatorWake' AND seq>? LIMIT 1", campaign.campaign_id, Number(blocked.seq));
        if (clock.now() < retryAt && !wake) return { status: "backoff" };
      }
      if (this.options.canAllocateSupervisor(campaign, input.task) !== true) {
        const retryAt = new Date(clock.now() + INTERVAL_MS).toISOString();
        const event = this.app.events.appendEvent({ campaign_id: campaign.campaign_id, type: "SupervisorBudgetBlocked", actor: "research-loop",
          payload: { reason: "supervisor_budget_unavailable", retry_at: retryAt, proof_authority: "none" } });
        store.putCampaign({ ...campaign, snapshot_seq: event.seq, supervisor: { ...campaign.supervisor, next_trigger_at: retryAt } });
        return { status: "budget_blocked" };
      }
      const result = this.app.applyPatch({ kind: "supervisor", id: "research-loop", campaign_id: campaign.campaign_id }, {
        command_id: `supervisor-create:${hash(input.command_id)}`, campaign_id: campaign.campaign_id, base_revision: campaign.revision,
        create_tasks: [input.task], add_dependencies: [], replace_dependencies: [], reprioritize: [], cancel_tasks: [], move_pool: [],
        rationale: "Run a budget-managed supervisor over the current accepted research evidence"
      });
      const current = this.campaign(campaign.campaign_id);
      const event = this.app.events.appendEvent({ campaign_id: campaign.campaign_id, task_id: input.task.task_id, type: "SupervisorTurnClaimed", actor: "research-loop",
        payload: { revision: result.revision, source_cursor: campaign.supervisor.last_event_seq, proof_authority: "none" } });
      store.putCampaign({ ...current, snapshot_seq: event.seq, supervisor: { ...current.supervisor, dirty: false,
        ordinary_completed_since_trigger: 0, inflight_task_id: input.task.task_id, next_trigger_at: new Date(clock.now() + INTERVAL_MS).toISOString() } });
      return { status: "claimed", task_id: input.task.task_id, revision: result.revision };
    });
  }
  finishSupervisorTurn(raw: FinishSupervisorTurnInput): FinishResult {
    const input = parseResearchInput(finishSchema, raw);
    return this.receipt<FinishResult>(`supervisor-finish:${hash(input.command_id)}`, input, () => {
      const { store } = this.app.runtime;
      const campaign = this.campaign(input.campaign_id);
      if (campaign.state !== "running") fail("SUPERVISOR_CAMPAIGN_INACTIVE");
      if (campaign.supervisor.inflight_task_id !== input.task_id) fail("SUPERVISOR_INFLIGHT_MISMATCH");
      const source = this.eventAt(campaign.campaign_id, input.source_event_seq);
      if (source.task_id !== input.task_id || source.generation !== input.generation) fail("SUPERVISOR_GENERATION_MISMATCH");
      this.accepted(source, input.artifact, input.proposal);
      const parsed = researchDagPatchSchema.safeParse(input.proposal);
      let blockedCode: string | undefined;
      if (!parsed.success) blockedCode = "SUPERVISOR_PROPOSAL_INVALID";
      else if (parsed.data.campaign_id !== campaign.campaign_id) blockedCode = "SUPERVISOR_PROPOSAL_CAMPAIGN_MISMATCH";
      else if (parsed.data.base_revision !== campaign.revision) blockedCode = "RESEARCH_REVISION_CONFLICT";
      let result: ReturnType<ResearchOrchestrator["applyPatch"]> | undefined;
      if (!blockedCode && parsed.success) {
        try {
          result = this.app.applyPatch({ kind: "supervisor", id: "research-loop", campaign_id: campaign.campaign_id }, parsed.data);
        } catch (error) {
          if (!(error instanceof ComathError)) throw error;
          blockedCode = error.code;
        }
      }
      if (blockedCode) {
        const event = this.app.events.appendEvent({ campaign_id: campaign.campaign_id, task_id: input.task_id, generation: input.generation,
          type: "SupervisorProposalBlocked", actor: "research-loop", payload: { code: blockedCode, source_event_seq: source.seq,
            artifact: input.artifact, proposal_sha256: hash(input.proposal), requires_new_proposal: true, proof_authority: "none" } });
        store.putCampaign({ ...campaign, snapshot_seq: event.seq });
        return { status: "proposal_blocked", code: blockedCode, artifact: input.artifact };
      }
      const current = this.campaign(campaign.campaign_id);
      const { inflight_task_id: _inflight, ...supervisor } = current.supervisor;
      const event = this.app.events.appendEvent({ campaign_id: campaign.campaign_id, task_id: input.task_id, generation: input.generation,
        type: "SupervisorTurnFinished", actor: "research-loop", payload: { source_event_seq: source.seq, artifact: input.artifact,
          revision: result!.revision, proof_authority: "none" } });
      store.putCampaign({ ...current, snapshot_seq: event.seq, supervisor });
      return { status: "finished", revision: result!.revision };
    });
  }
  /** Proposal advice only. Artifact acceptance is the caller's service-owned responsibility. */
  selectTriageCandidates(input: unknown) { return selectTriageCandidates(input, this.options.triageContext); }
}
export function createResearchLoop(app: ResearchOrchestrator, options: ResearchLoopOptions): ResearchLoop {
  return new ResearchLoop(app, options);
}
