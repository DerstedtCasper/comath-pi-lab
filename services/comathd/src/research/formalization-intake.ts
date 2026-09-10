import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";
import { ComathError } from "../errors.js";
import { getClaim, registerReservedClaim, replacePreparedClaim } from "../claim/claim-store.js";
import { listArtifactRefs } from "../artifacts/store.js";
import { getCampaign, writeCampaign } from "../proof-kernel/campaign/research-campaign.js";
import { createProofObligationFromFormalSpecLock } from "../proof-kernel/campaign/formal-spec-lock.js";
import { writeProofPlanningArtifacts } from "../proof-kernel/stages/proof-obligation-dag.js";
import { assumptionLedgerSchema, formalSpecLockSchema, claimSchema, type Claim, type FormalSpecLock, type AssumptionLedger } from "../types/schemas.js";
import { normalizeStatement, statementHash } from "../utils/statement.js";
import { canonicalJson } from "../verification/runner-contracts.js";
import { getAcquiredProjectRuntime, type ProjectRuntime } from "./project-runtime.js";
import { prepareArtifact, commitArtifactReference } from "./research-artifacts.js";
import { assertProjectReadable, readCommittedFile, writeCommittedFile, resolveProjectCommitPath, withProjectCommit, stageResearchMutation, type ProjectCommitOperation } from "./project-commit.js";
import { artifactPointerSchema, type ArtifactPointer, type ScopeBinding } from "./research-schemas.js";
import { researchSubmissionResultSchema, type ResearchResultService } from "./research-result-service.js";
import type { ResearchEvent } from "./research-store.js";
import { notifyResearchEventsCommitted } from "./event-store.js";
import { readFileSync, statSync } from "node:fs";

const id = z.string().min(1).max(160), sha = z.string().regex(/^[a-f0-9]{64}$/), revision = z.number().int().nonnegative();
const refs = z.array(artifactPointerSchema).min(1).max(100);
const draftSchema = z.strictObject({ client_local_id: id, statement_nl: z.string().min(1).max(8192),
  formal_spec_lock: formalSpecLockSchema, assumption_ledger: assumptionLedgerSchema,
  parent_local_id: id.optional(), depends_on_local_ids: z.array(id).max(100), source_result_refs: refs });
export const formalizationPrepareSchema = z.strictObject({ command_id: id, campaign_id: id, expected_revision: revision,
  root_local_id: id, result_refs: refs, root_and_lemma_drafts: z.array(draftSchema).min(1).max(100) });
export type FormalizationPrepareInput = z.infer<typeof formalizationPrepareSchema>;
export type IntakePrincipal = { kind: "operator" | "host"; id: string };
export type PreparedFormalClaim = { client_local_id: string; claim: Claim; obligation_id: string; parent_obligation_id?: string; dependencies: string[];
  formal_spec_lock: FormalSpecLock; assumption_ledger: AssumptionLedger; formal_spec_ref: ArtifactPointer; ledger_ref: ArtifactPointer; source_result_refs: ArtifactPointer[] };
export type PreparedFormalization = { schema_version: "comath.formalization_prepared.v1"; intake_id: string; campaign_id: string; project_id: string;
  expected_campaign_revision: number; charter_sha256: string; created_at: string; root_local_id: string; root_claim_before: Claim;
  claims: PreparedFormalClaim[]; source_result_refs: ArtifactPointer[]; proof_authority: "none"; approval_state: "not_approved" };
export type PreparedIntakeReceipt = { kind: "formal_intake_prepared"; intake_id: string; prepared_sha256: string; prepared_path: string; prepared: PreparedFormalization; proof_authority: "none" };
export type ApprovedFormalPackage = { claim_id: string; obligation_id: string; scope: Extract<ScopeBinding, { kind: "formal" }>; scope_package_sha256: string;
  formal_spec_ref: ArtifactPointer; ledger_ref: ArtifactPointer; formal_spec_path: string; ledger_path: string; approval_path: string };
export type FormalApprovalReceipt = { kind: "formal_intake_approved"; approval_id: string; operation_id: string; command_id: string; intake_id: string;
  campaign_id: string; prepared_sha256: string; expected_campaign_revision: number; approved_by: string; approved_at: string;
  request_id: string; ticket_hash: string; scope_hashes: string[]; packages: ApprovedFormalPackage[]; proof_authority: "none" };
