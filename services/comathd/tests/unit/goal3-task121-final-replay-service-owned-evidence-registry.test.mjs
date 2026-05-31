import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  appendFinalReplayRegistryEntryV3,
  createFinalReplayManifestV3,
  decideCandidate,
  initProject,
  registerClaim,
  statementHash
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task121-final-replay-evidence-registry-"));

function writeProjectFile(relativePath, content) {
  const absolute = join(projectRoot, relativePath);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content, "utf8");
  return absolute;
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function hashRef(path) {
  return { sha256: sha256(path), size_bytes: statSync(path).size };
}

function writeCandidateManifest(candidate, evidence) {
  const manifestRel = `${candidate.workspace_path}/candidate_manifest.json`;
  writeProjectFile(
    manifestRel,
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
        primary_dependency: "Mathlib",
        dependencies: ["Mathlib"],
        assumptions: [],
        introduced_assumptions: [],
        introduced_dependencies: ["Mathlib"],
        artifacts: [],
        lean_files: [],
        logs: [],
        evidence,
        hard_vetoes: [],
        failures: [],
        replay_command: candidate.replay_command,
        summary: "Task121 FinalReplayManifest v3 evidence must be registry-provenance-bound.",
        maintainability_notes: "Small exact candidate with service-owned final replay evidence."
      },
      null,
      2
    )}\n`
  );
  return manifestRel;
}

function writeFinalReplayManifest({ claim, campaignId }) {
  const replayId = "RPLY-0121";
  const cleanRootRel = `.comath/lean/final_replay/${replayId}/clean`;
  const target = writeProjectFile(
    `${cleanRootRel}/MathResearch/Target.lean`,
    [
      "import Mathlib",
      "",
      "namespace MathResearch",
      "",
      "theorem Goal3Task121 : True := by",
      "  trivial",
      "",
      "#check Goal3Task121",
      "#print axioms Goal3Task121",
      "",
      "end MathResearch",
      ""
    ].join("\n")
  );
  const audit = writeProjectFile(
    `${cleanRootRel}/Audit/TargetAudit.lean`,
    "import MathResearch.Target\n#check MathResearch.Goal3Task121\n#print axioms MathResearch.Goal3Task121\n"
  );
  const formalSpec = writeProjectFile(
    `${cleanRootRel}/FormalSpec/formal_spec_lock.json`,
    `${JSON.stringify(
      {
        schema_version: "comath.formal_spec_lock.v2",
        task_id: "PM-121",
        claim_id: claim.id,
        namespace: "MathResearch",
        theorem_name: "Goal3Task121",
        theorem_header: claim.statement,
        statement_hash: claim.statement_hash,
        proof_authority: "none"
      },
      null,
      2
    )}\n`
  );
  const assumptionLedger = writeProjectFile(
    `${cleanRootRel}/FormalSpec/assumption_ledger.json`,
    `${JSON.stringify(
      {
        schema_version: "comath.assumption_ledger.v1",
        task_id: "PM-121",
        claim_id: claim.id,
        formal_spec_lock_hash: claim.statement_hash,
        entries: [],
        proof_authority: "none"
      },
      null,
      2
    )}\n`
  );
  const lakefile = writeProjectFile(
    `${cleanRootRel}/lakefile.lean`,
    "import Lake\nopen Lake DSL\npackage MathResearch where\nlean_lib MathResearch where\n  roots := #[`MathResearch.Target]\n"
  );
  const toolchain = writeProjectFile(`${cleanRootRel}/lean-toolchain`, "leanprover/lean4:v4.23.0\n");
  const lakeManifest = writeProjectFile(`${cleanRootRel}/lake-manifest.json`, `${JSON.stringify({ version: 7, packages: [] }, null, 2)}\n`);
  const stdout = writeProjectFile(`.comath/evidence/${claim.id}/lean/final_replay.stdout.log`, "Goal3Task121 checked\n");
  const stderr = writeProjectFile(`.comath/evidence/${claim.id}/lean/final_replay.stderr.log`, "");
  const staticAudit = writeProjectFile(`.comath/evidence/${claim.id}/lean/final_static_audit.json`, `${JSON.stringify({ result: "pass", hard_vetoes: [] })}\n`);
  const dependencyClosure = writeProjectFile(`.comath/evidence/${claim.id}/lean/dependency_closure.json`, `${JSON.stringify({ result: "pass", hard_vetoes: [] })}\n`);
  const axiomProfile = writeProjectFile(`.comath/evidence/${claim.id}/lean/axiom_profile.json`, `${JSON.stringify({ result: "pass", detected_axioms: [], hard_vetoes: [] })}\n`);
  const statementCheck = writeProjectFile(
    `.comath/evidence/${claim.id}/lean/statement_equivalence.json`,
    `${JSON.stringify({ result: "pass", locked_statement_hash: claim.statement_hash, hard_vetoes: [] })}\n`
  );

  const manifest = createFinalReplayManifestV3({
    projectRoot,
    replay_id: replayId,
    campaign_id: campaignId,
    claim_id: claim.id,
    theorem_name: "MathResearch.Goal3Task121",
    clean_workspace_path: join(projectRoot, cleanRootRel),
    command: ["lake", "build", "MathResearch"],
    exit_code: 0,
    result: "pass",
    source_hashes_before: {
      "MathResearch/Target.lean": hashRef(target),
      "Audit/TargetAudit.lean": hashRef(audit),
      "FormalSpec/formal_spec_lock.json": hashRef(formalSpec),
      "FormalSpec/assumption_ledger.json": hashRef(assumptionLedger),
      "lakefile.lean": hashRef(lakefile),
      "lean-toolchain": hashRef(toolchain),
      "lake-manifest.json": hashRef(lakeManifest)
    },
    stdout_path: stdout,
    stderr_path: stderr,
    report_paths: {
      static_audit: staticAudit,
      axiom_profile: axiomProfile,
      dependency_closure: dependencyClosure,
      statement_equivalence: statementCheck
    },
    lean_run_manifest_paths: [],
    dependency_lock: {
      lean_toolchain_path: toolchain,
      lake_manifest_path: lakeManifest,
      lakefile_path: lakefile,
      external_revisions: []
    },
    network_policy: "disabled",
    sandbox_policy: { network: "disabled", os_isolation: "process_boundary_only" },
    resource_budget: { timeout_ms: 30000, max_stdout_bytes: 65536, max_stderr_bytes: 65536 }
  });
  const manifestRel = `.comath/evidence/${claim.id}/lean/final_replay_manifest_v3.json`;
  writeProjectFile(manifestRel, `${JSON.stringify(manifest, null, 2)}\n`);
  return { manifest, manifestRel };
}

