import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { evaluatePathPolicy } from "../security/path-policy.js";
import { agentRunSchema, memoryNodeSchema, type AgentRun, type AgentRunStatus, type MemoryNode } from "../types/schemas.js";
import { nextSequentialId } from "../utils/id.js";
import type { ResearchMemoryDB } from "../memory/research-memory-db.js";
import { readWorkstreamStatus } from "../workstream/workstream-store.js";

export type CreateAgentRunInput = {
  project_id: string;
  campaign_id?: string;
  workstream_id: string;
  role: AgentRun["role"];
  model?: string;
  tool_profile: string;
  actor: string;
};

export type StartAgentRunInput = {
  project_id: string;
  run_id: string;
  actor: string;
};

export type CancelQueuedAgentRunInput = {
  project_id: string;
  run_id: string;
  report_markdown: string;
  exit_reason: string;
  actor: string;
};

export type SubmitAgentRunReportInput = {
  project_id: string;
  run_id: string;
  status: Extract<AgentRunStatus, "succeeded" | "failed" | "cancelled">;
  report_markdown: string;
  graph_patch_path?: string;
  artifact_manifest_path?: string;
  exit_reason?: string;
  actor: string;
};

export type ListAgentRunsFilter = {
  workstream_id?: string;
  campaign_id?: string;
  status?: AgentRunStatus;
};

export type RecordAgentRunFailureInput = {
  project_id: string;
  run_id: string;
  db: ResearchMemoryDB;
  actor: string;
};

const requiredReportHeadings = [
  "# Agent Report",
  "## Input Context",
  "## Actions Taken",
  "## Claims Proposed",
  "## Evidence Produced",
  "## Graph Patch",
  "## Blockers",
  "## Failed Routes",
  "## Self-Review",
  "## Next Actions"
] as const;

function now(): string {
  return new Date().toISOString();
}

function runsRoot(projectRoot: string): string {
  return join(resolve(projectRoot), ".comath", "agents", "runs");
}

function runDirectory(projectRoot: string, runId: string): string {
  return join(runsRoot(projectRoot), runId);
}

function runStatusPath(projectRoot: string, runId: string): string {
  return join(runDirectory(projectRoot, runId), "status.json");
}

function failureRegistryPath(projectRoot: string): string {
  return join(resolve(projectRoot), ".comath", "agents", "failures.jsonl");
}

function assertAgentRunId(runId: string): void {
  if (/^ARUN-\d{4,}$/.test(runId)) {
    return;
  }
  throw new ComathError("invalid AgentRun id", {
    statusCode: 400,
    code: "INVALID_AGENT_RUN_ID"
  });
}

function normalizeScope(scope: string): string {
  return scope.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/?$/, "/");
}

function projectRelativePath(projectRoot: string, candidatePath: string): string {
  const root = resolve(projectRoot);
  const absolute = isAbsolute(candidatePath) ? resolve(candidatePath) : resolve(root, candidatePath);
  return relative(root, absolute).split(sep).join("/");
}

