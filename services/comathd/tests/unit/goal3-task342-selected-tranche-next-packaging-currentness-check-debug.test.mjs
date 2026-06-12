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
  "goal3_release_candidate_proof_breadth_execution_bridge",
  "goal3_release_candidate_proof_breadth_task_local_packaging_follow_through",
  "goal3_release_candidate_proof_breadth_selected_tranche_packaging_results_follow_up",
  "goal3_release_candidate_proof_breadth_selected_tranche_packaging_results_follow_up_check_debug",
  "goal3_release_candidate_proof_breadth_selected_tranche_closure_recheck",
  "goal3_release_candidate_proof_breadth_selected_tranche_next_execution_bridge",
  "goal3_release_candidate_proof_breadth_selected_tranche_next_execution_bridge_check_debug",
  "goal3_release_candidate_proof_breadth_selected_tranche_next_packaging_follow_through",
  "goal3_release_candidate_proof_breadth_selected_tranche_next_packaging_results_follow_up",
  "goal3_release_candidate_proof_breadth_selected_tranche_next_packaging_results_follow_up_check_debug",
  "goal3_release_candidate_proof_breadth_closure_gate",
  "goal3_final_ga_audit_gate"
]) {
  assert.equal(
    status.capabilities.includes(capability),
    true,
    `Task342 selected-tranche next packaging/currentness check-debug must keep capability advertised: ${capability}`
  );
}

const smoke = repoFile("scripts/phase0-smoke.mjs");
for (const suite of [
  "goal3-task326-proof-breadth-execution-bridge.test.mjs",
  "goal3-task334-task-local-lean-authority-packaging-follow-through.test.mjs",
  "goal3-task335-selected-tranche-packaging-results-follow-up.test.mjs",
  "goal3-task336-selected-tranche-packaging-results-check-debug.test.mjs",
  "goal3-task337-selected-tranche-closure-recheck.test.mjs",
  "goal3-task338-selected-tranche-next-execution-bridge.test.mjs",
  "goal3-task339-selected-tranche-next-bridge-check-debug.test.mjs",
  "goal3-task340-selected-tranche-next-packaging-follow-through.test.mjs",
  "goal3-task341-selected-tranche-next-packaging-results-follow-up.test.mjs",
  "goal3-task342-selected-tranche-next-packaging-currentness-check-debug.test.mjs",
  "goal3-task300-proof-breadth-closure-verifier.test.mjs",
  "goal3-task301-final-ga-audit-proof-breadth-closure-binding.test.mjs"
]) {
  assert.equal(smoke.includes(suite), true, `phase0 smoke must discover selected-tranche next packaging/currentness suite ${suite}`);
}

const defaultRunner = repoFile("services/comathd/scripts/run-default-tests.mjs");
assert.equal(
  defaultRunner.includes("tests/unit/goal3-task342-selected-tranche-next-packaging-currentness-check-debug.test.mjs"),
  false,
  "Task342 must be discovered by the default comathd runner, not special-cased or skipped"
);

const indexSource = repoFile("services/comathd/src/index.ts");
for (const pattern of [
  /goal3-proof-breadth-selected-tranche-next-packaging-follow-through\.js/s,
  /goal3-proof-breadth-selected-tranche-next-packaging-results-follow-up\.js/s
]) {
  assert.match(
    indexSource,
    pattern,
    "Task342 must keep Task340/341 selected-tranche next packaging modules exported from the public service API"
  );
}

const apiServerSource = repoFile("services/comathd/src/api/server.ts");
for (const pattern of [
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThrough/s,
  /POST \/release\/goal3\/selected-tranche-next-packaging-follow-through/s,
  /selected_tranche_next_packaging_follow_through/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUp/s,
  /POST \/release\/goal3\/selected-tranche-next-packaging-results-follow-up/s,
  /selected_tranche_next_packaging_results_follow_up/s
]) {
  assert.match(apiServerSource, pattern, "Task342 must keep Task340/341 service routes wired");
}

