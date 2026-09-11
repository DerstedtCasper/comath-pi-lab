import { ComathError } from "../errors.js";
import type { ResearchDaemon } from "../research/daemon-runtime.js";
import type { IntakePrincipal } from "../research/formalization-intake.js";

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
export async function dispatchResearchRoute(daemon: ResearchDaemon, method: string, pathname: string, body: unknown,
  principal: IntakePrincipal): Promise<ResearchRouteResponse | undefined> {
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
