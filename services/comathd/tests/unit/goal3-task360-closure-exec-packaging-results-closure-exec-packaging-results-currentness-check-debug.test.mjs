import assert from "node:assert/strict";
import { dirname, join, relative } from "node:path";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getComathdStatus } from "../../dist/index.js";

const task360Suite =
  "tests/unit/goal3-task360-closure-exec-packaging-results-closure-exec-packaging-results-currentness-check-debug.test.mjs";

function repoFile(relativePath) {
  const here = dirname(fileURLToPath(import.meta.url));
  return readFileSync(join(here, "../../../..", relativePath), "utf8");
}

function repoPath(relativePath) {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "../../../..", relativePath);
}

function repoDirEntries(relativePath) {
  const here = dirname(fileURLToPath(import.meta.url));
  return readdirSync(join(here, "../../../..", relativePath), { withFileTypes: true }).map((entry) => entry.name);
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

const status = getComathdStatus();
for (const capability of [
  "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through",
  "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up",
  "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_check_debug",
  "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up",
  "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_check_debug",
  "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck",
  "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge",
  "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_check_debug",
  "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through",
  "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up",
  "goal3_release_candidate_proof_breadth_closure_gate",
  "goal3_final_ga_audit_gate",
  "goal3_ga_certificate_gate"
]) {
  assert.equal(
    status.capabilities.includes(capability),
    true,
    `Task360 closure execution packaging results currentness check-debug must keep capability advertised: ${capability}`
  );
}

const smoke = repoFile("scripts/phase0-smoke.mjs");
for (const suite of [
  "goal3-task354-closure-exec-packaging-results-currentness-check-debug.test.mjs",
  "goal3-task357-closure-results-to-execution-check-debug.test.mjs",
  "goal3-task358-closure-exec-packaging-results-closure-exec-packaging-follow-through.test.mjs",
  "goal3-task359-closure-exec-packaging-results-closure-exec-packaging-results-follow-up.test.mjs",
  "goal3-task360-closure-exec-packaging-results-closure-exec-packaging-results-currentness-check-debug.test.mjs",
  "goal3-task352-closure-exec-packaging-follow-through.test.mjs",
  "goal3-task353-closure-exec-packaging-results-follow-up.test.mjs",
  "goal3-task356-closure-exec-packaging-results-closure-execution-bridge.test.mjs",
  "goal3-task300-proof-breadth-closure-verifier.test.mjs",
  "goal3-task301-final-ga-audit-proof-breadth-closure-binding.test.mjs",
  "goal3-task303-service-owned-ga-certificate-gate.test.mjs"
]) {
  assert.equal(
    smoke.includes(suite),
    true,
    `phase0 smoke must discover Task360 closure execution packaging results currentness suite ${suite}`
  );
}

const defaultRunner = repoFile("services/comathd/scripts/run-default-tests.mjs");
assert.equal(
  defaultRunner.includes(
    task360Suite
  ),
  false,
  "Task360 must be discovered by the default comathd runner, not special-cased or skipped"
);
assert.equal(
  discoveredComathdDefaultTests().includes(task360Suite),
  true,
  "Task360 must be included by the default comathd recursive test discovery contract"
);

const indexSource = repoFile("services/comathd/src/index.ts");
for (const pattern of [
  /goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-follow-through\.js/s,
  /goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-follow-up\.js/s,
  /goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-follow-up\.js/s,
  /goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-follow-through\.js/s,
  /goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-follow-up\.js/s,
  /goal3-proof-breadth-closure\.js/s,
  /goal3-final-ga-audit\.js/s,
  /goal3-ga-certificate\.js/s
]) {
  assert.match(indexSource, pattern, "Task360 must keep adjacent release modules exported");
}

const apiServerSource = repoFile("services/comathd/src/api/server.ts");
const task358RouteBlock = apiServerSource.match(
  /POST \/release\/goal3\/selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-follow-through[\s\S]{0,1200}?recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough[\s\S]{0,1200}?selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through/s
)?.[0];
assert.ok(task358RouteBlock, "Task360 must keep Task358 route string, handler, and response payload connected in one server block");
const task359RouteBlock = apiServerSource.match(
  /POST \/release\/goal3\/selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-follow-up[\s\S]{0,1200}?recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp[\s\S]{0,1200}?selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up/s
)?.[0];
assert.ok(task359RouteBlock, "Task360 must keep Task359 route string, handler, and response payload connected in one server block");
for (const pattern of [
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough/s,
  /POST \/release\/goal3\/selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-follow-through/s,
  /selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp/s,
  /POST \/release\/goal3\/selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-follow-up/s,
  /selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsFollowUp/s,
  /POST \/release\/goal3\/selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-follow-up/s,
  /recordGoal3ReleaseCandidateProofBreadthClosure/s,
  /POST \/release\/goal3\/proof-breadth-closure/s,
  /recordGoal3FinalGaAudit/s,
  /POST \/release\/goal3\/final-ga-audit/s,
  /recordGoal3GaCertificate/s,
  /POST \/release\/goal3\/ga-certificate/s
]) {
  assert.match(apiServerSource, pattern, "Task360 must keep Task358/359/353/300/301/303 routes wired");
}

for (const forbiddenPattern of [
  /Task360/s,
  /task360/s,
  /closure-exec-packaging-results-closure-exec-packaging-results-currentness-check-debug/s,
  /closure_execution_packaging_results_currentness_check_debug/s,
  /ClosureExecutionPackagingResultsCurrentnessCheckDebug/s,
  /POST \/release\/goal3\/[^"]*check-debug/s
]) {
  assert.doesNotMatch(
    apiServerSource,
    forbiddenPattern,
    "Task360 must remain regression-only and must not add a service check-debug route"
  );
}

const releaseEntries = repoDirEntries("services/comathd/src/release");
for (const forbiddenReleaseEntryPattern of [
  /task360/i,
  /check-debug/i,
  /currentness-check-debug/i,
  /closure-exec-packaging-results-closure-exec-packaging-results/i
]) {
  assert.equal(
    releaseEntries.some((entry) => forbiddenReleaseEntryPattern.test(entry)),
    false,
    "Task360 must not add a release writer module"
  );
}

const task358Source = repoFile(
  "services/comathd/src/release/goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-follow-through.ts"
);
for (const pattern of [
  /readTask356Artifact/s,
  /assertTask356InputPath/s,
  /assertCurrentArtifactReference/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingFollowThrough/s,
  /GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_FOLLOW_THROUGH_STALE_TASK356/s,
  /GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_FOLLOW_THROUGH_INVALID_TASK356/s,
  /delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id:/s,
  /delegated_selected_tranche_next_closure_packaging_results_closure_execution_bridge_id:/s,
  /delegated_selected_tranche_next_closure_execution_bridge_id:/s,
  /caller_proof_or_ga_authority_material_ignored/s,
  /record\.proof_breadth_closure_id !== undefined/s,
  /record\.final_ga_audit_id !== undefined/s,
  /record\.ga_certificate_id !== undefined/s,
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
  /release\.goal3_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_recorded/s
]) {
  assert.match(task358Source, pattern, "Task360 must keep Task358 Task356-bound, Task352/346/340/334-delegating, and non-authoritative");
}

for (const forbiddenPattern of [
  /from "\.\/goal3-proof-breadth-closure\.js"/s,
  /recordGoal3ReleaseCandidateProofBreadthClosure\(/s,
  /recordGoal3ReleaseCandidateProofBreadthExecutionBridge\(/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextExecutionBridge/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosureExecutionBridge/s,
  /recordGoal3ReleaseCandidateProofBreadthTaskLocalPackagingFollowThrough/s,
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
    task358Source,
    forbiddenPattern,
    "Task360 must keep Task358 from running Lean, bypassing delegated packaging, or fabricating closure/final-audit/certificate authority"
  );
}
assert.equal(
  (task358Source.match(/writeFileSync\(/g) ?? []).length,
  1,
  "Task360 must keep Task358 to one direct runtime write: its own append-only follow-through artifact"
);

const task359Source = repoFile(
  "services/comathd/src/release/goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-follow-up.ts"
);
for (const pattern of [
  /readTask358Artifact/s,
  /assertTask358InputPath/s,
  /assertCurrentArtifactReference/s,
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsFollowUp/s,
  /errorCode\("STALE_TASK358"\)/s,
  /errorCode\("INVALID_TASK358"\)/s,
  /TASK353_DELEGATED_MISMATCH/s,
  /delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id:/s,
  /delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id:/s,
  /selected_packaging_report_artifacts_current: delegated\.selected_packaging_report_artifacts_current/s,
  /ready_for_proof_breadth_closure_recheck: delegated\.ready_for_proof_breadth_closure_recheck/s,
  /caller_proof_or_ga_authority_material_ignored/s,
  /record\.proof_breadth_closure_id !== undefined/s,
  /record\.final_ga_audit_id !== undefined/s,
  /record\.ga_certificate_id !== undefined/s,
  /task358_blocker_reason_redacted/s,
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
  /release\.goal3_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_recorded/s
]) {
  assert.match(task359Source, pattern, "Task360 must keep Task359 Task358-bound, Task353/347/341/335-delegating, and non-authoritative");
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
  /proof_breadth_closure_id\s*:/s,
  /final_ga_audit_id\s*:/s,
  /ga_certificate_id\s*:/s
]) {
  assert.doesNotMatch(
    task359Source,
    forbiddenPattern,
    "Task360 must keep Task359 from running Lean, calling producer paths directly, or fabricating closure/final-audit/certificate authority"
  );
}
assert.equal(
  (task359Source.match(/writeFileSync\(/g) ?? []).length,
  1,
  "Task360 must keep Task359 to one direct runtime write: its own append-only follow-up artifact"
);

const task352Source = repoFile(
  "services/comathd/src/release/goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-follow-through.ts"
);
for (const pattern of [
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingFollowThrough/s,
  /delegated_selected_tranche_next_closure_execution_bridge_id:/s,
  /selected_tranche_next_closure_packaging_follow_through_id:/s,
  /selected_tranche_next_packaging_follow_through_id: delegated\.selected_tranche_next_packaging_follow_through_id/s,
  /selected_tranche_next_packaging_follow_through_path: delegated\.selected_tranche_next_packaging_follow_through_path/s,
  /selected_tranche_next_packaging_follow_through_artifact:\s*delegated\.selected_tranche_next_packaging_follow_through_artifact/s,
  /task_local_packaging_follow_through_id: delegated\.task_local_packaging_follow_through_id/s,
  /task_local_packaging_follow_through_path: delegated\.task_local_packaging_follow_through_path/s,
  /task_local_packaging_follow_through_artifact: delegated\.task_local_packaging_follow_through_artifact/s,
  /task_local_packaging_follow_through_status: delegated\.task_local_packaging_follow_through_status/s,
  /proof_authority: "none"/s,
  /can_certify_ga: false/s
]) {
  assert.match(task352Source, pattern, "Task360 must keep Task352 as the delegated closure execution packaging layer");
}

const task353Source = repoFile(
  "services/comathd/src/release/goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-follow-up.ts"
);
for (const pattern of [
  /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsFollowUp/s,
  /artifactForDelegatedTask347/s,
  /delegated_selected_tranche_next_closure_packaging_results_follow_up_id:\s*delegated\.selected_tranche_next_closure_packaging_results_follow_up_id/s,
  /delegated_selected_tranche_next_closure_packaging_results_follow_up_path:\s*delegated\.selected_tranche_next_closure_packaging_results_follow_up_path/s,
  /selected_tranche_next_packaging_results_follow_up_id:\s*delegated\.selected_tranche_next_packaging_results_follow_up_id/s,
  /selected_tranche_next_packaging_results_follow_up_path:\s*delegated\.selected_tranche_next_packaging_results_follow_up_path/s,
  /selected_tranche_next_packaging_results_follow_up_artifact:\s*delegated\.selected_tranche_next_packaging_results_follow_up_artifact/s,
  /selected_tranche_next_packaging_follow_through_id: delegated\.selected_tranche_next_packaging_follow_through_id/s,
  /task_local_packaging_follow_through_id: delegated\.task_local_packaging_follow_through_id/s,
  /selected_packaging_report_artifacts_current: true/s,
  /ready_for_proof_breadth_closure_recheck:/s,
  /proof_authority: "none"/s,
  /can_certify_ga: false/s
]) {
  assert.match(task353Source, pattern, "Task360 must keep Task353 as the delegated packaging-results currentness layer");
}

const closureSource = repoFile("services/comathd/src/release/goal3-proof-breadth-closure.ts");
for (const pattern of [
  /createGoal3GaPositiveTaskManifest/s,
  /proof_authority: complete \? "lean_kernel_clean_replay" : "none"/s,
  /final_ga_audit_unblocked: complete/s,
  /can_promote_claim: false/s,
  /can_certify_ga: false/s
]) {
  assert.match(closureSource, pattern, "Task360 must keep Task300 as the aggregate proof-breadth closure verifier");
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
  assert.match(finalAuditSource, pattern, "Task360 must keep Task301 as final-audit proof-breadth binding authority");
}

const certificateSource = repoFile("services/comathd/src/release/goal3-ga-certificate.ts");
for (const pattern of [
  /recordGoal3GaCertificate/s,
  /assertReadyCertificationReview/s,
  /claim_promotion_requires_ordinary_gate/s
]) {
  assert.match(certificateSource, pattern, "Task360 must keep Task303 certificate issuance isolated");
}

const piSourceTree = repoTreeText("extensions/comath-pi");
for (const forbiddenPattern of [
  /selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-follow-through/s,
  /selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-follow-up/s,
  /selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through/s,
  /selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up/s,
  /closure-exec-packaging-results-closure-exec-packaging-results-currentness-check-debug/s,
  /goal3SelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackaging/s
]) {
  assert.doesNotMatch(piSourceTree, forbiddenPattern, "Task360 must keep Task358/359 service-only across the whole Pi source tree");
}

for (const [path, pattern] of [
  ["README.md", /Task360.*selected-tranche.*closure execution packaging results.*currentness check-debug/s],
  ["TODO.md", /Task360.*selected-tranche.*closure execution packaging results.*currentness check-debug/s],
  ["REVIEW.md", /Goal 3 Task 360/s],
  ["AGENTS.md", /Task360.*selected-tranche.*closure execution packaging results.*currentness check-debug/s],
  ["docs/architecture/ga-release-criteria.md", /Task360.*selected-tranche.*closure execution packaging results.*currentness check-debug/s],
  ["docs/architecture/threat-model.md", /Task360.*selected-tranche.*closure execution packaging results.*currentness check-debug/s],
  ["docs/architecture/acceptance-matrix.md", /Task360.*selected-tranche.*closure execution packaging results.*currentness check-debug/s],
  ["docs/progress/goal-3-ga-gap-matrix.md", /Task360.*selected-tranche.*closure execution packaging results.*currentness check-debug/s],
  ["goal-3/tasks.md", /Task360.*selected-tranche.*closure execution packaging results.*currentness check-debug/s]
]) {
  assert.match(repoFile(path), pattern, `${path} must document Task360 selected-tranche closure execution packaging results currentness check-debug`);
}

for (const path of [
  "AGENTS.md",
  "TODO.md",
  "docs/architecture/threat-model.md",
  "docs/progress/goal-3-ga-gap-matrix.md"
]) {
  assert.match(
    repoFile(path),
    /Task360[\s\S]{0,900}no packaging\/currentness artifact writer/s,
    `${path} must explicitly preserve Task360 as no packaging/currentness artifact writer coverage`
  );
}

assert.match(
  repoFile("goal-3/tasks.md"),
  /Progress estimate after Task360:/s,
  "Task360 tracker completion record must include the post-task full-GA progress estimate"
);

console.log("Goal 3 Task360 selected-tranche closure execution packaging results currentness check-debug tests passed.");
