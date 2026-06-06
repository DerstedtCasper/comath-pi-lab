import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createComathServer,
  executeProfileAgentRun,
  getComathdStatus,
  initProject,
  orchestratePiCodexLifecycleAutomaticRealPiExecution,
  readAuditEvents,
  recordPiCodexLifecycleOperatorServiceTransportContinuity,
  reviewPiCodexLifecycleUnattendedRealHostHandoff,
  spawnWorkstream
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task239-unattended-handoff-review-"));
const previousAllowedPrograms = process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS;
const secretTerms = /COMATH_CODEX_API_KEY|OPENAI_API_KEY|Authorization:\s*Bearer|api_key|token=|plain-token|sk-/i;
const privilegedPublicTerms =
  /clean_replay_passed|completed_formal_proof|formally_checked|proven|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|kernel_checked|proof_success/i;
const transportOverclaimTerms =
  /long[- ]lived\s+(?:websocket|sse)|indefinite\s+sse|terminal transport recovered live|durable transport provided/i;
const unattendedOverclaimTerms =
  /production unattended executor|operator-free execution completed|unattended real-host execution completed|operator confirmation bypassed|service-owned evidence created|handoff can execute|unattended execution authorized/i;

function sha256Text(text) {
  return createHash("sha256").update(text).digest("hex");
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeRuntimeProbeFixture() {
  const dir = join(projectRoot, ".tmp", "task239-fixtures");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "real-pi-runtime-probe-fixture.mjs");
  writeFileSync(
    path,
    [
      "const step = process.argv[2] ?? 'unknown';",
      "if (!['install', 'runtime_registration', 'host_confirmation'].includes(step)) process.exit(2);",
      "process.stdout.write(JSON.stringify({ step, imported: true, registered: true, host_confirmation: true, token: 'plain-token' }));",
      ""
    ].join("\n"),
    "utf8"
  );
  return path;
}

function writeAgentRunAdapterFixture() {
  const dir = join(projectRoot, ".tmp", "task239-fixtures");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "unattended-handoff-review-agent-run-adapter.mjs");
  writeFileSync(
    path,
    [
      "process.stdout.write('task239 stdout before unattended handoff review\\n');",
      "process.stderr.write('task239 stderr before unattended handoff review\\n');",
      "process.stdout.write('# Agent Report\\n\\n## Input Context\\nTask239 service-owned handoff review fixture.\\n\\n## Actions Taken\\nEmitted bounded service-owned logs.\\n\\n## Claims Proposed\\nproof_authority: none\\n\\n## Evidence Produced\\nRuntime logs only.\\n\\n## Graph Patch\\nNo trusted mutation.\\n\\n## Blockers\\nNone.\\n\\n## Failed Routes\\nNone.\\n\\n## Self-Review\\nNo unattended execution, no durable transport, no Lean authority.\\n');",
      ""
    ].join("\n"),
    "utf8"
  );
  return path;
}

async function createServiceOwnedAgentRunRoute(suffix) {
  const campaignDigits = suffix.replace(/\D/g, "").padEnd(4, "0");
  const workstream = spawnWorkstream(projectRoot, {
    project_id: projectId,
    kind: "proof_route",
    goal: `Task239 service-owned unattended handoff review fixture ${suffix}.`,
    created_by: "goal3-task239"
  });
  const agentRun = await executeProfileAgentRun(projectRoot, {
    project_id: projectId,
    campaign_id: `CAM-${campaignDigits}`,
    workstream_id: workstream.workstream_id,
    profile_id: "reviewer",
    program: process.execPath,
    adapter_args: [writeAgentRunAdapterFixture()],
    goal: `Run Task239 unattended handoff review fixture ${suffix}.`,
    context_path: `.comath/workstreams/${workstream.workstream_id}/spec.yaml`,
    actor: `goal3-task239-agent-run-${suffix}`
  });
  return { agentRun, route: `/agent/run/${agentRun.run.id}/log-session` };
}

