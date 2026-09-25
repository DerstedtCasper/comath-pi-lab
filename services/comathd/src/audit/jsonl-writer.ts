import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { auditEventSchema, type AuditEvent } from "../types/schemas.js";
import { nextSequentialId } from "../utils/id.js";
import { assertPathAllowed } from "../security/path-policy.js";
import { allocateProjectId, drainResearchAuditOutbox, hasProjectCommit, projectCommitTime, stageAuditEvent, stagedAuditEvents, withTrustedWriter } from "../research/project-commit.js";
import { isDaemonMaintenanceAuditAllowed } from "../research/daemon-owner.js";

export type AuditEventInput = Omit<AuditEvent, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export function auditLogPath(projectRoot: string): string {
  return assertPathAllowed(projectRoot, join(".comath", "audit", "events.jsonl"), { purpose: "runtime-write" });
}

export function readAuditEvents(projectRoot: string): AuditEvent[] {
  const maintenance = isDaemonMaintenanceAuditAllowed(projectRoot);
  if (!maintenance && !hasProjectCommit(projectRoot)) drainResearchAuditOutbox(projectRoot);
  const path = auditLogPath(projectRoot);
  if (!existsSync(path)) {
    return maintenance ? [] : stagedAuditEvents(projectRoot);
  }

  const events = readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => auditEventSchema.parse(JSON.parse(line)));
  return maintenance ? events : [...events, ...stagedAuditEvents(projectRoot)];
}

export function appendAuditEvent(projectRoot: string, input: AuditEventInput): AuditEvent {
  const maintenance = isDaemonMaintenanceAuditAllowed(projectRoot);
  if (!maintenance && !hasProjectCommit(projectRoot)) return withTrustedWriter(projectRoot, "audit.append", input, () => appendAuditEventBody(projectRoot, input));
  return appendAuditEventBody(projectRoot, input);
}

function appendAuditEventBody(projectRoot: string, input: AuditEventInput): AuditEvent {
  const maintenance = isDaemonMaintenanceAuditAllowed(projectRoot);
  const legacyId = () => nextSequentialId("AUD", readAuditEvents(projectRoot).map((item) => item.id));
  const event = auditEventSchema.parse({
    id: input.id ?? (maintenance ? legacyId() : allocateProjectId(projectRoot, "AUD", legacyId)),
    project_id: input.project_id,
    event_type: input.event_type,
    actor: input.actor,
    target_id: input.target_id,
    payload: input.payload ?? {},
    created_at: input.created_at ?? (maintenance ? new Date().toISOString() : projectCommitTime(projectRoot))
  });

  if (!maintenance && hasProjectCommit(projectRoot)) { stageAuditEvent(projectRoot, event); return event; }

  const path = auditLogPath(projectRoot);
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(event)}\n`, "utf8");
  return event;
}
