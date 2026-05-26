import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { auditEventSchema, type AuditEvent } from "../types/schemas.js";
import { appendOnlyRuntimeId } from "../utils/id.js";
import { assertPathAllowed } from "../security/path-policy.js";

export type AuditEventInput = Omit<AuditEvent, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export function auditLogPath(projectRoot: string): string {
  return assertPathAllowed(projectRoot, join(".comath", "audit", "events.jsonl"), { purpose: "runtime-write" });
}

export function readAuditEvents(projectRoot: string): AuditEvent[] {
  const path = auditLogPath(projectRoot);
  if (!existsSync(path)) {
    return [];
  }

  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => auditEventSchema.parse(JSON.parse(line)));
}

export function appendAuditEvent(projectRoot: string, input: AuditEventInput): AuditEvent {
  const event = auditEventSchema.parse({
    id: input.id ?? appendOnlyRuntimeId("AUD"),
    project_id: input.project_id,
    event_type: input.event_type,
    actor: input.actor,
    target_id: input.target_id,
    payload: input.payload ?? {},
    created_at: input.created_at ?? new Date().toISOString()
  });

  const path = auditLogPath(projectRoot);
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(event)}\n`, "utf8");
  return event;
}
