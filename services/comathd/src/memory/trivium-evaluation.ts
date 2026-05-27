import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { performance } from "node:perf_hooks";
import { assertPathAllowed } from "../security/path-policy.js";
import type { MemoryEdge, MemoryNode } from "../types/schemas.js";
import { type TriviumCapabilityReport, probeTriviumCapability } from "./trivium-capability.js";
import { TriviumResearchMemoryDB } from "./trivium-db.js";

export type TriviumTargetEvaluationReport = {
  result: "pass" | "fail";
  backend: "trivium" | "unavailable";
  project_id: string;
  sample_size: number;
  report_path: string;
  fallback_used: boolean;
  capability: Omit<TriviumCapabilityReport, "nativeModule">;
  performance: {
    upsert_ms: number;
    upsert_ms_per_node: number;
    search_ms: number;
    context_ms: number;
    search_top_hit_ratio: number;
  };
  persistence_reopen: {
    result: "pass" | "fail";
    checked_node_id?: string;
    checked_edge_id?: string;
  };
  hard_vetoes: string[];
  warnings: string[];
};

export type TriviumTargetEvaluationOptions = {
  projectRoot: string;
  projectId: string;
  sampleSize?: number;
  minSearchTopHitRatio?: number;
  maxUpsertMsPerNode?: number;
  requireNative?: boolean;
  probe?: () => Promise<TriviumCapabilityReport>;
  now?: () => string;
};

const defaultReportPath = ".comath/db/trivium-target-evaluation.json";

function stripNativeModule(capability: TriviumCapabilityReport): Omit<TriviumCapabilityReport, "nativeModule"> {
  const { nativeModule: _nativeModule, ...rest } = capability;
  return rest;
}

