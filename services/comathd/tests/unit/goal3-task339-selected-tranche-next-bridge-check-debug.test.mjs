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
  "goal3_release_candidate_proof_breadth_execution_bridge_check_debug",
  "goal3_release_candidate_proof_breadth_execution_follow_through",
  "goal3_release_candidate_proof_breadth_task_local_packaging_follow_through",
  "goal3_release_candidate_proof_breadth_selected_tranche_packaging_results_follow_up",
  "goal3_release_candidate_proof_breadth_selected_tranche_packaging_results_follow_up_check_debug",
  "goal3_release_candidate_proof_breadth_selected_tranche_closure_recheck",
  "goal3_release_candidate_proof_breadth_selected_tranche_next_execution_bridge",
  "goal3_release_candidate_proof_breadth_selected_tranche_next_execution_bridge_check_debug",
  "goal3_release_candidate_proof_breadth_closure_gate",
  "goal3_final_ga_audit_gate"
]) {
  assert.equal(
    status.capabilities.includes(capability),
    true,
    `Task339 selected-tranche next bridge check-debug must keep capability advertised: ${capability}`
  );
}

const smoke = repoFile("scripts/phase0-smoke.mjs");
for (const suite of [
  "goal3-task326-proof-breadth-execution-bridge.test.mjs",
  "goal3-task327-proof-breadth-bridge-check-debug.test.mjs",
  "goal3-task332-proof-breadth-execution-follow-through.test.mjs",
  "goal3-task334-task-local-lean-authority-packaging-follow-through.test.mjs",
  "goal3-task335-selected-tranche-packaging-results-follow-up.test.mjs",
  "goal3-task336-selected-tranche-packaging-results-check-debug.test.mjs",
  "goal3-task337-selected-tranche-closure-recheck.test.mjs",
  "goal3-task338-selected-tranche-next-execution-bridge.test.mjs",
  "goal3-task339-selected-tranche-next-bridge-check-debug.test.mjs",
  "goal3-task300-proof-breadth-closure-verifier.test.mjs",
  "goal3-task301-final-ga-audit-proof-breadth-closure-binding.test.mjs"
]) {
  assert.equal(smoke.includes(suite), true, `phase0 smoke must discover selected-tranche next bridge suite ${suite}`);
}

const defaultRunner = repoFile("services/comathd/scripts/run-default-tests.mjs");
assert.equal(
  defaultRunner.includes("tests/unit/goal3-task339-selected-tranche-next-bridge-check-debug.test.mjs"),
  false,
  "Task339 must be discovered by the default comathd runner, not special-cased or skipped"
);

const indexSource = repoFile("services/comathd/src/index.ts");
assert.match(
  indexSource,
  /goal3-proof-breadth-selected-tranche-next-execution-bridge\.js/s,
  "Task339 must keep Task338 selected-tranche next execution bridge exported from the public service API"
);

const apiServerSource = repoFile("services/comathd/src/api/server.ts");
for (const pattern of [
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge/s,
  /POST \/release\/goal3\/selected-tranche-next-execution-bridge/s,
  /selected_tranche_next_execution_bridge/s
]) {
  assert.match(apiServerSource, pattern, "Task339 must keep Task338 service route wired");
}

