import { graphPatchSchema, type GraphPatch, type MemoryEdge, type MemoryNode } from "../../types/schemas.js";

export type BraidRiskFlag =
  | "notation_drift"
  | "category_level_mismatch"
  | "semisimplicity_assumption_missing"
  | "q_root_of_unity_case_split"
  | "physical_interpretation_overclaim";

export type BraidOntologyEntry = {
  id: string;
  label: string;
  description: string;
  assumption_fields: string[];
  risk_flags: BraidRiskFlag[];
  related_protocols: string[];
};

export type BraidComputationProtocol = {
  id: string;
  label: string;
  runner_id: "sympy-exact" | "counterexample-search";
  evidence_kind: "computation" | "symbolic";
  requires_exact_arithmetic: boolean;
  may_promote_claim: false;
  expected_vetoes: string[];
  input_contract: string[];
};

export type BraidClaimTemplate = {
  id: string;
  statement: string;
  assumptions: string[];
  blockers: string[];
  risk_flags: BraidRiskFlag[];
  target_status: "conjectural";
};

export type BraidLeanFormalizationTarget = {
  fragment: string;
  lean_namespace: string;
  theorem_shape: string;
  status: "translation_target" | "skeleton_only";
  blockers: string[];
};

export type BraidLiteraturePrompt = {
  id: string;
  topic: string;
  required_sources: string[];
  must_not_use: string[];
  boundary_questions: string[];
};

export type BraidRunnerInput = {
  runner_id: "sympy-exact" | "counterexample-search";
  input: Record<string, unknown>;
};

export type BraidDomainPack = {
  id: "braid-statistics";
  version: "phase14-v1";
  status_authority: false;
  evidence_producer_only: true;
  required_risk_flags: BraidRiskFlag[];
  boundaries: string[];
  ontology_count: number;
  protocol_count: number;
};

const timestamp = "2026-05-25T00:00:00.000Z";

export const braidRiskFlags: readonly BraidRiskFlag[] = [
  "notation_drift",
  "category_level_mismatch",
  "semisimplicity_assumption_missing",
  "q_root_of_unity_case_split",
  "physical_interpretation_overclaim"
] as const;

const ontology: readonly BraidOntologyEntry[] = [
  {
    id: "braid_group",
    label: "Braid group B_n",
    description: "Artin braid group with generators s_i and braid/far-commutation relations.",
    assumption_fields: ["strand_count", "generator_convention", "orientation_convention"],
    risk_flags: ["notation_drift"],
    related_protocols: ["braid_relation_exact"]
  },
  {
    id: "braid_word",
    label: "Braid word",
    description: "Finite word in braid generators and optional inverses, with explicit convention metadata.",
    assumption_fields: ["alphabet", "normal_form_claimed", "inverse_notation"],
    risk_flags: ["notation_drift"],
    related_protocols: ["braid_relation_exact", "small_counterexample_search"]
  },
  {
    id: "braid_representation",
    label: "Braid representation",
    description: "Homomorphism from B_n to linear, categorical, or operator-theoretic data.",
    assumption_fields: ["target_category", "ground_ring", "faithfulness_scope"],
    risk_flags: ["category_level_mismatch", "q_root_of_unity_case_split"],
    related_protocols: ["braid_relation_exact", "yang_baxter_matrix_exact"]
  },
  {
    id: "r_matrix",
    label: "R-matrix",
    description: "Candidate R operator used to encode braid/Yang-Baxter data.",
    assumption_fields: ["tensor_factor_order", "basis_order", "ground_ring"],
    risk_flags: ["notation_drift", "q_root_of_unity_case_split"],
    related_protocols: ["yang_baxter_matrix_exact"]
  },
  {
    id: "yang_baxter_equation",
    label: "Yang-Baxter equation",
    description: "Exact R12 R23 R12 = R23 R12 R23 or equivalent convention-specific form.",
    assumption_fields: ["operator_convention", "tensor_product_convention", "exact_ring"],
    risk_flags: ["notation_drift", "category_level_mismatch"],
    related_protocols: ["yang_baxter_matrix_exact"]
  },
  {
    id: "hecke_algebra",
    label: "Hecke algebra",
    description: "Quadratic quotient of braid group algebra with convention-sensitive q parameter.",
    assumption_fields: ["q_parameter", "quadratic_relation_convention", "root_of_unity_status"],
    risk_flags: ["q_root_of_unity_case_split", "notation_drift"],
    related_protocols: ["hecke_relation_exact"]
  },
  {
    id: "tensor_category",
    label: "Tensor category",
    description: "Monoidal or braided tensor category carrying categorical statistics data.",
    assumption_fields: ["semisimplicity", "rigidity", "braiding", "base_field"],
    risk_flags: ["semisimplicity_assumption_missing", "category_level_mismatch"],
    related_protocols: ["fusion_rule_consistency"]
  },
  {
    id: "dhr_sector",
    label: "DHR sector",
    description: "Superselection sector in algebraic quantum field theory with localization assumptions.",
    assumption_fields: ["spacetime_dimension", "localization_region", "transportability", "statistics_operator"],
    risk_flags: ["physical_interpretation_overclaim", "category_level_mismatch"],
    related_protocols: ["fusion_rule_consistency"]
  },
  {
    id: "parastatistics_sector",
    label: "Parastatistics sector",
    description: "Sector exhibiting permutation/parastatistical structure, with dimension-sensitive interpretation.",
    assumption_fields: ["dimension", "statistics_group", "field_algebra_assumptions"],
    risk_flags: ["physical_interpretation_overclaim", "category_level_mismatch"],
    related_protocols: ["small_counterexample_search"]
  },
  {
    id: "anyon_model",
    label: "Anyon model",
    description: "Low-dimensional braided/fusion data used for anyonic statistics.",
    assumption_fields: ["spacetime_dimension", "fusion_rules", "braiding_data", "unitarity"],
    risk_flags: ["physical_interpretation_overclaim", "semisimplicity_assumption_missing"],
    related_protocols: ["yang_baxter_matrix_exact", "fusion_rule_consistency"]
  }
] as const;

