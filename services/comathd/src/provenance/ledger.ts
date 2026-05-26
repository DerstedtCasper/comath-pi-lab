import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { assertPathAllowed } from "../security/path-policy.js";
import { provenanceEventSchema, type ProvenanceEvent } from "../types/schemas.js";
import { appendOnlyRuntimeId } from "../utils/id.js";

function provenancePath(projectRoot: string): string {
  return assertPathAllowed(projectRoot, join(".comath", "provenance", "events.jsonl"), {
    purpose: "runtime-write"
  });
}

export function readProvenanceEvents(projectRoot: string, projectId?: string): ProvenanceEvent[] {
  const path = provenancePath(projectRoot);
  if (!existsSync(path)) {
    return [];
  }
  const records = readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => provenanceEventSchema.parse(JSON.parse(line)));
  return projectId ? records.filter((record) => record.project_id === projectId) : records;
}

export function appendProvenanceEvent(
  projectRoot: string,
  input: Omit<ProvenanceEvent, "id" | "created_at"> & { id?: string; created_at?: string }
): ProvenanceEvent {
  const event = provenanceEventSchema.parse({
    id: input.id ?? appendOnlyRuntimeId("PV"),
    project_id: input.project_id,
    event_type: input.event_type,
    actor: input.actor,
    target_id: input.target_id,
    payload: input.payload ?? {},
    created_at: input.created_at ?? new Date().toISOString()
  });
  const path = provenancePath(projectRoot);
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(event)}\n`, "utf8");
  return event;
}
