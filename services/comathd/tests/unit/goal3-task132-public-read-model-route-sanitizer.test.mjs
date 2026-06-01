import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  applyGatePromotedClaim,
  createComathServer,
  executeProfileAgentRun,
  getClaim,
  initProject,
  registerClaim,
  spawnWorkstream,
  transitionWorkstreamStatus,
  writeWorkstreamReport
} from "../../dist/index.js";

const privilegedPublicTerms =
  /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence)\b/i;

function assertPublicBody(body, context) {
  assert.doesNotMatch(JSON.stringify(body), privilegedPublicTerms, context);
}

async function getOk(server, path) {
  const response = await server.inject({ method: "GET", path });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  return response.body;
}

function writePrivilegedLogAdapter(projectRoot) {
  const dir = join(projectRoot, ".tmp", "task132-fixtures");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "privileged-log-adapter.mjs");
  writeFileSync(
    path,
    [
      `process.stdout.write("stdout says formal_replay_passed and lean_kernel_clean_replay\\n");`,
      `process.stderr.write("stderr says formally_checked and verified_final_authority_evidence\\n");`,
      ""
    ].join("\n"),
    "utf8"
  );
  return path;
}

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task132-public-read-models-"));
const server = createComathServer();

try {
  const { project } = initProject({ name: "Task 132 public read models", root_path: projectRoot });
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: "For every natural number n, n + 0 = n.",
    assumptions: ["n : Nat"],
    domain: "elementary",
    actor: "goal3-task132"
  });
  const promoted = applyGatePromotedClaim(projectRoot, {
    ...claim,
    status: "formally_checked",
    evidence_level: 5,
    gate_result_id: "GR-0132",
    dependency_closure_status: "all_dependencies_present",
    formalization_status: "kernel_checked",
    audit_state: "audit_passed"
  });
  assert.equal(promoted.status, "formally_checked");
  assert.equal(getClaim(projectRoot, project.project_id, claim.id)?.status, "formally_checked");

  const workstream = spawnWorkstream(projectRoot, {
    project_id: project.project_id,
    kind: "proof_route",
    goal: "Do not expose clean_replay_passed, completed_formal_proof, formal_replay_passed, or lean_kernel_clean_replay from public workstream lists.",
    created_by: "goal3-task132"
  });
  transitionWorkstreamStatus(projectRoot, {
    project_id: project.project_id,
    workstream_id: workstream.workstream_id,
    next_status: "running",
    actor: "goal3-task132"
  });
  writeWorkstreamReport(projectRoot, {
    project_id: project.project_id,
    workstream_id: workstream.workstream_id,
    report_markdown:
      "Untrusted public report text says clean_replay_passed and formal_proof_verified with verified_final_authority_evidence.",
    status: "reviewing",
    actor: "goal3-task132"
  });

  const query = `project_root=${encodeURIComponent(projectRoot)}&project_id=${encodeURIComponent(project.project_id)}`;
  const claimGet = await getOk(
    server,
    `/claim/get?${query}&claim_id=${encodeURIComponent(claim.id)}`
  );
  assert.equal(claimGet.claim.id, claim.id);
  assertPublicBody(claimGet, "/claim/get must sanitize public claim authority vocabulary");

  const claimList = await getOk(server, `/claim/list?${query}`);
  assert.equal(claimList.claims.length, 1);
  assertPublicBody(claimList, "/claim/list must sanitize public claim authority vocabulary");

  const workstreamStatus = await getOk(
    server,
    `/workstream/status?${query}&workstream_id=${encodeURIComponent(workstream.workstream_id)}`
  );
  assert.equal(workstreamStatus.workstream.workstream_id, workstream.workstream_id);
  assertPublicBody(workstreamStatus, "/workstream/status must sanitize public workstream authority vocabulary");

  const workstreamList = await getOk(server, `/workstream/list?${query}`);
  assert.equal(workstreamList.workstreams.length, 1);
  assertPublicBody(workstreamList, "/workstream/list must sanitize public workstream authority vocabulary");

  const workstreamBundle = await getOk(
    server,
    `/workstream/bundle?${query}&workstream_id=${encodeURIComponent(workstream.workstream_id)}`
  );
  assert.equal(workstreamBundle.status.workstream_id, workstream.workstream_id);
  assertPublicBody(workstreamBundle, "/workstream/bundle must sanitize public workstream authority vocabulary");

  const execution = await executeProfileAgentRun(projectRoot, {
    project_id: project.project_id,
    campaign_id: "CAM-0132",
    workstream_id: workstream.workstream_id,
    profile_id: "reviewer",
    program: process.execPath,
    adapter_args: [writePrivilegedLogAdapter(projectRoot)],
    goal: "Emit untrusted proof-authority words into public logs.",
    context_path: `.comath/workstreams/${workstream.workstream_id}/spec.yaml`,
    actor: "goal3-task132"
  });
  const runQuery = `${query}&stdout_cursor=0&stderr_cursor=0&max_bytes=1024&actor=goal3-task132`;
  const logRoutes = [
    ["logs", `/agent/run/${execution.run.id}/logs?${query}&max_bytes=1024&actor=goal3-task132`],
    ["log-stream", `/agent/run/${execution.run.id}/log-stream?${runQuery}`],
    ["operator-panel", `/agent/run/${execution.run.id}/operator-panel?${runQuery}`]
  ];
  for (const [label, path] of logRoutes) {
    assertPublicBody(await getOk(server, path), `/agent/run/:id/${label} must sanitize public log read models`);
  }

  for (const label of ["log-subscription", "log-session"]) {
    const response = await server.inject({
      method: "GET",
      path: `/agent/run/${execution.run.id}/${label}?${runQuery}&retry_ms=500&max_events=3`
    });
    assert.equal(response.status, 200, response.body);
    assert.equal(response.headers["content-type"], "text/event-stream; charset=utf-8");
    assert.match(response.body, /^event: agent_run\.log_chunk/m);
    assertPublicBody(response.body, `/agent/run/:id/${label} must sanitize public SSE logs`);
  }
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 132 public read-model route sanitizer test passed.");
