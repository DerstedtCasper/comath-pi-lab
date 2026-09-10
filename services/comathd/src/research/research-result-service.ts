import { createHash, randomUUID } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";
import { listArtifactRefs } from "../artifacts/store.js";
import { ComathError } from "../errors.js";
import type { WorkerPrincipal } from "../control/worker-auth.js";
import { canonicalJson } from "../verification/runner-contracts.js";
import { createCheckpointStore, researchCheckpointSchema } from "./checkpoint-store.js";
import { failureMemorySchema } from "./failure-index.js";
import { triageResultSchema } from "./supervisor-policy.js";
import { notifyResearchEventsCommitted } from "./event-store.js";
import { assertProjectReadable, resolveProjectCommitPath, stageResearchMutation, withProjectCommit, type ProjectCommitOperation } from "./project-commit.js";
import { getAcquiredProjectRuntime, type ProjectRuntime } from "./project-runtime.js";
import { commitArtifactReference, prepareArtifact } from "./research-artifacts.js";
import type { ResearchEvent } from "./research-store.js";
import { artifactPointerSchema, scopeBindingSchema, researchDagPatchSchema, type ArtifactPointer, type ResearchTask, type ResearchDagPatch } from "./research-schemas.js";

const id = z.string().min(1).max(160), text = z.string().min(1).max(8192), strings = z.array(text).max(100);
export const researchResultSchema = z.strictObject({ result_id: id, task_id: id, generation: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  scope: scopeBindingSchema, kind: z.enum(["progress", "breakthrough", "failure", "validation", "statement_draft"]), summary: text,
  claims: z.array(z.strictObject({ statement: text, assumptions: strings, artifact_refs: z.array(artifactPointerSchema).max(100) })).max(100),
  reproduction_steps: strings, failure_refs: z.array(id).max(100), requested_followups: strings, checkpoint_id: id,
  triage: z.array(triageResultSchema).min(1).max(10000).optional(), proof_authority: z.literal("none") });
export const researchResultJsonSchema = z.toJSONSchema(researchResultSchema);
export type ResearchResult = z.infer<typeof researchResultSchema>;
const identity = { command_id: id, task_id: id, generation: z.number().int().positive().max(Number.MAX_SAFE_INTEGER) };
const submissionSchema = z.union([
  z.strictObject({ ...identity, payload: z.json() }),
  z.strictObject({ ...identity, submission: z.strictObject({ kind: z.enum(["research_result", "formal_candidate"]), value: z.json() }) })
]);
export type ResearchResultReceipt = { status: "accepted" | "rejected"; command_id: string; task_id: string; generation: number; campaign_id: string;
  attempt_key: string; scope_sha256: string; request_sha256: string; result_ref: ArtifactPointer; operation_id: string;
  event_type: "ResearchResultAccepted" | "SupervisorProposalAccepted" | "SupervisorProposalRejected";
  result_id?: string; result_kind: ResearchResult["kind"] | "supervisor_proposal"; base_revision?: number;
  rejection_code?: string; proof_authority: "none"; event_seq?: number };
export type ResearchResultServiceOptions = { authorizeArtifact: (attemptKey: string, ref: ArtifactPointer) => boolean;
  onArtifactCommitted?: (principal: WorkerPrincipal, ref: ArtifactPointer) => void; commitFault?: ProjectCommitOperation["fault"] };
export type ResearchResultService = {
  acceptWorkerResult(principal: WorkerPrincipal, raw: unknown): Promise<ResearchResultReceipt>;
  acceptWorkerProposal(principal: WorkerPrincipal, raw: unknown): Promise<ResearchResultReceipt>;
  verifyAcceptedResult(event: Readonly<ResearchEvent>, task: Readonly<ResearchTask>, artifact: Readonly<ArtifactPointer>, proposal?: unknown): boolean;
  verifyRejectedProposal(event: Readonly<ResearchEvent>, task: Readonly<ResearchTask>, artifact: Readonly<ArtifactPointer>): boolean;
};
const digest = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex");
const hash = (value: unknown) => digest(canonicalJson(value));
function fail(code: string): never { throw new ComathError(code, { code, statusCode: code.endsWith("UNAVAILABLE") ? 503 : 409 }); }
function parse<T>(schema: z.ZodType<T>, raw: unknown): T {
  let bytes: string | undefined; try { bytes = JSON.stringify(raw); } catch { fail("RESEARCH_RESULT_INVALID"); }
  if (bytes === undefined || Buffer.byteLength(bytes) > 256 * 1024) fail("RESEARCH_RESULT_INVALID");
  const value = schema.safeParse(raw); if (!value.success) fail("RESEARCH_RESULT_INVALID"); return value.data;
}

