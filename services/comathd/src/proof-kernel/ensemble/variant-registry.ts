import type { CandidateVariantId } from "../../types/schemas.js";

export type VariantConfig = {
  variant_id: CandidateVariantId;
  slug: string;
  name: string;
  purpose: string;
};

export const defaultVariants: VariantConfig[] = [
  {
    variant_id: "V1",
    slug: "V1_direct_formalist",
    name: "Direct Formalist",
    purpose: "Try the exact locked Lean proof directly."
  },
  {
    variant_id: "V2",
    slug: "V2_library_premise_hunter",
    name: "Library/Premise Hunter",
    purpose: "Prefer existing Lean/library facts before inventing lemmas."
  },
  {
    variant_id: "V3",
    slug: "V3_lemma_decomposer",
    name: "Lemma Decomposer",
    purpose: "Split the obligation into smaller proof obligations."
  },
  {
    variant_id: "V4",
    slug: "V4_tactic_sprinter",
    name: "Tactic Sprinter",
    purpose: "Try tactic-level proof scripts using Lean feedback."
  },
  {
    variant_id: "V5",
    slug: "V5_computation_verifier",
    name: "Algebraic/Computational Verifier",
    purpose: "Use exact computation where it is applicable."
  },
  {
    variant_id: "V6",
    slug: "V6_boundary_refuter",
    name: "Boundary Refuter",
    purpose: "Attack edge cases and missing assumptions."
  },
  {
    variant_id: "V7",
    slug: "V7_statement_equivalence_auditor",
    name: "Statement-Equivalence Auditor",
    purpose: "Reject weakened, strengthened, or drifted statements."
  },
  {
    variant_id: "V8",
    slug: "V8_dialectical_stress",
    name: "Dialectical Stress / Revision Agent",
    purpose: "Generate objections, repairs, and checkable revised obligations."
  }
];
