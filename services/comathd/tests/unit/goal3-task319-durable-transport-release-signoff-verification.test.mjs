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
  recordGoal3DurableTransportReleaseSignoffVerification
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task319-transport-signoff-verification-"));
const init = initProject({ name: "Goal 3 Task319 durable transport release signoff verification", root_path: projectRoot });
const projectId = init.project.project_id;
const secretTerms = /Authorization:\s*Bearer|api_key|token=|plain-token|sk-/i;
const proofAuthorityTerms =
  /clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|kernel_checked|proof_success/i;
const gaOverclaimTerms = /GA certified|can_certify_ga\s*[:=]\s*(?:true|1)|ga_release_signoff_ready\s*[:=]\s*(?:true|1)/i;

function repoFile(relativePath) {
  const here = dirname(fileURLToPath(import.meta.url));
  return readFileSync(join(here, "../../../..", relativePath), "utf8");
}

function sha256Text(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
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

function writeTask317PrerequisiteChain(id, overrides = {}) {
  const contractPath = `.comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-CONTRACT-${id}/operator-service-transport-contract.json`;
  const contract = writeJson(contractPath, {
    schema_version: "comath.pi_codex_operator_service_transport_contract.v1",
    project_id: projectId,
    transport_contract_id: `LIFE-TRANSPORT-CONTRACT-${id}`,
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
    durability_contract_kind: "service_owned_external_durable_transport_prerequisite_contract",
    service_owned_durable_transport_prerequisite_configured: true,
    transport_continuity_artifact: artifactFrom(continuity, "operator_service_transport_continuity"),
    transport_continuity_current: true,
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
    terminal_unattended_completion_certified: true,
    completion_certificate_available: true,
    unattended_real_host_execution_completed: true,
    durable_transport_contract_artifact: artifactFrom(durable, "unattended_real_host_durable_transport_contract"),
    durable_transport_contract_current: true,
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

  const closurePath = `.comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-CLOSURE-REVIEW-${id}/operator-service-transport-closure-review.json`;
  const closure = writeJson(closurePath, {
    schema_version: "comath.pi_codex_operator_service_transport_closure_review.v1",
    project_id: projectId,
    transport_closure_review_id: `LIFE-TRANSPORT-CLOSURE-REVIEW-${id}`,
    maintained_transport_primitive_bound: true,
    completion_certificate_available: true,
    terminal_unattended_completion_certified: true,
    unattended_real_host_execution_completed: true,
    service_transport_primitive: "node_http_agent_run_log_session_route",
    client_transport_primitive: "pi_fetch_get_text",
    service_route: `/agent/run/ARUN-${id}/log-session`,
    terminal_completion_certificate_artifact: artifactFrom(
      certificate,
      "unattended_real_host_terminal_completion_certificate"
    ),
    terminal_completion_certificate_current: true,
    durable_transport_contract_artifact: artifactFrom(durable, "unattended_real_host_durable_transport_contract"),
    durable_transport_contract_current: true,
    transport_continuity_artifact: artifactFrom(continuity, "operator_service_transport_continuity"),
    transport_continuity_current: true,
    transport_contract_artifact: artifactFrom(contract, "operator_service_transport_contract"),
    transport_contract_current: true,
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

  const operationalPath = `.comath/release/goal3-ga-operational-readiness/GOAL3-GA-OPERATIONAL-READINESS-${id}/review.json`;
  const operational = writeJson(operationalPath, {
    schema_version: "comath.goal3_ga_operational_readiness_review.v1",
    project_id: projectId,
    operational_readiness_review_id: `GOAL3-GA-OPERATIONAL-READINESS-${id}`,
    ok: true,
    operational_readiness_status: "ready_for_ga_release_candidate_review",
    transport_closure_review_artifact: artifactFrom(closure, "operator_service_transport_closure_review"),
    transport_closure_review_current: true,
    maintained_transport_primitive_bound: true,
    service_transport_primitive: "node_http_agent_run_log_session_route",
    client_transport_primitive: "pi_fetch_get_text",
    durable_transport_provided: false,
    live_transport_open: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    ga_certification_gate_separate: true,
    ...(overrides.operational ?? {})
  });

  const prerequisiteId = `GOAL3-DURABLE-TRANSPORT-SIGNOFF-${id}`;
  const prerequisitePath = `.comath/release/goal3-durable-transport-release-signoff-prerequisite/${prerequisiteId}/prerequisite.json`;
  const prerequisite = writeJson(prerequisitePath, {
    schema_version: "comath.goal3_durable_transport_release_signoff_prerequisite.v1",
    durable_transport_signoff_prerequisite_id: prerequisiteId,
    project_id: projectId,
    ok: false,
    durable_transport_signoff_status: "blocked_durable_long_lived_transport_not_provided",
    blocker_reasons: ["durable_long_lived_transport_not_provided"],
    durable_transport_signoff_prerequisite_path: prerequisitePath,
    requested_review_mode: "open_formal_workbench_durable_transport_release_signoff_prerequisite",
    operational_readiness_review_artifact: artifactFrom(operational, "goal3_ga_operational_readiness_review"),
    operational_readiness_review_current: true,
    transport_closure_review_artifact: artifactFrom(closure, "operator_service_transport_closure_review"),
    transport_closure_review_current: true,
    terminal_completion_certificate_artifact: artifactFrom(
      certificate,
      "unattended_real_host_terminal_completion_certificate"
    ),
    terminal_completion_certificate_current: true,
    durable_transport_contract_artifact: artifactFrom(durable, "unattended_real_host_durable_transport_contract"),
    durable_transport_contract_current: true,
    transport_continuity_artifact: artifactFrom(continuity, "operator_service_transport_continuity"),
    transport_continuity_current: true,
    transport_contract_artifact: artifactFrom(contract, "operator_service_transport_contract"),
    transport_contract_current: true,
    terminal_unattended_completion_certified: true,
    completion_certificate_available: true,
    unattended_real_host_execution_completed: true,
    maintained_transport_primitive_bound: true,
    service_route_bound: true,
    client_fetch_contract_bound: true,
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
    ...(overrides.prerequisite ?? {})
  });

  return { prerequisite, operational, closure, certificate, durable, continuity, contract };
}

function writeExternalDurableTransportEvidence(id, overrides = {}) {
  const evidenceId = `GOAL3-EXTERNAL-DURABLE-TRANSPORT-EVIDENCE-${id}`;
  const path = `.comath/release/goal3-external-durable-transport-evidence/${evidenceId}/external-durable-transport-evidence.json`;
  const freshUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  return writeJson(path, {
    schema_version: "comath.goal3_external_durable_transport_evidence.v1",
    external_durable_transport_evidence_id: evidenceId,
    project_id: projectId,
    ok: true,
    evidence_status: "external_durable_transport_primitive_available",
    evidence_path: path,
    provider_id: "openssh-tmux-operator-transport",
    provider_kind: "maintained_external_operator_transport",
    transport_primitive: "external_reconnectable_operator_session",
    maintenance_source: "external_maintained_primitive",
    daemon_identity_sha256: "1".repeat(64),
    daemon_policy_sha256: "2".repeat(64),
    session_policy_sha256: "3".repeat(64),
    provider_attestation_sha256: "4".repeat(64),
    operator_session_id: `OPSESSION-${id}`,
    agent_run_id: `ARUN-${id}`,
    service_route: `/agent/run/ARUN-${id}/log-session`,
    service_transport_primitive: "node_http_agent_run_log_session_route",
    client_transport_primitive: "pi_fetch_get_text",
    fresh_until: freshUntil,
    freshness_window_seconds: 3600,
    reconnect_policy: "external_provider_reconnect_required",
    external_durable_transport_primitive_bound: true,
    durable_transport_provided: true,
    live_transport_open: true,
    co_math_transport_stack_built: false,
    co_math_websocket_stack_built: false,
    custom_transport_implementation: false,
    indefinite_stream_open: false,
    long_lived_websocket_provided: false,
    long_lived_sse_provided: false,
    pi_direct_write_allowed: false,
    direct_trusted_state_mutation: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    ...(overrides.evidence ?? {})
  });
}

function verificationInput(id, prerequisite, overrides = {}) {
  return {
    project_id: projectId,
    durable_transport_signoff_verification_id: `GOAL3-DURABLE-TRANSPORT-SIGNOFF-VERIFICATION-${id}`,
    actor:
      "goal3-task319 transport verification D:/project Authorization: Bearer plain-token proof_success durable transport provided GA certified",
    durable_transport_signoff_prerequisite_id: prerequisite.body.durable_transport_signoff_prerequisite_id,
    durable_transport_signoff_prerequisite_path: prerequisite.path,
    durable_transport_signoff_prerequisite_sha256: prerequisite.sha256,
    ...overrides
  };
}

try {
  assert.equal(
    typeof recordGoal3DurableTransportReleaseSignoffVerification,
    "function",
    "Task319 must export a service-owned durable transport release-signoff verification gate"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("goal3_durable_transport_release_signoff_verification_gate"),
    true,
    "Task319 capability ledger must advertise the durable transport release-signoff verification gate"
  );
  for (const [path, pattern] of [
    ["README.md", /Task319.*durable transport release-signoff verification/s],
    ["TODO.md", /Task319.*durable transport release-signoff verification/s],
    ["REVIEW.md", /Goal 3 Task 319/s],
    ["AGENTS.md", /Task319.*durable transport release-signoff verification/s],
    ["docs/architecture/ga-release-criteria.md", /Task319.*durable transport release-signoff verification/s],
    ["docs/architecture/threat-model.md", /Task319.*durable transport release-signoff verification/s],
    ["docs/architecture/acceptance-matrix.md", /Task319.*durable transport release-signoff verification/s]
  ]) {
    assert.match(repoFile(path), pattern, `${path} must document Task319 without proof or GA overclaims`);
  }
  assert.equal(
    repoFile("scripts/phase0-smoke.mjs").includes(
      "goal3-task319-durable-transport-release-signoff-verification.test.mjs"
    ),
    true,
    "phase0 smoke must discover the Task319 focused suite"
  );

  const blockedChain = writeTask317PrerequisiteChain("0319-BLOCKED");
  const blocked = recordGoal3DurableTransportReleaseSignoffVerification(
    projectRoot,
    verificationInput("0319-BLOCKED", blockedChain.prerequisite)
  );
  assert.equal(blocked.schema_version, "comath.goal3_durable_transport_release_signoff_verification.v1");
  assert.equal(blocked.ok, false);
  assert.equal(
    blocked.durable_transport_signoff_verification_status,
    "blocked_external_durable_transport_evidence_not_bound"
  );
  assert.deepEqual(blocked.blocker_reasons, ["external_durable_transport_evidence_not_bound"]);
  assert.equal(blocked.durable_transport_signoff_prerequisite_current, true);
  assert.equal(blocked.external_durable_transport_evidence_bound, false);
  assert.equal(blocked.external_durable_transport_primitive_bound, false);
  assert.equal(blocked.durable_transport_provided, false);
  assert.equal(blocked.live_transport_open, false);
  assert.equal(blocked.proof_authority, "none");
  assert.equal(blocked.can_promote_claim, false);
  assert.equal(blocked.can_certify_ga, false);
  assert.equal(JSON.stringify(blocked).includes(projectRoot), false);
  assert.doesNotMatch(JSON.stringify(blocked), secretTerms);
  assert.doesNotMatch(JSON.stringify(blocked), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(blocked), gaOverclaimTerms);
  assert.equal(existsSync(join(projectRoot, blocked.durable_transport_signoff_verification_path)), true);

  const verifiedChain = writeTask317PrerequisiteChain("0319-VERIFIED");
  const evidence = writeExternalDurableTransportEvidence("0319-VERIFIED");
  const verified = recordGoal3DurableTransportReleaseSignoffVerification(
    projectRoot,
    verificationInput("0319-VERIFIED", verifiedChain.prerequisite, {
      external_durable_transport_evidence_id: evidence.body.external_durable_transport_evidence_id,
      external_durable_transport_evidence_path: evidence.path,
      external_durable_transport_evidence_sha256: evidence.sha256
    })
  );
  assert.equal(verified.ok, true);
  assert.equal(
    verified.durable_transport_signoff_verification_status,
    "verified_external_durable_transport_primitive_bound"
  );
  assert.deepEqual(verified.blocker_reasons, []);
  assert.equal(verified.external_durable_transport_evidence_bound, true);
  assert.equal(verified.external_durable_transport_evidence_current, true);
  assert.equal(verified.external_durable_transport_primitive_bound, true);
  assert.equal(verified.provider_kind, "maintained_external_operator_transport");
  assert.equal(verified.transport_primitive, "external_reconnectable_operator_session");
  assert.equal(verified.service_route, "/agent/run/ARUN-0319-VERIFIED/log-session");
  assert.equal(verified.service_transport_primitive, "node_http_agent_run_log_session_route");
  assert.equal(verified.client_transport_primitive, "pi_fetch_get_text");
  assert.equal(verified.durable_transport_provided, true);
  assert.equal(verified.live_transport_open, true);
  assert.equal(verified.co_math_transport_stack_built, false);
  assert.equal(verified.co_math_websocket_stack_built, false);
  assert.equal(verified.custom_transport_implementation, false);
  assert.equal(verified.proof_authority, "none");
  assert.equal(verified.can_promote_claim, false);
  assert.equal(verified.can_certify_ga, false);
  assert.equal(verified.ga_release_signoff_ready, false);
  assert.equal(JSON.stringify(verified).includes(projectRoot), false);
  assert.doesNotMatch(JSON.stringify(verified), secretTerms);
  assert.doesNotMatch(JSON.stringify(verified), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(verified), gaOverclaimTerms);

  const staleChain = writeTask317PrerequisiteChain("0319-STALE");
  writeJson(staleChain.contract.path, {
    ...readJson(staleChain.contract.path),
    maintained_transport_primitive_bound: false
  });
  assert.throws(
    () =>
      recordGoal3DurableTransportReleaseSignoffVerification(
        projectRoot,
        verificationInput("0319-STALE", staleChain.prerequisite)
      ),
    { code: "GOAL3_DURABLE_TRANSPORT_RELEASE_SIGNOFF_VERIFICATION_STALE" },
    "Task319 must reject stale nested Task317 transport-chain bytes before writing verification material"
  );
  assert.equal(
    existsSync(
      join(
        projectRoot,
        ".comath/release/goal3-durable-transport-release-signoff-verification/GOAL3-DURABLE-TRANSPORT-SIGNOFF-VERIFICATION-0319-STALE/verification.json"
      )
    ),
    false,
    "Task319 must not write partial verification material on stale nested Task317 chains"
  );

  const poisonedPrerequisiteChain = writeTask317PrerequisiteChain("0319-POISON-PREREQ");
  const poisonedPrerequisite = writeJson(poisonedPrerequisiteChain.prerequisite.path, {
    ...poisonedPrerequisiteChain.prerequisite.body,
    durable_transport_provided: true
  });
  assert.throws(
    () =>
      recordGoal3DurableTransportReleaseSignoffVerification(
        projectRoot,
        verificationInput("0319-POISON-PREREQ", {
          ...poisonedPrerequisiteChain.prerequisite,
          sha256: poisonedPrerequisite.sha256,
          size_bytes: poisonedPrerequisite.size_bytes,
          body: poisonedPrerequisite.body
        })
      ),
    { code: "GOAL3_DURABLE_TRANSPORT_RELEASE_SIGNOFF_VERIFICATION_INVALID" },
    "Task319 must reject hash-current Task317 prerequisite material that claims durable transport itself"
  );

  const poisonedEvidenceChain = writeTask317PrerequisiteChain("0319-POISON-EVIDENCE");
  const poisonedEvidence = writeExternalDurableTransportEvidence("0319-POISON-EVIDENCE", {
    evidence: {
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true,
      custom_transport_implementation: true
    }
  });
  assert.throws(
    () =>
      recordGoal3DurableTransportReleaseSignoffVerification(
        projectRoot,
        verificationInput("0319-POISON-EVIDENCE", poisonedEvidenceChain.prerequisite, {
          external_durable_transport_evidence_id: poisonedEvidence.body.external_durable_transport_evidence_id,
          external_durable_transport_evidence_path: poisonedEvidence.path,
          external_durable_transport_evidence_sha256: poisonedEvidence.sha256
        })
      ),
    { code: "GOAL3_DURABLE_TRANSPORT_RELEASE_SIGNOFF_VERIFICATION_INVALID" },
    "Task319 must reject external durable transport evidence that carries proof/GA authority or custom stack claims"
  );

  const overclaimEvidenceChain = writeTask317PrerequisiteChain("0319-EVIDENCE-OVERCLAIM");
  const overclaimEvidence = writeExternalDurableTransportEvidence("0319-EVIDENCE-OVERCLAIM", {
    evidence: {
      ga_release_signoff_ready: true,
      result_can_be_used_as_proof: true
    }
  });
  assert.throws(
    () =>
      recordGoal3DurableTransportReleaseSignoffVerification(
        projectRoot,
        verificationInput("0319-EVIDENCE-OVERCLAIM", overclaimEvidenceChain.prerequisite, {
          external_durable_transport_evidence_id: overclaimEvidence.body.external_durable_transport_evidence_id,
          external_durable_transport_evidence_path: overclaimEvidence.path,
          external_durable_transport_evidence_sha256: overclaimEvidence.sha256
        })
      ),
    { code: "GOAL3_DURABLE_TRANSPORT_RELEASE_SIGNOFF_VERIFICATION_INVALID" },
    "Task319 must reject hash-current external durable transport evidence with extra GA signoff or proof-use overclaim fields"
  );

  const overclaimPrerequisiteChain = writeTask317PrerequisiteChain("0319-PREREQ-OVERCLAIM");
  const overclaimPrerequisite = writeJson(overclaimPrerequisiteChain.prerequisite.path, {
    ...overclaimPrerequisiteChain.prerequisite.body,
    final_release_signoff_ready: true
  });
  assert.throws(
    () =>
      recordGoal3DurableTransportReleaseSignoffVerification(
        projectRoot,
        verificationInput("0319-PREREQ-OVERCLAIM", {
          ...overclaimPrerequisiteChain.prerequisite,
          sha256: overclaimPrerequisite.sha256,
          size_bytes: overclaimPrerequisite.size_bytes,
          body: overclaimPrerequisite.body
        })
      ),
    { code: "GOAL3_DURABLE_TRANSPORT_RELEASE_SIGNOFF_VERIFICATION_INVALID" },
    "Task319 must reject hash-current Task317 prerequisite material with extra final signoff overclaim fields"
  );

  const staleFreshnessChain = writeTask317PrerequisiteChain("0319-FRESHNESS-BYPASS");
  const staleFreshnessEvidence = writeExternalDurableTransportEvidence("0319-FRESHNESS-BYPASS", {
    evidence: {
      fresh_until: "2035-01-01T00:00:00.000Z",
      freshness_window_seconds: 3600
    }
  });
  assert.throws(
    () =>
      recordGoal3DurableTransportReleaseSignoffVerification(
        projectRoot,
        verificationInput("0319-FRESHNESS-BYPASS", staleFreshnessChain.prerequisite, {
          external_durable_transport_evidence_id: staleFreshnessEvidence.body.external_durable_transport_evidence_id,
          external_durable_transport_evidence_path: staleFreshnessEvidence.path,
          external_durable_transport_evidence_sha256: staleFreshnessEvidence.sha256
        })
      ),
    { code: "GOAL3_DURABLE_TRANSPORT_RELEASE_SIGNOFF_VERIFICATION_INVALID" },
    "Task319 must reject external durable transport evidence whose fresh_until exceeds its declared freshness window"
  );

  const routeMismatchChain = writeTask317PrerequisiteChain("0319-ROUTE-MISMATCH");
  const routeMismatchEvidence = writeExternalDurableTransportEvidence("0319-ROUTE-MISMATCH", {
    evidence: {
      agent_run_id: "ARUN-DIFFERENT",
      service_route: "/agent/run/ARUN-DIFFERENT/log-session"
    }
  });
  assert.throws(
    () =>
      recordGoal3DurableTransportReleaseSignoffVerification(
        projectRoot,
        verificationInput("0319-ROUTE-MISMATCH", routeMismatchChain.prerequisite, {
          external_durable_transport_evidence_id: routeMismatchEvidence.body.external_durable_transport_evidence_id,
          external_durable_transport_evidence_path: routeMismatchEvidence.path,
          external_durable_transport_evidence_sha256: routeMismatchEvidence.sha256
        })
      ),
    { code: "GOAL3_DURABLE_TRANSPORT_RELEASE_SIGNOFF_VERIFICATION_INVALID" },
    "Task319 must reject external durable transport evidence bound to a different AgentRun log-session route than the Task317 transport closure"
  );

  const routeChain = writeTask317PrerequisiteChain("0319-ROUTE");
  const routeEvidence = writeExternalDurableTransportEvidence("0319-ROUTE");
  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/goal3/durable-transport-release-signoff-verification",
    body: {
      project_root: projectRoot,
      ...verificationInput("0319-ROUTE", routeChain.prerequisite, {
        external_durable_transport_evidence_id: routeEvidence.body.external_durable_transport_evidence_id,
        external_durable_transport_evidence_path: routeEvidence.path,
        external_durable_transport_evidence_sha256: routeEvidence.sha256
      })
    }
  });
  assert.equal(routeResponse.status, 200, JSON.stringify(routeResponse.body));
  assert.equal(routeResponse.body.durable_transport_release_signoff_verification.ok, true);
  assert.equal(
    routeResponse.body.durable_transport_release_signoff_verification.durable_transport_signoff_verification_status,
    "verified_external_durable_transport_primitive_bound"
  );
  assert.equal(routeResponse.body.durable_transport_release_signoff_verification.proof_authority, "none");
  assert.equal(routeResponse.body.durable_transport_release_signoff_verification.can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), secretTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), gaOverclaimTerms);

  const routeOverclaimChain = writeTask317PrerequisiteChain("0319-ROUTE-OVERCLAIM");
  const routeOverclaimResponse = await server.inject({
    method: "POST",
    path: "/release/goal3/durable-transport-release-signoff-verification",
    body: {
      project_root: projectRoot,
      ...verificationInput("0319-ROUTE-OVERCLAIM", routeOverclaimChain.prerequisite),
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true,
      custom_transport_implementation: true
    }
  });
  assert.equal(routeOverclaimResponse.status, 400, JSON.stringify(routeOverclaimResponse.body));
  assert.equal(
    existsSync(
      join(
        projectRoot,
        ".comath/release/goal3-durable-transport-release-signoff-verification/GOAL3-DURABLE-TRANSPORT-SIGNOFF-VERIFICATION-0319-ROUTE-OVERCLAIM/verification.json"
      )
    ),
    false,
    "Task319 route must reject caller-supplied proof/GA/custom-transport overclaims before writing"
  );

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (entry) =>
        entry.event_type === "release.goal3_durable_transport_release_signoff_verification_recorded" &&
        entry.payload.durable_transport_signoff_verification_id ===
          "GOAL3-DURABLE-TRANSPORT-SIGNOFF-VERIFICATION-0319-ROUTE" &&
        entry.payload.external_durable_transport_evidence_bound === true &&
        entry.payload.durable_transport_provided === true &&
        entry.payload.can_certify_ga === false
    ),
    true,
    "Task319 verification must emit non-proof-authority durable transport provenance"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task319 durable transport release-signoff verification tests passed.");
