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
  "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_execution_bridge",
  "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_execution_bridge_check_debug",
  "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_follow_through",
  "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_follow_up",
  "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_follow_up_check_debug",
  "goal3_release_candidate_proof_breadth_selected_tranche_next_packaging_follow_through",
  "goal3_release_candidate_proof_breadth_selected_tranche_next_packaging_results_follow_up",
  "goal3_release_candidate_proof_breadth_selected_tranche_packaging_results_follow_up",
  "goal3_release_candidate_proof_breadth_closure_gate",
  "goal3_final_ga_audit_gate",
  "goal3_ga_certificate_gate"
]) {
  assert.equal(
    status.capabilities.includes(capability),
    true,
    `Task348 selected-tranche next closure packaging/currentness check-debug must keep capability advertised: ${capability}`
  );
}

const smoke = repoFile("scripts/phase0-smoke.mjs");
for (const suite of [
  "goal3-task342-selected-tranche-next-packaging-currentness-check-debug.test.mjs",
  "goal3-task345-selected-tranche-next-closure-bridge-check-debug.test.mjs",
  "goal3-task346-selected-tranche-next-closure-packaging-follow-through.test.mjs",
  "goal3-task347-selected-tranche-next-closure-packaging-results-follow-up.test.mjs",
  "goal3-task348-selected-tranche-next-closure-packaging-currentness-check-debug.test.mjs",
  "goal3-task300-proof-breadth-closure-verifier.test.mjs",
  "goal3-task301-final-ga-audit-proof-breadth-closure-binding.test.mjs",
  "goal3-task303-service-owned-ga-certificate-gate.test.mjs"
]) {
  assert.equal(
    smoke.includes(suite),
    true,
    `phase0 smoke must discover selected-tranche next closure packaging/currentness suite ${suite}`
  );
}

const defaultRunner = repoFile("services/comathd/scripts/run-default-tests.mjs");
assert.equal(
  defaultRunner.includes("tests/unit/goal3-task348-selected-tranche-next-closure-packaging-currentness-check-debug.test.mjs"),
  false,
  "Task348 must be discovered by the default comathd runner, not special-cased or skipped"
);

const indexSource = repoFile("services/comathd/src/index.ts");
for (const pattern of [
  /goal3-proof-breadth-selected-tranche-next-closure-execution-bridge\.js/s,
  /goal3-proof-breadth-selected-tranche-next-closure-packaging-follow-through\.js/s,
  /goal3-proof-breadth-selected-tranche-next-closure-packaging-results-follow-up\.js/s,
  /goal3-proof-breadth-selected-tranche-next-packaging-follow-through\.js/s,
  /goal3-proof-breadth-selected-tranche-next-packaging-results-follow-up\.js/s,
  /goal3-proof-breadth-task-local-packaging-follow-through\.js/s,
  /goal3-proof-breadth-closure\.js/s,
  /goal3-final-ga-audit\.js/s,
  /goal3-ga-certificate\.js/s
]) {
  assert.match(indexSource, pattern, "Task348 must keep adjacent proof-breadth release modules exported");
}

const apiServerSource = repoFile("services/comathd/src/api/server.ts");
for (const pattern of [
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingFollowThrough/s,
  /POST \/release\/goal3\/selected-tranche-next-closure-packaging-follow-through/s,
  /selected_tranche_next_closure_packaging_follow_through/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsFollowUp/s,
  /POST \/release\/goal3\/selected-tranche-next-closure-packaging-results-follow-up/s,
  /selected_tranche_next_closure_packaging_results_follow_up/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThrough/s,
  /POST \/release\/goal3\/selected-tranche-next-packaging-follow-through/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUp/s,
  /POST \/release\/goal3\/selected-tranche-next-packaging-results-follow-up/s,
  /recordGoal3ReleaseCandidateProofBreadthClosure/s,
  /POST \/release\/goal3\/proof-breadth-closure/s,
  /recordGoal3FinalGaAudit/s,
  /POST \/release\/goal3\/final-ga-audit/s,
  /recordGoal3GaCertificate/s,
  /POST \/release\/goal3\/ga-certificate/s
]) {
  assert.match(apiServerSource, pattern, "Task348 must keep Task346/347/340/341/300/301/303 routes wired");
}

