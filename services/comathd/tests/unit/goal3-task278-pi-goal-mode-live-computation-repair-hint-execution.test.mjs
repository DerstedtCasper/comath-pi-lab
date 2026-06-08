import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { startCampaign, tickCampaign } from "../../dist/index.js";

const root = mkdtempSync(join(tmpdir(), "comath-goal3-task278-live-computation-hint-"));
const liveApiKey = "sympy_live_secret_should_not_be_persisted_278";

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function assertSha256(value, label) {
  assert.equal(typeof value, "string", `${label} must be a string`);
  assert.match(value, /^[a-f0-9]{64}$/u, `${label} must be a SHA-256 digest`);
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(root, relativePath), "utf8"));
}

function writeFixtures(projectRoot) {
  mkdirSync(join(projectRoot, "papers"), { recursive: true });
  mkdirSync(join(projectRoot, "lean"), { recursive: true });
  writeFileSync(
    join(projectRoot, "papers", "source.md"),
    [
      "# Source",
      "",
      "Theorem. Failed Lean diagnostics should trigger service-owned live computation hints when explicitly enabled.",
      "Proof sketch. SymPy reports are repair context only and never proof authority.",
      ""
    ].join("\n")
  );
  writeFileSync(join(projectRoot, "lean", "Main.lean"), "theorem trivial_goal : True := by trivial\n");
}

function installFakeLeanLakeCommands(projectRoot, leanVersion = "9.99.9") {
  const binDir = join(projectRoot, "fake-bin");
  mkdirSync(binDir, { recursive: true });
  const previousPath = process.env.PATH;

  if (process.platform === "win32") {
    writeFileSync(
      join(binDir, "lean.cmd"),
      ["@echo off", `echo Lean (version ${leanVersion}, x86_64-pc-windows-msvc)`, "exit /b 0", ""].join("\r\n")
    );
    writeFileSync(
      join(binDir, "lake.cmd"),
      [
        "@echo off",
        "if \"%1\"==\"--version\" (",
        "  echo Lake version 5.0.0-src+abcdef",
        "  exit /b 0",
        ")",
        "echo unsolved goals 1>&2",
        "echo tactic failed, live computation hints may help repair 1>&2",
        "exit /b 1",
        ""
      ].join("\r\n")
    );
  } else {
    const leanPath = join(binDir, "lean");
    const lakePath = join(binDir, "lake");
    writeFileSync(leanPath, `#!/bin/sh\necho 'Lean (version ${leanVersion}, x86_64-unknown-linux-gnu)'\nexit 0\n`);
    writeFileSync(
      lakePath,
      [
        "#!/bin/sh",
        "if [ \"$1\" = \"--version\" ]; then",
        "  echo 'Lake version 5.0.0-src+abcdef'",
        "  exit 0",
        "fi",
        "echo 'unsolved goals' >&2",
        "echo 'tactic failed, live computation hints may help repair' >&2",
        "exit 1",
        ""
      ].join("\n")
    );
    chmodSync(leanPath, 0o755);
    chmodSync(lakePath, 0o755);
  }

  process.env.PATH = `${binDir}${delimiter}${previousPath ?? ""}`;
  return () => {
    if (previousPath === undefined) {
      delete process.env.PATH;
    } else {
      process.env.PATH = previousPath;
    }
  };
}

function startLiveSympyFixtureServer() {
  const requests = [];
  const server = createServer((request, response) => {
    let bodyText = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      bodyText += chunk;
    });
    request.on("end", () => {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      let body = null;
      if (bodyText.length > 0) {
        body = JSON.parse(bodyText);
      }
      requests.push({
        method: request.method,
        path: url.pathname,
        authorization: request.headers.authorization ?? null,
        contentType: request.headers["content-type"] ?? null,
        body
      });
      response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      response.end(
        JSON.stringify({
          status: "ok",
          exactness: "exact_symbolic",
          normalized_expression: "True",
          witness: "sympy.simplify(True)",
          notes: ["fixture computation report only; Lean replay remains required"]
        })
      );
    });
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      assert.ok(address && typeof address === "object");
      resolve({
        baseUrl: `http://127.0.0.1:${address.port}/compute`,
        requests,
        close: () =>
          new Promise((closeResolve, closeReject) => {
            server.close((error) => {
              if (error) {
                closeReject(error);
              } else {
                closeResolve();
              }
            });
          })
      });
    });
  });
}

async function advanceTo(campaignId, targetStage) {
  let body;
  for (let index = 0; index < 14; index += 1) {
    body = await tickCampaign({ project_root: root, campaign_id: campaignId, actor: "goal3-task278" });
    assert.notEqual(body.campaign.status, "blocked");
    assert.notEqual(body.campaign.status, "terminal");
    if (body.campaign.current_stage === targetStage) {
      return body;
    }
  }
  assert.fail(`campaign did not reach ${targetStage}`);
}

