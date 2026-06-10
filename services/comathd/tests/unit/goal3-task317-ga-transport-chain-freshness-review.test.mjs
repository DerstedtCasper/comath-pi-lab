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
  recordGoal3GaOperationalReadinessReview,
  recordGoal3DurableTransportReleaseSignoffPrerequisite
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task317-ga-transport-freshness-"));
const init = initProject({ name: "Goal 3 Task317 GA transport chain freshness review", root_path: projectRoot });
const projectId = init.project.project_id;
const secretTerms = /Authorization:\s*Bearer|api_key|token=|plain-token|sk-/i;
const proofAuthorityTerms =
  /clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|kernel_checked|proof_success/i;
const gaOverclaimTerms = /GA certified|can_certify_ga\s*[:=]\s*(?:true|1)/i;
const transportOverclaimTerms =
  /long[- ]lived\s+(?:websocket|sse)|indefinite\s+sse|terminal transport recovered live|durable transport provided|live transport open/i;

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

function artifactFrom(written, kind) {
  return {
    kind,
    path: written.path,
    sha256: written.sha256,
    size_bytes: written.size_bytes
  };
}

function writeTransportEvidenceChain(id, overrides = {}) {
  const contractPath = `.comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-CONTRACT-${id}/operator-service-transport-contract.json`;
  const contract = writeJson(contractPath, {
    schema_version: "comath.pi_codex_operator_service_transport_contract.v1",
    project_id: projectId,
    transport_contract_id: `LIFE-TRANSPORT-CONTRACT-${id}`,
    transport_contract_path: contractPath,
    transport_contract_status: "operator_service_transport_contract_recorded",
    maintained_transport_primitive_bound: true,
    service_transport_primitive: "node_http_agent_run_log_session_route",
    client_transport_primitive: "pi_fetch_get_text",
    durable_transport_provided: false,
    live_transport_open: false,
    indefinite_stream_open: false,
    long_lived_websocket_provided: false,
    long_lived_sse_provided: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    ...(overrides.contract ?? {})
  });

  const continuityPath = `.comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-CONTINUITY-${id}/operator-service-transport-continuity.json`;
  const continuity = writeJson(continuityPath, {
    schema_version: "comath.pi_codex_operator_service_transport_continuity.v1",
    project_id: projectId,
    transport_continuity_id: `LIFE-TRANSPORT-CONTINUITY-${id}`,
    transport_continuity_path: continuityPath,
    transport_continuity_status: "operator_service_transport_continuity_recorded",
    transport_contract_id: `LIFE-TRANSPORT-CONTRACT-${id}`,
    transport_contract_artifact: artifactFrom(contract, "operator_service_transport_contract"),
    transport_contract_current: true,
    maintained_transport_primitive_bound: true,
    service_transport_primitive: "node_http_agent_run_log_session_route",
    client_transport_primitive: "pi_fetch_get_text",
    durable_transport_provided: false,
    live_transport_open: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    ...(overrides.continuity ?? {})
  });

  const durablePath = `.comath/release/pi-codex-lifecycle/LIFE-DURABLE-TRANSPORT-CONTRACT-${id}/unattended-real-host-durable-transport-contract.json`;
  const durable = writeJson(durablePath, {
    schema_version: "comath.pi_codex_unattended_real_host_durable_transport_contract.v1",
    project_id: projectId,
    durable_transport_contract_id: `LIFE-DURABLE-TRANSPORT-CONTRACT-${id}`,
    durable_transport_contract_path: durablePath,
    durable_transport_contract_status: "durable_transport_prerequisite_contract_recorded",
    durable_transport_contract_current: true,
    durability_contract_kind: "service_owned_external_durable_transport_prerequisite_contract",
    transport_prerequisite_state: "contract_recorded_transport_not_opened",
    service_owned_durable_transport_prerequisite_configured: true,
    transport_continuity_id: `LIFE-TRANSPORT-CONTINUITY-${id}`,
    transport_continuity_artifact: artifactFrom(continuity, "operator_service_transport_continuity"),
    transport_continuity_current: true,
    transport_contract_id: `LIFE-TRANSPORT-CONTRACT-${id}`,
    transport_contract_artifact: artifactFrom(contract, "operator_service_transport_contract"),
    transport_contract_current: true,
    maintained_transport_primitive_bound: true,
    service_transport_primitive: "node_http_agent_run_log_session_route",
    client_transport_primitive: "pi_fetch_get_text",
    durable_transport_provided: false,
    live_transport_open: false,
    indefinite_stream_open: false,
    long_lived_websocket_provided: false,
    long_lived_sse_provided: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    ...(overrides.durable ?? {})
  });

  const certificatePath = `.comath/release/pi-codex-lifecycle/LIFE-TERMINAL-COMPLETION-CERT-${id}/terminal-completion-certificate.json`;
  const certificate = writeJson(certificatePath, {
    schema_version: "comath.pi_codex_unattended_real_host_terminal_completion_certificate.v1",
    project_id: projectId,
    terminal_completion_certificate_id: `LIFE-TERMINAL-COMPLETION-CERT-${id}`,
    terminal_completion_certificate_path: certificatePath,
    terminal_completion_certificate_status: "terminal_unattended_completion_certified",
    terminal_unattended_completion_certified: true,
    completion_certificate_available: true,
    unattended_real_host_execution_completed: true,
    durable_transport_contract_id: `LIFE-DURABLE-TRANSPORT-CONTRACT-${id}`,
    durable_transport_contract_artifact: artifactFrom(durable, "unattended_real_host_durable_transport_contract"),
    durable_transport_contract_current: true,
    service_owned_durable_transport_prerequisite_configured: true,
    maintained_transport_primitive_bound: true,
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
    ...(overrides.certificate ?? {})
  });

  const closureId = `LIFE-TRANSPORT-CLOSURE-REVIEW-${id}`;
  const closurePath = `.comath/release/pi-codex-lifecycle/${closureId}/operator-service-transport-closure-review.json`;
  const closure = writeJson(closurePath, {
    schema_version: "comath.pi_codex_operator_service_transport_closure_review.v1",
    transport_closure_review_id: closureId,
    project_id: projectId,
    actor: "goal3-task317 transport closure reviewer token=plain-token proof_success durable transport provided",
    created_at: "2026-06-11T00:00:00.000Z",
    transport_closure_review_status: "maintained_operator_service_transport_closure_reviewed",
    durable_transport_closure_status: "maintained_operator_service_transport_closure_reviewed",
    transport_closure_review_path: closurePath,
    requested_transport_closure_mode: "maintained_operator_service_transport_closure_review",
    terminal_completion_certificate_id: `LIFE-TERMINAL-COMPLETION-CERT-${id}`,
    terminal_completion_certificate_status: "terminal_unattended_completion_certified",
    terminal_completion_certificate_path: certificatePath,
    terminal_completion_certificate_artifact: artifactFrom(
      certificate,
      "unattended_real_host_terminal_completion_certificate"
    ),
    terminal_completion_certificate_current: true,
    durable_transport_contract_id: `LIFE-DURABLE-TRANSPORT-CONTRACT-${id}`,
    durable_transport_contract_artifact: artifactFrom(durable, "unattended_real_host_durable_transport_contract"),
    durable_transport_contract_current: true,
    transport_continuity_id: `LIFE-TRANSPORT-CONTINUITY-${id}`,
    transport_continuity_artifact: artifactFrom(continuity, "operator_service_transport_continuity"),
    transport_continuity_current: true,
    transport_contract_id: `LIFE-TRANSPORT-CONTRACT-${id}`,
    transport_contract_artifact: artifactFrom(contract, "operator_service_transport_contract"),
    transport_contract_current: true,
    maintained_transport_primitive_bound: true,
    completion_certificate_available: true,
    terminal_unattended_completion_certified: true,
    unattended_real_host_execution_completed: true,
    service_transport_primitive: "node_http_agent_run_log_session_route",
    client_transport_primitive: "pi_fetch_get_text",
    agent_run_id: `ARUN-${id}`,
    service_route: `/agent/run/ARUN-${id}/log-session`,
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
    ...(overrides.closure ?? {})
  });

  return { certificate, durable, continuity, contract, closure, closureId };
}

