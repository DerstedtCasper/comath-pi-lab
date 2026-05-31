import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  appendLeanRunManifestProvenanceIndexV1,
  checkStatementEquivalence,
  createServiceOwnedLeanRunManifestV3,
  decideCandidate,
  evaluateStatementDiffGate,
  initProject,
  registerClaim
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task112-statement-equivalence-artifact-gate-"));
let runCounter = 1120;

function writeProjectFile(relativePath, content) {
  const path = join(projectRoot, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
  return path;
}

function writeVerifiedLeanRunManifest({ campaignId, claimId, candidateId, purpose = "check", relRoot = `.comath/evidence/${claimId}/lean/${candidateId}` }) {
  const inputRel = `${relRoot}/Target.lean`;
  const toolchainRel = `${relRoot}/lean-toolchain`;
  const stdoutRel = `${relRoot}/stdout.log`;
  const stderrRel = `${relRoot}/stderr.log`;
  const manifestRel = `${relRoot}/lean_run_manifest_v3.json`;
  writeProjectFile(inputRel, "theorem C0001 : True := by trivial\n");
  writeProjectFile(toolchainRel, "leanprover/lean4:v4.23.0\n");
  writeProjectFile(stdoutRel, "ok\n");
  writeProjectFile(stderrRel, "");
  const manifest = createServiceOwnedLeanRunManifestV3({
    projectRoot,
    run_id: `LRUN-${++runCounter}`,
    claim_id: claimId,
    campaign_id: campaignId,
    candidate_id: candidateId,
    purpose,
    command: ["lake", "build", "MathResearch.C0001", "Audit.C0001"],
    cwd: join(projectRoot, relRoot),
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
    project_id: claimId,
    actor: "goal3-task112",
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
        statement_equivalence_claim: "equivalent",
        theorem_family: undefined,
        canonical_proposition: undefined,
        primary_dependency: "MathResearch.candidate",
        dependencies: ["MathResearch.candidate"],
        assumptions: [],
        introduced_assumptions: [],
        introduced_dependencies: ["MathResearch.candidate"],
        artifacts: [],
        lean_files: [],
        logs: [],
        evidence: [],
        hard_vetoes: [],
        failures: [],
        replay_command: candidate.replay_command,
        summary: "Goal 3 Task112 statement-equivalence artifact gate fixture.",
        maintainability_notes: "small clean proof",
        ...extra
      },
      null,
      2
    )}\n`
  );
  return manifestPath.replace(/\\/g, "/");
}

try {
  const { project } = initProject({ name: "Goal 3 Task112", root_path: projectRoot });
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: "For every natural number n, n + 0 = n.",
    assumptions: [],
    domain: "elementary",
    status: "conjectural",
    actor: "goal3-task112"
  });
  const campaign = {
    campaign_id: "CAM-0112",
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
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: "2026-06-01T00:00:00.000Z"
  };
  const candidate = {
    candidate_id: "CAND-0112",
    campaign_id: campaign.campaign_id,
    stage: "lemma_sprint",
    obligation_id: "PO-0112",
    variant_id: "V7",
    workspace_path: ".comath/ensembles/goal3-task112/equivalent-marker-only",
    locked_statement_hash: claim.statement_hash,
    candidate_statement_hash: claim.statement_hash,
    state: "candidate_kernel_checked",
    score: 99_999,
    hard_vetoes: [],
    artifacts: [],
    replay_command: "lake build MathResearch.Candidate"
  };
  const ordinaryManifest = writeVerifiedLeanRunManifest({
    campaignId: campaign.campaign_id,
    claimId: claim.id,
    candidateId: candidate.candidate_id
  });
  candidate.manifest_path = writeCandidateManifest(candidate, {
    evidence: [ordinaryManifest, "lean_equivalence_replay:CAND-0112"]
  });

  const markerOnlyDecision = decideCandidate({ projectRoot, campaign, candidates: [candidate] });
  assert.equal(markerOnlyDecision.decision.selected_candidate_id, null);
  assert.equal(markerOnlyDecision.gate.result, "blocked");
  assert.equal(markerOnlyDecision.decision.hard_vetoes.includes("lean_equivalence_replay_required"), true);
  assert.equal(
    markerOnlyDecision.decision.rejected_candidates.some(
      (item) => item.candidate_id === "CAND-0112" && /artifact-backed Lean equivalence replay/i.test(item.reason)
    ),
    true
  );

  const lock = {
    claim_id: claim.id,
    campaign_id: campaign.campaign_id,
    theorem_header: "theorem add_zero_nat",
    theorem_type_pretty: "(n : Nat) : n + 0 = n",
    statement_hash: claim.statement_hash,
    variables: [{ name: "n", type: "Nat" }],
    assumptions: []
  };
  const idOnlyGate = evaluateStatementDiffGate({
    projectRoot,
    formal_spec_lock: lock,
    assumption_ledger_entries: [],
    candidate_statement: {
      theorem_header: lock.theorem_header,
      theorem_type_pretty: lock.theorem_type_pretty,
      statement_hash: claim.statement_hash,
      statement_equivalence_claim: "equivalent",
      introduced_assumptions: [],
      equivalence_witness: {
        kind: "lean_kernel_checked_equivalence_replay",
        lean_run_manifest_id: "LRUN-FAKE-ID"
      }
    }
  });
  assert.equal(idOnlyGate.result, "fail");
  assert.equal(idOnlyGate.hard_vetoes.includes("lean_equivalence_replay_required"), true);

  const equivalenceManifest = writeVerifiedLeanRunManifest({
    campaignId: campaign.campaign_id,
    claimId: claim.id,
    candidateId: candidate.candidate_id,
    purpose: "audit",
    relRoot: `.comath/evidence/${claim.id}/lean/${candidate.candidate_id}/equivalence`
  });
  const artifactBackedGate = evaluateStatementDiffGate({
    projectRoot,
    formal_spec_lock: lock,
    assumption_ledger_entries: [],
    candidate_statement: {
      theorem_header: lock.theorem_header,
      theorem_type_pretty: lock.theorem_type_pretty,
      statement_hash: claim.statement_hash,
      statement_equivalence_claim: "equivalent",
      introduced_assumptions: [],
      equivalence_witness: {
        kind: "lean_kernel_checked_equivalence_replay",
        lean_run_manifest_path: equivalenceManifest
      }
    }
  });
  assert.equal(artifactBackedGate.result, "pass");
  assert.equal(artifactBackedGate.equivalence_mode, "lean_replayed_equivalent");

  const registeredEquivalence = {
    formal_spec_statement: "MathResearch.C0001 (n : Nat) : n + 0 = n",
    equivalent_signature: "MathResearch.C0001 (n : Nat) : Nat.add n 0 = n",
    witness_kind: "lean_kernel_checked_equivalence",
    witness_artifact_id: "equivalence-witness-task112",
    witness_artifact_sha256: `sha256:${"a".repeat(64)}`,
    lemma_names: ["Nat.add_zero"],
    justification: "Lean replay proves the locked and target statement are equivalent."
  };
  const metadataOnlyEquivalenceReport = checkStatementEquivalence({
    projectRoot,
    campaign_id: campaign.campaign_id,
    claim_id: claim.id,
    candidate_id: candidate.candidate_id,
    reportPath: ".comath/reports/goal3-task112/metadata-only-equivalence-report.json",
    locked_statement_hash: claim.statement_hash,
    formal_spec_statement: registeredEquivalence.formal_spec_statement,
    lean_check_output: `${registeredEquivalence.equivalent_signature}\n`,
    theorem_name: "MathResearch.C0001",
    allowed_registered_logical_equivalences: [registeredEquivalence]
  });
  assert.equal(metadataOnlyEquivalenceReport.result, "fail");
  assert.equal(metadataOnlyEquivalenceReport.hard_vetoes.includes("statement_signature_mismatch"), true);

  const artifactBackedEquivalenceReport = checkStatementEquivalence({
    projectRoot,
    campaign_id: campaign.campaign_id,
    claim_id: claim.id,
    candidate_id: candidate.candidate_id,
    reportPath: ".comath/reports/goal3-task112/artifact-backed-equivalence-report.json",
    locked_statement_hash: claim.statement_hash,
    formal_spec_statement: registeredEquivalence.formal_spec_statement,
    lean_check_output: `${registeredEquivalence.equivalent_signature}\n`,
    theorem_name: "MathResearch.C0001",
    allowed_registered_logical_equivalences: [
      {
        ...registeredEquivalence,
        witness_artifact_path: equivalenceManifest
      }
    ]
  });
  assert.equal(artifactBackedEquivalenceReport.result, "pass");
  assert.equal(artifactBackedEquivalenceReport.status, "logically_equivalent_with_registered_lemmas");

  const artifactBackedCandidate = {
    ...candidate,
    candidate_id: "CAND-0113",
    workspace_path: ".comath/ensembles/goal3-task112/equivalent-artifact-backed"
  };
  const ordinaryManifest2 = writeVerifiedLeanRunManifest({
    campaignId: campaign.campaign_id,
    claimId: claim.id,
    candidateId: artifactBackedCandidate.candidate_id
  });
  const equivalenceManifest2 = writeVerifiedLeanRunManifest({
    campaignId: campaign.campaign_id,
    claimId: claim.id,
    candidateId: artifactBackedCandidate.candidate_id,
    purpose: "audit",
    relRoot: `.comath/evidence/${claim.id}/lean/${artifactBackedCandidate.candidate_id}/equivalence`
  });
  artifactBackedCandidate.manifest_path = writeCandidateManifest(artifactBackedCandidate, {
    evidence: [ordinaryManifest2, `equivalence_lean_run_manifest:${equivalenceManifest2}`]
  });
  const artifactBackedDecision = decideCandidate({ projectRoot, campaign, candidates: [artifactBackedCandidate] });
  assert.equal(artifactBackedDecision.decision.selected_candidate_id, "CAND-0113");
  assert.equal(artifactBackedDecision.gate.result, "pass");
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task112 statement-equivalence artifact gate tests passed.");