export type FormalizationIntakeOptions = { results: ResearchResultService;
  authorizeArtifact: (principal: IntakePrincipal, ref: ArtifactPointer, campaignId: string) => boolean;
  verifyValidatedCandidate?: (candidateId: string) => boolean;
  installFault?: (stage: "after_claim" | "after_planning", id: string) => void;
  fault?: ProjectCommitOperation["fault"] };
const digest = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex"), hash = (value: unknown) => digest(canonicalJson(value));
const same = (a: unknown, b: unknown) => canonicalJson(a) === canonicalJson(b);
const refKey = (ref: ArtifactPointer) => `${ref.artifact_id}:${ref.sha256}`;
function fail(code: string): never { throw new ComathError(code, { code, statusCode: 409 }); }
function eventFromRow(row: Record<string, unknown>): ResearchEvent {
  return { seq: Number(row.seq), campaign_id: String(row.campaign_id), task_id: String(row.task_id), generation: Number(row.generation),
    type: String(row.type), actor: String(row.actor), payload: JSON.parse(String(row.payload_json)), payload_sha256: String(row.payload_sha256), created_at: String(row.created_at) };
}
function graphs(drafts: FormalizationPrepareInput["root_and_lemma_drafts"]): void {
  const byId = new Map(drafts.map(draft => [draft.client_local_id, draft]));
  if (byId.size !== drafts.length) fail("INTAKE_DUPLICATE_LOCAL_ID");
  for (const mode of ["dependency", "parent"] as const) {
    const done = new Set<string>(), visiting = new Set<string>();
    const visit = (key: string) => {
      if (done.has(key)) return; if (visiting.has(key)) fail("INTAKE_GRAPH_CYCLE");
      const draft = byId.get(key); if (!draft) fail("INTAKE_UNKNOWN_LOCAL_ID"); visiting.add(key);
      const edges = mode === "parent" ? draft.parent_local_id ? [draft.parent_local_id] : [] : draft.depends_on_local_ids;
      if (new Set(edges).size !== edges.length) fail("INTAKE_DUPLICATE_EDGE");
      for (const edge of edges) visit(edge);
      visiting.delete(key); done.add(key);
    };
    for (const key of byId.keys()) visit(key);
  }
}
function checkDraft(lock: FormalSpecLock, ledger: AssumptionLedger, statement: string): void {
  if (statement !== normalizeStatement(statement) || statement !== lock.normalized_nl_statement
    || lock.statement_hash !== statementHash(statement) || lock.original_goal_sha256 !== digest(lock.original_goal_text)
    || ledger.formal_spec_lock_hash !== lock.statement_hash) fail("INTAKE_STATEMENT_BINDING_INVALID");
  const tuple = (entry: { name?: string; type: string; source: string; evidence_anchor: string; approved: boolean }) =>
    canonicalJson({ name: entry.name ?? null, type: entry.type, source: entry.source, evidence_anchor: entry.evidence_anchor, approved: entry.approved });
  for (const [kind, expected] of [["variable", lock.variables], ["assumption", lock.assumptions]] as const) {
    const actual = ledger.entries.filter(entry => entry.kind === kind);
    if (!same(actual.map(tuple).sort(), expected.map(tuple).sort())) fail("INTAKE_LEDGER_INCOMPLETE");
  }
  if (new Set(ledger.entries.map(entry => entry.id)).size !== ledger.entries.length) fail("INTAKE_LEDGER_DUPLICATE_ID");
}

