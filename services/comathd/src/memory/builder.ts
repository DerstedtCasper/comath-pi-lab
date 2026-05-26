import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { graphPatchSchema, type GraphPatch, type MemoryEdge, type MemoryNode } from "../types/schemas.js";
import {
  readWorkstreamGraphPatch,
  readWorkstreamStatus,
  writeWorkstreamGraphPatch,
  writeWorkstreamStatus
} from "../workstream/workstream-store.js";

export type BuildGraphPatchInput = {
  project_id: string;
  workstream_id: string;
  created_by: string;
  new_nodes: MemoryNode[];
  new_edges: MemoryEdge[];
  updated_nodes?: GraphPatch["updated_nodes"];
  candidate_conflicts?: GraphPatch["candidate_conflicts"];
  warnings?: string[];
  apply_preconditions?: string[];
};

export function buildGraphPatchFromWorkstream(projectRoot: string, input: BuildGraphPatchInput): GraphPatch {
  const status = readWorkstreamStatus(projectRoot, input.workstream_id);
  if (status.project_id !== input.project_id) {
    throw new Error("workstream project_id mismatch");
  }

  const current = readWorkstreamGraphPatch(projectRoot, input.workstream_id);
  if (!["proposed", "under_review"].includes(current.state)) {
    throw new ComathError(`cannot rebuild GraphPatch in ${current.state} state`, {
      statusCode: 400,
      code: "GRAPH_PATCH_REBUILD_FORBIDDEN"
    });
  }
  const patch = graphPatchSchema.parse({
    patch_id: current.patch_id,
    project_id: input.project_id,
    source_workstream_id: input.workstream_id,
    state: "proposed",
    provenance: {
      created_by: input.created_by,
      created_at: current.provenance.created_at
    },
    new_nodes: input.new_nodes,
    new_edges: input.new_edges,
    updated_nodes: input.updated_nodes ?? [],
    candidate_conflicts: input.candidate_conflicts ?? [],
    warnings: input.warnings ?? [],
    apply_preconditions: input.apply_preconditions ?? []
  });

  const written = writeWorkstreamGraphPatch(projectRoot, input.workstream_id, patch);
  writeWorkstreamStatus(projectRoot, {
    ...status,
    review_state: "proposed",
    patch_id: written.patch_id
  });
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "graph_patch.proposed",
    actor: input.created_by,
    target_id: written.patch_id,
    payload: {
      workstream_id: input.workstream_id,
      new_nodes: written.new_nodes.length,
      new_edges: written.new_edges.length,
      updated_nodes: written.updated_nodes.length
    }
  });
  return written;
}
