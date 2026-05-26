import { appendProvenanceEvent, readProvenanceEvents } from "../provenance/ledger.js";
import { memoryNodeSchema, type MathGraphIndexHealth, type MemoryEdge, type MemoryNode } from "../types/schemas.js";
import type { MemorySearchInput, MemorySearchResult, ResearchMemoryDB } from "./research-memory-db.js";

export type MathGraphIndexOptions = {
  db: ResearchMemoryDB;
  backend: string;
  projectRoot: string;
  projectId: string;
};

export interface MathGraphIndex {
  init(projectRoot: string, projectId: string): Promise<void>;
  close(): Promise<void>;
  health(): Promise<MathGraphIndexHealth>;
  upsertNode(node: MemoryNode): Promise<void>;
  link(edge: MemoryEdge): Promise<void>;
  hybridSearch(input: MemorySearchInput): Promise<MemorySearchResult[]>;
  neighbors(projectId: string, stableId: string): Promise<MemoryEdge[]>;
  rebuildFromLedger(): Promise<MathGraphIndexHealth>;
}

export function createMathGraphIndex(options: MathGraphIndexOptions): MathGraphIndex {
  let projectRoot = options.projectRoot;
  let projectId = options.projectId;
  let lastRebuild: MathGraphIndexHealth["last_rebuild"];

  function healthSnapshot(): MathGraphIndexHealth {
    return {
      backend: options.backend,
      truth_source: "provenance-ledger",
      derived_index: true,
      degraded: false,
      rebuildable: true,
      last_rebuild: lastRebuild
    };
  }

  return {
    async init(root: string, id: string): Promise<void> {
      projectRoot = root;
      projectId = id;
      await options.db.init(projectRoot, { projectId, backend: options.backend === "trivium" ? "trivium" : "memory" });
    },
    async close(): Promise<void> {
      await options.db.close();
    },
    async health(): Promise<MathGraphIndexHealth> {
      return healthSnapshot();
    },
    async upsertNode(node: MemoryNode): Promise<void> {
      await options.db.upsertNode(node);
    },
    async link(edge: MemoryEdge): Promise<void> {
      await options.db.link(edge);
    },
    async hybridSearch(input: MemorySearchInput): Promise<MemorySearchResult[]> {
      return options.db.search(input);
    },
    async neighbors(_projectId: string, stableId: string): Promise<MemoryEdge[]> {
      return options.db.getEdges(stableId);
    },
    async rebuildFromLedger(): Promise<MathGraphIndexHealth> {
      let indexedNodes = 0;
      const warnings: string[] = [];
      for (const event of readProvenanceEvents(projectRoot, projectId)) {
        if (event.event_type !== "claim.registered" || !event.target_id) {
          continue;
        }
        const payload = event.payload;
        try {
          const node = memoryNodeSchema.parse({
            id: event.target_id,
            project_id: event.project_id,
            type: typeof payload.type === "string" ? payload.type : "Claim",
            title: typeof payload.title === "string" ? payload.title : event.target_id,
            payload,
            created_at: event.created_at,
            updated_at: event.created_at
          });
          await options.db.upsertNode(node);
          indexedNodes += 1;
        } catch (error) {
          warnings.push(`skipped provenance event ${event.id}`);
        }
      }
      lastRebuild = {
        indexed_nodes: indexedNodes,
        indexed_edges: 0,
        warnings
      };
      appendProvenanceEvent(projectRoot, {
        project_id: projectId,
        event_type: "index.rebuilt",
        actor: "math-graph-index",
        payload: lastRebuild
      });
      return healthSnapshot();
    }
  };
}
