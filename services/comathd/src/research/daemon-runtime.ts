import { createHash, randomUUID } from "node:crypto";
import { realpathSync } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { canonicalJson } from "../verification/runner-contracts.js";
import { ComathError } from "../errors.js";
import { researchConfigSchema, type ResearchConfig } from "../config/config.js";
import { listRoleTemplates } from "../agents/role-templates.js";
import { configureLegacyRuntimeHost, shutdownLegacyRuntime, verifyLegacyRuntimeQuiescence, type LegacyRuntimeHostPolicy } from "../agents/runtime/legacy-runtime-facade.js";
import { createRuntimeRegistry } from "../agents/runtime/runtime-registry.js";
import type { AgentRuntimeAdapter, StartWorkerInput } from "../agents/runtime/agent-runtime-adapter.js";
import { createWorkerExecutionHost, type WorkerExecutionHostOptions } from "../agents/runtime/worker-execution-host.js";
import { ProjectRuntime, type ProjectRuntimeDependencies } from "./project-runtime.js";
import { createPortfolioScheduler, type PortfolioScheduler, type ResearchGrant } from "./portfolio-scheduler.js";
import { createResearchOrchestrator, type ResearchOrchestrator, type ResearchPrincipal, type ResearchTaskPolicies } from "./research-orchestrator.js";
import type { PoolBudgetLimits } from "./budget-ledger.js";
import { createAttemptReconciler, type AttemptReconciler, type AttemptLifecycleHooks } from "./reconciliation.js";
import { drainResearchAuditOutbox, resolveProjectCommitPath } from "./project-commit.js";
import type { ResearchTask } from "./research-schemas.js";
import type { ResearchResourceConfig } from "./resource-admission.js";
import { createWorkerGateway, type WorkerGatewayOptions } from "../control/worker-routes.js";
import { createResearchContextService } from "./context-service.js";
import type { ContextPackPolicy } from "./context-pack-builder.js";
import { createResearchFailureService, type ResearchFailureOptions } from "./failure-service.js";
import type { FailureIndexOptions } from "./failure-index.js";
import { createResearchToolExecutor } from "./research-tool-executor.js";
import { createConfiguredCodexAdapter } from "../agents/runtime/codex-owned-launcher.js";
import { createResearchResultService } from "./research-result-service.js";
import { createSupervisorDriver, defaultResearchContextPolicy } from "./supervisor-driver.js";
import { createValidationFanout, validationStatementBriefSchema, type ValidationFanoutOptions } from "./validation-fanout.js";
import { createValidationAggregation, type ValidationAggregationOptions } from "./validation-aggregation.js";
import { createValidationDriver } from "./validation-driver.js";
import { requireApprovedFormalScope } from "../proof-kernel/campaign/formal-spec-store.js";
import { createFormalizationIntake } from "./formalization-intake.js";
import { createFormalCandidateDispatch, type FormalCandidateDispatchProfile } from "./formal-candidate-dispatch.js";
import { createFormalCandidateIntake } from "./formal-candidate-intake.js";
import { createFormalSubmissionLifecycle } from "./formal-submission-lifecycle.js";
import { createFormalCandidateProjectService } from "./formal-candidate-project.js";
import { createProofToolAttemptService } from "./proof-tool-attempt.js";
import { createProofWorkflowRunner } from "./proof-workflow-runner.js";
import { importArtifact, listArtifactRefs } from "../artifacts/store.js";
import { initProject } from "../project/project-store.js";
import { startCampaign as startFormalCampaign } from "../proof-kernel/campaign/campaign-tick.js";
import { getCampaign as getFormalCampaign } from "../proof-kernel/campaign/research-campaign.js";

export type ResearchExecutionConsumer = {
  validate(task: ResearchTask): void;
  dispatch(grant: ResearchGrant, adapter: AgentRuntimeAdapter): Promise<void>;
  lifecycle: AttemptLifecycleHooks;
  steer?(attemptKey: string, instruction: string): Promise<void>;
  close?(): Promise<void>;
};
export type ResearchDaemonOptions = {
  config: ResearchConfig;
  dependencies?: ProjectRuntimeDependencies;
  adapters?: ReadonlyMap<string, AgentRuntimeAdapter>;
  createAdapters?: (runtime: ProjectRuntime, config: ResearchConfig, buildPrompt?: (input: StartWorkerInput) => Promise<string>) => ReadonlyMap<string, AgentRuntimeAdapter>;
  policies?: ResearchTaskPolicies;
  legacy?: LegacyRuntimeHostPolicy;
  workerGateway?: WorkerGatewayOptions;
  execution?: ResearchExecutionConsumer;
  createExecution?: (runtime: ProjectRuntime, scheduler: PortfolioScheduler, reconciler: () => AttemptReconciler) => ResearchExecutionConsumer;
  workerInput?: WorkerExecutionHostOptions["prepareInput"];
  validateWorkerTask?: WorkerExecutionHostOptions["validateTask"];
  inspectRecoveredWorker?: WorkerExecutionHostOptions["inspectRecovered"];
  contextPolicy?: (task: ResearchTask) => Omit<ContextPackPolicy, "byte_cap" | "visibility">;
  verifyRetryCondition?: FailureIndexOptions["verifyRetryCondition"];
  classifyHardBlocker?: ResearchFailureOptions["classifyHardBlocker"];
  authorizeReaderUrl?: (task: ResearchTask, url: string) => boolean;
  validation?: Omit<ValidationFanoutOptions, "verifyPublishedCandidate">;
  validationAggregation?: Pick<ValidationAggregationOptions, "blindComparison" | "authorizeResolution">;
  formalCandidateProfile?: FormalCandidateDispatchProfile;
};
const defaultDependencies: ProjectRuntimeDependencies = { clock: { now: () => Date.now() }, executor: {},
  migration: { quiesce: async root => verifyLegacyRuntimeQuiescence(root) } };
