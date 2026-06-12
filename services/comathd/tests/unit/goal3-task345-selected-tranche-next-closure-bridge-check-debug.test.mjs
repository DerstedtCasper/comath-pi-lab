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
  "goal3_release_candidate_proof_breadth_closure_gate",
  "goal3_release_candidate_proof_breadth_selected_tranche_next_execution_bridge",
  "goal3_release_candidate_proof_breadth_selected_tranche_next_execution_bridge_check_debug",
  "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_recheck",
  "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_execution_bridge",
  "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_execution_bridge_check_debug",
  "goal3_final_ga_audit_gate"
]) {
  assert.equal(
    status.capabilities.includes(capability),
    true,
    `Task345 selected-tranche next closure bridge check-debug must keep capability advertised: ${capability}`
  );
}

const smoke = repoFile("scripts/phase0-smoke.mjs");
for (const suite of [
  "goal3-task326-proof-breadth-execution-bridge.test.mjs",
  "goal3-task338-selected-tranche-next-execution-bridge.test.mjs",
  "goal3-task339-selected-tranche-next-bridge-check-debug.test.mjs",
  "goal3-task342-selected-tranche-next-packaging-currentness-check-debug.test.mjs",
  "goal3-task343-selected-tranche-next-closure-recheck.test.mjs",
  "goal3-task344-selected-tranche-next-closure-execution-bridge.test.mjs",
  "goal3-task345-selected-tranche-next-closure-bridge-check-debug.test.mjs",
  "goal3-task300-proof-breadth-closure-verifier.test.mjs",
  "goal3-task301-final-ga-audit-proof-breadth-closure-binding.test.mjs"
]) {
  assert.equal(smoke.includes(suite), true, `phase0 smoke must discover selected-tranche next closure bridge suite ${suite}`);
}

const defaultRunner = repoFile("services/comathd/scripts/run-default-tests.mjs");
assert.equal(
  defaultRunner.includes("tests/unit/goal3-task345-selected-tranche-next-closure-bridge-check-debug.test.mjs"),
  false,
  "Task345 must be discovered by the default comathd runner, not special-cased or skipped"
);

const indexSource = repoFile("services/comathd/src/index.ts");
for (const pattern of [
  /goal3-proof-breadth-selected-tranche-next-closure-recheck\.js/s,
  /goal3-proof-breadth-selected-tranche-next-closure-execution-bridge\.js/s,
  /goal3-proof-breadth-selected-tranche-next-execution-bridge\.js/s,
  /goal3-proof-breadth-execution-bridge\.js/s,
  /goal3-proof-breadth-closure\.js/s,
  /goal3-final-ga-audit\.js/s
]) {
  assert.match(indexSource, pattern, "Task345 must keep adjacent proof-breadth release modules exported");
}

const apiServerSource = repoFile("services/comathd/src/api/server.ts");
for (const pattern of [
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureRecheck/s,
  /POST \/release\/goal3\/selected-tranche-next-closure-recheck/s,
  /selected_tranche_next_closure_recheck/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureExecutionBridge/s,
  /POST \/release\/goal3\/selected-tranche-next-closure-execution-bridge/s,
  /selected_tranche_next_closure_execution_bridge/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge/s,
  /POST \/release\/goal3\/selected-tranche-next-execution-bridge/s,
  /recordGoal3ReleaseCandidateProofBreadthExecutionBridge/s,
  /POST \/release\/goal3\/proof-breadth-execution-bridge/s,
  /recordGoal3ReleaseCandidateProofBreadthClosure/s,
  /POST \/release\/goal3\/proof-breadth-closure/s,
  /recordGoal3FinalGaAudit/s,
  /POST \/release\/goal3\/final-ga-audit/s
]) {
  assert.match(apiServerSource, pattern, "Task345 must keep Task343/344/338/326/300/301 routes wired");
}

