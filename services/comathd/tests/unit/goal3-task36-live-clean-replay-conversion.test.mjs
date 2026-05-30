import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  runGoal3GaPositiveMatrixLiveReplayConversion
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task36-live-conversion-"));

function canonicalJson(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  return `{${Object.entries(value)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
    .join(",")}}`;
}

const report = runGoal3GaPositiveMatrixLiveReplayConversion({
  projectRoot,
  taskIds: ["PM-002"],
  liveReplay: () => ({
    ok: false,
    blocker_code: "lean_toolchain_unavailable_for_live_replay",
    detail: "simulated Task 36 live replay preflight failure"
  })
});

assert.equal(report.schema_version, "comath.goal3_positive_live_replay_conversion.v1");
assert.equal(report.total_required_tasks, 100);
assert.deepEqual(report.conversion_scope.task_ids, ["PM-002"]);
assert.equal(report.summary.clean_replay_passed, 0);
assert.equal(report.summary.replayable_blocker, 1);
assert.equal(report.summary.promoted_count, 0);
assert.equal(report.results.length, 1);

const result = report.results[0];
assert.equal(result.task_id, "PM-002");
assert.equal(result.category, "Nat/List");
assert.equal(result.terminal_classification, "replayable_blocker");
assert.equal(result.proof_authority, "none");
assert.equal(result.can_promote_claim, false);
assert.equal(result.evidence_binding.formal_spec_lock_hash.length, 64);
assert.equal(result.evidence_binding.assumption_ledger_hash.length, 64);
assert.equal(result.evidence_binding.dependency_lock_hash.length, 64);
assert.equal(result.evidence_binding.artifact_hashes_sha256.length, 64);
assert.equal(result.evidence_binding.lean_run_manifest_id, "");
assert.equal(result.evidence_binding.final_replay_manifest_id, "");
assert.ok(result.blockers.includes("live_clean_replay_attempt_failed"));
assert.ok(result.blockers.includes("lean_toolchain_unavailable_for_live_replay"));

assert.equal(result.live_replay.schema_version, "comath.goal3_positive_live_replay_conversion_certificate.v1");
assert.equal(result.live_replay.task_id, "PM-002");
assert.equal(result.live_replay.attempt_status, "live_replay_failed");
assert.equal(result.live_replay.terminal_classification, "replayable_blocker");
assert.equal(result.live_replay.proof_authority, "none");
assert.equal(result.live_replay.can_promote_claim, false);
assert.equal(result.live_replay.live_replay_attempted, true);
assert.equal(result.live_replay.blocker_code, "lean_toolchain_unavailable_for_live_replay");
assert.equal(result.live_replay.blocker_detail, "simulated Task 36 live replay preflight failure");
assert.equal(result.live_replay.real_lean_source_path, "");
assert.equal(result.live_replay.lean_run_manifest_v3_path, "");
assert.equal(result.live_replay.final_replay_manifest_v3_path, "");
assert.equal(result.live_replay.structured_audit_path, "");
assert.equal(result.live_replay.third_party_replay_pack_path, "");
assert.equal(result.live_replay.network_policy_final_replay, "disabled");
assert.equal(result.live_replay.uses_production_theorem_family_recognizer, false);
assert.equal(result.live_replay.uses_controlled_nat_linear_synthesis, false);
assert.equal(result.live_replay.uses_default_assumptions, false);
assert.equal(result.live_replay.cas_literature_search_or_vote_proof_authority, false);
assert.equal(result.live_replay.direct_promotion_path, false);
assert.match(
  result.live_replay.certificate_path,
  /^\.comath\/release\/positive_matrix\/PM-002\/live_replay_conversion_certificate\.json$/
);

const certificatePath = join(projectRoot, result.live_replay.certificate_path);
assert.ok(existsSync(certificatePath), "Task 36 must write the live replay conversion certificate under the caller project root");
const certificateOnDisk = JSON.parse(readFileSync(certificatePath, "utf8"));
assert.deepEqual(certificateOnDisk, result.live_replay);
assert.equal(
  result.evidence_binding.artifact_hashes_sha256,
  createHash("sha256").update(canonicalJson(certificateOnDisk), "utf8").digest("hex"),
  "artifact binding must hash the live replay conversion certificate"
);

assert.equal(
  existsSync(join(projectRoot, ".comath/release/positive_matrix/PM-003/live_replay_conversion_certificate.json")),
  false,
  "Task 36 must not widen beyond the requested PM-002 tranche"
);

const forgedSuccessProjectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task36-forged-success-"));
const forgedSuccess = runGoal3GaPositiveMatrixLiveReplayConversion({
  projectRoot: forgedSuccessProjectRoot,
  taskIds: ["PM-002"],
  liveReplay: () => ({
    ok: true,
    real_lean_source_path: "",
    lean_run_manifest_v3_path: "",
    final_replay_manifest_v3_path: "",
    structured_audit_path: "",
    third_party_replay_pack_path: "",
    lean_run_manifest_id: "",
    final_replay_manifest_id: ""
  })
});

assert.equal(forgedSuccess.summary.clean_replay_passed, 0, "forged success metadata must not count as clean replay");
assert.equal(forgedSuccess.summary.replayable_blocker, 1);
assert.equal(forgedSuccess.results[0].terminal_classification, "replayable_blocker");
assert.equal(forgedSuccess.results[0].proof_authority, "none");
assert.equal(forgedSuccess.results[0].can_promote_claim, false);
assert.ok(forgedSuccess.results[0].blockers.includes("live_replay_success_missing_evidence"));
assert.equal(forgedSuccess.results[0].live_replay.attempt_status, "live_replay_failed");
assert.equal(forgedSuccess.results[0].live_replay.blocker_code, "live_replay_success_missing_evidence");

const missingEvidenceProjectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task36-missing-evidence-"));
const missingEvidenceSuccess = runGoal3GaPositiveMatrixLiveReplayConversion({
  projectRoot: missingEvidenceProjectRoot,
  taskIds: ["PM-002"],
  liveReplay: () => ({
    ok: true,
    real_lean_source_path: ".comath/release/positive_matrix/PM-002/Target.lean",
    lean_run_manifest_v3_path: ".comath/release/positive_matrix/PM-002/LRUN.manifest.json",
    final_replay_manifest_v3_path: ".comath/release/positive_matrix/PM-002/final_replay_manifest_v3.json",
    structured_audit_path: ".comath/release/positive_matrix/PM-002/structured_audit.json",
    third_party_replay_pack_path: ".comath/release/positive_matrix/PM-002/replay_pack",
    lean_run_manifest_id: "LRUN-PM-002",
    final_replay_manifest_id: "RPLY-PM-002"
  })
});

assert.equal(missingEvidenceSuccess.summary.clean_replay_passed, 0, "nonexistent evidence paths must not count as clean replay");
assert.equal(missingEvidenceSuccess.results[0].terminal_classification, "replayable_blocker");
assert.ok(missingEvidenceSuccess.results[0].blockers.includes("live_replay_success_evidence_unreadable"));
assert.equal(missingEvidenceSuccess.results[0].live_replay.blocker_code, "live_replay_success_evidence_unreadable");

console.log("Goal 3 Task 36 live clean-replay conversion tests passed.");
