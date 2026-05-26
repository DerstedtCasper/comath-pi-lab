import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createComathServer } from "../../../services/comathd/dist/index.js";

const { runFakeModelLeanProofFlow } = await import("../dist/pi-sdk-runner.js");

const testDir = dirname(fileURLToPath(import.meta.url));
const extensionPath = resolve(testDir, "../dist/pi-extension.js");
const projectRoot = mkdtempSync(join(tmpdir(), "comath-pi-sdk-lean-"));
const server = createComathServer();
const nodeServer = await server.listen(0, "127.0.0.1");
const address = nodeServer.address();
assert.ok(address && typeof address !== "string");
const baseUrl = `http://127.0.0.1:${address.port}`;

try {
  const init = await server.inject({
    method: "POST",
    path: "/project/init",
    body: { name: "Pi SDK Autonomous Lean Project", root_path: projectRoot }
  });
  assert.equal(init.status, 200);

  const claim = await server.inject({
    method: "POST",
    path: "/claim/register",
    body: {
      project_root: projectRoot,
      project_id: init.body.project.project_id,
      statement: "Natural number addition by zero is identity.",
      assumptions: [],
      domain: "Lean4",
      actor: "phase24-test"
    }
  });
  assert.equal(claim.status, 200);

  const result = await runFakeModelLeanProofFlow({
    cwd: process.cwd(),
    projectRoot,
    projectId: init.body.project.project_id,
    claimId: claim.body.claim.id,
    theoremName: "model_nat_add_zero",
    dependencyHash: "phase24-autonomous-lean-faux",
    leanSource: "theorem model_nat_add_zero (n : Nat) : n + 0 = n := by\n  exact Nat.add_zero n\n",
    modelId: "faux-comath-lean-prover",
    modelResponseId: "resp-phase24-autonomous-lean",
    toolCallId: "tool-call-phase24-autonomous-lean",
    comathdBaseUrl: baseUrl,
    extensionPath,
    modulePaths: {
      codingAgent: "C:/Program Files/nodejs/node_global/node_modules/@earendil-works/pi-coding-agent/dist/index.js",
      piAi: "C:/Program Files/nodejs/node_global/node_modules/@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-ai/dist/index.js"
    }
  });

  assert.equal(result.error, undefined);
  assert.equal(result.ok, true);
  assert.equal(result.activeToolNames.includes("comath_lean_check"), true);
  assert.equal(result.leanToolResults.length, 1);

  const toolResult = result.leanToolResults[0];
  assert.equal(toolResult.role, "toolResult");
  assert.equal(toolResult.toolName, "comath_lean_check");
  assert.equal(toolResult.toolCallId, "tool-call-phase24-autonomous-lean");
  assert.equal(toolResult.details.run.kernel_checked, true);
  assert.equal(toolResult.details.run.status, "kernel_checked");
  assert.equal(toolResult.details.run.claim_id, claim.body.claim.id);
  assert.equal(toolResult.details.evidence.kind, "lean");
  assert.equal(toolResult.details.submission.origin, "model_tool_call");
  assert.equal(toolResult.details.submission.tool_call_id, "tool-call-phase24-autonomous-lean");
  assert.equal(toolResult.details.submission.model_response_id, "resp-phase24-autonomous-lean");
  assert.equal(toolResult.details.submission.model_id, "faux-comath-lean-prover");
  assert.equal(toolResult.details.submission.source_sha256.length, 64);
  assert.equal(pathToFileURL(toolResult.details.proof_path).href.startsWith(pathToFileURL(projectRoot).href), true);
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 24 Pi SDK autonomous Lean workflow tests passed.");
