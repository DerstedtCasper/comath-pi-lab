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
  readAuditEvents
} = comath;

const recordTask373 =
  comath
    .recordGoal3ReleaseCandidateProofBreadthSelectedTrancheNextClosurePackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureExecutionPackagingResultsClosureRecheck;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task373-closure-exec-packaging-results-recheck-"));
const repoRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const { project } = initProject({
  name: "Goal 3 Task373 selected tranche closure execution packaging results closure execution packaging results closure recheck",
  root_path: projectRoot
});
const projectId = project.project_id;

const prefix = "goal3_release_candidate_proof_breadth_";
const rootSnake = "selected_tranche_next_closure_packaging_results";
const rootKebab = "selected-tranche-next-closure-packaging-results";
const closureExecResultsSnake = "closure_execution_packaging_results";
const closureExecResultsKebab = "closure-execution-packaging-results";
const b2 = [rootSnake, closureExecResultsSnake, closureExecResultsSnake].join("_");
const b3 = [rootSnake, closureExecResultsSnake, closureExecResultsSnake, closureExecResultsSnake].join("_");
const b4 = b3;
const b5 = [
  rootSnake,
  closureExecResultsSnake,
  closureExecResultsSnake,
  closureExecResultsSnake,
  closureExecResultsSnake
].join("_");
const dir2 = [rootKebab, closureExecResultsKebab, closureExecResultsKebab].join("-");
const dir3 = [rootKebab, closureExecResultsKebab, closureExecResultsKebab, closureExecResultsKebab].join("-");
const dir4 = dir3;
const dir5 = [
  rootKebab,
  closureExecResultsKebab,
  closureExecResultsKebab,
  closureExecResultsKebab,
  closureExecResultsKebab
].join("-");
const releaseDir = (directory) => `goal3-${directory}`;

const task373Capability = `${prefix}${b5}_closure_recheck`;
const task373ResultKey = `${b5}_closure_recheck`;
const task373Route = `/release/goal3/${dir5}-closure-recheck`;
const task373ErrorCode = (suffix) => `GOAL3_${`${b5}_closure_recheck`.toUpperCase()}_${suffix}`;
const task373TestFile =
  "goal3-task373-closure-exec-packaging-results-closure-exec-packaging-results-closure-exec-packaging-results-closure-exec-packaging-results-closure-recheck.test.mjs";
const task373SourcePath =
  `services/comathd/src/release/goal3-proof-breadth-${dir5}-closure-recheck.ts`;
const task367RecheckDir = `.comath/release/${releaseDir(dir4)}-closure-recheck`;
const task373RecheckDir = `.comath/release/${releaseDir(dir5)}-closure-recheck`;
const task300Dir = ".comath/release/goal3-proof-breadth-closure";
const task301Dir = ".comath/release/goal3-final-ga-audit";
const task303Dir = ".comath/release/goal3-ga-certificate";
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

function artifactRef(written, kind) {
  return {
    kind,
    path: written.path,
    sha256: written.sha256,
    size_bytes: written.size_bytes
  };
}

function dummyArtifact(id, directory, filename, kind) {
  const path = `.comath/release/${directory}/${id}/${filename}`;
  const written = writeJson(path, {
    schema_version: `comath.${kind}.fixture`,
    id,
    project_id: projectId,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false
  });
  return { path, artifact: artifactRef(written, kind) };
}

