import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { decideCandidate, initProject, registerClaim, runTrivialNatAddZeroCandidates } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-v3-decision-forest-"));

function writeProjectFile(relativePath, content) {
  const path = join(projectRoot, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
  return path;
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
        primary_dependency: candidate.state === "candidate_kernel_checked" ? "Nat.add_zero" : undefined,
        dependencies: candidate.state === "candidate_kernel_checked" ? ["Nat.add_zero"] : [],
        assumptions: [],
        introduced_assumptions: [],
        introduced_dependencies: candidate.state === "candidate_kernel_checked" ? ["Nat.add_zero"] : [],
        artifacts: [],
        lean_files: [],
        logs: [],
        evidence: candidate.state === "candidate_kernel_checked" ? [".comath/evidence/candidate/lean_run_manifest.json"] : [],
        hard_vetoes: candidate.hard_vetoes,
        failures: candidate.state === "candidate_kernel_checked" ? [] : ["no proof-grade evidence"],
        replay_command: candidate.replay_command ?? "",
        summary: "Phase 62 decision-forest fixture.",
        maintainability_notes: candidate.state === "candidate_kernel_checked" ? "small exact proof" : "not proof grade",
        ...extra
      },
      null,
      2
    )}\n`
  );
  return manifestPath.replace(/\\/g, "/");
}

function cloneCandidate(candidate, patch, manifestPatch = {}) {
  const next = { ...candidate, ...patch };
  next.manifest_path = writeCandidateManifest(next, manifestPatch);
  return next;
}

try {
  const { project } = initProject({ name: "v3 Decision Forest", root_path: projectRoot });
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: "For every natural number n, n + 0 = n.",
    assumptions: ["n : Nat"],
    domain: "elementary",
    status: "conjectural",
    actor: "phase62-decision-forest"
  });
  const campaign = {
    campaign_id: "CAM-0062",
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
  const obligation = {
    obligation_id: "PO-0001",
    claim_id: claim.id,
    locked_statement_nl: claim.statement,
    locked_statement_structured: { theorem: "Nat.add_zero", binder: "n : Nat" },
    lean_target: "MathResearch.C0001",
    statement_hash: claim.statement_hash,
    dependencies: [],
    assumptions: ["n : Nat"],
    status: "candidate_search"
  };

  const batch = runTrivialNatAddZeroCandidates({ projectRoot, campaign, obligation });
  assert.equal(batch.candidates.every((candidate) => candidate.state === "candidate_blocked"), true);
  const blocked = batch.candidates;
  assert.equal(blocked.length, 8);

  const highVotePlausible = cloneCandidate(blocked[0], {
    candidate_id: "CAND-1001",
    variant_id: "V2",
    workspace_path: ".comath/ensembles/phase62/high-vote-plausible",
    state: "candidate_plausible_only",
    hard_vetoes: [],
    score: 99_999,
    replay_command: undefined
  });
  const kernelCandidate = cloneCandidate(blocked[1], {
    candidate_id: "CAND-1002",
    variant_id: "V1",
    workspace_path: ".comath/ensembles/phase62/kernel",
    state: "candidate_kernel_checked",
    hard_vetoes: [],
    replay_command: "lake build MathResearch.C0001 Audit.C0001",
    score: 1
  });
  const proofDecision = decideCandidate({ projectRoot, campaign, candidates: [highVotePlausible, kernelCandidate] });
  assert.equal(proofDecision.decision.selected_candidate_id, "CAND-1002");
  assert.equal(proofDecision.gate.result, "pass");
  assert.equal(proofDecision.decision.selection_mode, "evidence_weighted");
  assert.equal(proofDecision.decision.proof_authority, "none");
  assert.equal(
    proofDecision.decision.rejected_candidates.some(
      (item) => item.candidate_id === "CAND-1001" && /no proof-grade evidence/.test(item.reason)
    ),
    true
  );

  const refutation = cloneCandidate(blocked[2], {
    candidate_id: "CAND-1003",
    variant_id: "V3",
    workspace_path: ".comath/ensembles/phase62/refutation",
    state: "candidate_refutes_step",
    hard_vetoes: [],
    score: 50,
    replay_command: "node exact-counterexample.js"
  });
  const refutationDecision = decideCandidate({ projectRoot, campaign, candidates: [highVotePlausible, refutation] });
  assert.equal(refutationDecision.decision.selected_candidate_id, null);
  assert.equal(refutationDecision.gate.result, "repair_required");
  assert.equal(refutationDecision.decision.refutation_candidate_id, "CAND-1003");
  assert.equal(
    refutationDecision.decision.recovery_plan.some((step) => /theorem repair|counterexample/i.test(step)),
    true
  );

  const skeletonOnly = cloneCandidate(blocked[3], {
    candidate_id: "CAND-1004",
    variant_id: "V4",
    workspace_path: ".comath/ensembles/phase62/skeleton",
    state: "candidate_skeleton_checked",
    hard_vetoes: [],
    score: 10_000
  });
  const blockedOnly = cloneCandidate(blocked[4], {
    candidate_id: "CAND-1005",
    variant_id: "V5",
    workspace_path: ".comath/ensembles/phase62/blocked",
    state: "candidate_blocked",
    hard_vetoes: [],
    score: 1
  });
  const recoveryDecision = decideCandidate({ projectRoot, campaign, candidates: [highVotePlausible, skeletonOnly, blockedOnly] });
  assert.equal(recoveryDecision.decision.selected_candidate_id, null);
  assert.equal(recoveryDecision.gate.result, "blocked");
  assert.equal(recoveryDecision.decision.selection_mode, "recovery_required");
  assert.equal(
    recoveryDecision.decision.recovery_plan.some((step) => /aggregate failures/i.test(step)),
    true
  );
  assert.equal(
    recoveryDecision.decision.recovery_plan.some((step) => /split|repair/i.test(step)),
    true
  );

  const manifestDifferentKernel = cloneCandidate(
    kernelCandidate,
    {
      candidate_id: "CAND-1006",
      variant_id: "V6",
      workspace_path: ".comath/ensembles/phase62/manifest-different",
      score: 99_999
    },
    { statement_equivalence_claim: "different" }
  );
  const manifestHardVetoKernel = cloneCandidate(
    kernelCandidate,
    {
      candidate_id: "CAND-1007",
      variant_id: "V7",
      workspace_path: ".comath/ensembles/phase62/manifest-hard-veto",
      score: 99_999
    },
    { hard_vetoes: ["manifest_axiom_profile_rejected"] }
  );
  const missingStatementHashKernel = cloneCandidate(
    kernelCandidate,
    {
      candidate_id: "CAND-1008",
      variant_id: "V8",
      workspace_path: ".comath/ensembles/phase62/missing-statement-hash",
      candidate_statement_hash: undefined,
      score: 99_999
    },
    { candidate_statement_hash: undefined }
  );
  const newAssumptionKernel = cloneCandidate(
    kernelCandidate,
    {
      candidate_id: "CAND-1009",
      variant_id: "V2",
      workspace_path: ".comath/ensembles/phase62/new-assumption",
      score: 99_999
    },
    { introduced_assumptions: ["n > 0"] }
  );
  const manifestVetoDecision = decideCandidate({
    projectRoot,
    campaign,
    candidates: [manifestDifferentKernel, manifestHardVetoKernel, missingStatementHashKernel, newAssumptionKernel]
  });
  assert.equal(manifestVetoDecision.decision.selected_candidate_id, null);
  assert.equal(manifestVetoDecision.gate.result, "blocked");
  assert.equal(
    manifestVetoDecision.decision.rejected_candidates.some(
      (item) => item.candidate_id === "CAND-1006" && /statement equivalence/.test(item.reason)
    ),
    true
  );
  assert.equal(
    manifestVetoDecision.decision.rejected_candidates.some(
      (item) => item.candidate_id === "CAND-1007" && /hard veto/.test(item.reason)
    ),
    true
  );
  assert.equal(
    manifestVetoDecision.decision.rejected_candidates.some(
      (item) => item.candidate_id === "CAND-1008" && /missing candidate statement hash/.test(item.reason)
    ),
    true
  );
  assert.equal(
    manifestVetoDecision.decision.rejected_candidates.some(
      (item) => item.candidate_id === "CAND-1009" && /introduced assumptions/.test(item.reason)
    ),
    true
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 62 v3 evidence-weighted decision forest tests passed.");
