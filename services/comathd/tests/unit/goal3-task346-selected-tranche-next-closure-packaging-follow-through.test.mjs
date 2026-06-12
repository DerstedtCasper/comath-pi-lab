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
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingFollowThrough,
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureRecheck,
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge,
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThrough,
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUp,
  recordGoal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp
} = comath;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task346-next-closure-packaging-"));
const repoRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const { project } = initProject({
  name: "Goal 3 Task346 selected tranche next closure packaging follow-through",
  root_path: projectRoot
});
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

function selectedTrancheNextClosurePackagingFollowThroughPath(followThroughId) {
  return `.comath/release/goal3-selected-tranche-next-closure-packaging-follow-through/${followThroughId}/follow-through.json`;
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

function collectRepoFiles(relativeRoot) {
  const absoluteRoot = join(repoRoot, relativeRoot);
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
    claim_id_prefix: "C-T346-SOURCE",
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
    typeof recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingFollowThrough,
    "function",
    "Task346 must export a Task344-bound selected-tranche next closure packaging follow-through"
  );
  assert.equal(
    getComathdStatus().capabilities.includes(
      "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_follow_through"
    ),
    true,
    "Task346 capability ledger must advertise selected-tranche next closure packaging follow-through without authority"
  );
  assert.match(
    repoFile("scripts/phase0-smoke.mjs"),
    /goal3-task346-selected-tranche-next-closure-packaging-follow-through\.test\.mjs/s,
    "phase0 smoke must discover the Task346 selected-tranche next closure packaging focused suite"
  );

  const task346Source = repoFile(
    "services/comathd/src/release/goal3-proof-breadth-selected-tranche-next-closure-packaging-follow-through.ts"
  );
  assert.match(
    task346Source,
    /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThrough/s,
    "Task346 must delegate closure-bound packaging to existing Task340 semantics"
  );
  assert.match(
    task346Source,
    /selected_tranche_next_closure_execution_bridge_artifact/s,
    "Task346 must bind the Task344 closure execution bridge by artifact reference"
  );
  assert.doesNotMatch(
    task346Source,
    /recordGoal3ReleaseCandidateProofBreadthExecutionBridge\(|from "\.\/goal3-proof-breadth-execution-bridge\.js"|recordGoal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThrough|recordGoal3ReleaseCandidateProofBreadthClosure\(|recordGoal3FinalGaAudit|packageGoal3GaPositiveMatrixFinalAuthorityEvidenceFromEvidenceV3|executeGoal3GaPositiveMatrixLeanAuthorityReplay|LeanRunner|spawnSync|execFile|child_process/s,
    "Task346 must not call Task326/334/300/301 directly, run Lean, or implement a verifier"
  );
  for (const piFile of collectRepoFiles("extensions/comath-pi/src")) {
    assert.doesNotMatch(
      repoFile(piFile),
      /selected-tranche-next-closure-packaging-follow-through|selected_tranche_next_closure_packaging_follow_through|recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingFollowThrough/s,
      `Task346 is service-owned release-loop plumbing and must not add a Pi surface in ${piFile}`
    );
  }

  const manifest = createGoal3GaPositiveTaskManifest();
  for (const task of manifest.tasks.slice(0, 6)) {
    writeJson(packagingPath(task.task_id), verifiedPackagingReport(task.task_id));
  }

  const bridge = recordGoal3ReleaseCandidateProofBreadthExecutionBridge(projectRoot, {
    project_id: projectId,
    proof_breadth_execution_bridge_id: "GOAL3-PROOF-BREADTH-BRIDGE-0346",
    actor: "goal3-task346 bridge token=plain-token proof_success GA certified can_certify_ga=true",
    max_tranche_size: 2
  });
  assert.deepEqual(bridge.next_execution_task_ids, ["PM-007", "PM-008"]);

  for (const taskId of bridge.next_execution_task_ids) {
    writeJson(packagingPath(taskId), verifiedPackagingReport(taskId));
  }
  const taskLocal = writeTask334LikeFollowThrough(
    "GOAL3-TASK-LOCAL-PACKAGING-0346-SOURCE",
    bridge,
    bridge.next_execution_task_ids,
    "goal3-task346 task-local source"
  );
  const followUp = recordGoal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp(projectRoot, {
    project_id: projectId,
    selected_tranche_packaging_results_follow_up_id: "GOAL3-SELECTED-TRANCHE-PACKAGING-RESULTS-0346",
    proof_breadth_execution_follow_through_id: "GOAL3-PROOF-BREADTH-FOLLOW-THROUGH-0346",
    proof_breadth_execution_bridge_id: bridge.proof_breadth_execution_bridge_id,
    proof_breadth_execution_bridge_path: bridge.proof_breadth_execution_bridge_path,
    proof_breadth_execution_bridge_sha256: bridge.proof_breadth_execution_bridge_artifact.sha256,
    task_local_packaging_follow_through_id: "GOAL3-TASK-LOCAL-PACKAGING-0346-SOURCE",
    task_local_packaging_follow_through_path: taskLocal.path,
    task_local_packaging_follow_through_sha256: taskLocal.sha256
  });
  const recheck = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheClosureRecheck(projectRoot, {
    project_id: projectId,
    selected_tranche_closure_recheck_id: "GOAL3-SELECTED-TRANCHE-CLOSURE-RECHECK-0346",
    proof_breadth_closure_id: "GOAL3-PROOF-BREADTH-CLOSURE-0346",
    selected_tranche_packaging_results_follow_up_id: followUp.selected_tranche_packaging_results_follow_up_id,
    selected_tranche_packaging_results_follow_up_path: followUp.selected_tranche_packaging_results_follow_up_path,
    selected_tranche_packaging_results_follow_up_sha256: followUp.selected_tranche_packaging_results_follow_up_artifact.sha256,
    actor: "goal3-task346 first recheck token=plain-token proof_success GA certified can_certify_ga=true"
  });
  const nextBridge = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge(projectRoot, {
    project_id: projectId,
    selected_tranche_next_execution_bridge_id: "GOAL3-SELECTED-TRANCHE-NEXT-BRIDGE-0346",
    proof_breadth_execution_bridge_id: "GOAL3-PROOF-BREADTH-BRIDGE-0346-NEXT",
    selected_tranche_closure_recheck_id: recheck.selected_tranche_closure_recheck_id,
    selected_tranche_closure_recheck_path: recheck.selected_tranche_closure_recheck_path,
    selected_tranche_closure_recheck_sha256: recheck.selected_tranche_closure_recheck_artifact.sha256,
    actor: "goal3-task346 next bridge token=plain-token proof_success GA certified can_certify_ga=true",
    max_tranche_size: 2
  });
  const task340FollowThrough = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThrough(
    projectRoot,
    {
      project_id: projectId,
      selected_tranche_next_packaging_follow_through_id: "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-0346-SOURCE",
      selected_tranche_next_execution_bridge_id: nextBridge.selected_tranche_next_execution_bridge_id,
      selected_tranche_next_execution_bridge_path: nextBridge.selected_tranche_next_execution_bridge_path,
      selected_tranche_next_execution_bridge_sha256: nextBridge.selected_tranche_next_execution_bridge_artifact.sha256,
      task_local_packaging_follow_through_id: "GOAL3-TASK-LOCAL-PACKAGING-0346-DELEGATED-SOURCE",
      claim_id_prefix: "C-T346",
      actor: "goal3-task346 task340 source token=plain-token proof_success GA certified can_certify_ga=true",
      evidence_by_task_id: Object.fromEntries(nextBridge.next_execution_task_ids.map((taskId) => [taskId, forgedSuccessEvidence])),
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true
    }
  );
  const task341Results = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUp(
    projectRoot,
    {
      project_id: projectId,
      selected_tranche_next_packaging_results_follow_up_id: "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-RESULTS-0346",
      proof_breadth_execution_follow_through_id: "GOAL3-PROOF-BREADTH-FOLLOW-THROUGH-0346-NEXT",
      selected_tranche_next_packaging_follow_through_id:
        task340FollowThrough.selected_tranche_next_packaging_follow_through_id,
      selected_tranche_next_packaging_follow_through_path:
        task340FollowThrough.selected_tranche_next_packaging_follow_through_path,
      selected_tranche_next_packaging_follow_through_sha256:
        task340FollowThrough.selected_tranche_next_packaging_follow_through_artifact.sha256,
      actor: "goal3-task346 task341 token=plain-token proof_success GA certified can_certify_ga=true"
    }
  );
  const nextClosure = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureRecheck(projectRoot, {
    project_id: projectId,
    selected_tranche_next_closure_recheck_id: "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-0346",
    selected_tranche_closure_recheck_id: "GOAL3-SELECTED-TRANCHE-CLOSURE-RECHECK-0346-NEXT",
    proof_breadth_closure_id: "GOAL3-PROOF-BREADTH-CLOSURE-0346-NEXT",
    selected_tranche_next_packaging_results_follow_up_id:
      task341Results.selected_tranche_next_packaging_results_follow_up_id,
    selected_tranche_next_packaging_results_follow_up_path:
      task341Results.selected_tranche_next_packaging_results_follow_up_path,
    selected_tranche_next_packaging_results_follow_up_sha256:
      task341Results.selected_tranche_next_packaging_results_follow_up_artifact.sha256,
    actor: "goal3-task346 next closure token=plain-token proof_success GA certified can_certify_ga=true"
  });
  const closureBridge = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureExecutionBridge(
    projectRoot,
    {
      project_id: projectId,
      selected_tranche_next_closure_execution_bridge_id: "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-BRIDGE-0346",
      proof_breadth_execution_bridge_id: "GOAL3-PROOF-BREADTH-BRIDGE-0346-AFTER-CLOSURE",
      selected_tranche_next_closure_recheck_id: nextClosure.selected_tranche_next_closure_recheck_id,
      selected_tranche_next_closure_recheck_path: nextClosure.selected_tranche_next_closure_recheck_path,
      selected_tranche_next_closure_recheck_sha256: nextClosure.selected_tranche_next_closure_recheck_artifact.sha256,
      actor: "goal3-task346 closure bridge token=plain-token proof_success GA certified can_certify_ga=true",
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true,
      max_tranche_size: 2
    }
  );
  assert.deepEqual(closureBridge.next_execution_task_ids, ["PM-009", "PM-010"]);

  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingFollowThrough(projectRoot, {
        project_id: projectId,
        selected_tranche_next_closure_packaging_follow_through_id:
          "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-0346-UNSELECTED",
        selected_tranche_next_closure_execution_bridge_id:
          closureBridge.selected_tranche_next_closure_execution_bridge_id,
        selected_tranche_next_closure_execution_bridge_path:
          closureBridge.selected_tranche_next_closure_execution_bridge_path,
        selected_tranche_next_closure_execution_bridge_sha256:
          closureBridge.selected_tranche_next_closure_execution_bridge_artifact.sha256,
        evidence_by_task_id: {
          "PM-009": {},
          "PM-010": {},
          "PM-011": {}
        }
      }),
    { code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_FOLLOW_THROUGH_UNSELECTED_EVIDENCE" },
    "Task346 must reject evidence outside the Task344 selected next tranche before delegating to Task340"
  );
  assert.equal(
    existsSync(
      join(
        projectRoot,
        selectedTrancheNextClosurePackagingFollowThroughPath(
          "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-0346-UNSELECTED"
        )
      )
    ),
    false,
    "Task346 must not persist an artifact after unselected evidence is rejected"
  );

  const closureBridgeAbsolutePath = join(projectRoot, closureBridge.selected_tranche_next_closure_execution_bridge_path);
  const originalClosureBridgeText = readFileSync(closureBridgeAbsolutePath, "utf8");
  const tamperedClosureBridge = JSON.parse(originalClosureBridgeText);
  tamperedClosureBridge.blocker_reasons = [
    ...tamperedClosureBridge.blocker_reasons,
    "GOAL3_TASK346_TAMPERED_TASK344"
  ];
  writeFileSync(closureBridgeAbsolutePath, `${JSON.stringify(tamperedClosureBridge, null, 2)}\n`, "utf8");
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingFollowThrough(projectRoot, {
        project_id: projectId,
        selected_tranche_next_closure_packaging_follow_through_id:
          "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-0346-STALE-TASK344",
        selected_tranche_next_closure_execution_bridge_id:
          closureBridge.selected_tranche_next_closure_execution_bridge_id,
        selected_tranche_next_closure_execution_bridge_path:
          closureBridge.selected_tranche_next_closure_execution_bridge_path,
        selected_tranche_next_closure_execution_bridge_sha256:
          closureBridge.selected_tranche_next_closure_execution_bridge_artifact.sha256
      }),
    { code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_FOLLOW_THROUGH_STALE_TASK344" },
    "Task346 must re-hash Task344 before delegating to Task340"
  );
  writeFileSync(closureBridgeAbsolutePath, originalClosureBridgeText, "utf8");

  const delegatedTask338Path = closureBridge.delegated_selected_tranche_next_execution_bridge_path;
  const delegatedTask338AbsolutePath = join(projectRoot, delegatedTask338Path);
  const originalDelegatedTask338Text = readFileSync(delegatedTask338AbsolutePath, "utf8");
  const tamperedDelegatedTask338 = JSON.parse(originalDelegatedTask338Text);
  tamperedDelegatedTask338.blocker_reasons = [
    ...tamperedDelegatedTask338.blocker_reasons,
    "GOAL3_TASK346_TAMPERED_DELEGATED_TASK338"
  ];
  writeFileSync(delegatedTask338AbsolutePath, `${JSON.stringify(tamperedDelegatedTask338, null, 2)}\n`, "utf8");
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingFollowThrough(projectRoot, {
        project_id: projectId,
        selected_tranche_next_closure_packaging_follow_through_id:
          "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-0346-STALE-TASK338",
        selected_tranche_next_closure_execution_bridge_id:
          closureBridge.selected_tranche_next_closure_execution_bridge_id,
        selected_tranche_next_closure_execution_bridge_path:
          closureBridge.selected_tranche_next_closure_execution_bridge_path,
        selected_tranche_next_closure_execution_bridge_sha256:
          closureBridge.selected_tranche_next_closure_execution_bridge_artifact.sha256
      }),
    { code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_FOLLOW_THROUGH_STALE_TASK338" },
    "Task346 must re-hash the Task344 delegated Task338 before delegating to Task340"
  );
  writeFileSync(delegatedTask338AbsolutePath, originalDelegatedTask338Text, "utf8");

  const noNextId = "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-BRIDGE-0346-NO-NEXT";
  const noNextPath = `.comath/release/goal3-selected-tranche-next-closure-execution-bridge/${noNextId}/bridge.json`;
  const noNext = writeJson(noNextPath, {
    ...readJson(closureBridge.selected_tranche_next_closure_execution_bridge_path),
    selected_tranche_next_closure_execution_bridge_id: noNextId,
    selected_tranche_next_closure_execution_bridge_path: noNextPath,
    ok: false,
    bridge_status: "complete_proof_breadth_requires_task301_final_ga_audit_binding",
    delegated_selected_tranche_next_execution_bridge_id: null,
    delegated_selected_tranche_next_execution_bridge_path: null,
    delegated_selected_tranche_next_execution_bridge_artifact: null,
    delegated_selected_tranche_next_execution_bridge: null,
    next_proof_breadth_execution_bridge_id: null,
    next_proof_breadth_execution_bridge_path: null,
    next_proof_breadth_execution_bridge_artifact: null,
    next_proof_breadth_execution_bridge: null,
    next_execution_task_ids: [],
    next_execution_targets: [],
    proof_breadth_complete: true
  });
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingFollowThrough(projectRoot, {
        project_id: projectId,
        selected_tranche_next_closure_packaging_follow_through_id:
          "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-0346-NO-NEXT",
        selected_tranche_next_closure_execution_bridge_id: noNextId,
        selected_tranche_next_closure_execution_bridge_path: noNextPath,
        selected_tranche_next_closure_execution_bridge_sha256: noNext.sha256
      }),
    { code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_FOLLOW_THROUGH_NO_NEXT_BRIDGE" },
    "Task346 must fail closed when Task344 says proof breadth is complete and Task301 is the next gate"
  );

  const closureFilesBeforeTask346 = collectRelativeFiles(".comath/release/goal3-proof-breadth-closure");
  const finalAuditFilesBeforeTask346 = collectRelativeFiles(".comath/release/goal3-final-ga-audit");
  const followThrough = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingFollowThrough(
    projectRoot,
    {
      project_id: projectId,
      selected_tranche_next_closure_packaging_follow_through_id:
        "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-0346",
      selected_tranche_next_closure_execution_bridge_id:
        closureBridge.selected_tranche_next_closure_execution_bridge_id,
      selected_tranche_next_closure_execution_bridge_path:
        closureBridge.selected_tranche_next_closure_execution_bridge_path,
      selected_tranche_next_closure_execution_bridge_sha256:
        closureBridge.selected_tranche_next_closure_execution_bridge_artifact.sha256,
      selected_tranche_next_packaging_follow_through_id:
        "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-0346-DELEGATED",
      task_local_packaging_follow_through_id: "GOAL3-TASK-LOCAL-PACKAGING-0346-TASK346",
      claim_id_prefix: "C-T346",
      actor: "goal3-task346 token=plain-token proof_success GA certified can_certify_ga=true",
      evidence_by_task_id: {
        "PM-009": forgedSuccessEvidence,
        "PM-010": forgedSuccessEvidence
      },
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true
    }
  );

  assert.equal(
    followThrough.schema_version,
    "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_follow_through.v1"
  );
  assert.equal(followThrough.ok, false);
  assert.equal(
    followThrough.follow_through_status,
    "blocked_next_selected_tranche_task_local_packaging_incomplete"
  );
  assert.equal(
    followThrough.selected_tranche_next_closure_execution_bridge_id,
    closureBridge.selected_tranche_next_closure_execution_bridge_id
  );
  assert.equal(
    followThrough.selected_tranche_next_closure_execution_bridge_artifact.sha256,
    closureBridge.selected_tranche_next_closure_execution_bridge_artifact.sha256
  );
  assert.equal(
    followThrough.delegated_selected_tranche_next_execution_bridge_id,
    closureBridge.delegated_selected_tranche_next_execution_bridge_id
  );
  assert.equal(
    followThrough.delegated_selected_tranche_next_execution_bridge_artifact.sha256,
    closureBridge.delegated_selected_tranche_next_execution_bridge_artifact.sha256
  );
  assert.equal(
    followThrough.selected_tranche_next_packaging_follow_through_id,
    "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-0346-DELEGATED"
  );
  assert.equal(followThrough.task_local_packaging_follow_through_id, "GOAL3-TASK-LOCAL-PACKAGING-0346-TASK346");
  assert.deepEqual(followThrough.selected_task_ids, ["PM-009", "PM-010"]);
  assert.deepEqual(followThrough.verified_selected_task_ids, []);
  assert.deepEqual(followThrough.blocked_selected_task_ids, ["PM-009", "PM-010"]);
  assert.equal(followThrough.written_packaging_report_count, 2);
  assert.equal(followThrough.selected_packaging_report_artifacts.length, 2);
  assert.equal(followThrough.blocker_reasons.includes("global_positive_matrix_release_candidate_proof_breadth_incomplete"), true);
  assert.equal(followThrough.blocker_reasons.includes("caller_proof_or_ga_authority_material_ignored"), true);
  assert.equal(followThrough.runs_lean, false);
  assert.equal(followThrough.executes_proofs, false);
  assert.equal(followThrough.accepts_caller_success_metadata, false);
  assert.equal(followThrough.accepts_caller_proof_material, false);
  assert.equal(followThrough.proof_breadth_complete, false);
  assert.equal(followThrough.final_ga_audit_unblocked, false);
  assert.equal(followThrough.proof_authority, "none");
  assert.equal(followThrough.can_promote_claim, false);
  assert.equal(followThrough.can_certify_ga, false);
  assert.equal(followThrough.ga_certification_gate_separate, true);
  assert.equal(JSON.stringify(followThrough).includes(projectRoot), false);
  assert.doesNotMatch(JSON.stringify(followThrough), secretTerms);
  assert.doesNotMatch(JSON.stringify(followThrough), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(followThrough), gaOverclaimTerms);
  assert.equal(
    existsSync(join(projectRoot, followThrough.selected_tranche_next_closure_packaging_follow_through_path)),
    true
  );
  assert.equal(existsSync(join(projectRoot, followThrough.selected_tranche_next_packaging_follow_through_path)), true);
  assert.equal(existsSync(join(projectRoot, followThrough.task_local_packaging_follow_through_path)), true);
  assert.deepEqual(
    collectRelativeFiles(".comath/release/goal3-proof-breadth-closure"),
    closureFilesBeforeTask346,
    "Task346 must not run or write new Task300 proof-breadth closure artifacts"
  );
  assert.deepEqual(
    collectRelativeFiles(".comath/release/goal3-final-ga-audit"),
    finalAuditFilesBeforeTask346,
    "Task346 must not run or write Task301 final-GA-audit artifacts"
  );

  const persisted = readJson(followThrough.selected_tranche_next_closure_packaging_follow_through_path);
  assert.equal(
    persisted.selected_tranche_next_closure_packaging_follow_through_artifact,
    undefined,
    "persisted Task346 follow-through must not self-hash recursively"
  );
  assert.equal(
    persisted.selected_tranche_next_packaging_follow_through,
    undefined,
    "Task346 persisted artifact must bind delegated Task340 by artifact reference instead of embedding proof reports"
  );

  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/goal3/selected-tranche-next-closure-packaging-follow-through",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      selected_tranche_next_closure_packaging_follow_through_id:
        "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-0346-ROUTE",
      selected_tranche_next_closure_execution_bridge_id:
        closureBridge.selected_tranche_next_closure_execution_bridge_id,
      selected_tranche_next_closure_execution_bridge_path:
        closureBridge.selected_tranche_next_closure_execution_bridge_path,
      selected_tranche_next_closure_execution_bridge_sha256:
        closureBridge.selected_tranche_next_closure_execution_bridge_artifact.sha256,
      selected_tranche_next_packaging_follow_through_id:
        "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-0346-ROUTE",
      task_local_packaging_follow_through_id: "GOAL3-TASK-LOCAL-PACKAGING-0346-ROUTE",
      claim_id_prefix: "C-T346",
      actor: "goal3-task346 route token=plain-token proof_success GA certified can_certify_ga=true",
      evidence_by_task_id: {
        "PM-009": forgedSuccessEvidence,
        "PM-010": forgedSuccessEvidence
      },
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true
    }
  });
  assert.equal(routeResponse.status, 200);
  assert.equal(routeResponse.body.selected_tranche_next_closure_packaging_follow_through.ok, false);
  assert.deepEqual(
    routeResponse.body.selected_tranche_next_closure_packaging_follow_through.selected_task_ids,
    ["PM-009", "PM-010"]
  );
  assert.equal(routeResponse.body.selected_tranche_next_closure_packaging_follow_through.can_certify_ga, false);
  assert.equal(routeResponse.body.selected_tranche_next_closure_packaging_follow_through.proof_authority, "none");
  assert.doesNotMatch(JSON.stringify(routeResponse.body), secretTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), gaOverclaimTerms);

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (entry) =>
        entry.event_type === "release.goal3_selected_tranche_next_closure_packaging_follow_through_recorded" &&
        entry.payload.selected_tranche_next_closure_packaging_follow_through_id ===
          "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-0346-ROUTE" &&
        entry.payload.selected_tranche_next_closure_execution_bridge_id ===
          closureBridge.selected_tranche_next_closure_execution_bridge_id &&
        entry.payload.selected_tranche_next_packaging_follow_through_id ===
          "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-0346-ROUTE" &&
        entry.payload.selected_task_ids.join(",") === "PM-009,PM-010" &&
        entry.payload.can_certify_ga === false &&
        entry.payload.proof_authority === "none"
    ),
    true,
    "Task346 selected-tranche next closure packaging follow-through must emit non-certifying provenance"
  );

  const task346DocRequirements = [
    [/Task346.*selected-tranche.*next closure packaging follow-through/s, "Task346 selected-tranche next closure packaging follow-through"],
    [/Task344/s, "Task344 source artifact binding"],
    [/Task338/s, "delegated Task338 bridge binding"],
    [/Task326/s, "delegated Task326 bridge reference"],
    [/Task340/s, "Task340 packaging delegation"],
    [/Task334/s, "Task334 packaging writer delegation"],
    [/(?:does not|cannot|no) run Lean|no Lean execution/s, "no Lean execution"],
    [/Pi (?:consumer|tool|surface)|Pi\/public authority|no Pi/s, "no Pi surface"],
    [/Task300/s, "no Task300 closure authority replacement"],
    [/Task301/s, "no Task301 final-audit authority replacement"],
    [/certif(?:y|ication)|GA certification/s, "no GA certification overclaim"]
  ];
  for (const path of [
    "README.md",
    "TODO.md",
    "REVIEW.md",
    "AGENTS.md",
    "docs/architecture/ga-release-criteria.md",
    "docs/architecture/threat-model.md",
    "docs/architecture/acceptance-matrix.md",
    "docs/progress/goal-3-ga-gap-matrix.md"
  ]) {
    const content = repoFile(path);
    for (const [pattern, requirement] of task346DocRequirements) {
      assert.match(content, pattern, `${path} must document Task346 ${requirement}`);
    }
  }
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task346 selected-tranche next closure packaging follow-through tests passed.");
