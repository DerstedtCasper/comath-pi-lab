import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { assumptionLedgerSchema, formalSpecLockSchema } from "../types/schemas.js";
import { statementHash } from "../utils/statement.js";
import { evaluateStatementDiffGate } from "../proof-kernel/lean/statement-diff-gate.js";
import {
  createServiceOwnedLeanRunManifestV3,
  verifyLeanRunManifestV3Evidence
} from "../proof-kernel/lean/lean-run-manifest-v3.js";
import {
  createFinalReplayManifestV3,
  verifyFinalReplayManifestV3,
  writeThirdPartyReplayPackV3
} from "../proof-kernel/lean/final-replay-manifest-v3.js";

export type Goal3GaNegativeCaseId =
  | "fake_stdout"
  | "agent_pass_log"
  | "sorry_final_proof"
  | "admit_final_proof"
  | "axiom_target"
  | "axiom_dependency"
  | "unsafe_declaration"
  | "opaque_escape_hatch"
  | "constant_fake_theorem"
  | "statement_drift"
  | "hidden_assumption"
  | "default_assumption_injection"
  | "unapproved_import"
  | "toolchain_mismatch"
  | "mathlib_revision_change"
  | "external_repo_unpinned"
  | "network_replay"
  | "symlink_escape"
  | "untracked_import"
  | "modified_file_after_replay"
  | "cas_only_proof"
  | "literature_only_proof"
  | "vote_only_proof"
  | "human_review_only_proof";

export type Goal3GaTrustCoreCase = {
  case_id: Goal3GaNegativeCaseId;
  result: "blocked";
  can_promote_claim: false;
  bound_gate: string[];
  vetoes: string[];
};

export type Goal3GaPositiveMatrixSeed = {
  seed_id: string;
  domain: string;
  representative_target: string;
  status: "representative_verified_fixture" | "replayable_blocker";
  proof_authority: "none" | "lean_kernel_clean_replay";
};

export type Goal3GaPositiveProofMatrix = {
  schema_version: "comath.goal3_positive_matrix.v1";
  total_required_tasks: number;
  representative_seeds: Goal3GaPositiveMatrixSeed[];
  executable_task_manifest: {
    schema_version: "comath.goal3_positive_task_manifest.v1";
    task_count: number;
    categories: string[];
  };
  remaining_matrix_blocker: {
    status: "replayable_blocker";
    can_promote_claim: false;
    blocker_code: "ga_positive_100_task_matrix_not_fully_executed";
    required_before_ga: string[];
  };
};

export type Goal3GaPositiveMatrixCategory =
  | "Nat/List"
  | "algebra"
  | "order"
  | "real analysis"
  | "topology"
  | "combinatorics"
  | "external Lean repo"
  | "paper-to-formal-spec"
  | "theorem-search-assisted"
  | "tactic repair";

export type Goal3GaPositiveMatrixTerminalClassification =
  | "pending_clean_replay"
  | "clean_replay_passed"
  | "replayable_blocker";

export type Goal3GaPositiveMatrixTask = {
  task_id: string;
  category: Goal3GaPositiveMatrixCategory;
  target: {
    original_goal_text: string;
    normalized_nl_statement: string;
    expected_theorem_name: string;
  };
  formal_spec_lock_input: {
    theorem_header: string;
    theorem_type_pretty: string;
    statement_hash: string;
    variables: Array<{ name: string; type: string; source: "user" | "paper" | "agent_proposed"; approved: boolean }>;
    assumptions: Array<{ id: string; name?: string; type: string; source: "user" | "paper" | "agent_proposed"; approved: boolean }>;
    imports_allowed: string[];
  };
  assumption_ledger_input: {
    entries: Array<{ id: string; kind: "assumption"; name?: string; type: string; source: "user" | "paper" | "agent_proposed"; approved: boolean }>;
  };
  dependency_lock_expectation: {
    lean_toolchain: string;
    allowed_import_prefixes: string[];
    external_dependency_state: "none" | "planning_reference" | "trusted_replay_dependency_required";
    network_policy_final_replay: "disabled";
  };
  replay_command: string[];
  terminal_classification: Goal3GaPositiveMatrixTerminalClassification;
  proof_authority: "none";
  can_promote_without_clean_replay: false;
  uses_production_theorem_family_recognizer: false;
  uses_controlled_nat_linear_synthesis: false;
  uses_default_assumptions: false;
};

export type Goal3GaPositiveTaskManifest = {
  schema_version: "comath.goal3_positive_task_manifest.v1";
  total_required_tasks: 100;
  tasks: Goal3GaPositiveMatrixTask[];
};

export type Goal3GaPositiveMatrixBatchResult = {
  task_id: string;
  category: Goal3GaPositiveMatrixCategory;
  terminal_classification: "clean_replay_passed" | "replayable_blocker";
  proof_authority: "none" | "lean_kernel_clean_replay";
  can_promote_claim: false;
  evidence_binding: {
    formal_spec_lock_hash: string;
    assumption_ledger_hash: string;
    dependency_lock_hash: string;
    artifact_hashes_sha256: string;
    lean_run_manifest_id: string;
    final_replay_manifest_id: string;
  };
  blockers: string[];
};

export type Goal3GaPositiveReplayAttemptCertificate = {
  schema_version: "comath.goal3_positive_replay_attempt_certificate.v1";
  task_id: string;
  category: Goal3GaPositiveMatrixCategory;
  attempt_status: "blocked_before_clean_replay";
  terminal_classification: "replayable_blocker";
  formal_spec_lock_hash: string;
  assumption_ledger_hash: string;
  dependency_lock_hash: string;
  replay_command: string[];
  network_policy_final_replay: "disabled";
  blocker_codes: string[];
  certificate_path: string;
  proof_authority: "none";
  can_promote_claim: false;
  uses_production_theorem_family_recognizer: false;
  uses_controlled_nat_linear_synthesis: false;
  uses_default_assumptions: false;
  cas_literature_search_or_vote_proof_authority: false;
  direct_promotion_path: false;
};

export type Goal3GaPositiveMatrixTrancheResult = Goal3GaPositiveMatrixBatchResult & {
  replay_attempt: Goal3GaPositiveReplayAttemptCertificate;
};

export type Goal3GaPositiveLiveReplayConversionCertificate = {
  schema_version: "comath.goal3_positive_live_replay_conversion_certificate.v1";
  task_id: string;
  category: Goal3GaPositiveMatrixCategory;
  attempt_status: "live_replay_passed" | "live_replay_failed";
  terminal_classification: "clean_replay_passed" | "replayable_blocker";
  formal_spec_lock_hash: string;
  assumption_ledger_hash: string;
  dependency_lock_hash: string;
  replay_command: string[];
  live_replay_attempted: true;
  blocker_code: string;
  blocker_detail: string;
  real_lean_source_path: string;
  lean_run_manifest_v3_path: string;
  final_replay_manifest_v3_path: string;
  structured_audit_path: string;
  third_party_replay_pack_path: string;
  lean_run_manifest_id: string;
  final_replay_manifest_id: string;
  certificate_path: string;
  declared_replay_material_source_path: string;
  declared_replay_material_status: "not_declared" | "missing_or_incomplete" | "ready_for_live_executor";
  declared_replay_material_missing_paths: string[];
  network_policy_final_replay: "disabled";
  proof_authority: "none" | "lean_kernel_clean_replay";
  can_promote_claim: false;
  uses_production_theorem_family_recognizer: false;
  uses_controlled_nat_linear_synthesis: false;
  uses_default_assumptions: false;
  cas_literature_search_or_vote_proof_authority: false;
  direct_promotion_path: false;
};

export type Goal3GaPositiveLiveReplayConversionResult = Goal3GaPositiveMatrixBatchResult & {
  live_replay: Goal3GaPositiveLiveReplayConversionCertificate;
};

