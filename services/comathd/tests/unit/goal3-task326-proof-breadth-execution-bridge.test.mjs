import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as comath from "../../dist/index.js";

const {
  createComathServer,
  createGoal3GaPositiveTaskManifest,
  getComathdStatus,
  initProject,
  readAuditEvents,
  recordGoal3ReleaseCandidateProofBreadthExecutionBridge
} = comath;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task326-proof-breadth-bridge-"));
const { project } = initProject({ name: "Goal 3 Task326 proof breadth execution bridge", root_path: projectRoot });
const projectId = project.project_id;
const secretTerms = /Authorization:\s*Bearer|api_key|token=|plain-token|\bsk-[A-Za-z0-9_-]+/i;
const proofAuthorityTerms =
  /clean_replay_passed\s*[:=]\s*(?:true|1)|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|kernel_checked|proof_success/i;
const gaOverclaimTerms = /GA certified|can_certify_ga\s*[:=]\s*(?:true|1)|can_promote_claim\s*[:=]\s*(?:true|1)/i;
const evidenceClasses = [
  "lean_run_manifest_v3",
  "final_replay_manifest_v3",
  "structured_audit",
  "dependency_closure",
  "axiom_profile",
  "statement_check",
  "third_party_replay_pack",
  "formal_spec_lock_binding",
  "assumption_ledger_binding",
  "dependency_lock_binding",
  "artifact_hash_binding",
  "toolchain_hash_binding",
  "replay_manifest_hash_binding"
];

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

function packagingPath(taskId) {
  return `.comath/release/positive_matrix/${taskId}/final_authority_packaging_report_v3.json`;
}

function verifiedPackagingReport(taskId) {
  return {
    schema_version: "comath.final_authority_packaging.v3",
    binding_scope: "positive_matrix",
    task_id: taskId,
    claim_id: `C-${taskId}`,
    final_evidence_status: "verified_final_authority_evidence",
    blocker_code: "",
    blocker_detail: `${taskId} verified by task-local Lean Authority v3 evidence.`,
    missing_final_evidence_classes: [],
    lean_run_manifest_paths: [`.comath/evidence/${taskId}/lean/run.manifest.json`],
    final_replay_manifest_v3_path: `.comath/evidence/${taskId}/lean/final_replay_manifest_v3.json`,
    structured_audit_path: `.comath/evidence/${taskId}/lean/structured_audit.json`,
    dependency_closure_path: `.comath/evidence/${taskId}/lean/dependency_closure.json`,
    axiom_profile_path: `.comath/evidence/${taskId}/lean/axiom_profile.json`,
    statement_check_path: `.comath/evidence/${taskId}/lean/statement_equivalence.json`,
    third_party_replay_pack_path: `.comath/evidence/${taskId}/lean/replay_pack`,
    source_verification: {
      verification_basis: "project_local_artifacts",
      caller_success_metadata_trusted: false,
      verified_final_evidence_classes: evidenceClasses,
      missing_final_evidence_classes: [],
      lean_run_manifest_paths_checked: 1
    },
    blocker_path: "",
    packaging_report_path: packagingPath(taskId),
    source_packaging_report_path: `.comath/release/positive_matrix/${taskId}/derived_final_authority_bindings_v3.json`,
    proof_authority: "lean_kernel_clean_replay",
    can_promote_claim: false,
    promotion_requires_gate: true
  };
}

