import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as comath from "../../dist/index.js";

const {
  createComathServer,
  getComathdStatus,
  initProject,
  readAuditEvents,
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionBridge,
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough,
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp
} = comath;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task371-closure-exec-packaging-results-follow-up-"));
const repoRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const { project } = initProject({
  name: "Goal 3 Task371 selected tranche closure execution packaging results closure execution packaging results follow-up",
  root_path: projectRoot
});
const projectId = project.project_id;
const secretTerms = /Authorization:\s*Bearer|api_key|token=|plain-token|\bsk-[A-Za-z0-9_-]+/i;
const proofAuthorityTerms =
  /clean_replay_passed\s*[:=]\s*(?:true|1)|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|kernel_checked|proof_success/i;
const gaOverclaimTerms = /GA certified|can_certify_ga\s*[:=]\s*(?:true|1)|can_promote_claim\s*[:=]\s*(?:true|1)/i;
const task371Capability =
  "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up";
const task371Route =
  "/release/goal3/selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-follow-up";
const task365Dir =
  ".comath/release/goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-follow-up";

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
    body: value,
    text
  };
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(projectRoot, relativePath), "utf8"));
}

function repoFile(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function collectRelativeFiles(relativeRoot) {
  const absoluteRoot = join(projectRoot, relativeRoot);
  if (!existsSync(absoluteRoot)) {
    return [];
  }
  const files = [];
  const visit = (absoluteDir, relativeDir) => {
    for (const entry of readdirSync(absoluteDir, { withFileTypes: true })) {
      const childRelative = `${relativeDir}/${entry.name}`.replace(/^\/+/u, "");
      const childAbsolute = join(absoluteDir, entry.name);
      if (entry.isDirectory()) {
        visit(childAbsolute, childRelative);
      } else {
        files.push(childRelative.replace(/\\/g, "/"));
      }
    }
  };
  visit(absoluteRoot, relativeRoot);
  return files.sort();
}

function dummyArtifact(id, directory, filename, kind) {
  const path = `.comath/release/${directory}/${id}/${filename}`;
  const artifact = writeJson(path, {
    schema_version: `comath.${kind}.fixture`,
    id,
    project_id: projectId,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  });
  return { path, artifact: { kind, path, sha256: artifact.sha256, size_bytes: artifact.size_bytes } };
}

function seedTask361ClosureRecheck({
  task361Id = "GOAL3-TASK371-DELEGATED-TASK361",
  delegatedReady = false
} = {}) {
  const task356 = dummyArtifact(
    `${task361Id}-TASK356`,
    "goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-bridge",
    "bridge.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge"
  );
  const task355 = dummyArtifact(
    `${task361Id}-TASK355`,
    "goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-recheck",
    "recheck.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck"
  );
  const delegatedTask355 = delegatedReady
    ? dummyArtifact(
        `${task361Id}-DELEGATED-TASK355`,
        "goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-recheck",
        "recheck.json",
        "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck"
      )
    : null;
  const task361Path = `.comath/release/goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-recheck/${task361Id}/recheck.json`;
  return writeJson(task361Path, {
    schema_version:
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck.v1",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id:
      task361Id,
    project_id: projectId,
    actor: "goal3-task371 task361 seed",
    created_at: "2026-06-14T00:00:00.000Z",
    ok: false,
    recheck_status: "blocked_global_proof_breadth_incomplete_after_next_closure_execution_packaging_results_closure_recheck",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_path:
      task361Path,
    requested_recheck_mode:
      "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
      task356.artifact.path.split("/").at(-2),
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path:
      task356.path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact:
      task356.artifact,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id:
      task355.artifact.path.split("/").at(-2),
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path:
      task355.path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact:
      task355.artifact,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id:
      delegatedTask355?.artifact.path.split("/").at(-2) ?? null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path:
      delegatedTask355?.path ?? null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact:
      delegatedTask355?.artifact ?? null,
    proof_breadth_closure_id: null,
    proof_breadth_closure_path: null,
    proof_breadth_closure_artifact: null,
    selected_task_count: 0,
    verified_selected_task_count: 0,
    missing_selected_task_count: 0,
    blocked_selected_task_count: 0,
    selected_task_ids: [],
    verified_selected_task_ids: [],
    missing_selected_task_ids: [],
    blocked_selected_task_ids: [],
    selected_packaging_report_artifacts: [],
    selected_packaging_report_artifacts_current: true,
    ready_for_proof_breadth_closure_recheck: true,
    blocker_reasons: [],
    proof_breadth_complete: false,
    final_ga_audit_unblocked: false,
    runs_lean: false,
    executes_proofs: false,
    accepts_caller_success_metadata: false,
    accepts_caller_proof_material: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    ga_certification_gate_separate: true
  });
}

function seedTask367ClosureRecheck({
  task367Id = "GOAL3-TASK371-SOURCE-TASK367",
  delegatedReady = true
} = {}) {
  const task365 = dummyArtifact(
    `${task367Id}-TASK365`,
    "goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-follow-up",
    "follow-up.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up"
  );
  const task364 = dummyArtifact(
    `${task367Id}-TASK364`,
    "goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-follow-through",
    "follow-through.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through"
  );
  const task362 = dummyArtifact(
    `${task367Id}-TASK362`,
    "goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-bridge",
    "bridge.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge"
  );
  const task361 = dummyArtifact(
    `${task367Id}-TASK361`,
    "goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-recheck",
    "recheck.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck"
  );
  const task356 = dummyArtifact(
    `${task367Id}-TASK356`,
    "goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-bridge",
    "bridge.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge"
  );
  const task355 = dummyArtifact(
    `${task367Id}-TASK355`,
    "goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-recheck",
    "recheck.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck"
  );
  const delegatedTask359 = dummyArtifact(
    `${task367Id}-TASK359`,
    "goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-follow-up",
    "follow-up.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up"
  );
  const delegatedTask361 = delegatedReady ? seedTask361ClosureRecheck() : null;
  const task367Path = `.comath/release/goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-recheck/${task367Id}/recheck.json`;
  return writeJson(task367Path, {
    schema_version:
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck.v1",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id:
      task367Id,
    project_id: projectId,
    actor: "goal3-task371 task367 seed token=plain-token proof_success GA certified can_certify_ga=true",
    created_at: "2026-06-14T00:00:00.000Z",
    ok: false,
    recheck_status: "blocked_global_proof_breadth_incomplete_after_next_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_path:
      task367Path,
    requested_recheck_mode:
      "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id:
      task365.artifact.path.split("/").at(-2),
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path:
      task365.path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact:
      task365.artifact,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
      task364.artifact.path.split("/").at(-2),
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path:
      task364.path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact:
      task364.artifact,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
      task362.artifact.path.split("/").at(-2),
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path:
      task362.path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact:
      task362.artifact,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id:
      task361.artifact.path.split("/").at(-2),
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_path:
      task361.path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_artifact:
      task361.artifact,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
      task356.artifact.path.split("/").at(-2),
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path:
      task356.path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact:
      task356.artifact,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_id:
      task355.artifact.path.split("/").at(-2),
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_path:
      task355.path,
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck_artifact:
      task355.artifact,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id:
      delegatedTask359.artifact.path.split("/").at(-2),
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path:
      delegatedTask359.path,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact:
      delegatedTask359.artifact,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id:
      delegatedTask361?.body
        .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id ?? null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_path:
      delegatedTask361?.path ?? null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_artifact:
      delegatedTask361
        ? {
            kind: "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck",
            path: delegatedTask361.path,
            sha256: delegatedTask361.sha256,
            size_bytes: delegatedTask361.size_bytes
          }
        : null,
    proof_breadth_closure_id: null,
    proof_breadth_closure_path: null,
    proof_breadth_closure_artifact: null,
    selected_task_count: 0,
    verified_selected_task_count: 0,
    missing_selected_task_count: 0,
    blocked_selected_task_count: 0,
    selected_task_ids: [],
    verified_selected_task_ids: [],
    missing_selected_task_ids: [],
    blocked_selected_task_ids: [],
    selected_packaging_report_artifacts: [],
    selected_packaging_report_artifacts_current: true,
    ready_for_proof_breadth_closure_recheck: true,
    blocker_reasons: ["plain-token proof_success GA certified"],
    proof_breadth_complete: false,
    final_ga_audit_unblocked: false,
    runs_lean: false,
    executes_proofs: false,
    accepts_caller_success_metadata: false,
    accepts_caller_proof_material: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    ga_certification_gate_separate: true
  });
}

function seedTask368Bridge({ task368Id = "GOAL3-TASK371-SOURCE-TASK368", delegatedReady = true } = {}) {
  const task367 = seedTask367ClosureRecheck({
    task367Id: `${task368Id}-TASK367`,
    delegatedReady
  });
  return recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionBridge(
    projectRoot,
    {
      project_id: projectId,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
        task368Id,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id:
        task367.body
          .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_path:
        task367.body
          .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_path,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_sha256:
        task367.sha256,
      actor: "goal3-task371 task368 seed token=plain-token proof_success GA certified can_certify_ga=true",
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true
    }
  );
}

function seedTask370FollowThrough({ task370Id = "GOAL3-TASK371-SOURCE-TASK370", delegatedReady = true } = {}) {
  const task368 = seedTask368Bridge({
    task368Id: `${task370Id}-TASK368`,
    delegatedReady
  });
  return recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough(
    projectRoot,
    {
      project_id: projectId,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
        task370Id,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
        task368
          .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path:
        task368
          .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_sha256:
        task368
          .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact
          .sha256,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
        "G3-T371-SEED-T364",
      actor: "goal3-task371 task370 seed token=plain-token proof_success GA certified can_certify_ga=true",
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true
    }
  );
}

try {
  assert.equal(
    typeof recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp,
    "function",
    "Task371 must export a Task370-bound closure execution packaging results follow-up wrapper"
  );
  assert.ok(
    getComathdStatus().capabilities.includes(task371Capability),
    "Task371 capability ledger must advertise closure execution packaging results follow-up without authority"
  );
  assert.match(
    repoFile("scripts/phase0-smoke.mjs"),
    /goal3-task371-closure-exec-packaging-results-closure-exec-packaging-results-closure-exec-packaging-results-closure-exec-packaging-results-follow-up\.test\.mjs/s,
    "phase0 smoke must discover the Task371 focused suite"
  );

  const task371Source = repoFile(
    "services/comathd/src/release/goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-follow-up.ts"
  );
  assert.match(
    task371Source,
    /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp/s,
    "Task371 must delegate Task370-bound material through existing Task365 packaging-results currentness semantics"
  );
  for (const forbiddenPattern of [
    /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp\s*\(/s,
    /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsFollowUp\s*\(/s,
    /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsFollowUp\s*\(/s,
    /recordGoal3ProofBreadthClosure|recordGoal3FinalGaAudit|recordGoal3GaCertificate|runLean|LeanRunner/s
  ]) {
    assert.doesNotMatch(
      task371Source,
      forbiddenPattern,
      "Task371 must not call lower producers, Lean, proof-breadth closure, final-audit, or certificate writers directly"
    );
  }

  const followThrough = seedTask370FollowThrough();
  const followThroughPath =
    followThrough
      .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path;
  const originalFollowThroughText = readFileSync(join(projectRoot, followThroughPath), "utf8");
  const weakenedFollowThroughText = `${JSON.stringify({ ...JSON.parse(originalFollowThroughText), can_certify_ga: true }, null, 2)}\n`;
  writeFileSync(join(projectRoot, followThroughPath), weakenedFollowThroughText, "utf8");
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp(
        projectRoot,
        {
          project_id: projectId,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id:
            "GOAL3-TASK371-WEAKENED",
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
            followThrough
              .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path:
            followThroughPath,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_sha256:
            sha256Text(weakenedFollowThroughText)
        }
      ),
    {
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_FOLLOW_UP_INVALID_TASK370"
    },
    "Task371 must reject current Task370 artifacts with weakened no-authority flags"
  );
  writeFileSync(join(projectRoot, followThroughPath), originalFollowThroughText, "utf8");

  const blockedFollowThrough = seedTask370FollowThrough({
    task370Id: "GOAL3-TASK371-SOURCE-TASK370-BLOCKED",
    delegatedReady: false
  });
  const delegatedTask365FilesBeforeBlocked = collectRelativeFiles(task365Dir);
  const blockedFollowUp =
    recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp(
      projectRoot,
      {
        project_id: projectId,
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id:
          "GOAL3-TASK371-BLOCKED",
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
          blockedFollowThrough
            .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id,
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path:
          blockedFollowThrough
            .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path,
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_sha256:
          blockedFollowThrough
            .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact
            .sha256
      }
    );
  assert.equal(blockedFollowUp.ok, false);
  assert.equal(
    blockedFollowUp.follow_up_status,
    "blocked_next_closure_execution_packaging_results_closure_execution_packaging_not_ready_for_packaging_results_follow_up"
  );
  assert.equal(
    blockedFollowUp.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id,
    null
  );
  assert.deepEqual(
    collectRelativeFiles(task365Dir),
    delegatedTask365FilesBeforeBlocked,
    "Task371 must not run delegated Task365 packaging-results currentness when Task370 has no delegated Task364"
  );

  const closureFilesBefore = collectRelativeFiles(".comath/release/goal3-proof-breadth-closure");
  const finalAuditFilesBefore = collectRelativeFiles(".comath/release/goal3-final-ga-audit");
  const gaCertificateFilesBefore = collectRelativeFiles(".comath/release/goal3-ga-certificate");
  const followUp =
    recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp(
      projectRoot,
      {
        project_id: projectId,
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id:
          "GOAL3-TASK371",
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
          followThrough
            .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id,
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path:
          followThrough
            .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path,
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_sha256:
          followThrough
            .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact
            .sha256,
        actor: "goal3-task371 token=plain-token proof_success GA certified can_certify_ga=true",
        proof_authority: "lean_kernel_clean_replay",
        can_certify_ga: true,
        final_ga_audit_json: { ok: true },
        proof_breadth_closure_json: { proof_breadth_complete: true }
      }
    );

  assert.equal(
    followUp.schema_version,
    "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up.v1"
  );
  assert.equal(
    followUp.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact.sha256,
    followThrough
      .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact
      .sha256
  );
  assert.equal(
    followUp.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id,
    followThrough
      .delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id
  );
  assert.ok(
    followUp.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id,
    "Task371 must bind the delegated Task365 follow-up artifact when Task370 has delegated Task364 material"
  );
  assert.equal(followUp.proof_breadth_complete, false);
  assert.equal(followUp.final_ga_audit_unblocked, false);
  assert.equal(followUp.runs_lean, false);
  assert.equal(followUp.executes_proofs, false);
  assert.equal(followUp.accepts_caller_success_metadata, false);
  assert.equal(followUp.accepts_caller_proof_material, false);
  assert.equal(followUp.proof_authority, "none");
  assert.equal(followUp.can_promote_claim, false);
  assert.equal(followUp.can_certify_ga, false);
  assert.equal(followUp.ga_certification_gate_separate, true);
  assert.equal(followUp.blocker_reasons.includes("caller_proof_or_ga_authority_material_ignored"), true);
  assert.equal(JSON.stringify(followUp).includes(projectRoot), false);
  assert.doesNotMatch(JSON.stringify(followUp), secretTerms);
  assert.doesNotMatch(JSON.stringify(followUp), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(followUp), gaOverclaimTerms);
  assert.deepEqual(
    collectRelativeFiles(".comath/release/goal3-proof-breadth-closure"),
    closureFilesBefore,
    "Task371 must not write Task300 proof-breadth closure artifacts"
  );
  assert.deepEqual(
    collectRelativeFiles(".comath/release/goal3-final-ga-audit"),
    finalAuditFilesBefore,
    "Task371 must not write Task301 final-GA-audit artifacts"
  );
  assert.deepEqual(
    collectRelativeFiles(".comath/release/goal3-ga-certificate"),
    gaCertificateFilesBefore,
    "Task371 must not write Task303 GA-certificate artifacts"
  );

  const persisted = readJson(
    followUp
      .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path
  );
  assert.equal(
    persisted
      .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact,
    undefined,
    "persisted Task371 artifact must not self-hash recursively"
  );
  assert.equal(
    persisted.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up,
    undefined,
    "Task371 persisted artifact must bind delegated Task365 by artifact reference instead of embedding packaging reports"
  );

  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: task371Route,
    body: {
      project_root: projectRoot,
      project_id: projectId,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id:
        "GOAL3-TASK371-ROUTE",
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
        followThrough
          .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path:
        followThrough
          .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_sha256:
        followThrough
          .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact
          .sha256,
      actor: "goal3-task371 route token=plain-token proof_success GA certified can_certify_ga=true",
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true
    }
  });
  assert.equal(routeResponse.status, 200);
  assert.equal(routeResponse.body[task371Capability].proof_authority, "none");
  assert.equal(routeResponse.body[task371Capability].can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), secretTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), gaOverclaimTerms);

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (entry) =>
        entry.event_type ===
          "release.goal3_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_recorded" &&
        entry.payload
          .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id ===
          "GOAL3-TASK371-ROUTE" &&
        entry.payload.can_certify_ga === false &&
        entry.payload.proof_authority === "none"
    ),
    true,
    "Task371 must emit non-certifying provenance"
  );

  for (const forbiddenPattern of [
    /selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-follow-up/s,
    /selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up/s
  ]) {
    assert.doesNotMatch(repoFile("extensions/comath-pi/src/index.ts"), forbiddenPattern, "Task371 must not add a Pi tool surface");
    assert.doesNotMatch(
      repoFile("extensions/comath-pi/src/runtime-registration.ts"),
      forbiddenPattern,
      "Task371 must not add a Pi runtime command"
    );
  }

  for (const [path, pattern] of [
    ["README.md", /Task371.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging results closure execution packaging results follow-up/s],
    ["TODO.md", /Task371.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging results closure execution packaging results follow-up/s],
    ["goal-3/tasks.md", /Task371.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging results closure execution packaging results follow-up/s],
    ["REVIEW.md", /Goal 3 Task 371/s],
    ["AGENTS.md", /Task371.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging results closure execution packaging results follow-up/s],
    ["docs/architecture/ga-release-criteria.md", /Task371.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging results closure execution packaging results follow-up/s],
    ["docs/architecture/threat-model.md", /Task371.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging results closure execution packaging results follow-up/s],
    ["docs/architecture/acceptance-matrix.md", /Task371.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging results closure execution packaging results follow-up/s],
    ["docs/progress/goal-3-ga-gap-matrix.md", /Task371.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging results closure execution packaging results follow-up/s]
  ]) {
    assert.match(
      repoFile(path),
      pattern,
      `${path} must document Task371 selected-tranche closure execution packaging results closure execution packaging results closure execution packaging results closure execution packaging results follow-up`
    );
  }
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log(
  "Goal 3 Task371 selected-tranche closure execution packaging results closure execution packaging results closure execution packaging results closure execution packaging results follow-up tests passed."
);
