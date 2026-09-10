import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { dirname } from "node:path";
import { ComathError } from "../errors.js";
import { canonicalJson } from "../verification/runner-contracts.js";
import { createLiveWheelExecutors, type LiveWheelConfig, type WheelExecution } from "../adapters/live-wheel-executors.js";
import type { WorkerPrincipal } from "../control/worker-auth.js";
import type { ProjectRuntime } from "./project-runtime.js";
import type { PortfolioScheduler } from "./portfolio-scheduler.js";
import type { ArtifactPointer, ResearchTask } from "./research-schemas.js";
import { assertProjectReadable, resolveProjectCommitPath, stageResearchMutation, withProjectCommit } from "./project-commit.js";
import { prepareArtifact, commitArtifactReference } from "./research-artifacts.js";
import { runResearchSympyDifference, ResearchSympyExecutionError, type ResearchSympyConfig } from "../verification/sympy.js";
import { notifyResearchEventsCommitted } from "./event-store.js";

export type ResearchToolOptions = {
  wheels: LiveWheelConfig;
  allowedTools: (task: ResearchTask) => readonly string[];
  authorizeReaderUrl: (task: ResearchTask, url: string) => boolean;
  onArtifactCommitted?: (principal: WorkerPrincipal, ref: ArtifactPointer) => void;
  timeout_ms?: number;
  sympy?: ResearchSympyConfig;
};
export type ExecuteResearchToolInput = { execution_id: string; attempt: WorkerPrincipal; tool_id: string; args: unknown; signal: AbortSignal; deadline?: number };
type ToolReceipt = { execution_id: string; status: "succeeded" | "failed" | "cancelled"; result_ref?: ArtifactPointer;
  result?: WheelExecution | Awaited<ReturnType<typeof runResearchSympyDifference>>; error_code?: string; proof_authority: "none" };
const hash = (value: unknown) => createHash("sha256").update(canonicalJson(value)).digest("hex");
function fail(code: string, message: string): never { throw new ComathError(message, { code, statusCode: code.endsWith("_UNAVAILABLE") ? 503 : code.endsWith("_DENIED") ? 403 : 409 }); }

