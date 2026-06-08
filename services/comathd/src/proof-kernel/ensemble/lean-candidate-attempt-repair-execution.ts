import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { assertPathAllowed } from "../../security/path-policy.js";
import type { ProofObligation, ResearchCampaign } from "../../types/schemas.js";
import { sha256FileSync } from "../lean/lean-project.js";
import type { LeanCandidateAttemptRepairBatch } from "./lean-candidate-attempt-repair.js";

export type LeanCandidateAttemptRepairExecution = {
  schema_version: "comath.pi_goal_mode_lean_candidate_attempt_repair_execution.v1";
  campaign_id: string;
  project_id: string;
  claim_id: string;
  obligation_id: string;
  locked_statement_hash: string;
  execution_result: "repaired_attempts_materialized";
  source_repair_batch: {
    path: string;
    sha256: string;
    proof_authority: "none";
  };
  source_feedback_batch?: {
    path: string;
    sha256: string;
    proof_authority: "none";
  };
  source_repair_hint_bundle?: {
    path: string;
    sha256: string;
    proof_authority: "none";
  };
  source_repair_hint_execution?: {
    path: string;
    sha256: string;
    proof_authority: "none";
  };
  repair_iteration: number;
  repaired_candidate_count: number;
  repaired_attempts_materialized: true;
  repaired_attempts_ready_for_preflight: number;
  repaired_placeholder_free_candidate_count: number;
  per_candidate_executions: Array<{
    candidate_id: string;
    variant_id: string;
    repair_task_path: string;
    repair_execution_path: string;
    repair_input_snapshot_path: string;
    repaired_lean_file_path: string;
    original_lean_file_sha256: string;
    repaired_lean_file_sha256: string;
    source_feedback_batch?: {
      path: string;
      sha256: string;
      proof_authority: "none";
    };
    source_feedback?: Record<string, unknown>;
    source_repair_hint_bundle?: {
      path: string;
      sha256: string;
      proof_authority: "none";
    };
    source_repair_hints?: Record<string, unknown>[];
    source_repair_hint_execution?: {
      path: string;
      sha256: string;
      proof_authority: "none";
    };
    source_repair_hint_results?: Record<string, unknown>[];
    feedback_guided_revision_applied?: boolean;
    hint_guided_revision_applied?: boolean;
    hint_execution_guided_revision_applied?: boolean;
    placeholder_free_repair_materialized: boolean;
    placeholder_free_repair_strategy: PlaceholderFreeRepairStrategy | null;
    original_had_sorry: boolean;
    repaired_has_sorry: false;
    repair_placeholder_present: boolean;
    proof_authority: "none";
    can_promote_claim: false;
    result_can_be_used_as_proof: false;
  }>;
  next_stage: "candidate_verification";
  lean_runner_invocations: 0;
  lean_run_manifest_paths: string[];
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
  result_can_be_used_as_proof: false;
  created_at: string;
};

type PlaceholderFreeRepairStrategy =
  | "locked_true_theorem_trivial"
  | "locked_reflexive_equality_rfl"
  | "live_retrieval_exact_statement_lean_suggestion"
  | "live_theorem_search_and_intro_conjunction_repair"
  | "live_computation_sympy_true_decide_repair";

export type ExecuteLeanCandidateAttemptRepairBatchResult = {
  execution: LeanCandidateAttemptRepairExecution;
  execution_path: string;
  artifact_paths: string[];
};

function normalizedRel(path: string): string {
  return path.replace(/\\/g, "/");
}

function campaignRel(campaign: ResearchCampaign, rel: string): string {
  return normalizedRel(join(".comath", "campaign", campaign.campaign_id, rel));
}

function writeJson(projectRoot: string, relativePath: string, value: unknown): string {
  const path = assertPathAllowed(projectRoot, relativePath, { purpose: "runtime-write" });
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return path;
}

function writeText(projectRoot: string, relativePath: string, value: string): string {
  const path = assertPathAllowed(projectRoot, relativePath, { purpose: "runtime-write" });
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value, "utf8");
  return path;
}

function readText(projectRoot: string, relativePath: string): string {
  return readFileSync(assertPathAllowed(projectRoot, relativePath, { purpose: "read", resolveRealpath: true }), "utf8");
}

function sha256RuntimeFile(projectRoot: string, relativePath: string): string {
  const path = assertPathAllowed(projectRoot, relativePath, { purpose: "read", resolveRealpath: true });
  return sha256FileSync(path).sha256;
}

function stripLeanLineComments(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const index = line.indexOf("--");
      return index >= 0 ? line.slice(0, index) : line;
    })
    .join("\n");
}

function hasSorry(text: string): boolean {
  return /(?:^|[^A-Za-z0-9_'])sorry(?:[^A-Za-z0-9_']|$)/u.test(stripLeanLineComments(text));
}

