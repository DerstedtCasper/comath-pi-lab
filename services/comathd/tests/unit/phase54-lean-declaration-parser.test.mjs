import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkStatementEquivalence, extractLeanTheoremDeclarationSignature } from "../../dist/index.js";

const projectRoot = mkdtempSync(join(tmpdir(), "comath-lean-declaration-parser-"));

try {
  assert.equal(typeof extractLeanTheoremDeclarationSignature, "function", "Phase 54 must export Lean declaration parser");

  const source = [
    "namespace MathResearch",
    "",
    "-- A decoy theorem with the same suffix must not be accepted.",
    "theorem C0002 (n : Nat) : n + 0 = n := Nat.add_zero n",
    "",
    "theorem C0001",
    "    (n : Nat)",
    "    : n + 0 = n := by",
    "  exact Nat.add_zero n",
    "",
    "end MathResearch"
  ].join("\n");

  const parsed = extractLeanTheoremDeclarationSignature({
    lean_source: source,
    theorem_name: "MathResearch.C0001"
  });
  assert.equal(parsed.result, "ok");
  assert.equal(parsed.signature.theorem_name, "MathResearch.C0001");
  assert.equal(parsed.signature.normalized_signature, "MathResearch.C0001 (n : Nat) : n + 0 = n");
  assert.equal(parsed.signature.normalized_type, "(n : Nat) : n + 0 = n");

  const report = checkStatementEquivalence({
    projectRoot,
    reportPath: join(".comath", "evidence", "C-0001", "lean", "statement-declaration-parser.json"),
    locked_statement_hash: "sha256:locked",
    formal_spec_statement: "MathResearch.C0001 (n : Nat) : n + 0 = n",
    lean_check_output: "",
    lean_source: source,
    theorem_name: "MathResearch.C0001"
  });
  assert.equal(report.result, "pass");
  assert.equal(report.status, "exact");
  assert.equal(report.signature_source, "lean_declaration_parser");

  const ambiguous = extractLeanTheoremDeclarationSignature({
    lean_source: [source, "theorem C0001 (n : Nat) : 0 + n = n := Nat.zero_add n"].join("\n"),
    theorem_name: "MathResearch.C0001"
  });
  assert.equal(ambiguous.result, "ambiguous");

  const substringOnly = extractLeanTheoremDeclarationSignature({
    lean_source: "-- theorem C0001 (n : Nat) : n + 0 = n := Nat.add_zero n",
    theorem_name: "MathResearch.C0001"
  });
  assert.equal(substringOnly.result, "missing");
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log("Phase 54 Lean declaration parser tests passed.");
