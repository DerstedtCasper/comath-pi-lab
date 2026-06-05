import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import {
  evaluateCampaignLiveMathlibImportGraphDiagnostic,
  getComathdStatus,
  initProject,
  registerClaim,
  statementHash,
  tickCampaign,
  writeCampaign
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task219-mathlib-import-graph-"));
const oldPath = process.env.PATH;
const oldElanHome = process.env.ELAN_HOME;
const mathlibRev = "0123456789abcdef0123456789abcdef01234567";
const theoremName = "MathResearch.Goal3Task219GroupInv";

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

function campaignFixture(projectId, claimId, statementHashValue, campaignId = "CAM-0219") {
  const now = "2026-06-05T00:00:00.000Z";
  return {
    campaign_id: campaignId,
    project_id: projectId,
    root_claim_id: claimId,
    user_goal: "Task219 must require Lake-produced import graph evidence before live Mathlib replay",
    current_stage: "final_global_replay",
    status: "running",
    strict_mode: true,
    stage_runs: [],
    open_obligations: [
      {
        obligation_id: "PO-0219",
        claim_id: claimId,
        locked_statement_nl:
          "theorem MathResearch.Goal3Task219GroupInv (G : Type) [Group G] (g : G) : g * Inv.inv g = 1",
        locked_statement_structured: {},
        statement_hash: statementHashValue,
        dependencies: [],
        assumptions: [],
        status: "candidate_selected"
      }
    ],
    accepted_artifacts: [],
    blockers: [],
    next_actions: ["run final global Lean replay only after Lake import graph diagnostic"],
    created_at: now,
    updated_at: now
  };
}

function finalReplayRequestPayload(claim, claimStatement, leanRootRel, campaignId = "CAM-0219") {
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
        theorem_name: "Goal3Task219GroupInv",
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
      "theorem Goal3Task219GroupInv (G : Type) [Group G] (g : G) : g * Inv.inv g = 1 := by",
      "  exact mul_inv_cancel g",
      "",
      "#check Goal3Task219GroupInv",
      "#print axioms Goal3Task219GroupInv",
      "",
      "end MathResearch",
      ""
    ].join("\n")
  );
  writeProjectFile(
    `${leanRootRel}/Audit/TargetAudit.lean`,
    "import MathResearch.Target\n#check MathResearch.Goal3Task219GroupInv\n#print axioms MathResearch.Goal3Task219GroupInv\n"
  );
  writeJsonProjectFile(`${leanRootRel}/FormalSpec/formal_spec_lock.json`, {
    schema_version: "comath.formal_spec_lock.v2",
    binding_scope: "campaign",
    campaign_id: "CAM-0219",
    claim_id: claim.id,
    namespace: "MathResearch",
    theorem_name: "Goal3Task219GroupInv",
    theorem_header: "theorem Goal3Task219GroupInv (G : Type) [Group G] (g : G) : g * Inv.inv g = 1",
    statement_hash: claim.statement_hash,
    proof_authority: "none"
  });
  writeJsonProjectFile(`${leanRootRel}/FormalSpec/assumption_ledger.json`, {
    schema_version: "comath.assumption_ledger.v1",
    binding_scope: "campaign",
    campaign_id: "CAM-0219",
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

let fakeToolInstallCounter = 0;

function installFakeLeanAndLake({ depsExitCode = 0, depsStdoutLines, depsStderrLines } = {}) {
  fakeToolInstallCounter += 1;
  const bin = join(projectRoot, `.comath/fake-bin-task219-${fakeToolInstallCounter}`);
  mkdirSync(bin, { recursive: true });
  const replayLines = [
    `${theoremName} (G : Type) [inst : Group G] (g : G) : g * Inv.inv g = 1`,
    `${theoremName} does not depend on any axioms`
  ];
  const defaultDepsLines = [
    "MathResearch/Target.olean: MathResearch/Target.lean .lake/packages/mathlib/Mathlib.olean",
    "Audit/TargetAudit.olean: Audit/TargetAudit.lean MathResearch/Target.olean .lake/packages/mathlib/Mathlib.olean"
  ];
  const stdoutLines = depsStdoutLines ?? (depsExitCode === 0 ? defaultDepsLines : []);
  const stderrLines = depsStderrLines ?? (depsExitCode === 0 ? [] : ["import graph failed"]);
  writeFileSync(
    join(bin, "lean.cmd"),
    "@echo off\r\necho Lean (version 4.23.0, x86_64-pc-windows-msvc, commit task219)\r\nexit /b 0\r\n",
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
      "if \"%1\"==\"env\" if \"%2\"==\"lean\" if \"%3\"==\"--deps\" (",
      ...stdoutLines.map((line) => `  echo ${line}`),
      ...stderrLines.map((line) => `  echo ${line} 1>&2`),
      `  exit /b ${depsExitCode}`,
      ")",
      ...replayLines.map((line) => `echo ${line}`),
      "exit /b 0",
      ""
    ].join("\r\n"),
    "utf8"
  );
  const leanSh = join(bin, "lean");
  const lakeSh = join(bin, "lake");
  writeFileSync(leanSh, "#!/bin/sh\necho 'Lean (version 4.23.0, x86_64-unknown-linux-gnu, commit task219)'\n", "utf8");
  writeFileSync(
    lakeSh,
    [
      "#!/bin/sh",
      "if [ \"$1\" = \"--version\" ]; then",
      "  echo 'Lake version 5.0.0'",
      "  exit 0",
      "fi",
      "if [ \"$1\" = \"env\" ] && [ \"$2\" = \"lean\" ] && [ \"$3\" = \"--deps\" ]; then",
      ...stdoutLines.map((line) => `  echo '${line}'`),
      ...stderrLines.map((line) => `  echo '${line}' >&2`),
      `  exit ${depsExitCode}`,
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
    getComathdStatus().capabilities.includes("campaign_live_mathlib_import_graph_diagnostic"),
    "Task219 capability must be advertised for smoke/release discovery"
  );

  const leanRootRel = ".comath/lean/task219-mathlib";
  const { project } = initProject({ name: "Goal 3 Task 219", root_path: projectRoot });
  const claimStatement = `${theoremName} (G : Type) [Group G] (g : G) : g * Inv.inv g = 1`;
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: claimStatement,
    assumptions: [],
    domain: "algebra",
    status: "conjectural",
    actor: "goal3-task219"
  });
  assert.equal(claim.statement_hash, statementHash(claimStatement));
  writeMathlibCampaignProject(leanRootRel, claim);

  const emptyElanHome = join(projectRoot, ".comath", "empty-elan");
  mkdirSync(emptyElanHome, { recursive: true });
  process.env.ELAN_HOME = emptyElanHome;
  process.env.PATH = `${installFakeLeanAndLake({ depsExitCode: 1 })}${delimiter}${oldPath ?? ""}`;
  const failingDiagnostic = evaluateCampaignLiveMathlibImportGraphDiagnostic({
    packagingScope: "campaign",
    primaryDependency: "Mathlib",
    leanRoot: join(projectRoot, leanRootRel),
    leanToolchain: "leanprover/lean4:v4.23.0",
    theoremFileRel: "MathResearch/Target.lean",
    auditFileRel: "Audit/TargetAudit.lean"
  });
  assert.equal(failingDiagnostic.schema_version, "comath.campaign_live_mathlib_import_graph_diagnostic.v1");
  assert.equal(failingDiagnostic.result, "fail");
  assert.ok(failingDiagnostic.hard_vetoes.includes("theorem_import_graph_probe_failed"));
  assert.ok(failingDiagnostic.hard_vetoes.includes("audit_import_graph_probe_failed"));
  assert.equal(failingDiagnostic.proof_authority, "none");
  assert.equal(failingDiagnostic.can_promote_claim, false);
  assert.equal(failingDiagnostic.import_graph_is_proof_authority, false);

  process.env.PATH = `${installFakeLeanAndLake({
    depsExitCode: 0,
    depsStdoutLines: [],
    depsStderrLines: ["warning: .lake/packages/mathlib/Mathlib.olean mentioned on stderr is not import graph output"]
  })}${delimiter}${oldPath ?? ""}`;
  const stderrOnlyDiagnostic = evaluateCampaignLiveMathlibImportGraphDiagnostic({
    packagingScope: "campaign",
    primaryDependency: "Mathlib",
    leanRoot: join(projectRoot, leanRootRel),
    leanToolchain: "leanprover/lean4:v4.23.0",
    theoremFileRel: "MathResearch/Target.lean",
    auditFileRel: "Audit/TargetAudit.lean"
  });
  assert.equal(stderrOnlyDiagnostic.result, "fail", "stderr-only Mathlib mentions must not satisfy import graph evidence");
  assert.ok(stderrOnlyDiagnostic.hard_vetoes.includes("theorem_import_graph_output_empty"));
  assert.ok(stderrOnlyDiagnostic.hard_vetoes.includes("audit_import_graph_output_empty"));
  assert.ok(stderrOnlyDiagnostic.hard_vetoes.includes("theorem_import_graph_primary_dependency_missing"));
  assert.ok(stderrOnlyDiagnostic.hard_vetoes.includes("audit_import_graph_primary_dependency_missing"));

  process.env.PATH = `${installFakeLeanAndLake({ depsExitCode: 0 })}${delimiter}${oldPath ?? ""}`;
  writeProjectFile(`${leanRootRel}/--help`, "import Mathlib\n#check True\n");
  writeProjectFile(`${leanRootRel}/--audit`, "import Mathlib\n#check True\n");
  const optionShapedPathDiagnostic = evaluateCampaignLiveMathlibImportGraphDiagnostic({
    packagingScope: "campaign",
    primaryDependency: "Mathlib",
    leanRoot: join(projectRoot, leanRootRel),
    leanToolchain: "leanprover/lean4:v4.23.0",
    theoremFileRel: "--help",
    auditFileRel: "--audit"
  });
  assert.equal(optionShapedPathDiagnostic.result, "fail", "option-shaped Lean file paths must not reach CLI args");
  assert.ok(optionShapedPathDiagnostic.hard_vetoes.includes("unsafe_theorem_file_argument"));
  assert.ok(optionShapedPathDiagnostic.hard_vetoes.includes("unsafe_audit_file_argument"));

  process.env.PATH = `${installFakeLeanAndLake({ depsExitCode: 1 })}${delimiter}${oldPath ?? ""}`;
  writeCampaign(projectRoot, campaignFixture(project.project_id, claim.id, claim.statement_hash), "goal3-task219");
  writeJsonProjectFile(".comath/campaign/CAM-0219/final_replay_request.json", finalReplayRequestPayload(claim, claimStatement, leanRootRel));
  const blocked = await tickCampaign({
    project_root: projectRoot,
    campaign_id: "CAM-0219",
    actor: "goal3-task219"
  });
  assert.equal(blocked.campaign.current_stage, "blocked");
  assert.equal(blocked.campaign.terminal_state, "blocked_with_replayable_reason");
  assert.match(blocked.blocker, /campaign_live_mathlib_import_graph_diagnostic_failed/);
  assert.equal(existsSync(join(projectRoot, ".comath", "lean", "final_replay")), false);
  const failedDiagnosticArtifact = JSON.parse(readFileSync(join(projectRoot, ".comath/campaign/CAM-0219/mathlib_import_graph_diagnostic.json"), "utf8"));
  assert.equal(failedDiagnosticArtifact.proof_authority, "none");
  assert.equal(failedDiagnosticArtifact.can_promote_claim, false);

  process.env.PATH = `${installFakeLeanAndLake({ depsExitCode: 0 })}${delimiter}${oldPath ?? ""}`;
  const passingDiagnostic = evaluateCampaignLiveMathlibImportGraphDiagnostic({
    packagingScope: "campaign",
    primaryDependency: "Mathlib",
    leanRoot: join(projectRoot, leanRootRel),
    leanToolchain: "leanprover/lean4:v4.23.0",
    theoremFileRel: "MathResearch/Target.lean",
    auditFileRel: "Audit/TargetAudit.lean"
  });
  assert.equal(passingDiagnostic.result, "pass");
  assert.equal(passingDiagnostic.import_graph_source, "lake_env_lean_deps");
  assert.match(passingDiagnostic.theorem_import_graph_probe.output_sha256, /^[a-f0-9]{64}$/);
  assert.equal(passingDiagnostic.theorem_import_graph_probe.output_contains_primary_dependency, true);
  assert.equal(passingDiagnostic.audit_import_graph_probe.output_contains_primary_dependency, true);

  writeCampaign(projectRoot, campaignFixture(project.project_id, claim.id, claim.statement_hash, "CAM-1219"), "goal3-task219");
  writeJsonProjectFile(
    ".comath/campaign/CAM-1219/final_replay_request.json",
    finalReplayRequestPayload(claim, claimStatement, leanRootRel, "CAM-1219")
  );
  await tickCampaign({
    project_root: projectRoot,
    campaign_id: "CAM-1219",
    actor: "goal3-task219"
  });
  const persistedDiagnosticPath = ".comath/campaign/CAM-1219/mathlib_import_graph_diagnostic.json";
  assert.equal(existsSync(join(projectRoot, persistedDiagnosticPath)), true);
  const persistedDiagnostic = JSON.parse(readFileSync(join(projectRoot, persistedDiagnosticPath), "utf8"));
  assert.equal(persistedDiagnostic.schema_version, "comath.campaign_live_mathlib_import_graph_diagnostic.v1");
  assert.equal(persistedDiagnostic.result, "pass");
  assert.equal(persistedDiagnostic.proof_authority, "none");
  assert.equal(persistedDiagnostic.can_promote_claim, false);
  assert.match(persistedDiagnostic.host_replay_diagnostic_hash, /^[a-f0-9]{64}$/);
  const finalReplay = JSON.parse(readFileSync(join(projectRoot, ".comath", "evidence", claim.id, "lean", "final_replay_manifest.json"), "utf8"));
  assert.equal(finalReplay.import_graph_diagnostic_path, persistedDiagnosticPath);
  const finalReplayV3 = JSON.parse(readFileSync(join(projectRoot, ".comath", "evidence", claim.id, "lean", "final_replay_manifest_v3.json"), "utf8"));
  assert.equal(finalReplayV3.report_paths.import_graph_diagnostic, persistedDiagnosticPath);
  assert.match(finalReplayV3.artifact_hashes.import_graph_diagnostic.sha256, /^[a-f0-9]{64}$/);
  const replayPackRoot = join(projectRoot, ".comath", "evidence", claim.id, "lean", "replay_pack", finalReplayV3.replay_id);
  const replayPackManifest = JSON.parse(readFileSync(join(replayPackRoot, "FinalReplayManifest.json"), "utf8"));
  assert.equal(replayPackManifest.report_paths.import_graph_diagnostic, persistedDiagnosticPath);
  const replayPackExpectedHashes = JSON.parse(readFileSync(join(replayPackRoot, "expected_hashes.json"), "utf8"));
  assert.equal(replayPackExpectedHashes.report_paths.import_graph_diagnostic, persistedDiagnosticPath);
  assert.equal(
    replayPackExpectedHashes.artifact_hashes.import_graph_diagnostic.sha256,
    finalReplayV3.artifact_hashes.import_graph_diagnostic.sha256
  );
} finally {
  process.env.PATH = oldPath;
  if (oldElanHome === undefined) {
    delete process.env.ELAN_HOME;
  } else {
    process.env.ELAN_HOME = oldElanHome;
  }
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task219 campaign live Mathlib import graph diagnostic tests passed.");