function hasLeanHole(text: string): boolean {
  return /(?:^|[^A-Za-z0-9_'])\?[A-Za-z_][A-Za-z0-9_']*/u.test(stripLeanLineComments(text));
}

function hasForbiddenSuggestionCode(text: string): boolean {
  const code = stripLeanLineComments(text);
  return (
    hasSorry(text) ||
    hasLeanHole(text) ||
    /\b(?:axiom|unsafe|opaque|admit|run_cmd|elab)\b/u.test(code) ||
    /^\s*#eval\b/mu.test(code) ||
    /^\s*set_option\b/mu.test(code)
  );
}

function hasLockedTrueTheoremWithSorry(text: string): boolean {
  const code = stripLeanLineComments(text);
  return /\b(?:theorem|lemma)\s+[A-Za-z_][A-Za-z0-9_'.]*(?:\.[A-Za-z_][A-Za-z0-9_'.]*)*[\s\S]*?:\s*True\s*:=\s*by[\s\S]*\bsorry\b/u.test(
    code
  );
}

function theoremStatementsWithSorry(text: string): string[] {
  const code = stripLeanLineComments(text);
  const matches = code.matchAll(
    /\b(?:theorem|lemma)\s+[A-Za-z_][A-Za-z0-9_'.]*(?:\.[A-Za-z_][A-Za-z0-9_'.]*)*(?<signature>[\s\S]*?)\s*:=\s*by[\s\S]*?\bsorry\b/gu
  );
  const statements: string[] = [];
  for (const match of matches) {
    const signature = match.groups?.signature;
    if (!signature) {
      continue;
    }
    const statementColon = topLevelColonIndex(signature);
    if (statementColon < 0) {
      continue;
    }
    const statement = signature.slice(statementColon + 1).trim();
    if (statement.length > 0) {
      statements.push(statement);
    }
  }
  return statements;
}

function topLevelLeanEquality(statement: string): { lhs: string; rhs: string } | undefined {
  let parenDepth = 0;
  let squareDepth = 0;
  let braceDepth = 0;
  const equalityIndexes: number[] = [];
  for (let index = 0; index < statement.length; index += 1) {
    const char = statement[index];
    if (char === "(") {
      parenDepth += 1;
      continue;
    }
    if (char === ")") {
      parenDepth = Math.max(0, parenDepth - 1);
      continue;
    }
    if (char === "[") {
      squareDepth += 1;
      continue;
    }
    if (char === "]") {
      squareDepth = Math.max(0, squareDepth - 1);
      continue;
    }
    if (char === "{") {
      braceDepth += 1;
      continue;
    }
    if (char === "}") {
      braceDepth = Math.max(0, braceDepth - 1);
      continue;
    }
    if (char !== "=" || parenDepth !== 0 || squareDepth !== 0 || braceDepth !== 0) {
      continue;
    }
    const previous = statement[index - 1] ?? "";
    const next = statement[index + 1] ?? "";
    if (previous === ":" || previous === "<" || previous === ">" || previous === "=" || next === ">" || next === "=") {
      continue;
    }
    equalityIndexes.push(index);
  }
  if (equalityIndexes.length !== 1) {
    return undefined;
  }
  const [equalityIndex] = equalityIndexes;
  const lhs = statement.slice(0, equalityIndex).trim();
  const rhs = statement.slice(equalityIndex + 1).trim();
  return lhs.length > 0 && rhs.length > 0 ? { lhs, rhs } : undefined;
}

function normalizeReflexiveEqualitySide(side: string): string {
  return side.trim().replace(/\s+/gu, " ");
}

function normalizeLeanStatementText(text: string): string {
  return text.trim().replace(/\s+/gu, " ");
}

function topLevelColonIndex(signature: string): number {
  let parenDepth = 0;
  let squareDepth = 0;
  let braceDepth = 0;
  let colonIndex = -1;
  for (let index = 0; index < signature.length; index += 1) {
    const char = signature[index];
    if (char === "(") {
      parenDepth += 1;
      continue;
    }
    if (char === ")") {
      parenDepth = Math.max(0, parenDepth - 1);
      continue;
    }
    if (char === "[") {
      squareDepth += 1;
      continue;
    }
    if (char === "]") {
      squareDepth = Math.max(0, squareDepth - 1);
      continue;
    }
    if (char === "{") {
      braceDepth += 1;
      continue;
    }
    if (char === "}") {
      braceDepth = Math.max(0, braceDepth - 1);
      continue;
    }
    if (char === ":" && parenDepth === 0 && squareDepth === 0 && braceDepth === 0) {
      colonIndex = index;
    }
  }
  return colonIndex;
}

type ParsedLeanDeclaration = {
  declarationKind: "theorem" | "lemma";
  declarationName: string;
  normalizedStatement: string;
  start: number;
  end: number;
  fullText: string;
};

