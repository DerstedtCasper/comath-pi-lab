import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { closeSync, openSync, readFileSync, readSync } from "node:fs";
import { dirname } from "node:path";
import { z } from "zod";
import { listArtifactRefs } from "../artifacts/store.js";
import { ComathError } from "../errors.js";
import { canonicalJson } from "../verification/runner-contracts.js";
import { notifyResearchEventsCommitted } from "./event-store.js";
import { assertProjectReadable, resolveProjectCommitPath, stageResearchMutation, withProjectCommit, writeCommittedFile, type ProjectCommitOperation } from "./project-commit.js";
import { getAcquiredProjectRuntime, type ProjectRuntime } from "./project-runtime.js";
import { commitArtifactReference, prepareArtifact } from "./research-artifacts.js";
import { artifactPointerSchema, scopeBindingSchema, sha256Schema, type ArtifactPointer, type ResearchTask } from "./research-schemas.js";

const identifier = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,159}$/);
const text = z.string().min(1).max(8192);
const texts = z.array(text).max(100);
const refs = z.array(artifactPointerSchema).max(100);
export const researchCheckpointSchema = z.strictObject({
  schema_version: z.literal("comath.research_checkpoint.v1"), checkpoint_id: identifier, task_id: identifier,
  generation: z.number().int().positive().max(Number.MAX_SAFE_INTEGER), seq: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  scope: scopeBindingSchema, parent_checkpoint_sha256: sha256Schema.optional(), goal: text, current_route: text,
  established_results: z.array(z.strictObject({ statement: text, confidence: z.enum(["low", "medium", "high"]), artifact_refs: refs })).max(100),
  experiments: z.array(z.strictObject({ description: text, command_or_script: text, result_summary: text, artifact_refs: refs })).max(100),
  failed_routes: z.array(z.strictObject({ failure_id: identifier, retry_conditions: texts })).max(100),
  assumptions: texts, blockers: texts, open_questions: texts, next_actions: z.array(text).min(1).max(3), risk_flags: texts,
  citations: refs, artifact_refs: refs, resume_instructions: text, proof_authority: z.literal("none")
});
export const researchCheckpointJsonSchema = z.toJSONSchema(researchCheckpointSchema);
export type ResearchCheckpoint = z.infer<typeof researchCheckpointSchema>;
export type CheckpointReceipt = { checkpoint_id: string; task_id: string; generation: number; seq: number;
  payload_sha256: string; artifact_ref: ArtifactPointer; operation_id: string; proof_authority: "none" };
export type CommitCheckpointInput = { task_id: string; generation: number; lease_token: string; command_id: string; checkpoint: ResearchCheckpoint };
export type CheckpointResumeMaterial = { receipt: CheckpointReceipt; checkpoint: ResearchCheckpoint; markdown: string };
export type CheckpointStoreOptions = { authorizeArtifact: (attemptKey: string, ref: ArtifactPointer) => boolean; commitFault?: ProjectCommitOperation["fault"] };
export type CheckpointStore = { commitCheckpoint(input: CommitCheckpointInput): Promise<CheckpointReceipt>; getResumeMaterial(taskId: string): CheckpointResumeMaterial | null };
const hash = (bytes: string | Buffer): string => createHash("sha256").update(bytes).digest("hex");
function fail(code: string, message: string): never { throw new ComathError(message, { code, statusCode: 409 }); }

