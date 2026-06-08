import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import {
  exportCampaignGoalModeEvidence,
  getClaim,
  projectExternalV3TerminalState,
  startCampaign,
  tickCampaign
} from "../../dist/index.js";

const root = mkdtempSync(join(tmpdir(), "comath-goal3-task280-live-computation-final-provenance-"));
const liveApiKey = "sympy_live_secret_should_not_be_persisted_280";

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
      "Theorem. A live computation report may repair a closed arithmetic candidate, but final replay material must bind that non-authoritative provenance.",
      "Proof sketch. SymPy returning True is only candidate context; Lean clean replay remains the final authority.",
      ""
    ].join("\n")
  );
  writeFileSync(join(projectRoot, "lean", "Main.lean"), "theorem goal3_task280_source : (2 : Int) + 2 = 4 := by decide\n");
}

function installFakeLeanLakeCommands(projectRoot, mode, leanVersion = "9.99.9") {
  const binDir = join(projectRoot, `fake-bin-${mode}`);
  const logPath = join(projectRoot, `fake-leanrunner-${mode}.jsonl`);
  mkdirSync(binDir, { recursive: true });
  const previousPath = process.env.PATH;
  const previousLog = process.env.COMATH_TASK280_RUN_LOG;
  process.env.COMATH_TASK280_RUN_LOG = logPath;

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
            "echo %CD%^|%*>>\"%COMATH_TASK280_RUN_LOG%\"",
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
            "echo %CD%^|%*>>\"%COMATH_TASK280_RUN_LOG%\"",
            "if exist LeanCandidate.lean (",
            "  findstr /C:\"?comath_repair_placeholder\" LeanCandidate.lean >nul && exit /b 5",
            "  findstr /C:\"theorem goal3_task280 : (2 : Int) + 2 = 4 := by\" LeanCandidate.lean >nul || exit /b 6",
            "  findstr /C:\"decide\" LeanCandidate.lean >nul || exit /b 7",
            ")",
            "echo MathResearch.goal3_task280 : (2 : Int) + 2 = 4",
            "echo MathResearch.goal3_task280 does not depend on any axioms",
            "echo goal3_task280 : (2 : Int) + 2 = 4",
            "echo goal3_task280 does not depend on any axioms",
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
            "printf '%s|%s\\n' \"$PWD\" \"$*\" >> \"$COMATH_TASK280_RUN_LOG\"",
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
            "printf '%s|%s\\n' \"$PWD\" \"$*\" >> \"$COMATH_TASK280_RUN_LOG\"",
            "if [ -f LeanCandidate.lean ]; then",
            "  grep -q '?comath_repair_placeholder' LeanCandidate.lean && exit 5",
            "  grep -q 'theorem goal3_task280 : (2 : Int) + 2 = 4 := by' LeanCandidate.lean || exit 6",
            "  grep -q 'decide' LeanCandidate.lean || exit 7",
            "fi",
            "echo 'MathResearch.goal3_task280 : (2 : Int) + 2 = 4'",
            "echo 'MathResearch.goal3_task280 does not depend on any axioms'",
            "echo 'goal3_task280 : (2 : Int) + 2 = 4'",
            "echo 'goal3_task280 does not depend on any axioms'",
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
        delete process.env.COMATH_TASK280_RUN_LOG;
      } else {
        process.env.COMATH_TASK280_RUN_LOG = previousLog;
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
    body = await tickCampaign({ project_root: root, campaign_id: campaignId, actor: "goal3-task280" });
    assert.notEqual(body.campaign.status, "blocked");
    if (predicate(body)) {
      return body;
    }
  }
  assert.fail(`campaign did not reach ${label}; last stage was ${body?.campaign.current_stage}`);
}

