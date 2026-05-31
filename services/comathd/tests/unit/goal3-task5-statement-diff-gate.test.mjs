import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  createServiceOwnedLeanRunManifestV3,
  createStatementDriftRedTeamReport,
  decideCandidate,
  evaluateStatementDiffGate,
  initProject,
  registerClaim
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task5-statement-diff-gate-"));
let runCounter = 5000;

const lock = {
  claim_id: "C-0001",
  campaign_id: "CAM-0005",
  theorem_header: "theorem add_zero_nat",
  theorem_type_pretty: "(n : Nat) : n + 0 = n",
  statement_hash: "locked-hash",
  variables: [{ name: "n", type: "Nat", binder: "explicit" }],
  assumptions: []
};

function check(candidate) {
  return evaluateStatementDiffGate({
    projectRoot,
    formal_spec_lock: lock,
    assumption_ledger_entries: [],
    candidate_statement: {
      theorem_header: lock.theorem_header,
      theorem_type_pretty: lock.theorem_type_pretty,
      statement_hash: lock.statement_hash,
      statement_equivalence_claim: "exact",
      introduced_assumptions: [],
      ...candidate
    }
  });
}

function writeProjectFile(relativePath, content) {
  const path = join(projectRoot, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
  return path;
}

function writeVerifiedLeanRunManifest({ campaignId = "CAM-0005", claimId = "C-0001", candidateId = "CAND-0005" } = {}) {
  const relRoot = `.comath/evidence/${claimId}/lean/${candidateId}/equivalence-${++runCounter}`;
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
    run_id: `LRUN-${runCounter}`,
    claim_id: claimId,
    campaign_id: campaignId,
    candidate_id: candidateId,
    purpose: "audit",
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
        statement_equivalence_claim: "exact",
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
        evidence: [".comath/evidence/C-0001/lean/service_owned_lean_run_manifest.json"],
        hard_vetoes: candidate.hard_vetoes,
        failures: [],
        replay_command: candidate.replay_command ?? "lake build MathResearch.Candidate",
        summary: "Goal 3 Task 5 candidate arbitration fixture.",
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
  const exact = check({});
  assert.equal(exact.result, "pass");
  assert.deepEqual(exact.hard_vetoes, []);
  assert.equal(exact.equivalence_mode, "exact");

  const weakened = check({ statement_equivalence_claim: "weaker" });
  assert.equal(weakened.result, "fail");
  assert.equal(weakened.hard_vetoes.includes("statement_weakened"), true);

  const strengthened = check({ statement_equivalence_claim: "stronger" });
  assert.equal(strengthened.result, "fail");
  assert.equal(strengthened.hard_vetoes.includes("statement_strengthened"), true);

  const different = check({ theorem_header: "theorem add_zero_int", statement_hash: "different-hash" });
  assert.equal(different.result, "fail");
  assert.equal(different.hard_vetoes.includes("statement_drift"), true);
  assert.equal(different.hard_vetoes.includes("theorem_header_mismatch"), true);

  const hiddenAssumption = check({ introduced_assumptions: ["h : n > 0"] });
  assert.equal(hiddenAssumption.result, "fail");
  assert.equal(hiddenAssumption.hard_vetoes.includes("hidden_assumption"), true);

  const wrongDomain = check({ theorem_type_pretty: "(z : Int) : z + 0 = z", domain_markers: ["Int"] });
  assert.equal(wrongDomain.result, "fail");
  assert.equal(wrongDomain.hard_vetoes.includes("wrong_domain"), true);

  const quantifierMismatch = check({ theorem_type_pretty: "exists n : Nat, n + 0 = n", quantifier_markers: ["exists"] });
  assert.equal(quantifierMismatch.result, "fail");
  assert.equal(quantifierMismatch.hard_vetoes.includes("wrong_quantifier"), true);

  const metadataOnlyEquivalent = check({
    statement_equivalence_claim: "equivalent",
    equivalence_witness: { kind: "registered_logical_equivalence" }
  });
  assert.equal(metadataOnlyEquivalent.result, "fail");
  assert.equal(metadataOnlyEquivalent.requires_lean_equivalence_replay, true);
  assert.equal(metadataOnlyEquivalent.hard_vetoes.includes("lean_equivalence_replay_required"), true);

  const replayedEquivalent = check({
    statement_equivalence_claim: "equivalent",
    equivalence_witness: {
      kind: "lean_kernel_checked_equivalence_replay",
      lean_run_manifest_path: writeVerifiedLeanRunManifest()
    }
  });
  assert.equal(replayedEquivalent.result, "pass");
  assert.equal(replayedEquivalent.equivalence_mode, "lean_replayed_equivalent");

  const redTeam = createStatementDriftRedTeamReport({
    gate_reports: [weakened, hiddenAssumption, wrongDomain, quantifierMismatch],
    counterexample_findings: ["boundary case n = 0 remains unresolved"]
  });
  assert.equal(redTeam.result, "fail");
  assert.equal(redTeam.hard_vetoes.includes("statement_weakened"), true);
  assert.equal(redTeam.hard_vetoes.includes("hidden_assumption"), true);
  assert.equal(redTeam.hard_vetoes.includes("wrong_domain"), true);
  assert.equal(redTeam.hard_vetoes.includes("wrong_quantifier"), true);
  assert.equal(redTeam.hard_vetoes.includes("unresolved_counterexample"), true);
  assert.equal(redTeam.proof_authority, "none");

  const { project } = initProject({ name: "Goal 3 Task 5", root_path: projectRoot });
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: "For every natural number n, n + 0 = n.",
    assumptions: [],
    domain: "elementary",
    status: "conjectural",
    actor: "goal3-task5"
  });
  const campaign = {
    campaign_id: "CAM-0005",
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
  const metadataOnlyCandidate = {
    candidate_id: "CAND-0005",
    campaign_id: campaign.campaign_id,
    stage: "lemma_sprint",
    obligation_id: "PO-0001",
    variant_id: "V1",
    workspace_path: ".comath/ensembles/goal3-task5/metadata-only",
    locked_statement_hash: claim.statement_hash,
    candidate_statement_hash: claim.statement_hash,
    state: "candidate_kernel_checked",
    score: 99_999,
    hard_vetoes: [],
    artifacts: [],
    replay_command: "lake build MathResearch.Candidate"
  };
  metadataOnlyCandidate.manifest_path = writeCandidateManifest(metadataOnlyCandidate, {
    statement_equivalence_claim: "equivalent",
    evidence: [".comath/evidence/C-0001/lean/service_owned_lean_run_manifest.json"]
  });
  const decision = decideCandidate({ projectRoot, campaign, candidates: [metadataOnlyCandidate] });
  assert.equal(decision.decision.selected_candidate_id, null);
  assert.equal(decision.gate.result, "blocked");
  assert.equal(decision.decision.hard_vetoes.includes("lean_equivalence_replay_required"), true);
  assert.equal(decision.gate.hard_vetoes.includes("lean_equivalence_replay_required"), true);
  assert.equal(
    decision.decision.rejected_candidates.some(
      (item) => item.candidate_id === "CAND-0005" && /artifact-backed Lean equivalence replay/i.test(item.reason)
    ),
    true
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 5 StatementDiffGate tests passed.");
