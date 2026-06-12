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
  "goal3_release_candidate_proof_breadth_review_gate",
  "goal3_release_candidate_proof_breadth_closure_gate",
  "goal3_release_candidate_proof_breadth_execution_bridge",
  "goal3_release_candidate_proof_breadth_execution_bridge_check_debug",
  "goal3_release_candidate_proof_breadth_pi_closure_check_debug",
  "goal3_release_candidate_proof_breadth_execution_follow_through",
  "goal3_release_candidate_proof_breadth_execution_follow_through_check_debug",
  "goal3_final_ga_audit_gate"
]) {
  assert.equal(
    status.capabilities.includes(capability),
    true,
    `Task333 proof-breadth follow-through check-debug must keep capability advertised: ${capability}`
  );
}

const smoke = repoFile("scripts/phase0-smoke.mjs");
for (const suite of [
  "goal3-task298-service-owned-proof-breadth-review.test.mjs",
  "goal3-task300-proof-breadth-closure-verifier.test.mjs",
  "goal3-task301-final-ga-audit-proof-breadth-closure-binding.test.mjs",
  "goal3-task326-proof-breadth-execution-bridge.test.mjs",
  "goal3-task327-proof-breadth-bridge-check-debug.test.mjs",
  "goal3-task330-proof-breadth-pi-closure-check-debug.test.mjs",
  "goal3-task331-pi-final-ga-audit-closure-binding-consumer.test.mjs",
  "goal3-task332-proof-breadth-execution-follow-through.test.mjs",
  "goal3-task333-proof-breadth-follow-through-check-debug.test.mjs"
]) {
  assert.equal(smoke.includes(suite), true, `phase0 smoke must discover proof-breadth follow-through suite ${suite}`);
}

const defaultRunner = repoFile("services/comathd/scripts/run-default-tests.mjs");
assert.equal(
  defaultRunner.includes("tests/unit/goal3-task333-proof-breadth-follow-through-check-debug.test.mjs"),
  false,
  "Task333 must be discovered by the default comathd runner, not special-cased or skipped"
);

const indexSource = repoFile("services/comathd/src/index.ts");
assert.match(
  indexSource,
  /goal3-proof-breadth-execution-follow-through\.js/s,
  "Task333 must keep Task332 follow-through exported from the comathd public service API"
);