/** Deterministic display projection. Only the checkpoint JSON bytes are authoritative. */
export function renderCheckpointMarkdown(checkpoint: ResearchCheckpoint): string {
  const lines = [`# Research checkpoint ${checkpoint.checkpoint_id}`, "", `Task: ${checkpoint.task_id}; generation: ${checkpoint.generation}; sequence: ${checkpoint.seq}`, "", "Proof authority: none", ""];
  const section = (title: string, values: string[]) => { lines.push(`## ${title}`, "", ...(values.length ? values.map(value => `- ${value}`) : ["None recorded."]), ""); };
  section("Goal", [checkpoint.goal]); section("Current route", [checkpoint.current_route]);
  section("Established results", checkpoint.established_results.map(result => `[${result.confidence}] ${result.statement}`));
  section("Experiments", checkpoint.experiments.map(experiment => `${experiment.description}\n  Command/script: ${experiment.command_or_script}\n  Result: ${experiment.result_summary}`));
  section("Failed routes", checkpoint.failed_routes.map(route => `${route.failure_id}: ${route.retry_conditions.join("; ")}`));
  section("Assumptions", checkpoint.assumptions); section("Blockers", checkpoint.blockers); section("Open questions", checkpoint.open_questions);
  section("Next actions", checkpoint.next_actions); section("Risk flags", checkpoint.risk_flags);
  section("Citations", checkpoint.citations.map(ref => `${ref.artifact_id} (sha256:${ref.sha256})`));
  section("Artifacts", checkpoint.artifact_refs.map(ref => `${ref.artifact_id} (sha256:${ref.sha256})`));
  section("Resume instructions", [checkpoint.resume_instructions]);
  return lines.join("\n");
}

