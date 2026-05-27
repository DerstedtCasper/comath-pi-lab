import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  appendEvidenceRecord,
  applyGatePromotedClaim,
  checkStatementEquivalence,
  decideCandidate,
  importArtifact,
  initProject,
  promoteClaim,
  registerClaim,
  runStaticCheatScan
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-ga-gates-"));

function writeProjectFile(relativePath, content) {
  const path = join(projectRoot, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
  return path;
}

try {
  const { project } = initProject({ name: "GA Proof Kernel Gates", root_path: projectRoot });
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: "For every natural number n, n + 0 = n.",
    assumptions: ["n : Nat"],
    domain: "elementary",
    status: "conjectural",
    actor: "phase18-gates"
  });

  const proofPath = writeProjectFile(
    join(".comath", "lean", "MathResearch", "C0001.lean"),
    "namespace MathResearch\n\ntheorem C0001 (n : Nat) : n + 0 = n := Nat.add_zero n\n\nend MathResearch\n"
  );
  const proofArtifact = await importArtifact({
    projectRoot,
    project_id: project.project_id,
    source_path: proofPath,
    kind: "code",
    actor: "phase18-gates"
  });
  const leanEvidence = appendEvidenceRecord(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    kind: "lean",
    summary: "A Lean source file exists, but no proof-kernel final replay manifest was produced.",
    artifact_ids: [proofArtifact.id]
  });
  applyGatePromotedClaim(projectRoot, {
    ...claim,
    formalization_status: "kernel_checked",
    dependency_closure_status: "all_dependencies_present",
    audit_state: "audit_passed",
    updated_at: new Date().toISOString()
  });

  const promotion = promoteClaim(projectRoot, {
    project_id: project.project_id,
    claim_id: claim.id,
    target_status: "formally_checked",
    evidence_ids: [leanEvidence.id],
    artifact_ids: [proofArtifact.id],
    actor: "phase18-gates"
  });

  assert.equal(promotion.gate.ok, false);
  assert.equal(promotion.claim.status, "conjectural");
  assert.equal(
    promotion.gate.vetoes.includes("formally_checked requires passed proof-kernel final replay manifest"),
    true
  );

  const cheatLeanRoot = join(projectRoot, ".comath", "cheat-scan-lean");
  writeProjectFile(join(".comath", "cheat-scan-lean", "Bad.lean"), "axiom bad : False\nexample : False := by sorry\n");
  const cheatScan = runStaticCheatScan({ projectRoot, leanRoot: cheatLeanRoot });
  assert.equal(cheatScan.result, "fail");
  assert.equal(cheatScan.hard_vetoes.includes("axiom_detected"), true);
  assert.equal(cheatScan.hard_vetoes.includes("sorry_detected"), true);

  const driftReport = checkStatementEquivalence({
    projectRoot,
    reportPath: join(".comath", "evidence", claim.id, "lean", "statement_drift.json"),
    locked_statement_hash: claim.statement_hash,
    formal_spec_statement: "MathResearch.C0001 (n : Nat) : n + 0 = n",
    lean_check_output: "MathResearch.C0001 (n : Nat) : 0 + n = n",
    theorem_name: "MathResearch.C0001"
  });
  assert.equal(driftReport.result, "fail");
  assert.equal(driftReport.hard_vetoes.includes("statement_drift"), true);

  const exactCandidate = {
    candidate_id: "CAND-0002",
    campaign_id: "CAM-0001",
    stage: "lemma_sprint",
    obligation_id: "PO-0001",
    variant_id: "V2",
    workspace_path: ".comath/ensembles/exact",
    locked_statement_hash: claim.statement_hash,
    candidate_statement_hash: claim.statement_hash,
    state: "candidate_kernel_checked",
    score: 10,
    hard_vetoes: [],
    artifacts: [],
    replay_command: "lake build MathResearch.C0001"
  };
  const driftCandidate = {
    ...exactCandidate,
    candidate_id: "CAND-0001",
    variant_id: "V1",
    workspace_path: ".comath/ensembles/drift",
    candidate_statement_hash: `${claim.statement_hash}-drift`,
    score: 999
  };
  const { decision, gate } = decideCandidate({
    projectRoot,
    campaign: {
      campaign_id: "CAM-0001",
      project_id: project.project_id,
      root_claim_id: claim.id,
      user_goal: claim.statement,
      current_stage: "candidate_arbitration",
      status: "running",
      strict_mode: true,
      stage_runs: [],
      open_obligations: [],
      accepted_artifacts: [],
      blockers: [],
      next_actions: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    candidates: [driftCandidate, exactCandidate]
  });
  assert.equal(decision.selected_candidate_id, "CAND-0002");
  assert.equal(gate.result, "pass");
  assert.equal(
    decision.rejected_candidates.some(
      (item) => item.candidate_id === "CAND-0001" && item.reason === "statement drift from locked obligation"
    ),
    true
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 18 GA proof-kernel gate tests passed.");
