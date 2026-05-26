import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { assertPathAllowed } from "../security/path-policy.js";
import { graphPatchSchema, workstreamSchema, type GraphPatch, type Workstream } from "../types/schemas.js";
import { nextSequentialId } from "../utils/id.js";

export type WorkstreamReviewState = GraphPatch["state"];

export type WorkstreamStatusRecord = {
  id: string;
  workstream_id: string;
  project_id: string;
  kind: Workstream["kind"];
  status: Workstream["status"];
  goal: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  review_state: WorkstreamReviewState;
  patch_id?: string;
  applied_at?: string;
  applied_by?: string;
  last_error?: string;
};

export type SpawnWorkstreamInput = {
  project_id: string;
  kind: Workstream["kind"];
  goal: string;
  created_by: string;
};

export type GetWorkstreamStatusInput = {
  project_id: string;
  workstream_id: string;
};

export type WriteWorkstreamReportInput = {
  project_id: string;
  workstream_id: string;
  report_markdown: string;
  status?: Workstream["status"];
  actor?: string;
};

export type TransitionWorkstreamStatusInput = {
  project_id: string;
  workstream_id: string;
  next_status: Workstream["status"];
  actor: string;
  notes?: string;
};

export type WorkstreamBundle = {
  status: WorkstreamStatusRecord;
  spec_yaml: string;
  report_markdown: string;
  graph_patch: GraphPatch;
};

function now(): string {
  return new Date().toISOString();
}

function workstreamsRoot(projectRoot: string): string {
  return assertPathAllowed(projectRoot, join(".comath", "workstreams"), { purpose: "runtime-write" });
}

export function workstreamDirectory(projectRoot: string, workstreamId: string): string {
  return assertPathAllowed(projectRoot, join(".comath", "workstreams", workstreamId), { purpose: "runtime-write" });
}

export function workstreamStatusPath(projectRoot: string, workstreamId: string): string {
  return assertPathAllowed(projectRoot, join(".comath", "workstreams", workstreamId, "status.json"), {
    purpose: "runtime-write"
  });
}

export function workstreamSpecPath(projectRoot: string, workstreamId: string): string {
  return assertPathAllowed(projectRoot, join(".comath", "workstreams", workstreamId, "spec.yaml"), {
    purpose: "runtime-write"
  });
}

export function workstreamReportPath(projectRoot: string, workstreamId: string): string {
  return assertPathAllowed(projectRoot, join(".comath", "workstreams", workstreamId, "report.md"), {
    purpose: "runtime-write"
  });
}

export function workstreamGraphPatchPath(projectRoot: string, workstreamId: string): string {
  return assertPathAllowed(projectRoot, join(".comath", "workstreams", workstreamId, "graph_patch.json"), {
    purpose: "runtime-write"
  });
}