try {
  assert.equal(
    typeof recordGoal3ReleaseCandidateProofBreadthExecutionBridge,
    "function",
    "Task326 must export a service-owned proof-breadth execution bridge"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("goal3_release_candidate_proof_breadth_execution_bridge"),
    true,
    "Task326 capability ledger must advertise the proof-breadth execution bridge without claiming certification"
  );

  for (const task of createGoal3GaPositiveTaskManifest().tasks.slice(0, 2)) {
    writeJson(packagingPath(task.task_id), verifiedPackagingReport(task.task_id));
  }
  writeJson(packagingPath("PM-003"), {
    ...verifiedPackagingReport("PM-003"),
    final_evidence_status: "blocked_missing_final_evidence",
    missing_final_evidence_classes: ["final_replay_manifest_v3"],
    proof_authority: "none"
  });

  const bridge = recordGoal3ReleaseCandidateProofBreadthExecutionBridge(projectRoot, {
    project_id: projectId,
    proof_breadth_execution_bridge_id: "GOAL3-PROOF-BREADTH-BRIDGE-0326",
    actor: "goal3-task326 reviewer token=plain-token proof_success GA certified can_certify_ga=true",
    max_tranche_size: 2,
    proof_breadth_matrix: {
      clean_replay_passed: 100,
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true
    }
  });

  assert.equal(bridge.schema_version, "comath.goal3_release_candidate_proof_breadth_execution_bridge.v1");
  assert.equal(bridge.ok, true);
  assert.equal(bridge.bridge_status, "ready_for_bounded_proof_breadth_execution");
  assert.equal(bridge.proof_breadth_status, "blocked_positive_matrix_release_candidate_proof_breadth_incomplete");
  assert.equal(bridge.total_required_tasks, 100);
  assert.equal(bridge.verified_task_count, 2);
  assert.equal(bridge.blocked_task_count, 1);
  assert.equal(bridge.missing_task_count, 97);
  assert.deepEqual(bridge.next_execution_task_ids, ["PM-003", "PM-004"]);
  assert.equal(bridge.next_execution_targets.length, 2);
  assert.equal(bridge.next_execution_targets[0].task_id, "PM-003");
  assert.equal(bridge.next_execution_targets[0].target_status, "blocked_existing_packaging_report");
  assert.equal(bridge.next_execution_targets[0].expected_packaging_report_path, packagingPath("PM-003"));
  assert.equal(bridge.next_execution_targets[1].task_id, "PM-004");
  assert.equal(bridge.next_execution_targets[1].target_status, "missing_final_authority_packaging_report");
  assert.equal(bridge.next_execution_targets[1].expected_packaging_report_path, packagingPath("PM-004"));
  assert.deepEqual(bridge.next_execution_targets[0].required_final_evidence_classes, evidenceClasses);
  assert.equal(bridge.proof_breadth_complete, false);
  assert.equal(bridge.final_ga_audit_unblocked, false);
  assert.equal(bridge.runs_lean, false);
  assert.equal(bridge.executes_proofs, false);
  assert.equal(bridge.accepts_caller_proof_material, false);
  assert.equal(bridge.proof_authority, "none");
  assert.equal(bridge.can_promote_claim, false);
  assert.equal(bridge.can_certify_ga, false);
  assert.equal(bridge.ga_certification_gate_separate, true);
  assert.equal(bridge.blocker_reasons.includes("positive_matrix_release_candidate_proof_breadth_incomplete"), true);
  assert.equal(bridge.blocker_reasons.includes("caller_proof_breadth_material_ignored"), true);
  assert.equal(JSON.stringify(bridge).includes(projectRoot), false);
  assert.doesNotMatch(JSON.stringify(bridge), secretTerms);
  assert.doesNotMatch(JSON.stringify(bridge), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(bridge), gaOverclaimTerms);
  assert.equal(existsSync(join(projectRoot, bridge.proof_breadth_execution_bridge_path)), true);

  const persisted = readJson(bridge.proof_breadth_execution_bridge_path);
  assert.equal(
    persisted.proof_breadth_execution_bridge_artifact,
    undefined,
    "persisted proof-breadth execution bridge must not self-hash recursively"
  );
  assert.deepEqual(persisted.next_execution_task_ids, ["PM-003", "PM-004"]);

  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthExecutionBridge(projectRoot, {
        project_id: projectId,
        proof_breadth_execution_bridge_id: "GOAL3-PROOF-BREADTH-BRIDGE-0326"
      }),
    { code: "GOAL3_PROOF_BREADTH_EXECUTION_BRIDGE_ALREADY_EXISTS" },
    "Task326 bridge ids must be append-only"
  );

  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/goal3/proof-breadth-execution-bridge",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      proof_breadth_execution_bridge_id: "GOAL3-PROOF-BREADTH-BRIDGE-0326-ROUTE",
      actor: "goal3-task326 route token=plain-token proof_success GA certified can_certify_ga=true",
      max_tranche_size: 1,
      proof_breadth_matrix_sha256: "a".repeat(64)
    }
  });
  assert.equal(routeResponse.status, 200);
  assert.equal(routeResponse.body.proof_breadth_execution_bridge.ok, true);
  assert.deepEqual(routeResponse.body.proof_breadth_execution_bridge.next_execution_task_ids, ["PM-003"]);
  assert.equal(routeResponse.body.proof_breadth_execution_bridge.can_certify_ga, false);
  assert.equal(routeResponse.body.proof_breadth_execution_bridge.proof_authority, "none");
  assert.doesNotMatch(JSON.stringify(routeResponse.body), secretTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), gaOverclaimTerms);

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (entry) =>
        entry.event_type === "release.goal3_proof_breadth_execution_bridge_recorded" &&
        entry.payload.proof_breadth_execution_bridge_id === "GOAL3-PROOF-BREADTH-BRIDGE-0326-ROUTE" &&
        entry.payload.next_execution_task_ids.join(",") === "PM-003" &&
        entry.payload.can_certify_ga === false
    ),
    true,
    "Task326 bridge must emit a non-certifying provenance event"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task326 proof breadth execution bridge tests passed.");
