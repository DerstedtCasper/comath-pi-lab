import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getComathdStatus } from "../../dist/index.js";

function repoFile(relativePath) {
  const here = dirname(fileURLToPath(import.meta.url));
  return readFileSync(join(here, "../../../..", relativePath), "utf8");
}

const status = getComathdStatus();
for (const capability of [
  "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_recheck",
  "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_bridge",
  "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_bridge_check_debug",
  "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_execution_bridge",
  "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_execution_bridge_check_debug",
  "goal3_release_candidate_proof_breadth_selected_tranche_next_execution_bridge",
  "goal3_release_candidate_proof_breadth_execution_bridge",
  "goal3_release_candidate_proof_breadth_closure_gate",
  "goal3_final_ga_audit_gate",
  "goal3_ga_certificate_gate"
]) {
  assert.equal(
    status.capabilities.includes(capability),
    true,
    `Task351 selected-tranche next closure results-to-execution check-debug must keep capability advertised: ${capability}`
  );
}

const smoke = repoFile("scripts/phase0-smoke.mjs");
for (const suite of [
  "goal3-task348-selected-tranche-next-closure-packaging-currentness-check-debug.test.mjs",
  "goal3-task349-selected-tranche-next-closure-packaging-results-closure-recheck.test.mjs",
  "goal3-task350-selected-tranche-next-closure-packaging-results-closure-execution-bridge.test.mjs",
  "goal3-task351-selected-tranche-next-closure-results-to-execution-check-debug.test.mjs",
  "goal3-task344-selected-tranche-next-closure-execution-bridge.test.mjs",
  "goal3-task338-selected-tranche-next-execution-bridge.test.mjs",
  "goal3-task326-proof-breadth-execution-bridge.test.mjs",
  "goal3-task300-proof-breadth-closure-verifier.test.mjs",
  "goal3-task301-final-ga-audit-proof-breadth-closure-binding.test.mjs",
  "goal3-task303-service-owned-ga-certificate-gate.test.mjs"
]) {
  assert.equal(
    smoke.includes(suite),
    true,
    `phase0 smoke must discover selected-tranche closure results-to-execution suite ${suite}`
  );
}

const defaultRunner = repoFile("services/comathd/scripts/run-default-tests.mjs");
assert.equal(
  defaultRunner.includes("tests/unit/goal3-task351-selected-tranche-next-closure-results-to-execution-check-debug.test.mjs"),
  false,
  "Task351 must be discovered by the default comathd runner, not special-cased or skipped"
);

const indexSource = repoFile("services/comathd/src/index.ts");
for (const pattern of [
  /goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-recheck\.js/s,
  /goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-bridge\.js/s,
  /goal3-proof-breadth-selected-tranche-next-closure-execution-bridge\.js/s,
  /goal3-proof-breadth-selected-tranche-next-execution-bridge\.js/s,
  /goal3-proof-breadth-execution-bridge\.js/s,
  /goal3-proof-breadth-closure\.js/s,
  /goal3-final-ga-audit\.js/s,
  /goal3-ga-certificate\.js/s
]) {
  assert.match(indexSource, pattern, "Task351 must keep adjacent release modules exported");
}

const apiServerSource = repoFile("services/comathd/src/api/server.ts");
for (const pattern of [
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureRecheck/s,
  /POST \/release\/goal3\/selected-tranche-next-closure-packaging-results-closure-recheck/s,
  /selected_tranche_next_closure_packaging_results_closure_recheck/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionBridge/s,
  /POST \/release\/goal3\/selected-tranche-next-closure-packaging-results-closure-execution-bridge/s,
  /selected_tranche_next_closure_packaging_results_closure_execution_bridge/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureExecutionBridge/s,
  /POST \/release\/goal3\/selected-tranche-next-closure-execution-bridge/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge/s,
  /POST \/release\/goal3\/selected-tranche-next-execution-bridge/s,
  /recordGoal3ReleaseCandidateProofBreadthExecutionBridge/s,
  /POST \/release\/goal3\/proof-breadth-execution-bridge/s,
  /recordGoal3ReleaseCandidateProofBreadthClosure/s,
  /POST \/release\/goal3\/proof-breadth-closure/s,
  /recordGoal3FinalGaAudit/s,
  /POST \/release\/goal3\/final-ga-audit/s,
  /recordGoal3GaCertificate/s,
  /POST \/release\/goal3\/ga-certificate/s
]) {
  assert.match(apiServerSource, pattern, "Task351 must keep Task349/350/344/338/326/300/301/303 routes wired");
}

