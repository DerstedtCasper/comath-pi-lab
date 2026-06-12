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
  recordGoal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp
} = comath;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task340-selected-tranche-next-packaging-"));
const repoRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const { project } = initProject({ name: "Goal 3 Task340 selected tranche next packaging", root_path: projectRoot });
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
    actor: "goal3-task340 task-local source",
    created_at: "2026-06-12T00:00:00.000Z",
    ok: true,
    follow_through_status: "selected_tranche_task_local_packaging_verified",
    task_local_packaging_follow_through_path: path,
    requested_follow_through_mode: "open_formal_workbench_release_candidate_task_local_lean_authority_packaging_follow_through",
    proof_breadth_execution_bridge_id: bridge.proof_breadth_execution_bridge_id,
    proof_breadth_execution_bridge_path: bridge.proof_breadth_execution_bridge_path,
    proof_breadth_execution_bridge_artifact: bridge.proof_breadth_execution_bridge_artifact,
    claim_id_prefix: "C-T340-SOURCE",
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
    typeof recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThrough,
    "function",
    "Task340 must export a Task338-bound selected-tranche next packaging follow-through"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("goal3_release_candidate_proof_breadth_selected_tranche_next_packaging_follow_through"),
    true,
    "Task340 capability ledger must advertise selected-tranche next packaging follow-through without claiming proof authority"
  );
  assert.match(
    repoFile("scripts/phase0-smoke.mjs"),
    /goal3-task340-selected-tranche-next-packaging-follow-through\.test\.mjs/s,
    "phase0 smoke must discover the Task340 selected-tranche next packaging focused suite"
  );

  const task340Source = repoFile("services/comathd/src/release/goal3-proof-breadth-selected-tranche-next-packaging-follow-through.ts");
  assert.match(
    task340Source,
    /recordGoal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThrough/s,
    "Task340 must delegate next selected-tranche packaging to the existing Task334 follow-through"
  );
  assert.doesNotMatch(
    task340Source,
    /packageGoal3GaPositiveMatrixFinalAuthorityEvidenceFromEvidenceV3|executeGoal3GaPositiveMatrixLeanAuthorityReplay|LeanRunner|spawnSync|execFile|child_process|recordGoal3ReleaseCandidateProofBreadthClosure|recordGoal3FinalGaAudit/s,
    "Task340 must not implement a new verifier, run Lean, run Task300 closure, or run Task301 final-GA audit"
  );
  assert.doesNotMatch(
    repoFile("extensions/comath-pi/src/index.ts"),
    /selected-tranche-next-packaging-follow-through|recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThrough/s,
    "Task340 is a service-owned release loop bridge and must not add a Pi surface"
  );
  assert.doesNotMatch(
    repoFile("extensions/comath-pi/src/runtime-registration.ts"),
    /selected-tranche-next-packaging-follow-through|recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThrough/s,
    "Task340 is a service-owned release loop bridge and must not register a Pi runtime command"
  );

  const manifest = createGoal3GaPositiveTaskManifest();
  for (const task of manifest.tasks.slice(0, 4)) {
    writeJson(packagingPath(task.task_id), verifiedPackagingReport(task.task_id));
  }
  const bridge = recordGoal3ReleaseCandidateProofBreadthExecutionBridge(projectRoot, {
    project_id: projectId,
    proof_breadth_execution_bridge_id: "GOAL3-PROOF-BREADTH-BRIDGE-0340",
    actor: "goal3-task340 bridge token=plain-token proof_success GA certified can_certify_ga=true",
    max_tranche_size: 2
  });
  assert.deepEqual(bridge.next_execution_task_ids, ["PM-005", "PM-006"]);

  for (const taskId of bridge.next_execution_task_ids) {
    writeJson(packagingPath(taskId), verifiedPackagingReport(taskId));
  }
  const taskLocal = writeTask334LikeFollowThrough("GOAL3-TASK-LOCAL-PACKAGING-0340-SOURCE", bridge, bridge.next_execution_task_ids);
  const followUp = recordGoal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp(projectRoot, {
    project_id: projectId,
    selected_tranche_packaging_results_follow_up_id: "GOAL3-SELECTED-TRANCHE-PACKAGING-RESULTS-0340",
    proof_breadth_execution_follow_through_id: "GOAL3-PROOF-BREADTH-FOLLOW-THROUGH-0340",
    proof_breadth_execution_bridge_id: bridge.proof_breadth_execution_bridge_id,
    proof_breadth_execution_bridge_path: bridge.proof_breadth_execution_bridge_path,
    proof_breadth_execution_bridge_sha256: bridge.proof_breadth_execution_bridge_artifact.sha256,
    task_local_packaging_follow_through_id: "GOAL3-TASK-LOCAL-PACKAGING-0340-SOURCE",
    task_local_packaging_follow_through_path: taskLocal.path,
    task_local_packaging_follow_through_sha256: taskLocal.sha256
  });
  const recheck = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheClosureRecheck(projectRoot, {
    project_id: projectId,
    selected_tranche_closure_recheck_id: "GOAL3-SELECTED-TRANCHE-CLOSURE-RECHECK-0340",
    proof_breadth_closure_id: "GOAL3-PROOF-BREADTH-CLOSURE-0340",
    selected_tranche_packaging_results_follow_up_id: followUp.selected_tranche_packaging_results_follow_up_id,
    selected_tranche_packaging_results_follow_up_path: followUp.selected_tranche_packaging_results_follow_up_path,
    selected_tranche_packaging_results_follow_up_sha256: followUp.selected_tranche_packaging_results_follow_up_artifact.sha256,
    actor: "goal3-task340 recheck source token=plain-token proof_success GA certified can_certify_ga=true"
  });
  const nextBridge = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge(projectRoot, {
    project_id: projectId,
    selected_tranche_next_execution_bridge_id: "GOAL3-SELECTED-TRANCHE-NEXT-BRIDGE-0340",
    proof_breadth_execution_bridge_id: "GOAL3-PROOF-BREADTH-BRIDGE-0340-NEXT",
    selected_tranche_closure_recheck_id: recheck.selected_tranche_closure_recheck_id,
    selected_tranche_closure_recheck_path: recheck.selected_tranche_closure_recheck_path,
    selected_tranche_closure_recheck_sha256: recheck.selected_tranche_closure_recheck_artifact.sha256,
    actor: "goal3-task340 next bridge token=plain-token proof_success GA certified can_certify_ga=true",
    proof_authority: "lean_kernel_clean_replay",
    can_certify_ga: true,
    max_tranche_size: 2
  });
  assert.deepEqual(nextBridge.next_execution_task_ids, ["PM-007", "PM-008"]);

  const evidenceByTaskId = Object.fromEntries(nextBridge.next_execution_task_ids.map((taskId) => [taskId, {}]));

  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThrough(projectRoot, {
        project_id: projectId,
        selected_tranche_next_packaging_follow_through_id: "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-0340-UNSELECTED",
        selected_tranche_next_execution_bridge_id: nextBridge.selected_tranche_next_execution_bridge_id,
        selected_tranche_next_execution_bridge_path: nextBridge.selected_tranche_next_execution_bridge_path,
        selected_tranche_next_execution_bridge_sha256: nextBridge.selected_tranche_next_execution_bridge_artifact.sha256,
        evidence_by_task_id: {
          ...evidenceByTaskId,
          "PM-009": {}
        }
      }),
    { code: "GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_FOLLOW_THROUGH_UNSELECTED_EVIDENCE" },
    "Task340 must reject evidence outside the Task338 selected next tranche before delegating to Task334"
  );
  assert.equal(
    existsSync(join(projectRoot, selectedTrancheNextPackagingFollowThroughPath("GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-0340-UNSELECTED"))),
    false,
    "Task340 must not persist an artifact after unselected evidence is rejected"
  );

  const task338AbsolutePath = join(projectRoot, nextBridge.selected_tranche_next_execution_bridge_path);
  const originalTask338Text = readFileSync(task338AbsolutePath, "utf8");
  const tamperedTask338 = JSON.parse(originalTask338Text);
  tamperedTask338.blocker_reasons = [...tamperedTask338.blocker_reasons, "GOAL3_TASK340_TAMPERED_TASK338"];
  writeFileSync(task338AbsolutePath, `${JSON.stringify(tamperedTask338, null, 2)}\n`, "utf8");
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThrough(projectRoot, {
        project_id: projectId,
        selected_tranche_next_packaging_follow_through_id: "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-0340-STALE-TASK338",
        selected_tranche_next_execution_bridge_id: nextBridge.selected_tranche_next_execution_bridge_id,
        selected_tranche_next_execution_bridge_path: nextBridge.selected_tranche_next_execution_bridge_path,
        selected_tranche_next_execution_bridge_sha256: nextBridge.selected_tranche_next_execution_bridge_artifact.sha256
      }),
    { code: "GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_FOLLOW_THROUGH_STALE_TASK338" },
    "Task340 must re-hash Task338 before delegating to Task334"
  );
  writeFileSync(task338AbsolutePath, originalTask338Text, "utf8");

  const delegatedBridgeAbsolutePath = join(projectRoot, nextBridge.next_proof_breadth_execution_bridge_path);
  const originalDelegatedBridgeText = readFileSync(delegatedBridgeAbsolutePath, "utf8");
  const tamperedDelegatedBridge = JSON.parse(originalDelegatedBridgeText);
  tamperedDelegatedBridge.blocker_reasons = [...tamperedDelegatedBridge.blocker_reasons, "GOAL3_TASK340_TAMPERED_DELEGATED_BRIDGE"];
  writeFileSync(delegatedBridgeAbsolutePath, `${JSON.stringify(tamperedDelegatedBridge, null, 2)}\n`, "utf8");
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThrough(projectRoot, {
        project_id: projectId,
        selected_tranche_next_packaging_follow_through_id: "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-0340-STALE-DELEGATED",
        selected_tranche_next_execution_bridge_id: nextBridge.selected_tranche_next_execution_bridge_id,
        selected_tranche_next_execution_bridge_path: nextBridge.selected_tranche_next_execution_bridge_path,
        selected_tranche_next_execution_bridge_sha256: nextBridge.selected_tranche_next_execution_bridge_artifact.sha256
      }),
    { code: "GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_FOLLOW_THROUGH_STALE_DELEGATED_BRIDGE" },
    "Task340 must re-hash the Task338 delegated Task326 bridge before delegating to Task334"
  );
  writeFileSync(delegatedBridgeAbsolutePath, originalDelegatedBridgeText, "utf8");

  const mismatchId = "GOAL3-SELECTED-TRANCHE-NEXT-BRIDGE-0340-MISMATCH";
  const mismatchPath = `.comath/release/goal3-selected-tranche-next-execution-bridge/${mismatchId}/bridge.json`;
  const mismatch = writeJson(mismatchPath, {
    ...readJson(nextBridge.selected_tranche_next_execution_bridge_path),
    selected_tranche_next_execution_bridge_id: mismatchId,
    selected_tranche_next_execution_bridge_path: mismatchPath,
    next_execution_task_ids: ["PM-009"],
    next_execution_targets: []
  });
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThrough(projectRoot, {
        project_id: projectId,
        selected_tranche_next_packaging_follow_through_id: "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-0340-MISMATCH",
        selected_tranche_next_execution_bridge_id: mismatchId,
        selected_tranche_next_execution_bridge_path: mismatchPath,
        selected_tranche_next_execution_bridge_sha256: mismatch.sha256
      }),
    { code: "GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_FOLLOW_THROUGH_DELEGATED_BRIDGE_MISMATCH" },
    "Task340 must reject Task338 artifacts whose outer selected task ids drift away from the delegated Task326 bridge"
  );

  const noNextId = "GOAL3-SELECTED-TRANCHE-NEXT-BRIDGE-0340-NO-NEXT";
  const noNextPath = `.comath/release/goal3-selected-tranche-next-execution-bridge/${noNextId}/bridge.json`;
  const noNext = writeJson(noNextPath, {
    ...readJson(nextBridge.selected_tranche_next_execution_bridge_path),
    selected_tranche_next_execution_bridge_id: noNextId,
    selected_tranche_next_execution_bridge_path: noNextPath,
    ok: false,
    bridge_status: "complete_proof_breadth_requires_task301_final_ga_audit_binding",
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
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThrough(projectRoot, {
        project_id: projectId,
        selected_tranche_next_packaging_follow_through_id: "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-0340-NO-NEXT",
        selected_tranche_next_execution_bridge_id: noNextId,
        selected_tranche_next_execution_bridge_path: noNextPath,
        selected_tranche_next_execution_bridge_sha256: noNext.sha256
      }),
    { code: "GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_FOLLOW_THROUGH_NO_NEXT_BRIDGE" },
    "Task340 must fail closed when Task338 says proof breadth is complete and Task301 is the next gate"
  );

  const closureFilesBeforeTask340 = collectRelativeFiles(".comath/release/goal3-proof-breadth-closure");
  const followThrough = recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThrough(projectRoot, {
    project_id: projectId,
    selected_tranche_next_packaging_follow_through_id: "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-0340",
    selected_tranche_next_execution_bridge_id: nextBridge.selected_tranche_next_execution_bridge_id,
    selected_tranche_next_execution_bridge_path: nextBridge.selected_tranche_next_execution_bridge_path,
    selected_tranche_next_execution_bridge_sha256: nextBridge.selected_tranche_next_execution_bridge_artifact.sha256,
    task_local_packaging_follow_through_id: "GOAL3-TASK-LOCAL-PACKAGING-0340-DELEGATED",
    claim_id_prefix: "C-T340",
    actor: "goal3-task340 token=plain-token proof_success GA certified can_certify_ga=true",
    evidence_by_task_id: evidenceByTaskId,
    proof_authority: "lean_kernel_clean_replay",
    can_certify_ga: true
  });

  assert.equal(
    followThrough.schema_version,
    "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_packaging_follow_through.v1"
  );
  assert.equal(followThrough.ok, false);
  assert.equal(followThrough.follow_through_status, "blocked_next_selected_tranche_task_local_packaging_incomplete");
  assert.equal(followThrough.selected_tranche_next_execution_bridge_id, nextBridge.selected_tranche_next_execution_bridge_id);
  assert.equal(followThrough.selected_tranche_next_execution_bridge_artifact.sha256, nextBridge.selected_tranche_next_execution_bridge_artifact.sha256);
  assert.equal(followThrough.delegated_proof_breadth_execution_bridge_id, nextBridge.next_proof_breadth_execution_bridge_id);
  assert.equal(followThrough.delegated_proof_breadth_execution_bridge_path, nextBridge.next_proof_breadth_execution_bridge_path);
  assert.equal(followThrough.delegated_proof_breadth_execution_bridge_artifact.sha256, nextBridge.next_proof_breadth_execution_bridge_artifact.sha256);
  assert.equal(followThrough.task_local_packaging_follow_through_id, "GOAL3-TASK-LOCAL-PACKAGING-0340-DELEGATED");
  assert.deepEqual(followThrough.selected_task_ids, ["PM-007", "PM-008"]);
  assert.deepEqual(followThrough.verified_selected_task_ids, []);
  assert.deepEqual(followThrough.blocked_selected_task_ids, ["PM-007", "PM-008"]);
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
  assert.equal(existsSync(join(projectRoot, followThrough.selected_tranche_next_packaging_follow_through_path)), true);
  assert.equal(existsSync(join(projectRoot, followThrough.task_local_packaging_follow_through_path)), true);
  assert.equal(readJson(packagingPath("PM-007")).final_evidence_status, "blocked_missing_final_evidence");
  assert.equal(readJson(packagingPath("PM-008")).final_evidence_status, "blocked_missing_final_evidence");
  assert.equal(readJson(packagingPath("PM-007")).proof_authority, "none");
  assert.equal(readJson(packagingPath("PM-008")).proof_authority, "none");
  assert.equal(
    existsSync(join(projectRoot, ".comath/release/positive_matrix/PM-009/final_authority_packaging_report_v3.json")),
    false,
    "Task340 must not write PM reports outside the Task338 next selected tranche"
  );
  assert.deepEqual(
    collectRelativeFiles(".comath/release/goal3-proof-breadth-closure"),
    closureFilesBeforeTask340,
    "Task340 must not run or write new Task300 proof-breadth closure artifacts"
  );
  assert.equal(
    existsSync(join(projectRoot, ".comath/release/goal3-final-ga-audit")),
    false,
    "Task340 must not run or write Task301 final-GA-audit artifacts"
  );

  const persisted = readJson(followThrough.selected_tranche_next_packaging_follow_through_path);
  assert.equal(
    persisted.selected_tranche_next_packaging_follow_through_artifact,
    undefined,
    "persisted Task340 follow-through must not self-hash recursively"
  );
  assert.equal(
    persisted.task_local_packaging_follow_through,
    undefined,
    "Task340 persisted artifact must bind Task334 by artifact reference instead of embedding proof reports"
  );

  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/goal3/selected-tranche-next-packaging-follow-through",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      selected_tranche_next_packaging_follow_through_id: "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-0340-ROUTE",
      selected_tranche_next_execution_bridge_id: nextBridge.selected_tranche_next_execution_bridge_id,
      selected_tranche_next_execution_bridge_path: nextBridge.selected_tranche_next_execution_bridge_path,
      selected_tranche_next_execution_bridge_sha256: nextBridge.selected_tranche_next_execution_bridge_artifact.sha256,
      task_local_packaging_follow_through_id: "GOAL3-TASK-LOCAL-PACKAGING-0340-ROUTE",
      claim_id_prefix: "C-T340",
      actor: "goal3-task340 route token=plain-token proof_success GA certified can_certify_ga=true",
      evidence_by_task_id: evidenceByTaskId,
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true
    }
  });
  assert.equal(routeResponse.status, 200);
  assert.equal(routeResponse.body.selected_tranche_next_packaging_follow_through.ok, false);
  assert.deepEqual(routeResponse.body.selected_tranche_next_packaging_follow_through.selected_task_ids, ["PM-007", "PM-008"]);
  assert.equal(routeResponse.body.selected_tranche_next_packaging_follow_through.can_certify_ga, false);
  assert.equal(routeResponse.body.selected_tranche_next_packaging_follow_through.proof_authority, "none");
  assert.doesNotMatch(JSON.stringify(routeResponse.body), secretTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), gaOverclaimTerms);

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (entry) =>
        entry.event_type === "release.goal3_selected_tranche_next_packaging_follow_through_recorded" &&
        entry.payload.selected_tranche_next_packaging_follow_through_id === "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-0340-ROUTE" &&
        entry.payload.selected_tranche_next_execution_bridge_id === nextBridge.selected_tranche_next_execution_bridge_id &&
        entry.payload.task_local_packaging_follow_through_id === "GOAL3-TASK-LOCAL-PACKAGING-0340-ROUTE" &&
        entry.payload.selected_task_ids.join(",") === "PM-007,PM-008" &&
        entry.payload.can_certify_ga === false &&
        entry.payload.proof_authority === "none"
    ),
    true,
    "Task340 selected-tranche next packaging follow-through must emit non-certifying provenance"
  );

  for (const [path, pattern] of [
    ["README.md", /Task340.*selected-tranche.*next packaging follow-through/s],
    ["TODO.md", /Task340.*selected-tranche.*next packaging follow-through/s],
    ["REVIEW.md", /Task340.*selected-tranche.*next packaging follow-through/s],
    ["AGENTS.md", /Task340.*selected-tranche.*next packaging follow-through/s],
    ["docs/architecture/ga-release-criteria.md", /Task340.*selected-tranche.*next packaging follow-through/s],
    ["docs/architecture/threat-model.md", /Task340.*selected-tranche.*next packaging follow-through/s],
    ["docs/architecture/acceptance-matrix.md", /Task340.*selected-tranche.*next packaging follow-through/s]
  ]) {
    assert.match(repoFile(path), pattern, `${path} must document Task340 selected-tranche next packaging follow-through`);
  }
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task340 selected-tranche next packaging follow-through tests passed.");
