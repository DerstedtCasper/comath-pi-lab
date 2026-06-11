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
  "goal3_final_ga_audit_gate"
]) {
  assert.equal(
    status.capabilities.includes(capability),
    true,
    `Task330 proof-breadth Pi closure check-debug must keep capability advertised: ${capability}`
  );
}

const smoke = repoFile("scripts/phase0-smoke.mjs");
for (const suite of [
  "goal3-task298-service-owned-proof-breadth-review.test.mjs",
  "goal3-task300-proof-breadth-closure-verifier.test.mjs",
  "goal3-task301-final-ga-audit-proof-breadth-closure-binding.test.mjs",
  "goal3-task326-proof-breadth-execution-bridge.test.mjs",
  "goal3-task327-proof-breadth-bridge-check-debug.test.mjs",
  "goal3-task328-pi-proof-breadth-review-consumer.test.mjs",
  "goal3-task329-pi-proof-breadth-closure-consumer.test.mjs",
  "goal3-task330-proof-breadth-pi-closure-check-debug.test.mjs"
]) {
  assert.equal(smoke.includes(suite), true, `phase0 smoke must discover proof-breadth public-chain suite ${suite}`);
}

const piPackage = JSON.parse(repoFile("extensions/comath-pi/package.json"));
for (const suite of [
  "goal3-task328-pi-proof-breadth-review-consumer.test.mjs",
  "goal3-task329-pi-proof-breadth-closure-consumer.test.mjs"
]) {
  assert.equal(
    piPackage.scripts.test.includes(`node tests/${suite}`),
    true,
    `Pi package test script must discover ${suite}`
  );
}

const defaultRunner = repoFile("services/comathd/scripts/run-default-tests.mjs");
assert.equal(
  defaultRunner.includes("tests/unit/goal3-task330-proof-breadth-pi-closure-check-debug.test.mjs"),
  false,
  "Task330 must be discovered by the default comathd runner, not special-cased or skipped"
);

