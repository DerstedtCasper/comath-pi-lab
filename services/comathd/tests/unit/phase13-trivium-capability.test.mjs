import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import {
  InMemoryResearchMemoryDB,
  TriviumResearchMemoryDB,
  createResearchMemoryDB,
  graphPatchSchema,
  initProject,
  probeTriviumCapability
} from "../../dist/index.js";

const timestamp = "2026-05-25T00:00:00.000Z";
const projectRoot = mkdtempSync(join(tmpdir(), "comath-trivium-capability-"));

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

function collectSourceFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(path));
    } else if (entry.isFile() && /\.(ts|js|mjs|cjs)$/.test(entry.name) && statSync(path).size > 0) {
      files.push(path);
    }
  }
  return files;
}

try {
  initProject({ name: "Trivium Capability Project", root_path: projectRoot });

  const absentProbe = await probeTriviumCapability({
    loader: async () => {
      throw new Error("Cannot find package 'triviumdb'");
    }
  });
  assert.equal(absentProbe.available, false);
  assert.equal(absentProbe.fallbackBackend, "memory");
  assert.equal(absentProbe.canOpenDatabase, false);
  assert.equal(absentProbe.packageName, "triviumdb");
  assert.equal(typeof absentProbe.platform, "string");
  assert.equal(typeof absentProbe.arch, "string");
  assert.equal(absentProbe.nodeVersion.length > 0, true);
  assert.match(absentProbe.loadError ?? "", /triviumdb/);

  let disabledLoaderCalled = false;
  const ffiDisabledProbe = await probeTriviumCapability({
    ffiDisabled: true,
    loader: async () => {
      disabledLoaderCalled = true;
      return {};
    }
  });
  assert.equal(ffiDisabledProbe.available, false);
  assert.equal(ffiDisabledProbe.ffiDisabled, true);
  assert.equal(disabledLoaderCalled, false);

  const memory = await createResearchMemoryDB({
    projectRoot,
    projectId: "PRJ-0001",
    backend: "memory"
  });
  assert.equal(memory.backend, "memory");
  assert.equal(memory.db instanceof InMemoryResearchMemoryDB, true);
  await memory.db.close();

  const fallback = await createResearchMemoryDB({
    projectRoot,
    projectId: "PRJ-0001",
    backend: "trivium",
    fallbackToMemory: true,
    probe: async () => absentProbe
  });
  assert.equal(fallback.backend, "memory");
  assert.equal(fallback.db instanceof InMemoryResearchMemoryDB, true);
  assert.equal(fallback.warnings.some((warning) => warning.includes("falling back to in-memory")), true);

  await fallback.db.upsertNode(node("C-0001", "Stable string node", { text: "trivium fallback keeps stable ids" }));
  await fallback.db.upsertNode(node("C-0002", "Downstream node"));
  await fallback.db.link(edge("EDGE-0001", "C-0001", "C-0002"));
  assert.equal((await fallback.db.getNode("C-0001"))?.id, "C-0001");
  assert.equal((await fallback.db.getEdges("C-0001"))[0].target_id, "C-0002");
  const context = await fallback.db.contextPack({ project_id: "PRJ-0001", seed_ids: ["C-0001"], depth: 1 });
  assert.deepEqual(context.nodes.map((item) => item.id).sort(), ["C-0001", "C-0002"]);
  await fallback.db.close();

  await assert.rejects(
    () =>
      createResearchMemoryDB({
        projectRoot,
        projectId: "PRJ-0001",
        backend: "trivium",
        requireNative: true,
        fallbackToMemory: false,
        probe: async () => absentProbe
      }),
    /TriviumDB backend requested but unavailable/
  );

  const adapter = new TriviumResearchMemoryDB({
    nativeModule: { version: "fake-native" },
    backendLabel: "trivium-test"
  });
  await adapter.init(projectRoot, { projectId: "PRJ-0001", backend: "trivium" });
  await adapter.upsertNode(node("C-0100", "Adapter stable id", { text: "adapter maps native ids privately" }));
  await adapter.upsertNode(node("C-0101", "Adapter target"));
  await adapter.link(edge("EDGE-0100", "C-0100", "C-0101"));
  assert.equal((await adapter.getNode("C-0100"))?.id, "C-0100");
  assert.equal((await adapter.getEdges("C-0100"))[0].source_id, "C-0100");
  assert.equal((await adapter.getStableIdMap().getByStableId("PRJ-0001", "C-0100"))?.trivium_id, 1);
  assert.equal((await adapter.getStableIdMap().getByStableId("PRJ-0001", "EDGE-0100"))?.stable_id, "EDGE-0100");

  const acceptedPatch = graphPatchSchema.parse({
    patch_id: "GP-1301",
    project_id: "PRJ-0001",
    state: "proposed",
    provenance: {
      created_by: "WS-1301",
      created_at: timestamp
    },
    new_nodes: [node("C-0102", "Patch node")],
    new_edges: [edge("EDGE-0102", "C-0101", "C-0102")],
    updated_nodes: [],
    candidate_conflicts: [],
    warnings: []
  });
  await adapter.beginPatch(acceptedPatch);
  await adapter.applyPatch("GP-1301", { accepted: true, reviewer: "phase13-test" });
  assert.equal((await adapter.getNode("C-0102"))?.id, "C-0102");
  await assert.rejects(
    () =>
      adapter.beginPatch({
        ...acceptedPatch,
        patch_id: "GP-1302",
        new_nodes: [node("C-0103", "Injected formal claim", { status: "formally_checked" })]
      }),
    /privileged claim status/
  );
  await adapter.close();

  const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
  assert.equal(Object.hasOwn(packageJson.dependencies ?? {}, "triviumdb"), false);

  const srcRoot = join(process.cwd(), "src");
  const sourceFiles = collectSourceFiles(srcRoot);
  const topLevelImportPattern = /(?:^|\n)\s*import\s+(?:[^("'][\s\S]*?\s+from\s+)?["']triviumdb["']/;
  const requirePattern = /require\s*\(\s*["']triviumdb["']\s*\)/;
  const dynamicImportPattern = /import\s*\(\s*["']triviumdb["']\s*\)/;
  const allowedDynamicImportFiles = new Set(["memory/trivium-capability.ts", "memory/trivium-db.ts"]);

  for (const file of sourceFiles) {
    const content = readFileSync(file, "utf8");
    assert.equal(topLevelImportPattern.test(content), false, `${file} has top-level triviumdb import`);
    assert.equal(requirePattern.test(content), false, `${file} has require('triviumdb')`);
    if (dynamicImportPattern.test(content)) {
      const rel = relative(srcRoot, file).replace(/\\/g, "/");
      assert.equal(allowedDynamicImportFiles.has(rel), true, `${file} has dynamic triviumdb import outside adapter boundary`);
    }
    assert.equal(/process\.dlopen|node-gyp-build|\bbindings\s*\(/.test(content), false, `${file} has native loader escape`);
  }
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 13 TriviumDB capability tests passed.");
