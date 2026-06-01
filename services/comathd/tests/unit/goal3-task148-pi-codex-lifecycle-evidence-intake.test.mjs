import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  collectPiCodexLifecycleEvidence,
  createComathServer,
  initProject,
  readAuditEvents,
  reviewPiCodexLifecycleReadiness
} from "../../dist/index.js";

function sha256Text(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task148-lifecycle-evidence-"));

try {
  const init = initProject({ name: "Goal3 Task148 Lifecycle Evidence Project", root_path: projectRoot });
  const projectId = init.project.project_id;
  const inputRoot = join(projectRoot, ".comath/release/pi-codex-lifecycle/input");
  mkdirSync(inputRoot, { recursive: true });

  const artifactTexts = {
    ".comath/release/pi-codex-lifecycle/input/pi-install-transcript.md":
      "real Pi host install transcript\nruntime entrypoint imported\nhost confirmation observed\n",
    ".comath/release/pi-codex-lifecycle/input/runtime-registration.json":
      JSON.stringify({ extension_id: "comath-pi-lab", detected_pi_runtime: { confidence: "verified" } }, null, 2),
    ".comath/release/pi-codex-lifecycle/input/service-lifecycle.log":
      "comathd durable service start observed\nstop observed\nrestart observed\n",
    ".comath/release/pi-codex-lifecycle/input/codex-validation.json":
      JSON.stringify({ installed_cli_validation_ok: true, account_network_validation: "passed" }, null, 2)
  };
  for (const [relativePath, text] of Object.entries(artifactTexts)) {
    writeFileSync(join(projectRoot, relativePath), text, "utf8");
  }

  assert.equal(
    typeof collectPiCodexLifecycleEvidence,
    "function",
    "Task148 must export a service-owned Pi/Codex lifecycle evidence intake"
  );

  const installSession = {
    session_kind: "real_pi_host_manual_install",
    pi_host_kind: "real_pi_host",
    runtime_entrypoint_imported: true,
    runtime_registered: true,
    host_confirmation_observed: true,
    comathd_server_kind: "durable_service",
    service_start_observed: true,
    service_stop_observed: true,
    service_restart_observed: true
  };
  const codexEvidence = {
    installed_cli_validation_ok: true,
    installed_cli_probe_source: "service_owned_process",
    codex_api_account_network_validation: "passed"
  };

  const evidence = collectPiCodexLifecycleEvidence(projectRoot, {
    project_id: projectId,
    evidence_id: "LIFE-EVID-0148",
    actor: "goal3-task148-test",
    install_session_evidence: installSession,
    codex_evidence: codexEvidence,
    artifact_paths: {
      pi_install_transcript_path: ".comath/release/pi-codex-lifecycle/input/pi-install-transcript.md",
      runtime_registration_snapshot_path: ".comath/release/pi-codex-lifecycle/input/runtime-registration.json",
      service_lifecycle_log_path: ".comath/release/pi-codex-lifecycle/input/service-lifecycle.log",
      codex_validation_report_path: ".comath/release/pi-codex-lifecycle/input/codex-validation.json"
    }
  });

  assert.equal(evidence.schema_version, "comath.pi_codex_lifecycle_evidence.v1");
  assert.equal(evidence.evidence_id, "LIFE-EVID-0148");
  assert.equal(evidence.collection_status, "evidence_ready_for_readiness_review");
  assert.equal(evidence.proof_authority, "none");
  assert.equal(evidence.can_promote_claim, false);
  assert.equal(evidence.can_certify_ga, false);
  assert.equal(evidence.evidence_path, ".comath/release/pi-codex-lifecycle/LIFE-EVID-0148/evidence.json");
  assert.deepEqual(evidence.readiness_input, {
    project_id: projectId,
    install_session_evidence: installSession,
    codex_evidence: codexEvidence
  });
  assert.equal(evidence.artifacts.length, 4);
  for (const artifact of evidence.artifacts) {
    assert.equal(artifact.path.startsWith(".comath/release/pi-codex-lifecycle/input/"), true);
    assert.equal(artifact.sha256, sha256Text(artifactTexts[artifact.path]));
    assert.equal(artifact.size_bytes, Buffer.byteLength(artifactTexts[artifact.path], "utf8"));
  }

  const persistedPath = join(projectRoot, evidence.evidence_path);
  assert.equal(existsSync(persistedPath), true, "lifecycle evidence intake must persist a service-owned manifest");
  const persisted = readJson(persistedPath);
  assert.equal(persisted.proof_authority, "none");
  assert.equal(JSON.stringify(persisted).includes(projectRoot), false, "evidence manifest must not echo host paths");

  const review = reviewPiCodexLifecycleReadiness(projectRoot, {
    ...evidence.readiness_input,
    review_id: "LIFE-0148-FROM-EVIDENCE",
    actor: "goal3-task148-review-test"
  });
  assert.equal(review.ok, true, "artifact-backed lifecycle evidence should be acceptable to the readiness review gate");
  assert.equal(review.can_certify_ga, false, "readiness review still cannot certify GA");

  assert.throws(
    () =>
      collectPiCodexLifecycleEvidence(projectRoot, {
        project_id: projectId,
        evidence_id: "LIFE-EVID-0148-MISSING",
        actor: "goal3-task148-test",
        install_session_evidence: installSession,
        codex_evidence: codexEvidence,
        artifact_paths: {
          pi_install_transcript_path: ".comath/release/pi-codex-lifecycle/input/missing-install.md",
          runtime_registration_snapshot_path: ".comath/release/pi-codex-lifecycle/input/runtime-registration.json",
          service_lifecycle_log_path: ".comath/release/pi-codex-lifecycle/input/service-lifecycle.log",
          codex_validation_report_path: ".comath/release/pi-codex-lifecycle/input/codex-validation.json"
        }
      }),
    /PI_CODEX_LIFECYCLE_EVIDENCE_ARTIFACT_MISSING/,
    "missing real-host lifecycle artifact material must fail closed"
  );

  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/pi-codex-lifecycle/evidence",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      evidence_id: "LIFE-EVID-0148-ROUTE",
      actor: "goal3-task148-route-test",
      install_session_evidence: installSession,
      codex_evidence: codexEvidence,
      artifact_paths: {
        pi_install_transcript_path: ".comath/release/pi-codex-lifecycle/input/pi-install-transcript.md",
        runtime_registration_snapshot_path: ".comath/release/pi-codex-lifecycle/input/runtime-registration.json",
        service_lifecycle_log_path: ".comath/release/pi-codex-lifecycle/input/service-lifecycle.log",
        codex_validation_report_path: ".comath/release/pi-codex-lifecycle/input/codex-validation.json"
      }
    }
  });
  assert.equal(routeResponse.status, 200, JSON.stringify(routeResponse.body));
  assert.equal(routeResponse.body.evidence.collection_status, "evidence_ready_for_readiness_review");
  assert.equal(JSON.stringify(routeResponse.body).includes(projectRoot), false, "route response must not echo host paths");

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "release.pi_codex_lifecycle_evidence_collected" &&
        event.payload.evidence_id === "LIFE-EVID-0148" &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "lifecycle evidence intake must be audit-visible and non-authoritative"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task148 Pi/Codex lifecycle evidence intake tests passed.");
