import { stableIdMapEntrySchema, type StableIdMapEntry } from "../types/schemas.js";

export interface StableIdMap {
  bind(entry: StableIdMapEntry): Promise<void>;
  getByStableId(projectId: string, stableId: string): Promise<StableIdMapEntry | null>;
  getByTriviumId(projectId: string, triviumId: number): Promise<StableIdMapEntry | null>;
  updatePayloadHash(projectId: string, stableId: string, payloadHash: string, updatedAt: string): Promise<void>;
}

function stableKey(projectId: string, stableId: string): string {
  return `${projectId}:${stableId}`;
}

function triviumKey(projectId: string, triviumId: number): string {
  return `${projectId}:${triviumId}`;
}

export class InMemoryStableIdMap implements StableIdMap {
  private readonly byStableId = new Map<string, StableIdMapEntry>();
  private readonly byTriviumId = new Map<string, StableIdMapEntry>();

  async bind(entry: StableIdMapEntry): Promise<void> {
    const parsed = stableIdMapEntrySchema.parse(entry);
    const stable = stableKey(parsed.project_id, parsed.stable_id);
    const trivium = triviumKey(parsed.project_id, parsed.trivium_id);
    const existingStable = this.byStableId.get(stable);
    const existingTrivium = this.byTriviumId.get(trivium);

    if (existingStable && existingStable.trivium_id !== parsed.trivium_id) {
      throw new Error(`conflicting stable_id mapping for ${parsed.stable_id}`);
    }

    if (existingTrivium && existingTrivium.stable_id !== parsed.stable_id) {
      throw new Error(`conflicting trivium_id mapping for ${parsed.trivium_id}`);
    }

    this.byStableId.set(stable, parsed);
    this.byTriviumId.set(trivium, parsed);
  }

  async getByStableId(projectId: string, stableId: string): Promise<StableIdMapEntry | null> {
    return this.byStableId.get(stableKey(projectId, stableId)) ?? null;
  }

  async getByTriviumId(projectId: string, triviumId: number): Promise<StableIdMapEntry | null> {
    return this.byTriviumId.get(triviumKey(projectId, triviumId)) ?? null;
  }

  async updatePayloadHash(projectId: string, stableId: string, payloadHash: string, updatedAt: string): Promise<void> {
    const existing = await this.getByStableId(projectId, stableId);
    if (!existing) {
      throw new Error(`stable_id not bound: ${stableId}`);
    }

    const updated = stableIdMapEntrySchema.parse({
      ...existing,
      payload_hash: payloadHash,
      updated_at: updatedAt
    });
    this.byStableId.set(stableKey(projectId, stableId), updated);
    this.byTriviumId.set(triviumKey(projectId, updated.trivium_id), updated);
  }
}
