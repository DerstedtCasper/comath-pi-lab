import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createComathServer } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-phase7-routes-"));
const server = createComathServer();
const now = "2026-05-25T00:00:00.000Z";

function node(id, projectId, title, payload = {}) {
  return {
    id,
    project_id: projectId,
    type: "Claim",
    title,
    payload,
    created_at: now,
    updated_at: now
  };
}

try {
  const init = await server.inject({
    method: "POST",
    path: "/project/init",
    body: { name: "Phase 7 Route Project", root_path: projectRoot }
  });
  assert.equal(init.status, 200);
  const projectId = init.body.project.project_id;

  const spawned = await server.inject({
    method: "POST",
    path: "/workstream/spawn",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      kind: "computation",
      goal: "Route-level graph patch proposal",
      actor: "route-test"
    }
  });
  assert.equal(spawned.status, 200);
  assert.equal(spawned.body.workstream.workstream_id, "WS-0001");
  assert.equal(existsSync(join(projectRoot, ".comath", "workstreams", "WS-0001", "status.json")), true);

  const listed = await server.inject({
    method: "GET",
    path: `/workstream/list?project_root=${encodeURIComponent(projectRoot)}&project_id=${projectId}`
  });
  assert.equal(listed.status, 200);
  assert.equal(listed.body.workstreams.length, 1);

  const running = await server.inject({
    method: "POST",
    path: "/workstream/transition",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      workstream_id: "WS-0001",
      next_status: "running",
      actor: "route-test"
    }
  });
  assert.equal(running.status, 200);
  assert.equal(running.body.workstream.status, "running");

  const reported = await server.inject({
    method: "POST",
    path: "/workstream/report",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      workstream_id: "WS-0001",
      report_markdown: "# Route report\n\nNo trusted graph write yet.",
      status: "reviewing",
      actor: "route-test"
    }
  });
  assert.equal(reported.status, 200);
  assert.equal(reported.body.workstream.status, "reviewing");

  const proposed = await server.inject({
    method: "POST",
    path: "/graph-patch/propose",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      workstream_id: "WS-0001",
      created_by: "graph-builder",
      new_nodes: [node("C-0001", projectId, "Route claim", { status: "draft" })],
      new_edges: [],
      warnings: ["route proposal only"]
    }
  });
  assert.equal(proposed.status, 200);
  assert.equal(proposed.body.patch.state, "proposed");

  const skipReview = await server.inject({
    method: "POST",
    path: "/graph-patch/review",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      workstream_id: "WS-0001",
      next_state: "accepted",
      reviewer: "route-reviewer",
      notes: "must fail"
    }
  });
  assert.equal(skipReview.status, 400);
  assert.equal(skipReview.body.code, "INVALID_GRAPH_PATCH_TRANSITION");

  const underReview = await server.inject({
    method: "POST",
    path: "/graph-patch/review",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      workstream_id: "WS-0001",
      next_state: "under_review",
      reviewer: "route-reviewer",
      notes: "route review"
    }
  });
  assert.equal(underReview.status, 200);
  assert.equal(underReview.body.patch.state, "under_review");

  const accepted = await server.inject({
    method: "POST",
    path: "/graph-patch/review",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      workstream_id: "WS-0001",
      next_state: "accepted",
      reviewer: "route-reviewer",
      notes: "accepted"
    }
  });
  assert.equal(accepted.status, 200);
  assert.equal(accepted.body.patch.state, "accepted");

  const bundleBeforeApply = await server.inject({
    method: "GET",
    path: `/workstream/bundle?project_root=${encodeURIComponent(projectRoot)}&project_id=${projectId}&workstream_id=WS-0001`
  });
  assert.equal(bundleBeforeApply.status, 200);
  assert.equal(bundleBeforeApply.body.status.applied_at, undefined);
  assert.equal(bundleBeforeApply.body.graph_patch.state, "accepted");

  const applied = await server.inject({
    method: "POST",
    path: "/graph-patch/apply",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      workstream_id: "WS-0001",
      reviewer: "route-reviewer"
    }
  });
  assert.equal(applied.status, 200);
  assert.equal(applied.body.applied, true);

  const duplicateApply = await server.inject({
    method: "POST",
    path: "/graph-patch/apply",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      workstream_id: "WS-0001",
      reviewer: "route-reviewer"
    }
  });
  assert.equal(duplicateApply.status, 409);
  assert.equal(duplicateApply.body.code, "GRAPH_PATCH_ALREADY_APPLIED");

  const injectionWorkstream = await server.inject({
    method: "POST",
    path: "/workstream/spawn",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      kind: "proof_route",
      goal: "Route-level injection guard",
      actor: "route-test"
    }
  });
  assert.equal(injectionWorkstream.status, 200);

  const injectedClaim = await server.inject({
    method: "POST",
    path: "/graph-patch/propose",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      workstream_id: injectionWorkstream.body.workstream.workstream_id,
      created_by: "graph-builder",
      new_nodes: [node("C-0002", projectId, "Injected formal claim", { status: "formally_checked" })],
      new_edges: []
    }
  });
  assert.equal(injectedClaim.status, 400);
  assert.match(injectedClaim.body.error, /privileged claim status/);

  const auditLog = readFileSync(join(projectRoot, ".comath", "audit", "events.jsonl"), "utf8");
  assert.equal(auditLog.includes("workstream.spawned"), true);
  assert.equal(auditLog.includes("graph_patch.applied"), true);
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 7 workstream route tests passed.");
