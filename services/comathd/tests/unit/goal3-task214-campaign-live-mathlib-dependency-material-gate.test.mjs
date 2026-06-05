import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  evaluateCampaignLiveMathlibDependencyMaterialGate,
  getClaim,
  getComathdStatus,
  initProject,
  registerClaim,
  statementHash,
  tickCampaign,
  writeCampaign
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task214-mathlib-deps-"));
const mathlibRev = "0123456789abcdef0123456789abcdef01234567";

function writeProjectFile(relativePath, text) {
  const absolute = join(projectRoot, relativePath);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, text, "utf8");
}

function writeJsonProjectFile(relativePath, value) {
  writeProjectFile(relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function campaignFixture(projectId, claimId, statementHashValue) {
  const now = "2026-06-05T00:00:00.000Z";
  return {
    campaign_id: "CAM-0214",
    project_id: projectId,
    root_claim_id: claimId,
    user_goal: "Task214 must require pinned theorem-specific Mathlib dependency material before live replay",
    current_stage: "final_global_replay",
    status: "running",
    strict_mode: true,
    stage_runs: [],
    open_obligations: [
      {
        obligation_id: "PO-0214",
        claim_id: claimId,
        locked_statement_nl:
          "theorem MathResearch.Goal3Task214GroupInv (G : Type) [Group G] (g : G) : g * Inv.inv g = 1",
        locked_statement_structured: {},
        statement_hash: statementHashValue,
        dependencies: [],
        assumptions: [],
        status: "candidate_selected"
      }
    ],
    accepted_artifacts: [],
    blockers: [],
    next_actions: ["run final global Lean replay only after Mathlib dependency material gate"],
    created_at: now,
    updated_at: now
  };
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

function validGateInput(overrides = {}) {
  return {
    packagingScope: "campaign",
    primaryDependency: "Mathlib",
    lakefileText: mathlibLakefile(),
    lakeManifest: { version: 7, packages: [mathlibManifestPackage()] },
    ...overrides
  };
}

try {
  assert.ok(
    getComathdStatus().capabilities.includes("campaign_live_mathlib_dependency_material_gate"),
    "Task214 capability must be advertised for smoke/release discovery"
  );

  const passGate = evaluateCampaignLiveMathlibDependencyMaterialGate(validGateInput());
  assert.equal(passGate.schema_version, "comath.campaign_live_mathlib_dependency_material_gate.v1");
  assert.equal(passGate.result, "pass");
  assert.deepEqual(passGate.hard_vetoes, []);
  assert.equal(passGate.mathlib_revision, mathlibRev);
  assert.equal(passGate.proof_authority, "none");
  assert.equal(passGate.can_promote_claim, false);

  const vetoCases = [
    {
      name: "missing lakefile require",
      input: validGateInput({ lakefileText: "import Lake\nopen Lake DSL\npackage MathResearch where\n" }),
      vetoes: ["mathlib_lakefile_dependency_missing"]
    },
    {
      name: "missing manifest package",
      input: validGateInput({ lakeManifest: { version: 7, packages: [] } }),
      vetoes: ["mathlib_lake_manifest_package_missing"]
    },
    {
      name: "unpinned manifest package",
      input: validGateInput({ lakeManifest: { version: 7, packages: [mathlibManifestPackage({ rev: undefined })] } }),
      vetoes: ["mathlib_dependency_revision_missing"]
    },
    {
      name: "floating manifest package",
      input: validGateInput({ lakeManifest: { version: 7, packages: [mathlibManifestPackage({ rev: "main" })] } }),
      vetoes: ["mathlib_dependency_revision_floating"]
    },
    {
      name: "unknown license",
      input: validGateInput({ lakeManifest: { version: 7, packages: [mathlibManifestPackage({ license: undefined })] } }),
      vetoes: ["mathlib_dependency_license_unknown"]
    },
    {
      name: "untrusted source",
      input: validGateInput({ lakeManifest: { version: 7, packages: [mathlibManifestPackage({ url: "https://example.invalid/mathlib4" })] } }),
      vetoes: ["mathlib_dependency_source_untrusted"]
    },
    {
      name: "local Mathlib shadowing",
      input: validGateInput({ localLeanFileRels: ["Mathlib/Data/Nat/Basic.lean"] }),
      vetoes: ["local_module_shadowing:Mathlib.Data.Nat.Basic"]
    },
    {
      name: "non-campaign scope",
      input: validGateInput({ packagingScope: "positive_matrix" }),
      vetoes: ["campaign_packaging_scope_required"]
    }
  ];
  for (const { name, input, vetoes } of vetoCases) {
    const gate = evaluateCampaignLiveMathlibDependencyMaterialGate(input);
    assert.equal(gate.result, "fail", name);
    for (const veto of vetoes) {
      assert.ok(gate.hard_vetoes.includes(veto), `${name} must include ${veto}`);
    }
    assert.equal(gate.proof_authority, "none", name);
    assert.equal(gate.can_promote_claim, false, name);
  }

  const { project } = initProject({ name: "Goal 3 Task 214", root_path: projectRoot });
  const theoremName = "MathResearch.Goal3Task214GroupInv";
  const claimStatement = `${theoremName} (G : Type) [Group G] (g : G) : g * Inv.inv g = 1`;
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: claimStatement,
    assumptions: [],
    domain: "algebra",
    status: "conjectural",
    actor: "goal3-task214"
  });
  assert.equal(claim.statement_hash, statementHash(claimStatement));

  const leanRootRel = ".comath/lean/task214-mathlib";
  writeProjectFile(
    `${leanRootRel}/MathResearch/Target.lean`,
    [
      "import Mathlib",
      "",
      "namespace MathResearch",
      "",
      "theorem Goal3Task214GroupInv (G : Type) [Group G] (g : G) : g * Inv.inv g = 1 := by",
      "  exact mul_inv_cancel g",
      "",
      "#check Goal3Task214GroupInv",
      "#print axioms Goal3Task214GroupInv",
      "",
      "end MathResearch",
      ""
    ].join("\n")
  );
  writeProjectFile(
    `${leanRootRel}/Audit/TargetAudit.lean`,
    "import MathResearch.Target\n#check MathResearch.Goal3Task214GroupInv\n#print axioms MathResearch.Goal3Task214GroupInv\n"
  );
  writeJsonProjectFile(`${leanRootRel}/FormalSpec/formal_spec_lock.json`, {
    schema_version: "comath.formal_spec_lock.v2",
    binding_scope: "campaign",
    campaign_id: "CAM-0214",
    claim_id: claim.id,
    namespace: "MathResearch",
    theorem_name: "Goal3Task214GroupInv",
    theorem_header: "theorem Goal3Task214GroupInv (G : Type) [Group G] (g : G) : g * Inv.inv g = 1",
    statement_hash: claim.statement_hash,
    proof_authority: "none"
  });
  writeJsonProjectFile(`${leanRootRel}/FormalSpec/assumption_ledger.json`, {
    schema_version: "comath.assumption_ledger.v1",
    binding_scope: "campaign",
    campaign_id: "CAM-0214",
    claim_id: claim.id,
    formal_spec_lock_hash: claim.statement_hash,
    entries: [],
    proof_authority: "none"
  });
  writeProjectFile(`${leanRootRel}/lakefile.lean`, mathlibLakefile());
  writeProjectFile(`${leanRootRel}/lean-toolchain`, "leanprover/lean4:v4.23.0\n");
  writeJsonProjectFile(`${leanRootRel}/lake-manifest.json`, { version: 7, packages: [] });

  writeCampaign(projectRoot, campaignFixture(project.project_id, claim.id, claim.statement_hash), "goal3-task214");
  writeJsonProjectFile(".comath/campaign/CAM-0214/final_replay_request.json", {
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
      theorem_family_id: "CAM-0214",
      canonical_proposition: "(G : Type) [Group G] (g : G) : g * Inv.inv g = 1",
      build_targets: ["MathResearch"],
      replay_command: "lake build MathResearch",
      primary_dependency: "Mathlib",
      formal_spec: {
        claim_id: claim.id,
        theorem_name: "Goal3Task214GroupInv",
        namespace: "MathResearch",
        normalized_statement: claimStatement,
        locked_statement_hash: claim.statement_hash
      }
    }
  });

  const blocked = await tickCampaign({
    project_root: projectRoot,
    campaign_id: "CAM-0214",
    actor: "goal3-task214"
  });
  assert.equal(blocked.campaign.current_stage, "blocked");
  assert.equal(blocked.campaign.terminal_state, "blocked_with_replayable_reason");
  assert.equal(blocked.campaign.formal_replay_authority_passed, false);
  assert.match(blocked.blocker, /campaign_live_mathlib_dependency_material_gate_failed/);
  assert.match(blocked.blocker, /mathlib_lake_manifest_package_missing/);
  const blockerPath = blocked.campaign.blockers[0]?.artifact_path;
  assert.equal(typeof blockerPath, "string");
  const blockerArtifact = JSON.parse(readFileSync(join(projectRoot, blockerPath), "utf8"));
  assert.equal(blockerArtifact.schema_version, "comath.campaign_final_replay_blocker.v1");
  assert.match(blockerArtifact.reason, /campaign_live_mathlib_dependency_material_gate_failed/);
  assert.match(blockerArtifact.reason, /mathlib_lake_manifest_package_missing/);
  assert.equal(blockerArtifact.proof_authority, "none");
  assert.equal(blockerArtifact.can_promote_claim, false);
  assert.equal(getClaim(projectRoot, project.project_id, claim.id)?.status, "conjectural");
  assert.equal(
    existsSync(join(projectRoot, ".comath", "lean", "final_replay")),
    false,
    "Mathlib dependency-material failures must block before allocating final replay workspaces"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 214 campaign live Mathlib dependency material gate test passed.");
