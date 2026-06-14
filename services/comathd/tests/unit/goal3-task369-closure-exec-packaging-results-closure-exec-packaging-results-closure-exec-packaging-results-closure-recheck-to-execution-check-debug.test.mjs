import assert from "node:assert/strict";
import { dirname, join, relative } from "node:path";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getComathdStatus } from "../../dist/index.js";

const task369Suite =
  "tests/unit/goal3-task369-closure-exec-packaging-results-closure-exec-packaging-results-closure-exec-packaging-results-closure-recheck-to-execution-check-debug.test.mjs";

function repoPath(relativePath) {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "../../../..", relativePath);
}

function repoFile(relativePath) {
  return readFileSync(repoPath(relativePath), "utf8");
}

function repoDirEntries(relativePath) {
  return readdirSync(repoPath(relativePath), { withFileTypes: true }).map((entry) => entry.name);
}

function repoTreeText(relativePath) {
  const root = repoPath(relativePath);
  const chunks = [];
  const visit = (absoluteDir, relativeDir) => {
    for (const entry of readdirSync(absoluteDir, { withFileTypes: true })) {
      const childAbsolute = join(absoluteDir, entry.name);
      const childRelative = `${relativeDir}/${entry.name}`.replace(/^\/+/u, "");
      if (entry.isDirectory()) {
        visit(childAbsolute, childRelative);
      } else if (/\.(?:ts|tsx|js|mjs)$/u.test(entry.name)) {
        chunks.push(`\n# ${childRelative}\n${readFileSync(childAbsolute, "utf8")}`);
      }
    }
  };
  visit(root, relativePath);
  return chunks.join("\n");
}

function discoveredComathdDefaultTests() {
  const packageRoot = repoPath("services/comathd");
  const skip = new Set([
    "tests/integration/phase18-ga-snapshot-replay.test.mjs",
    "tests/integration/phase23-ga-integrity-boundaries.test.mjs",
    "tests/integration/phase23-ga-theorem-family-generalization.test.mjs",
    "tests/integration/phase34-campaign-ensemble-isolation.test.mjs",
    "tests/integration/phase35-final-replay-artifact-paths.test.mjs",
    "tests/integration/phase57-ga-theorem-template-instantiation.test.mjs",
    "tests/integration/phase67-v3-formal-campaign-slice.test.mjs",
    "tests/integration/phase68-v3-negative-ga-slices.test.mjs",
    "tests/integration/phase72-theorem-specific-lean-generation.test.mjs",
    "tests/integration/phase73-bounded-lean-proof-body-synthesis.test.mjs",
    "tests/integration/phase74-bounded-authority-report-preparation.test.mjs",
    "tests/integration/phase75-bounded-final-clean-replay.test.mjs",
    "tests/integration/phase76-registered-nat-linear-targets.test.mjs"
  ]);
  const files = [];
  const visit = (absoluteDir) => {
    for (const entry of readdirSync(absoluteDir)) {
      const path = join(absoluteDir, entry);
      const stat = statSync(path);
      if (stat.isDirectory()) {
        if (entry !== "fixtures" && entry !== "optional") {
          visit(path);
        }
      } else if (entry.endsWith(".test.mjs")) {
        const rel = relative(packageRoot, path).replace(/\\/g, "/");
        if (!skip.has(rel)) {
          files.push(rel);
        }
      }
    }
  };
  visit(join(packageRoot, "tests"));
  return files;
}

const task369Capability =
  "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_check_debug";

const status = getComathdStatus();
for (const capability of [
  "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck",
  "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge",
  task369Capability,
  "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck",
  "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge",
  "goal3_release_candidate_proof_breadth_closure_gate",
  "goal3_final_ga_audit_gate",
  "goal3_ga_certificate_gate"
]) {
  assert.equal(
    status.capabilities.includes(capability),
    true,
    `Task369 closure recheck-to-execution check-debug must keep capability advertised: ${capability}`
  );
}

