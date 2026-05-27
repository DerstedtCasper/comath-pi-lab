import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  InMemoryResearchMemoryDB,
  applyAcceptedGraphPatch,
  assertAgentRunWriteAllowed,
  buildGraphPatchFromWorkstream,
  createAgentRun,
  getAgentRun,
  initProject,
  listAgentRuns,
  readAuditEvents,
  recordAgentRunFailureToMemory,
  reviewGraphPatch,
  spawnWorkstream,
  startAgentRun,
  submitAgentRunReport
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-phase27-agent-run-"));
const outsideRoot = mkdtempSync(join(tmpdir(), "comath-phase27-agent-run-outside-"));
const now = "2026-05-27T00:00:00.000Z";

function validReport(extra = "") {
  return [
    "# Agent Report",
    "",
    "## Input Context",
    "Locked obligation PO-0001.",
    "",
    "## Actions Taken",
    "Created a route proposal.",
    "",
    "## Claims Proposed",
    "No trusted claim promotion.",
    "",
    "## Evidence Produced",
    "No promotion-grade evidence.",
    "",
    "## Graph Patch",
    "See graph_patch.json.",
    "",
    "## Blockers",
    "None.",
    "",
    "## Failed Routes",
    "None.",
    "",
    "## Self-Review",
    "No Lean authority claimed.",
    "",
    "## Next Actions",
    "Review the proposed route.",
    extra,
    ""
  ].join("\n");
}

function claimNode(id, projectId, title) {
  return {
    id,
    project_id: projectId,
    type: "Claim",
    title,
    payload: { status: "draft" },
    created_at: now,
    updated_at: now
  };
}

