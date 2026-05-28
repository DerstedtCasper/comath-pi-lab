import { writeFileSync, readFileSync } from "node:fs";
import {
  graphPatchSchema,
  memoryEdgeSchema,
  memoryNodeSchema,
  type GraphPatch,
  type MemoryEdge,
  type MemoryNode
} from "../types/schemas.js";
import type {
  ContextPack,
  ContextPackInput,
  MemorySearchInput,
  MemorySearchResult,
  PatchDecision,
  ResearchMemoryDB,
  ResearchMemoryOptions
} from "./research-memory-db.js";

type StoredPatch = {
  patch: GraphPatch;
  decision?: PatchDecision;
};

export class InMemoryResearchMemoryDB implements ResearchMemoryDB {
  private projectRoot: string | null = null;
  private projectId: string | null = null;
  private readonly nodes = new Map<string, MemoryNode>();
  private readonly outgoingEdges = new Map<string, MemoryEdge[]>();
  private readonly patches = new Map<string, StoredPatch>();

  async init(projectRoot: string, options: ResearchMemoryOptions): Promise<void> {
    this.projectRoot = projectRoot;
    this.projectId = options.projectId;
  }

  async close(): Promise<void> {
    this.projectRoot = null;
    this.projectId = null;
  }

  async upsertNode(node: MemoryNode): Promise<void> {
    const parsed = memoryNodeSchema.parse(node);
    this.nodes.set(parsed.id, parsed);
  }

  async getNode(stableId: string): Promise<MemoryNode | null> {
    return this.nodes.get(stableId) ?? null;
  }

  async link(edge: MemoryEdge): Promise<void> {
    const parsed = memoryEdgeSchema.parse(edge);
    const edges = this.outgoingEdges.get(parsed.source_id) ?? [];
    const withoutDuplicate = edges.filter((item) => item.id !== parsed.id);
    this.outgoingEdges.set(parsed.source_id, [...withoutDuplicate, parsed]);
  }

  async getEdges(stableId: string): Promise<MemoryEdge[]> {
    return [...(this.outgoingEdges.get(stableId) ?? [])];
  }

  async search(input: MemorySearchInput): Promise<MemorySearchResult[]> {
    const query = input.query.trim().toLowerCase();
    if (!query) {
      return [];
    }

    const results: MemorySearchResult[] = [];
    for (const node of this.nodes.values()) {
      if (node.project_id !== input.project_id) {
        continue;
      }
      if (input.node_types && !input.node_types.includes(node.type)) {
        continue;
      }

      const matched_fields: string[] = [];
      let score = 0;
      if (node.title.toLowerCase().includes(query)) {
        matched_fields.push("title");
        score += 2;
      }
      if (node.type.toLowerCase().includes(query)) {
        matched_fields.push("type");
        score += 1;
      }
      if (JSON.stringify(node.payload).toLowerCase().includes(query)) {
        matched_fields.push("payload");
        score += 1;
      }

      if (score > 0) {
        results.push({ node, score, matched_fields });
      }
    }

    return results
      .sort((left, right) => right.score - left.score || left.node.id.localeCompare(right.node.id))
      .slice(0, input.limit ?? results.length);
  }

  async contextPack(input: ContextPackInput): Promise<ContextPack> {
    const depth = input.depth ?? 1;
    const limit = input.limit ?? 50;
    const warnings: string[] = [];
    const selectedNodes = new Map<string, MemoryNode>();
    const selectedEdges = new Map<string, MemoryEdge>();
    const queue = input.seed_ids.map((id) => ({ id, depth: 0 }));
    const visited = new Set<string>();

    while (queue.length > 0 && selectedNodes.size < limit) {
      const current = queue.shift() as { id: string; depth: number };
      if (visited.has(current.id)) {
        continue;
      }
      visited.add(current.id);

      const node = this.nodes.get(current.id);
      if (!node || node.project_id !== input.project_id) {
        warnings.push(`missing seed or node: ${current.id}`);
        continue;
      }

      selectedNodes.set(node.id, node);
      if (current.depth >= depth) {
        continue;
      }

      for (const edge of this.outgoingEdges.get(node.id) ?? []) {
        if (edge.project_id !== input.project_id) {
          continue;
        }
        selectedEdges.set(edge.id, edge);
        queue.push({ id: edge.target_id, depth: current.depth + 1 });
      }
    }

    return {
      project_id: input.project_id,
      seed_ids: input.seed_ids,
      nodes: [...selectedNodes.values()],
      edges: [...selectedEdges.values()],
      warnings
    };
  }

  async beginPatch(patch: GraphPatch): Promise<void> {
    const parsed = graphPatchSchema.parse(patch);
    this.patches.set(parsed.patch_id, { patch: parsed });
  }

  async applyPatch(patchId: string, decision: PatchDecision): Promise<void> {
    const stored = this.patches.get(patchId);
    if (!stored) {
      throw new Error(`patch not found: ${patchId}`);
    }
    this.patches.set(patchId, { ...stored, decision });
    if (!decision.accepted) {
      return;
    }
    for (const node of stored.patch.new_nodes) {
      await this.upsertNode(node);
    }
    for (const edge of stored.patch.new_edges) {
      await this.link(edge);
    }
  }

  async snapshot(outputPath: string): Promise<void> {
    writeFileSync(
      outputPath,
      `${JSON.stringify({
        projectId: this.projectId,
        nodes: [...this.nodes.values()],
        edges: [...this.outgoingEdges.values()].flat(),
        patches: [...this.patches.values()]
      })}\n`,
      "utf8"
    );
  }

  async restore(snapshotPath: string): Promise<void> {
    const parsed = JSON.parse(readFileSync(snapshotPath, "utf8")) as {
      projectId: string | null;
      nodes: MemoryNode[];
      edges: MemoryEdge[];
      patches: StoredPatch[];
    };
    this.projectId = parsed.projectId;
    this.nodes.clear();
    this.outgoingEdges.clear();
    this.patches.clear();
    for (const node of parsed.nodes) {
      await this.upsertNode(node);
    }
    for (const edge of parsed.edges) {
      await this.link(edge);
    }
    for (const stored of parsed.patches) {
      this.patches.set(stored.patch.patch_id, stored);
    }
  }
}
