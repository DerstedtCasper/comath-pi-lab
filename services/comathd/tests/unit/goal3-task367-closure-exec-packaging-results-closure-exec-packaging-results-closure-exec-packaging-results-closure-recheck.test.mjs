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
  recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck
} = comath;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task367-closure-exec-packaging-results-recheck-"));
const repoRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const { project } = initProject({
  name: "Goal 3 Task367 selected tranche closure execution packaging results closure recheck",
  root_path: projectRoot
});
const projectId = project.project_id;
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

function seedTask365NotReadyArtifact({
  task365Id = "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-0367"
} = {}) {
  const task364 = dummyArtifact(
    "GOAL3-TASK364-SEED-0367",
    "goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-follow-through",
    "follow-through.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through"
  );
  const task362 = dummyArtifact(
    "GOAL3-TASK362-SEED-0367",
    "goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-bridge",
    "bridge.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_bridge"
  );
  const task361 = dummyArtifact(
    "GOAL3-TASK361-SEED-0367",
    "goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-recheck",
    "recheck.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck"
  );
  const task356 = dummyArtifact(
    "GOAL3-TASK356-SEED-0367",
    "goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-bridge",
    "bridge.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_bridge"
  );
  const task355 = dummyArtifact(
    "GOAL3-TASK355-SEED-0367",
    "goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-recheck",
    "recheck.json",
    "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_recheck"
  );
  const task365Path = `.comath/release/goal3-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-follow-up/${task365Id}/follow-up.json`;
  return writeJson(task365Path, {
    schema_version:
      "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up.v1",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id:
      task365Id,
    project_id: projectId,
    actor: "goal3-task367 task365 seed token=plain-token proof_success GA certified can_certify_ga=true",
    created_at: "2026-06-14T00:00:00.000Z",
    ok: false,
    follow_up_status:
      "blocked_next_closure_execution_packaging_results_closure_execution_packaging_not_ready_for_packaging_results_follow_up",
    selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path:
      task365Path,
    requested_follow_up_mode:
      "open_formal_workbench_release_candidate_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up",
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
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_id: null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_path: null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_follow_through_artifact: null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id: null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path: null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact: null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_id: null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_path: null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_follow_through_artifact: null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_id: null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_path: null,
    delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_follow_up_artifact: null,
    delegated_selected_tranche_next_closure_packaging_results_follow_up_id: null,
    delegated_selected_tranche_next_closure_packaging_results_follow_up_path: null,
    delegated_selected_tranche_next_closure_packaging_results_follow_up_artifact: null,
    selected_tranche_next_packaging_results_follow_up_id: null,
    selected_tranche_next_packaging_results_follow_up_path: null,
    selected_tranche_next_packaging_results_follow_up_artifact: null,
    selected_tranche_next_closure_packaging_follow_through_id: null,
    selected_tranche_next_closure_packaging_follow_through_path: null,
    selected_tranche_next_closure_packaging_follow_through_artifact: null,
    selected_tranche_next_packaging_follow_through_id: null,
    selected_tranche_next_packaging_follow_through_path: null,
    selected_tranche_next_packaging_follow_through_artifact: null,
    task_local_packaging_follow_through_id: null,
    task_local_packaging_follow_through_path: null,
    task_local_packaging_follow_through_artifact: null,
    proof_breadth_execution_follow_through_id: null,
    proof_breadth_execution_follow_through_path: null,
    proof_breadth_execution_follow_through_artifact: null,
    blocker_reasons: ["task364_not_ready_for_packaging_results_follow_up", "plain-token proof_success GA certified"],
    selected_task_count: 0,
    verified_selected_task_count: 0,
    missing_selected_task_count: 0,
    blocked_selected_task_count: 0,
    selected_task_ids: [],
    verified_selected_task_ids: [],
    missing_selected_task_ids: [],
    blocked_selected_task_ids: [],
    selected_packaging_report_artifacts: [],
    selected_packaging_report_artifacts_current: false,
    ready_for_proof_breadth_closure_recheck: false,
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

try {
  assert.equal(
    typeof recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck,
    "function",
    "Task367 must export a Task365-bound closure recheck wrapper"
  );
  assert.ok(
    getComathdStatus().capabilities.includes(
      "goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck"
    ),
    "Task367 capability ledger must advertise closure recheck without authority"
  );
  assert.match(
    repoFile("scripts/phase0-smoke.mjs"),
    /goal3-task367-closure-exec-packaging-results-closure-exec-packaging-results-closure-exec-packaging-results-closure-recheck\.test\.mjs/s,
    "phase0 smoke must discover the Task367 focused suite"
  );

  const task367Source = repoFile(
    "services/comathd/src/release/goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-recheck.ts"
  );
  assert.match(
    task367Source,
    /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck/s,
    "Task367 must delegate Task365-bound material through existing Task361 closure recheck semantics"
  );
  for (const forbiddenPattern of [
    /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp\(/s,
    /recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsFollowUp\(/s,
    /recordGoal3ReleaseCandidateProofBreadthClosure\(/s,
    /recordGoal3FinalGaAudit/s,
    /recordGoal3GaCertificate/s,
    /runLean|LeanRunner|spawnSync|execFile|child_process/s
  ]) {
    assert.doesNotMatch(
      task367Source,
      forbiddenPattern,
      "Task367 must not run Lean, call lower producers directly, or touch final-audit/certificate gates"
    );
  }

  const task365 = seedTask365NotReadyArtifact();
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck(
        projectRoot,
        {
          project_id: projectId,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id:
            "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-0367-STALE",
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id:
            task365.body
              .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path:
            task365.body
              .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_sha256:
            "0".repeat(64)
        }
      ),
    {
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_RECHECK_STALE_TASK365"
    },
    "Task367 must reject stale Task365 artifacts"
  );

  const task365Path =
    task365.body
      .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path;
  const originalTask365Text = readFileSync(join(projectRoot, task365Path), "utf8");
  const weakenedTask365Text = `${JSON.stringify({ ...JSON.parse(originalTask365Text), can_certify_ga: true }, null, 2)}\n`;
  writeFileSync(join(projectRoot, task365Path), weakenedTask365Text, "utf8");
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck(
        projectRoot,
        {
          project_id: projectId,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id:
            "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-0367-WEAKENED",
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id:
            task365.body
              .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path:
            task365Path,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_sha256:
            sha256Text(weakenedTask365Text)
        }
      ),
    {
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_RECHECK_INVALID_TASK365"
    },
    "Task367 must reject current Task365 artifacts with weakened no-authority flags"
  );
  writeFileSync(join(projectRoot, task365Path), originalTask365Text, "utf8");

  const forgedTask361Text = `${JSON.stringify(
    {
      ...JSON.parse(originalTask365Text),
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_artifact: {
        ...JSON.parse(originalTask365Text)
          .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_artifact,
        path: ".comath/release/forged/task361.json"
      }
    },
    null,
    2
  )}\n`;
  writeFileSync(join(projectRoot, task365Path), forgedTask361Text, "utf8");
  assert.throws(
    () =>
      recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck(
        projectRoot,
        {
          project_id: projectId,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id:
            "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-0367-FORGED-TASK361",
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id:
            task365.body
              .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path:
            task365Path,
          selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_sha256:
            sha256Text(forgedTask361Text)
        }
      ),
    {
      code: "GOAL3_SELECTED_TRANCHE_NEXT_CLOSURE_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_EXECUTION_PACKAGING_RESULTS_CLOSURE_RECHECK_INVALID_TASK365"
    },
    "Task367 must reject Task365 artifacts whose copied Task361 reference drifts"
  );
  writeFileSync(join(projectRoot, task365Path), originalTask365Text, "utf8");

  const closureFilesBefore = collectRelativeFiles(".comath/release/goal3-proof-breadth-closure");
  const finalAuditFilesBefore = collectRelativeFiles(".comath/release/goal3-final-ga-audit");
  const gaCertificateFilesBefore = collectRelativeFiles(".comath/release/goal3-ga-certificate");
  const recheck =
    recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck(
      projectRoot,
      {
        project_id: projectId,
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id:
          "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-0367",
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id:
          task365.body
            .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id,
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path:
          task365.body
            .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path,
        selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_sha256:
          task365.sha256,
        actor: "goal3-task367 token=plain-token proof_success GA certified can_certify_ga=true",
        proof_authority: "lean_kernel_clean_replay",
        can_certify_ga: true,
        final_ga_audit_json: { ok: true },
        proof_breadth_closure_json: { proof_breadth_complete: true }
      }
    );

  assert.equal(
    recheck.schema_version,
    "comath.goal3_release_candidate_proof_breadth_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck.v1"
  );
  assert.equal(recheck.ok, false);
  assert.equal(
    recheck.recheck_status,
    "blocked_next_closure_execution_packaging_results_closure_execution_packaging_results_not_ready_for_closure_recheck"
  );
  assert.equal(
    recheck.selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_artifact.sha256,
    task365.sha256
  );
  assert.equal(
    recheck.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id,
    null
  );
  assert.equal(recheck.blocker_reasons.includes("task365_blocker_reason_redacted"), true);
  assert.equal(recheck.blocker_reasons.includes("task365_not_ready_for_closure_recheck"), true);
  assert.equal(recheck.blocker_reasons.includes("caller_proof_or_ga_authority_material_ignored"), true);
  assert.equal(recheck.proof_breadth_complete, false);
  assert.equal(recheck.final_ga_audit_unblocked, false);
  assert.equal(recheck.runs_lean, false);
  assert.equal(recheck.executes_proofs, false);
  assert.equal(recheck.accepts_caller_success_metadata, false);
  assert.equal(recheck.accepts_caller_proof_material, false);
  assert.equal(recheck.proof_authority, "none");
  assert.equal(recheck.can_promote_claim, false);
  assert.equal(recheck.can_certify_ga, false);
  assert.equal(recheck.ga_certification_gate_separate, true);
  assert.equal(JSON.stringify(recheck).includes(projectRoot), false);
  assert.doesNotMatch(JSON.stringify(recheck), secretTerms);
  assert.doesNotMatch(JSON.stringify(recheck), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(recheck), gaOverclaimTerms);
  assert.deepEqual(
    collectRelativeFiles(".comath/release/goal3-proof-breadth-closure"),
    closureFilesBefore,
    "Task367 must not write Task300 proof-breadth closure artifacts when Task365 is not ready"
  );
  assert.deepEqual(
    collectRelativeFiles(".comath/release/goal3-final-ga-audit"),
    finalAuditFilesBefore,
    "Task367 must not write Task301 final-GA-audit artifacts"
  );
  assert.deepEqual(
    collectRelativeFiles(".comath/release/goal3-ga-certificate"),
    gaCertificateFilesBefore,
    "Task367 must not write Task303 GA-certificate artifacts"
  );

  const persisted = readJson(
    recheck
      .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_path
  );
  assert.equal(
    persisted
      .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_artifact,
    undefined,
    "persisted Task367 artifact must not self-hash recursively"
  );
  assert.equal(
    persisted.delegated_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck,
    undefined,
    "Task367 persisted wrapper must bind delegated Task361 by artifact reference instead of embedding reports"
  );

  const server = createComathServer();
  const routeResponse = await server.inject({
    method: "POST",
    path: "/release/goal3/selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-recheck",
    body: {
      project_root: projectRoot,
      project_id: projectId,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id:
        "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-0367-ROUTE",
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id:
        task365.body
          .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_id,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path:
        task365.body
          .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_path,
      selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_follow_up_sha256:
        task365.sha256,
      actor: "goal3-task367 route token=plain-token proof_success GA certified can_certify_ga=true",
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true
    }
  });
  assert.equal(routeResponse.status, 200);
  assert.equal(
    routeResponse.body
      .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck
      .proof_authority,
    "none"
  );
  assert.equal(
    routeResponse.body
      .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck
      .can_certify_ga,
    false
  );
  assert.doesNotMatch(JSON.stringify(routeResponse.body), secretTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), gaOverclaimTerms);

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (entry) =>
        entry.event_type ===
          "release.goal3_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_recorded" &&
        entry.payload
          .selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_id ===
          "GOAL3-SELECTED-TRANCHE-NEXT-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-EXEC-PACKAGING-RESULTS-CLOSURE-0367-ROUTE" &&
        entry.payload.can_certify_ga === false &&
        entry.payload.proof_authority === "none"
    ),
    true,
    "Task367 must emit non-certifying provenance"
  );

  for (const forbiddenPattern of [
    /selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-recheck/s,
    /selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck/s
  ]) {
    assert.doesNotMatch(repoFile("extensions/comath-pi/src/index.ts"), forbiddenPattern, "Task367 must not add a Pi tool surface");
    assert.doesNotMatch(
      repoFile("extensions/comath-pi/src/runtime-registration.ts"),
      forbiddenPattern,
      "Task367 must not add a Pi runtime command"
    );
  }

  for (const [path, pattern] of [
    ["README.md", /Task367.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging results closure recheck/s],
    ["TODO.md", /Task367.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging results closure recheck/s],
    ["goal-3/tasks.md", /Task367.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging results closure recheck/s],
    ["REVIEW.md", /Goal 3 Task 367/s],
    ["AGENTS.md", /Task367.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging results closure recheck/s],
    ["docs/architecture/ga-release-criteria.md", /Task367.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging results closure recheck/s],
    ["docs/architecture/threat-model.md", /Task367.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging results closure recheck/s],
    ["docs/architecture/acceptance-matrix.md", /Task367.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging results closure recheck/s],
    ["docs/progress/goal-3-ga-gap-matrix.md", /Task367.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging results closure recheck/s]
  ]) {
    assert.match(
      repoFile(path),
      pattern,
      `${path} must document Task367 selected-tranche closure execution packaging results closure execution packaging results closure execution packaging results closure recheck`
    );
  }
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log(
  "Goal 3 Task367 selected-tranche closure execution packaging results closure execution packaging results closure execution packaging results closure recheck tests passed."
);
