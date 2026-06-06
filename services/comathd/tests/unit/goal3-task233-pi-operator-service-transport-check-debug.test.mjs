import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createComathServer,
  executeProfileAgentRun,
  getComathdStatus,
  initProject,
  orchestratePiCodexLifecycleAutomaticRealPiExecution,
  readAuditEvents,
  recordPiCodexLifecycleOperatorServiceTransportContinuity,
  spawnWorkstream
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task233-transport-check-debug-"));
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

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readRepoFile(relativePath) {
  const here = dirname(fileURLToPath(import.meta.url));
  const repoRoot = join(here, "../../../..");
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function writeRuntimeProbeFixture() {
  const dir = join(projectRoot, ".tmp", "task233-fixtures");
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
  const dir = join(projectRoot, ".tmp", "task233-fixtures");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "operator-service-transport-check-debug-adapter.mjs");
  writeFileSync(
    path,
    [
      "process.stdout.write('task233 stdout before transport check-debug\\n');",
      "process.stderr.write('task233 stderr before transport check-debug\\n');",
      "process.stdout.write('# Agent Report\\n\\n## Input Context\\nTask233 operator/service transport check-debug fixture.\\n\\n## Actions Taken\\nEmitted bounded service-owned logs.\\n\\n## Claims Proposed\\nproof_authority: none\\n\\n## Evidence Produced\\nRuntime logs only.\\n\\n## Graph Patch\\nNo trusted mutation.\\n\\n## Blockers\\nNone.\\n\\n## Failed Routes\\nNone.\\n\\n## Self-Review\\nNo durable transport.\\n\\n## Next Actions\\nCheck existing maintained transport primitives.\\n');",
      ""
    ].join("\n"),
    "utf8"
  );
  return path;
}

async function createServiceOwnedAgentRunRoute(suffix) {
  const workstream = spawnWorkstream(projectRoot, {
    project_id: projectId,
    kind: "proof_route",
    goal: `Task233 operator/service transport check-debug fixture ${suffix}.`,
    created_by: "goal3-task233"
  });
  const agentRun = await executeProfileAgentRun(projectRoot, {
    project_id: projectId,
    campaign_id: `CAM-${suffix.replace(/\D/g, "").padEnd(4, "0")}`,
    workstream_id: workstream.workstream_id,
    profile_id: "reviewer",
    program: process.execPath,
    adapter_args: [writeAgentRunAdapterFixture()],
    goal: `Run Task233 operator/service transport fixture ${suffix}.`,
    context_path: `.comath/workstreams/${workstream.workstream_id}/spec.yaml`,
    actor: `goal3-task233-agent-run-${suffix}`
  });
  return { agentRun, route: `/agent/run/${agentRun.run.id}/log-session` };
}