function resourcesWithLegacy(config: ResearchConfig): ResearchResourceConfig {
  return { ...config, provider_policies: { legacy: { max_sessions: config.max_active_workers, launch_rpm: 4 }, ...config.provider_policies },
    model_policies: {
      "legacy-process": { provider_id: "legacy", runtime_id: "legacy-process", model: "legacy-host" },
      "legacy-codex-api": { provider_id: "legacy", runtime_id: "legacy-codex-api", model: "legacy-api" },
      ...config.model_policies
    } };
}
function canonical(root: string): string { const path = realpathSync(root); return process.platform === "win32" ? path.toLowerCase() : path; }
function configuredValidationOptions(runtime: ProjectRuntime, config: ResearchConfig): Omit<ValidationFanoutOptions, "verifyPublishedCandidate"> | undefined {
  if (!config.validation) return undefined;
  return {
    policy_version: config.validation.policy_version,
    profiles: config.validation.profiles,
    resolveToolPolicy: toolPolicyId => {
      const policy = config.tool_policies[toolPolicyId];
      return policy ? { visibility: policy.visibility, allowed_tools: policy.allowed_tools, new_thread: policy.new_thread } : undefined;
    },
    authorizeArtifact: (task, ref) => {
      const campaign = runtime.store.getCampaign(task.campaign_id);
      const artifact = campaign && listArtifactRefs(runtime.root).find(value => value.id === ref.artifact_id && value.sha256 === ref.sha256);
      return task.scope.kind === "formal" && artifact?.project_id === campaign?.project_id;
    },
    prepareContext: async ({ candidate_id, candidate, root }) => {
      const brief = validationStatementBriefSchema.parse({ schema_version: "comath.validation_statement_brief.v1", candidate_id,
        root_scope_sha256: createHash("sha256").update(canonicalJson(root.scope)).digest("hex"),
        claims: candidate.claims.map(claim => ({ statement: claim.statement, assumptions: claim.assumptions })),
        approved_assumptions: root.assumptions, proof_authority: "none" });
      const temporary = resolveProjectCommitPath(runtime.root, `.tmp/comath/validation-briefs/${randomUUID()}.json`);
      await mkdir(dirname(temporary), { recursive: true });
      await writeFile(temporary, canonicalJson(brief), { flag: "wx", flush: true });
      try {
        const source = runtime.store.get("SELECT source_task_id FROM candidates WHERE candidate_id=?", candidate_id);
        const sourceTask = source && runtime.store.getTask(String(source.source_task_id));
        const campaign = sourceTask && runtime.store.getCampaign(sourceTask.campaign_id);
        if (!campaign) fail("VALIDATION_CANDIDATE_NOT_FOUND", "Validation candidate has no current campaign");
        const artifact = await importArtifact({ projectRoot: runtime.root, project_id: campaign.project_id,
          source_path: temporary, kind: "other", actor: "service:validation-context" });
        return { statement_brief: { ref: { artifact_id: artifact.id, sha256: artifact.sha256 }, kind: "statement" as const, source: "service:validation-statement-brief" }, public_sources: [] };
      } finally { await unlink(temporary).catch(error => { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }); }
    }
  };
}
function fail(code: string, message: string): never { throw new ComathError(message, { code, statusCode: 409 }); }
async function withinShutdownGrace<T>(work: Promise<T>, milliseconds: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([work, new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new ComathError("Execution drain exceeded shutdown deadline; project owner is retained", { code: "DAEMON_DRAIN_TIMEOUT", statusCode: 409 })), milliseconds);
    })]);
  } finally { if (timer) clearTimeout(timer); }
}
type Shared = { options: ResearchDaemonOptions; pending: Promise<ResearchDaemon>; references: number; closing: boolean };
const shared = new Map<string, Shared>();

