import { createHash } from "node:crypto";
import { ComathError } from "../errors.js";
import { canonicalJson } from "../verification/runner-contracts.js";
import { createResearchEventStore } from "./event-store.js";
import { withProjectCommit, writeCommittedFile } from "./project-commit.js";
import type { ProjectRuntime } from "./project-runtime.js";
import { artifactPointerSchema, scopeBindingSchema, sha256Schema, type ArtifactPointer, type ScopeBinding } from "./research-schemas.js";

const ACTOR = "service:validation-intake-preparation";
const hash = (value: unknown) => createHash("sha256").update(canonicalJson(value)).digest("hex");
const same = (left: unknown, right: unknown) => canonicalJson(left) === canonicalJson(right);
function fail(code: string): never { throw new ComathError(code, { code, statusCode: 409 }); }
function identifier(value: unknown): string {
  if (typeof value !== "string" || !value || value.length > 160) fail("VALIDATION_INTAKE_QUEUE_CORRUPT");
  return value;
}

export type ValidationIntakePreparationCandidate = {
  schema_version: "comath.validation_intake_preparation.v1";
  candidate_id: string;
  campaign_id: string;
  source_task_id: string;
  source_event_seq: number;
  source_event_payload_sha256: string;
  report_sha256: string;
  policy_version: string;
  candidate_ref: ArtifactPointer;
  scope: ScopeBinding;
  operation_id: string;
  state: "awaiting_operator_drafts" | "validation_no_longer_current";
  prepare_endpoint: string;
  proof_authority: "none";
};

type Queued = Omit<ValidationIntakePreparationCandidate, "schema_version" | "operation_id" | "state" | "prepare_endpoint">;

/**
 * Converts a validated evidence queue item into an operator-visible, durable
 * preparation candidate. It deliberately does not create formal drafts,
 * locks, approval tickets, claims, or proof authority.
 */