function isInsidePath(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function isRelativePathInRunScope(relativePath: string, run: AgentRun): boolean {
  const relativeWithTrailingSlash = relativePath.endsWith("/") ? relativePath : `${relativePath}/`;
  return run.write_scope.some((scope) => {
    const normalizedScope = normalizeScope(scope);
    return relativePath === normalizedScope.slice(0, -1) || relativeWithTrailingSlash.startsWith(normalizedScope);
  });
}

function nearestExistingAncestor(candidatePath: string): string {
  let current = candidatePath;
  while (!existsSync(current)) {
    const parent = dirname(current);
    if (parent === current) {
      return current;
    }
    current = parent;
  }
  return current;
}

function assertProjectMatches(actualProjectId: string, inputProjectId: string): void {
  if (actualProjectId !== inputProjectId) {
    throw new ComathError("AgentRun project_id mismatch", {
      statusCode: 400,
      code: "AGENT_RUN_PROJECT_MISMATCH"
    });
  }
}

function readRun(projectRoot: string, runId: string): AgentRun {
  assertAgentRunId(runId);
  const path = runStatusPath(projectRoot, runId);
  if (!existsSync(path)) {
    throw new ComathError("AgentRun not found", { statusCode: 404, code: "AGENT_RUN_NOT_FOUND" });
  }
  return agentRunSchema.parse(JSON.parse(readFileSync(path, "utf8")));
}

function writeRun(projectRoot: string, run: AgentRun): AgentRun {
  const parsed = agentRunSchema.parse(run);
  const path = runStatusPath(projectRoot, parsed.id);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  return parsed;
}

function existingRunIds(projectRoot: string): string[] {
  const root = runsRoot(projectRoot);
  if (!existsSync(root)) {
    return [];
  }
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function existingFailureIds(projectRoot: string): string[] {
  return readFailureRegistry(projectRoot).map((node) => node.id);
}

function readFailureRegistry(projectRoot: string): MemoryNode[] {
  const path = failureRegistryPath(projectRoot);
  if (!existsSync(path)) {
    return [];
  }
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => memoryNodeSchema.parse(JSON.parse(line)));
}

function readFailureNodeForRun(projectRoot: string, runId: string): MemoryNode | undefined {
  return readFailureRegistry(projectRoot).find((node) => node.payload.agent_run_id === runId);
}

function assertCanStart(run: AgentRun): void {
  if (run.status !== "queued") {
    throw new ComathError(`cannot start AgentRun in ${run.status} state`, {
      statusCode: 400,
      code: "INVALID_AGENT_RUN_TRANSITION"
    });
  }
}

function assertCanSubmit(run: AgentRun): void {
  if (run.status !== "running") {
    throw new ComathError(`cannot submit AgentRun report in ${run.status} state`, {
      statusCode: 400,
      code: "INVALID_AGENT_RUN_TRANSITION"
    });
  }
}

function assertCanCancelQueued(run: AgentRun): void {
  if (run.status !== "queued") {
    throw new ComathError(`cannot cancel queued AgentRun in ${run.status} state`, {
      statusCode: 400,
      code: "INVALID_AGENT_RUN_TRANSITION"
    });
  }
}

function assertReportHeadings(reportMarkdown: string): void {
  for (const heading of requiredReportHeadings) {
    const pattern = new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "m");
    if (pattern.test(reportMarkdown)) {
      continue;
    }
    throw new ComathError(`missing required report heading: ${heading}`, {
      statusCode: 400,
      code: "AGENT_RUN_REPORT_INVALID"
    });
  }
}

function assertAgentRunRealpathAllowed(projectRoot: string, run: AgentRun, absoluteCandidatePath: string): void {
  const root = resolve(projectRoot);
  const realRoot = existsSync(root) ? realpathSync.native(root) : root;
  const ancestor = nearestExistingAncestor(absoluteCandidatePath);
  if (!existsSync(ancestor)) {
    return;
  }
  const realAncestor = realpathSync.native(ancestor);
  const suffix = relative(ancestor, absoluteCandidatePath);
  const realCandidate = resolve(realAncestor, suffix);
  if (!isInsidePath(realRoot, realCandidate)) {
    throw new ComathError("realpath escapes project root", {
      statusCode: 400,
      code: "AGENT_RUN_REALPATH_DENIED"
    });
  }
  const realRelativePath = relative(realRoot, realCandidate).split(sep).join("/");
  if (!isRelativePathInRunScope(realRelativePath, run)) {
    throw new ComathError(`realpath escapes AgentRun write scope: ${realRelativePath}`, {
      statusCode: 403,
      code: "AGENT_RUN_REALPATH_SCOPE_DENIED"
    });
  }
}

export function assertAgentRunWriteAllowed(projectRoot: string, run: AgentRun, candidatePath: string): string {
  const decision = evaluatePathPolicy(projectRoot, candidatePath, { purpose: "read" });
  if (!decision.allowed || !decision.normalized_path) {
    const reason = decision.reason === "path escapes project root" ? "Path escapes project root" : decision.reason;
    throw new ComathError(reason, { statusCode: 400, code: "AGENT_RUN_PATH_DENIED" });
  }

  const relativePath = projectRelativePath(projectRoot, decision.normalized_path);
  if (!isRelativePathInRunScope(relativePath, run)) {
    throw new ComathError(`outside AgentRun write scope: ${relativePath}`, {
      statusCode: 403,
      code: "AGENT_RUN_WRITE_SCOPE_DENIED"
    });
  }
  assertAgentRunRealpathAllowed(projectRoot, run, decision.normalized_path);
  return decision.normalized_path;
}

