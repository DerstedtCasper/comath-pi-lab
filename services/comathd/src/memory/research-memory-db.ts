import type { GraphPatch, MemoryEdge, MemoryNode, MemoryNodeType } from "../types/schemas.js";

export type ResearchMemoryOptions = {
  projectId: string;
  backend?: "memory" | "trivium-shim" | "trivium";
};

export type MemorySearchInput = {
  project_id: string;
  query: string;
  limit?: number;
  node_types?: MemoryNodeType[];
};

export type MemorySearchResult = {
  node: MemoryNode;
  score: number;
  matched_fields: string[];
};

export type ContextPackInput = {
  project_id: string;
  seed_ids: string[];
  depth?: number;
  limit?: number;
};

export type ContextPack = {
  project_id: string;
  seed_ids: string[];
  nodes: MemoryNode[];
  edges: MemoryEdge[];
  warnings: string[];
};

export type PatchDecision = {
  accepted: boolean;
  reviewer: string;
  notes?: string;
};

export interface ResearchMemoryDB {
  init(projectRoot: string, options: ResearchMemoryOptions): Promise<void>;
  close(): Promise<void>;
  upsertNode(node: MemoryNode): Promise<void>;
  getNode(stableId: string): Promise<MemoryNode | null>;
  link(edge: MemoryEdge): Promise<void>;
  getEdges(stableId: string): Promise<MemoryEdge[]>;
  search(input: MemorySearchInput): Promise<MemorySearchResult[]>;
  contextPack(input: ContextPackInput): Promise<ContextPack>;
  beginPatch(patch: GraphPatch): Promise<void>;
  applyPatch(patchId: string, decision: PatchDecision): Promise<void>;
  snapshot(outputPath: string): Promise<void>;
  restore(snapshotPath: string): Promise<void>;
}
