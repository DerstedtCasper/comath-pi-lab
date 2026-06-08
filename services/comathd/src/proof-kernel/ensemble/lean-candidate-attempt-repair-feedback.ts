import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  createDefaultExternalWheelRegistry,
  getExternalWheelAdapter,
  listExternalWheelAdapters,
  type ExternalWheelAdapterDescriptor,
  type ExternalWheelKind
} from "../../adapters/external-wheel-registry.js";
import { assertPathAllowed } from "../../security/path-policy.js";
import type { LeanRunManifestV3, ProofObligation, ResearchCampaign } from "../../types/schemas.js";
import { sha256FileSync } from "../lean/lean-project.js";
import type { LeanCandidateAttemptLeanRunnerExecution } from "./lean-candidate-attempt-leanrunner-execution.js";
import type {
  LeanCandidateAttemptRepairBatch,
  LeanCandidateAttemptRepairTask
} from "./lean-candidate-attempt-repair.js";

export type LeanCandidateAttemptRepairFeedbackBatch = {
  schema_version: "comath.pi_goal_mode_lean_candidate_attempt_repair_feedback_batch.v1";
  campaign_id: string;
  project_id: string;
  claim_id: string;
  obligation_id: string;
  locked_statement_hash: string;
  source_leanrunner_execution: {
    path: string;
    sha256: string;
    proof_authority: "none";
  };
  source_candidate_index_path: string;
  repair_iteration: number;
  feedback_candidate_count: number;
  lean_run_manifest_paths: string[];
  per_candidate_feedback: Array<{
    candidate_id: string;
    variant_id: LeanCandidateAttemptLeanRunnerExecution["per_candidate_results"][number]["variant_id"];
    lean_runner_result: "lean_runner_rejected";
    plan_path: string;
    plan_sha256: string | null;
    lean_file_path: string;
    lean_file_sha256: string;
    lean_run_manifest_path: string;
    lean_run_manifest_sha256: string;
    stdout_path: string;
    stdout_sha256: string;
    stderr_path: string;
    stderr_sha256: string;
    exit_code: number;
    repair_actions: string[];
    proof_authority: "none";
    can_promote_claim: false;
    result_can_be_used_as_proof: false;
  }>;
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
  result_can_be_used_as_proof: false;
  created_at: string;
};

export type LeanCandidateAttemptRepairHintBundle = {
  schema_version: "comath.pi_goal_mode_lean_candidate_attempt_repair_hint_bundle.v1";
  campaign_id: string;
  project_id: string;
  claim_id: string;
  obligation_id: string;
  locked_statement_hash: string;
  source_repair_feedback_batch: {
    path: string;
    sha256: string;
    proof_authority: "none";
  };
  source_goal_mode_research_plan: {
    path: string;
    sha256: string;
    proof_authority: "none";
  } | null;
  source_goal_mode_adapter_execution_manifest: {
    path: string;
    sha256: string;
    proof_authority: "none";
  } | null;
  source_goal_mode_local_ingestion_evidence: {
    path: string;
    sha256: string;
    proof_authority: "none";
  } | null;
  network_execution_performed: false;
  adapter_repair_hints: Array<{
    hint_id: string;
    kind: ExternalWheelKind;
    adapter_id: string;
    provider: string;
    capabilities: string[];
    derived_from: "external_wheel_registry_descriptor";
    query_hash: string;
    query_text: string;
    target_candidate_ids: string[];
    source_feedback_stderr_sha256_values: string[];
    service_owned_execution_required: true;
    network_execution_performed: false;
    proof_authority: "none";
    can_promote_claim: false;
    result_can_be_used_as_proof: false;
  }>;
  per_candidate_hint_refs: Array<{
    candidate_id: string;
    variant_id: LeanCandidateAttemptLeanRunnerExecution["per_candidate_results"][number]["variant_id"];
    repair_hint_bundle_path: string;
    hint_ids: string[];
    required_actions: string[];
    proof_authority: "none";
  }>;
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
  result_can_be_used_as_proof: false;
  created_at: string;
};