function parseFirstLeanDeclaration(text: string): ParsedLeanDeclaration | null {
  const match =
    /\b(?<kind>theorem|lemma)\s+(?<name>[A-Za-z_][A-Za-z0-9_'.]*(?:\.[A-Za-z_][A-Za-z0-9_'.]*)*)(?<signature>[\s\S]*?)\s*:=\s*by[\s\S]*$/u.exec(
      text
    );
  if (!match?.groups || match.index === undefined) {
    return null;
  }
  const signature = match.groups.signature ?? "";
  const statementColon = topLevelColonIndex(signature);
  if (statementColon < 0) {
    return null;
  }
  const normalizedStatement = normalizeLeanStatementText(signature.slice(statementColon + 1));
  if (normalizedStatement.length === 0) {
    return null;
  }
  return {
    declarationKind: match.groups.kind as "theorem" | "lemma",
    declarationName: match.groups.name ?? "",
    normalizedStatement,
    start: match.index,
    end: match.index + match[0].length,
    fullText: match[0]
  };
}

function hasLockedReflexiveEqualityTheoremWithSorry(text: string): boolean {
  for (const statement of theoremStatementsWithSorry(text)) {
    const equality = topLevelLeanEquality(statement);
    if (!equality) {
      continue;
    }
    if (normalizeReflexiveEqualitySide(equality.lhs) === normalizeReflexiveEqualitySide(equality.rhs)) {
      return true;
    }
  }
  return false;
}

function placeholderFreeRepairStrategy(text: string): PlaceholderFreeRepairStrategy | null {
  if (hasLockedTrueTheoremWithSorry(text)) {
    return "locked_true_theorem_trivial";
  }
  if (hasLockedReflexiveEqualityTheoremWithSorry(text)) {
    return "locked_reflexive_equality_rfl";
  }
  return null;
}

function placeholderFreeRepairReplacement(strategy: PlaceholderFreeRepairStrategy | null): string | undefined {
  if (strategy === "locked_true_theorem_trivial") {
    return "trivial";
  }
  if (strategy === "locked_reflexive_equality_rfl") {
    return "rfl";
  }
  return undefined;
}

function replaceLeanSorryTokens(text: string, replacement: string): string {
  return text
    .split(/(\r?\n)/)
    .map((part) => {
      if (part === "\n" || part === "\r\n") {
        return part;
      }
      const commentIndex = part.indexOf("--");
      const code = commentIndex >= 0 ? part.slice(0, commentIndex) : part;
      const comment = commentIndex >= 0 ? part.slice(commentIndex) : "";
      return `${code.replace(/(^|[^A-Za-z0-9_'])sorry([^A-Za-z0-9_']|$)/gu, `$1${replacement}$2`)}${comment}`;
    })
    .join("");
}

function objectRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function sourceRepairHintResultsFromUnknownTask(task: Record<string, unknown>): Record<string, unknown>[] {
  const source = task.source_repair_hint_results;
  if (!Array.isArray(source)) {
    return [];
  }
  return source.filter(
    (item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item)
  );
}

function liveRetrievalSuggestionRepair(
  text: string,
  task: Record<string, unknown>
): { text: string; strategy: PlaceholderFreeRepairStrategy } | null {
  const current = parseFirstLeanDeclaration(text);
  if (!current) {
    return null;
  }
  for (const result of sourceRepairHintResultsFromUnknownTask(task)) {
    if (
      result.kind !== "retrieval" ||
      result.provider !== "jina_search" ||
      result.adapter_execution_state !== "live_provider_result_recorded" ||
      result.proof_authority !== "none" ||
      result.can_promote_claim !== false ||
      result.result_can_be_used_as_proof !== false
    ) {
      continue;
    }
    const summary = objectRecord(result.result_payload_summary);
    const liveProvider = objectRecord(summary?.live_provider);
    const promptInjectionScan = objectRecord(liveProvider?.prompt_injection_scan);
    if (promptInjectionScan?.status !== "pass") {
      continue;
    }
    const suggestions = Array.isArray(summary?.extracted_lean_suggestions) ? summary.extracted_lean_suggestions : [];
    for (const suggestionValue of suggestions) {
      const suggestion = objectRecord(suggestionValue);
      if (
        !suggestion ||
        suggestion.proof_authority !== "none" ||
        suggestion.can_promote_claim !== false ||
        suggestion.result_can_be_used_as_proof !== false ||
        typeof suggestion.lean_code !== "string" ||
        typeof suggestion.declaration_name !== "string" ||
        typeof suggestion.normalized_statement !== "string"
      ) {
        continue;
      }
      if (
        suggestion.declaration_name !== current.declarationName ||
        normalizeLeanStatementText(suggestion.normalized_statement) !== current.normalizedStatement ||
        hasForbiddenSuggestionCode(suggestion.lean_code)
      ) {
        continue;
      }
      const parsedSuggestion = parseFirstLeanDeclaration(suggestion.lean_code);
      if (
        !parsedSuggestion ||
        parsedSuggestion.declarationName !== current.declarationName ||
        parsedSuggestion.normalizedStatement !== current.normalizedStatement
      ) {
        continue;
      }
      return {
        text: `${text.slice(0, current.start)}${suggestion.lean_code.trimEnd()}${text.slice(current.end)}`,
        strategy: "live_retrieval_exact_statement_lean_suggestion"
      };
    }
  }
  return null;
}

