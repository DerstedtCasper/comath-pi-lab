import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { ComathError } from "../../errors.js";
import { canonicalJson } from "../../verification/runner-contracts.js";
import type { FormalCandidateProjectReceipt } from "../../research/formal-candidate-project.js";
import { getAcquiredProjectRuntime, type ProjectRuntime } from "../../research/project-runtime.js";
import { readCommittedFile, resolveProjectCommitPath, withProjectCommit, writeCommittedFile } from "../../research/project-commit.js";

const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
function fail(code: string): never { throw new ComathError(code, { code, statusCode: 409 }); }

export type AsyncCleanReplayPreparation = {
  schema_version: "comath.async_clean_replay_preparation.v1";
  operation_id: string;
  replay_id: string;
  campaign_id: string;
  claim_id: string;
  obligation_id: string;
  stage_attempt: number;
  scope_package_sha256: string;
  clean_workspace_path: string;
  preparation_manifest_path: string;
  obligation_receipt_path: string;
  source_project_operation_id: string;
  source_project_sha256: string;
  copied_files: { path: string; sha256: string }[];
  proof_authority: "none";
  can_promote_claim: false;
};

/**
 * Copies an already committed candidate project into an append-only clean replay workspace.
 * This is preparation only: final async Lean execution and existing promotion gates remain separate.
 */
export function prepareAsyncCleanReplayWorkspace(input: {
  runtime: ProjectRuntime;
  project: FormalCandidateProjectReceipt;
  obligation_id: string;
  stage_attempt: number;
}): AsyncCleanReplayPreparation {
  const { runtime, project } = input, store = runtime.store;
  if (getAcquiredProjectRuntime(runtime.root) !== runtime || runtime.referenceCount < 1) fail("RESEARCH_OWNER_REQUIRED");
  if (input.obligation_id !== project.obligation_id || input.stage_attempt !== project.stage_attempt) fail("ASYNC_CLEAN_REPLAY_SCOPE_MISMATCH");
  const sourceCommit = store.get("SELECT phase,plan_json FROM trust_commits WHERE operation_id=?", project.operation_id);
  if (!sourceCommit || sourceCommit.phase !== "committed") fail("ASYNC_CLEAN_REPLAY_SOURCE_UNCOMMITTED");
  const sourcePlan = JSON.parse(String(sourceCommit.plan_json));
  if (canonicalJson(sourcePlan.response) !== canonicalJson(project)) fail("ASYNC_CLEAN_REPLAY_SOURCE_RECEIPT_CHANGED");
  const sourceRoot = project.project.lean_root.replace(/\\/g, "/").replace(/\/$/, "");
  const sourceFiles: { path: string; bytes: Buffer; sha256: string }[] = sourcePlan.targets
    .filter((target: { relative_path: string }) => target.relative_path === sourceRoot || target.relative_path.startsWith(`${sourceRoot}/`))
    .map((target: { relative_path: string; after_sha256: string }) => {
      const bytes = readFileSync(resolveProjectCommitPath(runtime.root, target.relative_path));
      if (hash(bytes) !== target.after_sha256) fail("ASYNC_CLEAN_REPLAY_SOURCE_CHANGED");
      const path = relative(sourceRoot, target.relative_path.replace(/\\/g, "/")).replace(/\\/g, "/");
      if (!path || path.startsWith("../")) fail("ASYNC_CLEAN_REPLAY_SOURCE_PATH_INVALID");
      return { path, bytes, sha256: target.after_sha256 };
    });
  if (!sourceFiles.length) fail("ASYNC_CLEAN_REPLAY_SOURCE_EMPTY");
  const configuration = hash(canonicalJson({ source_project_operation_id: project.operation_id, campaign_id: project.campaign_id,
    claim_id: project.claim_id, obligation_id: input.obligation_id, stage_attempt: input.stage_attempt, scope_package_sha256: project.scope_package_sha256 }));
  const locationKey = `async-clean-replay-location:${configuration}`;
  const replay_id = store.transaction(() => {
    const existing = store.get("SELECT principal_id,request_sha256,response_json,status FROM commands WHERE command_id=?", locationKey);
    if (existing) {
      const value = JSON.parse(String(existing.response_json));
      if (existing.principal_id !== "service:async-clean-replay-location" || existing.status !== "committed"
        || existing.request_sha256 !== hash(canonicalJson(value)) || value.configuration !== configuration || !/^RPLY-\d{4,}$/.test(value.replay_id)) fail("ASYNC_CLEAN_REPLAY_LOCATION_INVALID");
      return value.replay_id as string;
    }
    const value = { configuration, replay_id: store.allocateId("RPLY") };
    store.run("INSERT INTO commands(command_id,principal_id,request_sha256,response_json,status) VALUES (?,'service:async-clean-replay-location',?,?,'committed')",
      locationKey, hash(canonicalJson(value)), canonicalJson(value));
    return value.replay_id as string;
  });
  const clean_workspace_path = `.comath/lean/final_replay/${replay_id}/clean`;
  const preparation_manifest_path = `.comath/evidence/${project.claim_id}/lean/replays/${replay_id}/preparation.json`;
  const obligation_receipt_path = `.comath/campaign/${project.campaign_id}/proof/${project.obligation_id}/replays/${replay_id}/clean-replay-preparation.json`;
  const operation_id = `async-clean-replay-prepare:${configuration}`;
  const receipt: AsyncCleanReplayPreparation = {
    schema_version: "comath.async_clean_replay_preparation.v1", operation_id, replay_id, campaign_id: project.campaign_id,
    claim_id: project.claim_id, obligation_id: project.obligation_id, stage_attempt: project.stage_attempt,
    scope_package_sha256: project.scope_package_sha256, clean_workspace_path, preparation_manifest_path, obligation_receipt_path,
    source_project_operation_id: project.operation_id, source_project_sha256: hash(canonicalJson(project)),
    copied_files: sourceFiles.map(file => ({ path: file.path, sha256: file.sha256 })), proof_authority: "none", can_promote_claim: false
  };
  const existing = store.get("SELECT phase,plan_json FROM trust_commits WHERE operation_id=?", operation_id);
  if (existing) {
    if (existing.phase !== "committed") fail("COMMIT_PENDING");
    const plan = JSON.parse(String(existing.plan_json));
    if (canonicalJson(plan.response) !== canonicalJson(receipt)) fail("ASYNC_CLEAN_REPLAY_RECEIPT_CHANGED");
    for (const target of plan.targets) if (hash(readFileSync(resolveProjectCommitPath(runtime.root, target.relative_path))) !== target.after_sha256) fail("ASYNC_CLEAN_REPLAY_MATERIAL_CHANGED");
    return receipt;
  }
  return withProjectCommit(runtime.root, { operation_id, campaign_id: project.campaign_id, request: { configuration, source_project_operation_id: project.operation_id } }, () => {
    for (const file of sourceFiles) writeCommittedFile(runtime.root, `${clean_workspace_path}/${file.path}`, file.bytes);
    const manifest = canonicalJson(receipt);
    writeCommittedFile(runtime.root, preparation_manifest_path, manifest);
    writeCommittedFile(runtime.root, obligation_receipt_path, manifest);
    return receipt;
  });
}
