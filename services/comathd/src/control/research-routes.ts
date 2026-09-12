import { ComathError } from "../errors.js";
import type { ResearchDaemon } from "../research/daemon-runtime.js";
import type { IntakePrincipal } from "../research/formalization-intake.js";
import { createCheckpointStore } from "../research/checkpoint-store.js";
import { createResearchReadModel } from "../research/research-read-model.js";
import { createResearchMetrics } from "../research/research-metrics.js";

export type ResearchRouteResponse = { status: number; body: { ok: true; data: unknown } };
const noRoute = () => undefined;
function fail(code: string, message: string, statusCode = 409): never { throw new ComathError(message, { code, statusCode }); }
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("RESEARCH_ROUTE_BODY_INVALID", "Research route body must be an object", 400);
  return value as Record<string, unknown>;
}
function pathId(match: RegExpExecArray | null): string | undefined { return match?.[1] ? decodeURIComponent(match[1]) : undefined; }
function requireBodyId(body: unknown, field: string, expected: string): void {
  if (record(body)[field] !== expected) fail("RESEARCH_ROUTE_ID_MISMATCH", `Request ${field} must match its URL`, 400);
}
function allowIntakeRead(daemon: ResearchDaemon, principal: IntakePrincipal, intakeId: string): void {
  const receipt = daemon.intake.readIntake(intakeId);
  if (principal.kind === "host") return;
  const row = daemon.runtime.store.get("SELECT json_extract(plan_json,'$.request.actor.kind') AS kind,json_extract(plan_json,'$.request.actor.id') AS id FROM trust_commits WHERE json_extract(plan_json,'$.response.intake_id')=?", intakeId);
  if (!row || row.kind !== "operator" || row.id !== principal.id) fail("INTAKE_READ_FORBIDDEN", "Operator does not own this prepared intake", 403);
  // Verify the same trusted receipt used for the ownership query still exists.
  if (receipt.intake_id !== intakeId) fail("INTAKE_READ_FORBIDDEN", "Prepared intake cannot be read", 403);
}

/**
 * Thin C8 transport adapter. It has no approval state of its own: all
 * preparation/ticket/commit operations stay in ResearchDaemon.intake.
 */
