import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import {
  evaluateCampaignLiveMathlibProvisioningDiagnostic,
  getClaim,
  getComathdStatus,
  initProject,
  registerClaim,
  runCleanLeanReplay,
  statementHash,
  tickCampaign,
  writeCampaign
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task216-mathlib-provisioning-"));
const oldPath = process.env.PATH;
const mathlibRev = "0123456789abcdef0123456789abcdef01234567";
const theoremName = "MathResearch.Goal3Task216GroupInv";

function writeProjectFile(relativePath, text) {
  const absolute = join(projectRoot, relativePath);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, text, "utf8");
  return absolute;
}

function writeJsonProjectFile(relativePath, value) {
  return writeProjectFile(relativePath, `${JSON.stringify(value, null, 2)}\n`);
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

function campaignFixture(projectId, claimId, statementHashValue, campaignId = "CAM-0216") {
  const now = "2026-06-05T00:00:00.000Z";
  return {
    campaign_id: campaignId,
    project_id: projectId,
    root_claim_id: claimId,
    user_goal: "Task216 must require locally materialized Mathlib package evidence before live replay",
    current_stage: "final_global_replay",
    status: "running",
    strict_mode: true,
    stage_runs: [],
    open_obligations: [
      {
        obligation_id: "PO-0216",
        claim_id: claimId,
        locked_statement_nl:
          "theorem MathResearch.Goal3Task216GroupInv (G : Type) [Group G] (g : G) : g * Inv.inv g = 1",
        locked_statement_structured: {},
        statement_hash: statementHashValue,
        dependencies: [],
        assumptions: [],
        status: "candidate_selected"
      }
    ],
    accepted_artifacts: [],
    blockers: [],
    next_actions: ["run final global Lean replay only after Mathlib provisioning diagnostic"],
    created_at: now,
    updated_at: now
  };
}

function finalReplayRequestPayload(claim, claimStatement, leanRootRel, campaignId = "CAM-0216") {
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
      theorem_family_id: campaignId,
      canonical_proposition: "(G : Type) [Group G] (g : G) : g * Inv.inv g = 1",
      build_targets: ["MathResearch"],
      replay_command: "lake build MathResearch",
      primary_dependency: "Mathlib",
      formal_spec: {
        claim_id: claim.id,
        theorem_name: "Goal3Task216GroupInv",
        namespace: "MathResearch",
        normalized_statement: claimStatement,
        locked_statement_hash: claim.statement_hash
      }
    }
  };
}

function writeMathlibCampaignProject(leanRootRel, claim) {
  const theoremFile = writeProjectFile(
    `${leanRootRel}/MathResearch/Target.lean`,
    [
      "import Mathlib",
      "",
      "namespace MathResearch",
      "",
      "theorem Goal3Task216GroupInv (G : Type) [Group G] (g : G) : g * Inv.inv g = 1 := by",
      "  exact mul_inv_cancel g",
      "",
      "#check Goal3Task216GroupInv",
      "#print axioms Goal3Task216GroupInv",
      "",
      "end MathResearch",
      ""
    ].join("\n")
  );
  const auditFile = writeProjectFile(
    `${leanRootRel}/Audit/TargetAudit.lean`,
    "import MathResearch.Target\n#check MathResearch.Goal3Task216GroupInv\n#print axioms MathResearch.Goal3Task216GroupInv\n"
  );
  writeJsonProjectFile(`${leanRootRel}/FormalSpec/formal_spec_lock.json`, {
    schema_version: "comath.formal_spec_lock.v2",
    binding_scope: "campaign",
    campaign_id: "CAM-0216",
    claim_id: claim.id,
    namespace: "MathResearch",
    theorem_name: "Goal3Task216GroupInv",
    theorem_header: "theorem Goal3Task216GroupInv (G : Type) [Group G] (g : G) : g * Inv.inv g = 1",
    statement_hash: claim.statement_hash,
    proof_authority: "none"
  });
  writeJsonProjectFile(`${leanRootRel}/FormalSpec/assumption_ledger.json`, {
    schema_version: "comath.assumption_ledger.v1",
    binding_scope: "campaign",
    campaign_id: "CAM-0216",
    claim_id: claim.id,
    formal_spec_lock_hash: claim.statement_hash,
    entries: [],
    proof_authority: "none"
  });
  const lakefile = writeProjectFile(`${leanRootRel}/lakefile.lean`, mathlibLakefile());
  const toolchainFile = writeProjectFile(`${leanRootRel}/lean-toolchain`, "leanprover/lean4:v4.23.0\n");
  writeJsonProjectFile(`${leanRootRel}/lake-manifest.json`, {
    version: 7,
    packages: [mathlibManifestPackage()]
  });
  return { theoremFile, auditFile, lakefile, toolchainFile };
}