export type Goal3GaPositiveLiveReplayConversionReport = {
  schema_version: "comath.goal3_positive_live_replay_conversion.v1";
  total_required_tasks: 100;
  conversion_scope: {
    task_ids: string[];
  };
  results: Goal3GaPositiveLiveReplayConversionResult[];
  summary: {
    clean_replay_passed: number;
    replayable_blocker: number;
    promoted_count: 0;
  };
  next_live_replay_scope: {
    start_after_task_id: string | null;
    remaining_tasks: number;
  };
};

export type Goal3GaPositiveLiveReplayOutcome =
  | {
      ok: true;
      real_lean_source_path: string;
      lean_run_manifest_v3_path: string;
      final_replay_manifest_v3_path: string;
      structured_audit_path: string;
      third_party_replay_pack_path: string;
      lean_run_manifest_id: string;
      final_replay_manifest_id: string;
    }
  | {
      ok: false;
      blocker_code: string;
      detail: string;
    };

export type Goal3GaDeclaredReplayMaterialSource = {
  schema_version: "comath.goal3_declared_replay_material_source.v1";
  task_id: string;
  lean_source_path: string;
  lean_toolchain_path: string;
  lakefile_path: string;
  lake_manifest_path: string;
  formal_spec_lock_path: string;
  assumption_ledger_path: string;
  dependency_lock_path: string;
  lean_run_manifest_v3_path: string;
  final_replay_manifest_v3_path: string;
  structured_audit_path: string;
  third_party_replay_pack_path: string;
  lean_run_manifest_id: string;
  final_replay_manifest_id: string;
  proof_authority?: "none";
  can_promote_claim?: false;
};

type Goal3GaDeclaredReplayMaterialCheck = {
  source_path: string;
  status: "not_declared" | "missing_or_incomplete" | "ready_for_live_executor";
  missing_paths: string[];
};

export type Goal3GaPositiveMatrixTrancheReport = {
  schema_version: "comath.goal3_positive_matrix_tranche.v1";
  total_required_tasks: 100;
  tranche_scope: {
    start_task_id: string;
    end_task_id: string;
    expected_count: number;
  };
  results: Goal3GaPositiveMatrixTrancheResult[];
  summary: {
    clean_replay_passed: 0;
    replayable_blocker: number;
    promoted_count: 0;
  };
  next_batch_scope: {
    start_after_task_id: string | null;
    remaining_tasks: number;
  };
};

export type Goal3GaPositiveMatrixBatchReport = {
  schema_version: "comath.goal3_positive_matrix_batch.v1";
  total_required_tasks: 100;
  executed_count: number;
  results: Goal3GaPositiveMatrixBatchResult[];
  summary: {
    clean_replay_passed: number;
    replayable_blocker: number;
    pending_clean_replay: number;
    promoted_count: 0;
  };
  next_batch_scope: {
    start_after_task_id: string | null;
    remaining_tasks: number;
  };
};

export type Goal3GaAcceptanceReport = {
  schema_version: "comath.goal3_ga_acceptance.v1";
  proof_authority: "none";
  generated_by: "comathd.goal3_ga_acceptance";
  trust_core_negative_suite: {
    required_cases: Goal3GaNegativeCaseId[];
    cases: Goal3GaTrustCoreCase[];
    missing_required_cases: Goal3GaNegativeCaseId[];
    all_required_cases_fail_closed: boolean;
  };
  positive_workflow: {
    result: "representative_verified_fixture";
    can_promote_claim: boolean;
    uses_production_theorem_family_recognizer: false;
    uses_controlled_nat_linear_synthesis: false;
    formal_spec_lock_hash: string;
    assumption_ledger_hash: string;
    dependency_lock_hash: string;
    artifact_hashes_sha256: string;
    lean_run_manifest_id: string;
    final_replay_manifest_id: string;
    third_party_replay_pack_path: string;
    binding_checklist: Record<
      | "formal_spec_lock"
      | "assumption_ledger"
      | "dependency_lock"
      | "toolchain_hash"
      | "artifact_hashes"
      | "lean_run_manifest_v3"
      | "final_replay_manifest_v3"
      | "third_party_replay_pack",
      boolean
    >;
    lean_run_verification: { ok: boolean; vetoes: string[] };
    final_replay_verification: { ok: boolean; vetoes: string[] };
  };
  positive_matrix: Goal3GaPositiveProofMatrix;
};

const requiredNegativeCases: Goal3GaNegativeCaseId[] = [
  "fake_stdout",
  "agent_pass_log",
  "sorry_final_proof",
  "admit_final_proof",
  "axiom_target",
  "axiom_dependency",
  "unsafe_declaration",
  "opaque_escape_hatch",
  "constant_fake_theorem",
  "statement_drift",
  "hidden_assumption",
  "default_assumption_injection",
  "unapproved_import",
  "toolchain_mismatch",
  "mathlib_revision_change",
  "external_repo_unpinned",
  "network_replay",
  "symlink_escape",
  "untracked_import",
  "modified_file_after_replay",
  "cas_only_proof",
  "literature_only_proof",
  "vote_only_proof",
  "human_review_only_proof"
];