export type LeanCandidateAttemptRepairHintExecution = {
  schema_version: "comath.pi_goal_mode_lean_candidate_attempt_repair_hint_execution.v1";
  campaign_id: string;
  project_id: string;
  claim_id: string;
  obligation_id: string;
  locked_statement_hash: string;
  source_repair_feedback_batch: {
    path: string;
    sha256: string;
    proof_authority: "none";
  };
  source_repair_hint_bundle: {
    path: string;
    sha256: string;
    proof_authority: "none";
  };
  service_owned_adapter_execution: true;
  execution_status: "stubbed_provider_results_recorded";
  network_execution_performed: false;
  live_provider_execution_performed: false;
  stubbed_adapter_execution_performed: true;
  adapter_result_count: number;
  adapter_results: Array<{
    adapter_result_id: string;
    kind: ExternalWheelKind;
    adapter_id: string;
    provider: string;
    source_repair_hint: {
      hint_id: string;
      query_hash: string;
      repair_hint_bundle_path: string;
      repair_hint_bundle_sha256: string;
    };
    request_sha256: string;
    result_payload_sha256: string;
    result_payload_summary: Record<string, unknown>;
    adapter_execution_state: "stubbed_provider_result_recorded";
    capability_metadata: {
      adapter_id: string;
      kind: ExternalWheelKind;
      capabilities: string[];
    };
    terms: ExternalWheelAdapterDescriptor["terms"];
    network_execution_performed: false;
    live_provider_execution_performed: false;
    proof_authority: "none";
    can_promote_claim: false;
    result_can_be_used_as_proof: false;
    promotion_vetoes: ["external_adapter_result_has_no_proof_authority"];
  }>;
  per_candidate_execution_refs: Array<{
    candidate_id: string;
    variant_id: LeanCandidateAttemptLeanRunnerExecution["per_candidate_results"][number]["variant_id"];
    repair_hint_execution_path: string;
    adapter_result_ids: string[];
    required_actions: string[];
    proof_authority: "none";
  }>;
  proof_authority: "none";
  can_promote_claim: false;
  can_certify_ga: false;
  result_can_be_used_as_proof: false;
  created_at: string;
};

export type WriteLeanCandidateAttemptRepairFeedbackResult = {
  feedback_batch: LeanCandidateAttemptRepairFeedbackBatch;
  feedback_batch_path: string;
  hint_bundle: LeanCandidateAttemptRepairHintBundle;
  hint_bundle_path: string;
  hint_execution: LeanCandidateAttemptRepairHintExecution;
  hint_execution_path: string;
  repair_batch: LeanCandidateAttemptRepairBatch;
  repair_batch_path: string;
  task_paths: string[];
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

function readJson(projectRoot: string, relativePath: string): unknown {
  return JSON.parse(readFileSync(assertPathAllowed(projectRoot, relativePath, { purpose: "read", resolveRealpath: true }), "utf8"));
}

function sha256RuntimeFile(projectRoot: string, relativePath: string): string {
  const path = assertPathAllowed(projectRoot, relativePath, { purpose: "read", resolveRealpath: true });
  return sha256FileSync(path).sha256;
}

function sha256Text(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortJson(item));
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(record).sort().map((key) => [key, sortJson(record[key])]));
  }
  return value;
}

function canonicalHash(value: unknown): string {
  return sha256Text(`${JSON.stringify(sortJson(value))}\n`);
}

function optionalArtifactRef(projectRoot: string, relativePath: string): { path: string; sha256: string; proof_authority: "none" } | null {
  try {
    const path = assertPathAllowed(projectRoot, relativePath, { purpose: "read", resolveRealpath: true });
    readFileSync(path);
    return {
      path: relativePath,
      sha256: sha256FileSync(path).sha256,
      proof_authority: "none"
    };
  } catch {
    return null;
  }
}

function repairActions(): string[] {
  return [
    "inspect_lean_stderr_and_repair_failed_goals",
    "consult_non_authoritative_theorem_search_literature_and_cas_hints",
    "preserve_locked_statement_hash",
    "do_not_treat_failed_lean_run_as_proof",
    "rerun_candidate_verification_after_repair"
  ];
}

