import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  appendFinalReplayRegistryEntryV3,
  appendLeanRunManifestProvenanceIndexV1,
  createFinalReplayManifestV3,
  createServiceOwnedLeanRunManifestV3,
  decideCandidate,
  initProject,
  registerClaim,
  statementHash
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task122-final-replay-binary-provenance-"));

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
        summary: "Task122 FinalReplayManifest local evidence must bind Lean/Lake binary provenance.",
        maintainability_notes: "Small exact candidate with service-owned final replay evidence."
      },
      null,
      2
    )}\n`
  );
  return manifestRel;
}

function writeFinalReplayFixture({ claim, campaignId, replayId, runId, theoremName, includeBinaryProvenance }) {
  const cleanRootRel = `.comath/lean/final_replay/${replayId}/clean`;
  const target = writeProjectFile(
    `${cleanRootRel}/MathResearch/Target.lean`,
    [
      "import Mathlib",
      "",
      "namespace MathResearch",
      "",
      `theorem ${theoremName} : True := by`,
      "  trivial",
      "",
      `#check ${theoremName}`,
      `#print axioms ${theoremName}`,
      "",
      "end MathResearch",
      ""
    ].join("\n")
  );
  const audit = writeProjectFile(
    `${cleanRootRel}/Audit/TargetAudit.lean`,
    `import MathResearch.Target\n#check MathResearch.${theoremName}\n#print axioms MathResearch.${theoremName}\n`
  );
  const formalSpec = writeProjectFile(
    `${cleanRootRel}/FormalSpec/formal_spec_lock.json`,
    `${JSON.stringify(
      {
        schema_version: "comath.formal_spec_lock.v2",
        task_id: "PM-122",
        claim_id: claim.id,
        namespace: "MathResearch",
        theorem_name: theoremName,
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
        task_id: "PM-122",
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
  const stdout = writeProjectFile(`.comath/evidence/${claim.id}/lean/${runId}.stdout.log`, `${theoremName} checked\n`);
  const stderr = writeProjectFile(`.comath/evidence/${claim.id}/lean/${runId}.stderr.log`, "");
  const staticAudit = writeProjectFile(`.comath/evidence/${claim.id}/lean/${runId}.final_static_audit.json`, `${JSON.stringify({ result: "pass", hard_vetoes: [] })}\n`);
  const dependencyClosure = writeProjectFile(`.comath/evidence/${claim.id}/lean/${runId}.dependency_closure.json`, `${JSON.stringify({ result: "pass", hard_vetoes: [] })}\n`);
  const axiomProfile = writeProjectFile(`.comath/evidence/${claim.id}/lean/${runId}.axiom_profile.json`, `${JSON.stringify({ result: "pass", detected_axioms: [], hard_vetoes: [] })}\n`);
  const statementCheck = writeProjectFile(
    `.comath/evidence/${claim.id}/lean/${runId}.statement_equivalence.json`,
    `${JSON.stringify({ result: "pass", locked_statement_hash: claim.statement_hash, hard_vetoes: [] })}\n`
  );

  const leanBinary = includeBinaryProvenance ? writeProjectFile(`${cleanRootRel}/bin/lean`, `dummy lean executable for ${runId}\n`) : undefined;
  const lakeBinary = includeBinaryProvenance ? writeProjectFile(`${cleanRootRel}/bin/lake`, `dummy lake executable for ${runId}\n`) : undefined;
  const leanRunManifest = createServiceOwnedLeanRunManifestV3({
    projectRoot,
    run_id: runId,
    claim_id: claim.id,
    campaign_id: campaignId,
    purpose: "final_replay",
    command: ["lake", "build", "MathResearch"],
    cwd: join(projectRoot, cleanRootRel),
    input_files: [target, audit, formalSpec, assumptionLedger, lakefile, toolchain, lakeManifest],
    lean_version: "4.23.0",
    lake_version: "5.0.0",
    elan_toolchain: "leanprover/lean4:v4.23.0",
    lean_toolchain_file: toolchain,
    lake_manifest_file: lakeManifest,
    lean_binary_file: leanBinary,
    lake_binary_file: lakeBinary,
    network_policy: "disabled",
    sandbox: "none",
    exit_code: 0,
    stdout_path: stdout,
    stderr_path: stderr,
    started_at: "2026-06-01T00:00:00.000Z",
    ended_at: "2026-06-01T00:00:01.000Z",
    proof_authority: "lean_kernel_check"
  });
  const leanRunManifestRel = `.comath/evidence/${claim.id}/lean/${runId}.manifest.json`;
  writeProjectFile(leanRunManifestRel, `${JSON.stringify(leanRunManifest, null, 2)}\n`);
  appendLeanRunManifestProvenanceIndexV1({
    projectRoot,
    project_id: claim.project_id,
    actor: "goal3-task122",
    manifest: leanRunManifest,
    manifest_path: leanRunManifestRel
  });

  const binaryHashes =
    includeBinaryProvenance && leanBinary && lakeBinary
      ? { lean: sha256(leanBinary), lake: sha256(lakeBinary) }
      : undefined;
  const manifest = createFinalReplayManifestV3({
    projectRoot,
    replay_id: replayId,
    campaign_id: campaignId,
    claim_id: claim.id,
    theorem_name: `MathResearch.${theoremName}`,
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
    lean_run_manifest_paths: [join(projectRoot, leanRunManifestRel)],
    dependency_lock: {
      lean_toolchain_path: toolchain,
      lake_manifest_path: lakeManifest,
      lakefile_path: lakefile,
      external_revisions: []
    },
    network_policy: "disabled",
    sandbox_policy: { network: "disabled", os_isolation: "process_boundary_only" },
    resource_budget: { timeout_ms: 30000, max_stdout_bytes: 65536, max_stderr_bytes: 65536 },
    binary_hashes: binaryHashes
  });
  const manifestRel = `.comath/evidence/${claim.id}/lean/${runId}.final_replay_manifest_v3.json`;
  writeProjectFile(manifestRel, `${JSON.stringify(manifest, null, 2)}\n`);
  appendFinalReplayRegistryEntryV3(projectRoot, manifest, { project_id: claim.project_id, actor: "goal3-task122" });
  return manifestRel;
}

try {
  const { project } = initProject({ name: "Goal 3 Task 122 FinalReplay Binary Provenance", root_path: projectRoot });
  const campaignId = "CAM-0122";
  const claimStatement = "theorem Goal3Task122 : True";
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: claimStatement,
    assumptions: [],
    domain: "logic",
    status: "conjectural",
    actor: "goal3-task122"
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
  const unboundManifestRel = writeFinalReplayFixture({
    claim,
    campaignId,
    replayId: "RPLY-1221",
    runId: "LRUN-1221",
    theoremName: "Goal3Task122",
    includeBinaryProvenance: false
  });
  const unboundCandidate = {
    candidate_id: "CAND-1221",
    campaign_id: campaignId,
    stage: "lemma_sprint",
    obligation_id: "PO-0122",
    variant_id: "V2",
    workspace_path: ".comath/campaign/CAM-0122/ensembles/lemma_sprint/PO-0122/candidates/v2-final-replay-unbound",
    locked_statement_hash: claim.statement_hash,
    candidate_statement_hash: claim.statement_hash,
    state: "candidate_kernel_checked",
    score: 120,
    hard_vetoes: [],
    replay_command: "lake build MathResearch"
  };
  unboundCandidate.manifest_path = writeCandidateManifest(unboundCandidate, [`final_replay_manifest:${unboundManifestRel}`]);
  const unboundDecision = decideCandidate({ projectRoot, campaign, candidates: [unboundCandidate] });
  assert.equal(unboundDecision.decision.selected_candidate_id, null);
  assert.equal(unboundDecision.gate.result, "blocked");

  const boundManifestRel = writeFinalReplayFixture({
    claim,
    campaignId,
    replayId: "RPLY-1222",
    runId: "LRUN-1222",
    theoremName: "Goal3Task122",
    includeBinaryProvenance: true
  });
  const boundCandidate = {
    ...unboundCandidate,
    candidate_id: "CAND-1222",
    workspace_path: ".comath/campaign/CAM-0122/ensembles/lemma_sprint/PO-0122/candidates/v2-final-replay-bound"
  };
  boundCandidate.manifest_path = writeCandidateManifest(boundCandidate, [`final_replay_manifest:${boundManifestRel}`]);
  const boundDecision = decideCandidate({ projectRoot, campaign, candidates: [boundCandidate] });
  assert.equal(boundDecision.decision.selected_candidate_id, boundCandidate.candidate_id);
  assert.equal(boundDecision.gate.result, "pass");
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 122 final replay local evidence binary provenance test passed.");
