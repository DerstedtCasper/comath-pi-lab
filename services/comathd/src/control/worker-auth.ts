import { createHash, timingSafeEqual } from "node:crypto";
import { ComathError } from "../errors.js";
import { assertProjectReadable } from "../research/project-commit.js";
import type { ProjectRuntime } from "../research/project-runtime.js";
import { canonicalJson } from "../verification/runner-contracts.js";

export type WorkerPrincipal = { task_id: string; generation: number; attempt_key: string; campaign_id: string };
export function authenticateWorker(runtime: ProjectRuntime, authorization: string | undefined, checkpointOnly = false, acceptedCommandId?: string): WorkerPrincipal {
  const token = /^Bearer ([A-Za-z0-9_-]{8,4096})$/.exec(authorization ?? "")?.[1];
  if (!token) throw new ComathError("Worker capability is required", { code: "WORKER_UNAUTHORIZED", statusCode: 403 });
  const hash = createHash("sha256").update(token).digest("hex");
  const attempt = runtime.store.get("SELECT * FROM attempts WHERE lease_token_hash=?", hash);
  if (!attempt || !timingSafeEqual(Buffer.from(String(attempt.lease_token_hash), "hex"), Buffer.from(hash, "hex"))) {
    throw new ComathError("Worker capability is invalid", { code: "WORKER_UNAUTHORIZED", statusCode: 403 });
  }
  const task = runtime.store.getTask(String(attempt.task_id)), now = runtime.clock.now();
  const grace = checkpointOnly && task?.status === "cancelling" && ["pause", "handoff", "checkpoint_overdue"].includes(String(attempt.stop_reason))
    && now < Date.parse(String(attempt.grace_deadline_at));
  let replay = false;
  if (task?.status === "succeeded" && typeof acceptedCommandId === "string" && acceptedCommandId.length > 0 && acceptedCommandId.length <= 160) {
    const operation = `research-submission:${createHash("sha256").update(canonicalJson(acceptedCommandId)).digest("hex")}`;
    const committed = runtime.store.get("SELECT plan_json FROM trust_commits WHERE operation_id=? AND phase='committed'", operation);
    if (committed) {
      const receipt = JSON.parse(String(committed.plan_json)).response;
      replay = receipt?.status === "accepted" && receipt.command_id === acceptedCommandId && receipt.task_id === task.task_id
        && receipt.generation === task.generation && receipt.attempt_key === attempt.attempt_key
        && receipt.campaign_id === task.campaign_id && receipt.result_ref?.artifact_id === task.accepted_result_id;
    }
  }
  if (!task || task.generation !== Number(attempt.generation) || attempt.fenced_at || Number(attempt.termination_confirmed) !== 0
    || !Number.isFinite(Date.parse(String(attempt.expires_at))) || now >= Date.parse(String(attempt.expires_at)) || (!grace && !replay && task.status !== "running")) {
    throw new ComathError("Worker generation is no longer active", { code: "WORKER_GENERATION_FENCED", statusCode: 409 });
  }
  assertProjectReadable(runtime.root, undefined, task.campaign_id);
  return { task_id: task.task_id, generation: task.generation, campaign_id: task.campaign_id, attempt_key: String(attempt.attempt_key) };
}
export function requireWorkerIdentity(principal: WorkerPrincipal, body: { task_id?: unknown; generation?: unknown }): void {
  if (body.task_id !== principal.task_id || body.generation !== principal.generation) throw new ComathError("Payload does not match worker capability", { code: "WORKER_IDENTITY_MISMATCH", statusCode: 403 });
}
