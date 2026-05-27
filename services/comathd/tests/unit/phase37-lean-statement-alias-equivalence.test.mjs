import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkStatementEquivalence } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-lean-statement-alias-"));

function check(lean_check_output, formal_spec_statement = "MathResearch.C0001 (n : Nat) : n + 0 = n") {
  return checkStatementEquivalence({
    projectRoot,
    reportPath: join(".comath", "evidence", "C-0001", "lean", `statement-alias-${Math.random()}.json`),
    locked_statement_hash: "sha256:locked",
    formal_spec_statement,
    lean_check_output,
    theorem_name: "MathResearch.C0001",
    allowed_definitional_aliases: [
      {
        formal_spec_statement: "MathResearch.C0001 (n : Nat) : n + 0 = n",
        equivalent_signature: "MathResearch.C0001 (n : Nat) : Nat.add n 0 = n",
        justification: "Lean notation expansion: n + 0 elaborates to Nat.add n 0."
      }
    ]
  });
}

try {
  const alias = check("MathResearch.C0001 (n : Nat) : Nat.add n 0 = n\n");
  assert.equal(alias.result, "pass");
  assert.equal(alias.status, "definitionally_equivalent");
  assert.equal(alias.hard_vetoes.length, 0);
  assert.equal(alias.target_signature.normalized_signature, "MathResearch.C0001 (n : Nat) : Nat.add n 0 = n");
  assert.equal(alias.equivalence_witness.kind, "registered_definitional_alias");
  assert.equal(alias.equivalence_witness.justification.includes("notation expansion"), true);

  const mismatch = check("MathResearch.C0001 (n : Nat) : Nat.add 0 n = n\n");
  assert.equal(mismatch.result, "fail");
  assert.equal(mismatch.status, "different");
  assert.equal(mismatch.hard_vetoes.includes("statement_signature_mismatch"), true);

  const ambiguous = check(
    [
      "MathResearch.C0001 (n : Nat) : Nat.add n 0 = n",
      "MathResearch.C0001 (n : Nat) : n + 0 = n"
    ].join("\n")
  );
  assert.equal(ambiguous.result, "fail");
  assert.equal(ambiguous.hard_vetoes.includes("ambiguous_target_check_output"), true);

  const missing = check("MathResearch.C0002 (n : Nat) : Nat.add n 0 = n\n");
  assert.equal(missing.result, "fail");
  assert.equal(missing.hard_vetoes.includes("missing_target_check_output"), true);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 37 Lean statement alias equivalence tests passed.");
