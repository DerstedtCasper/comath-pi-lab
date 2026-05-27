import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { assertPathAllowed } from "../../security/path-policy.js";
import {
  extractLeanStatementSignature,
  extractLeanTheoremDeclarationSignature,
  type LeanStatementSignature
} from "./statement-signature.js";

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
  signature_source: "lean_check_output" | "lean_declaration_parser";
  target_signature?: LeanStatementSignature;
  equivalence_witness?: {
    kind: "registered_definitional_alias";
    formal_spec_statement: string;
    equivalent_signature: string;
    justification: string;
  };
  signature_matches: string[];
  hard_vetoes: string[];
};

export type StatementDefinitionalAlias = {
  formal_spec_statement: string;
  equivalent_signature: string;
  justification: string;
};

function normalizeStatement(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function findAliasWitness(input: {
  aliases: StatementDefinitionalAlias[];
  normalizedExpected: string;
  normalizedActual: string;
}): StatementEquivalenceReport["equivalence_witness"] | undefined {
  const witness = input.aliases.find(
    (alias) =>
      normalizeStatement(alias.formal_spec_statement) === input.normalizedExpected &&
      normalizeStatement(alias.equivalent_signature) === input.normalizedActual
  );
  if (!witness) {
    return undefined;
  }
  return {
    kind: "registered_definitional_alias",
    formal_spec_statement: witness.formal_spec_statement,
    equivalent_signature: witness.equivalent_signature,
    justification: witness.justification
  };
}

export function checkStatementEquivalence(input: {
  projectRoot: string;
  reportPath: string;
  locked_statement_hash: string;
  formal_spec_statement: string;
  lean_check_output: string;
  lean_source?: string;
  theorem_name: string;
  allowed_definitional_aliases?: StatementDefinitionalAlias[];
}): StatementEquivalenceReport {
  const normalizedExpected = normalizeStatement(input.formal_spec_statement);
  const leanCheckTarget = extractLeanStatementSignature(input);
  const declarationTarget =
    leanCheckTarget.result === "ok" || !input.lean_source
      ? undefined
      : extractLeanTheoremDeclarationSignature({ lean_source: input.lean_source, theorem_name: input.theorem_name });
  const target = leanCheckTarget.result === "ok" || !declarationTarget ? leanCheckTarget : declarationTarget;
  const signatureSource = target === declarationTarget ? "lean_declaration_parser" : "lean_check_output";
  const exact = target.result === "ok" && target.signature.normalized_signature === normalizedExpected;
  const aliasWitness =
    target.result === "ok"
      ? findAliasWitness({
          aliases: input.allowed_definitional_aliases ?? [],
          normalizedExpected,
          normalizedActual: target.signature.normalized_signature
        })
      : undefined;
  const accepted = exact || Boolean(aliasWitness);
  const hard_vetoes =
    target.result === "missing"
      ? ["missing_target_check_output"]
      : target.result === "ambiguous"
        ? ["ambiguous_target_check_output"]
        : accepted
          ? []
          : ["statement_signature_mismatch", "statement_drift"];
  const report: StatementEquivalenceReport = {
    result: hard_vetoes.length === 0 ? "pass" : "fail",
    status: exact ? "exact" : aliasWitness ? "definitionally_equivalent" : "different",
    locked_statement_hash: input.locked_statement_hash,
    formal_spec_statement: input.formal_spec_statement,
    lean_check_output: input.lean_check_output,
    theorem_name: input.theorem_name,
    signature_source: signatureSource,
    ...(target.result === "ok" ? { target_signature: target.signature } : {}),
    ...(aliasWitness ? { equivalence_witness: aliasWitness } : {}),
    signature_matches: target.matches,
    hard_vetoes
  };
  const path = assertPathAllowed(input.projectRoot, input.reportPath, { purpose: "runtime-write" });
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}
