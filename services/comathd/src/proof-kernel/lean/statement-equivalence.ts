import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { assertPathAllowed } from "../../security/path-policy.js";
import { extractLeanStatementSignature, type LeanStatementSignature } from "./statement-signature.js";

export type StatementEquivalenceReport = {
  result: "pass" | "fail";
  status:
    | "exact"
    | "definitionally_equivalent"
    | "logically_equivalent_with_registered_lemmas"
    | "weaker"
    | "stronger"
    | "different"
    | "unknown";
  locked_statement_hash: string;
  formal_spec_statement: string;
  lean_check_output: string;
  theorem_name: string;
  target_signature?: LeanStatementSignature;
  signature_matches: string[];
  hard_vetoes: string[];
};

export function checkStatementEquivalence(input: {
  projectRoot: string;
  reportPath: string;
  locked_statement_hash: string;
  formal_spec_statement: string;
  lean_check_output: string;
  theorem_name: string;
}): StatementEquivalenceReport {
  const normalizedExpected = input.formal_spec_statement.replace(/\s+/g, " ").trim();
  const target = extractLeanStatementSignature(input);
  const exact = target.result === "ok" && target.signature.normalized_signature === normalizedExpected;
  const hard_vetoes =
    target.result === "missing"
      ? ["missing_target_check_output"]
      : target.result === "ambiguous"
        ? ["ambiguous_target_check_output"]
        : exact
          ? []
          : ["statement_signature_mismatch", "statement_drift"];
  const report: StatementEquivalenceReport = {
    result: hard_vetoes.length === 0 ? "pass" : "fail",
    status: exact ? "exact" : "different",
    locked_statement_hash: input.locked_statement_hash,
    formal_spec_statement: input.formal_spec_statement,
    lean_check_output: input.lean_check_output,
    theorem_name: input.theorem_name,
    ...(target.result === "ok" ? { target_signature: target.signature } : {}),
    signature_matches: target.matches,
    hard_vetoes
  };
  const path = assertPathAllowed(input.projectRoot, input.reportPath, { purpose: "runtime-write" });
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}