export async function dispatchResearchRoute(daemon: ResearchDaemon, method: string, url: URL, body: unknown,
  principal: IntakePrincipal): Promise<ResearchRouteResponse | undefined> {
  const pathname = url.pathname;
  const operationId = pathId(/^\/research\/v1\/operations\/([^/]+)$/.exec(pathname));
  if (method === "GET" && operationId) {
    const operation = daemon.runtime.store.get("SELECT operation_id,campaign_id,phase,expected_revision,witness_ref FROM trust_commits WHERE operation_id=?", operationId);
    if (!operation) fail("RESEARCH_OPERATION_NOT_FOUND", "Research operation does not exist", 404);
    return { status: 200, body: { ok: true, data: { operation_id: String(operation.operation_id), campaign_id: operation.campaign_id === null ? null : String(operation.campaign_id),
      phase: String(operation.phase), expected_revision: Number(operation.expected_revision), has_witness: operation.witness_ref !== null } } };
  }
  const checkpointTaskId = pathId(/^\/research\/v1\/tasks\/([^/]+)\/checkpoint$/.exec(pathname));
  if (method === "GET" && checkpointTaskId) {
    daemon.app.getTask(checkpointTaskId);
    const material = createCheckpointStore(daemon.runtime, { authorizeArtifact: () => false }).getResumeMaterial(checkpointTaskId);
    if (!material) fail("CHECKPOINT_NOT_FOUND", "Task has no committed checkpoint", 404);
    return { status: 200, body: { ok: true, data: material } };
  }
  const taskDetailId = pathId(/^\/research\/v1\/tasks\/([^/]+)$/.exec(pathname));
  if (method === "GET" && taskDetailId) {
    const task = daemon.app.getTask(taskDetailId);
    const attempts = daemon.runtime.store.all("SELECT attempt_key,generation,run_id,state,expires_at,last_heartbeat_at,runtime_kind,fault_reason,stop_reason,stop_requested_at,termination_confirmed,last_checkpoint_at FROM attempts WHERE task_id=? ORDER BY generation", task.task_id)
      .map(row => ({ attempt_key: String(row.attempt_key), generation: Number(row.generation), run_id: String(row.run_id), state: String(row.state),
        expires_at: row.expires_at === null ? null : String(row.expires_at), last_heartbeat_at: row.last_heartbeat_at === null ? null : String(row.last_heartbeat_at),
        runtime_kind: row.runtime_kind === null ? null : String(row.runtime_kind), fault_reason: row.fault_reason === null ? null : String(row.fault_reason),
        stop_reason: row.stop_reason === null ? null : String(row.stop_reason), stop_requested_at: row.stop_requested_at === null ? null : String(row.stop_requested_at),
        termination_confirmed: Number(row.termination_confirmed) === 1, last_checkpoint_at: row.last_checkpoint_at === null ? null : String(row.last_checkpoint_at) }));
    const checkpoint = task.checkpoint_head ? daemon.runtime.store.get("SELECT checkpoint_id,seq,payload_sha256,artifact_ref,created_at FROM checkpoints WHERE checkpoint_id=?", task.checkpoint_head) : undefined;
    const validation = daemon.runtime.store.all("SELECT candidate_id,policy_version,role_slot,current_task_id,prior_task_ids_json FROM validation_tasks WHERE current_task_id=?", task.task_id)
      .map(row => ({ candidate_id: String(row.candidate_id), policy_version: String(row.policy_version), role_slot: String(row.role_slot), current_task_id: String(row.current_task_id), prior_task_ids: JSON.parse(String(row.prior_task_ids_json)) }));
    return { status: 200, body: { ok: true, data: { task, attempts, checkpoint: checkpoint ? { checkpoint_id: String(checkpoint.checkpoint_id), seq: Number(checkpoint.seq),
      payload_sha256: String(checkpoint.payload_sha256), artifact_ref: JSON.parse(String(checkpoint.artifact_ref)), created_at: String(checkpoint.created_at) } : null, validation } } };
  }
  const pauseCampaignId = pathId(/^\/research\/v1\/campaigns\/([^/]+)\/pause$/.exec(pathname));
  if (method === "POST" && pauseCampaignId) {
    if (principal.kind !== "operator") fail("RESEARCH_PRINCIPAL_FORBIDDEN", "Only an operator may pause a research campaign", 403);
    const input = record(body);
    return { status: 202, body: { ok: true, data: await daemon.pauseCampaign({ kind: "operator", id: principal.id }, pauseCampaignId, {
      command_id: typeof input.command_id === "string" ? input.command_id : "", expected_revision: input.expected_revision as number, reason: typeof input.reason === "string" ? input.reason : "" }) } };
  }
  const resumeCampaignId = pathId(/^\/research\/v1\/campaigns\/([^/]+)\/resume$/.exec(pathname));
  if (method === "POST" && resumeCampaignId) {
    if (principal.kind !== "operator") fail("RESEARCH_PRINCIPAL_FORBIDDEN", "Only an operator may resume a research campaign", 403);
    const input = record(body);
    return { status: 200, body: { ok: true, data: daemon.resumeCampaign({ kind: "operator", id: principal.id }, resumeCampaignId, {
      command_id: typeof input.command_id === "string" ? input.command_id : "", expected_revision: input.expected_revision as number }) } };
  }
  const cancelCampaignId = pathId(/^\/research\/v1\/campaigns\/([^/]+)\/cancel$/.exec(pathname));
  if (method === "POST" && cancelCampaignId) {
    if (principal.kind !== "operator") fail("RESEARCH_PRINCIPAL_FORBIDDEN", "Only an operator may cancel a research campaign", 403);
    const input = record(body);
    return { status: 202, body: { ok: true, data: await daemon.cancelCampaign({ kind: "operator", id: principal.id }, cancelCampaignId, {
      command_id: typeof input.command_id === "string" ? input.command_id : "", expected_revision: input.expected_revision as number, reason: typeof input.reason === "string" ? input.reason : "" }) } };
  }
  const finishCampaignId = pathId(/^\/research\/v1\/campaigns\/([^/]+)\/finish$/.exec(pathname));
  if (method === "POST" && finishCampaignId) {
    if (principal.kind !== "operator") fail("RESEARCH_PRINCIPAL_FORBIDDEN", "Only an operator may finish a research campaign", 403);
    const input = record(body);
    return { status: 202, body: { ok: true, data: await daemon.finishCampaign({ kind: "operator", id: principal.id }, finishCampaignId, {
      command_id: typeof input.command_id === "string" ? input.command_id : "", expected_revision: input.expected_revision as number, reason: typeof input.reason === "string" ? input.reason : "" }) } };
  }
  const cancelTaskId = pathId(/^\/research\/v1\/tasks\/([^/]+)\/cancel$/.exec(pathname));
  if (method === "POST" && cancelTaskId) {
    if (principal.kind !== "operator") fail("RESEARCH_PRINCIPAL_FORBIDDEN", "Only an operator may cancel a research task", 403);
    const input = record(body);
    return { status: 202, body: { ok: true, data: await daemon.cancelTask({ kind: "operator", id: principal.id }, cancelTaskId, {
      command_id: typeof input.command_id === "string" ? input.command_id : "", reason: typeof input.reason === "string" ? input.reason : "" }) } };
  }
  const retryTaskId = pathId(/^\/research\/v1\/tasks\/([^/]+)\/retry$/.exec(pathname));
  if (method === "POST" && retryTaskId) {
    if (principal.kind !== "operator") fail("RESEARCH_PRINCIPAL_FORBIDDEN", "Only an operator may retry a research task", 403);
    requireBodyId(body, "task_id", retryTaskId);
    return { status: 200, body: { ok: true, data: daemon.app.retryTask({ kind: "operator", id: principal.id }, body as never) } };
  }
  const patchId = pathId(/^\/research\/v1\/campaigns\/([^/]+)\/patches$/.exec(pathname));
  if (method === "POST" && patchId) {
    if (principal.kind !== "operator") fail("RESEARCH_PRINCIPAL_FORBIDDEN", "Only an operator may patch a campaign", 403);
    requireBodyId(body, "campaign_id", patchId);
    return { status: 200, body: { ok: true, data: daemon.app.applyPatch({ kind: "operator", id: principal.id }, body as never) } };
  }
  const budgetMutationId = pathId(/^\/research\/v1\/campaigns\/([^/]+)\/budget$/.exec(pathname));
  if (method === "POST" && budgetMutationId) {
    if (principal.kind !== "operator") fail("RESEARCH_PRINCIPAL_FORBIDDEN", "Only an operator may change a campaign budget", 403);
    requireBodyId(body, "campaign_id", budgetMutationId);
    return { status: 200, body: { ok: true, data: daemon.app.updateBudget({ kind: "operator", id: principal.id }, body as never) } };
  }
  const dashboardCampaignId = pathId(/^\/research\/v1\/campaigns\/([^/]+)\/dashboard$/.exec(pathname));
  if (method === "GET" && dashboardCampaignId) {
    if (principal.kind !== "operator") fail("RESEARCH_PRINCIPAL_FORBIDDEN", "Only an operator may read a research dashboard", 403);
    const rawLimit = url.searchParams.get("limit"), after = url.searchParams.get("after_task_id");
    const readModel = createResearchReadModel(daemon.runtime).readCampaign(dashboardCampaignId, {
      ...(rawLimit === null ? {} : { limit: Number(rawLimit) }), ...(after === null ? {} : { after_task_id: after }) });
    return { status: 200, body: { ok: true, data: { ...readModel, metrics: createResearchMetrics(daemon.runtime).readCampaign(dashboardCampaignId) } } };
  }
  const campaignDetailId = pathId(/^\/research\/v1\/campaigns\/([^/]+)$/.exec(pathname));
  if (method === "GET" && campaignDetailId) {
    const frontier = daemon.app.frontier(campaignDetailId, { limit: 1 });
    return { status: 200, body: { ok: true, data: { campaign: daemon.runtime.store.getCampaign(campaignDetailId),
      proof_status: "research_unproven", proof_authority: "none", snapshot_seq: frontier.snapshot_seq } } };
  }
  const frontierId = pathId(/^\/research\/v1\/campaigns\/([^/]+)\/frontier$/.exec(pathname));
  if (method === "GET" && frontierId) {
    const after = url.searchParams.get("after_task_id") ?? undefined, rawLimit = url.searchParams.get("limit");
    return { status: 200, body: { ok: true, data: daemon.app.frontier(frontierId, { ...(after ? { after_task_id: after } : {}), ...(rawLimit === null ? {} : { limit: Number(rawLimit) }) }) } };
  }
  const budgetId = pathId(/^\/research\/v1\/campaigns\/([^/]+)\/budget$/.exec(pathname));
  if (method === "GET" && budgetId) {
    // Read through the application graph first so a pending trust commit cannot
    // expose a budget for an inconsistent campaign snapshot.
    daemon.app.frontier(budgetId, { limit: 1 });
    return { status: 200, body: { ok: true, data: daemon.scheduler.budget.read(budgetId) } };
  }
  const eventsId = pathId(/^\/research\/v1\/campaigns\/([^/]+)\/events$/.exec(pathname));
  if (method === "GET" && eventsId) {
    daemon.app.frontier(eventsId, { limit: 1 });
    const rawAfter = url.searchParams.get("after_seq"), rawLimit = url.searchParams.get("limit");
    const events = daemon.app.events.readEventsAfter({ campaign_id: eventsId, ...(rawAfter === null ? {} : { after_seq: Number(rawAfter) }), ...(rawLimit === null ? {} : { limit: Number(rawLimit) }) });
    const snapshotSeq = Number(daemon.runtime.store.get("SELECT COALESCE(MAX(seq),0) AS seq FROM events")?.seq ?? 0);
    return { status: 200, body: { ok: true, data: { campaign_id: eventsId, events, snapshot_seq: snapshotSeq,
      next_cursor: events.length && rawLimit !== null && events.length === Number(rawLimit) ? events.at(-1)!.seq : null } } };
  }
  const campaignId = pathId(/^\/research\/v1\/campaigns\/([^/]+)\/intakes$/.exec(pathname));
  if (method === "POST" && campaignId) {
    if (principal.kind !== "operator") fail("RESEARCH_PRINCIPAL_FORBIDDEN", "Only an operator may prepare formalization", 403);
    requireBodyId(body, "campaign_id", campaignId);
    return { status: 202, body: { ok: true, data: await daemon.intake.prepare(principal, body as never) } };
  }
  const approvalId = pathId(/^\/research\/v1\/intakes\/([^/]+)\/approval-requests$/.exec(pathname));
  if (method === "POST" && approvalId) {
    if (principal.kind !== "operator") fail("RESEARCH_PRINCIPAL_FORBIDDEN", "Only an operator may request approval", 403);
    requireBodyId(body, "intake_id", approvalId);
    return { status: 202, body: { ok: true, data: daemon.intake.requestApproval(principal, body as never) } };
  }
  const intakeId = pathId(/^\/research\/v1\/intakes\/([^/]+)$/.exec(pathname));
  if (method === "GET" && intakeId) {
    allowIntakeRead(daemon, principal, intakeId);
    return { status: 200, body: { ok: true, data: daemon.intake.readIntake(intakeId) } };
  }
  const ticketId = pathId(/^\/host\/v1\/intakes\/([^/]+)\/tickets$/.exec(pathname));
  if (method === "POST" && ticketId) {
    if (principal.kind !== "host") fail("RESEARCH_PRINCIPAL_FORBIDDEN", "Only a host may issue an approval ticket", 403);
    requireBodyId(body, "intake_id", ticketId);
    return { status: 200, body: { ok: true, data: daemon.intake.issueTicket(principal, body as never) } };
  }
  const approveId = pathId(/^\/host\/v1\/intakes\/([^/]+)\/approve$/.exec(pathname));
  if (method === "POST" && approveId) {
    if (principal.kind !== "host") fail("RESEARCH_PRINCIPAL_FORBIDDEN", "Only a host may approve a prepared intake", 403);
    requireBodyId(body, "intake_id", approveId);
    return { status: 200, body: { ok: true, data: daemon.intake.approve(principal, body as never) } };
  }
  return noRoute();
}
