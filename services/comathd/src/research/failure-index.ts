import { createHash } from "node:crypto";
import { closeSync, openSync, readSync } from "node:fs";
import { z } from "zod";
import { listArtifactRefs } from "../artifacts/store.js";
import { ComathError } from "../errors.js";
import { graphPatchSchema, type GraphPatch } from "../types/schemas.js";
import { canonicalJson } from "../verification/runner-contracts.js";
import { createResearchEventStore } from "./event-store.js";
import { assertProjectReadable, resolveProjectCommitPath } from "./project-commit.js";
import { getAcquiredProjectRuntime, type ProjectRuntime } from "./project-runtime.js";
import { artifactPointerSchema, scopeBindingSchema, sha256Schema, type ArtifactPointer, type ScopeBinding } from "./research-schemas.js";

const id = z.string().min(1).max(160), text = z.string().min(1).max(8192);
const strings = z.array(text).max(100), references = z.array(artifactPointerSchema).max(100);
const routeFields = { scope: scopeBindingSchema, problem_slice: text, method_family: text,
  normalized_assumptions: strings, dependency_hashes: z.array(sha256Schema).max(100) };
export const routeFingerprintSchema = z.strictObject({ ...routeFields, question: text, hypothesis: text.optional() });
export const failureMemorySchema = z.strictObject({ failure_id: id, ...routeFields, route_fingerprint: sha256Schema,
  failure_mode: z.enum(["counterexample", "contradictory_assumptions", "dead_end", "computation_invalid", "duplicate", "insufficient_evidence"]),
  counterexample_refs: references, artifact_refs: references, retry_conditions: strings, created_by_task_id: id });
export type RouteFingerprintInput = z.infer<typeof routeFingerprintSchema>;
export type FailureMemory = z.infer<typeof failureMemorySchema>;
export type FailureRecord = { failure: FailureMemory; sha256: string };
export type FailedRouteMatch = FailureRecord & { match: "exact" | "advisory" };
export type FindFailedRoutesInput = { scope: ScopeBinding; problem_slice?: string; method_family?: string; route?: RouteFingerprintInput; limit?: number };
export type CheckRetryInput = { task_id: string; route: RouteFingerprintInput; new_evidence_refs?: ArtifactPointer[] };
export type RetryDecision = { allowed: boolean; reason: "no_exact_failure" | "new_evidence" | "conditions_satisfied" | "blocked_exact_failure";
  route_fingerprint: string; blocking_failure_ids: string[]; matched_failure_ids: string[]; new_evidence_refs: ArtifactPointer[];
  satisfied_conditions: string[]; unsatisfied_conditions: string[] };
