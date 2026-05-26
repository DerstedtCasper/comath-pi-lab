import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { assertPathAllowed } from "../../security/path-policy.js";

export type AxiomProfileReport = {
  result: "pass" | "fail";
  theorem_name: string;
  raw_output: string;
  allowed_axioms: string[];
  detected_axioms: string[];
  hard_vetoes: string[];
};

const allowed = new Set(["propext", "Quot.sound", "Classical.choice"]);

export function checkAxiomProfile(input: {
  projectRoot: string;
  reportPath: string;
  theorem_name: string;
  raw_output: string;
}): AxiomProfileReport {
  const noAxioms = input.raw_output.includes("does not depend on any axioms");
  const detected_axioms = noAxioms
    ? []
    : input.raw_output
        .split(/\r?\n/)
        .flatMap((line) => line.split(/[:,\s]+/))
        .filter((token) => token && token.includes("."))
        .filter((token, index, all) => all.indexOf(token) === index);
  const unauthorized = detected_axioms.filter((axiom) => !allowed.has(axiom));
  const report: AxiomProfileReport = {
    result: unauthorized.length === 0 ? "pass" : "fail",
    theorem_name: input.theorem_name,
    raw_output: input.raw_output,
    allowed_axioms: [...allowed],
    detected_axioms,
    hard_vetoes: unauthorized.map((axiom) => `unauthorized_axiom:${axiom}`)
  };
  const path = assertPathAllowed(input.projectRoot, input.reportPath, { purpose: "runtime-write" });
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}
