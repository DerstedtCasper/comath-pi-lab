import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as comathd from "../../dist/index.js";

const timestamp = "2026-05-28T00:00:00.000Z";

class FakeDatabase {
  constructor(path) {
    this.path = path;
    this.nodes = new Map();
    this.edges = [];
  }

  static async open(path) {
    return new FakeDatabase(path);
  }

  async insertWithId(id, title, payload) {
    this.nodes.set(id, { id, title, payload });
  }

  async link(source, target, label) {
    this.edges.push({ source, target, label });
  }

  async search(query, limit) {
    return [...this.nodes.values()].filter((node) => JSON.stringify(node).includes(query)).slice(0, limit ?? 20);
  }

  async flush() {}
  async close() {}
}

function availableProbe() {
  return {
    available: true,
    packageName: "triviumdb",
    packageVersion: "fake-0.7.1",
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    canOpenDatabase: true,
    ffiDisabled: false,
    fallbackBackend: "memory",
    diagnostics: ["fake native module loaded", "database open probe passed"],
    nativeModule: { version: "fake-0.7.1", Database: FakeDatabase }
  };
}

const projectRoot = mkdtempSync(join(tmpdir(), "comath-trivium-eval-"));

try {
  assert.equal(typeof comathd.evaluateTriviumTargetPlatform, "function", "Phase 38 must export evaluateTriviumTargetPlatform");
  comathd.initProject({ name: "Trivium Evaluation Project", root_path: projectRoot });

  const unavailable = await comathd.evaluateTriviumTargetPlatform({
    projectRoot,
    projectId: "PRJ-0001",
    sampleSize: 8,
    requireNative: true,
    probe: async () => ({
      available: false,
      packageName: "triviumdb",
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      canOpenDatabase: false,
      ffiDisabled: false,
      fallbackBackend: "memory",
      loadError: "native package missing",
      diagnostics: ["native module load failed"]
    })
  });
  assert.equal(unavailable.result, "fail");
  assert.equal(unavailable.backend, "unavailable");
  assert.equal(unavailable.hard_vetoes.includes("trivium_native_unavailable"), true);
  assert.equal(unavailable.fallback_used, false);
  assert.equal(unavailable.report_path.endsWith(".comath/db/trivium-target-evaluation.json"), true);

  const report = await comathd.evaluateTriviumTargetPlatform({
    projectRoot,
    projectId: "PRJ-0001",
    sampleSize: 12,
    minSearchTopHitRatio: 1,
    maxUpsertMsPerNode: 100,
    requireNative: true,
    probe: async () => availableProbe(),
    now: () => timestamp
  });

  assert.equal(report.result, "pass");
  assert.equal(report.backend, "trivium");
  assert.equal(report.sample_size, 12);
  assert.equal(report.fallback_used, false);
  assert.equal(report.persistence_reopen.result, "pass");
  assert.equal(report.persistence_reopen.checked_node_id, "TEVAL-0001");
  assert.equal(report.persistence_reopen.checked_edge_id, "EDGE-0001");
  assert.equal(report.performance.search_top_hit_ratio, 1);
  assert.equal(report.performance.upsert_ms_per_node <= 100, true);
  assert.deepEqual(report.hard_vetoes, []);

  const persisted = JSON.parse(await readFile(join(projectRoot, report.report_path), "utf8"));
  assert.equal(persisted.result, "pass");
  assert.equal(persisted.capability.packageName, "triviumdb");
  assert.equal(persisted.performance.search_top_hit_ratio, 1);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 38 TriviumDB native evaluation tests passed.");
