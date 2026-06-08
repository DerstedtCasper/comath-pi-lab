import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { assertPathAllowed } from "../../security/path-policy.js";
import {
  candidateManifestSchema,
  candidateRunSchema,
  type CandidateManifest,
  type CandidateRun,
  type ProofObligation,
  type ResearchCampaign
} from "../../types/schemas.js";
import { sha256FileSync } from "../lean/lean-project.js";
import { runLeanToolVersionCommand } from "../lean/lean-host-tools.js";
import { runServiceOwnedLeanCommandV3 } from "../lean/lean-run-manifest-v3.js";
import type { LeanCandidateAttemptCheckReport } from "./lean-candidate-attempt-check.js";

export type LeanCandidateAttemptCommandRunner = (
  command: string[],
  cwd: string
) => { exit_code: number; stdout: string; stderr: string };

export type LeanCandidateAttemptRunnerConfig = {
  leanVersionOutput?: string;
  lakeVersionOutput?: string;
  leanToolchain?: string;
  run?: LeanCandidateAttemptCommandRunner;
};

export type LeanCandidateAttemptLeanRunnerExecution = {
  schema_version: "comath.pi_goal_mode_lean_candidate_attempt_leanrunner_execution.v1";
  campaign_id: string;
  project_id: string;
  claim_id: string;
  obligation_id: string;
  locked_statement_hash: string;
  execution_result: "kernel_checked_candidates_available" | "all_attempts_rejected";
  source_check_report: {
    path: string;
    sha256: string;
    proof_authority: "none";
  };
  source_candidate_index_path: string;
  updated_candidate_index_path: string;
  ready_candidate_count: number;
  kernel_checked_candidate_count: number;
  rejected_candidate_count: number;
  lean_runner_invocations: number;
  lean_run_manifest_paths: string[];
  per_candidate_results: Array<{
    candidate_id: string;
    variant_id: CandidateRun["variant_id"];
    result: "kernel_checked" | "lean_runner_rejected";
    plan_path: string;
    plan_sha256: string | null;
    lean_file_path: string;
    lean_file_sha256: string;
    lakefile_path: string;
    toolchain_file_path: string;
    lean_run_manifest_path: string;
    exit_code: number;
    placeholder_present: boolean;
    proof_authority: "none" | "lean_kernel_check";
    can_promote_claim: false;
    result_can_be_used_as_proof: false;
  }>;
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
  result_can_be_used_as_proof: false;
  created_at: string;
};

export type ExecuteLeanCandidateAttemptLeanRunnerResult = {
  execution: LeanCandidateAttemptLeanRunnerExecution;
  execution_path: string;
  candidates: CandidateRun[];
  blocker_required: boolean;
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

function stableRunId(input: { campaignId: string; obligationId: string; candidateId: string }): string {
  const seed = `${input.campaignId}:${input.obligationId}:${input.candidateId}:pi-goal-attempt`;
  let hash = 2_166_136_261;
  for (const char of seed) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16_777_619) >>> 0;
  }
  return `LRUN-${String(hash).padStart(10, "0")}`;
}

function readCandidateManifest(projectRoot: string, candidate: CandidateRun): CandidateManifest {
  if (!candidate.manifest_path) {
    throw new Error("lean_candidate_attempt_manifest_missing");
  }
  return candidateManifestSchema.parse(JSON.parse(readText(projectRoot, candidate.manifest_path)));
}

function theoremNameFromObligation(obligation: ProofObligation): string {
  if (obligation.lean_target && obligation.lean_target.trim().length > 0) {
    return obligation.lean_target.trim();
  }
  const structured = obligation.locked_statement_structured as Record<string, unknown>;
  const namespace = typeof structured.namespace === "string" && structured.namespace.trim() ? structured.namespace.trim() : "MathResearch";
  const theoremName =
    typeof structured.theorem_name === "string" && structured.theorem_name.trim()
      ? structured.theorem_name.trim()
      : "Goal";
  return theoremName.includes(".") ? theoremName : `${namespace}.${theoremName}`;
}

function propositionFromObligation(obligation: ProofObligation): string {
  const structured = obligation.locked_statement_structured as Record<string, unknown>;
  if (typeof structured.theorem_type_pretty === "string" && structured.theorem_type_pretty.trim()) {
    return structured.theorem_type_pretty.trim();
  }
  if (typeof structured.conclusion === "string" && structured.conclusion.trim()) {
    return structured.conclusion.trim();
  }
  return obligation.locked_statement_nl;
}

