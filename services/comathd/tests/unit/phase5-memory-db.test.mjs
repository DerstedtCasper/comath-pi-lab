import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  InMemoryResearchMemoryDB,
  InMemoryStableIdMap,
  TriviumUnavailableResearchMemoryDB,
  graphPatchSchema,
  initProject
} from "../../dist/index.js";

const timestamp = "2026-05-25T00:00:00.000Z";
const projectRoot = mkdtempSync(join(tmpdir(), "comath-memory-"));

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

function collectFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(path));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }
  return files;
}

try {
  initProject({ name: "Memory Project", root_path: projectRoot });
  const db = new InMemoryResearchMemoryDB();
  await db.init(projectRoot, { projectId: "PRJ-0001", backend: "memory" });

  await db.upsertNode(node("C-0001", "Alpha claim", { text: "braid statistic alpha" }));
  assert.equal((await db.getNode("C-0001"))?.title, "Alpha claim");

  await assert.rejects(() => db.upsertNode({ id: "bad" }), /project_id/);

  await db.upsertNode(node("C-0002", "Beta claim", { text: "beta invariant" }));
  await db.link(edge("EDGE-0001", "C-0001", "C-0002"));
  assert.equal((await db.getEdges("C-0001")).length, 1);
  await assert.rejects(() => db.link(edge("EDGE-0002", "C-0001", "C-0002", "magically_proves")), /label/);

  await db.upsertNode(node("C-0001", "Alpha claim revised", { text: "alpha revised" }));
  assert.equal((await db.getNode("C-0001"))?.title, "Alpha claim revised");

  const search = await db.search({ project_id: "PRJ-0001", query: "alpha", limit: 1 });
  assert.equal(search.length, 1);
  assert.equal(search[0].node.id, "C-0001");
  assert.equal(search[0].matched_fields.includes("title") || search[0].matched_fields.includes("payload"), true);

  const context = await db.contextPack({ project_id: "PRJ-0001", seed_ids: ["C-0001", "MISSING-0001"], depth: 1 });
  assert.equal(context.nodes.some((item) => item.id === "C-0001"), true);
  assert.equal(context.nodes.some((item) => item.id === "C-0002"), true);
  assert.equal(context.edges.length, 1);
  assert.equal(context.warnings.some((warning) => warning.includes("MISSING-0001")), true);

  const acceptedPatch = graphPatchSchema.parse({
    patch_id: "GP-0001",
    project_id: "PRJ-0001",
    state: "proposed",
    provenance: {
      created_by: "WS-0001",
      created_at: timestamp
    },
    new_nodes: [node("C-0003", "Gamma claim", { status: "draft" })],
    new_edges: [edge("EDGE-0003", "C-0002", "C-0003")],
    updated_nodes: [],
    candidate_conflicts: [],
    warnings: []
  });
  await db.beginPatch(acceptedPatch);
  await db.applyPatch("GP-0001", { accepted: true, reviewer: "phase5-test" });
  assert.equal((await db.getNode("C-0003"))?.title, "Gamma claim");

  const rejectedPatch = graphPatchSchema.parse({
    ...acceptedPatch,
    patch_id: "GP-0002",
    new_nodes: [node("C-0004", "Rejected claim", { status: "draft" })],
    new_edges: []
  });
  await db.beginPatch(rejectedPatch);
  await db.applyPatch("GP-0002", { accepted: false, reviewer: "phase5-test" });
  assert.equal(await db.getNode("C-0004"), null);

  await assert.rejects(
    () =>
      db.beginPatch({
        ...acceptedPatch,
        patch_id: "GP-0003",
        new_nodes: [node("C-0005", "Injected formal claim", { status: "formally_checked" })]
      }),
    /privileged claim status/
  );

  const idMap = new InMemoryStableIdMap();
  await idMap.bind({
    project_id: "PRJ-0001",
    stable_id: "C-0001",
    trivium_id: 1,
    node_type: "Claim",
    payload_hash: "hash-a",
    created_at: timestamp,
    updated_at: timestamp
  });
  assert.equal((await idMap.getByStableId("PRJ-0001", "C-0001"))?.trivium_id, 1);
  assert.equal((await idMap.getByTriviumId("PRJ-0001", 1))?.stable_id, "C-0001");
  await assert.rejects(
    () =>
      idMap.bind({
        project_id: "PRJ-0001",
        stable_id: "C-0001",
        trivium_id: 2,
        node_type: "Claim",
        payload_hash: "hash-b",
        created_at: timestamp,
        updated_at: timestamp
      }),
    /conflicting stable_id/
  );
  await assert.rejects(
    () =>
      idMap.bind({
        project_id: "PRJ-0001",
        stable_id: "C-0002",
        trivium_id: 1,
        node_type: "Claim",
        payload_hash: "hash-c",
        created_at: timestamp,
        updated_at: timestamp
      }),
    /conflicting trivium_id/
  );
  await idMap.updatePayloadHash("PRJ-0001", "C-0001", "hash-updated", timestamp);
  assert.equal((await idMap.getByStableId("PRJ-0001", "C-0001"))?.payload_hash, "hash-updated");

  const trivium = new TriviumUnavailableResearchMemoryDB();
  await assert.rejects(() => trivium.init(projectRoot, { projectId: "PRJ-0001", backend: "trivium-shim" }), /unavailable before Phase 13/);

  const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
  assert.equal(Object.hasOwn(packageJson.dependencies ?? {}, "triviumdb"), false);

  const srcRoot = join(process.cwd(), "src");
  const topLevelTriviumImport = /(?:^|\n)\s*import\s+(?:[^("'][\s\S]*?\s+from\s+)?["']triviumdb["']/;
  const triviumRequire = /require\s*\(\s*["']triviumdb["']\s*\)/;
  const dynamicTriviumImport = /import\s*\(\s*["']triviumdb["']\s*\)/;
  const allowedDynamicImportFiles = new Set(["memory/trivium-capability.ts", "memory/trivium-db.ts"]);
  for (const file of collectFiles(srcRoot)) {
    if (!/\.(ts|js|mjs|cjs)$/.test(file) || statSync(file).size === 0) {
      continue;
    }
    const content = readFileSync(file, "utf8");
    assert.equal(topLevelTriviumImport.test(content), false, `${file} has top-level triviumdb import`);
    assert.equal(triviumRequire.test(content), false, `${file} has require('triviumdb')`);
    if (dynamicTriviumImport.test(content)) {
      const relativeFile = file.slice(srcRoot.length + 1).replace(/\\/g, "/");
      assert.equal(
        allowedDynamicImportFiles.has(relativeFile),
        true,
        `${file} has dynamic triviumdb import outside Phase 13 adapter boundary`
      );
    }
    assert.equal(/process\.dlopen|node-gyp-build|\bbindings\s*\(/.test(content), false, `${file} has native loader escape`);
  }

  await db.close();
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 5 memory DB tests passed.");
