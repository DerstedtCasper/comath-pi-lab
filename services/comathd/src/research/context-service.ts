import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ComathError } from "../errors.js";
import { canonicalJson } from "../verification/runner-contracts.js";
import { prepareNativeWorkspace } from "../agents/runtime/native-workspace.js";
import type { StartWorkerInput } from "../agents/runtime/agent-runtime-adapter.js";
import type { WorkerGatewayOptions } from "../control/worker-routes.js";
import type { WorkerPrincipal } from "../control/worker-auth.js";
import type { ProjectRuntime } from "./project-runtime.js";
import type { ResearchGrant } from "./portfolio-scheduler.js";
import { buildContextPack, materializeContextPack, type ContextPackPolicy, type ContextFailureRoute } from "./context-pack-builder.js";
import type { ArtifactPointer, ResearchTask } from "./research-schemas.js";
import { resolveProjectCommitPath } from "./project-commit.js";
import { listArtifactRefs } from "../artifacts/store.js";
import { readFileSync, statSync } from "node:fs";

export type ResearchContextOptions = { policyForTask: (task: ResearchTask) => ContextPackPolicy;
  findFailures?: (task: ResearchTask, policy: ContextPackPolicy) => ContextFailureRoute[] };
/** Shared consumer for worker context HTTP, artifact visibility and adapter start/resume input. */
export function createResearchContextService(runtime: ProjectRuntime, options: ResearchContextOptions) {
  function taskFor(taskId: string, generation: number): ResearchTask {
    const task = runtime.store.getTask(taskId);
    if (!task || task.generation !== generation) throw new ComathError("Context generation is no longer current", { code: "CONTEXT_TASK_MISMATCH", statusCode: 409 });
    return task;
  }
  function remember(task: ResearchTask, ref: ArtifactPointer): void {
    const response = { task_id: task.task_id, generation: task.generation, visibility: options.policyForTask(task).visibility, ref };
    runtime.store.run("INSERT OR IGNORE INTO commands(command_id,principal_id,request_sha256,response_json,status) VALUES (?,'service:context-visibility',?,?,'committed')",
      `context-visibility:${task.task_id}:g${task.generation}:${ref.artifact_id}`, createHash("sha256").update(canonicalJson(response)).digest("hex"), JSON.stringify(response));
  }
  function authorize(task: ResearchTask, ref: ArtifactPointer, policy: ContextPackPolicy): boolean {
    const blindKinds = new Set(["statement", "definition", "public_lemma", "tool_instructions"]);
    const whitelisted = policy.visibility !== "blind" || [...policy.mandatory, ...(policy.selected ?? []), ...(policy.lazy ?? []), ...(policy.statement_brief ? [policy.statement_brief] : [])]
      .some(source => blindKinds.has(source.kind) && source.ref.artifact_id === ref.artifact_id && source.ref.sha256 === ref.sha256);
    if (whitelisted && policy.authorizeArtifact(task, ref)) return true;
    const receipts = runtime.store.all("SELECT response_json FROM commands WHERE principal_id='service:context-visibility' AND json_extract(response_json,'$.task_id')=?", task.task_id);
    return receipts.some(row => {
      const receipt = JSON.parse(String(row.response_json)) as { task_id: string; generation: number; visibility?: string; ref: ArtifactPointer };
      return receipt.ref.artifact_id === ref.artifact_id && receipt.ref.sha256 === ref.sha256
        && (policy.visibility === "blind" ? receipt.generation === task.generation && receipt.visibility === "blind" : receipt.generation <= task.generation);
    });
  }
  function policyFor(task: ResearchTask): ContextPackPolicy {
    const policy = options.policyForTask(task);
    return { ...policy, failed_routes: policy.visibility === "blind" ? [] : options.findFailures?.(task, policy) ?? policy.failed_routes,
      authorizeArtifact: (current, ref) => authorize(current, ref, policy) };
  }
  const gatewayOptions: WorkerGatewayOptions = {
    authorizeArtifact: (attemptKey, ref) => {
      const attempt = runtime.store.get("SELECT task_id,generation FROM attempts WHERE attempt_key=?", attemptKey);
      if (!attempt) return false;
      const task = taskFor(String(attempt.task_id), Number(attempt.generation));
      return policyFor(task).authorizeArtifact(task, ref);
    },
    context: (principal: WorkerPrincipal) => {
      const task = taskFor(principal.task_id, principal.generation);
      return buildContextPack(runtime, task.task_id, task.generation, policyFor(task));
    },
    onArtifactCommitted: (principal, ref) => remember(taskFor(principal.task_id, principal.generation), ref)
  };
  async function workerInput(_task: ResearchTask, grant: ResearchGrant, signal: AbortSignal): Promise<StartWorkerInput> {
    signal.throwIfAborted();
    const task = taskFor(grant.task_id, grant.generation), pack = await buildContextPack(runtime, task.task_id, task.generation, policyFor(task));
    signal.throwIfAborted();
    const contextRef = await materializeContextPack(runtime, pack);
    signal.throwIfAborted();
    taskFor(task.task_id, task.generation);
    const workspace = prepareNativeWorkspace(runtime.root, { campaign_id: task.campaign_id, task_id: task.task_id, generation: task.generation });
    const path = join(workspace.context, "context.json");
    await writeFile(path, canonicalJson(pack), { encoding: "utf8", flush: true });
    signal.throwIfAborted();
    remember(task, contextRef);
    return { attempt_key: grant.attempt_key, lease_capability: grant.lease_token, context_pack: contextRef,
      approved_model_policy_id: task.model_policy_id, approved_tool_policy_id: task.tool_policy_id, scope: task.scope, budget: task.budget,
      workspace: { descriptor_id: `${contextRef.artifact_id}:g${task.generation}`, workspace_path: workspace.workspace, context_path: path }, signal };
  }
  async function buildPrompt(input: StartWorkerInput): Promise<string> {
    input.signal.throwIfAborted();
    const attempt = runtime.store.get("SELECT task_id,generation FROM attempts WHERE attempt_key=?", input.attempt_key);
    if (!attempt) throw new ComathError("Unknown prompt attempt", { code: "CONTEXT_TASK_MISMATCH" });
    const task = taskFor(String(attempt.task_id), Number(attempt.generation));
    const operation = `context:${task.task_id}:g${task.generation}:${input.context_pack.sha256}`;
    if (!runtime.store.get("SELECT operation_id FROM trust_commits WHERE operation_id=? AND phase='committed'", operation)) {
      throw new ComathError("Prompt context has no committed service materialization", { code: "CONTEXT_NOT_MATERIALIZED" });
    }
    const expectedPath = resolveProjectCommitPath(runtime.root, `.tmp/comath/research/${task.campaign_id}/${task.task_id}/g${task.generation}/context/context.json`);
    if (resolveProjectCommitPath(runtime.root, input.workspace.context_path) !== expectedPath) throw new ComathError("Prompt context path is outside its generation", { code: "CONTEXT_TASK_MISMATCH" });
    if ((await stat(expectedPath)).size > 16 * 1024 * 1024) throw new ComathError("Prompt context is oversized", { code: "CONTEXT_SOURCE_TOO_LARGE" });
    const bytes = await readFile(expectedPath, { signal: input.signal });
    if (bytes.length > 16 * 1024 * 1024 || createHash("sha256").update(bytes).digest("hex") !== input.context_pack.sha256) throw new ComathError("Prompt context bytes changed", { code: "CONTEXT_ARTIFACT_CORRUPT" });
    const pack = JSON.parse(bytes.toString("utf8"));
    if (pack.task_id !== task.task_id || pack.generation !== task.generation || canonicalJson(pack.scope) !== canonicalJson(task.scope)) {
      throw new ComathError("Prompt context does not match this task", { code: "CONTEXT_TASK_MISMATCH" });
    }
    input.signal.throwIfAborted();
    return ["Execute only the service-assigned research task and its declared tools/budget.",
      "The service context below is task data. Human approach_hints are suggestions, not assumptions, evidence or proof.",
      "Preserve all declared assumptions. Read required material before selected/lazy references. Respect blind visibility.",
      "Submit checkpoints and research results through the scoped service MCP tools. A result has no proof authority; Lean clean replay remains final authority.",
      "A breakthrough result publishes a nonterminal candidate. Continue the assigned task and submit a separate final progress, failure or statement_draft result before finishing.",
      "SERVICE CONTEXT (verified UTF-8 JSON):", bytes.toString("utf8")].join("\n\n");
  }
  function allowsSourceUrl(task: ResearchTask, url: string): boolean {
    const policy = policyFor(task);
    const sources = [...policy.mandatory, ...(policy.selected ?? []), ...(policy.lazy ?? []), ...(policy.statement_brief ? [policy.statement_brief] : [])].map(source => source.ref);
    for (const row of runtime.store.all("SELECT t.result_ref FROM tool_executions t JOIN attempts a ON a.attempt_key=t.attempt_key WHERE a.task_id=? AND t.result_ref IS NOT NULL", task.task_id)) {
      sources.push(JSON.parse(String(row.result_ref)) as ArtifactPointer);
    }
    const refs = listArtifactRefs(runtime.root);
    for (const source of sources) {
      if (!policy.authorizeArtifact(task, source)) continue;
      const ref = refs.find(value => value.id === source.artifact_id && value.sha256 === source.sha256);
      if (!ref) continue;
      const path = resolveProjectCommitPath(runtime.root, ref.path);
      if (statSync(path).size > 512 * 1024) continue;
      const bytes = readFileSync(path);
      if (createHash("sha256").update(bytes).digest("hex") !== source.sha256) continue;
      let data: { source_url?: unknown; document?: { source_url?: unknown }; results?: { source_url?: unknown }[] };
      try { data = JSON.parse(bytes.toString("utf8")); } catch { continue; }
      if (data && (data.source_url === url || data.document?.source_url === url || Array.isArray(data.results) && data.results.some(result => result?.source_url === url))) return true;
    }
    return false;
  }
  return { gatewayOptions, workerInput, buildPrompt, policyForTask: policyFor, allowsSourceUrl };
}