/** One application/scheduler/reconciler per project, independent of its operator harness. */
export class ResearchDaemon {
  readonly adapters;
  readonly app;
  readonly scheduler;
  readonly reconciler;
  readonly supervisor?: ReturnType<typeof createSupervisorDriver>;
  readonly validationFanout?: ReturnType<typeof createValidationFanout>;
  readonly validationAggregation?: ReturnType<typeof createValidationAggregation>;
  readonly validationDriver?: ReturnType<typeof createValidationDriver>;
  readonly intake;
  readonly formalCandidates;
  readonly formalCandidateIntake;
  readonly formalSubmissions;
  readonly formalCandidateProjects;
  readonly proofTools;
  readonly proofWorkflow;
  recovery: { blocked_operations: string[]; unconfirmed_attempts: string[] } = { blocked_operations: [], unconfirmed_attempts: [] };
  toolRecovery: { terminated: string[]; unconfirmed: string[] } = { terminated: [], unconfirmed: [] };
  private started = false;
  private closing?: Promise<void>;
  private readonly dispatched = new Set<Promise<void>>();
  private readonly applicationWork = new Set<Promise<unknown>>();
  private gateway?: ReturnType<typeof createWorkerGateway>;
  private gatewayReady?: Promise<void>;
  private pauseUnsubscribe?: () => void;
  private released = false;
  private execution?: ResearchExecutionConsumer;
  private contextService?: ReturnType<typeof createResearchContextService>;
  private failureService?: ReturnType<typeof createResearchFailureService>;
  private toolExecutor?: ReturnType<typeof createResearchToolExecutor>;
  private resultService?: ReturnType<typeof createResearchResultService>;
  get isReleased(): boolean { return this.released; }
  private constructor(readonly runtime: ProjectRuntime, readonly config: ResearchConfig, private readonly options: ResearchDaemonOptions) {
    this.contextService = createResearchContextService(runtime, {
      prepareFormalCandidate: principal => { this.formalCandidates.ensureCandidateReservationForAttempt(principal); },
      formalCandidateForTask: task => this.formalCandidates.readTaskCandidateReservation(task.task_id, task.generation),
      policyForTask: task => {
      const model = config.model_policies[task.model_policy_id], tools = config.tool_policies[task.tool_policy_id];
      if (!model || !tools) fail("RESEARCH_POLICY_UNKNOWN", "Context requires configured model and tool policies");
      const validation = this.validationFanout?.contextPolicyForTask(task);
      if (validation) return { ...validation, byte_cap: Math.min(validation.byte_cap, model.initial_context_bytes) };
      if (!options.contextPolicy && task.scope.kind === "formal" && tools.visibility !== "blind") {
        const approved = requireApprovedFormalScope(runtime, task.campaign_id, task.scope);
        const refs = [approved.formal_spec_ref, approved.ledger_ref, ...task.input_refs];
        return { byte_cap: model.initial_context_bytes, visibility: tools.visibility, assumptions: approved.assumptions,
          mandatory: [{ ref: approved.formal_spec_ref, kind: "approved_lock", source: "committed_host_approval" },
            { ref: approved.ledger_ref, kind: "assumption_ledger", source: "committed_host_approval" }],
          lazy: task.input_refs.map(ref => ({ ref, kind: "other", source: "exact_task_input" })),
          authorizeArtifact: (current, ref) => current.task_id === task.task_id && current.generation === task.generation
            && refs.some(value => value.artifact_id === ref.artifact_id && value.sha256 === ref.sha256) };
      }
      return { ...(options.contextPolicy ? options.contextPolicy(task) : defaultResearchContextPolicy(task, tools.visibility)), byte_cap: model.initial_context_bytes, visibility: tools.visibility };
    }, findFailures: (task, policy) => this.failureService?.index.findFailedRoutes({ scope: task.scope, problem_slice: task.problem_slice,
      method_family: task.method_family, route: this.failureService.routeFor(task, policy), limit: 20 }).map(record => ({
        failure_id: record.failure.failure_id, sha256: record.sha256, route_fingerprint: record.failure.route_fingerprint,
        failure_mode: record.failure.failure_mode, retry_conditions: record.failure.retry_conditions, match: record.match
      })) ?? [] });
    const suppliedAdapters = options.createAdapters?.(runtime, config, this.contextService?.buildPrompt) ?? options.adapters;
    const configuredAdapters = new Map<string, AgentRuntimeAdapter>();
    if (!suppliedAdapters && Object.values(config.runtimes).some(host => host.kind === "codex-app-server")) {
      configuredAdapters.set("codex-app-server", createConfiguredCodexAdapter(runtime, config, {
        buildPrompt: input => this.contextService?.buildPrompt(input) ?? Promise.reject(new ComathError("A host context policy is required", { code: "CONTEXT_POLICY_REQUIRED" })),
        gatewayUrl: () => {
          const address = this.workerGatewayAddress();
          if (!address || typeof address === "string") fail("WORKER_GATEWAY_UNAVAILABLE", "Worker gateway must be listening before launch");
          const host = address.address === "0.0.0.0" ? "127.0.0.1" : address.address === "::" ? "::1" : address.address;
          return `http://${host.includes(":") ? `[${host}]` : host}:${address.port}`;
        }
      }));
    }
    this.adapters = createRuntimeRegistry(suppliedAdapters ?? configuredAdapters);
    const policies: ResearchTaskPolicies = options.policies ?? { model_policy_ids: Object.keys(config.model_policies), tool_policy_ids: Object.keys(config.tool_policies),
      role_template_ids: listRoleTemplates().map(role => role.id), validateFormalScope: (scope, campaign) => {
        try { requireApprovedFormalScope(runtime, campaign.campaign_id, scope); return true; } catch { return false; }
      } };
    const validation = options.validation ?? configuredValidationOptions(runtime, config);
    if (config.supervisor && !policies.role_template_ids.includes(config.supervisor.role_template)) fail("SUPERVISOR_ROLE_UNKNOWN", "Supervisor role must be selected from the configured host role templates");
    if (this.contextService) this.failureService = createResearchFailureService(runtime, { policyForTask: this.contextService.routePolicyForTask,
      verifyRetryCondition: options.verifyRetryCondition, classifyHardBlocker: options.classifyHardBlocker });
    this.app = createResearchOrchestrator(runtime, { ...policies,
      validateValidationRetry: validation ? (previous, refs) => {
        if (!this.resultService) fail("VALIDATION_RETRY_CONSUMER_UNAVAILABLE", "Validation result consumer is not ready");
        this.resultService.validateValidationRetry(previous, refs, validation.authorizeArtifact);
      } : policies.validateValidationRetry,
      recordValidationRetry: validation ? (previous, next, refs) => {
        if (!this.validationFanout) fail("VALIDATION_REPLACEMENT_CONTEXT_UNAVAILABLE", "Validation context consumer is not ready");
        this.validationFanout.recordReplacementContext(previous, next, refs);
      } : policies.recordValidationRetry,
      validateRoute: (draft, campaign) => {
      policies.validateRoute?.(draft, campaign);
      // Validation fanout constructs its context and slot binding in the same
      // transaction as the DAG patch. Asking the generic failure route to
      // materialize that context while the draft is still being admitted is a
      // circular read; the fanout verifies its own policy-bound context before
      // the task can run.
      if (!validation || !draft.specialization?.startsWith("validation:")) this.failureService?.validateRoute(draft, campaign);
    } });
    if (options.formalCandidateProfile && config.proof_workflow && canonicalJson(options.formalCandidateProfile) !== canonicalJson(config.proof_workflow.candidate)) fail("PROOF_PROFILE_CONFLICT", "Host proof workflow and candidate profiles disagree");
    this.formalCandidates = createFormalCandidateDispatch(this.app, { profile: options.formalCandidateProfile ?? config.proof_workflow?.candidate });
    this.formalCandidateIntake = createFormalCandidateIntake(runtime, {
      authorizeArtifact: options.workerGateway?.authorizeArtifact ?? this.contextService.gatewayOptions.authorizeArtifact,
      readCandidateReservation: this.formalCandidates.readCandidateReservation
    });
    this.formalSubmissions = createFormalSubmissionLifecycle(runtime, { readSubmissionReceipt: this.formalCandidateIntake.readSubmissionReceipt });
    this.formalCandidateProjects = createFormalCandidateProjectService(runtime, { readSubmissionReceipt: this.formalCandidateIntake.readSubmissionReceipt });
    this.proofTools = createProofToolAttemptService(runtime, { resourceConfig: () => resourcesWithLegacy(config) });
    this.scheduler = createPortfolioScheduler(runtime, resourcesWithLegacy(config), {
      validateTask: task => {
        this.app.assertTaskPolicy(task);
        if (!config.enabled) fail("RESEARCH_POLICY_UNKNOWN", "Research execution is disabled by host configuration");
        const model = config.model_policies[task.model_policy_id], selection = model && config.runtimes[model.runtime_id];
        if (!selection) fail("RESEARCH_POLICY_UNKNOWN", "Runtime policy is unavailable");
        try { this.adapters.resolve(selection.kind); }
        catch { fail("RESEARCH_POLICY_UNKNOWN", "No host implementation is registered for this runtime"); }
        if (!this.execution) fail("RESEARCH_POLICY_UNKNOWN", "Worker execution consumer is not configured");
        this.execution.validate(task);
      },
      capabilities: runtimeId => {
        const selection = config.runtimes[runtimeId];
        return selection ? this.adapters.capabilities(selection.kind) : { exact_output_cap: false };
      },
      onDispatch: grant => {
        const work = this.execution!.dispatch(grant, this.adapters.resolve(config.runtimes[grant.runtime_id].kind));
        this.dispatched.add(work);
        void work.then(() => this.dispatched.delete(work), () => this.dispatched.delete(work));
        return work;
      },
      onStopRequested: (key, reason) => this.execution?.lifecycle.stop(key, reason === "budget_threshold" ? "budget" : "user_cancel")
    });
    const unavailable: AttemptLifecycleHooks = {
      requestCheckpoint: async () => { fail("RUNTIME_UNAVAILABLE", "No owned worker is available for checkpoint"); },
      stop: async () => { fail("TERMINATION_UNCONFIRMED", "No execution owner can confirm termination"); },
      inspect: async () => ({ runtime_terminated: false, tools_terminated: false, usage_complete: false })
    };
    const workerInput = options.workerInput ?? this.contextService?.workerInput;
    this.execution = options.createExecution?.(runtime, this.scheduler, () => this.reconciler) ?? options.execution
      ?? (workerInput ? createWorkerExecutionHost({ runtime, scheduler: this.scheduler, reconciler: () => this.reconciler,
        validateTask: task => { this.app.assertTaskPolicy(task); options.validateWorkerTask?.(task); }, prepareInput: workerInput,
        expectedRuntimeKind: runtimeId => config.runtimes[runtimeId]?.kind ?? fail("RESEARCH_POLICY_UNKNOWN", "Runtime selection is not configured"),
        inspectRecovered: options.inspectRecoveredWorker }) : undefined);
    this.reconciler = createAttemptReconciler(runtime, this.scheduler, {
      hasPendingSubmission: this.formalSubmissions.hasPendingSubmission,
      recordSubmissionTermination: this.formalSubmissions.recordNormalTermination,
      reconcileSubmissions: this.formalSubmissions.resumePendingSubmissions,
      requestCheckpoint: key => (this.execution?.lifecycle ?? unavailable).requestCheckpoint(key),
      stop: (key, reason) => (this.execution?.lifecycle ?? unavailable).stop(key, reason),
      inspect: key => (this.execution?.lifecycle ?? unavailable).inspect(key),
      max_fault_retries: config.max_fault_retries, lease_ttl_ms: config.lease_ttl_ms,
      checkpoint_grace_ms: config.checkpoint.grace_ms, checkpoint: config.checkpoint });
    this.toolExecutor = createResearchToolExecutor(runtime, this.scheduler, { wheels: config.live_tools, sympy: config.live_tools.sympy,
      allowedTools: task => config.tool_policies[task.tool_policy_id]?.allowed_tools ?? [],
      authorizeReaderUrl: (task, url) => options.authorizeReaderUrl?.(task, url) ?? this.contextService?.allowsSourceUrl(task, url) ?? false,
      onArtifactCommitted: this.contextService?.gatewayOptions.onArtifactCommitted });
    this.resultService = createResearchResultService(runtime, {
      authorizeArtifact: options.workerGateway?.authorizeArtifact ?? this.contextService.gatewayOptions.authorizeArtifact,
      onArtifactCommitted: options.workerGateway?.onArtifactCommitted ?? this.contextService.gatewayOptions.onArtifactCommitted
    });
    if (validation) {
      const host = validation;
      this.validationFanout = createValidationFanout(this.app, { ...host, verifyPublishedCandidate: this.resultService.verifyPublishedCandidate,
        resolveApprovedRoot: host.resolveApprovedRoot ?? ((source) => {
          const approved = requireApprovedFormalScope(runtime, source.campaign_id, source.scope);
          return { scope: approved.scope, approved_lock: { ref: approved.formal_spec_ref, kind: "approved_lock", source: "committed_host_approval" },
            assumption_ledger: { ref: approved.ledger_ref, kind: "assumption_ledger", source: "committed_host_approval" }, assumptions: approved.assumptions };
        }),
        resolveToolPolicy: id => {
          const configured = config.tool_policies[id], declared = host.resolveToolPolicy(id);
          if (!configured || !declared || configured.visibility !== declared.visibility
            || JSON.stringify([...configured.allowed_tools].sort()) !== JSON.stringify([...declared.allowed_tools].sort())) return undefined;
          return declared;
        } });
      this.validationAggregation = createValidationAggregation(runtime, { ...options.validationAggregation, results: this.resultService,
        authorizeResolution: options.validationAggregation?.authorizeResolution ?? (() => true),
        approvedPolicy: candidateId => {
          const receipt = this.validationFanout!.readValidationFanout(candidateId, host.policy_version);
          return receipt ? { policy_version: host.policy_version, approved_assumptions: receipt.approved_assumptions } : undefined;
        } });
      this.validationDriver = createValidationDriver(runtime, host.policy_version, this.validationFanout, this.validationAggregation);
    }
    this.intake = createFormalizationIntake(runtime, { results: this.resultService,
      authorizeArtifact: (_principal, ref, campaignId) => listArtifactRefs(runtime.root).some(record => record.id === ref.artifact_id && record.sha256 === ref.sha256
        && record.project_id === runtime.store.getCampaign(campaignId)?.project_id),
      verifyValidatedCandidate: candidateId => !!validation && this.validationAggregation?.aggregateValidation({ candidate_id: candidateId,
        policy_version: validation.policy_version }).state === "research_validated" });
    if (config.proof_workflow && !policies.role_template_ids.includes(config.proof_workflow.candidate.role_template)) fail("PROOF_ROLE_UNKNOWN", "Proof candidate role must be a configured host role");
    this.proofWorkflow = createProofWorkflowRunner(this.app, { config: config.proof_workflow, candidates: this.formalCandidates,
      intake: this.formalCandidateIntake, projects: this.formalCandidateProjects, tools: this.proofTools,
      stopWorker: key => this.reconciler.requestStop(key, "user_cancel") });
    if (config.supervisor) this.supervisor = createSupervisorDriver(this.app, this.scheduler, config, this.resultService, {
      steer: (key, instruction) => this.execution?.steer?.(key, instruction) ?? Promise.reject(new ComathError("Runtime cannot receive correction steering", { code: "WORKER_STEER_UNSUPPORTED" })),
      stop: key => this.reconciler.requestStop(key, "supervisor_invalid"),
      getHardBlockerState: (task, triage) => {
        if (!this.failureService) return "unverified";
        try {
          const decision = this.failureService.blockers.inspect(task, triage.progress_refs);
          return decision.blocked ? "unresolved" : triage.blocker_refs.length ? "unverified" : "clear";
        } catch { return "unverified"; }
      }
    });
  }
  static async create(root: string, options: ResearchDaemonOptions): Promise<ResearchDaemon> {
    const config = researchConfigSchema.parse(options.config);
    configureLegacyRuntimeHost(root, { ...options.legacy, resources: resourcesWithLegacy(config) });
    const runtime = await ProjectRuntime.acquire(root, options.dependencies ?? defaultDependencies);
    let daemon: ResearchDaemon | undefined;
    try {
      runtime.store.run(`PRAGMA busy_timeout=${config.sqlite_busy_timeout_ms}`);
      daemon = new ResearchDaemon(runtime, config, options);
      daemon.toolRecovery = daemon.toolExecutor?.recover() ?? { terminated: [], unconfirmed: [] };
      daemon.recovery = await daemon.reconciler.recover();
      drainResearchAuditOutbox(runtime.root);
      return daemon;
    } catch (error) {
      await daemon?.supervisor?.close(); await daemon?.validationDriver?.close(); await daemon?.proofWorkflow?.close();
      daemon?.reconciler.close(); daemon?.scheduler.close(); daemon?.app.close();
      try { await daemon?.adapters.close(); } finally { await runtime.release(); }
      throw error;
    }
  }
  /** Called after all required listeners are accepting requests. inject() does not start a loop. */
  listenWorkerGateway(): Promise<void> {
    if (this.closing) fail("DAEMON_CLOSING", "Daemon is closing");
    if (this.gatewayReady) return this.gatewayReady;
    this.gateway = createWorkerGateway(this.runtime, { ...(this.contextService?.gatewayOptions ?? { authorizeArtifact: () => false }),
      ...(this.failureService ? { failure: this.failureService.recordWorkerFailure } : {}),
      result: async (principal, raw) => {
        if (raw && typeof raw === "object" && "submission" in raw && raw.submission && typeof raw.submission === "object"
          && "kind" in raw.submission && raw.submission.kind === "formal_candidate") {
          const receipt = await this.formalCandidateIntake.ingestFormalCandidateSubmission(principal, raw);
          this.formalSubmissions.reconcileSubmissions();
          return receipt;
        }
        return this.resultService!.acceptWorkerResult(principal, raw);
      }, proposal: this.resultService?.acceptWorkerProposal,
      tool: this.toolExecutor?.workerTool, ...this.options.workerGateway });
    this.gatewayReady = this.gateway.listen({ host: this.config.worker_gateway_host, port: this.config.worker_gateway_port });
    return this.gatewayReady;
  }
  workerGatewayAddress() { return this.gateway?.address(); }
  /** Service-owned bridge for the narrow operator bootstrap; it reuses this daemon's sole scheduler. */
  startCampaign(principal: ResearchPrincipal, request: Parameters<ResearchOrchestrator["startCampaign"]>[1]) {
    const requestedWorkers = request && typeof request === "object" ? (request as { max_active_workers?: unknown }).max_active_workers : undefined;
    if (typeof requestedWorkers === "number" && Number.isInteger(requestedWorkers) && requestedWorkers > this.config.max_active_workers) {
      throw new ComathError("Campaign worker limit exceeds the configured deployment capacity", { code: "CAMPAIGN_WORKER_CAPABILITY", statusCode: 422 });
    }
    const project = initProject({ root_path: this.runtime.root });
    return this.app.startCampaign(principal, request, (configuredCampaignId, limits) => {
      const pools = Object.fromEntries(["exploration", "deepening", "validation", "formalization"].map(pool => [pool, { ...limits }])) as PoolBudgetLimits;
      this.scheduler.budget.configure(configuredCampaignId, limits, pools);
    }, { project_id: project.project.project_id, createFormalCampaign: bootstrap => {
      const existing = getFormalCampaign(this.runtime.root, bootstrap.campaign_id);
      if (existing) {
        if (existing.project_id !== bootstrap.project_id || existing.user_goal !== bootstrap.charter.goal) fail("FORMAL_BOOTSTRAP_CONFLICT", "Existing formal campaign does not match durable bootstrap");
        return;
      }
      let formal;
      try {
        formal = startFormalCampaign({ project_root: this.runtime.root, project_name: project.project.name, user_goal: bootstrap.charter.goal,
          strict_mode: true, actor: `operator:${bootstrap.actor}`, campaign_id: bootstrap.campaign_id }).campaign;
      } catch (error) {
        if (error instanceof ComathError) throw error;
        throw new ComathError(`Formal bootstrap failed: ${String(error)}`, { code: "FORMAL_BOOTSTRAP_FAILED", statusCode: 409 });
      }
      if (formal.project_id !== bootstrap.project_id || formal.campaign_id !== bootstrap.campaign_id) fail("FORMAL_BOOTSTRAP_CONFLICT", "Formal bootstrap did not preserve durable identities");
    } });
  }
  /** Route a cancellation through the graph command, then the reconciler that owns every runtime/tool stop. */
  async cancelTask(principal: ResearchPrincipal, taskId: string, input: { command_id: string; reason: string }) {
    if (!input.command_id || !input.reason?.trim()) throw new ComathError("Task cancellation needs a command ID and reason", { code: "RESEARCH_CANCEL_REQUEST_INVALID", statusCode: 400 });
    const task = this.app.getTask(taskId), campaign = this.runtime.store.getCampaign(task.campaign_id);
    if (!campaign) throw new ComathError("Research campaign does not exist", { code: "RESEARCH_CAMPAIGN_NOT_FOUND", statusCode: 404 });
    const result = this.app.applyPatch(principal, { command_id: input.command_id, campaign_id: campaign.campaign_id, base_revision: campaign.revision,
      create_tasks: [], add_dependencies: [], replace_dependencies: [], reprioritize: [], move_pool: [],
      cancel_tasks: [{ task_id: task.task_id, reason: input.reason.trim() }], rationale: input.reason.trim() });
    const attempts = this.runtime.store.all("SELECT attempt_key FROM attempts WHERE task_id=? AND generation=? AND state<>'terminated'", task.task_id, task.generation);
    await Promise.all(attempts.map(row => this.reconciler.requestStop(String(row.attempt_key), "user_cancel")));
    return { ...result, task_id: task.task_id };
  }
  private settlePausingCampaigns(): void {
    for (const campaign of this.runtime.store.listCampaigns()) if (campaign.state === "pausing") this.app.completePauseCampaign(campaign.campaign_id);
  }
  async pauseCampaign(principal: ResearchPrincipal, campaignId: string, input: { command_id: string; expected_revision: number; reason: string }) {
    const pending = this.app.beginPauseCampaign(principal, { ...input, campaign_id: campaignId });
    await Promise.all(pending.attempt_keys.map(attemptKey => this.reconciler.requestStop(attemptKey, "pause")));
    this.settlePausingCampaigns();
    const campaign = this.runtime.store.getCampaign(campaignId)!;
    return { campaign_id: campaign.campaign_id, revision: campaign.revision, state: campaign.state, snapshot_seq: campaign.snapshot_seq };
  }
  resumeCampaign(principal: ResearchPrincipal, campaignId: string, input: { command_id: string; expected_revision: number }) {
    return this.app.resumeCampaign(principal, { ...input, campaign_id: campaignId });
  }
  /** The aggregation validates independent dispute evidence; this transport hook never resolves issues itself. */
  resolveValidationIssue(input: { candidate_id: string; issue_id: string; task_id: string; evidence_refs: { artifact_id: string; sha256: string }[] }) {
    if (!this.validationAggregation) fail("VALIDATION_RESOLUTION_UNAVAILABLE", "Validation resolution is not configured for this daemon");
    return this.validationAggregation.resolveValidationIssue(input);
  }
  async cancelCampaign(principal: ResearchPrincipal, campaignId: string, input: { command_id: string; expected_revision: number; reason: string }) {
    const pending = this.app.beginCancelCampaign(principal, { ...input, campaign_id: campaignId });
    await Promise.all(pending.attempt_keys.map(attemptKey => this.reconciler.requestStop(attemptKey, "user_cancel")));
    const campaign = this.runtime.store.getCampaign(campaignId)!;
    return { campaign_id: campaign.campaign_id, revision: campaign.revision, state: campaign.state, snapshot_seq: campaign.snapshot_seq };
  }
  async finishCampaign(principal: ResearchPrincipal, campaignId: string, input: { command_id: string; expected_revision: number; reason: string }) {
    const pending = this.app.beginFinishCampaign(principal, { ...input, campaign_id: campaignId });
    await Promise.all(pending.attempt_keys.map(attemptKey => this.reconciler.requestStop(attemptKey, "pause")));
    this.settlePausingCampaigns();
    const campaign = this.runtime.store.getCampaign(campaignId)!;
    return { campaign_id: campaign.campaign_id, revision: campaign.revision, state: campaign.state, snapshot_seq: campaign.snapshot_seq, proof_authority: "none" as const };
  }
  trackApplicationWork(work: Promise<unknown>): void {
    if (this.closing) fail("DAEMON_CLOSING", "Daemon is closing");
    this.applicationWork.add(work);
    void work.then(() => this.applicationWork.delete(work), () => this.applicationWork.delete(work));
  }
  start(): void {
    if (this.closing) fail("DAEMON_CLOSING", "Daemon is closing");
    if (this.started) return;
    this.started = true; this.pauseUnsubscribe = this.app.events.subscribe(() => this.settlePausingCampaigns());
    this.reconciler.start(); this.supervisor?.start(); this.validationDriver?.start(); this.proofWorkflow.start(); this.scheduler.start();
  }
  close(): Promise<void> {
    if (this.closing) return this.closing;
    this.supervisor?.stop();
    this.validationDriver?.stop();
    this.proofWorkflow.stop();
    this.pauseUnsubscribe?.(); this.pauseUnsubscribe = undefined;
    this.scheduler.stopGrants();
    this.closing = Promise.resolve().then(async () => {
      const errors: unknown[] = [];
      const draining: Promise<unknown>[] = [this.reconciler.drain(), this.supervisor?.close() ?? Promise.resolve(), this.validationDriver?.close() ?? Promise.resolve(), this.proofWorkflow.close()];
      // Persist handoff intents before attempting cancellation. Unconfirmed work retains permits.
      for (const row of this.runtime.store.all("SELECT attempt_key,task_id FROM attempts WHERE state<>'terminated'")) {
        if (["legacy_run", "proof_workflow"].includes(this.runtime.store.getTask(String(row.task_id))?.kind ?? "")) continue;
        draining.push(this.reconciler.requestStop(String(row.attempt_key), "handoff"));
      }
      draining.push(shutdownLegacyRuntime(this.runtime.root), this.execution?.close?.() ?? Promise.resolve(), this.toolExecutor?.close() ?? Promise.resolve(), this.adapters.close(), ...this.dispatched, ...this.applicationWork);
      if (this.gateway) draining.push(this.gatewayReady!.then(() => this.gateway!.close()));
      // If any code can still write to the store, never release ownership underneath it.
      const settled = await withinShutdownGrace(Promise.allSettled(draining), this.config.stop_grace_ms);
      for (const result of settled) if (result.status === "rejected") errors.push(result.reason);
      if (errors.some(error => error instanceof ComathError && ["LEGACY_RUNTIME_BUSY", "PROOF_OWNED_TOOLS_UNRECONCILED"].includes(error.code))) {
        throw new AggregateError(errors, "Legacy application still owns active requests; project owner is retained");
      }
      for (const row of this.runtime.store.all("SELECT attempt_key FROM attempts WHERE state<>'terminated'")) {
        try {
          if (this.runtime.store.get("SELECT runtime_kind FROM attempts WHERE attempt_key=?", String(row.attempt_key))?.runtime_kind === "service-proof-tool") continue;
          const key = String(row.attempt_key), lifecycle = this.execution?.lifecycle;
          if (lifecycle) this.reconciler.confirmTermination(key, await withinShutdownGrace(lifecycle.inspect(key), this.config.stop_grace_ms));
        } catch (error) {
          if (error instanceof ComathError && error.code === "DAEMON_DRAIN_TIMEOUT") throw error;
          errors.push(error);
        }
      }
      this.reconciler.close(); this.scheduler.close(); this.app.close();
      await this.runtime.release();
      this.released = true;
      if (errors.length) throw new AggregateError(errors, "Daemon closed with unresolved execution cleanup; reservations remain durable");
    });
    return this.closing;
  }
}