try {
  const { project } = initProject({ name: "Goal 3 Task 121 FinalReplay Evidence Registry Gate", root_path: projectRoot });
  const campaignId = "CAM-0121";
  const claimStatement = "theorem Goal3Task121 : True";
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: claimStatement,
    assumptions: [],
    domain: "logic",
    status: "conjectural",
    actor: "goal3-task121"
  });
  assert.equal(claim.statement_hash, statementHash(claimStatement));

  const campaign = {
    campaign_id: campaignId,
    project_id: project.project_id,
    root_claim_id: claim.id,
    user_goal: claimStatement,
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
    candidate_id: "CAND-0121",
    campaign_id: campaignId,
    stage: "lemma_sprint",
    obligation_id: "PO-0121",
    variant_id: "V2",
    workspace_path: ".comath/campaign/CAM-0121/ensembles/lemma_sprint/PO-0121/candidates/v2-final-replay",
    locked_statement_hash: claim.statement_hash,
    candidate_statement_hash: claim.statement_hash,
    state: "candidate_kernel_checked",
    score: 120,
    hard_vetoes: [],
    replay_command: "lake build MathResearch"
  };
  const { manifest, manifestRel } = writeFinalReplayManifest({ claim, campaignId });
  candidate.manifest_path = writeCandidateManifest(candidate, [`final_replay_manifest:${manifestRel}`]);

  const missingRegistryDecision = decideCandidate({ projectRoot, campaign, candidates: [candidate] });
  assert.equal(missingRegistryDecision.decision.selected_candidate_id, null);
  assert.equal(missingRegistryDecision.gate.result, "blocked");
  assert.ok(
    missingRegistryDecision.decision.rejected_candidates.some(
      (item) => item.candidate_id === candidate.candidate_id && /missing service-owned Lean replay evidence/.test(item.reason)
    )
  );

  appendFinalReplayRegistryEntryV3(projectRoot, manifest, { project_id: project.project_id, actor: "goal3-task121" });
  const registryBoundDecision = decideCandidate({ projectRoot, campaign, candidates: [candidate] });
  assert.equal(registryBoundDecision.decision.selected_candidate_id, candidate.candidate_id);
  assert.equal(registryBoundDecision.gate.result, "pass");
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 121 final replay service-owned evidence registry gate test passed.");