const task346Source = repoFile(
  "services/comathd/src/release/goal3-proof-breadth-selected-tranche-next-closure-packaging-follow-through.ts"
);
for (const pattern of [
  /readTask344Artifact/s,
  /readDelegatedTask338Artifact/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThrough/s,
  /assertTask344Path/s,
  /selectedTrancheNextClosureExecutionBridgePath/s,
  /selectedTrancheNextExecutionBridgePath/s,
  /GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_FOLLOW_THROUGH_STALE_TASK344/s,
  /GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_FOLLOW_THROUGH_STALE_TASK338/s,
  /GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_FOLLOW_THROUGH_DELEGATED_TASK338_MISMATCH/s,
  /assertNoUnselectedEvidence/s,
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
  /release\.goal3_selected_tranche_next_closure_packaging_follow_through_recorded/s
]) {
  assert.match(task346Source, pattern, "Task348 must keep Task346 Task344/338-bound and non-authoritative");
}

for (const forbiddenPattern of [
  /from "\.\/goal3-proof-breadth-execution-bridge\.js"/s,
  /recordGoal3ReleaseCandidateProofBreadthExecutionBridge\(/s,
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
    task346Source,
    forbiddenPattern,
    "Task348 must keep Task346 from running Lean, calling Task326/300/301/303 directly, or fabricating certificates"
  );
}
assert.equal(
  (task346Source.match(/writeFileSync\(/g) ?? []).length,
  1,
  "Task348 must keep Task346 to one direct runtime write: its own append-only follow-through artifact"
);

const task347Source = repoFile(
  "services/comathd/src/release/goal3-proof-breadth-selected-tranche-next-closure-packaging-results-follow-up.ts"
);
for (const pattern of [
  /readTask346Artifact/s,
  /assertTask344CurrentArtifactReference/s,
  /assertTask338CurrentArtifactReference/s,
  /assertCurrentArtifactReference/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUp/s,
  /selectedTrancheNextClosurePackagingResultsTask341RecheckId/s,
  /proof_breadth_execution_follow_through_id: selectedTrancheNextClosurePackagingResultsTask341RecheckId\(followUpId\)/s,
  /GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_FOLLOW_UP_STALE_TASK346/s,
  /GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_FOLLOW_UP_INVALID_TASK346/s,
  /caller_proof_or_ga_authority_material_ignored/s,
  /selected_packaging_report_artifacts_current: true/s,
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
  /release\.goal3_selected_tranche_next_closure_packaging_results_follow_up_recorded/s
]) {
  assert.match(task347Source, pattern, "Task348 must keep Task347 Task346/341-bound and non-authoritative");
}

for (const forbiddenPattern of [
  /from "\.\/goal3-proof-breadth-execution-bridge\.js"/s,
  /recordGoal3ReleaseCandidateProofBreadthExecutionBridge\(/s,
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
    task347Source,
    forbiddenPattern,
    "Task348 must keep Task347 from running Lean, calling Task326/334/300/301/303 directly, or fabricating certificates"
  );
}
assert.equal(
  (task347Source.match(/writeFileSync\(/g) ?? []).length,
  1,
  "Task348 must keep Task347 to one direct runtime write: its own append-only follow-up artifact"
);

const task341Source = repoFile("services/comathd/src/release/goal3-proof-breadth-selected-tranche-next-packaging-results-follow-up.ts");
for (const pattern of [
  /readTask340Artifact/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp/s,
  /proof_breadth_execution_follow_through_id/s,
  /selected_packaging_report_artifacts_current: true/s,
  /proof_breadth_complete: false/s,
  /proof_authority: "none"/s,
  /can_certify_ga: false/s
]) {
  assert.match(task341Source, pattern, "Task348 must keep Task341/335 currentness semantics intact");
}

const task335Source = repoFile("services/comathd/src/release/goal3-proof-breadth-selected-tranche-packaging-results-follow-up.ts");
for (const pattern of [
  /assertSelectedPackagingReportsCurrent/s,
  /GOAL3_SELECTED_TRANCHE_PACKAGING_RESULTS_FOLLOW_UP_STALE_PACKAGING_REPORT/s,
  /selected_packaging_report_artifacts_current: true/s,
  /proof_authority: "none"/s,
  /can_certify_ga: false/s
]) {
  assert.match(task335Source, pattern, "Task348 must keep Task335 selected-report currentness guards intact");
}

const closureSource = repoFile("services/comathd/src/release/goal3-proof-breadth-closure.ts");
for (const pattern of [
  /createGoal3GaPositiveTaskManifest/s,
  /proof_authority: complete \? "lean_kernel_clean_replay" : "none"/s,
  /final_ga_audit_unblocked: complete/s,
  /can_certify_ga: false/s
]) {
  assert.match(closureSource, pattern, "Task348 must keep Task300 as the aggregate proof-breadth closure verifier");
}

const finalAuditSource = repoFile("services/comathd/src/release/goal3-final-ga-audit.ts");
for (const pattern of [
  /optionalProofBreadthClosure/s,
  /assertProofBreadthClosure/s,
  /final_ga_audit_passed: proofBreadthClosureComplete/s,
  /ga_certificate_available: false/s,
  /can_certify_ga: false/s
]) {
  assert.match(finalAuditSource, pattern, "Task348 must keep Task301 as final-audit proof-breadth binding authority");
}

const certificateSource = repoFile("services/comathd/src/release/goal3-ga-certificate.ts");
for (const pattern of [
  /recordGoal3GaCertificate/s,
  /assertReadyCertificationReview/s,
  /ga_certificate_id/s,
  /claim_promotion_requires_ordinary_gate/s
]) {
  assert.match(certificateSource, pattern, "Task348 must keep GA certificate issuance isolated in Task303");
}

const piSource = repoFile("extensions/comath-pi/src/index.ts");
const piRuntimeRegistration = repoFile("extensions/comath-pi/src/runtime-registration.ts");
for (const forbiddenPattern of [
  /selected-tranche-next-closure-packaging-follow-through/s,
  /selected-tranche-next-closure-packaging-results-follow-up/s,
  /selected_tranche_next_closure_packaging_follow_through/s,
  /selected_tranche_next_closure_packaging_results_follow_up/s,
  /goal3SelectedTrancheNextClosurePackaging/s
]) {
  assert.doesNotMatch(piSource, forbiddenPattern, "Task348 must keep Task346/347 service-only with no Pi tool surface");
  assert.doesNotMatch(
    piRuntimeRegistration,
    forbiddenPattern,
    "Task348 must keep Task346/347 service-only with no Pi runtime subcommand"
  );
}

for (const [path, pattern] of [
  ["README.md", /Task348.*selected-tranche.*next closure packaging.*check-debug/s],
  ["TODO.md", /Task348.*selected-tranche.*next closure packaging.*check-debug/s],
  ["REVIEW.md", /Goal 3 Task 348/s],
  ["AGENTS.md", /Task348.*selected-tranche.*next closure packaging.*check-debug/s],
  ["docs/architecture/ga-release-criteria.md", /Task348.*selected-tranche.*next closure packaging.*check-debug/s],
  ["docs/architecture/threat-model.md", /Task348.*selected-tranche.*next closure packaging.*check-debug/s],
  ["docs/architecture/acceptance-matrix.md", /Task348.*selected-tranche.*next closure packaging.*check-debug/s],
  ["docs/progress/goal-3-ga-gap-matrix.md", /Task348.*selected-tranche.*next closure packaging.*check-debug/s]
]) {
  assert.match(repoFile(path), pattern, `${path} must document Task348 selected-tranche next closure packaging/currentness check-debug`);
}

console.log("Goal 3 Task348 selected-tranche next closure packaging/currentness check-debug tests passed.");