function installFakeLeanAndLake() {
  const bin = join(projectRoot, ".comath", "fake-bin-task216");
  mkdirSync(bin, { recursive: true });
  const lakeOutputLines = [
    `${theoremName} (G : Type) [inst : Group G] (g : G) : g * Inv.inv g = 1`,
    `${theoremName} does not depend on any axioms`
  ];
  writeFileSync(
    join(bin, "lean.cmd"),
    "@echo off\r\necho Lean (version 4.23.0, x86_64-pc-windows-msvc, commit task216)\r\nexit /b 0\r\n",
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
      ...lakeOutputLines.map((line) => `echo ${line}`),
      "exit /b 0",
      ""
    ].join("\r\n"),
    "utf8"
  );
  const leanSh = join(bin, "lean");
  const lakeSh = join(bin, "lake");
  writeFileSync(leanSh, "#!/bin/sh\necho 'Lean (version 4.23.0, x86_64-unknown-linux-gnu, commit task216)'\n", "utf8");
  writeFileSync(
    lakeSh,
    [
      "#!/bin/sh",
      "if [ \"$1\" = \"--version\" ]; then",
      "  echo 'Lake version 5.0.0'",
      "  exit 0",
      "fi",
      ...lakeOutputLines.map((line) => `echo '${line}'`),
      ""
    ].join("\n"),
    "utf8"
  );
  chmodSync(leanSh, 0o755);
  chmodSync(lakeSh, 0o755);
  process.env.PATH = `${bin}${delimiter}${process.env.PATH ?? ""}`;
}

