import { withTrustedWriter, existsCommittedFile, readCommittedFile, writeCommittedFile, allocateProjectId, projectCommitTime, hasProjectCommit } from "../research/project-commit.js";
import { getAcquiredProjectRuntime } from "../research/project-runtime.js";
import { canonicalJson } from "../verification/runner-contracts.js";
import { join } from "node:path";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { ComathError } from "../errors.js";
import { assertPathAllowed } from "../security/path-policy.js";
import {
  claimSchema,
  memoryEdgeSchema,
  type Claim,
  type ClaimStatus,
  type MemoryEdge,
  type MemoryEdgeLabel
} from "../types/schemas.js";
import { nextSequentialId } from "../utils/id.js";
import { normalizeStatement, statementHash } from "../utils/statement.js";

const createAllowedStatuses = new Set<ClaimStatus>([
  "draft",
  "conjectural",
  "needs_formal_spec_lock",
  "formal_spec_locked",
  "blocked",
  "refuted",
  "retracted"
]);
const privilegedStatuses = new Set<ClaimStatus>([
  "literature_supported",
  "computationally_supported",
  "symbolically_checked",
  "lean_skeleton",
  "formally_checked",
  "human_accepted"
]);

export type RegisterClaimInput = {
  project_id: string;
  statement: string;
  assumptions: string[];
  domain: string;
  actor: string;
  status?: ClaimStatus;
};

export type UpdateClaimInput = {
  project_id: string;
  claim_id: string;
  actor: string;
  patch: Partial<Pick<Claim, "statement" | "assumptions" | "domain" | "status" | "evidence_level">>;
};

export type LinkClaimsInput = {
  project_id: string;
  source_id: string;
  target_id: string;
  label: MemoryEdgeLabel;
  actor: string;
};

function claimsPath(projectRoot: string): string {
  return assertPathAllowed(projectRoot, join(".comath", "claims", "claims.jsonl"), { purpose: "runtime-write" });
}

function linksPath(projectRoot: string): string {
  return assertPathAllowed(projectRoot, join(".comath", "claims", "claim-links.jsonl"), { purpose: "runtime-write" });
}

function readJsonl<T>(projectRoot: string, path: string, parse: (value: unknown) => T): T[] {
  if (!existsCommittedFile(projectRoot, path)) {
    return [];
  }
  return readCommittedFile(projectRoot, path)
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => parse(JSON.parse(line)));
}

function writeJsonl<T>(projectRoot: string, path: string, records: T[]): void {

  writeCommittedFile(projectRoot, path, `${records.map((record) => JSON.stringify(record)).join("\n")}${records.length ? "\n" : ""}`);
}

function now(projectRoot: string): string {
  return projectCommitTime(projectRoot);
}

function assertNoDirectEscalation(status: ClaimStatus | undefined): void {
  if (status && privilegedStatuses.has(status)) {
    throw new ComathError("direct claim status escalation is not allowed", {
      statusCode: 400,
      code: "DIRECT_CLAIM_STATUS_ESCALATION"
    });
  }
}

export function readClaims(projectRoot: string, projectId?: string): Claim[] {
  const claims = readJsonl(projectRoot, claimsPath(projectRoot), (value) => claimSchema.parse(value));
  return projectId ? claims.filter((claim) => claim.project_id === projectId) : claims;
}

export function getClaim(projectRoot: string, projectId: string, claimId: string): Claim | null {
  return readClaims(projectRoot, projectId).find((claim) => claim.id === claimId) ?? null;
}