function readLeanRunManifest(projectRoot: string, relativePath: string): LeanRunManifestV3 {
  const manifest = readJson(projectRoot, relativePath) as LeanRunManifestV3;
  if (manifest.schema_version !== "comath.lean_run_manifest.v3") {
    throw new Error("lean_run_manifest_schema_invalid");
  }
  return manifest;
}

function writeRepairHintBundle(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  obligation: ProofObligation;
  feedbackBatchPath: string;
  feedbackBatchSha256: string;
  feedbackRows: LeanCandidateAttemptRepairFeedbackBatch["per_candidate_feedback"];
  createdAt: string;
}): { bundle: LeanCandidateAttemptRepairHintBundle; bundle_path: string; bundle_sha256: string } {
  const registry = createDefaultExternalWheelRegistry({ now: () => input.createdAt });
  const adapters = listExternalWheelAdapters(registry);
  const selectedAdapters = [
    adapters.find((adapter) => adapter.kind === "theorem_search" && adapter.provider === "loogle"),
    adapters.find((adapter) => adapter.kind === "retrieval" && adapter.provider === "local_markdown"),
    adapters.find((adapter) => adapter.kind === "computation" && adapter.provider === "sympy"),
    adapters.find((adapter) => adapter.kind === "proof_search_backend" && adapter.provider === "aesop"),
    adapters.find((adapter) => adapter.kind === "external_lean_repo" && adapter.provider === "mathlib4")
  ].filter((adapter): adapter is NonNullable<typeof adapter> => Boolean(adapter));
  const targetCandidateIds = input.feedbackRows.map((row) => row.candidate_id);
  const stderrHashes = Array.from(new Set(input.feedbackRows.map((row) => row.stderr_sha256))).sort();
  const adapterRepairHints: LeanCandidateAttemptRepairHintBundle["adapter_repair_hints"] = selectedAdapters.map((adapter, index) => {
    const queryText = [
      `repair Lean candidate attempts for ${input.obligation.obligation_id}`,
      `locked_statement_hash=${input.obligation.statement_hash}`,
      `adapter=${adapter.id}`,
      `stderr_sha256=${stderrHashes.join(",")}`
    ].join("\n");
    const queryHash = canonicalHash({
      adapter_id: adapter.id,
      kind: adapter.kind,
      provider: adapter.provider,
      queryText,
      targetCandidateIds,
      stderrHashes
    });
    return {
      hint_id: `RHINT-${String(index + 1).padStart(4, "0")}`,
      kind: adapter.kind,
      adapter_id: adapter.id,
      provider: adapter.provider,
      capabilities: [...adapter.capabilities],
      derived_from: "external_wheel_registry_descriptor",
      query_hash: queryHash,
      query_text: queryText,
      target_candidate_ids: targetCandidateIds,
      source_feedback_stderr_sha256_values: stderrHashes,
      service_owned_execution_required: true,
      network_execution_performed: false,
      proof_authority: "none",
      can_promote_claim: false,
      result_can_be_used_as_proof: false
    };
  });
  const hintIds = adapterRepairHints.map((hint) => hint.hint_id);
  const bundleRel = campaignRel(input.campaign, "lean_candidate_attempt_repair_hint_bundle.json");
  const bundle: LeanCandidateAttemptRepairHintBundle = {
    schema_version: "comath.pi_goal_mode_lean_candidate_attempt_repair_hint_bundle.v1",
    campaign_id: input.campaign.campaign_id,
    project_id: input.campaign.project_id,
    claim_id: input.campaign.root_claim_id,
    obligation_id: input.obligation.obligation_id,
    locked_statement_hash: input.obligation.statement_hash,
    source_repair_feedback_batch: {
      path: input.feedbackBatchPath,
      sha256: input.feedbackBatchSha256,
      proof_authority: "none"
    },
    source_goal_mode_research_plan: optionalArtifactRef(
      input.projectRoot,
      campaignRel(input.campaign, "goal_mode_research_plan.json")
    ),
    source_goal_mode_adapter_execution_manifest: optionalArtifactRef(
      input.projectRoot,
      campaignRel(input.campaign, "goal_mode_adapter_execution_manifest.json")
    ),
    source_goal_mode_local_ingestion_evidence: optionalArtifactRef(
      input.projectRoot,
      campaignRel(input.campaign, "goal_mode_local_ingestion_evidence.json")
    ),
    network_execution_performed: false,
    adapter_repair_hints: adapterRepairHints,
    per_candidate_hint_refs: input.feedbackRows.map((row) => ({
      candidate_id: row.candidate_id,
      variant_id: row.variant_id,
      repair_hint_bundle_path: bundleRel,
      hint_ids: hintIds,
      required_actions: ["consult_non_authoritative_theorem_search_literature_and_cas_hints"],
      proof_authority: "none"
    })),
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    result_can_be_used_as_proof: false,
    created_at: input.createdAt
  };
  writeJson(input.projectRoot, bundleRel, bundle);
  return {
    bundle,
    bundle_path: bundleRel,
    bundle_sha256: sha256RuntimeFile(input.projectRoot, bundleRel)
  };
}

