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
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsFollowUp,
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureRecheck,
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge,
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThrough,
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUp,
  recordGoal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp
} = comath;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task347-next-closure-results-"));
const repoRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const { project } = initProject({
  name: "Goal 3 Task347 selected tranche next closure packaging results",
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

function artifactForRelativePath(relativePath, kind) {
  const content = readFileSync(join(projectRoot, relativePath));
  return {
    kind,
    path: relativePath,
    sha256: createHash("sha256").update(content).digest("hex"),
    size_bytes: content.byteLength
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

function selectedTrancheNextClosurePackagingResultsFollowUpPath(followUpId) {
  return `.comath/release/goal3-selected-tranche-next-closure-packaging-results-follow-up/${followUpId}/follow-up.json`;
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
    claim_id_prefix: "C-T347-SOURCE",
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

function seedTask346Artifact() {
  const manifest = createGoal3GaPositiveTaskManifest();
  for (const task of manifest.tasks.slice(0, 6)) {
    writeJson(packagingPath(task.task_id), verifiedPackagingReport(task.task_id));
  }

  const bridge = recordGoal3ReleaseCandidateProofBreadthExecutionBridge(projectRoot, {
    project_id: projectId,
    proof_breadth_execution_bridge_id: "GOAL3-PROOF-BREADTH-BRIDGE-0347",
    actor: "goal3-task347 bridge token=plain-token proof_success GA certified can_certify_ga=true",
    max_tranche_size: 2
  });
  assert.deepEqual(bridge.next_execution_task_ids, ["PM-007", "PM-008"]);

  for (const taskId of bridge.next_execution_task_ids) {
    writeJson(packagingPath(taskId), verifiedPackagingReport(taskId));
  }
  const taskLocal = writeTask334LikeFollowThrough(
    "GOAL3-TASK-LOCAL-PACKAGING-0347-SOURCE",
    bridge,
    bridge.next_execution_task_ids,
    "goal3-task347 task-local source"
  );
  const followUp = recordGoal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp(projectRoot, {
    project_id: projectId,
    selected_tranche_packaging_results_follow_up_id: "GOAL3-SELECTED-TRANCHE-PACKAGING-RESULTS-0347",
    proof_breadth_execution_follow_through_id: "GOAL3-PROOF-BREADTH-FOLLOW-THROUGH-0347",
    proof_breadth_execution_bridge_id: bridge.proof_breadth_execution_bridge_id,
    proof_breadth_execution_bridge_path: bridge.proof_breadth_execution_bridge_path,
    proof_breadth_execution_bridge_sha256: bridge.proof_breadth_execution_bridge_artifact.sha256,
    task_local_packaging_follow_through_id: "GOAL3-TASK-LOCAL-PACKAGING-0347-SOURCE",
    task_local_packaging_follow_through_path: taskLocal.path,
    task_local_packaging_follow_through_sha256: taskLocal.sha256
  });
  const recheck = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheClosureRecheck(projectRoot, {
    project_id: projectId,
    selected_tranche_closure_recheck_id: "GOAL3-SELECTED-TRANCHE-CLOSURE-RECHECK-0347",
    proof_breadth_closure_id: "GOAL3-PROOF-BREADTH-CLOSURE-0347",
    selected_tranche_packaging_results_follow_up_id: followUp.selected_tranche_packaging_results_follow_up_id,
    selected_tranche_packaging_results_follow_up_path: followUp.selected_tranche_packaging_results_follow_up_path,
    selected_tranche_packaging_results_follow_up_sha256: followUp.selected_tranche_packaging_results_follow_up_artifact.sha256,
    actor: "goal3-task347 first recheck token=plain-token proof_success GA certified can_certify_ga=true"
  });
  const nextBridge = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge(projectRoot, {
    project_id: projectId,
    selected_tranche_next_execution_bridge_id: "GOAL3-SELECTED-TRANCHE-NEXT-BRIDGE-0347",
    proof_breadth_execution_bridge_id: "GOAL3-PROOF-BREADTH-BRIDGE-0347-NEXT",
    selected_tranche_closure_recheck_id: recheck.selected_tranche_closure_recheck_id,
    selected_tranche_closure_recheck_path: recheck.selected_tranche_closure_recheck_path,
    selected_tranche_closure_recheck_sha256: recheck.selected_tranche_closure_recheck_artifact.sha256,
    actor: "goal3-task347 next bridge token=plain-token proof_success GA certified can_certify_ga=true",
    max_tranche_size: 2
  });
  const task340FollowThrough = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThrough(
    projectRoot,
    {
      project_id: projectId,
      selected_tranche_next_packaging_follow_through_id: "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-0347-SOURCE",
      selected_tranche_next_execution_bridge_id: nextBridge.selected_tranche_next_execution_bridge_id,
      selected_tranche_next_execution_bridge_path: nextBridge.selected_tranche_next_execution_bridge_path,
      selected_tranche_next_execution_bridge_sha256: nextBridge.selected_tranche_next_execution_bridge_artifact.sha256,
      task_local_packaging_follow_through_id: "GOAL3-TASK-LOCAL-PACKAGING-0347-DELEGATED-SOURCE",
      claim_id_prefix: "C-T347",
      actor: "goal3-task347 task340 source token=plain-token proof_success GA certified can_certify_ga=true",
      evidence_by_task_id: Object.fromEntries(nextBridge.next_execution_task_ids.map((taskId) => [taskId, forgedSuccessEvidence])),
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true
    }
  );
  const task341Results = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUp(
    projectRoot,
    {
      project_id: projectId,
      selected_tranche_next_packaging_results_follow_up_id: "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-RESULTS-0347",
      proof_breadth_execution_follow_through_id: "GOAL3-PROOF-BREADTH-FOLLOW-THROUGH-0347-NEXT",
      selected_tranche_next_packaging_follow_through_id:
        task340FollowThrough.selected_tranche_next_packaging_follow_through_id,
      selected_tranche_next_packaging_follow_through_path:
        task340FollowThrough.selected_tranche_next_packaging_follow_through_path,
      selected_tranche_next_packaging_follow_through_sha256:
        task340FollowThrough.selected_tranche_next_packaging_follow_through_artifact.sha256,
      actor: "goal3-task347 task341 token=plain-token proof_success GA certified can_certify_ga=true"
    }
  );
  const nextClosure = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureRecheck(projectRoot, {
    project_id: projectId,
    selected_tranche_next_closure_recheck_id: "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-0347",
    selected_tranche_closure_recheck_id: "GOAL3-SELECTED-TRANCHE-CLOSURE-RECHECK-0347-NEXT",
    proof_breadth_closure_id: "GOAL3-PROOF-BREADTH-CLOSURE-0347-NEXT",
    selected_tranche_next_packaging_results_follow_up_id:
      task341Results.selected_tranche_next_packaging_results_follow_up_id,
    selected_tranche_next_packaging_results_follow_up_path:
      task341Results.selected_tranche_next_packaging_results_follow_up_path,
    selected_tranche_next_packaging_results_follow_up_sha256:
      task341Results.selected_tranche_next_packaging_results_follow_up_artifact.sha256,
    actor: "goal3-task347 next closure token=plain-token proof_success GA certified can_certify_ga=true"
  });
  const closureBridge = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureExecutionBridge(
    projectRoot,
    {
      project_id: projectId,
      selected_tranche_next_closure_execution_bridge_id: "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-BRIDGE-0347",
      proof_breadth_execution_bridge_id: "GOAL3-PROOF-BREADTH-BRIDGE-0347-AFTER-CLOSURE",
      selected_tranche_next_closure_recheck_id: nextClosure.selected_tranche_next_closure_recheck_id,
      selected_tranche_next_closure_recheck_path: nextClosure.selected_tranche_next_closure_recheck_path,
      selected_tranche_next_closure_recheck_sha256: nextClosure.selected_tranche_next_closure_recheck_artifact.sha256,
      actor: "goal3-task347 closure bridge token=plain-token proof_success GA certified can_certify_ga=true",
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true,
      max_tranche_size: 2
    }
  );
  assert.deepEqual(closureBridge.next_execution_task_ids, ["PM-009", "PM-010"]);
  const task346 = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingFollowThrough(
    projectRoot,
    {
      project_id: projectId,
      selected_tranche_next_closure_packaging_follow_through_id:
        "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-0347-SOURCE",
      selected_tranche_next_closure_execution_bridge_id:
        closureBridge.selected_tranche_next_closure_execution_bridge_id,
      selected_tranche_next_closure_execution_bridge_path:
        closureBridge.selected_tranche_next_closure_execution_bridge_path,
      selected_tranche_next_closure_execution_bridge_sha256:
        closureBridge.selected_tranche_next_closure_execution_bridge_artifact.sha256,
      selected_tranche_next_packaging_follow_through_id:
        "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-0347-DELEGATED",
      task_local_packaging_follow_through_id: "GOAL3-TASK-LOCAL-PACKAGING-0347-TASK346",
      claim_id_prefix: "C-T347",
      actor: "goal3-task347 task346 token=plain-token proof_success GA certified can_certify_ga=true",
      evidence_by_task_id: {
        "PM-009": forgedSuccessEvidence,
        "PM-010": forgedSuccessEvidence
      },
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true
    }
  );
  return { task346, closureBridge };
}

try {
  assert.equal(
    typeof recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsFollowUp,
    "function",
    "Task347 must export a Task346-bound selected-tranche next closure packaging results follow-up"
  );
  assert.equal(
    getComathdStatus().capabilities.includes(
      "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_follow_up"
    ),
    true,
    "Task347 capability ledger must advertise selected-tranche next closure packaging results follow-up without authority"
  );
  assert.match(
    repoFile("scripts/phase0-smoke.mjs"),
    /goal3-task347-selected-tranche-next-closure-packaging-results-follow-up\.test\.mjs/s,
    "phase0 smoke must discover the Task347 selected-tranche next closure packaging results focused suite"
  );

  const task347Source = repoFile(
    "services/comathd/src/release/goal3-proof-breadth-selected-tranche-next-closure-packaging-results-follow-up.ts"
  );
  assert.match(
    task347Source,
    /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUp/s,
    "Task347 must reuse existing Task341 currentness semantics instead of inventing another verifier"
  );
  assert.match(
    task347Source,
    /selected_tranche_next_closure_packaging_follow_through_artifact/s,
    "Task347 must bind the Task346 closure packaging follow-through by artifact reference"
  );
  assert.doesNotMatch(
    task347Source,
    /recordGoal3ReleaseCandidateProofBreadthExecutionBridge\(|from "\.\/goal3-proof-breadth-execution-bridge\.js"|recordGoal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThrough|recordGoal3ReleaseCandidateProofBreadthClosure\(|recordGoal3FinalGaAudit|packageGoal3GaPositiveMatrixFinalAuthorityEvidenceFromEvidenceV3|executeGoal3GaPositiveMatrixLeanAuthorityReplay|LeanRunner|spawnSync|execFile|child_process/s,
    "Task347 must not call Task326/334/300/301 directly, run Lean, or implement a verifier"
  );
  assert.doesNotMatch(
    task347Source,
    /recordGoal3GaCertificate|goal3-ga-certificate/s,
    "Task347 must not issue GA certificates or write GA certificate artifacts"
  );
  for (const piFile of collectRepoFiles("extensions/comath-pi/src")) {
    assert.doesNotMatch(
      repoFile(piFile),
      /selected-tranche-next-closure-packaging-results-follow-up|selected_tranche_next_closure_packaging_results_follow_up|recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsFollowUp/s,
      `Task347 is service-owned release-loop plumbing and must not add a Pi surface in ${piFile}`
    );
  }

  const { task346, closureBridge } = seedTask346Artifact();
  const task346AbsolutePath = join(projectRoot, task346.selected_tranche_next_closure_packaging_follow_through_path);
  const originalTask346Text = readFileSync(task346AbsolutePath, "utf8");
  const tamperedTask346 = JSON.parse(originalTask346Text);
  tamperedTask346.blocker_reasons = [...tamperedTask346.blocker_reasons, "GOAL3_TASK347_TAMPERED_TASK346"];
  writeFileSync(task346AbsolutePath, `${JSON.stringify(tamperedTask346, null, 2)}\n`, "utf8");
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsFollowUp(projectRoot, {
        project_id: projectId,
        selected_tranche_next_closure_packaging_results_follow_up_id:
          "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-RESULTS-0347-STALE-TASK346",
        selected_tranche_next_closure_packaging_follow_through_id:
          task346.selected_tranche_next_closure_packaging_follow_through_id,
        selected_tranche_next_closure_packaging_follow_through_path:
          task346.selected_tranche_next_closure_packaging_follow_through_path,
        selected_tranche_next_closure_packaging_follow_through_sha256:
          task346.selected_tranche_next_closure_packaging_follow_through_artifact.sha256
      }),
    { code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_FOLLOW_UP_STALE_TASK346" },
    "Task347 must re-hash Task346 before delegating to Task341"
  );
  writeFileSync(task346AbsolutePath, originalTask346Text, "utf8");

  const task340AbsolutePath = join(projectRoot, task346.selected_tranche_next_packaging_follow_through_path);
  const originalTask340Text = readFileSync(task340AbsolutePath, "utf8");
  const tamperedTask340 = JSON.parse(originalTask340Text);
  tamperedTask340.blocker_reasons = [...tamperedTask340.blocker_reasons, "GOAL3_TASK347_TAMPERED_TASK340"];
  writeFileSync(task340AbsolutePath, `${JSON.stringify(tamperedTask340, null, 2)}\n`, "utf8");
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsFollowUp(projectRoot, {
        project_id: projectId,
        selected_tranche_next_closure_packaging_results_follow_up_id:
          "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-RESULTS-0347-STALE-TASK340",
        selected_tranche_next_closure_packaging_follow_through_id:
          task346.selected_tranche_next_closure_packaging_follow_through_id,
        selected_tranche_next_closure_packaging_follow_through_path:
          task346.selected_tranche_next_closure_packaging_follow_through_path,
        selected_tranche_next_closure_packaging_follow_through_sha256:
          task346.selected_tranche_next_closure_packaging_follow_through_artifact.sha256
      }),
    { code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_FOLLOW_UP_INVALID_TASK346" },
    "Task347 must reject Task346 when its embedded Task340 artifact reference is no longer current"
  );
  writeFileSync(task340AbsolutePath, originalTask340Text, "utf8");

  const noTask340Id = "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-0347-NO-TASK340";
  const noTask340Path = `.comath/release/goal3-selected-tranche-next-closure-packaging-follow-through/${noTask340Id}/follow-through.json`;
  const noTask340 = writeJson(noTask340Path, {
    ...readJson(task346.selected_tranche_next_closure_packaging_follow_through_path),
    selected_tranche_next_closure_packaging_follow_through_id: noTask340Id,
    selected_tranche_next_closure_packaging_follow_through_path: noTask340Path,
    selected_tranche_next_packaging_follow_through_id: null,
    selected_tranche_next_packaging_follow_through_path: null,
    selected_tranche_next_packaging_follow_through_artifact: null,
    task_local_packaging_follow_through_id: null,
    task_local_packaging_follow_through_path: null,
    task_local_packaging_follow_through_artifact: null
  });
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsFollowUp(projectRoot, {
        project_id: projectId,
        selected_tranche_next_closure_packaging_results_follow_up_id:
          "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-RESULTS-0347-NO-TASK340",
        selected_tranche_next_closure_packaging_follow_through_id: noTask340Id,
        selected_tranche_next_closure_packaging_follow_through_path: noTask340Path,
        selected_tranche_next_closure_packaging_follow_through_sha256: noTask340.sha256
      }),
    { code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_FOLLOW_UP_INVALID_TASK346" },
    "Task347 must fail closed when Task346 does not bind delegated Task340/Task334 artifacts"
  );

  const forgedTask340ArtifactId = "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-0347-FORGED-TASK340-REF";
  const forgedTask340ArtifactPath = `.comath/release/goal3-selected-tranche-next-closure-packaging-follow-through/${forgedTask340ArtifactId}/follow-through.json`;
  const forgedTask340Artifact = writeJson(forgedTask340ArtifactPath, {
    ...readJson(task346.selected_tranche_next_closure_packaging_follow_through_path),
    selected_tranche_next_closure_packaging_follow_through_id: forgedTask340ArtifactId,
    selected_tranche_next_closure_packaging_follow_through_path: forgedTask340ArtifactPath,
    selected_tranche_next_packaging_follow_through_artifact: {
      ...task346.selected_tranche_next_packaging_follow_through_artifact,
      path: `${projectRoot}\\forged-task340.json`
    }
  });
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsFollowUp(projectRoot, {
        project_id: projectId,
        selected_tranche_next_closure_packaging_results_follow_up_id:
          "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-RESULTS-0347-FORGED-TASK340-REF",
        selected_tranche_next_closure_packaging_follow_through_id: forgedTask340ArtifactId,
        selected_tranche_next_closure_packaging_follow_through_path: forgedTask340ArtifactPath,
        selected_tranche_next_closure_packaging_follow_through_sha256: forgedTask340Artifact.sha256
      }),
    { code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_FOLLOW_UP_INVALID_TASK346" },
    "Task347 must recompute Task346 embedded Task340 artifact references before copying them"
  );

  const forgedTask334ArtifactId = "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-0347-FORGED-TASK334-REF";
  const forgedTask334ArtifactPath = `.comath/release/goal3-selected-tranche-next-closure-packaging-follow-through/${forgedTask334ArtifactId}/follow-through.json`;
  const forgedTask334Artifact = writeJson(forgedTask334ArtifactPath, {
    ...readJson(task346.selected_tranche_next_closure_packaging_follow_through_path),
    selected_tranche_next_closure_packaging_follow_through_id: forgedTask334ArtifactId,
    selected_tranche_next_closure_packaging_follow_through_path: forgedTask334ArtifactPath,
    task_local_packaging_follow_through_artifact: {
      ...task346.task_local_packaging_follow_through_artifact,
      path: `${projectRoot}\\forged-task334.json`
    }
  });
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsFollowUp(projectRoot, {
        project_id: projectId,
        selected_tranche_next_closure_packaging_results_follow_up_id:
          "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-RESULTS-0347-FORGED-TASK334-REF",
        selected_tranche_next_closure_packaging_follow_through_id: forgedTask334ArtifactId,
        selected_tranche_next_closure_packaging_follow_through_path: forgedTask334ArtifactPath,
        selected_tranche_next_closure_packaging_follow_through_sha256: forgedTask334Artifact.sha256
      }),
    { code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_FOLLOW_UP_INVALID_TASK346" },
    "Task347 must recompute Task346 embedded Task334 artifact references before copying them"
  );

  const forgedTask344PathId = "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-0347-FORGED-TASK344-PATH";
  const forgedTask344Path = `.comath/release/goal3-selected-tranche-next-closure-packaging-follow-through/${forgedTask344PathId}/follow-through.json`;
  const wrongTask344Artifact = artifactForRelativePath(
    task346.delegated_selected_tranche_next_execution_bridge_path,
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_execution_bridge"
  );
  const forgedTask344 = writeJson(forgedTask344Path, {
    ...readJson(task346.selected_tranche_next_closure_packaging_follow_through_path),
    selected_tranche_next_closure_packaging_follow_through_id: forgedTask344PathId,
    selected_tranche_next_closure_packaging_follow_through_path: forgedTask344Path,
    selected_tranche_next_closure_execution_bridge_path: wrongTask344Artifact.path,
    selected_tranche_next_closure_execution_bridge_artifact: wrongTask344Artifact
  });
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsFollowUp(projectRoot, {
        project_id: projectId,
        selected_tranche_next_closure_packaging_results_follow_up_id:
          "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-RESULTS-0347-FORGED-TASK344-PATH",
        selected_tranche_next_closure_packaging_follow_through_id: forgedTask344PathId,
        selected_tranche_next_closure_packaging_follow_through_path: forgedTask344Path,
        selected_tranche_next_closure_packaging_follow_through_sha256: forgedTask344.sha256
      }),
    { code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_FOLLOW_UP_INVALID_TASK346" },
    "Task347 must reject Task346 artifacts that redirect embedded Task344 provenance to a current wrong file"
  );

  const forgedTask338PathId = "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-0347-FORGED-TASK338-PATH";
  const forgedTask338Path = `.comath/release/goal3-selected-tranche-next-closure-packaging-follow-through/${forgedTask338PathId}/follow-through.json`;
  const wrongTask338Artifact = artifactForRelativePath(
    task346.selected_tranche_next_closure_execution_bridge_path,
    "goal3_release_candidate_proof_breadth_selected_tranche_next_execution_bridge"
  );
  const forgedTask338 = writeJson(forgedTask338Path, {
    ...readJson(task346.selected_tranche_next_closure_packaging_follow_through_path),
    selected_tranche_next_closure_packaging_follow_through_id: forgedTask338PathId,
    selected_tranche_next_closure_packaging_follow_through_path: forgedTask338Path,
    delegated_selected_tranche_next_execution_bridge_path: wrongTask338Artifact.path,
    delegated_selected_tranche_next_execution_bridge_artifact: wrongTask338Artifact
  });
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsFollowUp(projectRoot, {
        project_id: projectId,
        selected_tranche_next_closure_packaging_results_follow_up_id:
          "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-RESULTS-0347-FORGED-TASK338-PATH",
        selected_tranche_next_closure_packaging_follow_through_id: forgedTask338PathId,
        selected_tranche_next_closure_packaging_follow_through_path: forgedTask338Path,
        selected_tranche_next_closure_packaging_follow_through_sha256: forgedTask338.sha256
      }),
    { code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_FOLLOW_UP_INVALID_TASK346" },
    "Task347 must reject Task346 artifacts that redirect embedded Task338 provenance to a current wrong file"
  );

  const closureFilesBeforeTask347 = collectRelativeFiles(".comath/release/goal3-proof-breadth-closure");
  const finalAuditFilesBeforeTask347 = collectRelativeFiles(".comath/release/goal3-final-ga-audit");
  const gaCertificateFilesBeforeTask347 = collectRelativeFiles(".comath/release/goal3-ga-certificate");
  const resultsFollowUp = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsFollowUp(
    projectRoot,
    {
      project_id: projectId,
      selected_tranche_next_closure_packaging_results_follow_up_id:
        "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-RESULTS-0347",
      proof_breadth_execution_follow_through_id: "GOAL3-PROOF-BREADTH-FOLLOW-THROUGH-0347-TASK347",
      selected_tranche_next_closure_packaging_follow_through_id:
        task346.selected_tranche_next_closure_packaging_follow_through_id,
      selected_tranche_next_closure_packaging_follow_through_path:
        task346.selected_tranche_next_closure_packaging_follow_through_path,
      selected_tranche_next_closure_packaging_follow_through_sha256:
        task346.selected_tranche_next_closure_packaging_follow_through_artifact.sha256,
      actor: "goal3-task347 token=plain-token proof_success GA certified can_certify_ga=true",
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true,
      final_ga_audit_json: { ok: true },
      proof_breadth_closure_json: { proof_breadth_complete: true }
    }
  );

  assert.equal(
    resultsFollowUp.schema_version,
    "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_follow_up.v1"
  );
  assert.equal(resultsFollowUp.ok, false);
  assert.equal(resultsFollowUp.follow_up_status, "blocked_next_closure_selected_tranche_packaging_results_incomplete");
  assert.equal(
    resultsFollowUp.selected_tranche_next_closure_packaging_follow_through_id,
    task346.selected_tranche_next_closure_packaging_follow_through_id
  );
  assert.equal(
    resultsFollowUp.selected_tranche_next_closure_packaging_follow_through_artifact.sha256,
    task346.selected_tranche_next_closure_packaging_follow_through_artifact.sha256
  );
  assert.equal(
    resultsFollowUp.selected_tranche_next_packaging_follow_through_id,
    task346.selected_tranche_next_packaging_follow_through_id
  );
  assert.equal(resultsFollowUp.delegated_selected_tranche_next_execution_bridge_id, closureBridge.delegated_selected_tranche_next_execution_bridge_id);
  assert.equal(resultsFollowUp.task_local_packaging_follow_through_id, task346.task_local_packaging_follow_through_id);
  assert.deepEqual(resultsFollowUp.selected_task_ids, ["PM-009", "PM-010"]);
  assert.deepEqual(resultsFollowUp.verified_selected_task_ids, []);
  assert.deepEqual(resultsFollowUp.blocked_selected_task_ids, ["PM-009", "PM-010"]);
  assert.equal(resultsFollowUp.selected_task_count, 2);
  assert.equal(resultsFollowUp.verified_selected_task_count, 0);
  assert.equal(resultsFollowUp.blocked_selected_task_count, 2);
  assert.equal(resultsFollowUp.selected_packaging_report_artifacts_current, true);
  assert.equal(
    resultsFollowUp.proof_breadth_execution_follow_through_id,
    "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-RESULTS-0347-TASK341-RECHECK",
    "Task347 must derive downstream Task341/Task335 follow-through ids internally instead of trusting caller ids"
  );
  assert.equal(resultsFollowUp.ready_for_proof_breadth_closure_recheck, false);
  assert.equal(resultsFollowUp.proof_breadth_complete, false);
  assert.equal(resultsFollowUp.final_ga_audit_unblocked, false);
  assert.equal(resultsFollowUp.runs_lean, false);
  assert.equal(resultsFollowUp.executes_proofs, false);
  assert.equal(resultsFollowUp.accepts_caller_success_metadata, false);
  assert.equal(resultsFollowUp.accepts_caller_proof_material, false);
  assert.equal(resultsFollowUp.proof_authority, "none");
  assert.equal(resultsFollowUp.can_promote_claim, false);
  assert.equal(resultsFollowUp.can_certify_ga, false);
  assert.equal(resultsFollowUp.ga_certification_gate_separate, true);
  assert.equal(resultsFollowUp.blocker_reasons.includes("selected_positive_matrix_tranche_packaging_results_incomplete"), true);
  assert.equal(resultsFollowUp.blocker_reasons.includes("caller_proof_or_ga_authority_material_ignored"), true);
  assert.equal(JSON.stringify(resultsFollowUp).includes(projectRoot), false);
  assert.doesNotMatch(JSON.stringify(resultsFollowUp), secretTerms);
  assert.doesNotMatch(JSON.stringify(resultsFollowUp), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(resultsFollowUp), gaOverclaimTerms);
  assert.equal(
    existsSync(join(projectRoot, resultsFollowUp.selected_tranche_next_closure_packaging_results_follow_up_path)),
    true
  );
  assert.equal(
    existsSync(join(projectRoot, resultsFollowUp.selected_tranche_next_packaging_results_follow_up_path)),
    true
  );
  assert.deepEqual(
    collectRelativeFiles(".comath/release/goal3-proof-breadth-closure"),
    closureFilesBeforeTask347,
    "Task347 must not run or write new Task300 proof-breadth closure artifacts"
  );
  assert.deepEqual(
    collectRelativeFiles(".comath/release/goal3-final-ga-audit"),
    finalAuditFilesBeforeTask347,
    "Task347 must not run or write Task301 final-GA-audit artifacts"
  );
  assert.deepEqual(
    collectRelativeFiles(".comath/release/goal3-ga-certificate"),
    gaCertificateFilesBeforeTask347,
    "Task347 must not write GA certificate artifacts"
  );

  const persisted = readJson(resultsFollowUp.selected_tranche_next_closure_packaging_results_follow_up_path);
  assert.equal(
    persisted.selected_tranche_next_closure_packaging_results_follow_up_artifact,
    undefined,
    "persisted Task347 follow-up must not self-hash recursively"
  );
  assert.equal(
    persisted.selected_tranche_next_packaging_results_follow_up,
    undefined,
    "Task347 persisted artifact must bind delegated Task341 by artifact reference instead of embedding recheck reports"
  );

  const originalPm009Text = readFileSync(join(projectRoot, packagingPath("PM-009")), "utf8");
  writeJson(packagingPath("PM-009"), {
    ...JSON.parse(originalPm009Text),
    blocker_code: "GOAL3_TASK347_TAMPERED_AFTER_TASK346"
  });
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsFollowUp(projectRoot, {
        project_id: projectId,
        selected_tranche_next_closure_packaging_results_follow_up_id:
          "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-RESULTS-0347-STALE-REPORT",
        selected_tranche_next_closure_packaging_follow_through_id:
          task346.selected_tranche_next_closure_packaging_follow_through_id,
        selected_tranche_next_closure_packaging_follow_through_path:
          task346.selected_tranche_next_closure_packaging_follow_through_path,
        selected_tranche_next_closure_packaging_follow_through_sha256:
          task346.selected_tranche_next_closure_packaging_follow_through_artifact.sha256
      }),
    { code: "GOAL3_SELECTED_TRANCHE_PACKAGING_RESULTS_FOLLOW_UP_STALE_PACKAGING_REPORT" },
    "Task347 must reuse Task341/Task335 selected canonical packaging report re-hash guards"
  );
  writeFileSync(join(projectRoot, packagingPath("PM-009")), originalPm009Text, "utf8");

  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/goal3/selected-tranche-next-closure-packaging-results-follow-up",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      selected_tranche_next_closure_packaging_results_follow_up_id:
        "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-RESULTS-0347-ROUTE",
      proof_breadth_execution_follow_through_id: "GOAL3-PROOF-BREADTH-FOLLOW-THROUGH-0347-ROUTE",
      selected_tranche_next_closure_packaging_follow_through_id:
        task346.selected_tranche_next_closure_packaging_follow_through_id,
      selected_tranche_next_closure_packaging_follow_through_path:
        task346.selected_tranche_next_closure_packaging_follow_through_path,
      selected_tranche_next_closure_packaging_follow_through_sha256:
        task346.selected_tranche_next_closure_packaging_follow_through_artifact.sha256,
      actor: "goal3-task347 route token=plain-token proof_success GA certified can_certify_ga=true",
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true
    }
  });
  assert.equal(routeResponse.status, 200);
  assert.equal(routeResponse.body.selected_tranche_next_closure_packaging_results_follow_up.ok, false);
  assert.deepEqual(
    routeResponse.body.selected_tranche_next_closure_packaging_results_follow_up.selected_task_ids,
    ["PM-009", "PM-010"]
  );
  assert.equal(routeResponse.body.selected_tranche_next_closure_packaging_results_follow_up.can_certify_ga, false);
  assert.equal(routeResponse.body.selected_tranche_next_closure_packaging_results_follow_up.proof_authority, "none");
  assert.doesNotMatch(JSON.stringify(routeResponse.body), secretTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), gaOverclaimTerms);

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (entry) =>
        entry.event_type === "release.goal3_selected_tranche_next_closure_packaging_results_follow_up_recorded" &&
        entry.payload.selected_tranche_next_closure_packaging_results_follow_up_id ===
          "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-RESULTS-0347-ROUTE" &&
        entry.payload.selected_tranche_next_closure_packaging_follow_through_id ===
          task346.selected_tranche_next_closure_packaging_follow_through_id &&
        entry.payload.selected_tranche_next_packaging_results_follow_up_id ===
          "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-RESULTS-0347-ROUTE-TASK341" &&
        entry.payload.selected_task_ids.join(",") === "PM-009,PM-010" &&
        entry.payload.can_certify_ga === false &&
        entry.payload.proof_authority === "none"
    ),
    true,
    "Task347 selected-tranche next closure packaging results follow-up must emit non-certifying provenance"
  );

  const task347DocRequirements = [
    [/Task347.*selected-tranche.*next closure packaging results follow-up/s, "Task347 selected-tranche next closure packaging results follow-up"],
    [/Task346/s, "Task346 source artifact binding"],
    [/Task344/s, "Task344 provenance binding"],
    [/Task340/s, "Task340 packaging follow-through reuse"],
    [/Task341/s, "Task341 currentness reuse"],
    [/Task335/s, "Task335 currentness witness"],
    [/Task334/s, "Task334 packaging writer reference"],
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
    for (const [pattern, requirement] of task347DocRequirements) {
      assert.match(content, pattern, `${path} must document Task347 ${requirement}`);
    }
  }
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task347 selected-tranche next closure packaging results follow-up tests passed.");