function writeEvaluationReport(projectRoot: string, report: TriviumTargetEvaluationReport): void {
  const absolutePath = assertPathAllowed(projectRoot, report.report_path, { purpose: "runtime-write" });
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function timestamp(now: (() => string) | undefined): string {
  return now ? now() : new Date().toISOString();
}

function makeNode(input: { id: string; projectId: string; title: string; keyword: string; createdAt: string }): MemoryNode {
  return {
    id: input.id,
    project_id: input.projectId,
    type: "Claim",
    title: input.title,
    payload: {
      text: `${input.keyword} payload for ${input.id}`,
      benchmark_keyword: input.keyword
    },
    created_at: input.createdAt,
    updated_at: input.createdAt
  };
}

function makeEdge(input: { id: string; projectId: string; source: string; target: string; createdAt: string }): MemoryEdge {
  return {
    id: input.id,
    project_id: input.projectId,
    source_id: input.source,
    target_id: input.target,
    label: "depends_on",
    created_at: input.createdAt
  };
}

function emptyPerformance(): TriviumTargetEvaluationReport["performance"] {
  return {
    upsert_ms: 0,
    upsert_ms_per_node: 0,
    search_ms: 0,
    context_ms: 0,
    search_top_hit_ratio: 0
  };
}

export async function evaluateTriviumTargetPlatform(
  options: TriviumTargetEvaluationOptions
): Promise<TriviumTargetEvaluationReport> {
  const sampleSize = Math.max(1, Math.trunc(options.sampleSize ?? 32));
  const minSearchTopHitRatio = options.minSearchTopHitRatio ?? 0.95;
  const maxUpsertMsPerNode = options.maxUpsertMsPerNode ?? 250;
  const capability = await (options.probe ?? (() => probeTriviumCapability({ openProbeProjectRoot: options.projectRoot })))();
  const reportBase = {
    project_id: options.projectId,
    sample_size: sampleSize,
    report_path: defaultReportPath,
    fallback_used: false,
    capability: stripNativeModule(capability)
  };

  if (!capability.available) {
    const report: TriviumTargetEvaluationReport = {
      ...reportBase,
      result: "fail",
      backend: "unavailable",
      performance: emptyPerformance(),
      persistence_reopen: { result: "fail" },
      hard_vetoes: ["trivium_native_unavailable"],
      warnings: capability.loadError ? [capability.loadError] : []
    };
    writeEvaluationReport(options.projectRoot, report);
    return report;
  }

  const createdAt = timestamp(options.now);
  const db = new TriviumResearchMemoryDB({ nativeModule: capability.nativeModule });
  await db.init(options.projectRoot, { projectId: options.projectId, backend: "trivium" });

  const nodes = Array.from({ length: sampleSize }, (_, index) => {
    const ordinal = String(index + 1).padStart(4, "0");
    return makeNode({
      id: `TEVAL-${ordinal}`,
      projectId: options.projectId,
      title: `Trivium evaluation node ${ordinal}`,
      keyword: `trivium_eval_keyword_${ordinal}`,
      createdAt
    });
  });

  const edges = nodes.slice(1).map((node, index) =>
    makeEdge({
      id: `EDGE-${String(index + 1).padStart(4, "0")}`,
      projectId: options.projectId,
      source: nodes[index].id,
      target: node.id,
      createdAt
    })
  );

  const upsertStart = performance.now();
  for (const node of nodes) {
    await db.upsertNode(node);
  }
  for (const edge of edges) {
    await db.link(edge);
  }
  const upsertMs = performance.now() - upsertStart;

  let topHits = 0;
  const searchStart = performance.now();
  for (const node of nodes) {
    const results = await db.search({ project_id: options.projectId, query: node.payload.benchmark_keyword as string, limit: 1 });
    if (results[0]?.node.id === node.id) {
      topHits += 1;
    }
  }
  const searchMs = performance.now() - searchStart;

  const contextStart = performance.now();
  await db.contextPack({ project_id: options.projectId, seed_ids: [nodes[0].id], depth: 1, limit: sampleSize });
  const contextMs = performance.now() - contextStart;

  const snapshotPath = assertPathAllowed(options.projectRoot, join(".comath", "db", "trivium-target-evaluation-snapshot.json"), {
    purpose: "runtime-write"
  });
  await db.snapshot(snapshotPath);
  await db.close();

  const restored = new TriviumResearchMemoryDB({ nativeModule: capability.nativeModule });
  await restored.init(options.projectRoot, { projectId: options.projectId, backend: "trivium" });
  await restored.restore(snapshotPath);
  const reopenedNode = await restored.getNode(nodes[0].id);
  const reopenedEdges = await restored.getEdges(nodes[0].id);
  await restored.close();

  const searchTopHitRatio = topHits / sampleSize;
  const upsertMsPerNode = upsertMs / sampleSize;
  const hardVetoes: string[] = [];
  if (!reopenedNode || reopenedEdges[0]?.id !== edges[0]?.id) {
    hardVetoes.push("trivium_persistence_reopen_failed");
  }
  if (searchTopHitRatio < minSearchTopHitRatio) {
    hardVetoes.push("trivium_search_quality_below_threshold");
  }
  if (upsertMsPerNode > maxUpsertMsPerNode) {
    hardVetoes.push("trivium_upsert_latency_above_threshold");
  }

  const report: TriviumTargetEvaluationReport = {
    ...reportBase,
    result: hardVetoes.length === 0 ? "pass" : "fail",
    backend: "trivium",
    performance: {
      upsert_ms: upsertMs,
      upsert_ms_per_node: upsertMsPerNode,
      search_ms: searchMs,
      context_ms: contextMs,
      search_top_hit_ratio: searchTopHitRatio
    },
    persistence_reopen: {
      result: reopenedNode && reopenedEdges[0]?.id === edges[0]?.id ? "pass" : "fail",
      checked_node_id: reopenedNode?.id,
      checked_edge_id: reopenedEdges[0]?.id
    },
    hard_vetoes: hardVetoes,
    warnings: []
  };
  writeEvaluationReport(options.projectRoot, report);
  return report;
}
