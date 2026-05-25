import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  appendEvidenceRecord,
  checkPaper,
  createComathServer,
  exportPaper,
  getClaim,
  initPaper,
  initProject,
  readAuditEvents,
  readMarginNotes,
  readPaperState,
  registerClaim,
  renderClaimBlock,
  updateClaim,
  updatePaperSection
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-paper-"));

try {
  const { project } = initProject({ name: "Working Paper Project", root_path: projectRoot });
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: "Every braided finite tensor category admits a categorical trace.",
    assumptions: ["braided", "finite tensor category"],
    domain: "tensor category theory",
    actor: "phase12-test"
  });
  const evidence = appendEvidenceRecord(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    kind: "literature",
    summary: "Citation condition match for categorical trace assumptions",
    artifact_ids: ["AR-0001"]
  });

  const initialized = initPaper(projectRoot, {
    project_id: project.project_id,
    title: "Braid Statistics Notes",
    actor: "phase12-test"
  });
  assert.equal(initialized.manifest.project_id, project.project_id);
  assert.equal(existsSync(join(projectRoot, ".comath", "artifacts", "papers", "main.md")), true);
  assert.equal(existsSync(join(projectRoot, ".comath", "artifacts", "papers", "main.tex")), true);
  assert.equal(existsSync(join(projectRoot, ".comath", "artifacts", "papers", "references.bib")), true);
  assert.equal(existsSync(join(projectRoot, ".comath", "artifacts", "papers", "margin_notes.json")), true);

  const idempotent = initPaper(projectRoot, {
    project_id: project.project_id,
    title: "Braid Statistics Notes",
    actor: "phase12-test"
  });
  assert.equal(idempotent.manifest.paper_id, initialized.manifest.paper_id);

  const conjectureBlock = renderClaimBlock(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    wording: "conjecture",
    evidence_ids: [evidence.id],
    source_workstreams: ["WS-0001"],
    warnings: ["requires literature refinement"],
    blockers: ["missing formal proof"],
    actor: "phase12-test"
  });
  assert.equal(conjectureBlock.markdown.includes(`claim:${claim.id}`), true);
  assert.equal(conjectureBlock.markdown.includes(`margin_note:${conjectureBlock.note.id}`), true);
  assert.equal(conjectureBlock.markdown.includes("status: draft"), true);
  assert.equal(conjectureBlock.markdown.includes("missing formal proof"), true);
  assert.equal(conjectureBlock.note.claim_id, claim.id);
  assert.deepEqual(conjectureBlock.note.evidence_ids, [evidence.id]);

  const notes = readMarginNotes(projectRoot, project.project_id);
  assert.equal(notes.length, 1);
  assert.equal(notes[0].claim_id, claim.id);
  assert.deepEqual(notes[0].source_workstreams, ["WS-0001"]);

  updatePaperSection(projectRoot, {
    project_id: project.project_id,
    section_id: "introduction",
    title: "Introduction",
    markdown: `# Introduction\n\n${conjectureBlock.markdown}\n`,
    actor: "phase12-test"
  });
  const state = readPaperState(projectRoot, project.project_id);
  assert.equal(state.manifest.sections.some((section) => section.id === "introduction"), true);
  assert.equal(state.markdown.includes("Braid Statistics Notes"), true);
  assert.equal(state.markdown.includes(`claim:${claim.id}`), true);

  const theoremAttempt = renderClaimBlock(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    wording: "theorem",
    evidence_ids: [evidence.id],
    actor: "phase12-test"
  });
  assert.equal(theoremAttempt.vetoes.includes("theorem_wording_requires_formally_checked_claim"), true);

  const overclaimCheck = checkPaper(projectRoot, { project_id: project.project_id });
  assert.equal(overclaimCheck.ok, false);
  assert.equal(overclaimCheck.vetoes.includes("hidden_blocker"), true);

  updatePaperSection(projectRoot, {
    project_id: project.project_id,
    section_id: "introduction",
    title: "Introduction",
    markdown: `# Introduction\n\n${conjectureBlock.markdown}\n\nBlockers: missing formal proof.\n`,
    actor: "phase12-test"
  });
  const cleanCheck = checkPaper(projectRoot, { project_id: project.project_id });
  assert.equal(cleanCheck.ok, true);
  assert.equal(cleanCheck.vetoes.length, 0);

  const unboundBlock = conjectureBlock.markdown.replace(/;\s*margin_note:\s*PMN-\d{4,}/, "");
  updatePaperSection(projectRoot, {
    project_id: project.project_id,
    section_id: "introduction",
    title: "Introduction",
    markdown: `# Introduction\n\n${unboundBlock}\n\nBlockers: missing formal proof.\n`,
    actor: "phase12-test"
  });
  const unboundCheck = checkPaper(projectRoot, { project_id: project.project_id });
  assert.equal(unboundCheck.ok, false);
  assert.equal(unboundCheck.vetoes.includes("missing_margin_provenance"), true);

  const mismatchedBlock = conjectureBlock.markdown.replace(/margin_note:\s*PMN-\d{4,}/, "margin_note:PMN-9999");
  updatePaperSection(projectRoot, {
    project_id: project.project_id,
    section_id: "introduction",
    title: "Introduction",
    markdown: `# Introduction\n\n${mismatchedBlock}\n\nBlockers: missing formal proof.\n`,
    actor: "phase12-test"
  });
  const mismatchedCheck = checkPaper(projectRoot, { project_id: project.project_id });
  assert.equal(mismatchedCheck.ok, false);
  assert.equal(mismatchedCheck.vetoes.includes("missing_margin_provenance"), true);

  updatePaperSection(projectRoot, {
    project_id: project.project_id,
    section_id: "introduction",
    title: "Introduction",
    markdown: `# Introduction\n\n${conjectureBlock.markdown}\n\nBlockers: missing formal proof.\n`,
    actor: "phase12-test"
  });

  const mdExport = await exportPaper(projectRoot, {
    project_id: project.project_id,
    format: "md",
    actor: "phase12-test"
  });
  assert.equal(mdExport.artifact.kind, "paper");
  assert.equal(existsSync(join(projectRoot, mdExport.artifact.path)), true);
  const texExport = await exportPaper(projectRoot, {
    project_id: project.project_id,
    format: "tex",
    actor: "phase12-test"
  });
  assert.equal(texExport.artifact.kind, "tex");
  assert.equal(getClaim(projectRoot, project.project_id, claim.id)?.status, "draft");

  const server = createComathServer();
  const routeInit = await server.inject({
    method: "POST",
    path: "/paper/init",
    body: {
      project_root: projectRoot,
      project_id: project.project_id,
      title: "Route Paper",
      actor: "phase12-route"
    }
  });
  assert.equal(routeInit.status, 200);
  assert.equal(routeInit.body.manifest.project_id, project.project_id);

  const routeUpdate = await server.inject({
    method: "POST",
    path: "/paper/update-section",
    body: {
      project_root: projectRoot,
      project_id: project.project_id,
      section_id: "route-section",
      title: "Route Section",
      markdown: "Route section text.",
      actor: "phase12-route"
    }
  });
  assert.equal(routeUpdate.status, 200);
  assert.equal(routeUpdate.body.manifest.sections.some((section) => section.id === "route-section"), true);

  const routeCheck = await server.inject({
    method: "GET",
    path: `/paper/check?project_root=${encodeURIComponent(projectRoot)}&project_id=${project.project_id}`
  });
  assert.equal(routeCheck.status, 200);
  assert.equal(Array.isArray(routeCheck.body.vetoes), true);

  const routeExport = await server.inject({
    method: "POST",
    path: "/paper/export",
    body: {
      project_root: projectRoot,
      project_id: project.project_id,
      format: "md",
      actor: "phase12-route"
    }
  });
  assert.equal(routeExport.status, 200);
  assert.equal(routeExport.body.artifact.kind, "paper");
  await server.close();

  const updatedClaim = updateClaim(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    actor: "phase12-test",
    patch: { statement: "Every braided finite tensor category admits a modified trace." }
  });
  assert.notEqual(updatedClaim.statement_hash, claim.statement_hash);
  const staleCheck = checkPaper(projectRoot, { project_id: project.project_id });
  assert.equal(staleCheck.ok, false);
  assert.equal(staleCheck.vetoes.includes("stale_claim_statement"), true);

  writeFileSync(join(projectRoot, ".comath", "artifacts", "papers", "margin_notes.json"), "[{}]\n", "utf8");
  const tamperedCheck = checkPaper(projectRoot, { project_id: project.project_id });
  assert.equal(tamperedCheck.ok, false);
  assert.equal(tamperedCheck.vetoes.includes("invalid_margin_notes"), true);

  const auditEvents = readAuditEvents(projectRoot);
  assert.equal(auditEvents.some((event) => event.event_type === "paper.initialized"), true);
  assert.equal(auditEvents.some((event) => event.event_type === "paper.section_updated"), true);
  assert.equal(auditEvents.some((event) => event.event_type === "paper.exported"), true);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 12 working paper tests passed.");