function orchestrationInput(ids, route, runtimeFixture) {
  return {
    project_id: projectId,
    orchestration_id: ids.orchestrationId,
    actor: `goal3-task239-orchestrator ${projectRoot}\\secret.txt Authorization: Bearer plain-token proof_success durable transport provided long-lived websocket`,
    runtime_probe: {
      probe_id: ids.probeId,
      pi_host_label: `pi-host-task239-${ids.suffix}`,
      session_kind: "real_pi_host_automated_install",
      timeout_ms: 5000,
      commands: {
        install: { program: process.execPath, args: [runtimeFixture, "install"] },
        runtime_registration: { program: process.execPath, args: [runtimeFixture, "runtime_registration"] },
        host_confirmation: { program: process.execPath, args: [runtimeFixture, "host_confirmation"] }
      }
    },
    operator_session: {
      session_id: ids.sessionId,
      session_status: "recoverable_operator_session",
      operator_cursor: "stdout:0/stderr:0",
      completed_steps: ["real_pi_install_runtime_probe"],
      last_result_summary: {
        summary: "automatic checkpoint chain ready for service-owned handoff review",
        injected_claim: "formal_replay_passed durable transport provided token=plain-token"
      }
    },
    transport_recovery: {
      transport_recovery_id: ids.recoveryId,
      transport_kind: "bounded_sse_snapshot",
      observed_route: `${route} Authorization: Bearer plain-token durable transport provided`,
      requested_cursor: { operator_event_cursor: "event:7", stdout_cursor: "stdout:0", stderr_cursor: "stderr:0" },
      client_epoch: 7,
      last_seen_event_id: "evt-7",
      reconnect_reason: "automatic real-Pi lifecycle checkpoint recovery before handoff review"
    },
    transport_lease: {
      transport_lease_id: ids.leaseId,
      transport_kind: "bounded_live_sse_lease",
      lease_route: `${route} token=plain-token long-lived SSE`,
      requested_cursor: { operator_event_cursor: "event:8", stdout_cursor: "stdout:0", stderr_cursor: "stderr:0" },
      client_epoch: 8,
      heartbeat_interval_ms: 10_000,
      lease_ttl_ms: 60_000,
      last_seen_event_id: "evt-8",
      open_reason: "bounded lease before service-owned handoff review"
    },
    transport_heartbeat: {
      transport_heartbeat_id: ids.heartbeatId,
      requested_cursor: { operator_event_cursor: "event:9", stdout_cursor: "stdout:0", stderr_cursor: "stderr:0" },
      client_epoch: 9,
      last_seen_event_id: "evt-9",
      heartbeat_reason: "bounded heartbeat before service-owned handoff review"
    },
    guided_execution: {
      execution_id: ids.executionId,
      observed_routes: [
        "/cm:release lifecycle-operator-transport-heartbeat",
        "/cm:release lifecycle-guided-real-pi-execution"
      ],
      operator_command_summary: "automatic orchestrator recorded service-owned real-Pi checkpoint chain",
      final_operator_cursor: { operator_event_cursor: "event:10", stdout_cursor: "stdout:512", stderr_cursor: "stderr:0" },
      execution_outcome: "operator_guided_run_observed",
      next_recommended_route: "/release/pi-codex-lifecycle/terminal-execution-review"
    },
    terminal_review: {
      review_id: ids.reviewId
    },
    transport_contract: {
      transport_contract_id: ids.contractId,
      max_bytes: 4096,
      max_events: 2,
      retry_ms: 750,
      service_transport_primitive: "node_http_agent_run_log_session_route",
      client_transport_primitive: "pi_fetch_get_text"
    }
  };
}

function publicAlias(id, filename) {
  return `service-owned-pi-lifecycle/${id}/${filename}`;
}

