export type StatementDiffEquivalenceClaim = "exact" | "equivalent" | "weaker" | "stronger" | "different" | "unknown";

export type StatementDiffGateInput = {
  formal_spec_lock: {
    claim_id?: string;
    theorem_header: string;
    theorem_type_pretty: string;
    statement_hash: string;
    variables?: Array<{ name?: string; type: string }>;
    assumptions?: Array<{ id?: string; name?: string; type: string }>;
  };
  assumption_ledger_entries?: Array<{ id?: string; name?: string; type: string; approved?: boolean }>;
  candidate_statement: {
    theorem_header: string;
    theorem_type_pretty: string;
    statement_hash: string;
    statement_equivalence_claim: StatementDiffEquivalenceClaim;
    introduced_assumptions?: string[];
    equivalence_witness?: {
      kind?: string;
      lean_run_manifest_id?: string;
      final_replay_manifest_id?: string;
      witness_artifact_id?: string;
    };
    domain_markers?: string[];
    quantifier_markers?: string[];
  };
};

export type StatementDiffGateReport = {
  result: "pass" | "fail";
  equivalence_mode: "exact" | "lean_replayed_equivalent" | "blocked_non_exact";
  proof_authority: "none";
  locked_statement_hash: string;
  candidate_statement_hash: string;
  requires_lean_equivalence_replay: boolean;
  findings: Array<{ code: string; severity: "hard_veto" | "warning"; detail: string }>;
  hard_vetoes: string[];
};

export type StatementDriftRedTeamReport = {
  result: "pass" | "fail";
  proof_authority: "none";
  findings: StatementDiffGateReport["findings"];
  hard_vetoes: string[];
  counterexample_findings: string[];
};

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function addFinding(
  findings: StatementDiffGateReport["findings"],
  hardVetoes: Set<string>,
  code: string,
  detail: string
): void {
  hardVetoes.add(code);
  findings.push({ code, severity: "hard_veto", detail });
}

function assumptionKey(value: { id?: string; name?: string; type: string }): string[] {
  return [value.id, value.name, value.type].filter((item): item is string => typeof item === "string").map(normalize);
}

function allowedAssumptionKeys(input: StatementDiffGateInput): Set<string> {
  const keys = new Set<string>();
  for (const assumption of input.formal_spec_lock.assumptions ?? []) {
    for (const key of assumptionKey(assumption)) {
      keys.add(key);
    }
  }
  for (const entry of input.assumption_ledger_entries ?? []) {
    if (entry.approved === false) {
      continue;
    }
    for (const key of assumptionKey(entry)) {
      keys.add(key);
    }
  }
  return keys;
}

function hasLeanEquivalenceReplayWitness(witness: StatementDiffGateInput["candidate_statement"]["equivalence_witness"]): boolean {
  if (!witness || witness.kind !== "lean_kernel_checked_equivalence_replay") {
    return false;
  }
  return Boolean(witness.lean_run_manifest_id?.trim() || witness.final_replay_manifest_id?.trim());
}

function quantifierClass(statement: string): "exists" | "forall" | "none" {
  const normalized = normalize(statement).toLowerCase();
  if (/\bexists\b|∃/.test(normalized)) {
    return "exists";
  }
  if (/\bforall\b|∀/.test(normalized) || /^\([^)]*:\s*[^)]*\)\s*:/.test(normalized)) {
    return "forall";
  }
  return "none";
}

