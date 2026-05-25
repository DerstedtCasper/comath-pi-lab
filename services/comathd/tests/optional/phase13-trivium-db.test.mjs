import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  TriviumResearchMemoryDB,
  graphPatchSchema,
  initProject,
  probeTriviumCapability
} from "../../dist/index.js";

if (process.env.COMATH_ENABLE_TRIVIUM_TESTS !== "1") {
  console.log("Phase 13 optional TriviumDB native tests skipped; set COMATH_ENABLE_TRIVIUM_TESTS=1 to run.");
  process.exit(0);
}

const timestamp = "2026-05-25T00:00:00.000Z";
const projectRoot = mkdtempSync(join(tmpdir(), "comath-trivium-native-"));

function node(id, title, payload = {}) {
  return {
    id,
    project_id: "PRJ-0001",
    type: "Claim",
    title,
    payload,
    created_at: timestamp,
    updated_at: timestamp
  };
}

function edge(id, source_id, target_id, label = "depends_on") {
  return {
    id,
    project_id: "PRJ-0001",
    source_id,
    target_id,
    label,
    created_at: timestamp
  };
}

try {
  initProject({ name: "Native Trivium Project", root_path: projectRoot });
  const capability = await probeTriviumCapability({ openProbeProjectRoot: projectRoot });
  assert.equal(capability.available, true, capability.loadError ?? "TriviumDB native package unavailable");

  const db = new TriviumResearchMemoryDB({ nativeModule: capability.nativeModule });
  await db.init(projectRoot, { projectId: "PRJ-0001", backend: "trivium" });
  await db.upsertNode(node("C-0001", "Native stable claim", { text: "braid statistics" }));
  await db.upsertNode(node("C-0002", "Native target claim"));
  await db.link(edge("EDGE-0001", "C-0001", "C-0002"));

  assert.equal((await db.getNode("C-0001"))?.id, "C-0001");
  assert.equal((await db.getEdges("C-0001"))[0].target_id, "C-0002");
  assert.equal((await db.getStableIdMap().getByStableId("PRJ-0001", "C-0001"))?.stable_id, "C-0001");
  assert.equal(Number.isInteger((await db.getStableIdMap().getByStableId("PRJ-0001", "C-0001"))?.trivium_id), true);

  const search = await db.search({ project_id: "PRJ-0001", query: "braid", limit: 5 });
  assert.equal(search.some((item) => item.node.id === "C-0001"), true);
  const context = await db.contextPack({ project_id: "PRJ-0001", seed_ids: ["C-0001"], depth: 1 });
  assert.deepEqual(context.nodes.map((item) => item.id).sort(), ["C-0001", "C-0002"]);

  const patch = graphPatchSchema.parse({
    patch_id: "GP-0001",
    project_id: "PRJ-0001",
    state: "proposed",
    provenance: {
      created_by: "WS-0001",
      created_at: timestamp
    },
    new_nodes: [node("C-0003", "Native patch node")],
    new_edges: [edge("EDGE-0003", "C-0002", "C-0003")],
    updated_nodes: [],
    candidate_conflicts: [],
    warnings: []
  });
  await db.beginPatch(patch);
  await db.applyPatch("GP-0001", { accepted: true, reviewer: "native-trivium-test" });
  assert.equal((await db.getNode("C-0003"))?.id, "C-0003");

  const snapshotPath = join(projectRoot, ".comath", "db", "native-snapshot.json");
  await db.snapshot(snapshotPath);
  await db.close();

  const restored = new TriviumResearchMemoryDB({ nativeModule: capability.nativeModule });
  await restored.init(projectRoot, { projectId: "PRJ-0001", backend: "trivium" });
  await restored.restore(snapshotPath);
  assert.equal((await restored.getNode("C-0001"))?.id, "C-0001");
  assert.equal((await restored.getEdges("C-0001"))[0].source_id, "C-0001");
  await restored.close();
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 13 optional TriviumDB native tests passed.");
