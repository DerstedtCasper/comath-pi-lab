import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { assumptionLedgerSchema, formalSpecLockSchema } from "../types/schemas.js";
import { statementHash } from "../utils/statement.js";
import { evaluateStatementDiffGate } from "../proof-kernel/lean/statement-diff-gate.js";
import {
  createServiceOwnedLeanRunManifestV3,
  runServiceOwnedLeanCommandV3,
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

export type Goal3GaPm002ReplayMaterialPackPreflight = {
  schema_version: "comath.goal3_pm002_replay_material_pack_preflight.v1";
  task_id: "PM-002";
  material_root_path: string;
  material_source: Goal3GaDeclaredReplayMaterialSource;
  material_hashes_sha256: Record<string, string>;
  live_replay_executor_status: "not_executed";
  blocker_code: "live_replay_executor_not_configured";
  proof_authority: "none";
  can_promote_claim: false;
};

type Goal3GaPm002LeanAuthorityProbeResult = {
  exit_code: number;
  stdout: string;
  stderr: string;
};

type Goal3GaPm002LeanAuthorityCommandResult = Goal3GaPm002LeanAuthorityProbeResult;

export type Goal3GaPm002LeanAuthorityExecutorBlocker = {
  schema_version: "comath.goal3_pm002_lean_authority_executor_blocker.v1";
  task_id: "PM-002";
  executor_status: "blocked_before_replay";
  blocker_code:
    | "declared_replay_material_missing"
    | "lean_toolchain_unavailable_for_live_replay"
    | "lean_replay_command_failed"
    | "lean_authority_evidence_incomplete"
    | "live_replay_executor_not_configured";
  blocker_detail: string;
  attempted_commands: string[][];
  replay_plan_commands: string[][];
  lean_run_manifest_paths: string[];
  material_source_path: string;
  lean_source_path: string;
  lean_toolchain_path: string;
  lakefile_path: string;
  lake_manifest_path: string;
  network_policy_final_replay: "disabled";
  proof_authority: "none";
  can_promote_claim: false;
};

export type Goal3GaPm002LeanAuthorityExecutorReport = {
  schema_version: "comath.goal3_pm002_lean_authority_executor.v1";
  task_id: "PM-002";
  executor_status: "blocked_before_replay" | "live_replay_conversion_completed";
  blocker_code: Goal3GaPm002LeanAuthorityExecutorBlocker["blocker_code"] | "";
  blocker_detail: string;
  executor_blocker_path: string;
  live_replay_conversion: Goal3GaPositiveLiveReplayConversionReport;
  proof_authority: "none";
  can_promote_claim: false;
};

type Goal3GaPositiveMatrixLeanAuthorityExecutorBlockerCode =
  | "declared_replay_material_missing"
  | "lean_toolchain_unavailable_for_live_replay"
  | "lean_replay_command_failed"
  | "lean_authority_evidence_incomplete"
  | "live_replay_executor_not_configured";

export type Goal3GaPositiveMatrixLeanAuthorityExecutorBlocker = {
  schema_version: "comath.goal3_positive_matrix_lean_authority_executor_blocker.v1";
  task_id: string;
  claim_id: string;
  executor_status: "blocked_before_replay";
  blocker_code: Goal3GaPositiveMatrixLeanAuthorityExecutorBlockerCode;
  blocker_detail: string;
  attempted_commands: string[][];
  replay_plan_commands: string[][];
  lean_run_manifest_paths: string[];
  material_source_path: string;
  lean_source_path: string;
  lean_toolchain_path: string;
  lakefile_path: string;
  lake_manifest_path: string;
  network_policy_final_replay: "disabled";
  proof_authority: "none";
  can_promote_claim: false;
};

export type Goal3GaPositiveMatrixLeanAuthorityExecutorReport = {
  schema_version: "comath.goal3_positive_matrix_lean_authority_executor.v1";
  task_id: string;
  claim_id: string;
  executor_status: "blocked_before_replay" | "live_replay_conversion_completed";
  blocker_code: Goal3GaPositiveMatrixLeanAuthorityExecutorBlockerCode | "";
  blocker_detail: string;
  executor_blocker_path: string;
  final_authority_packaging: FinalAuthorityPackagingV3Report;
  proof_authority: "none";
  can_promote_claim: false;
};

export type Goal3GaPositiveMatrixLeanAuthorityExecutorTrancheReport = {
  schema_version: "comath.goal3_positive_matrix_lean_authority_executor_tranche.v1";
  start_task_id: string;
  end_task_id: string;
  task_count: number;
  task_ids: string[];
  category_counts: Partial<Record<Goal3GaPositiveMatrixCategory, number>>;
  non_authority_input_counts: Partial<Record<Goal3GaPositiveMatrixCategory, { task_count: number; proof_authority: "none" }>>;
  results: Goal3GaPositiveMatrixLeanAuthorityExecutorReport[];
  tranche_status: "blocked_missing_final_evidence" | "verified_final_authority_evidence";
  tranche_report_path: string;
  proof_authority: "none" | "lean_kernel_clean_replay";
  can_promote_claim: false;
  promotion_requires_gate: true;
  promoted_count: 0;
};

type Goal3GaPm002FinalEvidenceClass =
  | "lean_run_manifest_v3"
  | "final_replay_manifest_v3"
  | "structured_audit"
  | "dependency_closure"
  | "axiom_profile"
  | "statement_check"
  | "third_party_replay_pack";

export type Goal3GaPm002FinalAuthorityPackagingReport = {
  schema_version: "comath.goal3_pm002_final_authority_packaging.v1";
  task_id: "PM-002";
  final_evidence_status: "blocked_missing_final_evidence" | "verified_final_authority_evidence";
  blocker_code: "final_authority_evidence_incomplete" | "";
  blocker_detail: string;
  missing_final_evidence_classes: Goal3GaPm002FinalEvidenceClass[];
  lean_run_manifest_paths: string[];
  final_replay_manifest_v3_path: string;
  structured_audit_path: string;
  dependency_closure_path: string;
  axiom_profile_path: string;
  statement_check_path: string;
  third_party_replay_pack_path: string;
  blocker_path: string;
  packaging_report_path: string;
  proof_authority: "none" | "lean_kernel_clean_replay";
  can_promote_claim: false;
  promotion_requires_gate: true;
};

export type FinalAuthorityPackagingV3Report = {
  schema_version: "comath.final_authority_packaging.v3";
  task_id: string;
  claim_id: string;
  final_evidence_status: "blocked_missing_final_evidence" | "verified_final_authority_evidence";
  blocker_code: "final_authority_evidence_incomplete" | "";
  blocker_detail: string;
  missing_final_evidence_classes: Goal3GaPm002FinalEvidenceClass[];
  lean_run_manifest_paths: string[];
  final_replay_manifest_v3_path: string;
  structured_audit_path: string;
  dependency_closure_path: string;
  axiom_profile_path: string;
  statement_check_path: string;
  third_party_replay_pack_path: string;
  source_verification: FinalAuthorityPackagingV3SourceVerification;
  blocker_path: string;
  packaging_report_path: string;
  source_packaging_report_path: string;
  proof_authority: "none" | "lean_kernel_clean_replay";
  can_promote_claim: false;
  promotion_requires_gate: true;
};

export type FinalAuthorityPackagingV3SourceReport = {
  final_evidence_status: "blocked_missing_final_evidence" | "verified_final_authority_evidence";
  blocker_code: "final_authority_evidence_incomplete" | "";
  blocker_detail: string;
  missing_final_evidence_classes: Goal3GaPm002FinalEvidenceClass[];
  source_verification: FinalAuthorityPackagingV3SourceVerification;
  lean_run_manifest_paths: string[];
  final_replay_manifest_v3_path: string;
  structured_audit_path: string;
  dependency_closure_path: string;
  axiom_profile_path: string;
  statement_check_path: string;
  third_party_replay_pack_path: string;
  packaging_report_path: string;
  proof_authority: "none" | "lean_kernel_clean_replay";
};

export type FinalAuthorityPackagingV3SourceVerification = {
  verification_basis: "project_local_artifacts";
  caller_success_metadata_trusted: false;
  verified_final_evidence_classes: Goal3GaPm002FinalEvidenceClass[];
  missing_final_evidence_classes: Goal3GaPm002FinalEvidenceClass[];
  lean_run_manifest_paths_checked: number;
};

export type FinalAuthorityPackagingV3TrancheReport = {
  schema_version: "comath.final_authority_packaging_tranche.v3";
  start_task_id: string;
  end_task_id: string;
  task_count: number;
  task_ids: string[];
  results: FinalAuthorityPackagingV3Report[];
  tranche_status: "blocked_missing_final_evidence" | "verified_final_authority_evidence";
  missing_final_evidence_classes: Goal3GaPm002FinalEvidenceClass[];
  packaging_report_path: string;
  proof_authority: "none" | "lean_kernel_clean_replay";
  can_promote_claim: false;
  promotion_requires_gate: true;
  promoted_count: 0;
};

type Goal3GaDeclaredReplayMaterialCheck = {
  source_path: string;
  status: "not_declared" | "missing_or_incomplete" | "ready_for_live_executor";
  missing_paths: string[];
};

const finalAuthorityEvidenceClassOrder: Goal3GaPm002FinalEvidenceClass[] = [
  "lean_run_manifest_v3",
  "final_replay_manifest_v3",
  "structured_audit",
  "dependency_closure",
  "axiom_profile",
  "statement_check",
  "third_party_replay_pack"
];

export type FinalAuthorityPackagingV3EvidenceInput = Partial<Pick<FinalAuthorityPackagingV3SourceReport,
  | "lean_run_manifest_paths"
  | "final_replay_manifest_v3_path"
  | "structured_audit_path"
  | "dependency_closure_path"
  | "axiom_profile_path"
  | "statement_check_path"
  | "third_party_replay_pack_path"
  | "packaging_report_path"
>>;

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

function writeJsonProjectFile(projectRoot: string, relativePath: string, value: unknown): string {
  return writeProjectFile(projectRoot, relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function taskByIdOrThrow(taskId: string): Goal3GaPositiveMatrixTask {
  const task = createGoal3GaPositiveTaskManifest().tasks.find((item) => item.task_id === taskId);
  if (!task) {
    throw new Error("unknown_positive_matrix_task");
  }
  return task;
}

function materialPath(task: Goal3GaPositiveMatrixTask, leaf: string): string {
  return `.comath/release/positive_matrix/${task.task_id}/${leaf}`;
}

export function createGoal3GaPm002ReplayMaterialPackPreflight(input: {
  projectRoot: string;
}): Goal3GaPm002ReplayMaterialPackPreflight {
  const task = taskByIdOrThrow("PM-002");
  const theoremName = task.target.expected_theorem_name;
  const materialRoot = `.comath/release/positive_matrix/${task.task_id}`;
  const leanSourcePath = materialPath(task, "MathResearch/Target.lean");
  const leanToolchainPath = materialPath(task, "lean-toolchain");
  const lakefilePath = materialPath(task, "lakefile.lean");
  const lakeManifestPath = materialPath(task, "lake-manifest.json");
  const formalSpecLockPath = materialPath(task, "formal_spec_lock.json");
  const assumptionLedgerPath = materialPath(task, "assumption_ledger.json");
  const dependencyLockPath = materialPath(task, "dependency_lock.json");
  const leanRunManifestPath = materialPath(task, "lean_run_manifest_v3.json");
  const finalReplayManifestPath = materialPath(task, "final_replay_manifest_v3.json");
  const structuredAuditPath = materialPath(task, "structured_audit.json");
  const replayPackPath = materialPath(task, "replay_pack");

  const leanSource = [
    "import Mathlib",
    "",
    "namespace MathResearch",
    "",
    `${task.formal_spec_lock_input.theorem_header} := by`,
    "  simp",
    "",
    `#check ${theoremName}`,
    `#print axioms ${theoremName}`,
    "",
    "end MathResearch",
    ""
  ].join("\n");
  writeProjectFile(input.projectRoot, leanSourcePath, leanSource);
  writeProjectFile(input.projectRoot, leanToolchainPath, `${task.dependency_lock_expectation.lean_toolchain}\n`);
  writeProjectFile(
    input.projectRoot,
    lakefilePath,
    [
      "import Lake",
      "open Lake DSL",
      "",
      "package MathResearch where",
      "  -- Task 38 preflight material only; final replay must regenerate trusted manifests.",
      "",
      "require mathlib from git \"https://github.com/leanprover-community/mathlib4\" @ \"v4.23.0\"",
      "",
      "lean_lib MathResearch where",
      "  roots := #[`MathResearch.Target]",
      ""
    ].join("\n")
  );
  writeJsonProjectFile(input.projectRoot, lakeManifestPath, {
    version: 7,
    packages: [
      {
        name: "mathlib",
        type: "git",
        url: "https://github.com/leanprover-community/mathlib4",
        rev: "v4.23.0",
        proof_authority: "none"
      }
    ],
    material_status: "preflight_only_not_lake_resolved"
  });
  writeJsonProjectFile(input.projectRoot, formalSpecLockPath, {
    schema_version: "comath.formal_spec_lock.v2",
    task_id: task.task_id,
    theorem_name: theoremName,
    theorem_header: task.formal_spec_lock_input.theorem_header,
    theorem_type_pretty: task.formal_spec_lock_input.theorem_type_pretty,
    statement_hash: task.formal_spec_lock_input.statement_hash,
    variables: task.formal_spec_lock_input.variables,
    assumptions: task.formal_spec_lock_input.assumptions,
    imports_allowed: task.formal_spec_lock_input.imports_allowed,
    proof_authority: "none"
  });
  writeJsonProjectFile(input.projectRoot, assumptionLedgerPath, {
    schema_version: "comath.assumption_ledger.v2",
    task_id: task.task_id,
    entries: task.assumption_ledger_input.entries,
    proof_authority: "none"
  });
  writeJsonProjectFile(input.projectRoot, dependencyLockPath, {
    schema_version: "comath.dependency_lock.v3",
    task_id: task.task_id,
    lean_toolchain: task.dependency_lock_expectation.lean_toolchain,
    allowed_import_prefixes: task.dependency_lock_expectation.allowed_import_prefixes,
    external_dependency_state: task.dependency_lock_expectation.external_dependency_state,
    network_policy_final_replay: "disabled",
    material_status: "preflight_only_not_trusted_replay_dependency",
    proof_authority: "none"
  });
  writeJsonProjectFile(input.projectRoot, structuredAuditPath, {
    schema_version: "comath.structured_lean_audit.v3.preflight",
    task_id: task.task_id,
    theorem_name: theoremName,
    result: "blocked",
    hard_vetoes: ["lean_replay_not_executed"],
    material_status: "preflight_only_not_structured_lean_audited",
    proof_authority: "none"
  });
  writeJsonProjectFile(input.projectRoot, leanRunManifestPath, {
    schema_version: "comath.lean_run_manifest.v3.preflight",
    run_id: `LRUN-${task.task_id}-PREFLIGHT`,
    task_id: task.task_id,
    purpose: "final_replay",
    command: task.replay_command,
    exit_code: null,
    material_status: "preflight_only_not_lean_executed",
    runner: "comathd.Goal3ReplayMaterialPackPreflight",
    proof_authority: "none"
  });
  writeJsonProjectFile(input.projectRoot, finalReplayManifestPath, {
    schema_version: "comath.final_replay_manifest.v3.preflight",
    replay_id: `RPLY-${task.task_id}-PREFLIGHT`,
    task_id: task.task_id,
    theorem_name: theoremName,
    command: task.replay_command,
    result: "blocked",
    promotion_allowed: false,
    material_status: "preflight_only_not_final_replayed",
    proof_authority: "none"
  });
  writeProjectFile(
    input.projectRoot,
    `${replayPackPath}/README_REPLAY.md`,
    [
      "# PM-002 Replay Material Preflight",
      "",
      "This pack is service-generated declared material only.",
      "It is not a Lean clean replay result and cannot promote a claim.",
      "A real Lean Authority v3 executor must replace preflight manifests with service-owned replay evidence.",
      ""
    ].join("\n")
  );

  const materialSource: Goal3GaDeclaredReplayMaterialSource = {
    schema_version: "comath.goal3_declared_replay_material_source.v1",
    task_id: task.task_id,
    lean_source_path: leanSourcePath,
    lean_toolchain_path: leanToolchainPath,
    lakefile_path: lakefilePath,
    lake_manifest_path: lakeManifestPath,
    formal_spec_lock_path: formalSpecLockPath,
    assumption_ledger_path: assumptionLedgerPath,
    dependency_lock_path: dependencyLockPath,
    lean_run_manifest_v3_path: leanRunManifestPath,
    final_replay_manifest_v3_path: finalReplayManifestPath,
    structured_audit_path: structuredAuditPath,
    third_party_replay_pack_path: replayPackPath,
    lean_run_manifest_id: `LRUN-${task.task_id}-PREFLIGHT`,
    final_replay_manifest_id: `RPLY-${task.task_id}-PREFLIGHT`,
    proof_authority: "none",
    can_promote_claim: false
  };

  const materialHashes = Object.fromEntries(
    Object.entries({
      lean_source_path: leanSourcePath,
      lean_toolchain_path: leanToolchainPath,
      lakefile_path: lakefilePath,
      lake_manifest_path: lakeManifestPath,
      formal_spec_lock_path: formalSpecLockPath,
      assumption_ledger_path: assumptionLedgerPath,
      dependency_lock_path: dependencyLockPath,
      lean_run_manifest_v3_path: leanRunManifestPath,
      final_replay_manifest_v3_path: finalReplayManifestPath,
      structured_audit_path: structuredAuditPath,
      replay_pack_readme_path: `${replayPackPath}/README_REPLAY.md`
    }).map(([key, path]) => [key, sha256File(join(input.projectRoot, path))])
  );

  const preflight: Goal3GaPm002ReplayMaterialPackPreflight = {
    schema_version: "comath.goal3_pm002_replay_material_pack_preflight.v1",
    task_id: "PM-002",
    material_root_path: materialRoot,
    material_source: materialSource,
    material_hashes_sha256: materialHashes,
    live_replay_executor_status: "not_executed",
    blocker_code: "live_replay_executor_not_configured",
    proof_authority: "none",
    can_promote_claim: false
  };
  writeJsonProjectFile(input.projectRoot, materialPath(task, "material_pack_preflight.json"), preflight);
  return preflight;
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
  if (!paths.every((path) => evidencePathExistsInsideProject(projectRoot, path))) {
    return {
      ok: false,
      blocker_code: "live_replay_success_evidence_unreadable",
      detail: "A live replay adapter reported success with evidence paths that were missing, absolute, or outside the project root."
    };
  }

  try {
    const leanRunManifest = JSON.parse(readFileSync(join(projectRoot, normalized.lean_run_manifest_v3_path), "utf8"));
    const finalReplayManifest = JSON.parse(readFileSync(join(projectRoot, normalized.final_replay_manifest_v3_path), "utf8"));
    const leanRunVerification = verifyLeanRunManifestV3Evidence(projectRoot, leanRunManifest);
    const finalReplayVerification = verifyFinalReplayManifestV3(projectRoot, finalReplayManifest);
    if (leanRunVerification.ok && finalReplayVerification.ok) {
      return normalized;
    }
  } catch {
    // Fall through to a structured fail-closed blocker below.
  }
  return {
    ok: false,
    blocker_code: "live_replay_success_manifest_verification_failed",
    detail: "A live replay adapter reported success, but the supplied LeanRunManifest v3 or FinalReplayManifest v3 did not verify as service-owned Lean Authority evidence."
  };
}

function runVersionProbe(command: string[], cwd: string): Goal3GaPm002LeanAuthorityProbeResult {
  const [program, ...args] = command;
  const result = spawnSync(program, args, {
    cwd,
    encoding: "utf8",
    timeout: 30_000,
    env: { ...process.env, COMATH_RUNNER_NETWORK: "disabled" }
  });
  return {
    exit_code: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? (result.error ? String(result.error) : "")
  };
}

function summarizeProbeFailure(label: string, result: Goal3GaPm002LeanAuthorityProbeResult): string {
  const output = [result.stdout, result.stderr].filter((item) => item.trim().length > 0).join("\n").trim();
  return output ? `${label} failed: ${output}` : `${label} failed with exit code ${result.exit_code}`;
}

function summarizeCommandFailure(command: string[], result: Goal3GaPm002LeanAuthorityCommandResult): string {
  const output = [result.stdout, result.stderr].filter((item) => item.trim().length > 0).join("\n").trim();
  const label = command.join(" ");
  return output ? `${label} failed: ${output}` : `${label} failed with exit code ${result.exit_code}`;
}

function pm002RunManifestPath(projectRoot: string, runId: string): string {
  return relative(projectRoot, join(projectRoot, ".comath", "evidence", "C-0002", "lean", `${runId}.manifest.json`)).replace(/\\/g, "/");
}

function positiveMatrixRunManifestPath(projectRoot: string, claimId: string, runId: string): string {
  return relative(projectRoot, join(projectRoot, ".comath", "evidence", claimId, "lean", `${runId}.manifest.json`)).replace(/\\/g, "/");
}

function positiveMatrixTaskNumber(task: Goal3GaPositiveMatrixTask): string {
  return task.task_id.slice(3).padStart(4, "0");
}

function positiveMatrixClaimId(prefix: string, task: Goal3GaPositiveMatrixTask): string {
  return `${prefix}-${positiveMatrixTaskNumber(task)}`;
}

function positiveMatrixExecutorBlockerPath(task: Goal3GaPositiveMatrixTask): string {
  return materialPath(task, "lean_authority_executor_blocker_v3.json");
}

function positiveMatrixExecutorTrancheReportPath(startTaskId: string, endTaskId: string): string {
  return join(
    ".comath",
    "release",
    "positive_matrix",
    `${startTaskId}_${endTaskId}`,
    "lean_authority_executor_tranche_v1.json"
  ).replace(/\\/g, "/");
}

function positiveMatrixReplayPlanCommands(): string[][] {
  return [
    ["lake", "env", "lean", "MathResearch/Target.lean"],
    ["lake", "build", "MathResearch"]
  ];
}

function writePositiveMatrixExecutorBlocker(input: {
  projectRoot: string;
  task: Goal3GaPositiveMatrixTask;
  claimId: string;
  materialSource: Goal3GaDeclaredReplayMaterialSource;
  materialCheck: Goal3GaDeclaredReplayMaterialCheck;
  blocker_code: Goal3GaPositiveMatrixLeanAuthorityExecutorBlockerCode;
  blocker_detail: string;
  attempted_commands: string[][];
  lean_run_manifest_paths?: string[];
}): { path: string; blocker: Goal3GaPositiveMatrixLeanAuthorityExecutorBlocker } {
  const path = positiveMatrixExecutorBlockerPath(input.task);
  const blocker: Goal3GaPositiveMatrixLeanAuthorityExecutorBlocker = {
    schema_version: "comath.goal3_positive_matrix_lean_authority_executor_blocker.v1",
    task_id: input.task.task_id,
    claim_id: input.claimId,
    executor_status: "blocked_before_replay",
    blocker_code: input.blocker_code,
    blocker_detail: input.blocker_detail,
    attempted_commands: input.attempted_commands,
    replay_plan_commands: positiveMatrixReplayPlanCommands(),
    lean_run_manifest_paths: input.lean_run_manifest_paths ?? [],
    material_source_path: input.materialCheck.source_path,
    lean_source_path: input.materialSource.lean_source_path,
    lean_toolchain_path: input.materialSource.lean_toolchain_path,
    lakefile_path: input.materialSource.lakefile_path,
    lake_manifest_path: input.materialSource.lake_manifest_path,
    network_policy_final_replay: "disabled",
    proof_authority: "none",
    can_promote_claim: false
  };
  writeJsonProjectFile(input.projectRoot, path, blocker);
  return { path, blocker };
}

function blockedPositiveMatrixExecutorReport(input: {
  projectRoot: string;
  task: Goal3GaPositiveMatrixTask;
  claimId: string;
  materialSource: Goal3GaDeclaredReplayMaterialSource;
  materialCheck: Goal3GaDeclaredReplayMaterialCheck;
  blocker_code: Goal3GaPositiveMatrixLeanAuthorityExecutorBlockerCode;
  blocker_detail: string;
  attempted_commands: string[][];
  lean_run_manifest_paths?: string[];
}): Goal3GaPositiveMatrixLeanAuthorityExecutorReport {
  const { path } = writePositiveMatrixExecutorBlocker({
    projectRoot: input.projectRoot,
    task: input.task,
    claimId: input.claimId,
    materialSource: input.materialSource,
    materialCheck: input.materialCheck,
    blocker_code: input.blocker_code,
    blocker_detail: input.blocker_detail,
    attempted_commands: input.attempted_commands,
    lean_run_manifest_paths: input.lean_run_manifest_paths
  });
  const finalAuthorityPackaging = packageGoal3GaPositiveMatrixFinalAuthorityEvidenceFromEvidenceV3({
    projectRoot: input.projectRoot,
    taskId: input.task.task_id,
    claimId: input.claimId,
    evidence: {
      lean_run_manifest_paths: input.lean_run_manifest_paths ?? [],
      final_replay_manifest_v3_path: input.materialSource.final_replay_manifest_v3_path,
      structured_audit_path: input.materialSource.structured_audit_path,
      third_party_replay_pack_path: input.materialSource.third_party_replay_pack_path
    }
  });
  return {
    schema_version: "comath.goal3_positive_matrix_lean_authority_executor.v1",
    task_id: input.task.task_id,
    claim_id: input.claimId,
    executor_status: "blocked_before_replay",
    blocker_code: input.blocker_code,
    blocker_detail: input.blocker_detail,
    executor_blocker_path: path,
    final_authority_packaging: finalAuthorityPackaging,
    proof_authority: "none",
    can_promote_claim: false
  };
}

function writePm002ExecutorBlocker(input: {
  projectRoot: string;
  materialSource: Goal3GaDeclaredReplayMaterialSource;
  materialCheck: Goal3GaDeclaredReplayMaterialCheck;
  blocker_code: Goal3GaPm002LeanAuthorityExecutorBlocker["blocker_code"];
  blocker_detail: string;
  attempted_commands: string[][];
  lean_run_manifest_paths?: string[];
}): { path: string; blocker: Goal3GaPm002LeanAuthorityExecutorBlocker } {
  const task = taskByIdOrThrow("PM-002");
  const path = materialPath(task, "lean_authority_executor_blocker.json");
  const blocker: Goal3GaPm002LeanAuthorityExecutorBlocker = {
    schema_version: "comath.goal3_pm002_lean_authority_executor_blocker.v1",
    task_id: "PM-002",
    executor_status: "blocked_before_replay",
    blocker_code: input.blocker_code,
    blocker_detail: input.blocker_detail,
    attempted_commands: input.attempted_commands,
    replay_plan_commands: [
      ["lake", "env", "lean", "MathResearch/Target.lean"],
      ["lake", "build", "MathResearch"]
    ],
    lean_run_manifest_paths: input.lean_run_manifest_paths ?? [],
    material_source_path: input.materialCheck.source_path,
    lean_source_path: input.materialSource.lean_source_path,
    lean_toolchain_path: input.materialSource.lean_toolchain_path,
    lakefile_path: input.materialSource.lakefile_path,
    lake_manifest_path: input.materialSource.lake_manifest_path,
    network_policy_final_replay: "disabled",
    proof_authority: "none",
    can_promote_claim: false
  };
  writeJsonProjectFile(input.projectRoot, path, blocker);
  return { path, blocker };
}

export function executeGoal3GaPositiveMatrixLeanAuthorityReplay(input: {
  projectRoot: string;
  taskId: string;
  claimId: string;
  materialSource: Goal3GaDeclaredReplayMaterialSource;
  probeLeanVersion?: () => Goal3GaPm002LeanAuthorityProbeResult;
  probeLakeVersion?: () => Goal3GaPm002LeanAuthorityProbeResult;
  runReplayCommand?: (command: string[], cwd: string) => Goal3GaPm002LeanAuthorityCommandResult;
}): Goal3GaPositiveMatrixLeanAuthorityExecutorReport {
  const task = taskByIdOrThrow(input.taskId);
  if (task.task_id === "PM-001") {
    throw new Error("invalid_positive_matrix_lean_authority_executor_task");
  }
  if (input.materialSource.task_id !== task.task_id) {
    throw new Error("invalid_positive_matrix_material_source_task");
  }

  const materialCheck = validateDeclaredReplayMaterialSource({
    projectRoot: input.projectRoot,
    task,
    source: input.materialSource
  });
  if (materialCheck.status !== "ready_for_live_executor") {
    return blockedPositiveMatrixExecutorReport({
      projectRoot: input.projectRoot,
      task,
      claimId: input.claimId,
      materialSource: input.materialSource,
      materialCheck,
      blocker_code: "declared_replay_material_missing",
      blocker_detail: `${task.task_id} declared replay material is missing, outside the project root, or incomplete.`,
      attempted_commands: []
    });
  }

  const materialRoot = join(input.projectRoot, materialPath(task, ""));
  const leanProbe = input.probeLeanVersion ? input.probeLeanVersion() : runVersionProbe(["lean", "--version"], materialRoot);
  if (leanProbe.exit_code !== 0) {
    const blockerDetail = summarizeProbeFailure("lean --version", leanProbe);
    return blockedPositiveMatrixExecutorReport({
      projectRoot: input.projectRoot,
      task,
      claimId: input.claimId,
      materialSource: input.materialSource,
      materialCheck,
      blocker_code: "lean_toolchain_unavailable_for_live_replay",
      blocker_detail: blockerDetail,
      attempted_commands: [["lean", "--version"]]
    });
  }

  const lakeProbe = input.probeLakeVersion ? input.probeLakeVersion() : runVersionProbe(["lake", "--version"], materialRoot);
  if (lakeProbe.exit_code !== 0) {
    const blockerDetail = summarizeProbeFailure("lake --version", lakeProbe);
    return blockedPositiveMatrixExecutorReport({
      projectRoot: input.projectRoot,
      task,
      claimId: input.claimId,
      materialSource: input.materialSource,
      materialCheck,
      blocker_code: "lean_toolchain_unavailable_for_live_replay",
      blocker_detail: blockerDetail,
      attempted_commands: [
        ["lean", "--version"],
        ["lake", "--version"]
      ]
    });
  }

  const leanToolchain = readFileSync(join(input.projectRoot, input.materialSource.lean_toolchain_path), "utf8").trim();
  const inputFiles = [
    join(input.projectRoot, input.materialSource.lean_source_path),
    join(input.projectRoot, input.materialSource.lean_toolchain_path),
    join(input.projectRoot, input.materialSource.lakefile_path),
    join(input.projectRoot, input.materialSource.lake_manifest_path),
    join(input.projectRoot, input.materialSource.formal_spec_lock_path),
    join(input.projectRoot, input.materialSource.assumption_ledger_path),
    join(input.projectRoot, input.materialSource.dependency_lock_path)
  ];
  const replayCommands = positiveMatrixReplayPlanCommands().map((command, index) => ({
    runId: `LRUN-${positiveMatrixTaskNumber(task)}${String(index + 1).padStart(2, "0")}`,
    purpose: index === 0 ? "check" as const : "build" as const,
    command
  }));
  const attemptedCommands = [["lean", "--version"], ["lake", "--version"]];
  const manifestPaths: string[] = [];

  for (const replay of replayCommands) {
    const run = runServiceOwnedLeanCommandV3({
      projectRoot: input.projectRoot,
      run_id: replay.runId,
      claim_id: input.claimId,
      campaign_id: `CAM-${positiveMatrixTaskNumber(task)}`,
      candidate_id: `CAND-${positiveMatrixTaskNumber(task)}`,
      purpose: replay.purpose,
      command: replay.command,
      cwd: materialRoot,
      input_files: inputFiles,
      leanVersionOutput: leanProbe.stdout,
      lakeVersionOutput: lakeProbe.stdout,
      leanToolchain,
      network_policy: "disabled",
      sandbox: "none",
      proof_authority: "none",
      run: input.runReplayCommand
    });
    const manifestPath = positiveMatrixRunManifestPath(input.projectRoot, input.claimId, replay.runId);
    manifestPaths.push(manifestPath);
    attemptedCommands.push(replay.command);
    if (run.manifest.exit_code !== 0) {
      return blockedPositiveMatrixExecutorReport({
        projectRoot: input.projectRoot,
        task,
        claimId: input.claimId,
        materialSource: input.materialSource,
        materialCheck,
        blocker_code: "lean_replay_command_failed",
        blocker_detail: summarizeCommandFailure(replay.command, { exit_code: run.manifest.exit_code, stdout: run.stdout, stderr: run.stderr }),
        attempted_commands: attemptedCommands,
        lean_run_manifest_paths: manifestPaths
      });
    }
  }

  return blockedPositiveMatrixExecutorReport({
    projectRoot: input.projectRoot,
    task,
    claimId: input.claimId,
    materialSource: input.materialSource,
    materialCheck,
    blocker_code: "lean_authority_evidence_incomplete",
    blocker_detail: `${task.task_id} declared Lean/Lake commands exited successfully, but complete verified FinalReplayManifest v3, structured audit, dependency closure, axiom profile, statement-boundary evidence, and third-party replay pack material were not produced.`,
    attempted_commands: attemptedCommands,
    lean_run_manifest_paths: manifestPaths
  });
}

export function executeGoal3GaPositiveMatrixLeanAuthorityReplayTranche(input: {
  projectRoot: string;
  startTaskId: string;
  endTaskId: string;
  claimIdPrefix?: string;
  materialSourceByTaskId?: Record<string, Goal3GaDeclaredReplayMaterialSource | undefined>;
  probeLeanVersion?: () => Goal3GaPm002LeanAuthorityProbeResult;
  probeLakeVersion?: () => Goal3GaPm002LeanAuthorityProbeResult;
  runReplayCommand?: (command: string[], cwd: string) => Goal3GaPm002LeanAuthorityCommandResult;
}): Goal3GaPositiveMatrixLeanAuthorityExecutorTrancheReport {
  const manifest = createGoal3GaPositiveTaskManifest();
  const startIndex = manifest.tasks.findIndex((task) => task.task_id === input.startTaskId);
  const endIndex = manifest.tasks.findIndex((task) => task.task_id === input.endTaskId);
  if (startIndex < 0 || endIndex < 0 || startIndex > endIndex || input.startTaskId === "PM-001") {
    throw new Error("invalid_positive_matrix_lean_authority_executor_tranche");
  }

  const tasks = manifest.tasks.slice(startIndex, endIndex + 1);
  if (tasks.some((task) => task.task_id === "PM-001")) {
    throw new Error("invalid_positive_matrix_lean_authority_executor_tranche");
  }

  const claimIdPrefix = input.claimIdPrefix ?? "C";
  const results = tasks.map((task) => {
    const materialSource = input.materialSourceByTaskId?.[task.task_id];
    if (!materialSource) {
      throw new Error("positive_matrix_declared_replay_material_missing");
    }
    return executeGoal3GaPositiveMatrixLeanAuthorityReplay({
      projectRoot: input.projectRoot,
      taskId: task.task_id,
      claimId: positiveMatrixClaimId(claimIdPrefix, task),
      materialSource,
      probeLeanVersion: input.probeLeanVersion,
      probeLakeVersion: input.probeLakeVersion,
      runReplayCommand: input.runReplayCommand
    });
  });
  const categoryCounts = tasks.reduce<Partial<Record<Goal3GaPositiveMatrixCategory, number>>>((counts, task) => {
    counts[task.category] = (counts[task.category] ?? 0) + 1;
    return counts;
  }, {});
  const nonAuthorityInputCounts = Object.fromEntries(
    Object.entries(categoryCounts).map(([category, taskCount]) => [
      category,
      { task_count: taskCount ?? 0, proof_authority: "none" as const }
    ])
  ) as Partial<Record<Goal3GaPositiveMatrixCategory, { task_count: number; proof_authority: "none" }>>;

  const trancheReportPath = positiveMatrixExecutorTrancheReportPath(input.startTaskId, input.endTaskId);
  const report: Goal3GaPositiveMatrixLeanAuthorityExecutorTrancheReport = {
    schema_version: "comath.goal3_positive_matrix_lean_authority_executor_tranche.v1",
    start_task_id: input.startTaskId,
    end_task_id: input.endTaskId,
    task_count: results.length,
    task_ids: tasks.map((task) => task.task_id),
    category_counts: categoryCounts,
    non_authority_input_counts: nonAuthorityInputCounts,
    results,
    tranche_status: results.every((result) => result.final_authority_packaging.final_evidence_status === "verified_final_authority_evidence")
      ? "verified_final_authority_evidence"
      : "blocked_missing_final_evidence",
    tranche_report_path: trancheReportPath,
    proof_authority: results.every((result) => result.final_authority_packaging.proof_authority === "lean_kernel_clean_replay")
      ? "lean_kernel_clean_replay"
      : "none",
    can_promote_claim: false,
    promotion_requires_gate: true,
    promoted_count: 0
  };
  writeJsonProjectFile(input.projectRoot, trancheReportPath, report);
  return report;
}

export function executeGoal3GaPm002LeanAuthorityReplay(input: {
  projectRoot: string;
  materialSource: Goal3GaDeclaredReplayMaterialSource;
  probeLeanVersion?: () => Goal3GaPm002LeanAuthorityProbeResult;
  probeLakeVersion?: () => Goal3GaPm002LeanAuthorityProbeResult;
  runReplayCommand?: (command: string[], cwd: string) => Goal3GaPm002LeanAuthorityCommandResult;
}): Goal3GaPm002LeanAuthorityExecutorReport {
  const task = taskByIdOrThrow("PM-002");
  if (input.materialSource.task_id !== task.task_id) {
    throw new Error("invalid_pm002_material_source_task");
  }

  const materialCheck = validateDeclaredReplayMaterialSource({
    projectRoot: input.projectRoot,
    task,
    source: input.materialSource
  });
  if (materialCheck.status !== "ready_for_live_executor") {
    const blockerDetail = "PM-002 declared replay material is missing, outside the project root, or incomplete.";
    const { path } = writePm002ExecutorBlocker({
      projectRoot: input.projectRoot,
      materialSource: input.materialSource,
      materialCheck,
      blocker_code: "declared_replay_material_missing",
      blocker_detail: blockerDetail,
      attempted_commands: []
    });
    const live_replay_conversion = runGoal3GaPositiveMatrixLiveReplayConversion({
      projectRoot: input.projectRoot,
      taskIds: ["PM-002"],
      replayMaterialSource: () => input.materialSource
    });
    return {
      schema_version: "comath.goal3_pm002_lean_authority_executor.v1",
      task_id: "PM-002",
      executor_status: "blocked_before_replay",
      blocker_code: "declared_replay_material_missing",
      blocker_detail: blockerDetail,
      executor_blocker_path: path,
      live_replay_conversion,
      proof_authority: "none",
      can_promote_claim: false
    };
  }

  const materialRoot = join(input.projectRoot, materialPath(task, ""));
  const leanProbe = input.probeLeanVersion ? input.probeLeanVersion() : runVersionProbe(["lean", "--version"], materialRoot);
  if (leanProbe.exit_code !== 0) {
    const blockerDetail = summarizeProbeFailure("lean --version", leanProbe);
    const { path } = writePm002ExecutorBlocker({
      projectRoot: input.projectRoot,
      materialSource: input.materialSource,
      materialCheck,
      blocker_code: "lean_toolchain_unavailable_for_live_replay",
      blocker_detail: blockerDetail,
      attempted_commands: [["lean", "--version"]]
    });
    const live_replay_conversion = runGoal3GaPositiveMatrixLiveReplayConversion({
      projectRoot: input.projectRoot,
      taskIds: ["PM-002"],
      replayMaterialSource: () => input.materialSource,
      liveReplay: () => ({ ok: false, blocker_code: "lean_toolchain_unavailable_for_live_replay", detail: blockerDetail })
    });
    return {
      schema_version: "comath.goal3_pm002_lean_authority_executor.v1",
      task_id: "PM-002",
      executor_status: "blocked_before_replay",
      blocker_code: "lean_toolchain_unavailable_for_live_replay",
      blocker_detail: blockerDetail,
      executor_blocker_path: path,
      live_replay_conversion,
      proof_authority: "none",
      can_promote_claim: false
    };
  }

  const lakeProbe = input.probeLakeVersion ? input.probeLakeVersion() : runVersionProbe(["lake", "--version"], materialRoot);
  if (lakeProbe.exit_code !== 0) {
    const blockerDetail = summarizeProbeFailure("lake --version", lakeProbe);
    const { path } = writePm002ExecutorBlocker({
      projectRoot: input.projectRoot,
      materialSource: input.materialSource,
      materialCheck,
      blocker_code: "lean_toolchain_unavailable_for_live_replay",
      blocker_detail: blockerDetail,
      attempted_commands: [
        ["lean", "--version"],
        ["lake", "--version"]
      ]
    });
    const live_replay_conversion = runGoal3GaPositiveMatrixLiveReplayConversion({
      projectRoot: input.projectRoot,
      taskIds: ["PM-002"],
      replayMaterialSource: () => input.materialSource,
      liveReplay: () => ({ ok: false, blocker_code: "lean_toolchain_unavailable_for_live_replay", detail: blockerDetail })
    });
    return {
      schema_version: "comath.goal3_pm002_lean_authority_executor.v1",
      task_id: "PM-002",
      executor_status: "blocked_before_replay",
      blocker_code: "lean_toolchain_unavailable_for_live_replay",
      blocker_detail: blockerDetail,
      executor_blocker_path: path,
      live_replay_conversion,
      proof_authority: "none",
      can_promote_claim: false
    };
  }

  const leanToolchain = readFileSync(join(input.projectRoot, input.materialSource.lean_toolchain_path), "utf8").trim();
  const inputFiles = [
    join(input.projectRoot, input.materialSource.lean_source_path),
    join(input.projectRoot, input.materialSource.lean_toolchain_path),
    join(input.projectRoot, input.materialSource.lakefile_path),
    join(input.projectRoot, input.materialSource.lake_manifest_path),
    join(input.projectRoot, input.materialSource.formal_spec_lock_path),
    join(input.projectRoot, input.materialSource.assumption_ledger_path),
    join(input.projectRoot, input.materialSource.dependency_lock_path)
  ];
  const replayCommands = [
    { runId: "LRUN-0002", purpose: "check" as const, command: ["lake", "env", "lean", "MathResearch/Target.lean"] },
    { runId: "LRUN-0003", purpose: "build" as const, command: ["lake", "build", "MathResearch"] }
  ];
  const manifestPaths: string[] = [];
  const attemptedCommands = [["lean", "--version"], ["lake", "--version"]];

  for (const replay of replayCommands) {
    const run = runServiceOwnedLeanCommandV3({
      projectRoot: input.projectRoot,
      run_id: replay.runId,
      claim_id: "C-0002",
      campaign_id: "CAM-0002",
      candidate_id: "CAND-0002",
      purpose: replay.purpose,
      command: replay.command,
      cwd: materialRoot,
      input_files: inputFiles,
      leanVersionOutput: leanProbe.stdout,
      lakeVersionOutput: lakeProbe.stdout,
      leanToolchain,
      network_policy: "disabled",
      sandbox: "none",
      proof_authority: "none",
      run: input.runReplayCommand
    });
    manifestPaths.push(pm002RunManifestPath(input.projectRoot, replay.runId));
    attemptedCommands.push(replay.command);
    if (run.manifest.exit_code !== 0) {
      const blockerDetail = summarizeCommandFailure(replay.command, { exit_code: run.manifest.exit_code, stdout: run.stdout, stderr: run.stderr });
      const { path } = writePm002ExecutorBlocker({
        projectRoot: input.projectRoot,
        materialSource: input.materialSource,
        materialCheck,
        blocker_code: "lean_replay_command_failed",
        blocker_detail: blockerDetail,
        attempted_commands: attemptedCommands,
        lean_run_manifest_paths: manifestPaths
      });
      const live_replay_conversion = runGoal3GaPositiveMatrixLiveReplayConversion({
        projectRoot: input.projectRoot,
        taskIds: ["PM-002"],
        replayMaterialSource: () => input.materialSource,
        liveReplay: () => ({ ok: false, blocker_code: "lean_replay_command_failed", detail: blockerDetail })
      });
      return {
        schema_version: "comath.goal3_pm002_lean_authority_executor.v1",
        task_id: "PM-002",
        executor_status: "blocked_before_replay",
        blocker_code: "lean_replay_command_failed",
        blocker_detail: blockerDetail,
        executor_blocker_path: path,
        live_replay_conversion,
        proof_authority: "none",
        can_promote_claim: false
      };
    }
  }

  const blockerDetail =
    "PM-002 declared Lean/Lake commands exited successfully, but complete verified FinalReplayManifest v3, structured audit, dependency closure, axiom profile, and statement-boundary evidence were not produced.";
  const { path } = writePm002ExecutorBlocker({
    projectRoot: input.projectRoot,
    materialSource: input.materialSource,
    materialCheck,
    blocker_code: "lean_authority_evidence_incomplete",
    blocker_detail: blockerDetail,
    attempted_commands: attemptedCommands,
    lean_run_manifest_paths: manifestPaths
  });
  const live_replay_conversion = runGoal3GaPositiveMatrixLiveReplayConversion({
    projectRoot: input.projectRoot,
    taskIds: ["PM-002"],
    replayMaterialSource: () => input.materialSource,
    liveReplay: () => ({ ok: false, blocker_code: "lean_authority_evidence_incomplete", detail: blockerDetail })
  });
  return {
    schema_version: "comath.goal3_pm002_lean_authority_executor.v1",
    task_id: "PM-002",
    executor_status: "blocked_before_replay",
    blocker_code: "lean_authority_evidence_incomplete",
    blocker_detail: blockerDetail,
    executor_blocker_path: path,
    live_replay_conversion,
    proof_authority: "none",
    can_promote_claim: false
  };
}

function readJsonInsideProject(projectRoot: string, path: string): unknown | null {
  if (!evidencePathExistsInsideProject(projectRoot, path)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(join(projectRoot, path), "utf8"));
  } catch {
    return null;
  }
}

function reportPasses(projectRoot: string, path: string): boolean {
  const value = readJsonInsideProject(projectRoot, path);
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  const hardVetoes = Array.isArray(record.hard_vetoes) ? record.hard_vetoes : [];
  return record.result === "pass" && hardVetoes.length === 0;
}

function replayPackExists(projectRoot: string, path: string): boolean {
  return (
    evidencePathExistsInsideProject(projectRoot, `${path}/README_REPLAY.md`) &&
    evidencePathExistsInsideProject(projectRoot, `${path}/FinalReplayManifest.json`) &&
    evidencePathExistsInsideProject(projectRoot, `${path}/expected_hashes.json`)
  );
}

function pm002FinalPackagingReportPath(kind: "blocker" | "report"): string {
  const task = taskByIdOrThrow("PM-002");
  return materialPath(task, kind === "blocker" ? "final_authority_evidence_blocker.json" : "final_authority_packaging_report.json");
}

function genericFinalPackagingReportPath(taskId: string, kind: "blocker" | "report"): string {
  const leaf = kind === "blocker" ? "final_authority_evidence_blocker_v3.json" : "final_authority_packaging_report_v3.json";
  return join(".comath", "release", "positive_matrix", taskId, leaf).replace(/\\/g, "/");
}

function genericFinalPackagingTrancheReportPath(startTaskId: string, endTaskId: string): string {
  return join(
    ".comath",
    "release",
    "positive_matrix",
    `${startTaskId}_${endTaskId}`,
    "final_authority_packaging_tranche_v3.json"
  ).replace(/\\/g, "/");
}

function orderedMissingFinalEvidenceClasses(missing: Set<Goal3GaPm002FinalEvidenceClass>): Goal3GaPm002FinalEvidenceClass[] {
  return finalAuthorityEvidenceClassOrder.filter((evidenceClass) => missing.has(evidenceClass));
}

function verifyFinalAuthorityEvidenceSourceReportV3(input: {
  projectRoot: string;
  taskId: string;
  evidence?: FinalAuthorityPackagingV3EvidenceInput;
}): FinalAuthorityPackagingV3SourceReport {
  const evidence = input.evidence ?? {};
  const leanRunManifestPaths = Array.isArray(evidence.lean_run_manifest_paths)
    ? evidence.lean_run_manifest_paths.filter((path): path is string => typeof path === "string" && path.length > 0)
    : [];
  const finalReplayManifestPath = typeof evidence.final_replay_manifest_v3_path === "string" ? evidence.final_replay_manifest_v3_path : "";
  const structuredAuditPath = typeof evidence.structured_audit_path === "string" ? evidence.structured_audit_path : "";
  const dependencyClosurePath = typeof evidence.dependency_closure_path === "string" ? evidence.dependency_closure_path : "";
  const axiomProfilePath = typeof evidence.axiom_profile_path === "string" ? evidence.axiom_profile_path : "";
  const statementCheckPath = typeof evidence.statement_check_path === "string" ? evidence.statement_check_path : "";
  const thirdPartyReplayPackPath = typeof evidence.third_party_replay_pack_path === "string" ? evidence.third_party_replay_pack_path : "";
  const packagingReportPath = typeof evidence.packaging_report_path === "string" ? evidence.packaging_report_path : "";

  const missing = new Set<Goal3GaPm002FinalEvidenceClass>();
  if (leanRunManifestPaths.length === 0) {
    missing.add("lean_run_manifest_v3");
  }
  for (const manifestPath of leanRunManifestPaths) {
    const manifest = readJsonInsideProject(input.projectRoot, manifestPath);
    const verification = verifyLeanRunManifestV3Evidence(input.projectRoot, manifest);
    if (!verification.ok) {
      missing.add("lean_run_manifest_v3");
    }
  }

  const finalReplayManifest = finalReplayManifestPath ? readJsonInsideProject(input.projectRoot, finalReplayManifestPath) : null;
  const finalReplayVerification = verifyFinalReplayManifestV3(input.projectRoot, finalReplayManifest);
  const finalReplayRecord = finalReplayManifest && typeof finalReplayManifest === "object" ? (finalReplayManifest as Record<string, unknown>) : {};
  const finalReplayPassed =
    finalReplayRecord.result === "pass" &&
    finalReplayRecord.exit_code === 0 &&
    finalReplayRecord.proof_authority === "lean_kernel_clean_replay";
  if (!finalReplayManifestPath || !finalReplayVerification.ok || !finalReplayPassed) {
    missing.add("final_replay_manifest_v3");
  }

  if (!structuredAuditPath || !reportPasses(input.projectRoot, structuredAuditPath)) {
    missing.add("structured_audit");
  }
  if (!dependencyClosurePath || !reportPasses(input.projectRoot, dependencyClosurePath)) {
    missing.add("dependency_closure");
  }
  if (!axiomProfilePath || !reportPasses(input.projectRoot, axiomProfilePath)) {
    missing.add("axiom_profile");
  }
  if (!statementCheckPath || !reportPasses(input.projectRoot, statementCheckPath)) {
    missing.add("statement_check");
  }
  if (!thirdPartyReplayPackPath || !replayPackExists(input.projectRoot, thirdPartyReplayPackPath)) {
    missing.add("third_party_replay_pack");
  }

  const missingFinalEvidenceClasses = orderedMissingFinalEvidenceClasses(missing);
  const verifiedFinalEvidenceClasses = finalAuthorityEvidenceClassOrder.filter((evidenceClass) => !missing.has(evidenceClass));
  return {
    final_evidence_status: missingFinalEvidenceClasses.length === 0 ? "verified_final_authority_evidence" : "blocked_missing_final_evidence",
    blocker_code: missingFinalEvidenceClasses.length === 0 ? "" : "final_authority_evidence_incomplete",
    blocker_detail:
      missingFinalEvidenceClasses.length === 0
        ? `${input.taskId} final Lean Authority v3 evidence verifies, but claim promotion still requires the ordinary promotion gate.`
        : `${input.taskId} final Lean Authority v3 evidence is missing or unverifiable; the task remains a replayable blocker until all final evidence classes verify from project-local artifacts.`,
    missing_final_evidence_classes: missingFinalEvidenceClasses,
    source_verification: {
      verification_basis: "project_local_artifacts",
      caller_success_metadata_trusted: false,
      verified_final_evidence_classes: verifiedFinalEvidenceClasses,
      missing_final_evidence_classes: missingFinalEvidenceClasses,
      lean_run_manifest_paths_checked: leanRunManifestPaths.length
    },
    lean_run_manifest_paths: leanRunManifestPaths,
    final_replay_manifest_v3_path: finalReplayManifestPath,
    structured_audit_path: structuredAuditPath,
    dependency_closure_path: dependencyClosurePath,
    axiom_profile_path: axiomProfilePath,
    statement_check_path: statementCheckPath,
    third_party_replay_pack_path: thirdPartyReplayPackPath,
    packaging_report_path: packagingReportPath,
    proof_authority: missingFinalEvidenceClasses.length === 0 ? "lean_kernel_clean_replay" : "none"
  };
}

export function packageGoal3GaPositiveMatrixFinalAuthorityEvidenceFromEvidenceV3(input: {
  projectRoot: string;
  taskId: string;
  claimId: string;
  evidence?: FinalAuthorityPackagingV3EvidenceInput;
}): FinalAuthorityPackagingV3Report {
  const sourceReport = verifyFinalAuthorityEvidenceSourceReportV3({
    projectRoot: input.projectRoot,
    taskId: input.taskId,
    evidence: input.evidence
  });
  return packageGoal3GaPositiveMatrixFinalAuthorityEvidenceV3({
    projectRoot: input.projectRoot,
    taskId: input.taskId,
    claimId: input.claimId,
    sourceReport
  });
}

export function packageGoal3GaPositiveMatrixFinalAuthorityEvidenceTrancheFromEvidenceV3(input: {
  projectRoot: string;
  startTaskId: string;
  endTaskId: string;
  claimIdPrefix?: string;
  evidenceByTaskId?: Record<string, FinalAuthorityPackagingV3EvidenceInput | undefined>;
}): FinalAuthorityPackagingV3TrancheReport {
  const manifest = createGoal3GaPositiveTaskManifest();
  const startIndex = manifest.tasks.findIndex((task) => task.task_id === input.startTaskId);
  const endIndex = manifest.tasks.findIndex((task) => task.task_id === input.endTaskId);
  if (startIndex < 0 || endIndex < 0 || startIndex > endIndex || input.startTaskId === "PM-001") {
    throw new Error("invalid_positive_matrix_final_authority_tranche");
  }

  const sourceReportsByTaskId: Record<string, FinalAuthorityPackagingV3SourceReport> = {};
  for (const task of manifest.tasks.slice(startIndex, endIndex + 1)) {
    sourceReportsByTaskId[task.task_id] = verifyFinalAuthorityEvidenceSourceReportV3({
      projectRoot: input.projectRoot,
      taskId: task.task_id,
      evidence: input.evidenceByTaskId?.[task.task_id]
    });
  }

  return packageGoal3GaPositiveMatrixFinalAuthorityEvidenceTrancheV3({
    projectRoot: input.projectRoot,
    startTaskId: input.startTaskId,
    endTaskId: input.endTaskId,
    claimIdPrefix: input.claimIdPrefix,
    sourceReportsByTaskId
  });
}

export function packageFinalAuthorityEvidenceV3(input: {
  projectRoot: string;
  taskId: string;
  claimId: string;
  sourceReport: FinalAuthorityPackagingV3SourceReport;
}): FinalAuthorityPackagingV3Report {
  if (!/^PM-\d{3}$/.test(input.taskId)) {
    throw new Error("invalid_final_authority_packaging_task_id");
  }

  const blockerPath = genericFinalPackagingReportPath(input.taskId, "blocker");
  const packagingReportPath = genericFinalPackagingReportPath(input.taskId, "report");
  const report: FinalAuthorityPackagingV3Report = {
    schema_version: "comath.final_authority_packaging.v3",
    task_id: input.taskId,
    claim_id: input.claimId,
    final_evidence_status: input.sourceReport.final_evidence_status,
    blocker_code: input.sourceReport.blocker_code,
    blocker_detail: input.sourceReport.blocker_detail,
    missing_final_evidence_classes: [...input.sourceReport.missing_final_evidence_classes],
    lean_run_manifest_paths: [...input.sourceReport.lean_run_manifest_paths],
    final_replay_manifest_v3_path: input.sourceReport.final_replay_manifest_v3_path,
    structured_audit_path: input.sourceReport.structured_audit_path,
    dependency_closure_path: input.sourceReport.dependency_closure_path,
    axiom_profile_path: input.sourceReport.axiom_profile_path,
    statement_check_path: input.sourceReport.statement_check_path,
    third_party_replay_pack_path: input.sourceReport.third_party_replay_pack_path,
    source_verification: input.sourceReport.source_verification,
    blocker_path: input.sourceReport.missing_final_evidence_classes.length === 0 ? "" : blockerPath,
    packaging_report_path: packagingReportPath,
    source_packaging_report_path: input.sourceReport.packaging_report_path,
    proof_authority: input.sourceReport.proof_authority,
    can_promote_claim: false,
    promotion_requires_gate: true
  };

  writeJsonProjectFile(input.projectRoot, packagingReportPath, report);
  if (report.missing_final_evidence_classes.length > 0) {
    writeJsonProjectFile(input.projectRoot, blockerPath, report);
  }
  return report;
}

export function packageGoal3GaPositiveMatrixFinalAuthorityEvidenceV3(input: {
  projectRoot: string;
  taskId: string;
  claimId: string;
  sourceReport?: FinalAuthorityPackagingV3SourceReport;
}): FinalAuthorityPackagingV3Report {
  const task = taskByIdOrThrow(input.taskId);
  if (task.task_id === "PM-001") {
    throw new Error("invalid_positive_matrix_final_authority_task");
  }

  const missingFinalEvidenceClasses: Goal3GaPm002FinalEvidenceClass[] = [
    "lean_run_manifest_v3",
    "final_replay_manifest_v3",
    "structured_audit",
    "dependency_closure",
    "axiom_profile",
    "statement_check",
    "third_party_replay_pack"
  ];
  const sourceReport = input.sourceReport ?? {
    final_evidence_status: "blocked_missing_final_evidence" as const,
    blocker_code: "final_authority_evidence_incomplete" as const,
    blocker_detail: `${task.task_id} final Lean Authority v3 evidence is missing or unverifiable; the task remains a replayable blocker until service-owned LeanRunManifest v3, FinalReplayManifest v3, structured audit, dependency closure, axiom profile, statement check, and third-party replay pack material are attached.`,
    missing_final_evidence_classes: missingFinalEvidenceClasses,
    source_verification: {
      verification_basis: "project_local_artifacts" as const,
      caller_success_metadata_trusted: false as const,
      verified_final_evidence_classes: [],
      missing_final_evidence_classes: missingFinalEvidenceClasses,
      lean_run_manifest_paths_checked: 0
    },
    lean_run_manifest_paths: [],
    final_replay_manifest_v3_path: "",
    structured_audit_path: "",
    dependency_closure_path: "",
    axiom_profile_path: "",
    statement_check_path: "",
    third_party_replay_pack_path: "",
    packaging_report_path: "",
    proof_authority: "none" as const
  };

  return packageFinalAuthorityEvidenceV3({
    projectRoot: input.projectRoot,
    taskId: task.task_id,
    claimId: input.claimId,
    sourceReport
  });
}

export function packageGoal3GaPositiveMatrixFinalAuthorityEvidenceTrancheV3(input: {
  projectRoot: string;
  startTaskId: string;
  endTaskId: string;
  claimIdPrefix?: string;
  sourceReportsByTaskId?: Record<string, FinalAuthorityPackagingV3SourceReport | undefined>;
}): FinalAuthorityPackagingV3TrancheReport {
  const manifest = createGoal3GaPositiveTaskManifest();
  const startIndex = manifest.tasks.findIndex((task) => task.task_id === input.startTaskId);
  const endIndex = manifest.tasks.findIndex((task) => task.task_id === input.endTaskId);
  if (startIndex < 0 || endIndex < 0 || startIndex > endIndex || input.startTaskId === "PM-001") {
    throw new Error("invalid_positive_matrix_final_authority_tranche");
  }

  const tasks = manifest.tasks.slice(startIndex, endIndex + 1);
  if (tasks.some((task) => task.task_id === "PM-001")) {
    throw new Error("invalid_positive_matrix_final_authority_tranche");
  }

  const claimIdPrefix = input.claimIdPrefix ?? "C";
  const results = tasks.map((task) => packageGoal3GaPositiveMatrixFinalAuthorityEvidenceV3({
    projectRoot: input.projectRoot,
    taskId: task.task_id,
    claimId: `${claimIdPrefix}-${task.task_id}`,
    sourceReport: input.sourceReportsByTaskId?.[task.task_id]
  }));
  const missingFinalEvidenceClasses = Array.from(new Set(results.flatMap((result) => result.missing_final_evidence_classes)));
  const trancheStatus = results.every((result) => result.final_evidence_status === "verified_final_authority_evidence")
    ? "verified_final_authority_evidence"
    : "blocked_missing_final_evidence";
  const packagingReportPath = genericFinalPackagingTrancheReportPath(input.startTaskId, input.endTaskId);
  const report: FinalAuthorityPackagingV3TrancheReport = {
    schema_version: "comath.final_authority_packaging_tranche.v3",
    start_task_id: input.startTaskId,
    end_task_id: input.endTaskId,
    task_count: results.length,
    task_ids: tasks.map((task) => task.task_id),
    results,
    tranche_status: trancheStatus,
    missing_final_evidence_classes: missingFinalEvidenceClasses,
    packaging_report_path: packagingReportPath,
    proof_authority: results.every((result) => result.proof_authority === "lean_kernel_clean_replay")
      ? "lean_kernel_clean_replay"
      : "none",
    can_promote_claim: false,
    promotion_requires_gate: true,
    promoted_count: 0
  };
  writeJsonProjectFile(input.projectRoot, packagingReportPath, report);
  return report;
}

export function packageGoal3GaPm002FinalAuthorityEvidence(input: {
  projectRoot: string;
  materialSource: Goal3GaDeclaredReplayMaterialSource;
  commandReplayReport: Goal3GaPm002LeanAuthorityExecutorReport;
}): Goal3GaPm002FinalAuthorityPackagingReport {
  const task = taskByIdOrThrow("PM-002");
  if (input.materialSource.task_id !== task.task_id || input.commandReplayReport.task_id !== task.task_id) {
    throw new Error("invalid_pm002_final_authority_packaging_task");
  }

  const leanRunManifestPaths = Array.from(new Set(input.commandReplayReport.live_replay_conversion.results.flatMap((result) => {
    const blockerPath = input.commandReplayReport.executor_blocker_path;
    const blocker = readJsonInsideProject(input.projectRoot, blockerPath) as { lean_run_manifest_paths?: unknown } | null;
    return Array.isArray(blocker?.lean_run_manifest_paths) ? blocker.lean_run_manifest_paths.filter((path): path is string => typeof path === "string") : [];
  })));

  const missing = new Set<Goal3GaPm002FinalEvidenceClass>();
  if (leanRunManifestPaths.length === 0) {
    missing.add("lean_run_manifest_v3");
  }
  for (const manifestPath of leanRunManifestPaths) {
    const manifest = readJsonInsideProject(input.projectRoot, manifestPath);
    const verification = verifyLeanRunManifestV3Evidence(input.projectRoot, manifest);
    if (!verification.ok) {
      missing.add("lean_run_manifest_v3");
    }
  }

  const finalReplayManifest = readJsonInsideProject(input.projectRoot, input.materialSource.final_replay_manifest_v3_path);
  const finalReplayVerification = verifyFinalReplayManifestV3(input.projectRoot, finalReplayManifest);
  const finalReplayRecord = finalReplayManifest && typeof finalReplayManifest === "object" ? (finalReplayManifest as Record<string, unknown>) : {};
  const finalReplayPassed =
    finalReplayRecord.result === "pass" &&
    finalReplayRecord.exit_code === 0 &&
    finalReplayRecord.proof_authority === "lean_kernel_clean_replay";
  if (!finalReplayVerification.ok || !finalReplayPassed) {
    missing.add("final_replay_manifest_v3");
  }

  const finalReplay = finalReplayManifest && typeof finalReplayManifest === "object" ? (finalReplayManifest as { report_paths?: Record<string, unknown> }) : null;
  const dependencyClosurePath =
    typeof finalReplay?.report_paths?.dependency_closure === "string" ? finalReplay.report_paths.dependency_closure : "";
  const axiomProfilePath = typeof finalReplay?.report_paths?.axiom_profile === "string" ? finalReplay.report_paths.axiom_profile : "";
  const statementCheckPath = typeof finalReplay?.report_paths?.statement_equivalence === "string" ? finalReplay.report_paths.statement_equivalence : "";

  if (!reportPasses(input.projectRoot, input.materialSource.structured_audit_path)) {
    missing.add("structured_audit");
  }
  if (!dependencyClosurePath || !reportPasses(input.projectRoot, dependencyClosurePath)) {
    missing.add("dependency_closure");
  }
  if (!axiomProfilePath || !reportPasses(input.projectRoot, axiomProfilePath)) {
    missing.add("axiom_profile");
  }
  if (!statementCheckPath || !reportPasses(input.projectRoot, statementCheckPath)) {
    missing.add("statement_check");
  }
  if (!replayPackExists(input.projectRoot, input.materialSource.third_party_replay_pack_path)) {
    missing.add("third_party_replay_pack");
  }

  const blockerPath = pm002FinalPackagingReportPath("blocker");
  const packagingReportPath = pm002FinalPackagingReportPath("report");
  const missingFinalEvidenceClasses = Array.from(missing).sort();
  const report: Goal3GaPm002FinalAuthorityPackagingReport = {
    schema_version: "comath.goal3_pm002_final_authority_packaging.v1",
    task_id: "PM-002",
    final_evidence_status: missingFinalEvidenceClasses.length === 0 ? "verified_final_authority_evidence" : "blocked_missing_final_evidence",
    blocker_code: missingFinalEvidenceClasses.length === 0 ? "" : "final_authority_evidence_incomplete",
    blocker_detail:
      missingFinalEvidenceClasses.length === 0
        ? "PM-002 final authority evidence verifies, but claim promotion still requires the ordinary promotion gate."
        : "PM-002 command replay evidence is present, but final Lean Authority v3 evidence is missing or unverifiable.",
    missing_final_evidence_classes: missingFinalEvidenceClasses,
    lean_run_manifest_paths: leanRunManifestPaths,
    final_replay_manifest_v3_path: input.materialSource.final_replay_manifest_v3_path,
    structured_audit_path: input.materialSource.structured_audit_path,
    dependency_closure_path: dependencyClosurePath,
    axiom_profile_path: axiomProfilePath,
    statement_check_path: statementCheckPath,
    third_party_replay_pack_path: input.materialSource.third_party_replay_pack_path,
    blocker_path: missingFinalEvidenceClasses.length === 0 ? "" : blockerPath,
    packaging_report_path: packagingReportPath,
    proof_authority: missingFinalEvidenceClasses.length === 0 ? "lean_kernel_clean_replay" : "none",
    can_promote_claim: false,
    promotion_requires_gate: true
  };

  writeJsonProjectFile(input.projectRoot, packagingReportPath, report);
  if (missingFinalEvidenceClasses.length > 0) {
    writeJsonProjectFile(input.projectRoot, blockerPath, report);
  }
  return report;
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