const task349Source = repoFile(
  "services/comathd/src/release/goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-recheck.ts"
);
for (const pattern of [
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureRecheck/s,
  /assertTask347Path/s,
  /readTask347Artifact/s,
  /assertBoundCurrentArtifactReference/s,
  /GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_RECHECK_STALE_TASK347/s,
  /GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_RECHECK_INVALID_TASK347/s,
  /delegated_selected_tranche_next_closure_recheck_id: delegated\.selected_tranche_next_closure_recheck_id/s,
  /proof_breadth_closure_id: delegated\.proof_breadth_closure_id/s,
  /caller_proof_or_ga_authority_material_ignored/s,
  /selected_packaging_report_artifacts_current: true/s,
  /proof_breadth_complete: delegated\.proof_breadth_complete/s,
  /final_ga_audit_unblocked: delegated\.final_ga_audit_unblocked/s,
  /runs_lean: false/s,
  /executes_proofs: false/s,
  /accepts_caller_success_metadata: false/s,
  /accepts_caller_proof_material: false/s,
  /proof_authority: "none"/s,
  /can_promote_claim: false/s,
  /can_certify_ga: false/s,
  /ga_certification_gate_separate: true/s,
  /release\.goal3_selected_tranche_next_closure_packaging_results_closure_recheck_recorded/s
]) {
  assert.match(task349Source, pattern, "Task351 must keep Task349 Task347-bound, Task343/300-delegating, and non-authoritative");
}