function isLockedTrueConjunctionStatement(statement: string): boolean {
  return /^(?:True\s*\/\\\s*True|True\s*∧\s*True)$/u.test(normalizeLeanStatementText(statement));
}

function hasLiveLoogleAndIntroHint(task: Record<string, unknown>): boolean {
  for (const result of sourceRepairHintResultsFromUnknownTask(task)) {
    if (
      result.kind !== "theorem_search" ||
      result.provider !== "loogle" ||
      result.adapter_execution_state !== "live_provider_result_recorded" ||
      result.proof_authority !== "none" ||
      result.can_promote_claim !== false ||
      result.result_can_be_used_as_proof !== false
    ) {
      continue;
    }
    const summary = objectRecord(result.result_payload_summary);
    const liveProvider = objectRecord(summary?.live_provider);
    const promptInjectionScan = objectRecord(liveProvider?.prompt_injection_scan);
    if (promptInjectionScan?.status !== "pass") {
      continue;
    }
    const theoremResults = Array.isArray(summary?.results) ? summary.results : [];
    for (const theoremResultValue of theoremResults) {
      const theoremResult = objectRecord(theoremResultValue);
      if (
        theoremResult?.declaration_name === "And.intro" &&
        theoremResult.proof_authority === "none" &&
        theoremResult.can_promote_claim === false
      ) {
        return true;
      }
    }
  }
  return false;
}

function liveTheoremSearchConjunctionRepair(
  text: string,
  task: Record<string, unknown>
): { text: string; strategy: PlaceholderFreeRepairStrategy } | null {
  const current = parseFirstLeanDeclaration(text);
  if (!current || !isLockedTrueConjunctionStatement(current.normalizedStatement) || !hasLiveLoogleAndIntroHint(task)) {
    return null;
  }
  const repaired = [
    `${current.declarationKind} ${current.declarationName} : ${current.normalizedStatement} := by`,
    "  exact And.intro trivial trivial"
  ].join("\n");
  return {
    text: `${text.slice(0, current.start)}${repaired}${text.slice(current.end)}`,
    strategy: "live_theorem_search_and_intro_conjunction_repair"
  };
}