function validateAgentRunMetadataPath(projectRoot: string, run: AgentRun, candidatePath?: string): string | undefined {
  if (!candidatePath) {
    return undefined;
  }
  if (isAbsolute(candidatePath)) {
    throw new ComathError("AgentRun metadata path must be project-relative", {
      statusCode: 400,
      code: "AGENT_RUN_METADATA_PATH_ABSOLUTE"
    });
  }
  const absolutePath = assertAgentRunWriteAllowed(projectRoot, run, candidatePath);
  return projectRelativePath(projectRoot, absolutePath);
}

export function createAgentRun(projectRoot: string, input: CreateAgentRunInput): AgentRun {
  const status = readWorkstreamStatus(projectRoot, input.workstream_id);
  assertProjectMatches(status.project_id, input.project_id);
  const createdAt = now();
  const id = nextSequentialId("ARUN", existingRunIds(projectRoot));
  const run = writeRun(
    projectRoot,
    agentRunSchema.parse({
      id,
      project_id: input.project_id,
      campaign_id: input.campaign_id,
      workstream_id: input.workstream_id,
      role: input.role,
      model: input.model ?? "service-default",
      tool_profile: input.tool_profile,
      status: "queued",
      write_scope: [`.comath/workstreams/${input.workstream_id}/`, `.tmp/comath/${id}/`],
      created_by: input.actor,
      created_at: createdAt,
      updated_at: createdAt
    })
  );
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "agent_run.created",
    actor: input.actor,
    target_id: id,
    payload: {
      campaign_id: input.campaign_id,
      workstream_id: input.workstream_id,
      role: input.role,
      write_scope: run.write_scope
    }
  });
  return run;
}

export function startAgentRun(projectRoot: string, input: StartAgentRunInput): AgentRun {
  const run = readRun(projectRoot, input.run_id);
  assertProjectMatches(run.project_id, input.project_id);
  assertCanStart(run);
  const startedAt = now();
  const next = writeRun(projectRoot, {
    ...run,
    status: "running",
    started_at: startedAt,
    updated_at: startedAt
  });
  mkdirSync(assertAgentRunWriteAllowed(projectRoot, next, `.tmp/comath/${next.id}/`), { recursive: true });
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "agent_run.started",
    actor: input.actor,
    target_id: input.run_id,
    payload: {
      workstream_id: next.workstream_id,
      campaign_id: next.campaign_id
    }
  });
  return next;
}

export function cancelQueuedAgentRun(projectRoot: string, input: CancelQueuedAgentRunInput): AgentRun {
  const run = readRun(projectRoot, input.run_id);
  assertProjectMatches(run.project_id, input.project_id);
  assertCanCancelQueued(run);
  assertReportHeadings(input.report_markdown);
  const reportPath = `.comath/workstreams/${run.workstream_id}/agent_runs/${run.id}/report.md`;
  const absoluteReportPath = assertAgentRunWriteAllowed(projectRoot, run, reportPath);
  mkdirSync(dirname(absoluteReportPath), { recursive: true });
  writeFileSync(absoluteReportPath, `${input.report_markdown.trimEnd()}\n`, "utf8");

  const completedAt = now();
  const next = writeRun(projectRoot, {
    ...run,
    status: "cancelled",
    report_path: reportPath,
    exit_reason: input.exit_reason,
    completed_at: completedAt,
    updated_at: completedAt
  });
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "agent_run.queued_cancelled",
    actor: input.actor,
    target_id: run.id,
    payload: {
      status: next.status,
      workstream_id: next.workstream_id,
      report_path: next.report_path,
      exit_reason: next.exit_reason
    }
  });
  return next;
}

