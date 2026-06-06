import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createComathServer,
  executeProfileAgentRun,
  getComathdStatus,
  initProject,
  orchestratePiCodexLifecycleAutomaticRealPiExecution,
  readAuditEvents,
  spawnWorkstream
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task227-automatic-real-pi-"));
const previousAllowedPrograms = process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS;
const secretTerms = /COMATH_CODEX_API_KEY|OPENAI_API_KEY|Authorization:\s*Bearer|api_key|token=|plain-token|sk-/i;
const privilegedPublicTerms =
  /clean_replay_passed|completed_formal_proof|formally_checked|proven|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|kernel_checked|proof_success/i;
const transportOverclaimTerms =
  /long[- ]lived\s+(?:websocket|sse)|indefinite\s+sse|terminal transport recovered live|durable transport provided/i;

function sha256Text(text) {
  return createHash("sha256").update(text).digest("hex");
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeRuntimeProbeFixture() {
  const dir = join(projectRoot, ".tmp", "task227-fixtures");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "real-pi-runtime-probe-fixture.mjs");
  writeFileSync(
    path,
    [
      "const step = process.argv[2] ?? 'unknown';",
      "if (!['install', 'runtime_registration', 'host_confirmation'].includes(step)) process.exit(2);",
      "process.stdout.write(JSON.stringify({ step, imported: true, registered: true, host_confirmation: true }));",
      ""
    ].join("\n"),
    "utf8"
  );
  return path;
}

function writeAgentRunAdapterFixture() {
  const dir = join(projectRoot, ".tmp", "task227-fixtures");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "automatic-real-pi-agent-run-adapter.mjs");
  writeFileSync(
    path,
    [
      "process.stdout.write('task227 automatic real-Pi stdout before lifecycle orchestration\\n');",
      "process.stderr.write('task227 automatic real-Pi stderr before lifecycle orchestration\\n');",
      "process.stdout.write('# Agent Report\\n\\n## Input Context\\nTask227 automatic lifecycle orchestration fixture.\\n\\n## Actions Taken\\nEmitted bounded service-owned logs.\\n\\n## Claims Proposed\\nproof_authority: none\\n\\n## Evidence Produced\\nRuntime logs only.\\n\\n## Graph Patch\\nNo trusted mutation.\\n\\n## Blockers\\nNone.\\n\\n## Failed Routes\\nNone.\\n\\n## Self-Review\\nNo durable transport.\\n\\n## Next Actions\\nOrchestrate the real-Pi lifecycle checkpoint chain.\\n');",
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
    goal: `Task227 automatic real-Pi lifecycle orchestration fixture ${suffix}.`,
    created_by: "goal3-task227"
  });
  const agentRun = await executeProfileAgentRun(projectRoot, {
    project_id: projectId,
    campaign_id: `CAM-${campaignDigits}`,
    workstream_id: workstream.workstream_id,
    profile_id: "reviewer",
    program: process.execPath,
    adapter_args: [writeAgentRunAdapterFixture()],
    goal: `Run Task227 automatic real-Pi lifecycle orchestration fixture ${suffix}.`,
    context_path: `.comath/workstreams/${workstream.workstream_id}/spec.yaml`,
    actor: `goal3-task227-agent-run-${suffix}`
  });
  return { agentRun, route: `/agent/run/${agentRun.run.id}/log-session` };
}

