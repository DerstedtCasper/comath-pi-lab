import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assumptionLedgerSchema,
  createComathServer,
  createProofObligationFromFormalSpecLock,
  formalSpecLockSchema,
  getClaim
} from "../../dist/index.js";

const timestamp = new Date().toISOString();
const originalGoalHash = "a".repeat(64);
const statementHash = "b".repeat(64);

function validFormalSpecLock(overrides = {}) {
  return {
    schema_version: "comath.formal_spec_lock.v2",
    claim_id: "C-0001",
    original_goal_text: "Prove that every continuous image of a compact space is compact.",
    original_goal_sha256: originalGoalHash,
    normalized_nl_statement: "Every continuous image of a compact space is compact.",
    theorem_name: "compact_image",
    namespace: "CoMath.Target",
    theorem_header: "theorem compact_image {X Y : Type*} [TopologicalSpace X] [TopologicalSpace Y] (f : X -> Y) (hcf : Continuous f) (hX : IsCompact Set.univ) : IsCompact (Set.range f) := by",
    theorem_type_pretty:
      "{X Y : Type*} -> [TopologicalSpace X] -> [TopologicalSpace Y] -> (f : X -> Y) -> Continuous f -> IsCompact Set.univ -> IsCompact (Set.range f)",
    variables: [
      {
        name: "X",
        type: "Type*",
        binder: "explicit",
        source: "user",
        evidence_anchor: "user-goal:domain:X",
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
    notation_conventions: [],
    imports_allowed: ["Mathlib.Topology.Basic"],
    external_dependencies_allowed: [],
    trust_profile_id: "lean4_mathlib_default",
    statement_hash: statementHash,
    locked_by: "goal3-task4-test",
    locked_at: timestamp,
    user_approval_required: false,
    proof_authority: "none",
    ...overrides
  };
}

function validAssumptionLedger(overrides = {}) {
  return {
    schema_version: "comath.assumption_ledger.v1",
    claim_id: "C-0001",
    formal_spec_lock_hash: statementHash,
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
    proof_authority: "none",
    ...overrides
  };
}

assert.equal(formalSpecLockSchema.parse(validFormalSpecLock()).statement_hash, statementHash);

assert.throws(
  () =>
    formalSpecLockSchema.parse(
      validFormalSpecLock({
        variables: [
          {
            name: "n",
            type: "Nat",
            binder: "explicit",
            approved: true,
            evidence_anchor: "missing-source"
          }
        ]
      })
    ),
  /source/i,
  "FormalSpecLock must reject variables without an explicit source"
);

assert.throws(
  () =>
    formalSpecLockSchema.parse(
      validFormalSpecLock({
        variables: [
          {
            name: "n",
            type: "Nat",
            binder: "explicit",
            source: "agent_proposed",
            approved: true
          }
        ]
      })
    ),
  /evidence_anchor/i,
  "FormalSpecLock must reject approved variables without evidence anchors"
);

assert.throws(
  () =>
    formalSpecLockSchema.parse(
      validFormalSpecLock({
        assumptions: [
          {
            id: "ASM-0002",
            type: "0 < n",
            source: "agent_proposed",
            evidence_anchor: "agent-note:1",
            approved: false
          }
        ]
      })
    ),
  /unapproved assumption/i,
  "FormalSpecLock must fail closed on unapproved assumptions"
);

assert.equal(assumptionLedgerSchema.parse(validAssumptionLedger()).entries.length, 1);

assert.throws(
  () =>
    assumptionLedgerSchema.parse(
      validAssumptionLedger({
        entries: [
          {
            id: "ASM-0002",
            kind: "assumption",
            type: "0 < n",
            source: "agent_proposed",
            approved: false,
            evidence_anchor: "agent-note:1"
          }
        ]
      })
    ),
  /unapproved assumption/i,
  "AssumptionLedger must reject unapproved assumptions before obligation creation"
);

assert.throws(
  () =>
    createProofObligationFromFormalSpecLock({
      obligation_id: "PO-0001",
      formal_spec_lock: validFormalSpecLock(),
      assumption_ledger: validAssumptionLedger({
        entries: [
          {
            id: "ASM-0001",
            kind: "assumption",
            name: "hcf",
            type: "Continuous f",
            source: "user",
            evidence_anchor: "user-goal:continuous",
            approved: false
          }
        ]
      })
    }),
  /unapproved assumption/i,
  "unapproved assumptions must block proof obligation creation"
);

const projectRoot = mkdtempSync(join(tmpdir(), "comath-goal3-task4-unknown-"));
const server = createComathServer();

try {
  const start = await server.inject({
    method: "POST",
    path: "/campaign/start",
    body: {
      project_root: projectRoot,
      project_name: "Goal 3 Task 4 Unknown Goal",
      user_goal: "Investigate whether every prime number has a twin prime.",
      domain: "number_theory",
      strict_mode: true,
      actor: "goal3-task4-test"
    }
  });

  assert.equal(start.status, 200);
  assert.equal(start.body.campaign.status, "blocked");
  assert.equal(start.body.campaign.current_stage, "blocked");
  assert.equal(start.body.campaign.blockers[0].reason, "needs_formal_spec_lock");
  assert.deepEqual(start.body.campaign.open_obligations, []);
  assert.equal(start.body.obligation, undefined);

  const claim = getClaim(projectRoot, start.body.campaign.project_id, start.body.campaign.root_claim_id);
  assert.equal(claim.status, "needs_formal_spec_lock");
  assert.deepEqual(claim.assumptions, []);

  const assumptionsPath = join(projectRoot, ".comath", "lock", "assumptions.md");
  if (existsSync(assumptionsPath)) {
    const content = readFileSync(assumptionsPath, "utf8");
    assert.doesNotMatch(content, /n\s*:\s*Nat/);
    assert.doesNotMatch(content, /0\s*<\s*n/);
  }
} finally {
  await server.close();
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Goal 3 Task 4 FormalSpecLock and AssumptionLedger tests passed.");