export function evaluateStatementDiffGate(input: StatementDiffGateInput): StatementDiffGateReport {
  const findings: StatementDiffGateReport["findings"] = [];
  const hardVetoes = new Set<string>();
  const lockedHeader = normalize(input.formal_spec_lock.theorem_header);
  const candidateHeader = normalize(input.candidate_statement.theorem_header);
  const lockedType = normalize(input.formal_spec_lock.theorem_type_pretty);
  const candidateType = normalize(input.candidate_statement.theorem_type_pretty);
  const claim = input.candidate_statement.statement_equivalence_claim;

  if (lockedHeader !== candidateHeader) {
    addFinding(findings, hardVetoes, "theorem_header_mismatch", "candidate theorem header differs from FormalSpecLock");
  }
  if (input.formal_spec_lock.statement_hash !== input.candidate_statement.statement_hash) {
    addFinding(findings, hardVetoes, "statement_drift", "candidate statement hash differs from FormalSpecLock");
  }
  if (claim === "weaker") {
    addFinding(findings, hardVetoes, "statement_weakened", "candidate declares a weaker theorem than the locked statement");
  }
  if (claim === "stronger") {
    addFinding(findings, hardVetoes, "statement_strengthened", "candidate declares a stronger theorem than the locked statement");
  }
  if (claim === "different") {
    addFinding(findings, hardVetoes, "statement_drift", "candidate declares a different theorem than the locked statement");
  }
  if (claim === "unknown") {
    addFinding(findings, hardVetoes, "ambiguous_statement", "candidate statement equivalence is unknown");
  }

  const allowedAssumptions = allowedAssumptionKeys(input);
  for (const assumption of input.candidate_statement.introduced_assumptions ?? []) {
    if (!allowedAssumptions.has(normalize(assumption))) {
      addFinding(findings, hardVetoes, "hidden_assumption", `candidate introduced unapproved assumption: ${assumption}`);
    }
  }

  const lockedDomains = new Set((input.formal_spec_lock.variables ?? []).map((variable) => normalize(variable.type)));
  for (const marker of input.candidate_statement.domain_markers ?? []) {
    if (lockedDomains.size > 0 && !lockedDomains.has(normalize(marker))) {
      addFinding(findings, hardVetoes, "wrong_domain", `candidate uses unlocked domain marker: ${marker}`);
    }
  }
  if (lockedType !== candidateType && input.candidate_statement.domain_markers && input.candidate_statement.domain_markers.length > 0) {
    addFinding(findings, hardVetoes, "statement_drift", "candidate theorem type differs while changing domain markers");
  }

  const lockedQuantifier = quantifierClass(lockedType);
  const candidateQuantifier = input.candidate_statement.quantifier_markers?.includes("exists")
    ? "exists"
    : input.candidate_statement.quantifier_markers?.includes("forall")
      ? "forall"
      : quantifierClass(candidateType);
  if (lockedQuantifier !== "none" && candidateQuantifier !== "none" && lockedQuantifier !== candidateQuantifier) {
    addFinding(findings, hardVetoes, "wrong_quantifier", "candidate quantifier shape differs from FormalSpecLock");
  }

  const exactShape =
    claim === "exact" &&
    lockedHeader === candidateHeader &&
    lockedType === candidateType &&
    input.formal_spec_lock.statement_hash === input.candidate_statement.statement_hash;
  const nonExact = claim === "equivalent" || (claim === "exact" && !exactShape);
  const hasReplayWitness = hasLeanEquivalenceReplayWitness(input.candidate_statement.equivalence_witness);
  if (nonExact && !hasReplayWitness) {
    addFinding(
      findings,
      hardVetoes,
      "lean_equivalence_replay_required",
      "non-exact statement equivalence requires Lean-proved equivalence replay evidence"
    );
  }

  const equivalenceMode = exactShape
    ? "exact"
    : hasReplayWitness && hardVetoes.size === 0
      ? "lean_replayed_equivalent"
      : "blocked_non_exact";
  return {
    result: hardVetoes.size === 0 ? "pass" : "fail",
    equivalence_mode: equivalenceMode,
    proof_authority: "none",
    locked_statement_hash: input.formal_spec_lock.statement_hash,
    candidate_statement_hash: input.candidate_statement.statement_hash,
    requires_lean_equivalence_replay: nonExact && !hasReplayWitness,
    findings,
    hard_vetoes: [...hardVetoes]
  };
}

export function createStatementDriftRedTeamReport(input: {
  gate_reports: StatementDiffGateReport[];
  counterexample_findings?: string[];
}): StatementDriftRedTeamReport {
  const findings = input.gate_reports.flatMap((report) => report.findings);
  const hardVetoes = new Set(input.gate_reports.flatMap((report) => report.hard_vetoes));
  const counterexampleFindings = input.counterexample_findings ?? [];
  if (counterexampleFindings.length > 0) {
    hardVetoes.add("unresolved_counterexample");
    for (const detail of counterexampleFindings) {
      findings.push({ code: "unresolved_counterexample", severity: "hard_veto", detail });
    }
  }
  return {
    result: hardVetoes.size === 0 ? "pass" : "fail",
    proof_authority: "none",
    findings,
    hard_vetoes: [...hardVetoes],
    counterexample_findings: counterexampleFindings
  };
}
