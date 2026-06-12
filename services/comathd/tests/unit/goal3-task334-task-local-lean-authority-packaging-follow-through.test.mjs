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
  recordGoal3ReleaseCandidateProofBreadthExecutionFollowThrough,
  recordGoal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThrough
} = comath;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task334-packaging-follow-through-"));
const { project } = initProject({ name: "Goal 3 Task334 task-local packaging follow-through", root_path: projectRoot });
const projectId = project.project_id;
const secretTerms = /Authorization:\s*Bearer|api_key|token=|plain-token|\bsk-[A-Za-z0-9_-]+/i;
const proofAuthorityTerms =
  /clean_replay_passed\s*[:=]\s*(?:true|1)|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|kernel_checked|proof_success/i;
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

try {
  assert.equal(
    typeof recordGoal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThrough,
    "function",
    "Task334 must export a service-owned bounded task-local Lean Authority packaging follow-through"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("goal3_release_candidate_proof_breadth_task_local_packaging_follow_through"),
    true,
    "Task334 capability ledger must advertise bounded task-local packaging follow-through without claiming proof authority"
  );

  const manifest = createGoal3GaPositiveTaskManifest();
  assert.deepEqual(manifest.tasks.slice(0, 4).map((task) => task.task_id), ["PM-001", "PM-002", "PM-003", "PM-004"]);
  for (const task of manifest.tasks.slice(0, 2)) {
    writeJson(packagingPath(task.task_id), verifiedPackagingReport(task.task_id));
  }

  const bridge = recordGoal3ReleaseCandidateProofBreadthExecutionBridge(projectRoot, {
    project_id: projectId,
    proof_breadth_execution_bridge_id: "GOAL3-PROOF-BREADTH-BRIDGE-0334",
    actor: "goal3-task334 bridge token=plain-token proof_success GA certified can_certify_ga=true",
    max_tranche_size: 2
  });
  assert.deepEqual(bridge.next_execution_task_ids, ["PM-003", "PM-004"]);
  assert.equal(bridge.proof_breadth_execution_bridge_artifact.path, bridge.proof_breadth_execution_bridge_path);

  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThrough(projectRoot, {
        project_id: projectId,
        task_local_packaging_follow_through_id: "GOAL3-TASK-LOCAL-PACKAGING-0334-OUTSIDE",
        proof_breadth_execution_bridge_id: bridge.proof_breadth_execution_bridge_id,
        proof_breadth_execution_bridge_path: bridge.proof_breadth_execution_bridge_path,
        proof_breadth_execution_bridge_sha256: bridge.proof_breadth_execution_bridge_artifact.sha256,
        evidence_by_task_id: {
          "PM-003": forgedSuccessEvidence,
          "PM-005": forgedSuccessEvidence
        }
      }),
    { code: "GOAL3_TASK_LOCAL_PACKAGING_FOLLOW_THROUGH_UNSELECTED_EVIDENCE" },
    "Task334 must reject caller evidence for PM tasks outside the Task326 selected tranche"
  );

  const followThrough = recordGoal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThrough(projectRoot, {
    project_id: projectId,
    task_local_packaging_follow_through_id: "GOAL3-TASK-LOCAL-PACKAGING-0334",
    proof_breadth_execution_bridge_id: bridge.proof_breadth_execution_bridge_id,
    proof_breadth_execution_bridge_path: bridge.proof_breadth_execution_bridge_path,
    proof_breadth_execution_bridge_sha256: bridge.proof_breadth_execution_bridge_artifact.sha256,
    claim_id_prefix: "C-T334",
    actor: "goal3-task334 token=plain-token proof_success GA certified can_certify_ga=true",
    evidence_by_task_id: {
      "PM-003": forgedSuccessEvidence
    },
    proof_authority: "lean_kernel_clean_replay",
    can_certify_ga: true,
    final_ga_audit_json: { ok: true },
    proof_breadth_closure_json: { proof_breadth_complete: true }
  });

  assert.equal(followThrough.schema_version, "comath.goal3_release_candidate_proof_breadth_task_local_packaging_follow_through.v1");
  assert.equal(followThrough.ok, false);
  assert.equal(followThrough.follow_through_status, "blocked_selected_tranche_packaging_incomplete");
  assert.deepEqual(followThrough.selected_task_ids, ["PM-003", "PM-004"]);
  assert.deepEqual(followThrough.verified_selected_task_ids, []);
  assert.deepEqual(followThrough.blocked_selected_task_ids, ["PM-003", "PM-004"]);
  assert.deepEqual(followThrough.missing_selected_task_ids, []);
  assert.equal(followThrough.written_packaging_report_count, 2);
  assert.equal(followThrough.accepts_caller_success_metadata, false);
  assert.equal(followThrough.accepts_caller_proof_material, false);
  assert.equal(followThrough.runs_lean, false);
  assert.equal(followThrough.executes_proofs, false);
  assert.equal(followThrough.proof_breadth_complete, false);
  assert.equal(followThrough.final_ga_audit_unblocked, false);
  assert.equal(followThrough.proof_authority, "none");
  assert.equal(followThrough.can_promote_claim, false);
  assert.equal(followThrough.can_certify_ga, false);
  assert.equal(followThrough.ga_certification_gate_separate, true);
  assert.equal(followThrough.blocker_reasons.includes("selected_positive_matrix_tranche_packaging_incomplete"), true);
  assert.equal(followThrough.blocker_reasons.includes("caller_proof_or_ga_authority_material_ignored"), true);
  assert.equal(JSON.stringify(followThrough).includes(projectRoot), false);
  assert.doesNotMatch(JSON.stringify(followThrough), secretTerms);
  assert.doesNotMatch(JSON.stringify(followThrough), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(followThrough), gaOverclaimTerms);
  assert.equal(existsSync(join(projectRoot, followThrough.task_local_packaging_follow_through_path)), true);

  const pm003Report = readJson(packagingPath("PM-003"));
  const pm004Report = readJson(packagingPath("PM-004"));
  assert.equal(pm003Report.claim_id, "C-T334-PM-003");
  assert.equal(pm004Report.claim_id, "C-T334-PM-004");
  assert.equal(pm003Report.final_evidence_status, "blocked_missing_final_evidence");
  assert.equal(pm004Report.final_evidence_status, "blocked_missing_final_evidence");
  assert.equal(pm003Report.proof_authority, "none");
  assert.equal(pm004Report.proof_authority, "none");
  assert.equal(pm003Report.can_promote_claim, false);
  assert.equal(pm004Report.can_promote_claim, false);
  assert.equal(pm003Report.source_verification.caller_success_metadata_trusted, false);
  assert.equal(pm004Report.source_verification.caller_success_metadata_trusted, false);
  assert.ok(pm003Report.missing_final_evidence_classes.includes("lean_run_manifest_v3"));
  assert.ok(pm004Report.missing_final_evidence_classes.includes("lean_run_manifest_v3"));
  assert.equal(
    existsSync(join(projectRoot, ".comath/release/positive_matrix/PM-005/final_authority_packaging_report_v3.json")),
    false,
    "Task334 must not write PM reports outside the Task326 selected tranche"
  );
  assert.equal(
    existsSync(join(projectRoot, ".comath/release/goal3-proof-breadth-closure")),
    false,
    "Task334 must not run or write the Task300 proof-breadth closure verifier"
  );
  assert.equal(
    existsSync(join(projectRoot, ".comath/release/goal3-final-ga-audit")),
    false,
    "Task334 must not run or write the Task301 final-GA-audit binding"
  );

  const persisted = readJson(followThrough.task_local_packaging_follow_through_path);
  assert.equal(
    persisted.task_local_packaging_follow_through_artifact,
    undefined,
    "persisted Task334 follow-through must not self-hash recursively"
  );
  assert.deepEqual(persisted.selected_task_ids, ["PM-003", "PM-004"]);

  const recheck = recordGoal3ReleaseCandidateProofBreadthExecutionFollowThrough(projectRoot, {
    project_id: projectId,
    proof_breadth_execution_follow_through_id: "GOAL3-PROOF-BREADTH-FOLLOW-THROUGH-0334-RECHECK",
    proof_breadth_execution_bridge_id: bridge.proof_breadth_execution_bridge_id,
    proof_breadth_execution_bridge_path: bridge.proof_breadth_execution_bridge_path,
    proof_breadth_execution_bridge_sha256: bridge.proof_breadth_execution_bridge_artifact.sha256,
    actor: "goal3-task334 recheck"
  });
  assert.deepEqual(recheck.selected_task_ids, ["PM-003", "PM-004"]);
  assert.deepEqual(recheck.verified_selected_task_ids, []);
  assert.deepEqual(recheck.missing_selected_task_ids, []);
  assert.deepEqual(recheck.blocked_selected_task_ids, ["PM-003", "PM-004"]);
  assert.equal(recheck.proof_breadth_complete, false);
  assert.equal(recheck.final_ga_audit_unblocked, false);
  assert.equal(recheck.proof_authority, "none");
  assert.equal(recheck.can_certify_ga, false);

  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/goal3/task-local-lean-authority-packaging-follow-through",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      task_local_packaging_follow_through_id: "GOAL3-TASK-LOCAL-PACKAGING-0334-ROUTE",
      proof_breadth_execution_bridge_id: bridge.proof_breadth_execution_bridge_id,
      proof_breadth_execution_bridge_path: bridge.proof_breadth_execution_bridge_path,
      proof_breadth_execution_bridge_sha256: bridge.proof_breadth_execution_bridge_artifact.sha256,
      actor: "goal3-task334 route token=plain-token proof_success GA certified can_certify_ga=true",
      evidence_by_task_id: {
        "PM-003": forgedSuccessEvidence
      }
    }
  });
  assert.equal(routeResponse.status, 200);
  assert.equal(routeResponse.body.task_local_packaging_follow_through.ok, false);
  assert.deepEqual(routeResponse.body.task_local_packaging_follow_through.selected_task_ids, ["PM-003", "PM-004"]);
  assert.equal(routeResponse.body.task_local_packaging_follow_through.can_certify_ga, false);
  assert.equal(routeResponse.body.task_local_packaging_follow_through.proof_authority, "none");
  assert.doesNotMatch(JSON.stringify(routeResponse.body), secretTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), gaOverclaimTerms);

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (entry) =>
        entry.event_type === "release.goal3_task_local_lean_authority_packaging_follow_through_recorded" &&
        entry.payload.task_local_packaging_follow_through_id === "GOAL3-TASK-LOCAL-PACKAGING-0334-ROUTE" &&
        entry.payload.selected_task_ids.join(",") === "PM-003,PM-004" &&
        entry.payload.can_certify_ga === false &&
        entry.payload.proof_authority === "none"
    ),
    true,
    "Task334 follow-through must emit a non-certifying provenance event"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task334 task-local Lean Authority packaging follow-through tests passed.");