async function stubbedResultPayloadSummary(input: {
  registry: ReturnType<typeof createDefaultExternalWheelRegistry>;
  adapter: ExternalWheelAdapterDescriptor;
  hint: LeanCandidateAttemptRepairHintBundle["adapter_repair_hints"][number];
  obligation: ProofObligation;
  createdAt: string;
}): Promise<Record<string, unknown>> {
  if (input.adapter.kind === "theorem_search") {
    const adapter = getExternalWheelAdapter(input.registry, "theorem_search", input.adapter.provider);
    const results = await adapter.query({
      query: input.hint.query_text,
      theorem_type: input.obligation.locked_statement_nl,
      limit: 3
    });
    return {
      result_kind: "theorem_search_results",
      result_count: results.length,
      results
    };
  }
  if (input.adapter.kind === "retrieval") {
    const adapter = getExternalWheelAdapter(input.registry, "retrieval", input.adapter.provider);
    const results = await adapter.search({
      query: input.hint.query_text,
      limit: 3
    });
    return {
      result_kind: "retrieval_results",
      result_count: results.length,
      results
    };
  }
  if (input.adapter.kind === "computation") {
    const adapter = getExternalWheelAdapter(input.registry, "computation", input.adapter.provider);
    const report = await adapter.run({
      task: "repair_hint_context",
      input: {
        query_hash: input.hint.query_hash,
        locked_statement_hash: input.obligation.statement_hash,
        source_feedback_stderr_sha256_values: input.hint.source_feedback_stderr_sha256_values
      }
    });
    return {
      result_kind: "computation_report",
      report
    };
  }
  if (input.adapter.kind === "proof_search_backend") {
    const adapter = getExternalWheelAdapter(input.registry, "proof_search_backend", input.adapter.provider);
    const candidate = await adapter.propose({
      locked_statement_hash: input.obligation.statement_hash,
      prompt: input.hint.query_text,
      context: {
        query_hash: input.hint.query_hash,
        target_candidate_ids: input.hint.target_candidate_ids,
        source_feedback_stderr_sha256_values: input.hint.source_feedback_stderr_sha256_values
      }
    });
    return {
      result_kind: "proof_search_candidate_pack",
      candidate
    };
  }
  const adapter = getExternalWheelAdapter(input.registry, "external_lean_repo", input.adapter.provider);
  const candidate = await adapter.inspect({
    ref: input.adapter.provider,
    requested_imports: []
  });
  return {
    result_kind: "external_lean_repo_candidate",
    candidate
  };
}

