import { createHash, randomUUID } from "node:crypto";
import { ComathError } from "../errors.js";
import type { ProjectRuntime } from "./project-runtime.js";
import type { ResearchTask } from "./research-schemas.js";

export type ResearchResourceConfig = {
  max_active_workers: number;
  provider_policies: Record<string, { max_sessions: number; launch_rpm: number }>;
  model_policies: Record<string, { provider_id: string; runtime_id: string; model: string; max_sessions?: number }>;
  tool_limits?: { lean: number; cas: number; retrieval: number };
  heartbeat_ms?: number; lease_ttl_ms?: number; aging_ms?: number;
};
export type ToolPermitRequest = { attempt_key: string; execution_id: string; kind: "lean" | "cas" | "retrieval"; command_ref: string };
function fail(code: string, message: string): never { throw new ComathError(message, { code, statusCode: 409 }); }
export function validateResourceConfig(config: ResearchResourceConfig): void {
  const positive = (value: number, max: number) => Number.isSafeInteger(value) && value >= 1 && value <= max;
  if (!positive(config.max_active_workers, 64)) fail("RESEARCH_CONFIG_INVALID", "Worker cap must be 1..64");
  for (const provider of Object.values(config.provider_policies)) {
    if (!positive(provider.max_sessions, 64) || !positive(provider.launch_rpm, 4)) fail("RESEARCH_CONFIG_INVALID", "Provider session cap or launch RPM is invalid");
  }
  for (const model of Object.values(config.model_policies)) if (!config.provider_policies[model.provider_id]
    || !model.runtime_id || !model.model || (model.max_sessions !== undefined && !positive(model.max_sessions, 64))) fail("RESEARCH_CONFIG_INVALID", "Model policy has no valid runtime/provider");
  for (const limit of Object.values(config.tool_limits ?? {})) if (!positive(limit, 64)) fail("RESEARCH_CONFIG_INVALID", "Tool cap must be 1..64");
  const heartbeat = config.heartbeat_ms ?? 30000, ttl = config.lease_ttl_ms ?? 120000;
  if (!positive(heartbeat, 3600000) || !positive(ttl, 10800000) || ttl < 3 * heartbeat) fail("RESEARCH_CONFIG_INVALID", "Lease TTL must be at least three heartbeats");
}

