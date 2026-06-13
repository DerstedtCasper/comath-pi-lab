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
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingFollowThrough,
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsFollowUp,
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureRecheck
} = comath;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task353-closure-exec-packaging-results-"));
const repoRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const { project } = initProject({
  name: "Goal 3 Task353 selected tranche next closure execution packaging results follow-up",
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
  task347Id = "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-RESULTS-0353",
  task341Id = "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-RESULTS-0353",
  selectedTaskIds = ["PM-009", "PM-010"]
} = {}) {
  for (const taskId of selectedTaskIds) {
    writeJson(packagingPath(taskId), verifiedPackagingReport(taskId));
  }
  const selectedArtifacts = selectedTaskIds.map((taskId) =>
    artifactForRelativePath(packagingPath(taskId), "final_authority_packaging_report_v3")
  );
  const task335 = dummyArtifact(
    "GOAL3-SELECTED-TRANCHE-PACKAGING-RESULTS-0353",
    "goal3-selected-tranche-packaging-results-follow-up",
    "follow-up.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_packaging_results_follow_up"
  );
  const task341Path = `.comath/release/goal3-selected-tranche-next-packaging-results-follow-up/${task341Id}/follow-up.json`;
  const task341 = writeJson(task341Path, {
    schema_version: "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_packaging_results_follow_up.v1",
    selected_tranche_next_packaging_results_follow_up_id: task341Id,
    project_id: projectId,
    actor: "goal3-task353 task341 seed",
    created_at: "2026-06-13T00:00:00.000Z",
    ok: true,
    follow_up_status: "next_selected_tranche_packaging_results_current_for_proof_breadth_closure_recheck",
    selected_tranche_next_packaging_results_follow_up_path: task341Path,
    selected_tranche_packaging_results_follow_up_id: "GOAL3-SELECTED-TRANCHE-PACKAGING-RESULTS-0353",
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
    "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-0353",
    "goal3-selected-tranche-next-closure-packaging-follow-through",
    "follow-through.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_follow_through"
  );
  const task344 = dummyArtifact(
    "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-BRIDGE-0353",
    "goal3-selected-tranche-next-closure-execution-bridge",
    "bridge.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_execution_bridge"
  );
  const task338 = dummyArtifact(
    "GOAL3-SELECTED-TRANCHE-NEXT-BRIDGE-0353",
    "goal3-selected-tranche-next-execution-bridge",
    "bridge.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_next_execution_bridge"
  );
  const task340 = dummyArtifact(
    "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-0353",
    "goal3-selected-tranche-next-packaging-follow-through",
    "follow-through.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_next_packaging_follow_through"
  );
  const task334 = dummyArtifact(
    "GOAL3-TASK-LOCAL-PACKAGING-0353",
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
    actor: "goal3-task353 task347 seed",
    created_at: "2026-06-13T00:00:00.000Z",
    ok: true,
    follow_up_status: "next_closure_selected_tranche_packaging_results_current_for_proof_breadth_closure_recheck",
    selected_tranche_next_closure_packaging_results_follow_up_path: task347Path,
    requested_follow_up_mode:
      "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_follow_up",
    selected_tranche_next_closure_packaging_follow_through_id: "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-0353",
    selected_tranche_next_closure_packaging_follow_through_path: task346.path,
    selected_tranche_next_closure_packaging_follow_through_artifact: task346.artifact,
    selected_tranche_next_closure_execution_bridge_id: "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-BRIDGE-0353",
    selected_tranche_next_closure_execution_bridge_path: task344.path,
    selected_tranche_next_closure_execution_bridge_artifact: task344.artifact,
    delegated_selected_tranche_next_execution_bridge_id: "GOAL3-SELECTED-TRANCHE-NEXT-BRIDGE-0353",
    delegated_selected_tranche_next_execution_bridge_path: task338.path,
    delegated_selected_tranche_next_execution_bridge_artifact: task338.artifact,
    selected_tranche_next_packaging_follow_through_id: "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-0353",
    selected_tranche_next_packaging_follow_through_path: task340.path,
    selected_tranche_next_packaging_follow_through_artifact: task340.artifact,
    task_local_packaging_follow_through_id: "GOAL3-TASK-LOCAL-PACKAGING-0353",
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

function seedTask352Artifact() {
  const task347 = seedTask347Artifact();
  const task349 = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureRecheck(
    projectRoot,
    {
      project_id: projectId,
      selected_tranche_next_closure_packaging_results_closure_recheck_id:
        "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-RESULTS-CLOSURE-0353",
      selected_tranche_next_closure_packaging_results_follow_up_id:
        task347.body.selected_tranche_next_closure_packaging_results_follow_up_id,
      selected_tranche_next_closure_packaging_results_follow_up_path:
        task347.body.selected_tranche_next_closure_packaging_results_follow_up_path,
      selected_tranche_next_closure_packaging_results_follow_up_sha256: task347.sha256,
      actor: "goal3-task353 task349 seed"
    }
  );
  const task350 = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionBridge(
    projectRoot,
    {
      project_id: projectId,
      selected_tranche_next_closure_packaging_results_closure_execution_bridge_id:
        "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-RESULTS-CLOSURE-BRIDGE-0353",
      selected_tranche_next_closure_execution_bridge_id:
        "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-BRIDGE-0353-DELEGATED",
      selected_tranche_next_execution_bridge_id: "GOAL3-SELECTED-TRANCHE-NEXT-BRIDGE-0353-DELEGATED",
      proof_breadth_execution_bridge_id: "GOAL3-PROOF-BREADTH-BRIDGE-0353-DELEGATED",
      selected_tranche_next_closure_packaging_results_closure_recheck_id:
        task349.selected_tranche_next_closure_packaging_results_closure_recheck_id,
      selected_tranche_next_closure_packaging_results_closure_recheck_path:
        task349.selected_tranche_next_closure_packaging_results_closure_recheck_path,
      selected_tranche_next_closure_packaging_results_closure_recheck_sha256:
        task349.selected_tranche_next_closure_packaging_results_closure_recheck_artifact.sha256,
      actor: "goal3-task353 task350 seed token=plain-token proof_success GA certified can_certify_ga=true",
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true,
      max_tranche_size: 2
    }
  );
  const task352 = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingFollowThrough(
    projectRoot,
    {
      project_id: projectId,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id:
        "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-0353",
      selected_tranche_next_closure_packaging_results_closure_execution_bridge_id:
        task350.selected_tranche_next_closure_packaging_results_closure_execution_bridge_id,
      selected_tranche_next_closure_packaging_results_closure_execution_bridge_path:
        task350.selected_tranche_next_closure_packaging_results_closure_execution_bridge_path,
      selected_tranche_next_closure_packaging_results_closure_execution_bridge_sha256:
        task350.selected_tranche_next_closure_packaging_results_closure_execution_bridge_artifact.sha256,
      selected_tranche_next_closure_packaging_follow_through_id:
        "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-0353-TASK352",
      selected_tranche_next_packaging_follow_through_id:
        "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-0353-TASK352",
      task_local_packaging_follow_through_id: "GOAL3-TASK-LOCAL-PACKAGING-0353-TASK352",
      claim_id_prefix: "C-T353",
      actor: "goal3-task353 task352 seed token=plain-token proof_success GA certified can_certify_ga=true",
      evidence_by_task_id: Object.fromEntries(task350.next_execution_task_ids.map((taskId) => [taskId, forgedSuccessEvidence])),
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true
    }
  );
  return { task350, task352 };
}

try {
  assert.equal(
    typeof recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsFollowUp,
    "function",
    "Task353 must export a Task352-bound selected-tranche next closure execution packaging results follow-up"
  );
  assert.equal(
    getComathdStatus().capabilities.includes(
      "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up"
    ),
    true,
    "Task353 capability ledger must advertise closure execution packaging results follow-up without authority"
  );
  assert.match(
    repoFile("scripts/phase0-smoke.mjs"),
    /goal3-task353-closure-exec-packaging-results-follow-up\.test\.mjs/s,
    "phase0 smoke must discover the Task353 focused suite"
  );

  const task353Source = repoFile(
    "services/comathd/src/release/goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-follow-up.ts"
  );
  assert.match(
    task353Source,
    /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsFollowUp/s,
    "Task353 must delegate Task352-bound packaging result currentness to existing Task347 semantics"
  );
  for (const forbiddenPattern of [
    /recordGoal3ReleaseCandidateProofBreadthClosure\(/s,
    /recordGoal3FinalGaAudit/s,
    /recordGoal3GaCertificate/s,
    /LeanRunner/s,
    /spawnSync/s,
    /execFile/s,
    /child_process/s
  ]) {
    assert.doesNotMatch(
      task353Source,
      forbiddenPattern,
      "Task353 must remain a Task352-to-Task347 currentness handoff with no Lean, closure, final-audit, or certificate writes"
    );
  }

  const { task350, task352 } = seedTask352Artifact();
  assert.deepEqual(task352.selected_task_ids, task350.next_execution_task_ids);

  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsFollowUp(
        projectRoot,
        {
          project_id: projectId,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id:
            "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-0353-STALE",
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id:
            task352.selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_path:
            task352.selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_path,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_sha256:
            "0".repeat(64)
        }
      ),
    {
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_FOLLOW_UP_STALE_TASK352"
    },
    "Task353 must reject stale Task352 artifacts before delegating to Task347"
  );

  const task352Path =
    task352.selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_path;
  const originalTask352Text = readFileSync(join(projectRoot, task352Path), "utf8");
  const weakenedText = `${JSON.stringify({ ...JSON.parse(originalTask352Text), can_certify_ga: true }, null, 2)}\n`;
  writeFileSync(join(projectRoot, task352Path), weakenedText, "utf8");
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsFollowUp(
        projectRoot,
        {
          project_id: projectId,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id:
            "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-0353-WEAKENED",
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id:
            task352.selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_path: task352Path,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_sha256:
            sha256Text(weakenedText)
        }
      ),
    {
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_FOLLOW_UP_INVALID_TASK352"
    },
    "Task353 must reject current Task352 artifacts with weakened no-authority flags"
  );
  writeFileSync(join(projectRoot, task352Path), originalTask352Text, "utf8");

  const forgedTask346RefText = `${JSON.stringify(
    {
      ...JSON.parse(originalTask352Text),
      selected_tranche_next_closure_packaging_follow_through_artifact: {
        ...task352.selected_tranche_next_closure_packaging_follow_through_artifact,
        path: ".comath/release/forged/task346.json"
      }
    },
    null,
    2
  )}\n`;
  writeFileSync(join(projectRoot, task352Path), forgedTask346RefText, "utf8");
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsFollowUp(
        projectRoot,
        {
          project_id: projectId,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id:
            "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-0353-FORGED-TASK346",
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id:
            task352.selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_path: task352Path,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_sha256:
            sha256Text(forgedTask346RefText)
        }
      ),
    {
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_FOLLOW_UP_INVALID_TASK352"
    },
    "Task353 must reject Task352 artifacts whose embedded delegated Task346 refs drift from the current artifact"
  );
  writeFileSync(join(projectRoot, task352Path), originalTask352Text, "utf8");

  const closureFilesBeforeTask353 = collectRelativeFiles(".comath/release/goal3-proof-breadth-closure");
  const finalAuditFilesBeforeTask353 = collectRelativeFiles(".comath/release/goal3-final-ga-audit");
  const gaCertificateFilesBeforeTask353 = collectRelativeFiles(".comath/release/goal3-ga-certificate");
  const followUp =
    recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsFollowUp(
      projectRoot,
      {
        project_id: projectId,
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id:
          "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-0353",
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id:
          task352.selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id,
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_path:
          task352.selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_path,
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_sha256:
          task352.selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_artifact
            .sha256,
        actor: "goal3-task353 token=plain-token proof_success GA certified can_certify_ga=true",
        proof_authority: "lean_kernel_clean_replay",
        can_certify_ga: true,
        final_ga_audit_json: { ok: true },
        proof_breadth_closure_json: { proof_breadth_complete: true }
      }
    );

  assert.equal(
    followUp.schema_version,
    "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up.v1"
  );
  assert.equal(followUp.ok, false);
  assert.equal(
    followUp.follow_up_status,
    "blocked_next_closure_execution_selected_tranche_packaging_results_incomplete"
  );
  assert.equal(
    followUp.selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_artifact.sha256,
    task352.selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_artifact.sha256
  );
  assert.equal(
    followUp.delegated_selected_tranche_next_closure_packaging_results_follow_up_artifact.kind,
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_follow_up"
  );
  assert.equal(
    followUp.selected_tranche_next_closure_packaging_follow_through_id,
    task352.selected_tranche_next_closure_packaging_follow_through_id
  );
  assert.deepEqual(followUp.selected_task_ids, task352.selected_task_ids);
  assert.deepEqual(followUp.verified_selected_task_ids, []);
  assert.deepEqual(followUp.blocked_selected_task_ids, task352.selected_task_ids);
  assert.equal(followUp.selected_packaging_report_artifacts_current, true);
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
  assert.equal(followUp.blocker_reasons.includes("caller_proof_or_ga_authority_material_ignored"), true);
  assert.equal(JSON.stringify(followUp).includes(projectRoot), false);
  assert.doesNotMatch(JSON.stringify(followUp), secretTerms);
  assert.doesNotMatch(JSON.stringify(followUp), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(followUp), gaOverclaimTerms);
  assert.deepEqual(
    collectRelativeFiles(".comath/release/goal3-proof-breadth-closure"),
    closureFilesBeforeTask353,
    "Task353 must not run or write new Task300 proof-breadth closure artifacts"
  );
  assert.deepEqual(
    collectRelativeFiles(".comath/release/goal3-final-ga-audit"),
    finalAuditFilesBeforeTask353,
    "Task353 must not run or write Task301 final-GA-audit artifacts"
  );
  assert.deepEqual(
    collectRelativeFiles(".comath/release/goal3-ga-certificate"),
    gaCertificateFilesBeforeTask353,
    "Task353 must not run or write Task303 GA-certificate artifacts"
  );

  const persisted = readJson(
    followUp.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_path
  );
  assert.equal(
    persisted.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_artifact,
    undefined,
    "persisted Task353 follow-up must not self-hash recursively"
  );
  assert.equal(
    persisted.delegated_selected_tranche_next_closure_packaging_results_follow_up,
    undefined,
    "Task353 persisted artifact must bind delegated Task347 by artifact reference instead of embedding currentness reports"
  );

  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/goal3/selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-follow-up",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id:
        "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-0353-ROUTE",
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id:
        task352.selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_path:
        task352.selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_path,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_sha256:
        task352.selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_artifact.sha256,
      actor: "goal3-task353 route token=plain-token proof_success GA certified can_certify_ga=true",
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true
    }
  });
  assert.equal(routeResponse.status, 200);
  assert.equal(
    routeResponse.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up
      .proof_authority,
    "none"
  );
  assert.equal(
    routeResponse.body.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up
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
          "release.goal3_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_recorded" &&
        entry.payload.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id ===
          "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-0353-ROUTE" &&
        entry.payload.can_certify_ga === false &&
        entry.payload.proof_authority === "none"
    ),
    true,
    "Task353 must emit non-certifying provenance"
  );

  for (const forbiddenPattern of [
    /selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-follow-up/s,
    /selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up/s
  ]) {
    assert.doesNotMatch(repoFile("extensions/comath-pi/src/index.ts"), forbiddenPattern, "Task353 must not add a Pi tool surface");
    assert.doesNotMatch(
      repoFile("extensions/comath-pi/src/runtime-registration.ts"),
      forbiddenPattern,
      "Task353 must not add a Pi runtime command"
    );
  }

  for (const [path, pattern] of [
    ["README.md", /Task353.*selected-tranche.*next closure.*execution packaging results follow-up/s],
    ["TODO.md", /Task353.*selected-tranche.*next closure.*execution packaging results follow-up/s],
    ["goal-3/tasks.md", /Task353.*selected-tranche.*next closure.*execution packaging results follow-up/s],
    ["REVIEW.md", /Goal 3 Task 353/s],
    ["AGENTS.md", /Task353.*selected-tranche.*next closure.*execution packaging results follow-up/s],
    ["docs/architecture/ga-release-criteria.md", /Task353.*selected-tranche.*next closure.*execution packaging results follow-up/s],
    ["docs/architecture/threat-model.md", /Task353.*selected-tranche.*next closure.*execution packaging results follow-up/s],
    ["docs/architecture/acceptance-matrix.md", /Task353.*selected-tranche.*next closure.*execution packaging results follow-up/s],
    ["docs/progress/goal-3-ga-gap-matrix.md", /Task353.*selected-tranche.*next closure.*execution packaging results follow-up/s]
  ]) {
    assert.match(
      repoFile(path),
      pattern,
      `${path} must document Task353 selected-tranche next closure execution packaging results follow-up`
    );
  }
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task353 selected-tranche next closure execution packaging results follow-up tests passed.");
