import { createHash, randomUUID } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";
import { ComathError } from "../errors.js";
import { listArtifactRefs } from "../artifacts/store.js";
import { candidateRunSchema, candidateManifestSchema } from "../types/schemas.js";
import { canonicalJson } from "../verification/runner-contracts.js";
import type { WorkerPrincipal } from "../control/worker-auth.js";
import { getCampaign } from "../proof-kernel/campaign/research-campaign.js";
import { requireApprovedFormalScope } from "../proof-kernel/campaign/formal-spec-store.js";
import { createProofObligationFromFormalSpecLock } from "../proof-kernel/campaign/formal-spec-lock.js";
import { getAcquiredProjectRuntime, type ProjectRuntime } from "./project-runtime.js";
import { createCheckpointStore } from "./checkpoint-store.js";
import { artifactPointerSchema, type ArtifactPointer, type ResearchTask } from "./research-schemas.js";
import { formalCandidateSubmissionSchema, type FormalCandidateSubmission } from "./formal-candidate-contracts.js";
import type { FormalCandidateReservation } from "./formal-candidate-dispatch.js";
import { prepareArtifact, commitArtifactReference } from "./research-artifacts.js";
import { assertProjectReadable, existsCommittedFile, resolveProjectCommitPath, withProjectCommit, writeCommittedFile,
  stageFormalSubmissionFinalized, type ProjectCommitOperation } from "./project-commit.js";

const id = z.string().min(1).max(160);
export const formalCandidateWorkerRequestSchema = z.strictObject({ command_id: id, task_id: id,
  generation: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  submission: z.strictObject({ kind: z.literal("formal_candidate"), value: formalCandidateSubmissionSchema }) });
type Request = z.infer<typeof formalCandidateWorkerRequestSchema>;
export type FormalCandidateSubmissionReceipt = {
  schema_version: "comath.formal_candidate_submission.v1"; command_id: string; task_id: string; generation: number; campaign_id: string;
  attempt_key: string; candidate_id: string; obligation_id: string; variant_id: FormalCandidateSubmission["variant_id"];
  scope: FormalCandidateSubmission["scope"]; scope_package_sha256: string; source_refs: FormalCandidateSubmission["files"];
  stage_attempt: number;
  candidate_run_path: string; manifest_path: string; submission_path: string; workspace_path: string; result_ref: ArtifactPointer;
  operation_id: string; request_sha256: string; commit_state: "pending" | "committed"; proof_authority: "none";
};
const bytesHash = (value: Buffer | string) => createHash("sha256").update(value).digest("hex");
const hash = (value: unknown) => bytesHash(canonicalJson(value));
const same = (a: unknown, b: unknown) => canonicalJson(a) === canonicalJson(b);
const operationFor = (commandId: string) => `formal-submission:${hash(commandId)}`;
function fail(code: string): never { throw new ComathError(code, { code, statusCode: 409 }); }

