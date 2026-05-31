import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createComathServer, createProofObligationFromFormalSpecLock } from "../../dist/index.js";

async function tickUntilStage(server, projectRoot, campaignId, targetStage, actor, maxTicks = 6) {
  let last = null;
  for (let index = 0; index < maxTicks; index += 1) {
    const tick = await server.inject({
      method: "POST",
      path: `/campaign/${encodeURIComponent(campaignId)}/tick`,
      body: { project_root: projectRoot, actor }
    });
    assert.equal(tick.status, 200);
    last = tick.body;
    if (tick.body.campaign.current_stage === targetStage) {
      return last;
    }
  }
  assert.fail(`campaign did not reach ${targetStage}`);
}

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task93-notation-"));
const server = createComathServer();

const timestamp = new Date().toISOString();
const formalSpecObligation = createProofObligationFromFormalSpecLock({
  obligation_id: "PO-0001",
  formal_spec_lock: {
    schema_version: "comath.formal_spec_lock.v2",
    claim_id: "C-0001",
    original_goal_text: "Formalize a compact image theorem.",
    original_goal_sha256: "a".repeat(64),
    normalized_nl_statement: "Every continuous image of a compact space is compact.",
    theorem_name: "compact_image",
    namespace: "CoMath.Target",
    theorem_header:
      "theorem compact_image {X Y : Type*} [TopologicalSpace X] [TopologicalSpace Y] (f : X -> Y) (hcf : Continuous f) (hX : IsCompact Set.univ) : IsCompact (Set.range f) := by",
    theorem_type_pretty:
      "{X Y : Type*} -> [TopologicalSpace X] -> [TopologicalSpace Y] -> (f : X -> Y) -> Continuous f -> IsCompact Set.univ -> IsCompact (Set.range f)",
    variables: [
      {
        name: "X",
        type: "Type*",
        binder: "explicit",
        source: "user",
        evidence_anchor: "user-goal:X",
        approved: true
      }
    ],
    assumptions: [
      {
        id: "ASM-0001",
        name: "hcf",
        type: "Continuous f",
        source: "user",
        evidence_anchor: "user-goal:continuous",
        approved: true
      }
    ],
    conclusion: "IsCompact (Set.range f)",
    notation_conventions: [
      {
        symbol: "Set.range f",
        meaning: "the image of f as a set",
        source: "user",
        evidence_anchor: "user-goal:image"
      }
    ],
    imports_allowed: ["Mathlib.Topology.Basic"],
    external_dependencies_allowed: [],
    trust_profile_id: "lean4_mathlib_default",
    statement_hash: "b".repeat(64),
    locked_by: "goal3-task93",
    locked_at: timestamp,
    user_approval_required: false,
    proof_authority: "none"
  },
  assumption_ledger: {
    schema_version: "comath.assumption_ledger.v1",
    claim_id: "C-0001",
    formal_spec_lock_hash: "b".repeat(64),
    entries: [
      {
        id: "ASM-0001",
        kind: "assumption",
        name: "hcf",
        type: "Continuous f",
        source: "user",
        evidence_anchor: "user-goal:continuous",
        approved: true
      }
    ],
    created_at: timestamp,
    updated_at: timestamp,
    proof_authority: "none"
  }
});

assert.deepEqual(formalSpecObligation.locked_statement_structured.notation_conventions, [
  {
    symbol: "Set.range f",
    meaning: "the image of f as a set",
    source: "user",
    evidence_anchor: "user-goal:image"
  }
]);

try {
  const start = await server.inject({
    method: "POST",
    path: "/campaign/start",
    body: {
      project_root: projectRoot,
      project_name: "Goal 3 Task 93 Notation Gate",
      user_goal: "Formalize in Lean that every continuous image of a compact topological space is compact.",
      domain: "topology",
      strict_mode: true,
      actor: "goal3-task93"
    }
  });
  assert.equal(start.status, 200);
  assert.equal(start.body.campaign.current_stage, "problem_locked");

  const notationTick = await tickUntilStage(
    server,
    projectRoot,
    start.body.campaign.campaign_id,
    "skeleton_gate",
    "goal3-task93"
  );

  const definitionsText = readFileSync(join(projectRoot, ".comath", "lean", "MathResearch", "Definitions.lean"), "utf8");
  const notationText = readFileSync(
    join(projectRoot, ".comath", "context_lake", "shards", `notation-${start.body.campaign.campaign_id}.md`),
    "utf8"
  );
  const gate = JSON.parse(
    readFileSync(join(projectRoot, ".comath", "campaign", start.body.campaign.campaign_id, "notation_gate.json"), "utf8")
  );

  assert.doesNotMatch(definitionsText, /Lean Nat notation|Lean Nat syntax|\bn\s*:\s*Nat\b/);
  assert.doesNotMatch(notationText, /Lean Nat notation|Lean Nat syntax|\bn\s*:\s*Nat\b/);
  assert.equal(gate.notation_source, "problem_lock_notation");
  assert.equal(gate.default_notation_injected, false);
  assert.equal(gate.proof_authority, "none");
  assert.equal(gate.can_promote_claim, false);
  assert.equal(notationTick.campaign.current_stage, "skeleton_gate");
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 93 notation gate formal-spec-derived tests passed.");
