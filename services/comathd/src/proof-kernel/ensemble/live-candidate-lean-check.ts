import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { assertPathAllowed } from "../../security/path-policy.js";
import { assumptionLedgerSchema, formalSpecLockSchema, type ProofObligation, type ResearchCampaign } from "../../types/schemas.js";
import { runServiceOwnedLeanCommandV3 } from "../lean/lean-run-manifest-v3.js";
import type { GaAgentReplayProject, GaAgentStageAdapterResult, GaAgentTaskCard } from "./ga-agent-stage-runner.js";

export type NativeCandidateLeanCommandRunner = (
  command: string[],
  cwd: string
) => { exit_code: number; stdout: string; stderr: string };

export type ServiceOwnedNativeCandidateLeanAdapterInput = {
  projectRoot: string;
  campaign: ResearchCampaign;
  obligation: ProofObligation;
  leanVersionOutput?: string;
  lakeVersionOutput?: string;
  leanToolchain?: string;
  run?: NativeCandidateLeanCommandRunner;
};

type ParsedLeanHeader = {
  namespace: string;
  theoremName: string;
  fullTheoremName: string;
  proposition: string;
  declaration: string;
  importsAllowed: string[];
  formalSpecLock: Record<string, unknown>;
  assumptionLedger: Record<string, unknown>;
};

function normalizedRel(path: string): string {
  return path.replace(/\\/g, "/");
}

function writeProjectFile(projectRoot: string, relativePath: string, content: string): string {
  const path = assertPathAllowed(projectRoot, relativePath, { purpose: "runtime-write" });
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
  return path;
}

function commandOutput(command: string, args: string[]): string {
  const result = spawnSync(command, args, { encoding: "utf8", timeout: 10_000 });
  if (result.status !== 0) {
    throw new Error(`${command}_probe_failed:${result.stderr || result.error || "unknown_error"}`);
  }
  return result.stdout || result.stderr || "";
}

