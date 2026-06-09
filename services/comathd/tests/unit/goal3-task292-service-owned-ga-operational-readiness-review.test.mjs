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

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task292-ga-operational-readiness-"));
const init = initProject({ name: "Goal 3 Task292 GA operational readiness review", root_path: projectRoot });
const projectId = init.project.project_id;
const secretTerms = /Authorization:\s*Bearer|api_key|token=|plain-token|sk-/i;
const proofAuthorityTerms =
  /clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|kernel_checked|proof_success/i;
const gaOverclaimTerms = /GA certified|can_certify_ga\s*[:=]\s*(?:true|1)/i;

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

function artifact(kind, path, fill, size = 1024) {
  return {
    kind,
    path,
    sha256: fill.repeat(64),
    size_bytes: size
  };
}

function writeTransportClosureReview(id, overrides = {}) {
  const path = `.comath/release/pi-codex-lifecycle/${id}/operator-service-transport-closure-review.json`;
  return writeJson(path, {
    schema_version: "comath.pi_codex_operator_service_transport_closure_review.v1",
    transport_closure_review_id: id,
    project_id: projectId,
    actor: "goal3-task292 transport closure reviewer",
    created_at: "2026-06-09T00:00:00.000Z",
    transport_closure_review_status: "maintained_operator_service_transport_closure_reviewed",
    durable_transport_closure_status: "maintained_operator_service_transport_closure_reviewed",
    transport_closure_review_path: path,
    requested_transport_closure_mode: "maintained_operator_service_transport_closure_review",
    terminal_completion_certificate_id: `LIFE-TERMINAL-COMPLETION-CERT-${id}`,
    terminal_completion_certificate_status: "terminal_unattended_completion_certified",
    terminal_completion_certificate_path:
      `.comath/release/pi-codex-lifecycle/LIFE-TERMINAL-COMPLETION-CERT-${id}/terminal-completion-certificate.json`,
    terminal_completion_certificate_artifact: artifact(
      "unattended_real_host_terminal_completion_certificate",
      `.comath/release/pi-codex-lifecycle/LIFE-TERMINAL-COMPLETION-CERT-${id}/terminal-completion-certificate.json`,
      "a"
    ),
    terminal_completion_certificate_current: true,
    durable_transport_contract_id: `LIFE-DURABLE-TRANSPORT-CONTRACT-${id}`,
    durable_transport_contract_artifact: artifact(
      "unattended_real_host_durable_transport_contract",
      `.comath/release/pi-codex-lifecycle/LIFE-DURABLE-TRANSPORT-CONTRACT-${id}/unattended-real-host-durable-transport-contract.json`,
      "b"
    ),
    durable_transport_contract_current: true,
    transport_continuity_id: `LIFE-TRANSPORT-CONTINUITY-${id}`,
    transport_continuity_artifact: artifact(
      "operator_service_transport_continuity",
      `.comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-CONTINUITY-${id}/operator-service-transport-continuity.json`,
      "c"
    ),
    transport_continuity_current: true,
    transport_contract_id: `LIFE-TRANSPORT-CONTRACT-${id}`,
    transport_contract_artifact: artifact(
      "operator_service_transport_contract",
      `.comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-CONTRACT-${id}/operator-service-transport-contract.json`,
      "d"
    ),
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
    ...overrides
  });
}

