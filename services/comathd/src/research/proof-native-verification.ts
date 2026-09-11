import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { ComathError } from "../errors.js";
import type { ResearchConfig } from "../config/config.js";
import { canonicalJson } from "../verification/runner-contracts.js";
import { requireApprovedFormalScope } from "../proof-kernel/campaign/formal-spec-store.js";
import { runLeanToolCommandAsync, directElanTool, type LeanHostAsyncCommandOptions, type LeanHostAsyncCommandResult } from "../proof-kernel/lean/lean-host-tools.js";
import { runServiceOwnedLeanCommandV3Async, verifyLeanRunManifestV3Evidence, type AsyncLeanCommandReceipt } from "../proof-kernel/lean/lean-run-manifest-v3.js";
import type { OwnedSessionCompletion } from "../agents/runtime/owned-process-session.js";
import type { ResearchOrchestrator } from "./research-orchestrator.js";
import type { FormalCandidateProjectReceipt } from "./formal-candidate-project.js";
import type { createProofToolAttemptService } from "./proof-tool-attempt.js";
import { readCommittedFile, withProjectCommit, writeCommittedFile } from "./project-commit.js";

type Config = NonNullable<ResearchConfig["proof_workflow"]>;
type CommandResult = { exit_code: number; stdout?: string; stderr?: string; manifest?: AsyncLeanCommandReceipt; proof_authority: "none" };
export type ProofNativeVerificationResult = { task_id: string; candidate_id: string; obligation_id: string;
  commands: Record<string, CommandResult>; native_checks_passed: boolean; error_code?: string; proof_authority: "none" };
const hash = (value: unknown) => createHash("sha256").update(canonicalJson(value)).digest("hex");
function fail(code: string): never { throw new ComathError(code, { code, statusCode: 409 }); }