export function registerClaim(projectRoot: string, input: RegisterClaimInput): Claim {
  return withTrustedWriter(projectRoot, "claim.register", input, () => {
    const status = input.status ?? "draft";
    if (!createAllowedStatuses.has(status)) {
      assertNoDirectEscalation(status);
      throw new ComathError(`unsupported initial claim status: ${status}`, {
        statusCode: 400,
        code: "UNSUPPORTED_INITIAL_CLAIM_STATUS"
      });
    }

    const existing = readClaims(projectRoot, input.project_id);
    const normalizedStatement = normalizeStatement(input.statement);
    const timestamp = now(projectRoot);
    const claim = claimSchema.parse({
      id: allocateProjectId(projectRoot, "C", () => nextSequentialId("C", existing.map((item) => item.id))),
      project_id: input.project_id,
      statement: normalizedStatement,
      statement_hash: statementHash(normalizedStatement),
      status,
      evidence_level: 0,
      assumptions: input.assumptions,
      domain: input.domain,
      created_at: timestamp,
      updated_at: timestamp
    });

    writeJsonl(projectRoot, claimsPath(projectRoot), [...readClaims(projectRoot), claim]);
    appendAuditEvent(projectRoot, {
      project_id: input.project_id,
      event_type: "claim.registered",
      actor: input.actor,
      target_id: claim.id,
      payload: {
        status: claim.status,
        statement_hash: claim.statement_hash
      }
    });
    return claim;

  });
}

function assertPreparedClaimCommit(projectRoot: string): void {
  if (!getAcquiredProjectRuntime(projectRoot) || !hasProjectCommit(projectRoot)) {
    throw new ComathError("Reserved claims require an acquired runtime and active project commit", { statusCode: 409, code: "RESERVED_CLAIM_COMMIT_REQUIRED" });
  }
}

function preparedClaimBytes(value: Claim): Claim {
  const claim = claimSchema.parse(value);
  if (canonicalJson(claim) !== canonicalJson(value) || normalizeStatement(claim.statement) !== claim.statement
    || statementHash(claim.statement) !== claim.statement_hash) {
    throw new ComathError("Reserved claim bytes must already be normalized and complete", { statusCode: 400, code: "RESERVED_CLAIM_BYTES_INVALID" });
  }
  if (!createAllowedStatuses.has(claim.status) || claim.evidence_level !== 0 || claim.gate_result_id !== undefined
    || claim.dependency_closure_status !== "unchecked" || claim.formalization_status !== "none" || claim.audit_state !== "not_audited") {
    throw new ComathError("Reserved claims cannot carry privileged review state", { statusCode: 400, code: "RESERVED_CLAIM_STATE_INVALID" });
  }
  return claim;
}

/** Service-only writer for a fully prepared claim inside its owner's composite commit. */
export function registerReservedClaim(projectRoot: string, input: { claim: Claim; actor: string }): Claim {
  assertPreparedClaimCommit(projectRoot);
  const claim = preparedClaimBytes(input.claim);
  const claims = readClaims(projectRoot), existing = claims.filter(value => value.id === claim.id);
  if (existing.length) {
    if (existing.length === 1 && canonicalJson(existing[0]) === canonicalJson(claim)) return existing[0]!;
    throw new ComathError("Reserved claim ID already has different content", { statusCode: 409, code: "RESERVED_CLAIM_CONFLICT" });
  }
  writeJsonl(projectRoot, claimsPath(projectRoot), [...claims, claim]);
  appendAuditEvent(projectRoot, { project_id: claim.project_id, event_type: "claim.registered", actor: input.actor, target_id: claim.id,
    payload: { status: claim.status, statement_hash: claim.statement_hash } });
  return claim;
}

/** Service-only exact baseline replacement; formal intake owns the surrounding commit. */
export function replacePreparedClaim(projectRoot: string, input: { expected: Claim; claim: Claim; actor: string }): Claim {
  assertPreparedClaimCommit(projectRoot);
  const claim = preparedClaimBytes(input.claim), expected = claimSchema.parse(input.expected);
  if (canonicalJson(expected) !== canonicalJson(input.expected)) {
    throw new ComathError("Prepared claim baseline must contain complete schema bytes", { statusCode: 400, code: "RESERVED_CLAIM_BYTES_INVALID" });
  }
  if (claim.status !== "formal_spec_locked") {
    throw new ComathError("Prepared replacement must lock the formal specification", { statusCode: 400, code: "RESERVED_CLAIM_STATE_INVALID" });
  }
  if (claim.id !== expected.id || claim.project_id !== expected.project_id || claim.created_at !== expected.created_at) {
    throw new ComathError("Prepared replacement cannot change claim identity", { statusCode: 409, code: "PREPARED_CLAIM_IDENTITY_INVALID" });
  }
  const claims = readClaims(projectRoot), matches = claims.map((value, index) => ({ value, index })).filter(({ value }) => value.id === claim.id);
  const current = matches[0];
  if (matches.length !== 1 || !current) {
    throw new ComathError("Prepared claim baseline no longer matches", { statusCode: 409, code: "PREPARED_CLAIM_CONFLICT" });
  }
  if (canonicalJson(current.value) === canonicalJson(claim)) return current.value;
  if (canonicalJson(current.value) !== canonicalJson(expected)) {
    throw new ComathError("Prepared claim baseline no longer matches", { statusCode: 409, code: "PREPARED_CLAIM_CONFLICT" });
  }
  claims[current.index] = claim;
  writeJsonl(projectRoot, claimsPath(projectRoot), claims);
  appendAuditEvent(projectRoot, { project_id: claim.project_id, event_type: "claim.updated", actor: input.actor, target_id: claim.id,
    payload: { status: claim.status, statement_hash: claim.statement_hash } });
  return claim;
}

