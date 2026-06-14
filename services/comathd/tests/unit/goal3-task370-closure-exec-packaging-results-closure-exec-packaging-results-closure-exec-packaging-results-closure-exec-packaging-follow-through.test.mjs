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
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough
} = comath;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task370-closure-exec-packaging-results-follow-through-"));
const repoRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const { project } = initProject({
  name: "Goal 3 Task370 selected tranche closure execution packaging results closure execution packaging follow-through",
  root_path: projectRoot
});
const projectId = project.project_id;
const secretTerms = /Authorization:\s*Bearer|api_key|token=|plain-token|\bsk-[A-Za-z0-9_-]+/i;
const proofAuthorityTerms =
  /clean_replay_passed\s*[:=]\s*(?:true|1)|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|kernel_checked|proof_success/i;
const gaOverclaimTerms = /GA certified|can_certify_ga\s*[:=]\s*(?:true|1)|can_promote_claim\s*[:=]\s*(?:true|1)/i;
const task370Capability =
  "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through";
const task370Route =
  "/release/goal3/selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-follow-through";
const task370Dir =
  ".comath/release/goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-follow-through";
const task364Dir =
  ".comath/release/goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-follow-through";

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

function artifactForRelativePath(relativePath, kind) {
  const bytes = readFileSync(join(projectRoot, relativePath));
  return {
    kind,
    path: relativePath,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    size_bytes: bytes.byteLength
  };
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
  task361Id = "GOAL3-TASK370-DELEGATED-TASK361",
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
    actor: "goal3-task370 task361 seed",
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
  task367Id = "GOAL3-TASK370-SOURCE-TASK367",
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
    actor: "goal3-task370 task367 seed token=plain-token proof_success GA certified can_certify_ga=true",
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

function seedTask368Bridge({ task368Id = "GOAL3-TASK370-SOURCE-TASK368", delegatedReady = true } = {}) {
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
      actor: "goal3-task370 task368 seed token=plain-token proof_success GA certified can_certify_ga=true",
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true
    }
  );
}

