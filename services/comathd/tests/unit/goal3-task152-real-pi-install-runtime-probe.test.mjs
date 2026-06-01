import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  collectPiCodexLifecycleEvidence,
  createComathServer,
  initProject,
  probePiCodexRealPiInstallRuntimeRegistration,
  readAuditEvents
} from "../../dist/index.js";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task152-real-pi-runtime-"));
const previousAllowedPrograms = process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS;

try {
  process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS = JSON.stringify([process.execPath]);
  const init = initProject({ name: "Goal3 Task152 Real Pi Runtime Probe Project", root_path: projectRoot });
  const projectId = init.project.project_id;

  assert.equal(
    typeof probePiCodexRealPiInstallRuntimeRegistration,
    "function",
    "Task152 must export a service-owned real-Pi install/runtime-registration probe"
  );

  const observed = [];
  const successfulProbe = probePiCodexRealPiInstallRuntimeRegistration(
    projectRoot,
    {
      project_id: projectId,
      probe_id: "LIFE-PI-RUNTIME-0152",
      actor: "goal3-task152-test",
      pi_host_label: "pi-host-lab-01",
      session_kind: "real_pi_host_automated_install",
      timeout_ms: 5000,
      commands: {
        install: { program: process.execPath, args: ["pi-fixture.mjs", "install"] },
        runtime_registration: { program: process.execPath, args: ["pi-fixture.mjs", "runtime-registration"] },
        host_confirmation: { program: process.execPath, args: ["pi-fixture.mjs", "host-confirmation"] }
      }
    },
    {
      runner: (command, step) => {
        observed.push({ command, step });
        return {
          exit_code: 0,
          signal: null,
          timed_out: false,
          stdout: JSON.stringify({
            step,
            imported: true,
            registered: true,
            host_confirmation: true,
            leaked_path: `${projectRoot}\\secret.txt`
          }),
          stderr: ""
        };
      }
    }
  );

  assert.equal(successfulProbe.schema_version, "comath.pi_codex_real_pi_install_runtime_probe.v1");
  assert.equal(successfulProbe.probe_id, "LIFE-PI-RUNTIME-0152");
  assert.equal(successfulProbe.ok, true);
  assert.equal(successfulProbe.probe_status, "real_pi_install_runtime_observed");
  assert.equal(successfulProbe.proof_authority, "none");
  assert.equal(successfulProbe.can_promote_claim, false);
  assert.equal(successfulProbe.can_certify_ga, false);
  assert.equal(successfulProbe.shell, false);
  assert.equal(successfulProbe.network, false);
  assert.deepEqual(
    successfulProbe.readiness_fragment,
    {
      session_kind: "real_pi_host_automated_install",
      pi_host_kind: "real_pi_host",
      runtime_entrypoint_imported: true,
      runtime_registered: true,
      host_confirmation_observed: true
    },
    "probe output must be directly usable as real Pi runtime readiness evidence"
  );
  assert.equal(
    successfulProbe.pi_install_transcript_path,
    ".comath/release/pi-codex-lifecycle/LIFE-PI-RUNTIME-0152/pi-install-transcript.md"
  );
  assert.equal(
    successfulProbe.runtime_registration_snapshot_path,
    ".comath/release/pi-codex-lifecycle/LIFE-PI-RUNTIME-0152/runtime-registration-snapshot.json"
  );
  assert.equal(successfulProbe.pi_install_artifact.kind, "pi_install_transcript");
  assert.equal(successfulProbe.runtime_registration_artifact.kind, "runtime_registration_snapshot");
  assert.equal(successfulProbe.pi_install_artifact.sha256.length, 64);
  assert.equal(successfulProbe.runtime_registration_artifact.sha256.length, 64);
  assert.deepEqual(
    successfulProbe.commands.map((entry) => entry.step),
    ["install", "runtime_registration", "host_confirmation"]
  );
  assert.equal(
    successfulProbe.commands.every((entry) => entry.program === realpathSync.native(process.execPath)),
    false,
    "probe result must not expose absolute executable paths"
  );
  assert.equal(JSON.stringify(successfulProbe).includes(projectRoot), false, "probe result must scrub host paths");
  assert.equal(observed.length, 3, "install/runtime-registration/host-confirmation probe sequence must run");
  assert.equal(observed.every((entry) => entry.command.shell === false), true, "probe runner must use shell:false");

  const installTranscript = readFileSync(join(projectRoot, successfulProbe.pi_install_transcript_path), "utf8");
  const runtimeSnapshot = readJson(join(projectRoot, successfulProbe.runtime_registration_snapshot_path));
  assert.equal(installTranscript.includes(projectRoot), false, "persisted install transcript must scrub host paths");
  assert.equal(JSON.stringify(runtimeSnapshot).includes(projectRoot), false, "persisted runtime snapshot must scrub host paths");
  assert.equal(runtimeSnapshot.runtime_entrypoint_imported, true);
  assert.equal(runtimeSnapshot.runtime_registered, true);
  assert.equal(runtimeSnapshot.host_confirmation_observed, true);

  const inputRoot = ".comath/release/pi-codex-lifecycle/task152-input";
  mkdirSync(join(projectRoot, inputRoot), { recursive: true });
  writeFileSync(join(projectRoot, inputRoot, "service-lifecycle.log"), "start stop restart observed\n", "utf8");
  writeFileSync(join(projectRoot, inputRoot, "codex-validation.json"), '{"codex":"passed"}\n', "utf8");
  const evidence = collectPiCodexLifecycleEvidence(projectRoot, {
    project_id: projectId,
    evidence_id: "LIFE-EVID-0152-FROM-PI-RUNTIME",
    actor: "goal3-task152-evidence-test",
    install_session_evidence: {
      ...successfulProbe.readiness_fragment,
      comathd_server_kind: "durable_service",
      service_start_observed: true,
      service_stop_observed: true,
      service_restart_observed: true
    },
    codex_evidence: {
      installed_cli_validation_ok: true,
      installed_cli_probe_source: "service_owned_process",
      codex_api_account_network_validation: "passed"
    },
    artifact_paths: {
      pi_install_transcript_path: successfulProbe.pi_install_transcript_path,
      runtime_registration_snapshot_path: successfulProbe.runtime_registration_snapshot_path,
      service_lifecycle_log_path: `${inputRoot}/service-lifecycle.log`,
      codex_validation_report_path: `${inputRoot}/codex-validation.json`
    }
  });
  assert.equal(evidence.collection_status, "evidence_ready_for_readiness_review");
  assert.equal(
    evidence.artifacts.some(
      (artifact) =>
        artifact.kind === "pi_install_transcript" &&
        artifact.path === successfulProbe.pi_install_transcript_path &&
        artifact.sha256 === successfulProbe.pi_install_artifact.sha256
    ),
    true,
    "Task152 install transcript artifact must be ingestible by Task148 lifecycle evidence intake"
  );
  assert.equal(
    evidence.artifacts.some(
      (artifact) =>
        artifact.kind === "runtime_registration_snapshot" &&
        artifact.path === successfulProbe.runtime_registration_snapshot_path &&
        artifact.sha256 === successfulProbe.runtime_registration_artifact.sha256
    ),
    true,
    "Task152 runtime registration artifact must be ingestible by Task148 lifecycle evidence intake"
  );

  const failedProbe = probePiCodexRealPiInstallRuntimeRegistration(
    projectRoot,
    {
      project_id: projectId,
      probe_id: "LIFE-PI-RUNTIME-0152-FAILED",
      actor: "goal3-task152-test",
      pi_host_label: "pi-host-lab-01",
      session_kind: "real_pi_host_manual_install",
      timeout_ms: 5000,
      commands: {
        install: { program: process.execPath, args: ["pi-fixture.mjs", "install"] },
        runtime_registration: { program: process.execPath, args: ["pi-fixture.mjs", "runtime-registration"] },
        host_confirmation: { program: process.execPath, args: ["pi-fixture.mjs", "host-confirmation"] }
      }
    },
    {
      runner: (_command, step) => ({
        exit_code: step === "runtime_registration" ? 9 : 0,
        signal: null,
        timed_out: false,
        stdout: step === "runtime_registration" ? "" : "ok",
        stderr: step === "runtime_registration" ? "runtime registration missing" : ""
      })
    }
  );
  assert.equal(failedProbe.ok, false);
  assert.equal(failedProbe.probe_status, "blocked_real_pi_install_runtime_probe_failed");
  assert.equal(failedProbe.readiness_fragment.runtime_registered, false);
  assert.equal(failedProbe.vetoes.some((veto) => veto.code === "real_pi_runtime_registration_failed"), true);
  assert.equal(existsSync(join(projectRoot, failedProbe.runtime_registration_snapshot_path)), true, "failed probes must still write blocker evidence");

  assert.throws(
    () =>
      probePiCodexRealPiInstallRuntimeRegistration(projectRoot, {
        project_id: projectId,
        probe_id: "LIFE-PI-RUNTIME-0152-FAKE-HOST",
        actor: "goal3-task152-test",
        pi_host_label: "fake-host",
        pi_host_kind: "fake_pi_host",
        session_kind: "phase45_local_fake_pi_http_e2e",
        commands: {
          install: { program: process.execPath, args: ["pi-fixture.mjs", "install"] },
          runtime_registration: { program: process.execPath, args: ["pi-fixture.mjs", "runtime-registration"] },
          host_confirmation: { program: process.execPath, args: ["pi-fixture.mjs", "host-confirmation"] }
        }
      }),
    { code: "PI_CODEX_REAL_PI_RUNTIME_PROBE_FAKE_HOST_DENIED" },
    "Task152 probe must not accept fake Pi host evidence as real-Pi runtime validation"
  );

  assert.throws(
    () =>
      probePiCodexRealPiInstallRuntimeRegistration(projectRoot, {
        project_id: projectId,
        probe_id: "LIFE-PI-RUNTIME-0152-MISSING",
        actor: "goal3-task152-test",
        pi_host_label: "pi-host-lab-01",
        session_kind: "real_pi_host_automated_install",
        commands: {
          install: { program: process.execPath, args: ["pi-fixture.mjs", "install"] },
          runtime_registration: { program: process.execPath, args: ["pi-fixture.mjs", "runtime-registration"] }
        }
      }),
    /PI_CODEX_REAL_PI_RUNTIME_PROBE_COMMAND_MISSING/,
    "missing host-confirmation command must fail closed before execution"
  );

  process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS = JSON.stringify([]);
  assert.throws(
    () =>
      probePiCodexRealPiInstallRuntimeRegistration(projectRoot, {
        project_id: projectId,
        probe_id: "LIFE-PI-RUNTIME-0152-UNALLOWLISTED",
        actor: "goal3-task152-test",
        pi_host_label: "pi-host-lab-01",
        session_kind: "real_pi_host_automated_install",
        commands: {
          install: { program: process.execPath, args: ["pi-fixture.mjs", "install"] },
          runtime_registration: { program: process.execPath, args: ["pi-fixture.mjs", "runtime-registration"] },
          host_confirmation: { program: process.execPath, args: ["pi-fixture.mjs", "host-confirmation"] }
        }
      }),
    /PI_CODEX_LIFECYCLE_SERVICE_PROBE_PROGRAM_NOT_ALLOWLISTED/,
    "real-Pi runtime probe must reuse the lifecycle command allowlist"
  );
  process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS = JSON.stringify([process.execPath]);

  assert.throws(
    () =>
      probePiCodexRealPiInstallRuntimeRegistration(projectRoot, {
        project_id: projectId,
        probe_id: "LIFE-PI-RUNTIME-0152-SHELL",
        actor: "goal3-task152-test",
        pi_host_label: "pi-host-lab-01",
        session_kind: "real_pi_host_automated_install",
        commands: {
          install: { program: process.execPath, args: ["-e", "process.exit(0);"] },
          runtime_registration: { program: process.execPath, args: ["pi-fixture.mjs", "runtime-registration"] },
          host_confirmation: { program: process.execPath, args: ["pi-fixture.mjs", "host-confirmation"] }
        }
      }),
    /PI_CODEX_LIFECYCLE_SERVICE_PROBE_SHELL_ARGS_DENIED/,
    "inline shell-like real-Pi probe commands must fail closed"
  );

  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/pi-codex-lifecycle/real-pi-runtime-probe",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      probe_id: "LIFE-PI-RUNTIME-0152-ROUTE",
      actor: "goal3-task152-route-test",
      pi_host_label: "pi-host-lab-01",
      session_kind: "real_pi_host_automated_install",
      timeout_ms: 5000,
      commands: {
        install: { program: process.execPath, args: ["-v"] },
        runtime_registration: { program: process.execPath, args: ["-v"] },
        host_confirmation: { program: process.execPath, args: ["-v"] }
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
        event.event_type === "release.pi_codex_real_pi_runtime_probe_completed" &&
        event.payload.probe_id === "LIFE-PI-RUNTIME-0152" &&
        event.payload.ok === true &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "real-Pi install/runtime probe must be audit-visible and non-authoritative"
  );
} finally {
  if (previousAllowedPrograms === undefined) {
    delete process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS;
  } else {
    process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS = previousAllowedPrograms;
  }
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task152 real-Pi install/runtime-registration probe tests passed.");