export type FailureIndexOptions = {
  authorizeArtifact: (taskId: string, ref: ArtifactPointer, scope: ScopeBinding) => boolean;
  verifyRetryCondition?: (failure: FailureMemory, condition: string, evidenceRefs: ArtifactPointer[], taskId: string) => boolean;
};
export type FailureGraphProposalInput = { patch_id: string; node_id: string; created_by: string; source_workstream_id?: string };
export type FailureIndex = {
  recordFailure(input: FailureMemory): FailureRecord;
  findFailedRoutes(input: FindFailedRoutesInput): FailedRouteMatch[];
  checkRetryConditions(input: CheckRetryInput): RetryDecision;
  toGraphPatchProposal(failureId: string, input: FailureGraphProposalInput): GraphPatch;
};
export const failureIndexJsonSchemas = { FailureMemory: z.toJSONSchema(failureMemorySchema), RouteFingerprint: z.toJSONSchema(routeFingerprintSchema) };
const hash = (value: unknown) => createHash("sha256").update(canonicalJson(value)).digest("hex");
function fail(code: string, message: string): never { throw new ComathError(message, { code, statusCode: 409 }); }
function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const raw = JSON.stringify(input);
  if (raw === undefined || Buffer.byteLength(raw, "utf8") > 1024 * 1024) fail("FAILURE_INPUT_INVALID", "Failure index input exceeds 1 MiB");
  const parsed = schema.safeParse(input);
  if (!parsed.success) fail("FAILURE_INPUT_INVALID", "Failure index input is malformed or includes an infrastructure fault category");
  return parsed.data;
}
/** No case-folding, Unicode substitution, token rewriting or inner-whitespace collapsing. */
function normalizeText(value: string): string { return value.replace(/\r\n?/g, "\n").trim(); }
const orderedStrings = (values: string[]) => [...new Set(values.map(normalizeText))].sort();
function orderedRefs(values: ArtifactPointer[]): ArtifactPointer[] {
  return [...new Map(values.map(value => [`${value.artifact_id}:${value.sha256}`, { ...value }])).values()]
    .sort((a, b) => a.artifact_id.localeCompare(b.artifact_id) || a.sha256.localeCompare(b.sha256));
}
function normalizedRoute(input: RouteFingerprintInput): RouteFingerprintInput {
  const value = parse(routeFingerprintSchema, input);
  return { ...value, question: normalizeText(value.question), ...(value.hypothesis === undefined ? {} : { hypothesis: normalizeText(value.hypothesis) }),
    problem_slice: normalizeText(value.problem_slice), method_family: normalizeText(value.method_family),
    normalized_assumptions: orderedStrings(value.normalized_assumptions), dependency_hashes: [...new Set(value.dependency_hashes)].sort() };
}
export function fingerprintRoute(input: RouteFingerprintInput): string {
  return hash({ schema_version: "comath.route_fingerprint.v1", ...normalizedRoute(input) });
}
function normalizedFailure(input: FailureMemory): FailureMemory {
  const value = parse(failureMemorySchema, input);
  return { ...value, problem_slice: normalizeText(value.problem_slice), method_family: normalizeText(value.method_family),
    normalized_assumptions: orderedStrings(value.normalized_assumptions), dependency_hashes: [...new Set(value.dependency_hashes)].sort(),
    counterexample_refs: orderedRefs(value.counterexample_refs), artifact_refs: orderedRefs(value.artifact_refs), retry_conditions: orderedStrings(value.retry_conditions) };
}
export function createFailureIndex(runtime: ProjectRuntime, options: FailureIndexOptions): FailureIndex {
  if (typeof options?.authorizeArtifact !== "function") throw new Error("Failure index requires a service-owned artifact visibility callback");
  const store = runtime.store, events = createResearchEventStore(runtime);
  function assertOwner(): void {
    if (getAcquiredProjectRuntime(runtime.root) !== runtime || runtime.referenceCount < 1) fail("RESEARCH_OWNER_REQUIRED", "Failure index requires its acquired runtime");
  }
  function readRecord(row: Record<string, unknown>): FailureRecord {
    const failure = parse(failureMemorySchema, JSON.parse(String(row.failure_json)));
    if (failure.failure_id !== row.failure_id || hash(failure.scope) !== row.scope_hash || failure.route_fingerprint !== row.fingerprint) fail("FAILURE_INDEX_CORRUPT", "Failure record disagrees with its indexed identity");
    const task = store.getTask(failure.created_by_task_id);
    if (!task) fail("FAILURE_TASK_NOT_FOUND", "Failure source task no longer exists");
    assertProjectReadable(runtime.root, undefined, task.campaign_id);
    return { failure, sha256: hash(failure) };
  }
  function validateReference(taskId: string, scope: ScopeBinding, ref: ArtifactPointer): void {
    if (options.authorizeArtifact(taskId, ref, scope) !== true) fail("FAILURE_ARTIFACT_DENIED", "Artifact is outside the service-authorized failure scope");
    const registered = listArtifactRefs(runtime.root).find(value => value.id === ref.artifact_id);
    const task = store.getTask(taskId), project = task ? store.getCampaign(task.campaign_id)?.project_id : undefined;
    const expected = `.comath/artifacts/sha256/${ref.sha256.slice(0, 2)}/${ref.sha256}`;
    if (!registered || registered.sha256 !== ref.sha256 || registered.path.replace(/\\/g, "/") !== expected || project && registered.project_id !== project) fail("FAILURE_ARTIFACT_INVALID", "Failure artifact metadata or hash does not match registered CAS");
    try {
      const path = resolveProjectCommitPath(runtime.root, expected), fd = openSync(path, "r"), digest = createHash("sha256"), chunk = Buffer.alloc(65536);
      let bytes = 0;
      try { let count: number; while ((count = readSync(fd, chunk, 0, chunk.length, null)) > 0) { digest.update(chunk.subarray(0, count)); bytes += count; } }
      finally { closeSync(fd); }
      if (digest.digest("hex") !== ref.sha256 || bytes !== registered.size_bytes) fail("FAILURE_ARTIFACT_INVALID", "Failure artifact CAS bytes are corrupt");
    } catch { fail("FAILURE_ARTIFACT_INVALID", "Failure artifact CAS is missing, unsafe or corrupt"); }
  }
  function sourceTask(failure: FailureMemory) {
    const task = store.getTask(failure.created_by_task_id);
    if (!task) fail("FAILURE_TASK_NOT_FOUND", "Failure must reference an existing source task");
    assertProjectReadable(runtime.root, undefined, task.campaign_id);
    if (hash(task.scope) !== hash(failure.scope)) fail("FAILURE_SCOPE_MISMATCH", "Failure does not belong to the source task scope");
    if (normalizeText(task.problem_slice) !== failure.problem_slice || normalizeText(task.method_family) !== failure.method_family) fail("FAILURE_ROUTE_MISMATCH", "Failure route fields do not match its source task");
    const expected = fingerprintRoute({ scope: failure.scope, problem_slice: failure.problem_slice, method_family: failure.method_family,
      question: task.question, hypothesis: task.hypothesis, normalized_assumptions: failure.normalized_assumptions, dependency_hashes: failure.dependency_hashes });
    if (failure.route_fingerprint !== expected) fail("FAILURE_FINGERPRINT_MISMATCH", "Failure fingerprint does not match the persisted task route");
    return task;
  }
  function recordFailure(input: FailureMemory): FailureRecord {
    assertOwner(); const failure = normalizedFailure(input); sourceTask(failure);
    for (const ref of orderedRefs([...failure.artifact_refs, ...failure.counterexample_refs])) validateReference(failure.created_by_task_id, failure.scope, ref);
    for (const dependency of failure.dependency_hashes) {
      const registered = listArtifactRefs(runtime.root).filter(ref => ref.sha256 === dependency)
        .find(ref => options.authorizeArtifact(failure.created_by_task_id, { artifact_id: ref.id, sha256: ref.sha256 }, failure.scope) === true);
      if (!registered) fail("FAILURE_ARTIFACT_INVALID", "Dependency hash has no authorized registered artifact");
      validateReference(failure.created_by_task_id, failure.scope, { artifact_id: registered.id, sha256: registered.sha256 });
    }
    return store.transaction(() => {
      const task = sourceTask(failure), existing = store.get("SELECT * FROM failures WHERE failure_id=?", failure.failure_id);
      if (existing) {
        const saved = readRecord(existing);
        if (saved.sha256 !== hash(failure)) fail("FAILURE_ID_CONFLICT", "Failure ID is already bound to different immutable facts");
        return saved;
      }
      const indexed = store.get("SELECT * FROM failures WHERE scope_hash=? AND fingerprint=?", hash(failure.scope), failure.route_fingerprint);
      if (indexed) {
        const saved = readRecord(indexed);
        const facts = (value: FailureMemory) => { const { failure_id: _id, created_by_task_id: _task, ...rest } = value; return rest; };
        if (hash(facts(saved.failure)) !== hash(facts(failure))) fail("FAILURE_ROUTE_CONFLICT", "Exact route already has different failure facts; preserve its canonical history");
        return saved;
      }
      store.run("INSERT INTO failures(failure_id,scope_hash,fingerprint,failure_json,retry_conditions_json,superseding_evidence_refs) VALUES (?,?,?,?,?,'[]')",
        failure.failure_id, hash(failure.scope), failure.route_fingerprint, canonicalJson(failure), JSON.stringify(failure.retry_conditions));
      const result = { failure, sha256: hash(failure) };
      events.appendEvent({ campaign_id: task.campaign_id, task_id: task.task_id, generation: task.generation, type: "FailureRecorded", actor: "service:failure-index",
        payload: { failure_id: failure.failure_id, failure_sha256: result.sha256, route_fingerprint: failure.route_fingerprint, proof_authority: "none" } });
      return result;
    });
  }
  function findFailedRoutes(input: FindFailedRoutesInput): FailedRouteMatch[] {
    assertOwner(); const scope = parse(scopeBindingSchema, input.scope), limit = input.limit ?? 100;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 200) fail("FAILURE_INPUT_INVALID", "Failure query limit must be 1..200");
    const route = input.route ? normalizedRoute(input.route) : undefined;
    if (route && hash(route.scope) !== hash(scope)) fail("FAILURE_SCOPE_MISMATCH", "Route and query scopes differ");
    const fingerprint = route ? fingerprintRoute(route) : undefined;
    const clauses = ["scope_hash=?"], params: (string | number)[] = [hash(scope)];
    if (input.problem_slice !== undefined) { clauses.push("json_extract(failure_json,'$.problem_slice')=?"); params.push(normalizeText(input.problem_slice)); }
    if (input.method_family !== undefined) { clauses.push("json_extract(failure_json,'$.method_family')=?"); params.push(normalizeText(input.method_family)); }
    params.push(fingerprint ?? "", limit);
    return store.all(`SELECT * FROM failures WHERE ${clauses.join(" AND ")} ORDER BY CASE WHEN fingerprint=? THEN 0 ELSE 1 END,failure_id LIMIT ?`, ...params)
      .map(row => ({ ...readRecord(row), match: row.fingerprint === fingerprint ? "exact" as const : "advisory" as const }));
  }
  function checkRetryConditions(input: CheckRetryInput): RetryDecision {
    assertOwner(); parse(id, input.task_id); const route = normalizedRoute(input.route), fingerprint = fingerprintRoute(route);
    const evidence = orderedRefs(parse(references, input.new_evidence_refs ?? []));
    const task = store.getTask(input.task_id);
    if (task) {
      assertProjectReadable(runtime.root, undefined, task.campaign_id);
      if (hash(task.scope) !== hash(route.scope)) fail("FAILURE_SCOPE_MISMATCH", "Retry route does not match the target task scope");
    }
    for (const ref of evidence) validateReference(input.task_id, route.scope, ref);
    const row = store.get("SELECT * FROM failures WHERE scope_hash=? AND fingerprint=?", hash(route.scope), fingerprint);
    const base: RetryDecision = { allowed: true, reason: "no_exact_failure", route_fingerprint: fingerprint, blocking_failure_ids: [], matched_failure_ids: [],
      new_evidence_refs: [], satisfied_conditions: [], unsatisfied_conditions: [] };
    if (!row) return base;
    const { failure } = readRecord(row);
    const known = new Set([...failure.artifact_refs, ...failure.counterexample_refs].map(ref => ref.sha256).concat(failure.dependency_hashes));
    const source = store.getTask(failure.created_by_task_id);
    if (!source) fail("FAILURE_TASK_NOT_FOUND", "Failure source task no longer exists");
    const baseline = new Set(source.input_refs.map(ref => ref.sha256));
    const fresh = evidence.filter(ref => !known.has(ref.sha256) && !baseline.has(ref.sha256));
    const satisfied: string[] = [], unsatisfied: string[] = [];
    for (const condition of failure.retry_conditions) {
      if (options.verifyRetryCondition?.(failure, condition, evidence, input.task_id) === true) satisfied.push(condition);
      else unsatisfied.push(condition);
    }
    const conditionsSatisfied = failure.retry_conditions.length > 0 && unsatisfied.length === 0;
    const allowed = fresh.length > 0 || conditionsSatisfied;
    return { ...base, allowed, reason: fresh.length ? "new_evidence" : conditionsSatisfied ? "conditions_satisfied" : "blocked_exact_failure",
      blocking_failure_ids: allowed ? [] : [failure.failure_id], matched_failure_ids: [failure.failure_id], new_evidence_refs: fresh,
      satisfied_conditions: satisfied, unsatisfied_conditions: unsatisfied };
  }
  function toGraphPatchProposal(failureId: string, input: FailureGraphProposalInput): GraphPatch {
    assertOwner(); const row = store.get("SELECT * FROM failures WHERE failure_id=?", parse(id, failureId));
    if (!row) fail("FAILURE_NOT_FOUND", "Failure record does not exist");
    const saved = readRecord(row), task = store.getTask(saved.failure.created_by_task_id)!;
    const projectId = store.getCampaign(task.campaign_id)?.project_id;
    const timestamp = new Date(runtime.clock.now()).toISOString();
    const payload = { failure_id: saved.failure.failure_id, failure_sha256: saved.sha256, scope_hash: hash(saved.failure.scope),
      route_fingerprint: saved.failure.route_fingerprint, proof_authority: "none", source: "research_failure_index" };
    return graphPatchSchema.parse({ patch_id: input.patch_id, project_id: projectId, source_workstream_id: input.source_workstream_id,
      state: "proposed", provenance: { created_by: input.created_by, created_at: timestamp },
      new_nodes: [{ id: input.node_id, project_id: projectId, type: "FailureRoute", title: `Failed route: ${saved.failure.method_family} / ${saved.failure.problem_slice}`,
        payload, payload_hash: hash(payload), created_at: timestamp, updated_at: timestamp }],
      new_edges: [], updated_nodes: [], candidate_conflicts: [], warnings: ["FailureMemory is research evidence, not mathematical proof authority."],
      apply_preconditions: ["Review and accept this proposal through the existing GraphPatch apply path."] });
  }
  return { recordFailure, findFailedRoutes, checkRetryConditions, toGraphPatchProposal };
}