const protocols: readonly BraidComputationProtocol[] = [
  {
    id: "braid_relation_exact",
    label: "Exact braid relation check",
    runner_id: "sympy-exact",
    evidence_kind: "computation",
    requires_exact_arithmetic: true,
    may_promote_claim: false,
    expected_vetoes: ["not_symbolic_proof"],
    input_contract: ["strands", "word_left", "word_right"]
  },
  {
    id: "yang_baxter_matrix_exact",
    label: "Exact Yang-Baxter matrix check",
    runner_id: "sympy-exact",
    evidence_kind: "computation",
    requires_exact_arithmetic: true,
    may_promote_claim: false,
    expected_vetoes: ["not_symbolic_proof", "physical_interpretation_not_implied"],
    input_contract: ["matrix", "dimensions", "tensor_convention"]
  },
  {
    id: "hecke_relation_exact",
    label: "Exact Hecke quadratic relation check",
    runner_id: "sympy-exact",
    evidence_kind: "computation",
    requires_exact_arithmetic: true,
    may_promote_claim: false,
    expected_vetoes: ["not_symbolic_proof", "q_root_of_unity_case_split_required"],
    input_contract: ["q", "generator_square", "quadratic_relation_convention"]
  },
  {
    id: "fusion_rule_consistency",
    label: "Fusion rule consistency checks",
    runner_id: "sympy-exact",
    evidence_kind: "computation",
    requires_exact_arithmetic: true,
    may_promote_claim: false,
    expected_vetoes: ["semisimplicity_assumption_required"],
    input_contract: ["objects", "fusion_coefficients", "unit_object"]
  },
  {
    id: "small_counterexample_search",
    label: "Small finite search for counterexamples",
    runner_id: "counterexample-search",
    evidence_kind: "computation",
    requires_exact_arithmetic: false,
    may_promote_claim: false,
    expected_vetoes: ["numeric_search_not_symbolic"],
    input_contract: ["search_space", "seed", "bounds"]
  }
] as const;