/** Draft preparation is deliberately separate from host approval and proof correctness. */
export function createFormalizationIntake(runtime: ProjectRuntime, options: FormalizationIntakeOptions) {
  const store = runtime.store;
  function owner() { if (getAcquiredProjectRuntime(runtime.root) !== runtime || runtime.referenceCount < 1) fail("RESEARCH_OWNER_REQUIRED"); }
  function principal(value: IntakePrincipal) { if (!["operator", "host"].includes(value.kind) || !id.safeParse(value.id).success) fail("INTAKE_PRINCIPAL_DENIED"); owner(); }
  function cas(ref: ArtifactPointer, projectId: string): Buffer {
    const record = listArtifactRefs(runtime.root).find(value => value.id === ref.artifact_id && value.sha256 === ref.sha256 && value.project_id === projectId);
    const path = `.comath/artifacts/sha256/${ref.sha256.slice(0, 2)}/${ref.sha256}`;
    if (!record || record.path.replace(/\\/g, "/") !== path) fail("INTAKE_ARTIFACT_INVALID");
    const absolute = resolveProjectCommitPath(runtime.root, path), info = statSync(absolute);
    if (!info.isFile() || info.size > 16 * 1024 * 1024 || info.size !== record.size_bytes) fail("INTAKE_ARTIFACT_INVALID");
    const bytes = readFileSync(absolute); if (digest(bytes) !== ref.sha256) fail("INTAKE_ARTIFACT_INVALID"); return bytes;
  }
  function sources(actor: IntakePrincipal, input: FormalizationPrepareInput): Map<string, string[]> {
    const campaign = store.getCampaign(input.campaign_id); if (!campaign) fail("INTAKE_CAMPAIGN_NOT_FOUND");
    const statements = new Map<string, string[]>(); let bytes = 0;
    for (const ref of input.result_refs) {
      if (!options.authorizeArtifact(actor, ref, input.campaign_id)) fail("INTAKE_SOURCE_DENIED");
      const row = store.get("SELECT * FROM events WHERE campaign_id=? AND type IN ('ResearchResultAccepted','ResearchCandidatePublished') AND json_extract(payload_json,'$.result_ref.artifact_id')=? AND json_extract(payload_json,'$.result_ref.sha256')=? ORDER BY seq DESC LIMIT 1", input.campaign_id, ref.artifact_id, ref.sha256);
      if (!row) fail("INTAKE_SOURCE_NOT_ACCEPTED");
      const event = eventFromRow(row), task = store.getTask(String(row.task_id));
      if (!task || !(event.type === "ResearchCandidatePublished" ? options.results.verifyPublishedCandidate(event, task, ref) : options.results.verifyAcceptedResult(event, task, ref))) fail("INTAKE_SOURCE_NOT_ACCEPTED");
      if (event.type === "ResearchCandidatePublished" && options.verifyValidatedCandidate?.(String((event.payload as Record<string, unknown>).candidate_id)) !== true) fail("INTAKE_CANDIDATE_NOT_VALIDATED");
      const payload = cas(ref, campaign.project_id); bytes += payload.length; if (bytes > 16 * 1024 * 1024) fail("INTAKE_SOURCE_TOO_LARGE");
      const parsed = JSON.parse(payload.toString("utf8"));
      statements.set(refKey(ref), researchSubmissionResultSchema.parse(parsed).claims.map(claim => claim.statement));
    }
    return statements;
  }
  function readIntake(intakeId: string): PreparedIntakeReceipt {
    owner(); id.parse(intakeId);
    const row = store.get("SELECT phase,plan_json FROM trust_commits WHERE json_extract(plan_json,'$.response.kind')='formal_intake_prepared' AND json_extract(plan_json,'$.response.intake_id')=?", intakeId);
    if (!row || row.phase !== "committed") fail("INTAKE_NOT_COMMITTED");
    const receipt = JSON.parse(String(row.plan_json)).response as PreparedIntakeReceipt;
    assertProjectReadable(runtime.root, undefined, receipt.prepared.campaign_id);
    const bytes = readCommittedFile(runtime.root, receipt.prepared_path);
    if (hash(receipt.prepared) !== receipt.prepared_sha256 || digest(bytes) !== receipt.prepared_sha256 || bytes !== canonicalJson(receipt.prepared)) fail("INTAKE_PREPARED_CORRUPT");
    for (const entry of receipt.prepared.claims) {
      if (cas(entry.formal_spec_ref, receipt.prepared.project_id).toString("utf8") !== canonicalJson(entry.formal_spec_lock)
        || cas(entry.ledger_ref, receipt.prepared.project_id).toString("utf8") !== canonicalJson(entry.assumption_ledger)) fail("INTAKE_PREPARED_CORRUPT");
    }
    return receipt;
  }
  async function prepare(actor: IntakePrincipal, raw: FormalizationPrepareInput): Promise<PreparedIntakeReceipt> {
    principal(actor); const input = formalizationPrepareSchema.parse(raw);
    if (Buffer.byteLength(canonicalJson(input)) > 1024 * 1024) fail("INTAKE_INPUT_TOO_LARGE");
    const operationId = `intake-prepare:${hash(input.command_id)}`, operation = { operation_id: operationId, campaign_id: input.campaign_id, request: { actor, input }, fault: options.fault };
    const existing = store.get("SELECT operation_id FROM trust_commits WHERE operation_id=?", operationId);
    if (existing) { const original = withProjectCommit<PreparedIntakeReceipt>(runtime.root, operation, () => fail("INTAKE_PREPARED_CORRUPT")); return readIntake(original.intake_id); }
    const campaign = store.getCampaign(input.campaign_id), formal = getCampaign(runtime.root, input.campaign_id);
    if (!campaign || !formal || formal.project_id !== campaign.project_id || ["completed", "cancelled"].includes(campaign.state) || formal.status === "terminal") fail("INTAKE_CAMPAIGN_NOT_FOUND");
    if (campaign.revision !== input.expected_revision) fail("INTAKE_REVISION_CONFLICT");
    const root = getClaim(runtime.root, campaign.project_id, formal.root_claim_id); if (!root) fail("INTAKE_ROOT_CLAIM_MISSING");
    graphs(input.root_and_lemma_drafts);
    const rootDraft = input.root_and_lemma_drafts.find(draft => draft.client_local_id === input.root_local_id);
    if (!rootDraft || rootDraft.parent_local_id || rootDraft.formal_spec_lock.original_goal_text !== campaign.charter.goal) fail("INTAKE_ROOT_DRAFT_REQUIRED");
    const statements = sources(actor, input), allowed = new Set(input.result_refs.map(refKey));
    for (const draft of input.root_and_lemma_drafts) {
      checkDraft(draft.formal_spec_lock, draft.assumption_ledger, draft.statement_nl);
      if (!draft.source_result_refs.some(ref => statements.get(refKey(ref))?.includes(draft.statement_nl))
        || draft.source_result_refs.some(ref => !allowed.has(refKey(ref)))) fail("INTAKE_DRAFT_SOURCE_MISMATCH");
    }
    const reservationKey = `${operationId}:ids`, requestHash = hash({ actor, input });
    const reserved = store.transaction(() => {
      const old = store.get("SELECT * FROM commands WHERE command_id=?", reservationKey);
      if (old) { if (old.request_sha256 !== requestHash) fail("INTAKE_COMMAND_CONFLICT"); return JSON.parse(String(old.response_json)) as { intake_id: string; created_at: string; claims: { local: string; claim_id: string; obligation_id: string }[] }; }
      const occupied = new Set(formal.open_obligations.map(value => value.obligation_id));
      const obligationId = () => { let next: string; do { next = store.allocateId("PO"); } while (occupied.has(next)); occupied.add(next); return next; };
      const value = { intake_id: store.allocateId("INTAKE"), created_at: new Date(runtime.clock.now()).toISOString(), claims: input.root_and_lemma_drafts.map(draft => ({ local: draft.client_local_id,
        claim_id: draft.client_local_id === input.root_local_id ? root.id : store.allocateId("C"), obligation_id: obligationId() })) };
      store.run("INSERT INTO commands(command_id,principal_id,request_sha256,response_json,status) VALUES (?,?,?,?,'committed')", reservationKey, `service:formal-intake:${actor.id}`, requestHash, canonicalJson(value)); return value;
    });
    const components: { draft: typeof input.root_and_lemma_drafts[number]; claim: Claim; lock: FormalSpecLock; ledger: AssumptionLedger; lockArtifact: Awaited<ReturnType<typeof prepareArtifact>>; ledgerArtifact: Awaited<ReturnType<typeof prepareArtifact>> }[] = [];
    const temporary: string[] = [];
    async function artifact(value: unknown) {
      const path = resolveProjectCommitPath(runtime.root, `.tmp/comath/intakes/${randomUUID()}.json`); temporary.push(path);
      await mkdir(dirname(path), { recursive: true }); await writeFile(path, canonicalJson(value), { flag: "wx", flush: true });
      return prepareArtifact({ projectRoot: runtime.root, project_id: campaign!.project_id, source_path: path, kind: "other", actor: "service:formal-intake" });
    }
    try {
      for (const draft of input.root_and_lemma_drafts) {
        const claimId = reserved.claims.find(value => value.local === draft.client_local_id)!.claim_id;
        const lock = formalSpecLockSchema.parse({ ...draft.formal_spec_lock, claim_id: claimId, locked_by: "service:formal-intake", locked_at: reserved.created_at, user_approval_required: true });
        const ledger = assumptionLedgerSchema.parse({ ...draft.assumption_ledger, claim_id: claimId, created_at: reserved.created_at, updated_at: reserved.created_at });
        const claim = claimSchema.parse({ id: claimId, project_id: campaign.project_id, statement: draft.statement_nl, statement_hash: lock.statement_hash,
          status: "formal_spec_locked", evidence_level: 0, assumptions: lock.assumptions.map(value => value.type), domain: root.domain,
          created_at: claimId === root.id ? root.created_at : reserved.created_at, updated_at: reserved.created_at });
        components.push({ draft, claim, lock, ledger, lockArtifact: await artifact(lock), ledgerArtifact: await artifact(ledger) });
      }
      return withProjectCommit(runtime.root, operation, () => {
        if (store.getCampaign(input.campaign_id)?.revision !== input.expected_revision || !same(getClaim(runtime.root, campaign.project_id, root.id), root)) fail("INTAKE_REVISION_CONFLICT");
        sources(actor, input);
        const claims: PreparedFormalClaim[] = components.map(component => {
          const ref = (prepared: typeof component.lockArtifact) => { const record = commitArtifactReference(runtime.root, prepared); return { artifact_id: record.id, sha256: record.sha256 }; };
          return { client_local_id: component.draft.client_local_id, claim: component.claim, obligation_id: reserved.claims.find(value => value.local === component.draft.client_local_id)!.obligation_id,
            ...(component.draft.parent_local_id ? { parent_obligation_id: reserved.claims.find(value => value.local === component.draft.parent_local_id)!.obligation_id } : {}),
            dependencies: component.draft.depends_on_local_ids.map(key => reserved.claims.find(value => value.local === key)!.obligation_id),
            formal_spec_lock: component.lock, assumption_ledger: component.ledger, formal_spec_ref: ref(component.lockArtifact), ledger_ref: ref(component.ledgerArtifact), source_result_refs: component.draft.source_result_refs };
        });
        const prepared: PreparedFormalization = { schema_version: "comath.formalization_prepared.v1", intake_id: reserved.intake_id, campaign_id: campaign.campaign_id,
          project_id: campaign.project_id, expected_campaign_revision: input.expected_revision, charter_sha256: campaign.charter.sha256,
          created_at: reserved.created_at, root_local_id: input.root_local_id, root_claim_before: root, claims, source_result_refs: input.result_refs, proof_authority: "none", approval_state: "not_approved" };
        const path = `.comath/campaign/${campaign.campaign_id}/intakes/${reserved.intake_id}/prepared.json`;
        writeCommittedFile(runtime.root, path, canonicalJson(prepared));
        return { kind: "formal_intake_prepared", intake_id: reserved.intake_id, prepared_sha256: hash(prepared), prepared_path: path, prepared, proof_authority: "none" };
      });
    } finally { for (const path of temporary) await unlink(path).catch(error => { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }); }
  }
  const approvalInput = z.strictObject({ command_id: id, intake_id: id, expected_revision: revision, prepared_sha256: sha });
  function currentPrepared(intakeId: string, expectedRevision: number, expectedSha: string): PreparedIntakeReceipt {
    const receipt = readIntake(intakeId), campaign = store.getCampaign(receipt.prepared.campaign_id);
    if (!campaign || ["completed", "cancelled", "pausing"].includes(campaign.state) || campaign.revision !== expectedRevision
      || expectedRevision !== receipt.prepared.expected_campaign_revision || receipt.prepared_sha256 !== expectedSha) fail("INTAKE_REVISION_CONFLICT");
    if (!same(getClaim(runtime.root, receipt.prepared.project_id, receipt.prepared.root_claim_before.id), receipt.prepared.root_claim_before)) fail("INTAKE_ROOT_CHANGED");
    const active = store.get("SELECT task_id FROM tasks WHERE campaign_id=? AND status IN ('running','leased','cancelling') LIMIT 1", campaign.campaign_id);
    if (active) fail("INTAKE_ACTIVE_SCOPE_REQUIRES_PAUSE");
    return receipt;
  }
  function requestApproval(actor: IntakePrincipal, raw: z.infer<typeof approvalInput>) {
    principal(actor); const input = approvalInput.parse(raw), commandId = `intake-request:${hash(input.command_id)}`, requestHash = hash({ actor, input });
    return store.transaction(() => {
      const prior = store.get("SELECT * FROM commands WHERE command_id=?", commandId);
      if (prior) { if (prior.request_sha256 !== requestHash) fail("INTAKE_COMMAND_CONFLICT"); return JSON.parse(String(prior.response_json)); }
      currentPrepared(input.intake_id, input.expected_revision, input.prepared_sha256);
      const requestId = store.allocateId("APREQ"), response = { request_id: requestId, intake_id: input.intake_id, prepared_sha256: input.prepared_sha256,
        expected_revision: input.expected_revision, state: "awaiting_approval", proof_authority: "none" };
      store.run("INSERT INTO approval_requests(request_id,intake_id,prepared_sha256,campaign_revision,state,requested_by) VALUES (?,?,?,?,'awaiting_approval',?)", requestId, input.intake_id, input.prepared_sha256, input.expected_revision, actor.id);
      store.run("INSERT INTO commands(command_id,principal_id,request_sha256,response_json,status) VALUES (?,?,?,?,'committed')", commandId, `${actor.kind}:${actor.id}`, requestHash, canonicalJson(response)); return response;
    });
  }
  function issueTicket(actor: IntakePrincipal, raw: { command_id: string; request_id: string; intake_id: string; displayed_prepared_sha256: string; expected_revision: number; decision: "approve" }) {
    principal(actor); if (actor.kind !== "host") fail("INTAKE_HOST_REQUIRED");
    const input = z.strictObject({ command_id: id, request_id: id, intake_id: id, displayed_prepared_sha256: sha, expected_revision: revision, decision: z.literal("approve") }).parse(raw);
    const commandId = `intake-ticket:${hash(input.command_id)}`, requestHash = hash({ actor, input });
    return store.transaction(() => {
      const prior = store.get("SELECT * FROM commands WHERE command_id=?", commandId);
      if (prior) { if (prior.request_sha256 !== requestHash) fail("INTAKE_COMMAND_CONFLICT"); fail("TICKET_REISSUE_REQUIRED"); }
      currentPrepared(input.intake_id, input.expected_revision, input.displayed_prepared_sha256);
      const request = store.get("SELECT * FROM approval_requests WHERE request_id=?", input.request_id);
      if (!request || request.intake_id !== input.intake_id || request.prepared_sha256 !== input.displayed_prepared_sha256
        || Number(request.campaign_revision) !== input.expected_revision || request.state !== "awaiting_approval") fail("INTAKE_APPROVAL_REQUEST_INVALID");
      const ticket = randomBytes(32).toString("base64url"), ticketHash = digest(ticket), expiresAt = new Date(runtime.clock.now() + 10 * 60_000).toISOString();
      store.run("UPDATE approval_tickets SET consumed_by_command_id=? WHERE request_id=? AND host_principal=? AND consumed_by_command_id IS NULL", `revoked:${input.command_id}`, input.request_id, actor.id);
      store.run("INSERT INTO approval_tickets(ticket_hash,request_id,host_principal,expires_at) VALUES (?,?,?,?)", ticketHash, input.request_id, actor.id, expiresAt);
      const publicReceipt = { request_id: input.request_id, ticket_hash: ticketHash, expires_at: expiresAt, state: "issued" };
      store.run("INSERT INTO commands(command_id,principal_id,request_sha256,response_json,status) VALUES (?,?,?,?,'committed')", commandId, `host:${actor.id}`, requestHash, canonicalJson(publicReceipt));
      return { ...publicReceipt, ticket };
    });
  }
  function approve(actor: IntakePrincipal, raw: { command_id: string; intake_id: string; ticket: string }): FormalApprovalReceipt {
    principal(actor); if (actor.kind !== "host") fail("INTAKE_HOST_REQUIRED");
    const input = z.strictObject({ command_id: id, intake_id: id, ticket: z.string().min(1).max(256) }).parse(raw), ticketHash = digest(input.ticket);
    const preparedReceipt = readIntake(input.intake_id), prepared = preparedReceipt.prepared;
    const operationId = `intake-approve:${hash(input.command_id)}`, operation: ProjectCommitOperation = { operation_id: operationId, campaign_id: prepared.campaign_id,
      expected_revision: prepared.expected_campaign_revision, request: { actor, command_id: input.command_id, intake_id: input.intake_id, ticket_hash: ticketHash }, fault: options.fault };
    // The original non-sensitive receipt is checked before consumed-ticket/current-revision checks.
    if (store.get("SELECT operation_id FROM trust_commits WHERE operation_id=?", operationId)) return withProjectCommit(runtime.root, operation, () => fail("INTAKE_APPROVAL_CORRUPT"));
    const approved = withProjectCommit(runtime.root, operation, () => {
      currentPrepared(input.intake_id, prepared.expected_campaign_revision, preparedReceipt.prepared_sha256);
      const ticket = store.get("SELECT t.*,r.intake_id,r.prepared_sha256,r.campaign_revision,r.state AS request_state FROM approval_tickets t JOIN approval_requests r ON r.request_id=t.request_id WHERE t.ticket_hash=?", ticketHash);
      if (!ticket || ticket.host_principal !== actor.id || ticket.intake_id !== input.intake_id || ticket.consumed_by_command_id
        || ticket.prepared_sha256 !== preparedReceipt.prepared_sha256 || Number(ticket.campaign_revision) !== prepared.expected_campaign_revision || ticket.request_state !== "awaiting_approval"
        || !Number.isFinite(Date.parse(String(ticket.expires_at))) || Date.parse(String(ticket.expires_at)) <= runtime.clock.now()
        || runtime.clock.now() < Date.parse(String(ticket.expires_at)) - 600_000) fail("INTAKE_TICKET_REJECTED");
      const approvalId = `APPROVAL-${hash({ intake_id: input.intake_id, command_id: input.command_id })}`, stamp = new Date(runtime.clock.now()).toISOString();
      const packages = prepared.claims.map(entry => {
        const packageHash = hash({ formal_spec_sha256: entry.formal_spec_ref.sha256, ledger_sha256: entry.ledger_ref.sha256, statement_hash: entry.formal_spec_lock.statement_hash,
          intake_id: input.intake_id, prepared_sha256: preparedReceipt.prepared_sha256 });
        const base = `.comath/campaign/${prepared.campaign_id}/locks/${entry.claim.id}/${packageHash}`;
        return { claim_id: entry.claim.id, obligation_id: entry.obligation_id, scope: { kind: "formal" as const, claim_id: entry.claim.id,
          statement_hash: entry.formal_spec_lock.statement_hash, formal_spec_sha256: entry.formal_spec_ref.sha256, ledger_sha256: entry.ledger_ref.sha256, approval_id: approvalId },
          scope_package_sha256: packageHash, formal_spec_ref: entry.formal_spec_ref, ledger_ref: entry.ledger_ref,
          formal_spec_path: `${base}/formal-spec.json`, ledger_path: `${base}/assumption-ledger.json`, approval_path: `${base}/approval.json` };
      });
      const receipt: FormalApprovalReceipt = { kind: "formal_intake_approved", approval_id: approvalId, operation_id: operationId, command_id: input.command_id, intake_id: input.intake_id,
        campaign_id: prepared.campaign_id, prepared_sha256: preparedReceipt.prepared_sha256, expected_campaign_revision: prepared.expected_campaign_revision,
        approved_by: actor.id, approved_at: stamp, request_id: String(ticket.request_id), ticket_hash: ticketHash, scope_hashes: packages.map(item => hash(item.scope)), packages, proof_authority: "none" };
      for (const [index, entry] of prepared.claims.entries()) {
        const target = packages[index]!;
        writeCommittedFile(runtime.root, target.formal_spec_path, cas(entry.formal_spec_ref, prepared.project_id));
        writeCommittedFile(runtime.root, target.ledger_path, cas(entry.ledger_ref, prepared.project_id));
        writeCommittedFile(runtime.root, target.approval_path, canonicalJson(receipt));
        if (entry.claim.id === prepared.root_claim_before.id) replacePreparedClaim(runtime.root, { expected: prepared.root_claim_before, claim: entry.claim, actor: "service:formal-intake" });
        else registerReservedClaim(runtime.root, { claim: entry.claim, actor: "service:formal-intake" });
        options.installFault?.("after_claim", entry.claim.id);
      }
      const campaign = getCampaign(runtime.root, prepared.campaign_id); if (!campaign) fail("INTAKE_CAMPAIGN_NOT_FOUND");
      const obligations = prepared.claims.map((entry, index) => {
        const obligation = createProofObligationFromFormalSpecLock({ obligation_id: entry.obligation_id, formal_spec_lock: entry.formal_spec_lock, assumption_ledger: entry.assumption_ledger });
        return { ...obligation, locked_statement_structured: { ...obligation.locked_statement_structured, approved_scope: packages[index]!.scope },
          dependencies: entry.dependencies, ...(entry.parent_obligation_id ? { parent_obligation_id: entry.parent_obligation_id } : {}) };
      });
      const root = obligations.find(value => value.claim_id === campaign.root_claim_id)!;
      const blockers = campaign.blockers.filter(blocker => blocker.code !== "NEEDS_FORMAL_SPEC_LOCK" && blocker.reason !== "needs_formal_spec_lock");
      const next = { ...campaign, open_obligations: [...campaign.open_obligations, ...obligations], active_obligation_id: (obligations.find(value => !value.dependencies.length) ?? root).obligation_id,
        blockers, current_stage: "planning" as const, status: campaign.status === "paused" ? "paused" as const : blockers.length ? "blocked" as const : "running" as const };
      const planning = writeProofPlanningArtifacts({ projectRoot: runtime.root, campaign: next, obligation: root, intake_sha256: preparedReceipt.prepared_sha256 });
      options.installFault?.("after_planning", prepared.intake_id);
      writeCampaign(runtime.root, { ...next, stage_runs: [...next.stage_runs, { id: store.allocateId("SRUN"), stage: "planning", status: "completed",
        artifact_paths: [planning.lemma_dag_path, planning.line_map_path, ...planning.obligation_yaml_paths, planning.skeleton_lean_path, planning.skeleton_report_path], created_at: stamp }] }, "service:formal-intake");
      store.run("UPDATE approval_tickets SET consumed_by_command_id=? WHERE ticket_hash=? AND consumed_by_command_id IS NULL", input.command_id, ticketHash);
      stageResearchMutation(runtime.root, "UPDATE approval_requests SET state='approved',host_decision_ref=? WHERE request_id=?", [operationId, String(ticket.request_id)]);
      const control = store.getCampaign(prepared.campaign_id)!;
      stageResearchMutation(runtime.root, "UPDATE campaigns SET revision=?,control_json=? WHERE campaign_id=? AND revision=?", [control.revision + 1,
        canonicalJson({ ...control, revision: control.revision + 1, supervisor: { ...control.supervisor, dirty: true } }), control.campaign_id, control.revision]);
      stageResearchMutation(runtime.root, "INSERT INTO events(campaign_id,type,actor,payload_json,payload_sha256,created_at) VALUES (?,'FormalScopeApproved','service:formal-intake',?,?,?)",
        [control.campaign_id, canonicalJson(receipt), hash(receipt), stamp]);
      return receipt;
    });
    notifyResearchEventsCommitted(runtime);
    return approved;
  }
  return { prepare, readIntake, requestApproval, issueTicket, approve };
}