const smoke = repoFile("scripts/phase0-smoke.mjs");
for (const suite of [
  "goal3-task366-closure-exec-packaging-results-closure-exec-packaging-results-closure-exec-packaging-results-currentness-check-debug.test.mjs",
  "goal3-task367-closure-exec-packaging-results-closure-exec-packaging-results-closure-exec-packaging-results-closure-recheck.test.mjs",
  "goal3-task368-closure-execution-bridge.test.mjs",
  "goal3-task369-closure-exec-packaging-results-closure-exec-packaging-results-closure-exec-packaging-results-closure-recheck-to-execution-check-debug.test.mjs",
  "goal3-task362-closure-exec-packaging-results-closure-exec-packaging-results-closure-execution-bridge.test.mjs",
  "goal3-task361-closure-exec-packaging-results-closure-exec-packaging-results-closure-recheck.test.mjs",
  "goal3-task300-proof-breadth-closure-verifier.test.mjs",
  "goal3-task301-final-ga-audit-proof-breadth-closure-binding.test.mjs",
  "goal3-task303-service-owned-ga-certificate-gate.test.mjs"
]) {
  assert.equal(
    smoke.includes(suite),
    true,
    `phase0 smoke must discover Task369 closure recheck-to-execution suite ${suite}`
  );
}

const defaultRunner = repoFile("services/comathd/scripts/run-default-tests.mjs");
assert.equal(
  defaultRunner.includes(task369Suite),
  false,
  "Task369 must be discovered by the default comathd runner, not special-cased or skipped"
);
assert.equal(
  discoveredComathdDefaultTests().includes(task369Suite),
  true,
  "Task369 must be included by the default comathd recursive test discovery contract"
);

const indexSource = repoFile("services/comathd/src/index.ts");
for (const pattern of [
  /goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-recheck\.js/s,
  /goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-bridge\.js/s,
  /goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-recheck\.js/s,
  /goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-bridge\.js/s,
  /goal3-proof-breadth-closure\.js/s,
  /goal3-final-ga-audit\.js/s,
  /goal3-ga-certificate\.js/s
]) {
  assert.match(indexSource, pattern, "Task369 must keep Task367/368 and adjacent release modules exported");
}

const apiServerSource = repoFile("services/comathd/src/api/server.ts");
const task367RouteBlock = apiServerSource.match(
  /POST \/release\/goal3\/selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-recheck[\s\S]{0,1600}?recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck[\s\S]{0,1600}?selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck/s
)?.[0];
assert.ok(task367RouteBlock, "Task369 must keep Task367 route string, handler, and response payload connected in one server block");
const task368RouteBlock = apiServerSource.match(
  /POST \/release\/goal3\/selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-bridge[\s\S]{0,1600}?recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionBridge[\s\S]{0,1600}?selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge/s
)?.[0];
assert.ok(task368RouteBlock, "Task369 must keep Task368 route string, handler, and response payload connected in one server block");

for (const pattern of [
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck/s,
  /POST \/release\/goal3\/selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-recheck/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionBridge/s,
  /POST \/release\/goal3\/selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-bridge/s,
  /recordGoal3ReleaseCandidateProofBreadthClosure/s,
  /POST \/release\/goal3\/proof-breadth-closure/s,
  /recordGoal3FinalGaAudit/s,
  /POST \/release\/goal3\/final-ga-audit/s,
  /recordGoal3GaCertificate/s,
  /POST \/release\/goal3\/ga-certificate/s
]) {
  assert.match(apiServerSource, pattern, "Task369 must keep Task367/368 and Task300/301/303 routes wired");
}