export function createCheckpointStore(runtime: ProjectRuntime, options: CheckpointStoreOptions): CheckpointStore {
  if (typeof options?.authorizeArtifact !== "function") throw new Error("Checkpoint store requires an explicit service artifact authorization callback");
  const store = runtime.store;
  function assertOwner(): void {
    if (getAcquiredProjectRuntime(runtime.root) !== runtime || runtime.referenceCount < 1) fail("RESEARCH_OWNER_REQUIRED", "Checkpoint store requires its acquired owner");
  }
  function currentCapability(input: CommitCheckpointInput): { task: ResearchTask; attempt: Record<string, unknown>; attemptKey: string } {
    assertOwner();
    const task = store.getTask(input.task_id);
    if (!task || task.generation !== input.generation || typeof input.lease_token !== "string" || !input.lease_token || input.lease_token.length > 4096) fail("CHECKPOINT_LEASE_REJECTED", "Checkpoint capability is not current");
    assertProjectReadable(runtime.root, undefined, task.campaign_id);
    const attempt = store.get("SELECT * FROM attempts WHERE task_id=? AND generation=?", task.task_id, task.generation);
    if (!attempt || typeof attempt.lease_token_hash !== "string" || !/^[a-f0-9]{64}$/.test(attempt.lease_token_hash)) fail("CHECKPOINT_LEASE_REJECTED", "Checkpoint attempt has no valid capability");
    const expected = Buffer.from(attempt.lease_token_hash, "hex"), actual = createHash("sha256").update(input.lease_token).digest();
    const now = runtime.clock.now(), expiry = Date.parse(String(attempt.expires_at));
    if (!timingSafeEqual(expected, actual) || !Number.isFinite(expiry) || now >= expiry || attempt.fenced_at !== null && attempt.fenced_at !== undefined
      || Number(attempt.termination_confirmed ?? 0) !== 0 || !["running", "cancelling"].includes(task.status)) fail("CHECKPOINT_LEASE_REJECTED", "Checkpoint capability expired, fenced or inactive");
    if (task.status === "cancelling") {
      const deadline = Date.parse(String(attempt.grace_deadline_at));
      if (!["pause", "handoff", "checkpoint_overdue"].includes(String(attempt.stop_reason)) || !Number.isFinite(deadline) || now >= deadline) fail("CHECKPOINT_LEASE_REJECTED", "Checkpoint grace has ended or is not allowed");
    }
    return { task, attempt, attemptKey: String(attempt.attempt_key) };
  }
  function validateReferences(task: ResearchTask, attemptKey: string, checkpoint: ResearchCheckpoint): void {
    const pointers = [...checkpoint.artifact_refs, ...checkpoint.citations,
      ...checkpoint.established_results.flatMap(result => result.artifact_refs), ...checkpoint.experiments.flatMap(experiment => experiment.artifact_refs)];
    const seen = new Set<string>();
    for (const ref of pointers) {
      const key = `${ref.artifact_id}:${ref.sha256}`; if (seen.has(key)) continue; seen.add(key);
      if (options.authorizeArtifact(attemptKey, ref) !== true) fail("CHECKPOINT_ARTIFACT_DENIED", "Checkpoint references an artifact outside the attempt visibility");
      validateArtifact(task, ref);
    }
  }
  function validateArtifact(task: ResearchTask, pointer: ArtifactPointer): string {
    const campaign = store.getCampaign(task.campaign_id);
    const registered = listArtifactRefs(runtime.root).find(ref => ref.id === pointer.artifact_id);
    if (!registered || registered.sha256 !== pointer.sha256 || registered.project_id !== campaign?.project_id) fail("CHECKPOINT_ARTIFACT_INVALID", "Checkpoint artifact metadata does not match its registered reference");
    const expectedPath = `.comath/artifacts/sha256/${pointer.sha256.slice(0, 2)}/${pointer.sha256}`;
    if (registered.path.replace(/\\/g, "/") !== expectedPath) fail("CHECKPOINT_ARTIFACT_INVALID", "Checkpoint artifact is not in registered immutable CAS");
    try {
      const path = resolveProjectCommitPath(runtime.root, expectedPath), fd = openSync(path, "r"), digest = createHash("sha256"), chunk = Buffer.alloc(65536);
      let size = 0;
      try { let count: number; while ((count = readSync(fd, chunk, 0, chunk.length, null)) > 0) { digest.update(chunk.subarray(0, count)); size += count; } }
      finally { closeSync(fd); }
      if (digest.digest("hex") !== pointer.sha256 || size !== registered.size_bytes) fail("CHECKPOINT_ARTIFACT_INVALID", "Checkpoint artifact CAS bytes failed hash verification");
      return path;
    } catch { fail("CHECKPOINT_ARTIFACT_INVALID", "Checkpoint artifact CAS is missing, unsafe or hash-invalid"); }
  }
  function receiptFor(row: Record<string, unknown>): CheckpointReceipt {
    const event = store.get("SELECT payload_json FROM events WHERE type='CheckpointAccepted' AND json_extract(payload_json,'$.checkpoint_id')=? ORDER BY seq LIMIT 1", String(row.checkpoint_id));
    if (!event) fail("CHECKPOINT_CORRUPT", "Checkpoint is missing its committed receipt event");
    const receipt = JSON.parse(String(event.payload_json)) as CheckpointReceipt;
    if (receipt.payload_sha256 !== row.payload_sha256 || receipt.checkpoint_id !== row.checkpoint_id) fail("CHECKPOINT_CORRUPT", "Checkpoint receipt disagrees with its database record");
    return receipt;
  }
  function matchingExisting(checkpoint: ResearchCheckpoint, digest: string, attemptKey: string): CheckpointReceipt | undefined {
    const row = store.get("SELECT * FROM checkpoints WHERE checkpoint_id=?", checkpoint.checkpoint_id);
    if (!row) return undefined;
    if (row.attempt_key !== attemptKey || row.payload_sha256 !== digest) fail("CHECKPOINT_ID_CONFLICT", "Checkpoint ID already belongs to different immutable bytes");
    return receiptFor(row);
  }
  function validateChain(task: ResearchTask, attemptKey: string, checkpoint: ResearchCheckpoint): void {
    if (canonicalJson(task.scope) !== canonicalJson(checkpoint.scope)) fail("CHECKPOINT_SCOPE_MISMATCH", "Checkpoint scope does not match its task");
    const latest = Number(store.get("SELECT COALESCE(MAX(seq),0) AS last_seq FROM checkpoints WHERE attempt_key=?", attemptKey)?.last_seq ?? 0);
    if (checkpoint.seq !== latest + 1) fail("CHECKPOINT_SEQUENCE_MISMATCH", "Checkpoint sequence must advance exactly one within an attempt");
    const head = task.checkpoint_head ? store.get("SELECT payload_sha256 FROM checkpoints WHERE checkpoint_id=?", task.checkpoint_head) : undefined;
    if (task.checkpoint_head && !head) fail("CHECKPOINT_CORRUPT", "Task checkpoint head is not committed");
    if (checkpoint.parent_checkpoint_sha256 !== head?.payload_sha256) fail("CHECKPOINT_PARENT_MISMATCH", "Checkpoint parent must equal the currently accepted task head");
  }
  async function commitCheckpoint(input: CommitCheckpointInput): Promise<CheckpointReceipt> {
    const initial = currentCapability(input);
    if (typeof input.command_id !== "string" || !input.command_id || input.command_id.length > 160) fail("INVALID_CHECKPOINT_COMMAND", "Checkpoint command requires a bounded ID");
    const serialized = JSON.stringify(input.checkpoint);
    if (serialized === undefined || Buffer.byteLength(serialized, "utf8") > 256 * 1024) fail("CHECKPOINT_TOO_LARGE", "Checkpoint exceeds the 256 KiB JSON limit");
    const checkpoint = researchCheckpointSchema.parse(input.checkpoint);
    if (checkpoint.task_id !== input.task_id || checkpoint.generation !== input.generation) fail("CHECKPOINT_LEASE_REJECTED", "Checkpoint body does not match outer task/generation");
    const bytes = canonicalJson(checkpoint);
    if (Buffer.byteLength(bytes, "utf8") > 256 * 1024) fail("CHECKPOINT_TOO_LARGE", "Checkpoint canonical bytes exceed the 256 KiB limit");
    const digest = hash(bytes);
    const existing = matchingExisting(checkpoint, digest, initial.attemptKey); if (existing) return existing;
    validateChain(initial.task, initial.attemptKey, checkpoint); validateReferences(initial.task, initial.attemptKey, checkpoint);
    const temporary = resolveProjectCommitPath(runtime.root, `.tmp/comath/research-checkpoints/${randomUUID()}.json`);
    await mkdir(dirname(temporary), { recursive: true });
    await writeFile(temporary, bytes, { encoding: "utf8", flag: "wx", flush: true });
    try {
      const campaign = store.getCampaign(initial.task.campaign_id);
      if (!campaign) fail("CHECKPOINT_SCOPE_MISMATCH", "Checkpoint campaign does not exist");
      const prepared = await prepareArtifact({ projectRoot: runtime.root, project_id: campaign.project_id, source_path: temporary, kind: "other", actor: "research-checkpoint-service" });
      if (prepared.sha256 !== digest) fail("CHECKPOINT_CORRUPT", "Prepared checkpoint bytes changed");
      const operationId = `checkpoint:${hash(`${input.task_id}\n${input.command_id}`)}`;
      const receipt = withProjectCommit(runtime.root, { operation_id: operationId, campaign_id: initial.task.campaign_id,
        request: { task_id: input.task_id, generation: input.generation, checkpoint_id: checkpoint.checkpoint_id, payload_sha256: digest }, fault: options.commitFault }, () => {
        const current = currentCapability(input);
        const duplicate = matchingExisting(checkpoint, digest, current.attemptKey); if (duplicate) return duplicate;
        validateChain(current.task, current.attemptKey, checkpoint); validateReferences(current.task, current.attemptKey, checkpoint);
        const artifact = commitArtifactReference(runtime.root, prepared);
        const artifactRef = { artifact_id: artifact.id, sha256: artifact.sha256 };
        const result: CheckpointReceipt = { checkpoint_id: checkpoint.checkpoint_id, task_id: checkpoint.task_id, generation: checkpoint.generation, seq: checkpoint.seq,
          payload_sha256: digest, artifact_ref: artifactRef, operation_id: operationId, proof_authority: "none" };
        const projection = `.comath/campaign/${encodeURIComponent(current.task.campaign_id)}/tasks/${checkpoint.task_id}/checkpoints/${checkpoint.generation}-${checkpoint.seq}`;
        writeCommittedFile(runtime.root, projection + ".json", bytes); writeCommittedFile(runtime.root, projection + ".md", renderCheckpointMarkdown(checkpoint));
        const timestamp = new Date(runtime.clock.now()).toISOString();
        stageResearchMutation(runtime.root, "INSERT INTO checkpoints(checkpoint_id,attempt_key,seq,payload_sha256,parent_sha256,artifact_ref,created_at) VALUES (?,?,?,?,?,?,?)",
          [checkpoint.checkpoint_id, current.attemptKey, checkpoint.seq, digest, checkpoint.parent_checkpoint_sha256 ?? null, JSON.stringify(artifactRef), timestamp]);
        stageResearchMutation(runtime.root, "UPDATE tasks SET task_json=?,status=?,generation=? WHERE task_id=?",
          [JSON.stringify({ ...current.task, checkpoint_head: checkpoint.checkpoint_id, updated_at: timestamp }), current.task.status, current.task.generation, current.task.task_id]);
        const observed = store.get("SELECT observed_json FROM reservations WHERE attempt_key=?", current.attemptKey);
        const usage = observed ? (JSON.parse(String(observed.observed_json)) as { usage?: { tool_calls?: number | null; output_tokens?: number | null } }).usage : undefined;
        const count = Number(store.get("SELECT COUNT(*) AS count FROM events WHERE task_id=? AND generation=? AND type='ToolCallObserved'", checkpoint.task_id, checkpoint.generation)?.count ?? 0);
        stageResearchMutation(runtime.root, "UPDATE attempts SET last_checkpoint_at=?,last_checkpoint_tool_calls=?,last_checkpoint_output_tokens=?,checkpoint_requested_at=NULL WHERE attempt_key=?",
          [timestamp, Math.max(count, usage?.tool_calls ?? 0), usage?.output_tokens ?? 0, current.attemptKey]);
        const payload = canonicalJson(result);
        stageResearchMutation(runtime.root, "INSERT INTO events(campaign_id,task_id,generation,type,actor,payload_json,payload_sha256,created_at) VALUES (?,?,?,?,?,?,?,?)",
          [current.task.campaign_id, current.task.task_id, current.task.generation, "CheckpointAccepted", "research-checkpoint-service", payload, hash(payload), timestamp]);
        return result;
      });
      notifyResearchEventsCommitted(runtime);
      return receipt;
    } finally { await unlink(temporary).catch(cause => { if ((cause as NodeJS.ErrnoException).code !== "ENOENT") throw cause; }); }
  }
  function getResumeMaterial(taskId: string): CheckpointResumeMaterial | null {
    assertOwner();
    const task = store.getTask(taskId); if (!task) return null;
    assertProjectReadable(runtime.root, undefined, task.campaign_id);
    if (!task.checkpoint_head) return null;
    const row = store.get("SELECT c.*,a.task_id,a.generation FROM checkpoints c JOIN attempts a ON a.attempt_key=c.attempt_key WHERE c.checkpoint_id=?", task.checkpoint_head);
    if (!row || row.task_id !== task.task_id) fail("CHECKPOINT_CORRUPT", "Checkpoint head is missing or belongs to another task");
    const pointer = artifactPointerSchema.parse(JSON.parse(String(row.artifact_ref)));
    const path = validateArtifact(task, pointer), bytes = readFileSync(path, "utf8");
    if (Buffer.byteLength(bytes, "utf8") > 256 * 1024 || hash(bytes) !== row.payload_sha256) fail("CHECKPOINT_CORRUPT", "Checkpoint canonical bytes failed verification");
    const checkpoint = researchCheckpointSchema.parse(JSON.parse(bytes));
    if (checkpoint.checkpoint_id !== row.checkpoint_id || checkpoint.task_id !== taskId || checkpoint.generation !== Number(row.generation) || checkpoint.seq !== Number(row.seq)) fail("CHECKPOINT_CORRUPT", "Checkpoint payload identity does not match committed metadata");
    validateReferences(task, String(row.attempt_key), checkpoint);
    return { receipt: receiptFor(row), checkpoint, markdown: renderCheckpointMarkdown(checkpoint) };
  }
  return { commitCheckpoint, getResumeMaterial };
}