try {
  assert.ok(
    getComathdStatus().capabilities.includes("campaign_live_mathlib_provisioning_diagnostic"),
    "Task216 capability must be advertised for smoke/release discovery"
  );

  const leanRootRel = ".comath/lean/task216-mathlib";
  const { project } = initProject({ name: "Goal 3 Task 216", root_path: projectRoot });
  const claimStatement = `${theoremName} (G : Type) [Group G] (g : G) : g * Inv.inv g = 1`;
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: claimStatement,
    assumptions: [],
    domain: "algebra",
    status: "conjectural",
    actor: "goal3-task216"
  });
  assert.equal(claim.statement_hash, statementHash(claimStatement));
  const projectFiles = writeMathlibCampaignProject(leanRootRel, claim);
  const lakeManifest = { version: 7, packages: [mathlibManifestPackage()] };

  const missingDiagnostic = evaluateCampaignLiveMathlibProvisioningDiagnostic({
    packagingScope: "campaign",
    primaryDependency: "Mathlib",
    leanRoot: join(projectRoot, leanRootRel),
    lakeManifest
  });
  assert.equal(missingDiagnostic.schema_version, "comath.campaign_live_mathlib_provisioning_diagnostic.v1");
  assert.equal(missingDiagnostic.result, "fail");
  assert.ok(missingDiagnostic.hard_vetoes.includes("mathlib_package_materialization_missing"));
  assert.equal(missingDiagnostic.network_policy, "disabled");
  assert.equal(missingDiagnostic.proof_authority, "none");
  assert.equal(missingDiagnostic.can_promote_claim, false);

  writeCampaign(projectRoot, campaignFixture(project.project_id, claim.id, claim.statement_hash), "goal3-task216");
  writeJsonProjectFile(".comath/campaign/CAM-0216/final_replay_request.json", finalReplayRequestPayload(claim, claimStatement, leanRootRel));

  const blocked = await tickCampaign({
    project_root: projectRoot,
    campaign_id: "CAM-0216",
    actor: "goal3-task216"
  });
  assert.equal(blocked.campaign.current_stage, "blocked");
  assert.equal(blocked.campaign.terminal_state, "blocked_with_replayable_reason");
  assert.equal(blocked.campaign.formal_replay_authority_passed, false);
  assert.match(blocked.blocker, /campaign_live_mathlib_provisioning_diagnostic_failed/);
  assert.match(blocked.blocker, /mathlib_package_materialization_missing/);
  const blockerPath = blocked.campaign.blockers[0]?.artifact_path;
  assert.equal(typeof blockerPath, "string");
  const blockerArtifact = JSON.parse(readFileSync(join(projectRoot, blockerPath), "utf8"));
  assert.match(blockerArtifact.reason, /campaign_live_mathlib_provisioning_diagnostic_failed/);
  assert.equal(blockerArtifact.proof_authority, "none");
  assert.equal(blockerArtifact.can_promote_claim, false);
  assert.equal(getClaim(projectRoot, project.project_id, claim.id)?.status, "conjectural");
  assert.equal(
    existsSync(join(projectRoot, ".comath", "lean", "final_replay")),
    false,
    "Mathlib provisioning diagnostic failures must block before allocating final replay workspaces"
  );

  const symlinkLeanRootRel = ".comath/lean/task216-symlink-mathlib";
  writeProjectFile(`${symlinkLeanRootRel}/.lake/packages/mathlib/Mathlib.lean`, "import Mathlib.Algebra.Group.Basic\n");
  writeProjectFile(`${symlinkLeanRootRel}/outside.txt`, "not package material\n");
  symlinkSync(
    join(projectRoot, symlinkLeanRootRel, "outside.txt"),
    join(projectRoot, symlinkLeanRootRel, ".lake", "packages", "mathlib", "Escapes.lean")
  );
  const symlinkDiagnostic = evaluateCampaignLiveMathlibProvisioningDiagnostic({
    packagingScope: "campaign",
    primaryDependency: "Mathlib",
    leanRoot: join(projectRoot, symlinkLeanRootRel),
    lakeManifest
  });
  assert.equal(symlinkDiagnostic.result, "fail");
  assert.ok(
    symlinkDiagnostic.hard_vetoes.includes("mathlib_package_symlink_forbidden:.lake/packages/mathlib/Escapes.lean"),
    "materialized Mathlib package symlinks must fail closed before clean replay copy"
  );
  const rootSymlinkLeanRootRel = ".comath/lean/task216-root-symlink-mathlib";
  writeProjectFile(`${rootSymlinkLeanRootRel}/outside-mathlib/Mathlib.lean`, "import Mathlib.Algebra.Group.Basic\n");
  mkdirSync(join(projectRoot, rootSymlinkLeanRootRel, ".lake", "packages"), { recursive: true });
  symlinkSync(
    join(projectRoot, rootSymlinkLeanRootRel, "outside-mathlib"),
    join(projectRoot, rootSymlinkLeanRootRel, ".lake", "packages", "mathlib"),
    "dir"
  );
  const rootSymlinkDiagnostic = evaluateCampaignLiveMathlibProvisioningDiagnostic({
    packagingScope: "campaign",
    primaryDependency: "Mathlib",
    leanRoot: join(projectRoot, rootSymlinkLeanRootRel),
    lakeManifest
  });
  assert.equal(rootSymlinkDiagnostic.result, "fail");
  assert.ok(
    rootSymlinkDiagnostic.hard_vetoes.includes("mathlib_package_root_symlink_forbidden:.lake/packages/mathlib"),
    "root Mathlib package symlinks must not be followed, hashed, or copied"
  );

  writeProjectFile(`${leanRootRel}/.lake/packages/mathlib/Mathlib.lean`, "import Mathlib.Algebra.Group.Basic\n");
  writeProjectFile(`${leanRootRel}/.lake/packages/mathlib/Mathlib/Algebra/Group/Basic.lean`, "class Group (G : Type) where\n");
  const presentDiagnostic = evaluateCampaignLiveMathlibProvisioningDiagnostic({
    packagingScope: "campaign",
    primaryDependency: "Mathlib",
    leanRoot: join(projectRoot, leanRootRel),
    lakeManifest
  });
  assert.equal(presentDiagnostic.result, "pass");
  assert.equal(presentDiagnostic.mathlib_revision, mathlibRev);
  assert.equal(presentDiagnostic.materialized_package_root, ".lake/packages/mathlib");
  assert.ok(Object.keys(presentDiagnostic.materialized_file_hashes).includes(".lake/packages/mathlib/Mathlib.lean"));
  assert.equal(presentDiagnostic.proof_authority, "none");
  assert.equal(presentDiagnostic.can_promote_claim, false);

  installFakeLeanAndLake();
  writeCampaign(projectRoot, campaignFixture(project.project_id, claim.id, claim.statement_hash, "CAM-1217"), "goal3-task216");
  writeJsonProjectFile(
    ".comath/campaign/CAM-1217/final_replay_request.json",
    finalReplayRequestPayload(claim, claimStatement, leanRootRel, "CAM-1217")
  );
  await tickCampaign({
    project_root: projectRoot,
    campaign_id: "CAM-1217",
    actor: "goal3-task216"
  });
  const persistedDiagnosticPath = ".comath/campaign/CAM-1217/mathlib_provisioning_diagnostic.json";
  assert.equal(
    existsSync(join(projectRoot, persistedDiagnosticPath)),
    true,
    "passing campaign-native Mathlib provisioning diagnostics must be durably recorded before replay allocation"
  );
  const replayClaimId = "CLM-1216";
  const replay = runCleanLeanReplay({
    projectRoot,
    project_id: project.project_id,
    actor: "goal3-task216",
    campaign_id: "CAM-1216",
    claim_id: replayClaimId,
    leanProject: {
      projectRoot,
      leanRoot: join(projectRoot, leanRootRel),
      theoremFile: projectFiles.theoremFile,
      theoremFileRel: "MathResearch/Target.lean",
      formalSpecFile: join(projectRoot, leanRootRel, "FormalSpec", "formal_spec_lock.json"),
      auditFile: projectFiles.auditFile,
      auditFileRel: "Audit/TargetAudit.lean",
      lakefile: projectFiles.lakefile,
      toolchainFile: projectFiles.toolchainFile,
      theoremName,
      theoremFamilyId: "CAM-1216",
      canonicalProposition: "(G : Type) [Group G] (g : G) : g * Inv.inv g = 1",
      buildTargets: ["MathResearch"],
      replayCommand: "lake build MathResearch",
      primaryDependency: "Mathlib",
      formalSpec: {
        claim_id: claim.id,
        theorem_name: "Goal3Task216GroupInv",
        namespace: "MathResearch",
        normalized_statement: claimStatement,
        locked_statement_hash: claim.statement_hash
      }
    },
    provisioningDiagnosticPath: persistedDiagnosticPath
  });
  assert.equal(
    existsSync(join(projectRoot, replay.final_replay.clean_workspace_path, ".lake", "packages", "mathlib", "Mathlib.lean")),
    true,
    "clean replay must copy materialized Mathlib package sources into the hermetic workspace"
  );
  const finalReplayManifest = JSON.parse(readFileSync(join(projectRoot, replay.final_replay_manifest_v3_path), "utf8"));
  assert.equal(
    typeof finalReplayManifest.source_hashes_after[".lake/packages/mathlib/Mathlib.lean"]?.sha256,
    "string",
    "FinalReplayManifest v3 must bind copied Mathlib package material into the clean workspace hash set"
  );
  assert.equal(
    finalReplayManifest.dependency_lock.external_revisions.some(
      (revision) => revision.name === "mathlib" && typeof revision.materialized_package_hash === "string"
    ),
    true,
    "FinalReplayManifest v3 dependency lock must bind the materialized Mathlib package hash"
  );
  const replayPackMathlibFile = join(
    projectRoot,
    replay.third_party_replay_pack_path,
    "clean",
    ".lake",
    "packages",
    "mathlib",
    "Mathlib.lean"
  );
  assert.equal(
    existsSync(replayPackMathlibFile),
    true,
    "third-party replay pack must include copied Mathlib package material referenced by source_hashes_after"
  );
  assert.equal(typeof replay.final_replay.provisioning_diagnostic_path, "string");
  const provisioningDiagnosticArtifact = JSON.parse(readFileSync(join(projectRoot, replay.final_replay.provisioning_diagnostic_path), "utf8"));
  assert.equal(provisioningDiagnosticArtifact.schema_version, "comath.campaign_live_mathlib_provisioning_diagnostic.v1");
  assert.equal(provisioningDiagnosticArtifact.proof_authority, "none");
  assert.equal(provisioningDiagnosticArtifact.can_promote_claim, false);
  assert.equal(provisioningDiagnosticArtifact.result, "pass");
} finally {
  process.env.PATH = oldPath;
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task216 campaign live Mathlib provisioning diagnostic tests passed.");
