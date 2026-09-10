import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, randomUUID } from "node:crypto";
import { closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, realpathSync, renameSync, writeSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { z } from "zod";
import { ComathError } from "../errors.js";
import { getAcquiredProjectRuntime, type ProjectRuntime } from "./project-runtime.js";
import { researchDatabasePath } from "./research-store.js";
import { type AuditEvent } from "../types/schemas.js";

export type ProjectCommitFault = "after_prepare" | "after_file" | "after_witness" | "before_finalize";
export type ProjectCommitOperation = { operation_id: string; campaign_id?: string; expected_revision?: number; request?: unknown;
  fault?: (stage: ProjectCommitFault, target?: string) => void };
const targetSchema = z.strictObject({ relative_path: z.string(), expected_before_sha256: z.string().nullable(),
  after_image: z.strictObject({ artifact_id: z.string(), sha256: z.string() }), after_sha256: z.string(), operation_id: z.string() });
const planSchema = z.strictObject({ version: z.literal(1), operation_id: z.string(), campaign_id: z.string().optional(),
  request_sha256: z.string(), response: z.json(), response_undefined_paths: z.array(z.array(z.union([z.string(), z.number().int().nonnegative()]))).default([]), created_at: z.string(), targets: z.array(targetSchema),
  audit: z.array(z.json()), mutations: z.array(z.strictObject({ sql: z.string(), params: z.array(z.union([z.string(), z.number(), z.null()])) })) });
type CommitPlan = z.infer<typeof planSchema>;
type StagedFile = { relative_path: string; before: string | null; bytes: Buffer };
type CommitContext = { root: string; runtime: ProjectRuntime; operation: ProjectCommitOperation; active: boolean;
  files: Map<string, StagedFile>; audit: AuditEvent[]; mutations: CommitPlan["mutations"] };
const contexts = new AsyncLocalStorage<CommitContext>();
const hash = (bytes: string | Buffer): string => createHash("sha256").update(bytes).digest("hex");
function canonical(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value).filter(key => (value as Record<string, unknown>)[key] !== undefined).sort().map(key => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}`;
}
function error(code: string, message: string): ComathError { return new ComathError(message, { code, statusCode: 409 }); }
function normalized(root: string, candidate: string): string {
  const canonicalRoot = realpathSync(root);
  const absolute = resolve(canonicalRoot, candidate);
  const rel = relative(canonicalRoot, absolute).replace(/\\/g, "/");
  if (!rel || rel.startsWith("../") || isAbsolute(rel)) throw error("TRUST_COMMIT_PATH_DENIED", "Commit path escapes project root");
  let current = canonicalRoot;
  for (const part of rel.split("/")) {
    current = join(current, part);
    if (lstatSync(current, { throwIfNoEntry: false })?.isSymbolicLink()) throw error("TRUST_COMMIT_PATH_DENIED", "Commit path contains a link or junction");
  }
  return rel;
}
export function resolveProjectCommitPath(root: string, path: string): string { return resolve(realpathSync(root), normalized(root, path)); }
function contextFor(root: string): CommitContext | undefined {
  const context = contexts.getStore();
  if (context && !context.active) throw error("TRUST_COMMIT_ASYNC_REJECTED", "Expired synchronous project commit context");
  return context?.root === realpathSync(root) ? context : undefined;
}
function runtimeFor(root: string): ProjectRuntime | undefined {
  contextFor(root);
  const runtime = getAcquiredProjectRuntime(root);
  if (!runtime && existsSync(researchDatabasePath(root))) throw error("RESEARCH_OWNER_REQUIRED", "Research control requires an acquired project owner");
  return runtime;
}
export function hasProjectCommit(root: string): boolean { return contextFor(root) !== undefined; }
export function projectCommitTime(root: string): string { return new Date(runtimeFor(root)?.clock.now() ?? Date.now()).toISOString(); }
function pendingPlans(runtime: ProjectRuntime): CommitPlan[] {
  return runtime.store.all("SELECT plan_json FROM trust_commits WHERE phase<>'committed'").map(row => planSchema.parse(JSON.parse(String(row.plan_json))));
}
export function assertProjectReadable(root: string, candidate?: string, campaignId?: string, directory = false): void {
  const runtime = runtimeFor(root); if (!runtime) return;
  const context = contextFor(root);
  const path = candidate ? normalized(root, candidate) : undefined;
  for (const plan of pendingPlans(runtime)) {
    if (plan.operation_id === context?.operation.operation_id) continue;
    if ((campaignId && plan.campaign_id === campaignId)
      || (path && plan.targets.some(target => target.relative_path === path || (directory && target.relative_path.startsWith(path + "/"))))) {
      throw error("COMMIT_PENDING", `Commit ${plan.operation_id} is pending for this read or target`);
    }
  }
}
export function existsCommittedFile(root: string, path: string): boolean {
  assertProjectReadable(root, path);
  return contextFor(root)?.files.has(normalized(root, path)) || existsSync(resolve(root, path));
}
export function readCommittedFile(root: string, path: string): string {
  assertProjectReadable(root, path);
  const staged = contextFor(root)?.files.get(normalized(root, path));
  return staged ? staged.bytes.toString("utf8") : readFileSync(resolve(root, path), "utf8");
}
export function listCommittedDirectory(root: string, path: string): string[] {
  assertProjectReadable(root, path, undefined, true);
  const rel = normalized(root, path), names = new Set<string>();
  if (existsSync(resolve(root, path))) for (const entry of readdirSync(resolve(root, path), { withFileTypes: true })) if (entry.isDirectory()) names.add(entry.name);
  for (const staged of contextFor(root)?.files.values() ?? []) if (staged.relative_path.startsWith(rel + "/")) names.add(staged.relative_path.slice(rel.length + 1).split("/")[0]);
  return [...names];
}
function atomicWrite(root: string, relativePath: string, bytes: Buffer): void {
  const path = resolve(root, normalized(root, relativePath));
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.commit-${randomUUID()}.tmp`;
  const fd = openSync(temporary, "wx");
  try { let offset = 0; while (offset < bytes.length) offset += writeSync(fd, bytes, offset); fsyncSync(fd); }
  finally { closeSync(fd); }
  renameSync(temporary, path);
}
export function writeCommittedFile(root: string, path: string, contents: string | Buffer): void {
  const runtime = runtimeFor(root), context = contextFor(root);
  if (runtime && !context) { withTrustedWriter(root, "write-file", { path, sha256: hash(contents) }, () => writeCommittedFile(root, path, contents)); return; }
  const rel = normalized(root, path); assertProjectReadable(root, rel);
  if (!context) { atomicWrite(root, rel, Buffer.from(contents)); return; }
  const previous = context.files.get(rel);
  context.files.set(rel, { relative_path: rel, before: previous?.before ?? (existsSync(resolve(root, rel)) ? hash(readFileSync(resolve(root, rel))) : null), bytes: Buffer.from(contents) });
}
export function allocateProjectId(root: string, namespace: string, legacy: () => string): string {
  const runtime = runtimeFor(root); if (!runtime) return legacy();
  if (!contextFor(root)) return withTrustedWriter(root, "allocate-id", { namespace }, () => allocateProjectId(root, namespace, legacy));
  return runtime.store.allocateId(namespace);
}
/** Service-only declarative finalize writes; recovery never serializes executable closures. */
export function stageResearchMutation(root: string, sql: string, params: (string | number | null)[] = []): void {
  const context = contextFor(root); if (!context) throw new Error("A project commit is required for a staged research mutation");
  if (!/^\s*(INSERT|UPDATE|DELETE)\b/i.test(sql) || /;|\b(trust_commits|commit_target_reservations|commands|id_counters)\b/i.test(sql)) throw new Error("Unsupported staged research mutation");
  context.mutations.push({ sql, params });
}
export function stageAuditEvent(root: string, event: AuditEvent): void {
  const context = contextFor(root); if (!context) throw new Error("Audit staging requires a project commit");
  // Match the old JSONL serialization semantics for optional undefined payload fields.
  context.audit.push(JSON.parse(JSON.stringify(event)) as AuditEvent);
}
export function stagedAuditEvents(root: string): AuditEvent[] { return [...(contextFor(root)?.audit ?? [])]; }
function casPath(sha256: string): string {
  if (!/^[a-f0-9]{64}$/.test(sha256)) throw error("TRUST_COMMIT_CORRUPT", "Invalid after-image hash");
  return `.comath/artifacts/sha256/${sha256.slice(0, 2)}/${sha256}`;
}
function storeAfterImage(root: string, bytes: Buffer): { artifact_id: string; sha256: string } {
  const sha256 = hash(bytes), path = casPath(sha256), absolute = resolve(root, normalized(root, path));
  if (existsSync(absolute)) { if (hash(readFileSync(absolute)) !== sha256) throw error("TRUST_COMMIT_CORRUPT", "After-image CAS hash mismatch"); }
  else atomicWrite(root, path, bytes);
  return { artifact_id: `CAS-${sha256}`, sha256 };
}
function operationHash(operation: ProjectCommitOperation): string { return hash(canonical({ campaign_id: operation.campaign_id, expected_revision: operation.expected_revision ?? 0, request: operation.request ?? null })); }
function encodeResponse(response: unknown): Pick<CommitPlan, "response" | "response_undefined_paths"> {
  const json = response === undefined ? null : JSON.parse(JSON.stringify(response));
  const paths: CommitPlan["response_undefined_paths"] = [];
  const visit = (value: unknown, path: (string | number)[]) => {
    if (value === undefined) { paths.push(path); return; }
    if (value && typeof value === "object") for (const key of Object.keys(value)) visit((value as Record<string, unknown>)[key], [...path, Array.isArray(value) ? Number(key) : key]);
  };
  visit(response, []);
  return { response: json, response_undefined_paths: paths };
}
function decodeResponse(plan: CommitPlan): unknown {
  const value = JSON.parse(JSON.stringify(plan.response));
  for (const path of plan.response_undefined_paths) {
    if (path.length === 0) return undefined;
    let parent = value;
    for (const key of path.slice(0, -1)) {
      if (!parent || !Object.prototype.hasOwnProperty.call(parent, key)) throw error("TRUST_COMMIT_CORRUPT", "Invalid saved response path");
      parent = parent[key];
    }
    Object.defineProperty(parent, path[path.length - 1], { value: undefined, enumerable: true, writable: true, configurable: true });
  }
  return value;
}

