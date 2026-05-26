import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createComathServer } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-route-project-"));
const server = createComathServer();
const escapeName = `escape-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const escapeRoot = join(projectRoot, "..", escapeName);

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
