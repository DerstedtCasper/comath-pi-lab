import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  InMemoryResearchMemoryDB,
  applyAcceptedGraphPatch,
  buildGraphPatchFromWorkstream,
  getWorkstreamStatus,
  graphPatchSchema,
  initProject,
  readAuditEvents,
  readWorkstreamBundle,
  reviewGraphPatch,
  spawnWorkstream,
  transitionWorkstreamStatus,
  writeWorkstreamReport
} from "../../dist/index.js";

const timestampPattern = /\d{4}-\d{2}-\d{2}T/;
const projectRoot = mkdtempSync(join(tmpdir(), "comath-phase7-"));

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function node(id, title, payload = {}) {
  const now = "2026-05-25T00:00:00.000Z";
  return {
    id,
    project_id: "PRJ-0001",
    type: "Claim",
    title,
    payload,
    created_at: now,
    updated_at: now
  };
}

try {
  const init = initProject({ name: "Phase 7 Project", root_path: projectRoot });
  const projectId = init.project.project_id;
  assert.equal(projectId, "PRJ-0001");

  const workstream = spawnWorkstream(projectRoot, {
    project_id: projectId,
    kind: "proof_route",
    goal: "Find an auditable route for a braid statistic claim.",
    created_by: "phase7-test"
  });

  assert.equal(workstream.id, "WS-0001");
  assert.equal(workstream.status, "queued");
  assert.equal(workstream.review_state, "proposed");
  assert.match(workstream.created_at, timestampPattern);

  const workstreamDir = join(projectRoot, ".comath", "workstreams", "WS-0001");
  const statusPath = join(workstreamDir, "status.json");
  const specPath = join(workstreamDir, "spec.yaml");
  const reportPath = join(workstreamDir, "report.md");
  const patchPath = join(workstreamDir, "graph_patch.json");
  assert.equal(existsSync(statusPath), true);
  assert.equal(existsSync(specPath), true);
  assert.equal(existsSync(reportPath), true);
  assert.equal(existsSync(patchPath), true);
  assert.equal(readJson(statusPath).workstream_id, "WS-0001");
  assert.equal(readJson(patchPath).state, "proposed");

  const db = new InMemoryResearchMemoryDB();
  await db.init(projectRoot, { projectId, backend: "memory" });

  transitionWorkstreamStatus(projectRoot, {
    project_id: projectId,
    workstream_id: "WS-0001",
    next_status: "running",
    actor: "phase7-test"
  });
  writeWorkstreamReport(projectRoot, {
    project_id: projectId,
    workstream_id: "WS-0001",
    report_markdown: "# Route\n\nCandidate C-0001 should remain a proposal until explicit apply.",
    status: "reviewing"
  });
  const afterReport = getWorkstreamStatus(projectRoot, { project_id: projectId, workstream_id: "WS-0001" });
  assert.equal(afterReport.status, "reviewing");
  assert.equal(readFileSync(reportPath, "utf8").includes("Candidate C-0001"), true);
  assert.equal(await db.getNode("C-0001"), null);

  const proposedPatch = buildGraphPatchFromWorkstream(projectRoot, {
    project_id: projectId,
    workstream_id: "WS-0001",
    created_by: "graph-builder",
    new_nodes: [node("C-0001", "Braid statistic alpha", { status: "draft" })],
    new_edges: [],
    warnings: ["phase7 proposal only"]
  });
  graphPatchSchema.parse(proposedPatch);
  assert.equal(proposedPatch.patch_id, "GP-0001");
  assert.equal(proposedPatch.state, "proposed");
  assert.equal(proposedPatch.source_workstream_id, "WS-0001");
  assert.equal(await db.getNode("C-0001"), null, "proposed patches must not mutate trusted graph");

  assert.throws(
    () =>
      reviewGraphPatch(projectRoot, {
        project_id: projectId,
        workstream_id: "WS-0001",
        next_state: "accepted",
        reviewer: "",
        notes: "missing reviewer"
      }),
    /reviewer/
  );

  assert.throws(
    () =>
      reviewGraphPatch(projectRoot, {
        project_id: projectId,
        workstream_id: "WS-0001",
        next_state: "accepted",
        reviewer: "human-reviewer",
        notes: "cannot skip under_review"
      }),
    /invalid GraphPatch transition/
  );

  const underReview = reviewGraphPatch(projectRoot, {
    project_id: projectId,
    workstream_id: "WS-0001",
    next_state: "under_review",
    reviewer: "human-reviewer",
    notes: "ready for review"
  });
  assert.equal(underReview.state, "under_review");

  const accepted = reviewGraphPatch(projectRoot, {
    project_id: projectId,
    workstream_id: "WS-0001",
    next_state: "accepted",
    reviewer: "human-reviewer",
    notes: "accepted for explicit application"
  });
  assert.equal(accepted.state, "accepted");
  assert.equal(accepted.reviewer_notes.includes("human-reviewer"), true);
  assert.equal(await db.getNode("C-0001"), null, "accepted patches still require explicit apply");

  const applied = await applyAcceptedGraphPatch(projectRoot, {
    project_id: projectId,
    workstream_id: "WS-0001",
    db,
    reviewer: "human-reviewer"
  });
  assert.equal(applied.patch.state, "accepted");
  assert.equal(applied.applied, true);
  assert.equal((await db.getNode("C-0001"))?.title, "Braid statistic alpha");
  const appliedBundle = readWorkstreamBundle(projectRoot, { project_id: projectId, workstream_id: "WS-0001" });
  assert.equal(appliedBundle.status.applied_by, "human-reviewer");
  assert.match(appliedBundle.status.applied_at, timestampPattern);
  await assert.rejects(
    () =>
      applyAcceptedGraphPatch(projectRoot, {
        project_id: projectId,
        workstream_id: "WS-0001",
        db,
        reviewer: "human-reviewer"
      }),
    /already been applied/
  );

  const rejectedWorkstream = spawnWorkstream(projectRoot, {
    project_id: projectId,
    kind: "review",
    goal: "Reject unsafe patch.",
    created_by: "phase7-test"
  });
  buildGraphPatchFromWorkstream(projectRoot, {
    project_id: projectId,
    workstream_id: rejectedWorkstream.id,
    created_by: "graph-builder",
    new_nodes: [node("C-0002", "Rejected claim", { status: "draft" })],
    new_edges: []
  });
  reviewGraphPatch(projectRoot, {
    project_id: projectId,
    workstream_id: rejectedWorkstream.id,
    next_state: "under_review",
    reviewer: "human-reviewer",
    notes: "reviewing rejection"
  });
  reviewGraphPatch(projectRoot, {
    project_id: projectId,
    workstream_id: rejectedWorkstream.id,
    next_state: "rejected",
    reviewer: "human-reviewer",
    notes: "not acceptable"
  });
  await assert.rejects(
    () =>
      applyAcceptedGraphPatch(projectRoot, {
        project_id: projectId,
        workstream_id: rejectedWorkstream.id,
        db,
        reviewer: "human-reviewer"
      }),
    /accepted/
  );
  assert.equal(await db.getNode("C-0002"), null);

  const injectionWorkstream = spawnWorkstream(projectRoot, {
    project_id: projectId,
    kind: "proof_route",
    goal: "Prove GraphPatch claim-status injection is rejected before review.",
    created_by: "phase7-test"
  });

  assert.throws(
    () =>
      buildGraphPatchFromWorkstream(projectRoot, {
        project_id: projectId,
        workstream_id: injectionWorkstream.id,
        created_by: "graph-builder",
        new_nodes: [node("C-0003", "Injected formal claim", { status: "formally_checked" })],
        new_edges: []
      }),
    /privileged claim status/
  );

  assert.throws(
    () =>
      buildGraphPatchFromWorkstream(projectRoot, {
        project_id: projectId,
        workstream_id: injectionWorkstream.id,
        created_by: "graph-builder",
        new_nodes: [],
        new_edges: [],
        updated_nodes: [{ id: "C-0001", status: "formally_checked" }]
      }),
    /protected claim field status/
  );

  const events = readAuditEvents(projectRoot);
  assert.equal(events.some((event) => event.event_type === "workstream.spawned"), true);
  assert.equal(events.some((event) => event.event_type === "graph_patch.proposed"), true);
  assert.equal(events.some((event) => event.event_type === "graph_patch.reviewed"), true);
  assert.equal(events.some((event) => event.event_type === "graph_patch.applied"), true);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 7 workstream/GraphPatch tests passed.");
