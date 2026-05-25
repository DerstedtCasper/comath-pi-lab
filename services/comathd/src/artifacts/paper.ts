import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { z } from "zod";
import { appendAuditEvent } from "../audit/jsonl-writer.js";
import { importArtifact } from "../artifacts/store.js";
import { getClaim, readClaims } from "../claim/claim-store.js";
import { ComathError } from "../errors.js";
import { readEvidenceRecords } from "../evidence/store.js";
import { hasSuccessfulCitationConditionMatch } from "../literature/index.js";
import { assertPathAllowed } from "../security/path-policy.js";
import { paperMarginNoteSchema, type ArtifactRef, type Claim, type PaperMarginNote } from "../types/schemas.js";
import { nextSequentialId } from "../utils/id.js";
import { buildPaperBibTeX } from "./bibtex.js";

const paperSectionSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    markdown: z.string(),
    updated_at: z.string().datetime()
  })
  .strict();

const paperManifestSchema = z
  .object({
    paper_id: z.string().regex(/^PAPER-\d{4,}$/),
    project_id: z.string().regex(/^[A-Z]+-\d{4,}$/),
    title: z.string().min(1),
    sections: z.array(
      z
        .object({
          id: z.string().min(1),
          title: z.string().min(1),
          updated_at: z.string().datetime()
        })
        .strict()
    ),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime()
  })
  .strict();

const paperStateSectionSchema = paperSectionSchema;

export type PaperManifest = z.infer<typeof paperManifestSchema>;
export type PaperSection = z.infer<typeof paperStateSectionSchema>;

export type PaperState = {
  manifest: PaperManifest;
  markdown: string;
  tex: string;
  bibtex: string;
  margin_notes: PaperMarginNote[];
  sections: PaperSection[];
};

export type PaperCheckResult = {
  ok: boolean;
  vetoes: string[];
  warnings: string[];
  notes: string[];
};

export type InitPaperInput = {
  project_id: string;
  title?: string;
  actor: string;
};

export type UpdatePaperSectionInput = {
  project_id: string;
  section_id: string;
  title: string;
  markdown: string;
  actor: string;
};

export type RenderClaimBlockInput = {
  project_id: string;
  claim_id: string;
  wording: "theorem" | "lemma" | "proposition" | "conjecture" | "claim" | "remark";
  evidence_ids?: string[];
  source_workstreams?: string[];
  warnings?: string[];
  blockers?: string[];
  actor: string;
};

export type RenderedClaimBlock = {
  markdown: string;
  tex: string;
  note: PaperMarginNote;
  vetoes: string[];
  warnings: string[];
};

export type ExportPaperInput = {
  project_id: string;
  format: "md" | "tex";
  actor: string;
};

function now(): string {
  return new Date().toISOString();
}

