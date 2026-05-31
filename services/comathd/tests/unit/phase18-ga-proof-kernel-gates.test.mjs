import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  appendEvidenceRecord,
  appendLeanRunManifestProvenanceIndexV1,
  applyGatePromotedClaim,
  checkStatementEquivalence,
  createServiceOwnedLeanRunManifestV3,
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

function writeVerifiedLeanRunManifest({ campaignId, claim, candidateId }) {
  const inputRel = `.comath/evidence/${claim.id}/lean/${candidateId}/Target.lean`;
  const toolchainRel = `.comath/evidence/${claim.id}/lean/${candidateId}/lean-toolchain`;
  const stdoutRel = `.comath/evidence/${claim.id}/lean/${candidateId}/stdout.log`;
  const stderrRel = `.comath/evidence/${claim.id}/lean/${candidateId}/stderr.log`;
  const manifestRel = `.comath/evidence/${claim.id}/lean/${candidateId}/lean_run_manifest_v3.json`;
  writeProjectFile(inputRel, "theorem C0001 : True := by trivial\n");
  writeProjectFile(toolchainRel, "leanprover/lean4:v4.23.0\n");
  writeProjectFile(stdoutRel, "ok\n");
  writeProjectFile(stderrRel, "");
  const manifest = createServiceOwnedLeanRunManifestV3({
    projectRoot,
    run_id: "LRUN-0002",
    claim_id: claim.id,
    campaign_id: campaignId,
    candidate_id: candidateId,
    purpose: "check",
    command: ["lake", "build", "MathResearch.C0001"],
    cwd: join(projectRoot, `.comath/evidence/${claim.id}/lean/${candidateId}`),
    input_files: [join(projectRoot, inputRel), join(projectRoot, toolchainRel)],
    lean_version: "4.23.0",
    lake_version: "5.0.0",
    elan_toolchain: "leanprover/lean4:v4.23.0",
    lean_toolchain_file: join(projectRoot, toolchainRel),
    network_policy: "disabled",
    sandbox: "none",
    exit_code: 0,
    stdout_path: join(projectRoot, stdoutRel),
    stderr_path: join(projectRoot, stderrRel),
    started_at: "2026-06-01T00:00:00.000Z",
    ended_at: "2026-06-01T00:00:01.000Z",
    proof_authority: "lean_kernel_check"
  });
  writeProjectFile(manifestRel, `${JSON.stringify(manifest, null, 2)}\n`);
  appendLeanRunManifestProvenanceIndexV1({
    projectRoot,
    project_id: claim.project_id,
    actor: "phase18-gates",
    manifest,
    manifest_path: join(projectRoot, manifestRel)
  });
  return manifestRel;
}

function writeCandidateManifest(candidate, extra = {}) {
  const manifestPath = join(candidate.workspace_path, "candidate_manifest.json");
  writeProjectFile(
    manifestPath,
    `${JSON.stringify(
      {
        candidate_id: candidate.candidate_id,
        campaign_id: candidate.campaign_id,
        variant_id: candidate.variant_id,
        stage: candidate.stage,
        obligation_id: candidate.obligation_id,
        workspace_path: candidate.workspace_path,
        locked_statement_hash: candidate.locked_statement_hash,
        candidate_statement_hash: candidate.candidate_statement_hash,
        state: candidate.state,
        statement_equivalence_claim:
          candidate.candidate_statement_hash === candidate.locked_statement_hash ? "exact" : "different",
        theorem_family: "nat_add_zero",
        canonical_proposition: "n + 0 = n",
        primary_dependency: "Nat.add_zero",
        dependencies: ["Nat.add_zero"],
        assumptions: [],
        introduced_assumptions: [],
        introduced_dependencies: ["Nat.add_zero"],
        artifacts: [],
        lean_files: [],
        logs: [],
        evidence: [],
        hard_vetoes: candidate.hard_vetoes,
        failures: [],
        replay_command: candidate.replay_command ?? "",
        summary: "Phase 18 hand-built candidate fixture.",
        maintainability_notes: "Fixture mirrors v3 candidate manifest contract for arbitration validation.",
        ...extra
      },
      null,
      2
    )}\n`
  );
  return manifestPath.replace(/\\/g, "/");
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
  exactCandidate.manifest_path = writeCandidateManifest(exactCandidate);
  driftCandidate.manifest_path = writeCandidateManifest(driftCandidate);
  const campaign = {
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
  };
  const missingReplay = decideCandidate({
    projectRoot,
    campaign,
    candidates: [driftCandidate, exactCandidate]
  });
  assert.equal(missingReplay.decision.selected_candidate_id, null);
  assert.equal(missingReplay.gate.result, "blocked");
  assert.equal(
    missingReplay.decision.rejected_candidates.some(
      (item) => item.candidate_id === "CAND-0002" && item.reason === "missing service-owned Lean replay evidence"
    ),
    true
  );

  exactCandidate.manifest_path = writeCandidateManifest(exactCandidate, {
    evidence: [writeVerifiedLeanRunManifest({ campaignId: campaign.campaign_id, claim, candidateId: exactCandidate.candidate_id })]
  });
  const { decision, gate } = decideCandidate({
    projectRoot,
    campaign,
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
