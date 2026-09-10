import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { canonicalJson } from "../verification/runner-contracts.js";
import { resolveResearchControlPath } from "./daemon-owner.js";
import { parseResearchInput, researchControlCampaignSchema, researchEventInputSchema, researchTaskSchema,
  type ResearchControlCampaign, type ResearchEventInput, type ResearchTask } from "./research-schemas.js";

export interface ResearchClock { now(): number }
export type ResearchStoreOptions = { clock: ResearchClock };
export type ResearchEvent = Omit<ResearchEventInput, "created_at"> & { seq: number; payload_sha256: string; created_at: string };
export const RESEARCH_SCHEMA_VERSION = 1;
export function researchDatabasePath(root: string): string { return resolveResearchControlPath(root, "research.sqlite"); }

const schemaV1 = `
CREATE TABLE campaigns (
 campaign_id TEXT PRIMARY KEY, project_id TEXT NOT NULL, revision INTEGER NOT NULL CHECK(revision>=0),
 state TEXT NOT NULL CHECK(state IN ('preparing','running','pausing','paused','blocked','completed','cancelled')),
 charter_sha256 TEXT NOT NULL CHECK(length(charter_sha256)=64), control_json TEXT NOT NULL CHECK(json_valid(control_json)));
CREATE TABLE tasks (
 task_id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL REFERENCES campaigns(campaign_id),
 status TEXT NOT NULL CHECK(status IN ('queued','leased','running','blocked','cancelling','succeeded','failed','cancelled')),
 generation INTEGER NOT NULL CHECK(generation>=0), pool TEXT NOT NULL CHECK(pool IN ('exploration','deepening','validation','formalization')),
 priority INTEGER NOT NULL CHECK(priority BETWEEN 0 AND 4), created_at TEXT NOT NULL, task_json TEXT NOT NULL CHECK(json_valid(task_json)),
 UNIQUE(task_id,campaign_id));
CREATE TABLE dependencies (task_id TEXT NOT NULL REFERENCES tasks(task_id), prerequisite_id TEXT NOT NULL REFERENCES tasks(task_id),
 PRIMARY KEY(task_id,prerequisite_id), CHECK(task_id<>prerequisite_id));
CREATE TRIGGER dependency_campaign_insert BEFORE INSERT ON dependencies BEGIN
 SELECT CASE WHEN (SELECT campaign_id FROM tasks WHERE task_id=NEW.task_id)<>(SELECT campaign_id FROM tasks WHERE task_id=NEW.prerequisite_id)
 THEN RAISE(ABORT,'dependency crosses campaign') END; END;
CREATE TRIGGER dependency_campaign_update BEFORE UPDATE ON dependencies BEGIN
 SELECT CASE WHEN (SELECT campaign_id FROM tasks WHERE task_id=NEW.task_id)<>(SELECT campaign_id FROM tasks WHERE task_id=NEW.prerequisite_id)
 THEN RAISE(ABORT,'dependency crosses campaign') END; END;
CREATE TRIGGER task_campaign_immutable BEFORE UPDATE OF campaign_id ON tasks WHEN OLD.campaign_id<>NEW.campaign_id
 BEGIN SELECT RAISE(ABORT,'task campaign is immutable'); END;
CREATE TABLE attempts (
 task_id TEXT NOT NULL REFERENCES tasks(task_id), generation INTEGER NOT NULL CHECK(generation>0),
 attempt_key TEXT NOT NULL UNIQUE, run_id TEXT NOT NULL UNIQUE, state TEXT NOT NULL,
 worker_id TEXT, lease_token_hash TEXT CHECK(lease_token_hash IS NULL OR length(lease_token_hash)=64),
 expires_at TEXT, last_heartbeat_at TEXT, runtime_kind TEXT, runtime_handle_json TEXT CHECK(runtime_handle_json IS NULL OR json_valid(runtime_handle_json)),
 start_deadline_at TEXT, context_pack_ref TEXT, fault_reason TEXT,
 stop_reason TEXT, stop_requested_at TEXT, grace_deadline_at TEXT, fenced_at TEXT, termination_confirmed INTEGER NOT NULL DEFAULT 0,
 checkpoint_requested_at TEXT, last_checkpoint_tool_calls INTEGER NOT NULL DEFAULT 0,
 last_checkpoint_output_tokens INTEGER NOT NULL DEFAULT 0, last_checkpoint_at TEXT,
 PRIMARY KEY(task_id,generation));
CREATE TABLE permits (attempt_key TEXT NOT NULL REFERENCES attempts(attempt_key), resource_key TEXT NOT NULL,
 amount INTEGER NOT NULL DEFAULT 1 CHECK(amount>0), deadline TEXT NOT NULL, PRIMARY KEY(attempt_key,resource_key));
CREATE TABLE tool_executions (execution_id TEXT PRIMARY KEY, attempt_key TEXT NOT NULL REFERENCES attempts(attempt_key),
 kind TEXT NOT NULL, command_ref TEXT NOT NULL, handle_json TEXT CHECK(handle_json IS NULL OR json_valid(handle_json)), state TEXT NOT NULL,
 stop_intent TEXT, permit_ref TEXT, result_ref TEXT);
CREATE TABLE budget_accounts (campaign_id TEXT NOT NULL REFERENCES campaigns(campaign_id),
 pool TEXT NOT NULL CHECK(pool IN ('campaign','exploration','deepening','validation','formalization')),
 admission_limit_json TEXT NOT NULL CHECK(json_valid(admission_limit_json)), charged_json TEXT NOT NULL CHECK(json_valid(charged_json)),
 reserved_json TEXT NOT NULL CHECK(json_valid(reserved_json)), PRIMARY KEY(campaign_id,pool));
CREATE TABLE reservations (attempt_key TEXT PRIMARY KEY REFERENCES attempts(attempt_key),
 reserved_json TEXT NOT NULL CHECK(json_valid(reserved_json)), observed_json TEXT NOT NULL CHECK(json_valid(observed_json)),
 state TEXT NOT NULL CHECK(state IN ('active','settled','unreconciled')), accounting_epoch INTEGER NOT NULL DEFAULT 0 CHECK(accounting_epoch>=0));
CREATE TABLE usage_snapshots (attempt_key TEXT NOT NULL REFERENCES attempts(attempt_key), source_key TEXT NOT NULL,
 thread_id TEXT, provider_total_json TEXT NOT NULL CHECK(json_valid(provider_total_json)),
 generation_baseline_json TEXT NOT NULL CHECK(json_valid(generation_baseline_json)), observed_at TEXT NOT NULL, PRIMARY KEY(attempt_key,source_key));
CREATE TABLE checkpoints (checkpoint_id TEXT PRIMARY KEY, attempt_key TEXT NOT NULL REFERENCES attempts(attempt_key), seq INTEGER NOT NULL CHECK(seq>0),
 payload_sha256 TEXT NOT NULL CHECK(length(payload_sha256)=64), parent_sha256 TEXT CHECK(parent_sha256 IS NULL OR length(parent_sha256)=64),
 artifact_ref TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(attempt_key,seq));
CREATE TRIGGER checkpoint_no_update BEFORE UPDATE ON checkpoints BEGIN SELECT RAISE(ABORT,'checkpoint history is append-only'); END;
CREATE TRIGGER checkpoint_no_delete BEFORE DELETE ON checkpoints BEGIN SELECT RAISE(ABORT,'checkpoint history is append-only'); END;
CREATE TABLE failures (failure_id TEXT PRIMARY KEY, scope_hash TEXT NOT NULL CHECK(length(scope_hash)=64), fingerprint TEXT NOT NULL,
 failure_json TEXT NOT NULL CHECK(json_valid(failure_json)), retry_conditions_json TEXT NOT NULL CHECK(json_valid(retry_conditions_json)),
 superseding_evidence_refs TEXT NOT NULL CHECK(json_valid(superseding_evidence_refs)), UNIQUE(scope_hash,fingerprint));
CREATE TABLE candidates (candidate_id TEXT PRIMARY KEY, source_task_id TEXT NOT NULL REFERENCES tasks(task_id),
 scope_json TEXT NOT NULL CHECK(json_valid(scope_json)), payload_sha256 TEXT NOT NULL CHECK(length(payload_sha256)=64), validation_state TEXT NOT NULL,
 result_json TEXT NOT NULL CHECK(json_valid(result_json)));
CREATE TABLE validation_tasks (candidate_id TEXT NOT NULL REFERENCES candidates(candidate_id), policy_version TEXT NOT NULL,
 role_slot TEXT NOT NULL CHECK(role_slot IN ('referee','counterexample','reproduce_a','reproduce_b','novelty','formalization_probe')),
 current_task_id TEXT NOT NULL UNIQUE REFERENCES tasks(task_id), prior_task_ids_json TEXT NOT NULL CHECK(json_valid(prior_task_ids_json)),
 PRIMARY KEY(candidate_id,policy_version,role_slot));
CREATE TABLE events (seq INTEGER PRIMARY KEY AUTOINCREMENT, campaign_id TEXT NOT NULL REFERENCES campaigns(campaign_id),
 task_id TEXT REFERENCES tasks(task_id), generation INTEGER CHECK(generation IS NULL OR generation>=0), type TEXT NOT NULL, actor TEXT NOT NULL,
 payload_json TEXT NOT NULL CHECK(json_valid(payload_json)), payload_sha256 TEXT NOT NULL CHECK(length(payload_sha256)=64), created_at TEXT NOT NULL,
 FOREIGN KEY(task_id,campaign_id) REFERENCES tasks(task_id,campaign_id));
CREATE TABLE commands (command_id TEXT PRIMARY KEY, principal_id TEXT NOT NULL, request_sha256 TEXT NOT NULL CHECK(length(request_sha256)=64),
 response_json TEXT NOT NULL CHECK(json_valid(response_json)), status TEXT NOT NULL);
CREATE TABLE approval_requests (request_id TEXT PRIMARY KEY, intake_id TEXT NOT NULL, prepared_sha256 TEXT NOT NULL CHECK(length(prepared_sha256)=64),
 campaign_revision INTEGER NOT NULL CHECK(campaign_revision>=0), state TEXT NOT NULL, requested_by TEXT NOT NULL, host_decision_ref TEXT);
CREATE TABLE approval_tickets (ticket_hash TEXT PRIMARY KEY CHECK(length(ticket_hash)=64), request_id TEXT NOT NULL REFERENCES approval_requests(request_id),
 host_principal TEXT NOT NULL, expires_at TEXT NOT NULL, consumed_by_command_id TEXT);
CREATE TABLE trust_commits (operation_id TEXT PRIMARY KEY, campaign_id TEXT REFERENCES campaigns(campaign_id),
 phase TEXT NOT NULL CHECK(phase IN ('prepared','files_written','committed','blocked')), expected_revision INTEGER NOT NULL CHECK(expected_revision>=0),
 plan_json TEXT NOT NULL CHECK(json_valid(plan_json)), witness_ref TEXT);
CREATE TABLE commit_target_reservations (relative_path TEXT PRIMARY KEY, operation_id TEXT NOT NULL REFERENCES trust_commits(operation_id));
CREATE TABLE id_counters (namespace TEXT PRIMARY KEY, next_value INTEGER NOT NULL CHECK(next_value>0));
CREATE INDEX tasks_dequeue ON tasks(campaign_id,status,pool,priority,created_at);
CREATE INDEX tasks_status_priority ON tasks(status,priority,created_at);
CREATE INDEX tasks_generation ON tasks(task_id,generation);
CREATE INDEX dependencies_prerequisite ON dependencies(prerequisite_id);
CREATE INDEX attempts_state_expiry ON attempts(state,expires_at);
CREATE INDEX events_campaign_seq ON events(campaign_id,seq);
CREATE INDEX events_task_generation ON events(task_id,generation,seq);
CREATE INDEX tools_attempt_state ON tool_executions(attempt_key,state);
CREATE INDEX permits_resource_deadline ON permits(resource_key,deadline);
CREATE INDEX commits_campaign_phase ON trust_commits(campaign_id,phase);
PRAGMA user_version=1;
`;

