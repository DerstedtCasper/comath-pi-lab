import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createComathServer, getClaim } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-v3-negative-ga-"));
const server = createComathServer();

try {
  const response = await server.inject({
    method: "POST",
    path: "/release/v3-negative-ga-slices",
    body: { project_root: projectRoot, project_name: "Task 13 v3 Negative GA Slices", actor: "phase68-negative-ga" }
  });
  assert.equal(response.status, 200);
  const summary = response.body.summary;
  assert.equal(summary.schema_version, "comath.v3.negative_ga_slices.v1");
  assert.equal(summary.all_required_slices_passed, true);
  assert.equal(summary.proof_authority, "none");
  assert.equal(summary.artifact_path, ".comath/release/v3_negative_ga_slices.json");
  assert.equal(existsSync(join(projectRoot, summary.artifact_path)), true);

  const persisted = JSON.parse(readFileSync(join(projectRoot, summary.artifact_path), "utf8"));
  assert.deepEqual(persisted.cases.map((item) => item.case_id), [
    "statement_drift_rejection",
    "cheating_lean_artifact_rejection",
    "false_theorem_refutation",
    "all_candidate_failure_recovery",
    "snapshot_replay_requires_clean_replay"
  ]);
  for (const slice of persisted.cases) {
    assert.equal(slice.promotion_blocked, true, `${slice.case_id} must block formal promotion`);
    assert.equal(slice.evidence_preserved, true, `${slice.case_id} must preserve evidence`);
    assert.notEqual(slice.final_claim_status, "formally_checked");
    assert.ok(slice.evidence_paths.length > 0);
    for (const relPath of slice.evidence_paths) assert.equal(existsSync(join(projectRoot, relPath)), true);
  }

  assert.ok(persisted.cases[0].gate_vetoes.includes("statement_drift"));
  assert.ok(persisted.cases[1].gate_vetoes.includes("sorry_detected"));
  assert.ok(persisted.cases[1].gate_vetoes.includes("axiom_detected"));
  assert.equal(persisted.cases[2].terminal_state, "completed_refutation");
  assert.equal(persisted.cases[2].counterexample.result, "refutes");
  assert.equal(getClaim(projectRoot, persisted.cases[2].project_id, persisted.cases[2].claim_id).status, "refuted");
  assert.equal(persisted.cases[3].decision_result, "blocked");
  assert.equal(persisted.cases[3].failure_aggregate.total_failed_routes, 8);
  assert.equal(persisted.cases[4].snapshot_replay_result, "pass");
  assert.equal(persisted.cases[4].snapshot_only_promotion_gate_ok, false);
  assert.ok(persisted.cases[4].gate_vetoes.includes("formally_checked requires hash-bound fresh final replay artifacts"));
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 68 v3 negative GA slice tests passed.");
