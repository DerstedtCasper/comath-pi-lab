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
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureExecutionBridge,
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureRecheck,
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge,
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThrough,
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUp,
  recordGoal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp
} = comath;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task344-next-closure-bridge-"));
const repoRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const { project } = initProject({ name: "Goal 3 Task344 selected tranche next closure execution bridge", root_path: projectRoot });
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

function writeTask334LikeFollowThrough(followThroughId, bridge, selectedTaskIds, actor) {
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
    actor,
    created_at: "2026-06-13T00:00:00.000Z",
    ok: true,
    follow_through_status: "selected_tranche_task_local_packaging_verified",
    task_local_packaging_follow_through_path: path,
    requested_follow_through_mode: "open_formal_workbench_release_candidate_task_local_lean_authority_packaging_follow_through",
    proof_breadth_execution_bridge_id: bridge.proof_breadth_execution_bridge_id,
    proof_breadth_execution_bridge_path: bridge.proof_breadth_execution_bridge_path,
    proof_breadth_execution_bridge_artifact: bridge.proof_breadth_execution_bridge_artifact,
    claim_id_prefix: "C-T344-SOURCE",
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
    typeof recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureExecutionBridge,
    "function",
    "Task344 must export a Task343-bound selected-tranche next closure execution bridge"
  );
  assert.equal(
    getComathdStatus().capabilities.includes(
      "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_execution_bridge"
    ),
    true,
    "Task344 capability ledger must advertise next closure execution bridge without claiming authority"
  );
  assert.match(
    repoFile("scripts/phase0-smoke.mjs"),
    /goal3-task344-selected-tranche-next-closure-execution-bridge\.test\.mjs/s,
    "phase0 smoke must discover the Task344 selected-tranche next closure execution bridge suite"
  );

  const task344Source = repoFile(
    "services/comathd/src/release/goal3-proof-breadth-selected-tranche-next-closure-execution-bridge.ts"
  );
  assert.match(
    task344Source,
    /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge/s,
    "Task344 must delegate to existing Task338 selected-tranche next execution bridge semantics"
  );
  assert.doesNotMatch(
    task344Source,
    /recordGoal3ReleaseCandidateProofBreadthExecutionBridge\(|from "\.\/goal3-proof-breadth-execution-bridge\.js"|recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThrough|recordGoal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThrough|recordGoal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp|recordGoal3ReleaseCandidateProofBreadthClosure|recordGoal3FinalGaAudit|packageGoal3GaPositiveMatrixFinalAuthorityEvidenceFromEvidenceV3|executeGoal3GaPositiveMatrixLeanAuthorityReplay|LeanRunner|spawnSync|execFile|child_process/s,
    "Task344 must remain a Task343-to-Task338 handoff and must not call Task326 directly, run Lean, or write packaging/currentness/closure/final-audit artifacts"
  );
  assert.doesNotMatch(
    repoFile("extensions/comath-pi/src/index.ts"),
    /selected-tranche-next-closure-execution-bridge|recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureExecutionBridge/s,
    "Task344 is service-owned release-loop plumbing and must not add a Pi surface"
  );
  assert.doesNotMatch(
    repoFile("extensions/comath-pi/src/runtime-registration.ts"),
    /selected-tranche-next-closure-execution-bridge|recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureExecutionBridge/s,
    "Task344 is service-owned release-loop plumbing and must not register a Pi runtime command"
  );

  const manifest = createGoal3GaPositiveTaskManifest();
  for (const task of manifest.tasks.slice(0, 6)) {
    writeJson(packagingPath(task.task_id), verifiedPackagingReport(task.task_id));
  }

  const bridge = recordGoal3ReleaseCandidateProofBreadthExecutionBridge(projectRoot, {
    project_id: projectId,
    proof_breadth_execution_bridge_id: "GOAL3-PROOF-BREADTH-BRIDGE-0344",
    actor: "goal3-task344 bridge token=plain-token proof_success GA certified can_certify_ga=true",
    max_tranche_size: 2
  });
  assert.deepEqual(bridge.next_execution_task_ids, ["PM-007", "PM-008"]);

  for (const taskId of bridge.next_execution_task_ids) {
    writeJson(packagingPath(taskId), verifiedPackagingReport(taskId));
  }
  const taskLocal = writeTask334LikeFollowThrough(
    "GOAL3-TASK-LOCAL-PACKAGING-0344-SOURCE",
    bridge,
    bridge.next_execution_task_ids,
    "goal3-task344 task-local source"
  );
  const followUp = recordGoal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp(projectRoot, {
    project_id: projectId,
    selected_tranche_packaging_results_follow_up_id: "GOAL3-SELECTED-TRANCHE-PACKAGING-RESULTS-0344",
    proof_breadth_execution_follow_through_id: "GOAL3-PROOF-BREADTH-FOLLOW-THROUGH-0344",
    proof_breadth_execution_bridge_id: bridge.proof_breadth_execution_bridge_id,
    proof_breadth_execution_bridge_path: bridge.proof_breadth_execution_bridge_path,
    proof_breadth_execution_bridge_sha256: bridge.proof_breadth_execution_bridge_artifact.sha256,
    task_local_packaging_follow_through_id: "GOAL3-TASK-LOCAL-PACKAGING-0344-SOURCE",
    task_local_packaging_follow_through_path: taskLocal.path,
    task_local_packaging_follow_through_sha256: taskLocal.sha256
  });
  const recheck = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheClosureRecheck(projectRoot, {
    project_id: projectId,
    selected_tranche_closure_recheck_id: "GOAL3-SELECTED-TRANCHE-CLOSURE-RECHECK-0344",
    proof_breadth_closure_id: "GOAL3-PROOF-BREADTH-CLOSURE-0344",
    selected_tranche_packaging_results_follow_up_id: followUp.selected_tranche_packaging_results_follow_up_id,
    selected_tranche_packaging_results_follow_up_path: followUp.selected_tranche_packaging_results_follow_up_path,
    selected_tranche_packaging_results_follow_up_sha256: followUp.selected_tranche_packaging_results_follow_up_artifact.sha256,
    actor: "goal3-task344 first recheck token=plain-token proof_success GA certified can_certify_ga=true"
  });
  const nextBridge = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge(projectRoot, {
    project_id: projectId,
    selected_tranche_next_execution_bridge_id: "GOAL3-SELECTED-TRANCHE-NEXT-BRIDGE-0344",
    proof_breadth_execution_bridge_id: "GOAL3-PROOF-BREADTH-BRIDGE-0344-NEXT",
    selected_tranche_closure_recheck_id: recheck.selected_tranche_closure_recheck_id,
    selected_tranche_closure_recheck_path: recheck.selected_tranche_closure_recheck_path,
    selected_tranche_closure_recheck_sha256: recheck.selected_tranche_closure_recheck_artifact.sha256,
    actor: "goal3-task344 next bridge token=plain-token proof_success GA certified can_certify_ga=true",
    max_tranche_size: 2
  });
  const task340FollowThrough = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThrough(
    projectRoot,
    {
      project_id: projectId,
      selected_tranche_next_packaging_follow_through_id: "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-0344",
      selected_tranche_next_execution_bridge_id: nextBridge.selected_tranche_next_execution_bridge_id,
      selected_tranche_next_execution_bridge_path: nextBridge.selected_tranche_next_execution_bridge_path,
      selected_tranche_next_execution_bridge_sha256: nextBridge.selected_tranche_next_execution_bridge_artifact.sha256,
      task_local_packaging_follow_through_id: "GOAL3-TASK-LOCAL-PACKAGING-0344-DELEGATED",
      claim_id_prefix: "C-T344",
      actor: "goal3-task344 task340 token=plain-token proof_success GA certified can_certify_ga=true",
      evidence_by_task_id: Object.fromEntries(nextBridge.next_execution_task_ids.map((taskId) => [taskId, forgedSuccessEvidence])),
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true
    }
  );
  const task341Results = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUp(
    projectRoot,
    {
      project_id: projectId,
      selected_tranche_next_packaging_results_follow_up_id: "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-RESULTS-0344",
      proof_breadth_execution_follow_through_id: "GOAL3-PROOF-BREADTH-FOLLOW-THROUGH-0344-NEXT",
      selected_tranche_next_packaging_follow_through_id:
        task340FollowThrough.selected_tranche_next_packaging_follow_through_id,
      selected_tranche_next_packaging_follow_through_path:
        task340FollowThrough.selected_tranche_next_packaging_follow_through_path,
      selected_tranche_next_packaging_follow_through_sha256:
        task340FollowThrough.selected_tranche_next_packaging_follow_through_artifact.sha256,
      actor: "goal3-task344 task341 token=plain-token proof_success GA certified can_certify_ga=true"
    }
  );
  const nextClosure = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureRecheck(projectRoot, {
    project_id: projectId,
    selected_tranche_next_closure_recheck_id: "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-0344",
    selected_tranche_closure_recheck_id: "GOAL3-SELECTED-TRANCHE-CLOSURE-RECHECK-0344-NEXT",
    proof_breadth_closure_id: "GOAL3-PROOF-BREADTH-CLOSURE-0344-NEXT",
    selected_tranche_next_packaging_results_follow_up_id:
      task341Results.selected_tranche_next_packaging_results_follow_up_id,
    selected_tranche_next_packaging_results_follow_up_path:
      task341Results.selected_tranche_next_packaging_results_follow_up_path,
    selected_tranche_next_packaging_results_follow_up_sha256:
      task341Results.selected_tranche_next_packaging_results_follow_up_artifact.sha256,
    actor: "goal3-task344 next closure token=plain-token proof_success GA certified can_certify_ga=true"
  });
  assert.deepEqual(nextClosure.selected_task_ids, ["PM-009", "PM-010"]);
  assert.equal(nextClosure.proof_breadth_closure.verified_task_count, 8);
  assert.equal(nextClosure.proof_breadth_closure.blocked_task_count, 2);

  const closureAbsolutePath = join(projectRoot, nextClosure.proof_breadth_closure_path);
  const originalClosureText = readFileSync(closureAbsolutePath, "utf8");
  const tamperedClosure = JSON.parse(originalClosureText);
  tamperedClosure.blocker_reasons = [
    ...tamperedClosure.blocker_reasons,
    "GOAL3_TASK344_TAMPERED_TASK300_CLOSURE"
  ];
  writeFileSync(closureAbsolutePath, `${JSON.stringify(tamperedClosure, null, 2)}\n`, "utf8");
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureExecutionBridge(projectRoot, {
        project_id: projectId,
        selected_tranche_next_closure_execution_bridge_id:
          "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-BRIDGE-0344-STALE-CLOSURE",
        selected_tranche_next_closure_recheck_id: nextClosure.selected_tranche_next_closure_recheck_id,
        selected_tranche_next_closure_recheck_path: nextClosure.selected_tranche_next_closure_recheck_path,
        selected_tranche_next_closure_recheck_sha256: nextClosure.selected_tranche_next_closure_recheck_artifact.sha256
      }),
    { code: "GOAL3_SELECTED_TRANCHE_NEXT_EXECUTION_BRIDGE_STALE_CLOSURE" },
    "Task344 must delegate stale Task343-bound Task300 closure checks to Task338 before Task326 selection"
  );
  writeFileSync(closureAbsolutePath, originalClosureText, "utf8");

  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureExecutionBridge(projectRoot, {
        project_id: projectId,
        selected_tranche_next_closure_execution_bridge_id:
          "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-BRIDGE-0344-STALE",
        selected_tranche_next_closure_recheck_id: nextClosure.selected_tranche_next_closure_recheck_id,
        selected_tranche_next_closure_recheck_path: nextClosure.selected_tranche_next_closure_recheck_path,
        selected_tranche_next_closure_recheck_sha256: "0".repeat(64)
      }),
    { code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_EXECUTION_BRIDGE_STALE_RECHECK" },
    "Task344 must reject stale Task343 selected-tranche next closure recheck hashes before delegating to Task326"
  );

  const nextClosureAbsolutePath = join(projectRoot, nextClosure.selected_tranche_next_closure_recheck_path);
  const originalNextClosureText = readFileSync(nextClosureAbsolutePath, "utf8");
  const tamperedNextClosure = JSON.parse(originalNextClosureText);
  tamperedNextClosure.accepts_caller_success_metadata = true;
  tamperedNextClosure.accepts_caller_proof_material = true;
  tamperedNextClosure.ga_certification_gate_separate = false;
  const tamperedNextClosureText = `${JSON.stringify(tamperedNextClosure, null, 2)}\n`;
  writeFileSync(nextClosureAbsolutePath, tamperedNextClosureText, "utf8");
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureExecutionBridge(projectRoot, {
        project_id: projectId,
        selected_tranche_next_closure_execution_bridge_id:
          "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-BRIDGE-0344-TAMPERED-NO-AUTHORITY",
        selected_tranche_next_closure_recheck_id: nextClosure.selected_tranche_next_closure_recheck_id,
        selected_tranche_next_closure_recheck_path: nextClosure.selected_tranche_next_closure_recheck_path,
        selected_tranche_next_closure_recheck_sha256: sha256Text(tamperedNextClosureText)
      }),
    { code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_EXECUTION_BRIDGE_INVALID_RECHECK" },
    "Task344 must reject current-hash Task343 artifacts that weaken no-authority boundary flags"
  );
  writeFileSync(nextClosureAbsolutePath, originalNextClosureText, "utf8");

  const finalAuditFilesBeforeTask344 = collectRelativeFiles(".comath/release/goal3-final-ga-audit");
  const closureBridge = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureExecutionBridge(
    projectRoot,
    {
      project_id: projectId,
      selected_tranche_next_closure_execution_bridge_id: "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-BRIDGE-0344",
      proof_breadth_execution_bridge_id: "GOAL3-PROOF-BREADTH-BRIDGE-0344-AFTER-CLOSURE",
      selected_tranche_next_closure_recheck_id: nextClosure.selected_tranche_next_closure_recheck_id,
      selected_tranche_next_closure_recheck_path: nextClosure.selected_tranche_next_closure_recheck_path,
      selected_tranche_next_closure_recheck_sha256: nextClosure.selected_tranche_next_closure_recheck_artifact.sha256,
      actor: "goal3-task344 token=plain-token proof_success GA certified can_certify_ga=true",
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true,
      final_ga_audit_json: { ok: true },
      proof_breadth_closure_json: { proof_breadth_complete: true },
      max_tranche_size: 2
    }
  );

  assert.equal(
    closureBridge.schema_version,
    "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_execution_bridge.v1"
  );
  assert.equal(closureBridge.ok, true);
  assert.equal(closureBridge.bridge_status, "ready_for_next_selected_tranche_execution");
  assert.equal(
    closureBridge.selected_tranche_next_closure_recheck_id,
    nextClosure.selected_tranche_next_closure_recheck_id
  );
  assert.deepEqual(closureBridge.completed_selected_task_ids, ["PM-009", "PM-010"]);
  assert.equal(closureBridge.previous_verified_task_count, 8);
  assert.equal(closureBridge.previous_missing_task_count, 90);
  assert.equal(closureBridge.previous_blocked_task_count, 2);
  assert.equal(
    closureBridge.delegated_selected_tranche_next_execution_bridge.selected_tranche_closure_recheck_id,
    nextClosure.selected_tranche_closure_recheck_id
  );
  assert.equal(
    closureBridge.next_proof_breadth_execution_bridge.proof_breadth_execution_bridge_id,
    "GOAL3-PROOF-BREADTH-BRIDGE-0344-AFTER-CLOSURE"
  );
  assert.deepEqual(closureBridge.next_execution_task_ids, ["PM-009", "PM-010"]);
  assert.equal(closureBridge.next_proof_breadth_execution_bridge.verified_task_count, 8);
  assert.equal(closureBridge.next_proof_breadth_execution_bridge.blocked_task_count, 2);
  assert.equal(closureBridge.proof_breadth_complete, false);
  assert.equal(closureBridge.final_ga_audit_unblocked, false);
  assert.equal(closureBridge.runs_lean, false);
  assert.equal(closureBridge.executes_proofs, false);
  assert.equal(closureBridge.accepts_caller_success_metadata, false);
  assert.equal(closureBridge.accepts_caller_proof_material, false);
  assert.equal(closureBridge.proof_authority, "none");
  assert.equal(closureBridge.can_promote_claim, false);
  assert.equal(closureBridge.can_certify_ga, false);
  assert.equal(closureBridge.ga_certification_gate_separate, true);
  assert.equal(
    closureBridge.blocker_reasons.includes("global_positive_matrix_release_candidate_proof_breadth_incomplete"),
    true
  );
  assert.equal(closureBridge.blocker_reasons.includes("caller_proof_or_ga_authority_material_ignored"), true);
  assert.equal(JSON.stringify(closureBridge).includes(projectRoot), false);
  assert.doesNotMatch(JSON.stringify(closureBridge), secretTerms);
  assert.doesNotMatch(JSON.stringify(closureBridge), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(closureBridge), gaOverclaimTerms);
  assert.equal(existsSync(join(projectRoot, closureBridge.selected_tranche_next_closure_execution_bridge_path)), true);
  assert.equal(existsSync(join(projectRoot, closureBridge.next_proof_breadth_execution_bridge_path)), true);
  assert.deepEqual(
    collectRelativeFiles(".comath/release/goal3-final-ga-audit"),
    finalAuditFilesBeforeTask344,
    "Task344 must not write Task301 final-GA-audit artifacts"
  );

  const persisted = readJson(closureBridge.selected_tranche_next_closure_execution_bridge_path);
  assert.equal(
    persisted.selected_tranche_next_closure_execution_bridge_artifact,
    undefined,
    "persisted Task344 bridge must not self-hash recursively"
  );
  assert.equal(
    persisted.next_proof_breadth_execution_bridge_artifact.sha256,
    closureBridge.next_proof_breadth_execution_bridge_artifact.sha256
  );
  assert.equal(
    persisted.delegated_selected_tranche_next_execution_bridge_artifact.sha256,
    closureBridge.delegated_selected_tranche_next_execution_bridge_artifact.sha256
  );

  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/goal3/selected-tranche-next-closure-execution-bridge",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      selected_tranche_next_closure_execution_bridge_id:
        "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-BRIDGE-0344-ROUTE",
      proof_breadth_execution_bridge_id: "GOAL3-PROOF-BREADTH-BRIDGE-0344-ROUTE",
      selected_tranche_next_closure_recheck_id: nextClosure.selected_tranche_next_closure_recheck_id,
      selected_tranche_next_closure_recheck_path: nextClosure.selected_tranche_next_closure_recheck_path,
      selected_tranche_next_closure_recheck_sha256: nextClosure.selected_tranche_next_closure_recheck_artifact.sha256,
      actor: "goal3-task344 route token=plain-token proof_success GA certified can_certify_ga=true",
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true,
      max_tranche_size: 1
    }
  });
  assert.equal(routeResponse.status, 200);
  assert.equal(routeResponse.body.selected_tranche_next_closure_execution_bridge.ok, true);
  assert.deepEqual(routeResponse.body.selected_tranche_next_closure_execution_bridge.next_execution_task_ids, ["PM-009"]);
  assert.equal(routeResponse.body.selected_tranche_next_closure_execution_bridge.can_certify_ga, false);
  assert.equal(routeResponse.body.selected_tranche_next_closure_execution_bridge.proof_authority, "none");
  assert.doesNotMatch(JSON.stringify(routeResponse.body), secretTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), gaOverclaimTerms);

  const originalPm009Text = readFileSync(join(projectRoot, packagingPath("PM-009")), "utf8");
  writeJson(packagingPath("PM-009"), {
    ...JSON.parse(originalPm009Text),
    blocker_code: "GOAL3_TASK344_TAMPERED_AFTER_TASK343"
  });
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureExecutionBridge(projectRoot, {
        project_id: projectId,
        selected_tranche_next_closure_execution_bridge_id:
          "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-BRIDGE-0344-REPORT-STALE",
        selected_tranche_next_closure_recheck_id: nextClosure.selected_tranche_next_closure_recheck_id,
        selected_tranche_next_closure_recheck_path: nextClosure.selected_tranche_next_closure_recheck_path,
        selected_tranche_next_closure_recheck_sha256: nextClosure.selected_tranche_next_closure_recheck_artifact.sha256
      }),
    { code: "GOAL3_SELECTED_TRANCHE_NEXT_EXECUTION_BRIDGE_STALE_COMPLETED_REPORT" },
    "Task344 must delegate selected packaging report re-hash checks to Task338 before Task326 selection"
  );

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (entry) =>
        entry.event_type === "release.goal3_selected_tranche_next_closure_execution_bridge_recorded" &&
        entry.payload.selected_tranche_next_closure_execution_bridge_id ===
          "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-BRIDGE-0344-ROUTE" &&
        entry.payload.next_proof_breadth_execution_bridge_id === "GOAL3-PROOF-BREADTH-BRIDGE-0344-ROUTE" &&
        entry.payload.next_execution_task_ids.join(",") === "PM-009" &&
        entry.payload.can_certify_ga === false &&
        entry.payload.proof_authority === "none"
    ),
    true,
    "Task344 selected-tranche next closure execution bridge must emit non-certifying provenance"
  );

  for (const [path, pattern] of [
    ["README.md", /Task344.*selected-tranche.*next closure execution bridge/s],
    ["TODO.md", /Task344.*selected-tranche.*next closure execution bridge/s],
    ["REVIEW.md", /Task344.*selected-tranche.*next closure execution bridge/s],
    ["AGENTS.md", /Task344.*selected-tranche.*next closure execution bridge/s],
    ["docs/architecture/ga-release-criteria.md", /Task344.*selected-tranche.*next closure execution bridge/s],
    ["docs/architecture/threat-model.md", /Task344.*selected-tranche.*next closure execution bridge/s],
    ["docs/architecture/acceptance-matrix.md", /Task344.*selected-tranche.*next closure execution bridge/s],
    ["docs/progress/goal-3-ga-gap-matrix.md", /Task344.*selected-tranche.*next closure execution bridge/s]
  ]) {
    assert.match(repoFile(path), pattern, `${path} must document Task344 selected-tranche next closure execution bridge`);
  }
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task344 selected-tranche next closure execution bridge tests passed.");
