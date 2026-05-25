import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { z } from "zod";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { importArtifact, listArtifactRefs, type ImportArtifactInput } from "../artifacts/store.js";
import { getClaim } from "../claim/claim-store.js";
import { ComathError } from "../errors.js";
import { appendEvidenceRecord } from "../evidence/store.js";
import { assertPathAllowed } from "../security/path-policy.js";
import { type ArtifactRef } from "../types/schemas.js";
import { nextSequentialId } from "../utils/id.js";
import { statementHash } from "../utils/statement.js";

export type BibTeXEntry = {
  type: string;
  key: string;
  title: string;
  authors: string[];
  year?: number;
  doi?: string;
  arxiv_id?: string;
  fields: Record<string, string>;
};

export type CitationSourceKind = "artifact" | "llm_memory" | "summary" | "agent_report";

export type LiteratureCitationRecord = {
  id: string;
  project_id: string;
  title: string;
  authors: string[];
  year?: number;
  locator: string;
  artifact_id: string;
  artifact_path: string;
  source_kind: CitationSourceKind;
  bibtex_key?: string;
  doi?: string;
  arxiv_id?: string;
  claim_id?: string;
  quoted_statement?: string;
  quoted_statement_hash?: string;
  condition_summary: string;
  assumptions: string[];
  created_at: string;
};

export type CitationConditionMatch = {
  id: string;
  project_id: string;
  citation_id: string;
  claim_id: string;
  ok: boolean;
  matched_conditions: string[];
  missing_conditions: string[];
  mismatched_conditions: string[];
  locator: string;
  evidence_ids: string[];
  artifact_ids: string[];
  vetoes: string[];
  warnings: string[];
  created_at: string;
};

export type ImportBibTeXInput = {
  project_id: string;
  bibtex: string;
  actor: string;
};

export type RegisterCitationInput = {
  project_id: string;
  title: string;
  authors: string[];
  locator?: string;
  artifact_id?: string;
  source_kind?: CitationSourceKind;
  actor: string;
  year?: number;
  bibtex_key?: string;
  doi?: string;
  arxiv_id?: string;
  claim_id?: string;
  quoted_statement?: string;
  condition_summary?: string;
  assumptions?: string[];
};

export type CheckCitationConditionsInput = {
  project_id: string;
  citation_id: string;
  claim_id: string;
  required_assumptions: string[];
  actor: string;
};

const stableIdSchema = z.string().regex(/^[A-Z]+-\d{4,}$/);
const isoTimestampSchema = z.string().datetime();
const citationSourceKindSchema = z.enum(["artifact", "llm_memory", "summary", "agent_report"]);

const literatureCitationRecordSchema = z
  .object({
    id: stableIdSchema,
    project_id: stableIdSchema,
    title: z.string().min(1),
    authors: z.array(z.string()).default([]),
    year: z.number().int().optional(),
    locator: z.string().min(1),
    artifact_id: stableIdSchema,
    artifact_path: z.string().min(1),
    source_kind: citationSourceKindSchema,
    bibtex_key: z.string().optional(),
    doi: z.string().optional(),
    arxiv_id: z.string().optional(),
    claim_id: stableIdSchema.optional(),
    quoted_statement: z.string().optional(),
    quoted_statement_hash: z.string().optional(),
    condition_summary: z.string(),
    assumptions: z.array(z.string()),
    created_at: isoTimestampSchema
  })
  .strict();

const citationConditionMatchSchema = z
  .object({
    id: stableIdSchema,
    project_id: stableIdSchema,
    citation_id: stableIdSchema,
    claim_id: stableIdSchema,
    ok: z.boolean(),
    matched_conditions: z.array(z.string()),
    missing_conditions: z.array(z.string()),
    mismatched_conditions: z.array(z.string()),
    locator: z.string().min(1),
    evidence_ids: z.array(stableIdSchema),
    artifact_ids: z.array(stableIdSchema),
    vetoes: z.array(z.string()),
    warnings: z.array(z.string()),
    created_at: isoTimestampSchema
  })
  .strict();

function now(): string {
  return new Date().toISOString();
}

