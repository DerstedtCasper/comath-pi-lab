import { createHash, randomUUID } from "node:crypto";
import { readFile, mkdir, writeFile, unlink, stat } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";
import { ComathError } from "../errors.js";
import { listArtifactRefs } from "../artifacts/store.js";
import { canonicalJson } from "../verification/runner-contracts.js";
import { createCheckpointStore } from "./checkpoint-store.js";
import { assertProjectReadable, resolveProjectCommitPath, withProjectCommit } from "./project-commit.js";
import { prepareArtifact, commitArtifactReference } from "./research-artifacts.js";
import type { ProjectRuntime } from "./project-runtime.js";
import { artifactPointerSchema, type ArtifactPointer, type ResearchTask, type ScopeBinding } from "./research-schemas.js";

const kind = z.enum(["approved_lock", "assumption_ledger", "dependency", "checkpoint", "failure", "sibling", "statement", "definition", "public_lemma", "tool_instructions", "other"]);
const sourceSchema = z.strictObject({ ref: artifactPointerSchema, kind, source: z.string().min(1).max(200) });
export type ContextSource = z.infer<typeof sourceSchema>;
export type ContextFailureRoute = { failure_id: string; sha256: string; route_fingerprint: string; failure_mode: string;
  retry_conditions: string[]; match: "exact" | "advisory" };
export type ContextPackPolicy = {
  byte_cap: number; visibility: "task" | "blind";
  /** Host-selected sources and authorization; never deserialize this policy from worker input. */
  mandatory: readonly ContextSource[]; selected?: readonly ContextSource[]; lazy?: readonly ContextSource[];
  assumptions: readonly string[];
  statement_brief?: ContextSource;
  failed_routes?: readonly ContextFailureRoute[];
  authorizeArtifact: (task: ResearchTask, ref: ArtifactPointer) => boolean;
};
export type ContextPack = {
  schema_version: "comath.context_pack.v1"; task_id: string; generation: number; scope: ScopeBinding;
  budget: { unit: "utf8_bytes"; limit: number; used: number; token_count: null; tokenizer_available: false; estimate: true };
  objective: { question: string; acceptance: string[] }; charter?: { goal: string; approach_hints: string[]; constraints: string[]; success_criteria: string[]; sha256: string };
  guidance_authority: "strategy_only_not_assumptions_or_evidence" | "redacted_for_blind";
  assumptions?: string[]; assumptions_policy: "complete_host_assumptions" | "included_in_statement_brief";
  required_refs: ArtifactPointer[]; selected_refs: ArtifactPointer[]; lazy_refs: ArtifactPointer[];
  materials: (ContextSource & { content: string })[]; exclusions: string[];
  redaction_policy: "task_scoped" | "blind_statement_only"; proof_authority: "none"; content_sha256: string;
  failure_routes: ContextFailureRoute[];
};
const allowedBlind = new Set<ContextSource["kind"]>(["statement", "definition", "public_lemma", "tool_instructions"]);
const priority: Record<ContextSource["kind"], number> = { approved_lock: 0, assumption_ledger: 1, statement: 2, definition: 3,
  public_lemma: 4, dependency: 5, checkpoint: 6, failure: 7, sibling: 8, tool_instructions: 9, other: 10 };
const hash = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex");
const key = (ref: ArtifactPointer) => `${ref.artifact_id}:${ref.sha256}`;
function fail(code: string, message: string): never { throw new ComathError(message, { code, statusCode: 409 }); }
function seal(pack: ContextPack): ContextPack {
  for (let pass = 0; pass < 5; pass++) {
    const { content_sha256: _digest, ...unsigned } = pack;
    pack.content_sha256 = hash(canonicalJson(unsigned));
    const used = Buffer.byteLength(canonicalJson(pack), "utf8");
    if (used === pack.budget.used) return pack;
    pack.budget.used = used;
  }
  throw new Error("Context size did not stabilize");
}