/** Installs submitted bytes and unverified candidate records. It never executes Lean or completes a task. */
export function createFormalCandidateIntake(runtime: ProjectRuntime, options: {
  authorizeArtifact: (attemptKey: string, ref: Readonly<ArtifactPointer>) => boolean;
  readCandidateReservation: (candidateId: string) => FormalCandidateReservation | undefined;
  commitFault?: ProjectCommitOperation["fault"];
}) {
  const store = runtime.store;
  function owner() { if (getAcquiredProjectRuntime(runtime.root) !== runtime || runtime.referenceCount < 1) fail("RESEARCH_OWNER_REQUIRED"); }
  function current(principal: WorkerPrincipal, allowSucceeded = false): ResearchTask {
    owner();
    const task = store.getTask(principal.task_id), attempt = store.get("SELECT * FROM attempts WHERE attempt_key=?", principal.attempt_key);
    if (!task || !attempt || task.campaign_id !== principal.campaign_id || task.generation !== principal.generation
      || attempt.task_id !== task.task_id || Number(attempt.generation) !== task.generation
      || !(task.status === "running" || allowSucceeded && task.status === "succeeded")
      || attempt.fenced_at || attempt.stop_requested_at || attempt.stop_reason || Number(attempt.termination_confirmed ?? 0) !== 0
      || attempt.state !== "running" || !Number.isFinite(Date.parse(String(attempt.expires_at))) || runtime.clock.now() >= Date.parse(String(attempt.expires_at))) fail("FORMAL_SUBMISSION_ATTEMPT_REJECTED");
    return task;
  }
  function cas(task: ResearchTask, ref: Readonly<ArtifactPointer>): Buffer {
    const registered = listArtifactRefs(runtime.root).find(value => value.id === ref.artifact_id);
    const path = `.comath/artifacts/sha256/${ref.sha256.slice(0, 2)}/${ref.sha256}`;
    if (!registered || registered.sha256 !== ref.sha256 || registered.project_id !== store.getCampaign(task.campaign_id)?.project_id
      || registered.path.replace(/\\/g, "/") !== path) fail("FORMAL_SUBMISSION_ARTIFACT_INVALID");
    assertProjectReadable(runtime.root, path, task.campaign_id);
    try {
      const absolute = resolveProjectCommitPath(runtime.root, path), info = statSync(absolute);
      if (!info.isFile() || info.size !== registered.size_bytes || info.size > 16 * 1024 * 1024) fail("FORMAL_SUBMISSION_ARTIFACT_INVALID");
      const bytes = readFileSync(absolute); if (bytesHash(bytes) !== ref.sha256) fail("FORMAL_SUBMISSION_ARTIFACT_INVALID"); return bytes;
    } catch { fail("FORMAL_SUBMISSION_ARTIFACT_INVALID"); }
  }
  function validate(principal: WorkerPrincipal, input: Request) {
    const task = current(principal), value = input.submission.value;
    if (input.task_id !== principal.task_id || input.generation !== principal.generation || value.task_id !== principal.task_id
      || value.generation !== principal.generation || value.campaign_id !== principal.campaign_id || !same(value.scope, task.scope)) fail("FORMAL_SUBMISSION_IDENTITY_MISMATCH");
    assertProjectReadable(runtime.root, undefined, task.campaign_id);
    const reservation = options.readCandidateReservation(value.candidate_id);
    if (!reservation || !["task_id", "generation", "campaign_id", "obligation_id", "variant_id", "candidate_id", "scope"].every(field =>
      same(reservation[field as keyof FormalCandidateReservation], value[field as keyof FormalCandidateSubmission]))
      || task.kind !== "formalize" || task.specialization !== `formal_candidate:${value.variant_id}`) fail("FORMAL_SUBMISSION_RESERVATION_MISMATCH");
    const campaign = getCampaign(runtime.root, task.campaign_id), control = store.getCampaign(task.campaign_id);
    const obligation = campaign?.open_obligations.find(item => item.obligation_id === value.obligation_id);
    const cursor = campaign?.obligation_cursors?.[value.obligation_id];
    if (!campaign || !control || control.state !== "running" || campaign.status !== "running" || campaign.active_obligation_id !== value.obligation_id
      || campaign.current_stage !== "candidate_generation" || cursor?.current_stage !== "candidate_generation"
      || cursor.stage_attempt !== reservation.stage_attempt || cursor.blocked_reason
      || !obligation || ["integrated", "refuted", "blocked"].includes(obligation.status)) fail("FORMAL_SUBMISSION_OBLIGATION_INACTIVE");
    const approved = requireApprovedFormalScope(runtime, campaign.campaign_id, value.scope);
    const bound = approved.receipt.packages.find(item => item.obligation_id === value.obligation_id);
    const expected = createProofObligationFromFormalSpecLock({ obligation_id: obligation.obligation_id, formal_spec_lock: approved.lock, assumption_ledger: approved.ledger });
    const { approved_scope: scope, ...locked } = obligation.locked_statement_structured;
    if (!bound || !same(scope, value.scope) || approved.obligation_binding.obligation_id !== value.obligation_id || obligation.claim_id !== expected.claim_id
      || obligation.statement_hash !== expected.statement_hash || obligation.locked_statement_nl !== expected.locked_statement_nl
      || obligation.lean_target !== expected.lean_target || !same(locked, expected.locked_statement_structured) || !same(obligation.assumptions, expected.assumptions)
      || !same(obligation.dependencies, approved.obligation_binding.dependencies) || obligation.parent_obligation_id !== approved.obligation_binding.parent_obligation_id
      || obligation.dependencies.some(dependency => campaign.open_obligations.find(item => item.obligation_id === dependency)?.status !== "integrated")) fail("FORMAL_SUBMISSION_SCOPE_MISMATCH");
    const theoremName = approved.lock.namespace ? `${approved.lock.namespace}.${approved.lock.theorem_name}` : approved.lock.theorem_name;
    if (value.theorem_name !== theoremName || value.declared_imports.some(name => !approved.lock.imports_allowed.includes(name))) fail("FORMAL_SUBMISSION_DECLARATION_MISMATCH");
    const checkpoint = createCheckpointStore(runtime, { authorizeArtifact: options.authorizeArtifact }).getResumeMaterial(task.task_id);
    if (!checkpoint || task.checkpoint_head !== value.checkpoint_id || checkpoint.checkpoint.checkpoint_id !== value.checkpoint_id
      || checkpoint.checkpoint.generation !== principal.generation || !same(checkpoint.checkpoint.scope, value.scope)) fail("FORMAL_SUBMISSION_CHECKPOINT_INVALID");
    const checkpointRow = store.get("SELECT * FROM checkpoints WHERE checkpoint_id=?", value.checkpoint_id);
    const event = store.get("SELECT * FROM events WHERE type='CheckpointAccepted' AND task_id=? AND generation=? AND json_extract(payload_json,'$.checkpoint_id')=?", task.task_id, task.generation, value.checkpoint_id);
    const commit = store.get("SELECT phase,plan_json FROM trust_commits WHERE operation_id=?", checkpoint.receipt.operation_id);
    if (checkpointRow?.attempt_key !== principal.attempt_key || !event || event.actor !== "research-checkpoint-service"
      || event.payload_sha256 !== hash(checkpoint.receipt) || !same(JSON.parse(String(event.payload_json)), checkpoint.receipt)
      || commit?.phase !== "committed" || !same(JSON.parse(String(commit.plan_json)).response, checkpoint.receipt)) fail("FORMAL_SUBMISSION_CHECKPOINT_INVALID");
    let total = 0;
    const sources = value.files.map(file => {
      if (options.authorizeArtifact(principal.attempt_key, file.artifact) !== true) fail("FORMAL_SUBMISSION_ARTIFACT_DENIED");
      const bytes = cas(task, file.artifact); total += bytes.length;
      if (total > 64 * 1024 * 1024) fail("FORMAL_SUBMISSION_SOURCE_LIMIT");
      return { ...file, bytes };
    });
    for (const ref of value.requested_dependencies) {
      if (options.authorizeArtifact(principal.attempt_key, ref) !== true) fail("FORMAL_SUBMISSION_ARTIFACT_DENIED");
      total += cas(task, ref).length;
      if (total > 64 * 1024 * 1024) fail("FORMAL_SUBMISSION_SOURCE_LIMIT");
    }
    if (total > 64 * 1024 * 1024) fail("FORMAL_SUBMISSION_SOURCE_LIMIT");
    for (const segment of [value.campaign_id, value.obligation_id, value.candidate_id]) if (!/^[A-Za-z0-9_-]{1,160}$/.test(segment)) fail("FORMAL_SUBMISSION_PATH_INVALID");
    return { task, value, approved, bound, sources, reservation };
  }
  function readSubmissionReceipt(commandId: string): FormalCandidateSubmissionReceipt | undefined {
    owner(); id.parse(commandId);
    const operationId = operationFor(commandId), marker = store.get("SELECT * FROM commands WHERE command_id=?", operationId);
    if (!marker) return undefined;
    const row = store.get("SELECT phase,plan_json FROM trust_commits WHERE operation_id=?", operationId);
    const receipt = JSON.parse(String(marker.response_json)) as FormalCandidateSubmissionReceipt;
    if (!row || marker.principal_id !== "service:formal-submission" || !["prepared", "committed"].includes(String(marker.status))
      || receipt.schema_version !== "comath.formal_candidate_submission.v1" || receipt.command_id !== commandId || receipt.operation_id !== operationId
      || receipt.request_sha256 !== marker.request_sha256 || receipt.proof_authority !== "none" || !same(JSON.parse(String(row.plan_json)).response, receipt)
      || (row.phase === "committed") !== (marker.status === "committed")) fail("FORMAL_SUBMISSION_RECEIPT_INVALID");
    if (row.phase === "committed") {
      const task = store.getTask(receipt.task_id);
      if (!task || task.campaign_id !== receipt.campaign_id) fail("FORMAL_SUBMISSION_RECEIPT_INVALID");
      const submission = formalCandidateSubmissionSchema.parse(JSON.parse(cas(task, receipt.result_ref).toString("utf8")));
      if (submission.task_id !== receipt.task_id || submission.generation !== receipt.generation || submission.campaign_id !== receipt.campaign_id
        || submission.candidate_id !== receipt.candidate_id || submission.obligation_id !== receipt.obligation_id || submission.variant_id !== receipt.variant_id
        || !same(submission.scope, receipt.scope) || !same(submission.files, receipt.source_refs)) fail("FORMAL_SUBMISSION_RECEIPT_INVALID");
      const workspace = `.comath/campaign/${receipt.campaign_id}/ensembles/lemma_sprint/${receipt.obligation_id}/candidates/${receipt.candidate_id}/g${receipt.generation}`;
      if (receipt.workspace_path !== workspace || receipt.manifest_path !== `${workspace}/manifest.json`
        || receipt.candidate_run_path !== `${workspace}/candidate-run.json` || receipt.submission_path !== `${workspace}/submission.json`) fail("FORMAL_SUBMISSION_RECEIPT_INVALID");
      const targets = JSON.parse(String(row.plan_json)).targets as { relative_path: string; after_sha256: string }[];
      const installed = (path: string): Buffer => {
        const target = targets.find(value => value.relative_path === path);
        if (!target) fail("FORMAL_SUBMISSION_RECEIPT_INVALID");
        assertProjectReadable(runtime.root, path, receipt.campaign_id);
        try {
          const bytes = readFileSync(resolveProjectCommitPath(runtime.root, path));
          if (bytesHash(bytes) !== target.after_sha256) fail("FORMAL_SUBMISSION_INSTALLED_BYTES_CHANGED");
          return bytes;
        } catch (cause) { if (cause instanceof ComathError) throw cause; fail("FORMAL_SUBMISSION_INSTALLED_BYTES_CHANGED"); }
      };
      // Shared artifact indexes are appendable; verify the immutable candidate targets,
      // not the historical after-image of a subsequently extended global index.
      for (const target of targets.filter(value => value.relative_path.startsWith(workspace + "/"))) installed(target.relative_path);
      if (bytesHash(installed(receipt.submission_path)) !== receipt.result_ref.sha256) fail("FORMAL_SUBMISSION_RECEIPT_INVALID");
      candidateRunSchema.parse(JSON.parse(installed(receipt.candidate_run_path).toString("utf8")));
      candidateManifestSchema.parse(JSON.parse(installed(receipt.manifest_path).toString("utf8")));
      for (const source of receipt.source_refs) {
        cas(task, source.artifact);
        if (bytesHash(installed(`${workspace}/source/${source.relative_path}`)) !== source.artifact.sha256) fail("FORMAL_SUBMISSION_INSTALLED_BYTES_CHANGED");
      }
    }
    return { ...receipt, commit_state: row.phase === "committed" ? "committed" : "pending" };
  }
  async function ingestFormalCandidateSubmission(principal: WorkerPrincipal, raw: unknown): Promise<FormalCandidateSubmissionReceipt> {
    owner(); const input = formalCandidateWorkerRequestSchema.parse(raw), requestHash = hash({ principal, request: input });
    const operationId = operationFor(input.command_id), prior = readSubmissionReceipt(input.command_id);
    if (prior) {
      if (prior.request_sha256 !== requestHash) fail("FORMAL_SUBMISSION_COMMAND_CONFLICT");
      const task = store.getTask(principal.task_id), attempt = store.get("SELECT * FROM attempts WHERE attempt_key=?", principal.attempt_key);
      if (!task || task.generation !== principal.generation || task.campaign_id !== principal.campaign_id
        || attempt?.task_id !== principal.task_id || Number(attempt.generation) !== principal.generation) fail("FORMAL_SUBMISSION_ATTEMPT_REJECTED");
      return prior;
    }
    const initial = validate(principal, input), value = initial.value;
    const workspace = `.comath/campaign/${value.campaign_id}/ensembles/lemma_sprint/${value.obligation_id}/candidates/${value.candidate_id}/g${value.generation}`;
    const submissionPath = `${workspace}/submission.json`, manifestPath = `${workspace}/manifest.json`, runPath = `${workspace}/candidate-run.json`;
    const temporary = resolveProjectCommitPath(runtime.root, `.tmp/comath/formal-submissions/${randomUUID()}.json`);
    await mkdir(dirname(temporary), { recursive: true });
    await writeFile(temporary, canonicalJson(value), { encoding: "utf8", flag: "wx", flush: true });
    try {
      const prepared = await prepareArtifact({ projectRoot: runtime.root, project_id: store.getCampaign(value.campaign_id)!.project_id,
        source_path: temporary, kind: "other", actor: "service:formal-submission" });
      if (prepared.sha256 !== hash(value)) fail("FORMAL_SUBMISSION_ARTIFACT_INVALID");
      try {
        return withProjectCommit(runtime.root, { operation_id: operationId, campaign_id: value.campaign_id, request: { request_sha256: requestHash }, fault: options.commitFault }, () => {
          const checked = validate(principal, input);
          if (store.get("SELECT command_id FROM commands WHERE principal_id='service:formal-submission' AND json_extract(response_json,'$.task_id')=? AND json_extract(response_json,'$.generation')=?", value.task_id, value.generation)) fail("FORMAL_SUBMISSION_ALREADY_ACCEPTED");
          if (store.get("SELECT command_id FROM commands WHERE principal_id='service:formal-submission' AND json_extract(response_json,'$.candidate_id')=?", value.candidate_id)
            || [submissionPath, manifestPath, runPath, ...checked.sources.map(source => `${workspace}/source/${source.relative_path}`)].some(path => existsCommittedFile(runtime.root, path))) fail("FORMAL_SUBMISSION_CANDIDATE_CONFLICT");
          const artifact = commitArtifactReference(runtime.root, prepared), resultRef = artifactPointerSchema.parse({ artifact_id: artifact.id, sha256: artifact.sha256 });
          for (const source of checked.sources) writeCommittedFile(runtime.root, `${workspace}/source/${source.relative_path}`, source.bytes);
          const shared = { candidate_id: value.candidate_id, campaign_id: value.campaign_id, obligation_id: value.obligation_id, variant_id: value.variant_id,
            stage: "lemma_sprint" as const, workspace_path: workspace, locked_statement_hash: value.scope.statement_hash, state: "submitted" as const };
          const manifest = candidateManifestSchema.parse({ ...shared, statement_equivalence_claim: "unknown", dependencies: checked.approved.obligation_binding.dependencies,
            assumptions: checked.approved.assumptions, introduced_assumptions: value.introduced_assumptions,
            introduced_dependencies: value.requested_dependencies.map(ref => `${ref.artifact_id}:${ref.sha256}`),
            lean_files: value.files.map(file => `${workspace}/source/${file.relative_path}`),
            artifacts: value.files.map(file => ({ path: `${workspace}/source/${file.relative_path}`, kind: "lean_source", required_for: ["Lean"] })),
            summary: "Worker-submitted Lean source awaiting service verification; no proof authority." });
          const run = candidateRunSchema.parse({ ...shared, manifest_path: manifestPath });
          writeCommittedFile(runtime.root, submissionPath, canonicalJson(value));
          writeCommittedFile(runtime.root, manifestPath, canonicalJson(manifest)); writeCommittedFile(runtime.root, runPath, canonicalJson(run));
          const receipt: FormalCandidateSubmissionReceipt = { schema_version: "comath.formal_candidate_submission.v1", command_id: input.command_id,
            task_id: value.task_id, generation: value.generation, campaign_id: value.campaign_id, attempt_key: principal.attempt_key,
            candidate_id: value.candidate_id, obligation_id: value.obligation_id, variant_id: value.variant_id, scope: value.scope,
            scope_package_sha256: checked.bound.scope_package_sha256, stage_attempt: checked.reservation.stage_attempt, source_refs: value.files, workspace_path: workspace,
            candidate_run_path: runPath, manifest_path: manifestPath, submission_path: submissionPath, result_ref: resultRef,
            operation_id: operationId, request_sha256: requestHash, commit_state: "committed", proof_authority: "none" };
          store.run("INSERT INTO commands(command_id,principal_id,request_sha256,response_json,status) VALUES (?,'service:formal-submission',?,?,'prepared')", operationId, requestHash, canonicalJson(receipt));
          stageFormalSubmissionFinalized(runtime.root, operationId);
          return receipt;
        });
      } catch (cause) {
        const pending = readSubmissionReceipt(input.command_id);
        if (pending?.request_sha256 === requestHash && pending.commit_state === "pending") return pending;
        throw cause;
      }
    } finally { await unlink(temporary).catch(cause => { if ((cause as NodeJS.ErrnoException).code !== "ENOENT") throw cause; }); }
  }
  return { ingestFormalCandidateSubmission, readSubmissionReceipt };
}