function stripProofBody(header: string): string {
  return header.replace(/\s*:=\s*by[\s\S]*$/u, "").trim();
}

function replayTheoremHeader(input: {
  obligation: ProofObligation;
  shortTheoremName: string;
  proposition: string;
}): string {
  const structured = input.obligation.locked_statement_structured as Record<string, unknown>;
  const rawHeader = typeof structured.theorem_header === "string" ? stripProofBody(structured.theorem_header) : "";
  return rawHeader || `theorem ${input.shortTheoremName} : ${input.proposition}`;
}

function theoremSignature(input: { theoremName: string; proposition: string }): string {
  return `${input.theoremName} : ${input.proposition}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripLeanComments(text: string): string {
  return text
    .replace(/\/-[\s\S]*?-\//gu, "")
    .split(/\r?\n/)
    .map((line) => {
      const index = line.indexOf("--");
      return index >= 0 ? line.slice(0, index) : line;
    })
    .join("\n");
}

function materializeReplayTargetLean(input: {
  projectRoot: string;
  candidate: CandidateRun;
  namespace: string;
  shortTheoremName: string;
  theoremName: string;
  proposition: string;
}): string {
  const candidateLeanRel = normalizedRel(join(input.candidate.workspace_path, "LeanCandidate.lean"));
  const source = stripLeanComments(readText(input.projectRoot, candidateLeanRel));
  const theoremNames = [input.shortTheoremName, input.theoremName].map(escapeRegExp);
  const declarationPattern = new RegExp(`\\b(theorem|lemma)\\s+(?:${theoremNames.join("|")})\\b`, "u");
  if (!declarationPattern.test(source)) {
    throw new Error("candidate_replay_project_theorem_declaration_missing");
  }

  const normalizedSource = source.replace(declarationPattern, `$1 ${input.shortTheoremName}`);
  const lines = normalizedSource.split(/\r?\n/);
  const importLines: string[] = [];
  const bodyLines: string[] = [];
  for (const line of lines) {
    if (/^\s*import\s+/.test(line)) {
      importLines.push(line);
    } else {
      bodyLines.push(line);
    }
  }
  const body = bodyLines.join("\n").trim();
  const namespacePattern = new RegExp(`\\bnamespace\\s+${escapeRegExp(input.namespace)}\\b`, "u");
  if (namespacePattern.test(body)) {
    return [...importLines, ...(importLines.length > 0 ? [""] : []), body, ""].join("\n");
  }
  return [
    ...importLines,
    ...(importLines.length > 0 ? [""] : []),
    `namespace ${input.namespace}`,
    "",
    body,
    "",
    `end ${input.namespace}`,
    ""
  ].join("\n");
}

function writeCandidateReplayDescriptor(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  obligation: ProofObligation;
  candidate: CandidateRun;
  manifest: CandidateManifest;
  lakefileRel: string;
  toolchainRel: string;
}): string {
  const theoremName = theoremNameFromObligation(input.obligation);
  const theoremNameParts = theoremName.split(".");
  const shortTheoremName = theoremNameParts.at(-1) ?? theoremName;
  const namespace = theoremNameParts.length > 1 ? theoremNameParts.slice(0, -1).join(".") : "MathResearch";
  const proposition = propositionFromObligation(input.obligation);
  const signature = theoremSignature({ theoremName, proposition });
  const replayRootRel = normalizedRel(join(input.candidate.workspace_path, "final_replay_project"));
  const formalSpecRel = normalizedRel(join(replayRootRel, "FormalSpec", "formal_spec_lock.json"));
  const ledgerRel = normalizedRel(join(replayRootRel, "FormalSpec", "assumption_ledger.json"));
  const targetRel = normalizedRel(join(replayRootRel, "MathResearch", "Target.lean"));
  const auditRel = normalizedRel(join(replayRootRel, "Audit", "LeanCandidateAudit.lean"));
  const lakefileRel = normalizedRel(join(replayRootRel, "lakefile.lean"));
  const replayToolchainRel = normalizedRel(join(replayRootRel, "lean-toolchain"));
  const lakeManifestRel = normalizedRel(join(replayRootRel, "lake-manifest.json"));
  writeText(
    input.projectRoot,
    targetRel,
    materializeReplayTargetLean({
      projectRoot: input.projectRoot,
      candidate: input.candidate,
      namespace,
      shortTheoremName,
      theoremName,
      proposition
    })
  );
  writeJson(input.projectRoot, formalSpecRel, {
    schema_version: "comath.formal_spec_lock.v2",
    binding_scope: "campaign",
    campaign_id: input.campaign.campaign_id,
    claim_id: input.campaign.root_claim_id,
    original_goal_text: input.obligation.locked_statement_nl,
    original_goal_sha256: input.obligation.statement_hash,
    normalized_nl_statement: signature,
    theorem_name: shortTheoremName,
    namespace,
    theorem_header: replayTheoremHeader({ obligation: input.obligation, shortTheoremName, proposition }),
    theorem_type_pretty: proposition,
    variables: [],
    assumptions: [],
    conclusion: proposition,
    notation_conventions: [],
    imports_allowed: [],
    external_dependencies_allowed: [],
    trust_profile_id: "lean4_mathlib_default",
    statement_hash: input.obligation.statement_hash,
    locked_by: "comathd.pi-goal-mode-attempt-leanrunner",
    locked_at: new Date().toISOString(),
    user_approval_required: false,
    proof_authority: "none"
  });
  writeJson(input.projectRoot, ledgerRel, {
    schema_version: "comath.assumption_ledger.v1",
    binding_scope: "campaign",
    campaign_id: input.campaign.campaign_id,
    claim_id: input.campaign.root_claim_id,
    formal_spec_lock_hash: input.obligation.statement_hash,
    entries: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    proof_authority: "none"
  });
  writeText(input.projectRoot, auditRel, [`import MathResearch.Target`, `#check ${theoremName}`, `#print axioms ${theoremName}`, ""].join("\n"));
  writeText(
    input.projectRoot,
    lakefileRel,
    ["import Lake", "open Lake DSL", "package MathResearch where", "lean_lib MathResearch where", "  roots := #[`MathResearch.Target]", ""].join("\n")
  );
  writeText(input.projectRoot, replayToolchainRel, readText(input.projectRoot, input.toolchainRel));
  writeJson(input.projectRoot, lakeManifestRel, { version: 7, packages: [] });
  const descriptorRel = normalizedRel(join(replayRootRel, "candidate_replay_project_descriptor.json"));
  writeJson(input.projectRoot, descriptorRel, {
    schema_version: "comath.candidate_replay_project_descriptor.v1",
    campaign_id: input.campaign.campaign_id,
    claim_id: input.campaign.root_claim_id,
    obligation_id: input.obligation.obligation_id,
    candidate_id: input.candidate.candidate_id,
    artifact_role: "candidate_replay_project_descriptor",
    proof_authority: "none",
    can_promote_claim: false,
    lean_project: {
      lean_root: replayRootRel,
      theorem_file_rel: "MathResearch/Target.lean",
      formal_spec_file: "FormalSpec/formal_spec_lock.json",
      assumption_ledger_file: "FormalSpec/assumption_ledger.json",
      audit_file_rel: "Audit/LeanCandidateAudit.lean",
      lakefile: "lakefile.lean",
      toolchain_file: "lean-toolchain",
      theorem_name: theoremName,
      theorem_family_id: input.campaign.campaign_id,
      canonical_proposition: proposition,
      build_targets: ["MathResearch"],
      replay_command: "lake build MathResearch",
      primary_dependency: "Lean4",
      formal_spec: {
        claim_id: input.campaign.root_claim_id,
        theorem_name: shortTheoremName,
        namespace,
        normalized_statement: signature,
        locked_statement_hash: input.obligation.statement_hash
      }
    }
  });
  return descriptorRel;
}

