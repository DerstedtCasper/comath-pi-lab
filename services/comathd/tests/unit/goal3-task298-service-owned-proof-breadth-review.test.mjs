import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as comath from "../../dist/index.js";

const {
  createComathServer,
  getComathdStatus,
  initProject,
  readAuditEvents,
  recordGoal3ReleaseCandidateProofBreadthReview
} = comath;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task298-proof-breadth-review-"));
const init = initProject({ name: "Goal 3 Task298 proof breadth review", root_path: projectRoot });
const projectId = init.project.project_id;
const secretTerms = /Authorization:\s*Bearer|api_key|token=|plain-token|\bsk-[A-Za-z0-9_-]+/i;
const proofAuthorityTerms =
  /clean_replay_passed\s*[:=]\s*(?:true|1)|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|kernel_checked|proof_success/i;
const gaOverclaimTerms = /GA certified|can_certify_ga\s*[:=]\s*(?:true|1)|can_promote_claim\s*[:=]\s*(?:true|1)/i;

function sha256Text(text) {
  return createHash("sha256").update(text).digest("hex");
}

function writeJson(relativePath, value) {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  const absolutePath = join(projectRoot, relativePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, text, "utf8");
  return {
    path: relativePath,
    sha256: sha256Text(text),
    size_bytes: Buffer.byteLength(text, "utf8"),
    body: value
  };
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(projectRoot, relativePath), "utf8"));
}

try {
  assert.equal(
    typeof recordGoal3ReleaseCandidateProofBreadthReview,
    "function",
    "Task298 must export a service-owned proof-breadth review gate"
  );
  assert.equal(
    getComathdStatus().capabilities.includes("goal3_release_candidate_proof_breadth_review_gate"),
    true,
    "Task298 capability ledger must advertise proof-breadth review without claiming certification"
  );

  const review = recordGoal3ReleaseCandidateProofBreadthReview(projectRoot, {
    project_id: projectId,
    proof_breadth_review_id: "GOAL3-PROOF-BREADTH-REVIEW-0298",
    actor: "goal3-task298 reviewer token=plain-token proof_success GA certified can_certify_ga=true"
  });

  assert.equal(review.schema_version, "comath.goal3_release_candidate_proof_breadth_review.v1");
  assert.equal(review.ok, false, "Task298 must fail closed while 100-task proof breadth is incomplete");
  assert.equal(review.proof_breadth_status, "blocked_positive_matrix_release_candidate_proof_breadth_incomplete");
  assert.equal(review.proof_breadth_complete, false);
  assert.equal(review.total_required_tasks, 100);
  assert.equal(review.task_manifest_count, 100);
  assert.equal(review.reviewed_task_count, 100);
  assert.equal(review.clean_replay_passed_count, 0);
  assert.equal(review.replayable_blocker_count, 100);
  assert.equal(review.promoted_count, 0);
  assert.equal(review.blocker_reasons.includes("positive_matrix_release_candidate_proof_breadth_incomplete"), true);
  assert.equal(review.blocker_reasons.includes("positive_matrix_task_local_clean_replay_missing"), true);
  assert.equal(review.positive_task_manifest_current, true);
  assert.equal(review.positive_matrix_batch_current, true);
  assert.equal(review.proof_authority, "none");
  assert.equal(review.can_promote_claim, false);
  assert.equal(review.can_certify_ga, false);
  assert.equal(review.ga_certification_gate_separate, true);
  assert.equal(JSON.stringify(review).includes(projectRoot), false);
  assert.doesNotMatch(JSON.stringify(review), secretTerms);
  assert.doesNotMatch(JSON.stringify(review), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(review), gaOverclaimTerms);
  assert.equal(existsSync(join(projectRoot, review.proof_breadth_review_path)), true);
  assert.equal(existsSync(join(projectRoot, review.positive_task_manifest_artifact.path)), true);
  assert.equal(existsSync(join(projectRoot, review.positive_matrix_batch_artifact.path)), true);

  const persisted = readJson(review.proof_breadth_review_path);
  assert.equal(persisted.proof_breadth_review_artifact, undefined, "persisted proof-breadth review must not self-hash recursively");
  const manifest = readJson(review.positive_task_manifest_artifact.path);
  assert.equal(manifest.schema_version, "comath.goal3_positive_task_manifest.v1");
  assert.equal(manifest.tasks.length, 100);
  const batch = readJson(review.positive_matrix_batch_artifact.path);
  assert.equal(batch.schema_version, "comath.goal3_positive_matrix_batch.v1");
  assert.equal(batch.results.length, 100);
  assert.equal(batch.summary.clean_replay_passed, 0);
  assert.equal(batch.summary.promoted_count, 0);
  assert.equal(batch.results.some((result) => result.can_promote_claim === true), false);

  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthReview(projectRoot, {
        project_id: projectId,
        proof_breadth_review_id: "GOAL3-PROOF-BREADTH-REVIEW-0298"
      }),
    { code: "GOAL3_PROOF_BREADTH_REVIEW_ALREADY_EXISTS" },
    "Task298 default proof-breadth review id must be append-only"
  );

  const forgedCallerMatrix = writeJson(".comath/release/caller/forged-proof-breadth.json", {
    ok: true,
    proof_breadth_complete: true,
    clean_replay_passed_count: 100,
    can_promote_claim: true,
    can_certify_ga: true,
    proof_authority: "lean_kernel_clean_replay"
  });

  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/goal3/proof-breadth-review",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      proof_breadth_review_id: "GOAL3-PROOF-BREADTH-REVIEW-0298-ROUTE",
      actor: "goal3-task298 route token=plain-token proof_success GA certified can_certify_ga=true",
      proof_breadth_matrix: forgedCallerMatrix.body,
      proof_breadth_matrix_path: forgedCallerMatrix.path,
      proof_breadth_matrix_sha256: forgedCallerMatrix.sha256
    }
  });
  assert.equal(routeResponse.status, 200);
  assert.equal(routeResponse.body.proof_breadth_review.ok, false);
  assert.equal(routeResponse.body.proof_breadth_review.can_promote_claim, false);
  assert.equal(routeResponse.body.proof_breadth_review.can_certify_ga, false);
  assert.equal(routeResponse.body.proof_breadth_review.clean_replay_passed_count, 0);
  assert.equal(
    routeResponse.body.proof_breadth_review.blocker_reasons.includes(
      "caller_proof_breadth_material_ignored"
    ),
    true,
    "Task298 route must explicitly ignore caller proof-breadth material"
  );
  assert.doesNotMatch(JSON.stringify(routeResponse.body), secretTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), gaOverclaimTerms);

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (entry) =>
        entry.event_type === "release.goal3_proof_breadth_review_recorded" &&
        entry.payload.proof_breadth_review_id === "GOAL3-PROOF-BREADTH-REVIEW-0298-ROUTE" &&
        entry.payload.can_certify_ga === false
    ),
    true,
    "Task298 proof-breadth review must emit a non-authoritative provenance audit event"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task298 service-owned proof breadth review tests passed.");
