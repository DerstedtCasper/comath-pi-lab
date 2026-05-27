import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  createAgentRun,
  createAgentRunScheduler,
  getAgentRun,
  initProject,
  readAuditEvents,
  spawnWorkstream
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-phase28-agent-scheduler-"));

function validReport(extra = "") {
  return [
    "# Agent Report",
    "",
    "## Input Context",
    "Scheduler-launched fixture.",
    "",
    "## Actions Taken",
    "Executed a real child process.",
    "",
    "## Claims Proposed",
    "No trusted claim promotion.",
    "",
    "## Evidence Produced",
    "Only process logs and report text.",
    "",
    "## Graph Patch",
    "No GraphPatch authority.",
    "",
    "## Blockers",
    "None.",
    "",
    "## Failed Routes",
    "None.",
    "",
    "## Self-Review",
    "No proof authority claimed.",
    "",
    "## Next Actions",
    "Review scheduler output.",
    extra,
    ""
  ].join("\n");
}

function writeFixtureScript(name, source) {
  const dir = join(projectRoot, ".tmp", "phase28-fixtures");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, name);
  writeFileSync(path, source, "utf8");
  return path;
}

function successScript(name, delayMs) {
  return writeFixtureScript(
    name,
    [
      `setTimeout(() => {`,
      `  process.stderr.write("stderr:" + process.env.COMATH_AGENT_RUN_ID + "\\n");`,
      `  process.stdout.write(${JSON.stringify(validReport(`Fixture ${name} completed.`))});`,
      `}, ${delayMs});`,
      ""
    ].join("\n")
  );
}

function sleepScript(name) {
  return writeFixtureScript(
    name,
    [
      `process.stdout.write("started:" + process.env.COMATH_AGENT_RUN_ID + "\\n");`,
      "setInterval(() => {}, 1000);",
      ""
    ].join("\n")
  );
}

function invalidReportScript(name) {
  return writeFixtureScript(
    name,
    [
      `process.stdout.write("not a structured AgentRun report\\n");`,
      ""
    ].join("\n")
  );
}

function failingScript(name) {
  return writeFixtureScript(
    name,
    [
      `process.stderr.write("fixture failed:" + process.env.COMATH_AGENT_RUN_ID + "\\n");`,
      "process.exit(7);",
      ""
    ].join("\n")
  );
}

function envProbeScript(name) {
  const reportTemplate = validReport("Inherited secret env: __LEAKED_ENV__");
  return writeFixtureScript(
    name,
    [
      `const leaked = process.env.COMATH_PHASE28_SECRET || "absent";`,
      `process.stdout.write(${JSON.stringify(reportTemplate)}.replace("__LEAKED_ENV__", leaked));`,
      ""
    ].join("\n")
  );
}

function overclaimScript(name) {
  return writeFixtureScript(
    name,
    [
      `process.stdout.write(${JSON.stringify(
        validReport("Child says: formally_checked evidence_level=5 proof complete.")
      )});`,
      ""
    ].join("\n")
  );
}

function largeReportScript(name) {
  return writeFixtureScript(
    name,
    [
      `process.stdout.write(${JSON.stringify(validReport("Large output begins."))});`,
      `process.stdout.write("x".repeat(400_000));`,
      ""
    ].join("\n")
  );
}

function markerChildScript(name) {
  return writeFixtureScript(
    name,
    [
      `import { appendFileSync } from "node:fs";`,
      `const marker = process.argv[2];`,
      `const deadline = Date.now() + 2_000;`,
      `const interval = setInterval(() => {`,
      `  appendFileSync(marker, "x");`,
      `  if (Date.now() > deadline) {`,
      `    clearInterval(interval);`,
      `    process.exit(0);`,
      `  }`,
      `}, 20);`,
      ""
    ].join("\n")
  );
}

function processTreeParentScript(name, childScript) {
  return writeFixtureScript(
    name,
    [
      `import { spawn } from "node:child_process";`,
      `spawn(process.execPath, [${JSON.stringify(childScript)}, process.argv[2]], { stdio: "ignore" });`,
      `setInterval(() => {}, 1000);`,
      ""
    ].join("\n")
  );
}