function writeAdapterOsIsolationReadiness(id) {
  const path = `.comath/release/agent-adapter-os-isolation/${id}/review.json`;
  return writeJson(path, {
    schema_version: "comath.agent_adapter_os_isolation_readiness.v1",
    review_id: id,
    project_id: projectId,
    adapter_id: "codex-cli",
    backend: "external",
    created_at: "2026-06-11T00:00:00.000Z",
    ok: true,
    readiness_status: "ready_for_os_isolation_release_review",
    review_path: path,
    evidence_artifact: {
      kind: "agent_adapter_os_isolation_evidence",
      path: `.comath/release/agent-adapter-os-isolation/${id}/evidence.json`,
      sha256: "e".repeat(64),
      size_bytes: 1024
    },
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
    },
    vetoes: [],
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  });
}

function recordOperationalReadiness(id, transport, osReview) {
  return recordGoal3GaOperationalReadinessReview(projectRoot, {
    project_id: projectId,
    operational_readiness_review_id: `GOAL3-GA-OPERATIONAL-READINESS-${id}`,
    actor: "goal3-task317 operational readiness reviewer token=plain-token proof_success GA certified",
    transport_closure_review_id: transport.closureId,
    transport_closure_review_path: transport.closure.path,
    transport_closure_review_sha256: transport.closure.sha256,
    adapter_os_isolation_review_id: osReview.body.review_id,
    adapter_os_isolation_review_path: osReview.path,
    adapter_os_isolation_review_sha256: osReview.sha256
  });
}