/** Prepare all target reservations atomically. Called inside the short synchronous store transaction. */
export function prepareTrustCommit(root: string, response: unknown): CommitPlan {
  const context = contextFor(root); if (!context) throw new Error("Prepare requires a project commit context");
  const { runtime, operation } = context;
  const targets = [...context.files.values()].map(file => {
    const after_image = storeAfterImage(root, file.bytes);
    return { relative_path: file.relative_path, expected_before_sha256: file.before, after_image, after_sha256: after_image.sha256, operation_id: operation.operation_id };
  });
  const plan = planSchema.parse({ version: 1, operation_id: operation.operation_id, campaign_id: operation.campaign_id,
    request_sha256: operationHash(operation), ...encodeResponse(response),
    created_at: projectCommitTime(root), targets, audit: context.audit, mutations: context.mutations });
  for (const target of targets) {
    if (runtime.store.get("SELECT operation_id FROM commit_target_reservations WHERE relative_path=?", target.relative_path)) throw error("COMMIT_PENDING", `Target reserved: ${target.relative_path}`);
  }
  const controlCampaign = operation.campaign_id ? runtime.store.getCampaign(operation.campaign_id) : undefined;
  if (controlCampaign && operation.expected_revision !== undefined && controlCampaign.revision !== operation.expected_revision) throw error("CAMPAIGN_REVISION_CONFLICT", "Campaign revision changed");
  runtime.store.run("INSERT INTO trust_commits(operation_id,campaign_id,phase,expected_revision,plan_json) VALUES (?,?,'prepared',?,?)",
    operation.operation_id, controlCampaign?.campaign_id ?? null, operation.expected_revision ?? 0, JSON.stringify(plan));
  for (const target of targets) runtime.store.run("INSERT INTO commit_target_reservations(relative_path,operation_id) VALUES (?,?)", target.relative_path, operation.operation_id);
  return plan;
}
function readPlan(runtime: ProjectRuntime, operationId: string): { plan: CommitPlan; phase: string } {
  const row = runtime.store.get("SELECT plan_json,phase FROM trust_commits WHERE operation_id=?", operationId);
  if (!row) throw error("TRUST_COMMIT_NOT_FOUND", "Unknown trust commit");
  return { plan: planSchema.parse(JSON.parse(String(row.plan_json))), phase: String(row.phase) };
}
function installPlan(runtime: ProjectRuntime, plan: CommitPlan, fault?: ProjectCommitOperation["fault"]): void {
  try {
    for (const target of plan.targets) {
      const path = resolve(runtime.root, normalized(runtime.root, target.relative_path));
      const current = existsSync(path) ? hash(readFileSync(path)) : null;
      if (current !== target.after_sha256) {
        if (current !== target.expected_before_sha256) throw error("TRUST_COMMIT_CONFLICT", `Unknown bytes at ${target.relative_path}`);
        const bytes = readFileSync(resolve(runtime.root, normalized(runtime.root, casPath(target.after_image.sha256))));
        if (hash(bytes) !== target.after_sha256 || target.after_image.sha256 !== target.after_sha256) throw error("TRUST_COMMIT_CONFLICT", "Saved after-image is corrupt");
        atomicWrite(runtime.root, target.relative_path, bytes);
      }
      fault?.("after_file", target.relative_path);
    }
    runtime.store.run("UPDATE trust_commits SET phase='files_written' WHERE operation_id=?", plan.operation_id);
  } catch (cause) {
    if (cause instanceof ComathError && cause.code === "TRUST_COMMIT_CONFLICT") runtime.store.run("UPDATE trust_commits SET phase='blocked' WHERE operation_id=?", plan.operation_id);
    throw cause;
  }
}
export function finalizeTrustCommit(root: string, operationId: string, fault?: ProjectCommitOperation["fault"]): unknown {
  const runtime = runtimeFor(root); if (!runtime) throw new Error("Trust commit requires acquired runtime");
  const { plan, phase } = readPlan(runtime, operationId);
  if (phase !== "committed") {
    installPlan(runtime, plan, fault);
    const witnessPath = `.comath/control/commits/${hash(operationId)}.json`;
    const witness = Buffer.from(canonical({ operation_id: operationId, plan_sha256: hash(canonical(plan)), targets: plan.targets.map(target => ({ relative_path: target.relative_path, sha256: target.after_sha256 })) }) + "\n");
    const absoluteWitness = resolve(root, normalized(root, witnessPath));
    if (existsSync(absoluteWitness) && !readFileSync(absoluteWitness).equals(witness)) throw error("TRUST_COMMIT_CONFLICT", "Unknown commit witness bytes");
    if (!existsSync(absoluteWitness)) atomicWrite(root, witnessPath, witness);
    fault?.("after_witness"); fault?.("before_finalize");
    runtime.store.transaction(() => {
      for (const mutation of plan.mutations) runtime.store.run(mutation.sql, ...mutation.params);
      runtime.store.run("UPDATE trust_commits SET phase='committed',witness_ref=? WHERE operation_id=?", witnessPath, operationId);
      runtime.store.run("DELETE FROM commit_target_reservations WHERE operation_id=?", operationId);
    });
  }
  projectCommittedAudit(root);
  return decodeResponse(plan);
}
export function reconcileTrustCommits(root: string): void {
  const runtime = runtimeFor(root); if (!runtime) return;
  for (const row of runtime.store.all("SELECT operation_id FROM trust_commits WHERE phase<>'committed' ORDER BY rowid")) finalizeTrustCommit(root, String(row.operation_id));
  drainResearchAuditOutbox(root);
}
export function withProjectCommit<T>(root: string, operation: ProjectCommitOperation, callback: () => T): T {
  const runtime = runtimeFor(root); if (!runtime) throw new Error("Explicit project commits require an acquired runtime");
  if (contextFor(root)) return callback();
  if (!operation.operation_id || operation.operation_id.length > 200) throw new Error("Invalid operation ID");
  const existing = runtime.store.get("SELECT plan_json,phase FROM trust_commits WHERE operation_id=?", operation.operation_id);
  if (existing) {
    const plan = planSchema.parse(JSON.parse(String(existing.plan_json)));
    if (plan.request_sha256 !== operationHash(operation)) throw error("TRUST_COMMIT_REQUEST_CONFLICT", "Operation ID reused with different request");
    if (existing.phase !== "committed") throw error("COMMIT_PENDING", `Commit ${operation.operation_id} awaits recovery`);
    projectCommittedAudit(root); return decodeResponse(plan) as T;
  }
  assertProjectReadable(root, undefined, operation.campaign_id);
  if (callback.constructor.name === "AsyncFunction") throw new Error("Project commit callback must be synchronous");
  const context: CommitContext = { root: runtime.root, runtime, operation, active: true, files: new Map(), audit: [], mutations: [] };
  let response!: T;
  try {
    runtime.store.transaction(() => contexts.run(context, () => {
      response = callback();
      if (response && typeof (response as { then?: unknown }).then === "function") { void Promise.resolve(response).catch(() => undefined); throw new Error("Project commit callback must be synchronous"); }
      prepareTrustCommit(root, response);
    }));
  } finally { context.active = false; }
  operation.fault?.("after_prepare");
  finalizeTrustCommit(root, operation.operation_id, operation.fault);
  return response;
}
export function withTrustedWriter<T>(root: string, label: string, request: unknown, callback: () => T, campaignId?: string): T {
  if (contextFor(root)) return callback();
  const runtime = runtimeFor(root); if (!runtime) return callback();
  return withProjectCommit(root, { operation_id: `OP-${randomUUID()}`, campaign_id: campaignId, request: { label, input: request } }, callback);
}

