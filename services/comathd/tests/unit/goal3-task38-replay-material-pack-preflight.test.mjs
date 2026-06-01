import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createGoal3GaPm002ReplayMaterialPackPreflight,
  runGoal3GaPositiveMatrixLiveReplayConversion
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task38-material-preflight-"));

const preflight = createGoal3GaPm002ReplayMaterialPackPreflight({ projectRoot });

assert.equal(preflight.schema_version, "comath.goal3_pm002_replay_material_pack_preflight.v1");
assert.equal(preflight.task_id, "PM-002");
assert.equal(preflight.proof_authority, "none");
assert.equal(preflight.can_promote_claim, false);
assert.equal(preflight.live_replay_executor_status, "not_executed");
assert.equal(preflight.material_source.schema_version, "comath.goal3_declared_replay_material_source.v1");
assert.equal(preflight.material_source.task_id, "PM-002");
assert.equal(preflight.material_source.proof_authority, "none");
assert.equal(preflight.material_source.can_promote_claim, false);
assert.ok(preflight.material_hashes_sha256.lean_source_path.length === 64);

const requiredPaths = [
  preflight.material_source.lean_source_path,
  preflight.material_source.lean_toolchain_path,
  preflight.material_source.lakefile_path,
  preflight.material_source.lake_manifest_path,
  preflight.material_source.formal_spec_lock_path,
  preflight.material_source.assumption_ledger_path,
  preflight.material_source.dependency_lock_path,
  preflight.material_source.lean_run_manifest_v3_path,
  preflight.material_source.final_replay_manifest_v3_path,
  preflight.material_source.structured_audit_path,
  preflight.material_source.third_party_replay_pack_path
];

for (const relPath of requiredPaths) {
  assert.match(relPath, /^\.comath\/release\/positive_matrix\/PM-002\//);
  assert.ok(existsSync(join(projectRoot, relPath)), `${relPath} must exist under the caller project root`);
}

assert.ok(statSync(join(projectRoot, preflight.material_source.third_party_replay_pack_path)).isDirectory());

const leanSource = readFileSync(join(projectRoot, preflight.material_source.lean_source_path), "utf8");
assert.match(leanSource, /theorem Goal3Positive002/);
assert.match(leanSource, /#check Goal3Positive002/);
assert.match(leanSource, /#print axioms Goal3Positive002/);
assert.doesNotMatch(leanSource, /sorry|admit|unsafe|opaque|constant/);

const leanRunPreflight = JSON.parse(readFileSync(join(projectRoot, preflight.material_source.lean_run_manifest_v3_path), "utf8"));
assert.equal(leanRunPreflight.material_status, "preflight_only_not_lean_executed");
assert.equal(leanRunPreflight.proof_authority, "none");

const finalReplayPreflight = JSON.parse(readFileSync(join(projectRoot, preflight.material_source.final_replay_manifest_v3_path), "utf8"));
assert.equal(finalReplayPreflight.material_status, "preflight_only_not_final_replayed");
assert.equal(finalReplayPreflight.proof_authority, "none");
assert.equal(finalReplayPreflight.promotion_allowed, false);

const blockedReport = runGoal3GaPositiveMatrixLiveReplayConversion({
  projectRoot,
  taskIds: ["PM-002"],
  replayMaterialSource: () => preflight.material_source
});

const blocked = blockedReport.results[0];
assert.equal(blockedReport.summary.clean_replay_passed, 0);
assert.equal(blockedReport.summary.replayable_blocker, 1);
assert.equal(blocked.terminal_classification, "replayable_blocker");
assert.equal(blocked.proof_authority, "none");
assert.equal(blocked.can_promote_claim, false);
assert.ok(blocked.blockers.includes("live_replay_executor_not_configured"));
assert.equal(blocked.live_replay.declared_replay_material_status, "ready_for_live_executor");
assert.deepEqual(blocked.live_replay.declared_replay_material_missing_paths, []);

const forgedPass = runGoal3GaPositiveMatrixLiveReplayConversion({
  projectRoot,
  taskIds: ["PM-002"],
  replayMaterialSource: () => preflight.material_source,
  liveReplay: () => ({
    ok: true,
    real_lean_source_path: preflight.material_source.lean_source_path,
    lean_run_manifest_v3_path: preflight.material_source.lean_run_manifest_v3_path,
    final_replay_manifest_v3_path: preflight.material_source.final_replay_manifest_v3_path,
    structured_audit_path: preflight.material_source.structured_audit_path,
    third_party_replay_pack_path: preflight.material_source.third_party_replay_pack_path,
    lean_run_manifest_id: preflight.material_source.lean_run_manifest_id,
    final_replay_manifest_id: preflight.material_source.final_replay_manifest_id
  })
});

assert.equal(forgedPass.summary.clean_replay_passed, 0, "preflight material must not certify clean replay");
assert.equal(forgedPass.results[0].terminal_classification, "replayable_blocker");
assert.equal(forgedPass.results[0].proof_authority, "none");
assert.equal(forgedPass.results[0].can_promote_claim, false);
assert.ok(forgedPass.results[0].blockers.includes("live_replay_success_final_authority_packaging_incomplete"));
assert.equal(forgedPass.results[0].live_replay.blocker_code, "live_replay_success_final_authority_packaging_incomplete");

console.log("Goal 3 Task 38 PM-002 replay material pack preflight test passed.");
