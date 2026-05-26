#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createComathServer } from "../services/comathd/dist/index.js";
import { loadPiSdkModules, runCoMathPiSdkWorkflow } from "../extensions/comath-pi/dist/pi-sdk-runner.js";

const providerId = process.env.COMATH_PI_PROVIDER ?? "comath-local";
const modelId = process.env.COMATH_PI_MODEL ?? "\u5b98\u65b9/deepseek-v4-pro";
const apiKey = process.env.COMATH_LAB_API_KEY;
const projectRoot = mkdtempSync(join(tmpdir(), "comath-real-pi-lean-"));
const server = createComathServer();
let nodeServer;

function readToolPayload(toolResult) {
  return {
    toolCallId: toolResult?.toolCallId,
    toolName: toolResult?.toolName,
    isError: toolResult?.isError === true,
    details: toolResult?.details ?? {},
    content: toolResult?.content ?? []
  };
}

try {
  if (!apiKey) {
    throw new Error("COMATH_LAB_API_KEY is not set; refusing to run real model validation without an explicit runtime key.");
  }

  const { codingAgent } = await loadPiSdkModules();
  const authStorage = codingAgent.AuthStorage.create();
  authStorage.setRuntimeApiKey(providerId, apiKey);
  const modelRegistry = codingAgent.ModelRegistry.create(authStorage);
  const model = modelRegistry.find(providerId, modelId);
  if (!model) {
    const known = modelRegistry
      .getAll()
      .filter((candidate) => candidate.provider === providerId)
      .map((candidate) => candidate.id);
    throw new Error(`Pi model ${providerId}/${modelId} not found. Known ${providerId} models: ${known.join(", ")}`);
  }

  nodeServer = await server.listen(0, "127.0.0.1");
  const address = nodeServer.address();
  assert.ok(address && typeof address !== "string");
  const comathdBaseUrl = `http://127.0.0.1:${address.port}`;

  const init = await server.inject({
    method: "POST",
    path: "/project/init",
    body: { name: "Real Pi SDK Lean Project", root_path: projectRoot }
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
      actor: "phase24-real-pi"
    }
  });
  assert.equal(claim.status, 200);

  const theoremName = "model_nat_add_zero";
  const result = await runCoMathPiSdkWorkflow({
    cwd: process.cwd(),
    comathdBaseUrl,
    model,
    thinkingLevel: "high",
    activeTools: ["comath_lean_check"],
    allowMutations: true,
    apiKey: { provider: providerId, value: apiKey },
    prompt: [
      "You are CoMath Pi Lab's autonomous formalization controller.",
      "You must generate Lean4 source yourself and call the tool comath_lean_check.",
      "Do not ask the host to translate, repair, or paste Lean. Do not answer with JSON instead of a tool call.",
      "Use exactly this theorem statement and proof target:",
      `theorem ${theoremName} (n : Nat) : n + 0 = n := by`,
      "  exact Nat.add_zero n",
      "",
      "Call comath_lean_check with:",
      `project_root=${projectRoot}`,
      `project_id=${init.body.project.project_id}`,
      `claim_id=${claim.body.claim.id}`,
      `theorem_name=${theoremName}`,
      "dependency_hash=phase24-real-pi-sdk-lean",
      `model_id=${providerId}/${modelId}`,
      "actor=phase24-real-pi",
      "lean_source containing the complete Lean source."
    ].join("\n")
  });

  const toolResults = result.leanToolResults.map(readToolPayload);
  const accepted = toolResults.find((toolResult) => toolResult.details?.run?.kernel_checked === true);
  const summary = {
    ok: Boolean(accepted),
    provider: providerId,
    model: modelId,
    comathdBaseUrl,
    activeToolNames: result.activeToolNames,
    leanToolResultCount: toolResults.length,
    toolResults,
    error: result.error
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (!accepted) {
    process.exitCode = 1;
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
}
