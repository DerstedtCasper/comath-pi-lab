import { createHash } from "node:crypto";
import { closeSync, openSync, readSync } from "node:fs";
import { ComathError } from "../errors.js";
import { listArtifactRefs } from "../artifacts/store.js";
import { canonicalJson } from "../verification/runner-contracts.js";
import { assertProjectReadable, resolveProjectCommitPath } from "./project-commit.js";
import { failureMemorySchema, fingerprintRoute, type FailureMemory, type FailureIndexOptions, type RouteFingerprintInput } from "./failure-index.js";
import { artifactPointerSchema, type ArtifactPointer, type ResearchTask } from "./research-schemas.js";
import type { ProjectRuntime } from "./project-runtime.js";

export type HardBlockerClassifier = (failure: Readonly<FailureMemory>, source: Readonly<ResearchTask>) => readonly ArtifactPointer[];
export type HardBlockerPolicyOptions = Pick<FailureIndexOptions, "authorizeArtifact" | "verifyRetryCondition"> & {
  /** Host semantic classification only. Returned refs must already belong to this FailureMemory.
   * Default: explicit counterexample_refs for counterexample mode, never generic literature refs. */
  classifyHardBlocker?: HardBlockerClassifier;
};
export type SharedBlocker = { cluster_id: string; evidence_ref: ArtifactPointer; failure_mode: FailureMemory["failure_mode"];
  distinct_task_count: number; task_ids: string[]; failure_ids: string[] };
export type HardBlockerDecision = { allowed: boolean; requires_synthesis: boolean; blocking_failure_ids: string[];
  distinct_task_count: number; clusters: SharedBlocker[]; proof_authority: "none" };
export type HardBlockerInspection = { blocked: boolean; clusters: SharedBlocker[]; blocking_failure_ids: string[]; proof_authority: "none" };
const hash = (value: unknown) => createHash("sha256").update(canonicalJson(value)).digest("hex");
const hardModes = new Set(["counterexample", "contradictory_assumptions", "computation_invalid"]);
const normalize = (value: string) => value.replace(/\r\n?/g, "\n").trim();
function fail(code: string): never { throw new ComathError(code, { code, statusCode: 409 }); }
function normalizedFacts(failure: FailureMemory) {
  const strings = (values: string[]) => [...new Set(values.map(normalize))].sort();
  const refs = (values: ArtifactPointer[]) => [...new Set(values.map(ref => `${ref.artifact_id}:${ref.sha256}`))].sort();
  return { scope: failure.scope, problem_slice: normalize(failure.problem_slice), method_family: normalize(failure.method_family),
    route_fingerprint: failure.route_fingerprint, failure_mode: failure.failure_mode,
    normalized_assumptions: strings(failure.normalized_assumptions), dependency_hashes: strings(failure.dependency_hashes),
    counterexample_refs: refs(failure.counterexample_refs), artifact_refs: refs(failure.artifact_refs), retry_conditions: strings(failure.retry_conditions) };
}

/** A conservative admission heuristic over explicit shared evidence, not a semantic theorem
 * failure detector. A streak is distinct unresolved task sources, reset only by host-verified
 * resolution; unrelated events, renamed questions and model-supplied flags do not reset it. */