export function updateClaim(projectRoot: string, input: UpdateClaimInput): Claim {
  return withTrustedWriter(projectRoot, "claim.update", input, () => {
    assertNoDirectEscalation(input.patch.status);
    const claims = readClaims(projectRoot);
    const index = claims.findIndex((claim) => claim.project_id === input.project_id && claim.id === input.claim_id);
    if (index === -1) {
      throw new ComathError("claim not found", { statusCode: 404, code: "CLAIM_NOT_FOUND" });
    }

    const previous = claims[index];
    const nextStatement = input.patch.statement ? normalizeStatement(input.patch.statement) : previous.statement;
    const updated = claimSchema.parse({
      ...previous,
      statement: nextStatement,
      statement_hash: nextStatement === previous.statement ? previous.statement_hash : statementHash(nextStatement),
      assumptions: input.patch.assumptions ?? previous.assumptions,
      domain: input.patch.domain ?? previous.domain,
      status: input.patch.status ?? previous.status,
      evidence_level: input.patch.evidence_level ?? previous.evidence_level,
      updated_at: now(projectRoot)
    });

    claims[index] = updated;
    writeJsonl(projectRoot, claimsPath(projectRoot), claims);
    appendAuditEvent(projectRoot, {
      project_id: input.project_id,
      event_type: "claim.updated",
      actor: input.actor,
      target_id: updated.id,
      payload: {
        status: updated.status,
        statement_hash: updated.statement_hash
      }
    });
    return updated;

  });
}

export function readClaimLinks(projectRoot: string, projectId?: string): MemoryEdge[] {
  const links = readJsonl(projectRoot, linksPath(projectRoot), (value) => memoryEdgeSchema.parse(value));
  return projectId ? links.filter((link) => link.project_id === projectId) : links;
}

export function linkClaims(projectRoot: string, input: LinkClaimsInput): MemoryEdge {
  return withTrustedWriter(projectRoot, "claim.link", input, () => {
    const links = readClaimLinks(projectRoot, input.project_id);
    const edge = memoryEdgeSchema.parse({
      id: allocateProjectId(projectRoot, "EDGE", () => nextSequentialId("EDGE", links.map((item) => item.id))),
      project_id: input.project_id,
      source_id: input.source_id,
      target_id: input.target_id,
      label: input.label,
      created_at: now(projectRoot)
    });

    writeJsonl(projectRoot, linksPath(projectRoot), [...readClaimLinks(projectRoot), edge]);
    appendAuditEvent(projectRoot, {
      project_id: input.project_id,
      event_type: "claim.linked",
      actor: input.actor,
      target_id: input.source_id,
      payload: {
        edge_id: edge.id,
        target_id: edge.target_id,
        label: edge.label
      }
    });
    return edge;

  });
}

export function applyGatePromotedClaim(projectRoot: string, claim: Claim): Claim {
  return withTrustedWriter(projectRoot, "claim.gate-promote", claim, () => {
    const claims = readClaims(projectRoot);
    const index = claims.findIndex((item) => item.project_id === claim.project_id && item.id === claim.id);
    if (index === -1) {
      throw new ComathError("claim not found", { statusCode: 404, code: "CLAIM_NOT_FOUND" });
    }
    claims[index] = claimSchema.parse(claim);
    writeJsonl(projectRoot, claimsPath(projectRoot), claims);
    return claims[index];

  });
}