function writeLeanCandidateLakeProject(input: {
  projectRoot: string;
  workspacePath: string;
  leanToolchain: string;
}): { lakefileRel: string; toolchainRel: string } {
  const lakefileRel = normalizedRel(join(input.workspacePath, "lakefile.lean"));
  const toolchainRel = normalizedRel(join(input.workspacePath, "lean-toolchain"));
  writeText(
    input.projectRoot,
    lakefileRel,
    ["import Lake", "open Lake DSL", "package LeanCandidate where", "lean_lib LeanCandidate where", ""].join("\n")
  );
  writeText(input.projectRoot, toolchainRel, `${input.leanToolchain.trim()}\n`);
  return { lakefileRel, toolchainRel };
}

function appendUnique<T>(items: T[], extra: T[]): T[] {
  return Array.from(new Set([...items, ...extra]));
}

export function executeLeanCandidateAttemptLeanRunner(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  obligation: ProofObligation;
  candidates: CandidateRun[];
  sourceCandidateIndexPath: string;
  checkReportPath: string;
  checkReport: LeanCandidateAttemptCheckReport;
  runner?: LeanCandidateAttemptRunnerConfig;
}): ExecuteLeanCandidateAttemptLeanRunnerResult {
  const checkReportSha256 = sha256RuntimeFile(input.projectRoot, input.checkReportPath);
  const createdAt = new Date().toISOString();
  const leanToolchain = input.runner?.leanToolchain ?? "leanprover/lean4:v4.23.0";
  const probeCwd = assertPathAllowed(input.projectRoot, ".", { purpose: "read", resolveRealpath: true });
  const leanVersionOutput =
    input.runner?.leanVersionOutput ?? runLeanToolVersionCommand("lean", ["--version"], probeCwd, leanToolchain);
  const lakeVersionOutput =
    input.runner?.lakeVersionOutput ?? runLeanToolVersionCommand("lake", ["--version"], probeCwd, leanToolchain);
  const candidateById = new Map(input.candidates.map((candidate) => [candidate.candidate_id, candidate]));
  const updatedCandidates = input.candidates.map((candidate) => ({ ...candidate }));
  const updatedCandidateById = new Map(updatedCandidates.map((candidate) => [candidate.candidate_id, candidate]));
  const readyChecks = input.checkReport.per_candidate_checks.filter((check) => check.result === "ready_for_lean_runner");
  const manifestPaths: string[] = [];
  const artifactPaths: string[] = [];
  const perCandidateResults: LeanCandidateAttemptLeanRunnerExecution["per_candidate_results"] = [];

  for (const check of readyChecks) {
    const candidate = candidateById.get(check.candidate_id);
    const updatedCandidate = updatedCandidateById.get(check.candidate_id);
    if (!candidate || !updatedCandidate) {
      throw new Error("lean_candidate_attempt_candidate_missing");
    }
    const manifest = readCandidateManifest(input.projectRoot, candidate);
    const leanText = readText(input.projectRoot, check.lean_file_path);
    const placeholderPresent = leanText.includes("comath_repair_placeholder");
    const { lakefileRel, toolchainRel } = writeLeanCandidateLakeProject({
      projectRoot: input.projectRoot,
      workspacePath: candidate.workspace_path,
      leanToolchain
    });
    const cwd = assertPathAllowed(input.projectRoot, candidate.workspace_path, { purpose: "read", resolveRealpath: true });
    const runId = stableRunId({
      campaignId: input.campaign.campaign_id,
      obligationId: input.obligation.obligation_id,
      candidateId: candidate.candidate_id
    });
    const command = ["lake", "build", "LeanCandidate"];
    const run = runServiceOwnedLeanCommandV3({
      projectRoot: input.projectRoot,
      project_id: input.campaign.project_id,
      actor: "comathd.pi-goal-mode-attempt-leanrunner",
      run_id: runId,
      claim_id: input.campaign.root_claim_id,
      campaign_id: input.campaign.campaign_id,
      candidate_id: candidate.candidate_id,
      purpose: "check",
      command,
      cwd,
      input_files: [
        assertPathAllowed(input.projectRoot, check.lean_file_path, { purpose: "read", resolveRealpath: true }),
        assertPathAllowed(input.projectRoot, check.plan_path, { purpose: "read", resolveRealpath: true }),
        assertPathAllowed(input.projectRoot, lakefileRel, { purpose: "read", resolveRealpath: true }),
        assertPathAllowed(input.projectRoot, toolchainRel, { purpose: "read", resolveRealpath: true })
      ],
      leanVersionOutput,
      lakeVersionOutput,
      leanToolchain,
      network_policy: "disabled",
      sandbox: "none",
      proof_authority: placeholderPresent ? "none" : "lean_kernel_check",
      run: input.runner?.run
    });
    const manifestRel = normalizedRel(join(".comath", "evidence", input.campaign.root_claim_id, "lean", `${runId}.manifest.json`));
    manifestPaths.push(manifestRel);
    const accepted = run.manifest.exit_code === 0 && !placeholderPresent;
    const hardVetoes = accepted ? manifest.hard_vetoes : appendUnique(manifest.hard_vetoes, ["service_owned_lean_runner_rejected_candidate_attempt"]);
    const evidence = appendUnique(manifest.evidence, [`lean_run_manifest:${manifestRel}`]);
    let artifacts = manifest.artifacts;
    if (accepted) {
      const descriptorRel = writeCandidateReplayDescriptor({
        projectRoot: input.projectRoot,
        campaign: input.campaign,
        obligation: input.obligation,
        candidate,
        manifest,
        lakefileRel,
        toolchainRel
      });
      artifacts = appendUnique(artifacts, [
        {
          path: "final_replay_project/candidate_replay_project_descriptor.json",
          kind: "candidate_replay_project_descriptor",
          required_for: ["candidate_replay_material_source"]
        }
      ]);
      artifactPaths.push(descriptorRel);
    }
    const nextState = accepted ? "candidate_kernel_checked" : "candidate_failed";
    const replayCommand = command.join(" ");
    const updatedManifest = candidateManifestSchema.parse({
      ...manifest,
      state: nextState,
      evidence,
      hard_vetoes: hardVetoes,
      dependencies: accepted ? appendUnique(manifest.dependencies, ["Lean4"]) : manifest.dependencies,
      introduced_dependencies: accepted ? appendUnique(manifest.introduced_dependencies, ["Lean4"]) : manifest.introduced_dependencies,
      artifacts,
      logs: appendUnique(manifest.logs, [run.manifest.stdout_path, run.manifest.stderr_path]),
      replay_command: replayCommand,
      summary: accepted
        ? "Repaired Lean candidate checked by service-owned LeanRunner; final authority still requires clean replay."
        : "Service-owned LeanRunner rejected the repaired Lean candidate attempt.",
      maintainability_notes: accepted
        ? "Candidate may proceed to arbitration as LeanRunner evidence, not final proof."
        : "Lean failure is replayable blocker evidence and repair input."
    });
    if (!candidate.manifest_path) {
      throw new Error("lean_candidate_attempt_manifest_missing");
    }
    writeJson(input.projectRoot, candidate.manifest_path, updatedManifest);
    updatedCandidate.state = nextState;
    updatedCandidate.score = accepted ? 150 : -50;
    updatedCandidate.hard_vetoes = hardVetoes;
    updatedCandidate.replay_command = replayCommand;
    perCandidateResults.push({
      candidate_id: candidate.candidate_id,
      variant_id: candidate.variant_id,
      result: accepted ? "kernel_checked" : "lean_runner_rejected",
      plan_path: check.plan_path,
      plan_sha256: check.plan_sha256,
      lean_file_path: check.lean_file_path,
      lean_file_sha256: sha256RuntimeFile(input.projectRoot, check.lean_file_path),
      lakefile_path: lakefileRel,
      toolchain_file_path: toolchainRel,
      lean_run_manifest_path: manifestRel,
      exit_code: run.manifest.exit_code,
      placeholder_present: placeholderPresent,
      proof_authority: accepted ? "lean_kernel_check" : "none",
      can_promote_claim: false,
      result_can_be_used_as_proof: false
    });
    artifactPaths.push(lakefileRel, toolchainRel, manifestRel);
  }

  const parsedCandidates = candidateRunSchema.array().parse(updatedCandidates);
  writeJson(input.projectRoot, input.sourceCandidateIndexPath, parsedCandidates);
  const kernelChecked = perCandidateResults.filter((result) => result.result === "kernel_checked").length;
  const rejected = perCandidateResults.filter((result) => result.result === "lean_runner_rejected").length;
  const execution: LeanCandidateAttemptLeanRunnerExecution = {
    schema_version: "comath.pi_goal_mode_lean_candidate_attempt_leanrunner_execution.v1",
    campaign_id: input.campaign.campaign_id,
    project_id: input.campaign.project_id,
    claim_id: input.campaign.root_claim_id,
    obligation_id: input.obligation.obligation_id,
    locked_statement_hash: input.obligation.statement_hash,
    execution_result: kernelChecked > 0 ? "kernel_checked_candidates_available" : "all_attempts_rejected",
    source_check_report: {
      path: input.checkReportPath,
      sha256: checkReportSha256,
      proof_authority: "none"
    },
    source_candidate_index_path: input.sourceCandidateIndexPath,
    updated_candidate_index_path: input.sourceCandidateIndexPath,
    ready_candidate_count: readyChecks.length,
    kernel_checked_candidate_count: kernelChecked,
    rejected_candidate_count: rejected,
    lean_runner_invocations: perCandidateResults.length,
    lean_run_manifest_paths: manifestPaths,
    per_candidate_results: perCandidateResults,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    result_can_be_used_as_proof: false,
    created_at: createdAt
  };
  const executionRel = campaignRel(input.campaign, "lean_candidate_attempt_leanrunner_execution.json");
  writeJson(input.projectRoot, executionRel, execution);
  artifactPaths.push(executionRel);
  return {
    execution,
    execution_path: executionRel,
    candidates: parsedCandidates,
    blocker_required: kernelChecked === 0,
    artifact_paths: Array.from(new Set(artifactPaths))
  };
}
