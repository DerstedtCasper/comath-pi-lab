import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { ComathError } from "../errors.js";
import type { ResearchConfig } from "../config/config.js";
import { canonicalJson } from "../verification/runner-contracts.js";
import { getCampaign, writeCampaign } from "../proof-kernel/campaign/research-campaign.js";
import { advanceApprovedProofPlanning, inspectApprovedProofStage, type CampaignTickInput, type CampaignTickResult } from "../proof-kernel/campaign/campaign-tick.js";
import { advanceObligationStage, obligationStagePath } from "../proof-kernel/campaign/obligation-stage.js";
import { replaceObligationById, selectReadyObligation } from "../proof-kernel/campaign/active-obligation.js";
import { requireApprovedFormalScope } from "../proof-kernel/campaign/formal-spec-store.js";
import { applyGatePromotedClaim, getClaim } from "../claim/claim-store.js";
import { promoteClaim } from "../verification/gate.js";
import type { ResearchCampaign } from "../types/schemas.js";
import { createResearchEventStore, notifyResearchEventsCommitted } from "./event-store.js";
import { getAcquiredProjectRuntime } from "./project-runtime.js";
import { readCommittedFile, resolveProjectCommitPath, stageResearchMutation, withProjectCommit } from "./project-commit.js";
import { writeCommittedFile } from "./project-commit.js";
import type { ResearchOrchestrator } from "./research-orchestrator.js";
import type { createFormalCandidateDispatch, FormalCandidateDispatchReceipt, FormalCandidateReservation } from "./formal-candidate-dispatch.js";
import type { createFormalCandidateIntake, FormalCandidateSubmissionReceipt } from "./formal-candidate-intake.js";
import type { createFormalCandidateProjectService, FormalCandidateProjectReceipt } from "./formal-candidate-project.js";
import type { createProofToolAttemptService } from "./proof-tool-attempt.js";
import { registerProofWorkflowBridge, type ProofWorkflowLifecycleResult } from "./proof-workflow-bridge.js";
import { createProofNativeVerification, type ProofNativeVerificationResult } from "./proof-native-verification.js";
import { createAsyncCleanReplayExecutor, createAsyncFinalAuthorityReplayExecutor, prepareAsyncCleanReplayWorkspace, verifyScopedFinalAuthorityPackagingV1, type AsyncFinalAuthorityReplayExecution } from "../proof-kernel/lean/clean-replay-async.js";

type Configuration = NonNullable<ResearchConfig["proof_workflow"]>;
type Lease = { incarnation: string; nonce: string; epoch: number; expires_at: string; state: "active" | "idle" | "blocked";
  campaign_id: string; work_hash?: string; code?: string; stop_requested: boolean };
type Snapshot = { campaign: ResearchCampaign; revision: number; obligation_id: string; stage_attempt: number; scope_package_sha256: string; binding_hash: string };
const hash = (value: unknown) => createHash("sha256").update(canonicalJson(value)).digest("hex");
function fail(code: string): never { throw new ComathError(code, { code, statusCode: 409 }); }

