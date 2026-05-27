import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkStatementEquivalence } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-lean-registered-logical-equivalence-"));

function check(lean_check_output, allowed_registered_logical_equivalences = []) {
  return checkStatementEquivalence({
    projectRoot,
    reportPath: join(".comath", "evidence", "C-0001", "lean", `statement-logical-${Math.random()}.json`),
    locked_statement_hash: "sha256:locked",
    formal_spec_statement: "MathResearch.C0001 (n : Nat) : n + 0 = n",
    lean_check_output,
    theorem_name: "MathResearch.C0001",
    allowed_registered_logical_equivalences
  });
}

try {
  const witnessHash = `sha256:${"a".repeat(64)}`;
  const accepted = check("MathResearch.C0001 (n : Nat) : Nat.add n 0 = n\n", [
    {
      formal_spec_statement: "MathResearch.C0001 (n : Nat) : n + 0 = n",
      equivalent_signature: "MathResearch.C0001 (n : Nat) : Nat.add n 0 = n",
      witness_kind: "lean_kernel_checked_equivalence",
      witness_artifact_id: "ART-EQUIV-0001",
      witness_artifact_sha256: witnessHash,
      lemma_names: ["MathResearch.c0001_equiv"],
      justification: "Kernel-checked equivalence lemma rewrites Lean notation to elaborated Nat.add form."
    }
  ]);
  assert.equal(accepted.result, "pass");
  assert.equal(accepted.status, "logically_equivalent_with_registered_lemmas");
  assert.equal(accepted.equivalence_witness.kind, "registered_logical_equivalence");
  assert.equal(accepted.equivalence_witness.witness_kind, "lean_kernel_checked_equivalence");
  assert.deepEqual(accepted.equivalence_witness.lemma_names, ["MathResearch.c0001_equiv"]);
  assert.equal(accepted.equivalence_witness.witness_artifact_sha256, witnessHash);

  const missingWitness = check("MathResearch.C0001 (n : Nat) : Nat.add n 0 = n\n", [
    {
      formal_spec_statement: "MathResearch.C0001 (n : Nat) : n + 0 = n",
      equivalent_signature: "MathResearch.C0001 (n : Nat) : Nat.add n 0 = n",
      witness_kind: "lean_kernel_checked_equivalence",
      witness_artifact_id: "ART-EQUIV-0002",
      witness_artifact_sha256: "",
      lemma_names: ["MathResearch.c0001_equiv"],
      justification: "Missing hash must not be accepted."
    }
  ]);
  assert.equal(missingWitness.result, "fail");
  assert.equal(missingWitness.hard_vetoes.includes("statement_signature_mismatch"), true);

  const missingLemma = check("MathResearch.C0001 (n : Nat) : Nat.add n 0 = n\n", [
    {
      formal_spec_statement: "MathResearch.C0001 (n : Nat) : n + 0 = n",
      equivalent_signature: "MathResearch.C0001 (n : Nat) : Nat.add n 0 = n",
      witness_kind: "lean_kernel_checked_equivalence",
      witness_artifact_id: "ART-EQUIV-0003",
      witness_artifact_sha256: witnessHash,
      lemma_names: [],
      justification: "Missing registered lemma names must not be accepted."
    }
  ]);
  assert.equal(missingLemma.result, "fail");
  assert.equal(missingLemma.hard_vetoes.includes("statement_signature_mismatch"), true);

  const wrongTarget = check("MathResearch.C0001 (n : Nat) : Nat.add 0 n = n\n", [
    {
      formal_spec_statement: "MathResearch.C0001 (n : Nat) : n + 0 = n",
      equivalent_signature: "MathResearch.C0001 (n : Nat) : Nat.add n 0 = n",
      witness_kind: "lean_kernel_checked_equivalence",
      witness_artifact_id: "ART-EQUIV-0004",
      witness_artifact_sha256: witnessHash,
      lemma_names: ["MathResearch.c0001_equiv"],
      justification: "The witness is for a different target signature."
    }
  ]);
  assert.equal(wrongTarget.result, "fail");
  assert.equal(wrongTarget.hard_vetoes.includes("statement_signature_mismatch"), true);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 56 Lean registered logical equivalence tests passed.");