function orchestrationInput(ids, route, runtimeFixture) {
  return {
    project_id: projectId,
    orchestration_id: ids.orchestrationId,
    actor: `goal3-task227-orchestrator ${projectRoot}\\secret.txt Authorization: Bearer plain-token proof_success durable transport provided long-lived websocket`,
    runtime_probe: {
      probe_id: ids.probeId,
      pi_host_label: `pi-host-task227-${ids.suffix}`,
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
        summary: "automatic real-Pi checkpoint chain should remain non-authoritative",
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
      reconnect_reason: "automatic real-Pi lifecycle checkpoint recovery"
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
      open_reason: "bounded lease during automatic real-Pi checkpoint orchestration"
    },
    transport_heartbeat: {
      transport_heartbeat_id: ids.heartbeatId,
      requested_cursor: { operator_event_cursor: "event:9", stdout_cursor: "stdout:0", stderr_cursor: "stderr:0" },
      client_epoch: 9,
      last_seen_event_id: "evt-9",
      heartbeat_reason: "bounded heartbeat during automatic real-Pi checkpoint orchestration"
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

const init = initProject({ name: "Goal3 Task227 Automatic Real Pi Execution Orchestration", root_path: projectRoot });
const projectId = init.project.project_id;

try {
  process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS = JSON.stringify([process.execPath]);
  assert.equal(
    typeof orchestratePiCodexLifecycleAutomaticRealPiExecution,
    "function",
    "Task227 must export a service-owned automatic real-Pi lifecycle orchestration entrypoint"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("pi_codex_lifecycle_automatic_real_pi_execution_orchestration"),
    true,
    "Task227 capability ledger must advertise automatic real-Pi checkpoint-chain orchestration"
  );

  const runtimeFixture = writeRuntimeProbeFixture();
  const { route } = await createServiceOwnedAgentRunRoute("0227");
  const ids = {
    suffix: "0227",
    orchestrationId: "LIFE-AUTO-REAL-PI-0227",
    probeId: "LIFE-PI-RUNTIME-0227",
    sessionId: "LIFE-OP-SESSION-0227",
    recoveryId: "LIFE-TRANSPORT-0227",
    leaseId: "LIFE-TRANSPORT-LEASE-0227",
    heartbeatId: "LIFE-TRANSPORT-HEARTBEAT-0227",
    executionId: "LIFE-GUIDED-EXEC-0227",
    reviewId: "LIFE-TERMINAL-REVIEW-0227",
    contractId: "LIFE-TRANSPORT-CONTRACT-0227"
  };

  const orchestration = orchestratePiCodexLifecycleAutomaticRealPiExecution(
    projectRoot,
    orchestrationInput(ids, route, runtimeFixture)
  );

  assert.equal(orchestration.schema_version, "comath.pi_codex_lifecycle_automatic_real_pi_execution.v1");
  assert.equal(orchestration.orchestration_status, "automatic_real_pi_checkpoint_chain_recorded");
  assert.equal(orchestration.project_id, projectId);
  assert.equal(orchestration.orchestration_id, ids.orchestrationId);
  assert.deepEqual(orchestration.checkpoint_order, [
    "real_pi_runtime_probe",
    "operator_session_manifest",
    "operator_transport_recovery_checkpoint",
    "bounded_operator_transport_lease",
    "operator_transport_heartbeat_rebind",
    "guided_real_pi_execution",
    "terminal_execution_review",
    "operator_service_transport_contract"
  ]);
  assert.equal(orchestration.real_pi_runtime_probe_id, ids.probeId);
  assert.equal(orchestration.session_id, ids.sessionId);
  assert.equal(orchestration.transport_recovery_id, ids.recoveryId);
  assert.equal(orchestration.transport_lease_id, ids.leaseId);
  assert.equal(orchestration.transport_heartbeat_id, ids.heartbeatId);
  assert.equal(orchestration.execution_id, ids.executionId);
  assert.equal(orchestration.terminal_review_id, ids.reviewId);
  assert.equal(orchestration.transport_contract_id, ids.contractId);
  assert.equal(orchestration.service_route, route);
  assert.equal(orchestration.service_transport_primitive, "node_http_agent_run_log_session_route");
  assert.equal(orchestration.client_transport_primitive, "pi_fetch_get_text");
  assert.equal(orchestration.runtime_probe_bound, true);
  assert.equal(orchestration.operator_session_bound, true);
  assert.equal(orchestration.transport_recovery_bound, true);
  assert.equal(orchestration.transport_lease_bound, true);
  assert.equal(orchestration.transport_heartbeat_bound, true);
  assert.equal(orchestration.guided_execution_bound, true);
  assert.equal(orchestration.terminal_review_bound, true);
  assert.equal(orchestration.transport_contract_bound, true);
  assert.equal(orchestration.service_owned_checkpoint_chain_completed, true);
  assert.equal(orchestration.automatic_real_pi_orchestration_completed, true);
  assert.equal(orchestration.durable_transport_provided, false);
  assert.equal(orchestration.live_transport_open, false);
  assert.equal(orchestration.indefinite_stream_open, false);
  assert.equal(orchestration.long_lived_websocket_provided, false);
  assert.equal(orchestration.long_lived_sse_provided, false);
  assert.equal(orchestration.pi_direct_write_allowed, false);
  assert.equal(orchestration.direct_trusted_state_mutation, false);
  assert.equal(orchestration.proof_authority, "none");
  assert.equal(orchestration.can_promote_claim, false);
  assert.equal(orchestration.can_certify_ga, false);
  assert.equal(orchestration.orchestration_artifact.path, orchestration.orchestration_path);
  assert.equal(existsSync(join(projectRoot, orchestration.orchestration_path)), true);
  assert.equal(
    orchestration.terminal_review_artifact.sha256,
    sha256Text(readFileSync(join(projectRoot, orchestration.terminal_review_path), "utf8"))
  );
  assert.equal(
    orchestration.transport_contract_artifact.sha256,
    sha256Text(readFileSync(join(projectRoot, orchestration.transport_contract_path), "utf8"))
  );
  assert.doesNotMatch(JSON.stringify(orchestration), secretTerms);
  assert.doesNotMatch(JSON.stringify(orchestration), privilegedPublicTerms);
  assert.doesNotMatch(JSON.stringify(orchestration), transportOverclaimTerms);
  assert.equal(JSON.stringify(orchestration).includes(projectRoot), false, "orchestration result must not expose host paths");

  const persisted = readJson(join(projectRoot, orchestration.orchestration_path));
  assert.equal(persisted.orchestration_artifact, undefined, "persisted orchestration must not self-hash recursively");
  assert.equal(persisted.proof_authority, "none");
  assert.equal(persisted.can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(persisted), secretTerms);
  assert.doesNotMatch(JSON.stringify(persisted), privilegedPublicTerms);
  assert.doesNotMatch(JSON.stringify(persisted), transportOverclaimTerms);

  const missingIds = {
    suffix: "0227-MISSING",
    orchestrationId: "LIFE-AUTO-REAL-PI-0227-MISSING",
    probeId: "LIFE-PI-RUNTIME-0227-MISSING",
    sessionId: "LIFE-OP-SESSION-0227-MISSING",
    recoveryId: "LIFE-TRANSPORT-0227-MISSING",
    leaseId: "LIFE-TRANSPORT-LEASE-0227-MISSING",
    heartbeatId: "LIFE-TRANSPORT-HEARTBEAT-0227-MISSING",
    executionId: "LIFE-GUIDED-EXEC-0227-MISSING",
    reviewId: "LIFE-TERMINAL-REVIEW-0227-MISSING",
    contractId: "LIFE-TRANSPORT-CONTRACT-0227-MISSING"
  };
  assert.throws(
    () =>
      orchestratePiCodexLifecycleAutomaticRealPiExecution(
        projectRoot,
        orchestrationInput(missingIds, "/agent/run/not-service-owned/log-session", runtimeFixture)
      ),
    { code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_LEASE_ROUTE_UNBOUND" },
    "automatic real-Pi orchestration must fail closed when the operator route is not service-owned"
  );
  assert.equal(
    existsSync(
      join(
        projectRoot,
        ".comath/release/pi-codex-lifecycle/LIFE-AUTO-REAL-PI-0227-MISSING/automatic-real-pi-execution.json"
      )
    ),
    false,
    "failed automatic orchestration must not leave a partial orchestration manifest"
  );

  const { route: routeRoute } = await createServiceOwnedAgentRunRoute("0227-ROUTE");
  const routeIds = {
    suffix: "0227-ROUTE",
    orchestrationId: "LIFE-AUTO-REAL-PI-0227-ROUTE",
    probeId: "LIFE-PI-RUNTIME-0227-ROUTE",
    sessionId: "LIFE-OP-SESSION-0227-ROUTE",
    recoveryId: "LIFE-TRANSPORT-0227-ROUTE",
    leaseId: "LIFE-TRANSPORT-LEASE-0227-ROUTE",
    heartbeatId: "LIFE-TRANSPORT-HEARTBEAT-0227-ROUTE",
    executionId: "LIFE-GUIDED-EXEC-0227-ROUTE",
    reviewId: "LIFE-TERMINAL-REVIEW-0227-ROUTE",
    contractId: "LIFE-TRANSPORT-CONTRACT-0227-ROUTE"
  };
  const server = createComathServer();
  const response = await server.inject({
    method: "POST",
    path: "/release/pi-codex-lifecycle/automatic-real-pi-execution",
    body: {
      project_root: projectRoot,
      ...orchestrationInput(routeIds, routeRoute, runtimeFixture),
      durable_transport_provided: true,
      proof_authority: "lean_kernel_clean_replay"
    }
  });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(response.body.orchestration.schema_version, "comath.pi_codex_lifecycle_automatic_real_pi_execution.v1");
  assert.equal(response.body.orchestration.service_route, routeRoute);
  assert.equal(response.body.orchestration.durable_transport_provided, false);
  assert.equal(response.body.orchestration.proof_authority, "none");
  assert.equal(response.body.orchestration.can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(response.body), secretTerms);
  assert.doesNotMatch(JSON.stringify(response.body), privilegedPublicTerms);
  assert.doesNotMatch(JSON.stringify(response.body), transportOverclaimTerms);

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "release.pi_codex_lifecycle_automatic_real_pi_execution_recorded" &&
        event.payload.orchestration_id === ids.orchestrationId &&
        event.payload.transport_contract_id === ids.contractId &&
        event.payload.service_owned_checkpoint_chain_completed === true &&
        event.payload.durable_transport_provided === false &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "automatic real-Pi orchestration audit event must bind the checkpoint chain without proof/transport overclaim"
  );
  assert.doesNotMatch(JSON.stringify(events), secretTerms);
  assert.doesNotMatch(JSON.stringify(events), privilegedPublicTerms);
  assert.doesNotMatch(JSON.stringify(events), transportOverclaimTerms);
} finally {
  if (previousAllowedPrograms === undefined) {
    delete process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS;
  } else {
    process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS = previousAllowedPrograms;
  }
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task227 Pi automatic real-Pi lifecycle orchestration tests passed.");
