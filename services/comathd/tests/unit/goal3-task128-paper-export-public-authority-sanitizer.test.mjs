import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  appendEvidenceRecord,
  applyGatePromotedClaim,
  exportPaper,
  initPaper,
  initProject,
  registerClaim,
  renderClaimBlock,
  updatePaperSection
} from "../../dist/index.js";

const privilegedProofVocabulary =
  /formally_checked|proven|formal_proof_verified|formal_replay_passed|lean_kernel_clean_replay|verified_final_authority_evidence/i;

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task128-paper-"));

try {
  const { project } = initProject({ name: "Task128 Paper Export Project", root_path: projectRoot });
  const draftClaim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: "Every placeholder proof-shaped paper claim is authority checked.",
    assumptions: ["placeholder historical import"],
    domain: "goal3 public export",
    actor: "task128"
  });
  const forgedFormalClaim = applyGatePromotedClaim(projectRoot, {
    ...draftClaim,
    status: "formally_checked",
    evidence_level: 5,
    gate_result_id: "GR-0128",
    formalization_status: "kernel_checked",
    dependency_closure_status: "all_dependencies_present",
    audit_state: "audit_passed",
    updated_at: new Date().toISOString()
  });
  const evidence = appendEvidenceRecord(projectRoot, {
    project_id: project.project_id,
    claim_id: forgedFormalClaim.id,
    kind: "audit",
    summary: "Historical imported status only; no service-owned FinalReplayManifest v3 or authority packaging hash exists.",
    artifact_ids: []
  });

  initPaper(projectRoot, {
    project_id: project.project_id,
    title: "Task128 Paper Export",
    actor: "task128"
  });
  const block = renderClaimBlock(projectRoot, {
    project_id: project.project_id,
    claim_id: forgedFormalClaim.id,
    wording: "theorem",
    evidence_ids: [evidence.id],
    actor: "task128"
  });

  assert.equal(
    block.vetoes.includes("theorem_wording_requires_final_replay_authority"),
    true,
    "paper theorem wording must require fresh final replay authority, not only claim.status"
  );
  assert.equal(
    privilegedProofVocabulary.test(block.markdown),
    false,
    `public paper block leaked privileged vocabulary: ${block.markdown}`
  );

  updatePaperSection(projectRoot, {
    project_id: project.project_id,
    section_id: "main",
    title: "Main",
    markdown: block.markdown,
    actor: "task128"
  });
  const exported = await exportPaper(projectRoot, {
    project_id: project.project_id,
    format: "md",
    actor: "task128"
  });
  const exportedText = readFileSync(exported.path, "utf8");
  assert.equal(
    privilegedProofVocabulary.test(exportedText),
    false,
    `working-paper export leaked privileged vocabulary: ${exportedText}`
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task128 paper export public authority sanitizer test passed.");