function preparedReviewInput(ids, orchestration, continuity, overrides = {}) {
  return {
    project_id: projectId,
    handoff_review_id: ids.handoffReviewId,
    actor: `goal3-task239-review ${projectRoot}\\secret.txt Authorization: Bearer plain-token proof_success durable transport provided long-lived websocket handoff can execute`,
    real_pi_runtime_probe_id: ids.probeId,
    session_id: ids.sessionId,
    transport_recovery_id: ids.recoveryId,
    transport_lease_id: ids.leaseId,
    transport_heartbeat_id: ids.heartbeatId,
    execution_id: ids.executionId,
    terminal_review_id: ids.reviewId,
    transport_contract_id: ids.contractId,
    automatic_orchestration_id: ids.orchestrationId,
    transport_continuity_id: ids.continuityId,
    runtime_probe_path: publicAlias(ids.probeId, "real-pi-runtime-probe.json"),
    runtime_probe_sha256: orchestration.runtime_registration_artifact.sha256,
    operator_session_path: publicAlias(ids.sessionId, "operator-session-manifest.json"),
    operator_session_sha256: orchestration.session_manifest_artifact.sha256,
    transport_recovery_path: publicAlias(ids.recoveryId, "operator-transport-recovery.json"),
    transport_recovery_sha256: orchestration.transport_recovery_artifact.sha256,
    transport_lease_path: publicAlias(ids.leaseId, "operator-transport-lease.json"),
    transport_lease_sha256: orchestration.transport_lease_artifact.sha256,
    transport_heartbeat_path: publicAlias(ids.heartbeatId, "operator-transport-heartbeat.json"),
    transport_heartbeat_sha256: orchestration.transport_heartbeat_artifact.sha256,
    guided_execution_path: publicAlias(ids.executionId, "guided-real-pi-execution.json"),
    guided_execution_sha256: orchestration.guided_execution_artifact.sha256,
    terminal_review_path: publicAlias(ids.reviewId, "terminal-execution-review.json"),
    terminal_review_sha256: orchestration.terminal_review_artifact.sha256,
    transport_contract_path: publicAlias(ids.contractId, "operator-service-transport-contract.json"),
    transport_contract_sha256: orchestration.transport_contract_artifact.sha256,
    automatic_orchestration_path: publicAlias(ids.orchestrationId, "automatic-real-pi-execution.json"),
    automatic_orchestration_sha256: orchestration.orchestration_artifact.sha256,
    transport_continuity_path: publicAlias(ids.continuityId, "operator-service-transport-continuity.json"),
    transport_continuity_sha256: continuity.continuity_artifact.sha256,
    operator_approved: true,
    handoff_can_execute: true,
    unattended_execution_authorized: true,
    durable_transport_provided: true,
    proof_authority: "lean_kernel_clean_replay",
    can_certify_ga: true,
    ...overrides
  };
}

const init = initProject({ name: "Goal3 Task239 Service Owned Unattended Handoff Review", root_path: projectRoot });
const projectId = init.project.project_id;