export function submitAgentRunReport(projectRoot: string, input: SubmitAgentRunReportInput): AgentRun {
  const run = readRun(projectRoot, input.run_id);
  assertProjectMatches(run.project_id, input.project_id);
  assertCanSubmit(run);
  assertReportHeadings(input.report_markdown);
  const graphPatchPath = validateAgentRunMetadataPath(projectRoot, run, input.graph_patch_path);
  const artifactManifestPath = validateAgentRunMetadataPath(projectRoot, run, input.artifact_manifest_path);
  const reportPath = `.comath/workstreams/${run.workstream_id}/agent_runs/${run.id}/report.md`;
  const absoluteReportPath = assertAgentRunWriteAllowed(projectRoot, run, reportPath);
  mkdirSync(dirname(absoluteReportPath), { recursive: true });
  writeFileSync(absoluteReportPath, `${input.report_markdown.trimEnd()}\n`, "utf8");

  const completedAt = now();
  const next = writeRun(projectRoot, {
    ...run,
    status: input.status,
    report_path: reportPath,
    graph_patch_path: graphPatchPath,
    artifact_manifest_path: artifactManifestPath,
    exit_reason: input.exit_reason,
    completed_at: completedAt,
    updated_at: completedAt
  });
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "agent_run.report_submitted",
    actor: input.actor,
    target_id: run.id,
    payload: {
      status: next.status,
      workstream_id: next.workstream_id,
      report_path: next.report_path,
      graph_patch_path: next.graph_patch_path,
      artifact_manifest_path: next.artifact_manifest_path,
      exit_reason: next.exit_reason
    }
  });
  return next;
}

export function getAgentRun(projectRoot: string, projectId: string, runId: string): AgentRun {
  const run = readRun(projectRoot, runId);
  assertProjectMatches(run.project_id, projectId);
  return run;
}

export function listAgentRuns(projectRoot: string, projectId: string, filter: ListAgentRunsFilter = {}): AgentRun[] {
  return existingRunIds(projectRoot)
    .map((id) => readRun(projectRoot, id))
    .filter((run) => run.project_id === projectId)
    .filter((run) => !filter.workstream_id || run.workstream_id === filter.workstream_id)
    .filter((run) => !filter.campaign_id || run.campaign_id === filter.campaign_id)
    .filter((run) => !filter.status || run.status === filter.status)
    .sort((left, right) => left.id.localeCompare(right.id));
}

export async function recordAgentRunFailureToMemory(
  projectRoot: string,
  input: RecordAgentRunFailureInput
): Promise<MemoryNode> {
  const run = getAgentRun(projectRoot, input.project_id, input.run_id);
  if (run.status !== "failed") {
    throw new ComathError("only failed AgentRuns can be recorded as FailureRoute memory", {
      statusCode: 400,
      code: "AGENT_RUN_NOT_FAILED"
    });
  }
  const existingFailureNode = readFailureNodeForRun(projectRoot, run.id);
  if (existingFailureNode) {
    await input.db.upsertNode(existingFailureNode);
    return existingFailureNode;
  }
  const createdAt = now();
  const failureNode = memoryNodeSchema.parse({
    id: nextSequentialId("FR", existingFailureIds(projectRoot)),
    project_id: input.project_id,
    type: "FailureRoute",
    title: `Failed AgentRun ${run.id}: ${run.exit_reason ?? "unspecified failure"}`,
    payload: {
      agent_run_id: run.id,
      campaign_id: run.campaign_id,
      workstream_id: run.workstream_id,
      role: run.role,
      report_path: run.report_path,
      exit_reason: run.exit_reason ?? "unspecified failure"
    },
    created_at: createdAt,
    updated_at: createdAt
  });
  await input.db.upsertNode(failureNode);
  const registryPath = failureRegistryPath(projectRoot);
  mkdirSync(dirname(registryPath), { recursive: true });
  writeFileSync(registryPath, `${JSON.stringify(failureNode)}\n`, { encoding: "utf8", flag: "a" });
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "agent_run.failure_recorded",
    actor: input.actor,
    target_id: failureNode.id,
    payload: {
      agent_run_id: run.id,
      campaign_id: run.campaign_id,
      workstream_id: run.workstream_id,
      exit_reason: run.exit_reason
    }
  });
  return failureNode;
}