async function writeRepairHintExecution(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  obligation: ProofObligation;
  feedbackBatchPath: string;
  feedbackBatchSha256: string;
  hintBundle: LeanCandidateAttemptRepairHintBundle;
  hintBundlePath: string;
  hintBundleSha256: string;
  feedbackRows: LeanCandidateAttemptRepairFeedbackBatch["per_candidate_feedback"];
  createdAt: string;
}): Promise<{
  execution: LeanCandidateAttemptRepairHintExecution;
  execution_path: string;
  execution_sha256: string;
}> {
  const registry = createDefaultExternalWheelRegistry({ now: () => input.createdAt });
  const adapterDescriptors = new Map(listExternalWheelAdapters(registry).map((adapter) => [adapter.id, adapter]));
  const executionRel = campaignRel(input.campaign, "lean_candidate_attempt_repair_hint_execution.json");
  const adapterResults: LeanCandidateAttemptRepairHintExecution["adapter_results"] = await Promise.all(
    input.hintBundle.adapter_repair_hints.map(async (hint, index) => {
      const adapter = adapterDescriptors.get(hint.adapter_id);
      if (!adapter) {
        throw new Error("lean_candidate_repair_hint_adapter_missing");
      }
      const request = {
        adapter_id: hint.adapter_id,
        kind: hint.kind,
        provider: hint.provider,
        query_hash: hint.query_hash,
        query_text: hint.query_text,
        target_candidate_ids: hint.target_candidate_ids,
        source_feedback_stderr_sha256_values: hint.source_feedback_stderr_sha256_values
      };
      const resultPayloadSummary = await stubbedResultPayloadSummary({
        registry,
        adapter,
        hint,
        obligation: input.obligation,
        createdAt: input.createdAt
      });
      return {
        adapter_result_id: `RHINTEXEC-${String(index + 1).padStart(4, "0")}`,
        kind: hint.kind,
        adapter_id: hint.adapter_id,
        provider: hint.provider,
        source_repair_hint: {
          hint_id: hint.hint_id,
          query_hash: hint.query_hash,
          repair_hint_bundle_path: input.hintBundlePath,
          repair_hint_bundle_sha256: input.hintBundleSha256
        },
        request_sha256: canonicalHash(request),
        result_payload_sha256: canonicalHash(resultPayloadSummary),
        result_payload_summary: resultPayloadSummary,
        adapter_execution_state: "stubbed_provider_result_recorded",
        capability_metadata: {
          adapter_id: adapter.id,
          kind: adapter.kind,
          capabilities: [...adapter.capabilities]
        },
        terms: { ...adapter.terms },
        network_execution_performed: false,
        live_provider_execution_performed: false,
        proof_authority: "none",
        can_promote_claim: false,
        result_can_be_used_as_proof: false,
        promotion_vetoes: ["external_adapter_result_has_no_proof_authority"]
      };
    })
  );
  const adapterResultIds = adapterResults.map((result) => result.adapter_result_id);
  const execution: LeanCandidateAttemptRepairHintExecution = {
    schema_version: "comath.pi_goal_mode_lean_candidate_attempt_repair_hint_execution.v1",
    campaign_id: input.campaign.campaign_id,
    project_id: input.campaign.project_id,
    claim_id: input.campaign.root_claim_id,
    obligation_id: input.obligation.obligation_id,
    locked_statement_hash: input.obligation.statement_hash,
    source_repair_feedback_batch: {
      path: input.feedbackBatchPath,
      sha256: input.feedbackBatchSha256,
      proof_authority: "none"
    },
    source_repair_hint_bundle: {
      path: input.hintBundlePath,
      sha256: input.hintBundleSha256,
      proof_authority: "none"
    },
    service_owned_adapter_execution: true,
    execution_status: "stubbed_provider_results_recorded",
    network_execution_performed: false,
    live_provider_execution_performed: false,
    stubbed_adapter_execution_performed: true,
    adapter_result_count: adapterResults.length,
    adapter_results: adapterResults,
    per_candidate_execution_refs: input.feedbackRows.map((row) => ({
      candidate_id: row.candidate_id,
      variant_id: row.variant_id,
      repair_hint_execution_path: executionRel,
      adapter_result_ids: adapterResultIds,
      required_actions: ["apply_service_owned_non_authoritative_repair_hint_results"],
      proof_authority: "none"
    })),
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    result_can_be_used_as_proof: false,
    created_at: input.createdAt
  };
  writeJson(input.projectRoot, executionRel, execution);
  return {
    execution,
    execution_path: executionRel,
    execution_sha256: sha256RuntimeFile(input.projectRoot, executionRel)
  };
}