export type ResearchDaemonReference = { daemon: ResearchDaemon; release(): Promise<void> };
export async function acquireResearchDaemon(root: string, options: ResearchDaemonOptions): Promise<ResearchDaemonReference> {
  const key = canonical(root);
  let entry = shared.get(key);
  if (entry) {
    if (entry.closing) fail("DAEMON_CLOSING", "The project daemon is closing");
    if (JSON.stringify(entry.options.config) !== JSON.stringify(options.config)
      || entry.options.dependencies !== options.dependencies || entry.options.adapters !== options.adapters
      || entry.options.execution !== options.execution || entry.options.policies !== options.policies || entry.options.legacy !== options.legacy
      || entry.options.workerGateway !== options.workerGateway || entry.options.createExecution !== options.createExecution
      || entry.options.workerInput !== options.workerInput || entry.options.validateWorkerTask !== options.validateWorkerTask
      || entry.options.inspectRecoveredWorker !== options.inspectRecoveredWorker || entry.options.contextPolicy !== options.contextPolicy
      || entry.options.verifyRetryCondition !== options.verifyRetryCondition || entry.options.classifyHardBlocker !== options.classifyHardBlocker || entry.options.createAdapters !== options.createAdapters
      || entry.options.authorizeReaderUrl !== options.authorizeReaderUrl || entry.options.validation !== options.validation
      || entry.options.validationAggregation !== options.validationAggregation || entry.options.formalCandidateProfile !== options.formalCandidateProfile) {
      fail("DAEMON_CONFIG_CONFLICT", "Project daemon already has different host dependencies or configuration");
    }
  } else {
    entry = { options, pending: ResearchDaemon.create(root, options), references: 0, closing: false };
    shared.set(key, entry);
  }
  entry.references++;
  const current = entry;
  let daemon: ResearchDaemon;
  try { daemon = await current.pending; }
  catch (error) { current.references--; if (shared.get(key) === current) shared.delete(key); throw error; }
  let released: Promise<void> | undefined;
  return { daemon, release() {
    if (released) return released;
    current.references--;
    if (current.references > 0) return released = Promise.resolve();
    current.closing = true;
    released = daemon.close().finally(() => { if (daemon.isReleased && shared.get(key) === current) shared.delete(key); });
    return released;
  } };
}
