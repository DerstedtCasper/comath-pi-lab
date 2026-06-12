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
  "goal3_release_candidate_proof_breadth_execution_follow_through",
  "goal3_release_candidate_proof_breadth_execution_follow_through_check_debug",
  "goal3_release_candidate_proof_breadth_task_local_packaging_follow_through",
  "goal3_release_candidate_proof_breadth_selected_tranche_packaging_results_follow_up",
  "goal3_release_candidate_proof_breadth_selected_tranche_packaging_results_follow_up_check_debug",
  "goal3_release_candidate_proof_breadth_closure_gate",
  "goal3_final_ga_audit_gate"
]) {
  assert.equal(
    status.capabilities.includes(capability),
    true,
    `Task336 selected-tranche packaging results check-debug must keep capability advertised: ${capability}`
  );
}

const smoke = repoFile("scripts/phase0-smoke.mjs");
for (const suite of [
  "goal3-task326-proof-breadth-execution-bridge.test.mjs",
  "goal3-task332-proof-breadth-execution-follow-through.test.mjs",
  "goal3-task333-proof-breadth-follow-through-check-debug.test.mjs",
  "goal3-task334-task-local-lean-authority-packaging-follow-through.test.mjs",
  "goal3-task335-selected-tranche-packaging-results-follow-up.test.mjs",
  "goal3-task336-selected-tranche-packaging-results-check-debug.test.mjs",
  "goal3-task300-proof-breadth-closure-verifier.test.mjs",
  "goal3-task301-final-ga-audit-proof-breadth-closure-binding.test.mjs"
]) {
  assert.equal(smoke.includes(suite), true, `phase0 smoke must discover selected-tranche packaging results suite ${suite}`);
}

const defaultRunner = repoFile("services/comathd/scripts/run-default-tests.mjs");
assert.equal(
  defaultRunner.includes("tests/unit/goal3-task336-selected-tranche-packaging-results-check-debug.test.mjs"),
  false,
  "Task336 must be discovered by the default comathd runner, not special-cased or skipped"
);

const indexSource = repoFile("services/comathd/src/index.ts");
assert.match(
  indexSource,
  /goal3-proof-breadth-selected-tranche-packaging-results-follow-up\.js/s,
  "Task336 must keep Task335 selected-tranche packaging results follow-up exported from the public service API"
);

const apiServerSource = repoFile("services/comathd/src/api/server.ts");
for (const pattern of [
  /recordGoal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp/s,
  /POST \/release\/goal3\/selected-tranche-packaging-results-follow-up/s,
  /selected_tranche_packaging_results_follow_up/s
]) {
  assert.match(apiServerSource, pattern, "Task336 must keep Task335 service route wired");
}

const task335Source = repoFile(
  "services/comathd/src/release/goal3-proof-breadth-selected-tranche-packaging-results-follow-up.ts"
);
for (const pattern of [
  /recordGoal3ReleaseCandidateProofBreadthExecutionFollowThrough/s,
  /selectedTranchePackagingResultsFollowUpPath/s,
  /proofBreadthExecutionBridgePath/s,
  /taskLocalPackagingFollowThroughPath/s,
  /assertBridgeArtifact/s,
  /assertTaskLocalPackagingArtifact/s,
  /assertTaskLocalMatchesBridge/s,
  /assertSelectedPackagingReportsCurrent/s,
  /GOAL3_SELECTED_TRANCHE_PACKAGING_RESULTS_FOLLOW_UP_STALE_BRIDGE/s,
  /GOAL3_SELECTED_TRANCHE_PACKAGING_RESULTS_FOLLOW_UP_STALE_TASK_LOCAL_PACKAGING/s,
  /GOAL3_SELECTED_TRANCHE_PACKAGING_RESULTS_FOLLOW_UP_TASK_LOCAL_MISMATCH/s,
  /GOAL3_SELECTED_TRANCHE_PACKAGING_RESULTS_FOLLOW_UP_STALE_PACKAGING_REPORT/s,
  /GOAL3_SELECTED_TRANCHE_PACKAGING_RESULTS_FOLLOW_UP_ALREADY_EXISTS/s,
  /taskLocal\.body\.proof_breadth_execution_bridge_artifact\.sha256 !== bridge\.artifact\.sha256/s,
  /bridgeSelectedTaskIds\.every\(\(taskId,\s*index\) => taskId === taskLocalSelectedTaskIds\[index\]\)/s,
  /finalAuthorityPackagingReportPath\(taskId\)/s,
  /current\.artifact\.sha256 !== artifact\.sha256/s,
  /proof_breadth_execution_follow_through: executionFollowThrough/s,
  /ready_for_proof_breadth_closure_recheck: executionFollowThrough\.ready_for_proof_breadth_closure_recheck/s,
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
  /caller_proof_or_ga_authority_material_ignored/s,
  /release\.goal3_selected_tranche_packaging_results_follow_up_recorded/s
]) {
  assert.match(
    task335Source,
    pattern,
    "Task336 must keep Task335 Task334-bound, selected-tranche-current, Task332-rechecked, and non-authoritative"
  );
}