function isClosedDecidableArithmeticStatement(statement: string): boolean {
  const normalized = normalizeLeanStatementText(statement);
  if (!/\d/u.test(normalized) || !topLevelLeanEquality(normalized)) {
    return false;
  }
  if (/[∀∃λ]|->|→|↔|∧|∨|\b(?:forall|exists|fun|let|match|if|then|else|by|sorry|axiom|unsafe|opaque|admit)\b/u.test(normalized)) {
    return false;
  }
  const identifiers = normalized.match(/[A-Za-z_][A-Za-z0-9_'.]*/gu) ?? [];
  const allowedIdentifiers = new Set(["Nat", "Int", "Bool", "True", "False"]);
  return identifiers.every((identifier) => allowedIdentifiers.has(identifier));
}

function hasLiveSympyTrueComputationHint(task: Record<string, unknown>): boolean {
  for (const result of sourceRepairHintResultsFromUnknownTask(task)) {
    if (
      result.kind !== "computation" ||
      result.provider !== "sympy" ||
      result.adapter_execution_state !== "live_provider_result_recorded" ||
      result.proof_authority !== "none" ||
      result.can_promote_claim !== false ||
      result.result_can_be_used_as_proof !== false
    ) {
      continue;
    }
    const summary = objectRecord(result.result_payload_summary);
    const liveProvider = objectRecord(summary?.live_provider);
    const promptInjectionScan = objectRecord(liveProvider?.prompt_injection_scan);
    if (promptInjectionScan?.status !== "pass") {
      continue;
    }
    const report = objectRecord(summary?.report);
    const reportResult = objectRecord(report?.result);
    if (
      report?.proof_authority === "none" &&
      report.can_promote_claim === false &&
      report.exactness === "exact_symbolic" &&
      reportResult?.status === "live_provider_response_recorded" &&
      reportResult.provider_status === "ok" &&
      reportResult.normalized_expression === "True" &&
      (reportResult.prompt_injection_scan_status === undefined || reportResult.prompt_injection_scan_status === "pass")
    ) {
      return true;
    }
  }
  return false;
}

function liveComputationSympyTrueDecideRepair(
  text: string,
  task: Record<string, unknown>
): { text: string; strategy: PlaceholderFreeRepairStrategy } | null {
  const current = parseFirstLeanDeclaration(text);
  if (!current || !isClosedDecidableArithmeticStatement(current.normalizedStatement) || !hasLiveSympyTrueComputationHint(task)) {
    return null;
  }
  const repaired = [`${current.declarationKind} ${current.declarationName} : ${current.normalizedStatement} := by`, "  decide"].join("\n");
  return {
    text: `${text.slice(0, current.start)}${repaired}${text.slice(current.end)}`,
    strategy: "live_computation_sympy_true_decide_repair"
  };
}

function repairLeanDraft(
  text: string,
  task: Record<string, unknown>
): {
  text: string;
  feedbackGuidedRevisionApplied: boolean;
  hintGuidedRevisionApplied: boolean;
  hintExecutionGuidedRevisionApplied: boolean;
  placeholderFreeRepairMaterialized: boolean;
  placeholderFreeRepairStrategy: PlaceholderFreeRepairStrategy | null;
} {
  const placeholder = [
    "by",
    "  -- comath_repair_placeholder: non-authoritative draft for LeanRunner.",
    "  exact ?comath_repair_placeholder"
  ].join("\n");
  const localRepairStrategy = placeholderFreeRepairStrategy(text);
  const liveSuggestionRepair = localRepairStrategy === null ? liveRetrievalSuggestionRepair(text, task) : null;
  const liveTheoremSearchRepair =
    localRepairStrategy === null && liveSuggestionRepair === null ? liveTheoremSearchConjunctionRepair(text, task) : null;
  const liveComputationRepair =
    localRepairStrategy === null && liveSuggestionRepair === null && liveTheoremSearchRepair === null
      ? liveComputationSympyTrueDecideRepair(text, task)
      : null;
  const repairStrategy =
    localRepairStrategy ?? liveSuggestionRepair?.strategy ?? liveTheoremSearchRepair?.strategy ?? liveComputationRepair?.strategy ?? null;
  const replaced =
    liveSuggestionRepair?.text ??
    liveTheoremSearchRepair?.text ??
    liveComputationRepair?.text ??
    replaceLeanSorryTokens(text, placeholderFreeRepairReplacement(repairStrategy) ?? placeholder);
  const markers: string[] = [];
  const sourceFeedback =
    task.source_feedback && typeof task.source_feedback === "object" && !Array.isArray(task.source_feedback)
      ? (task.source_feedback as Record<string, unknown>)
      : undefined;
  if (sourceFeedback) {
    const manifestPath = typeof sourceFeedback.lean_run_manifest_path === "string" ? sourceFeedback.lean_run_manifest_path : "unknown";
    const stderrSha = typeof sourceFeedback.stderr_sha256 === "string" ? sourceFeedback.stderr_sha256 : "unknown";
    markers.push(
      "-- comath_repair_feedback: non-authoritative LeanRunner diagnostics were bound for the next repair pass.",
      `-- lean_run_manifest: ${manifestPath}`,
      `-- stderr_sha256: ${stderrSha}`
    );
  }
  const sourceHintBundle = repairHintBundleFromTask(task);
  if (sourceHintBundle) {
    markers.push(
      "-- comath_repair_hints: non-authoritative external wheel descriptors were bound for this repair pass.",
      `-- repair_hint_bundle: ${sourceHintBundle.path}`,
      `-- repair_hint_bundle_sha256: ${sourceHintBundle.sha256}`
    );
  }
  const sourceHintExecution = repairHintExecutionFromTask(task);
  if (sourceHintExecution) {
    markers.push(
      "-- comath_repair_hint_execution: service-owned non-authoritative external wheel execution results were bound for this repair pass.",
      `-- repair_hint_execution: ${sourceHintExecution.path}`,
      `-- repair_hint_execution_sha256: ${sourceHintExecution.sha256}`
    );
  }
  if (markers.length === 0) {
    return {
      text: replaced,
      feedbackGuidedRevisionApplied: false,
      hintGuidedRevisionApplied: false,
      hintExecutionGuidedRevisionApplied: false,
      placeholderFreeRepairMaterialized: repairStrategy !== null,
      placeholderFreeRepairStrategy: repairStrategy
    };
  }
  return {
    text: `${replaced.trimEnd()}\n\n${markers.join("\n")}\n`,
    feedbackGuidedRevisionApplied: Boolean(sourceFeedback),
    hintGuidedRevisionApplied: Boolean(sourceHintBundle),
    hintExecutionGuidedRevisionApplied: Boolean(sourceHintExecution),
    placeholderFreeRepairMaterialized: repairStrategy !== null,
    placeholderFreeRepairStrategy: repairStrategy
  };
}

function readRepairTask(projectRoot: string, relativePath: string): Record<string, unknown> {
  const parsed = JSON.parse(readText(projectRoot, relativePath)) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("lean_candidate_repair_task_invalid");
  }
  const task = parsed as Record<string, unknown>;
  if (task.schema_version !== "comath.pi_goal_mode_lean_candidate_attempt_repair_task.v1") {
    throw new Error("lean_candidate_repair_task_schema_invalid");
  }
  return task;
}

function feedbackBatchFromTask(task: Record<string, unknown>): LeanCandidateAttemptRepairExecution["source_feedback_batch"] | undefined {
  const source = task.source_feedback_batch;
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return undefined;
  }
  const record = source as Record<string, unknown>;
  if (typeof record.path !== "string" || typeof record.sha256 !== "string" || record.proof_authority !== "none") {
    return undefined;
  }
  return { path: record.path, sha256: record.sha256, proof_authority: "none" };
}

