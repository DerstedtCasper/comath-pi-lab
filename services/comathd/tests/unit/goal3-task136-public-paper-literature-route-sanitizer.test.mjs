import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createComathServer,
  importLiteraturePdf,
  initProject,
  listCitationConditionMatches,
  listCitations,
  readPaperState,
  registerClaim
} from "../../dist/index.js";

const privilegedPublicTerms =
  /\b(?:clean_replay_passed|completed_formal_proof|formally_checked|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|proven|verified_final_authority_evidence)\b/i;

const rawAuthorityText =
  "formal_replay_passed lean_kernel_clean_replay formally_checked proven verified_final_authority_evidence clean_replay_passed completed_formal_proof formal_proof_verified";

function assertPublicBody(body, context) {
  assert.doesNotMatch(JSON.stringify(body), privilegedPublicTerms, context);
}

function assertInternalBodyStillRaw(body, context) {
  assert.match(JSON.stringify(body), privilegedPublicTerms, context);
}

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task136-public-routes-"));
const server = createComathServer();

try {
  const { project } = initProject({ name: "Task136 public route sanitizer", root_path: projectRoot });
  const query = `project_root=${encodeURIComponent(projectRoot)}&project_id=${encodeURIComponent(project.project_id)}`;

  const paperInit = await server.inject({
    method: "POST",
    path: "/paper/init",
    body: {
      project_root: projectRoot,
      project_id: project.project_id,
      title: "Task136 Paper",
      actor: "goal3-task136"
    }
  });
  assert.equal(paperInit.status, 200, JSON.stringify(paperInit.body));

  const paperUpdate = await server.inject({
    method: "POST",
    path: "/paper/update-section",
    body: {
      project_root: projectRoot,
      project_id: project.project_id,
      section_id: "route-leak",
      title: "Route Leak",
      markdown: `Public paper route body must not expose ${rawAuthorityText}.`,
      actor: "goal3-task136"
    }
  });
  assert.equal(paperUpdate.status, 200, JSON.stringify(paperUpdate.body));
  assertPublicBody(paperUpdate.body, "/paper/update-section must sanitize route response vocabulary");

  const paperState = await server.inject({
    method: "GET",
    path: `/paper/state?${query}`
  });
  assert.equal(paperState.status, 200, JSON.stringify(paperState.body));
  assertPublicBody(paperState.body, "/paper/state must sanitize route response vocabulary");
  assertInternalBodyStillRaw(
    readPaperState(projectRoot, project.project_id),
    "paper route sanitizer must not rewrite internal paper state"
  );

  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: "Task136 literature route public responses are non-authoritative.",
    assumptions: ["formal_replay_passed assumption", "lean_kernel_clean_replay assumption"],
    domain: "route sanitizer",
    actor: "goal3-task136"
  });
  const pdfPath = join(projectRoot, "task136-source.pdf");
  writeFileSync(pdfPath, `%PDF-1.4\n${claim.statement}\n${rawAuthorityText}\n`, "utf8");
  const pdf = await importLiteraturePdf(projectRoot, {
    project_id: project.project_id,
    source_path: pdfPath,
    actor: "goal3-task136"
  });

  const citation = await server.inject({
    method: "POST",
    path: "/literature/register-citation",
    body: {
      project_root: projectRoot,
      project_id: project.project_id,
      title: `Untrusted ${rawAuthorityText}`,
      authors: ["Task136"],
      locator: `Appendix ${rawAuthorityText}`,
      artifact_id: pdf.id,
      claim_id: claim.id,
      quoted_statement: claim.statement,
      condition_summary: `Conditions mention ${rawAuthorityText}`,
      assumptions: ["formal_replay_passed assumption", "lean_kernel_clean_replay assumption"],
      actor: "goal3-task136"
    }
  });
  assert.equal(citation.status, 200, JSON.stringify(citation.body));
  assertPublicBody(citation.body, "/literature/register-citation must sanitize route response vocabulary");
  assertInternalBodyStillRaw(
    listCitations(projectRoot, project.project_id),
    "literature route sanitizer must not rewrite internal citation records"
  );

  const condition = await server.inject({
    method: "POST",
    path: "/literature/check-condition",
    body: {
      project_root: projectRoot,
      project_id: project.project_id,
      citation_id: citation.body.citation.id,
      claim_id: claim.id,
      required_assumptions: ["formal_replay_passed assumption", "lean_kernel_clean_replay assumption"],
      actor: "goal3-task136"
    }
  });
  assert.equal(condition.status, 200, JSON.stringify(condition.body));
  assertPublicBody(condition.body, "/literature/check-condition must sanitize route response vocabulary");
  assertInternalBodyStillRaw(
    listCitationConditionMatches(projectRoot, project.project_id),
    "literature route sanitizer must not rewrite internal citation condition records"
  );

  const literatureList = await server.inject({
    method: "GET",
    path: `/literature/list?${query}`
  });
  assert.equal(literatureList.status, 200, JSON.stringify(literatureList.body));
  assertPublicBody(literatureList.body, "/literature/list must sanitize route response vocabulary");
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task136 public paper/literature route sanitizer test passed.");