export type ResearchAuditProjectionStatus = { state: "ready" | "pending" | "blocked"; pending_exports: number; code?: string; message?: string; updated_at?: string };
export function getResearchAuditProjectionStatus(root: string): ResearchAuditProjectionStatus {
  const runtime = runtimeFor(root); if (!runtime) return { state: "ready", pending_exports: 0 };
  let pending = 0;
  for (const row of runtime.store.all("SELECT plan_json FROM trust_commits WHERE phase='committed'")) {
    const plan = planSchema.parse(JSON.parse(String(row.plan_json)));
    for (let index = 0; index < plan.audit.length; index++) if (!runtime.store.get("SELECT command_id FROM commands WHERE command_id=? AND principal_id='service:research-audit' AND status='committed'", `audit:${plan.operation_id}:${index}`)) pending++;
  }
  const diagnostic = runtime.store.get("SELECT response_json,status FROM commands WHERE principal_id='service:research-audit-status' ORDER BY rowid DESC LIMIT 1");
  return diagnostic?.status === "blocked" ? { ...JSON.parse(String(diagnostic.response_json)), state: "blocked", pending_exports: pending }
    : { state: pending ? "pending" : "ready", pending_exports: pending };
}
/** Only called after business finalize; file/DB commit failures are never caught here. */
function projectCommittedAudit(root: string): void {
  const runtime = runtimeFor(root); if (!runtime) return;
  try { drainResearchAuditOutbox(root); }
  catch (cause) {
    const diagnostic = { code: cause instanceof ComathError ? cause.code : "AUDIT_PROJECTION_FAILED",
      message: cause instanceof Error ? cause.message : String(cause), updated_at: projectCommitTime(root) };
    const existing = runtime.store.get("SELECT command_id FROM commands WHERE principal_id='service:research-audit-status' LIMIT 1");
    if (existing) runtime.store.run("UPDATE commands SET response_json=?,status='blocked' WHERE command_id=?", JSON.stringify(diagnostic), String(existing.command_id));
    else runtime.store.run("INSERT INTO commands(command_id,principal_id,request_sha256,response_json,status) VALUES (?,'service:research-audit-status',?,?,'blocked')", `audit-status:${randomUUID()}`, hash("audit-projection-status"), JSON.stringify(diagnostic));
  }
}

