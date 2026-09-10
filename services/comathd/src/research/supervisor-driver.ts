import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { ComathError } from "../errors.js";
import type { ResearchConfig } from "../config/config.js";
import { listArtifactRefs } from "../artifacts/store.js";
import { canonicalJson } from "../verification/runner-contracts.js";
import type { ResearchOrchestrator } from "./research-orchestrator.js";
import type { PortfolioScheduler } from "./portfolio-scheduler.js";
import type { ResearchEvent } from "./research-store.js";
import type { createResearchResultService } from "./research-result-service.js";
import { createResearchLoop } from "./research-loop.js";
import { artifactPointerSchema, researchJsonSchemas, type ResearchControlCampaign, type ResearchTask, type ResearchTaskDraft } from "./research-schemas.js";
import type { ContextPackPolicy, ContextSource } from "./context-pack-builder.js";
import { prepareArtifact, commitArtifactReference } from "./research-artifacts.js";
import { resolveProjectCommitPath, withProjectCommit } from "./project-commit.js";

const fingerprint = (value: unknown) => createHash("sha256").update(canonicalJson(value)).digest("hex");
const FAMILY = "service_supervisor";
function fail(code: string): never { throw new ComathError(code, { code, statusCode: 409 }); }

/** Conservative default. Formal assumption extraction and blind statement selection require
 * an explicit host policy; an empty list must not impersonate a complete formal ledger. */
export function defaultResearchContextPolicy(task: ResearchTask, visibility: "task" | "blind"): Omit<ContextPackPolicy, "byte_cap" | "visibility"> {
  if (visibility === "blind") fail("CONTEXT_BLIND_BRIEF_REQUIRED");
  if (task.scope.kind === "formal") fail("CONTEXT_DEFAULT_FORMAL_POLICY_REQUIRED");
  const sources: ContextSource[] = task.input_refs.map(ref => ({ ref, kind: "other", source: "exact_task_input" }));
  return { mandatory: task.method_family === FAMILY ? sources : [], lazy: sources, assumptions: [],
    authorizeArtifact: (current, ref) => current.task_id === task.task_id && current.generation === task.generation
      && current.input_refs.some(allowed => allowed.artifact_id === ref.artifact_id && allowed.sha256 === ref.sha256) };
}

