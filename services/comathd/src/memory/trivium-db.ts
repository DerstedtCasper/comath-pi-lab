import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { InMemoryStableIdMap, type StableIdMap } from "../db/stable-id-map.js";
import { assertPathAllowed } from "../security/path-policy.js";
import {
  graphPatchSchema,
  memoryEdgeSchema,
  memoryNodeSchema,
  type GraphPatch,
  type MemoryEdge,
  type MemoryNode,
  type MemoryNodeType
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
import { type TriviumCapabilityReport, type TriviumNativeModule, probeTriviumCapability } from "./trivium-capability.js";
import { InMemoryResearchMemoryDB } from "./in-memory-research-memory-db.js";

type StoredPatch = {
  patch: GraphPatch;
  decision?: PatchDecision;
};

type NativeDatabaseHandle = {
  insert?: (...args: unknown[]) => unknown;
  insertWithId?: (...args: unknown[]) => unknown;
  insert_with_id?: (...args: unknown[]) => unknown;
  link?: (...args: unknown[]) => unknown;
  search?: (...args: unknown[]) => unknown;
  get_edges?: (...args: unknown[]) => unknown;
  getEdges?: (...args: unknown[]) => unknown;
  flush?: () => unknown;
  close?: () => unknown;
};

type TriviumResearchMemoryDBOptions = {
  nativeModule?: TriviumNativeModule;
  stableIdMap?: StableIdMap;
  backendLabel?: string;
};

export type ResearchMemoryDBFactoryInput = {
  projectRoot: string;
  projectId: string;
  backend?: "memory" | "trivium";
  fallbackToMemory?: boolean;
  requireNative?: boolean;
  probe?: () => Promise<TriviumCapabilityReport>;
};

export type ResearchMemoryDBFactoryResult = {
  backend: "memory" | "trivium";
  db: ResearchMemoryDB;
  capability?: TriviumCapabilityReport;
  warnings: string[];
};

function now(): string {
  return new Date().toISOString();
}

function payloadHash(value: unknown): string {
  return JSON.stringify(value);
}

function nativeDatabaseConstructor(nativeModule: TriviumNativeModule | undefined): unknown {
  if (!nativeModule) {
    return undefined;
  }
  if (nativeModule.Database) {
    return nativeModule.Database;
  }
  const defaultExport = nativeModule.default;
  if (defaultExport && typeof defaultExport === "object" && "Database" in defaultExport) {
    return (defaultExport as { Database?: unknown }).Database;
  }
  return undefined;
}

async function openNativeDatabase(nativeModule: TriviumNativeModule | undefined, dbPath: string): Promise<NativeDatabaseHandle | null> {
  const Database = nativeDatabaseConstructor(nativeModule);
  if (typeof Database !== "function") {
    return null;
  }
  const ctor = Database as {
    open?: (path: string) => unknown;
    openWithConfig?: (path: string, config?: unknown) => unknown;
    open_with_config?: (path: string, config?: unknown) => unknown;
    new (path: string): unknown;
  };
  const opened =
    typeof ctor.open === "function"
      ? await ctor.open(dbPath)
      : typeof ctor.openWithConfig === "function"
        ? await ctor.openWithConfig(dbPath)
        : typeof ctor.open_with_config === "function"
          ? await ctor.open_with_config(dbPath)
          : new ctor(dbPath);
  return opened && typeof opened === "object" ? (opened as NativeDatabaseHandle) : null;
}

async function maybeCall(method: ((...args: unknown[]) => unknown) | undefined, self: unknown, args: unknown[]): Promise<unknown> {
  if (typeof method !== "function") {
    return undefined;
  }
  return method.apply(self, args);
}

async function closeNative(handle: NativeDatabaseHandle | null): Promise<void> {
  if (!handle) {
    return;
  }
  if (typeof handle.flush === "function") {
    await handle.flush.call(handle);
  }
  if (typeof handle.close === "function") {
    await handle.close.call(handle);
  }
}

export class TriviumResearchMemoryDB implements ResearchMemoryDB {
  private readonly stableIdMap: StableIdMap;
  private readonly nativeModule?: TriviumNativeModule;
  private readonly nodes = new Map<string, MemoryNode>();
  private readonly outgoingEdges = new Map<string, MemoryEdge[]>();
  private readonly patches = new Map<string, StoredPatch>();
  private projectRoot: string | null = null;
  private projectId: string | null = null;
  private nextNativeId = 1;
  private nativeHandle: NativeDatabaseHandle | null = null;
  readonly backendLabel: string;

  constructor(options: TriviumResearchMemoryDBOptions = {}) {
    this.stableIdMap = options.stableIdMap ?? new InMemoryStableIdMap();
    this.nativeModule = options.nativeModule;
    this.backendLabel = options.backendLabel ?? "trivium";
  }

  getStableIdMap(): StableIdMap {
    return this.stableIdMap;
  }

  async init(projectRoot: string, options: ResearchMemoryOptions): Promise<void> {
    this.projectRoot = projectRoot;
    this.projectId = options.projectId;
    const dbDir = assertPathAllowed(projectRoot, join(".comath", "db"), { purpose: "runtime-write" });
    mkdirSync(dbDir, { recursive: true });
    this.nativeHandle = await openNativeDatabase(this.nativeModule, join(dbDir, "research-memory.tdb"));
  }

  async close(): Promise<void> {
    await closeNative(this.nativeHandle);
    this.nativeHandle = null;
    this.projectRoot = null;
    this.projectId = null;
  }

  private async bindStableId(stableId: string, nodeType: MemoryNodeType, hash: string): Promise<number> {
    const projectId = this.projectId;
    if (!projectId) {
      throw new Error("TriviumResearchMemoryDB is not initialized");
    }
    const existing = await this.stableIdMap.getByStableId(projectId, stableId);
    if (existing) {
      await this.stableIdMap.updatePayloadHash(projectId, stableId, hash, now());
      return existing.trivium_id;
    }
    const triviumId = this.nextNativeId++;
    const timestamp = now();
    await this.stableIdMap.bind({
      project_id: projectId,
      stable_id: stableId,
      trivium_id: triviumId,
      node_type: nodeType,
      payload_hash: hash,
      created_at: timestamp,
      updated_at: timestamp
    });
    return triviumId;
  }

  async upsertNode(node: MemoryNode): Promise<void> {
    const parsed = memoryNodeSchema.parse(node);
    const triviumId = await this.bindStableId(parsed.id, parsed.type, payloadHash(parsed.payload));
    this.nodes.set(parsed.id, parsed);
    const insertWithId = this.nativeHandle?.insertWithId ?? this.nativeHandle?.insert_with_id;
    if (insertWithId) {
      await maybeCall(insertWithId, this.nativeHandle, [triviumId, parsed.title, parsed.payload]);
      return;
    }
    await maybeCall(this.nativeHandle?.insert, this.nativeHandle, [parsed.title, parsed.payload]);
  }

  async getNode(stableId: string): Promise<MemoryNode | null> {
    return this.nodes.get(stableId) ?? null;
  }

  async link(edge: MemoryEdge): Promise<void> {
    const parsed = memoryEdgeSchema.parse(edge);
    await this.bindStableId(parsed.id, "DomainObject", payloadHash(parsed));
    const edges = this.outgoingEdges.get(parsed.source_id) ?? [];
    const withoutDuplicate = edges.filter((item) => item.id !== parsed.id);
    this.outgoingEdges.set(parsed.source_id, [...withoutDuplicate, parsed]);
    const source = this.projectId ? await this.stableIdMap.getByStableId(this.projectId, parsed.source_id) : null;
    const target = this.projectId ? await this.stableIdMap.getByStableId(this.projectId, parsed.target_id) : null;
    await maybeCall(this.nativeHandle?.link, this.nativeHandle, [
      source?.trivium_id ?? parsed.source_id,
      target?.trivium_id ?? parsed.target_id,
      parsed.label
    ]);
  }

  async getEdges(stableId: string): Promise<MemoryEdge[]> {
    return [...(this.outgoingEdges.get(stableId) ?? [])];
  }

  async search(input: MemorySearchInput): Promise<MemorySearchResult[]> {
    const query = input.query.trim().toLowerCase();
    if (!query) {
      return [];
    }
    await maybeCall(this.nativeHandle?.search, this.nativeHandle, [input.query, input.limit ?? 20]);
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
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(
      outputPath,
      `${JSON.stringify({
        projectRoot: this.projectRoot,
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
      projectRoot: string | null;
      projectId: string | null;
      nodes: MemoryNode[];
      edges: MemoryEdge[];
      patches: StoredPatch[];
    };
    this.projectRoot = parsed.projectRoot;
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

export async function createResearchMemoryDB(input: ResearchMemoryDBFactoryInput): Promise<ResearchMemoryDBFactoryResult> {
  if ((input.backend ?? "memory") === "memory") {
    const db = new InMemoryResearchMemoryDB();
    await db.init(input.projectRoot, { projectId: input.projectId, backend: "memory" });
    return { backend: "memory", db, warnings: [] };
  }

  const capability = await (input.probe ?? (() => probeTriviumCapability({ openProbeProjectRoot: input.projectRoot })))();
  if (!capability.available) {
    if (input.requireNative || input.fallbackToMemory === false) {
      throw new Error(
        `TriviumDB backend requested but unavailable${capability.loadError ? `: ${capability.loadError}` : ""}`
      );
    }
    const db = new InMemoryResearchMemoryDB();
    await db.init(input.projectRoot, { projectId: input.projectId, backend: "memory" });
    return {
      backend: "memory",
      db,
      capability,
      warnings: ["TriviumDB unavailable; falling back to in-memory ResearchMemoryDB"]
    };
  }

  const db = new TriviumResearchMemoryDB({ nativeModule: capability.nativeModule });
  await db.init(input.projectRoot, { projectId: input.projectId, backend: "trivium" });
  return { backend: "trivium", db, capability, warnings: [] };
}