export function createValidationIntakePreparationDriver(runtime: ProjectRuntime) {
  const events = createResearchEventStore(runtime), blockers = new Map<number, string>();
  let running = false, closed = false, requested = false, pending: Promise<void> | undefined;
  let fatalError: unknown;
  let unsubscribe: (() => void) | undefined, timer: ReturnType<typeof setInterval> | undefined;

  function queue(row: Record<string, unknown>): Queued {
    if (row.actor !== "service:validation-aggregation") fail("VALIDATION_INTAKE_QUEUE_CORRUPT");
    const payload = JSON.parse(String(row.payload_json));
    if (hash(payload) !== String(row.payload_sha256)) fail("VALIDATION_INTAKE_QUEUE_CORRUPT");
    const sourceEventSeq = Number(row.seq);
    if (!Number.isSafeInteger(sourceEventSeq) || sourceEventSeq < 1) fail("VALIDATION_INTAKE_QUEUE_CORRUPT");
    return {
      candidate_id: identifier(payload.candidate_id), campaign_id: identifier(row.campaign_id), source_task_id: identifier(row.task_id),
      source_event_seq: sourceEventSeq, source_event_payload_sha256: sha256Schema.parse(String(row.payload_sha256)),
      report_sha256: sha256Schema.parse(payload.report_sha256), policy_version: identifier(payload.policy_version),
      candidate_ref: artifactPointerSchema.parse(payload.candidate_ref), scope: scopeBindingSchema.parse(payload.scope), proof_authority: "none"
    };
  }

  function descriptor(source: Queued): ValidationIntakePreparationCandidate {
    const operationId = `validation-intake-preparation:${hash({ candidate_id: source.candidate_id, report_sha256: source.report_sha256 })}`;
    return { schema_version: "comath.validation_intake_preparation.v1", ...source, operation_id: operationId,
      state: "awaiting_operator_drafts", prepare_endpoint: `/research/v1/campaigns/${encodeURIComponent(source.campaign_id)}/intakes`, proof_authority: "none" };
  }

  function verifySource(source: Queued): void {
    const candidate = runtime.store.get("SELECT source_task_id,result_json,validation_state FROM candidates WHERE candidate_id=?", source.candidate_id);
    const task = runtime.store.getTask(source.source_task_id);
    if (!candidate || !task || String(candidate.source_task_id) !== source.source_task_id || task.campaign_id !== source.campaign_id || !same(task.scope, source.scope))
      fail("VALIDATION_INTAKE_QUEUE_CORRUPT");
    const publication = JSON.parse(String(candidate.result_json));
    if (!same(artifactPointerSchema.parse(publication.result_ref), source.candidate_ref)) fail("VALIDATION_INTAKE_QUEUE_CORRUPT");
    if (candidate.validation_state !== "research_validated") fail("VALIDATION_INTAKE_NOT_VALIDATED");
  }

  function sourceAt(seq: number): Queued {
    const row = runtime.store.get("SELECT seq,campaign_id,task_id,actor,payload_json,payload_sha256 FROM events WHERE seq=? AND type='ValidationIntakePrepareQueued'", seq);
    if (!row) fail("VALIDATION_INTAKE_QUEUE_CHANGED");
    return queue(row);
  }

  function materialize(row: Record<string, unknown>): ValidationIntakePreparationCandidate {
    const source = queue(row), value = descriptor(source);
    return withProjectCommit(runtime.root, { operation_id: value.operation_id, campaign_id: value.campaign_id,
      request: { source_event_seq: value.source_event_seq, source_event_payload_sha256: value.source_event_payload_sha256, report_sha256: value.report_sha256 } }, () => {
      const current = sourceAt(value.source_event_seq);
      if (!same(current, source)) fail("VALIDATION_INTAKE_QUEUE_CHANGED");
      verifySource(current);
      const path = `.comath/campaign/${encodeURIComponent(value.campaign_id)}/validation-intake-preparations/${value.report_sha256}/candidate.json`;
      writeCommittedFile(runtime.root, path, canonicalJson(value));
      events.appendEvent({ campaign_id: value.campaign_id, task_id: value.source_task_id, type: "ValidationIntakePreparationReady", actor: ACTOR, payload: value });
      return value;
    });
  }

  function ready(row: Record<string, unknown>): ValidationIntakePreparationCandidate {
    if (row.actor !== ACTOR) fail("VALIDATION_INTAKE_READY_CORRUPT");
    const payload = JSON.parse(String(row.payload_json));
    if (hash(payload) !== String(row.payload_sha256) || payload.schema_version !== "comath.validation_intake_preparation.v1") fail("VALIDATION_INTAKE_READY_CORRUPT");
    const value = descriptor({
      candidate_id: identifier(payload.candidate_id), campaign_id: identifier(payload.campaign_id), source_task_id: identifier(payload.source_task_id),
      source_event_seq: Number(payload.source_event_seq), source_event_payload_sha256: sha256Schema.parse(payload.source_event_payload_sha256),
      report_sha256: sha256Schema.parse(payload.report_sha256), policy_version: identifier(payload.policy_version),
      candidate_ref: artifactPointerSchema.parse(payload.candidate_ref), scope: scopeBindingSchema.parse(payload.scope), proof_authority: "none"
    });
    if (!Number.isSafeInteger(value.source_event_seq) || value.source_event_seq < 1 || !same(value, payload)) fail("VALIDATION_INTAKE_READY_CORRUPT");
    const operation = runtime.store.get("SELECT phase FROM trust_commits WHERE operation_id=?", value.operation_id);
    if (!operation || operation.phase !== "committed") fail("VALIDATION_INTAKE_READY_CORRUPT");
    return value;
  }

  function current(value: ValidationIntakePreparationCandidate): ValidationIntakePreparationCandidate {
    const candidate = runtime.store.get("SELECT validation_state FROM candidates WHERE candidate_id=?", value.candidate_id);
    return candidate?.validation_state === "research_validated" ? value : { ...value, state: "validation_no_longer_current" };
  }

  async function drain(): Promise<void> {
    const rows = runtime.store.all("SELECT seq,campaign_id,task_id,actor,payload_json,payload_sha256 FROM events WHERE type='ValidationIntakePrepareQueued' ORDER BY seq");
    for (const row of rows) {
      if (closed) return;
      const sourceSeq = Number(row.seq);
      try {
        materialize(row);
        blockers.delete(sourceSeq);
      } catch (error) {
        const code = error instanceof ComathError ? error.code : "VALIDATION_INTAKE_PREPARATION_ERROR";
        if (blockers.get(sourceSeq) !== code) {
          blockers.set(sourceSeq, code);
          events.appendEvent({ campaign_id: String(row.campaign_id), task_id: String(row.task_id), type: "ValidationIntakePreparationBlocked", actor: ACTOR,
            payload: { source_event_seq: sourceSeq, code, proof_authority: "none" } });
        }
      }
    }
  }

  function wake(): void {
    if (!running || closed) return;
    requested = true;
    if (pending) return;
    pending = (async () => {
      await Promise.resolve();
      while (requested && running && !closed) { requested = false; await drain(); }
    })().finally(() => { pending = undefined; });
    void pending.catch(error => { fatalError = error; running = false; });
  }

  return {
    blockers,
    list(input: { campaign_id?: string } = {}): ValidationIntakePreparationCandidate[] {
      const selected = new Map<string, ValidationIntakePreparationCandidate>();
      const rows = runtime.store.all("SELECT seq,actor,payload_json,payload_sha256 FROM events WHERE type='ValidationIntakePreparationReady' ORDER BY seq DESC");
      for (const row of rows) {
        const value = current(ready(row));
        if (input.campaign_id !== undefined && value.campaign_id !== input.campaign_id) continue;
        if (!selected.has(value.candidate_id)) selected.set(value.candidate_id, value);
      }
      return [...selected.values()].sort((left, right) => left.source_event_seq - right.source_event_seq);
    },
    async flush() { if (closed) throw new Error("Validation intake preparation driver is closed"); if (fatalError) throw fatalError; if (pending) await pending; else await drain(); },
    start() { if (closed) throw new Error("Validation intake preparation driver is closed"); if (fatalError) throw fatalError; if (running) return; running = true;
      unsubscribe = events.subscribe(wake); timer = setInterval(wake, 15000); timer.unref(); wake(); },
    stop() { running = false; requested = false; unsubscribe?.(); unsubscribe = undefined; if (timer) clearInterval(timer); timer = undefined; },
    async close() { this.stop(); closed = true; try { await pending; if (fatalError) throw fatalError; } finally { events.close(); } }
  };
}
