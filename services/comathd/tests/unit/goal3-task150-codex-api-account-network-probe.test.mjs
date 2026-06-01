import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  collectPiCodexLifecycleEvidence,
  createComathServer,
  getComathdStatus,
  initProject,
  probePiCodexProductionCodexAccountNetwork,
  readAuditEvents,
  setCodexApiBackendClientForTests
} from "../../dist/index.js";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task150-codex-api-probe-"));
const previousApiKey = process.env.COMATH_CODEX_API_KEY;
const previousApiBaseUrl = process.env.COMATH_CODEX_API_BASE_URL;
const previousApiModel = process.env.COMATH_CODEX_API_MODEL;
const previousMaxAttempts = process.env.COMATH_CODEX_API_MAX_ATTEMPTS;

try {
  process.env.COMATH_CODEX_API_KEY = "sk-task150-secret";
  process.env.COMATH_CODEX_API_BASE_URL = "https://api.openai.test/v1";
  process.env.COMATH_CODEX_API_MODEL = "gpt-5-codex-task150";
  process.env.COMATH_CODEX_API_MAX_ATTEMPTS = "2";

  const init = initProject({ name: "Goal3 Task150 Codex API Probe Project", root_path: projectRoot });
  const projectId = init.project.project_id;

  assert.equal(
    typeof probePiCodexProductionCodexAccountNetwork,
    "function",
    "Task150 must export a service-owned production Codex API/account/network validation probe"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("pi_codex_production_codex_api_account_network_probe"),
    true,
    "Task150 service capability ledger must advertise the Codex API account/network probe"
  );

  const calls = [];
  setCodexApiBackendClientForTests(async (request) => {
    calls.push(request);
    assert.equal(request.url, "https://api.openai.test/v1/responses");
    assert.equal(request.headers.authorization, "Bearer sk-task150-secret");
    assert.equal(request.body.model, "gpt-5-codex-task150");
    assert.equal(request.body.metadata.proof_authority, "none");
    assert.equal(request.body.metadata.validation_purpose, "pi_codex_lifecycle_account_network_probe");
    assert.match(request.body.input, /CoMath Pi\/Codex lifecycle validation/);
    return {
      status: 200,
      headers: { "x-ratelimit-remaining-requests": "17" },
      json: {
        id: "resp_task150",
        output_text: "COMATH_CODEX_API_ACCOUNT_NETWORK_VALIDATION_OK\nproof_authority: none"
      }
    };
  });

  const probe = await probePiCodexProductionCodexAccountNetwork(projectRoot, {
    project_id: projectId,
    validation_id: "LIFE-CODEX-0150",
    actor: "goal3-task150-test"
  });

  assert.equal(probe.schema_version, "comath.pi_codex_production_codex_account_network_probe.v1");
  assert.equal(probe.validation_id, "LIFE-CODEX-0150");
  assert.equal(probe.ok, true);
  assert.equal(probe.validation_status, "production_codex_account_network_validation_passed");
  assert.equal(probe.account_network_validation, "passed");
  assert.equal(probe.credential_source, "service_env");
  assert.equal(probe.network, true);
  assert.equal(probe.shell, false);
  assert.equal(probe.model, "gpt-5-codex-task150");
  assert.equal(probe.response_id, "resp_task150");
  assert.deepEqual(probe.statuses, [200]);
  assert.equal(probe.attempts, 1);
  assert.equal(probe.rate_limited, false);
  assert.equal(probe.proof_authority, "none");
  assert.equal(probe.can_promote_claim, false);
  assert.equal(probe.can_certify_ga, false);
  assert.deepEqual(probe.readiness_fragment, {
    codex_api_account_network_validation: "passed"
  });
  assert.equal(probe.codex_validation_report_path, ".comath/release/pi-codex-lifecycle/LIFE-CODEX-0150/codex-account-network-validation.json");
  assert.equal(probe.codex_validation_artifact.kind, "codex_validation_report");
  assert.equal(probe.codex_validation_artifact.path, probe.codex_validation_report_path);
  assert.equal(probe.codex_validation_artifact.sha256.length, 64);
  assert.equal(probe.codex_validation_artifact.size_bytes > 0, true);
  assert.equal(calls.length, 1, "validation probe must make a bounded service-owned API call");
  assert.equal(JSON.stringify(probe).includes("sk-task150-secret"), false, "probe result must not expose API secrets");
  assert.equal(JSON.stringify(probe).includes(projectRoot), false, "probe result must not expose host paths");

  const persisted = readJson(join(projectRoot, probe.codex_validation_report_path));
  assert.equal(persisted.ok, true);
  assert.equal(JSON.stringify(persisted).includes("sk-task150-secret"), false, "persisted validation report must not expose API secrets");
  assert.equal(JSON.stringify(persisted).includes(projectRoot), false, "persisted validation report must not expose host paths");

  const inputRoot = ".comath/release/pi-codex-lifecycle/task150-input";
  mkdirSync(join(projectRoot, inputRoot), { recursive: true });
  writeFileSync(join(projectRoot, inputRoot, "pi-install.md"), "real Pi install transcript\n", "utf8");
  writeFileSync(join(projectRoot, inputRoot, "runtime-registration.json"), '{"registered":true}\n', "utf8");
  writeFileSync(join(projectRoot, inputRoot, "service-lifecycle.log"), "start stop restart observed\n", "utf8");
  const evidence = collectPiCodexLifecycleEvidence(projectRoot, {
    project_id: projectId,
    evidence_id: "LIFE-EVID-0150-FROM-CODEX-PROBE",
    actor: "goal3-task150-evidence-test",
    install_session_evidence: {
      session_kind: "real_pi_host_automated_install",
      pi_host_kind: "real_pi_host",
      runtime_entrypoint_imported: true,
      runtime_registered: true,
      host_confirmation_observed: true,
      comathd_server_kind: "durable_service",
      service_start_observed: true,
      service_stop_observed: true,
      service_restart_observed: true
    },
    codex_evidence: {
      installed_cli_validation_ok: true,
      installed_cli_probe_source: "service_owned_process",
      codex_api_account_network_validation: probe.readiness_fragment.codex_api_account_network_validation
    },
    artifact_paths: {
      pi_install_transcript_path: `${inputRoot}/pi-install.md`,
      runtime_registration_snapshot_path: `${inputRoot}/runtime-registration.json`,
      service_lifecycle_log_path: `${inputRoot}/service-lifecycle.log`,
      codex_validation_report_path: probe.codex_validation_report_path
    }
  });
  assert.equal(evidence.collection_status, "evidence_ready_for_readiness_review");
  assert.equal(
    evidence.artifacts.some(
      (artifact) =>
        artifact.kind === "codex_validation_report" &&
        artifact.path === probe.codex_validation_report_path &&
        artifact.sha256 === probe.codex_validation_artifact.sha256
    ),
    true,
    "Task150 Codex API probe artifact must be ingestible by Task148 lifecycle evidence intake"
  );

  delete process.env.COMATH_CODEX_API_KEY;
  const missingCredentialProbe = await probePiCodexProductionCodexAccountNetwork(projectRoot, {
    project_id: projectId,
    validation_id: "LIFE-CODEX-0150-MISSING-CREDENTIAL",
    actor: "goal3-task150-test"
  });
  assert.equal(missingCredentialProbe.ok, false);
  assert.equal(missingCredentialProbe.validation_status, "blocked_missing_codex_api_credentials");
  assert.equal(missingCredentialProbe.account_network_validation, "blocked_missing_credentials");
  assert.equal(missingCredentialProbe.vetoes.some((veto) => veto.code === "codex_api_credentials_missing"), true);
  assert.equal(existsSync(join(projectRoot, missingCredentialProbe.codex_validation_report_path)), true, "missing credentials must still persist blocker evidence");

  process.env.COMATH_CODEX_API_KEY = "sk-task150-secret";
  setCodexApiBackendClientForTests(async () => ({
    status: 503,
    headers: { "retry-after": "0" },
    json: { error: { message: "temporary Codex API validation outage" } }
  }));
  const failedNetworkProbe = await probePiCodexProductionCodexAccountNetwork(projectRoot, {
    project_id: projectId,
    validation_id: "LIFE-CODEX-0150-FAILED",
    actor: "goal3-task150-test"
  });
  assert.equal(failedNetworkProbe.ok, false);
  assert.equal(failedNetworkProbe.validation_status, "blocked_codex_api_account_network_validation_failed");
  assert.equal(failedNetworkProbe.account_network_validation, "blocked_network_or_account_failure");
  assert.deepEqual(failedNetworkProbe.statuses, [503, 503]);
  assert.equal(failedNetworkProbe.vetoes.some((veto) => veto.code === "codex_api_account_network_validation_failed"), true);

  setCodexApiBackendClientForTests(async () => {
    throw new Error(`connect ECONNRESET ${projectRoot}\\secret.txt sk-task150-secret`);
  });
  const thrownNetworkProbe = await probePiCodexProductionCodexAccountNetwork(projectRoot, {
    project_id: projectId,
    validation_id: "LIFE-CODEX-0150-THROWN-NETWORK",
    actor: "goal3-task150-test"
  });
  assert.equal(thrownNetworkProbe.ok, false);
  assert.equal(thrownNetworkProbe.validation_status, "blocked_codex_api_account_network_validation_failed");
  assert.equal(thrownNetworkProbe.account_network_validation, "blocked_network_or_account_failure");
  assert.deepEqual(thrownNetworkProbe.statuses, []);
  const thrownPersisted = readJson(join(projectRoot, thrownNetworkProbe.codex_validation_report_path));
  assert.equal(JSON.stringify(thrownPersisted).includes(projectRoot), false, "thrown network errors must not persist host paths");
  assert.equal(JSON.stringify(thrownPersisted).includes("sk-task150-secret"), false, "thrown network errors must not persist API secrets");

  process.env.COMATH_CODEX_API_BASE_URL = "http://api.openai.test/v1";
  setCodexApiBackendClientForTests(async () => {
    throw new Error("client must not be called for invalid base URL");
  });
  const invalidBaseUrlProbe = await probePiCodexProductionCodexAccountNetwork(projectRoot, {
    project_id: projectId,
    validation_id: "LIFE-CODEX-0150-INVALID-BASE",
    actor: "goal3-task150-test"
  });
  assert.equal(invalidBaseUrlProbe.ok, false);
  assert.equal(invalidBaseUrlProbe.validation_status, "blocked_codex_api_account_network_validation_failed");
  assert.equal(invalidBaseUrlProbe.account_network_validation, "blocked_network_or_account_failure");
  assert.equal(invalidBaseUrlProbe.base_url_host, null);
  const invalidBasePersisted = readJson(join(projectRoot, invalidBaseUrlProbe.codex_validation_report_path));
  assert.equal(JSON.stringify(invalidBasePersisted).includes("http://api.openai.test"), false, "invalid base URL must not be persisted");

  await assert.rejects(
    () =>
      probePiCodexProductionCodexAccountNetwork(projectRoot, {
        project_id: projectId,
        validation_id: "..",
        actor: "goal3-task150-test"
      }),
    { code: "PI_CODEX_LIFECYCLE_CODEX_API_VALIDATION_INVALID_ID" },
    "validation ids must not collapse or escape the pi-codex-lifecycle artifact namespace"
  );

  process.env.COMATH_CODEX_API_BASE_URL = "https://api.openai.test/v1";
  setCodexApiBackendClientForTests(async () => ({
    status: 200,
    json: { id: "resp_task150_route", output_text: "ok" }
  }));
  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/pi-codex-lifecycle/codex-api-probe",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      validation_id: "LIFE-CODEX-0150-ROUTE",
      actor: "goal3-task150-route-test"
    }
  });
  assert.equal(routeResponse.status, 200, JSON.stringify(routeResponse.body));
  assert.equal(routeResponse.body.probe.ok, true);
  assert.equal(routeResponse.body.probe.can_certify_ga, false);
  assert.equal(JSON.stringify(routeResponse.body).includes("sk-task150-secret"), false, "route response must not expose API secrets");
  assert.equal(JSON.stringify(routeResponse.body).includes(projectRoot), false, "route response must not expose host paths");

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "release.pi_codex_codex_api_account_network_validated" &&
        event.payload.validation_id === "LIFE-CODEX-0150" &&
        event.payload.ok === true &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "Codex API account/network probe must be audit-visible and non-authoritative"
  );
} finally {
  setCodexApiBackendClientForTests(undefined);
  for (const [key, value] of [
    ["COMATH_CODEX_API_KEY", previousApiKey],
    ["COMATH_CODEX_API_BASE_URL", previousApiBaseUrl],
    ["COMATH_CODEX_API_MODEL", previousApiModel],
    ["COMATH_CODEX_API_MAX_ATTEMPTS", previousMaxAttempts]
  ]) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task150 Codex API account/network probe tests passed.");
