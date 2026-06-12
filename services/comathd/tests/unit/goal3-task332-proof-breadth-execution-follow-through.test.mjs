import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as comath from "../../dist/index.js";

const {
  createComathServer,
  createGoal3GaPositiveTaskManifest,
  getComathdStatus,
  initProject,
  readAuditEvents,
  recordGoal3ReleaseCandidateProofBreadthExecutionBridge,
  recordGoal3ReleaseCandidateProofBreadthExecutionFollowThrough
} = comath;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task332-proof-breadth-follow-through-"));
const { project } = initProject({ name: "Goal 3 Task332 proof breadth follow-through", root_path: projectRoot });
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
    body: value
  };
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(projectRoot, relativePath), "utf8"));
}

function packagingPath(taskId) {
  return `.comath/release/positive_matrix/${taskId}/final_authority_packaging_report_v3.json`;
}

function followThroughPath(followThroughId) {
  return `.comath/release/goal3-proof-breadth-execution-follow-through/${followThroughId}/follow-through.json`;
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

try {
  assert.equal(
    typeof recordGoal3ReleaseCandidateProofBreadthExecutionFollowThrough,
    "function",
    "Task332 must export a service-owned proof-breadth execution follow-through recorder"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("goal3_release_candidate_proof_breadth_execution_follow_through"),
    true,
    "Task332 capability ledger must advertise proof-breadth execution follow-through without claiming authority"
  );

  for (const task of createGoal3GaPositiveTaskManifest().tasks.slice(0, 2)) {
    writeJson(packagingPath(task.task_id), verifiedPackagingReport(task.task_id));
  }
  writeJson(packagingPath("PM-003"), {
    ...verifiedPackagingReport("PM-003"),
    final_evidence_status: "blocked_missing_final_evidence",
    blocker_code: "GOAL3_PM003_REPLAY_BLOCKED",
    missing_final_evidence_classes: ["final_replay_manifest_v3"],
    source_verification: {
      verification_basis: "project_local_artifacts",
      caller_success_metadata_trusted: false,
      verified_final_evidence_classes: evidenceClasses.slice(0, 2),
      missing_final_evidence_classes: ["final_replay_manifest_v3"],
      lean_run_manifest_paths_checked: 1
    },
    proof_authority: "none"
  });

  const bridge = recordGoal3ReleaseCandidateProofBreadthExecutionBridge(projectRoot, {
    project_id: projectId,
    proof_breadth_execution_bridge_id: "GOAL3-PROOF-BREADTH-BRIDGE-0332",
    actor: "goal3-task332 bridge token=plain-token proof_success GA certified can_certify_ga=true",
    max_tranche_size: 2
  });
  assert.deepEqual(bridge.next_execution_task_ids, ["PM-003", "PM-004"]);

  const missingFollowThrough = recordGoal3ReleaseCandidateProofBreadthExecutionFollowThrough(projectRoot, {
    project_id: projectId,
    proof_breadth_execution_follow_through_id: "GOAL3-PROOF-BREADTH-FOLLOW-THROUGH-0332-MISSING",
    proof_breadth_execution_bridge_id: bridge.proof_breadth_execution_bridge_id,
    proof_breadth_execution_bridge_path: bridge.proof_breadth_execution_bridge_path,
    proof_breadth_execution_bridge_sha256: bridge.proof_breadth_execution_bridge_artifact.sha256,
    actor: "goal3-task332 token=plain-token proof_success GA certified can_certify_ga=true",
    proof_claim: {
      clean_replay_passed: true,
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true
    }
  });

  assert.equal(missingFollowThrough.schema_version, "comath.goal3_release_candidate_proof_breadth_execution_follow_through.v1");
  assert.equal(missingFollowThrough.ok, false);
  assert.equal(missingFollowThrough.follow_through_status, "blocked_selected_tranche_incomplete");
  assert.equal(missingFollowThrough.proof_breadth_execution_bridge_id, bridge.proof_breadth_execution_bridge_id);
  assert.equal(missingFollowThrough.proof_breadth_execution_bridge_path, bridge.proof_breadth_execution_bridge_path);
  assert.equal(
    missingFollowThrough.proof_breadth_execution_bridge_artifact.sha256,
    bridge.proof_breadth_execution_bridge_artifact.sha256
  );
  assert.deepEqual(missingFollowThrough.selected_task_ids, ["PM-003", "PM-004"]);
  assert.deepEqual(missingFollowThrough.verified_selected_task_ids, []);
  assert.deepEqual(missingFollowThrough.blocked_selected_task_ids, ["PM-003"]);
  assert.deepEqual(missingFollowThrough.missing_selected_task_ids, ["PM-004"]);
  assert.equal(missingFollowThrough.selected_task_count, 2);
  assert.equal(missingFollowThrough.verified_selected_task_count, 0);
  assert.equal(missingFollowThrough.blocked_selected_task_count, 1);
  assert.equal(missingFollowThrough.missing_selected_task_count, 1);
  assert.equal(missingFollowThrough.selected_packaging_report_artifacts.length, 1);
  assert.equal(missingFollowThrough.selected_packaging_report_artifacts[0].path, packagingPath("PM-003"));
  assert.equal(missingFollowThrough.ready_for_proof_breadth_closure_recheck, false);
  assert.equal(missingFollowThrough.proof_breadth_complete, false);
  assert.equal(missingFollowThrough.final_ga_audit_unblocked, false);
  assert.equal(missingFollowThrough.runs_lean, false);
  assert.equal(missingFollowThrough.executes_proofs, false);
  assert.equal(missingFollowThrough.accepts_caller_proof_material, false);
  assert.equal(missingFollowThrough.proof_authority, "none");
  assert.equal(missingFollowThrough.can_promote_claim, false);
  assert.equal(missingFollowThrough.can_certify_ga, false);
  assert.equal(missingFollowThrough.ga_certification_gate_separate, true);
  assert.equal(
    missingFollowThrough.blocker_reasons.includes("selected_positive_matrix_tranche_incomplete"),
    true
  );
  assert.equal(missingFollowThrough.blocker_reasons.includes("caller_proof_breadth_material_ignored"), true);
  assert.equal(
    existsSync(join(projectRoot, packagingPath("PM-004"))),
    false,
    "Task332 follow-through must not fabricate missing task-local Lean Authority packaging reports"
  );
  assert.equal(existsSync(join(projectRoot, missingFollowThrough.proof_breadth_execution_follow_through_path)), true);
  assert.equal(JSON.stringify(missingFollowThrough).includes(projectRoot), false);
  assert.doesNotMatch(JSON.stringify(missingFollowThrough), secretTerms);
  assert.doesNotMatch(JSON.stringify(missingFollowThrough), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(missingFollowThrough), gaOverclaimTerms);

  const persistedMissing = readJson(missingFollowThrough.proof_breadth_execution_follow_through_path);
  assert.equal(
    persistedMissing.proof_breadth_execution_follow_through_artifact,
    undefined,
    "persisted proof-breadth follow-through must not self-hash recursively"
  );
  assert.deepEqual(persistedMissing.selected_task_ids, ["PM-003", "PM-004"]);

  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthExecutionFollowThrough(projectRoot, {
        project_id: projectId,
        proof_breadth_execution_follow_through_id: "GOAL3-PROOF-BREADTH-FOLLOW-THROUGH-0332-STALE",
        proof_breadth_execution_bridge_id: bridge.proof_breadth_execution_bridge_id,
        proof_breadth_execution_bridge_path: bridge.proof_breadth_execution_bridge_path,
        proof_breadth_execution_bridge_sha256: "0".repeat(64)
      }),
    { code: "GOAL3_PROOF_BREADTH_EXECUTION_FOLLOW_THROUGH_STALE_BRIDGE" },
    "Task332 follow-through must reject stale or tampered bridge hashes"
  );
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthExecutionFollowThrough(projectRoot, {
        project_id: projectId,
        proof_breadth_execution_follow_through_id: "GOAL3-PROOF-BREADTH-FOLLOW-THROUGH-0332-MISSING",
        proof_breadth_execution_bridge_id: bridge.proof_breadth_execution_bridge_id,
        proof_breadth_execution_bridge_path: bridge.proof_breadth_execution_bridge_path,
        proof_breadth_execution_bridge_sha256: bridge.proof_breadth_execution_bridge_artifact.sha256
      }),
    { code: "GOAL3_PROOF_BREADTH_EXECUTION_FOLLOW_THROUGH_ALREADY_EXISTS" },
    "Task332 follow-through ids must be append-only"
  );

  writeJson(packagingPath("PM-003"), verifiedPackagingReport("PM-003"));
  writeJson(packagingPath("PM-004"), verifiedPackagingReport("PM-004"));
  const verifiedFollowThrough = recordGoal3ReleaseCandidateProofBreadthExecutionFollowThrough(projectRoot, {
    project_id: projectId,
    proof_breadth_execution_follow_through_id: "GOAL3-PROOF-BREADTH-FOLLOW-THROUGH-0332-VERIFIED",
    proof_breadth_execution_bridge_id: bridge.proof_breadth_execution_bridge_id,
    proof_breadth_execution_bridge_path: bridge.proof_breadth_execution_bridge_path,
    proof_breadth_execution_bridge_sha256: bridge.proof_breadth_execution_bridge_artifact.sha256
  });
  assert.equal(verifiedFollowThrough.ok, true);
  assert.equal(verifiedFollowThrough.follow_through_status, "selected_tranche_ready_for_proof_breadth_closure_recheck");
  assert.deepEqual(verifiedFollowThrough.verified_selected_task_ids, ["PM-003", "PM-004"]);
  assert.deepEqual(verifiedFollowThrough.blocked_selected_task_ids, []);
  assert.deepEqual(verifiedFollowThrough.missing_selected_task_ids, []);
  assert.equal(verifiedFollowThrough.selected_packaging_report_artifacts.length, 2);
  assert.equal(verifiedFollowThrough.ready_for_proof_breadth_closure_recheck, true);
  assert.equal(verifiedFollowThrough.proof_breadth_complete, false);
  assert.equal(verifiedFollowThrough.final_ga_audit_unblocked, false);
  assert.equal(verifiedFollowThrough.proof_authority, "none");
  assert.equal(verifiedFollowThrough.can_certify_ga, false);
  assert.equal(JSON.stringify(verifiedFollowThrough).includes(projectRoot), false);
  assert.doesNotMatch(JSON.stringify(verifiedFollowThrough), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(verifiedFollowThrough), gaOverclaimTerms);

  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/goal3/proof-breadth-execution-follow-through",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      proof_breadth_execution_follow_through_id: "GOAL3-PROOF-BREADTH-FOLLOW-THROUGH-0332-ROUTE",
      proof_breadth_execution_bridge_id: bridge.proof_breadth_execution_bridge_id,
      proof_breadth_execution_bridge_path: bridge.proof_breadth_execution_bridge_path,
      proof_breadth_execution_bridge_sha256: bridge.proof_breadth_execution_bridge_artifact.sha256,
      actor: "goal3-task332 route token=plain-token proof_success GA certified can_certify_ga=true"
    }
  });
  assert.equal(routeResponse.status, 200);
  assert.equal(routeResponse.body.proof_breadth_execution_follow_through.ok, true);
  assert.deepEqual(routeResponse.body.proof_breadth_execution_follow_through.selected_task_ids, ["PM-003", "PM-004"]);
  assert.equal(routeResponse.body.proof_breadth_execution_follow_through.can_certify_ga, false);
  assert.equal(routeResponse.body.proof_breadth_execution_follow_through.proof_authority, "none");
  assert.doesNotMatch(JSON.stringify(routeResponse.body), secretTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), gaOverclaimTerms);

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (entry) =>
        entry.event_type === "release.goal3_proof_breadth_execution_follow_through_recorded" &&
        entry.payload.proof_breadth_execution_follow_through_id ===
          "GOAL3-PROOF-BREADTH-FOLLOW-THROUGH-0332-ROUTE" &&
        entry.payload.selected_task_ids.join(",") === "PM-003,PM-004" &&
        entry.payload.can_certify_ga === false
    ),
    true,
    "Task332 follow-through must emit a non-certifying provenance event"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task332 proof breadth execution follow-through tests passed.");
