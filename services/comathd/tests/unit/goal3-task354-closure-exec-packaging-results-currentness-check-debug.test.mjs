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
  "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through",
  "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up",
  "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_check_debug",
  "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_follow_through",
  "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_follow_up",
  "goal3_release_candidate_proof_breadth_selected_tranche_next_packaging_results_follow_up",
  "goal3_release_candidate_proof_breadth_selected_tranche_packaging_results_follow_up",
  "goal3_release_candidate_proof_breadth_closure_gate",
  "goal3_final_ga_audit_gate",
  "goal3_ga_certificate_gate"
]) {
  assert.equal(
    status.capabilities.includes(capability),
    true,
    `Task354 closure execution packaging results currentness check-debug must keep capability advertised: ${capability}`
  );
}

const smoke = repoFile("scripts/phase0-smoke.mjs");
for (const suite of [
  "goal3-task351-selected-tranche-next-closure-results-to-execution-check-debug.test.mjs",
  "goal3-task352-closure-exec-packaging-follow-through.test.mjs",
  "goal3-task353-closure-exec-packaging-results-follow-up.test.mjs",
  "goal3-task354-closure-exec-packaging-results-currentness-check-debug.test.mjs",
  "goal3-task346-selected-tranche-next-closure-packaging-follow-through.test.mjs",
  "goal3-task347-selected-tranche-next-closure-packaging-results-follow-up.test.mjs",
  "goal3-task341-selected-tranche-next-packaging-results-follow-up.test.mjs",
  "goal3-task335-selected-tranche-packaging-results-follow-up.test.mjs",
  "goal3-task300-proof-breadth-closure-verifier.test.mjs",
  "goal3-task301-final-ga-audit-proof-breadth-closure-binding.test.mjs",
  "goal3-task303-service-owned-ga-certificate-gate.test.mjs"
]) {
  assert.equal(
    smoke.includes(suite),
    true,
    `phase0 smoke must discover selected-tranche closure execution packaging results suite ${suite}`
  );
}

const defaultRunner = repoFile("services/comathd/scripts/run-default-tests.mjs");
assert.equal(
  defaultRunner.includes("tests/unit/goal3-task354-closure-exec-packaging-results-currentness-check-debug.test.mjs"),
  false,
  "Task354 must be discovered by the default comathd runner, not special-cased or skipped"
);

const indexSource = repoFile("services/comathd/src/index.ts");
for (const pattern of [
  /goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-follow-through\.js/s,
  /goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-follow-up\.js/s,
  /goal3-proof-breadth-selected-tranche-next-closure-packaging-follow-through\.js/s,
  /goal3-proof-breadth-selected-tranche-next-closure-packaging-results-follow-up\.js/s,
  /goal3-proof-breadth-selected-tranche-next-packaging-results-follow-up\.js/s,
  /goal3-proof-breadth-selected-tranche-packaging-results-follow-up\.js/s,
  /goal3-proof-breadth-closure\.js/s,
  /goal3-final-ga-audit\.js/s,
  /goal3-ga-certificate\.js/s
]) {
  assert.match(indexSource, pattern, "Task354 must keep adjacent selected-tranche and authority modules exported");
}

const apiServerSource = repoFile("services/comathd/src/api/server.ts");
for (const pattern of [
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingFollowThrough/s,
  /POST \/release\/goal3\/selected-tranche-next-closure-packaging-results-closure-execution-packaging-follow-through/s,
  /selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsFollowUp/s,
  /POST \/release\/goal3\/selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-follow-up/s,
  /selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsFollowUp/s,
  /POST \/release\/goal3\/selected-tranche-next-closure-packaging-results-follow-up/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUp/s,
  /POST \/release\/goal3\/selected-tranche-next-packaging-results-follow-up/s,
  /recordGoal3ReleaseCandidateProofBreadthClosure/s,
  /POST \/release\/goal3\/proof-breadth-closure/s,
  /recordGoal3FinalGaAudit/s,
  /POST \/release\/goal3\/final-ga-audit/s,
  /recordGoal3GaCertificate/s,
  /POST \/release\/goal3\/ga-certificate/s
]) {
  assert.match(apiServerSource, pattern, "Task354 must keep Task352/353/347/341/300/301/303 routes wired");
}