function repairHintBundleFromTask(task: Record<string, unknown>): LeanCandidateAttemptRepairExecution["source_repair_hint_bundle"] | undefined {
  const source = task.source_repair_hint_bundle;
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return undefined;
  }
  const record = source as Record<string, unknown>;
  if (typeof record.path !== "string" || typeof record.sha256 !== "string" || record.proof_authority !== "none") {
    return undefined;
  }
  return { path: record.path, sha256: record.sha256, proof_authority: "none" };
}

function repairHintExecutionFromTask(
  task: Record<string, unknown>
): LeanCandidateAttemptRepairExecution["source_repair_hint_execution"] | undefined {
  const source = task.source_repair_hint_execution;
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return undefined;
  }
  const record = source as Record<string, unknown>;
  if (typeof record.path !== "string" || typeof record.sha256 !== "string" || record.proof_authority !== "none") {
    return undefined;
  }
  return { path: record.path, sha256: record.sha256, proof_authority: "none" };
}

function sourceFeedbackFromTask(task: Record<string, unknown>): Record<string, unknown> | undefined {
  const source = task.source_feedback;
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return undefined;
  }
  return source as Record<string, unknown>;
}

function sourceRepairHintsFromTask(task: Record<string, unknown>): Record<string, unknown>[] | undefined {
  const source = task.source_repair_hints;
  if (!Array.isArray(source)) {
    return undefined;
  }
  const hints = source.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item));
  return hints.length > 0 ? hints : undefined;
}

function sourceRepairHintResultsFromTask(task: Record<string, unknown>): Record<string, unknown>[] | undefined {
  const source = task.source_repair_hint_results;
  if (!Array.isArray(source)) {
    return undefined;
  }
  const results = source.filter(
    (item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item)
  );
  return results.length > 0 ? results : undefined;
}

function validateRepairTaskAgainstBatch(input: {
  projectRoot: string;
  task: Record<string, unknown>;
  repair: LeanCandidateAttemptRepairBatch["per_candidate_repairs"][number];
  batch: LeanCandidateAttemptRepairBatch;
}): void {
  if (input.task.proof_authority !== "none" || input.task.can_promote_claim !== false || input.task.lean_runner_invocation_allowed !== false) {
    throw new Error("lean_candidate_repair_task_authority_flags_invalid");
  }
  const currentTaskSha256 = sha256RuntimeFile(input.projectRoot, input.repair.repair_task_path);
  if (currentTaskSha256 !== input.repair.repair_task_sha256) {
    throw new Error("lean_candidate_repair_task_hash_mismatch");
  }
  const currentLeanSha256 = sha256RuntimeFile(input.projectRoot, input.repair.source_lean_file_path);
  if (typeof input.repair.source_lean_file_sha256 === "string" && currentLeanSha256 !== input.repair.source_lean_file_sha256) {
    throw new Error("lean_candidate_repair_source_lean_hash_mismatch");
  }
  const feedbackBatch = feedbackBatchFromTask(input.task);
  if (feedbackBatch && input.batch.source_feedback_batch) {
    if (
      feedbackBatch.path !== input.batch.source_feedback_batch.path ||
      feedbackBatch.sha256 !== input.batch.source_feedback_batch.sha256
    ) {
      throw new Error("lean_candidate_repair_task_feedback_batch_mismatch");
    }
  }
  const hintBundle = repairHintBundleFromTask(input.task);
  if (hintBundle && input.batch.source_repair_hint_bundle) {
    if (
      hintBundle.path !== input.batch.source_repair_hint_bundle.path ||
      hintBundle.sha256 !== input.batch.source_repair_hint_bundle.sha256
    ) {
      throw new Error("lean_candidate_repair_task_hint_bundle_mismatch");
    }
    const currentHintSha256 = sha256RuntimeFile(input.projectRoot, hintBundle.path);
    if (currentHintSha256 !== hintBundle.sha256) {
      throw new Error("lean_candidate_repair_hint_bundle_hash_mismatch");
    }
  }
  const repairHints = sourceRepairHintsFromTask(input.task);
  if (repairHints) {
    for (const hint of repairHints) {
      if (
        hint.proof_authority !== "none" ||
        hint.can_promote_claim !== false ||
        hint.result_can_be_used_as_proof !== false ||
        hint.service_owned_execution_required !== true
      ) {
        throw new Error("lean_candidate_repair_hint_authority_flags_invalid");
      }
    }
  }
  const hintExecution = repairHintExecutionFromTask(input.task);
  if (hintExecution && input.batch.source_repair_hint_execution) {
    if (
      hintExecution.path !== input.batch.source_repair_hint_execution.path ||
      hintExecution.sha256 !== input.batch.source_repair_hint_execution.sha256
    ) {
      throw new Error("lean_candidate_repair_task_hint_execution_mismatch");
    }
    const currentHintExecutionSha256 = sha256RuntimeFile(input.projectRoot, hintExecution.path);
    if (currentHintExecutionSha256 !== hintExecution.sha256) {
      throw new Error("lean_candidate_repair_hint_execution_hash_mismatch");
    }
  }
  const hintResults = sourceRepairHintResultsFromTask(input.task);
  if (hintResults) {
    for (const result of hintResults) {
      const vetoes = Array.isArray(result.promotion_vetoes) ? result.promotion_vetoes : [];
      const adapterExecutionState = result.adapter_execution_state;
      const isStubbedResult = adapterExecutionState === "stubbed_provider_result_recorded";
      const isLiveResult = adapterExecutionState === "live_provider_result_recorded";
      if (
        result.proof_authority !== "none" ||
        result.can_promote_claim !== false ||
        result.result_can_be_used_as_proof !== false ||
        !vetoes.includes("external_adapter_result_has_no_proof_authority") ||
        (!isStubbedResult && !isLiveResult) ||
        (isStubbedResult && (result.network_execution_performed !== false || result.live_provider_execution_performed !== false)) ||
        (isLiveResult && (result.network_execution_performed !== true || result.live_provider_execution_performed !== true))
      ) {
        throw new Error("lean_candidate_repair_hint_execution_authority_flags_invalid");
      }
    }
  }
}

