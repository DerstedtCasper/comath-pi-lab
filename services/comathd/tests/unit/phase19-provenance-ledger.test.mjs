import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  appendProvenanceEvent,
  checkPaper,
  initPaper,
  initProject,
  readPaperSpans,
  readProvenanceEvents,
  registerClaim,
  renderClaimBlock,
  updatePaperSection,
  writePaperSpans
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-provenance-"));

try {
  const { project } = initProject({ name: "Provenance Project", root_path: projectRoot });

  const event = appendProvenanceEvent(projectRoot, {
    project_id: project.project_id,
    event_type: "claim.registered",
    actor: "phase19-test",
    target_id: "C-0001",
    payload: { source: "unit-test" }
  });
  assert.match(event.id, /^PV-\d{4,}$/);
  assert.notEqual(event.id, "PV-0001", "append-only provenance IDs must not be read-count allocated");
  assert.equal(readProvenanceEvents(projectRoot, project.project_id).length, 1);
  assert.equal(existsSync(join(projectRoot, ".comath", "provenance", "events.jsonl")), true);
  assert.throws(
    () =>
      appendProvenanceEvent(projectRoot, {
        project_id: "bad",
        event_type: "invalid",
        actor: "phase19-test"
      }),
    /Invalid/
  );

  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: "Every object in this test category is isomorphic to itself.",
    assumptions: ["test category"],
    domain: "category theory",
    actor: "phase19-test"
  });
  initPaper(projectRoot, {
    project_id: project.project_id,
    title: "Provenance Paper",
    actor: "phase19-test"
  });
  const block = renderClaimBlock(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    wording: "claim",
    evidence_ids: [],
    source_workstreams: ["WS-0001"],
    blockers: ["needs proof"],
    actor: "phase19-test"
  });
  updatePaperSection(projectRoot, {
    project_id: project.project_id,
    section_id: "s1",
    title: "Section",
    markdown: `${block.markdown}\n\nBlockers: needs proof.\n`,
    actor: "phase19-test"
  });
  const spans = readPaperSpans(projectRoot, project.project_id);
  assert.equal(spans.length, 1);
  assert.equal(spans[0].claim_id, claim.id);
  assert.deepEqual(spans[0].margin_note_ids, [block.note.id]);
  assert.equal(readProvenanceEvents(projectRoot, project.project_id).some((item) => item.event_type === "paper.span_recorded"), true);

  writePaperSpans(projectRoot, [{ ...spans[0], margin_note_ids: ["PMN-9999"] }]);
  const check = checkPaper(projectRoot, { project_id: project.project_id });
  assert.equal(check.ok, false);
  assert.equal(check.vetoes.includes("missing_span_margin_note"), true);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 19 provenance ledger tests passed.");
