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
  recordGoal3ReleaseCandidateProofBreadthClosure
} = comath;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task300-proof-breadth-closure-"));
const { project } = initProject({ name: "Goal 3 Task300 proof breadth closure", root_path: projectRoot });
const projectId = project.project_id;
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
const secretTerms = /Authorization:\s*Bearer|api_key|token=|plain-token|\bsk-[A-Za-z0-9_-]+/i;
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
    body: value
  };
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

try {
  assert.equal(
    typeof recordGoal3ReleaseCandidateProofBreadthClosure,
    "function",
    "Task300 must export a service-owned proof-breadth closure verifier"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("goal3_release_candidate_proof_breadth_closure_gate"),
    true,
    "Task300 capability ledger must advertise proof-breadth closure without claiming GA certification"
  );

  const emptyClosure = recordGoal3ReleaseCandidateProofBreadthClosure(projectRoot, {
    project_id: projectId,
    proof_breadth_closure_id: "GOAL3-PROOF-BREADTH-CLOSURE-0300-EMPTY",
    actor: "goal3-task300 token=plain-token GA certified can_certify_ga=true"
  });
  assert.equal(emptyClosure.ok, false);
  assert.equal(emptyClosure.proof_breadth_complete, false);
  assert.equal(emptyClosure.final_ga_audit_unblocked, false);
  assert.equal(emptyClosure.total_required_tasks, 100);
  assert.equal(emptyClosure.verified_task_count, 0);
  assert.equal(emptyClosure.missing_task_count, 100);
  assert.equal(emptyClosure.blocked_task_count, 0);
  assert.equal(emptyClosure.proof_authority, "none");
  assert.equal(emptyClosure.can_promote_claim, false);
  assert.equal(emptyClosure.can_certify_ga, false);
  assert.equal(JSON.stringify(emptyClosure).includes(projectRoot), false);
  assert.doesNotMatch(JSON.stringify(emptyClosure), secretTerms);
  assert.doesNotMatch(JSON.stringify(emptyClosure), gaOverclaimTerms);

  const manifest = createGoal3GaPositiveTaskManifest();
  for (const task of manifest.tasks) {
    writeJson(packagingPath(task.task_id), verifiedPackagingReport(task.task_id));
  }

  const completeClosure = recordGoal3ReleaseCandidateProofBreadthClosure(projectRoot, {
    project_id: projectId,
    proof_breadth_closure_id: "GOAL3-PROOF-BREADTH-CLOSURE-0300-COMPLETE"
  });
  assert.equal(completeClosure.ok, true);
  assert.equal(completeClosure.proof_breadth_status, "complete_release_candidate_proof_breadth");
  assert.equal(completeClosure.proof_breadth_complete, true);
  assert.equal(completeClosure.final_ga_audit_unblocked, true);
  assert.equal(completeClosure.verified_task_count, 100);
  assert.equal(completeClosure.missing_task_count, 0);
  assert.equal(completeClosure.blocked_task_count, 0);
  assert.equal(completeClosure.packaging_report_artifacts.length, 100);
  assert.equal(completeClosure.proof_authority, "lean_kernel_clean_replay");
  assert.equal(completeClosure.can_promote_claim, false);
  assert.equal(completeClosure.can_certify_ga, false);
  assert.equal(completeClosure.ga_certification_gate_separate, true);
  assert.equal(existsSync(join(projectRoot, completeClosure.proof_breadth_closure_path)), true);

  const forgedPm050 = verifiedPackagingReport("PM-050");
  forgedPm050.proof_authority = "none";
  forgedPm050.final_evidence_status = "blocked_missing_final_evidence";
  forgedPm050.missing_final_evidence_classes = ["final_replay_manifest_v3"];
  writeJson(packagingPath("PM-050"), forgedPm050);
  const blockedClosure = recordGoal3ReleaseCandidateProofBreadthClosure(projectRoot, {
    project_id: projectId,
    proof_breadth_closure_id: "GOAL3-PROOF-BREADTH-CLOSURE-0300-BLOCKED"
  });
  assert.equal(blockedClosure.ok, false);
  assert.equal(blockedClosure.proof_breadth_complete, false);
  assert.equal(blockedClosure.final_ga_audit_unblocked, false);
  assert.equal(blockedClosure.verified_task_count, 99);
  assert.equal(blockedClosure.blocked_task_count, 1);
  assert.deepEqual(blockedClosure.blocked_task_ids, ["PM-050"]);
  assert.equal(blockedClosure.proof_authority, "none");

  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/goal3/proof-breadth-closure",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      proof_breadth_closure_id: "GOAL3-PROOF-BREADTH-CLOSURE-0300-ROUTE"
    }
  });
  assert.equal(routeResponse.status, 200);
  assert.equal(routeResponse.body.proof_breadth_closure.ok, false);
  assert.equal(routeResponse.body.proof_breadth_closure.can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), secretTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), gaOverclaimTerms);

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (entry) =>
        entry.event_type === "release.goal3_proof_breadth_closure_recorded" &&
        entry.payload.proof_breadth_closure_id === "GOAL3-PROOF-BREADTH-CLOSURE-0300-COMPLETE" &&
        entry.payload.verified_task_count === 100 &&
        entry.payload.can_certify_ga === false
    ),
    true,
    "Task300 proof-breadth closure must emit a non-certifying provenance audit event"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task300 proof breadth closure verifier tests passed.");