const followThroughSource = repoFile("services/comathd/src/release/goal3-proof-breadth-execution-follow-through.ts");
for (const pattern of [
  /proofBreadthExecutionFollowThroughPath/s,
  /proofBreadthExecutionBridgePath/s,
  /assertBridgePath/s,
  /assertBridgeArtifact/s,
  /GOAL3_PROOF_BREADTH_EXECUTION_FOLLOW_THROUGH_STALE_BRIDGE/s,
  /GOAL3_PROOF_BREADTH_EXECUTION_FOLLOW_THROUGH_ALREADY_EXISTS/s,
  /createGoal3GaPositiveTaskManifest/s,
  /assertSelectedTasksInManifest\(manifest,\s*bridge\.body\.next_execution_task_ids\)/s,
  /targetByTaskId\(bridge\.body\.next_execution_targets,\s*taskId\)/s,
  /readJsonArtifact<FinalAuthorityPackagingV3Report>\(\s*projectRoot,\s*bridgeTarget\.expected_packaging_report_path/s,
  /selected_tranche_ready_for_proof_breadth_closure_recheck/s,
  /blocked_selected_tranche_incomplete/s,
  /ready_for_proof_breadth_closure_recheck: selectedTrancheComplete/s,
  /proof_breadth_complete: false/s,
  /final_ga_audit_unblocked: false/s,
  /runs_lean: false/s,
  /executes_proofs: false/s,
  /accepts_caller_proof_material: false/s,
  /proof_authority: "none"/s,
  /can_promote_claim: false/s,
  /can_certify_ga: false/s,
  /caller_proof_breadth_material_ignored/s,
  /release\.goal3_proof_breadth_execution_follow_through_recorded/s
]) {
  assert.match(
    followThroughSource,
    pattern,
    "Task333 must keep Task332 follow-through bridge-bound, selected-tranche-only, append-only, and non-authoritative"
  );
}

for (const forbiddenPattern of [
  /packageGoal3GaPositiveMatrixFinalAuthorityEvidenceV3/s,
  /packageGoal3GaPositiveMatrixFinalAuthorityEvidenceTrancheV3/s,
  /executeGoal3GaPositiveMatrixLeanAuthorityReplay/s,
  /LeanRunner/s,
  /spawnSync/s,
  /execFile/s,
  /exec\(/s,
  /child_process/s,
  /writeFileSync\([^)]*finalAuthorityPackagingReportPath/s,
  /recordGoal3ReleaseCandidateProofBreadthClosure/s,
  /recordGoal3FinalGaAudit/s,
  /proof_breadth_closure_id/s,
  /final_ga_audit_id/s,
  /ga_certificate/s
]) {
  assert.doesNotMatch(
    followThroughSource,
    forbiddenPattern,
    "Task333 must keep Task332 follow-through from executing Lean or fabricating missing PM packaging reports"
  );
}
assert.equal(
  (followThroughSource.match(/writeFileSync\(/g) ?? []).length,
  1,
  "Task333 must keep Task332 follow-through to a single runtime write: its own append-only follow-through artifact"
);

const followThroughSuite = repoFile("services/comathd/tests/unit/goal3-task332-proof-breadth-execution-follow-through.test.mjs");
for (const pattern of [
  /GOAL3-PROOF-BREADTH-FOLLOW-THROUGH-0332-MISSING/s,
  /GOAL3_PROOF_BREADTH_EXECUTION_FOLLOW_THROUGH_STALE_BRIDGE/s,
  /GOAL3_PROOF_BREADTH_EXECUTION_FOLLOW_THROUGH_ALREADY_EXISTS/s,
  /existsSync\(join\(projectRoot,\s*packagingPath\("PM-004"\)\)\),\s*false/s,
  /selected_tranche_ready_for_proof_breadth_closure_recheck/s,
  /ready_for_proof_breadth_closure_recheck,\s*true/s,
  /proof_authority,\s*"none"/s,
  /runs_lean,\s*false/s,
  /executes_proofs,\s*false/s,
  /\/release\/goal3\/proof-breadth-execution-follow-through/s,
  /release\.goal3_proof_breadth_execution_follow_through_recorded/s
]) {
  assert.match(
    followThroughSuite,
    pattern,
    "Task333 must keep Task332 focused regression coverage for stale bridge, no-write, and no-authority output"
  );
}

const apiServerSource = repoFile("services/comathd/src/api/server.ts");
for (const pattern of [
  /recordGoal3ReleaseCandidateProofBreadthExecutionFollowThrough/s,
  /POST \/release\/goal3\/proof-breadth-execution-follow-through/s,
  /proof_breadth_execution_follow_through/s
]) {
  assert.match(apiServerSource, pattern, "Task333 must keep Task332 service route wired");
}

const piSource = repoFile("extensions/comath-pi/src/index.ts");
for (const forbiddenPattern of [
  /goal3ProofBreadthExecutionFollowThrough/s,
  /proof-breadth-execution-follow-through/s,
  /proof_breadth_execution_follow_through/s
]) {
  assert.doesNotMatch(
    piSource,
    forbiddenPattern,
    "Task333 must keep Task332 follow-through service-only with no Pi/public authority surface"
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
    "Task333 must keep Task300 as the only aggregate proof-breadth closure verifier"
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
    "Task333 must keep Task301 as the only final-audit binding for proof-breadth closure"
  );
}

for (const [path, pattern] of [
  ["README.md", /Task333.*proof-breadth.*follow-through.*check-debug/s],
  ["TODO.md", /Task333.*proof-breadth.*follow-through.*check-debug/s],
  ["REVIEW.md", /Goal 3 Task 333/s],
  ["AGENTS.md", /Task333.*proof-breadth.*follow-through.*check-debug/s],
  ["docs/architecture/ga-release-criteria.md", /Task333.*proof-breadth.*follow-through.*check-debug/s],
  ["docs/architecture/threat-model.md", /Task333.*proof-breadth.*follow-through.*check-debug/s],
  ["docs/architecture/acceptance-matrix.md", /Task333.*proof-breadth.*follow-through.*check-debug/s]
]) {
  assert.match(repoFile(path), pattern, `${path} must document Task333 proof-breadth follow-through check-debug`);
}

console.log("Goal 3 Task333 proof-breadth follow-through check-debug tests passed.");