const task352Source = repoFile(
  "services/comathd/src/release/goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-follow-through.ts"
);
for (const pattern of [
  /readTask350Artifact/s,
  /assertTask350InputPath/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingFollowThrough/s,
  /GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_FOLLOW_THROUGH_STALE_TASK350/s,
  /GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_FOLLOW_THROUGH_INVALID_TASK350/s,
  /GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_FOLLOW_THROUGH_TASK350_DELEGATED_MISMATCH/s,
  /delegated_selected_tranche_next_closure_execution_bridge_id:/s,
  /delegated_selected_tranche_next_execution_bridge_id:/s,
  /selected_tranche_next_closure_packaging_follow_through_id:/s,
  /selected_tranche_next_packaging_follow_through_id:/s,
  /task_local_packaging_follow_through_id:/s,
  /caller_proof_or_ga_authority_material_ignored/s,
  /proof_breadth_complete: false/s,
  /final_ga_audit_unblocked: false/s,
  /runs_lean: false/s,
  /executes_proofs: false/s,
  /accepts_caller_success_metadata: false/s,
  /accepts_caller_proof_material: false/s,
  /proof_authority: "none"/s,
  /can_promote_claim: false/s,
  /can_certify_ga: false/s,
  /ga_certification_gate_separate: true/s,
  /release\.goal3_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_recorded/s
]) {
  assert.match(task352Source, pattern, "Task354 must keep Task352 Task350-bound, Task346/340/334-delegating, and non-authoritative");
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
    task352Source,
    forbiddenPattern,
    "Task354 must keep Task352 from running Lean, calling Task326/334/338/340 producers directly, or writing closure/final-audit/certificate artifacts"
  );
}
assert.equal(
  (task352Source.match(/writeFileSync\(/g) ?? []).length,
  1,
  "Task354 must keep Task352 to one direct runtime write: its own append-only follow-through artifact"
);

const task353Source = repoFile(
  "services/comathd/src/release/goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-follow-up.ts"
);
for (const pattern of [
  /readTask352Artifact/s,
  /assertTask352InputPath/s,
  /assertCurrentArtifactReference/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsFollowUp/s,
  /artifactForDelegatedTask347/s,
  /GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_FOLLOW_UP_STALE_TASK352/s,
  /GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_FOLLOW_UP_INVALID_TASK352/s,
  /delegated_selected_tranche_next_closure_packaging_results_follow_up_id:/s,
  /selected_tranche_next_packaging_results_follow_up_id:/s,
  /proof_breadth_execution_follow_through_id:/s,
  /selected_packaging_report_artifacts_current: true/s,
  /ready_for_proof_breadth_closure_recheck:/s,
  /caller_proof_or_ga_authority_material_ignored/s,
  /proof_breadth_complete: false/s,
  /final_ga_audit_unblocked: false/s,
  /runs_lean: false/s,
  /executes_proofs: false/s,
  /accepts_caller_success_metadata: false/s,
  /accepts_caller_proof_material: false/s,
  /proof_authority: "none"/s,
  /can_promote_claim: false/s,
  /can_certify_ga: false/s,
  /ga_certification_gate_separate: true/s,
  /release\.goal3_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_recorded/s
]) {
  assert.match(task353Source, pattern, "Task354 must keep Task353 Task352-bound, Task347/341/335-delegating, and non-authoritative");
}

for (const forbiddenPattern of [
  /from "\.\/goal3-proof-breadth-execution-bridge\.js"/s,
  /recordGoal3ReleaseCandidateProofBreadthExecutionBridge\(/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureExecutionBridge/s,
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
    task353Source,
    forbiddenPattern,
    "Task354 must keep Task353 from running Lean, calling producer paths directly, or fabricating closure/final-audit/certificate authority"
  );
}
assert.equal(
  (task353Source.match(/writeFileSync\(/g) ?? []).length,
  1,
  "Task354 must keep Task353 to one direct runtime write: its own append-only follow-up artifact"
);

const task347Source = repoFile(
  "services/comathd/src/release/goal3-proof-breadth-selected-tranche-next-closure-packaging-results-follow-up.ts"
);
for (const pattern of [
  /readTask346Artifact/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUp/s,
  /selectedTrancheNextClosurePackagingResultsTask341RecheckId/s,
  /selected_packaging_report_artifacts_current: true/s,
  /proof_authority: "none"/s,
  /can_certify_ga: false/s
]) {
  assert.match(task347Source, pattern, "Task354 must keep Task347 as the selected-tranche closure packaging-results currentness layer");
}

const task341Source = repoFile("services/comathd/src/release/goal3-proof-breadth-selected-tranche-next-packaging-results-follow-up.ts");
for (const pattern of [
  /readTask340Artifact/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp/s,
  /selected_packaging_report_artifacts_current: true/s,
  /proof_breadth_complete: false/s,
  /proof_authority: "none"/s,
  /can_certify_ga: false/s
]) {
  assert.match(task341Source, pattern, "Task354 must keep Task341 currentness semantics intact");
}

const task335Source = repoFile("services/comathd/src/release/goal3-proof-breadth-selected-tranche-packaging-results-follow-up.ts");
for (const pattern of [
  /assertSelectedPackagingReportsCurrent/s,
  /GOAL3_SELECTED_TRANCHE_PACKAGING_RESULTS_FOLLOW_UP_STALE_PACKAGING_REPORT/s,
  /selected_packaging_report_artifacts_current: true/s,
  /proof_authority: "none"/s,
  /can_certify_ga: false/s
]) {
  assert.match(task335Source, pattern, "Task354 must keep Task335 selected-report currentness guards intact");
}

const closureSource = repoFile("services/comathd/src/release/goal3-proof-breadth-closure.ts");
for (const pattern of [
  /createGoal3GaPositiveTaskManifest/s,
  /proof_authority: complete \? "lean_kernel_clean_replay" : "none"/s,
  /final_ga_audit_unblocked: complete/s,
  /can_promote_claim: false/s,
  /can_certify_ga: false/s
]) {
  assert.match(closureSource, pattern, "Task354 must keep Task300 as the aggregate proof-breadth closure verifier");
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
  assert.match(finalAuditSource, pattern, "Task354 must keep Task301 as final-audit proof-breadth binding authority");
}

const certificateSource = repoFile("services/comathd/src/release/goal3-ga-certificate.ts");
for (const pattern of [
  /recordGoal3GaCertificate/s,
  /assertReadyCertificationReview/s,
  /claim_promotion_requires_ordinary_gate/s
]) {
  assert.match(certificateSource, pattern, "Task354 must keep Task303 certificate issuance isolated");
}

const piSource = repoFile("extensions/comath-pi/src/index.ts");
const piRuntimeRegistration = repoFile("extensions/comath-pi/src/runtime-registration.ts");
for (const forbiddenPattern of [
  /selected-tranche-next-closure-packaging-results-closure-execution-packaging-follow-through/s,
  /selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-follow-up/s,
  /selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through/s,
  /selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up/s,
  /goal3SelectedTrancheNextClosurePackagingResultsClosureExecutionPackaging/s
]) {
  assert.doesNotMatch(piSource, forbiddenPattern, "Task354 must keep Task352/353 service-only with no Pi tool surface");
  assert.doesNotMatch(
    piRuntimeRegistration,
    forbiddenPattern,
    "Task354 must keep Task352/353 service-only with no Pi runtime subcommand"
  );
}

for (const [path, pattern] of [
  ["README.md", /Task354.*selected-tranche.*closure execution packaging results.*check-debug/s],
  ["TODO.md", /Task354.*selected-tranche.*closure execution packaging results.*check-debug/s],
  ["REVIEW.md", /Goal 3 Task 354/s],
  ["AGENTS.md", /Task354.*selected-tranche.*closure execution packaging results.*check-debug/s],
  ["docs/architecture/ga-release-criteria.md", /Task354.*selected-tranche.*closure execution packaging results.*check-debug/s],
  ["docs/architecture/threat-model.md", /Task354.*selected-tranche.*closure execution packaging results.*check-debug/s],
  ["docs/architecture/acceptance-matrix.md", /Task354.*selected-tranche.*closure execution packaging results.*check-debug/s],
  ["docs/progress/goal-3-ga-gap-matrix.md", /Task354.*selected-tranche.*closure execution packaging results.*check-debug/s],
  ["goal-3/tasks.md", /Task354.*selected-tranche.*closure execution packaging results.*check-debug/s]
]) {
  assert.match(repoFile(path), pattern, `${path} must document Task354 selected-tranche closure execution packaging results currentness check-debug`);
}

console.log("Goal 3 Task354 selected-tranche closure execution packaging results currentness check-debug tests passed.");