/** One campaign advancement owner. Child LLM work remains entirely in the existing scheduler. */
export function createProofWorkflowRunner(app: ResearchOrchestrator, options: {
  config?: Configuration;
  candidates: ReturnType<typeof createFormalCandidateDispatch>;
  intake: ReturnType<typeof createFormalCandidateIntake>;
  projects: ReturnType<typeof createFormalCandidateProjectService>;
  tools: ReturnType<typeof createProofToolAttemptService>;
  stopWorker: (attemptKey: string) => Promise<void>;
}) {
  const runtime = app.runtime, store = runtime.store, events = createResearchEventStore(runtime), incarnation = randomUUID();
  const pending = new Map<string, Promise<void>>(), requested = new Set<string>();
  const advancementTurns = new Map<string, Promise<void>>();
  const controllers = new Map<string, AbortController>();
  const verifyNative = options.config ? createProofNativeVerification(app, options.tools, options.config) : undefined;
  const executeCleanReplay = options.config ? createAsyncCleanReplayExecutor(app, options.tools, options.config) : undefined;
  const executeFinalAuthorityReplay = options.config ? createAsyncFinalAuthorityReplayExecutor(app, options.tools, options.config) : undefined;
  let running = false, closed = false, unsubscribe: (() => void) | undefined, timer: ReturnType<typeof setInterval> | undefined;
  function owner() { if (getAcquiredProjectRuntime(runtime.root) !== runtime || runtime.referenceCount < 1) fail("RESEARCH_OWNER_REQUIRED"); }
  function leaseKey(campaignId: string) { return `proof-workflow-owner:${campaignId}`; }
  async function withAdvancementTurn<T>(campaignId: string, advance: () => Promise<T>): Promise<T> {
    owner();
    const previous = advancementTurns.get(campaignId);
    let release!: () => void;
    const turn = new Promise<void>(resolve => { release = resolve; });
    advancementTurns.set(campaignId, turn);
    await previous;
    try {
      owner(); if (closed) fail("PROOF_OWNER_CLOSED");
      return await advance();
    } finally {
      release(); if (advancementTurns.get(campaignId) === turn) advancementTurns.delete(campaignId);
    }
  }
  function readLease(campaignId: string): Lease | undefined {
    const row = store.get("SELECT * FROM commands WHERE command_id=?", leaseKey(campaignId)); if (!row) return undefined;
    const value = JSON.parse(String(row.response_json)) as Lease;
    if (row.principal_id !== "service:proof-workflow-owner" || row.status !== "committed" || row.request_sha256 !== hash(value) || value.campaign_id !== campaignId) fail("PROOF_OWNER_STATE_INVALID");
    return value;
  }
  function saveLease(value: Lease) {
    // This mutable coordination record is not a second authoritative campaign cursor or a command receipt.
    const key = leaseKey(value.campaign_id); readLease(value.campaign_id);
    store.run("INSERT INTO commands(command_id,principal_id,request_sha256,response_json,status) VALUES (?,'service:proof-workflow-owner',?,?,'committed') ON CONFLICT(command_id) DO UPDATE SET request_sha256=excluded.request_sha256,response_json=excluded.response_json",
      key, hash(value), canonicalJson(value));
  }
  function recoverKnownNativeCompletions(campaignId: string): Set<string> {
    const recovered = new Set<string>();
    if (!verifyNative) return recovered;
    try {
      const snapshot = prepareStageWork(campaignId);
      if (!snapshot || snapshot.campaign.current_stage !== "candidate_verification") return recovered;
      const prepared = savedResult(operation(snapshot, "prepared"));
      if (!prepared || !Array.isArray(prepared.projects)) return recovered;
      for (const candidate of prepared.projects) {
        if (!candidate || typeof candidate !== "object") continue;
        const project = candidate as FormalCandidateProjectReceipt;
        if (!verifyNative.recoverCommittedNativeCommand(project)) continue;
        const task = store.listTasks(campaignId).filter(value => value.kind === "proof_workflow"
          && value.method_family === "service_native_lean" && value.coupling_label === project.candidate_id);
        for (const value of task) {
          const attempt = store.get("SELECT attempt_key FROM attempts WHERE task_id=? AND runtime_kind='service-proof-tool' AND state<>'terminated'", value.task_id);
          if (attempt) recovered.add(String(attempt.attempt_key));
        }
      }
    } catch {
      // Any incomplete or mismatched recovery candidate remains on the generic fail-closed path.
    }
    return recovered;
  }
  async function claim(campaignId: string): Promise<Lease> {
    owner();
    const recovered = recoverKnownNativeCompletions(campaignId);
    const stale = store.all("SELECT a.attempt_key FROM attempts a JOIN tasks t ON t.task_id=a.task_id WHERE t.campaign_id=? AND a.runtime_kind='service-proof-tool' AND a.state<>'terminated'", campaignId)
      .map(row => String(row.attempt_key)).filter(attemptKey => !recovered.has(attemptKey));
    // Recovery marks its own durable state. Do not roll that safety write back by throwing from an outer lease transaction.
    if (stale.length) {
      for (const attemptKey of stale) options.tools.recoverAttempt(attemptKey);
      fail("PROOF_OWNED_TOOLS_UNRECONCILED");
    }
    return store.transaction(() => {
      const previous = readLease(campaignId);
      if (previous?.state === "active" && previous.incarnation === incarnation) fail("PROOF_ADVANCEMENT_BUSY");
      const unfinished = store.all("SELECT a.attempt_key FROM attempts a JOIN tasks t ON t.task_id=a.task_id WHERE t.campaign_id=? AND a.runtime_kind='service-proof-tool' AND a.state<>'terminated'", campaignId);
      if (unfinished.length) {
        if (unfinished.some(row => !recovered.has(String(row.attempt_key)))) fail("PROOF_OWNED_TOOLS_UNRECONCILED");
      }
      const value: Lease = { incarnation, nonce: randomUUID(), epoch: (previous?.epoch ?? 0) + 1,
        expires_at: new Date(runtime.clock.now() + (options.config?.advancement_lease_ms ?? 120000)).toISOString(),
        state: "active", campaign_id: campaignId, stop_requested: false };
      saveLease(value); return value;
    });
  }
  function assertLease(lease: Lease) {
    const current = readLease(lease.campaign_id);
    if (!current || current.incarnation !== incarnation || current.nonce !== lease.nonce || current.epoch !== lease.epoch
      || current.state !== "active" || current.stop_requested || runtime.clock.now() >= Date.parse(current.expires_at)) fail("PROOF_ADVANCEMENT_FENCED");
  }
  function finish(lease: Lease, code?: string) {
    store.transaction(() => {
      const current = readLease(lease.campaign_id);
      if (current?.nonce !== lease.nonce || current.incarnation !== incarnation) return;
      saveLease({ ...current, state: code ? "blocked" : "idle", ...(code ? { code } : { code: undefined }) });
    });
  }
  function prepareStageWork(campaignId: string): Snapshot | undefined {
    const prepared = inspectApprovedProofStage({ project_root: runtime.root, campaign_id: campaignId, actor: "service:proof-workflow" });
    if (prepared.blocker || !prepared.obligation || prepared.campaign.status !== "running") return undefined;
    const campaign = prepared.campaign, po = prepared.obligation;
    const scope = requireApprovedFormalScope(runtime, campaignId, po.locked_statement_structured.approved_scope as Parameters<typeof requireApprovedFormalScope>[2]);
    const pack = scope.receipt.packages.find(value => value.obligation_id === po.obligation_id)!;
    const cursor = campaign.obligation_cursors?.[po.obligation_id]; if (!cursor || cursor.current_stage !== campaign.current_stage) fail("PROOF_STAGE_CURSOR_INVALID");
    const generationRun = [...campaign.stage_runs].reverse().find(value => value.stage === "candidate_generation" && value.obligation_id === po.obligation_id);
    const generationHash = campaign.current_stage === "candidate_verification" && generationRun?.artifact_paths[0]
      ? createHash("sha256").update(readCommittedFile(runtime.root, generationRun.artifact_paths[0])).digest("hex") : null;
    return { campaign, revision: store.getCampaign(campaignId)!.revision, obligation_id: po.obligation_id,
      stage_attempt: cursor.stage_attempt, scope_package_sha256: pack.scope_package_sha256,
      binding_hash: hash({ campaign_id: campaignId, active_obligation_id: po.obligation_id, current_stage: campaign.current_stage,
        cursor, scope: scope.scope, obligation: po, dependencies: po.dependencies.map(id => campaign.open_obligations.find(item => item.obligation_id === id)), generationHash, config: options.config }) };
  }
  function operation(snapshot: Snapshot, suffix = "") { return `proof-stage:${hash({ campaign_id: snapshot.campaign.campaign_id, po: snapshot.obligation_id,
    stage: snapshot.campaign.current_stage, attempt: snapshot.stage_attempt, scope: snapshot.scope_package_sha256, suffix })}`; }
  function savedResult(operationId: string): Record<string, unknown> | undefined {
    const row = store.get("SELECT phase,plan_json FROM trust_commits WHERE operation_id=?", operationId); if (!row) return undefined;
    if (row.phase !== "committed") fail("COMMIT_PENDING");
    const plan = JSON.parse(String(row.plan_json));
    const response = plan.response as Record<string, unknown>;
    const path = response.report_path;
    if (typeof path !== "string") fail("PROOF_STAGE_RECEIPT_INVALID");
    const target = plan.targets.find((value: { relative_path: string }) => value.relative_path === path);
    const bytes = readFileSync(resolveProjectCommitPath(runtime.root, path));
    if (!target || createHash("sha256").update(bytes).digest("hex") !== target.after_sha256) fail("PROOF_STAGE_EVIDENCE_CHANGED");
    return JSON.parse(bytes.toString("utf8"));
  }
  function recordBlock(campaignId: string, code: string, snapshot?: Snapshot) {
    const key = `proof-block:${hash({ campaignId, code, binding: snapshot?.binding_hash ?? null })}`;
    if (store.get("SELECT command_id FROM commands WHERE command_id=?", key)) return;
    store.transaction(() => {
      const payload = { code, obligation_id: snapshot?.obligation_id ?? null, stage: snapshot?.campaign.current_stage ?? null, stage_attempt: snapshot?.stage_attempt ?? null, proof_authority: "none" };
      const event = events.appendEvent({ campaign_id: campaignId, type: "ProofWorkflowBlocked", actor: "service:proof-workflow", payload });
      store.run("INSERT INTO commands(command_id,principal_id,request_sha256,response_json,status) VALUES (?,'service:proof-block',?,?,'committed')", key, hash(payload), canonicalJson({ ...payload, event_seq: event.seq }));
    });
  }
  function commitStageResult(lease: Lease, snapshot: Snapshot, report: Record<string, unknown>, nextStage?: "candidate_verification" | "blocked", native = false,
    verifyCurrent?: (current: Snapshot) => void) {
    assertLease(lease);
    // Reread and rebuild from current campaign state. A revision change never authorizes writing an old campaign object.
    const current = prepareStageWork(snapshot.campaign.campaign_id);
    if (!current || current.binding_hash !== snapshot.binding_hash) fail("PROOF_STAGE_BINDING_CHANGED");
    const campaign = current.campaign, reportPath = obligationStagePath(campaign, nextStage ? "generation-results.json" : native ? "native-results.json" : "verification-inputs.json");
    const result = withProjectCommit(runtime.root, { operation_id: operation(current, nextStage === "blocked" ? "failed" : nextStage ? "completed" : native ? "native" : "prepared"), campaign_id: campaign.campaign_id,
      expected_revision: current.revision, request: { binding_hash: current.binding_hash, report } }, () => {
      assertLease(lease);
      const latest = getCampaign(runtime.root, campaign.campaign_id), control = store.getCampaign(campaign.campaign_id)!;
      if (!latest || hash(latest) !== hash(campaign) || control.revision !== current.revision) fail("PROOF_STAGE_REVISION_CONFLICT");
      verifyCurrent?.(current);
      writeCommittedFile(runtime.root, reportPath, canonicalJson(report));
      if (nextStage) {
        const failed = nextStage === "blocked", active = latest.open_obligations.find(value => value.obligation_id === current.obligation_id)!;
        const updated = { ...latest, ...(failed ? { status: "blocked" as const,
          open_obligations: replaceObligationById(latest.open_obligations, { ...active, status: "blocked" }),
          blockers: [...latest.blockers, { obligation_id: current.obligation_id, code: "PROOF_NO_ACCEPTED_CANDIDATE", reason: "all_formal_candidates_failed", artifact_path: reportPath }] } : {}),
          stage_runs: [...latest.stage_runs, { id: store.allocateId("SRUN"), stage: latest.current_stage,
            status: failed ? "failed" as const : "completed" as const, artifact_paths: [reportPath], obligation_id: current.obligation_id, stage_attempt: current.stage_attempt,
            scope_package_sha256: current.scope_package_sha256, created_at: new Date(runtime.clock.now()).toISOString() }] };
        const next = advanceObligationStage(updated, nextStage, { obligation_id: current.obligation_id, ...(failed ? { blocked_reason: "all_formal_candidates_failed" } : {}) });
        writeCampaign(runtime.root, next, "service:proof-workflow");
      }
      const payload = { obligation_id: current.obligation_id, stage: campaign.current_stage, stage_attempt: current.stage_attempt,
        next_stage: nextStage ?? null, report_path: reportPath, proof_authority: "none" };
      stageResearchMutation(runtime.root, "INSERT INTO events(campaign_id,type,actor,payload_json,payload_sha256,created_at) VALUES (?,?,?, ?,?,?)",
        [campaign.campaign_id, nextStage ? "ProofStageAdvanced" : native ? "ProofNativeVerificationRecorded" : "ProofVerificationInputsPrepared", "service:proof-workflow", canonicalJson(payload), hash(payload), new Date(runtime.clock.now()).toISOString()]);
      stageResearchMutation(runtime.root, "UPDATE campaigns SET revision=?,control_json=json_set(control_json,'$.revision',?,'$.snapshot_seq',(SELECT MAX(seq) FROM events WHERE campaign_id=?)) WHERE campaign_id=? AND revision=?",
        [current.revision + 1, current.revision + 1, campaign.campaign_id, campaign.campaign_id, current.revision]);
      return { report_path: reportPath, proof_authority: "none" };
    });
    notifyResearchEventsCommitted(runtime); return result;
  }
  function acceptedSources(bindings: FormalCandidateReservation[], snapshot: Snapshot) {
    const sources: FormalCandidateSubmissionReceipt[] = [];
    for (const binding of bindings) {
      const task = store.getTask(binding.task_id);
      if (!task || task.status !== "succeeded") continue;
      const row = store.get("SELECT response_json FROM commands WHERE principal_id='service:formal-submission' AND json_extract(response_json,'$.task_id')=? AND json_extract(response_json,'$.generation')=?", task.task_id, task.generation);
      if (!row) continue; // A structured failed search is terminal, but is not a candidate source.
      const candidate = options.intake.readSubmissionReceipt(JSON.parse(String(row.response_json)).command_id);
      const attemptBinding = options.candidates.readTaskCandidateReservation(task.task_id, task.generation);
      if (!candidate || candidate.commit_state !== "committed" || candidate.obligation_id !== snapshot.obligation_id
        || candidate.stage_attempt !== snapshot.stage_attempt || candidate.scope_package_sha256 !== snapshot.scope_package_sha256
        || !attemptBinding || attemptBinding.dispatch_id !== binding.dispatch_id || attemptBinding.candidate_id !== candidate.candidate_id
        || candidate.task_id !== task.task_id || candidate.generation !== task.generation || candidate.variant_id !== binding.variant_id
        || task.accepted_result_id !== candidate.result_ref.artifact_id) fail("PROOF_SOURCE_BINDING_INVALID");
      const ready = store.get("SELECT * FROM events WHERE type='FormalCandidateReadyForVerification' AND task_id=? AND generation=? AND json_extract(payload_json,'$.operation_id')=?", task.task_id, task.generation, candidate.operation_id);
      if (!ready || ready.actor !== "service:formal-submission" || ready.payload_sha256 !== hash(JSON.parse(String(ready.payload_json)))) fail("PROOF_SOURCE_NOT_READY");
      const value = JSON.parse(String(ready.payload_json));
      if (value.active_for_verification !== true || value.proof_authority !== "none" || value.candidate_id !== candidate.candidate_id
        || canonicalJson(value.result_ref) !== canonicalJson(candidate.result_ref)) fail("PROOF_SOURCE_NOT_READY");
      sources.push(candidate);
    }
    return sources;
  }
  function syncControlProjection(campaignId: string) {
    const control = store.getCampaign(campaignId), campaign = getCampaign(runtime.root, campaignId);
    if (!control || !campaign || campaign.status === "terminal" || campaign.status === "blocked") return campaign;
    const status = control.state === "paused" ? "paused" : control.state === "running" ? "running" : undefined;
    if (!status || campaign.status === status) return campaign;
    const operationId = `proof-control-projection:${hash({ campaign_id: campaignId, revision: control.revision, status })}`;
    return withProjectCommit(runtime.root, { operation_id: operationId, campaign_id: campaignId, expected_revision: control.revision,
      request: { status, proof_authority: "none" } }, () => {
      const latestControl = store.getCampaign(campaignId), latest = getCampaign(runtime.root, campaignId);
      if (!latestControl || latestControl.revision !== control.revision || latestControl.state !== control.state || !latest) fail("PROOF_CONTROL_PROJECTION_STALE");
      if (latest.status === "terminal" || latest.status === "blocked" || latest.status === status) return latest;
      return writeCampaign(runtime.root, { ...latest, status }, "service:proof-workflow");
    });
  }
  function integrateVerifiedLeaf(snapshot: Snapshot, executions: AsyncFinalAuthorityReplayExecution[]): boolean {
    const final = executions.find(value => value.result === "pass" && value.claim_id === snapshot.campaign.open_obligations.find(item => item.obligation_id === snapshot.obligation_id)?.claim_id
      && value.obligation_id === snapshot.obligation_id);
    const finalPackaging = final?.final_authority_packaging;
    if (!final || !finalPackaging?.evidence_id || finalPackaging.artifact_ids?.length !== 3 || !final.final_replay_manifest_v3_path) return false;
    const artifactIds = finalPackaging.artifact_ids, evidenceId = finalPackaging.evidence_id, finalManifestPath = final.final_replay_manifest_v3_path;
    const packaging = JSON.parse(readCommittedFile(runtime.root, finalPackaging.packaging_path));
    if (!verifyScopedFinalAuthorityPackagingV1(runtime.root, packaging).ok) fail("PROOF_FINAL_AUTHORITY_PACKAGING_INVALID");
    const current = prepareStageWork(snapshot.campaign.campaign_id);
    if (!current || current.binding_hash !== snapshot.binding_hash) fail("PROOF_STAGE_BINDING_CHANGED");
    const obligation = current.campaign.open_obligations.find(item => item.obligation_id === current.obligation_id);
    if (!obligation || final.claim_id !== obligation.claim_id || final.obligation_id !== obligation.obligation_id) fail("PROOF_FINAL_AUTHORITY_SCOPE_MISMATCH");
    const rootCompletion = obligation.claim_id === current.campaign.root_claim_id;
    const control = store.getCampaign(current.campaign.campaign_id);
    if (!control) fail("RESEARCH_CAMPAIGN_NOT_FOUND");
    withProjectCommit(runtime.root, { operation_id: `${operation(current, "leaf-integrated")}:${final.replay_id}`, campaign_id: current.campaign.campaign_id,
      expected_revision: current.revision, request: { obligation_id: obligation.obligation_id, claim_id: obligation.claim_id,
        replay_id: final.replay_id, evidence_id: evidenceId, artifact_ids: artifactIds } }, () => {
      const latest = getCampaign(runtime.root, current.campaign.campaign_id), latestControl = store.getCampaign(current.campaign.campaign_id)!;
      if (!latest || hash(latest) !== hash(current.campaign) || latestControl.revision !== current.revision) fail("PROOF_STAGE_REVISION_CONFLICT");
      const claim = getClaim(runtime.root, control.project_id, obligation.claim_id);
      if (!claim) fail("CLAIM_NOT_FOUND");
      applyGatePromotedClaim(runtime.root, { ...claim, formalization_status: "kernel_checked", dependency_closure_status: "all_dependencies_present", audit_state: "audit_passed", updated_at: new Date(runtime.clock.now()).toISOString() });
      const promotion = promoteClaim(runtime.root, { project_id: control.project_id, claim_id: obligation.claim_id, target_status: "formally_checked",
        evidence_ids: [evidenceId], artifact_ids: artifactIds, actor: "service:proof-workflow" });
      if (!promotion.gate.ok) fail("PROOF_FINAL_AUTHORITY_GATE_REJECTED");
      const authorityEvidence = rootCompletion ? {
        schema_version: "comath.formal_replay_authority_evidence.v1" as const,
        proof_authority: "lean_kernel_clean_replay" as const,
        final_evidence_status: "verified_final_authority_evidence" as const,
        final_replay_manifest_v3_path: finalManifestPath,
        final_authority_packaging_path: finalPackaging.packaging_path,
        replay_id: final.replay_id,
        gate_result_id: promotion.gate.id,
        artifact_hash: createHash("sha256").update(readCommittedFile(runtime.root, finalPackaging.packaging_path)).digest("hex"),
        recorded_at: new Date(runtime.clock.now()).toISOString()
      } : undefined;
      const obligations = replaceObligationById(latest.open_obligations, { ...obligation, status: "integrated" });
      const stageRun = { id: store.allocateId("SRUN"), stage: latest.current_stage, status: "completed" as const, artifact_paths: [
        finalPackaging.packaging_path, finalManifestPath, finalPackaging.derived_bindings_path],
        obligation_id: obligation.obligation_id, stage_attempt: current.stage_attempt, scope_package_sha256: current.scope_package_sha256,
        created_at: new Date(runtime.clock.now()).toISOString() };
      if (rootCompletion) {
        if (!authorityEvidence) fail("PROOF_ROOT_AUTHORITY_EVIDENCE_MISSING");
        writeCampaign(runtime.root, { ...latest, current_stage: "completed_formal_proof", status: "terminal", terminal_state: "completed_formal_proof",
          open_obligations: obligations, formal_replay_authority_passed: true, formal_replay_authority_evidence: authorityEvidence,
          stage_runs: [...latest.stage_runs, stageRun], next_actions: [] }, "service:proof-workflow");
        const payload = { obligation_id: obligation.obligation_id, claim_id: obligation.claim_id, gate_result_id: promotion.gate.id, replay_id: final.replay_id, proof_authority: "lean_kernel_clean_replay" };
        stageResearchMutation(runtime.root, "INSERT INTO events(campaign_id,type,actor,payload_json,payload_sha256,created_at) VALUES (?,?,?, ?,?,?)",
          [current.campaign.campaign_id, "ProofCampaignFormallyCompleted", "service:proof-workflow", canonicalJson(payload), hash(payload), new Date(runtime.clock.now()).toISOString()]);
        stageResearchMutation(runtime.root, "UPDATE campaigns SET revision=?,control_json=json_set(control_json,'$.revision',?,'$.snapshot_seq',(SELECT MAX(seq) FROM events WHERE campaign_id=?)) WHERE campaign_id=? AND revision=?",
          [current.revision + 1, current.revision + 1, current.campaign.campaign_id, current.campaign.campaign_id, current.revision]);
        return { proof_authority: "lean_kernel_clean_replay", terminal: true };
      }
      const completed = advanceObligationStage({ ...latest, open_obligations: obligations,
        stage_runs: [...latest.stage_runs, stageRun] }, "completed_formal_proof", { obligation_id: obligation.obligation_id });
      const next = selectReadyObligation(obligations);
      if (!next) fail("PROOF_NEXT_OBLIGATION_UNAVAILABLE");
      const advanced = advanceObligationStage({ ...completed, status: "running" }, "planning", { obligation_id: next.obligation_id });
      writeCampaign(runtime.root, advanced, "service:proof-workflow");
      const payload = { obligation_id: obligation.obligation_id, claim_id: obligation.claim_id, gate_result_id: promotion.gate.id, replay_id: final.replay_id, proof_authority: "none" };
      stageResearchMutation(runtime.root, "INSERT INTO events(campaign_id,type,actor,payload_json,payload_sha256,created_at) VALUES (?,?,?, ?,?,?)",
        [current.campaign.campaign_id, "ProofObligationIntegrated", "service:proof-workflow", canonicalJson(payload), hash(payload), new Date(runtime.clock.now()).toISOString()]);
      stageResearchMutation(runtime.root, "UPDATE campaigns SET revision=?,control_json=json_set(control_json,'$.revision',?,'$.snapshot_seq',(SELECT MAX(seq) FROM events WHERE campaign_id=?)) WHERE campaign_id=? AND revision=?",
        [current.revision + 1, current.revision + 1, current.campaign.campaign_id, current.campaign.campaign_id, current.revision]);
      return { proof_authority: "none", next_obligation_id: next.obligation_id };
    });
    notifyResearchEventsCommitted(runtime); return true;
  }
  async function executeStageWork(lease: Lease, snapshot: Snapshot): Promise<boolean> {
    assertLease(lease);
    const campaign = snapshot.campaign;
    if (campaign.current_stage === "planning") {
      advanceApprovedProofPlanning({ project_root: runtime.root, campaign_id: campaign.campaign_id, actor: "service:proof-workflow" }); return true;
    }
    if (campaign.current_stage === "candidate_generation") {
      const dispatch = options.candidates.submitCandidateGenerationTasks({ campaign_id: campaign.campaign_id, obligation_id: snapshot.obligation_id,
        stage_attempt: snapshot.stage_attempt, expected_revision: snapshot.revision });
      const bindings = options.candidates.readDispatchBindings(dispatch);
      const tasks = bindings.map(binding => store.getTask(binding.task_id)!);
      if (tasks.some(task => !["succeeded", "failed", "cancelled"].includes(task.status))) return false;
      const current = prepareStageWork(campaign.campaign_id)!; const sources = acceptedSources(bindings, current);
      commitStageResult(lease, current, { schema_version: "comath.proof_generation_results.v1", dispatch,
        sources, child_states: tasks.map(task => ({ task_id: task.task_id, generation: task.generation, status: task.status, accepted_result_id: task.accepted_result_id ?? null })), proof_authority: "none" }, sources.length ? "candidate_verification" : "blocked", false,
      sources.length ? latest => {
        const currentSources = acceptedSources(options.candidates.readDispatchBindings(dispatch), latest);
        if (canonicalJson(currentSources) !== canonicalJson(sources)) fail("PROOF_SOURCE_NOT_READY");
      } : undefined);
      return true;
    }
    if (campaign.current_stage === "candidate_verification") {
      const previous = savedResult(operation(snapshot, "native"));
      if (previous) {
        if (Array.isArray(previous.final_authority_executions) && integrateVerifiedLeaf(snapshot, previous.final_authority_executions as AsyncFinalAuthorityReplayExecution[])) return true;
        fail("PROOF_VERIFICATION_INTEGRITY_GATES_REQUIRED");
      }
      const run = [...campaign.stage_runs].reverse().find(value => value.stage === "candidate_generation" && value.obligation_id === snapshot.obligation_id);
      if (!run || !run.artifact_paths[0]) fail("PROOF_GENERATION_RESULT_MISSING");
      const generationSnapshot = { ...snapshot, campaign: { ...campaign, current_stage: "candidate_generation" as const }, stage_attempt: run.stage_attempt ?? 1 };
      const generation = savedResult(operation(generationSnapshot, "completed"));
      if (!generation || !Array.isArray(generation.sources)) fail("PROOF_GENERATION_RESULT_MISSING");
      await Promise.resolve(); assertLease(lease);
      const projects = (generation.sources as FormalCandidateSubmissionReceipt[]).map(source => options.projects.materializeAcceptedCandidateLeanProject({
        submission_command_id: source.command_id, lean_toolchain: options.config!.lean_toolchain }));
      if (!savedResult(operation(snapshot, "prepared"))) commitStageResult(lease, snapshot, { schema_version: "comath.proof_verification_inputs.v1", projects, proof_authority: "none" });
      const controller = controllers.get(campaign.campaign_id)!;
      const assertCurrent = () => {
        assertLease(lease);
        if (store.getCampaign(campaign.campaign_id)?.state !== "running") fail("PROOF_ADVANCEMENT_FENCED");
        const latest = prepareStageWork(campaign.campaign_id);
        if (!latest || latest.binding_hash !== snapshot.binding_hash) fail("PROOF_STAGE_BINDING_CHANGED");
        const current = readLease(campaign.campaign_id)!, duration = options.config!.advancement_lease_ms;
        if (Date.parse(current.expires_at) - runtime.clock.now() < duration / 2) {
          store.transaction(() => { assertLease(lease); saveLease({ ...readLease(campaign.campaign_id)!, expires_at: new Date(runtime.clock.now() + duration).toISOString() }); });
        }
      };
      const results: ProofNativeVerificationResult[] = [];
      for (const project of projects) {
        const result = await verifyNative!(project, { signal: controller.signal, assertCurrent });
        results.push(result);
      }
      const replay_preparations = projects.flatMap((project, index) => {
        const result = results[index];
        if (!result?.native_checks_passed || result.structured_audit?.report.result !== "pass"
          || result.structured_audit.lock_elaboration.result !== "pass" || result.structured_audit.statement_comparison.result !== "pass"
          || result.dependency_evidence?.result !== "pass") return [];
        return [prepareAsyncCleanReplayWorkspace({ runtime, project, obligation_id: snapshot.obligation_id, stage_attempt: snapshot.stage_attempt })];
      });
      const replay_executions = [], final_authority_executions = [];
      for (const preparation of replay_preparations) {
        const project = projects.find(value => value.candidate_id === preparation.candidate_id && value.claim_id === preparation.claim_id && value.obligation_id === preparation.obligation_id);
        if (!project) fail("ASYNC_CLEAN_REPLAY_PROJECT_MISSING");
        const replay = await executeCleanReplay!.execute({ project, preparation }, { signal: controller.signal, assertCurrent });
        replay_executions.push(replay);
        if (replay.legacy_final_input?.result === "ready") final_authority_executions.push(await executeFinalAuthorityReplay!.execute({ project, preparation }, { signal: controller.signal, assertCurrent }));
      }
      commitStageResult(lease, snapshot, { schema_version: "comath.proof_native_results.v1", results, replay_preparations, replay_executions, final_authority_executions, proof_authority: "none" }, undefined, true);
      if (integrateVerifiedLeaf(snapshot, final_authority_executions)) return true;
      recordBlock(campaign.campaign_id, "PROOF_VERIFICATION_INTEGRITY_GATES_REQUIRED", snapshot);
      return false;
    }
    fail("PROOF_STAGE_CONSUMER_UNAVAILABLE");
  }
  async function runCampaign(campaignId: string) {
    let lease: Lease | undefined, snapshot: Snapshot | undefined;
    try {
      const control = store.getCampaign(campaignId), campaign = getCampaign(runtime.root, campaignId);
      if (!control || control.state !== "running" || !campaign || campaign.status === "terminal") return;
      if (!options.config) { recordBlock(campaignId, "PROOF_WORKFLOW_NOT_CONFIGURED"); return; }
      lease = await claim(campaignId);
      controllers.set(campaignId, new AbortController());
      for (let step = 0; step < 8 && running && !closed; step++) {
        assertLease(lease); snapshot = prepareStageWork(campaignId); if (!snapshot) break;
        store.transaction(() => { const current = readLease(campaignId)!; assertLease(lease!); saveLease({ ...current, work_hash: snapshot!.binding_hash }); });
        if (!await executeStageWork(lease, snapshot)) break;
      }
      finish(lease);
    } catch (error) {
      const code = error instanceof ComathError ? error.code : "PROOF_WORKFLOW_EXECUTION_FAILED";
      if (lease) finish(lease, code);
      recordBlock(campaignId, code, snapshot);
    } finally {
      controllers.delete(campaignId);
    }
  }
  function wake(campaignId?: string) {
    if (!running || closed) return;
    for (const id of campaignId ? [campaignId] : store.listCampaigns().map(value => value.campaign_id)) {
      try { syncControlProjection(id); }
      catch { recordBlock(id, "PROOF_CONTROL_PROJECTION_FAILED"); }
      requested.add(id); if (pending.has(id)) continue;
      const work = Promise.resolve().then(async () => { while (requested.delete(id) && running && !closed) await runCampaign(id); });
      pending.set(id, work);
      void work.finally(() => pending.delete(id)).catch(() => {});
    }
  }
  async function requestAdvance(input: CampaignTickInput): Promise<CampaignTickResult> {
    return withAdvancementTurn(input.campaign_id, () => requestManagedAdvance(input));
  }
  async function requestManagedAdvance(input: CampaignTickInput): Promise<CampaignTickResult> {
    owner(); const campaign = getCampaign(runtime.root, input.campaign_id); if (!campaign) fail("CAMPAIGN_NOT_FOUND");
    if (input.command_id !== undefined && (typeof input.command_id !== "string" || !input.command_id.length || input.command_id.length > 160)
      || input.actor !== undefined && (typeof input.actor !== "string" || !input.actor.length || input.actor.length > 160)) fail("PROOF_INTENT_INVALID");
    const commandId = input.command_id ?? `tick:${campaign.campaign_id}:${campaign.active_obligation_id ?? "none"}:${campaign.current_stage}:${campaign.obligation_cursors?.[campaign.active_obligation_id ?? ""]?.stage_attempt ?? 0}`;
    const payload = { campaign_id: input.campaign_id, command_id: commandId, actor: input.actor ?? "operator" };
    const key = `proof-intent:${hash(commandId)}`;
    store.transaction(() => {
      const prior = store.get("SELECT * FROM commands WHERE command_id=?", key);
      if (prior) { if (prior.principal_id !== "service:proof-intent" || prior.request_sha256 !== hash(payload)) fail("PROOF_INTENT_CONFLICT"); return; }
      events.appendEvent({ campaign_id: input.campaign_id, type: "ProofAdvanceRequested", actor: "service:proof-workflow", payload });
      store.run("INSERT INTO commands(command_id,principal_id,request_sha256,response_json,status) VALUES (?,'service:proof-intent',?,?,'committed')", key, hash(payload), canonicalJson(payload));
    });
    wake(input.campaign_id); return { campaign: getCampaign(runtime.root, input.campaign_id)!, blocker: options.config ? "proof_advance_requested" : "proof_workflow_not_configured" };
  }
  async function requestLegacyAdvance(input: CampaignTickInput, advance: () => Promise<CampaignTickResult>): Promise<CampaignTickResult> {
    return withAdvancementTurn(input.campaign_id, () =>
      store.getCampaign(input.campaign_id) ? requestManagedAdvance(input) : advance());
  }
  async function cancel(campaignId: string, actor = "operator") {
    owner();
    const control = store.getCampaign(campaignId); if (!control) fail("RESEARCH_CAMPAIGN_NOT_FOUND");
    const previousProof = getCampaign(runtime.root, campaignId);
    if (previousProof?.status === "terminal" && previousProof.terminal_state !== "cancelled_by_user") return;
    // Cancellation intent must remain writable while an unrelated trusted file commit is pending.
    store.transaction(() => {
      const current = store.getCampaign(campaignId)!;
      const lease = readLease(campaignId); if (lease) saveLease({ ...lease, stop_requested: true });
      const stamp = new Date(runtime.clock.now()).toISOString();
      for (const task of store.listTasks(campaignId)) {
        if (["succeeded", "failed", "cancelled"].includes(task.status)) continue;
        const live = store.get("SELECT attempt_key FROM attempts WHERE task_id=? AND generation=? AND state<>'terminated'", task.task_id, task.generation);
        store.putTask({ ...task, status: live ? "cancelling" : "cancelled", updated_at: stamp });
      }
      store.run("UPDATE attempts SET state='cancelling',stop_reason='user_cancel',stop_requested_at=?,fenced_at=? WHERE task_id IN (SELECT task_id FROM tasks WHERE campaign_id=?) AND state<>'terminated'", stamp, stamp, campaignId);
      store.run("UPDATE tool_executions SET stop_intent='user_cancel' WHERE attempt_key IN (SELECT a.attempt_key FROM attempts a JOIN tasks t ON a.task_id=t.task_id WHERE t.campaign_id=?) AND state<>'terminated'", campaignId);
      if (current.state !== "cancelled") {
        const event = events.appendEvent({ campaign_id: campaignId, type: "ProofCampaignCancelRequested", actor: "service:proof-workflow", payload: { proof_authority: "none" } });
        store.putCampaign({ ...current, state: "cancelled", revision: current.revision + 1, snapshot_seq: event.seq });
      }
    });
    controllers.get(campaignId)?.abort();
    const waits: Promise<unknown>[] = [];
    for (const row of store.all("SELECT a.attempt_key,a.runtime_kind FROM attempts a JOIN tasks t ON t.task_id=a.task_id WHERE t.campaign_id=? AND a.state<>'terminated'", campaignId)) {
      if (row.runtime_kind === "service-proof-tool") options.tools.cancelAttempt(String(row.attempt_key), "user_cancel");
      else waits.push(options.stopWorker(String(row.attempt_key)));
    }
    await Promise.all(waits); await pending.get(campaignId);
    const campaign = getCampaign(runtime.root, campaignId)!;
    if (campaign.status === "terminal" && campaign.terminal_state === "cancelled_by_user") return;
    withProjectCommit(runtime.root, { operation_id: `proof-cancel-result:${hash({ campaignId, revision: control.revision })}`, campaign_id: campaignId, request: { actor } }, () => {
      writeCampaign(runtime.root, { ...campaign, current_stage: "cancelled", status: "terminal", terminal_state: "cancelled_by_user" }, actor);
      stageResearchMutation(runtime.root, "UPDATE campaigns SET state='cancelled',control_json=json_set(control_json,'$.state','cancelled') WHERE campaign_id=?", [campaignId]);
      return { proof_authority: "none" };
    });
  }
  async function requestReplay(input: CampaignTickInput): Promise<CampaignTickResult> {
    owner(); const campaign = getCampaign(runtime.root, input.campaign_id), control = store.getCampaign(input.campaign_id);
    if (!campaign || !control) fail("CAMPAIGN_NOT_FOUND");
    if (campaign.status === "terminal") {
      const obligation = campaign.active_obligation_id
        ? campaign.open_obligations.find(value => value.obligation_id === campaign.active_obligation_id)
        : campaign.open_obligations.find(value => value.status === "integrated");
      if (campaign.terminal_state === "completed_formal_proof") return { campaign, ...(obligation ? { obligation } : {}) };
      const blocker = campaign.terminal_state === "completed_refutation"
        ? "completed refutation campaigns do not have a proof replay"
        : campaign.blockers.map(value => value.reason).find((value): value is string => typeof value === "string")
          ?? `terminal campaign state is ${campaign.terminal_state ?? "unknown"}`;
      return { campaign, ...(obligation ? { obligation } : {}), blocker };
    }
    if (control.state !== "running" || campaign.status !== "running") {
      const blocker = campaign.blockers.map(value => value.reason).find((value): value is string => typeof value === "string")
        ?? `campaign is ${campaign.status}`;
      return { campaign, blocker };
    }
    // Legacy replay/final-audit requests join the same durable stage intent and owner.
    return requestAdvance(input);
  }
  async function pause(input: CampaignTickInput): Promise<ProofWorkflowLifecycleResult> {
    owner();
    const campaignId = input.campaign_id, actor = input.actor ?? "legacy-campaign-api";
    if (typeof actor !== "string" || !actor.length || actor.length > 160) fail("PROOF_INTENT_INVALID");
    const campaign = getCampaign(runtime.root, campaignId), initial = store.getCampaign(campaignId);
    if (!campaign || !initial) fail("CAMPAIGN_NOT_FOUND");
    if (campaign.status === "terminal" || ["completed", "cancelled"].includes(initial.state)) return { campaign, research_campaign: initial };
    if (["running", "blocked"].includes(initial.state)) {
      app.beginPauseCampaign({ kind: "operator", id: actor }, { campaign_id: campaignId,
        command_id: `legacy-proof-pause-${hash({ campaignId, revision: initial.revision })}`,
        expected_revision: initial.revision, reason: "Pause the managed proof campaign through its legacy route." });
    } else if (!["pausing", "paused"].includes(initial.state)) fail("PROOF_PAUSE_STATE_CONFLICT");
    if (initial.state !== "paused") {
      store.transaction(() => {
        const lease = readLease(campaignId); if (lease) saveLease({ ...lease, stop_requested: true });
      });
      controllers.get(campaignId)?.abort();
      const attempts = store.all("SELECT a.attempt_key,a.runtime_kind FROM attempts a JOIN tasks t ON t.task_id=a.task_id WHERE t.campaign_id=? AND a.state<>'terminated'", campaignId);
      await Promise.all(attempts.map(row => row.runtime_kind === "service-proof-tool"
        ? Promise.resolve(options.tools.cancelAttempt(String(row.attempt_key), "pause"))
        : options.stopWorker(String(row.attempt_key))));
      await pending.get(campaignId);
      if (store.getCampaign(campaignId)?.state === "pausing"
        && !store.get("SELECT attempt_key FROM attempts WHERE task_id IN (SELECT task_id FROM tasks WHERE campaign_id=?) AND state<>'terminated' LIMIT 1", campaignId)) {
        app.completePauseCampaign(campaignId);
      }
    }
    const control = store.getCampaign(campaignId)!;
    const projected = control.state === "paused" ? syncControlProjection(campaignId) : getCampaign(runtime.root, campaignId);
    return { campaign: projected ?? getCampaign(runtime.root, campaignId)!, research_campaign: control,
      ...(control.state === "pausing" ? { blocker: "CAMPAIGN_PAUSE_PENDING_TERMINATION" } : {}) };
  }
  async function resume(input: CampaignTickInput): Promise<ProofWorkflowLifecycleResult> {
    owner();
    const campaignId = input.campaign_id, actor = input.actor ?? "legacy-campaign-api";
    if (typeof actor !== "string" || !actor.length || actor.length > 160) fail("PROOF_INTENT_INVALID");
    const campaign = getCampaign(runtime.root, campaignId), control = store.getCampaign(campaignId);
    if (!campaign || !control) fail("CAMPAIGN_NOT_FOUND");
    if (campaign.status === "terminal" || ["completed", "cancelled"].includes(control.state)) return { campaign, research_campaign: control };
    if (campaign.status === "blocked" || control.state === "blocked") return { campaign, research_campaign: control, blocker: "CAMPAIGN_REPAIR_REQUIRED" };
    if (control.state === "pausing") return { campaign, research_campaign: control, blocker: "CAMPAIGN_PAUSE_PENDING_TERMINATION" };
    if (control.state === "paused") {
      app.resumeCampaign({ kind: "operator", id: actor }, { campaign_id: campaignId,
        command_id: `legacy-proof-resume-${hash({ campaignId, revision: control.revision })}`, expected_revision: control.revision });
    } else if (control.state !== "running") fail("PROOF_RESUME_STATE_CONFLICT");
    const projected = syncControlProjection(campaignId);
    wake(campaignId);
    return { campaign: projected ?? getCampaign(runtime.root, campaignId)!, research_campaign: store.getCampaign(campaignId)! };
  }
  const bridge = { requestAdvance, requestLegacyAdvance, requestReplay, pause, resume, cancel };
  const unregister = registerProofWorkflowBridge(runtime, bridge);
  return { ...bridge,
    status: readLease,
    start() { if (closed) fail("PROOF_OWNER_CLOSED"); if (running) return; running = true; unsubscribe = events.subscribe(() => wake());
      timer = setInterval(() => wake(), 15000); timer.unref(); wake(); },
    async flush(campaignId?: string) { wake(campaignId); while (pending.size) await Promise.all([...pending.values()]); },
    stop() { running = false; requested.clear(); for (const controller of controllers.values()) controller.abort(); unsubscribe?.(); unsubscribe = undefined; if (timer) clearInterval(timer); timer = undefined; },
    async close() { this.stop(); await Promise.all([...pending.values()]);
      const unfinished = store.all("SELECT attempt_key FROM attempts WHERE runtime_kind='service-proof-tool' AND state<>'terminated'");
      if (unfinished.length) { for (const row of unfinished) options.tools.recoverAttempt(String(row.attempt_key)); fail("PROOF_OWNED_TOOLS_UNRECONCILED"); }
      closed = true; unregister(); events.close(); }
  };
}