function stableRunId(candidateId: string): string {
  const digits = (candidateId.match(/\d+/g)?.join("") ?? "0").slice(-4).padStart(4, "0");
  return `LRUN-${digits}`;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function stringField(value: Record<string, unknown>, key: string): string | undefined {
  const field = value[key];
  return typeof field === "string" && field.trim().length > 0 ? field.trim() : undefined;
}

function stringArrayField(value: Record<string, unknown>, key: string): string[] {
  const field = value[key];
  if (!Array.isArray(field)) {
    return [];
  }
  return field.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function stripProofBody(header: string): string {
  return header.replace(/\s*:=\s*by[\s\S]*$/u, "").trim();
}

function findTopLevelColon(text: string): number {
  let round = 0;
  let square = 0;
  let curly = 0;
  for (let index = text.length - 1; index >= 0; index -= 1) {
    const char = text[index];
    if (char === ")") {
      round += 1;
    } else if (char === "(") {
      round -= 1;
    } else if (char === "]") {
      square += 1;
    } else if (char === "[") {
      square -= 1;
    } else if (char === "}") {
      curly += 1;
    } else if (char === "{") {
      curly -= 1;
    } else if (char === ":" && round === 0 && square === 0 && curly === 0) {
      return index;
    }
  }
  return -1;
}

function parseTheoremDeclaration(header: string):
  | {
      theoremName: string;
      proposition: string;
      declaration: string;
    }
  | undefined {
  const declaration = stripProofBody(header).replace(/\s+/g, " ").trim();
  const match = /^(?:theorem|lemma)\s+([A-Za-z_][A-Za-z0-9_'.]*(?:\.[A-Za-z_][A-Za-z0-9_'.]*)*)(?:\s+([\s\S]+))?$/u.exec(
    declaration
  );
  if (!match) {
    return undefined;
  }
  const suffix = match[2]?.trim() ?? "";
  const colon = findTopLevelColon(suffix);
  if (colon < 0) {
    return undefined;
  }
  const proposition = suffix.slice(colon + 1).trim();
  if (!proposition) {
    return undefined;
  }
  return {
    theoremName: match[1]!,
    proposition,
    declaration
  };
}

function syntheticFormalSpec(input: {
  campaign: ResearchCampaign;
  obligation: ProofObligation;
  parsed: { namespace: string; theoremName: string; declaration: string; proposition: string; importsAllowed: string[] };
}): Record<string, unknown> {
  return {
    schema_version: "comath.formal_spec_lock.v2",
    claim_id: input.campaign.root_claim_id,
    original_goal_text: input.obligation.locked_statement_nl,
    original_goal_sha256: input.obligation.statement_hash,
    normalized_nl_statement: input.obligation.locked_statement_nl,
    theorem_name: input.parsed.theoremName,
    namespace: input.parsed.namespace,
    theorem_header: input.parsed.declaration,
    theorem_type_pretty: input.parsed.proposition,
    variables: [],
    assumptions: [],
    conclusion: input.parsed.proposition,
    notation_conventions: [],
    imports_allowed: input.parsed.importsAllowed,
    external_dependencies_allowed: [],
    trust_profile_id: "lean4_mathlib_default",
    statement_hash: input.obligation.statement_hash,
    locked_by: "comathd.live-candidate-lean-check",
    locked_at: new Date().toISOString(),
    user_approval_required: false,
    proof_authority: "none"
  };
}

function syntheticAssumptionLedger(input: {
  campaign: ResearchCampaign;
  obligation: ProofObligation;
}): Record<string, unknown> {
  return {
    schema_version: "comath.assumption_ledger.v1",
    claim_id: input.campaign.root_claim_id,
    formal_spec_lock_hash: input.obligation.statement_hash,
    entries: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    proof_authority: "none"
  };
}

function parseFormalSpecLeanHeader(input: {
  campaign: ResearchCampaign;
  obligation: ProofObligation;
}): ParsedLeanHeader | undefined {
  const structured = record(input.obligation.locked_statement_structured);
  if (!structured) {
    return undefined;
  }
  const header = stringField(structured, "theorem_header");
  const namespace = stringField(structured, "namespace");
  const lockedTheoremName = stringField(structured, "theorem_name");
  if (!header || !namespace || !lockedTheoremName) {
    return undefined;
  }
  const declaration = parseTheoremDeclaration(header);
  if (!declaration) {
    return undefined;
  }
  const headerTheoremName = declaration.theoremName.split(".").pop()!;
  if (headerTheoremName !== lockedTheoremName) {
    return undefined;
  }
  const fullTheoremName = declaration.theoremName.includes(".")
    ? declaration.theoremName
    : `${namespace}.${declaration.theoremName}`;
  if (input.obligation.lean_target && input.obligation.lean_target !== fullTheoremName) {
    return undefined;
  }
  if (stringField(structured, "claim_id") && structured.claim_id !== input.campaign.root_claim_id) {
    return undefined;
  }
  if (stringField(structured, "statement_hash") && structured.statement_hash !== input.obligation.statement_hash) {
    return undefined;
  }
  const formalSpecCandidate = {
    schema_version: "comath.formal_spec_lock.v2",
    claim_id: input.campaign.root_claim_id,
    original_goal_text: stringField(structured, "original_goal_text") ?? input.obligation.locked_statement_nl,
    original_goal_sha256: stringField(structured, "original_goal_sha256") ?? input.obligation.statement_hash,
    normalized_nl_statement: stringField(structured, "normalized_nl_statement") ?? input.obligation.locked_statement_nl,
    theorem_name: lockedTheoremName,
    namespace,
    theorem_header: header,
    theorem_type_pretty: stringField(structured, "theorem_type_pretty") ?? declaration.proposition,
    ...(stringField(structured, "theorem_type_elaborated_hash")
      ? { theorem_type_elaborated_hash: stringField(structured, "theorem_type_elaborated_hash") }
      : {}),
    variables: Array.isArray(structured.variables) ? structured.variables : [],
    assumptions: Array.isArray(structured.assumptions) ? structured.assumptions : [],
    conclusion: stringField(structured, "conclusion") ?? declaration.proposition,
    notation_conventions: Array.isArray(structured.notation_conventions) ? structured.notation_conventions : [],
    imports_allowed: stringArrayField(structured, "imports_allowed"),
    external_dependencies_allowed: Array.isArray(structured.external_dependencies_allowed) ? structured.external_dependencies_allowed : [],
    trust_profile_id: stringField(structured, "trust_profile_id") ?? "lean4_mathlib_default",
    statement_hash: input.obligation.statement_hash,
    locked_by: stringField(structured, "locked_by") ?? "comathd.formal-spec-lock",
    locked_at: stringField(structured, "locked_at") ?? new Date().toISOString(),
    user_approval_required: structured.user_approval_required === true,
    proof_authority: "none"
  };
  const ledgerEntries = Array.isArray(structured.assumptions)
    ? structured.assumptions.map((entry) => (record(entry) && entry.kind === undefined ? { ...entry, kind: "assumption" } : entry))
    : [];
  const ledgerCandidate = {
    schema_version: "comath.assumption_ledger.v1",
    claim_id: input.campaign.root_claim_id,
    formal_spec_lock_hash: input.obligation.statement_hash,
    entries: ledgerEntries,
    created_at: stringField(structured, "locked_at") ?? new Date().toISOString(),
    updated_at: stringField(structured, "locked_at") ?? new Date().toISOString(),
    proof_authority: "none"
  };
  const formalSpecLock = formalSpecLockSchema.parse(formalSpecCandidate);
  const assumptionLedger = assumptionLedgerSchema.parse(ledgerCandidate);
  return {
    namespace,
    theoremName: lockedTheoremName,
    fullTheoremName,
    proposition: declaration.proposition,
    declaration: declaration.declaration,
    importsAllowed: formalSpecLock.imports_allowed,
    formalSpecLock,
    assumptionLedger
  };
}

function parseLeanHeader(statement: string, leanTarget?: string): ParsedLeanHeader | undefined {
  const trimmed = statement.trim().replace(/\s+/g, " ");
  const theoremKeyword = /^(?:theorem|lemma)\s+([A-Za-z_][A-Za-z0-9_'.]*(?:\.[A-Za-z_][A-Za-z0-9_'.]*)*)\s*:\s*(True)$/.exec(trimmed);
  const bareHeader = /^([A-Za-z_][A-Za-z0-9_'.]*(?:\.[A-Za-z_][A-Za-z0-9_'.]*)*)\s*:\s*(True)$/.exec(trimmed);
  const match = theoremKeyword ?? bareHeader;
  if (!match) {
    return undefined;
  }
  const matchedFullName = match[1]!;
  if (leanTarget && leanTarget !== matchedFullName) {
    return undefined;
  }
  const fullName = leanTarget ?? matchedFullName;
  const parts = fullName.split(".");
  const theoremName = parts.pop()!;
  const namespace = parts.length > 0 ? parts.join(".") : "MathResearch";
  return {
    namespace,
    theoremName,
    fullTheoremName: `${namespace}.${theoremName}`,
    proposition: match[2]!,
    declaration: `theorem ${theoremName} : ${match[2]!}`,
    importsAllowed: [],
    formalSpecLock: {},
    assumptionLedger: {}
  };
}

