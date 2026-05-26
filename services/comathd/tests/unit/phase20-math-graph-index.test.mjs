import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  InMemoryResearchMemoryDB,
  appendProvenanceEvent,
  createMathGraphIndex,
  initProject,
  mathGraphIndexHealthSchema,
  readProvenanceEvents
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-graph-index-"));
const timestamp = "2026-05-26T00:00:00.000Z";

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

function edge(id, source_id, target_id) {
  return {
    id,
    project_id: "PRJ-0001",
    source_id,
    target_id,
    label: "depends_on",
    created_at: timestamp
  };
}

try {
  const { project } = initProject({ name: "Graph Index Project", root_path: projectRoot });
  const memory = new InMemoryResearchMemoryDB();
  await memory.init(projectRoot, { projectId: project.project_id, backend: "memory" });
  const index = createMathGraphIndex({ db: memory, backend: "memory", projectRoot, projectId: project.project_id });
  await index.init(projectRoot, project.project_id);

  const health = await index.health();
  assert.equal(health.backend, "memory");
  assert.equal(health.truth_source, "provenance-ledger");
  assert.equal(health.derived_index, true);
  assert.equal(mathGraphIndexHealthSchema.parse(health).truth_source, "provenance-ledger");
  assert.throws(
    () => mathGraphIndexHealthSchema.parse({ ...health, truth_source: "trivium" }),
    /Invalid input/
  );
  assert.throws(
    () => mathGraphIndexHealthSchema.parse({ ...health, derived_index: false }),
    /Invalid input/
  );

  await index.upsertNode(node("C-0001", "Braid alpha", { text: "alpha braid" }));
  await index.upsertNode(node("C-0002", "Braid beta", { text: "beta braid" }));
  await index.link(edge("EDGE-0001", "C-0001", "C-0002"));
  const results = await index.hybridSearch({ project_id: project.project_id, query: "alpha", limit: 5 });
  assert.equal(results[0].node.id, "C-0001");
  assert.equal((await index.neighbors(project.project_id, "C-0001")).length, 1);

  appendProvenanceEvent(projectRoot, {
    project_id: project.project_id,
    event_type: "claim.registered",
    actor: "phase20-test",
    target_id: "C-0003",
    payload: { title: "Ledger claim", type: "Claim", text: "ledger alpha" }
  });
  const rebuild = await index.rebuildFromLedger();
  assert.equal(rebuild.rebuildable, true);
  assert.equal(rebuild.last_rebuild?.indexed_nodes >= 1, true);
  assert.equal(readProvenanceEvents(projectRoot, project.project_id).some((event) => event.event_type === "index.rebuilt"), true);
  await index.close();
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 20 MathGraphIndex tests passed.");
