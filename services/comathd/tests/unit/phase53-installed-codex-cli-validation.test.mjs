import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createComathServer,
  initProject,
  readAuditEvents,
  validateExternalCodexCliInstallation
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-phase53-installed-codex-cli-"));
const fakeCliRoot = mkdtempSync(join(tmpdir(), "comath-phase53-fake-codex-cli-"));
const fakeCliPath = join(fakeCliRoot, "fake-installed-codex-cli.mjs");
const previousExternalProgram = process.env.COMATH_CODEX_CLI_PROGRAM;
const previousExternalPrefixArgs = process.env.COMATH_CODEX_CLI_PREFIX_ARGS;

try {
  writeFileSync(
    fakeCliPath,
    [
      "const args = process.argv.slice(2);",
      "if (args.includes('--version')) {",
      "  process.stdout.write('codex-cli 0.53.0\\n');",
      "  process.exit(0);",
      "}",
      "if (args.includes('--health')) {",
      "  process.stdout.write(JSON.stringify({ ok: true, version: 'codex-cli-health-0.53.0', capabilities: ['installed-cli', 'non-authoritative-drafts'] }) + '\\n');",
      "  process.exit(0);",
      "}",
      "process.stdout.write('unexpected args: ' + args.join(' '));"
    ].join("\n"),
    "utf8"
  );
  process.env.COMATH_CODEX_CLI_PROGRAM = process.execPath;
  process.env.COMATH_CODEX_CLI_PREFIX_ARGS = JSON.stringify([fakeCliPath]);

  const init = initProject({ name: "Phase 53 Installed Codex CLI Project", root_path: projectRoot });
  const projectId = init.project.project_id;

  assert.equal(typeof validateExternalCodexCliInstallation, "function", "Phase 53 must export installed Codex CLI validation");

  const validation = validateExternalCodexCliInstallation(projectRoot, {
    project_id: projectId,
    adapter_id: "codex-cli",
    profile_id: "reviewer",
    actor: "phase53-test",
    timeout_ms: 5000
  });
  assert.equal(validation.ok, true);
  assert.equal(validation.project_id, projectId);
  assert.equal(validation.adapter_id, "codex-cli");
  assert.equal(validation.profile_id, "reviewer");
  assert.equal(validation.proof_authority, "none");
  assert.equal(validation.program_configured, true);
  assert.equal(validation.version_probe.ok, true);
  assert.match(validation.version_probe.stdout, /codex-cli 0\.53\.0/);
  assert.equal(validation.health_probe.ok, true);
  assert.equal(validation.health_probe.version, "codex-cli-health-0.53.0");
  assert.equal(validation.health_probe.capabilities.includes("installed-cli"), true);
  assert.equal(JSON.stringify(validation).includes("COMATH_CODEX_CLI_PROGRAM"), false);

  const server = createComathServer();
  const response = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/validate-installed-cli",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      adapter_id: "codex-cli",
      profile_id: "reviewer",
      actor: "phase53-route-test",
      timeout_ms: 5000
    }
  });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(response.body.validation.ok, true);
  assert.equal(response.body.validation.proof_authority, "none");
  assert.equal(JSON.stringify(response.body).includes(process.execPath), false, "route response must not expose the configured executable path");

  delete process.env.COMATH_CODEX_CLI_PROGRAM;
  const missing = validateExternalCodexCliInstallation(projectRoot, {
    project_id: projectId,
    adapter_id: "codex-cli",
    profile_id: "reviewer",
    actor: "phase53-test",
    timeout_ms: 5000
  });
  assert.equal(missing.ok, false);
  assert.equal(missing.program_configured, false);
  assert.match(missing.diagnostics.join("\n"), /COMATH_CODEX_CLI_PROGRAM is not configured/);

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.installed_codex_cli_validated" &&
        event.payload.ok === true &&
        event.payload.program_configured === true &&
        event.payload.proof_authority === "none"
    ),
    true
  );
  assert.equal(JSON.stringify(events).includes(process.execPath), false, "audit payload must not expose the configured executable path");
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

console.log("Phase 53 installed Codex CLI validation tests passed.");