try {
  assert.equal(
    typeof recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough,
    "function",
    "Task370 must export a Task368-bound closure execution packaging follow-through wrapper"
  );
  assert.ok(
    getComathdStatus().capabilities.includes(task370Capability),
    "Task370 capability ledger must advertise closure execution packaging follow-through without authority"
  );
  assert.match(
    repoFile("scripts/phase0-smoke.mjs"),
    /goal3-task370-closure-exec-packaging-results-closure-exec-packaging-results-closure-exec-packaging-results-closure-exec-packaging-follow-through\.test\.mjs/s,
    "phase0 smoke must discover the Task370 focused suite"
  );

  const task370Source = repoFile(
    "services/comathd/src/release/goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-follow-through.ts"
  );
  assert.match(
    task370Source,
    /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough/s,
    "Task370 must delegate Task368-bound material through existing Task364 closure execution packaging semantics"
  );
  assert.doesNotMatch(task370Source, /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough\s*\(/s);
  assert.doesNotMatch(task370Source, /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingFollowThrough\s*\(/s);
  assert.doesNotMatch(task370Source, /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingFollowThrough\s*\(/s);
  assert.doesNotMatch(task370Source, /recordGoal3ProofBreadthClosure|recordGoal3FinalGaAudit|recordGoal3GaCertificate/s);

  const bridge = seedTask368Bridge();
  const bridgePath =
    bridge
      .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path;
  const originalBridgeText = readFileSync(join(projectRoot, bridgePath), "utf8");
  const weakenedBridgeText = `${JSON.stringify({ ...JSON.parse(originalBridgeText), can_certify_ga: true }, null, 2)}\n`;
  writeFileSync(join(projectRoot, bridgePath), weakenedBridgeText, "utf8");
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough(
        projectRoot,
        {
          project_id: projectId,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
            "GOAL3-TASK370-WEAKENED",
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
            bridge
              .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path:
            bridgePath,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_sha256:
            sha256Text(weakenedBridgeText)
        }
      ),
    {
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_FOLLOW_THROUGH_INVALID_TASK368"
    },
    "Task370 must reject current Task368 artifacts with weakened no-authority flags"
  );
  writeFileSync(join(projectRoot, bridgePath), originalBridgeText, "utf8");

  const blockedBridge = seedTask368Bridge({
    task368Id: "GOAL3-TASK370-SOURCE-TASK368-BLOCKED",
    delegatedReady: false
  });
  const delegatedTask364FilesBeforeBlocked = collectRelativeFiles(task364Dir);
  const blockedFollowThrough =
    recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough(
      projectRoot,
      {
        project_id: projectId,
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
          "GOAL3-TASK370-BLOCKED",
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
          blockedBridge
            .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id,
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path:
          blockedBridge
            .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path,
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_sha256:
          blockedBridge
            .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact
            .sha256
      }
    );
  assert.equal(blockedFollowThrough.ok, false);
  assert.equal(
    blockedFollowThrough.follow_through_status,
    "blocked_next_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_not_ready_for_closure_execution_packaging"
  );
  assert.equal(
    blockedFollowThrough.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id,
    null
  );
  assert.deepEqual(
    collectRelativeFiles(task364Dir),
    delegatedTask364FilesBeforeBlocked,
    "Task370 must not run delegated Task364 closure execution packaging when Task368 has no delegated Task362"
  );

  const closureFilesBefore = collectRelativeFiles(".comath/release/goal3-proof-breadth-closure");
  const finalAuditFilesBefore = collectRelativeFiles(".comath/release/goal3-final-ga-audit");
  const gaCertificateFilesBefore = collectRelativeFiles(".comath/release/goal3-ga-certificate");
  const followThrough =
    recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingFollowThrough(
      projectRoot,
      {
        project_id: projectId,
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
          "GOAL3-TASK370",
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
          bridge
            .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id,
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path:
          bridge
            .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path,
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_sha256:
          bridge
            .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact
            .sha256,
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
          "G3-T370-T364",
        actor: "goal3-task370 token=plain-token proof_success GA certified can_certify_ga=true",
        proof_authority: "lean_kernel_clean_replay",
        can_certify_ga: true,
        final_ga_audit_json: { ok: true },
        proof_breadth_closure_json: { proof_breadth_complete: true }
      }
    );

  assert.equal(
    followThrough.schema_version,
    "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through.v1"
  );
  assert.equal(
    followThrough.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact.sha256,
    bridge
      .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact
      .sha256
  );
  assert.equal(
    followThrough.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact.kind,
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through"
  );
  assert.equal(
    followThrough.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id,
    bridge.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id
  );
  assert.equal(followThrough.proof_breadth_complete, false);
  assert.equal(followThrough.final_ga_audit_unblocked, false);
  assert.equal(followThrough.runs_lean, false);
  assert.equal(followThrough.executes_proofs, false);
  assert.equal(followThrough.accepts_caller_success_metadata, false);
  assert.equal(followThrough.accepts_caller_proof_material, false);
  assert.equal(followThrough.proof_authority, "none");
  assert.equal(followThrough.can_promote_claim, false);
  assert.equal(followThrough.can_certify_ga, false);
  assert.equal(followThrough.ga_certification_gate_separate, true);
  assert.equal(followThrough.blocker_reasons.includes("caller_proof_or_ga_authority_material_ignored"), true);
  assert.equal(JSON.stringify(followThrough).includes(projectRoot), false);
  assert.doesNotMatch(JSON.stringify(followThrough), secretTerms);
  assert.doesNotMatch(JSON.stringify(followThrough), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(followThrough), gaOverclaimTerms);
  assert.deepEqual(
    collectRelativeFiles(".comath/release/goal3-proof-breadth-closure"),
    closureFilesBefore,
    "Task370 must not write Task300 proof-breadth closure artifacts"
  );
  assert.deepEqual(
    collectRelativeFiles(".comath/release/goal3-final-ga-audit"),
    finalAuditFilesBefore,
    "Task370 must not write Task301 final-GA-audit artifacts"
  );
  assert.deepEqual(
    collectRelativeFiles(".comath/release/goal3-ga-certificate"),
    gaCertificateFilesBefore,
    "Task370 must not write Task303 GA-certificate artifacts"
  );

  const persisted = readJson(
    followThrough
      .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path
  );
  assert.equal(
    persisted
      .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact,
    undefined,
    "persisted Task370 artifact must not self-hash recursively"
  );
  assert.equal(
    persisted.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through,
    undefined,
    "Task370 persisted artifact must bind delegated Task364 by artifact reference instead of embedding packaging reports"
  );

  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: task370Route,
    body: {
      project_root: projectRoot,
      project_id: projectId,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id:
        "GOAL3-TASK370-ROUTE",
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id:
        bridge
          .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_id,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path:
        bridge
          .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_path,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_sha256:
        bridge
          .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge_artifact
          .sha256,
      actor: "goal3-task370 route token=plain-token proof_success GA certified can_certify_ga=true",
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true
    }
  });
  assert.equal(routeResponse.status, 200);
  assert.equal(routeResponse.body[task370Capability].proof_authority, "none");
  assert.equal(routeResponse.body[task370Capability].can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), secretTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), gaOverclaimTerms);

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (entry) =>
        entry.event_type ===
          "release.goal3_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_recorded" &&
        entry.payload
          .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id ===
          "GOAL3-TASK370-ROUTE" &&
        entry.payload.can_certify_ga === false &&
        entry.payload.proof_authority === "none"
    ),
    true,
    "Task370 must emit non-certifying provenance"
  );

  for (const forbiddenPattern of [
    /selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-follow-through/s,
    /selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through/s
  ]) {
    assert.doesNotMatch(repoFile("extensions/comath-pi/src/index.ts"), forbiddenPattern, "Task370 must not add a Pi tool surface");
    assert.doesNotMatch(
      repoFile("extensions/comath-pi/src/runtime-registration.ts"),
      forbiddenPattern,
      "Task370 must not add a Pi runtime command"
    );
  }

  for (const [path, pattern] of [
    ["README.md", /Task370.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging results closure execution packaging follow-through/s],
    ["TODO.md", /Task370.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging results closure execution packaging follow-through/s],
    ["goal-3/tasks.md", /Task370.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging results closure execution packaging follow-through/s],
    ["REVIEW.md", /Goal 3 Task 370/s],
    ["AGENTS.md", /Task370.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging results closure execution packaging follow-through/s],
    ["docs/architecture/ga-release-criteria.md", /Task370.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging results closure execution packaging follow-through/s],
    ["docs/architecture/threat-model.md", /Task370.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging results closure execution packaging follow-through/s],
    ["docs/architecture/acceptance-matrix.md", /Task370.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging results closure execution packaging follow-through/s],
    ["docs/progress/goal-3-ga-gap-matrix.md", /Task370.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging results closure execution packaging follow-through/s]
  ]) {
    assert.match(
      repoFile(path),
      pattern,
      `${path} must document Task370 selected-tranche closure execution packaging results closure execution packaging results closure execution packaging results closure execution packaging follow-through`
    );
  }
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log(
  "Goal 3 Task370 selected-tranche closure execution packaging results closure execution packaging results closure execution packaging results closure execution packaging follow-through tests passed."
);