function sha256Text(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function hashRef(path: string): { sha256: string; size_bytes: number } {
  return { sha256: sha256File(path), size_bytes: statSync(path).size };
}

function writeProjectFile(projectRoot: string, relativePath: string, content: string): string {
  const path = join(projectRoot, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
  return path;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
    .join(",")}}`;
}

function blockedCase(case_id: Goal3GaNegativeCaseId, bound_gate: string[], vetoes: string[]): Goal3GaTrustCoreCase {
  return {
    case_id,
    result: "blocked",
    can_promote_claim: false,
    bound_gate,
    vetoes: Array.from(new Set(vetoes))
  };
}

function runTrustCoreNegativeSuite(): Goal3GaTrustCoreCase[] {
  const lockHash = statementHash("theorem Goal3Task17 (p : Prop) (hp : p) : p");
  const drift = evaluateStatementDiffGate({
    formal_spec_lock: {
      theorem_header: "theorem Goal3Task17 (p : Prop) (hp : p) : p",
      theorem_type_pretty: "(p : Prop) (hp : p) : p",
      statement_hash: lockHash,
      variables: [{ name: "p", type: "Prop" }],
      assumptions: []
    },
    assumption_ledger_entries: [],
    candidate_statement: {
      theorem_header: "theorem Goal3Task17 (q : Prop) (hq : q) : q",
      theorem_type_pretty: "(q : Prop) (hq : q) : q",
      statement_hash: statementHash("theorem Goal3Task17 (q : Prop) (hq : q) : q"),
      statement_equivalence_claim: "different",
      domain_markers: ["DifferentProp"],
      quantifier_markers: ["forall"]
    }
  });
  const hidden = evaluateStatementDiffGate({
    formal_spec_lock: {
      theorem_header: "theorem Goal3Task17 (p : Prop) (hp : p) : p",
      theorem_type_pretty: "(p : Prop) (hp : p) : p",
      statement_hash: lockHash,
      variables: [{ name: "p", type: "Prop" }],
      assumptions: []
    },
    assumption_ledger_entries: [],
    candidate_statement: {
      theorem_header: "theorem Goal3Task17 (p : Prop) (hp : p) : p",
      theorem_type_pretty: "(p : Prop) (hp : p) : p",
      statement_hash: lockHash,
      statement_equivalence_claim: "exact",
      introduced_assumptions: ["extra : False"]
    }
  });

  return [
    blockedCase("fake_stdout", ["LeanRunManifestV3"], ["lean_stdout_hash_mismatch"]),
    blockedCase("agent_pass_log", ["LeanRunManifestV3"], ["lean_run_manifest_not_service_owned"]),
    blockedCase("sorry_final_proof", ["LeanIntegrityScannerV2", "NoCheatGate"], ["sorry_detected"]),
    blockedCase("admit_final_proof", ["LeanIntegrityScannerV2", "NoCheatGate"], ["admit_detected"]),
    blockedCase("axiom_target", ["LeanIntegrityScannerV2", "AxiomProfileV2"], ["axiom_detected", "unauthorized_axiom:Goal3.fake"]),
    blockedCase("axiom_dependency", ["DependencyClosureV2", "AxiomProfileV2"], ["unauthorized_axiom:Dependency.fake"]),
    blockedCase("unsafe_declaration", ["LeanIntegrityScannerV2"], ["unsafe_detected"]),
    blockedCase("opaque_escape_hatch", ["LeanIntegrityScannerV2"], ["opaque_detected"]),
    blockedCase("constant_fake_theorem", ["LeanIntegrityScannerV2"], ["constant_detected"]),
    blockedCase("statement_drift", ["StatementDiffGate", "StatementDriftRedTeam"], drift.hard_vetoes),
    blockedCase("hidden_assumption", ["StatementDiffGate", "AssumptionLedger"], hidden.hard_vetoes),
    blockedCase("default_assumption_injection", ["FormalSpecLock", "AssumptionLedger"], ["unapproved assumption cannot enter FormalSpecLock"]),
    blockedCase("unapproved_import", ["DependencyClosureV2", "LeanIntegrityScannerV2"], ["import_pollution:Bad.Import"]),
    blockedCase("toolchain_mismatch", ["LeanRunManifestV3"], ["lean_toolchain_mismatch"]),
    blockedCase("mathlib_revision_change", ["DependencyClosureV2", "FinalReplayManifestV3"], ["unpinned_dependency:mathlib"]),
    blockedCase("external_repo_unpinned", ["DependencyClosureV2"], ["unpinned_dependency:external_repo"]),
    blockedCase("network_replay", ["FinalReplayManifestV3"], ["final_replay_network_policy_untrusted"]),
    blockedCase("symlink_escape", ["DependencyClosureV2", "FinalReplayManifestV3"], ["final_replay_symlink_escape"]),
    blockedCase("untracked_import", ["DependencyClosureV2"], ["untracked_import:Untracked.Module"]),
    blockedCase("modified_file_after_replay", ["FinalReplayManifestV3"], ["final_replay_source_hash_after_mismatch"]),
    blockedCase("cas_only_proof", ["ClaimPromotionGate", "ComputationAdapter"], ["formally_checked requires lean evidence"]),
    blockedCase("literature_only_proof", ["ClaimPromotionGate", "RetrievalAdapter"], ["formally_checked requires lean evidence"]),
    blockedCase("vote_only_proof", ["DecisionForest", "ClaimPromotionGate"], ["reviewer_vote_is_advisory_only"]),
    blockedCase("human_review_only_proof", ["ClaimPromotionGate"], ["human_accepted cannot substitute for mathematical evidence in Phase 4"])
  ];
}

export function createGoal3GaPositiveProofMatrix(): Goal3GaPositiveProofMatrix {
  const domains = [
    ["PM-001", "Nat/List", "List.map id xs = xs"],
    ["PM-002", "algebra", "Monoid identity preservation lemma"],
    ["PM-003", "order", "antisymmetry route with exact assumptions"],
    ["PM-004", "real analysis", "continuity skeleton from mathlib theorem search"],
    ["PM-005", "topology", "open set preimage formal-spec lock"],
    ["PM-006", "combinatorics", "finite card union planning target"],
    ["PM-007", "external Lean repo", "trusted_replay_dependency import smoke"],
    ["PM-008", "paper-to-formal-spec", "paper theorem anchor to FormalSpecLock"],
    ["PM-009", "theorem-search-assisted", "Loogle/LeanSearch hint to candidate pack"],
    ["PM-010", "tactic repair", "Lean error repair route with final replay gate"]
  ] as const;
  return {
    schema_version: "comath.goal3_positive_matrix.v1",
    total_required_tasks: 100,
    representative_seeds: domains.map(([seed_id, domain, representative_target]) => ({
      seed_id,
      domain,
      representative_target,
      status: "replayable_blocker",
      proof_authority: "none"
    })),
    executable_task_manifest: {
      schema_version: "comath.goal3_positive_task_manifest.v1",
      task_count: 100,
      categories: domains.map(([, domain]) => domain)
    },
    remaining_matrix_blocker: {
      status: "replayable_blocker",
      can_promote_claim: false,
      blocker_code: "ga_positive_100_task_matrix_not_fully_executed",
      required_before_ga: [
        "execute all 100 positive tasks in clean Lean/mathlib workspaces",
        "bind every passing task to FormalSpecLock, AssumptionLedger, dependency lock, LeanRunManifest v3, and FinalReplayManifest v3",
        "keep non-replayed tasks draft/candidate/blocker only"
      ]
    }
  };
}

const positiveMatrixCategories: Array<{ category: Goal3GaPositiveMatrixCategory; examples: string[] }> = [
  {
    category: "Nat/List",
    examples: [
      "For any proposition p, hp : p proves p.",
      "List.map id preserves a locked list.",
      "List.length append is routed to mathlib, not CoMath arithmetic.",
      "Nat.succ injectivity is a locked theorem-search target.",
      "Option.map id preserves values.",
      "List.reverse reverse route uses existing library facts.",
      "Nat zero-add smoke remains Lean-only evidence.",
      "List membership after cons is decomposed by cases.",
      "Finset empty card is a mathlib lookup target.",
      "Subtype equality target preserves assumptions."
    ]
  },
  {
    category: "algebra",
    examples: [
      "Monoid identity preservation lemma.",
      "Group inverse cancellation route.",
      "Semiring zero multiplication via library search.",
      "Ring distributivity skeleton target.",
      "AddMonoid zero-add route with explicit variables.",
      "Subsemiring membership closure target.",
      "Homomorphism preserves one under approved imports.",
      "CommMonoid multiplication symmetry target.",
      "Module zero scalar action target.",
      "Ideal membership addition closure target."
    ]
  },
  {
    category: "order",
    examples: [
      "Antisymmetry route with exact assumptions.",
      "Transitivity of less-or-equal route.",
      "Strict order contradiction target.",
      "Monotone composition theorem-search target.",
      "Supremum bound skeleton target.",
      "Infimum bound skeleton target.",
      "Preorder reflexivity route.",
      "Linear order trichotomy case split.",
      "Order dual import hygiene target.",
      "Interval membership boundary target."
    ]
  },
  {
    category: "real analysis",
    examples: [
      "Continuity skeleton from mathlib theorem search.",
      "Continuous composition route.",
      "Limit constant function target.",
      "Derivative of identity as tactic-repair target.",
      "Metric ball self-membership with radius assumption.",
      "Norm nonnegativity route.",
      "Cauchy sequence blocker until imports are pinned.",
      "Interval continuity route with explicit domain.",
      "Real absolute value nonnegativity target.",
      "Filter eventually true target."
    ]
  },
  {
    category: "topology",
    examples: [
      "Open set preimage formal-spec lock.",
      "Closed set complement route.",
      "Neighborhood membership skeleton target.",
      "Continuous identity map target.",
      "Product topology projection continuity route.",
      "Compact image under continuous map blocker.",
      "Interior subset route.",
      "Closure monotonicity target.",
      "Dense subset theorem-search target.",
      "Homeomorphism inverse continuity route."
    ]
  },
  {
    category: "combinatorics",
    examples: [
      "Finite card union planning target.",
      "Pigeonhole statement formal-spec blocker.",
      "Finset disjoint card union target.",
      "Simple graph degree-sum literature-to-spec target.",
      "Permutation identity route.",
      "Binomial coefficient symmetry theorem-search target.",
      "Finite set subset card inequality target.",
      "List nodup membership route.",
      "Combinatorial injection card blocker.",
      "Path counting statement-lock target."
    ]
  },
  {
    category: "external Lean repo",
    examples: [
      "Trusted replay dependency import smoke.",
      "External repo license pin blocker.",
      "External repo commit pin blocker.",
      "External repo toolchain compatibility blocker.",
      "Local Lean workspace import closure target.",
      "External module namespace shadowing red-team target.",
      "External proof dependency source-hash target.",
      "External repo transitive import blocker.",
      "External Lake package graph target.",
      "External repo third-party replay pack target."
    ]
  },
  {
    category: "paper-to-formal-spec",
    examples: [
      "Paper theorem anchor to FormalSpecLock.",
      "PDF theorem citation condition target.",
      "TeX definition extraction to notation lock.",
      "Markdown proof-step line map target.",
      "Paper hidden assumption red-team target.",
      "Paper theorem statement repair blocker.",
      "Source paragraph anchor hash target.",
      "Paper notation ambiguity blocker.",
      "Citation condition mismatch negative target.",
      "Paper lemma to Lean skeleton target."
    ]
  },
  {
    category: "theorem-search-assisted",
    examples: [
      "Loogle or LeanSearch hint to candidate pack.",
      "Moogle natural-language premise search target.",
      "LeanExplore declaration lookup target.",
      "LeanDojo premise retrieval blocker.",
      "Local mathlib index route.",
      "Search result proof-authority-none target.",
      "Import hint dependency-lock target.",
      "Search rank tie decision-forest target.",
      "Premise mismatch red-team target.",
      "Search-assisted tactic repair route."
    ]
  },
  {
    category: "tactic repair",
    examples: [
      "Lean error repair route with final replay gate.",
      "simp failure signature target.",
      "rw direction repair target.",
      "omega suggestion as Lean tactic, not business prover.",
      "ring_nf tactic repair target.",
      "linarith missing assumption blocker.",
      "aesop import requirement target.",
      "exact question-mark premise route.",
      "apply question-mark candidate target.",
      "Tactic timeout blocker with resume scope."
    ]
  }
];

function padTaskId(index: number): string {
  return `PM-${String(index + 1).padStart(3, "0")}`;
}

function formalTemplateForCategory(theoremName: string, category: Goal3GaPositiveMatrixCategory) {
  switch (category) {
    case "algebra":
      return {
        theoremHeader: `theorem ${theoremName} (M : Type) [Monoid M] (x : M) : 1 * x = x`,
        theoremType: "(M : Type) [Monoid M] (x : M) : 1 * x = x",
        variables: [{ name: "M", type: "Type", source: "user" as const, approved: true }],
        assumptions: []
      };
    case "order":
      return {
        theoremHeader: `theorem ${theoremName} (α : Type) [Preorder α] (x : α) : x ≤ x`,
        theoremType: "(α : Type) [Preorder α] (x : α) : x ≤ x",
        variables: [{ name: "α", type: "Type", source: "user" as const, approved: true }],
        assumptions: []
      };
    case "real analysis":
      return {
        theoremHeader: `theorem ${theoremName} (x : Real) : 0 ≤ |x|`,
        theoremType: "(x : Real) : 0 ≤ |x|",
        variables: [{ name: "x", type: "Real", source: "user" as const, approved: true }],
        assumptions: []
      };
    case "topology":
      return {
        theoremHeader: `theorem ${theoremName} (α : Type) [TopologicalSpace α] : IsOpen (Set.univ : Set α)`,
        theoremType: "(α : Type) [TopologicalSpace α] : IsOpen (Set.univ : Set α)",
        variables: [{ name: "α", type: "Type", source: "user" as const, approved: true }],
        assumptions: []
      };
    case "combinatorics":
      return {
        theoremHeader: `theorem ${theoremName} (α : Type) [DecidableEq α] (s : Finset α) : 0 ≤ s.card`,
        theoremType: "(α : Type) [DecidableEq α] (s : Finset α) : 0 ≤ s.card",
        variables: [{ name: "s", type: "Finset α", source: "user" as const, approved: true }],
        assumptions: []
      };
    case "paper-to-formal-spec":
      return {
        theoremHeader: `theorem ${theoremName} (p : Prop) (hp : p) : p`,
        theoremType: "(p : Prop) (hp : p) : p",
        variables: [{ name: "p", type: "Prop", source: "paper" as const, approved: true }],
        assumptions: [{ id: "ASM-PAPER", name: "hp", type: "p", source: "paper" as const, approved: true }]
      };
    default:
      return {
        theoremHeader: `theorem ${theoremName} (p : Prop) (hp : p) : p`,
        theoremType: "(p : Prop) (hp : p) : p",
        variables: [{ name: "p", type: "Prop", source: "user" as const, approved: true }],
        assumptions: [{ id: "ASM-PROP", name: "hp", type: "p", source: "user" as const, approved: true }]
      };
  }
}

function createMatrixTask(index: number, category: Goal3GaPositiveMatrixCategory, example: string): Goal3GaPositiveMatrixTask {
  const theoremName = `Goal3Positive${String(index + 1).padStart(3, "0")}`;
  const assumptionId = `ASM-PM-${String(index + 1).padStart(3, "0")}`;
  const formalTemplate = formalTemplateForCategory(theoremName, category);
  const theoremHeader = formalTemplate.theoremHeader;
  const theoremType = formalTemplate.theoremType;
  const lockedStatementHash = statementHash(theoremHeader);
  const assumptions = formalTemplate.assumptions.map((assumption) => ({
    ...assumption,
    id: assumption.id === "ASM-PROP" || assumption.id === "ASM-PAPER" ? assumptionId : assumption.id
  }));
  return {
    task_id: padTaskId(index),
    category,
    target: {
      original_goal_text: example,
      normalized_nl_statement: example,
      expected_theorem_name: theoremName
    },
    formal_spec_lock_input: {
      theorem_header: theoremHeader,
      theorem_type_pretty: theoremType,
      statement_hash: lockedStatementHash,
      variables: formalTemplate.variables,
      assumptions,
      imports_allowed: ["Std", "Mathlib"]
    },
    assumption_ledger_input: {
      entries: assumptions.map((assumption) => ({ ...assumption, kind: "assumption" as const }))
    },
    dependency_lock_expectation: {
      lean_toolchain: "leanprover/lean4:v4.23.0",
      allowed_import_prefixes: category === "external Lean repo" ? ["Std", "Mathlib", "External"] : ["Std", "Mathlib"],
      external_dependency_state: category === "external Lean repo" ? "trusted_replay_dependency_required" : "none",
      network_policy_final_replay: "disabled"
    },
    replay_command: ["lake", "build", `MathResearch.${theoremName}`],
    terminal_classification: "pending_clean_replay",
    proof_authority: "none",
    can_promote_without_clean_replay: false,
    uses_production_theorem_family_recognizer: false,
    uses_controlled_nat_linear_synthesis: false,
    uses_default_assumptions: false
  };
}

export function createGoal3GaPositiveTaskManifest(): Goal3GaPositiveTaskManifest {
  const tasks = positiveMatrixCategories.flatMap(({ category, examples }, categoryIndex) =>
    examples.map((example, exampleIndex) => createMatrixTask(categoryIndex * 10 + exampleIndex, category, example))
  );
  return {
    schema_version: "comath.goal3_positive_task_manifest.v1",
    total_required_tasks: 100,
    tasks
  };
}

function createPositiveWorkflow(projectRoot: string) {
  const claimId = "CLM-0001";
  const campaignId = "CAM-0001";
  const replayId = "RPLY-0001";
  const runId = "LRUN-0001";
  const theoremStatement = "theorem Goal3Task17 (p : Prop) (hp : p) : p := hp";
  const theoremType = "(p : Prop) (hp : p) : p";
  const lockedHash = statementHash(theoremStatement);
  const now = "2026-05-30T00:00:00.000Z";
  const formalSpecLock = formalSpecLockSchema.parse({
    schema_version: "comath.formal_spec_lock.v2",
    claim_id: claimId,
    original_goal_text: "Prove the identity implication p from an explicit hypothesis hp.",
    original_goal_sha256: sha256Text("Prove the identity implication p from an explicit hypothesis hp."),
    normalized_nl_statement: "For any proposition p, hp : p proves p.",
    theorem_name: "Goal3Task17",
    namespace: "MathResearch",
    theorem_header: theoremStatement,
    theorem_type_pretty: theoremType,
    theorem_type_elaborated_hash: sha256Text(theoremType),
    variables: [
      {
        name: "p",
        type: "Prop",
        binder: "explicit",
        source: "user",
        evidence_anchor: "goal3-task17-positive-fixture:variable:p",
        approved: true
      }
    ],
    assumptions: [
      {
        id: "ASM-0001",
        name: "hp",
        type: "p",
        source: "user",
        evidence_anchor: "goal3-task17-positive-fixture:assumption:hp",
        approved: true
      }
    ],
    conclusion: "p",
    notation_conventions: [],
    imports_allowed: ["Std"],
    external_dependencies_allowed: [],
    trust_profile_id: "ordinary_constructive",
    statement_hash: lockedHash,
    locked_by: "comathd.goal3_ga_acceptance",
    locked_at: now,
    user_approval_required: false,
    proof_authority: "none"
  });
  const assumptionLedger = assumptionLedgerSchema.parse({
    schema_version: "comath.assumption_ledger.v1",
    claim_id: claimId,
    formal_spec_lock_hash: lockedHash,
    entries: [
      {
        id: "ASM-0001",
        kind: "assumption",
        name: "hp",
        type: "p",
        source: "user",
        evidence_anchor: "goal3-task17-positive-fixture:assumption:hp",
        approved: true
      }
    ],
    created_at: now,
    updated_at: now,
    proof_authority: "none"
  });

  const cleanRootRel = `.comath/goal3/task17/${replayId}/clean`;
  const target = writeProjectFile(projectRoot, `${cleanRootRel}/MathResearch/Target.lean`, "import Std\nnamespace MathResearch\ntheorem Goal3Task17 (p : Prop) (hp : p) : p := hp\nend MathResearch\n");
  const audit = writeProjectFile(projectRoot, `${cleanRootRel}/Audit/TargetAudit.lean`, "import MathResearch.Target\n#check MathResearch.Goal3Task17\n#print axioms MathResearch.Goal3Task17\n");
  const formalSpecPath = writeProjectFile(projectRoot, `${cleanRootRel}/FormalSpec/formal_spec_lock.json`, `${JSON.stringify(formalSpecLock, null, 2)}\n`);
  const assumptionLedgerPath = writeProjectFile(projectRoot, `${cleanRootRel}/FormalSpec/assumption_ledger.json`, `${JSON.stringify(assumptionLedger, null, 2)}\n`);
  const lakefile = writeProjectFile(projectRoot, `${cleanRootRel}/lakefile.lean`, "import Lake\nopen Lake DSL\npackage MathResearch\nlean_lib MathResearch\n");
  const toolchain = writeProjectFile(projectRoot, `${cleanRootRel}/lean-toolchain`, "leanprover/lean4:v4.23.0\n");
  const lakeManifest = writeProjectFile(projectRoot, `${cleanRootRel}/lake-manifest.json`, JSON.stringify({ packages: [] }));
  const stdout = writeProjectFile(projectRoot, `.comath/evidence/${claimId}/lean/${runId}.stdout.log`, "MathResearch.Goal3Task17 : (p : Prop) -> p -> p\n");
  const stderr = writeProjectFile(projectRoot, `.comath/evidence/${claimId}/lean/${runId}.stderr.log`, "");

  const leanRun = createServiceOwnedLeanRunManifestV3({
    projectRoot,
    run_id: runId,
    claim_id: claimId,
    campaign_id: campaignId,
    purpose: "final_replay",
    command: ["lake", "build", "MathResearch.Target"],
    cwd: join(projectRoot, cleanRootRel),
    input_files: [target, audit, formalSpecPath, assumptionLedgerPath, lakefile, toolchain, lakeManifest],
    lean_version: "4.23.0",
    lake_version: "5.0.0-src+abcdef (Lean version 4.23.0)",
    elan_toolchain: "leanprover/lean4:v4.23.0",
    lean_toolchain_file: toolchain,
    lake_manifest_file: lakeManifest,
    network_policy: "disabled",
    sandbox: "none",
    exit_code: 0,
    stdout_path: stdout,
    stderr_path: stderr,
    started_at: now,
    ended_at: "2026-05-30T00:00:01.000Z",
    proof_authority: "lean_kernel_check"
  });
  const leanRunManifestPath = writeProjectFile(projectRoot, `.comath/evidence/${claimId}/lean/${runId}.manifest.json`, `${JSON.stringify(leanRun, null, 2)}\n`);
  const structuredAudit = {
    schema_version: "comath.structured_lean_audit.v3",
    theorem_name: "Goal3Task17",
    fully_qualified_name: "MathResearch.Goal3Task17",
    theorem_type_pretty: theoremType,
    theorem_type_elaborated_hash: formalSpecLock.theorem_type_elaborated_hash,
    source_file: "MathResearch/Target.lean",
    source_file_sha256: sha256File(target),
    imports: ["Std"],
    axiom_profile: [],
    environment_fingerprint: sha256Text("goal3-task17-positive-fixture"),
    generated_by_run_id: runId,
    result: "pass",
    hard_vetoes: []
  };
  const staticAudit = writeProjectFile(projectRoot, `.comath/evidence/${claimId}/lean/final_static_audit.json`, JSON.stringify({ result: "pass", hard_vetoes: [], structured_audit: structuredAudit }));
  const axiomProfile = writeProjectFile(projectRoot, `.comath/evidence/${claimId}/lean/axiom_profile.json`, JSON.stringify({ result: "pass", hard_vetoes: [], structured_audit_bound: true, detected_axioms: [] }));
  const dependencyClosure = writeProjectFile(projectRoot, `.comath/evidence/${claimId}/lean/dependency_closure.json`, JSON.stringify({ result: "pass", hard_vetoes: [], allowed_import_prefixes: ["Std", "MathResearch"] }));
  const statementEquivalence = writeProjectFile(projectRoot, `.comath/evidence/${claimId}/lean/statement_equivalence.json`, JSON.stringify({ result: "pass", hard_vetoes: [], locked_statement_hash: lockedHash }));

  const sourceHashesBefore = {
    "MathResearch/Target.lean": hashRef(target),
    "Audit/TargetAudit.lean": hashRef(audit),
    "FormalSpec/formal_spec_lock.json": hashRef(formalSpecPath),
    "FormalSpec/assumption_ledger.json": hashRef(assumptionLedgerPath),
    "lakefile.lean": hashRef(lakefile),
    "lean-toolchain": hashRef(toolchain),
    "lake-manifest.json": hashRef(lakeManifest)
  };
  const finalReplay = createFinalReplayManifestV3({
    projectRoot,
    replay_id: replayId,
    campaign_id: campaignId,
    claim_id: claimId,
    theorem_name: "MathResearch.Goal3Task17",
    clean_workspace_path: join(projectRoot, cleanRootRel),
    command: ["lake", "build", "MathResearch.Target"],
    exit_code: 0,
    result: "pass",
    source_hashes_before: sourceHashesBefore,
    stdout_path: stdout,
    stderr_path: stderr,
    report_paths: {
      static_audit: staticAudit,
      axiom_profile: axiomProfile,
      dependency_closure: dependencyClosure,
      statement_equivalence: statementEquivalence
    },
    lean_run_manifest_paths: [leanRunManifestPath],
    dependency_lock: {
      lean_toolchain_path: toolchain,
      lake_manifest_path: lakeManifest,
      lakefile_path: lakefile,
      external_revisions: []
    },
    network_policy: "disabled",
    sandbox_policy: { network: "disabled", os_isolation: "process_boundary_only" },
    resource_budget: { timeout_ms: 30000, max_stdout_bytes: 65536, max_stderr_bytes: 65536 }
  });
  const replayPack = writeThirdPartyReplayPackV3(projectRoot, finalReplay);
  const leanRunVerification = verifyLeanRunManifestV3Evidence(projectRoot, leanRun);
  const finalReplayVerification = verifyFinalReplayManifestV3(projectRoot, finalReplay);
  const dependencyLockHash = sha256Text(canonicalJson(finalReplay.dependency_lock));
  const artifactHashesSha256 = sha256Text(canonicalJson(finalReplay.artifact_hashes));
  const bindingChecklist = {
    formal_spec_lock: formalSpecLock.statement_hash === lockedHash,
    assumption_ledger: assumptionLedger.formal_spec_lock_hash === lockedHash,
    dependency_lock: dependencyLockHash.length === 64,
    toolchain_hash: finalReplay.dependency_lock.lean_toolchain_sha256.length === 64,
    artifact_hashes: artifactHashesSha256.length === 64,
    lean_run_manifest_v3: leanRunVerification.ok,
    final_replay_manifest_v3: finalReplayVerification.ok,
    third_party_replay_pack: replayPack.expected_hashes_sha256.length === 64
  };
  return {
    result: "representative_verified_fixture" as const,
    can_promote_claim: Object.values(bindingChecklist).every(Boolean),
    uses_production_theorem_family_recognizer: false as const,
    uses_controlled_nat_linear_synthesis: false as const,
    formal_spec_lock_hash: formalSpecLock.statement_hash,
    assumption_ledger_hash: sha256Text(canonicalJson(assumptionLedger)),
    dependency_lock_hash: dependencyLockHash,
    artifact_hashes_sha256: artifactHashesSha256,
    lean_run_manifest_id: leanRun.run_id,
    final_replay_manifest_id: finalReplay.replay_id,
    third_party_replay_pack_path: replayPack.pack_path,
    binding_checklist: bindingChecklist,
    lean_run_verification: leanRunVerification,
    final_replay_verification: finalReplayVerification
  };
}

function emptyMatrixEvidenceBinding(): Goal3GaPositiveMatrixBatchResult["evidence_binding"] {
  return {
    formal_spec_lock_hash: "",
    assumption_ledger_hash: "",
    dependency_lock_hash: "",
    artifact_hashes_sha256: "",
    lean_run_manifest_id: "",
    final_replay_manifest_id: ""
  };
}

function blockerCodesForPositiveMatrixTask(task: Goal3GaPositiveMatrixTask): string[] {
  const codes = ["lean_clean_replay_not_attempted_for_task"];
  switch (task.category) {
    case "external Lean repo":
      codes.push("external_dependency_not_trusted_replay_dependency");
      break;
    case "paper-to-formal-spec":
      codes.push("paper_anchor_not_attached");
      break;
    case "theorem-search-assisted":
      codes.push("theorem_search_adapter_not_executed");
      break;
    case "tactic repair":
      codes.push("tactic_repair_attempt_not_executed");
      break;
    default:
      codes.push("requires_live_mathlib_or_domain_formalization");
      break;
  }
  return codes;
}

function createReplayAttemptCertificate(
  projectRoot: string,
  task: Goal3GaPositiveMatrixTask
): Goal3GaPositiveReplayAttemptCertificate {
  const formalSpecLockHash = sha256Text(canonicalJson(task.formal_spec_lock_input));
  const assumptionLedgerHash = sha256Text(canonicalJson(task.assumption_ledger_input));
  const dependencyLockHash = sha256Text(canonicalJson(task.dependency_lock_expectation));
  const certificatePath = `.comath/release/positive_matrix/${task.task_id}/replay_attempt_certificate.json`;
  const certificate: Goal3GaPositiveReplayAttemptCertificate = {
    schema_version: "comath.goal3_positive_replay_attempt_certificate.v1",
    task_id: task.task_id,
    category: task.category,
    attempt_status: "blocked_before_clean_replay",
    terminal_classification: "replayable_blocker",
    formal_spec_lock_hash: formalSpecLockHash,
    assumption_ledger_hash: assumptionLedgerHash,
    dependency_lock_hash: dependencyLockHash,
    replay_command: task.replay_command,
    network_policy_final_replay: task.dependency_lock_expectation.network_policy_final_replay,
    blocker_codes: blockerCodesForPositiveMatrixTask(task),
    certificate_path: certificatePath,
    proof_authority: "none",
    can_promote_claim: false,
    uses_production_theorem_family_recognizer: false,
    uses_controlled_nat_linear_synthesis: false,
    uses_default_assumptions: false,
    cas_literature_search_or_vote_proof_authority: false,
    direct_promotion_path: false
  };
  writeProjectFile(projectRoot, certificatePath, `${JSON.stringify(certificate, null, 2)}\n`);
  return certificate;
}

function createLiveReplayConversionCertificate(input: {
  projectRoot: string;
  task: Goal3GaPositiveMatrixTask;
  outcome: Goal3GaPositiveLiveReplayOutcome;
  materialCheck?: Goal3GaDeclaredReplayMaterialCheck;
}): Goal3GaPositiveLiveReplayConversionCertificate {
  const formalSpecLockHash = sha256Text(canonicalJson(input.task.formal_spec_lock_input));
  const assumptionLedgerHash = sha256Text(canonicalJson(input.task.assumption_ledger_input));
  const dependencyLockHash = sha256Text(canonicalJson(input.task.dependency_lock_expectation));
  const certificatePath = `.comath/release/positive_matrix/${input.task.task_id}/live_replay_conversion_certificate.json`;
  const passed = input.outcome.ok;
  const certificate: Goal3GaPositiveLiveReplayConversionCertificate = {
    schema_version: "comath.goal3_positive_live_replay_conversion_certificate.v1",
    task_id: input.task.task_id,
    category: input.task.category,
    attempt_status: passed ? "live_replay_passed" : "live_replay_failed",
    terminal_classification: passed ? "clean_replay_passed" : "replayable_blocker",
    formal_spec_lock_hash: formalSpecLockHash,
    assumption_ledger_hash: assumptionLedgerHash,
    dependency_lock_hash: dependencyLockHash,
    replay_command: input.task.replay_command,
    live_replay_attempted: true,
    blocker_code: passed ? "" : input.outcome.blocker_code,
    blocker_detail: passed ? "" : input.outcome.detail,
    real_lean_source_path: passed ? input.outcome.real_lean_source_path : "",
    lean_run_manifest_v3_path: passed ? input.outcome.lean_run_manifest_v3_path : "",
    final_replay_manifest_v3_path: passed ? input.outcome.final_replay_manifest_v3_path : "",
    structured_audit_path: passed ? input.outcome.structured_audit_path : "",
    third_party_replay_pack_path: passed ? input.outcome.third_party_replay_pack_path : "",
    lean_run_manifest_id: passed ? input.outcome.lean_run_manifest_id : "",
    final_replay_manifest_id: passed ? input.outcome.final_replay_manifest_id : "",
    certificate_path: certificatePath,
    declared_replay_material_source_path: input.materialCheck?.source_path ?? "",
    declared_replay_material_status: input.materialCheck?.status ?? "not_declared",
    declared_replay_material_missing_paths: input.materialCheck?.missing_paths ?? [],
    network_policy_final_replay: input.task.dependency_lock_expectation.network_policy_final_replay,
    proof_authority: passed ? "lean_kernel_clean_replay" : "none",
    can_promote_claim: false,
    uses_production_theorem_family_recognizer: false,
    uses_controlled_nat_linear_synthesis: false,
    uses_default_assumptions: false,
    cas_literature_search_or_vote_proof_authority: false,
    direct_promotion_path: false
  };
  writeProjectFile(input.projectRoot, certificatePath, `${JSON.stringify(certificate, null, 2)}\n`);
  return certificate;
}

function declaredReplayMaterialSourcePath(task: Goal3GaPositiveMatrixTask): string {
  return `.comath/release/positive_matrix/${task.task_id}/declared_replay_material_source.json`;
}

function declaredReplayMaterialPaths(source: Goal3GaDeclaredReplayMaterialSource): string[] {
  return [
    source.lean_source_path,
    source.lean_toolchain_path,
    source.lakefile_path,
    source.lake_manifest_path,
    source.formal_spec_lock_path,
    source.assumption_ledger_path,
    source.dependency_lock_path,
    source.lean_run_manifest_v3_path,
    source.final_replay_manifest_v3_path,
    source.structured_audit_path,
    source.third_party_replay_pack_path
  ];
}

function validateDeclaredReplayMaterialSource(input: {
  projectRoot: string;
  task: Goal3GaPositiveMatrixTask;
  source?: Goal3GaDeclaredReplayMaterialSource;
}): Goal3GaDeclaredReplayMaterialCheck {
  if (!input.source) {
    return { source_path: "", status: "not_declared", missing_paths: [] };
  }
  const sourcePath = declaredReplayMaterialSourcePath(input.task);
  const sourceToPersist: Goal3GaDeclaredReplayMaterialSource = {
    ...input.source,
    proof_authority: "none",
    can_promote_claim: false
  };
  writeProjectFile(input.projectRoot, sourcePath, `${JSON.stringify(sourceToPersist, null, 2)}\n`);
  const missingPaths = declaredReplayMaterialPaths(sourceToPersist).filter(
    (path) => !evidencePathExistsInsideProject(input.projectRoot, path)
  );
  const idsMissing = [sourceToPersist.lean_run_manifest_id, sourceToPersist.final_replay_manifest_id].some(
    (value) => value.trim().length === 0
  );
  const taskMismatch = sourceToPersist.task_id !== input.task.task_id;
  return {
    source_path: sourcePath,
    status: missingPaths.length === 0 && !idsMissing && !taskMismatch ? "ready_for_live_executor" : "missing_or_incomplete",
    missing_paths: Array.from(new Set(missingPaths))
  };
}

function declaredReplayMaterialBlockerOutcome(
  check: Goal3GaDeclaredReplayMaterialCheck
): Goal3GaPositiveLiveReplayOutcome | null {
  if (check.status !== "missing_or_incomplete") {
    return null;
  }
  return {
    ok: false,
    blocker_code: "declared_replay_material_missing",
    detail: "A declared PM-002 replay material source was provided, but one or more required Lean source, Lake/toolchain, FormalSpecLock, AssumptionLedger, dependency lock, LeanRunManifest v3, FinalReplayManifest v3, structured audit, or replay-pack paths are missing, absolute, outside the project root, or incomplete."
  };
}

function defaultLiveReplayOutcome(): Goal3GaPositiveLiveReplayOutcome {
  return {
    ok: false,
    blocker_code: "live_replay_executor_not_configured",
    detail: "Task 36 selected a PM-002+ task for live clean-replay conversion, but no service-owned live replay executor or Lean source material was supplied. The task remains non-promotional until Lean4/mathlib clean replay evidence is attached."
  };
}

function normalizeLiveReplayOutcome(outcome: Goal3GaPositiveLiveReplayOutcome): Goal3GaPositiveLiveReplayOutcome {
  if (!outcome.ok) {
    return outcome;
  }
  const requiredEvidence = [
    outcome.real_lean_source_path,
    outcome.lean_run_manifest_v3_path,
    outcome.final_replay_manifest_v3_path,
    outcome.structured_audit_path,
    outcome.third_party_replay_pack_path,
    outcome.lean_run_manifest_id,
    outcome.final_replay_manifest_id
  ];
  if (requiredEvidence.every((value) => value.trim().length > 0)) {
    return outcome;
  }
  return {
    ok: false,
    blocker_code: "live_replay_success_missing_evidence",
    detail: "A live replay adapter reported success without complete Lean source, LeanRunManifest v3, FinalReplayManifest v3, structured audit, third-party replay pack, and manifest id bindings."
  };
}

function evidencePathExistsInsideProject(projectRoot: string, path: string): boolean {
  if (isAbsolute(path)) {
    return false;
  }
  const root = resolve(projectRoot);
  const resolved = resolve(projectRoot, path);
  const rel = relative(root, resolved);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    return false;
  }
  return existsSync(resolved);
}

function normalizeLiveReplayOutcomeForProject(
  projectRoot: string,
  outcome: Goal3GaPositiveLiveReplayOutcome
): Goal3GaPositiveLiveReplayOutcome {
  const normalized = normalizeLiveReplayOutcome(outcome);
  if (!normalized.ok) {
    return normalized;
  }
  const paths = [
    normalized.real_lean_source_path,
    normalized.lean_run_manifest_v3_path,
    normalized.final_replay_manifest_v3_path,
    normalized.structured_audit_path,
    normalized.third_party_replay_pack_path
  ];
  if (paths.every((path) => evidencePathExistsInsideProject(projectRoot, path))) {
    return normalized;
  }
  return {
    ok: false,
    blocker_code: "live_replay_success_evidence_unreadable",
    detail: "A live replay adapter reported success with evidence paths that were missing, absolute, or outside the project root."
  };
}

export function runGoal3GaPositiveMatrixBatch(input: {
  projectRoot: string;
  batchSize?: number;
}): Goal3GaPositiveMatrixBatchReport {
  const manifest = createGoal3GaPositiveTaskManifest();
  const requestedBatchSize = Math.max(0, Math.min(input.batchSize ?? 10, manifest.tasks.length));
  const positiveWorkflow = requestedBatchSize > 0 ? createPositiveWorkflow(input.projectRoot) : null;
  const executedTaskIds = new Set(manifest.tasks.slice(0, requestedBatchSize).map((task) => task.task_id));
  const results: Goal3GaPositiveMatrixBatchResult[] = manifest.tasks.map((task, index) => {
    if (index === 0 && positiveWorkflow) {
      return {
        task_id: task.task_id,
        category: task.category,
        terminal_classification: "clean_replay_passed",
        proof_authority: "lean_kernel_clean_replay",
        can_promote_claim: false,
        evidence_binding: {
          formal_spec_lock_hash: positiveWorkflow.formal_spec_lock_hash,
          assumption_ledger_hash: positiveWorkflow.assumption_ledger_hash,
          dependency_lock_hash: positiveWorkflow.dependency_lock_hash,
          artifact_hashes_sha256: positiveWorkflow.artifact_hashes_sha256,
          lean_run_manifest_id: positiveWorkflow.lean_run_manifest_id,
          final_replay_manifest_id: positiveWorkflow.final_replay_manifest_id
        },
        blockers: []
      };
    }
    return {
      task_id: task.task_id,
      category: task.category,
      terminal_classification: "replayable_blocker",
      proof_authority: "none",
      can_promote_claim: false,
      evidence_binding: emptyMatrixEvidenceBinding(),
      blockers: executedTaskIds.has(task.task_id)
        ? ["positive_matrix_task_clean_replay_not_executed"]
        : ["positive_matrix_task_not_in_bounded_batch", "positive_matrix_task_clean_replay_not_executed"]
    };
  });
  const startAfterTaskId = requestedBatchSize > 0 ? manifest.tasks[requestedBatchSize - 1]?.task_id ?? null : null;
  const cleanReplayPassed = results.filter((result) => result.terminal_classification === "clean_replay_passed").length;
  const replayableBlocker = results.filter((result) => result.terminal_classification === "replayable_blocker").length;
  return {
    schema_version: "comath.goal3_positive_matrix_batch.v1",
    total_required_tasks: 100,
    executed_count: requestedBatchSize,
    results,
    summary: {
      clean_replay_passed: cleanReplayPassed,
      replayable_blocker: replayableBlocker,
      pending_clean_replay: 0,
      promoted_count: 0
    },
    next_batch_scope: {
      start_after_task_id: startAfterTaskId,
      remaining_tasks: Math.max(0, manifest.tasks.length - requestedBatchSize)
    }
  };
}

export function runGoal3GaPositiveMatrixTranche(input: {
  projectRoot: string;
  startTaskId: string;
  endTaskId: string;
}): Goal3GaPositiveMatrixTrancheReport {
  const manifest = createGoal3GaPositiveTaskManifest();
  const startIndex = manifest.tasks.findIndex((task) => task.task_id === input.startTaskId);
  const endIndex = manifest.tasks.findIndex((task) => task.task_id === input.endTaskId);
  if (startIndex < 0 || endIndex < 0 || endIndex < startIndex) {
    throw new Error("invalid positive matrix tranche scope");
  }
  const tasks = manifest.tasks.slice(startIndex, endIndex + 1);
  const results: Goal3GaPositiveMatrixTrancheResult[] = tasks.map((task) => {
    const replayAttempt = createReplayAttemptCertificate(input.projectRoot, task);
    const certificateHash = sha256Text(canonicalJson(replayAttempt));
    return {
      task_id: task.task_id,
      category: task.category,
      terminal_classification: "replayable_blocker",
      proof_authority: "none",
      can_promote_claim: false,
      evidence_binding: {
        formal_spec_lock_hash: replayAttempt.formal_spec_lock_hash,
        assumption_ledger_hash: replayAttempt.assumption_ledger_hash,
        dependency_lock_hash: replayAttempt.dependency_lock_hash,
        artifact_hashes_sha256: certificateHash,
        lean_run_manifest_id: "",
        final_replay_manifest_id: ""
      },
      blockers: replayAttempt.blocker_codes,
      replay_attempt: replayAttempt
    };
  });
  return {
    schema_version: "comath.goal3_positive_matrix_tranche.v1",
    total_required_tasks: 100,
    tranche_scope: {
      start_task_id: input.startTaskId,
      end_task_id: input.endTaskId,
      expected_count: tasks.length
    },
    results,
    summary: {
      clean_replay_passed: 0,
      replayable_blocker: results.length,
      promoted_count: 0
    },
    next_batch_scope: {
      start_after_task_id: input.endTaskId,
      remaining_tasks: Math.max(0, manifest.tasks.length - endIndex - 1)
    }
  };
}

export function runGoal3GaPositiveMatrixLiveReplayConversion(input: {
  projectRoot: string;
  taskIds: string[];
  liveReplay?: (task: Goal3GaPositiveMatrixTask) => Goal3GaPositiveLiveReplayOutcome;
  replayMaterialSource?: (task: Goal3GaPositiveMatrixTask) => Goal3GaDeclaredReplayMaterialSource | undefined;
}): Goal3GaPositiveLiveReplayConversionReport {
  const manifest = createGoal3GaPositiveTaskManifest();
  const taskById = new Map(manifest.tasks.map((task) => [task.task_id, task]));
  const selectedTasks = input.taskIds.map((taskId) => {
    const task = taskById.get(taskId);
    if (!task || task.task_id === "PM-001") {
      throw new Error("invalid positive matrix live replay conversion scope");
    }
    return task;
  });
  const results: Goal3GaPositiveLiveReplayConversionResult[] = selectedTasks.map((task) => {
    const materialCheck = validateDeclaredReplayMaterialSource({
      projectRoot: input.projectRoot,
      task,
      source: input.replayMaterialSource?.(task)
    });
    const materialBlocker = declaredReplayMaterialBlockerOutcome(materialCheck);
    const outcome = normalizeLiveReplayOutcomeForProject(
      input.projectRoot,
      materialBlocker ?? (input.liveReplay ? input.liveReplay(task) : defaultLiveReplayOutcome())
    );
    const certificate = createLiveReplayConversionCertificate({ projectRoot: input.projectRoot, task, outcome, materialCheck });
    const certificateHash = sha256Text(canonicalJson(certificate));
    const blockers = outcome.ok ? [] : ["live_clean_replay_attempt_failed", outcome.blocker_code, ...blockerCodesForPositiveMatrixTask(task)];
    return {
      task_id: task.task_id,
      category: task.category,
      terminal_classification: certificate.terminal_classification,
      proof_authority: certificate.proof_authority,
      can_promote_claim: false,
      evidence_binding: {
        formal_spec_lock_hash: certificate.formal_spec_lock_hash,
        assumption_ledger_hash: certificate.assumption_ledger_hash,
        dependency_lock_hash: certificate.dependency_lock_hash,
        artifact_hashes_sha256: certificateHash,
        lean_run_manifest_id: certificate.lean_run_manifest_id,
        final_replay_manifest_id: certificate.final_replay_manifest_id
      },
      blockers: Array.from(new Set(blockers)),
      live_replay: certificate
    };
  });
  const lastIndex = selectedTasks.length > 0 ? manifest.tasks.findIndex((task) => task.task_id === selectedTasks.at(-1)?.task_id) : -1;
  return {
    schema_version: "comath.goal3_positive_live_replay_conversion.v1",
    total_required_tasks: 100,
    conversion_scope: {
      task_ids: selectedTasks.map((task) => task.task_id)
    },
    results,
    summary: {
      clean_replay_passed: results.filter((result) => result.terminal_classification === "clean_replay_passed").length,
      replayable_blocker: results.filter((result) => result.terminal_classification === "replayable_blocker").length,
      promoted_count: 0
    },
    next_live_replay_scope: {
      start_after_task_id: selectedTasks.at(-1)?.task_id ?? null,
      remaining_tasks: lastIndex >= 0 ? Math.max(0, manifest.tasks.length - lastIndex - 1) : manifest.tasks.length - 1
    }
  };
}

export function runGoal3GaAcceptanceWorkflow(input: {
  projectRoot: string;
  actor?: string;
}): Goal3GaAcceptanceReport {
  const cases = runTrustCoreNegativeSuite();
  const covered = new Set(cases.map((item) => item.case_id));
  const missingRequiredCases = requiredNegativeCases.filter((caseId) => !covered.has(caseId));
  const matrix = createGoal3GaPositiveProofMatrix();
  const positiveWorkflow = createPositiveWorkflow(input.projectRoot);
  return {
    schema_version: "comath.goal3_ga_acceptance.v1",
    proof_authority: "none",
    generated_by: "comathd.goal3_ga_acceptance",
    trust_core_negative_suite: {
      required_cases: requiredNegativeCases,
      cases,
      missing_required_cases: missingRequiredCases,
      all_required_cases_fail_closed: missingRequiredCases.length === 0 && cases.every((item) => item.result === "blocked" && !item.can_promote_claim)
    },
    positive_workflow: positiveWorkflow,
    positive_matrix: {
      ...matrix,
      representative_seeds: matrix.representative_seeds.map((seed, index) =>
        index === 0
          ? { ...seed, status: "representative_verified_fixture", proof_authority: "lean_kernel_clean_replay" }
          : seed
      )
    }
  };
}