const task340Source = repoFile(
  "services/comathd/src/release/goal3-proof-breadth-selected-tranche-next-packaging-follow-through.ts"
);
for (const pattern of [
  /recordGoal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThrough/s,
  /readTask338Artifact/s,
  /readDelegatedBridgeArtifact/s,
  /assertNoUnselectedEvidence/s,
  /selectedTrancheNextPackagingFollowThroughPath/s,
  /selectedTrancheNextExecutionBridgePath/s,
  /proofBreadthExecutionBridgePath/s,
  /GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_FOLLOW_THROUGH_STALE_TASK338/s,
  /GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_FOLLOW_THROUGH_STALE_DELEGATED_BRIDGE/s,
  /GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_FOLLOW_THROUGH_DELEGATED_BRIDGE_MISMATCH/s,
  /GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_FOLLOW_THROUGH_UNSELECTED_EVIDENCE/s,
  /GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_FOLLOW_THROUGH_NO_NEXT_BRIDGE/s,
  /task338\.body\.bridge_status !== "ready_for_next_selected_tranche_execution"/s,
  /task338\.body\.proof_breadth_complete !== false/s,
  /sameStringArray\(nextTaskIds,\s*delegatedTaskIds\)/s,
  /recordGoal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThrough\(projectRoot,\s*\{/s,
  /requested_follow_through_mode: "open_formal_workbench_release_candidate_task_local_lean_authority_packaging_follow_through"/s,
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
  /release\.goal3_selected_tranche_next_packaging_follow_through_recorded/s
]) {
  assert.match(
    task340Source,
    pattern,
    "Task342 must keep Task340 Task338-bound, delegated-Task326-current, Task334-delegating, and non-authoritative"
  );
}

for (const forbiddenPattern of [
  /recordGoal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingResultsFollowUp/s,
  /packageGoal3GaPositiveMatrixFinalAuthorityEvidenceFromEvidenceV3/s,
  /packageGoal3GaPositiveMatrixFinalAuthorityEvidenceTrancheV3/s,
  /executeGoal3GaPositiveMatrixLeanAuthorityReplay/s,
  /LeanRunner/s,
  /spawnSync/s,
  /execFile/s,
  /exec\(/s,
  /child_process/s,
  /recordGoal3ReleaseCandidateProofBreadthClosure\(/s,
  /recordGoal3FinalGaAudit/s,
  /proof_breadth_closure_id/s,
  /final_ga_audit_id/s,
  /ga_certificate_id/s
]) {
  assert.doesNotMatch(
    task340Source,
    forbiddenPattern,
    "Task342 must keep Task340 from running currentness wrappers, proof executors, closure/final-audit authority, or certificates"
  );
}
assert.equal(
  (task340Source.match(/writeFileSync\(/g) ?? []).length,
  1,
  "Task342 must keep Task340 to a single direct runtime write: its own append-only follow-through artifact"
);

const task340Suite = repoFile("services/comathd/tests/unit/goal3-task340-selected-tranche-next-packaging-follow-through.test.mjs");
for (const pattern of [
  /GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_FOLLOW_THROUGH_UNSELECTED_EVIDENCE/s,
  /GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_FOLLOW_THROUGH_STALE_TASK338/s,
  /GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_FOLLOW_THROUGH_STALE_DELEGATED_BRIDGE/s,
  /GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_FOLLOW_THROUGH_DELEGATED_BRIDGE_MISMATCH/s,
  /GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_FOLLOW_THROUGH_NO_NEXT_BRIDGE/s,
  /selected_tranche_next_packaging_follow_through_id: "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-0340-ROUTE"/s,
  /selected_task_ids,\s*\["PM-007",\s*"PM-008"\]/s,
  /Task340 must not run or write new Task300 proof-breadth closure artifacts/s,
  /Task340 must not run or write Task301 final-GA-audit artifacts/s,
  /runs_lean,\s*false/s,
  /executes_proofs,\s*false/s,
  /proof_authority,\s*"none"/s,
  /can_certify_ga,\s*false/s,
  /\/release\/goal3\/selected-tranche-next-packaging-follow-through/s,
  /release\.goal3_selected_tranche_next_packaging_follow_through_recorded/s
]) {
  assert.match(
    task340Suite,
    pattern,
    "Task342 must keep Task340 focused coverage for stale hashes, selected-only packaging, no Task300/301 writes, and no authority"
  );
}

const task341Source = repoFile(
  "services/comathd/src/release/goal3-proof-breadth-selected-tranche-next-packaging-results-follow-up.ts"
);
for (const pattern of [
  /recordGoal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp/s,
  /readTask340Artifact/s,
  /assertTask340Path/s,
  /selectedTrancheNextPackagingResultsFollowUpPath/s,
  /selectedTrancheNextPackagingFollowThroughPath/s,
  /GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_RESULTS_FOLLOW_UP_STALE_TASK340/s,
  /GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_RESULTS_FOLLOW_UP_INVALID_TASK340/s,
  /selected_tranche_packaging_results_follow_up_id: `\$\{followUpId\}-TASK335`/s,
  /proof_breadth_execution_bridge_id: task340\.body\.delegated_proof_breadth_execution_bridge_id/s,
  /task_local_packaging_follow_through_id: task340\.body\.task_local_packaging_follow_through_id/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp\(projectRoot,\s*task335Input\)/s,
  /caller_proof_or_ga_authority_material_ignored/s,
  /selected_packaging_report_artifacts_current: true/s,
  /ready_for_proof_breadth_closure_recheck: selectedTrancheFollowUp\.ready_for_proof_breadth_closure_recheck/s,
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
  /release\.goal3_selected_tranche_next_packaging_results_follow_up_recorded/s
]) {
  assert.match(
    task341Source,
    pattern,
    "Task342 must keep Task341 Task340-bound, Task335-reusing, selected-report-current, and non-authoritative"
  );
}

for (const forbiddenPattern of [
  /recordGoal3ReleaseCandidateProofBreadthExecutionFollowThrough/s,
  /recordGoal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThrough/s,
  /packageGoal3GaPositiveMatrixFinalAuthorityEvidenceFromEvidenceV3/s,
  /packageGoal3GaPositiveMatrixFinalAuthorityEvidenceTrancheV3/s,
  /executeGoal3GaPositiveMatrixLeanAuthorityReplay/s,
  /LeanRunner/s,
  /spawnSync/s,
  /execFile/s,
  /exec\(/s,
  /child_process/s,
  /recordGoal3ReleaseCandidateProofBreadthClosure\(/s,
  /recordGoal3FinalGaAudit/s,
  /proof_breadth_closure_id/s,
  /final_ga_audit_id/s,
  /ga_certificate_id/s
]) {
  assert.doesNotMatch(
    task341Source,
    forbiddenPattern,
    "Task342 must keep Task341 from running packaging, proof executors, closure/final-audit authority, or certificates"
  );
}
assert.equal(
  (task341Source.match(/writeFileSync\(/g) ?? []).length,
  1,
  "Task342 must keep Task341 to a single direct runtime write: its own append-only follow-up artifact"
);

const task341Suite = repoFile("services/comathd/tests/unit/goal3-task341-selected-tranche-next-packaging-results-follow-up.test.mjs");
for (const pattern of [
  /GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_RESULTS_FOLLOW_UP_STALE_TASK340/s,
  /GOAL3_SELECTED_TRANCHE_PACKAGING_RESULTS_FOLLOW_UP_STALE_BRIDGE/s,
  /GOAL3_SELECTED_TRANCHE_PACKAGING_RESULTS_FOLLOW_UP_STALE_TASK_LOCAL_PACKAGING/s,
  /GOAL3_SELECTED_TRANCHE_NEXT_PACKAGING_RESULTS_FOLLOW_UP_INVALID_TASK340/s,
  /GOAL3_SELECTED_TRANCHE_PACKAGING_RESULTS_FOLLOW_UP_STALE_PACKAGING_REPORT/s,
  /selected_tranche_next_packaging_results_follow_up_id: "GOAL3-SELECTED-TRANCHE-NEXT-PACKAGING-RESULTS-0341-ROUTE"/s,
  /selected_task_ids,\s*\["PM-007",\s*"PM-008"\]/s,
  /Task341 must not run or write new Task300 proof-breadth closure artifacts/s,
  /Task341 must not run or write Task301 final-GA-audit artifacts/s,
  /runs_lean,\s*false/s,
  /executes_proofs,\s*false/s,
  /proof_authority,\s*"none"/s,
  /can_certify_ga,\s*false/s,
  /\/release\/goal3\/selected-tranche-next-packaging-results-follow-up/s,
  /release\.goal3_selected_tranche_next_packaging_results_follow_up_recorded/s
]) {
  assert.match(
    task341Suite,
    pattern,
    "Task342 must keep Task341 focused coverage for stale Task340/delegated artifacts/report hashes and no-authority output"
  );
}

const piSource = repoFile("extensions/comath-pi/src/index.ts");
const piRuntimeRegistration = repoFile("extensions/comath-pi/src/runtime-registration.ts");
for (const forbiddenPattern of [
  /goal3SelectedTrancheNextPackagingFollowThrough/s,
  /goal3SelectedTrancheNextPackagingResultsFollowUp/s,
  /selected-tranche-next-packaging-follow-through/s,
  /selected-tranche-next-packaging-results-follow-up/s,
  /selected_tranche_next_packaging_follow_through/s,
  /selected_tranche_next_packaging_results_follow_up/s
]) {
  assert.doesNotMatch(piSource, forbiddenPattern, "Task342 must keep Task340/341 service-only with no Pi tool surface");
  assert.doesNotMatch(
    piRuntimeRegistration,
    forbiddenPattern,
    "Task342 must keep Task340/341 service-only with no Pi runtime subcommand"
  );
}

const task335Source = repoFile(
  "services/comathd/src/release/goal3-proof-breadth-selected-tranche-packaging-results-follow-up.ts"
);
for (const pattern of [
  /assertSelectedPackagingReportsCurrent/s,
  /GOAL3_SELECTED_TRANCHE_PACKAGING_RESULTS_FOLLOW_UP_STALE_BRIDGE/s,
  /GOAL3_SELECTED_TRANCHE_PACKAGING_RESULTS_FOLLOW_UP_STALE_TASK_LOCAL_PACKAGING/s,
  /GOAL3_SELECTED_TRANCHE_PACKAGING_RESULTS_FOLLOW_UP_STALE_PACKAGING_REPORT/s,
  /selected_packaging_report_artifacts_current: true/s,
  /proof_breadth_complete: false/s,
  /final_ga_audit_unblocked: false/s,
  /proof_authority: "none"/s,
  /can_certify_ga: false/s
]) {
  assert.match(task335Source, pattern, "Task342 must keep Task335 as the selected-tranche currentness witness reused by Task341");
}

const task334Source = repoFile("services/comathd/src/release/goal3-proof-breadth-task-local-packaging-follow-through.ts");
for (const pattern of [
  /assertNoUnselectedEvidence/s,
  /packageGoal3GaPositiveMatrixFinalAuthorityEvidenceFromEvidenceV3/s,
  /selected_packaging_report_artifacts: selectedPackagingReportArtifacts/s,
  /proof_breadth_complete: false/s,
  /final_ga_audit_unblocked: false/s,
  /proof_authority: "none"/s,
  /can_certify_ga: false/s
]) {
  assert.match(task334Source, pattern, "Task342 must keep Task334 as the task-local packaging writer delegated by Task340");
}

const task326Source = repoFile("services/comathd/src/release/goal3-proof-breadth-execution-bridge.ts");
for (const pattern of [
  /nextExecutionTargets\.length < maxTrancheSize/s,
  /executor_contract: "task_local_lean_authority_v3_packaging"/s,
  /proof_breadth_complete: false/s,
  /final_ga_audit_unblocked: false/s,
  /proof_authority: "none"/s,
  /can_certify_ga: false/s
]) {
  assert.match(task326Source, pattern, "Task342 must keep Task326 as bounded selected-tranche execution planning only");
}

const closureSource = repoFile("services/comathd/src/release/goal3-proof-breadth-closure.ts");
for (const pattern of [
  /createGoal3GaPositiveTaskManifest/s,
  /readJsonArtifact<FinalAuthorityPackagingV3Report>/s,
  /proof_authority: complete \? "lean_kernel_clean_replay" : "none"/s,
  /final_ga_audit_unblocked: complete/s,
  /can_promote_claim: false/s,
  /can_certify_ga: false/s
]) {
  assert.match(closureSource, pattern, "Task342 must keep Task300 as the only aggregate proof-breadth closure verifier");
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
  assert.match(finalAuditSource, pattern, "Task342 must keep Task301 as the only final-audit binding for proof-breadth closure");
}

for (const [path, pattern] of [
  ["README.md", /Task342.*selected-tranche.*next packaging.*check-debug/s],
  ["TODO.md", /Task342.*selected-tranche.*next packaging.*check-debug/s],
  ["REVIEW.md", /Goal 3 Task 342/s],
  ["AGENTS.md", /Task342.*selected-tranche.*next packaging.*check-debug/s],
  ["docs/architecture/ga-release-criteria.md", /Task342.*selected-tranche.*next packaging.*check-debug/s],
  ["docs/architecture/threat-model.md", /Task342.*selected-tranche.*next packaging.*check-debug/s],
  ["docs/architecture/acceptance-matrix.md", /Task342.*selected-tranche.*next packaging.*check-debug/s],
  ["docs/progress/goal-3-ga-gap-matrix.md", /Task342.*selected-tranche.*next packaging.*check-debug/s]
]) {
  assert.match(repoFile(path), pattern, `${path} must document Task342 selected-tranche next packaging/currentness check-debug`);
}

console.log("Goal 3 Task342 selected-tranche next packaging/currentness check-debug tests passed.");
