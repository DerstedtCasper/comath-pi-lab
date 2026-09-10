import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { appendAuditEvent } from "../../audit/jsonl-writer.js";
import { assertPathAllowed } from "../../security/path-policy.js";
import { leanRunManifestV3Schema, type LeanRunManifestV3 } from "../../types/schemas.js";
import { runLeanToolCommand, runLeanToolCommandAsync, parseLeanVersionOutput, parseLakeVersionOutput, serviceToolBinary,
  type LeanHostAsyncCommandOptions, type LeanHostAsyncCommandResult } from "./lean-host-tools.js";
import { sha256Buffer, sha256FileSync } from "./lean-project.js";
import { canonicalJson } from "../../verification/runner-contracts.js";
import { getAcquiredProjectRuntime, type ProjectRuntime } from "../../research/project-runtime.js";
import { assertProjectReadable, existsCommittedFile, readCommittedFile, withProjectCommit, writeCommittedFile, type ProjectCommitOperation } from "../../research/project-commit.js";
import { ComathError } from "../../errors.js";
import { requireApprovedFormalScope } from "../campaign/formal-spec-store.js";

export type LeanRunPurpose = LeanRunManifestV3["purpose"];

export type LeanToolchainMetadata = {
  lean_version: string;
  lake_version: string;
  elan_toolchain: string;
};

function normalizeRel(projectRoot: string, path: string): string {
  const absolute = isAbsolute(path) ? resolve(path) : resolve(projectRoot, path);
  return relative(resolve(projectRoot), absolute).replace(/\\/g, "/") || ".";
}

function cwdDigest(cwd: string, inputFiles: string[]): string {
  const rows = inputFiles
    .map((path) => {
      const rel = normalizeRel(cwd, path);
      const hash = sha256FileSync(path).sha256;
      return `${rel}:${hash}`;
    })
    .sort();
  return sha256Buffer(rows.join("\n"));
}

function assertAppendOnlyEvidencePath(path: string): void {
  if (existsSync(path)) {
    throw new Error("lean_run_manifest_append_only_violation");
  }
}

function leanRunManifestIndexPath(projectRoot: string, claimId: string): string {
  return assertPathAllowed(
    projectRoot,
    join(".comath", "evidence", claimId, "lean", "lean_run_manifest_index.jsonl"),
    { purpose: "runtime-write" }
  );
}

export function appendLeanRunManifestProvenanceIndexV1(input: {
  projectRoot: string;
  project_id?: string;
  actor?: string;
  manifest: LeanRunManifestV3;
  manifest_path: string;
}): void {
  const manifestPath = assertPathAllowed(input.projectRoot, input.manifest_path, { purpose: "read", resolveRealpath: true });
  const manifestRel = normalizeRel(input.projectRoot, manifestPath);
  const manifestHash = sha256FileSync(manifestPath).sha256;
  const row = {
    schema_version: "comath.lean_run_manifest_index.v1",
    claim_id: input.manifest.claim_id,
    campaign_id: input.manifest.campaign_id,
    candidate_id: input.manifest.candidate_id,
    run_id: input.manifest.run_id,
    purpose: input.manifest.purpose,
    manifest_path: manifestRel,
    manifest_sha256: manifestHash,
    stdout_path: input.manifest.stdout_path,
    stdout_sha256: input.manifest.stdout_sha256,
    stderr_path: input.manifest.stderr_path,
    stderr_sha256: input.manifest.stderr_sha256,
    exit_code: input.manifest.exit_code,
    runner: input.manifest.runner,
    append_only: true,
    proof_authority: input.manifest.proof_authority,
    recorded_at: new Date().toISOString()
  };
  const indexPath = leanRunManifestIndexPath(input.projectRoot, input.manifest.claim_id);
  mkdirSync(dirname(indexPath), { recursive: true });
  appendFileSync(indexPath, `${JSON.stringify(row)}\n`, "utf8");

  if (input.project_id && input.actor) {
    appendAuditEvent(input.projectRoot, {
      project_id: input.project_id,
      event_type: "lean_run_manifest.written",
      actor: input.actor,
      target_id: input.manifest.claim_id,
      payload: {
        run_id: input.manifest.run_id,
        campaign_id: input.manifest.campaign_id,
        candidate_id: input.manifest.candidate_id,
        purpose: input.manifest.purpose,
        manifest_path: manifestRel,
        manifest_sha256: manifestHash,
        stdout_path: input.manifest.stdout_path,
        stdout_sha256: input.manifest.stdout_sha256,
        stderr_path: input.manifest.stderr_path,
        stderr_sha256: input.manifest.stderr_sha256,
        exit_code: input.manifest.exit_code,
        runner: input.manifest.runner,
        append_only: true,
        proof_authority: input.manifest.proof_authority
      }
    });
  }
}

