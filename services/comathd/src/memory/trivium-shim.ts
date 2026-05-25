import type {
  ContextPack,
  ContextPackInput,
  MemorySearchInput,
  MemorySearchResult,
  PatchDecision,
  ResearchMemoryDB,
  ResearchMemoryOptions
} from "./research-memory-db.js";
import type { GraphPatch, MemoryEdge, MemoryNode } from "../types/schemas.js";

export class TriviumUnavailableError extends Error {
  constructor() {
    super("TriviumDB backend unavailable before Phase 13");
    this.name = "TriviumUnavailableError";
  }
}

function unavailable(): never {
  throw new TriviumUnavailableError();
}

export class TriviumUnavailableResearchMemoryDB implements ResearchMemoryDB {
  async init(_projectRoot: string, _options: ResearchMemoryOptions): Promise<void> {
    unavailable();
  }

  async close(): Promise<void> {
    unavailable();
  }

  async upsertNode(_node: MemoryNode): Promise<void> {
    unavailable();
  }

  async getNode(_stableId: string): Promise<MemoryNode | null> {
    unavailable();
  }

  async link(_edge: MemoryEdge): Promise<void> {
    unavailable();
  }

  async getEdges(_stableId: string): Promise<MemoryEdge[]> {
    unavailable();
  }

  async search(_input: MemorySearchInput): Promise<MemorySearchResult[]> {
    unavailable();
  }

  async contextPack(_input: ContextPackInput): Promise<ContextPack> {
    unavailable();
  }

  async beginPatch(_patch: GraphPatch): Promise<void> {
    unavailable();
  }

  async applyPatch(_patchId: string, _decision: PatchDecision): Promise<void> {
    unavailable();
  }

  async snapshot(_outputPath: string): Promise<void> {
    unavailable();
  }

  async restore(_snapshotPath: string): Promise<void> {
    unavailable();
  }
}