try {
  const init = initProject({ name: "Phase 27 AgentRun Project", root_path: projectRoot });
  const projectId = init.project.project_id;
  const workstream = spawnWorkstream(projectRoot, {
    project_id: projectId,
    kind: "proof_route",
    goal: "Create an auditable proof-route workstream through AgentRun.",
    created_by: "phase27-test"
  });

  const run = createAgentRun(projectRoot, {
    project_id: projectId,
    campaign_id: "CAM-0001",
    workstream_id: workstream.workstream_id,
    role: "proof_route",
    model: "local-fixture",
    tool_profile: "proof_route_read_write_own_scope",
    actor: "phase27-test"
  });
  assert.equal(run.id, "ARUN-0001");
  assert.equal(run.status, "queued");
  assert.deepEqual(run.write_scope, [
    `.comath/workstreams/${workstream.workstream_id}/`,
    `.tmp/comath/${run.id}/`
  ]);
  assert.equal(existsSync(join(projectRoot, ".comath", "agents", "runs", "ARUN-0001", "status.json")), true);

  const running = startAgentRun(projectRoot, {
    project_id: projectId,
    run_id: run.id,
    actor: "phase27-test"
  });
  assert.equal(running.status, "running");
  assert.equal(existsSync(join(projectRoot, ".tmp", "comath", "ARUN-0001")), true);

  const allowedRuntimePath = assertAgentRunWriteAllowed(projectRoot, running, `.tmp/comath/${run.id}/notes.json`);
  assert.equal(allowedRuntimePath.endsWith(join(".tmp", "comath", "ARUN-0001", "notes.json")), true);
  const allowedWorkstreamPath = assertAgentRunWriteAllowed(
    projectRoot,
    running,
    `.comath/workstreams/${workstream.workstream_id}/agent_runs/${run.id}/report.md`
  );
  assert.equal(allowedWorkstreamPath.includes(join(".comath", "workstreams", "WS-0001", "agent_runs")), true);

  assert.throws(
    () => assertAgentRunWriteAllowed(projectRoot, running, ".comath/claims/C-0001.md"),
    /outside AgentRun write scope/
  );
  assert.throws(
    () => assertAgentRunWriteAllowed(projectRoot, running, "../outside.md"),
    /Path escapes project root|outside AgentRun write scope/
  );
  const scopedEscapeLink = join(projectRoot, ".tmp", "comath", run.id, "escape");
  symlinkSync(outsideRoot, scopedEscapeLink, process.platform === "win32" ? "junction" : "dir");
  assert.throws(
    () => assertAgentRunWriteAllowed(projectRoot, running, `.tmp/comath/${run.id}/escape/outside.txt`),
    /realpath escapes project root|realpath escapes AgentRun write scope/
  );

  assert.throws(
    () =>
      submitAgentRunReport(projectRoot, {
        project_id: projectId,
        run_id: run.id,
        status: "succeeded",
        report_markdown: "# Agent Report\n\n## Input Context\nOnly one heading.",
        actor: "phase27-test"
      }),
    /missing required report heading/
  );
  assert.throws(
    () =>
      submitAgentRunReport(projectRoot, {
        project_id: projectId,
        run_id: run.id,
        status: "succeeded",
        report_markdown: validReport(),
        graph_patch_path: ".comath/claims/C-0001.md",
        actor: "phase27-test"
      }),
    /outside AgentRun write scope/
  );
  assert.throws(
    () =>
      submitAgentRunReport(projectRoot, {
        project_id: projectId,
        run_id: run.id,
        status: "succeeded",
        report_markdown: validReport(),
        artifact_manifest_path: "https://example.invalid/manifest.json",
        actor: "phase27-test"
      }),
    /URL-shaped paths are not allowed/
  );
  assert.throws(
    () =>
      submitAgentRunReport(projectRoot, {
        project_id: projectId,
        run_id: run.id,
        status: "succeeded",
        report_markdown: validReport(),
        artifact_manifest_path: join(projectRoot, ".comath", "workstreams", workstream.workstream_id, "manifest.json"),
        actor: "phase27-test"
      }),
    /must be project-relative/
  );

  const submitted = submitAgentRunReport(projectRoot, {
    project_id: projectId,
    run_id: run.id,
    status: "succeeded",
    report_markdown: validReport(),
    graph_patch_path: `.comath/workstreams/${workstream.workstream_id}/graph_patch.json`,
    artifact_manifest_path: `.comath/workstreams/${workstream.workstream_id}/artifact_manifest.json`,
    exit_reason: "route report ready for review",
    actor: "phase27-test"
  });
  assert.equal(submitted.status, "succeeded");
  assert.equal(submitted.report_path, `.comath/workstreams/${workstream.workstream_id}/agent_runs/${run.id}/report.md`);
  assert.equal(readFileSync(join(projectRoot, submitted.report_path), "utf8").includes("## Self-Review"), true);
  assert.equal(getAgentRun(projectRoot, projectId, run.id).exit_reason, "route report ready for review");
  assert.equal(listAgentRuns(projectRoot, projectId, { workstream_id: workstream.workstream_id }).length, 1);
  assert.throws(
    () => getAgentRun(projectRoot, projectId, "../ARUN-0001"),
    /invalid AgentRun id/
  );

  const proposed = buildGraphPatchFromWorkstream(projectRoot, {
    project_id: projectId,
    workstream_id: workstream.workstream_id,
    created_by: run.id,
    new_nodes: [claimNode("C-0001", projectId, "AgentRun produced route claim")],
    new_edges: []
  });
  assert.equal(proposed.provenance.created_by, run.id);
  assert.throws(
    () =>
      reviewGraphPatch(projectRoot, {
        project_id: projectId,
        workstream_id: workstream.workstream_id,
        next_state: "under_review",
        reviewer: run.id,
        notes: "producer cannot self-review"
      }),
    /cannot review its own GraphPatch/
  );

  reviewGraphPatch(projectRoot, {
    project_id: projectId,
    workstream_id: workstream.workstream_id,
    next_state: "under_review",
    reviewer: "ARUN-REVIEWER-0001",
    notes: "independent review"
  });
  reviewGraphPatch(projectRoot, {
    project_id: projectId,
    workstream_id: workstream.workstream_id,
    next_state: "accepted",
    reviewer: "ARUN-REVIEWER-0001",
    notes: "accepted by distinct reviewer"
  });

  const db = new InMemoryResearchMemoryDB();
  await db.init(projectRoot, { projectId, backend: "memory" });
  const applied = await applyAcceptedGraphPatch(projectRoot, {
    project_id: projectId,
    workstream_id: workstream.workstream_id,
    db,
    reviewer: "ARUN-GRAPH-0001"
  });
  assert.equal(applied.applied, true);
  assert.equal((await db.getNode("C-0001"))?.title, "AgentRun produced route claim");

  const failedWorkstream = spawnWorkstream(projectRoot, {
    project_id: projectId,
    kind: "formalization",
    goal: "Record failed formalization route as durable memory.",
    created_by: "phase27-test"
  });
  const failedRun = createAgentRun(projectRoot, {
    project_id: projectId,
    campaign_id: "CAM-0001",
    workstream_id: failedWorkstream.workstream_id,
    role: "formalization",
    tool_profile: "lean_formalization_fixture",
    actor: "phase27-test"
  });
  startAgentRun(projectRoot, { project_id: projectId, run_id: failedRun.id, actor: "phase27-test" });
  submitAgentRunReport(projectRoot, {
    project_id: projectId,
    run_id: failedRun.id,
    status: "failed",
    report_markdown: validReport("Lean failed with unresolved theorem family."),
    exit_reason: "lean_failed",
    actor: "phase27-test"
  });
  const failureNode = await recordAgentRunFailureToMemory(projectRoot, {
    project_id: projectId,
    run_id: failedRun.id,
    db,
    actor: "phase27-test"
  });
  assert.equal(failureNode.id, "FR-0001");
  assert.equal(failureNode.type, "FailureRoute");
  assert.equal(failureNode.payload.agent_run_id, failedRun.id);
  assert.equal(failureNode.payload.exit_reason, "lean_failed");
  const duplicateFailureNode = await recordAgentRunFailureToMemory(projectRoot, {
    project_id: projectId,
    run_id: failedRun.id,
    db,
    actor: "phase27-test"
  });
  assert.equal(duplicateFailureNode.id, "FR-0001");

  const events = readAuditEvents(projectRoot);
  assert.equal(events.some((event) => event.event_type === "agent_run.created"), true);
  assert.equal(events.some((event) => event.event_type === "agent_run.report_submitted"), true);
  assert.equal(events.some((event) => event.event_type === "agent_run.failure_recorded"), true);
  assert.equal(events.filter((event) => event.event_type === "agent_run.failure_recorded").length, 1);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
  rmSync(outsideRoot, { recursive: true, force: true });
}

console.log("Phase 27 AgentRun runtime tests passed.");
