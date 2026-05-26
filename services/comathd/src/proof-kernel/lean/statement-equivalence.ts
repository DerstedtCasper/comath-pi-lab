import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { assertPathAllowed } from "../../security/path-policy.js";

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
  const normalizedActual = input.lean_check_output.replace(/\s+/g, " ").trim();
  const exact = normalizedActual.includes(normalizedExpected);
  const report: StatementEquivalenceReport = {
    result: exact ? "pass" : "fail",
    status: exact ? "exact" : "different",
    locked_statement_hash: input.locked_statement_hash,
    formal_spec_statement: input.formal_spec_statement,
    lean_check_output: input.lean_check_output,
    theorem_name: input.theorem_name,
    hard_vetoes: exact ? [] : ["statement_drift"]
  };
  const path = assertPathAllowed(input.projectRoot, input.reportPath, { purpose: "runtime-write" });
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}