function createRepairTask(input: {
  campaign: ResearchCampaign;
  obligation: ProofObligation;
  feedbackBatchPath: string;
  feedbackBatchSha256: string;
  feedback: LeanCandidateAttemptRepairFeedbackBatch["per_candidate_feedback"][number];
  hintBundlePath: string;
  hintBundleSha256: string;
  sourceRepairHints: LeanCandidateAttemptRepairHintBundle["adapter_repair_hints"];
  hintExecutionPath: string;
  hintExecutionSha256: string;
  sourceRepairHintResults: LeanCandidateAttemptRepairHintExecution["adapter_results"];
  createdAt: string;
}): LeanCandidateAttemptRepairTask & {
  source_feedback_batch: { path: string; sha256: string; proof_authority: "none" };
  source_feedback: LeanCandidateAttemptRepairFeedbackBatch["per_candidate_feedback"][number];
  source_repair_hint_bundle: { path: string; sha256: string; proof_authority: "none" };
  source_repair_hints: LeanCandidateAttemptRepairHintBundle["adapter_repair_hints"];
  source_repair_hint_execution: { path: string; sha256: string; proof_authority: "none" };
  source_repair_hint_results: LeanCandidateAttemptRepairHintExecution["adapter_results"];
} {
  return {
    schema_version: "comath.pi_goal_mode_lean_candidate_attempt_repair_task.v1",
    campaign_id: input.campaign.campaign_id,
    project_id: input.campaign.project_id,
    claim_id: input.campaign.root_claim_id,
    obligation_id: input.obligation.obligation_id,
    candidate_id: input.feedback.candidate_id,
    variant_id: input.feedback.variant_id,
    repair_iteration: 2,
    coordinator_agent_id: "A0",
    assigned_agents: ["A5", "A8"],
    source_check_report: {
      path: input.feedbackBatchPath,
      sha256: input.feedbackBatchSha256,
      proof_authority: "none"
    },
    source_repair_hint_bundle: {
      path: input.hintBundlePath,
      sha256: input.hintBundleSha256,
      proof_authority: "none"
    },
    source_repair_hints: input.sourceRepairHints,
    source_repair_hint_execution: {
      path: input.hintExecutionPath,
      sha256: input.hintExecutionSha256,
      proof_authority: "none"
    },
    source_repair_hint_results: input.sourceRepairHintResults,
    source_check: {
      result: "repair_required",
      has_sorry: false,
      has_repair_placeholder: false,
      has_lean_hole: false,
      has_lean_theorem_declaration: true,
      plan_path: input.feedback.plan_path,
      plan_sha256: input.feedback.plan_sha256,
      lean_file_path: input.feedback.lean_file_path,
      lean_file_sha256: input.feedback.lean_file_sha256,
      statement_boundary_hash_matches: true,
      source_skeleton_hash_matches: true,
      blueprint_hash_matches: true
    },
    source_feedback_batch: {
      path: input.feedbackBatchPath,
      sha256: input.feedbackBatchSha256,
      proof_authority: "none"
    },
    source_feedback: input.feedback,
    required_actions: Array.from(
      new Set([...input.feedback.repair_actions, "apply_service_owned_non_authoritative_repair_hint_results"])
    ),
    allowed_inputs: [
      input.feedback.lean_file_path,
      input.feedback.plan_path,
      input.feedback.lean_run_manifest_path,
      input.feedback.stdout_path,
      input.feedback.stderr_path,
      input.hintBundlePath,
      input.hintExecutionPath
    ],
    forbidden_outputs: [
      "proof_claim",
      "LeanRunManifest",
      "FinalReplayManifest",
      "claim_promotion",
      "statement_change_without_FormalSpecLock_and_StatementDiffGate"
    ],
    service_owned_execution_required: true,
    lean_runner_invocation_allowed: false,
    may_mutate_trusted_state: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    result_can_be_used_as_proof: false,
    created_at: input.createdAt
  };
}

