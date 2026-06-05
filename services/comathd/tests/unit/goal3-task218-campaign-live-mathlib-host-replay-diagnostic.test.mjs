import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import {
  evaluateCampaignLiveMathlibHostReplayDiagnostic,
  getClaim,
  getComathdStatus,
  initProject,
  registerClaim,
  statementHash,
  tickCampaign,
  writeCampaign
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task218-mathlib-host-replay-"));
const oldPath = process.env.PATH;
const oldElanHome = process.env.ELAN_HOME;
const mathlibRev = "0123456789abcdef0123456789abcdef01234567";
const theoremName = "MathResearch.Goal3Task218GroupInv";

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

function mathlibManifestPackage() {
  return {
    name: "mathlib",
    url: "https://github.com/leanprover-community/mathlib4",
    rev: mathlibRev,
    license: "Apache-2.0"
  };
}

function campaignFixture(projectId, claimId, statementHashValue, campaignId = "CAM-0218") {
  const now = "2026-06-05T00:00:00.000Z";
  return {
    campaign_id: campaignId,
    project_id: projectId,
    root_claim_id: claimId,
    user_goal: "Task218 must require host Lean/Lake availability evidence before live Mathlib replay",
    current_stage: "final_global_replay",
    status: "running",
    strict_mode: true,
    stage_runs: [],
    open_obligations: [
      {
        obligation_id: "PO-0218",
        claim_id: claimId,
        locked_statement_nl:
          "theorem MathResearch.Goal3Task218GroupInv (G : Type) [Group G] (g : G) : g * Inv.inv g = 1",
        locked_statement_structured: {},
        statement_hash: statementHashValue,
        dependencies: [],
        assumptions: [],
        status: "candidate_selected"
      }
    ],
    accepted_artifacts: [],
    blockers: [],
    next_actions: ["run final global Lean replay only after host Lean/Lake diagnostic"],
    created_at: now,
    updated_at: now
  };
}

function finalReplayRequestPayload(claim, claimStatement, leanRootRel, campaignId = "CAM-0218", buildTargets = ["MathResearch"]) {
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
      build_targets: buildTargets,
      replay_command: "lake build MathResearch",
      primary_dependency: "Mathlib",
      formal_spec: {
        claim_id: claim.id,
        theorem_name: "Goal3Task218GroupInv",
        namespace: "MathResearch",
        normalized_statement: claimStatement,
        locked_statement_hash: claim.statement_hash
      }
    }
  };
}