function writeAdapterOsIsolationReadiness(id, ok, overrides = {}) {
  const path = `.comath/release/agent-adapter-os-isolation/${id}/review.json`;
  return writeJson(path, {
    schema_version: "comath.agent_adapter_os_isolation_readiness.v1",
    review_id: id,
    project_id: projectId,
    adapter_id: "codex-cli",
    backend: "external",
    created_at: "2026-06-09T00:00:00.000Z",
    ok,
    readiness_status: ok ? "ready_for_os_isolation_release_review" : "blocked_missing_os_enforced_adapter_isolation",
    review_path: path,
    evidence_artifact: ok
      ? artifact(
          "agent_adapter_os_isolation_evidence",
          `.comath/release/agent-adapter-os-isolation/${id}/evidence.json`,
          "e"
        )
      : null,
    checks: {
      evidence_artifact_bound: { ok, observed: ok ? "bound" : null },
      provider_os_enforced: { ok, observed: ok ? "oci_container" : null },
      non_authority: { ok: true, observed: true }
    },
    adapter_execution_isolation: {
      required_for_ga: true,
      current_boundary: ok ? "os_enforced" : "process_boundary_only",
      os_enforced: ok,
      provider: ok ? "oci_container" : null,
      claims_runtime_enforcement: false,
      proof_authority: "none"
    },
    vetoes: ok ? [] : [{ code: "adapter_os_isolation_evidence_missing", message: "missing canonical OS evidence" }],
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    ...overrides
  });
}

