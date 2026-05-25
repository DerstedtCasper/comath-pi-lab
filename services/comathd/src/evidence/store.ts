import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { assertPathAllowed } from "../security/path-policy.js";
import { evidenceSchema, type Evidence } from "../types/schemas.js";
import { nextSequentialId } from "../utils/id.js";

function evidenceIndexPath(projectRoot: string): string {
  return assertPathAllowed(projectRoot, join(".comath", "evidence", "evidence.jsonl"), { purpose: "runtime-write" });
}

export function readEvidenceRecords(projectRoot: string, projectId?: string): Evidence[] {
  const path = evidenceIndexPath(projectRoot);
  if (!existsSync(path)) {
    return [];
  }
  const records = readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => evidenceSchema.parse(JSON.parse(line)));
  return projectId ? records.filter((record) => record.project_id === projectId) : records;
}

export function appendEvidenceRecord(
  projectRoot: string,
  input: Omit<Evidence, "id" | "created_at"> & { id?: string; created_at?: string }
): Evidence {
  const existing = readEvidenceRecords(projectRoot);
  const evidence = evidenceSchema.parse({
    id: input.id ?? nextSequentialId("EV", existing.map((item) => item.id)),
    project_id: input.project_id,
    claim_id: input.claim_id,
    kind: input.kind,
    summary: input.summary,
    artifact_ids: input.artifact_ids ?? [],
    created_at: input.created_at ?? new Date().toISOString()
  });

  const path = evidenceIndexPath(projectRoot);
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(evidence)}\n`, "utf8");
  return evidence;
}
