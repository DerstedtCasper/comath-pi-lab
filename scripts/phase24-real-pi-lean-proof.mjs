#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createComathServer } from "../services/comathd/dist/index.js";
import { loadPiSdkModules, runCoMathPiSdkWorkflow } from "../extensions/comath-pi/dist/pi-sdk-runner.js";

const providerId = process.env.COMATH_PI_PROVIDER ?? "comath-local";
const modelId = process.env.COMATH_PI_MODEL ?? "\u5b98\u65b9/deepseek-v4-pro";
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

function summarizeContent(content) {
  if (!Array.isArray(content)) {
    return "";
  }
  return content
    .map((part) => {
      if (part && typeof part === "object" && typeof part.text === "string") {
        return part.text;
      }
      return "";
    })
    .join("")
    .slice(0, 1200);
}

function summarizeAssistantMessage(message) {
  if (!message || typeof message !== "object") {
    return {};
  }
  return {
    role: message.role,
    stopReason: message.stopReason,
    model: message.model,
    provider: message.provider,
    errorMessage: message.errorMessage,
    text: summarizeContent(message.content)
  };
}

function summarizeEvent(event) {
  if (!event || typeof event !== "object") {
    return { type: typeof event };
  }
  const summary = { type: event.type };
  if (event.message && typeof event.message === "object") {
    summary.message = summarizeAssistantMessage(event.message);
  }
  if (Array.isArray(event.toolResults)) {
    summary.toolResultCount = event.toolResults.length;
  }
  return summary;
}

try {
  const { codingAgent } = await loadPiSdkModules();
  const authStorage = codingAgent.AuthStorage.create();
  const modelRegistry = codingAgent.ModelRegistry.create(authStorage);
  const model = modelRegistry.find(providerId, modelId);
  if (!model) {
    const known = modelRegistry
      .getAll()
      .filter((candidate) => candidate.provider === providerId)
      .map((candidate) => candidate.id);
    throw new Error(`Pi model ${providerId}/${modelId} not found. Known ${providerId} models: ${known.join(", ")}`);
  }
  const providerAuth = modelRegistry.getProviderAuthStatus(providerId);
  if (!providerAuth.configured) {
    throw new Error(
      `Pi provider ${providerId} is not configured. Configure its apiKey in Pi auth or models.json before running real-model validation.`
    );
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
  const expectedLeanSource = `theorem ${theoremName} (n : Nat) : n + 0 = n := by
  exact Nat.add_zero n
`;
  const result = await runCoMathPiSdkWorkflow({
    cwd: process.cwd(),
    comathdBaseUrl,
    model,
    thinkingLevel: "high",
    activeTools: ["comath_lean_check"],
    allowMutations: true,
    authMode: "pi-config",
    prompt: [
      "You are CoMath Pi Lab's autonomous formalization controller.",
      "You must generate Lean4 source yourself and call the tool comath_lean_check.",
      "Do not ask the host to translate, repair, or paste Lean. Do not answer with JSON instead of a tool call.",
      "The Lean authority is a bare Lean 4 project, not a mathlib project.",
      "Your lean_source must not contain imports, `open`, markdown fences, comments, or explanatory text.",
      "Submit exactly this complete Lean source as the lean_source argument:",
      expectedLeanSource,
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
    assistantMessages: result.assistantMessages.map(summarizeAssistantMessage),
    recentEvents: result.events.slice(-12).map(summarizeEvent),
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
