import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import {
  createComathServer,
  getComathdStatus,
  initProject,
  readAuditEvents,
  recordGoal3GaOperationalReadinessReview
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task305-ga-operational-helper-source-"));
const init = initProject({
  name: "Goal 3 Task305 GA operational readiness production helper source binding",
  root_path: projectRoot
});
const projectId = init.project.project_id;

function repoFile(relativePath) {
  const here = dirname(fileURLToPath(import.meta.url));
  return readFileSync(join(here, "../../../..", relativePath), "utf8");
}

function sha256Text(text) {
  return createHash("sha256").update(text).digest("hex");
}

function writeJson(relativePath, value) {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  const absolutePath = join(projectRoot, relativePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, text, "utf8");
  return {
    path: relativePath,
    sha256: sha256Text(text),
    size_bytes: Buffer.byteLength(text, "utf8"),
    body: value
  };
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(projectRoot, relativePath), "utf8"));
}

function artifact(kind, path, fill, size = 1024) {
  return {
    kind,
    path,
    sha256: fill.repeat(64),
    size_bytes: size
  };
}

function writeTransportClosureReview(id) {
  const path = `.comath/release/pi-codex-lifecycle/${id}/operator-service-transport-closure-review.json`;
  return writeJson(path, {
    schema_version: "comath.pi_codex_operator_service_transport_closure_review.v1",
    transport_closure_review_id: id,
    project_id: projectId,
    actor: "goal3-task305 transport closure reviewer",
    created_at: "2026-06-10T00:00:00.000Z",
    transport_closure_review_status: "maintained_operator_service_transport_closure_reviewed",
    durable_transport_closure_status: "maintained_operator_service_transport_closure_reviewed",
    transport_closure_review_path: path,
    requested_transport_closure_mode: "maintained_operator_service_transport_closure_review",
    terminal_completion_certificate_current: true,
    durable_transport_contract_current: true,
    transport_continuity_current: true,
    transport_contract_current: true,
    maintained_transport_primitive_bound: true,
    completion_certificate_available: true,
    terminal_unattended_completion_certified: true,
    unattended_real_host_execution_completed: true,
    service_transport_primitive: "node_http_agent_run_log_session_route",
    client_transport_primitive: "pi_fetch_get_text",
    durable_transport_provided: false,
    live_transport_open: false,
    indefinite_stream_open: false,
    long_lived_websocket_provided: false,
    long_lived_sse_provided: false,
    pi_direct_write_allowed: false,
    direct_trusted_state_mutation: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    ga_certification_gate_separate: true,
    terminal_completion_certificate_artifact: artifact(
      "unattended_real_host_terminal_completion_certificate",
      `.comath/release/pi-codex-lifecycle/LIFE-TERMINAL-COMPLETION-CERT-${id}/terminal-completion-certificate.json`,
      "a"
    ),
    durable_transport_contract_artifact: artifact(
      "unattended_real_host_durable_transport_contract",
      `.comath/release/pi-codex-lifecycle/LIFE-DURABLE-TRANSPORT-CONTRACT-${id}/unattended-real-host-durable-transport-contract.json`,
      "b"
    ),
    transport_continuity_artifact: artifact(
      "operator_service_transport_continuity",
      `.comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-CONTINUITY-${id}/operator-service-transport-continuity.json`,
      "c"
    ),
    transport_contract_artifact: artifact(
      "operator_service_transport_contract",
      `.comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-CONTRACT-${id}/operator-service-transport-contract.json`,
      "d"
    )
  });
}

function writeAdapterOsIsolationReadiness(id, overrides = {}) {
  const path = `.comath/release/agent-adapter-os-isolation/${id}/review.json`;
  return writeJson(path, {
    schema_version: "comath.agent_adapter_os_isolation_readiness.v1",
    review_id: id,
    project_id: projectId,
    adapter_id: "codex-cli",
    backend: "external",
    created_at: "2026-06-10T00:00:00.000Z",
    ok: true,
    readiness_status: "ready_for_os_isolation_release_review",
    review_path: path,
    evidence_artifact: artifact(
      "agent_adapter_os_isolation_evidence",
      `.comath/release/agent-adapter-os-isolation/${id}/evidence.json`,
      "e"
    ),
    checks: {
      evidence_artifact_bound: { ok: true, observed: "bound" },
      provider_os_enforced: { ok: true, observed: "oci_container" },
      non_authority: { ok: true, observed: true }
    },
    adapter_execution_isolation: {
      required_for_ga: true,
      current_boundary: "os_enforced",
      os_enforced: true,
      provider: "oci_container",
      claims_runtime_enforcement: false,
      proof_authority: "none"
    },
    vetoes: [],
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    ...overrides
  });
}

