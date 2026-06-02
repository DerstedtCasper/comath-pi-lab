import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildAgentAdapterPackageLaunch,
  createComathServer,
  getComathdStatus,
  initProject,
  listAgentAdapterPackages,
  readAuditEvents,
  reviewAgentAdapterOsIsolationReadiness,
  spawnWorkstream
} from "../../dist/index.js";

function sha256Text(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function writeEvidence(projectRoot, relativePath, body) {
  const text = `${JSON.stringify(body, null, 2)}\n`;
  const absolutePath = join(projectRoot, relativePath);
  mkdirSync(join(absolutePath, ".."), { recursive: true });
  writeFileSync(absolutePath, text, "utf8");
  return { relativePath, text };
}

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task167-adapter-osiso-"));

try {
  assert.equal(
    typeof reviewAgentAdapterOsIsolationReadiness,
    "function",
    "Task167 must export a service-owned adapter OS-isolation readiness gate"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("agent_adapter_os_isolation_readiness_gate"),
    true,
    "Task167 service capability ledger must advertise the adapter OS-isolation readiness gate"
  );

  const packages = listAgentAdapterPackages();
  const codexPackage = packages.find((entry) => entry.id === "codex-cli");
  assert.ok(codexPackage, "codex-cli adapter package must remain registered");
  assert.equal(codexPackage.os_isolation.required_for_ga, true);
  assert.equal(codexPackage.os_isolation.os_enforced, false);
  assert.equal(codexPackage.os_isolation.current_boundary, "process_boundary_only");
  assert.equal(codexPackage.os_isolation.proof_authority, "none");

  const init = initProject({ name: "Goal3 Task167 Adapter OS Isolation Project", root_path: projectRoot });
  const projectId = init.project.project_id;
  const workstream = spawnWorkstream(projectRoot, {
    project_id: projectId,
    kind: "review",
    goal: "Audit adapter OS isolation readiness.",
    created_by: "goal3-task167-test"
  });
  const contextPath = `.comath/workstreams/${workstream.workstream_id}/spec.yaml`;

  const prepared = buildAgentAdapterPackageLaunch(projectRoot, {
    project_id: projectId,
    run_id: "ARUN-0167",
    profile_id: "security-auditor",
    adapter_id: "codex-cli",
    goal: "Prepare a package launch with explicit OS-isolation non-claim metadata.",
    context_path: contextPath,
    actor: "goal3-task167-test"
  });
  assert.equal(prepared.launch.launch_input.command.env.COMATH_AGENT_ADAPTER_OS_ISOLATION_ENFORCED, "false");
  assert.equal(prepared.launch.launch_input.command.env.COMATH_AGENT_ADAPTER_OS_ISOLATION_BOUNDARY, "process_boundary_only");
  assert.equal(prepared.launch.launch_input.command.env.COMATH_AGENT_ADAPTER_OS_ISOLATION_REQUIRED_FOR_GA, "true");

  const missingEvidence = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0167-MISSING",
    adapter_id: "codex-cli",
    backend: "bundled",
    actor: "goal3-task167-test"
  });
  assert.equal(missingEvidence.ok, false);
  assert.equal(missingEvidence.readiness_status, "blocked_missing_os_enforced_adapter_isolation");
  assert.equal(missingEvidence.checks.evidence_artifact_bound.ok, false);
  assert.equal(missingEvidence.vetoes.some((veto) => veto.code === "adapter_os_isolation_evidence_missing"), true);
  assert.equal(missingEvidence.proof_authority, "none");
  assert.equal(missingEvidence.can_promote_claim, false);
  assert.equal(missingEvidence.can_certify_ga, false);

  const contractEvidence = writeEvidence(projectRoot, ".comath/release/agent-adapter-os-isolation/input/contract-only.json", {
    schema_version: "comath.agent_adapter_os_isolation_evidence.v1",
    adapter_id: "codex-cli",
    backend: "bundled",
    provider: "service_process_boundary",
    evidence_source: "contract_only",
    process_isolation_enforced: false,
    filesystem_scope_enforced: false,
    network_isolation_enforced: false,
    no_new_privileges: false,
    host_path_leak_free: true,
    secret_free: true,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  });
  const contractReview = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0167-CONTRACT",
    adapter_id: "codex-cli",
    backend: "bundled",
    actor: "goal3-task167-test",
    evidence_path: contractEvidence.relativePath
  });
  assert.equal(contractReview.ok, false);
  assert.equal(contractReview.evidence_artifact.sha256, sha256Text(contractEvidence.text));
  assert.equal(contractReview.vetoes.some((veto) => veto.code === "adapter_os_isolation_provider_not_os_enforced"), true);
  assert.equal(contractReview.vetoes.some((veto) => veto.code === "adapter_os_process_isolation_missing"), true);

  const realEvidence = writeEvidence(projectRoot, ".comath/release/agent-adapter-os-isolation/input/oci-evidence.json", {
    schema_version: "comath.agent_adapter_os_isolation_evidence.v1",
    adapter_id: "codex-cli",
    backend: "bundled",
    provider: "oci_container",
    evidence_source: "service_owned_probe",
    process_isolation_enforced: true,
    filesystem_scope_enforced: true,
    network_isolation_enforced: true,
    no_new_privileges: true,
    escape_prevention: true,
    host_path_leak_free: true,
    secret_free: true,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  });
  const readyReview = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0167-READY",
    adapter_id: "codex-cli",
    backend: "bundled",
    actor: "goal3-task167-test",
    evidence_path: realEvidence.relativePath
  });
  assert.equal(readyReview.ok, true);
  assert.equal(readyReview.readiness_status, "ready_for_os_isolation_release_review");
  assert.equal(readyReview.checks.provider_os_enforced.ok, true);
  assert.equal(readyReview.checks.network_isolation.ok, true);
  assert.equal(readyReview.adapter_execution_isolation.os_enforced, true);
  assert.equal(readyReview.adapter_execution_isolation.claims_runtime_enforcement, false);
  assert.equal(readyReview.proof_authority, "none");
  assert.equal(readyReview.can_certify_ga, false);
  assert.equal(existsSync(join(projectRoot, readyReview.review_path)), true);
  const persisted = JSON.parse(readFileSync(join(projectRoot, readyReview.review_path), "utf8"));
  assert.equal(JSON.stringify(persisted).includes(projectRoot), false, "review manifest must not echo host paths");
  assert.equal(persisted.evidence_artifact.sha256, sha256Text(realEvidence.text));

  assert.throws(
    () =>
      reviewAgentAdapterOsIsolationReadiness(projectRoot, {
        project_id: projectId,
        review_id: "ADAPTER-OSISO-0167-READY",
        adapter_id: "codex-cli",
        backend: "bundled",
        actor: "goal3-task167-test",
        evidence_path: realEvidence.relativePath
      }),
    (error) => error?.code === "AGENT_ADAPTER_OS_ISOLATION_REVIEW_ALREADY_EXISTS",
    "adapter OS-isolation readiness reviews must be append-only by review id"
  );

  const mismatchedEvidence = writeEvidence(projectRoot, ".comath/release/agent-adapter-os-isolation/input/mismatched.json", {
    schema_version: "comath.agent_adapter_os_isolation_evidence.v1",
    adapter_id: "different-adapter",
    backend: "external",
    provider: "oci_container",
    evidence_source: "operator_attested",
    process_isolation_enforced: true,
    filesystem_scope_enforced: true,
    network_isolation_enforced: true,
    no_new_privileges: true,
    escape_prevention: true,
    host_path_leak_free: true,
    secret_free: true,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  });
  const mismatchedReview = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0167-MISMATCH",
    adapter_id: "codex-cli",
    backend: "bundled",
    actor: `${projectRoot} token=actor-secret`,
    evidence_path: mismatchedEvidence.relativePath
  });
  assert.equal(mismatchedReview.ok, false);
  assert.equal(
    mismatchedReview.vetoes.some((veto) => veto.code === "adapter_os_isolation_evidence_adapter_mismatch"),
    true,
    "OS-isolation evidence must bind the reviewed adapter id"
  );
  assert.equal(
    mismatchedReview.vetoes.some((veto) => veto.code === "adapter_os_isolation_evidence_backend_mismatch"),
    true,
    "OS-isolation evidence must bind the reviewed backend"
  );
  assert.equal(
    mismatchedReview.vetoes.some((veto) => veto.code === "adapter_os_isolation_evidence_not_service_owned_probe"),
    true,
    "release-readiness evidence must come from a service-owned OS-isolation probe"
  );
  const mismatchEvents = readAuditEvents(projectRoot).filter(
    (event) =>
      event.event_type === "agent_adapter.os_isolation_reviewed" &&
      event.payload.review_id === "ADAPTER-OSISO-0167-MISMATCH"
  );
  assert.equal(mismatchEvents.length, 1);
  assert.equal(JSON.stringify(mismatchEvents[0]).includes(projectRoot), false, "audit event must not echo host paths");
  assert.equal(JSON.stringify(mismatchEvents[0]).includes("actor-secret"), false, "audit event must not echo secrets");

  const poisonedEvidence = writeEvidence(projectRoot, ".comath/release/agent-adapter-os-isolation/input/poisoned.json", {
    schema_version: "comath.agent_adapter_os_isolation_evidence.v1",
    adapter_id: "codex-cli",
    backend: "bundled",
    provider: "oci_container",
    evidence_source: "service_owned_probe",
    process_isolation_enforced: true,
    filesystem_scope_enforced: true,
    network_isolation_enforced: true,
    no_new_privileges: true,
    escape_prevention: true,
    host_path_leak_free: false,
    secret_free: false,
    notes: `${projectRoot} Authorization: Bearer plain-token`,
    proof_authority: "lean_kernel_check",
    can_promote_claim: true,
    can_certify_ga: true
  });
  const poisonedReview = reviewAgentAdapterOsIsolationReadiness(projectRoot, {
    project_id: projectId,
    review_id: "ADAPTER-OSISO-0167-POISONED",
    adapter_id: "codex-cli",
    backend: "bundled",
    actor: "goal3-task167-test",
    evidence_path: poisonedEvidence.relativePath
  });
  assert.equal(poisonedReview.ok, false);
  assert.equal(poisonedReview.vetoes.some((veto) => veto.code === "adapter_os_isolation_evidence_leaks_host_path_or_secret"), true);
  assert.equal(poisonedReview.vetoes.some((veto) => veto.code === "adapter_os_isolation_evidence_overclaims_authority"), true);
  assert.equal(JSON.stringify(poisonedReview).includes(projectRoot), false, "route-safe result must scrub host paths");
  assert.equal(JSON.stringify(poisonedReview).includes("plain-token"), false, "route-safe result must scrub secrets");

  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/agent/adapter/package/os-isolation-review",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      review_id: "ADAPTER-OSISO-0167-ROUTE",
      adapter_id: "codex-cli",
      backend: "bundled",
      actor: "goal3-task167-route-test",
      evidence_path: realEvidence.relativePath
    }
  });
  assert.equal(routeResponse.status, 200, JSON.stringify(routeResponse.body));
  assert.equal(routeResponse.body.review.ok, true);
  assert.equal(routeResponse.body.review.can_certify_ga, false);
  assert.equal(JSON.stringify(routeResponse.body).includes(projectRoot), false, "route response must not echo host paths");

  const events = readAuditEvents(projectRoot);
  assert.equal(
    events.some(
      (event) =>
        event.event_type === "agent_adapter.os_isolation_reviewed" &&
        event.payload.review_id === "ADAPTER-OSISO-0167-READY" &&
        event.payload.ok === true &&
        event.payload.proof_authority === "none" &&
        event.payload.can_certify_ga === false
    ),
    true,
    "adapter OS-isolation review must be audit-visible and non-authoritative"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task167 agent adapter OS-isolation readiness tests passed.");
