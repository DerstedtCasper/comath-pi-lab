import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkStatementEquivalence } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-lean-statement-signature-"));

function check(lean_check_output, formal_spec_statement = "MathResearch.C0001 (n : Nat) : n + 0 = n") {
  return checkStatementEquivalence({
    projectRoot,
    reportPath: join(".comath", "evidence", "C-0001", "lean", `statement-${Math.random()}.json`),
    locked_statement_hash: "sha256:locked",
    formal_spec_statement,
    lean_check_output,
    theorem_name: "MathResearch.C0001"
  });
}

try {
  const exact = check("MathResearch.C0001 (n : Nat) : n + 0 = n\n");
  assert.equal(exact.result, "pass");
  assert.equal(exact.status, "exact");
  assert.equal(exact.target_signature.theorem_name, "MathResearch.C0001");

  const substringOnly = check("note: previous run printed MathResearch.C0001 (n : Nat) : n + 0 = n inside a log blob\n");
  assert.equal(substringOnly.result, "fail");
  assert.equal(substringOnly.hard_vetoes.includes("missing_target_check_output"), true);

  const ambiguous = check(
    [
      "MathResearch.C0001 (n : Nat) : n + 0 = n",
      "MathResearch.C0001 (n : Nat) : 0 + n = n"
    ].join("\n")
  );
  assert.equal(ambiguous.result, "fail");
  assert.equal(ambiguous.hard_vetoes.includes("ambiguous_target_check_output"), true);

  const mismatch = check("MathResearch.C0001 (n : Nat) : 0 + n = n\n");
  assert.equal(mismatch.result, "fail");
  assert.equal(mismatch.status, "different");
  assert.equal(mismatch.hard_vetoes.includes("statement_signature_mismatch"), true);

  const missing = check("MathResearch.C0002 (n : Nat) : n + 0 = n\n");
  assert.equal(missing.result, "fail");
  assert.equal(missing.hard_vetoes.includes("missing_target_check_output"), true);
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 32 Lean statement signature tests passed.");
