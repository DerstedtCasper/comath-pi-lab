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
