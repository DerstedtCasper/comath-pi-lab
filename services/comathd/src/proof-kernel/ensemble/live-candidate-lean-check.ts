import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { assertPathAllowed } from "../../security/path-policy.js";
import type { ProofObligation, ResearchCampaign } from "../../types/schemas.js";
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
    proposition: match[2]!
  };
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
      `namespace ${input.parsed.namespace}`,
      "",
      `theorem ${input.parsed.theoremName} : ${input.parsed.proposition} := by`,
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
    `${JSON.stringify(
      {
        claim_id: input.campaign.root_claim_id,
        theorem_name: input.parsed.theoremName,
        namespace: input.parsed.namespace,
        normalized_statement: input.obligation.locked_statement_nl,
        locked_statement_hash: input.obligation.statement_hash
      },
      null,
      2
    )}\n`
  );
  const ledger = writeProjectFile(
    input.projectRoot,
    ledgerRel,
    `${JSON.stringify({ claim_id: input.campaign.root_claim_id, assumptions: [], introduced_assumptions: [] }, null, 2)}\n`
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
    const parsed = parseLeanHeader(input.obligation.locked_statement_nl, input.obligation.lean_target);
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