/** Accepted means service-verified structure and provenance, never mathematical validity. */
export function createResearchResultService(runtime: ProjectRuntime, options: ResearchResultServiceOptions): ResearchResultService {
  if (typeof options?.authorizeArtifact !== "function") throw new Error("Research result service needs explicit artifact authorization");
  const store = runtime.store;
  const checkpoints = createCheckpointStore(runtime, { authorizeArtifact: options.authorizeArtifact });
  function owner(): void {
    if (getAcquiredProjectRuntime(runtime.root) !== runtime || runtime.referenceCount < 1) fail("RESEARCH_OWNER_REQUIRED");
  }
  function current(principal: WorkerPrincipal, allowAccepted = false): ResearchTask {
    owner();
    const task = store.getTask(principal.task_id), attempt = store.get("SELECT * FROM attempts WHERE attempt_key=?", principal.attempt_key);
    if (!task || !attempt || task.campaign_id !== principal.campaign_id || task.generation !== principal.generation || task.generation < 1
      || attempt.task_id !== task.task_id || Number(attempt.generation) !== task.generation || attempt.state !== "running"
      || attempt.fenced_at || attempt.stop_requested_at || attempt.stop_reason || Number(attempt.termination_confirmed ?? 0) !== 0
      || !Number.isFinite(Date.parse(String(attempt.expires_at))) || runtime.clock.now() >= Date.parse(String(attempt.expires_at))
      || !(task.status === "running" || allowAccepted && task.status === "succeeded")) fail("RESEARCH_RESULT_ATTEMPT_REJECTED");
    assertProjectReadable(runtime.root, undefined, task.campaign_id);
    return task;
  }
  function cas(task: Readonly<ResearchTask>, ref: Readonly<ArtifactPointer>): Buffer {
    const campaign = store.getCampaign(task.campaign_id), record = listArtifactRefs(runtime.root).find(value => value.id === ref.artifact_id);
    const path = `.comath/artifacts/sha256/${ref.sha256.slice(0, 2)}/${ref.sha256}`;
    if (!record || record.project_id !== campaign?.project_id || record.sha256 !== ref.sha256 || record.path.replace(/\\/g, "/") !== path) fail("RESEARCH_RESULT_ARTIFACT_INVALID");
    assertProjectReadable(runtime.root, path, task.campaign_id);
    try {
      const resolved = resolveProjectCommitPath(runtime.root, path), info = statSync(resolved);
      if (!info.isFile() || info.size !== record.size_bytes || info.size > 16 * 1024 * 1024) fail("RESEARCH_RESULT_ARTIFACT_INVALID");
      const bytes = readFileSync(resolved); if (digest(bytes) !== ref.sha256) fail("RESEARCH_RESULT_ARTIFACT_INVALID"); return bytes;
    } catch { fail("RESEARCH_RESULT_ARTIFACT_INVALID"); }
  }
  function validateReferences(task: ResearchTask, principal: WorkerPrincipal, result: ResearchResult): void {
    const refs = result.claims.flatMap(claim => claim.artifact_refs);
    if (result.triage) {
      if (task.kind !== "synthesize" || task.specialization !== "triage" || result.kind !== "progress") fail("RESEARCH_TRIAGE_TASK_REQUIRED");
      const seen = new Set<string>();
      for (const triage of result.triage) {
        if (seen.has(triage.task_id)) fail("RESEARCH_TRIAGE_DUPLICATE"); seen.add(triage.task_id);
        const target = store.getTask(triage.task_id);
        if (!target || target.campaign_id !== task.campaign_id || target.status !== "succeeded" || !target.accepted_result_id || target.pool !== "exploration" || target.specialization === "triage"
          || canonicalJson(target.scope) !== canonicalJson(triage.scope) || target.method_family !== triage.method_family) fail("RESEARCH_TRIAGE_SOURCE_INVALID");
        const record = listArtifactRefs(runtime.root).find(ref => ref.id === target.accepted_result_id);
        if (!record || !task.input_refs.some(ref => ref.artifact_id === record.id && ref.sha256 === record.sha256)) fail("RESEARCH_TRIAGE_SOURCE_DENIED");
        const row = store.get("SELECT * FROM events WHERE task_id=? AND generation=? AND type='ResearchResultAccepted' AND json_extract(payload_json,'$.result_ref.artifact_id')=? ORDER BY seq DESC LIMIT 1", target.task_id, target.generation, record.id);
        if (!row) fail("RESEARCH_TRIAGE_SOURCE_INVALID");
        const source: ResearchEvent = { seq: Number(row.seq), campaign_id: String(row.campaign_id), task_id: String(row.task_id), generation: Number(row.generation),
          type: String(row.type), actor: String(row.actor), created_at: String(row.created_at), payload_sha256: String(row.payload_sha256), payload: JSON.parse(String(row.payload_json)) };
        if (!verifyReceipt(source, target, { artifact_id: record.id, sha256: record.sha256 })) fail("RESEARCH_TRIAGE_SOURCE_INVALID");
        refs.push({ artifact_id: record.id, sha256: record.sha256 }, ...triage.progress_refs, ...triage.blocker_refs);
      }
    }
    for (const failureId of result.failure_refs) {
      const row = store.get("SELECT failure_json FROM failures WHERE failure_id=?", failureId);
      if (!row) fail("RESEARCH_RESULT_FAILURE_INVALID");
      const failure = failureMemorySchema.safeParse(JSON.parse(String(row.failure_json)));
      if (!failure.success || failure.data.failure_id !== failureId || canonicalJson(failure.data.scope) !== canonicalJson(task.scope)
        || store.getTask(failure.data.created_by_task_id)?.campaign_id !== task.campaign_id) fail("RESEARCH_RESULT_FAILURE_INVALID");
      refs.push(...failure.data.artifact_refs, ...failure.data.counterexample_refs);
    }
    const unique = new Map(refs.map(ref => [`${ref.artifact_id}:${ref.sha256}`, ref]));
    if (unique.size > 200) fail("RESEARCH_RESULT_REFERENCE_LIMIT");
    let bytes = 0;
    for (const ref of unique.values()) {
      if (options.authorizeArtifact(principal.attempt_key, ref) !== true) fail("RESEARCH_RESULT_ARTIFACT_DENIED");
      bytes += cas(task, ref).length; if (bytes > 64 * 1024 * 1024) fail("RESEARCH_RESULT_REFERENCE_LIMIT");
    }
  }
  function validateCheckpoint(task: ResearchTask, checkpointId: string): void {
    const resume = checkpoints.getResumeMaterial(task.task_id);
    if (!resume) fail("RESEARCH_RESULT_CHECKPOINT_INVALID");
    let next: string | undefined = resume.receipt.checkpoint_id;
    const seen = new Set<string>();
    while (next && seen.size < 1000) {
      if (seen.has(next)) fail("RESEARCH_RESULT_CHECKPOINT_INVALID"); seen.add(next);
      const row = store.get("SELECT c.*,a.task_id,a.generation FROM checkpoints c JOIN attempts a ON a.attempt_key=c.attempt_key WHERE c.checkpoint_id=?", next);
      if (!row || row.task_id !== task.task_id || Number(row.generation) > task.generation) fail("RESEARCH_RESULT_CHECKPOINT_INVALID");
      const ref = artifactPointerSchema.parse(JSON.parse(String(row.artifact_ref)));
      const bytes = cas(task, ref), checkpoint = researchCheckpointSchema.parse(JSON.parse(bytes.toString("utf8")));
      const event = store.get("SELECT payload_json FROM events WHERE type='CheckpointAccepted' AND json_extract(payload_json,'$.checkpoint_id')=?", next);
      if (!event || checkpoint.task_id !== task.task_id || checkpoint.checkpoint_id !== next || checkpoint.generation !== Number(row.generation)
        || checkpoint.seq !== Number(row.seq) || digest(bytes) !== row.payload_sha256 || canonicalJson(checkpoint.scope) !== canonicalJson(task.scope)
        || (checkpoint.parent_checkpoint_sha256 ?? null) !== row.parent_sha256 || JSON.parse(String(event.payload_json)).payload_sha256 !== row.payload_sha256
        || canonicalJson(JSON.parse(String(event.payload_json)).artifact_ref) !== canonicalJson(ref)) fail("RESEARCH_RESULT_CHECKPOINT_INVALID");
      if (next === checkpointId) return;
      if (!row.parent_sha256) break;
      const parent = store.get("SELECT c.checkpoint_id FROM checkpoints c JOIN attempts a ON a.attempt_key=c.attempt_key WHERE c.payload_sha256=? AND a.task_id=?", String(row.parent_sha256), task.task_id);
      next = parent ? String(parent.checkpoint_id) : undefined;
    }
    fail("RESEARCH_RESULT_CHECKPOINT_INVALID");
  }
  function proposalError(task: ResearchTask, payload: unknown): { patch?: ResearchDagPatch; code?: string } {
    const parsed = researchDagPatchSchema.safeParse(payload);
    if (!parsed.success) return { code: "SUPERVISOR_PROPOSAL_INVALID" };
    const patch = parsed.data;
    if (patch.campaign_id !== task.campaign_id) return { code: "SUPERVISOR_PROPOSAL_CAMPAIGN_MISMATCH" };
    const ids = [...patch.create_tasks.flatMap(draft => [draft.task_id, ...(draft.parent_task_id ? [draft.parent_task_id] : []), ...draft.depends_on]),
      ...patch.add_dependencies.flatMap(edge => [edge.task_id, edge.prerequisite_id]),
      ...patch.replace_dependencies.flatMap(edge => [edge.task_id, edge.old_prerequisite_id, edge.new_prerequisite_id]),
      ...patch.reprioritize.map(value => value.task_id), ...patch.cancel_tasks.map(value => value.task_id), ...patch.move_pool.map(value => value.task_id)];
    if (ids.some(id => { const referenced = store.getTask(id); return referenced && referenced.campaign_id !== task.campaign_id; })) return { code: "SUPERVISOR_PROPOSAL_CAMPAIGN_MISMATCH" };
    return { patch };
  }
  function supervisor(task: ResearchTask): void {
    if (task.kind !== "synthesize" || store.getCampaign(task.campaign_id)?.supervisor.inflight_task_id !== task.task_id) fail("SUPERVISOR_PROPOSAL_TASK_DENIED");
  }
  function receiptEvent(receipt: ResearchResultReceipt): Record<string, unknown> {
    const row = store.get("SELECT * FROM events WHERE type=? AND json_extract(payload_json,'$.operation_id')=? ORDER BY seq LIMIT 1", receipt.event_type, receipt.operation_id);
    if (!row || row.payload_sha256 !== hash(receipt) || canonicalJson(JSON.parse(String(row.payload_json))) !== canonicalJson(receipt)) fail("RESEARCH_RESULT_NOT_ACCEPTED");
    return row;
  }
  function checkedReceipt(receipt: ResearchResultReceipt, task: ResearchTask): ResearchResultReceipt {
    const event = receiptEvent(receipt);
    if (receipt.task_id !== task.task_id || receipt.generation !== task.generation || receipt.scope_sha256 !== hash(task.scope)) fail("RESEARCH_RESULT_RECEIPT_INVALID");
    if (receipt.status === "accepted" && (task.status !== "succeeded" || task.accepted_result_id !== receipt.result_ref.artifact_id)) fail("RESEARCH_RESULT_NOT_ACCEPTED");
    cas(task, receipt.result_ref);
    return { ...receipt, event_seq: Number(event.seq) };
  }
  async function accept(principal: WorkerPrincipal, raw: unknown, isProposal: boolean): Promise<ResearchResultReceipt> {
    const initial = current(principal, true), request = parse(submissionSchema, raw);
    if (request.task_id !== principal.task_id || request.generation !== principal.generation) fail("RESEARCH_RESULT_IDENTITY_MISMATCH");
    if (isProposal && !("payload" in request)) fail("RESEARCH_RESULT_INVALID");
    let payload: unknown = "payload" in request ? request.payload : request.submission, result: ResearchResult | undefined;
    if (!isProposal) {
      if (payload && typeof payload === "object" && "kind" in payload && payload.kind === "formal_candidate") fail("RESEARCH_FORMAL_CANDIDATE_UNAVAILABLE");
      if (payload && typeof payload === "object" && "kind" in payload && payload.kind === "research_result") {
        payload = parse(z.strictObject({ kind: z.literal("research_result"), value: z.json() }), payload).value;
      }
      if (payload && typeof payload === "object" && "kind" in payload && payload.kind === "validation") fail("RESEARCH_VALIDATION_CONSUMER_UNAVAILABLE");
      result = parse(researchResultSchema, payload); payload = result;
      if (result.task_id !== principal.task_id || result.generation !== principal.generation || canonicalJson(result.scope) !== canonicalJson(initial.scope)) fail("RESEARCH_RESULT_SCOPE_MISMATCH");
    }
    const requestHash = hash(request), operationId = `research-submission:${hash(request.command_id)}`;
    const commitRequest = { request_sha256: requestHash, attempt_key: principal.attempt_key, scope_sha256: hash(initial.scope) };
    const operation: ProjectCommitOperation = { operation_id: operationId, campaign_id: initial.campaign_id, request: commitRequest, fault: options.commitFault };
    if (store.get("SELECT operation_id FROM trust_commits WHERE operation_id=?", operationId)) {
      const old = withProjectCommit<ResearchResultReceipt>(runtime.root, operation, () => fail("RESEARCH_RESULT_RECEIPT_INVALID"));
      if (isProposal !== (old.result_kind === "supervisor_proposal")) fail("RESEARCH_RESULT_COMMAND_CONFLICT");
      const receipt = checkedReceipt(old, current(principal, true));
      try { options.onArtifactCommitted?.(principal, receipt.result_ref); } finally { notifyResearchEventsCommitted(runtime); }
      return receipt;
    }
    if (isProposal) supervisor(initial);
    const checkBusinessId = () => {
      if (result && store.get("SELECT operation_id FROM trust_commits WHERE json_extract(plan_json,'$.response.result_id')=? AND json_extract(plan_json,'$.response.event_type')='ResearchResultAccepted'", result.result_id)) fail("RESEARCH_RESULT_ID_CONFLICT");
    };
    checkBusinessId();
    if (initial.status === "succeeded" || initial.accepted_result_id) fail("RESEARCH_RESULT_ALREADY_ACCEPTED");
    if (result) { validateCheckpoint(initial, result.checkpoint_id); validateReferences(initial, principal, result); }
    const bytes = canonicalJson(payload), path = resolveProjectCommitPath(runtime.root, `.tmp/comath/research-results/${randomUUID()}.json`);
    await mkdir(dirname(path), { recursive: true }); await writeFile(path, bytes, { flag: "wx", flush: true });
    try {
      const prepared = await prepareArtifact({ projectRoot: runtime.root, project_id: store.getCampaign(initial.campaign_id)!.project_id, source_path: path, kind: "other", actor: "service:research-results" });
      if (prepared.sha256 !== digest(bytes)) fail("RESEARCH_RESULT_ARTIFACT_INVALID");
      const receipt = withProjectCommit(runtime.root, operation, () => {
        const task = current(principal); checkBusinessId();
        if (hash(task.scope) !== commitRequest.scope_sha256 || task.accepted_result_id) fail("RESEARCH_RESULT_SCOPE_MISMATCH");
        if (result) { validateCheckpoint(task, result.checkpoint_id); validateReferences(task, principal, result); }
        if (isProposal) supervisor(task);
        const proposal = isProposal ? proposalError(task, payload) : undefined;
        const artifact = commitArtifactReference(runtime.root, prepared), status = proposal?.code ? "rejected" : "accepted";
        const receipt: ResearchResultReceipt = { status, command_id: request.command_id, task_id: task.task_id, generation: task.generation,
          campaign_id: task.campaign_id, attempt_key: principal.attempt_key, scope_sha256: hash(task.scope), request_sha256: requestHash,
          result_ref: { artifact_id: artifact.id, sha256: artifact.sha256 }, operation_id: operationId,
          event_type: isProposal ? status === "accepted" ? "SupervisorProposalAccepted" : "SupervisorProposalRejected" : "ResearchResultAccepted",
          result_kind: result?.kind ?? "supervisor_proposal", ...(result ? { result_id: result.result_id } : {}),
          ...(proposal?.patch ? { base_revision: proposal.patch.base_revision } : {}), ...(proposal?.code ? { rejection_code: proposal.code } : {}), proof_authority: "none" };
        const timestamp = new Date(runtime.clock.now()).toISOString();
        // Conditional mutations preserve a cancel/fence committed after preparation,
        // including when recovery later finalizes saved CAS after-images.
        const active = "EXISTS (SELECT 1 FROM attempts a WHERE a.attempt_key=? AND a.task_id=tasks.task_id AND a.generation=tasks.generation AND a.state='running' AND a.fenced_at IS NULL AND a.stop_requested_at IS NULL AND a.stop_reason IS NULL AND a.termination_confirmed=0)"
          + (isProposal ? " AND json_extract(tasks.task_json,'$.kind')='synthesize' AND EXISTS (SELECT 1 FROM campaigns c WHERE c.campaign_id=tasks.campaign_id AND json_extract(c.control_json,'$.supervisor.inflight_task_id')=tasks.task_id)" : "");
        if (status === "accepted") stageResearchMutation(runtime.root,
          `UPDATE tasks SET status='succeeded',task_json=json_set(task_json,'$.status','succeeded','$.accepted_result_id',?,'$.updated_at',?) WHERE task_id=? AND generation=? AND status='running' AND ${active}`,
          [artifact.id, timestamp, task.task_id, task.generation, principal.attempt_key]);
        const finalState = status === "accepted" ? "tasks.status='succeeded' AND json_extract(tasks.task_json,'$.accepted_result_id')=?" : "tasks.status='running'";
        stageResearchMutation(runtime.root,
          `INSERT INTO events(campaign_id,task_id,generation,type,actor,payload_json,payload_sha256,created_at) SELECT ?,?,?,?,'service:research-results',?,?,? FROM tasks WHERE task_id=? AND generation=? AND ${finalState} AND ${active}`,
          [task.campaign_id, task.task_id, task.generation, receipt.event_type, canonicalJson(receipt), hash(receipt), timestamp,
            task.task_id, task.generation, ...(status === "accepted" ? [artifact.id] : []), principal.attempt_key]);
        return receipt;
      });
      const confirmed = checkedReceipt(receipt, store.getTask(principal.task_id)!);
      try { options.onArtifactCommitted?.(principal, receipt.result_ref); } finally { notifyResearchEventsCommitted(runtime); }
      return confirmed;
    } finally { await unlink(path).catch(error => { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }); }
  }
  function verifyReceipt(event: Readonly<ResearchEvent>, task: Readonly<ResearchTask>, artifact: Readonly<ArtifactPointer>, proposal?: unknown, rejected = false): boolean {
    try {
      owner(); assertProjectReadable(runtime.root, undefined, task.campaign_id);
      if (!Number.isSafeInteger(event.seq) || !(rejected ? event.type === "SupervisorProposalRejected" : ["ResearchResultAccepted", "SupervisorProposalAccepted"].includes(event.type)) || event.actor !== "service:research-results") return false;
      const currentTask = store.getTask(task.task_id), storedEvent = store.get("SELECT * FROM events WHERE seq=?", event.seq);
      const expectedStatus = rejected ? "running" : "succeeded";
      if (!currentTask || !storedEvent || currentTask.status !== expectedStatus || task.status !== expectedStatus || currentTask.generation !== task.generation
        || event.task_id !== task.task_id || event.generation !== task.generation || event.campaign_id !== task.campaign_id || currentTask.campaign_id !== task.campaign_id
        || !rejected && (currentTask.accepted_result_id !== artifact.artifact_id || task.accepted_result_id !== artifact.artifact_id) || canonicalJson(currentTask.scope) !== canonicalJson(task.scope)
        || event.type !== storedEvent.type || event.actor !== storedEvent.actor || event.created_at !== storedEvent.created_at
        || storedEvent.payload_sha256 !== event.payload_sha256 || event.payload_sha256 !== hash(event.payload) || canonicalJson(JSON.parse(String(storedEvent.payload_json))) !== canonicalJson(event.payload)) return false;
      const receipt = event.payload as unknown as ResearchResultReceipt;
      if (receipt.status !== (rejected ? "rejected" : "accepted") || receipt.event_type !== event.type || receipt.task_id !== task.task_id || receipt.generation !== task.generation
        || receipt.campaign_id !== task.campaign_id || receipt.scope_sha256 !== hash(task.scope) || canonicalJson(receipt.result_ref) !== canonicalJson(artifact) || receipt.proof_authority !== "none") return false;
      const row = store.get("SELECT * FROM trust_commits WHERE operation_id=?", receipt.operation_id);
      if (!row || row.phase !== "committed" || row.campaign_id !== task.campaign_id) return false;
      const plan = JSON.parse(String(row.plan_json));
      const expectedRequest = { campaign_id: task.campaign_id, expected_revision: 0,
        request: { request_sha256: receipt.request_sha256, attempt_key: receipt.attempt_key, scope_sha256: receipt.scope_sha256 } };
      if (plan.operation_id !== receipt.operation_id || canonicalJson(plan.response) !== canonicalJson(receipt)
        || plan.request_sha256 !== digest(canonicalJson(expectedRequest).trimEnd())) return false;
      const bytes = cas(task, artifact); if (bytes.length > 256 * 1024) return false;
      const payload = JSON.parse(bytes.toString("utf8"));
      if (canonicalJson(payload) !== bytes.toString("utf8")) return false;
      if (event.type === "ResearchResultAccepted") {
        const result = researchResultSchema.parse(payload);
        if (result.task_id !== task.task_id || result.generation !== task.generation || result.result_id !== receipt.result_id || result.kind !== receipt.result_kind
          || canonicalJson(result.scope) !== canonicalJson(task.scope) || proposal !== undefined) return false;
      } else if (rejected) {
        if (task.kind !== "synthesize" || receipt.result_kind !== "supervisor_proposal" || !receipt.rejection_code
          || proposalError(task, payload).code !== receipt.rejection_code) return false;
      } else {
        const parsed = researchDagPatchSchema.parse(payload);
        if (task.kind !== "synthesize" || parsed.campaign_id !== task.campaign_id || parsed.base_revision !== receipt.base_revision || receipt.result_kind !== "supervisor_proposal"
          || proposal !== undefined && canonicalJson(proposal) !== canonicalJson(payload)) return false;
      }
      return true;
    } catch { return false; }
  }
  return { acceptWorkerResult: (principal, raw) => accept(principal, raw, false), acceptWorkerProposal: (principal, raw) => accept(principal, raw, true),
    verifyAcceptedResult: (event, task, artifact, proposal) => verifyReceipt(event, task, artifact, proposal),
    verifyRejectedProposal: (event, task, artifact) => verifyReceipt(event, task, artifact, undefined, true) };
}