const benchmarks: readonly BraidClaimTemplate[] = [
  {
    id: "BC-0001",
    statement: "The Artin braid relation s_i s_{i+1} s_i = s_{i+1} s_i s_{i+1} holds in B_n under the chosen generator convention.",
    assumptions: ["n >= 3", "1 <= i < n-1", "Artin generator convention is fixed"],
    blockers: ["requires convention match before importing literature or formal skeleton"],
    risk_flags: ["notation_drift"],
    target_status: "conjectural"
  },
  {
    id: "BC-0002",
    statement: "A candidate R-matrix induces a braid group representation when the exact Yang-Baxter relation holds.",
    assumptions: ["basis order is fixed", "tensor convention is fixed", "entries are exact"],
    blockers: ["physical interpretation is not implied by algebraic YBE alone"],
    risk_flags: ["category_level_mismatch", "physical_interpretation_overclaim"],
    target_status: "conjectural"
  },
  {
    id: "BC-0003",
    statement: "A Hecke algebra specialization requires a separate root-of-unity case split before categorical conclusions are drawn.",
    assumptions: ["q parameter convention is fixed", "ground ring is explicit"],
    blockers: ["root-of-unity and semisimplicity hypotheses unresolved"],
    risk_flags: ["q_root_of_unity_case_split", "semisimplicity_assumption_missing"],
    target_status: "conjectural"
  },
  {
    id: "BC-0004",
    statement: "DHR and anyonic interpretations must track spacetime dimension and localization assumptions separately from braid algebra checks.",
    assumptions: ["spacetime dimension is recorded", "localization assumptions are explicit"],
    blockers: ["AQFT sector assumptions and categorical equivalence are not established"],
    risk_flags: ["physical_interpretation_overclaim", "category_level_mismatch"],
    target_status: "conjectural"
  }
] as const;

const leanMap: readonly BraidLeanFormalizationTarget[] = [
  {
    fragment: "Artin generators and braid relation",
    lean_namespace: "Mathlib.GroupTheory.Braid",
    theorem_shape: "s_i * s_{i+1} * s_i = s_{i+1} * s_i * s_{i+1}",
    status: "translation_target",
    blockers: ["align generator notation with mathlib braid group API"]
  },
  {
    fragment: "Monoid quotient for Hecke relation",
    lean_namespace: "CoMath.BraidStatistics.Hecke",
    theorem_shape: "(T - q) * (T + 1) = 0",
    status: "skeleton_only",
    blockers: ["choose ground ring and q assumptions"]
  },
  {
    fragment: "Fusion coefficient associativity",
    lean_namespace: "CoMath.BraidStatistics.Fusion",
    theorem_shape: "sum N_ab^x N_xc^d = sum N_bc^y N_ay^d",
    status: "skeleton_only",
    blockers: ["encode finite object set and semiring assumptions"]
  }
] as const;

const literaturePrompts: readonly BraidLiteraturePrompt[] = [
  {
    id: "BLP-0001",
    topic: "DHR sectors, parastatistics, and the categorical statistics operator",
    required_sources: ["primary AQFT references", "exact locator", "quoted assumptions"],
    must_not_use: ["LLM memory", "summary without citation artifact"],
    boundary_questions: ["Which spacetime dimension is assumed?", "Which localization and transportability hypotheses are used?"]
  },
  {
    id: "BLP-0002",
    topic: "Braided tensor categories and anyon model physical interpretation boundaries",
    required_sources: ["primary tensor category reference", "anyon model source", "exact theorem locator"],
    must_not_use: ["LLM memory", "physics folklore without artifact"],
    boundary_questions: ["Is semisimplicity assumed?", "Is q at a root of unity?", "Does algebraic YBE imply the claimed physics?"]
  }
] as const;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function getBraidDomainPack(): BraidDomainPack {
  return {
    id: "braid-statistics",
    version: "phase14-v1",
    status_authority: false,
    evidence_producer_only: true,
    required_risk_flags: [...braidRiskFlags],
    boundaries: [
      "domain pack does not promote claims",
      "domain pack emits evidence tasks, risk flags, and GraphPatch proposals only",
      "physical interpretations require separate source and assumption checks"
    ],
    ontology_count: ontology.length,
    protocol_count: protocols.length
  };
}

export function listBraidOntologyEntries(): BraidOntologyEntry[] {
  return clone([...ontology]);
}

