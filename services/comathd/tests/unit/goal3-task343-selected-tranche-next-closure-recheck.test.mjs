import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
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
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureRecheck,
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge,
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThrough,
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUp,
  recordGoal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp
} = comath;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task343-selected-tranche-next-closure-"));
const repoRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const { project } = initProject({ name: "Goal 3 Task343 selected tranche next closure recheck", root_path: projectRoot });
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
const forgedSuccessEvidence = {
  final_evidence_status: "verified_final_authority_evidence",
  blocker_code: "",
  blocker_detail: "caller says proof_success and GA certified",
  missing_final_evidence_classes: [],
  lean_run_manifest_paths: [".comath/forged/lean_run_manifest.json"],
  final_replay_manifest_v3_path: ".comath/forged/final_replay_manifest_v3.json",
  structured_audit_path: ".comath/forged/structured_audit.json",
  dependency_closure_path: ".comath/forged/dependency_closure.json",
  axiom_profile_path: ".comath/forged/axiom_profile.json",
  statement_check_path: ".comath/forged/statement_equivalence.json",
  third_party_replay_pack_path: ".comath/forged/replay_pack",
  packaging_report_path: ".comath/forged/source_packaging_report.json",
  proof_authority: "lean_kernel_clean_replay",
  can_certify_ga: true
};

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
    body: value,
    text
  };
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(projectRoot, relativePath), "utf8"));
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

