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
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureRecheck
} = comath;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task349-next-closure-results-recheck-"));
const repoRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const { project } = initProject({
  name: "Goal 3 Task349 selected tranche next closure packaging results closure recheck",
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
  task347Id = "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-RESULTS-0349",
  task341Id = "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-RESULTS-0349",
  selectedTaskIds = ["PM-009", "PM-010"],
  overrideTask347 = {}
} = {}) {
  for (const taskId of selectedTaskIds) {
    writeJson(packagingPath(taskId), verifiedPackagingReport(taskId));
  }
  const selectedArtifacts = selectedTaskIds.map((taskId) =>
    artifactForRelativePath(packagingPath(taskId), "final_authority_packaging_report_v3")
  );

  const task335 = dummyArtifact(
    "GOAL3-SELECTED-TRANCHE-PACKAGING-RESULTS-0349",
    "goal3-selected-tranche-packaging-results-follow-up",
    "follow-up.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_packaging_results_follow_up"
  );
  const task341Path = `.comath/release/goal3-selected-tranche-next-packaging-results-follow-up/${task341Id}/follow-up.json`;
  const task341 = writeJson(task341Path, {
    schema_version: "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_packaging_results_follow_up.v1",
    selected_tranche_next_packaging_results_follow_up_id: task341Id,
    project_id: projectId,
    actor: "goal3-task349 task341 seed",
    created_at: "2026-06-13T00:00:00.000Z",
    ok: true,
    follow_up_status: "next_selected_tranche_packaging_results_current_for_proof_breadth_closure_recheck",
    selected_tranche_next_packaging_results_follow_up_path: task341Path,
    selected_tranche_packaging_results_follow_up_id: "GOAL3-SELECTED-TRANCHE-PACKAGING-RESULTS-0349",
    selected_tranche_packaging_results_follow_up_path: task335.path,
    selected_tranche_packaging_results_follow_up_artifact: task335.artifact,
    proof_breadth_execution_follow_through_id: "GOAL3-PROOF-BREADTH-FOLLOW-THROUGH-0349",
    proof_breadth_execution_follow_through_path:
      ".comath/release/goal3-proof-breadth-execution-follow-through/GOAL3-PROOF-BREADTH-FOLLOW-THROUGH-0349/follow-through.json",
    proof_breadth_execution_follow_through_artifact: {
      kind: "goal3_release_candidate_proof_breadth_execution_follow_through",
      path: ".comath/release/goal3-proof-breadth-execution-follow-through/GOAL3-PROOF-BREADTH-FOLLOW-THROUGH-0349/follow-through.json",
      sha256: "1".repeat(64),
      size_bytes: 10
    },
    blocker_reasons: ["selected_positive_matrix_tranche_packaging_results_incomplete"],
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
    "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-0349",
    "goal3-selected-tranche-next-closure-packaging-follow-through",
    "follow-through.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_follow_through"
  );
  const task344 = dummyArtifact(
    "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-BRIDGE-0349",
    "goal3-selected-tranche-next-closure-execution-bridge",
    "bridge.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_execution_bridge"
  );
  const task338 = dummyArtifact(
    "GOAL3-SELECTED-TRANCHE-NEXT-BRIDGE-0349",
    "goal3-selected-tranche-next-execution-bridge",
    "bridge.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_next_execution_bridge"
  );
  const task340 = dummyArtifact(
    "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-0349",
    "goal3-selected-tranche-next-packaging-follow-through",
    "follow-through.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_next_packaging_follow_through"
  );
  const task334 = dummyArtifact(
    "GOAL3-TASK-LOCAL-PACKAGING-0349",
    "goal3-task-local-packaging-follow-through",
    "follow-through.json",
    "goal3_release_candidate_proof_breadth_task_local_packaging_follow_through"
  );

  const task347Path = `.comath/release/goal3-selected-tranche-next-closure-packaging-results-follow-up/${task347Id}/follow-up.json`;
  const task347Body = {
    schema_version:
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_follow_up.v1",
    selected_tranche_next_closure_packaging_results_follow_up_id: task347Id,
    project_id: projectId,
    actor: "goal3-task349 task347 seed",
    created_at: "2026-06-13T00:00:00.000Z",
    ok: true,
    follow_up_status: "next_closure_selected_tranche_packaging_results_current_for_proof_breadth_closure_recheck",
    selected_tranche_next_closure_packaging_results_follow_up_path: task347Path,
    requested_follow_up_mode:
      "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_follow_up",
    selected_tranche_next_closure_packaging_follow_through_id: "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-0349",
    selected_tranche_next_closure_packaging_follow_through_path: task346.path,
    selected_tranche_next_closure_packaging_follow_through_artifact: task346.artifact,
    selected_tranche_next_closure_execution_bridge_id: "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-BRIDGE-0349",
    selected_tranche_next_closure_execution_bridge_path: task344.path,
    selected_tranche_next_closure_execution_bridge_artifact: task344.artifact,
    delegated_selected_tranche_next_execution_bridge_id: "GOAL3-SELECTED-TRANCHE-NEXT-BRIDGE-0349",
    delegated_selected_tranche_next_execution_bridge_path: task338.path,
    delegated_selected_tranche_next_execution_bridge_artifact: task338.artifact,
    selected_tranche_next_packaging_follow_through_id: "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-0349",
    selected_tranche_next_packaging_follow_through_path: task340.path,
    selected_tranche_next_packaging_follow_through_artifact: task340.artifact,
    task_local_packaging_follow_through_id: "GOAL3-TASK-LOCAL-PACKAGING-0349",
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
    proof_breadth_execution_follow_through_id: "GOAL3-PROOF-BREADTH-FOLLOW-THROUGH-0349",
    proof_breadth_execution_follow_through_path:
      ".comath/release/goal3-proof-breadth-execution-follow-through/GOAL3-PROOF-BREADTH-FOLLOW-THROUGH-0349/follow-through.json",
    proof_breadth_execution_follow_through_artifact: {
      kind: "goal3_release_candidate_proof_breadth_execution_follow_through",
      path: ".comath/release/goal3-proof-breadth-execution-follow-through/GOAL3-PROOF-BREADTH-FOLLOW-THROUGH-0349/follow-through.json",
      sha256: "2".repeat(64),
      size_bytes: 10
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
    ga_certification_gate_separate: true,
    ...overrideTask347
  };
  const task347 = writeJson(task347Path, task347Body);
  return {
    task347,
    task341,
    selectedTaskIds
  };
}

try {
  assert.equal(
    typeof recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureRecheck,
    "function",
    "Task349 must export a Task347-bound selected-tranche next closure packaging results closure recheck"
  );
  assert.equal(
    getComathdStatus().capabilities.includes(
      "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_recheck"
    ),
    true,
    "Task349 capability ledger must advertise the closure recheck handoff without authority"
  );
  assert.match(
    repoFile("scripts/phase0-smoke.mjs"),
    /goal3-task349-selected-tranche-next-closure-packaging-results-closure-recheck\.test\.mjs/s,
    "phase0 smoke must discover the Task349 focused suite"
  );

  const task349Source = repoFile(
    "services/comathd/src/release/goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-recheck.ts"
  );
  assert.match(
    task349Source,
    /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureRecheck/s,
    "Task349 must delegate to existing Task343/Task300 closure recheck semantics instead of inventing a verifier"
  );
  for (const forbiddenPattern of [
    /recordGoal3ReleaseCandidateProofBreadthExecutionBridge\(/s,
    /recordGoal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThrough/s,
    /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThrough/s,
    /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUp/s,
    /recordGoal3FinalGaAudit/s,
    /recordGoal3GaCertificate/s,
    /LeanRunner/s,
    /spawnSync/s,
    /execFile/s,
    /child_process/s
  ]) {
    assert.doesNotMatch(
      task349Source,
      forbiddenPattern,
      "Task349 must not run Lean, add execution/packaging/currentness producers, or touch final-audit/certificate gates"
    );
  }

  const { task347, task341 } = seedTask347Artifact();
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureRecheck(projectRoot, {
        project_id: projectId,
        selected_tranche_next_closure_packaging_results_closure_recheck_id:
          "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-RESULTS-CLOSURE-0349-STALE",
        selected_tranche_next_closure_packaging_results_follow_up_id:
          task347.body.selected_tranche_next_closure_packaging_results_follow_up_id,
        selected_tranche_next_closure_packaging_results_follow_up_path:
          task347.body.selected_tranche_next_closure_packaging_results_follow_up_path,
        selected_tranche_next_closure_packaging_results_follow_up_sha256: "0".repeat(64)
      }),
    { code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_RECHECK_STALE_TASK347" },
    "Task349 must reject stale Task347 artifacts"
  );

  const weakened = seedTask347Artifact({
    task347Id: "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-RESULTS-0349-WEAKENED",
    task341Id: "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-RESULTS-0349-WEAKENED",
    overrideTask347: { can_certify_ga: true }
  });
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureRecheck(projectRoot, {
        project_id: projectId,
        selected_tranche_next_closure_packaging_results_closure_recheck_id:
          "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-RESULTS-CLOSURE-0349-WEAKENED",
        selected_tranche_next_closure_packaging_results_follow_up_id:
          weakened.task347.body.selected_tranche_next_closure_packaging_results_follow_up_id,
        selected_tranche_next_closure_packaging_results_follow_up_path:
          weakened.task347.body.selected_tranche_next_closure_packaging_results_follow_up_path,
        selected_tranche_next_closure_packaging_results_follow_up_sha256: weakened.task347.sha256
      }),
    { code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_RECHECK_INVALID_TASK347" },
    "Task349 must reject current Task347 artifacts with weakened no-authority flags"
  );

  const forgedTask341 = seedTask347Artifact({
    task347Id: "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-RESULTS-0349-FORGED-TASK341",
    task341Id: "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-RESULTS-0349-FORGED-TASK341"
  });
  const forgedTask341Path = `.comath/release/goal3-selected-tranche-next-closure-packaging-results-follow-up/${forgedTask341.task347.body.selected_tranche_next_closure_packaging_results_follow_up_id}/follow-up.json`;
  const forgedTask341Body = {
    ...forgedTask341.task347.body,
    selected_tranche_next_closure_packaging_results_follow_up_path: forgedTask341Path,
    selected_tranche_next_packaging_results_follow_up_artifact: {
      ...forgedTask341.task347.body.selected_tranche_next_packaging_results_follow_up_artifact,
      path: `${projectRoot}\\forged-task341.json`
    }
  };
  const forgedTask341Artifact = writeJson(forgedTask341Path, forgedTask341Body);
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureRecheck(projectRoot, {
        project_id: projectId,
        selected_tranche_next_closure_packaging_results_closure_recheck_id:
          "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-RESULTS-CLOSURE-0349-FORGED-TASK341",
        selected_tranche_next_closure_packaging_results_follow_up_id:
          forgedTask341.task347.body.selected_tranche_next_closure_packaging_results_follow_up_id,
        selected_tranche_next_closure_packaging_results_follow_up_path: forgedTask341Path,
        selected_tranche_next_closure_packaging_results_follow_up_sha256: forgedTask341Artifact.sha256
      }),
    { code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_RECHECK_INVALID_TASK347" },
    "Task349 must recompute Task347 embedded Task341 artifact refs before Task343 delegation"
  );

  const forgedIntermediate = seedTask347Artifact({
    task347Id: "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-RESULTS-0349-FORGED-INTERMEDIATE",
    task341Id: "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-RESULTS-0349-FORGED-INTERMEDIATE"
  });
  const forgedIntermediatePath = `.comath/release/goal3-selected-tranche-next-closure-packaging-results-follow-up/${forgedIntermediate.task347.body.selected_tranche_next_closure_packaging_results_follow_up_id}/follow-up.json`;
  const forgedIntermediateBody = {
    ...forgedIntermediate.task347.body,
    selected_tranche_next_closure_packaging_results_follow_up_path: forgedIntermediatePath,
    selected_tranche_next_closure_execution_bridge_id: "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-BRIDGE-0349-REDIRECTED"
  };
  const forgedIntermediateArtifact = writeJson(forgedIntermediatePath, forgedIntermediateBody);
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureRecheck(projectRoot, {
        project_id: projectId,
        selected_tranche_next_closure_packaging_results_closure_recheck_id:
          "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-RESULTS-CLOSURE-0349-FORGED-INTERMEDIATE",
        selected_tranche_next_closure_packaging_results_follow_up_id:
          forgedIntermediate.task347.body.selected_tranche_next_closure_packaging_results_follow_up_id,
        selected_tranche_next_closure_packaging_results_follow_up_path: forgedIntermediatePath,
        selected_tranche_next_closure_packaging_results_follow_up_sha256: forgedIntermediateArtifact.sha256
      }),
    { code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_RECHECK_INVALID_TASK347" },
    "Task349 must reject Task347 artifacts whose embedded ids drift from their artifact paths"
  );

  const staleTask335 = seedTask347Artifact({
    task347Id: "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-RESULTS-0349-STALE-TASK335",
    task341Id: "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-RESULTS-0349-STALE-TASK335"
  });
  const task335Path =
    staleTask335.task341.body.selected_tranche_packaging_results_follow_up_artifact.path;
  const task335OriginalText = readFileSync(join(projectRoot, task335Path), "utf8");
  writeJson(task335Path, {
    ...JSON.parse(task335OriginalText),
    blocker_detail: "GOAL3_TASK349_TAMPERED_TASK335_AFTER_TASK347"
  });
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureRecheck(projectRoot, {
        project_id: projectId,
        selected_tranche_next_closure_packaging_results_closure_recheck_id:
          "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-RESULTS-CLOSURE-0349-STALE-TASK335",
        selected_tranche_next_closure_packaging_results_follow_up_id:
          staleTask335.task347.body.selected_tranche_next_closure_packaging_results_follow_up_id,
        selected_tranche_next_closure_packaging_results_follow_up_path:
          staleTask335.task347.body.selected_tranche_next_closure_packaging_results_follow_up_path,
        selected_tranche_next_closure_packaging_results_follow_up_sha256: staleTask335.task347.sha256
      }),
    { code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_RECHECK_INVALID_TASK347" },
    "Task349 must rehash Task341-embedded Task335 follow-up material before claiming Task335 currentness"
  );
  writeFileSync(join(projectRoot, task335Path), task335OriginalText, "utf8");

  const finalAuditFilesBefore = collectRelativeFiles(".comath/release/goal3-final-ga-audit");
  const gaCertificateFilesBefore = collectRelativeFiles(".comath/release/goal3-ga-certificate");
  const closureRecheck = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureRecheck(
    projectRoot,
    {
      project_id: projectId,
      selected_tranche_next_closure_packaging_results_closure_recheck_id:
        "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-RESULTS-CLOSURE-0349",
      selected_tranche_next_closure_packaging_results_follow_up_id:
        task347.body.selected_tranche_next_closure_packaging_results_follow_up_id,
      selected_tranche_next_closure_packaging_results_follow_up_path:
        task347.body.selected_tranche_next_closure_packaging_results_follow_up_path,
      selected_tranche_next_closure_packaging_results_follow_up_sha256: task347.sha256,
      actor: "goal3-task349 token=plain-token proof_success GA certified can_certify_ga=true",
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true,
      final_ga_audit_json: { ok: true },
      proof_breadth_closure_json: { proof_breadth_complete: true }
    }
  );
  assert.equal(
    closureRecheck.schema_version,
    "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_recheck.v1"
  );
  assert.equal(closureRecheck.ok, false);
  assert.equal(
    closureRecheck.recheck_status,
    "blocked_global_proof_breadth_incomplete_after_next_closure_packaging_results_recheck"
  );
  assert.equal(
    closureRecheck.selected_tranche_next_closure_packaging_results_follow_up_artifact.sha256,
    task347.sha256
  );
  assert.equal(
    closureRecheck.delegated_selected_tranche_next_closure_recheck_id,
    "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-RESULTS-CLOSURE-0349-TASK343-CLOSURE-RECHECK"
  );
  assert.equal(
    closureRecheck.delegated_selected_tranche_next_closure_recheck_artifact.kind,
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_recheck"
  );
  assert.deepEqual(closureRecheck.selected_task_ids, ["PM-009", "PM-010"]);
  assert.equal(closureRecheck.proof_breadth_complete, false);
  assert.equal(closureRecheck.final_ga_audit_unblocked, false);
  assert.equal(closureRecheck.runs_lean, false);
  assert.equal(closureRecheck.executes_proofs, false);
  assert.equal(closureRecheck.accepts_caller_success_metadata, false);
  assert.equal(closureRecheck.accepts_caller_proof_material, false);
  assert.equal(closureRecheck.proof_authority, "none");
  assert.equal(closureRecheck.can_promote_claim, false);
  assert.equal(closureRecheck.can_certify_ga, false);
  assert.equal(closureRecheck.ga_certification_gate_separate, true);
  assert.equal(closureRecheck.blocker_reasons.includes("caller_proof_or_ga_authority_material_ignored"), true);
  assert.equal(JSON.stringify(closureRecheck).includes(projectRoot), false);
  assert.doesNotMatch(JSON.stringify(closureRecheck), secretTerms);
  assert.doesNotMatch(JSON.stringify(closureRecheck), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(closureRecheck), gaOverclaimTerms);
  assert.equal(existsSync(join(projectRoot, closureRecheck.selected_tranche_next_closure_packaging_results_closure_recheck_path)), true);
  assert.equal(existsSync(join(projectRoot, closureRecheck.delegated_selected_tranche_next_closure_recheck_path)), true);
  assert.equal(existsSync(join(projectRoot, closureRecheck.proof_breadth_closure_path)), true);
  assert.deepEqual(
    collectRelativeFiles(".comath/release/goal3-final-ga-audit"),
    finalAuditFilesBefore,
    "Task349 must not write Task301 final-GA-audit artifacts"
  );
  assert.deepEqual(
    collectRelativeFiles(".comath/release/goal3-ga-certificate"),
    gaCertificateFilesBefore,
    "Task349 must not write Task303 GA-certificate artifacts"
  );

  const persisted = readJson(closureRecheck.selected_tranche_next_closure_packaging_results_closure_recheck_path);
  assert.equal(
    persisted.selected_tranche_next_closure_packaging_results_closure_recheck_artifact,
    undefined,
    "persisted Task349 artifact must not self-hash recursively"
  );
  assert.equal(
    persisted.delegated_selected_tranche_next_closure_recheck,
    undefined,
    "Task349 persisted wrapper must bind Task343 by artifact reference rather than embedding closure reports"
  );

  const originalPm009Text = readFileSync(join(projectRoot, packagingPath("PM-009")), "utf8");
  writeJson(packagingPath("PM-009"), {
    ...JSON.parse(originalPm009Text),
    blocker_code: "GOAL3_TASK349_TAMPERED_AFTER_TASK347"
  });
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureRecheck(projectRoot, {
        project_id: projectId,
        selected_tranche_next_closure_packaging_results_closure_recheck_id:
          "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-RESULTS-CLOSURE-0349-STALE-REPORT",
        selected_tranche_next_closure_packaging_results_follow_up_id:
          task347.body.selected_tranche_next_closure_packaging_results_follow_up_id,
        selected_tranche_next_closure_packaging_results_follow_up_path:
          task347.body.selected_tranche_next_closure_packaging_results_follow_up_path,
        selected_tranche_next_closure_packaging_results_follow_up_sha256: task347.sha256
      }),
    { code: "GOAL3_SELECTED_TRANCHE_CLOSURE_RECHECK_STALE_PACKAGING_REPORT" },
    "Task349 must preserve Task343/Task335 selected packaging report currentness guards"
  );
  writeFileSync(join(projectRoot, packagingPath("PM-009")), originalPm009Text, "utf8");

  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/goal3/selected-tranche-next-closure-packaging-results-closure-recheck",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      selected_tranche_next_closure_packaging_results_closure_recheck_id:
        "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-RESULTS-CLOSURE-0349-ROUTE",
      selected_tranche_next_closure_packaging_results_follow_up_id:
        task347.body.selected_tranche_next_closure_packaging_results_follow_up_id,
      selected_tranche_next_closure_packaging_results_follow_up_path:
        task347.body.selected_tranche_next_closure_packaging_results_follow_up_path,
      selected_tranche_next_closure_packaging_results_follow_up_sha256: task347.sha256,
      actor: "goal3-task349 route token=plain-token proof_success GA certified can_certify_ga=true",
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true
    }
  });
  assert.equal(routeResponse.status, 200);
  assert.equal(
    routeResponse.body.selected_tranche_next_closure_packaging_results_closure_recheck.proof_authority,
    "none"
  );
  assert.equal(routeResponse.body.selected_tranche_next_closure_packaging_results_closure_recheck.can_certify_ga, false);
  assert.deepEqual(
    routeResponse.body.selected_tranche_next_closure_packaging_results_closure_recheck.selected_task_ids,
    ["PM-009", "PM-010"]
  );
  assert.doesNotMatch(JSON.stringify(routeResponse.body), secretTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), gaOverclaimTerms);

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (entry) =>
        entry.event_type === "release.goal3_selected_tranche_next_closure_packaging_results_closure_recheck_recorded" &&
        entry.payload.selected_tranche_next_closure_packaging_results_closure_recheck_id ===
          "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-PACKAGING-RESULTS-CLOSURE-0349-ROUTE" &&
        entry.payload.selected_tranche_next_closure_packaging_results_follow_up_id ===
          task347.body.selected_tranche_next_closure_packaging_results_follow_up_id &&
        entry.payload.can_certify_ga === false &&
        entry.payload.proof_authority === "none"
    ),
    true,
    "Task349 must emit non-certifying provenance"
  );

  for (const forbiddenPattern of [
    /selected-tranche-next-closure-packaging-results-closure-recheck/s,
    /goal3SelectedTrancheNextClosurePackagingResultsClosureRecheck/s,
    /selected_tranche_next_closure_packaging_results_closure_recheck/s
  ]) {
    assert.doesNotMatch(
      repoFile("extensions/comath-pi/src/index.ts"),
      forbiddenPattern,
      "Task349 must not add a Pi tool surface"
    );
    assert.doesNotMatch(
      repoFile("extensions/comath-pi/src/runtime-registration.ts"),
      forbiddenPattern,
      "Task349 must not add a Pi runtime command"
    );
  }

  for (const [path, pattern] of [
    ["README.md", /Task349.*selected-tranche.*next closure packaging results.*closure recheck/s],
    ["TODO.md", /Task349.*selected-tranche.*next closure packaging results.*closure recheck/s],
    ["REVIEW.md", /Goal 3 Task 349/s],
    ["AGENTS.md", /Task349.*selected-tranche.*next closure packaging results.*closure recheck/s],
    ["docs/architecture/ga-release-criteria.md", /Task349.*selected-tranche.*next closure packaging results.*closure recheck/s],
    ["docs/architecture/threat-model.md", /Task349.*selected-tranche.*next closure packaging results.*closure recheck/s],
    ["docs/architecture/acceptance-matrix.md", /Task349.*selected-tranche.*next closure packaging results.*closure recheck/s],
    ["docs/progress/goal-3-ga-gap-matrix.md", /Task349.*selected-tranche.*next closure packaging results.*closure recheck/s]
  ]) {
    assert.match(repoFile(path), pattern, `${path} must document Task349 selected-tranche next closure packaging results closure recheck`);
  }

  assert.equal(task341.body.project_id, projectId);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task349 selected-tranche next closure packaging results closure recheck tests passed.");