const previousEnv = {
  COMATH_ENABLE_GOAL_MODE_LIVE_REPAIR_HINT_EXECUTION: process.env.COMATH_ENABLE_GOAL_MODE_LIVE_REPAIR_HINT_EXECUTION,
  COMATH_LIVE_REPAIR_HINT_PROVIDERS: process.env.COMATH_LIVE_REPAIR_HINT_PROVIDERS,
  COMATH_SYMPY_COMPUTE_BASE_URL: process.env.COMATH_SYMPY_COMPUTE_BASE_URL,
  COMATH_SYMPY_API_KEY: process.env.COMATH_SYMPY_API_KEY
};

function restoreEnv() {
  for (const [key, value] of Object.entries(previousEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

let restoreFakeCommands = () => {};
let liveServer;

try {
  writeFixtures(root);
  liveServer = await startLiveSympyFixtureServer();
  process.env.COMATH_ENABLE_GOAL_MODE_LIVE_REPAIR_HINT_EXECUTION = "1";
  process.env.COMATH_LIVE_REPAIR_HINT_PROVIDERS = "computation:sympy";
  process.env.COMATH_SYMPY_COMPUTE_BASE_URL = liveServer.baseUrl;
  process.env.COMATH_SYMPY_API_KEY = liveApiKey;

  const started = startCampaign({
    project_root: root,
    project_name: "Goal 3 Task 278 Live Computation Repair Hint Execution",
    user_goal:
      "Prove theorem goal3_task278 : True := by sorry while preserving the exact theorem boundary and using live SymPy only as repair context.",
    domain: "formalization",
    mode: "goal",
    paper_paths: ["papers/source.md"],
    workspace_refs: ["lean"],
    budget: "frontier",
    goal_mode_policy: {
      mode: "goal",
      terminal_states: [
        "formal_replay_passed",
        "formal_counterexample_confirmed",
        "needs_user_statement_disambiguation",
        "blocked_with_replayable_certificate",
        "budget_exhausted_with_resume_state"
      ],
      require_user_confirmation_for_statement_lock: true,
      resume_enabled: true
    },
    strict_mode: true,
    actor: "goal3-task278"
  });
  const campaignId = started.campaign.campaign_id;

  await advanceTo(campaignId, "candidate_generation");
  await tickCampaign({ project_root: root, campaign_id: campaignId, actor: "goal3-task278" });
  await tickCampaign({ project_root: root, campaign_id: campaignId, actor: "goal3-task278" });
  await tickCampaign({ project_root: root, campaign_id: campaignId, actor: "goal3-task278" });
  await tickCampaign({ project_root: root, campaign_id: campaignId, actor: "goal3-task278" });
  await tickCampaign({ project_root: root, campaign_id: campaignId, actor: "goal3-task278" });

  restoreFakeCommands = installFakeLeanLakeCommands(root);
  const rejected = await tickCampaign({
    project_root: root,
    campaign_id: campaignId,
    actor: "goal3-task278",
    lean_candidate_attempt_runner: {
      leanToolchain: "leanprover/lean4:v9.99.9"
    }
  });
  restoreFakeCommands();
  restoreFakeCommands = () => {};

  assert.equal(rejected.campaign.status, "terminal");
  assert.equal(rejected.campaign.terminal_state, "blocked_with_replayable_reason");

  const resumed = await tickCampaign({ project_root: root, campaign_id: campaignId, actor: "goal3-task278" });
  assert.equal(resumed.campaign.status, "repairing");
  assert.equal(resumed.campaign.current_stage, "repair");
  assert.equal(liveServer.requests.length, 1);
  assert.equal(liveServer.requests[0].method, "POST");
  assert.equal(liveServer.requests[0].path, "/compute");
  assert.equal(liveServer.requests[0].authorization, `Bearer ${liveApiKey}`);
  assert.match(String(liveServer.requests[0].contentType), /application\/json/u);
  assert.equal(liveServer.requests[0].body.task, "repair_hint_context");
  assert.equal(liveServer.requests[0].body.kind, "computation");
  assert.equal(liveServer.requests[0].body.provider, "sympy");
  assert.equal(typeof liveServer.requests[0].body.input.locked_statement_hash, "string");
  assert.equal(typeof liveServer.requests[0].body.input.query_hash, "string");

  const hintExecutionRel = `.comath/campaign/${campaignId}/lean_candidate_attempt_repair_hint_execution.json`;
  const hintExecution = readJson(hintExecutionRel);
  assert.equal(hintExecution.schema_version, "comath.pi_goal_mode_lean_candidate_attempt_repair_hint_execution.v1");
  assert.equal(hintExecution.execution_status, "mixed_live_and_stubbed_provider_results_recorded");
  assert.equal(hintExecution.network_execution_performed, true);
  assert.equal(hintExecution.live_provider_execution_performed, true);
  assert.equal(hintExecution.stubbed_adapter_execution_performed, true);
  assert.equal(hintExecution.proof_authority, "none");
  assert.equal(hintExecution.can_promote_claim, false);
  assert.equal(hintExecution.can_certify_ga, false);
  assert.equal(hintExecution.result_can_be_used_as_proof, false);
  assert.equal(JSON.stringify(hintExecution).includes(root), false, "hint execution must not leak host root");
  assert.equal(JSON.stringify(hintExecution).includes(liveApiKey), false, "hint execution must not persist live provider secrets");

  const liveResult = hintExecution.adapter_results.find(
    (result) => result.kind === "computation" && result.provider === "sympy"
  );
  assert.ok(liveResult);
  assert.equal(liveResult.adapter_execution_state, "live_provider_result_recorded");
  assert.equal(liveResult.network_execution_performed, true);
  assert.equal(liveResult.live_provider_execution_performed, true);
  assert.equal(liveResult.proof_authority, "none");
  assert.equal(liveResult.can_promote_claim, false);
  assert.equal(liveResult.result_can_be_used_as_proof, false);
  assert.ok(liveResult.promotion_vetoes.includes("external_adapter_result_has_no_proof_authority"));
  assertSha256(liveResult.request_sha256, "live request sha");
  assertSha256(liveResult.result_payload_sha256, "live payload sha");
  assert.equal(liveResult.result_payload_summary.result_kind, "computation_report");
  assert.equal(liveResult.result_payload_summary.live_provider.provider, "sympy");
  assert.equal(liveResult.result_payload_summary.live_provider.network_execution_performed, true);
  assert.equal(liveResult.result_payload_summary.live_provider.response_status, 200);
  assert.equal(liveResult.result_payload_summary.live_provider.prompt_injection_scan.status, "pass");
  assertSha256(liveResult.result_payload_summary.live_provider.response_body_sha256, "live response body sha");
  assert.equal(liveResult.result_payload_summary.report.provider, "sympy");
  assert.equal(liveResult.result_payload_summary.report.exactness, "exact_symbolic");
  assert.equal(liveResult.result_payload_summary.report.result.status, "live_provider_response_recorded");
  assert.equal(liveResult.result_payload_summary.report.result.provider_status, "ok");
  assert.equal(liveResult.result_payload_summary.report.result.normalized_expression, "True");
  assert.equal(liveResult.result_payload_summary.report.proof_authority, "none");
  assert.equal(liveResult.result_payload_summary.report.can_promote_claim, false);

  const repairBatchRel = `.comath/campaign/${campaignId}/lean_candidate_attempt_repair_batch.json`;
  const repairBatch = readJson(repairBatchRel);
  for (const repairItem of repairBatch.per_candidate_repairs) {
    const task = readJson(repairItem.repair_task_path);
    const taskLiveResult = task.source_repair_hint_results.find(
      (result) => result.kind === "computation" && result.provider === "sympy"
    );
    assert.ok(taskLiveResult);
    assert.equal(taskLiveResult.adapter_execution_state, "live_provider_result_recorded");
    assert.equal(taskLiveResult.proof_authority, "none");
    assert.equal(taskLiveResult.result_can_be_used_as_proof, false);
  }

  const repaired = await tickCampaign({ project_root: root, campaign_id: campaignId, actor: "goal3-task278" });
  assert.equal(repaired.campaign.current_stage, "candidate_verification");
  const repairExecutionRel = `.comath/campaign/${campaignId}/lean_candidate_attempt_repair_execution.json`;
  assert.equal(existsSync(join(root, repairExecutionRel)), true);
  const repairExecution = readJson(repairExecutionRel);
  assert.equal(repairExecution.source_repair_hint_execution.path, hintExecutionRel);
  assert.equal(repairExecution.source_repair_hint_execution.sha256, sha256File(join(root, hintExecutionRel)));
  assert.equal(repairExecution.proof_authority, "none");
  for (const item of repairExecution.per_candidate_executions) {
    const consumedLiveResult = item.source_repair_hint_results.find(
      (result) => result.kind === "computation" && result.provider === "sympy"
    );
    assert.ok(consumedLiveResult);
    assert.equal(consumedLiveResult.adapter_execution_state, "live_provider_result_recorded");
    assert.equal(consumedLiveResult.proof_authority, "none");
    assert.equal(consumedLiveResult.result_can_be_used_as_proof, false);
    assert.equal(item.hint_execution_guided_revision_applied, true);
    assert.equal(item.result_can_be_used_as_proof, false);
  }
} finally {
  if (typeof restoreFakeCommands === "function") {
    restoreFakeCommands();
  }
  restoreEnv();
  if (liveServer) {
    await liveServer.close();
  }
  rmSync(root, { recursive: true, force: true });
}

console.log("Goal 3 Task 278 Pi goal-mode live computation repair hint execution test passed.");
