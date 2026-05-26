import assert from "node:assert/strict";
import { appendFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  checkCitationConditions,
  createComathServer,
  getClaim,
  importBibTeX,
  importLiteraturePdf,
  initProject,
  listArtifactRefs,
  listCitationConditionMatches,
  listCitations,
  parseBibTeXEntry,
  promoteClaim,
  readAuditEvents,
  readEvidenceRecords,
  registerCitation,
  registerClaim
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-literature-"));

try {
  const { project } = initProject({ name: "Literature Project", root_path: projectRoot });
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: "Every compact semisimple tensor category has finitely many simple objects.",
    assumptions: ["compact", "semisimple", "tensor category"],
    domain: "category theory",
    actor: "phase11-test"
  });

  const bibtex = `@article{etingof2005,
    title = {Tensor Categories},
    author = {Etingof, Pavel and Ostrik, Viktor},
    year = {2005},
    doi = {10.0000/example},
    eprint = {math/0500000}
  }`;
  const parsed = parseBibTeXEntry(bibtex);
  assert.equal(parsed.key, "etingof2005");
  assert.equal(parsed.title, "Tensor Categories");
  assert.deepEqual(parsed.authors, ["Etingof, Pavel", "Ostrik, Viktor"]);
  assert.equal(parsed.year, 2005);
  assert.throws(() => parseBibTeXEntry("not a bibtex record"), /malformed BibTeX/);

  const importedBib = await importBibTeX(projectRoot, {
    project_id: project.project_id,
    bibtex,
    actor: "phase11-test"
  });
  assert.equal(importedBib.artifact.kind, "bibtex");
  assert.equal(importedBib.entry.key, "etingof2005");
  assert.equal(existsSync(join(projectRoot, importedBib.artifact.path)), true);

  const pdfPath = join(projectRoot, "source.pdf");
  writeFileSync(
    pdfPath,
    `%PDF-1.4\nTheorem 2.3. ${claim.statement}\nAssumptions: compact; semisimple; tensor category.\n`,
    "utf8"
  );
  const importedPdf = await importLiteraturePdf(projectRoot, {
    project_id: project.project_id,
    source_path: pdfPath,
    actor: "phase11-test"
  });
  assert.equal(importedPdf.kind, "pdf");

  assert.throws(
    () =>
      registerCitation(projectRoot, {
        project_id: project.project_id,
        title: "No locator",
        authors: [],
        artifact_id: importedBib.artifact.id,
        actor: "phase11-test"
      }),
    /locator is required/
  );

  const citation = registerCitation(projectRoot, {
    project_id: project.project_id,
    title: importedBib.entry.title,
    authors: importedBib.entry.authors,
    year: importedBib.entry.year,
    locator: "Theorem 2.3, p. 41",
    artifact_id: importedPdf.id,
    bibtex_key: importedBib.entry.key,
    doi: importedBib.entry.doi,
    arxiv_id: importedBib.entry.arxiv_id,
    claim_id: claim.id,
    quoted_statement: claim.statement,
    condition_summary: "compact; semisimple; tensor category",
    assumptions: ["compact", "semisimple", "tensor category"],
    actor: "phase11-test"
  });
  assert.equal(citation.id, "CIT-0001");
  assert.equal(citation.artifact_id, importedPdf.id);
  assert.equal(citation.locator, "Theorem 2.3, p. 41");
  assert.equal(citation.quoted_statement_hash, claim.statement_hash);

  const unverifiedClaim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: "Every tensor category is semisimple.",
    assumptions: ["tensor category"],
    domain: "category theory",
    actor: "phase11-test"
  });
  const unverifiedPromotion = promoteClaim(projectRoot, {
    project_id: project.project_id,
    claim_id: unverifiedClaim.id,
    target_status: "literature_supported",
    evidence_ids: ["EV-9999"],
    artifact_ids: [importedBib.artifact.id],
    actor: "phase11-test"
  });
  assert.equal(unverifiedPromotion.gate.ok, false);
  assert.equal(
    unverifiedPromotion.gate.vetoes.includes("literature_supported requires successful citation condition match"),
    true
  );
  assert.equal(getClaim(projectRoot, project.project_id, unverifiedClaim.id)?.status, "draft");

  const missingAssumption = checkCitationConditions(projectRoot, {
    project_id: project.project_id,
    citation_id: citation.id,
    claim_id: claim.id,
    required_assumptions: ["compact", "semisimple", "finite-dimensional"],
    actor: "phase11-test"
  });
  assert.equal(missingAssumption.ok, false);
  assert.equal(missingAssumption.missing_conditions.includes("finite-dimensional"), true);
  assert.equal(missingAssumption.vetoes.includes("citation_condition_mismatch"), true);

  const successfulMatch = checkCitationConditions(projectRoot, {
    project_id: project.project_id,
    citation_id: citation.id,
    claim_id: claim.id,
    required_assumptions: ["compact", "semisimple", "tensor category"],
    actor: "phase11-test"
  });
  assert.equal(successfulMatch.ok, true);
  assert.deepEqual(successfulMatch.missing_conditions, []);
  assert.equal(successfulMatch.evidence_ids.length, 1);
  assert.equal(successfulMatch.artifact_ids.includes(importedPdf.id), true);

  const citationByMemory = registerCitation(projectRoot, {
    project_id: project.project_id,
    title: "LLM memory only",
    authors: ["Agent"],
    locator: "memory",
    source_kind: "llm_memory",
    artifact_id: importedPdf.id,
    claim_id: claim.id,
    quoted_statement: claim.statement,
    condition_summary: "compact; semisimple; tensor category",
    assumptions: ["compact", "semisimple", "tensor category"],
    actor: "phase11-test"
  });
  const memoryMatch = checkCitationConditions(projectRoot, {
    project_id: project.project_id,
    citation_id: citationByMemory.id,
    claim_id: claim.id,
    required_assumptions: ["compact"],
    actor: "phase11-test"
  });
  assert.equal(memoryMatch.ok, false);
  assert.equal(memoryMatch.vetoes.includes("llm_memory_not_citation_evidence"), true);

  appendFileSync(
    join(projectRoot, ".comath", "literature", "condition_matches.jsonl"),
    `${JSON.stringify({
      id: "CCM-9999",
      project_id: project.project_id,
      citation_id: citation.id,
      claim_id: unverifiedClaim.id,
      ok: true,
      evidence_ids: ["EV-9999"],
      artifact_ids: [importedPdf.id],
      created_at: new Date().toISOString()
    })}\n`,
    "utf8"
  );
  const tamperedPromotion = promoteClaim(projectRoot, {
    project_id: project.project_id,
    claim_id: unverifiedClaim.id,
    target_status: "literature_supported",
    evidence_ids: ["EV-9999"],
    artifact_ids: [importedPdf.id],
    actor: "phase11-test"
  });
  assert.equal(tamperedPromotion.gate.ok, false);
  assert.equal(
    tamperedPromotion.gate.vetoes.includes("literature_supported requires successful citation condition match"),
    true
  );

  const promotion = promoteClaim(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    target_status: "literature_supported",
    evidence_ids: successfulMatch.evidence_ids,
    artifact_ids: successfulMatch.artifact_ids,
    actor: "phase11-test",
    external_vetoes: successfulMatch.vetoes,
    external_warnings: successfulMatch.warnings
  });
  assert.equal(promotion.gate.ok, true);
  assert.equal(promotion.claim.status, "literature_supported");
  assert.equal(getClaim(projectRoot, project.project_id, claim.id)?.status, "literature_supported");

  const citations = listCitations(projectRoot, project.project_id);
  assert.equal(citations.length, 2);
  assert.equal(listCitationConditionMatches(projectRoot, project.project_id).length, 3);
  assert.equal(readEvidenceRecords(projectRoot, project.project_id).some((record) => record.kind === "literature"), true);
  assert.equal(listArtifactRefs(projectRoot).some((artifact) => artifact.kind === "bibtex"), true);
  assert.equal(readAuditEvents(projectRoot).some((event) => event.event_type === "literature.condition_checked"), true);

  const server = createComathServer();
  const routeImport = await server.inject({
    method: "POST",
    path: "/literature/import-bibtex",
    body: {
      project_root: projectRoot,
      project_id: project.project_id,
      bibtex,
      actor: "phase11-route"
    }
  });
  assert.equal(routeImport.status, 200);
  assert.equal(routeImport.body.entry.key, "etingof2005");

  const routeList = await server.inject({
    method: "GET",
    path: `/literature/list?project_root=${encodeURIComponent(projectRoot)}&project_id=${project.project_id}`
  });
  assert.equal(routeList.status, 200);
  assert.equal(routeList.body.citations.length >= 2, true);
  await server.close();

  const citationCheckSource = readFileSync(join(projectRoot, citation.artifact_path), "utf8");
  assert.equal(citationCheckSource.includes(claim.statement), true);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 11 literature system tests passed.");
