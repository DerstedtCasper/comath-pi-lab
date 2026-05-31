import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { assertPathAllowed } from "../../security/path-policy.js";
import {
  extractLeanStatementSignature,
  extractLeanTheoremDeclarationSignature,
  type LeanStatementSignature
} from "./statement-signature.js";
import { hasVerifiedServiceOwnedLeanEquivalenceEvidence } from "../ensemble/service-owned-lean-evidence.js";

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
    kind:
      | "registered_definitional_alias"
      | "registered_logical_equivalence"
      | "registered_transitive_logical_equivalence";
    formal_spec_statement: string;
    equivalent_signature: string;
    justification: string;
    witness_kind?: "lean_kernel_checked_equivalence";
    witness_artifact_id?: string;
    witness_artifact_sha256?: string;
    witness_artifact_path?: string;
    lemma_names?: string[];
    transitive_links?: StatementRegisteredLogicalEquivalence[];
  };
  equivalence_search_plan_path?: string;
  equivalence_search_plan_status?: "blocked_unproved";
  signature_matches: string[];
  hard_vetoes: string[];
};

export type StatementEquivalenceSearchPlan = {
  result: "blocked_unproved";
  proof_authority: "none";
  can_promote_claim: false;
  locked_statement_hash: string;
  formal_spec_statement: string;
  target_signature: LeanStatementSignature;
  theorem_name: string;
  candidate_lemma_names: string[];
  required_next_artifacts: [
    "lean_kernel_checked_equivalence",
    "witness_artifact_id",
    "witness_artifact_sha256",
    "lemma_names"
  ];
  obligations: Array<{
    kind: "prove_statement_equivalence";
    status: "blocked_unproved";
    source_signature: string;
    target_signature: string;
    candidate_lemma_names: string[];
    proof_authority: "none";
    can_promote_claim: false;
  }>;
};

export type StatementEquivalenceWitnessMaterialization = {
  result: "materialized_registered_logical_equivalence_witness";
  proof_authority: "none";
  can_promote_claim: false;
  source_plan_path: string;
  locked_statement_hash: string;
  formal_spec_statement: string;
  equivalent_signature: string;
  witness_kind: "lean_kernel_checked_equivalence";
  witness_artifact_id: string;
  witness_artifact_sha256: string;
  witness_artifact_path?: string;
  lemma_names: string[];
  justification: string;
  required_final_authority: readonly [
    "final_static_audit",
    "statement_equivalence_report",
    "dependency_closure",
    "axiom_profile",
    "final_clean_lean_replay"
  ];
};

export type StatementDefinitionalAlias = {
  formal_spec_statement: string;
  equivalent_signature: string;
  justification: string;
};

export type StatementRegisteredLogicalEquivalence = {
  formal_spec_statement: string;
  equivalent_signature: string;
  witness_kind: "lean_kernel_checked_equivalence";
  witness_artifact_id: string;
  witness_artifact_sha256: string;
  witness_artifact_path?: string;
  lemma_names: string[];
  justification: string;
};