export function createHardBlockerPolicy(runtime: ProjectRuntime, options: HardBlockerPolicyOptions) {
  function inspect(task: ResearchTask, newEvidenceRefs: readonly ArtifactPointer[] = task.input_refs): HardBlockerInspection {
    const inputRefs = artifactPointerSchema.array().max(100).parse(newEvidenceRefs);
    assertProjectReadable(runtime.root, undefined, task.campaign_id);
    const project = runtime.store.getCampaign(task.campaign_id)?.project_id;
    if (!project) fail("BLOCKER_CAMPAIGN_MISSING");
    const registered = listArtifactRefs(runtime.root), checked = new Set<string>();
    function evidence(source: ResearchTask, ref: ArtifactPointer): void {
      if (options.authorizeArtifact(source.task_id, ref, source.scope) !== true) fail("BLOCKER_EVIDENCE_DENIED");
      const key = `${ref.artifact_id}:${ref.sha256}`;
      if (checked.has(key)) return;
      const record = registered.find(value => value.id === ref.artifact_id && value.sha256 === ref.sha256 && value.project_id === project);
      const path = `.comath/artifacts/sha256/${ref.sha256.slice(0, 2)}/${ref.sha256}`;
      if (!record || record.path.replace(/\\/g, "/") !== path) fail("BLOCKER_EVIDENCE_INVALID");
      let fd: number | undefined;
      try {
        fd = openSync(resolveProjectCommitPath(runtime.root, path), "r");
        const bytes = Buffer.alloc(65536), digest = createHash("sha256"); let total = 0, count: number;
        while ((count = readSync(fd, bytes, 0, bytes.length, null)) > 0) { digest.update(bytes.subarray(0, count)); total += count; }
        if (digest.digest("hex") !== ref.sha256 || total !== record.size_bytes) fail("BLOCKER_EVIDENCE_INVALID");
      } catch { fail("BLOCKER_EVIDENCE_INVALID"); }
      finally { if (fd !== undefined) closeSync(fd); }
      checked.add(key);
    }
    type Member = { failure: FailureMemory; source: ResearchTask };
    const groups = new Map<string, { ref: ArtifactPointer; mode: FailureMemory["failure_mode"]; members: Member[] }>();
    const rows = runtime.store.all("SELECT command_id,request_sha256,response_json FROM commands WHERE principal_id='service:worker-failure' AND status='committed' ORDER BY rowid");
    for (const row of rows) {
      const receipt = JSON.parse(String(row.response_json)) as { failure?: unknown; sha256?: string; source_failure?: unknown; source_generation?: number };
      const saved = failureMemorySchema.safeParse(receipt.failure), submitted = failureMemorySchema.safeParse(receipt.source_failure ?? receipt.failure);
      if (!saved.success || !submitted.success) fail("BLOCKER_PROVENANCE_INVALID");
      const failure = saved.data, sourceFailure = submitted.data;
      if (!hardModes.has(failure.failure_mode) || hash(failure.scope) !== hash(task.scope) || normalize(failure.problem_slice) !== normalize(task.problem_slice)) continue;
      const source = runtime.store.getTask(sourceFailure.created_by_task_id);
      if (!source || source.campaign_id !== task.campaign_id) continue;
      const generation = receipt.source_generation ?? source.generation;
      if (!Number.isSafeInteger(generation) || generation < 1 || generation > source.generation
        || !String(row.command_id).startsWith(`worker-failure:${source.task_id}:g${generation}:`)
        || hash(sourceFailure) !== row.request_sha256 || hash(failure) !== receipt.sha256
        || hash(normalizedFacts(failure)) !== hash(normalizedFacts(sourceFailure))
        || hash(source.scope) !== hash(failure.scope)
        || fingerprintRoute({ scope: source.scope, question: source.question, hypothesis: source.hypothesis, method_family: source.method_family,
          problem_slice: source.problem_slice, normalized_assumptions: failure.normalized_assumptions, dependency_hashes: failure.dependency_hashes }) !== failure.route_fingerprint) fail("BLOCKER_PROVENANCE_INVALID");
      const stored = runtime.store.get("SELECT * FROM failures WHERE failure_id=?", failure.failure_id);
      if (!stored || hash(JSON.parse(String(stored.failure_json))) !== receipt.sha256 || stored.scope_hash !== hash(failure.scope) || stored.fingerprint !== failure.route_fingerprint) fail("BLOCKER_PROVENANCE_INVALID");
      const events = runtime.store.all("SELECT * FROM events WHERE campaign_id=? AND task_id=? AND type='FailureRecorded' AND actor='service:failure-index' AND json_extract(payload_json,'$.failure_id')=?", task.campaign_id, failure.created_by_task_id, failure.failure_id);
      if (!events.some(event => { const payload = JSON.parse(String(event.payload_json)); return event.payload_sha256 === hash(payload)
        && payload.failure_sha256 === receipt.sha256 && payload.route_fingerprint === failure.route_fingerprint; })) fail("BLOCKER_PROVENANCE_INVALID");
      const chosen = options.classifyHardBlocker ? options.classifyHardBlocker(failure, source) : failure.failure_mode === "counterexample" ? failure.counterexample_refs : [];
      if (!Array.isArray(chosen) || chosen.length > 100) fail("BLOCKER_CLASSIFICATION_INVALID");
      for (const rawRef of chosen) {
        const ref = artifactPointerSchema.parse(rawRef);
        if (![...failure.artifact_refs, ...failure.counterexample_refs].some(value => value.artifact_id === ref.artifact_id && value.sha256 === ref.sha256)) fail("BLOCKER_CLASSIFICATION_INVALID");
        evidence(source, ref);
        const key = hash({ campaign_id: task.campaign_id, scope: task.scope, problem_slice: normalize(task.problem_slice), mode: failure.failure_mode, sha256: ref.sha256 });
        const group = groups.get(key) ?? { ref, mode: failure.failure_mode, members: [] };
        group.members.push({ failure, source }); groups.set(key, group);
      }
    }
    const clusters: SharedBlocker[] = [];
    for (const [clusterId, group] of groups) {
      const taskIds = [...new Set(group.members.map(member => member.source.task_id))].sort();
      const failures = [...new Map(group.members.map(member => [member.failure.failure_id, member.failure])).values()];
      // Fresh bytes are necessary context at most, never sufficient evidence of resolution.
      for (const ref of inputRefs) evidence(task, ref);
      const resolved = failures.every(failure => failure.retry_conditions.length > 0 && failure.retry_conditions.every(condition =>
        options.verifyRetryCondition?.(failure, condition, inputRefs, task.task_id) === true));
      if (resolved) continue;
      clusters.push({ cluster_id: clusterId, evidence_ref: group.ref, failure_mode: group.mode, distinct_task_count: taskIds.length,
        task_ids: taskIds, failure_ids: failures.map(value => value.failure_id).sort() });
    }
    return { blocked: clusters.length > 0, clusters, blocking_failure_ids: [...new Set(clusters.flatMap(cluster => cluster.failure_ids))].sort(), proof_authority: "none" };
  }
  function check(task: ResearchTask, route: RouteFingerprintInput): HardBlockerDecision {
    if (hash(route.scope) !== hash(task.scope) || normalize(route.problem_slice) !== normalize(task.problem_slice)) fail("BLOCKER_SCOPE_MISMATCH");
    const clusters = inspect(task).clusters.filter(cluster => cluster.distinct_task_count >= 10);
    const blocked = clusters.length > 0;
    return { allowed: !blocked || task.kind === "synthesize", requires_synthesis: blocked,
      blocking_failure_ids: [...new Set(clusters.flatMap(cluster => cluster.failure_ids))].sort(),
      distinct_task_count: Math.max(0, ...clusters.map(cluster => cluster.distinct_task_count)), clusters, proof_authority: "none" as const };
  }
  return { check, inspect };
}