function collectRelativeFiles(relativeRoot) {
  const absoluteRoot = join(projectRoot, relativeRoot);
  if (!existsSync(absoluteRoot)) {
    return [];
  }
  const files = [];
  const visit = (absoluteDir, relativeDir) => {
    for (const entry of readdirSync(absoluteDir, { withFileTypes: true })) {
      const childRelative = `${relativeDir}/${entry.name}`.replace(/^\/+/u, "");
      const childAbsolute = join(absoluteDir, entry.name);
      if (entry.isDirectory()) {
        visit(childAbsolute, childRelative);
      } else {
        files.push(childRelative.replace(/\\/g, "/"));
      }
    }
  };
  visit(absoluteRoot, relativeRoot);
  return files.sort();
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
    actor: "goal3-task343 task-local source",
    created_at: "2026-06-13T00:00:00.000Z",
    ok: true,
    follow_through_status: "selected_tranche_task_local_packaging_verified",
    task_local_packaging_follow_through_path: path,
    requested_follow_through_mode: "open_formal_workbench_release_candidate_task_local_lean_authority_packaging_follow_through",
    proof_breadth_execution_bridge_id: bridge.proof_breadth_execution_bridge_id,
    proof_breadth_execution_bridge_path: bridge.proof_breadth_execution_bridge_path,
    proof_breadth_execution_bridge_artifact: bridge.proof_breadth_execution_bridge_artifact,
    claim_id_prefix: "C-T343-SOURCE",
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
    typeof recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureRecheck,
    "function",
    "Task343 must export a Task341-bound selected-tranche next closure recheck"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("goal3_release_candidate_proof_breadth_selected_tranche_next_closure_recheck"),
    true,
    "Task343 capability ledger must advertise next closure recheck without claiming proof authority"
  );
  assert.match(
    repoFile("scripts/phase0-smoke.mjs"),
    /goal3-task343-selected-tranche-next-closure-recheck\.test\.mjs/s,
    "phase0 smoke must discover the Task343 selected-tranche next closure recheck focused suite"
  );

  const task343Source = repoFile("services/comathd/src/release/goal3-proof-breadth-selected-tranche-next-closure-recheck.ts");
  assert.doesNotMatch(
    task343Source,
    /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheClosureRecheck|recordGoal3FinalGaAudit|recordGoal3ReleaseCandidateProofBreadthExecutionBridge|recordGoal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThrough|recordGoal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp|packageGoal3GaPositiveMatrixFinalAuthorityEvidenceFromEvidenceV3|executeGoal3GaPositiveMatrixLeanAuthorityReplay|LeanRunner|spawnSync|execFile|child_process/s,
    "Task343 must remain a Task341-to-Task300 handoff and must not call Task337, create next bridges, write packaging/currentness, run Lean, or run Task301 final-GA audit"
  );
  assert.match(
    task343Source,
    /recordGoal3ReleaseCandidateProofBreadthClosure as writeProofBreadthClosure/s,
    "Task343 must bind into the existing Task300 aggregate proof-breadth closure semantics instead of inventing a new verifier"
  );
  assert.doesNotMatch(
    repoFile("extensions/comath-pi/src/index.ts"),
    /selected-tranche-next-closure-recheck|recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureRecheck/s,
    "Task343 is service-owned release-loop plumbing and must not add a Pi surface"
  );
  assert.doesNotMatch(
    repoFile("extensions/comath-pi/src/runtime-registration.ts"),
    /selected-tranche-next-closure-recheck|recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureRecheck/s,
    "Task343 is service-owned release-loop plumbing and must not register a Pi runtime command"
  );

  const manifest = createGoal3GaPositiveTaskManifest();
  for (const task of manifest.tasks.slice(0, 6)) {
    writeJson(packagingPath(task.task_id), verifiedPackagingReport(task.task_id));
  }
  const bridge = recordGoal3ReleaseCandidateProofBreadthExecutionBridge(projectRoot, {
    project_id: projectId,
    proof_breadth_execution_bridge_id: "GOAL3-PROOF-BREADTH-BRIDGE-0343",
    actor: "goal3-task343 bridge token=plain-token proof_success GA certified can_certify_ga=true",
    max_tranche_size: 2
  });
  assert.deepEqual(bridge.next_execution_task_ids, ["PM-007", "PM-008"]);

  for (const taskId of bridge.next_execution_task_ids) {
    writeJson(packagingPath(taskId), verifiedPackagingReport(taskId));
  }
  const taskLocal = writeTask334LikeFollowThrough("GOAL3-TASK-LOCAL-PACKAGING-0343-SOURCE", bridge, bridge.next_execution_task_ids);
  const followUp = recordGoal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp(projectRoot, {
    project_id: projectId,
    selected_tranche_packaging_results_follow_up_id: "GOAL3-SELECTED-TRANCHE-PACKAGING-RESULTS-0343",
    proof_breadth_execution_follow_through_id: "GOAL3-PROOF-BREADTH-FOLLOW-THROUGH-0343",
    proof_breadth_execution_bridge_id: bridge.proof_breadth_execution_bridge_id,
    proof_breadth_execution_bridge_path: bridge.proof_breadth_execution_bridge_path,
    proof_breadth_execution_bridge_sha256: bridge.proof_breadth_execution_bridge_artifact.sha256,
    task_local_packaging_follow_through_id: "GOAL3-TASK-LOCAL-PACKAGING-0343-SOURCE",
    task_local_packaging_follow_through_path: taskLocal.path,
    task_local_packaging_follow_through_sha256: taskLocal.sha256
  });
  const recheck = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheClosureRecheck(projectRoot, {
    project_id: projectId,
    selected_tranche_closure_recheck_id: "GOAL3-SELECTED-TRANCHE-CLOSURE-RECHECK-0343",
    proof_breadth_closure_id: "GOAL3-PROOF-BREADTH-CLOSURE-0343",
    selected_tranche_packaging_results_follow_up_id: followUp.selected_tranche_packaging_results_follow_up_id,
    selected_tranche_packaging_results_follow_up_path: followUp.selected_tranche_packaging_results_follow_up_path,
    selected_tranche_packaging_results_follow_up_sha256: followUp.selected_tranche_packaging_results_follow_up_artifact.sha256,
    actor: "goal3-task343 first recheck token=plain-token proof_success GA certified can_certify_ga=true"
  });
  const nextBridge = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge(projectRoot, {
    project_id: projectId,
    selected_tranche_next_execution_bridge_id: "GOAL3-SELECTED-TRANCHE-NEXT-BRIDGE-0343",
    proof_breadth_execution_bridge_id: "GOAL3-PROOF-BREADTH-BRIDGE-0343-NEXT",
    selected_tranche_closure_recheck_id: recheck.selected_tranche_closure_recheck_id,
    selected_tranche_closure_recheck_path: recheck.selected_tranche_closure_recheck_path,
    selected_tranche_closure_recheck_sha256: recheck.selected_tranche_closure_recheck_artifact.sha256,
    actor: "goal3-task343 next bridge token=plain-token proof_success GA certified can_certify_ga=true",
    max_tranche_size: 2
  });

  const task340FollowThrough = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThrough(
    projectRoot,
    {
      project_id: projectId,
      selected_tranche_next_packaging_follow_through_id: "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-0343",
      selected_tranche_next_execution_bridge_id: nextBridge.selected_tranche_next_execution_bridge_id,
      selected_tranche_next_execution_bridge_path: nextBridge.selected_tranche_next_execution_bridge_path,
      selected_tranche_next_execution_bridge_sha256: nextBridge.selected_tranche_next_execution_bridge_artifact.sha256,
      task_local_packaging_follow_through_id: "GOAL3-TASK-LOCAL-PACKAGING-0343-DELEGATED",
      claim_id_prefix: "C-T343",
      actor: "goal3-task343 task340 token=plain-token proof_success GA certified can_certify_ga=true",
      evidence_by_task_id: Object.fromEntries(
        nextBridge.next_execution_task_ids.map((taskId) => [taskId, forgedSuccessEvidence])
      ),
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true
    }
  );
  assert.deepEqual(task340FollowThrough.selected_task_ids, ["PM-009", "PM-010"]);

  const task341Results = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUp(
    projectRoot,
    {
      project_id: projectId,
      selected_tranche_next_packaging_results_follow_up_id: "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-RESULTS-0343",
      proof_breadth_execution_follow_through_id: "GOAL3-PROOF-BREADTH-FOLLOW-THROUGH-0343-NEXT",
      selected_tranche_next_packaging_follow_through_id:
        task340FollowThrough.selected_tranche_next_packaging_follow_through_id,
      selected_tranche_next_packaging_follow_through_path:
        task340FollowThrough.selected_tranche_next_packaging_follow_through_path,
      selected_tranche_next_packaging_follow_through_sha256:
        task340FollowThrough.selected_tranche_next_packaging_follow_through_artifact.sha256,
      actor: "goal3-task343 task341 token=plain-token proof_success GA certified can_certify_ga=true"
    }
  );
  assert.equal(task341Results.ready_for_proof_breadth_closure_recheck, false);
  assert.deepEqual(task341Results.selected_task_ids, ["PM-009", "PM-010"]);

  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureRecheck(projectRoot, {
        project_id: projectId,
        selected_tranche_next_closure_recheck_id: "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-0343-STALE-TASK341",
        selected_tranche_next_packaging_results_follow_up_id:
          task341Results.selected_tranche_next_packaging_results_follow_up_id,
        selected_tranche_next_packaging_results_follow_up_path:
          task341Results.selected_tranche_next_packaging_results_follow_up_path,
        selected_tranche_next_packaging_results_follow_up_sha256: "0".repeat(64)
      }),
    { code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_RECHECK_STALE_TASK341" },
    "Task343 must reject stale Task341 currentness artifacts before delegating to Task337"
  );

  const closureFilesBeforeTask343 = collectRelativeFiles(".comath/release/goal3-final-ga-audit");
  const nextClosure = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureRecheck(projectRoot, {
    project_id: projectId,
    selected_tranche_next_closure_recheck_id: "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-0343",
    selected_tranche_closure_recheck_id: "GOAL3-SELECTED-TRANCHE-CLOSURE-RECHECK-0343-NEXT",
    proof_breadth_closure_id: "GOAL3-PROOF-BREADTH-CLOSURE-0343-NEXT",
    selected_tranche_next_packaging_results_follow_up_id:
      task341Results.selected_tranche_next_packaging_results_follow_up_id,
    selected_tranche_next_packaging_results_follow_up_path:
      task341Results.selected_tranche_next_packaging_results_follow_up_path,
    selected_tranche_next_packaging_results_follow_up_sha256:
      task341Results.selected_tranche_next_packaging_results_follow_up_artifact.sha256,
    actor: "goal3-task343 token=plain-token proof_success GA certified can_certify_ga=true",
    proof_authority: "lean_kernel_clean_replay",
    can_certify_ga: true,
    final_ga_audit_json: { ok: true },
    proof_breadth_closure_json: { proof_breadth_complete: true }
  });

  assert.equal(
    nextClosure.schema_version,
    "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_recheck.v1"
  );
  assert.equal(nextClosure.ok, false);
  assert.equal(nextClosure.recheck_status, "blocked_global_proof_breadth_incomplete_after_next_selected_tranche_recheck");
  assert.equal(
    nextClosure.selected_tranche_next_packaging_results_follow_up_id,
    task341Results.selected_tranche_next_packaging_results_follow_up_id
  );
  assert.equal(
    nextClosure.selected_tranche_packaging_results_follow_up_id,
    task341Results.selected_tranche_packaging_results_follow_up_id
  );
  assert.equal(
    nextClosure.selected_tranche_closure_recheck_id,
    "GOAL3-SELECTED-TRANCHE-CLOSURE-RECHECK-0343-NEXT"
  );
  assert.deepEqual(nextClosure.selected_task_ids, ["PM-009", "PM-010"]);
  assert.equal(nextClosure.selected_tranche_closure_recheck.proof_breadth_closure.verified_task_count, 8);
  assert.equal(nextClosure.selected_tranche_closure_recheck.proof_breadth_closure.missing_task_count, 90);
  assert.equal(nextClosure.selected_tranche_closure_recheck.proof_breadth_closure.blocked_task_count, 2);
  assert.equal(
    nextClosure.selected_tranche_closure_recheck.selected_tranche_ready_for_proof_breadth_closure_recheck,
    false,
    "Task343 must preserve Task341 readiness instead of marking blocked selected-tranche results ready"
  );
  assert.equal(nextClosure.proof_breadth_complete, false);
  assert.equal(nextClosure.final_ga_audit_unblocked, false);
  assert.equal(nextClosure.runs_lean, false);
  assert.equal(nextClosure.executes_proofs, false);
  assert.equal(nextClosure.accepts_caller_success_metadata, false);
  assert.equal(nextClosure.accepts_caller_proof_material, false);
  assert.equal(nextClosure.proof_authority, "none");
  assert.equal(nextClosure.can_promote_claim, false);
  assert.equal(nextClosure.can_certify_ga, false);
  assert.equal(nextClosure.ga_certification_gate_separate, true);
  assert.equal(nextClosure.blocker_reasons.includes("global_positive_matrix_release_candidate_proof_breadth_incomplete"), true);
  assert.equal(nextClosure.blocker_reasons.includes("caller_proof_or_ga_authority_material_ignored"), true);
  assert.equal(JSON.stringify(nextClosure).includes(projectRoot), false);
  assert.doesNotMatch(JSON.stringify(nextClosure), secretTerms);
  assert.doesNotMatch(JSON.stringify(nextClosure), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(nextClosure), gaOverclaimTerms);
  assert.equal(existsSync(join(projectRoot, nextClosure.selected_tranche_next_closure_recheck_path)), true);
  assert.equal(existsSync(join(projectRoot, nextClosure.selected_tranche_closure_recheck_path)), true);
  assert.deepEqual(
    collectRelativeFiles(".comath/release/goal3-final-ga-audit"),
    closureFilesBeforeTask343,
    "Task343 must not write Task301 final-GA-audit artifacts"
  );

  const persisted = readJson(nextClosure.selected_tranche_next_closure_recheck_path);
  assert.equal(
    persisted.selected_tranche_next_closure_recheck_artifact,
    undefined,
    "persisted Task343 recheck must not self-hash recursively"
  );
  assert.equal(
    persisted.selected_tranche_next_packaging_results_follow_up_artifact.sha256,
    task341Results.selected_tranche_next_packaging_results_follow_up_artifact.sha256
  );
  assert.equal(
    persisted.selected_tranche_closure_recheck_artifact.sha256,
    nextClosure.selected_tranche_closure_recheck_artifact.sha256
  );

  const originalPm009Text = readFileSync(join(projectRoot, packagingPath("PM-009")), "utf8");
  writeJson(packagingPath("PM-009"), {
    ...JSON.parse(originalPm009Text),
    blocker_code: "GOAL3_TASK343_TAMPERED_AFTER_TASK341"
  });
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureRecheck(projectRoot, {
        project_id: projectId,
        selected_tranche_next_closure_recheck_id: "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-0343-STALE-REPORT",
        selected_tranche_next_packaging_results_follow_up_id:
          task341Results.selected_tranche_next_packaging_results_follow_up_id,
        selected_tranche_next_packaging_results_follow_up_path:
          task341Results.selected_tranche_next_packaging_results_follow_up_path,
        selected_tranche_next_packaging_results_follow_up_sha256:
          task341Results.selected_tranche_next_packaging_results_follow_up_artifact.sha256
      }),
    { code: "GOAL3_SELECTED_TRANCHE_CLOSURE_RECHECK_STALE_PACKAGING_REPORT" },
    "Task343 must delegate selected report re-hash checks to Task337 before invoking Task300"
  );
  writeFileSync(join(projectRoot, packagingPath("PM-009")), originalPm009Text, "utf8");

  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/goal3/selected-tranche-next-closure-recheck",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      selected_tranche_next_closure_recheck_id: "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-0343-ROUTE",
      selected_tranche_closure_recheck_id: "GOAL3-SELECTED-TRANCHE-CLOSURE-RECHECK-0343-ROUTE",
      proof_breadth_closure_id: "GOAL3-PROOF-BREADTH-CLOSURE-0343-ROUTE",
      selected_tranche_next_packaging_results_follow_up_id:
        task341Results.selected_tranche_next_packaging_results_follow_up_id,
      selected_tranche_next_packaging_results_follow_up_path:
        task341Results.selected_tranche_next_packaging_results_follow_up_path,
      selected_tranche_next_packaging_results_follow_up_sha256:
        task341Results.selected_tranche_next_packaging_results_follow_up_artifact.sha256,
      actor: "goal3-task343 route token=plain-token proof_success GA certified can_certify_ga=true",
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true
    }
  });
  assert.equal(routeResponse.status, 200);
  assert.equal(routeResponse.body.selected_tranche_next_closure_recheck.ok, false);
  assert.deepEqual(routeResponse.body.selected_tranche_next_closure_recheck.selected_task_ids, ["PM-009", "PM-010"]);
  assert.equal(routeResponse.body.selected_tranche_next_closure_recheck.can_certify_ga, false);
  assert.equal(routeResponse.body.selected_tranche_next_closure_recheck.proof_authority, "none");
  assert.doesNotMatch(JSON.stringify(routeResponse.body), secretTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), gaOverclaimTerms);

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (entry) =>
        entry.event_type === "release.goal3_selected_tranche_next_closure_recheck_recorded" &&
        entry.payload.selected_tranche_next_closure_recheck_id ===
          "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-0343-ROUTE" &&
        entry.payload.selected_tranche_next_packaging_results_follow_up_id ===
          task341Results.selected_tranche_next_packaging_results_follow_up_id &&
        entry.payload.selected_task_ids.join(",") === "PM-009,PM-010" &&
        entry.payload.can_certify_ga === false &&
        entry.payload.proof_authority === "none"
    ),
    true,
    "Task343 selected-tranche next closure recheck must emit non-certifying provenance"
  );

  for (const [path, pattern] of [
    ["README.md", /Task343.*selected-tranche.*next closure recheck/s],
    ["TODO.md", /Task343.*selected-tranche.*next closure recheck/s],
    ["REVIEW.md", /Task343.*selected-tranche.*next closure recheck/s],
    ["AGENTS.md", /Task343.*selected-tranche.*next closure recheck/s],
    ["docs/architecture/ga-release-criteria.md", /Task343.*selected-tranche.*next closure recheck/s],
    ["docs/architecture/threat-model.md", /Task343.*selected-tranche.*next closure recheck/s],
    ["docs/architecture/acceptance-matrix.md", /Task343.*selected-tranche.*next closure recheck/s],
    ["docs/progress/goal-3-ga-gap-matrix.md", /Task343.*selected-tranche.*next closure recheck/s]
  ]) {
    assert.match(repoFile(path), pattern, `${path} must document Task343 selected-tranche next closure recheck`);
  }
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task343 selected-tranche next closure recheck tests passed.");