export type StatementRegisteredTransitiveLogicalEquivalence = {
  formal_spec_statement: string;
  equivalent_signature: string;
  links: StatementRegisteredLogicalEquivalence[];
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

function isSha256Digest(value: string): boolean {
  return /^sha256:[0-9a-f]{64}$/i.test(value.trim());
}

function equivalenceEvidenceRef(equivalence: StatementRegisteredLogicalEquivalence): string | undefined {
  if (!equivalence.witness_artifact_path?.trim()) {
    return undefined;
  }
  return `equivalence_lean_run_manifest:${equivalence.witness_artifact_path.trim()}`;
}

function isValidLogicalEquivalenceLink(input: {
  equivalence: StatementRegisteredLogicalEquivalence;
  projectRoot: string;
  campaignId?: string;
  claimId?: string;
  candidateId?: string;
}): boolean {
  const evidenceRef = equivalenceEvidenceRef(input.equivalence);
  return (
    input.equivalence.witness_kind === "lean_kernel_checked_equivalence" &&
    input.equivalence.witness_artifact_id.trim().length > 0 &&
    isSha256Digest(input.equivalence.witness_artifact_sha256) &&
    input.equivalence.lemma_names.length > 0 &&
    input.equivalence.lemma_names.every((name) => name.trim().length > 0) &&
    Boolean(evidenceRef) &&
    Boolean(input.campaignId) &&
    Boolean(input.claimId) &&
    hasVerifiedServiceOwnedLeanEquivalenceEvidence({
      projectRoot: input.projectRoot,
      campaignId: input.campaignId ?? "",
      claimId: input.claimId ?? "",
      candidateId: input.candidateId,
      evidence: [evidenceRef!]
    })
  );
}

function normalizeSafeLeanNameHints(hints?: string[]): string[] {
  const safeLeanName = /^[A-Za-z_][A-Za-z0-9_']*(?:\.[A-Za-z_][A-Za-z0-9_']*)*$/;
  const normalized: string[] = [];
  for (const hint of hints ?? []) {
    const trimmed = hint.trim();
    if (!trimmed || !safeLeanName.test(trimmed) || normalized.includes(trimmed)) {
      continue;
    }
    normalized.push(trimmed);
  }
  return normalized;
}

function writeStatementEquivalenceSearchPlan(input: {
  projectRoot: string;
  planPath: string;
  locked_statement_hash: string;
  formal_spec_statement: string;
  target_signature: LeanStatementSignature;
  theorem_name: string;
  candidate_lemma_names: string[];
}): StatementEquivalenceSearchPlan {
  const plan: StatementEquivalenceSearchPlan = {
    result: "blocked_unproved",
    proof_authority: "none",
    can_promote_claim: false,
    locked_statement_hash: input.locked_statement_hash,
    formal_spec_statement: input.formal_spec_statement,
    target_signature: input.target_signature,
    theorem_name: input.theorem_name,
    candidate_lemma_names: input.candidate_lemma_names,
    required_next_artifacts: [
      "lean_kernel_checked_equivalence",
      "witness_artifact_id",
      "witness_artifact_sha256",
      "lemma_names"
    ],
    obligations: [
      {
        kind: "prove_statement_equivalence",
        status: "blocked_unproved",
        source_signature: input.formal_spec_statement,
        target_signature: input.target_signature.normalized_signature,
        candidate_lemma_names: input.candidate_lemma_names,
        proof_authority: "none",
        can_promote_claim: false
      }
    ]
  };

  const path = assertPathAllowed(input.projectRoot, input.planPath, { purpose: "runtime-write" });
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  return plan;
}