try {
  process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS = JSON.stringify([process.execPath]);
  assert.equal(
    typeof reviewPiCodexLifecycleUnattendedRealHostHandoff,
    "function",
    "Task239 must export a service-owned unattended real-host handoff review gate"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("pi_codex_unattended_real_host_handoff_review"),
    true,
    "Task239 capability ledger must advertise service-owned unattended handoff review evidence"
  );

  const runtimeFixture = writeRuntimeProbeFixture();
  const { agentRun, route } = await createServiceOwnedAgentRunRoute("0239");
  const ids = {
    suffix: "0239",
    orchestrationId: "LIFE-AUTOMATIC-REAL-PI-0239",
    probeId: "LIFE-PI-RUNTIME-0239",
    sessionId: "LIFE-OP-SESSION-0239",
    recoveryId: "LIFE-TRANSPORT-0239",
    leaseId: "LIFE-TRANSPORT-LEASE-0239",
    heartbeatId: "LIFE-TRANSPORT-HEARTBEAT-0239",
    executionId: "LIFE-GUIDED-EXEC-0239",
    reviewId: "LIFE-TERMINAL-REVIEW-0239",
    contractId: "LIFE-TRANSPORT-CONTRACT-0239",
    continuityId: "LIFE-TRANSPORT-CONTINUITY-0239",
    handoffReviewId: "LIFE-HANDOFF-REVIEW-0239"
  };
  const orchestration = orchestratePiCodexLifecycleAutomaticRealPiExecution(
    projectRoot,
    orchestrationInput(ids, route, runtimeFixture)
  );
  const continuity = recordPiCodexLifecycleOperatorServiceTransportContinuity(projectRoot, {
    project_id: projectId,
    continuity_id: ids.continuityId,
    actor: "goal3-task239-continuity proof_success durable transport provided",
    transport_contract_id: ids.contractId,
    transport_contract_path: orchestration.transport_contract_path,
    transport_contract_sha256: orchestration.transport_contract_artifact.sha256,
    max_bytes: 2048,
    max_events: 2,
    retry_ms: 600,
    client_transport_primitive: "pi_fetch_get_text",
    service_transport_primitive: "node_http_agent_run_log_session_route"
  });

  const handoffReview = reviewPiCodexLifecycleUnattendedRealHostHandoff(
    projectRoot,
    preparedReviewInput(ids, orchestration, continuity)
  );
  assert.equal(handoffReview.schema_version, "comath.pi_codex_unattended_real_host_handoff_review.v1");
  assert.equal(handoffReview.review_status, "prepared_unattended_real_host_handoff_review_recorded");
  assert.equal(handoffReview.project_id, projectId);
  assert.equal(handoffReview.handoff_review_id, ids.handoffReviewId);
  assert.equal(handoffReview.automatic_orchestration_id, ids.orchestrationId);
  assert.equal(handoffReview.transport_continuity_id, ids.continuityId);
  assert.equal(handoffReview.prepared_checkpoint_hashes_current, true);
  assert.equal(handoffReview.service_owned_checkpoint_chain_reviewed, true);
  assert.equal(handoffReview.review_manifest_persisted, true);
  assert.equal(handoffReview.operator_approved, false);
  assert.equal(handoffReview.handoff_can_execute, false);
  assert.equal(handoffReview.unattended_execution_authorized, false);
  assert.equal(handoffReview.unattended_real_host_execution_completed, false);
  assert.equal(handoffReview.durable_transport_provided, false);
  assert.equal(handoffReview.live_transport_open, false);
  assert.equal(handoffReview.long_lived_websocket_provided, false);
  assert.equal(handoffReview.long_lived_sse_provided, false);
  assert.equal(handoffReview.pi_direct_write_allowed, false);
  assert.equal(handoffReview.direct_trusted_state_mutation, false);
  assert.equal(handoffReview.proof_authority, "none");
  assert.equal(handoffReview.can_promote_claim, false);
  assert.equal(handoffReview.can_certify_ga, false);
  assert.equal(handoffReview.prepared_checkpoints.length, 10);
  assert.deepEqual(
    handoffReview.prepared_checkpoints.map((checkpoint) => checkpoint.checkpoint_id),
    [
      "runtime_probe",
      "operator_session",
      "transport_recovery",
      "transport_lease",
      "transport_heartbeat",
      "guided_execution",
      "terminal_review",
      "transport_contract",
      "automatic_orchestration",
      "transport_continuity"
    ]
  );
  assert.equal(
    handoffReview.prepared_checkpoints.every(
      (checkpoint) =>
        checkpoint.public_path.startsWith("service-owned-pi-lifecycle/") &&
        checkpoint.canonical_path.startsWith(".comath/release/pi-codex-lifecycle/") &&
        checkpoint.current === true &&
        /^[a-f0-9]{64}$/.test(checkpoint.sha256)
    ),
    true
  );
  assert.equal(JSON.stringify(handoffReview).includes(projectRoot), false, "handoff review must not expose host paths");
  assert.doesNotMatch(JSON.stringify(handoffReview), secretTerms);
  assert.doesNotMatch(JSON.stringify(handoffReview), privilegedPublicTerms);
  assert.doesNotMatch(JSON.stringify(handoffReview), transportOverclaimTerms);
  assert.doesNotMatch(JSON.stringify(handoffReview), unattendedOverclaimTerms);

  const persistedPath = join(projectRoot, handoffReview.handoff_review_path);
  assert.equal(existsSync(persistedPath), true, "handoff review must persist append-only review evidence");
  const persisted = readJson(persistedPath);
  assert.equal(persisted.handoff_review_artifact, undefined, "persisted review must not self-hash recursively");
  assert.equal(persisted.proof_authority, "none");
  assert.equal(persisted.can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(persisted), secretTerms);
  assert.doesNotMatch(JSON.stringify(persisted), privilegedPublicTerms);
  assert.doesNotMatch(JSON.stringify(persisted), transportOverclaimTerms);
  assert.doesNotMatch(JSON.stringify(persisted), unattendedOverclaimTerms);

  assert.throws(
    () => reviewPiCodexLifecycleUnattendedRealHostHandoff(projectRoot, preparedReviewInput(ids, orchestration, continuity)),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_HANDOFF_REVIEW_ALREADY_EXISTS" },
    "handoff review manifests must be append-only by review id"
  );

  assert.throws(
    () =>
      reviewPiCodexLifecycleUnattendedRealHostHandoff(
        projectRoot,
        preparedReviewInput(ids, orchestration, continuity, {
          handoff_review_id: "LIFE-HANDOFF-REVIEW-0239-STALE",
          transport_continuity_sha256: "a".repeat(64)
        })
      ),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_HANDOFF_REVIEW_CHECKPOINT_STALE" },
    "handoff review must reject stale caller-supplied prepared checkpoint hashes"
  );
  assert.equal(
    existsSync(
      join(
        projectRoot,
        ".comath/release/pi-codex-lifecycle/LIFE-HANDOFF-REVIEW-0239-STALE/unattended-real-host-handoff-review.json"
      )
    ),
    false,
    "stale prepared checkpoint hashes must not leave partial handoff review artifacts"
  );

  assert.throws(
    () =>
      reviewPiCodexLifecycleUnattendedRealHostHandoff(
        projectRoot,
        preparedReviewInput(ids, orchestration, continuity, {
          handoff_review_id: "LIFE-HANDOFF-REVIEW-0239-ALIAS",
          transport_continuity_path: continuity.continuity_path
        })
      ),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_HANDOFF_REVIEW_CHECKPOINT_ALIAS_INVALID" },
    "handoff review must not trust caller-provided canonical .comath paths or aliases as source of truth"
  );

  const continuityPath = join(projectRoot, continuity.continuity_path);
  const continuityBeforePoison = readFileSync(continuityPath, "utf8");
  const poisonedContinuity = readJson(continuityPath);
  poisonedContinuity.transport_contract_artifact.sha256 = "e".repeat(64);
  writeJson(continuityPath, poisonedContinuity);
  assert.throws(
    () =>
      reviewPiCodexLifecycleUnattendedRealHostHandoff(
        projectRoot,
        preparedReviewInput(ids, orchestration, continuity, {
          handoff_review_id: "LIFE-HANDOFF-REVIEW-0239-CHAIN-POISON"
        })
      ),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_HANDOFF_REVIEW_CHECKPOINT_STALE" },
    "handoff review must re-read canonical artifacts and reject post-planner chain tampering"
  );
  writeFileSync(continuityPath, continuityBeforePoison, "utf8");

  const resumePoisonedContinuity = readJson(continuityPath);
  resumePoisonedContinuity.previous_log_session_body_sha256 = "f".repeat(64);
  writeJson(continuityPath, resumePoisonedContinuity);
  const resumePoisonedContinuitySha256 = sha256Text(readFileSync(continuityPath, "utf8"));
  assert.throws(
    () =>
      reviewPiCodexLifecycleUnattendedRealHostHandoff(
        projectRoot,
        preparedReviewInput(ids, orchestration, continuity, {
          handoff_review_id: "LIFE-HANDOFF-REVIEW-0239-RESUME-POISON",
          transport_continuity_sha256: resumePoisonedContinuitySha256
        })
      ),
    { code: "PI_CODEX_UNATTENDED_REAL_HOST_HANDOFF_REVIEW_CHECKPOINT_STALE" },
    "handoff review must reject continuity resume checkpoints that are no longer bound to the transport contract cursor/hash"
  );
  writeFileSync(continuityPath, continuityBeforePoison, "utf8");

  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/pi-codex-lifecycle/unattended-real-host-handoff-review",
    body: preparedReviewInput(ids, orchestration, continuity, {
      project_root: projectRoot,
      handoff_review_id: "LIFE-HANDOFF-REVIEW-0239-ROUTE",
      actor: "goal3-task239-route token=plain-token proof_success durable transport provided long-lived SSE",
      operator_approved: true,
      handoff_can_execute: true,
      unattended_execution_authorized: true,
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true
    })
  });
  assert.equal(routeResponse.status, 200, JSON.stringify(routeResponse.body));
  assert.equal(routeResponse.body.handoff_review.proof_authority, "none");
  assert.equal(routeResponse.body.handoff_review.operator_approved, false);
  assert.equal(routeResponse.body.handoff_review.handoff_can_execute, false);
  assert.equal(routeResponse.body.handoff_review.unattended_execution_authorized, false);
  assert.equal(routeResponse.body.handoff_review.can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), secretTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), privilegedPublicTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), transportOverclaimTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), unattendedOverclaimTerms);

  const events = readAuditEvents(projectRoot);
  const reviewAuditEvent = events.find(
    (event) =>
      event.event_type === "release.pi_codex_unattended_real_host_handoff_reviewed" &&
      event.payload.handoff_review_id === ids.handoffReviewId
  );
  assert.ok(reviewAuditEvent, "handoff review audit event must be appended");
  assert.equal(reviewAuditEvent.payload.automatic_orchestration_id, ids.orchestrationId);
  assert.equal(reviewAuditEvent.payload.transport_continuity_id, ids.continuityId);
  assert.equal(reviewAuditEvent.payload.handoff_review_artifact_sha256, handoffReview.handoff_review_artifact.sha256);
  assert.equal(reviewAuditEvent.payload.handoff_review_artifact_size_bytes, handoffReview.handoff_review_artifact.size_bytes);
  assert.deepEqual(reviewAuditEvent.payload.prepared_checkpoint_order, handoffReview.prepared_checkpoint_order);
  assert.deepEqual(
    reviewAuditEvent.payload.prepared_checkpoint_hashes,
    handoffReview.prepared_checkpoints.map((checkpoint) => ({
      checkpoint_id: checkpoint.checkpoint_id,
      canonical_path: checkpoint.canonical_path,
      sha256: checkpoint.sha256,
      size_bytes: checkpoint.size_bytes
    }))
  );
  assert.equal(reviewAuditEvent.payload.prepared_checkpoint_hashes_current, true);
  assert.equal(reviewAuditEvent.payload.service_owned_checkpoint_chain_reviewed, true);
  assert.equal(reviewAuditEvent.payload.operator_approved, false);
  assert.equal(reviewAuditEvent.payload.handoff_can_execute, false);
  assert.equal(reviewAuditEvent.payload.proof_authority, "none");
  assert.equal(reviewAuditEvent.payload.can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(events), secretTerms);
  assert.doesNotMatch(JSON.stringify(events), privilegedPublicTerms);
  assert.doesNotMatch(JSON.stringify(events), transportOverclaimTerms);
  assert.doesNotMatch(JSON.stringify(events), unattendedOverclaimTerms);
} finally {
  if (previousAllowedPrograms === undefined) {
    delete process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS;
  } else {
    process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS = previousAllowedPrograms;
  }
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task239 service-owned unattended real-host handoff review tests passed.");