const piSource = repoFile("extensions/comath-pi/src/index.ts");
function sourceSlice(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `missing source marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `missing source marker after ${startMarker}: ${endMarker}`);
  return source.slice(start, end);
}

const reviewExecutionBranch = sourceSlice(
  piSource,
  'if (name === "comath.release.goal3ProofBreadthReview")',
  'if (name === "comath.release.goal3ProofBreadthClosure")'
);
const closureExecutionBranch = sourceSlice(
  piSource,
  'if (name === "comath.release.goal3ProofBreadthClosure")',
  'if (name === "comath.release.piCodexLifecycleGuidedRealPiExecution")'
);

for (const pattern of [
  /"comath\.release\.goal3ProofBreadthReview"/s,
  /"comath\.release\.goal3ProofBreadthClosure"/s,
  /name === "comath\.release\.goal3ProofBreadthReview"/s,
  /name === "comath\.release\.goal3ProofBreadthClosure"/s,
  /sanitizeGoal3ProofBreadthReviewPublicValue/s,
  /sanitizeGoal3ProofBreadthClosurePublicValue/s,
  /proof_breadth_review_id/s,
  /proof_breadth_closure_id/s,
  /requested_review_mode/s,
  /requested_closure_mode/s,
  /\/release\/goal3\/proof-breadth-review/s,
  /\/release\/goal3\/proof-breadth-closure/s,
  /goal3-proof-breadth-review/s,
  /goal3-proof-breadth-closure/s,
  /can_promote_claim = false/s,
  /can_certify_ga = false/s,
  /ga_certificate_available = false/s
]) {
  assert.match(
    piSource,
    pattern,
    "Task330 must keep Task328/329 Pi proof-breadth consumers registered, sanitized, and route-bound"
  );
}

for (const forbiddenPattern of [
  /proof_breadth_matrix:\s*readString/s,
  /proof_breadth_matrix_json:\s*readString/s,
  /proof_breadth_closure_json:\s*readString/s,
  /proof_breadth_execution_bridge_json:\s*readString/s,
  /proof_claim_json:\s*readString/s,
  /ga_certificate_json:\s*readString/s,
  /lean_replay_manifest.*readString/s,
  /final_replay_manifest.*readString/s
]) {
  for (const [label, branch] of [
    ["Task328 review consumer", reviewExecutionBranch],
    ["Task329 closure consumer", closureExecutionBranch]
  ]) {
    assert.doesNotMatch(
      branch,
      forbiddenPattern,
      `Task330 must keep caller proof/Lean/GA/bridge material out of ${label}`
    );
  }
}

const runtimeRegistration = repoFile("extensions/comath-pi/src/runtime-registration.ts");
for (const subcommand of [
  "goal3-proof-breadth-review",
  "goal3-proof-breadth-closure"
]) {
  assert.equal(
    runtimeRegistration.includes(`"${subcommand}"`),
    true,
    `Pi runtime registration must keep ${subcommand}`
  );
}

const interactivePlannerSuite = repoFile("extensions/comath-pi/tests/goal3-task223-pi-interactive-real-pi-checkpoint-ux.test.mjs");
assert.match(
  interactivePlannerSuite,
  /"goal3-proof-breadth-review"[\s\S]*"goal3-proof-breadth-closure"[\s\S]*"run-codex-api-probe"/s,
  "Task330 must keep the interactive real-Pi planner order: review -> closure -> run-codex-api-probe"
);

const reviewConsumerSuite = repoFile("extensions/comath-pi/tests/goal3-task328-pi-proof-breadth-review-consumer.test.mjs");
for (const pattern of [
  /proof_breadth_matrix/s,
  /proof_breadth_matrix_json/s,
  /proof_breadth_review_id/s,
  /proof_breadth_complete,\s*false/s,
  /final_ga_audit_unblocked,\s*false/s,
  /proof_authority,\s*"none"/s,
  /can_certify_ga,\s*false/s
]) {
  assert.match(
    reviewConsumerSuite,
    pattern,
    "Task330 must keep Task328 review consumer fail-closed and non-authoritative"
  );
}

const closureConsumerSuite = repoFile("extensions/comath-pi/tests/goal3-task329-pi-proof-breadth-closure-consumer.test.mjs");
for (const pattern of [
  /proof_breadth_matrix/s,
  /proof_breadth_closure_json/s,
  /proof_breadth_execution_bridge_json/s,
  /proof_breadth_closure_id/s,
  /proof_authority,\s*"unverified_formal_status"/s,
  /can_certify_ga,\s*false/s,
  /ga_certificate_available,\s*false/s,
  /proof_breadth_complete,\s*true/s,
  /final_ga_audit_unblocked,\s*true/s
]) {
  assert.match(
    closureConsumerSuite,
    pattern,
    "Task330 must keep Task329 closure consumer non-promotional while preserving service-owned closure status/counts"
  );
}

const bridgeSource = repoFile("services/comathd/src/release/goal3-proof-breadth-execution-bridge.ts");
for (const pattern of [
  /proof_breadth_complete: false/s,
  /final_ga_audit_unblocked: false/s,
  /runs_lean: false/s,
  /executes_proofs: false/s,
  /proof_authority: "none"/s,
  /can_promote_claim: false/s,
  /can_certify_ga: false/s,
  /caller_proof_breadth_material_ignored/s
]) {
  assert.match(
    bridgeSource,
    pattern,
    "Task330 must keep Task326 bridge as non-authoritative execution planning only"
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
    "Task330 must keep Task300 as the service-owned proof-breadth closure verifier"
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
    "Task330 must keep Task301 final GA audit as the only proof-breadth closure binding gate"
  );
}

for (const [path, pattern] of [
  ["README.md", /Task330.*proof-breadth.*Pi.*check-debug/s],
  ["TODO.md", /Task330.*proof-breadth.*Pi.*check-debug/s],
  ["REVIEW.md", /Goal 3 Task 330/s],
  ["AGENTS.md", /Task330.*proof-breadth.*Pi.*check-debug/s],
  ["docs/architecture/ga-release-criteria.md", /Task330.*proof-breadth.*Pi.*check-debug/s],
  ["docs/architecture/threat-model.md", /Task330.*proof-breadth.*Pi.*check-debug/s],
  ["docs/architecture/acceptance-matrix.md", /Task330.*proof-breadth.*Pi.*check-debug/s]
]) {
  assert.match(repoFile(path), pattern, `${path} must document Task330 proof-breadth Pi closure check-debug`);
}

console.log("Goal 3 Task330 proof-breadth Pi closure check-debug tests passed.");
