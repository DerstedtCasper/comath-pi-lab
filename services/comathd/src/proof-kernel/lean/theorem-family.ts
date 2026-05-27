import type { ProofObligation } from "../../types/schemas.js";

export type TheoremFamilyId = "nat_add_zero" | "nat_mul_zero";

export type TheoremFamily = {
  id: TheoremFamilyId;
  proposition: string;
  lockedStatementNl: string;
  structured: Record<string, unknown>;
  leanTarget: string;
  theoremName: string;
  namespace: string;
  theoremId: string;
  normalizedStatement: string;
  proofTerm: string;
  dependency: string;
  theoremFileRel: string;
  auditFileRel: string;
  formalSpecFileRel: string;
  buildTargets: readonly string[];
  replayCommand: string;
  notationLines: string[];
  directCandidateSummary: string;
  directCandidateMaintainabilityNotes: string;
};

const common = {
  theoremName: "MathResearch.C0001",
  namespace: "MathResearch",
  theoremId: "C0001",
  theoremFileRel: "MathResearch/C0001.lean",
  auditFileRel: "Audit/C0001.lean",
  formalSpecFileRel: "FormalSpec/C0001.json",
  buildTargets: ["MathResearch.C0001", "Audit.C0001"],
  replayCommand: "lake build MathResearch.C0001 Audit.C0001"
} as const;

export const theoremFamilies: TheoremFamily[] = [
  {
    ...common,
    id: "nat_add_zero",
    proposition: "n + 0 = n",
    lockedStatementNl: "For every natural number n, n + 0 = n.",
    structured: {
      variable: "n",
      type: "Nat",
      proposition: "n + 0 = n",
      theorem_family: "nat_add_zero"
    },
    leanTarget: "theorem C0001 (n : Nat) : n + 0 = n",
    normalizedStatement: "MathResearch.C0001 (n : Nat) : n + 0 = n",
    proofTerm: "Nat.add_zero n",
    dependency: "Nat.add_zero",
    notationLines: ["- `+`: Nat addition."],
    directCandidateSummary: "Direct Lean proof by Nat.add_zero for the exact locked theorem.",
    directCandidateMaintainabilityNotes: "Readable single theorem using Nat.add_zero from the Lean standard library."
  },
  {
    ...common,
    id: "nat_mul_zero",
    proposition: "n * 0 = 0",
    lockedStatementNl: "For every natural number n, n * 0 = 0.",
    structured: {
      variable: "n",
      type: "Nat",
      proposition: "n * 0 = 0",
      theorem_family: "nat_mul_zero"
    },
    leanTarget: "theorem C0001 (n : Nat) : n * 0 = 0",
    normalizedStatement: "MathResearch.C0001 (n : Nat) : n * 0 = 0",
    proofTerm: "Nat.mul_zero n",
    dependency: "Nat.mul_zero",
    notationLines: ["- `*`: Nat multiplication."],
    directCandidateSummary: "Direct Lean proof by Nat.mul_zero for the exact locked theorem.",
    directCandidateMaintainabilityNotes: "Readable single theorem using Nat.mul_zero from the Lean standard library."
  }
];

export function getTheoremFamilyById(id: TheoremFamilyId): TheoremFamily {
  const family = theoremFamilies.find((item) => item.id === id);
  if (!family) {
    throw new Error(`unknown theorem family: ${id}`);
  }
  return family;
}

export function findTheoremFamilyForGoal(goal: string): TheoremFamily | undefined {
  if (/\bn\s*\+\s*0\s*=\s*n\b/i.test(goal)) {
    return getTheoremFamilyById("nat_add_zero");
  }
  if (/\bn\s*\*\s*0\s*=\s*0\b/i.test(goal)) {
    return getTheoremFamilyById("nat_mul_zero");
  }
  return undefined;
}

export function findTheoremFamilyForObligation(obligation: ProofObligation): TheoremFamily | undefined {
  const matchesObligation = (family: TheoremFamily): boolean => {
    const proposition = obligation.locked_statement_structured.proposition;
    const familyId = obligation.locked_statement_structured.theorem_family;
    return (
      proposition === family.proposition &&
      (!familyId || familyId === family.id) &&
      obligation.locked_statement_nl === family.lockedStatementNl &&
      (!obligation.lean_target || obligation.lean_target === family.leanTarget)
    );
  };

  const familyId = obligation.locked_statement_structured.theorem_family;
  if (familyId === "nat_add_zero" || familyId === "nat_mul_zero") {
    const family = getTheoremFamilyById(familyId);
    return matchesObligation(family) ? family : undefined;
  }
  const proposition = obligation.locked_statement_structured.proposition;
  if (typeof proposition === "string") {
    return theoremFamilies.find((family) => family.proposition === proposition && matchesObligation(family));
  }
  return undefined;
}