async function tickUntilTerminal(campaignId, maxTicks = 42) {
  let body;
  for (let index = 0; index < maxTicks; index += 1) {
    body = await tickCampaign({
      project_root: root,
      campaign_id: campaignId,
      actor: "goal3-task280",
      lean_candidate_attempt_runner: {
        leanToolchain: "leanprover/lean4:v9.99.9"
      }
    });
    if (body.campaign.status === "terminal") {
      return body;
    }
  }
  assert.fail(`campaign did not reach terminal; last stage was ${body?.campaign.current_stage}`);
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
    project_name: "Goal 3 Task 280 Live Computation Final Replay Provenance",
    user_goal:
      "Prove theorem goal3_task280 : (2 : Int) + 2 = 4 := by sorry while preserving the exact theorem boundary and binding live computation repair provenance into final replay material.",
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
    actor: "goal3-task280"
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
        "theorem goal3_task280 : (2 : Int) + 2 = 4 := by",
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
    actor: "goal3-task280",
    lean_candidate_attempt_runner: {
      leanToolchain: "leanprover/lean4:v9.99.9"
    }
  });
  restoreFakeCommands();
  restoreFakeCommands = () => {};

  assert.equal(rejected.campaign.status, "terminal");
  assert.equal(rejected.campaign.terminal_state, "blocked_with_replayable_reason");
  assert.equal(rejected.lean_candidate_attempt_leanrunner_execution.execution_result, "all_attempts_rejected");

  const resumed = await tickCampaign({ project_root: root, campaign_id: campaignId, actor: "goal3-task280" });
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

  const repaired = await tickCampaign({ project_root: root, campaign_id: campaignId, actor: "goal3-task280" });
  assert.equal(repaired.campaign.current_stage, "candidate_verification");
  const repairExecutionRel = `.comath/campaign/${campaignId}/lean_candidate_attempt_repair_execution.json`;
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
    assert.match(stripLineComments(repairedText), /theorem goal3_task280\s*:\s*\(2\s*:\s*Int\)\s*\+\s*2\s*=\s*4\s*:=\s*by\s+decide/u);
  }

  const passCommands = installFakeLeanLakeCommands(root, "pass");
  restoreFakeCommands = passCommands.restore;
  const result = await tickUntilTerminal(campaignId);
  restoreFakeCommands();
  restoreFakeCommands = () => {};

  assert.equal(result.campaign.current_stage, "completed_formal_proof", JSON.stringify(result.campaign.blockers, null, 2));
  assert.equal(result.campaign.terminal_state, "completed_formal_proof");
  assert.equal(result.campaign.formal_replay_authority_passed, true);
  assert.equal(projectExternalV3TerminalState(result.campaign, { projectRoot: root }), "formal_proof_verified");
  assert.equal(getClaim(root, started.campaign.project_id, started.campaign.root_claim_id)?.status, "formally_checked");

  const decision = readJson(`.comath/campaign/${campaignId}/ensembles/lemma_sprint/PO-0001/decision.json`);
  const selectedCandidateId = decision.selected_candidate_id ?? null;
  assert.equal(typeof selectedCandidateId, "string");
  const finalCandidates = readJson(candidatesRel);
  const selected = finalCandidates.find((candidate) => candidate.candidate_id === selectedCandidateId);
  assert.ok(selected);
  const manifest = readJson(selected.manifest_path);
  const descriptorArtifact = manifest.artifacts.find((artifact) => artifact.kind === "candidate_replay_project_descriptor");
  assert.ok(descriptorArtifact);
  const sourceArtifact = manifest.artifacts.find((artifact) => artifact.kind === "final_replay_material_source");
  assert.ok(sourceArtifact);

  const descriptor = readJson(`${selected.workspace_path}/${descriptorArtifact.path}`);
  assert.equal(descriptor.lean_project.formal_spec.normalized_statement, "MathResearch.goal3_task280 : (2 : Int) + 2 = 4");
  const provenance = descriptor.candidate_repair_provenance;
  assert.ok(provenance, "candidate replay descriptor must bind live computation repair provenance");
  assert.equal(provenance.proof_authority, "none");
  assert.equal(provenance.can_promote_claim, false);
  assert.equal(provenance.repair_stage, "live_computation_sympy_true_decide_repair");
  assert.equal(provenance.source_repair_hint_execution.path, hintExecutionRel);
  assert.equal(provenance.source_repair_hint_execution.sha256, sha256File(join(root, hintExecutionRel)));
  assert.equal(provenance.source_repair_hint_execution.proof_authority, "none");
  assert.equal(provenance.source_repair_execution.path, repairExecutionRel);
  assert.equal(provenance.source_repair_execution.sha256, sha256File(join(root, repairExecutionRel)));
  assert.equal(provenance.source_repair_execution.proof_authority, "none");

  const source = readJson(`${selected.workspace_path}/${sourceArtifact.path}`);
  assert.deepEqual(source.candidate_repair_provenance, provenance);
  assert.equal(JSON.stringify(source).includes(root), false, "final replay material source must not leak host root");
  assert.equal(JSON.stringify(source).includes(liveApiKey), false, "final replay material source must not persist live provider secrets");

  const targetRel = `${selected.workspace_path}/final_replay_project/MathResearch/Target.lean`;
  const target = readFileSync(join(root, targetRel), "utf8");
  assert.match(target, /theorem goal3_task280\s*:\s*\(2\s*:\s*Int\)\s*\+\s*2\s*=\s*4\s*:=\s*by\s+decide/u);
  assert.equal(target.includes("sorry"), false);
  assert.equal(target.includes("?comath_repair_placeholder"), false);

  const finalReplayManifest = readJson(`.comath/evidence/${started.campaign.root_claim_id}/lean/final_replay_manifest_v3.json`);
  assert.equal(finalReplayManifest.result, "pass");
  assert.equal(finalReplayManifest.runner, "comathd.LeanAuthority");

  const exported = exportCampaignGoalModeEvidence({
    project_root: root,
    campaign_id: campaignId,
    actor: "goal3-task280"
  });
  assert.equal(exported.export_manifest.evidence_pack_ready, true);
  assert.equal(exported.export_manifest.proof_authority, "lean_kernel_clean_replay");
  assert.deepEqual(exported.export_manifest.candidate_repair_provenance, provenance);
  assert.equal(exported.export_manifest.candidate_repair_provenance.proof_authority, "none");
  assert.equal(exported.export_manifest.candidate_repair_provenance.can_promote_claim, false);
  assert.equal(JSON.stringify(exported.export_manifest).includes(root), false, "export manifest must not leak host root");
  assert.equal(JSON.stringify(exported.export_manifest).includes(liveApiKey), false, "export manifest must not persist live provider secrets");
  assert.equal(existsSync(passCommands.logPath), true);
  assertSha256(provenance.source_repair_hint_execution.sha256, "hint execution provenance sha");
  assertSha256(provenance.source_repair_execution.sha256, "repair execution provenance sha");
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

console.log("Goal 3 Task 280 Pi goal-mode live computation final replay provenance test passed.");
