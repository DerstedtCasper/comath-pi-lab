import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { startCampaign, tickCampaign } from "../../dist/index.js";

const root = mkdtempSync(join(tmpdir(), "comath-goal3-task279-live-computation-decide-repair-"));
const liveApiKey = "sympy_live_secret_should_not_be_persisted_279";

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(root, relativePath), "utf8"));
}

function stripLineComments(text) {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const index = line.indexOf("--");
      return index >= 0 ? line.slice(0, index) : line;
    })
    .join("\n");
}

function hasLeanSorry(text) {
  return /(?:^|[^A-Za-z0-9_'])sorry(?:[^A-Za-z0-9_']|$)/u.test(stripLineComments(text));
}

function hasLeanHole(text) {
  return /(?:^|[^A-Za-z0-9_'])\?[A-Za-z_][A-Za-z0-9_']*/u.test(stripLineComments(text));
}

function writeFixtures(projectRoot) {
  mkdirSync(join(projectRoot, "papers"), { recursive: true });
  mkdirSync(join(projectRoot, "lean"), { recursive: true });
  writeFileSync(
    join(projectRoot, "papers", "source.md"),
    [
      "# Source",
      "",
      "Theorem. Live computation reports may suggest a closed decidable arithmetic repair, but LeanRunner remains the checker.",
      "Proof sketch. SymPy returning True is only a repair hint; CoMath may try `decide` as candidate material.",
      ""
    ].join("\n")
  );
  writeFileSync(join(projectRoot, "lean", "Main.lean"), "theorem goal3_task279_source : (2 : Int) + 2 = 4 := by decide\n");
}

function installFakeLeanLakeCommands(projectRoot, mode, leanVersion = "9.99.9") {
  const binDir = join(projectRoot, `fake-bin-${mode}`);
  const logPath = join(projectRoot, `fake-leanrunner-${mode}.jsonl`);
  mkdirSync(binDir, { recursive: true });
  const previousPath = process.env.PATH;
  const previousLog = process.env.COMATH_TASK279_RUN_LOG;
  process.env.COMATH_TASK279_RUN_LOG = logPath;

  if (process.platform === "win32") {
    writeFileSync(
      join(binDir, "lean.cmd"),
      ["@echo off", `echo Lean (version ${leanVersion}, x86_64-pc-windows-msvc)`, "exit /b 0", ""].join("\r\n")
    );
    const lakeBody =
      mode === "reject"
        ? [
            "@echo off",
            "if \"%1\"==\"--version\" (",
            "  echo Lake version 5.0.0-src+abcdef",
            "  exit /b 0",
            ")",
            "echo %CD%^|%*>>\"%COMATH_TASK279_RUN_LOG%\"",
            "echo tactic failed, live SymPy True hint may repair closed arithmetic 1>&2",
            "exit /b 1",
            ""
          ]
        : [
            "@echo off",
            "if \"%1\"==\"--version\" (",
            "  echo Lake version 5.0.0-src+abcdef",
            "  exit /b 0",
            ")",
            "echo %CD%^|%*>>\"%COMATH_TASK279_RUN_LOG%\"",
            "if not exist LeanCandidate.lean exit /b 3",
            "findstr /C:\"?comath_repair_placeholder\" LeanCandidate.lean >nul && exit /b 5",
            "findstr /C:\"theorem goal3_task279 : (2 : Int) + 2 = 4 := by\" LeanCandidate.lean >nul || exit /b 6",
            "findstr /C:\"decide\" LeanCandidate.lean >nul || exit /b 7",
            "exit /b 0",
            ""
          ];
    writeFileSync(join(binDir, "lake.cmd"), lakeBody.join("\r\n"));
  } else {
    const leanPath = join(binDir, "lean");
    const lakePath = join(binDir, "lake");
    writeFileSync(leanPath, `#!/bin/sh\necho 'Lean (version ${leanVersion}, x86_64-unknown-linux-gnu)'\nexit 0\n`);
    const lakeBody =
      mode === "reject"
        ? [
            "#!/bin/sh",
            "if [ \"$1\" = \"--version\" ]; then",
            "  echo 'Lake version 5.0.0-src+abcdef'",
            "  exit 0",
            "fi",
            "printf '%s|%s\\n' \"$PWD\" \"$*\" >> \"$COMATH_TASK279_RUN_LOG\"",
            "echo 'tactic failed, live SymPy True hint may repair closed arithmetic' >&2",
            "exit 1",
            ""
          ]
        : [
            "#!/bin/sh",
            "if [ \"$1\" = \"--version\" ]; then",
            "  echo 'Lake version 5.0.0-src+abcdef'",
            "  exit 0",
            "fi",
            "printf '%s|%s\\n' \"$PWD\" \"$*\" >> \"$COMATH_TASK279_RUN_LOG\"",
            "[ -f LeanCandidate.lean ] || exit 3",
            "grep -q '?comath_repair_placeholder' LeanCandidate.lean && exit 5",
            "grep -q 'theorem goal3_task279 : (2 : Int) + 2 = 4 := by' LeanCandidate.lean || exit 6",
            "grep -q 'decide' LeanCandidate.lean || exit 7",
            "exit 0",
            ""
          ];
    writeFileSync(lakePath, lakeBody.join("\n"));
    chmodSync(leanPath, 0o755);
    chmodSync(lakePath, 0o755);
  }

  process.env.PATH = `${binDir}${delimiter}${previousPath ?? ""}`;
  return {
    logPath,
    restore: () => {
      if (previousPath === undefined) {
        delete process.env.PATH;
      } else {
        process.env.PATH = previousPath;
      }
      if (previousLog === undefined) {
        delete process.env.COMATH_TASK279_RUN_LOG;
      } else {
        process.env.COMATH_TASK279_RUN_LOG = previousLog;
      }
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
      requests.push({
        method: request.method,
        path: url.pathname,
        authorization: request.headers.authorization ?? null,
        body: bodyText.length > 0 ? JSON.parse(bodyText) : null
      });
      response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      response.end(
        JSON.stringify({
          status: "ok",
          exactness: "exact_symbolic",
          normalized_expression: "True",
          witness: "sympy.simplify((2 + 2) - 4)",
          notes: ["fixture computation report only; Lean decide and clean replay remain required"]
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

async function tickUntil(campaignId, predicate, label, maxTicks = 18) {
  let body;
  for (let index = 0; index < maxTicks; index += 1) {
    body = await tickCampaign({ project_root: root, campaign_id: campaignId, actor: "goal3-task279" });
    assert.notEqual(body.campaign.status, "blocked");
    if (predicate(body)) {
      return body;
    }
  }
  assert.fail(`campaign did not reach ${label}; last stage was ${body?.campaign.current_stage}`);
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
    project_name: "Goal 3 Task 279 Live Computation Decide Repair",
    user_goal:
      "Prove theorem goal3_task279 : (2 : Int) + 2 = 4 := by sorry while preserving the exact theorem boundary and using SymPy True only as candidate repair context.",
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
    actor: "goal3-task279"
  });
  const campaignId = started.campaign.campaign_id;
  const candidatesRel = `.comath/campaign/${campaignId}/ensembles/lemma_sprint/PO-0001/candidates.json`;

  await tickUntil(campaignId, () => existsSync(join(root, candidatesRel)), "candidate attempts materialized");
  const candidates = readJson(candidatesRel);
  assert.equal(candidates.length, 8);
  for (const candidate of candidates) {
    const leanRel = `${candidate.workspace_path}/LeanCandidate.lean`;
    writeFileSync(
      join(root, leanRel),
      [
        "-- intentionally wrong but placeholder-free candidate; LeanRunner must reject it before live computation repairs it.",
        "theorem goal3_task279 : (2 : Int) + 2 = 4 := by",
        "  exact rfl",
        ""
      ].join("\n")
    );
  }

  await tickUntil(
    campaignId,
    () => {
      const reportRel = `.comath/campaign/${campaignId}/lean_candidate_attempt_check_report.json`;
      if (!existsSync(join(root, reportRel))) {
        return false;
      }
      const report = readJson(reportRel);
      return report.candidates_ready_for_lean_runner === 8;
    },
    "ready-for-LeanRunner candidate preflight"
  );

  const rejectCommands = installFakeLeanLakeCommands(root, "reject");
  restoreFakeCommands = rejectCommands.restore;
  const rejected = await tickCampaign({
    project_root: root,
    campaign_id: campaignId,
    actor: "goal3-task279",
    lean_candidate_attempt_runner: {
      leanToolchain: "leanprover/lean4:v9.99.9"
    }
  });
  restoreFakeCommands();
  restoreFakeCommands = () => {};

  assert.equal(rejected.campaign.status, "terminal");
  assert.equal(rejected.campaign.terminal_state, "blocked_with_replayable_reason");
  assert.equal(rejected.lean_candidate_attempt_leanrunner_execution.execution_result, "all_attempts_rejected");

  const resumed = await tickCampaign({ project_root: root, campaign_id: campaignId, actor: "goal3-task279" });
  assert.equal(resumed.campaign.status, "repairing");
  assert.equal(resumed.campaign.current_stage, "repair");
  assert.equal(liveServer.requests.length, 1);
  assert.equal(liveServer.requests[0].authorization, `Bearer ${liveApiKey}`);

  const hintExecutionRel = `.comath/campaign/${campaignId}/lean_candidate_attempt_repair_hint_execution.json`;
  const hintExecution = readJson(hintExecutionRel);
  const liveResult = hintExecution.adapter_results.find(
    (result) => result.kind === "computation" && result.provider === "sympy"
  );
  assert.ok(liveResult);
  assert.equal(liveResult.adapter_execution_state, "live_provider_result_recorded");
  assert.equal(liveResult.proof_authority, "none");
  assert.equal(liveResult.result_can_be_used_as_proof, false);
  assert.equal(JSON.stringify(hintExecution).includes(root), false, "hint execution must not leak host root");
  assert.equal(JSON.stringify(hintExecution).includes(liveApiKey), false, "hint execution must not persist live provider secrets");
  assert.equal(liveResult.result_payload_summary.live_provider.prompt_injection_scan.status, "pass");
  assert.equal(liveResult.result_payload_summary.report.exactness, "exact_symbolic");
  assert.equal(liveResult.result_payload_summary.report.result.normalized_expression, "True");
  assert.equal(liveResult.result_payload_summary.report.proof_authority, "none");

  const repaired = await tickCampaign({ project_root: root, campaign_id: campaignId, actor: "goal3-task279" });
  assert.equal(repaired.campaign.current_stage, "candidate_verification");
  assert.equal(repaired.repair_execution.source_repair_hint_execution.path, hintExecutionRel);
  assert.equal(repaired.repair_execution.source_repair_hint_execution.sha256, sha256File(join(root, hintExecutionRel)));
  assert.equal(repaired.repair_execution.repaired_placeholder_free_candidate_count, 8);
  for (const item of repaired.repair_execution.per_candidate_executions) {
    assert.equal(item.placeholder_free_repair_materialized, true);
    assert.equal(item.placeholder_free_repair_strategy, "live_computation_sympy_true_decide_repair");
    assert.equal(item.hint_execution_guided_revision_applied, true);
    assert.equal(item.proof_authority, "none");
    assert.equal(item.result_can_be_used_as_proof, false);
    const repairedText = readFileSync(join(root, item.repaired_lean_file_path), "utf8");
    assert.equal(hasLeanSorry(repairedText), false);
    assert.equal(hasLeanHole(repairedText), false);
    assert.equal(repairedText.includes("?comath_repair_placeholder"), false);
    assert.match(stripLineComments(repairedText), /theorem goal3_task279\s*:\s*\(2\s*:\s*Int\)\s*\+\s*2\s*=\s*4\s*:=\s*by\s+decide/u);
  }

  const passCommands = installFakeLeanLakeCommands(root, "pass");
  restoreFakeCommands = passCommands.restore;
  const executed = await tickCampaign({
    project_root: root,
    campaign_id: campaignId,
    actor: "goal3-task279",
    lean_candidate_attempt_runner: {
      leanToolchain: "leanprover/lean4:v9.99.9"
    }
  });
  restoreFakeCommands();
  restoreFakeCommands = () => {};

  assert.equal(executed.campaign.current_stage, "candidate_arbitration", JSON.stringify(executed.campaign.blockers, null, 2));
  assert.equal(executed.lean_candidate_attempt_leanrunner_execution.execution_result, "kernel_checked_candidates_available");
  assert.equal(executed.lean_candidate_attempt_leanrunner_execution.kernel_checked_candidate_count, 8);
  assert.equal(existsSync(passCommands.logPath), true);
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

console.log("Goal 3 Task 279 Pi goal-mode live computation decide repair test passed.");
