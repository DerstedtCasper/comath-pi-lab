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
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge,
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThrough,
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUp,
  recordGoal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp
} = comath;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task341-selected-tranche-next-results-"));
const repoRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const { project } = initProject({ name: "Goal 3 Task341 selected tranche next packaging results", root_path: projectRoot });
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

function selectedTrancheNextPackagingFollowThroughPath(followThroughId) {
  return `.comath/release/goal3-selected-tranche-next-packaging-follow-through/${followThroughId}/follow-through.json`;
}

function selectedTrancheNextPackagingResultsFollowUpPath(followUpId) {
  return `.comath/release/goal3-selected-tranche-next-packaging-results-follow-up/${followUpId}/follow-up.json`;
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
    actor: "goal3-task341 task-local source",
    created_at: "2026-06-12T00:00:00.000Z",
    ok: true,
    follow_through_status: "selected_tranche_task_local_packaging_verified",
    task_local_packaging_follow_through_path: path,
    requested_follow_through_mode: "open_formal_workbench_release_candidate_task_local_lean_authority_packaging_follow_through",
    proof_breadth_execution_bridge_id: bridge.proof_breadth_execution_bridge_id,
    proof_breadth_execution_bridge_path: bridge.proof_breadth_execution_bridge_path,
    proof_breadth_execution_bridge_artifact: bridge.proof_breadth_execution_bridge_artifact,
    claim_id_prefix: "C-T341-SOURCE",
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
    typeof recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUp,
    "function",
    "Task341 must export a Task340-bound selected-tranche next packaging results follow-up"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("goal3_release_candidate_proof_breadth_selected_tranche_next_packaging_results_follow_up"),
    true,
    "Task341 capability ledger must advertise selected-tranche next packaging results follow-up without claiming proof authority"
  );
  assert.match(
    repoFile("scripts/phase0-smoke.mjs"),
    /goal3-task341-selected-tranche-next-packaging-results-follow-up\.test\.mjs/s,
    "phase0 smoke must discover the Task341 selected-tranche next packaging results focused suite"
  );

  const task341Source = repoFile("services/comathd/src/release/goal3-proof-breadth-selected-tranche-next-packaging-results-follow-up.ts");
  assert.match(
    task341Source,
    /recordGoal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp/s,
    "Task341 must reuse the existing Task335 selected-tranche packaging results follow-up"
  );
  assert.doesNotMatch(
    task341Source,
    /recordGoal3ReleaseCandidateProofBreadthExecutionFollowThrough|recordGoal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThrough|packageGoal3GaPositiveMatrixFinalAuthorityEvidenceFromEvidenceV3|executeGoal3GaPositiveMatrixLeanAuthorityReplay|LeanRunner|spawnSync|execFile|child_process|recordGoal3ReleaseCandidateProofBreadthClosure|recordGoal3FinalGaAudit/s,
    "Task341 must not implement packaging, run Lean, run Task332/334 directly, run Task300 closure, or run Task301 final-GA audit"
  );
  assert.doesNotMatch(
    repoFile("extensions/comath-pi/src/index.ts"),
    /selected-tranche-next-packaging-results-follow-up|recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUp/s,
    "Task341 is a service-owned release loop bridge and must not add a Pi surface"
  );
  assert.doesNotMatch(
    repoFile("extensions/comath-pi/src/runtime-registration.ts"),
    /selected-tranche-next-packaging-results-follow-up|recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUp/s,
    "Task341 is a service-owned release loop bridge and must not register a Pi runtime command"
  );

  const manifest = createGoal3GaPositiveTaskManifest();
  for (const task of manifest.tasks.slice(0, 4)) {
    writeJson(packagingPath(task.task_id), verifiedPackagingReport(task.task_id));
  }
  const bridge = recordGoal3ReleaseCandidateProofBreadthExecutionBridge(projectRoot, {
    project_id: projectId,
    proof_breadth_execution_bridge_id: "GOAL3-PROOF-BREADTH-BRIDGE-0341",
    actor: "goal3-task341 bridge token=plain-token proof_success GA certified can_certify_ga=true",
    max_tranche_size: 2
  });
  assert.deepEqual(bridge.next_execution_task_ids, ["PM-005", "PM-006"]);

  for (const taskId of bridge.next_execution_task_ids) {
    writeJson(packagingPath(taskId), verifiedPackagingReport(taskId));
  }
  const taskLocal = writeTask334LikeFollowThrough("GOAL3-TASK-LOCAL-PACKAGING-0341-SOURCE", bridge, bridge.next_execution_task_ids);
  const followUp = recordGoal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp(projectRoot, {
    project_id: projectId,
    selected_tranche_packaging_results_follow_up_id: "GOAL3-SELECTED-TRANCHE-PACKAGING-RESULTS-0341",
    proof_breadth_execution_follow_through_id: "GOAL3-PROOF-BREADTH-FOLLOW-THROUGH-0341",
    proof_breadth_execution_bridge_id: bridge.proof_breadth_execution_bridge_id,
    proof_breadth_execution_bridge_path: bridge.proof_breadth_execution_bridge_path,
    proof_breadth_execution_bridge_sha256: bridge.proof_breadth_execution_bridge_artifact.sha256,
    task_local_packaging_follow_through_id: "GOAL3-TASK-LOCAL-PACKAGING-0341-SOURCE",
    task_local_packaging_follow_through_path: taskLocal.path,
    task_local_packaging_follow_through_sha256: taskLocal.sha256
  });
  const recheck = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheClosureRecheck(projectRoot, {
    project_id: projectId,
    selected_tranche_closure_recheck_id: "GOAL3-SELECTED-TRANCHE-CLOSURE-RECHECK-0341",
    proof_breadth_closure_id: "GOAL3-PROOF-BREADTH-CLOSURE-0341",
    selected_tranche_packaging_results_follow_up_id: followUp.selected_tranche_packaging_results_follow_up_id,
    selected_tranche_packaging_results_follow_up_path: followUp.selected_tranche_packaging_results_follow_up_path,
    selected_tranche_packaging_results_follow_up_sha256: followUp.selected_tranche_packaging_results_follow_up_artifact.sha256,
    actor: "goal3-task341 recheck source token=plain-token proof_success GA certified can_certify_ga=true"
  });
  const nextBridge = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge(projectRoot, {
    project_id: projectId,
    selected_tranche_next_execution_bridge_id: "GOAL3-SELECTED-TRANCHE-NEXT-BRIDGE-0341",
    proof_breadth_execution_bridge_id: "GOAL3-PROOF-BREADTH-BRIDGE-0341-NEXT",
    selected_tranche_closure_recheck_id: recheck.selected_tranche_closure_recheck_id,
    selected_tranche_closure_recheck_path: recheck.selected_tranche_closure_recheck_path,
    selected_tranche_closure_recheck_sha256: recheck.selected_tranche_closure_recheck_artifact.sha256,
    actor: "goal3-task341 next bridge token=plain-token proof_success GA certified can_certify_ga=true",
    proof_authority: "lean_kernel_clean_replay",
    can_certify_ga: true,
    max_tranche_size: 2
  });
  assert.deepEqual(nextBridge.next_execution_task_ids, ["PM-007", "PM-008"]);

  const task340FollowThrough = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThrough(
    projectRoot,
    {
      project_id: projectId,
      selected_tranche_next_packaging_follow_through_id: "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-0341",
      selected_tranche_next_execution_bridge_id: nextBridge.selected_tranche_next_execution_bridge_id,
      selected_tranche_next_execution_bridge_path: nextBridge.selected_tranche_next_execution_bridge_path,
      selected_tranche_next_execution_bridge_sha256: nextBridge.selected_tranche_next_execution_bridge_artifact.sha256,
      task_local_packaging_follow_through_id: "GOAL3-TASK-LOCAL-PACKAGING-0341-DELEGATED",
      claim_id_prefix: "C-T341",
      actor: "goal3-task341 task340 token=plain-token proof_success GA certified can_certify_ga=true",
      evidence_by_task_id: Object.fromEntries(nextBridge.next_execution_task_ids.map((taskId) => [taskId, {}])),
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true
    }
  );
  assert.deepEqual(task340FollowThrough.selected_task_ids, ["PM-007", "PM-008"]);

  const task340AbsolutePath = join(projectRoot, task340FollowThrough.selected_tranche_next_packaging_follow_through_path);
  const originalTask340Text = readFileSync(task340AbsolutePath, "utf8");
  const tamperedTask340 = JSON.parse(originalTask340Text);
  tamperedTask340.blocker_reasons = [...tamperedTask340.blocker_reasons, "GOAL3_TASK341_TAMPERED_TASK340"];
  writeFileSync(task340AbsolutePath, `${JSON.stringify(tamperedTask340, null, 2)}\n`, "utf8");
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUp(projectRoot, {
        project_id: projectId,
        selected_tranche_next_packaging_results_follow_up_id: "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-RESULTS-0341-STALE-TASK340",
        selected_tranche_next_packaging_follow_through_id:
          task340FollowThrough.selected_tranche_next_packaging_follow_through_id,
        selected_tranche_next_packaging_follow_through_path:
          task340FollowThrough.selected_tranche_next_packaging_follow_through_path,
        selected_tranche_next_packaging_follow_through_sha256:
          task340FollowThrough.selected_tranche_next_packaging_follow_through_artifact.sha256
      }),
    { code: "GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_RESULTS_FOLLOW_UP_STALE_TASK340" },
    "Task341 must re-hash Task340 before delegating to Task335"
  );
  writeFileSync(task340AbsolutePath, originalTask340Text, "utf8");

  const delegatedBridgeAbsolutePath = join(projectRoot, task340FollowThrough.delegated_proof_breadth_execution_bridge_path);
  const originalDelegatedBridgeText = readFileSync(delegatedBridgeAbsolutePath, "utf8");
  const tamperedDelegatedBridge = JSON.parse(originalDelegatedBridgeText);
  tamperedDelegatedBridge.blocker_reasons = [...tamperedDelegatedBridge.blocker_reasons, "GOAL3_TASK341_TAMPERED_DELEGATED_BRIDGE"];
  writeFileSync(delegatedBridgeAbsolutePath, `${JSON.stringify(tamperedDelegatedBridge, null, 2)}\n`, "utf8");
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUp(projectRoot, {
        project_id: projectId,
        selected_tranche_next_packaging_results_follow_up_id: "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-RESULTS-0341-STALE-BRIDGE",
        selected_tranche_next_packaging_follow_through_id:
          task340FollowThrough.selected_tranche_next_packaging_follow_through_id,
        selected_tranche_next_packaging_follow_through_path:
          task340FollowThrough.selected_tranche_next_packaging_follow_through_path,
        selected_tranche_next_packaging_follow_through_sha256:
          task340FollowThrough.selected_tranche_next_packaging_follow_through_artifact.sha256
      }),
    { code: "GOAL3_SELECTED_TRANCHE_PACKAGING_RESULTS_FOLLOW_UP_STALE_BRIDGE" },
    "Task341 must pass Task340's delegated bridge hash through Task335 currentness checks"
  );
  writeFileSync(delegatedBridgeAbsolutePath, originalDelegatedBridgeText, "utf8");

  const task334AbsolutePath = join(projectRoot, task340FollowThrough.task_local_packaging_follow_through_path);
  const originalTask334Text = readFileSync(task334AbsolutePath, "utf8");
  const tamperedTask334 = JSON.parse(originalTask334Text);
  tamperedTask334.blocker_reasons = [...tamperedTask334.blocker_reasons, "GOAL3_TASK341_TAMPERED_TASK334"];
  writeFileSync(task334AbsolutePath, `${JSON.stringify(tamperedTask334, null, 2)}\n`, "utf8");
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUp(projectRoot, {
        project_id: projectId,
        selected_tranche_next_packaging_results_follow_up_id: "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-RESULTS-0341-STALE-TASK334",
        selected_tranche_next_packaging_follow_through_id:
          task340FollowThrough.selected_tranche_next_packaging_follow_through_id,
        selected_tranche_next_packaging_follow_through_path:
          task340FollowThrough.selected_tranche_next_packaging_follow_through_path,
        selected_tranche_next_packaging_follow_through_sha256:
          task340FollowThrough.selected_tranche_next_packaging_follow_through_artifact.sha256
      }),
    { code: "GOAL3_SELECTED_TRANCHE_PACKAGING_RESULTS_FOLLOW_UP_STALE_TASK_LOCAL_PACKAGING" },
    "Task341 must pass Task340's Task334 hash through Task335 currentness checks"
  );
  writeFileSync(task334AbsolutePath, originalTask334Text, "utf8");

  const noTask334Id = "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-0341-NO-TASK334";
  const noTask334Path = selectedTrancheNextPackagingFollowThroughPath(noTask334Id);
  const noTask334 = writeJson(noTask334Path, {
    ...readJson(task340FollowThrough.selected_tranche_next_packaging_follow_through_path),
    selected_tranche_next_packaging_follow_through_id: noTask334Id,
    selected_tranche_next_packaging_follow_through_path: noTask334Path,
    task_local_packaging_follow_through_id: null,
    task_local_packaging_follow_through_path: null,
    task_local_packaging_follow_through_artifact: null
  });
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUp(projectRoot, {
        project_id: projectId,
        selected_tranche_next_packaging_results_follow_up_id: "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-RESULTS-0341-NO-TASK334",
        selected_tranche_next_packaging_follow_through_id: noTask334Id,
        selected_tranche_next_packaging_follow_through_path: noTask334Path,
        selected_tranche_next_packaging_follow_through_sha256: noTask334.sha256
      }),
    { code: "GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_RESULTS_FOLLOW_UP_INVALID_TASK340" },
    "Task341 must fail closed when Task340 does not bind a Task334 artifact"
  );

  const closureFilesBeforeTask341 = collectRelativeFiles(".comath/release/goal3-proof-breadth-closure");
  const resultsFollowUp = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUp(
    projectRoot,
    {
      project_id: projectId,
      selected_tranche_next_packaging_results_follow_up_id: "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-RESULTS-0341",
      proof_breadth_execution_follow_through_id: "GOAL3-PROOF-BREADTH-FOLLOW-THROUGH-0341-NEXT",
      selected_tranche_next_packaging_follow_through_id:
        task340FollowThrough.selected_tranche_next_packaging_follow_through_id,
      selected_tranche_next_packaging_follow_through_path:
        task340FollowThrough.selected_tranche_next_packaging_follow_through_path,
      selected_tranche_next_packaging_follow_through_sha256:
        task340FollowThrough.selected_tranche_next_packaging_follow_through_artifact.sha256,
      actor: "goal3-task341 token=plain-token proof_success GA certified can_certify_ga=true",
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true,
      final_ga_audit_json: { ok: true },
      proof_breadth_closure_json: { proof_breadth_complete: true }
    }
  );

  assert.equal(
    resultsFollowUp.schema_version,
    "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_packaging_results_follow_up.v1"
  );
  assert.equal(resultsFollowUp.ok, false);
  assert.equal(resultsFollowUp.follow_up_status, "blocked_next_selected_tranche_packaging_results_incomplete");
  assert.equal(
    resultsFollowUp.selected_tranche_next_packaging_follow_through_id,
    task340FollowThrough.selected_tranche_next_packaging_follow_through_id
  );
  assert.equal(
    resultsFollowUp.selected_tranche_next_packaging_follow_through_artifact.sha256,
    task340FollowThrough.selected_tranche_next_packaging_follow_through_artifact.sha256
  );
  assert.equal(
    resultsFollowUp.delegated_proof_breadth_execution_bridge_id,
    task340FollowThrough.delegated_proof_breadth_execution_bridge_id
  );
  assert.equal(
    resultsFollowUp.task_local_packaging_follow_through_id,
    task340FollowThrough.task_local_packaging_follow_through_id
  );
  assert.deepEqual(resultsFollowUp.selected_task_ids, ["PM-007", "PM-008"]);
  assert.deepEqual(resultsFollowUp.verified_selected_task_ids, []);
  assert.deepEqual(resultsFollowUp.blocked_selected_task_ids, ["PM-007", "PM-008"]);
  assert.equal(resultsFollowUp.selected_task_count, 2);
  assert.equal(resultsFollowUp.verified_selected_task_count, 0);
  assert.equal(resultsFollowUp.blocked_selected_task_count, 2);
  assert.equal(resultsFollowUp.selected_packaging_report_artifacts_current, true);
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
  assert.equal(existsSync(join(projectRoot, resultsFollowUp.selected_tranche_next_packaging_results_follow_up_path)), true);
  assert.equal(existsSync(join(projectRoot, resultsFollowUp.selected_tranche_packaging_results_follow_up_path)), true);
  assert.deepEqual(
    collectRelativeFiles(".comath/release/goal3-proof-breadth-closure"),
    closureFilesBeforeTask341,
    "Task341 must not run or write new Task300 proof-breadth closure artifacts"
  );
  assert.equal(
    existsSync(join(projectRoot, ".comath/release/goal3-final-ga-audit")),
    false,
    "Task341 must not run or write Task301 final-GA-audit artifacts"
  );

  const persisted = readJson(resultsFollowUp.selected_tranche_next_packaging_results_follow_up_path);
  assert.equal(
    persisted.selected_tranche_next_packaging_results_follow_up_artifact,
    undefined,
    "persisted Task341 follow-up must not self-hash recursively"
  );
  assert.equal(
    persisted.selected_tranche_packaging_results_follow_up,
    undefined,
    "Task341 persisted artifact must bind Task335 by artifact reference instead of embedding recheck reports"
  );

  const originalPm007Text = readFileSync(join(projectRoot, packagingPath("PM-007")), "utf8");
  writeJson(packagingPath("PM-007"), {
    ...JSON.parse(originalPm007Text),
    blocker_code: "GOAL3_TASK341_TAMPERED_AFTER_TASK340"
  });
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUp(projectRoot, {
        project_id: projectId,
        selected_tranche_next_packaging_results_follow_up_id: "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-RESULTS-0341-STALE-REPORT",
        selected_tranche_next_packaging_follow_through_id:
          task340FollowThrough.selected_tranche_next_packaging_follow_through_id,
        selected_tranche_next_packaging_follow_through_path:
          task340FollowThrough.selected_tranche_next_packaging_follow_through_path,
        selected_tranche_next_packaging_follow_through_sha256:
          task340FollowThrough.selected_tranche_next_packaging_follow_through_artifact.sha256
      }),
    { code: "GOAL3_SELECTED_TRANCHE_PACKAGING_RESULTS_FOLLOW_UP_STALE_PACKAGING_REPORT" },
    "Task341 must reuse Task335's selected canonical packaging report re-hash guard"
  );
  writeFileSync(join(projectRoot, packagingPath("PM-007")), originalPm007Text, "utf8");

  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/goal3/selected-tranche-next-packaging-results-follow-up",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      selected_tranche_next_packaging_results_follow_up_id: "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-RESULTS-0341-ROUTE",
      selected_tranche_next_packaging_follow_through_id:
        task340FollowThrough.selected_tranche_next_packaging_follow_through_id,
      selected_tranche_next_packaging_follow_through_path:
        task340FollowThrough.selected_tranche_next_packaging_follow_through_path,
      selected_tranche_next_packaging_follow_through_sha256:
        task340FollowThrough.selected_tranche_next_packaging_follow_through_artifact.sha256,
      actor: "goal3-task341 route token=plain-token proof_success GA certified can_certify_ga=true",
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true
    }
  });
  assert.equal(routeResponse.status, 200);
  assert.equal(routeResponse.body.selected_tranche_next_packaging_results_follow_up.ok, false);
  assert.deepEqual(routeResponse.body.selected_tranche_next_packaging_results_follow_up.selected_task_ids, ["PM-007", "PM-008"]);
  assert.equal(routeResponse.body.selected_tranche_next_packaging_results_follow_up.can_certify_ga, false);
  assert.equal(routeResponse.body.selected_tranche_next_packaging_results_follow_up.proof_authority, "none");
  assert.doesNotMatch(JSON.stringify(routeResponse.body), secretTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), gaOverclaimTerms);

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (entry) =>
        entry.event_type === "release.goal3_selected_tranche_next_packaging_results_follow_up_recorded" &&
        entry.payload.selected_tranche_next_packaging_results_follow_up_id ===
          "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-RESULTS-0341-ROUTE" &&
        entry.payload.selected_tranche_next_packaging_follow_through_id ===
          task340FollowThrough.selected_tranche_next_packaging_follow_through_id &&
        entry.payload.selected_task_ids.join(",") === "PM-007,PM-008" &&
        entry.payload.can_certify_ga === false &&
        entry.payload.proof_authority === "none"
    ),
    true,
    "Task341 selected-tranche next packaging results follow-up must emit non-certifying provenance"
  );

  for (const [path, pattern] of [
    ["README.md", /Task341.*selected-tranche.*next packaging results follow-up/s],
    ["TODO.md", /Task341.*selected-tranche.*next packaging results follow-up/s],
    ["REVIEW.md", /Task341.*selected-tranche.*next packaging results follow-up/s],
    ["AGENTS.md", /Task341.*selected-tranche.*next packaging results follow-up/s],
    ["docs/architecture/ga-release-criteria.md", /Task341.*selected-tranche.*next packaging results follow-up/s],
    ["docs/architecture/threat-model.md", /Task341.*selected-tranche.*next packaging results follow-up/s],
    ["docs/architecture/acceptance-matrix.md", /Task341.*selected-tranche.*next packaging results follow-up/s]
  ]) {
    assert.match(repoFile(path), pattern, `${path} must document Task341 selected-tranche next packaging results follow-up`);
  }
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task341 selected-tranche next packaging results follow-up tests passed.");
