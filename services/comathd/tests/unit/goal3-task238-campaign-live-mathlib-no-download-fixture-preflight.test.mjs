import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  evaluateCampaignLiveMathlibNoDownloadFixturePreflight,
  getClaim,
  getComathdStatus,
  initProject,
  registerClaim,
  statementHash,
  tickCampaign,
  writeCampaign
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task238-mathlib-no-download-preflight-"));
const mathlibRev = "0123456789abcdef0123456789abcdef01234567";
const theoremName = "MathResearch.Goal3Task238GroupInv";

function writeProjectFile(relativePath, text) {
  const absolute = join(projectRoot, relativePath);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, text, "utf8");
  return absolute;
}

function writeJsonProjectFile(relativePath, value) {
  return writeProjectFile(relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function createDirectorySymlinkFixture(target, linkPath) {
  const errors = [];
  for (const type of ["dir", "junction"]) {
    try {
      symlinkSync(target, linkPath, type);
      return;
    } catch (error) {
      errors.push(`${type}:${error?.code ?? error?.message ?? "unknown"}`);
    }
  }
  assert.fail(`unable to create symlink/junction fixture for Mathlib symlink rejection: ${errors.join(", ")}`);
}

function mathlibLakefile() {
  return [
    "import Lake",
    "open Lake DSL",
    "package MathResearch where",
    `require mathlib from git "https://github.com/leanprover-community/mathlib4" @ "${mathlibRev}"`,
    "lean_lib MathResearch where",
    "  roots := #[`MathResearch.Target]",
    ""
  ].join("\n");
}

function mathlibManifestPackage(overrides = {}) {
  return {
    name: "mathlib",
    url: "https://github.com/leanprover-community/mathlib4",
    rev: mathlibRev,
    license: "Apache-2.0",
    ...overrides
  };
}

function preflightInput(leanRootRel, overrides = {}) {
  return {
    packagingScope: "campaign",
    primaryDependency: "Mathlib",
    leanRoot: join(projectRoot, leanRootRel),
    lakefileText: mathlibLakefile(),
    lakeManifest: { version: 7, packages: [mathlibManifestPackage()] },
    localLeanFileRels: ["MathResearch/Target.lean", "Audit/TargetAudit.lean"],
    ...overrides
  };
}

function campaignFixture(projectId, claimId, statementHashValue, campaignId = "CAM-0238") {
  const now = "2026-06-07T00:00:00.000Z";
  return {
    campaign_id: campaignId,
    project_id: projectId,
    root_claim_id: claimId,
    user_goal: "Task238 must persist no-download Mathlib fixture preflight before host/import diagnostics",
    current_stage: "final_global_replay",
    status: "running",
    strict_mode: true,
    stage_runs: [],
    open_obligations: [
      {
        obligation_id: "PO-0238",
        claim_id: claimId,
        locked_statement_nl:
          "theorem MathResearch.Goal3Task238GroupInv (G : Type) [Group G] (g : G) : g * Inv.inv g = 1",
        locked_statement_structured: {},
        statement_hash: statementHashValue,
        dependencies: [],
        assumptions: [],
        status: "candidate_selected"
      }
    ],
    accepted_artifacts: [],
    blockers: [],
    next_actions: ["run no-download Mathlib fixture preflight before host/import diagnostics"],
    created_at: now,
    updated_at: now
  };
}

function finalReplayRequestPayload(claim, claimStatement, leanRootRel) {
  return {
    schema_version: "comath.campaign_final_global_replay_request.v1",
    claim_id: claim.id,
    packaging_scope: "campaign",
    replay_breadth_profile: "campaign_live_mathlib_non_toy",
    lean_project: {
      lean_root: leanRootRel,
      theorem_file_rel: "MathResearch/Target.lean",
      formal_spec_file: "FormalSpec/formal_spec_lock.json",
      assumption_ledger_file: "FormalSpec/assumption_ledger.json",
      audit_file_rel: "Audit/TargetAudit.lean",
      lakefile: "lakefile.lean",
      toolchain_file: "lean-toolchain",
      theorem_name: theoremName,
      theorem_family_id: "CAM-0238",
      canonical_proposition: "(G : Type) [Group G] (g : G) : g * Inv.inv g = 1",
      build_targets: ["MathResearch"],
      replay_command: "lake build MathResearch",
      primary_dependency: "Mathlib",
      formal_spec: {
        claim_id: claim.id,
        theorem_name: "Goal3Task238GroupInv",
        namespace: "MathResearch",
        normalized_statement: claimStatement,
        locked_statement_hash: claim.statement_hash
      }
    }
  };
}

function writeMathlibCampaignProjectWithoutPackageMaterial(leanRootRel, claim) {
  writeProjectFile(
    `${leanRootRel}/MathResearch/Target.lean`,
    [
      "import Mathlib",
      "",
      "namespace MathResearch",
      "",
      "theorem Goal3Task238GroupInv (G : Type) [Group G] (g : G) : g * Inv.inv g = 1 := by",
      "  exact mul_inv_cancel g",
      "",
      "#check Goal3Task238GroupInv",
      "#print axioms Goal3Task238GroupInv",
      "",
      "end MathResearch",
      ""
    ].join("\n")
  );
  writeProjectFile(
    `${leanRootRel}/Audit/TargetAudit.lean`,
    "import MathResearch.Target\n#check MathResearch.Goal3Task238GroupInv\n#print axioms MathResearch.Goal3Task238GroupInv\n"
  );
  writeJsonProjectFile(`${leanRootRel}/FormalSpec/formal_spec_lock.json`, {
    schema_version: "comath.formal_spec_lock.v2",
    binding_scope: "campaign",
    campaign_id: "CAM-0238",
    claim_id: claim.id,
    namespace: "MathResearch",
    theorem_name: "Goal3Task238GroupInv",
    theorem_header: "theorem Goal3Task238GroupInv (G : Type) [Group G] (g : G) : g * Inv.inv g = 1",
    statement_hash: claim.statement_hash,
    proof_authority: "none"
  });
  writeJsonProjectFile(`${leanRootRel}/FormalSpec/assumption_ledger.json`, {
    schema_version: "comath.assumption_ledger.v1",
    binding_scope: "campaign",
    campaign_id: "CAM-0238",
    claim_id: claim.id,
    formal_spec_lock_hash: claim.statement_hash,
    entries: [],
    proof_authority: "none"
  });
  writeProjectFile(`${leanRootRel}/lakefile.lean`, mathlibLakefile());
  writeProjectFile(`${leanRootRel}/lean-toolchain`, "leanprover/lean4:v4.23.0\n");
  writeJsonProjectFile(`${leanRootRel}/lake-manifest.json`, {
    version: 7,
    packages: [mathlibManifestPackage()]
  });
}

try {
  assert.ok(
    getComathdStatus().capabilities.includes("campaign_live_mathlib_no_download_fixture_preflight"),
    "Task238 capability must be advertised for release discovery"
  );

  const leanRootRel = ".comath/lean/task238-mathlib";
  writeProjectFile(`${leanRootRel}/MathResearch/Target.lean`, "import Mathlib\n#check True\n");
  writeProjectFile(`${leanRootRel}/Audit/TargetAudit.lean`, "import MathResearch.Target\n#check True\n");

  const missingMaterial = evaluateCampaignLiveMathlibNoDownloadFixturePreflight(preflightInput(leanRootRel));
  assert.equal(missingMaterial.schema_version, "comath.campaign_live_mathlib_no_download_fixture_preflight.v1");
  assert.equal(missingMaterial.profile, "campaign_live_mathlib_non_toy");
  assert.equal(missingMaterial.result, "fail");
  assert.equal(missingMaterial.readiness_status, "blocked_before_host_diagnostics");
  assert.ok(missingMaterial.hard_vetoes.includes("mathlib_package_materialization_missing"));
  assert.equal(missingMaterial.no_download_policy, "strict_no_download");
  assert.equal(missingMaterial.network_policy, "disabled");
  assert.equal(missingMaterial.executes_lean_or_lake, false);
  assert.equal(missingMaterial.download_attempted, false);
  assert.equal(missingMaterial.ready_for_task218_219_diagnostics, false);
  assert.equal(missingMaterial.can_allocate_final_replay_workspace, false);
  assert.equal(missingMaterial.proof_authority, "none");
  assert.equal(missingMaterial.can_promote_claim, false);
  assert.equal(missingMaterial.preflight_is_proof_authority, false);
  assert.equal(missingMaterial.dependency_material_gate.result, "pass");
  assert.equal(missingMaterial.provisioning_diagnostic.result, "fail");

  const shadowed = evaluateCampaignLiveMathlibNoDownloadFixturePreflight(
    preflightInput(leanRootRel, {
      localLeanFileRels: ["Mathlib/Algebra/Group/Basic.lean", "MathResearch/Target.lean"]
    })
  );
  assert.equal(shadowed.result, "fail");
  assert.ok(shadowed.hard_vetoes.includes("local_module_shadowing:Mathlib.Algebra.Group.Basic"));
  assert.equal(shadowed.dependency_material_gate.result, "fail");
  assert.equal(shadowed.provisioning_diagnostic.result, "fail");

  const floatingRevision = evaluateCampaignLiveMathlibNoDownloadFixturePreflight(
    preflightInput(leanRootRel, {
      lakeManifest: { version: 7, packages: [mathlibManifestPackage({ rev: "master" })] }
    })
  );
  assert.equal(floatingRevision.result, "fail");
  assert.ok(floatingRevision.hard_vetoes.includes("mathlib_dependency_revision_floating"));
  assert.equal(floatingRevision.ready_for_task218_219_diagnostics, false);

  writeProjectFile(`${leanRootRel}/.lake/packages/mathlib/Mathlib.lean`, "import Mathlib.Algebra.Group.Basic\n");
  writeProjectFile(
    `${leanRootRel}/.lake/packages/mathlib/Mathlib/Algebra/Group/Basic.lean`,
    "class Group (G : Type) where\n"
  );
  const ready = evaluateCampaignLiveMathlibNoDownloadFixturePreflight(preflightInput(leanRootRel));
  assert.equal(ready.result, "pass");
  assert.equal(ready.readiness_status, "local_mathlib_fixture_ready_for_host_diagnostics");
  assert.deepEqual(ready.hard_vetoes, []);
  assert.equal(ready.mathlib_revision, mathlibRev);
  assert.equal(ready.materialized_package_root, ".lake/packages/mathlib");
  assert.match(ready.materialized_package_hash, /^[a-f0-9]{64}$/);
  assert.equal(typeof ready.materialized_file_hashes[".lake/packages/mathlib/Mathlib.lean"], "string");
  assert.equal(ready.no_download_policy, "strict_no_download");
  assert.equal(ready.network_policy, "disabled");
  assert.equal(ready.executes_lean_or_lake, false);
  assert.equal(ready.download_attempted, false);
  assert.equal(ready.ready_for_task218_219_diagnostics, true);
  assert.equal(ready.can_allocate_final_replay_workspace, false);
  assert.deepEqual(ready.next_required_diagnostics, [
    "campaign_live_mathlib_host_replay_diagnostic",
    "campaign_live_mathlib_import_graph_diagnostic",
    "final_clean_lean_replay"
  ]);
  assert.equal(ready.proof_authority, "none");
  assert.equal(ready.can_promote_claim, false);
  assert.equal(ready.preflight_is_proof_authority, false);
  assert.equal(ready.dependency_material_gate.result, "pass");
  assert.equal(ready.provisioning_diagnostic.result, "pass");

  const symlinkLeanRootRel = ".comath/lean/task238-symlink-mathlib";
  writeProjectFile(`${symlinkLeanRootRel}/outside-mathlib-dir/Outside.lean`, "import Mathlib\n");
  writeProjectFile(`${symlinkLeanRootRel}/.lake/packages/mathlib/Mathlib.lean`, "import Mathlib\n");
  createDirectorySymlinkFixture(
    join(projectRoot, symlinkLeanRootRel, "outside-mathlib-dir"),
    join(projectRoot, symlinkLeanRootRel, ".lake", "packages", "mathlib", "EscapeDir")
  );
  const symlinkBlocked = evaluateCampaignLiveMathlibNoDownloadFixturePreflight(preflightInput(symlinkLeanRootRel));
  assert.equal(symlinkBlocked.result, "fail");
  assert.ok(
    symlinkBlocked.hard_vetoes.includes("mathlib_package_symlink_forbidden:.lake/packages/mathlib/EscapeDir")
  );
  assert.equal(symlinkBlocked.ready_for_task218_219_diagnostics, false);

  const rootSymlinkLeanRootRel = ".comath/lean/task238-root-symlink-mathlib";
  writeProjectFile(`${rootSymlinkLeanRootRel}/outside-mathlib/Mathlib.lean`, "import Mathlib\n");
  mkdirSync(join(projectRoot, rootSymlinkLeanRootRel, ".lake", "packages"), { recursive: true });
  createDirectorySymlinkFixture(
    join(projectRoot, rootSymlinkLeanRootRel, "outside-mathlib"),
    join(projectRoot, rootSymlinkLeanRootRel, ".lake", "packages", "mathlib")
  );
  const rootSymlinkBlocked = evaluateCampaignLiveMathlibNoDownloadFixturePreflight(preflightInput(rootSymlinkLeanRootRel));
  assert.equal(rootSymlinkBlocked.result, "fail");
  assert.ok(
    rootSymlinkBlocked.hard_vetoes.includes("mathlib_package_root_symlink_forbidden:.lake/packages/mathlib")
  );
  assert.equal(rootSymlinkBlocked.ready_for_task218_219_diagnostics, false);

  const campaignLeanRootRel = ".comath/lean/task238-campaign-missing-material";
  const { project } = initProject({ name: "Goal 3 Task 238", root_path: projectRoot });
  const claimStatement = `${theoremName} (G : Type) [Group G] (g : G) : g * Inv.inv g = 1`;
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: claimStatement,
    assumptions: [],
    domain: "algebra",
    status: "conjectural",
    actor: "goal3-task238"
  });
  assert.equal(claim.statement_hash, statementHash(claimStatement));
  writeMathlibCampaignProjectWithoutPackageMaterial(campaignLeanRootRel, claim);
  writeCampaign(projectRoot, campaignFixture(project.project_id, claim.id, claim.statement_hash), "goal3-task238");
  writeJsonProjectFile(
    ".comath/campaign/CAM-0238/final_replay_request.json",
    finalReplayRequestPayload(claim, claimStatement, campaignLeanRootRel)
  );

  const blocked = await tickCampaign({
    project_root: projectRoot,
    campaign_id: "CAM-0238",
    actor: "goal3-task238"
  });
  assert.equal(blocked.campaign.current_stage, "blocked");
  assert.equal(blocked.campaign.terminal_state, "blocked_with_replayable_reason");
  assert.match(blocked.blocker, /campaign_live_mathlib_provisioning_diagnostic_failed/);
  assert.match(blocked.blocker, /mathlib_package_materialization_missing/);
  assert.equal(getClaim(projectRoot, project.project_id, claim.id)?.status, "conjectural");
  assert.equal(existsSync(join(projectRoot, ".comath", "lean", "final_replay")), false);
  assert.equal(existsSync(join(projectRoot, ".comath/campaign/CAM-0238/mathlib_host_replay_diagnostic.json")), false);
  assert.equal(existsSync(join(projectRoot, ".comath/campaign/CAM-0238/mathlib_import_graph_diagnostic.json")), false);
  const preflightPath = ".comath/campaign/CAM-0238/mathlib_no_download_fixture_preflight.json";
  assert.equal(
    existsSync(join(projectRoot, preflightPath)),
    true,
    "campaign path must persist no-download fixture preflight before host/import diagnostics"
  );
  const preflightArtifact = JSON.parse(readFileSync(join(projectRoot, preflightPath), "utf8"));
  assert.equal(preflightArtifact.schema_version, "comath.campaign_live_mathlib_no_download_fixture_preflight.v1");
  assert.equal(preflightArtifact.result, "fail");
  assert.equal(preflightArtifact.readiness_status, "blocked_before_host_diagnostics");
  assert.ok(preflightArtifact.hard_vetoes.includes("mathlib_package_materialization_missing"));
  assert.equal(preflightArtifact.executes_lean_or_lake, false);
  assert.equal(preflightArtifact.download_attempted, false);
  assert.equal(preflightArtifact.ready_for_task218_219_diagnostics, false);
  assert.equal(preflightArtifact.can_allocate_final_replay_workspace, false);
  assert.equal(preflightArtifact.proof_authority, "none");
  assert.equal(preflightArtifact.can_promote_claim, false);
  assert.equal(preflightArtifact.preflight_is_proof_authority, false);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task238 campaign live Mathlib no-download fixture preflight tests passed.");