export function hasLeanRunManifestProvenanceIndexV1(input: {
  projectRoot: string;
  manifest: unknown;
  manifest_path: string;
}): boolean {
  const parsed = leanRunManifestV3Schema.safeParse(input.manifest);
  if (!parsed.success) {
    return false;
  }
  const manifest = parsed.data;
  const manifestRel = normalizeRel(input.projectRoot, input.manifest_path);
  let manifestHash: string;
  try {
    manifestHash = sha256FileSync(assertPathAllowed(input.projectRoot, input.manifest_path, { purpose: "read", resolveRealpath: true })).sha256;
  } catch {
    return false;
  }

  let indexPath: string;
  try {
    indexPath = assertPathAllowed(
      input.projectRoot,
      join(".comath", "evidence", manifest.claim_id, "lean", "lean_run_manifest_index.jsonl"),
      { purpose: "read", resolveRealpath: true }
    );
  } catch {
    return false;
  }
  if (!existsSync(indexPath)) {
    return false;
  }

  return readFileSync(indexPath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .some((line) => {
      try {
        const row = JSON.parse(line) as Record<string, unknown>;
        return (
          row.schema_version === "comath.lean_run_manifest_index.v1" &&
          row.claim_id === manifest.claim_id &&
          row.campaign_id === manifest.campaign_id &&
          row.candidate_id === manifest.candidate_id &&
          row.run_id === manifest.run_id &&
          row.purpose === manifest.purpose &&
          row.manifest_path === manifestRel &&
          row.manifest_sha256 === manifestHash &&
          row.stdout_path === manifest.stdout_path &&
          row.stdout_sha256 === manifest.stdout_sha256 &&
          row.stderr_path === manifest.stderr_path &&
          row.stderr_sha256 === manifest.stderr_sha256 &&
          row.exit_code === manifest.exit_code &&
          row.runner === "comathd.LeanRunner" &&
          row.append_only === true &&
          row.proof_authority === manifest.proof_authority
        );
      } catch {
        return false;
      }
    });
}

function parseLeanVersion(output: string): string | undefined {
  return parseLeanVersionOutput(output);
}

function parseLakeVersion(output: string): string | undefined {
  return parseLakeVersionOutput(output);
}

function parseToolchainVersion(leanToolchain: string): string | undefined {
  return /^leanprover\/lean4:v([0-9]+\.[0-9]+\.[0-9]+)$/.exec(leanToolchain.trim())?.[1];
}

export function parseLeanToolchainMetadata(input: {
  leanVersionOutput: string;
  lakeVersionOutput: string;
  leanToolchain: string;
}): LeanToolchainMetadata {
  const leanVersion = parseLeanVersion(input.leanVersionOutput);
  if (!leanVersion) {
    throw new Error("lean_version_unknown");
  }

  const lakeVersion = parseLakeVersion(input.lakeVersionOutput);
  if (!lakeVersion) {
    throw new Error("lake_version_missing");
  }

  const toolchain = input.leanToolchain.trim();
  if (!toolchain) {
    throw new Error("lean_toolchain_missing");
  }

  const toolchainVersion = parseToolchainVersion(toolchain);
  if (!toolchainVersion) {
    throw new Error("lean_toolchain_parse_failure");
  }
  if (toolchainVersion !== leanVersion) {
    throw new Error("lean_toolchain_mismatch");
  }

  return {
    lean_version: leanVersion,
    lake_version: lakeVersion,
    elan_toolchain: toolchain
  };
}

export function createServiceOwnedLeanRunManifestV3(input: {
  projectRoot: string;
  run_id: string;
  claim_id: string;
  campaign_id: string;
  candidate_id?: string;
  purpose: LeanRunPurpose;
  command: string[];
  cwd: string;
  input_files: string[];
  lean_version: string;
  lake_version: string;
  elan_toolchain?: string;
  lean_binary_file?: string;
  lake_binary_file?: string;
  lean_toolchain_file: string;
  lake_manifest_file?: string;
  dependency_graph_sha256?: string;
  network_policy: LeanRunManifestV3["network_policy"];
  sandbox: LeanRunManifestV3["sandbox"];
  exit_code: number;
  stdout_path: string;
  stderr_path: string;
  started_at: string;
  ended_at: string;
  proof_authority: LeanRunManifestV3["proof_authority"];
}): LeanRunManifestV3 {
  if (!existsSync(input.lean_toolchain_file)) {
    throw new Error("lean_toolchain_missing");
  }

  const inputFiles = Array.from(new Set(input.input_files.map((path) => resolve(path))));
  const inputFileEntries = inputFiles.map((path) => {
    const stat = statSync(path);
    return {
      path: normalizeRel(input.projectRoot, path),
      sha256: sha256FileSync(path).sha256,
      size_bytes: stat.size
    };
  });

  const leanToolchainFile = assertPathAllowed(input.projectRoot, input.lean_toolchain_file, {
    purpose: "read",
    resolveRealpath: true
  });
  const stdoutPath = assertPathAllowed(input.projectRoot, input.stdout_path, { purpose: "read", resolveRealpath: true });
  const stderrPath = assertPathAllowed(input.projectRoot, input.stderr_path, { purpose: "read", resolveRealpath: true });

  return leanRunManifestV3Schema.parse({
    schema_version: "comath.lean_run_manifest.v3",
    run_id: input.run_id,
    claim_id: input.claim_id,
    campaign_id: input.campaign_id,
    candidate_id: input.candidate_id,
    purpose: input.purpose,
    command: input.command,
    cwd: normalizeRel(input.projectRoot, input.cwd),
    cwd_sha256_before: cwdDigest(input.cwd, inputFiles),
    input_files: inputFileEntries,
    lean_version: input.lean_version,
    lake_version: input.lake_version,
    elan_toolchain: input.elan_toolchain,
    lean_binary_sha256: input.lean_binary_file ? sha256FileSync(input.lean_binary_file).sha256 : undefined,
    lake_binary_sha256: input.lake_binary_file ? sha256FileSync(input.lake_binary_file).sha256 : undefined,
    lean_toolchain_file_sha256: sha256FileSync(leanToolchainFile).sha256,
    lake_manifest_sha256: input.lake_manifest_file ? sha256FileSync(input.lake_manifest_file).sha256 : undefined,
    dependency_graph_sha256: input.dependency_graph_sha256,
    network_policy: input.network_policy,
    sandbox: input.sandbox,
    exit_code: input.exit_code,
    stdout_path: normalizeRel(input.projectRoot, stdoutPath),
    stderr_path: normalizeRel(input.projectRoot, stderrPath),
    stdout_sha256: sha256FileSync(stdoutPath).sha256,
    stderr_sha256: sha256FileSync(stderrPath).sha256,
    started_at: input.started_at,
    ended_at: input.ended_at,
    runner: "comathd.LeanRunner",
    proof_authority: input.proof_authority
  });
}

export function runServiceOwnedLeanCommandV3(input: {
  projectRoot: string;
  project_id?: string;
  actor?: string;
  run_id: string;
  claim_id: string;
  campaign_id: string;
  candidate_id?: string;
  purpose: LeanRunPurpose;
  command: string[];
  cwd: string;
  input_files: string[];
  leanVersionOutput: string;
  lakeVersionOutput: string;
  leanToolchain: string;
  lean_binary_file?: string;
  lake_binary_file?: string;
  network_policy: LeanRunManifestV3["network_policy"];
  sandbox: LeanRunManifestV3["sandbox"];
  proof_authority: LeanRunManifestV3["proof_authority"];
  run?: (command: string[], cwd: string) => { exit_code: number; stdout: string; stderr: string };
}): { manifest: LeanRunManifestV3; stdout: string; stderr: string } {
  if (input.command.length === 0) {
    throw new Error("lean_command_missing");
  }
  const metadata = parseLeanToolchainMetadata({
    leanVersionOutput: input.leanVersionOutput,
    lakeVersionOutput: input.lakeVersionOutput,
    leanToolchain: input.leanToolchain
  });

  const stdoutRel = join(".comath", "evidence", input.claim_id, "lean", `${input.run_id}.stdout.log`);
  const stderrRel = join(".comath", "evidence", input.claim_id, "lean", `${input.run_id}.stderr.log`);
  const manifestRel = join(".comath", "evidence", input.claim_id, "lean", `${input.run_id}.manifest.json`);
  const stdoutPath = assertPathAllowed(input.projectRoot, stdoutRel, { purpose: "runtime-write" });
  const stderrPath = assertPathAllowed(input.projectRoot, stderrRel, { purpose: "runtime-write" });
  const manifestPath = assertPathAllowed(input.projectRoot, manifestRel, { purpose: "runtime-write" });
  assertAppendOnlyEvidencePath(stdoutPath);
  assertAppendOnlyEvidencePath(stderrPath);
  assertAppendOnlyEvidencePath(manifestPath);

  const startedAt = new Date().toISOString();
  const result = input.run
    ? input.run(input.command, input.cwd)
    : (() => {
        const [command, ...args] = input.command;
        const spawned = runLeanToolCommand(command, args, input.cwd, input.leanToolchain, {
          COMATH_RUNNER_NETWORK: input.network_policy === "disabled" ? "disabled" : "unknown"
        });
        return {
          exit_code: spawned.exit_code,
          stdout: spawned.stdout,
          stderr: spawned.stderr
        };
      })();
  const endedAt = new Date().toISOString();

  mkdirSync(dirname(stdoutPath), { recursive: true });
  writeFileSync(stdoutPath, result.stdout, "utf8");
  writeFileSync(stderrPath, result.stderr, "utf8");

  const toolchainFile = input.input_files.find((file) => {
    const rel = normalizeRel(input.projectRoot, file);
    return rel === "lean-toolchain" || rel.endsWith("/lean-toolchain");
  });
  if (!toolchainFile) {
    throw new Error("lean_toolchain_missing");
  }

  const manifest = createServiceOwnedLeanRunManifestV3({
    projectRoot: input.projectRoot,
    run_id: input.run_id,
    claim_id: input.claim_id,
    campaign_id: input.campaign_id,
    candidate_id: input.candidate_id,
    purpose: input.purpose,
    command: input.command,
    cwd: input.cwd,
    input_files: input.input_files,
    lean_version: metadata.lean_version,
    lake_version: metadata.lake_version,
    elan_toolchain: metadata.elan_toolchain,
    lean_binary_file: input.lean_binary_file,
    lake_binary_file: input.lake_binary_file,
    lean_toolchain_file: toolchainFile,
    network_policy: input.network_policy,
    sandbox: input.sandbox,
    exit_code: result.exit_code,
    stdout_path: stdoutPath,
    stderr_path: stderrPath,
    started_at: startedAt,
    ended_at: endedAt,
    proof_authority: result.exit_code === 0 ? input.proof_authority : "none"
  });
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  appendLeanRunManifestProvenanceIndexV1({
    projectRoot: input.projectRoot,
    project_id: input.project_id,
    actor: input.actor,
    manifest,
    manifest_path: manifestPath
  });

  return { manifest, stdout: result.stdout, stderr: result.stderr };
}

export type AsyncLeanCommandInput = {
  runtime: ProjectRuntime; command_id: string; claim_id: string; campaign_id: string; candidate_id?: string;
  purpose: LeanRunPurpose; command: ["lean" | "lake", ...string[]]; cwd: string; input_files: string[];
  leanVersionOutput: string; lakeVersionOutput: string; leanToolchain: string;
  network_policy: LeanRunManifestV3["network_policy"]; proof_authority: LeanRunManifestV3["proof_authority"];
  execution: LeanHostAsyncCommandOptions; commitFault?: ProjectCommitOperation["fault"];
};
export type AsyncLeanCommandReceipt = { schema_version: "comath.async_lean_command.v1"; operation_id: string; run_id: string;
  manifest_path: string; manifest: LeanRunManifestV3; execution: LeanHostAsyncCommandResult["completion"];
  input_changed: boolean; commit_state: "pending" | "committed"; proof_authority: "none" };

/** Prepare immutable identity and hashes, execute outside a writer transaction, then commit actual evidence. */
export async function runServiceOwnedLeanCommandV3Async(input: AsyncLeanCommandInput): Promise<AsyncLeanCommandReceipt> {
  const runtime = input.runtime, store = runtime.store, root = runtime.root;
  function fail(code: string): never { throw new ComathError(code, { code, statusCode: 409 }); }
  if (getAcquiredProjectRuntime(root) !== runtime || runtime.referenceCount < 1) fail("RESEARCH_OWNER_REQUIRED");
  if (store.inTransaction) fail("LEAN_ASYNC_WRITER_TRANSACTION_FORBIDDEN");
  if (!input.command_id || input.command_id.length > 160 || !/^[A-Za-z0-9_-]{1,160}$/.test(input.claim_id)
    || !["lean", "lake"].includes(input.command[0]) || input.execution.runtime !== runtime) fail("LEAN_ASYNC_INPUT_INVALID");
  const ownership = input.execution.ownership, task = store.getTask(ownership.task_id);
  if (!task || task.scope.kind !== "formal" || task.scope.claim_id !== input.claim_id || task.campaign_id !== input.campaign_id
    || ownership.campaign_id !== input.campaign_id || ownership.generation !== task.generation) fail("LEAN_ASYNC_SCOPE_MISMATCH");
  const scope = task.scope;
  requireApprovedFormalScope(runtime, input.campaign_id, scope);
  const metadata = parseLeanToolchainMetadata(input);
  const cwd = assertPathAllowed(root, input.cwd, { purpose: "read", resolveRealpath: true });
  const files = [...new Set(input.input_files.map(path => assertPathAllowed(root, path, { purpose: "read", resolveRealpath: true })))];
  if (!files.length || files.length > 10000) fail("LEAN_ASYNC_INPUT_INVALID");
  const toolchainFile = files.find(path => path.replace(/\\/g, "/").endsWith("/lean-toolchain"));
  if (!toolchainFile || readFileSync(toolchainFile, "utf8").trim() !== input.leanToolchain.trim()) fail("LEAN_ASYNC_TOOLCHAIN_MISMATCH");
  const leanBinary = serviceToolBinary("lean", input.leanToolchain), lakeBinary = serviceToolBinary("lake", input.leanToolchain);
  if (!leanBinary || !lakeBinary) fail("LEAN_ASYNC_BINARY_UNAVAILABLE");
  const sourceSnapshot = files.map(path => ({ path: normalizeRel(root, path), ...sha256FileSync(path) }));
  const beforeDigest = cwdDigest(cwd, files), leanHash = sha256FileSync(leanBinary).sha256, lakeHash = sha256FileSync(lakeBinary).sha256;
  const request = { command_id: input.command_id, claim_id: input.claim_id, campaign_id: input.campaign_id, candidate_id: input.candidate_id,
    purpose: input.purpose, command: input.command, cwd: normalizeRel(root, cwd), input_files: sourceSnapshot,
    scope, metadata, lean_binary_sha256: leanHash, lake_binary_sha256: lakeHash, ownership,
    network_policy: input.network_policy, proof_authority: input.proof_authority };
  const key = sha256Buffer(canonicalJson(input.command_id)), reservationId = `lean-command:${key}`, operationId = `lean-command-result:${key}`;
  const requestHash = sha256Buffer(canonicalJson(request));
  const existing = store.get("SELECT * FROM commands WHERE command_id=?", reservationId);
  if (existing) {
    if (existing.principal_id !== "service:lean-command-reservation" || existing.request_sha256 !== requestHash) fail("LEAN_COMMAND_CONFLICT");
    const result = store.get("SELECT phase,plan_json FROM trust_commits WHERE operation_id=?", operationId);
    if (!result) fail("LEAN_COMMAND_EXECUTION_PENDING");
    const receipt = JSON.parse(String(result.plan_json)).response as AsyncLeanCommandReceipt;
    if (result.phase === "committed" && (!verifyLeanRunManifestV3Evidence(root, receipt.manifest).ok
      || readCommittedFile(root, receipt.manifest_path) !== canonicalJson(receipt.manifest)
      || !hasLeanRunManifestProvenanceIndexV1({ projectRoot: root, manifest: receipt.manifest, manifest_path: receipt.manifest_path }))) fail("LEAN_COMMAND_EVIDENCE_CHANGED");
    return { ...receipt, commit_state: result.phase === "committed" ? "committed" : "pending" };
  }
  assertProjectReadable(root, undefined, input.campaign_id);
  const reserved = store.transaction(() => {
    if (store.get("SELECT command_id FROM commands WHERE command_id=?", reservationId)) fail("LEAN_COMMAND_EXECUTION_PENDING");
    const value = { run_id: store.allocateId("LRUN"), request, started_at: new Date(runtime.clock.now()).toISOString() };
    store.run("INSERT INTO commands(command_id,principal_id,request_sha256,response_json,status) VALUES (?,'service:lean-command-reservation',?,?,'committed')",
      reservationId, requestHash, canonicalJson(value));
    return value;
  });
  const result = await runLeanToolCommandAsync(input.command[0], input.command.slice(1), cwd, input.leanToolchain, input.execution,
    { COMATH_RUNNER_NETWORK: input.network_policy === "disabled" ? "disabled" : "unknown" });
  const endedAt = new Date(runtime.clock.now()).toISOString();
  let changed = false;
  try { changed = sourceSnapshot.some((snapshot, index) => sha256FileSync(files[index]!).sha256 !== snapshot.sha256)
    || sha256FileSync(leanBinary).sha256 !== leanHash || sha256FileSync(lakeBinary).sha256 !== lakeHash
    || result.completion.handle.binary_sha256 !== (input.command[0] === "lean" ? leanHash : lakeHash); } catch { changed = true; }
  let scopeCurrent = true;
  try { requireApprovedFormalScope(runtime, input.campaign_id, scope); } catch { scopeCurrent = false; }
  const attempt = store.get("SELECT * FROM attempts WHERE attempt_key=?", ownership.attempt_key);
  const currentTask = store.getTask(ownership.task_id);
  const admittedCurrent = attempt?.task_id === ownership.task_id && Number(attempt.generation) === ownership.generation
    && !attempt.fenced_at && !attempt.stop_requested_at && !attempt.stop_reason && currentTask?.generation === ownership.generation
    && canonicalJson(currentTask.scope) === canonicalJson(scope);
  const authority = result.exit_code === 0 && !changed && scopeCurrent && admittedCurrent ? input.proof_authority : "none";
  const base = `.comath/evidence/${input.claim_id}/lean/${reserved.run_id}`;
  const stdoutPath = `${base}.stdout.log`, stderrPath = `${base}.stderr.log`, manifestPath = `${base}.manifest.json`;
  const manifest = leanRunManifestV3Schema.parse({ schema_version: "comath.lean_run_manifest.v3", run_id: reserved.run_id,
    claim_id: input.claim_id, campaign_id: input.campaign_id, ...(input.candidate_id ? { candidate_id: input.candidate_id } : {}), purpose: input.purpose,
    command: [...input.command], cwd: normalizeRel(root, cwd), cwd_sha256_before: beforeDigest, input_files: sourceSnapshot,
    lean_version: metadata.lean_version, lake_version: metadata.lake_version, elan_toolchain: metadata.elan_toolchain,
    lean_binary_sha256: leanHash, lake_binary_sha256: lakeHash, lean_toolchain_file_sha256: sourceSnapshot[files.indexOf(toolchainFile)].sha256,
    ...(sourceSnapshot.find(file => file.path.endsWith("/lake-manifest.json")) ? { lake_manifest_sha256: sourceSnapshot.find(file => file.path.endsWith("/lake-manifest.json"))!.sha256 } : {}),
    network_policy: input.network_policy, sandbox: "none", exit_code: result.exit_code,
    stdout_path: stdoutPath, stderr_path: stderrPath, stdout_sha256: sha256Buffer(result.stdout), stderr_sha256: sha256Buffer(result.stderr),
    started_at: reserved.started_at, ended_at: endedAt, runner: "comathd.LeanRunner", proof_authority: authority });
  const receipt: AsyncLeanCommandReceipt = { schema_version: "comath.async_lean_command.v1", operation_id: operationId, run_id: reserved.run_id,
    manifest_path: manifestPath, manifest, execution: result.completion, input_changed: changed, commit_state: "committed", proof_authority: "none" };
  try {
    return withProjectCommit(root, { operation_id: operationId, campaign_id: input.campaign_id, request: { request_sha256: requestHash }, fault: input.commitFault }, () => {
      for (const path of [stdoutPath, stderrPath, manifestPath]) if (existsCommittedFile(root, path)) fail("LEAN_EVIDENCE_APPEND_ONLY_VIOLATION");
      writeCommittedFile(root, stdoutPath, result.stdout); writeCommittedFile(root, stderrPath, result.stderr);
      const manifestBytes = canonicalJson(manifest); writeCommittedFile(root, manifestPath, manifestBytes);
      const indexPath = `.comath/evidence/${input.claim_id}/lean/lean_run_manifest_index.jsonl`;
      const row = { schema_version: "comath.lean_run_manifest_index.v1", claim_id: input.claim_id, campaign_id: input.campaign_id,
        candidate_id: input.candidate_id, run_id: reserved.run_id, purpose: input.purpose, manifest_path: manifestPath,
        manifest_sha256: sha256Buffer(manifestBytes), stdout_path: stdoutPath, stdout_sha256: manifest.stdout_sha256,
        stderr_path: stderrPath, stderr_sha256: manifest.stderr_sha256, exit_code: manifest.exit_code, runner: manifest.runner,
        append_only: true, proof_authority: manifest.proof_authority, recorded_at: endedAt };
      writeCommittedFile(root, indexPath, (existsCommittedFile(root, indexPath) ? readCommittedFile(root, indexPath) : "") + canonicalJson(row));
      appendAuditEvent(root, { project_id: store.getCampaign(input.campaign_id)!.project_id, event_type: "lean_run_manifest.written",
        actor: "service:async-lean-runner", target_id: input.claim_id, payload: {
          run_id: reserved.run_id, campaign_id: input.campaign_id, candidate_id: input.candidate_id, purpose: input.purpose,
          manifest_path: manifestPath, manifest_sha256: row.manifest_sha256, stdout_path: stdoutPath, stdout_sha256: manifest.stdout_sha256,
          stderr_path: stderrPath, stderr_sha256: manifest.stderr_sha256, exit_code: manifest.exit_code, runner: manifest.runner,
          append_only: true, proof_authority: manifest.proof_authority } });
      return receipt;
    });
  } catch (error) {
    if (store.get("SELECT operation_id FROM trust_commits WHERE operation_id=?", operationId)) return { ...receipt, commit_state: "pending" };
    throw error;
  }
}

export function verifyLeanRunManifestV3Evidence(
  projectRoot: string,
  candidate: unknown
): { ok: boolean; vetoes: string[] } {
  const parsed = leanRunManifestV3Schema.safeParse(candidate);
  const vetoes: string[] = [];

  const raw = candidate && typeof candidate === "object" ? (candidate as Record<string, unknown>) : {};
  if (raw.runner !== "comathd.LeanRunner") {
    vetoes.push("lean_run_manifest_not_service_owned");
  }
  if (!parsed.success) {
    vetoes.push("lean_run_manifest_parse_failure");
    return { ok: false, vetoes: Array.from(new Set(vetoes)) };
  }

  const manifest = parsed.data;
  if (manifest.lake_version.trim().length === 0) {
    vetoes.push("lake_version_missing");
  }
  if (manifest.lean_version.trim().length === 0) {
    vetoes.push("lean_version_unknown");
  }

  const checkFileHash = (relPath: string, expected: string, code: string) => {
    try {
      const path = assertPathAllowed(projectRoot, relPath, { purpose: "read", resolveRealpath: true });
      if (sha256FileSync(path).sha256 !== expected) {
        vetoes.push(code);
      }
    } catch {
      vetoes.push(code);
    }
  };

  checkFileHash(manifest.stdout_path, manifest.stdout_sha256, "lean_stdout_hash_mismatch");
  checkFileHash(manifest.stderr_path, manifest.stderr_sha256, "lean_stderr_hash_mismatch");

  const currentInputFiles: string[] = [];
  for (const entry of manifest.input_files) {
    try {
      const path = assertPathAllowed(projectRoot, entry.path, { purpose: "read", resolveRealpath: true });
      const stat = statSync(path);
      const hash = sha256FileSync(path).sha256;
      currentInputFiles.push(path);
      if (hash !== entry.sha256) {
        vetoes.push("lean_input_file_hash_mismatch");
      }
      if (stat.size !== entry.size_bytes) {
        vetoes.push("lean_input_file_size_mismatch");
      }
    } catch {
      vetoes.push("lean_input_file_missing");
    }
  }

  try {
    const cwd = assertPathAllowed(projectRoot, manifest.cwd, { purpose: "read", resolveRealpath: true });
    if (currentInputFiles.length !== manifest.input_files.length || cwdDigest(cwd, currentInputFiles) !== manifest.cwd_sha256_before) {
      vetoes.push("lean_cwd_input_digest_mismatch");
    }
  } catch {
    vetoes.push("lean_cwd_input_digest_mismatch");
  }

  const toolchainEntry = manifest.input_files.find((entry) => entry.path === "lean-toolchain" || entry.path.endsWith("/lean-toolchain"));
  if (!toolchainEntry) {
    vetoes.push("lean_toolchain_missing");
  } else {
    checkFileHash(toolchainEntry.path, manifest.lean_toolchain_file_sha256, "lean_toolchain_hash_mismatch");
    try {
      const toolchainPath = assertPathAllowed(projectRoot, toolchainEntry.path, { purpose: "read", resolveRealpath: true });
      const parsedMetadata = parseLeanToolchainMetadata({
        leanVersionOutput: `Lean (version ${manifest.lean_version})`,
        lakeVersionOutput: `Lake version ${manifest.lake_version}`,
        leanToolchain: readFileSync(toolchainPath, "utf8").trim()
      });
      if (parsedMetadata.elan_toolchain !== manifest.elan_toolchain) {
        vetoes.push("lean_toolchain_mismatch");
      }
    } catch (error) {
      vetoes.push(error instanceof Error ? error.message : "lean_toolchain_parse_failure");
    }
  }

  return { ok: vetoes.length === 0, vetoes: Array.from(new Set(vetoes)) };
}
