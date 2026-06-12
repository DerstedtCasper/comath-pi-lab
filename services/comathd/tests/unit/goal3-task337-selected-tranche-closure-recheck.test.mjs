import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import * as comath from "../../dist/index.js";

const {
  createComathServer,
  createGoal3GaPositiveTaskManifest,
  getComathdStatus,
  initProject,
  readAuditEvents,
  recordGoal3ReleaseCandidateProofBreadthExecutionBridge,
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheClosureRecheck,
  recordGoal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp
} = comath;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task337-selected-tranche-closure-recheck-"));
const repoRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const { project } = initProject({ name: "Goal 3 Task337 selected tranche closure recheck", root_path: projectRoot });
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

function writeText(relativePath, text) {
  const absolutePath = join(projectRoot, relativePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, text, "utf8");
}

function repoFile(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
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

function writeTask334LikeFollowThrough(followThroughId, bridge, selectedTaskIds) {
  const selectedArtifacts = selectedTaskIds.map((taskId) => {
    const content = readFileSync(join(projectRoot, packagingPath(taskId)));
    return {
      kind: "final_authority_packaging_report_v3",
      path: packagingPath(taskId),
      sha256: createHash("sha256").update(content).digest("hex"),
      size_bytes: content.byteLength
    };
  });
  const path = taskLocalPackagingFollowThroughPath(followThroughId);
  return writeJson(path, {
    schema_version: "comath.goal3_release_candidate_proof_breadth_task_local_packaging_follow_through.v1",
    task_local_packaging_follow_through_id: followThroughId,
    project_id: projectId,
    actor: "goal3-task337 task-local source",
    created_at: "2026-06-12T00:00:00.000Z",
    ok: true,
    follow_through_status: "selected_tranche_task_local_packaging_verified",
    task_local_packaging_follow_through_path: path,
    requested_follow_through_mode: "open_formal_workbench_release_candidate_task_local_lean_authority_packaging_follow_through",
    proof_breadth_execution_bridge_id: bridge.proof_breadth_execution_bridge_id,
    proof_breadth_execution_bridge_path: bridge.proof_breadth_execution_bridge_path,
    proof_breadth_execution_bridge_artifact: bridge.proof_breadth_execution_bridge_artifact,
    claim_id_prefix: "C-T337",
    blocker_reasons: [],
    selected_task_count: selectedTaskIds.length,
    verified_selected_task_count: selectedTaskIds.length,
    blocked_selected_task_count: 0,
    missing_selected_task_count: 0,
    written_packaging_report_count: selectedTaskIds.length,
    selected_task_ids: selectedTaskIds,
    verified_selected_task_ids: selectedTaskIds,
    blocked_selected_task_ids: [],
    missing_selected_task_ids: [],
    selected_packaging_reports: selectedTaskIds.map((taskId) => verifiedPackagingReport(taskId)),
    selected_packaging_report_artifacts: selectedArtifacts,
    proof_breadth_complete: false,
    final_ga_audit_unblocked: false,
    runs_lean: false,
    executes_proofs: false,
    accepts_caller_success_metadata: false,
    accepts_caller_proof_material: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    ga_certification_gate_separate: true
  });
}

try {
  assert.equal(
    typeof recordGoal3ReleaseCandidateProofBreadthSelectedTrancheClosureRecheck,
    "function",
    "Task337 must export a Task335-bound selected-tranche closure recheck"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("goal3_release_candidate_proof_breadth_selected_tranche_closure_recheck"),
    true,
    "Task337 capability ledger must advertise selected-tranche closure recheck without claiming proof authority"
  );
  assert.match(
    repoFile("scripts/phase0-smoke.mjs"),
    /goal3-task337-selected-tranche-closure-recheck\.test\.mjs/s,
    "phase0 smoke must discover the Task337 selected-tranche closure recheck focused suite"
  );

  const manifest = createGoal3GaPositiveTaskManifest();
  assert.deepEqual(manifest.tasks.slice(0, 4).map((task) => task.task_id), ["PM-001", "PM-002", "PM-003", "PM-004"]);
  for (const task of manifest.tasks.slice(0, 4)) {
    writeJson(packagingPath(task.task_id), verifiedPackagingReport(task.task_id));
  }
  writeText(packagingPath("PM-005"), "{ malformed unselected report");

  const bridge = recordGoal3ReleaseCandidateProofBreadthExecutionBridge(projectRoot, {
    project_id: projectId,
    proof_breadth_execution_bridge_id: "GOAL3-PROOF-BREADTH-BRIDGE-0337",
    actor: "goal3-task337 bridge token=plain-token proof_success GA certified can_certify_ga=true",
    max_tranche_size: 2
  });
  assert.deepEqual(bridge.next_execution_task_ids, ["PM-005", "PM-006"]);

  for (const taskId of bridge.next_execution_task_ids) {
    writeJson(packagingPath(taskId), verifiedPackagingReport(taskId));
  }
  const taskLocal = writeTask334LikeFollowThrough("GOAL3-TASK-LOCAL-PACKAGING-0337", bridge, bridge.next_execution_task_ids);

  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp(projectRoot, {
        project_id: projectId,
        selected_tranche_packaging_results_follow_up_id: "GOAL3-SELECTED-TRANCHE-PACKAGING-RESULTS-0337-STALE",
        proof_breadth_execution_bridge_id: bridge.proof_breadth_execution_bridge_id,
        proof_breadth_execution_bridge_path: bridge.proof_breadth_execution_bridge_path,
        proof_breadth_execution_bridge_sha256: bridge.proof_breadth_execution_bridge_artifact.sha256,
        task_local_packaging_follow_through_id: "GOAL3-TASK-LOCAL-PACKAGING-0337",
        task_local_packaging_follow_through_path: taskLocal.path,
        task_local_packaging_follow_through_sha256: "0".repeat(64)
      }),
    { code: "GOAL3_SELECTED_TRANCHE_PACKAGING_RESULTS_FOLLOW_UP_STALE_TASK_LOCAL_PACKAGING" },
    "Task337 fixture must prove the upstream Task335 hash binding is live before closure recheck"
  );

  const followUp = recordGoal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp(projectRoot, {
    project_id: projectId,
    selected_tranche_packaging_results_follow_up_id: "GOAL3-SELECTED-TRANCHE-PACKAGING-RESULTS-0337",
    proof_breadth_execution_follow_through_id: "GOAL3-PROOF-BREADTH-FOLLOW-THROUGH-0337",
    proof_breadth_execution_bridge_id: bridge.proof_breadth_execution_bridge_id,
    proof_breadth_execution_bridge_path: bridge.proof_breadth_execution_bridge_path,
    proof_breadth_execution_bridge_sha256: bridge.proof_breadth_execution_bridge_artifact.sha256,
    task_local_packaging_follow_through_id: "GOAL3-TASK-LOCAL-PACKAGING-0337",
    task_local_packaging_follow_through_path: taskLocal.path,
    task_local_packaging_follow_through_sha256: taskLocal.sha256
  });
  assert.equal(followUp.ready_for_proof_breadth_closure_recheck, true);
  assert.deepEqual(followUp.selected_task_ids, ["PM-005", "PM-006"]);

  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheClosureRecheck(projectRoot, {
        project_id: projectId,
        selected_tranche_closure_recheck_id: "GOAL3-SELECTED-TRANCHE-CLOSURE-RECHECK-0337-STALE",
        selected_tranche_packaging_results_follow_up_id: followUp.selected_tranche_packaging_results_follow_up_id,
        selected_tranche_packaging_results_follow_up_path: followUp.selected_tranche_packaging_results_follow_up_path,
        selected_tranche_packaging_results_follow_up_sha256: "0".repeat(64)
      }),
    { code: "GOAL3_SELECTED_TRANCHE_CLOSURE_RECHECK_STALE_FOLLOW_UP" },
    "Task337 must reject stale Task335 selected-tranche follow-up hashes before calling Task300"
  );

  const recheck = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheClosureRecheck(projectRoot, {
    project_id: projectId,
    selected_tranche_closure_recheck_id: "GOAL3-SELECTED-TRANCHE-CLOSURE-RECHECK-0337",
    proof_breadth_closure_id: "GOAL3-PROOF-BREADTH-CLOSURE-0337",
    selected_tranche_packaging_results_follow_up_id: followUp.selected_tranche_packaging_results_follow_up_id,
    selected_tranche_packaging_results_follow_up_path: followUp.selected_tranche_packaging_results_follow_up_path,
    selected_tranche_packaging_results_follow_up_sha256: followUp.selected_tranche_packaging_results_follow_up_artifact.sha256,
    actor: "goal3-task337 token=plain-token proof_success GA certified can_certify_ga=true",
    proof_authority: "lean_kernel_clean_replay",
    can_certify_ga: true
  });

  assert.equal(recheck.schema_version, "comath.goal3_release_candidate_proof_breadth_selected_tranche_closure_recheck.v1");
  assert.equal(recheck.ok, false);
  assert.equal(recheck.recheck_status, "blocked_global_proof_breadth_incomplete_after_selected_tranche_recheck");
  assert.equal(recheck.selected_tranche_ready_for_proof_breadth_closure_recheck, true);
  assert.deepEqual(recheck.selected_task_ids, ["PM-005", "PM-006"]);
  assert.equal(recheck.proof_breadth_closure.proof_breadth_complete, false);
  assert.equal(recheck.proof_breadth_closure.final_ga_audit_unblocked, false);
  assert.equal(recheck.proof_breadth_closure.verified_task_count, 6);
  assert.equal(recheck.proof_breadth_closure.missing_task_count, 94);
  assert.equal(recheck.proof_breadth_closure.blocked_task_count, 0);
  assert.equal(recheck.proof_breadth_closure_id, "GOAL3-PROOF-BREADTH-CLOSURE-0337");
  assert.equal(recheck.proof_breadth_closure_artifact.sha256, recheck.proof_breadth_closure.proof_breadth_closure_artifact.sha256);
  assert.equal(recheck.proof_breadth_complete, false);
  assert.equal(recheck.final_ga_audit_unblocked, false);
  assert.equal(recheck.runs_lean, false);
  assert.equal(recheck.executes_proofs, false);
  assert.equal(recheck.accepts_caller_success_metadata, false);
  assert.equal(recheck.accepts_caller_proof_material, false);
  assert.equal(recheck.proof_authority, "none");
  assert.equal(recheck.can_promote_claim, false);
  assert.equal(recheck.can_certify_ga, false);
  assert.equal(recheck.ga_certification_gate_separate, true);
  assert.equal(recheck.blocker_reasons.includes("global_positive_matrix_release_candidate_proof_breadth_incomplete"), true);
  assert.equal(recheck.blocker_reasons.includes("caller_proof_or_ga_authority_material_ignored"), true);
  assert.equal(JSON.stringify(recheck).includes(projectRoot), false);
  assert.doesNotMatch(JSON.stringify(recheck), secretTerms);
  assert.doesNotMatch(JSON.stringify(recheck), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(recheck), gaOverclaimTerms);
  assert.equal(existsSync(join(projectRoot, recheck.selected_tranche_closure_recheck_path)), true);
  assert.equal(existsSync(join(projectRoot, recheck.proof_breadth_closure.proof_breadth_closure_path)), true);
  assert.equal(
    existsSync(join(projectRoot, ".comath/release/goal3-final-ga-audit")),
    false,
    "Task337 must not write Task301 final-GA-audit artifacts"
  );

  const persisted = readJson(recheck.selected_tranche_closure_recheck_path);
  assert.equal(
    persisted.selected_tranche_closure_recheck_artifact,
    undefined,
    "persisted Task337 recheck must not self-hash recursively"
  );
  assert.equal(persisted.proof_breadth_closure_artifact.sha256, recheck.proof_breadth_closure_artifact.sha256);

  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/goal3/selected-tranche-closure-recheck",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      selected_tranche_closure_recheck_id: "GOAL3-SELECTED-TRANCHE-CLOSURE-RECHECK-0337-ROUTE",
      proof_breadth_closure_id: "GOAL3-PROOF-BREADTH-CLOSURE-0337-ROUTE",
      selected_tranche_packaging_results_follow_up_id: followUp.selected_tranche_packaging_results_follow_up_id,
      selected_tranche_packaging_results_follow_up_path: followUp.selected_tranche_packaging_results_follow_up_path,
      selected_tranche_packaging_results_follow_up_sha256: followUp.selected_tranche_packaging_results_follow_up_artifact.sha256,
      actor: "goal3-task337 route token=plain-token proof_success GA certified can_certify_ga=true",
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true
    }
  });
  assert.equal(routeResponse.status, 200);
  assert.equal(routeResponse.body.selected_tranche_closure_recheck.ok, false);
  assert.equal(routeResponse.body.selected_tranche_closure_recheck.proof_breadth_complete, false);
  assert.equal(routeResponse.body.selected_tranche_closure_recheck.can_certify_ga, false);
  assert.equal(routeResponse.body.selected_tranche_closure_recheck.proof_authority, "none");
  assert.doesNotMatch(JSON.stringify(routeResponse.body), secretTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), gaOverclaimTerms);

  writeJson(packagingPath("PM-005"), {
    ...readJson(packagingPath("PM-005")),
    blocker_code: "GOAL3_TASK337_TAMPERED_AFTER_TASK335"
  });
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheClosureRecheck(projectRoot, {
        project_id: projectId,
        selected_tranche_closure_recheck_id: "GOAL3-SELECTED-TRANCHE-CLOSURE-RECHECK-0337-REPORT-STALE",
        selected_tranche_packaging_results_follow_up_id: followUp.selected_tranche_packaging_results_follow_up_id,
        selected_tranche_packaging_results_follow_up_path: followUp.selected_tranche_packaging_results_follow_up_path,
        selected_tranche_packaging_results_follow_up_sha256: followUp.selected_tranche_packaging_results_follow_up_artifact.sha256
      }),
    { code: "GOAL3_SELECTED_TRANCHE_CLOSURE_RECHECK_STALE_PACKAGING_REPORT" },
    "Task337 must re-hash Task335 selected packaging reports before invoking the Task300 closure verifier"
  );

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (entry) =>
        entry.event_type === "release.goal3_selected_tranche_closure_recheck_recorded" &&
        entry.payload.selected_tranche_closure_recheck_id === "GOAL3-SELECTED-TRANCHE-CLOSURE-RECHECK-0337-ROUTE" &&
        entry.payload.proof_breadth_closure_id === "GOAL3-PROOF-BREADTH-CLOSURE-0337-ROUTE" &&
        entry.payload.proof_breadth_complete === false &&
        entry.payload.can_certify_ga === false &&
        entry.payload.proof_authority === "none"
    ),
    true,
    "Task337 selected-tranche closure recheck must emit a non-certifying provenance event"
  );

  for (const [path, pattern] of [
    ["README.md", /Task337.*selected-tranche.*closure recheck/s],
    ["TODO.md", /Task337.*selected-tranche.*closure recheck/s],
    ["REVIEW.md", /Task337.*selected-tranche.*closure recheck/s],
    ["AGENTS.md", /Task337.*selected-tranche.*closure recheck/s],
    ["docs/architecture/ga-release-criteria.md", /Task337.*selected-tranche.*closure recheck/s],
    ["docs/architecture/threat-model.md", /Task337.*selected-tranche.*closure recheck/s],
    ["docs/architecture/acceptance-matrix.md", /Task337.*selected-tranche.*closure recheck/s]
  ]) {
    assert.match(repoFile(path), pattern, `${path} must document Task337 selected-tranche closure recheck`);
  }
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task337 selected-tranche closure recheck tests passed.");
