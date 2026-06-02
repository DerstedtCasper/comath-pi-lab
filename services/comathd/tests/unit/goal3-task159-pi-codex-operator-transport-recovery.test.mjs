import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createComathServer,
  getComathdStatus,
  initProject,
  persistPiCodexLifecycleOperatorSession,
  readAuditEvents,
  recoverPiCodexLifecycleOperatorTransport
} from "../../dist/index.js";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task159-operator-transport-"));
const privilegedPublicTerms =
  /clean_replay_passed|completed_formal_proof|formally_checked|proven|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence/i;
const secretTerms = /COMATH_CODEX_API_KEY|OPENAI_API_KEY|Authorization:\s*Bearer|api_key|token=|plain-token|sk-/i;
const transportOverclaimTerms =
  /long-lived\s+(?:websocket|sse)|indefinite\s+sse|terminal transport recovered live|durable transport provided/i;

try {
  const init = initProject({ name: "Goal3 Task159 Operator Transport Project", root_path: projectRoot });
  const projectId = init.project.project_id;
  const artifactInputPath = ".comath/release/pi-codex-lifecycle/task159-input/runtime-registration.json";
  const artifactAbsolutePath = join(projectRoot, artifactInputPath);
  mkdirSync(join(projectRoot, ".comath/release/pi-codex-lifecycle/task159-input"), { recursive: true });
  writeFileSync(artifactAbsolutePath, '{"registered":true}\n', "utf8");

  assert.equal(
    typeof recoverPiCodexLifecycleOperatorTransport,
    "function",
    "Task159 must export a service-owned Pi/Codex lifecycle operator transport recovery checkpoint recorder"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("pi_codex_lifecycle_operator_transport_recovery"),
    true,
    "Task159 service capability ledger must advertise operator transport recovery checkpointing"
  );

  const session = persistPiCodexLifecycleOperatorSession(projectRoot, {
    project_id: projectId,
    session_id: "LIFE-OP-SESSION-0159",
    actor: "goal3-task159-session-test",
    pi_host_label: "pi-host-lab-01",
    session_status: "recoverable_operator_session",
    session_kind: "real_pi_host_manual_install",
    operator_cursor: "stdout:0/stderr:0",
    completed_steps: ["real_pi_install_runtime_probe"],
    artifact_paths: [{ kind: "runtime_registration_snapshot", path: artifactInputPath }],
    last_result_summary: { summary: "session ready for bounded operator recovery checkpointing" }
  });
  const sessionBeforeRecovery = readJson(join(projectRoot, session.session_manifest_path));

  const recovery = recoverPiCodexLifecycleOperatorTransport(projectRoot, {
    project_id: projectId,
    session_id: "LIFE-OP-SESSION-0159",
    transport_recovery_id: "LIFE-TRANSPORT-0159",
    actor: `goal3-task159-test ${projectRoot}\\actor-secret.txt OPENAI_API_KEY=plain-token formal_proof_verified long-lived SSE`,
    session_manifest_path: session.session_manifest_path,
    transport_kind: "operator_polling_checkpoint",
    observed_route: `/release/pi-codex-lifecycle/operator-session ${projectRoot}\\route-secret.txt token=plain-token long-lived websocket provided`,
    requested_cursor: {
      operator_event_cursor: "event:42 Authorization: Bearer plain-token",
      stdout_cursor: "stdout:128 sk-task159-secret indefinite SSE open",
      stderr_cursor: "stderr:64 clean_replay_passed terminal transport recovered live"
    },
    client_epoch: 2,
    last_seen_event_id: "evt-42 api_key=plain-token formal_replay_passed durable transport provided",
    reconnect_reason: `operator shell restarted from ${projectRoot}\\terminal.txt long-lived SSE`
  });

  assert.equal(recovery.schema_version, "comath.pi_codex_lifecycle_operator_transport_recovery.v1");
  assert.equal(recovery.transport_recovery_id, "LIFE-TRANSPORT-0159");
  assert.equal(recovery.project_id, projectId);
  assert.equal(recovery.session_id, "LIFE-OP-SESSION-0159");
  assert.equal(recovery.transport_kind, "operator_polling_checkpoint");
  assert.equal(recovery.session_manifest_path, session.session_manifest_path);
  assert.equal(recovery.session_manifest_artifact.kind, "operator_session_manifest");
  assert.equal(recovery.session_manifest_artifact.path, session.session_manifest_path);
  assert.equal(recovery.session_manifest_artifact.sha256, session.session_manifest_artifact.sha256);
  assert.equal(recovery.session_manifest_artifact.size_bytes, session.session_manifest_artifact.size_bytes);
  assert.equal(recovery.transport_recovery_path, ".comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-0159/operator-transport-recovery.json");
  assert.equal(recovery.transport_recovery_artifact.kind, "operator_transport_recovery");
  assert.equal(recovery.transport_recovery_artifact.path, recovery.transport_recovery_path);
  assert.equal(recovery.transport_recovery_artifact.sha256.length, 64);
  assert.equal(recovery.transport_recovery_artifact.size_bytes > 0, true);
  assert.equal(recovery.next_recommended_route, session.next_recommended_route);
  assert.equal(recovery.durable_recovery_checkpoint_provided, true);
  assert.equal(recovery.durable_transport_provided, false);
  assert.equal(recovery.live_transport_open, false);
  assert.equal(recovery.indefinite_stream_open, false);
  assert.equal(recovery.long_lived_websocket_provided, false);
  assert.equal(recovery.long_lived_sse_provided, false);
  assert.equal(recovery.pi_direct_write_allowed, false);
  assert.equal(recovery.direct_trusted_state_mutation, false);
  assert.equal(recovery.proof_authority, "none");
  assert.equal(recovery.can_promote_claim, false);
  assert.equal(recovery.can_certify_ga, false);
  assert.equal(JSON.stringify(recovery).includes(projectRoot), false, "recovery result must not expose host paths");
  assert.doesNotMatch(JSON.stringify(recovery), secretTerms, "recovery result must not expose API secrets");
  assert.doesNotMatch(JSON.stringify(recovery), privilegedPublicTerms, "recovery result must not overclaim proof authority");
  assert.doesNotMatch(
    JSON.stringify(recovery),
    transportOverclaimTerms,
    "recovery result must scrub long-lived transport overclaims from free text"
  );

  const persistedPath = join(projectRoot, recovery.transport_recovery_path);
  assert.equal(existsSync(persistedPath), true, "operator transport recovery must persist a service-owned checkpoint artifact");
  const persisted = readJson(persistedPath);
  assert.equal(persisted.schema_version, recovery.schema_version);
  assert.equal(persisted.transport_recovery_id, recovery.transport_recovery_id);
  assert.equal(persisted.session_id, recovery.session_id);
  assert.equal(persisted.session_manifest_artifact.sha256, session.session_manifest_artifact.sha256);
  assert.equal(persisted.proof_authority, "none");
  assert.equal(persisted.can_certify_ga, false);
  assert.equal(persisted.durable_recovery_checkpoint_provided, true);
  assert.equal(persisted.durable_transport_provided, false);
  assert.equal(persisted.live_transport_open, false);
  assert.equal(persisted.indefinite_stream_open, false);
  assert.equal(persisted.long_lived_websocket_provided, false);
  assert.equal(persisted.long_lived_sse_provided, false);
  assert.equal(JSON.stringify(persisted).includes(projectRoot), false, "persisted recovery must scrub host paths");
  assert.doesNotMatch(JSON.stringify(persisted), secretTerms, "persisted recovery must scrub secrets");
  assert.doesNotMatch(JSON.stringify(persisted), privilegedPublicTerms, "persisted recovery must scrub proof-success vocabulary");
  assert.doesNotMatch(
    JSON.stringify(persisted),
    transportOverclaimTerms,
    "persisted recovery must scrub long-lived transport overclaims from free text"
  );

  const sessionAfterRecovery = readJson(join(projectRoot, session.session_manifest_path));
  assert.deepEqual(
    sessionAfterRecovery.completed_steps,
    sessionBeforeRecovery.completed_steps,
    "transport recovery checkpoints must not mutate trusted operator-session completed steps"
  );
  assert.equal(
    sessionAfterRecovery.next_recommended_route,
    sessionBeforeRecovery.next_recommended_route,
    "transport recovery checkpoints must not mutate trusted operator-session routing"
  );

  assert.throws(
    () =>
      recoverPiCodexLifecycleOperatorTransport(projectRoot, {
        project_id: projectId,
        session_id: "LIFE-OP-SESSION-0159-MISSING",
        transport_recovery_id: "LIFE-TRANSPORT-0159-MISSING",
        actor: "goal3-task159-test",
        transport_kind: "operator_polling_checkpoint"
      }),
    { code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_RECOVERY_SESSION_MISSING" },
    "transport recovery must fail closed when the Task157 operator-session manifest is absent"
  );
  assert.equal(
    existsSync(join(projectRoot, ".comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-0159-MISSING/operator-transport-recovery.json")),
    false,
    "missing operator-session manifests must not leave partial recovery artifacts"
  );

  const poisonedSession = persistPiCodexLifecycleOperatorSession(projectRoot, {
    project_id: projectId,
    session_id: "LIFE-OP-SESSION-0159-POISONED",
    actor: "goal3-task159-poisoned-session-test",
    pi_host_label: "pi-host-lab-01",
    session_status: "recoverable_operator_session",
    session_kind: "real_pi_host_manual_install",
    completed_steps: ["real_pi_install_runtime_probe"]
  });
  const poisonedSessionPath = join(projectRoot, poisonedSession.session_manifest_path);
  writeFileSync(
    poisonedSessionPath,
    JSON.stringify(
      {
        ...readJson(poisonedSessionPath),
        durable_transport_provided: true,
        pi_direct_write_allowed: true,
        direct_trusted_state_mutation: true,
        can_promote_claim: true,
        can_certify_ga: true,
        proof_authority: "lean_kernel_clean_replay"
      },
      null,
      2
    ),
    "utf8"
  );
  assert.throws(
    () =>
      recoverPiCodexLifecycleOperatorTransport(projectRoot, {
        project_id: projectId,
        session_id: "LIFE-OP-SESSION-0159-POISONED",
        transport_recovery_id: "LIFE-TRANSPORT-0159-POISONED",
        actor: "goal3-task159-test",
        transport_kind: "operator_polling_checkpoint"
      }),
    { code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_RECOVERY_SESSION_INVALID_BOUNDARY" },
    "transport recovery must reject poisoned operator-session manifests that violate Task157 non-authority boundaries"
  );
  assert.equal(
    existsSync(join(projectRoot, ".comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-0159-POISONED/operator-transport-recovery.json")),
    false,
    "poisoned operator-session manifests must not leave a partial recovery artifact"
  );

  assert.throws(
    () =>
      recoverPiCodexLifecycleOperatorTransport(projectRoot, {
        project_id: `${projectRoot}\\bad-project.txt token=plain-token formal_proof_verified`,
        session_id: "LIFE-OP-SESSION-0159",
        transport_recovery_id: "LIFE-TRANSPORT-0159-BAD-PROJECT",
        actor: "goal3-task159-test",
        transport_kind: "operator_polling_checkpoint"
      }),
    { code: "PI_CODEX_LIFECYCLE_OPERATOR_SESSION_INVALID_PROJECT_ID" },
    "invalid project ids must fail before recovery persistence or audit writes"
  );
  assert.equal(
    existsSync(join(projectRoot, ".comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-0159-BAD-PROJECT/operator-transport-recovery.json")),
    false,
    "invalid project ids must not leave a partial recovery artifact"
  );

  assert.throws(
    () =>
      recoverPiCodexLifecycleOperatorTransport(projectRoot, {
        project_id: projectId,
        session_id: "..",
        transport_recovery_id: "LIFE-TRANSPORT-0159-BAD-SESSION",
        actor: "goal3-task159-test",
        transport_kind: "operator_polling_checkpoint"
      }),
    { code: "PI_CODEX_LIFECYCLE_OPERATOR_SESSION_INVALID_ID" },
    "operator transport recovery must reject session ids that collapse or escape the namespace"
  );

  assert.throws(
    () =>
      recoverPiCodexLifecycleOperatorTransport(projectRoot, {
        project_id: projectId,
        session_id: "LIFE-OP-SESSION-0159",
        transport_recovery_id: "..",
        actor: "goal3-task159-test",
        transport_kind: "operator_polling_checkpoint"
      }),
    { code: "PI_CODEX_LIFECYCLE_OPERATOR_TRANSPORT_RECOVERY_INVALID_ID" },
    "operator transport recovery ids must not collapse or escape the recovery namespace"
  );

  assert.throws(
    () =>
      recoverPiCodexLifecycleOperatorTransport(projectRoot, {
        project_id: projectId,
        session_id: "LIFE-OP-SESSION-0159",
        transport_recovery_id: "LIFE-TRANSPORT-0159-ESCAPE",
        actor: "goal3-task159-test",
        session_manifest_path: "../escape/operator-session-manifest.json",
        transport_kind: "operator_polling_checkpoint"
      }),
    /path escapes project root/,
    "operator transport recovery must reject escaped session manifest paths before persistence"
  );
  assert.equal(
    existsSync(join(projectRoot, ".comath/release/pi-codex-lifecycle/LIFE-TRANSPORT-0159-ESCAPE/operator-transport-recovery.json")),
    false,
    "escaped session manifest paths must not leave a partial recovery artifact"
  );

  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/pi-codex-lifecycle/operator-transport-recovery",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      session_id: "LIFE-OP-SESSION-0159",
      transport_recovery_id: "LIFE-TRANSPORT-0159-ROUTE",
      actor: "goal3-task159-route-test",
      session_manifest_path: session.session_manifest_path,
      transport_kind: "bounded_sse_snapshot",
      observed_route: "/agent/run/RUN-0159/log-session",
      requested_cursor: {
        operator_event_cursor: "event:128",
        stdout_cursor: "stdout:512",
        stderr_cursor: "stderr:16"
      },
      client_epoch: 3,
      last_seen_event_id: "evt-128",
      reconnect_reason: "bounded SSE snapshot expired"
    }
  });
  assert.equal(routeResponse.status, 200, JSON.stringify(routeResponse.body));
  assert.equal(routeResponse.body.recovery.transport_recovery_id, "LIFE-TRANSPORT-0159-ROUTE");
  assert.equal(routeResponse.body.recovery.transport_kind, "bounded_sse_snapshot");
  assert.equal(routeResponse.body.recovery.can_certify_ga, false);
  assert.equal(routeResponse.body.recovery.long_lived_sse_provided, false);
  assert.equal(JSON.stringify(routeResponse.body).includes(projectRoot), false, "route response must not echo host paths");

  const events = readAuditEvents(projectRoot);
  assert.equal(JSON.stringify(events).includes(projectRoot), false, "operator transport recovery audit events must scrub host paths");
  assert.doesNotMatch(JSON.stringify(events), secretTerms, "operator transport recovery audit events must scrub secrets");
  assert.doesNotMatch(JSON.stringify(events), privilegedPublicTerms, "operator transport recovery audit events must scrub proof-success vocabulary");
  assert.doesNotMatch(
    JSON.stringify(events),
    transportOverclaimTerms,
    "operator transport recovery audit events must scrub long-lived transport overclaims"
  );
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "release.pi_codex_lifecycle_operator_transport_recovery_recorded" &&
        event.payload.transport_recovery_id === "LIFE-TRANSPORT-0159" &&
        event.payload.session_id === "LIFE-OP-SESSION-0159" &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false &&
        event.payload.durable_recovery_checkpoint_provided === true &&
        event.payload.durable_transport_provided === false &&
        event.payload.live_transport_open === false &&
        event.payload.indefinite_stream_open === false &&
        event.payload.long_lived_websocket_provided === false &&
        event.payload.long_lived_sse_provided === false &&
        event.payload.pi_direct_write_allowed === false &&
        event.payload.direct_trusted_state_mutation === false
    ),
    true,
    "operator transport recovery checkpointing must be audit-visible and non-authoritative"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task159 Pi/Codex operator transport recovery tests passed.");
