import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendProvenanceEvent, createComathServer } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-route-project-"));
const server = createComathServer();
const escapeName = `escape-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const escapeRoot = join(projectRoot, "..", escapeName);
const timestamp = "2026-05-26T00:00:00.000Z";

function memoryNode(id, projectId, title, payload = {}) {
  return {
    id,
    project_id: projectId,
    type: "Claim",
    title,
    payload,
    created_at: timestamp,
    updated_at: timestamp
  };
}

function memoryEdge(id, projectId, sourceId, targetId) {
  return {
    id,
    project_id: projectId,
    source_id: sourceId,
    target_id: targetId,
    label: "depends_on",
    created_at: timestamp
  };
}

try {
  const health = await server.inject({ method: "GET", path: "/health" });
  assert.equal(health.status, 200);
  assert.equal(health.body.ok, true);
  assert.equal(health.body.service, "comathd");
  assert.equal(health.body.phase, "research-alpha");
  assert.equal(health.body.implementsRuntimeBehavior, true);
  assert.equal(health.body.capabilities.includes("claim_registry"), true);

  const init = await server.inject({
    method: "POST",
    path: "/project/init",
    body: { name: "Route Project", root_path: projectRoot }
  });
  assert.equal(init.status, 200);
  assert.equal(init.body.project.root_path, projectRoot);
  assert.equal(existsSync(join(projectRoot, ".comath", "project.json")), true);

  const open = await server.inject({
    method: "POST",
    path: "/project/open",
    body: { root_path: projectRoot }
  });
  assert.equal(open.status, 200);
  assert.equal(open.body.project.project_id, init.body.project.project_id);

  const status = await server.inject({
    method: "GET",
    path: `/project/status?project_root=${encodeURIComponent(projectRoot)}`
  });
  assert.equal(status.status, 200);
  assert.equal(status.body.initialized, true);

  const claim = await server.inject({
    method: "POST",
    path: "/claim/register",
    body: {
      project_root: projectRoot,
      project_id: init.body.project.project_id,
      statement: "Route-level evidence can be attached to a registered claim.",
      assumptions: ["temporary route test project"],
      domain: "braid-statistics",
      actor: "route-test"
    }
  });
  assert.equal(claim.status, 200);
  assert.equal(claim.body.claim.status, "draft");
  assert.equal(claim.body.claim.id, "C-0001");

  const evidence = await server.inject({
    method: "POST",
    path: "/evidence/attach",
    body: {
      project_root: projectRoot,
      project_id: init.body.project.project_id,
      claim_id: claim.body.claim.id,
      kind: "literature",
      summary: "Route test evidence record.",
      actor: "route-test"
    }
  });
  assert.equal(evidence.status, 200);
  assert.equal(evidence.body.evidence.id, "EV-0001");
  assert.equal(evidence.body.evidence.claim_id, claim.body.claim.id);
  assert.equal(evidence.body.evidence.summary, "Route test evidence record.");

  const artifactSource = join(projectRoot, "route-artifact.txt");
  writeFileSync(artifactSource, "route artifact alpha\n", "utf8");
  const artifact = await server.inject({
    method: "POST",
    path: "/artifact/import",
    body: {
      project_root: projectRoot,
      project_id: init.body.project.project_id,
      source_path: artifactSource,
      kind: "log",
      actor: "route-test"
    }
  });
  assert.equal(artifact.status, 200);
  assert.equal(artifact.body.artifact.id, "AR-0001");
  assert.equal(artifact.body.artifact.project_id, init.body.project.project_id);
  assert.equal(artifact.body.artifact.kind, "log");
  assert.match(artifact.body.artifact.sha256, /^[a-f0-9]{64}$/);
  assert.equal(existsSync(join(projectRoot, artifact.body.artifact.path)), true);
  assert.equal(artifact.body.artifact.path.includes("route-artifact.txt"), false);

  const artifacts = await server.inject({
    method: "GET",
    path: `/artifact/list?project_root=${encodeURIComponent(projectRoot)}&project_id=${encodeURIComponent(
      init.body.project.project_id
    )}`
  });
  assert.equal(artifacts.status, 200);
  assert.equal(artifacts.body.artifacts.length, 1);
  assert.equal(artifacts.body.artifacts[0].id, artifact.body.artifact.id);
  assert.equal(artifacts.body.artifacts[0].sha256, artifact.body.artifact.sha256);

  const workstream = await server.inject({
    method: "POST",
    path: "/workstream/spawn",
    body: {
      project_root: projectRoot,
      project_id: init.body.project.project_id,
      kind: "proof_route",
      goal: "Check status snapshot aggregation from a real workstream.",
      actor: "route-test"
    }
  });
  assert.equal(workstream.status, 200);
  assert.equal(workstream.body.workstream.workstream_id, "WS-0001");

  const memoryHealth = await server.inject({
    method: "GET",
    path: `/memory/health?project_root=${encodeURIComponent(projectRoot)}&project_id=${encodeURIComponent(
      init.body.project.project_id
    )}`
  });
  assert.equal(memoryHealth.status, 200);
  assert.equal(memoryHealth.body.health.backend, "memory");
  assert.equal(memoryHealth.body.health.truth_source, "provenance-ledger");
  assert.equal(memoryHealth.body.health.derived_index, true);
  assert.equal(memoryHealth.body.health.rebuildable, true);

  const proposedPatch = await server.inject({
    method: "POST",
    path: "/graph-patch/propose",
    body: {
      project_root: projectRoot,
      project_id: init.body.project.project_id,
      workstream_id: workstream.body.workstream.workstream_id,
      created_by: "route-test",
      new_nodes: [
        memoryNode("C-0100", init.body.project.project_id, "Route memory alpha", {
          text: "context pack route alpha"
        }),
        memoryNode("C-0101", init.body.project.project_id, "Route memory beta", {
          text: "context pack route beta"
        })
      ],
      new_edges: [memoryEdge("EDGE-0100", init.body.project.project_id, "C-0100", "C-0101")]
    }
  });
  assert.equal(proposedPatch.status, 200);
  assert.equal(proposedPatch.body.patch.new_nodes.length, 2);

  const reviewedPatch = await server.inject({
    method: "POST",
    path: "/graph-patch/review",
    body: {
      project_root: projectRoot,
      project_id: init.body.project.project_id,
      workstream_id: workstream.body.workstream.workstream_id,
      next_state: "under_review",
      reviewer: "route-reviewer",
      notes: "route memory seed"
    }
  });
  assert.equal(reviewedPatch.status, 200);
  assert.equal(reviewedPatch.body.patch.state, "under_review");

  const acceptedPatch = await server.inject({
    method: "POST",
    path: "/graph-patch/review",
    body: {
      project_root: projectRoot,
      project_id: init.body.project.project_id,
      workstream_id: workstream.body.workstream.workstream_id,
      next_state: "accepted",
      reviewer: "route-reviewer",
      notes: "accepted for memory route test"
    }
  });
  assert.equal(acceptedPatch.status, 200);
  assert.equal(acceptedPatch.body.patch.state, "accepted");

  const appliedPatch = await server.inject({
    method: "POST",
    path: "/graph-patch/apply",
    body: {
      project_root: projectRoot,
      project_id: init.body.project.project_id,
      workstream_id: workstream.body.workstream.workstream_id,
      reviewer: "route-reviewer"
    }
  });
  assert.equal(appliedPatch.status, 200);
  assert.equal(appliedPatch.body.applied, true);

  const memorySearch = await server.inject({
    method: "POST",
    path: "/memory/search",
    body: {
      project_root: projectRoot,
      project_id: init.body.project.project_id,
      query: "alpha",
      limit: 1,
      node_types: ["Claim"]
    }
  });
  assert.equal(memorySearch.status, 200);
  assert.equal(memorySearch.body.results.length, 1);
  assert.equal(memorySearch.body.results[0].node.id, "C-0100");
  assert.equal(memorySearch.body.results[0].matched_fields.includes("title"), true);

  const contextPack = await server.inject({
    method: "POST",
    path: "/memory/context-pack",
    body: {
      project_root: projectRoot,
      project_id: init.body.project.project_id,
      seed_ids: ["C-0100", "MISSING-0100"],
      depth: 1,
      limit: 5
    }
  });
  assert.equal(contextPack.status, 200);
  assert.equal(contextPack.body.context_pack.project_id, init.body.project.project_id);
  assert.equal(contextPack.body.context_pack.nodes.some((item) => item.id === "C-0100"), true);
  assert.equal(contextPack.body.context_pack.nodes.some((item) => item.id === "C-0101"), true);
  assert.equal(contextPack.body.context_pack.edges.some((item) => item.id === "EDGE-0100"), true);
  assert.equal(contextPack.body.context_pack.warnings.some((warning) => warning.includes("MISSING-0100")), true);

  appendProvenanceEvent(projectRoot, {
    project_id: init.body.project.project_id,
    event_type: "claim.registered",
    actor: "route-test",
    target_id: "C-0200",
    payload: {
      title: "Ledger route gamma",
      type: "Claim",
      text: "ledger rebuild route gamma"
    }
  });
  const rebuiltMemory = await server.inject({
    method: "POST",
    path: "/memory/rebuild",
    body: {
      project_root: projectRoot,
      project_id: init.body.project.project_id
    }
  });
  assert.equal(rebuiltMemory.status, 200);
  assert.equal(rebuiltMemory.body.health.last_rebuild.indexed_nodes, 1);
  assert.equal(rebuiltMemory.body.health.last_rebuild.indexed_edges, 0);
  assert.deepEqual(rebuiltMemory.body.health.last_rebuild.warnings, []);

  const rebuiltSearch = await server.inject({
    method: "POST",
    path: "/memory/search",
    body: {
      project_root: projectRoot,
      project_id: init.body.project.project_id,
      query: "gamma",
      limit: 5
    }
  });
  assert.equal(rebuiltSearch.status, 200);
  assert.equal(rebuiltSearch.body.results.some((result) => result.node.id === "C-0200"), true);

  const snapshot = await server.inject({
    method: "GET",
    path: `/status/snapshot?project_root=${encodeURIComponent(projectRoot)}&project_id=${encodeURIComponent(
      init.body.project.project_id
    )}`
  });
  assert.equal(snapshot.status, 200);
  assert.equal(snapshot.body.service.capabilities.includes("pi_extension_installable_package"), true);
  assert.equal(snapshot.body.project.initialized, true);
  assert.equal(snapshot.body.claims.length, 1);
  assert.equal(snapshot.body.claims[0].id, claim.body.claim.id);
  assert.equal(snapshot.body.evidence.length, 1);
  assert.equal(snapshot.body.evidence[0].id, evidence.body.evidence.id);
  assert.equal(snapshot.body.workstreams.length, 1);
  assert.equal(snapshot.body.workstreams[0].workstream_id, "WS-0001");
  assert.equal(snapshot.body.audit_event_count >= 3, true);

  const bad = await server.inject({
    method: "POST",
    path: "/project/init",
    body: { name: "Bad", root_path: `${projectRoot}\\..\\${escapeName}` }
  });
  assert.equal(bad.status >= 400, true);
  assert.equal(existsSync(join(escapeRoot, ".comath")), false);
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
  rmSync(escapeRoot, { recursive: true, force: true });
}

console.log("Phase 2 service route tests passed.");