const task338Source = repoFile(
  "services/comathd/src/release/goal3-proof-breadth-selected-tranche-next-execution-bridge.ts"
);
for (const pattern of [
  /recordGoal3ReleaseCandidateProofBreadthExecutionBridge/s,
  /selectedTrancheNextExecutionBridgePath/s,
  /selectedTrancheClosureRecheckPath/s,
  /assertRecheckPath/s,
  /assertRecheckArtifact/s,
  /assertClosureArtifact/s,
  /assertCompletedReportsCurrent/s,
  /callerProofOrGaMaterialPresent/s,
  /GOAL3_SELECTED_TRANCHE_NEXT_EXECUTION_BRIDGE_STALE_RECHECK/s,
  /GOAL3_SELECTED_TRANCHE_NEXT_EXECUTION_BRIDGE_STALE_CLOSURE/s,
  /GOAL3_SELECTED_TRANCHE_NEXT_EXECUTION_BRIDGE_STALE_COMPLETED_REPORT/s,
  /GOAL3_SELECTED_TRANCHE_NEXT_EXECUTION_BRIDGE_ALREADY_EXISTS/s,
  /selected_packaging_report_artifacts_current !== true/s,
  /selected_tranche_ready_for_proof_breadth_closure_recheck !== true/s,
  /closure\.body\.proof_breadth_complete === true/s,
  /recordGoal3ReleaseCandidateProofBreadthExecutionBridge\(projectRoot,\s*\{/s,
  /requested_bridge_mode: "open_formal_workbench_release_candidate_proof_breadth_execution_bridge"/s,
  /task301_final_ga_audit_binding_required/s,
  /global_positive_matrix_release_candidate_proof_breadth_incomplete/s,
  /caller_proof_or_ga_authority_material_ignored/s,
  /completed_selected_packaging_report_artifacts_current: true/s,
  /proof_breadth_complete: proofBreadthComplete/s,
  /final_ga_audit_unblocked: closure\.body\.final_ga_audit_unblocked/s,
  /runs_lean: false/s,
  /executes_proofs: false/s,
  /accepts_caller_success_metadata: false/s,
  /accepts_caller_proof_material: false/s,
  /proof_authority: "none"/s,
  /can_promote_claim: false/s,
  /can_certify_ga: false/s,
  /ga_certification_gate_separate: true/s,
  /release\.goal3_selected_tranche_next_execution_bridge_recorded/s
]) {
  assert.match(
    task338Source,
    pattern,
    "Task339 must keep Task338 Task337-bound, Task300-current, Task326-delegating, and non-authoritative"
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
  /recordGoal3FinalGaAudit/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheClosureRecheck\(/s,
  /recordGoal3ReleaseCandidateProofBreadthClosure\(/s,
  /final_ga_audit_id/s,
  /ga_certificate_id/s,
  /ga_certificate_available/s
]) {
  assert.doesNotMatch(
    task338Source,
    forbiddenPattern,
    "Task339 must keep Task338 from running Lean, writing closure/final-audit artifacts, or fabricating certification"
  );
}
assert.equal(
  (task338Source.match(/writeFileSync\(/g) ?? []).length,
  1,
  "Task339 must keep Task338 to one direct runtime write: its own append-only next-bridge artifact"
);

const task338Suite = repoFile("services/comathd/tests/unit/goal3-task338-selected-tranche-next-execution-bridge.test.mjs");
for (const pattern of [
  /GOAL3_SELECTED_TRANCHE_NEXT_EXECUTION_BRIDGE_STALE_RECHECK/s,
  /GOAL3_SELECTED_TRANCHE_NEXT_EXECUTION_BRIDGE_STALE_COMPLETED_REPORT/s,
  /selected_tranche_next_execution_bridge_id: "GOAL3-SELECTED-TRANCHE-NEXT-BRIDGE-0338-ROUTE"/s,
  /next_execution_task_ids,\s*\["PM-007"\]/s,
  /Task338 must not write Task301 final-GA-audit artifacts/s,
  /proof_breadth_complete,\s*false/s,
  /final_ga_audit_unblocked,\s*false/s,
  /runs_lean,\s*false/s,
  /executes_proofs,\s*false/s,
  /proof_authority,\s*"none"/s,
  /can_certify_ga,\s*false/s,
  /\/release\/goal3\/selected-tranche-next-execution-bridge/s,
  /release\.goal3_selected_tranche_next_execution_bridge_recorded/s
]) {
  assert.match(
    task338Suite,
    pattern,
    "Task339 must keep Task338 focused regression coverage for stale hashes, Task326 delegation, no Task301 writes, and no-authority output"
  );
}

const piSource = repoFile("extensions/comath-pi/src/index.ts");
const piRuntimeRegistration = repoFile("extensions/comath-pi/src/runtime-registration.ts");
for (const forbiddenPattern of [
  /goal3SelectedTrancheNextExecutionBridge/s,
  /selected-tranche-next-execution-bridge/s,
  /selected_tranche_next_execution_bridge/s
]) {
  assert.doesNotMatch(
    piSource,
    forbiddenPattern,
    "Task339 must keep Task338 service-only with no Pi tool surface"
  );
  assert.doesNotMatch(
    piRuntimeRegistration,
    forbiddenPattern,
    "Task339 must keep Task338 service-only with no Pi runtime subcommand"
  );
}

const task337Source = repoFile("services/comathd/src/release/goal3-proof-breadth-selected-tranche-closure-recheck.ts");
for (const pattern of [
  /recordGoal3ReleaseCandidateProofBreadthClosure/s,
  /assertFollowUpArtifact/s,
  /assertSelectedPackagingReportsCurrent/s,
  /GOAL3_SELECTED_TRANCHE_CLOSURE_RECHECK_STALE_FOLLOW_UP/s,
  /GOAL3_SELECTED_TRANCHE_CLOSURE_RECHECK_STALE_PACKAGING_REPORT/s,
  /proof_breadth_closure: closure/s,
  /proof_authority: "none"/s,
  /can_certify_ga: false/s
]) {
  assert.match(task337Source, pattern, "Task339 must keep Task337 as the Task335-to-Task300 closure recheck wrapper");
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
  assert.match(task326Source, pattern, "Task339 must keep Task326 as bounded execution planning only");
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
    "Task339 must keep Task300 as the only aggregate proof-breadth closure verifier"
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
    "Task339 must keep Task301 as the only final-audit binding for proof-breadth closure"
  );
}

for (const [path, pattern] of [
  ["README.md", /Task339.*selected-tranche.*next bridge.*check-debug/s],
  ["TODO.md", /Task339.*selected-tranche.*next bridge.*check-debug/s],
  ["REVIEW.md", /Goal 3 Task 339/s],
  ["AGENTS.md", /Task339.*selected-tranche.*next bridge.*check-debug/s],
  ["docs/architecture/ga-release-criteria.md", /Task339.*selected-tranche.*next bridge.*check-debug/s],
  ["docs/architecture/threat-model.md", /Task339.*selected-tranche.*next bridge.*check-debug/s],
  ["docs/architecture/acceptance-matrix.md", /Task339.*selected-tranche.*next bridge.*check-debug/s]
]) {
  assert.match(repoFile(path), pattern, `${path} must document Task339 selected-tranche next bridge check-debug`);
}

console.log("Goal 3 Task339 selected-tranche next bridge check-debug tests passed.");
