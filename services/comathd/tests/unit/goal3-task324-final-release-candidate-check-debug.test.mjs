import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getComathdStatus } from "../../dist/index.js";

function repoFile(relativePath) {
  const here = dirname(fileURLToPath(import.meta.url));
  return readFileSync(join(here, "../../../..", relativePath), "utf8");
}

const releaseCandidateCapabilities = [
  "goal3_final_release_chain_check_debug",
  "goal3_final_release_signoff_certification_boundary_review_gate",
  "goal3_final_release_candidate_closure_audit_gate",
  "goal3_final_release_candidate_check_debug",
  "goal3_ga_certificate_source_bound_consumption_gate",
  "goal3_source_release_os_immutability_attestation_gate",
  "goal3_durable_transport_release_signoff_prerequisite_gate",
  "goal3_durable_transport_release_signoff_verification_gate",
  "goal3_final_release_signoff_decision_gate",
  "goal3_final_release_signoff_task319_consumption_gate"
];

const releaseCandidateSuites = [
  "goal3-task306-ga-certificate-source-bound-consumption.test.mjs",
  "goal3-task315-source-release-os-immutability-attestation.test.mjs",
  "goal3-task317-ga-transport-chain-freshness-review.test.mjs",
  "goal3-task318-final-release-signoff-decision.test.mjs",
  "goal3-task319-durable-transport-release-signoff-verification.test.mjs",
  "goal3-task320-final-release-signoff-task319-consumption.test.mjs",
  "goal3-task321-final-release-chain-check-debug.test.mjs",
  "goal3-task322-final-release-signoff-certification-boundary-review.test.mjs",
  "goal3-task323-final-release-candidate-closure-audit.test.mjs",
  "goal3-task324-final-release-candidate-check-debug.test.mjs"
];

const status = getComathdStatus();
for (const capability of releaseCandidateCapabilities) {
  assert.equal(
    status.capabilities.includes(capability),
    true,
    `Task324 final release-candidate check-debug must keep capability advertised: ${capability}`
  );
}

const smoke = repoFile("scripts/phase0-smoke.mjs");
for (const suite of releaseCandidateSuites) {
  assert.equal(smoke.includes(suite), true, `phase0 smoke must discover final release-candidate suite ${suite}`);
}

const closureAuditSource = repoFile(
  "services/comathd/src/release/goal3-final-release-candidate-closure-audit.ts"
);
for (const pattern of [
  /const allowedInputKeys = new Set\(\[[\s\S]*"certification_boundary_review_id"[\s\S]*"certification_boundary_review_path"[\s\S]*"certification_boundary_review_sha256"[\s\S]*"requested_audit_mode"[\s\S]*\]\);/s,
  /body\.schema_version !== "comath\.goal3_final_release_signoff_certification_boundary_review\.v1"/s,
  /body\.certification_boundary_review_status !== "reviewed_final_release_signoff_certification_boundary"/s,
  /body\.final_release_signoff_current !== true/s,
  /body\.ga_release_signoff_ready !== true/s,
  /body\.ga_certificate_consumption_current !== true/s,
  /body\.durable_transport_signoff_verification_current !== true/s,
  /body\.external_durable_transport_evidence_current !== true/s,
  /body\.source_release_os_immutability_attestation_current !== true/s,
  /body\.source_archive_current !== true/s,
  /body\.operator_evidence_current !== true/s,
  /body\.proof_authority !== "none"/s,
  /body\.can_promote_claim !== false/s,
  /body\.can_certify_ga !== false/s,
  /body\.boundary_review_is_certificate !== false/s,
  /body\.ga_certificate_issued !== false/s,
  /const policyInspection = artifactReference\([\s\S]*"goal3_source_release_external_provider_policy_inspection"[\s\S]*\);/s,
  /assertArtifactCurrent\(projectRoot,\s*policyInspection,\s*"policy inspection"\)/s,
  /assertExternalEvidence\(\s*externalEvidence\.body,/s,
  /readArtifactBytes\(projectRoot,\s*boundaryRefs\.sourceArchiveArtifact,\s*"source archive"\)/s,
  /assertOperatorEvidence\(operatorEvidence\.body,/s,
  /proof_authority: "none"/s,
  /can_promote_claim: false/s,
  /can_certify_ga: false/s,
  /release_candidate_closure_audit_is_certificate: false/s,
  /ga_certificate_issued: false/s,
  /claim_promotion_requires_ordinary_gate: true/s
]) {
  assert.match(
    closureAuditSource,
    pattern,
    "Task324 must keep Task323 closure audit bound to Task322/320/306/319/317/315 currentness and no-authority output"
  );
}

const task323Suite = repoFile(
  "services/comathd/tests/unit/goal3-task323-final-release-candidate-closure-audit.test.mjs"
);
for (const pattern of [
  /0323-ROUTE-OVERCLAIM/s,
  /Task323 must reject Task322-like material that omits the Task315 policy-inspection chain/s,
  /Task323 must reject Task322-like material that omits the Task317 nested transport chain/s,
  /release_candidate_closure_audit_is_certificate,\s*false/s,
  /ga_certificate_issued,\s*false/s,
  /can_certify_ga,\s*false/s,
  /proof_authority,\s*"none"/s
]) {
  assert.match(
    task323Suite,
    pattern,
    "Task324 must keep Task323 focused regression coverage for route overclaims, reduced chains, and non-certifying output"
  );
}

const boundaryReviewSource = repoFile(
  "services/comathd/src/release/goal3-final-release-signoff-certification-boundary-review.ts"
);
for (const pattern of [
  /proof_authority: "none"/s,
  /can_promote_claim: false/s,
  /can_certify_ga: false/s,
  /boundary_review_is_certificate: false/s,
  /ga_certificate_issued: false/s,
  /recordGoal3FinalReleaseSignoffCertificationBoundaryReview/s
]) {
  assert.match(
    boundaryReviewSource,
    pattern,
    "Task324 must keep Task322 boundary review as provenance rather than certificate authority"
  );
}

const apiServerSource = repoFile("services/comathd/src/api/server.ts");
for (const pattern of [
  /POST \/release\/goal3\/final-release-signoff-certification-boundary-review/s,
  /POST \/release\/goal3\/final-release-candidate-closure-audit/s,
  /recordGoal3FinalReleaseSignoffCertificationBoundaryReview/s,
  /recordGoal3FinalReleaseCandidateClosureAudit/s
]) {
  assert.match(apiServerSource, pattern, "Task324 must keep Task322/323 service routes wired");
}

for (const [path, pattern] of [
  ["README.md", /Task324.*final release-candidate check-debug/s],
  ["TODO.md", /Task324.*final release-candidate check-debug/s],
  ["REVIEW.md", /Goal 3 Task 324/s],
  ["AGENTS.md", /Task324.*final release-candidate check-debug/s],
  ["docs/architecture/ga-release-criteria.md", /Task324.*final release-candidate check-debug/s],
  ["docs/architecture/threat-model.md", /Task324.*final release-candidate check-debug/s],
  ["docs/architecture/acceptance-matrix.md", /Task324.*final release-candidate check-debug/s]
]) {
  assert.match(repoFile(path), pattern, `${path} must document Task324 final release-candidate check-debug`);
}

console.log("Goal 3 Task324 final release-candidate check-debug tests passed.");
