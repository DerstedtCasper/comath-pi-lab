import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createComathServer,
  initProject,
  readAuditEvents,
  reviewPiCodexLifecycleReadiness
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task146-lifecycle-"));

try {
  const init = initProject({ name: "Goal3 Task146 Lifecycle Project", root_path: projectRoot });
  const projectId = init.project.project_id;

  assert.equal(
    typeof reviewPiCodexLifecycleReadiness,
    "function",
    "Task146 must export a service-owned Pi/Codex lifecycle readiness review gate"
  );

  const review = reviewPiCodexLifecycleReadiness(projectRoot, {
    project_id: projectId,
    review_id: "LIFE-0146",
    actor: "goal3-task146-test",
    install_session_evidence: {
      session_kind: "phase45_local_fake_pi_http_e2e",
      pi_host_kind: "fake_pi_host",
      runtime_entrypoint_imported: true,
      runtime_registered: true,
      host_confirmation_observed: true,
      comathd_server_kind: "ephemeral_test_http_server",
      service_start_observed: true,
      service_stop_observed: true,
      service_restart_observed: false
    },
    codex_evidence: {
      installed_cli_validation_ok: true,
      installed_cli_probe_source: "service_owned_process",
      codex_api_account_network_validation: "not_run"
    }
  });

  assert.equal(review.schema_version, "comath.pi_codex_lifecycle_readiness.v1");
  assert.equal(review.ok, false, "fake-host install-session evidence cannot satisfy real-host readiness");
  assert.equal(review.readiness_status, "blocked_missing_real_host_lifecycle_validation");
  assert.equal(review.proof_authority, "none");
  assert.equal(review.can_promote_claim, false);
  assert.equal(review.can_certify_ga, false);
  assert.equal(review.review_id, "LIFE-0146");
  assert.equal(review.review_path, ".comath/release/pi-codex-lifecycle/LIFE-0146/review.json");
  assert.equal(review.inputs.install_session_evidence.pi_host_kind, "fake_pi_host");
  assert.equal(review.inputs.install_session_evidence.comathd_server_kind, "ephemeral_test_http_server");
  assert.deepEqual(review.checks.real_pi_host_runtime, {
    ok: false,
    required: true,
    observed: "fake_pi_host"
  });
  assert.deepEqual(review.checks.durable_comathd_service_lifecycle, {
    ok: false,
    required: true,
    observed: "ephemeral_test_http_server"
  });
  assert.deepEqual(review.checks.production_codex_validation, {
    ok: false,
    required: true,
    observed: "not_run"
  });
  assert.equal(
    review.vetoes.some((veto) => veto.code === "real_pi_host_validation_missing"),
    true
  );
  assert.equal(
    review.vetoes.some((veto) => veto.code === "durable_comathd_service_lifecycle_missing"),
    true
  );
  assert.equal(
    review.vetoes.some((veto) => veto.code === "production_codex_account_network_validation_missing"),
    true
  );

  const reportPath = join(projectRoot, review.review_path);
  assert.equal(existsSync(reportPath), true, "readiness review must be persisted as service-owned evidence");
  const persisted = JSON.parse(readFileSync(reportPath, "utf8"));
  assert.equal(persisted.ok, false);
  assert.equal(persisted.proof_authority, "none");
  assert.equal(JSON.stringify(persisted).includes(projectRoot), false, "persisted lifecycle review must not echo host paths");

  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/pi-codex-lifecycle/review",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      review_id: "LIFE-0146-ROUTE",
      actor: "goal3-task146-route-test",
      install_session_evidence: {
        session_kind: "phase45_local_fake_pi_http_e2e",
        pi_host_kind: "fake_pi_host",
        runtime_entrypoint_imported: true,
        runtime_registered: true,
        host_confirmation_observed: true,
        comathd_server_kind: "ephemeral_test_http_server",
        service_start_observed: true,
        service_stop_observed: true,
        service_restart_observed: false
      },
      codex_evidence: {
        installed_cli_validation_ok: true,
        installed_cli_probe_source: "service_owned_process",
        codex_api_account_network_validation: "not_run"
      }
    }
  });
  assert.equal(routeResponse.status, 200, JSON.stringify(routeResponse.body));
  assert.equal(routeResponse.body.review.ok, false);
  assert.equal(routeResponse.body.review.can_certify_ga, false);
  assert.equal(JSON.stringify(routeResponse.body).includes(projectRoot), false, "route response must not echo host paths");

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "release.pi_codex_lifecycle_readiness_reviewed" &&
        event.payload.ok === false &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "lifecycle readiness review must be audit-visible and non-authoritative"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task146 Pi/Codex lifecycle readiness tests passed.");