/** Required material is never truncated. Optional content becomes a lazy verified reference. */
export async function buildContextPack(runtime: ProjectRuntime, taskId: string, generation: number, policy: ContextPackPolicy): Promise<ContextPack> {
  const task = runtime.store.getTask(taskId);
  if (!task || !Number.isSafeInteger(generation) || generation < 1 || (generation !== task.generation && !(task.status === "queued" && generation === task.generation + 1))) fail("CONTEXT_TASK_MISMATCH", "Context generation does not match its task");
  assertProjectReadable(runtime.root, undefined, task.campaign_id);
  if (!Number.isSafeInteger(policy.byte_cap) || policy.byte_cap < 1024 || policy.byte_cap > 16 * 1024 * 1024) fail("CONTEXT_BUDGET_INVALID", "Context needs an explicit bounded host byte cap");
  if (!Array.isArray(policy.assumptions) || policy.assumptions.some(value => typeof value !== "string") || typeof policy.authorizeArtifact !== "function") fail("CONTEXT_POLICY_INVALID", "Context requires complete host assumptions and visibility policy");
  const campaign = runtime.store.getCampaign(task.campaign_id)!;
  const mandatory = policy.mandatory.map(value => sourceSchema.parse(value));
  const selected = (policy.selected ?? []).map(value => sourceSchema.parse(value));
  const lazy = (policy.lazy ?? []).map(value => sourceSchema.parse(value));
  let parentHead: string | undefined;
  if (policy.visibility === "blind") {
    if (!policy.statement_brief || policy.statement_brief.kind !== "statement") fail("CONTEXT_BLIND_BRIEF_REQUIRED", "Blind reproduction requires a host-selected statement-only brief");
    mandatory.unshift(sourceSchema.parse(policy.statement_brief));
    if ([...mandatory, ...selected, ...lazy].some(source => !allowedBlind.has(source.kind))) fail("CONTEXT_BLIND_SOURCE_DENIED", "Blind context cannot contain checkpoint, proof, failure, or sibling material");
  } else {
    if (task.scope.kind === "formal") {
      const scope = task.scope;
      if (!mandatory.some(source => source.kind === "approved_lock" && source.ref.sha256 === scope.formal_spec_sha256)
        || !mandatory.some(source => source.kind === "assumption_ledger" && source.ref.sha256 === scope.ledger_sha256)) fail("CONTEXT_APPROVED_SCOPE_REQUIRED", "Formal context requires the exact approved lock and assumption ledger bytes");
    } else if (task.scope.charter_sha256 !== campaign.charter.sha256) fail("CONTEXT_SCOPE_MISMATCH", "Task charter binding does not match the campaign");
    const checkpoints = createCheckpointStore(runtime, { authorizeArtifact: (_attempt, ref) => policy.authorizeArtifact(task, ref) });
    const resume = checkpoints.getResumeMaterial(task.task_id);
    if (resume) mandatory.push({ ref: resume.receipt.artifact_ref, kind: "checkpoint", source: "accepted_task_checkpoint" });
    if (task.parent_task_id) {
      const parent = runtime.store.getTask(task.parent_task_id);
      if (!parent || parent.campaign_id !== task.campaign_id) fail("CONTEXT_PARENT_MISMATCH", "Parent context is outside the campaign");
      parentHead = parent.checkpoint_head;
      const parentResume = checkpoints.getResumeMaterial(parent.task_id);
      if (parentResume) mandatory.push({ ref: parentResume.receipt.artifact_ref, kind: "checkpoint", source: "accepted_parent_checkpoint" });
    }
    lazy.push(...task.input_refs.map(ref => ({ ref, kind: "other" as const, source: "task_input" })));
  }
  const refs = listArtifactRefs(runtime.root), seen = new Set<string>();
  const normalize = (sources: ContextSource[]) => sources.sort((a, b) => priority[a.kind] - priority[b.kind] || key(a.ref).localeCompare(key(b.ref))).filter(source => {
    if (seen.has(key(source.ref))) return false; seen.add(key(source.ref)); return true;
  });
  const requiredSources = normalize(mandatory), selectedSources = normalize(selected), lazySources = normalize(lazy);
  const read = async (source: ContextSource): Promise<string> => {
    if (!policy.authorizeArtifact(task, source.ref)) fail("CONTEXT_ARTIFACT_DENIED", "Source is outside the task visibility policy");
    const ref = refs.find(ref => ref.id === source.ref.artifact_id && ref.sha256 === source.ref.sha256 && ref.project_id === campaign.project_id);
    if (!ref) fail("CONTEXT_ARTIFACT_MISSING", "Context source has no matching registered artifact hash");
    const path = resolveProjectCommitPath(runtime.root, ref.path), info = await stat(path);
    if (!info.isFile() || info.size > 16 * 1024 * 1024) fail("CONTEXT_SOURCE_TOO_LARGE", "Context source requires a bounded service excerpt");
    const bytes = await readFile(path);
    if (hash(bytes) !== source.ref.sha256) fail("CONTEXT_ARTIFACT_CORRUPT", "Context source bytes failed hash verification");
    try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
    catch { fail("CONTEXT_SOURCE_NOT_TEXT", "Context source requires a text extraction artifact"); }
  };
  const blind = policy.visibility === "blind";
  const pack: ContextPack = { schema_version: "comath.context_pack.v1", task_id: task.task_id, generation, scope: task.scope,
    budget: { unit: "utf8_bytes", limit: policy.byte_cap, used: 0, token_count: null, tokenizer_available: false, estimate: true },
    objective: blind ? { question: "Independently reproduce the supplied statement using only the whitelisted prerequisites.", acceptance: ["Report a reproducible argument or explicit obstruction without original proof access"] }
      : { question: task.question, acceptance: [...task.acceptance] },
    ...(!blind ? { charter: campaign.charter } : {}), guidance_authority: blind ? "redacted_for_blind" : "strategy_only_not_assumptions_or_evidence",
    ...(!blind ? { assumptions: [...policy.assumptions] } : {}), assumptions_policy: blind ? "included_in_statement_brief" : "complete_host_assumptions",
    required_refs: requiredSources.map(source => source.ref), selected_refs: [],
    lazy_refs: [...selectedSources, ...lazySources].map(source => source.ref), materials: [], exclusions: blind ? [] : [...task.exclusions],
    redaction_policy: blind ? "blind_statement_only" : "task_scoped", proof_authority: "none", content_sha256: "0".repeat(64),
    failure_routes: blind ? [] : structuredClone([...(policy.failed_routes ?? [])]) };
  for (const source of requiredSources) pack.materials.push({ ...source, content: await read(source) });
  seal(pack);
  if (pack.budget.used > policy.byte_cap) fail("CONTEXT_REQUIRED_OVERFLOW", "Required context exceeds the host byte budget; split the task instead of dropping assumptions");
  for (const source of selectedSources) {
    const content = await read(source), proposed = structuredClone(pack);
    proposed.materials.push({ ...source, content }); proposed.selected_refs.push(source.ref);
    proposed.lazy_refs = proposed.lazy_refs.filter(ref => key(ref) !== key(source.ref));
    seal(proposed);
    if (proposed.budget.used <= policy.byte_cap) Object.assign(pack, proposed);
  }
  for (const source of lazySources) await read(source);
  const current = runtime.store.getTask(taskId);
  if (!current || current.generation !== task.generation || current.checkpoint_head !== task.checkpoint_head || canonicalJson(current.scope) !== canonicalJson(task.scope)) fail("CONTEXT_CHANGED", "Task context changed while materializing; rebuild from current state");
  if (!blind && task.parent_task_id && runtime.store.getTask(task.parent_task_id)?.checkpoint_head !== parentHead) fail("CONTEXT_CHANGED", "Parent checkpoint changed while building context");
  return seal(pack);
}

