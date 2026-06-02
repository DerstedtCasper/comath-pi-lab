import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createComathServer,
  getComathdStatus,
  initProject,
  persistPiCodexLifecycleOperatorSession,
  readAuditEvents
} from "../../dist/index.js";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task157-operator-session-"));
const privilegedPublicTerms =
  /clean_replay_passed|completed_formal_proof|formally_checked|proven|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence/i;
const secretTerms = /COMATH_CODEX_API_KEY|OPENAI_API_KEY|Authorization:\s*Bearer|api_key|token=|plain-token|sk-/i;
const transportOverclaimTerms =
  /long[- ]lived\s+(?:websocket|sse)|indefinite\s+sse|terminal transport recovered live|durable transport provided/i;

try {
  const init = initProject({ name: "Goal3 Task157 Operator Session Project", root_path: projectRoot });
  const projectId = init.project.project_id;
  const artifactInputPath = ".comath/release/pi-codex-lifecycle/task157-input/runtime-registration.json";
  const artifactAbsolutePath = join(projectRoot, artifactInputPath);
  mkdirSync(join(projectRoot, ".comath/release/pi-codex-lifecycle/task157-input"), { recursive: true });
  writeFileSync(artifactAbsolutePath, '{"registered":true}\n', "utf8");

  assert.equal(
    typeof persistPiCodexLifecycleOperatorSession,
    "function",
    "Task157 must export a service-owned durable lifecycle operator session persister"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("pi_codex_lifecycle_operator_session_persistence"),
    true,
    "Task157 service capability ledger must advertise durable operator session persistence"
  );

  const opened = persistPiCodexLifecycleOperatorSession(projectRoot, {
    project_id: projectId,
    session_id: "LIFE-OP-SESSION-0157",
    actor: `goal3-task157-test ${projectRoot}\\actor-secret.txt OPENAI_API_KEY=plain-token formal_proof_verified durable transport provided`,
    pi_host_label: "pi-host-lab-01",
    session_status: "recoverable_operator_session",
    session_kind: "real_pi_host_manual_install",
    operator_cursor: "stdout:0/stderr:0 Authorization: Bearer plain-token terminal transport recovered live",
    completed_steps: ["real_pi_install_runtime_probe"],
    artifact_paths: [{ kind: "runtime_registration_snapshot", path: artifactInputPath }],
    last_result_summary: {
      summary: `${projectRoot}\\secret.txt sk-task157-secret lean_kernel_clean_replay indefinite SSE open`,
      route: "/release/pi-codex-lifecycle/real-pi-runtime-probe"
    }
  });

  assert.equal(opened.schema_version, "comath.pi_codex_lifecycle_operator_session.v1");
  assert.equal(opened.session_id, "LIFE-OP-SESSION-0157");
  assert.equal(opened.session_status, "recoverable_operator_session");
  assert.equal(opened.project_id, projectId);
  assert.equal(opened.pi_host_label, "pi-host-lab-01");
  assert.equal(opened.durable_transport_provided, false);
  assert.equal(opened.pi_direct_write_allowed, false);
  assert.equal(opened.proof_authority, "none");
  assert.equal(opened.can_promote_claim, false);
  assert.equal(opened.can_certify_ga, false);
  assert.equal(opened.session_manifest_path, ".comath/release/pi-codex-lifecycle/LIFE-OP-SESSION-0157/operator-session-manifest.json");
  assert.deepEqual(opened.completed_steps, ["real_pi_install_runtime_probe"]);
  assert.deepEqual(
    opened.artifact_refs.map((artifact) => artifact.kind),
    ["runtime_registration_snapshot"]
  );
  assert.equal(opened.artifact_refs[0].sha256.length, 64);
  assert.equal(opened.session_manifest_artifact.kind, "operator_session_manifest");
  assert.equal(opened.session_manifest_artifact.path, opened.session_manifest_path);
  assert.equal(opened.session_manifest_artifact.sha256.length, 64);
  assert.equal(opened.session_manifest_artifact.size_bytes > 0, true);
  assert.equal(JSON.stringify(opened).includes(projectRoot), false, "session result must not expose host paths");
  assert.doesNotMatch(JSON.stringify(opened), secretTerms, "session result must not expose API secrets");
  assert.doesNotMatch(JSON.stringify(opened), privilegedPublicTerms, "session result must not overclaim proof authority");
  assert.doesNotMatch(
    JSON.stringify(opened),
    transportOverclaimTerms,
    "session result must not overclaim live or durable operator transport"
  );

  const persistedPath = join(projectRoot, opened.session_manifest_path);
  assert.equal(existsSync(persistedPath), true, "operator session must persist a service-owned manifest");
  const persisted = readJson(persistedPath);
  assert.equal(persisted.schema_version, opened.schema_version);
  assert.equal(persisted.session_id, opened.session_id);
  assert.equal(persisted.session_status, "recoverable_operator_session");
  assert.equal(persisted.proof_authority, "none");
  assert.equal(persisted.can_certify_ga, false);
  assert.equal(persisted.durable_transport_provided, false);
  assert.equal(persisted.pi_direct_write_allowed, false);
  assert.equal(JSON.stringify(persisted).includes(projectRoot), false, "persisted manifest must scrub host paths");
  assert.doesNotMatch(JSON.stringify(persisted), secretTerms, "persisted manifest must scrub secrets");
  assert.doesNotMatch(JSON.stringify(persisted), privilegedPublicTerms, "persisted manifest must scrub proof-success vocabulary");
  assert.doesNotMatch(
    JSON.stringify(persisted),
    transportOverclaimTerms,
    "persisted manifest must scrub live or durable transport overclaims"
  );

  assert.throws(
    () =>
      persistPiCodexLifecycleOperatorSession(projectRoot, {
        project_id: `${projectRoot}\\bad-project.txt token=plain-token formal_proof_verified`,
        session_id: "LIFE-OP-SESSION-0157-BAD-PROJECT",
        actor: "goal3-task157-test",
        pi_host_label: "pi-host-lab-01",
        session_status: "recoverable_operator_session"
      }),
    { code: "PI_CODEX_LIFECYCLE_OPERATOR_SESSION_INVALID_PROJECT_ID" },
    "invalid operator session project ids must fail before persistence or audit writes"
  );
  assert.equal(
    existsSync(
      join(
        projectRoot,
        ".comath/release/pi-codex-lifecycle/LIFE-OP-SESSION-0157-BAD-PROJECT/operator-session-manifest.json"
      )
    ),
    false,
    "invalid project ids must not leave a partial operator session manifest"
  );

  const poisonedCreatedAtPath = join(
    projectRoot,
    ".comath/release/pi-codex-lifecycle/LIFE-OP-SESSION-0157-POISONED/operator-session-manifest.json"
  );
  mkdirSync(join(projectRoot, ".comath/release/pi-codex-lifecycle/LIFE-OP-SESSION-0157-POISONED"), {
    recursive: true
  });
  writeFileSync(
    poisonedCreatedAtPath,
    JSON.stringify({
      created_at: `${projectRoot}\\poison.txt api_key=plain-token lean_kernel_clean_replay`
    }),
    "utf8"
  );
  const recoveredFromPoison = persistPiCodexLifecycleOperatorSession(projectRoot, {
    project_id: projectId,
    session_id: "LIFE-OP-SESSION-0157-POISONED",
    actor: "goal3-task157-test",
    pi_host_label: "pi-host-lab-01",
    session_status: "recoverable_operator_session"
  });
  assert.doesNotMatch(recoveredFromPoison.created_at, secretTerms, "created_at replay must scrub poisoned secrets");
  assert.doesNotMatch(recoveredFromPoison.created_at, privilegedPublicTerms, "created_at replay must scrub proof-success vocabulary");
  assert.equal(recoveredFromPoison.created_at.includes(projectRoot), false, "created_at replay must scrub host paths");

  const completed = persistPiCodexLifecycleOperatorSession(projectRoot, {
    project_id: projectId,
    session_id: "LIFE-OP-SESSION-0157",
    actor: "goal3-task157-test",
    pi_host_label: "pi-host-lab-01",
    session_status: "completed_operator_session",
    session_kind: "real_pi_host_manual_install",
    completed_steps: [
      "real_pi_install_runtime_probe",
      "durable_service_lifecycle_probe",
      "codex_api_account_network_probe",
      "lifecycle_evidence_intake",
      "readiness_review"
    ],
    last_result_summary: { summary: "readiness review produced non-authoritative blocker evidence only" }
  });
  assert.equal(completed.session_status, "completed_operator_session");
  assert.equal(completed.next_recommended_route, "/release/pi-codex-lifecycle/review");
  assert.equal(readJson(persistedPath).session_status, "completed_operator_session");

  assert.throws(
    () =>
      persistPiCodexLifecycleOperatorSession(projectRoot, {
        project_id: projectId,
        session_id: "..",
        actor: "goal3-task157-test",
        pi_host_label: "pi-host-lab-01",
        session_status: "recoverable_operator_session"
      }),
    { code: "PI_CODEX_LIFECYCLE_OPERATOR_SESSION_INVALID_ID" },
    "operator session ids must not collapse or escape the session namespace"
  );
  assert.throws(
    () =>
      persistPiCodexLifecycleOperatorSession(projectRoot, {
        project_id: projectId,
        session_id: "LIFE-OP-SESSION-0157-ESCAPE",
        actor: "goal3-task157-test",
        pi_host_label: "pi-host-lab-01",
        session_status: "recoverable_operator_session",
        artifact_paths: [{ kind: "runtime_registration_snapshot", path: "../escape.json" }]
      }),
    /path escapes project root/,
    "operator session artifact refs must not escape the project root"
  );

  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/pi-codex-lifecycle/operator-session",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      session_id: "LIFE-OP-SESSION-0157-ROUTE",
      actor: "goal3-task157-route-test",
      pi_host_label: "pi-host-lab-01",
      session_status: "recoverable_operator_session",
      session_kind: "real_pi_host_automated_install",
      completed_steps: ["real_pi_install_runtime_probe"]
    }
  });
  assert.equal(routeResponse.status, 200, JSON.stringify(routeResponse.body));
  assert.equal(routeResponse.body.session.session_id, "LIFE-OP-SESSION-0157-ROUTE");
  assert.equal(routeResponse.body.session.can_certify_ga, false);
  assert.equal(JSON.stringify(routeResponse.body).includes(projectRoot), false, "route response must not echo host paths");

  const events = readAuditEvents(projectRoot);
  assert.equal(JSON.stringify(events).includes(projectRoot), false, "operator session audit events must scrub host paths");
  assert.doesNotMatch(JSON.stringify(events), secretTerms, "operator session audit events must scrub secrets");
  assert.doesNotMatch(JSON.stringify(events), privilegedPublicTerms, "operator session audit events must scrub proof-success vocabulary");
  assert.doesNotMatch(
    JSON.stringify(events),
    transportOverclaimTerms,
    "operator session audit events must scrub live or durable transport overclaims"
  );
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "release.pi_codex_lifecycle_operator_session_persisted" &&
        event.payload.session_id === "LIFE-OP-SESSION-0157" &&
        event.payload.session_status === "recoverable_operator_session" &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "operator session persistence must be audit-visible and non-authoritative"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task157 Pi/Codex operator session persistence tests passed.");
