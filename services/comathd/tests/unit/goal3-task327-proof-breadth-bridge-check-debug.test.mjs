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
  "goal3_final_ga_audit_gate"
]) {
  assert.equal(
    status.capabilities.includes(capability),
    true,
    `Task327 proof-breadth bridge check-debug must keep capability advertised: ${capability}`
  );
}

const smoke = repoFile("scripts/phase0-smoke.mjs");
for (const suite of [
  "goal3-task298-service-owned-proof-breadth-review.test.mjs",
  "goal3-task300-proof-breadth-closure-verifier.test.mjs",
  "goal3-task301-final-ga-audit-proof-breadth-closure-binding.test.mjs",
  "goal3-task326-proof-breadth-execution-bridge.test.mjs",
  "goal3-task327-proof-breadth-bridge-check-debug.test.mjs"
]) {
  assert.equal(smoke.includes(suite), true, `phase0 smoke must discover proof-breadth suite ${suite}`);
}

const servicePackage = JSON.parse(repoFile("services/comathd/package.json"));
assert.equal(
  servicePackage.scripts.test,
  "corepack pnpm build && node scripts/run-default-tests.mjs",
  "Task327 must keep the default comathd test script on the recursive default runner"
);

const defaultRunner = repoFile("services/comathd/scripts/run-default-tests.mjs");
for (const pattern of [
  /entry\.endsWith\("\.test\.mjs"\)/s,
  /if \(!skip\.has\(rel\)\)/s,
  /const tests = listTests\(join\(process\.cwd\(\), "tests"\)\)/s,
  /spawnSync\(process\.execPath,\s*\[test\]/s
]) {
  assert.match(defaultRunner, pattern, "Task327 must remain discoverable by the default test runner");
}
assert.equal(
  defaultRunner.includes("tests/unit/goal3-task327-proof-breadth-bridge-check-debug.test.mjs"),
  false,
  "Task327 must not be skipped or special-cased out of default test discovery"
);

const reviewSource = repoFile("services/comathd/src/release/goal3-proof-breadth-review.ts");
for (const pattern of [
  /runGoal3GaPositiveMatrixBatch/s,
  /assertBatchBoundary\(batch\)/s,
  /batch\.summary\.clean_replay_passed !== 0/s,
  /batch\.summary\.replayable_blocker !== 100/s,
  /batch\.summary\.promoted_count !== 0/s,
  /result\.proof_authority !== "none"/s,
  /result\.can_promote_claim !== false/s,
  /proof_breadth_complete: false/s,
  /final_ga_audit_unblocked: false/s,
  /proof_authority: "none"/s,
  /callerProofBreadthMaterialPresent/s,
  /caller_proof_breadth_material_ignored/s
]) {
  assert.match(
    reviewSource,
    pattern,
    "Task327 must keep Task298 proof-breadth review fail-closed and non-authoritative"
  );
}

const reviewSuite = repoFile("services/comathd/tests/unit/goal3-task298-service-owned-proof-breadth-review.test.mjs");
for (const pattern of [
  /forgedCallerMatrix/s,
  /proof_breadth_complete:\s*true/s,
  /proof_authority:\s*"lean_kernel_clean_replay"/s,
  /caller_proof_breadth_material_ignored/s,
  /proof_breadth_complete,\s*false/s,
  /promoted_count,\s*0/s,
  /proof_authority,\s*"none"/s
]) {
  assert.match(
    reviewSuite,
    pattern,
    "Task327 must keep Task298 focused regression coverage for forged caller proof-breadth material"
  );
}

const bridgeSource = repoFile("services/comathd/src/release/goal3-proof-breadth-execution-bridge.ts");
for (const pattern of [
  /createGoal3GaPositiveTaskManifest/s,
  /finalAuthorityPackagingReportPath\(task\.task_id\)/s,
  /readJsonArtifact<FinalAuthorityPackagingV3Report>\(projectRoot,\s*expectedPath\)/s,
  /isVerifiedTaskPackaging\(packaging\.body,\s*task\.task_id\)/s,
  /requiredFinalEvidenceClasses/s,
  /"task_local_lean_authority_v3_packaging"/s,
  /proof_breadth_complete: false/s,
  /final_ga_audit_unblocked: false/s,
  /runs_lean: false/s,
  /executes_proofs: false/s,
  /accepts_caller_proof_material: false/s,
  /proof_authority: "none"/s,
  /can_promote_claim: false/s,
  /can_certify_ga: false/s,
  /caller_proof_breadth_material_ignored/s,
  /GOAL3_PROOF_BREADTH_EXECUTION_BRIDGE_ALREADY_EXISTS/s,
  /release\.goal3_proof_breadth_execution_bridge_recorded/s
]) {
  assert.match(
    bridgeSource,
    pattern,
    "Task327 must keep Task326 bridge as append-only bounded planning with no proof or certification authority"
  );
}

const bridgeSuite = repoFile("services/comathd/tests/unit/goal3-task326-proof-breadth-execution-bridge.test.mjs");
for (const pattern of [
  /next_execution_task_ids,\s*\["PM-003",\s*"PM-004"\]/s,
  /target_status,\s*"blocked_existing_packaging_report"/s,
  /target_status,\s*"missing_final_authority_packaging_report"/s,
  /proof_breadth_matrix/s,
  /caller_proof_breadth_material_ignored/s,
  /proof_authority,\s*"none"/s,
  /runs_lean,\s*false/s,
  /executes_proofs,\s*false/s,
  /final_ga_audit_unblocked,\s*false/s,
  /GOAL3_PROOF_BREADTH_EXECUTION_BRIDGE_ALREADY_EXISTS/s,
  /\/release\/goal3\/proof-breadth-execution-bridge/s
]) {
  assert.match(
    bridgeSuite,
    pattern,
    "Task327 must keep Task326 focused regression coverage for bounded tranche selection and non-authority output"
  );
}

const closureSource = repoFile("services/comathd/src/release/goal3-proof-breadth-closure.ts");
for (const pattern of [
  /createGoal3GaPositiveTaskManifest/s,
  /readJsonArtifact<FinalAuthorityPackagingV3Report>/s,
  /isVerifiedTaskPackaging\(artifact\.body,\s*task\.task_id\)/s,
  /proof_authority: complete \? "lean_kernel_clean_replay" : "none"/s,
  /can_promote_claim: false/s,
  /can_certify_ga: false/s,
  /release\.goal3_proof_breadth_closure_recorded/s
]) {
  assert.match(
    closureSource,
    pattern,
    "Task327 must keep Task300 closure as the only aggregate proof-breadth verifier"
  );
}

const finalAuditSource = repoFile("services/comathd/src/release/goal3-final-ga-audit.ts");
for (const pattern of [
  /optionalProofBreadthClosure/s,
  /proof_breadth_closure_sha256/s,
  /assertProofBreadthClosure/s,
  /final_ga_audit_passed: proofBreadthClosureComplete/s,
  /ga_certificate_available: false/s,
  /can_promote_claim: false/s,
  /can_certify_ga: false/s
]) {
  assert.match(
    finalAuditSource,
    pattern,
    "Task327 must keep Task301 final GA audit as the closure-bound audit gate"
  );
}

const apiServerSource = repoFile("services/comathd/src/api/server.ts");
for (const pattern of [
  /POST \/release\/goal3\/proof-breadth-review/s,
  /POST \/release\/goal3\/proof-breadth-closure/s,
  /POST \/release\/goal3\/proof-breadth-execution-bridge/s,
  /POST \/release\/goal3\/final-ga-audit/s,
  /recordGoal3ReleaseCandidateProofBreadthExecutionBridge/s
]) {
  assert.match(apiServerSource, pattern, "Task327 must keep proof-breadth service routes wired");
}

for (const [path, pattern] of [
  ["README.md", /Task327.*proof-breadth.*check-debug/s],
  ["TODO.md", /Task327.*proof-breadth.*check-debug/s],
  ["REVIEW.md", /Goal 3 Task 327/s],
  ["AGENTS.md", /Task327.*proof-breadth.*check-debug/s],
  ["docs/architecture/ga-release-criteria.md", /Task327.*proof-breadth.*check-debug/s],
  ["docs/architecture/threat-model.md", /Task327.*proof-breadth.*check-debug/s],
  ["docs/architecture/acceptance-matrix.md", /Task327.*proof-breadth.*check-debug/s]
]) {
  assert.match(repoFile(path), pattern, `${path} must document Task327 proof-breadth bridge check-debug`);
}

console.log("Goal 3 Task327 proof-breadth bridge check-debug tests passed.");