function sha256Text(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function papersDir(projectRoot: string): string {
  return assertPathAllowed(projectRoot, join(".comath", "artifacts", "papers"), { purpose: "runtime-write" });
}

function paperPath(projectRoot: string, name: string): string {
  return assertPathAllowed(projectRoot, join(".comath", "artifacts", "papers", name), { purpose: "runtime-write" });
}

function manifestPath(projectRoot: string): string {
  return paperPath(projectRoot, "manifest.json");
}

function sectionsPath(projectRoot: string): string {
  return paperPath(projectRoot, "sections.json");
}

function marginNotesPath(projectRoot: string): string {
  return paperPath(projectRoot, "margin_notes.json");
}

function readJson<T>(path: string, fallback: T, parse: (value: unknown) => T): T {
  if (!existsSync(path)) {
    return fallback;
  }
  return parse(JSON.parse(readFileSync(path, "utf8")));
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function defaultManifest(projectId: string, title: string): PaperManifest {
  const timestamp = now();
  return paperManifestSchema.parse({
    paper_id: "PAPER-0001",
    project_id: projectId,
    title,
    sections: [],
    created_at: timestamp,
    updated_at: timestamp
  });
}

function readManifest(projectRoot: string, projectId: string): PaperManifest {
  return readJson(manifestPath(projectRoot), defaultManifest(projectId, "CoMath Working Paper"), (value) =>
    paperManifestSchema.parse(value)
  );
}

function writeManifest(projectRoot: string, manifest: PaperManifest): void {
  writeJson(manifestPath(projectRoot), paperManifestSchema.parse(manifest));
}

function readSections(projectRoot: string): PaperSection[] {
  return readJson(sectionsPath(projectRoot), [], (value) => z.array(paperStateSectionSchema).parse(value));
}

function writeSections(projectRoot: string, sections: PaperSection[]): void {
  writeJson(sectionsPath(projectRoot), z.array(paperStateSectionSchema).parse(sections));
}

function renderMarkdown(manifest: PaperManifest, sections: PaperSection[]): string {
  const body = sections.map((section) => section.markdown.trim()).filter(Boolean);
  return [`# ${manifest.title}`, "", ...body].join("\n").trimEnd() + "\n";
}

function escapeTex(value: string): string {
  return value.replace(/\\/g, "\\textbackslash{}").replace(/&/g, "\\&").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function renderTex(manifest: PaperManifest, sections: PaperSection[]): string {
  const sectionTex = sections
    .map((section) => `\\section{${escapeTex(section.title)}}\n${escapeTex(section.markdown)}`)
    .join("\n\n");
  return [
    "\\documentclass{article}",
    "\\usepackage[margin=1in]{geometry}",
    "\\begin{document}",
    `\\title{${escapeTex(manifest.title)}}`,
    "\\maketitle",
    sectionTex,
    "\\end{document}",
    ""
  ].join("\n");
}

function writeRenderedFiles(projectRoot: string, manifest: PaperManifest, sections: PaperSection[]): void {
  mkdirSync(papersDir(projectRoot), { recursive: true });
  writeFileSync(paperPath(projectRoot, "main.md"), renderMarkdown(manifest, sections), "utf8");
  writeFileSync(paperPath(projectRoot, "main.tex"), renderTex(manifest, sections), "utf8");
  writeFileSync(paperPath(projectRoot, "references.bib"), buildPaperBibTeX(projectRoot, manifest.project_id), "utf8");
}

function claimLabel(wording: RenderClaimBlockInput["wording"], claim: Claim): string {
  if (wording === "theorem" || wording === "lemma" || wording === "proposition") {
    return wording[0].toUpperCase() + wording.slice(1);
  }
  if (claim.status === "formally_checked") {
    return "Theorem";
  }
  return wording === "conjecture" ? "Conjecture" : "Claim";
}

function theoremLike(wording: RenderClaimBlockInput["wording"]): boolean {
  return wording === "theorem" || wording === "lemma" || wording === "proposition";
}

function noteId(existing: PaperMarginNote[]): string {
  return nextSequentialId("PMN", existing.map((note) => note.id));
}

function parseMarginNotes(value: unknown): PaperMarginNote[] {
  return z.array(paperMarginNoteSchema).parse(value);
}

function safeReadMarginNotes(projectRoot: string): { notes: PaperMarginNote[]; invalid: boolean } {
  if (!existsSync(marginNotesPath(projectRoot))) {
    return { notes: [], invalid: false };
  }
  try {
    return { notes: parseMarginNotes(JSON.parse(readFileSync(marginNotesPath(projectRoot), "utf8"))), invalid: false };
  } catch {
    return { notes: [], invalid: true };
  }
}

function ensurePaper(projectRoot: string, projectId: string): PaperManifest {
  if (!existsSync(manifestPath(projectRoot))) {
    return initPaper(projectRoot, { project_id: projectId, actor: "paper-system" }).manifest;
  }
  return readManifest(projectRoot, projectId);
}

export function initPaper(projectRoot: string, input: InitPaperInput): PaperState {
  mkdirSync(papersDir(projectRoot), { recursive: true });
  const manifest = existsSync(manifestPath(projectRoot))
    ? readManifest(projectRoot, input.project_id)
    : defaultManifest(input.project_id, input.title ?? "CoMath Working Paper");
  const sections = existsSync(sectionsPath(projectRoot)) ? readSections(projectRoot) : [];
  writeManifest(projectRoot, manifest);
  writeSections(projectRoot, sections);
  if (!existsSync(marginNotesPath(projectRoot))) {
    writeJson(marginNotesPath(projectRoot), []);
  }
  writeRenderedFiles(projectRoot, manifest, sections);
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "paper.initialized",
    actor: input.actor,
    target_id: manifest.paper_id,
    payload: { title: manifest.title }
  });
  return readPaperState(projectRoot, input.project_id);
}

export function readPaperState(projectRoot: string, projectId: string): PaperState {
  const manifest = readManifest(projectRoot, projectId);
  const sections = readSections(projectRoot);
  const notes = readMarginNotes(projectRoot, projectId);
  const markdownPath = paperPath(projectRoot, "main.md");
  const texPath = paperPath(projectRoot, "main.tex");
  const bibPath = paperPath(projectRoot, "references.bib");
  return {
    manifest,
    markdown: existsSync(markdownPath) ? readFileSync(markdownPath, "utf8") : renderMarkdown(manifest, sections),
    tex: existsSync(texPath) ? readFileSync(texPath, "utf8") : renderTex(manifest, sections),
    bibtex: existsSync(bibPath) ? readFileSync(bibPath, "utf8") : "",
    margin_notes: notes,
    sections
  };
}

export function readMarginNotes(projectRoot: string, projectId?: string): PaperMarginNote[] {
  const { notes, invalid } = safeReadMarginNotes(projectRoot);
  if (invalid) {
    throw new ComathError("invalid margin notes", { code: "PAPER_INVALID_MARGIN_NOTES" });
  }
  return projectId ? notes.filter((note) => note.project_id === projectId) : notes;
}

export function writeMarginNotes(projectRoot: string, notes: PaperMarginNote[]): PaperMarginNote[] {
  const parsed = z.array(paperMarginNoteSchema).parse(notes);
  writeJson(marginNotesPath(projectRoot), parsed);
  return parsed;
}

export function updatePaperSection(projectRoot: string, input: UpdatePaperSectionInput): PaperState {
  const manifest = ensurePaper(projectRoot, input.project_id);
  const sections = readSections(projectRoot);
  const timestamp = now();
  const section = paperStateSectionSchema.parse({
    id: input.section_id,
    title: input.title,
    markdown: input.markdown,
    updated_at: timestamp
  });
  const index = sections.findIndex((item) => item.id === input.section_id);
  if (index === -1) {
    sections.push(section);
  } else {
    sections[index] = section;
  }
  const updatedManifest = paperManifestSchema.parse({
    ...manifest,
    sections: sections.map((item) => ({ id: item.id, title: item.title, updated_at: item.updated_at })),
    updated_at: timestamp
  });
  writeSections(projectRoot, sections);
  writeManifest(projectRoot, updatedManifest);
  writeRenderedFiles(projectRoot, updatedManifest, sections);
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "paper.section_updated",
    actor: input.actor,
    target_id: updatedManifest.paper_id,
    payload: { section_id: input.section_id, title: input.title }
  });
  return readPaperState(projectRoot, input.project_id);
}

