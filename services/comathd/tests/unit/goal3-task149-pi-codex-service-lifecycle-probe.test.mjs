import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  collectPiCodexLifecycleEvidence,
  createComathServer,
  initProject,
  probePiCodexDurableServiceLifecycle,
  readAuditEvents
} from "../../dist/index.js";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task149-service-lifecycle-"));
const previousAllowedPrograms = process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS;

try {
  process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS = JSON.stringify([process.execPath]);
  const init = initProject({ name: "Goal3 Task149 Service Probe Project", root_path: projectRoot });
  const projectId = init.project.project_id;

  assert.equal(
    typeof probePiCodexDurableServiceLifecycle,
    "function",
    "Task149 must export a service-owned durable service lifecycle probe"
  );

  const observed = [];
  const successfulProbe = probePiCodexDurableServiceLifecycle(
    projectRoot,
    {
      project_id: projectId,
      probe_id: "LIFE-PROBE-0149",
      actor: "goal3-task149-test",
      service_label: "comathd",
      timeout_ms: 5000,
      commands: {
        start: { program: process.execPath, args: ["service-fixture.mjs", "start"] },
        status: { program: process.execPath, args: ["service-fixture.mjs", "status"] },
        stop: { program: process.execPath, args: ["service-fixture.mjs", "stop"] },
        restart: { program: process.execPath, args: ["service-fixture.mjs", "restart"] }
      }
    },
    {
      runner: (command, step) => {
        observed.push({ command, step });
        return {
          exit_code: 0,
          signal: null,
          timed_out: false,
          stdout: `ok ${step} ${projectRoot}\\secret.txt\n`,
          stderr: ""
        };
      }
    }
  );

  assert.equal(successfulProbe.schema_version, "comath.pi_codex_durable_service_lifecycle_probe.v1");
  assert.equal(successfulProbe.probe_id, "LIFE-PROBE-0149");
  assert.equal(successfulProbe.ok, true);
  assert.equal(successfulProbe.probe_status, "durable_service_lifecycle_observed");
  assert.equal(successfulProbe.proof_authority, "none");
  assert.equal(successfulProbe.can_promote_claim, false);
  assert.equal(successfulProbe.can_certify_ga, false);
  assert.equal(successfulProbe.shell, false);
  assert.equal(successfulProbe.network, false);
  assert.equal(successfulProbe.service_lifecycle_log_path, ".comath/release/pi-codex-lifecycle/LIFE-PROBE-0149/service-lifecycle-probe.json");
  assert.equal(successfulProbe.service_lifecycle_artifact.kind, "durable_service_lifecycle_log");
  assert.equal(successfulProbe.service_lifecycle_artifact.path, successfulProbe.service_lifecycle_log_path);
  assert.equal(successfulProbe.service_lifecycle_artifact.size_bytes > 0, true);
  assert.equal(successfulProbe.service_lifecycle_artifact.sha256.length, 64);
  assert.deepEqual(
    successfulProbe.readiness_fragment,
    {
      comathd_server_kind: "durable_service",
      service_start_observed: true,
      service_stop_observed: true,
      service_restart_observed: true
    },
    "probe output must be directly usable as durable service lifecycle readiness evidence"
  );
  assert.deepEqual(
    successfulProbe.commands.map((entry) => entry.step),
    ["start", "status_after_start", "stop", "restart", "status_after_restart"]
  );
  assert.equal(
    successfulProbe.commands.every((entry) => entry.program === realpathSync.native(process.execPath)),
    false,
    "probe result must not expose absolute executable paths"
  );
  assert.equal(JSON.stringify(successfulProbe).includes(projectRoot), false, "probe result must not echo host paths");
  assert.equal(observed.length, 5, "start/status/stop/restart/status sequence must run");
  assert.equal(observed.every((entry) => entry.command.shell === false), true, "probe runner must use shell:false commands");

  const persistedPath = join(projectRoot, successfulProbe.service_lifecycle_log_path);
  assert.equal(existsSync(persistedPath), true, "service lifecycle probe must persist a durable manifest artifact");
  const persisted = readJson(persistedPath);
  assert.equal(persisted.ok, true);
  assert.equal(JSON.stringify(persisted).includes(projectRoot), false, "persisted probe artifact must scrub host paths");

  const evidenceInput = {
    session_kind: "real_pi_host_automated_install",
    pi_host_kind: "real_pi_host",
    runtime_entrypoint_imported: true,
    runtime_registered: true,
    host_confirmation_observed: true,
    comathd_server_kind: successfulProbe.readiness_fragment.comathd_server_kind,
    service_start_observed: successfulProbe.readiness_fragment.service_start_observed,
    service_stop_observed: successfulProbe.readiness_fragment.service_stop_observed,
    service_restart_observed: successfulProbe.readiness_fragment.service_restart_observed
  };
  const inputRoot = ".comath/release/pi-codex-lifecycle/task149-input";
  mkdirSync(join(projectRoot, inputRoot), { recursive: true });
  writeFileSync(join(projectRoot, inputRoot, "pi-install.md"), "real Pi install transcript\n", "utf8");
  writeFileSync(join(projectRoot, inputRoot, "runtime-registration.json"), '{"registered":true}\n', "utf8");
  writeFileSync(join(projectRoot, inputRoot, "codex-validation.json"), '{"codex":"passed"}\n', "utf8");
  const evidence = collectPiCodexLifecycleEvidence(projectRoot, {
    project_id: projectId,
    evidence_id: "LIFE-EVID-0149-FROM-PROBE",
    actor: "goal3-task149-evidence-test",
    install_session_evidence: evidenceInput,
    codex_evidence: {
      installed_cli_validation_ok: true,
      installed_cli_probe_source: "service_owned_process",
      codex_api_account_network_validation: "passed"
    },
    artifact_paths: {
      pi_install_transcript_path: `${inputRoot}/pi-install.md`,
      runtime_registration_snapshot_path: `${inputRoot}/runtime-registration.json`,
      service_lifecycle_log_path: successfulProbe.service_lifecycle_log_path,
      codex_validation_report_path: `${inputRoot}/codex-validation.json`
    }
  });
  assert.equal(evidence.collection_status, "evidence_ready_for_readiness_review");
  assert.equal(
    evidence.artifacts.some(
      (artifact) =>
        artifact.kind === "durable_service_lifecycle_log" &&
        artifact.path === successfulProbe.service_lifecycle_log_path &&
        artifact.sha256 === successfulProbe.service_lifecycle_artifact.sha256
    ),
    true,
    "Task149 probe artifact must be ingestible by Task148 lifecycle evidence intake"
  );

  const failedProbe = probePiCodexDurableServiceLifecycle(
    projectRoot,
    {
      project_id: projectId,
      probe_id: "LIFE-PROBE-0149-FAILED",
      actor: "goal3-task149-test",
      service_label: "comathd",
      timeout_ms: 5000,
      commands: {
        start: { program: process.execPath, args: ["service-fixture.mjs", "start"] },
        status: { program: process.execPath, args: ["service-fixture.mjs", "status"] },
        stop: { program: process.execPath, args: ["service-fixture.mjs", "stop"] },
        restart: { program: process.execPath, args: ["service-fixture.mjs", "restart"] }
      }
    },
    {
      runner: (_command, step) => ({
        exit_code: step === "restart" ? 7 : 0,
        signal: null,
        timed_out: false,
        stdout: "",
        stderr: step === "restart" ? "restart failed" : ""
      })
    }
  );
  assert.equal(failedProbe.ok, false);
  assert.equal(failedProbe.probe_status, "blocked_service_lifecycle_probe_failed");
  assert.equal(failedProbe.readiness_fragment.service_restart_observed, false);
  assert.equal(failedProbe.vetoes.some((veto) => veto.code === "durable_service_lifecycle_restart_failed"), true);
  assert.equal(existsSync(join(projectRoot, failedProbe.service_lifecycle_log_path)), true, "failed probes must still be durable audit evidence");

  assert.throws(
    () =>
      probePiCodexDurableServiceLifecycle(projectRoot, {
        project_id: projectId,
        probe_id: "LIFE-PROBE-0149-MISSING",
        actor: "goal3-task149-test",
        service_label: "comathd",
        timeout_ms: 5000,
        commands: {
          start: { program: process.execPath, args: ["service-fixture.mjs", "start"] },
          status: { program: process.execPath, args: ["service-fixture.mjs", "status"] },
          stop: { program: process.execPath, args: ["service-fixture.mjs", "stop"] }
        }
      }),
    /PI_CODEX_LIFECYCLE_SERVICE_PROBE_COMMAND_MISSING/,
    "missing required lifecycle commands must fail closed before execution"
  );

  process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS = JSON.stringify([]);
  assert.throws(
    () =>
      probePiCodexDurableServiceLifecycle(projectRoot, {
        project_id: projectId,
        probe_id: "LIFE-PROBE-0149-UNALLOWLISTED",
        actor: "goal3-task149-test",
        service_label: "comathd",
        timeout_ms: 5000,
        commands: {
          start: { program: process.execPath, args: ["service-fixture.mjs", "start"] },
          status: { program: process.execPath, args: ["service-fixture.mjs", "status"] },
          stop: { program: process.execPath, args: ["service-fixture.mjs", "stop"] },
          restart: { program: process.execPath, args: ["service-fixture.mjs", "restart"] }
        }
      }),
    /PI_CODEX_LIFECYCLE_SERVICE_PROBE_PROGRAM_NOT_ALLOWLISTED/,
    "unallowlisted lifecycle commands must fail closed"
  );
  process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS = JSON.stringify([process.execPath]);

  assert.throws(
    () =>
      probePiCodexDurableServiceLifecycle(projectRoot, {
        project_id: projectId,
        probe_id: "LIFE-PROBE-0149-SHELL",
        actor: "goal3-task149-test",
        service_label: "comathd",
        timeout_ms: 5000,
        commands: {
          start: { program: process.execPath, args: ["-e", "process.exit(0);"] },
          status: { program: process.execPath, args: ["service-fixture.mjs", "status"] },
          stop: { program: process.execPath, args: ["service-fixture.mjs", "stop"] },
          restart: { program: process.execPath, args: ["service-fixture.mjs", "restart"] }
        }
      }),
    /PI_CODEX_LIFECYCLE_SERVICE_PROBE_SHELL_ARGS_DENIED/,
    "inline shell-like lifecycle commands must fail closed"
  );

  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/pi-codex-lifecycle/service-probe",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      probe_id: "LIFE-PROBE-0149-ROUTE",
      actor: "goal3-task149-route-test",
      service_label: "comathd",
      timeout_ms: 5000,
      commands: {
        start: { program: process.execPath, args: ["-v"] },
        status: { program: process.execPath, args: ["-v"] },
        stop: { program: process.execPath, args: ["-v"] },
        restart: { program: process.execPath, args: ["-v"] }
      }
    }
  });
  assert.equal(routeResponse.status, 200, JSON.stringify(routeResponse.body));
  assert.equal(routeResponse.body.probe.ok, true);
  assert.equal(routeResponse.body.probe.can_certify_ga, false);
  assert.equal(JSON.stringify(routeResponse.body).includes(projectRoot), false, "route response must not echo host paths");

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "release.pi_codex_lifecycle_service_probe_completed" &&
        event.payload.probe_id === "LIFE-PROBE-0149" &&
        event.payload.ok === true &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "service lifecycle probe must be audit-visible and non-authoritative"
  );
} finally {
  if (previousAllowedPrograms === undefined) {
    delete process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS;
  } else {
    process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS = previousAllowedPrograms;
  }
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task149 Pi/Codex durable service lifecycle probe tests passed.");
