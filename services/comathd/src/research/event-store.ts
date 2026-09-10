import { createHash } from "node:crypto";
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readSync, writeSync } from "node:fs";
import { dirname } from "node:path";
import { ComathError } from "../errors.js";
import { canonicalJson } from "../verification/runner-contracts.js";
import { resolveProjectCommitPath } from "./project-commit.js";
import { getAcquiredProjectRuntime, type ProjectRuntime } from "./project-runtime.js";
import type { ResearchEvent } from "./research-store.js";
import type { ResearchEventInput } from "./research-schemas.js";

export type ReadResearchEventsInput = { campaign_id?: string; after_seq?: number; limit?: number };
export type ResearchEventStore = {
  appendEvent(input: ResearchEventInput): ResearchEvent;
  readEventsAfter(input: ReadResearchEventsInput): ResearchEvent[];
  exportAuditEvents(): { last_seq: number; exported: number };
  subscribe(listener: () => void): () => void;
  close(): void;
};
const runtimeHubs = new WeakMap<ProjectRuntime, Set<() => void>>();

function failure(code: string, message: string, statusCode = 409): ComathError { return new ComathError(message, { code, statusCode }); }
function fromRow(row: Record<string, unknown>): ResearchEvent {
  return { seq: Number(row.seq), campaign_id: String(row.campaign_id),
    ...(row.task_id === null ? {} : { task_id: String(row.task_id) }),
    ...(row.generation === null ? {} : { generation: Number(row.generation) }),
    type: String(row.type), actor: String(row.actor), payload: JSON.parse(String(row.payload_json)),
    payload_sha256: String(row.payload_sha256), created_at: String(row.created_at) };
}
function verifiedLine(event: ResearchEvent): Buffer {
  const actual = createHash("sha256").update(canonicalJson(event.payload)).digest("hex");
  if (actual !== event.payload_sha256) throw failure("RESEARCH_EVENT_HASH_MISMATCH", `Research event ${event.seq} has an invalid payload hash`);
  return Buffer.from(JSON.stringify(event) + "\n", "utf8");
}

