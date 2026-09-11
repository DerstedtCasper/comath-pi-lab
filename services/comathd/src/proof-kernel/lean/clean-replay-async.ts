import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { ComathError } from "../../errors.js";
import type { ResearchConfig } from "../../config/config.js";
import { canonicalJson } from "../../verification/runner-contracts.js";
import type { FormalCandidateProjectReceipt } from "../../research/formal-candidate-project.js";
import { getAcquiredProjectRuntime, type ProjectRuntime } from "../../research/project-runtime.js";
import type { ResearchOrchestrator } from "../../research/research-orchestrator.js";
import type { createProofToolAttemptService } from "../../research/proof-tool-attempt.js";
import { requireApprovedFormalScope } from "../campaign/formal-spec-store.js";
import { checkDependencyClosureV2 } from "./dependency-closure.js";
import { runStaticCheatScan } from "./static-cheat-scan.js";
import { checkAxiomProfileV2 } from "./axiom-profile.js";
import { parseStructuredLeanAuditOutput, type StructuredLeanAudit } from "./structured-audit.js";
import { directElanTool, runLeanToolCommandAsync, type LeanHostAsyncCommandOptions, type LeanHostAsyncCommandResult } from "./lean-host-tools.js";
import { runServiceOwnedLeanCommandV3Async, type AsyncLeanCommandReceipt } from "./lean-run-manifest-v3.js";
import { readCommittedFile, resolveProjectCommitPath, withProjectCommit, writeCommittedFile } from "../../research/project-commit.js";

const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
function fail(code: string): never { throw new ComathError(code, { code, statusCode: 409 }); }