function orchestrationInput(ids, route, runtimeFixture) {
  return {
    project_id: projectId,
    orchestration_id: ids.orchestrationId,
    actor: `goal3-task233-orchestrator ${projectRoot}\\secret.txt Authorization: Bearer plain-token proof_success durable transport provided long-lived websocket`,
    runtime_probe: {
      probe_id: ids.probeId,
      pi_host_label: `pi-host-task233-${ids.suffix}`,
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
        summary: "Task233 check-debug should remain non-authoritative",
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
      reconnect_reason: "operator/service transport check-debug recovery"
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
      open_reason: "bounded lease during operator/service transport check-debug"
    },
    transport_heartbeat: {
      transport_heartbeat_id: ids.heartbeatId,
      requested_cursor: { operator_event_cursor: "event:9", stdout_cursor: "stdout:0", stderr_cursor: "stderr:0" },
      client_epoch: 9,
      last_seen_event_id: "evt-9",
      heartbeat_reason: "bounded heartbeat during operator/service transport check-debug"
    },
    guided_execution: {
      execution_id: ids.executionId,
      observed_routes: [
        "/cm:release lifecycle-operator-transport-heartbeat",
        "/cm:release lifecycle-guided-real-pi-execution"
      ],
      operator_command_summary: "operator recorded Task233 checkpoint chain",
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

const init = initProject({ name: "Goal3 Task233 Operator Service Transport Check Debug", root_path: projectRoot });
const projectId = init.project.project_id;

try {
  process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS = JSON.stringify([process.execPath]);
  assert.equal(
    getComathdStatus().capabilities.includes("pi_codex_operator_service_transport_check_debug"),
    true,
    "Task233 capability ledger must advertise operator/service transport check-debug coverage"
  );

  const runtimeFixture = writeRuntimeProbeFixture();
  const { route, agentRun } = await createServiceOwnedAgentRunRoute("0233");
  const ids = {
    suffix: "0233",
    orchestrationId: "LIFE-AUTO-REAL-PI-0233",
    probeId: "LIFE-PI-RUNTIME-0233",
    sessionId: "LIFE-OP-SESSION-0233",
    recoveryId: "LIFE-TRANSPORT-0233",
    leaseId: "LIFE-TRANSPORT-LEASE-0233",
    heartbeatId: "LIFE-TRANSPORT-HEARTBEAT-0233",
    executionId: "LIFE-GUIDED-EXEC-0233",
    reviewId: "LIFE-TERMINAL-REVIEW-0233",
    contractId: "LIFE-TRANSPORT-CONTRACT-0233",
    continuityId: "LIFE-TRANSPORT-CONTINUITY-0233"
  };
  const orchestration = orchestratePiCodexLifecycleAutomaticRealPiExecution(
    projectRoot,
    orchestrationInput(ids, route, runtimeFixture)
  );

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
  assert.equal(orchestration.service_route, route);
  assert.equal(orchestration.service_transport_primitive, "node_http_agent_run_log_session_route");
  assert.equal(orchestration.client_transport_primitive, "pi_fetch_get_text");
  assert.equal(orchestration.service_owned_checkpoint_chain_completed, true);
  assert.equal(orchestration.durable_transport_provided, false);
  assert.equal(orchestration.live_transport_open, false);
  assert.equal(orchestration.long_lived_sse_provided, false);
  assert.equal(orchestration.long_lived_websocket_provided, false);
  assert.equal(orchestration.proof_authority, "none");
  assert.equal(orchestration.can_promote_claim, false);
  assert.equal(orchestration.can_certify_ga, false);
  assert.equal(JSON.stringify(orchestration).includes(projectRoot), false, "orchestration result must not expose host paths");
  assert.doesNotMatch(JSON.stringify(orchestration), secretTerms);
  assert.doesNotMatch(JSON.stringify(orchestration), privilegedPublicTerms);
  assert.doesNotMatch(JSON.stringify(orchestration), transportOverclaimTerms);

  appendFileSync(
    join(projectRoot, ".tmp", "comath", agentRun.run.id, "logs", "stdout.log"),
    "task233 stdout after contract for continuity check-debug\n",
    "utf8"
  );
  const continuity = recordPiCodexLifecycleOperatorServiceTransportContinuity(projectRoot, {
    project_id: projectId,
    continuity_id: ids.continuityId,
    actor: "goal3-task233-continuity proof_success durable transport provided token=plain-token",
    transport_contract_id: orchestration.transport_contract_id,
    transport_contract_path: orchestration.transport_contract_path,
    transport_contract_sha256: orchestration.transport_contract_artifact.sha256,
    max_bytes: 2048,
    max_events: 2,
    retry_ms: 600,
    service_transport_primitive: "node_http_agent_run_log_session_route",
    client_transport_primitive: "pi_fetch_get_text"
  });

  assert.equal(continuity.continuity_status, "maintained_bounded_transport_continuity_recorded");
  assert.equal(continuity.transport_contract_id, orchestration.transport_contract_id);
  assert.equal(continuity.transport_contract_artifact.sha256, orchestration.transport_contract_artifact.sha256);
  assert.equal(continuity.agent_run_id, agentRun.run.id);
  assert.equal(continuity.service_route, route);
  assert.equal(continuity.service_transport_primitive, "node_http_agent_run_log_session_route");
  assert.equal(continuity.client_transport_primitive, "pi_fetch_get_text");
  assert.equal(continuity.http_method, "GET");
  assert.equal(continuity.content_type, "text/event-stream; charset=utf-8");
  assert.equal(continuity.maintained_transport_primitive_bound, true);
  assert.equal(continuity.transport_contract_bound, true);
  assert.equal(continuity.durable_resume_checkpoint_recorded, true);
  assert.equal(continuity.durable_transport_provided, false);
  assert.equal(continuity.live_transport_open, false);
  assert.equal(continuity.indefinite_stream_open, false);
  assert.equal(continuity.long_lived_websocket_provided, false);
  assert.equal(continuity.long_lived_sse_provided, false);
  assert.equal(continuity.pi_direct_write_allowed, false);
  assert.equal(continuity.direct_trusted_state_mutation, false);
  assert.equal(continuity.proof_authority, "none");
  assert.equal(continuity.can_promote_claim, false);
  assert.equal(continuity.can_certify_ga, false);
  assert.equal(JSON.stringify(continuity).includes(projectRoot), false, "continuity result must not expose host paths");
  assert.doesNotMatch(JSON.stringify(continuity), secretTerms);
  assert.doesNotMatch(JSON.stringify(continuity), privilegedPublicTerms);
  assert.doesNotMatch(JSON.stringify(continuity), transportOverclaimTerms);

  assert.throws(
    () =>
      recordPiCodexLifecycleOperatorServiceTransportContinuity(projectRoot, {
        project_id: projectId,
        continuity_id: ids.continuityId,
        actor: "goal3-task233-duplicate-continuity",
        transport_contract_id: orchestration.transport_contract_id,
        transport_contract_path: orchestration.transport_contract_path,
        transport_contract_sha256: orchestration.transport_contract_artifact.sha256
      }),
    { code: "PI_CODEX_OPERATOR_SERVICE_TRANSPORT_CONTINUITY_ALREADY_EXISTS" },
    "Task233 must preserve append-only continuity checkpoints"
  );

  const contractPath = join(projectRoot, orchestration.transport_contract_path);
  const contractBeforePoison = readFileSync(contractPath, "utf8");
  const poisonedContract = readJson(contractPath);
  poisonedContract.log_session_body_sha256 = "f".repeat(64);
  writeJson(contractPath, poisonedContract);
  assert.throws(
    () =>
      recordPiCodexLifecycleOperatorServiceTransportContinuity(projectRoot, {
        project_id: projectId,
        continuity_id: "LIFE-TRANSPORT-CONTINUITY-0233-TAMPERED-CONTRACT",
        actor: "goal3-task233-tampered-contract",
        transport_contract_id: orchestration.transport_contract_id,
        transport_contract_path: orchestration.transport_contract_path,
        transport_contract_sha256: orchestration.transport_contract_artifact.sha256
      }),
    { code: "PI_CODEX_OPERATOR_SERVICE_TRANSPORT_CONTINUITY_CONTRACT_STALE" },
    "Task233 must preserve stale/tampered contract fail-closed behavior"
  );
  writeFileSync(contractPath, contractBeforePoison, "utf8");

  assert.throws(
    () =>
      recordPiCodexLifecycleOperatorServiceTransportContinuity(projectRoot, {
        project_id: projectId,
        continuity_id: "LIFE-TRANSPORT-CONTINUITY-0233-NO-HASH",
        actor: "goal3-task233-missing-hash",
        transport_contract_id: orchestration.transport_contract_id,
        transport_contract_path: orchestration.transport_contract_path,
        transport_contract_sha256: undefined
      }),
    { code: "PI_CODEX_OPERATOR_SERVICE_TRANSPORT_CONTINUITY_CONTRACT_HASH_REQUIRED" },
    "Task233 must preserve caller-supplied contract hash requirements"
  );

  const server = createComathServer();
  const response = await server.inject({
    method: "POST",
    path: "/release/pi-codex-lifecycle/operator-service-transport-continuity",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      continuity_id: "LIFE-TRANSPORT-CONTINUITY-0233-ROUTE",
      actor: "goal3-task233-route token=plain-token durable transport provided proof_success long-lived SSE",
      transport_contract_id: orchestration.transport_contract_id,
      transport_contract_path: orchestration.transport_contract_path,
      transport_contract_sha256: orchestration.transport_contract_artifact.sha256,
      durable_transport_provided: true,
      proof_authority: "lean_kernel_clean_replay"
    }
  });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(response.body.continuity.proof_authority, "none");
  assert.equal(response.body.continuity.durable_transport_provided, false);
  assert.equal(response.body.continuity.can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(response.body), secretTerms);
  assert.doesNotMatch(JSON.stringify(response.body), privilegedPublicTerms);
  assert.doesNotMatch(JSON.stringify(response.body), transportOverclaimTerms);

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "release.pi_codex_operator_service_transport_continuity_recorded" &&
        event.payload.transport_contract_id === orchestration.transport_contract_id &&
        event.payload.continuity_id === continuity.continuity_id &&
        event.payload.durable_transport_provided === false &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "Task233 check-debug audit evidence must keep transport continuity non-authoritative"
  );
  assert.doesNotMatch(JSON.stringify(events), secretTerms);
  assert.doesNotMatch(JSON.stringify(events), privilegedPublicTerms);
  assert.doesNotMatch(JSON.stringify(events), transportOverclaimTerms);

  const phase0Smoke = readRepoFile("scripts/phase0-smoke.mjs");
  const gaReleaseCriteria = readRepoFile("docs/architecture/ga-release-criteria.md");
  const readme = readRepoFile("README.md");
  const agents = readRepoFile("AGENTS.md");
  const todo = readRepoFile("TODO.md");
  const review = readRepoFile("REVIEW.md");
  const threatModel = readRepoFile("docs/architecture/threat-model.md");
  const goal3Tasks = readRepoFile("goal-3/tasks.md");
  const testName = "goal3-task233-pi-operator-service-transport-check-debug.test.mjs";
  for (const [label, content] of [
    ["GA release criteria", gaReleaseCriteria],
    ["README", readme],
    ["AGENTS", agents],
    ["TODO", todo],
    ["REVIEW", review],
    ["threat model", threatModel],
    ["Goal 3 tracker", goal3Tasks]
  ]) {
    assert.equal(content.includes("Task233"), true, `${label} must record the Task233 check-debug boundary`);
  }
  assert.equal(phase0Smoke.includes(testName), true, "phase0 smoke must discover the Task233 check-debug suite");
  assert.equal(gaReleaseCriteria.includes(testName), true, "GA release criteria must list the Task233 suite");
  for (const [label, content] of [
    ["README", readme],
    ["AGENTS", agents],
    ["TODO", todo],
    ["GA release criteria", gaReleaseCriteria],
    ["threat model", threatModel]
  ]) {
    assert.doesNotMatch(
      content,
      /Task233.{0,280}(?:certif(?:y|ies) GA|mathematical proof authority|durable long-lived transport|opens? durable transport|runs? Lean|promotes? claims|direct Pi write|unattended execution completion)/is,
      `${label} must not overclaim Task233 as proof, GA, durable transport, Lean execution, claim promotion, direct Pi mutation, or unattended execution completion`
    );
  }
} finally {
  if (previousAllowedPrograms === undefined) {
    delete process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS;
  } else {
    process.env.COMATH_PI_CODEX_LIFECYCLE_ALLOWED_PROGRAMS = previousAllowedPrograms;
  }
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task233 operator/service transport check-debug tests passed.");