export function getBraidComputationProtocols(): BraidComputationProtocol[] {
  return clone([...protocols]);
}

export function getBraidBenchmarkClaims(): BraidClaimTemplate[] {
  return clone([...benchmarks]);
}

export function getBraidLeanFormalizationMap(): BraidLeanFormalizationTarget[] {
  return clone([...leanMap]);
}

export function getBraidLiteraturePrompts(): BraidLiteraturePrompt[] {
  return clone([...literaturePrompts]);
}

export function buildBraidRunnerInput(input: {
  protocol_id: string;
  strands?: number;
  word_left?: string[];
  word_right?: string[];
  matrix?: unknown;
  dimensions?: number[];
  q?: string;
  generator_square?: string;
}): BraidRunnerInput {
  const protocol = protocols.find((item) => item.id === input.protocol_id);
  if (!protocol) {
    throw new Error(`unknown braid protocol: ${input.protocol_id}`);
  }
  return {
    runner_id: protocol.runner_id,
    input: {
      domain_pack: "braid-statistics",
      domain_protocol: protocol.id,
      exact_arithmetic_required: protocol.requires_exact_arithmetic,
      expected_vetoes: [...protocol.expected_vetoes],
      ...input
    }
  };
}

function node(id: string, type: MemoryNode["type"], title: string, payload: Record<string, unknown>): MemoryNode {
  return {
    id,
    project_id: "PRJ-0001",
    type,
    title,
    payload,
    created_at: timestamp,
    updated_at: timestamp
  };
}

function edge(id: string, source_id: string, target_id: string, label: MemoryEdge["label"]): MemoryEdge {
  return {
    id,
    project_id: "PRJ-0001",
    source_id,
    target_id,
    label,
    created_at: timestamp
  };
}

export function buildBraidDomainGraphPatch(input: {
  project_id: string;
  source_workstream_id: string;
  created_by: string;
}): GraphPatch {
  const baseNodes: MemoryNode[] = [
    {
      ...node("DOM-1401", "DomainObject", "Braid statistics domain pack", {
        domain_pack: "braid-statistics",
        risk_flags: [...braidRiskFlags],
        ontology_ids: ontology.map((item) => item.id)
      }),
      project_id: input.project_id
    },
    {
      ...node("DEF-1401", "Definition", "Artin braid group generators", {
        notation: "s_i",
        assumptions: ["strand count n is fixed", "generator convention is explicit"]
      }),
      project_id: input.project_id
    },
    {
      ...node("TR-1401", "TheoremReference", "Yang-Baxter equation reference target", {
        locator_required: true,
        literature_prompt_id: "BLP-0002"
      }),
      project_id: input.project_id
    },
    ...benchmarks.slice(0, 2).map((claim, index) => ({
      ...node(`CLM-140${index + 1}`, "Claim", claim.id, {
        statement: claim.statement,
        assumptions: claim.assumptions,
        blockers: claim.blockers,
        risk_flags: claim.risk_flags,
        status: claim.target_status
      }),
      project_id: input.project_id
    }))
  ];

  const edges: MemoryEdge[] = [
    { ...edge("EDGE-1401", "CLM-1401", "DEF-1401", "depends_on"), project_id: input.project_id },
    { ...edge("EDGE-1402", "CLM-1402", "TR-1401", "cites"), project_id: input.project_id },
    { ...edge("EDGE-1403", "DOM-1401", "CLM-1401", "supports"), project_id: input.project_id }
  ];

  return graphPatchSchema.parse({
    patch_id: "GP-1401",
    project_id: input.project_id,
    source_workstream_id: input.source_workstream_id,
    state: "proposed",
    provenance: {
      created_by: input.created_by,
      created_at: timestamp
    },
    new_nodes: baseNodes,
    new_edges: edges,
    updated_nodes: [],
    candidate_conflicts: [],
    warnings: [
      "domain pack proposal requires human review before graph apply",
      "physical interpretation boundaries remain unresolved"
    ],
    apply_preconditions: ["review_domain_assumptions", "verify_literature_locators", "run_exact_protocols_before_status_change"]
  });
}