export function renderClaimBlock(projectRoot: string, input: RenderClaimBlockInput): RenderedClaimBlock {
  ensurePaper(projectRoot, input.project_id);
  const claim = getClaim(projectRoot, input.project_id, input.claim_id);
  if (!claim) {
    throw new ComathError("claim not found", { statusCode: 404, code: "CLAIM_NOT_FOUND" });
  }
  const evidence = readEvidenceRecords(projectRoot, input.project_id).filter((record) =>
    (input.evidence_ids ?? []).includes(record.id)
  );
  const vetoes: string[] = [];
  const warnings = [...(input.warnings ?? [])];
  if (theoremLike(input.wording) && claim.status !== "formally_checked") {
    vetoes.push("theorem_wording_requires_formally_checked_claim");
  }
  if (input.wording === "conjecture" && claim.status === "refuted") {
    vetoes.push("refuted_claim_cannot_be_rendered_as_conjecture");
  }
  if ((input.evidence_ids ?? []).length === 0 && claim.status !== "draft" && claim.status !== "conjectural") {
    vetoes.push("claim_block_missing_evidence");
  }
  const existingNotes = readMarginNotes(projectRoot);
  const timestamp = now();
  const nextNoteId = noteId(existingNotes);
  const label = claimLabel(input.wording, claim);
  const sourceWorkstreams = input.source_workstreams ?? [];
  const blockers = input.blockers ?? [];
  const evidenceLine = (input.evidence_ids ?? []).length ? `evidence: ${(input.evidence_ids ?? []).join(", ")}` : "evidence: none";
  const warningLine = warnings.length ? `warnings: ${warnings.join("; ")}` : "warnings: none";
  const blockerLine = blockers.length ? `blockers: ${blockers.join("; ")}` : "blockers: none";
  const workstreamLine = sourceWorkstreams.length
    ? `workstreams: ${sourceWorkstreams.join(", ")}`
    : "workstreams: none";
  const metadata = [
    `claim:${claim.id}`,
    `margin_note:${nextNoteId}`,
    `status: ${claim.status}`,
    `statement_hash: ${claim.statement_hash}`,
    evidenceLine,
    workstreamLine,
    warningLine,
    blockerLine
  ].join("; ");
  const markdown = `**${label} (${metadata}).** ${claim.statement}`;
  const note = paperMarginNoteSchema.parse({
    id: nextNoteId,
    project_id: input.project_id,
    claim_id: claim.id,
    evidence_ids: input.evidence_ids ?? [],
    displayed_evidence_ids: input.evidence_ids ?? [],
    source_workstreams: sourceWorkstreams,
    wording: input.wording,
    statement_hash: claim.statement_hash,
    rendered_block_sha256: sha256Text(markdown),
    warnings,
    blockers,
    created_at: timestamp
  });
  writeMarginNotes(projectRoot, [...existingNotes, note]);
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "paper.claim_block_rendered",
    actor: input.actor,
    target_id: claim.id,
    payload: {
      wording: input.wording,
      vetoes,
      evidence_ids: evidence.map((record) => record.id),
      margin_note_id: note.id
    }
  });
  return {
    markdown,
    tex: escapeTex(markdown),
    note,
    vetoes,
    warnings
  };
}