function seedTask365FollowUp(task365Id = "GOAL3-TASK373-DELEGATED-TASK365") {
  const task364 = dummyArtifact(
    `${task365Id}-TASK364`,
    `${releaseDir(dir2)}-closure-execution-packaging-follow-through`,
    "follow-through.json",
    `${prefix}${b2}_closure_execution_packaging_follow_through`
  );
  const task362 = dummyArtifact(
    `${task365Id}-TASK362`,
    `${releaseDir(dir2)}-closure-execution-bridge`,
    "bridge.json",
    `${prefix}${b2}_closure_execution_bridge`
  );
  const task361 = dummyArtifact(
    `${task365Id}-TASK361`,
    `${releaseDir(dir2)}-closure-recheck`,
    "recheck.json",
    `${prefix}${b2}_closure_recheck`
  );
  const task356 = dummyArtifact(
    `${task365Id}-TASK356`,
    `${releaseDir(`${rootKebab}-${closureExecResultsKebab}`)}-closure-execution-bridge`,
    "bridge.json",
    `${prefix}${rootSnake}_${closureExecResultsSnake}_closure_execution_bridge`
  );
  const task355 = dummyArtifact(
    `${task365Id}-TASK355`,
    `${releaseDir(`${rootKebab}-${closureExecResultsKebab}`)}-closure-recheck`,
    "recheck.json",
    `${prefix}${rootSnake}_${closureExecResultsSnake}_closure_recheck`
  );
  const task365Path = `.comath/release/${releaseDir(dir3)}-follow-up/${task365Id}/follow-up.json`;
  const task365 = writeJson(task365Path, {
    schema_version: `comath.${prefix}${b3}_follow_up.v1`,
    [`${b3}_follow_up_id`]: task365Id,
    project_id: projectId,
    actor: "goal3-task373 task365 seed token=plain-token proof_success GA certified can_certify_ga=true",
    created_at: "2026-06-14T00:00:00.000Z",
    ok: false,
    follow_up_status: "blocked_next_closure_execution_packaging_not_ready_for_packaging_results_follow_up",
    [`${b3}_follow_up_path`]: task365Path,
    requested_follow_up_mode: `open_formal_workbench_release_candidate_${b3}_follow_up`,
    [`${b2}_closure_execution_packaging_follow_through_id`]: task364.artifact.path.split("/").at(-2),
    [`${b2}_closure_execution_packaging_follow_through_path`]: task364.path,
    [`${b2}_closure_execution_packaging_follow_through_artifact`]: task364.artifact,
    [`${b2}_closure_execution_bridge_id`]: task362.artifact.path.split("/").at(-2),
    [`${b2}_closure_execution_bridge_path`]: task362.path,
    [`${b2}_closure_execution_bridge_artifact`]: task362.artifact,
    [`${b2}_closure_recheck_id`]: task361.artifact.path.split("/").at(-2),
    [`${b2}_closure_recheck_path`]: task361.path,
    [`${b2}_closure_recheck_artifact`]: task361.artifact,
    [`${rootSnake}_${closureExecResultsSnake}_closure_execution_bridge_id`]: task356.artifact.path.split("/").at(-2),
    [`${rootSnake}_${closureExecResultsSnake}_closure_execution_bridge_path`]: task356.path,
    [`${rootSnake}_${closureExecResultsSnake}_closure_execution_bridge_artifact`]: task356.artifact,
    [`${rootSnake}_${closureExecResultsSnake}_closure_recheck_id`]: task355.artifact.path.split("/").at(-2),
    [`${rootSnake}_${closureExecResultsSnake}_closure_recheck_path`]: task355.path,
    [`${rootSnake}_${closureExecResultsSnake}_closure_recheck_artifact`]: task355.artifact,
    [`delegated_${b2}_follow_up_id`]: null,
    [`delegated_${b2}_follow_up_path`]: null,
    [`delegated_${b2}_follow_up_artifact`]: null,
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
    blocker_reasons: ["task364_not_ready_for_packaging_results_follow_up", "plain-token proof_success GA certified"],
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
  return {
    ...task365,
    artifact: artifactRef(task365, `${prefix}${b3}_follow_up`)
  };
}

function seedTask371FollowUp({
  task371Id = "GOAL3-TASK373-SOURCE-TASK371",
  delegatedReady = false
} = {}) {
  const task370 = dummyArtifact(
    `${task371Id}-TASK370`,
    `${releaseDir(dir4)}-closure-execution-packaging-follow-through`,
    "follow-through.json",
    `${prefix}${b4}_closure_execution_packaging_follow_through`
  );
  const task368 = dummyArtifact(
    `${task371Id}-TASK368`,
    `${releaseDir(dir4)}-closure-execution-bridge`,
    "bridge.json",
    `${prefix}${b4}_closure_execution_bridge`
  );
  const task367 = dummyArtifact(
    `${task371Id}-TASK367`,
    `${releaseDir(dir4)}-closure-recheck`,
    "recheck.json",
    `${prefix}${b4}_closure_recheck`
  );
  const task364 = delegatedReady
    ? dummyArtifact(
        `${task371Id}-TASK364`,
        `${releaseDir(dir2)}-closure-execution-packaging-follow-through`,
        "follow-through.json",
        `${prefix}${b2}_closure_execution_packaging_follow_through`
      )
    : null;
  const delegatedTask365 = delegatedReady ? seedTask365FollowUp(`${task371Id}-TASK365`) : null;
  const task371Path = `.comath/release/${releaseDir(dir5)}-follow-up/${task371Id}/follow-up.json`;
  const task371 = writeJson(task371Path, {
    schema_version: `comath.${prefix}${b5}_follow_up.v1`,
    [`${b5}_follow_up_id`]: task371Id,
    project_id: projectId,
    actor: "goal3-task373 task371 seed token=plain-token proof_success GA certified can_certify_ga=true",
    created_at: "2026-06-14T00:00:00.000Z",
    ok: false,
    follow_up_status: delegatedReady
      ? "blocked_next_closure_execution_packaging_results_selected_tranche_packaging_results_incomplete"
      : "blocked_next_closure_execution_packaging_results_closure_execution_packaging_not_ready_for_packaging_results_follow_up",
    [`${b5}_follow_up_path`]: task371Path,
    requested_follow_up_mode: `open_formal_workbench_release_candidate_${b5}_follow_up`,
    [`${b4}_closure_execution_packaging_follow_through_id`]: task370.artifact.path.split("/").at(-2),
    [`${b4}_closure_execution_packaging_follow_through_path`]: task370.path,
    [`${b4}_closure_execution_packaging_follow_through_artifact`]: task370.artifact,
    [`${b4}_closure_execution_bridge_id`]: task368.artifact.path.split("/").at(-2),
    [`${b4}_closure_execution_bridge_path`]: task368.path,
    [`${b4}_closure_execution_bridge_artifact`]: task368.artifact,
    [`${b4}_closure_recheck_id`]: task367.artifact.path.split("/").at(-2),
    [`${b4}_closure_recheck_path`]: task367.path,
    [`${b4}_closure_recheck_artifact`]: task367.artifact,
    [`delegated_${b2}_closure_execution_packaging_follow_through_id`]:
      task364?.artifact.path.split("/").at(-2) ?? null,
    [`delegated_${b2}_closure_execution_packaging_follow_through_path`]: task364?.path ?? null,
    [`delegated_${b2}_closure_execution_packaging_follow_through_artifact`]: task364?.artifact ?? null,
    [`delegated_${b3}_follow_up_id`]: delegatedTask365?.body[`${b3}_follow_up_id`] ?? null,
    [`delegated_${b3}_follow_up_path`]: delegatedTask365?.path ?? null,
    [`delegated_${b3}_follow_up_artifact`]: delegatedTask365?.artifact ?? null,
    selected_task_count: delegatedReady ? 1 : 0,
    verified_selected_task_count: 0,
    missing_selected_task_count: delegatedReady ? 1 : 0,
    blocked_selected_task_count: delegatedReady ? 1 : 0,
    selected_task_ids: delegatedReady ? ["PM-SELECTED-T373"] : [],
    verified_selected_task_ids: [],
    missing_selected_task_ids: delegatedReady ? ["PM-SELECTED-T373"] : [],
    blocked_selected_task_ids: delegatedReady ? ["PM-SELECTED-T373"] : [],
    selected_packaging_report_artifacts: delegatedReady ? [delegatedTask365.artifact] : [],
    selected_packaging_report_artifacts_current: delegatedReady,
    ready_for_proof_breadth_closure_recheck: delegatedReady,
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
  return {
    ...task371,
    artifact: artifactRef(task371, `${prefix}${b5}_follow_up`),
    delegatedTask365
  };
}

try {
  assert.equal(typeof recordTask373, "function", "Task373 must export a Task371-bound closure recheck wrapper");
  assert.ok(
    getComathdStatus().capabilities.includes(task373Capability),
    "Task373 capability ledger must advertise closure recheck without authority"
  );
  assert.match(repoFile("scripts/phase0-smoke.mjs"), new RegExp(task373TestFile.replace(/\./g, "\\."), "s"));

  const task373Source = repoFile(task373SourcePath);
  assert.match(
    task373Source,
    new RegExp(`goal3-proof-breadth-${dir4}-closure-recheck\\.js`, "s"),
    "Task373 must delegate through the existing Task367 closure recheck wrapper"
  );
  for (const forbiddenPattern of [
    /goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-follow-up\.js/s,
    /goal3-proof-breadth-selected-tranche-next-closure-packaging-results-closure-execution-packaging-results-closure-execution-packaging-results-follow-up\.js/s,
    /recordGoal3ReleaseCandidateProofBreadthClosure|recordGoal3FinalGaAudit|recordGoal3GaCertificate/s,
    /runLean|LeanRunner|spawnSync|execFile|child_process/s
  ]) {
    assert.doesNotMatch(
      task373Source,
      forbiddenPattern,
      "Task373 must not run Lean, call lower producers directly, or touch final-audit/certificate gates"
    );
  }

  const staleTask371 = seedTask371FollowUp();
  assert.throws(
    () =>
      recordTask373(projectRoot, {
        project_id: projectId,
        [`${b5}_closure_recheck_id`]: "GOAL3-TASK373-STALE",
        [`${b5}_follow_up_id`]: staleTask371.body[`${b5}_follow_up_id`],
        [`${b5}_follow_up_path`]: staleTask371.path,
        [`${b5}_follow_up_sha256`]: "0".repeat(64)
      }),
    {
      code: task373ErrorCode("STALE_TASK371")
    },
    "Task373 must reject stale Task371 artifacts"
  );

  const task371Path = staleTask371.path;
  const originalTask371Text = readFileSync(join(projectRoot, task371Path), "utf8");
  const weakenedTask371Text = `${JSON.stringify({ ...JSON.parse(originalTask371Text), can_certify_ga: true }, null, 2)}\n`;
  writeFileSync(join(projectRoot, task371Path), weakenedTask371Text, "utf8");
  assert.throws(
    () =>
      recordTask373(projectRoot, {
        project_id: projectId,
        [`${b5}_closure_recheck_id`]: "GOAL3-TASK373-WEAKENED",
        [`${b5}_follow_up_id`]: staleTask371.body[`${b5}_follow_up_id`],
        [`${b5}_follow_up_path`]: task371Path,
        [`${b5}_follow_up_sha256`]: sha256Text(weakenedTask371Text)
      }),
    {
      code: task373ErrorCode("INVALID_TASK371")
    },
    "Task373 must reject current Task371 artifacts with weakened no-authority flags"
  );
  writeFileSync(join(projectRoot, task371Path), originalTask371Text, "utf8");

  const task371ReadyForDrift = seedTask371FollowUp({ task371Id: "GOAL3-TASK373-DRIFT-SOURCE", delegatedReady: true });
  const driftText = `${JSON.stringify(
    {
      ...task371ReadyForDrift.body,
      [`delegated_${b3}_follow_up_artifact`]: {
        ...task371ReadyForDrift.body[`delegated_${b3}_follow_up_artifact`],
        path: ".comath/release/forged/task365.json"
      }
    },
    null,
    2
  )}\n`;
  writeFileSync(join(projectRoot, task371ReadyForDrift.path), driftText, "utf8");
  assert.throws(
    () =>
      recordTask373(projectRoot, {
        project_id: projectId,
        [`${b5}_closure_recheck_id`]: "GOAL3-TASK373-DRIFT",
        [`${b5}_follow_up_id`]: task371ReadyForDrift.body[`${b5}_follow_up_id`],
        [`${b5}_follow_up_path`]: task371ReadyForDrift.path,
        [`${b5}_follow_up_sha256`]: sha256Text(driftText)
      }),
    {
      code: task373ErrorCode("INVALID_TASK371")
    },
    "Task373 must reject Task371 artifacts whose delegated Task365 reference drifts"
  );

  const blockedTask371 = seedTask371FollowUp({ task371Id: "GOAL3-TASK373-BLOCKED-SOURCE", delegatedReady: false });
  const delegatedTask367BeforeBlocked = collectRelativeFiles(task367RecheckDir);
  const blockedRecheck = recordTask373(projectRoot, {
    project_id: projectId,
    [`${b5}_closure_recheck_id`]: "GOAL3-TASK373-BLOCKED",
    [`${b5}_follow_up_id`]: blockedTask371.body[`${b5}_follow_up_id`],
    [`${b5}_follow_up_path`]: blockedTask371.path,
    [`${b5}_follow_up_sha256`]: blockedTask371.sha256,
    actor: "goal3-task373 blocked token=plain-token proof_success GA certified can_certify_ga=true",
    proof_authority: "lean_kernel_clean_replay",
    can_certify_ga: true
  });
  assert.equal(blockedRecheck.ok, false);
  assert.equal(
    blockedRecheck.recheck_status,
    "blocked_next_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_not_ready_for_closure_recheck"
  );
  assert.equal(blockedRecheck[`delegated_${b4}_closure_recheck_id`], null);
  assert.equal(blockedRecheck.proof_breadth_closure_id, null);
  assert.equal(blockedRecheck.blocker_reasons.includes("task371_not_ready_for_closure_recheck"), true);
  assert.deepEqual(
    collectRelativeFiles(task367RecheckDir),
    delegatedTask367BeforeBlocked,
    "Task373 must not run delegated Task367 closure recheck when Task371 has no delegated Task365"
  );
  assert.equal(blockedRecheck.proof_authority, "none");
  assert.equal(blockedRecheck.can_promote_claim, false);
  assert.equal(blockedRecheck.can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(blockedRecheck), secretTerms);
  assert.doesNotMatch(JSON.stringify(blockedRecheck), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(blockedRecheck), gaOverclaimTerms);

  const readyTask371 = seedTask371FollowUp({ task371Id: "GOAL3-TASK373-READY-SOURCE", delegatedReady: true });
  const closureFilesBefore = collectRelativeFiles(task300Dir);
  const finalAuditFilesBefore = collectRelativeFiles(task301Dir);
  const gaCertificateFilesBefore = collectRelativeFiles(task303Dir);
  const delegatedTask367Before = collectRelativeFiles(task367RecheckDir);
  const recheck = recordTask373(projectRoot, {
    project_id: projectId,
    [`${b5}_closure_recheck_id`]: "GOAL3-TASK373",
    [`${b5}_follow_up_id`]: readyTask371.body[`${b5}_follow_up_id`],
    [`${b5}_follow_up_path`]: readyTask371.path,
    [`${b5}_follow_up_sha256`]: readyTask371.sha256,
    actor: "goal3-task373 token=plain-token proof_success GA certified can_certify_ga=true",
    proof_authority: "lean_kernel_clean_replay",
    can_certify_ga: true,
    final_ga_audit_json: { ok: true },
    proof_breadth_closure_json: { proof_breadth_complete: true }
  });
  assert.equal(recheck.schema_version, `comath.${task373Capability}.v1`);
  assert.equal(recheck[`${b5}_follow_up_artifact`].sha256, readyTask371.sha256);
  assert.equal(recheck[`delegated_${b3}_follow_up_artifact`].sha256, readyTask371.delegatedTask365.sha256);
  assert.ok(recheck[`delegated_${b4}_closure_recheck_id`].startsWith("G3-T373-T367-"));
  assert.equal(recheck[`delegated_${b4}_closure_recheck_artifact`].kind, `${prefix}${b4}_closure_recheck`);
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
  assert.equal(recheck.blocker_reasons.includes("caller_proof_or_ga_authority_material_ignored"), true);
  assert.equal(JSON.stringify(recheck).includes(projectRoot), false);
  assert.doesNotMatch(JSON.stringify(recheck), secretTerms);
  assert.doesNotMatch(JSON.stringify(recheck), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(recheck), gaOverclaimTerms);
  assert.ok(
    collectRelativeFiles(task367RecheckDir).length > delegatedTask367Before.length,
    "Task373 must delegate through Task367 only when Task371 binds delegated Task365 material"
  );
  assert.deepEqual(collectRelativeFiles(task300Dir), closureFilesBefore);
  assert.deepEqual(collectRelativeFiles(task301Dir), finalAuditFilesBefore);
  assert.deepEqual(collectRelativeFiles(task303Dir), gaCertificateFilesBefore);

  const persisted = readJson(recheck[`${b5}_closure_recheck_path`]);
  assert.equal(persisted[`${b5}_closure_recheck_artifact`], undefined);
  assert.equal(persisted[`delegated_${b4}_closure_recheck`], undefined);

  const server = createComathServer();
  const routeTask371 = seedTask371FollowUp({ task371Id: "GOAL3-TASK373-ROUTE-SOURCE", delegatedReady: false });
  const routeResponse = await server.inject({
    method: "POST",
    path: task373Route,
    body: {
      project_root: projectRoot,
      project_id: projectId,
      [`${b5}_closure_recheck_id`]: "GOAL3-TASK373-ROUTE",
      [`${b5}_follow_up_id`]: routeTask371.body[`${b5}_follow_up_id`],
      [`${b5}_follow_up_path`]: routeTask371.path,
      [`${b5}_follow_up_sha256`]: routeTask371.sha256,
      actor: "goal3-task373 route token=plain-token proof_success GA certified can_certify_ga=true",
      proof_authority: "lean_kernel_clean_replay",
      can_certify_ga: true
    }
  });
  assert.equal(routeResponse.status, 200);
  assert.equal(routeResponse.body[task373ResultKey].proof_authority, "none");
  assert.equal(routeResponse.body[task373ResultKey].can_certify_ga, false);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), secretTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), proofAuthorityTerms);
  assert.doesNotMatch(JSON.stringify(routeResponse.body), gaOverclaimTerms);

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(
    auditEvents.some(
      (entry) =>
        entry.event_type ===
          "release.goal3_selected_tranche_next_closure_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_execution_packaging_results_closure_recheck_recorded" &&
        entry.payload[`${b5}_closure_recheck_id`] === "GOAL3-TASK373-ROUTE" &&
        entry.payload.can_certify_ga === false &&
        entry.payload.proof_authority === "none"
    ),
    true,
    "Task373 must emit non-certifying provenance"
  );

  for (const forbiddenPattern of [
    new RegExp(`${dir5}-closure-recheck`, "s"),
    new RegExp(`${b5}_closure_recheck`, "s")
  ]) {
    assert.doesNotMatch(repoFile("extensions/comath-pi/src/index.ts"), forbiddenPattern, "Task373 must not add a Pi tool surface");
    assert.doesNotMatch(
      repoFile("extensions/comath-pi/src/runtime-registration.ts"),
      forbiddenPattern,
      "Task373 must not add a Pi runtime command"
    );
  }

  for (const [path, pattern] of [
    ["README.md", /Task373.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging results closure execution packaging results closure recheck/s],
    ["TODO.md", /Task373.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging results closure execution packaging results closure recheck/s],
    ["goal-3/tasks.md", /Task373.*Selected-Tranche.*Closure Execution Packaging Results Closure Execution Packaging Results Closure Execution Packaging Results Closure Execution Packaging Results Closure Recheck/s],
    ["REVIEW.md", /Goal 3 Task 373/s],
    ["AGENTS.md", /Task373.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging results closure execution packaging results closure recheck/s],
    ["docs/architecture/ga-release-criteria.md", /Task373.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging results closure execution packaging results closure recheck/s],
    ["docs/architecture/threat-model.md", /Task373.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging results closure execution packaging results closure recheck/s],
    ["docs/architecture/acceptance-matrix.md", /Task373.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging results closure execution packaging results closure recheck/s],
    ["docs/progress/goal-3-ga-gap-matrix.md", /Task373.*selected-tranche.*closure execution packaging results closure execution packaging results closure execution packaging results closure execution packaging results closure recheck/s]
  ]) {
    assert.match(repoFile(path), pattern, `${path} must document Task373 selected-tranche closure recheck`);
  }
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log(
  "Goal 3 Task373 selected-tranche closure execution packaging results closure execution packaging results closure execution packaging results closure execution packaging results closure recheck tests passed."
);
