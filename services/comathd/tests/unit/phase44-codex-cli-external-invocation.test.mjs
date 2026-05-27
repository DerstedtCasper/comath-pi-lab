import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import {
  buildAgentAdapterPackageLaunch,
  createComathServer,
  executeAgentAdapterPackage,
  getAgentRun,
  initProject,
  readAuditEvents,
  spawnWorkstream
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-phase44-codex-external-"));
const fakeCliRoot = mkdtempSync(join(tmpdir(), "comath-phase44-fake-codex-cli-"));
const fakeCliPath = join(fakeCliRoot, "fake-codex-cli.mjs");
const previousExternalProgram = process.env.COMATH_CODEX_CLI_PROGRAM;
const previousExternalPrefixArgs = process.env.COMATH_CODEX_CLI_PREFIX_ARGS;

try {
  writeFileSync(
    fakeCliPath,
    [
      "import { writeFileSync } from 'node:fs';",
      "const args = process.argv.slice(2);",
      "const valueAfter = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined; };",
      "const tracePath = valueAfter('--prompt-file') + '.trace.json';",
      "writeFileSync(tracePath, JSON.stringify({ args, cwd: process.cwd(), proofAuthority: process.env.COMATH_PROOF_AUTHORITY, promptPath: valueAfter('--prompt-file'), contextPath: valueAfter('--context') }, null, 2));",
      "process.stdout.write(['# External Codex Draft', '', 'profile=' + valueAfter('--profile'), 'context=' + valueAfter('--context'), 'prompt=' + valueAfter('--prompt-file')].join('\\n'));"
    ].join("\n"),
    "utf8"
  );
  process.env.COMATH_CODEX_CLI_PROGRAM = process.execPath;
  process.env.COMATH_CODEX_CLI_PREFIX_ARGS = JSON.stringify([fakeCliPath]);

  const init = initProject({ name: "Phase 44 External Codex Project", root_path: projectRoot });
  const projectId = init.project.project_id;
  const workstream = spawnWorkstream(projectRoot, {
    project_id: projectId,
    kind: "proof_route",
    goal: "Run external Codex-compatible adapter.",
    created_by: "phase44-test"
  });
  const contextPath = `.comath/workstreams/${workstream.workstream_id}/spec.yaml`;

  const prepared = buildAgentAdapterPackageLaunch(projectRoot, {
    project_id: projectId,
    run_id: "ARUN-4401",
    profile_id: "proof-route",
    adapter_id: "codex-cli",
    backend: "external",
    goal: "Produce a non-authoritative proof route draft through an external Codex-compatible CLI.",
    context_path: contextPath,
    actor: "phase44-test"
  });
  assert.equal(prepared.launch.launch_input.command.env.COMATH_CODEX_ADAPTER_BACKEND, "external");
  assert.equal(prepared.launch.launch_input.command.env.COMATH_CODEX_EXTERNAL_PROGRAM, realpathSync.native(process.execPath));
  assert.equal(prepared.launch.launch_input.command.env.COMATH_CODEX_EXTERNAL_PREFIX_ARGS, JSON.stringify([fakeCliPath]));
  assert.equal(prepared.launch.launch_input.command.env.COMATH_PROOF_AUTHORITY, "none");
  assert.equal(prepared.launch.scheduler_options.rpm, 4);

  const execution = await executeAgentAdapterPackage(projectRoot, {
    project_id: projectId,
    campaign_id: "CAM-0044",
    workstream_id: workstream.workstream_id,
    profile_id: "proof-route",
    adapter_id: "codex-cli",
    backend: "external",
    goal: "Produce a non-authoritative proof route draft through an external Codex-compatible CLI.",
    context_path: contextPath,
    actor: "phase44-test"
  });
  assert.equal(execution.result.status, "succeeded");
  const run = getAgentRun(projectRoot, projectId, execution.run.id);
  assert.equal(run.status, "succeeded");
  const stdout = readFileSync(join(projectRoot, execution.result.stdout_path), "utf8");
  assert.match(stdout, /adapter_backend: external/);
  assert.match(stdout, /external_program: <service-configured>/);
  assert.match(stdout, /external_output_untrusted: true/);
  assert.match(stdout, /proof_authority: none/);
  assert.match(stdout, /# External Codex Draft/);
  const promptPathMatch = stdout.match(/external_prompt_file: (.+)/);
  assert.ok(promptPathMatch, "adapter report records its service-owned prompt path");
  const trace = JSON.parse(readFileSync(`${promptPathMatch[1]}.trace.json`, "utf8"));
  assert.equal(trace.proofAuthority, "none");
  assert.equal(trace.args.includes("--profile"), true);
  assert.equal(trace.args.includes("proof-route"), true);
  assert.equal(trace.args.includes("--goal-file"), true);
  assert.equal(trace.args.includes("--prompt-file"), true);
  assert.equal(trace.contextPath, contextPath);
  assert.equal(existsSync(trace.promptPath), true, "adapter writes a bounded prompt file for external CLI input");
  assert.equal(basename(trace.cwd), execution.run.id, "external CLI runs inside the AgentRun-scoped temp directory");

  delete process.env.COMATH_CODEX_CLI_PROGRAM;
  const failClosed = await executeAgentAdapterPackage(projectRoot, {
    project_id: projectId,
    campaign_id: "CAM-0044",
    workstream_id: workstream.workstream_id,
    profile_id: "reviewer",
    adapter_id: "codex-cli",
    backend: "external",
    goal: "This must fail closed because no external CLI is configured.",
    context_path: contextPath,
    actor: "phase44-test"
  });
  assert.equal(failClosed.result.status, "failed");
  const failedStderr = readFileSync(join(projectRoot, failClosed.result.stderr_path), "utf8");
  assert.match(failedStderr, /external Codex CLI program is not configured/);

  process.env.COMATH_CODEX_CLI_PROGRAM = process.execPath;
  process.env.COMATH_CODEX_CLI_PREFIX_ARGS = JSON.stringify([fakeCliPath]);
  const server = createComathServer();
  const response = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/prepare-launch",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      run_id: "ARUN-4402",
      profile_id: "proof-route",
      adapter_id: "codex-cli",
      backend: "external",
      goal: "Prepare external adapter launch.",
      context_path: contextPath,
      actor: "phase44-route-test"
    }
  });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(response.body.prepared.launch.launch_input.command.env.COMATH_CODEX_ADAPTER_BACKEND, "external");

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.package_launch_prepared" &&
        event.payload.backend === "external" &&
        event.payload.external_program_configured === true
    ),
    true
  );
} finally {
  if (previousExternalProgram === undefined) {
    delete process.env.COMATH_CODEX_CLI_PROGRAM;
  } else {
    process.env.COMATH_CODEX_CLI_PROGRAM = previousExternalProgram;
  }
  if (previousExternalPrefixArgs === undefined) {
    delete process.env.COMATH_CODEX_CLI_PREFIX_ARGS;
  } else {
    process.env.COMATH_CODEX_CLI_PREFIX_ARGS = previousExternalPrefixArgs;
  }
  rmSync(projectRoot, { recursive: true, force: true });
  rmSync(fakeCliRoot, { recursive: true, force: true });
}

console.log("Phase 44 Codex external invocation tests passed.");
