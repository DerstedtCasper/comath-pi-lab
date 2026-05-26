import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createComathServer } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-lean-route-"));
const server = createComathServer();

try {
  const init = await server.inject({
    method: "POST",
    path: "/project/init",
    body: { name: "Lean Route Project", root_path: projectRoot }
  });
  assert.equal(init.status, 200);

  const claim = await server.inject({
    method: "POST",
    path: "/claim/register",
    body: {
      project_root: projectRoot,
      project_id: init.body.project.project_id,
      statement: "The proposition True is provable.",
      assumptions: [],
      domain: "Lean4",
      actor: "lean-route-test"
    }
  });
  assert.equal(claim.status, 200);

  const checked = await server.inject({
    method: "POST",
    path: "/lean/check",
    body: {
      project_root: projectRoot,
      project_id: init.body.project.project_id,
      claim_id: claim.body.claim.id,
      theorem_name: "route_true",
      dependency_hash: "route-dependency-hash",
      lean_source: "theorem route_true : True := by\n  trivial\n",
      model_id: "official/deepseek-v4-pro",
      model_response_id: "resp-route-true",
      tool_call_id: "tool-call-route-true",
      actor: "lean-route-test"
    }
  });
  assert.equal(checked.status, 200);
  assert.equal(checked.body.run.claim_id, claim.body.claim.id);
  assert.equal(checked.body.run.kernel_checked, true);
  assert.equal(checked.body.run.status, "kernel_checked");
  assert.equal(checked.body.evidence.kind, "lean");
  assert.deepEqual(checked.body.evidence.artifact_ids, [
    checked.body.run.proof_artifact_id,
    checked.body.run.log_artifact_id
  ]);
  assert.equal(existsSync(checked.body.proof_path), true);
  assert.equal(checked.body.proof_path.includes(".comath"), true);
  assert.equal(checked.body.submission.origin, "model_tool_call");
  assert.equal(checked.body.submission.tool_call_id, "tool-call-route-true");
  assert.equal(checked.body.submission.model_response_id, "resp-route-true");
  assert.equal(checked.body.submission.source_sha256.length, 64);

  const missingToolCall = await server.inject({
    method: "POST",
    path: "/lean/check",
    body: {
      project_root: projectRoot,
      project_id: init.body.project.project_id,
      claim_id: claim.body.claim.id,
      theorem_name: "route_no_tool",
      dependency_hash: "route-dependency-hash",
      lean_source: "theorem route_no_tool : True := by\n  trivial\n",
      model_id: "official/deepseek-v4-pro",
      actor: "lean-route-test"
    }
  });
  assert.equal(missingToolCall.status, 400);
  assert.equal(missingToolCall.body.ok, false);

  const rejected = await server.inject({
    method: "POST",
    path: "/lean/check",
    body: {
      project_root: projectRoot,
      project_id: init.body.project.project_id,
      claim_id: claim.body.claim.id,
      theorem_name: "route_sorry",
      dependency_hash: "route-dependency-hash",
      lean_source: "theorem route_sorry : True := by\n  sorry\n",
      model_id: "official/deepseek-v4-pro",
      tool_call_id: "tool-call-route-sorry",
      actor: "lean-route-test"
    }
  });
  assert.equal(rejected.status, 200);
  assert.equal(rejected.body.run.kernel_checked, false);
  assert.equal(rejected.body.run.status, "skeleton_only");
  assert.equal(rejected.body.run.vetoes.includes("lean proof contains sorry/admit"), true);
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 18 Lean check route tests passed.");