function ensureWorkstreamDirectory(projectRoot: string, workstreamId: string): string {
  const dir = workstreamDirectory(projectRoot, workstreamId);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function existingWorkstreamIds(projectRoot: string): string[] {
  const root = workstreamsRoot(projectRoot);
  if (!existsSync(root)) {
    return [];
  }
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function existingGraphPatchIds(projectRoot: string): string[] {
  return existingWorkstreamIds(projectRoot)
    .map((workstreamId) => {
      const path = workstreamGraphPatchPath(projectRoot, workstreamId);
      if (!existsSync(path)) {
        return undefined;
      }
      return graphPatchSchema.parse(JSON.parse(readFileSync(path, "utf8"))).patch_id;
    })
    .filter((id): id is string => Boolean(id));
}

function assertProjectMatches(status: WorkstreamStatusRecord, projectId: string): void {
  if (status.project_id !== projectId) {
    throw new ComathError("workstream project_id mismatch", { statusCode: 400, code: "WORKSTREAM_PROJECT_MISMATCH" });
  }
}

const statusTransitions: Record<Workstream["status"], Set<Workstream["status"]>> = {
  queued: new Set(["running", "blocked", "archived"]),
  running: new Set(["reviewing", "failed", "blocked", "archived"]),
  reviewing: new Set(["accepted", "failed", "blocked", "archived"]),
  accepted: new Set(["archived"]),
  failed: new Set(["archived", "blocked"]),
  blocked: new Set(["running", "archived"]),
  archived: new Set([])
};

function assertStatusTransition(from: Workstream["status"], to: Workstream["status"]): void {
  if (!statusTransitions[from].has(to)) {
    throw new ComathError(`invalid workstream transition: ${from} -> ${to}`, {
      statusCode: 400,
      code: "INVALID_WORKSTREAM_TRANSITION"
    });
  }
}

function writeStatus(projectRoot: string, status: WorkstreamStatusRecord): WorkstreamStatusRecord {
  const parsedWorkstream = workstreamSchema.parse({
    id: status.workstream_id,
    project_id: status.project_id,
    kind: status.kind,
    status: status.status,
    goal: status.goal,
    created_at: status.created_at,
    updated_at: status.updated_at
  });
  const parsed = {
    ...status,
    id: parsedWorkstream.id,
    workstream_id: parsedWorkstream.id,
    project_id: parsedWorkstream.project_id,
    kind: parsedWorkstream.kind,
    status: parsedWorkstream.status,
    goal: parsedWorkstream.goal,
    created_at: parsedWorkstream.created_at,
    updated_at: parsedWorkstream.updated_at
  };
  const path = workstreamStatusPath(projectRoot, status.workstream_id);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  return parsed;
}

export function readWorkstreamStatus(projectRoot: string, workstreamId: string): WorkstreamStatusRecord {
  const path = workstreamStatusPath(projectRoot, workstreamId);
  if (!existsSync(path)) {
    throw new ComathError("workstream not found", { statusCode: 404, code: "WORKSTREAM_NOT_FOUND" });
  }
  const parsed = JSON.parse(readFileSync(path, "utf8")) as WorkstreamStatusRecord;
  return { ...parsed, id: parsed.id ?? parsed.workstream_id };
}

export function writeWorkstreamStatus(projectRoot: string, status: WorkstreamStatusRecord): WorkstreamStatusRecord {
  return writeStatus(projectRoot, { ...status, updated_at: now() });
}

export function readWorkstreamGraphPatch(projectRoot: string, workstreamId: string): GraphPatch {
  const path = workstreamGraphPatchPath(projectRoot, workstreamId);
  if (!existsSync(path)) {
    throw new ComathError("workstream graph patch not found", {
      statusCode: 404,
      code: "WORKSTREAM_GRAPH_PATCH_NOT_FOUND"
    });
  }
  return graphPatchSchema.parse(JSON.parse(readFileSync(path, "utf8")));
}

export function writeWorkstreamGraphPatch(projectRoot: string, workstreamId: string, patch: GraphPatch): GraphPatch {
  const parsed = graphPatchSchema.parse(patch);
  const path = workstreamGraphPatchPath(projectRoot, workstreamId);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  return parsed;
}

function specYaml(input: SpawnWorkstreamInput, id: string, createdAt: string): string {
  return [
    `workstream_id: ${id}`,
    `project_id: ${input.project_id}`,
    `kind: ${input.kind}`,
    `created_by: ${input.created_by}`,
    `created_at: ${createdAt}`,
    "goal: |",
    ...input.goal.split(/\r?\n/).map((line) => `  ${line}`),
    ""
  ].join("\n");
}

export function spawnWorkstream(projectRoot: string, input: SpawnWorkstreamInput): WorkstreamStatusRecord {
  const createdAt = now();
  const id = nextSequentialId("WS", existingWorkstreamIds(projectRoot));
  const patchId = nextSequentialId("GP", existingGraphPatchIds(projectRoot));
  ensureWorkstreamDirectory(projectRoot, id);

  const status = writeStatus(projectRoot, {
    id,
    workstream_id: id,
    project_id: input.project_id,
    kind: input.kind,
    status: "queued",
    goal: input.goal,
    created_by: input.created_by,
    created_at: createdAt,
    updated_at: createdAt,
    review_state: "proposed",
    patch_id: patchId
  });

  writeFileSync(workstreamSpecPath(projectRoot, id), specYaml(input, id, createdAt), "utf8");
  writeFileSync(workstreamReportPath(projectRoot, id), "", "utf8");
  writeWorkstreamGraphPatch(
    projectRoot,
    id,
    graphPatchSchema.parse({
      patch_id: patchId,
      project_id: input.project_id,
      source_workstream_id: id,
      state: "proposed",
      provenance: {
        created_by: input.created_by,
        created_at: createdAt
      },
      new_nodes: [],
      new_edges: [],
      updated_nodes: [],
      candidate_conflicts: [],
      warnings: [],
      apply_preconditions: []
    })
  );
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "workstream.spawned",
    actor: input.created_by,
    target_id: id,
    payload: { kind: input.kind, patch_id: patchId }
  });
  return status;
}

export function getWorkstreamStatus(projectRoot: string, input: GetWorkstreamStatusInput): WorkstreamStatusRecord {
  const status = readWorkstreamStatus(projectRoot, input.workstream_id);
  assertProjectMatches(status, input.project_id);
  return status;
}

export function listWorkstreams(projectRoot: string, projectId: string): WorkstreamStatusRecord[] {
  return existingWorkstreamIds(projectRoot)
    .map((id) => readWorkstreamStatus(projectRoot, id))
    .filter((status) => status.project_id === projectId)
    .sort((left, right) => left.workstream_id.localeCompare(right.workstream_id));
}

export function readWorkstreamBundle(projectRoot: string, input: GetWorkstreamStatusInput): WorkstreamBundle {
  const status = getWorkstreamStatus(projectRoot, input);
  return {
    status,
    spec_yaml: readFileSync(workstreamSpecPath(projectRoot, input.workstream_id), "utf8"),
    report_markdown: readFileSync(workstreamReportPath(projectRoot, input.workstream_id), "utf8"),
    graph_patch: readWorkstreamGraphPatch(projectRoot, input.workstream_id)
  };
}

export function writeWorkstreamReport(projectRoot: string, input: WriteWorkstreamReportInput): WorkstreamStatusRecord {
  const status = readWorkstreamStatus(projectRoot, input.workstream_id);
  assertProjectMatches(status, input.project_id);
  writeFileSync(workstreamReportPath(projectRoot, input.workstream_id), `${input.report_markdown.trimEnd()}\n`, "utf8");
  if (input.status && input.status !== status.status) {
    assertStatusTransition(status.status, input.status);
  }
  const next = writeWorkstreamStatus(projectRoot, {
    ...status,
    status: input.status ?? status.status
  });
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "workstream.reported",
    actor: input.actor ?? status.created_by,
    target_id: input.workstream_id,
    payload: { status: next.status, patch_id: next.patch_id }
  });
  return next;
}

export function transitionWorkstreamStatus(
  projectRoot: string,
  input: TransitionWorkstreamStatusInput
): WorkstreamStatusRecord {
  const status = readWorkstreamStatus(projectRoot, input.workstream_id);
  assertProjectMatches(status, input.project_id);
  assertStatusTransition(status.status, input.next_status);
  const next = writeWorkstreamStatus(projectRoot, {
    ...status,
    status: input.next_status
  });
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "workstream.status_changed",
    actor: input.actor,
    target_id: input.workstream_id,
    payload: {
      from: status.status,
      to: input.next_status,
      notes: input.notes
    }
  });
  return next;
}