for (const forbiddenPattern of [
  /packageGoal3GaPositiveMatrixFinalAuthorityEvidenceFromEvidenceV3/s,
  /packageGoal3GaPositiveMatrixFinalAuthorityEvidenceTrancheV3/s,
  /executeGoal3GaPositiveMatrixLeanAuthorityReplay/s,
  /LeanRunner/s,
  /spawnSync/s,
  /execFile/s,
  /exec\(/s,
  /child_process/s,
  /recordGoal3ReleaseCandidateProofBreadthClosure/s,
  /recordGoal3FinalGaAudit/s,
  /proof_breadth_closure_id/s,
  /final_ga_audit_id/s,
  /ga_certificate_id/s
]) {
  assert.doesNotMatch(
    task335Source,
    forbiddenPattern,
    "Task336 must keep Task335 from running proof executors, writing packaging reports, or invoking closure/final-audit authority"
  );
}
assert.equal(
  (task335Source.match(/writeFileSync\(/g) ?? []).length,
  1,
  "Task336 must keep Task335 to a single direct runtime write: its own append-only follow-up artifact"
);

const task335Suite = repoFile("services/comathd/tests/unit/goal3-task335-selected-tranche-packaging-results-follow-up.test.mjs");
for (const pattern of [
  /GOAL3_SELECTED_TRANCHE_PACKAGING_RESULTS_FOLLOW_UP_STALE_TASK_LOCAL_PACKAGING/s,
  /GOAL3_SELECTED_TRANCHE_PACKAGING_RESULTS_FOLLOW_UP_TASK_LOCAL_MISMATCH/s,
  /GOAL3_SELECTED_TRANCHE_PACKAGING_RESULTS_FOLLOW_UP_STALE_PACKAGING_REPORT/s,
  /writeText\(packagingPath\("PM-005"\),\s*"\{ malformed unselected report"/s,
  /proof_breadth_execution_follow_through\.ready_for_proof_breadth_closure_recheck,\s*false/s,
  /selected_packaging_report_artifacts_current,\s*true/s,
  /proof_breadth_complete,\s*false/s,
  /final_ga_audit_unblocked,\s*false/s,
  /runs_lean,\s*false/s,
  /executes_proofs,\s*false/s,
  /proof_authority,\s*"none"/s,
  /can_certify_ga,\s*false/s,
  /\/release\/goal3\/selected-tranche-packaging-results-follow-up/s,
  /release\.goal3_selected_tranche_packaging_results_follow_up_recorded/s
]) {
  assert.match(
    task335Suite,
    pattern,
    "Task336 must keep Task335 focused regression coverage for stale hashes, selected-only inspection, and no-authority output"
  );
}

const piSource = repoFile("extensions/comath-pi/src/index.ts");
const piRuntimeRegistration = repoFile("extensions/comath-pi/src/runtime-registration.ts");
for (const forbiddenPattern of [
  /goal3SelectedTranchePackagingResultsFollowUp/s,
  /selected-tranche-packaging-results-follow-up/s,
  /selected_tranche_packaging_results_follow_up/s
]) {
  assert.doesNotMatch(
    piSource,
    forbiddenPattern,
    "Task336 must keep Task335 service-only with no Pi tool surface"
  );
  assert.doesNotMatch(
    piRuntimeRegistration,
    forbiddenPattern,
    "Task336 must keep Task335 service-only with no Pi runtime subcommand"
  );
}

const task332Source = repoFile("services/comathd/src/release/goal3-proof-breadth-execution-follow-through.ts");
for (const pattern of [
  /readJsonArtifact<FinalAuthorityPackagingV3Report>\(\s*projectRoot,\s*bridgeTarget\.expected_packaging_report_path/s,
  /ready_for_proof_breadth_closure_recheck: selectedTrancheComplete/s,
  /proof_breadth_complete: false/s,
  /final_ga_audit_unblocked: false/s,
  /proof_authority: "none"/s,
  /can_certify_ga: false/s
]) {
  assert.match(
    task332Source,
    pattern,
    "Task336 must keep Task332 as the selected-tranche recheck witness reused by Task335"
  );
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
  assert.match(
    task334Source,
    pattern,
    "Task336 must keep Task334 as the selected-tranche packaging writer that Task335 rechecks"
  );
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
  assert.match(
    closureSource,
    pattern,
    "Task336 must keep Task300 as the only aggregate proof-breadth closure verifier"
  );
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
  assert.match(
    finalAuditSource,
    pattern,
    "Task336 must keep Task301 as the only final-audit binding for proof-breadth closure"
  );
}

for (const [path, pattern] of [
  ["README.md", /Task336.*selected-tranche.*packaging.*check-debug/s],
  ["TODO.md", /Task336.*selected-tranche.*packaging.*check-debug/s],
  ["REVIEW.md", /Goal 3 Task 336/s],
  ["AGENTS.md", /Task336.*selected-tranche.*packaging.*check-debug/s],
  ["docs/architecture/ga-release-criteria.md", /Task336.*selected-tranche.*packaging.*check-debug/s],
  ["docs/architecture/threat-model.md", /Task336.*selected-tranche.*packaging.*check-debug/s],
  ["docs/architecture/acceptance-matrix.md", /Task336.*selected-tranche.*packaging.*check-debug/s]
]) {
  assert.match(repoFile(path), pattern, `${path} must document Task336 selected-tranche packaging results check-debug`);
}

console.log("Goal 3 Task336 selected-tranche packaging results check-debug tests passed.");
