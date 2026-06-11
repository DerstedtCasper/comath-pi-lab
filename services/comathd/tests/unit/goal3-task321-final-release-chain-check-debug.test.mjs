import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getComathdStatus } from "../../dist/index.js";

function repoFile(relativePath) {
  const here = dirname(fileURLToPath(import.meta.url));
  return readFileSync(join(here, "../../../..", relativePath), "utf8");
}

const finalReleaseCapabilities = [
  "goal3_ga_certificate_source_bound_consumption_gate",
  "goal3_source_release_os_immutability_attestation_gate",
  "goal3_durable_transport_release_signoff_prerequisite_gate",
  "goal3_final_release_signoff_decision_gate",
  "goal3_durable_transport_release_signoff_verification_gate",
  "goal3_final_release_signoff_task319_consumption_gate",
  "goal3_final_release_chain_check_debug"
];

const finalReleaseSuites = [
  "goal3-task306-ga-certificate-source-bound-consumption.test.mjs",
  "goal3-task315-source-release-os-immutability-attestation.test.mjs",
  "goal3-task317-ga-transport-chain-freshness-review.test.mjs",
  "goal3-task318-final-release-signoff-decision.test.mjs",
  "goal3-task319-durable-transport-release-signoff-verification.test.mjs",
  "goal3-task320-final-release-signoff-task319-consumption.test.mjs",
  "goal3-task321-final-release-chain-check-debug.test.mjs"
];

const status = getComathdStatus();
for (const capability of finalReleaseCapabilities) {
  assert.equal(
    status.capabilities.includes(capability),
    true,
    `Task321 final release-chain check-debug must keep capability advertised: ${capability}`
  );
}

const smoke = repoFile("scripts/phase0-smoke.mjs");
for (const suite of finalReleaseSuites) {
  assert.equal(smoke.includes(suite), true, `phase0 smoke must discover final release-chain suite ${suite}`);
}

const finalSignoffSource = repoFile("services/comathd/src/release/goal3-final-release-signoff-decision.ts");
for (const pattern of [
  /durable_transport_signoff_verification_id/s,
  /durable_transport_signoff_verification_path/s,
  /external_durable_transport_evidence_artifact/s,
  /assertFreshTransportEvidence\(body\.fresh_until,\s*body\.freshness_window_seconds,\s*"durable transport verification"\)/s,
  /body\.proof_authority !== "none"/s,
  /body\.can_certify_ga !== false/s,
  /read\.body\.proof_authority !== "lean_kernel_clean_replay"/s,
  /read\.body\.can_certify_ga !== true/s,
  /proof_authority: "none"/s,
  /can_certify_ga: false/s
]) {
  assert.match(
    finalSignoffSource,
    pattern,
    "Task321 must keep final signoff bound to Task319 verification, Task306 consumption, freshness checks, and no-authority output"
  );
}

const transportVerificationSource = repoFile(
  "services/comathd/src/release/goal3-durable-transport-release-signoff-verification.ts"
);
for (const pattern of [
  /schema_version !== "comath\.goal3_external_durable_transport_evidence\.v1"/s,
  /custom_transport_implementation !== false/s,
  /record\.proof_authority !== "none"/s,
  /body\.proof_authority !== "none"/s,
  /ga_release_signoff_ready: false/s,
  /proof_authority: "none"/s
]) {
  assert.match(
    transportVerificationSource,
    pattern,
    "Task321 must keep Task319 transport verification as non-authoritative maintained-external evidence"
  );
}

const task320Suite = repoFile(
  "services/comathd/tests/unit/goal3-task320-final-release-signoff-task319-consumption.test.mjs"
);
for (const pattern of [
  /0320-MISMATCH/s,
  /0320-NONCANONICAL-EVIDENCE/s,
  /0320-EXPIRED/s,
  /0320-ROUTE-OVERCLAIM/s,
  /durable_transport_signoff_verification_current,\s*true/s,
  /external_durable_transport_evidence_bound,\s*true/s,
  /ga_release_signoff_ready,\s*true/s,
  /proof_authority,\s*"none"/s,
  /can_certify_ga,\s*false/s
]) {
  assert.match(
    task320Suite,
    pattern,
    "Task321 must keep Task320 coverage for mismatched, noncanonical, expired, route-overclaim, and no-authority signoff cases"
  );
}

for (const [path, pattern] of [
  ["README.md", /Task321.*final release-chain check-debug/s],
  ["TODO.md", /Task321.*final release-chain check-debug/s],
  ["REVIEW.md", /Goal 3 Task 321/s],
  ["AGENTS.md", /Task321.*final release-chain check-debug/s],
  ["docs/architecture/ga-release-criteria.md", /Task321.*final release-chain check-debug/s],
  ["docs/architecture/threat-model.md", /Task321.*final release-chain check-debug/s],
  ["docs/architecture/acceptance-matrix.md", /Task321.*final release-chain check-debug/s]
]) {
  assert.match(repoFile(path), pattern, `${path} must document Task321 final release-chain check-debug`);
}

console.log("Goal 3 Task321 final release-chain check-debug tests passed.");
