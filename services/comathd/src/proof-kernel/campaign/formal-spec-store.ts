import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { ComathError } from "../../errors.js";
import { listArtifactRefs } from "../../artifacts/store.js";
import { getClaim } from "../../claim/claim-store.js";
import { formalSpecLockSchema, assumptionLedgerSchema } from "../../types/schemas.js";
import { canonicalJson } from "../../verification/runner-contracts.js";
import { getAcquiredProjectRuntime, type ProjectRuntime } from "../../research/project-runtime.js";
import { assertProjectReadable, readCommittedFile, resolveProjectCommitPath } from "../../research/project-commit.js";
import { scopeBindingSchema, type ScopeBinding, type ArtifactPointer } from "../../research/research-schemas.js";
import type { FormalApprovalReceipt, PreparedIntakeReceipt } from "../../research/formalization-intake.js";

const digest = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex"), hash = (value: unknown) => digest(canonicalJson(value));
const same = (a: unknown, b: unknown) => canonicalJson(a) === canonicalJson(b);
function fail(): never { throw new ComathError("Formal scope has no complete current service-owned host approval", { code: "FORMAL_SCOPE_NOT_APPROVED", statusCode: 409 }); }

/** Reads exact prepared and committed bytes. Matching filenames or approved=true is never approval. */
export function requireApprovedFormalScope(runtime: ProjectRuntime, campaignId: string, rawScope: ScopeBinding) {
  if (getAcquiredProjectRuntime(runtime.root) !== runtime || runtime.referenceCount < 1) fail();
  assertProjectReadable(runtime.root, undefined, campaignId);
  const scope = scopeBindingSchema.parse(rawScope); if (scope.kind !== "formal") fail();
  const campaign = runtime.store.getCampaign(campaignId); if (!campaign) fail();
  const commit = runtime.store.get("SELECT * FROM trust_commits WHERE phase='committed' AND campaign_id=? AND json_extract(plan_json,'$.response.kind')='formal_intake_approved' AND json_extract(plan_json,'$.response.approval_id')=?", campaignId, scope.approval_id);
  if (!commit) fail();
  const plan = JSON.parse(String(commit.plan_json)), receipt = plan.response as FormalApprovalReceipt;
  const request = runtime.store.get("SELECT * FROM approval_requests WHERE request_id=?", receipt.request_id);
  const ticket = runtime.store.get("SELECT * FROM approval_tickets WHERE ticket_hash=?", receipt.ticket_hash);
  const at = Date.parse(receipt.approved_at);
  if (receipt.kind !== "formal_intake_approved" || receipt.operation_id !== commit.operation_id || receipt.campaign_id !== campaignId || receipt.proof_authority !== "none"
    || !request || request.state !== "approved" || request.host_decision_ref !== receipt.operation_id || request.intake_id !== receipt.intake_id
    || request.prepared_sha256 !== receipt.prepared_sha256 || Number(request.campaign_revision) !== receipt.expected_campaign_revision
    || !ticket || ticket.request_id !== receipt.request_id || ticket.host_principal !== receipt.approved_by || ticket.consumed_by_command_id !== receipt.command_id
    || !Number.isFinite(at) || !(at < Date.parse(String(ticket.expires_at))) || at < Date.parse(String(ticket.expires_at)) - 600_000) fail();
  const expectedRequest = { campaign_id: campaignId, expected_revision: receipt.expected_campaign_revision,
    request: { actor: { kind: "host", id: receipt.approved_by }, command_id: receipt.command_id, intake_id: receipt.intake_id, ticket_hash: receipt.ticket_hash } };
  if (plan.request_sha256 !== digest(canonicalJson(expectedRequest).trimEnd())) fail();
  const found = receipt.packages.find(entry => entry.claim_id === scope.claim_id);
  if (!found || !same(found.scope, scope) || receipt.scope_hashes.length !== receipt.packages.length
    || receipt.packages.some((entry, index) => hash(entry.scope) !== receipt.scope_hashes[index])) fail();
  // A newer approved package for this claim supersedes execution under an older scope.
  const newer = runtime.store.get("SELECT c.operation_id FROM trust_commits c, json_each(c.plan_json,'$.response.packages') p WHERE c.campaign_id=? AND c.phase='committed' AND json_extract(c.plan_json,'$.response.kind')='formal_intake_approved' AND json_extract(p.value,'$.claim_id')=? AND CAST(json_extract(c.plan_json,'$.response.expected_campaign_revision') AS INTEGER)>? LIMIT 1", campaignId, scope.claim_id, receipt.expected_campaign_revision);
  const currentClaim = getClaim(runtime.root, campaign.project_id, scope.claim_id);
  if (newer || !currentClaim || currentClaim.statement_hash !== scope.statement_hash) fail();
  const packageHash = hash({ formal_spec_sha256: scope.formal_spec_sha256, ledger_sha256: scope.ledger_sha256, statement_hash: scope.statement_hash,
    intake_id: receipt.intake_id, prepared_sha256: receipt.prepared_sha256 });
  const base = `.comath/campaign/${campaignId}/locks/${scope.claim_id}/${packageHash}`;
  if (found.scope_package_sha256 !== packageHash || found.formal_spec_path !== `${base}/formal-spec.json` || found.ledger_path !== `${base}/assumption-ledger.json`
    || found.approval_path !== `${base}/approval.json` || found.formal_spec_ref.sha256 !== scope.formal_spec_sha256 || found.ledger_ref.sha256 !== scope.ledger_sha256) fail();
  const preparedRow = runtime.store.get("SELECT plan_json FROM trust_commits WHERE phase='committed' AND campaign_id=? AND json_extract(plan_json,'$.response.kind')='formal_intake_prepared' AND json_extract(plan_json,'$.response.intake_id')=?", campaignId, receipt.intake_id);
  if (!preparedRow) fail();
  const prepared = JSON.parse(String(preparedRow.plan_json)).response as PreparedIntakeReceipt;
  if (prepared.prepared_sha256 !== receipt.prepared_sha256 || hash(prepared.prepared) !== receipt.prepared_sha256
    || readCommittedFile(runtime.root, prepared.prepared_path) !== canonicalJson(prepared.prepared)) fail();
  const original = prepared.prepared.claims.find(entry => entry.claim.id === scope.claim_id);
  if (!original || original.obligation_id !== found.obligation_id || !same(original.formal_spec_ref, found.formal_spec_ref) || !same(original.ledger_ref, found.ledger_ref)) fail();
  function checked(ref: ArtifactPointer, installed: string): string {
    const record = listArtifactRefs(runtime.root).find(value => value.id === ref.artifact_id && value.sha256 === ref.sha256 && value.project_id === campaign!.project_id);
    if (!record || record.path.replace(/\\/g, "/") !== `.comath/artifacts/sha256/${ref.sha256.slice(0, 2)}/${ref.sha256}`) fail();
    const path = resolveProjectCommitPath(runtime.root, record.path), info = statSync(path);
    if (!info.isFile() || info.size !== record.size_bytes || info.size > 16 * 1024 * 1024) fail();
    const bytes = readFileSync(path), actual = readCommittedFile(runtime.root, installed);
    if (digest(bytes) !== ref.sha256 || digest(actual) !== ref.sha256 || bytes.toString("utf8") !== actual) fail(); return actual;
  }
  if (readCommittedFile(runtime.root, found.approval_path) !== canonicalJson(receipt)) fail();
  const lock = formalSpecLockSchema.parse(JSON.parse(checked(found.formal_spec_ref, found.formal_spec_path)));
  const ledger = assumptionLedgerSchema.parse(JSON.parse(checked(found.ledger_ref, found.ledger_path)));
  if (!same(lock, original.formal_spec_lock) || !same(ledger, original.assumption_ledger) || lock.claim_id !== scope.claim_id || ledger.claim_id !== scope.claim_id
    || lock.statement_hash !== scope.statement_hash || ledger.formal_spec_lock_hash !== scope.statement_hash) fail();
  return { scope, lock, ledger, receipt, formal_spec_ref: found.formal_spec_ref, ledger_ref: found.ledger_ref,
    obligation_binding: { obligation_id: original.obligation_id, parent_obligation_id: original.parent_obligation_id, dependencies: original.dependencies },
    assumptions: [...lock.variables.map(variable => `${variable.name} : ${variable.type}`), ...lock.assumptions.map(assumption => assumption.type)], proof_authority: "none" as const };
}
