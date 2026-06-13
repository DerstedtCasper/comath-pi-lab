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
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck
} = comath;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task361-closure-exec-packaging-results-recheck-"));
const repoRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const { project } = initProject({
  name: "Goal 3 Task361 selected tranche closure execution packaging results closure recheck",
  root_path: projectRoot
});
const projectId = project.project_id;
const secretTerms = /Authorization:\s*Bearer|api_key|token=|plain-token|\bsk-[A-Za-z0-9_-]+/i;
const proofAuthorityTerms =
  /clean_replay_passed\s*[:=]\s*(?:true|1)|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|kernel_checked|proof_success/i;
const gaOverclaimTerms = /GA certified|can_certify_ga\s*[:=]\s*(?:true|1)|can_promote_claim\s*[:=]\s*(?:true|1)/i;

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
  suffix = "0361",
  task347Id = `GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-RESULTS-${suffix}`,
  task341Id = `GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-RESULTS-${suffix}`,
  selectedTaskIds = ["PM-009", "PM-010"]
} = {}) {
  for (const taskId of selectedTaskIds) {
    writeJson(packagingPath(taskId), verifiedPackagingReport(taskId));
  }
  const selectedArtifacts = selectedTaskIds.map((taskId) =>
    artifactForRelativePath(packagingPath(taskId), "final_authority_packaging_report_v3")
  );
  const task335 = dummyArtifact(
    `GOAL3-SELECTED-TRANCHE-PACKAGING-RESULTS-${suffix}`,
    "goal3-selected-tranche-packaging-results-follow-up",
    "follow-up.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_packaging_results_follow_up"
  );
  const task341Path = `.comath/release/goal3-selected-tranche-next-packaging-results-follow-up/${task341Id}/follow-up.json`;
  const task341 = writeJson(task341Path, {
    schema_version: "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_packaging_results_follow_up.v1",
    selected_tranche_next_packaging_results_follow_up_id: task341Id,
    project_id: projectId,
    actor: "goal3-task361 task341 seed",
    created_at: "2026-06-14T00:00:00.000Z",
    ok: true,
    follow_up_status: "next_selected_tranche_packaging_results_current_for_proof_breadth_closure_recheck",
    selected_tranche_next_packaging_results_follow_up_path: task341Path,
    selected_tranche_packaging_results_follow_up_id: `GOAL3-SELECTED-TRANCHE-PACKAGING-RESULTS-${suffix}`,
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
    `GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-${suffix}`,
    "goal3-selected-tranche-next-closure-packaging-follow-through",
    "follow-through.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_follow_through"
  );
  const task344 = dummyArtifact(
    `GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-BRIDGE-${suffix}`,
    "goal3-selected-tranche-next-closure-execution-bridge",
    "bridge.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_execution_bridge"
  );
  const task338 = dummyArtifact(
    `GOAL3-SELECTED-TRANCHE-NEXT-BRIDGE-${suffix}`,
    "goal3-selected-tranche-next-execution-bridge",
    "bridge.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_next_execution_bridge"
  );
  const task340 = dummyArtifact(
    `GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-${suffix}`,
    "goal3-selected-tranche-next-packaging-follow-through",
    "follow-through.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_next_packaging_follow_through"
  );
  const task334 = dummyArtifact(
    `GOAL3-TASK-LOCAL-PACKAGING-${suffix}`,
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
    actor: "goal3-task361 task347 seed",
    created_at: "2026-06-14T00:00:00.000Z",
    ok: true,
    follow_up_status: "next_closure_selected_tranche_packaging_results_current_for_proof_breadth_closure_recheck",
    selected_tranche_next_closure_packaging_results_follow_up_path: task347Path,
    requested_follow_up_mode:
      "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_follow_up",
    selected_tranche_next_closure_packaging_follow_through_id: task346.artifact.id ?? `GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-${suffix}`,
    selected_tranche_next_closure_packaging_follow_through_path: task346.path,
    selected_tranche_next_closure_packaging_follow_through_artifact: task346.artifact,
    selected_tranche_next_closure_execution_bridge_id: `GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-BRIDGE-${suffix}`,
    selected_tranche_next_closure_execution_bridge_path: task344.path,
    selected_tranche_next_closure_execution_bridge_artifact: task344.artifact,
    delegated_selected_tranche_next_execution_bridge_id: `GOAL3-SELECTED-TRANCHE-NEXT-BRIDGE-${suffix}`,
    delegated_selected_tranche_next_execution_bridge_path: task338.path,
    delegated_selected_tranche_next_execution_bridge_artifact: task338.artifact,
    selected_tranche_next_packaging_follow_through_id: `GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-${suffix}`,
    selected_tranche_next_packaging_follow_through_path: task340.path,
    selected_tranche_next_packaging_follow_through_artifact: task340.artifact,
    task_local_packaging_follow_through_id: `GOAL3-TASK-LOCAL-PACKAGING-${suffix}`,
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

function seedTask353Artifact({
  suffix = "0361",
  task353Id = `GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-${suffix}`
} = {}) {
  const task347 = seedTask347Artifact({ suffix });
  const task352 = dummyArtifact(
    `GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-${suffix}`,
    "goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-follow-through",
    "follow-through.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through"
  );
  const task350 = dummyArtifact(
    `GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-RESULTS-CLOSURE-BRIDGE-${suffix}`,
    "goal3-selected-tranche-next-closure-packaging-results-closure-execution-bridge",
    "bridge.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_bridge"
  );
  const task353Path = `.comath/release/goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-follow-up/${task353Id}/follow-up.json`;
  return writeJson(task353Path, {
    schema_version:
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up.v1",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id: task353Id,
    project_id: projectId,
    actor: "goal3-task361 task353 seed",
    created_at: "2026-06-14T00:00:00.000Z",
    ok: true,
    follow_up_status: "next_closure_execution_selected_tranche_packaging_results_current_for_proof_breadth_closure_recheck",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_path: task353Path,
    requested_follow_up_mode:
      "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id:
      `GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-${suffix}`,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_path: task352.path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_artifact: task352.artifact,
    selected_tranche_next_closure_packaging_results_closure_execution_bridge_id:
      `GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-RESULTS-CLOSURE-BRIDGE-${suffix}`,
    selected_tranche_next_closure_packaging_results_closure_execution_bridge_path: task350.path,
    selected_tranche_next_closure_packaging_results_closure_execution_bridge_artifact: task350.artifact,
    selected_tranche_next_closure_packaging_follow_through_id:
      task347.body.selected_tranche_next_closure_packaging_follow_through_id,
    selected_tranche_next_closure_packaging_follow_through_path:
      task347.body.selected_tranche_next_closure_packaging_follow_through_path,
    selected_tranche_next_closure_packaging_follow_through_artifact:
      task347.body.selected_tranche_next_closure_packaging_follow_through_artifact,
    delegated_selected_tranche_next_closure_packaging_results_follow_up_id:
      task347.body.selected_tranche_next_closure_packaging_results_follow_up_id,
    delegated_selected_tranche_next_closure_packaging_results_follow_up_path:
      task347.body.selected_tranche_next_closure_packaging_results_follow_up_path,
    delegated_selected_tranche_next_closure_packaging_results_follow_up_artifact: {
      kind: "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_follow_up",
      path: task347.path,
      sha256: task347.sha256,
      size_bytes: task347.size_bytes
    },
    selected_tranche_next_packaging_results_follow_up_id: task347.body.selected_tranche_next_packaging_results_follow_up_id,
    selected_tranche_next_packaging_results_follow_up_path:
      task347.body.selected_tranche_next_packaging_results_follow_up_path,
    selected_tranche_next_packaging_results_follow_up_artifact:
      task347.body.selected_tranche_next_packaging_results_follow_up_artifact,
    selected_tranche_next_packaging_follow_through_id: task347.body.selected_tranche_next_packaging_follow_through_id,
    selected_tranche_next_packaging_follow_through_path: task347.body.selected_tranche_next_packaging_follow_through_path,
    selected_tranche_next_packaging_follow_through_artifact:
      task347.body.selected_tranche_next_packaging_follow_through_artifact,
    task_local_packaging_follow_through_id: task347.body.task_local_packaging_follow_through_id,
    task_local_packaging_follow_through_path: task347.body.task_local_packaging_follow_through_path,
    task_local_packaging_follow_through_artifact: task347.body.task_local_packaging_follow_through_artifact,
    proof_breadth_execution_follow_through_id: `GOAL3-PROOF-BREADTH-FOLLOW-THROUGH-${suffix}`,
    proof_breadth_execution_follow_through_path:
      `.comath/release/goal3-proof-breadth-execution-follow-through/GOAL3-PROOF-BREADTH-FOLLOW-THROUGH-${suffix}/follow-through.json`,
    proof_breadth_execution_follow_through_artifact: {
      kind: "goal3_release_candidate_proof_breadth_execution_follow_through",
      path: `.comath/release/goal3-proof-breadth-execution-follow-through/GOAL3-PROOF-BREADTH-FOLLOW-THROUGH-${suffix}/follow-through.json`,
      sha256: "3".repeat(64),
      size_bytes: 10
    },
    blocker_reasons: [],
    selected_task_count: task347.body.selected_task_count,
    verified_selected_task_count: task347.body.verified_selected_task_count,
    missing_selected_task_count: task347.body.missing_selected_task_count,
    blocked_selected_task_count: task347.body.blocked_selected_task_count,
    selected_task_ids: task347.body.selected_task_ids,
    verified_selected_task_ids: task347.body.verified_selected_task_ids,
    missing_selected_task_ids: task347.body.missing_selected_task_ids,
    blocked_selected_task_ids: task347.body.blocked_selected_task_ids,
    selected_packaging_report_artifacts: task347.body.selected_packaging_report_artifacts,
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

function seedTask359Artifact({
  suffix = "0361",
  task359Id = `GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-RESULTS-${suffix}`,
  ready = true
} = {}) {
  const task353 = seedTask353Artifact({ suffix });
  const task358 = dummyArtifact(
    `GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-${suffix}`,
    "goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-follow-through",
    "follow-through.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through"
  );
  const task356 = dummyArtifact(
    `GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-BRIDGE-${suffix}`,
    "goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-bridge",
    "bridge.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge"
  );
  const task355 = dummyArtifact(
    `GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-${suffix}`,
    "goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-recheck",
    "recheck.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck"
  );
  const task359Path = `.comath/release/goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-follow-up/${task359Id}/follow-up.json`;
  return writeJson(task359Path, {
    schema_version:
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up.v1",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id:
      task359Id,
    project_id: projectId,
    actor: "goal3-task361 task359 seed",
    created_at: "2026-06-14T00:00:00.000Z",
    ok: ready,
    follow_up_status: ready
      ? "next_closure_execution_packaging_selected_tranche_packaging_results_current_for_proof_breadth_closure_recheck"
      : "blocked_next_closure_execution_packaging_selected_tranche_packaging_results_incomplete",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path:
      task359Path,
    requested_follow_up_mode:
      "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
      `GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-${suffix}`,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path:
      task358.path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact:
      task358.artifact,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
      `GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-BRIDGE-${suffix}`,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path:
      task356.path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact:
      task356.artifact,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id:
      `GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-${suffix}`,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path:
      task355.path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact:
      task355.artifact,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id:
      task353.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_path:
      task353.path,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_artifact: {
      kind: "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up",
      path: task353.path,
      sha256: task353.sha256,
      size_bytes: task353.size_bytes
    },
    blocker_reasons: ready ? [] : ["delegated_blocker_reason"],
    selected_task_count: task353.body.selected_task_count,
    verified_selected_task_count: ready ? task353.body.verified_selected_task_count : 0,
    missing_selected_task_count: ready ? task353.body.missing_selected_task_count : 0,
    blocked_selected_task_count: ready ? task353.body.blocked_selected_task_count : task353.body.selected_task_count,
    selected_task_ids: task353.body.selected_task_ids,
    verified_selected_task_ids: ready ? task353.body.verified_selected_task_ids : [],
    missing_selected_task_ids: ready ? task353.body.missing_selected_task_ids : [],
    blocked_selected_task_ids: ready ? task353.body.blocked_selected_task_ids : task353.body.selected_task_ids,
    selected_packaging_report_artifacts: task353.body.selected_packaging_report_artifacts,
    selected_packaging_report_artifacts_current: true,
    ready_for_proof_breadth_closure_recheck: ready,
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
    typeof recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck,
    "function",
    "Task361 must export a Task359-bound closure execution packaging results closure recheck"
  );
  assert.equal(
    getComathdStatus().capabilities.includes(
      "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck"
    ),
    true,
    "Task361 capability ledger must advertise the closure recheck handoff without authority"
  );
  assert.match(
    repoFile("scripts/phase0-smoke.mjs"),
    /goal3-task361-closure-exec-packaging-results-closure-exec-packaging-results-closure-recheck\.test\.mjs/s,
    "phase0 smoke must discover the Task361 focused suite"
  );

  const task361Source = repoFile(
    "services/comathd/src/release/goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-recheck.ts"
  );
  assert.match(
    task361Source,
    /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureRecheck/s,
    "Task361 must delegate Task359-bound currentness to existing Task355/349/343/300 closure recheck semantics"
  );
  for (const forbiddenPattern of [
    /recordGoal3ReleaseCandidateProofBreadthExecutionBridge\(/s,
    /recordGoal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThrough/s,
    /recordGoal3FinalGaAudit/s,
    /recordGoal3GaCertificate/s,
    /LeanRunner/s,
    /spawnSync/s,
    /execFile/s,
    /child_process/s
  ]) {
    assert.doesNotMatch(
      task361Source,
      forbiddenPattern,
      "Task361 must not run Lean, add execution/packaging producers, or touch final-audit/certificate gates"
    );
  }

  const task359 = seedTask359Artifact();
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck(
        projectRoot,
        {
          project_id: projectId,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id:
            "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-0361-STALE",
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id:
            task359.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path:
            task359.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_sha256:
            "0".repeat(64)
        }
      ),
    {
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_RECHECK_STALE_TASK359"
    },
    "Task361 must reject stale Task359 artifacts"
  );

  const weakened = seedTask359Artifact({
    suffix: "0361-WEAKENED",
    task359Id: "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-RESULTS-0361-WEAKENED"
  });
  const weakenedText = `${JSON.stringify({ ...weakened.body, can_certify_ga: true }, null, 2)}\n`;
  writeFileSync(join(projectRoot, weakened.path), weakenedText, "utf8");
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck(
        projectRoot,
        {
          project_id: projectId,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id:
            "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-0361-WEAKENED",
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id:
            weakened.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path:
            weakened.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_sha256:
            sha256Text(weakenedText)
        }
      ),
    {
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_RECHECK_INVALID_TASK359"
    },
    "Task361 must reject current Task359 artifacts with weakened no-authority flags"
  );

  const forgedTask353 = seedTask359Artifact({
    suffix: "0361-FORGED-TASK353",
    task359Id: "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-RESULTS-0361-FORGED-TASK353"
  });
  const forgedTask353Text = `${JSON.stringify(
    {
      ...forgedTask353.body,
      delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_artifact: {
        ...forgedTask353.body.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_artifact,
        path: ".comath/release/forged/task353.json"
      }
    },
    null,
    2
  )}\n`;
  writeFileSync(join(projectRoot, forgedTask353.path), forgedTask353Text, "utf8");
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck(
        projectRoot,
        {
          project_id: projectId,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id:
            "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-0361-FORGED-TASK353",
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id:
            forgedTask353.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path:
            forgedTask353.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_sha256:
            sha256Text(forgedTask353Text)
        }
      ),
    {
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_RECHECK_INVALID_TASK359"
    },
    "Task361 must reject Task359 artifacts whose delegated Task353 reference drifts"
  );

  const notReady = seedTask359Artifact({
    suffix: "0361-BLOCKED",
    task359Id: "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-RESULTS-0361-BLOCKED",
    ready: false
  });
  const closureBeforeBlocked = collectRelativeFiles(".comath/release/goal3-proof-breadth-closure");
  const blockedRecheck =
    recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck(
      projectRoot,
      {
        project_id: projectId,
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id:
          "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-0361-BLOCKED",
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id:
          notReady.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id,
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path:
          notReady.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path,
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_sha256:
          notReady.sha256
      }
    );
  assert.equal(blockedRecheck.ok, false);
  assert.equal(
    blockedRecheck.recheck_status,
    "blocked_next_closure_execution_packaging_results_not_ready_for_closure_recheck"
  );
  assert.equal(blockedRecheck.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id, null);
  assert.deepEqual(
    collectRelativeFiles(".comath/release/goal3-proof-breadth-closure"),
    closureBeforeBlocked,
    "Task361 must not run delegated Task355/Task300 closure recheck when Task359 is not ready"
  );

  const closureFilesBefore = collectRelativeFiles(".comath/release/goal3-proof-breadth-closure");
  const finalAuditFilesBefore = collectRelativeFiles(".comath/release/goal3-final-ga-audit");
  const gaCertificateFilesBefore = collectRelativeFiles(".comath/release/goal3-ga-certificate");
  const recheck =
    recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck(
      projectRoot,
      {
        project_id: projectId,
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id:
          "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-0361",
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id:
          task359.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id,
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path:
          task359.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path,
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_sha256:
          task359.sha256,
        actor: "goal3-task361 token=plain-token proof_success GA certified can_certify_ga=true",
        proof_authority: "lean_kernel_clean_replay",
        can_certify_ga: true,
        final_ga_audit_json: { ok: true },
        proof_breadth_closure_json: { proof_breadth_complete: true }
      }
    );

  assert.equal(
    recheck.schema_version,
    "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck.v1"
  );
  assert.equal(recheck.ok, false);
  assert.equal(
    recheck.recheck_status,
    "blocked_global_proof_breadth_incomplete_after_next_closure_execution_packaging_results_closure_recheck"
  );
  assert.equal(
    recheck.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact.sha256,
    task359.sha256
  );
  assert.equal(
    recheck.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact.kind,
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck"
  );
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
  assert.equal(recheck.blocker_reasons.includes("caller_proof_or_ga_authority_material_ignored"), true);
  assert.equal(JSON.stringify(recheck).includes(projectRoot), false);
  assert.doesNotMatch(JSON.stringify(recheck), secretTerms);
  assert.doesNotMatch(JSON.stringify(recheck), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(recheck), gaOverclaimTerms);
  assert.equal(
    collectRelativeFiles(".comath/release/goal3-proof-breadth-closure").length,
    closureFilesBefore.length + 1,
    "Task361 may write only the delegated Task300 closure recheck through Task355/349/343 semantics"
  );
  assert.deepEqual(
    collectRelativeFiles(".comath/release/goal3-final-ga-audit"),
    finalAuditFilesBefore,
    "Task361 must not write Task301 final-GA-audit artifacts"
  );
  assert.deepEqual(
    collectRelativeFiles(".comath/release/goal3-ga-certificate"),
    gaCertificateFilesBefore,
    "Task361 must not write Task303 GA-certificate artifacts"
  );

  const persisted = readJson(
    recheck.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_path
  );
  assert.equal(
    persisted.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_artifact,
    undefined,
    "persisted Task361 artifact must not self-hash recursively"
  );
  assert.equal(
    persisted.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck,
    undefined,
    "Task361 persisted wrapper must bind Task355 by artifact reference instead of embedding closure reports"
  );

  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/goal3/selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-recheck",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id:
        "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-0361-ROUTE",
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id:
        task359.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path:
        task359.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_sha256:
        task359.sha256,
      actor: "goal3-task361 route token=plain-token proof_success GA certified can_certify_ga=true",
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true
    }
  });
  assert.equal(routeResponse.status, 200);
  assert.equal(
    routeResponse.body
      .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck
      .proof_authority,
    "none"
  );
  assert.equal(
    routeResponse.body
      .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck
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
          "release.goal3_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_recorded" &&
        entry.payload.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id ===
          "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-0361-ROUTE" &&
        entry.payload.can_certify_ga === false &&
        entry.payload.proof_authority === "none"
    ),
    true,
    "Task361 must emit non-certifying provenance"
  );

  for (const forbiddenPattern of [
    /selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-recheck/s,
    /selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck/s
  ]) {
    assert.doesNotMatch(repoFile("extensions/comath-pi/src/index.ts"), forbiddenPattern, "Task361 must not add a Pi tool surface");
    assert.doesNotMatch(
      repoFile("extensions/comath-pi/src/runtime-registration.ts"),
      forbiddenPattern,
      "Task361 must not add a Pi runtime command"
    );
  }

  for (const [path, pattern] of [
    ["README.md", /Task361.*selected-tranche.*closure execution packaging results closure execution packaging results closure recheck/s],
    ["TODO.md", /Task361.*selected-tranche.*closure execution packaging results closure execution packaging results closure recheck/s],
    ["goal-3/tasks.md", /Task361.*selected-tranche.*closure execution packaging results closure execution packaging results closure recheck/s],
    ["REVIEW.md", /Goal 3 Task 361/s],
    ["AGENTS.md", /Task361.*selected-tranche.*closure execution packaging results closure execution packaging results closure recheck/s],
    ["docs/architecture/ga-release-criteria.md", /Task361.*selected-tranche.*closure execution packaging results closure execution packaging results closure recheck/s],
    ["docs/architecture/threat-model.md", /Task361.*selected-tranche.*closure execution packaging results closure execution packaging results closure recheck/s],
    ["docs/architecture/acceptance-matrix.md", /Task361.*selected-tranche.*closure execution packaging results closure execution packaging results closure recheck/s],
    ["docs/progress/goal-3-ga-gap-matrix.md", /Task361.*selected-tranche.*closure execution packaging results closure execution packaging results closure recheck/s]
  ]) {
    assert.match(
      repoFile(path),
      pattern,
      `${path} must document Task361 selected-tranche closure execution packaging results closure execution packaging results closure recheck`
    );
  }
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task361 selected-tranche closure execution packaging results closure execution packaging results closure recheck tests passed.");