function createRun(projectId, workstreamId, role = "proof_route") {
  return createAgentRun(projectRoot, {
    project_id: projectId,
    campaign_id: "CAM-0001",
    workstream_id: workstreamId,
    role,
    model: "node-fixture",
    tool_profile: "phase28-process-fixture",
    actor: "phase28-test"
  });
}

const nonAllowlistedProgram =
  process.platform === "win32" ? join(process.env.SystemRoot ?? "C:\\Windows", "System32", "cmd.exe") : "/bin/sh";

try {
  const init = initProject({ name: "Phase 28 Scheduler Project", root_path: projectRoot });
  const projectId = init.project.project_id;
  const workstream = spawnWorkstream(projectRoot, {
    project_id: projectId,
    kind: "proof_route",
    goal: "Launch real child-agent fixtures through the AgentRun scheduler.",
    created_by: "phase28-test"
  });

  const scheduler = createAgentRunScheduler({
    max_concurrent: 1,
    rpm: 20,
    allowed_programs: [process.execPath]
  });

  const firstRun = createRun(projectId, workstream.workstream_id);
  const secondRun = createRun(projectId, workstream.workstream_id);
  const firstScript = successScript("first.mjs", 150);
  const secondScript = successScript("second.mjs", 0);
  const firstLaunch = scheduler.launch(projectRoot, {
    project_id: projectId,
    run_id: firstRun.id,
    command: { program: process.execPath, args: [firstScript] },
    timeout_ms: 2_000,
    actor: "phase28-test"
  });
  const secondLaunch = scheduler.launch(projectRoot, {
    project_id: projectId,
    run_id: secondRun.id,
    command: { program: process.execPath, args: [secondScript] },
    timeout_ms: 2_000,
    actor: "phase28-test"
  });
  const [firstResult, secondResult] = await Promise.all([firstLaunch, secondLaunch]);
  assert.equal(firstResult.status, "succeeded");
  assert.equal(secondResult.status, "succeeded");
  assert.equal(secondResult.started_at_ms >= firstResult.completed_at_ms, true);
  assert.equal(getAgentRun(projectRoot, projectId, firstRun.id).status, "succeeded");
  assert.equal(getAgentRun(projectRoot, projectId, secondRun.id).status, "succeeded");
  assert.equal(existsSync(join(projectRoot, ".tmp", "comath", firstRun.id, "logs", "stdout.log")), true);
  assert.equal(readFileSync(join(projectRoot, ".tmp", "comath", firstRun.id, "logs", "stdout.log"), "utf8").includes("# Agent Report"), true);
  assert.equal(readFileSync(join(projectRoot, getAgentRun(projectRoot, projectId, firstRun.id).report_path), "utf8").includes("Fixture first.mjs completed."), true);

  const invalidRun = createRun(projectId, workstream.workstream_id);
  await assert.rejects(
    () =>
      scheduler.launch(projectRoot, {
        project_id: projectId,
        run_id: invalidRun.id,
        command: { program: nonAllowlistedProgram, args: process.platform === "win32" ? ["/c", "echo", "unsafe"] : ["-c", "echo unsafe"] },
        timeout_ms: 1_000,
        actor: "phase28-test"
      }),
    /not allowlisted/
  );
  assert.equal(getAgentRun(projectRoot, projectId, invalidRun.id).status, "queued");

  const relativeProgramRun = createRun(projectId, workstream.workstream_id);
  await assert.rejects(
    () =>
      scheduler.launch(projectRoot, {
        project_id: projectId,
        run_id: relativeProgramRun.id,
        command: { program: "node", args: ["--version"] },
        timeout_ms: 1_000,
        actor: "phase28-test"
      }),
    /absolute path/
  );
  assert.equal(getAgentRun(projectRoot, projectId, relativeProgramRun.id).status, "queued");

  const timeoutRun = createRun(projectId, workstream.workstream_id, "formalization");
  const timeoutResult = await scheduler.launch(projectRoot, {
    project_id: projectId,
    run_id: timeoutRun.id,
    command: { program: process.execPath, args: [sleepScript("timeout.mjs")] },
    timeout_ms: 100,
    actor: "phase28-test"
  });
  assert.equal(timeoutResult.status, "failed");
  assert.equal(timeoutResult.timed_out, true);
  assert.equal(getAgentRun(projectRoot, projectId, timeoutRun.id).exit_reason, "timeout");

  const failingRun = createRun(projectId, workstream.workstream_id, "proof_route");
  const failingResult = await scheduler.launch(projectRoot, {
    project_id: projectId,
    run_id: failingRun.id,
    command: { program: process.execPath, args: [failingScript("failure.mjs")] },
    timeout_ms: 2_000,
    actor: "phase28-test"
  });
  assert.equal(failingResult.status, "failed");
  assert.equal(failingResult.exit_code, 7);
  assert.equal(getAgentRun(projectRoot, projectId, failingRun.id).exit_reason, "process_failed");
  assert.match(readFileSync(join(projectRoot, ".tmp", "comath", failingRun.id, "logs", "stderr.log"), "utf8"), /fixture failed/);

  const invalidReportRun = createRun(projectId, workstream.workstream_id, "proof_route");
  const invalidReportResult = await scheduler.launch(projectRoot, {
    project_id: projectId,
    run_id: invalidReportRun.id,
    command: { program: process.execPath, args: [invalidReportScript("invalid-report.mjs")] },
    timeout_ms: 2_000,
    actor: "phase28-test"
  });
  assert.equal(invalidReportResult.status, "failed");
  assert.equal(getAgentRun(projectRoot, projectId, invalidReportRun.id).exit_reason, "invalid_report");
  assert.match(readFileSync(join(projectRoot, getAgentRun(projectRoot, projectId, invalidReportRun.id).report_path), "utf8"), /Exit reason: invalid_report/);

  process.env.COMATH_PHASE28_SECRET = "do-not-leak";
  try {
    const envRun = createRun(projectId, workstream.workstream_id, "proof_route");
    await scheduler.launch(projectRoot, {
      project_id: projectId,
      run_id: envRun.id,
      command: { program: process.execPath, args: [envProbeScript("env-probe.mjs")] },
      timeout_ms: 2_000,
      actor: "phase28-test"
    });
    const envReport = readFileSync(join(projectRoot, getAgentRun(projectRoot, projectId, envRun.id).report_path), "utf8");
    assert.match(envReport, /Inherited secret env: absent/);
    assert.doesNotMatch(envReport, /do-not-leak/);
  } finally {
    delete process.env.COMATH_PHASE28_SECRET;
  }

  const sensitiveEnvRun = createRun(projectId, workstream.workstream_id, "proof_route");
  await assert.rejects(
    () =>
      scheduler.launch(projectRoot, {
        project_id: projectId,
        run_id: sensitiveEnvRun.id,
        command: { program: process.execPath, args: [successScript("sensitive-env.mjs", 0)], env: { OPENAI_API_KEY: "secret" } },
        timeout_ms: 2_000,
        actor: "phase28-test"
      }),
    /environment variable is not allowed/
  );
  assert.equal(getAgentRun(projectRoot, projectId, sensitiveEnvRun.id).status, "queued");

  const largeRun = createRun(projectId, workstream.workstream_id, "proof_route");
  await scheduler.launch(projectRoot, {
    project_id: projectId,
    run_id: largeRun.id,
    command: { program: process.execPath, args: [largeReportScript("large-output.mjs")] },
    timeout_ms: 2_000,
    actor: "phase28-test"
  });
  const largeStdoutLog = readFileSync(join(projectRoot, ".tmp", "comath", largeRun.id, "logs", "stdout.log"), "utf8");
  assert.equal(largeStdoutLog.length < 280_000, true);
  assert.match(largeStdoutLog, /COMATH_OUTPUT_TRUNCATED/);

  const overclaimRun = createRun(projectId, workstream.workstream_id, "proof_route");
  await scheduler.launch(projectRoot, {
    project_id: projectId,
    run_id: overclaimRun.id,
    command: { program: process.execPath, args: [overclaimScript("overclaim.mjs")] },
    timeout_ms: 2_000,
    actor: "phase28-test"
  });
  const overclaimReport = readFileSync(join(projectRoot, getAgentRun(projectRoot, projectId, overclaimRun.id).report_path), "utf8");
  assert.match(overclaimReport, /proof_authority: none/);
  assert.match(overclaimReport, /supports_claim_status: none/);
  assert.match(overclaimReport, /child_stdout_untrusted: true/);
  assert.equal(getAgentRun(projectRoot, projectId, overclaimRun.id).status, "succeeded");

  const cancelRun = createRun(projectId, workstream.workstream_id, "reviewer");
  const cancelPromise = scheduler.launch(projectRoot, {
    project_id: projectId,
    run_id: cancelRun.id,
    command: { program: process.execPath, args: [sleepScript("cancel.mjs")] },
    timeout_ms: 5_000,
    actor: "phase28-test"
  });
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(scheduler.cancel(cancelRun.id, "phase28-test"), true);
  const cancelResult = await cancelPromise;
  assert.equal(cancelResult.status, "cancelled");
  assert.equal(getAgentRun(projectRoot, projectId, cancelRun.id).status, "cancelled");

  const treeRun = createRun(projectId, workstream.workstream_id, "reviewer");
  const markerPath = join(projectRoot, ".tmp", "phase28-process-tree-marker.txt");
  const markerChild = markerChildScript("marker-child.mjs");
  const treeParent = processTreeParentScript("tree-parent.mjs", markerChild);
  const treeResult = await scheduler.launch(projectRoot, {
    project_id: projectId,
    run_id: treeRun.id,
    command: { program: process.execPath, args: [treeParent, markerPath] },
    timeout_ms: 500,
    actor: "phase28-test"
  });
  assert.equal(treeResult.status, "failed");
  assert.equal(treeResult.timed_out, true);
  const markerBefore = existsSync(markerPath) ? readFileSync(markerPath, "utf8").length : 0;
  assert.equal(markerBefore > 0, true);
  await new Promise((resolve) => setTimeout(resolve, 350));
  const markerAfter = existsSync(markerPath) ? readFileSync(markerPath, "utf8").length : 0;
  assert.equal(markerAfter, markerBefore);

  const queuedCancelScheduler = createAgentRunScheduler({
    max_concurrent: 1,
    rpm: 4,
    allowed_programs: [process.execPath]
  });
  const blockingRun = createRun(projectId, workstream.workstream_id, "proof_route");
  const queuedCancelRun = createRun(projectId, workstream.workstream_id, "reviewer");
  const blockingLaunch = queuedCancelScheduler.launch(projectRoot, {
    project_id: projectId,
    run_id: blockingRun.id,
    command: { program: process.execPath, args: [successScript("blocking-before-queued-cancel.mjs", 250)] },
    timeout_ms: 2_000,
    actor: "phase28-test"
  });
  const queuedCancelLaunch = queuedCancelScheduler.launch(projectRoot, {
    project_id: projectId,
    run_id: queuedCancelRun.id,
    command: { program: process.execPath, args: [successScript("queued-cancel-should-not-run.mjs", 0)] },
    timeout_ms: 2_000,
    actor: "phase28-test"
  });
  assert.equal(queuedCancelScheduler.cancel(queuedCancelRun.id, "phase28-test"), true);
  const queuedCancelResult = await queuedCancelLaunch;
  await blockingLaunch;
  assert.equal(queuedCancelResult.status, "cancelled");
  assert.equal(getAgentRun(projectRoot, projectId, queuedCancelRun.id).status, "cancelled");
  assert.equal(getAgentRun(projectRoot, projectId, queuedCancelRun.id).exit_reason, "queued_cancelled");
  assert.equal(existsSync(join(projectRoot, ".tmp", "comath", queuedCancelRun.id, "logs", "stdout.log")), false);

  const reservationScheduler = createAgentRunScheduler({
    max_concurrent: 1,
    rpm: 2,
    allowed_programs: [process.execPath]
  });
  const reservationRunA = createRun(projectId, workstream.workstream_id);
  const reservationRunB = createRun(projectId, workstream.workstream_id);
  const reservationRunC = createRun(projectId, workstream.workstream_id);
  const reservationLaunchA = reservationScheduler.launch(projectRoot, {
    project_id: projectId,
    run_id: reservationRunA.id,
    command: { program: process.execPath, args: [successScript("reservation-a.mjs", 250)] },
    timeout_ms: 2_000,
    actor: "phase28-test"
  });
  const reservationLaunchB = reservationScheduler.launch(projectRoot, {
    project_id: projectId,
    run_id: reservationRunB.id,
    command: { program: process.execPath, args: [successScript("reservation-b.mjs", 0)] },
    timeout_ms: 2_000,
    actor: "phase28-test"
  });
  const reservationLaunchC = reservationScheduler.launch(projectRoot, {
    project_id: projectId,
    run_id: reservationRunC.id,
    command: { program: process.execPath, args: [successScript("reservation-c.mjs", 0)] },
    timeout_ms: 2_000,
    actor: "phase28-test"
  }).then(
    () => "resolved",
    (error) => (String(error?.message ?? error).includes("rate limit") ? "rejected" : "wrong-rejection")
  );
  const quickReservationState = await Promise.race([
    reservationLaunchC,
    new Promise((resolve) => setTimeout(() => resolve("pending"), 50))
  ]);
  await Promise.allSettled([reservationLaunchA, reservationLaunchB, reservationLaunchC]);
  assert.equal(quickReservationState, "rejected");
  assert.equal(getAgentRun(projectRoot, projectId, reservationRunB.id).status, "succeeded");
  assert.equal(getAgentRun(projectRoot, projectId, reservationRunC.id).status, "queued");

  const rateLimitedScheduler = createAgentRunScheduler({
    max_concurrent: 1,
    rpm: 1,
    allowed_programs: [process.execPath]
  });
  const rateRunA = createRun(projectId, workstream.workstream_id);
  const rateRunB = createRun(projectId, workstream.workstream_id);
  await rateLimitedScheduler.launch(projectRoot, {
    project_id: projectId,
    run_id: rateRunA.id,
    command: { program: process.execPath, args: [successScript("rate-a.mjs", 0)] },
    timeout_ms: 2_000,
    actor: "phase28-test"
  });
  await assert.rejects(
    () =>
      rateLimitedScheduler.launch(projectRoot, {
        project_id: projectId,
        run_id: rateRunB.id,
        command: { program: process.execPath, args: [successScript("rate-b.mjs", 0)] },
        timeout_ms: 2_000,
        actor: "phase28-test"
      }),
    /rate limit/
  );
  assert.equal(getAgentRun(projectRoot, projectId, rateRunB.id).status, "queued");

  const events = readAuditEvents(projectRoot);
  assert.equal(events.some((event) => event.event_type === "agent_run.process_started"), true);
  assert.equal(events.some((event) => event.event_type === "agent_run.process_completed"), true);
  assert.equal(events.some((event) => event.event_type === "agent_run.process_timed_out"), true);
  assert.equal(events.some((event) => event.event_type === "agent_run.process_cancelled"), true);
  assert.equal(events.some((event) => event.event_type === "agent_run.queued_cancelled"), true);
  assert.equal(events.some((event) => event.event_type === "agent_run.rate_limited"), true);

  const schedulerSource = readFileSync(resolve("src", "agents", "agent-run-scheduler.ts"), "utf8");
  assert.match(schedulerSource, /process\.kill\(-processGroupId,\s*"SIGKILL"\)/);
  assert.match(schedulerSource, /spawn\(task\.command\.program,/);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 28 AgentRun scheduler tests passed.");