function citationsPath(projectRoot: string): string {
  return assertPathAllowed(projectRoot, join(".comath", "literature", "citations.jsonl"), { purpose: "runtime-write" });
}

function matchesPath(projectRoot: string): string {
  return assertPathAllowed(projectRoot, join(".comath", "literature", "condition_matches.jsonl"), {
    purpose: "runtime-write"
  });
}

function bibtexStagingPath(projectRoot: string, existingIds: readonly string[]): { id: string; path: string } {
  const id = nextSequentialId("BIB", existingIds);
  return {
    id,
    path: assertPathAllowed(projectRoot, join(".comath", "literature", "bibtex", `${id}.bib`), {
      purpose: "runtime-write"
    })
  };
}

function readJsonl<T>(path: string, parse: (value: unknown) => T): T[] {
  if (!existsSync(path)) {
    return [];
  }
  const records: T[] = [];
  for (const line of readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)) {
    try {
      records.push(parse(JSON.parse(line)));
    } catch {
      // Invalid literature records are ignored instead of trusted as evidence.
    }
  }
  return records;
}

function writeJsonl<T>(path: string, records: T[]): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${records.map((record) => JSON.stringify(record)).join("\n")}${records.length ? "\n" : ""}`, "utf8");
}

function parseCitation(value: unknown): LiteratureCitationRecord {
  return literatureCitationRecordSchema.parse(value);
}

function parseMatch(value: unknown): CitationConditionMatch {
  return citationConditionMatchSchema.parse(value);
}

function splitAuthors(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(/\s+and\s+/i)
    .map((author) => author.trim())
    .filter(Boolean);
}

function normalizeCondition(value: string): string {
  return value.trim().toLowerCase();
}

function findArtifact(projectRoot: string, artifactId: string): ArtifactRef | undefined {
  return listArtifactRefs(projectRoot).find((artifact) => artifact.id === artifactId);
}

function artifactContainsQuote(projectRoot: string, artifact: ArtifactRef | undefined, quote: string | undefined): boolean {
  if (!artifact || !quote?.trim()) {
    return false;
  }
  try {
    const path = assertPathAllowed(projectRoot, artifact.path, { purpose: "read", resolveRealpath: true });
    const source = readFileSync(path, "utf8").replace(/\s+/g, " ").toLowerCase();
    const normalizedQuote = quote.replace(/\s+/g, " ").trim().toLowerCase();
    return source.includes(normalizedQuote);
  } catch {
    return false;
  }
}

export function parseBibTeXEntry(bibtex: string): BibTeXEntry {
  const trimmed = bibtex.trim();
  const match = /^@([A-Za-z]+)\s*\{\s*([^,\s]+)\s*,([\s\S]*)\}\s*$/.exec(trimmed);
  if (!match) {
    throw new ComathError("malformed BibTeX record", { code: "BIBTEX_MALFORMED" });
  }
  const fields: Record<string, string> = {};
  const body = match[3] ?? "";
  const fieldPattern = /([A-Za-z][A-Za-z0-9_-]*)\s*=\s*(?:\{([^{}]*)\}|"([^"]*)"|([^,\n]+))\s*,?/g;
  for (const field of body.matchAll(fieldPattern)) {
    fields[(field[1] ?? "").toLowerCase()] = (field[2] ?? field[3] ?? field[4] ?? "").trim();
  }
  if (!fields.title) {
    throw new ComathError("malformed BibTeX record: missing title", { code: "BIBTEX_MALFORMED" });
  }
  return {
    type: (match[1] ?? "").toLowerCase(),
    key: (match[2] ?? "").trim(),
    title: fields.title,
    authors: splitAuthors(fields.author),
    year: fields.year ? Number.parseInt(fields.year, 10) : undefined,
    doi: fields.doi,
    arxiv_id: fields.eprint ?? fields.archiveprefix,
    fields
  };
}

export async function importBibTeX(projectRoot: string, input: ImportBibTeXInput): Promise<{ artifact: ArtifactRef; entry: BibTeXEntry }> {
  const entry = parseBibTeXEntry(input.bibtex);
  const staging = bibtexStagingPath(projectRoot, listArtifactRefs(projectRoot).map((artifact) => artifact.id));
  mkdirSync(dirname(staging.path), { recursive: true });
  writeFileSync(staging.path, `${input.bibtex.trim()}\n`, "utf8");
  const artifact = await importArtifact({
    projectRoot,
    project_id: input.project_id,
    source_path: staging.path,
    kind: "bibtex",
    actor: input.actor
  });
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "literature.bibtex_imported",
    actor: input.actor,
    target_id: artifact.id,
    payload: { bibtex_key: entry.key, artifact_id: artifact.id }
  });
  return { artifact, entry };
}

export function importLiteraturePdf(projectRoot: string, input: Omit<ImportArtifactInput, "projectRoot" | "kind">): Promise<ArtifactRef> {
  return importArtifact({
    projectRoot,
    project_id: input.project_id,
    source_path: input.source_path,
    kind: "pdf",
    actor: input.actor
  }).then((artifact) => {
    appendAuditEvent(projectRoot, {
      project_id: input.project_id,
      event_type: "literature.pdf_imported",
      actor: input.actor,
      target_id: artifact.id,
      payload: { artifact_id: artifact.id, sha256: artifact.sha256 }
    });
    return artifact;
  });
}

export function listCitations(projectRoot: string, projectId?: string): LiteratureCitationRecord[] {
  const citations = readJsonl(citationsPath(projectRoot), parseCitation);
  return projectId ? citations.filter((citation) => citation.project_id === projectId) : citations;
}

export function getCitation(projectRoot: string, projectId: string, citationId: string): LiteratureCitationRecord | null {
  return listCitations(projectRoot, projectId).find((citation) => citation.id === citationId) ?? null;
}

export function registerCitation(projectRoot: string, input: RegisterCitationInput): LiteratureCitationRecord {
  if (!input.locator?.trim()) {
    throw new ComathError("locator is required", { code: "CITATION_LOCATOR_REQUIRED" });
  }
  if (!input.artifact_id) {
    throw new ComathError("artifact_id is required", { code: "CITATION_ARTIFACT_REQUIRED" });
  }
  const artifact = findArtifact(projectRoot, input.artifact_id);
  if (!artifact) {
    throw new ComathError("citation artifact not found", { statusCode: 404, code: "CITATION_ARTIFACT_NOT_FOUND" });
  }
  const existing = listCitations(projectRoot);
  const citation: LiteratureCitationRecord = {
    id: nextSequentialId("CIT", existing.map((item) => item.id)),
    project_id: input.project_id,
    title: input.title,
    authors: input.authors ?? [],
    year: input.year,
    locator: input.locator.trim(),
    artifact_id: artifact.id,
    artifact_path: artifact.path,
    source_kind: input.source_kind ?? "artifact",
    bibtex_key: input.bibtex_key,
    doi: input.doi,
    arxiv_id: input.arxiv_id,
    claim_id: input.claim_id,
    quoted_statement: input.quoted_statement,
    quoted_statement_hash: input.quoted_statement ? statementHash(input.quoted_statement) : undefined,
    condition_summary: input.condition_summary ?? "",
    assumptions: input.assumptions ?? [],
    created_at: now()
  };
  writeJsonl(citationsPath(projectRoot), [...existing, citation]);
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "literature.citation_registered",
    actor: input.actor,
    target_id: citation.id,
    payload: {
      artifact_id: citation.artifact_id,
      locator: citation.locator,
      claim_id: citation.claim_id,
      source_kind: citation.source_kind
    }
  });
  return citation;
}

export function listCitationConditionMatches(projectRoot: string, projectId?: string): CitationConditionMatch[] {
  const matches = readJsonl(matchesPath(projectRoot), parseMatch);
  return projectId ? matches.filter((match) => match.project_id === projectId) : matches;
}

export function hasSuccessfulCitationConditionMatch(
  projectRoot: string,
  projectId: string,
  claimId: string,
  evidenceIds: readonly string[],
  artifactIds: readonly string[]
): boolean {
  return listCitationConditionMatches(projectRoot, projectId).some((match) => {
    if (!match.ok || match.claim_id !== claimId) {
      return false;
    }
    return (
      match.evidence_ids.some((id) => evidenceIds.includes(id)) &&
      match.artifact_ids.every((id) => artifactIds.includes(id))
    );
  });
}

export function checkCitationConditions(projectRoot: string, input: CheckCitationConditionsInput): CitationConditionMatch {
  const citation = getCitation(projectRoot, input.project_id, input.citation_id);
  if (!citation) {
    throw new ComathError("citation not found", { statusCode: 404, code: "CITATION_NOT_FOUND" });
  }
  const claim = getClaim(projectRoot, input.project_id, input.claim_id);
  if (!claim) {
    throw new ComathError("claim not found", { statusCode: 404, code: "CLAIM_NOT_FOUND" });
  }
  const artifact = findArtifact(projectRoot, citation.artifact_id);
  const available = new Set(citation.assumptions.map(normalizeCondition));
  const required = input.required_assumptions.map(normalizeCondition);
  const missing = input.required_assumptions.filter((condition) => !available.has(normalizeCondition(condition)));
  const matched = input.required_assumptions.filter((condition) => available.has(normalizeCondition(condition)));
  const vetoes: string[] = [];
  if (!citation.locator) {
    vetoes.push("missing_locator");
  }
  if (!artifact) {
    vetoes.push("missing_exact_citation_artifact");
  }
  if (citation.source_kind !== "artifact") {
    vetoes.push(citation.source_kind === "llm_memory" ? "llm_memory_not_citation_evidence" : "citation_source_not_artifact");
  }
  if (!citation.quoted_statement_hash) {
    vetoes.push("missing_artifact_quoted_statement");
  }
  if (citation.quoted_statement_hash && !artifactContainsQuote(projectRoot, artifact, citation.quoted_statement)) {
    vetoes.push("citation_quote_not_found_in_artifact");
  }
  if (citation.claim_id && citation.claim_id !== input.claim_id) {
    vetoes.push("citation_claim_mismatch");
  }
  if (citation.quoted_statement_hash && citation.quoted_statement_hash !== claim.statement_hash) {
    vetoes.push("citation_statement_mismatch");
  }
  if (missing.length > 0) {
    vetoes.push("citation_condition_mismatch");
  }
  const ok = vetoes.length === 0;
  const evidence = ok
    ? appendEvidenceRecord(projectRoot, {
        project_id: input.project_id,
        claim_id: input.claim_id,
        kind: "literature",
        summary: `Citation ${citation.id} supports required conditions at ${citation.locator}`,
        artifact_ids: [citation.artifact_id]
      })
    : null;
  const existing = listCitationConditionMatches(projectRoot);
  const match: CitationConditionMatch = {
    id: nextSequentialId("CCM", existing.map((item) => item.id)),
    project_id: input.project_id,
    citation_id: citation.id,
    claim_id: input.claim_id,
    ok,
    matched_conditions: matched,
    missing_conditions: missing,
    mismatched_conditions: [],
    locator: citation.locator,
    evidence_ids: evidence ? [evidence.id] : [],
    artifact_ids: artifact ? [citation.artifact_id] : [],
    vetoes,
    warnings: ok ? [] : ["citation condition match failed closed"],
    created_at: now()
  };
  writeJsonl(matchesPath(projectRoot), [...existing, match]);
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "literature.condition_checked",
    actor: input.actor,
    target_id: citation.id,
    payload: {
      claim_id: input.claim_id,
      ok: match.ok,
      matched_conditions: match.matched_conditions,
      missing_conditions: match.missing_conditions,
      vetoes: match.vetoes,
      evidence_ids: match.evidence_ids,
      artifact_ids: match.artifact_ids
    }
  });
  return match;
}

export type LiteratureAdapterName = "arxiv" | "openalex" | "semantic-scholar" | "zotero";

export type LiteratureAdapterDescriptor = {
  name: LiteratureAdapterName;
  network_enabled: false;
  status: "interface_only";
};

export function listLiteratureAdapterInterfaces(): LiteratureAdapterDescriptor[] {
  return ["arxiv", "openalex", "semantic-scholar", "zotero"].map((name) => ({
    name: name as LiteratureAdapterName,
    network_enabled: false,
    status: "interface_only"
  }));
}