const task344Source = repoFile(
  "services/comathd/src/release/goal3-proof-breadth-selected-tranche-next-closure-execution-bridge.ts"
);
for (const pattern of [
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge/s,
  /assertTask343Path/s,
  /assertTask343Artifact/s,
  /selectedTrancheNextClosureExecutionBridgePath/s,
  /selectedTrancheNextClosureRecheckPath/s,
  /GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_EXECUTION_BRIDGE_STALE_RECHECK/s,
  /GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_EXECUTION_BRIDGE_INVALID_RECHECK/s,
  /recheck\.body\.accepts_caller_success_metadata !== false/s,
  /recheck\.body\.accepts_caller_proof_material !== false/s,
  /recheck\.body\.ga_certification_gate_separate !== true/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge\(projectRoot,\s*\{/s,
  /selected_tranche_closure_recheck_id: task343\.body\.selected_tranche_closure_recheck_id/s,
  /selected_tranche_closure_recheck_sha256: task343\.body\.selected_tranche_closure_recheck_artifact\.sha256/s,
  /caller_proof_or_ga_authority_material_ignored/s,
  /proof_breadth_complete: delegatedBridge\.proof_breadth_complete/s,
  /final_ga_audit_unblocked: delegatedBridge\.final_ga_audit_unblocked/s,
  /runs_lean: false/s,
  /executes_proofs: false/s,
  /accepts_caller_success_metadata: false/s,
  /accepts_caller_proof_material: false/s,
  /proof_authority: "none"/s,
  /can_promote_claim: false/s,
  /can_certify_ga: false/s,
  /ga_certification_gate_separate: true/s,
  /release\.goal3_selected_tranche_next_closure_execution_bridge_recorded/s
]) {
  assert.match(
    task344Source,
    pattern,
    "Task345 must keep Task344 Task343-hash-bound, Task338-delegating, and non-authoritative"
  );
}

for (const forbiddenPattern of [
  /from "\.\/goal3-proof-breadth-execution-bridge\.js"/s,
  /recordGoal3ReleaseCandidateProofBreadthExecutionBridge\(/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextPackagingFollowThrough/s,
  /recordGoal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThrough/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTranchePackagingResultsFollowUp/s,
  /recordGoal3ReleaseCandidateProofBreadthClosure\(/s,
  /recordGoal3FinalGaAudit/s,
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
    task344Source,
    forbiddenPattern,
    "Task345 must keep Task344 from running Lean, calling Task326 directly, writing packaging/currentness/closure/final-audit artifacts, or fabricating certificates"
  );
}
assert.equal(
  (task344Source.match(/writeFileSync\(/g) ?? []).length,
  1,
  "Task345 must keep Task344 to one direct runtime write: its own append-only bridge artifact"
);

const task343Source = repoFile(
  "services/comathd/src/release/goal3-proof-breadth-selected-tranche-next-closure-recheck.ts"
);
for (const pattern of [
  /recordGoal3ReleaseCandidateProofBreadthClosure as writeProofBreadthClosure/s,
  /assertTask341Artifact/s,
  /assertSelectedPackagingReportsCurrent/s,
  /GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_RECHECK_STALE_TASK341/s,
  /GOAL3_SELECTED_TRANCHE_CLOSURE_RECHECK_STALE_PACKAGING_REPORT/s,
  /selected_tranche_ready_for_proof_breadth_closure_recheck: task341\.body\.ready_for_proof_breadth_closure_recheck/s,
  /proof_breadth_complete: closure\.proof_breadth_complete/s,
  /final_ga_audit_unblocked: closure\.final_ga_audit_unblocked/s,
  /runs_lean: false/s,
  /executes_proofs: false/s,
  /accepts_caller_success_metadata: false/s,
  /accepts_caller_proof_material: false/s,
  /proof_authority: "none"/s,
  /can_promote_claim: false/s,
  /can_certify_ga: false/s,
  /ga_certification_gate_separate: true/s,
  /release\.goal3_selected_tranche_next_closure_recheck_recorded/s
]) {
  assert.match(task343Source, pattern, "Task345 must keep Task343 Task341-bound, Task300-reusing, and non-authoritative");
}
for (const forbiddenPattern of [
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheClosureRecheck/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge/s,
  /recordGoal3ReleaseCandidateProofBreadthExecutionBridge/s,
  /recordGoal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThrough/s,
  /recordGoal3FinalGaAudit/s,
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
    task343Source,
    forbiddenPattern,
    "Task345 must keep Task343 from creating next bridges, running Lean, packaging proofs, or invoking final-GA audit"
  );
}

const task338Source = repoFile("services/comathd/src/release/goal3-proof-breadth-selected-tranche-next-execution-bridge.ts");
for (const pattern of [
  /recordGoal3ReleaseCandidateProofBreadthExecutionBridge/s,
  /assertRecheckArtifact/s,
  /assertClosureArtifact/s,
  /assertCompletedReportsCurrent/s,
  /typeof recheck\.body\.selected_tranche_ready_for_proof_breadth_closure_recheck !== "boolean"/s,
  /const proofBreadthComplete = closure\.body\.proof_breadth_complete === true/s,
  /const nextExecutionBridge = proofBreadthComplete\s*\?\s*null\s*:\s*recordGoal3ReleaseCandidateProofBreadthExecutionBridge\(projectRoot,\s*\{/s,
  /recordGoal3ReleaseCandidateProofBreadthExecutionBridge\(projectRoot,\s*\{/s,
  /task301_final_ga_audit_binding_required/s,
  /global_positive_matrix_release_candidate_proof_breadth_incomplete/s,
  /ok: nextExecutionBridge !== null/s,
  /bridge_status: nextExecutionBridge\s*\?\s*"ready_for_next_selected_tranche_execution"\s*:\s*"complete_proof_breadth_requires_task301_final_ga_audit_binding"/s,
  /next_proof_breadth_execution_bridge_id: nextExecutionBridge\?\.proof_breadth_execution_bridge_id \?\? null/s,
  /next_proof_breadth_execution_bridge_path: nextExecutionBridge\?\.proof_breadth_execution_bridge_path \?\? null/s,
  /next_proof_breadth_execution_bridge_artifact: nextExecutionBridge\?\.proof_breadth_execution_bridge_artifact \?\? null/s,
  /next_proof_breadth_execution_bridge: nextExecutionBridge/s,
  /next_execution_task_ids: nextExecutionBridge\?\.next_execution_task_ids \?\? \[\]/s,
  /next_execution_targets: nextExecutionBridge\?\.next_execution_targets \?\? \[\]/s,
  /runs_lean: false/s,
  /executes_proofs: false/s,
  /proof_authority: "none"/s,
  /can_certify_ga: false/s
]) {
  assert.match(task338Source, pattern, "Task345 must keep Task338 as the currentness-checked Task326 delegation layer");
}
for (const forbiddenPattern of [
  /recordGoal3FinalGaAudit/s,
  /final_ga_audit_id/s,
  /final_ga_audit_path/s,
  /final_ga_audit_artifact/s,
  /ga_certificate_id/s
]) {
  assert.doesNotMatch(
    task338Source,
    forbiddenPattern,
    "Task345 must keep Task338 from writing Task301 final-audit bindings or GA certificates"
  );
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
  assert.match(task326Source, pattern, "Task345 must keep Task326 as bounded selected-tranche execution planning only");
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
  assert.match(closureSource, pattern, "Task345 must keep Task300 as the only aggregate proof-breadth closure verifier");
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
  assert.match(finalAuditSource, pattern, "Task345 must keep Task301 as the only final-audit binding for proof-breadth closure");
}

const piSource = repoFile("extensions/comath-pi/src/index.ts");
const piRuntimeRegistration = repoFile("extensions/comath-pi/src/runtime-registration.ts");
for (const forbiddenPattern of [
  /selected-tranche-next-closure-recheck/s,
  /selected-tranche-next-closure-execution-bridge/s,
  /selected_tranche_next_closure_recheck/s,
  /selected_tranche_next_closure_execution_bridge/s,
  /goal3SelectedTrancheNextClosure/s
]) {
  assert.doesNotMatch(piSource, forbiddenPattern, "Task345 must keep Task343/344 service-only with no Pi tool surface");
  assert.doesNotMatch(
    piRuntimeRegistration,
    forbiddenPattern,
    "Task345 must keep Task343/344 service-only with no Pi runtime subcommand"
  );
}

for (const [path, pattern] of [
  ["README.md", /Task345.*selected-tranche.*next closure.*check-debug/s],
  ["TODO.md", /Task345.*selected-tranche.*next closure.*check-debug/s],
  ["REVIEW.md", /Goal 3 Task 345/s],
  ["AGENTS.md", /Task345.*selected-tranche.*next closure.*check-debug/s],
  ["docs/architecture/ga-release-criteria.md", /Task345.*selected-tranche.*next closure.*check-debug/s],
  ["docs/architecture/threat-model.md", /Task345.*selected-tranche.*next closure.*check-debug/s],
  ["docs/architecture/acceptance-matrix.md", /Task345.*selected-tranche.*next closure.*check-debug/s],
  ["docs/progress/goal-3-ga-gap-matrix.md", /Task345.*selected-tranche.*next closure.*check-debug/s]
]) {
  assert.match(repoFile(path), pattern, `${path} must document Task345 selected-tranche next closure bridge check-debug`);
}

console.log("Goal 3 Task345 selected-tranche next closure bridge check-debug tests passed.");
