import { createHash } from "node:crypto";
import { ComathError } from "../errors.js";
import { canonicalJson } from "../verification/runner-contracts.js";
import { createResearchEventStore } from "./event-store.js";
import { getAcquiredProjectRuntime, type ProjectRuntime } from "./project-runtime.js";
import type { FormalCandidateSubmissionReceipt } from "./formal-candidate-intake.js";
import { requireApprovedFormalScope } from "../proof-kernel/campaign/formal-spec-store.js";
import { getCampaign } from "../proof-kernel/campaign/research-campaign.js";
import { finalizeTrustCommit } from "./project-commit.js";

const hash = (value: unknown) => createHash("sha256").update(canonicalJson(value)).digest("hex");
function fail(): never { throw new ComathError("Formal submission lifecycle binding is invalid", { code: "FORMAL_SUBMISSION_LIFECYCLE_INVALID", statusCode: 409 }); }

/** Submission durability and process termination are separate facts; neither grants mathematical authority. */
export function createFormalSubmissionLifecycle(runtime: ProjectRuntime, options: {
  readSubmissionReceipt: (commandId: string) => FormalCandidateSubmissionReceipt | undefined;
}) {
  const store = runtime.store, events = createResearchEventStore(runtime);
  function owner() { if (getAcquiredProjectRuntime(runtime.root) !== runtime || runtime.referenceCount < 1) fail(); }
  function activationRecorded(operationId: string): boolean {
    const row = store.get("SELECT * FROM commands WHERE command_id=?", `formal-activation:${operationId}`);
    if (!row) return false;
    const value = JSON.parse(String(row.response_json));
    if (row.principal_id !== "service:formal-activation" || row.status !== "committed" || value.operation_id !== operationId
      || value.proof_authority !== "none" || row.request_sha256 !== hash(value)) fail();
    return true;
  }
  function record(attemptKey: string) {
    owner();
    const rows = store.all("SELECT * FROM commands WHERE principal_id='service:formal-submission' AND json_extract(response_json,'$.attempt_key')=?", attemptKey);
    if (rows.length > 1) fail(); if (!rows.length) return undefined;
    const row = rows[0]!, receipt = JSON.parse(String(row.response_json)) as FormalCandidateSubmissionReceipt;
    const commit = store.get("SELECT phase,plan_json FROM trust_commits WHERE operation_id=?", String(row.command_id));
    if (!commit) fail();
    const saved = JSON.parse(String(commit.plan_json)).response as FormalCandidateSubmissionReceipt;
    if (receipt.schema_version !== "comath.formal_candidate_submission.v1" || receipt.operation_id !== row.command_id
      || receipt.attempt_key !== attemptKey || receipt.proof_authority !== "none" || receipt.operation_id !== saved.operation_id
      || receipt.task_id !== saved.task_id || receipt.generation !== saved.generation || receipt.candidate_id !== saved.candidate_id
      || receipt.command_id !== saved.command_id || receipt.campaign_id !== saved.campaign_id || receipt.attempt_key !== saved.attempt_key
      || !receipt.result_ref || canonicalJson(receipt.result_ref) !== canonicalJson(saved.result_ref)) fail();
    return { receipt, phase: String(commit.phase) };
  }
  function hasPendingSubmission(attemptKey: string): boolean {
    const value = record(attemptKey);
    return !!value && !activationRecorded(value.receipt.operation_id);
  }
  function recordNormalTermination(attemptKey: string): void {
    const value = record(attemptKey); if (!value) return;
    const attempt = store.get("SELECT * FROM attempts WHERE attempt_key=?", attemptKey);
    if (!attempt || attempt.stop_reason || attempt.stop_requested_at || attempt.fenced_at || Number(attempt.termination_confirmed) !== 0) return;
    if (store.get("SELECT seq FROM events WHERE type='FormalSubmissionExecutionEnded' AND json_extract(payload_json,'$.operation_id')=?", value.receipt.operation_id)) return;
    events.appendEvent({ campaign_id: value.receipt.campaign_id, task_id: value.receipt.task_id, generation: value.receipt.generation,
      type: "FormalSubmissionExecutionEnded", actor: "service:formal-submission", payload: { operation_id: value.receipt.operation_id, attempt_key: attemptKey, proof_authority: "none" } });
  }
  function reconcileSubmissions(recoverPending = false): { operation_id: string; code: string }[] {
    owner(); const errors: { operation_id: string; code: string }[] = [];
    for (const row of store.all("SELECT command_id,response_json FROM commands WHERE principal_id='service:formal-submission' ORDER BY rowid")) {
      const operationId = String(row.command_id);
      try {
        if (activationRecorded(operationId)) continue;
        const original = JSON.parse(String(row.response_json)) as FormalCandidateSubmissionReceipt;
        const saved = record(original.attempt_key); if (!saved) continue;
        if (saved.phase !== "committed") {
          if (!recoverPending) continue;
          finalizeTrustCommit(runtime.root, operationId);
        }
        // The intake reader verifies immutable source, manifest and run after-images before eligibility changes.
        const receipt = options.readSubmissionReceipt(original.command_id);
        if (!receipt || receipt.commit_state !== "committed" || receipt.operation_id !== operationId) fail();
        store.transaction(() => {
          const key = `formal-activation:${operationId}`;
          if (activationRecorded(operationId)) return;
          const task = store.getTask(receipt.task_id), attempt = store.get("SELECT * FROM attempts WHERE attempt_key=?", receipt.attempt_key);
          let scopeCurrent = false;
          try {
            const scope = requireApprovedFormalScope(runtime, receipt.campaign_id, receipt.scope), proof = getCampaign(runtime.root, receipt.campaign_id);
            const obligation = proof?.open_obligations.find(value => value.obligation_id === receipt.obligation_id);
            scopeCurrent = store.getCampaign(receipt.campaign_id)?.state === "running" && proof?.status === "running"
              && scope.obligation_binding.obligation_id === receipt.obligation_id && proof?.active_obligation_id === receipt.obligation_id
              && proof.current_stage === "candidate_generation" && proof.obligation_cursors?.[receipt.obligation_id]?.stage_attempt === receipt.stage_attempt
              && !!obligation && !["integrated", "refuted", "blocked"].includes(obligation.status)
              && canonicalJson(obligation.locked_statement_structured.approved_scope) === canonicalJson(receipt.scope)
              && canonicalJson(task?.scope) === canonicalJson(receipt.scope);
          } catch (error) {
            if (!(error instanceof ComathError) || error.code !== "FORMAL_SCOPE_NOT_APPROVED") throw error;
            scopeCurrent = false;
          }
          const normalExit = store.get("SELECT seq FROM events WHERE type='FormalSubmissionExecutionEnded' AND task_id=? AND generation=? AND json_extract(payload_json,'$.operation_id')=? AND json_extract(payload_json,'$.attempt_key')=?",
            receipt.task_id, receipt.generation, operationId, receipt.attempt_key);
          const active = scopeCurrent && !!task && !!attempt && task.generation === receipt.generation && task.campaign_id === receipt.campaign_id
            && attempt.task_id === task.task_id && Number(attempt.generation) === receipt.generation
            && !attempt.stop_reason && !attempt.stop_requested_at
            && ((attempt.state === "running" && !attempt.fenced_at && Number(attempt.termination_confirmed) === 0
              && runtime.clock.now() < Date.parse(String(attempt.expires_at)) && task.status === "running")
              || (attempt.state === "terminated" && Number(attempt.termination_confirmed) === 1 && !!normalExit
                && task.status === "blocked" && task.blocked_reason === "submission_pending"));
          const disposition = { operation_id: operationId, candidate_id: receipt.candidate_id, task_id: receipt.task_id,
            generation: receipt.generation, active_for_verification: active, result_ref: receipt.result_ref, proof_authority: "none" };
          const event = events.appendEvent({ campaign_id: receipt.campaign_id, task_id: receipt.task_id, generation: receipt.generation,
            type: active ? "FormalCandidateReadyForVerification" : "FormalCandidateSubmissionInactive", actor: "service:formal-submission", payload: disposition });
          if (active) store.putTask({ ...task!, status: "succeeded", accepted_result_id: receipt.result_ref.artifact_id,
            blocked_reason: undefined, updated_at: new Date(runtime.clock.now()).toISOString() });
          else if (task?.generation === receipt.generation && task.status === "blocked" && task.blocked_reason === "submission_pending") {
            store.putTask({ ...task, blocked_reason: "formal_submission_inactive", updated_at: new Date(runtime.clock.now()).toISOString() });
          }
          const activation = { ...disposition, event_seq: event.seq };
          store.run("INSERT INTO commands(command_id,principal_id,request_sha256,response_json,status) VALUES (?,'service:formal-activation',?,?,'committed')",
            key, hash(activation), canonicalJson(activation));
          const campaign = store.getCampaign(receipt.campaign_id); if (campaign) store.putCampaign({ ...campaign, snapshot_seq: event.seq });
        });
      } catch (error) { errors.push({ operation_id: operationId, code: error instanceof ComathError ? error.code : "FORMAL_SUBMISSION_RECONCILIATION_FAILED" }); }
    }
    return errors;
  }
  return { hasPendingSubmission, recordNormalTermination, reconcileSubmissions,
    resumePendingSubmissions: () => reconcileSubmissions(true) };
}