function sha256Json(value: unknown): string {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function readStatementEquivalenceSearchPlan(projectRoot: string, planPath: string): StatementEquivalenceSearchPlan {
  const path = assertPathAllowed(projectRoot, planPath, { purpose: "read" });
  const parsed = JSON.parse(readFileSync(path, "utf8")) as StatementEquivalenceSearchPlan;
  if (parsed.result !== "blocked_unproved" || parsed.proof_authority !== "none" || parsed.can_promote_claim !== false) {
    throw new Error("plan must be non-authoritative and blocked_unproved");
  }
  const expectedNextArtifacts: StatementEquivalenceSearchPlan["required_next_artifacts"] = [
    "lean_kernel_checked_equivalence",
    "witness_artifact_id",
    "witness_artifact_sha256",
    "lemma_names"
  ];
  if (
    !parsed.target_signature ||
    !parsed.target_signature.normalized_signature ||
    parsed.obligations.length !== 1 ||
    parsed.obligations[0]?.kind !== "prove_statement_equivalence" ||
    parsed.obligations[0]?.status !== "blocked_unproved" ||
    normalizeStatement(parsed.obligations[0].source_signature) !== normalizeStatement(parsed.formal_spec_statement) ||
    normalizeStatement(parsed.obligations[0].target_signature) !==
      normalizeStatement(parsed.target_signature.normalized_signature)
  ) {
    throw new Error("plan target binding is invalid");
  }
  const obligation = parsed.obligations[0];
  if (
    parsed.required_next_artifacts.length !== expectedNextArtifacts.length ||
    !expectedNextArtifacts.every((artifact, index) => parsed.required_next_artifacts[index] === artifact) ||
    obligation.candidate_lemma_names.length !== parsed.candidate_lemma_names.length ||
    !parsed.candidate_lemma_names.every((name, index) => obligation.candidate_lemma_names[index] === name) ||
    obligation.proof_authority !== "none" ||
    obligation.can_promote_claim !== false
  ) {
    throw new Error("plan witness requirements are invalid");
  }
  return parsed;
}

export function materializeStatementEquivalenceSearchPlan(input: {
  projectRoot: string;
  planPath: string;
  witnessArtifactPath: string;
  witnessArtifactId: string;
  allowed_materializations: Array<{
    formal_spec_statement: string;
    equivalent_signature: string;
    witness_kind: "lean_kernel_checked_equivalence";
    witness_artifact_path?: string;
    lemma_names: string[];
    justification: string;
  }>;
}): StatementRegisteredLogicalEquivalence {
  const plan = readStatementEquivalenceSearchPlan(input.projectRoot, input.planPath);
  const witnessArtifactId = input.witnessArtifactId.trim();
  if (!witnessArtifactId) {
    throw new Error("witness artifact id is required");
  }
  const planHints = normalizeSafeLeanNameHints(plan.candidate_lemma_names);
  if (planHints.length !== plan.candidate_lemma_names.length) {
    throw new Error("plan contains unsafe lemma hints");
  }

  const materialization = input.allowed_materializations.find(
    (candidate) =>
      candidate.witness_kind === "lean_kernel_checked_equivalence" &&
      normalizeStatement(candidate.formal_spec_statement) === normalizeStatement(plan.formal_spec_statement) &&
      normalizeStatement(candidate.equivalent_signature) === normalizeStatement(plan.target_signature.normalized_signature) &&
      normalizeSafeLeanNameHints(candidate.lemma_names).length === candidate.lemma_names.length &&
      candidate.lemma_names.length > 0 &&
      candidate.lemma_names.every((name) => planHints.includes(name.trim()))
  );
  if (!materialization) {
    throw new Error("no allowed bounded materialization matches plan");
  }

  const artifactBase = {
    result: "materialized_registered_logical_equivalence_witness" as const,
    proof_authority: "none" as const,
    can_promote_claim: false as const,
    source_plan_path: input.planPath.replace(/\\/g, "/"),
    locked_statement_hash: plan.locked_statement_hash,
    formal_spec_statement: plan.formal_spec_statement,
    equivalent_signature: plan.target_signature.normalized_signature,
    witness_kind: "lean_kernel_checked_equivalence" as const,
    witness_artifact_id: witnessArtifactId,
    ...(materialization.witness_artifact_path ? { witness_artifact_path: materialization.witness_artifact_path } : {}),
    lemma_names: materialization.lemma_names.map((name) => name.trim()),
    justification: materialization.justification,
    required_final_authority: [
      "final_static_audit",
      "statement_equivalence_report",
      "dependency_closure",
      "axiom_profile",
      "final_clean_lean_replay"
    ] as const
  };
  const artifact: StatementEquivalenceWitnessMaterialization = {
    ...artifactBase,
    witness_artifact_sha256: sha256Json(artifactBase)
  };

  const path = assertPathAllowed(input.projectRoot, input.witnessArtifactPath, { purpose: "runtime-write" });
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");

  return {
    formal_spec_statement: artifact.formal_spec_statement,
    equivalent_signature: artifact.equivalent_signature,
    witness_kind: artifact.witness_kind,
    witness_artifact_id: artifact.witness_artifact_id,
    witness_artifact_sha256: artifact.witness_artifact_sha256,
    ...(artifact.witness_artifact_path ? { witness_artifact_path: artifact.witness_artifact_path } : {}),
    lemma_names: artifact.lemma_names,
    justification: artifact.justification
  };
}

function findLogicalEquivalenceWitness(input: {
  equivalences: StatementRegisteredLogicalEquivalence[];
  normalizedExpected: string;
  normalizedActual: string;
  projectRoot: string;
  campaignId?: string;
  claimId?: string;
  candidateId?: string;
}): StatementEquivalenceReport["equivalence_witness"] | undefined {
  const witness = input.equivalences.find(
    (equivalence) =>
      normalizeStatement(equivalence.formal_spec_statement) === input.normalizedExpected &&
      normalizeStatement(equivalence.equivalent_signature) === input.normalizedActual &&
      isValidLogicalEquivalenceLink({
        equivalence,
        projectRoot: input.projectRoot,
        campaignId: input.campaignId,
        claimId: input.claimId,
        candidateId: input.candidateId
      })
  );
  if (!witness) {
    return undefined;
  }
  return {
    kind: "registered_logical_equivalence",
    formal_spec_statement: witness.formal_spec_statement,
    equivalent_signature: witness.equivalent_signature,
    justification: witness.justification,
    witness_kind: witness.witness_kind,
    witness_artifact_id: witness.witness_artifact_id,
    witness_artifact_sha256: witness.witness_artifact_sha256,
    witness_artifact_path: witness.witness_artifact_path,
    lemma_names: witness.lemma_names
  };
}

function findTransitiveLogicalEquivalenceWitness(input: {
  equivalences: StatementRegisteredTransitiveLogicalEquivalence[];
  normalizedExpected: string;
  normalizedActual: string;
  projectRoot: string;
  campaignId?: string;
  claimId?: string;
  candidateId?: string;
}): StatementEquivalenceReport["equivalence_witness"] | undefined {
  for (const equivalence of input.equivalences) {
    if (
      normalizeStatement(equivalence.formal_spec_statement) !== input.normalizedExpected ||
      normalizeStatement(equivalence.equivalent_signature) !== input.normalizedActual ||
      equivalence.links.length < 2
    ) {
      continue;
    }

    let current = input.normalizedExpected;
    const lemmaNames: string[] = [];
    let valid = true;
    for (const link of equivalence.links) {
      if (
        normalizeStatement(link.formal_spec_statement) !== current ||
        !isValidLogicalEquivalenceLink({
          equivalence: link,
          projectRoot: input.projectRoot,
          campaignId: input.campaignId,
          claimId: input.claimId,
          candidateId: input.candidateId
        })
      ) {
        valid = false;
        break;
      }
      current = normalizeStatement(link.equivalent_signature);
      lemmaNames.push(...link.lemma_names);
    }

    if (!valid || current !== input.normalizedActual) {
      continue;
    }

    return {
      kind: "registered_transitive_logical_equivalence",
      formal_spec_statement: equivalence.formal_spec_statement,
      equivalent_signature: equivalence.equivalent_signature,
      justification: equivalence.justification,
      lemma_names: lemmaNames,
      transitive_links: equivalence.links
    };
  }

  return undefined;
}

export function checkStatementEquivalence(input: {
  projectRoot: string;
  campaign_id?: string;
  claim_id?: string;
  candidate_id?: string;
  reportPath: string;
  locked_statement_hash: string;
  formal_spec_statement: string;
  lean_check_output: string;
  lean_source?: string;
  theorem_name: string;
  allowed_definitional_aliases?: StatementDefinitionalAlias[];
  allowed_registered_logical_equivalences?: StatementRegisteredLogicalEquivalence[];
  allowed_registered_transitive_logical_equivalences?: StatementRegisteredTransitiveLogicalEquivalence[];
  equivalence_search_plan_path?: string;
  equivalence_search_hints?: string[];
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
  const logicalEquivalenceWitness =
    target.result === "ok" && !aliasWitness
      ? findLogicalEquivalenceWitness({
          equivalences: input.allowed_registered_logical_equivalences ?? [],
          normalizedExpected,
          normalizedActual: target.signature.normalized_signature,
          projectRoot: input.projectRoot,
          campaignId: input.campaign_id,
          claimId: input.claim_id,
          candidateId: input.candidate_id
        })
      : undefined;
  const transitiveLogicalEquivalenceWitness =
    target.result === "ok" && !aliasWitness && !logicalEquivalenceWitness
      ? findTransitiveLogicalEquivalenceWitness({
          equivalences: input.allowed_registered_transitive_logical_equivalences ?? [],
          normalizedExpected,
          normalizedActual: target.signature.normalized_signature,
          projectRoot: input.projectRoot,
          campaignId: input.campaign_id,
          claimId: input.claim_id,
          candidateId: input.candidate_id
        })
      : undefined;
  const accepted =
    exact || Boolean(aliasWitness) || Boolean(logicalEquivalenceWitness) || Boolean(transitiveLogicalEquivalenceWitness);
  const hard_vetoes =
    target.result === "missing"
      ? ["missing_target_check_output"]
      : target.result === "ambiguous"
        ? ["ambiguous_target_check_output"]
        : accepted
          ? []
          : ["statement_signature_mismatch", "statement_drift"];
  const searchHints = normalizeSafeLeanNameHints(input.equivalence_search_hints);
  const shouldWriteSearchPlan =
    target.result === "ok" && !accepted && Boolean(input.equivalence_search_plan_path) && searchHints.length > 0;
  if (shouldWriteSearchPlan && input.equivalence_search_plan_path) {
    writeStatementEquivalenceSearchPlan({
      projectRoot: input.projectRoot,
      planPath: input.equivalence_search_plan_path,
      locked_statement_hash: input.locked_statement_hash,
      formal_spec_statement: input.formal_spec_statement,
      target_signature: target.signature,
      theorem_name: input.theorem_name,
      candidate_lemma_names: searchHints
    });
  }
  const report: StatementEquivalenceReport = {
    result: hard_vetoes.length === 0 ? "pass" : "fail",
    status: exact
      ? "exact"
      : aliasWitness
        ? "definitionally_equivalent"
        : logicalEquivalenceWitness
          ? "logically_equivalent_with_registered_lemmas"
          : transitiveLogicalEquivalenceWitness
            ? "logically_equivalent_with_registered_lemmas"
            : "different",
    locked_statement_hash: input.locked_statement_hash,
    formal_spec_statement: input.formal_spec_statement,
    lean_check_output: input.lean_check_output,
    theorem_name: input.theorem_name,
    signature_source: signatureSource,
    ...(target.result === "ok" ? { target_signature: target.signature } : {}),
    ...(aliasWitness ? { equivalence_witness: aliasWitness } : {}),
    ...(logicalEquivalenceWitness ? { equivalence_witness: logicalEquivalenceWitness } : {}),
    ...(transitiveLogicalEquivalenceWitness ? { equivalence_witness: transitiveLogicalEquivalenceWitness } : {}),
    ...(shouldWriteSearchPlan && input.equivalence_search_plan_path
      ? {
          equivalence_search_plan_path: input.equivalence_search_plan_path.replace(/\\/g, "/"),
          equivalence_search_plan_status: "blocked_unproved" as const
        }
      : {}),
    signature_matches: target.matches,
    hard_vetoes
  };
  const path = assertPathAllowed(input.projectRoot, input.reportPath, { purpose: "runtime-write" });
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}