for (const forbiddenPattern of [
  /Task369/s,
  /task369/s,
  /closure-recheck-to-execution-check-debug/s,
  /closure_recheck_to_execution_check_debug/s,
  /ClosureRecheckToExecutionCheckDebug/s,
  /POST \/release\/goal3\/[^"]*check-debug/s
]) {
  assert.doesNotMatch(
    apiServerSource,
    forbiddenPattern,
    "Task369 must remain regression-only and must not add a service check-debug route"
  );
}

const releaseEntries = repoDirEntries("services/comathd/src/release");
for (const forbiddenReleaseEntryPattern of [
  /task369/i,
  /check-debug/i,
  /closure-recheck-to-execution/i,
  /closure-exec-packaging-results-closure-exec-packaging-results-closure-exec-packaging-results.*check/i
]) {
  assert.equal(
    releaseEntries.some((entry) => forbiddenReleaseEntryPattern.test(entry)),
    false,
    "Task369 must not add a release writer module"
  );
}

const task367Source = repoFile(
  "services/comathd/src/release/goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-recheck.ts"
);
for (const pattern of [
  /readTask365Artifact/s,
  /assertTask365InputPath/s,
  /assertCurrentArtifactReference/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck/s,
  /errorCode\("STALE_TASK365"\)/s,
  /errorCode\("INVALID_TASK365"\)/s,
  /TASK361_DELEGATED_MISMATCH/s,
  /delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id:/s,
  /proof_breadth_closure_id: delegated\.proof_breadth_closure_id/s,
  /task365_not_ready_for_closure_recheck/s,
  /caller_proof_or_ga_authority_material_ignored/s,
  /record\.proof_breadth_closure_id !== undefined/s,
  /record\.final_ga_audit_id !== undefined/s,
  /record\.ga_certificate_id !== undefined/s,
  /runs_lean: false/s,
  /executes_proofs: false/s,
  /accepts_caller_success_metadata: false/s,
  /accepts_caller_proof_material: false/s,
  /proof_authority: "none"/s,
  /can_promote_claim: false/s,
  /can_certify_ga: false/s,
  /ga_certification_gate_separate: true/s,
  /release\.goal3_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_recorded/s
]) {
  assert.match(task367Source, pattern, "Task369 must keep Task367 Task365-bound, Task361-delegating, and non-authoritative");
}

for (const forbiddenPattern of [
  /from "\.\/goal3-proof-breadth-closure\.js"/s,
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
  /final_ga_audit_id\s*:/s,
  /ga_certificate_id\s*:/s
]) {
  assert.doesNotMatch(
    task367Source,
    forbiddenPattern,
    "Task369 must keep Task367 from running Lean, calling lower producers directly, or fabricating final-audit/certificate authority"
  );
}
assert.equal(
  (task367Source.match(/writeFileSync\(/g) ?? []).length,
  1,
  "Task369 must keep Task367 to one direct runtime write: its own append-only recheck artifact"
);

const task368Source = repoFile(
  "services/comathd/src/release/goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-bridge.ts"
);
for (const pattern of [
  /readTask367Artifact/s,
  /assertTask367InputPath/s,
  /assertCurrentArtifactReference/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionBridge/s,
  /errorCode\("STALE_TASK367"\)/s,
  /errorCode\("INVALID_TASK367"\)/s,
  /TASK362_DELEGATED_MISMATCH/s,
  /delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:/s,
  /next_proof_breadth_execution_bridge_id:/s,
  /task367_not_ready_for_closure_execution/s,
  /caller_proof_or_ga_authority_material_ignored/s,
  /record\.proof_breadth_closure_id !== undefined/s,
  /record\.final_ga_audit_id !== undefined/s,
  /record\.ga_certificate_id !== undefined/s,
  /runs_lean: false/s,
  /executes_proofs: false/s,
  /accepts_caller_success_metadata: false/s,
  /accepts_caller_proof_material: false/s,
  /proof_authority: "none"/s,
  /can_promote_claim: false/s,
  /can_certify_ga: false/s,
  /ga_certification_gate_separate: true/s,
  /release\.goal3_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_recorded/s
]) {
  assert.match(task368Source, pattern, "Task369 must keep Task368 Task367-bound, Task362-delegating, and non-authoritative");
}

for (const forbiddenPattern of [
  /from "\.\/goal3-proof-breadth-execution-bridge\.js"/s,
  /recordGoal3ReleaseCandidateProofBreadthExecutionBridge\(/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge/s,
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
  /proof_breadth_closure_id\s*:/s,
  /final_ga_audit_id\s*:/s,
  /ga_certificate_id\s*:/s
]) {
  assert.doesNotMatch(
    task368Source,
    forbiddenPattern,
    "Task369 must keep Task368 from running Lean, bypassing Task362, or fabricating closure/final-audit/certificate authority"
  );
}
assert.equal(
  (task368Source.match(/writeFileSync\(/g) ?? []).length,
  1,
  "Task369 must keep Task368 to one direct runtime write: its own append-only bridge artifact"
);

const task361Source = repoFile(
  "services/comathd/src/release/goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-recheck.ts"
);
for (const pattern of [
  /readTask359Artifact/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck/s,
  /proof_authority: "none"/s,
  /can_certify_ga: false/s
]) {
  assert.match(task361Source, pattern, "Task369 must keep Task361 as the delegated closure-recheck layer");
}

const task362Source = repoFile(
  "services/comathd/src/release/goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-bridge.ts"
);
for (const pattern of [
  /readTask361Artifact/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionBridge/s,
  /next_proof_breadth_execution_bridge_id:/s,
  /proof_authority: "none"/s,
  /can_certify_ga: false/s
]) {
  assert.match(task362Source, pattern, "Task369 must keep Task362 as the delegated closure-execution bridge layer");
}

const closureSource = repoFile("services/comathd/src/release/goal3-proof-breadth-closure.ts");
for (const pattern of [
  /createGoal3GaPositiveTaskManifest/s,
  /proof_authority: complete \? "lean_kernel_clean_replay" : "none"/s,
  /final_ga_audit_unblocked: complete/s,
  /can_promote_claim: false/s,
  /can_certify_ga: false/s
]) {
  assert.match(closureSource, pattern, "Task369 must keep Task300 as the aggregate proof-breadth closure verifier");
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
  assert.match(finalAuditSource, pattern, "Task369 must keep Task301 as final-audit proof-breadth binding authority");
}

const certificateSource = repoFile("services/comathd/src/release/goal3-ga-certificate.ts");
for (const pattern of [
  /recordGoal3GaCertificate/s,
  /assertReadyCertificationReview/s,
  /claim_promotion_requires_ordinary_gate/s
]) {
  assert.match(certificateSource, pattern, "Task369 must keep Task303 certificate issuance isolated");
}

const piSourceTree = repoTreeText("extensions/comath-pi/src");
for (const forbiddenPattern of [
  /selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-recheck/s,
  /selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-bridge/s,
  /selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck/s,
  /selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge/s,
  /closure-exec-packaging-results-closure-exec-packaging-results-closure-exec-packaging-results-closure-recheck-to-execution-check-debug/s,
  /goal3SelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResults/s
]) {
  assert.doesNotMatch(piSourceTree, forbiddenPattern, "Task369 must keep Task367/368 service-only across the whole Pi source tree");
}

for (const [path, pattern] of [
  ["README.md", /Task369.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging results.*check-debug/s],
  ["TODO.md", /Task369.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging results.*check-debug/s],
  ["REVIEW.md", /Goal 3 Task 369/s],
  ["AGENTS.md", /Task369.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging results.*check-debug/s],
  ["docs/architecture/ga-release-criteria.md", /Task369.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging results.*check-debug/s],
  ["docs/architecture/threat-model.md", /Task369.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging results.*check-debug/s],
  ["docs/architecture/acceptance-matrix.md", /Task369.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging results.*check-debug/s],
  ["docs/progress/goal-3-ga-gap-matrix.md", /Task369.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging results.*check-debug/s],
  ["goal-3/tasks.md", /Task369.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging results.*check-debug/s]
]) {
  assert.match(repoFile(path), pattern, `${path} must document Task369 selected-tranche closure recheck-to-execution check-debug`);
}

for (const path of [
  "AGENTS.md",
  "TODO.md",
  "docs/architecture/threat-model.md",
  "docs/progress/goal-3-ga-gap-matrix.md"
]) {
  assert.match(
    repoFile(path),
    /Task369[\s\S]{0,900}no route[\s\S]{0,900}no Pi[\s\S]{0,900}no Lean/s,
    `${path} must explicitly preserve Task369 as regression-only no-route/no-Pi/no-Lean coverage`
  );
}

assert.match(
  repoFile("goal-3/tasks.md"),
  /Progress estimate after Task369:/s,
  "Task369 tracker completion record must include the post-task full-GA progress estimate"
);

console.log("Goal 3 Task369 selected-tranche closure recheck-to-execution check-debug tests passed.");