function parseNativeCandidateLeanTarget(input: { campaign: ResearchCampaign; obligation: ProofObligation }): ParsedLeanHeader | undefined {
  const formalSpecHeader = parseFormalSpecLeanHeader(input);
  if (formalSpecHeader) {
    return formalSpecHeader;
  }
  const parsed = parseLeanHeader(input.obligation.locked_statement_nl, input.obligation.lean_target);
  if (!parsed) {
    return undefined;
  }
  const withSpec = {
    ...parsed,
    formalSpecLock: syntheticFormalSpec({
      campaign: input.campaign,
      obligation: input.obligation,
      parsed
    }),
    assumptionLedger: syntheticAssumptionLedger(input)
  };
  withSpec.formalSpecLock = formalSpecLockSchema.parse(withSpec.formalSpecLock);
  withSpec.assumptionLedger = assumptionLedgerSchema.parse(withSpec.assumptionLedger);
  return withSpec;
}

function materializeLeanProject(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  obligation: ProofObligation;
  candidateId: string;
  parsed: ParsedLeanHeader;
  leanToolchain: string;
}): { leanRootRel: string; inputFiles: string[]; replayProject: GaAgentReplayProject } {
  const leanRootRel = normalizedRel(
    join(".comath", "lean", "native_candidates", input.campaign.campaign_id, input.obligation.obligation_id, input.candidateId)
  );
  const targetRel = normalizedRel(join(leanRootRel, "MathResearch", "Target.lean"));
  const auditRel = normalizedRel(join(leanRootRel, "Audit", "TargetAudit.lean"));
  const lakefileRel = normalizedRel(join(leanRootRel, "lakefile.lean"));
  const toolchainRel = normalizedRel(join(leanRootRel, "lean-toolchain"));
  const formalSpecRel = normalizedRel(join(leanRootRel, "FormalSpec", "formal_spec_lock.json"));
  const ledgerRel = normalizedRel(join(leanRootRel, "FormalSpec", "assumption_ledger.json"));

  const target = writeProjectFile(
    input.projectRoot,
    targetRel,
    [
      ...input.parsed.importsAllowed.map((name) => `import ${name}`),
      ...(input.parsed.importsAllowed.length > 0 ? [""] : []),
      `namespace ${input.parsed.namespace}`,
      "",
      `${input.parsed.declaration} := by`,
      "  trivial",
      "",
      `end ${input.parsed.namespace}`,
      ""
    ].join("\n")
  );
  const audit = writeProjectFile(
    input.projectRoot,
    auditRel,
    [`import MathResearch.Target`, `#check ${input.parsed.fullTheoremName}`, `#print axioms ${input.parsed.fullTheoremName}`, ""].join("\n")
  );
  const lakefile = writeProjectFile(
    input.projectRoot,
    lakefileRel,
    ["import Lake", "open Lake DSL", "package MathResearch where", "lean_lib MathResearch where", "  roots := #[`MathResearch.Target]", ""].join("\n")
  );
  const toolchain = writeProjectFile(input.projectRoot, toolchainRel, `${input.leanToolchain.trim()}\n`);
  const formalSpec = writeProjectFile(
    input.projectRoot,
    formalSpecRel,
    `${JSON.stringify(input.parsed.formalSpecLock, null, 2)}\n`
  );
  const ledger = writeProjectFile(
    input.projectRoot,
    ledgerRel,
    `${JSON.stringify(input.parsed.assumptionLedger, null, 2)}\n`
  );

  return {
    leanRootRel,
    inputFiles: [target, audit, lakefile, toolchain, formalSpec, ledger],
    replayProject: {
      lean_root: leanRootRel,
      theorem_file_rel: "MathResearch/Target.lean",
      formal_spec_file: "FormalSpec/formal_spec_lock.json",
      assumption_ledger_file: "FormalSpec/assumption_ledger.json",
      audit_file_rel: "Audit/TargetAudit.lean",
      lakefile: "lakefile.lean",
      toolchain_file: "lean-toolchain",
      theorem_name: input.parsed.fullTheoremName,
      theorem_family_id: input.campaign.campaign_id,
      canonical_proposition: input.parsed.proposition,
      build_targets: ["MathResearch"],
      replay_command: "lake build MathResearch",
      primary_dependency: "Lean4",
      formal_spec: {
        claim_id: input.campaign.root_claim_id,
        theorem_name: input.parsed.theoremName,
        namespace: input.parsed.namespace,
        normalized_statement: input.obligation.locked_statement_nl,
        locked_statement_hash: input.obligation.statement_hash
      }
    }
  };
}