export function executeLeanCandidateAttemptRepairBatch(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  obligation: ProofObligation;
  batchPath: string;
  batch: LeanCandidateAttemptRepairBatch;
}): ExecuteLeanCandidateAttemptRepairBatchResult {
  const batchSha256 = sha256RuntimeFile(input.projectRoot, input.batchPath);
  const createdAt = new Date().toISOString();
  const perCandidateExecutions: LeanCandidateAttemptRepairExecution["per_candidate_executions"] = [];
  const artifactPaths: string[] = [];

  for (const repair of input.batch.per_candidate_repairs) {
    const task = readRepairTask(input.projectRoot, repair.repair_task_path);
    if (task.candidate_id !== repair.candidate_id) {
      throw new Error("lean_candidate_repair_task_candidate_mismatch");
    }
    validateRepairTaskAgainstBatch({ projectRoot: input.projectRoot, task, repair, batch: input.batch });
    const sourceLeanRel = repair.source_lean_file_path;
    const originalLean = readText(input.projectRoot, sourceLeanRel);
    const originalHadSorry = hasSorry(originalLean);
    const originalSha256 = sha256RuntimeFile(input.projectRoot, sourceLeanRel);
    const repairDir = normalizedRel(dirname(repair.repair_task_path));
    const inputSnapshotRel = normalizedRel(join(repairDir, "LeanCandidate.repair-input-1.lean"));
    const perCandidateExecutionRel = normalizedRel(join(repairDir, "lean_candidate_repair_execution.json"));
    writeText(input.projectRoot, inputSnapshotRel, originalLean);
    const feedbackBatch = feedbackBatchFromTask(task);
    const sourceFeedback = sourceFeedbackFromTask(task);
    const repairHintBundle = repairHintBundleFromTask(task);
    const sourceRepairHints = sourceRepairHintsFromTask(task);
    const repairHintExecution = repairHintExecutionFromTask(task);
    const sourceRepairHintResults = sourceRepairHintResultsFromTask(task);
    const repaired = repairLeanDraft(originalLean, task);
    const repairedLean = repaired.text;
    writeText(input.projectRoot, sourceLeanRel, repairedLean);
    const repairedHasSorry = hasSorry(repairedLean);
    if (repairedHasSorry) {
      throw new Error("lean_candidate_repair_execution_sorry_remaining");
    }
    const repairedSha256 = sha256RuntimeFile(input.projectRoot, sourceLeanRel);
    const perCandidate = {
      schema_version: "comath.pi_goal_mode_lean_candidate_attempt_per_candidate_repair_execution.v1",
      campaign_id: input.campaign.campaign_id,
      obligation_id: input.obligation.obligation_id,
      candidate_id: repair.candidate_id,
      variant_id: repair.variant_id,
      source_repair_batch: {
        path: input.batchPath,
        sha256: batchSha256,
        proof_authority: "none"
      },
      source_feedback_batch: feedbackBatch,
      source_feedback: sourceFeedback,
      source_repair_hint_bundle: repairHintBundle,
      source_repair_hints: sourceRepairHints,
      source_repair_hint_execution: repairHintExecution,
      source_repair_hint_results: sourceRepairHintResults,
      repair_task_path: repair.repair_task_path,
      repair_input_snapshot_path: inputSnapshotRel,
      repaired_lean_file_path: sourceLeanRel,
      original_lean_file_sha256: originalSha256,
      repaired_lean_file_sha256: repairedSha256,
      feedback_guided_revision_applied: repaired.feedbackGuidedRevisionApplied,
      hint_guided_revision_applied: repaired.hintGuidedRevisionApplied,
      hint_execution_guided_revision_applied: repaired.hintExecutionGuidedRevisionApplied,
      placeholder_free_repair_materialized: repaired.placeholderFreeRepairMaterialized,
      placeholder_free_repair_strategy: repaired.placeholderFreeRepairStrategy,
      original_had_sorry: originalHadSorry,
      repaired_has_sorry: false,
      repair_placeholder_present: repairedLean.includes("comath_repair_placeholder"),
      lean_runner_invocation_allowed_after_preflight_only: true,
      proof_authority: "none",
      can_promote_claim: false,
      can_certify_ga: false,
      result_can_be_used_as_proof: false,
      created_at: createdAt
    };
    writeJson(input.projectRoot, perCandidateExecutionRel, perCandidate);
    artifactPaths.push(inputSnapshotRel, perCandidateExecutionRel, sourceLeanRel);
    perCandidateExecutions.push({
      candidate_id: repair.candidate_id,
      variant_id: repair.variant_id,
      repair_task_path: repair.repair_task_path,
      repair_execution_path: perCandidateExecutionRel,
      repair_input_snapshot_path: inputSnapshotRel,
      repaired_lean_file_path: sourceLeanRel,
      original_lean_file_sha256: originalSha256,
      repaired_lean_file_sha256: repairedSha256,
      source_feedback_batch: feedbackBatch,
      source_feedback: sourceFeedback,
      source_repair_hint_bundle: repairHintBundle,
      source_repair_hints: sourceRepairHints,
      source_repair_hint_execution: repairHintExecution,
      source_repair_hint_results: sourceRepairHintResults,
      feedback_guided_revision_applied: repaired.feedbackGuidedRevisionApplied,
      hint_guided_revision_applied: repaired.hintGuidedRevisionApplied,
      hint_execution_guided_revision_applied: repaired.hintExecutionGuidedRevisionApplied,
      placeholder_free_repair_materialized: repaired.placeholderFreeRepairMaterialized,
      placeholder_free_repair_strategy: repaired.placeholderFreeRepairStrategy,
      original_had_sorry: originalHadSorry,
      repaired_has_sorry: false,
      repair_placeholder_present: repairedLean.includes("comath_repair_placeholder"),
      proof_authority: "none",
      can_promote_claim: false,
      result_can_be_used_as_proof: false
    });
  }

  const execution: LeanCandidateAttemptRepairExecution = {
    schema_version: "comath.pi_goal_mode_lean_candidate_attempt_repair_execution.v1",
    campaign_id: input.campaign.campaign_id,
    project_id: input.campaign.project_id,
    claim_id: input.campaign.root_claim_id,
    obligation_id: input.obligation.obligation_id,
    locked_statement_hash: input.obligation.statement_hash,
    execution_result: "repaired_attempts_materialized",
    source_repair_batch: {
      path: input.batchPath,
      sha256: batchSha256,
      proof_authority: "none"
    },
    source_feedback_batch: input.batch.source_feedback_batch,
    source_repair_hint_bundle: input.batch.source_repair_hint_bundle,
    source_repair_hint_execution: input.batch.source_repair_hint_execution,
    repair_iteration: input.batch.repair_iteration,
    repaired_candidate_count: perCandidateExecutions.length,
    repaired_attempts_materialized: true,
    repaired_attempts_ready_for_preflight: perCandidateExecutions.length,
    repaired_placeholder_free_candidate_count: perCandidateExecutions.filter((item) => item.placeholder_free_repair_materialized).length,
    per_candidate_executions: perCandidateExecutions,
    next_stage: "candidate_verification",
    lean_runner_invocations: 0,
    lean_run_manifest_paths: [],
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    result_can_be_used_as_proof: false,
    created_at: createdAt
  };
  const executionRel = campaignRel(input.campaign, "lean_candidate_attempt_repair_execution.json");
  writeJson(input.projectRoot, executionRel, execution);
  artifactPaths.push(executionRel);
  return { execution, execution_path: executionRel, artifact_paths: artifactPaths };
}