export async function writeLeanCandidateAttemptRepairFeedbackBatch(input: {
  projectRoot: string;
  campaign: ResearchCampaign;
  obligation: ProofObligation;
  executionPath: string;
  execution: LeanCandidateAttemptLeanRunnerExecution;
}): Promise<WriteLeanCandidateAttemptRepairFeedbackResult> {
  if (input.execution.execution_result !== "all_attempts_rejected") {
    throw new Error("lean_candidate_repair_feedback_requires_all_rejected_execution");
  }
  const createdAt = new Date().toISOString();
  const executionSha256 = sha256RuntimeFile(input.projectRoot, input.executionPath);
  const feedbackRows: LeanCandidateAttemptRepairFeedbackBatch["per_candidate_feedback"] = [];

  for (const result of input.execution.per_candidate_results) {
    if (result.result !== "lean_runner_rejected") {
      continue;
    }
    const runManifest = readLeanRunManifest(input.projectRoot, result.lean_run_manifest_path);
    feedbackRows.push({
      candidate_id: result.candidate_id,
      variant_id: result.variant_id,
      lean_runner_result: "lean_runner_rejected",
      plan_path: result.plan_path,
      plan_sha256: result.plan_sha256,
      lean_file_path: result.lean_file_path,
      lean_file_sha256: result.lean_file_sha256,
      lean_run_manifest_path: result.lean_run_manifest_path,
      lean_run_manifest_sha256: sha256RuntimeFile(input.projectRoot, result.lean_run_manifest_path),
      stdout_path: runManifest.stdout_path,
      stdout_sha256: runManifest.stdout_sha256,
      stderr_path: runManifest.stderr_path,
      stderr_sha256: runManifest.stderr_sha256,
      exit_code: runManifest.exit_code,
      repair_actions: repairActions(),
      proof_authority: "none",
      can_promote_claim: false,
      result_can_be_used_as_proof: false
    });
  }

  const feedbackBatch: LeanCandidateAttemptRepairFeedbackBatch = {
    schema_version: "comath.pi_goal_mode_lean_candidate_attempt_repair_feedback_batch.v1",
    campaign_id: input.campaign.campaign_id,
    project_id: input.campaign.project_id,
    claim_id: input.campaign.root_claim_id,
    obligation_id: input.obligation.obligation_id,
    locked_statement_hash: input.obligation.statement_hash,
    source_leanrunner_execution: {
      path: input.executionPath,
      sha256: executionSha256,
      proof_authority: "none"
    },
    source_candidate_index_path: input.execution.updated_candidate_index_path,
    repair_iteration: 2,
    feedback_candidate_count: feedbackRows.length,
    lean_run_manifest_paths: feedbackRows.map((row) => row.lean_run_manifest_path),
    per_candidate_feedback: feedbackRows,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    result_can_be_used_as_proof: false,
    created_at: createdAt
  };
  const feedbackRel = campaignRel(input.campaign, "lean_candidate_attempt_repair_feedback_batch.json");
  writeJson(input.projectRoot, feedbackRel, feedbackBatch);
  const feedbackSha256 = sha256RuntimeFile(input.projectRoot, feedbackRel);
  const hintBundle = writeRepairHintBundle({
    projectRoot: input.projectRoot,
    campaign: input.campaign,
    obligation: input.obligation,
    feedbackBatchPath: feedbackRel,
    feedbackBatchSha256: feedbackSha256,
    feedbackRows,
    createdAt
  });
  const hintExecution = await writeRepairHintExecution({
    projectRoot: input.projectRoot,
    campaign: input.campaign,
    obligation: input.obligation,
    feedbackBatchPath: feedbackRel,
    feedbackBatchSha256: feedbackSha256,
    hintBundle: hintBundle.bundle,
    hintBundlePath: hintBundle.bundle_path,
    hintBundleSha256: hintBundle.bundle_sha256,
    feedbackRows,
    createdAt
  });

  const taskPaths: string[] = [];
  const perCandidateRepairs: LeanCandidateAttemptRepairBatch["per_candidate_repairs"] = [];
  for (const feedback of feedbackRows) {
    const taskRel = normalizedRel(join(dirname(feedback.lean_file_path), "lean_candidate_repair_task.json"));
    const task = createRepairTask({
      campaign: input.campaign,
      obligation: input.obligation,
      feedbackBatchPath: feedbackRel,
      feedbackBatchSha256: feedbackSha256,
      feedback,
      hintBundlePath: hintBundle.bundle_path,
      hintBundleSha256: hintBundle.bundle_sha256,
      sourceRepairHints: hintBundle.bundle.adapter_repair_hints,
      hintExecutionPath: hintExecution.execution_path,
      hintExecutionSha256: hintExecution.execution_sha256,
      sourceRepairHintResults: hintExecution.execution.adapter_results,
      createdAt
    });
    writeJson(input.projectRoot, taskRel, task);
    const taskSha256 = sha256RuntimeFile(input.projectRoot, taskRel);
    taskPaths.push(taskRel);
    perCandidateRepairs.push({
      candidate_id: feedback.candidate_id,
      variant_id: feedback.variant_id,
      repair_task_path: taskRel,
      repair_task_sha256: taskSha256,
      source_lean_file_path: feedback.lean_file_path,
      source_lean_file_sha256: feedback.lean_file_sha256,
      required_actions: [...feedback.repair_actions]
    });
  }

  const repairBatch = {
    schema_version: "comath.pi_goal_mode_lean_candidate_attempt_repair_batch.v1" as const,
    campaign_id: input.campaign.campaign_id,
    project_id: input.campaign.project_id,
    claim_id: input.campaign.root_claim_id,
    obligation_id: input.obligation.obligation_id,
    locked_statement_hash: input.obligation.statement_hash,
    source_check_report: {
      path: feedbackRel,
      sha256: feedbackSha256,
      proof_authority: "none" as const,
      can_promote_claim: false
    },
    source_feedback_batch: {
      path: feedbackRel,
      sha256: feedbackSha256,
      proof_authority: "none" as const
    },
    source_repair_hint_bundle: {
      path: hintBundle.bundle_path,
      sha256: hintBundle.bundle_sha256,
      proof_authority: "none" as const
    },
    source_repair_hint_execution: {
      path: hintExecution.execution_path,
      sha256: hintExecution.execution_sha256,
      proof_authority: "none" as const
    },
    repair_iteration: 2,
    repair_required_candidate_count: perCandidateRepairs.length,
    blocked_candidate_count: 0,
    ready_for_lean_runner_candidate_count: 0,
    repair_task_count: perCandidateRepairs.length,
    repair_tasks_materialized: true as const,
    per_candidate_repairs: perCandidateRepairs,
    repair_task_paths: taskPaths,
    next_stage_after_repair: "candidate_verification" as const,
    lean_runner_invocations: 0 as const,
    lean_run_manifest_paths: feedbackBatch.lean_run_manifest_paths,
    repair_hint_bundle_paths: [hintBundle.bundle_path],
    repair_hint_execution_paths: [hintExecution.execution_path],
    proof_authority: "none" as const,
    can_promote_claim: false,
    can_certify_ga: false,
    result_can_be_used_as_proof: false,
    created_at: createdAt
  };
  const repairRel = campaignRel(input.campaign, "lean_candidate_attempt_repair_batch.json");
  writeJson(input.projectRoot, repairRel, repairBatch);
  return {
    feedback_batch: feedbackBatch,
    feedback_batch_path: feedbackRel,
    hint_bundle: hintBundle.bundle,
    hint_bundle_path: hintBundle.bundle_path,
    hint_execution: hintExecution.execution,
    hint_execution_path: hintExecution.execution_path,
    repair_batch: repairBatch as LeanCandidateAttemptRepairBatch,
    repair_batch_path: repairRel,
    task_paths: taskPaths
  };
}