export function createServiceOwnedNativeCandidateLeanAdapter(input: ServiceOwnedNativeCandidateLeanAdapterInput): (context: {
  taskCard: GaAgentTaskCard;
  candidateId: string;
}) => GaAgentStageAdapterResult | undefined {
  return ({ taskCard, candidateId }) => {
    if (taskCard.variant_id !== "V1") {
      return undefined;
    }
    const parsed = parseNativeCandidateLeanTarget({ campaign: input.campaign, obligation: input.obligation });
    if (!parsed) {
      return undefined;
    }

    const leanToolchain = input.leanToolchain ?? "leanprover/lean4:v4.23.0";
    const { leanRootRel, inputFiles, replayProject } = materializeLeanProject({
      projectRoot: input.projectRoot,
      campaign: input.campaign,
      obligation: input.obligation,
      candidateId,
      parsed,
      leanToolchain
    });
    const runId = stableRunId(candidateId);
    const command = ["lake", "build", "MathResearch"];
    const cwd = assertPathAllowed(input.projectRoot, leanRootRel, { purpose: "read" });

    try {
      const run = runServiceOwnedLeanCommandV3({
        projectRoot: input.projectRoot,
        run_id: runId,
        claim_id: input.campaign.root_claim_id,
        campaign_id: input.campaign.campaign_id,
        candidate_id: candidateId,
        purpose: "check",
        command,
        cwd,
        input_files: inputFiles,
        leanVersionOutput: input.leanVersionOutput ?? commandOutput("lean", ["--version"]),
        lakeVersionOutput: input.lakeVersionOutput ?? commandOutput("lake", ["--version"]),
        leanToolchain,
        network_policy: "disabled",
        sandbox: "none",
        proof_authority: "lean_kernel_check",
        run: input.run
      });
      const manifestRel = normalizedRel(join(".comath", "evidence", input.campaign.root_claim_id, "lean", `${runId}.manifest.json`));
      if (run.manifest.exit_code !== 0) {
        return {
          state: "candidate_failed",
          score: -50,
          statement_equivalence_claim: "exact",
          candidate_statement_hash: input.obligation.statement_hash,
          evidence: [`lean_run_manifest:${manifestRel}`],
          lean_files: [normalizedRel(join(leanRootRel, "MathResearch", "Target.lean"))],
          logs: [run.manifest.stdout_path, run.manifest.stderr_path],
          failures: ["service_owned_lean_runner_rejected_candidate"],
          replay_command: command.join(" "),
          summary: "Service-owned LeanRunner rejected the native candidate.",
          maintainability_notes: "Candidate failed before proof-grade arbitration."
        };
      }
      return {
        state: "candidate_kernel_checked",
        score: 150,
        statement_equivalence_claim: "exact",
        candidate_statement_hash: input.obligation.statement_hash,
        dependencies: ["Lean4"],
        introduced_assumptions: [],
        introduced_dependencies: ["Lean4"],
        evidence: [`lean_run_manifest:${manifestRel}`],
        lean_files: [normalizedRel(join(leanRootRel, "MathResearch", "Target.lean"))],
        logs: [run.manifest.stdout_path, run.manifest.stderr_path],
        replay_command: command.join(" "),
        replay_project: replayProject,
        summary: "Native candidate checked by service-owned LeanRunner; final authority still requires clean replay.",
        maintainability_notes: "Small service-owned LeanRunner candidate with exact statement binding."
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown_error";
      return {
        state: "candidate_blocked",
        score: -100,
        statement_equivalence_claim: "exact",
        candidate_statement_hash: input.obligation.statement_hash,
        hard_vetoes: ["service_owned_lean_runner_unavailable"],
        failures: [reason],
        replay_command: command.join(" "),
        summary: `Service-owned LeanRunner could not check the native candidate: ${reason}`,
        maintainability_notes: "Candidate remains blocked until LeanRunner/toolchain execution is available."
      };
    }
  };
}
