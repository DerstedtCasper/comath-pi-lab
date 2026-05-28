import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  checkStatementEquivalence,
  materializeStatementEquivalenceSearchPlan
} from "../../dist/index.js";

const source = "MathResearch.C0001 (n : Nat) : n + 0 = n";
const target = "MathResearch.C0001 (n : Nat) : Nat.add n 0 = n";
const planPath = join(".comath", "evidence", "C-0001", "lean", "equivalence_search_plan.json");
const witnessPath = join(".comath", "evidence", "C-0001", "lean", "equivalence_witness_materialized.json");

function writePlan(projectRoot, overrides = {}) {
  const planned = checkStatementEquivalence({
    projectRoot,
    reportPath: join(".comath", "evidence", "C-0001", "lean", `statement-${Math.random()}.json`),
    locked_statement_hash: "sha256:locked",
    formal_spec_statement: source,
    lean_check_output: `${target}\n`,
    theorem_name: "MathResearch.C0001",
    equivalence_search_plan_path: planPath,
    equivalence_search_hints: ["Nat.add_zero"],
    ...overrides
  });
  assert.equal(planned.equivalence_search_plan_status, "blocked_unproved");
}

function materialize(projectRoot, overrides = {}) {
  return materializeStatementEquivalenceSearchPlan({
    projectRoot,
    planPath,
    witnessArtifactPath: witnessPath,
    witnessArtifactId: "ART-EQUIV-PLAN-0001",
    allowed_materializations: [
      {
        formal_spec_statement: source,
        equivalent_signature: target,
        witness_kind: "lean_kernel_checked_equivalence",
        lemma_names: ["Nat.add_zero"],
        justification: "Bounded registered materialization for Lean Nat.add notation expansion."
      }
    ],
    ...overrides
  });
}

const projectRoot = mkdtempSync(join(tmpdir(), "comath-lean-equivalence-materialization-"));

try {
  writePlan(projectRoot);

  const witness = materialize(projectRoot);
  assert.equal(witness.formal_spec_statement, source);
  assert.equal(witness.equivalent_signature, target);
  assert.equal(witness.witness_kind, "lean_kernel_checked_equivalence");
  assert.equal(witness.witness_artifact_id, "ART-EQUIV-PLAN-0001");
  assert.match(witness.witness_artifact_sha256, /^sha256:[0-9a-f]{64}$/);
  assert.deepEqual(witness.lemma_names, ["Nat.add_zero"]);
  assert.equal(witness.justification.includes("Bounded registered materialization"), true);

  const artifact = JSON.parse(readFileSync(join(projectRoot, witnessPath), "utf8"));
  assert.equal(artifact.result, "materialized_registered_logical_equivalence_witness");
  assert.equal(artifact.proof_authority, "none");
  assert.equal(artifact.can_promote_claim, false);
  assert.equal(artifact.source_plan_path, planPath.replace(/\\/g, "/"));
  assert.equal(artifact.formal_spec_statement, source);
  assert.equal(artifact.equivalent_signature, target);
  assert.equal(artifact.witness_kind, "lean_kernel_checked_equivalence");
  assert.deepEqual(artifact.lemma_names, ["Nat.add_zero"]);
  assert.equal(artifact.required_final_authority.includes("final_clean_lean_replay"), true);

  const accepted = checkStatementEquivalence({
    projectRoot,
    reportPath: join(".comath", "evidence", "C-0001", "lean", "statement-materialized.json"),
    locked_statement_hash: "sha256:locked",
    formal_spec_statement: source,
    lean_check_output: `${target}\n`,
    theorem_name: "MathResearch.C0001",
    allowed_registered_logical_equivalences: [witness]
  });
  assert.equal(accepted.result, "pass");
  assert.equal(accepted.status, "logically_equivalent_with_registered_lemmas");
  assert.equal(accepted.equivalence_witness.witness_artifact_sha256, witness.witness_artifact_sha256);

  const unregisteredRoot = mkdtempSync(join(tmpdir(), "comath-lean-equivalence-materialization-unregistered-"));
  try {
    writePlan(unregisteredRoot, { equivalence_search_hints: ["Nat.succ_eq_add_one"] });
    assert.throws(
      () => materialize(unregisteredRoot),
      /no allowed bounded materialization matches/
    );
    assert.equal(existsSync(join(unregisteredRoot, witnessPath)), false);
  } finally {
    rmSync(unregisteredRoot, { recursive: true, force: true });
  }

  const tamperedRoot = mkdtempSync(join(tmpdir(), "comath-lean-equivalence-materialization-tampered-"));
  try {
    writePlan(tamperedRoot);
    const plan = JSON.parse(readFileSync(join(tamperedRoot, planPath), "utf8"));
    plan.can_promote_claim = true;
    writeFileSync(join(tamperedRoot, planPath), `${JSON.stringify(plan, null, 2)}\n`, "utf8");
    assert.throws(
      () => materialize(tamperedRoot),
      /plan must be non-authoritative/
    );
    assert.equal(existsSync(join(tamperedRoot, witnessPath)), false);
  } finally {
    rmSync(tamperedRoot, { recursive: true, force: true });
  }

  const malformedPlanRoot = mkdtempSync(join(tmpdir(), "comath-lean-equivalence-materialization-malformed-plan-"));
  try {
    writePlan(malformedPlanRoot);
    const plan = JSON.parse(readFileSync(join(malformedPlanRoot, planPath), "utf8"));
    plan.required_next_artifacts = ["lean_kernel_checked_equivalence"];
    plan.obligations[0].candidate_lemma_names = ["Nat.succ_eq_add_one"];
    writeFileSync(join(malformedPlanRoot, planPath), `${JSON.stringify(plan, null, 2)}\n`, "utf8");
    assert.throws(
      () => materialize(malformedPlanRoot),
      /plan witness requirements are invalid/
    );
    assert.equal(existsSync(join(malformedPlanRoot, witnessPath)), false);
  } finally {
    rmSync(malformedPlanRoot, { recursive: true, force: true });
  }

  const wrongTargetRoot = mkdtempSync(join(tmpdir(), "comath-lean-equivalence-materialization-wrong-target-"));
  try {
    writePlan(wrongTargetRoot);
    assert.throws(
      () =>
        materialize(wrongTargetRoot, {
          allowed_materializations: [
            {
              formal_spec_statement: source,
              equivalent_signature: "MathResearch.C0001 (n : Nat) : Nat.add 0 n = n",
              witness_kind: "lean_kernel_checked_equivalence",
              lemma_names: ["Nat.add_zero"],
              justification: "Wrong target must not bind the plan."
            }
          ]
        }),
      /no allowed bounded materialization matches/
    );
    assert.equal(existsSync(join(wrongTargetRoot, witnessPath)), false);
  } finally {
    rmSync(wrongTargetRoot, { recursive: true, force: true });
  }

  const missingArtifactIdRoot = mkdtempSync(join(tmpdir(), "comath-lean-equivalence-materialization-missing-id-"));
  try {
    writePlan(missingArtifactIdRoot);
    assert.throws(
      () =>
        materialize(missingArtifactIdRoot, {
          witnessArtifactId: " "
        }),
      /witness artifact id is required/
    );
    assert.equal(existsSync(join(missingArtifactIdRoot, witnessPath)), false);
  } finally {
    rmSync(missingArtifactIdRoot, { recursive: true, force: true });
  }
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 80 bounded equivalence witness materialization tests passed.");
