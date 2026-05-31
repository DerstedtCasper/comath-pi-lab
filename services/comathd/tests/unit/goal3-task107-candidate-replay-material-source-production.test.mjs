import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import {
  getClaim,
  initProject,
  projectExternalV3TerminalState,
  registerClaim,
  statementHash,
  tickCampaign,
  writeCampaign
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task107-candidate-source-production-"));
const oldPath = process.env.PATH;

function writeProjectFile(relativePath, text) {
  const absolute = join(projectRoot, relativePath);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, text, "utf8");
  return absolute;
}

function writeJsonProjectFile(relativePath, value) {
  writeProjectFile(relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function readJsonProjectFile(relativePath) {
  return JSON.parse(readFileSync(join(projectRoot, relativePath), "utf8"));
}

function installFakeLeanAndLake(theoremName) {
  const bin = join(projectRoot, ".comath", "fake-bin");
  mkdirSync(bin, { recursive: true });
  writeFileSync(
    join(bin, "lean.cmd"),
    "@echo off\r\necho Lean (version 4.23.0, x86_64-pc-windows-msvc, commit task107)\r\nexit /b 0\r\n",
    "utf8"
  );
  writeFileSync(
    join(bin, "lake.cmd"),
    [
      "@echo off",
      "if \"%1\"==\"--version\" (",
      "  echo Lake version 5.0.0",
      "  exit /b 0",
      ")",
      `echo ${theoremName} : True`,
      `echo ${theoremName} does not depend on any axioms`,
      "exit /b 0",
      ""
    ].join("\r\n"),
    "utf8"
  );
  const leanSh = join(bin, "lean");
  const lakeSh = join(bin, "lake");
  writeFileSync(leanSh, "#!/bin/sh\necho 'Lean (version 4.23.0, x86_64-unknown-linux-gnu, commit task107)'\n", "utf8");
  writeFileSync(
    lakeSh,
    [
      "#!/bin/sh",
      "if [ \"$1\" = \"--version\" ]; then",
      "  echo 'Lake version 5.0.0'",
      "  exit 0",
      "fi",
      `echo '${theoremName} : True'`,
      `echo '${theoremName} does not depend on any axioms'`,
      ""
    ].join("\n"),
    "utf8"
  );
  chmodSync(leanSh, 0o755);
  chmodSync(lakeSh, 0o755);
  process.env.PATH = `${bin}${delimiter}${process.env.PATH ?? ""}`;
}

function campaignFixture(projectId, claimId, statementHashValue) {
  const now = "2026-05-31T00:00:00.000Z";
  return {
    campaign_id: "CAM-0107",
    project_id: projectId,
    root_claim_id: claimId,
    user_goal: "Task107 candidate arbitration produces replay material source from selected candidate pack",
    current_stage: "candidate_arbitration",
    status: "running",
    strict_mode: true,
    stage_runs: [],
    open_obligations: [
      {
        obligation_id: "PO-0107",
        claim_id: claimId,
        locked_statement_nl: "MathResearch.Goal3CandidateReplaySource107 : True",
        locked_statement_structured: {},
        statement_hash: statementHashValue,
        dependencies: [],
        assumptions: [],
        status: "candidate_search"
      }
    ],
    accepted_artifacts: [],
    blockers: [],
    next_actions: ["select candidate by evidence-weighted arbitration"],
    created_at: now,
    updated_at: now
  };
}

function writeSelectedCandidateDescriptor({ campaignId, claim, claimStatement, theoremName, leanRootRel }) {
  const workspace = `.comath/campaign/${campaignId}/ensembles/lemma_sprint/PO-0107/candidates/v5-computational-verifier`;
  const manifestRel = `${workspace}/candidate_manifest.json`;
  const descriptorRel = `${workspace}/candidate_replay_project_descriptor.json`;
  const generatedSourceRel = `${workspace}/candidate_final_replay_material_source.json`;
  const candidateId = "CAND-0107";
  const candidate = {
    candidate_id: candidateId,
    campaign_id: campaignId,
    stage: "lemma_sprint",
    obligation_id: "PO-0107",
    variant_id: "V5",
    workspace_path: workspace,
    locked_statement_hash: claim.statement_hash,
    candidate_statement_hash: claim.statement_hash,
    state: "candidate_kernel_checked",
    manifest_path: manifestRel,
    score: 120,
    hard_vetoes: [],
    artifacts: [],
    replay_command: "lake build MathResearch"
  };
  const descriptor = {
    schema_version: "comath.candidate_replay_project_descriptor.v1",
    campaign_id: campaignId,
    claim_id: claim.id,
    obligation_id: "PO-0107",
    candidate_id: candidateId,
    artifact_role: "candidate_replay_project_descriptor",
    proof_authority: "none",
    can_promote_claim: false,
    lean_project: {
      lean_root: leanRootRel,
      theorem_file_rel: "MathResearch/Target.lean",
      formal_spec_file: "FormalSpec/formal_spec_lock.json",
      assumption_ledger_file: "FormalSpec/assumption_ledger.json",
      audit_file_rel: "Audit/TargetAudit.lean",
      lakefile: "lakefile.lean",
      toolchain_file: "lean-toolchain",
      theorem_name: theoremName,
      theorem_family_id: campaignId,
      canonical_proposition: "True",
      build_targets: ["MathResearch"],
      replay_command: "lake build MathResearch",
      primary_dependency: "Mathlib",
      formal_spec: {
        claim_id: claim.id,
        theorem_name: "Goal3CandidateReplaySource107",
        namespace: "MathResearch",
        normalized_statement: claimStatement,
        locked_statement_hash: claim.statement_hash
      }
    }
  };
  writeJsonProjectFile(manifestRel, {
    candidate_id: candidateId,
    campaign_id: campaignId,
    variant_id: "V5",
    stage: "lemma_sprint",
    obligation_id: "PO-0107",
    workspace_path: workspace,
    locked_statement_hash: claim.statement_hash,
    candidate_statement_hash: claim.statement_hash,
    state: "candidate_kernel_checked",
    statement_equivalence_claim: "exact",
    dependencies: ["Mathlib"],
    assumptions: [],
    introduced_assumptions: [],
    introduced_dependencies: [],
    artifacts: [
      {
        path: "candidate_replay_project_descriptor.json",
        kind: "candidate_replay_project_descriptor",
        required_for: ["candidate_replay_material_source"]
      }
    ],
    lean_files: [`${leanRootRel}/MathResearch/Target.lean`],
    logs: [],
    evidence: ["service_owned_lean_replay:CAND-0107"],
    hard_vetoes: [],
    failures: [],
    replay_command: "lake build MathResearch",
    summary: "Candidate is checked only as candidate material; final proof authority still requires clean replay.",
    maintainability_notes: "Small candidate pack with a non-authoritative replay project descriptor."
  });
  writeJsonProjectFile(descriptorRel, descriptor);
  writeJsonProjectFile(`.comath/campaign/${campaignId}/ensembles/lemma_sprint/PO-0107/candidates.json`, [candidate]);
  return { workspace, manifestRel, descriptor, generatedSourceRel };
}

try {
  const { project } = initProject({ name: "Goal 3 Task 107 Candidate Replay Source Production", root_path: projectRoot });
  const campaignId = "CAM-0107";
  const theoremName = "MathResearch.Goal3CandidateReplaySource107";
  const claimStatement = `${theoremName} : True`;
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: claimStatement,
    assumptions: [],
    domain: "logic",
    status: "conjectural",
    actor: "goal3-task107"
  });
  assert.equal(claim.statement_hash, statementHash(claimStatement));
  installFakeLeanAndLake(theoremName);

  const leanRootRel = ".comath/lean/task107-candidate-material";
  writeProjectFile(
    `${leanRootRel}/MathResearch/Target.lean`,
    [
      "namespace MathResearch",
      "",
      "theorem Goal3CandidateReplaySource107 : True := by",
      "  trivial",
      "",
      "#check Goal3CandidateReplaySource107",
      "#print axioms Goal3CandidateReplaySource107",
      "",
      "end MathResearch",
      ""
    ].join("\n")
  );
  writeProjectFile(
    `${leanRootRel}/Audit/TargetAudit.lean`,
    "import MathResearch.Target\n#check MathResearch.Goal3CandidateReplaySource107\n#print axioms MathResearch.Goal3CandidateReplaySource107\n"
  );
  writeJsonProjectFile(`${leanRootRel}/FormalSpec/formal_spec_lock.json`, {
    schema_version: "comath.formal_spec_lock.v2",
    binding_scope: "campaign",
    campaign_id: campaignId,
    claim_id: claim.id,
    namespace: "MathResearch",
    theorem_name: "Goal3CandidateReplaySource107",
    theorem_header: "theorem Goal3CandidateReplaySource107 : True",
    statement_hash: claim.statement_hash,
    proof_authority: "none"
  });
  writeJsonProjectFile(`${leanRootRel}/FormalSpec/assumption_ledger.json`, {
    schema_version: "comath.assumption_ledger.v1",
    binding_scope: "campaign",
    campaign_id: campaignId,
    claim_id: claim.id,
    formal_spec_lock_hash: claim.statement_hash,
    entries: [],
    proof_authority: "none"
  });
  writeProjectFile(
    `${leanRootRel}/lakefile.lean`,
    "import Lake\nopen Lake DSL\npackage MathResearch where\nlean_lib MathResearch where\n  roots := #[`MathResearch.Target]\n"
  );
  writeProjectFile(`${leanRootRel}/lean-toolchain`, "leanprover/lean4:v4.23.0\n");
  writeJsonProjectFile(`${leanRootRel}/lake-manifest.json`, { version: 7, packages: [] });
  const { manifestRel, descriptor, generatedSourceRel } = writeSelectedCandidateDescriptor({
    campaignId,
    claim,
    claimStatement,
    theoremName,
    leanRootRel
  });

  assert.equal(existsSync(join(projectRoot, generatedSourceRel)), false);
  writeCampaign(projectRoot, campaignFixture(project.project_id, claim.id, claim.statement_hash), "goal3-task107");

  const arbitrated = await tickCampaign({
    project_root: projectRoot,
    campaign_id: campaignId,
    actor: "goal3-task107"
  });

  assert.equal(arbitrated.campaign.current_stage, "refutation_red_team", JSON.stringify(arbitrated.campaign.blockers, null, 2));
  assert.equal(arbitrated.gate?.result, "pass");
  assert.equal(existsSync(join(projectRoot, generatedSourceRel)), true);
  const generatedSource = readJsonProjectFile(generatedSourceRel);
  assert.equal(generatedSource.schema_version, "comath.selected_candidate_final_replay_material_source.v1");
  assert.equal(generatedSource.campaign_id, campaignId);
  assert.equal(generatedSource.claim_id, claim.id);
  assert.equal(generatedSource.obligation_id, "PO-0107");
  assert.equal(generatedSource.candidate_id, "CAND-0107");
  assert.equal(generatedSource.artifact_role, "selected_candidate_final_replay_material_source");
  assert.equal(generatedSource.proof_authority, "none");
  assert.equal(generatedSource.can_promote_claim, false);
  assert.equal(generatedSource.source_descriptor_path, "candidate_replay_project_descriptor.json");
  assert.match(generatedSource.source_descriptor_sha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(generatedSource.lean_project, descriptor.lean_project);

  const updatedManifest = readJsonProjectFile(manifestRel);
  assert.ok(
    updatedManifest.artifacts.some(
      (artifact) =>
        artifact.path === "candidate_final_replay_material_source.json" &&
        artifact.kind === "final_replay_material_source" &&
        artifact.required_for.includes("final_replay_material")
    )
  );

  const reviewed = await tickCampaign({
    project_root: projectRoot,
    campaign_id: campaignId,
    actor: "goal3-task107"
  });
  assert.equal(reviewed.campaign.current_stage, "integration_refactor", JSON.stringify(reviewed.campaign.blockers, null, 2));

  const integrated = await tickCampaign({
    project_root: projectRoot,
    campaign_id: campaignId,
    actor: "goal3-task107"
  });
  assert.equal(integrated.campaign.current_stage, "final_static_audit", JSON.stringify(integrated.campaign.blockers, null, 2));
  assert.equal(integrated.campaign.accepted_artifacts.length, 1);

  const prepared = await tickCampaign({
    project_root: projectRoot,
    campaign_id: campaignId,
    actor: "goal3-task107"
  });
  assert.equal(prepared.campaign.current_stage, "final_global_replay", JSON.stringify(prepared.campaign.blockers, null, 2));
  assert.equal(prepared.campaign.accepted_artifacts.length, 2);

  const result = await tickCampaign({
    project_root: projectRoot,
    campaign_id: campaignId,
    actor: "goal3-task107"
  });

  assert.equal(result.campaign.current_stage, "completed_formal_proof", JSON.stringify(result.campaign.blockers, null, 2));
  assert.equal(result.campaign.formal_replay_authority_passed, true);
  assert.equal(projectExternalV3TerminalState(result.campaign), "formal_proof_verified");
  assert.equal(getClaim(projectRoot, project.project_id, claim.id)?.status, "formally_checked");
} finally {
  process.env.PATH = oldPath;
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 107 candidate replay material source production test passed.");