/** Service-owned connection only. Production opens this after owner + migration readiness. */
export class ResearchStore {
  readonly root: string;
  readonly clock: ResearchClock;
  private readonly db: DatabaseSync;
  private closed = false;
  private transactionDepth = 0;
  private transactionSequence = 0;
  private readonly commitCallbacks: (() => void)[][] = [];
  private readonly context = new AsyncLocalStorage<{ active: boolean }>();

  constructor(root: string, options: ResearchStoreOptions) {
    this.root = realpathSync(root); this.clock = options.clock;
    mkdirSync(resolveResearchControlPath(this.root), { recursive: true });
    this.db = new DatabaseSync(researchDatabasePath(this.root));
    try {
      this.db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=1000;");
      this.migrateV1(); this.importLegacyIds();
    } catch (error) { this.db.close(); this.closed = true; throw error; }
  }
  private assertOpen(): void {
    if (this.closed) throw new Error("Research store is closed");
    if (this.context.getStore()?.active === false) throw new Error("Research transaction must be synchronous; asynchronous continuation rejected");
  }
  private assertServiceSql(sql: string): void {
    this.assertOpen();
    if (/\b(BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE|ATTACH|DETACH)\b/i.test(sql)) throw new Error("Use the synchronous transaction API");
  }
  exec(sql: string): void { this.assertServiceSql(sql); this.db.exec(sql); }
  run(sql: string, ...params: SQLInputValue[]): { changes: number | bigint; lastInsertRowid: number | bigint } {
    this.assertServiceSql(sql); return this.db.prepare(sql).run(...params);
  }
  get(sql: string, ...params: SQLInputValue[]): Record<string, unknown> | undefined {
    this.assertServiceSql(sql); return this.db.prepare(sql).get(...params);
  }
  all(sql: string, ...params: SQLInputValue[]): Record<string, unknown>[] {
    this.assertServiceSql(sql); return this.db.prepare(sql).all(...params);
  }
  get inTransaction(): boolean { return this.transactionDepth > 0; }
  afterCommit(callback: () => void): void {
    this.assertOpen();
    const current = this.commitCallbacks.at(-1);
    if (current) current.push(callback);
    else callback();
  }
  transaction<T>(callback: () => T): T {
    this.assertOpen();
    if (callback.constructor.name === "AsyncFunction") throw new Error("Research transaction callback must be synchronous");
    const savepoint = `research_${++this.transactionSequence}`;
    const nested = this.transactionDepth > 0;
    this.db.exec(nested ? `SAVEPOINT ${savepoint}` : "BEGIN IMMEDIATE");
    this.transactionDepth++;
    const context = { active: true };
    const callbacks: (() => void)[] = [];
    this.commitCallbacks.push(callbacks);
    let result: T;
    try {
      result = this.context.run(context, callback);
      if (result !== null && (typeof result === "object" || typeof result === "function") && typeof (result as { then?: unknown }).then === "function") {
        // Observe rejection without permitting a continuation to write after rollback.
        void Promise.resolve(result).catch(() => undefined);
        throw new Error("Research transaction callback must be synchronous, not Promise-returning");
      }
      this.db.exec(nested ? `RELEASE SAVEPOINT ${savepoint}` : "COMMIT");
    } catch (error) {
      this.db.exec(nested ? `ROLLBACK TO SAVEPOINT ${savepoint}; RELEASE SAVEPOINT ${savepoint}` : "ROLLBACK");
      throw error;
    } finally { context.active = false; this.transactionDepth--; this.commitCallbacks.pop(); }
    // A rolled-back savepoint never reaches here. Only the outer commit wakes consumers.
    const parent = this.commitCallbacks.at(-1);
    if (parent) parent.push(...callbacks);
    else for (const notify of callbacks) notify();
    return result;
  }
  migrateV1(): void {
    this.assertOpen();
    const version = Number(this.db.prepare("PRAGMA user_version").get()?.user_version);
    if (version === RESEARCH_SCHEMA_VERSION) return;
    if (version !== 0) throw new Error(`Unsupported research schema version ${version}`);
    this.transaction(() => this.db.exec(schemaV1));
  }
  putCampaign(input: ResearchControlCampaign): ResearchControlCampaign {
    const value = parseResearchInput(researchControlCampaignSchema, input);
    this.run("INSERT INTO campaigns(campaign_id,project_id,revision,state,charter_sha256,control_json) VALUES (?,?,?,?,?,?) ON CONFLICT(campaign_id) DO UPDATE SET project_id=excluded.project_id, revision=excluded.revision,state=excluded.state,charter_sha256=excluded.charter_sha256,control_json=excluded.control_json",
      value.campaign_id, value.project_id, value.revision, value.state, value.charter.sha256, JSON.stringify(value));
    return value;
  }
  getCampaign(id: string): ResearchControlCampaign | undefined {
    const row = this.get("SELECT control_json FROM campaigns WHERE campaign_id=?", id);
    return row ? researchControlCampaignSchema.parse(JSON.parse(String(row.control_json))) : undefined;
  }
  listCampaigns(): ResearchControlCampaign[] { return this.all("SELECT control_json FROM campaigns ORDER BY campaign_id").map(row => researchControlCampaignSchema.parse(JSON.parse(String(row.control_json)))); }
  putTask(input: ResearchTask): ResearchTask {
    const value = parseResearchInput(researchTaskSchema, input);
    this.run("INSERT INTO tasks(task_id,campaign_id,status,generation,pool,priority,created_at,task_json) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(task_id) DO UPDATE SET campaign_id=excluded.campaign_id,status=excluded.status,generation=excluded.generation,pool=excluded.pool,priority=excluded.priority,task_json=excluded.task_json",
      value.task_id, value.campaign_id, value.status, value.generation, value.pool, value.priority, value.created_at, JSON.stringify(value));
    return value;
  }
  getTask(id: string): ResearchTask | undefined {
    const row = this.get("SELECT task_json FROM tasks WHERE task_id=?", id);
    return row ? researchTaskSchema.parse(JSON.parse(String(row.task_json))) : undefined;
  }
  listTasks(campaignId: string): ResearchTask[] { return this.all("SELECT task_json FROM tasks WHERE campaign_id=? ORDER BY created_at,task_id", campaignId).map(row => researchTaskSchema.parse(JSON.parse(String(row.task_json)))); }
  appendEvent(input: ResearchEventInput): ResearchEvent {
    const value = parseResearchInput(researchEventInputSchema, input);
    const payload = canonicalJson(value.payload);
    const hash = createHash("sha256").update(payload).digest("hex");
    const createdAt = value.created_at ?? new Date(this.clock.now()).toISOString();
    const result = this.run("INSERT INTO events(campaign_id,task_id,generation,type,actor,payload_json,payload_sha256,created_at) VALUES (?,?,?,?,?,?,?,?)",
      value.campaign_id, value.task_id ?? null, value.generation ?? null, value.type, value.actor, payload, hash, createdAt);
    return { ...value, seq: Number(result.lastInsertRowid), payload_sha256: hash, created_at: createdAt };
  }
  listEvents(campaignId: string, afterSeq = 0, limit = 1000): ResearchEvent[] {
    if (!Number.isSafeInteger(afterSeq) || afterSeq < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 10000) throw new Error("Invalid event cursor/limit");
    return this.all("SELECT * FROM events WHERE campaign_id=? AND seq>? ORDER BY seq LIMIT ?", campaignId, afterSeq, limit).map(row => ({
      seq: Number(row.seq), campaign_id: String(row.campaign_id), ...(row.task_id === null ? {} : { task_id: String(row.task_id) }),
      ...(row.generation === null ? {} : { generation: Number(row.generation) }), type: String(row.type), actor: String(row.actor),
      payload: JSON.parse(String(row.payload_json)), payload_sha256: String(row.payload_sha256), created_at: String(row.created_at)
    }));
  }
  allocateId(namespace: string): string {
    if (this.transactionDepth === 0) throw new Error("ID allocation requires a transaction");
    if (!/^[A-Z][A-Z0-9_]{0,31}$/.test(namespace)) throw new Error("Invalid ID namespace");
    this.run("INSERT INTO id_counters(namespace,next_value) VALUES (?,1) ON CONFLICT(namespace) DO NOTHING", namespace);
    const value = Number(this.get("SELECT next_value FROM id_counters WHERE namespace=?", namespace)?.next_value);
    if (!Number.isSafeInteger(value) || value >= Number.MAX_SAFE_INTEGER) throw new Error("ID counter exhausted");
    this.run("UPDATE id_counters SET next_value=? WHERE namespace=?", value + 1, namespace);
    return `${namespace}-${String(value).padStart(4, "0")}`;
  }
  private importLegacyIds(): void {
    if (this.get("SELECT namespace FROM id_counters WHERE namespace='__legacy_imported'")) return;
    const maxima = new Map<string, number>();
    const scan = (text: string) => { for (const match of text.matchAll(/\b([A-Z][A-Z0-9_]{0,31})-(\d{4,})\b/g)) {
      const value = Number(match[2]); if (!Number.isSafeInteger(value) || value >= Number.MAX_SAFE_INTEGER) throw new Error("Legacy ID exceeds safe counter range");
      maxima.set(match[1], Math.max(maxima.get(match[1]) ?? 0, value));
    } };
    const visit = (directory: string) => { for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error("Unsafe link in legacy ID scan");
      if (entry.isDirectory()) { if (!(directory === join(this.root, ".comath") && ["control", "snapshots"].includes(entry.name))) visit(path); }
      else { scan(entry.name); if (/\.jsonl?$/.test(entry.name)) {
        if (lstatSync(path).size > 64 * 1024 * 1024) throw new Error("Legacy metadata is too large for bounded ID import");
        scan(readFileSync(path, "utf8"));
      } }
    } };
    if (existsSync(join(this.root, ".comath"))) visit(join(this.root, ".comath"));
    this.transaction(() => {
      for (const [namespace, maximum] of maxima) this.run("INSERT INTO id_counters(namespace,next_value) VALUES (?,?) ON CONFLICT(namespace) DO UPDATE SET next_value=MAX(next_value,excluded.next_value)", namespace, maximum + 1);
      this.run("INSERT INTO id_counters(namespace,next_value) VALUES ('__legacy_imported',1)");
    });
  }
  close(): void {
    if (this.closed) return;
    this.assertOpen(); if (this.transactionDepth !== 0) throw new Error("Cannot close store during transaction");
    this.db.exec("PRAGMA wal_checkpoint(TRUNCATE)"); this.db.close(); this.closed = true;
  }
}
export function openResearchStore(root: string, options: ResearchStoreOptions): ResearchStore { return new ResearchStore(root, options); }
