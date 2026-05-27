import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { assertPathAllowed } from "../../security/path-policy.js";

export type AxiomProfileReport = {
  result: "pass" | "fail";
  theorem_name: string;
  raw_output: string;
  trust_profile: LeanTrustProfile;
  allowed_axioms: string[];
  detected_axioms: string[];
  hard_vetoes: string[];
};

export type LeanTrustProfile = {
  profile_id: string;
  allowed_axioms: string[];
  require_print_axioms: boolean;
};

const defaultTrustProfile: LeanTrustProfile = {
  profile_id: "ordinary_classical",
  allowed_axioms: ["propext", "Quot.sound", "Classical.choice"],
  require_print_axioms: true
};

function extractDetectedAxioms(rawOutput: string, theoremName: string): string[] {
  if (rawOutput.includes("does not depend on any axioms")) {
    return [];
  }
  const bracketMatch = rawOutput.match(/\[(?<axioms>[^\]]*)\]/);
  const tokens = bracketMatch?.groups?.axioms
    ? bracketMatch.groups.axioms.split(/[,;\s]+/)
    : rawOutput.split(/\r?\n/).flatMap((line) => line.split(/[:,\s]+/));
  const ignored = new Set(["", theoremName, "depends", "on", "axioms", "axiom", "uses", "by"]);
  return tokens
    .map((token) => token.trim().replace(/^['"`]+|['"`.,;:]+$/g, ""))
    .filter((token) => token && !ignored.has(token))
    .filter((token) => /^[A-Za-z_][A-Za-z0-9_'.]*(?:\.[A-Za-z_][A-Za-z0-9_'.]*)*$/.test(token))
    .filter((token, index, all) => all.indexOf(token) === index);
}

function hasTargetAxiomReport(rawOutput: string, theoremName: string): boolean {
  const escapedTheorem = theoremName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`${escapedTheorem}[^\\n]*(?:does not depend on any axioms|depends on axioms)`).test(rawOutput);
}

export function checkAxiomProfile(input: {
  projectRoot: string;
  reportPath: string;
  theorem_name: string;
  raw_output: string;
  trust_profile?: Partial<LeanTrustProfile>;
}): AxiomProfileReport {
  const trust_profile: LeanTrustProfile = {
    ...defaultTrustProfile,
    ...input.trust_profile,
    allowed_axioms: input.trust_profile?.allowed_axioms ?? defaultTrustProfile.allowed_axioms
  };
  const allowed = new Set(trust_profile.allowed_axioms);
  const detected_axioms = extractDetectedAxioms(input.raw_output, input.theorem_name);
  const unauthorized = detected_axioms.filter((axiom) => !allowed.has(axiom));
  const missingTargetAxiomReport =
    trust_profile.require_print_axioms && !hasTargetAxiomReport(input.raw_output, input.theorem_name);
  const hard_vetoes = [
    ...unauthorized.map((axiom) => `unauthorized_axiom:${axiom}`),
    ...(missingTargetAxiomReport ? ["missing_target_axiom_report"] : [])
  ];
  const report: AxiomProfileReport = {
    result: hard_vetoes.length === 0 ? "pass" : "fail",
    theorem_name: input.theorem_name,
    raw_output: input.raw_output,
    trust_profile,
    allowed_axioms: [...allowed],
    detected_axioms,
    hard_vetoes
  };
  const path = assertPathAllowed(input.projectRoot, input.reportPath, { purpose: "runtime-write" });
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}
