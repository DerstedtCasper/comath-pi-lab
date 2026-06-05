import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  evaluateCampaignLiveMathlibReplayBreadthGate,
  getClaim,
  getComathdStatus,
  initProject,
  registerClaim,
  statementHash,
  tickCampaign,
  writeCampaign
} from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task213-live-mathlib-breadth-"));

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
    campaign_id: "CAM-0213",
    project_id: projectId,
    root_claim_id: claimId,
    user_goal: "Task213 must distinguish campaign-native Mathlib replay breadth from toy smoke evidence",
    current_stage: "final_global_replay",
    status: "running",
    strict_mode: true,
    stage_runs: [],
    open_obligations: [
      {
        obligation_id: "PO-0213",
        claim_id: claimId,
        locked_statement_nl: "MathResearch.Goal3Task213Toy : True",
        locked_statement_structured: {},
        statement_hash: statementHashValue,
        dependencies: [],
        assumptions: [],
        status: "candidate_selected"
      }
    ],
    accepted_artifacts: [],
    blockers: [],
    next_actions: ["run final global Lean replay only after Task213 breadth gate"],
    created_at: now,
    updated_at: now
  };
}

try {
  assert.ok(
    getComathdStatus().capabilities.includes("campaign_live_mathlib_replay_breadth_gate"),
    "Task213 capability must be advertised for smoke/release discovery"
  );

  const groupTheoremSource = [
    "import Mathlib",
    "",
    "namespace MathResearch",
    "",
    "theorem Goal3Task213GroupInv",
    "    (G : Type) [Group G] (g : G) : g * g⁻¹ = 1 := by",
    "  exact mul_inv_cancel g",
    "",
    "#check Goal3Task213GroupInv",
    "#print axioms Goal3Task213GroupInv",
    "",
    "end MathResearch",
    ""
  ].join("\n");
  const passGate = evaluateCampaignLiveMathlibReplayBreadthGate({
    packagingScope: "campaign",
    primaryDependency: "Mathlib",
    canonicalProposition: "(G : Type) [Group G] (g : G) : g * g⁻¹ = 1",
    normalizedStatement: "theorem MathResearch.Goal3Task213GroupInv (G : Type) [Group G] (g : G) : g * g⁻¹ = 1",
    theoremSource: groupTheoremSource,
    leanRootRel: ".comath/lean/task213-live-mathlib",
    theoremFileRel: "MathResearch/Target.lean",
    replayCommand: "lake build MathResearch",
    buildTargets: ["MathResearch"]
  });
  assert.equal(passGate.result, "pass");
  assert.deepEqual(passGate.hard_vetoes, []);
  assert.equal(passGate.proof_authority, "none");
  assert.equal(passGate.can_promote_claim, false);
  assert.equal(passGate.primary_dependency, "Mathlib");

  const toyGate = evaluateCampaignLiveMathlibReplayBreadthGate({
    packagingScope: "campaign",
    primaryDependency: "Mathlib",
    canonicalProposition: "True",
    normalizedStatement: "MathResearch.Goal3Task213Toy : True",
    theoremSource: [
      "import Mathlib",
      "",
      "namespace MathResearch",
      "",
      "theorem Goal3Task213Toy : True := by",
      "  trivial",
      "",
      "end MathResearch",
      ""
    ].join("\n"),
    leanRootRel: ".comath/lean/task213-toy",
    theoremFileRel: "MathResearch/Target.lean",
    replayCommand: "lake build MathResearch",
    buildTargets: ["MathResearch"]
  });
  assert.equal(toyGate.result, "fail");
  assert.ok(toyGate.hard_vetoes.includes("toy_true_statement_forbidden"));
  assert.ok(toyGate.hard_vetoes.includes("toy_trivial_proof_forbidden"));
  assert.equal(toyGate.proof_authority, "none");
  assert.equal(toyGate.can_promote_claim, false);

  const vetoCases = [
    {
      name: "parenthesized True",
      input: {
        packagingScope: "campaign",
        primaryDependency: "Mathlib",
        canonicalProposition: "(True)",
        normalizedStatement: "theorem MathResearch.Goal3Task213ParenTrue : (True)",
        theoremSource: [
          "import Mathlib",
          "",
          "namespace MathResearch",
          "",
          "theorem Goal3Task213ParenTrue : (True) := by",
          "  exact True.intro",
          "",
          "end MathResearch",
          ""
        ].join("\n"),
        leanRootRel: ".comath/lean/task213-paren-true",
        theoremFileRel: "MathResearch/Target.lean",
        replayCommand: "lake build MathResearch",
        buildTargets: ["MathResearch"]
      },
      vetoes: ["toy_true_statement_forbidden"]
    },
    {
      name: "default Nat parameter",
      input: {
        packagingScope: "campaign",
        primaryDependency: "Mathlib",
        canonicalProposition: "(n : Nat) : n = n",
        normalizedStatement: "theorem MathResearch.Goal3Task213Nat (n : Nat) : n = n",
        theoremSource: [
          "import Mathlib",
          "",
          "namespace MathResearch",
          "",
          "theorem Goal3Task213Nat (n : Nat) : n = n := by",
          "  rfl",
          "",
          "end MathResearch",
          ""
        ].join("\n"),
        leanRootRel: ".comath/lean/task213-nat",
        theoremFileRel: "MathResearch/Target.lean",
        replayCommand: "lake build MathResearch",
        buildTargets: ["MathResearch"]
      },
      vetoes: ["toy_default_nat_parameter_forbidden"]
    },
    {
      name: "by omega",
      input: {
        packagingScope: "campaign",
        primaryDependency: "Mathlib",
        canonicalProposition: "1 = 1",
        normalizedStatement: "theorem MathResearch.Goal3Task213Omega : 1 = 1",
        theoremSource: [
          "import Mathlib",
          "",
          "namespace MathResearch",
          "",
          "theorem Goal3Task213Omega : 1 = 1 := by",
          "  omega",
          "",
          "end MathResearch",
          ""
        ].join("\n"),
        leanRootRel: ".comath/lean/task213-omega",
        theoremFileRel: "MathResearch/Target.lean",
        replayCommand: "lake build MathResearch",
        buildTargets: ["MathResearch"]
      },
      vetoes: ["toy_omega_proof_forbidden"]
    },
    {
      name: "missing Mathlib dependency",
      input: {
        packagingScope: "campaign",
        primaryDependency: "Lean4",
        canonicalProposition: "(G : Type) [Group G] (g : G) : g * g⁻¹ = 1",
        normalizedStatement: "theorem MathResearch.Goal3Task213NoDependency (G : Type) [Group G] (g : G) : g * g⁻¹ = 1",
        theoremSource: groupTheoremSource.replace("Goal3Task213GroupInv", "Goal3Task213NoDependency"),
        leanRootRel: ".comath/lean/task213-no-dependency",
        theoremFileRel: "MathResearch/Target.lean",
        replayCommand: "lake build MathResearch",
        buildTargets: ["MathResearch"]
      },
      vetoes: ["mathlib_primary_dependency_required"]
    },
    {
      name: "missing Mathlib import",
      input: {
        packagingScope: "campaign",
        primaryDependency: "Mathlib",
        canonicalProposition: "(G : Type) [Group G] (g : G) : g * g⁻¹ = 1",
        normalizedStatement: "theorem MathResearch.Goal3Task213NoImport (G : Type) [Group G] (g : G) : g * g⁻¹ = 1",
        theoremSource: groupTheoremSource
          .replace("import Mathlib\n\n", "")
          .replace("Goal3Task213GroupInv", "Goal3Task213NoImport"),
        leanRootRel: ".comath/lean/task213-no-import",
        theoremFileRel: "MathResearch/Target.lean",
        replayCommand: "lake build MathResearch",
        buildTargets: ["MathResearch"]
      },
      vetoes: ["mathlib_import_missing"]
    },
    {
      name: "positive matrix release path",
      input: {
        packagingScope: "campaign",
        primaryDependency: "Mathlib",
        canonicalProposition: "(G : Type) [Group G] (g : G) : g * g⁻¹ = 1",
        normalizedStatement: "theorem MathResearch.Goal3Task213PositiveMatrixPath (G : Type) [Group G] (g : G) : g * g⁻¹ = 1",
        theoremSource: groupTheoremSource.replace("Goal3Task213GroupInv", "Goal3Task213PositiveMatrixPath"),
        leanRootRel: ".comath/release/positive_matrix/PM-084",
        theoremFileRel: "MathResearch/Target.lean",
        replayCommand: "lake build MathResearch",
        buildTargets: ["MathResearch"]
      },
      vetoes: ["positive_matrix_release_path_forbidden"]
    },
    {
      name: "positive matrix packaging scope",
      input: {
        packagingScope: "positive_matrix",
        primaryDependency: "Mathlib",
        canonicalProposition: "(G : Type) [Group G] (g : G) : g * g⁻¹ = 1",
        normalizedStatement: "theorem MathResearch.Goal3Task213Scope (G : Type) [Group G] (g : G) : g * g⁻¹ = 1",
        theoremSource: groupTheoremSource.replace("Goal3Task213GroupInv", "Goal3Task213Scope"),
        leanRootRel: ".comath/lean/task213-scope",
        theoremFileRel: "MathResearch/Target.lean",
        replayCommand: "lake build MathResearch",
        buildTargets: ["MathResearch"]
      },
      vetoes: ["campaign_packaging_scope_required"]
    }
  ];
  for (const { name, input, vetoes } of vetoCases) {
    const gate = evaluateCampaignLiveMathlibReplayBreadthGate(input);
    assert.equal(gate.result, "fail", name);
    for (const veto of vetoes) {
      assert.ok(gate.hard_vetoes.includes(veto), `${name} must include ${veto}`);
    }
    assert.equal(gate.proof_authority, "none", name);
    assert.equal(gate.can_promote_claim, false, name);
  }

  const { project } = initProject({ name: "Goal 3 Task 213", root_path: projectRoot });
  const theoremName = "MathResearch.Goal3Task213Toy";
  const claimStatement = `${theoremName} : True`;
  const claim = registerClaim(projectRoot, {
    project_id: project.project_id,
    statement: claimStatement,
    assumptions: [],
    domain: "logic",
    status: "conjectural",
    actor: "goal3-task213"
  });
  assert.equal(claim.statement_hash, statementHash(claimStatement));

  const leanRootRel = ".comath/lean/task213-toy";
  writeProjectFile(
    `${leanRootRel}/MathResearch/Target.lean`,
    [
      "import Mathlib",
      "",
      "namespace MathResearch",
      "",
      "theorem Goal3Task213Toy : True := by",
      "  trivial",
      "",
      "#check Goal3Task213Toy",
      "#print axioms Goal3Task213Toy",
      "",
      "end MathResearch",
      ""
    ].join("\n")
  );
  writeProjectFile(
    `${leanRootRel}/Audit/TargetAudit.lean`,
    "import MathResearch.Target\n#check MathResearch.Goal3Task213Toy\n#print axioms MathResearch.Goal3Task213Toy\n"
  );
  writeJsonProjectFile(`${leanRootRel}/FormalSpec/formal_spec_lock.json`, {
    schema_version: "comath.formal_spec_lock.v2",
    binding_scope: "campaign",
    campaign_id: "CAM-0213",
    claim_id: claim.id,
    namespace: "MathResearch",
    theorem_name: "Goal3Task213Toy",
    theorem_header: "theorem Goal3Task213Toy : True",
    statement_hash: claim.statement_hash,
    proof_authority: "none"
  });
  writeJsonProjectFile(`${leanRootRel}/FormalSpec/assumption_ledger.json`, {
    schema_version: "comath.assumption_ledger.v1",
    binding_scope: "campaign",
    campaign_id: "CAM-0213",
    claim_id: claim.id,
    formal_spec_lock_hash: claim.statement_hash,
    entries: [],
    proof_authority: "none"
  });
  writeProjectFile(
    `${leanRootRel}/lakefile.lean`,
    [
      "import Lake",
      "open Lake DSL",
      "package MathResearch where",
      "require mathlib from git \"https://github.com/leanprover-community/mathlib4\" @ \"v4.23.0\"",
      "lean_lib MathResearch where",
      "  roots := #[`MathResearch.Target]",
      ""
    ].join("\n")
  );
  writeProjectFile(`${leanRootRel}/lean-toolchain`, "leanprover/lean4:v4.23.0\n");
  writeJsonProjectFile(`${leanRootRel}/lake-manifest.json`, {
    version: 7,
    packages: [{ name: "mathlib", url: "https://github.com/leanprover-community/mathlib4", rev: "v4.23.0", license: "Apache-2.0" }]
  });

  writeCampaign(projectRoot, campaignFixture(project.project_id, claim.id, claim.statement_hash), "goal3-task213");
  writeJsonProjectFile(".comath/campaign/CAM-0213/final_replay_request.json", {
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
      theorem_family_id: "CAM-0213",
      canonical_proposition: "True",
      build_targets: ["MathResearch"],
      replay_command: "lake build MathResearch",
      primary_dependency: "Mathlib",
      formal_spec: {
        claim_id: claim.id,
        theorem_name: "Goal3Task213Toy",
        namespace: "MathResearch",
        normalized_statement: claimStatement,
        locked_statement_hash: claim.statement_hash
      }
    }
  });

  const blocked = await tickCampaign({
    project_root: projectRoot,
    campaign_id: "CAM-0213",
    actor: "goal3-task213"
  });
  assert.equal(blocked.campaign.current_stage, "blocked");
  assert.equal(blocked.campaign.terminal_state, "blocked_with_replayable_reason");
  assert.equal(blocked.campaign.formal_replay_authority_passed, false);
  assert.match(blocked.blocker, /campaign_live_mathlib_replay_breadth_gate_failed/);
  assert.match(blocked.blocker, /toy_true_statement_forbidden/);
  assert.equal(getClaim(projectRoot, project.project_id, claim.id)?.status, "conjectural");
  assert.equal(
    existsSync(join(projectRoot, ".comath", "lean", "final_replay")),
    false,
    "toy breadth-gate failures must block before allocating final replay workspaces"
  );
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 213 campaign live Mathlib replay breadth gate test passed.");
