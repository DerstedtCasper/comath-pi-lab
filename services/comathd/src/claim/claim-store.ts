import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
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

const createAllowedStatuses = new Set<ClaimStatus>(["draft", "conjectural", "blocked", "refuted", "retracted"]);
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

function readJsonl<T>(path: string, parse: (value: unknown) => T): T[] {
  if (!existsSync(path)) {
    return [];
  }
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => parse(JSON.parse(line)));
}

function writeJsonl<T>(path: string, records: T[]): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${records.map((record) => JSON.stringify(record)).join("\n")}${records.length ? "\n" : ""}`, "utf8");
}

function now(): string {
  return new Date().toISOString();
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
  const claims = readJsonl(claimsPath(projectRoot), (value) => claimSchema.parse(value));
  return projectId ? claims.filter((claim) => claim.project_id === projectId) : claims;
}

export function getClaim(projectRoot: string, projectId: string, claimId: string): Claim | null {
  return readClaims(projectRoot, projectId).find((claim) => claim.id === claimId) ?? null;
}

export function registerClaim(projectRoot: string, input: RegisterClaimInput): Claim {
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
  const timestamp = now();
  const claim = claimSchema.parse({
    id: nextSequentialId("C", existing.map((item) => item.id)),
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

  writeJsonl(claimsPath(projectRoot), [...readClaims(projectRoot), claim]);
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
}

export function updateClaim(projectRoot: string, input: UpdateClaimInput): Claim {
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
    updated_at: now()
  });

  claims[index] = updated;
  writeJsonl(claimsPath(projectRoot), claims);
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
}

export function readClaimLinks(projectRoot: string, projectId?: string): MemoryEdge[] {
  const links = readJsonl(linksPath(projectRoot), (value) => memoryEdgeSchema.parse(value));
  return projectId ? links.filter((link) => link.project_id === projectId) : links;
}

export function linkClaims(projectRoot: string, input: LinkClaimsInput): MemoryEdge {
  const links = readClaimLinks(projectRoot, input.project_id);
  const edge = memoryEdgeSchema.parse({
    id: nextSequentialId("EDGE", links.map((item) => item.id)),
    project_id: input.project_id,
    source_id: input.source_id,
    target_id: input.target_id,
    label: input.label,
    created_at: now()
  });

  writeJsonl(linksPath(projectRoot), [...readClaimLinks(projectRoot), edge]);
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
}

export function applyGatePromotedClaim(projectRoot: string, claim: Claim): Claim {
  const claims = readClaims(projectRoot);
  const index = claims.findIndex((item) => item.project_id === claim.project_id && item.id === claim.id);
  if (index === -1) {
    throw new ComathError("claim not found", { statusCode: 404, code: "CLAIM_NOT_FOUND" });
  }
  claims[index] = claimSchema.parse(claim);
  writeJsonl(claimsPath(projectRoot), claims);
  return claims[index];
}