/** The database is authoritative; audit lines only provide a verified export position. */
export function createResearchEventStore(runtime: ProjectRuntime): ResearchEventStore {
  let closed = false;
  let hub = runtimeHubs.get(runtime);
  if (!hub) { hub = new Set(); runtimeHubs.set(runtime, hub); }
  const sharedListeners = hub;
  const ownedListeners = new Set<() => void>();
  function assertOpen(): void {
    if (closed) throw failure("RESEARCH_EVENT_STORE_CLOSED", "Research event store is closed");
    if (getAcquiredProjectRuntime(runtime.root) !== runtime || runtime.referenceCount < 1) throw failure("RESEARCH_OWNER_REQUIRED", "Research event store requires its acquired owner");
  }
  function notify(): void {
    // A failed transport wakeup must not make an already committed mutation look rolled back.
    // A writer facade may close before outer commit; other facades must still be notified.
    for (const listener of [...sharedListeners]) {
      if (!sharedListeners.has(listener)) continue;
      try { listener(); } catch { sharedListeners.delete(listener); }
    }
  }
  function nextEvent(afterSeq: number): ResearchEvent | undefined {
    const row = runtime.store.get("SELECT * FROM events WHERE seq>? ORDER BY seq LIMIT 1", afterSeq);
    return row ? fromRow(row) : undefined;
  }
  function readEventsAfter(input: ReadResearchEventsInput): ResearchEvent[] {
    assertOpen();
    const afterSeq = input.after_seq === undefined ? 0 : input.after_seq;
    const limit = input.limit === undefined ? 200 : input.limit;
    const maxSeq = Number(runtime.store.get("SELECT COALESCE(MAX(seq),0) AS max_seq FROM events")?.max_seq ?? 0);
    if (!Number.isSafeInteger(afterSeq) || afterSeq < 0 || afterSeq > maxSeq) throw failure("INVALID_EVENT_CURSOR", "Event cursor must be a nonnegative existing-history position", 400);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 200) throw failure("INVALID_EVENT_LIMIT", "Event limit must be an integer between 1 and 200", 400);
    if (input.campaign_id !== undefined && (typeof input.campaign_id !== "string" || !input.campaign_id || input.campaign_id.length > 160)) throw failure("INVALID_EVENT_CAMPAIGN", "Invalid event campaign filter", 400);
    const rows = input.campaign_id === undefined
      ? runtime.store.all("SELECT * FROM events WHERE seq>? ORDER BY seq LIMIT ?", afterSeq, limit)
      : runtime.store.all("SELECT * FROM events WHERE campaign_id=? AND seq>? ORDER BY seq LIMIT ?", input.campaign_id, afterSeq, limit);
    // Deliberately permit querying a hash-invalid record for diagnostics. Export verifies it.
    return rows.map(fromRow);
  }
  function exportAuditEvents(): { last_seq: number; exported: number } {
    assertOpen();
    if (runtime.store.inTransaction) throw failure("EVENT_EXPORT_IN_TRANSACTION", "Audit export cannot observe uncommitted events");
    const path = resolveProjectCommitPath(runtime.root, ".comath/audit/research-events.jsonl");
    let lastSeq = 0, exported = 0;
    let tail: Buffer = Buffer.alloc(0);
    if (existsSync(path)) {
      const fd = openSync(path, "r"), chunk = Buffer.alloc(64 * 1024);
      try {
        let count: number;
        while ((count = readSync(fd, chunk, 0, chunk.length, null)) > 0) {
          const bytes = Buffer.concat([tail, chunk.subarray(0, count)]);
          let start = 0, newline: number;
          while ((newline = bytes.indexOf(10, start)) >= 0) {
            const event = nextEvent(lastSeq);
            if (!event || !bytes.subarray(start, newline + 1).equals(verifiedLine(event))) throw failure("RESEARCH_EVENT_AUDIT_CONFLICT", "Audit line does not match the next committed database event");
            lastSeq = event.seq; start = newline + 1;
          }
          tail = bytes.subarray(start);
          // Research input is bounded to 1 MiB; allow bounded envelope/encoding overhead.
          if (tail.length > 2 * 1024 * 1024) throw failure("RESEARCH_EVENT_AUDIT_CONFLICT", "Audit trailing line exceeds the research event bound");
        }
      } finally { closeSync(fd); }
    }
    let output: number | undefined;
    const append = (bytes: Buffer) => {
      if (output === undefined) {
        mkdirSync(dirname(path), { recursive: true });
        resolveProjectCommitPath(runtime.root, ".comath/audit/research-events.jsonl");
        output = openSync(path, "a");
      }
      let at = 0;
      while (at < bytes.length) at += writeSync(output, bytes, at);
    };
    try {
      if (tail.length > 0) {
        const event = nextEvent(lastSeq);
        const line = event ? verifiedLine(event) : undefined;
        if (!event || !line || tail.length >= line.length || !tail.equals(line.subarray(0, tail.length))) throw failure("RESEARCH_EVENT_AUDIT_CONFLICT", "Audit tail is not a prefix of a committed database event");
        // Complete only the exact service-generated prefix; preserve unknown/user-owned tails.
        append(line.subarray(tail.length)); lastSeq = event.seq; exported++;
      }
      while (true) {
        const page = runtime.store.all("SELECT * FROM events WHERE seq>? ORDER BY seq LIMIT 200", lastSeq).map(fromRow);
        if (page.length === 0) break;
        const lines = page.map(verifiedLine);
        for (let index = 0; index < page.length; index++) { append(lines[index]); lastSeq = page[index].seq; exported++; }
      }
      if (output !== undefined) fsyncSync(output);
      return { last_seq: lastSeq, exported };
    } finally { if (output !== undefined) closeSync(output); }
  }
  return {
    appendEvent(input) {
      assertOpen();
      const event = runtime.store.appendEvent(input);
      runtime.store.afterCommit(notify);
      return event;
    },
    readEventsAfter,
    exportAuditEvents,
    subscribe(listener) {
      assertOpen();
      if (typeof listener !== "function") throw new TypeError("Event subscriber must be a function");
      const subscription = () => { listener(); };
      ownedListeners.add(subscription); sharedListeners.add(subscription);
      return () => { ownedListeners.delete(subscription); sharedListeners.delete(subscription); };
    },
    close() { closed = true; for (const listener of ownedListeners) sharedListeners.delete(listener); ownedListeners.clear(); }
  };
}