type ResultService = ReturnType<typeof createResearchResultService>;
export type SupervisorWorkerControl = { steer(attemptKey: string, instruction: string): Promise<void>; stop(attemptKey: string): Promise<void> };
/** Host-owned event consumer. No provider calls, custom runtime, budget increases or proof promotion. */
export class SupervisorDriver {
  private running = false;
  private closed = false;
  private requested = false;
  private pending?: Promise<void>;
  private fatalError?: unknown;
  private unsubscribe?: () => void;
  private timer?: ReturnType<typeof setInterval>;
  readonly loop;
  readonly blockers = new Map<string, string>();
  constructor(private readonly app: ResearchOrchestrator, private readonly scheduler: PortfolioScheduler,
    private readonly config: ResearchConfig, private readonly results: ResultService, private readonly control?: SupervisorWorkerControl) {
    if (!config.supervisor) fail("SUPERVISOR_CONFIG_REQUIRED");
    this.loop = createResearchLoop(app, {
      classifyEvent: event => {
        if (this.operatorEvent(event)) return { kind: "operator" };
        if (event.type !== "ResearchResultAccepted") return null;
        const payload = event.payload as Record<string, unknown>, ref = artifactPointerSchema.safeParse(payload.result_ref);
        const task = event.task_id ? app.runtime.store.getTask(event.task_id) : undefined;
        if (!ref.success || !task || results.verifyAcceptedResult(event, task, ref.data) !== true) fail("SUPERVISOR_SOURCE_NOT_VERIFIED");
        return { kind: payload.result_kind === "breakthrough" ? "immediate" : "ordinary", artifact: ref.data };
      },
      verifyAcceptedResult: (event, task, ref, proposal) => results.verifyAcceptedResult(event, task, ref, proposal),
      verifyOperatorEvent: event => this.operatorEvent(event),
      canAllocateSupervisor: (campaign, draft) => this.affordable(campaign, draft),
      // No triage acceptance consumer is connected here yet; never grant clearance by default.
      triageContext: { getHardBlockerState: () => "unverified" }
    });
  }
  private operatorEvent(event: Readonly<ResearchEvent>): boolean {
    if (!["DagPatched", "BudgetUpdated"].includes(event.type) || event.actor === "research-loop") return false;
    const rows = this.app.runtime.store.all("SELECT principal_id,response_json FROM commands WHERE status='committed' AND json_extract(response_json,'$.snapshot_seq')=?", event.seq);
    return rows.some(row => {
      if (row.principal_id !== `operator:${event.actor}`) return false;
      const receipt = JSON.parse(String(row.response_json)) as { snapshot_seq: number; revision: number };
      return receipt.snapshot_seq === event.seq && receipt.revision === (event.payload as Record<string, unknown>).revision;
    });
  }
  private affordable(campaign: Readonly<ResearchControlCampaign>, draft: Readonly<ResearchTaskDraft>): boolean {
    try {
      for (const pool of ["campaign", draft.pool] as const) {
        const account = this.scheduler.budget.read(campaign.campaign_id, pool);
        for (const key of ["output_tokens", "tool_calls", "wall_ms", "cost_microusd"] as const) {
          if (key === "cost_microusd" && account.limits.cost_microusd === undefined) continue;
          const wanted = draft.budget[key], available = account.available[key];
          if (wanted === undefined || available === null || available < wanted) return false;
        }
      }
      return true;
    } catch (error) { if (error instanceof ComathError && error.code === "BUDGET_NOT_CONFIGURED") return false; throw error; }
  }
  private draft(campaign: ResearchControlCampaign, key: string): ResearchTaskDraft {
    const host = this.config.supervisor!;
    return { task_id: `TASK-supervisor-${key.slice(0, 32)}`, depends_on: [], kind: "synthesize",
      question: "Read the complete service portfolio snapshot and propose a justified C4 research DAG patch at its declared revision.",
      acceptance: ["Submit the actual C4 patch through research_worker_propose; never apply it locally", "Preserve cancelled routes, scope, total budget and Lean authority"],
      role_template: host.role_template, model_policy_id: host.model_policy_id, tool_policy_id: host.tool_policy_id,
      scope: { kind: "charter", charter_sha256: campaign.charter.sha256 }, pool: "exploration", priority: 0,
      budget: host.budget, method_family: FAMILY, problem_slice: "portfolio", coupling_label: "portfolio",
      input_refs: [], exclusions: ["No proof promotion", "No host approval or budget-limit changes"] };
  }
  private async snapshot(campaign: ResearchControlCampaign, draft: ResearchTaskDraft) {
    const sourceSeq = Number(this.app.runtime.store.get("SELECT COALESCE(MAX(seq),0) AS seq FROM events WHERE campaign_id=?", campaign.campaign_id)!.seq);
    const frontier: unknown[] = [];
    let cursor: string | undefined;
    do {
      const page = this.app.frontier(campaign.campaign_id, { after_task_id: cursor, limit: 100 });
      if (page.revision !== campaign.revision) fail("SUPERVISOR_SNAPSHOT_STALE");
      frontier.push(...page.tasks); cursor = page.next_cursor ?? undefined;
    } while (cursor !== undefined);
    const operatorEvents: ResearchEvent[] = [];
    let after = 0;
    while (true) {
      const events = this.app.events.readEventsAfter({ campaign_id: campaign.campaign_id, after_seq: after, limit: 200 });
      operatorEvents.push(...events.filter(event => this.operatorEvent(event)));
      if (events.length < 200) break;
      after = events.at(-1)!.seq;
    }
    const snapshot = { schema_version: "comath.supervisor_input.v1", campaign_id: campaign.campaign_id,
      snapshot_revision: campaign.revision, proposal_base_revision: campaign.revision + 1,
      source_event_cursor: campaign.supervisor.last_event_seq, snapshot_event_seq: sourceSeq, charter: campaign.charter, operator_events: operatorEvents,
      guidance_authority: "strategy_only_not_assumptions_or_evidence", frontier,
      proposal_schema: researchJsonSchemas.ResearchDagPatch,
      host_task_defaults: { model_policy_id: draft.model_policy_id, tool_policy_id: draft.tool_policy_id,
        role_template: draft.role_template, budget: draft.budget },
      budget: Object.fromEntries((["campaign", "exploration", "deepening", "validation", "formalization"] as const).map(pool => [pool, this.scheduler.budget.read(campaign.campaign_id, pool)])),
      instructions: ["Return one actual C4 patch with command_id/campaign_id/base_revision/create_tasks/add_dependencies/replace_dependencies/reprioritize/cancel_tasks/move_pool/rationale.",
        "Use proposal_base_revision for the initial proposal; a stale proposal requires rereading state and a new proposal, never blind rebasing.",
        "Follow the human approach_hints as optional strategy only. They are not assumptions or evidence.",
        "Respect cancelled tasks, fixed host policy IDs, available pool balances, and explicit formal scope approval.",
        "Submit via research_worker_propose. Provider completion is not accepted research and no result is a mathematical proof."], proof_authority: "none" };
    const bytes = canonicalJson(snapshot);
    // Entire snapshot is mandatory. No silent tail truncation or giant task.question workaround.
    if (Buffer.byteLength(bytes) > this.config.model_policies[draft.model_policy_id].initial_context_bytes) fail("SUPERVISOR_CONTEXT_TOO_LARGE");
    const runtime = this.app.runtime, temporary = resolveProjectCommitPath(runtime.root, `.tmp/comath/supervisor-input/${randomUUID()}.json`);
    await mkdir(dirname(temporary), { recursive: true });
    await writeFile(temporary, bytes, { flag: "wx", flush: true });
    try {
      const prepared = await prepareArtifact({ projectRoot: runtime.root, project_id: campaign.project_id, source_path: temporary, kind: "other", actor: "supervisor-driver" });
      if (this.closed) fail("SUPERVISOR_DRIVER_CLOSED");
      const current = runtime.store.getCampaign(campaign.campaign_id);
      const currentSeq = Number(runtime.store.get("SELECT COALESCE(MAX(seq),0) AS seq FROM events WHERE campaign_id=?", campaign.campaign_id)!.seq);
      if (!current || current.state !== "running" || current.revision !== campaign.revision || current.supervisor.inflight_task_id || currentSeq !== sourceSeq) fail("SUPERVISOR_SNAPSHOT_STALE");
      const ref = withProjectCommit(runtime.root, { operation_id: `supervisor-input:${draft.task_id}:${prepared.sha256}`, campaign_id: campaign.campaign_id,
        expected_revision: campaign.revision, request: { sha256: prepared.sha256 } }, () => commitArtifactReference(runtime.root, prepared));
      return { artifact_id: ref.id, sha256: ref.sha256 };
    } finally { await unlink(temporary); }
  }
  private async finish(campaign: ResearchControlCampaign): Promise<void> {
    const runtime = this.app.runtime, task = runtime.store.getTask(campaign.supervisor.inflight_task_id!);
    if (task?.status === "running") { await this.correctRejectedProposal(task); return; }
    if (!task || task.status !== "succeeded") return;
    const row = runtime.store.get("SELECT seq FROM events WHERE campaign_id=? AND task_id=? AND generation=? AND type='SupervisorProposalAccepted' ORDER BY seq DESC LIMIT 1", campaign.campaign_id, task.task_id, task.generation);
    if (!row) return;
    const seq = Number(row.seq), event = this.app.events.readEventsAfter({ campaign_id: campaign.campaign_id, after_seq: seq - 1, limit: 1 })[0];
    const ref = artifactPointerSchema.parse((event.payload as Record<string, unknown>).result_ref);
    if (!this.results.verifyAcceptedResult(event, task, ref)) fail("SUPERVISOR_SOURCE_NOT_VERIFIED");
    const registered = listArtifactRefs(runtime.root).find(value => value.id === ref.artifact_id && value.sha256 === ref.sha256);
    if (!registered) fail("SUPERVISOR_SOURCE_NOT_VERIFIED");
    const path = resolveProjectCommitPath(runtime.root, registered.path);
    if ((await stat(path)).size > 1024 * 1024) fail("SUPERVISOR_PROPOSAL_TOO_LARGE");
    const bytes = await readFile(path);
    if (bytes.length > 1024 * 1024 || createHash("sha256").update(bytes).digest("hex") !== ref.sha256) fail("SUPERVISOR_SOURCE_NOT_VERIFIED");
    if (this.closed) return;
    const outcome = this.loop.finishSupervisorTurn({ command_id: `driver-finish:${seq}`, campaign_id: campaign.campaign_id,
      task_id: task.task_id, generation: task.generation, source_event_seq: seq, artifact: ref, proposal: JSON.parse(bytes.toString("utf8")) });
    if (outcome.status === "finished") this.scheduler.wake();
  }
  private async correctRejectedProposal(task: ResearchTask): Promise<void> {
    const { store } = this.app.runtime;
    const rows = store.all("SELECT seq FROM events WHERE campaign_id=? AND task_id=? AND generation=? AND type='SupervisorProposalRejected' ORDER BY seq LIMIT 2", task.campaign_id, task.task_id, task.generation);
    if (!rows.length) return;
    const sources = rows.map(row => {
      const event = this.app.events.readEventsAfter({ campaign_id: task.campaign_id, after_seq: Number(row.seq) - 1, limit: 1 })[0];
      const ref = artifactPointerSchema.parse((event.payload as Record<string, unknown>).result_ref);
      if (!this.results.verifyRejectedProposal(event, task, ref)) fail("SUPERVISOR_SOURCE_NOT_VERIFIED");
      return { event, ref };
    });
    const source = sources[0], attemptKey = String((source.event.payload as Record<string, unknown>).attempt_key);
    const key = `supervisor-correction:${task.task_id}:g${task.generation}`;
    const existing = store.get("SELECT status,response_json FROM commands WHERE command_id=?", key);
    const block = async (code: string) => {
      if (!this.control) fail("SUPERVISOR_CORRECTION_CONTROL_UNAVAILABLE");
      store.transaction(() => {
        if (!store.get("SELECT command_id FROM commands WHERE command_id=?", `${key}:blocked`)) {
          const payload = { code, attempt_key: attemptKey, source_event_seqs: sources.map(source => source.event.seq),
            rejected_refs: sources.map(source => source.ref), proof_authority: "none" };
          this.app.events.appendEvent({ campaign_id: task.campaign_id, task_id: task.task_id, generation: task.generation,
            type: "SupervisorCorrectionBlocked", actor: "research-loop", payload });
          store.run("INSERT INTO commands(command_id,principal_id,request_sha256,response_json,status) VALUES (?,'internal:supervisor-driver',?,?,'blocked')", `${key}:blocked`, fingerprint(payload), JSON.stringify(payload));
          const current = store.getTask(task.task_id)!;
          if (current.generation === task.generation && current.status === "running") store.putTask({ ...current, blocked_reason: "supervisor_invalid_proposal" });
        }
      });
      await this.control.stop(attemptKey);
      fail(code);
    };
    if (rows.length > 1) return block("SUPERVISOR_CORRECTION_EXHAUSTED");
    if (store.get("SELECT command_id FROM commands WHERE command_id=?", `${key}:blocked`)) return block("SUPERVISOR_CORRECTION_BLOCKED");
    if (existing) {
      if (existing.status === "committed") return;
      // A crash between durable intent and transport acknowledgement must not duplicate steering.
      return block("SUPERVISOR_CORRECTION_DELIVERY_UNCONFIRMED");
    }
    if (!this.control) fail("SUPERVISOR_CORRECTION_CONTROL_UNAVAILABLE");
    const instruction = "Your submitted research DAG proposal did not satisfy the declared C4 structure. Read the complete proposal_schema in your service snapshot and submit exactly one corrected JSON object through research_worker_propose with a new command_id. Preserve the declared campaign, original proposal_base_revision, scope and task budget. Do not add assumptions, change limits or claim proof authority. This is the single permitted structure correction.";
    const intent = { attempt_key: attemptKey, source_event_seq: source.event.seq, artifact: source.ref, instruction_sha256: fingerprint(instruction), proof_authority: "none" };
    store.transaction(() => {
      store.run("INSERT INTO commands(command_id,principal_id,request_sha256,response_json,status) VALUES (?,'internal:supervisor-driver',?,?,'prepared')", key, fingerprint(intent), JSON.stringify(intent));
      this.app.events.appendEvent({ campaign_id: task.campaign_id, task_id: task.task_id, generation: task.generation,
        type: "SupervisorCorrectionRequested", actor: "research-loop", payload: intent });
    });
    try { await this.control.steer(attemptKey, instruction); }
    catch { await block("SUPERVISOR_CORRECTION_DELIVERY_UNCONFIRMED"); return; }
    store.transaction(() => {
      store.run("UPDATE commands SET status='committed' WHERE command_id=? AND status='prepared'", key);
      this.app.events.appendEvent({ campaign_id: task.campaign_id, task_id: task.task_id, generation: task.generation,
        type: "SupervisorCorrectionSent", actor: "research-loop", payload: intent });
    });
  }
  private async campaignTurn(campaignId: string): Promise<void> {
    let page;
    do { page = this.loop.recordSupervisorTrigger(campaignId); } while (page.has_more && !this.closed);
    if (this.closed) return;
    const campaign = this.app.runtime.store.getCampaign(campaignId)!;
    if (campaign.state !== "running") return;
    if (campaign.supervisor.inflight_task_id) { await this.finish(campaign); return; }
    if (!campaign.supervisor.dirty) return;
    const key = fingerprint({ campaign_id: campaignId, revision: campaign.revision, supervisor: campaign.supervisor });
    const draft = this.draft(campaign, key);
    if (this.affordable(campaign, draft)) draft.input_refs = [await this.snapshot(campaign, draft)];
    if (this.closed) return;
    // Snapshot publication awaited I/O. Never claim with a context from an older revision.
    const current = this.app.runtime.store.getCampaign(campaignId)!;
    if (current.revision !== campaign.revision || current.state !== "running" || current.supervisor.inflight_task_id) return;
    const outcome = this.loop.claimSupervisorTurn({ command_id: `driver-claim:${key}`, campaign_id: campaignId, task: draft });
    if (outcome.status === "claimed") this.scheduler.wake();
  }
  start(): void {
    if (this.closed) fail("SUPERVISOR_DRIVER_CLOSED");
    if (this.running) return;
    this.running = true;
    this.unsubscribe = this.app.events.subscribe(() => this.wake());
    this.timer = setInterval(() => this.wake(), 1000); this.timer.unref();
    this.wake(); // Recovery scan reads persisted cursors; no dependency on a future event.
  }
  wake(): void { if (!this.closed) void this.pump().catch(error => { this.fatalError = error; }); }
  pump(): Promise<void> {
    if (this.closed) return Promise.resolve();
    this.requested = true;
    if (this.pending) return this.pending;
    const work = Promise.resolve().then(async () => {
      do {
        this.requested = false;
        const rows = this.app.runtime.store.all("SELECT campaign_id FROM campaigns ORDER BY campaign_id");
        for (const row of rows) {
          if (this.closed) break;
          const campaignId = String(row.campaign_id);
          try { await this.campaignTurn(campaignId); this.blockers.delete(campaignId); }
          catch (error) {
            if (this.closed) break;
            const code = error instanceof ComathError ? error.code : "SUPERVISOR_DRIVER_FAILED";
            this.blockers.set(campaignId, code);
            const campaign = this.app.runtime.store.getCampaign(campaignId)!;
            const key = `supervisor-driver-blocked:${fingerprint({ campaignId, revision: campaign.revision, inflight: campaign.supervisor.inflight_task_id, code })}`;
            if (!this.app.runtime.store.get("SELECT command_id FROM commands WHERE command_id=?", key)) this.app.runtime.store.transaction(() => {
              this.app.events.appendEvent({ campaign_id: campaignId, type: "SupervisorDriverBlocked", actor: "research-loop", payload: { code, proof_authority: "none" } });
              this.app.runtime.store.run("INSERT INTO commands(command_id,principal_id,request_sha256,response_json,status) VALUES (?,'internal:supervisor-driver',?,'{}','committed')", key, fingerprint({ code }));
            });
          }
        }
      } while (this.requested && !this.closed);
    });
    this.pending = work;
    void work.then(() => { if (this.pending === work) this.pending = undefined; }, error => { this.fatalError = error; if (this.pending === work) this.pending = undefined; });
    return work;
  }
  async drain(): Promise<void> { while (this.pending) await this.pending; if (this.fatalError !== undefined) throw this.fatalError; }
  stop(): void { this.closed = true; this.running = false; this.unsubscribe?.(); this.unsubscribe = undefined; if (this.timer) clearInterval(this.timer); }
  async close(): Promise<void> { this.stop(); await this.drain(); }
}
export function createSupervisorDriver(app: ResearchOrchestrator, scheduler: PortfolioScheduler, config: ResearchConfig, results: ResultService, control?: SupervisorWorkerControl): SupervisorDriver {
  return new SupervisorDriver(app, scheduler, config, results, control);
}
