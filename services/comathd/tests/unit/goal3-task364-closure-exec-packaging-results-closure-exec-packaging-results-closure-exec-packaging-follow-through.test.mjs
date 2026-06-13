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
  getComathdStatus,
  initProject,
  readAuditEvents,
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionBridge,
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough,
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureRecheck
} = comath;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task364-closure-exec-packaging-follow-through-"));
const repoRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const { project } = initProject({
  name: "Goal 3 Task364 selected tranche closure execution packaging results closure execution packaging follow-through",
  root_path: projectRoot
});
const projectId = project.project_id;
const secretTerms = /Authorization:\s*Bearer|api_key|token=|plain-token|\bsk-[A-Za-z0-9_-]+/i;
const proofAuthorityTerms =
  /clean_replay_passed\s*[:=]\s*(?:true|1)|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|kernel_checked|proof_success/i;
const gaOverclaimTerms = /GA certified|can_certify_ga\s*[:=]\s*(?:true|1)|can_promote_claim\s*[:=]\s*(?:true|1)/i;
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

function artifactForRelativePath(relativePath, kind) {
  const bytes = readFileSync(join(projectRoot, relativePath));
  return {
    kind,
    path: relativePath,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    size_bytes: bytes.byteLength
  };
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
      verified_final_evidence_classes: ["lean_run_manifest_v3", "final_replay_manifest_v3"],
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

function dummyArtifact(id, directory, filename, kind) {
  const path = `.comath/release/${directory}/${id}/${filename}`;
  const artifact = writeJson(path, {
    schema_version: `comath.${kind}.fixture`,
    id,
    project_id: projectId,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  });
  return { path, artifact: { kind, path, sha256: artifact.sha256, size_bytes: artifact.size_bytes } };
}

function seedTask347Artifact({
  task347Id = "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-RESULTS-0364",
  task341Id = "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-RESULTS-0364",
  selectedTaskIds = ["PM-009", "PM-010"]
} = {}) {
  for (const taskId of selectedTaskIds) {
    writeJson(packagingPath(taskId), verifiedPackagingReport(taskId));
  }
  const selectedArtifacts = selectedTaskIds.map((taskId) =>
    artifactForRelativePath(packagingPath(taskId), "final_authority_packaging_report_v3")
  );

  const task335 = dummyArtifact(
    "GOAL3-SELECTED-TRANCHE-PACKAGING-RESULTS-0364",
    "goal3-selected-tranche-packaging-results-follow-up",
    "follow-up.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_packaging_results_follow_up"
  );
  const task341Path = `.comath/release/goal3-selected-tranche-next-packaging-results-follow-up/${task341Id}/follow-up.json`;
  const task341 = writeJson(task341Path, {
    schema_version: "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_packaging_results_follow_up.v1",
    selected_tranche_next_packaging_results_follow_up_id: task341Id,
    project_id: projectId,
    actor: "goal3-task364 task341 seed",
    created_at: "2026-06-14T00:00:00.000Z",
    ok: true,
    follow_up_status: "next_selected_tranche_packaging_results_current_for_proof_breadth_closure_recheck",
    selected_tranche_next_packaging_results_follow_up_path: task341Path,
    selected_tranche_packaging_results_follow_up_id: "GOAL3-SELECTED-TRANCHE-PACKAGING-RESULTS-0364",
    selected_tranche_packaging_results_follow_up_path: task335.path,
    selected_tranche_packaging_results_follow_up_artifact: task335.artifact,
    blocker_reasons: [],
    selected_task_count: selectedTaskIds.length,
    verified_selected_task_count: selectedTaskIds.length,
    missing_selected_task_count: 0,
    blocked_selected_task_count: 0,
    selected_task_ids: selectedTaskIds,
    verified_selected_task_ids: selectedTaskIds,
    missing_selected_task_ids: [],
    blocked_selected_task_ids: [],
    selected_packaging_report_artifacts: selectedArtifacts,
    selected_packaging_report_artifacts_current: true,
    ready_for_proof_breadth_closure_recheck: true,
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

  const task346 = dummyArtifact(
    "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-0364",
    "goal3-selected-tranche-next-closure-packaging-follow-through",
    "follow-through.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_follow_through"
  );
  const task344 = dummyArtifact(
    "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-BRIDGE-0364",
    "goal3-selected-tranche-next-closure-execution-bridge",
    "bridge.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_execution_bridge"
  );
  const task338 = dummyArtifact(
    "GOAL3-SELECTED-TRANCHE-NEXT-BRIDGE-0364",
    "goal3-selected-tranche-next-execution-bridge",
    "bridge.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_next_execution_bridge"
  );
  const task340 = dummyArtifact(
    "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-0364",
    "goal3-selected-tranche-next-packaging-follow-through",
    "follow-through.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_next_packaging_follow_through"
  );
  const task334 = dummyArtifact(
    "GOAL3-TASK-LOCAL-PACKAGING-0364",
    "goal3-task-local-packaging-follow-through",
    "follow-through.json",
    "goal3_release_candidate_proof_breadth_task_local_packaging_follow_through"
  );

  const task347Path = `.comath/release/goal3-selected-tranche-next-closure-packaging-results-follow-up/${task347Id}/follow-up.json`;
  return writeJson(task347Path, {
    schema_version:
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_follow_up.v1",
    selected_tranche_next_closure_packaging_results_follow_up_id: task347Id,
    project_id: projectId,
    actor: "goal3-task364 task347 seed",
    created_at: "2026-06-14T00:00:00.000Z",
    ok: true,
    follow_up_status: "next_closure_selected_tranche_packaging_results_current_for_proof_breadth_closure_recheck",
    selected_tranche_next_closure_packaging_results_follow_up_path: task347Path,
    requested_follow_up_mode:
      "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_follow_up",
    selected_tranche_next_closure_packaging_follow_through_id: "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-0364",
    selected_tranche_next_closure_packaging_follow_through_path: task346.path,
    selected_tranche_next_closure_packaging_follow_through_artifact: task346.artifact,
    selected_tranche_next_closure_execution_bridge_id: "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-BRIDGE-0364",
    selected_tranche_next_closure_execution_bridge_path: task344.path,
    selected_tranche_next_closure_execution_bridge_artifact: task344.artifact,
    delegated_selected_tranche_next_execution_bridge_id: "GOAL3-SELECTED-TRANCHE-NEXT-BRIDGE-0364",
    delegated_selected_tranche_next_execution_bridge_path: task338.path,
    delegated_selected_tranche_next_execution_bridge_artifact: task338.artifact,
    selected_tranche_next_packaging_follow_through_id: "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-0364",
    selected_tranche_next_packaging_follow_through_path: task340.path,
    selected_tranche_next_packaging_follow_through_artifact: task340.artifact,
    task_local_packaging_follow_through_id: "GOAL3-TASK-LOCAL-PACKAGING-0364",
    task_local_packaging_follow_through_path: task334.path,
    task_local_packaging_follow_through_artifact: task334.artifact,
    selected_tranche_next_packaging_results_follow_up_id: task341Id,
    selected_tranche_next_packaging_results_follow_up_path: task341.path,
    selected_tranche_next_packaging_results_follow_up_artifact: {
      kind: "goal3_release_candidate_proof_breadth_selected_tranche_next_packaging_results_follow_up",
      path: task341.path,
      sha256: task341.sha256,
      size_bytes: task341.size_bytes
    },
    blocker_reasons: [],
    selected_task_count: selectedTaskIds.length,
    verified_selected_task_count: selectedTaskIds.length,
    missing_selected_task_count: 0,
    blocked_selected_task_count: 0,
    selected_task_ids: selectedTaskIds,
    verified_selected_task_ids: selectedTaskIds,
    missing_selected_task_ids: [],
    blocked_selected_task_ids: [],
    selected_packaging_report_artifacts: selectedArtifacts,
    selected_packaging_report_artifacts_current: true,
    ready_for_proof_breadth_closure_recheck: true,
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

function seedTask350Artifact({ task350Id = "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-RESULTS-CLOSURE-BRIDGE-0364" } = {}) {
  const task347 = seedTask347Artifact();
  const task349 = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureRecheck(projectRoot, {
    project_id: projectId,
    selected_tranche_next_closure_packaging_results_closure_recheck_id:
      "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-RESULTS-CLOSURE-0364",
    selected_tranche_next_closure_packaging_results_follow_up_id:
      task347.body.selected_tranche_next_closure_packaging_results_follow_up_id,
    selected_tranche_next_closure_packaging_results_follow_up_path:
      task347.body.selected_tranche_next_closure_packaging_results_follow_up_path,
    selected_tranche_next_closure_packaging_results_follow_up_sha256: task347.sha256,
    actor: "goal3-task364 task349 seed"
  });
  return recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionBridge(
    projectRoot,
    {
      project_id: projectId,
      selected_tranche_next_closure_packaging_results_closure_execution_bridge_id: task350Id,
      selected_tranche_next_closure_execution_bridge_id: "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-BRIDGE-0364-DELEGATED",
      selected_tranche_next_execution_bridge_id: "GOAL3-SELECTED-TRANCHE-NEXT-BRIDGE-0364-DELEGATED",
      proof_breadth_execution_bridge_id: "GOAL3-PROOF-BREADTH-BRIDGE-0364-DELEGATED",
      selected_tranche_next_closure_packaging_results_closure_recheck_id:
        task349.selected_tranche_next_closure_packaging_results_closure_recheck_id,
      selected_tranche_next_closure_packaging_results_closure_recheck_path:
        task349.selected_tranche_next_closure_packaging_results_closure_recheck_path,
      selected_tranche_next_closure_packaging_results_closure_recheck_sha256:
        task349.selected_tranche_next_closure_packaging_results_closure_recheck_artifact.sha256,
      actor: "goal3-task364 task350 seed token=plain-token proof_success GA certified can_certify_ga=true",
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true,
      max_tranche_size: 2
    }
  );
}

function seedTask356Artifact({
  task356Id = "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-BRIDGE-0364",
  task350 = seedTask350Artifact()
} = {}) {
  const task355 = dummyArtifact(
    "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-0364",
    "goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-recheck",
    "recheck.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck"
  );
  const task353 = dummyArtifact(
    "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-0364",
    "goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-follow-up",
    "follow-up.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up"
  );
  const task349 = artifactForRelativePath(
    task350.selected_tranche_next_closure_packaging_results_closure_recheck_path,
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_recheck"
  );
  const task356Path = `.comath/release/goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-bridge/${task356Id}/bridge.json`;
  return writeJson(task356Path, {
    schema_version:
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge.v1",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
      task356Id,
    project_id: projectId,
    actor: "goal3-task364 task356 seed token=plain-token proof_success GA certified can_certify_ga=true",
    created_at: "2026-06-14T00:00:00.000Z",
    ok: task350.ok,
    bridge_status: task350.bridge_status,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path:
      task356Path,
    requested_bridge_mode:
      "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id:
      task355.artifact.path.split("/").at(-2),
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path:
      task355.path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact:
      task355.artifact,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id:
      task353.artifact.path.split("/").at(-2),
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_path:
      task353.path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_artifact:
      task353.artifact,
    delegated_selected_tranche_next_closure_packaging_results_closure_recheck_id:
      task350.selected_tranche_next_closure_packaging_results_closure_recheck_id,
    delegated_selected_tranche_next_closure_packaging_results_closure_recheck_path:
      task350.selected_tranche_next_closure_packaging_results_closure_recheck_path,
    delegated_selected_tranche_next_closure_packaging_results_closure_recheck_artifact: task349,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_bridge_id:
      task350.selected_tranche_next_closure_packaging_results_closure_execution_bridge_id,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_bridge_path:
      task350.selected_tranche_next_closure_packaging_results_closure_execution_bridge_path,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_bridge_artifact:
      task350.selected_tranche_next_closure_packaging_results_closure_execution_bridge_artifact,
    delegated_selected_tranche_next_closure_execution_bridge_id:
      task350.delegated_selected_tranche_next_closure_execution_bridge_id,
    delegated_selected_tranche_next_closure_execution_bridge_path:
      task350.delegated_selected_tranche_next_closure_execution_bridge_path,
    delegated_selected_tranche_next_closure_execution_bridge_artifact:
      task350.delegated_selected_tranche_next_closure_execution_bridge_artifact,
    delegated_selected_tranche_next_execution_bridge_id: task350.delegated_selected_tranche_next_execution_bridge_id,
    delegated_selected_tranche_next_execution_bridge_path: task350.delegated_selected_tranche_next_execution_bridge_path,
    delegated_selected_tranche_next_execution_bridge_artifact: task350.delegated_selected_tranche_next_execution_bridge_artifact,
    next_proof_breadth_execution_bridge_id: task350.next_proof_breadth_execution_bridge_id,
    next_proof_breadth_execution_bridge_path: task350.next_proof_breadth_execution_bridge_path,
    next_proof_breadth_execution_bridge_artifact: task350.next_proof_breadth_execution_bridge_artifact,
    completed_selected_task_ids: task350.completed_selected_task_ids,
    completed_selected_task_count: task350.completed_selected_task_count,
    next_execution_task_ids: task350.next_execution_task_ids,
    max_tranche_size: task350.max_tranche_size,
    blocker_reasons: task350.blocker_reasons,
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

function seedTask362Artifact({
  task362Id = "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-BRIDGE-0364",
  task356 = seedTask356Artifact()
} = {}) {
  const task361 = dummyArtifact(
    "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-0364",
    "goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-recheck",
    "recheck.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck"
  );
  const task356Artifact = {
    kind: "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge",
    path: task356.path,
    sha256: task356.sha256,
    size_bytes: task356.size_bytes
  };
  const task362Path = `.comath/release/goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-bridge/${task362Id}/bridge.json`;
  return writeJson(task362Path, {
    schema_version:
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge.v1",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
      task362Id,
    project_id: projectId,
    actor: "goal3-task364 task362 seed token=plain-token proof_success GA certified can_certify_ga=true",
    created_at: "2026-06-14T00:00:00.000Z",
    ok: task356.body.ok,
    bridge_status: task356.body.bridge_status,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path:
      task362Path,
    requested_bridge_mode:
      "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id:
      task361.artifact.path.split("/").at(-2),
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_path:
      task361.path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_artifact:
      task361.artifact,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
      task356.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path:
      task356.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact:
      task356Artifact,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id:
      task356.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path:
      task356.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact:
      task356.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id:
      task356.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path:
      task356.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact:
      task356.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
      task356.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path:
      task356.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact:
      task356Artifact,
    next_proof_breadth_execution_bridge_id: task356.body.next_proof_breadth_execution_bridge_id,
    next_proof_breadth_execution_bridge_path: task356.body.next_proof_breadth_execution_bridge_path,
    next_proof_breadth_execution_bridge_artifact: task356.body.next_proof_breadth_execution_bridge_artifact,
    completed_selected_task_ids: task356.body.completed_selected_task_ids,
    completed_selected_task_count: task356.body.completed_selected_task_count,
    next_execution_task_ids: task356.body.next_execution_task_ids,
    max_tranche_size: task356.body.max_tranche_size,
    blocker_reasons: task356.body.blocker_reasons,
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
    typeof recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough,
    "function",
    "Task364 must export a Task362-bound closure execution packaging follow-through"
  );
  assert.equal(
    getComathdStatus().capabilities.includes(
      "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through"
    ),
    true,
    "Task364 capability ledger must advertise closure execution packaging follow-through without authority"
  );
  assert.match(
    repoFile("scripts/phase0-smoke.mjs"),
    /goal3-task364-closure-exec-packaging-results-closure-exec-packaging-results-closure-exec-packaging-follow-through\.test\.mjs/s,
    "phase0 smoke must discover the Task364 focused suite"
  );

  const task364Source = repoFile(
    "services/comathd/src/release/goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-follow-through.ts"
  );
  assert.match(
    task364Source,
    /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough/s,
    "Task364 must delegate Task362-bound closure execution packaging to existing Task358/352/346/340/334 semantics"
  );
  for (const forbiddenPattern of [
    /recordGoal3ReleaseCandidateProofBreadthExecutionBridge\(/s,
    /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge/s,
    /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureExecutionBridge/s,
    /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingFollowThrough/s,
    /recordGoal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThrough/s,
    /recordGoal3ReleaseCandidateProofBreadthClosure\(/s,
    /recordGoal3FinalGaAudit/s,
    /recordGoal3GaCertificate/s,
    /LeanRunner/s,
    /spawnSync/s,
    /execFile/s,
    /child_process/s
  ]) {
    assert.doesNotMatch(
      task364Source,
      forbiddenPattern,
      "Task364 must remain a Task362-to-Task358 handoff with no Lean, direct lower producers, or certificate writes"
    );
  }

  const task350 = seedTask350Artifact();
  const task356 = seedTask356Artifact({ task350 });
  const task362 = seedTask362Artifact({ task356 });
  const unselectedTaskId = task350.next_execution_task_ids.includes("PM-003") ? "PM-004" : "PM-003";

  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough(
        projectRoot,
        {
          project_id: projectId,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
            "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-0364-STALE",
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
            task362.body
              .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path:
            task362.body
              .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_sha256:
            "0".repeat(64)
        }
      ),
    {
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_FOLLOW_THROUGH_STALE_TASK362"
    },
    "Task364 must reject stale Task362 artifacts before delegating to Task358"
  );

  const weakenedPath =
    task362.body
      .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path;
  const originalTask362Text = readFileSync(join(projectRoot, weakenedPath), "utf8");
  const weakenedBody = JSON.parse(originalTask362Text);
  const weakenedText = `${JSON.stringify({ ...weakenedBody, can_certify_ga: true }, null, 2)}\n`;
  writeFileSync(join(projectRoot, weakenedPath), weakenedText, "utf8");
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough(
        projectRoot,
        {
          project_id: projectId,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
            "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-0364-WEAKENED",
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
            task362.body
              .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path:
            weakenedPath,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_sha256:
            sha256Text(weakenedText)
        }
      ),
    {
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_FOLLOW_THROUGH_INVALID_TASK362"
    },
    "Task364 must reject current Task362 artifacts with weakened no-authority flags"
  );
  writeFileSync(join(projectRoot, weakenedPath), originalTask362Text, "utf8");

  const driftBody = JSON.parse(originalTask362Text);
  const driftTask356 = dummyArtifact(
    "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-BRIDGE-0364-DRIFT",
    "goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-bridge",
    "bridge.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge"
  );
  const driftText = `${JSON.stringify(
    {
      ...driftBody,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
        "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-BRIDGE-0364-DRIFT",
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path:
        driftTask356.path,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact:
        driftTask356.artifact
    },
    null,
    2
  )}\n`;
  writeFileSync(join(projectRoot, weakenedPath), driftText, "utf8");
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough(
        projectRoot,
        {
          project_id: projectId,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
            "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-0364-DRIFT",
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
            task362.body
              .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path:
            weakenedPath,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_sha256:
            sha256Text(driftText)
        }
      ),
    {
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_FOLLOW_THROUGH_INVALID_TASK362"
    },
    "Task364 must reject Task362 artifacts whose delegated Task356 reference drifts"
  );
  writeFileSync(join(projectRoot, weakenedPath), originalTask362Text, "utf8");

  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough(
        projectRoot,
        {
          project_id: projectId,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
            "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-0364-UNSELECTED",
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
            task362.body
              .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path:
            task362.body
              .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_sha256:
            task362.sha256,
          evidence_by_task_id: Object.fromEntries(
            [...task350.next_execution_task_ids, unselectedTaskId].map((taskId) => [taskId, forgedSuccessEvidence])
          )
        }
      ),
    { code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_FOLLOW_THROUGH_UNSELECTED_EVIDENCE" },
    "Task364 must let delegated Task358/352/346 reject evidence outside the Task362 delegated selected tranche"
  );

  const closureFilesBefore = collectRelativeFiles(".comath/release/goal3-proof-breadth-closure");
  const finalAuditFilesBefore = collectRelativeFiles(".comath/release/goal3-final-ga-audit");
  const gaCertificateFilesBefore = collectRelativeFiles(".comath/release/goal3-ga-certificate");
  const followThrough =
    recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough(
      projectRoot,
      {
        project_id: projectId,
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
          "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-0364",
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
          task362.body
            .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id,
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path:
          task362.body
            .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path,
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_sha256:
          task362.sha256,
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
          "G3-T364-T358-OK",
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id:
          "G3-T364-T352-OK",
        selected_tranche_next_closure_packaging_follow_through_id: "G3-T364-T346-OK",
        selected_tranche_next_packaging_follow_through_id: "G3-T364-T340-OK",
        task_local_packaging_follow_through_id: "G3-T364-T334-OK",
        claim_id_prefix: "C-T364",
        actor: "goal3-task364 token=plain-token proof_success GA certified can_certify_ga=true",
        evidence_by_task_id: Object.fromEntries(task350.next_execution_task_ids.map((taskId) => [taskId, forgedSuccessEvidence])),
        proof_authority: "lean_kernel_clean_replay",
        can_certify_ga: true,
        final_ga_audit_json: { ok: true },
        proof_breadth_closure_json: { proof_breadth_complete: true }
      }
    );

  assert.equal(
    followThrough.schema_version,
    "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through.v1"
  );
  assert.equal(followThrough.ok, false);
  assert.equal(followThrough.follow_through_status, "blocked_next_selected_tranche_task_local_packaging_incomplete");
  assert.equal(
    followThrough.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact.sha256,
    task362.sha256
  );
  assert.equal(
    followThrough.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact.kind,
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through"
  );
  assert.equal(
    followThrough.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id,
    task356.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id
  );
  assert.deepEqual(followThrough.selected_task_ids, task350.next_execution_task_ids);
  assert.deepEqual(followThrough.verified_selected_task_ids, []);
  assert.deepEqual(followThrough.blocked_selected_task_ids, task350.next_execution_task_ids);
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
  assert.deepEqual(
    collectRelativeFiles(".comath/release/goal3-proof-breadth-closure"),
    closureFilesBefore,
    "Task364 must not write Task300 proof-breadth closure artifacts"
  );
  assert.deepEqual(
    collectRelativeFiles(".comath/release/goal3-final-ga-audit"),
    finalAuditFilesBefore,
    "Task364 must not write Task301 final-GA-audit artifacts"
  );
  assert.deepEqual(
    collectRelativeFiles(".comath/release/goal3-ga-certificate"),
    gaCertificateFilesBefore,
    "Task364 must not write Task303 GA-certificate artifacts"
  );

  const persisted = readJson(
    followThrough
      .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path
  );
  assert.equal(
    persisted
      .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact,
    undefined,
    "persisted Task364 follow-through must not self-hash recursively"
  );
  assert.equal(
    persisted.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through,
    undefined,
    "Task364 persisted artifact must bind delegated Task358 by artifact reference instead of embedding packaging reports"
  );

  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/goal3/selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-follow-through",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
        "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-0364-ROUTE",
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
        task362.body
          .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path:
        task362.body
          .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_sha256:
        task362.sha256,
      actor: "goal3-task364 route token=plain-token proof_success GA certified can_certify_ga=true",
      evidence_by_task_id: Object.fromEntries(task350.next_execution_task_ids.map((taskId) => [taskId, forgedSuccessEvidence])),
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true
    }
  });
  assert.equal(routeResponse.status, 200);
  assert.equal(
    routeResponse.body
      .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through
      .proof_authority,
    "none"
  );
  assert.equal(
    routeResponse.body
      .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through
      .can_certify_ga,
    false
  );
  assert.doesNotMatch(JSON.stringify(routeResponse.body), secretTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), gaOverclaimTerms);

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (entry) =>
        entry.event_type ===
          "release.goal3_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_recorded" &&
        entry.payload
          .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id ===
          "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-0364-ROUTE" &&
        entry.payload.can_certify_ga === false &&
        entry.payload.proof_authority === "none"
    ),
    true,
    "Task364 must emit non-certifying provenance"
  );

  for (const forbiddenPattern of [
    /selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-follow-through/s,
    /selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through/s
  ]) {
    assert.doesNotMatch(repoFile("extensions/comath-pi/src/index.ts"), forbiddenPattern, "Task364 must not add a Pi tool surface");
    assert.doesNotMatch(
      repoFile("extensions/comath-pi/src/runtime-registration.ts"),
      forbiddenPattern,
      "Task364 must not add a Pi runtime command"
    );
  }

  for (const [path, pattern] of [
    ["README.md", /Task364.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging follow-through/s],
    ["TODO.md", /Task364.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging follow-through/s],
    ["goal-3/tasks.md", /Task364.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging follow-through/s],
    ["REVIEW.md", /Goal 3 Task 364/s],
    ["AGENTS.md", /Task364.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging follow-through/s],
    ["docs/architecture/ga-release-criteria.md", /Task364.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging follow-through/s],
    ["docs/architecture/threat-model.md", /Task364.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging follow-through/s],
    ["docs/architecture/acceptance-matrix.md", /Task364.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging follow-through/s],
    ["docs/progress/goal-3-ga-gap-matrix.md", /Task364.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging follow-through/s]
  ]) {
    assert.match(
      repoFile(path),
      pattern,
      `${path} must document Task364 selected-tranche closure execution packaging results closure execution packaging results closure execution packaging follow-through`
    );
  }
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log(
  "Goal 3 Task364 selected-tranche closure execution packaging results closure execution packaging results closure execution packaging follow-through tests passed."
);