export type AsyncCleanReplayPreparation = {
  schema_version: "comath.async_clean_replay_preparation.v1";
  operation_id: string;
  replay_id: string;
  campaign_id: string;
  claim_id: string;
  candidate_id: string;
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
type Config = NonNullable<ResearchConfig["proof_workflow"]>;
type ReplayCommand = { exit_code: number; stdout?: string; stderr?: string; manifest?: AsyncLeanCommandReceipt; proof_authority: "none" };
export type AsyncCleanReplayExecution = { task_id: string; replay_id: string; claim_id: string; obligation_id: string;
  commands: Record<string, ReplayCommand>; executed: boolean; lake_manifest_sha256?: string; environment_receipt_path?: string;
  dependency_closure?: { schema_version: "comath.async_clean_replay_dependency_closure.v1"; result: "pass" | "fail"; report_path: string; hard_vetoes: string[]; proof_authority: "none" };
  static_audit?: { schema_version: "comath.async_clean_replay_static_audit.v1"; result: "pass" | "fail"; report_path: string; hard_vetoes: string[]; proof_authority: "none" };
  axiom_profile?: { schema_version: "comath.async_clean_replay_axiom_profile.v1"; result: "pass" | "fail"; report_path: string; hard_vetoes: string[]; proof_authority: "none" }; proof_authority: "none" };

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
    claim_id: project.claim_id, candidate_id: project.candidate_id, obligation_id: project.obligation_id, stage_attempt: project.stage_attempt,
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

/** Executes the prepared copy through a new service-only task; final gates remain a separate consumer. */
export function createAsyncCleanReplayExecutor(app: ResearchOrchestrator, tools: ReturnType<typeof createProofToolAttemptService>, config: Config) {
  const runtime = app.runtime, store = runtime.store;
  function save(operation_id: string, path: string, campaign_id: string, value: unknown) {
    withProjectCommit(runtime.root, { operation_id, campaign_id, request: value }, () => { writeCommittedFile(runtime.root, path, canonicalJson(value)); return { report_path: path }; });
  }
  function saved<T>(operation_id: string): T | undefined {
    const row = store.get("SELECT phase,plan_json FROM trust_commits WHERE operation_id=?", operation_id); if (!row) return undefined;
    if (row.phase !== "committed") fail("COMMIT_PENDING");
    const plan = JSON.parse(String(row.plan_json)), path = plan.response.report_path;
    if (typeof path !== "string") fail("ASYNC_CLEAN_REPLAY_RECEIPT_INVALID");
    const bytes = readFileSync(resolveProjectCommitPath(runtime.root, path));
    const target = plan.targets.find((value: { relative_path: string }) => value.relative_path === path);
    if (!target || hash(bytes) !== target.after_sha256) fail("ASYNC_CLEAN_REPLAY_EVIDENCE_CHANGED");
    return JSON.parse(bytes.toString("utf8")) as T;
  }
  async function execute(input: { project: FormalCandidateProjectReceipt; preparation: AsyncCleanReplayPreparation }, control: { signal: AbortSignal; assertCurrent: () => void }): Promise<AsyncCleanReplayExecution> {
    const { project, preparation } = input; control.assertCurrent();
    if (preparation.campaign_id !== project.campaign_id || preparation.claim_id !== project.claim_id || preparation.candidate_id !== project.candidate_id || preparation.obligation_id !== project.obligation_id
      || preparation.stage_attempt !== project.stage_attempt || preparation.scope_package_sha256 !== project.scope_package_sha256 || preparation.proof_authority !== "none") fail("ASYNC_CLEAN_REPLAY_BINDING_INVALID");
    const preparationCommit = store.get("SELECT phase,plan_json FROM trust_commits WHERE operation_id=?", preparation.operation_id);
    if (!preparationCommit || preparationCommit.phase !== "committed" || canonicalJson(JSON.parse(String(preparationCommit.plan_json)).response) !== canonicalJson(preparation)) fail("ASYNC_CLEAN_REPLAY_PREPARATION_CHANGED");
    const identity = hash(canonicalJson({ project, preparation, config })), operation_id = `async-clean-replay:${identity}`, task_id = `RPTASK-${identity.slice(0, 40)}`;
    const old = saved<AsyncCleanReplayExecution>(operation_id); if (old) return old;
    const submissionRow = store.get("SELECT response_json FROM commands WHERE principal_id='service:formal-submission' AND json_extract(response_json,'$.operation_id')=?", project.source_operation_id);
    if (!submissionRow) fail("ASYNC_CLEAN_REPLAY_SOURCE_RECEIPT_MISSING");
    const submission = JSON.parse(String(submissionRow.response_json)), approved = requireApprovedFormalScope(runtime, project.campaign_id, submission.scope);
    if (approved.obligation_binding.obligation_id !== project.obligation_id) fail("ASYNC_CLEAN_REPLAY_SCOPE_MISMATCH");
    let task = store.getTask(task_id);
    if (!task) {
      const campaign = store.getCampaign(project.campaign_id)!;
      app.applyPatch({ kind: "internal", id: "service:proof-workflow" }, { command_id: `${operation_id}:task`, campaign_id: project.campaign_id, base_revision: campaign.revision,
        create_tasks: [{ task_id, kind: "proof_workflow", depends_on: [], scope: approved.scope, question: `Clean replay ${preparation.replay_id} for ${project.obligation_id}.`,
          acceptance: ["Run service-owned async Lean commands on the immutable clean workspace. No promotion."], model_policy_id: config.candidate.model_policy_id,
          tool_policy_id: config.candidate.tool_policy_id, role_template: config.candidate.role_template, pool: "formalization", priority: config.candidate.priority,
          budget: config.tool_budget, method_family: "service_async_clean_replay", problem_slice: project.obligation_id, coupling_label: preparation.replay_id,
          input_refs: [approved.formal_spec_ref, approved.ledger_ref, submission.result_ref], exclusions: ["Final authority remains with existing integrity and promotion gates."] }],
        add_dependencies: [], replace_dependencies: [], reprioritize: [], cancel_tasks: [], move_pool: [], rationale: "Execute immutable clean replay through service-owned Lean permits." });
      task = store.getTask(task_id)!;
    }
    if (task.kind !== "proof_workflow" || task.method_family !== "service_async_clean_replay" || task.coupling_label !== preparation.replay_id
      || canonicalJson(task.scope) !== canonicalJson(approved.scope) || canonicalJson(task.budget) !== canonicalJson(config.tool_budget)) fail("ASYNC_CLEAN_REPLAY_TASK_CONFLICT");
    const binding = tools.startAttempt({ command_id: `${operation_id}:start`, task_id, expected_generation: 0 });
    const cwd = resolveProjectCommitPath(runtime.root, preparation.clean_workspace_path), allowed = (["lean", "lake"] as const).map(tool => {
      const path = directElanTool(tool, config.lean_toolchain); return path !== tool && existsSync(path) ? path : undefined;
    });
    if (allowed.some(value => !value)) fail("LEAN_ASYNC_BINARY_UNAVAILABLE");
    const result: AsyncCleanReplayExecution = { task_id, replay_id: preparation.replay_id, claim_id: project.claim_id, obligation_id: project.obligation_id, commands: {}, executed: false, proof_authority: "none" };
    let complete = true;
    async function command(name: string, runner: (execution: LeanHostAsyncCommandOptions) => Promise<ReplayCommand>) {
      if (tools.readAttempt(binding.attempt_key)?.state === "settled") fail("ASYNC_CLEAN_REPLAY_ATTEMPT_SETTLED");
      const key = `${operation_id}:${name}`, execution_id = `RPEX-${hash(key).slice(0, 40)}`;
      let admission = tools.beginTool({ attempt_key: binding.attempt_key, execution_id, kind: "lean", command_ref: key });
      while (!admission.granted) { if (admission.completed) fail("ASYNC_CLEAN_REPLAY_COMMAND_INCOMPLETE"); await delay(100, undefined, { signal: control.signal }); control.assertCurrent(); admission = tools.beginTool({ attempt_key: binding.attempt_key, execution_id, kind: "lean", command_ref: key }); }
      const started = performance.now(); let completion: LeanHostAsyncCommandResult["completion"] | undefined;
      try {
        const value = await runner({ runtime, ownership: admission.ownership!, allowed_programs: allowed as string[], signal: control.signal,
          timeout_ms: config.tool_timeout_ms, max_output_bytes: 2 * 1024 * 1024, onCompleted: value => { completion = value; } });
        if (!completion) fail("ASYNC_CLEAN_REPLAY_COMPLETION_MISSING"); result.commands[name] = value; return value;
      } finally {
        if (completion) {
          const released = tools.completeTool({ attempt_key: binding.attempt_key, execution_id, cumulative_wall_ms: Math.ceil(performance.now() - started), termination_confirmed: completion.termination_confirmed, handle: completion.handle });
          if (!released.released) complete = false;
        } else { complete = false; tools.recoverAttempt(binding.attempt_key); }
      }
    }
    let failure: unknown;
    try {
      const versions: Record<string, string> = {};
      for (const tool of ["lean", "lake"] as const) {
        const value = await command(`${tool}-version`, async execution => {
          const raw = await runLeanToolCommandAsync(tool, ["--version"], cwd, config.lean_toolchain, execution);
          return { exit_code: raw.exit_code, stdout: raw.stdout, stderr: raw.stderr, proof_authority: "none" };
        });
        if (value.exit_code !== 0) break;
        versions[tool] = `${value.stdout ?? ""}\n${value.stderr ?? ""}`;
      }
      if (versions.lean && versions.lake) for (const step of [
        { name: "check", purpose: "check" as const, command: ["lake", "env", "lean", project.project.theorem_file_rel] as ["lake", ...string[]] },
        { name: "build", purpose: "final_replay" as const, command: ["lake", "build", ...project.project.build_targets] as ["lake", ...string[]] },
        { name: "audit", purpose: "audit" as const, command: ["lake", "env", "lean", project.project.audit_file_rel] as ["lake", ...string[]] }
      ]) {
        const value = await command(step.name, async execution => {
          const files = preparation.copied_files.map(file => join(cwd, file.path)).filter(existsSync);
          const lakeManifest = join(cwd, "lake-manifest.json"); if (existsSync(lakeManifest)) files.push(lakeManifest);
          const receipt = await runServiceOwnedLeanCommandV3Async({ runtime, command_id: `${operation_id}:${step.name}:manifest`, claim_id: project.claim_id, campaign_id: project.campaign_id,
            candidate_id: project.candidate_id, purpose: step.purpose, command: step.command, cwd, input_files: files, leanVersionOutput: versions.lean, lakeVersionOutput: versions.lake,
            leanToolchain: config.lean_toolchain, network_policy: "disabled", proof_authority: "none", execution });
          return { exit_code: receipt.manifest.exit_code, manifest: receipt, proof_authority: "none" };
        });
        if (value.exit_code !== 0) break;
      }
      result.executed = ["check", "build", "audit"].every(name => result.commands[name]?.exit_code === 0);
      if (result.executed) {
        const lakeManifest = join(cwd, "lake-manifest.json");
        if (!existsSync(lakeManifest)) fail("ASYNC_CLEAN_REPLAY_LAKE_MANIFEST_MISSING");
        const bytes = readFileSync(lakeManifest), lake_manifest_sha256 = hash(bytes);
        const environment_receipt_path = `.comath/evidence/${project.claim_id}/lean/replays/${preparation.replay_id}/environment.json`;
        save(`${operation_id}:environment`, environment_receipt_path, project.campaign_id, { schema_version: "comath.async_clean_replay_environment.v1",
          replay_id: preparation.replay_id, campaign_id: project.campaign_id, claim_id: project.claim_id, obligation_id: project.obligation_id,
          stage_attempt: project.stage_attempt, scope_package_sha256: project.scope_package_sha256, lake_manifest_path: `${preparation.clean_workspace_path}/lake-manifest.json`,
          lake_manifest_sha256, audit_run_id: result.commands.audit?.manifest?.run_id ?? null, proof_authority: "none" });
        result.lake_manifest_sha256 = lake_manifest_sha256; result.environment_receipt_path = environment_receipt_path;
        const closureTemp = `.comath/evidence/${project.claim_id}/lean/replays/${preparation.replay_id}/dependency-closure.tmp.json`;
        const closure = checkDependencyClosureV2({ projectRoot: runtime.root, leanRoot: join(cwd, "source"), toolchainFile: join(cwd, "lean-toolchain"),
          lakefile: join(cwd, "lakefile.lean"), lakeManifestFile: lakeManifest, reportPath: closureTemp,
          allowedImportPrefixes: [...new Set(["Mathlib", "Std", "Init", "Lake", "FormalSpec", "Audit", project.project.theorem_name.split(".")[0]!])], trustedExternalDependencies: ["mathlib"], buildStatus: "checked" });
        const dependency_closure = { schema_version: "comath.async_clean_replay_dependency_closure.v1" as const, result: closure.result,
          report_path: `.comath/evidence/${project.claim_id}/lean/replays/${preparation.replay_id}/dependency-closure.json`, hard_vetoes: closure.hard_vetoes, proof_authority: "none" as const };
        save(`${operation_id}:dependency-closure`, dependency_closure.report_path, project.campaign_id, { ...dependency_closure, report: closure,
          lake_manifest_sha256, audit_run_id: result.commands.audit?.manifest?.run_id ?? null });
        result.dependency_closure = dependency_closure;
        const staticTemp = `.comath/evidence/${project.claim_id}/lean/replays/${preparation.replay_id}/static-audit.tmp.json`;
        const staticReport = runStaticCheatScan({ projectRoot: runtime.root, leanRoot: join(cwd, "source"), reportPath: staticTemp });
        const static_audit = { schema_version: "comath.async_clean_replay_static_audit.v1" as const, result: staticReport.result,
          report_path: `.comath/evidence/${project.claim_id}/lean/replays/${preparation.replay_id}/static-audit.json`, hard_vetoes: staticReport.hard_vetoes, proof_authority: "none" as const };
        save(`${operation_id}:static-audit`, static_audit.report_path, project.campaign_id, { ...static_audit, report: staticReport,
          dependency_closure_path: dependency_closure.report_path, audit_run_id: result.commands.audit?.manifest?.run_id ?? null });
        result.static_audit = static_audit;
        const auditManifest = result.commands.audit?.manifest;
        if (!auditManifest) fail("ASYNC_CLEAN_REPLAY_AUDIT_MANIFEST_MISSING");
        const theoremPath = join(cwd, project.project.theorem_file_rel), auditPath = join(cwd, project.project.audit_file_rel);
        const environment_fingerprint = hash(canonicalJson({ toolchain: config.lean_toolchain, lean_version: auditManifest.manifest.lean_version,
          lake_version: auditManifest.manifest.lake_version, lean_binary_sha256: auditManifest.manifest.lean_binary_sha256,
          lake_binary_sha256: auditManifest.manifest.lake_binary_sha256, toolchain_file_sha256: auditManifest.manifest.lean_toolchain_file_sha256,
          source_sha256: hash(readFileSync(theoremPath)), audit_source_sha256: hash(readFileSync(auditPath)), lake_manifest_sha256 }));
        const structured_audit: StructuredLeanAudit = parseStructuredLeanAuditOutput({ stdout: readCommittedFile(runtime.root, auditManifest.manifest.stdout_path),
          expected_target: project.project.theorem_name, source_file: project.project.theorem_file_rel, source_file_sha256: hash(readFileSync(theoremPath)),
          audit_source_sha256: hash(readFileSync(auditPath)), environment_fingerprint, generated_by_run_id: auditManifest.run_id, audit_manifest_path: auditManifest.manifest_path });
        const axiomTemp = `.comath/evidence/${project.claim_id}/lean/replays/${preparation.replay_id}/axiom-profile.tmp.json`;
        const profile = checkAxiomProfileV2({ projectRoot: runtime.root, reportPath: axiomTemp, theoremName: project.project.theorem_name,
          theoremTypeHash: structured_audit.theorem_type_elaborated_hash, sourceFile: theoremPath, environmentFingerprint: environment_fingerprint,
          leanRunManifestId: auditManifest.run_id, structuredAudit: structured_audit });
        const axiom_profile = { schema_version: "comath.async_clean_replay_axiom_profile.v1" as const, result: profile.result,
          report_path: `.comath/evidence/${project.claim_id}/lean/replays/${preparation.replay_id}/axiom-profile.json`, hard_vetoes: profile.hard_vetoes, proof_authority: "none" as const };
        save(`${operation_id}:axiom-profile`, axiom_profile.report_path, project.campaign_id, { ...axiom_profile, report: profile, structured_audit,
          audit_run_id: auditManifest.run_id, environment_fingerprint });
        result.axiom_profile = axiom_profile;
      }
      save(operation_id, `.comath/evidence/${project.claim_id}/lean/replays/${preparation.replay_id}/async-execution.json`, project.campaign_id, result);
      return result;
    } catch (error) {
      failure = error;
      throw error;
    } finally {
      const settled = tools.finishAttempt({ attempt_key: binding.attempt_key, outcome: result.executed ? "succeeded" : "failed", usage_complete: complete });
      if (!settled.released && !failure) fail("ASYNC_CLEAN_REPLAY_UNRECONCILED");
    }
  }
  return { execute };
}