export class ResearchResourceAdmission {
  constructor(readonly runtime: ProjectRuntime, private readonly config: () => ResearchResourceConfig) {}
  count(resource: string): number {
    return Number(this.runtime.store.get(resource.startsWith("tool:")
      ? "SELECT COALESCE(SUM(amount),0) AS count FROM permits WHERE resource_key LIKE ?"
      : "SELECT COALESCE(SUM(amount),0) AS count FROM permits WHERE resource_key=?",
    resource.startsWith("tool:") ? `${resource}:%` : resource)?.count ?? 0);
  }
  providerCooldown(providerId: string): number {
    const row = this.runtime.store.get("SELECT response_json FROM commands WHERE principal_id='service:provider-cooldown' AND json_extract(response_json,'$.provider_id')=?", providerId);
    return row ? Number(JSON.parse(String(row.response_json)).until_ms) : 0;
  }
  setProviderCooldown(providerId: string, untilMs: number): void {
    if (!this.config().provider_policies[providerId] || !Number.isSafeInteger(untilMs) || untilMs < 0) fail("RESEARCH_CONFIG_INVALID", "Invalid provider cooldown");
    this.runtime.store.transaction(() => {
      const row = this.runtime.store.get("SELECT command_id,response_json FROM commands WHERE principal_id='service:provider-cooldown' AND json_extract(response_json,'$.provider_id')=?", providerId);
      const response = JSON.stringify({ provider_id: providerId, until_ms: Math.max(untilMs, this.providerCooldown(providerId)) });
      if (row) this.runtime.store.run("UPDATE commands SET response_json=? WHERE command_id=?", response, String(row.command_id));
      else this.runtime.store.run("INSERT INTO commands(command_id,principal_id,request_sha256,response_json,status) VALUES (?,'service:provider-cooldown',?,?,'committed')",
        `COOLDOWN-${randomUUID()}`, createHash("sha256").update(providerId).digest("hex"), response);
    });
  }
  waitingReason(task: ResearchTask): string | null {
    const config = this.config(), model = config.model_policies[task.model_policy_id];
    if (!model) fail("RESEARCH_POLICY_UNKNOWN", "Unknown model policy");
    const provider = config.provider_policies[model.provider_id], campaign = this.runtime.store.getCampaign(task.campaign_id);
    if (!campaign) fail("RESEARCH_CAMPAIGN_NOT_FOUND", "Unknown campaign");
    if (this.count("worker:deployment") >= config.max_active_workers) return "deployment_worker_cap";
    if (this.count(`worker:campaign:${task.campaign_id}`) >= campaign.max_active_workers) return "campaign_worker_cap";
    if (this.count(`provider:${model.provider_id}`) >= provider.max_sessions) return "provider_session_cap";
    if (this.count(`model:${task.model_policy_id}`) >= (model.max_sessions ?? provider.max_sessions)) return "model_session_cap";
    if (this.providerCooldown(model.provider_id) > this.runtime.clock.now()) return "provider_cooldown";
    const since = new Date(this.runtime.clock.now() - 60000).toISOString();
    const launches = Number(this.runtime.store.get("SELECT COUNT(*) AS count FROM events WHERE type='DispatchRequested' AND created_at>? AND json_extract(payload_json,'$.provider_id')=?", since, model.provider_id)?.count ?? 0);
    return launches >= provider.launch_rpm ? "provider_launch_rpm" : null;
  }
  acquireAttemptPermits(task: ResearchTask, attemptKey: string, deadline: string): void {
    if (!this.runtime.store.inTransaction) throw new Error("Admission requires the grant transaction");
    const reason = this.waitingReason(task);
    if (reason) fail("RESEARCH_RESOURCE_WAIT", reason);
    const model = this.config().model_policies[task.model_policy_id];
    for (const key of ["worker:deployment", `worker:campaign:${task.campaign_id}`, `provider:${model.provider_id}`, `model:${task.model_policy_id}`]) {
      this.runtime.store.run("INSERT INTO permits(attempt_key,resource_key,amount,deadline) VALUES (?,?,1,?)", attemptKey, key, deadline);
    }
  }
  acquireToolPermit(request: ToolPermitRequest): { granted: boolean; execution_id: string; waiting_reason?: string } {
    return this.runtime.store.transaction(() => {
      const attempt = this.runtime.store.get("SELECT * FROM attempts WHERE attempt_key=?", request.attempt_key);
      if (!attempt) fail("RESEARCH_ATTEMPT_UNKNOWN", "Tool attempt is unknown");
      const task = this.runtime.store.getTask(String(attempt.task_id));
      if (!task || task.generation !== Number(attempt.generation) || !["leased", "running"].includes(task.status)
        || !["leased", "running"].includes(String(attempt.state)) || Date.parse(String(attempt.expires_at)) <= this.runtime.clock.now()) {
        fail("RESEARCH_ATTEMPT_FENCED", "Tool call has no active current lease");
      }
      const limit = (this.config().tool_limits ?? { lean: 1, cas: 2, retrieval: 4 })[request.kind];
      if (!limit || !request.execution_id || !request.command_ref) fail("RESEARCH_TOOL_INVALID", "Tool request is not configured");
      const existing = this.runtime.store.get("SELECT * FROM tool_executions WHERE execution_id=?", request.execution_id);
      if (existing && (existing.attempt_key !== request.attempt_key || existing.kind !== request.kind || existing.command_ref !== request.command_ref)) fail("RESEARCH_TOOL_ID_CONFLICT", "Execution ID belongs to a different tool request");
      if (existing && existing.state !== "waiting") {
        if (existing.state === "terminated") fail("RESEARCH_TOOL_TERMINAL", "Tool execution already terminated");
        return { granted: true, execution_id: request.execution_id };
      }
      if (!existing) this.runtime.store.run("INSERT INTO tool_executions(execution_id,attempt_key,kind,command_ref,state) VALUES (?,?,?,?,'waiting')",
        request.execution_id, request.attempt_key, request.kind, request.command_ref);
      if (this.count(`tool:${request.kind}`) >= limit) return { granted: false, execution_id: request.execution_id, waiting_reason: "waiting_resource" };
      const resourceKey = `tool:${request.kind}:${request.execution_id}`;
      this.runtime.store.run("INSERT INTO permits(attempt_key,resource_key,amount,deadline) VALUES (?,?,1,?)", request.attempt_key, resourceKey, String(attempt.expires_at));
      this.runtime.store.run("UPDATE tool_executions SET state='admitted',permit_ref=? WHERE execution_id=?", resourceKey, request.execution_id);
      return { granted: true, execution_id: request.execution_id };
    });
  }
  releaseToolPermit(executionId: string, confirmation: { termination_confirmed: boolean }): void {
    if (!confirmation.termination_confirmed) fail("TERMINATION_UNCONFIRMED", "Tool termination is not confirmed");
    this.runtime.store.transaction(() => {
      const execution = this.runtime.store.get("SELECT attempt_key,permit_ref FROM tool_executions WHERE execution_id=?", executionId);
      if (!execution) fail("RESEARCH_TOOL_UNKNOWN", "Unknown tool execution");
      this.runtime.store.run("DELETE FROM permits WHERE attempt_key=? AND resource_key=?", String(execution.attempt_key), String(execution.permit_ref));
      this.runtime.store.run("UPDATE tool_executions SET state='terminated' WHERE execution_id=?", executionId);
    });
  }
  releaseAttemptPermits(attemptKey: string, confirmation: { termination_confirmed: boolean }): void {
    if (!confirmation.termination_confirmed) fail("TERMINATION_UNCONFIRMED", "Runtime termination is not confirmed");
    if (this.runtime.store.get("SELECT execution_id FROM tool_executions WHERE attempt_key=? AND state NOT IN ('terminated','waiting') LIMIT 1", attemptKey)) {
      fail("TERMINATION_UNCONFIRMED", "Attempt still owns an unconfirmed tool execution");
    }
    this.runtime.store.run("UPDATE tool_executions SET state='terminated',stop_intent='attempt_terminated' WHERE attempt_key=? AND state='waiting'", attemptKey);
    this.runtime.store.run("DELETE FROM permits WHERE attempt_key=?", attemptKey);
  }
}
export function createResourceAdmission(runtime: ProjectRuntime, config: () => ResearchResourceConfig): ResearchResourceAdmission {
  return new ResearchResourceAdmission(runtime, config);
}
