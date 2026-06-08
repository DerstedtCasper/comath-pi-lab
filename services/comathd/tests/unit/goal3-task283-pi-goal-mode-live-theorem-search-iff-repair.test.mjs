import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { executeLeanCandidateAttemptRepairBatch } from "../../dist/index.js";

const root = mkdtempSync(join(tmpdir(), "comath-goal3-task283-live-theorem-search-iff-repair-"));

function sha256Text(text) {
  return createHash("sha256").update(text).digest("hex");
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function writeRuntime(relativePath, value) {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value, "utf8");
  return path;
}

function writeJson(relativePath, value) {
  return writeRuntime(relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function readText(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function stripLineComments(text) {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const index = line.indexOf("--");
      return index >= 0 ? line.slice(0, index) : line;
    })
    .join("\n");
}

function hasLeanSorry(text) {
  return /(?:^|[^A-Za-z0-9_'])sorry(?:[^A-Za-z0-9_']|$)/u.test(stripLineComments(text));
}

const campaign = {
  campaign_id: "CAM-0283",
  project_id: "P-GOAL3-TASK283",
  root_claim_id: "C-GOAL3-TASK283"
};

const obligation = {
  obligation_id: "PO-0001",
  statement_hash: sha256Text("theorem goal3_task283 : True <-> True")
};

const candidateDir = `.comath/campaign/${campaign.campaign_id}/ensembles/lemma_sprint/${obligation.obligation_id}/V1`;
const leanRel = `${candidateDir}/LeanCandidate.lean`;
const taskRel = `${candidateDir}/lean_candidate_repair_task.json`;
const hintExecutionRel = `.comath/campaign/${campaign.campaign_id}/lean_candidate_attempt_repair_hint_execution.json`;
const batchRel = `.comath/campaign/${campaign.campaign_id}/lean_candidate_attempt_repair_batch.json`;

try {
  writeRuntime(
    leanRel,
    [
      "-- rejected placeholder-free candidate; live theorem-search Iff.intro may guide a bounded repair.",
      "theorem goal3_task283 : True <-> True := by",
      "  exact True.intro",
      ""
    ].join("\n")
  );

  const liveIffResult = {
    adapter_result_id: "RHINTEXEC-0001",
    kind: "theorem_search",
    adapter_id: "leansearch.loogle",
    provider: "loogle",
    source_repair_hint: {
      hint_id: "RHINT-0001",
      query_hash: sha256Text("task283-query"),
      repair_hint_bundle_path: `.comath/campaign/${campaign.campaign_id}/lean_candidate_attempt_repair_hint_bundle.json`,
      repair_hint_bundle_sha256: sha256Text("task283-bundle")
    },
    request_sha256: sha256Text("task283-request"),
    result_payload_sha256: sha256Text("task283-result"),
    result_payload_summary: {
      result_kind: "theorem_search_results",
      result_count: 1,
      live_provider: {
        provider: "loogle",
        response_status: 200,
        network_execution_performed: true,
        live_provider_execution_performed: true,
        prompt_injection_scan: { status: "pass", findings: [] }
      },
      results: [
        {
          declaration_name: "Iff.intro",
          declaration_type: "(a -> b) -> (b -> a) -> (a <-> b)",
          module: "Init.Logic",
          proof_authority: "none",
          can_promote_claim: false,
          result_can_be_used_as_proof: false
        }
      ]
    },
    adapter_execution_state: "live_provider_result_recorded",
    capability_metadata: {
      adapter_id: "leansearch.loogle",
      kind: "theorem_search",
      capabilities: ["declaration_search"]
    },
    terms: {
      license: "fixture",
      attribution_required: false,
      redistribution: "metadata_only"
    },
    network_execution_performed: true,
    live_provider_execution_performed: true,
    proof_authority: "none",
    can_promote_claim: false,
    result_can_be_used_as_proof: false,
    promotion_vetoes: ["external_adapter_result_has_no_proof_authority"]
  };

  writeJson(hintExecutionRel, {
    schema_version: "comath.pi_goal_mode_lean_candidate_attempt_repair_hint_execution.v1",
    campaign_id: campaign.campaign_id,
    adapter_results: [liveIffResult],
    proof_authority: "none",
    can_promote_claim: false,
    result_can_be_used_as_proof: false
  });

  const task = {
    schema_version: "comath.pi_goal_mode_lean_candidate_attempt_repair_task.v1",
    campaign_id: campaign.campaign_id,
    project_id: campaign.project_id,
    claim_id: campaign.root_claim_id,
    obligation_id: obligation.obligation_id,
    candidate_id: "LC-0001",
    variant_id: "V1",
    repair_iteration: 2,
    source_check_report: {
      path: batchRel,
      sha256: sha256Text("unused-source-check"),
      proof_authority: "none",
      can_promote_claim: false
    },
    source_repair_hint_execution: {
      path: hintExecutionRel,
      sha256: sha256File(join(root, hintExecutionRel)),
      proof_authority: "none"
    },
    source_repair_hint_results: [liveIffResult],
    source_check: {
      result: "repair_required",
      has_sorry: false,
      has_repair_placeholder: false,
      has_lean_hole: false,
      has_lean_theorem_declaration: true,
      lean_file_path: leanRel,
      lean_file_sha256: sha256File(join(root, leanRel)),
      statement_boundary_hash_matches: true
    },
    required_actions: ["apply_service_owned_non_authoritative_repair_hint_results"],
    allowed_inputs: [leanRel, hintExecutionRel],
    forbidden_outputs: ["proof_claim", "LeanRunManifest", "FinalReplayManifest", "claim_promotion"],
    service_owned_execution_required: true,
    lean_runner_invocation_allowed: false,
    may_mutate_trusted_state: false,
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    result_can_be_used_as_proof: false
  };
  writeJson(taskRel, task);

  const batch = {
    schema_version: "comath.pi_goal_mode_lean_candidate_attempt_repair_batch.v1",
    campaign_id: campaign.campaign_id,
    project_id: campaign.project_id,
    claim_id: campaign.root_claim_id,
    obligation_id: obligation.obligation_id,
    locked_statement_hash: obligation.statement_hash,
    source_repair_hint_execution: {
      path: hintExecutionRel,
      sha256: sha256File(join(root, hintExecutionRel)),
      proof_authority: "none"
    },
    repair_iteration: 2,
    repair_required_candidate_count: 1,
    repair_task_count: 1,
    per_candidate_repairs: [
      {
        candidate_id: "LC-0001",
        variant_id: "V1",
        repair_task_path: taskRel,
        repair_task_sha256: sha256File(join(root, taskRel)),
        source_lean_file_path: leanRel,
        source_lean_file_sha256: sha256File(join(root, leanRel)),
        required_actions: ["apply_service_owned_non_authoritative_repair_hint_results"]
      }
    ],
    repair_task_paths: [taskRel],
    next_stage_after_repair: "candidate_verification",
    lean_runner_invocations: 0,
    lean_run_manifest_paths: [],
    repair_hint_execution_paths: [hintExecutionRel],
    proof_authority: "none",
    can_promote_claim: false,
    can_certify_ga: false,
    result_can_be_used_as_proof: false
  };
  writeJson(batchRel, batch);

  const result = executeLeanCandidateAttemptRepairBatch({
    projectRoot: root,
    campaign,
    obligation,
    batchPath: batchRel,
    batch
  });

  assert.equal(result.execution.repaired_placeholder_free_candidate_count, 1);
  assert.equal(
    result.execution.per_candidate_executions[0].placeholder_free_repair_strategy,
    "live_theorem_search_iff_intro_repair"
  );
  assert.equal(result.execution.per_candidate_executions[0].hint_execution_guided_revision_applied, true);
  assert.equal(result.execution.per_candidate_executions[0].proof_authority, "none");
  assert.equal(result.execution.per_candidate_executions[0].result_can_be_used_as_proof, false);
  const repairedText = readText(leanRel);
  assert.equal(hasLeanSorry(repairedText), false);
  assert.match(
    stripLineComments(repairedText),
    /theorem goal3_task283\s*:\s*True\s*<->\s*True\s*:=\s*by\s+exact Iff\.intro \(fun _ => trivial\) \(fun _ => trivial\)/u
  );

  const blockedCases = [
    {
      label: "prompt injection failure",
      statement: "True <-> True",
      resultPatch: {
        result_payload_summary: {
          ...liveIffResult.result_payload_summary,
          live_provider: {
            ...liveIffResult.result_payload_summary.live_provider,
            prompt_injection_scan: { status: "fail", findings: ["instruction_override"] }
          }
        }
      }
    },
    {
      label: "top-level authority escalation",
      statement: "True <-> True",
      resultPatch: { proof_authority: "lean_kernel" }
    },
    {
      label: "nested theorem result authority escalation",
      statement: "True <-> True",
      resultPatch: {
        result_payload_summary: {
          ...liveIffResult.result_payload_summary,
          results: [
            {
              ...liveIffResult.result_payload_summary.results[0],
              result_can_be_used_as_proof: true
            }
          ]
        }
      }
    },
    {
      label: "wrong theorem search declaration",
      statement: "True <-> True",
      resultPatch: {
        result_payload_summary: {
          ...liveIffResult.result_payload_summary,
          results: [
            {
              ...liveIffResult.result_payload_summary.results[0],
              declaration_name: "And.intro"
            }
          ]
        }
      }
    },
    {
      label: "stubbed provider result",
      statement: "True <-> True",
      resultPatch: {
        adapter_execution_state: "stubbed_provider_result_recorded",
        network_execution_performed: false,
        live_provider_execution_performed: false
      }
    },
    {
      label: "wrong statement",
      statement: "True <-> False",
      resultPatch: {}
    },
    {
      label: "statement boundary mismatch",
      statement: "True <-> True",
      sourceCheckPatch: { statement_boundary_hash_matches: false },
      resultPatch: {}
    }
  ];

  for (const [index, blockedCase] of blockedCases.entries()) {
    const caseCampaign = {
      campaign_id: `CAM-0283-BLOCK-${index}`,
      project_id: campaign.project_id,
      root_claim_id: campaign.root_claim_id
    };
    const caseDir = `.comath/campaign/${caseCampaign.campaign_id}/ensembles/lemma_sprint/${obligation.obligation_id}/V1`;
    const caseLeanRel = `${caseDir}/LeanCandidate.lean`;
    const caseTaskRel = `${caseDir}/lean_candidate_repair_task.json`;
    const caseHintExecutionRel = `.comath/campaign/${caseCampaign.campaign_id}/lean_candidate_attempt_repair_hint_execution.json`;
    const caseBatchRel = `.comath/campaign/${caseCampaign.campaign_id}/lean_candidate_attempt_repair_batch.json`;
    writeRuntime(
      caseLeanRel,
      [`theorem goal3_task283_blocked_${index} : ${blockedCase.statement} := by`, "  exact True.intro", ""].join("\n")
    );
    const caseResult = {
      ...liveIffResult,
      ...blockedCase.resultPatch
    };
    writeJson(caseHintExecutionRel, {
      schema_version: "comath.pi_goal_mode_lean_candidate_attempt_repair_hint_execution.v1",
      campaign_id: caseCampaign.campaign_id,
      adapter_results: [caseResult],
      proof_authority: "none",
      can_promote_claim: false,
      result_can_be_used_as_proof: false
    });
    const caseTask = {
      ...task,
      campaign_id: caseCampaign.campaign_id,
      candidate_id: `LC-BLOCK-${index}`,
      source_repair_hint_execution: {
        path: caseHintExecutionRel,
        sha256: sha256File(join(root, caseHintExecutionRel)),
        proof_authority: "none"
      },
      source_repair_hint_results: [caseResult],
      source_check: {
        ...task.source_check,
        ...blockedCase.sourceCheckPatch,
        lean_file_path: caseLeanRel,
        lean_file_sha256: sha256File(join(root, caseLeanRel))
      },
      allowed_inputs: [caseLeanRel, caseHintExecutionRel]
    };
    writeJson(caseTaskRel, caseTask);
    const caseBatch = {
      ...batch,
      campaign_id: caseCampaign.campaign_id,
      source_repair_hint_execution: {
        path: caseHintExecutionRel,
        sha256: sha256File(join(root, caseHintExecutionRel)),
        proof_authority: "none"
      },
      per_candidate_repairs: [
        {
          candidate_id: caseTask.candidate_id,
          variant_id: "V1",
          repair_task_path: caseTaskRel,
          repair_task_sha256: sha256File(join(root, caseTaskRel)),
          source_lean_file_path: caseLeanRel,
          source_lean_file_sha256: sha256File(join(root, caseLeanRel)),
          required_actions: ["apply_service_owned_non_authoritative_repair_hint_results"]
        }
      ],
      repair_task_paths: [caseTaskRel],
      repair_hint_execution_paths: [caseHintExecutionRel]
    };
    writeJson(caseBatchRel, caseBatch);

    let blockedResult;
    try {
      blockedResult = executeLeanCandidateAttemptRepairBatch({
        projectRoot: root,
        campaign: caseCampaign,
        obligation,
        batchPath: caseBatchRel,
        batch: caseBatch
      });
    } catch (error) {
      assert.match(
        String(error?.message ?? error),
        /authority_flags_invalid|statement_boundary|locked_statement|repair/i,
        `${blockedCase.label} should fail closed with a repair-boundary error`
      );
      continue;
    }
    assert.equal(
      blockedResult.execution.repaired_placeholder_free_candidate_count,
      0,
      `${blockedCase.label} must not materialize a placeholder-free Iff.intro repair`
    );
    assert.notEqual(
      blockedResult.execution.per_candidate_executions[0].placeholder_free_repair_strategy,
      "live_theorem_search_iff_intro_repair",
      `${blockedCase.label} must not select the Task283 repair strategy`
    );
  }
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log("Goal 3 Task 283 Pi goal-mode live theorem-search iff repair test passed.");
