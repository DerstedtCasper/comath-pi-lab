import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { graphPatchSchema, type GraphPatch } from "../types/schemas.js";
import type { ResearchMemoryDB } from "./research-memory-db.js";
import {
  readWorkstreamGraphPatch,
  readWorkstreamStatus,
  writeWorkstreamGraphPatch,
  writeWorkstreamStatus
} from "../workstream/workstream-store.js";

export type ReviewGraphPatchInput = {
  project_id: string;
  workstream_id: string;
  next_state: Extract<GraphPatch["state"], "under_review" | "accepted" | "rejected" | "superseded">;
  reviewer: string;
  notes?: string;
};

export type ApplyAcceptedGraphPatchInput = {
  project_id: string;
  workstream_id: string;
  db: ResearchMemoryDB;
  reviewer: string;
};

export type ApplyAcceptedGraphPatchResult = {
  patch: GraphPatch;
  applied: boolean;
};

const transitions: Record<GraphPatch["state"], Set<GraphPatch["state"]>> = {
  proposed: new Set(["under_review", "rejected", "superseded"]),
  under_review: new Set(["accepted", "rejected", "superseded"]),
  accepted: new Set(["partially_applied"]),
  rejected: new Set([]),
  partially_applied: new Set([]),
  superseded: new Set([])
};

function assertReviewer(reviewer: string): string {
  const trimmed = reviewer.trim();
  if (!trimmed) {
    throw new ComathError("reviewer is required for GraphPatch review", {
      statusCode: 400,
      code: "GRAPH_PATCH_REVIEWER_REQUIRED"
    });
  }
  return trimmed;
}

function assertProject(statusProjectId: string, inputProjectId: string): void {
  if (statusProjectId !== inputProjectId) {
    throw new ComathError("workstream project_id mismatch", {
      statusCode: 400,
      code: "WORKSTREAM_PROJECT_MISMATCH"
    });
  }
}

function assertTransition(from: GraphPatch["state"], to: GraphPatch["state"]): void {
  if (!transitions[from].has(to)) {
    throw new ComathError(`invalid GraphPatch transition: ${from} -> ${to}`, {
      statusCode: 400,
      code: "INVALID_GRAPH_PATCH_TRANSITION"
    });
  }
}

function assertNotProducerReview(patch: GraphPatch, reviewer: string): void {
  if (patch.provenance.created_by !== reviewer) {
    return;
  }
  throw new ComathError("cannot review its own GraphPatch", {
    statusCode: 403,
    code: "GRAPH_PATCH_SELF_REVIEW_FORBIDDEN"
  });
}

export function reviewGraphPatch(projectRoot: string, input: ReviewGraphPatchInput): GraphPatch {
  const reviewer = assertReviewer(input.reviewer);
  const status = readWorkstreamStatus(projectRoot, input.workstream_id);
  assertProject(status.project_id, input.project_id);
  const patch = readWorkstreamGraphPatch(projectRoot, input.workstream_id);
  assertTransition(patch.state, input.next_state);
  assertNotProducerReview(patch, reviewer);

  const reviewerNotes = [`${reviewer}: ${input.notes?.trim() || input.next_state}`]
    .concat(patch.reviewer_notes ? [patch.reviewer_notes] : [])
    .join("\n");
  const reviewed = graphPatchSchema.parse({
    ...patch,
    state: input.next_state,
    reviewer_notes: reviewerNotes
  });
  const written = writeWorkstreamGraphPatch(projectRoot, input.workstream_id, reviewed);
  writeWorkstreamStatus(projectRoot, {
    ...status,
    review_state: written.state,
    status: written.state === "accepted" ? "accepted" : written.state === "rejected" ? "failed" : "reviewing",
    patch_id: written.patch_id
  });
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "graph_patch.reviewed",
    actor: reviewer,
    target_id: written.patch_id,
    payload: {
      workstream_id: input.workstream_id,
      state: written.state
    }
  });
  return written;
}

export async function applyAcceptedGraphPatch(
  projectRoot: string,
  input: ApplyAcceptedGraphPatchInput
): Promise<ApplyAcceptedGraphPatchResult> {
  const reviewer = assertReviewer(input.reviewer);
  const status = readWorkstreamStatus(projectRoot, input.workstream_id);
  assertProject(status.project_id, input.project_id);
  if (status.applied_at) {
    throw new ComathError("GraphPatch has already been applied", {
      statusCode: 409,
      code: "GRAPH_PATCH_ALREADY_APPLIED"
    });
  }
  const patch = readWorkstreamGraphPatch(projectRoot, input.workstream_id);
  if (patch.state !== "accepted") {
    throw new ComathError("GraphPatch must be accepted before explicit apply", {
      statusCode: 400,
      code: "GRAPH_PATCH_NOT_ACCEPTED"
    });
  }

  await input.db.beginPatch(patch);
  try {
    await input.db.applyPatch(patch.patch_id, { accepted: true, reviewer });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown apply failure";
    const partiallyApplied = graphPatchSchema.parse({
      ...patch,
      state: "partially_applied",
      warnings: [...patch.warnings, message]
    });
    writeWorkstreamGraphPatch(projectRoot, input.workstream_id, partiallyApplied);
    writeWorkstreamStatus(projectRoot, {
      ...status,
      review_state: "partially_applied",
      status: "failed",
      last_error: message
    });
    throw error;
  }

  writeWorkstreamStatus(projectRoot, {
    ...status,
    review_state: patch.state,
    status: "accepted",
    patch_id: patch.patch_id,
    applied_at: new Date().toISOString(),
    applied_by: reviewer
  });
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "graph_patch.applied",
    actor: reviewer,
    target_id: patch.patch_id,
    payload: {
      workstream_id: input.workstream_id,
      new_nodes: patch.new_nodes.length,
      new_edges: patch.new_edges.length
    }
  });

  return {
    patch,
    applied: true
  };
}