/** Executes accepted source, records actual native evidence, and deliberately leaves proof gates to the proof kernel. */
export function createProofNativeVerification(app: ResearchOrchestrator, tools: ReturnType<typeof createProofToolAttemptService>, config: Config) {
  const runtime = app.runtime, store = runtime.store;
  function saved<T>(operationId: string): T | undefined {
    const row = store.get("SELECT phase,plan_json FROM trust_commits WHERE operation_id=?", operationId);
    if (!row) return undefined;
    if (row.phase !== "committed") fail("COMMIT_PENDING");
    const plan = JSON.parse(String(row.plan_json)), path = plan.response.report_path;
    const target = plan.targets.find((entry: { relative_path: string }) => entry.relative_path === path);
    const bytes = readCommittedFile(runtime.root, path);
    if (!target || createHash("sha256").update(bytes).digest("hex") !== target.after_sha256) fail("PROOF_NATIVE_EVIDENCE_CHANGED");
    return JSON.parse(bytes) as T;
  }
  function save(operationId: string, path: string, campaignId: string, value: unknown) {
    withProjectCommit(runtime.root, { operation_id: operationId, campaign_id: campaignId, request: value }, () => {
      writeCommittedFile(runtime.root, path, canonicalJson(value)); return { report_path: path };
    });
  }
  function verify(result: ProofNativeVerificationResult) {
    for (const command of Object.values(result.commands)) if (command.manifest) {
      const receipt = command.manifest;
      if (receipt.commit_state !== "committed" || !verifyLeanRunManifestV3Evidence(runtime.root, receipt.manifest).ok
        || readCommittedFile(runtime.root, receipt.manifest_path) !== canonicalJson(receipt.manifest)) fail("PROOF_NATIVE_EVIDENCE_CHANGED");
    }
    return result;
  }
  return async function execute(project: FormalCandidateProjectReceipt, control: { signal: AbortSignal; assertCurrent: () => void }): Promise<ProofNativeVerificationResult> {
    control.assertCurrent();
    const identity = hash({ project, config }), taskId = `PTASK-${identity.slice(0, 40)}`, operationId = `proof-native:${identity}`;
    const old = saved<ProofNativeVerificationResult>(operationId);
    if (old) return verify(old);
    const campaign = store.getCampaign(project.campaign_id)!;
    const proofScope = store.get("SELECT response_json FROM commands WHERE principal_id='service:formal-submission' AND json_extract(response_json,'$.operation_id')=?", project.source_operation_id);
    if (!proofScope) fail("PROOF_NATIVE_SOURCE_RECEIPT_MISSING");
    const submission = JSON.parse(String(proofScope.response_json));
    const approved = requireApprovedFormalScope(runtime, project.campaign_id, submission.scope);
    if (approved.obligation_binding.obligation_id !== project.obligation_id) fail("PROOF_NATIVE_SCOPE_MISMATCH");
    let task = store.getTask(taskId);
    if (!task) {
      app.applyPatch({ kind: "internal", id: "service:proof-workflow" }, { command_id: `${operationId}:task`, campaign_id: campaign.campaign_id,
        base_revision: campaign.revision, create_tasks: [{ task_id: taskId, kind: "proof_workflow", depends_on: [], scope: approved.scope,
          question: `Check exact accepted Lean source ${project.candidate_id} for ${project.obligation_id}.`,
          acceptance: ["Persist owned native version, check, build and audit evidence. No claim promotion."],
          model_policy_id: config.candidate.model_policy_id, tool_policy_id: config.candidate.tool_policy_id, role_template: config.candidate.role_template,
          pool: "formalization", priority: config.candidate.priority, budget: config.tool_budget,
          method_family: "service_native_lean", problem_slice: project.obligation_id, coupling_label: project.candidate_id,
          input_refs: [approved.formal_spec_ref, approved.ledger_ref, submission.result_ref], exclusions: ["No provider execution or mathematical authority from exit status."] }],
        add_dependencies: [], replace_dependencies: [], reprioritize: [], cancel_tasks: [], move_pool: [], rationale: "Run accepted source through owned native Lean tools." });
      task = store.getTask(taskId)!;
    }
    const taskReceipt = store.get("SELECT principal_id,status,response_json FROM commands WHERE command_id=?", `${operationId}:task`);
    if (!taskReceipt || taskReceipt.principal_id !== "internal:service:proof-workflow" || taskReceipt.status !== "committed"
      || !JSON.parse(String(taskReceipt.response_json)).created_task_ids?.includes(taskId)
      || task.kind !== "proof_workflow" || hash(task.scope) !== hash(approved.scope) || hash(task.budget) !== hash(config.tool_budget)
      || task.pool !== "formalization" || task.model_policy_id !== config.candidate.model_policy_id || task.tool_policy_id !== config.candidate.tool_policy_id) fail("PROOF_NATIVE_TASK_CONFLICT");
    const binding = tools.startAttempt({ command_id: `${operationId}:start`, task_id: taskId, expected_generation: 0 });
    const state = tools.readAttempt(binding.attempt_key)!;
    if (state.state === "unreconciled" || state.state === "cancelling") fail("PROOF_OWNED_TOOLS_UNRECONCILED");
    const cwd = join(runtime.root, project.project.lean_root), base = `.comath/evidence/${project.claim_id}/lean/${taskId}`;
    // Never fall back to an elan shim that could provision a different toolchain during verification.
    const binaries = (["lean", "lake"] as const).map(tool => {
      const path = directElanTool(tool, config.lean_toolchain); return path !== tool && existsSync(path) ? path : undefined;
    });
    const result: ProofNativeVerificationResult = { task_id: taskId, candidate_id: project.candidate_id, obligation_id: project.obligation_id,
      commands: {}, native_checks_passed: false, proof_authority: "none" };
    let usageComplete = true;
    async function command(name: string, run: (execution: LeanHostAsyncCommandOptions) => Promise<CommandResult>) {
      const key = `${operationId}:${name}`, previous = saved<CommandResult>(key);
      if (previous) { result.commands[name] = previous; return previous; }
      if (tools.readAttempt(binding.attempt_key)!.state === "settled") fail("PROOF_NATIVE_RESULT_INCOMPLETE");
      control.assertCurrent(); control.signal.throwIfAborted();
      if (binaries.some(value => !value)) fail("LEAN_ASYNC_BINARY_UNAVAILABLE");
      const executionId = `PTEX-${hash(key).slice(0, 40)}`;
      // Admission may wait for another campaign's tool, without borrowing a worker slot.
      let admission = tools.beginTool({ attempt_key: binding.attempt_key, execution_id: executionId, kind: "lean", command_ref: key });
      while (!admission.granted) {
        if (admission.completed) fail("PROOF_NATIVE_RESULT_INCOMPLETE");
        await delay(100, undefined, { signal: control.signal }); control.assertCurrent();
        admission = tools.beginTool({ attempt_key: binding.attempt_key, execution_id: executionId, kind: "lean", command_ref: key });
      }
      const started = performance.now(), controller = new AbortController();
      let completion: OwnedSessionCompletion | undefined, elapsed: number | undefined;
      const wall = () => elapsed ?? Math.ceil(performance.now() - started);
      const abort = () => {
        try { tools.cancelAttempt(binding.attempt_key, "proof_stage_stopped"); } finally { controller.abort(); }
      };
      control.signal.addEventListener("abort", abort, { once: true });
      if (control.signal.aborted) abort();
      const timer = setInterval(() => {
        try {
          control.assertCurrent();
          const debit = tools.observeToolWall({ attempt_key: binding.attempt_key, execution_id: executionId, cumulative_wall_ms: wall() });
          if (debit.stop_required) { tools.cancelAttempt(binding.attempt_key, "tool_budget_exhausted"); controller.abort(); }
        } catch { abort(); }
      }, 100);
      timer.unref();
      try {
        const remaining = Date.parse(binding.expires_at) - runtime.clock.now();
        if (remaining < 1) fail("PROOF_TOOL_ATTEMPT_INACTIVE");
        const value = await run({ runtime, ownership: admission.ownership!, allowed_programs: binaries as string[], signal: controller.signal,
          timeout_ms: Math.min(config.tool_timeout_ms, remaining), max_output_bytes: 2 * 1024 * 1024,
          onCompleted: value => { completion = value; elapsed = Math.ceil(performance.now() - started); } });
        if (!completion) fail("PROOF_NATIVE_COMPLETION_MISSING");
        save(key, `${base}.${name}.json`, project.campaign_id, value);
        result.commands[name] = value; return value;
      } finally {
        clearInterval(timer); control.signal.removeEventListener("abort", abort);
        if (completion) {
          const released = tools.completeTool({ attempt_key: binding.attempt_key, execution_id: executionId, cumulative_wall_ms: wall(),
            termination_confirmed: completion.termination_confirmed, handle: completion.handle });
          if (!released.released) usageComplete = false;
        } else { usageComplete = false; tools.recoverAttempt(binding.attempt_key); }
      }
    }
    try {
      let leanVersion = "", lakeVersion = "";
      for (const tool of ["lean", "lake"] as const) {
        const value = await command(`${tool}-version`, async execution => {
          const raw: LeanHostAsyncCommandResult = await runLeanToolCommandAsync(tool, ["--version"], cwd, config.lean_toolchain, execution);
          return { exit_code: raw.exit_code, stdout: raw.stdout, stderr: raw.stderr, proof_authority: "none" };
        });
        if (value.exit_code !== 0) break;
        if (tool === "lean") leanVersion = `${value.stdout}\n${value.stderr}`; else lakeVersion = `${value.stdout}\n${value.stderr}`;
      }
      if (leanVersion && lakeVersion) {
        const steps: { name: string; purpose: "check" | "build" | "audit"; command: ["lean" | "lake", ...string[]] }[] = [
          { name: "build", purpose: "build", command: ["lake", "build", ...project.project.build_targets] },
          { name: "check", purpose: "check", command: ["lake", "env", "lean", project.project.theorem_file_rel] },
          { name: "audit", purpose: "audit", command: ["lake", "env", "lean", project.project.audit_file_rel] }
        ];
        for (const step of steps) {
          const value = await command(step.name, async execution => {
            const inputs = project.input_files.map(path => join(runtime.root, path));
            if (existsSync(join(cwd, "lake-manifest.json"))) inputs.push(join(cwd, "lake-manifest.json"));
            const receipt = await runServiceOwnedLeanCommandV3Async({ runtime, command_id: `${operationId}:${step.name}:manifest`,
              claim_id: project.claim_id, campaign_id: project.campaign_id, candidate_id: project.candidate_id,
              purpose: step.purpose, command: step.command, cwd, input_files: inputs, leanVersionOutput: leanVersion, lakeVersionOutput: lakeVersion,
              leanToolchain: config.lean_toolchain, network_policy: "unknown", proof_authority: "none", execution });
            if (receipt.commit_state !== "committed") fail("COMMIT_PENDING");
            return { exit_code: receipt.manifest.exit_code, manifest: receipt, proof_authority: "none" };
          });
          if (value.exit_code !== 0) break;
        }
      }
      result.native_checks_passed = ["lean-version", "lake-version", "check", "build", "audit"].every(name => result.commands[name]?.exit_code === 0);
      verify(result); save(operationId, `${base}.result.json`, project.campaign_id, result);
      return result;
    } catch (error) {
      // A missing local binary is a durable candidate failure. Unknown execution/commit state is not.
      if (error instanceof ComathError && error.code === "LEAN_ASYNC_BINARY_UNAVAILABLE") {
        result.error_code = error.code; save(operationId, `${base}.result.json`, project.campaign_id, result); return result;
      }
      throw error;
    } finally {
      const settled = tools.finishAttempt({ attempt_key: binding.attempt_key, outcome: control.signal.aborted ? "cancelled" : result.native_checks_passed ? "succeeded" : "failed", usage_complete: usageComplete });
      if (!settled.released) fail("PROOF_OWNED_TOOLS_UNRECONCILED");
    }
  };
}