function recordOperationalReadiness(id, transport, osReview) {
  return recordGoal3GaOperationalReadinessReview(projectRoot, {
    project_id: projectId,
    operational_readiness_review_id: `GOAL3-GA-OPERATIONAL-READINESS-${id}`,
    actor: "goal3-task305 operational readiness reviewer token=plain-token proof_success GA certified",
    transport_closure_review_id: transport.body.transport_closure_review_id,
    transport_closure_review_path: transport.path,
    transport_closure_review_sha256: transport.sha256,
    adapter_os_isolation_review_id: osReview.body.review_id,
    adapter_os_isolation_review_path: osReview.path,
    adapter_os_isolation_review_sha256: osReview.sha256
  });
}

try {
  assert.equal(
    getComathdStatus().capabilities.includes(
      "goal3_ga_operational_readiness_production_helper_source_binding"
    ),
    true,
    "Task305 capability ledger must advertise production helper source binding at the GA operational readiness layer"
  );
  for (const [path, pattern] of [
    ["README.md", /Task305.*operational readiness.*production helper.*source/s],
    ["TODO.md", /Task305.*operational readiness.*production helper.*source/s],
    ["REVIEW.md", /Goal 3 Task 305/s],
    ["AGENTS.md", /Task305.*operational readiness.*production helper.*source/s],
    ["docs/architecture/adapter-contracts.md", /Task305.*operational readiness.*production helper.*source/s],
    ["docs/architecture/ga-release-criteria.md", /Task305.*operational readiness.*production helper.*source/s],
    ["docs/architecture/threat-model.md", /Task305.*operational readiness.*production helper.*source/s],
    ["docs/architecture/acceptance-matrix.md", /Task305.*operational readiness.*production helper.*source/s]
  ]) {
    assert.match(repoFile(path), pattern, `${path} must document Task305 without shifting proof authority`);
  }
  assert.equal(
    repoFile("scripts/phase0-smoke.mjs").includes(
      "goal3-task305-ga-operational-readiness-production-helper-source-binding.test.mjs"
    ),
    true,
    "phase0 smoke must discover the Task305 focused suite"
  );

  const legacyTransport = writeTransportClosureReview("LIFE-TRANSPORT-CLOSURE-REVIEW-0305-LEGACY");
  const legacyReady = writeAdapterOsIsolationReadiness("ADAPTER-OSISO-0305-LEGACY");
  assert.throws(
    () => recordOperationalReadiness("0305-LEGACY", legacyTransport, legacyReady),
    { code: "GOAL3_GA_OPERATIONAL_READINESS_REVIEW_INVALID" },
    "Task305 must reject legacy ready OS-isolation reviews that lack Task304 production helper source binding"
  );
  assert.equal(
    existsSync(join(projectRoot, ".comath/release/goal3-ga-operational-readiness/GOAL3-GA-OPERATIONAL-READINESS-0305-LEGACY/review.json")),
    false,
    "Task305 must not write a partial operational readiness artifact for legacy ready OS-isolation material"
  );

  const tamperedTransport = writeTransportClosureReview("LIFE-TRANSPORT-CLOSURE-REVIEW-0305-TAMPERED");
  const tamperedReady = writeAdapterOsIsolationReadiness("ADAPTER-OSISO-0305-TAMPERED", {
    checks: {
      evidence_artifact_bound: { ok: true, observed: "bound" },
      provider_os_enforced: { ok: true, observed: "oci_container" },
      production_helper_source: { ok: true, observed: "operator_configured_provider_helper" },
      non_authority: { ok: true, observed: true }
    },
    adapter_execution_isolation: {
      required_for_ga: true,
      current_boundary: "os_enforced",
      os_enforced: true,
      provider: "oci_container",
      production_helper_configured: false,
      helper_profile_source: "bundled_provider_helper_protocol_asset",
      bundled_protocol_asset: true,
      claims_runtime_enforcement: false,
      proof_authority: "none"
    }
  });
  assert.throws(
    () => recordOperationalReadiness("0305-TAMPERED", tamperedTransport, tamperedReady),
    { code: "GOAL3_GA_OPERATIONAL_READINESS_REVIEW_INVALID" },
    "Task305 must bind production helper source checks to adapter_execution_isolation provenance"
  );

  const readyTransport = writeTransportClosureReview("LIFE-TRANSPORT-CLOSURE-REVIEW-0305-READY");
  const sourceBoundReady = writeAdapterOsIsolationReadiness("ADAPTER-OSISO-0305-READY", {
    checks: {
      evidence_artifact_bound: { ok: true, observed: "bound" },
      provider_os_enforced: { ok: true, observed: "oci_container" },
      production_helper_source: { ok: true, observed: "operator_configured_provider_helper" },
      non_authority: { ok: true, observed: true }
    },
    adapter_execution_isolation: {
      required_for_ga: true,
      current_boundary: "os_enforced",
      os_enforced: true,
      provider: "oci_container",
      production_helper_configured: true,
      helper_profile_source: "operator_configured_provider_helper",
      bundled_protocol_asset: false,
      claims_runtime_enforcement: false,
      proof_authority: "none"
    }
  });
  const review = recordOperationalReadiness("0305-READY", readyTransport, sourceBoundReady);
  assert.equal(review.ok, true);
  assert.equal(review.operational_readiness_status, "ready_for_ga_release_candidate_review");
  assert.equal(review.adapter_os_enforced, true);
  assert.equal(review.adapter_production_helper_source_bound, true);
  assert.equal(review.adapter_helper_profile_source, "operator_configured_provider_helper");
  assert.equal(review.adapter_production_helper_configured, true);
  assert.equal(review.adapter_bundled_protocol_asset, false);
  assert.equal(review.proof_authority, "none");
  assert.equal(review.can_promote_claim, false);
  assert.equal(review.can_certify_ga, false);
  assert.equal(JSON.stringify(review).includes(projectRoot), false);
  assert.equal(JSON.stringify(review).includes("plain-token"), false);
  const persisted = readJson(review.operational_readiness_review_path);
  assert.equal(persisted.adapter_production_helper_source_bound, true);
  assert.equal(persisted.operational_readiness_review_artifact, undefined);

  const server = createComathServer();
  const routeTransport = writeTransportClosureReview("LIFE-TRANSPORT-CLOSURE-REVIEW-0305-ROUTE");
  const routeReady = writeAdapterOsIsolationReadiness("ADAPTER-OSISO-0305-ROUTE", {
    checks: {
      evidence_artifact_bound: { ok: true, observed: "bound" },
      provider_os_enforced: { ok: true, observed: "oci_container" },
      production_helper_source: { ok: true, observed: "operator_configured_provider_helper" },
      non_authority: { ok: true, observed: true }
    },
    adapter_execution_isolation: {
      required_for_ga: true,
      current_boundary: "os_enforced",
      os_enforced: true,
      provider: "oci_container",
      production_helper_configured: true,
      helper_profile_source: "operator_configured_provider_helper",
      bundled_protocol_asset: false,
      claims_runtime_enforcement: false,
      proof_authority: "none"
    }
  });
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/goal3/ga-operational-readiness-review",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      operational_readiness_review_id: "GOAL3-GA-OPERATIONAL-READINESS-0305-ROUTE",
      actor: "goal3-task305 route token=plain-token proof_success GA certified",
      transport_closure_review_id: routeTransport.body.transport_closure_review_id,
      transport_closure_review_path: routeTransport.path,
      transport_closure_review_sha256: routeTransport.sha256,
      adapter_os_isolation_review_id: routeReady.body.review_id,
      adapter_os_isolation_review_path: routeReady.path,
      adapter_os_isolation_review_sha256: routeReady.sha256
    }
  });
  assert.equal(routeResponse.status, 200);
  assert.equal(routeResponse.body.operational_readiness_review.adapter_production_helper_source_bound, true);
  assert.equal(routeResponse.body.operational_readiness_review.can_certify_ga, false);

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (entry) =>
        entry.event_type === "release.goal3_ga_operational_readiness_review_recorded" &&
        entry.payload.operational_readiness_review_id === "GOAL3-GA-OPERATIONAL-READINESS-0305-ROUTE" &&
        entry.payload.adapter_production_helper_source_bound === true &&
        entry.payload.adapter_helper_profile_source === "operator_configured_provider_helper" &&
        entry.payload.can_certify_ga === false
    ),
    true,
    "Task305 operational readiness audit must bind Task304 production helper source provenance"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task305 GA operational readiness production helper source binding tests passed.");