export async function materializeContextPack(runtime: ProjectRuntime, pack: ContextPack): Promise<ArtifactPointer> {
  const task = runtime.store.getTask(pack.task_id);
  if (!task || task.generation !== pack.generation || canonicalJson(task.scope) !== canonicalJson(pack.scope)) fail("CONTEXT_TASK_MISMATCH", "Materialized context belongs to a different generation");
  const campaign = runtime.store.getCampaign(task.campaign_id)!;
  const sealed = seal(structuredClone(pack));
  if (canonicalJson(sealed) !== canonicalJson(pack) || pack.budget.used > pack.budget.limit) fail("CONTEXT_PACK_INVALID", "Context content hash or byte accounting is invalid");
  const bytes = canonicalJson(pack), temporary = resolveProjectCommitPath(runtime.root, `.tmp/comath/context/${randomUUID()}.json`);
  await mkdir(dirname(temporary), { recursive: true }); await writeFile(temporary, bytes, { flag: "wx", flush: true });
  try {
    const prepared = await prepareArtifact({ projectRoot: runtime.root, project_id: campaign.project_id, source_path: temporary, kind: "other", actor: "service:context" });
    const ref = withProjectCommit(runtime.root, { operation_id: `context:${task.task_id}:g${pack.generation}:${prepared.sha256}`, campaign_id: task.campaign_id,
      request: { task_id: task.task_id, generation: pack.generation, sha256: prepared.sha256 } }, () => {
        const current = runtime.store.getTask(pack.task_id);
        if (!current || current.generation !== pack.generation || canonicalJson(current.scope) !== canonicalJson(pack.scope)) fail("CONTEXT_CHANGED", "Context generation changed before its artifact commit");
        return commitArtifactReference(runtime.root, prepared);
      });
    return { artifact_id: ref.id, sha256: ref.sha256 };
  } finally { await unlink(temporary); }
}