/** Ordered, recoverable audit projection. Shared audit path is never a business target reservation. */
export function drainResearchAuditOutbox(root: string): void {
  const runtime = runtimeFor(root); if (!runtime) return;
  const path = resolve(root, normalized(root, ".comath/audit/events.jsonl"));
  mkdirSync(dirname(path), { recursive: true });
  const finish = (commandId: string, offset: number, line: string) => {
    const bytes = existsSync(path) ? readFileSync(path) : Buffer.alloc(0);
    const expected = Buffer.from(line), tail = bytes.subarray(offset);
    if (bytes.length < offset || (tail.length < expected.length ? !tail.equals(expected.subarray(0, tail.length)) : !tail.subarray(0, expected.length).equals(expected))) throw error("AUDIT_OUTBOX_CONFLICT", "Unknown bytes at pending audit export tail");
    if (tail.length < expected.length) {
      const fd = openSync(path, "a"); try { let at = tail.length; while (at < expected.length) at += writeSync(fd, expected, at); fsyncSync(fd); } finally { closeSync(fd); }
    }
    runtime.store.run("UPDATE commands SET status='committed' WHERE command_id=?", commandId);
  };
  for (const row of runtime.store.all("SELECT command_id,response_json FROM commands WHERE principal_id='service:research-audit' AND status='prepared' ORDER BY rowid")) {
    const saved = JSON.parse(String(row.response_json)) as { offset: number; line: string }; finish(String(row.command_id), saved.offset, saved.line);
  }
  for (const row of runtime.store.all("SELECT plan_json FROM trust_commits WHERE phase='committed' ORDER BY rowid")) {
    const plan = planSchema.parse(JSON.parse(String(row.plan_json)));
    for (const [index, event] of plan.audit.entries()) {
      const commandId = `audit:${plan.operation_id}:${index}`;
      const audit = event as unknown as AuditEvent;
      const line = JSON.stringify({ ...audit, payload: { ...audit.payload, operation_id: plan.operation_id, outbox_id: commandId } }) + "\n";
      const existing = runtime.store.get("SELECT principal_id,request_sha256 FROM commands WHERE command_id=?", commandId);
      if (existing) {
        if (existing.principal_id !== "service:research-audit" || existing.request_sha256 !== hash(line)) throw error("AUDIT_OUTBOX_CONFLICT", "Audit command ID belongs to different content or principal");
        continue;
      }
      const offset = existsSync(path) ? lstatSync(path).size : 0;
      runtime.store.run("INSERT INTO commands(command_id,principal_id,request_sha256,response_json,status) VALUES (?,'service:research-audit',?,?,'prepared')", commandId, hash(line), JSON.stringify({ offset, line }));
      finish(commandId, offset, line);
    }
  }
  runtime.store.run("UPDATE commands SET status='committed' WHERE principal_id='service:research-audit-status'");
}
