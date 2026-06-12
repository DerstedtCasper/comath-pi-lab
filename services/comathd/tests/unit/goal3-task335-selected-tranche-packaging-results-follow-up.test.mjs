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
  recordGoal3ReleaseCandidateProofBreadthExecutionBridge,
  recordGoal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp,
  recordGoal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThrough
} = comath;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task335-packaging-results-follow-up-"));
const { project } = initProject({ name: "Goal 3 Task335 selected tranche packaging results follow-up", root_path: projectRoot });
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

function writeText(relativePath, text) {
  const absolutePath = join(projectRoot, relativePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, text, "utf8");
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(projectRoot, relativePath), "utf8"));
}

function packagingPath(taskId) {
  return `.comath/release/positive_matrix/${taskId}/final_authority_packaging_report_v3.json`;
}

function taskLocalPackagingFollowThroughPath(followThroughId) {
  return `.comath/release/goal3-task-local-packaging-follow-through/${followThroughId}/follow-through.json`;
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
    typeof recordGoal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp,
    "function",
    "Task335 must export a Task334-bound selected-tranche packaging results follow-up"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("goal3_release_candidate_proof_breadth_selected_tranche_packaging_results_follow_up"),
    true,
    "Task335 capability ledger must advertise selected-tranche packaging results follow-up without claiming authority"
  );

  const manifest = createGoal3GaPositiveTaskManifest();
  assert.deepEqual(manifest.tasks.slice(0, 4).map((task) => task.task_id), ["PM-001", "PM-002", "PM-003", "PM-004"]);
  for (const task of manifest.tasks.slice(0, 2)) {
    writeJson(packagingPath(task.task_id), verifiedPackagingReport(task.task_id));
  }

  const bridge = recordGoal3ReleaseCandidateProofBreadthExecutionBridge(projectRoot, {
    project_id: projectId,
    proof_breadth_execution_bridge_id: "GOAL3-PROOF-BREADTH-BRIDGE-0335",
    actor: "goal3-task335 bridge token=plain-token proof_success GA certified can_certify_ga=true",
    max_tranche_size: 2
  });
  assert.deepEqual(bridge.next_execution_task_ids, ["PM-003", "PM-004"]);

  const packagingFollowThrough = recordGoal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThrough(projectRoot, {
    project_id: projectId,
    task_local_packaging_follow_through_id: "GOAL3-TASK-LOCAL-PACKAGING-0335",
    proof_breadth_execution_bridge_id: bridge.proof_breadth_execution_bridge_id,
    proof_breadth_execution_bridge_path: bridge.proof_breadth_execution_bridge_path,
    proof_breadth_execution_bridge_sha256: bridge.proof_breadth_execution_bridge_artifact.sha256,
    claim_id_prefix: "C-T335",
    actor: "goal3-task335 packaging token=plain-token proof_success GA certified can_certify_ga=true"
  });
  assert.deepEqual(packagingFollowThrough.selected_task_ids, ["PM-003", "PM-004"]);
  assert.deepEqual(packagingFollowThrough.blocked_selected_task_ids, ["PM-003", "PM-004"]);
  assert.equal(packagingFollowThrough.selected_packaging_report_artifacts.length, 2);

  writeText(packagingPath("PM-005"), "{ malformed unselected report");

  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp(projectRoot, {
        project_id: projectId,
        selected_tranche_packaging_results_follow_up_id: "GOAL3-SELECTED-TRANCHE-PACKAGING-RESULTS-0335-STALE",
        proof_breadth_execution_bridge_id: bridge.proof_breadth_execution_bridge_id,
        proof_breadth_execution_bridge_path: bridge.proof_breadth_execution_bridge_path,
        proof_breadth_execution_bridge_sha256: bridge.proof_breadth_execution_bridge_artifact.sha256,
        task_local_packaging_follow_through_id: packagingFollowThrough.task_local_packaging_follow_through_id,
        task_local_packaging_follow_through_path: packagingFollowThrough.task_local_packaging_follow_through_path,
        task_local_packaging_follow_through_sha256: "0".repeat(64)
      }),
    { code: "GOAL3_SELECTED_TRANCHE_PACKAGING_RESULTS_FOLLOW_UP_STALE_TASK_LOCAL_PACKAGING" },
    "Task335 must reject stale or tampered Task334 follow-through hashes"
  );

  const mismatchedTaskLocalPath = taskLocalPackagingFollowThroughPath("GOAL3-TASK-LOCAL-PACKAGING-0335-MISMATCH");
  const mismatchedTaskLocalArtifact = writeJson(mismatchedTaskLocalPath, {
    ...readJson(packagingFollowThrough.task_local_packaging_follow_through_path),
    task_local_packaging_follow_through_id: "GOAL3-TASK-LOCAL-PACKAGING-0335-MISMATCH",
    task_local_packaging_follow_through_path: mismatchedTaskLocalPath,
    selected_task_count: 2,
    selected_task_ids: ["PM-003", "PM-005"],
    blocked_selected_task_ids: ["PM-003", "PM-005"],
    selected_packaging_report_artifacts: [
      packagingFollowThrough.selected_packaging_report_artifacts[0],
      {
        kind: "final_authority_packaging_report_v3",
        path: packagingPath("PM-005"),
        sha256: "f".repeat(64),
        size_bytes: 27
      }
    ]
  });
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp(projectRoot, {
        project_id: projectId,
        selected_tranche_packaging_results_follow_up_id: "GOAL3-SELECTED-TRANCHE-PACKAGING-RESULTS-0335-MISMATCH",
        proof_breadth_execution_bridge_id: bridge.proof_breadth_execution_bridge_id,
        proof_breadth_execution_bridge_path: bridge.proof_breadth_execution_bridge_path,
        proof_breadth_execution_bridge_sha256: bridge.proof_breadth_execution_bridge_artifact.sha256,
        task_local_packaging_follow_through_id: "GOAL3-TASK-LOCAL-PACKAGING-0335-MISMATCH",
        task_local_packaging_follow_through_path: mismatchedTaskLocalPath,
        task_local_packaging_follow_through_sha256: mismatchedTaskLocalArtifact.sha256
      }),
    { code: "GOAL3_SELECTED_TRANCHE_PACKAGING_RESULTS_FOLLOW_UP_TASK_LOCAL_MISMATCH" },
    "Task335 must reject Task334 artifacts whose selected task ids are not the Task326 bridge selected tranche"
  );

  const followUp = recordGoal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp(projectRoot, {
    project_id: projectId,
    selected_tranche_packaging_results_follow_up_id: "GOAL3-SELECTED-TRANCHE-PACKAGING-RESULTS-0335",
    proof_breadth_execution_follow_through_id: "GOAL3-PROOF-BREADTH-FOLLOW-THROUGH-0335",
    proof_breadth_execution_bridge_id: bridge.proof_breadth_execution_bridge_id,
    proof_breadth_execution_bridge_path: bridge.proof_breadth_execution_bridge_path,
    proof_breadth_execution_bridge_sha256: bridge.proof_breadth_execution_bridge_artifact.sha256,
    task_local_packaging_follow_through_id: packagingFollowThrough.task_local_packaging_follow_through_id,
    task_local_packaging_follow_through_path: packagingFollowThrough.task_local_packaging_follow_through_path,
    task_local_packaging_follow_through_sha256: packagingFollowThrough.task_local_packaging_follow_through_artifact.sha256,
    actor: "goal3-task335 token=plain-token proof_success GA certified can_certify_ga=true",
    proof_authority: "lean_kernel_clean_replay",
    can_certify_ga: true,
    final_ga_audit_json: { ok: true },
    proof_breadth_closure_json: { proof_breadth_complete: true }
  });

  assert.equal(followUp.schema_version, "comath.goal3_release_candidate_proof_breadth_selected_tranche_packaging_results_follow_up.v1");
  assert.equal(followUp.ok, false);
  assert.equal(followUp.follow_up_status, "blocked_selected_tranche_packaging_results_incomplete");
  assert.equal(followUp.project_id, projectId);
  assert.equal(followUp.proof_breadth_execution_bridge_id, bridge.proof_breadth_execution_bridge_id);
  assert.equal(followUp.proof_breadth_execution_bridge_artifact.sha256, bridge.proof_breadth_execution_bridge_artifact.sha256);
  assert.equal(
    followUp.task_local_packaging_follow_through_artifact.sha256,
    packagingFollowThrough.task_local_packaging_follow_through_artifact.sha256
  );
  assert.deepEqual(followUp.selected_task_ids, ["PM-003", "PM-004"]);
  assert.deepEqual(followUp.verified_selected_task_ids, []);
  assert.deepEqual(followUp.missing_selected_task_ids, []);
  assert.deepEqual(followUp.blocked_selected_task_ids, ["PM-003", "PM-004"]);
  assert.equal(followUp.selected_task_count, 2);
  assert.equal(followUp.verified_selected_task_count, 0);
  assert.equal(followUp.missing_selected_task_count, 0);
  assert.equal(followUp.blocked_selected_task_count, 2);
  assert.equal(followUp.selected_packaging_report_artifacts_current, true);
  assert.equal(followUp.selected_packaging_report_artifacts.length, 2);
  assert.equal(followUp.proof_breadth_execution_follow_through.ready_for_proof_breadth_closure_recheck, false);
  assert.equal(followUp.ready_for_proof_breadth_closure_recheck, false);
  assert.equal(followUp.proof_breadth_complete, false);
  assert.equal(followUp.final_ga_audit_unblocked, false);
  assert.equal(followUp.runs_lean, false);
  assert.equal(followUp.executes_proofs, false);
  assert.equal(followUp.accepts_caller_success_metadata, false);
  assert.equal(followUp.accepts_caller_proof_material, false);
  assert.equal(followUp.proof_authority, "none");
  assert.equal(followUp.can_promote_claim, false);
  assert.equal(followUp.can_certify_ga, false);
  assert.equal(followUp.ga_certification_gate_separate, true);
  assert.equal(followUp.blocker_reasons.includes("selected_positive_matrix_tranche_packaging_results_incomplete"), true);
  assert.equal(followUp.blocker_reasons.includes("caller_proof_or_ga_authority_material_ignored"), true);
  assert.equal(JSON.stringify(followUp).includes(projectRoot), false);
  assert.doesNotMatch(JSON.stringify(followUp), secretTerms);
  assert.doesNotMatch(JSON.stringify(followUp), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(followUp), gaOverclaimTerms);
  assert.equal(existsSync(join(projectRoot, followUp.selected_tranche_packaging_results_follow_up_path)), true);
  assert.equal(existsSync(join(projectRoot, followUp.proof_breadth_execution_follow_through_path)), true);
  assert.equal(
    existsSync(join(projectRoot, ".comath/release/goal3-proof-breadth-closure")),
    false,
    "Task335 must not write the Task300 proof-breadth closure artifact"
  );
  assert.equal(
    existsSync(join(projectRoot, ".comath/release/goal3-final-ga-audit")),
    false,
    "Task335 must not write the Task301 final-GA-audit artifact"
  );

  const persisted = readJson(followUp.selected_tranche_packaging_results_follow_up_path);
  assert.equal(
    persisted.selected_tranche_packaging_results_follow_up_artifact,
    undefined,
    "persisted Task335 follow-up must not self-hash recursively"
  );
  assert.deepEqual(persisted.selected_task_ids, ["PM-003", "PM-004"]);
  assert.equal(persisted.proof_breadth_execution_follow_through_artifact.sha256, followUp.proof_breadth_execution_follow_through_artifact.sha256);

  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/goal3/selected-tranche-packaging-results-follow-up",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      selected_tranche_packaging_results_follow_up_id: "GOAL3-SELECTED-TRANCHE-PACKAGING-RESULTS-0335-ROUTE",
      proof_breadth_execution_follow_through_id: "GOAL3-PROOF-BREADTH-FOLLOW-THROUGH-0335-ROUTE",
      proof_breadth_execution_bridge_id: bridge.proof_breadth_execution_bridge_id,
      proof_breadth_execution_bridge_path: bridge.proof_breadth_execution_bridge_path,
      proof_breadth_execution_bridge_sha256: bridge.proof_breadth_execution_bridge_artifact.sha256,
      task_local_packaging_follow_through_id: packagingFollowThrough.task_local_packaging_follow_through_id,
      task_local_packaging_follow_through_path: packagingFollowThrough.task_local_packaging_follow_through_path,
      task_local_packaging_follow_through_sha256: packagingFollowThrough.task_local_packaging_follow_through_artifact.sha256,
      actor: "goal3-task335 route token=plain-token proof_success GA certified can_certify_ga=true",
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true
    }
  });
  assert.equal(routeResponse.status, 200);
  assert.equal(routeResponse.body.selected_tranche_packaging_results_follow_up.ok, false);
  assert.deepEqual(routeResponse.body.selected_tranche_packaging_results_follow_up.selected_task_ids, ["PM-003", "PM-004"]);
  assert.equal(routeResponse.body.selected_tranche_packaging_results_follow_up.can_certify_ga, false);
  assert.equal(routeResponse.body.selected_tranche_packaging_results_follow_up.proof_authority, "none");
  assert.doesNotMatch(JSON.stringify(routeResponse.body), secretTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), gaOverclaimTerms);

  writeJson(packagingPath("PM-003"), {
    ...readJson(packagingPath("PM-003")),
    blocker_code: "GOAL3_TASK335_TAMPERED_AFTER_TASK334"
  });
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp(projectRoot, {
        project_id: projectId,
        selected_tranche_packaging_results_follow_up_id: "GOAL3-SELECTED-TRANCHE-PACKAGING-RESULTS-0335-REPORT-STALE",
        proof_breadth_execution_bridge_id: bridge.proof_breadth_execution_bridge_id,
        proof_breadth_execution_bridge_path: bridge.proof_breadth_execution_bridge_path,
        proof_breadth_execution_bridge_sha256: bridge.proof_breadth_execution_bridge_artifact.sha256,
        task_local_packaging_follow_through_id: packagingFollowThrough.task_local_packaging_follow_through_id,
        task_local_packaging_follow_through_path: packagingFollowThrough.task_local_packaging_follow_through_path,
        task_local_packaging_follow_through_sha256: packagingFollowThrough.task_local_packaging_follow_through_artifact.sha256
      }),
    { code: "GOAL3_SELECTED_TRANCHE_PACKAGING_RESULTS_FOLLOW_UP_STALE_PACKAGING_REPORT" },
    "Task335 must re-hash the selected canonical packaging reports recorded by Task334"
  );

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (entry) =>
        entry.event_type === "release.goal3_selected_tranche_packaging_results_follow_up_recorded" &&
        entry.payload.selected_tranche_packaging_results_follow_up_id ===
          "GOAL3-SELECTED-TRANCHE-PACKAGING-RESULTS-0335-ROUTE" &&
        entry.payload.selected_task_ids.join(",") === "PM-003,PM-004" &&
        entry.payload.can_certify_ga === false &&
        entry.payload.proof_authority === "none"
    ),
    true,
    "Task335 follow-up must emit a non-certifying provenance event"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task335 selected-tranche packaging results follow-up tests passed.");