function writeMathlibCampaignProject(leanRootRel, claim) {
  writeProjectFile(
    `${leanRootRel}/MathResearch/Target.lean`,
    [
      "import Mathlib",
      "",
      "namespace MathResearch",
      "",
      "theorem Goal3Task218GroupInv (G : Type) [Group G] (g : G) : g * Inv.inv g = 1 := by",
      "  exact mul_inv_cancel g",
      "",
      "#check Goal3Task218GroupInv",
      "#print axioms Goal3Task218GroupInv",
      "",
      "end MathResearch",
      ""
    ].join("\n")
  );
  writeProjectFile(
    `${leanRootRel}/Audit/TargetAudit.lean`,
    "import MathResearch.Target\n#check MathResearch.Goal3Task218GroupInv\n#print axioms MathResearch.Goal3Task218GroupInv\n"
  );
  writeJsonProjectFile(`${leanRootRel}/FormalSpec/formal_spec_lock.json`, {
    schema_version: "comath.formal_spec_lock.v2",
    binding_scope: "campaign",
    campaign_id: "CAM-0218",
    claim_id: claim.id,
    namespace: "MathResearch",
    theorem_name: "Goal3Task218GroupInv",
    theorem_header: "theorem Goal3Task218GroupInv (G : Type) [Group G] (g : G) : g * Inv.inv g = 1",
    statement_hash: claim.statement_hash,
    proof_authority: "none"
  });
  writeJsonProjectFile(`${leanRootRel}/FormalSpec/assumption_ledger.json`, {
    schema_version: "comath.assumption_ledger.v1",
    binding_scope: "campaign",
    campaign_id: "CAM-0218",
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
  writeProjectFile(`${leanRootRel}/.lake/packages/mathlib/Mathlib.lean`, "import Mathlib.Algebra.Group.Basic\n");
  writeProjectFile(`${leanRootRel}/.lake/packages/mathlib/Mathlib/Algebra/Group/Basic.lean`, "class Group (G : Type) where\n");
}

function installFakeLeanAndLake(version = "4.23.0") {
  const bin = join(projectRoot, `.comath/fake-bin-task218-${version}`);
  mkdirSync(bin, { recursive: true });
  const replayLines = [
    `${theoremName} (G : Type) [inst : Group G] (g : G) : g * Inv.inv g = 1`,
    `${theoremName} does not depend on any axioms`
  ];
  writeFileSync(
    join(bin, "lean.cmd"),
    `@echo off\r\necho Lean (version ${version}, x86_64-pc-windows-msvc, commit task218)\r\nexit /b 0\r\n`,
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
      ...replayLines.map((line) => `echo ${line}`),
      "exit /b 0",
      ""
    ].join("\r\n"),
    "utf8"
  );
  const leanSh = join(bin, "lean");
  const lakeSh = join(bin, "lake");
  writeFileSync(leanSh, `#!/bin/sh\necho 'Lean (version ${version}, x86_64-unknown-linux-gnu, commit task218)'\n`, "utf8");
  writeFileSync(
    lakeSh,
    [
      "#!/bin/sh",
      "if [ \"$1\" = \"--version\" ]; then",
      "  echo 'Lake version 5.0.0'",
      "  exit 0",
      "fi",
      ...replayLines.map((line) => `echo '${line}'`),
      ""
    ].join("\n"),
    "utf8"
  );
  chmodSync(leanSh, 0o755);
  chmodSync(lakeSh, 0o755);
  return bin;
}

try {
  assert.ok(
    getComathdStatus().capabilities.includes("campaign_live_mathlib_host_replay_diagnostic"),
    "Task218 capability must be advertised for smoke/release discovery"
  );

  const leanRootRel = ".comath/lean/task218-mathlib";
  const { project } = initProject({ name: "Goal 3 Task 218", root_path: projectRoot });
  const claimStatement = `${theoremName} (G : Type) [Group G] (g : G) : g * Inv.inv g = 1`;
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: claimStatement,
    assumptions: [],
    domain: "algebra",
    status: "conjectural",
    actor: "goal3-task218"
  });
  assert.equal(claim.statement_hash, statementHash(claimStatement));
  writeMathlibCampaignProject(leanRootRel, claim);

  const emptyElanHome = join(projectRoot, ".comath", "empty-elan");
  mkdirSync(emptyElanHome, { recursive: true });
  process.env.ELAN_HOME = emptyElanHome;
  process.env.PATH = "";
  const missingDiagnostic = evaluateCampaignLiveMathlibHostReplayDiagnostic({
    packagingScope: "campaign",
    primaryDependency: "Mathlib",
    leanRoot: join(projectRoot, leanRootRel),
    leanToolchain: "leanprover/lean4:v4.23.0",
    theoremFileRel: "MathResearch/Target.lean",
    auditFileRel: "Audit/TargetAudit.lean",
    buildTargets: ["MathResearch"],
    lakefileText: mathlibLakefile()
  });
  assert.equal(missingDiagnostic.schema_version, "comath.campaign_live_mathlib_host_replay_diagnostic.v1");
  assert.equal(missingDiagnostic.result, "fail");
  assert.ok(missingDiagnostic.hard_vetoes.includes("lean_binary_missing"));
  assert.ok(missingDiagnostic.hard_vetoes.includes("lake_binary_missing"));
  assert.equal(missingDiagnostic.proof_authority, "none");
  assert.equal(missingDiagnostic.can_promote_claim, false);
  assert.equal(missingDiagnostic.diagnostic_is_proof_authority, false);
  assert.deepEqual(missingDiagnostic.replay_plan.final_replay, ["lake", "build", "MathResearch"]);

  writeCampaign(projectRoot, campaignFixture(project.project_id, claim.id, claim.statement_hash), "goal3-task218");
  writeJsonProjectFile(".comath/campaign/CAM-0218/final_replay_request.json", finalReplayRequestPayload(claim, claimStatement, leanRootRel));
  const blocked = await tickCampaign({
    project_root: projectRoot,
    campaign_id: "CAM-0218",
    actor: "goal3-task218"
  });
  assert.equal(blocked.campaign.current_stage, "blocked");
  assert.equal(blocked.campaign.terminal_state, "blocked_with_replayable_reason");
  assert.match(blocked.blocker, /campaign_live_mathlib_host_replay_diagnostic_failed/);
  assert.equal(existsSync(join(projectRoot, ".comath", "lean", "final_replay")), false);
  assert.equal(getClaim(projectRoot, project.project_id, claim.id)?.status, "conjectural");
  const failedDiagnosticArtifact = JSON.parse(readFileSync(join(projectRoot, ".comath/campaign/CAM-0218/mathlib_host_replay_diagnostic.json"), "utf8"));
  assert.equal(failedDiagnosticArtifact.proof_authority, "none");
  assert.equal(failedDiagnosticArtifact.can_promote_claim, false);

  process.env.PATH = `${installFakeLeanAndLake("4.22.0")}${delimiter}${oldPath ?? ""}`;
  const mismatchDiagnostic = evaluateCampaignLiveMathlibHostReplayDiagnostic({
    packagingScope: "campaign",
    primaryDependency: "Mathlib",
    leanRoot: join(projectRoot, leanRootRel),
    leanToolchain: "leanprover/lean4:v4.23.0",
    theoremFileRel: "MathResearch/Target.lean",
    auditFileRel: "Audit/TargetAudit.lean",
    buildTargets: ["MathResearch"],
    lakefileText: mathlibLakefile()
  });
  assert.equal(mismatchDiagnostic.result, "fail");
  assert.ok(mismatchDiagnostic.hard_vetoes.includes("lean_toolchain_version_mismatch"));

  process.env.PATH = `${installFakeLeanAndLake("4.23.0")}${delimiter}${oldPath ?? ""}`;
  const passingDiagnostic = evaluateCampaignLiveMathlibHostReplayDiagnostic({
    packagingScope: "campaign",
    primaryDependency: "Mathlib",
    leanRoot: join(projectRoot, leanRootRel),
    leanToolchain: "leanprover/lean4:v4.23.0",
    theoremFileRel: "MathResearch/Target.lean",
    auditFileRel: "Audit/TargetAudit.lean",
    buildTargets: ["MathResearch"],
    lakefileText: mathlibLakefile()
  });
  assert.equal(passingDiagnostic.result, "pass");
  assert.match(passingDiagnostic.lean_binary_sha256, /^[a-f0-9]{64}$/);
  assert.match(passingDiagnostic.lake_binary_sha256, /^[a-f0-9]{64}$/);
  assert.equal(passingDiagnostic.lean_version, "4.23.0");
  assert.equal(passingDiagnostic.expected_lean_version, "4.23.0");
  assert.equal(passingDiagnostic.network_policy, "disabled");
  assert.equal(passingDiagnostic.probe_source, "service_owned_process");

  const unsafeTargetDiagnostic = evaluateCampaignLiveMathlibHostReplayDiagnostic({
    packagingScope: "campaign",
    primaryDependency: "Mathlib",
    leanRoot: join(projectRoot, leanRootRel),
    leanToolchain: "leanprover/lean4:v4.23.0",
    theoremFileRel: "MathResearch/Target.lean",
    auditFileRel: "Audit/TargetAudit.lean",
    buildTargets: ["MathResearch & echo injected"],
    lakefileText: mathlibLakefile()
  });
  assert.equal(unsafeTargetDiagnostic.result, "fail");
  assert.ok(unsafeTargetDiagnostic.hard_vetoes.includes("unsafe_build_target_argument"));

  writeCampaign(projectRoot, campaignFixture(project.project_id, claim.id, claim.statement_hash, "CAM-2218"), "goal3-task218");
  writeJsonProjectFile(
    ".comath/campaign/CAM-2218/final_replay_request.json",
    finalReplayRequestPayload(claim, claimStatement, leanRootRel, "CAM-2218", ["MathResearch & echo injected"])
  );
  const unsafeBlocked = await tickCampaign({
    project_root: projectRoot,
    campaign_id: "CAM-2218",
    actor: "goal3-task218"
  });
  assert.equal(unsafeBlocked.campaign.current_stage, "blocked");
  assert.match(unsafeBlocked.blocker, /unsafe_build_target_argument/);
  assert.equal(existsSync(join(projectRoot, ".comath", "lean", "final_replay")), false);

  const missingTargetDiagnostic = evaluateCampaignLiveMathlibHostReplayDiagnostic({
    packagingScope: "campaign",
    primaryDependency: "Mathlib",
    leanRoot: join(projectRoot, leanRootRel),
    leanToolchain: "leanprover/lean4:v4.23.0",
    theoremFileRel: "MathResearch/Target.lean",
    auditFileRel: "Audit/TargetAudit.lean",
    buildTargets: ["MissingTarget"],
    lakefileText: mathlibLakefile()
  });
  assert.equal(missingTargetDiagnostic.result, "fail");
  assert.ok(missingTargetDiagnostic.hard_vetoes.includes("lake_build_target_not_declared:MissingTarget"));

  writeCampaign(projectRoot, campaignFixture(project.project_id, claim.id, claim.statement_hash, "CAM-1218"), "goal3-task218");
  writeJsonProjectFile(
    ".comath/campaign/CAM-1218/final_replay_request.json",
    finalReplayRequestPayload(claim, claimStatement, leanRootRel, "CAM-1218")
  );
  await tickCampaign({
    project_root: projectRoot,
    campaign_id: "CAM-1218",
    actor: "goal3-task218"
  });
  const persistedDiagnosticPath = ".comath/campaign/CAM-1218/mathlib_host_replay_diagnostic.json";
  assert.equal(existsSync(join(projectRoot, persistedDiagnosticPath)), true);
  const persistedDiagnostic = JSON.parse(readFileSync(join(projectRoot, persistedDiagnosticPath), "utf8"));
  assert.equal(persistedDiagnostic.schema_version, "comath.campaign_live_mathlib_host_replay_diagnostic.v1");
  assert.equal(persistedDiagnostic.result, "pass");
  assert.equal(persistedDiagnostic.proof_authority, "none");
  assert.equal(persistedDiagnostic.can_promote_claim, false);
  assert.equal(persistedDiagnostic.diagnostic_is_proof_authority, false);
  assert.match(persistedDiagnostic.provisioning_diagnostic_hash, /^[a-f0-9]{64}$/);
} finally {
  process.env.PATH = oldPath;
  if (oldElanHome === undefined) {
    delete process.env.ELAN_HOME;
  } else {
    process.env.ELAN_HOME = oldElanHome;
  }
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task218 campaign live Mathlib host replay diagnostic tests passed.");
