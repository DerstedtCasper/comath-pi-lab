import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  runGoal3GaPositiveMatrixTranche
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task34-positive-tranche-"));

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

const tranche = runGoal3GaPositiveMatrixTranche({
  projectRoot,
  startTaskId: "PM-090",
  endTaskId: "PM-100"
});

assert.equal(tranche.schema_version, "comath.goal3_positive_matrix_tranche.v1");
assert.equal(tranche.total_required_tasks, 100);
assert.equal(tranche.tranche_scope.start_task_id, "PM-090");
assert.equal(tranche.tranche_scope.end_task_id, "PM-100");
assert.equal(tranche.tranche_scope.expected_count, 11);
assert.equal(tranche.results.length, 11);
assert.deepEqual(
  tranche.results.map((result) => result.task_id),
  ["PM-090", "PM-091", "PM-092", "PM-093", "PM-094", "PM-095", "PM-096", "PM-097", "PM-098", "PM-099", "PM-100"]
);
assert.equal(tranche.summary.clean_replay_passed, 0, "Task 34 must not fake clean replay for PM-090 through PM-100");
assert.equal(tranche.summary.replayable_blocker, 11);
assert.equal(tranche.summary.promoted_count, 0);
assert.equal(tranche.next_batch_scope.start_after_task_id, "PM-100");
assert.equal(tranche.next_batch_scope.remaining_tasks, 0);

const byTask = new Map(tranche.results.map((result) => [result.task_id, result]));
assert.equal(byTask.get("PM-090").category, "theorem-search-assisted", "PM-090 must close the theorem-search-assisted segment");
for (const taskId of ["PM-091", "PM-092", "PM-093", "PM-094", "PM-095", "PM-096", "PM-097", "PM-098", "PM-099", "PM-100"]) {
  assert.equal(byTask.get(taskId).category, "tactic repair", `${taskId} must stay in the tactic repair tranche segment`);
}

for (const result of tranche.results) {
  assert.equal(result.terminal_classification, "replayable_blocker", `${result.task_id} must remain non-promotional`);
  assert.equal(result.proof_authority, "none", `${result.task_id} must not use non-Lean proof authority`);
  assert.equal(result.can_promote_claim, false, `${result.task_id} must not promote without clean replay`);
  assert.equal(result.evidence_binding.formal_spec_lock_hash.length, 64, `${result.task_id} must bind FormalSpecLock input hash`);
  assert.equal(result.evidence_binding.assumption_ledger_hash.length, 64, `${result.task_id} must bind AssumptionLedger input hash`);
  assert.equal(result.evidence_binding.dependency_lock_hash.length, 64, `${result.task_id} must bind dependency-lock expectation hash`);
  assert.equal(result.evidence_binding.artifact_hashes_sha256.length, 64, `${result.task_id} must bind replay-attempt certificate hash`);
  assert.equal(result.evidence_binding.lean_run_manifest_id, "");
  assert.equal(result.evidence_binding.final_replay_manifest_id, "");
  assert.ok(result.blockers.includes("lean_clean_replay_not_attempted_for_task"));
  if (result.category === "theorem-search-assisted") {
    assert.ok(result.blockers.includes("theorem_search_adapter_not_executed"));
  } else {
    assert.ok(result.blockers.includes("tactic_repair_attempt_not_executed"));
  }

  const certificate = result.replay_attempt;
  assert.equal(certificate.schema_version, "comath.goal3_positive_replay_attempt_certificate.v1");
  assert.equal(certificate.task_id, result.task_id);
  assert.equal(certificate.category, result.category);
  assert.equal(certificate.attempt_status, "blocked_before_clean_replay");
  assert.equal(certificate.terminal_classification, "replayable_blocker");
  assert.equal(certificate.can_promote_claim, false);
  assert.equal(certificate.proof_authority, "none");
  assert.equal(certificate.network_policy_final_replay, "disabled");
  assert.equal(certificate.uses_production_theorem_family_recognizer, false);
  assert.equal(certificate.uses_controlled_nat_linear_synthesis, false);
  assert.equal(certificate.uses_default_assumptions, false);
  assert.equal(certificate.cas_literature_search_or_vote_proof_authority, false);
  assert.equal(certificate.direct_promotion_path, false);
  assert.ok(Array.isArray(certificate.replay_command) && certificate.replay_command.length > 0);
  assert.match(certificate.certificate_path, new RegExp(`^\\.comath/release/positive_matrix/${result.task_id}/replay_attempt_certificate\\.json$`));

  const certificatePath = join(projectRoot, certificate.certificate_path);
  assert.ok(existsSync(certificatePath), `${result.task_id} certificate must be written under caller project root`);
  const certificateOnDisk = JSON.parse(readFileSync(certificatePath, "utf8"));
  assert.deepEqual(certificateOnDisk, certificate, `${result.task_id} returned certificate must match the written artifact`);
  assert.equal(
    result.evidence_binding.artifact_hashes_sha256,
    createHash("sha256").update(canonicalJson(certificateOnDisk), "utf8").digest("hex"),
    `${result.task_id} evidence binding must hash the replay-attempt certificate`
  );
}

assert.equal(
  existsSync(join(projectRoot, ".comath/release/positive_matrix/PM-101/replay_attempt_certificate.json")),
  false,
  "Task 34 final tranche must not write a non-existent PM-101 certificate"
);

console.log("Goal 3 Task 34 positive matrix tranche tests passed.");
