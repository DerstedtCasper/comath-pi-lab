import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  runGoal3GaPositiveMatrixLiveReplayConversion
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task37-declared-material-"));

const report = runGoal3GaPositiveMatrixLiveReplayConversion({
  projectRoot,
  taskIds: ["PM-002"],
  replayMaterialSource: () => ({
    schema_version: "comath.goal3_declared_replay_material_source.v1",
    task_id: "PM-002",
    lean_source_path: ".comath/release/positive_matrix/PM-002/Target.lean",
    lean_toolchain_path: ".comath/release/positive_matrix/PM-002/lean-toolchain",
    lakefile_path: ".comath/release/positive_matrix/PM-002/lakefile.lean",
    lake_manifest_path: ".comath/release/positive_matrix/PM-002/lake-manifest.json",
    formal_spec_lock_path: ".comath/release/positive_matrix/PM-002/formal_spec_lock.json",
    assumption_ledger_path: ".comath/release/positive_matrix/PM-002/assumption_ledger.json",
    dependency_lock_path: ".comath/release/positive_matrix/PM-002/dependency_lock.json",
    lean_run_manifest_v3_path: ".comath/release/positive_matrix/PM-002/lean_run_manifest_v3.json",
    final_replay_manifest_v3_path: ".comath/release/positive_matrix/PM-002/final_replay_manifest_v3.json",
    structured_audit_path: ".comath/release/positive_matrix/PM-002/structured_audit.json",
    third_party_replay_pack_path: ".comath/release/positive_matrix/PM-002/replay_pack",
    lean_run_manifest_id: "LRUN-PM-002",
    final_replay_manifest_id: "RPLY-PM-002"
  })
});

assert.equal(report.schema_version, "comath.goal3_positive_live_replay_conversion.v1");
assert.equal(report.summary.clean_replay_passed, 0);
assert.equal(report.summary.replayable_blocker, 1);
assert.equal(report.summary.promoted_count, 0);

const result = report.results[0];
assert.equal(result.task_id, "PM-002");
assert.equal(result.terminal_classification, "replayable_blocker");
assert.equal(result.proof_authority, "none");
assert.equal(result.can_promote_claim, false);
assert.ok(result.blockers.includes("declared_replay_material_missing"));
assert.ok(result.blockers.includes("live_clean_replay_attempt_failed"));

const certificate = result.live_replay;
assert.equal(certificate.schema_version, "comath.goal3_positive_live_replay_conversion_certificate.v1");
assert.equal(certificate.attempt_status, "live_replay_failed");
assert.equal(certificate.blocker_code, "declared_replay_material_missing");
assert.equal(certificate.proof_authority, "none");
assert.equal(certificate.can_promote_claim, false);
assert.equal(certificate.declared_replay_material_source_path, ".comath/release/positive_matrix/PM-002/declared_replay_material_source.json");
assert.equal(certificate.declared_replay_material_status, "missing_or_incomplete");
assert.deepEqual(certificate.declared_replay_material_missing_paths.sort(), [
  ".comath/release/positive_matrix/PM-002/Target.lean",
  ".comath/release/positive_matrix/PM-002/assumption_ledger.json",
  ".comath/release/positive_matrix/PM-002/dependency_lock.json",
  ".comath/release/positive_matrix/PM-002/final_replay_manifest_v3.json",
  ".comath/release/positive_matrix/PM-002/formal_spec_lock.json",
  ".comath/release/positive_matrix/PM-002/lake-manifest.json",
  ".comath/release/positive_matrix/PM-002/lakefile.lean",
  ".comath/release/positive_matrix/PM-002/lean-toolchain",
  ".comath/release/positive_matrix/PM-002/lean_run_manifest_v3.json",
  ".comath/release/positive_matrix/PM-002/replay_pack",
  ".comath/release/positive_matrix/PM-002/structured_audit.json"
].sort());

const materialSourcePath = join(projectRoot, certificate.declared_replay_material_source_path);
assert.ok(existsSync(materialSourcePath), "declared replay material source manifest must be written by comathd");
const materialSource = JSON.parse(readFileSync(materialSourcePath, "utf8"));
assert.equal(materialSource.schema_version, "comath.goal3_declared_replay_material_source.v1");
assert.equal(materialSource.task_id, "PM-002");
assert.equal(materialSource.proof_authority, "none");
assert.equal(materialSource.can_promote_claim, false);

assert.equal(certificate.uses_production_theorem_family_recognizer, false);
assert.equal(certificate.uses_controlled_nat_linear_synthesis, false);
assert.equal(certificate.uses_default_assumptions, false);
assert.equal(certificate.cas_literature_search_or_vote_proof_authority, false);
assert.equal(certificate.direct_promotion_path, false);

console.log("Goal 3 Task 37 declared replay material source RED/GREEN test passed.");