function freshnessInput(id, readiness, overrides = {}) {
  return {
    project_id: projectId,
    durable_transport_signoff_prerequisite_id: `GOAL3-DURABLE-TRANSPORT-SIGNOFF-${id}`,
    actor:
      "goal3-task317 freshness reviewer D:/research/project Authorization: Bearer plain-token proof_success durable transport provided GA certified",
    operational_readiness_review_id: readiness.operational_readiness_review_id,
    operational_readiness_review_path: readiness.operational_readiness_review_path,
    operational_readiness_review_sha256: readiness.operational_readiness_review_artifact.sha256,
    ...overrides
  };
}

try {
  assert.equal(
    typeof recordGoal3DurableTransportReleaseSignoffPrerequisite,
    "function",
    "Task317 must export a service-owned durable transport release-signoff prerequisite gate"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("goal3_durable_transport_release_signoff_prerequisite_gate"),
    true,
    "Task317 capability ledger must advertise the durable transport release-signoff prerequisite gate"
  );
  for (const [path, pattern] of [
    ["README.md", /Task317.*durable transport release-signoff prerequisite/s],
    ["TODO.md", /Task317.*durable transport release-signoff prerequisite/s],
    ["REVIEW.md", /Goal 3 Task 317/s],
    ["AGENTS.md", /Task317.*durable transport release-signoff prerequisite/s],
    ["docs/architecture/ga-release-criteria.md", /Task317.*durable transport release-signoff prerequisite/s],
    ["docs/architecture/threat-model.md", /Task317.*durable transport release-signoff prerequisite/s],
    ["docs/architecture/acceptance-matrix.md", /Task317.*durable transport release-signoff prerequisite/s]
  ]) {
    assert.match(repoFile(path), pattern, `${path} must document Task317 without transport or GA overclaims`);
  }
  assert.equal(
    repoFile("scripts/phase0-smoke.mjs").includes(
      "goal3-task317-ga-transport-chain-freshness-review.test.mjs"
    ),
    true,
    "phase0 smoke must discover the Task317 focused suite"
  );

  const osReview = writeAdapterOsIsolationReadiness("ADAPTER-OSISO-0317");
  const transport = writeTransportEvidenceChain("0317");
  const readiness = recordOperationalReadiness("0317", transport, osReview);
  const prerequisite = recordGoal3DurableTransportReleaseSignoffPrerequisite(
    projectRoot,
    freshnessInput("0317", readiness)
  );

  assert.equal(prerequisite.schema_version, "comath.goal3_durable_transport_release_signoff_prerequisite.v1");
  assert.equal(prerequisite.ok, false);
  assert.equal(prerequisite.durable_transport_signoff_status, "blocked_durable_long_lived_transport_not_provided");
  assert.deepEqual(prerequisite.blocker_reasons, ["durable_long_lived_transport_not_provided"]);
  assert.equal(prerequisite.operational_readiness_review_current, true);
  assert.equal(prerequisite.transport_closure_review_current, true);
  assert.equal(prerequisite.terminal_completion_certificate_current, true);
  assert.equal(prerequisite.durable_transport_contract_current, true);
  assert.equal(prerequisite.transport_continuity_current, true);
  assert.equal(prerequisite.transport_contract_current, true);
  assert.equal(prerequisite.maintained_transport_primitive_bound, true);
  assert.equal(prerequisite.service_route_bound, true);
  assert.equal(prerequisite.client_fetch_contract_bound, true);
  assert.equal(prerequisite.service_transport_primitive, "node_http_agent_run_log_session_route");
  assert.equal(prerequisite.client_transport_primitive, "pi_fetch_get_text");
  assert.equal(prerequisite.durable_transport_provided, false);
  assert.equal(prerequisite.live_transport_open, false);
  assert.equal(prerequisite.indefinite_stream_open, false);
  assert.equal(prerequisite.long_lived_websocket_provided, false);
  assert.equal(prerequisite.long_lived_sse_provided, false);
  assert.equal(prerequisite.proof_authority, "none");
  assert.equal(prerequisite.can_promote_claim, false);
  assert.equal(prerequisite.can_certify_ga, false);
  assert.equal(JSON.stringify(prerequisite).includes(projectRoot), false);
  assert.doesNotMatch(JSON.stringify(prerequisite), secretTerms);
  assert.doesNotMatch(JSON.stringify(prerequisite), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(prerequisite), gaOverclaimTerms);
  assert.doesNotMatch(JSON.stringify(prerequisite), transportOverclaimTerms);
  assert.equal(existsSync(join(projectRoot, prerequisite.durable_transport_signoff_prerequisite_path)), true);

  const staleTransport = writeTransportEvidenceChain("0317-STALE");
  const staleReadiness = recordOperationalReadiness("0317-STALE", staleTransport, osReview);
  const continuity = readJson(staleTransport.continuity.path);
  continuity.live_transport_open = true;
  writeJson(staleTransport.continuity.path, continuity);
  assert.throws(
    () =>
      recordGoal3DurableTransportReleaseSignoffPrerequisite(
        projectRoot,
        freshnessInput("0317-STALE", staleReadiness)
      ),
    { code: "GOAL3_DURABLE_TRANSPORT_RELEASE_SIGNOFF_PREREQUISITE_STALE" },
    "Task317 must reject nested transport continuity bytes changed after the Task292 readiness artifact was written"
  );
  assert.equal(
    existsSync(
      join(
        projectRoot,
        ".comath/release/goal3-durable-transport-release-signoff-prerequisite/GOAL3-DURABLE-TRANSPORT-SIGNOFF-0317-STALE/prerequisite.json"
      )
    ),
    false,
    "Task317 must not write partial freshness artifacts on stale nested transport material"
  );

  const poisonedTransport = writeTransportEvidenceChain("0317-POISON", {
    durable: { live_transport_open: true, durable_transport_provided: true }
  });
  const poisonedReadiness = recordOperationalReadiness("0317-POISON", poisonedTransport, osReview);
  assert.throws(
    () =>
      recordGoal3DurableTransportReleaseSignoffPrerequisite(
        projectRoot,
        freshnessInput("0317-POISON", poisonedReadiness)
      ),
    { code: "GOAL3_DURABLE_TRANSPORT_RELEASE_SIGNOFF_PREREQUISITE_INVALID" },
    "Task317 must reject hash-current nested durable contracts that overclaim live or durable transport"
  );

  const serverTransport = writeTransportEvidenceChain("0317-ROUTE");
  const serverReadiness = recordOperationalReadiness("0317-ROUTE", serverTransport, osReview);
  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/goal3/durable-transport-release-signoff-prerequisite",
    body: {
      project_root: projectRoot,
      ...freshnessInput("0317-ROUTE", serverReadiness)
    }
  });
  assert.equal(routeResponse.status, 200, JSON.stringify(routeResponse.body));
  assert.equal(routeResponse.body.durable_transport_release_signoff_prerequisite.ok, false);
  assert.equal(
    routeResponse.body.durable_transport_release_signoff_prerequisite.durable_transport_signoff_status,
    "blocked_durable_long_lived_transport_not_provided"
  );
  assert.equal(routeResponse.body.durable_transport_release_signoff_prerequisite.proof_authority, "none");
  assert.equal(routeResponse.body.durable_transport_release_signoff_prerequisite.durable_transport_provided, false);
  assert.equal(routeResponse.body.durable_transport_release_signoff_prerequisite.can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), secretTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), gaOverclaimTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), transportOverclaimTerms);

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (entry) =>
        entry.event_type === "release.goal3_durable_transport_release_signoff_prerequisite_recorded" &&
        entry.payload.durable_transport_signoff_prerequisite_id === "GOAL3-DURABLE-TRANSPORT-SIGNOFF-0317-ROUTE" &&
        entry.payload.transport_contract_current === true &&
        entry.payload.blocker_reasons.includes("durable_long_lived_transport_not_provided") &&
        entry.payload.durable_transport_provided === false &&
        entry.payload.can_certify_ga === false
    ),
    true,
    "Task317 freshness review must emit a non-authoritative transport provenance audit event"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task317 durable transport release-signoff prerequisite tests passed.");