function collectClaimRefs(markdown: string): Array<{ claimId: string; marginNoteId?: string; statementHash?: string; block: string }> {
  return markdown
    .split(/\n+/)
    .filter((line) => line.includes("claim:"))
    .map((line) => {
      const claimId = /claim:([A-Z]+-\d{4,})/.exec(line)?.[1] ?? "";
      const marginNoteId = /margin_note:\s*(PMN-\d{4,})/.exec(line)?.[1];
      const statementHash = /statement_hash:\s*([a-f0-9]{64})/.exec(line)?.[1];
      return { claimId, marginNoteId, statementHash, block: line };
    })
    .filter((ref) => ref.claimId);
}

function hasTheoremLikeSyntax(markdown: string): boolean {
  return (
    /(theorem|lemma|proposition)\s*\(/i.test(markdown) ||
    /^\s{0,3}(?:#{1,6}\s*)?(?:\*\*)?\s*(theorem|lemma|proposition)\b(?:\s*[.:({]|$)/im.test(markdown) ||
    /\\begin\{(?:theorem|lemma|proposition)\}/i.test(markdown)
  );
}

function includesAny(text: string, needles: readonly string[]): boolean {
  const normalized = text.toLowerCase();
  return needles.some((needle) => normalized.includes(needle.toLowerCase()));
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasVisibleBlockerDisclosure(markdown: string, blocker: string): boolean {
  return new RegExp(`(?:^|\\n)Blockers:\\s*[^\\n]*${escapeRegex(blocker)}`).test(markdown);
}

export function checkPaper(projectRoot: string, input: { project_id: string }): PaperCheckResult {
  const vetoes: string[] = [];
  const warnings: string[] = [];
  const notes: string[] = [];
  const marginRead = safeReadMarginNotes(projectRoot);
  if (marginRead.invalid) {
    vetoes.push("invalid_margin_notes");
  }
  const manifest = readManifest(projectRoot, input.project_id);
  const sections = readSections(projectRoot);
  const markdown = existsSync(paperPath(projectRoot, "main.md"))
    ? readFileSync(paperPath(projectRoot, "main.md"), "utf8")
    : renderMarkdown(manifest, sections);
  const claims = readClaims(projectRoot, input.project_id);
  const evidence = readEvidenceRecords(projectRoot, input.project_id);
  const claimRefs = collectClaimRefs(markdown);

  if (hasTheoremLikeSyntax(markdown)) {
    for (const ref of claimRefs) {
      const claim = claims.find((item) => item.id === ref.claimId);
      if (claim && claim.status !== "formally_checked") {
        vetoes.push("theorem_wording_requires_formally_checked_claim");
      }
    }
  }

  for (const ref of claimRefs) {
    const claim = claims.find((item) => item.id === ref.claimId);
    if (!claim) {
      vetoes.push("paper_references_unknown_claim");
      continue;
    }
    if (ref.statementHash && ref.statementHash !== claim.statement_hash) {
      vetoes.push("stale_claim_statement");
    }
    const marginNote = marginRead.notes.find(
      (note) => note.id === ref.marginNoteId && note.project_id === input.project_id && note.claim_id === claim.id
    );
    if (!marginNote) {
      vetoes.push("missing_margin_provenance");
      continue;
    }
    if (!marginNote.rendered_block_sha256) {
      vetoes.push("missing_bound_margin_block_hash");
    } else if (marginNote.rendered_block_sha256 !== sha256Text(ref.block.trim())) {
      vetoes.push("margin_block_hash_mismatch");
    }
    if (marginNote.statement_hash && marginNote.statement_hash !== claim.statement_hash) {
      vetoes.push("stale_claim_statement");
    }
    const displayedEvidenceIds = new Set(marginNote.displayed_evidence_ids);
    const allEvidenceIds = new Set(marginNote.evidence_ids);
    const referencedEvidence = evidence.filter((record) => allEvidenceIds.has(record.id));
    if (!includesAny(ref.block, ["evidence: none"]) && referencedEvidence.length === 0) {
      vetoes.push("paper_references_missing_evidence");
    }
    if (claim.status === "literature_supported") {
      const evidenceIds = referencedEvidence.map((record) => record.id);
      const artifactIds = Array.from(new Set(referencedEvidence.flatMap((record) => record.artifact_ids)));
      if (!hasSuccessfulCitationConditionMatch(projectRoot, input.project_id, claim.id, evidenceIds, artifactIds)) {
        vetoes.push("literature_supported_missing_condition_match");
      }
    }
    for (const blocker of marginNote.blockers) {
      if (!hasVisibleBlockerDisclosure(markdown, blocker)) {
        vetoes.push("hidden_blocker");
      }
    }
  }

  const theoremWithoutClaim = hasTheoremLikeSyntax(markdown) && !/claim:[A-Z]+-\d{4,}/.test(markdown);
  if (theoremWithoutClaim) {
    vetoes.push("theorem_wording_missing_claim_id");
  }

  for (const claim of claims) {
    if (!claimRefs.some((ref) => ref.claimId === claim.id)) {
      continue;
    }
    if (claim.status === "refuted" && !includesAny(markdown, ["refuted", "counterexample"])) {
      vetoes.push("refuted_claim_not_marked");
    }
    notes.push(`${claim.id}:${claim.status}`);
  }

  return {
    ok: vetoes.length === 0,
    vetoes: Array.from(new Set(vetoes)),
    warnings,
    notes
  };
}

export async function exportPaper(projectRoot: string, input: ExportPaperInput): Promise<{ artifact: ArtifactRef; check: PaperCheckResult; path: string }> {
  const state = readPaperState(projectRoot, input.project_id);
  const check = checkPaper(projectRoot, input);
  if (!check.ok) {
    appendAuditEvent(projectRoot, {
      project_id: input.project_id,
      event_type: "paper.export_rejected",
      actor: input.actor,
      target_id: state.manifest.paper_id,
      payload: {
        format: input.format,
        vetoes: check.vetoes,
        section_count: state.sections.length
      }
    });
    throw new ComathError("paper check failed; export blocked", {
      statusCode: 400,
      code: "PAPER_CHECK_FAILED"
    });
  }
  const name = input.format === "md" ? "main.md" : "main.tex";
  const sourcePath = paperPath(projectRoot, name);
  const artifact = await importArtifact({
    projectRoot,
    project_id: input.project_id,
    source_path: sourcePath,
    kind: input.format === "md" ? "paper" : "tex",
    actor: input.actor
  });
  appendAuditEvent(projectRoot, {
    project_id: input.project_id,
    event_type: "paper.exported",
    actor: input.actor,
    target_id: artifact.id,
    payload: {
      format: input.format,
      check_ok: check.ok,
      vetoes: check.vetoes,
      section_count: state.sections.length
    }
  });
  return { artifact, check, path: sourcePath };
}