for (const forbiddenPattern of [
  /recordGoal3ReleaseCandidateProofBreadthExecutionBridge\(/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureExecutionBridge/s,
  /recordGoal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThrough/s,
  /recordGoal3FinalGaAudit/s,
  /recordGoal3GaCertificate/s,
  /packageGoal3GaPositiveMatrixFinalAuthorityEvidenceFromEvidenceV3/s,
  /executeGoal3GaPositiveMatrixLeanAuthorityReplay/s,
  /LeanRunner/s,
  /spawnSync/s,
  /execFile/s,
  /exec\(/s,
  /child_process/s,
  /final_ga_audit_id/s,
  /ga_certificate_id/s
]) {
  assert.doesNotMatch(
    task349Source,
    forbiddenPattern,
    "Task351 must keep Task349 from running Lean, calling Task326/338/344 directly, writing final-audit/certificate artifacts, or fabricating authority"
  );
}
assert.equal(
  (task349Source.match(/writeFileSync\(/g) ?? []).length,
  1,
  "Task351 must keep Task349 to one direct runtime write: its own append-only recheck artifact"
);

const task350Source = repoFile(
  "services/comathd/src/release/goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-bridge.ts"
);
for (const pattern of [
  /readTask349/s,
  /assertTask349InputPath/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureExecutionBridge/s,
  /GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_BRIDGE_STALE_TASK349/s,
  /GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_BRIDGE_INVALID_TASK349/s,
  /delegated_selected_tranche_next_closure_execution_bridge_id:/s,
  /delegated_selected_tranche_next_execution_bridge_id:/s,
  /next_proof_breadth_execution_bridge_id: delegated\.next_proof_breadth_execution_bridge_id/s,
  /caller_proof_or_ga_authority_material_ignored/s,
  /proof_breadth_complete: delegated\.proof_breadth_complete/s,
  /final_ga_audit_unblocked: delegated\.final_ga_audit_unblocked/s,
  /runs_lean: false/s,
  /executes_proofs: false/s,
  /accepts_caller_success_metadata: false/s,
  /accepts_caller_proof_material: false/s,
  /proof_authority: "none"/s,
  /can_promote_claim: false/s,
  /can_certify_ga: false/s,
  /ga_certification_gate_separate: true/s,
  /release\.goal3_selected_tranche_next_closure_packaging_results_closure_execution_bridge_recorded/s
]) {
  assert.match(task350Source, pattern, "Task351 must keep Task350 Task349-bound, Task344/338-delegating, and non-authoritative");
}

for (const forbiddenPattern of [
  /from "\.\/goal3-proof-breadth-execution-bridge\.js"/s,
  /recordGoal3ReleaseCandidateProofBreadthExecutionBridge\(/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge/s,
  /recordGoal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThrough/s,
  /recordGoal3ReleaseCandidateProofBreadthClosure\(/s,
  /recordGoal3FinalGaAudit/s,
  /recordGoal3GaCertificate/s,
  /packageGoal3GaPositiveMatrixFinalAuthorityEvidenceFromEvidenceV3/s,
  /executeGoal3GaPositiveMatrixLeanAuthorityReplay/s,
  /LeanRunner/s,
  /spawnSync/s,
  /execFile/s,
  /exec\(/s,
  /child_process/s,
  /proof_breadth_closure_id/s,
  /final_ga_audit_id/s,
  /ga_certificate_id/s
]) {
  assert.doesNotMatch(
    task350Source,
    forbiddenPattern,
    "Task351 must keep Task350 from running Lean, calling Task326/338/300/301/303 directly, or fabricating certificates"
  );
}
assert.equal(
  (task350Source.match(/writeFileSync\(/g) ?? []).length,
  1,
  "Task351 must keep Task350 to one direct runtime write: its own append-only bridge artifact"
);

const task344Source = repoFile("services/comathd/src/release/goal3-proof-breadth-selected-tranche-next-closure-execution-bridge.ts");
for (const pattern of [
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge/s,
  /assertTask343Artifact/s,
  /proof_breadth_complete: delegatedBridge\.proof_breadth_complete/s,
  /final_ga_audit_unblocked: delegatedBridge\.final_ga_audit_unblocked/s,
  /proof_authority: "none"/s,
  /can_certify_ga: false/s
]) {
  assert.match(task344Source, pattern, "Task351 must keep Task344 as the closure execution bridge semantics");
}

const task338Source = repoFile("services/comathd/src/release/goal3-proof-breadth-selected-tranche-next-execution-bridge.ts");
for (const pattern of [
  /recordGoal3ReleaseCandidateProofBreadthExecutionBridge/s,
  /assertRecheckArtifact/s,
  /assertClosureArtifact/s,
  /assertCompletedReportsCurrent/s,
  /task301_final_ga_audit_binding_required/s,
  /proof_authority: "none"/s,
  /can_certify_ga: false/s
]) {
  assert.match(task338Source, pattern, "Task351 must keep Task338 as the currentness-checked Task326 delegation layer");
}

const task326Source = repoFile("services/comathd/src/release/goal3-proof-breadth-execution-bridge.ts");
for (const pattern of [
  /executor_contract: "task_local_lean_authority_v3_packaging"/s,
  /proof_breadth_complete: false/s,
  /final_ga_audit_unblocked: false/s,
  /proof_authority: "none"/s,
  /can_certify_ga: false/s
]) {
  assert.match(task326Source, pattern, "Task351 must keep Task326 as bounded execution planning only");
}

const closureSource = repoFile("services/comathd/src/release/goal3-proof-breadth-closure.ts");
for (const pattern of [
  /createGoal3GaPositiveTaskManifest/s,
  /proof_authority: complete \? "lean_kernel_clean_replay" : "none"/s,
  /final_ga_audit_unblocked: complete/s,
  /can_promote_claim: false/s,
  /can_certify_ga: false/s
]) {
  assert.match(closureSource, pattern, "Task351 must keep Task300 as the aggregate proof-breadth closure verifier");
}

const finalAuditSource = repoFile("services/comathd/src/release/goal3-final-ga-audit.ts");
for (const pattern of [
  /optionalProofBreadthClosure/s,
  /assertProofBreadthClosure/s,
  /final_ga_audit_passed: proofBreadthClosureComplete/s,
  /ga_certificate_available: false/s,
  /can_promote_claim: false/s,
  /can_certify_ga: false/s
]) {
  assert.match(finalAuditSource, pattern, "Task351 must keep Task301 as final-audit proof-breadth binding authority");
}

const certificateSource = repoFile("services/comathd/src/release/goal3-ga-certificate.ts");
for (const pattern of [
  /recordGoal3GaCertificate/s,
  /assertReadyCertificationReview/s,
  /claim_promotion_requires_ordinary_gate/s
]) {
  assert.match(certificateSource, pattern, "Task351 must keep Task303 certificate issuance isolated");
}

const piSource = repoFile("extensions/comath-pi/src/index.ts");
const piRuntimeRegistration = repoFile("extensions/comath-pi/src/runtime-registration.ts");
for (const forbiddenPattern of [
  /selected-tranche-next-closure-packaging-results-closure-recheck/s,
  /selected-tranche-next-closure-packaging-results-closure-execution-bridge/s,
  /selected_tranche_next_closure_packaging_results_closure_recheck/s,
  /selected_tranche_next_closure_packaging_results_closure_execution_bridge/s,
  /goal3SelectedTrancheNextClosurePackagingResultsClosure/s
]) {
  assert.doesNotMatch(piSource, forbiddenPattern, "Task351 must keep Task349/350 service-only with no Pi tool surface");
  assert.doesNotMatch(piRuntimeRegistration, forbiddenPattern, "Task351 must keep Task349/350 service-only with no Pi runtime command");
}

for (const [path, pattern] of [
  ["README.md", /Task351.*selected-tranche.*next closure results-to-execution.*check-debug/s],
  ["TODO.md", /Task351.*selected-tranche.*next closure results-to-execution.*check-debug/s],
  ["REVIEW.md", /Goal 3 Task 351/s],
  ["AGENTS.md", /Task351.*selected-tranche.*next closure results-to-execution.*check-debug/s],
  ["docs/architecture/ga-release-criteria.md", /Task351.*selected-tranche.*next closure results-to-execution.*check-debug/s],
  ["docs/architecture/threat-model.md", /Task351.*selected-tranche.*next closure results-to-execution.*check-debug/s],
  ["docs/architecture/acceptance-matrix.md", /Task351.*selected-tranche.*next closure results-to-execution.*check-debug/s],
  ["docs/progress/goal-3-ga-gap-matrix.md", /Task351.*selected-tranche.*next closure results-to-execution.*check-debug/s]
]) {
  assert.match(repoFile(path), pattern, `${path} must document Task351 selected-tranche next closure results-to-execution check-debug`);
}

console.log("Goal 3 Task351 selected-tranche next closure results-to-execution check-debug tests passed.");