/** Service-owned HTTP execution lifecycle; its Map caches live handles, never a second task queue. */
export function createResearchToolExecutor(runtime: ProjectRuntime, scheduler: PortfolioScheduler, options: ResearchToolOptions) {
  const wheels = createLiveWheelExecutors(options.wheels, { now: () => runtime.clock.now() });
  const active = new Map<string, { controller: AbortController; promise: Promise<ToolReceipt>; requestHash: string; attemptKey: string }>();
  let closing: Promise<void> | undefined;
  const timeout = options.timeout_ms ?? 30000;
  if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 120000) throw new Error("Tool timeout must be 1..120000 ms");
  function current(principal: WorkerPrincipal): ResearchTask {
    const task = runtime.store.getTask(principal.task_id), attempt = runtime.store.get("SELECT * FROM attempts WHERE attempt_key=?", principal.attempt_key);
    if (!task || !attempt || task.generation !== principal.generation || task.campaign_id !== principal.campaign_id || attempt.task_id !== task.task_id
      || Number(attempt.generation) !== task.generation || task.status !== "running" || attempt.state !== "running" || attempt.fenced_at
      || attempt.stop_requested_at || Date.parse(String(attempt.expires_at)) <= runtime.clock.now()) fail("RESEARCH_ATTEMPT_FENCED", "Tool needs the current running attempt");
    assertProjectReadable(runtime.root, undefined, task.campaign_id);
    return task;
  }
  function returnReceipt(receipt: ToolReceipt): ToolReceipt {
    if (receipt.status !== "succeeded") fail(receipt.error_code ?? "RESEARCH_TOOL_FAILED", "Tool execution did not succeed");
    return receipt;
  }
  async function run(input: ExecuteResearchToolInput, requestHash: string, controller: AbortController): Promise<ToolReceipt> {
    const task = current(input.attempt), expires = runtime.clock.now() + Math.min(timeout, task.budget.wall_ms);
    const deadline = Math.min(input.deadline ?? expires, expires);
    const commandId = `tool-execution:${input.execution_id}`;
    const abort = () => controller.abort(input.signal.reason);
    input.signal.addEventListener("abort", abort, { once: true });
    if (input.signal.aborted) abort();
    const monitor = setInterval(() => {
      try {
        current(input.attempt);
        const execution = runtime.store.get("SELECT stop_intent FROM tool_executions WHERE execution_id=?", input.execution_id);
        if (execution?.stop_intent || runtime.clock.now() >= deadline) controller.abort(new Error("Tool stop or deadline"));
      } catch { controller.abort(new Error("Attempt is no longer active")); }
    }, 50);
    let registered = false, terminationConfirmed = true, nativeStarted = false;
    try {
      for (;;) {
        controller.signal.throwIfAborted(); current(input.attempt);
        const permit = runtime.store.transaction(() => {
          const existing = runtime.store.get("SELECT state FROM tool_executions WHERE execution_id=?", input.execution_id);
          const count = Number(runtime.store.get("SELECT COUNT(*) AS n FROM tool_executions WHERE attempt_key=? AND state<>'waiting'", input.attempt.attempt_key)?.n ?? 0);
          if ((!existing || existing.state === "waiting") && count >= task.budget.tool_calls) fail("RESEARCH_TOOL_BUDGET_EXHAUSTED", "Task service-tool call budget is exhausted");
          return scheduler.resources.acquireToolPermit({ execution_id: input.execution_id, attempt_key: input.attempt.attempt_key,
            kind: input.tool_id === "computation.sympy_difference" ? "cas" : "retrieval", command_ref: requestHash });
        });
        registered = true;
        if (permit.granted) break;
        await new Promise<void>(resolve => setTimeout(resolve, 25));
      }
      runtime.store.run("UPDATE tool_executions SET state='running',handle_json=? WHERE execution_id=?", JSON.stringify({ runtime_kind: input.tool_id === "computation.sympy_difference" ? "fixed_python_pending" : "http_fetch", service_pid: process.pid, execution_id: input.execution_id }), input.execution_id);
      scheduler.events.appendEvent({ campaign_id: task.campaign_id, task_id: task.task_id, generation: task.generation, type: "ServiceToolStarted", actor: "service:tools",
        payload: { execution_id: input.execution_id, tool_id: input.tool_id, request_sha256: requestHash } });
      const args = input.args as { query: string; limit?: number; source_url: string };
      const context = { signal: controller.signal, deadline };
      let result: ToolReceipt["result"];
      if (input.tool_id === "computation.sympy_difference") {
        terminationConfirmed = false;
        result = await runResearchSympyDifference(input.args, options.sympy!, {
          workspace: resolveProjectCommitPath(runtime.root, `.tmp/comath/research/${task.campaign_id}/${task.task_id}/g${task.generation}/tool-tmp/${input.execution_id}`),
          signal: controller.signal, timeout_ms: Math.max(1, Math.min(timeout, deadline - runtime.clock.now())),
          onStarted: handle => { nativeStarted = true; runtime.store.run("UPDATE tool_executions SET handle_json=? WHERE execution_id=?", JSON.stringify(handle), input.execution_id); }
        });
        terminationConfirmed = result.termination_confirmed;
      } else result = input.tool_id === "retrieval.search" ? await wheels.search(args, context)
        : input.tool_id === "retrieval.read" ? await wheels.read(args, context) : await wheels.query(args, context);
      controller.signal.throwIfAborted(); current(input.attempt);
      const bytes = canonicalJson(result);
      if (Buffer.byteLength(bytes) > 512 * 1024) fail("RESEARCH_TOOL_RESULT_TOO_LARGE", "Result exceeds the bounded worker response contract");
      const path = resolveProjectCommitPath(runtime.root, `.tmp/comath/tool-results/${randomUUID()}.json`);
      await mkdir(dirname(path), { recursive: true }); await writeFile(path, bytes, { flag: "wx", flush: true });
      let receipt: ToolReceipt;
      try {
        const prepared = await prepareArtifact({ projectRoot: runtime.root, project_id: runtime.store.getCampaign(task.campaign_id)!.project_id, source_path: path, kind: "other", actor: "service:tools" });
        receipt = withProjectCommit(runtime.root, { operation_id: commandId, campaign_id: task.campaign_id, request: { requestHash } }, () => {
          controller.signal.throwIfAborted(); current(input.attempt);
          const ref = commitArtifactReference(runtime.root, prepared);
          const receipt: ToolReceipt = { execution_id: input.execution_id, status: "succeeded", result_ref: { artifact_id: ref.id, sha256: ref.sha256 }, result, proof_authority: "none" };
          stageResearchMutation(runtime.root, "UPDATE tool_executions SET result_ref=? WHERE execution_id=?", [JSON.stringify(receipt.result_ref), input.execution_id]);
          const event = { execution_id: input.execution_id, tool_id: input.tool_id, result_ref: receipt.result_ref, proof_authority: "none" };
          stageResearchMutation(runtime.root, "INSERT INTO events(campaign_id,task_id,generation,type,actor,payload_json,payload_sha256,created_at) VALUES (?,?,?,'ServiceToolCompleted','service:tools',?,?,?)",
            [task.campaign_id, task.task_id, task.generation, canonicalJson(event), hash(event), new Date(runtime.clock.now()).toISOString()]);
          return receipt;
        });
      } finally { await unlink(path); }
      options.onArtifactCommitted?.(input.attempt, receipt.result_ref!);
      notifyResearchEventsCommitted(runtime);
      return receipt;
    } catch (cause) {
      if (input.tool_id === "computation.sympy_difference") terminationConfirmed = cause instanceof ResearchSympyExecutionError ? cause.termination_confirmed : !nativeStarted || terminationConfirmed;
      if (!registered) throw cause;
      if (runtime.store.get("SELECT phase FROM trust_commits WHERE operation_id=?", commandId)) throw cause;
      const receipt: ToolReceipt = { execution_id: input.execution_id, status: controller.signal.aborted ? "cancelled" : "failed",
        error_code: controller.signal.aborted ? "RESEARCH_TOOL_CANCELLED" : cause instanceof ComathError ? cause.code : "RESEARCH_TOOL_FAILED", proof_authority: "none" };
      runtime.store.transaction(() => {
        runtime.store.run("INSERT OR IGNORE INTO commands(command_id,principal_id,request_sha256,response_json,status) VALUES (?,'service:research-tools',?,?,'committed')", commandId, requestHash, JSON.stringify(receipt));
        scheduler.events.appendEvent({ campaign_id: task.campaign_id, task_id: task.task_id, generation: task.generation, type: "ServiceToolFailed", actor: "service:tools",
          payload: { execution_id: receipt.execution_id, status: receipt.status, error_code: receipt.error_code!, proof_authority: "none" } });
      });
      return returnReceipt(receipt);
    } finally {
      clearInterval(monitor); input.signal.removeEventListener("abort", abort);
      // HTTP awaits include the body; Python additionally requires an observed process close.
      if (registered && terminationConfirmed) scheduler.resources.releaseToolPermit(input.execution_id, { termination_confirmed: true });
    }
  }
  async function executeResearchTool(input: ExecuteResearchToolInput): Promise<ToolReceipt> {
    if (closing) fail("RESEARCH_TOOLS_CLOSED", "Research tool executor is closing");
    if (!/^[A-Za-z0-9:_-]{1,160}$/.test(input.execution_id)) fail("RESEARCH_TOOL_INVALID", "Invalid execution ID");
    const task = current(input.attempt);
    if (!options.allowedTools(task).includes(input.tool_id)) fail("RESEARCH_TOOL_DENIED", "Tool is outside this task's host policy");
    const configured = input.tool_id === "retrieval.search" ? options.wheels.retrieval_search
      : input.tool_id === "retrieval.read" ? options.wheels.retrieval_read : input.tool_id === "theorem_search.query" ? options.wheels.theorem_search
        : input.tool_id === "computation.sympy_difference" ? options.sympy : undefined;
    if (!configured) fail("RESEARCH_TOOL_UNAVAILABLE", "Tool has no configured live executor");
    if (input.tool_id === "retrieval.read") {
      const url = (input.args as { source_url?: unknown })?.source_url;
      if (typeof url !== "string" || !options.authorizeReaderUrl(task, url)) fail("RESEARCH_SOURCE_DENIED", "Reader source is not in the task's readable references");
    }
    const requestHash = hash({ attempt_key: input.attempt.attempt_key, tool_id: input.tool_id, args: input.args });
    const execution = runtime.store.get("SELECT command_ref FROM tool_executions WHERE execution_id=?", input.execution_id);
    if (execution && execution.command_ref !== requestHash) fail("RESEARCH_TOOL_ID_CONFLICT", "Execution ID refers to another request");
    const commandId = `tool-execution:${input.execution_id}`;
    if (runtime.store.get("SELECT operation_id FROM trust_commits WHERE operation_id=?", commandId)) {
      return withProjectCommit<ToolReceipt>(runtime.root, { operation_id: commandId, campaign_id: task.campaign_id, request: { requestHash } }, () => fail("RESEARCH_TOOL_RECOVERY_REQUIRED", "Tool receipt is missing"));
    }
    const receipt = runtime.store.get("SELECT request_sha256,response_json FROM commands WHERE command_id=?", `tool-execution:${input.execution_id}`);
    if (receipt) {
      if (receipt.request_sha256 !== requestHash) fail("RESEARCH_TOOL_ID_CONFLICT", "Execution ID refers to another request");
      return returnReceipt(JSON.parse(String(receipt.response_json)));
    }
    const running = active.get(input.execution_id);
    if (running) {
      if (running.requestHash !== requestHash) fail("RESEARCH_TOOL_ID_CONFLICT", "Execution ID is active with different input");
      return running.promise;
    }
    const existing = runtime.store.get("SELECT state FROM tool_executions WHERE execution_id=?", input.execution_id);
    if (existing && existing.state !== "waiting") fail("RESEARCH_TOOL_RECOVERY_REQUIRED", "Previous execution has no settled receipt; do not rerun it blindly");
    const controller = new AbortController();
    const promise = run(input, requestHash, controller).finally(() => active.delete(input.execution_id));
    active.set(input.execution_id, { controller, promise, requestHash, attemptKey: input.attempt.attempt_key });
    return promise;
  }
  return {
    executeResearchTool,
    recover(): { terminated: string[]; unconfirmed: string[] } {
      const terminated: string[] = [], unconfirmed: string[] = [];
      for (const row of runtime.store.all("SELECT * FROM tool_executions WHERE state<>'terminated'")) {
        const id = String(row.execution_id);
        if (active.has(id)) continue;
        if (runtime.store.get("SELECT phase FROM trust_commits WHERE operation_id=? AND phase<>'committed'", `tool-execution:${id}`)) { unconfirmed.push(id); continue; }
        let confirmed = row.state === "waiting";
        if (row.handle_json) {
          const handle = JSON.parse(String(row.handle_json)) as { runtime_kind?: string; pid?: number; service_pid?: number };
          const pid = handle.runtime_kind === "http_fetch" ? handle.service_pid : handle.runtime_kind === "fixed_python" ? handle.pid : undefined;
          if (Number.isSafeInteger(pid) && Number(pid) > 0 && pid !== process.pid) {
            try { process.kill(pid!, 0); }
            catch (error) { confirmed = (error as NodeJS.ErrnoException).code === "ESRCH"; }
          }
        }
        if (!confirmed) { unconfirmed.push(id); continue; }
        runtime.store.transaction(() => {
          scheduler.resources.releaseToolPermit(id, { termination_confirmed: true });
          if (!runtime.store.get("SELECT operation_id FROM trust_commits WHERE operation_id=?", `tool-execution:${id}`)) {
            const receipt: ToolReceipt = { execution_id: id, status: "failed", error_code: "RESEARCH_TOOL_INTERRUPTED", proof_authority: "none" };
            runtime.store.run("INSERT OR IGNORE INTO commands(command_id,principal_id,request_sha256,response_json,status) VALUES (?,'service:research-tools',?,?,'committed')", `tool-execution:${id}`, String(row.command_ref), JSON.stringify(receipt));
          }
        });
        terminated.push(id);
      }
      return { terminated, unconfirmed };
    },
    workerTool: (attempt: WorkerPrincipal, toolId: string, body: unknown, signal: AbortSignal) => {
      const request = body as { command_id: string; payload: unknown };
      return executeResearchTool({ execution_id: `TOOL-${hash({ attempt: attempt.attempt_key, command: request.command_id })}`, attempt, tool_id: toolId, args: request.payload, signal });
    },
    close(): Promise<void> {
      if (closing) return closing;
      for (const [id, entry] of active) { runtime.store.run("UPDATE tool_executions SET stop_intent='shutdown' WHERE execution_id=?", id); entry.controller.abort(); }
      closing = Promise.allSettled([...active.values()].map(entry => entry.promise)).then(() => undefined);
      return closing;
    }
  };
}