try {
  assert.equal(
    typeof recordGoal3GaOperationalReadinessReview,
    "function",
    "Task292 must export a service-owned GA operational readiness review gate"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("goal3_ga_operational_readiness_review_gate"),
    true,
    "Task292 capability ledger must advertise the operational readiness review without claiming GA certification"
  );

  for (const [path, pattern] of [
    ["README.md", /Task292.*GA operational readiness review/s],
    ["TODO.md", /Task292.*GA operational readiness review/s],
    ["REVIEW.md", /Goal 3 Task 292/s],
    ["AGENTS.md", /Task292.*GA operational readiness review/s],
    ["docs/architecture/adapter-contracts.md", /Task292.*GA operational readiness review/s],
    ["docs/architecture/ga-release-criteria.md", /Task292.*GA operational readiness review/s],
    ["docs/architecture/threat-model.md", /Task292.*GA operational readiness review/s],
    ["docs/architecture/acceptance-matrix.md", /Task292.*GA operational readiness review/s]
  ]) {
    assert.match(repoFile(path), pattern, `${path} must document Task292 without overclaiming`);
  }
  assert.equal(
    repoFile("scripts/phase0-smoke.mjs").includes(
      "goal3-task292-service-owned-ga-operational-readiness-review.test.mjs"
    ),
    true,
    "phase0 smoke must discover the Task292 focused suite"
  );

  const transport = writeTransportClosureReview("LIFE-TRANSPORT-CLOSURE-REVIEW-0292-BLOCKED");
  const blockedOs = writeAdapterOsIsolationReadiness("ADAPTER-OSISO-0292-BLOCKED", false);
  const blockedReview = recordGoal3GaOperationalReadinessReview(projectRoot, {
    project_id: projectId,
    operational_readiness_review_id: "GOAL3-GA-OPERATIONAL-READINESS-0292-BLOCKED",
    actor:
      "goal3-task292 blocked reviewer token=plain-token proof_success GA certified can_certify_ga=true Authorization: Bearer plain-token",
    transport_closure_review_id: transport.body.transport_closure_review_id,
    transport_closure_review_path: transport.path,
    transport_closure_review_sha256: transport.sha256,
    adapter_os_isolation_review_id: blockedOs.body.review_id,
    adapter_os_isolation_review_path: blockedOs.path,
    adapter_os_isolation_review_sha256: blockedOs.sha256
  });
  assert.equal(blockedReview.ok, false);
  assert.equal(blockedReview.operational_readiness_status, "blocked_ga_operational_readiness_prerequisites");
  assert.equal(blockedReview.transport_closure_review_current, true);
  assert.equal(blockedReview.adapter_os_isolation_review_current, true);
  assert.equal(blockedReview.terminal_unattended_completion_certified, true);
  assert.equal(blockedReview.maintained_transport_primitive_bound, true);
  assert.equal(blockedReview.adapter_os_enforced, false);
  assert.equal(
    blockedReview.blocker_reasons.includes("adapter_os_isolation_release_review_not_ready"),
    true
  );
  assert.equal(blockedReview.proof_authority, "none");
  assert.equal(blockedReview.can_promote_claim, false);
  assert.equal(blockedReview.can_certify_ga, false);
  assert.equal(blockedReview.ga_certification_gate_separate, true);
  assert.equal(JSON.stringify(blockedReview).includes(projectRoot), false);
  assert.doesNotMatch(JSON.stringify(blockedReview), secretTerms);
  assert.doesNotMatch(JSON.stringify(blockedReview), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(blockedReview), gaOverclaimTerms);
  assert.equal(existsSync(join(projectRoot, blockedReview.operational_readiness_review_path)), true);

  assert.throws(
    () =>
      recordGoal3GaOperationalReadinessReview(projectRoot, {
        project_id: projectId,
        operational_readiness_review_id: "GOAL3-GA-OPERATIONAL-READINESS-0292-STALE",
        transport_closure_review_id: transport.body.transport_closure_review_id,
        transport_closure_review_path: transport.path,
        transport_closure_review_sha256: transport.sha256,
        adapter_os_isolation_review_id: blockedOs.body.review_id,
        adapter_os_isolation_review_path: blockedOs.path,
        adapter_os_isolation_review_sha256: "0".repeat(64)
      }),
    { code: "GOAL3_GA_OPERATIONAL_READINESS_REVIEW_STALE" },
    "Task292 must reject stale adapter OS-isolation readiness review hashes before aggregation"
  );

  const promotionalTransport = writeTransportClosureReview("LIFE-TRANSPORT-CLOSURE-REVIEW-0292-PROMO", {
    can_certify_ga: true
  });
  assert.throws(
    () =>
      recordGoal3GaOperationalReadinessReview(projectRoot, {
        project_id: projectId,
        operational_readiness_review_id: "GOAL3-GA-OPERATIONAL-READINESS-0292-PROMO",
        transport_closure_review_id: promotionalTransport.body.transport_closure_review_id,
        transport_closure_review_path: promotionalTransport.path,
        transport_closure_review_sha256: promotionalTransport.sha256,
        adapter_os_isolation_review_id: blockedOs.body.review_id,
        adapter_os_isolation_review_path: blockedOs.path,
        adapter_os_isolation_review_sha256: blockedOs.sha256
      }),
    { code: "GOAL3_GA_OPERATIONAL_READINESS_REVIEW_INVALID" },
    "Task292 must reject promotional transport closure material even when hash-current"
  );

  const routeTransport = writeTransportClosureReview("LIFE-TRANSPORT-CLOSURE-REVIEW-0292-ROUTE");
  const readyOs = writeAdapterOsIsolationReadiness("ADAPTER-OSISO-0292-READY", true);
  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/goal3/ga-operational-readiness-review",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      operational_readiness_review_id: "GOAL3-GA-OPERATIONAL-READINESS-0292-ROUTE",
      actor: "goal3-task292 route reviewer token=plain-token proof_success GA certified can_certify_ga=true",
      transport_closure_review_id: routeTransport.body.transport_closure_review_id,
      transport_closure_review_path: routeTransport.path,
      transport_closure_review_sha256: routeTransport.sha256,
      adapter_os_isolation_review_id: readyOs.body.review_id,
      adapter_os_isolation_review_path: readyOs.path,
      adapter_os_isolation_review_sha256: readyOs.sha256
    }
  });
  assert.equal(routeResponse.status, 200);
  assert.equal(routeResponse.body.operational_readiness_review.ok, true);
  assert.equal(
    routeResponse.body.operational_readiness_review.operational_readiness_status,
    "ready_for_ga_release_candidate_review"
  );
  assert.equal(routeResponse.body.operational_readiness_review.adapter_os_enforced, true);
  assert.equal(routeResponse.body.operational_readiness_review.can_certify_ga, false);

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (entry) =>
        entry.event_type === "release.goal3_ga_operational_readiness_review_recorded" &&
        entry.payload.operational_readiness_review_id === "GOAL3-GA-OPERATIONAL-READINESS-0292-ROUTE" &&
        entry.payload.can_certify_ga === false
    ),
    true,
    "Task292 operational readiness review must emit a non-authoritative provenance audit event"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task292 service-owned GA operational readiness review tests passed.");
